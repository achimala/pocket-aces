// Turns a high-resolution "pixel-art style" image (what image models draw: big painted pixels, soft edges,
// tens of thousands of colors) into real pixel art: it finds the grid the model was drawing on, takes one
// color per cell, and snaps everything to a small palette. The result is meant to be shown at whole-number
// scales with nearest-neighbor filtering (see PixelBackdrop.tsx).
//
//   node scripts/pixelize.mjs in.png out.png [--colors 40] [--aspect 16:9] [--width 240]
import sharp from 'sharp';

/** Strength of the color edges between neighbouring columns (axis 'x') or rows (axis 'y'). */
function edgeProfile(data, w, h, axis) {
  const n = axis === 'x' ? w : h;
  const prof = new Float64Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const j = axis === 'x' ? (x > 0 ? i - 3 : -1) : (y > 0 ? i - w * 3 : -1);
      if (j < 0) continue;
      const d = Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]);
      prof[axis === 'x' ? x : y] += d;
    }
  }
  return prof;
}

/**
 * The grid pitch and offset that best line up with the edge profile. Multiples of the true pitch line up
 * just as well (they hit a subset of the same edges), so take the smallest pitch close to the best score.
 */
function findGrid(prof, minP = 2, maxP = 24) {
  const mean = prof.reduce((a, b) => a + b, 0) / prof.length || 1;
  const scored = [];
  for (let p = minP; p <= maxP; p += 0.05) {
    let best = 0, bestPhase = 0;
    for (let phase = 0; phase < p; phase += 0.25) {
      let s = 0, k = 0;
      for (let x = phase; x < prof.length; x += p) { s += prof[Math.round(x)] ?? 0; k++; }
      const m = s / k / mean;
      if (m > best) { best = m; bestPhase = phase; }
    }
    scored.push({ p, phase: bestPhase, score: best });
  }
  const top = Math.max(...scored.map((s) => s.score));
  return scored.find((s) => s.score >= top * 0.88);
}

/** A small palette for `px` (packed RGB triples): median cut, then a few k-means passes. Deterministic. */
function makePalette(px, k) {
  const n = px.length / 3;
  let boxes = [Array.from({ length: n }, (_, i) => i)];
  while (boxes.length < k) {
    // split the box with the widest channel range at its median
    let bi = -1, bc = 0, br = -1;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const j of b) { const v = px[j * 3 + c]; if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi - lo > br) { br = hi - lo; bi = i; bc = c; }
      }
    });
    if (bi < 0 || br <= 0) break;
    const b = boxes[bi].sort((x, y) => px[x * 3 + bc] - px[y * 3 + bc]);
    boxes.splice(bi, 1, b.slice(0, b.length >> 1), b.slice(b.length >> 1));
  }
  let pal = boxes.map((b) => [0, 1, 2].map((c) => b.reduce((a, j) => a + px[j * 3 + c], 0) / b.length));
  const nearest = (r, g, b) => { let bi = 0, bd = Infinity; pal.forEach((q, i) => { const d = (q[0] - r) ** 2 + (q[1] - g) ** 2 + (q[2] - b) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
  for (let it = 0; it < 6; it++) {
    const sum = pal.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) { const q = sum[nearest(px[i * 3], px[i * 3 + 1], px[i * 3 + 2])]; q[0] += px[i * 3]; q[1] += px[i * 3 + 1]; q[2] += px[i * 3 + 2]; q[3]++; }
    pal = pal.map((q, i) => (sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : q));
  }
  return { pal: pal.map((q) => q.map(Math.round)), nearest };
}

/**
 * `width` is the pixel-art canvas width the image was drawn for (the prompts ask for ~240); the grid search only
 * considers pitches that give 0.75x-1.35x that many columns, which keeps it off multiples of the real pitch.
 */
export async function pixelize(input, { colors = 40, aspect = 16 / 9, width = 240 } = {}) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const minP = Math.max(2, w / (width * 1.35)), maxP = w / (width * 0.75);
  const gx = findGrid(edgeProfile(data, w, h, 'x'), minP, maxP);
  const gy = findGrid(edgeProfile(data, w, h, 'y'), minP, maxP);
  // Pixels are square: use one pitch for both axes (the better-supported one), each axis keeps its own offset.
  const p = gx.score >= gy.score ? gx.p : gy.p;
  const cols = Math.floor((w - gx.phase) / p), rows = Math.floor((h - gy.phase) / p);
  const out = Buffer.alloc(cols * rows * 3);
  const vals = [[], [], []];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // median of the cell's inner half, so soft edges between cells don't leak in
      const x0 = Math.floor(gx.phase + (c + 0.25) * p), x1 = Math.max(x0 + 1, Math.floor(gx.phase + (c + 0.75) * p));
      const y0 = Math.floor(gy.phase + (r + 0.25) * p), y1 = Math.max(y0 + 1, Math.floor(gy.phase + (r + 0.75) * p));
      vals[0].length = vals[1].length = vals[2].length = 0;
      for (let y = y0; y < Math.min(y1, h); y++) for (let x = x0; x < Math.min(x1, w); x++) {
        const i = (y * w + x) * 3;
        vals[0].push(data[i]); vals[1].push(data[i + 1]); vals[2].push(data[i + 2]);
      }
      const o = (r * cols + c) * 3;
      for (let k = 0; k < 3; k++) { const v = vals[k].sort((a, b) => a - b); out[o + k] = v[v.length >> 1] ?? 0; }
    }
  }
  // snap to a small palette without dithering, then crop to the target aspect
  const { pal, nearest } = makePalette(out, colors);
  for (let i = 0; i < out.length; i += 3) { const q = pal[nearest(out[i], out[i + 1], out[i + 2])]; out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2]; }
  let cw = cols, ch = rows;
  if (cw / ch > aspect) cw = Math.round(ch * aspect); else ch = Math.round(cw / aspect);
  const png = await sharp(out, { raw: { width: cols, height: rows, channels: 3 } })
    .extract({ left: Math.floor((cols - cw) / 2), top: Math.floor((rows - ch) / 2), width: cw, height: ch })
    .png({ compressionLevel: 9 }).toBuffer();
  return { png, pitch: p, size: [cw, ch] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, outp, ...rest] = process.argv.slice(2);
  const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
  const [aw, ah] = opt('aspect', '16:9').split(':').map(Number);
  const r = await pixelize(inp, { colors: Number(opt('colors', 40)), aspect: aw / ah, width: Number(opt('width', 240)) });
  (await import('node:fs')).writeFileSync(outp, r.png);
  console.log(`${outp}: ${r.size.join('x')} (grid pitch ${r.pitch.toFixed(2)}px)`);
}
