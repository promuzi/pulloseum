// 스마트팜 끌기 중 몇 장(서랍이 들썩이는 순간 확인): node tools/shots/nurseryscroll.mjs [--v 줄/초] [--ms 0,80,160,...]
//  → tools/shots/out/nscroll/f_<ms>.png (×4)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const V = +(args.v || 5), MS = String(args.ms || '0,60,120,200,320,500').split(',').map(Number), sel = args.sel || null;
const out = resolve(here, 'out', 'nscroll'); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 270, height: 600, deviceScaleFactor: 4 });
  await p.goto(url + '/v2/index.html?scene=nursery&offline=1&mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate(() => { window.__pause(true); });
  const t0 = await p.evaluate(() => window.__app.t + 100);
  for (let k = 0; k < 20; k++) await p.evaluate(t => window.__frame(t), t0 + k * 33);
  const T = t0 + 700;
  await p.evaluate((T, V, sel) => {
    const sc = window.__app.router.cur;
    if (sel) { const it = /^\d+$/.test(sel) ? sc.order[+sel] : sc.order.find(x => x.p && x.p.key === sel); if (it) { sc.prevSel = sc.sel; sc.prevT = T; sc.sel = it.id; sc.selT = T; } }
    else sc.auto = { t0: T, dur: 260, v: V };
  }, T, V, sel);
  let last = T;
  for (const ms of MS) {
    for (let tt = last; tt <= T + ms; tt += 16) await p.evaluate(t => window.__frame(t), tt);
    last = T + ms + 16;
    const shot = await p.screenshot({ type: 'png' });
    writeFileSync(resolve(out, `f_${ms}.png`), shot);
    console.log('saved', ms);
  }
} finally { await b.close(); srv.close(); }
