// 색 변종(이로치) 색 바꾸기 — 게임(art/sprites.js)과 검토 도구(tools/pixel/big/shiny.mjs)가 같이 쓰는 순수 함수(2026-10-22 사용자 "색 변종 그림부터 해줘",
//  결정 2026-10-18 "그림 색을 진짜로 바꿈 — 자연스럽고 이쁘게 · 포켓몬 이로치 참고" · 주된 몸 색만 바꾸고 눈 · 화분은 그대로 · 종마다 보여 드리고 고름)
//  색은 OKLCH(사람 눈에 고른 밝기 · 채도 · 색상)로 다룸: 규칙의 색 무리(색상 범위)에 드는 칸만 색상을 돌리고 밝기 · 명암 차이는 그대로 → 그림 결이 안 깨짐
//  규칙 = 띠 목록 [{ h: [h0, h1], to: 목표 색상(띠 가운데가 여기로), ck: 채도 배수, dl: 밝기 더하기, hs: 색상 퍼짐 배수(기본 1), l: [최소, 최대], c: 최소 채도 }
//                  | { tint: [색상, 채도], l: [최소, 최대], c: 최대 채도 } (흰 · 회색 몸에 색을 입힘)] — 띠에 part 가 있으면 이어진 부위만(아래 recolorData 설명)
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = v => { const u = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(u * 255))); };
export function toLch(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, Bb), (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360];
}
const linOf = (L, C, H) => {
  const h = H * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
// 화면에 못 내는 색(채도가 너무 큼)이면 색상 · 밝기는 두고 채도만 줄여 맞춤
export function fromLch(L, C, H) {
  L = Math.max(0, Math.min(1, L));
  let c = C, v = linOf(L, c, H);
  for (let i = 0; i < 12 && v.some(x => x < -0.001 || x > 1.001); i++) { c *= 0.88; v = linOf(L, c, H); }
  return v.map(gam);
}
export const inHue = (h, [h0, h1]) => (h0 <= h1 ? h >= h0 && h <= h1 : h >= h0 || h <= h1);
const midOf = ([h0, h1]) => (h0 + ((h1 - h0 + 360) % 360) / 2) % 360;
// 띠가 이 색을 바꾸는지(위치 빼고 색 조건만)
function hits(t, L, C, H) {
  const [l0, l1] = t.l || [0.24, 1.01];
  if (L < l0 || L > l1) return false;
  if (t.tint) return C <= (t.c ?? 0.05);
  return C >= (t.c ?? 0.04) && (t.cx == null || C <= t.cx) && inHue(H, t.h);   // cx = 최대 채도(진한 색은 빼기)
}
// w = 바뀌는 정도(1 = 다 · 0.5 = 원래 색과 반반 — part.fade 의 옅어지는 칸)
function paint(t, L, C, H, dl, w = 1) {
  let L2 = L + dl, C2, H2;
  if (t.tint) {
    const [l0, l1] = t.l || [0.24, 1.01], k = Math.max(0, Math.min(1, (L - l0) / 0.15) * Math.min(1, (l1 - L) / 0.06 + 0.35));   // 띠 끝은 살살(흰 반짝임은 덜 물듦)
    C2 = Math.max(C, t.tint[1] * k); H2 = t.tint[0];
  } else {
    const d = ((H - midOf(t.h) + 540) % 360) - 180;   // 띠 가운데에서 떨어진 색상(−180~180)
    C2 = C * (t.ck ?? 1); H2 = (t.to + d * (t.hs ?? 1) + 720) % 360;   // hs = 색상 퍼짐 배수(0.3 = 띠 안 색을 목표 색 가까이로 모음 — 단풍처럼 고르게)
  }
  if (w < 1) {   // 원래 색과 섞기 — 색상을 돌려 섞으면 노랑 → 파랑 사이가 초록 무지개가 돼 Lab 직선으로 섞음(가운데는 옅어짐)
    const r = Math.PI / 180, a = C * Math.cos(H * r) * (1 - w) + C2 * Math.cos(H2 * r) * w, bb = C * Math.sin(H * r) * (1 - w) + C2 * Math.sin(H2 * r) * w;
    L2 = L + (L2 - L) * w; C2 = Math.hypot(a, bb); H2 = Math.atan2(bb, a) / r;
  }
  return fromLch(L2, C2, (H2 + 360) % 360);
}
// 한 색 바꾸기(바뀌지 않으면 null) — 아주 어두운 칸(테두리 · 눈동자)은 그대로(밝기 0.24 아래 — 띠가 l 로 더 낮게 정하면 그 띠만 칠함)
//  bits = 위치 조건(box · part)이 있는 띠마다 이 칸이 그 안이면 1(띠 번호 자리) · null = 위치를 모름 → 그 띠는 건너뜀
//  force = 부위 둘레로 넓힌 칸(part.grow — 불꽃 · 깃 테두리)이면 1: 그 띠를 색 조건 없이 칠함
//  fade = (띠 번호 + 1) × 16 + 단계(1~15) — part.fade · taper 로 옅어지는 칸(바뀌는 정도 = 1 − 단계/16)
export function shinyColor(r, g, b, rule, bits = null, force = 0, fade = 0) {
  const [L, C, H] = toLch(r, g, b);
  return shinyLch(L, C, H, rule, bits, force, fade);
}
function shinyLch(L, C, H, rule, bits, force, fade) {
  for (let k = 0; k < rule.length; k++) {
    const t = rule[k];
    if ((force >> k) & 1) return paint(t, L, C, H, t.part.gdl ?? t.dl ?? 0);
    if (fade >> 4 === k + 1) return paint(t, L, C, H, t.part.gdl ?? t.dl ?? 0, 1 - (fade & 15) / 16);
    if (t.box || t.part) { if (bits == null) continue; const inside = (bits >> k) & 1; if (t.box && t.out ? inside : !inside) continue; }
    if (hits(t, L, C, H)) return paint(t, L, C, H, t.dl || 0);
  }
  return null;
}
// 그림 칸 바꾸기(제자리) — keep = 그대로 둘 색(눈) · skip(r, g, b) = 그대로 둘 색인지(흙 덮기 무늬 — 화분 · 잔디 처리가 흙 색으로 찾음) · 같은 색은 한 번만 계산
//  geom = { W: 그림 폭, w, h, cols, rows } — 띠에 위치 조건이 있으면 장마다(앞뒤 두 층을 합쳐) 식물 둘레를 재서 고름:
//   box: [x0, y0, x1, y1] = 그 장 식물 둘레 안 비율의 네모 안(out = 밖)만 — 네모 가장자리가 같은 색 덩어리를 일자로 자를 수 있음(볼케이노캡 갓 바위처럼 경계가 색으로 나뉠 때만)
//   part: 띠 색에 드는 칸의 이어진 덩어리(8방향)를 통째로 고름 — 일자로 잘리지 않음(2026-10-22 사용자 "불 안쪽 부분(직선으로 짤림)" · "모자의 그림자 같은 부위(직선)도 … 얼굴까지 변했다")
//     at: [[x0, y0, x1, y1], …] 무게중심이 그 안(out = 모두 밖)인 덩어리 · min: 가장 큰 덩어리의 몇 배 이상(가시 · 반점 빼기) · big: 큰 순 몇 개 · air: 둘레가 이만큼 빈 칸이면(떠다니는 불티) 늘 고름
//     grow: 고른 덩어리에서 몇 칸 넓힘 — gh(색상 범위) · gl(밝기 범위) · gc(최소 채도)에 드는 이웃만(불꽃 · 깃의 바깥 테두리) · up: 그다음 위 · 옆으로만 몇 칸 더 · gdl = 넓힌 칸 밝기 더하기(기본 dl)
//     g: [[h0, h1, l0, l1, 최소 채도], …] = 넓힘 조건 여러 개 · fill: 같은 꼴 — 고른 칸에 이어진 그 색은 끝까지(갓 위 넓은 흰빛)
//     at: [] = 자리로는 안 고름(air 로 떠다니는 것만) · fade: 고른 칸 아래로 몇 칸 점점 옅게(같은 넓힘 조건)
//     taper: 고른 부위의 위에서 이 비율까지는 다 바꾸고 그 아래는 밑동으로 갈수록 원래 색(몸 안에서 솟은 어린 불꽃 — 밑동이 일자로 잘려 보이지 않게)
export function recolorData(data, rule, keep = null, skip = null, geom = null) {
  if (geom && rule.some(t => t.box || t.part)) return recolorParts(data, rule, keep, skip, geom);
  const memo = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (keep && keep.has(key)) continue;
    let v = memo.get(key);
    if (v === undefined) { v = skip && skip(data[i], data[i + 1], data[i + 2]) ? null : shinyColor(data[i], data[i + 1], data[i + 2], rule); memo.set(key, v); }
    if (v) { data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2]; }
  }
}
// 넓힐 칸 조건 — gh · gl · gc 하나, 또는 g: [[h0, h1, l0, l1, 최소 채도], …] 중 하나라도 · fill 도 같은 꼴(이어진 데까지 끝없이)
const anyOk = (list, L, C, H) => list.some(([h0, h1, l0, l1, c0]) => inHue(H, [h0, h1]) && L >= l0 && L <= l1 && C >= c0);
const growOk = (P, [L, C, H]) => P.g ? anyOk(P.g, L, C, H)
  : (!P.gl || (L >= P.gl[0] && L <= P.gl[1])) && C >= (P.gc ?? 0) && (!P.gh || inHue(H, P.gh));
const fillOk = (P, [L, C, H]) => !!P.fill && anyOk(P.fill, L, C, H);
function recolorParts(data, rule, keep, skip, { W, w, h, cols, rows }) {
  const N = w * h, at = (ox, oy, L, x, y) => ((oy + L * rows * h + y) * W + ox + x) * 4;
  // 색 번호(같은 색은 한 번만 셈 — 장 · 띠마다 칸을 여러 번 보므로): 색 번호 → [L, C, H] · 바꿀 수 있는 색인지(눈 · 흙 덮기 아님)
  //  (색 → 번호는 Map 대신 열린 주소 해시 — 칸마다 찾으므로 시트 하나 굽는 시간이 여기서 갈림)
  let HS = 20, hk = new Int32Array(1 << (32 - HS)).fill(-1), hv = new Int32Array(1 << (32 - HS));   // 칸 수 = 2^(32 − HS)
  const pal = [], ok = [], memo = new Map(), slot = key => Math.imul(key, 0x9E3779B1) >>> HS;   // memo = 위치 상태 → 색 번호마다 결과
  let lastSt = -1, lastArr = null;
  const cidx = i => {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2], m = hk.length - 1;
    let p = slot(key);
    while (hk[p] !== -1) { if (hk[p] === key) return hv[p]; p = (p + 1) & m; }
    const c = pal.length; hk[p] = key; hv[p] = c;
    pal.push(toLch(data[i], data[i + 1], data[i + 2])); ok.push(!(keep && keep.has(key)) && !(skip && skip(data[i], data[i + 1], data[i + 2])));
    if (pal.length * 2 > hk.length) {   // 반 넘게 차면 두 배로
      const k0 = hk, v0 = hv; HS--; hk = new Int32Array(k0.length * 2).fill(-1); hv = new Int32Array(k0.length * 2);
      for (let q = 0; q < k0.length; q++) if (k0[q] !== -1) { let r = slot(k0[q]); while (hk[r] !== -1) r = (r + 1) & (hk.length - 1); hk[r] = k0[q]; hv[r] = v0[q]; }
    }
    return c;
  };
  const memoC = f => { const M = []; return c => { let v = M[c]; if (v === undefined) v = M[c] = f(c); return v; }; };
  const T3 = rule.map(T => ({ hit: memoC(c => hits(T, ...pal[c])), grow: memoC(c => !!T.part && growOk(T.part, pal[c])), fill: memoC(c => !!T.part && fillOk(T.part, pal[c])) }));
  const cA = new Int32Array(N), cB = new Int32Array(N), lab = new Int32Array(N), stk = new Int32Array(N);   // 이 장의 칸마다 색 번호(뒤 · 앞 층, −1 = 빈 칸) · 덩어리 번호 · 쌓기
  for (let c = 0; c < cols * rows; c++) {
    const ox = (c % cols) * w, oy = Math.floor(c / cols) * h;
    let l = w, t = h, r = -1, b = -1;   // 이 장(앞뒤 두 층)의 식물 둘레
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = y * w + x, i0 = at(ox, oy, 0, x, y), i1 = at(ox, oy, 1, x, y);
      cA[s] = data[i0 + 3] >= 128 ? cidx(i0) : -1; cB[s] = data[i1 + 3] >= 128 ? cidx(i1) : -1;
      if (cA[s] >= 0 || cB[s] >= 0) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > b) b = y; }
    }
    if (r < 0) continue;
    const fxOf = x => (x - l) / Math.max(1, r - l), fyOf = y => (y - t) / Math.max(1, b - t);
    const any = (s, f) => { const a = cA[s], z = cB[s]; return (a >= 0 && ok[a] && f(a)) || (z >= 0 && ok[z] && f(z)); };
    // 부위 띠마다 이 장의 고른 칸(1 = 고름 · 2 = 둘레로 넓힘 · 3~ = 옅어지는 단계)
    const masks = rule.map((T, k) => {
      const P = T.part; if (!P) return null;
      const { hit, grow, fill } = T3[k], cand = new Uint8Array(N), mask = new Uint8Array(N), comps = [];
      lab.fill(-1);
      for (let s = 0; s < N; s++) { const a = cA[s], z = cB[s]; if ((a >= 0 && ok[a] && hit(a)) || (z >= 0 && ok[z] && hit(z))) cand[s] = 1; }
      for (let s0 = 0; s0 < N; s0++) {   // 이어진 덩어리(8방향) — 쌓기는 정수 배열 하나로
        if (!cand[s0] || lab[s0] >= 0) continue;
        const id = comps.length; let sp = 0, n = 0, sx = 0, sy = 0, air = 0, wall = 0;
        stk[sp++] = s0; lab[s0] = id;
        while (sp) {
          const j = stk[--sp], x = j % w, y = (j / w) | 0; n++; sx += x; sy += y;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy; if (!dx && !dy) continue; if (X < 0 || Y < 0 || X >= w || Y >= h) { air++; continue; }
            const q = Y * w + X; if (cand[q]) { if (lab[q] < 0) { lab[q] = id; stk[sp++] = q; } }
            else if (cA[q] >= 0 || cB[q] >= 0) wall++; else air++;
          }
        }
        comps.push({ id, n, cx: fxOf(sx / n), cy: fyOf(sy / n), air: air / Math.max(1, air + wall) });
      }
      let kept = comps.filter(p => !P.at || P.at.some(B => p.cx >= B[0] && p.cx <= B[2] && p.cy >= B[1] && p.cy <= B[3]) !== !!P.out);
      if (P.min) { const big = Math.max(0, ...kept.map(p => p.n)); kept = kept.filter(p => p.n >= P.min * big); }
      if (P.big) kept = kept.sort((a, z) => z.n - a.n).slice(0, P.big);
      if (P.air != null) for (const p of comps) if (p.air >= P.air && !kept.includes(p)) kept.push(p);
      const keepId = new Uint8Array(comps.length); for (const p of kept) keepId[p.id] = 1;
      let front = [];
      for (let s = 0; s < N; s++) if (lab[s] >= 0 && keepId[lab[s]]) { mask[s] = 1; front.push(s); }
      for (let g = 0; g < (P.grow || 0) + (P.up || 0); g++) {   // 둘레로 넓히기(조건에 드는 이웃만) — 그다음 up 칸은 위 · 옆으로만(불꽃 혀끝 — 아래 몸으로는 안 번짐)
        const next = [], dy1 = g < (P.grow || 0) ? 1 : 0;
        for (const s of front) { const x = s % w, y = (s / w) | 0;
          for (let dy = -1; dy <= dy1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const q = Y * w + X;
            if (!mask[q] && any(q, grow)) { mask[q] = 2; next.push(q); }
          } }
        front = next;
      }
      if (P.fill) {   // 고른 칸에 이어진 fill 색은 끝까지(갓 위 넓은 흰빛 — 몇 칸 넓힘으로는 가운데가 남음, 얼굴 흰빛은 안 이어져 빠짐)
        const st = []; for (let s = 0; s < N; s++) if (mask[s]) st.push(s);
        while (st.length) { const s = st.pop(), x = s % w, y = (s / w) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const q = Y * w + X;
            if (!mask[q] && any(q, fill)) { mask[q] = 2; st.push(q); }
          } }
      }
      if (P.taper != null) {   // 위 → 밑동으로 옅게(2 + 단계 — 단계 16 이상 = 그대로)
        let y0 = h, y1 = -1; for (let s = 0; s < N; s++) if (mask[s]) { const y = (s / w) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const cut = y0 + (y1 - y0) * P.taper, span = Math.max(1, y1 + 1 - cut);
        for (let s = 0; s < N; s++) if (mask[s]) { const y = (s / w) | 0; if (y <= cut) continue; const lev = Math.round(16 * (y - cut) / span); mask[s] = lev >= 16 ? 0 : lev < 1 ? mask[s] : 2 + lev; }
      }
      if (P.fade) {   // 아래로 옅어지는 칸(2 + 단계)
        let fr = []; for (let s = 0; s < N; s++) if (mask[s]) fr.push(s);
        for (let f = 1; f <= P.fade; f++) {
          const next = [];
          for (const s of fr) { const x = s % w, Y = ((s / w) | 0) + 1; if (Y >= h) continue;
            for (let dx = -1; dx <= 1; dx++) { const X = x + dx; if (X < 0 || X >= w) continue; const q = Y * w + X;
              if (!mask[q] && any(q, grow)) { mask[q] = 2 + Math.round(16 * f / (P.fade + 1)); next.push(q); } } }
          fr = next;
        }
      }
      return mask;
    });
    // 칠하기 — 결과는 (위치 상태 = bits · force · fade) 마다 색 번호 배열에 둠(이웃 칸은 상태가 같아 거의 늘 바로 찾음)
    for (let L = 0; L < 2; L++) for (let y = 0; y < h; y++) {
      let i = ((oy + L * rows * h + y) * W + ox) * 4;
      for (let x = 0; x < w; x++, i += 4) {
        if (data[i + 3] < 8) continue;
        const s = y * w + x, ci = data[i + 3] >= 128 ? (L ? cB[s] : cA[s]) : cidx(i);
        if (!ok[ci]) continue;
        let bits = 0, force = 0, fade = 0;
        for (let k = 0; k < rule.length; k++) {
          const B = rule[k].box;
          if (B) { const fx = fxOf(x), fy = fyOf(y); if (fx >= B[0] && fx <= B[2] && fy >= B[1] && fy <= B[3]) bits |= 1 << k; }
          else if (masks[k]) {
            const mv = masks[k][s];
            if (mv === 1) bits |= 1 << k;
            else if (mv === 2) { if (T3[k].grow(ci) || T3[k].fill(ci)) force |= 1 << k; }
            else if (mv > 2 && !fade) { if (T3[k].grow(ci) || T3[k].hit(ci)) fade = (k + 1) * 16 + mv - 2; }
          }
        }
        const st = bits * 8192 + force * 128 + fade;
        if (st !== lastSt) { lastSt = st; lastArr = memo.get(st); if (!lastArr) memo.set(st, lastArr = []); }
        let v = lastArr[ci];
        if (v === undefined) { const [Lv, Cv, Hv] = pal[ci]; v = lastArr[ci] = shinyLch(Lv, Cv, Hv, rule, bits, force, fade); }
        if (v) { data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2]; }
      }
    }
  }
}
// 눈 색: 깜빡임 장(blinkIndex~+3)과 같은 자세 대기 장(blinkAt~+3)에서 달라지는 칸 = 눈 — 그 색들 중 눈에서 주로 쓰이는 것(눈 밖보다 눈 안에 더 많음)
export function eyeKeep(data, sheetW, m) {
  const keep = new Set();
  if (m.blinkIndex == null) return keep;
  const inEye = new Map(), all = new Map(), at = (f, layer, x, y) => ((Math.floor(f / m.cols) * m.h + layer * m.rows * m.h + y) * sheetW + (f % m.cols) * m.w + x) * 4;
  for (let k = 0; k < 4; k++) for (const layer of [0, 1]) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const a = at(m.blinkAt + k, layer, x, y), b = at(m.blinkIndex + k, layer, x, y);
    if (data[a + 3] < 128) continue;
    const key = (data[a] << 16) | (data[a + 1] << 8) | data[a + 2];
    all.set(key, (all.get(key) || 0) + 1);
    if (data[a] !== data[b] || data[a + 1] !== data[b + 1] || data[a + 2] !== data[b + 2] || data[a + 3] !== data[b + 3]) inEye.set(key, (inEye.get(key) || 0) + 1);
  }
  for (const [key, n] of inEye) if (n * 2 >= all.get(key)) keep.add(key);
  return keep;
}
