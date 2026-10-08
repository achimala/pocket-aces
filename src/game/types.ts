// Core game types for Pocket Aces. Pure data; no React imports anywhere in src/game.

export type PType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' | 'fighting' | 'poison' | 'ground'
  | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export const ALL_TYPES: PType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

export interface Species {
  id: string; // creature slot c001..c151
  readonly name: string; // resolved from the active ContentPack
  types: PType[];
  stage: number; // 0 basic, 1, 2
  family: string; // root slot id
  evolvesTo: string[];
  final: boolean;
  tier: number; // 2..14 (J=11 Q=12 K=13 A=14)
  bst: number;
  readonly genus: string;
  readonly flavor: string;
  legendary: boolean;
}

export type Ability = 'padded' | 'mighty' | 'steadfast' | 'chameleon' | 'volatile' | 'scavenger' | 'lucky' | 'fossil';
export type Edition = 'foil' | 'holo' | 'shiny' | 'shadow';
export type Ribbon = 'gold' | 'ruby' | 'sapphire' | 'amethyst';

export interface Card {
  uid: string;
  speciesId: string;
  ability?: Ability;
  edition?: Edition;
  ribbon?: Ribbon;
  bonusPower: number; // permanent additions (Ankle Weights)
  typeOverride?: PType[]; // from Dyes
  // per-battle transient flags (cleared when a battle ends)
  faceDown?: boolean;
  frozen?: boolean;
  tired?: boolean; // played earlier this battle (boss rule)
}

export type HandType =
  | 'high' | 'pair' | 'twopair' | 'three' | 'straight' | 'flush' | 'fullhouse'
  | 'four' | 'straightflush' | 'five' | 'flushhouse' | 'flushfive';

export const HAND_ORDER: HandType[] = [
  'flushfive', 'flushhouse', 'five', 'straightflush', 'four', 'fullhouse', 'flush', 'straight', 'three', 'twopair', 'pair', 'high',
];

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface ItemInstance {
  uid: string;
  defId: string;
  variant?: PType; // typed items (boosters / sigils)
  edition?: Edition;
  eternal?: boolean;
  state: Record<string, number>; // per-instance counters (mult gained, sell bonus, uses left...)
  sellValue: number;
  disabled?: boolean; // boss effects
  faceDown?: boolean;
}

export type ConsumableKind = 'tonic' | 'book' | 'relic';

export interface ConsumableInstance {
  uid: string;
  kind: ConsumableKind;
  defId: string;
  edition?: Edition; // shadow = takes no slot
}

export type OpponentKind = 'wild' | 'trainer' | 'boss' | 'elite' | 'kingpin' | 'legend';

export interface Opponent {
  kind: OpponentKind;
  id: string; // slot id for wild, trainer class id, leader id
  name: string;
  title: string; // "Pit Boss", "Wild", "Challenger" ...
  types: PType[];
  hp: number;
  party: string[]; // slot ids shown as the party
  ruleId?: string; // boss rule id (see RULE_TEXT)
  ruleFrom?: string; // leader whose rule this is (the endless Legend borrows one)
  portrait?: string; // portrait id (leader or trainer class)
  reward: number;
}

export interface BattleState {
  opponent: Opponent;
  hp: number; // current target (can grow with some boss rules)
  damage: number;
  handsLeft: number;
  discardsLeft: number;
  handSize: number;
  drawPile: string[];
  hand: string[];
  discardPile: string[];
  played: string[]; // cards currently on the table (last played)
  lastHandType?: HandType;
  handTypesPlayed: HandType[];
  firstHandType?: HandType;
  attacksPlayed: number;
  selected: string[];
  bossDisabled: boolean; // Music Box
  weather?: PType;
  playedThisBattle: string[]; // uids (boss rule)
  log: string[];
  won?: boolean;
  lost?: boolean;
  sashUsed?: boolean;
}

export type PackKind = 'lantern' | 'brightlantern' | 'grandlantern' | 'tonickit' | 'bigtonickit' | 'bookstack' | 'bookcrate' | 'mysterybox' | 'bigmysterybox';

export interface ShopCard {
  uid: string;
  kind: 'item' | 'consumable' | 'pip';
  item?: ItemInstance;
  consumable?: ConsumableInstance;
  card?: Card;
  price: number;
  sold?: boolean;
}

export interface ShopState {
  cards: ShopCard[];
  packs: { uid: string; kind: PackKind; price: number; sold?: boolean }[];
  keyItems: { id: string; price: number; sold?: boolean }[];
  rerollCost: number;
  rerolls: number;
  free?: boolean; // Freeroll Fig
}

export interface PackState {
  kind: PackKind;
  picksLeft: number;
  choices: { uid: string; card?: Card; consumable?: ConsumableInstance; item?: ItemInstance }[];
  free?: boolean;
}

export type Phase = 'select' | 'battle' | 'cashout' | 'shop' | 'pack' | 'gameover' | 'win';

export interface RunStats {
  handsPlayed: number;
  cardsPlayed: number;
  cardsDiscarded: number;
  bestDamage: number;
  bestHand?: HandType;
  pipsCaught: number;
  moneyEarned: number;
  battlesWon: number;
  skips: number;
  itemsBought: number;
}

export type Difficulty = 'normal' | 'hard' | 'ironman';

export interface RunState {
  version: number;
  seed: string;
  rng: number; // rng cursor
  starter: string;
  difficulty: Difficulty;
  phase: Phase;
  region: number; // 0..7 regions, 8 = League, 9 = the endless summit
  battleIndex: number; // 0 wild, 1 trainer, 2 boss; in league: 0..3 elite, 4 kingpin
  leagueRound: number; // endless rematch count
  money: number;
  handsBase: number;
  discardsBase: number;
  handSizeBase: number;
  itemSlots: number;
  bagSlots: number;
  deck: Card[];
  items: ItemInstance[];
  bag: ConsumableInstance[];
  keyItems: string[];
  fruits: string[];
  handLevels: Record<HandType, number>;
  handPlays: Record<HandType, number>;
  leaders: string[]; // Pit Boss id per region
  champion: string;
  eliteOrder: string[];
  badges: string[];
  battle?: BattleState;
  shop?: ShopState;
  pack?: PackState;
  pendingFruitPacks: PackKind[];
  previewOpponents?: Opponent[]; // current region's three opponents
  skippedThisRegion: boolean[];
  stats: RunStats;
  lastUsedConsumable?: string;
  bossRerolledThisRegion: boolean;
  endless: boolean;
  cashout?: { lines: { label: string; amount: number }[]; total: number };
  toast?: string;
  interestCap: number;
  unlockQueue: string[];
}

export interface Profile {
  unlockedStarters: string[];
  wins: Record<string, number>;
  losses: Record<string, number>;
  bestDamage: number;
  mostBadges: number;
  discovered: Record<string, true>; // item ids, consumable ids, key items, fruits
  dex: Record<string, { caught: number; shiny?: boolean }>;
  handPlays: Record<string, number>;
  fiveOfAKind?: boolean;
  startersWon: string[];
  difficultyWins: Record<string, Difficulty[]>;
  runsStarted: number;
}
