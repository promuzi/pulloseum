// 원형 방(코덱스 홈)을 살아 있게 — 2026-10-15 사용자 "바깥 풍경 … 고정이 아니라 바뀌고, 애니 효과도 … 전등 효과도 고정이 아닌
//  깜빡거리거나 먼지같은 흐림 등 효과도 알아보고 잘 넣어줘".
//  전등: 퀘이크 빛 글자 방식(글자 a = 꺼짐 … m = 평소, 한 글자 = 80ms — Valve 개발 위키 Lightstyle·Alan Zucconi 글) — 평소엔 m,
//    35~60초마다 형광등이 지직 · 지지직 · 지직-지지직 하고 떠는 묶음 하나(아래 BURSTS — 2026-10-16). 단계 그림은 tools/pixel/big/loft_light.mjs 가 배경에서 빛 층을 떼어 구움(원뿔·바닥 고인 빛).
//  먼지: 빛기둥 안에서만 보이는 작은 점 — 기둥 가운데일수록·전등이 밝을수록 밝고, 저마다 다른 박자로 떠다니다 가끔 빛을 받아 반짝.
//  흐림: 빛기둥 안 아주 옅은 따뜻한 안개가 천천히 피어오름(감기는 잡음 무늬를 위로 밀어 올림).
//  창: sky.js 우주 — 들어올 때마다 다음 풍경, 오래 머물면 디더로 다음 풍경. 유리 위로 이어지는 원뿔 빛 띠 + 옅은 반사.
import { BGIMG, BGMETA, BIG, drawBig, bigBox } from './sprites.js';
import { MOTION, slow } from '../core/motion.js';
import { lampSound, lampNow } from '../core/sound.js';
import { makeSky, renderSky, blendSky, SKY_KINDS, rng } from './sky.js';

export const LOFT_STOOL = [134, 356];   // 의자 앉는 판 윗면 가운데(격자 확대로 잼) = 화분 굽이 닿는 점
const LV = { a: 0, e: 1, h: 2, k: 3, o: 4 };   // 단계 그림 번호(m = 원본, 덧그림 없음)
const K = { a: 0, e: 0.33, h: 0.58, k: 0.83, m: 1, o: 1.17 };
// 형광등 떨림(2026-10-16 사용자 "전등 깜빡이 더 빠르게. 진짜 지지징" → 같은 날 "너무 잦아. 지직, 지지직 2개 하고 패턴을 지직 · 지지직 · 지직-지지직, 텀은 길게 — 눈이 피로할 수 있음"):
//  한 글자 = 34ms(퀘이크 빛 글자 — a = 꺼짐 · k = 반쯤 · h = 다시 붙는 중 · m = 평소). 지 = 꺼졌다 반쯤, 직 = 길게 꺼졌다 다시 붙음.
//  묶음 셋 = 지직(0.17초) · 지지직(0.27초) · 지직-지지직(사이 0.3초 쉼).
//  같은 날 "전등 지지직 효과에 맞춰 중간중간 브레이크와 함께 베이스 솔로" → 떨리는 때는 음악 지휘자(core/music.js)가 정함: 대기 곡 브레이크 자리에서만
//  (첫 바퀴 약 29초 뒤 · 그다음 약 43초마다 — 예전 35~60초 텀 그대로 드물게), 소리(지지직)와 빛이 같은 순간.
const STEP = 34;
const JJ = 'akaah', JJJ = 'akakaaah';
const BURSTS = [[JJ, 0.45], [JJJ, 0.35], [JJ + 'mmmmmmmmm' + JJJ, 0.2]];
const WARM = [255, 214, 160];
let S = null, visits = 0;

export function enterLoft() { visits++; if (S) S.fresh = true; }
// 검토·영상용 손잡이(콘솔·tools/shots/scenevideo.mjs --act): 깜빡임 묶음 바로 · 별똥별 바로 · 먼 배 바로 · 풍경 번호
globalThis.__loft = {
  burst(p = 'jj') { if (S) { S.flick.pat = { jj: JJ, jjj: JJJ, combo: BURSTS[2][0] }[p] || p; S.flick.start = globalThis.__app ? globalThis.__app.t : 0; lampSound(S.flick.pat, STEP); } },   // 'jj' · 'jjj' · 'combo' 또는 글자 줄
  meteor() { if (S && S.sky) S.sky.nextEvt = 0; },
  ship() { if (S && S.sky) S.sky.nextShip = 0; },
  view(i) { visits = i; },
};

function setup() {
  const meta = BGMETA.home_loft; if (!meta) return null;
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (const [y, a, b] of meta.spans) { x0 = Math.min(x0, a); x1 = Math.max(x1, b); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, mask = new Uint8Array(w * h);
  for (const [y, a, b] of meta.spans) for (let x = a; x <= b; x++) mask[(y - y0) * w + x - x0] = 1;
  // 유리 가장자리 안쪽 그늘(테두리 두께) · 반사 띠(왼쪽 위 비스듬히 두 줄)
  const edge = new Uint8Array(w * h), refl = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!mask[i]) continue;
    let near = 9; for (let d = 1; d <= 3 && near === 9; d++) if (y - d < 0 || !mask[i - d * w] || x - d < 0 || !mask[i - d]) near = d;
    edge[i] = near <= 3 ? 4 - near : 0;
    const s = x + y, cx = x - w / 2, cy = y - h / 2;
    if (cx < -8 && cy < -8 && Math.hypot(cx, cy) > w * 0.3 && ((s >= 54 && s <= 56) || s === 64)) refl[i] = s === 64 ? 1 : 2;
  }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h);
  // 원뿔 가장자리: 벽에 보이는 빛기둥 줄들의 왼·오른 끝을 직선으로 맞춤 → 유리 위로 이어 그림
  const fit = pts => { let n = 0, a = 0, b = 0, aa = 0, ab = 0; for (const [p, q] of pts) { n++; a += p; b += q; aa += p * p; ab += p * q; } const k = (n * ab - a * b) / (n * aa - a * a); return [(b - k * a) / n, k]; };
  const rows = meta.cone.filter(r => r[0] >= 52 && r[0] <= 118);
  const L = fit(rows.map(r => [r[0], r[1]])), R = fit(rows.map(r => [r[0], r[2]]));
  const coneI = (x, y) => { if (y < 30) return 0; const l = L[0] + L[1] * y, r = R[0] + R[1] * y, c = (l + r) / 2, hw = (r - l) / 2; if (hw < 1) return 0; const v = 1 - Math.abs(x + 0.5 - c) / hw; return v <= 0 ? 0 : v ** 0.7; };
  // 흐림 무늬(64×64, 가로·세로 감김)
  const N = new Float32Array(64 * 64), rr = rng(77);
  const lat = Array.from({ length: 64 }, () => rr());
  const vn = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), H = (a, b) => lat[((a % p + p) % p * 7 + (b % p + p) % p * 13) & 63];
    const A = H(xi, yi), B = H(xi + 1, yi), Cc = H(xi, yi + 1), D = H(xi + 1, yi + 1); return A + (B - A) * ux + (Cc - A) * uy * (1 - ux) + (D - B) * ux * uy; };
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) N[y * 64 + x] = vn(x / 16, y / 16, 4) * 0.6 + vn(x / 8, y / 8, 8) * 0.4;
  const hz = { x: 60, y: 24, w: 150, h: 162 }, hcv = document.createElement('canvas'); hcv.width = hz.w; hcv.height = hz.h;
  const hctx = hcv.getContext('2d'), himg = hctx.createImageData(hz.w, hz.h);
  // 먼지
  const mr = rng(31), motes = [];
  const spawn = m => { for (let k = 0; k < 40; k++) { const y = 34 + mr() * 146, l = L[0] + L[1] * y, r = R[0] + R[1] * y, x = l + (r - l) * (0.15 + mr() * 0.7); if (coneI(x, y) > 0.2) { m.x = x; m.y = y; return m; } } m.x = 135; m.y = 80; return m; };
  for (let k = 0; k < 30; k++) motes.push(spawn({ vx: (mr() - 0.5) * 2.4, vy: (mr() - 0.6) * 3.2, per: 2400 + mr() * 4200, ph: mr() * 6.28, amp: 2 + mr() * 4, tw: 900 + mr() * 1800, sp: mr() * 6.28 }));
  return { meta, x0, y0, w, h, mask, edge, refl, cv, ctx, img, u32: new Uint32Array(img.data.buffer), coneI, N, hz, hcv, hctx, himg, motes, spawn,
    flick: { next: 0, pat: null, start: 0 }, sky: null, skyB: null, mix: null, last: 0, plantCv: null, visits: -1 };
}

// 지금 전등 글자(t ms): 검토 손잡이(__loft.burst)로 띄운 묶음이 있으면 그것, 아니면 지휘자의 전등 칸(대기 곡 브레이크 자리에서만 떪)
function lampLetter(t) {
  const f = S.flick;
  if (f.pat) {
    const i = Math.floor((t - f.start) / STEP);
    if (i >= 0 && i < f.pat.length) return f.pat[i];
    f.pat = null;
  }
  const L = lampNow();
  return L.letter === 'a' && !L.burst ? 'm' : L.letter;   // 처음 화면 곡의 '꺼진 바탕'은 방 그림엔 쓰지 않음(꺼진 방은 loftNight 가 그림)
}

// 배경 + 전등 단계 + 창 밖 우주 + 유리 위 빛 띠. 반환 = 지금 전등 밝기 k
function ensure() { if (!S && BGIMG.home_loft) { S = setup(); if (S) S.r = rng(1234); } return !!S; }
export function loftBack(app) {
  const { g, t } = app;
  const bg = BGIMG.home_loft; if (!bg) return 1;
  if (!ensure()) { g.img(bg, 0, 0); return 1; }
  g.img(bg, 0, 0);
  // 들어올 때마다 다음 풍경, 75초 머물면 디더로 다음 풍경(1.6초)
  if (S.visits !== visits || !S.sky) {
    S.visits = visits; const kind = SKY_KINDS[(visits + SKY_KINDS.length - 1) % SKY_KINDS.length];
    S.sky = makeSky(kind, 9001 + visits * 977, S.w, S.h); S.skyB = null; S.mix = null; S.skyT = t;
  }
  if (!S.skyB && t - S.skyT > 75000) { const n = (SKY_KINDS.indexOf(S.sky.kind) + 1) % SKY_KINDS.length; S.skyB = makeSky(SKY_KINDS[n], 9001 + t | 0, S.w, S.h); S.mixT = t; }
  const letter = lampLetter(t), k = K[letter];
  // 전등 단계(원본이 아니면 빛 구역만 덮어 그림)
  const dim = BGIMG.home_loft_dim, D = S.meta.dim;
  if (dim && letter !== 'm') { const li = LV[letter]; for (const b of D.boxes) g.c.drawImage(dim, 0, li * D.stripH + b.oy, b.w, b.h, b.x, b.y, b.w, b.h); }
  // 창(30fps로 갱신)
  if (t - S.last >= 30 || S.lastK !== k) {
    S.last = t; S.lastK = k;
    let buf = renderSky(S.sky, t, S.mask);
    if (S.skyB) {
      const b2 = renderSky(S.skyB, t, S.mask), m = Math.min(1, (t - S.mixT) / 1600);
      if (!S.mix) S.mix = new Uint32Array(S.w * S.h);
      buf = blendSky(buf, b2, m, S.w, S.h, S.mix);
      if (m >= 1) { S.sky = S.skyB; S.skyB = null; S.skyT = t; }
    }
    const out = S.u32, { w, h, x0, y0 } = S;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let c = buf[i]; if (!S.mask[i]) { out[i] = 0; continue; }
      let r = c & 255, gg = (c >> 8) & 255, b = (c >> 16) & 255;
      const Y = y0 + y, X = x0 + x;
      if (Y < 196) {   // 원뿔 빛이 유리 위로 이어짐(코덱스 그림의 갈색 띠) — 아래로 갈수록 옅게
        const a = 0.52 * S.coneI(X, Y) * Math.max(0, 1 - (Y - 120) / 76) * k;
        if (a > 0) { r += (196 - r) * a; gg += (128 - gg) * a; b += (72 - b) * a; }
      }
      if (S.edge[i]) { const f = 1 - S.edge[i] * 0.12; r *= f; gg *= f; b *= f; }
      if (S.refl[i]) { const a = S.refl[i] === 2 ? 0.12 : 0.07; r += (255 - r) * a; gg += (255 - gg) * a; b += (255 - b) * a; }
      out[i] = (0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, gg) << 8) | Math.min(255, r)) >>> 0;
    }
    S.ctx.putImageData(S.img, 0, 0);
  }
  g.c.imageSmoothingEnabled = false; g.c.drawImage(S.cv, S.x0, S.y0);
  S.k = k;
  return k;
}

// 식물(전등에 맞춰 어두워지거나 밝아짐): 화분+식물을 따로 그린 뒤 그 칸에만 색을 덮음
export function loftPlant(app, key, pot, bx, by) {
  const { g, t } = app, k = S ? S.k ?? 1 : 1;
  const dk = S ? S.darkA || 0 : 0;
  if (!S || (k === 1 && dk <= 0)) return drawBig(g, key, pot, bx, by, { t, flat: true });   // flat = 의자 각도(12°) 화분
  if (!S.plantCv) { S.plantCv = document.createElement('canvas'); S.plantCv.width = 140; S.plantCv.height = 140; }
  const c = S.plantCv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 140, 140);
  drawBig({ c }, key, pot, 70, 124, { t, flat: true });
  c.globalCompositeOperation = 'source-atop';
  if (k !== 1) { c.fillStyle = k < 1 ? `rgba(10,14,30,${((1 - k) * 0.42).toFixed(3)})` : `rgba(255,200,130,${((k - 1) * 0.6).toFixed(3)})`; c.fillRect(0, 0, 140, 140); }
  if (dk > 0) {   // 암실: 위 전등 빛을 받아 위쪽이 따뜻하게 밝아지고 화분 아래로 갈수록 원래 색
    const gr = c.createLinearGradient(0, 24, 0, 124);
    gr.addColorStop(0, `rgba(255,214,150,${(0.34 * dk).toFixed(3)})`); gr.addColorStop(0.55, `rgba(255,196,120,${(0.16 * dk).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,196,120,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 140, 140);
  }
  c.globalCompositeOperation = 'source-over';
  g.c.drawImage(S.plantCv, Math.round(bx) - 70, Math.round(by) - 124);
  return true;
}

// 빛기둥 흐림 + 먼지(식물 앞에 그림)
export function loftFront(app) {
  if (!S) return;
  const { g, t } = app, k = S.k ?? 1, dt = Math.min(50, Math.max(0, t - (S.ft || t))); S.ft = t;
  // 흐림: 잡음 무늬를 위로 밀어 올리며(초당 약 9칸) 기둥 모양만큼만 옅게
  const { hz, himg, N } = S, d = himg.data, oy = Math.floor(t / (110 * slow(3))), ox = Math.floor(t / (900 * slow(3)));
  for (let y = 0; y < hz.h; y++) for (let x = 0; x < hz.w; x++) {
    const X = hz.x + x, Y = hz.y + y, i = (y * hz.w + x) * 4, ci = S.coneI(X, Y);
    if (ci <= 0.03) { d[i + 3] = 0; continue; }
    const n = N[((Y + oy) & 63) * 64 + ((X + ox) & 63)] * 0.65 + N[((Y + (oy >> 1) + 17) & 63) * 64 + ((X - ox + 9) & 63)] * 0.35;
    const a = Math.max(0, (n - 0.42) * 2.4) * ci * Math.max(0.25, 1 - (Y - 40) / 170) * k * 0.2;
    d[i] = WARM[0]; d[i + 1] = WARM[1]; d[i + 2] = WARM[2]; d[i + 3] = Math.min(255, a * 255) | 0;
  }
  S.hctx.putImageData(himg, 0, 0);
  g.c.drawImage(S.hcv, hz.x, hz.y);
  // 먼지
  for (const m of S.motes) {
    m.x += (m.vx + Math.cos(t / m.per + m.ph) * m.amp * 0.6) * dt / 1000 / slow(2);
    m.y += (m.vy + Math.sin(t / (m.per * 1.3) + m.ph) * m.amp * 0.35) * dt / 1000 / slow(2);
    if (m.y < 32 || m.y > 182 || S.coneI(m.x, m.y) < 0.05) S.spawn(m);
    let b = S.coneI(m.x, m.y) * Math.max(0.35, 1 - (m.y - 40) / 190) * k * (MOTION.calm ? 0.8 : 0.6 + 0.4 * Math.sin(t / m.tw + m.ph));
    const glint = !MOTION.calm && Math.sin(t / 1900 + m.sp * 3) > 0.985;
    if (glint) b = Math.max(b, 0.95 * k);
    if (b < 0.3) continue;
    const col = b > 0.82 ? '#fff6e2' : b > 0.55 ? '#ffe0b0' : '#e2b888';
    g.px(Math.round(m.x), Math.round(m.y), col);
    if (glint && b > 0.8) { g.px(Math.round(m.x) + 1, Math.round(m.y), '#e2b888'); g.px(Math.round(m.x) - 1, Math.round(m.y), '#e2b888'); }
  }
}

// ── 암실(2026-10-15 사용자 "가운데 식물을 누르면 주변 전등이 꺼지면서 암실이 되는 연출과 함께 위 주황전등만 남아서 집중시키고",
//  같은 날 바로잡음 "원래 사진처럼 존재하는 윗조명(원뿔 형태의 주황색)만 남겨달라는 의미야, 새로운 조명 만들지 말고") ──
//  새 빛을 그리지 않는다: 원래 그림에서 떼어 둔 전등 빛(loft_light.mjs — 단계 a = 전등 끈 방)으로
//  암실 = 전등 끈 방 × 0.14(방 모양만 희미하게) + 원래 그림의 전등 빛(원뿔 + 그 빛이 닿은 의자 둘레 바닥)만.
//  흰 벽에 번진 파르스름한 빛(네모 타일 자국)은 빼고 주황빛 칸만(원래 칸의 빨강 − 파랑, 5×5로 고름). 창은 반투명 짙은 덮개(우주가 희미하게).
const DARK = [5, 7, 15], AMB = 0.14;
// 원래 그림(o) · 전등 끈 방(off) · 전등 빛을 남길 정도(kp = 상자 가장자리 부드럽게 × 주황빛) — 암실과 처음 화면(꺼진 디스플레이 방)이 같이 씀, 한 번만 잼
function lampLayers() {
  if (S.lamp) return S.lamp;
  const bg = BGIMG.home_loft, dimIm = BGIMG.home_loft_dim, D = S.meta.dim, W = bg.width, H = bg.height;
  const read = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
  const o = read(bg), dm = dimIm ? read(dimIm) : null, off = new Uint8ClampedArray(o);
  const keep = new Float32Array(W * H);
  // 끈 방(단계 a 띠)과 빛을 남길 자리(상자 가장자리는 부드럽게)
  for (const b of D.boxes) for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const X = b.x + x, Y = b.y + y, d = (Y * W + X) * 4;
    if (dm) { const s = ((b.oy + y) * dimIm.width + x) * 4; if (dm[s + 3] > 0) { off[d] = dm[s]; off[d + 1] = dm[s + 1]; off[d + 2] = dm[s + 2]; } }
    keep[Y * W + X] = Math.max(0, Math.min(1, Math.min(x, b.w - 1 - x, y, b.h - 1 - y) / 10));
  }
  // 주황빛 정도(원래 칸 빨강 − 파랑)를 5×5로 고름 — 바닥 빛 가장자리가 점점이 자글거리지 않게
  const warm0 = new Float32Array(W * H), kp = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) warm0[i] = Math.max(0, Math.min(1, (o[i * 4] - o[i * 4 + 2] - 8) / 36));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) { s += warm0[Y * W + X]; n++; } }
    kp[y * W + x] = keep[y * W + x] * (s / n);
  }
  return (S.lamp = { o, off, kp, W, H });
}
const inGlass = (x, y) => { const wx = x - S.x0, wy = y - S.y0; return wx >= 0 && wy >= 0 && wx < S.w && wy < S.h && !!S.mask[wy * S.w + wx]; };
function darkCanvas() {
  if (S.darkCv) return S.darkCv;
  const { o, off, kp, W, H } = lampLayers();
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), im = c.createImageData(W, H), d = im.data;
  for (let i = 0; i < W * H; i++) {
    const k = i * 4, x = i % W, y = (i - x) / W;
    if (inGlass(x, y)) { d[k] = DARK[0]; d[k + 1] = DARK[1]; d[k + 2] = DARK[2]; d[k + 3] = 204; continue; }   // 창 = 반투명 짙은 덮개
    for (let ch = 0; ch < 3; ch++) d[k + ch] = Math.round(off[k + ch] * AMB + DARK[ch] * (1 - AMB) * 0.6 + Math.max(0, o[k + ch] - off[k + ch]) * kp[i]);
    d[k + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  return (S.darkCv = cv);
}
export function loftDark(app, a) {
  if (S) S.darkA = Math.max(0, Math.min(1, a));
  if (!S || a <= 0) return;
  app.g.alpha(Math.min(1, a), () => { app.g.c.imageSmoothingEnabled = false; app.g.c.drawImage(darkCanvas(), 0, 0); app.g.c.drawImage(beamCanvas(), 0, 0); });   // 암실 + 전등 → 식물 빛줄기
}

// ── 빛줄기(암실에서 전등 → 식물, 2026-10-15 사용자 "빛이 내려오는 중간도 있어야 하는데 왜 없앴어? 약간의 먼지가 있는 느낌으로 빛의 경로가 보였으면 해. 식물도 빛을 받아 강조되고") ──
//  새 모양을 짓지 않는다: 그림 속 주황 원뿔(전등 아래 폭 30칸 → 창 위 87칸)의 양쪽 가장자리를 주황 칸으로 재어 직선으로 맞추고, 그 선을 그대로 아래로 이어 의자까지.
//  가운데가 짙고 가장자리로 옅어지는 반투명 주황(8단 바둑 점 번짐), 위는 그림 속 원뿔 끝에 겹쳐 이어지고 아래는 바닥에 고인 빛으로 사라짐.
//  그 안에 옅은 안개(잡음 무늬가 천천히 피어오름)와 천천히 떠도는 먼지, 식물은 위에서 받는 따뜻한 빛(loftPlant).
const BEAM = { y0: 108, y1: 392, a: 0.32, col: [255, 190, 116] };
function beamGeo() {
  if (S.beam) return S.beam;
  const bg = BGIMG.home_loft, c = document.createElement('canvas'); c.width = bg.width; c.height = bg.height;
  const cx = c.getContext('2d'); cx.drawImage(bg, 0, 0);
  const d = cx.getImageData(0, 0, bg.width, bg.height).data, W = bg.width, rows = [];
  for (let y = 44; y <= 112; y++) { let l = -1, r = -1; for (let x = 60; x < 210; x++) { const k = (y * W + x) * 4; if (d[k] - d[k + 2] > 28) { if (l < 0) l = x; r = x; } } if (l >= 0) rows.push([y, l, r]); }
  const fit = pts => { let n = 0, a = 0, b = 0, aa = 0, ab = 0; for (const [p, q] of pts) { n++; a += p; b += q; aa += p * p; ab += p * q; } const k = (n * ab - a * b) / (n * aa - a * a); return [(b - k * a) / n, k]; };
  const L = rows.length > 4 ? fit(rows.map(r => [r[0], r[1]])) : [132, -0.346], R = rows.length > 4 ? fit(rows.map(r => [r[0], r[2]])) : [136.3, 0.358];
  const at = y => { const l = L[0] + L[1] * y, r = R[0] + R[1] * y; return [(l + r) / 2, Math.max(1, (r - l) / 2)]; };
  // 세기(0~1): 가운데 짙게 · 위는 그림 원뿔 끝(창 위 테)에서 겹쳐 시작 · 아래는 바닥 빛으로 사라짐 · 넓어질수록 조금 옅게
  const sm = (e0, e1, v) => { const k = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
  const I = (x, y) => { if (y < BEAM.y0 || y > BEAM.y1) return 0; const [c0, hw] = at(y), u = Math.abs(x + 0.5 - c0) / hw; if (u >= 1) return 0; return (1 - u) ** 1.25 * sm(BEAM.y0, BEAM.y0 + 16, y) * (1 - sm(330, BEAM.y1, y)) * (1 - 0.35 * Math.max(0, y - 118) / 274); };
  return (S.beam = { at, I });
}
function beamCanvas() {
  if (S.beamCv) return S.beamCv;
  const { I } = beamGeo(), W = 270, H = 600, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), im = c.createImageData(W, H), d = im.data, B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = BEAM.y0; y <= BEAM.y1; y++) for (let x = 0; x < W; x++) {
    const v = I(x, y) * 8; if (v <= 0) continue;
    const b = Math.floor(v), q = b + (B4[y & 3][x & 3] / 16 < v - b ? 1 : 0); if (!q) continue;
    const i = (y * W + x) * 4; d[i] = BEAM.col[0]; d[i + 1] = BEAM.col[1]; d[i + 2] = BEAM.col[2]; d[i + 3] = Math.round(q / 8 * BEAM.a * 255);
  }
  c.putImageData(im, 0, 0);
  return (S.beamCv = cv);
}
// 빛줄기 안 안개 + 먼지(암실 세기 a, 식물 앞에 그림)
function beamFront(app, a) {
  const { g, t } = app, { I } = beamGeo(), dt = Math.min(50, Math.max(0, t - (S.bft || t))); S.bft = t;
  if (!S.bhz) { const w = 270, h = BEAM.y1 - BEAM.y0 + 1, cv = document.createElement('canvas'); cv.width = w; cv.height = h; S.bhz = { cv, ctx: cv.getContext('2d'), img: cv.getContext('2d').createImageData(w, h), w, h }; }
  const Z = S.bhz, d = Z.img.data, N = S.N, oy = Math.floor(t / (140 * slow(3))), ox = Math.floor(t / (1100 * slow(3)));
  for (let y = 0; y < Z.h; y++) for (let x = 0; x < Z.w; x++) {
    const Y = BEAM.y0 + y, i = (y * Z.w + x) * 4, bi = I(x, Y);
    if (bi <= 0.04) { d[i + 3] = 0; continue; }
    const n = N[((Y + oy) & 63) * 64 + ((x + ox) & 63)] * 0.6 + N[((Y + (oy >> 1) + 23) & 63) * 64 + ((x - ox + 5) & 63)] * 0.4;
    const al = Math.max(0, (n - 0.44) * 2.2) * bi * 0.22 * a;
    d[i] = 255; d[i + 1] = 214; d[i + 2] = 160; d[i + 3] = Math.min(255, al * 255) | 0;
  }
  Z.ctx.putImageData(Z.img, 0, 0);
  g.c.drawImage(Z.cv, 0, BEAM.y0);
  if (!S.bmotes) {
    const mr = rng(97); S.bmotes = [];
    S.bspawn = m => { for (let k = 0; k < 30; k++) { const y = BEAM.y0 + 12 + mr() * (BEAM.y1 - BEAM.y0 - 60), [c0, hw] = beamGeo().at(y), x = c0 + (mr() * 2 - 1) * hw * 0.8; if (I(x, y) > 0.18) { m.x = x; m.y = y; return m; } } m.x = 134; m.y = 220; return m; };
    for (let k = 0; k < 44; k++) S.bmotes.push(S.bspawn({ vx: (mr() - 0.5) * 2, vy: (mr() - 0.45) * 2.6, per: 2600 + mr() * 4400, ph: mr() * 6.28, amp: 2 + mr() * 4, tw: 1000 + mr() * 2000, sp: mr() * 6.28 }));
  }
  for (const m of S.bmotes) {
    m.x += (m.vx + Math.cos(t / m.per + m.ph) * m.amp * 0.6) * dt / 1000 / slow(2);
    m.y += (m.vy + Math.sin(t / (m.per * 1.3) + m.ph) * m.amp * 0.35) * dt / 1000 / slow(2);
    const bi = I(m.x, m.y);
    if (bi < 0.06) { S.bspawn(m); continue; }
    let b = Math.min(1, bi * 1.6) * a * (MOTION.calm ? 0.78 : 0.55 + 0.45 * Math.sin(t / m.tw + m.ph));
    const glint = !MOTION.calm && Math.sin(t / 2100 + m.sp * 3) > 0.986;
    if (glint) b = Math.max(b, 0.9 * a);
    if (b < 0.28) continue;
    g.px(Math.round(m.x), Math.round(m.y), b > 0.8 ? '#fff6e2' : b > 0.5 ? '#ffe0b0' : '#e2b888');
  }
}

// 방 한 장면(배경 → 암실 덮개 → 식물 → 빛기둥 흐림·먼지)을 카메라 아래 그림: 방 자리 (px, py)를 화면 (sx, sy)에 z배로.
//  plant = 식물 그리기(없으면 의자 위 기본), 확대 끝값은 기기 배율 s에 맞춰 z·s 가 정수가 되게(도트 칸 크기가 고르게) — loftZoom
export function loftView(app, { dark = 0, z = 1, px = 134, py = 300, sx = px, sy = py, plant = null } = {}) {
  const c = app.g.c;
  if (z !== 1 || dark > 0) app.g.rect(0, 0, app.W, app.H, '#05070f');   // 다가간 카메라가 방 그림 밖(아래)을 비출 때 앞 장이 남아 보이지 않게
  c.save();
  if (z !== 1 || sx !== px || sy !== py) { c.translate(sx, sy); c.scale(z, z); c.translate(-px, -py); }
  loftBack(app);
  loftDark(app, dark);
  if (plant) plant();
  loftFront(app);
  if (dark > 0 && S) beamFront(app, Math.min(1, dark));   // 빛줄기 안 안개·먼지(식물 앞)
  c.restore();
}
export const loftZoom = (app, want) => { const s = app.pxScale || (app.screen && app.screen.s) || 1; return s < 2 ? want : Math.max(1, Math.round(s * want) / s); };   // pxScale = 촬영 배율

// 의자 위 식물(12° 화분 판)의 칠해진 범위 가운데 높이(방 좌표) — 홈 옆 창 줄을 여기에 맞추고, 식물 관리 카메라도 여기를 기준으로 다가감
export function loftPlantCy(key) {
  const my = LOFT_STOOL[1], P = key && BIG[key], box = key && bigBox(key);
  if (!P || !box) return my - 22;   // 빈 화분: 화분 몸 가운데쯤
  return (Math.round(my - 2 - P.meta.base[1]) + box[0] + my) / 2;
}

// ── 꺼진 디스플레이 방(처음 화면, 2026-10-16 사용자 "검은 배경에 의자에 내 식물이 올려져 있고. 천장에서 불빛이 지지직 거리면서 켜져.
//  그리고 터치하면 주변 검은 배경이 밝아지는 느낌으로 대기화면으로 이어지게" · "대기실의 공간은 전부 디스플레이였다는 설정") ──
//  방 = 전부 디스플레이 → 꺼져 있으면 검정. 보이는 건 전등 빛(원래 그림에서 떼어 둔 원뿔 · 바닥에 고인 빛 — 암실과 같은 셈, 새 빛을 짓지 않음) + 그 빛을 받은 의자.
//  전등이 켜지면(k) 꺼진 화면 유리에 방 모양이 아주 희미하게 비침(× NAMB). 창(유리 디스플레이)도 꺼져 검정.
const NDARK = [3, 4, 10], NAMB = 0.05, STOOL_LIT = 0.85;
const legOn = (X, Y, x0, y0, x1, y1, hw) => Y >= y0 && Y <= y1 && Math.abs(X - (x0 + ((x1 - x0) * (Y - y0)) / (y1 - y0))) <= hw;
// 의자: 앉는 판 윗면 타원 + 두께 띠 + 다리 셋(tools/pixel/big/loft_light.mjs 와 같은 잰 값)
const inStool = (x, y) => { const X = x + 0.5, Y = y + 0.5; return ((X - 134.5) / 32.5) ** 2 + ((Y - 355.5) / 6.5) ** 2 <= 1 || ((X - 134.5) / 32) ** 2 + ((Y - 361.5) / 7.5) ** 2 <= 1 || legOn(X, Y, 116.5, 362, 108, 406, 4.6) || legOn(X, Y, 136, 362, 136, 395, 4.2) || legOn(X, Y, 154.5, 362, 161, 406, 4.6); };
function nightLayers() {
  if (S.night) return S.night;
  const { o, off, kp, W, H } = lampLayers();
  const mk = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); return { cv, c, im: c.createImageData(W, H) }; };
  const A = mk(), B = mk(), Cs = mk(), u32 = new Uint32Array(W * H), a = A.im.data, b = B.im.data, s = Cs.im.data;
  for (let i = 0; i < W * H; i++) {
    const k = i * 4, x = i % W, y = (i - x) / W, glass = inGlass(x, y), lum = (o[k] * 0.3 + o[k + 1] * 0.59 + o[k + 2] * 0.11) / 255;
    const st = !glass && inStool(x, y) && lum < 0.72, v = [0, 0, 0];
    for (let ch = 0; ch < 3; ch++) {
      const base = glass ? NDARK[ch] : NDARK[ch] + off[k + ch] * NAMB, li = glass ? 0 : st ? o[k + ch] * STOOL_LIT : Math.max(0, o[k + ch] - off[k + ch]) * kp[i];
      a[k + ch] = Math.round(base); b[k + ch] = Math.round(li); v[ch] = Math.min(255, a[k + ch] + b[k + ch]);
    }
    a[k + 3] = 255; b[k + 3] = b[k] || b[k + 1] || b[k + 2] ? 255 : 0;
    u32[i] = (0xff000000 | (v[2] << 16) | (v[1] << 8) | v[0]) >>> 0;
    if (st) { s[k] = Math.round(o[k] * 0.2 + 12); s[k + 1] = Math.round(o[k + 1] * 0.22 + 20); s[k + 2] = Math.round(o[k + 2] * 0.28 + 40); s[k + 3] = 255; }   // 불 꺼진 의자: 의자 속 투영기의 푸른 빛만 받은 듯 희미하게
  }
  A.c.putImageData(A.im, 0, 0); B.c.putImageData(B.im, 0, 0); Cs.c.putImageData(Cs.im, 0, 0);
  return (S.night = { off: A.cv, light: B.cv, stool: Cs.cv, u32 });
}
// 미리 재기(전등 빛 층 · 꺼진 방 · 켜짐 순서 · 빛줄기 · 창 밖 우주 — 느린 휴대폰에선 합쳐 0.2초 넘게 걸림): 처음 화면이 아직 검을 때
//  한 장에 한 가지씩 불러 두면 점화 · 켜짐 순간에 멈칫하지 않음. 다 끝나면 true
export function loftPrepare(app, step) {
  if (!ensure()) return step >= 8;
  if (step === 0) lampLayers(); else if (step === 1) nightLayers(); else if (step === 2) bootTau(); else if (step === 3) { beamCanvas(); bootFill(0, 1000); }
  else if (step === 4) { app.g.c.save(); loftBack(app); loftFront(app); app.g.c.restore(); }   // 창 밖 우주 · 흐림 무늬(뒤에서 검정으로 덮음)
  return step >= 4;
}
// 꺼진 방 + 전등 세기 k: 검정 → 꺼진 화면에 비친 방(k) → 전등 빛 더하기(k)
export function loftNight(app, k) {
  const { g } = app;
  g.rect(0, 0, app.W, app.H, '#030409');
  if (!ensure() || k <= 0) return;
  const N = nightLayers(), c = g.c, kk = Math.min(1, k);
  c.imageSmoothingEnabled = false;
  g.alpha(kk, () => c.drawImage(N.off, 0, 0));
  const op = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  g.alpha(kk, () => c.drawImage(N.light, 0, 0));
  if (k > 1) g.alpha(Math.min(1, (k - 1) * 0.8), () => c.drawImage(N.light, 0, 0));   // 'o'(잠깐 더 밝게)
  c.globalCompositeOperation = op;
}
// 전등 → 의자 빛줄기(암실과 같은 그림) · 그 안 안개와 먼지
export function loftNightBeam(app, a) { if (ensure() && a > 0) app.g.alpha(Math.min(1, a), () => { app.g.c.imageSmoothingEnabled = false; app.g.c.drawImage(beamCanvas(), 0, 0); }); }
export function loftNightFront(app, a) { if (ensure() && a > 0) beamFront(app, Math.min(1, a)); }
// 불 꺼진 의자(투영기의 푸른 빛만)
export function loftNightStool(app, a) { if (ensure() && a > 0) app.g.alpha(Math.min(1, a), () => app.g.c.drawImage(nightLayers().stool, 0, 0)); }
// 처음 화면의 식물: dark = 짙게 덮음 · cool = 투영기의 푸른 기운 · warm = 위 전등에서 받는 따뜻한 빛(암실과 같은 셈)
export function loftNightPlant(app, key, pot, bx, by, { dark = 0, warm = 0, cool = 0 } = {}) {
  const { g, t } = app;
  if (!ensure()) return drawBig(g, key, pot, bx, by, { t, flat: true });
  if (!S.nplantCv) { S.nplantCv = document.createElement('canvas'); S.nplantCv.width = 140; S.nplantCv.height = 140; }
  const c = S.nplantCv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 140, 140);
  drawBig({ c }, key, pot, 70, 124, { t, flat: true });
  c.globalCompositeOperation = 'source-atop';
  if (dark > 0) { c.fillStyle = `rgba(4,6,14,${Math.min(1, dark).toFixed(3)})`; c.fillRect(0, 0, 140, 140); }
  if (cool > 0) { c.fillStyle = `rgba(90,150,230,${(0.2 * cool).toFixed(3)})`; c.fillRect(0, 0, 140, 140); }
  if (warm > 0) {
    const gr = c.createLinearGradient(0, 24, 0, 124), w = Math.min(1.2, warm);
    gr.addColorStop(0, `rgba(255,214,150,${(0.34 * w).toFixed(3)})`); gr.addColorStop(0.55, `rgba(255,196,120,${(0.16 * w).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,196,120,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 140, 140);
  }
  c.globalCompositeOperation = 'source-over';
  g.c.drawImage(S.nplantCv, Math.round(bx) - 70, Math.round(by) - 124);
}

// ── 디스플레이 켜짐(같은 날 "디스플레이 화면이 켜지는 듯한 요소 — LED 하나하나 켜지는 그런거. 그걸 대기실의 공간감(원형 벽과 바닥 등)을 분리해서 자연스레") ──
//  방을 덩어리로 나눠 저마다 생김새를 따라 LED(2×2칸)가 하나씩 켜짐:
//   바닥 = 의자에서 타원 고리로 퍼짐(바닥 타일 고리 그대로) → 벽 = 바닥 물결이 벽 밑에 닿는 대로 둘레를 따라 양옆으로 번지며 위로 타고 오름 →
//   천장 = 벽 윗단에서 전등 쪽으로 모임 → 창 테 = 아래에서 위로 고리를 따라 → 창(유리 디스플레이) = 가운데 가로 줄에서 위아래로 펼쳐짐(옛 화면 켜지듯).
//  LED 는 켜지기 직전 푸른 불씨 → 하얗게 번쩍(점 무늬 — 칸마다 한 점이 더 밝음) → 원래 색. 의자는 디스플레이가 아님(전등 빛을 받은 그대로).
//  경계 = 그림을 격자 확대로 잰 곡선(천장 ↔ 벽 y = 87 − 0.00137(x−135)², 벽 ↔ 바닥 y = 338 + 0.000494(x−135)², 창 가운데 (134, 208) 테 반지름 101).
const yCW = x => 87 - 0.00137 * (x - 135) ** 2, yWF = x => 338 + 0.000494 * (x - 135) ** 2;
const floorT = (x, y) => 0.5 * Math.min(1, Math.hypot((x - 134) / 1.9, y - 380) / 230);
const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function bootTau() {
  if (S.tau) return S.tau;
  const { W, H } = lampLayers(), tau = new Float32Array(W * H);
  for (let cy = 0; cy < H; cy += 2) for (let cx = 0; cx < W; cx += 2) {
    const x = cx + 1, y = cy + 1;
    let t;
    if (Math.hypot(x - 134, y - 208) <= 101) t = 0.48 + 0.24 * (Math.abs(Math.atan2(x - 134, y - 208)) / Math.PI);   // 창 테(유리는 아래에서 다시)
    else if (Math.abs(x - 135) <= 24 && y < 40) t = 0.84;                                                          // 전등 갓
    else if (inStool(x, y)) t = -1;                                                                                // 의자
    else if (y < yCW(x)) t = 0.42 + 0.42 * (1 - Math.min(1, Math.hypot((x - 135) / 1.6, y - 20) / 140));         // 천장
    else if (y > yWF(x)) t = floorT(x, y);                                                                         // 바닥
    else { const yb = yWF(x), yt = yCW(x); t = floorT(x, yb) + (0.32 * (yb - y)) / (yb - yt); }                    // 벽
    if (t >= 0) t += (hsh(cx, cy) - 0.5) * 0.05;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (cy + j < H && cx + i < W) tau[(cy + j) * W + cx + i] = t;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inGlass(x, y)) tau[y * W + x] = 0.62 + 0.3 * Math.min(1, Math.abs(y + 0.5 - 208) / 88) + (hsh(y, 7) - 0.5) * 0.008;
  return (S.tau = tau);
}
const PRE = 90, FL = 170, LEDC = [120, 190, 255], FLASH = [226, 244, 255];
// u = 0..1 진행, D = 전체 길이(ms): 방 그림(loftBack) 위에 — 아직 안 켜진 칸 = 꺼진 방(전등 빛만), 켜지는 칸 = 불씨 → 번쩍, 켜진 칸 = 비움
export function loftBoot(app, u, D) {
  if (!ensure()) return;
  bootFill(u, D);
  app.g.c.imageSmoothingEnabled = false; app.g.c.drawImage(S.bootCv, 0, 0);
}
function bootFill(u, D) {
  const N = nightLayers(), tau = bootTau(), { W, H } = lampLayers();
  if (!S.bootCv) { S.bootCv = document.createElement('canvas'); S.bootCv.width = W; S.bootCv.height = H; S.bootCx = S.bootCv.getContext('2d'); S.bootIm = S.bootCx.createImageData(W, H); S.bootU = new Uint32Array(S.bootIm.data.buffer); }
  const out = S.bootU, night = N.u32, el = u * D;
  for (let i = 0; i < W * H; i++) {
    const tt = tau[i];
    if (tt < 0) { out[i] = 0; continue; }
    const d = el - tt * D;
    if (d < -PRE) out[i] = night[i];
    else if (d < 0) { const f = 0.34 * (1 + d / PRE), c = night[i], r = c & 255, gg = (c >> 8) & 255, b = (c >> 16) & 255; out[i] = (0xff000000 | (Math.round(b + (LEDC[2] - b) * f) << 16) | (Math.round(gg + (LEDC[1] - gg) * f) << 8) | Math.round(r + (LEDC[0] - r) * f)) >>> 0; }
    else if (d < FL) { const x = i % W, y = (i - x) / W, a = (1 - d / FL) ** 1.6 * ((x & 1) || (y & 1) ? 0.55 : 1); out[i] = ((Math.round(a * 255) << 24) | (FLASH[2] << 16) | (FLASH[1] << 8) | FLASH[0]) >>> 0; }
    else out[i] = 0;
  }
  S.bootCx.putImageData(S.bootIm, 0, 0);
}
