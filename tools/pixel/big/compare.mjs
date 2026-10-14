// 컨셉 아트 ↔ 도트 비교판: node tools/pixel/big/compare.mjs <키 ...>  → out/compare.png
// 줄마다 [컨셉 아트(줄여서) | 도트(테라코타 화분에 심은 모습, 3배)]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Img, colorize, decodePNG } from './engine.mjs';
import { W, H } from './parts.mjs';
import { POT3, renderPot } from './pot3d.mjs';

const here = dirname(fileURLToPath(import.meta.url)), keys = process.argv.slice(2), Z = 3, CH = H * Z, PAD = 8;
const pot = renderPot(POT3.pot_terra);
// 상자 평균으로 줄이기(컨셉 아트는 그림이라 평균 축소가 맞다)
function shrink(src, w, h) {
  const out = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x * src.w / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * src.w / w)), y0 = Math.floor(y * src.h / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * src.h / h));
    const s = [0, 0, 0, 0];
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) for (let c = 0; c < 4; c++) s[c] += src.data[(j * src.w + i) * 4 + c];
    const n = (x1 - x0) * (y1 - y0), k = (y * w + x) * 4;
    for (let c = 0; c < 4; c++) out.data[k + c] = Math.round(s[c] / n);
  }
  return out;
}
// 세 칸: 컨셉 | 코드로 그린 도트 | 컨셉을 변환한 도트(out/conv 에 있으면). --conv 면 코드 칸을 빼고 둘만.
const { existsSync } = await import('node:fs');
const onlyConv = process.argv.includes('--conv'), cols = onlyConv ? 1 : 2;
const sheet = new Img(PAD * (2 + cols) + CH + W * Z * cols, PAD + keys.length * (CH + PAD), '#2e222f');
for (const [r, key] of keys.entries()) {
  const y = PAD + r * (CH + PAD);
  sheet.blit(shrink(decodePNG(readFileSync(resolve(here, 'concept', key + '.png'))), CH, CH), PAD, y);
  const panes = [];
  if (!onlyConv) { const sp = (await import(pathToFileURL(resolve(here, 'species', key + '.mjs')).href)).default(); panes.push(Img.fromColors(W, H, colorize(sp, sp.render()))); }
  const cv = resolve(here, 'out', 'conv', key + '_96x112.png');
  if (existsSync(cv)) panes.push(decodePNG(readFileSync(cv)));
  panes.forEach((im, c) => {
    const p = new Img(W, H), x = PAD * (2 + c) + CH + c * W * Z;
    p.blit(pot.back, 0, 0); p.blit(im, 0, 0); p.blit(pot.front, 0, 0);
    sheet.fill(x, y, W * Z, CH, '#323353');
    sheet.blit(p, x, y, Z);
  });
}
writeFileSync(resolve(here, 'out', 'compare.png'), sheet.png());
console.log('비교판 →', resolve(here, 'out', 'compare.png'));
