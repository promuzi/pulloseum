// 콜로세움 하늘·관중을 살아 있게(2026-10-15 사용자 "투명한 돔, 관중석 밖은 우주, 다양한 종족, 떠다니는 비행체"):
//  ① 돔 너머 우주 칸에만(그림에서 어둡고 푸른 칸 = 하늘 — 돔 살·관중석·기둥 앞엔 안 그림) 작은 비행체들이 저마다 깊이·속도로 지나감
//     (먼 것은 어둡고 느리게, 가까운 것은 밝고 빠르게, 항해등 깜빡임·엔진 빛). 한 칸씩만 움직여 도트가 번지지 않게.
//  ② 하늘의 밝은 별 몇 개가 엇갈린 박자로 반짝 ③ 관중석에 가끔 사진 불빛이 톡(작은 흰 점 + 십자 빛 한 번)
import { rng } from './sky.js';
import { MOTION, slow } from '../core/motion.js';

// 작은 도트 비행체(문자 격자, 오른쪽을 향함): o 외곽 · b 몸 · h 밝은 면 · w 창 · e 엔진 빛 · r·g 항해등
// (처음엔 8칸 남짓에 어두워 거의 안 보였음 → 7~17칸 · 가까운 것은 밝은 은회색 + 창 불빛 + 엔진 꼬리)
const SHIPS = [
  ['....ooooo....', '..ohhhhhhho..', 'obbwbbwbbwbbo', '.ooooooooooo.', '...r.....g...'],   // 접시
  ['e..ooooooo....', 'eeohhhhhhhoo..', 'eobbbwbwbbbbbo', 'e.ooooooooooo.'],   // 셔틀
  ['.ooo..', 'ohhhoo', 'obwbbo', '.r..g.'],   // 작은 드론
  ['......oooo......', '..oooohhhhoooo...', 'eeobbbbbbbbbbbboo', 'e.oooooooooooooo.', '...r.........g...'],   // 화물선
  ['e..ooooo...', 'eeohhhhhoo.', 'e.ooooooooo'],   // 경주선
];
const SHIPS_N = SHIPS.map(rows => { const w = Math.max(...rows.map(r => r.length)); return rows.map(r => r.padEnd(w, '.')); });   // 줄 길이 맞춤(좌우 뒤집을 때 어긋나지 않게)
const PAL = [
  { o: '#101828', b: '#3a465c', h: '#56637c', w: '#6fa0c4', e: '#4fa8c8', r: '#c05050', g: '#4fb07a', t: '#2f6a88' },   // 멀리
  { o: '#141c2c', b: '#7c88a0', h: '#c4cee0', w: '#c8f4ff', e: '#a0f4ff', r: '#ff5a4a', g: '#6af0a0', t: '#5ac0dc' },   // 가까이
];
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
let L = null;

function setup(img) {
  const w = img.width, h = Math.min(img.height, 150);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, w, h).data, sky = new Uint8Array(w * h);
  const rows = new Array(h).fill(0), stars = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2], l = lum(R, G, B);
    if ((l < 64 && B >= R - 4) || (l < 118 && B > R + 10)) { sky[y * w + x] = 1; rows[y]++; }   // 어두운 우주 + 푸른 행성·성운(따뜻한 사암 관중석·기둥은 빠짐)
  }
  // 별 = 하늘 칸에 둘러싸인 밝은 칸(작은 점)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = (y * w + x) * 4, l = lum(d[i], d[i + 1], d[i + 2]);
    if (l > 120 && sky[(y - 1) * w + x] && sky[(y + 1) * w + x] && sky[y * w + x - 1] && sky[y * w + x + 1]) stars.push({ x, y, ph: (x * 7 + y * 13) % 17 / 17 * 6.28, per: 1400 + ((x * 31 + y * 17) % 23) * 120 });
  }
  // 하늘 띠(가로로 30% 넘게 하늘인 줄) — 비행체가 다닐 높이
  const band = []; for (let y = 0; y < h; y++) if (rows[y] > w * 0.3) band.push(y);
  const y0 = band.length ? band[0] : 4, y1 = band.length ? band[band.length - 1] : 40;
  // 관중석 = 하늘 띠 아래 ~ 낮은 벽 위(안내판: 그림 칸 60~116)에서 하늘이 아닌 칸
  const crowd = []; for (let y = Math.max(y1 + 2, 58); y < Math.min(h, 116); y++) for (let x = 2; x < w - 2; x += 1) if (!sky[y * w + x]) crowd.push(y * w + x);
  const mk = document.createElement('canvas'); mk.width = w; mk.height = h;
  const mc = mk.getContext('2d'), md = mc.createImageData(w, h);
  for (let i = 0; i < w * h; i++) if (sky[i]) md.data[i * 4 + 3] = 255;
  mc.putImageData(md, 0, 0);
  const lay = document.createElement('canvas'); lay.width = w; lay.height = h;
  const S = { img, w, h, sky, y0, y1, crowd, stars, mk, lay, lc: lay.getContext('2d'), r: rng(4242), ships: [], flashes: [], nextFlash: 0, t0: null };
  for (let k = 0; k < 6; k++) S.ships.push(spawn(S, true));
  return S;
}
function spawn(S, anywhere) {
  const r = S.r, near = r() < 0.4 ? 1 : 0, dir = r() < 0.5 ? 1 : -1, sh = SHIPS_N[Math.floor(r() * SHIPS_N.length)];
  const y = Math.round(S.y0 + 3 + r() * Math.max(4, S.y1 - S.y0 - 8));
  const speed = near ? 7 + r() * 6 : 2 + r() * 3;   // 칸/초
  const x = anywhere ? r() * S.w : dir > 0 ? -14 : S.w + 2;
  return { sh, near, dir, y, speed, x0: x, born: null, blink: 700 + r() * 700, wait: anywhere ? 0 : 800 + r() * 5000 };
}

// 경기장 그림 위(같은 원점 ox, oy)에 살아 있는 것들을 얹음
export function arenaLife(g, img, ox, oy, t) {
  if (!img) return;
  if (!L || L.img !== img) L = setup(img);
  const S = L, c = S.lc;
  if (S.t0 == null) S.t0 = t;
  // ① 비행체(하늘 칸에만)
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, S.w, S.h);
  for (let i = 0; i < S.ships.length; i++) {
    const v = S.ships[i];
    if (v.born == null) v.born = t + v.wait;
    const a = (t - v.born) / 1000; if (a < 0) continue;
    const x = Math.round(v.x0 + v.dir * v.speed * a);
    if (x < -20 || x > S.w + 20) { S.ships[i] = spawn(S, false); continue; }
    const P = PAL[v.near], rows = v.sh, wd = Math.max(...rows.map(r => r.length)), on = Math.floor((t - v.born) / v.blink) % 2 === 0;
    // 엔진 꼬리: 뒤로 점점 옅은 점(한 칸 건너)
    const ey = v.y + 1 + (rows.length > 3 ? 1 : 0), tail = v.near ? 7 : 4;
    for (let k = 1; k <= tail; k++) if ((k + Math.floor(t / (80 * slow(3)))) % 2) { c.fillStyle = k < tail / 2 ? P.e : P.t; c.fillRect(v.dir > 0 ? x - k : x + wd - 1 + k, ey, 1, 1); }
    for (let j = 0; j < rows.length; j++) for (let k = 0; k < wd; k++) {
      const ch = rows[j][v.dir > 0 ? k : wd - 1 - k] || '.'; if (ch === '.') continue;
      if ((ch === 'r' || ch === 'g') && !on) continue;
      if (!MOTION.calm && ch === 'e' && (Math.floor(t / 90) + i) % 3 === 0) continue;   // 엔진 빛 떨림
      c.fillStyle = P[ch]; c.fillRect(x + k, v.y + j, 1, 1);
    }
  }
  c.globalCompositeOperation = 'destination-in'; c.drawImage(S.mk, 0, 0); c.globalCompositeOperation = 'source-over';
  g.c.imageSmoothingEnabled = false; g.c.drawImage(S.lay, ox, oy);
  // ② 별 반짝임
  for (const s of S.stars) { const k = Math.sin(t / (s.per * slow(3)) * 6.283 + s.ph); if (k > 0.75) { g.px(ox + s.x, oy + s.y, '#ffffff'); if (k > 0.95) { g.px(ox + s.x - 1, oy + s.y, '#8fa0c8'); g.px(ox + s.x + 1, oy + s.y, '#8fa0c8'); } } else if (k < -0.6) g.px(ox + s.x, oy + s.y, '#5a6890'); }
  // ③ 관중석 사진 불빛
  if (S.crowd.length && t > S.nextFlash) { const i = S.crowd[Math.floor(S.r() * S.crowd.length)]; S.flashes.push({ x: i % S.w, y: Math.floor(i / S.w), t0: t }); S.nextFlash = t + (250 + S.r() * 900) * slow(3); }   // 차분하게 = 사진 불빛 1/3
  S.flashes = S.flashes.filter(f => t - f.t0 < 140);
  for (const f of S.flashes) { g.px(ox + f.x, oy + f.y, '#ffffff'); if (t - f.t0 < 60) { g.px(ox + f.x - 1, oy + f.y, '#fff2c8'); g.px(ox + f.x + 1, oy + f.y, '#fff2c8'); g.px(ox + f.x, oy + f.y - 1, '#fff2c8'); g.px(ox + f.x, oy + f.y + 1, '#fff2c8'); } }
}
