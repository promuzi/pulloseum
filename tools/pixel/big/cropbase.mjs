// 밑줄기 잘라내기(2026-10-18 사용자 "발레 · 화살 쏘는 풀 크기를 더 키워 — 너무 높아지면 밑줄기를 자연스럽게 잘라내 봐"):
//  원화(누끼)에서 y 아래를 지워(투명) 변환기가 그 줄을 흙 줄로 삼게 함 → 키가 줄어 판에 맞춘 축척이 커짐(몸이 커짐). 원본은 _full 로 한 번만 남김
//   node tools/pixel/big/cropbase.mjs <누끼.png> <y>
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { decodePNG, encodePNG } from './engine.mjs';
const [file, Y] = process.argv.slice(2);
if (!file || Y == null) { console.log('node cropbase.mjs <누끼.png> <y>'); process.exit(1); }
const full = file.replace(/\.png$/, '_full.png');
if (!existsSync(full)) copyFileSync(file, full);   // 처음 한 번 = 자르기 전 그림을 남김(다시 자를 땐 이걸 읽음)
const im = decodePNG(readFileSync(full)), y0 = +Y;
for (let y = y0; y < im.h; y++) for (let x = 0; x < im.w; x++) im.data[(y * im.w + x) * 4 + 3] = 0;
writeFileSync(file, encodePNG(im.w, im.h, im.data));
console.log(`${file} — y ${y0} 아래 지움(원본 ${full})`);
