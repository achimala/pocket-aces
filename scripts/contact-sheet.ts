// Renders every Pip (front, back, shiny), portrait and icon from the active default pack into one HTML page.
// pnpm exec tsx scripts/contact-sheet.ts out.html   (then open it, or screenshot it with Playwright)
import { writeFileSync } from 'node:fs';
import { DEFAULT_PACK } from '../src/content/default';
import { SPECIES } from '../src/game/pips';
import { LEADERS } from '../src/game/opponents';

const art = DEFAULT_PACK.art;
const cell = (src: string, label: string, cls = '') => `<figure class="${cls}"><img src="${src}"><figcaption>${label}</figcaption></figure>`;
const pips = SPECIES.map((s) => {
  const e = DEFAULT_PACK.pips[s.id];
  return `<div class="pip">${cell(art.pip(s.id), `${s.id} ${e?.name ?? ''}`)}<img class="sm" src="${art.pip(s.id, { back: true })}"><img class="sm" src="${art.pip(s.id, { shiny: true })}"><small>${s.types.join('/')} · ${e?.body} · ${e?.motion}</small></div>`;
}).join('');
const portraits = [...LEADERS.map((l) => l.id), 'clerk', 'schoolkid', 'angler', 'rival'].map((id) => cell(art.portrait(id), DEFAULT_PACK.leaders[id]?.name ?? id, 'p')).join('');
const icons = [...Object.keys(DEFAULT_PACK.items), ...Object.keys(DEFAULT_PACK.consumables), ...Object.keys(DEFAULT_PACK.keyItems), ...Object.keys(DEFAULT_PACK.fruits), ...Object.keys(DEFAULT_PACK.packs)]
  .map((id) => cell(art.icon(id), id, 'i')).join('');
const backs = Object.keys(DEFAULT_PACK.regions).concat('title').map((id) => cell(art.backdrop(id), id, 'b')).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{background:#1b2030;color:#ccd;font:11px monospace;margin:12px} h2{color:#fc6}
.grid{display:flex;flex-wrap:wrap;gap:6px} img{image-rendering:pixelated}
.pip{width:150px;background:#262c40;border-radius:6px;padding:4px;display:flex;flex-wrap:wrap;align-items:center}
.pip figure{margin:0;width:96px} .pip figure img{width:96px;height:96px} .pip .sm{width:44px;height:44px} .pip small{width:100%;opacity:.6}
figure{margin:0;text-align:center} figure.p img{width:72px;height:72px} figure.i img{width:40px;height:40px} figure.i{width:90px} figure.b img{width:320px;height:180px}
</style><h2>Pips</h2><div class="grid">${pips}</div><h2>Portraits</h2><div class="grid">${portraits}</div><h2>Icons</h2><div class="grid">${icons}</div><h2>Backdrops</h2><div class="grid">${backs}</div>`;
writeFileSync(process.argv[2] ?? 'contact-sheet.html', html);
console.log('wrote', process.argv[2] ?? 'contact-sheet.html');
