// 효과 자리 재기용(2026-10-18): 한 종의 어린 · 자람 · 성체 변환본(96×112)을 나란히 정수배로 키우고 10칸마다 옅은 줄 · 50칸마다 진한 줄
//   node tools/pixel/big/stagegrid.mjs <키> [배율=4]  → out/conv/_sg_<키>.png  (FX 의 at · box 를 판 좌표로 읽음)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), [key, K0] = process.argv.slice(2), k = +(K0 || 4);
if (!key) { console.log('node stagegrid.mjs <키> [배율]'); process.exit(1); }
const files = ['young', 'teen', ''].map(s => resolve(here, 'out', 'conv', `${key}${s ? '_' + s : ''}_96x112.png`)).filter(existsSync);
const imgs = files.map(f => decodePNG(readFileSync(f))), PW = 96 * k, PH = 112 * k, GAP = 6, Wt = imgs.length * PW + (imgs.length - 1) * GAP, o = new Uint8Array(Wt * PH * 4);
for (let i = 0; i < o.length; i += 4) { o[i] = 30; o[i + 1] = 30; o[i + 2] = 36; o[i + 3] = 255; }
imgs.forEach((img, n) => {
  const ox = n * (PW + GAP);
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const sx = Math.floor(x / k), sy = Math.floor(y / k), s = (sy * img.w + sx) * 4, d = (y * Wt + ox + x) * 4, a = img.data[s + 3] / 255;
    let bg = 214;
    const lx = sx % 10 === 0 && x % k === 0, ly = sy % 10 === 0 && y % k === 0;
    if (lx || ly) bg = (lx && sx % 50 === 0) || (ly && sy % 50 === 0) ? 40 : 170;
    for (let c = 0; c < 3; c++) o[d + c] = Math.round(img.data[s + c] * a + bg * (1 - a));
    o[d + 3] = 255;
  }
});
const out = resolve(here, 'out', 'conv', `_sg_${key}.png`);
writeFileSync(out, encodePNG(Wt, PH, o));
console.log(out, files.length + '장');
