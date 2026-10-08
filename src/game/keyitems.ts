import { T } from '@/content';
import type { RunState } from './types';

export interface KeyItemDef {
  id: string;
  /** Display name from the active ContentPack. */
  readonly name: string;
  readonly desc: string;
  requires?: string; // previous tier
  apply?: (run: RunState) => void;
}

type KeySpec = Omit<KeyItemDef, 'name' | 'desc'> & { desc: () => string };
const m = (n: number) => T.money(n);
const t = () => T.terms;

const KEY_SPECS: KeySpec[] = [
  { id: 'scooter', desc: () => `Rerolls cost ${m(2)} less` },
  { id: 'jetscooter', desc: () => `Rerolls cost ${m(2)} less (again)`, requires: 'scooter' },
  { id: 'extrashelf', desc: () => `+1 card slot in the ${t().shop}` },
  { id: 'secondstall', desc: () => `+1 more card slot in the ${t().shop}`, requires: 'extrashelf' },
  { id: 'loyaltycard', desc: () => `All ${t().shop} prices 25% off` },
  { id: 'vipcard', desc: () => `All ${t().shop} prices 50% off`, requires: 'loyaltycard' },
  { id: 'chiptray', desc: () => `Interest cap raised to ${m(10)}`, apply: (r) => { r.interestCap = 10; } },
  { id: 'chipvault', desc: () => `Interest cap raised to ${m(20)}`, requires: 'chiptray', apply: (r) => { r.interestCap = 20; } },
  { id: 'sneakers', desc: () => '+1 attack per battle', apply: (r) => { r.handsBase += 1; } },
  { id: 'jetsneakers', desc: () => '+1 more attack per battle', requires: 'sneakers', apply: (r) => { r.handsBase += 1; } },
  { id: 'calmchime', desc: () => '+1 discard per battle', apply: (r) => { r.discardsBase += 1; } },
  { id: 'grandchime', desc: () => '+1 more discard per battle', requires: 'calmchime', apply: (r) => { r.discardsBase += 1; } },
  { id: 'almanac', desc: () => '+1 hand size', apply: (r) => { r.handSizeBase += 1; } },
  { id: 'worldalmanac', desc: () => '+1 more hand size', requires: 'almanac', apply: (r) => { r.handSizeBase += 1; } },
  { id: 'satchel', desc: () => '+1 Bag (consumable) slot', apply: (r) => { r.bagSlots += 1; } },
  { id: 'duffel', desc: () => '+1 more Bag slot', requires: 'satchel', apply: (r) => { r.bagSlots += 1; } },
  { id: 'tonicbelt', desc: () => `${t().tonics} appear twice as often in the ${t().shop}` },
  { id: 'tonicbar', desc: () => `${t().tonics} appear four times as often`, requires: 'tonicbelt' },
  { id: 'bookshelf', desc: () => `${t().books} appear twice as often in the ${t().shop}` },
  { id: 'library', desc: () => `${t().books} appear four times as often; ${t().book} packs always hold your most played hand`, requires: 'bookshelf' },
  { id: 'glossyclover', desc: () => 'Items with editions appear twice as often' },
  { id: 'goldclover', desc: () => 'Items with editions appear four times as often', requires: 'glossyclover' },
  { id: 'swapmeet', desc: () => `${t().pip} cards can appear in the ${t().shop}` },
  { id: 'grabbag', desc: () => `${t().pips} in the ${t().shop} and in ${t().lantern}s may have abilities or editions`, requires: 'swapmeet' },
  { id: 'roadatlas', desc: () => `Reroll the upcoming ${t().boss} once per region for ${m(10)}` },
  { id: 'balloon', desc: () => `Reroll the upcoming ${t().boss} as often as you like`, requires: 'roadatlas' },
  { id: 'pager', desc: () => `${t().books} held in your Bag give x1.5 Mult to their hand` },
  { id: 'smartwatch', desc: () => `${t().books} held in your Bag give x2 Mult to their hand`, requires: 'pager' },
  { id: 'parcel', desc: () => 'Does nothing. Somebody, somewhere, is expecting it.' },
  { id: 'monocle', desc: () => '+1 Item slot', requires: 'parcel', apply: (r) => { r.itemSlots += 1; } },
  { id: 'toolbelt', desc: () => '+1 Item slot', apply: (r) => { r.itemSlots += 1; } },
  { id: 'bottomlesscase', desc: () => '+1 more Item slot', requires: 'toolbelt', apply: (r) => { r.itemSlots += 1; } },
];

export const KEY_ITEMS: KeyItemDef[] = KEY_SPECS.map((k) => {
  const { desc, ...rest } = k;
  return Object.defineProperties(rest, {
    name: { get: () => T.keyItem(k.id), enumerable: false },
    desc: { get: desc, enumerable: false },
  }) as KeyItemDef;
});

export function keyItemDef(id: string): KeyItemDef {
  const d = KEY_ITEMS.find((k) => k.id === id);
  if (!d) throw new Error('unknown key item ' + id);
  return d;
}

export function availableKeyItems(run: RunState): KeyItemDef[] {
  return KEY_ITEMS.filter((k) => !run.keyItems.includes(k.id) && (!k.requires || run.keyItems.includes(k.requires)));
}
