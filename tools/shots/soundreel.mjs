// 게임 소리를 들어 볼 수 있게 파일로 굽기(브라우저 Web Audio 를 오프라인으로 돌려 스테레오 WAV) — core/sound.js reel
//   node tools/shots/soundreel.mjs --out music_reel                 = 음악 지휘자 상태 차례(아래 PLAN)를 가상으로 돌려 구움
//   node tools/shots/soundreel.mjs --out sound_reel --sfx all      = 효과음 전부(0.7초 간격)
//   node tools/shots/soundreel.mjs --out x --plan "0:title,13:boot,40:ready,45:battle,70:win,80:home" --sec 90
//   --stems = 층마다 따로 굽고 세기(RMS)를 적음(섞음 고르기) · --nosfx/--nomusic
//   결과 = tools/shots/out/<out>.wav (최고 0.9로 맞춤 — 게임 안 크기는 sound.js SOUND)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const argv = process.argv.slice(2), get = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; }, has = k => argv.includes('--' + k);
const out = get('out') || 'music_reel', gap = +(get('gap') || 0.7);
// 기본 차례: 처음 화면(조율 → 전등 점화 → 베이스 · 지지직 · 킥) → 눌러서 대기(디스플레이 켜짐 → 붐뱁, 첫 브레이크 11마디) → 매칭 → 전투 → 승리 → 결과 → 대기 → 식물 관리 → 대기 → 매칭 → 전투 → 패배 → 대기
const PLAN = '0:title,13:boot,48:ready,52:battle,76:win,79:result,88:home,100:focus,112:home,118:ready,122:battle,138:lose,141:result,148:home';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 900000 });
try {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready && window.__sound, { timeout: 15000 });
  let plan, sec;
  if (get('sfx')) {
    const names = get('sfx') === 'all' ? await p.evaluate(() => window.__sound.list()) : get('sfx').split(',');
    plan = []; let t = 0.2;
    for (const n of names) { plan.push({ t, sfx: n }); t += n === 'win' || n === 'lose' ? 1.6 : n === 'ignite' || n === 'gale' || n === 'shade' ? 1.2 : gap; }
    sec = t + 0.6;
  } else {
    plan = (get('plan') || PLAN).split(',').map(s => { const [t, w] = s.split(':'); return w === 'boot' ? { t: +t, boot: true } : w === 'skip' ? { t: +t, skip: true } : { t: +t, state: w }; });
    sec = +(get('sec') || Math.max(...plan.map(x => x.t)) + 14);
  }
  const opt = { noSfx: has('nosfx'), noMusic: has('nomusic') };
  const r = await p.evaluate(async (plan, sec, opt) => window.__sound.reel(plan, sec, opt), plan, sec, opt);
  writeFileSync(resolve(outDir, out + '.wav'), Buffer.from(r.b64, 'base64'));
  console.log(`저장: ${resolve(outDir, out + '.wav')} · ${r.sec.toFixed(1)}초 · 최고 ${r.peak.toFixed(3)} · RMS ${r.rms.toFixed(4)} · 맞춤 배수 ${r.gain.toFixed(2)}${errs.length ? ' · 페이지 오류 ' + errs.join(' | ') : ''}`);
  if (has('stems')) {   // 층마다(나머지를 끈 채) 세기 — 섞음 고르기
    const rows = await p.evaluate(async (plan, sec) => {
      const S = window.__sound, ev = S.simulate(plan.filter(x => !x.sfx), sec), by = {};
      for (const e of ev) (by[e.i] = by[e.i] || []).push(e);
      const res = [];
      for (const [k, list] of Object.entries(by)) { const w = await S.reelEvents(list, sec); res.push([k, list.length, +w.rms.toFixed(5), +w.peak.toFixed(4)]); }
      return res.sort((a, b) => b[2] - a[2]);
    }, plan, Math.min(sec, 60));
    for (const r2 of rows) console.log('  층', r2[0].padEnd(6), '사건', String(r2[1]).padStart(4), ' RMS', r2[2], ' 최고', r2[3]);
  }
} finally { await b.close(); srv.close(); }
