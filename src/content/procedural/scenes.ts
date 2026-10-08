// Procedural backdrops (layered pixel landscapes), plus the logo and favicon.
import { seeded, shade, svgUrl } from './pixel';

interface SceneStyle { sky: [string, string]; layers: string[]; sun?: string; stars?: boolean; water?: string }

const STYLES: Record<string, SceneStyle> = {
  fernreach: { sky: ['#9fd8ff', '#e9f7ff'], layers: ['#7bb07a', '#4f8f55', '#2f6a3b'], sun: '#fff3b0' },
  lanternport: { sky: ['#f6a96b', '#ffe0b0'], layers: ['#8c6a8f', '#5d4a72', '#35304f'], sun: '#ffd27a', water: '#4a6f9c' },
  cinderisles: { sky: ['#5a2a3a', '#f08a4b'], layers: ['#6b3a2e', '#43241f', '#241414'], sun: '#ffb347', water: '#3a2a3a' },
  frostmere: { sky: ['#bcd7ee', '#f3f8fc'], layers: ['#dbe8f3', '#a9c3dc', '#6d8fb0'], sun: '#ffffff' },
  neonbasin: { sky: ['#1b1036', '#4a2a7a'], layers: ['#3b2a66', '#2a1d4d', '#160f2c'], stars: true },
  gildedcoast: { sky: ['#ffcf73', '#fff1c9'], layers: ['#e0b064', '#b98245', '#7d5531'], sun: '#fff7d6', water: '#3f8fa8' },
  sunreef: { sky: ['#58c6e8', '#c8f1ff'], layers: ['#f1dca0', '#5fb39a', '#2f7d73'], sun: '#fffbe0', water: '#2e9cc0' },
  moorhaven: { sky: ['#5f6b73', '#a7b3ae'], layers: ['#6f7d6a', '#4d5a4b', '#2f3a31'] },
  grandtable: { sky: ['#2a0f1f', '#6b1e3a'], layers: ['#4a1630', '#2f0d20', '#160610'], stars: true },
  highstakes: { sky: ['#0d1430', '#3a4f86'], layers: ['#6d7fb3', '#3d4c7c', '#1d2648'], stars: true },
  title: { sky: ['#123a2c', '#2f7d5e'], layers: ['#1f5c45', '#164534', '#0c2a20'], stars: true },
};

const W = 320, H = 180;
const cache = new Map<string, string>();

function ridge(r: () => number, base: number, amp: number, step: number): string {
  const pts: string[] = [`0,${H}`];
  let y = base;
  for (let x = 0; x <= W; x += step) {
    y = Math.max(base - amp, Math.min(base + amp * 0.4, y + (r() - 0.5) * amp * 0.6));
    const q = Math.round(y / 2) * 2;
    pts.push(`${x},${q}`, `${x + step},${q}`);
  }
  pts.push(`${W},${H}`);
  return pts.join(' ');
}

export function backdropUrl(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const st = STYLES[id] ?? STYLES.fernreach;
  const r = seeded('scene:' + id);
  const parts: string[] = [];
  parts.push(`<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${st.sky[0]}"/><stop offset="1" stop-color="${st.sky[1]}"/></linearGradient></defs>`);
  parts.push(`<rect width="${W}" height="${H}" fill="url(#s)"/>`);
  if (st.stars) for (let i = 0; i < 60; i++) parts.push(`<rect x="${Math.floor(r() * W)}" y="${Math.floor(r() * H * 0.6)}" width="1" height="1" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`);
  if (st.sun) { const sx = 40 + r() * 240, sy = 30 + r() * 25; parts.push(`<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="16" fill="${st.sun}" opacity="0.9"/><circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="24" fill="${st.sun}" opacity="0.25"/>`); }
  // clouds
  for (let i = 0; i < 4; i++) {
    const cx = r() * W, cy = 20 + r() * 50, w = 20 + r() * 30;
    parts.push(`<rect x="${cx.toFixed(0)}" y="${cy.toFixed(0)}" width="${w.toFixed(0)}" height="4" fill="#fff" opacity="0.35"/><rect x="${(cx + 6).toFixed(0)}" y="${(cy - 3).toFixed(0)}" width="${(w * 0.5).toFixed(0)}" height="3" fill="#fff" opacity="0.3"/>`);
  }
  st.layers.forEach((c, i) => {
    const base = 95 + i * 25;
    parts.push(`<polygon points="${ridge(r, base, 30 - i * 6, 8 + i * 4)}" fill="${c}"/>`);
    if (i === 0) parts.push(`<polygon points="${ridge(r, base + 4, 20, 8)}" fill="${shade(c, 0.06)}" opacity="0.5"/>`);
  });
  if (st.water) {
    parts.push(`<rect x="0" y="${H - 28}" width="${W}" height="28" fill="${st.water}"/>`);
    for (let i = 0; i < 18; i++) parts.push(`<rect x="${Math.floor(r() * W)}" y="${H - 26 + Math.floor(r() * 24)}" width="${6 + Math.floor(r() * 10)}" height="1" fill="#fff" opacity="0.35"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges">${parts.join('')}</svg>`;
  const url = svgUrl(svg);
  cache.set(id, url);
  return url;
}

/** The "Pocket Aces" wordmark: two fanned aces behind pixel lettering. */
export function logoSvg(): string {
  const card = (x: number, rot: number, suit: string, col: string) =>
    `<g transform="rotate(${rot} ${x + 30} 120)"><rect x="${x}" y="20" width="60" height="86" rx="6" fill="#fffaf0" stroke="#2a1d14" stroke-width="4"/>` +
    `<text x="${x + 10}" y="44" font-family="'Press Start 2P',monospace" font-size="16" fill="${col}">A</text>` +
    `<text x="${x + 30}" y="80" text-anchor="middle" font-size="34" fill="${col}">${suit}</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 200" width="520" height="200">` +
    card(200, -14, '♠', '#1d1a2a') + card(260, 12, '♥', '#d8354a') +
    `<g font-family="'Press Start 2P',monospace" font-size="44" text-anchor="middle">` +
    `<text x="263" y="167" fill="#2a1d14">POCKET ACES</text><text x="260" y="163" fill="#ffd34d" stroke="#2a1d14" stroke-width="2" paint-order="stroke">POCKET ACES</text></g></svg>`;
}

export function logoUrl(): string { return svgUrl(logoSvg()); }

/** Favicon: a tiny ace of spades. */
export function faviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="0" width="12" height="16" fill="#2a1d14"/><rect x="3" y="1" width="10" height="14" fill="#fffaf0"/>` +
    `<rect x="7" y="4" width="2" height="1" fill="#1d1a2a"/><rect x="6" y="5" width="4" height="1" fill="#1d1a2a"/><rect x="5" y="6" width="6" height="2" fill="#1d1a2a"/><rect x="5" y="8" width="2" height="1" fill="#1d1a2a"/><rect x="9" y="8" width="2" height="1" fill="#1d1a2a"/><rect x="7" y="8" width="2" height="3" fill="#1d1a2a"/><rect x="6" y="11" width="4" height="1" fill="#1d1a2a"/>` +
    `<rect x="4" y="2" width="1" height="2" fill="#d8354a"/></svg>`;
}
