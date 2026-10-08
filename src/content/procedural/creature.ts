// Procedural pixel creatures: the default placeholder art for every Pip slot.
// A seeded silhouette (by body plan), mirrored for symmetry, then outlined, shaded, patterned and given eyes.
import type { BodyPlan } from '../types';
import { Grid, gridSvg, seeded, shade, svgUrl, hexToHsl, hsl } from './pixel';

export interface CreatureSpec {
  id: string;
  color: string; // main body colour
  accent: string; // secondary colour (second type, or a derived tone)
  body: BodyPlan;
  stage: number; // 0..2, drives size
  legendary?: boolean;
}

const N = 32;
// palette slots
const BODY = 1, DARK = 2, LIGHT = 3, ACC = 4, OUT = 5, EYE = 6, PUPIL = 7, SHINE = 8, ACCDARK = 9;

function silhouette(g: Grid, body: BodyPlan, r: () => number, s: number): { eyeY: number; eyeX: number; eyeR: number } {
  const cx = N / 2;
  const base = N - 3; // feet line
  const j = (a: number) => a * (0.85 + r() * 0.3) * s; // jittered, scaled size
  switch (body) {
    case 'blob': {
      const rx = j(9), ry = j(8);
      g.ellipse(cx, base - ry, rx, ry, BODY);
      if (r() < 0.5) g.ellipse(cx - rx * 0.6, base - ry * 1.7, j(2.2), j(3), BODY); // ear nub
      return { eyeY: base - ry * 1.25, eyeX: rx * 0.38, eyeR: 1.4 * s + 0.4 };
    }
    case 'quad': {
      const rx = j(9), ry = j(5.5), hy = base - ry * 2 - j(2.5);
      g.ellipse(cx, base - ry - 2 * s, rx, ry, BODY);
      g.ellipse(cx, hy, j(5.5), j(5), BODY);
      g.rect(cx - rx * 0.75, base - 3 * s, 2.5 * s, 3 * s + 1, BODY);
      g.rect(cx - rx * 0.25, base - 3 * s, 2 * s, 3 * s + 1, BODY);
      const ear = r();
      if (ear < 0.4) g.line(cx - j(4), hy - j(3), cx - j(6), hy - j(8), 1.2 * s, BODY);
      else if (ear < 0.7) g.ellipse(cx - j(4.5), hy - j(4), j(1.8), j(2.6), BODY);
      if (r() < 0.6) g.line(cx - rx, base - ry - 2 * s, cx - rx - j(3), base - ry * 2.2, 1 * s, BODY); // tail
      return { eyeY: hy - 0.5, eyeX: j(2.2), eyeR: 1.2 * s + 0.4 };
    }
    case 'biped': {
      const tr = j(6), ty = base - j(7);
      g.ellipse(cx, ty, tr, j(6.5), BODY);
      const hr = j(5.5), hy = ty - j(6.5) - hr * 0.6;
      g.ellipse(cx, hy, hr, hr * 0.95, BODY);
      g.rect(cx - tr * 0.7, base - 3 * s, 2.5 * s, 3 * s + 1, BODY);
      g.line(cx - tr, ty - 2 * s, cx - tr - j(3), ty + j(2), 1.1 * s, BODY);
      if (r() < 0.5) g.line(cx - hr * 0.6, hy - hr * 0.7, cx - hr * 0.9, hy - hr * 1.6, 1 * s, BODY);
      return { eyeY: hy, eyeX: hr * 0.4, eyeR: 1.2 * s + 0.4 };
    }
    case 'bird': {
      const by = base - j(7);
      g.ellipse(cx, by, j(5.5), j(7), BODY);
      const hy = by - j(7.5);
      g.ellipse(cx, hy, j(4.5), j(4.2), BODY);
      const span = j(12), wy = by - j(2);
      g.line(cx - j(3), wy, cx - span, wy - j(4 + r() * 4), 1.8 * s, BODY);
      g.line(cx - j(3), wy + 2, cx - span * 0.8, wy + j(1), 1.4 * s, BODY);
      g.rect(cx - 1, hy + 1, 1, 2 * s, ACC); // beak (mirrored to 2px)
      if (r() < 0.6) g.line(cx - 1, hy - j(3), cx - j(2.5), hy - j(7), 0.8 * s, BODY);
      return { eyeY: hy - 0.5, eyeX: j(2), eyeR: 1.1 * s + 0.3 };
    }
    case 'fish': {
      const by = base - j(8);
      g.ellipse(cx, by, j(7.5), j(8), BODY);
      g.line(cx - j(6), by + j(1), cx - j(12), by - j(3), 1.6 * s, BODY); // side fins
      g.line(cx - j(2), by + j(7), cx - j(5), base, 1.5 * s, BODY); // tail fork
      if (r() < 0.6) g.line(cx - 1, by - j(7), cx - 1, by - j(11), 1.2 * s, BODY); // dorsal
      return { eyeY: by - j(2.5), eyeX: j(3.2), eyeR: 1.4 * s + 0.4 };
    }
    case 'serpent': {
      let y = base - 2, w = j(9);
      for (let i = 0; i < 3; i++) { g.ellipse(cx, y - w * 0.4, w, w * 0.45, BODY); y -= w * 0.7; w *= 0.78; }
      const hy = y - j(3);
      g.ellipse(cx, hy, j(4.5), j(3.8), BODY);
      if (r() < 0.5) g.line(cx - j(3), hy - j(2), cx - j(6), hy - j(6), 1 * s, BODY); // hood/crest
      return { eyeY: hy - 0.5, eyeX: j(2), eyeR: 1.1 * s + 0.3 };
    }
    case 'bug': {
      const by = base - j(6);
      g.ellipse(cx, by, j(6), j(5.5), BODY);
      g.ellipse(cx, by - j(7), j(4.5), j(3.8), BODY);
      for (let i = 0; i < 3; i++) g.line(cx - j(4), by - j(2) + i * j(3), cx - j(10), by - j(4) + i * j(4.5), 0.7 * s, DARK);
      g.line(cx - j(2), by - j(9.5), cx - j(5), by - j(15), 0.6 * s, DARK);
      if (r() < 0.5) g.ellipse(cx - j(7), by - j(6), j(4), j(3), LIGHT); // wing
      return { eyeY: by - j(7), eyeX: j(2.2), eyeR: 1.3 * s + 0.3 };
    }
    case 'floater': {
      const by = N / 2 - 1;
      g.ellipse(cx, by, j(8), j(7.5), BODY);
      const k = 2 + Math.floor(r() * 2);
      for (let i = 0; i < k; i++) { const x = cx - j(2) - i * j(2.8); g.line(x, by + j(5), x - r() * 2, by + j(10 + r() * 4), 0.9 * s, BODY); }
      return { eyeY: by - j(1), eyeX: j(3), eyeR: 1.5 * s + 0.4 };
    }
    case 'plant': {
      const by = base - j(6);
      g.ellipse(cx, by, j(7), j(6.5), BODY);
      g.ellipse(cx - j(4), by - j(8), j(3), j(5.5), ACC);
      g.ellipse(cx - j(1), by - j(10), j(2), j(4.5), ACC);
      g.rect(cx - j(5), base - 3 * s, 2 * s, 3 * s + 1, BODY);
      return { eyeY: by - j(1), eyeX: j(2.6), eyeR: 1.3 * s + 0.4 };
    }
    case 'rock': {
      const by = base - j(7);
      const pts = 5 + Math.floor(r() * 3);
      for (let i = 0; i < pts; i++) g.ellipse(cx - r() * j(6), by - j(5) + r() * j(10), j(3 + r() * 3), j(3 + r() * 3), BODY);
      g.ellipse(cx, by, j(6), j(6), BODY);
      return { eyeY: by - j(1.5), eyeX: j(2.5), eyeR: 1.1 * s + 0.4 };
    }
  }
}

const cache = new Map<string, string>();

/** Front or back sprite as an SVG data URL. Shiny shifts the palette in code. */
export function creatureUrl(spec: CreatureSpec, opts: { back?: boolean; shiny?: boolean } = {}): string {
  const key = `${spec.id}|${spec.color}|${spec.accent}|${spec.body}|${opts.back ? 1 : 0}|${opts.shiny ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = seeded(spec.id + spec.body);
  const s = [0.72, 0.86, 1][Math.min(2, spec.stage)] * (spec.legendary ? 1.06 : 1);
  const g = new Grid(N, N);
  const face = silhouette(g, spec.body, r, s);
  // organic edge noise, then symmetry
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N / 2; x++) {
    if (g.get(x, y) === BODY && r() < 0.06 && (!g.get(x - 1, y) || !g.get(x, y - 1))) g.set(x, y, 0);
  }
  g.mirror();
  const b = g.bounds();
  const mid = (b.y0 + b.y1) / 2;
  // pattern: belly patch, stripes or spots
  const pat = Math.floor(r() * 4);
  if (pat === 0) g.recolor(BODY, ACC, (x, y) => ((x + 0.5 - N / 2) / ((b.x1 - b.x0) * 0.22)) ** 2 + ((y - (mid + (b.y1 - mid) * 0.35)) / ((b.y1 - b.y0) * 0.28)) ** 2 < 1);
  else if (pat === 1) { const step = 3 + Math.floor(r() * 2); g.recolor(BODY, ACC, (x, y) => y % step === 0 && y > b.y0 + 3); }
  else if (pat === 2) { const sp = seeded(spec.id + 'spots'); g.recolor(BODY, ACC, (x) => sp() < 0.08 && x < N / 2); g.mirror(); }
  // shading: highlight on top-left, shadow on the bottom rows
  g.recolor(BODY, LIGHT, (x, y) => !g.get(x, y - 1) || (!g.get(x - 1, y) && y < mid));
  g.recolor(BODY, DARK, (x, y) => !g.get(x, y + 2) || y > b.y1 - 2);
  g.recolor(ACC, ACCDARK, (x, y) => !g.get(x, y + 1));
  g.outline(OUT);
  if (!opts.back) {
    const ey = Math.round(face.eyeY), er = Math.max(1, Math.round(face.eyeR));
    const x0 = Math.round(N / 2 - face.eyeX - er);
    const both = (x: number, y: number, v: number) => { g.set(x, y, v); g.set(N - 1 - x, y, v); };
    for (let dx = 0; dx < er; dx++) for (let dy = 0; dy <= er; dy++) both(x0 + dx, ey + dy, EYE);
    both(x0 + er - 1, ey + er, PUPIL);
    if (er > 1) both(x0 + er - 1, ey + er - 1, PUPIL);
  } else {
    // back view: no face, a soft sheen across the shoulders
    g.recolor(LIGHT, SHINE, (x, y) => y < mid && Math.abs(x + 0.5 - N / 2) < (b.x1 - b.x0) * 0.25);
  }
  let main = spec.color, acc = spec.accent;
  if (opts.shiny) {
    const [h1] = hexToHsl(main);
    main = shade(main, 0.05, 140 + (h1 % 40), 0.1);
    acc = shade(acc, 0.05, 140, 0.05);
  }
  const [hh, ss] = hexToHsl(main);
  const pal = ['', main, shade(main, -0.16, 6), shade(main, 0.14, -6), acc, hsl(hh, Math.min(0.5, ss), 0.12), '#ffffff', '#1a1420', shade(main, 0.24), shade(acc, -0.15)];
  const url = svgUrl(gridSvg(g, pal));
  cache.set(key, url);
  return url;
}
