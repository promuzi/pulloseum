// 기술 공격 모션 촬영: 실제 전투에서 그 기술을 골라 '내 공격' 단계를 찍음 → 기술마다 예고 · 맞음 · 넘침 세 장 + (선택) 이어 붙인 MP4
// node tools/shots/skillmotions.mjs <출력 폴더> <종:기술[@미리 걸기],…> [--mp4] [--foe=종] — 예: stone_cap:u_stone_1,thorn:u_thorn_3c@me:thornTrap2 (2026-10-29 CHANGELOG 334)
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
const out = process.argv[2], list = process.argv[3].split(',').map(s => { const [a, pre] = s.split('@'); return [...a.split(':'), pre || null]; }), mp4 = process.argv.includes('--mp4');
const foeKey = (process.argv.find(a => a.startsWith('--foe=')) || '--foe=aqua').slice(6);
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
  for (const [sp, id, pre] of list) {
    await p.evaluate((sp, id, foe, pre) => {
      window.__shot('battle', { venue: 'colosseum', seed: '7', me: sp, foe, energy: '8', hand: id, stage: 'mature', ...(pre ? { pre } : {}) }, { scale: 2 });
      const a = window.__app, cv = document.createElement('canvas'); cv.width = 540; cv.height = 760;
      const cx = cv.getContext('2d'); cx.setTransform(2, 0, 0, 2, 0, 0); cx.imageSmoothingEnabled = false; cx.translate(Math.max(0, (270 - a.W) / 2), 0);
      a.g.ctx = cx; a.pxScale = 2;
      const sc = a.router.cur;
      for (const w of ['me', 'foe']) { const u = sc.B[w]; u.max = u.hp = u.max * 4; sc.v.hp[w] = u.hp; sc.v.bar[w].main = sc.v.bar[w].trail = u.hp; }
      window.__vid = { cv, t: 1000, picked: false, at: null };
    }, sp, id, foeKey, pre);
    let shotN = 0, rec = 0, info = null;
    for (let i = 0; i < 400; i++) {
      const r = await p.evaluate((id, want) => {
        const a = window.__app, sc = a.router.cur, V = window.__vid;
        V.t += 50; a.t = V.t; a.input.begin();
        if (!V.picked && sc.v && sc.v.phase === 'pick' && a.t > 1600) { const sk = sc.B.me.kit.find(k => k.id === id); if (sk) { sc.pick(a, sk); V.picked = true; } else { V.picked = 'none'; } }
        a.router.draw(a);
        const st = sc.v && sc.v.phase === 'play' ? sc.v.steps[sc.v.si] : null, mine = st && st.kind === 'attack' && st.who === 'me';
        if (mine && V.at == null) V.at = { t: a.t, I: st.anim.I, skill: st.skill.name, kind: st.anim.A ? st.anim.A.kind : null };
        const age = V.at ? a.t - V.at.t : -1;
        return { phase: sc.v ? sc.v.phase : 'gone', picked: V.picked, mine, age, at: V.at, url: want || (V.at && age >= 0 && age < 2600) ? V.cv.toDataURL('image/png') : null, n: (sc.v && sc.v.steps || []).map(s => s.kind + (s.who ? ':' + s.who : '')).join(' ') };
      }, id, mp4 && rec > 0);
      if (r.picked === 'none') { report.push(`${id}: 손패에 없음`); break; }
      if (r.at) info = r.at;
      if (r.url && r.age >= 0) {
        const buf = Buffer.from(r.url.split(',')[1], 'base64');
        if (mp4) frames.push(decodePNG(buf));
        const I = (info.I + 1) * 50, marks = [['a', I - 250], ['i', I + 50], ['e', I + 450]];
        for (const [tag, ms] of marks) if (r.age >= ms && r.age < ms + 50) { writeFileSync(resolve(out, `${id}_${tag}.png`), buf); shotN++; }
        rec++;
      }
      if (info && r.age >= 2600) break;
      if (r.phase === 'pick' && r.picked === true && i > 60 && !info) { report.push(`${id}: 내 공격 단계 없음(${r.n})`); break; }
    }
    report.push(`${id}: ${info ? `${info.skill} · ${info.kind} · 장 ${shotN}` : '못 찍음'}`);
  }
  if (errs.length) report.push('페이지 오류: ' + errs.join(' | '));
} finally { await b.close(); srv.close(); }
console.log(report.join('\n'));
if (mp4 && frames.length) writeMP4(resolve(out, 'motions.mp4'), frames, { delay: 5, loops: 1, fps: 20, zoom: 1 });
