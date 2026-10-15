// 레트로 우주선 경기장(클로드가 직접 그림 — 2026-10-15 사용자 "너무 화려 — 약간 레트로 느낌의 우주선에 투박한 느낌", "너가 톤에 맞게 함 그려봐").
// 화물선 격납고 안 경기장: 천장 철골 트러스·브라운관 점수판·작업등 → 철골 관중석 세 단(로봇·화분·외계인 관중) → 경고 빗금 벽 + 가운데 방폭문
//  → 네모 갑판 철판 바닥(미끄럼 무늬·리벳 줄·닳은 노란 고리·가운데 잎 스텐실·기름 얼룩·등불 빛 웅덩이).
// 색: 그늘은 차갑게(푸른 회색), 빛은 따뜻하게(호박색) — 칙칙하고 적은 수, 그라데이션 대신 4×4 디더. 반짝임·네온·광택 없음.
// 자리는 안내판(bgguide.mjs arena)과 같음: 관중석 ~102, 벽 102~116, 바닥 가운데 원 (135,226), 받침 (76,302)·(194,142)은 게임이 그림.
//   node tools/pixel/big/retro_bg.mjs [--zoom=3] → assets/v2/bg/arena_retro.png (+ 미리보기 out/conv/arena_retro_x<배>.png)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './engine.mjs';
import { rng } from './fxcore.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const W = 270, H = 348, K = 0.4384, CX = 135, CY = 226;
export const RETRO = {
  k0: '#121518', k1: '#191d21', k2: '#21262b', k3: '#2a3035', k4: '#343a3f',
  m0: '#3b403f', m1: '#474c49', m2: '#555a54', m3: '#656a61', m4: '#787c70', m5: '#8f9283', m6: '#aaa995', m7: '#c9c5ad',
  o0: '#2c3326', o1: '#3a4530', o2: '#4e5c3c', o3: '#667650', o4: '#869468',
  r0: '#3f2a22', r1: '#5e3a28', r2: '#86502f', r3: '#ad6a38',
  a0: '#7a5520', a1: '#b47a2c', a2: '#dba04a', a3: '#f2c774', a4: '#fff0c4',
  y0: '#8a7024', y1: '#c09c36', y2: '#ddbd56',
  t0: '#14302a', t1: '#22503f', t2: '#3f8a62', t3: '#86d28e',
  d0: '#6e2a24', d1: '#a0402e',
  c0: '#4c4560', c1: '#6c6286', b0: '#33445c', b1: '#4c6282', p0: '#6a3a3a', p1: '#8e5048',
};
const P = RETRO;
const im = new Img(W, H, P.k1);
const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H && c) im.set(x, y, c); };
const get = (x, y) => { const i = (y * W + x) * 4, d = im.data; return '#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); };
const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const dz = (x, y, t) => B4[y & 3][x & 3] < t * 16;
const R = rng(1979);
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h >>> 8) / 16777216; };
const curve = x => Math.round(5 * ((x - CX) / CX) ** 2);   // 둥근 경기장 둘레라 뒤쪽 벽·관중석 양끝이 조금 내려옴
const DARK = { [P.m0]: P.k4, [P.m1]: P.m0, [P.m2]: P.m1, [P.m3]: P.m2, [P.m4]: P.m3, [P.m5]: P.m4, [P.m6]: P.m5, [P.o1]: P.o0, [P.o2]: P.o1, [P.o3]: P.o2, [P.o4]: P.o3, [P.r1]: P.r0, [P.r2]: P.r1, [P.r3]: P.r2, [P.c0]: P.k4, [P.c1]: P.c0, [P.b0]: P.k4, [P.b1]: P.b0, [P.p0]: P.r0, [P.p1]: P.p0, [P.t1]: P.t0, [P.t2]: P.t1, [P.t3]: P.t2, [P.k4]: P.k3, [P.k3]: P.k2, [P.k2]: P.k1, [P.y1]: P.y0, [P.y2]: P.y1, [P.a2]: P.a1, [P.a1]: P.a0, [P.d1]: P.d0 };
const darker = c => DARK[c] || c;

// ── 1. 천장: 철골 트러스 + 브라운관 점수판 + 작업등 ──
for (let y = 0; y < 26; y++) for (let x = 0; x < W; x++) put(x, y, dz(x, y, y / 40) ? P.k2 : P.k1);
const truss = (y0, y1) => {   // 위·아래 들보 + 빗살
  rect(0, y0, W, 2, P.m2); rect(0, y0, W, 1, P.m4); rect(0, y1, W, 2, P.m1); rect(0, y1, W, 1, P.m3);
  for (let x = -20; x < W + 20; x += 20) for (let t = 0; t <= y1 - y0; t++) { put(x + t, y0 + t, P.m1); put(x + 20 - t, y0 + t, P.m0); }
};
truss(1, 9);
// 점수판(가운데, 줄 둘에 매달림): 철 상자 + 짙은 녹색 화면 + 막대 그래프 + 주사선
rect(103, 9, 1, 3, P.k4); rect(166, 9, 1, 3, P.k4);
rect(96, 11, 78, 16, P.k0); rect(97, 12, 76, 14, P.m2); rect(97, 12, 76, 1, P.m4); rect(97, 25, 76, 1, P.m0);
rect(100, 14, 70, 10, P.t0);
for (let i = 0; i < 9; i++) { const h = 2 + Math.floor(hash(i, 3) * 6); rect(103 + i * 7, 23 - h, 4, h, i === 4 ? P.t3 : P.t2); }
for (let y = 15; y < 24; y += 2) for (let x = 100; x < 170; x++) if (get(x, y) === P.t0) put(x, y, P.k1);
put(99, 13, P.m6); put(170, 13, P.m6); put(99, 24, P.m0); put(170, 24, P.m0);
for (const lx of [40, 230]) {   // 작업등: 줄 → 갓 → 전구
  rect(lx, 10, 1, 7, P.k4);
  for (let j = 0; j < 4; j++) rect(lx - 3 - j, 17 + j, 7 + j * 2, 1, j === 0 ? P.m5 : P.m3);
  rect(lx - 3, 21, 7, 1, P.a3); put(lx, 21, P.a4);
}

// ── 2. 관중석 세 단(뒤 단일수록 어둡게): 단 뒷벽 → 관중 한 줄(9×12) → 앞 난간(관중 아랫몸을 가림) ──
const MINI = {
  robot: ['...h.....', '..dddd...', '.dLLLLd..', 'dLvvvvLd.', 'dLLLLLLd.', '.dLLLLd..', '..dddd...', '.dMMMMd..', 'dMMMMMMd.', 'dMMeMMMd.', 'dMMMMMMd.', '.d....d..'],
  pot: ['.g.....g.', '.gg...gg.', '..gGgGg..', '.gGGgGGg.', '..gGGGg..', '....g....', '..ppppp..', '.pPPPPPp.', '.pPPPPPp.', '.pPPPPPp.', '..ppppp..', '.........'],
  alien: ['..a...a..', '...a.a...', '..aaaaa..', '.aAAAAAa.', 'aAAeAeAAa', 'aAAAAAAAa', '.aAAAAAa.', '..aaaaa..', '.bBBBBBb.', 'bBBBBBBBb', 'bBBBBBBBb', '.b.....b.'],
  cheer: ['d.......d', 'd..ddd..d', '.ddLLLdd.', '..LvvvL..', '..LLLLL..', '...ddd...', '..dMMMd..', '.dMMMMMd.', '.dMMeMMd.', '.dMMMMMd.', '.dMMMMMd.', '..d...d..'],
};
const VAR = {
  robot: [{ d: P.m1, L: P.m4, v: P.a3, M: P.o2, e: P.a2, h: P.d1 }, { d: P.k4, L: P.m3, v: P.t3, M: P.b0, e: P.t2, h: P.a2 }, { d: P.m0, L: P.m5, v: P.a2, M: P.r1, e: P.y2, h: P.t2 }],
  pot: [{ g: P.o2, G: P.o3, p: P.r1, P: P.r2 }, { g: P.o1, G: P.o4, p: P.m1, P: P.m3 }, { g: P.t1, G: P.t2, p: P.r0, P: P.r1 }],
  alien: [{ a: P.o1, A: P.o3, e: P.k0, b: P.c0, B: P.c1 }, { a: P.c0, A: P.c1, e: P.a3, b: P.m1, B: P.m3 }, { a: P.t1, A: P.t2, e: P.k0, b: P.p0, B: P.p1 }],
  cheer: [{ d: P.m1, L: P.m4, v: P.a3, M: P.o1, e: P.a2 }, { d: P.k4, L: P.m3, v: P.t3, M: P.c0, e: P.t3 }],
};
function mini(kind, v, x, y, tone) {
  const C = VAR[kind][v % VAR[kind].length];
  MINI[kind].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '.') return; let c = C[ch]; if (tone && ch !== 'v' && ch !== 'e') c = tone(c); put(x + i, y + j, c); }));
}
const TIERS = [{ y: 24, tone: c => darker(darker(c)) }, { y: 49, tone: darker }, { y: 74, tone: null }];
TIERS.forEach(({ y: ty, tone }, ti) => {
  for (let x = 0; x < W; x++) { const y0 = ty + curve(x); for (let y = y0; y < y0 + 16; y++) put(x, y, dz(x, y, 0.25 + ti * 0.12) ? P.k2 : P.k1); }   // 단 뒷벽
  let x = -4 + ti * 3;
  while (x < W) {
    const r = R();
    if (r < 0.05) { x += 7; continue; }
    const kind = r < 0.34 ? 'robot' : r < 0.6 ? 'pot' : r < 0.85 ? 'alien' : 'cheer';
    const y = ty + curve(x + 4) + 3 + (R() < 0.25 ? -1 : 0);
    mini(kind, Math.floor(R() * 3), x, y, tone);
    if (R() < 0.06) { rect(x + 8, y - 5, 1, 9, P.m4); rect(x + 9, y - 5, 5, 3, R() < 0.5 ? P.a1 : P.t2); }   // 작은 깃발
    x += 10 + Math.floor(R() * 2);
  }
  for (let x2 = 0; x2 < W; x2++) {   // 앞 난간: 윗선 밝게·띠·리벳·아랫선 그늘
    const y0 = ty + 16 + curve(x2), L = tone || (c => c);
    put(x2, y0, L(P.m6)); put(x2, y0 + 1, L(P.m4));
    for (let y = y0 + 2; y < y0 + 7; y++) put(x2, y, L(dz(x2, y, 0.3) ? P.m2 : P.m3));
    put(x2, y0 + 7, P.k1);
    if ((x2 + ti * 7) % 18 === 0) { put(x2, y0 + 4, L(P.m6)); put(x2 + 1, y0 + 5, P.m0); }
  }
  for (let x2 = 12 + ti * 9; x2 < W; x2 += 54) { const y0 = ty + 24 + curve(x2); rect(x2, y0, 3, 3, P.k3); }
});
for (const lx of [40, 230]) for (let y = 24; y < 100; y++) for (let x = lx - 34; x < lx + 35; x++) {   // 등불 빛이 관중석에 흐리게
  const d = Math.abs(x - lx) / 34 + (y - 24) / 110; if (d >= 1 || !dz(x, y, (1 - d) * 0.3)) continue;
  const c = get(x, y); if (c === P.k1 || c === P.k2) put(x, y, P.r0);
}

// ── 3. 낮은 벽: 쇠 덮개 + 노랑·검정 경고 빗금 + 아래 판·리벳, 가운데 방폭문(갈매기 무늬) ──
for (let x = 0; x < W; x++) {
  const y0 = 100 + curve(x);
  put(x, y0, P.m7); put(x, y0 + 1, P.m5); put(x, y0 + 2, P.m4);
  for (let y = y0 + 3; y < y0 + 8; y++) put(x, y, (Math.floor((x + (y - y0)) / 4) % 2) ? P.k2 : (y === y0 + 3 ? P.y2 : P.y1));
  for (let y = y0 + 8; y < y0 + 14; y++) put(x, y, dz(x, y, 0.25) ? P.m2 : P.m3);
  put(x, y0 + 14, P.k2);
  if (x % 22 === 5) { put(x, y0 + 10, P.m6); put(x + 1, y0 + 11, P.m0); }
}
{ const dx = 117, dy = 100 + curve(135) + 1;   // 방폭문
  rect(dx - 1, dy - 1, 38, 16, P.k1); rect(dx, dy, 36, 14, P.m2); rect(dx, dy, 36, 1, P.m5);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 34; x++) { const v = (Math.abs(x - 17) + y) % 8 < 4; put(dx + 1 + x, dy + 1 + y, v ? P.y1 : P.k2); }
  rect(dx + 17, dy, 1, 14, P.k1); rect(dx + 1, dy + 13, 34, 1, P.m1);
  put(dx + 3, dy + 2, P.d1); put(dx + 32, dy + 2, P.d1);   // 문 위 빨간 표시등
}

// ── 4. 바닥: 네모 갑판 철판(바닥 각도대로 가로로 넓적) — 판마다 조금 다른 색·미끄럼 무늬, 이음새 + 아래 밝은 턱 + 리벳 줄 ──
const fy = x => 115 + curve(x), PW = 54, PH = PW * K;   // 판 한 장 = 세계 54 → 화면 54 × 23.7(큰 판이라 이음새가 덜 촘촘)
const cellOf = (x, y) => [Math.floor((x - CX) / PW), Math.floor((y - CY) / PH)];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (y < fy(x)) continue;
  const [i, j] = cellOf(x, y), v = hash(i + 40, j + 40), u = ((x - CX) % PW + PW) % PW, w = ((y - CY) % PH + PH) % PH;
  let c = v < 0.35 ? P.m2 : P.m3;
  if (v > 0.78) {   // 미끄럼 무늬 판: 비스듬한 돋을 줄(위 칸 밝게·아래 칸 그늘)
    const wy = Math.floor(w * 1.6), sx = (u + wy * 2) % 7;
    if (wy % 2 === 0 && sx < 2) c = P.m5; else if (wy % 2 === 1 && sx < 2) c = P.m1;
  }
  if (y < 130 && dz(x, y, (130 - y) / 22)) c = darker(c);   // 먼 벽 밑은 조금 어둡게(그늘)
  put(x, y, c);
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // 이음새 = 어두운 줄, 바로 아래(가로)·오른쪽(세로) 밝은 턱 + 리벳 줄
  if (y < fy(x) + 1) continue;
  const u = ((x - CX) % PW + PW) % PW, w = ((y - CY) % PH + PH) % PH;
  if (w < 1) { put(x, y, P.k3); put(x, y + 1, P.m4); if (u % 9 === 4) { put(x, y - 2, P.m6); put(x + 1, y - 2, P.m1); } }
  else if (u < 1) { put(x, y, P.k3); put(x + 1, y, P.m4); if (Math.floor(w) % 6 === 3) { put(x - 2, y, P.m6); put(x - 2, y + 1, P.m1); } }
}
// 닳은 노란 고리(반지름 116, 군데군데 벗겨짐) + 안쪽 점선
for (let y = 118; y < H; y++) for (let x = 0; x < W; x++) {
  const r = Math.hypot(x + 0.5 - CX, (y + 0.5 - CY) / K), ang = Math.atan2((y - CY) / K, x - CX);
  if (r > 114 && r < 119.5 && !(hash(Math.floor(ang * 30), 7) < 0.2 || hash(x, y) < 0.1)) put(x, y, r < 115.6 ? P.y2 : P.y1);
  if (r > 100 && r < 102 && Math.floor((ang + Math.PI) * 18) % 2 === 0 && hash(x, y) > 0.2) put(x, y, P.y0);
}
// 가운데 잎 스텐실(올리브 페인트, 바닥 각도대로 납작, 닳음)
for (let y = 196; y < 258; y++) for (let x = 92; x < 180; x++) {
  const dx = (x + 0.5 - CX) / 30, dzv = (y + 0.5 - CY) / K / 30;
  for (const rot of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const ux = dx * Math.cos(rot) + dzv * Math.sin(rot), uz = -dx * Math.sin(rot) + dzv * Math.cos(rot);
    const lx = ux / 0.4, lz = (uz - 0.6) / 0.52;
    if (lx * lx + lz * lz < 1 && hash(x * 3 + 1, y * 5 + 2) > 0.16) put(x, y, Math.abs(ux) < 0.06 ? P.o1 : (lx < 0 ? P.o3 : P.o2));
  }
}
// 기름 얼룩·긁힘(받침 자리는 비움)
for (let n = 0; n < 10; n++) {
  const sx = 16 + R() * 238, sy = 140 + R() * 200, rx = 5 + R() * 11, ry = rx * K;
  if (Math.hypot(sx - 76, (sy - 302) / K) < 62 || Math.hypot(sx - 194, (sy - 142) / K) < 58 || Math.hypot(sx - CX, (sy - CY) / K) < 50) continue;
  for (let y = Math.floor(sy - ry); y <= sy + ry; y++) for (let x = Math.floor(sx - rx); x <= sx + rx; x++) { const d = ((x - sx) / rx) ** 2 + ((y - sy) / ry) ** 2; if (d < 1 && dz(x, y, 0.55 * (1 - d)) && y >= fy(x) + 2) put(x, y, P.k4); }
}
for (let n = 0; n < 12; n++) { const sx = R() * W, sy = 150 + R() * 190, len = 4 + R() * 8; for (let i = 0; i < len; i++) put(sx + i, sy + Math.round(i * 0.25), P.m5); }
// 등불 빛 웅덩이(철판이 한 단 밝아짐) + 아래·양 모서리 어둡게
const LIT = { [P.m1]: P.m2, [P.m2]: P.m3, [P.m3]: P.m4, [P.m4]: P.m5, [P.k3]: P.m1, [P.k4]: P.m1 };
for (const [lx, ly, rx] of [[48, 150, 80], [222, 156, 74]]) for (let y = 116; y < H; y++) for (let x = 0; x < W; x++) {
  const d = ((x - lx) / rx) ** 2 + ((y - ly) / (rx * K * 1.5)) ** 2; if (d >= 1 || !dz(x, y, (1 - d) * 0.55)) continue;
  const c = get(x, y); if (LIT[c]) put(x, y, LIT[c]);
}
// 벽 밑 양 구석 화물 상자(앞면 + 윗면 + 경고 줄), 기름통 하나
function crate(x, y, w, h, d, body, hi, lo, mark) {
  for (let j = 0; j < d; j++) rect(x + Math.round((d - j) * 0.9), y - d + j, w, 1, j === 0 ? P.k2 : hi);   // 윗면(바닥 각도로 납작)
  rect(x, y, w, h, body); rect(x, y, w, 1, hi); rect(x, y + h - 1, w, 1, lo); rect(x, y, 1, h, hi); rect(x + w - 1, y, 1, h, lo);
  rect(x + 2, y + 3, w - 4, 1, lo); rect(x + 2, y + h - 4, w - 4, 1, lo);   // 띠
  if (mark) for (let i = 0; i < w - 6; i++) if (Math.floor(i / 3) % 2 === 0) rect(x + 3 + i, y + 5, 1, h - 10, mark);
  rect(x - 1, y + h, w + 3, 1, P.k2);   // 바닥 닿는 그늘
}
crate(6, 124, 24, 16, 6, P.o2, P.o3, P.o0, P.y1);
crate(30, 128, 14, 12, 5, P.r2, P.r3, P.r0, null);
crate(240, 122, 24, 18, 6, P.m3, P.m5, P.m1, P.d1);
{ const bx = 228, by = 128; for (let j = 0; j < 14; j++) rect(bx, by + j, 9, 1, j % 5 === 0 ? P.t2 : P.t1); rect(bx, by, 9, 1, P.t3); rect(bx + 8, by, 1, 14, P.t0); rect(bx - 1, by + 14, 11, 1, P.k2); }   // 기름통
for (let y = 240; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.max(0, Math.abs(x - CX) / CX - 0.45) * 1.1 + Math.max(0, (y - 290) / 200); if (dz(x, y, Math.min(0.85, e))) put(x, y, darker(get(x, y))); }

mkdirSync(resolve(repo, 'assets', 'v2', 'bg'), { recursive: true });
writeFileSync(resolve(repo, 'assets', 'v2', 'bg', 'arena_retro.png'), im.png());
const z = +(process.argv.find(a => a.startsWith('--zoom=')) || '--zoom=3').slice(7);
const big = new Img(W * z, H * z); big.blit(im, 0, 0, z);
mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
writeFileSync(resolve(here, 'out', 'conv', 'arena_retro_x' + z + '.png'), big.png());
console.log('레트로 경기장 →', resolve(repo, 'assets', 'v2', 'bg', 'arena_retro.png'));
