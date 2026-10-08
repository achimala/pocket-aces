// gen-art backend that drives a locally logged-in Codex CLI (`codex exec`) and its built-in image tool,
// so generation bills to the Codex/ChatGPT plan instead of an API key. Back sprites get their front sprite
// attached as a reference so both views show the same creature.
//
//   node scripts/gen-art.mjs --backend ./scripts/art-backends/codex.mjs --kind pip-front --limit 4
//
// CODEX_BIN (default codex), CODEX_IMAGES_DIR (default ~/.codex/generated_images), ART_SCALE (default 2:
// files are written at 2x the prompt size so they stay sharp on high-DPI screens).
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const CODEX = process.env.CODEX_BIN ?? 'codex';
const IMAGES = process.env.CODEX_IMAGES_DIR ?? path.join(os.homedir(), '.codex/generated_images');
const SCALE = Number(process.env.ART_SCALE ?? 2);

function shape(w, h) {
  if (w > h * 1.3) return `a wide landscape image (aspect ratio about ${(w / h).toFixed(2)}:1)`;
  if (h > w * 1.3) return 'a tall portrait image';
  return 'a square image';
}

function runCodex(prompt, images = []) {
  return new Promise((resolve, reject) => {
    const args = ['exec', '--json', '--skip-git-repo-check', '-s', 'read-only', ...images.flatMap((i) => ['-i', i]), '--', prompt];
    const p = spawn(CODEX, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => {
      const thread = out.match(/"thread_id":"([^"]+)"/)?.[1];
      if (code !== 0 || !thread) reject(new Error(`codex exited ${code}: ${err.trim().split('\n').pop()}`));
      else resolve(thread);
    });
  });
}

// Crop to content and fit to the bottom-centre (transparent assets) or cover-fit (opaque ones), then
// downscale to the target size.
async function postprocess(src, w, h, transparent) {
  if (!transparent) return sharp(src).resize(w, h, { fit: 'cover', kernel: 'lanczos3' }).removeAlpha().png().toBuffer();
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
  }
  if (x1 < 0) throw new Error('image is fully transparent');
  const fitW = Math.round(w * 0.92), fitH = Math.round(h * 0.92);
  const sprite = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(fitW, fitH, { fit: 'inside', kernel: 'lanczos3' }).png().toBuffer({ resolveWithObject: true });
  const { width: sw, height: sh } = sprite.info;
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sprite.data, left: Math.floor((w - sw) / 2), top: h - sh - Math.round(h * 0.04) }]).png().toBuffer();
}

export default async function codex({ prompt, negative, width, height, transparent, asset }) {
  const full = [
    'Use your image generation tool to create exactly one image, then reply with just DONE. Do not write or edit any files.',
    `Make ${shape(width, height)}${transparent ? ' with a fully transparent background' : ''}.`,
    `Image: ${prompt}`,
    `Avoid: ${negative}`,
  ].join('\n');
  // Back sprites are drawn from the matching front sprite so the two views stay the same creature.
  const front = asset.kind === 'pip-back' ? path.resolve(asset.output.replace(/-back(\.\w+)$/, '$1')) : null;
  const refs = front && (await fs.access(front).then(() => true, () => false)) ? [front] : [];
  const thread = await runCodex(full, refs);
  const dir = path.join(IMAGES, thread);
  const files = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.png'));
  if (!files.length) throw new Error(`codex made no image for ${asset.id}`);
  const stats = await Promise.all(files.map(async (f) => ({ f, t: (await fs.stat(path.join(dir, f))).mtimeMs })));
  const src = path.join(dir, stats.sort((a, b) => b.t - a.t)[0].f);
  return postprocess(src, width * SCALE, height * SCALE, transparent);
}
