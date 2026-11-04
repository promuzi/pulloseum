// 맞을 때 · 때릴 때 식물 몸에 생기는 가로 빈 줄 찾기(2026-11-04 사용자 '피격시 가로로 빈 선이 생김 공격할 때나 확인해봐'):
//  공격을 맞기 앞뒤로 찍어(25ms마다) 때리는 식물 · 맞는 식물 둘레를 잘라 크게 → tools/shots/out/poselines/<라벨>/<기술>_<ms>.png + 한 장 모음
//  node tools/shots/poselines.mjs --label before [--skills basic,f_ember,e_rock]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const label = arg('label') || 'now', skills = (arg('skills') || 'basic,f_ember,e_rock,a_breeze').split(','), out = resolve(here, 'out', 'poselines', label); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const MS = Array.from({ length: 17 }, (_, i) => -250 + i * 25);
const { srv, url } = await serve(arg('root') ? resolve(arg('root')) : repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 20000 });
  const meta = [];
  for (const sk of skills) for (const ms of MS) {
    const d = await p.evaluate((sk, ms) => window.__shot('battle', { phase: 'hit', venue: 'colosseum', use: sk, hitAt: String(ms), seed: '7' }, { scale: 3 }), sk, ms);
    const f = resolve(out, `${sk}_${String(ms + 1000).padStart(4, '0')}.png`); writeFileSync(f, Buffer.from(d.split(',')[1], 'base64'));
    if (ms === MS[0]) meta.push(await p.evaluate(sk => { const s = window.__app.router.cur, W = window.__app.W, ox = Math.floor((W - 270) / 2), [ex, ey] = s.at('foe'), [px, py] = s.at('me'); return { sk, foe: [ex + ox, ey], me: [px + ox, py] }; }, sk));
  }
  writeFileSync(resolve(out, 'meta.json'), JSON.stringify({ ms: MS, meta }, null, 1));
  if (errs.length) console.log('페이지 오류:\n' + errs.join('\n'));
  console.log('찍음', skills.length * MS.length, '→', out);
} finally { await b.close(); srv.close(); }
