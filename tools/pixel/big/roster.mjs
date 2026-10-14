// 변환 결과 검수판: node tools/pixel/big/roster.mjs [--guide] <키…> → out/conv/roster.png (화분에 심은 모습 3배, 4열)
//   --guide = 화분 축(세로선)·흙 가운데(가로선)를 옅게 그어 놓는 자리·기울기를 재 보는 판(roster_guide.png) — 검수용, 산출물로 쓰지 않음
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, decodePNG } from './engine.mjs';
import { W, H } from './parts.mjs';
import { POT_GEO as P, POT3, renderPot } from './pot3d.mjs';
import { plantInPot } from './potblend.mjs';

const here = dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2), guide = args.includes('--guide');
const keys = args.filter(a => !a.startsWith('--')).filter(k => existsSync(resolve(here, 'out', 'conv', k + '_96x112.png')));
const Z = 3, PAD = 6, COLS = Math.min(4, keys.length), rows = Math.ceil(keys.length / COLS), pot = renderPot(POT3.pot_terra);
const sheet = new Img(PAD + COLS * (W * Z + PAD), PAD + rows * (H * Z + PAD), '#2e222f');
keys.forEach((k, i) => {
  const p = plantInPot(decodePNG(readFileSync(resolve(here, 'out', 'conv', k + '_96x112.png'))), pot, '#323353');
  if (guide) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x === Math.floor(P.cx) || y === Math.floor(P.cy)) { const q = (y * W + x) * 4; p.data[q] = Math.min(255, p.data[q] + 70); p.data[q + 2] = Math.min(255, p.data[q + 2] + 70); }
  sheet.blit(p, PAD + (i % COLS) * (W * Z + PAD), PAD + Math.floor(i / COLS) * (H * Z + PAD), Z);
});
const out = resolve(here, 'out', 'conv', guide ? 'roster_guide.png' : 'roster.png');
writeFileSync(out, sheet.png());
console.log('검수판 →', out);
