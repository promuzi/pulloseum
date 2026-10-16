// 장면 하나를 열고 JS를 실행한 뒤 시간을 넘겨 한 장(검토용): node tools/shots/evalshot.mjs --scene home --js "<코드>" [--ms 800] [--size 270x600] [--out 이름]
//  코드 안에서 app = window.__app, sc = 지금 장면. → tools/shots/out/eval/<이름>.png (×4)
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
const [VW, VH] = String(args.size || '270x600').split('x').map(Number), MS = +(args.ms || 800), name = args.out || 'shot';
const out = resolve(here, 'out', 'eval'); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 4 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + `/v2/index.html?scene=${args.scene || 'home'}&offline=1&mute=1${args.q ? '&' + args.q : ''}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate(() => window.__pause(true));
  const t0 = await p.evaluate(() => window.__app.t + 100);
  for (let k = 0; k < 10; k++) await p.evaluate(t => window.__frame(t), t0 + k * 33);
  if (args.js) await p.evaluate(code => { const app = window.__app, sc = app.router.cur; return new Function('app', 'sc', code)(app, sc); }, String(args.js));
  const T = t0 + 400;
  for (let tt = T; tt <= T + MS; tt += 16) await p.evaluate(t => window.__frame(t), tt);
  writeFileSync(resolve(out, name + '.png'), await p.screenshot({ type: 'png' }));
  console.log('saved', name, errs.length ? '오류 ' + errs.join(' | ') : '');
} finally { await b.close(); srv.close(); }
