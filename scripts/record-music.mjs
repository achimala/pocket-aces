// Captures one of the game's songs to a webm file via the ?dev audio tap.
import { chromium } from 'playwright';
import fs from 'node:fs';
const [song = 'league', secs = '62', out = 'music.webm'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.addInitScript(() => localStorage.setItem('pocketaces.audio', JSON.stringify({ music: 0.9, sfx: 0, muted: false })));
await page.goto(process.env.URL ?? 'http://localhost:4173/?dev');
await page.waitForTimeout(1000);
await page.mouse.click(10, 10);
await page.evaluate(async (s) => { await window.__pk.startAudio(); window.__pk.setVolumes(0.9, 0); window.__pk.playMusic(s); }, song);
await page.waitForTimeout(Number(secs) * 1000);
const a = await page.evaluate(() => window.__pk.stopAudio());
fs.writeFileSync(out, Buffer.from(a.b64, 'base64'));
await browser.close();
