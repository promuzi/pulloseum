// 초롱바인 등불을 빨강이 위로(2026-10-22 사용자 "초롱바인(얘 태극 제대로 그려 기본판. 빨강이 위야)"): 원화는 청사초롱처럼 파랑이 위 —
//  내보낸 시트(성체 · 어린 · 자람)와 작은 그림의 등불 칸에서 파랑 천 ↔ 빨강 천의 색상을 맞바꿈(밝기 · 채도 · 서리 무늬 · 금테 · 술은 그대로)
//  등불 = 장마다 빨강 천 칸이 여러 칸인 줄(술 · 덩굴은 가늘어 빠짐)의 둘레 + 그 위 파랑 부분. 이미 빨강이 위인 장은 건너뜀(다시 돌려도 됨)
//   node tools/pixel/big/fix_lantern.mjs     ← convert.mjs --export lantern_vine(또는 small.mjs)으로 다시 내보내면 이걸 다시 돌릴 것
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './engine.mjs';
import { toLch, fromLch } from '../../../v2/src/art/shinyColor.js';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const isRed = (L, C, H) => (H >= 345 || H <= 45) && C >= 0.08 && L >= 0.25 && L <= 0.85;
const isBlue = (L, C, H) => H >= 225 && H <= 300 && C >= 0.07 && L >= 0.2 && L <= 0.85;
// 한 장(rect)의 등불 천 색 맞바꾸기 — 바꾼 칸 수(안 바꿨으면 0)
function fixRect(im, x0, y0, w, h, wide) {
  const cls = new Int8Array(w * h), lch = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * im.w + x0 + x) * 4; if (im.data[s + 3] < 128) continue;
    const v = toLch(im.data[s], im.data[s + 1], im.data[s + 2]); lch[y * w + x] = v;
    cls[y * w + x] = isRed(...v) ? 1 : isBlue(...v) ? 2 : 0;
  }
  // 빨강 천이 넓은 줄들(가장 긴 덩어리) = 등불 반쪽 → 그 폭 안에서 바로 위 · 아래로 이어지는 파랑 천 넓은 줄들 = 다른 반쪽
  //  (위로 넓게 잡으면 등불을 매단 덩굴의 파란 그늘까지 들어가 같이 바뀌었음 — 2026-10-22)
  const wideRows = (want, xa = 0, xb = w - 1, min = wide) => { const r = []; for (let y = 0; y < h; y++) { let n = 0; for (let x = xa; x <= xb; x++) if (cls[y * w + x] === want) n++; if (n >= min) r.push(y); } return r; };
  const blocks = r => { const out = []; for (const y of r) { const B = out[out.length - 1]; if (B && y - B[1] <= 3) B[1] = y; else out.push([y, y]); } return out; };
  const red = blocks(wideRows(1)).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  if (!red) return 0;
  let rx0 = w, rx1 = -1;
  for (let y = red[0]; y <= red[1]; y++) for (let x = 0; x < w; x++) if (cls[y * w + x] === 1) { rx0 = Math.min(rx0, x); rx1 = Math.max(rx1, x); }
  //  파랑 반쪽 = 빨강 폭의 1/3 넘는 줄만(아래 술 끝의 가는 파랑을 반쪽으로 잘못 보던 것 — 2026-10-22)
  const blue = blocks(wideRows(2, rx0, rx1, Math.max(wide, Math.round((rx1 - rx0 + 1) * 0.35)))), above = blue.find(B => B[1] < red[0] && red[0] - B[1] <= 4), below = blue.find(B => B[0] > red[1] && B[0] - red[1] <= 4);
  if (!above || below) return 0;   // 파랑이 위가 아니면(이미 고침 · 못 찾음) 그대로
  const bx0 = Math.max(0, rx0 - 1), bx1 = Math.min(w - 1, rx1 + 1), by0 = above[0], by1 = red[1];
  let n = 0;
  for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
    const c = cls[y * w + x]; if (!c) continue;
    const [L, C, H] = lch[y * w + x], [r, g, b] = fromLch(L, C, (H + (c === 1 ? -120 : 120) + 720) % 360), s = ((y0 + y) * im.w + x0 + x) * 4;
    im.data[s] = r; im.data[s + 1] = g; im.data[s + 2] = b; n++;
  }
  return n;
}
let total = 0;
for (const k of ['lantern_vine', 'lantern_vine_young', 'lantern_vine_teen']) {
  const f = resolve(repo, 'assets', 'v2', 'plants', k + '.png'), jf = resolve(repo, 'assets', 'v2', 'plants', k + '.json'); if (!existsSync(f)) continue;
  const im = decodePNG(readFileSync(f)), m = JSON.parse(readFileSync(jf, 'utf8'));
  let n = 0, fr = 0;
  for (let i = 0; i < m.frames + 4; i++) for (const layer of [0, 1]) { const c = fixRect(im, (i % m.cols) * m.w, Math.floor(i / m.cols) * m.h + layer * m.rows * m.h, m.w, m.h, 4); if (c) { n += c; fr++; } }
  if (n) writeFileSync(f, encodePNG(im.w, im.h, im.data));
  console.log(k, '바꾼 장', fr, '· 칸', n); total += n;
}
{ const f = resolve(repo, 'assets', 'v2', 'small', 'lantern_vine.png');   // 작은 그림 48×112(위 = 뒤 층 · 아래 = 앞 층)
  if (existsSync(f)) { const im = decodePNG(readFileSync(f)); let n = 0; for (const oy of [0, 56]) n += fixRect(im, 0, oy, 48, 56, 2); if (n) writeFileSync(f, encodePNG(im.w, im.h, im.data)); console.log('small/lantern_vine 칸', n); total += n; } }
console.log(total ? '등불 빨강이 위로' : '바꿀 것 없음(이미 빨강이 위)');
