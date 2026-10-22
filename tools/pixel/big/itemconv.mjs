// 코덱스 종자 · 물건 원화(회색 배경 → greycut.mjs 누끼) → 작은 도트 그림(투명 배경) — 2026-10-23 종자 · 상점 물건
//   node tools/pixel/big/itemconv.mjs <누끼.png> <out.png> --w=28 --h=32 [--colors=14] [--align=bottom] [--cover=0.45] [--zoom=6]
// 1) 누끼의 불투명 칸 둘레로 자름 2) 비율 그대로 W×H 안에 맞춤(가운데 — align=bottom 이면 아래 맞춤)
// 3) 칸마다: 덮인 비율이 cover 미만 = 투명, 아니면 OKLab k-평균 팔레트 색 중 그 칸에 가장 많은 색(가장 많은 색이 40% 미만이면 칸 평균에 가장 가까운 색 — 가는 선이 칸 경계에 걸쳐도 남게)
// 4) 바깥 둘레 칸 = 한 단 어둡게(먹선 — 원화의 굵은 테가 줄이면 반 칸이라 흐려짐) 5) 홀로 떨어진 한 칸은 지움
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePNG, encodePNG, oklab, fromOklab } from './engine.mjs';

const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--'));
const opt = k => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : null; };
const [inp, out] = files, W = +(opt('w') || 28), H = +(opt('h') || 32), N = +(opt('colors') || 14), COVER = +(opt('cover') || 0.45), ALIGN = opt('align') || 'center', ZOOM = +(opt('zoom') || 0);
if (!inp || !out) { console.log('node tools/pixel/big/itemconv.mjs <누끼.png> <out.png> --w= --h='); process.exit(1); }
const im = decodePNG(readFileSync(inp)), { w: SW, h: SH, data: S } = im;
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
// 1) 불투명 칸 둘레
let bx0 = SW, by0 = SH, bx1 = -1, by1 = -1;
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (S[(y * SW + x) * 4 + 3] >= 128) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
if (bx1 < 0) { console.log('불투명 칸 없음'); process.exit(1); }
if (opt('box')) [bx0, by0, bx1, by1] = opt('box').split(',').map(Number);   // --box=x0,y0,x1,y1 = 자를 둘레를 정함(여러 그림을 같은 틀에 맞출 때 — 상자 몸통 · 닫힌 상자)
const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1, s = Math.min(W / bw, H / bh), ow = Math.max(1, Math.round(bw * s)), oh = Math.max(1, Math.round(bh * s));
const ox = Math.floor((W - ow) / 2), oy = ALIGN === 'bottom' ? H - oh : Math.floor((H - oh) / 2);
// 2) 팔레트(OKLab k-평균) — 불투명 칸 표본
const lab = new Float32Array(SW * SH * 3), opaque = [];
for (let i = 0; i < SW * SH; i++) { if (S[i * 4 + 3] < 128) continue; const c = oklab(hex(S[i * 4], S[i * 4 + 1], S[i * 4 + 2])); lab.set(c, i * 3); opaque.push(i); }
const sample = []; for (let k = 0; k < opaque.length; k += Math.max(1, Math.floor(opaque.length / 6000))) sample.push(opaque[k]);
let C = []; for (let k = 0; k < N; k++) { const i = sample[Math.floor((k + 0.5) * sample.length / N)]; C.push([lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]); }
const near = (L, a, b) => { let bi = 0, bd = 1e9; for (let k = 0; k < C.length; k++) { const d = (C[k][0] - L) ** 2 + ((C[k][1] - a) * 1.4) ** 2 + ((C[k][2] - b) * 1.4) ** 2; if (d < bd) { bd = d; bi = k; } } return bi; };
for (let it = 0; it < 12; it++) {
  const sum = C.map(() => [0, 0, 0, 0]);
  for (const i of sample) { const k = near(lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]); sum[k][0] += lab[i * 3]; sum[k][1] += lab[i * 3 + 1]; sum[k][2] += lab[i * 3 + 2]; sum[k][3]++; }
  C = C.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c));
}
const P = C.map(([L, a, b]) => { const h = fromOklab(L, a, b); return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
const idx = new Int16Array(SW * SH).fill(-1); for (const i of opaque) idx[i] = near(lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]);
// 3) 칸마다 최빈 색
const O = new Uint8Array(W * H * 4), isOn = new Uint8Array(W * H);
for (let Y = 0; Y < oh; Y++) for (let X = 0; X < ow; X++) {
  const x0 = bx0 + X / s, x1 = bx0 + (X + 1) / s, y0 = by0 + Y / s, y1 = by0 + (Y + 1) / s, cnt = new Array(C.length).fill(0);
  let tot = 0, on = 0, L = 0, A = 0, B = 0;
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
    if (x < 0 || y < 0 || x >= SW || y >= SH) continue; tot++;
    const i = y * SW + x; if (idx[i] < 0) continue; on++; cnt[idx[i]]++; L += lab[i * 3]; A += lab[i * 3 + 1]; B += lab[i * 3 + 2];
  }
  if (!tot || on / tot < COVER) continue;
  let best = 0; for (let k = 1; k < cnt.length; k++) if (cnt[k] > cnt[best]) best = k;
  const k = cnt[best] / on >= 0.4 ? best : near(L / on, A / on, B / on), o = ((oy + Y) * W + ox + X) * 4;
  O[o] = P[k][0]; O[o + 1] = P[k][1]; O[o + 2] = P[k][2]; O[o + 3] = 255; isOn[(oy + Y) * W + ox + X] = 1;
}
// 5) 홀로 떨어진 한 칸 지움 4) 바깥 둘레 = 먹선 쪽으로 한 단 어둡게
const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && isOn[y * W + x];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isOn[y * W + x] && ![[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => on(x + dx, y + dy))) { isOn[y * W + x] = 0; O[(y * W + x) * 4 + 3] = 0; }
const INK = [46, 34, 47], edge = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isOn[y * W + x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !on(x + dx, y + dy))) edge.push(y * W + x);
for (const i of edge) { const o = i * 4, lum = (O[o] * 0.3 + O[o + 1] * 0.59 + O[o + 2] * 0.11) / 255; if (lum < 0.22) continue; for (let c = 0; c < 3; c++) O[o + c] = Math.round(O[o + c] + (INK[c] - O[o + c]) * 0.7); }
writeFileSync(out, encodePNG(W, H, O));
if (ZOOM) {   // 검토용 확대(회색 바탕)
  const Z = new Uint8Array(W * ZOOM * H * ZOOM * 4);
  for (let y = 0; y < H * ZOOM; y++) for (let x = 0; x < W * ZOOM; x++) { const o = (y * W * ZOOM + x) * 4, i = (Math.floor(y / ZOOM) * W + Math.floor(x / ZOOM)) * 4, a = O[i + 3] > 0; Z[o] = a ? O[i] : 64; Z[o + 1] = a ? O[i + 1] : 70; Z[o + 2] = a ? O[i + 2] : 84; Z[o + 3] = 255; }
  writeFileSync(out.replace(/\.png$/, '_x' + ZOOM + '.png'), encodePNG(W * ZOOM, H * ZOOM, Z));
}
console.log(`${out} ${W}×${H} · 물체 ${ow}×${oh} · 색 ${C.length}`);
