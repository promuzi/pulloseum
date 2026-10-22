// 초롱바인 등불을 빨강이 위로(2026-10-22 사용자 "초롱바인(얘 태극 제대로 그려 기본판. 빨강이 위야)"): 원화는 청사초롱처럼 파랑이 위 —
//  내보낸 시트(성체 · 어린 · 자람)와 작은 그림의 등불 칸에서 파랑 천 ↔ 빨강 천의 색상을 맞바꿈(밝기 · 채도 · 서리 무늬 · 금테 · 술은 그대로)
//  등불 = 장마다 빨강 천(어두운 그늘까지)의 가장 큰 덩어리 + 그 덩어리에 닿은 파랑 천 덩어리(빨강 폭 안 · 빨강 높이의 1.6배 위까지 — 덩굴은 빠짐).
//  줄 단위로 자르지 않고 덩어리 전체를 바꿈(위 · 아래 끝의 좁은 줄이 남아 파랑 아래가 일자로 잘려 보였음 — 2026-10-22 사용자 "태극 초롱의 파란색 아래 부분이 직선으로 색이 잘려있고")
//  등불 아래로 늘어진 술(빨강)은 금테 아래 따로 떨어진 덩어리라 그대로(사용자 "초롱 아랫부분에 있는 줄은 지금보니 괜찮네") · 빨강 아래 매달린 고드름(파랑)도 그대로
//  이미 빨강이 위인 장은 건너뜀(다시 돌려도 됨)
//   node tools/pixel/big/fix_lantern.mjs     ← convert.mjs --export lantern_vine(또는 small.mjs)으로 다시 내보내면 이걸 다시 돌릴 것
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG } from './engine.mjs';
import { toLch, fromLch } from '../../../v2/src/art/shinyColor.js';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const isRed = (L, C, H) => (H >= 340 || H <= 40) && C >= 0.06 && L >= 0.15 && L <= 0.85;   // 빨강 천(짙은 그늘까지 — 금테 갈색 H 45~ 은 빠짐)
const isBlue = (L, C, H) => H >= 240 && H <= 290 && C >= 0.06 && L >= 0.12 && L <= 0.85;
// 8방향 이어진 덩어리(조건 cls === want) — 칸 번호 배열들
function comps(cls, w, h, want) {
  const seen = new Uint8Array(w * h), out = [];
  for (let i = 0; i < w * h; i++) {
    if (cls[i] !== want || seen[i]) continue;
    const st = [i], c = []; seen[i] = 1;
    while (st.length) { const j = st.pop(), x = j % w, y = (j / w) | 0; c.push(j); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const q = Y * w + X; if (cls[q] === want && !seen[q]) { seen[q] = 1; st.push(q); } } }
    out.push(c);
  }
  return out;
}
// 한 장(rect)의 등불 천 색 맞바꾸기 — 바꾼 칸 수(안 바꿨으면 0)
function fixRect(im, x0, y0, w, h, wide) {
  const cls = new Int8Array(w * h), lch = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * im.w + x0 + x) * 4; if (im.data[s + 3] < 128) continue;
    const v = toLch(im.data[s], im.data[s + 1], im.data[s + 2]); lch[y * w + x] = v;
    cls[y * w + x] = isRed(...v) ? 1 : isBlue(...v) ? 2 : 0;
  }
  const red = comps(cls, w, h, 1).sort((a, b) => b.length - a.length)[0];
  if (!red) return 0;
  let rx0 = w, rx1 = -1, ry0 = h, ry1 = -1, rsy = 0; const rowN = new Map(), low = new Map();   // low = 열마다 가장 아래 빨강
  for (const j of red) { const x = j % w, y = (j / w) | 0; rx0 = Math.min(rx0, x); rx1 = Math.max(rx1, x); ry0 = Math.min(ry0, y); ry1 = Math.max(ry1, y); rsy += y; rowN.set(y, (rowN.get(y) || 0) + 1); low.set(x, Math.max(low.get(x) ?? -1, y)); }
  if (Math.max(...rowN.values()) < wide) return 0;   // 넓은 천이 아님(술 · 점)
  const inRed = new Uint8Array(w * h); for (const j of red) inRed[j] = 1;
  const topY = ry0 - Math.round((ry1 - ry0 + 1) * 1.6);
  const near = j => { const x = j % w, y = (j / w) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && inRed[Y * w + X]) return true; } return false; };
  const blue = []; let bn = 0, bsy = 0;
  for (const c of comps(cls, w, h, 2)) if (c.some(near)) for (const j of c) {
    const x = j % w, y = (j / w) | 0; if (x < rx0 - 2 || x > rx1 + 2) continue;
    bn++; bsy += y;   // 방향 판정은 빨강에 닿은 파랑 전부로(고친 장에서 남은 덩굴 몇 칸으로 판정이 뒤집혀 두 번 돌리면 다시 바뀌었음)
    if (y >= topY && y <= ry1 && !(low.has(x) && y > low.get(x))) blue.push(j);
  }
  if (!blue.length || bsy / bn >= rsy / red.length) return 0;   // 파랑이 이미 아래(고친 장) — 그대로
  let n = 0;
  for (const [set, rot] of [[red, -120], [blue, 120]]) for (const j of set) {
    const [L, C, H] = lch[j], [r, g, b] = fromLch(L, C, (H + rot + 720) % 360), s = ((y0 + ((j / w) | 0)) * im.w + x0 + (j % w)) * 4;
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
