// 배경 음악 지휘자 — 박자 격자 하나가 장면을 넘어 계속 돈다(2026-10-16 사용자 "배경음악과 여러 효과음을 엮고, 장소나 창이 바껴서 배경음이 조금 바뀌더라도,
//  끊기지 않고 자연스레 이어지게" · "전투시작 혹은 배경음이 바뀌는 상황에는 자연스럽게 세션이 이어지며 다른 비트감과 노래로 분위기 전환. 다시 돌아올 때도 동일하게").
//  · 격자 = 90 BPM 16분음표 칸(붐뱁 85~92). 장면은 상태 이름만 알림(sound.js music('home') …) → 다음 마디 첫 칸에 바뀜, 바뀌기 전 남은 박(급하면 다음 박부터)엔
//    이음 장식(필인 · 멈춤 가락). 곡을 처음부터 다시 틀거나 뚝 끊지 않는다 — 같은 곡 안의 변주(대기 · 메뉴 · 스마트팜 · 탐사 · 식물 관리)는 세션(층)만 켜고 끔.
//  · 세션(층) = 베이스(= 전등 소리 '두드 두드등') · 전등 지지직(타악) · 킥 · 스네어 · 하이햇 · 건반(FM 전자 피아노) · 가락 · 패드 · 베이스 솔로 ·
//    전투 = 808 · 박수 · 종소리 · 칩 가락 · 금관 찌름.
//  · 같은 곡 안의 결(장르, 2026-10-16 사용자 "탐사는 클래식? 양육은 재즈? 다만 과하게 바뀌어서 피로하지 않게"): 대기 = 붐뱁 그대로 · 메뉴 = 붐뱁 + 건반 홑음 가락(옅게) ·
//    스마트팜 = 재즈팝(10-17 "식물팜은 재즈팝": 거의 곧은 16분 · 2 · 4박 스네어 + 박수 · 그루브 베이스 · 로즈 · 신스 리드 + 비브라폰) · 탐사 = 몽환적 실내악
//    (10-17 "첼로랑 이런 세션이 들어오며 풍성하며 몽환적으로": 첼로 · 현악 패드 · 하프 · 첼레스타 · 긴 홀 울림 · 옅은 피치카토 · 여린 팀파니, 북 없음) ·
//    식물 관리 = 앰비언트 + 종. 가락의 큰 틀(음 흐름 · 강박 음 · 구절)은 어느 결이든 대기 가락 그대로. 화음 · 조 · 빠르기 · 곡 자리는 같음 — 결이 바뀔 땐 앞 마디 끝 박에 새 결의 이음 →
//    첫 마디는 새 결을 옅게(가락 없이, 타악은 차오름) + 옛 결 꼬리가 사라짐 → 가락은 그다음 두 마디 묶음 첫 마디부터.
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
  // 비브라폰(재즈팝 가락 겹침): 모터 떨림 하나를 버스에 · 신스 리드: 점8분 메아리(옅게, 반대쪽에서)
  const vibIn = G(1), vtrem = G(1), vlfo = ac.createOscillator(), vlfoG = G(0.2);
  vlfo.frequency.value = 5.6; vlfo.connect(vlfoG); vlfoG.connect(vtrem.gain); vlfo.start(0);
  vibIn.connect(vtrem); vtrem.connect(bus(0.5, 0.2, 0.42));
  const synIn = G(1), echo = ac.createDelay(1), efb = G(0.26), ewet = G(0.2);
  echo.delayTime.value = BEAT * 0.75; synIn.connect(bus(0.36, 0.1, 0.25)); synIn.connect(echo); echo.connect(efb); efb.connect(echo); echo.connect(ewet); ewet.connect(bus(1, -0.3, 0.3));
  // 넓은 홀 울림(몽환적 실내악): 긴 잔향 하나 — 현악 · 첼로 · 하프 · 첼레스타 · 플루트 · 피치카토 · 팀파니가 보냄
  const hall = ac.createConvolver(); hall.buffer = makeIR(ac, 1.7); const hret = G(0.17); hall.connect(hret); hret.connect(sum);   // 2026-10-17 "몽환 요소 줄이고": 3.2초 · 0.26 → 1.7초 · 0.17
  const hbus = (v, p, sv, hv) => { const g = bus(v, p, sv), s = G(hv); g.connect(s); s.connect(hall); return g; };
  return {
    ac, noise, pw, tone, sum,
    bass: bus(0.8), b808: b8, drum: drumIn,
    hat: bus(0.9, 0.24, 0, drumIn), snare: bus(1, 0, 0.12, drumIn),
    keys: keysIn, lead: bus(0.42, 0.16, 0.32), bell: bus(0.36, -0.22, 0.36), chip: bus(0.32, 0.1, 0.16), pad: padIn, stab: bus(0.3, 0.05, 0.25),
    crk: bus(0.5, 0, 0.1), fx: bus(0.45, 0, 0.3), drone, droneNow: null,
    vib: vibIn, syn: synIn,
    harp: hbus(0.8, 0.14, 0.12, 0.32), pizz: hbus(0.8, -0.04, 0.1, 0.14), str: hbus(0.32, 0.06, 0.2, 0.38), timp: hbus(0.7, 0, 0.15, 0.3),
    cello: hbus(0.55, -0.12, 0.15, 0.26), cel: hbus(0.5, -0.2, 0.1, 0.4), flute: hbus(0.42, 0.14, 0.15, 0.3),
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
  // fb = 재즈팝 핑거 베이스: 거름망이 조금 더 밝게 열렸다 닫히고, 뜯은 뒤 살짝 더 줄어듦
  lp.type = 'lowpass'; lp.Q.value = o.fb ? 3 : 4; lp.frequency.setValueAtTime(o.solo ? 1900 : o.fb ? 1500 : o.scoop ? 1700 : 1250, t); lp.frequency.exponentialRampToValueAtTime(o.solo ? 640 : o.fb ? 340 : 280, t + (o.fb ? 0.12 : 0.17));
  wg.gain.value = o.solo ? 0.8 : o.fb ? 0.62 : 0.5;
  w.connect(lp); lp.connect(wg); wg.connect(g); s.connect(g);
  const end = t + Math.max(0.05, len);
  g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.setTargetAtTime(v * (o.fb ? 0.62 : 0.72), t + 0.02, o.fb ? 0.12 : 0.09); g.gain.setTargetAtTime(0, end, 0.03);
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
// 가락: 부드러운 피리(세모 + 2배 약한 변조) · 늦게 들어오는 떨림 — dest = 실내악 플루트는 긴 홀 울림 버스로
function leadV(A, t, f, len, v, dest = A.lead) {
  const ac = A.ac, c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(), a = ac.createGain(), end = t + Math.max(0.06, len);
  c.type = 'triangle'; c.frequency.value = f; m.frequency.value = f * 2; mg.gain.value = f * 0.3;
  l.frequency.value = 5.2; lg.gain.value = 0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.45, len));
  m.connect(mg); mg.connect(c.frequency); l.connect(lg); lg.connect(c.frequency);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.03); a.gain.setTargetAtTime(v * 0.8, t + 0.06, 0.3); a.gain.setTargetAtTime(0, end, 0.06);
  c.connect(a); a.connect(dest);
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
// ── 결(장르)별 악기: 재즈팝(스마트팜) · 몽환적 실내악(탐사) ──
// 비브라폰(재즈팝 가락 겹침): 사인 + 4배 배음(말렛이 친 맑은 첫소리, 빨리 사라짐) — 모터 떨림은 버스에서 하나로, 끝에서 댐퍼로 멈춤
function vibV(A, t, f, len, v) {
  const ac = A.ac, o = ac.createOscillator(), h = ac.createOscillator(), hg = ac.createGain(), a = ac.createGain(), end = t + Math.max(0.12, len);
  o.frequency.value = f; h.frequency.value = f * 4;
  hg.gain.value = 0; hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.3, t + 0.002); hg.gain.setTargetAtTime(0, t + 0.004, 0.045);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.003); a.gain.setTargetAtTime(v * 0.4, t + 0.01, 0.5); a.gain.setTargetAtTime(0, end, 0.12);
  h.connect(hg); hg.connect(a); o.connect(a); a.connect(A.vib);
  o.start(t); h.start(t); o.stop(end + 0.7); h.stop(t + 0.35);
  return 4;
}
// 신스 리드(재즈팝 가락 — 따라 부를 만큼 또렷하게): 톱니 + 사각(살짝 어긋나게) → 부드러운 거름망, 늦은 비브라토 · 버스에 점8분 메아리
function synV(A, t, f, len, v) {
  const ac = A.ac, o1 = ac.createOscillator(), o2 = ac.createOscillator(), og = ac.createGain(), lp = ac.createBiquadFilter(), a = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(), end = t + Math.max(0.08, len);
  o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 6; og.gain.value = 0.45;
  lp.type = 'lowpass'; lp.Q.value = 1.4; lp.frequency.setValueAtTime(Math.min(5200, f * 7), t); lp.frequency.exponentialRampToValueAtTime(Math.min(3000, f * 4), t + 0.18);
  l.frequency.value = 5.6; lg.gain.value = 0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + Math.min(0.4, len));
  l.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.012); a.gain.setTargetAtTime(v * 0.78, t + 0.03, 0.2); a.gain.setTargetAtTime(0, end, 0.05);
  o1.connect(lp); o2.connect(og); og.connect(lp); lp.connect(a); a.connect(A.syn);
  for (const o of [o1, o2, l]) { o.start(t); o.stop(end + 0.35); }
  return 8;
}
// 하프(옅게, 길게 울림): 세모파 + 옥타브 사인(옅게) → 부드러운 거름망, 뜯은 뒤 1.5초쯤 울림
function harpV(A, t, f, len, v) {
  const ac = A.ac, o = ac.createOscillator(), h = ac.createOscillator(), hg = ac.createGain(), lp = ac.createBiquadFilter(), a = ac.createGain(), d = Math.max(1.6, len + 1.2);
  o.type = 'triangle'; o.frequency.value = f; h.frequency.value = f * 2; hg.gain.value = 0.22;
  lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.setValueAtTime(Math.min(6000, f * 7), t); lp.frequency.exponentialRampToValueAtTime(Math.max(600, f * 2.5), t + 0.4);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.004); a.gain.setTargetAtTime(v * 0.45, t + 0.01, 0.12); a.gain.setTargetAtTime(0, t + 0.2, d / 4.5);
  o.connect(lp); h.connect(hg); hg.connect(lp); lp.connect(a); a.connect(A.harp);
  o.start(t); h.start(t); o.stop(t + d + 0.05); h.stop(t + d + 0.05);
  return 6;
}
// 첼로(길게 잇는 선율): 톱니 둘(살짝 어긋나게) → 몸통 거름망, 활이 차오르고(짧은 음은 빠르게) 비브라토는 늦게 조금 — 음끼리 겹쳐 이어짐
function celloV(A, t, f, len, v) {
  const ac = A.ac, o1 = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), a = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(), end = t + Math.max(0.12, len);
  o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 7;
  lp.type = 'lowpass'; lp.Q.value = 1.1; lp.frequency.value = Math.min(2200, f * 6);
  l.frequency.value = 5.2; lg.gain.value = 0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(11, t + Math.min(0.7, len * 0.6));
  l.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + Math.min(0.22, len * 0.4)); a.gain.setTargetAtTime(v * 0.85, t + 0.25, 0.4); a.gain.setTargetAtTime(0, end, 0.22);
  o1.connect(lp); o2.connect(lp); lp.connect(a); a.connect(A.cello);
  for (const o of [o1, o2, l]) { o.start(t); o.stop(end + 1.2); }
  return 7;
}
// 첼레스타(반짝이는 음, 옅게): 사인 + 4배 배음(맑은 첫소리) — 긴 홀 울림으로
function celV(A, t, f, v) {
  const ac = A.ac, o = ac.createOscillator(), h = ac.createOscillator(), hg = ac.createGain(), a = ac.createGain(), d = 1.4;
  o.frequency.value = f; h.frequency.value = f * 4;
  hg.gain.value = 0; hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.25, t + 0.002); hg.gain.setTargetAtTime(0, t + 0.004, 0.06);
  env(a, t, v, 0.003, d);
  o.connect(a); h.connect(hg); hg.connect(a); a.connect(A.cel);
  o.start(t); h.start(t); o.stop(t + d + 0.05); h.stop(t + 0.5);
  return 4;
}
// 피치카토(실내악 베이스): 톱니 → 빨리 닫히는 거름망(휴대폰에서도 들리는 배음) + 옅은 사인 몸통, 튕긴 뒤 1초쯤 울림
function pizzV(A, t, f, v) {
  const ac = A.ac, s = ac.createOscillator(), w = ac.createOscillator(), lp = ac.createBiquadFilter(), wg = ac.createGain(), sg = ac.createGain(), a = ac.createGain(), d = 1.25;
  s.type = 'sine'; w.type = 'sawtooth'; s.frequency.value = f; w.frequency.value = f;
  lp.type = 'lowpass'; lp.Q.value = 2.5; lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.12);
  wg.gain.value = 0.7; sg.gain.value = 0.55;
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + 0.004); a.gain.setTargetAtTime(0, t + 0.012, 0.25);
  w.connect(lp); lp.connect(wg); wg.connect(a); s.connect(sg); sg.connect(a); a.connect(A.pizz);
  s.start(t); w.start(t); s.stop(t + d); w.stop(t + d);
  return 6;
}
// 현악 패드(콘트라베이스 · 비올라 · 바이올린): 음마다 톱니 둘(살짝 어긋나게) → 거름망 하나, 활처럼 천천히 차오르고 길게 사라짐(다음 마디와 겹쳐 끊김 없이)
//  — 떨림(비브라토) 하나가 화음 전체를 흔듦
function strV(A, t, fs, len, v, fmax = 1700) {   // fmax = 거름망이 열리는 끝(콘트라베이스는 낮게 — 휴대폰 대역은 덜 차지하고 깊이만)
  const ac = A.ac, f = ac.createBiquadFilter(), a = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(), end = t + Math.max(0.3, len); let n = 4;
  f.type = 'lowpass'; f.Q.value = 0.7; f.frequency.setValueAtTime(Math.min(700, fmax), t); f.frequency.linearRampToValueAtTime(fmax, t + Math.min(0.9, len * 0.5));
  l.frequency.value = 5.1; lg.gain.value = 0; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(7, t + Math.min(0.9, len * 0.6));
  a.gain.value = 0; a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(v, t + Math.min(0.7, len * 0.45)); a.gain.setTargetAtTime(0, end, 0.55);
  l.connect(lg);
  for (const fr of fs) for (const dt of [-5, 6]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt; lg.connect(o.detune); o.connect(f); o.start(t); o.stop(end + 1.4); n++; }
  f.connect(a); a.connect(A.str); l.start(t); l.stop(end + 1.4);
  return n;
}
// 팀파니(아주 여리게): 사인(살짝 높게 쳐서 내려앉음) + 옥타브 배음(빨리 사라짐) + 낮은 '둥' 잡음
function timpV(A, t, f, v) {
  const ac = A.ac, o = ac.createOscillator(), h = ac.createOscillator(), hg = ac.createGain(), a = ac.createGain(), d = 1.5;
  o.frequency.setValueAtTime(f * 1.03, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
  h.type = 'triangle'; h.frequency.setValueAtTime(f * 2.06, t); h.frequency.exponentialRampToValueAtTime(f * 2, t + 0.1);
  hg.gain.value = 0; hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(0.5, t + 0.004); hg.gain.setTargetAtTime(0, t + 0.01, 0.22);
  env(a, t, v, 0.005, d);
  o.connect(a); h.connect(hg); hg.connect(a); a.connect(A.timp);
  o.start(t); h.start(t); o.stop(t + d + 0.05); h.stop(t + d + 0.05);
  return 4 + noiseHit(A, t, 0.07, 'lowpass', 520, 0.6, v * 0.5, A.timp);
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
// 조율(오케스트라가 A에 맞추는 '우우웅'): 오보에 A가 먼저, 여러 악기가 조금씩 어긋난 음으로 들어와 흔들리다 같은 음 · 5도로 모이며
//  전등이 켜져 화분이 보이는 때(2마디 점화 '두드')까지 쭉 커지고(거름망도 열려 밝아짐) — 끝 1.6초 = 높은 현 · 튜바 · 트럼펫 · 현악 트레몰로가 빨라지고 공기 소리가 차오르는 절정 → 그 순간 바람에 날리듯 흩어짐
//  (2026-10-17 사용자 "쭉 커지다가 흩어지든 날리는 느낌" → "클라이막스로 커지기 전에 꺼지는 느낌 · 좀 더 늘려줘"(3마디) → "좀 더 빠르게 · 절정까지 너무 느긋해" = 2마디에 몰아서):
//  음마다 조금씩 다른 때에 위 · 아래로 갈라지며(전체는 멀어지듯 조금 낮아짐) 좌우로 퍼지고 빠르게 사라짐 + 바람 소리(잡음 거름망이 위로 쓸려 올라가며 왼쪽 → 오른쪽)
const TUNE = [   // [음, 파형, 거름망, 들어오는 때(초), 처음 어긋남(센트), 세기, 떨림(센트)] — 2마디(5.3초) 안에 빠르게 쌓임
  ['A4', 'pulse25', ['bandpass', 1300, 1.3], 0.1, 7, 0.1, 4],       // 오보에(조율 시작음)
  ['A4', 'square', ['lowpass', 1700, 0.7], 0.5, -26, 0.05, 0],      // 클라리넷
  ['A4', 'sawtooth', ['lowpass', 2600, 0.6], 0.8, 18, 0.042, 9],    // 바이올린 둘째
  ['E5', 'sawtooth', ['lowpass', 3200, 0.6], 1.1, 29, 0.032, 10],   // 바이올린 첫째(A–E 5도)
  ['A3', 'sawtooth', ['lowpass', 1500, 0.6], 1.4, -20, 0.05, 7],    // 비올라
  ['D3', 'sawtooth', ['lowpass', 900, 0.6], 1.75, 15, 0.055, 6],    // 첼로(D–A 5도)
  ['A2', 'sawtooth', ['lowpass', 520, 0.7], 2.05, -12, 0.06, 0],    // 콘트라베이스
  ['A3', 'triangle', ['lowpass', 1200, 0.5], 2.35, 9, 0.05, 0],     // 호른
  ['A5', 'sawtooth', ['lowpass', 4200, 0.6], 2.9, 22, 0.022, 11],   // 바이올린 높은 A(절정 — 밝게)
  ['A1', 'sawtooth', ['lowpass', 300, 0.7], 3.3, -10, 0.07, 0],     // 튜바(무게)
  ['E4', 'square', ['bandpass', 1500, 1.0], 3.7, 14, 0.032, 5],     // 트럼펫(5도 — 절정)
];
function droneV(A, t, len) {
  const ac = A.ac, dg = ac.createGain(); dg.gain.value = 1; dg.connect(A.drone); A.droneNow = dg;
  const rel = t + len - 0.02, pan = () => (ac.createStereoPanner ? ac.createStereoPanner() : null);   // 흩어지는 때 = 전등 점화(처음 화면 INTRO.ign = 2마디 = 이 소리 길이)
  let nodes = 1;
  TUNE.forEach(([nm, w, flt, at, c0, v, vib], i) => {
    const f = NOTE(nm), o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain(), pn = pan(), t1 = t + at;
    const D = Math.max(0.5, Math.min(1.3 + at * 0.2, rel - 0.06 - t1)), d = rel + (i % 4) * 0.04, dir = i % 2 ? 1 : -1, end = d + 0.75 + 0.12 * (i % 3);
    nodes += pn ? 4 : 3;
    if (A.pw && A.pw[w]) o.setPeriodicWave(A.pw[w]); else o.type = w === 'pulse25' ? 'square' : w;
    o.frequency.setValueAtTime(f * 2 ** (c0 / 1200), t1);
    o.frequency.linearRampToValueAtTime(f * 2 ** ((-c0 * 0.4) / 1200), t1 + D * 0.44);   // 지나쳤다가
    o.frequency.linearRampToValueAtTime(f * 2 ** ((c0 * 0.15) / 1200), t1 + D * 0.73);   // 다시 조금
    o.frequency.linearRampToValueAtTime(f, t1 + D);                                         // 모임(늦게 들어온 악기도 흩어지기 전에)
    o.frequency.setValueAtTime(f, d);
    o.frequency.exponentialRampToValueAtTime(f * 2 ** ((dir * (50 + 30 * (i % 3)) - 70) / 1200), end);   // 흩어짐
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 4.8 + (at % 1); lg.gain.value = f * (2 ** (vib / 1200) - 1); l.connect(lg); lg.connect(o.frequency); l.start(t1); l.stop(end); nodes += 2; }
    fl.type = flt[0]; fl.Q.value = flt[2];
    fl.frequency.setValueAtTime(flt[1] * 0.75, t1); fl.frequency.linearRampToValueAtTime(flt[1] * 2, rel);   // 커지며 밝아짐
    fl.frequency.exponentialRampToValueAtTime(flt[1] * 3.2, end);                                               // 흩어질 때 위로 쓸려 얇아짐
    const tA = t1 + 0.45, tB = Math.max(tA + 0.1, rel - 1.6);
    g.gain.setValueAtTime(0, t1); g.gain.linearRampToValueAtTime(v * 1.3, tA); g.gain.linearRampToValueAtTime(v * 1.9, tB); g.gain.exponentialRampToValueAtTime(v * 3.3, rel);   // 쭉 커짐 → 끝 1.6초에 더 빠르게(절정)
    g.gain.setValueAtTime(v * 3.2, d); g.gain.exponentialRampToValueAtTime(0.0004, end);
    o.connect(fl); fl.connect(g);
    if (pn) { pn.pan.setValueAtTime(0, d); pn.pan.linearRampToValueAtTime(dir * (0.35 + 0.18 * (i % 3)), end); g.connect(pn); pn.connect(dg); } else g.connect(dg);
    o.start(t1); o.stop(end + 0.05);
  });
  // 객석 숨소리(아주 옅은 낮은 잡음 — 함께 커지다 흩어질 때 사라짐)
  const n = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain(); nodes += 3;
  n.buffer = A.noise; n.loop = true; nf.type = 'bandpass'; nf.frequency.value = 480; nf.Q.value = 0.7;
  ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.035, rel); ng.gain.setTargetAtTime(0, rel, 0.12);
  n.connect(nf); nf.connect(ng); ng.connect(dg); n.start(t, nOff(t)); n.stop(rel + 1);
  // 공기 소리(끝 1.6초): 잡음 거름망이 위로 올라가며 차오름 — 절정으로 밀어 올림
  const rn = ac.createBufferSource(), rf = ac.createBiquadFilter(), rg = ac.createGain(); nodes += 3;
  rn.buffer = A.noise; rn.loop = true; rf.type = 'bandpass'; rf.Q.value = 0.9;
  rf.frequency.setValueAtTime(600, rel - 1.6); rf.frequency.exponentialRampToValueAtTime(2800, rel);
  rg.gain.setValueAtTime(0.0004, rel - 1.6); rg.gain.exponentialRampToValueAtTime(0.055, rel); rg.gain.setTargetAtTime(0, rel, 0.08);
  rn.connect(rf); rf.connect(rg); rg.connect(dg); rn.start(rel - 1.6, nOff(rel - 1.5)); rn.stop(rel + 0.6);
  // 현악 트레몰로(끝 1.6초): 전체 세기가 떨리기 시작해 점점 빠르게(6 → 13번/초) — 활을 빠르게 긋는 긴장
  const tr = ac.createOscillator(), trg = ac.createGain(); nodes += 2;
  tr.frequency.setValueAtTime(6, rel - 1.6); tr.frequency.linearRampToValueAtTime(13, rel);
  trg.gain.setValueAtTime(0, rel - 1.6); trg.gain.linearRampToValueAtTime(0.28, rel); trg.gain.setTargetAtTime(0, rel, 0.05);
  tr.connect(trg); trg.connect(dg.gain); tr.start(rel - 1.6); tr.stop(rel + 0.3);
  // 바람(흩어지는 순간): 잡음 거름망이 낮은 데서 높은 데로 쓸려 올라가며 왼쪽 → 오른쪽으로 지나감
  const wn = ac.createBufferSource(), wf = ac.createBiquadFilter(), wg = ac.createGain(), wp = pan(); nodes += wp ? 4 : 3;
  wn.buffer = A.noise; wn.loop = true; wf.type = 'bandpass'; wf.Q.value = 1.1;
  wf.frequency.setValueAtTime(420, rel - 0.05); wf.frequency.exponentialRampToValueAtTime(5200, rel + 0.85);
  wg.gain.setValueAtTime(0, rel - 0.05); wg.gain.linearRampToValueAtTime(0.11, rel + 0.1); wg.gain.exponentialRampToValueAtTime(0.0004, rel + 1);
  wn.connect(wf); wf.connect(wg);
  if (wp) { wp.pan.setValueAtTime(-0.5, rel); wp.pan.linearRampToValueAtTime(0.6, rel + 0.9); wg.connect(wp); wp.connect(dg); } else wg.connect(dg);
  wn.start(rel - 0.05, nOff(rel)); wn.stop(rel + 1.05);
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
    case 'vib': return vibV(A, e.t, e.f, e.len, e.v);
    case 'syn': return synV(A, e.t, e.f, e.len, e.v);
    case 'harp': return harpV(A, e.t, e.f, e.len, e.v);
    case 'cello': return celloV(A, e.t, e.f, e.len, e.v);
    case 'cel': return celV(A, e.t, e.f, e.v);
    case 'flute': return leadV(A, e.t, e.f, e.len, e.v, A.flute);
    case 'pizz': return pizzV(A, e.t, e.f, e.v);
    case 'str': return strV(A, e.t, e.fs, e.len, e.v, e.o && e.o.lp);
    case 'timp': return timpV(A, e.t, e.f, e.v);
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
  // 재즈팝 긴장음(T — 같은 화음에 11 · #11 · 13 · #9 b13) · 미끄러짐(S — 다음 화음 반음 위에서 미끄러져 들어감)
  Dm11: ['C4', 'E4', 'G4', 'A4'], Bbmaj9s11: ['C4', 'D4', 'E4', 'A4'], Gm13: ['Bb3', 'E4', 'F4', 'A4'], A7alt: ['G3', 'C4', 'F4', 'Bb4'],
  Ebm9: ['Db4', 'F4', 'Gb4', 'Bb4'], Bmaj9: ['C#4', 'D#4', 'F#4', 'A#4'], Abm9: ['B3', 'Eb4', 'Gb4', 'Bb4'], Bb7b9: ['Ab3', 'B3', 'D4', 'F4'],
  // 전투(금관 찌름)
  Dm: ['F3', 'A3', 'D4'], Dmc: ['E3', 'A3', 'D4'], Bb: ['F3', 'Bb3', 'D4'], A: ['E3', 'A3', 'C#4'], Gm: ['G3', 'Bb3', 'D4'], Eb: ['G3', 'Bb3', 'Eb4'],
};
const PAD_UP = c => CH[c].slice(1).map(n => NOTE(n) * 2);
const TENS = { Dm9: 'Dm11', Bbmaj9: 'Bbmaj9s11', Gm9: 'Gm13', A7b9: 'A7alt' }, SLIP = { Dm9: 'Ebm9', Bbmaj9: 'Bmaj9', Gm9: 'Abm9', A7b9: 'Bb7b9' };   // 패드 = 건반 화음 위 셋을 한 옥타브 위로
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
// 가락 옥타브 옮기기(악기 음역에 맞춤 — 가락 모양은 그대로)
const T8 = (s, d) => s.replace(/([A-G](?:#|b)?)(-?\d)/g, (m, n, o) => n + (+o + d));
// 장르가 바뀌어도 가락의 큰 틀은 대기 가락 그대로(2026-10-17 사용자 "멜로디 큰 틀은 바뀌지 않게, 조금은 장르에 따라") — 음 높이 흐름 · 강박 음 · 구절 길이 · 끊는 자리는 LEAD1~3,
//  장르 맛은 리듬 느낌(당김 · 이어 긋기) · 꾸밈음(이웃음 · 지나가는 음) · 끝음 처리 · 음색 · 옥타브만
// 메뉴 · 식물 관리: 대기 가락의 뼈대(강박 음만) — 메뉴 = 건반 홑음 · 식물 관리 = 종(길게), 구간마다 4마디(첫 바퀴 B = A2 것)
const MENU_MEL = {
  A2: ['. . . . A4 - - - D5 - - - - - - -', 'G4 - F4 - - - - - . . . . . . A4 -', 'Bb4 - - - - - - - F4 - - - G4 - - -', 'E4 - - - - - . . C#5 - - - . . . .'],
  B: ['F5 - - - - - D5 - - - - - D5 - - -', 'A4 - - - - - - - . . . . . . . .', 'D5 - - - - - Bb4 - - - - - Bb4 - - -', 'C#5 - - - - - - - E5 - - - . . . .'],
};
const FOCUS_MEL = {
  A2: ['. . . . A4 - - - D5 - - - - - - -', 'G4 - F4 - - - - - . . . . . . . .', 'Bb4 - - - - - - - F4 - - - - - - -', 'E4 - - - - - - - C#5 - - - - - - -'],
  B: ['F5 - - - - - D5 - - - - - - - - -', 'A4 - - - - - - - . . . . . . . .', 'D5 - - - - - Bb4 - - - - - - - - -', 'C#5 - - - - - - - E5 - - - - - - -'],
};
// ── 스마트팜 = 재즈팝: 거의 곧은 16분(살짝 스윙) · 2 · 4박 스네어 + 박수 · 그루브 베이스 · 로즈 화음 · 신스 리드(+ 비브라폰 겹침) ──
//  베이스: 처음 부분 · 막 바뀐 마디 = 근음 · 옥타브만 → 그 뒤 = 16분 고스트 · 옥타브 · 다음 근음에 반음 · 온음으로 닿음
const PB0 = ['D2^ - - - - - . . D3 - - - . . . .', 'Bb1^ - - - - - . . Bb2 - - - . . . .', 'G1^ - - - - - . . G2 - - - . . . .', 'A1^ - - - - - . . A2 - - - . . C#2 -'];
const PB = ['D2^ - . D2_ . . D3 - . . A2 - C3 - . A2', 'Bb1^ - . Bb1_ . . Bb2 - . . F2 - D2 - . F#2', 'G1^ - . G1_ . . G2 - . . D2 - F2 - . Bb1', 'A1^ - . A1_ . . A2 - . . E2 - G2 - . Eb2'];   // A7 끝 = Eb(으뜸 D에 반음 위에서 닿음 — 대리 화음 느낌)
//  로즈(뿌리음 없는 9화음 그대로): 처음 부분 = 온음표 → 그 뒤 = 길게 잡고 엇박에 한 번 밀기
const COMPP = ['C - - - - - - - . . C_ - - - - -', '. . C - - - - - - - C_ - - - . .', 'C - - - - - - - . . C_ - - - - -', '. . C - - - - - - - C_ - - - . .'];
//  그루브(가락 부분): 긴장음 화음이 엇박을 타며 밀고(2박 '그리고' · 3박 '그리고') · 마디 끝 '4박 그리고'에 다음 화음 반음 위 화음 → 다음 마디 첫 박으로 미끄러져 내려옴
const COMPJ = ['T - - . . . T_ - . . T_ - - . S_ .', '. . T - - . . . T_ . . T_ - - S_ .', 'T - - . . . T_ - . . T_ - - . S_ .', '. . T - - . . . T_ . . T_ - . S_ .'];
//  스네어: 2 · 4박 + 고스트(16분 뒤 칸) — 박을 타는 느낌
const PSN = ['. . . . X . . o . . o . X . . o', '. . . . X . . o . . o . X . o .'];
//  북: 처음 부분 = 8분 하이햇 + 1박 킥 + 여린 백비트 → 그 뒤 = 16분 하이햇 · 킥(1 · 2박 '그리고' · 3박) · 2 · 4박 스네어 + 박수
const PK = ['X . . . . . x . X . . . . . . .', 'X . . . . . x . X . . x . . . .'];
const PH = ['x o x o x o x o x o x o x o x o', 'x o x o x o x o x o x o x o O .'];
//  신스 리드: 대기 가락 그대로 + 16분 당김(음 하나를 16분 앞당겨 밀기)만 — A3 는 대기 LEAD3 그대로
const PJ1 = ['. . . . A4 - C5 - D5 - - C5 - - A4 -', 'G4 - F4 - - - - - . . F4 G4 - - A4 -', 'Bb4 - - A4 - - G4 - F4 - - - G4 - - -', 'E4 - - - - - . . C#5 - - D5 - - E5 -'];
const PJ2 = ['F5 - - E5 - - D5 - - - C5 - D5 - - -', 'A4 - - - - - - - . . . . F4 - A4 -', 'D5 - - C5 - - Bb4 - - - A4 - Bb4 - C5 -', 'C#5 - - - - - - - E5 - - - . . . .'];
// ── 탐사 = 몽환적 실내악: 곧은 박, 북 없이 · 첼로 · 현악 패드 · 하프 · 첼레스타 · 긴 홀 울림 · 옅은 피치카토 ──
//  가락(대기 가락 그대로): A2 = 첼로가 한 옥타브 아래로 · B = 플루트 · A3 = 플루트 + 첼로(옥타브 겹침) · 브레이크 = 첼로가 대기의 베이스 솔로 가락을
//   장르 맛 = 꾸밈음 몇 개(이웃음 · 지나가는 음)와 이어 긋기(같은 음 되풀이 → 길게) · 끝음 길게
const CL1 = ['. . . . A4 - C5 - D5 - - E5 C5 - A4 -', 'G4 - F4 - - - E4 F4 . . F4 - G4 - A4 -', 'Bb4 - - - A4 - G4 - F4 - - - G4 - - -', 'E4 - - - - - . . C#5 - - - D5 - E5 -'];
const CL2 = ['F5 - - - E5 - D5 - - - C5 - D5 - - -', 'A4 - - - - - Bb4 A4 . . . . F4 - A4 -', 'D5 - - - C5 - Bb4 - - - A4 - Bb4 - C5 -', 'C#5 - - - - - - D5 E5 - - - . . . .'];
const CL3 = ['. . D5 - - - - - C5 - A4 - . . G4 -', 'A4 - - - - - - - . . . . . . . .', '. . Bb4 - A4 - G4 - . . F4 - G4 - - -', '. . . . . . . . . . . . . . . .'];
//  첼로 반주(가락이 없거나 플루트에 있을 때): 화음 안 긴 음, 가락보다 아래 음역
const CELLO_A = ['F3 - - - - - - - - - - - E3 - - -', 'D3 - - - - - - - - - - - - - - -', 'D3 - - - - - - - Bb2 - - - - - - -', 'C#3 - - - - - - - E3 - - - - - - -'];
const CELLO_B = ['D3 - - - - - - - F3 - - - A3 - - -', 'Bb3 - - - - - - - A3 - - - F3 - - -', 'G3 - - - - - - - - - - - D3 - - -', 'E3 - - - - - - - C#3 - - - - - - -'];
//  현악 패드(비올라 · 바이올린 넷 — 9화음 · 6/9): C = 보통 음역(플루트 가락 아래), H = 한 옥타브 위(첼로가 가락일 때 · 처음 부분) · 근음은 콘트라베이스가 따로 길게
const STR = { Dm9: ['D4', 'F4', 'A4'], Bbmaj9: ['D4', 'F4', 'Bb4'], Gm9: ['D4', 'G4', 'Bb4'], A7b9: ['C#4', 'E4', 'A4'] };   // 2026-10-17 세 음 화음(9 · b9 반음 부딪힘 = "불협화음 같아" → 뺌), 가까운 자리로 이어짐
const STRH = Object.fromEntries(Object.entries(STR).map(([k, v]) => [k, v.map(n => T8(n, 1))]));
//  하프(옅게): 처음 부분 · A3 = 마디 첫머리 16분 한 번 훑기 / 쉬기 · A2 · B = 넓게 오르내리는 8분 분산 화음
const HFLO = ['D3 F3 A3 C4 E4 A4 . . . . . . . . . .', '. . . . . . . . Bb2 . F3 . D4 . . .', 'G2 Bb2 D3 F3 A3 D4 . . . . . . . . . .', '. . . . . . . . A2 . E3 . C#4 . . .'];
const HARP8 = ['D3 . A3 . D4 . F4 . A4 . E5 . D5 . A4 .', 'Bb2 . F3 . Bb3 . D4 . F4 . C5 . G4 . F4 .', 'G2 . D3 . G3 . Bb3 . D4 . A4 . F4 . D4 .', 'A2 . E3 . A3 . C#4 . E4 . Bb4 . G4 . E4 .'];
const HSWEEP = 'A3 . C#4 . E4 . G4 . Bb4 . C#5 . E5 . G5 .';   // 브레이크: 딸림화음을 훑어 올라감(b9 = Bb)
const RUN = { Dm9: ['A3', 'D4', 'F4', 'A4'], Bbmaj9: ['Bb3', 'D4', 'F4', 'Bb4'], Gm9: ['Bb3', 'D4', 'G4', 'Bb4'], A7b9: ['A3', 'C#4', 'E4', 'G4'] };   // 실내악으로 넘어갈 때 끝 박 16분 훑기
const CEL = ['. . . . . . A5 . . . . . E6 . . .', '. . . . . . D6 . . . . . C6 . . .', '. . . . . . Bb5 . . . . . A5 . . .', '. . . . . . E6 . . . . . C#6 . . .'];   // 첼레스타: 화음 음 둘(높게, 옅게)
const PZR = { Dm9: ['D2', 'A1'], Bbmaj9: ['Bb1', 'F2'], Gm9: ['G1', 'D2'], A7b9: ['A1', 'E2'] };   // 피치카토(옅게): 근음(첫 박) · 5음(B 부분 셋째 박)
const ROOT = { Dm9: 'D2', Bbmaj9: 'Bb1', Gm9: 'G1', A7b9: 'A1' };   // 마디 근음(낮게) — 팀파니 · 콘트라베이스
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

// 대기 곡 한 마디의 자리: 첫 바퀴 12마디(11 = 브레이크) → 그다음 16마디씩(끝 1마디, 홀수 바퀴는 2마디 브레이크) — 결마다 같은 자리 · 같은 화음
function homePos(sb) {
  const first = sb < 12, pos = first ? sb : (sb - 12) % 16, len = first ? 12 : 16, cyc = first ? 0 : 1 + Math.floor((sb - 12) / 16);
  const ci = pos % 4, two = !first && cyc % 2 === 1;
  const brk = pos === len - 1 ? (two ? 'b2' : 'b1') : two && pos === len - 2 ? 'b2a' : null;
  return { first, pos, ci, ch: PROG[ci], nx: PROG[(ci + 1) % 4], brk, sect: pos < 4 ? 'A' : pos < 8 ? 'A2' : pos < 12 ? 'B' : 'A3' };
}
// 결(장르)별 한 마디: (자리, 곡 상태, 상태 정의, 곡 안 마디, 바뀐 뒤 몇째 마디) → 층 → 16칸
const ARR = {
  // 붐뱁(대기 그대로 · 메뉴 · 식물 관리는 섞음 + 옅은 변주 가락)
  hip(q, cur, st, sb) {
    const { first, pos, ci, brk, sect } = q, L = {};
    if (brk) {   // 브레이크: 전등 지지직(그림도 떨림) → 북 · 건반 빠지고 베이스 솔로 → 스네어 필인으로 돌아감
      if (brk === 'b1') { L.crk = P('W . . . . . . . . . . . . . . .'); L.solo = P(SOLO1); L.keys = P('C_ - . . . . . . . . . . . . . .'); L.snare = P(D.fill); }
      else if (brk === 'b2a') { L.crk = P('Z . . . . . . . . . . . . . . .'); L.solo = P(SOLO2[0]); L.keys = P('C_ - - . . . . . . . . . . . . .'); L.hat = P('. . . . . . . . x . x . x . x .'); }
      else { L.solo = P(SOLO2[1]); L.keys = P('. . . . . . . . C_ - . . . . . .'); L.hat = P('x . x . x . x . . . . . . . . .'); L.snare = P(D.fill); }
      return L;
    }
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
    const vm = st.var === 'menu' ? MENU_MEL : st.var === 'focus' ? FOCUS_MEL : null, vs = vm && vm[sect === 'B' && first ? 'A2' : sect];
    if (vs) L[st.var === 'menu' ? 'mel' : 'fmel'] = P(vs[ci]);
    // 들어오는 길: 처음 화면에서 켜질 때 = 하나씩(건반 → 하이햇 → 스네어 → 가락 → 패드), 다른 곳에서 돌아올 땐 한 마디만 가락 · 패드 없이
    if (cur.entry === 'boot') {
      if (sb < 1) { delete L.hat; L.keys = P('C - - - - - - - - - . . . . . .'); }
      if (sb < 2) { delete L.snare; L.crk = P('. . . . j . . . . . . . J . . .'); }
      if (sb < 4) delete L.lead;
      if (sb < 8) delete L.pad;
    } else if (sb < 1) { delete L.lead; delete L.pad; }
    return L;
  },
  // 재즈팝(스마트팜 · 보관고): 처음 부분 · 막 바뀐 마디 = 옅은 북 + 근음 베이스 + 로즈 온음표 → 그 뒤 그루브 + 신스 리드(비브라폰 겹침)
  jpop(q, cur, st, sb, k) {
    const { first, ci, brk, sect } = q, L = {};
    if (brk) {   // 브레이크: 대기처럼 베이스 솔로(같은 가락) 위로 로즈 · 북이 옅게 계속(2026-10-17 사용자 "후반부에 재즈가 끊기던데") — 끝 마디는 스네어 채움으로 돌아감
      L.pbass = P(brk === 'b1' ? SOLO1 : SOLO2[brk === 'b2a' ? 0 : 1]);
      L.comp = P(brk === 'b2a' ? 'T - - . . . T_ . . . T_ - - . . .' : 'T - - . . . T_ . . . . . T_ - S_ .');
      L.pkick = P('X . . . . . . . X . . . . . . .');
      L.phat = P('x o x o x o x o x o x o x o x o');
      L.psn = P(brk === 'b2a' ? '. . . . o . . o . . o . o . . o' : '. . . . o . . o . . o . o x x X');
      return L;
    }
    const soft = sect === 'A' || k === 0;
    L.pbass = P(soft ? PB0[ci] : PB[ci]);
    L.comp = P(soft ? 'C - - - - - - - - - - - - - - -' : COMPJ[ci]);
    L.pkick = P(soft ? 'X . . . . . . . . . . . . . . .' : PK[ci === 3 ? 1 : 0]);
    L.phat = P(soft ? 'x . x . x . x . x . x . x . x .' : PH[ci === 3 ? 1 : 0]);
    L.psn = P(soft ? '. . . . o . . . . . . . o . . .' : PSN[ci === 3 ? 1 : 0]);
    if (!soft) L.pclap = P('. . . . x . . . . . . . x . . .');
    const mel = sect === 'A2' ? PJ1 : sect === 'B' ? (first ? PJ1 : PJ2) : sect === 'A3' ? LEAD3 : null;
    if (mel) { L.syn = P(mel[ci]); L.vib = L.syn; }
    return L;
  },
  // 몽환적 실내악(탐사 · 정비): 현악 패드 + 첼로 + 하프 · 첼레스타(옅게) + 옅은 피치카토, 으뜸 마디 첫 박에 아주 여린 팀파니 — 긴 홀 울림
  cham(q, cur, st, sb, k) {
    // 2026-10-17 "세션만 클래식 악기로 바꾸고 느낌만": 대기 곡(hip)과 같은 베이스 줄 · 건반 리듬 · 가락 — 베이스 = 피치카토 · 건반 = 현악(세 음) · 가락 = 플루트, 북 없음
    const { first, ci, brk, sect } = q, L = {};
    if (brk) {   // 브레이크: 대기의 베이스 솔로를 첼로가 한 옥타브 위로 · 첫 박에 현악 화음 하나
      L.cello = P(T8(brk === 'b1' ? SOLO1 : SOLO2[brk === 'b2a' ? 0 : 1], 1));
      L.str = P('C_ - - . . . . . . . . . . . . .');
      return L;
    }
    L.pizz = P(sect === 'B' ? BASS_B[ci] : BASS_A[ci]);
    L.str = P(sect === 'B' ? 'C - - - - - - - C_ - - - - - - -' : sect === 'A3' && ci < 3 ? 'C - - - - . . C_ - . . . . . N_ -' : 'C - - - - . . C_ - . C_ - - . . .');
    if (sect === 'A2') L.fl = P(LEAD1[ci]);
    if (sect === 'B') L.fl = P(first ? LEAD1[ci] : LEAD2[ci]);
    if (sect === 'A3') L.fl = P(LEAD3[ci]);
    return L;
  },
  // 실내악 + 비트(상점): 탐사 실내악 그대로(피치카토 베이스 줄 · 현악 · 플루트 가락) + 대기 곡 북(붐뱁 킥 · 2 · 4박 스네어 · 하이햇)을 곧은 박으로(ckick · csn · chat — 실내악 층과 박이 어긋나지 않게)
  chamb(q, cur, st, sb, k) {
    const L = ARR.cham(q, cur, st, sb, k), { pos, ci, brk } = q;
    if (brk) {   // 브레이크: 첼로 솔로 아래 하이햇만 → 끝 마디는 스네어 채움으로 돌아감
      L.chat = P(brk === 'b2a' ? '. . . . . . . . x . x . x . x .' : 'x . x . x . x . x . x . x . x .');
      if (brk !== 'b2a') L.csn = P(D.fill);
      return L;
    }
    L.ckick = P(ci === 3 ? D.kick2 : D.kick1);
    L.csn = P(pos % 2 ? D.sn2 : D.sn1);
    L.chat = P(pos % 2 ? D.hat2 : D.hat1);
    return L;
  },
};
// 이어 붙이기: 가락 층(새로 들어올 땐 기다림) · 새 결로 들어갈 때 차오르는 타악 · 결이 바뀔 때 옛 결이 남기는 꼬리(실내악은 현악 · 홀 울림이 저절로 길게 남음)
const MELO = ['lead', 'syn', 'vib', 'fl', 'cmel', 'mel', 'fmel'];
const PERC_IN = ['kick', 'snare', 'hat', 'pkick', 'psn', 'pclap', 'phat', 'ckick', 'csn', 'chat'];
const TAIL = { jpop: { phat: 'O . . . . . . . . . . . . . . .' } };
const mixOf = (st, ly) => (st.mix && st.mix[ly] != null ? st.mix[ly] : 1);
const styleOf = s => (STATES[s] && STATES[s].style) || 'hip';

// 곡: bar(곡 안 마디 번호, 지금 상태, 상태 정의) → { L: 층 → 16칸, ch 화음, nx 다음 화음, base 전등 바탕 글자, ramp 층 → [마디 첫 칸 세기, 끝 칸 세기] }
const SONGS = {
  // 처음 화면: 0~1마디 조율(빠르게 커져 절정) → 2마디 전등 점화('두드 두드등' — 음마다 전등이 따라 켜짐 · 조율이 흩어짐) → 3마디부터 베이스 + 전등 지지직 되풀이, 천천히 킥
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
  // 대기 곡(대기 · 메뉴 · 스마트팜 · 탐사 · 식물 관리): 자리 · 화음은 homePos, 결(장르)마다 ARR — 상태가 바뀐 첫 두 마디는 이어 붙이기(아래)
  home: {
    swing: 0.6, crkVis: 0, brkVis: 1,
    bar(sb, cur, st) {
      const q = homePos(sb), sty = st.style || 'hip', k = cur.at == null ? 99 : sb - cur.at;
      const L = ARR[sty](q, cur, st, sb, k), out = { L, ch: q.ch, nx: q.nx, sect: q.sect, brk: q.brk };
      // 같은 곡 안에서 상태가 막 바뀜(k = 0 첫 마디 · 1 둘째 마디): 새로 들어오는 가락은 두 마디 묶음 첫 마디부터(가락 한가운데서 뚝 끼어들지 않게)
      const pst = k < 2 && STATES[cur.prev];
      if (pst && pst.song === 'home') {
        const psty = pst.style || 'hip', PL = ARR[psty](q, cur, pst, sb, 99), on = (s2, Lx, ly) => !!Lx[ly] && mixOf(s2, ly) > 0;
        if (!q.brk) for (const ly of MELO) if (on(st, L, ly) && !on(pst, PL, ly) && (k === 0 || q.ci % 2)) delete L[ly];   // 브레이크 마디의 가락은 그 자체로 한 묶음 — 그대로
        if (k === 0 && psty === sty) { const r = out.ramp = {}; for (const ly in L) r[ly] = [mixOf(pst, ly), mixOf(st, ly)]; }   // 같은 결(붐뱁끼리): 층 세기를 한 마디 동안 옮겨 감
        else if (psty !== sty) {   // 다른 결(2026-10-17 "속도도 확 변하고 세션도 확 바뀌어"): 두 마디에 걸쳐 섞음 — 옛 결은 가락 · 북까지 남아 1 → 0.6 → 0, 새 결은 0.15 → 0.6 → 1
          const r = out.ramp = {}, oldK = k === 0 ? [1, 0.6] : [0.6, 0], newK = k === 0 ? [0.15, 0.6] : [0.6, 1], newMel = MELO.some(ly => L[ly]);
          for (const ly in L) { const m = mixOf(st, ly); r[ly] = [newK[0] * m, newK[1] * m]; }
          for (const ly in PL) {
            if (L[ly] || mixOf(pst, ly) <= 0) continue;
            if (MELO.includes(ly) && newMel) continue;   // 새 결 가락이 들어오면 옛 가락은 비킴(두 가락이 겹치지 않게)
            L[ly] = PL[ly]; const m = mixOf(pst, ly); r[ly] = [oldK[0] * m, oldK[1] * m];
          }
        }
      }
      return out;
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
      if (sb === 0) return { L: { pad: P('C^ - - - - - - - - - - - - - - -'), keys: P('. . . . . . . . C_ - - - - - - -') }, ch: prog[0], nx: prog[1] };   // 여운: 멈춤 가락이 울리는 동안 패드, 가락이 잦아든 뒤(반 마디) 건반이 살며시 — 빈 마디가 되지 않게
      const ci = (sb - 1) % 4, L = { keys: P('C - - - - - - - C_ - - - - - - -'), bass: P(RBASS[fl][ci]), crk: P('. . . . . . . . . . . . t . . .') };
      if (fl === 'win') { L.kick = P('x . . . . . . . . . x . . . . .'); L.snare = P('. . . . . . . . o . . . . . . .'); L.hat = P('x . o . x . o . x . o . x . o .'); }
      else L.hat = P('. . o . . . o . . . o . . . o .');
      return { L, ch: prog[ci], nx: prog[(ci + 1) % 4] };
    },
  },
};
// 상태 → 곡 · 결(style: 없음 = 붐뱁 · jpop = 재즈팝 · cham = 실내악 · chamb = 실내악 + 비트) · 섞음(층 세기 배수, 0 = 끔) · 변주(var) — 같은 곡 안의 상태끼리는 곡 자리 · 화음이 이어지고 결 · 층만 바뀜
export const STATES = {
  idle: { song: null },
  title: { song: 'title', wait: true },   // 소리가 풀린 뒤에 처음부터(조율을 놓치지 않게)
  home: { song: 'home' },
  menu: { song: 'home', mix: { lead: 0, pad: 0 }, var: 'menu' },
  farm: { song: 'home', style: 'jpop' },
  space: { song: 'home', style: 'cham' },
  shop: { song: 'home', style: 'chamb' },   // 상점 = 탐사와 같은 실내악 + 비트(2026-10-17)
  focus: { song: 'home', mix: { kick: 0, snare: 0, hat: 0.45, lead: 0, crk: 0.6 }, pad: true, tone: 2300, var: 'focus' },
  ready: { song: 'ready' },
  battle: { song: 'battle' },
  win: { song: 'result', flavor: 'win' },
  lose: { song: 'result', flavor: 'lose' },
};
// 층 → 악기 · 기본 세기
const LAYER = {
  bass: ['bass', 0.36], solo: ['bass', 0.42], b808: ['b808', 0.2], kick: ['kick', 0.8], snare: ['snare', 0.8], hat: ['hat', 0.32], clap: ['clap', 0.75],
  keys: ['ep', 0.26], lead: ['lead', 0.5], chip: ['chip', 0.5], bell: ['bell', 0.42], pad: ['pad', 0.07], stab: ['stab', 0.26], crk: ['crk', 0.55], fx: ['fx', 0.2],
  mel: ['ep1', 0.2], fmel: ['bell', 0.6],   // 메뉴 건반 홑음 · 식물 관리 종
  pbass: ['bass', 0.3], comp: ['ep', 0.2], syn: ['syn', 0.37], vib: ['vib', 0.2], pkick: ['kick', 0.6], psn: ['snare', 0.5], pclap: ['clap', 0.32], phat: ['hat', 0.2],   // 재즈팝
  ckick: ['kick', 0.8], csn: ['snare', 0.72], chat: ['hat', 0.32],   // 실내악 + 비트(상점) 북
  pizz: ['pizz', 0.6], harp: ['harp', 0.1], str: ['str', 0.13], cb: ['cb', 0.6], cello: ['cello', 0.22], cmel: ['cello', 0.28], cel: ['cel', 0.14], fl: ['flute', 0.42], timp: ['timp', 0.2],   // 실내악
};
const DRUMS = new Set(['kick', 'snare', 'hat', 'clap', 'pkick', 'psn', 'pclap', 'phat', 'timp', 'ckick', 'csn', 'chat']);   // 이음 장식 동안 빼는 타악
const DK = { X: 1.25, x: 1, o: 0.45, O: 1, r: 0.8, R: 0.75 };   // 북 글자 → 세기
// 스윙: 붐뱁 = 곡의 swing(16분 뒤 칸이 0.6 자리) · p = 재즈팝(거의 곧게 — 16분 뒤 칸 0.55) · s = 곧게(실내악)
const LSW = { pbass: 'p', comp: 'p', syn: 'p', vib: 'p', pkick: 'p', psn: 'p', pclap: 'p', phat: 'p', pizz: 's', harp: 's', str: 's', cello: 's', cmel: 's', cel: 's', cb: 's', fl: 's', timp: 's', ckick: 's', csn: 's', chat: 's' };
function swOff(s, ly, p) {
  const w = LSW[ly];
  if (w === 's') return 0;
  if (w === 'p') return s & 1 ? 0.1 * STEP : 0;
  return s & 1 ? (p.swing - 0.5) * 2 * STEP : 0;
}
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
  // 같은 곡 안: 붐뱁으로 = 열린 하이햇 한 번 · 재즈팝으로 = 끝 박 16분 고스트 스네어가 차오르고 넷째 박 '그리고'에 로즈가 다음 화음을 밀어 침 ·
  //  실내악으로 = 하프가 다음 화음을 16분으로 훑어 올라감(끝 박)
  mix(C, f, k, left, t) {
    const to = styleOf(f.state), nx = C.plan && C.plan.nx;
    if (to === 'hip' || to === styleOf(f.from)) { if (left === 2) C.out({ t, i: 'hat', v: 0.12, o: { open: true } }); return; }
    if (to === 'jpop') {
      if (left <= 4) C.out({ t, i: 'snare', v: [0, 0.3, 0.24, 0.18, 0.14][left], o: { ghost: left > 1 } });
      if (left === 2 && CH[nx]) CH[nx].forEach((n, j) => C.out({ t: t + j * 0.006, i: 'ep', f: NOTE(n), len: 0.5, v: 0.15 }));
    } else if ((to === 'cham' || to === 'chamb') && RUN[nx] && left <= 4) C.out({ t, i: 'harp', f: NOTE(RUN[nx][4 - left]), len: 0.3, v: 0.16 + 0.03 * (4 - left) });
  },
  home(C, f, k, left, t) {   // 거꾸로 심벌이 차오르고 스네어 넷으로 돌아옴(실내악으로 = 북 없이 — 2026-10-17 팀파니 굴림도 뺌)
    if (k === 0) C.out({ t, i: 'rev', len: left * STEP, v: 0.11 });
    if (left > 4) return;
    if (styleOf(f.state) !== 'cham') C.out({ t, i: 'snare', v: [0, 0.6, 0.42, 0.3, 0.24][left], o: { ghost: left > 2 } });
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
  begin(state) { const now = this.clock(); this.anchor(now + 0.06); this.cur = { state, start: 0, entry: 'silence' }; this.next = null; this.want = state; if (state === 'title') this.lampAdd(now - 0.5, '', 'a', 1); }   // 처음 화면 = 전등 꺼진 채로 시작(바로 지금부터)
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
      const p = this.barPlan(b);
      if (s === 0 && p.base) this.lampBaseAt(t, p.base);
      for (const ly in p.L) {
        if (mute === 'all' || (mute && mute.has(ly))) continue;
        const toks = p.L[ly], tok = toks[s];
        if (!tok || tok === '.' || tok === '-') continue;
        const r = p.ramp && p.ramp[ly], m = r ? r[0] + (r[1] - r[0]) * (s / 15) : mixOf(st, ly);   // 상태가 막 바뀐 마디 = 세기를 마디 동안 옮겨 감
        if (m > 0.02) this.hit(ly, tok, toks, s, t + swOff(s, ly, p) + (hsh(n, ly.length) - 0.5) * 0.006, m, p, n);
      }
    }
    if (fill && kind) FILLS[kind](this, fill, n - fill.fillFrom, fill.at * 16 - n, t);
  }
  lampBaseAt(t, base) { const L = this.lampEv, last = L[L.length - 1]; if (last.base !== base && !last.pat) this.lampAdd(t, '', base, 1); else if (last.base !== base && last.t + (last.pat.length * LAMP_MS) / 1000 <= t) this.lampAdd(t, '', base, 1); }
  apply(b) {
    const nx = this.next; this.next = null;
    const same = STATES[nx.state].song && STATES[nx.state].song === STATES[this.cur.state].song;
    // 같은 곡 = 곡 자리 그대로, 앞 상태(prev)와 바뀐 마디(at, 곡 안 번호)를 적어 둠 → 곡이 첫 마디를 이어 붙임
    this.cur = same ? { ...this.cur, state: nx.state, prev: this.cur.state, at: b - this.cur.start } : { state: nx.state, start: b, entry: nx.boot ? 'boot' : nx.from === 'idle' ? 'silence' : 'fast' };
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
    const lt = len * STEP;   // 길이(초)
    if (DRUMS.has(ly)) {
      const vv = v * (DK[nm] ?? 1);
      if (inst === 'kick') return this.out({ t, i: 'kick', v: vv, o: {} });
      if (inst === 'snare') return this.out({ t, i: 'snare', v: vv, o: { ghost: nm === 'o' } });
      if (inst === 'clap') return nm === 'o' ? this.out({ t, i: 'snare', v: vv * 0.6, o: { ghost: true } }) : this.out({ t, i: 'clap', v: vv });
      if (inst === 'timp') return this.out({ t, i: 'timp', f: NOTE(nm), v });
      const reps = nm === 'r' ? 2 : nm === 'R' ? 3 : 1;   // 하이햇 굴림
      for (let j = 0; j < reps; j++) this.out({ t: t + (j * STEP) / reps, i: 'hat', v: vv * (j ? 0.75 : 1), o: { open: nm === 'O' }, opt: nm === 'o' });
      return;
    }
    if (inst === 'ep' || inst === 'pad' || inst === 'stab' || inst === 'str') {
      const c = nm === 'C' || nm === 'H' ? p.ch : nm === 'N' ? p.nx : nm === 'T' ? TENS[p.ch] || p.ch : nm === 'S' ? SLIP[p.nx] || p.nx : nm;   // T = 긴장음 · S = 다음 화음 반음 위(미끄러짐)
      if (!CH[c]) return;
      if (inst === 'pad') return this.out({ t, i: 'pad', fs: PAD_UP(c), len: lt, v, opt: true });
      if (inst === 'str') return this.out({ t, i: 'str', fs: ((nm === 'H' ? STRH : STR)[c] || CH[c]).map(NOTE), len: lt, v, opt: true });   // H = 바이올린 한 옥타브 위
      if (inst === 'stab') return this.out({ t, i: 'stab', fs: CH[c].map(NOTE), len: lt * 0.9, v });
      CH[c].forEach((nt, j) => this.out({ t: t + j * 0.006, i: 'ep', f: NOTE(nt), len: lt * 0.92, v: v * (j === CH[c].length - 1 ? 1.1 : 1) }));
      return;
    }
    const f = NOTE(nm);
    if (inst === 'bass') return this.out({ t, i: 'bass', f, len: lt * 0.92, v, o: { scoop: flags.includes('/') ? 2 : 0, solo: ly === 'solo', fb: ly === 'pbass' } });
    if (inst === 'b808') return this.out({ t, i: 'b808', f, len: lt, v, o: {} });
    if (inst === 'pizz') return this.out({ t, i: 'pizz', f, v });
    if (inst === 'cel') return this.out({ t, i: 'cel', f, v });
    if (inst === 'cb') return this.out({ t, i: 'str', fs: [f], len: lt, v, o: { lp: 420 }, opt: true });   // 콘트라베이스(근음 길게)
    if (inst === 'ep1') return this.out({ t, i: 'ep', f, len: lt * 0.92, v });   // 건반 홑음(메뉴 가락)
    this.out({ t, i: inst, f, len: lt * 0.95, v });
  }
}
const nearLetter = k => { let best = 'm', d = 9; for (const L in LAMP_K) { const e = Math.abs(LAMP_K[L] - k); if (e < d) { d = e; best = L; } } return best; };

// ── 오프라인으로 굽기(영상 · 들어 보기 도구): 사건 목록 → 소리 상자 하나(음악 버스 세기 vol) ──
export function renderEvents(ac, out, events, noise, pw) {
  const A = buildGraph(ac, out, noise, pw);
  for (const e of events) play(A, e);
  return A;
}
