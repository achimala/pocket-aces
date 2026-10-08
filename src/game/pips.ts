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

const parentOf = new Map<string, string>();
for (const s of SPECIES) for (const c of s.evolvesTo) parentOf.set(c, s.id);

/**
 * The evolution line a Pip belongs to, as shown on cards: its ancestors, itself, then its evolutions while the
 * line doesn't split. `branches` counts the forms the line splits into after the last member (0 if it doesn't).
 */
export function evolutionLine(id: string): { members: Species[]; branches: number } {
  const up: Species[] = [];
  for (let p = parentOf.get(id); p; p = parentOf.get(p)) up.unshift(species(p));
  const members = [...up, species(id)];
  let last = members[members.length - 1];
  while (last.evolvesTo.length === 1) { last = species(last.evolvesTo[0]); members.push(last); }
  return { members, branches: last.evolvesTo.length > 1 ? last.evolvesTo.length : 0 };
}

/** Each Pip's evolution tree as rows of stages (stage 0 first); a stage can hold several branch forms. */
export function familyTree(family: string): Species[][] {
  const rows: Species[][] = [];
  for (const s of familyMembers(family)) (rows[s.stage] ??= []).push(s);
  return rows;
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
