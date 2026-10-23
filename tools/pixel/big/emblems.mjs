// 대회 단계 엠블럼(2026-10-23 사용자 "승급시 모션도 줘. 롤처럼 엠블럼도 좋고"): 코덱스 원화(concept/emblems/ — 한 장에 넷) → 칸 자르기 → 누끼(greycut) → 도트(itemconv)
//   node tools/pixel/big/emblems.mjs  → assets/v2/icons/emblem_<단계>_l.png · _m.png · _s.png + 검토판 tools/pixel/big/out/emblems/sheet.png
//   l = 단계 승급 모션(모두 같은 배율 — 가장 큰 풀로세움이 96칸, 낮은 단계일수록 작게) · m = 칸 승급 모션(같은 배율 48칸) · s = 점수 판 · 순위표(저마다 24칸 안에 꽉)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { decodePNG, encodePNG } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..'), CON = resolve(here, 'concept', 'emblems'), OUT = resolve(repo, 'assets', 'v2', 'icons');
const SHEETS = { emblems_01: ['bronze', 'silver', 'gold', 'plat'], emblems_02: ['diamond', 'master', 'pullo', null] };   // 왼위 · 오른위 · 왼아래 · 오른아래(요청서 EMBLEMS_PROMPT.md 차례)
const PARTS = new Set(['pullo']);   // 몸에서 살짝 떨어진 별 끝이 있는 것 = 가장 큰 덩어리만 남기지 않음
const SIZE = { l: 96, m: 48, s: 24 }, COLORS = { l: 28, m: 18, s: 12 };
for (const d of ['split', 'cut']) mkdirSync(resolve(CON, d), { recursive: true });
mkdirSync(OUT, { recursive: true }); mkdirSync(resolve(here, 'out', 'emblems'), { recursive: true });
const run = (script, args) => execFileSync(process.execPath, [resolve(here, script), ...args], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const box = {};
// 1) 칸 자르기 → 누끼 → 불투명 둘레
for (const [sheet, names] of Object.entries(SHEETS)) {
  const f = resolve(CON, sheet + '.png'); if (!existsSync(f)) continue;
  const im = decodePNG(readFileSync(f)), cw = im.w >> 1, ch = im.h >> 1;
  names.forEach((n, q) => {
    if (!n) return;
    const ox = (q % 2) * cw, oy = (q >> 1) * ch, d = new Uint8Array(cw * ch * 4);
    for (let y = 0; y < ch; y++) d.set(im.data.subarray(((oy + y) * im.w + ox) * 4, ((oy + y) * im.w + ox + cw) * 4), y * cw * 4);
    const sp = resolve(CON, 'split', n + '.png'), cp = resolve(CON, 'cut', n + '.png');
    writeFileSync(sp, encodePNG(cw, ch, d));
    run('greycut.mjs', [sp, cp, ...(PARTS.has(n) ? [] : ['--main'])]);
    const C = decodePNG(readFileSync(cp)); let x0 = C.w, y0 = C.h, x1 = -1, y1 = -1;
    for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) if (C.data[(y * C.w + x) * 4 + 3] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    box[n] = { cp, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  });
}
// 2) 크기마다 도트: l · m = 모든 단계 같은 배율(가장 큰 엠블럼의 긴 변 = 96 · 48) · s = 저마다 24칸 안에 꽉
const big = Math.max(...Object.values(box).map(b => Math.max(b.w, b.h))), made = [];
for (const [n, b] of Object.entries(box)) for (const [k, px] of Object.entries(SIZE)) {
  const s = k === 's' ? px / Math.max(b.w, b.h) : px / big, w = Math.max(4, Math.round(b.w * s)), h = Math.max(4, Math.round(b.h * s)), fn = `emblem_${n}_${k}`;
  console.log(run('itemconv.mjs', [b.cp, resolve(OUT, fn + '.png'), '--w=' + w, '--h=' + h, '--colors=' + COLORS[k]]));
  made.push([fn, k]);
}
// 3) 검토판: 크기마다 한 줄(l · m · s), 2배 · 어두운 바탕
const Z = 2, cellW = 104 * Z, rowsH = { l: 104 * Z, m: 56 * Z, s: 32 * Z }, names = Object.keys(box), W = names.length * cellW, H = rowsH.l + rowsH.m + rowsH.s, out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { out[i * 4] = 12; out[i * 4 + 1] = 21; out[i * 4 + 2] = 38; out[i * 4 + 3] = 255; }
let ry = 0;
for (const k of ['l', 'm', 's']) {
  names.forEach((n, q) => {
    const im = decodePNG(readFileSync(resolve(OUT, `emblem_${n}_${k}.png`))), ox = q * cellW + Math.floor((cellW - im.w * Z) / 2), oy = ry + Math.floor((rowsH[k] - im.h * Z) / 2);
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const s = (y * im.w + x) * 4; if (im.data[s + 3] < 128) continue; for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) { const o = ((oy + y * Z + dy) * W + ox + x * Z + dx) * 4; out[o] = im.data[s]; out[o + 1] = im.data[s + 1]; out[o + 2] = im.data[s + 2]; } }
  });
  ry += rowsH[k];
}
writeFileSync(resolve(here, 'out', 'emblems', 'sheet.png'), encodePNG(W, H, out));
console.log(`엠블럼 ${made.length}장 → assets/v2/icons/ · 검토판 tools/pixel/big/out/emblems/sheet.png`);
