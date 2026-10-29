// 막는 효과(둘레 원) 흐름 촬영: 생김(톡) → 막음(번쩍) → 없어짐(보호막 · 튕김 = 조각 · 갑주 = 판이 떨어짐 · 자세 = 스르르)을 시간표대로 → 장면 몇 장 + MP4
// node tools/shots/barrierflow.mjs <출력 폴더> [내 종] [상대 종] (2026-10-29 CHANGELOG 339 — 규칙 없이 화면 목록 · 자세만 바꿔 연출을 봄. 실제 진행은 guardflow · battlevideo)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), shots = resolve(repo, 'tools/shots'), U = p => pathToFileURL(resolve(repo, p)).href;
const require = createRequire(resolve(shots, 'package.json'));
const puppeteer = require('puppeteer-core');
const { serve } = await import(U('tools/shots/static-server.mjs'));
const { decodePNG } = await import(U('tools/pixel/big/engine.mjs'));
const { writeMP4 } = await import(U('tools/pixel/big/video.mjs'));
const out = process.argv[2], me = process.argv[3] || 'aqua', foe = process.argv[4] || 'cactus_fire';
mkdirSync(out, { recursive: true });
// 시간표(ms): eff = 보이는 효과 목록 · stance = 이 턴 자세 · hit = 막는 순간(번쩍) · label = 그 장면 이름(그림 저장)
const PLAN = [
  [600, { eff: { me: ['shield'], foe: ['armor'] } }],
  [1500, { hit: ['me', 'shield'] }], [1700, { label: 'hit_shield' }],
  [1900, { hit: ['foe', 'armor'] }], [2050, { label: 'hit_armor' }],
  [2600, { eff: { me: [], foe: [] } }], [2780, { label: 'break' }],
  [3700, { stance: { me: { kind: 'guard', active: true }, foe: { kind: 'reflect', active: true } } }], [4300, { label: 'stance' }],
  [4600, { hit: ['me', 'guard'] }], [5000, { hit: ['foe', 'reflect'] }],
  [5800, { stance: {} }],
  [6300, { eff: { me: ['bounce'], foe: ['shield', 'armor'] } }], [7000, { label: 'bounce' }],
  [7300, { hit: ['me', 'bounce'] }],
  [8100, { eff: { me: [], foe: ['armor'] } }],
  [9200, { end: true }],
];
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const frames = [], notes = [];
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const info = await p.evaluate((me, foe) => {
    try { window.__shot('battle', { venue: 'colosseum', seed: '5', me, foe, energy: '6' }, { scale: 2 }); } catch (e) { return 'ERR ' + e.message; }
    const a = window.__app, cv = document.createElement('canvas'); cv.width = 540; cv.height = 760;
    const cx = cv.getContext('2d'); cx.setTransform(2, 0, 0, 2, 0, 0); cx.imageSmoothingEnabled = false; cx.translate(Math.max(0, (270 - a.W) / 2), 0);
    a.g.ctx = cx; a.pxScale = 2; window.__vid = { cv, t: 2000, t0: 2000 };
    const sc = a.router.cur; sc.v.eff.me = []; sc.v.eff.foe = [];
    return 'ok';
  }, me, foe);
  notes.push(`${me} vs ${foe}: ${info}`);
  let pi = 0;
  for (let ms = 0; ; ms += 50) {
    const due = [];
    while (pi < PLAN.length && PLAN[pi][0] <= ms) due.push(PLAN[pi++][1]);
    if (due.some(d => d.end)) break;
    const r = await p.evaluate(due => {
      const a = window.__app, V = window.__vid, sc = a.router.cur;
      V.t += 50; a.t = V.t;
      for (const d of due) {
        if (d.eff) for (const w of Object.keys(d.eff)) sc.v.eff[w] = d.eff[w].map(id => ({ id }));
        if (d.stance) sc.v.stance = d.stance;
        if (d.hit) { const S = (sc.bars ||= {}); const s = (S[d.hit[0]] ||= { uid: null, on: {}, pops: [] }); s.hit = { k: d.hit[1], t: V.t }; }
      }
      a.input.begin(); a.router.draw(a);
      return V.cv.toDataURL('image/png');
    }, due);
    const buf = Buffer.from(r.split(',')[1], 'base64');
    frames.push(decodePNG(buf));
    for (const d of due) if (d.label) writeFileSync(resolve(out, `${d.label}.png`), buf);
  }
  if (errs.length) notes.push('페이지 오류: ' + errs.join(' | '));
} finally { await b.close(); srv.close(); }
console.log(notes.join('\n'));
writeMP4(resolve(out, 'barriers.mp4'), frames, { delay: 5, loops: 2, fps: 20, zoom: 1 });
