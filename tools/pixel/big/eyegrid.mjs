// 눈 재기용 확대 격자(2026-10-18): 원화의 한 구역을 정수배로 키우고 10칸마다 옅은 줄 · 50칸마다 진한 줄(원화 좌표 기준 — 왼쪽 위 = x0, y0)
//  → eyes.mjs 의 box [가운데x, y, 가로반지름, 세로반지름] · cheek [x, y] 를 원화 좌표로 읽음. 진한 줄 = 50의 배수 좌표(빨강 = 100의 배수)
//   node tools/pixel/big/eyegrid.mjs <원화.png> <x0> <y0> <폭> <높이> [배율=4] [출력.png]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePNG, encodePNG } from './engine.mjs';
const [file, X0, Y0, W0, H0, K0, out0] = process.argv.slice(2);
if (!file || H0 == null) { console.log('node eyegrid.mjs <원화.png> <x0> <y0> <폭> <높이> [배율=4] [출력.png]'); process.exit(1); }
const img = decodePNG(readFileSync(file)), x0 = +X0, y0 = +Y0, w0 = +W0, h0 = +H0, k = +(K0 || 4), W = w0 * k, H = h0 * k, o = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sx = x0 + Math.floor(x / k), sy = y0 + Math.floor(y / k), d = (y * W + x) * 4;
  if (sx < 0 || sy < 0 || sx >= img.w || sy >= img.h) { o[d] = 40; o[d + 1] = 40; o[d + 2] = 48; o[d + 3] = 255; continue; }
  const s = (sy * img.w + sx) * 4, a = img.data[s + 3] / 255;
  for (let c = 0; c < 3; c++) o[d + c] = Math.round(img.data[s + c] * a + 217 * (1 - a));
  o[d + 3] = 255;
  const onX = x % k === 0 ? sx : null, onY = y % k === 0 ? sy : null, line = v => v != null && v % 10 === 0;
  if (line(onX) || line(onY)) {
    const v = line(onX) ? onX : onY, col = v % 100 === 0 ? [255, 40, 40] : v % 50 === 0 ? [0, 0, 0] : [120, 120, 140], al = v % 50 === 0 ? 0.85 : 0.35;
    for (let c = 0; c < 3; c++) o[d + c] = Math.round(o[d + c] * (1 - al) + col[c] * al);
  }
}
const out = out0 || file.replace(/\.png$/, `_grid_${x0}_${y0}.png`);
writeFileSync(out, encodePNG(W, H, o));
console.log(out, `${W}×${H} · 원화 (${x0}, ${y0})~(${x0 + w0}, ${y0 + h0}) · 진한 줄 = 50의 배수 · 빨강 = 100의 배수`);
