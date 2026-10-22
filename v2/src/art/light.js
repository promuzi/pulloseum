// 식물 빛(노멀맵 조명) — 2026-10-22 사용자 "이것처럼 다른 식물들도 적용할 수 있나? 앰버캑터 얘도 자신의 불에 빛 영향을 받고 … 각 공격과 피격 등이나 여러가지로"
//  · "상태이상, 각 스킬의 공격, 게임 시작과 대기실의 윗 조명, 스마트팜 … 게임용량과 성능에 문제 없는 선에서"
//  그림 한 장(96×112, under + over 합친 것)에서 바로 면 방향을 만든다 — 파일을 더 받지 않음(노멀맵 그림은 압축이 거의 안 돼 식물 판 52KB가 수백 KB가 됨)
//  높이 = 실루엣 안을 막처럼 부풀림(포아송 — 테두리에서의 거리로 둥글리면 가운데가 평평하고 가장자리만 가팔라 빛이 선처럼 끊겼음, 2026-10-22 "그림자랑 빛이 너무 직선으로 뚝 끊겨")
//   부위별 골 · 그려 둔 명암 맞추기는 넣지 않음(2026-10-22 사용자 "섬세하게 하니깐 너무 이상해" · "다른것까지 너무 과하게 보정하지마")
//  빛 = 원래 색 × (어둠 + 흰 밝기를 섞은 빛) + 빛 색 조금 더하기 · 빛 단계는 14단계를 4×4 바이어 무늬로 섞음(6단계만 쓰면 띠가 생겼음) · 스스로 빛나는 칸(불꽃 · 번개 · 수정 …)은 제 색 그대로
//   — 빛 색을 몸 색에 곱하기만 하면 빨간 몸에 파란 빛은 거의 안 비쳐 오히려 어두워졌음(2026-10-22 사용자 "파란불빛은 왜 어두운거 같지")
//  게임 · 도구(Node) 공용: DOM 없음
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }

// OKLab(L, a, b) — 안 칠한 칸은 0
export function labOf(rgba, N) {
  const o = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const p = i * 4; if (rgba[p + 3] < 128) continue;
    const r = LIN[rgba[p]], g = LIN[rgba[p + 1]], b = LIN[rgba[p + 2]];
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    o[i * 3] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s; o[i * 3 + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s; o[i * 3 + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  }
  return o;
}
// 높이: 실루엣 안을 막처럼 부풀림(경계 0 · 안쪽은 이웃 평균 + 일정 압력 — 포아송 방정식을 SOR 로 풂) → 제곱근으로 둥글게 + 밝기 잔 결 조금 → 한 번 흐림
//  풀기 = 거친 판(1/4) → 중간 판(1/2) → 고운 판 차례로(게임에서 장마다 계산하므로 빠르게 — 고운 판만 160번 돌던 것과 면 방향 차이 평균 1° 안쪽)
export function heightOf(rgba, W, H, { iters = 30, press = 1, detail = 2.2, scale = 1.9, blur = 1 } = {}) {
  const N = W * H, inside = new Uint8Array(N), h = new Float32Array(N), lum = new Float32Array(N);
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] >= 128) { inside[i] = 1; lum[i] = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255; }
  const solve = (ins, hh, w, hgt, n, p) => { for (let k = 0; k < n; k++) for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!ins[i]) continue; const s = (x > 0 ? hh[i - 1] : 0) + (x < w - 1 ? hh[i + 1] : 0) + (y > 0 ? hh[i - w] : 0) + (y < hgt - 1 ? hh[i + w] : 0); hh[i] += 1.85 * ((s + p) / 4 - hh[i]); } };
  // 판 줄이기: 칸 k×k 중 절반 이상 칠했으면 안
  const down = (k) => { const w = Math.ceil(W / k), hg = Math.ceil(H / k), m = new Uint8Array(w * hg); for (let y = 0; y < hg; y++) for (let x = 0; x < w; x++) { let n = 0; for (let v = 0; v < k; v++) for (let u = 0; u < k; u++) { const X = x * k + u, Y = y * k + v; if (X < W && Y < H && inside[Y * W + X]) n++; } m[y * w + x] = n * 2 >= k * k ? 1 : 0; } return [m, w, hg]; };
  const [cin, cw, ch] = down(4), chh = new Float32Array(cw * ch), [min, mw, mh] = down(2), mhh = new Float32Array(mw * mh);
  solve(cin, chh, cw, ch, 60, press * 16);
  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) { const i = y * mw + x; if (min[i]) mhh[i] = chh[Math.min(ch - 1, y >> 1) * cw + Math.min(cw - 1, x >> 1)]; }
  solve(min, mhh, mw, mh, 30, press * 4);
  let ni = 0; const idx = new Int32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (inside[i]) { h[i] = mhh[Math.min(mh - 1, y >> 1) * mw + Math.min(mw - 1, x >> 1)]; idx[ni++] = i; } }
  // 고운 판은 칠한 칸 목록만 돎(빈칸 건너뛰기만 해도 시간이 절반쯤 듦)
  for (let k = 0; k < iters; k++) for (let q = 0; q < ni; q++) { const i = idx[q], x = i % W; const s = (x > 0 ? h[i - 1] : 0) + (x < W - 1 ? h[i + 1] : 0) + (i >= W ? h[i - W] : 0) + (i + W < N ? h[i + W] : 0); h[i] += 1.85 * ((s + press) / 4 - h[i]); }
  const out = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!inside[i]) continue;
    let s = 0, n = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X < 0 || Y < 0 || X >= W || Y >= H || !inside[Y * W + X]) continue; s += lum[Y * W + X]; n++; }
    out[i] = scale * Math.sqrt(Math.max(0, h[i])) + detail * (lum[i] - s / n);
  }
  for (let b = 0; b < blur; b++) { const t = out.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!inside[i]) continue; let s = 0, n = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; s += inside[Y * W + X] ? t[Y * W + X] : 0; n++; } out[i] = s / n; } }
  return { h: out, inside };
}
// 면 방향(Float32 nx, ny, nz — 바깥 칸 = 0, 0, 0)
export function normalsOf(rgba, W, H, opt = {}) {
  const N = W * H, { h, inside } = heightOf(rgba, W, H, opt), nm = new Float32Array(N * 3), g = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : h[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!inside[i]) continue;
    const dx = (g(x + 1, y) - g(x - 1, y)) / 2, dy = (g(x, y + 1) - g(x, y - 1)) / 2, l = Math.hypot(dx, dy, 1);
    nm[i * 3] = -dx / l; nm[i * 3 + 1] = -dy / l; nm[i * 3 + 2] = 1 / l;
  }
  return nm;
}

// ── 스스로 빛나는 칸 ──
// rules = [{ k: 'fire'|'bolt'|'gem'|'lamp'|'magic'|'lava', h: [h0, h1](색상각, h0 > h1 이면 360 넘어 감음), l: 최소 밝기, c: 최소 채도, cx: 최대 채도,
//   rb: [x0, y0, x1, y1](칠한 범위에 대한 비율 — 생장 단계마다 크기가 달라도 같은 자리), col: [r, g, b](빛 색을 정함 — 초롱 = 천 색이 아니라 촛불 색) }]
//  OKLCH 로 판정 · 색 변종은 원래 그림으로 찾아야 함(파란 불 흰 속심이 채도가 낮아 불로 안 잡혀 밤에 같이 어두워졌음 — 2026-10-22 "파란불빛은 왜 어두운거 같지")
//  tr: true = 잠깐 나오는 효과(번개 · 마법)만 — steady(늘 밝은 무늬) 칸은 뺌(스파크번 몸의 흰 반짝임까지 '번개 빛'으로 잡혀 쉴 때도 몸이 밝았음, 2026-10-22 "얘 왤캐 밝아?")
export function emitOf(rgba, W, H, rules, lab = null, steady = null) {
  const N = W * H, m = new Uint8Array(N); if (!rules || !rules.length) return m;
  lab = lab || labOf(rgba, N);
  let t = H, bt = -1, l = W, r0 = -1;
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] >= 128) { const x = i % W, y = (i / W) | 0; if (y < t) t = y; if (y > bt) bt = y; if (x < l) l = x; if (x > r0) r0 = x; }
  const bw = Math.max(1, r0 - l), bh = Math.max(1, bt - t);
  for (let i = 0; i < N; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    const L = lab[i * 3], a = lab[i * 3 + 1], b = lab[i * 3 + 2], C = Math.hypot(a, b), hd = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360, x = i % W, y = (i / W) | 0, fx = (x - l) / bw, fy = (y - t) / bh;
    for (let r = 0; r < rules.length; r++) {
      const R = rules[r];
      if (R.rb && (fx < R.rb[0] || fy < R.rb[1] || fx > R.rb[2] || fy > R.rb[3])) continue;
      if (L < (R.l ?? 0) || C < (R.c ?? 0) || C > (R.cx ?? 9)) continue;
      if (R.h && !(R.h[0] <= R.h[1] ? hd >= R.h[0] && hd <= R.h[1] : hd >= R.h[0] || hd <= R.h[1])) continue;
      if (R.tr && steady && steady[i]) continue;
      m[i] = r + 1; break;
    }
  }
  return m;
}
// 늘 밝은 무늬: 대기 장 여럿(frames) 중 3/4 이상에서 빛 규칙에 맞는 칸(둘레 1칸까지 — 숨쉬기로 1칸쯤 움직임) → emitOf 의 steady
export function steadyOf(frames, W, H, rules) {
  const N = W * H, cnt = new Uint8Array(N), d = new Uint8Array(N);
  for (const fr of frames) {
    const e = emitOf(fr, W, H, rules); d.fill(0);
    for (let i = 0; i < N; i++) { if (!e[i]) continue; const x = i % W, y = (i / W) | 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X >= 0 && Y >= 0 && X < W && Y < H) d[Y * W + X] = 1; } }
    for (let i = 0; i < N; i++) if (d[i]) cnt[i]++;
  }
  const need = Math.ceil(frames.length * 0.75), s = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (cnt[i] >= need) s[i] = 1;
  return s;
}
// 빛 자리: 같은 규칙 칸을 16칸 격자로 묶어 무게중심 · 평균 색(가장 밝은 성분 = 1) · 칸 수 → 큰 것부터 max 개
export function spotsOf(rgba, emit, W, H, rules, { cell = 16, min = 3, max = 5 } = {}) {
  const acc = new Map();
  for (let i = 0; i < W * H; i++) {
    const r = emit[i]; if (!r) continue;
    const x = i % W, y = (i / W) | 0, id = (r * 64 + ((y / cell) | 0)) * 64 + ((x / cell) | 0);
    let a = acc.get(id); if (!a) acc.set(id, (a = { r: r - 1, x: 0, y: 0, n: 0, cr: 0, cg: 0, cb: 0 }));
    a.x += x; a.y += y; a.n++; a.cr += LIN[rgba[i * 4]]; a.cg += LIN[rgba[i * 4 + 1]]; a.cb += LIN[rgba[i * 4 + 2]];
  }
  const out = [];
  for (const a of acc.values()) {
    if (a.n < min) continue;
    const mx = Math.max(a.cr, a.cg, a.cb, 1e-6), R = rules[a.r];
    out.push({ k: R.k, x: a.x / a.n, y: a.y / a.n, n: a.n, c: R.col || [(a.cr / mx) ** 0.45, (a.cg / mx) ** 0.45, (a.cb / mx) ** 0.45] });
  }
  return out.sort((p, q) => q.n - p.n).slice(0, max);
}
// 빛 종류별 기본(세기 I · 닿는 거리 r · 높이 z) — 칸 수가 많을수록 조금 더 셈
const KIND = { fire: { I: 1.05, r: 30, z: 12 }, bolt: { I: 1.0, r: 40, z: 14 }, gem: { I: 0.55, r: 18, z: 8 }, lamp: { I: 1.25, r: 40, z: 10 }, magic: { I: 1.0, r: 26, z: 10 }, lava: { I: 0.9, r: 20, z: 8 } };
const hashf = n => { let h = Math.imul(n | 0, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// 장 번호로 정해지는 불 흔들림(같은 장 = 같은 빛 → 캐시 가능)
export const flick = f => 0.84 + 0.1 * Math.sin(f * 0.9) + 0.12 * (hashf(f) - 0.5);
export function selfLights(spots, f = 0, k = 1) {
  return spots.map(s => {
    const K = KIND[s.k] || KIND.fire, size = Math.min(1.5, Math.sqrt(s.n / 40));
    return { x: s.x, y: s.y - (s.k === 'fire' ? 3 : 0), z: K.z, r: K.r * (0.7 + 0.3 * size), c: s.c, I: K.I * (0.55 + 0.45 * size) * (s.k === 'fire' || s.k === 'lava' ? flick(f) : 1) * k };
  });
}

// ── 빛 입히기 ──
// 그림엔 이미 '위 앞에서 오는 빛'의 음영이 그려져 있음(45종 평균 — lightlab --probe 로 잼) — 2026-10-22 사용자 "이미 식물 그림 자체에 음영이 들어간 경우는 어떻게 할지"
//  그 위에 빛을 그냥 곱하면 그려 둔 밝은 칸이 더 하얗게 날아가고(스파크번 "왤캐 밝아") 그려 둔 그늘은 빛을 받아도 그늘로 남음 →
//  그림이 이미 받은 빛 E0 = A0 + B0 × (위 앞을 향한 정도)를 면 방향으로 어림하고, 이 장면의 빛 E 와의 비율(E / E0)만큼만 바꿈:
//   보통 장면(어둠 1 · 더한 빛 없음)이면 E = E0 → 그림 그대로 · 밝아지는 쪽은 남은 밝기 안에서 부드럽게 흰색에 다가감(하얗게 뭉개지지 않게)
const BAKED = (() => { const v = [0, -0.66, 0.75], l = Math.hypot(...v); return v.map(c => c / l); })(), A0 = 0.55, B0 = 0.45;
// srcs = 같은 크기 RGBA 여럿(under · over 따로) → outs(같은 수, 미리 만든 칸) · nm = 합친 그림의 면 방향 · emit = 빛나는 칸(제 색 그대로)
// lights = [{ x, y, z, r, c: [r, g, b] 0~1, I }](판 좌표, 뒤집기 전) · amb = 어둠(숫자 또는 [r, g, b] — 1 = 그대로)
// sb = 그림 속 위 빛이 이 장면에 얼마나 있나(기본 = 어둠 밝기 — 밤이면 위 빛도 약함) · white = 빛의 몇 할을 '흰 밝기'로 볼지 · add = 빛 색을 얼마나 더할지(0~255)
export function shadeInto(srcs, outs, nm, emit, lights, amb, W, H, { steps = 14, white = 0.6, add = 36, gain = 1, sb = null } = {}) {
  const N = W * H, A = typeof amb === 'number' ? [amb, amb, amb] : amb, sbv = sb ?? 0.2126 * A[0] + 0.7152 * A[1] + 0.0722 * A[2], [bx, by, bz] = BAKED;
  const Ls = lights.filter(L => L.I > 0.01).map(L => { const [r, g, b] = L.c, lum = 0.2126 * r + 0.7152 * g + 0.0722 * b, rr = L.r || 30; return { x: L.x, y: L.y, z: L.z ?? 10, ir2: 1 / (rr * rr), I: L.I, mr: white * lum + (1 - white) * r, mg: white * lum + (1 - white) * g, mb: white * lum + (1 - white) * b, r, g, b }; });
  for (let s = 0; s < srcs.length; s++) outs[s].set(srcs[s]);
  const ns = nm instanceof Int8Array ? 1 / 127 : 1;   // 게임은 장마다 면 방향을 Int8(×127)로 모아 둠
  // 밝아질 때: 늘어난 만큼을 남은 밝기(255 − 원래) 안에서 부드럽게 — 원래 밝은 칸이 하얗게 뭉개지지 않음
  const up = (s, v) => (v <= s ? v : s + ((v - s) * (256 - s)) / (256 + v - 2 * s));   // 늘어난 만큼 d → d × 남은 / (남은 + d)
  for (let i = 0; i < N; i++) {
    const nz = nm[i * 3 + 2] * ns; if (!nz) continue;
    if (emit && emit[i]) continue;
    const x = i % W, y = (i / W) | 0, nx = nm[i * 3] * ns, ny = nm[i * 3 + 1] * ns, nb = Math.max(0, nx * bx + ny * by + nz * bz), e0 = 1 / (A0 + B0 * nb), base = B0 * sbv * nb;
    let mr = 0, mg = 0, mb = 0, ar = 0, ag = 0, ab = 0;
    for (let j = 0; j < Ls.length; j++) {
      const L = Ls[j], vx = L.x - x, vy = L.y - y, vz = L.z, d2 = vx * vx + vy * vy + vz * vz, dot = nx * vx + ny * vy + nz * vz;
      if (dot <= 0) continue;
      const k = (L.I * dot) / Math.sqrt(d2) / (1 + d2 * L.ir2);
      mr += L.mr * k; mg += L.mg * k; mb += L.mb * k; ar += L.r * k; ag += L.g * k; ab += L.b * k;
    }
    // 빛 단계(steps)로 끊되 바이어 무늬로 단계 사이를 섞음(띠 대신 도트 섞임)
    const d = BAYER[(y & 3) * 4 + (x & 3)], gs = gain / steps, as = add / steps;
    const fr = (A0 * A[0] + base + gs * Math.max(0, Math.round((mr < 1.5 ? mr : 1.5) * steps + d))) * e0, fg = (A0 * A[1] + base + gs * Math.max(0, Math.round((mg < 1.5 ? mg : 1.5) * steps + d))) * e0, fb = (A0 * A[2] + base + gs * Math.max(0, Math.round((mb < 1.5 ? mb : 1.5) * steps + d))) * e0;
    const pr = as * Math.max(0, Math.round((ar < 1.5 ? ar : 1.5) * steps + d)), pg = as * Math.max(0, Math.round((ag < 1.5 ? ag : 1.5) * steps + d)), pb = as * Math.max(0, Math.round((ab < 1.5 ? ab : 1.5) * steps + d));
    for (let s = 0; s < srcs.length; s++) {
      const S = srcs[s], O = outs[s], p = i * 4; if (S[p + 3] < 128) continue;
      O[p] = up(S[p], S[p] * fr + pr); O[p + 1] = up(S[p + 1], S[p + 1] * fg + pg); O[p + 2] = up(S[p + 2], S[p + 2] * fb + pb);
    }
  }
  return outs;
}
// 한 장만(도구용): 새 칸에 돌려줌
export function shade(rgba, nm, emit, lights, amb, W, H, opt = {}) { return shadeInto([rgba], [new Uint8ClampedArray(rgba.length)], nm, emit, lights, amb, W, H, opt)[0]; }
