// Active content registry. The engine and UI read names/art through these helpers so a pack
// (or an optional overlay) can be swapped at runtime without touching game logic.
import { DEFAULT_PACK } from './default';
import type { ContentPack, PackOverlay, PipText } from './types';

export type { ContentPack, PackOverlay, PipText } from './types';

let pack: ContentPack = DEFAULT_PACK;
let overlay: PackOverlay | null = null;
const listeners = new Set<() => void>();

export const DEFAULT_LABEL = DEFAULT_PACK.label;

export function activePack(): ContentPack { return pack; }
export function activeOverlay(): PackOverlay | null { return overlay; }

export function setOverlay(o: PackOverlay | null): void {
  overlay = o;
  notifyContentChange();
}
/** Tell listeners that names or art changed (an overlay was toggled or generated art finished loading). */
export function notifyContentChange(): void {
  for (const l of listeners) l();
}
export function onContentChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const T = {
  get terms() { return pack.terms; },
  get shopLines() { return pack.shopLines; },
  pip(id: string): PipText {
    const base = pack.pips[id];
    const o = overlay?.pips?.[id];
    if (!base) return { name: id, genus: '', flavor: '' };
    return o ? { name: o.name ?? base.name, genus: o.genus ?? base.genus, flavor: o.flavor ?? base.flavor } : base;
  },
  pipName(id: string): string { return T.pip(id).name; },
  item(id: string): string { return overlay?.items?.[id]?.name ?? pack.items[id] ?? id; },
  typedItem(kind: 'booster' | 'sigil', type: string): string { return pack.typedItems[kind][type] ?? type; },
  consumable(id: string): string { return overlay?.items?.[id]?.name ?? pack.consumables[id] ?? id; },
  keyItem(id: string): string { return overlay?.items?.[id]?.name ?? pack.keyItems[id] ?? id; },
  fruit(id: string): string { return overlay?.items?.[id]?.name ?? pack.fruits[id] ?? id; },
  pack(id: string): string { return overlay?.items?.[id]?.name ?? pack.packs[id] ?? id; },
  ability(id: string): string { return pack.abilities[id] ?? id; },
  move(hand: string): string { return pack.moves[hand] ?? hand; },
  leader(id: string) { return pack.leaders[id] ?? { name: id, ruleName: id, crest: '', look: '' }; },
  trainer(id: string): string { return pack.trainers[id] ?? id; },
  trainerNick(i: number): string { return pack.trainerNames[i % pack.trainerNames.length] ?? ''; },
  region(id: string): string { return pack.regions[id] ?? id; },
  activeDeck(id: string): { perk: string; lean: string } { return pack.decks[id] ?? { perk: '', lean: '' }; },
  money(n: number): string { return `${pack.terms.currency}${n}`; },
};

/** Art URLs: overlay sprites/icons first, then the pack's own resolver. */
export const Art = {
  pip(id: string, opts: { back?: boolean; shiny?: boolean } = {}): string {
    const o = overlay?.pips?.[id];
    if (o) {
      const u = opts.back ? (opts.shiny ? o.backShiny ?? o.back : o.back) : opts.shiny ? o.spriteShiny ?? o.sprite : o.sprite;
      if (u) return u;
    }
    return pack.art.pip(id, opts);
  },
  /** Whether the shiny palette must be applied with a CSS filter (true when the sprite has no shiny variant). */
  needsShinyFilter(id: string, back = false): boolean {
    const o = overlay?.pips?.[id];
    if (o && (back ? o.back : o.sprite)) return !(back ? o.backShiny : o.spriteShiny);
    return pack.art.needsShinyFilter?.(id, back) ?? false;
  },
  shinyFilter: 'hue-rotate(150deg) saturate(1.3)',
  portrait(id: string): string { return pack.art.portrait(id); },
  icon(id: string): string { return overlay?.items?.[id]?.icon ?? pack.art.icon(id); },
  backdrop(id: string): string { return pack.art.backdrop(id); },
};
