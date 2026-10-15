// 배경(전부 코드로 직접 그린 도트). 같은 씨앗값이면 같은 그림 — 별 위치가 매번 바뀌지 않는다.
import { C, RAMP } from './palette.js';
import { layer } from '../core/gfx.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 별: 1칸 점 + 가끔 십자 반짝이(시간에 따라 깜빡)
export function stars(g, x, y, w, h, t, seed = 7, density = 0.012) {
  const R = rng(seed);
  const n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor(R() * w), sy = y + Math.floor(R() * h), k = R();
    const ph = R() * 6.28, tw = Math.sin(t / 600 + ph);
    if (k < 0.06) { // 큰 반짝이
      const col = tw > 0.2 ? C.white : C.mist;
      g.px(sx, sy, col); if (tw > -0.3) { g.px(sx - 1, sy, C.mute); g.px(sx + 1, sy, C.mute); g.px(sx, sy - 1, C.mute); g.px(sx, sy + 1, C.mute); }
    } else if (k < 0.35) g.px(sx, sy, tw > 0.6 ? C.white : C.mute);
    else g.px(sx, sy, tw > 0.8 ? C.mute : C.slate);
  }
}

// 행성: 디더 명암(빛 = 왼쪽 위) + 테두리 빛
export function planet(g, cx, cy, r, ramp, opt = {}) {
  const P = RAMP[ramp] || RAMP.water;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d2 = dx * dx + dy * dy; if (d2 > r * r) continue;
    const nx = dx / r, ny = dy / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let L = (-0.55 * nx - 0.6 * ny + 0.58 * nz); // 빛 방향
    L = L * 0.5 + 0.5; // 0~1
    // 띠 무늬(가스 행성)
    if (opt.bands) L += Math.sin((dy + cy) * 0.9 + dx * 0.15) * 0.06;
    const X = cx + dx, Y = cy + dy;
    const lv = L * 4.2; let i = Math.floor(lv); const fr = lv - i;
    if (fr > 0.5 && ((X + Y) & 1)) i++; // 경계 디더
    i = Math.max(0, Math.min(4, i));
    g.px(X, Y, P[i]);
  }
  // 바깥 그늘 테
  if (opt.ring) {
    for (let a = 0; a < 360; a += 1) {
      const rad = a * Math.PI / 180, rx = r * 1.8, ry = r * 0.42;
      const X = Math.round(cx + Math.cos(rad) * rx), Y = Math.round(cy + Math.sin(rad) * ry);
      const behind = Math.sin(rad) < 0 && (X - cx) ** 2 + (Y - cy) ** 2 < r * r;
      if (!behind) g.px(X, Y, opt.ringCol || C.mist);
    }
  }
}

// 우주 바탕: 위에서 아래로 짙은 보라→남색 띠 + 성운 디더 + 별
export function space(g, x, y, w, h, t, seed = 11) {
  g.vgrad(x, y, w, h, ['#1f1828', C.ink, '#3a2a48', C.dusk, '#2e2a4a', C.night]);
  // 성운 얼룩 두 개
  const R = rng(seed + 3);
  for (let k = 0; k < 2; k++) {
    const cx = x + R() * w, cy = y + h * (0.25 + R() * 0.5), rx = w * (0.35 + R() * 0.25), ry = h * 0.12;
    const col = k ? '#45293f' : '#6b3e75';
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      const d = (i * i) / (rx * rx) + (j * j) / (ry * ry); if (d > 1) continue;
      const X = Math.round(cx + i), Y = Math.round(cy + j);
      const lvl = (1 - d) * 7;
      if (((X * 7 + Y * 13) & 15) < lvl) g.px(X, Y, col);
    }
  }
  stars(g, x, y, w, h, t, seed, 0.014);
}

// ── 온실 함교(홈 무대). 반해상도 층에 그린다(화면에선 2배) ──
export function room(g, w, h, t) {
  // 뒷벽: 금속판(세로 이음새·리벳), 위쪽 가로 들보
  g.rect(0, 0, w, h, '#2b2238');
  const panelW = 22;
  for (let px = -4; px < w; px += panelW) {
    g.rect(px, 0, panelW - 1, h, C.shade);
    g.rect(px, 0, 1, h, '#4a3d58');
    g.rect(px + panelW - 2, 0, 1, h, '#2b2238');
    for (let ry = 14; ry < h; ry += 20) { g.px(px + 3, ry, C.slate); g.px(px + panelW - 5, ry, C.slate); }
  }
  g.rect(0, 0, w, 6, C.ink); g.rect(0, 1, w, 4, '#3a2f45'); g.rect(0, 1, w, 1, '#4a3d58');
  for (let x = 4; x < w; x += 10) g.px(x, 3, C.slate);
  // 둥근 관측창
  const cx = Math.floor(w / 2), cy = 42, r = 32;
  g.disc(cx, cy, r + 3, C.ink);
  g.disc(cx, cy, r + 2, '#7f708a');
  g.disc(cx, cy, r + 1, '#4a3d58');
  g.disc(cx, cy, r, C.ink);
  for (let dy = -r + 1; dy <= r - 1; dy++) {
    const hw = Math.floor(Math.sqrt((r - 1) * (r - 1) - dy * dy));
    const col = dy < -10 ? '#1f1828' : (dy < 10 ? '#2a1f33' : '#352845');
    g.rect(cx - hw, cy + dy, hw * 2 + 1, 1, col);
  }
  // 창 안: 성운 줄기 + 별 + 작은 행성·달
  const R = rng(21);
  for (let i = 0; i < 60; i++) { const a = R() * 6.28, d = R() * (r - 2); const sx = Math.round(cx + Math.cos(a) * d), sy = Math.round(cy + Math.sin(a) * d); const tw = Math.sin(t / 500 + i); g.px(sx, sy, tw > 0.6 ? C.white : (tw > -0.3 ? C.mute : C.slate)); }
  for (let i = -18; i <= 18; i++) { const y = Math.round(cy + 8 + i * 0.45 + Math.sin(i / 3) * 2); if (((i + 40) % 3) !== 0) g.px(cx + i, y, '#45293f'); }
  planet(g, cx - 14, cy - 13, 8, 'ice');
  planet(g, cx + 17, cy - 19, 3, 'earth');
  // 창살(십자)과 반사광
  g.rect(cx - r + 1, cy, (r - 1) * 2, 1, '#4a3d58'); g.rect(cx, cy - r + 1, 1, (r - 1) * 2, '#4a3d58');
  for (let k = 0; k < 6; k++) g.px(cx - 20 + k, cy - 20 + k, '#625565');
  for (let a = 0; a < 8; a++) { const rad = a * Math.PI / 4; g.px(Math.round(cx + Math.cos(rad) * (r + 2)), Math.round(cy + Math.sin(rad) * (r + 2)), C.mist); }
  // 왼쪽 벽 선반 + 작은 화분 둘, 오른쪽 벽 계기판
  const shY = 70;
  g.rect(4, shY, 24, 2, C.ink); g.rect(4, shY, 24, 1, '#966c6c');
  smallPot(g, 8, shY - 6, C.green); smallPot(g, 18, shY - 7, '#a884f3');
  const mx = w - 26, my = 60;
  g.rect(mx, my, 20, 14, C.ink); g.rect(mx + 1, my + 1, 18, 12, '#1b3b35');
  for (let i = 0; i < 16; i++) g.px(mx + 2 + i, my + 7 + Math.round(Math.sin(i * 0.9 + t / 300) * 3), '#30e1b9');
  g.px(mx + 17, my + 2, Math.floor(t / 400) % 2 ? C.red : '#6e2727');
  // 바닥
  const fy = h - 34;
  g.rect(0, fy, w, h - fy, '#3a2f45');
  g.rect(0, fy, w, 1, '#7f708a');
  g.rect(0, fy + 1, w, 1, C.ink);
  for (let k = 0; k < 4; k++) { const yy = fy + 5 + k * 7 + k * k; if (yy < h) g.rect(0, yy, w, 1, '#2b2238'); }
  for (let i = -6; i <= 6; i++) g.line(cx + i * 6, fy + 2, cx + i * 22, h, '#2b2238');
  // 받침대 뒤 바닥 빛(밝은 타원)
  g.ellipse(cx, fy + 18, 30, 6, '#45293f');
  // 천장 성장등 + 아래로 번지는 빛 점
  g.rect(cx - 13, 6, 26, 3, C.ink); g.rect(cx - 12, 6, 24, 2, '#7f708a'); g.rect(cx - 9, 8, 18, 1, '#fbff86');
  // 양 모서리 늘어진 덩굴
  ivy(g, 6, 0, 62, t, 0);
  ivy(g, w - 7, 0, 48, t, 2);
}
function smallPot(g, x, y, leaf) {
  g.rect(x, y + 3, 7, 4, C.ink); g.rect(x + 1, y + 3, 5, 3, '#cd683d'); g.rect(x + 1, y + 3, 5, 1, '#e6904e');
  g.px(x + 3, y + 2, leaf); g.px(x + 2, y + 1, leaf); g.px(x + 4, y, leaf); g.px(x + 5, y + 1, leaf);
}
function ivy(g, x, y0, len, t, ph) {
  const sway = Math.round(Math.sin(t / 900 + ph));
  for (let y = y0; y < y0 + len; y++) {
    const xx = x + Math.round(Math.sin((y + ph * 7) / 6) * 1.5) + (y > y0 + len / 2 ? sway : 0);
    g.px(xx, y, '#239063');
    if (y % 5 === 0) { const d = (y / 5) % 2 ? 1 : -1; g.rect(xx + d, y - 1, 2, 2, '#1ebc73'); g.px(xx + d * 2, y - 1, '#91db69'); }
  }
}

// 나무 받침대(홈 무대 화분 받침) — 반해상도 층 기준
export function stand(g, cx, topY) {
  const w = 40;
  const x = cx - w / 2;
  g.rect(x, topY, w, 4, C.ink);
  g.rect(x + 1, topY + 1, w - 2, 2, '#ab947a');
  g.rect(x + 1, topY + 1, w - 2, 1, '#c7b8a0');
  g.rect(x + 2, topY + 4, w - 4, 2, '#694f62');
  // 다리
  for (const lx of [x + 4, x + w - 7]) { g.rect(lx, topY + 6, 3, 12, C.ink); g.rect(lx + 1, topY + 6, 1, 11, '#966c6c'); }
  g.rect(x + 6, topY + 12, w - 12, 2, C.ink); g.rect(x + 7, topY + 12, w - 14, 1, '#966c6c');
  // 그림자
  g.dither(x - 2, topY + 18, w + 4, 2, C.ink, 10);
}

// ── 경기장(전투 무대) — 반해상도 층 ──
export function arena(g, w, h, t) {
  // 하늘(우주) + 관중석 + 바닥
  g.vgrad(0, 0, w, 44, ['#1f1828', C.ink, '#3a2a48']);
  stars(g, 0, 0, w, 34, t, 31, 0.03);
  // 조명탑 빛살
  for (const lx of [10, w - 12]) {
    g.rect(lx, 6, 3, 20, C.ink); g.rect(lx - 2, 4, 7, 3, C.slate); g.rect(lx - 1, 5, 5, 1, '#fbff86');
  }
  // 관중석(층층이)
  const sy = 26;
  for (let row = 0; row < 4; row++) {
    const yy = sy + row * 5;
    g.rect(0, yy, w, 5, row % 2 ? '#3a2f45' : '#45293f');
    g.rect(0, yy, w, 1, C.ink);
    const R = rng(40 + row);
    for (let x = 1; x < w; x += 3) { const k = R(); if (k < 0.55) { const col = [C.slate, '#7f708a', '#a24b6f', '#4d65b4', '#0b8a8f'][Math.floor(R() * 5)]; g.px(x, yy + 2 + (Math.sin(t / 300 + x) > 0.85 ? -1 : 0), col); g.px(x, yy + 3, C.ink); } }
  }
  // 경기장 벽
  const wy = sy + 20;
  g.rect(0, wy, w, 6, '#625565'); g.rect(0, wy, w, 1, '#9babb2'); g.rect(0, wy + 5, w, 1, C.ink);
  for (let x = 4; x < w; x += 12) g.rect(x, wy + 2, 6, 2, '#7f708a');
  // 바닥(돌판, 원근 줄)
  const fy = wy + 6;
  g.rect(0, fy, w, h - fy, '#4a3d58');
  for (let k = 0; k < 9; k++) { const yy = fy + Math.round(k * k * 1.15 + k * 2); if (yy < h) g.rect(0, yy, w, 1, '#3e3546'); }
  const cx = w / 2;
  for (let i = -8; i <= 8; i++) g.line(Math.round(cx + i * 9), fy, Math.round(cx + i * 30), h, '#3e3546');
  // 바닥 큰 원 문양
  g.ellipseRing(Math.round(cx), Math.round(fy + (h - fy) * 0.5), 54, 22, '#625565', 3);
}
// ── 전투 무대 1배 도트(2026-10-15 사용자 결정 ①안: 배경·받침·식물이 같은 칸 크기 — 위 arena 는 2배 층용 옛 판) ──
// 바닥 = 화분 그림(tools/pixel/big/pot3d.mjs)과 같은 26° 내려다본 평면 → 바닥 위 원은 세로 = 가로 × FLOOR_K. 정적인 부분은 한 번 그려 둔다.
export const FLOOR_K = 0.4384;
const arenaCache = new Map();
export function arena1(g, x0, y0, w, h, t) {
  const key = w + 'x' + h;
  let L = arenaCache.get(key);
  if (!L) { L = layer(w, h); drawArena1(L.g, w, h); arenaCache.set(key, L); }
  g.img(L.cv, x0, y0);
  stars(g, x0, y0, w, 50, t, 31, 0.005);
}
function drawArena1(g, w, h) {
  g.vgrad(0, 0, w, 92, ['#1f1828', C.ink, '#3a2a48']);
  for (const lx of [20, w - 26]) { g.rect(lx, 12, 6, 40, C.ink); g.rect(lx - 4, 8, 14, 6, C.slate); g.rect(lx - 2, 10, 10, 2, '#fbff86'); }
  const sy = 52;   // 관중석 넉 줄
  for (let row = 0; row < 4; row++) {
    const yy = sy + row * 10, R = rng(40 + row);
    g.rect(0, yy, w, 10, row % 2 ? '#3a2f45' : '#45293f'); g.rect(0, yy, w, 1, C.ink);
    for (let x = 2; x < w; x += 5) if (R() < 0.55) { g.rect(x, yy + 3, 2, 2, [C.slate, '#7f708a', '#a24b6f', '#4d65b4', '#0b8a8f'][Math.floor(R() * 5)]); g.rect(x, yy + 5, 2, 1, C.ink); }
  }
  const wy = 92;   // 경기장 벽
  g.rect(0, wy, w, 12, '#625565'); g.rect(0, wy, w, 1, '#9babb2'); g.rect(0, wy + 11, w, 1, C.ink);
  for (let x = 8; x < w; x += 24) g.rect(x, wy + 4, 12, 4, '#7f708a');
  const fy = wy + 12;   // 돌판 바닥: 원근 줄 + 가운데 큰 원(바닥 평면 타원)
  g.rect(0, fy, w, h - fy, '#4a3d58');
  for (let k = 0; k < 12; k++) { const yy = fy + Math.round(2 * (k * k * 1.15 + k * 2)); if (yy < h) g.rect(0, yy, w, 1, '#3e3546'); }
  const cx = w / 2;
  for (let i = -8; i <= 8; i++) g.line(Math.round(cx + i * 18), fy, Math.round(cx + i * 60), h, '#3e3546');
  const ry = Math.round(108 * FLOOR_K), cy = Math.round(fy + (h - fy) * 0.5);
  g.ellipseRing(Math.round(cx), cy, 108, ry, '#625565'); g.ellipseRing(Math.round(cx), cy, 107, ry - 1, '#625565');
}
// 받침 원판(1배): 화분 굽이 닿는 점 (cx, cy), 가로 반지름 rx — 세로는 바닥 각도대로
export function pad1(g, cx, cy, rx, glow) {
  const ry = Math.round(rx * FLOOR_K);
  g.ellipse(cx, cy + 2, rx + 1, ry + 1, C.ink);
  g.ellipse(cx, cy, rx, ry, '#625565');
  g.ellipse(cx, cy, rx - 2, ry - 2, '#7f708a');
  if (glow) g.ellipseRing(cx, cy, rx - 2, ry - 2, glow);
}

// 받침 원판(식물 서는 자리)
export function pad(g, cx, cy, rx, ry, glow) {
  g.ellipse(cx, cy + 2, rx + 1, ry + 1, C.ink);
  g.ellipse(cx, cy, rx, ry, '#625565');
  g.ellipse(cx, cy - 1, rx - 2, ry - 2, '#7f708a');
  if (glow) g.ellipseRing(cx, cy - 1, rx - 2, ry - 2, glow);
}

// ── 상점 / 양육 / 일반 창 바탕(1배) ──
export function plainBg(g, w, h, t, tone = 'night') {
  if (tone === 'nursery') {
    g.vgrad(0, 0, w, h, ['#16302d', '#1b3b35', '#20453b', '#1b3b35']);
    // 유리 온실 창살
    for (let x = -h; x < w; x += 26) g.line(x, 0, x + h * 0.6, h, '#22524a');
    for (let y = 30; y < h; y += 46) g.rect(0, y, w, 1, '#22524a');
    stars(g, 0, 0, w, 90, t, 51, 0.006);
    return;
  }
  if (tone === 'shop') {
    g.vgrad(0, 0, w, h, ['#2b2238', '#3a2a48', '#2e2a4a', '#2b2238']);
    for (let y = 0; y < h; y += 6) g.dither(0, y, w, 1, '#3e3546', 4);
    return;
  }
  g.vgrad(0, 0, w, h, ['#1f1828', C.ink, '#2b2238', '#2e2a4a']);
  stars(g, 0, 0, w, h, t, 61, 0.006);
}
// 상점 차양
export function awning(g, y, w) {
  const sw = 14;
  for (let x = 0; x < w; x += sw) {
    const col = (x / sw) % 2 ? C.mist : C.teal;
    g.rect(x, y, sw, 10, col);
    // 물결 끝
    for (let k = 0; k < sw; k++) { const d = Math.round(Math.sin((k / sw) * Math.PI) * 3); g.rect(x + k, y + 10, 1, d, col); }
  }
  g.rect(0, y + 10, w, 1, C.ink);
  g.rect(0, y, w, 1, C.ink);
  for (let x = 0; x < w; x += sw) for (let k = 0; k < sw; k++) { const d = Math.round(Math.sin((k / sw) * Math.PI) * 3); g.px(x + k, y + 10 + d, C.ink); }
}
