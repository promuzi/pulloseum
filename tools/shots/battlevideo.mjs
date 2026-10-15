// v2 전투 한 판을 장마다 그려 MP4로(사람이 보는 실제 진행 영상). 헤드리스 크롬에서 시간(app.t)을 50ms씩 직접 넘기며 그리고,
// 고를 차례가 오면 정해진 순서대로 기술을 누른다. → tools/shots/out/battle_<경기장>_<씨앗>.mp4(기본 2배 — 3배 810×1800은 휴대폰 H.264 수준을 넘을 수 있음)
// 사용: node tools/shots/battlevideo.mjs [--venue garden] [--seed 11] [--sec 40] [--picks s1,s1,evade,s2,...]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const { decodePNG } = await import('../pixel/big/engine.mjs');
const { writeMP4 } = await import('../pixel/big/video.mjs');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const venue = args.venue || 'garden', seed = +(args.seed || 11), sec = +(args.sec || 40), picks = String(args.picks || 's1,s1,evade,s2,s1,guard,s2,s1,basic').split(',');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const frames = [];
try {
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + `/v2/index.html?scene=title`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate((venue, seed) => {
    const a = window.__app;
    window.__vid = { cv: document.createElement('canvas'), n: 0 };
    const V = window.__vid; V.cv.width = 270; V.cv.height = 600;
    V.ctx = V.cv.getContext('2d'); V.ctx.imageSmoothingEnabled = false;
    V.real = a.g.ctx; a.g.ctx = V.ctx; a.W = 270; a.H = 600;
    a.router.set('battle', { venue, seed: String(seed) });
  }, venue, seed);
  const N = Math.round(sec * 20);
  for (let i = 0; i < N; i++) {
    const r = await p.evaluate((i, picks) => {
      const a = window.__app, sc = a.router.cur, V = window.__vid;
      a.t = 1000 + i * 50; a.input.begin();
      if (a.router.name === 'battle' && sc.v.phase === 'pick') {
        const want = picks[V.n % picks.length], B = sc.B;
        const sk = B.me.kit.find(k => k.id === want && (k.cost || 0) <= B.me.energy) || B.me.kit.find(k => k.id === 'basic');
        if (!V.waitUntil) V.waitUntil = a.t + 900;   // 고르기 전에 잠깐 멈춰 화면을 보여 줌
        if (a.t >= V.waitUntil) { sc.pick(a, sk); V.n++; V.waitUntil = 0; }
      }
      a.router.draw(a);
      return { url: V.cv.toDataURL('image/png'), scene: a.router.name };
    }, i, picks);
    frames.push(decodePNG(Buffer.from(r.url.split(',')[1], 'base64')));
    if (r.scene === 'result' && frames.length > 60) { for (let k = 0; k < 40 && i + k < N; k++) { const r2 = await p.evaluate(j => { const a = window.__app; a.t = 1000 + j * 50; a.router.draw(a); return window.__vid.cv.toDataURL('image/png'); }, i + k + 1); frames.push(decodePNG(Buffer.from(r2.split(',')[1], 'base64'))); } break; }
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
} finally { await b.close(); srv.close(); }
const out = resolve(outDir, `battle_${venue}_${seed}.mp4`);
writeMP4(out, frames, { delay: 5, loops: 1, fps: 20, zoom: +(args.zoom || 2) });
console.log('장', frames.length);
