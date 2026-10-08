// Helpers for creating and adding cards, items and consumables to a run.
import { ITEMS, itemDef, rarityCost } from './items';
import { familyMembers, species, SPECIES } from './pips';
import { uid, type Rng } from './rng';
import type { Card, ConsumableInstance, Edition, ItemInstance, PType, Rarity, RunState } from './types';
import { CONSUMABLES, consumableDef } from './consumables';
import { ALL_TYPES } from './types';

export function makeCard(speciesId: string, extra: Partial<Card> = {}): Card {
  return { uid: uid('c'), speciesId, bonusPower: 0, ...extra };
}

export function cloneCard(c: Card): Card {
  return { ...c, uid: uid('c'), faceDown: false, frozen: false, tired: false };
}

export function makeItem(defId: string, variant?: PType, edition?: Edition): ItemInstance {
  const d = itemDef(defId);
  return { uid: uid('i'), defId, variant, edition, state: {}, sellValue: Math.max(1, Math.floor(d.cost / 2)) };
}

export function makeConsumable(defId: string, edition?: Edition): ConsumableInstance {
  const d = consumableDef(defId);
  return { uid: uid('b'), kind: d.kind, defId, edition };
}

export function itemSlots(run: RunState): number {
  return run.itemSlots + run.items.filter((i) => i.edition === 'shadow').length;
}
export function bagSlots(run: RunState): number {
  return run.bagSlots + run.bag.filter((b) => b.edition === 'shadow').length;
}

export function canAddItem(run: RunState): boolean {
  return run.items.length < itemSlots(run);
}
export function canAddToBag(run: RunState): boolean {
  return run.bag.length < bagSlots(run);
}

export function addItem(run: RunState, item: ItemInstance): boolean {
  if (!canAddItem(run) && item.edition !== 'shadow') return false;
  run.items.push(item);
  return true;
}

export function addToBag(run: RunState, c: ConsumableInstance): boolean {
  if (!canAddToBag(run) && c.edition !== 'shadow') return false;
  run.bag.push(c);
  return true;
}

export function addCard(run: RunState, card: Card): void {
  run.deck.push(card);
  if (run.battle) run.battle.drawPile.push(card.uid);
  for (const it of run.items) {
    const d = itemDef(it.defId);
    d.onCardAdded?.(run, it);
  }
  run.stats.pipsCaught += 1;
}

export function removeCard(run: RunState, cardUid: string): void {
  run.deck = run.deck.filter((c) => c.uid !== cardUid);
  const b = run.battle;
  if (b) {
    b.drawPile = b.drawPile.filter((u) => u !== cardUid);
    b.hand = b.hand.filter((u) => u !== cardUid);
    b.discardPile = b.discardPile.filter((u) => u !== cardUid);
    b.played = b.played.filter((u) => u !== cardUid);
    b.selected = b.selected.filter((u) => u !== cardUid);
  }
}

export function cardById(run: RunState, cardUid: string): Card | undefined {
  return run.deck.find((c) => c.uid === cardUid);
}

/** Evolve a card to its next stage. Returns the new slot id or null. */
export function evolveCard(run: RunState, card: Card, rng: Rng): string | null {
  const sp = species(card.speciesId);
  if (sp.evolvesTo.length === 0 || card.ability === 'fossil') return null;
  const next = rng.pick(sp.evolvesTo);
  card.speciesId = next;
  return next;
}

export function canEvolve(card: Card): boolean {
  return species(card.speciesId).evolvesTo.length > 0 && card.ability !== 'fossil';
}

// ---------- random generation ----------

export function rollRarity(rng: Rng, allowLegendary = false): Rarity {
  const r = rng.next();
  if (allowLegendary && r < 0.01) return 'legendary';
  if (r < 0.05) return 'rare';
  if (r < 0.3) return 'uncommon';
  return 'common';
}

export function deckTypeWeights(run: RunState): Map<PType, number> {
  const m = new Map<PType, number>();
  for (const t of ALL_TYPES) m.set(t, 1);
  for (const c of run.deck) for (const t of species(c.speciesId).types) m.set(t, (m.get(t) ?? 1) + 1);
  return m;
}

export function randomItem(run: RunState, rng: Rng, rarity?: Rarity, forceEdition?: Edition): ItemInstance {
  const r = rarity ?? rollRarity(rng, run.starter === 'shade');
  const owned = new Set(run.items.map((i) => i.defId + (i.variant ?? '')));
  let pool = ITEMS.filter((d) => d.rarity === r && !owned.has(d.id) && !(d.typed && owned.has(d.id)));
  if (pool.length === 0) pool = ITEMS.filter((d) => d.rarity === r);
  const def = rng.pick(pool);
  let variant: PType | undefined;
  if (def.typed) {
    const w = deckTypeWeights(run);
    variant = rng.weighted(ALL_TYPES, (t) => (w.get(t) ?? 1) ** 1.5);
  }
  let edition: Edition | undefined = forceEdition;
  if (!edition) {
    const boost = run.keyItems.includes('goldclover') ? 4 : run.keyItems.includes('glossyclover') ? 2 : 1;
    const x = rng.next() / boost;
    if (x < 0.003) edition = 'shadow';
    else if (x < 0.01) edition = 'shiny';
    else if (x < 0.024) edition = 'holo';
    else if (x < 0.04) edition = 'foil';
  }
  const it = makeItem(def.id, variant, edition);
  it.sellValue = Math.max(1, Math.floor(itemPrice(run, it) / 2));
  if (run.difficulty === 'ironman' && r !== 'legendary' && rng.chance(0.3)) it.eternal = true;
  return it;
}

export function itemPrice(run: RunState, it: ItemInstance): number {
  let p = rarityCost(itemDef(it.defId).rarity);
  if (it.edition === 'foil') p += 2;
  if (it.edition === 'holo') p += 3;
  if (it.edition === 'shiny') p += 5;
  if (it.edition === 'shadow') p += 5;
  return applyDiscount(run, p);
}

export function applyDiscount(run: RunState, p: number): number {
  if (run.keyItems.includes('vipcard')) return Math.max(1, Math.round(p * 0.5));
  if (run.keyItems.includes('loyaltycard')) return Math.max(1, Math.round(p * 0.75));
  return p;
}

export function randomConsumable(run: RunState, rng: Rng, kind: 'tonic' | 'book' | 'relic'): ConsumableInstance {
  let pool = CONSUMABLES.filter((c) => c.kind === kind);
  if (kind === 'book') {
    pool = pool.filter((c) => {
      const h = c.id.replace('book_', '');
      return !['five', 'flushhouse', 'flushfive'].includes(h) || (run.handPlays[h as keyof typeof run.handPlays] ?? 0) > 0;
    });
  }
  const def = rng.weighted(pool, (c) => c.weight ?? 1);
  return makeConsumable(def.id);
}

export function randomPip(run: RunState, rng: Rng, opts: { shinyChance?: number; legendary?: boolean } = {}): Card {
  const region = Math.min(run.region, 7);
  const minTier = [2, 2, 3, 4, 5, 6, 7, 8][region];
  let pool = SPECIES.filter((s) => s.tier >= minTier && (!s.legendary || region >= 5 || opts.legendary));
  if (opts.legendary) pool = SPECIES.filter((s) => s.tier === 14);
  const w = deckTypeWeights(run);
  const sp = rng.weighted(pool, (s) => {
    const typeW = Math.max(...s.types.map((t) => w.get(t) ?? 1));
    const stageW = s.stage === 0 ? 1.2 : s.stage === 1 ? 1 : 0.8;
    return (0.6 + typeW * 0.15) * stageW;
  });
  const card = makeCard(sp.id);
  if (rng.chance(opts.shinyChance ?? 0.05)) card.edition = 'shiny';
  if (run.keyItems.includes('grabbag')) {
    if (rng.chance(0.3)) card.ability = rng.pick(['padded', 'mighty', 'steadfast', 'chameleon', 'scavenger', 'lucky'] as const);
    if (rng.chance(0.1)) card.edition = rng.pick(['foil', 'holo', 'shiny'] as const);
  }
  return card;
}

export function familyCards(root: string): Card[] {
  const members = familyMembers(root);
  const stages = members.length;
  if (stages >= 3) return [members[0], members[0], members[1], members[2]].map((s) => makeCard(s.id));
  if (stages === 2) return [members[0], members[0], members[1], members[1]].map((s) => makeCard(s.id));
  return [0, 0, 0, 0].map(() => makeCard(members[0].id));
}
