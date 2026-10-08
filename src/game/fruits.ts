// Fruits: small one-shot boons earned by skipping a battle.
import { T } from '@/content';
import type { PackKind, RunState } from './types';

export interface FruitDef {
  id: string;
  /** Display name from the active ContentPack. */
  readonly name: string;
  readonly desc: string;
  /** immediate: applied the moment it is earned */
  immediate?: boolean;
  pack?: PackKind;
}

type FruitSpec = Omit<FruitDef, 'name' | 'desc'> & { desc: () => string };
const m = (n: number) => T.money(n);
const t = () => T.terms;

const FRUIT_SPECS: FruitSpec[] = [
  { id: 'doubleplum', desc: () => `Doubles your money (max +${m(40)})`, immediate: true },
  { id: 'freerollfig', desc: () => `Next ${t().shop}: Items and packs are free` },
  { id: 'bumppumpkin', desc: () => `Next ${t().shop} Item is Uncommon` },
  { id: 'highmelon', desc: () => `Next ${t().shop} Item is Rare` },
  { id: 'tinfoilpear', desc: () => `Next ${t().shop} Item is Foil` },
  { id: 'prismlime', desc: () => `Next ${t().shop} Item is Holo` },
  { id: 'glintgrape', desc: () => `Next ${t().shop} Item is Shiny` },
  { id: 'duskdate', desc: () => `Next ${t().shop} Item is Shadow` },
  { id: 'spinquat', desc: () => `Next ${t().shop}: rerolls start at ${m(0)}` },
  { id: 'bighandbanana', desc: () => '+3 hand size in the next battle' },
  { id: 'twinpeach', desc: () => `Copies the next ${t().fruit} you earn` },
  { id: 'mentorquince', desc: () => 'Levels up a random hand type 3 times', immediate: true },
  { id: 'bountylychee', desc: () => `${m(25)} after beating the next ${t().boss}` },
  { id: 'shufflestarfruit', desc: () => `Rerolls the upcoming ${t().boss}`, immediate: true },
  { id: 'lanternlemon', desc: () => `Open a free ${T.pack('brightlantern')} now`, immediate: true, pack: 'brightlantern' },
  { id: 'tonictangerine', desc: () => `Open a free ${T.pack('bigtonickit')} now`, immediate: true, pack: 'bigtonickit' },
  { id: 'pagepomelo', desc: () => `Open a free ${T.pack('bookcrate')} now`, immediate: true, pack: 'bookcrate' },
  { id: 'mysterymangosteen', desc: () => `Open a free ${T.pack('bigmysterybox')} now`, immediate: true, pack: 'bigmysterybox' },
  { id: 'keylime', desc: () => `An extra Key Item in the next ${t().shop}` },
  { id: 'passionfruit', desc: () => `${m(5)} for every battle skipped this run (ongoing)` },
  { id: 'tipcoconut', desc: () => `${m(1)} for every attack played this run (ongoing)` },
  { id: 'giftgourd', desc: () => 'Two free common Items (if room)', immediate: true },
];

export const FRUITS: FruitDef[] = FRUIT_SPECS.map((f) => {
  const { desc, ...rest } = f;
  return Object.defineProperties(rest, {
    name: { get: () => T.fruit(f.id), enumerable: false },
    desc: { get: desc, enumerable: false },
  }) as FruitDef;
});

export function fruitDef(id: string): FruitDef {
  const d = FRUITS.find((b) => b.id === id);
  if (!d) throw new Error('unknown fruit ' + id);
  return d;
}

export function hasFruit(run: RunState, id: string): boolean {
  return run.fruits.includes(id);
}
export function consumeFruit(run: RunState, id: string): boolean {
  const i = run.fruits.indexOf(id);
  if (i < 0) return false;
  run.fruits.splice(i, 1);
  return true;
}
