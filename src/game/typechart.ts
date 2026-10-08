import type { PType } from './types';

// attacker -> defender -> multiplier (only non-1 entries)
const CHART: Record<PType, Partial<Record<PType, number>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export function effectiveness(attack: PType, defenders: PType[]): number {
  let m = 1;
  for (const d of defenders) m *= CHART[attack][d] ?? 1;
  return m;
}

export type Matchup = 'super' | 'neutral' | 'resisted' | 'immune';

/** Best matchup across all of the card's attacking types. */
export function matchup(attackTypes: PType[], defenders: PType[]): Matchup {
  if (attackTypes.length === 0 || defenders.length === 0) return 'neutral';
  let best = -1;
  for (const t of attackTypes) best = Math.max(best, effectiveness(t, defenders));
  if (best >= 2) return 'super';
  if (best === 0) return 'immune';
  if (best < 1) return 'resisted';
  return 'neutral';
}

export const TYPE_COLORS: Record<PType, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', grass: '#7AC74C', electric: '#F7D02C', ice: '#96D9D6',
  fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD',
};

export const TYPE_ICONS: Record<PType, string> = {
  normal: '●', fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', ice: '❄', fighting: '👊', poison: '☠', ground: '⛰',
  flying: '🪶', psychic: '👁', bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉', dark: '🌑', steel: '⚙', fairy: '✨',
};

export function typeName(t: PType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
