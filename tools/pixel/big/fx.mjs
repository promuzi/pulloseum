// 종별 특성 효과(대기 동작에 얹음) — 속성·재질마다 자료 근거(saint11 도트 강좌, saint11.art/blog/pixel-art-tutorials):
//  광택(Shine)  = 흰 사선 띠가 4~6장에 걸쳐 모양을 가로지름 — 단단한 칼날·금속·은빛 몸통
//  보석(Gems)   = 면(같은 단 덩어리)마다 통째로 빛나고, 가운데 장에서 빛이 가장 넓게 — 수정
//  반짝 별      = 점 → 십자 → 큰 십자 → 십자 → 점(5장)
//  물(Water)    = 물방울은 넓게 맺혀 점점 길고 가늘어지다 떨어지고(Slime: 진할수록 오래 매달림), 흙에 닿으면 튐 · 거품은 좌우로 흔들리며 올라가다 사라짐
//  바람(Wind)   = 공기는 안 보이니 먼지·잎·입자로 보여 준다 · 빠르게 · 지그재그·고리 모양
//  불·전기      = motion.mjs
// 장 = 0.05초, 한 바퀴 FR장. 효과 자리(at)는 숨쉬기를 따라 옮긴다. 식물 칸 색을 바꾸는 효과는 im(식물 층)에, 입자는 put(화분 위)으로.
import { W, H } from './parts.mjs';
import { POT_GEO as P } from './pot3d.mjs';
import { rng, oklab, fromOklab } from './engine.mjs';

const LV = 4, hueOf = (A, B) => (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const getPx = (im, x, y) => { const k = (y * W + x) * 4; return [im.data[k], im.data[k + 1], im.data[k + 2], im.data[k + 3]]; };
const lighten = (im, x, y, f) => { const k = (y * W + x) * 4; for (let c = 0; c < 3; c++) im.data[k + c] = Math.round(im.data[k + c] + (255 - im.data[k + c]) * f); };

// 재질 고르기: 재질의 밝은 단 색이 조건(색상 범위·채도·밝기)에 맞는 것
export function matsWhere(cv, { hue = null, cmin = 0, cmax = 9, lmin = 0, lmax = 9 } = {}) {
  const out = new Set();
  cv.matL.forEach((_, m) => {
    const [L, A, B] = cv.palLab[m * LV + 2], C = Math.hypot(A, B), h = hueOf(A, B);
    const okHue = !hue || (hue[0] <= hue[1] ? h >= hue[0] && h <= hue[1] : h >= hue[0] || h <= hue[1]);
    if (okHue && C >= cmin && C <= cmax && L >= lmin && L <= lmax) out.add(m);
  });
  return out;
}
// 쉬는 그림에서 그 재질 칸(상자 [x0,y0,x1,y1] 안만) 목록
function cellsOf(cv, mats, box = null) {
  const list = [];
  for (let i = 0; i < W * H; i++) {
    if (cv.cm[i] < 0 || !mats.has(cv.cm[i])) continue;
    const x = i % W, y = (i - x) / W;
    if (box && (x < box[0] || y < box[1] || x > box[2] || y > box[3])) continue;
    list.push(i);
  }
  return list;
}
// 같은 재질·같은 단으로 이어진 덩어리(보석 면)
function facetsOf(cv, cells) {
  const set = new Set(cells), seen = new Set(), out = [];
  for (const i of cells) {
    if (seen.has(i)) continue;
    const st = [i], f = [];
    seen.add(i);
    while (st.length) {
      const j = st.pop(), x = j % W;
      f.push(j);
      for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && set.has(k) && !seen.has(k) && cv.cm[k] === cv.cm[j] && cv.ct[k] === cv.ct[j]) { seen.add(k); st.push(k); }
    }
    if (f.length >= 2) out.push(f);
  }
  return out;
}
// 아래로 처진 끝(물방울 맺힐 자리): 아래 칸이 비고 양옆 아래보다 낮은 몸 칸, 흙 위·화분 폭 안
function dripTips(cv, rig, n, seed) {
  const r = rng(seed), cand = [];
  for (let y = 4; y < P.cy - 6; y++) for (let x = 2; x < W - 2; x++) {
    const i = y * W + x;
    if (cv.cm[i] < 0 || cv.cm[i + W] >= 0 || rig.comp[i] !== rig.main) continue;
    if (cv.cm[i + W - 1] >= 0 || cv.cm[i + W + 1] >= 0) continue;
    if (Math.abs(x + 0.5 - P.cx) > P.a * 0.9) continue;
    cand.push([x, y]);
  }
  const out = [];
  while (out.length < n && cand.length) { const k = Math.floor(r() * cand.length), c = cand.splice(k, 1)[0]; if (out.every(o => Math.abs(o[0] - c[0]) > 6)) out.push(c); }
  return out;
}

// 종별 준비: fx 설정(convert.mjs FX[키].amb)을 보고 필요한 칸·자리를 미리 잰다
export function ambientPlan(cv, rig, amb = {}, FR = 64, seed = 11) {
  const plan = { FR, amb, seed };
  if (amb.shine) for (const sh of [].concat(amb.shine)) {
    const cells = cellsOf(cv, matsWhere(cv, sh.mat || {}), sh.box);
    if (!cells.length) continue;
    const us = cells.map(i => i % W + Math.floor(i / W));
    (plan.shine ||= []).push({ ...sh, set: new Set(cells), u0: Math.min(...us), u1: Math.max(...us) });
  }
  if (amb.gems) { const cells = cellsOf(cv, matsWhere(cv, amb.gems.mat || {}), amb.gems.box); plan.gems = { ...amb.gems, cells, facets: facetsOf(cv, cells) }; }
  if (amb.twinkle) { const cells = cellsOf(cv, matsWhere(cv, amb.twinkle.mat || {}), amb.twinkle.box); plan.twinkle = { ...amb.twinkle, cells }; }
  if (amb.drips) plan.drips = { ...amb.drips, tips: amb.drips.at || dripTips(cv, rig, amb.drips.n || 2, seed) };
  if (amb.bubbles) { const cells = cellsOf(cv, matsWhere(cv, amb.bubbles.mat || {}), amb.bubbles.box); plan.bubbles = { ...amb.bubbles, cells }; }
  if (amb.petals) plan.petals = amb.petals;
  if (amb.wind) plan.wind = amb.wind;
  if (amb.swirl) plan.swirl = amb.swirl;
  if (amb.spores) plan.spores = amb.spores;
  if (amb.dust) plan.dust = amb.dust;
  if (amb.lava) plan.lava = amb.lava;
  if (amb.magic) plan.magic = amb.magic;
  if (amb.pulse) { const cells = cellsOf(cv, matsWhere(cv, amb.pulse.mat || {}), amb.pulse.box), ys = cells.map(c => Math.floor(c / W)); plan.pulse = { ...amb.pulse, cells, set: new Set(cells), yb: Math.max(...ys, 0), yt: Math.min(...ys, H) }; }
  if (amb.flow) plan.flow = flowPlan(cv, rig, amb.flow, seed);
  if (amb.orbit) plan.orbit = orbitPlan(cv, rig, amb.orbit);
  return plan;
}

// 그림에 그려진 바람결 · 리본 · 번개 무늬(2026-10-22 사용자 "식물 외형 디자인에 이미 바람효과나 번개효과가 같이 그려진 경우 이를 활용해서 자연스럽게 식물의 움직임을 반영해줘 —
//  지금은 예시로 바람형태의 디자인이 움직이지 않고 식물 주변에서 꿀렁이기만해"): 그 재질 칸을 이어진 줄(덩어리)마다 나눠 줄을 따라 거리를 잰다 —
//  from 'end' = 바람이 오는 쪽 끝부터(dir 1 = 왼쪽 끝) · 'root' = 몸에 붙은 데부터(안 붙은 줄은 'end') · 'head' = 얼굴에서 바깥으로(곧은 거리).
//  흐름 = 밝은 머리가 줄을 따라 지나가고 뒤로 옅은 꼬리(바람이 그 줄을 타고 흐르는 것처럼) · wave = 붙은 쪽은 그대로, 끝으로 갈수록 줄에 수직으로 물결치며 펄럭(motion.mjs ribbon)
const nb8 = j => { const x = j % W, y = (j - x) / W, out = []; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { if (!ox && !oy) continue; const X = x + ox, Y = y + oy; if (X >= 0 && Y >= 0 && X < W && Y < H) out.push(Y * W + X); } return out; };
function flowPlan(cv, rig, fl, seed) {
  const cells = cellsOf(cv, matsWhere(cv, fl.mat || {}), fl.box), set = new Set(cells);
  const comp = new Int32Array(W * H).fill(-1), d = new Float32Array(W * H).fill(-1), comps = [], dir = fl.dir ?? 1;
  for (const c0 of cells) {
    if (comp[c0] !== -1) continue;
    const id = comps.length, list = [c0];
    comp[c0] = id;
    for (let q = 0; q < list.length; q++) for (const k of nb8(list[q])) if (set.has(k) && comp[k] === -1) { comp[k] = id; list.push(k); }
    if (list.length < (fl.min || 6)) { for (const k of list) comp[k] = -2; continue; }
    let src = null;
    if (fl.from === 'root') { src = list.filter(j => nb8(j).some(k => cv.cm[k] >= 0 && !set.has(k))); if (!src.length) src = null; }
    if (fl.from !== 'head' && !src) { let best = list[0]; for (const j of list) if ((j % W) * dir < (best % W) * dir) best = j; src = [best]; }   // 바람 오는 쪽 끝
    if (src) {
      for (const s of src) d[s] = 0;
      const qu = [...src];
      for (let q = 0; q < qu.length; q++) { const j = qu[q]; for (const k of nb8(j)) if (comp[k] === id && d[k] < 0) { d[k] = d[j] + 1; qu.push(k); } }
    } else for (const j of list) d[j] = Math.hypot(j % W + 0.5 - rig.hx, Math.floor(j / W) + 0.5 - rig.hy);
    let lo = Infinity, hi = 0;
    for (const j of list) { lo = Math.min(lo, d[j]); hi = Math.max(hi, d[j]); }
    if (!src) for (const j of list) d[j] -= lo;
    comps.push({ id, n: list.length, maxD: src ? hi : hi - lo, ph: Math.floor(rng(seed * 29 + id * 31)() * (fl.every || 32)) });
  }
  return { ...fl, d, comp, comps, cells: cells.filter(j => comp[j] >= 0).length };
}
// 리본 물결(motion.mjs idleField 가 읽음): 줄 칸마다 거리 · 줄에 수직인 방향 · 그 줄의 길이 — 둘레 빈칸 2칸까지 넓힘(그림이 빈칸으로 움직여 나갈 수 있게)
export function ribbonOf(fl) {
  if (!fl || !fl.wave) return null;
  const d = new Float32Array(W * H).fill(-1), nx = new Float32Array(W * H), ny = new Float32Array(W * H), m = new Float32Array(W * H);
  const gxy = j => {   // 줄을 따라 거리가 느는 쪽(같은 줄 안 5×5 평균)
    const x0 = j % W, y0 = (j - x0) / W, c = fl.comp[j];
    let gx = 0, gy = 0;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const X = x0 + ox, Y = y0 + oy, k = Y * W + X; if ((ox || oy) && X >= 0 && Y >= 0 && X < W && Y < H && fl.comp[k] === c) { const w = (fl.d[k] - fl.d[j]) / (ox * ox + oy * oy); gx += w * ox; gy += w * oy; } }
    const L = Math.hypot(gx, gy) || 1; return [gx / L, gy / L];
  };
  const qu = [];
  for (let j = 0; j < W * H; j++) {
    if (fl.comp[j] < 0) continue;
    const [gx, gy] = gxy(j); d[j] = fl.d[j]; nx[j] = -gy; ny[j] = gx; m[j] = fl.comps[fl.comp[j]].maxD; qu.push(j);
  }
  const step = new Int8Array(W * H);
  for (let q = 0; q < qu.length; q++) { const j = qu[q]; if (step[j] >= 2) continue; for (const k of nb8(j)) if (d[k] < 0) { d[k] = d[j]; nx[k] = nx[j]; ny[k] = ny[j]; m[k] = m[j]; step[k] = step[j] + 1; qu.push(k); } }
  return { d, nx, ny, m, amp: fl.wave, k: fl.waveK ?? 0.35, freq: fl.waveF ?? 2 };
}
// 감도는 바람(2026-10-22 사용자 "바람 식물의 효과?가 그냥 실같은게 빠르게 지나가는데 그런거 말고 식물 주변에 바람이 도는것 같은게 좋아보여"):
//  몸 둘레 납작한 타원(화분과 같은 내려다본 각도) 둘~셋 — 높이 ys(몸 키의 몇 할 · 1.5보다 크면 판 칸) · 그 높이 몸 폭 + 여유(rx) · 납작함 flat
function orbitPlan(cv, rig, O) {
  const span = rig.yA - rig.yTop;
  const rings = (O.ys || [0.35, 0.68]).map((v, q) => {
    const y = v <= 1.5 ? rig.yTop + span * v : v, Y = Math.round(y);
    let l = W, r = -1;
    for (let yy = Y - 5; yy <= Y + 5; yy++) for (let x = 0; x < W; x++) if (yy >= 0 && yy < H && cv.cm[yy * W + x] >= 0) { if (x < l) l = x; if (x > r) r = x; }
    const cx = r >= 0 ? (l + r + 1) / 2 : rig.ax, half = r >= 0 ? (r - l + 1) / 2 : 14;
    const rx = Math.min(Math.min(cx, W - cx) - 2, (O.rx ? [].concat(O.rx)[q % [].concat(O.rx).length] : half + (O.pad ?? 5)));
    return { cx, cy: y, rx, ry: Math.max(2.5, rx * (O.flat ?? 0.26)) };
  });
  return { ...O, rings };
}

// f번째 장: im = 식물 층(색 바꾸기), at(p) = 쉬는 자리 p의 이 장 자리, put(x, y, 색) = 화분 위 입자, b = 이 장의 날숨 정도(0~1)
export function ambientFrame(f, plan, im, at, put, b = 0) {
  const { FR } = plan, srcIdx = im.src;
  // ── 광택: 흰 사선 띠가 몇 장에 걸쳐 가로지름(saint11 Shine) ──
  for (const sh of plan.shine || []) {
    const len = sh.len || 6, k = ((f - (sh.at ?? 8)) % FR + FR) % FR;
    if (k >= len) continue;
    const u = sh.u0 - 2 + (sh.u1 - sh.u0 + 4) * (k + 0.5) / len, wdt = k === 0 || k === len - 1 ? 0.6 : 1.4;
    for (let i = 0; i < W * H; i++) {
      const j = srcIdx[i];
      if (j < 0 || !sh.set.has(j)) continue;
      const d = Math.abs(j % W + Math.floor(j / W) - u);
      if (d <= wdt * 0.5) im.set(i % W, Math.floor(i / W), '#ffffff');
      else if (d <= wdt + 0.6) lighten(im, i % W, Math.floor(i / W), 0.55);
    }
  }
  // ── 보석: 면이 차례로 통째로 빛남, 가운데 장에서 가장 넓게(saint11 Gems) + 정점에 별 ──
  if (plan.gems && plan.gems.facets.length) {
    const g = plan.gems, k = ((f - (g.at ?? 30)) % FR + FR) % FR, n = g.facets.length, len = Math.max(6, n + 3);
    if (k < len) {
      const lit = new Set();
      g.facets.forEach((fc, q) => { const order = q / Math.max(1, n - 1) * (len - 3); if (k >= order && k < order + (k === Math.floor(len / 2) ? 3 : 2)) fc.forEach(j => lit.add(j)); });
      for (let i = 0; i < W * H; i++) { const j = srcIdx[i]; if (j >= 0 && lit.has(j)) lighten(im, i % W, Math.floor(i / W), 0.6); }
      if (k === Math.floor(len / 2)) { const c = g.cells[Math.floor(g.cells.length / 2)], p = at([c % W + 0.5, Math.floor(c / W) + 0.5]); star(put, p[0], p[1], 2); }
    }
  }
  // ── 반짝 별: 그 재질 위에 점 → 십자 → 큰 십자 → 십자 → 점 ──
  if (plan.twinkle && plan.twinkle.cells.length) {
    const tw = plan.twinkle, every = tw.every || 16;
    for (let q = 0; q < (tw.n || 2); q++) {
      const r = rng(plan.seed * 7 + q * 131), ph = Math.floor(r() * every), k = ((f + ph) % every + every) % every;
      if (k > 4) continue;
      const cycle = Math.floor((f + ph) / every), c = tw.cells[Math.floor(rng(plan.seed + q * 17 + cycle * 977)() * tw.cells.length)], p = at([c % W + 0.5, Math.floor(c / W) + 0.5]);
      star(put, p[0], p[1], [0, 1, 2, 1, 0][k]);
    }
  }
  // ── 물방울: 끝에 맺혀(넓게 → 길고 가늘게) 떨어지고 흙에 닿으면 튐(saint11 Water·Slime) ──
  if (plan.drips) {
    const dr = plan.drips, every = dr.every || 32;
    dr.tips.forEach(([tx, ty], q) => {
      const k = ((f + q * Math.floor(every / dr.tips.length)) % every + every) % every, o = at([tx + 0.5, ty + 0.5]);
      const X = Math.floor(o[0]), Y = Math.floor(o[1]) + 1, cHi = dr.hi || '#e8fbff', cBody = dr.body || '#8fd8f0', cEdge = dr.edge || '#4aa0d0';
      if (k < 8) { if (k >= 2) put(X, Y, cBody); if (k >= 5) put(X, Y + 1, cEdge); if (k >= 4) put(X, Y, cHi); }   // 맺힘: 점점 커짐
      else {
        const t = k - 8, yy = Y + 1 + 0.18 * t * t, ground = P.cy + 1;
        if (yy < ground) { put(X, Math.floor(yy), cBody); put(X, Math.floor(yy) - 1, cHi); }
        else if (yy < ground + 6) { const s = Math.floor(yy - ground); put(X - 1 - s, Math.floor(ground) - 1, cHi); put(X + 1 + s, Math.floor(ground) - 1, cHi); if (s < 2) put(X, Math.floor(ground), cEdge); }   // 튀김
      }
    });
  }
  // ── 속 거품: 그 재질 안 아래쪽에서 좌우로 흔들리며 올라가다 사라짐 ──
  if (plan.bubbles && plan.bubbles.cells.length) {
    const bu = plan.bubbles, cells = bu.cells, set = new Set(cells), ys = cells.map(c => Math.floor(c / W)), yb = Math.max(...ys), yt = Math.min(...ys);
    for (let q = 0; q < (bu.n || 3); q++) {
      const r = rng(plan.seed * 3 + q * 71), life = 24, ph = Math.floor(r() * life), k = ((f + ph) % life + life) % life, cyc = Math.floor((f + ph) / life);
      const r2 = rng(plan.seed + q * 13 + cyc * 541), bx = cells[Math.floor(r2() * cells.length)] % W;
      const y = yb - 1 - k * (yb - yt - 2) / life, x = bx + Math.sin(k * 0.6 + q) * 0.9, sx = Math.round(x), sy = Math.round(y);
      if (!set.has(sy * W + sx)) continue;
      const p = at([sx + 0.5, sy + 0.5]), X = Math.floor(p[0]), Y = Math.floor(p[1]);
      if (k < life - 2) { put(X, Y, bu.color || '#f2feff'); if (q === 0 && k > 6) put(X + 1, Y - 1, bu.color || '#f2feff'); }
    }
  }
  // ── 꽃잎·잎 날림: 몸에서 떨어져 사인 곡선으로 떠다니다 사라짐(바람이면 옆으로 빨리, 아니면 아래로 천천히) ──
  if (plan.petals) {
    const pe = plan.petals, every = pe.every || 64;
    for (let q = 0; q < (pe.n || 1); q++) {
      const k = ((f - (pe.at ?? 10) - q * Math.floor(every / (pe.n || 1))) % every + every) % every, life = pe.life || 40;
      if (k >= life) continue;
      const [sx, sy] = pe.from[q % pe.from.length], o = at([sx, sy]), t = k / life;
      const x = o[0] + (pe.vx ?? 0.2) * k + Math.sin(k * 0.35 + q) * (pe.sway ?? 1.5), y = o[1] + (pe.vy ?? 0.35) * k;
      if (y >= P.cy + 1 && !pe.vx) continue;
      const c = t < 0.7 ? pe.color : pe.dim || pe.color;
      if (pe.big) {   // 큰 잎(세 칸): 네 장마다 돌아가며 구름(가로 → 사선 → 세로 → 사선)
        const X = Math.floor(x), Y = Math.floor(y), sh = [[[0, 0], [1, 0], [-1, 0]], [[0, 0], [1, -1], [-1, 1]], [[0, 0], [0, -1], [0, 1]], [[0, 0], [1, 1], [-1, -1]]][Math.floor(k / 2) % 4];
        sh.forEach(([dx, dy], i) => put(X + dx, Y + dy, i === 1 ? pe.edge || c : c));
        continue;
      }
      put(Math.floor(x), Math.floor(y), c);
      if (k % 4 < 2) put(Math.floor(x) + 1, Math.floor(y), pe.edge || c);   // 뒤집히며 넓었다 좁았다
    }
  }
  // ── 바람결(2026-10-18 다시 — 사용자 "닌자바인 바람 효과가 별로": 전엔 짧은 선이 몸 위를 지나가 얼룩처럼 보였음):
  //   saint11 Wind = 빠르게 · 물결 · 고리, 공기는 입자로 보임 → 판을 가로지르는 긴 물결 줄(머리 흰색 · 몸 옅은 색 · 꼬리 흐림 · 군데군데 끊김)이
  //   식물 **뒤로** 지나가고(식물 칸은 안 칠함), 지나는 길 한 곳에서 작은 고리를 한 번 말았다 풀림. dir = 1 이면 왼쪽 → 오른쪽
  if (plan.wind) {
    const wd = plan.wind, n = wd.n || 2, every = wd.every || 30, sp = wd.speed || 7, dir = wd.dir ?? 1, life = Math.ceil((W + 34) / sp);
    const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || im.data[(y * W + x) * 4 + 3] >= 128;
    for (let q = 0; q < n; q++) {
      const off = q * Math.floor(every / n) + (wd.at ?? 0), k = ((f - off) % every + every) % every;
      if (k >= life) continue;
      const cyc = Math.floor((f - off) / every), r = rng(plan.seed * 5 + q * 97 + cyc * 313);
      const y0 = (wd.y0 ?? 10) + r() * ((wd.y1 ?? 60) - (wd.y0 ?? 10)), amp = 0.8 + r() * 1.2, ph = r() * 6.3, L = Math.min(wd.len || 20, 5 + k * 4);
      const head = dir > 0 ? -4 + k * sp : W + 4 - k * sp, col = wd.color || '#c9d3f0', dim = wd.dim || '#8f9ac0';
      const yAt = x => y0 + amp * Math.sin(x * 0.11 + ph);
      for (let s = 0; s < L; s++) {
        if (s % 7 === 5) continue;
        const x = Math.floor(head - s * dir), y = Math.floor(yAt(x));
        if (!solid(x, y)) put(x, y, s < 2 ? '#ffffff' : s < L * 0.65 ? col : dim);
      }
      const cx = W * (0.3 + r() * 0.4), past = (head - cx) * dir;
      if (past > 0 && past < L) {   // 고리: 머리가 지나간 자리에서 위로 말림 — 꼬리가 지나가면 풀림
        const R = 2.4, oy = yAt(cx) - R;
        for (let a = 0; a < 8; a++) { if (past > L * 0.6 && a % 2) continue; const ang = Math.PI / 2 + dir * a * 0.8, x = Math.floor(cx + Math.cos(ang) * R * dir), y = Math.floor(oy + Math.sin(ang) * R); if (!solid(x, y)) put(x, y, a < 2 ? '#ffffff' : col); }
      }
    }
  }
  // ── 전류(2026-10-18 볼트바인): 그 재질 칸을 따라 밝은 띠가 밑에서 위로 훑어 올라감(줄기를 타고 오르는 전기) — 끝나면 위 잎끝 벼락(electric bolts 의 f0 를 맞춤) ──
  if (plan.pulse && plan.pulse.cells.length) {
    const pu = plan.pulse, every = pu.every || 32, len = pu.len || 10, k = ((f - (pu.at ?? 0)) % every + every) % every;
    if (k < len) {
      const band = pu.yb - (pu.yb - pu.yt) * k / (len - 1);
      for (let i = 0; i < W * H; i++) {
        const j = srcIdx[i];
        if (j < 0 || !pu.set.has(j)) continue;
        const d = Math.abs(Math.floor(j / W) - band);
        if (d < 1.2) im.set(i % W, Math.floor(i / W), '#fff6c0');
        else if (d < 3) lighten(im, i % W, Math.floor(i / W), 0.5);
      }
    }
  }
  // ── 별빛 마법(2026-10-18 위저드벨 — 번개 속성 마법사): 지팡이 별이 맥동(점 → 십자 → 큰 십자 + 사선 빛살)하며 짧은 전기 불똥 셋,
  //   별가루가 흔들리며 떠올라 점 ↔ 십자로 반짝이다 보라로 흐려짐 ──
  if (plan.magic) {
    const mg = plan.magic, every = mg.every || 32, k = ((f - (mg.at0 ?? 6)) % every + every) % every, o = at(mg.at), X = Math.floor(o[0]), Y = Math.floor(o[1]);
    if (k < 6) {
      star(put, o[0], o[1], [0, 1, 2, 2, 1, 0][k]);
      if (k >= 2 && k <= 4) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let s = 2; s <= [0, 0, 4, 6, 6][k]; s++) { if (k === 4 && s < 4) continue; put(X + dx * s, Y + dy * s, s <= 3 ? '#fff7d0' : k === 4 ? '#b89ae8' : '#e8d8ff'); }   // 사선 빛살이 뻗었다가 끝만 남고 사라짐
      if (mg.sparks && k >= 1 && k <= 3) {   // saint11 불똥 세 장: 흰 → 노랑 → 주황, 짧아지며 튐
        const rs = rng(plan.seed * 23 + Math.floor((f - (mg.at0 ?? 6)) / every));
        for (let n = 0; n < 3; n++) { const a = -Math.PI / 2 + (rs() - 0.5) * 3.4, d = 2 + k * 1.6; put(Math.floor(o[0] + Math.cos(a) * d), Math.floor(o[1] + Math.sin(a) * d + 0.2 * k * k), k === 1 ? '#ffffff' : k === 2 ? '#ffd84a' : '#f5a83a'); }
      }
    }
    for (let q = 0; q < (mg.n || 4); q++) {
      const r = rng(plan.seed * 19 + q * 43), life = mg.life || 30, ph = Math.floor(r() * life), kk = ((f + ph) % life + life) % life, cyc = Math.floor((f + ph) / life), r2 = rng(plan.seed + q * 7 + cyc * 389);
      const sx = mg.at[0] + (r2() - 0.5) * (mg.spread || 10), sy = mg.at[1] + (r2() - 0.3) * 4, p = at([sx, sy]), t = kk / life;
      const x = p[0] + Math.sin(kk * 0.25 + q * 2) * 1.8, y = p[1] - kk * (mg.rise || 0.45);
      if (y < 1) continue;
      const c = t < 0.45 ? '#fff4c0' : t < 0.8 ? mg.color || '#d6b8ff' : mg.dim || '#9a7ad0', X2 = Math.floor(x), Y2 = Math.floor(y);
      put(X2, Y2, c);
      if (t < 0.6 && (kk + q) % 6 < 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(X2 + dx, Y2 + dy, c === '#fff4c0' ? '#f0e0ff' : c);   // 반짝: 십자
    }
  }
  // ── 소용돌이 고리: 구멍 둘레에서 3/4 원이 돌며 떠올라 흩어짐 ──
  for (const sw of plan.swirl ? [].concat(plan.swirl) : []) {
    const every = sw.every || 24;
    sw.at.forEach(([sx, sy], q) => {
      const k = ((f + q * 9) % every + every) % every, life = 14;
      if (k >= life) return;
      const o = at([sx, sy]), cx = o[0] + k * 0.35, cy = o[1] - k * 0.4, R = 2 + k * 0.18, rot = k * 0.7 + q;
      for (let a = 0; a < 7; a++) { if (k > 10 && a % 2) continue; const ang = rot + a * 0.75; put(Math.floor(cx + Math.cos(ang) * R), Math.floor(cy + Math.sin(ang) * R * 0.7), a < 2 ? '#f4f6ff' : sw.color || '#b9c4e8'); }
    });
  }
  // ── 포자: 갓 아래에서 천천히 떠오르며 흔들리고 흐려짐 + 날숨 때 한 번 퍼프 ──
  if (plan.spores) {
    const sp = plan.spores;
    for (let q = 0; q < (sp.n || 6); q++) {
      const r = rng(plan.seed * 11 + q * 59), life = 48, ph = Math.floor(r() * life), k = ((f + ph) % life + life) % life, [sx, sy] = sp.from[q % sp.from.length];
      const o = at([sx + (r() - 0.5) * (sp.spread || 20), sy]), x = o[0] + Math.sin(k * 0.18 + q * 1.7) * 2.2, y = o[1] - k * 0.45;
      if (y < 1) continue;
      put(Math.floor(x), Math.floor(y), k < 30 ? sp.color || '#fff1a8' : sp.dim || '#c9b56a');
      if (q % 3 === 0 && k < 14) put(Math.floor(x) + 1, Math.floor(y), sp.color || '#fff1a8');
    }
    if (b > 0.85) for (let q = 0; q < 5; q++) { const [sx, sy] = sp.from[q % sp.from.length], o = at([sx + (q - 2) * 4, sy + 1]); put(Math.floor(o[0]), Math.floor(o[1] + (b - 0.85) * 10), sp.color || '#fff1a8'); }
  }
  // ── 마그마 방울(2026-10-18 사용자 "화산은 머리에 연기나 마그마 방울이 종종 튀는 느낌"): 분화구에서 위로 튀어 포물선으로 떨어지며 식음(밝은 노랑 → 주황 → 짙은 빨강) ──
  if (plan.lava) {
    const lv = plan.lava, every = lv.every || 24;
    for (let q = 0; q < (lv.n || 2); q++) {
      const k = ((f - (lv.at ?? 6) - q * Math.floor(every / (lv.n || 2))) % every + every) % every, life = lv.life || 16;
      if (k >= life) continue;
      const cyc = Math.floor((f - q * 7) / every), r = rng(plan.seed * 17 + q * 71 + cyc * 131), [sx, sy] = lv.from[q % lv.from.length], o = at([sx, sy]);
      const vx = (r() - 0.5) * (lv.vx ?? 0.9), vy = -(lv.vy ?? 1.3) * (0.8 + r() * 0.4), x = o[0] + vx * k, y = o[1] + vy * k + 0.11 * k * k;
      const c = k < life * 0.35 ? lv.hot || '#fff0a0' : k < life * 0.7 ? lv.color || '#ff8a2a' : lv.dim || '#a8341c';
      put(Math.floor(x), Math.floor(y), c);
      if (k < 4) put(Math.floor(x), Math.floor(y) + 1, lv.color || '#ff8a2a');   // 막 튈 때 꼬리
    }
  }
  // ── 먼지: 아주 천천히 떠다니는 흙먼지 + 가끔 돌 부스러기가 떨어져 테에 튐 ──
  if (plan.dust) {
    const du = plan.dust;
    for (let q = 0; q < (du.n || 5); q++) {
      const r = rng(plan.seed * 13 + q * 37), x = 10 + r() * 76 + Math.sin((f + q * 11) * 0.06) * 3, y = 12 + r() * 52 + Math.cos((f + q * 7) * 0.05) * 2;
      if ((f + q * 5) % 22 < 16) put(Math.floor(x), Math.floor(y), du.color || '#c8b48c');
    }
    if (du.pebble) {
      const k = ((f - (du.pebble.at ?? 40)) % FR + FR) % FR, [sx, sy] = du.pebble.from, o = at([sx, sy]);
      if (k < 14) { const yy = o[1] + 0.12 * k * k; put(Math.floor(o[0] + k * 0.15), Math.floor(Math.min(yy, du.pebble.floor ?? P.cy)), du.pebble.color || '#9a7a52'); }
    }
  }
  flowFrame(f, plan, im, at, put);
}
// 그려진 무늬 흐름 · 감도는 바람 — ambientFrame 끝에서(식물 칸 색 · 입자)
export function flowFrame(f, plan, im, at, put) {
  const srcIdx = im.src;
  if (plan.flow && plan.flow.comps.length) {
    const fl = plan.flow, every = fl.every || 32, len = fl.len || 12, trail = fl.trail || 5, head = fl.head || '#ffffff', band = fl.comps.map(() => NaN);
    fl.comps.forEach((c, q) => { const k = ((f - (fl.sync ? 0 : c.ph) - (fl.at ?? 0)) % every + every) % every; if (k < len) band[q] = -2 + (c.maxD + 4) * k / (len - 1); });
    const cr = fl.crackle ? rng(plan.seed * 41 + f * 7) : null;
    for (let i = 0; i < W * H; i++) {
      const j = srcIdx[i]; if (j < 0) continue;
      const c = fl.comp[j]; if (c < 0) continue;
      const x = i % W, y = (i - x) / W, D = band[c];
      if (fl.dim) { const k4 = i * 4; for (let ch = 0; ch < 3; ch++) im.data[k4 + ch] = Math.round(im.data[k4 + ch] * (1 - fl.dim)); }   // 바탕을 살짝 눌러 흐르는 머리가 또렷이
      if (Number.isNaN(D)) continue;
      const dd = fl.d[j] - D;
      if (dd > -0.9 && dd < 0.9) { if (!cr || cr() < 0.75) im.set(x, y, cr && cr() < 0.3 ? fl.head2 || '#fff6c0' : head); }   // 머리(번개면 군데군데 끊겨 지직)
      else if (dd <= -0.9 && dd > -trail) lighten(im, x, y, (fl.glow ?? 0.6) * (1 + dd / trail));   // 꼬리
      else if (fl.ahead && dd >= 0.9 && dd < 2.4) lighten(im, x, y, fl.ahead);   // 머리 앞 옅은 빛
    }
  }
  // 감도는 바람(2026-10-23 사용자 '바람효과가 어색해 너무 일자로 빙빙돌아. 바람처럼 두께감이 변하면서 위아래로 꿀렁거리는 자연스러운 형태를 고안해봐'):
  //  고리 하나 = 서로 반대편에서 쫓아 도는 바람 줄기 둘(gusts). 줄기 = 머리(가늘고 흼) → 몸(초승달처럼 가운데가 굵고 가운데 밝은 줄) → 꼬리(가늘어지다 점으로 흩어짐),
  //  두께는 줄기마다 숨 쉬듯 굵어졌다 가늘어짐(thick). 길 = 고리가 시소처럼 기울었다 돌아옴(tilt) + 둘레를 따라 흐르는 물결(wave · waveK번) + 고리 전체 오르내림 +
  //  줄기마다 머리가 높은 비스듬함(lift) → 위아래로 꿀렁. 앞쪽 반 = 식물 앞(식물 위에선 식물 색과 섞어 비치게 — 가운데 줄 진하게, 가장자리 옅게),
  //  뒤쪽 반 = 식물 뒤. 주기는 모두 한 바퀴(FR장)의 정수배라 이음매 없음. 전엔 납작한 타원 한 줄 + 식물 위에선 가운데 줄만이라 '일자로 빙빙'
  if (plan.orbit) {
    const O = plan.orbit, FR = plan.FR, dir = O.dir ?? 1, col = O.color || '#e4ebfa', dim = O.dim || '#a2acd0', hi = O.hi || '#ffffff';
    const tau = 2 * Math.PI * f / FR, A = O.wave ?? 2, K = O.waveK ?? 2, M = O.waveM ?? 3, TW = O.thick ?? 3, NG = O.gusts ?? 2, GL = O.glen ?? (O.len ? O.len * 0.55 : 1.3), TL = O.tilt ?? 0.11, LIFT = O.lift ?? 4 + 2 * (O.rise || 0);
    const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    const solid = (x, y) => im.data[(y * W + x) * 4 + 3] >= 128;
    const draw = (x, y, c, front, k = 1) => {   // 식물 밖 = 그대로 · 식물 위 = 앞이면 식물 색과 k만큼 섞음, 뒤면 건너뜀
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      if (!solid(x, y)) return put(x, y, c);
      if (!front) return;
      const i = (y * W + x) * 4, a = rgb(c);
      put(x, y, hex([0, 1, 2].map(ch => im.data[i + ch] + (a[ch] - im.data[i + ch]) * k)));
    };
    O.rings.forEach((R, q) => {
      const loops = [].concat(O.loops || 1)[q % [].concat(O.loops || 1).length], c0 = at([R.cx, R.cy]), ph = q * 2.4;
      const tilt = TL * Math.sin(tau + ph), bob = 1.5 * Math.sin(tau + ph + 1.3);
      const P = (th, u) => [c0[0] + Math.cos(th) * R.rx, c0[1] + Math.sin(th) * R.ry + tilt * Math.cos(th) * R.rx + bob + A * Math.sin(K * th - dir * M * tau + ph) - LIFT * (0.5 - u)];
      for (let gi = 0; gi < NG; gi++) {
        const th0 = q * 2.1 + (O.at ?? 0) + dir * loops * tau - dir * gi * 2 * Math.PI / NG, Wt = TW * (0.66 + 0.34 * Math.sin(2 * tau + ph + gi * 2.2));
        const steps = Math.ceil(GL * Math.max(R.rx, R.ry) * 1.7);
        let prev = P(th0 + dir * 0.04, 0);
        for (let s = 0; s <= steps; s++) {
          const u = s / steps, th = th0 - dir * GL * u, p = P(th, u), front = Math.sin(th) > 0;
          let tx = p[0] - prev[0], ty = p[1] - prev[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; prev = p;
          if (u > 0.8 && s % 2) continue;   // 꼬리 = 점으로 흩어짐
          const w = Math.max(1, Math.round(Wt * Math.sin(Math.PI * Math.pow(u, 0.7)))), nx = -ty, ny = tx;   // 초승달: 머리 · 꼬리 한 칸, 앞쪽 1/3 이 가장 굵음
          for (let i = 0; i < w; i++) {
            const o = i - (w - 1) / 2, x = Math.round(p[0] + nx * o), y = Math.round(p[1] + ny * o), core = Math.abs(o) < 0.6, edge = w >= 2 && (i === 0 || i === w - 1);
            const c = u < 0.1 ? hi : u > 0.72 ? dim : core ? (w >= 3 ? hi : col) : edge ? dim : col;
            draw(x, y, c, front, u > 0.72 ? 0.4 : core ? 0.75 : 0.45);
          }
        }
        if (O.leaf && q === 0 && gi === 0) {   // 바람에 실려 함께 도는 잎 · 꽃잎 하나(머리보다 조금 뒤 · 줄기의 물결을 탐)
          const th = th0 - dir * GL * 0.35, pl = P(th, 0.35), x = Math.round(pl[0]), y = Math.round(pl[1]) - 2, front = Math.sin(th) > 0, flip = Math.floor(f / 3) % 2;
          draw(x, y, O.leaf.color, front); draw(x + (flip ? 1 : -1), y, O.leaf.edge || O.leaf.color, front); if (!flip) draw(x, y - 1, O.leaf.edge || O.leaf.color, front);
        }
      }
    });
  }
}
// 반짝 별: 0 = 점, 1 = 작은 십자, 2 = 큰 십자(가운데 흰색)
function star(put, x, y, s) {
  const X = Math.floor(x), Y = Math.floor(y);
  put(X, Y, '#ffffff');
  if (s >= 1) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(X + dx, Y + dy, s >= 2 ? '#fff7d0' : '#e8f4ff');
  if (s >= 2) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) put(X + dx, Y + dy, '#d8ecff');
}
