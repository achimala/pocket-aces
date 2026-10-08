import { addCard, addItem, addToBag, canAddItem, canAddToBag, canEvolve, cloneCard, evolveCard, makeCard, makeConsumable, randomConsumable, randomItem, randomPip, removeCard } from './inventory';
import { HAND_MOVES, HAND_NAMES } from './hands';
import { familyMembers, species } from './pips';
import type { Rng } from './rng';
import { typeName } from './typechart';
import { T } from '@/content';
import type { Ability, Card, ConsumableKind, Edition, HandType, PType, Ribbon, RunState } from './types';

export interface ConsumableDef {
  id: string;
  kind: ConsumableKind;
  /** Display name from the active ContentPack. */
  readonly name: string;
  cost: number;
  readonly desc: string;
  targets: number; // max selected cards
  minTargets?: number;
  weight?: number;
  canUse?: (run: RunState, selected: Card[]) => string | null;
  use: (run: RunState, selected: Card[], rng: Rng) => string | void;
}

type Spec = Omit<ConsumableDef, 'name' | 'desc'> & { desc: string | (() => string) };
const m = (n: number) => T.money(n);
const t = () => T.terms;
const pipName = (c: Card) => species(c.speciesId).name;

const abilityTonic = (id: string, ability: Ability, n = 2): Spec => ({
  id, kind: 'tonic', cost: 3, targets: n, minTargets: 1,
  desc: () => `Gives ${ABILITY_LABELS[ability]} to up to ${n} selected card${n > 1 ? 's' : ''}`,
  use: (run, sel) => { for (const c of sel) c.ability = ability; return `${sel.length} card${sel.length > 1 ? 's' : ''} gained ${T.ability(ability)}`; },
});

const dye = (type: PType): Spec => ({
  id: `dye_${type}`, kind: 'tonic', cost: 3, targets: 3, minTargets: 1,
  desc: `Up to 3 selected cards become ${typeName(type)} type`,
  use: (run, sel) => { for (const c of sel) c.typeOverride = [type]; return `${sel.length} card${sel.length > 1 ? 's' : ''} became ${typeName(type)}`; },
});

const ribbon = (id: Ribbon, desc: string): Spec => ({
  id: `ribbon_${id}`, kind: 'relic', cost: 4, targets: 1, minTargets: 1, desc,
  use: (run, sel) => { sel[0].ribbon = id; return `${pipName(sel[0])} got a ${T.consumable(`ribbon_${id}`)}`; },
});

const ABILITY_RULES: Record<Ability, string> = {
  padded: '+30 Power when scored',
  mighty: '+4 Mult when scored',
  steadfast: 'x1.5 Mult while held in hand',
  chameleon: 'counts as every type',
  volatile: 'x2 Mult, 1 in 4 chance to faint after scoring',
  scavenger: '¤3 at end of battle if held in hand',
  lucky: '1 in 5: +20 Mult, 1 in 15: ¤20',
  fossil: '50 Power, no family, no type',
};

/** "Name (rule)" labels, resolved through the active pack. */
export const ABILITY_LABELS: Record<Ability, string> = new Proxy({} as Record<Ability, string>, {
  get: (_, k) => `${T.ability(String(k))} (${ABILITY_RULES[k as Ability].replace(/¤/g, T.terms.currency)})`,
});

export const EDITION_LABELS: Record<Edition, string> = {
  foil: 'Foil (+50 Power)', holo: 'Holo (+10 Mult)', shiny: 'Shiny (x1.5 Mult)', shadow: 'Shadow (+1 slot)',
};
export const RIBBON_LABELS: Record<Ribbon, string> = new Proxy({} as Record<Ribbon, string>, {
  get: (_, k) => ({
    gold: `Gold Ribbon (${m(3)} when scored)`,
    ruby: 'Ruby Ribbon (retrigger)',
    sapphire: `Sapphire Ribbon (creates the played hand's ${t().book} at end of battle if held)`,
    amethyst: `Amethyst Ribbon (creates a ${t().tonic} when discarded)`,
  })[k as Ribbon],
});

const SPECS: Spec[] = [
  {
    id: 'growthtonic', kind: 'tonic', cost: 3, targets: 2, minTargets: 1, weight: 3,
    desc: 'Evolve up to 2 selected cards to their next stage',
    canUse: (run, sel) => (sel.every(canEvolve) ? null : 'A selected card cannot evolve'),
    use: (run, sel, rng) => { const names = sel.map((c) => { const from = pipName(c); evolveCard(run, c, rng); return `${from} → ${pipName(c)}`; }); return names.join(', '); },
  },
  abilityTonic('cushion', 'padded'),
  abilityTonic('spinach', 'mighty'),
  abilityTonic('anchor', 'steadfast'),
  abilityTonic('horseshoe', 'lucky'),
  abilityTonic('metaldetector', 'scavenger'),
  abilityTonic('chameleonpaint', 'chameleon'),
  abilityTonic('fuse', 'volatile', 1),
  abilityTonic('petrify', 'fossil', 1),
  dye('fire'), dye('water'), dye('electric'), dye('grass'), dye('fairy'), dye('ice'), dye('ghost'), dye('psychic'),
  dye('normal'), dye('flying'), dye('poison'), dye('ground'), dye('rock'), dye('bug'), dye('fighting'), dye('steel'), dye('dragon'), dye('dark'),
  {
    id: 'releaseform', kind: 'tonic', cost: 3, targets: 2, minTargets: 1, desc: 'Release (destroy) up to 2 selected cards',
    use: (run, sel) => { for (const c of sel) removeCard(run, c.uid); return `Released ${sel.map(pipName).join(' and ')}`; },
  },
  {
    id: 'mimicmask', kind: 'tonic', cost: 3, targets: 2, minTargets: 2, desc: 'Select 2 cards: the left one becomes a copy of the right one',
    use: (run, sel) => { const [a, b] = sel; a.speciesId = b.speciesId; a.ability = b.ability; a.edition = b.edition; a.ribbon = b.ribbon; a.typeOverride = b.typeOverride; a.bonusPower = b.bonusPower; return `Transformed into ${pipName(b)}`; },
  },
  {
    id: 'luckycoin', kind: 'tonic', cost: 3, targets: 0, desc: () => `Doubles your money (max +${m(20)})`,
    use: (run) => { const g = Math.min(20, Math.max(0, run.money)); run.money += g; return `+${m(g)}`; },
  },
  {
    id: 'polishkit', kind: 'tonic', cost: 3, targets: 0, desc: '1 in 4 chance to give a random Item an edition',
    canUse: (run) => (run.items.some((i) => !i.edition) ? null : 'No Item can receive an edition'),
    use: (run, sel, rng) => {
      const lucky = run.items.some((i) => i.defId === 'loadeddice');
      if (!rng.chance(lucky ? 0.5 : 0.25)) return 'Nope!';
      const cands = run.items.filter((i) => !i.edition);
      const it = rng.pick(cands);
      it.edition = rng.weighted(['foil', 'holo', 'shiny', 'shadow'] as Edition[], (e) => ({ foil: 50, holo: 35, shiny: 12, shadow: 3 })[e]);
      return `Item became ${it.edition}!`;
    },
  },
  {
    id: 'tracingpaper', kind: 'tonic', cost: 3, targets: 0, desc: () => `Creates a copy of the last ${t().tonic} or ${t().book} you used`,
    canUse: (run) => (run.lastUsedConsumable && run.lastUsedConsumable !== 'tracingpaper' ? (canAddToBag(run) ? null : 'Bag is full') : 'Nothing to copy'),
    use: (run) => { addToBag(run, makeConsumable(run.lastUsedConsumable!)); return 'Traced!'; },
  },
  {
    id: 'nightclass', kind: 'tonic', cost: 3, targets: 0, desc: () => `Creates up to 2 random ${t().books}`,
    canUse: (run) => (canAddToBag(run) ? null : 'Bag is full'),
    use: (run, sel, rng) => { let n = 0; for (let i = 0; i < 2; i++) if (addToBag(run, randomConsumable(run, rng, 'book'))) n++; return `Studied ${n} ${n === 1 ? t().book : t().books}`; },
  },
  {
    id: 'tonicsampler', kind: 'tonic', cost: 3, targets: 0, desc: () => `Creates up to 2 random ${t().tonics}`,
    canUse: (run) => (canAddToBag(run) ? null : 'Bag is full'),
    use: (run, sel, rng) => { let n = 0; for (let i = 0; i < 2; i++) if (addToBag(run, randomConsumable(run, rng, 'tonic'))) n++; return `Got ${n} ${n === 1 ? t().tonic : t().tonics}`; },
  },
  {
    id: 'giftbox', kind: 'tonic', cost: 3, targets: 0, desc: 'Creates a random Item if you have room',
    canUse: (run) => (canAddItem(run) ? null : 'No room for an Item'),
    use: (run, sel, rng) => { addItem(run, randomItem(run, rng)); return 'A gift!'; },
  },
  // ---- Playbooks (one per hand type) ----
  ...(Object.keys(HAND_NAMES) as HandType[]).map((h): Spec => ({
    id: `book_${h}`, kind: 'book', cost: 3, targets: 0, desc: `Level up ${HAND_NAMES[h]}`,
    weight: ['five', 'flushhouse', 'flushfive'].includes(h) ? 0.3 : 1,
    use: (run) => { run.handLevels[h] = (run.handLevels[h] ?? 1) + 1; return `${HAND_NAMES[h]} is now Lv.${run.handLevels[h]}`; },
  })),
  // ---- Relics ----
  {
    id: 'wishinglantern', kind: 'relic', cost: 4, targets: 0, desc: () => `Adds a random legendary ${t().pip} (tier A) to your party, 1 in 4 Shiny`,
    use: (run, sel, rng) => { const c = randomPip(run, rng, { legendary: true, shinyChance: 0.25 }); addCard(run, c); return `${pipName(c)} joined you!`; },
  },
  {
    id: 'elixir', kind: 'relic', cost: 4, targets: 0, desc: 'Fully evolves every card in your hand',
    canUse: (run) => (run.battle ? null : 'Only usable in battle'),
    use: (run, sel, rng) => { let n = 0; for (const u of run.battle!.hand) { const c = run.deck.find((x) => x.uid === u)!; while (canEvolve(c)) { evolveCard(run, c, rng); n++; } } return `${n} evolutions!`; },
  },
  {
    id: 'encyclopedia', kind: 'relic', cost: 4, targets: 0, desc: 'Levels up every hand type',
    use: (run) => { for (const h of Object.keys(HAND_NAMES) as HandType[]) run.handLevels[h] = (run.handLevels[h] ?? 1) + 1; return 'All hands leveled up!'; },
  },
  {
    id: 'paintstorm', kind: 'relic', cost: 4, targets: 0, desc: 'Every card in your hand becomes one random type',
    canUse: (run) => (run.battle ? null : 'Only usable in battle'),
    use: (run, sel, rng) => { const ty = rng.pick(['fire', 'water', 'grass', 'electric', 'psychic', 'normal', 'poison', 'flying', 'rock', 'ground', 'fighting', 'bug', 'ice', 'ghost', 'dragon', 'dark', 'steel', 'fairy'] as PType[]); for (const u of run.battle!.hand) run.deck.find((x) => x.uid === u)!.typeOverride = [ty]; return `Everything is ${typeName(ty)}!`; },
  },
  {
    id: 'familyreunion', kind: 'relic', cost: 4, targets: 0, desc: 'Every card in your hand becomes one random family (stages kept), −1 hand size',
    canUse: (run) => (run.battle ? null : 'Only usable in battle'),
    use: (run, sel, rng) => {
      const hand = run.battle!.hand.map((u) => run.deck.find((x) => x.uid === u)!);
      const target = species(rng.pick(hand).speciesId);
      const fam = target.family;
      for (const c of hand) {
        const st = species(c.speciesId).stage;
        const cand = familyCached(fam).find((s) => s.stage === st) ?? familyCached(fam)[0];
        c.speciesId = cand.id;
      }
      run.handSizeBase -= 1;
      return `Everyone joined ${target.name}'s family!`;
    },
  },
  {
    id: 'clonevat', kind: 'relic', cost: 4, targets: 1, minTargets: 1, desc: 'Creates 2 copies of 1 selected card',
    use: (run, sel) => { addCard(run, cloneCard(sel[0])); addCard(run, cloneCard(sel[0])); return `Cloned ${pipName(sel[0])} twice`; },
  },
  {
    id: 'eclipse', kind: 'relic', cost: 4, targets: 0, desc: 'Shadow edition (+1 Item slot) on a random Item, −1 hand size',
    canUse: (run) => (run.items.some((i) => i.edition !== 'shadow') ? null : 'No Item can become Shadow'),
    use: (run, sel, rng) => { const it = rng.pick(run.items.filter((i) => i.edition !== 'shadow')); it.edition = 'shadow'; run.handSizeBase -= 1; return 'An Item fell into shadow'; },
  },
  {
    id: 'crucible', kind: 'relic', cost: 4, targets: 0, desc: 'Shiny edition (x1.5 Mult) on a random Item, destroys all other Items',
    canUse: (run) => (run.items.length ? null : 'You have no Items'),
    use: (run, sel, rng) => { const keep = rng.pick(run.items); keep.edition = 'shiny'; run.items = [keep]; return 'Forged in the crucible!'; },
  },
  {
    id: 'firesale', kind: 'relic', cost: 4, targets: 0, desc: () => `Release 5 random cards from your hand, gain ${m(20)}`,
    canUse: (run) => (run.battle ? null : 'Only usable in battle'),
    use: (run, sel, rng) => { const hand = rng.shuffle([...run.battle!.hand]).slice(0, 5); for (const u of hand) removeCard(run, u); run.money += 20; return `Sold off ${hand.length} ${t().pips} for ${m(20)}`; },
  },
  {
    id: 'glitterbomb', kind: 'relic', cost: 4, targets: 1, minTargets: 1, desc: 'Foil, Holo or Shiny edition on 1 selected card',
    use: (run, sel, rng) => { sel[0].edition = rng.weighted(['foil', 'holo', 'shiny'] as Edition[], (e) => ({ foil: 50, holo: 35, shiny: 15, shadow: 0 })[e]); return `${pipName(sel[0])} is now ${sel[0].edition}!`; },
  },
  ribbon('gold', `Attach a Gold Ribbon: ${'¤'}3 each time the card is scored`),
  ribbon('ruby', 'Attach a Ruby Ribbon: the card is retriggered once'),
  ribbon('sapphire', "Attach a Sapphire Ribbon: if held at the end of a battle, creates the last played hand's ¤BOOK"),
  ribbon('amethyst', 'Attach an Amethyst Ribbon: creates a ¤TONIC when the card is discarded'),
  {
    id: 'shootingstar', kind: 'relic', cost: 4, targets: 0, desc: 'Creates a Legendary Item',
    canUse: (run) => (canAddItem(run) ? null : 'No room for an Item'),
    use: (run, sel, rng) => { addItem(run, randomItem(run, rng, 'legendary')); return 'A legend awakens!'; },
  },
];

function fillTerms(s: string): string {
  return s.replace(/¤BOOK/g, t().book).replace(/¤TONIC/g, t().tonic).replace(/¤/g, t().currency);
}

export const CONSUMABLES: ConsumableDef[] = SPECS.map((sp) => {
  const { desc, ...rest } = sp;
  return Object.defineProperties(rest, {
    name: { get: () => (sp.kind === 'book' ? `${t().book}: ${HAND_MOVES[sp.id.slice(5) as HandType]}` : T.consumable(sp.id)), enumerable: false },
    desc: { get: () => fillTerms(typeof desc === 'function' ? desc() : desc), enumerable: false },
  }) as ConsumableDef;
});

const famCache = new Map<string, ReturnType<typeof familyMembers>>();
function familyCached(fam: string) {
  if (!famCache.has(fam)) famCache.set(fam, familyMembers(fam));
  return famCache.get(fam)!;
}

const byId = new Map(CONSUMABLES.map((c) => [c.id, c]));
export function consumableDef(id: string): ConsumableDef {
  const d = byId.get(id);
  if (!d) throw new Error('unknown consumable ' + id);
  return d;
}
export { makeCard };
