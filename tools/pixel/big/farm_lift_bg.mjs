// 양육 = 스마트팜 2판(2026-10-15 사용자): "계단식으로 만들면 멀리 있는 게 안 보여 — 위아래 드래그하면 멀리 있는 게 앞으로 말려오는 느낌",
//  "세라믹 서랍은 한 화분당 개인용으로 붙어 있어 자유롭게 움직이는 느낌, 배열은 2열 혹은 3열".
// → 방(흰 세라믹 벽·자연광 천장 패널)은 그대로 굽고, 가운데에 '어두운 기계 계단(에스컬레이터처럼 움직이는 판)'이 지나갈 홈(구덩이)을 판다.
//   홈 양옆 = 흰 세라믹 난간(계단 따라 비스듬), 앞 = 흰 세라믹 턱(앞줄이 이 아래로 말려 들어감), 뒤 벽 = 계단이 나오는 어두운 틈.
//   계단·화분 상자·식물은 게임이 매 장면 같은 시점(json)으로 그린다 — 굽는 그림과 움직이는 그림이 같은 원근을 쓰게.
//   node tools/pixel/big/farm_lift_bg.mjs [--zoom=2] → assets/v2/bg/nursery_lift.png + .json (+ 미리보기 out/conv/nursery_lift_x<배>.png)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const W = 270, H = 600;
const F = 480, CX = 135, CY = 80, E = 16, CZ = -24;                // 시점: 멀리서 확대(1.5배 당김 — 2026-10-15 사용자 "식물이 너무 멀어 좀 땡겨와줘"), 조금 내려다봄
const RW = 8.5, RH = 22, ZB = 8;                                    // 방: 가로 ±8.5, 높이 22, 뒤 벽 z = 8
const TW = 6.4, Z0 = -2, Y0 = 3.6, DZ = 4, DY = 3.85, SL = DY / DZ;  // 계단 홈 반폭 · 앞 계단(u=0) 디딤판 가운데 z·높이 · 계단 간격
const RAIL = 1.0, RAILH = 1.6;                                      // 난간 폭 · 디딤판 위로 솟은 높이
const LIP = { z0: -5.4, z1: -4, h: 3.0 };                           // 앞 턱
const SLOT = { top: 17.4 };                                         // 뒤 벽 틈 위 끝
const WSKY = { x: 7.6, y0: 18.0, y1: 21.6 };                        // 뒤 벽 자연광 패널(틈 위)
const SKY = { x0: -6.6, x1: 6.6, z0: -20, z1: 7.4 };
const WHITE = ['#141a2a', '#1f2840', '#2c3854', '#3c4a68', '#4f5e7e', '#647492', '#7c8ba6', '#95a3ba', '#afbbcd', '#c8d1de', '#dde3ea', '#eef1f4', '#fbfbfa'];
const SKYC = ['#3e7cc8', '#4a8ad4', '#5a9ade', '#6eaae6', '#84baec', '#9ccaf2', '#b6daf6', '#d2e8fa', '#ecf6fe', '#fffbe8'];
const DARK = ['#07090e', '#0c1018', '#121722', '#181e2a', '#202734'];
const LED = '#7fe8ff';
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const th = (x, y) => (B4[y & 3][x & 3] + 0.5) / 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tone = (ramp, v, x, y) => { const i = Math.floor(v), f = v - i; return ramp[clamp(f > th(x, y) ? i + 1 : i, 0, ramp.length - 1)]; };
const inc = z => Y0 + (z - Z0) * SL;                                // 계단 홈 바닥(디딤판 높이)의 비탈

function cast(sx, sy) {
  const dx = (sx + 0.5 - CX) / F, dy = -(sy + 0.5 - CY) / F;
  let best = { t: Infinity };
  const consider = (t, o) => { if (t > 0.01 && t < best.t) best = { t, ...o }; };
  const at = t => ({ X: t * dx, Y: E + t * dy, Z: CZ + t });
  // 비탈 평면 y = c + SL·z : t = (c − E + SL·CZ) / (dy − SL)
  const slope = c => (c - E + SL * CZ) / (dy - SL);
  const cPit = Y0 - SL * Z0;
  { const t = slope(cPit), p = at(t); if (Math.abs(p.X) <= TW && p.Z >= LIP.z1 && p.Z <= ZB) consider(t, { s: 'pit', ...p }); }
  { const t = slope(cPit + RAILH), p = at(t); if (Math.abs(p.X) >= TW && Math.abs(p.X) <= TW + RAIL && p.Z >= LIP.z1 && p.Z <= ZB) consider(t, { s: 'rtop', ...p }); }
  for (const sg of [-1, 1]) { if (!dx) continue; const t = sg * TW / dx, p = at(t); if (t > 0 && p.Z >= LIP.z1 && p.Z <= ZB && p.Y <= inc(p.Z) + RAILH && p.Y >= inc(p.Z) - 6) consider(t, { s: 'rin', sg, ...p }); }
  // 앞 턱(윗면·앞면)
  if (dy < 0) { const t = (LIP.h - E) / dy, p = at(t); if (p.Z >= LIP.z0 && p.Z <= LIP.z1 && Math.abs(p.X) <= RW) consider(t, { s: 'ltop', ...p }); }
  { const t = LIP.z0 - CZ, p = at(t); if (p.Y >= 0 && p.Y <= LIP.h && Math.abs(p.X) <= RW) consider(t, { s: 'lfront', ...p }); }
  if (dy < 0) { const t = -E / dy; consider(t, { s: 'floor', ...at(t) }); }
  if (dy > 0) { const t = (RH - E) / dy; consider(t, { s: 'ceil', ...at(t) }); }
  { const t = ZB - CZ, p = at(t); const slot = Math.abs(p.X) <= TW && p.Y >= inc(ZB) - 1 && p.Y <= SLOT.top; consider(t, { s: slot ? 'slot' : 'back', ...p }); }
  for (const sg of [-1, 1]) if (dx !== 0) { const t = (sg * RW) / dx; if (t > 0) consider(t, { s: 'side', sg, ...at(t) }); }
  return best;
}
const im = new Img(W, H, WHITE[10]);
const put = (x, y, c) => { if (c) im.set(x, y, c); };
const hits = [];
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) hits.push(cast(sx, sy));
const PANEL = { back: [1.6, 1.6], side: [1.6, 1.6], floor: [1.2, 1.2], ceil: [1.6, 1.6], lfront: [2.4, 9], ltop: [2.4, 9], rtop: [9, 2.2], rin: [9, 2.2] };
const pid = h => { if (!PANEL[h.s]) return h.s; const [a, b] = PANEL[h.s]; const u = h.s === 'side' || h.s === 'rin' || h.s === 'rtop' ? h.Z : h.X, v = h.s === 'floor' || h.s === 'ceil' || h.s === 'ltop' ? h.Z : h.Y; return `${h.s}:${Math.floor(u / a)}:${Math.floor(v / b)}`; };
const ids = hits.map(pid);
const isSeam = (x, y) => { const i = y * W + x; return (x + 1 < W && ids[i + 1] !== ids[i] && hits[i + 1].s === hits[i].s) || (y + 1 < H && ids[i + W] !== ids[i] && hits[i + W].s === hits[i].s); };
const inSky = (X, Z) => X >= SKY.x0 && X <= SKY.x1 && Z >= SKY.z0 && Z <= SKY.z1;
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
  const h = hits[sy * W + sx]; if (!h.s) continue;
  if (h.s === 'ceil' && inSky(h.X, h.Z)) {   // 자연광 패널(옛 판과 같음)
    const kz = (h.Z - SKY.z0) / (SKY.z1 - SKY.z0), sun = Math.hypot((h.X - 1.2) / 1.4, (h.Z - 6.1) / 1.1);
    let v = 2 + kz * 5 + (Math.sin(h.X * 1.7 + h.Z * 0.9) > 0.86 ? 1.2 : 0);
    if (sun < 1) v = 8 + (1 - sun) * 2;
    put(sx, sy, tone(SKYC, v, sx, sy));
    if (Math.min(h.X - SKY.x0, SKY.x1 - h.X) < 0.12 || Math.min(h.Z - SKY.z0, SKY.z1 - h.Z) < 0.12) put(sx, sy, WHITE[11]);
    continue;
  }
  if (h.s === 'back' && Math.abs(h.X) <= WSKY.x && h.Y >= WSKY.y0 && h.Y <= WSKY.y1) {   // 뒤 벽 자연광 패널(당긴 시점에선 천장이 안 보여 벽으로 옮김): 위 밝은 하늘 → 아래 짙은 파랑 + 먼 해 + 엷은 구름 띠
    const ky = (h.Y - WSKY.y0) / (WSKY.y1 - WSKY.y0), sun = Math.hypot((h.X - 2.2) / 1.0, (h.Y - (WSKY.y0 + WSKY.y1) / 2 - 0.9) / 0.55);
    let v = 2.5 + ky * 5 + (Math.sin(h.X * 2.1 + h.Y * 1.3) > 0.9 ? 1.1 : 0);
    if (sun < 1) v = 8 + (1 - sun) * 2;
    put(sx, sy, tone(SKYC, v, sx, sy));
    if (Math.min(Math.abs(h.X) - WSKY.x, 0) > -0.1 || h.Y - WSKY.y0 < 0.1 || WSKY.y1 - h.Y < 0.1) put(sx, sy, WHITE[11]);
    continue;
  }
  if (h.s === 'pit') { put(sx, sy, tone(DARK, 2.2 - (h.Z - Z0) * 0.08, sx, sy)); continue; }   // 계단이 덮을 홈 바닥(어두운 기계)
  if (h.s === 'slot') { put(sx, sy, tone(DARK, 0.6 + Math.max(0, h.Y - inc(ZB)) * 0.12, sx, sy)); continue; }   // 뒤 벽 틈 속 어둠
  let base = { back: 9.6, side: 8.6, floor: 10.2, ceil: 7.6, lfront: 9.2, ltop: 10.6, rtop: 10.2, rin: 7.4 }[h.s];
  if (h.s === 'back' || h.s === 'side') base -= Math.max(0, 1 - h.Y / 1.2) * 2.0 + Math.max(0, 1 - (RH - h.Y) / 0.8) * 1.2;
  if (h.s === 'back' && Math.abs(h.X) <= TW + 0.5 && h.Y > SLOT.top && h.Y < SLOT.top + 0.5) base += 1.4;   // 틈 위 둥근 턱 광택
  if (h.s === 'back' && Math.abs(h.X) <= TW + 0.5 && h.Y > SLOT.top - 0.01 && h.Y < SLOT.top + 0.12) base -= 3;   // 틈 위 가장자리 그늘
  if (h.s === 'floor') base -= Math.max(0, 1 - (RW - Math.abs(h.X)) / 1.0) * 1.8 + Math.max(0, 1 - (LIP.z0 - h.Z) / 0.8) * 2.2;
  if (h.s === 'lfront') { base -= Math.max(0, 1 - h.Y / 0.35) * 1.6; if (h.Y > LIP.h - 0.14) base += 1.4; }
  if (h.s === 'ltop' && h.Z > LIP.z1 - 0.18) base -= 2.6;   // 턱 뒤 가장자리(계단 쪽) 그늘
  if (h.s === 'rin') base -= Math.max(0, 1 - (inc(h.Z) + RAILH - h.Y) / 0.25) * -1.2 + Math.max(0, (inc(h.Z) - h.Y)) * 0.9;   // 난간 안쪽: 위 턱 밝게, 디딤판 아래로 갈수록 어둡게
  if (h.s === 'rtop') base -= (Math.abs(h.X) - TW) < 0.12 ? -0.8 : 0;
  if (h.s === 'ceil') base -= 1.0;
  const [a, b] = PANEL[h.s] || [9, 9], u = h.s === 'side' || h.s === 'rin' || h.s === 'rtop' ? h.Z : h.X, v = h.s === 'floor' || h.s === 'ceil' || h.s === 'ltop' ? h.Z : h.Y;
  const fv = ((v / b) % 1 + 1) % 1, fu = ((u / a) % 1 + 1) % 1;
  if (h.s === 'back' || h.s === 'side' || h.s === 'floor' || h.s === 'ceil') base += (h.s === 'floor' ? (fv > 0.88 ? 0.6 : 0) : (fv > 0.86 ? 0.7 : fv < 0.08 ? -0.8 : 0)) - (fu < 0.04 || fu > 0.96 ? 0.5 : 0);
  if (isSeam(sx, sy)) base -= 2.2;
  put(sx, sy, tone(WHITE, base, sx, sy));
  if (h.s === 'lfront' && Math.abs(h.Y - LIP.h * 0.7) < 0.04 && Math.abs(h.X) < TW) put(sx, sy, LED);   // 앞 턱의 가는 숨은 빛줄
  if (h.s === 'rtop' && Math.abs(Math.abs(h.X) - TW - RAIL * 0.5) < 0.05) put(sx, sy, '#5ad0f0');   // 난간 위 가는 빛줄(계단 방향)
}
// 바닥 광택(하늘 패널이 흐리게 비침)
for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) { const h = hits[sy * W + sx]; if (h.s === 'floor' && inSky(h.X * 0.9, ZB - (h.Z - CZ) * 0.2) && th(sx, sy) < 0.18) put(sx, sy, SKYC[7]); }

const proj = (X, Y, Z) => { const zz = Z - CZ; return [CX + F * X / zz, CY - F * (Y - E) / zz]; };
const clipTop = Math.ceil(proj(0, SLOT.top, ZB)[1]), clipBottom = Math.floor(proj(0, LIP.h, LIP.z1)[1]);
const meta = { cam: { F, CX, CY, E, CZ }, step: { z0: Z0, y0: Y0, dz: DZ, dy: DY, tw: TW }, clip: { top: clipTop, bottom: clipBottom } };
mkdirSync(resolve(repo, 'assets', 'v2', 'bg'), { recursive: true });
writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'nursery_lift.png'), im.png());
writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'nursery_lift.json'), JSON.stringify(meta));
const z = +(process.argv.find(a => a.startsWith('--zoom=')) || '--zoom=2').slice(7);
const big = new Img(W * z, H * z); big.blit(im, 0, 0, z);
mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
writeFileSync(resolve(here, 'out', 'conv', 'nursery_lift_x' + z + '.png'), big.png());
console.log('스마트팜 2판 →', resolve(repo, 'assets', 'v2', 'bg', 'nursery_lift.png'), JSON.stringify(meta));
