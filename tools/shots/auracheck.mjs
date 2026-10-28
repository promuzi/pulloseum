// 걸려 있는 효과 지속 표시 촬영: 효과를 미리 건 전투(고르는 차례)를 2초씩 → 장면 셋 + 이어 붙인 MP4
// node tools/shots/auracheck.mjs <출력 폴더> "내 종|상대 종|미리 걸기(pre)|보이는 효과 바로(foe=burn,poison;me=stun)" … (2026-10-29 CHANGELOG 335)
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
const out = process.argv[2], cases = process.argv.slice(3).map(s => s.split('|'));
mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const frames = [], report = [];
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  for (let ci = 0; ci < cases.length; ci++) {
    const [me, foe, pre, direct] = cases[ci];
    const info = await p.evaluate((me, foe, pre, direct) => {
      try { window.__shot('battle', { venue: 'colosseum', seed: '5', me, foe, energy: '6', pre }, { scale: 2 }); } catch (e) { return 'ERR ' + e.message; }
      const a = window.__app, cv = document.createElement('canvas'); cv.width = 540; cv.height = 760;
      const cx = cv.getContext('2d'); cx.setTransform(2, 0, 0, 2, 0, 0); cx.imageSmoothingEnabled = false; cx.translate(Math.max(0, (270 - a.W) / 2), 0);
      a.g.ctx = cx; a.pxScale = 2; window.__vid = { cv, t: 2000 };
      const sc = a.router.cur;
      for (const part of direct.split(';').filter(Boolean)) { const [w, ids] = part.split('='); sc.v.eff[w] = ids.split(',').map(t => { const m = t.match(/^([a-zA-Z]+)(\d*)$/); return { id: m[1], n: +(m[2] || 1) }; }); }   // 화면 확인용: 보이는 효과 목록에 바로
      return JSON.stringify({ me: (sc.v.eff.me || []).map(s => s.id + (s.n > 1 ? s.n : '')), foe: (sc.v.eff.foe || []).map(s => s.id + (s.n > 1 ? s.n : '')) });
    }, me, foe, pre, direct || '');
    report.push(`${ci}: ${me} vs ${foe} [${pre}] → ${info}`);
    for (let i = 0; i < 44; i++) {
      const r = await p.evaluate(() => { const a = window.__app, V = window.__vid; V.t += 50; a.t = V.t; a.input.begin(); a.router.draw(a); return V.cv.toDataURL('image/png'); });
      const buf = Buffer.from(r.split(',')[1], 'base64');
      frames.push(decodePNG(buf));
      if (i === 14 || i === 26 || i === 38) writeFileSync(resolve(out, `c${ci}_${i}.png`), buf);
    }
  }
  if (errs.length) report.push('페이지 오류: ' + errs.join(' | '));
} finally { await b.close(); srv.close(); }
console.log(report.join('\n'));
writeMP4(resolve(out, 'auras.mp4'), frames, { delay: 5, loops: 1, fps: 20, zoom: 1 });
