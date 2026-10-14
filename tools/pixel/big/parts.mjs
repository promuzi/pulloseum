// 큰 판(96×112) 식물 부품 묶음 — 종 그림은 이 부품을 조립해서 만든다(species/<키>.mjs).
// 판 규격: 96×112(48×56 의 두 배, v2 화면이 ×2 로 그리던 크기를 ×1 로), 밑동(흙 높이) y = 76, 화분은 76 아래.
// 색은 v2/src/art/palette.js 의 Resurrect 64 램프만 쓴다(램프 5색 = 외곽선·그늘·중간·밝음·가장 밝음).
import { Sprite, ellipse, limb, taper, blade, bez, linePx } from './engine.mjs';
import { RAMP } from '../../../v2/src/art/palette.js';

export const W = 96, H = 112, GROUND = 76;
export const R = {
  ...RAMP,
  hole: ['#2e222f', '#2e222f', '#45293f', '#3e3546', '#694f62'],   // 틈·구멍 속(어둠)
  soil: ['#2e222f', '#2e222f', '#3e3546', '#4c3e24', '#694f62'],
};

// 재질 = 메카 생성기 층 설정과 같은 칸(amb 바탕빛, dif 빛 받는 정도, th 명암 문턱, spec 반짝임, dither 점무늬, vgrad 아래로 갈수록 어둡게)
// 정면을 보는 면 = 중간(2단), 빛 쪽으로 기운 면 = 밝음(3단), 가장자리 한 점 = 가장 밝음(4단)이 되게 맞춘 값
export const MAT = {
  leaf:  { amb: 0.18, dif: 0.80, th: [0.42, 0.66, 0.90], spec: [30, 0.95], dither: 0.06, relief: 1.0, smooth: 1.5, vgrad: 0.10 },
  stem:  { amb: 0.20, dif: 0.80, th: [0.42, 0.66, 0.90], dither: 0.05, relief: 1.0, smooth: 2.0, vgrad: 0.14 },
  petal: { amb: 0.18, dif: 0.78, th: [0.44, 0.68, 0.92], dither: 0.07, relief: 0.9, smooth: 2.5, vgrad: 0.08, lip: 3 },
  thorn: { amb: 0.24, dif: 0.80, th: [0.40, 0.62, 0.86], spec: [18, 0.88], relief: 1.2 },
  hole:  { amb: 0.10, dif: 0.40, th: [0.22, 0.38, 0.60], dither: 0.10, casts: false },
  clay:  { amb: 0.26, dif: 0.80, th: [0.38, 0.58, 0.82], spec: [30, 0.93], dither: 0.06, relief: 1.0, smooth: 1.5, vgrad: 0.12 },
  soil:  { amb: 0.20, dif: 0.60, th: [0.30, 0.48, 0.70], dither: 0.12, casts: false },
};

export const plant = () => new Sprite(W, H, { ground: GROUND - 1 });
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// 줄기·덩굴·잎자루: 점들(밑 → 위)과 반지름들. 같은 이름으로 다시 부르면 같은 층에 더한다.
export function stem(S, name, pts, radii, o = {}) {
  const { hz = 1, ...lo } = o;
  return S.layer(name, { ramp: R.grass, ...MAT.stem, ...lo }).add(limb(pts, radii, { hz }));
}

// 잎(꽃받침·턱잎도 같은 부품): base → tip, bend = 휘게 당기는 점, width = 가장 넓은 반폭, at = 가장 넓은 자리(0~1),
// full = 배부른 정도(작을수록 통통), baseW = 밑 반폭, teeth·serr = 톱니, fold = 잎맥에서 접힌 정도,
// rib = 가운데 잎맥 밝은 줄, veins = 곁맥 수(어두운 홈), hz = 두께
export function leaf(S, name, o) {
  const { base, tip, bend = mid(o.base, o.tip), width = 4, at = 0.4, full = 0.8, baseW = 1, teeth = 0, serr = 0.25,
    fold = 0.65, rib = true, veins = 0, hz = width * 0.55, ramp = R.grass, mat = MAT.leaf, ...lo } = o;
  const k = Math.log(0.5) / Math.log(at);
  const wfn = t => Math.max(width * Math.sin(Math.PI * Math.min(1, t) ** k) ** full, baseW * (1 - t / 0.2));
  const b = blade(bez(base, bend, tip, 24), wfn, { hz, fold, teeth, serr });
  const lay = S.layer(name, { ramp, ...mat, ...lo }).add(b);
  // 잎맥은 한 칸 굵기 선(끊김 없이): 가운데 잎맥 = 한 단 밝게, 곁맥 = 한 단 어둡게
  const ribPx = new Set(), veinPx = new Set(), key = ([x, y]) => y * S.w + x;
  if (rib) for (let i = 0; i < 16; i++) for (const p of linePx(b.at(0.04 + 0.82 * i / 16), b.at(0.04 + 0.82 * (i + 1) / 16))) ribPx.add(key(p));
  for (let k = 0; k < veins; k++) {
    const t0 = 0.14 + (k + 0.5) * 0.72 / veins, dt = 0.7 * 0.8 * b.width(t0) / b.L;
    for (const s of [-0.8, 0.8]) for (const p of linePx(b.at(t0), b.at(t0 + dt, s))) veinPx.add(key(p));
  }
  if (ribPx.size || veinPx.size) S.patterns.push((x, y, ln, tv) => {
    if (ln !== name) return tv;
    const k = y * S.w + x, [t, d] = b.uv(x + 0.5, y + 0.5);
    if (Math.abs(d) > b.width(t) - 0.8) return tv;          // 잎 가장자리 칸은 그대로
    if (ribPx.has(k)) return Math.min(4, tv + 1);
    if (veinPx.has(k)) return Math.max(1, tv - 1);
    return tv;
  });
  return lay;
}

// 가시: [밑 x, 밑 y, 끝 x, 끝 y, 굵기] 목록. hook = 가운데가 솟고 끝이 아래로 휘는 정도(장미 가시)
export function thorns(S, name, list, o = {}) {
  const { hook = 0.25, ramp = R.earth, ...lo } = o;
  const lay = S.layer(name, { ramp, ...MAT.thorn, ...lo });
  for (const [bx, by, tx, ty, r = 2] of list) {
    const dx = tx - bx, dy = ty - by, m = [bx + dx * 0.55, by + dy * 0.55 - Math.abs(dx) * hook * 0.4];
    lay.add(limb([[bx, by], m, [tx, ty]], [r, r * 0.55, 0.35], { hz: 1 }));
  }
  return lay;
}

// 꽃잎·꽃잎 덩이(타원 하나). rot = 기울기(라디안), cut = 이 모양으로 도려낸다(틈)
export function petal(S, name, cx, cy, rx, ry, o = {}) {
  const { rot = 0, hz = Math.min(rx, ry) * 0.75, cut = null, ramp = R.rose, ...lo } = o;
  return S.layer(name, { ramp, ...MAT.petal, ...lo }).add(ellipse(cx, cy, rx, ry, { rot, hz })).cut(cut);
}

// 어두운 틈·구멍 속(투구 눈구멍 등)
export function hole(S, name, cx, cy, rx, ry, o = {}) {
  return S.layer(name, { ramp: R.hole, ...MAT.hole, ...o }).add(ellipse(cx, cy, rx, ry, { hz: Math.min(rx, ry) }));
}

// 눈(빛나는 점): [[x, y], ...] 왼쪽 위 칸. 크기 w×h, 왼쪽 위 한 칸은 하이라이트
export function eyes(S, list, { w = 3, h = 2, color = '#fdcbb0', hi = '#ffffff' } = {}) {
  for (const [x, y] of list) { S.rect(x, y, w, h, color); if (hi) S.paint([[x, y]], hi); }
}

// 호(말린 꽃잎 끝·주름 선): 가운데, 반지름, 시작·끝 각(도, 0 = 오른쪽, 90 = 아래)
export function arc(S, cx, cy, r, a0, a1, color, n = 10) {
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180, p = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    if (prev) S.line(prev, p, color);
    prev = p;
  }
}

// 테라코타 화분(따로 그리는 96×112 판 — 식물 판을 위에 겹친다)
export function potTerra() {
  const S = new Sprite(W, H, { ground: H });
  S.layer('soil', { ramp: R.soil, ...MAT.soil }).add(ellipse(48, 77.5, 19, 3, { hz: 1.5 }));
  S.layer('body', { ramp: R.earth, ...MAT.clay }).add(taper(48, 81, 106, 18, 14.5, { hz: 12 }));
  S.layer('foot', { ramp: R.earth, ...MAT.clay, bias: -0.06 }).add(limb([[36, 107.5], [60, 107.5]], [3, 3], { hz: 1 }));
  S.layer('rim', { ramp: R.earth, ...MAT.clay, bias: 0.04 }).add(limb([[28, 80.5], [68, 80.5]], [3.4, 3.4], { hz: 1 }));
  return S;
}
