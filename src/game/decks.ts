import { familyCards, makeCard, makeConsumable, makeItem } from './inventory';
import { FAMILIES, species } from './pips';
import { T } from '@/content';
import type { Rng } from './rng';
import type { Card, Profile, RunState } from './types';

export interface DeckDef {
  id: string;
  /** Lead creature slot: the deck is named after it and it is shown on the starter card. */
  species: string;
  readonly name: string;
  readonly lean: string;
  readonly perk: string;
  readonly unlock: string;
  families?: string[];
  custom?: (rng: Rng) => Card[];
  isUnlocked: (p: Profile) => boolean;
  apply?: (run: RunState) => void;
}

type DeckSpec = Omit<DeckDef, 'name' | 'lean' | 'perk' | 'unlock'> & { unlock: () => string };

const c = (n: number) => 'c' + String(n).padStart(3, '0');
const fams = (...ns: number[]) => ns.map(c);
const WYRM = 147; // the tier-A dragon line that every core deck carries

const SPECS: DeckSpec[] = [
  {
    id: 'sprout', species: c(1), unlock: () => 'Available',
    families: fams(13, 46, 27, 41, 84, 43, 69, 66, 25, 29, 1, 102, WYRM),
    isUnlocked: () => true, apply: (r) => { r.discardsBase += 1; },
  },
  {
    id: 'ember', species: c(4), unlock: () => 'Available',
    families: fams(10, 19, 21, 41, 84, 16, 74, 126, 77, 37, 142, 4, WYRM),
    isUnlocked: () => true, apply: (r) => { r.handsBase += 1; },
  },
  {
    id: 'tide', species: c(7), unlock: () => 'Available',
    families: fams(10, 104, 116, 56, 98, 95, 74, 138, 127, 60, 7, 143, WYRM),
    isUnlocked: () => true, apply: (r) => { r.money += 10; },
  },
  {
    id: 'spark', species: c(25), unlock: () => 'Win a run',
    families: fams(10, 19, 52, 108, 81, 16, 100, 66, 25, 63, 131, 143, 145),
    isUnlocked: (p) => Object.values(p.wins).some((n) => n > 0),
  },
  {
    id: 'prism', species: c(133), unlock: () => `Earn 4 ${T.terms.crests} in one run`,
    families: fams(10, 19, 52, 108, 81, 16, 74, 66, 25, 131, 143, WYRM),
    custom: () => [133, 134, 135, 136].map((n) => makeCard(c(n))),
    isUnlocked: (p) => p.mostBadges >= 4,
    apply: (r) => { r.bagSlots += 1; r.bag.push(makeConsumable('chameleonpaint'), makeConsumable('chameleonpaint')); },
  },
  {
    id: 'shade', species: c(94), unlock: () => `Beat ${T.leader('esme').name} or ${T.leader('morrow').name}`,
    families: fams(13, 104, 23, 41, 124, 96, 109, 140, 88, 92, 90, 102, WYRM),
    isUnlocked: (p) => !!p.discovered['beat:esme'] || !!p.discovered['beat:morrow'],
    apply: (r) => { r.bag.push(makeConsumable('eclipse')); },
  },
  {
    id: 'flop', species: c(129), unlock: () => 'Play a Five of a Kind',
    custom: () => [...Array.from({ length: 44 }, () => makeCard(c(129))), ...Array.from({ length: 8 }, () => makeCard(c(130)))],
    isUnlocked: (p) => !!p.fiveOfAKind,
    apply: (r) => { r.items.push(makeItem('participation')); },
  },
  {
    id: 'apex', species: c(150), unlock: () => 'Win with 3 different starters',
    families: fams(10, 39, 116, 113, 124, 96, 79, 54, 123, 63, 120, 102, 150),
    isUnlocked: (p) => p.startersWon.length >= 3,
  },
  {
    id: 'mimic', species: c(132), unlock: () => `Win with the ${T.pipName(c(133))} deck`,
    custom: (rng) => {
      const out: Card[] = [];
      for (let t = 2; t <= 14; t++) {
        const fs = FAMILIES.filter((f) => species(f).tier === t);
        out.push(...familyCards(rng.pick(fs)));
      }
      return out;
    },
    isUnlocked: (p) => p.startersWon.includes('prism'),
  },
];

export const DECKS: DeckDef[] = SPECS.map((d) => {
  const { unlock, ...rest } = d;
  return Object.defineProperties(rest, {
    name: { get: () => T.pipName(d.species), enumerable: false },
    lean: { get: () => fillDeck(T.activeDeck(d.id).lean), enumerable: false },
    perk: { get: () => fillDeck(T.activeDeck(d.id).perk), enumerable: false },
    unlock: { get: unlock, enumerable: false },
  }) as DeckDef;
});

/** Deck text may reference creature names as {c133} and the currency as ¤. */
function fillDeck(s: string): string {
  return s.replace(/\{(c\d{3})\}/g, (_, id) => T.pipName(id)).replace(/¤/g, T.terms.currency).replace(/\{(\w+)\}/g, (_, k) => (T.terms as unknown as Record<string, string>)[k] ?? T.item(k));
}

export function deckDef(id: string): DeckDef {
  const d = DECKS.find((x) => x.id === id);
  if (!d) throw new Error('unknown deck ' + id);
  return d;
}

export function buildDeck(def: DeckDef, rng: Rng): Card[] {
  const cards: Card[] = [];
  if (def.families) for (const f of def.families) cards.push(...familyCards(f));
  if (def.custom) cards.push(...def.custom(rng));
  return cards;
}
