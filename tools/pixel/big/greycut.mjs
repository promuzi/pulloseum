// 밝은 단색 배경(코덱스에 #d9d9d9로 그리게 한 컨셉 — 2026-10-17 품질 원인: 투명 누끼 요청은 그림이 나빠짐) → 투명 누끼
//   node tools/pixel/big/greycut.mjs <원본.png> <누끼.png> [--main] [--tol=0.045] [--hole=0.012]
//   --main = 몸통 덩어리(가장 큰 것)만 남김 — 몸에서 떨어진 바람 줄 · 물보라 같은 효과 선은 줄이면 점가루가 됨(움직임 효과가 따로 그림, 갓캡 2026-10-17)
// 네 모서리 색과 가까운 칸을 가장자리부터 흘려 채우고(OKLab 거리 tol), 몸에 갇힌 넓은 배경 구멍(hole · 140칸 이상)도 배경.
//  코덱스 배경은 완전한 단색이라 구멍 허용치는 아주 작게(0.012) — 넓게 잡으면 회색빛 몸(게일바인 어린 단계 · 연한 잎)에 구멍이 뚫림(2026-10-17)
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePNG, encodePNG, oklab } from './engine.mjs';

const [src, dst] = process.argv.slice(2).filter(a => !a.startsWith('--')), mainOnly = process.argv.includes('--main');
const opt = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : null; }, TOL = opt("tol") ?? 0.03, HOLE = opt('hole') ?? 0.012;
if (!src || !dst) { console.log('node tools/pixel/big/greycut.mjs <원본.png> <누끼.png>'); process.exit(1); }
const im = decodePNG(readFileSync(src)), n = im.w * im.h, lab = new Float32Array(n * 3);
for (let i = 0; i < n; i++) { const k = i * 4, c = oklab('#' + [0, 1, 2].map(j => im.data[k + j].toString(16).padStart(2, '0')).join('')); lab[i * 3] = c[0]; lab[i * 3 + 1] = c[1]; lab[i * 3 + 2] = c[2]; }
const bg = [0, 1, 2].map(c => [0, im.w - 1, n - im.w, n - 1].reduce((s, i) => s + lab[i * 3 + c], 0) / 4);
const dist = i => Math.hypot(lab[i * 3] - bg[0], (lab[i * 3 + 1] - bg[1]) * 1.5, (lab[i * 3 + 2] - bg[2]) * 1.5);
const isBg = new Uint8Array(n);
const fill = (seed, tol, mark) => {
  const s = [...seed], got = [];
  while (s.length) {
    const i = s.pop();
    if (mark[i] || dist(i) >= tol) continue;
    mark[i] = 1; got.push(i);
    const x = i % im.w;
    if (x > 0) s.push(i - 1); if (x < im.w - 1) s.push(i + 1); if (i >= im.w) s.push(i - im.w); if (i < n - im.w) s.push(i + im.w);
  }
  return got;
};
const edge = [];
for (let x = 0; x < im.w; x++) edge.push(x, n - im.w + x);
for (let y = 0; y < im.h; y++) edge.push(y * im.w, y * im.w + im.w - 1);
fill(edge, TOL, isBg);
const seen = new Uint8Array(n);
for (let i = 0; i < n; i++) if (!isBg[i] && !seen[i] && dist(i) < HOLE) { const reg = fill([i], HOLE, seen); if (reg.length >= 140) for (const j of reg) isBg[j] = 1; }
// 막힌 구멍 경고(2026-10-17 사용자 "중간 용 꼬리 말린 가운데 부분이 하얀색에 배경이 있어" — 이무기 고리 안 배경이 그늘져 HOLE 허용치 밖이라 남았음):
//  남은 몸 칸 중 배경과 가까운 색(거리 < 0.05)이 넓게(140칸 이상) 뭉친 곳을 알려 줌 — 배경이면 알려 준 --hole 값으로 다시, 몸(옅은 잎 · 흰 무늬)이면 그대로
//  지운 배경에 붙은 덩어리(몸 테두리의 옅은 띠)는 뺌 — 칸의 20% 넘게 지운 배경과 맞닿으면 테두리
const seen2 = new Uint8Array(n), sus = [];
const nearBg = j => { const x = j % im.w; return (x > 0 && isBg[j - 1]) || (x < im.w - 1 && isBg[j + 1]) || (j >= im.w && isBg[j - im.w]) || (j < n - im.w && isBg[j + im.w]); };
for (let i = 0; i < n; i++) if (!isBg[i] && !seen2[i] && dist(i) < 0.05) {
  const reg = fill([i], 0.05, seen2).filter(j => !isBg[j]);
  if (reg.length < 140 || reg.filter(nearBg).length > reg.length * 0.2) continue;
  let x0 = im.w, x1 = 0, y0 = im.h, y1 = 0;
  for (const j of reg) { const x = j % im.w, y = (j / im.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const ds = reg.map(dist).sort((a, b) => a - b);
  const d9 = ds[Math.floor(ds.length * 0.9)];
  if (d9 < 0.045) sus.push({ c: reg.length, x0, x1, y0, y1, d9 });   // 옅은 몸 무늬는 0.046~0.05 · 그늘진 배경 구멍은 0.03대(이무기 고리 0.031)
}
for (const s of sus.sort((a, b) => b.c - a.c).slice(0, 3)) console.log(`⚠ 막힌 곳에 배경 같은 색 ${s.c}칸 (x ${s.x0}~${s.x1} · y ${s.y0}~${s.y1}) — 배경이면 --hole=${(s.d9 + 0.005).toFixed(3)} 로 다시, 몸(옅은 잎 · 흰 무늬)이면 그대로`);
if (mainOnly) {   // 이어진 덩어리(네 방향) 중 가장 큰 것만
  const lab = new Int32Array(n).fill(-1), size = [];
  for (let i = 0; i < n; i++) {
    if (isBg[i] || lab[i] >= 0) continue;
    const id = size.length, st = [i]; let c = 0; lab[i] = id;
    while (st.length) { const j = st.pop(); c++; const x = j % im.w; for (const k of [x > 0 ? j - 1 : -1, x < im.w - 1 ? j + 1 : -1, j - im.w, j + im.w]) if (k >= 0 && k < n && !isBg[k] && lab[k] < 0) { lab[k] = id; st.push(k); } }
    size.push(c);
  }
  const big = size.indexOf(Math.max(...size));
  for (let i = 0; i < n; i++) if (!isBg[i] && lab[i] !== big) isBg[i] = 1;
  console.log('떨어진 조각 ' + (size.length - 1) + '개 지움');
}
const out = new Uint8Array(im.data);
let kept = 0;
for (let i = 0; i < n; i++) { if (isBg[i]) out[i * 4 + 3] = 0; else kept++; }
writeFileSync(dst, encodePNG(im.w, im.h, out));
console.log(`${dst} — 몸 ${(100 * kept / n).toFixed(1)}%`);
