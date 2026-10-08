// Builds scripts/art-prompts.json from the default content pack: one entry per art asset
// (Pip front/back, portraits, icons, backdrops, logo, favicon) plus a shared style preamble.
// Run after changing Pip looks or names:  pnpm exec tsx scripts/build-art-prompts.ts
import { writeFileSync } from 'node:fs';
import { DEFAULT_PACK } from '../src/content/default';
import { PORTRAIT_LOOKS } from '../src/content/default/leaders';
import { SPECIES } from '../src/game/pips';
import { LEADERS, TRAINER_CLASSES } from '../src/game/opponents';
import { typeName } from '../src/game/typechart';

const P = DEFAULT_PACK;

const STYLE = {
  preamble:
    'Original pixel-art game sprite in a 16-bit handheld RPG style. Crisp square pixels, a 1px dark outline, a limited palette of about 16 colors, ' +
    'soft cel shading lit from the top left, readable silhouette, centered subject, no text, no letters, no watermark, no border, no ground shadow.',
  negative:
    'text, letters, logo, watermark, frame, border, blurry, anti-aliased, photorealistic, 3d render, gradient background, ' +
    'resembling any existing game, anime or franchise character',
  notes: [
    'Sizes are final output sizes in pixels. Backends may render larger and downscale.',
    'Shiny variants are not generated: the game shifts the palette in code.',
    'Pip art should match each entry\'s description; keep designs original and avoid echoing any existing franchise.',
  ],
};

interface Asset { id: string; kind: string; key: string; output: string; size: [number, number]; transparent: boolean; prompt: string }
const assets: Asset[] = [];
const add = (kind: string, key: string, size: [number, number], transparent: boolean, prompt: string, ext = 'webp') =>
  assets.push({ id: key.replace(/\//g, '-'), kind, key, output: `public/art/${key}.${ext}`, size, transparent, prompt });

const STAGE = ['small, young first form', 'mid-sized second form', 'large, fully grown final form'];
for (const s of SPECIES) {
  const e = P.pips[s.id];
  const types = s.types.map(typeName).join('/');
  const base = `${e.look}. A creature called ${e.name} (${e.genus}, ${types} type), ${STAGE[s.stage]}${s.legendary ? ', rare and majestic' : ''}. ` +
    `Main color ${e.color}. Personality: ${e.motion}.`;
  add('pip-front', `pips/${s.id}`, [96, 96], true, `${base} Battle sprite seen from a three-quarter front view, facing the viewer, full body, transparent background.`);
  add('pip-back', `pips/${s.id}-back`, [96, 96], true, `${base} Rear battle sprite of the same creature as the attached front sprite (match its design, colors and proportions exactly). Seen from BEHIND: its back faces the viewer and it looks away, toward the upper right, as if facing an opponent; its face is hidden or only slightly visible in profile. Full body, transparent background.`);
}

const leaderType = new Map(LEADERS.map((l) => [l.id, l.type]));
for (const [id, l] of Object.entries(P.leaders)) {
  const t = leaderType.get(id);
  add('portrait', `portraits/${id}`, [128, 128], false,
    `Character portrait, bust shot facing the viewer, expressive face: ${l.look}. Named ${l.name}, a card-table champion whose signature rule is "${l.ruleName}". ` +
    `Simple background tinted ${t ? `for the ${typeName(t)} element` : 'in deep casino green'}.`);
}
for (const c of TRAINER_CLASSES) {
  add('portrait', `portraits/${c.id}`, [128, 128], false, `Character portrait, bust shot facing the viewer: ${PORTRAIT_LOOKS[c.id] ?? c.id}. A ${P.trainers[c.id]}. Simple tinted background.`);
}
add('portrait', 'portraits/clerk', [128, 128], false, `Character portrait, bust shot facing the viewer: ${PORTRAIT_LOOKS.clerk}. Background: a cozy market stall with lanterns.`);

const icon = (id: string, what: string) => add('icon', `icons/${id}`, [48, 48], true, `Game item icon of ${what}, single object, centered, transparent background.`);
for (const [id, n] of Object.entries(P.items)) icon(id, `"${n}"`);
for (const [id, n] of Object.entries(P.consumables)) {
  if (id.startsWith('dye_')) icon(id, `a small glass bottle of ${typeName(id.slice(4) as never)}-themed dye`);
  else if (id.startsWith('ribbon_')) icon(id, `a ${n.toLowerCase()} rosette`);
  else icon(id, `"${n}", a consumable`);
}
icon('book', `a ${P.terms.book.toLowerCase()} with a bookmark (used for every hand type)`);
for (const [id, n] of Object.entries(P.keyItems)) icon(id, `"${n}", a key item`);
for (const [id, n] of Object.entries(P.fruits)) icon(id, `"${n}", a stylized fruit`);
for (const [id, n] of Object.entries(P.packs)) icon(id, id.includes('lantern') ? `"${n}", a glowing paper lantern used to catch creatures` : `"${n}", a booster pack or box`);
icon('fossil', 'a fossil stone with a spiral shell imprint');

const SCENES: Record<string, string> = {
  fernreach: 'rolling green meadows, ferns and a bright morning sky',
  lanternport: 'a harbor town at sunset with paper lanterns strung over the water',
  cinderisles: 'volcanic islands with glowing lava streams and dark sand',
  frostmere: 'a frozen lake surrounded by snowy pines under a pale sky',
  neonbasin: 'a desert basin at night lit by neon signs and stars',
  gildedcoast: 'a golden beach boardwalk with palm trees and a warm sky',
  sunreef: 'a tropical lagoon with coral reefs and turquoise water',
  moorhaven: 'foggy moorland with standing stones and grey clouds',
  grandtable: 'a grand casino hall with velvet curtains, chandeliers and a giant card table',
  highstakes: 'a windswept mountain summit at night under a starry sky',
  title: 'a dark green card-table felt landscape with distant hills and stars',
};
for (const [id, d] of Object.entries(SCENES)) {
  add('backdrop', `backdrops/${id}`, [480, 270], false, `Wide pixel-art landscape background, no characters, no creatures: ${d}. Dithered sky, layered parallax hills.`);
}
add('logo', 'logo', [640, 240], true, 'Game logo wordmark reading exactly "POCKET ACES" in chunky golden pixel letters with a dark outline, two fanned playing cards (an ace of spades and an ace of hearts) behind the text, transparent background.');
add('favicon', 'favicon', [32, 32], true, 'Tiny 32x32 pixel icon of a single ace of spades playing card, high contrast, transparent background.');

// one asset per line keeps diffs readable
const head = JSON.stringify({ version: 1, style: STYLE, count: assets.length }, null, 2).replace(/\n}$/, '');
writeFileSync('scripts/art-prompts.json', `${head},\n  "assets": [\n${assets.map((x) => '    ' + JSON.stringify(x)).join(',\n')}\n  ]\n}\n`);
console.log(`wrote scripts/art-prompts.json (${assets.length} assets)`);
