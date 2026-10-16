// 작은 칸용 그림(양육·도감·상점 — 2026-10-15 사용자 "추천대로"): 게임용 큰 판(96×112, assets/v2/plants·pots)의 대기 첫 장을
// 도트 규칙대로 절반(48×56)으로 줄인다. 칸 넷 → 한 칸: 칠한 칸이 하나뿐이면 비움, 둘이면(가는 선) 어두운 쪽, 셋 이상이면 가장 많은 색
// (같으면 어두운 쪽), 눈(아주 밝은 칸이 어두운 칸 옆에 있는 칸 넷)은 밝은 점을 살림 → 바깥 둘레 칸은 그 색을 한 단 어둡게(테두리 다시).
//   node tools/pixel/big/small.mjs → assets/v2/small/<키>.png(식물 under·over 두 장을 위·아래로 붙임 48×112) + pots/<화분>.png(뒤·앞 48×112) + 검토판 out/conv/small_sheet.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, decodePNG } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const KEYS = ['flower_grass', 'thorn', 'aqua', 'flower_wind', 'spark', 'vine_water', 'cactus_fire', 'gaia', 'flower_fire', 'cactus_wind', 'vine_wind', 'spore_cap', 'frost_bell', 'volt_vine', 'stone_cap', 'jelly_cap', 'fang_trap', 'blade_vine', 'toxi_cactus', 'draco_fruit', 'ember_cap', 'drake_cactus'];
const POTS = ['pot_terra', 'pot_ceramic', 'pot_glass', 'pot_crystal', 'pot_gold'];
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

function crop(src, sx, sy, w, h) { const o = new Img(w, h); for (let y = 0; y < h; y++) o.data.set(src.data.subarray(((sy + y) * src.w + sx) * 4, ((sy + y) * src.w + sx + w) * 4), y * w * 4); return o; }
function half(src) {
  const w = src.w >> 1, h = src.h >> 1, o = new Img(w, h), d = src.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = [];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y * 2 + dy) * src.w + x * 2 + dx) * 4; if (d[i + 3] >= 128) px.push([d[i], d[i + 1], d[i + 2]]); }
    if (px.length < 2) continue;
    const L = px.map(p => lum(...p)), key = p => p.join(',');
    let pick;
    const hi = L.findIndex(v => v > 0.86), lo = L.some(v => v < 0.22);
    if (hi >= 0 && lo && px.length >= 3) pick = px[hi];   // 눈 반짝임
    else if (px.length === 2) pick = L[0] <= L[1] ? px[0] : px[1];
    else {
      const cnt = new Map(); px.forEach(p => cnt.set(key(p), (cnt.get(key(p)) || 0) + 1));
      let best = null, bc = 0, bl = 9;
      px.forEach((p, k) => { const c = cnt.get(key(p)); if (c > bc || (c === bc && L[k] < bl)) { best = p; bc = c; bl = L[k]; } });
      pick = best;
    }
    const i = (y * w + x) * 4; o.data[i] = pick[0]; o.data[i + 1] = pick[1]; o.data[i + 2] = pick[2]; o.data[i + 3] = 255;
  }
  return o;
}
// 바깥 둘레(투명과 맞닿은 칸) 다시 테두리: 밝으면 한 단 어둡게
function reOutline(im) {
  const o = new Img(im.w, im.h); o.data.set(im.data);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const i = (y * im.w + x) * 4; if (im.data[i + 3] < 128) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= im.w || ny >= im.h || im.data[(ny * im.w + nx) * 4 + 3] < 128; });
    if (edge && lum(im.data[i], im.data[i + 1], im.data[i + 2]) > 0.3) for (let c = 0; c < 3; c++) o.data[i + c] = Math.round(im.data[i + c] * 0.62);
  }
  return o;
}
const stack = (a, b) => { const o = new Img(a.w, a.h * 2); o.blit(a, 0, 0); o.blit(b, 0, a.h); return o; };
mkdirSync(resolve(repo, 'assets', 'v2', 'small', 'pots'), { recursive: true });
const smalls = {};
for (const k of KEYS) {
  const sheet = decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'plants', k + '.png'))), meta = JSON.parse(readFileSync(resolve(repo, 'assets', 'v2', 'plants', k + '.json'), 'utf8'));
  const under = reOutline(half(crop(sheet, 0, 0, meta.w, meta.h))), over = half(crop(sheet, 0, meta.rows * meta.h, meta.w, meta.h));
  writeFileSync(resolve(repo, 'assets', 'v2', 'small', k + '.png'), stack(under, over).png());
  smalls[k] = { under, over };
}
const pots = {};
for (const p of POTS) {
  const back = half(decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'pots', p + '_back.png')))), front = half(decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'pots', p + '_front.png'))));
  writeFileSync(resolve(repo, 'assets', 'v2', 'small', 'pots', p + '.png'), stack(back, front).png());
  pots[p] = { back, front };
}
// 검토판: 위 = 새 작은 그림(화분 심음) · 아래 = 옛 48×56, 4배
const Z = 4, cell = 52, sheet = new Img(KEYS.length * cell * Z / 2 + 8, 2 * 60 * Z + 12, '#2a2738');
KEYS.forEach((k, i) => {
  const im = new Img(48, 56, '#3b3a4f'); im.blit(pots.pot_terra.back, 0, 0); im.blit(smalls[k].under, 0, 0); im.blit(pots.pot_terra.front, 0, 0); im.blit(smalls[k].over, 0, 0);
  const x = 4 + i * cell * Z / 2;
  sheet.blit(im, x, 4, Z / 2 * 2 > 4 ? 2 : 2);
  try { const old = decodePNG(readFileSync(resolve(repo, 'assets', 'sprites', k + '.png'))), bgO = new Img(48, 56, '#3b3a4f'); const pt = decodePNG(readFileSync(resolve(repo, 'assets', 'sprites', 'pot_terra.png'))); bgO.blit(pt, 0, 0); bgO.blit(old, 0, 0); sheet.blit(bgO, x, 4 + 56 * 2 + 8, 2); } catch {}
});
writeFileSync(resolve(here, 'out', 'conv', 'small_sheet.png'), sheet.png());
console.log('작은 칸 그림 →', resolve(repo, 'assets', 'v2', 'small'), '· 검토판 out/conv/small_sheet.png');
