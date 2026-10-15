// 한 장면을 시간(app.t)을 직접 넘기며 그려 MP4로 — 정해진 때에 장면 상태를 바꾸는 동작을 끼워 넣음(누르기 흉내 등).
//   node tools/shots/scenevideo.mjs --scene nursery --sec 4 --act "1200:sc.sel=1;sc.selT=a.t" --act "2600:sc.sel=2;sc.selT=a.t" --out nursery_lift
//   (동작 = "밀리초:자바스크립트", a = 앱, sc = 지금 장면) → tools/shots/out/<out>.mp4(2배)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const { decodePNG, Img } = await import('../pixel/big/engine.mjs');
const { writeMP4 } = await import('../pixel/big/video.mjs');
const argv = process.argv.slice(2), get = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const acts = argv.flatMap((a, i) => (a === '--act' ? [argv[i + 1]] : [])).map(s => { const j = s.indexOf(':'); return { t: +s.slice(0, j), js: s.slice(j + 1) }; });
const scene = get('scene') || 'nursery', sec = +(get('sec') || 4), out = get('out') || scene + '_video', params = JSON.parse(get('params') || '{}');
const K = +(get('scale') || 1);   // 2 = 기기처럼 2배 캔버스에 그림(글자·확대 카메라가 실제와 같게), 영상은 그대로 2배 크기
const pngAt = (get('png') || '').split(',').filter(Boolean).map(Number);   // 검토용: 이 밀리초의 장면을 PNG로도(out/<out>_<ms>.png)
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const CROP = (get('crop') || '').split(',').filter(Boolean).map(Number);   // --crop x,y,w,h = 그 구역만(논리 칸) — 체력판·식물처럼 작은 데를 크게 볼 때
const cropIt = im => { if (CROP.length !== 4) return im; const [cx, cy, cw, ch] = CROP.map(v => v * (typeof K === 'number' ? K : 1)), o = new Img(cw, ch); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const k = ((cy + y) * im.w + cx + x) * 4; o.data.set(im.data.subarray(k, k + 4), (y * cw + x) * 4); } return o; };
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const frames = [];
try {
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate((scene, params, K) => { window.__pause && window.__pause(true); const a = window.__app; window.__vid = { cv: document.createElement('canvas') }; const V = window.__vid; V.cv.width = 270 * K; V.cv.height = 600 * K; V.ctx = V.cv.getContext('2d'); V.ctx.setTransform(K, 0, 0, K, 0, 0); V.ctx.imageSmoothingEnabled = false; a.g.ctx = V.ctx; a.W = 270; a.H = 600; a.pxScale = K; a.router.set(scene, params); }, scene, params, K);
  const N = Math.round(sec * 30), done = new Set();
  for (let i = 0; i < N; i++) {
    const t = 1000 + i * 33;
    for (const [k, ac] of acts.entries()) if (!done.has(k) && t - 1000 >= ac.t) { done.add(k); await p.evaluate((js, tt) => { const a = window.__app; a.t = tt; const sc = a.router.cur; eval(js); }, ac.js, t); }
    const u = await p.evaluate(tt => { const a = window.__app; a.t = tt; a.input.begin(); a.router.draw(a); return window.__vid.cv.toDataURL('image/png'); }, t);
    frames.push(cropIt(decodePNG(Buffer.from(u.split(',')[1], 'base64'))));
    const ms = t - 1000; if (pngAt.some(p => ms <= p && p < ms + 33)) writeFileSync(resolve(outDir, `${out}_${ms}.png`), Buffer.from(u.split(',')[1], 'base64'));
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
} finally { await b.close(); srv.close(); }
writeMP4(resolve(outDir, out + '.mp4'), frames, { delay: 3.3, loops: 1, fps: 30, zoom: +(get('zoom') || (K >= 2 ? 1 : 2)) });
console.log('장', frames.length);
