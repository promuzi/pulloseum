// 배경 음악 지휘자 — 박자 격자 하나가 장면을 넘어 계속 돈다(2026-10-16 사용자 "배경음악과 여러 효과음을 엮고, 장소나 창이 바껴서 배경음이 조금 바뀌더라도,
//  끊기지 않고 자연스레 이어지게" · "전투시작 혹은 배경음이 바뀌는 상황에는 자연스럽게 세션이 이어지며 다른 비트감과 노래로 분위기 전환. 다시 돌아올 때도 동일하게").
//  · 격자 = 90 BPM 16분음표 칸(붐뱁 85~92). 장면은 상태 이름만 알림(sound.js music('home') …) → 다음 마디 첫 칸에 바뀜, 바뀌기 전 남은 박(급하면 다음 박부터)엔
//    이음 장식(필인 · 멈춤 가락). 곡을 처음부터 다시 틀거나 뚝 끊지 않는다 — 같은 곡 안의 변주(대기 · 메뉴 · 스마트팜 · 탐사 · 식물 관리)는 세션(층)만 켜고 끔.
//  · 세션(층) = 베이스(= 전등 소리 '두드 두드등') · 전등 지지직(타악) · 킥 · 스네어 · 하이햇 · 건반(FM 전자 피아노) · 가락 · 패드 · 베이스 솔로 ·
//    전투 = 808 · 박수 · 종소리 · 칩 가락 · 금관 찌름.
//  · 전등 칸: 처음 화면 · 대기 화면의 전등 떨림 그림(loft.js · title.js)은 여기서 낸 '전등 사건'(퀘이크 빛 글자 줄)을 같은 시각에 따라감 — 소리와 빛이 같은 순간.
//  · 소리는 전부 코드로 합성(파일 · 샘플 없음 — 곡도 직접 지음, 저작권 우리 것). 박마다 만드는 노드 수를 세어 넘치면 꾸밈음부터 뺌(휴대폰 가볍게).
//  · 결정론: 같은 상태 요청 → 같은 사건(꾸밈 흔들림 = 칸 번호 해시). 영상 도구는 사건을 기록해 오프라인으로 같은 소리를 구움(sound.js rec).
export const BPM = 90, STEP = 60 / BPM / 4, BEAT = STEP * 4, BAR = STEP * 16;
const LOOK = 0.24;   // 앞당겨 예약하는 길이(초)

// ── 음 · 도우미 ──
export const NOTE = n => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return 440; const i = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] - 4) * 12; return 440 * 2 ** (i / 12); };
const P = s => s.trim().split(/\s+/);   // 한 마디 = 16칸 글자
const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const nOff = t => (Math.abs(Math.sin(t * 12.9898) * 43758.5453) % 1) * 0.8;   // 잡음 시작 자리(시각마다 다르게 — 결정론)
function env(g, t, v, a, d) { g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + d); }
function softClip(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); } return c; }
function makeIR(ac, sec) {   // 짧은 방 울림(지수로 줄어드는 잡음, 좌우 다르게 — 결정론)
  const sr = ac.sampleRate, n = Math.floor(sr * sec), b = ac.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let s = 7 + c * 131; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = ((s / 2147483647) * 2 - 1) * (1 - i / n) ** 2.8 * Math.min(1, i / (sr * 0.006)); } }
  return b;
}
const pan = (ac, p) => { if (!ac.createStereoPanner) { const g = ac.createGain(); return g; } const s = ac.createStereoPanner(); s.pan.value = p; return s; };

// ── 음악 길(소리 상자 하나에 한 번): 층마다 버스 → 합 → 어둡게(식물 관리) → 누름(압축) → out ──
export function buildGraph(ac, out, noise, pw) {
  const G = (v = 1) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const sum = G(1), tone = ac.createBiquadFilter(), comp = ac.createDynamicsCompressor();
  tone.type = 'lowpass'; tone.frequency.value = 18000; tone.Q.value = 0.4;
  comp.threshold.value = -15; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.22;
  sum.connect(tone); tone.connect(comp); comp.connect(out);
  const verb = ac.createConvolver(); verb.buffer = makeIR(ac, 1.3); const vret = G(0.34); verb.connect(vret); vret.connect(sum);
  const bus = (v, p = 0, sv = 0, to = sum) => { const g = G(v); let o = g; if (p) { const pn = pan(ac, p); g.connect(pn); o = pn; } o.connect(to); if (sv) { const s = G(sv); g.connect(s); s.connect(verb); } return g; };
  // 북: 먼지 낀 소리(위를 깎고 살짝 찌그러뜨림)
  const drumIn = G(1), dlp = ac.createBiquadFilter(), dsh = ac.createWaveShaper(), dout = G(0.9);
  dlp.type = 'lowpass'; dlp.frequency.value = 7800; dlp.Q.value = 0.4; dsh.curve = softClip(1.7);
  drumIn.connect(dlp); dlp.connect(dsh); dsh.connect(dout); dout.connect(sum);
  // 808: 일부러 찌그러뜨려 배음을 만듦(휴대폰 스피커에서도 들리게) → 위를 깎음
  const b8 = G(1), b8sh = ac.createWaveShaper(), b8lp = ac.createBiquadFilter(), b8o = G(0.4);
  b8sh.curve = softClip(3.2); b8lp.type = 'lowpass'; b8lp.frequency.value = 1100; b8.connect(b8sh); b8sh.connect(b8lp); b8lp.connect(b8o); b8o.connect(sum);
  // 건반: 떨림(트레몰로) 하나를 버스에 — 음마다 만들지 않음
  const keysIn = G(1), trem = G(1), lfo = ac.createOscillator(), lfoG = G(0.14);
  lfo.frequency.value = 4.3; lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start(0);
  keysIn.connect(trem); trem.connect(bus(0.5, -0.08, 0.3));
  const padIn = G(1), plp = ac.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 2400; padIn.connect(plp); plp.connect(bus(0.26, 0, 0.55));
  const drone = bus(0.9, 0, 0.7);
  return {
    ac, noise, pw, tone, sum,
    bass: bus(0.8), b808: b8, drum: drumIn,
    hat: bus(0.9, 0.24, 0, drumIn), snare: bus(1, 0, 0.12, drumIn),
    keys: keysIn, lead: bus(0.42, 0.16, 0.32), bell: bus(0.36, -0.22, 0.36), chip: bus(0.32, 0.1, 0.16), pad: padIn, stab: bus(0.3, 0.05, 0.25),
    crk: bus(0.5, 0, 0.1), fx: bus(0.45, 0, 0.3), drone, droneNow: null,
  };
}

// ── 악기(소리 하나 = 노드 몇 개, 돌려주는 값 = 만든 노드 수) ──
function noiseHit(A, t, d, type, fq, q, v, dest, a = 0.001) {
  const ac = A.ac, n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  n.buffer = A.noise; n.loop = true; f.type = type; f.frequency.value = fq; f.Q.value = q;
  env(g, t, v, a, d); n.connect(f); f.connect(g); g.connect(dest); n.start(t, nOff(t)); n.stop(t + d + 0.03);
  return 3;
}
// 베이스(= 전등 베이스): 사인 + 낮은 거름망 톱니(누르는 순간 열렸다 닫힘) — 폰 스피커에서도 2·3배음으로 음이 들리게. scoop = 반음 아래서 끌어올림('등')
function bassV(A, t, f, len, v, o = {}) {
  const ac = A.ac, g = ac.createGain(), s = ac.createOscillator(), w = ac.createOscillator(), lp = ac.createBiquadFilter(), wg = ac.createGain();
  s.type = 'sine'; w.type = 'sawtooth';
  const f0 = o.scoop ? f * 2 ** (-o.scoop / 12) : o.from || f;
  for (const x of [s, w]) { x.frequency.setValueAtTime(f0, t); if (f0 !== f) x.frequency.exponentialRampToValueAtTime(f, t + (o.glide || 0.08)); }
  lp.type = 'lowpass'; lp.Q.value = 4; lp.frequency.setValueAtTime(o.solo ? 1900 : o.scoop ? 1700 : 1250, t); lp.frequency.exponentialRampToValueAtTime(o.solo ? 640 : 280, t + 0.17);
  wg.gain.value = o.solo ? 0.8 : 0.5;
  w.connect(lp); lp.connect(wg); wg.connect(g); s.connect(g);
  const end = t + Math.max(0.05, len);
  g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.setTargetAtTime(v * 0.72, t + 0.02, 0.09); g.gain.setTargetAtTime(0, end, 0.03);
  g.connect(A.bass); s.start(t); w.start(t); s.stop(end + 0.22); w.stop(end + 0.22);
  return 5;
}
function kickV(A, t, v, o = {}) {
  const ac = A.ac, s = ac.createOscillator(), g = ac.createGain(), d = o.d || 0.42;
  s.frequency.setValueAtTime(o.f0 || 150, t); s.frequency.exponentialRampToValueAtTime(o.f1 || 46, t + 0.08);
  env(g, t, v, 0.003, d); s.connect(g); g.connect(A.drum); s.start(t); s.stop(t + d + 0.02);
  return 2 + noiseHit(A, t, 0.016, 'lowpass', 2800, 0.7, v * 0.45, A.drum);
}
// 스네어(붐뱁): 몸통(세모 195→150Hz) + 띠 잡음 + 높은 잡음 — 잡음 소스 하나를 둘로 나눔
function snareV(A, t, v, o = {}) {
  const ac = A.ac, n = ac.createBufferSource(), bp = ac.createBiquadFilter(), g1 = ac.createGain(), hp = ac.createBiquadFilter(), g2 = ac.createGain(), b = ac.createOscillator(), bg = ac.createGain(), d = o.ghost ? 0.08 : 0.21;
  n.buffer = A.noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 1850; bp.Q.value = 0.8; hp.type = 'highpass'; hp.frequency.value = 5200;
  env(g1, t, v * 0.9, 0.002, d); env(g2, t, v * 0.45, 0.001, d * 0.45);
  b.type = 'triangle'; b.frequency.setValueAtTime(198, t); b.frequency.exponentialRampToValueAtTime(150, t + 0.06); env(bg, t, v * (o.ghost ? 0.3 : 0.6), 0.002, 0.09);
  n.connect(bp); bp.connect(g1); g1.connect(A.snare); n.connect(hp); hp.connect(g2); g2.connect(A.snare); b.connect(bg); bg.connect(A.snare);
  n.start(t, nOff(t)); n.stop(t + d + 0.03); b.start(t); b.stop(t + 0.12);
  return 7;
}
const hatV = (A, t, v, o = {}) => noiseHit(A, t, o.open ? 0.24 : 0.038, 'highpass', o.open ? 6400 : 7600, 0.7, v, A.hat);
const crashV = (A, t, v) => noiseHit(A, t, 1.5, 'highpass', 4200, 0.5, v, A.drum, 0.004) + noiseHit(A, t, 0.55, 'bandpass', 8800, 1.2, v * 0.5, A.drum);
function clapV(A, t, v) {   // 박수: 띠 잡음을 세 번 빠르게 + 꼬리
  const ac = A.ac, n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  n.buffer = A.noise; n.loop = true; f.type = 'bandpass'; f.frequency.value = 1450; f.Q.value = 0.9;
  g.gain.value = 0; g.gain.setValueAtTime(0, t);
  for (const k of [0, 0.011, 0.022]) { g.gain.setValueAtTime(v, t + k); g.gain.exponentialRampToValueAtTime(v * 0.22, t + k + 0.009); }
  g.gain.setValueAtTime(v * 0.75, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
  n.connect(f); f.connect(g); g.connect(A.snare); n.start(t, nOff(t)); n.stop(t + 0.27);
  return 3;
}
function v808(A, t, f, len, v, o = {}) {   // 808: 높게 시작해 뚝 떨어지는 긴 사인(버스에서 찌그러뜨림), from = 앞 음에서 미끄러져 옴
  const ac = A.ac, s = ac.createOscillator(), g = ac.createGain(), f0 = o.from || f * 1.8, end = t + Math.max(0.08, len);
  s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f, t + (o.from ? 0.1 : 0.035));
  if (o.drop) s.frequency.exponentialRampToValueAtTime(o.drop, end);
  g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.setTargetAtTime(v * 0.62, t + 0.05, 0.3); g.gain.setTargetAtTime(0, end, 0.05);
  s.connect(g); g.connect(A.b808); s.start(t); s.stop(end + 0.4);
  return 2;
}
// 전자 피아노(FM): 1:1 변조(밝은 첫소리 → 둥글게) + 14배 아주 짧은 변조(금속 끝소리)
function epV(A, t, f, len, v) {
  const ac = A.ac, c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), tm = ac.createOscillator(), tg = ac.createGain(), a = ac.createGain();
  c.frequency.value = f; m.frequency.value = f; tm.frequency.value = f * 14;
  mg.gain.setValueAtTime(f * (1.1 + v * 3), t); mg.gain.exponentialRampToValueAtTime(f * 0.22, t + 0.7);
  tg.gain.setValueAtTime(f * 0.8, t); tg.gain.exponentialRampToValueAtTime(f * 0.01, t + 0.05);
  m.connect(mg); mg.connect(c.frequency); tm.connect(tg); tg.connect(c.frequency);
  const end = t + Math.max(0.08, len);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.004); a.gain.setTargetAtTime(v * 0.5, t + 0.01, 0.42); a.gain.setTargetAtTime(0, end, 0.1);
  c.connect(a); a.connect(A.keys);
  for (const o of [c, m, tm]) { o.start(t); o.stop(end + 0.6); }
  return 6;
}
// 가락: 부드러운 피리(세모 + 2배 약한 변조) · 늦게 들어오는 떨림
function leadV(A, t, f, len, v) {
  const ac = A.ac, c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(), a = ac.createGain(), end = t + Math.max(0.06, len);
  c.type = 'triangle'; c.frequency.value = f; m.frequency.value = f * 2; mg.gain.value = f * 0.3;
  l.frequency.value = 5.2; lg.gain.value = 0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.45, len));
  m.connect(mg); mg.connect(c.frequency); l.connect(lg); lg.connect(c.frequency);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.03); a.gain.setTargetAtTime(v * 0.8, t + 0.06, 0.3); a.gain.setTargetAtTime(0, end, 0.06);
  c.connect(a); a.connect(A.lead);
  for (const o of [c, m, l]) { o.start(t); o.stop(end + 0.4); }
  return 6;
}
function chipV(A, t, f, len, v) {   // 칩 가락(펄스 25%) — 게임 옛 소리 결
  const ac = A.ac, o = ac.createOscillator(), a = ac.createGain(), end = t + Math.max(0.05, len * 0.92);
  if (A.pw && A.pw.pulse25) o.setPeriodicWave(A.pw.pulse25); else o.type = 'square';
  o.frequency.value = f;
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.004); a.gain.setTargetAtTime(v * 0.7, t + 0.03, 0.12); a.gain.setTargetAtTime(0, end, 0.02);
  o.connect(a); a.connect(A.chip); o.start(t); o.stop(end + 0.15);
  return 2;
}
function bellV(A, t, f, len, v) {   // 종(FM 3.5배): 맑게 치고 빨리 둥글어짐
  const ac = A.ac, c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), a = ac.createGain(), d = Math.max(0.5, len + 0.7);
  c.frequency.value = f; m.frequency.value = f * 3.5;
  mg.gain.setValueAtTime(f * 2, t); mg.gain.exponentialRampToValueAtTime(f * 0.06, t + 0.8);
  m.connect(mg); mg.connect(c.frequency);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.002); a.gain.exponentialRampToValueAtTime(0.0008, t + d);
  c.connect(a); a.connect(A.bell); c.start(t); m.start(t); c.stop(t + d + 0.05); m.stop(t + d + 0.05);
  return 4;
}
function padV(A, t, fs, len, v) {   // 패드: 음마다 톱니 둘(살짝 어긋나게) → 천천히 열리는 거름망
  const ac = A.ac, f = ac.createBiquadFilter(), a = ac.createGain(), end = t + len; let n = 2;
  f.type = 'lowpass'; f.Q.value = 0.6; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1700, t + len * 0.6);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + Math.min(0.9, len * 0.4)); a.gain.setTargetAtTime(0, end, 0.4);
  for (const fr of fs) for (const dt of [-8, 8]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt; o.connect(f); o.start(t); o.stop(end + 1.8); n++; }
  f.connect(a); a.connect(A.pad);
  return n;
}
function stabV(A, t, fs, len, v) {   // 금관 찌름(전투): 톱니 화음 + 확 열렸다 닫히는 거름망
  const ac = A.ac, f = ac.createBiquadFilter(), a = ac.createGain(), end = t + Math.max(0.1, len); let n = 2;
  f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.28);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.01); a.gain.setTargetAtTime(v * 0.5, t + 0.04, 0.15); a.gain.setTargetAtTime(0, end, 0.06);
  for (const fr of fs) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = (n % 2 ? 6 : -6); o.connect(f); o.start(t); o.stop(end + 0.4); n++; }
  f.connect(a); a.connect(A.stab);
  return n;
}
// 전등 지지직: 빛 글자 줄을 따라 — 'm'(켜짐) 말고 글자가 바뀔 때마다 전기 찌직(꺼질수록 큼), 잡음 + 120Hz 톱니(안정기 웅)
const LV = { a: 1, e: 0.82, h: 0.6, k: 0.72 };
function crackleV(A, t, pat, ms, v) {
  const ac = A.ac, n = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain(), s = ac.createOscillator(), sb = ac.createBiquadFilter(), sg = ac.createGain(), st = ms / 1000;
  n.buffer = A.noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 3300; bp.Q.value = 1.1;
  s.type = 'sawtooth'; s.frequency.value = 120; sb.type = 'bandpass'; sb.frequency.value = 2300; sb.Q.value = 1.4;
  g.gain.value = 0; sg.gain.value = 0; g.gain.setValueAtTime(0, t); sg.gain.setValueAtTime(0, t);
  for (let i = 0; i < pat.length; i++) {
    const L = pat[i]; if (L === 'm' || L === 'o' || (i > 0 && pat[i - 1] === L)) continue;
    const tt = t + i * st, k = (LV[L] || 0.6) * v;
    g.gain.setValueAtTime(k, tt); g.gain.exponentialRampToValueAtTime(0.002, tt + st * 0.85);
    sg.gain.setValueAtTime(k * 0.7, tt); sg.gain.exponentialRampToValueAtTime(0.002, tt + st * 0.95);
  }
  const end = t + pat.length * st + 0.04;
  n.connect(bp); bp.connect(g); g.connect(A.crk); s.connect(sb); sb.connect(sg); sg.connect(A.crk);
  n.start(t, nOff(t)); s.start(t); n.stop(end); s.stop(end);
  return 6;
}
const tickV = (A, t, v) => noiseHit(A, t, 0.014, 'bandpass', 3100, 1.4, v, A.crk);
const zapV = (A, t, v) => noiseHit(A, t, 0.045, 'bandpass', 2500, 1.1, v, A.crk);
function humV(A, t, len, v) {   // 전등 안정기 웅: 60Hz 톱니의 배음만(띠 거름망) — 마디마다 겹쳐 이어 끊김 없이
  const ac = A.ac, s = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.type = 'sawtooth'; s.frequency.value = 60; f.type = 'bandpass'; f.frequency.value = 360; f.Q.value = 0.9;
  g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.2); g.gain.setValueAtTime(v, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.2);
  s.connect(f); f.connect(g); g.connect(A.crk); s.start(t); s.stop(t + len + 0.25);
  return 3;
}
function riserV(A, t, len, v, hi) {   // 솟음(잡음 띠가 위로) · hi = 거꾸로 심벌(높은 잡음이 차오름)
  const ac = A.ac, n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  n.buffer = A.noise; n.loop = true;
  if (hi) { f.type = 'highpass'; f.frequency.value = 4500; f.Q.value = 0.6; } else { f.type = 'bandpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(5000, t + len); }
  g.gain.value = 0; g.gain.setValueAtTime(0.0006, t); g.gain.exponentialRampToValueAtTime(v, t + len); g.gain.setTargetAtTime(0, t + len, 0.018);
  n.connect(f); f.connect(g); g.connect(A.fx); n.start(t, nOff(t)); n.stop(t + len + 0.12);
  return 3;
}
function downV(A, t, len, v) {   // 디스플레이 꺼지는 소리(처음 화면으로 돌아갈 때): 내려가는 사인
  const ac = A.ac, s = ac.createOscillator(), g = ac.createGain();
  s.frequency.setValueAtTime(520, t); s.frequency.exponentialRampToValueAtTime(38, t + len);
  env(g, t, v, 0.01, len); s.connect(g); g.connect(A.fx); s.start(t); s.stop(t + len + 0.02);
  return 2;
}
// 조율(오케스트라가 A에 맞추는 '우우웅'): 오보에 A가 먼저, 여러 악기가 조금씩 어긋난 음으로 들어와 흔들리다 같은 음 · 5도로 모이고, 화분이 나타날 때쯤 사라짐
const TUNE = [   // [음, 파형, 거름망, 들어오는 때(초), 처음 어긋남(센트), 세기, 떨림(센트)]
  ['A4', 'pulse25', ['bandpass', 1300, 1.3], 0.15, 7, 0.1, 4],      // 오보에(조율 시작음)
  ['A4', 'square', ['lowpass', 1700, 0.7], 0.85, -26, 0.05, 0],     // 클라리넷
  ['A4', 'sawtooth', ['lowpass', 2600, 0.6], 1.15, 18, 0.042, 9],   // 바이올린 둘째
  ['E5', 'sawtooth', ['lowpass', 3200, 0.6], 1.55, 29, 0.032, 10],  // 바이올린 첫째(A–E 5도)
  ['A3', 'sawtooth', ['lowpass', 1500, 0.6], 1.85, -20, 0.05, 7],   // 비올라
  ['D3', 'sawtooth', ['lowpass', 900, 0.6], 2.25, 15, 0.055, 6],    // 첼로(D–A 5도)
  ['A2', 'sawtooth', ['lowpass', 520, 0.7], 2.55, -12, 0.06, 0],    // 콘트라베이스
  ['A3', 'triangle', ['lowpass', 1200, 0.5], 2.85, 9, 0.05, 0],     // 호른
];
function droneV(A, t, len) {
  const ac = A.ac, dg = ac.createGain(); dg.gain.value = 1; dg.connect(A.drone); A.droneNow = dg;
  const peak = t + len * 0.72, fade = t + len * 0.8, end = t + len * 1.04; let nodes = 1;
  for (const [nm, w, flt, at, c0, v, vib] of TUNE) {
    const f = NOTE(nm), o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(), t1 = t + at, conv = t1 + 1.7 + at * 0.25; nodes += 3;
    if (A.pw && A.pw[w]) o.setPeriodicWave(A.pw[w]); else o.type = w === 'pulse25' ? 'square' : w;
    o.frequency.setValueAtTime(f * 2 ** (c0 / 1200), t1);
    o.frequency.linearRampToValueAtTime(f * 2 ** ((-c0 * 0.4) / 1200), t1 + 0.75);   // 지나쳤다가
    o.frequency.linearRampToValueAtTime(f * 2 ** ((c0 * 0.15) / 1200), t1 + 1.25);   // 다시 조금
    o.frequency.linearRampToValueAtTime(f, conv);                                       // 모임
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 4.8 + (at % 1); lg.gain.value = f * (2 ** (vib / 1200) - 1); l.connect(lg); lg.connect(o.frequency); l.start(t1); l.stop(end); nodes += 2; }
    fl.type = flt[0]; fl.frequency.value = flt[1]; fl.Q.value = flt[2];
    g.gain.value = 0; g.gain.setValueAtTime(0, t1); g.gain.linearRampToValueAtTime(v * 1.2, t1 + 0.7); g.gain.linearRampToValueAtTime(v * 2.2, peak); g.gain.setTargetAtTime(0, fade, (end - fade) / 3.2);
    o.connect(fl); fl.connect(g); g.connect(dg); o.start(t1); o.stop(end + 0.1);
  }
  // 객석 숨소리(아주 옅은 낮은 잡음)
  const n = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain(); nodes += 3;
  n.buffer = A.noise; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 480; nf.Q.value = 0.7;
  ng.gain.value = 0; ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.03, peak); ng.gain.setTargetAtTime(0, fade, 0.25);
  n.connect(nf); nf.connect(ng); ng.connect(dg); n.start(t, nOff(t)); n.stop(end);
  return nodes;
}
// 사건 하나 → 소리. e = { t, i(악기), f, fs, len, v, o, pat, ms }
export function play(A, e) {
  switch (e.i) {
    case 'bass': return bassV(A, e.t, e.f, e.len, e.v, e.o);
    case 'b808': return v808(A, e.t, e.f, e.len, e.v, e.o);
    case 'kick': return kickV(A, e.t, e.v, e.o);
    case 'snare': return snareV(A, e.t, e.v, e.o);
    case 'hat': return hatV(A, e.t, e.v, e.o);
    case 'clap': return clapV(A, e.t, e.v);
    case 'crash': return crashV(A, e.t, e.v);
    case 'ep': return epV(A, e.t, e.f, e.len, e.v);
    case 'lead': return leadV(A, e.t, e.f, e.len, e.v);
    case 'chip': return chipV(A, e.t, e.f, e.len, e.v);
    case 'bell': return bellV(A, e.t, e.f, e.len, e.v);
    case 'pad': return padV(A, e.t, e.fs, e.len, e.v);
    case 'stab': return stabV(A, e.t, e.fs, e.len, e.v);
    case 'crk': return crackleV(A, e.t, e.pat, e.ms, e.v);
    case 'tick': return tickV(A, e.t, e.v);
    case 'zap': return zapV(A, e.t, e.v);
    case 'hum': return humV(A, e.t, e.len, e.v);
    case 'riser': return riserV(A, e.t, e.len, e.v, false);
    case 'rev': return riserV(A, e.t, e.len, e.v, true);
    case 'down': return downV(A, e.t, e.len, e.v);
    case 'drone': return droneV(A, e.t, e.len);
    case 'cut': if (A.droneNow) A.droneNow.gain.setTargetAtTime(0, e.t, 0.12); return 0;
    case 'tone': A.tone.frequency.setTargetAtTime(e.f, e.t, 0.3); return 0;
  }
  return 0;
}

// ── 화음 · 곡 ──
//  건반 화음(근음 없이 — 베이스가 근음): 목소리가 반음 · 온음씩만 움직이게 놓음
const CH = {
  Dm9: ['C4', 'E4', 'F4', 'A4'], Bbmaj9: ['C4', 'D4', 'F4', 'A4'], Gm9: ['Bb3', 'D4', 'F4', 'A4'], A7b9: ['Bb3', 'C#4', 'E4', 'G4'],
  A7sus: ['A3', 'D4', 'E4', 'G4'], C6: ['G3', 'C4', 'E4', 'A4'], Fmaj9: ['A3', 'C4', 'E4', 'G4'],
  Dmaj: ['D4', 'F#4', 'A4', 'D5'], Dadd9: ['D4', 'F4', 'A4', 'E5'],
  // 전투(금관 찌름)
  Dm: ['F3', 'A3', 'D4'], Dmc: ['E3', 'A3', 'D4'], Bb: ['F3', 'Bb3', 'D4'], A: ['E3', 'A3', 'C#4'], Gm: ['G3', 'Bb3', 'D4'], Eb: ['G3', 'Bb3', 'Eb4'],
};
const PAD_UP = c => CH[c].slice(1).map(n => NOTE(n) * 2);   // 패드 = 건반 화음 위 셋을 한 옥타브 위로
const PROG = ['Dm9', 'Bbmaj9', 'Gm9', 'A7b9'];   // 대기(붐뱁) 진행 i – VI – iv – V
// 처음 화면 · 대기 공통 베이스 '두드 두드등'(근음 두드 · 두드 → '등' = 끌어올리는 긴 음 → 다음 화음으로 잇는 음)
const BASS_A = [
  'D2^ . D2_ . . . D2 . D2_ . F2/ - - - C2_ .',
  'Bb1^ . Bb1_ . . . Bb1 . Bb1_ . D2/ - - - A1_ .',
  'G1^ . G1_ . . . G1 . G1_ . Bb1/ - - - D2_ .',
  'A1^ . A1_ . . . A1 . A1_ . C#2/ - - - E2_ .',
];
const BASS_B = [   // B 부분: 붐뱁답게 비움
  'D2^ - - - . . . D2 . . A1 - . . C2_ .',
  'Bb1^ - - - . . . Bb1 . . F2 - . . A1_ .',
  'G1^ - - - . . . G1 . . D2 - . . F2_ .',
  'A1^ - - - . . . A1 . . E2 - G2_ . C#2 .',
];
const TITLE_FILL = 'A1^ . A1_ . C#2 . E2 . G2 . A2 - G2 E2 C#2 .';   // 처음 화면 8마디마다 베이스가 한 번 걸어 올라감
const LEAD1 = ['. . . . A4 - C5 - D5 - - - C5 - A4 -', 'G4 - F4 - - - - - . . F4 - G4 - A4 -', 'Bb4 - - - A4 - G4 - F4 - - - G4 - - -', 'E4 - - - - - . . C#5 - - - D5 - E5 -'];
const LEAD2 = ['F5 - - - E5 - D5 - - - C5 - D5 - - -', 'A4 - - - - - - - . . . . F4 - A4 -', 'D5 - - - C5 - Bb4 - - - A4 - Bb4 - C5 -', 'C#5 - - - - - - - E5 - - - . . . .'];
const LEAD3 = ['. . D5 - . . D5 - C5 - A4 - . . G4 -', 'A4 - - - . . . . . . . . . . . .', '. . Bb4 - A4 - G4 - . . F4 - G4 - - -', '. . . . . . . . . . . . . . . .'];
const ARP = ['D5 . F5 . A5 . C6 . E6 . C6 . A5 . F5 .', 'D5 . F5 . A5 . C6 . D6 . C6 . A5 . F5 .', 'Bb4 . D5 . F5 . A5 . D6 . A5 . F5 . D5 .', 'C#5 . E5 . G5 . Bb5 . C#6 . Bb5 . G5 . E5 .'];
const SOLO1 = 'A1^ . C2 C#2 E2 . G2 . A2 - G2 E2 . C#2 . A1/';
const SOLO2 = ['G1^ . . Bb1 . D2 . F2 - . E2 . D2 . Bb1 .', 'A1^ . C#2 . E2 . G2 . Bb2 - A2 . G2 E2 C#2 .'];
const D = {   // 북 무늬: X 강 · x 보통 · o 약(꾸밈) · O 열린 하이햇 · r 두 번 · R 세 번(32분)
  kick1: 'X . . . . . . x . . x . . . . .', kick2: 'X . . . . . . x . . x . . x . .',
  sn1: '. . . . X . . . . . . . X . . .', sn2: '. . . . X . . . . o . . X . . o',
  hat1: 'X . x . X . x o X . x . X . O .', hat2: 'X . x o X . x . X . x o X . x o',
  fill: '. . . . . . . . . . . . o o x X',
};
// 전투(어두운 트랩 · 칩): 반박자 느낌(박수 = 셋째 박) · 808 · 빠른 하이햇 굴림 · 종 가락 · 칩 영웅 가락
const BPROG = [['Dm', 'Dmc', 'Bb', 'A'], ['Gm', 'Dm', 'Eb', 'A']];
const B808 = [
  ['D2^ - - - - - . D2_ . . D2 - - . D3_ .', 'C2^ - - - - - . C2_ . . C2 - - . C3_ .', 'Bb1^ - - - - - . Bb1_ . . Bb1 - - . Bb2_ .', 'A1^ - - - - - . A1_ . . A1 - - E2 A2_ .'],
  ['G1^ - - - - - . G1_ . . G1 - - . G2_ .', 'D2^ - - - - - . D2_ . . D2 - - . D3_ .', 'Eb2^ - - - - - . Eb2_ . . Eb2 - - . Eb3_ .', 'A1^ - - - - - . A1_ . . C#2 - - E2 A2_ .'],
];
const BBELL = [
  ['D5 . . F5 . . A5 . . G5 . F5 . E5 . .', 'E5 . . G5 . . C5 . . E5 . D5 . C5 . .', 'D5 . . F5 . . Bb5 . . A5 . G5 . F5 . .', 'E5 . . C#5 . . A4 . . C#5 . E5 . G5 . .'],
  ['Bb4 . . D5 . . G5 . . F5 . D5 . Bb4 . .', 'A4 . . D5 . . F5 . . E5 . D5 . A4 . .', 'G4 . . Bb4 . . Eb5 . . D5 . Bb4 . G4 . .', 'C#5 . . E5 . . A5 . . G5 . E5 . C#5 . .'],
];
const BCHIP = [
  ['D5 - . D5 F5 - A5 - G5 - F5 - E5 - F5 -', 'E5 - - - . . C5 - E5 - G5 - F5 - E5 -', 'D5 - - - F5 - . F5 Bb5 - A5 - G5 - F5 -', 'E5 - - - - - . . A4 - C#5 - E5 - G5 -'],
  ['D6 - - - Bb5 - G5 - Bb5 - D6 - C6 - Bb5 -', 'A5 - - - F5 - D5 - F5 - A5 - G5 - F5 -', 'G5 - - - Eb5 - Bb4 - Eb5 - G5 - F5 - Eb5 -', 'E5 - - - - - - - C#5 - E5 - A5 - - -'],
];
const BHAT = ['x . x . x . x . x . x . x . x .', 'x . x . x . x r x . x . x . R .', 'x . x . x x x . x . x . r r x .', 'x . x . x . x . x . R . x x x x'];
// 결과(승패 뒤): 반박자 붐뱁 가볍게 — 이기면 밝게(Bb · C · F), 지면 비워서(Gm · Dm · Bb)
const RPROG = { win: ['Bbmaj9', 'C6', 'Fmaj9', 'A7sus'], lose: ['Gm9', 'Dm9', 'Bbmaj9', 'A7sus'] };
const RBASS = { win: ['Bb1^ - - - - - . . . . F2_ - . . . .', 'C2^ - - - - - . . . . G2_ - . . . .', 'F1^ - - - - - . . . . C2_ - . . . .', 'A1^ - - - - - . . . . E2_ - . . G1 .'], lose: ['G1^ - - - - - - - . . . . . . . .', 'D2^ - - - - - - - . . . . . . . .', 'Bb1^ - - - - - - - . . . . . . . .', 'A1^ - - - - - - - . . . . E2_ - . .'] };

// 곡: bar(곡 안 마디 번호, 지금 상태, 상태 정의) → { L: 층 → 16칸, ch 화음, nx 다음 화음, base 전등 바탕 글자 }
const SONGS = {
  // 처음 화면: 0~1마디 조율 → 2마디 전등 점화('두드 두드등' — 음마다 전등이 따라 켜짐) → 3마디부터 베이스 + 전등 지지직 되풀이, 천천히 킥
  title: {
    swing: 0.56, crkVis: 0.4,
    bar(sb) {
      if (sb < 0) return { L: {}, base: 'a' };
      if (sb === 0) return { L: { drone: P('X . . . . . . . . . . . . . . .') }, base: 'a' };
      if (sb === 1) return { L: {}, base: 'a' };
      if (sb === 2) return { L: { bass: P('D2^ . D2_ . . . D2^ . D2_ . D2/^ - - - - -'), ign: P('1 . 2 . . . 1 . 2 . 3 . . . . .'), hum: P('. . . . . . . . . . X - - - - -') }, base: 'a' };
      const lb = sb - 3, ci = lb % 4, L = {};
      L.bass = P(lb % 8 === 7 ? TITLE_FILL : BASS_A[ci]);
      L.crk = P(lb % 8 === 7 ? 'J . . . j . . . . . . . J . t t' : ci === 3 ? '. . . . j . . . . . . . J . t t' : '. . . . j . . . . . . . J . . .');
      if (lb >= 1) L.kick = P(lb < 3 ? 'o . . . . . . . . . . . . . . .' : lb < 5 ? 'x . . . . . . . . . x . . . . .' : D.kick1);   // 천천히 킥: 한 번 → 두 번 → 붐뱁 킥
      L.hum = P('X - - - - - - - - - - - - - - -');   // 전등 안정기 웅(켜진 동안 아주 옅게 — 베이스 사이 빈 곳을 채움)
      return { L, ch: PROG[ci], nx: PROG[(ci + 1) % 4], base: 'm' };
    },
  },
  // 대기(붐뱁): 첫 바퀴 12마디(11 = 브레이크) → 그다음 16마디씩(끝 1마디, 홀수 바퀴는 2마디 브레이크 = 전등 지지직 + 베이스 솔로)
  home: {
    swing: 0.6, crkVis: 0, brkVis: 1,
    bar(sb, cur, st) {
      const first = sb < 12, pos = first ? sb : (sb - 12) % 16, len = first ? 12 : 16, cyc = first ? 0 : 1 + Math.floor((sb - 12) / 16);
      const ci = pos % 4, ch = PROG[ci], nx = PROG[(ci + 1) % 4], two = !first && cyc % 2 === 1;
      const brk = pos === len - 1 ? (two ? 'b2' : 'b1') : two && pos === len - 2 ? 'b2a' : null;
      const L = {};
      if (brk) {   // 브레이크: 전등 지지직(그림도 떨림) → 북 · 건반 빠지고 베이스 솔로 → 스네어 필인으로 돌아감
        if (brk === 'b1') { L.crk = P('W . . . . . . . . . . . . . . .'); L.solo = P(SOLO1); L.keys = P('C_ - . . . . . . . . . . . . . .'); L.snare = P(D.fill); }
        else if (brk === 'b2a') { L.crk = P('Z . . . . . . . . . . . . . . .'); L.solo = P(SOLO2[0]); L.keys = P('C_ - - . . . . . . . . . . . . .'); L.hat = P('. . . . . . . . x . x . x . x .'); }
        else { L.solo = P(SOLO2[1]); L.keys = P('. . . . . . . . C_ - . . . . . .'); L.hat = P('x . x . x . x . . . . . . . . .'); L.snare = P(D.fill); }
        return { L, ch, nx, brk };
      }
      const sect = pos < 4 ? 'A' : pos < 8 ? 'A2' : pos < 12 ? 'B' : 'A3';
      L.bass = P(sect === 'B' ? BASS_B[ci] : BASS_A[ci]);
      L.kick = P(ci === 3 ? D.kick2 : D.kick1);
      L.snare = P(pos % 2 ? D.sn2 : D.sn1);
      L.hat = P(pos % 2 ? D.hat2 : D.hat1);
      L.keys = P(sect === 'B' ? 'C - - - - - - - C_ - - - - - - -' : sect === 'A3' && ci < 3 ? 'C - - - - . . C_ - . . . . . N_ -' : 'C - - - - . . C_ - . C_ - - . . .');
      L.crk = P(pos % 2 ? '. . . . . . . . . . . . t . . .' : '. . . . . . . . . . . . . . . .');
      if (sect === 'A2') L.lead = P(LEAD1[ci]);
      if (sect === 'B') { L.lead = P(first ? LEAD1[ci] : LEAD2[ci]); L.pad = P('C - - - - - - - - - - - - - - -'); }
      if (sect === 'A3') L.lead = P(LEAD3[ci]);
      if (st.pad && !L.pad) L.pad = P('C - - - - - - - - - - - - - - -');
      if (st.arp) L.bell = P(ARP[ci]);
      // 들어오는 길: 처음 화면에서 켜질 때 = 하나씩(건반 → 하이햇 → 스네어 → 가락 → 패드), 다른 곳에서 돌아올 땐 한 마디만 가락 · 패드 없이
      if (cur.entry === 'boot') {
        if (sb < 1) { delete L.hat; L.keys = P('C - - - - - - - - - . . . . . .'); }
        if (sb < 2) { delete L.snare; L.crk = P('. . . . j . . . . . . . J . . .'); }
        if (sb < 4) delete L.lead;
        if (sb < 8) delete L.pad;
      } else if (sb < 1) { delete L.lead; delete L.pad; }
      return { L, ch, nx, sect };
    },
  },
  // 매칭 대기: 808 한 음 + 심장 같은 킥 + 차오르는 하이햇 + 솟음 — 전투로 들어갈 준비
  ready: {
    swing: 0.5, crkVis: 0,
    bar(sb) {
      const two = sb % 2;
      return { L: {
        b808: P('D2^ - - - - - - - D2_ - - - - - - -'), kick: P('x . . . x . . . x . . . x . . .'),
        hat: P(two ? 'x x x x x x x x x x x x r r R R' : 'x . x . x . x . x . x . x . x .'),
        bell: P('A4_ . . . . . . . A4_ . . . . . . .'), fx: P('Q - - - - - - - - - - - - - - -'),
      }, ch: 'Dm', nx: 'Dm', two };
    },
  },
  battle: {
    swing: 0.5, crkVis: 0,
    bar(sb) {
      const pos = sb % 16, half = pos >= 8 ? 1 : 0, ci = pos % 4, sec = pos < 4 ? 'A' : pos < 8 ? 'A2' : pos < 12 ? 'B' : 'B2';
      const ch = BPROG[half][ci], nx = BPROG[pos % 8 === 7 ? 1 - half : half][(ci + 1) % 4];
      const L = {
        b808: P(B808[half][ci]), kick: P(D.kick1),
        clap: P(ci === 3 ? '. . . . . . . . X . . . . . o x' : '. . . . . . . . X . . . . . . .'),
        hat: P(BHAT[pos % 4]), bell: P(BBELL[half][ci]),
      };
      if (pos % 8 === 0) L.fx = P('C . . . . . . . . . . . . . . .');
      if (sec === 'A2') L.chip = P(BCHIP[0][ci]);
      if (sec === 'B' || sec === 'B2') L.stab = P('C - . . . . . . . . C_ - . . . .');
      if (sec === 'B2') L.chip = P(BCHIP[1][ci]);
      if (sb < 1) delete L.chip;
      return { L, ch, nx };
    },
  },
  result: {
    swing: 0.6, crkVis: 0,
    bar(sb, cur, st) {
      const fl = st.flavor || 'win', prog = RPROG[fl];
      if (sb === 0) return { L: { pad: P('C - - - - - - - - - - - - - - -') }, ch: prog[0], nx: prog[1] };   // 여운(멈춤 가락이 울리는 동안)
      const ci = (sb - 1) % 4, L = { keys: P('C - - - - - - - C_ - - - - - - -'), bass: P(RBASS[fl][ci]), crk: P('. . . . . . . . . . . . t . . .') };
      if (fl === 'win') { L.kick = P('x . . . . . . . . . x . . . . .'); L.snare = P('. . . . . . . . o . . . . . . .'); L.hat = P('x . o . x . o . x . o . x . o .'); }
      else L.hat = P('. . o . . . o . . . o . . . o .');
      return { L, ch: prog[ci], nx: prog[(ci + 1) % 4] };
    },
  },
};
// 상태 → 곡 · 섞음(층 세기 배수, 0 = 끔) — 같은 곡 안의 상태끼리는 곡이 이어지고 층만 바뀜
export const STATES = {
  idle: { song: null },
  title: { song: 'title', wait: true },   // 소리가 풀린 뒤에 처음부터(조율을 놓치지 않게)
  home: { song: 'home' },
  menu: { song: 'home', mix: { lead: 0, pad: 0 } },
  farm: { song: 'home', mix: { lead: 0 }, arp: true },
  space: { song: 'home', mix: { snare: 0, hat: 0.5, kick: 0.7, lead: 0.9 }, pad: true },
  focus: { song: 'home', mix: { kick: 0, snare: 0, hat: 0.45, lead: 0, crk: 0.6 }, pad: true, tone: 2300 },
  ready: { song: 'ready' },
  battle: { song: 'battle' },
  win: { song: 'result', flavor: 'win' },
  lose: { song: 'result', flavor: 'lose' },
};
// 층 → 악기 · 기본 세기
const LAYER = {
  bass: ['bass', 0.36], solo: ['bass', 0.42], b808: ['b808', 0.2], kick: ['kick', 0.8], snare: ['snare', 0.8], hat: ['hat', 0.32], clap: ['clap', 0.75],
  keys: ['ep', 0.26], lead: ['lead', 0.5], chip: ['chip', 0.5], bell: ['bell', 0.42], pad: ['pad', 0.07], stab: ['stab', 0.26], crk: ['crk', 0.55], fx: ['fx', 0.2],
};
const DRUMS = new Set(['kick', 'snare', 'hat', 'clap']);
// 전등 사건(빛 글자 줄, 한 글자 34ms — loft.js 와 같음): 점화 음 · 지지직 · 브레이크(대기 화면 떨림 묶음 = 예전 BURSTS 그대로)
const LAMP_MS = 34, JJ = 'akaah', JJJ = 'akakaaah', COMBO = JJ + 'mmmmmmmmm' + JJJ;
const IGN = { 1: ['mooommkkhhee', 'a', 0.2], 2: ['kkhhe', 'a', 0.13], 3: ['aomkoommm', 'm', 0.24] };   // [빛 글자 줄, 뒤 바탕, 찌직 세기] — '두' · '드' · '등'(켜진 채로)
const CRK = { j: [JJ, 0.6, 0.35], J: [JJJ, 0.7, 1], W: [JJJ, 0.9, 1], Q: [JJ, 0.9, 1], Z: [COMBO, 0.9, 1] };   // [빛 글자 줄, 소리 세기, 빛 무게 — 둘째 박 지직은 아주 옅게(눈 피로)]
export const LAMP_K = { a: 0, e: 0.33, h: 0.58, k: 0.83, m: 1, o: 1.17 };
// 이음 장식: 어디로 가느냐에 따라 · 그동안 지금 곡에서 빼는 층
const FILL_MUTE = { boot: null, mix: null, home: DRUMS, battle: DRUMS, ready: 'all', title: 'all', win: 'all', lose: 'all' };
const BOOT_UP = ['D4', 'F4', 'A4', 'C5', 'E5', 'F5', 'A5', 'C6', 'D6', 'E6', 'F6', 'A6'];
const FILLS = {
  // 처음 화면 → 대기(디스플레이 켜짐): 8분음표마다 화음을 타고 올라가는 종 · 건반(LED 가 켜지는 소리 = 음률이 더해짐) + 솟음, 처음 화면 곡은 그대로 이어짐
  boot(C, f, k, left, t) {
    if (k === 0) C.out({ t, i: 'riser', len: left * STEP, v: 0.12 });
    if (k % 2 === 0) { const nt = BOOT_UP[Math.min(BOOT_UP.length - 1, k / 2)]; C.out({ t, i: 'bell', f: NOTE(nt), len: 0.25, v: 0.3 }); C.out({ t, i: 'ep', f: NOTE(nt), len: 0.22, v: 0.17 }); }
  },
  mix(C, f, k, left, t) { if (left === 2) C.out({ t, i: 'hat', v: 0.12, o: { open: true } }); },
  home(C, f, k, left, t) {   // 거꾸로 심벌이 차오르고 스네어 넷으로 돌아옴
    if (k === 0) C.out({ t, i: 'rev', len: left * STEP, v: 0.11 });
    if (left <= 4) C.out({ t, i: 'snare', v: [0, 0.6, 0.42, 0.3, 0.24][left], o: { ghost: left > 2 } });
  },
  battle(C, f, k, left, t) {   // 솟음 + 스네어 굴림(마지막 둘은 32분)
    if (k === 0) C.out({ t, i: 'riser', len: left * STEP, v: 0.14 });
    if (left <= 4) { const v = [0, 0.62, 0.5, 0.4, 0.32][left]; C.out({ t, i: 'snare', v, o: {} }); if (left <= 2) C.out({ t: t + STEP / 2, i: 'snare', v: v * 0.85, o: { ghost: true } }); }
  },
  ready(C, f, k, left, t) { if (k === 0) { C.out({ t, i: 'kick', v: 0.75 }); C.out({ t, i: 'crash', v: 0.16 }); } },
  title(C, f, k, left, t) { if (k === 0) C.out({ t, i: 'down', len: Math.min(0.9, left * STEP + 0.2), v: 0.16 }); },
  // 승리: 박에 맞춰 '쿵' + D장조 화음 + 종 아르페지오(위로) · 패배: 808 이 미끄러져 내려가고 D단조(9) + 종이 한 칸씩 내려옴
  win(C, f, k, left, t) {
    if (k) return;
    C.out({ t, i: 'kick', v: 0.85 }); C.out({ t, i: 'crash', v: 0.22 }); C.out({ t, i: 'b808', f: NOTE('D2'), len: 1.6, v: 0.3, o: {} });
    for (const n of CH.Dmaj) C.out({ t, i: 'ep', f: NOTE(n), len: 1.4, v: 0.22 });
    ['D5', 'F#5', 'A5', 'D6'].forEach((n, j) => C.out({ t: t + j * STEP, i: 'bell', f: NOTE(n), len: j === 3 ? 1.2 : 0.2, v: 0.4 }));
  },
  lose(C, f, k, left, t) {
    if (k) return;
    C.out({ t, i: 'kick', v: 0.7 }); C.out({ t, i: 'b808', f: NOTE('D2'), len: 1.4, v: 0.28, o: { drop: NOTE('A1') } });
    for (const n of CH.Dadd9) C.out({ t, i: 'ep', f: NOTE(n), len: 1.6, v: 0.18 });
    ['A5', 'G5', 'F5', 'E5', 'D5'].forEach((n, j) => C.out({ t: t + j * STEP * 2, i: 'bell', f: NOTE(n), len: j === 4 ? 1.4 : 0.3, v: 0.35 }));
  },
};
function fillKind(from, to) {
  const a = STATES[from] && STATES[from].song, b = STATES[to].song;
  if (!a) return null;
  if (a === b) return 'mix';
  if (b === 'title') return 'title';
  if (b === 'battle') return 'battle';
  if (b === 'ready') return 'ready';
  if (b === 'result') return STATES[to].flavor;
  return 'home';
}

// ── 지휘자 ──
export class Conductor {
  constructor() {
    this.t0 = 0; this.n = 0;                                 // 격자 시작(음악 시각) · 다음에 낼 칸
    this.cur = { state: 'idle', start: 0, entry: null };    // 지금 상태 · 그 곡이 시작된 마디
    this.next = null; this.want = 'idle';                    // 예약된 바꿈 { state, at(마디), fillFrom(칸), urgent, from, boot }
    this.lampEv = [{ t: -1e9, pat: '', base: 'm', vis: 1 }];
    this.sink = null; this.clock = () => 0; this.lat = () => 0; this.unlocked = false;
    this.planB = -1; this.plan = null; this.budget = { beat: -1, n: 0 };
  }
  now() { return this.clock() - this.lat(); }   // 지금 들리는 음악 시각(초)
  stepT(n) { return this.t0 + n * STEP; }
  anchor(t) { this.t0 = t; this.n = 0; this.planB = -1; }
  // 처음 시작: 격자를 지금으로 맞추고 그 상태의 0마디부터
  begin(state) { this.anchor(this.clock() + 0.06); this.cur = { state, start: 0, entry: 'silence' }; this.next = null; this.want = state; if (state === 'title') this.lampAdd(this.t0, '', 'a', 1); }
  onUnlock() { this.unlocked = true; if (this.cur.state === 'idle' && this.want !== 'idle') this.begin(this.want); }
  // 상태 바꾸기 요청: 다음 마디 첫 칸(남은 마지막 박 = 이음 장식), urgent = 다음 박부터 장식(멈춤 가락) → 그다음 마디
  request(state, o = {}) {
    if (!STATES[state]) state = 'home';
    if (state === this.want && !o.force) return;
    this.want = state;
    if (this.cur.state === 'idle') { if (!STATES[state].wait || this.unlocked) this.begin(state); return; }
    const n = this.n;
    if (this.next && n >= this.next.fillFrom && !this.next.boot) { this.next.state = state; return; }   // 장식이 이미 시작됨 — 갈 곳만 바꿈
    if (state === this.cur.state) { this.next = null; return; }                                       // 마디가 바뀌기 전에 되돌아옴 — 예약 취소
    let at, fillFrom;
    if (o.urgent) { fillFrom = Math.ceil(n / 4) * 4; at = Math.floor(fillFrom / 16) + 1; }
    else { at = n % 16 === 0 ? n / 16 : Math.floor(n / 16) + 1; fillFrom = Math.max(n, at * 16 - 4); }
    this.next = { state, at, fillFrom, urgent: !!o.urgent, from: this.cur.state };
  }
  // 처음 화면 → 대기: 다음 박에 디스플레이가 켜지기 시작해 박 둘 이상 지난 첫 마디에 대기 곡이 떨어짐(켜지는 데 1.3~3.3초) → { t0 켜짐 시작, t1 대기 곡 시작 }(음악 시각)
  boot() {
    const n0 = Math.max(this.n, Math.ceil((this.clock() - this.t0) / STEP)), beat = Math.ceil(n0 / 4) * 4, at = Math.ceil((beat + 8) / 16);
    this.want = 'home';
    this.next = { state: 'home', at, fillFrom: beat, from: this.cur.state, boot: true };
    return { t0: this.stepT(beat), t1: this.stepT(at * 16) };
  }
  // 처음 화면 곡이 시작된 뒤 지난 초(처음 화면이 아니면 null)
  introTime(t = this.now()) { return this.cur.state === 'title' ? t - this.stepT(this.cur.start * 16) : null; }
  // 조율 중에 누르면 건너뜀: 다음 마디가 점화 마디가 되게
  skipIntro() {
    if (this.cur.state !== 'title') return false;
    const nb = Math.ceil(this.n / 16), sb = nb - this.cur.start;
    if (sb > 2) return false;
    this.cur.start = nb - 2; this.planB = -1;
    this.out({ t: this.stepT(this.n), i: 'cut' });
    return true;
  }
  lampAdd(t, pat, base, vis) {
    const L = this.lampEv; L.push({ t, pat, base, vis });
    if (L.length > 48) L.splice(0, L.length - 48);
  }
  // 지금 전등: { letter, k } — 사건 줄 안이면 그 글자(세기 vis 만큼), 지나면 바탕 글자
  lampAt(t = this.now()) {
    const L = this.lampEv; let e = L[0];
    for (let i = L.length - 1; i >= 0; i--) if (L[i].t <= t) { e = L[i]; break; }
    const i = Math.floor(((t - e.t) * 1000) / LAMP_MS);
    if (i >= 0 && i < e.pat.length) { const ch = e.pat[i], k = 1 + (LAMP_K[ch] - 1) * e.vis; return { letter: e.vis >= 0.99 ? ch : nearLetter(k), k, burst: true }; }
    // 바탕이 꺼짐(a)인 사건 뒤 = 꺼진 채
    return { letter: e.base, k: LAMP_K[e.base], burst: false };
  }
  out(e) { if (this.sink) this.sink(e); }
  pump(horizon = this.clock() + LOOK) {
    if (horizon - this.stepT(this.n) > 3) this.n = Math.max(this.n, Math.floor((horizon - 0.5 - this.t0) / STEP));   // 오래 멈췄다 돌아옴 — 지난 칸은 건너뜀
    let guard = 0;
    while (this.stepT(this.n) < horizon && guard++ < 400) { this.emit(this.n); this.n++; }
  }
  barPlan(b) {
    if (this.planB === b && this.plan && this.plan.state === this.cur.state) return this.plan;
    const st = STATES[this.cur.state], song = SONGS[st.song];
    const p = song.bar(b - this.cur.start, this.cur, st);
    p.state = this.cur.state; p.swing = song.swing; p.crkVis = song.crkVis; p.brkVis = song.brkVis ?? 1;
    this.planB = b; this.plan = p;
    return p;
  }
  emit(n) {
    const b = Math.floor(n / 16), s = n - b * 16, t = this.stepT(n);
    if (s === 0 && this.next && b >= this.next.at) this.apply(b);
    const st = STATES[this.cur.state], song = SONGS[st.song], fill = this.next && n >= this.next.fillFrom ? this.next : null;
    const kind = fill ? (fill.boot ? 'boot' : fillKind(fill.from, fill.state)) : null, mute = kind ? FILL_MUTE[kind] : null;
    if (song) {
      const p = this.barPlan(b), tt = t + (s & 1 ? (p.swing - 0.5) * 2 * STEP : 0);
      if (s === 0 && p.base) this.lampBaseAt(t, p.base);
      for (const ly in p.L) {
        if (mute === 'all' || (mute && mute.has(ly))) continue;
        const toks = p.L[ly], tok = toks[s];
        if (!tok || tok === '.' || tok === '-') continue;
        const m = st.mix && st.mix[ly] != null ? st.mix[ly] : 1;
        if (m > 0) this.hit(ly, tok, toks, s, tt + (hsh(n, ly.length) - 0.5) * 0.006, m, p, n);
      }
    }
    if (fill && kind) FILLS[kind](this, fill, n - fill.fillFrom, fill.at * 16 - n, t);
  }
  lampBaseAt(t, base) { const L = this.lampEv, last = L[L.length - 1]; if (last.base !== base && !last.pat) this.lampAdd(t, '', base, 1); else if (last.base !== base && last.t + (last.pat.length * LAMP_MS) / 1000 <= t) this.lampAdd(t, '', base, 1); }
  apply(b) {
    const nx = this.next; this.next = null;
    const same = STATES[nx.state].song && STATES[nx.state].song === STATES[this.cur.state].song;
    this.cur = same ? { ...this.cur, state: nx.state } : { state: nx.state, start: b, entry: nx.boot ? 'boot' : nx.from === 'idle' ? 'silence' : 'fast' };
    this.planB = -1;
    const t = this.stepT(b * 16);
    this.out({ t, i: 'tone', f: STATES[nx.state].tone || 18000 });
    if (STATES[nx.state].song !== 'title') this.lampBaseAt(t, 'm'); else this.lampAdd(t, '', 'a', 1);
  }
  // 한 칸의 글자 하나 → 사건
  hit(ly, tok, toks, s, t, m, p, n) {
    const [inst, v0] = LAYER[ly] || ['', 0.3], hum = 1 + (hsh(n, 7 + ly.length) - 0.5) * 0.12;
    let len = 1; for (let j = s + 1; j < 16 && toks[j] === '-'; j++) len++;
    const fl = /[\^_/]+$/.exec(tok), flags = fl ? fl[0] : '', nm = flags ? tok.slice(0, -flags.length) : tok;
    const v = v0 * m * hum * (flags.includes('^') ? 1.22 : flags.includes('_') ? 0.62 : 1);
    if (ly === 'ign') {   // 점화: 전등 사건 + 짧은 전기 찌직(음은 같은 칸의 베이스)
      const [pat, base, zv] = IGN[nm]; this.lampAdd(t, pat, base, 1); this.out({ t, i: 'zap', v: zv }); return;
    }
    if (ly === 'crk') {
      if (nm === 't') return this.out({ t, i: 'tick', v: 0.05 * m });
      const c = CRK[nm]; if (!c) return;
      const strong = /[WQZ]/.test(nm), vis = (strong ? p.brkVis : p.crkVis) * c[2];
      if (vis > 0) this.lampAdd(t, c[0], 'm', vis);
      return this.out({ t, i: 'crk', pat: c[0], ms: LAMP_MS, v: c[1] * 0.5 * m });
    }
    if (ly === 'drone') return this.out({ t, i: 'drone', len: BAR * 2 });
    if (ly === 'hum') return this.out({ t, i: 'hum', len: len * STEP, v: 0.07 * m });
    if (ly === 'fx') {
      if (nm === 'C') return this.out({ t, i: 'crash', v: 0.2 * m });
      if (nm === 'Q') return this.out({ t, i: 'riser', len: BAR - 0.05, v: (0.08 + 0.05 * (p.two || 0)) * m });
      return;
    }
    if (DRUMS.has(ly)) {
      const k = { X: 1.25, x: 1, o: 0.45, O: 1, r: 0.8, R: 0.75 }[nm] ?? 1, vv = v * k;
      if (ly === 'kick') return this.out({ t, i: 'kick', v: vv, o: {} });
      if (ly === 'snare') return this.out({ t, i: 'snare', v: vv, o: { ghost: nm === 'o' } });
      if (ly === 'clap') return nm === 'o' ? this.out({ t, i: 'snare', v: vv * 0.6, o: { ghost: true } }) : this.out({ t, i: 'clap', v: vv });
      const reps = nm === 'r' ? 2 : nm === 'R' ? 3 : 1;   // 하이햇 굴림
      for (let j = 0; j < reps; j++) this.out({ t: t + (j * STEP) / reps, i: 'hat', v: vv * (j ? 0.75 : 1), o: { open: nm === 'O' }, opt: nm === 'o' });
      return;
    }
    if (inst === 'ep' || inst === 'pad' || inst === 'stab') {
      const c = nm === 'C' ? p.ch : nm === 'N' ? p.nx : nm;
      if (!CH[c]) return;
      if (inst === 'pad') return this.out({ t, i: 'pad', fs: PAD_UP(c), len: len * STEP, v, opt: true });
      if (inst === 'stab') return this.out({ t, i: 'stab', fs: CH[c].map(NOTE), len: len * STEP * 0.9, v });
      CH[c].forEach((nt, j) => this.out({ t: t + j * 0.006, i: 'ep', f: NOTE(nt), len: len * STEP * 0.92, v: v * (j === CH[c].length - 1 ? 1.1 : 1) }));
      return;
    }
    const f = NOTE(nm);
    if (inst === 'bass') return this.out({ t, i: 'bass', f, len: len * STEP * 0.92, v, o: { scoop: flags.includes('/') ? 2 : 0, solo: ly === 'solo' } });
    if (inst === 'b808') return this.out({ t, i: 'b808', f, len: len * STEP, v, o: {} });
    this.out({ t, i: inst, f, len: len * STEP * 0.95, v });
  }
}
const nearLetter = k => { let best = 'm', d = 9; for (const L in LAMP_K) { const e = Math.abs(LAMP_K[L] - k); if (e < d) { d = e; best = L; } } return best; };

// ── 오프라인으로 굽기(영상 · 들어 보기 도구): 사건 목록 → 소리 상자 하나(음악 버스 세기 vol) ──
export function renderEvents(ac, out, events, noise, pw) {
  const A = buildGraph(ac, out, noise, pw);
  for (const e of events) play(A, e);
  return A;
}
