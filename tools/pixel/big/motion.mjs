// 변환본 움직임: 숨쉬기(대기 동작) + 전기 효과. convert.mjs --anim 이 장마다 부른다.
// 근거 = Pedro Medeiros(saint11, 셀레스트 아트) 도트 강좌 "Character Idle"·"Electricity Tutorial"(saint11.art/blog/pixel-art-tutorials)
import { W, H } from './parts.mjs';
import { POT_GEO as P } from './pot3d.mjs';
import { rng, linePx } from './engine.mjs';
import { strokePx, zigzag, fillBolt } from './fxcore.mjs';
export { strokePx, zigzag, fillBolt };   // 정의는 fxcore.mjs(브라우저 게임과 함께 씀)

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
export function idleField(rig, t, { bob = 2, squash = 1, open = 1, sway = 1, petal = 1, leaf = 1.2, breaths = 2, flutter = 2 } = {}) {   // rig.ribbon(있으면) = 그려진 리본 물결
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
    // 그려진 리본 · 바람결(2026-10-22 fx.mjs flow.wave — rig.ribbon): 붙은 쪽은 그대로, 줄을 따라 끝으로 번지는 물결(줄에 수직 · 끝일수록 크게)
    const RB = rig.ribbon, ri = Y * W + X;
    if (RB && X >= 0 && Y >= 0 && X < W && Y < H && RB.d[ri] >= 0) {
      const dd = RB.d[ri], s = RB.amp * sm(1, 6, dd) * Math.min(1, dd / Math.max(6, RB.m[ri])) * Math.sin(2 * Math.PI * RB.freq * t - RB.k * dd);
      dx += RB.nx[ri] * s; dy += RB.ny[ri] * s;
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

// 공격 몸놀림: 얼굴(머리) 이동 qx·qy(정수), 눌림 sq(+ 눌림·옆으로 넓어짐, − 늘어남), 먼 끝은 앞 장 이동(px·py)에 끌려 늦게(뒤따름)
// 줄기는 밑동(0)에서 얼굴 아래(1)까지 부드럽게 휘고 밑동은 흙에 고정 — 큰 원본에서 다시 줄이므로 소수 칸도 된다
export function attackField(rig, { qx = 0, qy = 0, sq = 0, px = qx, py = qy } = {}) {
  const { yA, hx, hy, Rh, Rf } = rig;
  return (X, Y) => {
    const ppx = X + 0.5, ppy = Y + 0.5;
    if (ppy >= yA) return [0, 0];
    const wa = sm(yA, yA - 6, ppy), ws = sm(yA, hy + Rf + 2, ppy), ddx = ppx - hx, ddy = ppy - hy, r = Math.hypot(ddx, ddy) || 1;
    const far = sm(Rh, Rh + 14, r) * 0.6, face = 1 - sm(Rf, Rf + 3, r);
    let dx = (qx + (px - qx) * far) * ws, dy = (qy + (py - qy) * far) * ws;
    dy += sq * clamp01(-ddy / Rh) * (1 - sm(Rh, Rh * 1.6, r)) * (1 - face);
    dx += Math.sign(ddx) * sq * 0.6 * sm(Rf, Rh, Math.abs(ddx)) * (1 - sm(Rh * 0.8, Rh * 1.3, Math.abs(ddy))) * (1 - face);
    return [dx * wa, dy * wa];
  };
}


// 전기 — saint11 "Electricity Tutorial":
//  "전기 움직임은 빨라야 한다"(한 장 0.05초) · "늘 깜빡이게"(빈 장을 섞음) · "호·벼락·연기를 섞는다"
//  벼락(bolt): ① 첫 충격 = 날카로운 각의 굵은 지그재그 ② 하얗게(밝게), 모양은 다르게 ③ 한 장 쉼 ④ 첫 장 모양에서 조각만 남겨 흐려짐 ⑤ 쉼 ⑥⑦ 빠르게 흩어짐
//  호(arc): 가는 구불 선이 움직이며 흩어짐 — 입자는 너무 많지 않게, 사이에 빈 장
//  불똥: 세 장이면 끝 · 대비 장: 번쩍이는 장에 식물도 밝게
// 색은 컨셉의 번개 문양(흰 속 + 연노랑 + 노랑 빛)을 따른다
const EC = { white: '#ffffff', pale: '#fff4b0', yel: '#ffd84a', amber: '#f5a83a', ember: '#c8702c' };
// opt(convert.mjs FX[키].electric 이 객체일 때 — 2026-10-18 사용자 "번개 효과 내는 애들 이펙트가 별로": 아무 잎 끝에서 빈 곳으로 쏘던 것 → 종마다 번개가 나오는 자리를 정함)
//  bolts = [{ at: [x, y], ang: 도(0 = 오른쪽, -90 = 위), len, f0 }] — 그 자리에서만 벼락(없으면 예전처럼 위쪽 끝 아무 데서나)
//  crawl = [{ box: [x0, y0, x1, y1], at: [장…], len }] — 그 상자 안 몸 윤곽을 타고 전기가 기어감(방망이 · 꽃잎 둘레)
//  chain = [{ pts: [[x, y]…], at: [장…] }] — 점에서 점으로 차례로 튀는 번개 + 맞은 자리 번쩍(북 → 북)
//  arcs = false 면 끝과 끝을 잇는 호를 안 그림
export function electricPlan(rig, tips, { seed = 7, frames = 64, bolts = [4, 36], arcs = [15, 26, 47, 57], crawl = [], chain = [], zap = [] } = {}) {
  const r = rng(seed), up = tips.filter(t => t.y < rig.hy + rig.Rh * 0.5), pool = up.length ? up : tips;
  const byA = [...tips].sort((a, b) => a.a - b.a), plan = [];
  const pick = () => pool[Math.floor(r() * pool.length)];
  bolts.forEach((b, k) => {
    if (typeof b === 'object') { plan.push({ kind: 'bolt', f0: b.f0, tip: { x: b.at[0], y: b.at[1] }, ang: b.ang * Math.PI / 180, len: b.len || 10, seed: Math.floor(r() * 1e6) }); return; }
    const t = pool.length > 1 && k > 0 ? pool[(pool.indexOf(plan[0].tip) + 1 + Math.floor(r() * (pool.length - 1))) % pool.length] : pick(); plan.push({ kind: 'bolt', f0: b, tip: t, ang: t.a + (r() - 0.5) * 0.5, len: 11 + r() * 5, seed: Math.floor(r() * 1e6) });
  });
  if (arcs) arcs.forEach(f0 => {
    if (byA.length < 2) return;
    const i = Math.floor(r() * byA.length), a = byA[i], b = byA[(i + 1) % byA.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) > 26) return;   // 너무 먼 두 끝은 잇지 않음
    plan.push({ kind: 'arc', f0, a, b, seed: Math.floor(r() * 1e6) });
  });
  if (crawl.length) {
    const path = contourOut(rig);
    for (const c of crawl) {
      const [x0, y0, x1, y1] = c.box, runs = [];
      let cur = null;
      for (const p of path) { const inb = p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1; if (inb) { if (!cur) runs.push(cur = []); cur.push(p); } else cur = null; }
      if (runs.length > 1 && path.length && runs[0][0] === path[0] && runs[runs.length - 1][runs[runs.length - 1].length - 1] === path[path.length - 1]) runs[0] = runs.pop().concat(runs[0]);   // 윤곽은 고리 — 끝과 처음이 이어짐
      const len = c.len || 9, ok = runs.filter(u => u.length >= len + 6);
      if (!ok.length) continue;
      for (const f0 of c.at) { const u = ok[Math.floor(r() * ok.length)]; plan.push({ kind: 'crawl', f0, run: u, s: Math.floor(r() * (u.length - len - 6)), len, seed: Math.floor(r() * 1e6) }); }
    }
  }
  for (const c of chain) for (const [n, f0] of c.at.entries()) plan.push({ kind: 'chain', f0, pts: n % 2 ? [...c.pts].reverse() : c.pts, edge: c.edge ?? 4, bulge: c.bulge ?? 4, ring: c.ring ?? 7, seed: Math.floor(r() * 1e6) });   // 두 번째는 거꾸로 돌아옴
  // zap = 상자 안 윤곽의 두 점을 잇는 지그재그가 몸 위를 가로지름(원화의 방망이를 휘감은 번개처럼) — 한 번에 n줄
  if (zap.length) {
    const path = contourOut(rig);
    for (const z of zap) {
      const [x0, y0, x1, y1] = z.box, cs = path.filter(p => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1);
      if (cs.length < 4) continue;
      for (const f0 of z.at) for (let q = 0; q < (z.n || 2); q++) {
        const a = cs[Math.floor(r() * cs.length)], far = cs.filter(b => { const d = Math.hypot(b.x - a.x, b.y - a.y); return d >= (z.min || 7) && d <= (z.max || 15); });
        if (far.length) plan.push({ kind: 'zap', f0: f0 + q, a, b: far[Math.floor(r() * far.length)], seed: Math.floor(r() * 1e6) });
      }
    }
  }
  return { plan, frames, hc: [rig.hx, rig.hy], flicker: rig.bits.map(isBit => isBit ? Math.floor(r() * 13) : -1) };
}

// 몸(가장 큰 덩어리) 바깥 윤곽을 무어 이웃 따라가기로 시계 방향 차례대로 → 칸마다 바로 바깥의 빈 칸(가장 '바깥다운' 4방향 이웃) { x, y, ox, oy }
//  ox·oy = 몸에서 바깥으로 향하는 방향(전기가 윤곽에서 한 칸 더 튀어나갈 때)
export function contourOut(rig) {
  const body = (x, y) => x >= 0 && y >= 0 && x < W && y < H && rig.comp[y * W + x] === rig.main, any = (x, y) => x >= 0 && y >= 0 && x < W && y < H && rig.comp[y * W + x] >= 0;
  let s = -1;
  for (let i = 0; i < W * H && s < 0; i++) if (rig.comp[i] === rig.main) s = i;
  if (s < 0) return [];
  const D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], x0 = s % W, y0 = (s - x0) / W, cells = [[x0, y0]];
  let px = x0, py = y0, bx = x0 - 1, by = y0;
  for (let it = 0; it < 4 * W * H; it++) {
    let bi = D.findIndex(([dx, dy]) => px + dx === bx && py + dy === by), moved = false;
    if (bi < 0) bi = 4;
    for (let t = 1; t <= 8; t++) {
      const i = (bi + t) % 8, nx = px + D[i][0], ny = py + D[i][1];
      if (body(nx, ny)) { const j = (bi + t - 1) % 8; bx = px + D[j][0]; by = py + D[j][1]; px = nx; py = ny; moved = true; break; }
    }
    if (!moved || (px === x0 && py === y0)) break;
    cells.push([px, py]);
  }
  const out = [];
  for (const [x, y] of cells) {
    let best = null, bs = -1;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || any(nx, ny)) continue;
      let e = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (!any(nx + ox, ny + oy)) e++;
      if (e > bs) { bs = e; best = [nx, ny, dx, dy]; }
    }
    if (!best) continue;
    const q = out[out.length - 1];
    if (q && q.x === best[0] + 0.5 && q.y === best[1] + 0.5) continue;
    out.push({ x: best[0] + 0.5, y: best[1] + 0.5, ox: best[2], oy: best[3] });
  }
  return out;
}
// 두 점 사이 구불 번개 꼭짓점: 4칸마다 좌우로 번갈아 1~2.5칸 꺾임
function jag(a, b, r) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / 4)), nx = -dy / L, ny = dx / L, pts = [a];
  let side = r() < 0.5 ? 1 : -1;
  for (let i = 1; i < n; i++) { const s = i / n, o = side * (1 + r() * 1.5); pts.push([a[0] + dx * s + nx * o, a[1] + dy * s + ny * o]); side = -side; }
  pts.push(b);
  return pts;
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
    } else if (e.kind === 'crawl') {
      // 윤곽 타고 기어가기(saint11 "호는 가는 구불 선이 움직이며 흩어짐 · 늘 깜빡이게"): 흰 줄 → 옅은 노랑으로 앞으로 → 빈 장 → 끊긴 노랑 → 주황 점, 마디마다 한 칸씩 바깥으로 튐
      if (k > 4 || k === 2) continue;
      const u = e.run, rz = rng(e.seed + k * 31), from = e.s + [0, 3, 0, 6, 9][k], n = [e.len, e.len, 0, e.len - 2, e.len - 4][k];
      for (let j = 0; j < n; j++) {
        const c = u[Math.min(u.length - 1, from + j)], kick = (j % 4 === 2 && rz() < 0.8) ? 1 : 0, o = at([c.x + c.ox * kick, c.y + c.oy * kick]);
        if (k === 3 && j % 3 === 2) continue;
        if (k === 4 && j % 2) continue;
        paint(Math.floor(o[0]), Math.floor(o[1]), k === 0 ? (j < 2 || j > n - 3 ? EC.pale : EC.white) : k === 1 ? (j % 3 ? EC.pale : EC.yel) : k === 3 ? EC.yel : EC.amber);
      }
      if (k === 1) {   // 앞끝에서 불똥 하나가 바깥으로
        const c = u[Math.min(u.length - 1, from + n - 1)], o = at([c.x + c.ox * 2, c.y + c.oy * 2]);
        paint(Math.floor(o[0]), Math.floor(o[1]), EC.white);
      }
      if (k === 0) { const c = u[Math.min(u.length - 1, e.s + (e.len >> 1))]; flash.push({ x: c.x, y: c.y, r: 5 }); }
    } else if (e.kind === 'chain') {
      // 점 → 점 차례로(두 장에 한 칸): 북 가장자리에서 가장자리로, 몸 바깥쪽으로 불룩한 흰 구불 줄 → 모양 바꿔 옅은 노랑 + 맞은 북 둘레 고리
      //  → 마지막 북에서 별 + 크게 퍼지는 끊긴 고리(북 얼굴이 이미 밝아 번쩍임만으론 안 보여 둘레에 고리를 그림)
      const hop = Math.floor(k / 2), ph = k % 2, N = e.pts.length - 1, hc = at(ep.hc);
      if (hop > N + 1) continue;
      const ring = (o, R, cols, gap) => { for (let a = 0; a < 16; a++) { if (a % gap === gap - 1) continue; const ang = a * Math.PI / 8; paint(Math.floor(o[0] + Math.cos(ang) * R), Math.floor(o[1] + Math.sin(ang) * R * 0.85), cols[a % cols.length]); } };
      if (hop < N) {
        const A = at(e.pts[hop]), B = at(e.pts[hop + 1]), m0 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], ou = [m0[0] - hc[0], m0[1] - hc[1]], ol = Math.hypot(ou[0], ou[1]) || 1;
        const m = [m0[0] + ou[0] / ol * e.bulge, m0[1] + ou[1] / ol * e.bulge], toward = (p, q, d) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * d, p[1] + dy / L * d]; };
        const a = toward(A, m, e.edge), b = toward(B, m, e.edge), rz = rng(e.seed + hop * 17 + ph), pts = [...jag(a, m, rz), ...jag(m, b, rz).slice(1)];
        for (const [x, y] of strokePx(pts)) paint(x, y, ph ? EC.pale : EC.white);
        if (ph) { flash.push({ x: e.pts[hop + 1][0], y: e.pts[hop + 1][1], r: 6 }); ring(B, e.ring, [EC.pale, EC.yel], 4); }
      } else if (hop === N) {
        const o = at(e.pts[N]), X = Math.floor(o[0]), Y = Math.floor(o[1]);
        if (!ph) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [-3, 0], [0, 3], [0, -3]]) paint(X + dx, Y + dy, Math.abs(dx) + Math.abs(dy) > 2 ? EC.yel : Math.abs(dx) + Math.abs(dy) > 1 ? EC.pale : EC.white); ring(o, e.ring, [EC.white, EC.pale], 3); }
        else ring(o, e.ring + 2, [EC.pale, EC.yel], 3);
      } else if (!ph) ring(at(e.pts[N]), e.ring + 4, [EC.amber, EC.ember], 2);   // 퍼지며 꺼지는 고리
    } else if (e.kind === 'zap') {
      // 몸 위를 가로지르는 지그재그(원화의 휘감은 번개): 흰 속 + 노랑 테 → 모양 바꿔 옅은 노랑 → 빈 장 → 조각만 노랑 → 주황 점 둘
      if (k > 4 || k === 2) continue;
      const a = at([e.a.x, e.a.y]), b = at([e.b.x, e.b.y]), pts = jag(a, b, rng(e.seed + (k === 3 ? 0 : k)));
      if (k === 0) { fillBolt(paint, pts, () => 0.95, EC.white, EC.yel, () => true, 0.5); flash.push({ x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2, r: 5 }); }
      if (k === 1) for (const [x, y] of strokePx(pts)) paint(x, y, EC.pale);
      if (k === 3) strokePx(pts).forEach(([x, y], i) => { if (Math.floor(i / 2) % 2 === 0) paint(x, y, EC.yel); });
      if (k === 4) { const px = strokePx(pts); for (const i of [Math.floor(px.length * 0.3), Math.floor(px.length * 0.75)]) if (px[i]) paint(px[i][0], px[i][1], EC.amber); }
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
