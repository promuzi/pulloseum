// 배경 컨셉 그림(코덱스, 1024×1536 등) → 정확한 칸 도트 배경(기본 270×405).
// 1) 칸 평균으로 줄인 그림에서 k-평균(OKLab)으로 색 N개를 뽑고 2) 원본의 모든 점을 그 색에 맞춘 뒤 3) 칸마다 가장 많은 색(최빈)을 쓰되,
//    가장 많은 색이 칸의 절반도 안 되면(가는 선이 칸 경계에 걸침) 칸 평균에 가장 가까운 색을 쓴다 — 가는 선이 사라지지 않게.
// 사용: node tools/pixel/big/bgconv.mjs <in.png> <out.png> [--w=270] [--h=405] [--colors=48] [--crop=348] [--zoom=3(미리보기 <out>_x3.png)] [--fit [--fy=0.5]]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePNG, Img } from './engine.mjs';

const [inp, out, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : Number(v)]; }));
const W = opt.w || 270, H = opt.h || 405, N = opt.colors || 48, CROP = opt.crop || H;
// --band: 화면 그림(1024×1536)의 가운데 띠만(가로 = 세로 × W/H) — 안내판 bgguide.mjs <화면> 의 빗금 밖을 잘라 냄
const full = decodePNG(readFileSync(inp));
let src = full;
if (opt.band) {
  const bw = Math.round(full.h * W / H), bx = Math.round((full.w - bw) / 2);
  src = { w: bw, h: full.h, data: new Uint8Array(bw * full.h * 4) };
  for (let y = 0; y < full.h; y++) src.data.set(full.data.subarray((y * full.w + bx) * 4, (y * full.w + bx + bw) * 4), y * bw * 4);
}
// --fit: 원본을 출력 비율로 가운데 잘라 냄(정사각 스킬 그림 → 카드 그림 칸 58×52 등 — 2026-10-16), --fy=0~1 = 세로 자르는 자리(0.5 = 가운데)
if (opt.fit) {
  const ar = W / H, sw = Math.min(src.w, Math.round(src.h * ar)), sh = Math.min(src.h, Math.round(src.w / ar)), bx = Math.round((src.w - sw) / 2), by = Math.round((src.h - sh) * (opt.fy ?? 0.5)), o = src;
  src = { w: sw, h: sh, data: new Uint8Array(sw * sh * 4) };
  for (let y = 0; y < sh; y++) src.data.set(o.data.subarray(((by + y) * o.w + bx) * 4, ((by + y) * o.w + bx + sw) * 4), y * sw * 4);
}
const w0 = src.w, h0 = src.h, sx = w0 / W, sy = h0 / H;

// sRGB ↔ OKLab
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const LIN = Float64Array.from({ length: 256 }, (_, i) => lin(i));
function toLab(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const px = (x, y) => { const i = (y * w0 + x) * 4; return [src.data[i], src.data[i + 1], src.data[i + 2]]; };

// 1) 칸 평균
const avg = new Float64Array(W * H * 3), cells = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx)), y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
  let r = 0, g = 0, b = 0, n = 0;
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const p = px(xx, yy); r += p[0]; g += p[1]; b += p[2]; n++; }
  avg.set([r / n, g / n, b / n], (y * W + x) * 3); cells.push([x0, x1, y0, y1]);
}
// 2) k-평균(OKLab, k-means++ 씨앗 고정)
const labs = []; for (let i = 0; i < W * H; i++) labs.push(toLab(Math.round(avg[i * 3]), Math.round(avg[i * 3 + 1]), Math.round(avg[i * 3 + 2])));
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const cent = [labs[Math.floor(rnd() * labs.length)].slice()];
const best = new Float64Array(labs.length).fill(Infinity);
while (cent.length < N) {
  let sum = 0; for (let i = 0; i < labs.length; i++) { best[i] = Math.min(best[i], d2(labs[i], cent[cent.length - 1])); sum += best[i]; }
  let r = rnd() * sum, i = 0; for (; i < labs.length - 1; i++) { r -= best[i]; if (r <= 0) break; }
  cent.push(labs[i].slice());
}
const nearest = l => { let bi = 0, bd = Infinity; for (let k = 0; k < cent.length; k++) { const d = d2(l, cent[k]); if (d < bd) { bd = d; bi = k; } } return bi; };
for (let it = 0; it < 14; it++) {
  const acc = cent.map(() => [0, 0, 0, 0]);
  for (const l of labs) { const k = nearest(l), a = acc[k]; a[0] += l[0]; a[1] += l[1]; a[2] += l[2]; a[3]++; }
  acc.forEach((a, k) => { if (a[3]) cent[k] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
}
// 대표 색(sRGB)은 그 무리에 든 칸 평균 색들의 평균으로(OKLab 되돌리기 오차 없이)
const rgbSum = cent.map(() => [0, 0, 0, 0]);
labs.forEach((l, i) => { const k = nearest(l), a = rgbSum[k]; a[0] += avg[i * 3]; a[1] += avg[i * 3 + 1]; a[2] += avg[i * 3 + 2]; a[3]++; });
const pal = rgbSum.map(a => a[3] ? [Math.round(a[0] / a[3]), Math.round(a[1] / a[3]), Math.round(a[2] / a[3])] : [0, 0, 0]);
const palLab = pal.map(p => toLab(...p));
const nearPal = l => { let bi = 0, bd = Infinity; for (let k = 0; k < palLab.length; k++) { const d = d2(l, palLab[k]); if (d < bd) { bd = d; bi = k; } } return bi; };
// 3) 원본 점 → 색 번호(같은 색은 한 번만 계산), 칸마다 최빈
const memo = new Map(), idxOf = (r, g, b) => { const key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2); let v = memo.get(key); if (v === undefined) { v = nearPal(toLab(r, g, b)); memo.set(key, v); } return v; };
const outIm = new Img(W, CROP), hex = p => '#' + p.map(v => v.toString(16).padStart(2, '0')).join('');
const use = new Array(pal.length).fill(0);
for (let y = 0; y < CROP; y++) for (let x = 0; x < W; x++) {
  const [x0, x1, y0, y1] = cells[y * W + x], cnt = new Map();
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const p = px(xx, yy), k = idxOf(p[0], p[1], p[2]); cnt.set(k, (cnt.get(k) || 0) + 1); }
  let mk = -1, mc = 0, tot = 0; for (const [k, c] of cnt) { tot += c; if (c > mc) { mc = c; mk = k; } }
  const k = mc / tot >= 0.5 ? mk : nearPal(labs[y * W + x]);
  use[k]++; outIm.set(x, y, hex(pal[k]));
}
writeFileSync(out, outIm.png());
if (opt.zoom) { const z = opt.zoom, zi = new Img(W * z, CROP * z); zi.blit(outIm, 0, 0, z); writeFileSync(out.replace(/\.png$/, `_x${z}.png`), zi.png()); }
const top = pal.map((p, k) => [hex(p), use[k]]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
console.log(`${inp} → ${out} · ${W}×${CROP} · 색 ${top.length}개 · 많이 쓴 색 ${top.slice(0, 12).map(([h, n]) => `${h}(${n})`).join(' ')}`);
