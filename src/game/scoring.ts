import { evaluateHand, handValues, type HandResult } from './hands';
import { chance, itemHooks, type Effect, type ScoreCtx } from './items';
import { viewCard, type CardView } from './pips';
import { T } from '@/content';
import { Rng } from './rng';
import { matchup, type Matchup } from './typechart';
import type { BattleState, HandType, PType, RunState } from './types';

export type ScoreSource = { kind: 'hand' } | { kind: 'card'; uid: string } | { kind: 'held'; uid: string } | { kind: 'item'; uid: string } | { kind: 'evo'; family: string } | { kind: 'boss' } | { kind: 'deck' };

export interface ScoreEvent {
  source: ScoreSource;
  power?: number; // delta
  mult?: number; // delta
  xmult?: number;
  money?: number;
  msg?: string;
  matchup?: Matchup;
  retrigger?: boolean;
  debuffed?: boolean;
  total: { power: number; mult: number };
}

export interface ScoreResult {
  hand: HandResult;
  level: number;
  events: ScoreEvent[];
  power: number;
  mult: number;
  damage: number;
  rawDamage: number;
  capped?: string;
  destroyed: string[]; // card uids (self-destruct)
  superEffective: string[];
}

export function bossActive(run: RunState, b: BattleState, id: string): boolean {
  return !b.bossDisabled && b.opponent.ruleId === id;
}

export function handOptions(run: RunState) {
  const ids = new Set(itemHooks(run).map((h) => h.def.id));
  return { fourFingers: ids.has('diviningrod'), shortcut: ids.has('shortcut'), splash: ids.has('participation') };
}

export function previewHand(run: RunState, uids: string[]): HandResult | null {
  if (uids.length === 0) return null;
  const views = uids.map((u) => viewCard(run.deck.find((c) => c.uid === u)!));
  return evaluateHand(views, handOptions(run));
}

export function cardMatchup(run: RunState, b: BattleState, c: CardView): Matchup {
  const m = matchup(c.types, b.opponent.types);
  const boss = b.opponent.kind !== 'wild' && b.opponent.kind !== 'trainer';
  if (!boss && (m === 'resisted' || m === 'immune')) return 'neutral';
  return m;
}

function isDebuffed(run: RunState, b: BattleState, c: CardView, mu: Matchup, highestUid: string | null): string | null {
  if (c.card.tired) return 'Tired';
  if (c.card.frozen) return 'Frozen';
  const rule = () => T.leader(b.opponent.ruleFrom ?? b.opponent.id).ruleName;
  if (bossActive(run, b, 'backdraft') && mu === 'super') return rule();
  if (bossActive(run, b, 'charmfinals') && c.isFinal && c.family != null) return rule();
  if (bossActive(run, b, 'swipe') && highestUid === c.card.uid) return rule();
  return null;
}

export function scoreHand(run: RunState, b: BattleState, played: CardView[], heldUids: string[]): ScoreResult {
  const rng = new Rng(run.rng);
  const hand = evaluateHand(played, handOptions(run));
  const level = run.handLevels[hand.type] ?? 1;
  let { power, mult } = handValues(hand.type, level);
  if (bossActive(run, b, 'halfbase')) { power = Math.floor(power / 2); mult = Math.max(1, Math.floor(mult / 2)); }
  const events: ScoreEvent[] = [];
  const destroyed: string[] = [];
  const scoringViews = played.filter((c) => hand.scoring.includes(c.card.uid));
  const held = heldUids.map((u) => viewCard(run.deck.find((c) => c.uid === u)!));
  const superEffective = new Set<string>();
  const typeCount = new Map<PType, number>();
  for (const c of scoringViews) for (const t of c.types) typeCount.set(t, (typeCount.get(t) ?? 0) + 1);

  const ctx: ScoreCtx = {
    run, battle: b, hand, played, scoring: scoringViews, held, rng, power, mult,
    isFinalAttack: b.handsLeft === 1, isFirstAttack: b.attacksPlayed === 0, superEffective, typeCount,
  };
  const push = (source: ScoreSource, e: Effect, extra: Partial<ScoreEvent> = {}) => {
    if (e.power) ctx.power += e.power;
    if (e.mult) ctx.mult += e.mult;
    if (e.xmult && e.xmult !== 1) ctx.mult *= e.xmult;
    if (e.money) run.money += e.money;
    ctx.power = Math.max(0, ctx.power);
    events.push({ source, power: e.power, mult: e.mult, xmult: e.xmult, money: e.money, msg: e.msg, ...extra, total: { power: ctx.power, mult: ctx.mult } });
  };
  events.push({ source: { kind: 'hand' }, total: { power: ctx.power, mult: ctx.mult } });

  const hooks = itemHooks(run);
  for (const h of hooks) { const e = h.def.onHandStart?.(ctx, h.inst); if (e) push({ kind: 'item', uid: h.owner.uid }, e); }

  const highest = scoringViews.length ? [...scoringViews].sort((a, b2) => b2.basePower - a.basePower)[0].card.uid : null;
  const bossRound = b.opponent.kind !== 'wild' && b.opponent.kind !== 'trainer';

  scoringViews.forEach((c, idx) => {
    const mu = cardMatchup(run, b, c);
    const debuff = isDebuffed(run, b, c, mu, highest);
    if (debuff) { events.push({ source: { kind: 'card', uid: c.card.uid }, debuffed: true, msg: debuff, total: { power: ctx.power, mult: ctx.mult } }); return; }
    if (mu === 'super') superEffective.add(c.card.uid);
    let triggers = 1 + (c.card.ribbon === 'ruby' ? 1 : 0);
    for (const h of hooks) triggers += h.def.retrigger?.(ctx, h.inst, c, idx) ?? 0;
    for (let t = 0; t < triggers; t++) {
      const retrigger = t > 0;
      let pw = c.basePower;
      let msg: string | undefined;
      if (mu === 'super') { pw *= 2; msg = 'Advantage!'; }
      else if (mu === 'resisted' && bossRound) { pw = Math.floor(pw / 2); msg = 'Resisted'; }
      else if (mu === 'immune' && bossRound) { pw = 0; msg = 'Immune'; }
      push({ kind: 'card', uid: c.card.uid }, { power: pw, msg }, { matchup: mu, retrigger });
      switch (c.card.ability) {
        case 'padded': push({ kind: 'card', uid: c.card.uid }, { power: 30, msg: T.ability('padded') }); break;
        case 'mighty': push({ kind: 'card', uid: c.card.uid }, { mult: 4, msg: T.ability('mighty') }); break;
        case 'volatile': push({ kind: 'card', uid: c.card.uid }, { xmult: 2, msg: T.ability('volatile') }); break;
        case 'lucky':
          if (chance(run, rng, 5)) push({ kind: 'card', uid: c.card.uid }, { mult: 20, msg: `${T.ability('lucky')}!` });
          if (chance(run, rng, 15)) push({ kind: 'card', uid: c.card.uid }, { money: 20, msg: `Lucky ${T.money(20)}!` });
          break;
      }
      if (c.card.edition === 'foil') push({ kind: 'card', uid: c.card.uid }, { power: 50, msg: 'Foil' });
      if (c.card.edition === 'holo') push({ kind: 'card', uid: c.card.uid }, { mult: 10, msg: 'Holo' });
      if (c.card.edition === 'shiny') push({ kind: 'card', uid: c.card.uid }, { xmult: 1.5, msg: 'Shiny' });
      if (c.card.ribbon === 'gold') push({ kind: 'card', uid: c.card.uid }, { money: 3, msg: 'Gold Ribbon' });
      for (const h of hooks) { const e = h.def.onCard?.(ctx, h.inst, c); if (e) push({ kind: 'item', uid: h.owner.uid }, e); }
    }
    if (c.card.ability === 'volatile' && chance(run, rng, 4)) destroyed.push(c.card.uid);
  });

  for (const c of held) {
    if (c.card.frozen || c.card.faceDown) continue;
    const triggers = 1 + (c.card.ribbon === 'ruby' ? 1 : 0);
    for (let t = 0; t < triggers; t++) {
      if (c.card.ability === 'steadfast') push({ kind: 'held', uid: c.card.uid }, { xmult: 1.5, msg: T.ability('steadfast') });
      for (const h of hooks) { const e = h.def.onHeld?.(ctx, h.inst, c); if (e) push({ kind: 'item', uid: h.owner.uid }, { ...e, msg: e.msg ?? c.name }); }
    }
  }

  const link = hooks.some((h) => h.def.id === 'familytree');
  for (const s of hand.sets) {
    if (s.stages > 1) push({ kind: 'evo', family: s.family }, { mult: 4 * (s.stages - 1) * (link ? 2 : 1), msg: s.stages >= 3 ? 'Full evolution line!' : 'Evolved!' });
  }

  run.items.forEach((owner, idx) => {
    if (owner.disabled) return;
    const h = hooks.find((x) => x.owner.uid === owner.uid);
    if (h) { const e = h.def.onEnd?.(ctx, h.inst); if (e) push({ kind: 'item', uid: owner.uid }, e); }
    if (owner.edition === 'foil') push({ kind: 'item', uid: owner.uid }, { power: 50, msg: 'Foil' });
    if (owner.edition === 'holo') push({ kind: 'item', uid: owner.uid }, { mult: 10, msg: 'Holo' });
    if (owner.edition === 'shiny') push({ kind: 'item', uid: owner.uid }, { xmult: 1.5, msg: 'Shiny' });
    void idx;
  });

  const gear = run.keyItems.includes('smartwatch') ? 2 : run.keyItems.includes('pager') ? 1.5 : 0;
  if (gear && run.bag.some((bc) => bc.defId === `book_${hand.type}`)) push({ kind: 'deck' }, { xmult: gear, msg: T.keyItem(run.keyItems.includes('smartwatch') ? 'smartwatch' : 'pager') });

  if (run.starter === 'apex') {
    const avg = (ctx.power + ctx.mult) / 2;
    ctx.power = avg; ctx.mult = avg;
    events.push({ source: { kind: 'deck' }, msg: 'Equilibrium: balanced', total: { power: avg, mult: avg } });
  }

  const rawDamage = Math.round(ctx.power * ctx.mult);
  let damage = rawDamage;
  let capped: string | undefined;
  const attackNo = b.attacksPlayed + 1;
  const ruleName = T.leader(b.opponent.ruleFrom ?? b.opponent.id).ruleName;
  if (bossActive(run, b, 'firstguard') && attackNo === 1) { damage = Math.floor(damage / 2); capped = `${ruleName}: halved`; }
  if (bossActive(run, b, 'loafing') && attackNo % 2 === 0) { damage = Math.floor(damage / 2); capped = `${ruleName}: halved`; }
  if (bossActive(run, b, 'pride')) {
    const most = (Object.entries(run.handPlays) as [HandType, number][]).sort((a, b2) => b2[1] - a[1])[0];
    if (most && most[0] === hand.type && most[1] > 0) { damage = Math.floor(damage / 2); capped = `${ruleName}: halved`; }
  }
  const capPct = bossActive(run, b, 'cap50') ? 0.5 : bossActive(run, b, 'cap40') ? 0.4 : bossActive(run, b, 'spectacle') ? 0.35 : 0;
  if (capPct) { const cap = Math.floor(b.hp * capPct); if (damage > cap) { damage = cap; capped = `Capped at ${Math.round(capPct * 100)}%`; } }

  run.rng = rng.state;
  return { hand, level, events, power: ctx.power, mult: ctx.mult, damage, rawDamage, capped, destroyed, superEffective: [...superEffective] };
}

