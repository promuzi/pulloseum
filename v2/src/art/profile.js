// 프로필 배너 · 사용자 아이콘
//  2026-10-22 사용자 "배너(다양하게 늘리거나)나 사용자 아이콘도 맞춰보자 식물 아이콘이 별로야 화분이 없어서인지 배경이 이상해서인지 뭔가 이상해 함 고민해봐" → 아이콘 = 화분째 식물 + 배너 빛이 번지는 방
//  2026-10-23 사용자 "배너도 내가 말한건 아이콘의 테두리가 아니야. 홀로그램창의 디자인을 배너라고 말한거야" → 배너 = 프로필 홀로그램 창 자체의 디자인:
//   바탕(색 · 결) · 무늬 · 테(색 · 모양) · 모서리 장식 · 움직임 · 글자 색이 배너마다 다름(전엔 같은 창에 왼쪽 색 띠 · 아이콘 테 색만 바뀌고 무늬는 거의 안 보였음).
//   열둘 — 하늘(다른 창과 같은 기본 홀로그램) · 노을 · 새싹 · 라벤더(처음부터) · 오로라 Lv3 · 별빛 5 · 성운 8 · 잎맥 10 · 물결 15 · 회로 20 · 황금 25 · 풀로세움 30.
//   번호 = s.profile.color(옛 여덟 0~7 그대로 + 새 넷 8~11) · 열리는 레벨 = catalog.js BANNER_LV · 움직임은 장(phase)마다 한 번 굽고 재사용
import { Gfx } from '../core/gfx.js';
import { BAYER4 } from './palette.js';
import { BIG, POT_BIG, drawBig } from './sprites.js';
import { BANNER_LV } from '../game/catalog.js';
import { T, holo } from './theme.js';

const rgb = h => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
const WHITE = [255, 255, 255];
function rnd(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
const hash2 = (x, y, s) => { let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, s) => vnoise(x, y, s) * 0.58 + vnoise(x * 2.1, y * 2.1, s + 1) * 0.29 + vnoise(x * 4.3, y * 4.3, s + 2) * 0.13;

// ── 무늬 도우미 ──
// 작은 별: s = 0 점 · 1 십자(팔 한 칸) · 2 큰 십자(팔 두 칸)
function star(P, x, y, s, c, arm) { P.set(x, y, c); if (s < 1) return; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { P.tint(x + dx, y + dy, arm, 0.85); if (s > 1) P.tint(x + dx * 2, y + dy * 2, arm, 0.45); } }
// 선(정수 칸 — 브레젠험)
function line(P, x0, y0, x1, y1, fn) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { fn(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
// 네 모서리 안쪽 꺾쇠(L자)
function brackets(P, c, L, inset) { const { w, h } = P; for (const [x0, y0, sx, sy] of [[inset, inset, 1, 1], [w - 1 - inset, inset, -1, 1], [inset, h - 1 - inset, 1, -1], [w - 1 - inset, h - 1 - inset, -1, -1]]) for (let k = 0; k < L; k++) { P.put(x0 + sx * k, y0, c); P.put(x0, y0 + sy * k, c); } }

// ── 배너 열둘(번호 = 저장값 · 순서 바꾸지 말 것) ──
//  col = 테 색(아이콘 테도) · hi/lo = 테 빛/그늘 · glow = 아이콘 방 빛 · dark = 아이콘 방 바깥 · ink = 글자 색(없으면 창 기본) · shape = round | notch | cut
//  bg = [방향(v 세로 · d 비스듬히 · h 가로), 색 멈춤] · N = 움직임 장 수 · ms = 장마다 시간 · paint = 무늬 · orn = 모서리 장식(테 위) · post = 테까지 덮는 빛
const DEFS = [
  { key: 'sky', name: '하늘', holo: true, col: '#8ccfff', hi: '#e6f3ff', lo: '#4f84bf', glow: '#8ccfff', dark: '#0a1220' },
  { key: 'sunset', name: '노을', col: '#f0be7d', hi: '#ffe8c8', lo: '#a8643a', glow: '#ff9a5a', dark: '#1c1132', ink: { main: '#fff6ee', sub: '#ffc8a8' }, shape: 'round', N: 6, ms: 230,
    bg: ['v', [[0, '#1c1132'], [0.5, '#38183e'], [0.8, '#5e2440'], [1, '#7a3438']]],
    paint(P) {   // 지평선에 걸린 큰 해(위 금빛 → 아래 분홍) · 아래쪽 가로 틈이 천천히 아래로 흐름 · 물에 비친 해(점선)
      const { w, h, ph } = P, cx = Math.round(w * 0.58), hz = Math.round(h * 0.8), r = Math.round(h * 0.6), top = [255, 214, 120], midc = [255, 150, 96], bot = [240, 92, 120];
      for (let y = Math.max(1, hz - r); y < hz; y++) for (let x = cx - r; x <= cx + r; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - hz; if (dx * dx + dy * dy > r * r) continue;
        const v = (y - (hz - r)) / r;
        if (v > 0.42 && (((y - ph) % 6) + 6) % 6 < (v > 0.78 ? 2 : 1)) continue;
        P.tint(x, y, v < 0.5 ? mix(top, midc, v / 0.5) : mix(midc, bot, (v - 0.5) / 0.5), 0.42);
      }
      for (let x = 0; x < w; x++) P.tint(x, hz, [255, 180, 128], 0.4);
      for (let k = 1; k <= 3; k++) { const yy = hz + k * 2, half = Math.round(r * (0.75 - k * 0.17)); if (yy >= h - 2) break; for (let x = cx - half; x <= cx + half; x += k % 2 ? 2 : 3) P.tint(x, yy, [255, 160, 112], 0.36 - k * 0.07); }
    } },
  { key: 'sprout', name: '새싹', col: '#9ff0b0', hi: '#e8fff0', lo: '#3f8a54', glow: '#7cf0a0', dark: '#0b2216', ink: { main: '#f2fff6', sub: '#b0ecc4' }, shape: 'round', N: 24, ms: 150,
    bg: ['d', [[0, '#0b2216'], [1, '#1d5532']]],
    paint(P) {   // 바닥 흙 줄 · 새싹(줄기 + 떡잎 두 장 — 바람에 한 칸씩 흔들림) · 사이사이 짧은 풀 · 떠오르는 꽃가루
      const { w, h, ph, N, R } = P, sw = 2 * Math.PI * ph / N, gy = h - 3;
      for (let x = 0; x < w; x++) { P.tint(x, gy, [26, 64, 36], 0.6); if (hash2(x, 1, 5) < 0.18) P.tint(x, gy, [96, 74, 44], 0.5); }
      for (let x = 4; x < w - 4; x += 3 + Math.floor(R() * 5)) { const hb = 2 + Math.floor(R() * 3), lean = Math.round(Math.sin(sw + x * 0.5) * 0.7); for (let k = 1; k <= hb; k++) P.tint(x + (k === hb ? lean : 0), gy - k, k === hb ? [110, 190, 120] : [60, 136, 80], 0.6); }
      for (let x = 12 + Math.floor(R() * 10); x < w - 8; x += 20 + Math.floor(R() * 18)) {
        const sh = Math.max(3, Math.round(h * (0.12 + 0.12 * R()))), lean = Math.sin(sw + x * 0.37) * 1.3;
        for (let k = 1; k <= sh; k++) P.set(x + Math.round(lean * k / sh), gy - k, k > sh - 2 ? [120, 200, 120] : [80, 160, 92]);
        const tx = x + Math.round(lean), ty = gy - sh;
        for (const s of [-1, 1]) { P.set(tx + s, ty, [130, 214, 128]); P.set(tx + 2 * s, ty, [96, 176, 100]); P.set(tx + s, ty - 1, [150, 230, 140]); P.set(tx + 2 * s, ty - 1, [176, 244, 160]); P.set(tx + 3 * s, ty - 1, [130, 214, 128]); }   // 떡잎(위 밝게 · 아래 그늘)
      }
      const n = Math.max(3, Math.round(w / 50)), span = h - 10;
      for (let q = 0; q < n; q++) { const x0 = 6 + Math.round(R() * (w - 12)), y = h - 6 - (((ph + q * 7) % N) * span) / N, x = x0 + Math.round(Math.sin(sw * 2 + q) * 1.2); P.set(x, y, [230, 255, 190]); P.tint(x + 1, y, [230, 255, 190], 0.35); }
    },
    orn(P) { const x = P.w - 6, y = 6; P.put(x, y, [120, 200, 130]); P.put(x, y - 1, [120, 200, 130]); P.put(x - 1, y - 2, [159, 240, 176]); P.put(x - 2, y - 2, [159, 240, 176]); P.put(x - 2, y - 3, [200, 255, 210]); P.put(x + 1, y - 2, [159, 240, 176]); P.put(x + 2, y - 3, [159, 240, 176]); P.put(x + 2, y - 4, [200, 255, 210]); } },
  { key: 'lavender', name: '라벤더', col: '#c8a8f0', hi: '#f4ecff', lo: '#6a4aa8', glow: '#b890f0', dark: '#191330', ink: { main: '#fbf8ff', sub: '#d6c4f4' }, shape: 'round', N: 40, ms: 110,
    bg: ['d', [[0, '#191330'], [1, '#3f2e6c']]],
    paint(P) {   // 몽글몽글한 빛 방울(보케 — 천천히 오르내림) · 비스듬한 빛줄기 둘 · 차례로 반짝이는 별가루 · 가끔 빛이 한 번 쓸고 지나감
      const { w, h, ph, N, R } = P, tt = 2 * Math.PI * ph / N;
      for (let q = 0; q < Math.max(3, Math.round(w / 36)); q++) {
        const cx = R() * w, cy = R() * h + Math.sin(tt + q * 1.9) * 1.5, r = h * (0.1 + 0.14 * R()), a = 0.07 + 0.06 * R();
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d <= r) P.tint(x, y, [196, 164, 255], d > r - 1 ? a * 2.2 : a); }
      }
      for (const [x0, bw, a] of [[0.55, 7, 0.1], [0.69, 3, 0.09]]) for (let y = 0; y < h; y++) for (let k = 0; k < bw; k++) P.tint(Math.round(w * x0) + k - Math.round(y * 0.35), y, [200, 170, 255], a);
      const n = Math.max(4, Math.round(w * h / 1400));
      for (let q = 0; q < n; q++) { const x = 4 + Math.round(R() * (w - 8)), y = 3 + Math.round(R() * (h - 6)), s = (ph + q * 3) % 10; if (s < 4) star(P, x, y, s === 1 || s === 2 ? 1 : 0, [250, 244, 255], [214, 190, 255]); else if (s === 6) P.tint(x, y, [240, 224, 255], 0.5); }
      if (ph < 10) { const sx = Math.round(-h * 0.4 + (w + h * 0.8) * ph / 9); for (let y = 0; y < h; y++) for (let k = 0; k < 4; k++) P.tint(sx + k - Math.round(y * 0.35), y, [255, 245, 255], k === 1 || k === 2 ? 0.2 : 0.09); }
    },
    orn(P) { star(P, P.w - 5, P.h - 5, 1, [255, 255, 255], [214, 190, 255]); } },
  { key: 'stars', name: '별빛', col: '#ffd84a', hi: '#fff4c8', lo: '#a8842a', glow: '#7a86e0', dark: '#060a1c', ink: { main: '#ffffff', sub: '#c8d4ff' }, shape: 'notch', N: 32, ms: 110,
    bg: ['d', [[0, '#060a1c'], [0.6, '#0e1638'], [1, '#1b2050']]],
    paint(P) {   // 비스듬한 은하수 · 별(어둡고 밝은 점 · 십자 별) · 아홉에 하나는 반짝임 · 서른두 장에 한 번 별똥별
      const { w, h, ph, R } = P;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.abs((x - w * 0.5) * 0.28 + (y - h * 0.5)) / (h * 0.42); if (d < 1) P.tint(x, y, [70, 84, 150], 0.3 * (1 - d) ** 1.5); }
      const n = Math.round(w * h / 120);
      for (let q = 0; q < n; q++) {
        const x = 2 + Math.floor(R() * (w - 4)), y = 2 + Math.floor(R() * (h - 4)), r = R(), tw = q % 9 === 0 ? (ph + q) % 8 : -1;
        if (r < 0.06) star(P, x, y, tw >= 0 && tw < 3 ? 0 : 1, [255, 250, 220], [255, 216, 74]);
        else P.set(x, y, r < 0.3 || (tw >= 0 && tw < 3) ? [214, 228, 255] : [96, 112, 176]);
      }
      if (ph < 6) { const hx = Math.round(w * 0.14 + ph * w * 0.07), hy = Math.round(h * 0.1 + ph * h * 0.06); for (let k = 0; k < 9; k++) P.tint(hx - k * 2, hy - k, k < 2 ? WHITE : [200, 210, 255], 0.9 - k * 0.09); }
    },
    orn(P) { if (P.h < 30) return; for (const [x, y] of [[2, 2], [P.w - 3, 2], [2, P.h - 3], [P.w - 3, P.h - 3]]) { P.put(x, y, [255, 255, 255]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) P.put(x + dx, y + dy, [255, 216, 74]); } } },
  { key: 'leaf', name: '잎맥', col: '#7cf0a0', hi: '#d8ffe4', lo: '#2a6a44', glow: '#7cf0a0', dark: '#08180f', ink: { main: '#f0fff4', sub: '#a8e8c0' }, shape: 'round', N: 20, ms: 110,
    bg: ['d', [[0, '#08180f'], [1, '#164a2c']]],
    paint(P) {   // 큰 잎 한 장(왼쪽 잎자루 → 오른쪽 뾰족한 끝): 잎몸 조금 밝게 · 잎 가장자리 · 가운데 잎맥 · 휘어 뻗는 곁맥 · 수액 빛이 잎맥을 따라 흐름
      const { w, h, ph } = P, mid = x => h * 0.54 - (x / w) * h * 0.1 + Math.sin(x / w * Math.PI) * h * 0.04, step = Math.max(10, Math.round(h * 0.34));
      const half = x => h * 0.47 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(Math.min(1, x / (w * 0.97)), 0.85))), 0.7);
      for (let x = 0; x < w; x++) { const m = mid(x), hw = half(x); for (let y = 0; y < h; y++) { const dd = Math.abs(y + 0.5 - m); if (dd < hw - 1) P.tint(x, y, [44, 116, 70], 0.32 * (1 - dd / hw * 0.5)); else if (dd < hw) P.tint(x, y, [110, 200, 130], 0.45); } }
      for (let x0 = 8; x0 < w - 10; x0 += step) for (const sg of [-1, 1]) { const L = half(x0 + 6) * 1.1; for (let k = 0; k < L; k++) { const x = x0 + k * 0.95, y = mid(x0) + sg * (k * 0.78 - k * k / (L * 3)); if (Math.abs(y - mid(x)) < half(x) - 1) P.tint(x, y, [78, 160, 104], 0.5 * (1 - k / L * 0.5)); } }
      for (let x = 0; x < w; x++) { const y = Math.round(mid(x)); P.tint(x, y, [110, 200, 136], 0.6); P.tint(x, y + 1, [60, 130, 85], 0.45); }
      if (ph < 14) { const hx = Math.round(-10 + (w + 20) * ph / 13); for (let k = 0; k < 12; k++) { const x = hx - k, y = Math.round(mid(x)); P.tint(x, y, [200, 255, 216], 0.85 - k * 0.07); P.tint(x, y + 1, [160, 240, 190], 0.5 - k * 0.04); } }
    },
    orn(P) { if (P.h < 30) return; const b = [124, 240, 160], v = [216, 255, 228], x = P.w - 4, y = P.h - 4; for (let k = 0; k < 5; k++) { P.put(x - k, y - Math.round(k * 0.5), b); P.put(x - k, y - Math.round(k * 0.5) - 1, k > 0 && k < 4 ? b : v); } P.put(x - 5, y - 3, v); } },
  { key: 'wave', name: '물결', col: '#6fb8ff', hi: '#d8f0ff', lo: '#1f5f9f', glow: '#5fb0ff', dark: '#071a38', ink: { main: '#f2fbff', sub: '#a8d8f8' }, shape: 'round', N: 12, ms: 150,
    bg: ['v', [[0, '#071a38'], [0.55, '#0b2e58'], [1, '#0e4a70']]],
    paint(P) {   // 층층이 겹친 물결 면(아래일수록 밝게 — 선을 긋지 않고 면으로, 글자 위를 가로지르지 않게) · 맨 아래 마루 = 흰 물보라 · 오른쪽으로 흐름 · 작은 물방울이 올라감
      const { w, h, ph, N } = P;
      [[0.46, 52, 2.4, 0.09], [0.64, 38, 2.6, 0.1], [0.8, 28, 2.8, 0.12]].forEach(([yb, lam, A, a], k) => {
        const Y = x => h * yb + A * Math.sin(2 * Math.PI * (x / lam - ph / N) + k * 1.7);
        for (let x = 0; x < w; x++) {
          const y = Math.round(Y(x));
          for (let yy = y; yy < h; yy++) P.tint(x, yy, [40, 130, 196], a);
          P.tint(x, y, [140, 200, 245], 0.2);
          if (k === 2 && Math.abs(Y(x + 1) - Y(x)) < 0.25 && Y(x) < h * yb) { P.set(x, y, [214, 242, 255]); P.tint(x - 1, y, [214, 242, 255], 0.55); P.tint(x + 1, y, [214, 242, 255], 0.55); }
        }
      });
      for (let q = 0; q < 3; q++) { const x = Math.round(P.w * (0.47 + q * 0.17)), y = Math.round(h - 4 - (((ph + q * 4) % N) * (h - 10)) / N); P.tint(x, y, [180, 230, 255], 0.75); P.tint(x + 1, y - 1, WHITE, 0.5); }
    } },
  { key: 'circuit', name: '회로', col: '#ff8a6a', hi: '#ffd8c8', lo: '#8a3018', glow: '#ff7a5a', dark: '#120808', ink: { main: '#fff4f0', sub: '#ffb8a0' }, shape: 'cut', N: 24, ms: 80,
    bg: ['d', [[0, '#120808'], [1, '#2c1310']]],
    paint(P) {   // 기판 배선(가로로 달리다 45°로 한 번씩 꺾임) · 납땜 자리 · 빛 덩이가 배선을 따라 달림
      const { w, h, ph, N, R } = P, paths = [];
      [0.1, 0.5, 0.9].forEach(v => {   // 줄 = 글자 줄 사이(위 가장자리 · 이름과 칭호 사이 · 아래 가장자리) — 글자를 긋지 않게
        const y0 = Math.round(h * v); let x = 2 + Math.floor(R() * 8), y = y0; const pts = [[x, y]];
        while (x < w - 5) { x = Math.min(w - 4, x + 10 + Math.floor(R() * 26)); pts.push([x, y]); if (x >= w - 4) break; const ny = Math.max(y0 - 3, Math.min(y0 + 3, y + (R() < 0.5 ? -1 : 1) * (2 + Math.floor(R() * 2)))); x += Math.abs(ny - y); y = ny; pts.push([Math.min(w - 4, x), y]); }
        const px = []; for (let k = 1; k < pts.length; k++) line(P, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], (a, b) => { if (!px.length || px[px.length - 1][0] !== a || px[px.length - 1][1] !== b) px.push([a, b]); });
        paths.push({ px, pts });
      });
      for (const { px, pts } of paths) {
        for (const [a, b] of px) P.tint(a, b, [150, 62, 40], 0.75);
        pts.forEach(([a, b], k) => { if (k !== 0 && k !== pts.length - 1 && R() > 0.3) return; for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) P.tint(a + dx, b + dy, [255, 138, 106], 0.7); P.set(a, b, [40, 14, 10]); });
      }
      paths.forEach(({ px }, q) => { const L = px.length, head = Math.floor((((ph / N) + q * 0.37) % 1) * L); for (let k = 0; k < 6; k++) { const p = px[head - k]; if (p) P.tint(p[0], p[1], k === 0 ? [255, 236, 220] : [255, 150, 110], 1 - k * 0.15); } });
    },
    orn(P) { if (P.h >= 30) brackets(P, [255, 216, 200], 5, 3); } },
  { key: 'aurora', name: '오로라', col: '#8ff0d0', hi: '#e4fff6', lo: '#2a8a74', glow: '#5cf0a8', dark: '#050c18', ink: { main: '#f2fffb', sub: '#a8f0dc' }, shape: 'round', N: 16, ms: 150,
    bg: ['v', [[0, '#050c18'], [1, '#0a2230']]],
    paint(P) {   // 드문 별 · 오로라 커튼(아래 끝이 밝은 초록 → 위로 청록 · 보라로 사라짐, 세로 빛살 결) — 커튼 자락이 물결치며 흐름
      const { w, h, ph, N, R } = P, tt = 2 * Math.PI * ph / N;
      for (let q = 0; q < Math.round(w * h / 300); q++) P.set(2 + Math.floor(R() * (w - 4)), 2 + Math.floor(R() * h * 0.7), R() < 0.3 ? [200, 230, 255] : [90, 120, 160]);
      for (let x = 0; x < w; x++) {
        const yb = h * 0.66 + h * 0.08 * Math.sin(x / w * Math.PI * 3 + tt) + h * 0.04 * Math.sin(x / 9 - tt * 2), L = h * 0.58, ray = 0.6 + 0.4 * Math.sin(x * 0.7 + Math.sin(x * 0.13) * 2 + tt);
        for (let y = Math.max(1, Math.floor(yb - L)); y <= Math.min(h - 2, Math.round(yb)); y++) {
          const v = (yb - y) / L, c = v < 0.45 ? mix([92, 240, 168], [80, 200, 210], v / 0.45) : mix([80, 200, 210], [150, 110, 240], (v - 0.45) / 0.55);
          P.tint(x, y, c, 0.5 * ray * (1 - v) ** 1.4 * (y >= Math.round(yb) - 1 ? 1.3 : 1));
        }
      }
    } },
  { key: 'nebula', name: '성운', col: '#e08cf0', hi: '#ffe4ff', lo: '#7a2a8a', glow: '#c070e0', dark: '#07040f', ink: { main: '#fff6ff', sub: '#e4c0f4' }, shape: 'notch', N: 16, ms: 140,
    bg: ['d', [[0, '#07040f'], [1, '#170a26']]],
    paint(P) {   // 분홍 · 보라 성운 구름(층 셋 — 오른쪽으로 갈수록 짙게) · 푸른 기운 · 별 반짝임
      const { w, h, ph, R } = P;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const X = x / h * 2.6, Y = y / h * 3.4, fade = 0.45 + 0.55 * Math.min(1, x / (w * 0.55)), v = fbm(X, Y, 11) * fade, b = fbm(X + 7, Y + 3, 23);
        if (v > 0.6) P.tint(x, y, [232, 140, 240], 0.5); else if (v > 0.52) P.tint(x, y, [160, 70, 172], 0.5); else if (v > 0.44) P.tint(x, y, [82, 36, 120], 0.45);
        if (b > 0.64) P.tint(x, y, [70, 96, 214], 0.32);
      }
      const n = Math.round(w * h / 160);
      for (let q = 0; q < n; q++) { const x = 2 + Math.floor(R() * (w - 4)), y = 2 + Math.floor(R() * (h - 4)), tw = (ph + q * 5) % 16; if (q % 7 === 0 && tw < 4) star(P, x, y, tw === 1 || tw === 2 ? 1 : 0, WHITE, [255, 200, 255]); else P.set(x, y, R() < 0.3 ? [255, 236, 255] : [150, 120, 190]); }
    } },
  { key: 'gold', name: '황금', col: '#e8b04a', hi: '#fff0b8', lo: '#8a5a1a', glow: '#e8b04a', dark: '#120c04', ink: { main: '#fffaee', sub: '#ecd29c' }, shape: 'cut', N: 30, ms: 90,
    bg: ['d', [[0, '#140d04'], [1, '#2e2008']]],
    paint(P) {   // 금줄 마름모 격자(교차점 = 금 점) · 안쪽 둘째 테(가는 금줄)
      const { w, h } = P, s = Math.max(6, Math.round(h / 6));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = (x + y) % (s * 2), b = (x - y + 1000 * s) % (s * 2); if (a === 0 && b === 0) P.set(x, y, [200, 150, 60]); else if (a === 0 || b === 0) P.tint(x, y, [110, 80, 24], 0.55); }
      if (h >= 30) for (let x = 4; x < w - 4; x++) { P.tint(x, 4, [200, 150, 60], 0.7); P.tint(x, h - 5, [200, 150, 60], 0.7); } if (h >= 30) for (let y = 4; y < h - 4; y++) { P.tint(4, y, [200, 150, 60], 0.7); P.tint(w - 5, y, [200, 150, 60], 0.7); }
    },
    orn(P) {   // 모서리 금장식(꺾쇠 + 마름모 점) · 윗변 가운데 보석
      if (P.h < 30) return;
      brackets(P, [255, 224, 138], 6, 2);
      for (const [x, y] of [[6, 6], [P.w - 7, 6], [6, P.h - 7], [P.w - 7, P.h - 7]]) { P.put(x, y, [255, 240, 184]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) P.put(x + dx, y + dy, [200, 150, 60]); }
      const cx = Math.round(P.w / 2); for (let d = -2; d <= 2; d++) { const hw = 2 - Math.abs(d); for (let j = -hw; j <= hw; j++) P.put(cx + j, 2 + d, d < 0 ? [255, 240, 184] : [232, 176, 74]); } P.put(cx, 2, [255, 255, 255]);
    },
    post(P) { const { w, h, ph } = P; if (ph >= 10) return; const sx = Math.round(-h + (w + h * 2) * ph / 9); for (let y = 0; y < h; y++) for (let k = 0; k < 6; k++) P.glint(sx + k - y, y, [255, 240, 184], k > 1 && k < 4 ? 0.3 : 0.13); } },
  { key: 'arena', name: '풀로세움', col: '#f0be7d', hi: '#fff0d8', lo: '#9a5a2a', glow: '#f0a060', dark: '#160e28', ink: { main: '#fffaf2', sub: '#f2cca8' }, shape: 'cut', N: 8, ms: 170,
    bg: ['v', [[0, '#150d26'], [0.6, '#3a1e3c'], [1, '#5c2c36']]],
    paint(P) {   // 해 질 녘 하늘에 서치라이트 둘 · 오른쪽 아래 콜로세움 정면(다락 창 · 두 층 둥근 아치 · 층 띠 — 아치마다 횃불 빛이 깜빡임)
      const { w, h, ph, N } = P, x0 = Math.round(w * 0.44), base = h - 2, H1 = Math.round(h * 0.46), sw = Math.sin(2 * Math.PI * ph / N);
      const topY = x => Math.round(base - H1 * (0.66 + 0.34 * (x - x0) / (w - x0))), facade = [36, 22, 42], ledge = [104, 66, 72], lamp = [244, 180, 112];
      for (const [bx, ang] of [[0.62, -0.5], [0.86, 0.35]]) { const ox = w * bx, a = ang + sw * 0.12, y0 = topY(ox); for (let k = 0; k < y0; k++) { const cx = ox + Math.tan(a) * k, hw = 1 + k * 0.18; for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) P.tint(x, y0 - k, [255, 240, 200], 0.1 * (1 - k / h)); } }
      for (let x = x0; x < w; x++) { const t0 = topY(x); for (let y = t0; y < h; y++) P.set(x, y, facade); P.set(x, t0, ledge); }
      for (let ax = x0 + 2, idx = 0; ax + 4 < w - 1; ax += 6, idx++) {
        const t0 = topY(ax + 2), Hc = base - t0, attic = Math.max(3, Math.round(Hc * 0.2)), tierH = Math.floor((Hc - attic) / 2); if (Hc < 10) continue;
        const aw = (idx + ph) % 3 === 0 ? 0.6 : 0.28; P.tint(ax + 1, t0 + 2, lamp, aw); P.tint(ax + 2, t0 + 2, lamp, aw);   // 다락 창
        for (let tier = 0; tier < 2; tier++) {
          const top = t0 + attic + tier * tierH + 1, hgt = tierH - 2, fl = hash2(idx, tier, 3) < 0.7 ? ((ph + idx * 3 + tier) % 5 === 0 ? 0.95 : 0.66) : 0.2;
          for (let yy = top; yy < top + hgt; yy++) for (let xx = ax; xx < ax + 4; xx++) { if (yy === top && (xx === ax || xx === ax + 3)) continue; P.tint(xx, yy, lamp, fl * (yy === top ? 0.8 : 1)); }   // 둥근 아치(꼭대기 모서리 뺌)
          for (let xx = ax - 1; xx < ax + 5; xx++) P.tint(xx, top + hgt, ledge, 0.55);   // 층 띠
        }
      }
    },
    orn(P) { if (P.h < 30) return; const g1 = [156, 191, 62], g2 = [232, 192, 80], x = P.w - 8, y = 4; for (let k = 0; k < 4; k++) { P.put(x + k, y + (k >> 1), k % 2 ? g2 : g1); P.put(x + k, y + 2 + (k >> 1), g1); } P.put(x + 4, y + 2, g2); } },
];
export const BANNERS = DEFS.map((b, i) => ({ ...b, lv: BANNER_LV[i] || 1 }));
export const bannerOf = i => BANNERS[i] || BANNERS[0];
export const BANNER_ORDER = BANNERS.map((b, i) => i).sort((a, b) => BANNERS[a].lv - BANNERS[b].lv || a - b);   // 고르는 칸 순서 = 열리는 레벨
export const bannerInk = i => bannerOf(i).ink || null;

// ── 굽기 ──
// 칸 표시: 0 = 창 밖 · 1 = 속(무늬) · 2 = 바깥 테 · 3 = 안쪽 테(짙은 한 줄)
function maskOf(w, h, shape) {
  const M = new Uint8Array(w * h), r = shape === 'round' ? Math.min(3, Math.floor(Math.min(w, h) / 6)) : 0, c = shape === 'cut' ? Math.min(4, Math.floor(Math.min(w, h) / 6)) : 0;
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    if (shape === 'notch') return !((x === 0 || x === w - 1) && (y === 0 || y === h - 1));
    if (c) return Math.min(x, w - 1 - x) + Math.min(y, h - 1 - y) >= c;
    if (r) { const dx = x < r ? r - x - 0.5 : x >= w - r ? x - (w - r) + 0.5 : 0, dy = y < r ? r - y - 0.5 : y >= h - r ? y - (h - r) + 0.5 : 0; return dx * dx + dy * dy <= r * r + 0.25; }
    return true;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) M[y * w + x] = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (M[y * w + x] === 1 && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) M[y * w + x] = 2;
  const inner = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (M[y * w + x] === 1 && [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => M[b * w + a] === 2)) inner.push(y * w + x);
  for (const k of inner) M[k] = 3;
  return M;
}
const cache = new Map();
function bannerCanvas(i, w, h, ph) {
  const key = i + '|' + w + 'x' + h + '|' + ph; let cv = cache.get(key); if (cv) return cv;
  const B = bannerOf(i), M = maskOf(w, h, B.shape), d = new Uint8ClampedArray(w * h * 4);
  const P = { w, h, ph, N: B.N || 1, R: rnd(1009 + i * 7919),
    set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h || M[y * w + x] !== 1) return; const k = (y * w + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; },
    tint(x, y, c, a) { x = Math.round(x); y = Math.round(y); if (a <= 0 || x < 0 || y < 0 || x >= w || y >= h || M[y * w + x] !== 1) return; a = Math.min(1, a); const k = (y * w + x) * 4; d[k] += (c[0] - d[k]) * a; d[k + 1] += (c[1] - d[k + 1]) * a; d[k + 2] += (c[2] - d[k + 2]) * a; },
    put(x, y, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h || !M[y * w + x]) return; const k = (y * w + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; },   // 테 위에도(장식)
    glint(x, y, c, a) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h || !M[y * w + x]) return; const k = (y * w + x) * 4; d[k] += (c[0] - d[k]) * a; d[k + 1] += (c[1] - d[k + 1]) * a; d[k + 2] += (c[2] - d[k + 2]) * a; },   // 테까지 덮는 빛
  };
  // 1) 바탕(매끈한 기울기 — 홀로그램 창과 같은 결)
  const [dir, stops] = B.bg, S = stops.map(([p, c]) => [p, rgb(c)]), span = (w - 1) * 0.94 + (h - 1) * 0.34 || 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!M[y * w + x]) continue;
    const t = dir === 'v' ? y / Math.max(1, h - 1) : dir === 'h' ? x / Math.max(1, w - 1) : (x * 0.94 + y * 0.34) / span;
    let j = 0; while (j < S.length - 2 && t > S[j + 1][0]) j++;
    const c = mix(S[j][1], S[j + 1][1], Math.max(0, Math.min(1, (t - S[j][0]) / ((S[j + 1][0] - S[j][0]) || 1)))), k = (y * w + x) * 4;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 240;
  }
  // 2) 무늬 3) 투사 결(3칸마다 아주 연한 세로줄 — 다른 홀로그램 창과 같은 결)
  B.paint(P);
  const hi = rgb(B.hi), lo = rgb(B.lo), col = rgb(B.col), dk = rgb(B.dark);
  if (w >= 12) for (let y = 0; y < h; y++) for (let x = 2; x < w; x += 3) P.tint(x, y, hi, 0.05);
  // 4) 테: 바깥 = 테 색(위 · 왼 빛, 아래 · 오른 그늘) · 안쪽 한 줄 = 짙은 테 · 그 아래 첫 줄 = 옅은 빛
  const edge = Math.max(2, B.shape === 'cut' ? 5 : 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const m = M[y * w + x], k = (y * w + x) * 4; if (m < 2) continue;
    const c = m === 3 ? mix(col, dk, 0.62) : y <= edge - 1 && y < h / 2 ? hi : y >= h - edge && y > h / 2 ? lo : x < w / 2 ? mix(col, hi, 0.3) : mix(col, lo, 0.3);
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  for (let x = 0; x < w; x++) for (let y = 1; y < Math.min(h, 6); y++) if (M[y * w + x] === 1) { P.tint(x, y, hi, 0.16); break; }
  // 5) 모서리 장식 · 테까지 덮는 빛
  if (B.orn) B.orn(P);
  if (B.post) B.post(P);
  cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c2 = cv.getContext('2d'), id = c2.createImageData(w, h); id.data.set(d); c2.putImageData(id, 0, 0);
  cache.set(key, cv); return cv;
}
// 배너 창 그리기(t = 화면 시계 ms — 움직임 장 고름). 하늘 = 다른 창과 같은 기본 홀로그램
export function bannerPanel(g, x, y, w, h, i, t = 0) {
  const B = bannerOf(i);
  if (B.holo) { holo(g, x, y, w, h, T.card || T.panel, 16); return; }
  const ph = B.N > 1 ? Math.floor(Math.max(0, t) / B.ms) % B.N : 0;
  g.c.imageSmoothingEnabled = false;
  g.c.drawImage(bannerCanvas(i, w | 0, h | 0, ph), x | 0, y | 0);
}
// 아이콘 테(s칸 아이콘 둘레 한 칸 — 배너 테 색 · 위 한 줄 빛)
export function avatarFrame(g, x, y, s, i) {
  const B = bannerOf(i);
  g.rect(x - 1, y - 1, s + 2, s + 2, B.col); g.rect(x - 1, y - 1, s + 2, 1, B.hi); g.rect(x - 1, y + s, s + 2, 1, B.lo);
  g.rect(x, y, s, s, B.dark);   // 아이콘 그림이 오기 전(옛 그림)에도 바탕이 배너 색
}

// 사용자 아이콘(정사각): 배너 빛이 가운데서 번지는 방 + 바닥 그림자 + 화분째 식물(본디 크기로 그린 뒤 보이는 칸만 정사각으로 잘라 줄임 — 한 번 굽고 재사용)
const avMemo = new Map();
function avatarCanvas(key, potKey, glow, dark) {
  const id = key + '|' + potKey + '|' + glow + '|' + dark; if (avMemo.has(id)) return avMemo.get(id);
  if (!BIG[key] || !POT_BIG[potKey]) return null;   // 그림이 아직 안 옴(굽지 않음 — 다음에 다시)
  const a = document.createElement('canvas'); a.width = 128; a.height = 150;
  const ga = new Gfx(a.getContext('2d'));
  if (!drawBig(ga, key, potKey, 64, 140, { t: 0 })) return null;
  const dd = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  let t = 1e9, b = -1, l = 1e9, r = -1;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) if (dd[(y * a.width + x) * 4 + 3] > 20) { if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
  if (b < 0) return null;
  const side = Math.max(b - t + 1, r - l + 1) + 12, cv = document.createElement('canvas'); cv.width = side; cv.height = side;
  const c = cv.getContext('2d'), id2 = c.createImageData(side, side), px = id2.data, G = rgb(glow), D = rgb(dark);
  const steps = [mix(G, WHITE, 0.2), mix(G, D, 0.4), mix(G, D, 0.66), mix(G, D, 0.84), D];
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const rr = Math.hypot(x + 0.5 - side / 2, y + 0.5 - side * 0.42) / (side * 0.72), tt = Math.max(0, Math.min(steps.length - 1.001, rr * (steps.length - 1))), i0 = Math.floor(tt);
    const c3 = steps[BAYER4[y & 3][x & 3] / 16 < tt - i0 ? i0 + 1 : i0], k = (y * side + x) * 4;
    px[k] = c3[0]; px[k + 1] = c3[1]; px[k + 2] = c3[2]; px[k + 3] = 255;
  }
  c.putImageData(id2, 0, 0);
  const g = new Gfx(c), ox = Math.round((side - (r - l + 1)) / 2) - l, oy = side - 4 - (b + 1);
  g.ellipse(Math.round(side / 2), b + oy - 1, Math.round((r - l + 1) * 0.42), 3, 'rgba(0,0,0,0.38)');   // 바닥 그림자
  c.imageSmoothingEnabled = false; c.drawImage(a, ox, oy);
  avMemo.set(id, cv); return cv;
}
// (x, y)에 s칸 아이콘 — look = 배너 번호(빛 · 바깥 색이 배너를 따름) 또는 빛 색. 그림이 아직 없으면 false(부르는 쪽이 옛 그림으로)
export function drawAvatar(g, key, x, y, s, look = 0, potKey = 'pot_terra') {
  const B = typeof look === 'number' ? bannerOf(look) : null, cv = avatarCanvas(key, potKey, B ? B.glow : look, B ? B.dark : '#0a1220'); if (!cv) return false;
  g.c.imageSmoothingEnabled = false;
  g.c.drawImage(cv, x, y, s, s);
  return true;
}
