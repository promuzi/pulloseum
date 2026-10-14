// 컨셉 아트 → 도트 변환: 그림 자체를 도트로 만든다(따라 그리기가 아니라 같은 그림).
//   node tools/pixel/big/convert.mjs <키…>             변환 → out/conv/<키>_96x112.png
//   node tools/pixel/big/convert.mjs --measure <키…>   컨셉마다 흙 타원·식물 키 재기
//   node tools/pixel/big/convert.mjs --anim <키…>      변환 + 움직임 8장 → out/conv/<키…>.gif
// 입력: concept/cut/<키>.png(코덱스가 화분·배경을 지운 투명 누끼)가 있으면 그것, 없으면 concept/<키>.png 에서 배경·화분을 직접 지운다.
// 도트답게 만드는 순서(평균 축소는 경계가 뭉개지고 붓 질감이 남아 도트 느낌이 없어진다):
//   ① 재질 나누기 — 색상·채도 위주 k-평균으로 꽃잎·잎·얼굴·불 같은 재질 K개
//   ② 재질마다 밝기를 4단 띠로(그 재질 픽셀의 밝기 분위수) → 재질×단 = 팔레트
//   ③ 줄이기 — 도트 칸마다 원본 블록의 '다수 재질' 하나만 고르고, 그 재질 픽셀의 평균 단 → 섞인 색·흐린 경계 없음
//   ④ 정리 — 외딴 재질 칸·외딴 단 칸을 이웃에 맞춤(눈·반짝임처럼 아주 어둡거나 밝은 재질은 남김)
//   ⑤ 외곽선 — 실루엣은 selout(밑면 잉크·그늘 쪽 진하게·빛 쪽 옅게), 밝기 차 큰 재질 경계는 어두운 쪽 칸을 그 재질의 외곽선 색으로
//   ⑥ 밑동을 흙 속으로 몇 칸 늘려(화분 앞 테가 가림) 심긴 것처럼
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, Img, oklab, fromOklab, INK, BAYER4, rng } from './engine.mjs';
import { W, H, bolt, EYE } from './parts.mjs';
import { EYES } from './eyes.mjs';
import { POT_GEO, POT3, renderPot } from './pot3d.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), measure = args.includes('--measure'), anim = args.includes('--anim'), keys = args.filter(a => !a.startsWith('--'));
const EYES_ON = args.includes('--eyes');   // 눈 덧그리기(EYE 틀) — 사용자 판단으로 끔(2026-10-15 "눈 인식을 못하는 것 같으니 그냥 둬"). 켜려면 --eyes
const BLINK = args.includes('--blink');    // 그려진 눈은 그대로 두고, 깜빡일 때만 실제 눈 칸을 눈꺼풀로 덮는다(2026-10-15 사용자 "그림 바꾸지 말고 실제 눈을 인식해서")
const hueOf = (A, B) => (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;

// 눈 찾기: 아주 어두운 덩어리(눈동자) 중 둘레가 훨씬 밝은 것(홍채·흰자·반짝임) → 크기·높이가 비슷하고 옆으로 나란한 한 쌍
function findEyes(im, lab, isBg, top, bot) {
  const n = im.w * im.h, seen = new Uint8Array(n), blobs = [], ymax = top + (bot - top) * 0.75, dark = j => !isBg[j] && lab[j * 3] < 0.33;
  for (let i = 0; i < n; i++) {
    if (seen[i] || !dark(i) || Math.floor(i / im.w) > ymax) continue;
    const st = [i], px = [];
    seen[i] = 1;
    while (st.length && px.length <= 8000) {
      const j = st.pop(), x = j % im.w;
      px.push(j);
      for (const k of [x > 0 ? j - 1 : -1, x < im.w - 1 ? j + 1 : -1, j - im.w, j + im.w]) if (k >= 0 && k < n && !seen[k] && dark(k)) { seen[k] = 1; st.push(k); }
    }
    if (px.length < 120 || px.length > 8000) continue;
    let x0 = im.w, x1 = 0, y0 = im.h, y1 = 0, L = 0, A = 0, B = 0;
    for (const j of px) { const x = j % im.w, y = (j - x) / im.w; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); L += lab[j * 3]; A += lab[j * 3 + 1]; B += lab[j * 3 + 2]; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, m = px.length;
    if (w / h > 3 || h / w > 3) continue;
    const pad = Math.max(3, Math.round(Math.max(w, h) * 0.5));
    let rl = 0, rc = 0, iris = null, bestC = 0, hiL = 0;
    for (let y = y0 - pad; y <= y1 + pad; y++) for (let x = x0 - pad; x <= x1 + pad; x++) {
      if (x < 0 || y < 0 || x >= im.w || y >= im.h) continue;
      const j = y * im.w + x;
      if (isBg[j]) continue;
      const l = lab[j * 3], c = Math.hypot(lab[j * 3 + 1], lab[j * 3 + 2]);
      if (!(x >= x0 && x <= x1 && y >= y0 && y <= y1)) { rl += l; rc++; if (c > bestC && l > 0.4 && l < 0.9) { bestC = c; iris = [l, lab[j * 3 + 1], lab[j * 3 + 2]]; } }
      hiL = Math.max(hiL, l);
    }
    if (!rc || rl / rc - L / m < 0.22) continue;
    blobs.push({ w, h, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, area: m, pupil: [L / m, A / m, B / m], iris, hi: hiL > 0.88 });
  }
  let pair = [], best = Infinity;
  for (let a = 0; a < blobs.length; a++) for (let b = a + 1; b < blobs.length; b++) {
    const p = blobs[a], q = blobs[b], hh = Math.max(p.h, q.h), ww = Math.max(p.w, q.w), dx = Math.abs(p.cx - q.cx), dy = Math.abs(p.cy - q.cy);
    if (dy > hh * 0.7 || dx < ww * 1.2 || dx > ww * 9) continue;
    const sc = dy / hh + Math.abs(Math.log(p.area / q.area)) + (p.cy / im.h) * 0.5 - (p.hi && q.hi ? 0.5 : 0) - (p.iris && q.iris ? 0.3 : 0);
    if (sc < best) { best = sc; pair = p.cx < q.cx ? [p, q] : [q, p]; }
  }
  return pair;
}

function load(key, file = null) {
  const cutP = resolve(here, 'concept', 'cut', key + '.png'), cut = !!file || existsSync(cutP);
  const im = decodePNG(readFileSync(file || (cut ? cutP : resolve(here, 'concept', key + '.png')))), n = im.w * im.h;
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = i * 4, c = oklab('#' + [0, 1, 2].map(j => im.data[k + j].toString(16).padStart(2, '0')).join(''));
    lab[i * 3] = c[0]; lab[i * 3 + 1] = c[1]; lab[i * 3 + 2] = c[2];
  }
  const isBg = new Uint8Array(n);
  if (cut) for (let i = 0; i < n; i++) isBg[i] = im.data[i * 4 + 3] < 128 ? 1 : 0;
  else {
    // 배경: 모서리 색과 비슷한 칸을 가장자리부터 채우고, 식물에 갇힌 넓은 배경 구멍(잎·꽃 사이)도 배경으로
    const bg = [0, 1, 2].map(c => ([0, im.w - 1, n - im.w, n - 1].reduce((s, i) => s + lab[i * 3 + c], 0) / 4));
    const dist = i => Math.hypot(lab[i * 3] - bg[0], (lab[i * 3 + 1] - bg[1]) * 1.5, (lab[i * 3 + 2] - bg[2]) * 1.5);
    const st = [];
    for (let x = 0; x < im.w; x++) st.push(x, n - im.w + x);
    for (let y = 0; y < im.h; y++) st.push(y * im.w, y * im.w + im.w - 1);
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
    fill(st, 0.055, isBg);
    const seen = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (!isBg[i] && !seen[i] && dist(i) < 0.032) {
      const reg = fill([i], 0.032, seen);
      if (reg.length >= 140) for (const j of reg) isBg[j] = 1;
    }
  }
  // 흙(누끼가 아닐 때만): 아래쪽 어두운 갈색 칸 → 가장 긴 줄 묶음 → 타원
  let S = null;
  if (!cut) {
    const rows = [];
    for (let y = Math.floor(im.h * 0.45); y < im.h; y++) {
      let c = 0;
      for (let x = 0; x < im.w; x++) { const i = y * im.w + x; if (isBg[i]) continue; const L = lab[i * 3], C = Math.hypot(lab[i * 3 + 1], lab[i * 3 + 2]), h = hueOf(lab[i * 3 + 1], lab[i * 3 + 2]); if (L > 0.17 && L < 0.46 && C > 0.012 && C < 0.1 && h > 18 && h < 90) c++; }
      if (c > im.w * 0.05) rows.push(y);
    }
    let best = [0, -1], s0 = rows[0];
    for (let k = 1; k <= rows.length; k++) if (k === rows.length || rows[k] !== rows[k - 1] + 1) { if (rows[k - 1] - s0 > best[1] - best[0]) best = [s0, rows[k - 1]]; s0 = rows[k]; }
    const xs = [];
    for (let y = best[0]; y <= best[1]; y++) for (let x = 0; x < im.w; x++) { const i = y * im.w + x; if (isBg[i]) continue; const L = lab[i * 3], C = Math.hypot(lab[i * 3 + 1], lab[i * 3 + 2]); if (L < 0.46 && C < 0.1) xs.push(x); }
    xs.sort((a, b) => a - b);
    const xL = xs[Math.floor(xs.length * 0.03)], xR = xs[Math.floor(xs.length * 0.97)];
    S = { cx: (xL + xR) / 2, cy: (best[0] + best[1]) / 2, a: (xR - xL) / 2, b: (best[1] - best[0]) / 2 };
    // 화분 빼기: 앞 테 아래(화분 몸통)는 화분 폭 안 전부, 입구(뒤 테 ~ 앞 테)에서는 흙·테라코타·테 하이라이트 색만
    const rimTop = S.cy - S.b * 1.4, rimFront = S.cy + S.b * 1.15, rimL = S.cx - S.a * 1.32, rimR = S.cx + S.a * 1.32;
    for (let y = Math.floor(rimTop); y < im.h; y++) for (let x = 0; x < im.w; x++) {
      const i = y * im.w + x;
      if (isBg[i]) continue;
      const L = lab[i * 3], A = lab[i * 3 + 1], B = lab[i * 3 + 2], C = Math.hypot(A, B), h = hueOf(A, B), inPot = x > rimL && x < rimR;
      const terra = h > 35 && h < 70 && C > 0.05 && C < 0.14 && L > 0.36 && L < 0.86, dirt = L < 0.47 && C < 0.075 && h > 33 && h < 95, shine = L > 0.7 && C < 0.1 && h > 35 && h < 105;
      if ((inPot && (terra || dirt || shine)) || (y > rimFront && x > rimL - S.a * 0.15 && x < rimR + S.a * 0.15) || y > rimFront + S.b * 3) isBg[i] = 1;
    }
  }
  // 식물 범위
  let top = im.h, bot = 0, left = im.w, right = 0;
  for (let i = 0; i < n; i++) if (!isBg[i]) { const x = i % im.w, y = (i - x) / im.w; top = Math.min(top, y); bot = Math.max(bot, y); left = Math.min(left, x); right = Math.max(right, x); }
  if (cut) S = { cx: (left + right) / 2, cy: bot, a: (right - left) / 6, b: 0 };   // 누끼: 식물 전체 폭의 가운데를 판 가운데로
  // 눈: 지정(eyes.mjs)한 대략 자리 근처(반지름 60)에서 가장 어두운 칸들의 무게중심으로 맞춘다
  const spec = EYES_ON || BLINK ? EYES[key] : null, eyes = [];
  if (spec && !file) for (const [ex, ey] of spec.src) {
    const R0 = 60, cand = [];
    for (let y = Math.max(0, ey - R0); y < Math.min(im.h, ey + R0); y++) for (let x = Math.max(0, ex - R0); x < Math.min(im.w, ex + R0); x++) {
      const i = y * im.w + x;
      if (!isBg[i] && (x - ex) ** 2 + (y - ey) ** 2 < R0 * R0) cand.push([lab[i * 3], x, y]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const k = cand.slice(0, Math.max(20, Math.floor(cand.length * 0.04)));
    eyes.push([k.reduce((s, c) => s + c[1], 0) / k.length, k.reduce((s, c) => s + c[2], 0) / k.length]);
  }
  return { im, lab, isBg, S, top, bot, left, right, cut, eyes };
}

if (measure) {
  for (const k of keys) {
    const { S, top, left, right, im, cut } = load(k);
    console.log(`${k.padEnd(13)} ${cut ? '누끼' : '원본'} 흙 가운데 (${S.cx.toFixed(0)}, ${S.cy.toFixed(0)}) 반폭 ${S.a.toFixed(0)} · 식물 키/흙반폭 ${((S.cy - top) / S.a).toFixed(2)} · 좌 ${((S.cx - left) / S.a).toFixed(2)} 우 ${((right - S.cx) / S.a).toFixed(2)} (${im.w}×${im.h})`);
  }
  process.exit(0);
}

const P = POT_GEO, TOP = 3, HALFW = 46.5, KM = 8, LV = 4;
// 결정적 k-평균(가장 먼 점부터 고르는 시작점)
function kmeans(pts, K, wt, iters = 18) {
  const d2 = (p, c) => wt.reduce((s, w, j) => s + w * (p[j] - c[j]) ** 2, 0);
  const mean = [0, 1, 2].map(j => pts.reduce((s, p) => s + p[j], 0) / pts.length);
  let cent = [pts.reduce((b, p) => d2(p, mean) > d2(b, mean) ? p : b, pts[0]).slice()];
  while (cent.length < K) cent.push(pts.reduce((b, p) => { const dp = Math.min(...cent.map(c => d2(p, c))), db = Math.min(...cent.map(c => d2(b, c))); return dp > db ? p : b; }, pts[0]).slice());
  let lab = new Int16Array(pts.length);
  for (let it = 0; it < iters; it++) {
    const sum = cent.map(() => [0, 0, 0, 0]);
    pts.forEach((p, i) => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; b = j; } }); lab[i] = b; sum[b][0] += p[0]; sum[b][1] += p[1]; sum[b][2] += p[2]; sum[b][3]++; });
    cent = cent.map((c, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c);
  }
  return { cent, assign: p => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; b = j; } }); return b; } };
}

export function convert(key, { file = null, scale = null } = {}) {
  const { im, lab, isBg, S, top, left, right, eyes: eyeSrc } = load(key, file), n = im.w * im.h;
  const s = scale || Math.min((P.cy - TOP) / (S.cy - top), HALFW / Math.max(S.cx - left, right - S.cx), S.b ? P.a * 1.15 / S.a : 9);
  if (!S.b) S.cy -= 3 / s;   // 누끼: 밑동 끝이 흙 가운데보다 3칸 아래(흙 속)에 오게
  // 눈: 원본 자리 → 도트 좌표, 그 자리를 가운데로 EYE 틀 크기의 상자
  const spec = EYES_ON ? EYES[key] : null, grid = spec ? EYE[spec.style].g : null;
  const eyes = spec ? eyeSrc.map(([ex, ey], n2) => {
    const w = grid[0].length, h = grid.length, X = P.cx + (ex - S.cx) * s, Y = P.cy + (ey - S.cy) * s;
    return { x: Math.round(X - w / 2), y: Math.round(Y - h / 2), w, h, mirror: n2 % 2 === 1 && !!EYE[spec.style].mirror };
  }) : [];
  // ① 재질: 표본(성기게) → 색상·채도 위주 k-평균
  const sample = [];
  for (let i = 0; i < n; i += 7) if (!isBg[i]) sample.push([lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]);
  const mat = kmeans(sample, KM, [0.35, 4, 4]);
  // ② 재질마다 밝기 분위수 → 4단 문턱
  const Ls = Array.from({ length: KM }, () => []);
  for (const p of sample) Ls[mat.assign(p)].push(p[0]);
  const cuts = Ls.map(a => { a.sort((x, y) => x - y); return [0.25, 0.5, 0.75].map(q => a[Math.floor(q * (a.length - 1))] ?? 0.5); });
  const level = (m, L) => cuts[m].filter(c => L > c).length;
  // 원본 칸마다 (재질, 단)
  const pm = new Int8Array(n).fill(-1), pl = new Int8Array(n), acc = Array.from({ length: KM * LV }, () => [0, 0, 0, 0]);
  for (let i = 0; i < n; i++) if (!isBg[i]) {
    const p = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]], m = mat.assign(p), l = level(m, p[0]);
    pm[i] = m; pl[i] = l;
    const a = acc[m * LV + l]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++;
  }
  const palLab = acc.map((a, k) => a[3] ? [a[0] / a[3], a[1] / a[3] * 1.12, a[2] / a[3] * 1.12] : [mat.cent[Math.floor(k / LV)][0], 0, 0]);
  const matL = mat.cent.map(c => c[0]);
  // ③ 다수 재질로 줄이기
  const cm = new Int8Array(W * H).fill(-1), cl = new Float32Array(W * H);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const x0 = S.cx + (X - P.cx) / s, y0 = S.cy + (Y - P.cy) / s, x1 = x0 + 1 / s, y1 = y0 + 1 / s;
    const cnt = new Float32Array(KM), lv = new Float32Array(KM);
    let tot = 0, fg = 0;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(im.h, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(im.w, Math.ceil(x1)); x++) {
      const i = y * im.w + x;
      tot++;
      if (pm[i] < 0) continue;
      fg++; cnt[pm[i]]++; lv[pm[i]] += pl[i];
    }
    if (!tot || fg / tot < 0.5) continue;
    let m = 0;
    for (let k = 1; k < KM; k++) if (cnt[k] > cnt[m]) m = k;
    cm[Y * W + X] = m; cl[Y * W + X] = lv[m] / cnt[m];
  }
  // ④ 정리: 외딴 재질 칸(8이웃 중 같은 재질 ≤ 1)은 이웃 다수로 — 단, 아주 어둡거나 밝은 재질(눈·반짝임)은 남김
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : y * W + x;
  for (let pass = 0; pass < 2; pass++) {
    const nm = cm.slice(), nl = cl.slice();
    for (let i = 0; i < W * H; i++) {
      if (cm[i] < 0 || matL[cm[i]] < 0.3 || matL[cm[i]] > 0.9) continue;
      const x = i % W, y = (i - x) / W, nb = [];
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (ox || oy) { const j = at(x + ox, y + oy); if (j >= 0 && cm[j] >= 0) nb.push(j); }
      if (nb.filter(j => cm[j] === cm[i]).length > 1 || nb.length < 3) continue;
      const votes = new Map();
      for (const j of nb) votes.set(cm[j], (votes.get(cm[j]) || 0) + 1);
      const m = [...votes].sort((a, b) => b[1] - a[1])[0][0], same = nb.filter(j => cm[j] === m);
      nm[i] = m; nl[i] = same.reduce((s2, j) => s2 + cl[j], 0) / same.length;
    }
    cm.set(nm); cl.set(nl);
  }
  // 단 정하기 + 외딴 단(같은 재질 4이웃이 모두 같은 다른 단) 맞추기
  const ct = new Int8Array(W * H);
  for (let i = 0; i < W * H; i++) ct[i] = Math.max(0, Math.min(LV - 1, Math.round(cl[i])));
  // 단 덩어리 정리(두 번): 같은 재질 8이웃 중 내 단이 1칸 이하이고 다른 한 단이 4칸 이상이면 그 단으로 — 점점이 튄 붓 질감 제거
  let ct2 = ct;
  for (let pass = 0; pass < 2; pass++) {
    const nx = ct2.slice();
    for (let i = 0; i < W * H; i++) {
      if (cm[i] < 0 || matL[cm[i]] < 0.3) continue;
      const x = i % W, y = (i - x) / W, cnt = new Int8Array(LV);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (ox || oy) { const j = at(x + ox, y + oy); if (j >= 0 && cm[j] === cm[i]) cnt[ct2[j]]++; }
      if (cnt[ct2[i]] > 1) continue;
      let b = 0;
      for (let l = 1; l < LV; l++) if (cnt[l] > cnt[b]) b = l;
      if (cnt[b] >= 4) nx[i] = b;
    }
    ct2 = nx;
  }
  // 깜빡임용: 원본에서 찾은 실제 눈동자 자리 → 도트 좌표(가운데 점만)
  const eyeC = BLINK ? eyeSrc.map(([ex, ey]) => [P.cx + (ex - S.cx) * s, P.cy + (ey - S.cy) * s]) : [];
  return { cm, ct: ct2, palLab, matL, key, eyes, eyeC, s };
}

// 실제 그려진 눈 칸 찾기: 눈동자 가운데에서 반지름 4.5 안, 둘레(4.5~6.5) 살결 색과 뚜렷이 다른 칸 → 가장 어두운 칸에 이어진 덩어리
function eyeMask(out, cx, cy) {
  const px = (x, y) => { const k = (y * W + x) * 4; return out.data[k + 3] < 128 ? null : '#' + [0, 1, 2].map(j => out.data[k + j].toString(16).padStart(2, '0')).join(''); };
  const ring = new Map();
  for (let y = Math.floor(cy - 7); y <= cy + 7; y++) for (let x = Math.floor(cx - 7); x <= cx + 7; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), c = x >= 0 && y >= 0 && x < W && y < H ? px(x, y) : null;
    if (c && d > 4.5 && d < 6.5) ring.set(c, (ring.get(c) || 0) + 1);
  }
  const skin = [...ring].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!skin) return null;
  const sk = oklab(skin), cand = new Map();
  let dark = null, dl = 9;
  for (let y = Math.floor(cy - 5); y <= cy + 5; y++) for (let x = Math.floor(cx - 5); x <= cx + 5; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 4.5) continue;
    const c = px(x, y);
    if (!c) continue;
    const o = oklab(c);
    if (Math.hypot(o[0] - sk[0], o[1] - sk[1], o[2] - sk[2]) > 0.07) { cand.set(y * W + x, o[0]); if (o[0] < dl) { dl = o[0]; dark = y * W + x; } }
  }
  if (dark === null) return null;
  const mask = new Set([dark]), st = [dark];
  while (st.length) { const i = st.pop(), x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (cand.has(j) && !mask.has(j)) { mask.add(j); st.push(j); } }
  const lidCol = (() => { const [L, A, B] = oklab(px(dark % W, Math.floor(dark / W))); return fromOklab(Math.max(0.15, L), A, B); })();
  return { mask, skin, lidCol };
}
// 깜빡임: half = 눈 칸의 위 절반을 살결로 + 가운데 줄은 눈꺼풀 선, closed = 눈 칸 전부 살결 + 가운데 줄 선. open 은 아무것도 안 바꿈
function blinkEyes(out, cv, state, dx = 0) {
  if (state === 'open') return;
  for (const [cx, cy] of cv.eyeC) {
    const m = eyeMask(out, cx + dx, cy);
    if (!m) continue;
    const ys = [...m.mask].map(i => Math.floor(i / W)), mid = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);
    for (const i of m.mask) {
      const x = i % W, y = (i - x) / W;
      if (y === mid) out.set(x, y, m.lidCol);
      else if (state === 'closed' || y < mid) out.set(x, y, m.skin);
    }
  }
}

// 눈 그리기: open = 종별 EYE 틀 그대로 / half = 위 절반을 눈꺼풀(둘레 살결 색)로 / closed = 눈꺼풀 + 가운데 한 줄
function drawEyes(out, cv, state, dx = 0) {
  const spec = EYES_ON ? EYES[cv.key] : null;
  if (!spec) return;
  const grid = EYE[spec.style].g, col = { k: spec.k || '#2e222f', w: spec.w || '#ffffff', g: spec.g || '#f9c22b', c: spec.c || '#fbff86', i: spec.i || '#fb6b1d', l: spec.l || '#3e3546' };
  for (const e of cv.eyes) {
    const x0 = e.x + dx, y0 = e.y, cnt = new Map();
    for (let y = y0 - 1; y <= y0 + e.h; y++) for (let x = x0 - 1; x <= x0 + e.w; x++) {   // 눈 둘레 1칸 = 살결 색
      if (y >= y0 && y < y0 + e.h && x >= x0 && x < x0 + e.w) continue;
      const k = (y * W + x) * 4;
      if (x < 0 || y < 0 || x >= W || y >= H || out.data[k + 3] < 128) continue;
      const c = '#' + [0, 1, 2].map(j => out.data[k + j].toString(16).padStart(2, '0')).join('');
      cnt.set(c, (cnt.get(c) || 0) + 1);
    }
    const skin = [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0] || col.l;
    const lidRow = Math.max(0, Math.ceil(e.h / 2) - 1), lidCol = col.k;
    grid.forEach((row, y) => [...(e.mirror ? [...row].reverse().join('') : row)].forEach((ch, x) => {
      if (!col[ch]) return;
      let c = col[ch];
      if (state === 'closed') c = y === lidRow ? lidCol : skin;
      else if (state === 'half') c = y < lidRow ? skin : y === lidRow ? lidCol : c;
      out.set(x0 + x, y0 + y, c);
    }));
  }
}

// 색 입히기(+ ⑤ 외곽선). 같은 함수를 움직임 프레임에도 쓴다.
export function paint(cv, { shiftRow = null, tone = null, eye = 'open' } = {}) {
  const out = paintBody(cv, { shiftRow, tone });
  drawEyes(out, cv, eye, cv.eyes.length && shiftRow ? shiftRow(cv.eyes[0].y) : 0);
  if (BLINK && cv.eyeC.length) blinkEyes(out, cv, eye, shiftRow ? shiftRow(Math.round(cv.eyeC[0][1])) : 0);
  return out;
}
function paintBody(cv, { shiftRow = null, tone = null } = {}) {
  const { palLab, matL } = cv, out = new Img(W, H);
  const cm = new Int8Array(W * H).fill(-1), ct = new Int8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i - x) / W, dx = shiftRow ? shiftRow(y) : 0, sx = x - dx;
    if (sx < 0 || sx >= W) continue;
    const j = y * W + sx;
    cm[i] = cv.cm[j]; ct[i] = tone ? tone(cv.cm[j], cv.ct[j], sx, y) : cv.ct[j];
  }
  const col = (m, l) => { const [L, A, B] = palLab[m * LV + l]; return fromOklab(L, A, B); };
  const dark = (m, d) => { const [L, A, B] = palLab[m * LV]; return fromOklab(Math.max(0.1, L - d), A * 1.3, B * 1.3); };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : y * W + x;
  for (let i = 0; i < W * H; i++) {
    const m = cm[i];
    if (m < 0) continue;
    const x = i % W, y = (i - x) / W, nb = [at(x, y - 1), at(x - 1, y), at(x, y + 1), at(x + 1, y)];
    const empty = nb.map(j => j < 0 || cm[j] < 0);
    let c = col(m, Math.max(0, Math.min(LV - 1, ct[i])));
    if (empty.some(Boolean)) c = empty[2] && y < P.cy ? INK : (empty[2] || empty[3]) ? dark(m, 0.16) : dark(m, 0.06);
    else if (nb.some(j => cm[j] !== m && matL[cm[j]] - matL[m] > 0.15)) c = dark(m, 0.08);   // 더 밝은 재질과 맞닿은 어두운 쪽 = 경계선
    out.set(x, y, c);
  }
  return out;
}

mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
const stages = args.includes('--stages');
const cvs = stages ? [] : keys.map(k => {
  const cv = convert(k);
  writeFileSync(resolve(here, 'out', 'conv', k + '_96x112.png'), paint(cv).png());
  console.log(`${k.padEnd(13)} 변환 완료 · 축척 ${cv.s.toFixed(4)}${EYES_ON ? ' · 눈 ' + (cv.eyes.length ? cv.eyes.map(e => `${e.x},${e.y} ${e.w}×${e.h}`).join(' / ') : '지정 없음') : ''}`);
  return cv;
});

// --stages <키>: 생장 단계 누끼(concept/stages/<키>_<단계>.png)를 성체(컨셉)와 같은 축척으로 변환해 한 줄로(새싹 → 새잎 → 꽃봉오리 → 성체 → 만개)
if (stages) {
  const key = keys[0], pot = renderPot(POT3.pot_terra), mature = convert(key), list = [];
  for (const st of ['sprout', 'juvenile', 'growing', 'mature', 'evolved']) {
    const f = resolve(here, 'concept', 'stages', `${key}_${st}.png`);
    const cv = st === 'mature' ? mature : existsSync(f) ? convert(key, { file: f, scale: mature.s }) : null;
    if (!cv) continue;
    const im = paint(cv);
    writeFileSync(resolve(here, 'out', 'conv', `${key}_${st}_96x112.png`), im.png());
    list.push(im);
    console.log(`${st.padEnd(9)} 눈 ${cv.eyes.length ? 'O' : 'X'}`);
  }
  const Z = 3, sheet = new Img(8 + list.length * (W * Z + 8), H * Z + 16, '#2e222f');
  list.forEach((im, k) => { const p = new Img(W, H); p.blit(pot.back, 0, 0); p.blit(im, 0, 0); p.blit(pot.front, 0, 0); sheet.fill(8 + k * (W * Z + 8), 8, W * Z, H * Z, '#323353'); sheet.blit(p, 8 + k * (W * Z + 8), 8, Z); });
  writeFileSync(resolve(here, 'out', 'conv', `${key}_stages.png`), sheet.png());
  console.log('생장 단계 →', resolve(here, 'out', 'conv', `${key}_stages.png`));
}

// 움직임: 몸 흔들림(밑동 고정, 위로 갈수록 크게 휘는 줄 밀기) + 불 재질은 색 띠가 위로 흐르고 + 종별 효과(번개·불티)
if (anim) {
  const { encodeGIF } = await import('./gif.mjs');
  const pot = renderPot(POT3.pot_terra), FR = 16, Z = 3, frames = [];   // 16장(1.6초) 한 바퀴, 12~14장째에 눈 깜빡임
  const FX = {
    flower_fire: { sway: 1.2, embers: [[30, 20], [48, 10], [66, 18]] },
    cactus_fire: { sway: 0.6, embers: [[40, 12], [50, 8], [62, 14]] },
    spark: { sway: 1, bolts: [[[22, 30], [10, 24]], [[74, 26], [88, 20]], [[70, 50], [84, 56]], [[28, 52], [14, 58]]] },
    flower_grass: { sway: 1.4 },
  };
  for (let f = 0; f < FR; f++) {
    const t = f / FR, fr = new Img(cvs.length * W * Z, H * Z, '#2f3150');
    cvs.forEach((cv, k) => {
      const fx = FX[cv.key] || { sway: 1 };
      const top = 6, base = P.cy;
      const shiftRow = y => y >= base - 2 ? 0 : Math.round(fx.sway * Math.sin(2 * Math.PI * t) * ((base - y) / (base - top)) ** 1.4);
      // 불 재질(밝고 선명한 주황·노랑): 높이와 시간에 따라 단이 위로 흐르게
      const fire = cv.palLab.map((c, q) => q % LV === LV - 1 && hueOf(c[1], c[2]) > 20 && hueOf(c[1], c[2]) < 100 && Math.hypot(c[1], c[2]) > 0.12 && c[0] > 0.68);
      const tone = (m, l, x, y) => fire[m * LV + LV - 1] ? Math.max(0, Math.min(LV - 1, l + [1, 0, -1, 0][Math.floor(((y / 5 + 2 * t * 4) % 4 + 4) % 4)])) : l;
      const im = paint(cv, { shiftRow, tone, eye: f === 13 ? 'closed' : f === 12 || f === 14 ? 'half' : 'open' });
      const S = { paints: [], line(a, b, c) { /* bolt 용 */ }, paint(pts, c) { for (const [x, y] of pts) this.paints.push([Math.round(x), Math.round(y), c]); } };
      if (fx.bolts) fx.bolts.forEach(([a, b], q) => { if ((f + q) % 3) bolt({ paint: S.paint.bind(S), w: W }, a, b, { seed: f * 31 + q * 7 + 1, depth: 2, amp: 0.3, fork: 0.3, glow: '#fbe36a' }); });
      if (fx.embers) fx.embers.forEach(([x, y], q) => { const p = (t + q / fx.embers.length) % 1, yy = y - p * 10; if (yy > 0) S.paint([[x + Math.sin(2 * Math.PI * (p + q)) * 2, yy]], p < 0.5 ? '#fcc246' : '#f57a2a'); });
      for (const [x, y, c] of S.paints) im.set(x, y, c);
      const p2 = new Img(W, H);
      p2.blit(pot.back, 0, 0); p2.blit(im, 0, 0); p2.blit(pot.front, 0, 0);
      fr.blit(p2, k * W * Z, 0, Z);
    });
    frames.push(fr);
  }
  writeFileSync(resolve(here, 'out', 'conv', keys.join('+') + '.gif'), encodeGIF(frames, { delay: 10 }));
  console.log('움직임 →', resolve(here, 'out', 'conv', keys.join('+') + '.gif'));
  // 깜빡임 확인판: 뜬 눈 · 반쯤 · 감음을 4배로 나란히(흔들림 없이)
  if (BLINK) for (const cv of cvs) {
    const Z4 = 4, sh = new Img(8 + 3 * (W * Z4 + 8), H * Z4 + 16, '#2e222f');
    ['open', 'half', 'closed'].forEach((st, k) => { const p = new Img(W, H); p.blit(pot.back, 0, 0); p.blit(paint(cv, { eye: st }), 0, 0); p.blit(pot.front, 0, 0); sh.fill(8 + k * (W * Z4 + 8), 8, W * Z4, H * Z4, '#323353'); sh.blit(p, 8 + k * (W * Z4 + 8), 8, Z4); });
    writeFileSync(resolve(here, 'out', 'conv', cv.key + '_blink.png'), sh.png());
    console.log('깜빡임 확인 →', resolve(here, 'out', 'conv', cv.key + '_blink.png'));
  }
}
