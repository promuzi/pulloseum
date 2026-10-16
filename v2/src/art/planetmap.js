// 행성 지도(2026-10-16 사용자 "지역도 지도가 아니라 그냥 버튼이야" → "지도도 디테일하게 — 바다가 있어서 대륙을 고르는 느낌 · 행성이 확대되며 지도로 이어지는 느낌"):
//  큰 원판 = 바다(행성마다: 물 · 용암 · 언 바다 · 마른 분지 · 구름 바다 · 늪) 위 대륙 — 지역마다 대륙 하나(큰 덩어리 + 반도 곁가지 · 비튼 해안 · 작은 섬 · 호수) ·
//  대륙 지형 = 그 지역에 많이 나오는 속성(풀 = 숲 · 물 = 습지 · 불 = 화산 · 대지 = 사막 · 바람 = 고원 · 번개 = 수정 들판 · 빙결 = 눈밭, 한 행성 안에선 되도록 겹치지 않게) ·
//  지도 기호(산맥 · 숲 · 화산 · 수정 · 평평한 바위산 · 갈대 · 뜬 바위 · 물결) · 해안 얕은 물 · 파도 거품 · 극지 얼음 · 구 음영 · 구름 층(따로 — 흐름) · 밤 그늘 ·
//  같은 크기의 '궤도 모습'(확대하며 무늬로 넘어갈 때). 행성 · 크기마다 한 번만 구움. 잠긴 지역 = 가림판 · 고른 지역 = 해안선 금빛 · 누르는 칸 = 대륙 위 줄 토막(runs)
import { RAMP } from './palette.js';
import { SPECIES } from '../game/catalog.js';

const cache = new Map();
const hash = (s, n) => { let h = 2166136261 ^ n; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };
function vnoise(x, y, seed) {   // 값 잡음(결정론)
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, r = (i, j) => { let h = Math.imul(i * 374761393 + j * 668265263 + seed * 1442695041, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };
  const s = t => t * t * (3 - 2 * t), a = r(xi, yi), b = r(xi + 1, yi), c = r(xi, yi + 1), d = r(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
const fbm = (x, y, seed, oct = 4) => { let v = 0, a = 0.5, f = 1; for (let o = 0; o < oct; o++) { v += a * vnoise(x * f, y * f, seed + o * 17); a *= 0.5; f *= 2.03; } return v / 0.9375; };
// 지형 팔레트(밝음 → 어두움 다섯)
const LAND = {
  grass: ['#cddf6c', '#91db69', '#1ebc73', '#239063', '#165a4c'],
  water: ['#8ff8e2', '#30e1b9', '#0eaf9b', '#0b8a8f', '#0b5e65'],
  fire: ['#f9c22b', '#c8583a', '#8a3b34', '#5a2a30', '#3a1e2a'],
  earth: ['#fbb954', '#e6904e', '#cd683d', '#9e4539', '#7a3045'],
  wind: ['#eaaded', '#a884f3', '#905ea9', '#6b3e75', '#45293f'],
  bolt: ['#fbff86', '#d5e04b', '#a2a947', '#676633', '#4c3e24'],
  ice: ['#ffffff', '#e6f3ff', '#b8dcfa', '#8eaed2', '#5b6e94'],
};
// 바다(얕음 → 깊음 다섯) · 해안 거품 · 대기 빛 · 구름 색 · 극지 얼음(있으면)
const SEA = {
  water: { pal: ['#8fd3ff', '#4d9be6', '#4d65b4', '#484a77', '#323353'], foam: '#e6f3ff', glow: '#8fd3ff', cloud: [240, 248, 255], cap: true },
  lava: { pal: ['#f9c22b', '#fb6b1d', '#e83b3b', '#ae2334', '#6e2727'], foam: '#f9c22b', glow: '#fb6b1d', cloud: [120, 104, 118] },
  frozen: { pal: ['#c8f0ff', '#8fd3ff', '#5aa8d8', '#3a6f9e', '#26405e'], foam: '#ffffff', glow: '#c8f0ff', cloud: [244, 250, 255], cap: true },
  dust: { pal: ['#c7dcd0', '#ab947a', '#966c6c', '#694f62', '#3e3546'], foam: '#c7dcd0', glow: '#fbb954', cloud: [236, 214, 176] },
  cloud: { pal: ['#ffffff', '#e6f3ff', '#c7dcd0', '#9babb2', '#7f708a'], foam: '#ffffff', glow: '#eaaded', cloud: [255, 255, 255] },
  swamp: { pal: ['#92a984', '#547e64', '#374e4a', '#313638', '#252a2c'], foam: '#c7dcd0', glow: '#91db69', cloud: [226, 240, 232] },
};
// 행성마다 바다(없으면 물): 용암 사막 · 번개 화산 = 용암, 얼음 바람 = 언 바다, 건조 지대 = 마른 분지, 부유 고원 = 구름 바다, 안개 습지 = 늪
const SEA_OF = { ex_veloc: 'lava', ex_volkar: 'lava', ex_tiamen: 'frozen', ex_calisto: 'dust', ex_seraphin: 'cloud', ex_mirdin: 'swamp' };
// 지도 기호(판타지 지도처럼 — 빛은 왼쪽 위): l = 밝음 · m = 중간 · d = 어두움 · s = 꼭대기 눈 · o = 용암 · w = 흰 반짝
const GLYPH = {
  peak: ['..s..', '.lmd.', 'lmmdd'],
  peak2: ['...s...', '..lmd..', '.llmdd.', 'lmmmddd'],
  volcano: ['..o..', '.lod.', 'lmmdd'],
  tree: ['.l.', 'lmd', '.d.'],
  crystal: ['.w.', 'lwm', 'lmd'],
  reed: ['l.l', '.l.'],
  mesa: ['.llm.', 'lmmdd'],
  rock: ['.lmd.', '..d..'],
  wave: ['.w.', 'w.w'],
};
// 그 지역(없으면 행성)에 많이 나오는 속성 — 앞 대륙이 이미 쓴 속성은 건너뜀(한 행성 안 대륙 색이 겹치지 않게)
function biomeOf(R, pl, used) {
  const pool = R.pool || pl.pool || [], n = {};
  for (const k of pool) { const el = SPECIES[k] && SPECIES[k].el; if (el) n[el] = (n[el] || 0) + 1; }
  const order = Object.entries(n).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  return order.find(el => !used.has(el)) || order[0] || 'grass';
}
// 대륙 중심(원판 좌표 −1~1): 첫 지역 = 빛 받는 왼쪽 위, 나머지는 고르게 돌아가며 · 행성마다 조금 다르게
export function regionSpots(pl) {
  const regs = pl.regions || [{ id: 'main' }], n = regs.length, base = -2.25 + (hash(pl.id, 1) - 0.5) * 0.4;
  return regs.map((R, i) => { const a = base + i * (Math.PI * 2 / n) + (hash(pl.id, i + 7) - 0.5) * 0.3, d = n <= 1 ? 0 : 0.5 + (hash(pl.id, i + 13) - 0.5) * 0.1; return [Math.cos(a) * d, Math.sin(a) * d * 0.9]; });
}
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
// 굽기: { cv = 지도, plain = 같은 크기 궤도 모습, clouds = 구름(가로 두 배 — 한 바퀴 = 폭 S), night = 밤 쪽 그늘, masks · edges = 대륙마다 가림판 · 해안선,
//        spots = 대륙 핀 자리(−1~1), runs = 누르는 칸 [{x, y, w, h, z}](원판 왼쪽 위 기준), glow = 대기 빛 색, biomes = 대륙 속성, r }
export function planetMap(pl, rampName, r) {
  const key = pl.id + '|' + r;
  let M = cache.get(key); if (M) return M;
  const regs = pl.regions || [{ id: 'main' }], spots = regionSpots(pl), seed = Math.floor(hash(pl.id, 3) * 9999), S = r * 2 + 1;
  const used = new Set(), bio = regs.map(R => { const el = biomeOf(R, pl, used); used.add(el); return el; });
  const biomes = bio.map(el => LAND[el] || LAND.grass), SE = SEA[SEA_OF[pl.id] || 'water'], sea = SE.pal, ramp0 = RAMP[rampName] || RAMP.water;
  const mk = (w = S, h = S) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); return { cv, c, img: c.createImageData(w, h) }; };
  const out = mk(), plain = mk(), night = mk(), masks = regs.map(() => mk()), edges = regs.map(() => mk());
  const h2 = (x, y, n) => { let h = Math.imul((x * 73856093) ^ (y * 19349663) ^ ((seed + n) * 83492791), 2654435761); h ^= h >>> 15; return ((h >>> 0) % 1000) / 1000; };
  // 1) 땅 · 바다: 대륙 = 큰 덩어리 하나 + 반도 곁가지 둘 ~ 셋. 비튼 좌표로 거리를 재고(해안 굽이) 잡음을 더함 → 가장 높은 대륙, 둘째와 가까우면 해협(바다)
  const lobes = regs.map((_, i) => {
    const L = [[spots[i][0], spots[i][1], 0.27 + (hash(pl.id, i + 31) - 0.5) * 0.06]], n = 2 + Math.floor(hash(pl.id, i + 41) * 2);
    for (let j = 0; j < n; j++) { const a = hash(pl.id, i * 7 + j + 51) * Math.PI * 2, d = 0.14 + hash(pl.id, i * 7 + j + 61) * 0.12; L.push([spots[i][0] + Math.cos(a) * d, spots[i][1] + Math.sin(a) * d, 0.11 + hash(pl.id, i * 7 + j + 71) * 0.08]); }
    return L;
  });
  const N = S * S, zone = new Int8Array(N).fill(-2), land = new Float32Array(N), hgt = new Float32Array(N);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    const k = (dy + r) * S + dx + r, nx = dx / r, ny = dy / r;
    const wx = nx + (fbm(nx * 2.6 + 3, ny * 2.6, seed + 5) - 0.5) * 0.24, wy = ny + (fbm(nx * 2.6, ny * 2.6 + 3, seed + 6) - 0.5) * 0.24;
    const warp = (fbm(nx * 3.4, ny * 3.4, seed) - 0.5) * 0.5 + (fbm(nx * 8, ny * 8, seed + 2) - 0.5) * 0.2;
    let b1 = -9, b2 = -9, bi = -1;
    lobes.forEach((L, i) => { let sc = -9; for (const [lx, ly, lr] of L) sc = Math.max(sc, 1 - Math.hypot(wx - lx, wy - ly) / lr); sc += warp; if (sc > b1) { b2 = b1; b1 = sc; bi = i; } else if (sc > b2) b2 = sc; });
    land[k] = b1; hgt[k] = fbm(nx * 4, ny * 4, seed + 7);
    zone[k] = b1 > 0 && b1 - b2 > 0.1 ? bi : -1;   // −1 = 바다
    if (zone[k] >= 0 && b1 > 0.35 && (bio[bi] === 'grass' || bio[bi] === 'water') && fbm(nx * 6 + 21, ny * 6 + 21, seed + 9) < 0.2) zone[k] = -1;   // 호수(숲 · 습지 대륙 안)
  }
  // 작은 섬(대륙 근처 바다에 잡음 덩어리 — 가장 가까운 대륙 땅)
  for (let k = 0; k < N; k++) if (zone[k] === -1 && land[k] > -0.32 && land[k] < 0) { const x = k % S - r, y = Math.floor(k / S) - r; if (fbm(x / r * 6.5 + 9, y / r * 6.5 + 9, seed + 3) > 0.7) { let best = -1, bd = 9; spots.forEach(([sx, sy], i) => { const d = Math.hypot(x / r - sx, y / r - sy); if (d < bd) { bd = d; best = i; } }); zone[k] = best; } }
  // 2) 칠하기(구 음영 + 지형 + 해안)
  const put = (img, k, hex, a = 255) => { const [R0, G0, B0] = hexRgb(hex), i = k * 4; img.data[i] = R0; img.data[i + 1] = G0; img.data[i + 2] = B0; img.data[i + 3] = a; };
  const Lof = (dx, dy) => { const nx = dx / r, ny = dy / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); return (-0.55 * nx - 0.6 * ny + 0.58 * nz) * 0.5 + 0.5; };
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const k = (dy + r) * S + dx + r, z = zone[k]; if (z === -2) continue;
    const L = Lof(dx, dy), dith = ((dx + dy) & 1) ? 0.06 : -0.06, nx = dx / r, ny = dy / r;
    // 궤도 모습(같은 크기): 궤도 행성 그리기(bg.js planet)와 같은 셈
    { const lv = L * 4.2; let i = Math.floor(lv); if (lv - i > 0.5 && ((dx + dy) & 1)) i++; put(plain.img, k, ramp0[Math.max(0, Math.min(4, i))]); }
    // 밤 쪽 그늘(구름까지 덮음 — 그릴 때 맨 위): 디더 두 단
    { const dk = (0.4 - L) / 0.3; if (dk > 0.66) put(night.img, k, '#0b0d1a', 120); else if (dk > 0.33 && ((dx + dy) & 1)) put(night.img, k, '#0b0d1a', 120); else if (dk > 0.08 && (dx & 1) && (dy & 1)) put(night.img, k, '#0b0d1a', 90); }
    const shade = (pal, base) => pal[Math.max(0, Math.min(4, Math.round(base + (0.62 - L) * 3.2 + dith)))];   // 밝은 쪽 = 앞(밝은 색), 밤 쪽 = 어두움
    const near = (ddx, ddy) => { const X = dx + ddx, Y = dy + ddy; if (X * X + Y * Y > r * r) return z; return zone[(Y + r) * S + X + r]; };
    let col;
    if (z < 0) {   // 바다: 해안에 가까울수록 얕음 · 땅에 닿은 칸 = 거품
      const coast = near(1, 0) >= 0 || near(-1, 0) >= 0 || near(0, 1) >= 0 || near(0, -1) >= 0;
      const depth = land[k] > -0.06 ? 0.6 : land[k] > -0.2 ? 1.6 : 2.6;
      col = coast && ((dx * 3 + dy) & 3) !== 0 ? SE.foam : shade(sea, depth + (vnoise(dx / 3, dy / 3, seed + 11) - 0.5) * 0.6);
      if (SE === SEA.lava && land[k] < -0.25 && Math.abs(fbm(dx / 11, dy / 11, seed + 21) - 0.5) < 0.022) col = '#f9c22b';   // 용암 바다의 빛 줄기(흐르는 물길)
      if (SE === SEA.cloud && land[k] < -0.12 && fbm(dx / 8, dy / 8, seed + 23) > 0.66) col = shade(sea, -0.4);   // 구름 바다 뭉게(덩어리)
      if (SE.cap && Math.abs(ny) > 0.88 - (fbm(nx * 5, ny * 5, seed + 97) - 0.5) * 0.16) col = shade(LAND.ice, 0.4);   // 극지 얼음
    } else {
      const pal = biomes[z], h = hgt[k], relief = (hgt[Math.min(N - 1, k + 1)] - h) * 9 + (hgt[Math.max(0, k - S)] - h) * 9;   // 빛 쪽(왼쪽 위)으로 기울면 밝음
      let base = 1.6 - relief * 1.3;
      if (h > 0.66) base -= 0.8;   // 높은 곳
      const el = bio[z], sea0 = near(1, 0) < 0 || near(-1, 0) < 0 || near(0, 1) < 0 || near(0, -1) < 0;
      if (sea0) base -= 0.7;   // 해안 = 밝은 모래 · 눈 띠
      col = shade(pal, base);
      const sp = vnoise(dx / 1.6, dy / 1.6, seed + 41);
      if (el === 'water' && sp < 0.12) col = '#4d9be6';   // 습지 웅덩이
      if (el === 'earth' && Math.sin(dx * 0.5 + dy * 0.28 + fbm(dx / 9, dy / 9, seed + 45) * 14) > 0.93) col = pal[3];   // 모래 언덕 줄(굽이)
      if (el === 'fire' && Math.abs(fbm(dx / 7, dy / 7, seed + 51) - 0.5) < 0.025) col = '#fb6b1d';   // 용암 갈라짐
      if (el === 'ice' && Math.abs(fbm(dx / 6, dy / 6, seed + 61) - 0.5) < 0.02) col = '#5aa8d8';   // 얼음 틈
      if (el === 'wind' && Math.sin(dx * 0.6 - dy * 0.2 + fbm(dx / 10, dy / 10, seed + 47) * 12) > 0.95 && sp > 0.4) col = pal[0];   // 바람결(굽이 · 끊김)
      put(masks[z].img, k, '#05070f');
      if (near(1, 0) !== z || near(-1, 0) !== z || near(0, 1) !== z || near(0, -1) !== z) put(edges[z].img, k, '#ffd890');   // 해안선 · 경계
    }
    if (L < 0.16 && ((dx + dy) & 1)) col = '#0b0d1a';   // 밤 쪽 끝(디더)
    put(out.img, k, col);
  }
  // 대륙 핀 자리 = 그 대륙의 안쪽(해안에서 먼) 땅 중 대륙 중심에 가까운 곳 — 반도 · 만이 있어도 늘 땅 위 · 대륙 중심끼리는 떨어져 있어 핀 · 이름이 안 겹침
  const best = regs.map(() => [-9, -1]);
  for (let k = 0; k < N; k++) { const z = zone[k]; if (z < 0) continue; const v = Math.min(land[k], 0.45) - 1.4 * Math.hypot((k % S - r) / r - spots[z][0], (Math.floor(k / S) - r) / r - spots[z][1]); if (v > best[z][0]) best[z] = [v, k]; }
  const pinPx = regs.map((_, i) => (best[i][1] >= 0 ? [best[i][1] % S, Math.floor(best[i][1] / S)] : [Math.round(r + spots[i][0] * r), Math.round(r + spots[i][1] * r)]));
  // 3) 지도 기호: 6칸 격자(엇갈림 · 흔들림)에 지형별로 — 산맥(능선 잡음) · 숲(숲 잡음) · 그 밖은 드문드문. 기호 전체가 같은 대륙 안 · 해안에서 떨어짐 · 핀 · 이름 자리는 비움
  const ok = (gl, x0, y0, z) => { for (let j = 0; j < gl.length; j++) for (let i = 0; i < gl[j].length; i++) { if (gl[j][i] === '.') continue; const X = x0 + i, Y = y0 + j; if (X < 0 || Y < 0 || X >= S || Y >= S) return false; const kk = Y * S + X; if (z >= 0 ? zone[kk] !== z || land[kk] < 0.08 : zone[kk] !== -1) return false; } return true; };
  const stamp = (gl, x0, y0, col) => { for (let j = 0; j < gl.length; j++) for (let i = 0; i < gl[j].length; i++) { const ch = gl[j][i]; if (ch !== '.' && col[ch]) put(out.img, (y0 + j) * S + x0 + i, col[ch]); } };
  for (let gy = 1; gy < S - 2; gy += 6) for (let gx = 1 + ((gy / 6) & 1) * 3; gx < S - 2; gx += 6) {
    const x = gx + Math.floor(h2(gx, gy, 1) * 3) - 1, y = gy + Math.floor(h2(gx, gy, 2) * 3) - 1;
    if (x < 0 || y < 0 || x >= S || y >= S) continue;
    const k = y * S + x, z = zone[k]; if (z === -2) continue;
    const nx = (x - r) / r, ny = (y - r) / r, roll = h2(gx, gy, 3);
    if (z < 0) {   // 먼 바다 물결(구름 · 마른 분지는 없음)
      if (land[k] < -0.3 && roll > 0.9 && SE !== SEA.cloud && SE !== SEA.dust && !(SE.cap && Math.abs(ny) > 0.8) && ok(GLYPH.wave, x - 1, y, -1)) stamp(GLYPH.wave, x - 1, y, { w: SE === SEA.lava ? '#f9c22b' : sea[1] });
      continue;
    }
    if (pinPx.some(([px, py]) => Math.abs(x - px) < 24 && y > py - 16 && y < py + 18)) continue;
    const el = bio[z], pal = biomes[z], ridge = 1 - Math.abs(fbm(nx * 3.2 + 40, ny * 3.2 + 40, seed + 81) - 0.5) * 2, wood = fbm(nx * 4 + 60, ny * 4 + 60, seed + 91);
    const C = { l: pal[0], m: pal[2], d: pal[4], s: el === 'fire' || el === 'earth' ? pal[0] : '#ffffff', o: '#fb6b1d', w: '#ffffff' };
    let gl = null;
    if (ridge > 0.84) gl = el === 'fire' && roll > 0.7 ? GLYPH.volcano : roll > 0.55 ? GLYPH.peak2 : GLYPH.peak;
    else if ((el === 'grass' || el === 'water') && wood > 0.52) { gl = el === 'water' && roll > 0.5 ? GLYPH.reed : GLYPH.tree; if (el === 'grass') C.l = pal[1]; }
    else if (el === 'grass' && roll > 0.9) { gl = GLYPH.tree; C.l = pal[1]; }
    else if (el === 'bolt' && roll > 0.78) gl = GLYPH.crystal;
    else if (el === 'earth' && roll > 0.82) gl = GLYPH.mesa;
    else if (el === 'wind' && roll > 0.82) gl = GLYPH.rock;
    else if (el === 'ice' && roll > 0.85) gl = GLYPH.peak;
    if (!gl) continue;
    const x0 = x - (gl[0].length >> 1), y0 = y - gl.length + 1;
    if (!ok(gl, x0, y0, z)) continue;
    stamp(gl, x0, y0, C);
    if (gl === GLYPH.tree && ok(GLYPH.tree, x0 + 2, y0 + 1, z) && roll > 0.4) stamp(GLYPH.tree, x0 + 2, y0 + 1, C);   // 숲 = 두 그루씩
  }
  // 바깥 테(1칸 짙게)
  for (let a = 0; a < 900; a++) { const t = a / 900 * Math.PI * 2, X = Math.round(r + Math.cos(t) * r), Y = Math.round(r + Math.sin(t) * r), k = Y * S + X; if (out.img.data[k * 4 + 3]) { put(out.img, k, '#0b0d1a'); put(plain.img, k, '#0b0d1a'); } }
  for (const q of [out, plain, night, ...masks, ...edges]) q.c.putImageData(q.img, 0, 0);
  // 4) 구름(가로 두 배 — 폭 S마다 되풀이라 S만큼 미끄러져도 이어짐): 가로로 긴 잡음 덩어리, 양 끝을 섞어 이음(대비는 되살림)
  const cl = mk(S * 2, S), [cr, cg, cb] = SE.cloud, cf = (x, y) => fbm(x / S * 3 + 5, y / S * 4.4, seed + 71, 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const a = 1 - x / S, b = x / S, v = 0.5 + ((a * cf(x, y) + b * cf(x - S, y)) - 0.5) / Math.hypot(a, b);
    if (v < 0.62) continue;
    for (const X of [x, x + S]) { const i = (y * S * 2 + X) * 4; cl.img.data[i] = cr; cl.img.data[i + 1] = cg; cl.img.data[i + 2] = cb; cl.img.data[i + 3] = v > 0.7 ? 150 : 90; }
  }
  cl.c.putImageData(cl.img, 0, 0);
  // 누르는 칸 = 9칸 격자에서 그 대륙이 1/5 넘는 칸을 가로로 이은 토막
  const CELL = 9, runs = [];
  for (let y0 = 0; y0 < S; y0 += CELL) {
    let cur = null;
    for (let x0 = 0; x0 < S; x0 += CELL) {
      const cnt = new Map();
      for (let y = y0; y < Math.min(S, y0 + CELL); y++) for (let x = x0; x < Math.min(S, x0 + CELL); x++) { const z = zone[y * S + x]; if (z >= 0) cnt.set(z, (cnt.get(z) || 0) + 1); }
      let bz = -1, bn = CELL * CELL / 5; for (const [z, n] of cnt) if (n > bn) { bn = n; bz = z; }
      if (cur && cur.z === bz && bz >= 0) cur.w += Math.min(CELL, S - x0);
      else { if (cur && cur.z >= 0) runs.push(cur); cur = { x: x0, y: y0, w: Math.min(CELL, S - x0), h: Math.min(CELL, S - y0), z: bz }; }
    }
    if (cur && cur.z >= 0) runs.push(cur);
  }
  M = { cv: out.cv, plain: plain.cv, clouds: cl.cv, night: night.cv, masks: masks.map(q => q.cv), edges: edges.map(q => q.cv), spots: pinPx.map(([x, y]) => [(x - r) / r, (y - r) / r]), runs, glow: SE.glow, biomes: bio, r };
  cache.set(key, M);
  return M;
}
