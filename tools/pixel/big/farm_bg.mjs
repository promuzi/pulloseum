// 양육 = 스마트팜(클로드가 직접 그림, 2026-10-15 사용자): "스마트팜 느낌으로 자연광 효과의 디스플레이가 존재하며, 세라믹 느낌을 줘.
//  화분도 층층이 배치되어 있고, 화분이 아닌 잔디에 심긴 느낌으로. 그 식물이 선택되면 잔디가 동그랗게 올라오면서 아래의 화분과 함께 드러나는 느낌"
// 방법: 상자 방 1점 투시를 칸마다 시선으로 계산(가장 가까운 면) — 천장 = 자연광 패널(파란 하늘 + 먼 해, 인공 채광창 CoeLux 식),
//  벽·바닥 = 흰 세라믹 판(둥근 턱·은은한 광택), 계단식 재배대 셋(앞으로 갈수록 낮음) 윗면 = 잔디, 앞면 = 흰 세라믹 + 가는 숨은 빛줄(첨단은 절제).
//  식물 여섯 자리(재배대마다 둘)의 화면 좌표·잔디 원판 크기를 json으로 → 게임이 그 자리에 식물을 심음.
//   node tools/pixel/big/farm_bg.mjs [--zoom=2] → assets/v2/bg/nursery_farm.png + .json (+ 미리보기 out/conv/nursery_farm_x<배>.png)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const W = 270, H = 600;
const F = 320, CX = 135, CY = 150, E = 16, CZ = -24;               // 시점: 멀리서 확대(원근 완만 — 줄마다 같은 크기 식물 그림이 어울리게), 조금 내려다봄
const RW = 8.5, RH = 22, ZB = 8;                                    // 방: 가로 ±6.5, 높이 12, 뒤 벽 z = 8
const TW = 6.4;                                                     // 재배대 가로 반폭
const TIERS = [{ z0: 4.5, z1: 7.5, h: 11.3 }, { z0: 0.5, z1: 3.5, h: 6.7 }, { z0: -3.5, z1: -0.5, h: 3.6 }];   // 높은 계단 — 줄 사이를 넓혀 앞뒤 식물이 덜 겹치게   // 뒤 → 앞(층층이 — 뒤 줄이 높음)
const SLOT_X = [-3.0, 3.0];
const SKY = { x0: -6.6, x1: 6.6, z0: -20, z1: 7.4 };                // 천장 자연광 패널
const WHITE = ['#141a2a', '#1f2840', '#2c3854', '#3c4a68', '#4f5e7e', '#647492', '#7c8ba6', '#95a3ba', '#afbbcd', '#c8d1de', '#dde3ea', '#eef1f4', '#fbfbfa'];
const GRASS = ['#10261a', '#183a22', '#21502b', '#2c6834', '#3a823e', '#4c9a48', '#62b254', '#7ec864', '#a0dc7c', '#c4ec9c'];
const SKYC = ['#3e7cc8', '#4a8ad4', '#5a9ade', '#6eaae6', '#84baec', '#9ccaf2', '#b6daf6', '#d2e8fa', '#ecf6fe', '#fffbe8'];
const LED = '#7fe8ff';
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const th = (x, y) => (B4[y & 3][x & 3] + 0.5) / 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tone = (ramp, v, x, y) => { const i = Math.floor(v), f = v - i; return ramp[clamp(f > th(x, y) ? i + 1 : i, 0, ramp.length - 1)]; };
const proj = (X, Y, Z) => { const zz = Z - CZ; return [CX + F * X / zz, CY - F * (Y - E) / zz]; };
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h >>> 8) / 16777216; };

// ── 칸마다 시선 → 가장 가까운 면 ──
function cast(sx, sy) {
  const dx = (sx + 0.5 - CX) / F, dy = -(sy + 0.5 - CY) / F;
  let best = { t: Infinity };
  const consider = (t, o) => { if (t > 0.01 && t < best.t) best = { t, ...o }; };
  // 재배대(앞면 z = z0, 윗면 y = h, 옆면 x = ±TW)
  TIERS.forEach((T, i) => {
    let t = T.z0 - CZ, X = t * dx, Y = E + t * dy;
    if (Math.abs(X) <= TW && Y >= 0 && Y <= T.h) consider(t, { s: 'front', i, X, Y, Z: T.z0 });
    if (dy < 0) { t = (T.h - E) / dy; const X2 = t * dx, Z2 = CZ + t; if (Math.abs(X2) <= TW && Z2 >= T.z0 && Z2 <= T.z1) consider(t, { s: 'turf', i, X: X2, Y: T.h, Z: Z2 }); }
    for (const sgn of [-1, 1]) { if (dx === 0) continue; t = (sgn * TW) / dx; const Y3 = E + t * dy, Z3 = CZ + t; if (t > 0 && Y3 >= 0 && Y3 <= T.h && Z3 >= T.z0 && Z3 <= T.z1) consider(t, { s: 'tside', i, X: sgn * TW, Y: Y3, Z: Z3, sgn }); }
  });
  if (dy < 0) { const t = -E / dy; consider(t, { s: 'floor', X: t * dx, Y: 0, Z: CZ + t }); }
  if (dy > 0) { const t = (RH - E) / dy; consider(t, { s: 'ceil', X: t * dx, Y: RH, Z: CZ + t }); }
  { const t = ZB - CZ; consider(t, { s: 'back', X: t * dx, Y: E + t * dy, Z: ZB }); }
  for (const sgn of [-1, 1]) if (dx !== 0) { const t = (sgn * RW) / dx; if (t > 0) consider(t, { s: 'side', X: sgn * RW, Y: E + t * dy, Z: CZ + t, sgn }); }
  return best;
}
const im = new Img(W, H, WHITE[10]);
const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H && c) im.set(x, y, c); };
const hits = [];
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) hits.push(cast(sx, sy));
// 판 번호(이음새) — 면마다 큰 세라믹 판
const PANEL = { back: [1.6, 1.6], side: [1.6, 1.6], floor: [1.2, 1.2], ceil: [1.6, 1.6], front: [1.2, 9], tside: [9, 9] };
const pid = h => {
  if (!h.s || h.s === 'turf') return h.s + (h.i ?? '');
  const [a, b] = PANEL[h.s] || [9, 9];
  const u = h.s === 'side' || h.s === 'tside' ? h.Z : h.X, v = h.s === 'floor' || h.s === 'ceil' ? h.Z : h.Y;
  return `${h.s}${h.i ?? ''}:${Math.floor(u / a)}:${Math.floor(v / b)}`;
};
const ids = hits.map(pid);
const isSeam = (x, y) => { const i = y * W + x; return (x + 1 < W && ids[i + 1] !== ids[i] && hits[i + 1].s === hits[i].s) || (y + 1 < H && ids[i + W] !== ids[i] && hits[i + W].s === hits[i].s); };
// 하늘 패널 아래는 빛을 받음: 윗면(위를 봄) 가장 밝고, 앞을 보는 면 중간, 옆벽은 조금 어둡게. 구석(면 경계 가까이) 은은한 그늘.
const inSky = (X, Z) => X >= SKY.x0 && X <= SKY.x1 && Z >= SKY.z0 && Z <= SKY.z1;
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
  const h = hits[sy * W + sx], i = sy * W + sx;
  if (!h.s) continue;
  if (h.s === 'ceil' && inSky(h.X, h.Z)) {   // 자연광 패널: 먼 쪽(위쪽 화면)은 밝은 하늘, 가까울수록 짙은 파랑 + 먼 해(뒤쪽 한가운데) + 엷은 구름 띠
    const kz = (h.Z - SKY.z0) / (SKY.z1 - SKY.z0), sun = Math.hypot((h.X - 1.2) / 1.4, (h.Z - 6.1) / 1.1);
    let v = 2 + kz * 5 + (Math.sin(h.X * 1.7 + h.Z * 0.9) > 0.86 ? 1.2 : 0);
    if (sun < 1) v = 8 + (1 - sun) * 2;
    put(sx, sy, tone(SKYC, v, sx, sy));
    const edgeX = Math.min(h.X - SKY.x0, SKY.x1 - h.X), edgeZ = Math.min(h.Z - SKY.z0, SKY.z1 - h.Z);
    if (edgeX < 0.12 || edgeZ < 0.12) put(sx, sy, WHITE[11]);   // 패널 흰 테
    continue;
  }
  if (h.s === 'turf') {   // 잔디: 위에서 빛 → 밝은 초록, 풀잎 결(짧은 세로 획) + 앞쪽 가장자리 그늘
    const T = TIERS[h.i], edgeF = (h.Z - T.z0) / (T.z1 - T.z0), blade = hash(Math.floor(h.X * 22), Math.floor(h.Z * 9)) > 0.62;
    const v = 6.2 + (blade ? 1.2 : 0) - (edgeF < 0.08 ? 1.6 : 0) - (Math.abs(h.X) > TW - 0.15 ? 1.4 : 0) - (1 - edgeF) * 0.6;
    put(sx, sy, tone(GRASS, v, sx, sy)); continue;
  }
  let base = { back: 9.6, side: 8.6, floor: 10.2, ceil: 7.6, front: 9.4, tside: 8.4 }[h.s];
  // 구석 그늘: 바닥·벽 만나는 곳, 재배대 밑, 패널 이음새
  if (h.s === 'back' || h.s === 'side') base -= Math.max(0, 1 - h.Y / 1.2) * 2.0 + Math.max(0, 1 - (RH - h.Y) / 0.8) * 1.2;
  if (h.s === 'floor') { base -= Math.max(0, 1 - (RW - Math.abs(h.X)) / 1.0) * 1.8; for (const T of TIERS) if (h.Z > T.z0 - 0.7 && h.Z < T.z0 && Math.abs(h.X) < TW + 0.4) base -= (1 - (T.z0 - h.Z) / 0.7) * 2.6; }
  if (h.s === 'front') { const T = TIERS[h.i]; base -= Math.max(0, 1 - h.Y / 0.35) * 1.6; if (h.Y > T.h - 0.12) base += 1.6; }   // 위 둥근 턱 = 광택
  if (h.s === 'side') base -= Math.abs(h.Z - 2) * 0.05;
  if (h.s === 'ceil') base -= 1.0;
  // 판 하나 안: 위 가장자리 밝은 턱, 아래 가장자리 그늘(세라믹 판의 둥근 모서리)
  const [a, b] = PANEL[h.s] || [9, 9], u = h.s === 'side' || h.s === 'tside' ? h.Z : h.X, v = h.s === 'floor' || h.s === 'ceil' ? h.Z : h.Y;
  const fu = ((u / a) % 1 + 1) % 1, fv = ((v / b) % 1 + 1) % 1;
  if (h.s !== 'front' && h.s !== 'tside') base += (h.s === 'floor' ? (fv > 0.88 ? 0.6 : 0) : (fv > 0.86 ? 0.7 : fv < 0.08 ? -0.8 : 0)) - (fu < 0.04 || fu > 0.96 ? 0.5 : 0);
  if (isSeam(sx, sy)) base -= 2.2;
  put(sx, sy, tone(WHITE, base, sx, sy));
  // 재배대 앞면의 가는 숨은 빛줄(첨단은 절제 — 은은한 하늘색 한 줄)
  if (h.s === 'front' && Math.abs(h.Y - TIERS[h.i].h * 0.62) < 0.035 && Math.abs(h.X) < TW - 0.3) put(sx, sy, LED);
}
// 바닥 광택: 하늘 패널이 바닥에 흐리게 비침(바닥 칸 일부를 한 단 밝게·파랗게)
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) { const h = hits[sy * W + sx]; if (h.s === 'floor' && inSky(h.X * 0.9, ZB - (h.Z - CZ) * 0.2) && th(sx, sy) < 0.18) put(sx, sy, SKYC[7]); }

// ── 식물 여섯 자리: 재배대 윗면 가운데 줄, 화면 좌표 + 그 깊이의 잔디 원판 반지름(가로·세로) ──
const slots = [];
TIERS.forEach((T, i) => SLOT_X.forEach(x => {
  const z = (T.z0 + T.z1) / 2, [px, py] = proj(x, T.h, z), zz = z - CZ, rx = F * 0.62 / zz, ry = rx * (E - T.h) / zz;
  slots.push({ tier: i, x: Math.round(px), y: Math.round(py), rx: +rx.toFixed(1), ry: +ry.toFixed(1) });
}));
mkdirSync(resolve(repo, 'assets', 'v2', 'bg'), { recursive: true });
writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'nursery_farm.png'), im.png());
writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'nursery_farm.json'), JSON.stringify({ slots }));
const z = +(process.argv.find(a => a.startsWith('--zoom=')) || '--zoom=2').slice(7);
const big = new Img(W * z, H * z); big.blit(im, 0, 0, z);
for (const s of slots) for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; big.set(Math.round((s.x + Math.cos(t) * s.rx) * z), Math.round((s.y + Math.sin(t) * s.ry) * z), '#ff3a3a'); }   // 미리보기에만 자리 표시
mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
writeFileSync(resolve(here, 'out', 'conv', 'nursery_farm_x' + z + '.png'), big.png());
console.log('스마트팜 →', resolve(repo, 'assets', 'v2', 'bg', 'nursery_farm.png'), '· 자리', JSON.stringify(slots.map(s => [s.x, s.y])));
