// 화분 풀 마개 · 밑동 흙 자리(2026-10-17 사용자 "경기나 대기실에서 화분의 흙이 어색한데 — 스마트 팜처럼 풀로 해줄 수 있나 · 풀도 더 자연스럽게 ·
//  흙이나 자갈 등으로 자연스러운 경계가 되게"):
//  capOf(화분 뒤 그림)   = 그 그림의 흙 칸 위 잔디 — 스마트팜 잔디와 같은 띠(뒤 어둡게 · 앞 밝게)에 옆으로 긴 얼룩 · 드문 풀잎 점 · 뒤 테 밑 그늘 · 테 쪽 삐죽 풀잎
//  ringOf(식물, 뒤 그림) = 밑동 둘레 울퉁불퉁한 갈색 흙 자리(가장자리는 풀이 군데군데 덮음) + 자갈 몇 알 + 밑동에 닿은 그늘(식물 뒤) ·
//                          front = 흙 자리 앞 테두리 풀잎 몇 가닥(밑동 앞 — 밑동이 풀 사이에서 나옴)
//  bareOf(식물, 기본 화분 뒤) = 식물 그림에 구워 둔 옛 흙 덮기(보랏빛 흙 무늬 · 닿은 그림자 — tools/pixel/big/potblend.mjs soilCover)를 걷어 낸 판:
//                          흙 덮기 칸 = 기본 각도 화분 뒤 그림의 그 칸 그대로(또는 ×0.68 · ×0.84 그늘) → 지우면 밑에 깐 흙 자리 · 풀이 보임
//  dirtOf(식물, 기본 화분 뒤) = 같은 칸을 지우지 않고 갈색 흙(DIRT)으로 다시 칠한 판 — 스마트팜 잔디 판(앉힌 만큼 올려 그려 흙 덮기 띠가 보임)
//  모두 96×112 판(식물은 시트 한 장)을 한 번 만들어 두고 다시 씀 — 그리는 순서: 화분 뒤 → cap → ring → 식물 under(bare) → front → 화분 앞 → over
import { GRASS, POT_SOIL, DIRT, GRAVEL } from './palette.js';

const W = 96, H = 112;
const hsh = (a, b, c) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sm = t => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 부드러운 결 소음(칸 sx × sy 격자 위 값을 이어 붙임) — 옆으로 긴 얼룩
function vnoise(x, y, sx, sy, seed) {
  const fx = x / sx, fy = y / sy, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
  const a = hsh(ix, iy, seed), b = hsh(ix + 1, iy, seed), c = hsh(ix, iy + 1, seed), d = hsh(ix + 1, iy + 1, seed);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}
const hex = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const SOIL_RGB = POT_SOIL.map(hex), DIRT_RGB = DIRT.map(hex);
// 흙 덮기 무늬 색인지(화분 흙 색 × 1 · 0.84 · 0.68 — stripCover 와 같은 셈) — 색 변종(art/shiny.js)이 이 색은 안 바꿈(그래야 흙 덮기를 그대로 찾음)
export const soilish = (r, g, b) => SOIL_RGB.some(([R, G, B]) => [1, 0.84, 0.68].some(f => Math.abs(r - Math.round(R * f)) <= 2 && Math.abs(g - Math.round(G * f)) <= 2 && Math.abs(b - Math.round(B * f)) <= 2));
let tmpC = null;
function pixelsOf(im, sx = 0, sy = 0) {   // 그림(또는 시트의 한 칸 96×112)의 RGBA
  if (!tmpC) tmpC = document.createElement('canvas');
  tmpC.width = W; tmpC.height = H;
  const c = tmpC.getContext('2d', { willReadFrequently: true });
  c.clearRect(0, 0, W, H); c.drawImage(im, sx, sy, W, H, 0, 0, W, H);
  return c.getImageData(0, 0, W, H).data;
}
function canvasOf(put) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), img = c.createImageData(W, H);
  put((x, y, col) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4, [r, g, b] = hex(col); img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255; });
  c.putImageData(img, 0, 0);
  return cv;
}
// 흙 칸 틀(화분 뒤 그림에서 흙 색표인 칸) + 행 범위
const maskCache = new WeakMap();
function soilMask(back) {
  let m = maskCache.get(back); if (m) return m;
  const d = pixelsOf(back), M = new Uint8Array(W * H);
  let y0 = H, y1 = -1, x0 = W, x1 = -1;
  for (let y = 40; y < 100; y++) for (let x = 8; x < 88; x++) {
    const k = (y * W + x) * 4; if (d[k + 3] < 128) continue;
    if (SOIL_RGB.some(([r, g, b]) => d[k] === r && d[k + 1] === g && d[k + 2] === b)) { M[y * W + x] = 1; y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  }
  // 흙 덩어리에 안 붙은 외딴 칸(화분 테의 어두운 테두리 칸 등)은 뺌 — 4이웃 중 흙이 하나 이하
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; if (M[i] && (M[i - 1] || 0) + (M[i + 1] || 0) + (M[i - W] || 0) + (M[i + W] || 0) <= 1) M[i] = 2; }
  for (let i = 0; i < W * H; i++) if (M[i] === 2) M[i] = 0;
  m = { M, y0, y1, x0, x1, d, opaque: i => d[i * 4 + 3] >= 128 };
  maskCache.set(back, m); return m;
}
// ① 잔디 마개
const capCache = new WeakMap();
export function capOf(back) {
  if (!back) return null;
  let cv = capCache.get(back); if (cv) return cv;
  const S = soilMask(back), { M, y0, y1 } = S, span = Math.max(1, y1 - y0), thin = span <= 4, seed = 7;
  cv = canvasOf(put => {
    for (let y = y0; y <= y1; y++) for (let x = S.x0; x <= S.x1; x++) {
      const i = y * W + x; if (!M[i]) continue;
      const k = (y - y0) / span;
      let c = k > 0.7 ? 6 : k > 0.3 ? 5 : 4;                                  // 스마트팜 잔디와 같은 띠(뒤 → 앞 밝게)
      const blob = vnoise(x, y, thin ? 7 : 6, thin ? 2 : 2.6, seed);          // 옆으로 긴 얼룩 — 띠가 자로 잰 듯 곧지 않게
      if (blob > 0.68) c += 1; else if (blob < 0.3) c -= 1;
      if (!M[i - W]) c = Math.min(c, 3); else if (!M[i - 2 * W]) c = Math.min(c, 4);   // 뒤 테 밑 = 그늘(두 줄)
      const v = hsh(x, y, seed);
      if (v > 0.9) c = Math.max(c, 7) + (v > 0.985 ? 1 : 0);                  // 풀잎 점은 드문드문(빽빽하면 자글자글)
      else if (v < 0.04) c = Math.min(c, 3);
      put(x, y, GRASS[clamp(c, 2, 8)]);
    }
    // 뒤 테 쪽 위로 삐죽 풀잎(안쪽 벽 앞 — 1칸, 가끔 2칸) — 얇은 각도(대기실 12°)는 1칸만
    for (let x = S.x0; x <= S.x1; x++) {
      let yt = -1; for (let y = y0; y <= y1; y++) if (M[y * W + x]) { yt = y; break; }
      if (yt < 0) continue;
      const v = hsh(x, 3, 31); if (v < 0.6) continue;
      const h = !thin && v > 0.92 ? 2 : 1;
      for (let j = 1; j <= h; j++) if (S.opaque((yt - j) * W + x)) put(x, yt - j, GRASS[j === h ? 5 : 4]);
    }
  });
  capCache.set(back, cv); return cv;
}
// 밑동 자리 재기: 식물 under 층 첫 장에서 흙 줄 바로 위 줄의 밑동 덩어리(가운데에 가장 가까운) — [왼쪽, 오른쪽, 아래 끝 줄]
function stemOf(P) {
  const m = P.meta, d = pixelsOf(P.sheet, 0, 0), ys = Math.round(m.soil[1]), cx = Math.round(m.soil[0]);
  const soilish = k => SOIL_RGB.some(([r, g, b]) => Math.abs(d[k] - r) + Math.abs(d[k + 1] - g) + Math.abs(d[k + 2] - b) < 24);
  for (let y = ys; y >= ys - 8; y--) {   // 흙 덮기 칸(흙 색)은 밑동으로 안 셈
    const on = x => { const k = (y * W + x) * 4; return d[k + 3] >= 128 && !soilish(k); };
    let best = null;
    for (let x = cx - 24; x <= cx + 24; x++) {
      if (!on(x)) continue;
      let r = x; while (r + 1 <= cx + 24 && on(r + 1)) r++;
      const dist = x <= cx && r >= cx ? 0 : Math.min(Math.abs(x - cx), Math.abs(r - cx));
      if (!best || dist < best.dist) best = { l: x, r, dist };
      x = r;
    }
    if (best && best.dist <= 8) return [best.l, best.r, y];
  }
  return [cx - 2, cx + 2, ys];
}
// ② 밑동 흙 자리 + 앞 풀잎 — 화분(뒤 그림 흙 칸 안) · 잔디 판(bed — 칸 틀 없음)
const ringCache = new Map();
function ringOf2(P, key, back) {
  const id = key + '|' + (back ? (back.src || back.width + 'x' + back.height + ':' + (ringCache.size)) : 'bed');
  let r = ringCache.get(id); if (r) return r;
  const [l, rr, sy] = stemOf(P), S = back ? soilMask(back) : null, span = S ? Math.max(1, S.y1 - S.y0) : 6;
  const cx = (l + rr + 1) / 2, rx = Math.max(5, (rr - l + 1) / 2 + 4), k = S ? Math.min(0.42, (span + 1) / Math.max(1, S.x1 - S.x0 + 1) * 1.15) : 0.3, ry = Math.max(1.5, rx * k);
  const cy = S ? Math.min(sy + 0.5, S.y1 - ry * 0.4) : sy + 0.5, seed = key.length * 13 + (back ? 1 : 2);
  const inside = (x, y) => {
    if (S && !S.M[y * W + x]) return false;
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, a = Math.atan2(dy, dx);
    return Math.hypot(dx, dy) < 0.86 + 0.32 * vnoise(Math.cos(a) * 3 + 9, Math.sin(a) * 3 + 9, 1.3, 1.3, seed);
  };
  const ring = canvasOf(put => {
    for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge && hsh(x, y, seed + 77) < 0.3) continue;                          // 가장자리는 풀이 군데군데 덮음(자로 그은 테두리가 안 보이게)
      const v = hsh(x, y, seed), near = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      let c = v > 0.97 ? 4 : v > 0.86 ? 3 : v < 0.1 ? 1 : 2;                    // 갈색 흙 · 군데군데 밝은 부스러기
      if (!inside(x, y - 1)) c = Math.min(c, 1);                                  // 흙 자리 뒤 가장자리 = 풀 그늘
      if (near < 0.42) c = Math.min(c, 1);                                        // 밑동 둘레 = 그늘
      put(x, y, DIRT[c]);
    }
    // 밑동에 닿은 그늘(밑동 양옆 두 칸)
    for (const [x, c] of [[l - 1, 0], [l - 2, 1], [rr + 1, 0], [rr + 2, 1]]) for (const y of [sy, sy + 1]) if (inside(x, y)) put(x, y, DIRT[c]);
    // 자갈: 흙 자리 앞쪽 반(밑동에 안 가리는 쪽) 가장자리에 두세 알(밝은 칸 + 몸 칸 + 아래 그늘)
    let n = 0;
    for (let t = 0; t < 60 && n < 3; t++) {
      const a = (0.08 + 0.84 * hsh(t, seed, 71)) * Math.PI, q = 0.55 + 0.35 * hsh(t, seed, 73), x = Math.round(cx + Math.cos(a) * rx * q), y = Math.round(cy + Math.sin(a) * ry * q);
      if (!inside(x, y) || !inside(x + 1, y) || (x >= l - 2 && x <= rr + 2)) continue;
      put(x, y, GRAVEL[3]); put(x + 1, y, GRAVEL[2]); if (ry >= 2 && inside(x, y + 1)) put(x + (hsh(t, seed, 79) > 0.5 ? 1 : 0), y + 1, GRAVEL[0]);
      n++;
    }
  });
  // 앞 풀잎: 흙 자리 앞 테두리 바로 아래에서 위로 1~3칸(얇은 각도는 1~2칸) — 밑동 앞에 겹쳐 그림
  const front = canvasOf(put => {
    const hmax = ry < 1.6 ? 2 : 3;
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      let yb = -1; for (let y = Math.ceil(cy + ry + 1); y >= Math.floor(cy - ry); y--) if (inside(x, y)) { yb = y; break; }
      if (yb < 0) continue;
      const v = hsh(x, 5, seed), onStem = x >= l && x <= rr;
      if (v < (onStem ? 0.35 : 0.55)) continue;
      const h = 1 + Math.floor(hsh(x, 9, seed) * hmax), base = yb + 1;
      if (S && !S.M[base * W + x] && !S.M[(base - 1) * W + x]) continue;
      for (let j = 0; j < h; j++) put(x + (j === h - 1 && hsh(x, 11, seed) > 0.7 ? (hsh(x, 13, seed) > 0.5 ? 1 : -1) : 0), base - j, GRASS[j === h - 1 ? 7 : j ? 6 : 5]);
    }
  });
  r = { ring, front };
  if (ringCache.size > 200) ringCache.clear();
  ringCache.set(id, r); return r;
}
export const ringOf = (P, key, back) => (P && back ? ringOf2(P, key, back) : null);
export const bedOf = (P, key) => (P ? ringOf2(P, key, null) : null);
// ③ 옛 흙 덮기를 걷어 낸(bare) · 갈색으로 다시 칠한(dirt) 식물 시트(under 칸만 — over 는 화분 앞에 나온 덩어리라 흙 덮기가 없음)
const bareCache = new WeakMap(), dirtCache = new WeakMap();
export const bareOf = (P, back) => stripCover(P, back, bareCache, false);
export const dirtOf = (P, back) => stripCover(P, back, dirtCache, true);
function stripCover(P, back, cache, dirt) {
  if (!P || !back) return null;
  let cv = cache.get(P.sheet); if (cv) return cv;
  const m = P.meta, S = soilMask(back), bd = S.d, sh = P.sheet;
  cv = document.createElement('canvas'); cv.width = sh.width; cv.height = sh.height;
  const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(sh, 0, 0);
  const img = c.getImageData(0, 0, cv.width, cv.height), d = img.data, SW = cv.width, row0 = Math.max(S.y0, Math.floor(m.soil[1]) - 2);
  for (let fy = 0; fy < m.rows; fy++) for (let fx = 0; fx < m.cols; fx++) {
    const ox = fx * m.w, oy = fy * m.h;
    for (let y = row0; y <= S.y1; y++) for (let x = S.x0; x <= S.x1; x++) {
      if (!S.M[y * W + x]) continue;
      const k = ((oy + y) * SW + ox + x) * 4; if (d[k + 3] < 128) continue;
      const b = (y * W + x) * 4;
      for (const f of [1, 0.68, 0.84]) if (Math.abs(d[k] - Math.round(bd[b] * f)) <= 1 && Math.abs(d[k + 1] - Math.round(bd[b + 1] * f)) <= 1 && Math.abs(d[k + 2] - Math.round(bd[b + 2] * f)) <= 1) {
        if (!dirt) { d[k + 3] = 0; break; }
        const si = SOIL_RGB.findIndex(([r, g2, b2]) => r === bd[b] && g2 === bd[b + 1] && b2 === bd[b + 2]), di = Math.max(0, Math.min(4, (si < 0 ? 2 : si) - (f < 1 ? (f < 0.8 ? 2 : 1) : 0)));
        const [r, g2, b2] = DIRT_RGB[di]; d[k] = r; d[k + 1] = g2; d[k + 2] = b2; break;
      }
    }
  }
  c.putImageData(img, 0, 0);
  cache.set(P.sheet, cv); return cv;
}
