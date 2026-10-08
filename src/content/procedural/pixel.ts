// Tiny pixel-grid toolkit for procedural placeholder art. Everything renders to SVG data URLs,
// so the art drops into any <img> and needs no files on disk.

/** Deterministic 32-bit PRNG (mulberry32) seeded from a string. */
export function seeded(key: string): () => number {
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A palette-indexed grid. 0 = transparent; other values index into `palette`. */
export class Grid {
  readonly cells: Uint8Array;
  constructor(readonly w: number, readonly h: number) { this.cells = new Uint8Array(w * h); }
  get(x: number, y: number): number { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.cells[y * this.w + x]; }
  set(x: number, y: number, v: number): void { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y * this.w + x] = v; }
  /** Fill an ellipse (center + radii in cells). */
  ellipse(cx: number, cy: number, rx: number, ry: number, v: number): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, v);
      }
    }
  }
  rect(x0: number, y0: number, w: number, h: number, v: number): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(Math.round(x), Math.round(y), v);
  }
  /** Thick line between two points. */
  line(x0: number, y0: number, x1: number, y1: number, r: number, v: number): void {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) { const t = i / n; this.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, v); }
  }
  /** Copy the left half onto the right half (horizontal symmetry). */
  mirror(): void {
    const half = Math.floor(this.w / 2);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < half; x++) this.cells[y * this.w + (this.w - 1 - x)] = this.cells[y * this.w + x];
  }
  /** Paint `v` on every transparent cell that touches a non-transparent cell (an outline). */
  outline(v: number): void {
    const src = this.cells.slice();
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : src[y * this.w + x]);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (src[y * this.w + x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) this.cells[y * this.w + x] = v;
    }
  }
  /** Replace `from` with `to` where `pred` holds. */
  recolor(from: number, to: number, pred: (x: number, y: number) => boolean): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.cells[y * this.w + x] === from && pred(x, y)) this.cells[y * this.w + x] = to;
  }
  bounds(): { x0: number; y0: number; x1: number; y1: number } {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.cells[y * this.w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  }
}

/** Render a grid to an SVG string. Horizontal runs are merged into single rects. */
export function gridSvg(g: Grid, palette: string[], opts: { pad?: number; bg?: string } = {}): string {
  const pad = opts.pad ?? 0;
  const parts: string[] = [];
  for (let y = 0; y < g.h; y++) {
    let x = 0;
    while (x < g.w) {
      const v = g.get(x, y);
      if (!v) { x++; continue; }
      let e = x + 1;
      while (e < g.w && g.get(e, y) === v) e++;
      parts.push(`<rect x="${x + pad}" y="${y + pad}" width="${e - x}" height="1" fill="${palette[v]}"/>`);
      x = e;
    }
  }
  const W = g.w + pad * 2, H = g.h + pad * 2;
  const bg = opts.bg ? `<rect width="${W}" height="${H}" fill="${opts.bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" shape-rendering="crispEdges">${bg}${parts.join('')}</svg>`;
}

export function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---- colour helpers ----

export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Shift a hex colour's hue/saturation/lightness. */
export function shade(hex: string, dl: number, dh = 0, ds = 0): string {
  const [h, s, l] = hexToHsl(hex);
  return hsl(h + dh, s + ds, l + dl);
}
