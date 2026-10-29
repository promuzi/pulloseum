// 기술 · 상태 이상 구분 시안 비교 촬영(2026-10-29 CHANGELOG 354): 같은 전투를 한 번 진행하며 장마다 두 번 그림(왼쪽 = 지금 · 오른쪽 = ?skillfx=card ㉠)
//  → 나란히 붙인 MP4 + 원하는 순간 PNG. --left = 지금 한 칸만(상대 카드가 더미로 가는 연출 확인용) · --loops=N = 영상 되풀이
// node tools/shots/skillfxcompare.mjs <출력 폴더> <시작ms> <끝ms> [찍을 ms,…] [--left] [--loops=2]
//  예: node tools/shots/skillfxcompare.mjs tools/shots/out/skillfx 3900 18300 6800,14100   (프로스트벨 아침이에요. → 싹둑마마 무릎 꿇어라 → 깨트려드리죠.)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), U = p => pathToFileURL(resolve(repo, p)).href;
const require = createRequire(resolve(repo, 'tools/shots/package.json')), puppeteer = require('puppeteer-core');
const { serve } = await import(U('tools/shots/static-server.mjs'));
const { decodePNG } = await import(U('tools/pixel/big/engine.mjs'));
const { writeMP4 } = await import(U('tools/pixel/big/video.mjs'));
const out = resolve(process.argv[2]), T0 = +process.argv[3], T1 = +process.argv[4], SNAPS = (process.argv[5] || '').split(',').filter(s => /^\d+$/.test(s)).map(Number);
const LEFT = process.argv.includes('--left'), LOOPS = +((process.argv.find(a => a.startsWith('--loops=')) || '--loops=1').slice(8));
const ME = 'blade_vine', FOE = 'frost_bell', HAND = 'u_blade_3,u_blade_1,u_blade_2b', PICKS = ['u_blade_3', 'u_blade_1', 'basic'];
mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const frames = [];
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate((ME, FOE, HAND, LEFT) => {
    window.__shot('battle', { venue: 'colosseum', seed: '11', me: ME, foe: FOE, energy: '8', hand: HAND, stage: 'mature' }, { scale: 2 });
    const a = window.__app, cv = document.createElement('canvas'); cv.width = 540; cv.height = 1200;
    const cx = cv.getContext('2d'); cx.setTransform(2, 0, 0, 2, 0, 0); cx.imageSmoothingEnabled = false; cx.translate(Math.max(0, (270 - a.W) / 2), 0);
    a.g.ctx = cx; a.pxScale = 2;
    const both = document.createElement('canvas'); both.width = LEFT ? 540 : 1092; both.height = LEFT ? 740 : 772;   // 두 장(540) + 사이 12 · 위 글 32 + 경기장(2배 y 40~780)
    window.__vid = { cv, both, n: 0, t: 1000, wait: 0 };
  }, ME, FOE, HAND, LEFT);
  for (let i = 0; i < 700; i++) {
    const r = await p.evaluate((PICKS, T0, T1, LEFT) => {
      const a = window.__app, sc = a.router.cur, V = window.__vid, v = sc.v;
      V.t += 50; a.t = V.t; a.input.begin();
      if (v.phase === 'pick' && V.n < PICKS.length) {
        if (!V.wait) V.wait = a.t + 700;
        if (a.t >= V.wait) { const want = PICKS[V.n], sk = sc.B.me.kit.find(k => k.id === want && (k.cost || 0) <= sc.B.me.energy) || sc.B.me.kit.find(k => k.id === 'basic'); sc.pick(a, sk); V.n++; V.wait = 0; }
      }
      const B2 = V.both.getContext('2d');
      if (a.t < T0 || a.t > T1) { a.router.draw(a); return { t: a.t, done: a.t > T1 }; }
      B2.fillStyle = '#0e1220'; B2.fillRect(0, 0, V.both.width, V.both.height);
      window.__skillfx = ''; a.router.draw(a);
      if (LEFT) { B2.drawImage(V.cv, 0, 40, 540, 740, 0, 0, 540, 740); return { t: a.t, url: V.both.toDataURL('image/png'), done: false }; }
      B2.fillStyle = '#d6e4fa'; B2.font = '800 22px Pretendard, "Malgun Gothic", sans-serif'; B2.textAlign = 'center';
      B2.drawImage(V.cv, 0, 40, 540, 740, 0, 32, 540, 740); B2.fillText('지금', 270, 24);
      window.__skillfx = 'card'; a.router.draw(a); B2.drawImage(V.cv, 0, 40, 540, 740, 552, 32, 540, 740); B2.fillText('시안 ㉠', 552 + 270, 24);
      window.__skillfx = '';
      return { t: a.t, url: V.both.toDataURL('image/png'), done: false };
    }, PICKS, T0, T1, LEFT);
    if (r.url) {
      const buf = Buffer.from(r.url.split(',')[1], 'base64');
      frames.push(decodePNG(buf));
      if (SNAPS.some(s => Math.abs(s - r.t) < 25)) writeFileSync(resolve(out, `pair_${r.t}.png`), buf);
    }
    if (r.done) break;
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
} finally { await b.close(); srv.close(); }
writeMP4(resolve(out, LEFT ? 'pile.mp4' : 'compare.mp4'), frames, { delay: 5, loops: LOOPS, fps: 20, zoom: 1 });
console.log('장', frames.length);
