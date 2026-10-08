// Procedural pixel icons for items, consumables, key items, fruits and packs.
import { Grid, gridSvg, seeded, shade, svgUrl, hsl } from './pixel';

export type IconShape = 'gem' | 'orb' | 'bottle' | 'book' | 'box' | 'coin' | 'star' | 'ring' | 'card' | 'key' | 'fruit' | 'lantern' | 'ribbon' | 'charm' | 'tag';

const N = 24;
const FILL = 1, DARK = 2, LIGHT = 3, OUT = 4, ACC = 5, SHINE = 6;

function draw(g: Grid, shape: IconShape, r: () => number): void {
  const c = N / 2;
  switch (shape) {
    case 'gem':
      for (let y = 0; y < 14; y++) { const w = y < 4 ? 4 + y * 1.5 : 10 - (y - 4) * 1; g.rect(c - w, 5 + y, w, 1, FILL); }
      g.rect(c - 6, 8, 6, 1, ACC); break;
    case 'orb':
      g.ellipse(c, c, 8, 8, FILL); g.ellipse(c - 3, c - 3, 2, 2, SHINE); g.rect(c - 8, c, 8, 1, ACC); break;
    case 'bottle':
      g.rect(c - 2, 2, 2, 3, ACC); g.rect(c - 2, 5, 2, 3, LIGHT); g.ellipse(c, 14, 7, 7, FILL); g.ellipse(c - 3, 12, 1.5, 2.5, SHINE); break;
    case 'book':
      g.rect(c - 8, 4, 8, 16, FILL); g.rect(c - 8, 4, 2, 16, DARK); g.rect(c - 5, 8, 5, 2, ACC); break;
    case 'box':
      g.rect(c - 8, 8, 8, 12, FILL); g.rect(c - 9, 6, 9, 3, LIGHT); g.rect(c - 1, 6, 1, 14, ACC); break;
    case 'coin':
      g.ellipse(c, c, 8, 8, ACC); g.ellipse(c, c, 6, 6, FILL); g.rect(c - 1, c - 3, 1, 6, DARK); break;
    case 'star':
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; g.line(c, c + 1, c + Math.cos(a) * 9, c + 1 + Math.sin(a) * 9, 1.6, FILL); }
      g.ellipse(c, c + 1, 4, 4, FILL); g.ellipse(c - 1, c, 1, 1, SHINE); break;
    case 'ring':
      g.ellipse(c, c + 2, 8, 7, FILL); g.ellipse(c, c + 2, 5, 4, 0); g.ellipse(c, 6, 3, 2.5, ACC); break;
    case 'card':
      g.rect(c - 7, 3, 7, 18, LIGHT); g.rect(c - 5, 5, 5, 14, FILL); g.ellipse(c, c, 2.5, 3, ACC); break;
    case 'key':
      g.ellipse(c, 6, 5, 5, FILL); g.ellipse(c, 6, 2, 2, 0); g.rect(c - 1, 10, 1, 11, FILL); g.rect(c - 4, 16, 3, 2, FILL); g.rect(c - 4, 19, 3, 2, FILL); break;
    case 'fruit':
      g.ellipse(c, 14, 8, 7.5, FILL); g.rect(c - 1, 3, 1, 5, DARK); g.ellipse(c - 4, 5, 3, 1.6, ACC); g.ellipse(c - 3, 11, 1.5, 2, SHINE); break;
    case 'lantern':
      g.rect(c - 3, 2, 3, 2, DARK); g.rect(c - 6, 4, 6, 2, DARK); g.ellipse(c, 13, 7, 7.5, FILL); g.ellipse(c, 13, 3.5, 4, SHINE);
      for (let y = 7; y < 20; y += 3) g.rect(c - 7, y, 7, 1, DARK); g.rect(c - 5, 20, 5, 2, DARK); break;
    case 'ribbon':
      g.ellipse(c, 8, 5, 5, FILL); g.ellipse(c, 8, 2, 2, ACC); g.line(c - 2, 12, c - 5, 21, 1.5, FILL); break;
    case 'charm':
      g.ellipse(c, 13, 7, 8, FILL); g.ellipse(c, 13, 3, 3.5, ACC); g.rect(c - 1, 2, 1, 4, DARK); break;
    case 'tag':
      g.rect(c - 7, 6, 7, 14, FILL); g.ellipse(c, 8, 1.5, 1.5, 0); g.rect(c - 5, 12, 5, 1, ACC); g.rect(c - 5, 15, 3, 1, ACC); break;
  }
  void r;
}

const cache = new Map<string, string>();

/** Icon for `id`. `shape` picks the silhouette; `color` the main tint (seeded from the id when omitted). */
export function iconUrl(id: string, shape?: IconShape, color?: string): string {
  const key = `${id}|${shape ?? ''}|${color ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = seeded('icon:' + id);
  const shapes: IconShape[] = ['gem', 'orb', 'box', 'coin', 'star', 'ring', 'card', 'charm', 'bottle', 'book'];
  const sh = shape ?? shapes[Math.floor(r() * shapes.length)];
  const g = new Grid(N, N);
  draw(g, sh, r);
  g.mirror();
  const b = g.bounds();
  g.recolor(FILL, LIGHT, (x, y) => !g.get(x, y - 1) || !g.get(x - 1, y));
  g.recolor(FILL, DARK, (x, y) => !g.get(x, y + 1) || y > b.y1 - 2);
  g.outline(OUT);
  const main = color ?? hsl(r() * 360, 0.55, 0.55);
  const pal = ['', main, shade(main, -0.15), shade(main, 0.15), '#1b1622', shade(main, 0.05, 150, -0.1), '#ffffff'];
  const url = svgUrl(gridSvg(g, pal, { pad: 0 }));
  cache.set(key, url);
  return url;
}
