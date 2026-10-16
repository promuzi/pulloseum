// 소리(2026-10-16 사용자 "효과음은 만들면서 노래도 함 고려해줘 — AI로 만드는 게 나을지 조사" · "전등의 깜빡임이나 여러 장면 변환 등 효과음을 적절히 적용")
//  효과음 = 소리 파일 없이 브라우저가 그 자리에서 만듦(Web Audio — 사각 · 세모 · 사인 · 펄스 파형 + 잡음 + 높낮이 미끄럼 + 거름망).
//   레트로 효과음 만드는 법(sfxr · ZzFX와 같은 방식 — 파형 하나에 높낮이를 미끄러뜨리고 짧게 사라지게)을 우리 코드로 짬 → 저작권 · 파일 크기 걱정 없음.
//  배경 음악 = 같은 방식의 칩튠 순서기(4채널: 리드 · 아르페지오 · 베이스 · 북). 나중에 파일 음악(AI · 작곡가)이 생기면 TRACK_FILES 에 넣으면 그걸 먼저 씀.
//  브라우저는 사람이 한 번 누르기 전엔 소리를 못 냄 → 첫 누름에 unlock(). 설정(효과음 · 음악 켬/끔)은 이 브라우저에 저장.
const PREF_KEY = 'pullo.sound';
export const SOUND = { sfx: true, music: true, sfxVol: 0.8, musicVol: 0.42 };
try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (p) Object.assign(SOUND, p); } catch {}
const save = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ sfx: SOUND.sfx, music: SOUND.music })); } catch {} };

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, unlocked = false;
const PW = {};   // 펄스 파형(폭 12.5% · 25%)
function init() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = SOUND.sfx ? SOUND.sfxVol : 0; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = SOUND.music ? SOUND.musicVol : 0; musicBus.connect(master);
  const n = ctx.sampleRate; noiseBuf = ctx.createBuffer(1, n, n); const d = noiseBuf.getChannelData(0); let s = 1; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
  for (const [k, duty] of [['pulse12', 0.125], ['pulse25', 0.25]]) { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let h = 1; h < N; h++) im[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * duty); PW[k] = ctx.createPeriodicWave(re, im); }
  try { document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (unlocked) ctx.resume(); }); } catch {}
  return ctx;
}
// 첫 누름(input.js)에서 부름 — 브라우저가 소리를 허락
export function unlock() {
  if (unlocked) return; if (!init()) return;
  unlocked = true; ctx.resume().catch(() => {});
  if (wantTrack) startTrack(wantTrack);
}
export function setSfxOn(on) { SOUND.sfx = !!on; save(); if (sfxBus) sfxBus.gain.setTargetAtTime(on ? SOUND.sfxVol : 0, ctx.currentTime, 0.05); }
export function setMusicOn(on) { SOUND.music = !!on; save(); if (musicBus) musicBus.gain.setTargetAtTime(on ? SOUND.musicVol : 0, ctx.currentTime, 0.1); }

// ── 효과음 한 겹: { w 파형, f [시작 Hz, 끝 Hz], d 길이(초), a 어택, v 세기, at 지연, flt [종류, Hz, Q], vib [Hz, 반음 폭], rv 높낮이 흔들림 } ──
const NOTE = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return 440; const i = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 4) * 12; return 440 * 2 ** (i / 12); };
function voice(L, t0, bus, k = 1) {
  const t = t0 + (L.at || 0), d = Math.max(0.01, L.d || 0.1), a = L.a ?? 0.004, v = (L.v ?? 0.2) * k, rv = L.rv ? 1 + (Math.random() * 2 - 1) * L.rv : 1;
  let src;
  if (L.w === 'noise') { src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = L.rate || 1; }
  else {
    src = ctx.createOscillator();
    if (PW[L.w]) src.setPeriodicWave(PW[L.w]); else src.type = L.w || 'square';
    const hz = x => (typeof x === 'string' ? NOTE(x) : x), f0 = hz(L.f[0]) * rv, f1 = hz(L.f[1] ?? L.f[0]) * rv;
    src.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) (L.lin ? src.frequency.linearRampToValueAtTime(f1, t + d) : src.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d));
    if (L.vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = L.vib[0]; lg.gain.value = f0 * (2 ** (L.vib[1] / 12) - 1); lfo.connect(lg); lg.connect(src.frequency); lfo.start(t); lfo.stop(t + d + 0.05); }
  }
  const g = ctx.createGain(); g.gain.value = 0;   // 시작 전 기본값(1)이 첫 칸에 새어 딸깍 하지 않게
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a);
  if (L.hold) g.gain.setValueAtTime(v, t + a + L.hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  let out = src;
  if (L.flt) { const f = ctx.createBiquadFilter(); f.type = L.flt[0]; f.frequency.setValueAtTime(L.flt[1], t); if (L.flt[3]) f.frequency.exponentialRampToValueAtTime(L.flt[3], t + d); f.Q.value = L.flt[2] ?? 1; out.connect(f); out = f; }
  out.connect(g); g.connect(bus);
  if (L.w === 'noise') src.start(t, Math.random() * 0.8); else src.start(t);   // 잡음은 매번 다른 자리부터(첫 칸이 늘 같은 큰 값이면 딸깍)
  src.stop(t + d + 0.02);
}
// 효과음 목록 — 이름 → 겹들(전투 · 상태 효과 · 화면 · 홈)
const n = (d, flt, v, o = {}) => ({ w: 'noise', d, flt, v, ...o });
const SFX = {
  // 화면
  tap:      [{ w: 'pulse25', f: [1320, 1320], d: 0.035, v: 0.11 }],
  select:   [{ w: 'pulse25', f: ['E5', 'E5'], d: 0.05, v: 0.12 }, { w: 'pulse25', f: ['B5', 'B5'], d: 0.07, v: 0.1, at: 0.045 }],
  deny:     [{ w: 'square', f: [180, 140], d: 0.12, v: 0.12 }],
  flip:     [n(0.12, ['bandpass', 1800, 0.8, 4200], 0.14), { w: 'triangle', f: [420, 760], d: 0.1, v: 0.08 }],
  close:    [n(0.08, ['bandpass', 2400, 0.8, 900], 0.1)],
  pop:      [{ w: 'sine', f: [520, 1100], d: 0.09, v: 0.16 }],
  tick:     [{ w: 'pulse12', f: [2000, 2000], d: 0.025, v: 0.07 }],
  tickLast: [{ w: 'pulse25', f: [1600, 1600], d: 0.05, v: 0.12 }],
  coin:     [{ w: 'pulse25', f: ['B5', 'B5'], d: 0.06, v: 0.12 }, { w: 'pulse25', f: ['E6', 'E6'], d: 0.16, v: 0.12, at: 0.06 }],
  levelup:  [...['C5', 'E5', 'G5', 'C6'].map((f, i) => ({ w: 'pulse25', f: [f, f], d: 0.09, v: 0.12, at: i * 0.07 })), { w: 'triangle', f: ['C6', 'C6'], d: 0.4, v: 0.14, at: 0.28, vib: [6, 0.3] }],
  // 화면 바뀜(라우터 전환): 점 페이드 = 가벼운 휙, 철 셔터 = 닫힐 때 쾅 · 열릴 때 쉭
  whoosh:   [n(0.22, ['bandpass', 600, 0.7, 2600], 0.18, { a: 0.08 })],
  slam:     [{ w: 'sine', f: [140, 42], d: 0.28, v: 0.32 }, n(0.12, ['lowpass', 2600, 0.7, 300], 0.28), { w: 'square', f: [240, 180], d: 0.06, v: 0.08, at: 0.01 }, n(0.05, ['highpass', 5000, 0.7], 0.08, { at: 0.09 })],
  release:  [n(0.32, ['bandpass', 3000, 0.6, 900], 0.1, { a: 0.03 }), { w: 'triangle', f: [300, 520], d: 0.18, v: 0.05 }],
  // 전투
  swing:    [n(0.16, ['bandpass', 900, 0.9, 2800], 0.12, { a: 0.04 })],
  first:    [{ w: 'pulse25', f: ['A5', 'A5'], d: 0.05, v: 0.1 }, { w: 'pulse25', f: ['E6', 'E6'], d: 0.08, v: 0.09, at: 0.05 }],
  hit:      [{ w: 'square', f: [220, 70], d: 0.12, v: 0.22, rv: 0.06 }, n(0.08, ['lowpass', 3200, 0.8, 500], 0.22)],
  hitBig:   [{ w: 'square', f: [180, 50], d: 0.18, v: 0.26, rv: 0.05 }, n(0.14, ['lowpass', 3600, 0.8, 400], 0.28), { w: 'sine', f: [90, 40], d: 0.2, v: 0.25 }],
  crit:     [{ w: 'square', f: [900, 120], d: 0.2, v: 0.2 }, n(0.16, ['lowpass', 5000, 0.8, 600], 0.3), { w: 'sine', f: [110, 40], d: 0.24, v: 0.3 }, { w: 'pulse25', f: ['E6', 'E6'], d: 0.1, v: 0.08, at: 0.05 }],
  graze:    [n(0.08, ['bandpass', 2600, 1.2, 1200], 0.14), { w: 'triangle', f: [500, 300], d: 0.06, v: 0.06 }],
  miss:     [n(0.18, ['bandpass', 1600, 1.4, 4200], 0.2, { a: 0.03 })],
  block:    [{ w: 'square', f: [320, 260], d: 0.08, v: 0.14 }, { w: 'triangle', f: [1250, 1250], d: 0.18, v: 0.08, at: 0.01 }, n(0.05, ['highpass', 3500, 0.7], 0.12)],
  great:    [{ w: 'pulse25', f: ['G5', 'G5'], d: 0.06, v: 0.11, at: 0.05 }, { w: 'pulse25', f: ['D6', 'D6'], d: 0.12, v: 0.11, at: 0.11 }],
  stance:   [{ w: 'triangle', f: [300, 600], d: 0.12, v: 0.1 }, n(0.1, ['bandpass', 2000, 0.8], 0.06)],
  faint:    [{ w: 'square', f: [440, 90], d: 0.55, v: 0.14 }, { w: 'triangle', f: [220, 60], d: 0.6, v: 0.12 }],
  win:      [...['C5', 'E5', 'G5', 'C6', 'G5', 'C6'].map((f, i) => ({ w: 'pulse25', f: [f, f], d: i === 5 ? 0.5 : 0.11, v: 0.13, at: [0, 0.1, 0.2, 0.3, 0.45, 0.55][i], vib: i === 5 ? [6, 0.25] : null })), ...['C4', 'E4', 'G4'].map((f, i) => ({ w: 'triangle', f: [f, f], d: 0.7, v: 0.1, at: 0.3 + i * 0.01 }))],
  lose:     [...['G4', 'F#4', 'F4', 'E4'].map((f, i) => ({ w: 'pulse25', f: [f, f], d: i === 3 ? 0.6 : 0.22, v: 0.11, at: i * 0.22, vib: i === 3 ? [5, 0.4] : null })), { w: 'triangle', f: ['C3', 'C3'], d: 1.0, v: 0.1, at: 0.66 }],
  roll:     [{ w: 'pulse12', f: [1800, 1800], d: 0.018, v: 0.05, rv: 0.1 }],
  land:     [{ w: 'pulse25', f: [1400, 1400], d: 0.04, v: 0.1 }, n(0.03, ['highpass', 4000, 0.7], 0.08)],
  emote:    [{ w: 'sine', f: [600, 1200], d: 0.08, v: 0.14 }, { w: 'sine', f: [900, 1500], d: 0.08, v: 0.08, at: 0.06 }],
  // 상태 효과(걸릴 때 · 턴 끝)
  ignite:   [n(0.45, ['lowpass', 300, 0.7, 2400], 0.26, { a: 0.12 }), n(1.0, ['bandpass', 1300, 0.6], 0.06, { a: 0.2, hold: 0.4 })],
  crackle:  [n(0.022, ['bandpass', 3200, 1.4], 0.28, { rv: 0.2 }), n(0.012, ['highpass', 6000, 0.7], 0.18, { at: 0.016 })],
  poison:   [...[0, 0.07, 0.15, 0.24].map((at, i) => ({ w: 'sine', f: [260 + i * 60, 520 + i * 90], d: 0.07, v: 0.11, at, rv: 0.08 }))],
  shock:    [{ w: 'saw', f: [1800, 300], d: 0.08, v: 0.1 }, n(0.25, ['highpass', 2500, 0.7], 0.12, { vib: null }), { w: 'square', f: [120, 120], d: 0.25, v: 0.06, vib: [60, 2] }],
  chill:    [...[0, 0.05, 0.1, 0.16].map((at, i) => ({ w: 'triangle', f: [2200 + i * 300, 2600 + i * 300], d: 0.12, v: 0.07, at })), n(0.3, ['highpass', 6000, 0.7], 0.05, { a: 0.1 })],
  frozen:   [{ w: 'triangle', f: [1600, 900], d: 0.2, v: 0.1 }, n(0.08, ['highpass', 3000, 1], 0.2, { at: 0.02 }), ...[0.06, 0.12, 0.2].map(at => ({ w: 'triangle', f: [3000, 3400], d: 0.08, v: 0.05, at }))],
  wet:      [...[0, 0.09, 0.2].map((at, i) => ({ w: 'sine', f: [1200 - i * 150, 400], d: 0.06, v: 0.12, at }))],
  stun:     [...[0, 0.12, 0.24].map((at, i) => ({ w: 'pulse25', f: [1800 + i * 200, 1400 + i * 200], d: 0.08, v: 0.07, at }))],
  spore:    [n(0.3, ['bandpass', 700, 0.9, 1800], 0.12, { a: 0.06 })],
  bloom:    [n(0.6, ['lowpass', 500, 0.7, 1800], 0.22, { a: 0.1 }), { w: 'sine', f: [160, 90], d: 0.3, v: 0.12 }],
  steam:    [n(0.55, ['highpass', 2500, 0.6, 5000], 0.12, { a: 0.05 })],
  bind:     [{ w: 'saw', f: [140, 180], d: 0.25, v: 0.07, flt: ['lowpass', 900, 2] }, n(0.12, ['bandpass', 1400, 2], 0.1, { at: 0.18 })],
  root:     [{ w: 'sine', f: [70, 50], d: 0.5, v: 0.22 }, n(0.4, ['lowpass', 400, 0.7], 0.14, { a: 0.1 })],
  leech:    [{ w: 'triangle', f: [300, 900], d: 0.18, v: 0.1 }, { w: 'triangle', f: [600, 1200], d: 0.1, v: 0.06, at: 0.16 }],
  drain:    [{ w: 'sine', f: [900, 300], d: 0.4, v: 0.11, vib: [9, 0.6] }],
  weak:     [...[0, 0.1, 0.2].map((at, i) => ({ w: 'pulse25', f: [700 - i * 120, 600 - i * 120], d: 0.08, v: 0.08, at }))],
  taunt:    [{ w: 'saw', f: [220, 160], d: 0.18, v: 0.1, vib: [14, 1] }, { w: 'saw', f: [260, 190], d: 0.18, v: 0.08, at: 0.12, vib: [14, 1] }],
  corrode:  [n(0.5, ['bandpass', 4000, 1.5], 0.1, { a: 0.04 }), ...[0.05, 0.16, 0.3].map(at => ({ w: 'sine', f: [700, 1400], d: 0.05, v: 0.06, at }))],
  shade:    [{ w: 'sine', f: [180, 110], d: 0.9, v: 0.12, a: 0.2 }, n(0.9, ['lowpass', 600, 0.7, 250], 0.08, { a: 0.3 })],
  gale:     [n(1.0, ['bandpass', 500, 0.8, 1800], 0.24, { a: 0.18, hold: 0.25 }), n(0.8, ['bandpass', 2400, 1.5, 900], 0.06, { a: 0.3, at: 0.1 })],
  rage:     [{ w: 'saw', f: [90, 140], d: 0.4, v: 0.12, flt: ['lowpass', 700, 1.2] }, n(0.35, ['lowpass', 800, 0.7], 0.12, { a: 0.1 })],
  wall:     [{ w: 'square', f: [200, 190], d: 0.06, v: 0.14 }, { w: 'triangle', f: [900, 880], d: 0.35, v: 0.1, at: 0.01, vib: [7, 0.15] }],
  haste:    [{ w: 'pulse25', f: [400, 1600], d: 0.18, v: 0.1, lin: true }, n(0.15, ['bandpass', 2600, 0.8], 0.06)],
  regen:    [...['C6', 'E6', 'G6'].map((f, i) => ({ w: 'triangle', f: [f, f], d: 0.18, v: 0.07, at: i * 0.07 }))],
  heal:     [{ w: 'triangle', f: ['E6', 'E6'], d: 0.14, v: 0.07 }, { w: 'triangle', f: ['A6', 'A6'], d: 0.18, v: 0.06, at: 0.07 }],
  thorns:   [n(0.06, ['highpass', 3000, 0.7], 0.07), { w: 'square', f: [1400, 900], d: 0.05, v: 0.06, at: 0.02 }],
  shield:   [{ w: 'sine', f: [500, 1000], d: 0.3, v: 0.1, vib: [12, 0.4] }, { w: 'triangle', f: [1500, 1500], d: 0.25, v: 0.05, at: 0.1 }],
  shieldHit:[{ w: 'triangle', f: [2600, 2400], d: 0.2, v: 0.1 }, n(0.05, ['highpass', 5000, 0.7], 0.05)],
  purify:   [...['G5', 'C6', 'E6', 'G6'].map((f, i) => ({ w: 'sine', f: [f, f], d: 0.25, v: 0.07, at: i * 0.06 }))],
  focus:    [{ w: 'pulse25', f: [1000, 1000], d: 0.04, v: 0.08 }, { w: 'pulse25', f: [1500, 1500], d: 0.06, v: 0.08, at: 0.12 }],
  fizzle:   [{ w: 'square', f: [400, 200], d: 0.15, v: 0.06 }],
  resist:   [{ w: 'triangle', f: [700, 700], d: 0.1, v: 0.08 }, { w: 'triangle', f: [1050, 1050], d: 0.12, v: 0.07, at: 0.08 }],
  // 홈 전등: 형광등 지직(짧은 전기 찌직)
  buzz:     [{ w: 'saw', f: [120, 120], d: 0.03, v: 0.22, flt: ['bandpass', 2400, 1.2] }, n(0.02, ['bandpass', 5000, 1.5], 0.14)],
};
const lastAt = {};
// 효과음 내기: o = { at(초 뒤), k(세기 배수) }. 같은 소리는 30ms 안에 겹치지 않게
export function sfx(name, o = {}) {
  if (!SOUND.sfx || !unlocked || !ctx) return;
  const L = SFX[name]; if (!L) return;
  const now = ctx.currentTime, t = now + (o.at || 0);
  if (!o.at && lastAt[name] && now - lastAt[name] < 0.03) return;
  lastAt[name] = now;
  for (const layer of L) voice(layer, t, sfxBus, o.k ?? 1);
}
// 화면 단추 누름 — 바탕 막이(…_block)는 소리 없음
export function tapSound(id) { if (id && !/_block$|_in$/.test(id)) sfx('tap'); }
// 전등이 떨 때: 글자 줄(a k h = 깜빡이는 장, m = 켜짐)을 따라 꺼지는 장마다 지직
export function lampSound(pat, step) { for (let i = 0; i < pat.length; i++) if (pat[i] !== 'm' && (i === 0 || pat[i] !== pat[i - 1])) sfx('buzz', { at: (i * step) / 1000, k: pat[i] === 'k' ? 1.3 : 0.8 }); }
// 화면 바뀜 소리(라우터): 시작 · 닫힘 끝(철판이 닿음) · 열림 시작
export function transSound(style, phase) {
  const metal = /shutter|doors|iris|blinds/.test(style || '');
  if (phase === 'start') sfx(metal ? 'swing' : style === 'cut' ? '' : 'whoosh', { k: metal ? 0.8 : 0.6 });
  else if (phase === 'shut' && metal) sfx('slam');
  else if (phase === 'open' && metal) sfx('release');
}

// ── 배경 음악: 칩튠 순서기 ──
//  한 칸 = 16분음표. 'C4' = 음 시작, '-' = 그 음 이어감, '.' = 쉼. 북: k 큰북 · s 작은북 · h 하이햇
//  곡은 직접 지음(저작권 우리) — 홈 = 다장조 92 · 차분(C · Am · F · G), 전투 = 가단조 150 · 몰아침(Am · F · G · Em … E), 처음 화면 = 라단조 108 · 신비(Dm · Bb · F · C)
const bar = s => s.trim().split(/\s+/);
const TRACKS = {
  home: { bpm: 92, ch: [
    { w: 'triangle', v: 0.16, o: 0, seq: ['E5 - - - D5 - C5 - D5 - - - . . . .', 'C5 - - - A4 - - - E5 - - - . . . .', 'F5 - - - E5 - D5 - C5 - - - . . A4 -', 'B4 - - - D5 - - - G4 - - - - - - -', 'E5 - - - G5 - E5 - D5 - - - C5 - . .', 'A4 - - - C5 - E5 - A5 - - - G5 - . .', 'F5 - - - A5 - G5 - F5 - E5 - D5 - . .', 'C5 - - - - - - - . . . . . . . .'] },
    { w: 'pulse12', v: 0.05, seq: ['C4 - E4 - G4 - E4 - C4 - E4 - G4 - E4 -', 'A3 - C4 - E4 - C4 - A3 - C4 - E4 - C4 -', 'F3 - A3 - C4 - A3 - F3 - A3 - C4 - A3 -', 'G3 - B3 - D4 - B3 - G3 - B3 - D4 - B3 -'] },
    { w: 'triangle', v: 0.2, seq: ['C3 - - - . . . . G2 - - - . . . .', 'A2 - - - . . . . E3 - - - . . . .', 'F2 - - - . . . . C3 - - - . . . .', 'G2 - - - . . . . D3 - - - . . . .'] },
    { drum: true, v: 0.5, seq: ['k . . . h . . . k . . . h . . h'] },
  ] },
  battle: { bpm: 150, ch: [
    { w: 'pulse25', v: 0.09, seq: ['A4 - . A4 C5 - E5 - D5 - C5 - B4 - C5 -', 'A4 - - - . . F4 - A4 - C5 - D5 - C5 -', 'B4 - - - D5 - . D5 G5 - F5 - E5 - D5 -', 'E5 - - - - - . . B4 - D5 - E5 - G5 -', 'A5 - - - G5 - E5 - D5 - E5 - C5 - A4 -', 'F5 - - - E5 - C5 - A4 - C5 - D5 - E5 -', 'D5 - - - B4 - G4 - B4 - D5 - G5 - F5 -', 'E5 - - - - - - - G#4 - B4 - D5 - E5 -'] },
    { w: 'pulse12', v: 0.04, seq: ['A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5', 'F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4', 'G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4', 'E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4', 'A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5 A4 C5 E5 C5', 'F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4 F4 A4 C5 A4', 'G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4 G4 B4 D5 B4', 'E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4'] },
    { w: 'triangle', v: 0.22, seq: ['A2 - A2 - A3 - A2 - A2 - A3 - A2 - G2 -', 'F2 - F2 - F3 - F2 - F2 - F3 - F2 - E2 -', 'G2 - G2 - G3 - G2 - G2 - G3 - G2 - B2 -', 'E2 - E2 - E3 - E2 - E2 - E3 - E2 - D3 -', 'A2 - A2 - A3 - A2 - A2 - A3 - A2 - G2 -', 'F2 - F2 - F3 - F2 - F2 - F3 - F2 - E2 -', 'G2 - G2 - G3 - G2 - G2 - G3 - G2 - B2 -', 'E2 - E2 - E3 - E2 - G#2 - B2 - E3 - D3 -'] },
    { drum: true, v: 0.6, seq: ['k . h . s . h . k k h . s . h h', 'k . h . s . h . k . h k s . h s'] },
  ] },
  title: { bpm: 108, ch: [
    { w: 'pulse25', v: 0.08, seq: ['D5 - - - F5 - - - A5 - - - G5 - F5 -', 'A#4 - - - D5 - - - F5 - - - E5 - D5 -', 'C5 - - - F5 - - - A5 - - - C6 - A5 -', 'G5 - - - - - - - E5 - - - C5 - - -', 'D5 - - - F5 - - - A5 - - - D6 - C6 -', 'A#5 - - - A5 - - - F5 - - - D5 - - -', 'C5 - - - E5 - - - G5 - - - A5 - - -', 'D5 - - - - - - - - - - - . . . .'] },
    { w: 'pulse12', v: 0.045, seq: ['D4 - F4 - A4 - F4 - D4 - F4 - A4 - F4 -', 'A#3 - D4 - F4 - D4 - A#3 - D4 - F4 - D4 -', 'F3 - A3 - C4 - A3 - F3 - A3 - C4 - A3 -', 'C4 - E4 - G4 - E4 - C4 - E4 - G4 - E4 -'] },
    { w: 'triangle', v: 0.2, seq: ['D3 - - - - - - - A2 - - - - - - -', 'A#2 - - - - - - - F2 - - - - - - -', 'F2 - - - - - - - C3 - - - - - - -', 'C3 - - - - - - - G2 - - - - - - -'] },
    { drum: true, v: 0.45, seq: ['k . . . h . . . k . k . h . . .'] },
  ] },
};
// 파일 음악이 생기면 여기에(장면 → 파일). 있으면 칩튠 대신 그 파일을 돌림
export const TRACK_FILES = {};
let wantTrack = null, cur = null;
export function music(name) {
  if (name === wantTrack) return;
  wantTrack = name || null;
  if (!unlocked) return;
  startTrack(wantTrack);
}
function startTrack(name) {
  const old = cur; cur = null;
  if (old) { old.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25); clearInterval(old.timer); setTimeout(() => { try { old.g.disconnect(); if (old.el) old.el.pause(); } catch {} }, 1500); }
  if (!name) return;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.setTargetAtTime(1, ctx.currentTime, 0.4); g.connect(musicBus);
  if (TRACK_FILES[name]) { const el = new Audio(TRACK_FILES[name]); el.loop = true; const src = ctx.createMediaElementSource(el); src.connect(g); el.play().catch(() => {}); cur = { g, el }; return; }
  const T = TRACKS[name]; if (!T) return;
  const st = { g, step: 0, next: ctx.currentTime + 0.08, T, timer: 0 }, dur = 60 / T.bpm / 4;
  const seqs = T.ch.map(ch => ({ ch, bars: ch.seq.map(bar) }));
  const total = Math.max(...seqs.map(s => s.bars.length)) * 16;
  st.timer = setInterval(() => {
    while (st.next < ctx.currentTime + 0.15) {
      const s = st.step % total;
      for (const { ch, bars } of seqs) {
        const b = bars[Math.floor(s / 16) % bars.length], tok = b[s % 16];
        if (!tok || tok === '.' || tok === '-') continue;
        if (ch.drum) { drum(tok, st.next, g, ch.v); continue; }
        let len = 1; for (let j = (s % 16) + 1; j < 16 && b[j] === '-'; j++) len++;
        voice({ w: ch.w, f: [NOTE(tok), NOTE(tok)], d: len * dur * 0.95, a: 0.006, v: ch.v }, st.next, g);
      }
      st.next += dur; st.step++;
    }
  }, 25);
  cur = st;
}
function drum(k, t, bus, v) {
  if (k === 'k') { voice({ w: 'sine', f: [150, 45], d: 0.16, v: 0.5 * v }, t, bus); }
  else if (k === 's') { voice({ w: 'noise', d: 0.12, flt: ['bandpass', 1800, 0.8], v: 0.32 * v }, t, bus); voice({ w: 'triangle', f: [200, 140], d: 0.07, v: 0.15 * v }, t, bus); }
  else if (k === 'h') voice({ w: 'noise', d: 0.035, flt: ['highpass', 7000, 0.7], v: 0.12 * v }, t, bus);
}
// 들어 보기용으로 파일에 굽기(검토 도구 tools/shots/soundreel.mjs): plan = [{ t 초, sfx 이름 } | { t, music 이름, dur 초 }] → 한 줄 소리(Float32, 44.1kHz)
async function renderOffline(plan, sec) {
  const sr = 44100, off = new OfflineAudioContext(1, Math.ceil(sr * sec), sr), keep = { ctx, master, sfxBus, musicBus, noiseBuf, unlocked, PW: { ...PW } };
  try {
    ctx = off; master = off.createGain(); master.connect(off.destination);
    sfxBus = off.createGain(); sfxBus.gain.value = SOUND.sfxVol; sfxBus.connect(master);
    musicBus = off.createGain(); musicBus.gain.value = SOUND.musicVol; musicBus.connect(master);
    noiseBuf = off.createBuffer(1, sr, sr); { const d = noiseBuf.getChannelData(0); let s = 1; for (let i = 0; i < sr; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } }
    for (const [k, duty] of [['pulse12', 0.125], ['pulse25', 0.25]]) { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let h = 1; h < N; h++) im[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * duty); PW[k] = off.createPeriodicWave(re, im); }
    for (const p of plan) {
      if (p.sfx && SFX[p.sfx]) for (const L of SFX[p.sfx]) voice(L, p.t, sfxBus);
      if (p.music && TRACKS[p.music]) {
        const T = TRACKS[p.music], dur = 60 / T.bpm / 4, seqs = T.ch.map(ch => ({ ch, bars: ch.seq.map(bar) })), total = Math.max(...seqs.map(s => s.bars.length)) * 16, g = off.createGain(); g.connect(musicBus);
        for (let step = 0, tt = p.t; tt < p.t + p.dur; step++, tt += dur) {
          const s = step % total;
          for (const { ch, bars } of seqs) {
            const b = bars[Math.floor(s / 16) % bars.length], tok = b[s % 16]; if (!tok || tok === '.' || tok === '-') continue;
            if (ch.drum) { drum(tok, tt, g, ch.v); continue; }
            let len = 1; for (let j = (s % 16) + 1; j < 16 && b[j] === '-'; j++) len++;
            voice({ w: ch.w, f: [NOTE(tok), NOTE(tok)], d: len * dur * 0.95, a: 0.006, v: ch.v }, tt, g);
          }
        }
      }
    }
    return Array.from((await off.startRendering()).getChannelData(0));
  } finally { ({ ctx, master, sfxBus, musicBus, noiseBuf, unlocked } = keep); Object.assign(PW, keep.PW); }
}
// 검토 도구: window.__sound.sfx('crit') 등
try { globalThis.__sound = { sfx, music, unlock, SOUND, list: () => Object.keys(SFX), renderOffline }; } catch {}
