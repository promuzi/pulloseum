// 탐사선 네 가지 → 도트(2026-10-15 사용자 "4개를 다 만들자. 초반에 선택할 수 있는 걸로, 기능의 차이는 없고 나중에 탐사선 꾸미기에 반영"):
//   코덱스 후보 한 장(concept/ui/ship_candidates.png, 2×2 칸, 위에서 본 모습) → 칸마다 배경 지우기(가장자리에서 바탕색 흘려 채움) → 잘라 내기 →
//   색 묶음(OKLab k-평균 18) → 판 칸마다 다수결(원본 칸의 절반 넘게 배면 칠함) → 바깥 둘레 짙은 테 1칸
//   크기 두 벌: 정비 화면(세로 128칸) · 탐사 지도(세로 30칸) → assets/v2/ships/ship<1~4>.png · ship<1~4>_s.png + 검토판 out/ship/ships_sheet.png
//   node tools/pixel/big/shipconv.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, Img, oklab, fromOklab } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const src = decodePNG(readFileSync(resolve(here, 'concept', 'ui', 'ship_candidates.png'))), SW = src.w, SH = src.h;
const SIZES = { big: 128, s: 30 }, K = 24;
const outDir = resolve(repo, 'assets', 'v2', 'ships'); mkdirSync(outDir, { recursive: true }); mkdirSync(resolve(here, 'out', 'ship'), { recursive: true });
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const labOf = k => oklab(hex([src.data[k], src.data[k + 1], src.data[k + 2]]));   // engine.oklab 은 '#rrggbb' 를 받음

function cut(qx, qy) {
  const x0 = qx * SW / 2, y0 = qy * SH / 2, w = SW / 2, h = SH / 2, at = (x, y) => ((y0 + y) * SW + x0 + x) * 4;
  const bg = [src.data[at(4, 4)], src.data[at(4, 4) + 1], src.data[at(4, 4) + 2]];
  const isBgCol = (x, y) => { const k = at(x, y); return Math.hypot(src.data[k] - bg[0], src.data[k + 1] - bg[1], src.data[k + 2] - bg[2]) < 26; };
  const m = new Uint8Array(w * h), st = [];   // 1 = 배경(가장자리에서 이어진 바탕색)
  for (let x = 0; x < w; x++) st.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) st.push([0, y], [w - 1, y]);
  while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= w || y >= h || m[y * w + x] || !isBgCol(x, y)) continue; m[y * w + x] = 1; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
  let l = w, r = -1, t = h, b = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!m[y * w + x]) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
  return { at, m, w, l, r, t, b };
}
// 색 묶음: 밝기보다 색상 차이를 크게 봄(식물 캡슐 초록이 회색 몸체에 묻히지 않게)
function kmeans(pts, k, it = 14) {
  const cent = []; for (let i = 0; i < k; i++) cent.push(pts[Math.floor((i + 0.5) / k * pts.length)].slice());
  const asg = p => { let bi = 0, bd = 1e9; for (let i = 0; i < k; i++) { const c = cent[i], d = (p[0] - c[0]) ** 2 * 1.5 + ((p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2) * 6; if (d < bd) { bd = d; bi = i; } } return bi; };
  for (let n = 0; n < it; n++) { const acc = cent.map(() => [0, 0, 0, 0]); for (const p of pts) { const a = acc[asg(p)]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; } acc.forEach((a, i) => { if (a[3]) cent[i] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; }); }
  return { cent, asg };
}
function convertShip(q, H) {
  const { at, m, w, l, r, t, b } = q, s = H / (b - t + 1), W = Math.ceil((r - l + 1) * s) + 2, out = new Img(W, H + 2);
  const pts = [];
  for (let y = t; y <= b; y += 2) for (let x = l; x <= r; x += 2) if (!m[y * w + x]) { const k = at(x, y); pts.push(labOf(k)); }
  const { cent, asg } = kmeans(pts, K), col = cent.map(c => fromOklab(c[0], c[1], c[2]));
  const lab = new Map();
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W - 2; X++) {
    const sx0 = l + X / s, sy0 = t + Y / s, sx1 = l + (X + 1) / s, sy1 = t + (Y + 1) / s, votes = new Float32Array(K);
    let fg = 0, tot = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
      if (x < l || x > r || y < t || y > b) continue;
      tot++;
      if (m[y * w + x]) continue;
      fg++; const k = at(x, y); votes[asg(labOf(k))]++;
    }
    if (!tot || fg / tot < 0.5) continue;
    let bi = 0; for (let i = 1; i < K; i++) if (votes[i] > votes[bi]) bi = i;
    out.set(X + 1, Y + 1, col[bi]); lab.set((Y + 1) * W + X + 1, bi);
  }
  // 떨어진 작은 조각(엔진 빛 부스러기, 6칸 이하) 지우기
  { const seen = new Uint8Array(W * (H + 2)), opq = i => out.data[i * 4 + 3] > 0;
    for (let i = 0; i < W * (H + 2); i++) { if (!opq(i) || seen[i]) continue; const comp = [i], st = [i]; seen[i] = 1;
      while (st.length) { const j = st.pop(), x = j % W; for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && k < W * (H + 2) && !seen[k] && opq(k)) { seen[k] = 1; st.push(k); comp.push(k); } }
      if (comp.length <= 16) for (const j of comp) out.data[j * 4 + 3] = 0; } }
  // 바깥 둘레 짙은 테(작게 줄여도 모양이 또렷하게)
  const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H + 2 && out.data[(y * W + x) * 4 + 3] > 0, edge = [];
  for (let y = 0; y < H + 2; y++) for (let x = 0; x < W; x++) if (!op(x, y) && (op(x + 1, y) || op(x - 1, y) || op(x, y + 1) || op(x, y - 1))) edge.push([x, y]);
  for (const [x, y] of edge) out.set(x, y, '#141a24');
  return out;
}
const sheet = [];
for (let n = 0; n < 4; n++) {
  const q = cut(n % 2, Math.floor(n / 2));
  for (const [name, H] of Object.entries(SIZES)) {
    const im = convertShip(q, H);
    writeFileSync(resolve(outDir, `ship${n + 1}${name === 's' ? '_s' : ''}.png`), im.png());
    if (name === 'big') sheet.push(im);
    console.log(`ship${n + 1}${name === 's' ? '_s' : ''} ${im.w}×${im.h}`);
  }
}
const Z = 3, sh = new Img(sheet.reduce((a, im) => a + im.w * Z + 12, 12), 130 * Z + 24, '#0b1220');
let x = 12; for (const im of sheet) { sh.blit(im, x, 12, Z); x += im.w * Z + 12; }
writeFileSync(resolve(here, 'out', 'ship', 'ships_sheet.png'), sh.png());
console.log('검토판 →', resolve(here, 'out', 'ship', 'ships_sheet.png'));
