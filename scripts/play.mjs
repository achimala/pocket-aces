// Longer automated playthrough: plays battles greedily (select 5 cards), shops, takes screenshots at interesting points.
import { chromium } from 'playwright';
const OUT = process.env.OUT ?? 'shots';
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
await page.addInitScript(() => localStorage.setItem('pocketaces.tutorialSeen', '1'));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 300)); });
page.on('dialog', (d) => d.accept());
await page.goto('http://localhost:5173/');
await page.waitForTimeout(800);
// speed up animations
await page.evaluate(() => localStorage.setItem('pocketaces.settings', JSON.stringify({ speed: 4, reducedMotion: false, crt: false, showMoveNames: false })));
await page.reload();
await page.waitForTimeout(800);
await page.getByText('NEW RUN').click();
await page.locator('.starter-card').nth(Number(process.env.STARTER ?? 1)).click();
await page.locator('.input').fill(process.env.SEED ?? 'PLAY1');
await page.getByText('DEAL ME IN!').click();
await page.waitForTimeout(500);
const vis = async (t) => page.getByText(t, { exact: true }).first().isVisible().catch(() => false);
const clickText = async (t) => page.getByText(t, { exact: true }).first().click({ force: true, timeout: 4000 }).catch(() => {});
let shots = 0;
const shot = async (name) => { await page.screenshot({ path: `${OUT}/p${String(++shots).padStart(2, '0')}-${name}.png` }); };
for (let step = 0; step < 400; step++) {
  if (await vis('ALL YOUR PIPS ARE WORN OUT')) { await shot('gameover'); break; }
  if (await vis('YOU ARE THE KINGPIN!')) { await shot('win'); break; }
  if (await vis('TO THE BAZAAR ▶')) { await page.waitForTimeout(600); await clickText('TO THE BAZAAR ▶'); await page.waitForTimeout(400); continue; }
  if (await vis('NEXT BATTLE ▶')) {
    // buy first affordable item/pack
    const cards = page.locator('.shop-row .item-card, .shop-row .cons-card');
    const n = await cards.count();
    for (let i = 0; i < n; i++) { await cards.nth(i).click({ force: true }).catch(() => {}); await page.waitForTimeout(150); }
    const packs = page.locator('.pack-card');
    if (await packs.count()) { await packs.first().click().catch(() => {}); await page.waitForTimeout(500); }
    while (await vis('Skip')) { const ch = page.locator('.pack-choices .pcard, .pack-choices .item-card, .pack-choices .cons-card'); if (await ch.count()) { await ch.first().click({ force: true }); await page.waitForTimeout(300); } else break; if (await vis('Skip')) { await clickText('Skip'); await page.waitForTimeout(200); } }
    if (step < 30) await shot('shop');
    await clickText('NEXT BATTLE ▶');
    await page.waitForTimeout(300);
    continue;
  }
  if (await vis('CHALLENGE') || await vis('BATTLE')) {
    if (await vis('CHALLENGE')) await shot('select-boss');
    await clickText(await vis('CHALLENGE') ? 'CHALLENGE' : 'BATTLE');
    await page.waitForTimeout(1900);
    if (step < 60) await shot('battle-start');
    continue;
  }
  const attack = page.getByText('ATTACK', { exact: true });
  if (await attack.isVisible().catch(() => false)) {
    // use TMs in bag
    const bag = page.locator('.bag-dock .cons-card');
    if (await bag.count()) { await bag.first().click({ force: true }).catch(() => {}); await page.waitForTimeout(200); }
    const cs = page.locator('.hand-cards .pcard');
    const c = await cs.count();
    // deselect all then select top 5 by tier (already sorted by tier)
    for (let i = 0; i < Math.min(5, c); i++) { await cs.nth(i).click({ force: true }); await page.waitForTimeout(40); }
    if (await attack.isEnabled().catch(() => false)) { await attack.click({ force: true, timeout: 4000 }).catch(() => {}); await page.waitForTimeout(2600); }
    else { // try discard
      const d = page.getByText('DISCARD', { exact: true });
      if (await d.isEnabled().catch(() => false)) { await d.click({ force: true, timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500); }
      else { for (let i = 0; i < Math.min(5, c); i++) await cs.nth(i).click({ force: true }); await page.waitForTimeout(200); }
    }
    continue;
  }
  await page.waitForTimeout(300);
}
const info = await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('pocketaces.run') ?? 'null'); return r ? `${r.region + 1}/${r.battleIndex + 1} money=${r.money} items=${r.items.map((i) => i.defId).join(',')} deck=${r.deck.length}` : 'no run saved (ended)'; });
console.log(info);
console.log(errors.length ? [...new Set(errors)].slice(0, 10).join('\n') : 'no errors');
await browser.close();
