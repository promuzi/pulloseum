// 화분을 진짜 3D로 그린다 — 메카 생성기의 거미(Sprite3D)처럼 화면 칸마다 광선을 쏘아 가장 가까운 면을 찾고
// (여기선 거리장을 따라 걷는 방식), 2D 엔진과 같은 빛·명암 문턱·점무늬·외곽선(selout) 규칙으로 도트를 만든다.
// 시점 = 앞 위에서 26° 내려다봄(정사영). 결과는 두 장:
//   back  = 흙·안쪽 벽·테 뒤쪽(식물 뒤) / front = 테 앞쪽·몸통·굽(식물 앞). 화면은 back → 식물 → front 순서로 겹친다.
import { LIGHT, HALF, BAYER4, INK, Img } from './engine.mjs';
import { W, H, R } from './parts.mjs';

const EL = 26 * Math.PI / 180, SE = Math.sin(EL), CE = Math.cos(EL);
export const POT_C = [48, 73];                                       // 화면에서 테 중심
const RIM = 22, RA = 2.6;                                             // 테(도넛) 큰·작은 반지름
const YT = -1, YB = -24, RT = 20.6, RB = 15, WALL = 2.2, YS = -3;     // 몸통 위·아래 높이·반지름, 벽 두께, 흙 높이
const EN = (() => { const dq = RT - RB, dy = YT - YB, n = Math.hypot(dq, dy); return [dy / n, -dq / n]; })();   // 바깥 벽 법선(반지름, 높이)
const CAST = [[-1, -1], [-1, -2], [-2, -2], [-2, -3], [-3, -3]];
const rOut = y => RB + (RT - RB) * (y - YB) / (YT - YB);
const torus = (x, y, z, R0, a, cy) => Math.hypot(Math.hypot(x, z) - R0, y - cy) - a;
function body(x, y, z) {   // 속이 빈 원뿔대(흙 높이까지 비움)
  const q = Math.hypot(x, z), side = (q - RB) * EN[0] + (y - YB) * EN[1];
  return Math.max(Math.max(YB - y, y - YT, side), -Math.max(YS - y, y - YT - 6, side + WALL));
}
const foot = (x, y, z) => torus(x, y, z, RB - 0.6, 1.8, YB - 0.4);
const sdf = (x, y, z) => Math.min(torus(x, y, z, RIM, RA, 0), body(x, y, z), foot(x, y, z));
function partOf(x, y, z) {
  const t = torus(x, y, z, RIM, RA, 0), f = foot(x, y, z), b = body(x, y, z);
  if (t <= f && t <= b) return 'rim';
  if (f <= b) return 'foot';
  const q = Math.hypot(x, z);
  if (y < YS + 0.4 && q < rOut(y) - WALL + 0.3) return 'soil';
  return q < rOut(y) - WALL * 0.5 ? 'inner' : 'outer';
}

export function renderPot(style) {
  const N = W * H, dep = new Float32Array(N).fill(Infinity), tone = new Int8Array(N).fill(-1);
  const mat = new Array(N).fill(null), grp = new Array(N).fill(null), back = new Uint8Array(N);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const u = px + 0.5 - POT_C[0], v = py + 0.5 - POT_C[1];
    const ox = u, oy = -v * CE + SE * 60, oz = v * SE + CE * 60;
    let t = 0, x = 0, y = 0, z = 0, hit = false;
    for (let i = 0; i < 220 && t < 130; i++) {
      x = ox; y = oy - SE * t; z = oz - CE * t;
      const d = sdf(x, y, z);
      if (d < 0.01) { hit = true; break; }
      t += Math.max(d * 0.9, 0.01);
    }
    if (!hit) continue;
    const e = 0.04, part = partOf(x, y, z);
    let n = [sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e)];
    if (style.facets && (part === 'outer' || part === 'rim')) {   // 깎은 면: 둘레 각도를 면 수만큼 끊는다
      const ph = Math.round(Math.atan2(n[2], n[0]) / (2 * Math.PI / style.facets)) * (2 * Math.PI / style.facets) + 0.2, nh = Math.hypot(n[0], n[2]);
      n = [nh * Math.cos(ph), n[1], nh * Math.sin(ph)];
    }
    const nl = Math.hypot(...n);
    n = n.map(c => c / nl);
    const sv = [n[0], -(n[1] * CE - n[2] * SE), n[1] * SE + n[2] * CE];   // 세계 법선 → 화면 법선(x 오른쪽, y 아래, z 보는 쪽)
    const m = style.mat(part, { x, y, z }), i = py * W + px;
    let s = m.amb + m.dif * Math.max(0, sv[0] * LIGHT[0] + sv[1] * LIGHT[1] + sv[2] * LIGHT[2]) + (m.bias || 0) - (m.vgrad || 0) * (py / H);
    if (m.dither) s += (BAYER4[py % 4][px % 4] / 16 - 0.47) * m.dither;
    let tn = 1;
    for (const th of m.th) if (s > th) tn++;
    if (m.spec && Math.max(0, sv[0] * HALF[0] + sv[1] * HALF[1] + sv[2] * HALF[2]) ** m.spec[0] > m.spec[1]) tn = 4;
    dep[i] = t; tone[i] = tn; mat[i] = m; grp[i] = part;
    back[i] = part === 'soil' || part === 'inner' || (part === 'rim' && z < 0) ? 1 : 0;
  }
  // 그림자: 왼쪽 위의 더 가까운 다른 부분이 오른쪽 아래로 드리운다
  const sh = tone.slice();
  for (let i = 0; i < N; i++) {
    if (!mat[i]) continue;
    const px = i % W, py = (i - px) / W;
    for (const [ox, oy] of CAST) {
      const qx = px + ox, qy = py + oy, j = qy * W + qx;
      if (qx >= 0 && qy >= 0 && mat[j] && dep[j] < dep[i] - 2 && grp[j] !== grp[i]) { sh[i] = Math.max(1, tone[i] - 1); break; }
    }
  }
  // 외곽선(두 장을 겹친 모양 기준) → 색
  const out = { back: new Img(W, H), front: new Img(W, H) };
  for (let i = 0; i < N; i++) {
    if (!mat[i]) continue;
    const px = i % W, py = (i - px) / W, ramp = mat[i].ramp, t = sh[i];
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : y * W + x;
    const nb = [at(px, py - 1), at(px - 1, py), at(px, py + 1), at(px + 1, py)];
    const empty = nb.map(j => j < 0 || !mat[j]);
    let c = ramp[t];
    if (empty.some(Boolean)) c = empty[2] ? INK : (empty[0] || empty[1]) ? ramp[Math.max(0, t - 2)] : ramp[0];
    else if (nb.some(j => dep[j] - dep[i] > 1.5 && grp[j] !== grp[i])) c = ramp[0];
    (back[i] ? out.back : out.front).set(px, py, c);
  }
  return out;
}

// 화분 다섯 — 재질만 다르고 모양은 같다
const M = (ramp, o = {}) => ({ ramp, amb: 0.2, dif: 0.82, th: [0.4, 0.62, 0.86], spec: null, dither: 0.06, bias: 0, vgrad: 0.1, ...o });
const SOIL = M(['#2e222f', '#3e3546', '#4c3e24', '#694f62', '#966c6c'], { amb: 0.26, dif: 0.6, th: [0.3, 0.48, 0.72], dither: 0.18, vgrad: 0 });
const set = (base, extra = {}) => (part, p) => (extra[part] && extra[part](p)) || base[part];
export const POT3 = {
  pot_terra: { mat: set({ rim: M(R.earth, { bias: 0.05, spec: [30, 0.94] }), outer: M(R.earth, { spec: [30, 0.94] }), foot: M(R.earth, { bias: -0.06 }), inner: M(R.earth, { bias: -0.24 }), soil: SOIL }) },
  pot_ceramic: { mat: set({ rim: M(R.light, { bias: 0.04, spec: [24, 0.9] }), outer: M(R.light, { spec: [24, 0.9] }), foot: M(R.light, { bias: -0.08 }), inner: M(R.light, { bias: -0.26 }), soil: SOIL },
    { outer: p => ((p.y < -8 && p.y > -11.4) || (p.y < -14.4 && p.y > -15.6)) && M(R.water, { spec: [24, 0.9] }) }) },
  pot_glass: { mat: set({ rim: M(R.lily, { amb: 0.32, spec: [14, 0.82] }), outer: M(R.lily, { amb: 0.3, spec: [14, 0.82], dither: 0.04 }), foot: M(R.lily, { bias: -0.04 }), inner: M(R.lily, { bias: -0.3 }), soil: SOIL },
    { outer: p => p.y < YS - 0.8 && M(['#2e222f', '#3e3546', '#4c3e24', '#484a77', '#8fd3ff'], { amb: 0.24, dif: 0.6, th: [0.32, 0.5, 0.84], spec: [14, 0.82], dither: 0.14 }) }) },
  pot_crystal: { facets: 9, mat: set({ rim: M(R.wind, { bias: 0.04, spec: [40, 0.95], dither: 0.02 }), outer: M(R.wind, { spec: [40, 0.95], dither: 0.02 }), foot: M(R.wind, { bias: -0.08 }), inner: M(R.wind, { bias: -0.26 }), soil: SOIL }) },
  pot_gold: { mat: set({ rim: M(R.gold, { bias: 0.04, spec: [22, 0.9], dither: 0.03 }), outer: M(R.gold, { spec: [22, 0.9], dither: 0.03 }), foot: M(R.gold, { bias: -0.08 }), inner: M(R.gold, { bias: -0.28 }), soil: SOIL },
    { outer: p => Math.abs(p.y + 10) < 1.1 && ((Math.atan2(p.z, p.x) * 14 / Math.PI) % 1 + 1) % 1 < 0.3 && M(R.gold, { bias: 0.35 }) }) },
};
