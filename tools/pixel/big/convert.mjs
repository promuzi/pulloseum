// 컨셉 아트 → 도트 변환: 그림 자체를 줄여 도트로 만든다(따라 그리기가 아니라 같은 그림).
//   node tools/pixel/big/convert.mjs --measure <키…>   컨셉마다 흙 타원·식물 키 재기
//   node tools/pixel/big/convert.mjs <키…>             변환 → out/conv/<키>_96x112.png (+ _front.png = 화분 앞을 덮는 잎)
// 순서: ① 배경 지우기(가장자리에서 퍼져 나가며 바탕색과 비슷한 칸) ② 흙 타원 찾기(어두운 갈색 칸)
//       ③ 흙 너비를 우리 3D 화분 흙 너비에 맞춰 축척·위치 계산 ④ 화분·흙 칸 빼기(화분 폭 안의 흙 선 아래)
//       ⑤ 넓이 평균으로 줄이기(전경만 섞음) ⑥ OKLab k-평균으로 색 묶기 ⑦ 외곽선(selout) ⑧ 외딴 칸 정리
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, Img, oklab, fromOklab, INK } from './engine.mjs';
import { W, H } from './parts.mjs';
import { POT_GEO } from './pot3d.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), measure = args.includes('--measure'), keys = args.filter(a => !a.startsWith('--'));

function load(key) {
  const im = decodePNG(readFileSync(resolve(here, 'concept', key + '.png'))), n = im.w * im.h;
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = i * 4, h = '#' + [0, 1, 2].map(j => im.data[k + j].toString(16).padStart(2, '0')).join(''), c = oklab(h);
    lab[i * 3] = c[0]; lab[i * 3 + 1] = c[1]; lab[i * 3 + 2] = c[2];
  }
  // ① 배경: 네 모서리 평균 색에서 가까운 칸을 가장자리부터 채워 나간다
  const bg = [0, 1, 2].map(c => ([0, im.w - 1, n - im.w, n - 1].reduce((s, i) => s + lab[i * 3 + c], 0) / 4));
  const near = i => Math.hypot(lab[i * 3] - bg[0], (lab[i * 3 + 1] - bg[1]) * 1.5, (lab[i * 3 + 2] - bg[2]) * 1.5) < 0.055;
  const isBg = new Uint8Array(n), st = [];
  for (let x = 0; x < im.w; x++) st.push(x, n - im.w + x);
  for (let y = 0; y < im.h; y++) st.push(y * im.w, y * im.w + im.w - 1);
  while (st.length) {
    const i = st.pop();
    if (isBg[i] || !near(i)) continue;
    isBg[i] = 1;
    const x = i % im.w;
    if (x > 0) st.push(i - 1); if (x < im.w - 1) st.push(i + 1); if (i >= im.w) st.push(i - im.w); if (i < n - im.w) st.push(i + im.w);
  }
  // ② 흙: 아래쪽 절반의 어두운 갈색 칸 → 줄 단위 띠 → 타원
  const soil = new Uint8Array(n);
  for (let i = Math.floor(n * 0.45); i < n; i++) {
    if (isBg[i]) continue;
    const L = lab[i * 3], C = Math.hypot(lab[i * 3 + 1], lab[i * 3 + 2]), h = (Math.atan2(lab[i * 3 + 2], lab[i * 3 + 1]) * 180 / Math.PI + 360) % 360;
    if (L > 0.17 && L < 0.46 && C > 0.012 && C < 0.1 && h > 18 && h < 90) soil[i] = 1;
  }
  const rows = [];
  for (let y = Math.floor(im.h * 0.45); y < im.h; y++) { let c = 0; for (let x = 0; x < im.w; x++) c += soil[y * im.w + x]; if (c > im.w * 0.05) rows.push(y); }
  // 가장 긴 연속 줄 묶음 = 흙 띠
  let best = [0, -1], s0 = rows[0];
  for (let k = 1; k <= rows.length; k++) if (k === rows.length || rows[k] !== rows[k - 1] + 1) { if (rows[k - 1] - s0 > best[1] - best[0]) best = [s0, rows[k - 1]]; s0 = rows[k]; }
  const xs = [];
  for (let y = best[0]; y <= best[1]; y++) for (let x = 0; x < im.w; x++) if (soil[y * im.w + x]) xs.push(x);
  xs.sort((a, b) => a - b);
  const xL = xs[Math.floor(xs.length * 0.03)], xR = xs[Math.floor(xs.length * 0.97)];
  const S = { cx: (xL + xR) / 2, cy: (best[0] + best[1]) / 2, a: (xR - xL) / 2, b: (best[1] - best[0]) / 2 };
  let top = im.h;
  for (let i = 0; i < n && top === im.h; i++) if (!isBg[i]) top = Math.floor(i / im.w);
  let left = im.w, right = 0;
  for (let y = 0; y < S.cy; y++) for (let x = 0; x < im.w; x++) if (!isBg[y * im.w + x]) { left = Math.min(left, x); right = Math.max(right, x); }
  return { im, lab, isBg, soil, S, top, left, right };
}

if (measure) {
  for (const k of keys) {
    const { S, top, left, right, im } = load(k);
    console.log(`${k.padEnd(13)} 흙 가운데 (${S.cx.toFixed(0)}, ${S.cy.toFixed(0)}) 반폭 ${S.a.toFixed(0)} 반높이 ${S.b.toFixed(0)} · 식물 키/흙반폭 ${((S.cy - top) / S.a).toFixed(2)} · 왼쪽/흙반폭 ${((S.cx - left) / S.a).toFixed(2)} · 오른쪽/흙반폭 ${((right - S.cx) / S.a).toFixed(2)} (그림 ${im.w}×${im.h})`);
  }
  process.exit(0);
}

const hueOf = (A, B) => (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
const P = POT_GEO, TOP = 3, HALFW = 46.5;
for (const key of keys) {
  const { im, lab, isBg, S, top, left, right } = load(key), n = im.w * im.h;
  // ③ 축척: 키·폭이 판에 들어가게, 밑동 폭은 우리 화분 흙보다 너무 넓지 않게
  const s = Math.min((P.cy - TOP) / (S.cy - top), HALFW / Math.max(S.cx - left, right - S.cx), P.a * 1.15 / S.a);
  // ④ 화분·흙 빼기: 화분 테 위쪽(흙 가운데 − 반높이×1.4)부터 아래, 화분 폭 안에서 테라코타·흙 색 칸. 앞 테 아래 화분 몸통 폭 안은 전부.
  const rimTop = S.cy - S.b * 1.4, rimFront = S.cy + S.b * 1.25, rimL = S.cx - S.a * 1.32, rimR = S.cx + S.a * 1.32;
  const drop = new Uint8Array(n);
  for (let y = Math.floor(rimTop); y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const i = y * im.w + x;
    if (isBg[i]) continue;
    const L = lab[i * 3], A = lab[i * 3 + 1], B = lab[i * 3 + 2], C = Math.hypot(A, B), h = hueOf(A, B);
    const inPot = x > rimL && x < rimR;
    // 테라코타(채도 중간 — 빛나는 불·균열보다 덜 선명), 흙(어두운 갈색), 테 하이라이트(밝고 채도 낮은 따뜻한 색)
    const terra = h > 33 && h < 70 && C > 0.05 && C < 0.14 && L > 0.36 && L < 0.86, dirt = L < 0.47 && C < 0.1 && h > 15 && h < 95;
    const shine = L > 0.7 && C < 0.1 && h > 35 && h < 105;
    if ((inPot && (terra || dirt || shine)) || (y > rimFront && x > rimL - S.a * 0.15 && x < rimR + S.a * 0.15) || (y > rimFront + S.b * 3)) drop[i] = 1;
  }
  // ⑤ 넓이 평균으로 줄이기(OKLab 평균, 전경만)
  const cells = new Array(W * H).fill(null);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const x0 = S.cx + (X - P.cx) / s, y0 = S.cy + (Y - P.cy) / s, x1 = x0 + 1 / s, y1 = y0 + 1 / s;
    let cnt = 0, tot = 0, L = 0, A = 0, B = 0;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(im.h, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(im.w, Math.ceil(x1)); x++) {
      const i = y * im.w + x;
      tot++;
      if (isBg[i] || drop[i]) continue;
      cnt++; L += lab[i * 3]; A += lab[i * 3 + 1]; B += lab[i * 3 + 2];
    }
    if (tot && cnt / tot >= 0.45) cells[Y * W + X] = [L / cnt, A / cnt, B / cnt];
  }
  // ⑥ 색 묶기: OKLab k-평균(밝기 순 시작점) → 채도를 살짝 올려 선명하게
  const K = 22, pts = cells.filter(Boolean).slice().sort((a, b) => a[0] - b[0]);
  let cent = Array.from({ length: K }, (_, i) => pts[Math.floor((i + 0.5) * pts.length / K)].slice());
  const nearest = p => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 * 1.4 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; b = j; } }); return b; };
  for (let it = 0; it < 20; it++) {
    const sum = cent.map(() => [0, 0, 0, 0]);
    for (const p of pts) { const j = nearest(p); sum[j][0] += p[0]; sum[j][1] += p[1]; sum[j][2] += p[2]; sum[j][3]++; }
    cent = cent.map((c, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c);
  }
  const pal = cent.map(([L, A, B]) => fromOklab(L, A * 1.12, B * 1.12));
  let idx = cells.map(p => p ? nearest(p) : -1);
  // ⑧ 외딴 칸 정리: 네 이웃이 모두 같은 다른 색이면 그 색으로(밝기 차가 큰 반짝임·눈은 남김)
  idx = idx.map((j, i) => {
    if (j < 0) return j;
    const x = i % W, y = (i - x) / W, nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ox, oy]) => (x + ox < 0 || x + ox >= W || y + oy < 0 || y + oy >= H) ? -2 : idx[(y + oy) * W + x + ox]);
    return nb.every(v => v === nb[0]) && nb[0] >= 0 && nb[0] !== j && Math.abs(cent[nb[0]][0] - cent[j][0]) < 0.22 ? nb[0] : j;
  });
  // ⑦ 외곽선(selout): 밑면은 잉크, 빛 쪽(위·왼)은 조금 어둡게, 그늘 쪽은 많이 어둡게
  const out = new Img(W, H), dark = (j, d) => { const [L, A, B] = cent[j]; return fromOklab(Math.max(0.12, L - d), A * 1.25, B * 1.25); };
  for (let i = 0; i < W * H; i++) {
    const j = idx[i];
    if (j < 0) continue;
    const x = i % W, y = (i - x) / W, e = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H || idx[yy * W + xx] < 0;
    const eU = e(x, y - 1), eL = e(x - 1, y), eD = e(x, y + 1), eR = e(x + 1, y);
    let c = pal[j];
    if (eD && y < P.cy) c = INK; else if (eD || eR) c = dark(j, 0.3); else if (eU || eL) c = dark(j, 0.14);
    out.set(x, y, c);
  }
  mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
  writeFileSync(resolve(here, 'out', 'conv', key + '_96x112.png'), out.png());
  console.log(`${key.padEnd(13)} 축척 ${s.toFixed(4)} · 칸 ${idx.filter(v => v >= 0).length} · 색 ${K}`);
}
