// 소리(2026-10-16 사용자 "효과음은 만들면서 노래도 함 고려해줘 — AI로 만드는 게 나을지 조사" · "전등의 깜빡임이나 여러 장면 변환 등 효과음을 적절히 적용")
//  효과음 = 소리 파일 없이 브라우저가 그 자리에서 만듦(Web Audio — 사각 · 세모 · 사인 · 펄스 파형 + 잡음 + 높낮이 미끄럼 + 거름망).
//   레트로 효과음 만드는 법(sfxr · ZzFX와 같은 방식 — 파형 하나에 높낮이를 미끄러뜨리고 짧게 사라지게)을 우리 코드로 짬 → 저작권 · 파일 크기 걱정 없음.
//  배경 음악 = 지휘자(core/music.js — 박자 격자 하나가 장면을 넘어 계속 돌고, 장면은 상태만 알림 → 다음 마디에 세션이 이어지며 바뀜. 같은 날 사용자
//   "장소나 창이 바껴서 배경음이 조금 바뀌더라도, 끊기지 않고 자연스레 이어지게"). 예전 칩튠 순서기(곡이 끊기고 처음부터)는 걷어냄.
//  브라우저는 사람이 한 번 누르기 전엔 소리를 못 냄 → 첫 누름에 unlock(). 앱 감싸기(WebView)처럼 막혀 있지 않으면 불러오자마자 시작(tryAutoStart).
//  설정(효과음 · 음악 켬/끔)은 이 브라우저에 저장.
import { Conductor, buildGraph, play as playMusic, STEP, BAR } from './music.js';
const PREF_KEY = 'pullo.sound';
export const SOUND = { sfx: true, music: true, sfxVol: 0.8, musicVol: 0.42 };
try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (p) Object.assign(SOUND, p); } catch {}
const save = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify({ sfx: SOUND.sfx, music: SOUND.music })); } catch {} };

let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, unlocked = false;
const PW = {};   // 펄스 파형(폭 12.5% · 25%)
function makeNoise(ac) { const n = ac.sampleRate, b = ac.createBuffer(1, n, n), d = b.getChannelData(0); let s = 1; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } return b; }
function makePW(ac, into) { for (const [k, duty] of [['pulse12', 0.125], ['pulse25', 0.25]]) { const N = 32, re = new Float32Array(N), im = new Float32Array(N); for (let h = 1; h < N; h++) im[h] = (2 / (h * Math.PI)) * Math.sin(h * Math.PI * duty); into[k] = ac.createPeriodicWave(re, im); } return into; }
function init() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = SOUND.sfx ? SOUND.sfxVol : 0; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = SOUND.music ? SOUND.musicVol : 0; musicBus.connect(master);
  noiseBuf = makeNoise(ctx); makePW(ctx, PW);
  try { document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (unlocked) ctx.resume(); }); } catch {}
  return ctx;
}
// 첫 누름(input.js)에서 부름 — 브라우저가 소리를 허락
//  누를 때(pointerdown)와 뗄 때(pointerup) 둘 다 부름 — 뗄 때만 소리를 허락하는 브라우저(iOS)도 있어서, 소리 상자가 아직 안 열렸으면 다시 열어 봄
export function unlock() {
  if (REC) return;
  if (!unlocked) {
    unlocked = true;
    if (!init()) { conductor.onUnlock(); return; }   // 소리 상자가 없는 브라우저 = 음악 없이 박자만(전등 · 처음 화면 연출은 그대로)
    setTimeout(() => { if (!A && !REC) conductor.onUnlock(); }, 1500);   // 소리 상자가 끝내 안 열려도 연출은 이어짐(나중에 열리면 그때부터 소리)
  }
  if (!ctx) return;
  if (ctx.state === 'running') attachMusic(); else ctx.resume().then(attachMusic, () => {});
}
// 막혀 있지 않은 곳(앱 WebView · 자동 재생 허락)이면 누르기 전에 시작 — 막혀 있으면 소리 상자가 '멈춤'에 머물고 첫 누름을 기다림
export function tryAutoStart() {
  if (unlocked || REC) return;
  try { if (navigator.userActivation && navigator.userActivation.hasBeenActive) return unlock(); } catch {}
  try { if (navigator.getAutoplayPolicy) { const pol = navigator.getAutoplayPolicy('audiocontext'); if (pol === 'allowed') return unlock(); if (pol === 'disallowed') return; } } catch {}   // 알려 주는 브라우저면 소리 상자를 미리 만들지 않음(경고 없게)
  if (!init()) return;
  if (ctx.state === 'running') return unlock();
  ctx.resume().then(() => { if (ctx.state === 'running' && !unlocked) unlock(); }, () => {});
}
// 소리가 아직 막혀 있음(처음 화면이 '눌러서 시작' 작은 표시를 띄움)
export const soundLocked = () => !unlocked && !REC;
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
//  승리 · 패배 가락은 음악이 켜져 있으면 지휘자가 박에 맞춰 냄(같은 조 · 같은 박 — music.js FILLS.win/lose), 음악을 끄면 예전 가락
export function sfx(name, o = {}) {
  if (!SOUND.sfx) return;
  if ((name === 'win' || name === 'lose') && SOUND.music && musicOn()) return;
  if (REC) { if (SFX[name]) REC.sfx.push({ t: REC.clock() + (o.at || 0), name, k: o.k ?? 1 }); return; }
  if (!unlocked || !ctx) return;
  const L = SFX[name]; if (!L) return;
  const now = ctx.currentTime, t = now + (o.at || 0);
  if (!o.at && lastAt[name] && now - lastAt[name] < 0.03) return;
  lastAt[name] = now;
  for (const layer of L) voice(layer, t, sfxBus, o.k ?? 1);
}
// 화면 단추 누름 — 바탕 막이(…_block)는 소리 없음
export function tapSound(id) { if (id && !/_block$|_in$/.test(id)) sfx('tap'); }
// 전등이 떨 때(검토 손잡이 __loft.burst): 글자 줄(a k h = 깜빡이는 장, m = 켜짐)을 따라 꺼지는 장마다 지직 — 게임 안 떨림 소리는 지휘자의 전등 칸
export function lampSound(pat, step) { for (let i = 0; i < pat.length; i++) if (pat[i] !== 'm' && (i === 0 || pat[i] !== pat[i - 1])) sfx('buzz', { at: (i * step) / 1000, k: pat[i] === 'k' ? 1.3 : 0.8 }); }
// 화면 바뀜 소리(라우터): 시작 · 닫힘 끝(철판이 닿음) · 열림 시작
export function transSound(style, phase) {
  const metal = /shutter|doors|iris|blinds/.test(style || '');
  if (phase === 'start') sfx(metal ? 'swing' : style === 'cut' ? '' : 'whoosh', { k: metal ? 0.8 : 0.6 });
  else if (phase === 'shut' && metal) sfx('slam');
  else if (phase === 'open' && metal) sfx('release');
}

// ── 배경 음악 = 지휘자(core/music.js) ──
//  시계: 소리가 풀리기 전엔 화면 시계(performance.now), 풀리면 소리 상자 시계(끊김 없이 이어 붙임), 영상 기록(rec) 중엔 앱 시각(app.t)
export const conductor = new Conductor();
let A = null, clkMode = 'perf', clkOff = 0, REC = null;
function clock() {
  if (REC) return REC.clock();
  if (clkMode === 'ctx') return ctx.currentTime + clkOff;
  return performance.now() / 1000 + clkOff;
}
conductor.clock = clock;
conductor.lat = () => (clkMode === 'ctx' && ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0);
const musicOn = () => !!(A || REC) && conductor.cur.state !== 'idle';
// 박마다 만드는 노드 수 상한(휴대폰 가볍게) — 넘치면 꾸밈(opt: 약한 하이햇 · 패드)부터 뺌
const BUDGET = 150;
let bud = { beat: -1, n: 0 };
function liveSink(e) {
  if (!SOUND.music || !A) return;
  const t = e.t - clkOff, beat = Math.floor(t / (STEP * 4));
  if (beat !== bud.beat) bud = { beat, n: 0 };
  if (bud.n > BUDGET && e.opt) return;
  bud.n += playMusic(A, { ...e, t: Math.max(ctx.currentTime, t) }) || 0;
}
function attachMusic() {
  if (A || !ctx || ctx.state !== 'running' || REC) return;
  const now = clock(); clkMode = 'ctx'; clkOff = now - ctx.currentTime;   // 시계를 소리 상자로 — 음악 시각은 그대로 이어짐
  A = buildGraph(ctx, musicBus, noiseBuf, PW);
  conductor.sink = liveSink;
  conductor.onUnlock();
}
// 장면 → 상태(router SCENE_MUSIC · scene.music). 'result' = 방금 정해진 승패를 그대로(battle.js title() 이 music('win'|'lose'))
export function music(name) {
  if (name == null) return;
  if (name === 'result') { if (conductor.want === 'win' || conductor.want === 'lose') return; const L = globalThis.__app && globalThis.__app.lastResult; name = L && !L.win ? 'lose' : 'win'; }
  conductor.request(name, { urgent: name === 'win' || name === 'lose' });
}
// 매 장면 그릴 때(router.draw): 앞당겨 예약(영상 기록 땐 이 시각만 씀 — 결정론)
export function musicTick() { conductor.pump(); }
try { setInterval(() => { if (!REC) conductor.pump(); }, 40); } catch {}
// 화면이 따라가는 음악 시각 · 전등 · 처음 화면
export const musicNow = () => conductor.now();
export const lampNow = () => conductor.lampAt(conductor.now());
export const introTime = () => conductor.introTime();
export const introSkip = () => conductor.skipIntro();
export const bootPlan = () => conductor.boot();
export { BAR as MUSIC_BAR, STEP as MUSIC_STEP };

// ── 영상 · 들어 보기용 굽기 ──
//  rec: 앱 시각으로 지휘자를 돌리며 음악 사건 · 효과음을 기록 → 같은 사건을 오프라인 소리 상자에 다시 내어 WAV(결정론 — 화면과 같은 타임라인)
const rec = {
  start() {
    REC = { t0: globalThis.__app ? globalThis.__app.t : 0, log: [], sfx: [], clock: () => ((globalThis.__app ? globalThis.__app.t : 0) - REC.t0) / 1000 };
    const want = conductor.want;
    Object.assign(conductor, { t0: 0, n: 0, cur: { state: 'idle', start: 0, entry: null }, next: null, want: 'idle', planB: -1, plan: null, unlocked: true });
    conductor.lampEv = [{ t: -1e9, pat: '', base: 'm', vis: 1 }];
    conductor.sink = e => REC.log.push(e);
    if (want && want !== 'idle') conductor.request(want);
    return true;
  },
  get on() { return !!REC; },
  // 굽기: sec 초 · 스테레오 16비트 WAV(base64), 최고 0.9로 맞춤
  async wav(sec, opt = {}) { const out = await renderMix(REC ? REC.log : [], REC ? REC.sfx : [], sec, opt); return wavB64(out, opt); },
};
// 가상 지휘자로 상태 차례를 돌려 사건만 뽑음(들어 보기 도구 soundreel): plan = [{ t 초, state | boot | skip }]
function simulate(plan, sec) {
  const c = new Conductor(), log = []; let T = 0;
  c.clock = () => T; c.sink = e => log.push(e); c.unlocked = true;
  const todo = plan.slice().sort((a, b) => a.t - b.t);
  for (T = 0; T <= sec; T += 0.02) {
    while (todo.length && todo[0].t <= T) {
      const p = todo.shift(), st = p.state === 'result' ? (c.want === 'win' || c.want === 'lose' ? null : 'win') : p.state;   // 'result' = 정해진 승패 그대로(music() 과 같게)
      if (st) c.request(st, { urgent: st === 'win' || st === 'lose' });
      if (p.boot) c.boot();
      if (p.skip) c.skipIntro();
    }
    c.pump(T + 0.24);
  }
  return log;
}
async function renderMix(events, sfxList, sec, opt = {}) {
  const sr = 44100, off = new OfflineAudioContext(2, Math.ceil(sr * sec), sr), keep = { ctx, master, sfxBus, musicBus, noiseBuf, unlocked, PW: { ...PW } };
  try {
    ctx = off; master = off.createGain(); master.connect(off.destination);
    sfxBus = off.createGain(); sfxBus.gain.value = opt.noSfx ? 0 : SOUND.sfxVol; sfxBus.connect(master);
    musicBus = off.createGain(); musicBus.gain.value = opt.noMusic ? 0 : SOUND.musicVol; musicBus.connect(master);
    noiseBuf = makeNoise(off); makePW(off, PW);
    const MA = buildGraph(off, musicBus, noiseBuf, PW);
    for (const e of events) if (e.t < sec) playMusic(MA, e);
    for (const s of sfxList) if (SFX[s.name] && s.t < sec) for (const L of SFX[s.name]) voice(L, s.t, sfxBus, s.k ?? 1);
    const buf = await off.startRendering();
    return [buf.getChannelData(0), buf.getChannelData(1)];
  } finally { ({ ctx, master, sfxBus, musicBus, noiseBuf, unlocked } = keep); Object.assign(PW, keep.PW); }
}
function wavB64([L, R], opt = {}) {
  const N = L.length; let peak = 0, sq = 0;
  for (let i = 0; i < N; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > peak) peak = a; if (b > peak) peak = b; sq += L[i] * L[i] + R[i] * R[i]; }
  const rms0 = Math.sqrt(sq / (2 * N));
  // loud = 휴대폰으로 들어 보기 좋게(평균 세기를 −16dB 쯤으로 올리고 0.8 넘는 꼭대기만 부드럽게 눌러 찢어지지 않게), 아니면 최고 0.9로 맞춤
  const k = opt.gain || (opt.loud && rms0 > 0 ? Math.max(1, Math.min(3, 0.16 / rms0)) : peak > 0 ? 0.9 / peak : 1), buf = new ArrayBuffer(44 + N * 4), v = new DataView(buf);
  const lim = x => { const a = Math.abs(x); return a <= 0.8 ? x : Math.sign(x) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2)); };
  const S16 = x => Math.max(-32768, Math.min(32767, Math.round((opt.loud ? lim(x * k) : x * k) * 32767)));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + N * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, 44100, true); v.setUint32(28, 44100 * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, N * 4, true);
  for (let i = 0, o = 44; i < N; i++, o += 4) { v.setInt16(o, S16(L[i]), true); v.setInt16(o + 2, S16(R[i]), true); }
  const u8 = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(s), sec: N / 44100, peak, rms: Math.sqrt(sq / (2 * N)), gain: k };
}
// 들어 보기: 상태 차례(plan)를 가상으로 돌려 WAV — tools/shots/soundreel.mjs
async function reel(plan, sec, opt = {}) {
  const ev = simulate(plan.filter(p => !p.sfx), sec), sf = plan.filter(p => p.sfx).map(p => ({ t: p.t, name: p.sfx, k: 1 }));
  return wavB64(await renderMix(ev, sf, sec, opt), opt);
}
// 층 하나의 세기(섞음 고르기): 사건만 구워 최고 · RMS(맞춤 없이 게임 안 크기)
async function reelEvents(ev, sec) {
  const [L, R] = await renderMix(ev, [], sec); let peak = 0, sq = 0;
  for (let i = 0; i < L.length; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); sq += L[i] * L[i] + R[i] * R[i]; }
  return { peak, rms: Math.sqrt(sq / (2 * L.length)) };
}
// 검토 도구: window.__sound.sfx('crit') 등
try { globalThis.__sound = { sfx, music, unlock, SOUND, list: () => Object.keys(SFX), conductor, rec, reel, reelEvents, simulate, lampNow, introTime }; } catch {}
