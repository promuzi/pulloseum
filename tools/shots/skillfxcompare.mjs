// 전투 한 토막 촬영(2026-10-29 CHANGELOG 354 ~ 356): 같은 전투(씨앗 고정 · 싹둑마마 대 프로스트벨)를 진행해 MP4 + 원하는 순간 PNG — 기술 카드 · 카드 더미 연출을 볼 때
//  기술 카드 뜨는 방식 시안 넷(㉠ ~ ㉣)을 나란히 견줄 때 만든 도구 — 사용자가 ㉣ 옆에 큰 카드로 정해(356) 시안 줄은 게임에서 지움. 지금은 한 칸(--modes 없음)으로 씀
//  --modes = 쉼표로 주소 ?skillfx= 값(지금은 게임이 안 읽음 — 나중에 시안을 다시 견줄 때 그 이름으로 되살림) · --cols = 한 줄 칸 수 · --scale = 칸 크기(2배 화면 기준)
//  --crop = 2배 화면에서 자를 위 · 아래(기본 40,720 = 경기장 + 체력판) · --loops = 영상 되풀이 · --step = 한 장에 넘기는 ms(25 = 반 빠르기)
// node tools/shots/skillfxcompare.mjs <출력 폴더> <시작ms> <끝ms> [찍을 ms,…] [--crop=40,720 --step=50 --loops=1]
//  예: node tools/shots/skillfxcompare.mjs tools/shots/out/cardpile 3900 21800 6800,21300
//      (프로스트벨 아침이에요. → 싹둑마마 무릎 꿇어라(상대 카드가 더미로) → 깨트려드리죠. · 메아리 → 지옥전개(두 번째 카드가 더미 맨 위로))
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), U = p => pathToFileURL(resolve(repo, p)).href;
const require = createRequire(resolve(repo, 'tools/shots/package.json')), puppeteer = require('puppeteer-core');
const { serve } = await import(U('tools/shots/static-server.mjs'));
const { writeMP4Files } = await import(U('tools/pixel/big/video.mjs'));
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const out = resolve(process.argv[2]), T0 = +process.argv[3], T1 = +process.argv[4], SNAPS = (process.argv[5] || '').split(',').filter(s => /^\d+$/.test(s)).map(Number);
const STEP = +arg('step', 50), MODES = arg('modes', '').split(','), COLS = +arg('cols', Math.min(2, MODES.length)), SC = +arg('scale', MODES.length > 2 ? 0.75 : 1), [C0, C1] = arg('crop', '40,720').split(',').map(Number), LOOPS = +arg('loops', 1);
const LABEL = { '': '지금', card: '㉠ 띠 끝 작은 카드', flip: '㉡ 머리 위 카드 뒤집기', strip: '㉢ 그림 띠', side: '㉣ 옆에 큰 카드' };
const CW = Math.round(540 * SC), LH = MODES.length > 1 ? Math.round(30 * SC) + 4 : 0, CH = Math.round((C1 - C0) * SC) + LH, GAP = 8, ROWS = Math.ceil(MODES.length / COLS);
const GW = (COLS * CW + (COLS - 1) * GAP + 1) & ~1, GH = (ROWS * CH + (ROWS - 1) * GAP + 1) & ~1;
const ME = 'blade_vine', FOE = 'frost_bell', HAND = 'u_blade_3,u_blade_1,u_blade_2b', PICKS = ['u_blade_3', 'u_blade_1', 'basic'];
mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const dir = mkdtempSync(join(tmpdir(), 'pullo-skillfx-')), files = [], errs = [];
try {
  const pages = [];
  for (const m of MODES) {   // 시안마다 한 창(시안 = 주소 ?skillfx= — 기술 카드 상태가 시안마다 달라 한 창에서 바꿔 그릴 수 없음)
    const p = await b.newPage();
    p.on('pageerror', e => errs.push(`${m || '지금'}: ${e.message}`));
    await p.goto(url + '/v2/index.html?scene=title' + (m ? '&skillfx=' + m : ''), { waitUntil: 'load' });
    await p.waitForFunction(() => window.__ready, { timeout: 15000 });
    await p.evaluate((ME, FOE, HAND, CW, CH, LH) => {
      window.__shot('battle', { venue: 'colosseum', seed: '11', me: ME, foe: FOE, energy: '8', hand: HAND, stage: 'mature' }, { scale: 2 });
      const a = window.__app, cv = document.createElement('canvas'); cv.width = 540; cv.height = 1200;
      const cx = cv.getContext('2d'); cx.setTransform(2, 0, 0, 2, 0, 0); cx.imageSmoothingEnabled = false; cx.translate(Math.max(0, (270 - a.W) / 2), 0);
      a.g.ctx = cx; a.pxScale = 2;
      const cell = document.createElement('canvas'); cell.width = CW; cell.height = CH;
      window.__vid = { cv, cell, n: 0, t: 1000, wait: 0 };
    }, ME, FOE, HAND, CW, CH, LH);
    pages.push(p);
  }
  const comp = await b.newPage();
  await comp.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  const step = (p, m) => p.evaluate((PICKS, T0, T1, C0, C1, LH, label, STEP) => {
    const a = window.__app, sc = a.router.cur, V = window.__vid, v = sc.v;
    V.t += STEP; a.t = V.t; a.input.begin();
    if (v.phase === 'pick' && V.n < PICKS.length) {
      if (!V.wait) V.wait = a.t + 700;
      if (a.t >= V.wait) { const want = PICKS[V.n], sk = sc.B.me.kit.find(k => k.id === want && (k.cost || 0) <= sc.B.me.energy) || sc.B.me.kit.find(k => k.id === 'basic'); sc.pick(a, sk); V.n++; V.wait = 0; }
    }
    a.router.draw(a);
    if (a.t < T0 || a.t > T1) return { t: a.t, done: a.t > T1 };
    const c = V.cell.getContext('2d'); c.fillStyle = '#0e1220'; c.fillRect(0, 0, V.cell.width, V.cell.height);
    if (LH) { c.fillStyle = '#d6e4fa'; c.font = `800 ${LH - 8}px Pretendard, "Malgun Gothic", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, V.cell.width / 2, LH / 2); }
    c.imageSmoothingEnabled = true; c.drawImage(V.cv, 0, C0, 540, C1 - C0, 0, LH, V.cell.width, V.cell.height - LH);
    return { t: a.t, url: V.cell.toDataURL('image/png'), done: false };
  }, PICKS, T0, T1, C0, C1, LH, LABEL[m] ?? m, STEP);
  for (let i = 0; i < 40000 / STEP; i++) {
    const rs = await Promise.all(pages.map((p, j) => step(p, MODES[j])));
    if (rs[0].url) {
      const grid = await comp.evaluate(async (urls, COLS, CW, CH, GAP, GW, GH) => {
        const ims = await Promise.all(urls.map(u => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = u; })));
        const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; const c = cv.getContext('2d'); c.fillStyle = '#0e1220'; c.fillRect(0, 0, GW, GH);
        ims.forEach((im, k) => c.drawImage(im, (k % COLS) * (CW + GAP), Math.floor(k / COLS) * (CH + GAP)));
        return cv.toDataURL('image/png');
      }, rs.map(r => r.url), COLS, CW, CH, GAP, GW, GH);
      const buf = Buffer.from(grid.split(',')[1], 'base64'), n = `f${String(files.length).padStart(4, '0')}.png`;
      writeFileSync(join(dir, n), buf); files.push(n);
      if (SNAPS.some(s => Math.abs(s - rs[0].t) < 25)) writeFileSync(resolve(out, `grid_${rs[0].t}.png`), buf);
    }
    if (rs[0].done) break;
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
  const seq = []; for (let k = 0; k < LOOPS; k++) seq.push(...files);
  writeMP4Files(resolve(out, 'compare.mp4'), dir, seq, { fps: 20, w: GW, h: GH, crf: 'HIGH' });
  console.log('장', files.length, '· 칸', `${MODES.length}개(${COLS}줄씩)`, '·', `${GW}×${GH}`);
} finally { await b.close(); srv.close(); rmSync(dir, { recursive: true, force: true }); }
