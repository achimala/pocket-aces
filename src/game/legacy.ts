// One-time migration of saves from the game's first public build, which stored progress under other
// storage keys with that build's content ids. Those ids are kept here only as FNV-1a hashes
// (data/legacy-ids.json, generated once from the old build), so the repository carries no third-party
// names: the table can recognise an old id but not spell it. The content lists were renamed 1:1 in the
// same order, so a migrated run continues exactly as it would have.
import LEGACY from './data/legacy-ids.json';
import { T } from '@/content';
import { LEADERS, opponentName } from './opponents';
import { fnv1a, LEGACY_PREFIX_HASH } from './legacy-hash';
import type { Card, ConsumableInstance, ConsumableKind, ItemInstance, Opponent, OpponentKind, Profile, RunState } from './types';

const NEW = 'pocketaces.';

// The few old field names and enum values that changed, also matched by hash.
const H = {
  caught: '9l3vwa', // RunStats counter now called pipsCaught
  dex: 'ilfvr1', // Profile field now called dex
  pipKind: 'diyeji', // ShopCard kind now called 'pip'
  hardest: '1xdiet4', // Difficulty now called 'ironman'
};
const DONE_KEY = NEW + 'migrated';

type Cat = 'item' | 'cons' | 'key' | 'fruit' | 'leader' | 'trainer' | 'deck' | 'ability' | 'pack' | 'nick';
const table = LEGACY as Record<string, string>;

class Unmapped extends Error {}

/** New id for an old one. Throws for an id the old build never had. */
function id(cat: Cat, old: string): string {
  const hit = table[`${cat}:${fnv1a(old)}`];
  if (hit === undefined) throw new Unmapped(`${cat} id`);
  return hit;
}
const ids = (cat: Cat, xs: string[] | undefined) => (xs ?? []).map((x) => id(cat, x));
const slot = (n: number | string) => (/^\d+$/.test(String(n)) ? 'c' + String(n).padStart(3, '0') : String(n));

const CONS_KIND: Record<string, ConsumableKind> = { candy: 'tonic', tm: 'book', legendary: 'relic' };
const OPP_KIND: Record<string, OpponentKind> = { gym: 'boss', champion: 'kingpin', red: 'legend' };
const difficulty = (d: string) => (fnv1a(d) === H.hardest ? 'ironman' : d);
/** The key of `o` whose name hashes to `hash`. */
const field = (o: object, hash: string) => Object.keys(o ?? {}).find((k) => fnv1a(k) === hash) ?? '';

// Old saves are untyped JSON; these helpers rewrite them in place.
/* eslint-disable @typescript-eslint/no-explicit-any */
function card(c: any): Card {
  c.speciesId = slot(c.speciesId);
  if (c.ability) c.ability = id('ability', c.ability);
  return c;
}
function item(i: any): ItemInstance { i.defId = id('item', i.defId); return i; }
function consumable(c: any): ConsumableInstance {
  c.defId = id('cons', c.defId);
  c.kind = CONS_KIND[c.kind] ?? c.kind;
  return c;
}
function opponent(o: any): Opponent {
  o.kind = OPP_KIND[o.kind] ?? o.kind;
  o.party = (o.party ?? []).map(slot);
  delete o.ruleText;
  if (o.kind === 'wild') {
    o.id = slot(o.id);
    o.name = o.id;
    o.title = 'wild';
  } else if (o.kind === 'trainer') {
    o.id = id('trainer', o.id);
    o.name = id('nick', String(o.name).split(' ').pop() ?? '');
    o.title = 'trainer';
    o.portrait = o.id;
  } else {
    o.id = id('leader', o.id);
    o.name = o.id;
    o.title = o.kind;
    o.portrait = o.id;
    if (o.ruleId) {
      o.ruleFrom = id('leader', o.ruleId);
      o.ruleId = LEADERS.find((l) => l.id === o.ruleFrom)?.rule;
      if (!o.ruleId) throw new Unmapped('rule');
    }
  }
  return o;
}
function discoveredKey(k: string): string {
  const [prefix, ...rest] = k.split(':');
  const v = rest.join(':');
  switch (prefix) {
    case 'item': return 'item:' + id('item', v);
    case 'cons': return 'cons:' + id('cons', v);
    case 'key': return 'key:' + id('key', v);
    case 'berry': return 'fruit:' + id('fruit', v);
    case 'beat': return 'beat:' + id('leader', v);
    default: return k; // won:<seed>, lost:<seed>
  }
}

export function migrateRun(r: any, version: number): RunState {
  r.version = version;
  r.starter = id('deck', r.starter);
  r.difficulty = difficulty(r.difficulty);
  r.deck = r.deck.map(card);
  r.items = r.items.map(item);
  r.bag = r.bag.map(consumable);
  r.keyItems = ids('key', r.keyItems);
  r.fruits = ids('fruit', r.berries); delete r.berries;
  r.leaders = ids('leader', r.leaders);
  r.champion = id('leader', r.champion);
  r.eliteOrder = ids('leader', r.eliteOrder);
  r.badges = ids('leader', r.badges);
  r.pendingFruitPacks = ids('pack', r.pendingBerryPacks); delete r.pendingBerryPacks;
  r.bossRerolledThisRegion = !!r.gymRerolledThisRegion; delete r.gymRerolledThisRegion;
  const caught = field(r.stats, H.caught);
  r.stats.pipsCaught = r.stats[caught] ?? 0; delete r.stats[caught];
  if (r.lastUsedConsumable) r.lastUsedConsumable = id('cons', r.lastUsedConsumable);
  r.unlockQueue = (r.unlockQueue ?? []).map(discoveredKey);
  if (r.previewOpponents) r.previewOpponents = r.previewOpponents.map(opponent);
  if (r.battle) {
    r.battle.opponent = opponent(r.battle.opponent);
    r.battle.log = []; // old display text
  }
  if (r.shop) {
    for (const sc of r.shop.cards) {
      if (fnv1a(sc.kind) === H.pipKind) sc.kind = 'pip';
      if (sc.item) item(sc.item);
      if (sc.consumable) consumable(sc.consumable);
      if (sc.card) card(sc.card);
    }
    for (const p of r.shop.packs) p.kind = id('pack', p.kind);
    for (const k of r.shop.keyItems) k.id = id('key', k.id);
  }
  if (r.pack) {
    r.pack.kind = id('pack', r.pack.kind);
    for (const ch of r.pack.choices) {
      if (ch.card) card(ch.card);
      if (ch.item) item(ch.item);
      if (ch.consumable) consumable(ch.consumable);
    }
  }
  if (r.cashout && r.battle) {
    // Labels were display text; rebuild the ones we can and call the rest (item and ability payouts) a bonus.
    const opp: Opponent = r.battle.opponent;
    r.cashout.lines = r.cashout.lines.map((l: { label: string; amount: number }, i: number) => ({
      amount: l.amount,
      label: i === 0 ? (opp.kind === 'wild' ? `${T.terms.wild} Encounter won` : `Defeated ${opponentName(opp)}`)
        : /^\d+ unused/.test(l.label) ? l.label
        : l.label.startsWith('Interest') ? `Interest (${T.money(1)} per ${T.money(5)}, max ${T.money(r.interestCap)})`
        : 'Bonus',
    }));
  }
  delete r.toast; // old display text
  return r as RunState;
}

export function migrateProfile(p: any): Profile {
  const byDeck = (rec: Record<string, any> = {}) => Object.fromEntries(Object.entries(rec).map(([k, v]) => [id('deck', k), v]));
  const discovered: Record<string, true> = {};
  for (const k of Object.keys(p.discovered ?? {})) {
    try { discovered[discoveredKey(k)] = true; } catch { /* an id from no known build: drop just that entry */ }
  }
  const dex: Profile['dex'] = {};
  for (const [k, v] of Object.entries(p[field(p, H.dex)] ?? {})) dex[slot(k)] = v as Profile['dex'][string];
  return {
    unlockedStarters: ids('deck', p.unlockedStarters),
    wins: byDeck(p.wins),
    losses: byDeck(p.losses),
    bestDamage: p.bestDamage ?? 0,
    mostBadges: p.mostBadges ?? 0,
    discovered,
    dex,
    handPlays: p.handPlays ?? {},
    fiveOfAKind: p.fiveOfAKind,
    startersWon: ids('deck', p.startersWon),
    difficultyWins: Object.fromEntries(Object.entries(byDeck(p.difficultyWins)).map(([k, v]) => [k, (v as string[]).map(difficulty)])) as Profile['difficultyWins'],
    runsStarted: p.runsStarted ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Copies a first-build save into the current keys, once. Old keys are left in place so a rollback still works.
 * Each part is independent: a run that can't be mapped is dropped without losing the profile.
 */
export function migrateLegacyStorage(version: number): void {
  let ls: Storage;
  try { ls = localStorage; if (ls.getItem(DONE_KEY)) return; } catch { return; }
  const get = (k: string) => { try { return ls.getItem(k); } catch { return null; } };
  let OLD = '';
  try { for (let i = 0; i < ls.length; i++) { const pre = (ls.key(i) ?? '').split('.')[0] + '.'; if (fnv1a(pre) === LEGACY_PREFIX_HASH) { OLD = pre; break; } } } catch { /* blocked */ }
  if (!OLD) { try { ls.setItem(DONE_KEY, '1'); } catch { /* blocked */ } return; }
  const set = (k: string, v: string) => { try { ls.setItem(k, v); } catch { /* full or blocked */ } };
  const parse = (s: string | null) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

  const profile = parse(get(OLD + 'profile'));
  if (profile && !get(NEW + 'profile')) {
    try { set(NEW + 'profile', JSON.stringify(migrateProfile(profile))); } catch { /* keep defaults */ }
  }
  const run = parse(get(OLD + 'run'));
  if (run && run.version === 1 && !get(NEW + 'run')) {
    try { set(NEW + 'run', JSON.stringify(migrateRun(run, version))); } catch { /* drop the run, keep the profile */ }
  }
  const settings = parse(get(OLD + 'settings'));
  if (settings && !get(NEW + 'settings')) {
    const { speed, reducedMotion, crt, showMoveNames } = settings;
    set(NEW + 'settings', JSON.stringify({ speed, reducedMotion, crt, showMoveNames, overlay: '' }));
  }
  for (const k of ['audio', 'tutorialSeen']) {
    const v = get(OLD + k);
    if (v !== null && get(NEW + k) === null) set(NEW + k, v);
  }
  set(DONE_KEY, '1');
}
