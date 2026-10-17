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
  return plan;
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
      put(Math.floor(x), Math.floor(y), c);
      if (k % 4 < 2) put(Math.floor(x) + 1, Math.floor(y), pe.edge || c);   // 뒤집히며 넓었다 좁았다
    }
  }
  // ── 바람결: 옅은 선이 빠르게 지나가며 끝이 말림(saint11 Wind: 빠르게·지그재그·고리, 공기는 입자로 보임) ──
  if (plan.wind) {
    const wd = plan.wind, every = wd.every || 20;
    for (let q = 0; q < (wd.n || 2); q++) {
      const k = ((f - q * Math.floor(every / (wd.n || 2))) % every + every) % every, life = 9;
      if (k >= life) continue;
      const cyc = Math.floor((f - q * Math.floor(every / (wd.n || 2))) / every), r = rng(plan.seed * 5 + q * 97 + cyc * 313);
      const y0 = (wd.y0 ?? 10) + r() * ((wd.y1 ?? 60) - (wd.y0 ?? 10)), head = -8 + k * 13, L = 8 + Math.floor(r() * 6), col = wd.color || '#c9d3f0';
      for (let s = 0; s < L; s++) { const x = head - s, y = y0 + Math.sin((x + cyc * 7) * 0.25) * 1.2; if (x >= 0 && x < W) put(Math.floor(x), Math.floor(y), s < 2 ? '#eef2ff' : col); }
      if (k >= 5) for (let a = 0; a < 5; a++) put(Math.floor(head + 1 + Math.cos(a * 1.2) * 2), Math.floor(y0 - 2 + Math.sin(a * 1.2) * 2), col);   // 끝 고리
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
}
// 반짝 별: 0 = 점, 1 = 작은 십자, 2 = 큰 십자(가운데 흰색)
function star(put, x, y, s) {
  const X = Math.floor(x), Y = Math.floor(y);
  put(X, Y, '#ffffff');
  if (s >= 1) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(X + dx, Y + dy, s >= 2 ? '#fff7d0' : '#e8f4ff');
  if (s >= 2) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) put(X + dx, Y + dy, '#d8ecff');
}
