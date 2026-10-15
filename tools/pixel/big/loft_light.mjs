// 코덱스 홈(원형 방) 배경의 '전등 빛'을 떼어 내 밝기 단계별 그림을 굽는다 — 게임이 전등을 깜빡이게(2026-10-15 사용자 "전등 효과도 고정이 아닌 깜빡거리거나 먼지같은 흐림 등").
//  방법: 방은 원래 찬 회색(OKLab b < 0)인데 전등 빛을 받은 곳만 따뜻하다(b ↑, 밝기 ↑). 줄마다 양 끝(빛 안 닿는 곳)의 b 를 기준으로
//   따뜻함이 남는 만큼을 '빛'으로 보고, 빛을 뺀 색(꺼진 전등)을 추정 → 단계 k(0 = 꺼짐 … 1 = 원본)마다 OKLab 로 섞어
//   배경 그림의 색표(56색)에 맞추고 두 이웃 색 사이는 4×4 바이어 디더(픽셀 그림 방식 — 매끈한 반투명 대신 정해진 색 단계).
//  창 안(게임이 우주를 직접 그림)·의자 나무·창 테두리 쇠붙이는 빼고, 창 유리 칸 모양(줄마다 칸 범위)과 원뿔 범위를 json 으로.
//   node tools/pixel/big/loft_light.mjs → assets/v2/bg/home_loft_dim.png(단계별 띠) + home_loft.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, Img } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const BG = resolve(repo, 'assets', 'v2', 'bg');
const im = decodePNG(readFileSync(resolve(BG, 'home_loft.png'))), W = im.w, H = im.h;
const LEVELS = [0, 0.33, 0.58, 0.83, 1.17];                   // 퀘이크 빛 글자 a·e·h·k·o (m = 1 = 원본)
const WIN = { x: 134, y: 208, r: 88 };                         // 둥근 통창 유리(원 맞춤 결과)

// sRGB ↔ OKLab
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = v => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)); };
function toLab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function toRgb(L, A, B) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
  return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
}
const px = (x, y) => { const k = (y * W + x) * 4; return [im.data[k], im.data[k + 1], im.data[k + 2]]; };
const LAB = new Float32Array(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) LAB.set(toLab(...px(x, y)), (y * W + x) * 3);
const lab = (x, y) => { const i = (y * W + x) * 3; return [LAB[i], LAB[i + 1], LAB[i + 2]]; };
// 색표(배경 그림의 색들)
const PAL = [...new Set(Array.from({ length: W * H }, (_, i) => (im.data[i * 4] << 16) | (im.data[i * 4 + 1] << 8) | im.data[i * 4 + 2]))];
const PLAB = PAL.map(c => toLab(c >> 16, (c >> 8) & 255, c & 255));

// ── 빼는 곳: 창 안(유리 + 바깥 풍경), 창 테두리·쇠붙이, 의자 나무 ──
const dW = (x, y) => Math.hypot(x + 0.5 - WIN.x, y + 0.5 - WIN.y);
const glassCol = ([r, g, b]) => (b > r + 6 && r + g + b < 200) || (r < 110 && g < 80 && b < 70 && r > b);
const inWindow = (x, y) => { const d = dW(x, y); return d <= 84 || (d <= 91 && glassCol(px(x, y))); };
const inRing = (x, y) => { const d = dW(x, y); return d <= 101 && !inWindow(x, y); };
// 의자 = 앉는 판(윗면 타원 + 두께 띠) + 다리 셋(격자 확대로 잰 선분). 색으로 찾으면 빛 받은 따뜻한 바닥까지 나무로 잡혀 꺼짐 단계에 주황 테가 남음
const legOn = (X, Y, x0, y0, x1, y1, hw) => Y >= y0 && Y <= y1 && Math.abs(X - (x0 + (x1 - x0) * (Y - y0) / (y1 - y0))) <= hw;
const inStool = (x, y) => {
  const X = x + 0.5, Y = y + 0.5;
  return ((X - 134.5) / 32.5) ** 2 + ((Y - 355.5) / 6.5) ** 2 <= 1 || ((X - 134.5) / 32) ** 2 + ((Y - 361.5) / 7.5) ** 2 <= 1 ||
    ((legOn(X, Y, 116.5, 362, 108, 406, 4.6) || legOn(X, Y, 136, 362, 136, 395, 4.2) || legOn(X, Y, 154.5, 362, 161, 406, 4.6)) && toLab(...px(x, y))[0] < 0.72);   // 다리 칸 중 밝은 바닥 빛은 빛으로 둠
};
const skip = (x, y) => inWindow(x, y) || inStool(x, y);   // 창 테두리 쇠는 빛 계산에 넣음(원뿔 아래 테두리도 같이 어두워지게)

// ── 줄마다 빛 안 닿는 기준(양 끝 30칸의 중간값) ──
const med = a => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };
const REF = [];
for (let y = 0; y < H; y++) {
  const bs = [], as = [];
  for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - 135) > 105) { const [, A, B] = lab(x, y); bs.push(B); as.push(A); }
  REF.push({ a: med(as), b: med(bs) });
}
// 빛 = 넓고 부드러운 층(낮은 주파수), 타일 이음새·결 = 촘촘한 무늬(높은 주파수)라고 보고 떼어 낸다:
//  ① 원래 그림을 흐리게(빼는 곳은 빼고 평균) ② 빛 구역 안의 흐린 값을 구역 바깥 테두리(빛 안 닿는 곳)에서 매끈하게 이어 채움(라플라스 — 비누막처럼)
//  ③ 빛 = 흐린 원본 − 이어 채운 값, 꺼진 색 = 원본 − 빛(이음새·결은 그대로 남음). 단계 k 의 색 = 꺼진 색 + k·빛(OKLab).
//  (이 그림의 빛은 주황 필터처럼 칠해져 파랑이 줄어든 곳이 있어 '더하기 빛' 모형은 맞지 않았다 — 갈색 얼룩)
const inCone = (x, y) => y < 140 && x >= 62 && x <= 208;
const inPool = (x, y) => ((x + 0.5 - 135) / 136) ** 2 + ((y + 0.5 - 393) / 74) ** 2 <= 1;
const N = W * H, SK = new Uint8Array(N), RG = new Uint8Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; SK[i] = skip(x, y) ? 1 : 0; RG[i] = !SK[i] && (inCone(x, y) || inPool(x, y)) ? 1 : 0; }
const ch = j => { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = LAB[i * 3 + j]; return a; };
function blur(a, r) {   // 빼는 곳을 뺀 상자 흐림(가로 → 세로)
  const t = new Float32Array(N), o = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx < 0 || xx >= W) continue; const i = y * W + xx; if (SK[i]) continue; s += a[i]; n++; } t[y * W + x] = n ? s / n : a[y * W + x]; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy < 0 || yy >= H) continue; const i = yy * W + x; if (SK[i]) continue; s += t[i]; n++; } o[y * W + x] = n ? s / n : t[y * W + x]; }
  return o;
}
function fillIn(a) {   // 구역 안을 바깥 테두리 값으로 매끈하게(SOR 반복). 빼는 곳 이웃은 무시(벽처럼 미끄러짐)
  const u = Float32Array.from(a);
  for (let it = 0; it < 900; it++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (!RG[i]) continue;
    let s = 0, n = 0; for (const j of [i - 1, i + 1, i - W, i + W]) if (!SK[j]) { s += u[j]; n++; }
    if (n) u[i] += 1.9 * (s / n - u[i]);
  }
  return u;
}
const base = new Float32Array(N * 3), LT = new Float32Array(N * 3), lit = new Uint8Array(N);
for (let j = 0; j < 3; j++) {
  const sm = blur(blur(ch(j), 3), 2), un = fillIn(sm);
  for (let i = 0; i < N; i++) { const l = RG[i] ? sm[i] - un[i] : 0; LT[i * 3 + j] = l; base[i * 3 + j] = LAB[i * 3 + j] - l; }
}
let litN = 0;
for (let i = 0; i < N; i++) if (RG[i] && (Math.abs(LT[i * 3]) > 0.006 || Math.abs(LT[i * 3 + 2]) > 0.004)) { lit[i] = 1; litN++; }
// 외딴 점(빛과 상관없는 따뜻한 얼룩) 지우기: 이웃 8칸 중 빛 칸이 2개 미만이면 빛 아님
for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = y * W + x; if (!lit[i]) continue;
  let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && lit[i + dy * W + dx]) n++;
  if (n < 2) { lit[i] = 0; litN--; }
}
// 원뿔·고인 빛 두 상자(띠에 위 → 아래로)
const bbox = f => { let b = [W, H, -1, -1]; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (lit[y * W + x] && f(x, y)) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]; return { x: b[0], y: b[1], w: b[2] - b[0] + 1, h: b[3] - b[1] + 1 }; };
const BOXES = [bbox(inCone), bbox((x, y) => !inCone(x, y))];

// ── 단계별 색: OKLab 섞기 → 색표의 가까운 두 색 사이를 바이어 디더 ──
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
function snap(c, x, y) {
  let i1 = 0, i2 = 0, e1 = Infinity, e2 = Infinity;
  for (let i = 0; i < PLAB.length; i++) { const e = d2(c, PLAB[i]); if (e < e1) { e2 = e1; i2 = i1; e1 = e; i1 = i; } else if (e < e2) { e2 = e; i2 = i; } }
  const f = Math.sqrt(e1) / (Math.sqrt(e1) + Math.sqrt(e2) + 1e-9);   // 0 = 첫째 색에 딱 맞음, 0.5 = 두 색 가운데
  return (B4[y & 3][x & 3] + 0.5) / 16 < f ? PAL[i2] : PAL[i1];
}
// 띠: 단계마다 [원뿔 상자, 고인 빛 상자]를 위아래로 붙인 한 덩이 → 단계 수만큼 아래로
const SW = Math.max(...BOXES.map(b => b.w)), SH = BOXES.reduce((s, b) => s + b.h, 0);
const strip = new Img(SW, SH * LEVELS.length);
LEVELS.forEach((k, li) => {
  let oy = li * SH;
  for (const b of BOXES) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      const i = y * W + x; if (!lit[i]) continue;
      const c = [0, 1, 2].map(j => base[i * 3 + j] + k * LT[i * 3 + j]);   // 색표 디더는 주황·회색이 점점이 섞여 지저분 → 칸마다 정확한 색(가까운 색표 색이 거의 같으면 그 색)
      const near = (() => { let e1 = Infinity, i1 = 0; for (let q = 0; q < PLAB.length; q++) { const e = d2(c, PLAB[q]); if (e < e1) { e1 = e; i1 = q; } } return e1 < 0.008 ** 2 ? PAL[i1] : null; })();
      const hex = near != null ? '#' + near.toString(16).padStart(6, '0') : '#' + toRgb(...c).map(v => v.toString(16).padStart(2, '0')).join('');
      strip.set(x - b.x, y - b.y + oy, hex);
    }
    b.oy = oy - li * SH; oy += b.h;
  }
});
writeFileSync(resolve(BG, 'home_loft_dim.png'), strip.png());

// ── 창 유리 칸 범위(줄마다 [y, x0, x1]) + 원뿔(벽에 보이는 빛 기둥의 줄마다 왼·오른 끝) ──
const spans = [];
for (let y = WIN.y - 92; y <= WIN.y + 92; y++) { let s = -1; for (let x = WIN.x - 93; x <= WIN.x + 94; x++) { const on = x >= 0 && x < W && inWindow(x, y); if (on && s < 0) s = x; if ((!on || x === WIN.x + 94) && s >= 0) { spans.push([y, s, on ? x : x - 1]); s = -1; } } }
const cone = [];
for (let y = 20; y < 125; y++) { let l = -1, r = -1; for (let x = 60; x < 210; x++) if (lit[y * W + x]) { if (l < 0) l = x; r = x; } if (l >= 0) cone.push([y, l, r]); }
const meta = { win: WIN, spans, dim: { levels: LEVELS, stripH: SH, boxes: BOXES.map(({ x, y, w, h, oy }) => ({ x, y, w, h, oy })) }, cone };
writeFileSync(resolve(BG, 'home_loft.json'), JSON.stringify(meta));
// 검토용: 단계를 가로로 늘어놓은 미리보기(×2)
const prev = new Img((W + 4) * LEVELS.length * 2, H * 2, '#101018');
LEVELS.forEach((k, li) => {
  const fr = new Img(W, H); fr.data.set(im.data);
  for (const b of BOXES) for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const s = ((y + b.oy + li * SH) * SW + x) * 4; if (strip.data[s + 3]) fr.data.set(strip.data.subarray(s, s + 4), ((y + b.y) * W + x + b.x) * 4); }
  prev.blit(fr, li * (W + 4) * 2, 0, 2);
});
mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
writeFileSync(resolve(here, 'out', 'conv', 'home_loft_levels.png'), prev.png());
console.log('빛 칸', litN, '· 상자', JSON.stringify(meta.dim), '· 유리 줄', spans.length, '· 원뿔 줄', cone.length);
