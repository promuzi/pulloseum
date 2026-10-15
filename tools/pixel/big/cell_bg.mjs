// 흰 쿠션 타일 독방 경기장(클로드가 직접 그림 — 2026-10-15 사용자):
//  "미래 느낌·화려함보다는 심플함. 세련된 느낌보다는 투박함. 흰 볼록한 타일이 가득한 독방 느낌이며, 약간 어두운 느낌에
//   중앙에는 원 형태의 통창으로 유리가 보임. 그리고 천장에는 주황 조명이 원뿔 형태로 내려와 있음."
// 뒤 벽·바닥 = 볼록한 흰 타일(가운데 밝고 가장자리 어두운 쿠션), 방은 어둑하게, 벽 가운데 둥근 통창(두꺼운 테 + 바깥 어둠 + 유리 반사),
// 천장 등 둘 → 주황 원뿔 빛이 두 받침 위로(바닥엔 빛 웅덩이). 관중·소품·반짝임 없음. 색 = 어둑한 흰 타일 회색 단 + 주황 빛 단 + 짙은 유리.
// 바닥은 화분과 같은 26° 내려다본 평면(바닥 칸 세로 = 가로 × 0.4384), 받침 (76,302)·(194,142)은 게임이 그림.
//   node tools/pixel/big/cell_bg.mjs [--zoom=2] → assets/v2/bg/arena_cell.png (+ 미리보기 out/conv/arena_cell_x<배>.png)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const W = 270, H = 348, K = 0.4384, FLOOR = 116;
// 단(어두움 → 밝음): 차가운 = 어둑한 흰 타일, 따뜻한 = 주황 빛 받은 타일
const COOL = ['#1b1b20', '#26262c', '#33333a', '#43434b', '#56565f', '#6c6c75', '#85858d', '#a0a0a7', '#bdbdc2', '#d6d6da'];
const WARM = ['#2a1d17', '#3d2a1f', '#553826', '#704a2f', '#8e5f3a', '#ad7848', '#c9925c', '#e0ae78', '#f2cc9c', '#fbe4c4'];
const GLASS = ['#080b12', '#0d121c', '#131a27', '#1c2636', '#2a3648', '#3e4c62'];
const LAMP = { body: '#2a2a30', rim: '#4a4a52', lens: '#ffb060', hot: '#ffe0a8' };
const im = new Img(W, H, COOL[1]);
const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H && c) im.set(x, y, c); };
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const th = (x, y) => (B4[y & 3][x & 3] + 0.5) / 16;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 밝기 v(실수 단) → 디더로 단 고르기
const tone = (ramp, v, x, y) => { const i = Math.floor(v), f = v - i; return ramp[clamp(f > th(x, y) ? i + 1 : i, 0, ramp.length - 1)]; };

// 등 둘(두 받침 바로 위 천장): 빛 웅덩이 = 받침 둘레 바닥 타원, 원뿔 = 등 → 웅덩이 양끝
const LAMPS = [{ x: 76, pool: [76, 302], rx: 58 }, { x: 194, pool: [194, 142], rx: 50 }];
// 빛: ① 원뿔(등 → 웅덩이 양끝 사이 세모) 안의 타일은 따뜻하게 한 단 밝게(공기 중 빛기둥처럼) ② 바닥 웅덩이(받침 둘레 타원)는 크게 밝게
const TOP = 8;
function lightAt(x, y, floor) {
  let L = 0, warm = 0;
  for (const l of LAMPS) {
    const py = l.pool[1];
    if (y >= TOP && y <= py) {
      const t = (y - TOP) / (py - TOP), half = 6 + (l.rx - 12) * t, e = Math.abs(x - l.x) / half;
      if (e <= 1) { const s = (0.95 - 0.35 * t) * (1 - e ** 4 * 0.6); L += s * (floor ? 1.3 : 1.7); warm = Math.max(warm, s); }
    }
    if (floor) { const d = Math.hypot((x - l.pool[0]) / l.rx, (y - l.pool[1]) / (l.rx * K)); const c = clamp(1.1 - d, 0, 1); L += c * 3.2; warm = Math.max(warm, c); }
  }
  return { L, warm };
}
const vign = x => Math.max(0, Math.abs(x - 135) / 135 - 0.58) * 2.4;   // 양옆 어둡게(방 가운데로 눈이 가게)

// ── 타일 한 칸의 볼록 명암: (u, v) = 칸 안 위치 0~1, 위·왼쪽이 밝고(위에서 오는 빛) 가장자리는 이음새로 어둡게 ──
function bulge(u, v, wPx, hPx) {
  const nx = u * 2 - 1, ny = v * 2 - 1;
  const edge = Math.min(u * wPx, (1 - u) * wPx, v * hPx, (1 - v) * hPx);   // 가장자리까지 칸 수
  let s = 0.9 - ny * 0.75 - nx * 0.25 - (nx * nx + ny * ny) * 0.35;      // 볼록: 위·왼쪽 밝게, 둘레 어둡게
  if (edge < 1.2) s -= 1.7;                                            // 이음새(어두운 줄)
  else if (edge < 2.2) s -= 0.6;                                       // 이음새 옆 둥근 턱
  return s;
}

// ── 1. 뒤 벽: 24×22 칸(앞을 봄), 가운데 기준 대칭 ──
const TW = 24, THh = 22, OX = 135 - TW / 2;
for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) {
  const u = (((x - OX) % TW) + TW) % TW / TW, v = (y % THh) / THh;
  const { L, warm } = lightAt(x, y, false);
  const base = 4.1 + bulge(u, v, TW, THh) * 1.5 + L - Math.max(0, 1 - y / 14) * 1.2 - Math.max(0, 1 - (FLOOR - y) / 14) * 1.0 - vign(x);   // 천장 밑·바닥 닿는 곳 그늘
  put(x, y, tone(warm > 0.12 + th(x, y) * 0.5 ? WARM : COOL, base, x, y));
}
// 걸레받이(벽과 바닥 사이 어두운 띠)
for (let x = 0; x < W; x++) { put(x, FLOOR - 3, COOL[3]); put(x, FLOOR - 2, COOL[2]); put(x, FLOOR - 1, COOL[1]); }

// ── 2. 둥근 통창: 두꺼운 테(볼트 여덟) + 바깥 어둠 + 별 몇 + 유리 반사(사선 띠 둘, 위 왼쪽 가장자리 빛) ──
const WC = [135, 57], RO = 50, RI = 42;
for (let y = WC[1] - RO - 1; y <= WC[1] + RO + 1; y++) for (let x = WC[0] - RO - 1; x <= WC[0] + RO + 1; x++) {
  const dx = x + 0.5 - WC[0], dy = y + 0.5 - WC[1], r = Math.hypot(dx, dy);
  if (r > RO + 0.6) continue;
  if (r > RO - 0.6) { put(x, y, COOL[1]); continue; }                       // 바깥 테두리 선
  if (r > RI + 0.5) {                                                        // 테: 위·왼쪽 밝게, 아래·오른쪽 어둡게, 가운데 둥근 볼록
    const t = (r - RI) / (RO - RI), lit = -(dx + dy) / (r * 1.414);
    put(x, y, tone(COOL, 5.2 + lit * 1.6 + (0.5 - Math.abs(t - 0.5)) * 2.2, x, y));
    continue;
  }
  if (r > RI - 0.6) { put(x, y, COOL[0]); continue; }                      // 테 안쪽 그늘 선
  // 유리: 아래로 갈수록 조금 밝은 어둠 + 사선 반사 띠 + 위 왼쪽 가장자리 빛
  let g = 1.2 + (dy + RI) / (2 * RI) * 1.4;
  const band = dx * 0.7 + dy * 0.7;                                          // 오른쪽 아래로 가는 사선
  if (band > -26 && band < -18) g += 1.6; if (band > -12 && band < -8) g += 1.1;
  if (r > RI - 4 && dx + dy < -RI * 0.9) g += 1.5;
  put(x, y, tone(GLASS, g, x, y));
}
for (const [sx, sy] of [[118, 30], [150, 26], [162, 52], [126, 70], [144, 80], [108, 50]]) put(sx, sy, GLASS[5]);   // 먼 별(희미)
for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8, bx = Math.round(WC[0] + Math.cos(a) * (RI + 4)), by = Math.round(WC[1] + Math.sin(a) * (RI + 4)); put(bx, by, COOL[8]); put(bx + 1, by + 1, COOL[2]); }

// ── 3. 바닥: 같은 흰 타일을 바닥 각도로(칸 24 × 10.5), 벽 칸과 줄 맞춤 + 빛 웅덩이 ──
const FW = 24, FH = FW * K;
for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) {
  const u = (((x - OX) % FW) + FW) % FW / FW, v = (((y - FLOOR) % FH) + FH) % FH / FH;
  const { L, warm } = lightAt(x, y, true);
  const depth = (y - FLOOR) / (H - FLOOR);                                    // 앞(아래)일수록 밝게, 벽 밑은 그늘(누운 면으로 읽히게)
  const flat = bulgeFloor(u, v, FW, FH);
  const base = 2.6 + flat + L + depth * 1.9 - Math.max(0, 1 - (y - FLOOR) / 18) * 1.5 - vign(x);
  put(x, y, tone(warm > 0.12 + th(x, y) * 0.5 ? WARM : COOL, base, x, y));
}
// 바닥 타일 명암: 위에서 내려다본 볼록 — 가운데 살짝 밝고, 이음새는 가는 선(가로 줄은 더 옅게 — 벽돌 벽처럼 안 보이게)
function bulgeFloor(u, v, wPx, hPx) {
  const nx = u * 2 - 1, ny = v * 2 - 1, ex = Math.min(u * wPx, (1 - u) * wPx), ey = Math.min(v * hPx, (1 - v) * hPx);
  let s = 0.55 - (nx * nx) * 0.3 - (ny * ny) * 0.3 - ny * 0.25;
  if (ex < 1.1) s -= 0.75; else if (ey < 1) s -= 0.9;   // 세로 이음새를 옅게 — 진하면 세로 줄무늬 벽처럼 읽힘
  return s;
}

// ── 4. 천장 등(원뿔 빛은 위 lightAt 이 타일을 따뜻하게 밝혀 그림) ──
for (const l of LAMPS) {
  // 등갓: 어두운 원통 + 주황 렌즈
  for (let j = 0; j < 7; j++) { const w = 7 + j; for (let i = -w; i <= w; i++) put(l.x + i, j, j === 0 ? LAMP.rim : (Math.abs(i) === w ? COOL[1] : LAMP.body)); }
  for (let i = -6; i <= 6; i++) put(l.x + i, 7, i % 3 === 0 ? LAMP.hot : LAMP.lens);
}

mkdirSync(resolve(repo, 'assets', 'v2', 'bg'), { recursive: true });
writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'arena_cell.png'), im.png());
const z = +(process.argv.find(a => a.startsWith('--zoom=')) || '--zoom=2').slice(7);
const big = new Img(W * z, H * z); big.blit(im, 0, 0, z);
mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
writeFileSync(resolve(here, 'out', 'conv', 'arena_cell_x' + z + '.png'), big.png());
console.log('독방 경기장 →', resolve(repo, 'assets', 'v2', 'bg', 'arena_cell.png'));

// ════ 홈(대기 화면) — 같은 독방(2026-10-15 사용자: "전투 말고, 대기 화면 말하는 거임") ════
// 270×600: 뒤 벽(타일) 가운데 큰 둥근 통창 → 그 앞 흰 타일 원통 받침 위에 식물(게임이 그림, 받침 윗면 가운데 = HOME_CELL) → 천장 등 하나의 주황 원뿔이 식물로.
// 아래(정보 판·하단 탭 자리)는 바닥만 이어 그림. 상단 정보줄·오른쪽 가방·도감 단추·좌우 화살표는 게임이 그림.
{
  const HW = 270, HH = 600, HF = 304, PED = [135, 262], PR = 46, PRY = Math.round(PR * K), PED_BOT = HF + 6;
  const hm = new Img(HW, HH, COOL[1]);
  const hput = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < HW && y < HH && c) hm.set(x, y, c); };
  const LX = 135, LTOP = 12;
  // 빛: 원뿔(등 → 받침 윗면 양끝) 안 타일은 따뜻하게 밝게, 받침 윗면·발치 바닥은 웅덩이
  const hlight = (x, y, floor) => {
    let L = 0, warm = 0;
    if (y >= LTOP && y <= PED[1] + 4) { const t = (y - LTOP) / (PED[1] - LTOP), half = 7 + (PR + 4 - 7) * t, e = Math.abs(x - LX) / half; if (e <= 1) { const s = (0.95 - 0.3 * t) * (1 - e ** 4 * 0.6); L += s * 1.6; warm = Math.max(warm, s); } }
    if (floor) { const d = Math.hypot((x - PED[0]) / 84, (y - PED_BOT) / (84 * K)); const c = Math.max(0, Math.min(1, 1.05 - d)); L += c * 2.2; warm = Math.max(warm, c * 0.9); }
    return { L, warm };
  };
  const hv = x => Math.max(0, Math.abs(x - 135) / 135 - 0.5) * 2.6;
  // 벽
  for (let y = 0; y < HF; y++) for (let x = 0; x < HW; x++) {
    const u = (((x - OX) % TW) + TW) % TW / TW, v = (y % THh) / THh, { L, warm } = hlight(x, y, false);
    const base = 3.9 + bulge(u, v, TW, THh) * 1.5 + L - Math.max(0, 1 - y / 16) * 1.3 - Math.max(0, 1 - (HF - y) / 16) * 1.0 - hv(x);
    hput(x, y, tone(warm > 0.12 + th(x, y) * 0.5 ? WARM : COOL, base, x, y));
  }
  for (let x = 0; x < HW; x++) { hput(x, HF - 3, COOL[3]); hput(x, HF - 2, COOL[2]); hput(x, HF - 1, COOL[1]); }
  // 바닥
  for (let y = HF; y < HH; y++) for (let x = 0; x < HW; x++) {
    const u = (((x - OX) % FW) + FW) % FW / FW, v = (((y - HF) % FH) + FH) % FH / FH, { L, warm } = hlight(x, y, true);
    const base = 2.6 + bulgeFloor(u, v, FW, FH) + L + Math.min(1, (y - HF) / 120) * 1.4 - Math.max(0, 1 - (y - HF) / 18) * 1.5 - hv(x);
    hput(x, y, tone(warm > 0.12 + th(x, y) * 0.5 ? WARM : COOL, base, x, y));
  }
  // 둥근 통창(식물 뒤): 두꺼운 테·볼트 + 바깥 어둠 + 사선 반사, 원뿔이 지나는 유리는 따뜻하게 비침
  const HC = [135, 150], HRO = 72, HRI = 62;
  for (let y = HC[1] - HRO - 1; y <= HC[1] + HRO + 1; y++) for (let x = HC[0] - HRO - 1; x <= HC[0] + HRO + 1; x++) {
    const dx = x + 0.5 - HC[0], dy = y + 0.5 - HC[1], r = Math.hypot(dx, dy);
    if (r > HRO + 0.6) continue;
    if (r > HRO - 0.6) { hput(x, y, COOL[1]); continue; }
    if (r > HRI + 0.5) { const t = (r - HRI) / (HRO - HRI), lit = -(dx + dy) / (r * 1.414); const { warm } = hlight(x, y, false); hput(x, y, tone(warm > 0.2 ? WARM : COOL, 5.0 + lit * 1.6 + (0.5 - Math.abs(t - 0.5)) * 2.2 + warm * 1.2, x, y)); continue; }
    if (r > HRI - 0.6) { hput(x, y, COOL[0]); continue; }
    let gl = 1.1 + (dy + HRI) / (2 * HRI) * 1.5;
    const band = dx * 0.7 + dy * 0.7;
    if (band > -40 && band < -29) gl += 1.6; if (band > -21 && band < -15) gl += 1.1;
    if (r > HRI - 5 && dx + dy < -HRI * 0.9) gl += 1.5;
    const { warm } = hlight(x, y, false);
    hput(x, y, warm > 0.25 && th(x, y) < warm * 0.8 ? WARM[Math.min(9, 3 + Math.round(gl))] : tone(GLASS, gl, x, y));
  }
  for (const [sx, sy] of [[104, 112], [160, 100], [176, 140], [116, 176], [150, 196], [92, 150], [182, 182]]) hput(sx, sy, GLASS[5]);
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 + Math.PI / 10, bx = Math.round(HC[0] + Math.cos(a) * (HRI + 5)), by = Math.round(HC[1] + Math.sin(a) * (HRI + 5)); hput(bx, by, COOL[8]); hput(bx + 1, by + 1, COOL[2]); }
  // 받침: 흰 타일 원통(옆면 = 가운데 밝고 양옆 어둡게 + 세로 이음새, 윗면 = 빛 웅덩이 + 둥근 이음새) + 바닥 그늘
  for (let y = PED_BOT - PRY - 2; y <= PED_BOT + PRY + 2; y++) for (let x = PED[0] - PR - 6; x <= PED[0] + PR + 6; x++) { const d = ((x - PED[0]) / (PR + 5)) ** 2 + ((y - PED_BOT - 2) / (PRY + 3)) ** 2; if (d < 1 && th(x, y) < 0.6 * (1 - d) + 0.2) hput(x, y, COOL[1]); }
  for (let x = PED[0] - PR; x <= PED[0] + PR; x++) {
    const nx = (x + 0.5 - PED[0]) / PR; if (Math.abs(nx) > 1) continue;
    const ey = Math.sqrt(1 - nx * nx) * PRY, ytop = PED[1] + ey, ybot = PED_BOT + ey, ang = Math.asin(nx);
    for (let y = Math.floor(ytop); y <= ybot; y++) {
      const seamV = Math.abs(((ang / (Math.PI / 7)) % 1 + 1) % 1 - 0.5) > 0.46, seamH = Math.abs(y - (ytop + ybot) / 2) < 0.6;
      const { warm } = hlight(x, y, false), shade = 5.2 - nx * nx * 2.4 - nx * 0.6 + warm * 1.0 - (seamV || seamH ? 1.6 : 0) - (y > ybot - 2 ? 1.2 : 0);
      hput(x, y, tone(warm > 0.25 ? WARM : COOL, shade, x, y));
    }
  }
  for (let y = PED[1] - PRY - 1; y <= PED[1] + PRY + 1; y++) for (let x = PED[0] - PR; x <= PED[0] + PR; x++) {
    const d = ((x + 0.5 - PED[0]) / PR) ** 2 + ((y + 0.5 - PED[1]) / PRY) ** 2; if (d > 1) continue;
    const rim = d > 0.82, ring = Math.abs(Math.sqrt(d) - 0.55) < 0.05;
    hput(x, y, rim ? WARM[d > 0.95 ? 5 : 8] : tone(WARM, 7.4 - d * 1.6 - (ring ? 1.5 : 0), x, y));
  }
  // 천장 등(위 가운데, 상단 정보줄 사이로 보임)
  for (let j = 0; j < 9; j++) { const w = 8 + j; for (let i = -w; i <= w; i++) hput(LX + i, j + 2, j === 0 ? LAMP.rim : (Math.abs(i) === w ? COOL[1] : LAMP.body)); }
  for (let i = -8; i <= 8; i++) hput(LX + i, 11, i % 3 === 0 ? LAMP.hot : LAMP.lens);
  writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'home_cell.png'), hm.png());
  const hb = new Img(HW * z, HH * z); hb.blit(hm, 0, 0, z);
  writeFileSync(resolve(here, 'out', 'conv', 'home_cell_x' + z + '.png'), hb.png());
  console.log('독방 홈 →', resolve(repo, 'assets', 'v2', 'bg', 'home_cell.png'), '· 받침 윗면 가운데', PED);
}
