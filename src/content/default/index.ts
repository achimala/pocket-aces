// The default, fully original Pocket Aces content pack.
import raw from '@/game/data/pips.json';
import { TYPE_COLORS } from '@/game/typechart';
import type { PType } from '@/game/types';
import type { ContentPack, PipEntry } from '../types';
import { creatureUrl } from '../procedural/creature';
import { iconUrl, type IconShape } from '../procedural/icons';
import { portraitUrl } from '../procedural/people';
import { backdropUrl } from '../procedural/scenes';
import { shade } from '../procedural/pixel';
import { generatedArt, hasGeneratedArt } from '../generated';
import { LEADERS } from './leaders';
import { PIPS } from './pips';
import {
  ABILITY_NAMES, CONSUMABLE_NAMES, DECK_TEXT, FRUIT_NAMES, ITEM_NAMES, KEY_ITEM_NAMES, MOVE_NAMES, PACK_NAMES, REGION_NAMES,
  SHOP_LINES, TERMS, TRAINER_NAMES, TRAINER_NICKS, TYPED_ITEMS,
} from './names';

interface RawPip { id: string; types: PType[]; stage: number; legendary: boolean }
const SLOTS = new Map((raw as RawPip[]).map((p) => [p.id, p]));

const BODY_BY_TYPE: Record<string, PipEntry['body']> = {
  normal: 'quad', fire: 'quad', water: 'fish', grass: 'plant', electric: 'blob', ice: 'blob', fighting: 'biped', poison: 'blob', ground: 'quad',
  flying: 'bird', psychic: 'biped', bug: 'bug', rock: 'rock', ghost: 'floater', dragon: 'serpent', dark: 'quad', steel: 'rock', fairy: 'floater',
};

/** The Pip entry for a slot, with a type-derived fallback while a slot has no authored entry. */
function pipEntry(id: string): Pick<PipEntry, 'color' | 'body'> {
  const e = PIPS[id];
  if (e) return e;
  const t = SLOTS.get(id)?.types[0] ?? 'normal';
  return { color: TYPE_COLORS[t], body: BODY_BY_TYPE[t] };
}

const TONICS = new Set(['growthtonic', 'cushion', 'spinach', 'anchor', 'horseshoe', 'metaldetector', 'chameleonpaint', 'fuse', 'petrify', 'releaseform', 'mimicmask', 'luckycoin', 'polishkit', 'tracingpaper', 'nightclass', 'tonicsampler', 'giftbox']);
const RIBBON_COLORS: Record<string, string> = { gold: '#e8b830', ruby: '#d0304a', sapphire: '#3a62d8', amethyst: '#9a5ad0' };

function iconFor(id: string): string {
  if (id in PACK_NAMES) {
    const shape: IconShape = id.includes('lantern') ? 'lantern' : id.startsWith('book') ? 'book' : 'box';
    return iconUrl(id, shape, id.startsWith('big') || id.startsWith('grand') ? '#d9a33a' : id.startsWith('bright') ? '#57a8e0' : undefined);
  }
  if (id in FRUIT_NAMES) return iconUrl(id, 'fruit');
  if (id in KEY_ITEM_NAMES) return iconUrl(id, (['key', 'tag', 'card', 'ring', 'box'] as IconShape[])[id.length % 5]);
  if (id.startsWith('book_')) return iconUrl(id, 'book');
  if (id.startsWith('dye_')) return iconUrl(id, 'bottle', TYPE_COLORS[id.slice(4) as PType]);
  if (id.startsWith('ribbon_')) return iconUrl(id, 'ribbon', RIBBON_COLORS[id.slice(7)]);
  if (TONICS.has(id)) return iconUrl(id, 'bottle');
  if (id in CONSUMABLE_NAMES) return iconUrl(id, id.length % 2 ? 'star' : 'orb');
  if (id === 'fossil') return iconUrl(id, 'gem', '#a88a62');
  return iconUrl(id);
}

export const DEFAULT_PACK: ContentPack = {
  id: 'default',
  label: 'Pocket Aces (original)',
  terms: TERMS,
  pips: PIPS,
  items: ITEM_NAMES,
  typedItems: TYPED_ITEMS,
  consumables: CONSUMABLE_NAMES,
  keyItems: KEY_ITEM_NAMES,
  fruits: FRUIT_NAMES,
  packs: PACK_NAMES,
  abilities: ABILITY_NAMES,
  moves: MOVE_NAMES,
  leaders: LEADERS,
  trainers: TRAINER_NAMES,
  trainerNames: TRAINER_NICKS,
  regions: REGION_NAMES,
  decks: DECK_TEXT,
  shopLines: SHOP_LINES,
  art: {
    pip(id, opts = {}) {
      const gen = generatedArt(`pips/${id}${opts.back ? '-back' : ''}`, opts.shiny);
      if (gen) return gen;
      const slot = SLOTS.get(id);
      const e = pipEntry(id);
      const t2 = slot?.types[1];
      const accent = t2 ? TYPE_COLORS[t2] : shade(e.color, 0.18, 25);
      return creatureUrl({ id, color: e.color, accent, body: e.body, stage: slot?.stage ?? 0, legendary: slot?.legendary }, opts);
    },
    needsShinyFilter: (id, back) => hasGeneratedArt(`pips/${id}${back ? '-back' : ''}`),
    portrait: (id) => generatedArt(`portraits/${id}`) ?? portraitUrl(id),
    icon: (id) => generatedArt(`icons/${id}`) ?? (id.startsWith('book_') ? generatedArt('icons/book') : undefined) ?? iconFor(id),
    backdrop: (id) => generatedArt(`backdrops/${id}`) ?? backdropUrl(id),
  },
};
