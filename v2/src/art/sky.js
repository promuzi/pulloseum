// 둥근 통창 밖 우주 — 게임이 매 장면 직접 그린다(2026-10-15 사용자 "바깥 풍경이 우주가 아닌 그냥 다른 행성 같은데 … 고정이 아니라 바뀌고, 애니 효과도").
//  ① 별 세 겹: 먼 겹일수록 느리게, 한 칸씩만 움직임(반 칸 이동 없음 — Slynyrd Pixelblog 23 시차 스크롤), 별마다 엇갈린 주기로 반짝, 밝은 별은 가끔 십자 빛.
//  ② 행성: 칸 좌표를 구면으로 펴고(spherify) 겹친 값 잡음(fbm)을 시간에 따라 흘려 자전, 빛 원점까지 거리로 색 띠(낮 → 밤),
//     띠 경계는 체크 디더 — Deep-Fold PixelPlanets 방식(MIT, https://github.com/Deep-Fold/PixelPlanets)을 따라 새로 씀.
//     잡음은 풍경을 만들 때 한 바퀴치 표로 한 번 굽고, 매 장면은 표를 밀어 읽기만(가벼움).
//  ③ 가끔 별똥별 · 먼 배 불빛. 홈에 들어올 때마다 다음 풍경, 오래 머물면 디더로 스르륵 다음 풍경.
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const th = (x, y) => (B4[y & 3][x & 3] + 0.5) / 16;
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const C = s => { const n = parseInt(s.slice(1, 7), 16); return (0xff000000 | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };   // '#rrggbb' → 칸 값(ABGR)
const ramp = a => a.map(C);
function hash2(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const md = (v, p) => ((v % p) + p) % p;
function vnoise(x, y, px, py, s) {   // 가로 px · 세로 py 주기로 감기는 값 잡음
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const x0 = md(xi, px), x1 = md(xi + 1, px), y0 = md(yi, py), y1 = md(yi + 1, py);
  const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
  return a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy;
}
function fbm(x, y, px, py, s, oct = 4) { let v = 0, amp = 0.5, f = 1, tot = 0; for (let o = 0; o < oct; o++) { v += vnoise(x * f, y * f, px * f, py * f, s + o * 31) * amp; tot += amp; f *= 2; amp *= 0.5; } return v / tot; }
// 잡음 값 고르기: 어떤 값이 잡음 분포의 몇 % 지점인지 → 문턱(바다·땅 비율)을 그림마다 같게
function quantile(arr, q) { const s = Float32Array.from(arr).sort(); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }

// ── 행성 ──
// kind: ocean(바다·대륙·구름) · gas(띠 + 폭풍 + 고리) · rock(붉은 사막·운석 구덩이) · ice(얼음 금) · moon(회색 작은 달)
const PAL = {
  ocean: { deep: ramp(['#08122c', '#122a5c', '#1c4a8e', '#2e6cb8']), land: ramp(['#0e1c18', '#24482c', '#3c7038', '#64a04a']), high: ramp(['#1c1a14', '#4a4430', '#7a7048', '#b0a870']),
    cloud: ramp(['#1a2440', '#5a6a8c', '#a8b8d4', '#eef4fb']), rim: C('#7ab8ff'), city: C('#ffd27a') },
  gas: { band: [ramp(['#2a1a14', '#6a3e28', '#a8683c', '#dca066']), ramp(['#2e2418', '#74583a', '#b89466', '#ecd2a2']), ramp(['#22140e', '#5a2e1e', '#8e4a2c', '#c87a4a'])],
    spot: ramp(['#3a1810', '#8a3a24', '#c8603a', '#f09a6a']), ring: ramp(['#2a2430', '#6a6070', '#a89aa8', '#e0d6dc']), rim: C('#f0c890') },
  rock: { low: ramp(['#1a0c0c', '#4a1e18', '#8a3a28', '#c46a44']), mid: ramp(['#22100c', '#5e2a1e', '#a24e32', '#dc8a5a']), crater: ramp(['#120808', '#341410', '#6a2a1e', '#9a4a32']), rim: C('#ffb08a') },
  ice: { low: ramp(['#0c1428', '#2a4470', '#5a86b8', '#9ccaec']), high: ramp(['#141e34', '#4a6890', '#a4c4e4', '#f2faff']), crack: ramp(['#0a1020', '#1e3458', '#3a5e8e', '#6a98c8']), rim: C('#c8ecff') },
  moon: { low: ramp(['#14161c', '#3a3e4a', '#6a6e7c', '#a4a8b4']), crater: ramp(['#0e1014', '#2a2c36', '#4a4e5a', '#7a7e8a']), rim: C('#d8dce8') },
};
function makePlanet(o, seed) {
  const R = o.r, D = R * 2, TW = D * 2, TH = D, size = o.size || 4, P = PAL[o.kind];
  // 잡음 표 한 바퀴(가로로 감김): 땅·띠
  const tex = new Float32Array(TW * TH), cl = o.kind === 'ocean' ? new Float32Array(TW * TH) : null;
  for (let v = 0; v < TH; v++) for (let u = 0; u < TW; u++) {
    const X = u / D * size, Y = v / D * size;
    if (o.kind === 'gas') tex[v * TW + u] = fbm(X * 0.375, Y * 2.2, size * 0.75, 99, seed, 4) * 0.75 + Math.sin(Y * 5.1 + fbm(X, Y, size * 2, 99, seed + 5, 2) * 3) * 0.125 + 0.125;
    else tex[v * TW + u] = fbm(X, Y, size * 2, 99, seed, 5);
    if (cl) cl[v * TW + u] = fbm(X * 1.25, Y * 2.6, size * 2.5, 99, seed + 77, 4);
  }
  // 운석 구덩이(rock·moon): 표 위 원 몇 개 — 가운데 낮고 테두리 살짝 높게
  const crater = new Uint8Array(TW * TH);
  if (o.kind === 'rock' || o.kind === 'moon') {
    const r = rng(seed * 7 + 3);
    for (let n = 0; n < (o.kind === 'moon' ? 9 : 14); n++) {
      const cu = r() * TW, cv = TH * (0.15 + r() * 0.7), cr = 1.5 + r() * D * 0.09;
      for (let v = Math.floor(cv - cr - 1); v <= cv + cr + 1; v++) for (let du = -cr - 1; du <= cr + 1; du++) {
        const u = md(Math.round(cu + du), TW); if (v < 0 || v >= TH) continue;
        const d = Math.hypot(du, v - cv) / cr; if (d <= 0.82) crater[v * TW + u] = 1; else if (d <= 1.05 && !crater[v * TW + u]) crater[v * TW + u] = 2;
      }
    }
  }
  const lo = quantile(tex, o.kind === 'ocean' ? 0.56 : 0.5), hi = quantile(tex, o.kind === 'ocean' ? 0.86 : 0.78), cq = cl ? quantile(cl, 0.7) : 0;
  // 칸마다 고정 값(구면 좌표·빛 거리·가장자리) — 행성 모양은 안 바뀌니 한 번만
  const px = [];
  for (let y = 0; y < D; y++) for (let x = 0; x < D; x++) {
    const ux = (x + 0.5) / D, uy = (y + 0.5) / D, cx = ux * 2 - 1, cy = uy * 2 - 1, rr = cx * cx + cy * cy;
    if (rr > 1) continue;
    const z = Math.sqrt(1 - rr), sx = cx / (z + 1) * 0.5 + 0.5, sy = cy / (z + 1) * 0.5 + 0.5;
    px.push({ x, y, su: Math.floor(sx * D), sv: Math.min(TH - 1, Math.floor(sy * TH)), dl: Math.hypot(ux - o.light[0], uy - o.light[1]), rr });
  }
  return { ...o, D, TW, TH, tex, cl, crater, lo, hi, cq, px, P, buf: new Uint32Array(D * D), lastStep: -1 };
}
// 빛 거리 → 단계(3 낮 … 0 밤), 경계 ±0.02 는 체크 디더
const LB = [0.36, 0.5, 0.62];
function lightIdx(d, x, y) {
  let i = 3; for (const b of LB) { if (d > b) i--; }
  for (const b of LB) if (Math.abs(d - b) < 0.022 && (x + y) & 1) return d > b ? Math.min(3, i + 1) : Math.max(0, i - 1);
  return i;
}
function renderPlanet(pl, t) {
  const step = Math.floor(t / pl.msPerPx), cstep = Math.floor(t / (pl.msPerPx * 0.6));
  if (step === pl.lastStep && cstep === pl.lastC) return;
  pl.lastStep = step; pl.lastC = cstep;
  const { tex, cl, crater, TW, P, buf, lo, hi, cq } = pl;
  buf.fill(0);
  for (const p of pl.px) {
    const u = md(p.su + step, TW), i = p.sv * TW + u, T = tex[i];
    const li = lightIdx(p.dl + (T - 0.5) * 0.08, p.x, p.y);
    let c;
    if (pl.kind === 'ocean') {
      c = T < lo ? P.deep[li] : T < hi ? P.land[li] : P.high[li];
      if (li === 0 && T >= lo && T < hi && hash2(u, p.sv, 9) > 0.93) c = P.city;   // 밤 쪽 땅의 불빛
      const cv = cl[p.sv * TW + md(p.su + cstep, TW)];
      if (cv > cq) c = P.cloud[Math.max(0, li - (cv < cq + 0.03 && (p.x + p.y) & 1 ? 1 : 0))];
    } else if (pl.kind === 'gas') {
      const bi = T < 0.42 ? 0 : T < 0.56 ? 1 : 2;
      c = P.band[bi][li];
      const sd = Math.hypot((md(p.su + step, TW) - pl.spot[0]) / 7, (p.sv - pl.spot[1]) / 3.6);
      if (sd < 1) c = P.spot[Math.max(0, li - (sd > 0.7 ? 1 : 0))];
    } else if (pl.kind === 'ice') {
      const ridge = Math.abs(T - 0.5);
      c = ridge < 0.022 ? P.crack[li] : T > 0.55 ? P.high[li] : P.low[li];
    } else {   // rock · moon
      const cr = crater[i];
      c = cr === 1 ? P.crater[li] : cr === 2 ? (P.mid || P.low)[Math.min(3, li + 1)] : T > hi ? (P.mid || P.low)[li] : P.low[li];
    }
    if (p.rr > 0.84 && li >= 2 && P.rim) c = (p.x + p.y) & 1 || p.rr > 0.93 ? P.rim : c;   // 빛 쪽 가장자리 대기
    buf[p.y * pl.D + p.x] = c;
  }
}
// 고리(가스 행성): 기운 타원 띠 — 위쪽 반 = 행성 뒤, 아래쪽 반 = 앞. 행성 그림자(빛 반대쪽 뒤) 어둡게
function makeRing(pl) {
  const back = [], front = [], a = pl.r * 1.9, b = pl.r * 0.42, ca = Math.cos(pl.ringTilt), sa = Math.sin(pl.ringTilt), R = pl.r;
  for (let y = -Math.ceil(a); y <= a; y++) for (let x = -Math.ceil(a); x <= a; x++) {
    const X = (x + 0.5) * ca + (y + 0.5) * sa, Y = -(x + 0.5) * sa + (y + 0.5) * ca, q = Math.hypot(X / a, Y / b);
    if (q < 0.6 || q > 1) continue;
    if (q > 0.76 && q < 0.8) continue;   // 고리 틈
    const band = q < 0.68 ? 1 : q < 0.76 ? 3 : q < 0.9 ? 2 : 1;
    const inDisk = (x + 0.5) ** 2 + (y + 0.5) ** 2 < R * R;
    const shade = Y < 0 && Math.abs(X) < R * 0.9 && X * (pl.light[0] - 0.5) < 0 ? 2 : 0;   // 행성 뒤 그림자
    const c = PAL.gas.ring[Math.max(0, band - shade)];
    (Y < 0 ? back : front).push([x, y, c, inDisk]);
  }
  return { back, front };
}

// ── 풍경 ──
const KINDS = ['ocean', 'giant', 'nebula', 'desert', 'ice'];
export const SKY_KINDS = KINDS;
const BG = {
  ocean: { sky: ['#03060f', '#060b1c', '#0a1226'], neb: null },
  giant: { sky: ['#05060f', '#0a0b1c', '#120f24'], neb: ['#1a1230', '#24163a'] },
  nebula: { sky: ['#04040e', '#08081c', '#0e0c26'], neb: ['#1a1440', '#2e1a5a', '#4a2270', '#6a3a8a', '#1a4a6a', '#3a7a8a'] },
  desert: { sky: ['#06040a', '#0e0814', '#160c1a'], neb: ['#2a1020', '#3a1428'] },
  ice: { sky: ['#03070f', '#06101e', '#0a182c'], neb: ['#0e2238', '#14304a'] },
};
const NEB = [ramp(['#150e2e', '#261650', '#3e2470']), ramp(['#0d1a30', '#13304c', '#1d4c66'])];   // 성운 두 갈래(보라 · 청록), 어두움 → 밝음
const STAR = { far: ramp(['#1e2a4c', '#2c3a64', '#3c4c7c']), mid: ramp(['#4a5a8a', '#7a8ab8', '#b4c2e2']), near: ramp(['#8a9ac4', '#d8e2f6', '#ffffff']), warm: ramp(['#8a7a6a', '#e8d4b0', '#fff4dc']) };

export function makeSky(kind, seed, w, h) {
  const r = rng(seed), BW = w + 96, cfg = BG[kind] || BG.ocean;
  // 바탕: 위 → 아래 은은한 남색 디더 + (풍경마다) 성운 — 가로로 감기는 잡음이라 흘러도 이음새 없음
  const bg = new Uint32Array(BW * h), sk = ramp(cfg.sky), neb = cfg.neb ? ramp(cfg.neb) : null;
  const n1 = Math.round(BW / 34), n2 = Math.round(BW / 18);   // 가로 주기 = 정수 격자 칸(이음새 없이 감김)
  for (let y = 0; y < h; y++) for (let x = 0; x < BW; x++) {
    const v = y / h * 2.2, i = Math.floor(v), f = v - i;
    let c = sk[Math.min(2, f > th(x, y) ? i + 1 : i)];
    if (neb) {
      const n = fbm(x / BW * n1, y / 30, n1, 99, seed + 11, 5), m = fbm(x / BW * n2 + 3, y / 16, n2, 99, seed + 23, 3);
      if (kind === 'nebula') {   // 짙기 단계(어두움 → 밝음)를 디더로 잇고, 보라·청록 두 갈래는 다른 잡음으로 — 얼룩무늬처럼 평평한 덩어리가 안 되게
        const v = (n - 0.46) * 4.6 + (m - 0.5) * 0.5;
        if (v > 0) { const fam = m < 0.52 ? NEB[0] : NEB[1], lv = v * 3, li = Math.min(2, Math.floor(lv) + (lv - Math.floor(lv) > th(x, y) ? 1 : 0) - 1); if (li >= 0) c = fam[li]; }
      } else { const k = (n - 0.55) * 4; if (k > th(x, y)) c = neb[Math.min(neb.length - 1, Math.floor(m * neb.length))]; }
    }
    bg[y * BW + x] = c;
  }
  const stars = [];
  const add = (n, layer, msPerPx) => { for (let k = 0; k < n; k++) stars.push({ x: Math.floor(r() * BW), y: Math.floor(r() * h), layer, ms: msPerPx, per: 1200 + r() * 3200, ph: r() * 6.28, warm: r() < 0.18, big: layer === 'near' && r() < 0.5 }); };
  add(kind === 'nebula' ? 70 : 110, 'far', 6000); add(48, 'mid', 3000); add(13, 'near', 1500);
  const S = { kind, seed, w, h, BW, bg, bgMs: 11000, stars, planets: [], rocks: [], evt: null, nextEvt: 6000 + r() * 6000, ship: null, nextShip: 14000 + r() * 16000, r,
    img: null, cv: null, buf: null };
  const P = (o, s) => { const p = makePlanet(o, s); S.planets.push(p); return p; };
  if (kind === 'ocean') {
    P({ kind: 'ocean', r: 74, cx: w * 0.66, cy: h * 0.86, light: [0.3, 0.26], size: 4, msPerPx: 420 }, seed + 1);
    P({ kind: 'moon', r: 9, cx: w * 0.24, cy: h * 0.27, light: [0.3, 0.3], size: 3, msPerPx: 900 }, seed + 2);
  } else if (kind === 'giant') {
    const g = P({ kind: 'gas', r: 40, cx: w * 0.56, cy: h * 0.5, light: [0.28, 0.32], size: 4, msPerPx: 260 }, seed + 3);
    g.spot = [g.TW * 0.3, g.TH * 0.62]; g.ringTilt = -0.32; g.ring = makeRing(g);
    P({ kind: 'moon', r: 6, cx: w * 0.18, cy: h * 0.7, light: [0.25, 0.3], size: 3, msPerPx: 900 }, seed + 4);
  } else if (kind === 'desert') {
    P({ kind: 'rock', r: 46, cx: w * 0.38, cy: h * 0.6, light: [0.72, 0.3], size: 4, msPerPx: 520 }, seed + 5);
    P({ kind: 'moon', r: 8, cx: w * 0.78, cy: h * 0.26, light: [0.7, 0.3], size: 3, msPerPx: 900 }, seed + 6);
    P({ kind: 'moon', r: 4, cx: w * 0.84, cy: h * 0.42, light: [0.7, 0.3], size: 2, msPerPx: 900 }, seed + 7);
  } else if (kind === 'ice') {
    P({ kind: 'ice', r: 30, cx: w * 0.3, cy: h * 0.34, light: [0.34, 0.3], size: 4, msPerPx: 600 }, seed + 8);
    for (let k = 0; k < 16; k++) {   // 소행성: 잡음으로 깎은 작은 돌(왼쪽 위 빛 3단), 앞 돌일수록 크고 빠름
      const rad = 1.5 + r() * 3.5, sh = [], RR = Math.ceil(rad) + 1;
      for (let y = -RR; y <= RR; y++) for (let x = -RR; x <= RR; x++) {
        const d = Math.hypot(x, y) / rad + (vnoise(x * 0.9 + k * 7, y * 0.9, 99, 99, seed + k) - 0.5) * 0.7;
        if (d > 1) continue;
        const l = (-x - y) / (rad * 1.4) + 0.2;
        sh.push([x, y, l > 0.45 ? 3 : l > -0.1 ? 2 : 1]);
      }
      S.rocks.push({ sh, x: r() * (w + 40) - 20, y: h * (0.45 + r() * 0.5), msPerPx: 120 + (5 - rad) * 90, col: ramp(['#141418', '#3e3a40', '#76707a', '#b0a8ac']) });
    }
  } else {   // 성운: 밝은 어린 별 하나(십자 빛) + 아주 먼 작은 행성
    S.glow = { x: Math.round(w * 0.62), y: Math.round(h * 0.38) };
    P({ kind: 'moon', r: 5, cx: w * 0.24, cy: h * 0.72, light: [0.7, 0.3], size: 2, msPerPx: 900 }, seed + 9);
  }
  return S;
}

// 장면(t ms) → S.buf (w×h, ABGR). mask(w×h, 1 = 유리) 밖은 투명
export function renderSky(S, t0, mask) {
  const { w, h, BW, bg } = S;
  if (!S.buf) S.buf = new Uint32Array(w * h);
  if (S.t0 == null) S.t0 = t0;
  const out = S.buf, t = t0 - S.t0;   // 이 풍경이 열린 뒤 흐른 시간(행성이 멀리 흘러가 버리지 않게)
  const off = Math.floor(t / S.bgMs);
  for (let y = 0; y < h; y++) { const row = y * BW, o = y * w; for (let x = 0; x < w; x++) out[o + x] = bg[row + md(x + off, BW)]; }
  // 별
  for (const s of S.stars) {
    const x = md(s.x - Math.floor(t / s.ms), BW) - 48; if (x < 0 || x >= w) continue;
    const ph = Math.sin(t / s.per * 6.283 + s.ph), ramp = s.warm ? STAR.warm : STAR[s.layer];
    const lv = s.layer === 'far' ? (ph > 0.3 ? 1 : 0) : ph > 0.55 ? 2 : ph > -0.4 ? 1 : 0;
    out[s.y * w + x] = ramp[lv];
    if (s.big && ph > 0.86) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = s.y + dy; if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = ramp[0]; }
  }
  // 성운의 어린 별(천천히 숨쉬는 빛 + 십자)
  if (S.glow) {
    const { x, y } = S.glow, k = 0.5 + 0.5 * Math.sin(t / 2400), L = 3 + Math.round(k * 3), cols = ramp(['#ffffff', '#e8d8ff', '#a888e0', '#5a4a9a']);
    for (let d = -L - 2; d <= L + 2; d++) { const c = cols[Math.min(3, Math.floor(Math.abs(d) / (L / 2.2)))]; if (y >= 0 && y < h && x + d >= 0 && x + d < w) out[y * w + x + d] = c; if (y + d >= 0 && y + d < h) out[(y + d) * w + x] = c; }
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) out[(y + dy) * w + x + dx] = cols[1];
  }
  // 별똥별(행성 뒤)
  if (t > S.nextEvt && !S.evt) { const r = S.r; S.evt = { t0: t, x: w * (0.2 + r() * 0.7), y: h * (0.05 + r() * 0.3), vx: -(0.09 + r() * 0.06), vy: 0.05 + r() * 0.04, len: 7 + Math.floor(r() * 6) }; }
  if (S.evt) {
    const e = S.evt, a = t - e.t0;
    if (a > 900) { S.evt = null; S.nextEvt = t + 9000 + S.r() * 12000; }
    else {
      const tail = ramp(['#ffffff', '#cfe4ff', '#7a9ad0', '#3a4a7a']), n = Math.hypot(e.vx, e.vy);
      for (let k = 0; k < e.len; k++) { const X = Math.round(e.x + e.vx * a - e.vx / n * k), Y = Math.round(e.y + e.vy * a - e.vy / n * k); if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = tail[Math.min(3, Math.floor(k / e.len * 4))]; }
    }
  }
  // 행성(고리 뒤 → 행성 → 고리 앞)
  for (const pl of S.planets) {
    renderPlanet(pl, t);
    const ox = Math.round(pl.cx - pl.r - Math.floor(t / 7000)), oy = Math.round(pl.cy - pl.r);
    if (pl.ring) for (const [x, y, c] of pl.ring.back) { const X = Math.round(pl.cx - Math.floor(t / 7000)) + x, Y = Math.round(pl.cy) + y; if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = c; }
    for (let y = 0; y < pl.D; y++) { const Y = oy + y; if (Y < 0 || Y >= h) continue; for (let x = 0; x < pl.D; x++) { const c = pl.buf[y * pl.D + x], X = ox + x; if (c && X >= 0 && X < w) out[Y * w + X] = c; } }
    if (pl.ring) for (const [x, y, c] of pl.ring.front) { const X = Math.round(pl.cx - Math.floor(t / 7000)) + x, Y = Math.round(pl.cy) + y; if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = c; }
  }
  // 소행성(행성 앞, 왼쪽으로 흐름)
  for (const rk of S.rocks) {
    const X0 = Math.round(md(rk.x - t / rk.msPerPx + 20, w + 40) - 20), Y0 = Math.round(rk.y);
    for (const [x, y, l] of rk.sh) { const X = X0 + x, Y = Y0 + y; if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = rk.col[l]; }
  }
  // 먼 배: 작은 몸 + 붉은 점멸등(행성 앞)
  if (!S.ship && t > S.nextShip) S.ship = { t0: t, y: Math.round(h * (0.12 + S.r() * 0.5)), dir: S.r() < 0.5 ? 1 : -1 };
  if (S.ship) {
    const sp = S.ship, a = t - sp.t0, X = sp.dir > 0 ? Math.round(-4 + a / 160) : Math.round(w + 4 - a / 160);
    if (X < -8 || X > w + 8) { S.ship = null; S.nextShip = t + 22000 + S.r() * 20000; }
    else {
      const Y = sp.y, put = (x, y, c) => { if (x >= 0 && x < w && y >= 0 && y < h) out[y * w + x] = c; };
      put(X, Y, C('#8a96b0')); put(X + 1, Y, C('#5a6680')); put(X - 1, Y, C('#5a6680'));
      if (Math.floor(a / 160) % 7 === 0) put(X - sp.dir * 2, Y, C('#ff6a5a'));
      if (Math.floor(a / 160) % 11 === 3) put(X + sp.dir * 2, Y, C('#ffffff'));
    }
  }
  if (mask) for (let i = 0; i < w * h; i++) if (!mask[i]) out[i] = 0;
  return out;
}

// 두 풍경 사이 디더 녹이기(k 0 → 1): 바이어 문턱보다 k 가 크면 새 풍경 칸
export function blendSky(a, b, k, w, h, out) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; out[i] = th(x, y) < k ? b[i] : a[i]; }
  return out;
}
