// ContentPack: every player-facing name, flavor line and art URL lives here, never in the engine.
// The engine (src/game) only knows neutral ids: creature slots c001..c151, item ids, rule ids, etc.

/** Idle-motion personality for a creature's sprite. See src/ui/components/PipSprite.tsx. */
export type MotionPreset = 'bouncy' | 'floaty' | 'heavy' | 'jittery' | 'slithery' | 'steady' | 'swaying' | 'buzzy';

export interface PipText {
  name: string;
  /** Short category line, e.g. "Sprout Pip". */
  genus: string;
  flavor: string;
}

export interface PipEntry extends PipText {
  /** Visual concept, used for art prompts and the procedural placeholder. */
  look: string;
  motion: MotionPreset;
  /** Dominant body colour for the procedural placeholder (hex). */
  color: string;
  /** Procedural body plan hint. */
  body: BodyPlan;
}

export type BodyPlan = 'blob' | 'quad' | 'biped' | 'bird' | 'fish' | 'serpent' | 'bug' | 'floater' | 'plant' | 'rock';

export interface LeaderText {
  name: string;
  ruleName: string;
  /** Crest (badge) earned for beating a Pit Boss, or a title for League opponents. */
  crest: string;
  /** One-line look description for portrait art prompts. */
  look: string;
}

export interface Terms {
  game: string;
  pip: string;
  pips: string;
  dex: string;
  shop: string;
  boss: string;
  bosses: string;
  crest: string;
  crests: string;
  elite: string;
  kingpin: string;
  legend: string;
  wild: string;
  trainer: string;
  league: string;
  summit: string;
  tonic: string;
  tonics: string;
  book: string;
  books: string;
  relic: string;
  fruit: string;
  fruits: string;
  lantern: string;
  currencyName: string;
  currency: string;
}

export interface ArtResolver {
  /** Front or back sprite for a creature slot. */
  pip(id: string, opts?: { back?: boolean; shiny?: boolean }): string;
  /** True when the sprite returned for `shiny` is not already palette-shifted, so the UI applies a CSS hue shift. */
  needsShinyFilter?(id: string, back: boolean): boolean;
  portrait(id: string): string;
  icon(id: string): string;
  backdrop(id: string): string;
}

export interface ContentPack {
  id: string;
  label: string;
  terms: Terms;
  pips: Record<string, PipEntry>;
  items: Record<string, string>;
  /** Typed item variants: booster and sigil names per elemental type. */
  typedItems: { booster: Record<string, string>; sigil: Record<string, string> };
  consumables: Record<string, string>;
  keyItems: Record<string, string>;
  fruits: Record<string, string>;
  packs: Record<string, string>;
  abilities: Record<string, string>;
  moves: Record<string, string>;
  leaders: Record<string, LeaderText>;
  trainers: Record<string, string>;
  trainerNames: string[];
  regions: Record<string, string>;
  decks: Record<string, { perk: string; lean: string }>;
  shopLines: string[];
  art: ArtResolver;
}

/** A partial overlay (e.g. the optional imported pack). Only creatures and items can be overridden. */
export interface PackOverlay {
  id: string;
  label: string;
  attribution?: string;
  pips?: Record<string, Partial<PipText> & { sprite?: string; spriteShiny?: string; back?: string; backShiny?: string }>;
  items?: Record<string, { name?: string; icon?: string }>;
}
