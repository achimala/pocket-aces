// Frame-rate probe: sweeps the mouse over the hand, items and scene in a battle and reports rAF frame stats.
import { webkit, chromium } from 'playwright';
const engine = process.argv[2] === 'chromium' ? chromium : webkit;
const browser = await engine.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => localStorage.setItem('pocketaces.tutorialSeen', '1'));
await page.goto(process.env.URL ?? 'http://localhost:5173/'); await page.waitForTimeout(800);
await page.getByText('NEW RUN').click();
await page.locator('.input').fill('PERF1');
await page.getByText('DEAL ME IN!').click(); await page.waitForTimeout(500);
await page.getByText('BATTLE', { exact: true }).first().click({ force: true }); await page.waitForTimeout(3500);
await page.evaluate(() => { window.__f = []; let last = performance.now(); const tick = (t) => { window.__f.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
const t0 = Date.now();
while (Date.now() - t0 < 5000) {
  for (let x = 480; x <= 1100; x += 12) await page.mouse.move(x, 800 + Math.sin(x / 30) * 30);
  for (let x = 1100; x >= 480; x -= 12) await page.mouse.move(x, 300 + Math.sin(x / 40) * 60);
}
const f = await page.evaluate(() => window.__f.slice(5));
f.sort((a, b) => a - b);
const avg = f.reduce((a, b) => a + b, 0) / f.length;
console.log(`${process.argv[2] ?? 'webkit'}: frames=${f.length} avg=${avg.toFixed(1)}ms (${(1000 / avg).toFixed(0)}fps) p95=${f[Math.floor(f.length * 0.95)].toFixed(1)}ms max=${f[f.length - 1].toFixed(0)}ms >33ms=${f.filter((x) => x > 33).length}`);
await browser.close();
