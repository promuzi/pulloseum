// 홈(대기 화면) — 넓은 원기둥 방(클로드가 직접 그림, 2026-10-15 사용자):
//  "공간감·투시, 그냥 사각형 방이 아닌 넓은 원기둥 느낌, 색은 회색이 아닌 흰색인데 그림자 때문에 어두운 느낌, 가운데 둥근 통창,
//   천장에서 주황 조명이 원뿔로, 화분은 다리 3개짜리 원목 의자로 심플하게, 최첨단은 숨기고 평범한 것과 섞기"
// 방법: 화면 칸마다 원기둥 안에서 시선을 쏴(1점 투시) 벽·바닥·천장 어디에 닿는지 정확히 계산 → 그 자리의 쿠션 타일 명암 + 빛.
//  흰 재질은 그림자를 차가운 푸른 쪽으로(검정 대신 남색), 빛은 따뜻하게(색상 이동 그림자). 근거 = docs/superpowers/specs/2026-10-15-v2-look-references.md
//  화분 자리(의자 윗면)의 바닥 각도를 화분 그림(26°, 세로 = 가로 × 0.4384)과 맞춤 — 화분이 의자 위에 자연스럽게 섬.
//   node tools/pixel/big/room_bg.mjs [--zoom=2] → assets/v2/bg/home_room.png (+ 미리보기 out/conv/home_room_x<배>.png)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const W = 270, H = 600;
// 시점: 초점 f, 눈높이 화면 줄 CY, 눈 높이 E, 카메라 깊이 CZ(원기둥 가운데 = 0, 뒤쪽 벽 가까이), 원기둥 반지름 RC·높이 HC
const F = 147, CX = 135, CY = 198, E = 4.18, CZ = -8, RC = 10, HC = 21;
const STOOL = { x: 0, z: -2, h: 1.55, r: 1.25 };          // 의자 윗면 가운데 = 화면 (135, 262) — 화분 굽이 닿는 점
const WIN = { y: 13.7, r: 5.0, glass: 4.3 };                // 통창(벽 가운데, 벽면 위 거리로)
const LAMP = { x: 0, y: 10.6, z: -2, cos: Math.cos(11 * Math.PI / 180) };   // 매단 등(의자 바로 위) — 아래로 반각 11° 원뿔(식물에 모이게)
const TILE = 1.4;
const WHITE = ['#0e1222', '#151b30', '#1e263f', '#28324f', '#343f60', '#424e70', '#536080', '#667391', '#7c88a3', '#949fb6', '#aeb7c9', '#c9d0db', '#e2e6ec', '#f6f6f4'];
const WARM = ['#22160f', '#331f14', '#47291a', '#5d3620', '#764628', '#8f5832', '#a96c3e', '#c2824c', '#d89a5e', '#e8b377', '#f2cc98', '#f9e2bf', '#fff2de', '#fffaf0'];
const GLASS = ['#05070e', '#090d18', '#0e1424', '#151d33', '#1f2a44', '#2d3a58'];
const WOOD = ['#2a1a10', '#3f2817', '#57381f', '#714a28', '#8c5e33', '#a8753f', '#c28e52', '#d8a868'];
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const th = (x, y) => (B4[y & 3][x & 3] + 0.5) / 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tone = (ramp, v, x, y) => { const i = Math.floor(v), f = v - i; return ramp[clamp(f > th(x, y) ? i + 1 : i, 0, ramp.length - 1)]; };
const proj = (X, Y, Z) => { const zz = Z - CZ; return [CX + F * X / zz, CY - F * (Y - E) / zz]; };

// ── 1. 칸마다 시선 → 닿은 면(벽·바닥·천장)과 그 면의 좌표 ──
const hit = new Array(W * H);
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
  const dx = (sx + 0.5 - CX) / F, dy = -(sy + 0.5 - CY) / F, a = dx * dx + 1, b = 2 * CZ, c = CZ * CZ - RC * RC;
  const t = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a), Y = E + t * dy;
  if (Y >= 0 && Y <= HC) { const X = t * dx, Z = CZ + t; hit[sy * W + sx] = { s: 'wall', t, X, Y, Z, u: RC * Math.atan2(X, Z), v: Y }; }
  else if (Y < 0) { const tf = -E / dy, X = tf * dx, Z = CZ + tf; hit[sy * W + sx] = { s: 'floor', t: tf, X, Y: 0, Z, u: X, v: Z }; }
  else { const tc = (HC - E) / dy, X = tc * dx, Z = CZ + tc; hit[sy * W + sx] = { s: 'ceil', t: tc, X, Y: HC, Z, u: X, v: Z }; }
}
// 타일 번호(같은 타일인지 = 이음새 찾기) — 벽은 곡면 위 길이·높이, 바닥·천장은 바닥 좌표
const tileId = h => `${h.s}:${Math.floor(h.u / TILE + 0.5)}:${Math.floor(h.v / TILE)}`;
const ids = hit.map(tileId);
const seam = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if ((x + 1 < W && ids[i + 1] !== ids[i]) || (y + 1 < H && ids[i + W] !== ids[i])) seam[i] = 1; }

// ── 2. 빛: 매단 등의 원뿔(반각 14°) 안 = 따뜻한 빛, 바깥 = 어둑한 차가운 빛 + 바닥 웅덩이가 벽 아래를 조금 데움 ──
function lampLight(X, Y, Z) {
  const vx = X - LAMP.x, vy = Y - LAMP.y, vz = Z - LAMP.z, d = Math.hypot(vx, vy, vz), cs = -vy / d;
  if (cs < LAMP.cos) return 0;
  const edge = clamp((cs - LAMP.cos) / (1 - LAMP.cos) * 3, 0, 1);   // 원뿔 가장자리 1/3 폭만 부드럽게(가운데는 온전히 밝게)
  return edge * 1.05 * Math.min(1.1, (LAMP.y / d) ** 2);   // 거리 제곱으로 줄되 바닥까지는 거의 그대로(높은 등 하나)
}
// 공기 중 빛기둥(화면 사다리꼴: 등 → 바닥 웅덩이) — 기둥보다 뒤에 있는 면에만
const lampS = proj(LAMP.x, LAMP.y, LAMP.z), poolR = (LAMP.y) * Math.tan(11 * Math.PI / 180), poolS = proj(LAMP.x, 0, LAMP.z);
const poolHalf = F * poolR / (LAMP.z - CZ);
function beam(sx, sy, t) {
  if (sy < lampS[1] + 4 || sy > poolS[1] || t < LAMP.z - CZ - 0.5) return 0;
  const k = (sy - lampS[1]) / (poolS[1] - lampS[1]), half = 5 + (poolHalf - 5) * k, e = Math.abs(sx + 0.5 - CX) / half;
  return e > 1 ? 0 : (0.26 - 0.1 * k) * (1 - e ** 4 * 0.7);   // 옅게 — 빛기둥 뒤 벽이 비쳐 보이게
}

// ── 3. 칠하기 ──
const im = new Img(W, H, WHITE[1]);
const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H && c) im.set(x, y, c); };
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
  const h = hit[sy * W + sx], i = sy * W + sx;
  // 쿠션 타일 안 위치(0~1) → 볼록 명암: 위(빛 오는 쪽)·가운데 밝고 둘레 어둡게
  const tu = ((h.u / TILE + 0.5) % 1 + 1) % 1, tv = ((h.v / TILE) % 1 + 1) % 1;
  const nx = tu * 2 - 1, ny = (h.s === 'wall' ? 1 - tv : tv) * 2 - 1;   // 벽은 위쪽이 v 큼
  let bulge = 0.6 - ny * 0.7 - nx * 0.2 - (nx * nx + ny * ny) * 0.45;   // 쿠션 윗머리는 거의 흰색, 아래·둘레는 그늘
  if (seam[i]) bulge -= 1.6;
  const L = lampLight(h.X, h.Y, h.Z), bm = beam(sx, sy, h.t);
  // 흰 재질: 바탕 밝기는 높게(흰색), 어둠은 그림자로만 — 방 가장자리(곡면이 시선과 비스듬)·바닥 닿는 곳·천장 쪽 깊은 그늘
  const side = Math.abs(sx + 0.5 - CX) / CX;
  let amb = 0.5 - side * side * 0.24;
  if (h.s === 'wall') amb -= Math.max(0, 1 - h.Y / 2.2) * 0.24 + Math.max(0, 1 - (HC - h.Y) / 6) * 0.28;
  if (h.s === 'floor') amb -= Math.max(0, (Math.hypot(h.X, h.Z) - RC + 2.4) / 2.4) * 0.26 + Math.max(0, (sy - 430) / 170) * 0.14;
  if (h.s === 'ceil') amb = 0.18;
  // 바닥 웅덩이 반사: 의자 둘레 바닥이 밝으면 가까운 벽 아래도 조금 따뜻하게
  const bounce = h.s === 'wall' ? Math.max(0, 1 - h.Y / 5) * Math.max(0, 1 - Math.hypot(h.X - LAMP.x, h.Z - LAMP.z) / 12) * 0.12 : 0;
  const N = WHITE.length - 1, baseV = amb * (1 + bulge * 0.62), direct = L + bounce;
  let col;
  if (direct > 0.06) col = tone(WARM, (baseV * 0.55 + direct * 0.6 * (0.85 + bulge * 0.3)) * N, sx, sy);   // 등불이 직접 닿음 = 주황빛 흰 타일
  else if (bm > th(sx, sy) * 0.22) col = tone(WARM, (baseV + bm * 0.5) * N, sx, sy);                     // 빛기둥 뒤 = 같은 밝기를 따뜻하게 물들임
  else col = tone(WHITE, baseV * N, sx, sy);                                                              // 그 밖 = 그늘 속 흰 타일(차가운 푸른 그림자)
  put(sx, sy, col);
}

// ── 4. 통창(벽 가운데): 두꺼운 흰 세라믹 테 + 안쪽 그늘 + 바깥 어둠·먼 별 + 유리 반사(사선 띠 + 등불의 주황 반사 하나) ──
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
  const h = hit[sy * W + sx]; if (h.s !== 'wall') continue;
  const du = h.u, dv = h.v - WIN.y, r = Math.hypot(du, dv);
  if (r > WIN.r + 0.05) continue;
  if (r > WIN.glass) {   // 테: 위·왼쪽 빛, 아래·오른쪽 그늘, 가운데 둥글게
    const t = (r - WIN.glass) / (WIN.r - WIN.glass), lit = (dv - du) / (r * 1.414);
    const v = (0.42 + lit * 0.22 + (0.5 - Math.abs(t - 0.5)) * 0.35 - (t > 0.86 || t < 0.12 ? 0.25 : 0)) * (WHITE.length - 1);
    put(sx, sy, tone(WHITE, v, sx, sy)); continue;
  }
  let g = 0.9 + (WIN.glass - dv) / (2 * WIN.glass) * 1.6;           // 아래로 갈수록 조금 밝은 어둠
  const band = du * 0.7 - dv * 0.7;
  if (band > -3.4 && band < -2.5) g += 1.5; if (band > -1.8 && band < -1.4) g += 1.0;
  if (r > WIN.glass - 0.35 && du - dv < -WIN.glass * 0.9) g += 1.4;
  put(sx, sy, tone(GLASS, g, sx, sy));
}
for (const [u, v] of [[-2.6, 2.1], [1.8, 2.8], [3.1, -0.6], [-1.2, -2.3], [0.6, 0.9], [-3.3, -0.4], [2.4, -2.6]]) { const [sx, sy] = proj(Math.sin(u / RC) * RC, WIN.y + v, Math.cos(u / RC) * RC); put(sx, sy, GLASS[5]); }
{ const [sx, sy] = proj(Math.sin(0.9 / RC) * RC, WIN.y - 1.9, Math.cos(0.9 / RC) * RC); for (let k = -3; k <= 3; k++) put(sx + k, sy + Math.round(k * 0.3), k === 0 ? WARM[11] : WARM[8]); }   // 등불이 유리에 비친 주황 반사

// ── 5. 다리 셋 원목 의자: 바닥 그림자 → 뒤 다리 둘 → 앞 다리 → 앉는 판(윗면 = 등불 빛, 앞 두께) ──
const [scx, scy] = proj(STOOL.x, STOOL.h, STOOL.z), rxS = F * STOOL.r / (STOOL.z - CZ), ryS = rxS * 0.4384;
{ const [fx0, fy0] = proj(STOOL.x, 0, STOOL.z); const rx = rxS * 1.15, ry = rx * 0.66; for (let y = Math.floor(fy0 - ry); y <= fy0 + ry; y++) for (let x = Math.floor(fx0 - rx); x <= fx0 + rx; x++) { const d = ((x + 0.5 - fx0) / rx) ** 2 + ((y + 0.5 - fy0) / ry) ** 2; if (d < 1 && th(x, y) < 0.85 - d * 0.5) put(x, y, d < 0.5 ? WARM[3] : WARM[4]); } }
function leg(a, front) {
  const top = [STOOL.x + Math.cos(a) * 0.82, STOOL.h - 0.1, STOOL.z + Math.sin(a) * 0.82], bot = [STOOL.x + Math.cos(a) * 1.28, 0, STOOL.z + Math.sin(a) * 1.28];
  const p0 = proj(...top), p1 = proj(...bot), n = Math.ceil(Math.abs(p1[1] - p0[1])) + 1;
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = p0[0] + (p1[0] - p0[0]) * k, y = p0[1] + (p1[1] - p0[1]) * k;
    for (let w = -2; w <= 1; w++) put(x + w, y, w === -2 ? WOOD[front ? 6 : 4] : w === 1 ? WOOD[front ? 2 : 1] : WOOD[front ? (k < 0.5 ? 4 : 5) : 3]);
  }
  put(p1[0] - 2, p1[1] + 1, WOOD[0]); put(p1[0] + 1, p1[1] + 1, WOOD[0]);   // 다리 끝 그늘
}
leg(-Math.PI / 2 + 0.55 + Math.PI, false); leg(-0.55 + Math.PI * 2, false);   // 뒤 다리 둘(멀리)
leg(-Math.PI / 2, true);                                                       // 앞 다리(가깝게 = 화면 아래)
for (let y = Math.floor(scy - ryS - 1); y <= scy + ryS + 4; y++) for (let x = Math.floor(scx - rxS - 1); x <= scx + rxS + 1; x++) {
  const dTop = ((x + 0.5 - scx) / rxS) ** 2 + ((y + 0.5 - scy) / ryS) ** 2, dEdge = ((x + 0.5 - scx) / rxS) ** 2 + ((y + 0.5 - scy - 3) / ryS) ** 2;
  if (dTop <= 1) {   // 윗면: 등불 바로 아래 — 따뜻하게 밝음, 둘레 테 + 나뭇결 두 줄
    const ring = dTop > 0.86, grain = Math.abs(((y + 0.5 - scy) / ryS) - 0.35 * ((x - scx) / rxS) ** 2) % 0.42 < 0.05;
    put(x, y, ring ? WOOD[5] : grain ? WOOD[6] : tone(WOOD, 7.2 - dTop * 1.4, x, y));
  } else if (dEdge <= 1 && y > scy) put(x, y, (x + 0.5 - scx) / rxS < -0.55 ? WOOD[4] : WOOD[3]);   // 앞 두께
}

// ── 6. 매단 등: 천장에서 내려온 줄 → 흰 세라믹 갓(둥근 지붕꼴) → 아래 주황 렌즈 ──
{ const [lx, ly] = lampS, [, cTop] = proj(LAMP.x, HC, LAMP.z);
  for (let y = Math.max(0, Math.floor(cTop)); y < ly - 6; y++) put(lx, y, WHITE[3]);
  for (let j = 0; j < 7; j++) { const w = Math.round(3 + j * 1.3); for (let i = -w; i <= w; i++) { const lit = i < -w * 0.3 ? 12 : i < w * 0.4 ? 10 : 7; put(lx + i, ly - 7 + j, j === 0 || Math.abs(i) === w ? WHITE[4] : WHITE[lit]); } }
  for (let i = -11; i <= 11; i++) put(lx + i, ly, Math.abs(i) < 8 ? WARM[12] : WARM[9]); put(lx, ly + 1, WARM[13]); }

mkdirSync(resolve(repo, 'assets', 'v2', 'bg'), { recursive: true });
writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'home_room.png'), im.png());
const z = +(process.argv.find(a => a.startsWith('--zoom=')) || '--zoom=2').slice(7);
const big = new Img(W * z, H * z); big.blit(im, 0, 0, z);
mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
writeFileSync(resolve(here, 'out', 'conv', 'home_room_x' + z + '.png'), big.png());
console.log('원기둥 방 홈 →', resolve(repo, 'assets', 'v2', 'bg', 'home_room.png'), '· 의자 윗면 가운데', [Math.round(scx), Math.round(scy)], '· 등', lampS.map(Math.round), '· 웅덩이 반폭', Math.round(poolHalf));
