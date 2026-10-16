// 확인용 영상(소리 포함): 처음 화면(조율 → 전등 점화 '두드 두드등' → 베이스 · 지지직 · 킥) → 누름 → 대기 화면(디스플레이 켜짐 + 붐뱁 · 브레이크 하나)
//   → 출전(매칭) → 전투 → 다시 대기 화면. 그림 = 앱 시각을 30장/초로 정확히 넘기며 실제 화면 그대로(main.js __frame — 누르기 · 겹창까지),
//   소리 = 같은 시각으로 지휘자 · 효과음 사건을 기록(sound.js rec)해 오프라인으로 구움(결정론 — 화면과 같은 타임라인) → 블렌더로 H.264 + AAC.
//   node tools/shots/introvideo.mjs [--out intro_flow] [--tap 17] [--home 36] [--battle 13] [--after 9] [--scale 2] [--crf PERC_LOSSLESS] [--png 3,6.5,…(초)]
//   결과 = tools/shots/out/<out>.mp4 · <out>.wav (+ <out>_<초>.png) — 장 PNG 는 임시 폴더에 쓰고 끝나면 지움(긴 영상도 메모리에 안 쌓임)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const { writeMP4Files } = await import('../pixel/big/video.mjs');
const argv = process.argv.slice(2), get = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const out = get('out', 'intro_flow'), K = +get('scale', 2), FPS = 30;
const TAP = +get('tap', 17), HOME = +get('home', 36), BATTLE = +get('battle', 13), AFTER = +get('after', 9), MAXS = +get('max', 140);
const PNGS = String(get('png', '')).split(',').filter(Boolean).map(Number);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), 'pullo-intro-')), files = [];
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 900000 });
let sec = 0;
try {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title&mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready && window.__sound && window.__frame, { timeout: 20000 });
  await p.evaluate(K => {
    const a = window.__app; window.__pause(true);
    a.screen.fixed = { s: K, W: 270, H: 600 }; a.screen.resize(); a.g.ctx = a.screen.ctx;
    a.user = { nickname: '재배사', login: 'pulloseum' };
    a.t = 1000; window.__sound.rec.start(); a.router.set('title', {});
  }, K);
  // 누르기 흉내: 지난 장에 등록된 영역(id 또는 고르는 함수)의 손을 뗀 일을 줄에 넣음 → 다음 장 끝에 실행(단추 소리까지 실제와 같게)
  const tap = id => p.evaluate(id => { const a = window.__app, R = a.input.regions.filter(r => (id.endsWith('*') ? r.id && r.id.startsWith(id.slice(0, -1)) && (!a.router.cur.cards || !a.router.cur.cards[r.id] || a.router.cur.cards[r.id].can) : r.id === id)).pop(); if (R) a.input.queue.push({ type: 'tap', region: R }); return R ? R.id : null; }, id);
  let phase = 'title', t0 = 0, last = '';
  for (let i = 0; i < MAXS * FPS; i++) {
    const t = 1000 + (i * 1000) / FPS, s = i / FPS;
    const r = await p.evaluate(tt => { const a = window.__app; window.__frame(tt); return { u: a.screen.display.toDataURL('image/png'), scene: a.router.name, ph: a.router.phase }; }, t);
    const n = `f${String(i).padStart(5, '0')}.png`; writeFileSync(join(dir, n), Buffer.from(r.u.split(',')[1], 'base64')); files.push(n);
    if (PNGS.some(x => Math.abs(x - s) < 0.5 / FPS)) writeFileSync(resolve(outDir, `${out}_${s.toFixed(2)}.png`), Buffer.from(r.u.split(',')[1], 'base64'));
    if (r.scene + phase !== last) { last = r.scene + phase; console.log(s.toFixed(2) + '초', phase, '→ 장면', r.scene); }
    // 차례
    if (phase === 'title' && s >= TAP) { console.log('  누름', await tap('title_start')); phase = 'boot'; }
    else if (phase === 'boot' && r.scene === 'home' && !r.ph) { t0 = s; phase = 'home'; }
    else if (phase === 'home' && s >= t0 + HOME) { console.log('  누름', await tap('home_cta')); phase = 'match'; }
    else if (phase === 'match' && r.scene === 'battle') { t0 = s; phase = 'battle'; }
    else if (phase === 'battle' && (s >= t0 + 3.2 && s < t0 + 3.2 + 1 / FPS * 1.5 || s >= t0 + 8.2 && s < t0 + 8.2 + 1 / FPS * 1.5)) { console.log('  카드', await tap('sk_*')); }
    if (phase === 'battle' && s >= t0 + BATTLE) { await p.evaluate(() => window.__app.go('home', {}, 'shutter')); phase = 'back'; }
    else if (phase === 'back' && r.scene === 'home' && !r.ph) { t0 = s; phase = 'back2'; }
    else if (phase === 'back2' && s >= t0 + AFTER) { sec = s + 1 / FPS; break; }
    sec = s + 1 / FPS;
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
  const w = await p.evaluate(sec => window.__sound.rec.wav(sec, { loud: true }), sec);   // 휴대폰으로 듣기 좋게(평균 −16dB · 꼭대기만 부드럽게 누름)
  writeFileSync(resolve(outDir, out + '.wav'), Buffer.from(w.b64, 'base64'));
  console.log(`WAV → ${resolve(outDir, out + '.wav')} · ${w.sec.toFixed(1)}초 · 최고 ${w.peak.toFixed(3)} · RMS ${w.rms.toFixed(4)} · 맞춤 ×${w.gain.toFixed(2)}`);
} finally { await b.close(); srv.close(); }
writeMP4Files(resolve(outDir, out + '.mp4'), dir, files, { fps: FPS, w: 270 * K, h: 600 * K, audio: resolve(outDir, out + '.wav'), crf: get('crf', 'PERC_LOSSLESS') });
rmSync(dir, { recursive: true, force: true });
