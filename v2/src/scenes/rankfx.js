// 결과 화면 대회 점수 막대(2026-10-23 사용자 "각 리그의 승급과 강등, 점수에 관해 직관적으로 와닿게 효과 … 클로얄의 경우 승리후 트로피가 게이지바에 들어가면서
//  늘어나는 연출"): 얻은 점수 = 금빛 알갱이가 '+25점' 알약에서 날아와 막대 끝에 닿을 때마다 막대가 차오르고 숫자가 오름 · 칸(100점)을 넘으면 막대가 꽉 차 번쩍인 뒤
//  휘장이 터지며 다음 칸(단계가 바뀌면 빛살 + 큰 '승급!') · 잃은 점수 = 붉은 알갱이가 막대 끝에서 떨어져 나가며 줄고, 칸이 내려가면 휘장이 흔들리며 '강등' ·
//  맨 위 단계(풀로세움) = 우승마다 별 하나가 날아와 별 수가 늘어남. 그리기만 함(상태 없음) — 같은 at(결과가 뜬 뒤 ms)이면 같은 그림(촬영 · 영상)
import { TIERS, DIVS, DIV_PTS } from '../game/catalog.js';
import { T, plate } from '../art/theme.js';
import { bigTitle } from './common.js';

export const TIER_COL = { 브론즈: '#d89a62', 실버: '#c8d2e0', 골드: '#f0c858', 플래티넘: '#9ff0e0', 다이아: '#a8d0ff', 마스터: '#e0a8ff', 풀로세움: '#ffd890' };
const TOP = TIERS.length - 1, TIER_PTS = DIV_PTS * DIVS;
// 때(ms): 알갱이 출발 · 알갱이 사이 · 나는 시간 · 막대가 알갱이 몫만큼 차는 시간 · 칸 넘김 뒤 새 칸으로 바뀌는 때 · 떨어지는 시간
const START = 650, STAGGER = 85, FLIGHT = 520, EASE = 150, SWAP = 180, FALL = 650;
const GOLD = ['#ffc83a', '#fff0a0', '#c8901e'], RED = ['#e2483e', '#ff9a8a', '#8a2420'], INK = '#06090f';
const clamp01 = x => Math.max(0, Math.min(1, x));
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
// 알갱이 수 · 몫 · 넘는 칸 경계(많아야 하나 — 한 판에 +45 · −10까지)와 그때 · 멈춤
function plan(R) {
  const a = lin(R.from), b = lin(R.to), d = b - a, P = { a, b, d, n: 0, share: 0, cross: null, hold: 0, star: (R.to.stars || 0) > (R.from.stars || 0) };
  if (!d) return P;
  P.n = Math.max(3, Math.min(9, Math.round(Math.abs(d) / 5))); P.share = d / P.n;
  const bd = d > 0 ? (Math.floor(a / DIV_PTS) + 1) * DIV_PTS : Math.floor(a / DIV_PTS) * DIV_PTS;
  if (d > 0 ? b >= bd : b < bd) {   // 넘는 때 = 막대가 경계에 닿는 때(알갱이 몫이 겹쳐 차므로 반으로 나눠 찾음)
    let lo = START, hi = evAt(P, P.n - 1) + EASE;
    for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (d > 0 ? valueAt(P, mid) >= bd : valueAt(P, mid) <= bd) hi = mid; else lo = mid; }
    P.cross = { at: hi, v: bd, tier: d > 0 && bd % TIER_PTS === 0 };
    P.hold = P.cross.tier ? 1200 : 650;
  }
  return P;
}
// 알갱이 k 가 닿을 막대 자리(그 몫까지 찬 값 — 칸 경계 전에 닿는 알갱이는 옛 칸 끝까지만)
function landOf(P, k) {
  const va = valueAt(P, evAt(P, k) + EASE);
  return P.cross && evAt(P, k) < P.cross.at ? Math.min(va, P.cross.v - 1e-6) : va;
}
const evAt = (P, k) => START + k * STAGGER + (P.d > 0 ? FLIGHT : 0);   // 알갱이 k 가 막대에 닿는(+) · 막대를 떠나는(−) 때(멈춤 전)
const delayOf = (P, t0) => (P.cross && t0 >= P.cross.at ? P.hold : 0);   // 칸 넘김 뒤에 떠날 알갱이는 멈춤만큼 늦게
const warp = (P, t) => (!P.cross || t < P.cross.at ? t : t < P.cross.at + P.hold ? P.cross.at : t - P.hold);
function valueAt(P, t) { let s = 0; for (let k = 0; k < P.n; k++) s += clamp01((t - evAt(P, k)) / EASE); return P.a + P.share * s; }
function shown(P, t) {
  const C = P.cross;
  if (C && t >= C.at && t < C.at + P.hold) { const early = t < C.at + SWAP; return P.d > 0 ? (early ? C.v - 1e-6 : C.v) : (early ? C.v : C.v - 1e-6); }   // 넘김 멈춤: 옛 칸 꽉 참(빔) → 새 칸 빔(꽉 참)
  return P.n ? valueAt(P, warp(P, t)) : P.a;
}

// 단계 휘장(13×15 방패) — 단계 색 · 칸 숫자(맨 위 = 별)
function badge(g, x, y, tier, div) {
  const col = TIER_COL[TIERS[tier]] || '#c8d2e0', hi = shade(col, 0.45), lo = shade(col, -0.38);
  for (let r = 0; r < 15; r++) { const hw = r < 9 ? 6 : 14 - r; g.rect(x + 6 - hw, y + r, hw * 2 + 1, 1, INK); }
  for (let r = 1; r < 14; r++) { const hw = (r < 9 ? 6 : 14 - r) - 1; if (hw >= 0) g.rect(x + 6 - hw, y + r, hw * 2 + 1, 1, r < 3 ? hi : r > 10 ? lo : col); }
  g.rect(x + 2, y + 2, 1, 5, '#ffffff');
  g.text(tier >= TOP ? '★' : String(div), x + 7, y + 2, { font: 'bold', color: '#1a1206', align: 'center' });
}
// 알갱이(마름모, 테 있음)
function gem(g, x, y, C) {
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
function arrow(g, cx, y, up, col) {   // ▲ · ▼ (7칸)
  for (let r = 0; r < 4; r++) { const h = up ? r : 3 - r; g.rect(cx - h - 1, y + r, h * 2 + 3, 1, INK); }
  for (let r = 0; r < 4; r++) { const h = up ? r : 3 - r; g.rect(cx - h, y + r, h * 2 + 1, 1, col); }
}

// 점수 판: R = { from, to }(logic.js battleReward 의 rank), at = 결과가 뜬 뒤 ms, src = 알갱이가 떠나는 곳(진행 알약), line = 판 아래 작은 줄 — 쓴 높이를 돌려줌
export function rankGauge(app, R, at, { x, y, w, src, line = '' }) {
  const { g } = app, P = plan(R), v = shown(P, at), V = view(v), C = P.cross, top = V.tier >= TOP;
  const cAt = C ? C.at + SWAP : 0, dC = at - cAt, up = P.d > 0;
  const bx0 = x + 26, bw = w - 34, by0 = y + 24, bh = 9, cx = x + 13, cy = y + 19;
  // 단계가 오른 빛살(휘장 뒤)
  if (C && C.tier && dC >= 0 && dC < 1500) {
    const k = dC < 200 ? dC / 200 : 1 - clamp01((dC - 1100) / 400), col = TIER_COL[TIERS[V.tier]] || GOLD[0], rot = at / 900;
    g.alpha(0.42 * k, () => { for (let i = 0; i < 12; i += 2) { const a0 = rot + i * (Math.PI / 6), a1 = a0 + Math.PI / 12; g.poly([[cx, cy], [cx + Math.cos(a0) * 70, cy + Math.sin(a0) * 70], [cx + Math.cos(a1) * 70, cy + Math.sin(a1) * 70]], col); } });
  }
  plate(g, x, y, w, 40, 'deep');
  // 휘장: 칸이 오르면 빛 둥근 판이 퍼지고, 내려가면 흔들림
  if (C && dC >= 0 && dC < 520 && up) g.alpha(0.55 * (1 - dC / 520), () => g.disc(cx, cy, 8 + Math.round(26 * (dC / 520)), TIER_COL[TIERS[V.tier]] || GOLD[0]));
  const shake = C && !up && dC >= 0 && dC < 460 ? Math.round(Math.sin(dC / 18) * 3 * (1 - dC / 460)) : 0;
  badge(g, x + 7 + shake, y + 12, V.tier, V.div);
  // 단계 · 칸 이름(바뀐 직후 잠깐 흰색 · 내려가면 붉게) + 오른쪽 점수(맨 위 = 별 수)
  const flashW = C && up && dC >= 0 && dC < 160, flashR = C && !up && dC >= 0 && dC < 320;
  const lw = g.text(top ? TIERS[TOP] : `${TIERS[V.tier]} ${V.div}`, x + 26 + shake, y + 6, { font: 'bold', color: flashW ? '#ffffff' : flashR ? '#ff8a7a' : TIER_COL[TIERS[V.tier]] || T.ptext.main });
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
  // 칸이 바뀐 순간: 휘장에서 터지는 조각 · 화살표 · 짧은 글자(오름 '승급!' · 내림 '강등')
  if (C && dC >= 0) {
    const col = TIER_COL[TIERS[V.tier]] || GOLD[0];
    const tx = x + 26 + lw + 6, fade = k => (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25);   // 짧은 글자 = 칸 이름 바로 옆
    if (up) {
      burst(g, cx, cy, dC, C.tier ? 26 : 16, [col, '#ffffff', GOLD[0]], 11, C.tier ? 120 : 90, C.tier ? 900 : 700);
      if (dC < 800) { const k = dC / 800; g.alpha(1 - k, () => arrow(g, cx, y + 4 - Math.round(10 * k), true, GOLD[1])); }
      if (!C.tier && dC < 1300) { const k = dC / 1300; g.alpha(fade(k), () => g.text('승급!', tx, y + 6 - Math.round(4 * Math.min(1, k * 4)), { font: 'bold', color: '#ffe27a', outline: '#3a2406', outlineW: 3 })); }
    } else {   // 휘장에서 붉은 조각이 아래로 떨어짐 · ▼ · '강등'
      if (dC < 650) for (let i = 0; i < 6; i++) { const s = dC / 1000; g.alpha(1 - dC / 650, () => g.rect(Math.round(cx - 5 + i * 2 + (hash(i + 9) - 0.5) * 34 * s), Math.round(cy + 6 + 30 * s + 160 * s * s), 2, 2, i % 2 ? RED[0] : '#5a1a18')); }
      if (dC < 800) { const k = dC / 800; g.alpha(1 - k, () => arrow(g, cx, y + 30 + Math.round(10 * k), false, RED[0])); }
      if (dC < 1300) { const k = dC / 1300; g.alpha(fade(k), () => g.text('강등', tx, y + 6 + Math.round(3 * Math.min(1, k * 4)), { font: 'bold', color: '#ff8a7a', outline: '#3a0c0a', outlineW: 3 })); }
    }
    // 단계가 오르면 판 위에 큰 '○○ 승급!'
    if (C.tier && dC < 1900) {   // 보상 카드 위에 뜨므로 어두운 띠를 깔고
      const k = clamp01(dC < 160 ? dC / 160 : dC > 1500 ? 1 - (dC - 1500) / 400 : 1), ry = y - 30 + Math.round(6 * (1 - clamp01(dC / 160)));
      g.alpha(0.82 * k, () => g.rect(x + 22, ry - 4, w - 44, 27, '#0a1220'));
      g.alpha(k, () => bigTitle(g, `${TIERS[V.tier]} 승급!`, x + w / 2, ry, { font: 'name', top: '#fbff86', mid: '#f9c22b', low: '#f79617', shadow: '#9e4539' }));
    }
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
