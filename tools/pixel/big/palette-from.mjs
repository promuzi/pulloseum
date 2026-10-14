// 컨셉 아트에서 주요 색 뽑기: node tools/pixel/big/palette-from.mjs <png> [색 수]
// 배경(가장자리와 비슷한 밝은 색)을 빼고 OKLab k-평균으로 묶어, 차지하는 비율 순으로 hex · OKLCH(밝기, 채도, 색상) 를 찍는다.
// → hueRamp(색상, 채도)의 바탕값으로 쓴다.
import { readFileSync } from 'node:fs';
import { decodePNG, oklab } from './engine.mjs';

const [file, kArg] = process.argv.slice(2), K = +kArg || 9;
const im = decodePNG(readFileSync(file)), step = Math.max(1, Math.floor(Math.min(im.w, im.h) / 220));
const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
const px = [];
for (let y = 0; y < im.h; y += step) for (let x = 0; x < im.w; x += step) {
  const k = (y * im.w + x) * 4;
  if (im.data[k + 3] < 128) continue;
  px.push(oklab(hex(im.data[k], im.data[k + 1], im.data[k + 2])));
}
// 배경 = 네 모서리 평균 색 근처
const corner = [[0, 0], [im.w - 1, 0], [0, im.h - 1], [im.w - 1, im.h - 1]].map(([x, y]) => { const k = (y * im.w + x) * 4; return oklab(hex(im.data[k], im.data[k + 1], im.data[k + 2])); });
const bg = [0, 1, 2].map(i => corner.reduce((s, c) => s + c[i], 0) / 4);
const fg = px.filter(p => Math.hypot(p[0] - bg[0], (p[1] - bg[1]) * 2, (p[2] - bg[2]) * 2) > 0.06);
// k-평균(결정적 시작점: 밝기 순으로 고르게)
fg.sort((a, b) => a[0] - b[0]);
let cent = Array.from({ length: K }, (_, i) => fg[Math.floor((i + 0.5) * fg.length / K)].slice());
let lab = new Array(fg.length).fill(0);
for (let it = 0; it < 25; it++) {
  fg.forEach((p, i) => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; b = j; } }); lab[i] = b; });
  cent = cent.map((c, j) => { const m = fg.filter((_, i) => lab[i] === j); return m.length ? [0, 1, 2].map(q => m.reduce((s, p) => s + p[q], 0) / m.length) : c; });
}
const toHex = ([L, A, B]) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const f = c => Math.round(255 * Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
  return hex(f(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), f(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), f(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));
};
cent.map((c, j) => ({ c, n: lab.filter(v => v === j).length })).sort((a, b) => b.n - a.n).forEach(({ c, n }) => {
  const C = Math.hypot(c[1], c[2]), h = (Math.atan2(c[2], c[1]) * 180 / Math.PI + 360) % 360;
  console.log(`${toHex(c)}  ${(100 * n / fg.length).toFixed(1).padStart(5)}%  L ${c[0].toFixed(2)}  C ${C.toFixed(3)}  h ${h.toFixed(0)}`);
});
