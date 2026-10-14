// 변이 연출 층(설계 = docs/superpowers/specs/2026-10-15-v2-mutation-staging-design.md): 그림은 그대로 두고
//  ① 테두리 빛(빛 받는 쪽 외곽선 1칸을 변이 색으로) ② 문장(9×9) ③ 은은한 기운(변이형별 입자) ④ 발견 공개(종자 → 번쩍 → 등장)
import { W, H } from './parts.mjs';
import { rng } from './engine.mjs';

export const FORMS = {
  predator: { name: '포식', c: '#e8344a', hi: '#ff9aa6', dk: '#7a1424' },
  weapon: { name: '무기', c: '#b8c8e0', hi: '#ffffff', dk: '#4a5670' },
  toxic: { name: '독성', c: '#a050e0', hi: '#d8b0ff', dk: '#4a2470', fizz: '#b8f070' },
  spore: { name: '포자', c: '#f0c840', hi: '#fff4b0', dk: '#7a5a18' },
  dragon: { name: '용족', c: '#30c8b0', hi: '#b0fff0', dk: '#126a5e' },
};
// 9×9 문장: # 테두리, W 흰, C 변이 색, H 밝은 변이 색, D 어두운 변이 색
const EMB = {
  predator: ['..#####..', '.#WWWWW#.', '.#WWWWW#.', '..#WWW#..', '..#WWW#..', '...#W#...', '...#W#...', '....#....', '.........'],
  weapon: ['.......#W', '......#W#', '.....#W#.', '....#W#..', '.#.#W#...', '..#W#....', '.#D#.....', '#D#.#....', '.#.......'],
  toxic: ['....#....', '...#C#...', '...#C#...', '..#CCC#..', '.#CCHCC#.', '.#CCWCC#.', '.#CCCCC#.', '..#CCC#..', '...###...'],
  spore: ['..#####..', '.#CCCCC#.', '#CWCCWCC#', '#CCCCCCC#', '.#######.', '...#H#...', '...#H#...', '...###...', '.........'],
  dragon: ['...###...', '..#CCC#..', '.#CCWCC#.', '#CCCCCCC#', '#CCCHCCC#', '.#CCCCC#.', '..#CCC#..', '...###...', '.........'],
};
export function emblem(put, x, y, form, sc = 1) {
  const F = FORMS[form], col = { '#': '#1a1424', W: '#ffffff', C: F.c, H: F.hi, D: F.dk };
  EMB[form].forEach((row, j) => [...row].forEach((ch, i) => { if (col[ch]) for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) put(x + i * sc + a, y + j * sc + b, col[ch]); }));
}
// ① 테두리 빛: 빛 받는 쪽(왼쪽·위가 빈) 외곽 칸을 변이 색으로 amt만큼 섞고, 실루엣 바깥 1칸에 변이 색 후광(halo, 0~1 — 숨 쉬듯 밝아졌다 어두워짐)
//   후광은 흙 위(yMax 위)만 — 게임에서 '강화 개체' 테두리처럼 한눈에 보이게(처음 안 = 안쪽 섞기만으로는 거의 안 보임, 2026-10-15 실측)
export function rimTint(im, form, amt = 0.45, halo = 0.55, yMax = H, bg = [0x2f, 0x31, 0x50]) {
  const F = FORMS[form], c = [1, 3, 5].map(i => parseInt(F.c.slice(i, i + 2), 16)), on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && im.data[(y * W + x) * 4 + 3] >= 128;
  const rim = [], out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (on(x, y)) { if (!on(x - 1, y) || !on(x, y - 1) || !on(x - 1, y - 1)) rim.push(y * W + x); }
    else if (y < yMax && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) out.push(y * W + x);
  }
  for (const i of rim) for (let k = 0; k < 3; k++) im.data[i * 4 + k] = Math.round(im.data[i * 4 + k] + (c[k] - im.data[i * 4 + k]) * amt);
  for (const i of out) { for (let k = 0; k < 3; k++) im.data[i * 4 + k] = Math.round(bg[k] + (c[k] - bg[k]) * halo); im.data[i * 4 + 3] = 255; }
}
// ③ 은은한 기운(f = 장, rig = 뼈대, at = 쉬는 자리 → 이 장 자리, put = 화분 위 입자, im = 식물 층)
export function auraFrame(f, form, rig, eyeC, at, put, im, FR = 64) {
  const F = FORMS[form];
  if (form === 'predator') {   // 눈에 진홍 반짝(2장) + 진홍 입자가 천천히 오름
    if (f % 32 === 20 || f % 32 === 21) for (const [ex, ey] of eyeC) { const p = at([ex, ey]); put(Math.floor(p[0]), Math.floor(p[1]), f % 32 === 20 ? F.hi : F.c); }
    for (let q = 0; q < 3; q++) { const r = rng(q * 31 + 7), k = (f + Math.floor(r() * 40)) % 40, x = rig.hx - 14 + r() * 28, y = rig.hy + 10 - k * 0.7; if (k < 30) put(Math.floor(x + Math.sin(k * 0.3) * 1.5), Math.floor(y), k < 18 ? F.c : F.dk); }
  }
  if (form === 'weapon') {   // 몸 전체에 강철 광택 띠가 32장마다 쓸고 지나감 + 반짝 별 하나
    const k = f % 32;
    if (k < 6) { const u = 10 + k * 22; for (let i = 0; i < W * H; i++) { if (im.data[i * 4 + 3] < 128) continue; const x = i % W, y = (i - x) / W, d = Math.abs(x + y - u); if (d < 1) im.set(x, y, '#ffffff'); else if (d < 2.6) { for (let c = 0; c < 3; c++) im.data[i * 4 + c] = Math.round(im.data[i * 4 + c] + (255 - im.data[i * 4 + c]) * 0.5); } } }
    if (k >= 10 && k <= 14) { const s = [0, 1, 2, 1, 0][k - 10], p = at([rig.hx + 10, rig.hy - 12]); put(Math.floor(p[0]), Math.floor(p[1]), '#ffffff'); if (s) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(Math.floor(p[0]) + dx * s, Math.floor(p[1]) + dy * s, F.hi); }
  }
  if (form === 'toxic') {   // 밑동에서 보라 거품이 흔들리며 오르다 터짐
    for (let q = 0; q < 4; q++) { const r = rng(q * 53 + 3), life = 28, k = (f + Math.floor(r() * life)) % life, x = rig.ax - 10 + r() * 20 + Math.sin(k * 0.5 + q) * 1.2, y = rig.yA - 4 - k * 1.1; if (k < life - 3) { put(Math.floor(x), Math.floor(y), F.c); if (q % 2) put(Math.floor(x) + 1, Math.floor(y), F.c); put(Math.floor(x), Math.floor(y) - 1, F.fizz); } else put(Math.floor(x), Math.floor(y), F.hi); }
  }
  if (form === 'spore') {   // 금빛 포자가 머리 둘레에서 떠오름
    for (let q = 0; q < 6; q++) { const r = rng(q * 17 + 5), k = (f + Math.floor(r() * 48)) % 48, x = rig.hx - 18 + r() * 36 + Math.sin(k * 0.2 + q) * 2, y = rig.hy + 6 - k * 0.5; if (y > 2) put(Math.floor(x), Math.floor(y), k < 30 ? F.hi : F.c); }
  }
  if (form === 'dragon') {   // 비늘 반짝임이 사선으로 지나감 + 입가에 작은 숨결
    const k = f % 40;
    if (k < 10) for (let q = 0; q < 5; q++) { const u = k * 9 - 20 + q * 7, x = Math.floor(u * 0.6 + q * 3), y = Math.floor(rig.hy - 20 + u * 0.5); if (x >= 0 && y >= 0 && x < W && y < H && im.data[(y * W + x) * 4 + 3] >= 128) { put(x, y, F.hi); put(x + 1, y, F.c); } }
    if (k >= 20 && k < 30) { const p = at([rig.hx + 10, rig.hy + 4]); for (let s = 0; s < 3; s++) put(Math.floor(p[0] + (k - 20) * 0.8 + s * 2), Math.floor(p[1] - s - (k - 20) * 0.3), s ? F.c : F.hi); }
  }
}
// ④ 발견 공개 한 장(stage = 무대 Img, k = 0~39장): 0~11 종자가 떨며 금이 가고 변이 색 빛이 샘 → 12 흰 번쩍 → 13~18 식물 등장(고리 폭발) + 문장 도장 → 19~ 대기
export function revealFrame(stage, k, form, cx, cy, drawPlant) {
  const F = FORMS[form], put = (x, y, c) => { if (x >= 0 && y >= 0 && x < stage.w && y < stage.h) stage.set(x, y, c); };
  if (k < 12) {
    const shake = k > 4 ? (k % 2 ? 1 : -1) * Math.min(2, Math.floor((k - 4) / 2)) : 0, rx = 9, ry = 11, sx = cx + shake, sy = cy;
    for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2, d2 = (x / (rx + 1)) ** 2 + (y / (ry + 1)) ** 2;
      if (d <= 1) put(Math.floor(sx + x), Math.floor(sy + y), x + y < -5 ? '#f4e8c8' : x + y < 4 ? '#c8a878' : '#8a6a48'); else if (d2 <= 1) put(Math.floor(sx + x), Math.floor(sy + y), '#1a1424');
    }
    if (k >= 5) { const r = rng(9), cracks = Math.min(3, Math.floor((k - 3) / 2)); for (let q = 0; q < cracks; q++) { let x = sx + (r() - 0.5) * 6, y = sy - 4 + q * 3; for (let s = 0; s < 5; s++) { put(Math.floor(x), Math.floor(y), k % 2 ? F.hi : F.c); x += r() < 0.5 ? 1 : -1; y += 1; } } }
    if (k >= 7) { const R = 12 + (k - 7) * 2; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + k * 0.2; if (i % 2) continue; put(Math.floor(sx + Math.cos(a) * R), Math.floor(sy + Math.sin(a) * R * 1.1), i % 4 ? F.c : F.hi); } }
    return;
  }
  if (k === 12) { for (let i = 0; i < stage.w * stage.h; i++) stage.data.set([255, 255, 255, 255], i * 4); return; }
  drawPlant();
  if (k <= 18) { const R = 6 + (k - 13) * 6; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; put(Math.floor(cx + Math.cos(a) * R), Math.floor(cy - 10 + Math.sin(a) * R * 0.8), k < 16 ? F.hi : F.c); } }
  const sc = k < 15 ? 3 : k < 17 ? 2 : 1, ex = 6, ey = 6;
  EMB[form].forEach((row, j) => [...row].forEach((ch, i) => { const col = { '#': '#1a1424', W: '#ffffff', C: F.c, H: F.hi, D: F.dk }[ch]; if (col) for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) put(ex + i * sc + a, ey + j * sc + b, col); }));
}
