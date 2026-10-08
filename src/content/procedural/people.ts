// Procedural pixel portraits for opponents and the shop clerk: a seeded bust on a tinted card.
import { Grid, gridSvg, seeded, shade, svgUrl, hsl } from './pixel';

const N = 32;
const BG = 1, BG2 = 2, SKIN = 3, SKIND = 4, HAIR = 5, HAIRD = 6, CLOTH = 7, CLOTHD = 8, EYE = 9, OUT = 10, MOUTH = 11, HAT = 12, TRIM = 13;
const SKINS = ['#f6d3b3', '#e8b48f', '#c98d63', '#a46a43', '#7a4b2e', '#f1c7a4', '#d9a07a'];

const cache = new Map<string, string>();

/** A portrait for any id. `tint` picks the background hue (e.g. the leader's type colour). */
export function portraitUrl(id: string, tint?: string): string {
  const key = id + '|' + (tint ?? '');
  const hit = cache.get(key);
  if (hit) return hit;
  const r = seeded('portrait:' + id);
  const g = new Grid(N, N);
  // shoulders
  g.ellipse(N / 2, N + 3, 13 + r() * 2, 11, CLOTH);
  g.recolor(CLOTH, CLOTHD, (x, y) => y > N - 4 || x < 6);
  if (r() < 0.6) { for (let y = 23; y < N; y++) { g.set(N / 2 - 1, y, TRIM); g.set(N / 2, y, TRIM); } }
  // neck + head
  g.rect(N / 2 - 2, 19, 4, 5, SKIND);
  const hw = 6 + r() * 1.5, hh = 7.5 + r();
  g.ellipse(N / 2, 13, hw, hh, SKIN);
  g.recolor(SKIN, SKIND, (x, y) => x > N / 2 + hw - 2 || y > 13 + hh - 2);
  // hair
  const style = Math.floor(r() * 5);
  if (style === 0) g.ellipse(N / 2, 8, hw + 1, 4.5, HAIR); // cap of hair
  else if (style === 1) { g.ellipse(N / 2, 8, hw + 1.5, 5, HAIR); g.rect(N / 2 - hw - 1.5, 8, 3, 14, HAIR); g.rect(N / 2 + hw - 1.5, 8, 3, 14, HAIR); } // long
  else if (style === 2) { for (let i = 0; i < 5; i++) g.ellipse(N / 2 - 6 + i * 3, 6 + (i % 2), 2.4, 3.2, HAIR); } // spiky
  else if (style === 3) g.ellipse(N / 2, 5.5, 5, 3.5, HAIR); // bun
  else g.rect(N / 2 - hw, 5, hw * 2, 3, HAIR); // short crop
  g.recolor(HAIR, HAIRD, (x, y) => y % 3 === 2 && x % 2 === 0);
  // hat (sometimes)
  if (r() < 0.35) { g.rect(N / 2 - hw - 2, 5, hw * 2 + 4, 2, HAT); g.rect(N / 2 - hw + 1, 1, hw * 2 - 2, 4, HAT); }
  // face
  const ey = 13 + Math.round(r());
  g.rect(N / 2 - 4, ey, 2, 2, EYE); g.rect(N / 2 + 2, ey, 2, 2, EYE);
  g.rect(N / 2 - 2, 17 + Math.round(r()), 4, 1, MOUTH);
  g.outline(OUT);
  const card = new Grid(N, N);
  card.rect(0, 0, N, N, BG);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = g.get(x, y); if (v) card.set(x, y, v); else if ((x + y) % 4 === 0 && y > N * 0.55) card.set(x, y, BG2); }
  const baseHue = tint ? null : r() * 360;
  const bg = tint ?? hsl(baseHue!, 0.45, 0.5);
  const hairC = hsl(r() * 360, 0.35 + r() * 0.3, 0.2 + r() * 0.35);
  const cloth = hsl(r() * 360, 0.45, 0.4);
  const pal = ['', shade(bg, -0.05), shade(bg, -0.12), SKINS[Math.floor(r() * SKINS.length)], '', hairC, shade(hairC, -0.1), cloth, shade(cloth, -0.12), '#1b1622', '#1b1622', '#8a3a3a', shade(cloth, -0.2, 40), '#f2e3b3'];
  pal[SKIND] = shade(pal[SKIN], -0.1);
  const url = svgUrl(gridSvg(card, pal));
  cache.set(key, url);
  return url;
}
