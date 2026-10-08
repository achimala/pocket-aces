// Generates the game's art from scripts/art-prompts.json with a pluggable image backend, and writes
// public/art/manifest.json so the game uses the new files instead of its procedural placeholders.
//
//   node scripts/gen-art.mjs --backend <name|./path/to/backend.mjs> [options]
//
// Backends:
//   a1111    a local Automatic1111 / Forge server (A1111_URL, default http://127.0.0.1:7860)
//   openai   OpenAI Images API (OPENAI_API_KEY; OPENAI_IMAGE_MODEL, default gpt-image-1)
//   <path>   any ES module whose default export is
//            async ({ prompt, negative, width, height, transparent, asset }) => Uint8Array (PNG bytes),
//            e.g. ./scripts/art-backends/codex.mjs (a logged-in Codex CLI; crops and scales for you)
//
// Options:
//   --kind pip-front,icon   only these asset kinds      --only id,id   only these asset ids or keys
//   --limit N               stop after N new images      --force        regenerate existing files
//   --concurrency N         parallel requests (2)        --dry-run      print prompts, write nothing
//   --manifest-only         rebuild manifest.json from the files already in public/art
//
// Output sizes in the prompt file are targets; the a1111 and openai backends render larger and leave
// downscaling to you. Outputs ending in .webp are encoded from the backend's PNG. Shiny variants are a
// palette shift in code, never generated.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROMPTS = path.join(ROOT, 'scripts/art-prompts.json');
const ART_DIR = path.join(ROOT, 'public/art');
const MANIFEST = path.join(ART_DIR, 'manifest.json');

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const flag = (name) => argv.includes(`--${name}`);
const list = (name) => { const v = opt(name); return v ? new Set(v.split(',').map((s) => s.trim())) : null; };

const spec = JSON.parse(await fs.readFile(PROMPTS, 'utf8'));
const kinds = list('kind');
const only = list('only');
const limit = Number(opt('limit', Infinity));
const concurrency = Math.max(1, Number(opt('concurrency', 2)));
const force = flag('force');
const dryRun = flag('dry-run');

// Backends return PNG bytes; .webp outputs are re-encoded (quality 90 is visually lossless here and ~4x smaller).
const encode = (png, out) => (out.endsWith('.webp') ? sharp(png).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer() : png);

async function exists(f) { try { await fs.access(f); return true; } catch { return false; } }

async function writeManifest() {
  const files = {};
  for (const a of spec.assets) {
    const abs = path.join(ROOT, a.output);
    if (await exists(abs)) files[a.key] = path.relative(ART_DIR, abs).split(path.sep).join('/');
  }
  await fs.mkdir(ART_DIR, { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify({ generated: new Date().toISOString(), files }, null, 1) + '\n');
  console.log(`manifest: ${Object.keys(files).length} of ${spec.assets.length} assets present`);
}

if (flag('manifest-only')) { await writeManifest(); process.exit(0); }

// ---- backends ----
const b64 = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
const BACKENDS = {
  async a1111({ prompt, negative, width, height }) {
    const url = (process.env.A1111_URL ?? 'http://127.0.0.1:7860') + '/sdapi/v1/txt2img';
    const up = (n) => Math.max(512, Math.ceil(n / 64) * 64);
    const res = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, negative_prompt: negative, width: up(width), height: up(height), steps: Number(process.env.A1111_STEPS ?? 28), cfg_scale: 7 }),
    });
    if (!res.ok) throw new Error(`a1111 ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    return b64(j.images[0]);
  },
  async openai({ prompt, negative, width, height, transparent }) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    const size = width > height * 1.3 ? '1536x1024' : '1024x1024';
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1', prompt: `${prompt}\nAvoid: ${negative}`, size, background: transparent ? 'transparent' : 'opaque', n: 1 }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    return b64(j.data[0].b64_json);
  },
};

async function loadBackend(name) {
  if (BACKENDS[name]) return BACKENDS[name];
  const mod = await import(pathToFileURL(path.resolve(name)).href);
  if (typeof mod.default !== 'function') throw new Error(`${name} has no default export function`);
  return mod.default;
}

// ---- run ----
const backendName = opt('backend');
if (!backendName && !dryRun) {
  console.error('Pick a backend: --backend a1111 | openai | ./my-backend.mjs   (or --dry-run)');
  process.exit(1);
}
const generate = dryRun ? null : await loadBackend(backendName);

const todo = [];
for (const a of spec.assets) {
  if (kinds && !kinds.has(a.kind)) continue;
  if (only && !only.has(a.id) && !only.has(a.key)) continue;
  if (!force && (await exists(path.join(ROOT, a.output)))) continue;
  todo.push(a);
  if (todo.length >= limit) break;
}
console.log(`${todo.length} asset(s) to generate${dryRun ? ' (dry run)' : ` with ${backendName}`}`);

let next = 0, done = 0, failed = 0;
async function worker() {
  while (next < todo.length) {
    const a = todo[next++];
    const prompt = `${spec.style.preamble} ${a.prompt}`;
    if (dryRun) { console.log(`\n[${a.id}] ${a.output} ${a.size.join('x')}\n${prompt}`); continue; }
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const png = await generate({ prompt, negative: spec.style.negative, width: a.size[0], height: a.size[1], transparent: a.transparent, asset: a });
        const out = path.join(ROOT, a.output);
        await fs.mkdir(path.dirname(out), { recursive: true });
        await fs.writeFile(out, await encode(png, out));
        done++;
        console.log(`ok   ${a.id} (${done}/${todo.length})`);
        break;
      } catch (e) {
        if (attempt === 3) { failed++; console.error(`FAIL ${a.id}: ${e.message}`); }
        else await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
if (!dryRun) await writeManifest();
if (failed) { console.error(`${failed} failed`); process.exitCode = 1; }
