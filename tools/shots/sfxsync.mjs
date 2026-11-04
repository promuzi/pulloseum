// 효과음 싱크 재기 + 소리 있는 전투 영상(2026-11-04 사용자 '싱크만 잘 맞춰줘'): 앱 시각을 30장/초로 넘기며 전투를 실제 화면 그대로 그리고(main.js __frame),
//  효과음은 같은 시각으로 기록(sound.js rec) → 단계마다 '화면에서 그 일이 일어나는 때'와 소리(녹음 소리는 꼭대기 자리까지)의 차이를 표로 →
//  휘두름 = 앞으로 나가는 장(attackerPose 13) · 맞음 = 맞는 장(impactAt) · 카드 넘김 '탁' = 공개 카드가 다 뒤집힌 때 · 더미에 앉는 때
//  node tools/shots/sfxsync.mjs [--venue garden] [--seed 11] [--sec 20] [--me 키] [--foe 키] [--out sfxsync] [--scale 2] [--novideo]
//  결과 = 표(콘솔) · tools/shots/out/<out>.mp4 · <out>.wav
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
const out = get('out', 'sfxsync'), K = +get('scale', 2), FPS = 30, SEC = +get('sec', 20), video = !argv.includes('--novideo');
const PNGS = String(get('png', '')).split(',').filter(Boolean).map(Number);   // --png 3.9,6.2(초) = 그 장면을 out/<out>_<초>.png로도(소리 나는 장 눈으로 확인)
const P = { venue: get('venue', 'garden'), seed: String(get('seed', 11)), ...(get('me') && { me: get('me') }), ...(get('foe') && { foe: get('foe') }) };
const STRIKE = 13, FRAME = 0.05, RV_DONE = 0.82, PILE_IN = 0.56;   // battle.js STRIKE_F · FRAME_MS · RV_FLIP0 + RV_FLIP · PILE_IN
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), 'pullo-sfxsync-')), files = [];
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 900000 });
let sec = 0, steps = [], piles = [], events = [], peaks = {};
try {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title&mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready && window.__sound && window.__frame, { timeout: 20000 });
  peaks = await p.evaluate(async () => { await window.__sound.ready(); return window.__sound.peaks(); });
  await p.evaluate((K, P) => {
    const a = window.__app; window.__pause(true);
    a.screen.fixed = { s: K, W: 270, H: 600 }; a.screen.resize(); a.g.ctx = a.screen.ctx;
    a.t = 1000; window.__sound.rec.start(); a.router.set('battle', P);
    window.__sync = { steps: [], piles: [], key: '', wait: 0, n: 0 };
  }, K, P);
  for (let i = 0; i < SEC * FPS; i++) {
    const t = 1000 + (i * 1000) / FPS;
    const r = await p.evaluate(tt => {
      const a = window.__app, S = window.__sync; window.__frame(tt);
      const sc = a.router.cur, v = a.router.name === 'battle' && sc.v;
      if (v && v.phase === 'play' && v.steps[v.si]) { const st = v.steps[v.si], key = v.si + ':' + v.t0; if (key !== S.key) { S.key = key; S.steps.push({ kind: st.kind, t0: (v.t0 - 1000) / 1000, skip: st.skip || 0, I: st.anim ? st.anim.I : null, who: st.who || st.side, theirs: !!st.theirs, tier: st.ev && st.ev.tier, guard: !!(st.ev && st.ev.guard) }); } }
      if (v) for (const h of v.cardHist || []) if (!S.piles.includes(h.t0)) S.piles.push(h.t0);
      // 고를 차례: 잠깐 보여 준 뒤 쓸 수 있는 공격 카드를 누름(실제 누르기 — 고름 소리까지)
      if (v && v.phase === 'pick' && !sc.sheet) {
        if (!S.wait) S.wait = a.t + 900;
        else if (a.t >= S.wait) {
          const C = sc.cards || {}, R = a.input.regions.filter(q => q.id && q.id.startsWith('sk_') && C[q.id] && C[q.id].can), atk = R.filter(q => C[q.id].sk && C[q.id].sk.power > 0), pick = (atk.length ? atk : R)[S.n++ % Math.max(1, (atk.length ? atk : R).length)];
          if (pick) a.input.queue.push({ type: 'tap', region: pick });
          S.wait = 0;
        }
      }
      return { u: a.screen.display.toDataURL('image/png'), scene: a.router.name };
    }, t);
    if (video) { const n = `f${String(i).padStart(5, '0')}.png`; writeFileSync(join(dir, n), Buffer.from(r.u.split(',')[1], 'base64')); files.push(n); }
    if (PNGS.some(x => Math.abs(x - i / FPS) < 0.5 / FPS)) writeFileSync(resolve(outDir, `${out}_${(i / FPS).toFixed(2)}.png`), Buffer.from(r.u.split(',')[1], 'base64'));
    sec = (i + 1) / FPS;
    if (r.scene === 'result') break;
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
  ({ steps, piles } = await p.evaluate(() => window.__sync));
  events = await p.evaluate(() => window.__sound.rec.sfx);
  if (video) {
    const w = await p.evaluate(sec => window.__sound.rec.wav(sec, { loud: true }), sec);
    writeFileSync(resolve(outDir, out + '.wav'), Buffer.from(w.b64, 'base64'));
    console.log(`WAV → ${resolve(outDir, out + '.wav')} · ${w.sec.toFixed(1)}초`);
  }
} finally { await b.close(); srv.close(); }

// 표: 화면에서 일어나는 때 vs 소리(녹음 소리 = 시작 + 꼭대기 자리)
const peakOf = name => ({ tap: peaks.tap, lift: peaks.tap, select: peaks.select, flip: peaks.flip }[name] || 0);
const used = new Set(), near = (names, want, win = 0.4) => { let best = null; for (const [i, e] of events.entries()) if (!used.has(i) && names.includes(e.name)) { const d = e.t + peakOf(e.name) - want; if (Math.abs(d) <= win && (!best || Math.abs(d) < Math.abs(best.d))) best = { i, d, e }; } if (best) used.add(best.i); return best; };
const ms = x => (x == null ? '—' : (x >= 0 ? '+' : '') + Math.round(x * 1000) + 'ms');
const rows = [];
for (const s of steps) {
  if (s.kind === 'attack') {
    const sw = near(['swing'], s.t0 + Math.max(0, STRIKE - s.skip) * FRAME), ht = near(['hit', 'hitBig', 'crit', 'graze', 'miss'], s.t0 + (s.I - s.skip) * FRAME), bl = s.guard ? near(['block'], s.t0 + (s.I - s.skip) * FRAME) : null;
    rows.push(`${s.t0.toFixed(2)}초 공격(${s.who}${s.skip ? ' 연타' : ''}) · 휘두름 ${ms(sw && sw.d)} · ${ht ? ht.e.name : '맞음'} ${ms(ht && ht.d)}${s.guard ? ' · 막힘 ' + ms(bl && bl.d) : ''}`);
  } else if (s.kind === 'reveal' && s.theirs) { const f = near(['flip'], s.t0 + RV_DONE); rows.push(`${s.t0.toFixed(2)}초 공개 · 카드 넘김 '탁' ${ms(f && f.d)}`); }
}
for (const t0 of piles) { const f = near(['flip'], (t0 - 1000) / 1000 + PILE_IN); rows.push(`${((t0 - 1000) / 1000).toFixed(2)}초 더미로 · 앉을 때 '탁' ${ms(f && f.d)}`); }
console.log('녹음 소리 꼭대기 자리(초):', JSON.stringify(peaks));
console.log('화면에서 일어나는 때와 소리의 차이(+ = 소리가 늦음 · 30장/초 영상이라 맞는 장은 최대 33ms 늦게 잡힘):');
for (const r of rows) console.log('  ' + r);
const cnt = {}; for (const e of events) cnt[e.name] = (cnt[e.name] || 0) + 1;
console.log('기록된 효과음:', JSON.stringify(cnt));
if (video) writeMP4Files(resolve(outDir, out + '.mp4'), dir, files, { fps: FPS, w: 270 * K, h: 600 * K, audio: resolve(outDir, out + '.wav'), crf: get('crf', 'HIGH') });
rmSync(dir, { recursive: true, force: true });
