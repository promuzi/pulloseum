// 컨셉 아트 모아보기: node tools/pixel/big/contact.mjs <키 ...> → out/contact.png (3열, 한 장 400칸)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, decodePNG } from './engine.mjs';

const here = dirname(fileURLToPath(import.meta.url)), keys = process.argv.slice(2), S = 400, PAD = 6, COLS = 3;
const shrink = (src, w, h) => {
  const out = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x * src.w / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * src.w / w)), y0 = Math.floor(y * src.h / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * src.h / h)), s = [0, 0, 0, 0];
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) for (let c = 0; c < 4; c++) s[c] += src.data[(j * src.w + i) * 4 + c];
    for (let c = 0; c < 4; c++) out.data[(y * w + x) * 4 + c] = Math.round(s[c] / ((x1 - x0) * (y1 - y0)));
  }
  return out;
};
const rows = Math.ceil(keys.length / COLS), sheet = new Img(PAD + COLS * (S + PAD), PAD + rows * (S + PAD), '#2e222f');
keys.forEach((k, i) => sheet.blit(shrink(decodePNG(readFileSync(resolve(here, 'concept', k + '.png'))), S, S), PAD + (i % COLS) * (S + PAD), PAD + Math.floor(i / COLS) * (S + PAD)));
writeFileSync(resolve(here, 'out', 'contact.png'), sheet.png());
console.log('모아보기 →', resolve(here, 'out', 'contact.png'));
