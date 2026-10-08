import type { CardView } from './pips';
import { T } from '@/content';
import { typeName } from './typechart';
import { handContains, HAND_NAMES } from './hands';
import type { HandResult } from './hands';
import type { BattleState, ItemInstance, PType, Rarity, RunState } from './types';
import type { Rng } from './rng';

export interface Effect {
  power?: number;
  mult?: number;
  xmult?: number;
  money?: number;
  msg?: string;
  retrigger?: boolean;
}

export interface ScoreCtx {
  run: RunState;
  battle: BattleState;
  hand: HandResult;
  played: CardView[];
  scoring: CardView[];
  held: CardView[];
  rng: Rng;
  power: number;
  mult: number;
  isFinalAttack: boolean;
  isFirstAttack: boolean;
  superEffective: Set<string>;
  typeCount: Map<PType, number>;
}

export interface ItemDef {
  id: string;
  /** Display name from the active ContentPack. */
  readonly name: string;
  rarity: Rarity;
  cost: number;
  typed?: 'booster' | 'sigil';
  desc: (inst: ItemInstance, run?: RunState) => string;
  onHandStart?: (ctx: ScoreCtx, inst: ItemInstance) => Effect | void;
  onCard?: (ctx: ScoreCtx, inst: ItemInstance, card: CardView) => Effect | void;
  onHeld?: (ctx: ScoreCtx, inst: ItemInstance, card: CardView) => Effect | void;
  onEnd?: (ctx: ScoreCtx, inst: ItemInstance) => Effect | void;
  retrigger?: (ctx: ScoreCtx, inst: ItemInstance, card: CardView, index: number) => number;
  onBattleStart?: (run: RunState, inst: ItemInstance, rng: Rng) => string | void;
  onBattleEnd?: (run: RunState, inst: ItemInstance, rng: Rng) => { money?: number; msg?: string; destroy?: boolean } | void;
  onDiscard?: (run: RunState, inst: ItemInstance, cards: CardView[], rng: Rng) => string | void;
  onAttackEnd?: (run: RunState, inst: ItemInstance, ctx: ScoreCtx) => void;
  onCardAdded?: (run: RunState, inst: ItemInstance) => void;
  handSizeMod?: number;
  handsMod?: number;
  discardsMod?: number;
  itemSlotsMod?: number;
  canPlay?: (run: RunState, battle: BattleState, hand: HandResult) => string | null;
  noInterest?: boolean;
}


const has = (c: CardView, t?: PType) => !!t && c.types.includes(t);

/** 1 in n chance, doubled by Loaded Dice. */
export function chance(run: RunState, rng: Rng, n: number): boolean {
  const lucky = run.items.some((i) => i.defId === 'loadeddice' && !i.disabled);
  return rng.chance(Math.min(1, (lucky ? 2 : 1) / n));
}

type ItemSpec = Omit<ItemDef, 'name'>;

const handItem = (id: string, part: string, eff: Effect, cost = 4): ItemSpec => ({
  id, rarity: 'common', cost,
  desc: () => `${eff.mult ? `+${eff.mult} Mult` : `+${eff.power} Power`} if the hand contains ${HAND_NAMES[part as keyof typeof HAND_NAMES]}`,
  onEnd: (ctx) => (handContains(ctx.hand.type, part as never) ? eff : undefined),
});

const dollItem = (id: string, part: string, x: number): ItemSpec => ({
  id, rarity: 'rare', cost: 8,
  desc: () => `x${x} Mult if the hand contains ${HAND_NAMES[part as keyof typeof HAND_NAMES]}`,
  onEnd: (ctx) => (handContains(ctx.hand.type, part as never) ? { xmult: x } : undefined),
});

const ITEM_SPECS: ItemSpec[] = [
  { id: 'goldenegg', rarity: 'common', cost: 4, desc: () => '+4 Mult', onEnd: () => ({ mult: 4 }) },
  {
    id: 'booster', rarity: 'common', cost: 5, typed: 'booster',
    desc: (i) => `+3 Mult for each scored ${typeName(i.variant ?? 'normal')} card`,
    onCard: (ctx, i, c) => (has(c, i.variant) ? { mult: 3 } : undefined),
  },
  {
    id: 'sigil', rarity: 'uncommon', cost: 6, typed: 'sigil',
    desc: (i) => `x1.5 Mult if 3 or more scored cards are ${typeName(i.variant ?? 'normal')}`,
    onEnd: (ctx, i) => (ctx.scoring.filter((c) => has(c, i.variant)).length >= 3 ? { xmult: 1.5 } : undefined),
  },
  handItem('pairdice', 'pair', { mult: 8 }),
  handItem('matchingsocks', 'pair', { power: 50 }),
  handItem('triplescoop', 'three', { mult: 12 }),
  handItem('doubledate', 'twopair', { mult: 10 }),
  handItem('straightedge', 'straight', { mult: 12 }),
  handItem('paintbucket', 'flush', { mult: 10 }),
  handItem('tripod', 'three', { power: 100 }),
  handItem('colorwheel', 'flush', { power: 80 }),
  {
    id: 'babyrattle', rarity: 'common', cost: 5, desc: () => 'Basic (unevolved) cards give +25 Power when scored',
    onCard: (ctx, i, c) => (c.isBasic && c.family != null ? { power: 25 } : undefined),
  },
  {
    id: 'diploma', rarity: 'common', cost: 5, desc: () => 'Fully evolved cards give +4 Mult when scored',
    onCard: (ctx, i, c) => (c.isFinal && c.family != null ? { mult: 4 } : undefined),
  },
  {
    id: 'shortstack', rarity: 'common', cost: 5, desc: () => '+20 Mult if the played hand has 3 or fewer cards',
    onEnd: (ctx) => (ctx.played.length <= 3 ? { mult: 20 } : undefined),
  },
  {
    id: 'muckpile', rarity: 'common', cost: 4, desc: () => '+30 Power for each remaining discard',
    onEnd: (ctx) => (ctx.battle.discardsLeft > 0 ? { power: 30 * ctx.battle.discardsLeft } : undefined),
  },
  {
    id: 'allinchip', rarity: 'common', cost: 5, desc: () => '+15 Mult if you have 0 discards remaining',
    onEnd: (ctx) => (ctx.battle.discardsLeft === 0 ? { mult: 15 } : undefined),
  },
  {
    id: 'luckyreel', rarity: 'common', cost: 4, desc: () => '+0 to +23 Mult, random each attack',
    onEnd: (ctx) => ({ mult: ctx.rng.int(24) }),
  },
  { id: 'readingglasses', rarity: 'common', cost: 4, desc: () => '+1 hand size', handSizeMod: 1 },
  { id: 'eraser', rarity: 'common', cost: 4, desc: () => '+1 discard each battle', discardsMod: 1 },
  {
    id: 'piggybank', rarity: 'common', cost: 6, desc: () => `Earn ${T.money(4)} at the end of each battle`,
    onBattleEnd: () => ({ money: 4 }),
  },
  {
    id: 'goldtooth', rarity: 'common', cost: 4, desc: (i) => `Gains ${T.money(3)} of sell value each battle (now ${T.money(i.sellValue)})`,
    onBattleEnd: (run, i) => { i.sellValue += 3; },
  },
  {
    id: 'moneyclip', rarity: 'common', cost: 5, desc: (i, run) => `+2 Power for every ${T.terms.currency} you have${run ? ` (+${Math.max(0, run.money) * 2})` : ''}`,
    onEnd: (ctx) => ({ power: Math.max(0, ctx.run.money) * 2 }),
  },
  {
    id: 'deeppockets', rarity: 'common', cost: 5, desc: (i, run) => `+2 Power for every card left in your draw pile${run?.battle ? ` (+${run.battle.drawPile.length * 2})` : ''}`,
    onEnd: (ctx) => ({ power: ctx.battle.drawPile.length * 2 }),
  },
  {
    id: 'icepop', rarity: 'common', cost: 5, desc: (i) => `+${i.state.power ?? 100} Power, loses 5 Power each attack`,
    onEnd: (ctx, i) => ({ power: i.state.power ?? 100 }),
    onAttackEnd: (run, i) => { i.state.power = (i.state.power ?? 100) - 5; },
  },
  {
    id: 'lemonstand', rarity: 'common', cost: 5, desc: (i) => `+${i.state.mult ?? 20} Mult, loses 4 Mult each battle`,
    onEnd: (ctx, i) => ({ mult: i.state.mult ?? 20 }),
    onBattleEnd: (run, i) => { i.state.mult = (i.state.mult ?? 20) - 4; return i.state.mult <= 0 ? { destroy: true, msg: `${T.item('lemonstand')} ran dry` } : undefined; },
  },
  {
    id: 'tarpit', rarity: 'common', cost: 6, desc: () => 'Adds a Fossil card (50 Power, no family or type) to your deck at the start of each battle',
  },
  {
    id: 'tacklebox', rarity: 'uncommon', cost: 6, desc: (i, run) => `+3 Mult for each Item you own${run ? ` (+${run.items.length * 3})` : ''}`,
    onEnd: (ctx) => ({ mult: ctx.run.items.length * 3 }),
  },
  {
    id: 'ankleweights', rarity: 'uncommon', cost: 7, desc: () => 'Every played card permanently gains +4 Power',
    onAttackEnd: (run, i, ctx) => { for (const c of ctx.played) c.card.bonusPower = (c.card.bonusPower || 0) + 4; },
  },
  {
    id: 'hotstreak', rarity: 'uncommon', cost: 6, desc: (i) => `+2 Mult per consecutive attack of the same hand type (now +${i.state.mult ?? 0})`,
    onHandStart: (ctx, i) => {
      if (ctx.battle.lastHandType === ctx.hand.type) i.state.mult = (i.state.mult ?? 0) + 2; else i.state.mult = 0;
    },
    onEnd: (ctx, i) => ((i.state.mult ?? 0) > 0 ? { mult: i.state.mult } : undefined),
  },
  {
    id: 'tallycounter', rarity: 'uncommon', cost: 6, desc: () => '+Mult equal to the number of times the played hand type has been played this run',
    onEnd: (ctx) => ({ mult: ctx.run.handPlays[ctx.hand.type] ?? 0 }),
  },
  {
    id: 'cheatsheet', rarity: 'uncommon', cost: 6, desc: () => 'Cards with type advantage also give +4 Mult',
    onCard: (ctx, i, c) => (ctx.superEffective.has(c.card.uid) ? { mult: 4 } : undefined),
  },
  {
    id: 'weathervane', rarity: 'uncommon', cost: 7,
    desc: (i, run) => `x1.5 Mult for each scored card of the weather type; weather changes each battle${run?.battle?.weather ? ` (now ${typeName(run.battle.weather)})` : ''}`,
    onCard: (ctx, i, c) => (ctx.battle.weather && c.types.includes(ctx.battle.weather) ? { xmult: 1.5 } : undefined),
  },
  {
    id: 'mosaic', rarity: 'uncommon', cost: 7, desc: () => 'x3 Mult if the scored cards cover 4 or more different types',
    onEnd: (ctx) => {
      const ts = new Set<PType>();
      for (const c of ctx.scoring) for (const t of c.types) ts.add(t);
      return ts.size >= 4 ? { xmult: 3 } : undefined;
    },
  },
  { id: 'nursery', rarity: 'uncommon', cost: 7, desc: () => 'At the end of each battle, a random basic card in your deck evolves' },
  { id: 'familytree', rarity: 'uncommon', cost: 7, desc: () => 'Evolution bonus is doubled (+8 Mult per extra stage in a set)' },
  {
    id: 'travellight', rarity: 'uncommon', cost: 6, desc: (i, run) => `+4 Mult for each card fewer than 52 in your deck${run ? ` (+${Math.max(0, 52 - run.deck.length) * 4})` : ''}`,
    onEnd: (ctx) => { const n = Math.max(0, 52 - ctx.run.deck.length); return n ? { mult: n * 4 } : undefined; },
  },
  { id: 'shortcut', rarity: 'uncommon', cost: 6, desc: () => 'Straights may skip one tier (e.g. 5-7-8-9-J)' },
  { id: 'diviningrod', rarity: 'uncommon', cost: 7, desc: () => 'Flushes and Straights can be made with 4 cards' },
  {
    id: 'spotlight', rarity: 'uncommon', cost: 6, desc: () => 'The first scored fully evolved card gives x2 Mult',
    onCard: (ctx, i, c) => {
      const first = ctx.scoring.find((x) => x.isFinal && x.family != null);
      return first && first.card.uid === c.card.uid ? { xmult: 2 } : undefined;
    },
  },
  {
    id: 'loupe', rarity: 'uncommon', cost: 6, desc: () => 'Each scored card has a 1 in 5 chance to crit for x1.25 Mult',
    onCard: (ctx) => (chance(ctx.run, ctx.rng, 5) ? { xmult: 1.25, msg: 'Crit!' } : undefined),
  },
  {
    id: 'openingbell', rarity: 'uncommon', cost: 6, desc: () => 'x1.5 Mult on the first attack of each battle',
    onEnd: (ctx) => (ctx.isFirstAttack ? { xmult: 1.5 } : undefined),
  },
  { id: 'safetynet', rarity: 'uncommon', cost: 6, desc: () => 'Prevents defeat once if you dealt at least 25% of the HP, then breaks' },
  { id: 'stopwatch', rarity: 'uncommon', cost: 7, desc: () => '+1 attack per battle, −1 hand size', handsMod: 1, handSizeMod: -1 },
  { id: 'binoculars', rarity: 'uncommon', cost: 7, desc: () => '+2 hand size, −1 attack per battle', handSizeMod: 2, handsMod: -1 },
  { id: 'warpaint', rarity: 'uncommon', cost: 7, desc: () => '+3 attacks per battle, but 0 discards', handsMod: 3, discardsMod: -99 },
  { id: 'heavyarmor', rarity: 'uncommon', cost: 7, desc: () => '+250 Power, −2 hand size', handSizeMod: -2, onEnd: () => ({ power: 250 }) },
  {
    id: 'fizzysoda', rarity: 'uncommon', cost: 6, desc: (i) => `Retrigger all scored cards for the next ${i.state.left ?? 10} attacks`,
    retrigger: () => 1,
    onAttackEnd: (run, i) => { i.state.left = (i.state.left ?? 10) - 1; if (i.state.left <= 0) i.state.destroy = 1; },
  },
  {
    id: 'jawbreaker', rarity: 'uncommon', cost: 7, desc: (i) => `x${((i.state.x ?? 200) / 100).toFixed(2)} Mult, loses x0.01 per card discarded`,
    onEnd: (ctx, i) => ({ xmult: (i.state.x ?? 200) / 100 }),
    onDiscard: (run, i, cards) => { i.state.x = (i.state.x ?? 200) - cards.length; if (i.state.x <= 100) i.state.destroy = 1; },
  },
  {
    id: 'firecracker', rarity: 'uncommon', cost: 5, desc: () => '+15 Mult, 1 in 6 chance to explode at the end of each battle',
    onEnd: () => ({ mult: 15 }),
    onBattleEnd: (run, i, rng) => (chance(run, rng, 6) ? { destroy: true, msg: `${T.item('firecracker')} went off!` } : undefined),
  },
  { id: 'studynotes', rarity: 'uncommon', cost: 7, desc: () => '1 in 4 chance to level up the played hand type' },
  { id: 'loadeddice', rarity: 'uncommon', cost: 6, desc: () => 'Doubles all listed chances' },
  {
    id: 'hairtrigger', rarity: 'uncommon', cost: 7, desc: () => 'Retrigger the first scored card 2 extra times',
    retrigger: (ctx, i, c, idx) => (idx === 0 ? 2 : 0),
  },
  { id: 'pacifier', rarity: 'uncommon', cost: 7, desc: () => 'Retrigger all scored basic cards', retrigger: (ctx, i, c) => (c.isBasic && c.family != null ? 1 : 0) },
  { id: 'ovation', rarity: 'uncommon', cost: 7, desc: () => 'Retrigger all scored fully evolved cards', retrigger: (ctx, i, c) => (c.isFinal && c.family != null ? 1 : 0) },
  { id: 'photocopier', rarity: 'uncommon', cost: 7, desc: () => 'If your first attack of a battle is a single card, add a copy of it to your deck' },
  { id: 'participation', rarity: 'uncommon', cost: 5, desc: () => 'Every played card counts in scoring' },
  { id: 'lastcall', rarity: 'rare', cost: 8, desc: () => 'Retrigger all scored cards on your final attack of a battle', retrigger: (ctx) => (ctx.isFinalAttack ? 1 : 0) },
  { id: 'hailmary', rarity: 'rare', cost: 8, desc: () => 'x3 Mult on your final attack of a battle', onEnd: (ctx) => (ctx.isFinalAttack ? { xmult: 3 } : undefined) },
  {
    id: 'onetrick', rarity: 'rare', cost: 9, desc: () => 'x2 Mult, but every attack in a battle must be the same hand type as your first',
    onEnd: () => ({ xmult: 2 }),
    canPlay: (run, b, hand) => (b.firstHandType && b.firstHandType !== hand.type ? `${T.item('onetrick')}: must play ${HAND_NAMES[b.firstHandType]}` : null),
  },
  { id: 'cursedidol', rarity: 'rare', cost: 8, desc: () => `x1.5 Mult, lose ${T.money(3)} after every attack`, onEnd: () => ({ xmult: 1.5 }), onAttackEnd: (run) => { run.money -= 3; } },
  { id: 'papercrown', rarity: 'rare', cost: 9, desc: () => 'x1.5 Mult', onEnd: () => ({ xmult: 1.5 }) },
  { id: 'firststrike', rarity: 'rare', cost: 9, desc: () => 'Your first attack each battle gets x3 Mult; −1 attack per battle', handsMod: -1, onEnd: (ctx) => (ctx.isFirstAttack ? { xmult: 3 } : undefined) },
  { id: 'highfive', rarity: 'rare', cost: 8, desc: () => 'x2 Mult if 5 cards are played', onEnd: (ctx) => (ctx.played.length === 5 ? { xmult: 2 } : undefined) },
  dollItem('twinplush', 'pair', 2),
  dollItem('trioplush', 'three', 3),
  dollItem('longplush', 'straight', 3),
  dollItem('patchplush', 'flush', 2),
  dollItem('quadplush', 'four', 4),
  {
    id: 'acesleeve', rarity: 'rare', cost: 9, desc: () => 'Each tier A card held in hand gives x1.5 Mult',
    onHeld: (ctx, i, c) => (c.tier === 14 ? { xmult: 1.5 } : undefined),
  },
  {
    id: 'stampbook', rarity: 'rare', cost: 8, desc: (i) => `Gains x0.25 Mult for every ${T.terms.pip} added to your party (now x${(1 + (i.state.n ?? 0) * 0.25).toFixed(2)})`,
    onEnd: (ctx, i) => ((i.state.n ?? 0) > 0 ? { xmult: 1 + (i.state.n ?? 0) * 0.25 } : undefined),
    onCardAdded: (run, i) => { i.state.n = (i.state.n ?? 0) + 1; },
  },
  { id: 'handmirror', rarity: 'rare', cost: 9, desc: () => 'Copies the ability of the Item to its right' },
  { id: 'musicbox', rarity: 'legendary', cost: 20, desc: () => `Disables the ${T.terms.boss}'s rule` },
  { id: 'goldenace', rarity: 'legendary', cost: 20, desc: () => 'Tier A cards give x2 Mult when scored', onCard: (ctx, i, c) => (c.tier === 14 ? { xmult: 2 } : undefined) },
  { id: 'replicator', rarity: 'legendary', cost: 20, desc: () => 'Creates a copy of the first consumable in your Bag at the start of each battle (if there is room)' },
  {
    id: 'crestsash', rarity: 'legendary', cost: 20, desc: (i, run) => `x${(1 + 0.25 * (run?.badges.length ?? 0)).toFixed(2)} Mult (+0.25 per ${T.terms.crest} earned)`,
    onEnd: (ctx) => (ctx.run.badges.length ? { xmult: 1 + 0.25 * ctx.run.badges.length } : undefined),
  },
];

export const ITEMS: ItemDef[] = ITEM_SPECS.map((d) => Object.defineProperty(d, 'name', { get: () => T.item(d.id), enumerable: false }) as ItemDef);

const byId = new Map(ITEMS.map((i) => [i.id, i]));
export function itemDef(id: string): ItemDef {
  const d = byId.get(id);
  if (!d) throw new Error('unknown item ' + id);
  return d;
}

export function itemName(inst: ItemInstance): string {
  const d = itemDef(inst.defId);
  if (d.typed && inst.variant) return T.typedItem(d.typed, inst.variant);
  return d.name;
}

/** Resolve Hand Mirror chains: the def whose hooks should run for the item at index `idx`. */
export function effectiveDef(run: RunState, idx: number): { def: ItemDef; inst: ItemInstance } | null {
  let i = idx;
  for (let hops = 0; hops < 6; hops++) {
    const inst = run.items[i];
    if (!inst) return null;
    if (inst.defId !== 'handmirror') return { def: itemDef(inst.defId), inst };
    i += 1;
  }
  return null;
}

export function itemHooks(run: RunState): { def: ItemDef; inst: ItemInstance; owner: ItemInstance }[] {
  const out: { def: ItemDef; inst: ItemInstance; owner: ItemInstance }[] = [];
  run.items.forEach((owner, idx) => {
    if (owner.disabled) return;
    const r = effectiveDef(run, idx);
    if (r && !r.inst.disabled) out.push({ def: r.def, inst: r.inst, owner });
  });
  return out;
}

export function sumMod(run: RunState, key: 'handSizeMod' | 'handsMod' | 'discardsMod' | 'itemSlotsMod'): number {
  let n = 0;
  for (const { def } of itemHooks(run)) n += def[key] ?? 0;
  return n;
}

export function rarityCost(r: Rarity): number {
  return { common: 4, uncommon: 6, rare: 8, legendary: 20 }[r];
}
