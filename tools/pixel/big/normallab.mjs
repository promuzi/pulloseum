// 노멀맵 조명 시험(2026-10-22 사용자 "이것처럼 다른 식물들도 적용할 수 있나? 앰버캑터 얘도 자신의 불에 빛 영향을 받고 그랬음 좋겠는데
//  각 공격과 피격 등이나 여러가지로. 적용가능한 곳 알아보고 조사해 · 사양이 많이 필요한지도") — 게임에는 아직 안 넣음, 조사용
//   node tools/pixel/big/normallab.mjs [--sec=4]  → out/normal/light_lab.mp4 · light_lab_still.png · <키>_normal.png · 걸린 시간
//  노멀맵 = 그림에서 바로 만듦(다른 그림 · 내려받기 없음): 실루엣 안쪽까지의 거리로 '부푼 높이'(작은 둥글림 + 큰 둥글림) + 밝기의 잔 결 조금
//   — 밝기만으로 높이를 잡으면 그려 둔 그늘이 '골'로 읽힘(sprite-ai.art 비교 글), 그래서 모양(실루엣) 위주
//  빛 = 그려 둔 명암은 두고 그 위에 빛 색을 곱함(원래 그림에 그늘이 그려져 있어 '진짜 다시 칠하기'는 안 맞음) · 빛 단계는 몇 개로 끊어 도트 느낌 유지
//  윗줄(엠버캑터): 원본 | 밤 + 자기 불빛 | 색 변종 A(파란 불 → 파란 빛) | 피격(번개 번쩍 → 불덩이가 날아와 터짐)
//  아랫줄(다른 식물): 초롱바인 등불 빛(밤) | 어둠 속 빛이 한 바퀴(가이아록 · 드레이크캑터 · 마이너캡)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG, Img } from './engine.mjs';
import { writeMP4 } from './video.mjs';
import { toLch, recolorData, eyeKeep } from '../../../v2/src/art/shinyColor.js';
import { soilish } from '../../../v2/src/art/potgrass.js';
import { SHINY_RULES } from '../../../v2/src/art/shinyRules.js';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..'), OUT = resolve(here, 'out', 'normal');
const SEC = +((process.argv.find(a => a.startsWith('--sec=')) || '--sec=4').slice(6));
mkdirSync(OUT, { recursive: true });
const W = 96, H = 112, N = W * H;
function sheet(key, shinyV = null) {
  const im = decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'plants', key + '.png'))), m = JSON.parse(readFileSync(resolve(repo, 'assets', 'v2', 'plants', key + '.json'), 'utf8'));
  let data = im.data;
  if (shinyV) { data = new Uint8ClampedArray(im.data); recolorData(data, SHINY_RULES[key][shinyV], eyeKeep(im.data, im.w, m), soilish, { W: im.w, w: m.w, h: m.h, cols: m.cols, rows: m.rows }); }
  return { key, im, m, data, cache: new Map() };
}
// 한 장(앞 층이 위) 합치기 → RGBA w×h
function frameOf(S, f) {
  const { im, m, data } = S, o = new Uint8ClampedArray(N * 4), ox = (f % m.cols) * W, oy = Math.floor(f / m.cols) * H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (const L of [0, 1]) {
    const s = ((oy + L * m.rows * H + y) * im.w + ox + x) * 4; if (data[s + 3] < 128) continue;
    const d = (y * W + x) * 4; o[d] = data[s]; o[d + 1] = data[s + 1]; o[d + 2] = data[s + 2]; o[d + 3] = 255;
  }
  return o;
}
// 노멀맵: 거리 변환(체스판 3-4) → 둥글림 높이 + 밝기 잔 결 → 기울기
function normalsOf(rgba) {
  const INF = 1e9, d = new Float32Array(N);
  for (let i = 0; i < N; i++) d[i] = rgba[i * 4 + 3] ? INF : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
  const bev = (dd, R) => { const t = Math.min(1, dd / R); return Math.sqrt(1 - (1 - t) * (1 - t)); };
  const lum = new Float32Array(N), h0 = new Float32Array(N);
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3]) lum[i] = toLch(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2])[0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!rgba[i * 4 + 3]) continue;
    let s = 0, n = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X < 0 || Y < 0 || X >= W || Y >= H || !rgba[(Y * W + X) * 4 + 3]) continue; s += lum[Y * W + X]; n++; }
    const dd = d[i] / 3;
    h0[i] = 2.5 * bev(dd, 3) + 9 * bev(dd, 16) + 2 * (lum[i] - s / n);
  }
  const hgt = new Float32Array(N);   // 한 번 흐리게(계단 줄이기)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; s += h0[Y * W + X]; n++; } hgt[y * W + x] = rgba[(y * W + x) * 4 + 3] ? s / n : 0; }
  const nm = new Float32Array(N * 3), g = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : hgt[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, dx = (g(x + 1, y) - g(x - 1, y)) / 2, dy = (g(x, y + 1) - g(x, y - 1)) / 2, l = Math.hypot(dx, dy, 1);
    nm[i * 3] = -dx / l; nm[i * 3 + 1] = -dy / l; nm[i * 3 + 2] = 1 / l;
  }
  return nm;
}
// 빛나는 칸(제 빛은 안 받음)과 빛 자리: 엠버캑터 = 불꽃(머리 · 양팔) · 초롱바인 = 등불 천 · 그 밖 = 없음
function lightSpots(key, rgba) {
  const emit = new Uint8Array(N), spots = [];
  let t = H, b = -1, l = W, r = -1;
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3]) { const x = i % W, y = (i / W) | 0; if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
  const acc = new Map(), add = (k, x, y) => { const a = acc.get(k) || [0, 0, 0]; a[0] += x; a[1] += y; a[2]++; acc.set(k, a); };
  for (let i = 0; i < N; i++) {
    if (!rgba[i * 4 + 3]) continue;
    const [L, C, Hh] = toLch(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]), x = i % W, y = (i / W) | 0, fx = (x - l) / (r - l), fy = (y - t) / (b - t);
    if (key === 'cactus_fire') {
      const hot = Hh >= 45 && Hh <= 115 && L >= 0.6 && C >= 0.1, warm = ((Hh >= 20 && Hh <= 115) || Hh >= 230) && L >= 0.5 && C >= 0.1;
      if (fy <= 0.38 && fx > 0.3 && fx < 0.7 && warm) { emit[i] = 1; add('head', x, y); }
      else if ((fx <= 0.15 || fx >= 0.88) && fy < 0.6 && (hot || (warm && L >= 0.75))) { emit[i] = 1; add(fx < 0.5 ? 'armL' : 'armR', x, y); }
    } else if (key === 'lantern_vine') {
      const fabric = ((Hh >= 340 || Hh <= 40) || (Hh >= 240 && Hh <= 290)) && C >= 0.12 && L >= 0.35, glow = C < 0.04 && L > 0.85;
      if (fx >= 0.55 && fy > 0.25 && fy < 0.62 && (fabric || glow)) { emit[i] = 1; add('lamp', x, y); }
    }
  }
  for (const [k, [sx, sy, n]] of acc) if (n >= 3) spots.push({ k, x: sx / n, y: sy / n, n });
  return { emit, spots, box: [l, t, r, b] };
}
// 빛 입히기: out = 원래 × (어둠 + 곱빛) + 아주 조금 더하기 — 빛은 단계로 끊음(도트 느낌)
const STEPS = 6;
function lit(rgba, nm, emit, lights, amb) {
  const o = new Uint8ClampedArray(rgba);
  for (let i = 0; i < N; i++) {
    if (!rgba[i * 4 + 3] || (emit && emit[i])) continue;
    const x = i % W, y = (i / W) | 0, nx = nm[i * 3], ny = nm[i * 3 + 1], nz = nm[i * 3 + 2];
    let lr = 0, lg = 0, lb = 0;
    for (const Lt of lights) {
      const vx = Lt.x - x, vy = Lt.y - y, vz = Lt.z, dl = Math.hypot(vx, vy, vz), ndl = Math.max(0, (nx * vx + ny * vy + nz * vz) / dl);
      const k = Lt.I * ndl / (1 + (dl / Lt.r) ** 2);
      lr += Lt.c[0] * k; lg += Lt.c[1] * k; lb += Lt.c[2] * k;
    }
    const q = v => Math.round(Math.min(1.5, v) * STEPS) / STEPS;
    lr = q(lr); lg = q(lg); lb = q(lb);
    o[i * 4] = rgba[i * 4] * (amb + 1.2 * lr) + 22 * lr; o[i * 4 + 1] = rgba[i * 4 + 1] * (amb + 1.2 * lg) + 22 * lg; o[i * 4 + 2] = rgba[i * 4 + 2] * (amb + 1.2 * lb) + 22 * lb;
  }
  return o;
}
const hashf = n => { let h = Math.imul(n | 0, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const flick = t => 0.82 + 0.12 * Math.sin(t * 9.1) + 0.08 * (hashf(Math.floor(t * 14)) - 0.5) * 2;
const ORANGE = [1, 0.62, 0.25], BLUE = [0.35, 0.65, 1], WHITE = [0.85, 0.9, 1], WARM = [1, 0.8, 0.55];
let tNorm = 0, nNorm = 0, tLit = 0, nLit = 0;
const prep = (S, f) => { let v = S.cache.get(f); if (!v) { const t0 = performance.now(), rgba = frameOf(S, f), nm = normalsOf(rgba); tNorm += performance.now() - t0; nNorm++; v = { rgba, nm, ls: lightSpots(S.key, rgba) }; S.cache.set(f, v); } return v; };
const doLit = (...a) => { const t0 = performance.now(), o = lit(...a); tLit += performance.now() - t0; nLit++; return o; };
const fire = sheet('cactus_fire'), fireA = sheet('cactus_fire', 'A'), lamp = sheet('lantern_vine'), others = ['gaia', 'drake_cactus', 'miner_cap'].map(k => sheet(k));
const selfFire = (ls, c, I = 1) => ls.spots.map(s => s.k === 'head' ? { x: s.x, y: s.y - 4, z: 14, r: 34, c, I: 1.15 * I } : { x: s.x, y: s.y - 2, z: 8, r: 14, c, I: 0.7 * I });
const fps = 20, nF = Math.round(SEC * fps), Z = 3, PAD = 6, PW = W * Z, PH = H * Z, OW = 4 * PW + 5 * PAD, OH = 2 * PH + 3 * PAD;
const frames = [];
for (let k = 0; k < nF; k++) {
  const t = k / fps, fOf = S => Math.floor((t * 1000) / S.m.frameMs) % S.m.frames, fl = flick(t);
  const A = prep(fire, fOf(fire)), B = prep(fireA, fOf(fireA));
  const hit = [];
  if (t >= 1.0 && t < 1.35) { const a = 1 - (t - 1.0) / 0.35; hit.push({ x: -10, y: -6, z: 30, r: 120, c: WHITE, I: 2.2 * a * (hashf(k) > 0.25 ? 1 : 0.4) }); }
  if (t >= 2.0 && t < 2.6) { const p = (t - 2.0) / 0.6; hit.push({ x: W + 30 - p * 40, y: 46, z: 10, r: 26, c: ORANGE, I: 1.6 }); }
  if (t >= 2.6 && t < 3.1) { const a = 1 - (t - 2.6) / 0.5; hit.push({ x: W - 14, y: 48, z: 6, r: 30, c: [1, 0.55, 0.2], I: 2.6 * a }); }
  const row1 = [A.rgba, doLit(A.rgba, A.nm, A.ls.emit, selfFire(A.ls, ORANGE, fl), 0.5), doLit(B.rgba, B.nm, B.ls.emit, selfFire(B.ls, BLUE, fl), 0.5), doLit(A.rgba, A.nm, A.ls.emit, [...selfFire(A.ls, ORANGE, fl * 0.5), ...hit], 0.85)];
  const Lp = prep(lamp, fOf(lamp)), lampLights = Lp.ls.spots.map(s => ({ x: s.x, y: s.y, z: 10, r: 40, c: WARM, I: 1.3 * fl }));
  const ang = t * 1.6, orbit = S => { const P = prep(S, fOf(S)), [l, tt, r, b] = P.ls.box, cx = (l + r) / 2, cy = (tt + b) / 2; return doLit(P.rgba, P.nm, null, [{ x: cx + Math.cos(ang) * 46, y: cy + Math.sin(ang) * 34, z: 16, r: 60, c: WHITE, I: 1.6 }], 0.35); };
  const row2 = [doLit(Lp.rgba, Lp.nm, Lp.ls.emit, lampLights, 0.42), ...others.map(orbit)];
  const o = new Img(OW, OH, '#121622');
  [row1, row2].forEach((row, ry) => row.forEach((px, j) => {
    const x0 = PAD + j * (PW + PAD), y0 = PAD + ry * (PH + PAD);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + x) * 4; if (!px[s + 3]) continue; for (let v = 0; v < Z; v++) for (let u = 0; u < Z; u++) { const d = ((y0 + y * Z + v) * OW + x0 + x * Z + u) * 4; o.data[d] = px[s]; o.data[d + 1] = px[s + 1]; o.data[d + 2] = px[s + 2]; o.data[d + 3] = 255; } }
  }));
  // 불덩이 · 도는 빛 자리 표시(작은 점)
  const dotAt = (j, ry, cx, cy, col, R = 2) => { const x0 = PAD + j * (PW + PAD), y0 = PAD + ry * (PH + PAD); for (let v = -R; v <= R; v++) for (let u = -R; u <= R; u++) if (u * u + v * v <= R * R) { const X = Math.round(cx + u), Y = Math.round(cy + v); if (X < 0 || X >= W || Y < 0 || Y >= H) continue; for (let b2 = 0; b2 < Z; b2++) for (let a2 = 0; a2 < Z; a2++) o.set(x0 + X * Z + a2, y0 + Y * Z + b2, u * u + v * v <= 1 ? '#ffffff' : col); } };
  if (t >= 2.0 && t < 2.6) dotAt(3, 0, W + 30 - ((t - 2.0) / 0.6) * 40, 46, '#ff8a2a');
  others.forEach((S, j) => { const P = prep(S, fOf(S)), [l, tt, r, b] = P.ls.box; dotAt(j + 1, 1, (l + r) / 2 + Math.cos(ang) * 46, (tt + b) / 2 + Math.sin(ang) * 34, '#cfe0ff', 1); });
  frames.push(o);
}
console.log(`노멀맵 만들기: 한 장 평균 ${(tNorm / nNorm).toFixed(2)}ms (${nNorm}장 — 시트 하나 68장이면 약 ${Math.round((tNorm / nNorm) * 68)}ms, 한 번만)`);
console.log(`빛 입히기: 한 식물 한 장 평균 ${(tLit / nLit).toFixed(3)}ms (${W}×${H} · 빛 1~6개)`);
// 노멀맵 보기(원본 | 색 = 방향): 엠버캑터 · 초롱바인 · 가이아록
{ const show = [fire, lamp, others[0]].map(S => prep(S, 0)), big = new Img((W * 3 * 2 + 8) , H * 3 * show.length + 6 * (show.length - 1), '#121622');
  show.forEach((A, r) => { const nmc = new Uint8ClampedArray(N * 4); for (let i = 0; i < N; i++) { if (!A.rgba[i * 4 + 3]) continue; nmc[i * 4] = (A.nm[i * 3] * 0.5 + 0.5) * 255; nmc[i * 4 + 1] = (-A.nm[i * 3 + 1] * 0.5 + 0.5) * 255; nmc[i * 4 + 2] = A.nm[i * 3 + 2] * 255; nmc[i * 4 + 3] = 255; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + x) * 4; for (const [src, x0] of [[A.rgba, 0], [nmc, W * 3 + 8]]) { if (!src[s + 3]) continue; for (let v = 0; v < 3; v++) for (let u = 0; u < 3; u++) { const d = ((r * (H * 3 + 6) + y * 3 + v) * big.w + x0 + x * 3 + u) * 4; big.data[d] = src[s]; big.data[d + 1] = src[s + 1]; big.data[d + 2] = src[s + 2]; big.data[d + 3] = 255; } } } });
  writeFileSync(resolve(OUT, 'light_lab_normal.png'), encodePNG(big.w, big.h, big.data)); }
// 멈춘 장 넷(평소 · 번개 번쩍 · 불덩이 다가옴 · 터짐) 세로로
{ const pick = [0.5, 1.05, 2.4, 2.65].map(s => Math.min(frames.length - 1, Math.round(s * fps))), st = new Img(OW, OH * pick.length, '#121622');
  pick.forEach((k, j) => st.data.set(frames[k].data, j * OW * OH * 4));
  writeFileSync(resolve(OUT, 'light_lab_still.png'), encodePNG(st.w, st.h, st.data)); }
writeMP4(resolve(OUT, 'light_lab.mp4'), frames, { delay: 100 / fps, loops: 2 });
