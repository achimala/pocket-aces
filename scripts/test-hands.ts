import { evaluateHand } from '../src/game/hands';
import { viewCard } from '../src/game/pips';
import { makeCard } from '../src/game/inventory';
import type { Card } from '../src/game/types';

let fails = 0;
function check(name: string, cards: Card[], expect: string, opts = {}) {
  const r = evaluateHand(cards.map(viewCard), opts);
  const ok = r.type === expect;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: got ${r.type} (expected ${expect}) scoring=${r.scoring.length} sets=${r.sets.map((s) => `${s.family}:${s.uids.length}/${s.stages}st`).join(',')} flush=${r.flushType ?? '-'}`);
}
const c = (n: number, extra: Partial<Card> = {}) => makeCard('c' + String(n).padStart(3, '0'), extra);
// tiers by slot: 10-12 → 2, 13 → 2, 19 → 3, 46 → 3, 27 → 4, 41 → 5, 84 → 6, 43 → 7, 69 → 8, 66 → 9, 25 → 10, 29 → J, 1-3 → Q, 102 → K, 147 → A
check('pair same stage', [c(1), c(1), c(25), c(66), c(43)], 'pair');
check('pair evo', [c(1), c(2)], 'pair');
check('three evo line', [c(1), c(2), c(3)], 'three');
check('full house evo', [c(1), c(2), c(3), c(25), c(26)], 'fullhouse');
check('two pair', [c(1), c(2), c(25), c(26), c(43)], 'twopair');
check('four', [c(1), c(1), c(2), c(3)], 'four');
check('five (branching family, mixed types)', [c(133), c(133), c(134), c(135), c(136)], 'five');
check('five of one type is a flush five', [c(129), c(129), c(129), c(130), c(130)], 'flushfive');
check('flush water (c129 x5 = flush five)', [c(129), c(129), c(129), c(129), c(129)], 'flushfive');
check('flush poison dual types', [c(1), c(43), c(69), c(41), c(29)], 'flush'); // all have poison
check('straight 4-5-6-7-8', [c(27), c(41), c(84), c(43), c(69)], 'straight');
check('straight 10-J-Q-K-A', [c(25), c(29), c(1), c(102), c(147)], 'straight');
check('straight A-2-3-4-5', [c(147), c(10), c(19), c(27), c(41)], 'straight');
check('no straight with gap', [c(27), c(41), c(84), c(43), c(66)], 'high');
check('shortcut straight with gap', [c(27), c(41), c(84), c(43), c(66)], 'straight', { shortcut: true });
check('four fingers flush', [c(1), c(43), c(69), c(41), c(25)], 'flush', { fourFingers: true });
check('poison 5,7,8,J,10 is a flush, not a straight flush', [c(41), c(43), c(69), c(29), c(88)], 'flush');
check('fossil + pair', [c(1), c(1), c(5, { ability: 'fossil' })], 'pair');
check('chameleon joins flush', [c(1), c(43), c(69), c(41), c(25, { ability: 'chameleon' })], 'flush');
check('dye type override flush', [c(25, { typeOverride: ['fire'] }), c(66, { typeOverride: ['fire'] }), c(4), c(37), c(77)], 'flush');
check('high card single', [c(150)], 'high');
check('flush house', [c(1), c(2), c(3), c(43), c(44)], 'flushhouse'); // all poison/grass
console.log(fails ? `${fails} FAILURES` : 'ALL OK');
if (fails) process.exitCode = 1;
