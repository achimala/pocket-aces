// Drives the game in headless Chromium and screenshots every screen. Needs `pnpm dev` running.
// OUT=dir SEED=ABC BASE=http://localhost:5173 [PACK=id] [VIEWPORT=390x844] [MOBILE=1] node scripts/shots.mjs
// MOBILE=1 emulates a touch phone (touch events, device scale 3).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.env.OUT ?? 'shots';
const BASE = process.env.BASE ?? 'http://localhost:5173';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const [vw, vh] = (process.env.VIEWPORT ?? '1440x900').split('x').map(Number);
const mobile = process.env.MOBILE === '1';
const page = await browser.newPage({ viewport: { width: vw, height: vh }, ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}) });
const errors = [];
await page.addInitScript((pack) => {
  localStorage.setItem('pocketaces.tutorialSeen', '1');
  // PACK=<id> screenshots with an imported content pack switched on
  if (pack) localStorage.setItem('pocketaces.settings', JSON.stringify({ speed: 1, reducedMotion: false, crt: false, showMoveNames: false, overlay: pack }));
}, process.env.PACK ?? '');
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const visible = (text) => page.getByText(text).first().isVisible().catch(() => false);

await page.goto(BASE + '/');
await wait(1500);
await shot('01-title');

// How to play: every page
await page.getByText('HOW TO PLAY').click();
await wait(500);
for (let i = 0; i < 6; i++) {
  await shot(`02-howto-${i + 1}`);
  const next = page.getByText('Next ▶');
  if (!(await next.isVisible().catch(() => false))) break;
  await next.click();
  await wait(350);
}
await page.getByText('Skip ✕').click();
await wait(300);

// Settings
await page.getByText('SETTINGS').click();
await wait(400);
await shot('03-settings');
await page.getByText('Done').click();
await wait(300);

// Collection: every tab
await page.getByText('COLLECTION').click();
await wait(600);
const tabs = page.locator('.coll-tabs button');
const nt = await tabs.count();
for (let i = 0; i < nt; i++) { await tabs.nth(i).click(); await wait(400); await shot(`04-collection-${i + 1}`); }
await page.getByText('← Back').click();
await wait(500);

// Starter select and a run
await page.getByText('NEW RUN').click();
await wait(800);
await shot('05-starter');
await page.locator('.input').fill(process.env.SEED ?? 'SHOTS1');
await page.getByText('DEAL ME IN!').click();
await wait(1000);
await shot('06-select');
await page.getByText('BATTLE', { exact: true }).first().click();
await wait(2600);
await shot('07-battle');
const cards = page.locator('.hand-cards .pcard');
const n = await cards.count();
for (let i = 0; i < Math.min(3, n); i++) await cards.nth(i).click({ force: true });
await wait(400);
await cards.nth(4).hover({ force: true });
await wait(300);
await shot('08-selected');
await page.getByText('ATTACK', { exact: true }).click({ force: true });
await wait(1500);
await shot('09-scoring');
await wait(3500);
await shot('10-after-attack');
for (let k = 0; k < 6; k++) {
  const attack = page.getByText('ATTACK', { exact: true });
  if (!(await attack.isEnabled().catch(() => false))) {
    const cs = page.locator('.hand-cards .pcard');
    const c = await cs.count();
    for (let i = 0; i < Math.min(5, c); i++) await cs.nth(i).click({ force: true });
    await wait(200);
  }
  if (await attack.isEnabled().catch(() => false)) { await attack.click({ force: true }); await wait(6500); }
  if (await visible('TO THE BAZAAR')) break;
  if (await visible('ARE WORN OUT')) break;
}
await shot('11-cashout');
if (await visible('TO THE BAZAAR')) {
  await page.getByText('TO THE BAZAAR').click();
  await wait(900);
  await shot('12-shop');
  const pack = page.locator('.pack-card').first();
  if (await pack.isVisible().catch(() => false)) {
    await pack.click();
    await wait(600);
    await shot('13-pack-opening');
    await wait(1400);
    await shot('14-pack-open');
    const skip = page.getByText('Skip', { exact: true });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await wait(500);
  }
  await page.getByText('NEXT BATTLE ▶').click().catch(() => {});
  await wait(900);
  await shot('15-select-2');
  await page.getByText(/^Party/).click().catch(() => {});
  await wait(600);
  await shot('16-party');
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close();
