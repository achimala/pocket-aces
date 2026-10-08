// Records a real seeded run played by the in-page autoplayer (?dev hook).
// MODE=scout: play at 4x without capture and print how far the seed gets. Default: capture 1080p frames + SFX audio + event log.
import { chromium } from 'playwright';
import fs from 'node:fs';
const SEED = process.env.SEED ?? 'VIDEO1';
const STARTER = Number(process.env.STARTER ?? 1);
const SCOUT = process.env.MODE === 'scout';
const OUT = process.env.OUT ?? `rec-${SEED}`;
const URL_ = process.env.URL ?? 'http://localhost:4173/?dev';
const MAX_MS = Number(process.env.MAX_MS ?? (SCOUT ? 240000 : 540000));
const STOP_REGION = Number(process.env.STOP_REGION ?? 99);
if (!SCOUT) fs.mkdirSync(`${OUT}/frames`, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: SCOUT ? 1 : Number(process.env.DSF ?? 1920 / 1440) });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript((scout) => {
  localStorage.setItem('pocketaces.tutorialSeen', '1');
  localStorage.setItem('pocketaces.audio', JSON.stringify({ music: 0, sfx: 0.9, muted: false }));
  localStorage.setItem('pocketaces.settings', JSON.stringify({ speed: scout ? 4 : 1, reducedMotion: false, crt: false, showMoveNames: false }));
  if (!scout) window.addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);transition:transform 0.03s linear';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 2.500-7.500L20 11z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    window.addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, true);
    window.addEventListener('mousedown', () => { c.firstChild.style.transform = 'scale(0.8)'; }, true);
    window.addEventListener('mouseup', () => { c.firstChild.style.transform = ''; }, true);
  });
}, SCOUT);
await page.goto(URL_);
await page.waitForTimeout(1200);

const t0 = Date.now();
const events = [];
const log = (type, data = {}) => { events.push({ t: (Date.now() - t0) / 1000, type, ...data }); if (!SCOUT || process.env.VERBOSE) console.log(((Date.now() - t0) / 1000).toFixed(1), type, JSON.stringify(data)); };
let frames = [];
let cdp;
if (!SCOUT) {
  cdp = await ctx.newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', (f) => {
    const name = `f${String(n++).padStart(6, '0')}.jpg`;
    fs.writeFile(`${OUT}/frames/${name}`, Buffer.from(f.data, 'base64'), () => {});
    frames.push({ name, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: Number(process.env.Q ?? 90), maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
}
const sleep = (ms) => page.waitForTimeout(SCOUT ? Math.min(ms, 60) : ms);
let mx = 720, my = 400;
async function moveTo(x, y) { const steps = SCOUT ? 1 : Math.max(6, Math.round(Math.hypot(x - mx, y - my) / 28)); await page.mouse.move(x, y, { steps }); mx = x; my = y; }
async function clickEl(loc, opts = {}) {
  const box = await loc.boundingBox().catch(() => null);
  if (!box) return false;
  await moveTo(box.x + box.width * (opts.fx ?? 0.5), box.y + box.height * (opts.fy ?? 0.5));
  await sleep(opts.pause ?? 90);
  await page.mouse.down(); await page.mouse.up();
  return true;
}
const vis = (sel) => page.locator(sel).first().isVisible().catch(() => false);
const text = (t) => page.getByText(t, { exact: true }).first();
const run = () => page.evaluate(() => { const r = window.__pk.run(); return r && { phase: r.phase, region: r.region, bi: r.battleIndex, money: r.money, items: r.items.length, slots: r.itemSlots, bag: r.bag.map((b) => b.defId), bagSlots: r.bagSlots, badges: r.badges.length, battle: r.battle && { kind: r.battle.opponent.kind, name: r.battle.opponent.name, hp: r.battle.hp, dmg: r.battle.damage, hands: r.battle.handsLeft, played: r.battle.played.length, sel: r.battle.selected.length, selected: [...r.battle.selected] }, pack: !!r.pack, shop: r.shop && { cards: r.shop.cards.map((c) => ({ kind: c.kind, price: c.price, sold: !!c.sold })), packs: r.shop.packs.map((p) => ({ price: p.price, sold: !!p.sold, kind: p.kind })), keys: r.shop.keyItems.map((k) => ({ price: k.price, sold: !!k.sold })) } }; });

// ---- title & starter ----
log('title');
await sleep(1800);
await clickEl(text('NEW RUN'));
await sleep(900);
log('starter');
await clickEl(page.locator('.starter-card').nth(STARTER));
await sleep(500);
await page.locator('.input').fill(SEED);
await clickEl(text('DEAL ME IN!'));
await sleep(900);
if (!SCOUT) { await page.evaluate(() => window.__pk.startAudio()).then((ts) => log('audio-start', { ts })); }

let lastBattleKey = '';
let shopVisits = 0;
while (Date.now() - t0 < MAX_MS) {
  const r = await run();
  if (!r) break;
  if (r.phase === 'gameover' || r.phase === 'win') { log(r.phase, { region: r.region, badges: r.badges }); await sleep(3500); break; }
  if (r.region >= STOP_REGION && r.phase === 'select') { log('stop'); break; }
  if (await vis('.unlock-modal')) { log('unlock'); await sleep(2200); await clickEl(text('Nice!')); await sleep(500); continue; }
  if (r.pack) {
    await sleep(1700);
    const ch = page.locator('.pack-choices .pcard, .pack-choices .item-card, .pack-choices .cons-card');
    const n = await ch.count();
    if (n) {
      for (let i = 0; i < Math.min(n, 3); i++) { const b = await ch.nth(i).boundingBox(); if (b) { await moveTo(b.x + b.width / 2, b.y + b.height / 2); await sleep(260); } }
      const before = n;
      await clickEl(ch.first());
      log('pack-pick');
      await sleep(700);
      if ((await ch.count()) === before && await vis('.pack-overlay')) { await clickEl(text('Skip')); await sleep(300); }
    } else { await clickEl(text('Skip')); await sleep(300); }
    continue;
  }
  if (r.phase === 'select') {
    await sleep(700);
    const cur = page.locator('.blind-card.current');
    const b = await cur.boundingBox().catch(() => null);
    if (b) await moveTo(b.x + b.width / 2, b.y + 120);
    await sleep(500);
    const boss = r.bi === 2 || r.region >= 8;
    await page.evaluate((s) => window.__pk.setSpeed(s), SCOUT ? 4 : (boss || (r.region === 0 && r.bi === 0) ? 1 : 2));
    log('select', { region: r.region, bi: r.bi });
    await clickEl(cur.locator('.btn-primary'));
    await sleep(boss ? 3600 : 1900);
    continue;
  }
  if (r.phase === 'cashout') {
    if (await vis('.cashout')) { log('cashout', { region: r.region, bi: r.bi }); await sleep(1500); await clickEl(text('TO THE BAZAAR ▶')); await sleep(900); }
    else await sleep(200);
    continue;
  }
  if (r.phase === 'shop') {
    shopVisits++;
    log('shop', { money: r.money });
    await sleep(700);
    let money = r.money, items = r.items, bag = r.bag.length;
    const cards = page.locator('.shop-section').first().locator('.item-card, .cons-card');
    for (let i = 0; i < r.shop.cards.length; i++) {
      const c = r.shop.cards[i];
      if (c.sold || c.kind === 'pip') continue;
      const el = cards.nth(i);
      const b = await el.boundingBox().catch(() => null); if (!b) continue;
      await moveTo(b.x + b.width / 2, b.y + b.height / 2); await sleep(650);
      if (money >= c.price && ((c.kind === 'item' && items < r.slots) || (c.kind === 'consumable' && bag < r.bagSlots))) {
        await page.mouse.down(); await page.mouse.up(); money -= c.price; if (c.kind === 'item') items++; else bag++;
        log('buy', { kind: c.kind }); await sleep(600);
      }
    }
    const packs = page.locator('.pack-card');
    let boughtPack = false;
    for (let i = 0; i < r.shop.packs.length; i++) {
      const p = r.shop.packs[i];
      if (p.sold || money < p.price) continue;
      if (!p.kind.includes('ball') && !p.kind.includes('mystery') && bag >= r.bagSlots) continue;
      if (p.kind.includes('mystery') && items >= r.slots) continue;
      await clickEl(packs.nth(i), { pause: 500 }); log('pack-open', { kind: p.kind }); boughtPack = true; await sleep(300); break;
    }
    if (boughtPack) continue;
    const r2 = await run();
    const k = r2.shop.keys.findIndex((x) => !x.sold && r2.money >= x.price + 2);
    if (k >= 0) { await clickEl(page.locator('.key-card').nth(k), { pause: 500 }); log('buy-key'); await sleep(600); }
    await clickEl(text('NEXT BATTLE ▶'), { pause: 300 });
    await sleep(900);
    continue;
  }
  if (r.phase === 'battle' && r.battle) {
    const key = `${r.region}-${r.bi}-${r.battle.name}`;
    if (key !== lastBattleKey) { lastBattleKey = key; log('battle-start', { kind: r.battle.kind, name: r.battle.name, hp: r.battle.hp, region: r.region }); }
    if (r.battle.played || await vis('.btn-attack:disabled') && r.battle.sel > 0) { await sleep(150); continue; }
    // use TMs / candies from the bag
    const tmIdx = r.bag.findIndex((d) => d.startsWith('tm_') || ['ppmax', 'goldbottlecap', 'masterball', 'candybag', 'movetutor'].includes(d));
    if (tmIdx >= 0) { await clickEl(page.locator('.bag-dock .cons-card').nth(tmIdx), { pause: 450 }); log('use', { id: r.bag[tmIdx] }); await sleep(900); continue; }
    if (r.bag.includes('rarecandy')) {
      const ev = await page.evaluate(() => window.__pk.evolvable().slice(0, 2));
      if (ev.length) {
        for (const u of ev) { await clickEl(page.locator(`.hand-cards [data-uid="${u}"]`), { fy: 0.35 }); await sleep(200); }
        await sleep(300);
        await clickEl(page.locator('.bag-use .btn', { hasText: 'Growth Tonic' })); log('evolve'); await sleep(1700); continue;
      }
    }
    const best = await page.evaluate(() => window.__pk.bestPlay());
    if (!best) { await sleep(300); continue; }
    const pick = best.discard ?? best.uids;
    for (let attempt = 0; attempt < 4; attempt++) {
      const cur = (await run())?.battle?.selected ?? [];
      const todo = [...pick.filter((u) => !cur.includes(u)), ...cur.filter((u) => !pick.includes(u))];
      if (!todo.length) break;
      for (const u of todo) { await clickEl(page.locator(`.hand-cards [data-uid="${u}"]`), { fy: 0.35, pause: 70 }); await page.waitForTimeout(SCOUT ? 40 : 130); }
      await page.waitForTimeout(120);
    }
    await sleep(350);
    if (best.discard) { await clickEl(text('DISCARD')); log('discard', { n: pick.length }); await sleep(900); continue; }
    const lethal = best.damage >= r.battle.hp - r.battle.dmg;
    log('attack', { damage: best.damage, hand: best.type, lethal, name: r.battle.name, kind: r.battle.kind });
    await clickEl(text('ATTACK'));
    await moveTo(880, 520);
    // wait for the scoring animation to finish
    for (let i = 0; i < 400; i++) { await page.waitForTimeout(SCOUT ? 30 : 120); const s = await run(); if (!s || s.phase !== 'battle' || (s.battle && !s.battle.played && !(await vis('.btn-attack:disabled')))) break; if (s.battle && !s.battle.played && s.battle.sel === 0 && i > 8) { const dis = await page.locator('.hand-actions .btn-discard').isDisabled().catch(() => true); if (dis) break; } }
    log('attack-done');
    await sleep(500);
    continue;
  }
  await sleep(200);
}
const final = await run();
console.log(`RESULT seed=${SEED} starter=${STARTER} region=${final?.region} bi=${final?.bi} phase=${final?.phase} badges=${final?.badges} shops=${shopVisits} time=${((Date.now() - t0) / 1000).toFixed(0)}s errors=${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`);
if (!SCOUT) {
  const a = await page.evaluate(() => window.__pk.stopAudio());
  if (a.b64) fs.writeFileSync(`${OUT}/sfx.webm`, Buffer.from(a.b64, 'base64'));
  await cdp.send('Page.stopScreencast').catch(() => {});
  await page.waitForTimeout(500);
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify({ t0, audioStartedAt: a.startedAt, events, frames }, null, 0));
  console.log('frames', frames.length);
}
await browser.close();
