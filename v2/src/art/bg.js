// 배경(전부 코드로 직접 그린 도트). 같은 씨앗값이면 같은 그림 — 별 위치가 매번 바뀌지 않는다.
import { C, RAMP } from './palette.js';
import { layer } from '../core/gfx.js';
import { T } from './theme.js';
import { BGIMG } from './sprites.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 별: 1칸 점 + 가끔 십자 반짝이(시간에 따라 깜빡)
//  발열(2026-10-17 사용자 "게임 발열이 심하다는데"): 장마다 점 수천 개를 찍던 것을 같은 크기 · 씨앗 · 밀도의 별판으로 — 0.1초마다 한 번만 다시 그림(반짝임은 3.8초 주기라 차이 없음)
const starCache = new Map();
export function stars(g, x, y, w, h, t, seed = 7, density = 0.012) {
  if (typeof document === 'undefined' || !Number.isInteger(x) || !Number.isInteger(y)) return starsRaw(g, x, y, w, h, t, seed, density);
  const key = w + ',' + h + ',' + seed + ',' + density, tq = Math.floor(t / 100);
  let L = starCache.get(key);
  if (!L) { if (starCache.size > 24) starCache.clear(); L = layer(w + 2, h + 2); L.tq = null; starCache.set(key, L); }
  if (L.tq !== tq) { L.g.c.clearRect(0, 0, w + 2, h + 2); starsRaw(L.g, 1, 1, w, h, tq * 100, seed, density); L.tq = tq; }
  g.c.drawImage(L.cv, x - 1, y - 1);
}
function starsRaw(g, x, y, w, h, t, seed, density) {
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
//  발열(2026-10-17): 칸마다 명암을 장마다 다시 셈하던 것을 크기 · 색 · 테 · 경계 점무늬 짝홀마다 한 번 그린 판으로(띠 무늬 행성은 세로 자리를 타서 그대로 그림)
const planetCache = new Map();
export function planet(g, cx, cy, r, ramp, opt = {}) {
  if (opt.bands || typeof document === 'undefined' || !Number.isInteger(cx) || !Number.isInteger(cy)) return planetRaw(g, cx, cy, r, ramp, opt);
  const hw = opt.ring ? Math.ceil(r * 1.8) + 1 : r + 1, hh = r + 1, par = (cx + cy) & 1;
  const key = r + ',' + ramp + ',' + (opt.ring ? 1 : 0) + ',' + (opt.ringCol || '') + ',' + par;
  let L = planetCache.get(key);
  if (!L) {
    if (planetCache.size > 64) planetCache.clear();
    const e = ((hw + hh) & 1) === par ? 0 : 1;   // 판 속 가운데의 짝홀 = 화면 자리의 짝홀(경계 디더 무늬가 같게)
    L = layer(hw * 2 + 2, hh * 2 + 1); L.ox = hw + e; L.oy = hh;
    planetRaw(L.g, L.ox, L.oy, r, ramp, opt);
    planetCache.set(key, L);
  }
  g.c.drawImage(L.cv, cx - L.ox, cy - L.oy);
}
function planetRaw(g, cx, cy, r, ramp, opt) {
  const P = RAMP[ramp] || RAMP.water;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d2 = dx * dx + dy * dy; if (d2 > r * r) continue;
    const nx = dx / r, ny = dy / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let L = (-0.55 * nx - 0.6 * ny + 0.58 * nz); // 빛 방향
    L = L * 0.5 + 0.5; // 0~1
    // 띠 무늬(가스 행성) — opt.k = 띠 촘촘함 배율(1배 무대에서 큰 행성은 0.5)
    if (opt.bands) L += Math.sin(((dy + cy) * 0.9 + dx * 0.15) * (opt.k || 1)) * 0.06;
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
//  발열(2026-10-17): 띠 + 성운(움직이지 않음 — 성운 점무늬는 화면 자리를 타므로 그 자리 그대로)은 한 번 그린 판, 별은 별판(stars)
const spaceCache = new Map();
export function space(g, x, y, w, h, t, seed = 11, density = 0.014) {
  if (typeof document !== 'undefined' && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x + w <= 2000 && y + h <= 2000) {
    const key = x + ',' + y + ',' + w + ',' + h + ',' + seed;
    let L = spaceCache.get(key);
    if (!L) { if (spaceCache.size > 12) spaceCache.clear(); L = layer(x + w + 2, y + h + 2); spaceBase(L.g, x, y, w, h, seed); spaceCache.set(key, L); }
    g.c.drawImage(L.cv, 0, 0);
    if (density) stars(g, x, y, w, h, t, seed, density);
    return;
  }
  spaceBase(g, x, y, w, h, seed);
  if (density) stars(g, x, y, w, h, t, seed, density);
}
function spaceBase(g, x, y, w, h, seed) {
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
}
// 타이틀 우주 바탕(1배): 성운·별·행성을 한 번 그려 둔다(큰 행성은 칸마다 명암이라 매 장 그리면 무거움)
const titleCache = new Map();
export function titleBg1(g, w, h) {
  const key = w + 'x' + h;
  let L = titleCache.get(key);
  if (!L) {
    L = layer(w, h);
    space(L.g, 0, 0, w, h, 0, 11, 0.004);
    planet(L.g, 12, h - 44, 92, 'water', { bands: true, k: 0.5 });
    planet(L.g, w - 44, 108, 18, 'earth', { ring: true, ringCol: '#ab947a' });
    planet(L.g, 56, 60, 6, 'wind');
    titleCache.set(key, L);
  }
  g.img(L.cv, 0, 0);
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
// ── 온실 함교(홈 무대) 1배 — 위 room(2배 층용)을 1배 칸으로 다시 그림. w·h = 1배 크기 ──
export function room1(g, x0, y0, w, h, t) {
  g.clip(x0, y0, w, h, () => {
    const X = x => x0 + x, Y = y => y0 + y;
    g.rect(X(0), Y(0), w, h, '#2b2238');
    const PW = 44;   // 뒷벽 금속판(세로 이음새·리벳)
    for (let px = -8; px < w; px += PW) {
      g.rect(X(px), Y(0), PW - 2, h, C.shade);
      g.rect(X(px), Y(0), 1, h, '#4a3d58');
      g.rect(X(px + PW - 3), Y(0), 1, h, '#2b2238');
      for (let ry = 28; ry < h; ry += 40) { g.rect(X(px + 6), Y(ry), 2, 2, C.slate); g.rect(X(px + PW - 9), Y(ry), 2, 2, C.slate); }
    }
    g.rect(X(0), Y(0), w, 12, C.ink); g.rect(X(0), Y(2), w, 8, '#3a2f45'); g.rect(X(0), Y(2), w, 1, '#4a3d58');   // 위 들보
    for (let x = 8; x < w; x += 20) g.rect(X(x), Y(6), 2, 2, C.slate);
    // 둥근 관측창
    const cx = Math.floor(w / 2), cy = 84, r = 64;
    g.disc(X(cx), Y(cy), r + 6, C.ink); g.disc(X(cx), Y(cy), r + 4, '#7f708a'); g.disc(X(cx), Y(cy), r + 2, '#4a3d58'); g.disc(X(cx), Y(cy), r, C.ink);
    for (let dy = -r + 2; dy <= r - 2; dy++) { const hw = Math.floor(Math.sqrt((r - 2) ** 2 - dy * dy)); g.rect(X(cx - hw), Y(cy + dy), hw * 2 + 1, 1, dy < -20 ? '#1f1828' : dy < 20 ? '#2a1f33' : '#352845'); }
    const R = rng(21);
    for (let i = 0; i < 150; i++) { const a = R() * 6.28, d = R() * (r - 4), tw = Math.sin(t / 500 + i); g.px(X(Math.round(cx + Math.cos(a) * d)), Y(Math.round(cy + Math.sin(a) * d)), tw > 0.6 ? C.white : tw > -0.3 ? C.mute : C.slate); }
    for (let i = -36; i <= 36; i++) { const yy = Math.round(cy + 16 + i * 0.45 + Math.sin(i / 6) * 4); if ((i + 80) % 5) g.rect(X(cx + i), Y(yy), 1, 2, '#45293f'); }   // 성운 줄기
    planet(g, X(cx - 28), Y(cy - 26), 16, 'ice');
    planet(g, X(cx + 34), Y(cy - 38), 6, 'earth');
    g.rect(X(cx - r + 2), Y(cy), (r - 2) * 2, 1, '#4a3d58'); g.rect(X(cx), Y(cy - r + 2), 1, (r - 2) * 2, '#4a3d58');   // 창살
    for (let k = 0; k < 12; k++) g.px(X(cx - 40 + k), Y(cy - 40 + k), '#625565');   // 반사광
    for (let a = 0; a < 8; a++) { const rad = a * Math.PI / 4; g.rect(X(Math.round(cx + Math.cos(rad) * (r + 4))) - 1, Y(Math.round(cy + Math.sin(rad) * (r + 4))) - 1, 2, 2, C.mist); }
    // 왼쪽 선반 + 작은 화분 둘, 오른쪽 계기판
    const shY = 140;
    g.rect(X(8), Y(shY), 48, 3, C.ink); g.rect(X(8), Y(shY), 48, 1, '#966c6c');
    for (const [sx, sy, leaf] of [[16, shY - 12, C.green], [36, shY - 14, '#a884f3']]) {
      g.rect(X(sx), Y(sy + 6), 14, 8, C.ink); g.rect(X(sx + 1), Y(sy + 6), 12, 7, '#cd683d'); g.rect(X(sx + 1), Y(sy + 6), 12, 2, '#e6904e');
      for (const [lx, ly] of [[6, 4], [4, 2], [8, 0], [10, 2], [5, 3], [9, 1]]) g.rect(X(sx + lx), Y(sy + ly), 2, 2, leaf);
    }
    const mx = w - 52, my = 120;
    g.rect(X(mx), Y(my), 40, 28, C.ink); g.rect(X(mx + 2), Y(my + 2), 36, 24, '#1b3b35');
    for (let i = 0; i < 32; i++) g.px(X(mx + 4 + i), Y(my + 14 + Math.round(Math.sin(i * 0.45 + t / 300) * 6)), '#30e1b9');
    g.rect(X(mx + 33), Y(my + 4), 2, 2, Math.floor(t / 400) % 2 ? C.red : '#6e2727');
    // 바닥(원근 줄) + 받침대 뒤 바닥 빛
    const fy = h - 68;
    g.rect(X(0), Y(fy), w, h - fy, '#3a2f45'); g.rect(X(0), Y(fy), w, 1, '#7f708a'); g.rect(X(0), Y(fy + 1), w, 1, C.ink);
    for (let k = 0; k < 4; k++) { const yy = fy + 10 + k * 14 + 2 * k * k; if (yy < h) g.rect(X(0), Y(yy), w, 1, '#2b2238'); }
    for (let i = -6; i <= 6; i++) g.line(X(cx + i * 12), Y(fy + 4), X(cx + i * 44), Y(h), '#2b2238');
    g.ellipse(X(cx), Y(fy + 36), 60, Math.round(60 * FLOOR_K * 0.6), '#45293f');
    // 천장 성장등
    g.rect(X(cx - 26), Y(12), 52, 6, C.ink); g.rect(X(cx - 24), Y(12), 48, 4, '#7f708a'); g.rect(X(cx - 18), Y(16), 36, 2, '#fbff86');
    // 양 모서리 늘어진 덩굴
    for (const [vx, len, ph] of [[12, 124, 0], [w - 14, 96, 2]]) {
      const sway = Math.round(Math.sin(t / 900 + ph)) * 2;
      for (let y = 0; y < len; y++) {
        const xx = vx + Math.round(Math.sin((y / 2 + ph * 7) / 6) * 3) + (y > len / 2 ? sway : 0);
        g.rect(X(xx), Y(y), 2, 1, '#239063');
        if (y % 10 === 0) { const d = (y / 10) % 2 ? 1 : -1; g.rect(X(xx + d * 3), Y(y - 2), 4, 4, '#1ebc73'); g.rect(X(xx + d * 5), Y(y - 2), 2, 2, '#91db69'); }
      }
    }
  });
}
// 둥근 나무 탁자(홈 무대 화분 받침, 1배): 윗면 = 바닥 각도의 타원, 앞 테 두께 + 다리 셋 + 그림자. (cx, cy) = 윗면 가운데(화분 굽이 닿는 점)
export function stand1(g, cx, cy, rx = 46) {
  const ry = Math.round(rx * FLOOR_K);
  g.dither(cx - rx - 4, cy + ry + 28, rx * 2 + 8, 4, C.ink, 10);   // 바닥 그림자
  for (const lx of [cx - Math.round(rx * 0.62), cx + Math.round(rx * 0.62) - 4, cx - 2]) { g.rect(lx, cy + 4, 5, ry + 24 - (lx === cx - 2 ? 4 : 0), C.ink); g.rect(lx + 1, cy + 4, 2, ry + 23 - (lx === cx - 2 ? 4 : 0), '#966c6c'); }   // 다리
  g.ellipse(cx, cy + 5, rx, ry, C.ink);          // 앞 테 두께(아래)
  g.ellipse(cx, cy + 4, rx - 1, ry, '#694f62');
  g.ellipse(cx, cy, rx, ry, C.ink);              // 윗면
  g.ellipse(cx, cy, rx - 1, ry - 1, '#ab947a');
  g.ellipse(cx - 3, cy - 1, rx - 8, ry - 4, '#c7b8a0');
  for (let i = -2; i <= 2; i++) g.rect(cx - rx + 10 + (i + 2) * Math.round((rx * 2 - 20) / 5), cy - 1 + (i % 2), 6, 1, '#ab947a');   // 나뭇결
}
// 떠 있는 소행성 받침(타이틀, 1배): (cx, cy) = 윗면 가운데
export function asteroid1(g, cx, cy) {
  const R = rng(5);
  g.ellipse(cx, cy + 6, 60, 14, C.ink); g.ellipse(cx, cy + 4, 58, 12, '#625565'); g.ellipse(cx, cy, 56, Math.round(56 * FLOOR_K * 0.45), '#7f708a');
  g.ellipse(cx - 6, cy - 2, 44, 6, '#9babb2');
  for (let i = 0; i < 18; i++) g.rect(cx - 44 + Math.floor(R() * 88), cy + 3 + Math.floor(R() * 6), 2, 1, '#625565');
  for (let k = 0; k < 4; k++) { const w = 44 - k * 10, y = cy + 14 + k * 6, x = cx - w / 2 + (k % 2) * 2; g.rect(x, y, w, 6, k % 2 ? '#3e3546' : '#45293f'); g.rect(x, y, 1, 6, C.ink); g.rect(x + w - 1, y, 1, 6, C.ink); }   // 아래 바위 뿌리
  g.rect(cx - 4, cy + 38, 8, 3, C.ink);
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
// 장소 테마(theme.js)를 따른다: 장소 그림이 있으면 그림(assets/v2/bg/<이름>.png, 코덱스 → bgconv), 없으면 테마 색 + 은은한 결
//   우주선 = 선체 판 이음새·리벳 · 온실 = 유리 창살 · 밤 정원 = 별
export function plainBg(g, w, h, t, name) {
  const im = name && BGIMG[name];
  if (im) { g.img(im, 0, 0); return; }
  g.vgrad(0, 0, w, h, [T.bg2, T.bg, T.bg, T.bg2]);
  if (T.key === 'garden') {
    for (let x = -h; x < w; x += 26) g.line(x, 0, x + h * 0.6, h, T.bgLine);
    for (let y = 30; y < h; y += 46) g.rect(0, y, w, 1, T.bgLine);
  } else if (T.key === 'ship') {
    for (let y = 44; y < h; y += 48) g.rect(0, y, w, 1, T.bgLine);
    for (let y = 20; y < h; y += 48) for (let x = 27; x < w; x += 54) { g.rect(x, y - 20, 1, 47, T.bgLine); g.px(x + 4, y - 16, T.bgLine); g.px(x - 4, y + 22, T.bgLine); }
  } else stars(g, 0, 0, w, h, t, 61, 0.008);
}
// 상점 차양
export function awning(g, y, w) {
  const sw = 14;
  for (let x = 0; x < w; x += sw) {
    const col = (x / sw) % 2 ? T.panel.frame : T.btn.primary.fill;
    g.rect(x, y, sw, 10, col);
    // 물결 끝
    for (let k = 0; k < sw; k++) { const d = Math.round(Math.sin((k / sw) * Math.PI) * 3); g.rect(x + k, y + 10, 1, d, col); }
  }
  g.rect(0, y + 10, w, 1, C.ink);
  g.rect(0, y, w, 1, C.ink);
  for (let x = 0; x < w; x += sw) for (let k = 0; k < sw; k++) { const d = Math.round(Math.sin((k / sw) * Math.PI) * 3); g.px(x + k, y + 10 + d, C.ink); }
}
