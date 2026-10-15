// 지금 움직임 ↔ '차분하게'(MOTION.calm) 나란히 비교 영상(2026-10-15 "픽셀이 너무 지글거려서 어지럽다는 평가 — 해결책 분석"):
//   node tools/shots/calmcompare.mjs --scene home --sec 6 [--params '{...}'] [--act "ms:js"] --out calm_home
//   → tools/shots/out/<out>.mp4 (2배 캔버스 두 개를 가로로, 왼쪽 = 지금 · 오른쪽 = 차분하게). 페이지 둘을 따로 띄워 상태가 섞이지 않게.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
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
const scene = get('scene') || 'home', sec = +(get('sec') || 5), out = get('out') || 'calm_' + scene, params = JSON.parse(get('params') || '{}'), K = 2;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const pages = [], frames = [];
try {
  for (const calm of [false, true]) {
    const p = await b.newPage();
    await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
    await p.waitForFunction(() => window.__ready, { timeout: 15000 });
    await p.evaluate((scene, params, K, calm) => { window.__pause(true); window.__calm = calm; const a = window.__app; const cv = document.createElement('canvas'); cv.width = 270 * K; cv.height = 600 * K; const ctx = cv.getContext('2d'); ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = false; window.__vcv = cv; a.g.ctx = ctx; a.W = 270; a.H = 600; a.pxScale = K; a.router.set(scene, params); }, scene, params, K, calm);
    pages.push(p);
  }
  const N = Math.round(sec * 30), done = [new Set(), new Set()];
  for (let i = 0; i < N; i++) {
    const t = 1000 + i * 33, pair = [];
    for (let k = 0; k < 2; k++) {
      const p = pages[k];
      for (const [j, ac] of acts.entries()) if (!done[k].has(j) && t - 1000 >= ac.t) { done[k].add(j); await p.evaluate((js, tt) => { const a = window.__app; a.t = tt; const sc = a.router.cur; eval(js); }, ac.js, t); }
      const u = await p.evaluate(tt => { const a = window.__app; a.t = tt; a.input.begin(); a.router.draw(a); return window.__vcv.toDataURL('image/png'); }, t);
      pair.push(decodePNG(Buffer.from(u.split(',')[1], 'base64')));
    }
    const G = 12, o = new Img(pair[0].w * 2 + G, pair[0].h, '#000000');
    o.blit(pair[0], 0, 0); o.blit(pair[1], pair[0].w + G, 0);
    frames.push(o);
  }
} finally { await b.close(); srv.close(); }
writeMP4(resolve(outDir, out + '.mp4'), frames, { delay: 3.3, loops: 1, fps: 30, zoom: 1 });
console.log('장', frames.length);
