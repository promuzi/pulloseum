// 컨셉 아트 → 도트 변환: 그림 자체를 도트로 만든다(따라 그리기가 아니라 같은 그림).
//   node tools/pixel/big/convert.mjs <키…>             변환 → out/conv/<키>_96x112.png
//   node tools/pixel/big/convert.mjs --measure <키…>   컨셉마다 흙 타원·식물 키 재기
//   node tools/pixel/big/convert.mjs --anim <키…>      변환 + 움직임 64장(숨쉬기·깜빡임·불·전기, motion.mjs) → out/conv/<키…>.gif + <키>_idle.gif (--mp4면 휴대폰용 MP4도)
//   node tools/pixel/big/convert.mjs --stages <키>     생장 3단계(어린·자람·성체) 검토판
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
import { W, H, EYE } from './parts.mjs';
import { EYES } from './eyes.mjs';
import { POT_GEO, POT3, renderPot } from './pot3d.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), measure = args.includes('--measure'), anim = args.includes('--anim'), keys = args.filter(a => !a.startsWith('--'));
const EYES_ON = args.includes('--eyes');   // 눈 덧그리기(EYE 틀) — 사용자 판단으로 끔(2026-10-15 "눈 인식을 못하는 것 같으니 그냥 둬"). 켜려면 --eyes
const BLINK = args.includes('--blink');    // 그려진 눈은 그대로 두고, 깜빡일 때만 실제 눈 칸을 눈꺼풀로 덮는다(2026-10-15 사용자 "그림 바꾸지 말고 실제 눈을 인식해서")
const MP4 = args.includes('--mp4');        // 움직임을 GIF와 함께 휴대폰에서도 재생되는 MP4로(사용자가 원격 휴대폰으로 확인 — video.mjs)
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
  if (file) {   // 생장 단계 누끼: 밑동(맨 아래 3%) 가운데를 판 가운데로 — 단계마다 줄기가 화분 같은 자리에서 나오게
    let bx = 0, bn = 0;
    for (let y = Math.floor(bot - (bot - top) * 0.03); y <= bot; y++) for (let x = 0; x < im.w; x++) if (!isBg[y * im.w + x]) { bx += x; bn++; }
    if (bn) S.cx = bx / bn;
  }
  // 눈: 지정(eyes.mjs)한 대략 자리 근처(반지름 60)에서 가장 어두운 칸들의 무게중심으로 맞춘다
  const spec = EYES_ON || BLINK || anim ? EYES[key] : null, eyes = [];
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

export function convert(key, { file = null, scale = null, fit = 1 } = {}) {
  const { im, lab, isBg, S, top, left, right, eyes: eyeSrc } = load(key, file), n = im.w * im.h;
  const s = scale || fit * Math.min((P.cy - TOP) / (S.cy - top), HALFW / Math.max(S.cx - left, right - S.cx), S.b ? P.a * 1.15 / S.a : 9);
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
  const eyeC = BLINK || anim ? eyeSrc.map(([ex, ey]) => [P.cx + (ex - S.cx) * s, P.cy + (ey - S.cy) * s]) : [];
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
// 깜빡임 — 실제 그려진 눈을 재서 방향에 맞게 감는다(사용자 2026-10-15: "얼굴이 정면이 아니라 기울었고 먼 눈은 작다, 감은 눈은 자연스러운 곡선").
// 기준: ① 얼굴 기울기 θ = 두 눈 칸 무게중심을 잇는 선의 각도 ② 눈마다 θ 축으로 돌린 좌표(u 가로, v 세로)에서 폭·높이를 따로 잼
//       → 원근으로 작게 그려진 먼 눈은 작은 그대로 ③ 감은 눈 = θ 축을 따라 아래로 처지는 곡선(∪), 처짐 = 폭 × 0.22(최소 0.7칸), 높이는 눈 가운데보다 살짝 아래
//       ④ 반쯤 = 같은 축에서 눈 가운데 위쪽만 살결로 덮고 거의 평평한(살짝 ∩) 눈꺼풀 선. 뜬 눈(open)은 그림 그대로.
export function eyeGeometry(out, cv, dx = 0, dy = 0) {
  const ms = cv.eyeC.map(([cx, cy]) => eyeMask(out, cx + dx, cy + dy)).filter(Boolean);
  if (!ms.length) return [];
  const cen = ms.map(m => { let sx = 0, sy = 0; for (const i of m.mask) { sx += i % W + 0.5; sy += Math.floor(i / W) + 0.5; } return [sx / m.mask.size, sy / m.mask.size]; });
  const th = ms.length === 2 ? Math.atan2(cen[1][1] - cen[0][1], cen[1][0] - cen[0][0]) : 0, c = Math.cos(th), s = Math.sin(th);
  return ms.map((m, k) => {
    const [ox, oy] = cen[k], uv = [...m.mask].map(i => { const x = i % W + 0.5 - ox, y = Math.floor(i / W) + 0.5 - oy; return [x * c + y * s, -x * s + y * c]; });
    const us = uv.map(p => p[0]), vs = uv.map(p => p[1]);
    return { m, ox, oy, th, c, s, u0: Math.min(...us) - 0.5, u1: Math.max(...us) + 0.5, v0: Math.min(...vs) - 0.5, v1: Math.max(...vs) + 0.5, uv };
  });
}
function blinkEyes(out, cv, state, dx = 0, dy = 0) {
  if (state === 'open') return;
  for (const g of eyeGeometry(out, cv, dx, dy)) {
    const { m, ox, oy, c, s, u0, u1, v0, v1 } = g, w = u1 - u0, h = v1 - v0, um = (u0 + u1) / 2;
    const toXY = (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
    const curve = state === 'closed'
      ? u => (v0 + v1) / 2 + h * 0.12 + Math.max(0.7, w * 0.22) * (1 - ((u - um) / (w / 2)) ** 2)    // 아래로 처지는 ∪
      : u => (v0 + v1) / 2 - Math.max(0.3, w * 0.08) * (1 - ((u - um) / (w / 2)) ** 2);              // 거의 평평한 ∩
    // 덮기: closed = 눈 칸 전부, half = 곡선 위쪽만
    [...m.mask].forEach((i, k) => { const [u, v] = g.uv[k]; if (state === 'closed' || v < curve(u)) out.set(i % W, Math.floor(i / W), m.skin); });
    // 곡선 그리기: 촘촘히 짚어 칸으로 반올림, 같은 칸은 한 번
    const seen = new Set();
    for (let u = u0 + 0.25; u <= u1 - 0.25; u += 0.25) {
      const [x, y] = toXY(u, curve(u)), X = Math.floor(x), Y = Math.floor(y), key = Y * W + X;
      if (!seen.has(key)) { seen.add(key); out.set(X, Y, m.lidCol); }
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
// warp(x, y) → [dx, dy] = 그 칸에 올 그림이 원래 자리에서 움직인 양(정수) — 재질·단 지도를 옮긴 뒤 외곽선을 새로 그려 선이 끊기지 않는다.
// out.src[i] = 출력 칸 i가 가져온 원래 칸(없으면 -1) — 떠 있는 조각 깜빡임 등에 쓴다.
export function paint(cv, { warp = null, tone = null, eye = 'open' } = {}) {
  const out = paintBody(cv, { warp, tone });
  const off = (x, y) => warp ? warp(Math.round(x), Math.round(y)) : [0, 0];
  if (cv.eyes.length) drawEyes(out, cv, eye, off(cv.eyes[0].x, cv.eyes[0].y)[0]);
  if (cv.eyeC.length && eye !== 'open') { const ex = cv.eyeC.reduce((s, e) => s + e[0], 0) / cv.eyeC.length, ey = cv.eyeC.reduce((s, e) => s + e[1], 0) / cv.eyeC.length; blinkEyes(out, cv, eye, ...off(ex, ey)); }
  return out;
}
function paintBody(cv, { warp = null, tone = null } = {}) {
  const { palLab, matL } = cv, out = new Img(W, H);
  const cm = new Int8Array(W * H).fill(-1), ct = new Int8Array(W * H), src = new Int32Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i - x) / W, [dx, dy] = warp ? warp(x, y) : [0, 0], sx = x - dx, sy = y - dy;
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
    const j = sy * W + sx;
    cm[i] = cv.cm[j]; ct[i] = tone ? tone(cv.cm[j], cv.ct[j], sx, sy) : cv.ct[j]; src[i] = cv.cm[j] >= 0 ? j : -1;
  }
  out.src = src;
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

// --stages <키>: 생장 3단계 — 어린(young) → 자람(teen) → 성체(mature = 원래 컨셉). 어린·자람은 코덱스가 단계마다 따로 디자인해 그린 누끼(concept/stages/<키>_<단계>.png)
// 크기도 코덱스가 그린 그대로 — 성체와 같은 축척(원본 한 칸당 판 칸 수)으로 줄이고 단계별로 키우거나 줄이지 않는다
// (2026-10-15 사용자 "생장단계 임의로 너가 그리지 말고 코덱스로 각각", "3개로 줄이자" — 게임의 6단계와 잇는 법은 CHANGELOG)
const STAGES = ['young', 'teen', 'mature'];
if (stages) {
  const key = keys[0], pot = renderPot(POT3.pot_terra), mature = convert(key), list = [], srcs = [];
  for (const st of STAGES) {
    const f = st === 'mature' ? resolve(here, 'concept', key + '.png') : resolve(here, 'concept', 'stages', `${key}_${st}.png`);
    const cv = st === 'mature' ? mature : existsSync(f) ? convert(key, { file: f, scale: mature.s }) : null;
    if (!cv) continue;
    const im = paint(cv);
    writeFileSync(resolve(here, 'out', 'conv', `${key}_${st}_96x112.png`), im.png());
    list.push(im); srcs.push(decodePNG(readFileSync(f)));
    let t = H, l = W, r = 0, out = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (im.data[(y * W + x) * 4 + 3] > 127) { t = Math.min(t, y); l = Math.min(l, x); r = Math.max(r, x); if (y > P.cy - P.b * 1.5 && y < P.cy && Math.abs(x + 0.5 - P.cx) > P.a + 1) out++; }
    console.log(`${st.padEnd(7)} 키 ${(P.cy - t).toFixed(0)}칸 · 폭 ${l}~${r} · 화분 밖 아래 ${out}칸`);
  }
  // 위: 코덱스 그림(성체는 원래 컨셉) / 아래: 도트 변환 + 3D 화분
  const Z = 3, PW = W * Z, sheet = new Img(8 + list.length * (PW + 8), 8 + PW + 8 + H * Z + 8, '#2e222f');
  const BG = [0x32, 0x33, 0x53];   // 줄인 그림을 판 바탕색 위에 반투명 가장자리까지 섞어 얹는다
  const shrink = (src, w, h) => { const o = new Img(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const x0 = Math.floor(x * src.w / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * src.w / w)), y0 = Math.floor(y * src.h / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * src.h / h)), s3 = [0, 0, 0]; let a = 0; for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) { const q = (j * src.w + i) * 4, al = src.data[q + 3]; for (let c = 0; c < 3; c++) s3[c] += src.data[q + c] * al; a += al; } const full = 255 * (x1 - x0) * (y1 - y0); for (let c = 0; c < 3; c++) o.data[(y * w + x) * 4 + c] = Math.round((s3[c] + BG[c] * (full - a)) / full); o.data[(y * w + x) * 4 + 3] = 255; } return o; };
  list.forEach((im, k) => {
    const X = 8 + k * (PW + 8), p = new Img(W, H);
    sheet.fill(X, 8, PW, PW, '#323353'); sheet.blit(shrink(srcs[k], PW, PW), X, 8);
    p.blit(pot.back, 0, 0); p.blit(im, 0, 0); p.blit(pot.front, 0, 0);
    sheet.fill(X, 16 + PW, PW, H * Z, '#323353'); sheet.blit(p, X, 16 + PW, Z);
  });
  writeFileSync(resolve(here, 'out', 'conv', `${key}_stages.png`), sheet.png());
  console.log('생장 단계 →', resolve(here, 'out', 'conv', `${key}_stages.png`), '· 축척', mature.s.toFixed(4));
}

// 움직임(--anim): 숨쉬기(motion.mjs idleWarp — 날숨에 내려앉으며 옆으로 넓어지고, 잎은 벌어지고, 먼 끝·얼굴 내용은 늦게) + 깜빡임 + 종별 효과
//   불 = 밝은 불 재질의 단이 위로 흐르고 불티가 오름 / 전기 = saint11 방식 벼락·호·불똥 + 떠 있는 번개 문양 깜빡임
// 64장 × 0.05초 = 3.2초 한 바퀴: 몸은 두 장마다(0.1초) 바뀌고 효과는 장마다(전기는 빨라야 한다). 숨은 한 바퀴에 두 번, 좌우 기울기는 한 번.
if (anim) {
  const { encodeGIF } = await import('./gif.mjs');
  const { idleRig, idleWarp, findTips, electricPlan, electricFrame } = await import('./motion.mjs');
  const pot = renderPot(POT3.pot_terra), FR = 64, DT = 5, Z = 3, BG = '#2f3150';
  // blinkAt = 깜빡이는 장(없으면 안 깜빡임). 96칸 판에서 눈 칸 찾기가 꽃잎으로 번지는 종(장미·불꽃꽃·선인장)은 고칠 때까지 끔 — 검증된 건 스파크번
  const FX = {
    flower_grass: { bob: 2, sway: 1, open: 1 },
    flower_fire: { bob: 2, sway: 1, open: 1, fire: true, embers: [[30, 20], [48, 10], [66, 18]] },
    cactus_fire: { bob: 1, sway: 0.5, open: 0, fire: true, embers: [[40, 12], [50, 8], [62, 14]] },
    spark: { bob: 2, sway: 1, open: 1, electric: true, blinkAt: 50 },
  };
  const rigs = cvs.map(cv => idleRig(cv));
  const eplans = cvs.map((cv, k) => (FX[cv.key] || {}).electric ? electricPlan(rigs[k], findTips(cv, rigs[k]), { frames: FR }) : null);
  // k번째 종의 f번째 장(96×112): 화분 뒤 → 식물 → 화분 앞 → 효과
  const frameOf = (k, f, bg = null) => {
    const cv = cvs[k], rig = rigs[k], fx = FX[cv.key] || {}, t = Math.floor(f / 2) * 2 / FR, sec = f * DT / 100;
    const warp = idleWarp(rig, t, fx);
    const fire = fx.fire ? cv.palLab.map((c, q) => q % LV === LV - 1 && hueOf(c[1], c[2]) > 20 && hueOf(c[1], c[2]) < 100 && Math.hypot(c[1], c[2]) > 0.12 && c[0] > 0.68) : null;
    const tone = fire ? (m, l, x, y) => fire[m * LV + LV - 1] ? Math.max(0, Math.min(LV - 1, l + [1, 0, -1, 0][Math.floor(((y / 5 + sec * 5) % 4 + 4) % 4)])) : l : null;
    const b = fx.blinkAt, eye = b == null ? 'open' : f === b + 1 || f === b + 2 ? 'closed' : f === b || f === b + 3 ? 'half' : 'open';
    const im = paint(cv, { warp, tone, eye });
    const at = p => { const [dx, dy] = warp(Math.max(0, Math.min(W - 1, Math.floor(p[0]))), Math.max(0, Math.min(H - 1, Math.floor(p[1])))); return [p[0] + dx, p[1] + dy]; };
    const fxPaint = [], put = (x, y, c) => fxPaint.push([x, y, c]);
    if (eplans[k]) {
      const { flash, bitState } = electricFrame(f, eplans[k], at, put);
      for (let i = 0; i < W * H; i++) {   // 떠 있는 번개 문양: 가끔 숨고 가끔 하얗게
        const j = im.src[i];
        if (j < 0) continue;
        const st = bitState[rig.comp[j]];
        if (st === 1) im.data[i * 4 + 3] = 0;
        else if (st === 2) im.set(i % W, Math.floor(i / W), '#ffffff');
      }
      for (const fl of flash) for (let y = Math.floor(fl.y - fl.r); y <= fl.y + fl.r; y++) for (let x = Math.floor(fl.x - fl.r); x <= fl.x + fl.r; x++) {   // 대비 장: 번쩍임 둘레 식물을 밝게
        if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x + 0.5 - fl.x, y + 0.5 - fl.y) > fl.r) continue;
        const q = (y * W + x) * 4;
        if (im.data[q + 3] < 128) continue;
        for (let c = 0; c < 3; c++) im.data[q + c] = Math.round(im.data[q + c] + (255 - im.data[q + c]) * 0.45);
      }
    }
    if (fx.embers) fx.embers.forEach(([x, y], q) => { const p = (2 * f / FR + q / fx.embers.length) % 1, o = at([x, y]), yy = o[1] - p * 10; if (yy > 0) put(Math.round(o[0] + Math.sin(2 * Math.PI * (p + q)) * 2), Math.round(yy), p < 0.5 ? '#fcc246' : '#f57a2a'); });
    const out = new Img(W, H, bg);
    out.blit(pot.back, 0, 0); out.blit(im, 0, 0); out.blit(pot.front, 0, 0);
    for (const [x, y, c] of fxPaint) out.set(x, y, c);
    return out;
  };
  const zoom = (list, z, bg) => list.map(c => { const o = new Img(c.w * z, c.h * z, bg); o.blit(c, 0, 0, z); return o; });
  // 여러 종: 2열 격자(휴대폰 세로 화면에 맞게) 3배
  const cols = cvs.length > 2 ? 2 : cvs.length, rows = Math.ceil(cvs.length / cols), frames = [];
  for (let f = 0; f < FR; f++) {
    const fr = new Img(cols * W * Z, rows * H * Z, BG);
    cvs.forEach((cv, k) => fr.blit(frameOf(k, f), (k % cols) * W * Z, Math.floor(k / cols) * H * Z, Z));
    frames.push(fr);
  }
  const base = resolve(here, 'out', 'conv', keys.join('+'));
  writeFileSync(base + '.gif', encodeGIF(frames, { delay: DT }));
  console.log('움직임 →', base + '.gif');
  if (MP4) (await import('./video.mjs')).writeMP4(base + '.mp4', frames, { delay: DT, loops: 4, fps: 20 });
  // --frames=a,b,c: 종마다 그 장들을 나란히(검토용 정지 그림)
  const fl = args.find(a => a.startsWith('--frames='));
  if (fl) for (let k = 0; k < cvs.length; k++) {
    const list = fl.slice(9).split(',').map(Number), st = new Img(4 + list.length * (W * Z + 4), H * Z + 8, '#2e222f');
    list.forEach((f, i) => st.blit(frameOf(k, f, BG), 4 + i * (W * Z + 4), 4, Z));
    writeFileSync(resolve(here, 'out', 'conv', cvs[k].key + '_frames.png'), st.png());
  }
  // 종마다 크게: GIF 4배 + MP4 8배
  for (let k = 0; k < cvs.length; k++) {
    const one = Array.from({ length: FR }, (_, f) => frameOf(k, f, BG)), p = resolve(here, 'out', 'conv', cvs[k].key + '_idle'), r = rigs[k];
    writeFileSync(p + '.gif', encodeGIF(zoom(one, 4, BG), { delay: DT }));
    if (MP4) (await import('./video.mjs')).writeMP4(p + '.mp4', zoom(one, 8, BG), { delay: DT, loops: 4, fps: 20 });
    console.log(`${cvs[k].key.padEnd(13)} 숨쉬기 뼈대 · 얼굴 (${r.hx.toFixed(1)}, ${r.hy.toFixed(1)}) 머리 반지름 ${r.Rh.toFixed(1)} · 고정선 y${r.yA} · 떠 있는 조각 ${r.bits.filter(Boolean).length}개${eplans[k] ? ' · 전기 끝점 ' + findTips(cvs[k], r).length + '개' : ''}`);
  }
  // 깜빡임 확인판: 뜬 눈 · 반쯤 · 감음을 4배로 나란히(흔들림 없이)
  if (BLINK) for (const cv of cvs) {
    const Z4 = 4, sh = new Img(8 + 3 * (W * Z4 + 8), H * Z4 + 16, '#2e222f');
    ['open', 'half', 'closed'].forEach((st, k) => { const p = new Img(W, H); p.blit(pot.back, 0, 0); p.blit(paint(cv, { eye: st }), 0, 0); p.blit(pot.front, 0, 0); sh.fill(8 + k * (W * Z4 + 8), 8, W * Z4, H * Z4, '#323353'); sh.blit(p, 8 + k * (W * Z4 + 8), 8, Z4); });
    writeFileSync(resolve(here, 'out', 'conv', cv.key + '_blink.png'), sh.png());
    // 얼굴 확대(10배, 두 눈 둘레 30×18칸): 뜬 눈 · 반쯤 · 감음 + 잰 값
    const ex = cv.eyeC.reduce((a, e) => a + e[0], 0) / cv.eyeC.length, ey = cv.eyeC.reduce((a, e) => a + e[1], 0) / cv.eyeC.length;
    const CW = 30, CHh = 18, Z10 = 10, X0 = Math.round(ex - CW / 2), Y0 = Math.round(ey - CHh / 2), face = new Img(8 + 3 * (CW * Z10 + 8), CHh * Z10 + 16, '#2e222f');
    ['open', 'half', 'closed'].forEach((st, k) => {
      const im = paint(cv, { eye: st }), crop = new Img(CW, CHh, '#323353');
      for (let y = 0; y < CHh; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 0 && sy >= 0 && sx < W && sy < H) { const s4 = (sy * W + sx) * 4; if (im.data[s4 + 3] > 127) crop.data.set(im.data.subarray(s4, s4 + 4), (y * CW + x) * 4); } }
      face.blit(crop, 8 + k * (CW * Z10 + 8), 8, Z10);
    });
    writeFileSync(resolve(here, 'out', 'conv', cv.key + '_blink_face.png'), face.png());
    // 얼굴 영상: 흔들림 없이 깜빡임만(뜬 눈 1.6초 → 반쯤 0.06 → 감음 0.12 → 반쯤 0.06). GIF 10배 + --mp4면 MP4 20배. 화분 전체는 위의 <키>_idle
    const seq = [['open', 160], ['half', 6], ['closed', 12], ['half', 6]];
    const faces = seq.map(([st]) => { const im = paint(cv, { eye: st }), c1 = new Img(CW, CHh, '#323353'); for (let y = 0; y < CHh; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 0 && sy >= 0 && sx < W && sy < H) { const s4 = (sy * W + sx) * 4; if (im.data[s4 + 3] > 127) c1.data.set(im.data.subarray(s4, s4 + 4), (y * CW + x) * 4); } } return c1; });
    writeFileSync(resolve(here, 'out', 'conv', cv.key + '_blink_face.gif'), encodeGIF(zoom(faces, Z10, '#323353'), { delay: seq.map(s => s[1]) }));
    if (MP4) (await import('./video.mjs')).writeMP4(resolve(here, 'out', 'conv', cv.key + '_blink_face.mp4'), zoom(faces, 20, '#323353'), { delay: seq.map(s => s[1]), loops: 6 });
    const geo = eyeGeometry(paint(cv), cv);
    console.log(`깜빡임 확인 → ${cv.key}_blink.png · _blink_face.png · 얼굴 기울기 ${geo.length ? (geo[0].th * 180 / Math.PI).toFixed(1) : '-'}° · 눈 ` + geo.map((g, k) => `${k ? '오른쪽' : '왼쪽'} 폭 ${(g.u1 - g.u0).toFixed(1)} 높이 ${(g.v1 - g.v0).toFixed(1)}`).join(' / '));
  }
}
