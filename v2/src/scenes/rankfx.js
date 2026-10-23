// 결과 화면 대회 점수 막대(2026-10-23 사용자 "각 리그의 승급과 강등, 점수에 관해 직관적으로 와닿게 효과 … 클로얄의 경우 승리후 트로피가 게이지바에 들어가면서
//  늘어나는 연출"): 얻은 점수 = 금빛 알갱이가 '+25점' 알약에서 날아와 막대 끝에 닿을 때마다 막대가 차오르고 숫자가 오름 · 칸(100점)을 넘으면 막대가 꽉 차 번쩍인 뒤
//  엠블럼이 판 위로 떠올라 칸 숫자가 넘어가며 '승급!' · 잃은 점수 = 붉은 알갱이가 막대 끝에서 떨어져 나가며 줄고, 칸이 내려가면 엠블럼이 어두워지며 '강등' ·
//  맨 위 단계(풀로세움) = 우승마다 별 하나가 날아와 별 수가 늘어남.
// 승급 모션(같은 날 사용자 "승급시 모션도 줘. 롤처럼 엠블럼도 좋고"): 단계가 오르면 화면 가득 — 옛 엠블럼이 빛을 모아 떨다 번쩍 → 새 엠블럼이 떨어져 박히며
//  빛살 · 파문 · 조각 + 단계 이름(rankCeremony, 누르면 넘김). 엠블럼 = 코덱스 디자인 도트(assets/v2/icons/emblem_<단계>_<s|m|l>.png — 24 · 48 · 96칸, 없으면 방패 휘장)
// 그리기만 함(상태 없음) — 같은 at(결과가 뜬 뒤 ms) · skipAt(넘긴 때)이면 같은 그림(촬영 · 영상)
import { TIERS, DIVS, DIV_PTS, ROMAN } from '../game/catalog.js';
import { T, plate } from '../art/theme.js';
import { icon } from '../art/icons.js';
import { bigTitle } from './common.js';

export const TIER_COL = { 브론즈: '#d89a62', 실버: '#c8d2e0', 골드: '#f0c858', 플래티넘: '#9ff0e0', 다이아: '#a8d0ff', 마스터: '#e0a8ff', 풀로세움: '#ffd890' };
const TOP = TIERS.length - 1, TIER_PTS = DIV_PTS * DIVS;
// 때(ms): 알갱이 출발 · 알갱이 사이 · 나는 시간 · 막대가 알갱이 몫만큼 차는 시간 · 칸 넘김 뒤 새 칸으로 바뀌는 때 · 떨어지는 시간 · 단계 승급 모션 · 칸 넘김 멈춤
const START = 650, STAGGER = 85, FLIGHT = 520, EASE = 150, SWAP = 180, FALL = 650, CER = 3000, HOLD = 800;
const GOLD = ['#ffc83a', '#fff0a0', '#c8901e'], RED = ['#e2483e', '#ff9a8a', '#8a2420'], INK = '#06090f';
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - (1 - x) * (1 - x);
const easeBack = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const tierIx = R => Math.max(0, Math.min(TOP, TIERS.indexOf(R.tier)));
const lin = R => (tierIx(R) >= TOP ? TOP * TIER_PTS : tierIx(R) * TIER_PTS + Math.max(0, Math.min(TIER_PTS - 1, R.pts || 0)));   // 브론즈 4 0점 = 0 … 풀로세움 = 2400
const bez = (a, c, b, u) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = c => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// 막대 위치 → 단계 · 칸(4 → 1, 맨 위 = 0) · 칸 안 점수
function view(v) {
  const t = Math.min(TOP, Math.floor(v / TIER_PTS + 1e-9));
  if (t >= TOP) return { tier: TOP, div: 0, pts: 0, frac: 1 };
  const inT = v - t * TIER_PTS, d = Math.min(DIVS - 1, Math.floor(inT / DIV_PTS + 1e-9)), p = inT - d * DIV_PTS;
  return { tier: t, div: DIVS - d, pts: p, frac: p / DIV_PTS };
}
const evAt = (P, k) => START + k * STAGGER + (P.d > 0 ? FLIGHT : 0);   // 알갱이 k 가 막대에 닿는(+) · 막대를 떠나는(−) 때(멈춤 전)
function valueAt(P, t) { let s = 0; for (let k = 0; k < P.n; k++) s += clamp01((t - evAt(P, k)) / EASE); return P.a + P.share * s; }
// 알갱이 수 · 몫 · 넘는 칸 경계(많아야 하나 — 한 판에 +45 · −10까지)와 그때 · 멈춤(단계 승급 = 모션 동안, 넘기면 짧게)
function plan(R, skipAt = null) {
  const a = lin(R.from), b = lin(R.to), d = b - a, P = { a, b, d, n: 0, share: 0, cross: null, hold: 0, star: (R.to.stars || 0) > (R.from.stars || 0) };
  if (!d) return P;
  P.n = Math.max(3, Math.min(9, Math.round(Math.abs(d) / 5))); P.share = d / P.n;
  const bd = d > 0 ? (Math.floor(a / DIV_PTS) + 1) * DIV_PTS : Math.floor(a / DIV_PTS) * DIV_PTS;
  if (d > 0 ? b >= bd : b < bd) {   // 넘는 때 = 막대가 경계에 닿는 때(알갱이 몫이 겹쳐 차므로 반으로 나눠 찾음)
    let lo = START, hi = evAt(P, P.n - 1) + EASE;
    for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (d > 0 ? valueAt(P, mid) >= bd : valueAt(P, mid) <= bd) hi = mid; else lo = mid; }
    P.cross = { at: hi, v: bd, tier: d > 0 && bd % TIER_PTS === 0 };
    P.hold = P.cross.tier ? CER : HOLD;
    if (P.cross.tier && skipAt != null && skipAt >= P.cross.at) P.hold = Math.max(SWAP + 150, Math.min(CER, skipAt - P.cross.at + 300));
  }
  return P;
}
// 알갱이 k 가 닿을 막대 자리(그 몫까지 찬 값 — 칸 경계 전에 닿는 알갱이는 옛 칸 끝까지만)
function landOf(P, k) {
  const va = valueAt(P, evAt(P, k) + EASE);
  return P.cross && evAt(P, k) < P.cross.at ? Math.min(va, P.cross.v - 1e-6) : va;
}
const delayOf = (P, t0) => (P.cross && t0 >= P.cross.at ? P.hold : 0);   // 칸 넘김 뒤에 떠날 알갱이는 멈춤만큼 늦게
const warp = (P, t) => (!P.cross || t < P.cross.at ? t : t < P.cross.at + P.hold ? P.cross.at : t - P.hold);
function shown(P, t) {
  const C = P.cross;
  if (C && t >= C.at && t < C.at + P.hold) { const early = t < C.at + SWAP; return P.d > 0 ? (early ? C.v - 1e-6 : C.v) : (early ? C.v : C.v - 1e-6); }   // 넘김 멈춤: 옛 칸 꽉 참(빔) → 새 칸 빔(꽉 참)
  return P.n ? valueAt(P, warp(P, t)) : P.a;
}

// ── 엠블럼 ──
// 그림이 없을 때 쓰는 방패 휘장(13×15를 k배) — 단계 색 · 반짝임
function badge(g, x, y, tier, k = 1) {
  const col = TIER_COL[TIERS[tier]] || '#c8d2e0', hi = shade(col, 0.45), lo = shade(col, -0.38), R = (xx, yy, w, h, c) => g.rect(x + xx * k, y + yy * k, w * k, h * k, c);
  for (let r = 0; r < 15; r++) { const hw = r < 9 ? 6 : 14 - r; R(6 - hw, r, hw * 2 + 1, 1, INK); }
  for (let r = 1; r < 14; r++) { const hw = (r < 9 ? 6 : 14 - r) - 1; if (hw >= 0) R(6 - hw, r, hw * 2 + 1, 1, r < 3 ? hi : r > 10 ? lo : col); }
  R(2, 2, 1, 5, '#ffffff');
  if (tier >= TOP) { R(5, 5, 3, 3, '#fff6c8'); R(6, 4, 1, 5, '#fff6c8'); R(4, 6, 5, 1, '#fff6c8'); }
}
const EMB = ['bronze', 'silver', 'gold', 'plat', 'diamond', 'master', 'pullo'], EMB_K = { s: 1, m: 3, l: 6 }, fallback = new Map();
function emblemArt(tier, size) {
  const im = icon(`emblem_${EMB[tier]}_${size}`); if (im) return im;
  const key = tier + size; let c = fallback.get(key); if (c) return c;
  const k = EMB_K[size]; c = document.createElement('canvas'); c.width = 13 * k; c.height = 15 * k;
  const ctx = c.getContext('2d'); badge({ rect: (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); } }, 0, 0, tier, k);
  fallback.set(key, c); return c;
}
// 엠블럼 그리기(가운데 cx · cy) — fx = { white(0~1 흰 빛), dark(0~1 어둡게), shine(0~1 = 모양을 따라 지나가는 빛 띠 자리) } · 돌려줌 = { w, h }
let scr = null;
export function emblem(g, tier, size, cx, cy, fx = null) {
  const im = emblemArt(tier, size), w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
  const sh = fx && fx.shine != null && fx.shine >= 0 && fx.shine <= 1;
  if (!fx || (!fx.white && !fx.dark && !sh)) { g.img(im, x, y); return { w, h }; }
  if (!scr || scr.width < w || scr.height < h) { scr = document.createElement('canvas'); scr.width = Math.max(w, 96); scr.height = Math.max(h, 96); }
  const c = scr.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, scr.width, scr.height); c.drawImage(im, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  if (fx.dark) { c.globalAlpha = fx.dark; c.fillStyle = '#1a1020'; c.fillRect(0, 0, w, h); }
  if (fx.white) { c.globalAlpha = fx.white; c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); }
  if (sh) { c.globalAlpha = 0.75; c.fillStyle = '#ffffff'; const bw = Math.max(3, Math.round(w * 0.16)), x0 = -h * 0.5 - bw + fx.shine * (w + h * 0.5 + bw * 2); for (let r = 0; r < h; r++) c.fillRect(Math.round(x0 + (h - r) * 0.5), r, bw, 1); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  g.c.imageSmoothingEnabled = false; g.c.drawImage(scr, 0, 0, w, h, x, y, w, h);
  return { w, h };
}

// 칸 숫자 판(2026-10-23 사용자 "넣는다면 로마숫자가 멋있을 거 같아"): 엠블럼 아래에 붙는 작은 판 + 도트 로마 숫자(I · V, k배) — 가운데 cx · 위 y
//  flip = { from, f(0~1), up } 이면 옛 숫자가 빠지고 새 숫자가 들어옴(오름 = 위로 · 내림 = 아래로) · 돌려줌 = { w, h }
const GLYPH = { I: ['ooo', '.o.', '.o.', '.o.', '.o.', '.o.', 'ooo'], V: ['o...o', 'o...o', 'o...o', '.o.o.', '.o.o.', '.o.o.', '..o..'] };
const romanW = s => [...s].reduce((w, c) => w + GLYPH[c][0].length, 0) + Math.max(0, s.length - 1);
function romanAt(g, x, y, s, k) {
  for (const c of s) { const G = GLYPH[c]; G.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'o') g.rect(x + i * k, y + j * k, k, k, j === 0 ? '#fff4c0' : j === G.length - 1 ? '#e8a830' : '#ffd24a'); }); x += (G[0].length + 1) * k; }
}
function numeralPlate(g, cx, y, div, k = 1, flip = null) {
  const s = ROMAN[div] || '', s0 = flip ? ROMAN[flip.from] || '' : '';
  if (!s && !s0) return { w: 0, h: 0 };
  const gw = Math.max(romanW(s), romanW(s0)), w = (gw + 6) * k + 2, h = 11 * k + 2, x = Math.round(cx - w / 2);
  g.rect(x, y, w, h, INK); g.rect(x + 1, y + 1, w - 2, h - 2, '#c8901e'); g.rect(x + 1 + k, y + 1 + k, w - 2 - 2 * k, h - 2 - 2 * k, '#18213a');
  const ix = x + 1 + k, iy = y + 1 + k, iw = w - 2 - 2 * k, ih = h - 2 - 2 * k, gy = y + 1 + 2 * k, at = str => Math.round(cx - (romanW(str) * k) / 2);
  if (!flip || flip.f >= 1) { romanAt(g, at(s), gy, s, k); return { w, h }; }
  const sgn = flip.up ? -1 : 1, d = Math.round(9 * k * flip.f);
  g.clip(ix, iy, iw, ih, () => { romanAt(g, at(s0), gy + sgn * d, s0, k); romanAt(g, at(s), gy - sgn * (9 * k - d), s, k); });
  return { w, h };
}

// ── 작은 연출 ──
function gem(g, x, y, C) {   // 알갱이(마름모, 테 있음)
  x = Math.round(x); y = Math.round(y);
  for (let dy = -3; dy <= 3; dy++) { const h = 3 - Math.abs(dy); g.rect(x - h, y + dy, h * 2 + 1, 1, INK); }
  for (let dy = -2; dy <= 2; dy++) { const h = 2 - Math.abs(dy); g.rect(x - h, y + dy, h * 2 + 1, 1, dy < 0 ? C[1] : dy > 0 ? C[2] : C[0]); }
  g.rect(x - 1, y - 1, 1, 1, '#ffffff');
}
function burst(g, cx, cy, dt, n, cols, seed, speed = 90, life = 700) {
  if (dt < 0 || dt > life) return;
  const s = dt / 1000, k = 1 - dt / life;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hash(seed + i) * 0.7, v = speed * (0.55 + 0.7 * hash(seed + i * 3.1)), z = i % 3 ? 2 : 3;
    g.alpha(k, () => g.rect(Math.round(cx + Math.cos(a) * v * s), Math.round(cy + Math.sin(a) * v * s + 80 * s * s), z, z, cols[i % cols.length]));
  }
}
function ring(g, cx, cy, r, col) { const n = Math.max(20, Math.round(r * 1.3)); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.rect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r * 0.94) - 1, 2, 2, col); } }
function arrow(g, cx, y, up, col) {   // ▲ · ▼ (7칸)
  for (let r = 0; r < 4; r++) { const h = up ? r : 3 - r; g.rect(cx - h - 1, y + r, h * 2 + 3, 1, INK); }
  for (let r = 0; r < 4; r++) { const h = up ? r : 3 - r; g.rect(cx - h, y + r, h * 2 + 1, 1, col); }
}

// 점수 판: R = { from, to }(logic.js battleReward 의 rank), at = 결과가 뜬 뒤 ms, src = 알갱이가 떠나는 곳(진행 알약), line = 판 아래 작은 줄 — 쓴 높이를 돌려줌
export function rankGauge(app, R, at, { x, y, w, src, line = '', skipAt = null }) {
  const { g } = app, P = plan(R, skipAt), v = shown(P, at), V = view(v), C = P.cross, top = V.tier >= TOP;
  const cAt = C ? C.at + SWAP : 0, dC = at - cAt, up = P.d > 0, divX = C && !C.tier;
  const bx0 = x + 34, bw = w - 42, by0 = y + 24, bh = 9, cx = x + 18, cy = y + 20;
  plate(g, x, y, w, 40, 'deep');
  // 엠블럼(24칸): 칸이 오르면 빛 둥근 판이 퍼지고, 내려가면 흔들리며 잠깐 어두워짐
  if (divX && dC >= 0 && dC < 520 && up) g.alpha(0.55 * (1 - dC / 520), () => g.disc(cx, cy, 10 + Math.round(22 * (dC / 520)), TIER_COL[TIERS[V.tier]] || GOLD[0]));
  const shake = divX && !up && dC >= 0 && dC < 460 ? Math.round(Math.sin(dC / 18) * 3 * (1 - dC / 460)) : 0;
  emblem(g, V.tier, 's', cx + shake, cy, divX && dC >= 0 && dC < 500 ? (up ? { white: 0.7 * (1 - dC / 500) } : { dark: 0.5 * (1 - dC / 500) }) : null);
  // 단계 · 칸 이름(바뀐 직후 잠깐 흰색 · 내려가면 붉게) + 오른쪽 점수(맨 위 = 별 수)
  const flashW = divX && up && dC >= 0 && dC < 160, flashR = divX && !up && dC >= 0 && dC < 320;
  const lw = g.text(top ? TIERS[TOP] : `${TIERS[V.tier]} ${ROMAN[V.div]}`, bx0 + shake, y + 6, { font: 'bold', color: flashW ? '#ffffff' : flashR ? '#ff8a7a' : TIER_COL[TIERS[V.tier]] || T.ptext.main });
  if (top) {
    const sArr = START + FLIGHT + 120, stars = P.star && at < sArr ? R.from.stars || 0 : R.to.stars || 0, sx = x + w - 8;
    if (P.star && at >= sArr && at < sArr + 520) g.alpha(0.6 * (1 - (at - sArr) / 520), () => g.disc(sx - 10, y + 11, 6 + Math.round(12 * (at - sArr) / 520), GOLD[1]));
    g.text(`★ ${stars}`, sx, y + 6, { font: 'bold', color: '#ffd890', align: 'right' });
  } else {
    const tw = g.text(`/${DIV_PTS}`, x + w - 8, y + 6, { font: 'bold', color: T.ptext.dim, align: 'right' });
    g.text(String(Math.floor(V.pts + 1e-6)), x + w - 8 - tw - 1, y + 6, { font: 'bold', color: T.ptext.main, align: 'right' });
  }
  // 막대: 테 · 바탕 · 금빛 채움(맨 위 단계 = 꽉 참) · 25점마다 눈금 · 지나가는 반짝임
  g.rect(bx0 - 1, by0 - 1, bw + 2, bh + 2, INK); g.rect(bx0, by0, bw, bh, '#18243c');
  const fw = Math.round(bw * (top ? 1 : V.frac));
  if (fw > 0) {
    g.rect(bx0, by0, fw, bh, GOLD[0]); g.rect(bx0, by0, fw, 2, GOLD[1]); g.rect(bx0, by0 + bh - 2, fw, 2, GOLD[2]);
    const sh = ((at / 1800) % 1.4) * bw - 10; if (sh > -4 && sh < fw) g.alpha(0.35, () => g.rect(bx0 + Math.max(0, Math.round(sh)), by0, Math.min(4, fw - Math.max(0, Math.round(sh))), bh, '#ffffff'));
  }
  for (let q = 1; q < 4; q++) g.alpha(0.5, () => g.rect(bx0 + Math.round((bw * q) / 4), by0, 1, bh, INK));
  if (C && at >= C.at && at < C.at + 160) g.alpha(1 - (at - C.at) / 160, () => g.rect(bx0, by0, bw, bh, up ? '#ffffff' : RED[0]));
  // 얻은 점수 알갱이: 알약에서 막대 끝으로(빨려 들어가듯 빨라짐) · 닿으면 반짝
  if (up && P.n && src) for (let k = 0; k < P.n; k++) {
    const L = START + k * STAGGER, Lw = L + delayOf(P, L), Aw = Lw + FLIGHT, p = (at - Lw) / FLIGHT;
    const dst = view(landOf(P, k)), ex = bx0 + Math.round(bw * dst.frac), ey = by0 + 4;
    if (p >= 0 && p < 1) {
      const side = (k % 2 ? 1 : -1) * (36 + 30 * hash(k + 1)), u = p * p, mx = (src.x + ex) / 2 + side, my = (src.y + ey) / 2 - 10;
      for (let tr = 2; tr >= 1; tr--) { const uu = Math.max(0, p - tr * 0.06); g.alpha(0.18 * (3 - tr), () => gem(g, bez(src.x, mx, ex, uu * uu), bez(src.y, my, ey, uu * uu), GOLD)); }
      gem(g, bez(src.x, mx, ex, u), bez(src.y, my, ey, u), GOLD);
    } else if (p >= 1 && at - Aw < 180) { const k2 = 1 - (at - Aw) / 180; g.alpha(k2, () => g.rect(ex - 1, ey - 2, 3, 5, '#ffffff')); burst(g, ex, ey, at - Aw, 4, ['#ffffff', GOLD[1]], k * 7, 60, 180); }
  }
  // 잃은 점수 알갱이: 막대 끝에서 튀어 올랐다 떨어지며 사라짐
  if (!up && P.n) for (let k = 0; k < P.n; k++) {
    const D = START + k * STAGGER, Dw = D + delayOf(P, D), p = (at - Dw) / FALL;
    if (p < 0 || p >= 1) continue;
    const s0 = view(shown(P, Dw)), x0 = bx0 + Math.round(bw * s0.frac), side = (k % 2 ? 1 : -1) * (14 + 18 * hash(k + 3));
    g.alpha(1 - p * p, () => gem(g, x0 + side * p, by0 + 4 - 16 * p + 54 * p * p, RED));
  }
  // 칸이 바뀐 순간(단계 승급은 rankCeremony 가 화면 가득): 엠블럼에서 조각 · 화살표 · 이름 옆 짧은 글자 + 판 위로 떠오르는 큰 엠블럼(칸 숫자 넘김)
  if (divX && dC >= 0) {
    const col = TIER_COL[TIERS[V.tier]] || GOLD[0], tx = bx0 + lw + 6, fade = k => (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25);
    if (up) {
      burst(g, cx, cy, dC, 16, [col, '#ffffff', GOLD[0]], 11, 90, 700);
      if (dC < 800) { const k = dC / 800; g.alpha(1 - k, () => arrow(g, cx, y + 2 - Math.round(10 * k), true, GOLD[1])); }
      if (dC < 1300) { const k = dC / 1300; g.alpha(fade(k), () => g.text('승급!', tx, y + 6 - Math.round(4 * Math.min(1, k * 4)), { font: 'bold', color: '#ffe27a', outline: '#3a2406', outlineW: 3 })); }
    } else {   // 엠블럼에서 붉은 조각이 아래로 떨어짐 · ▼ · '강등'
      if (dC < 650) for (let i = 0; i < 6; i++) { const s = dC / 1000; g.alpha(1 - dC / 650, () => g.rect(Math.round(cx - 5 + i * 2 + (hash(i + 9) - 0.5) * 34 * s), Math.round(cy + 8 + 30 * s + 160 * s * s), 2, 2, i % 2 ? RED[0] : '#5a1a18')); }
      if (dC < 800) { const k = dC / 800; g.alpha(1 - k, () => arrow(g, cx, y + 34 + Math.round(8 * k), false, RED[0])); }
      if (dC < 1300) { const k = dC / 1300; g.alpha(fade(k), () => g.text('강등', tx, y + 6 + Math.round(3 * Math.min(1, k * 4)), { font: 'bold', color: '#ff8a7a', outline: '#3a0c0a', outlineW: 3 })); }
    }
    divPop(g, P, V, at, x + Math.round(w / 2), y - 40);
  }
  // 맨 위 단계 우승 = 별 하나가 날아와 별 수에 들어감
  if (top && P.star && src) {
    const p = (at - START) / (FLIGHT + 120), ex = x + w - 20, ey = y + 11;
    if (p >= 0 && p < 1) { const u = p * p; g.text('★', bez(src.x, src.x + 40, ex, u), bez(src.y, (src.y + ey) / 2, ey, u) - 6, { font: 'head', color: '#ffe27a', outline: '#3a2406', outlineW: 3, align: 'center' }); }
    burst(g, ex + 10, ey, at - START - FLIGHT - 120, 14, [GOLD[1], '#ffffff', GOLD[0]], 3, 80, 700);
  }
  if (line) g.text(line, x + w / 2, y + 44, { color: T.ptext.sub, align: 'center' });
  return line ? 58 : 44;
}
// 칸 승급 · 강등 모션(판 위, 1.5초): 48칸 엠블럼이 떨어져 나타나 빛 띠가 지나가고(강등 = 어두워짐) 아래 '골드 4 → 3' 숫자가 넘어감 → 막대 쪽으로 가라앉으며 사라짐
function divPop(g, P, V, at, px, py) {
  const C = P.cross, up = P.d > 0, t = at - C.at, A = -60, B = 1500;
  if (t < A || t >= B) return;
  const appear = clamp01((t - A) / 220), leave = clamp01((B - t) / 300), a = Math.min(appear, leave), dy = Math.round(-12 * (1 - easeOut(appear)) + 18 * (1 - leave));
  const oldV = view(up ? C.v - 1e-6 : C.v), newV = view(up ? C.v : C.v - 1e-6), col = TIER_COL[TIERS[V.tier]] || GOLD[0];
  g.alpha(0.82 * a, () => { g.rect(px - 44, py - 41 + dy, 88, 82, '#0a1220'); g.rect(px - 45, py - 40 + dy, 90, 80, '#0a1220'); });
  if (up && t >= SWAP && t < SWAP + 700) g.alpha(0.5 * a * (1 - (t - SWAP) / 700), () => g.disc(px, py - 12 + dy, 18 + Math.round(16 * (t - SWAP) / 700), col));
  const fx = up ? { white: t >= SWAP && t < SWAP + 160 ? 0.8 * (1 - (t - SWAP) / 160) : 0, shine: t > SWAP + 200 && t < SWAP + 650 ? (t - SWAP - 200) / 450 : -1 } : { dark: t >= SWAP ? 0.45 * clamp01(1 - (t - SWAP - 600) / 500) : 0 };
  const ce = py - 12 + dy;
  g.alpha(a, () => {
    const { h } = emblem(g, V.tier, 'm', px, ce, fx), pt = Math.round(ce + h / 2 - 3);
    numeralPlate(g, px, pt, newV.div, 1, { from: oldV.div, f: clamp01((t - SWAP) / 240), up });   // 칸 숫자 넘김(오름 = 옛 숫자가 위로 빠지고 새 숫자가 아래에서 · 내림 = 거꾸로)
    g.text(TIERS[V.tier], px, pt + 15, { font: 'bold', color: col, align: 'center' });
  });
}

// 단계 승급 모션(화면 가득, 3초 · 누르면 넘김): 어두워짐 → 옛 엠블럼에 빛이 모이며 떨림 → 번쩍 → 새 엠블럼이 떨어져 박힘(파문 · 조각 · 빛살) → 빛 띠 → 단계 이름 · '승급!' → 사라짐
//  그렸으면 true(결과 화면이 누르면 넘김 칸을 둠)
export function rankCeremony(app, R, at, { skipAt = null } = {}) {
  const P = plan(R, skipAt), C = P.cross;
  if (!C || !C.tier) return false;
  const t = at - C.at, end = C.at + P.hold;
  if (t < 120 || at >= end) return false;
  const { g, W, H } = app, out = clamp01((end - at) / 350), k = Math.min(clamp01((t - 120) / 330), out);
  const cx = Math.round(W / 2), cy = Math.round(H * 0.4), oldT = view(C.v - 1e-6).tier, nv = view(C.v), newT = nv.tier, col = TIER_COL[TIERS[newT]] || GOLD[0], SW = 1100;
  g.alpha(0.9 * k, () => g.rect(0, 0, W, H, '#060a14'));
  if (t < SW) {   // 옛 엠블럼: 나타나 빛을 모으며 떨림
    const a = clamp01((t - 200) / 220) * out, ch = clamp01((t - 550) / 550), sh = Math.round(Math.sin(t / 20) * 3 * ch);
    for (let i = 0; i < 16; i++) {
      const p = clamp01((t - 300 - i * 30) / 650); if (p <= 0 || p >= 1) continue;
      const an = hash(i * 1.7) * Math.PI * 2, r = (110 + 70 * hash(i + 4)) * (1 - p * p);
      g.alpha(0.9 * out, () => g.rect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 2, 2, i % 2 ? '#ffffff' : col));
    }
    g.alpha(a, () => { const { h } = emblem(g, oldT, 'l', cx + sh, cy, { white: 0.7 * ch * ch }); numeralPlate(g, cx + sh, Math.round(cy + h / 2 - 6), view(C.v - 1e-6).div, 2); });
  } else {   // 번쩍 → 새 엠블럼
    const f = t - SW, drop = clamp01(f / 420), dy = Math.round(-30 * (1 - easeBack(drop)));
    g.alpha(0.32 * out * clamp01(f / 200), () => { const rot = at / 1600; for (let i = 0; i < 14; i += 2) { const a0 = rot + i * (Math.PI / 7), a1 = a0 + Math.PI / 14; g.poly([[cx, cy], [cx + Math.cos(a0) * 190, cy + Math.sin(a0) * 190], [cx + Math.cos(a1) * 190, cy + Math.sin(a1) * 190]], col); } });
    if (f >= 380 && f < 980) g.alpha((1 - (f - 380) / 600) * out, () => ring(g, cx, cy, 40 + Math.round(90 * easeOut((f - 380) / 600)), col));
    burst(g, cx, cy, f - 380, 34, [col, '#ffffff', GOLD[0], GOLD[1]], 21, 150, 1100);
    let eh = 0;
    g.alpha(out, () => { eh = emblem(g, newT, 'l', cx, cy + dy, f > 600 && f < 1100 ? { shine: (f - 600) / 500 } : null).h; if (newT < TOP) numeralPlate(g, cx, Math.round(cy + dy + eh / 2 - 6), nv.div, 2); });
    for (let i = 0; i < 8; i++) { const tw = Math.sin(at / 160 + i * 1.9); if (f > 500 && tw > 0.55) g.alpha(out * (tw - 0.55) * 2, () => { const an = i * 0.785 + 0.3, r = 58 + 10 * hash(i); g.rect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 2, 2, '#ffffff'); }); }
    const tk = clamp01((f - 260) / 260) * out, slide = Math.round(10 * (1 - easeOut(clamp01((f - 260) / 260))));
    g.alpha(tk, () => bigTitle(g, '승급!', cx, cy - 78 + slide, { font: 'name', top: '#fbff86', mid: '#f9c22b', low: '#f79617', shadow: '#9e4539' }));
    g.alpha(tk, () => bigTitle(g, newT >= TOP ? TIERS[TOP] : `${TIERS[newT]} ${ROMAN[nv.div]}`, cx, cy + 74 + slide, { font: 'big', top: shade(col, 0.6), mid: col, low: shade(col, -0.22), shadow: shade(col, -0.62) }));
    if (f < 380) g.alpha(0.95 * (1 - f / 380), () => g.rect(0, 0, W, H, '#ffffff'));
  }
  return true;
}
