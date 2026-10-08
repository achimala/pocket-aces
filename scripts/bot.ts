// Headless balance bot: plays seeded runs with a greedy strategy and reports how far it gets.
import { isPipPack, newRun, startBattle, playHand, finishAttack, discardSelected, toShop, leaveShop, buyShopCard, buyPack, pickFromPack, closePack, useConsumable, canPlaySelected, openPendingPack, buyKeyItem, buyAndUseConsumable } from '../src/game/run';
import { scoreHand, previewHand } from '../src/game/scoring';
import { viewCard, species } from '../src/game/pips';
import { consumableDef } from '../src/game/consumables';
import { itemDef } from '../src/game/items';
import type { RunState, Difficulty } from '../src/game/types';
import { HAND_NAMES } from '../src/game/hands';

function combos<T>(arr: T[], k: number): T[][] {
  const out: T[][] = [];
  const rec = (start: number, acc: T[]) => {
    if (acc.length === k) { out.push([...acc]); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}

function clone<T>(x: T): T { return JSON.parse(JSON.stringify(x)); }

function bestPlay(run: RunState): { uids: string[]; damage: number } | null {
  const b = run.battle!;
  const hand = b.hand.filter((u) => !run.deck.find((c) => c.uid === u)!.frozen);
  let best: { uids: string[]; damage: number } | null = null;
  const sizes = [5, 4, 3, 2, 1];
  for (const k of sizes) {
    if (hand.length < k) continue;
    const cs = combos(hand, k);
    // limit combos for speed
    const sample = cs.length > 80 ? cs.filter((_, i) => i % Math.ceil(cs.length / 80) === 0) : cs;
    for (const uids of sample) {
      const r = clone(run);
      r.battle!.selected = uids;
      if (canPlaySelected(r)) continue;
      const played = uids.map((u) => viewCard(r.deck.find((c) => c.uid === u)!));
      const held = r.battle!.hand.filter((u) => !uids.includes(u));
      const res = scoreHand(r, r.battle!, played, held);
      if (!best || res.damage > best.damage) best = { uids, damage: res.damage };
    }
  }
  return best;
}

function playBattle(run: RunState, log: string[]): void {
  startBattle(run);
  let guard = 0;
  while (run.phase === 'battle' && guard++ < 40) {
    const b = run.battle!;
    // use Playbooks and Growth Tonics greedily
    for (const c of [...run.bag]) {
      const def = consumableDef(c.defId);
      if (def.targets === 0 && !def.canUse?.(run, [])) { useConsumable(run, c.uid); continue; }
      if (c.defId === 'growthtonic') {
        const evo = b.hand.filter((u) => species(run.deck.find((x) => x.uid === u)!.speciesId).evolvesTo.length).slice(0, 2);
        if (evo.length) { b.selected = evo; useConsumable(run, c.uid); b.selected = []; }
      }
    }
    const best = bestPlay(run);
    if (!best) { b.selected = b.hand.slice(0, 1); }
    else b.selected = best.uids;
    const remaining = b.hp - b.damage;
    // discard if weak and discards remain and not last hand
    if (best && b.discardsLeft > 0 && b.handsLeft > 1 && best.damage < remaining / b.handsLeft * 0.6) {
      const keep = new Set(best.uids);
      const junk = b.hand.filter((u) => !keep.has(u)).slice(0, 5);
      if (junk.length) { b.selected = junk; discardSelected(run); continue; }
    }
    const res = playHand(run);
    if (!res) { log.push('cannot play: ' + canPlaySelected(run)); b.selected = [b.hand[0]]; const r2 = playHand(run); if (!r2) { run.phase = 'gameover'; return; } }
    finishAttack(run);
  }
}

const KEY_PRIORITY = ['sneakers', 'jetsneakers', 'almanac', 'worldalmanac', 'calmchime', 'toolbelt', 'chiptray', 'bookshelf', 'loyaltycard'];
function mostPlayed(run: RunState): string {
  return (Object.entries(run.handPlays) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'pair';
}
function handlePack(run: RunState): void {
  while (run.phase === 'pack') {
    const pk = run.pack!;
    const mp = mostPlayed(run);
    const rank = (ch: typeof pk.choices[number]) => {
      if (ch.item) return run.items.length < run.itemSlots ? 5 + ({ common: 0, uncommon: 1, rare: 2, legendary: 3 }[itemDef(ch.item.defId).rarity]) : -1;
      if (ch.consumable) { if (run.bag.length >= run.bagSlots) return -1; if (ch.consumable.defId === `book_${mp}`) return 6; if (ch.consumable.defId === 'growthtonic') return 4; return 2; }
      if (ch.card) return 1 + species(ch.card.speciesId).tier / 10;
      return 0;
    };
    const pick = [...pk.choices].sort((a, b) => rank(b) - rank(a))[0];
    if (!pick || rank(pick) < 0 || pickFromPack(run, pick.uid)) closePack(run);
  }
}
function shopping(run: RunState): void {
  if (run.phase !== 'shop') return;
  let guard = 0;
  while (guard++ < 10) {
    const s = run.shop!;
    let bought = false;
    for (const k of s.keyItems) if (!k.sold && KEY_PRIORITY.includes(k.id) && run.money >= k.price) { if (!buyKeyItem(run, k.id)) bought = true; }
    const cards = [...s.cards].filter((c) => !c.sold).sort((a, b) => (b.kind === 'item' ? 1 : 0) - (a.kind === 'item' ? 1 : 0));
    for (const c of cards) {
      if (run.money - c.price < 0) continue;
      if (c.kind === 'item' && run.items.length < run.itemSlots) { if (!buyShopCard(run, c.uid)) bought = true; }
      else if (c.kind === 'consumable' && run.bag.length < run.bagSlots) { const def = consumableDef(c.consumable!.defId); if (def.targets === 0 && !def.canUse?.(run, [])) { if (!buyAndUseConsumable(run, c.uid)) bought = true; } else if (!buyShopCard(run, c.uid)) bought = true; }
    }
    for (const p of s.packs) {
      if (p.sold || run.money - p.price < 0) continue;
      if (isPipPack(p.kind) && run.deck.length > 60) continue;
      if (!buyPack(run, p.uid)) { bought = true; handlePack(run); }
    }
    if (!bought) break;
  }
  // use non-target consumables
  for (const c of [...run.bag]) { const def = consumableDef(c.defId); if (def.targets === 0 && !def.canUse?.(run, [])) useConsumable(run, c.uid); }
  leaveShop(run);
}

function playRun(starter: string, seed: string, difficulty: Difficulty = 'normal'): { region: number; battle: number; won: boolean; log: string[]; run: RunState } {
  const run = newRun(starter, difficulty, seed);
  const log: string[] = [];
  let guard = 0;
  while (guard++ < 200) {
    if (run.phase === 'select') {
      while (openPendingPack(run)) handlePack(run);
      playBattle(run, log);
      if (run.phase === 'cashout') { toShop(run); shopping(run); }
      else if (run.phase === 'win') return { region: run.region, battle: run.battleIndex, won: true, log, run };
      else if (run.phase === 'gameover') return { region: run.region, battle: run.battleIndex, won: false, log, run };
      else if (run.phase === 'pack') { closePack(run); }
    } else if (run.phase === 'pack') closePack(run);
    else if (run.phase === 'shop') shopping(run);
    else break;
  }
  return { region: run.region, battle: run.battleIndex, won: false, log, run };
}

const N = Number(process.argv[2] ?? 30);
const starters = (process.argv[3] ?? 'sprout,ember,tide').split(',');
for (const st of starters) {
  const reach: number[] = [];
  let wins = 0;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    try {
      const r = playRun(st, process.env.SEEDPFX ? `${process.env.SEEDPFX}-${i}` : `${st}-${i}`);
      reach.push(r.region * 3 + r.battle);
      if (r.won) wins++;
      if (i === 0 && r.log.length) console.log(r.log.slice(0, 5));
      if (process.env.SEEDLOG) console.log(`  ${st}-${i} R${r.region + 1}B${r.battle + 1} won=${r.won} best=${r.run.stats.bestDamage} money=${r.run.money} deck=${r.run.deck.length} items=${r.run.items.map((x) => x.defId).join(',')}`);
    } catch (e) {
      console.error('CRASH', st, i, (e as Error).stack?.split('\n').slice(0, 4).join('\n'));
      reach.push(-1);
    }
  }
  const hist: Record<string, number> = {};
  for (const x of reach) { const k = x < 0 ? 'crash' : `R${Math.floor(x / 3) + 1}`; hist[k] = (hist[k] ?? 0) + 1; }
  console.log(st, `wins=${wins}/${N}`, JSON.stringify(hist), `${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

// ---- diagnostics: where do runs die? ----
if (process.env.DIAG) {
  const deaths: Record<string, { n: number; ratio: number }> = {};
  const lv: number[] = [];
  for (let i = 0; i < 60; i++) {
    const r = playRun(process.env.DIAGSTARTER ?? 'ember', `diag-${i}`);
    const b = r.run.battle;
    const key = `R${r.region + 1}-${['wild', 'trainer', 'boss'][r.battle] ?? r.battle}${b ? ':' + b.opponent.id : ''}`;
    const d = deaths[key] ?? { n: 0, ratio: 0 };
    d.n++; d.ratio += b ? b.damage / b.hp : 0; deaths[key] = d;
    lv.push(Math.max(...Object.values(r.run.handLevels)));
    if (i < 3) console.log(key, 'items', r.run.items.map((x) => x.defId).join(','), 'levels', JSON.stringify(r.run.handLevels), 'deck', r.run.deck.length, 'best', r.run.stats.bestDamage, 'money', r.run.money);
  }
  console.log(Object.entries(deaths).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${k} x${v.n} avg ${(v.ratio / v.n * 100).toFixed(0)}%`).join('\n'));
  console.log('avg max hand level', (lv.reduce((a, b) => a + b, 0) / lv.length).toFixed(2));
}
