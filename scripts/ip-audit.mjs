// IP audit: fails if any tracked text file (or file path) matches the blocklist of third-party
// franchise terms. Excluded: the optional pack importer, its id mapping, and this script (which has to
// contain the list). Usage: pnpm ip-audit
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EXCLUDE = new Set(['scripts/import-pack.mjs', 'scripts/import-pack/pokeapi-map.json', 'scripts/ip-audit.mjs']);

// Matched as substrings (case-insensitive). "poke"/"poké" as a word prefix, except "poker" and the
// PokeAPI data source named by the optional importer docs.
const PATTERNS = [
  /pok[eé]mon/i, /pokermon/i, /pok[eé]dex/i, /\bpok[eé](?!r|api)/i,
  /team rocket/i, /\bsilph\b/i, /game ?freak/i, /\bnintendo\b/i, /nuzlocke/i, /gym leader/i, /elite four/i,
];

const SPECIES = [
  'bulbasaur', 'ivysaur', 'venusaur', 'charmander', 'charmeleon', 'charizard', 'squirtle', 'wartortle', 'blastoise', 'caterpie',
  'metapod', 'butterfree', 'weedle', 'kakuna', 'beedrill', 'pidgey', 'pidgeotto', 'pidgeot', 'rattata', 'raticate',
  'spearow', 'fearow', 'ekans', 'arbok', 'pikachu', 'raichu', 'sandshrew', 'sandslash', 'nidoran', 'nidorina',
  'nidoqueen', 'nidorino', 'nidoking', 'clefairy', 'clefable', 'vulpix', 'ninetales', 'jigglypuff', 'wigglytuff', 'zubat',
  'golbat', 'oddish', 'gloom', 'vileplume', 'paras', 'parasect', 'venonat', 'venomoth', 'diglett', 'dugtrio',
  'meowth', 'persian', 'psyduck', 'golduck', 'mankey', 'primeape', 'growlithe', 'arcanine', 'poliwag', 'poliwhirl',
  'poliwrath', 'abra', 'kadabra', 'alakazam', 'machop', 'machoke', 'machamp', 'bellsprout', 'weepinbell', 'victreebel',
  'tentacool', 'tentacruel', 'geodude', 'graveler', 'golem', 'ponyta', 'rapidash', 'slowpoke', 'slowbro', 'magnemite',
  'magneton', "farfetch'?d", 'doduo', 'dodrio', 'seel', 'dewgong', 'grimer', 'muk', 'shellder', 'cloyster',
  'gastly', 'haunter', 'gengar', 'onix', 'drowzee', 'hypno', 'krabby', 'kingler', 'voltorb', 'electrode',
  'exeggcute', 'exeggutor', 'cubone', 'marowak', 'hitmonlee', 'hitmonchan', 'lickitung', 'koffing', 'weezing', 'rhyhorn',
  'rhydon', 'chansey', 'tangela', 'kangaskhan', 'horsea', 'seadra', 'goldeen', 'seaking', 'staryu', 'starmie',
  'mr\\.? ?mime', 'scyther', 'jynx', 'electabuzz', 'magmar', 'pinsir', 'tauros', 'magikarp', 'gyarados', 'lapras',
  'ditto', 'eevee', 'vaporeon', 'jolteon', 'flareon', 'porygon', 'omanyte', 'omastar', 'kabuto', 'kabutops',
  'aerodactyl', 'snorlax', 'articuno', 'zapdos', 'moltres', 'dratini', 'dragonair', 'dragonite', 'mewtwo', 'mew',
];

// Leaders from the original opponents table. Names that are also everyday words or common first names
// (Red, Blue, Clay, Lance, Misty, Norman, Bruno, Leon, Bea, Morty, Surge) are left out: on their own they
// aren't franchise-specific and would block ordinary words like colors.
const LEADERS = [
  'brock', 'lt\\.? surge', 'bugsy', 'whitney', 'brawly', 'flannery', 'gardenia', 'maylene', 'candice', 'burgh', 'skyla',
  'korrina', 'valerie', 'olympia', 'nanu', 'hapu', 'kiawe', 'raihan', 'piers', 'lorelei', 'agatha', 'cynthia',
];

const REGIONS = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'mt\\.? silver'];

const ITEMS = [
  'rare candy', 'master ball', 'great ball', 'ultra ball', 'dusk ball', 'gs ball', 'choice (band|scarf|specs)', 'everstone', 'eviolite',
  'exp\\.? (share|all|candy)', 'lucky egg', 'focus (sash|band)', 'life orb', 'king.s rock', 'quick claw', 'scope lens', 'assault vest',
  'amulet coin', 'macho brace', 'dowsing machine', 'escape rope', 'smoke ball', 'bright powder', 'wide lens', 'expert belt',
  'weather rock', 'prism scale', 'shed shell', 'dubious disc', 'mega stone', 'z-ring', 'dynamax', 'gigantamax', 'rainbow wing',
  '(fire|water|thunder|leaf|moon|ice|dusk|dawn) stone', 'rotom', 'silph scope', 'oak.s parcel', 'bill.s pc', 'hp up',
  '(sitrus|oran|lum|leppa|pecha|rawst|aspear|chesto|cheri|persim|figy|wiki|mago|aguav|iapapa|razz|bluk|nanab|wepear|enigma|salac|rowap) berry',
  'thick fat', 'huge power', 'super luck', 'protean', 'hyper beam', 'giga impact', 'tri attack', 'double kick', 'fire blast',
];

const word = (s) => new RegExp(`\\b${s}\\b`, 'i');
const RULES = [
  ...PATTERNS.map((re) => ({ re, label: re.source })),
  ...[...SPECIES, ...LEADERS, ...REGIONS, ...ITEMS].map((s) => ({ re: word(s), label: s })),
];

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const hits = [];
for (const f of files) {
  if (EXCLUDE.has(f)) continue;
  for (const { re, label } of RULES) if (re.test(f)) hits.push(`${f}: path matches /${label}/`);
  let text;
  try { text = readFileSync(f); } catch { continue; } // deleted in the working tree
  if (text.includes(0)) continue; // binary
  const lines = text.toString('utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, label } of RULES) {
      const m = line.match(re);
      if (m) hits.push(`${f}:${i + 1}: "${m[0]}" (/${label}/)  ${line.trim().slice(0, 120)}`);
    }
  });
}

if (hits.length) {
  console.error(hits.join('\n'));
  console.error(`\nip-audit: ${hits.length} match(es) in ${new Set(hits.map((h) => h.split(':')[0])).size} file(s)`);
  process.exit(1);
}
console.log(`ip-audit: clean (${files.length - EXCLUDE.size} tracked files, ${RULES.length} rules)`);
