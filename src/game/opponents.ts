import { SPECIES, species } from './pips';
import { T } from '@/content';
import type { Rng } from './rng';
import type { Difficulty, Opponent, OpponentKind, PType, RunState } from './types';

/** Region ids in order: eight regions, then the League (8) and the endless summit (9). Names come from the ContentPack. */
export const REGIONS: { id: string; readonly name: string }[] = [
  'fernreach', 'lanternport', 'cinderisles', 'frostmere', 'neonbasin', 'gildedcoast', 'sunreef', 'moorhaven', 'grandtable', 'highstakes',
].map((id) => Object.defineProperty({ id }, 'name', { get: () => T.region(id), enumerable: false }) as { id: string; readonly name: string });

/** Boss rules: mechanics only. Rule names are flavor and come from the leader's pack entry. */
export type RuleId =
  | 'firstguard' | 'nodiscards' | 'static' | 'norepeat' | 'bighp' | 'veilfinals' | 'onetype' | 'backdraft' | 'loafing'
  | 'regrow' | 'tirecards' | 'frostbite' | 'toll' | 'oneshot' | 'slowdraw' | 'pumpup' | 'charmfinals' | 'fivecards'
  | 'swipe' | 'shuffleitems' | 'halfbase' | 'squeeze' | 'cap50' | 'gag' | 'deepfreeze' | 'bulk' | 'hex' | 'cap40'
  | 'pride' | 'purge' | 'spectacle' | 'legend';

export const RULE_TEXT: Record<RuleId, string> = {
  firstguard: 'Your first attack deals half damage',
  nodiscards: 'No discards',
  static: '1 in 4 cards are drawn stunned (face down)',
  norepeat: 'No hand type may be played twice',
  bighp: 'HP x1.5',
  veilfinals: 'Fully evolved cards are drawn face down',
  onetype: 'Only your first hand type may be played',
  backdraft: 'Cards with type advantage against this boss score 0 Power',
  loafing: 'Every second attack deals half damage',
  regrow: 'Heals 15% of max HP after each attack',
  tirecards: 'Cards played earlier this battle are debuffed',
  frostbite: 'After each attack, 2 random cards in hand freeze for the battle',
  toll: 'Lose ¤1 per card played',
  oneshot: 'Only 1 attack, HP x0.45',
  slowdraw: 'Draw only 3 cards after each attack or discard',
  pumpup: 'HP grows by 15% of max after each attack',
  charmfinals: 'Fully evolved cards score 0 Power',
  fivecards: 'Must play exactly 5 cards',
  swipe: 'The highest Power card of each attack scores 0',
  shuffleitems: 'Items shuffle and one flips face down each attack',
  halfbase: 'Hand base Power and Mult are halved',
  squeeze: 'Hand size shrinks by 1 after each attack',
  cap50: 'A single attack cannot deal more than half of HP',
  gag: 'Bag consumables cannot be used',
  deepfreeze: 'No discards and −1 hand size',
  bulk: 'HP x1.75',
  hex: 'One Item is disabled each attack; fully evolved cards are drawn face down',
  cap40: 'Each attack is capped at 40% of HP; no hand type repeats',
  pride: 'HP x1.5; your most played hand type deals half damage',
  purge: 'HP x1.5; after each attack your 2 highest Power cards in hand are discarded',
  spectacle: 'HP x2, but you get +2 attacks; each attack is capped at 35% of HP',
  legend: 'Draws a random League rule each rematch',
};

export interface LeaderDef {
  id: string;
  type: PType;
  region: number; // 0..7, 8 = elite, 9 = kingpin, 10 = legend
  rule: RuleId;
}

export const LEADERS: LeaderDef[] = [
  { id: 'rocco', type: 'rock', region: 0, rule: 'firstguard' },
  { id: 'marina', type: 'water', region: 0, rule: 'nodiscards' },
  { id: 'volta', type: 'electric', region: 0, rule: 'static' },
  { id: 'wren', type: 'bug', region: 1, rule: 'norepeat' },
  { id: 'lou', type: 'normal', region: 1, rule: 'bighp' },
  { id: 'esme', type: 'ghost', region: 1, rule: 'veilfinals' },
  { id: 'duke', type: 'fighting', region: 2, rule: 'onetype' },
  { id: 'tamsin', type: 'fire', region: 2, rule: 'backdraft' },
  { id: 'gus', type: 'normal', region: 2, rule: 'loafing' },
  { id: 'fern', type: 'grass', region: 3, rule: 'regrow' },
  { id: 'kit', type: 'fighting', region: 3, rule: 'tirecards' },
  { id: 'sasha', type: 'ice', region: 3, rule: 'frostbite' },
  { id: 'bram', type: 'bug', region: 4, rule: 'toll' },
  { id: 'tex', type: 'ground', region: 4, rule: 'oneshot' },
  { id: 'piper', type: 'flying', region: 4, rule: 'slowdraw' },
  { id: 'roxy', type: 'fighting', region: 5, rule: 'pumpup' },
  { id: 'primrose', type: 'fairy', region: 5, rule: 'charmfinals' },
  { id: 'odette', type: 'psychic', region: 5, rule: 'fivecards' },
  { id: 'vic', type: 'dark', region: 6, rule: 'swipe' },
  { id: 'mesa', type: 'ground', region: 6, rule: 'shuffleitems' },
  { id: 'iggy', type: 'fire', region: 6, rule: 'halfbase' },
  { id: 'tova', type: 'fighting', region: 7, rule: 'squeeze' },
  { id: 'rex', type: 'dragon', region: 7, rule: 'cap50' },
  { id: 'jinx', type: 'dark', region: 7, rule: 'gag' },
  { id: 'ingrid', type: 'ice', region: 8, rule: 'deepfreeze' },
  { id: 'brutus', type: 'fighting', region: 8, rule: 'bulk' },
  { id: 'morrow', type: 'ghost', region: 8, rule: 'hex' },
  { id: 'sable', type: 'dragon', region: 8, rule: 'cap40' },
  { id: 'ace', type: 'normal', region: 9, rule: 'pride' },
  { id: 'aurelia', type: 'dragon', region: 9, rule: 'purge' },
  { id: 'monty', type: 'fire', region: 9, rule: 'spectacle' },
  { id: 'stranger', type: 'electric', region: 10, rule: 'legend' },
];

export const ELITE_ORDER = ['ingrid', 'brutus', 'morrow', 'sable'];
export const KINGPINS = ['ace', 'aurelia', 'monty'];
export const LEGEND = 'stranger';

export const TRAINER_CLASSES: { id: string; types: PType[] }[] = [
  { id: 'schoolkid', types: ['normal'] },
  { id: 'socialite', types: ['normal', 'fairy'] },
  { id: 'mothchaser', types: ['bug'] },
  { id: 'rambler', types: ['rock', 'ground'] },
  { id: 'angler', types: ['water'] },
  { id: 'mystic', types: ['psychic'] },
  { id: 'brawler', types: ['fighting'] },
  { id: 'cardsharp', types: ['poison'] },
  { id: 'prodigy', types: ['dragon', 'ice', 'steel'] },
  { id: 'lifeguard', types: ['water'] },
  { id: 'falconer', types: ['flying'] },
  { id: 'bookie', types: ['fire', 'electric'] },
  { id: 'medium', types: ['ghost'] },
  { id: 'tinkerer', types: ['electric', 'steel'] },
  { id: 'rival', types: ['grass', 'fire', 'water'] },
];

export const BASE_HP = [300, 800, 1800, 4200, 9000, 16000, 28000, 42000];
export const ELITE_HP = 60000;
export const KINGPIN_HP = 90000;

export function leader(id: string): LeaderDef {
  const l = LEADERS.find((x) => x.id === id);
  if (!l) throw new Error('unknown leader ' + id);
  return l;
}

function diffMult(d: Difficulty): number {
  return d === 'normal' ? 1 : 1.15;
}

export function baseHpFor(run: RunState, kind: OpponentKind): number {
  const d = diffMult(run.difficulty);
  if (run.region >= 9 || run.endless) {
    const r = run.leagueRound;
    return Math.round(KINGPIN_HP * Math.pow(1.6, r + 1) * d);
  }
  if (run.region === 8) return Math.round((run.battleIndex < 4 ? ELITE_HP : KINGPIN_HP) * d);
  const base = BASE_HP[run.region] * d;
  const m = kind === 'wild' ? 1 : kind === 'trainer' ? 1.5 : 2;
  return Math.round(base * m);
}

/** Pips that fit a region's tier band, for wild encounters and trainer parties. */
export function poolForRegion(region: number, type?: PType) {
  const minTier = [2, 2, 4, 5, 6, 7, 8, 9][Math.min(region, 7)];
  const maxTier = [7, 8, 9, 10, 11, 12, 13, 14][Math.min(region, 7)];
  return SPECIES.filter((s) => s.tier >= minTier && s.tier <= maxTier && (!s.legendary || region >= 6) && (!type || s.types.includes(type)));
}

function partyOf(rng: Rng, region: number, types: PType[], n: number, prefFinal: boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = rng.pick(types);
    let pool = poolForRegion(region, t);
    if (prefFinal) pool = pool.filter((s) => s.final).length >= 2 ? pool.filter((s) => s.final) : pool;
    if (pool.length === 0) pool = SPECIES.filter((s) => s.types.includes(t));
    if (pool.length === 0) pool = SPECIES;
    out.push(rng.pick(pool).id);
  }
  return out;
}

export function makeWild(run: RunState, rng: Rng): Opponent {
  const pool = poolForRegion(run.region);
  const sp = rng.pick(pool);
  return {
    kind: 'wild', id: sp.id, name: sp.id, title: 'wild', types: sp.types,
    hp: baseHpFor(run, 'wild'), party: [sp.id], reward: run.difficulty === 'normal' ? 3 : 0,
  };
}

/** First names for Challengers. The list length matters for seeded runs, so keep it at 15. */
const TRAINER_NICKS = 15;

export function makeTrainer(run: RunState, rng: Rng): Opponent {
  const cls = rng.pick(TRAINER_CLASSES);
  const type = rng.pick(cls.types);
  const nick = rng.int(TRAINER_NICKS);
  return {
    kind: 'trainer', id: cls.id, name: String(nick), title: 'trainer', types: [type],
    hp: baseHpFor(run, 'trainer'), party: partyOf(rng, run.region, [type], 2 + Math.min(3, Math.floor(run.region / 2)), false),
    portrait: cls.id, reward: 4,
  };
}

export function makeLeader(run: RunState, rng: Rng, id: string): Opponent {
  const l = leader(id);
  const kind: OpponentKind = l.region === 8 ? 'elite' : l.region === 9 ? 'kingpin' : l.region === 10 ? 'legend' : 'boss';
  let hp = baseHpFor(run, kind);
  let rule: RuleId = l.rule;
  let ruleLeader = l.id;
  if (kind === 'legend') {
    const pool = LEADERS.filter((x) => x.region === 8 || x.region === 9);
    const pick = rng.pick(pool);
    rule = pick.rule; ruleLeader = pick.id;
  }
  if (rule === 'bighp' || rule === 'pride' || rule === 'purge') hp = Math.round(hp * 1.5);
  if (rule === 'bulk') hp = Math.round(hp * 1.75);
  if (rule === 'oneshot') hp = Math.round(hp * 0.45);
  if (rule === 'spectacle') hp = Math.round(hp * 2);
  const partyTypes: PType[] = kind === 'kingpin' || kind === 'legend' ? ['normal', 'fire', 'water', 'grass', 'psychic', 'dragon', 'electric', 'rock'] : [l.type];
  return {
    kind, id: l.id, name: l.id, title: kind,
    types: [l.type], hp, ruleId: rule, ruleFrom: ruleLeader,
    party: partyOf(rng, Math.max(run.region, kind === 'boss' ? run.region : 7), partyTypes, kind === 'boss' ? 3 + Math.floor(run.region / 3) : 6, true),
    portrait: l.id, reward: kind === 'boss' ? 5 : kind === 'elite' ? 8 : 10,
  };
}

// ---- display helpers (names resolved through the active ContentPack) ----

export function opponentName(o: Opponent): string {
  if (o.kind === 'wild') return `Wild ${species(o.id).name}`;
  if (o.kind === 'trainer') return `${T.trainer(o.id)} ${T.trainerNick(Number(o.name))}`;
  return T.leader(o.id).name;
}

export function opponentTitle(o: Opponent): string {
  const t = T.terms;
  return { wild: `${t.wild} Encounter`, trainer: t.trainer, boss: t.boss, elite: t.elite, kingpin: t.kingpin, legend: t.legend }[o.kind];
}

/** "Rule Name: rule text", or undefined for wild/trainer battles. */
export function opponentRule(o: Opponent): string | undefined {
  if (!o.ruleId) return undefined;
  const from = o.ruleFrom ?? o.id;
  return `${T.leader(from).ruleName}: ${RULE_TEXT[o.ruleId as RuleId].replace(/¤/g, T.terms.currency)}`;
}

export function isBossKind(kind: OpponentKind): boolean {
  return kind !== 'wild' && kind !== 'trainer';
}
