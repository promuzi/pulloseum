// 변환본 움직임: 숨쉬기(대기 동작) + 전기 효과. convert.mjs --anim 이 장마다 부른다.
// 근거 = Pedro Medeiros(saint11, 셀레스트 아트) 도트 강좌 "Character Idle"·"Electricity Tutorial"(saint11.art/blog/pixel-art-tutorials)
import { W, H } from './parts.mjs';
import { POT_GEO as P } from './pot3d.mjs';
import { rng, linePx } from './engine.mjs';

const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const clamp01 = v => Math.max(0, Math.min(1, v));

// 몸 뼈대 재기: 밑동 고정선·줄기 축·얼굴 가운데·머리 반지름·떠 있는 조각
export function idleRig(cv) {
  const on = i => cv.cm[i] >= 0;
  let yTop = H;
  for (let i = 0; i < W * H; i++) if (on(i)) { yTop = Math.floor(i / W); break; }
  const yA = Math.round(P.cy) - 2;   // 이 줄부터 아래(흙 근처)는 움직이지 않는다
  let sx = 0, sn = 0;
  for (let y = yA - 6; y < yA; y++) for (let x = 0; x < W; x++) if (on(y * W + x)) { sx += x + 0.5; sn++; }
  const ax = sn ? sx / sn : P.cx;
  let hx, hy, Rf;
  if (cv.eyeC && cv.eyeC.length) {
    hx = cv.eyeC.reduce((s, e) => s + e[0], 0) / cv.eyeC.length; hy = cv.eyeC.reduce((s, e) => s + e[1], 0) / cv.eyeC.length;
    Rf = cv.eyeC.length === 2 ? Math.hypot(cv.eyeC[1][0] - cv.eyeC[0][0], cv.eyeC[1][1] - cv.eyeC[0][1]) / 2 + 3 : 5;
  } else {   // 눈을 모르면 위쪽 45%의 무게중심
    let gx = 0, gy = 0, gn = 0;
    for (let y = yTop; y < yTop + (yA - yTop) * 0.45; y++) for (let x = 0; x < W; x++) if (on(y * W + x)) { gx += x + 0.5; gy += y + 0.5; gn++; }
    hx = gn ? gx / gn : ax; hy = gn ? gy / gn : yTop + 10; Rf = 4;
  }
  const row = Math.round(hy);
  let l = Math.round(hx), r = l;
  while (l > 0 && on(row * W + l - 1)) l--;
  while (r < W - 1 && on(row * W + r + 1)) r++;
  const Rh = Math.max(8, Math.min(16, (r - l + 1) / 2));
  // 8방향으로 이어진 덩어리: 가장 큰 것 = 몸, 몸에서 떨어진 작은 조각(50칸 이하) = 떠 있는 장식(번개 문양·불티 등)
  const comp = new Int16Array(W * H).fill(-1), sizes = [];
  for (let i = 0; i < W * H; i++) {
    if (!on(i) || comp[i] >= 0) continue;
    const id = sizes.length, st = [i];
    comp[i] = id;
    let n = 0;
    while (st.length) {
      const j = st.pop(), x = j % W, y = (j - x) / W;
      n++;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const X = x + ox, Y = y + oy, k = Y * W + X;
        if ((ox || oy) && X >= 0 && Y >= 0 && X < W && Y < H && on(k) && comp[k] < 0) { comp[k] = id; st.push(k); }
      }
    }
    sizes.push(n);
  }
  const main = sizes.indexOf(Math.max(...sizes)), bits = sizes.map((n, id) => id !== main && n <= 50);
  return { yTop, yA, ax, hx, hy, Rh, Rf, comp, main, bits };
}

// 숨쉬기 — saint11 "Character Idle"을 식물로 옮김:
//  · 숨을 내쉬면 아래로 내려앉고 옆으로 넓어진다(부피 유지 — "세로로만 움직이면 지루하다, 가로가 세로를 보완") → 줄기가 눌리며 머리가 1~2칸 내려앉고 머리 둘레가 1칸 벌어짐
//  · 팔을 벌리듯 잎이 바깥으로 벌어졌다 돌아옴, 얼굴 내용은 윤곽보다 한 박자 늦게, 좌우로는 한 바퀴에 한 번 기울기(밑동은 흙에 고정)
//  · 꽃잎·잎은 생긴 방향대로(사용자 2026-10-15 "형태에 따라"): 꽃잎은 머리에서 뻗은 방향에 수직으로, 잎은 줄기에서 뻗은 방향에 수직(위아래)으로
//    밑에서 끝으로 번지는 물결로 펄럭이고(끝일수록 크게·늦게), 꽃잎마다 박자가 다르다
// 값은 소수 칸 — 장마다 큰 원본에서 다시 줄이므로(rasterize) 정수 반올림 이음매가 없다. 얼굴만 정수 칸으로 통째로 옮겨 눈·입 모양이 흔들리지 않게 한다.
// t = 한 바퀴(0~1) 안 시각. 돌려주는 field(X, Y) → [dx, dy] = 판 칸 (X, Y)에 올 그림이 원래 판 자리에서 움직인 양, head = 얼굴 이동(정수)
export function idleField(rig, t, { bob = 2, squash = 1, open = 1, sway = 1, petal = 1, leaf = 1.2, breaths = 2, flutter = 2 } = {}) {
  const { yA, ax, hx, hy, Rh, Rf } = rig;
  const breath = u => (1 - Math.cos(2 * Math.PI * breaths * u)) / 2;   // 0 = 들숨(위), 1 = 날숨(아래) — 끝에서 머물고 가운데서 빠름
  const lean = u => Math.sin(2 * Math.PI * u);
  const qx = Math.round(sway * lean(t - 0.03)), qy = Math.round(bob * breath(t - 0.03)), b = breath(t);
  const field = (X, Y) => {
    const px = X + 0.5, py = Y + 0.5;
    if (py >= yA) return [0, 0];
    const wa = sm(yA, yA - 6, py), ws = sm(yA, hy + Rf + 2, py);   // 줄기(밑동 0 → 얼굴 아래 1)
    let dx = qx * ws, dy = qy * ws;
    const ddx = px - hx, ddy = py - hy, r = Math.hypot(ddx, ddy) || 1, face = 1 - sm(Rf, Rf + 3, r);
    // 머리 눌림: 얼굴 밖에서 옆으로 넓어지고 위가 눌림
    dx += Math.sign(ddx) * squash * b * sm(Rf, Rh, Math.abs(ddx)) * (1 - sm(Rh * 0.8, Rh * 1.3, Math.abs(ddy))) * (1 - face);
    dy += squash * b * clamp01(-ddy / Rh) * (1 - sm(Rh, Rh * 1.6, r)) * (1 - face);
    // 꽃잎: 머리 둘레 방향(접선)으로 펄럭임 — 머리 높이까지만, 꽃잎(각도)마다 박자 다르게
    const th = Math.atan2(ddy, ddx), lobe = 1.3 * Math.sin(2 * th + 0.7) + 0.8 * Math.sin(3 * th + 2.1);
    const tang = petal * sm(Rf + 1, Rh + 10, r) * (1 - sm(hy + Rh * 0.6, hy + Rh * 1.1, py)) * Math.sin(2 * Math.PI * flutter * t - 0.18 * (r - Rf) + lobe);
    dx += -ddy / r * tang; dy += ddx / r * tang;
    // 잎: 머리 아래, 줄기에서 바깥으로 뻗은 쪽 — 위아래 펄럭임(줄기 쪽 → 끝으로 번짐) + 날숨에 벌어짐(끝이 늦게)
    const wl = sm(hy + Rh * 0.6, hy + Rh * 1.1, py);
    if (wl > 0) {
      const u = Math.abs(px - ax), side = Math.sign(px - ax) || 1;
      dy += wl * leaf * sm(3, 14, u) * Math.min(1, u / 18) * Math.sin(2 * Math.PI * flutter * t - 0.22 * u + (side > 0 ? 0 : 2.2));
      dx += wl * side * open * breath(t - 0.05 * sm(4, 20, u)) * sm(4, 12, u);
    }
    return [dx * wa, dy * wa];
  };
  return { field, head: [qx, qy] };
}

// 불 — saint11 "Fire Tutorial": "불은 흐름" · 불꽃을 밑동(부피 유지, 모양만 바뀜)과 떨어져 나가는 입자로 나눔 · 물결은 밑에서 밝게 시작해 올라가며
//  뾰족하게 사라짐 · 가운데가 가장 빠름 · "같은 모양을 조금씩 틀리게 다시 그리기". 불티는 깜빡이며 조금씩 움직임.
// 쉬는 모습에서 불 재질 칸(위로 3칸 번진 무게) + 기둥마다 불 꼭대기 → 혀가 오르내리고(꼭대기일수록 크게), 옆으로 일렁이는 물결이 위로 흐른다.
export function fireRig(cv, isFire) {
  const F0 = new Float32Array(W * H), top = new Int16Array(W).fill(-1);
  for (let i = 0; i < W * H; i++) if (cv.cm[i] >= 0 && isFire[cv.cm[i]]) F0[i] = 1;
  const F1 = new Float32Array(W * H), wF = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = 0; k <= 3; k++) if (y + k < H) v = Math.max(v, F0[(y + k) * W + x] * (1 - k * 0.2)); F1[y * W + x] = v; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) wF[y * W + x] = (F1[y * W + Math.max(0, x - 1)] + 2 * F1[y * W + x] + F1[y * W + Math.min(W - 1, x + 1)]) / 4;
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (F0[y * W + x]) { top[x] = y; break; }
  // 불 혀 끝: 양옆 기둥보다 높은 꼭대기(불티가 떨어져 나가는 자리)
  const tips = [];
  for (let x = 1; x < W - 1; x++) if (top[x] >= 0 && (top[x - 1] < 0 || top[x] <= top[x - 1]) && (top[x + 1] < 0 || top[x] < top[x + 1])) tips.push([x + 0.5, top[x]]);
  return { wF, top, tips, n: F0.reduce((a, v) => a + v, 0) };
}
export function fireField(fr, tf, { up = 2, side = 0.8 } = {}) {
  const { wF, top } = fr;
  return (X, Y) => {
    const w = wF[Y * W + X];
    if (!w || top[X] < 0) return [0, 0];
    const tip = 1 - clamp01((Y - top[X]) / 8);   // 꼭대기 1 → 8칸 아래 0
    const dy = -up * w * tip * (0.5 + 0.5 * Math.sin(2 * Math.PI * 6 * tf + X * 0.8 + 1.3 * Math.sin(X * 0.31 + 2 * Math.PI * tf)));
    const dx = side * w * (0.3 + tip) * Math.sin(2 * Math.PI * 4 * tf + Y * 0.7 + X * 0.2);
    return [dx, dy];
  };
}
// 불티: 불 혀 끝에서 떨어져 올라가며 노랑 → 주황 → 빨강으로 꺼짐(8장), 끝마다 다른 박자
export function emberFrame(f, fr, at, paint, { seed = 3, every = 10, life = 8, max = 6 } = {}) {
  const r = rng(seed), tips = fr.tips.filter((_, i) => i % Math.max(1, Math.ceil(fr.tips.length / max)) === 0);
  tips.forEach(([x, y]) => {
    const ph = Math.floor(r() * every), drift = (r() - 0.5) * 0.8;
    const k = ((f + ph) % every + every) % every;
    if (k >= life) return;
    const o = at([x, y]), px = o[0] + drift * k + Math.sin(k * 1.7 + ph) * 0.6, py = o[1] - 1 - k * 1.2;
    if (py < 0) return;
    paint(Math.floor(px), Math.floor(py), k < 3 ? '#ffe066' : k < 6 ? '#fcae3a' : '#e8642a');
    if (k === 0) paint(Math.floor(px), Math.floor(py) + 1, '#fcae3a');   // 갓 떨어진 불티는 길쭉하게
  });
}

// 끝점(꽃잎·잎 끝): 몸 윤곽 칸 중 머리 가운데에서 가장 먼 칸을 각도 24칸마다 고르고, 양옆 칸보다 멀리 튀어나온 것만
export function findTips(cv, rig, { minR = 10 } = {}) {
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && cv.cm[y * W + x] >= 0;
  const N = 24, best = Array(N).fill(null);
  for (let y = 0; y < rig.yA - 4; y++) for (let x = 0; x < W; x++) {
    if (!on(x, y) || rig.comp[y * W + x] !== rig.main) continue;
    if (on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)) continue;
    const dx = x + 0.5 - rig.hx, dy = y + 0.5 - rig.hy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const k = Math.floor((a + Math.PI) / (2 * Math.PI) * N) % N;
    if (!best[k] || r > best[k].r) best[k] = { x: x + 0.5, y: y + 0.5, r, a };
  }
  return best.filter((b, k) => b && b.r >= minR && b.r >= (best[(k + N - 1) % N]?.r ?? 0) && b.r >= (best[(k + 1) % N]?.r ?? 0));
}

// 1칸 선 잇기 + L자 모서리 가운데 칸 빼기(도트 선을 깔끔하게)
function strokePx(pts) {
  const px = [];
  for (let i = 1; i < pts.length; i++) for (const p of linePx(pts[i - 1], pts[i])) { const q = px[px.length - 1]; if (!q || q[0] !== p[0] || q[1] !== p[1]) px.push(p); }
  const out = [];
  for (let i = 0; i < px.length; i++) {
    const a = out[out.length - 1], c = px[i + 1];
    if (a && c && Math.abs(a[0] - c[0]) === 1 && Math.abs(a[1] - c[1]) === 1) continue;
    out.push(px[i]);
  }
  return out;
}
// 날카로운 각의 지그재그 꼭짓점(벼락 줄기): 나아가는 방향으로 n마디, 마디마다 좌우로 번갈아 꺾임
function zigzag(o, ang, len, r, n = 4) {
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, pts = [[o[0], o[1]]];
  let side = r() < 0.5 ? 1 : -1;
  for (let i = 1; i < n; i++) { const s = (i + (r() - 0.5) * 0.3) / n, a = side * (1.4 + r() * 2.2); pts.push([o[0] + ux * len * s + vx * a, o[1] + uy * len * s + vy * a]); side = -side; }
  pts.push([o[0] + ux * len, o[1] + uy * len]);
  return pts;
}
// 굵기 있는 지그재그 칠하기: 길이 비율 s의 반폭 hw(s)(끝은 가늘고 가운데 굵게), 안쪽 = core, 바깥 = edge, keep(s)로 조각만 남기기
function fillBolt(paint, pts, hw, core, edge, keep = () => true, inner = 0.9) {
  const seg = [], cum = [0];
  for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(L); cum.push(cum[i - 1] + L); }
  const tot = cum[cum.length - 1] || 1, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  for (let y = Math.floor(Math.min(...ys) - 3); y <= Math.max(...ys) + 3; y++) for (let x = Math.floor(Math.min(...xs) - 3); x <= Math.max(...xs) + 3; x++) {
    let bd = 9, bs = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
      const u = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / L2)), d = Math.hypot(x + 0.5 - ax - dx * u, y + 0.5 - ay - dy * u);
      if (d < bd) { bd = d; bs = (cum[i - 1] + seg[i - 1] * u) / tot; }
    }
    const h = hw(bs);
    if (bd <= h && keep(bs)) paint(x, y, bd <= h - inner ? core : edge);
  }
}

// 전기 — saint11 "Electricity Tutorial":
//  "전기 움직임은 빨라야 한다"(한 장 0.05초) · "늘 깜빡이게"(빈 장을 섞음) · "호·벼락·연기를 섞는다"
//  벼락(bolt): ① 첫 충격 = 날카로운 각의 굵은 지그재그 ② 하얗게(밝게), 모양은 다르게 ③ 한 장 쉼 ④ 첫 장 모양에서 조각만 남겨 흐려짐 ⑤ 쉼 ⑥⑦ 빠르게 흩어짐
//  호(arc): 가는 구불 선이 움직이며 흩어짐 — 입자는 너무 많지 않게, 사이에 빈 장
//  불똥: 세 장이면 끝 · 대비 장: 번쩍이는 장에 식물도 밝게
// 색은 컨셉의 번개 문양(흰 속 + 연노랑 + 노랑 빛)을 따른다
const EC = { white: '#ffffff', pale: '#fff4b0', yel: '#ffd84a', amber: '#f5a83a', ember: '#c8702c' };
export function electricPlan(rig, tips, { seed = 7, frames = 64, bolts = [4, 36], arcs = [15, 26, 47, 57] } = {}) {
  const r = rng(seed), up = tips.filter(t => t.y < rig.hy + rig.Rh * 0.5), pool = up.length ? up : tips;
  const byA = [...tips].sort((a, b) => a.a - b.a), plan = [];
  const pick = () => pool[Math.floor(r() * pool.length)];
  bolts.forEach((f0, k) => { const t = pool.length > 1 && k > 0 ? pool[(pool.indexOf(plan[0].tip) + 1 + Math.floor(r() * (pool.length - 1))) % pool.length] : pick(); plan.push({ kind: 'bolt', f0, tip: t, ang: t.a + (r() - 0.5) * 0.5, len: 11 + r() * 5, seed: Math.floor(r() * 1e6) }); });
  arcs.forEach(f0 => {
    if (byA.length < 2) return;
    const i = Math.floor(r() * byA.length), a = byA[i], b = byA[(i + 1) % byA.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) > 26) return;   // 너무 먼 두 끝은 잇지 않음
    plan.push({ kind: 'arc', f0, a, b, seed: Math.floor(r() * 1e6) });
  });
  return { plan, frames, hc: [rig.hx, rig.hy], flicker: rig.bits.map(isBit => isBit ? Math.floor(r() * 13) : -1) };
}
// f번째 장의 전기: paint(x, y, 색)으로 칠하고, 번쩍임 자리(flash)와 떠 있는 조각 상태(bitState: 0 보임, 1 숨김, 2 하얗게)를 돌려준다
// at(p) = 원래 자리 p가 이 장에서 옮겨 간 자리(숨쉬기를 따라감)
export function electricFrame(f, ep, at, paint) {
  const flash = [];
  for (const e of ep.plan) {
    const k = (f - e.f0 + ep.frames) % ep.frames;
    if (e.kind === 'bolt') {
      if (k > 7) continue;
      const o = at([e.tip.x, e.tip.y]), r1 = rng(e.seed), first = zigzag(o, e.ang, e.len, r1), hw = s => 0.6 + 1.25 * Math.sin(Math.PI * Math.min(1, s * 1.1)) ** 0.6;
      if (k === 0) fillBolt(paint, first, hw, EC.pale, EC.yel);                                                      // ① 첫 충격
      if (k === 1) { fillBolt(paint, zigzag(o, e.ang + 0.12, e.len + 2, rng(e.seed + 1)), s => hw(s) * 0.9, EC.white, EC.pale, () => true, 0.5); flash.push({ x: o[0], y: o[1], r: 9 }); }   // ② 하얗게·모양 바꿔 + 대비
      if (k === 3) fillBolt(paint, first, s => hw(s) * 0.55, EC.yel, EC.yel, s => (s > 0.08 && s < 0.3) || (s > 0.45 && s < 0.6) || (s > 0.74 && s < 0.9));   // ④ 첫 장에서 조각만
      if (k === 5 || k === 6) {   // ⑥⑦ 흩어짐: 조각 몇 개가 바깥으로 밀려나며 작아짐
        const ux = Math.cos(e.ang), uy = Math.sin(e.ang), sh = k === 5 ? 1.5 : 3;
        for (const s of k === 5 ? [0.3, 0.62, 0.92] : [0.5, 0.95]) {
          const i = Math.min(first.length - 2, Math.floor(s * (first.length - 1))), p = first[i], q = first[i + 1], m = [p[0] + (q[0] - p[0]) * 0.5 + ux * sh, p[1] + (q[1] - p[1]) * 0.5 + uy * sh];
          paint(Math.floor(m[0]), Math.floor(m[1]), k === 5 ? EC.amber : EC.ember);
          if (k === 5) paint(Math.floor(m[0] + Math.sign(q[0] - p[0])), Math.floor(m[1] + Math.sign(q[1] - p[1])), EC.amber);
        }
      }
      if (k >= 1 && k <= 3) {   // 불똥 세 장: 첫 충격 끝에서 사방으로 튀며 짧아짐
        const rs = rng(e.seed + 7);
        for (let n = 0; n < 3; n++) {
          const a = e.ang + (rs() - 0.5) * 2.6, v = 2.2 + rs() * 1.2, d = v * k, tip = [o[0] + Math.cos(a) * d, o[1] + Math.sin(a) * d + 0.25 * k * k];
          const tail = [tip[0] - Math.cos(a) * (3 - k), tip[1] - Math.sin(a) * (3 - k)];
          for (const [x, y] of strokePx([tail, tip])) paint(x, y, k === 1 ? EC.white : k === 2 ? EC.yel : EC.amber);
        }
      }
    } else {
      if (k > 4) continue;
      const a = at([e.a.x, e.a.y]), b = at([e.b.x, e.b.y]), hc = at(ep.hc);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], out = Math.sign((mid[0] - hc[0]) * (b[1] - a[1]) - (mid[1] - hc[1]) * (b[0] - a[0])) || 1;   // 머리 반대쪽으로 불룩
      const curve = (sd, bulge) => {   // a→b 구불 선: 바깥으로 불룩 + 잔물결
        const r2 = rng(sd), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * out, ny = dx / L * out, n = Math.ceil(L), w = 1 + Math.floor(r2() * 2), ph = r2() * 6.3, am = 0.8 + r2() * 1.2, pts = [];
        for (let i = 0; i <= n; i++) { const s = i / n, off = bulge * Math.sin(Math.PI * s) + am * Math.sin(2 * Math.PI * w * s + ph) * Math.sin(Math.PI * s); pts.push([a[0] + dx * s - nx * off, a[1] + dy * s - ny * off]); }
        return strokePx(pts);
      };
      if (k === 0) for (const [x, y] of curve(e.seed, 2.5)) paint(x, y, EC.white);
      if (k === 1) for (const [x, y] of curve(e.seed + 1, 3.5)) paint(x, y, EC.pale);
      if (k === 3) curve(e.seed + 1, 4.5).forEach(([x, y], i) => { if (Math.floor(i / 2) % 2 === 0) paint(x, y, EC.yel); });   // 끊긴 선으로 흩어짐
      if (k === 4) curve(e.seed + 2, 5.5).forEach(([x, y], i, all) => { if (i === Math.floor(all.length * 0.3) || i === Math.floor(all.length * 0.7)) paint(x, y, EC.amber); });
    }
  }
  // 떠 있는 조각(컨셉의 번개 문양)도 늘 깜빡이게: 조각마다 다른 박자로 가끔 숨고, 가끔 하얗게
  const bitState = ep.flicker.map(ph => ph < 0 ? 0 : ((f + ph) % 13 === 0 || (f + ph) % 13 === 6) ? 1 : (f + ph) % 9 === 0 ? 2 : 0);
  return { flash, bitState };
}
