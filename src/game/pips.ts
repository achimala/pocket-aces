import raw from './data/pips.json';
import { T } from '@/content';
import type { Card, PType, Species } from './types';

interface RawPip { id: string; types: string[]; stage: number; family: string; evolvesTo: string[]; final: boolean; legendary: boolean; bst: number; tier: number }

/** All 151 creature slots. Structure only; display text is resolved through the active ContentPack. */
export const SPECIES: Species[] = (raw as RawPip[]).map((m) => {
  const s = { ...m, types: m.types as PType[] } as Species;
  Object.defineProperties(s, {
    name: { get: () => T.pip(m.id).name, enumerable: false },
    genus: { get: () => T.pip(m.id).genus, enumerable: false },
    flavor: { get: () => T.pip(m.id).flavor, enumerable: false },
  });
  return s;
});

const byId = new Map<string, Species>();
for (const s of SPECIES) byId.set(s.id, s);

export function species(id: string): Species {
  const s = byId.get(id);
  if (!s) throw new Error('unknown species ' + id);
  return s;
}

export function slotNumber(id: string): number { return Number(id.slice(1)); }

export const FAMILIES: string[] = [...new Set(SPECIES.map((s) => s.family))];

export function familyMembers(family: string): Species[] {
  return SPECIES.filter((s) => s.family === family).sort((a, b) => a.stage - b.stage || slotNumber(a.id) - slotNumber(b.id));
}

export function tierLabel(tier: number): string {
  if (tier <= 10) return String(tier);
  return { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[tier] ?? '?';
}

export function tierPower(tier: number): number {
  if (tier <= 10) return tier;
  if (tier === 14) return 11;
  return 10;
}

/** Resolved, scoring-ready view of a card. */
export interface CardView {
  card: Card;
  sp: Species;
  types: PType[]; // [] for fossil
  family: string | null; // null for fossil
  tier: number | null;
  stage: number;
  isFinal: boolean;
  isBasic: boolean;
  basePower: number;
  name: string;
}

export function viewCard(card: Card): CardView {
  const sp = species(card.speciesId);
  const fossil = card.ability === 'fossil';
  const chameleon = card.ability === 'chameleon';
  let types: PType[] = card.typeOverride ?? sp.types;
  if (fossil) types = [];
  const basePower = fossil ? 50 : tierPower(sp.tier) + sp.stage * 4;
  return {
    card,
    sp,
    types: chameleon ? ALL_TYPES_LIST : types,
    family: fossil ? null : sp.family,
    tier: fossil ? null : sp.tier,
    stage: sp.stage,
    isFinal: sp.final,
    isBasic: sp.stage === 0,
    basePower: basePower + (card.bonusPower || 0),
    name: fossil ? 'Fossil' : sp.name,
  };
}

const ALL_TYPES_LIST: PType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];
