// 큰 판(96×112) 식물 부품 묶음 — 종 그림은 이 부품을 조립해서 만든다(species/<키>.mjs).
// 판 규격: 96×112(48×56 의 두 배, v2 화면이 ×2 로 그리던 크기를 ×1 로), 밑동(흙 높이) y = 76, 화분은 76 아래.
// 색은 v2/src/art/palette.js 의 Resurrect 64 램프만 쓴다(램프 5색 = 외곽선·그늘·중간·밝음·가장 밝음).
import { Sprite, ellipse, limb, taper, blade, bez, linePx, ribbed, ribBall, plane, box, BAYER4 } from './engine.mjs';
import { RAMP } from '../../../v2/src/art/palette.js';

export const W = 96, H = 112, GROUND = 76;
export const R = {
  ...RAMP,
  hole: ['#2e222f', '#2e222f', '#45293f', '#3e3546', '#694f62'],   // 틈·구멍 속(어둠)
  soil: ['#2e222f', '#2e222f', '#3e3546', '#4c3e24', '#694f62'],
  char: ['#2e222f', '#6e2727', '#9e4539', '#cd683d', '#e6904e'],   // 그을린 붉은 갈색
  olive: ['#2e222f', '#4c3e24', '#676633', '#a2a947', '#d5e04b'],
  lily: ['#323353', '#4d65b4', '#8fd3ff', '#c7dcd0', '#ffffff'],   // 흰빛 도는 하늘색
  gold: ['#4c3e24', '#9e4539', '#f79617', '#f9c22b', '#fbff86'],
  dusk: ['#2e222f', '#45293f', '#694f62', '#966c6c', '#ab947a'],
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
  cactus: { amb: 0.20, dif: 0.82, th: [0.42, 0.66, 0.90], dither: 0.05, relief: 1.2, smooth: 1.5, vgrad: 0.12 },
  rock:  { amb: 0.20, dif: 0.84, th: [0.40, 0.62, 0.86], dither: 0.035, relief: 1.0, smooth: 1.0, vgrad: 0.10 },
  gel:   { amb: 0.18, dif: 0.74, th: [0.44, 0.68, 0.92], spec: [40, 0.88], dither: 0.05, relief: 0.6, smooth: 3.0, vgrad: 0.10, thin: 0.2, thick: 16 },
  cap:   { amb: 0.20, dif: 0.80, th: [0.42, 0.66, 0.90], dither: 0.06, relief: 0.9, smooth: 2.0, vgrad: 0.05 },
  puff:  { amb: 0.45, dif: 0.55, th: [0.42, 0.64, 0.88], dither: 0.10, relief: 0.5, smooth: 3.0, casts: false },
  metal: { amb: 0.16, dif: 0.86, th: [0.40, 0.62, 0.84], spec: [24, 0.9], dither: 0.04, relief: 1.1, smooth: 1.5, vgrad: 0.10 },
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
// path = 가운데 선을 직접 준다(물결 잎 등), wave·waves = 폭이 물결치는 정도·횟수
export function leaf(S, name, o) {
  const { base, tip, bend = o.base && mid(o.base, o.tip), path = null, width = 4, at = 0.4, full = 0.8, baseW = 1, teeth = 0, serr = 0.25,
    wave = 0, waves = 3, fold = 0.65, rib = true, veins = 0, hz = width * 0.55, ramp = R.grass, mat = MAT.leaf, ...lo } = o;
  const k = Math.log(0.5) / Math.log(at);
  const wfn = t => Math.max(width * Math.sin(Math.PI * Math.min(1, t) ** k) ** full * (1 + wave * Math.sin(2 * Math.PI * waves * t)), baseW * (1 - t / 0.2));
  const b = blade(path || bez(base, bend, tip, 24), wfn, { hz, fold, teeth, serr });
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

// 눈: [[x, y], ...] 왼쪽 위 칸. 기본 = 세로로 둥근 2×3 어두운 점 + 왼쪽 위 흰 반짝임(순한 눈매). 어두운 바탕이면 color 를 밝게
export function eyes(S, list, { w = 2, h = 3, color = '#2e222f', hi = '#ffffff' } = {}) {
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

// 불꽃·빛 혀(스스로 빛나는 층, 외곽선 없음): 가운데일수록 밝다. 같은 이름으로 여러 번 부르면 한 층에 모인다.
export function flame(S, name, o) {
  const { base, tip, bend = mid(o.base, o.tip), path = null, width = 4, at = 0.35, full = 0.8, teeth = 0, serr = 0.3,
    core = 0.4, ramp = R.fire, ...lo } = o;
  const k = Math.log(0.5) / Math.log(at);
  const b = blade(path || bez(base, bend, tip, 24), t => width * Math.sin(Math.PI * Math.min(1, t) ** k) ** full, { hz: 1, fold: 0, teeth, serr });
  const lay = S.layer(name, { ramp, outlineIn: false, outlineOut: false, casts: false, ...lo });
  lay.flames = lay.flames || [];
  lay.flames.push([b, core]);
  lay.emissive = (x, y) => {
    let best = 9, bt = 1, bc = 0.4;
    for (const [fb, c] of lay.flames) {
      const [t, d] = fb.uv(x + 0.5, y + 0.5), w = fb.width(t);
      if (w > 0.3 && Math.abs(d) <= w && Math.abs(d) / w < best) { best = Math.abs(d) / w; bt = t; bc = c; }
    }
    return best < bc && bt < 0.8 ? 4 : best < 0.6 ? 3 : best < 0.85 ? 2 : 1;
  };
  return lay.add(b);
}

// 안에서 번지는 빛: 그 층의 타원 안 칸을 k단 밝게(가장자리는 점무늬로 섞음)
export function glow(S, layerName, cx, cy, rx, ry, k = 1) {
  S.patterns.push((x, y, ln, tv) => {
    if (ln !== layerName) return tv;
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, r2 = u * u + v * v;
    if (r2 >= 1) return tv;
    return r2 < 0.45 || BAYER4[y % 4][x % 4] / 16 > (r2 - 0.45) / 0.55 ? Math.min(4, tv + k) : tv;
  });
}

// 무늬 점(반점·이끼 등): 그 층의 원들 안을 tone 으로
export function spots(S, layerName, list, tone) {
  S.patterns.push((x, y, ln, tv) => {
    if (ln !== layerName) return tv;
    for (const [cx, cy, r] of list) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) return typeof tone === 'function' ? tone(tv) : tone;
    return tv;
  });
}

// 나선 점들(덩굴손): 가운데, 시작·끝 반지름, 시작·끝 각(도, 0 = 오른쪽, 90 = 아래)
export function spiral(cx, cy, r0, r1, a0, a1, n = 24) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, r = r0 + (r1 - r0) * t, a = (a0 + (a1 - a0) * t) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

// 물결 선: a → b 를 따라 옆으로 amp 만큼 waves 번 출렁이는 점들(미역 잎·나부끼는 리본)
export function wavy(a, b, amp, waves, n = 30, phase = 0) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), px = -dy / L, py = dx / L;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, o = amp * Math.sin(2 * Math.PI * waves * t + phase) * Math.sin(Math.PI * Math.min(1, t * 1.6));
    return [a[0] + dx * t + px * o, a[1] + dy * t + py * o];
  });
}

// 번개선: a → b 를 n 마디로 좌우 번갈아 꺾어 칠한다
export function zigzag(S, a, b, n, amp, color, mask) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), px = -dy / L, py = dx / L;
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n, o = i === n ? 0 : (i % 2 ? amp : -amp), p = [a[0] + dx * t + px * o, a[1] + dy * t + py * o];
    S.line(prev, p, color, mask);
    prev = p;
  }
}

// 결정(각기둥): base 에서 ang(도) 방향으로 len, 반폭 w. 빛 쪽 면과 그늘 쪽 면이 각각 평면이라 각이 선다.
export function crystal(S, name, base, ang, len, w, o = {}) {
  const { ramp = R.ice, ...lo } = o;
  const a = ang * Math.PI / 180, d = [Math.cos(a), Math.sin(a)], p = [-d[1], d[0]];
  const at = (s, q) => [base[0] + d[0] * s + p[0] * q, base[1] + d[1] * s + p[1] * q];
  const tip = at(len, 0), k = 0.9;
  return S.layer(name, { ramp, amb: 0.2, dif: 0.85, th: [0.4, 0.62, 0.86], spec: [40, 0.97], smooth: 0.25, ...lo })
    .add(plane([at(0, -w), at(len * 0.72, -w), tip, base], { h0: 5, g: [p[0] * k, p[1] * k], ref: base }))
    .add(plane([base, tip, at(len * 0.72, w), at(0, w)], { h0: 5, g: [-p[0] * k, -p[1] * k], ref: base }));
}

// 선인장 몸통(골 진 기둥) + 가시. spine = { every 세로 간격, len 바깥 가시 길이, color, dark 가시 밑점, lean 바람에 눕는 쪽(−왼 +오) }
export function cactus(S, name, pts, radii, o = {}) {
  const { ribs = 5, amp = 0.3, ramp = R.grass, spine = null, cut = null, mat = MAT.cactus, ...lo } = o;
  const lay = S.layer(name, { ramp, ...mat, ...lo }).add(ribbed(pts, radii, { ribs, amp }));
  for (const c of [].concat(cut || [])) lay.cut(c);
  if (!spine) return lay;
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay);
    segs.push([ax, ay, bx, by, radii[i], radii[i + 1], l, total]);
    total += l;
  }
  const rows = [];
  for (let s = (spine.every || 7) * 0.6; s < total - 1; s += spine.every || 7) {
    const sg = segs.find(q => s <= q[7] + q[6]) || segs[segs.length - 1], u = (s - sg[7]) / sg[6];
    rows.push([sg[0] + (sg[2] - sg[0]) * u, sg[1] + (sg[3] - sg[1]) * u, sg[4] + (sg[5] - sg[4]) * u, (sg[2] - sg[0]) / sg[6], (sg[3] - sg[1]) / sg[6]]);
  }
  spines(S, lay, rows, ribs, spine);
  return lay;
}

// 통 선인장(골 진 타원체) + 가시. 밑은 bottom 아래를 도려 화분 흙에 앉힌다.
export function cactusBall(S, name, cx, cy, rx, ry, o = {}) {
  const { ribs = 6, amp = 0.3, ramp = R.grass, spine = null, bottom = GROUND + 1.5, mat = MAT.cactus, ...lo } = o;
  const lay = S.layer(name, { ramp, ...mat, ...lo }).add(ribBall(cx, cy, rx, ry, { ribs, amp })).cut(box(0, bottom, W, H));
  if (!spine) return lay;
  const rows = [], every = spine.every || 7;
  for (let y = cy - ry * 0.86; y < Math.min(bottom - 2, cy + ry * 0.9); y += every) rows.push([cx, y, rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)), 0, -1]);
  spines(S, lay, rows, ribs, spine);
  return lay;
}

// 가시: rows = [축 x, 축 y, 반지름, 축 방향 dx, dy] 줄마다 등성이 위에 가시를 엇갈려 찍는다
function spines(S, lay, rows, ribs, { len = 4, color = '#c7dcd0', dark = null, lean = 0 }) {
  const holeAt = (x, y) => lay.cuts.some(c => c(x + 0.5, y + 0.5) !== null);
  rows.forEach(([x, y, r, dx, dy], row) => {
    const px = -dy, py = dx;
    for (let kk = -ribs; kk <= ribs; kk++) {
      const th = kk * Math.PI / ribs;
      if (Math.abs(th) > Math.PI / 2 - 0.12 || (kk + row) % 2) continue;   // 줄마다 엇갈리게
      const off = r * Math.sin(th), ax = x + px * off, ay = y + py * off;
      if (holeAt(Math.round(ax), Math.round(ay))) continue;
      if (Math.abs(th) > 0.95) {                                   // 옆 등성이 = 윤곽 밖으로 뻗는 가시
        const sx = px * Math.sign(off) + dx * 0.55 + lean * 0.35, sy = py * Math.sign(off) + dy * 0.55, n = Math.hypot(sx, sy);
        S.line([ax, ay], [ax + sx / n * len, ay + sy / n * len], color, lay.z);
      } else {                                                     // 앞 등성이 = 가시 자리 점 + 짧은 가시
        S.line([ax, ay], [ax + Math.sign(off || 1) * 1.5 + lean * 0.6, ay - 1.6], color, lay.z);
        if (dark) S.paint([[ax, ay + 1]], dark, lay.z);
      }
    }
  });
}

// 옅은 안개(포자·김): 타원 덩이를 그리고, 가장자리로 갈수록 점무늬로 칸을 지워 비쳐 보이게 한다
export function haze(S, name, list, o = {}) {
  const { ramp = R.light, fade = 0.35, ...lo } = o;
  const lay = S.layer(name, { ramp, ...MAT.puff, outlineOut: false, outlineIn: false, ...lo });
  lay.skip = lay.skip || new Set();
  for (const [x, y, rx, ry] of list) {
    lay.add(ellipse(x, y, rx, ry, { hz: Math.min(rx, ry) * 0.7 }));
    for (let j = Math.floor(y - ry); j <= y + ry; j++) for (let i = Math.floor(x - rx); i <= x + rx; i++) {
      const r2 = ((i + 0.5 - x) / rx) ** 2 + ((j + 0.5 - y) / ry) ** 2;
      if (r2 <= 1 && j >= 0 && i >= 0 && BAYER4[j % 4][i % 4] / 16 < fade + (1 - fade) * Math.max(0, r2 - 0.25) / 0.75 - 0.25) lay.skip.add(j * S.w + i);
    }
  }
  return lay;
}

// 덩굴: 가운데 선(점들)을 따라 r0 → r1 로 가늘어지는 관. thorn = { every, len, r, ramp, hook } 이면 양옆 번갈아 가시
export function vine(S, name, path, r0, r1, o = {}) {
  const { thorn = null, ...lo } = o, n = path.length;
  const lay = stem(S, name, path, path.map((_, i) => r0 + (r1 - r0) * i / (n - 1)), lo);
  if (!thorn) return lay;
  const { every = 6, len = 3.5, r = 1.6, ramp = R.warm, hook = 0.3, start = 0.08, end = 0.92 } = thorn;
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = cum[n - 1], list = [];
  let side = 1;
  for (let s = total * start; s < total * end; s += every, side = -side) {
    let i = 1;
    while (i < n - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1, u = (s - cum[i - 1]) / seg;
    const dx = (path[i][0] - path[i - 1][0]) / seg, dy = (path[i][1] - path[i - 1][1]) / seg;
    const x = path[i - 1][0] + dx * seg * u, y = path[i - 1][1] + dy * seg * u, rr = r0 + (r1 - r0) * s / total;
    const nx = -dy * side, ny = dx * side, bx = x + nx * rr * 0.7, by = y + ny * rr * 0.7;
    list.push([bx, by, bx + (nx * 0.85 + dx * 0.5) * len, by + (ny * 0.85 + dy * 0.5) * len, r]);
  }
  thorns(S, name + 'T', list, { ramp, hook });
  return lay;
}

// 다각형 틀을 돌리고 키워 옮긴다(꽃잎 틀 등). ang = 도(시계 방향), 틀은 위(−y)를 향하게 그린다
export function place(tpl, cx, cy, ang, sc = 1) {
  const a = ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return tpl.map(([x, y]) => [cx + (x * c - y * s) * sc, cy + (x * s + y * c) * sc]);
}

// 테라코타 화분(따로 그리는 96×112 판 — 식물 판을 위에 겹친다)
function potShape(ramp, mat, { body = null, rim = ramp } = {}) {
  const S = new Sprite(W, H, { ground: H });
  S.layer('soil', { ramp: R.soil, ...MAT.soil }).add(ellipse(48, 77.5, 19, 3, { hz: 1.5 }));
  S.layer('body', { ramp, ...mat }).add(body || taper(48, 81, 106, 18, 14.5, { hz: 12 }));
  S.layer('foot', { ramp, ...mat, bias: -0.06 }).add(limb([[36, 107.5], [60, 107.5]], [3, 3], { hz: 1 }));
  S.layer('rim', { ramp: rim, ...mat, bias: 0.04 }).add(limb([[28, 80.5], [68, 80.5]], [3.4, 3.4], { hz: 1 }));
  return S;
}
export function potTerra() { return potShape(R.earth, MAT.clay); }

// 화분 다섯(게임 열쇠 → 그리는 함수)
export const POTS = {
  pot_terra: potTerra,
  pot_ceramic() {   // 흰 유약 + 파란 띠 두 줄
    const S = potShape(R.light, { ...MAT.clay, spec: [24, 0.9] });
    S.layer('band', { ramp: R.water, ...MAT.clay, group: 'body' })
      .add(taper(48, 89.5, 94.5, 16.8, 16.1, { hz: 12.2 })).add(taper(48, 98.5, 100.5, 15.5, 15.3, { hz: 12.2 }));
    return S;
  },
  pot_glass() {     // 투명 유리 너머 흙 + 세로 반사광
    const S = potShape(R.lily, MAT.gel, { rim: R.lily });
    S.layer('inside', { ramp: R.soil, ...MAT.soil, group: 'body', outlineIn: false }).add(taper(48, 84, 101, 15.2, 12.4, { hz: 8 }));
    S.line([34, 85], [35, 101], '#ffffff');
    S.line([36, 86], [36, 92], '#c7dcd0');
    S.line([60, 86], [59, 96], '#8fd3ff');
    return S;
  },
  pot_crystal() {   // 면이 선 자수정
    const body = [
      plane([[30, 81], [40, 81], [42, 106], [34, 106]], { h0: 5, g: [0.45, 0], ref: [40, 81] }),
      plane([[40, 81], [56, 81], [54, 106], [42, 106]], { h0: 6.5, g: [0, 0.04], ref: [48, 81] }),
      plane([[56, 81], [66, 81], [62, 106], [54, 106]], { h0: 5, g: [-0.45, 0], ref: [56, 81] }),
    ];
    const S = potShape(R.wind, { ...MAT.rock, smooth: 0.25, spec: [40, 0.96] }, { body: body[0] });
    body.slice(1).forEach(p => S.layer('body').add(p));
    return S;
  },
  pot_gold() {      // 금 + 돋을새김 점 띠
    const S = potShape(R.gold, MAT.metal);
    spots(S, 'body', [30, 36, 42, 48, 54, 60, 66].map(x => [x, 92.5, 1.3]), 4);
    return S;
  },
};
