// 원형 방(코덱스 홈)을 살아 있게 — 2026-10-15 사용자 "바깥 풍경 … 고정이 아니라 바뀌고, 애니 효과도 … 전등 효과도 고정이 아닌
//  깜빡거리거나 먼지같은 흐림 등 효과도 알아보고 잘 넣어줘".
//  전등: 퀘이크 빛 글자 방식(글자 a = 꺼짐 … m = 평소, 한 글자 = 80ms — Valve 개발 위키 Lightstyle·Alan Zucconi 글) — 평소엔 m,
//    7~15초마다 짧은 깜빡임 묶음 하나. 단계 그림은 tools/pixel/big/loft_light.mjs 가 배경에서 빛 층을 떼어 구움(원뿔·바닥 고인 빛).
//  먼지: 빛기둥 안에서만 보이는 작은 점 — 기둥 가운데일수록·전등이 밝을수록 밝고, 저마다 다른 박자로 떠다니다 가끔 빛을 받아 반짝.
//  흐림: 빛기둥 안 아주 옅은 따뜻한 안개가 천천히 피어오름(감기는 잡음 무늬를 위로 밀어 올림).
//  창: sky.js 우주 — 들어올 때마다 다음 풍경, 오래 머물면 디더로 다음 풍경. 유리 위로 이어지는 원뿔 빛 띠 + 옅은 반사.
import { BGIMG, BGMETA, drawBig } from './sprites.js';
import { makeSky, renderSky, blendSky, SKY_KINDS, rng } from './sky.js';

export const LOFT_STOOL = [134, 356];   // 의자 앉는 판 윗면 가운데(격자 확대로 잼) = 화분 굽이 닿는 점
const LV = { a: 0, e: 1, h: 2, k: 3, o: 4 };   // 단계 그림 번호(m = 원본, 덧그림 없음)
const K = { a: 0, e: 0.33, h: 0.58, k: 0.83, m: 1, o: 1.17 };
const BURSTS = ['mkmamhm', 'mmhammaemm', 'makmmahmm', 'mmeaaaeekmm', 'mhmkm', 'mmamammmmammamamaaamamm'];   // 마지막 = 퀘이크 '형광등 깜빡임' 줄인 것
const WARM = [255, 214, 160];
let S = null, visits = 0;

export function enterLoft() { visits++; if (S) S.fresh = true; }
// 검토·영상용 손잡이(콘솔·tools/shots/scenevideo.mjs --act): 깜빡임 묶음 바로 · 별똥별 바로 · 먼 배 바로 · 풍경 번호
globalThis.__loft = {
  burst(p = 'mmhammaemm') { if (S) { S.flick.pat = p; S.flick.start = globalThis.__app ? globalThis.__app.t : 0; } },
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

// 지금 전등 글자(t ms)
function lampLetter(t) {
  const f = S.flick;
  if (!f.next) f.next = t + 5000 + S.r() * 5000;
  if (!f.pat && t >= f.next) { f.pat = BURSTS[Math.floor(S.r() * (S.r() < 0.12 ? BURSTS.length : BURSTS.length - 1))]; f.start = t; }
  if (f.pat) {
    const i = Math.floor((t - f.start) / 80);
    if (i < f.pat.length) return f.pat[i];
    f.pat = null; f.next = t + 7000 + S.r() * 8000;
  }
  return 'm';
}

// 배경 + 전등 단계 + 창 밖 우주 + 유리 위 빛 띠. 반환 = 지금 전등 밝기 k
export function loftBack(app) {
  const { g, t } = app;
  const bg = BGIMG.home_loft; if (!bg) return 1;
  if (!S) { S = setup(); if (!S) { g.img(bg, 0, 0); return 1; } S.r = rng(1234); }
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
  if (!S || k === 1) return drawBig(g, key, pot, bx, by, { t });
  if (!S.plantCv) { S.plantCv = document.createElement('canvas'); S.plantCv.width = 140; S.plantCv.height = 140; }
  const c = S.plantCv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 140, 140);
  drawBig({ c }, key, pot, 70, 124, { t });
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = k < 1 ? `rgba(10,14,30,${((1 - k) * 0.42).toFixed(3)})` : `rgba(255,200,130,${((k - 1) * 0.6).toFixed(3)})`;
  c.fillRect(0, 0, 140, 140);
  c.globalCompositeOperation = 'source-over';
  g.c.drawImage(S.plantCv, Math.round(bx) - 70, Math.round(by) - 124);
  return true;
}

// 빛기둥 흐림 + 먼지(식물 앞에 그림)
export function loftFront(app) {
  if (!S) return;
  const { g, t } = app, k = S.k ?? 1, dt = Math.min(50, Math.max(0, t - (S.ft || t))); S.ft = t;
  // 흐림: 잡음 무늬를 위로 밀어 올리며(초당 약 9칸) 기둥 모양만큼만 옅게
  const { hz, himg, N } = S, d = himg.data, oy = Math.floor(t / 110), ox = Math.floor(t / 900);
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
    m.x += (m.vx + Math.cos(t / m.per + m.ph) * m.amp * 0.6) * dt / 1000;
    m.y += (m.vy + Math.sin(t / (m.per * 1.3) + m.ph) * m.amp * 0.35) * dt / 1000;
    if (m.y < 32 || m.y > 182 || S.coneI(m.x, m.y) < 0.05) S.spawn(m);
    let b = S.coneI(m.x, m.y) * Math.max(0.35, 1 - (m.y - 40) / 190) * k * (0.6 + 0.4 * Math.sin(t / m.tw + m.ph));
    const glint = Math.sin(t / 1900 + m.sp * 3) > 0.985;
    if (glint) b = Math.max(b, 0.95 * k);
    if (b < 0.3) continue;
    const col = b > 0.82 ? '#fff6e2' : b > 0.55 ? '#ffe0b0' : '#e2b888';
    g.px(Math.round(m.x), Math.round(m.y), col);
    if (glint && b > 0.8) { g.px(Math.round(m.x) + 1, Math.round(m.y), '#e2b888'); g.px(Math.round(m.x) - 1, Math.round(m.y), '#e2b888'); }
  }
}
