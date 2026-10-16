// 행성 지도(2026-10-16 사용자 "지역도 지도가 아니라 그냥 버튼이야" — 옛 판처럼 행성을 누르면 지도가 뜨고 그 위에서 지역을 고름):
//  큰 행성 원판 = 지역마다 구역(가장 가까운 지역 중심 · 잡음으로 들쭉날쭉한 경계) · 구역 색 = 그 지역에 많이 나오는 속성의 색 램프(같은 빛 방향 음영) ·
//  경계 = 짙은 점선 · 잔무늬(분화구 · 얼룩). 행성 · 크기마다 한 번만 구워 둠(매 장 점마다 그리면 느림). 잠긴 지역 = 그 구역만 어둡게(구역 가림판).
import { RAMP } from './palette.js';
import { SPECIES } from '../game/catalog.js';

const cache = new Map();
const hash = (s, n) => { let h = 2166136261 ^ n; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };
// 값 잡음(격자 점 사이를 부드럽게) — 결정론
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, r = (i, j) => { let h = Math.imul(i * 374761393 + j * 668265263 + seed * 1442695041, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };
  const s = t => t * t * (3 - 2 * t), a = r(xi, yi), b = r(xi + 1, yi), c = r(xi, yi + 1), d = r(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
// 지역 구역 색: 그 지역에 나오는 식물 속성 중 가장 많은 것(같으면 앞) → 램프. 나오는 식물이 행성 전체면 행성 색
const EL_RAMP = { fire: 'fire', water: 'water', grass: 'grass', earth: 'earth', wind: 'wind', bolt: 'bolt', ice: 'ice' };
function rampOf(pl, R, ramp0) {
  if (!R.pool) return ramp0;
  const n = {};
  for (const k of R.pool) { const el = SPECIES[k] && SPECIES[k].el; if (el) n[el] = (n[el] || 0) + 1; }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return best ? EL_RAMP[best[0]] || ramp0 : ramp0;
}
// 지역 중심(원판 좌표 −1~1): 첫 지역 = 빛 받는 왼쪽 위, 나머지는 고르게 돌아가며 · 행성마다 조금 다르게
export function regionSpots(pl) {
  const regs = pl.regions || [{ id: 'main' }], n = regs.length, base = -2.2 + (hash(pl.id, 1) - 0.5) * 0.5;
  return regs.map((R, i) => { const a = base + i * (Math.PI * 2 / n) + (hash(pl.id, i + 7) - 0.5) * 0.35, d = n <= 1 ? 0 : 0.5 + (hash(pl.id, i + 13) - 0.5) * 0.12; return [Math.cos(a) * d, Math.sin(a) * d * 0.92]; });
}
// 굽기: { cv(원판), masks[구역마다 짙은 가림판], spots }
export function planetMap(pl, rampName, r) {
  const key = pl.id + '|' + r;
  let M = cache.get(key); if (M) return M;
  const regs = pl.regions || [{ id: 'main' }], spots = regionSpots(pl), seed = Math.floor(hash(pl.id, 3) * 9999);
  const ramps = regs.map(R => RAMP[rampOf(pl, R, rampName)] || RAMP[rampName] || RAMP.water);
  const S = r * 2 + 1, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const c = cv.getContext('2d'), img = c.createImageData(S, S), d = img.data;
  const masks = regs.map(() => { const m = document.createElement('canvas'); m.width = S; m.height = S; return { m, img: m.getContext('2d').createImageData(S, S) }; });
  const zoneAt = (dx, dy) => {   // 잡음으로 흔든 거리 → 가장 가까운 지역
    const wx = dx / r + (vnoise(dx / 9, dy / 9, seed) - 0.5) * 0.34, wy = dy / r + (vnoise(dx / 9 + 40, dy / 9 + 40, seed) - 0.5) * 0.34;
    let bi = 0, bd = 1e9; spots.forEach(([sx, sy], i) => { const q = (wx - sx) ** 2 + (wy - sy) ** 2; if (q < bd) { bd = q; bi = i; } });
    return bi;
  };
  const Z = new Int8Array(S * S).fill(-1);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) Z[(dy + r) * S + dx + r] = zoneAt(dx, dy);
  const put = (arr, i, hex, a = 255) => { const n = parseInt(hex.slice(1), 16); arr[i] = n >> 16; arr[i + 1] = (n >> 8) & 255; arr[i + 2] = n & 255; arr[i + 3] = a; };
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const k = (dy + r) * S + dx + r, z = Z[k]; if (z < 0) continue;
    const nx = dx / r, ny = dy / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let L = (-0.55 * nx - 0.6 * ny + 0.58 * nz) * 0.5 + 0.5;
    L += (vnoise(dx / 4, dy / 4, seed + 5) - 0.5) * 0.22;   // 땅 얼룩
    const cr = vnoise(dx / 6 + 90, dy / 6 + 90, seed + 9); if (cr > 0.86) L -= 0.16;   // 분화구 · 움푹한 곳
    const lv = L * 4.2; let i = Math.floor(lv); if (lv - i > 0.5 && ((dx + dy) & 1)) i++;
    i = Math.max(0, Math.min(4, i));
    // 경계: 오른쪽 · 아래 이웃이 다른 구역이면 짙은 점선(두 칸 중 하나)
    const zr = dx + 1 <= r ? Z[k + 1] : z, zd = dy + 1 <= r ? Z[k + S] : z, edge = (zr >= 0 && zr !== z) || (zd >= 0 && zd !== z);
    const col = edge ? (((dx + dy) & 1) ? ramps[z][0] : ramps[z][1]) : ramps[z][i];
    put(d, k * 4, col);
    put(masks[z].img.data, k * 4, '#05070f');
  }
  // 바깥 테(1칸 짙게)
  for (let a = 0; a < 720; a++) { const t = a / 720 * Math.PI * 2, X = Math.round(r + Math.cos(t) * r), Y = Math.round(r + Math.sin(t) * r), k = (Y * S + X) * 4; if (d[k + 3]) put(d, k, '#0b0d1a'); }
  c.putImageData(img, 0, 0);
  for (const q of masks) q.m.getContext('2d').putImageData(q.img, 0, 0);
  M = { cv, masks: masks.map(q => q.m), spots, r };
  cache.set(key, M);
  return M;
}
