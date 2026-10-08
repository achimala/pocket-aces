// Display names for the default Pocket Aces pack: everything except Pips and leaders.
// All names here are original to this project.
import type { Terms } from '../types';

export const TERMS: Terms = {
  game: 'Pocket Aces',
  pip: 'Pip',
  pips: 'Pips',
  dex: 'Field Guide',
  shop: 'Bazaar',
  boss: 'Pit Boss',
  bosses: 'Pit Bosses',
  crest: 'Crest',
  crests: 'Crests',
  elite: 'High Roller',
  kingpin: 'Kingpin',
  legend: 'The Stranger',
  wild: 'Wild',
  trainer: 'Challenger',
  league: 'The Grand Table',
  summit: 'High Stakes Peak',
  tonic: 'Tonic',
  tonics: 'Tonics',
  book: 'Playbook',
  books: 'Playbooks',
  relic: 'Relic',
  fruit: 'Fruit',
  fruits: 'Fruits',
  lantern: 'Lantern',
  currencyName: 'Chips',
  currency: '¢',
};

export const ITEM_NAMES: Record<string, string> = {
  goldenegg: 'Golden Egg', booster: 'Type Charm', sigil: 'Type Sigil', pairdice: "Pair o' Dice", matchingsocks: 'Matching Socks',
  triplescoop: 'Triple Scoop', doubledate: 'Double Date', straightedge: 'Straight Edge', paintbucket: 'Paint Bucket', tripod: 'Tripod',
  colorwheel: 'Color Wheel', babyrattle: 'Baby Rattle', diploma: 'Diploma', shortstack: 'Short Stack', muckpile: 'Muck Pile',
  allinchip: 'All-In Chip', luckyreel: 'Lucky Reel', readingglasses: 'Reading Glasses', eraser: 'Eraser', piggybank: 'Piggy Bank',
  goldtooth: 'Gold Tooth', moneyclip: 'Money Clip', deeppockets: 'Deep Pockets', icepop: 'Ice Pop', lemonstand: 'Lemonade Stand',
  tarpit: 'Tar Pit', tacklebox: 'Tackle Box', ankleweights: 'Ankle Weights', hotstreak: 'Hot Streak', tallycounter: 'Tally Counter',
  cheatsheet: 'Cheat Sheet', weathervane: 'Weathervane', mosaic: 'Mosaic Tile', nursery: 'Nursery', familytree: 'Family Tree',
  travellight: 'Travel Light', shortcut: 'Shortcut', diviningrod: 'Divining Rod', spotlight: 'Spotlight', loupe: "Jeweler's Loupe",
  openingbell: 'Opening Bell', safetynet: 'Safety Net', stopwatch: 'Stopwatch', binoculars: 'Binoculars', warpaint: 'War Paint',
  heavyarmor: 'Heavy Armor', fizzysoda: 'Fizzy Soda', jawbreaker: 'Jawbreaker', firecracker: 'Firecracker', studynotes: 'Study Notes',
  loadeddice: 'Loaded Dice', hairtrigger: 'Hair Trigger', pacifier: 'Pacifier', ovation: 'Standing Ovation', photocopier: 'Photocopier',
  participation: 'Participation Trophy', lastcall: 'Last Call', hailmary: 'Hail Mary', onetrick: 'One-Trick Pony', cursedidol: 'Cursed Idol',
  papercrown: 'Paper Crown', firststrike: 'First Strike', highfive: 'High Five', twinplush: 'Twin Plush', trioplush: 'Trio Plush',
  longplush: 'Long Plush', patchplush: 'Patchwork Plush', quadplush: 'Quad Plush', acesleeve: 'Ace Up the Sleeve', stampbook: 'Stamp Book',
  handmirror: 'Hand Mirror', musicbox: 'Music Box', goldenace: 'Golden Ace', replicator: 'Replicator', crestsash: 'Crest Sash',
};

const TYPE_WORD: Record<string, string> = {
  normal: 'Plain', fire: 'Ember', water: 'Ripple', grass: 'Leaf', electric: 'Spark', ice: 'Frost', fighting: 'Knuckle', poison: 'Venom',
  ground: 'Dust', flying: 'Gale', psychic: 'Mind', bug: 'Beetle', rock: 'Flint', ghost: 'Wisp', dragon: 'Wyrm', dark: 'Shade', steel: 'Iron', fairy: 'Glimmer',
};
const byType = (suffix: string) => Object.fromEntries(Object.entries(TYPE_WORD).map(([t, w]) => [t, `${w} ${suffix}`]));
export const TYPED_ITEMS = { booster: byType('Charm'), sigil: byType('Sigil') };

const TYPE_LABEL: Record<string, string> = {
  normal: 'Normal', fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric', ice: 'Ice', fighting: 'Fighting', poison: 'Poison',
  ground: 'Ground', flying: 'Flying', psychic: 'Psychic', bug: 'Bug', rock: 'Rock', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy',
};

export const CONSUMABLE_NAMES: Record<string, string> = {
  growthtonic: 'Growth Tonic', cushion: 'Cushion', spinach: 'Spinach', anchor: 'Anchor', horseshoe: 'Horseshoe', metaldetector: 'Metal Detector',
  chameleonpaint: 'Chameleon Paint', fuse: 'Short Fuse', petrify: 'Petrify Powder', releaseform: 'Release Form', mimicmask: 'Mimic Mask',
  luckycoin: 'Lucky Coin', polishkit: 'Polish Kit', tracingpaper: 'Tracing Paper', nightclass: 'Night Class', tonicsampler: 'Tonic Sampler',
  giftbox: 'Gift Box', wishinglantern: 'Wishing Lantern', elixir: 'Elixir', encyclopedia: 'Encyclopedia', paintstorm: 'Paint Storm',
  familyreunion: 'Family Reunion', clonevat: 'Clone Vat', eclipse: 'Eclipse', crucible: 'Crucible', firesale: 'Fire Sale',
  glitterbomb: 'Glitter Bomb', shootingstar: 'Shooting Star',
  ribbon_gold: 'Gold Ribbon', ribbon_ruby: 'Ruby Ribbon', ribbon_sapphire: 'Sapphire Ribbon', ribbon_amethyst: 'Amethyst Ribbon',
  ...Object.fromEntries(Object.entries(TYPE_LABEL).map(([t, l]) => [`dye_${t}`, `${l} Dye`])),
};

export const KEY_ITEM_NAMES: Record<string, string> = {
  scooter: 'Scooter', jetscooter: 'Jet Scooter', extrashelf: 'Extra Shelf', secondstall: 'Second Stall', loyaltycard: 'Loyalty Card',
  vipcard: 'VIP Card', chiptray: 'Chip Tray', chipvault: 'Chip Vault', sneakers: 'Sneakers', jetsneakers: 'Jet Sneakers',
  calmchime: 'Calm Chime', grandchime: 'Grand Chime', almanac: 'Almanac', worldalmanac: 'World Almanac', satchel: 'Satchel',
  duffel: 'Duffel Bag', tonicbelt: 'Tonic Belt', tonicbar: 'Tonic Bar', bookshelf: 'Bookshelf', library: 'Library Card',
  glossyclover: 'Glossy Clover', goldclover: 'Gold Clover', swapmeet: 'Swap Meet', grabbag: 'Grab Bag', roadatlas: 'Road Atlas',
  balloon: 'Hot-Air Balloon', pager: 'Pager', smartwatch: 'Smartwatch', parcel: 'Mystery Parcel', monocle: 'Monocle',
  toolbelt: 'Tool Belt', bottomlesscase: 'Bottomless Case',
};

export const FRUIT_NAMES: Record<string, string> = {
  doubleplum: 'Double Plum', freerollfig: 'Freeroll Fig', bumppumpkin: 'Bump Pumpkin', highmelon: 'High Melon', tinfoilpear: 'Tinfoil Pear',
  prismlime: 'Prism Lime', glintgrape: 'Glint Grape', duskdate: 'Dusk Date', spinquat: 'Spinquat', bighandbanana: 'Big Hand Banana',
  twinpeach: 'Twin Peach', mentorquince: 'Mentor Quince', bountylychee: 'Bounty Lychee', shufflestarfruit: 'Shuffle Starfruit',
  lanternlemon: 'Lantern Lemon', tonictangerine: 'Tonic Tangerine', pagepomelo: 'Page Pomelo', mysterymangosteen: 'Mystery Mangosteen',
  keylime: 'Key Lime', passionfruit: 'Passion Fruit', tipcoconut: 'Tip Coconut', giftgourd: 'Gift Gourd',
};

export const PACK_NAMES: Record<string, string> = {
  lantern: 'Lantern', brightlantern: 'Bright Lantern', grandlantern: 'Grand Lantern', tonickit: 'Tonic Kit', bigtonickit: 'Big Tonic Kit',
  bookstack: 'Book Stack', bookcrate: 'Book Crate', mysterybox: 'Mystery Box', bigmysterybox: 'Big Mystery Box',
};

export const ABILITY_NAMES: Record<string, string> = {
  padded: 'Padded', mighty: 'Mighty', steadfast: 'Steadfast', chameleon: 'Chameleon', volatile: 'Volatile', scavenger: 'Scavenger', lucky: 'Lucky', fossil: 'Fossil',
};

export const MOVE_NAMES: Record<string, string> = {
  high: 'Jab', pair: 'Double Tap', twopair: 'Two-Step', three: 'Triple Threat', straight: 'Running Start', flush: 'Tidal Rush',
  fullhouse: 'House Call', four: 'Quad Slam', straightflush: 'Royal Charge', five: 'Big Bang', flushhouse: 'Firestorm', flushfive: 'Final Verdict',
};

export const TRAINER_NAMES: Record<string, string> = {
  schoolkid: 'Schoolkid', socialite: 'Socialite', mothchaser: 'Moth Chaser', rambler: 'Rambler', angler: 'Angler', mystic: 'Mystic',
  brawler: 'Brawler', cardsharp: 'Cardsharp', prodigy: 'Prodigy', lifeguard: 'Lifeguard', falconer: 'Falconer', bookie: 'Bookie',
  medium: 'Medium', tinkerer: 'Tinkerer', rival: 'Rival',
};

/** First names for Challengers. Exactly 15 (seeded runs pick by index). */
export const TRAINER_NICKS = ['Milo', 'Juno', 'Tobin', 'Priya', 'Oskar', 'Lena', 'Dario', 'Wynn', 'Hattie', 'Ravi', 'Cleo', 'Ezra', 'Noor', 'Fitz', 'Ida'];

export const REGION_NAMES: Record<string, string> = {
  fernreach: 'Fernreach', lanternport: 'Lanternport', cinderisles: 'Cinder Isles', frostmere: 'Frostmere', neonbasin: 'Neon Basin',
  gildedcoast: 'Gilded Coast', sunreef: 'Sunreef', moorhaven: 'Moorhaven', grandtable: 'The Grand Table', highstakes: 'High Stakes Peak',
};

/** Starter deck perk and lean text. {cNNN} is replaced by a Pip name, ¤ by the currency symbol. */
export const DECK_TEXT: Record<string, { perk: string; lean: string }> = {
  sprout: { perk: 'Green Thumb: +1 discard every battle', lean: 'Grass / Poison' },
  ember: { perk: 'Kindling: +1 attack every battle', lean: 'Fire / Flying' },
  tide: { perk: 'High Tide: start with ¤10 extra', lean: 'Water / Rock' },
  spark: { perk: 'Live Wire: no interest, but ¤2 per unused attack and ¤1 per unused discard', lean: 'Electric / Normal' },
  prism: { perk: 'Adaptive: +1 Bag slot and 2 Chameleon Paints; a Growth Tonic on {c133} picks a random branch', lean: 'Normal, with three branching forms' },
  shade: { perk: 'Umbra: Relics can appear in the Bazaar; start with an Eclipse', lean: 'Ghost / Poison' },
  flop: { perk: 'Belly Flop: start with the Participation Trophy (every played card scores)', lean: '44 {c129}, 8 {c130}' },
  apex: { perk: 'Equilibrium: Power and Mult are balanced before every attack; all HP x2', lean: 'Psychic, high tiers' },
  mimic: { perk: 'Shapeshift: 13 random families, one per tier', lean: 'Random families every run' },
};

export const SHOP_LINES = [
  'Welcome! Stock up before the next battle.',
  'Fresh Pips, fresh trinkets!',
  'Growth Tonics are flying off the shelves.',
  'Did you know? Playbooks level up your hands.',
  'Need anything? Rerolls are cheap-ish.',
];
