// Optional pack loader. Pulls third-party data and sprites into public/packs/<source>/ (gitignored) and
// registers the pack in public/packs/index.json, where the game picks it up (Settings → Content pack).
// Nothing it downloads is part of this project or covered by its license.
//
//   pnpm import-pack pokeapi [--force] [--no-sprites]
//
// Sources:
//   pokeapi   names, flavor text and sprites for the 151 Pip slots and for items, from PokeAPI
//             (https://pokeapi.co, sprites from https://github.com/PokeAPI/sprites). The id mapping lives
//             in scripts/import-pack/pokeapi-map.json. JSON comes from the live API, falling back to the
//             static mirror (PokeAPI/api-data on GitHub) when the API is unreachable.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PACKS = path.join(ROOT, 'public/packs');
const argv = process.argv.slice(2);
const source = argv.find((a) => !a.startsWith('--'));
const force = argv.includes('--force');
const withSprites = !argv.includes('--no-sprites');

const SOURCES = { pokeapi: importPokeapi };
if (!source || !SOURCES[source]) {
  console.error(`usage: pnpm import-pack <${Object.keys(SOURCES).join('|')}> [--force] [--no-sprites]`);
  process.exit(1);
}

console.log('Note: imported assets belong to their rights holders, are not part of this project and are not');
console.log('covered by its license. You are responsible for whether your use is permitted.\n');

// ---- helpers ----
async function exists(f) { try { await fs.access(f); return true; } catch { return false; } }

async function fetchRetry(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res;
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 600 * i));
    }
  }
}

async function download(url, dest) {
  if (!force && (await exists(dest))) return true;
  const res = await fetchRetry(url).catch(() => null);
  if (!res) return false;
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

async function registerPack(id, label) {
  const file = path.join(PACKS, 'index.json');
  let idx = { packs: [] };
  try { idx = JSON.parse(await fs.readFile(file, 'utf8')); } catch { /* new index */ }
  idx.packs = [...idx.packs.filter((p) => p.id !== id), { id, label, manifest: `/packs/${id}/manifest.json` }];
  await fs.writeFile(file, JSON.stringify(idx, null, 1) + '\n');
}

// ---- PokeAPI ----
async function importPokeapi() {
  const ID = 'pokeapi';
  const OUT = path.join(PACKS, ID);
  const map = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/import-pack/pokeapi-map.json'), 'utf8'));
  const LIVE = process.env.POKEAPI_BASE ?? 'https://pokeapi.co/api/v2';
  const MIRROR = 'https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2';
  const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
  let useMirror = false;
  let itemIds = null; // slug -> numeric id, for the mirror (which is keyed by id)

  async function api(kind, key) {
    if (!useMirror) {
      try {
        const res = await fetchRetry(`${LIVE}/${kind}/${key}/`, 1);
        return res ? await res.json() : null;
      } catch {
        if (!useMirror) console.log('  live API unreachable, using the static mirror on GitHub');
        useMirror = true;
      }
    }
    if (typeof key === 'string' && kind === 'item') {
      if (!itemIds) {
        const idx = await (await fetchRetry(`${MIRROR}/item/index.json`)).json();
        itemIds = new Map(idx.results.map((r) => [r.name, r.url.split('/').filter(Boolean).pop()]));
      }
      key = itemIds.get(key);
      if (!key) return null;
    }
    const res = await fetchRetry(`${MIRROR}/${kind}/${key}/index.json`);
    return res ? res.json() : null;
  }
  const en = (arr, field = 'name') => arr?.find((x) => x.language?.name === 'en')?.[field];
  const clean = (s) => (s ?? '').replace(/[\f\n\r­]+/g, ' ').replace(/\s+/g, ' ').trim();

  await fs.mkdir(OUT, { recursive: true });
  const pips = {};
  const slots = Object.entries(map.pips);
  console.log(`species: ${slots.length}`);
  await pool(slots, 6, async ([slot, n]) => {
    const s = await api('pokemon-species', n);
    if (!s) { console.warn(`  missing species ${n}`); return; }
    const flavors = (s.flavor_text_entries ?? []).filter((f) => f.language?.name === 'en');
    const entry = { name: en(s.names), genus: en(s.genera, 'genus'), flavor: clean(flavors[flavors.length - 1]?.flavor_text) };
    if (withSprites) {
      const variants = [
        ['sprite', `pokemon/other/showdown/${n}.gif`, `pokemon/${n}.png`, `front/${slot}`],
        ['spriteShiny', `pokemon/other/showdown/shiny/${n}.gif`, `pokemon/shiny/${n}.png`, `front-shiny/${slot}`],
        ['back', `pokemon/other/showdown/back/${n}.gif`, `pokemon/back/${n}.png`, `back/${slot}`],
        ['backShiny', `pokemon/other/showdown/back/shiny/${n}.gif`, `pokemon/back/shiny/${n}.png`, `back-shiny/${slot}`],
      ];
      for (const [field, anim, still, file] of variants) {
        if (await download(`${SPRITES}/${anim}`, path.join(OUT, 'sprites', `${file}.gif`))) entry[field] = `/packs/${ID}/sprites/${file}.gif`;
        else if (await download(`${SPRITES}/${still}`, path.join(OUT, 'sprites', `${file}.png`))) entry[field] = `/packs/${ID}/sprites/${file}.png`;
      }
    }
    pips[slot] = entry;
    process.stdout.write('.');
  });
  console.log('');

  const items = {};
  const itemEntries = Object.entries(map.items);
  console.log(`items: ${itemEntries.length}`);
  await pool(itemEntries, 6, async ([id, slug]) => {
    const it = await api('item', slug);
    if (!it) { console.warn(`  missing item ${slug}`); return; }
    const entry = { name: en(it.names) ?? slug };
    if (withSprites && (await download(`${SPRITES}/items/${slug}.png`, path.join(OUT, 'items', `${id}.png`)))) entry.icon = `/packs/${ID}/items/${id}.png`;
    items[id] = entry;
    process.stdout.write('.');
  });
  console.log('');

  const manifest = {
    id: ID,
    label: 'PokeAPI (imported locally)',
    attribution: 'Names, text and sprites imported from PokeAPI (pokeapi.co). They belong to their rights holders and are not part of this project.',
    pips,
    items,
  };
  await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  await registerPack(ID, manifest.label);
  console.log(`wrote public/packs/${ID}/manifest.json (${Object.keys(pips).length} pips, ${Object.keys(items).length} items). Enable it in Settings.`);
}

await SOURCES[source]();
