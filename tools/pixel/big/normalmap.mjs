// 도트 그림 노멀맵 · 빛 입히기(2026-10-22 조명 조사 — tools/pixel/big/normallab.mjs 가 씀, 게임에는 아직 안 씀)
//  높이 = 실루엣 안을 '부풀린' 막(경계 0 · 안쪽은 이웃 평균 + 일정 압력 — 포아송 방정식을 SOR 로 풂) → 제곱근으로 둥글게
//   (거리 변환으로 둥글리면 가운데 능선 · 팔각 등고선이 생겨 빛과 그림자가 직선으로 뚝 끊겼음 — 2026-10-22 사용자 "그림자랑 빛이 너무 직선으로 뚝 끊겨")
//  + 밝기의 잔 결 조금(가시 · 무늬가 살짝 도드라짐) → 한 번 흐림 → 기울기 = 면 방향
//  빛 = 원래 색 × (어둠 + 빛) + 아주 조금 더하기 — 빛 세기는 4×4 바이어 무늬로 단계를 섞어(띠 대신 도트 섞임) 끊김 없이
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
export function heightOf(rgba, W, H, { iters = 160, press = 1, detail = 2.2, scale = 1.9, blur = 1 } = {}) {
  const N = W * H, inside = new Uint8Array(N), h = new Float32Array(N), lum = new Float32Array(N);
  for (let i = 0; i < N; i++) if (rgba[i * 4 + 3] >= 128) { inside[i] = 1; const r = rgba[i * 4] / 255, g = rgba[i * 4 + 1] / 255, b = rgba[i * 4 + 2] / 255; lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  // 막 부풀리기: h = (이웃 넷 합 + 압력) / 4, 바깥 = 0 — 거친 판(1/4)에서 먼저 풀어 올려 빨리 맞춤
  const solve = (ins, hh, w, hgt, n, p) => { const om = 1.85; for (let k = 0; k < n; k++) for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!ins[i]) continue; const s = (x > 0 ? hh[i - 1] : 0) + (x < w - 1 ? hh[i + 1] : 0) + (y > 0 ? hh[i - w] : 0) + (y < hgt - 1 ? hh[i + w] : 0); hh[i] += om * ((s + p) / 4 - hh[i]); } };
  const cw = Math.ceil(W / 4), ch = Math.ceil(H / 4), cin = new Uint8Array(cw * ch), chh = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { let n = 0; for (let v = 0; v < 4; v++) for (let u = 0; u < 4; u++) { const X = x * 4 + u, Y = y * 4 + v; if (X < W && Y < H && inside[Y * W + X]) n++; } cin[y * cw + x] = n >= 8 ? 1 : 0; }
  solve(cin, chh, cw, ch, 60, press * 16);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (inside[i]) h[i] = chh[Math.min(ch - 1, y >> 2) * cw + Math.min(cw - 1, x >> 2)]; }
  solve(inside, h, W, H, iters, press);
  // 둥글게(가장자리는 가파르게 · 가운데는 완만하게) + 밝기 잔 결
  const out = new Float32Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!inside[i]) continue;
    let s = 0, n = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X < 0 || Y < 0 || X >= W || Y >= H || !inside[Y * W + X]) continue; s += lum[Y * W + X]; n++; }
    out[i] = scale * Math.sqrt(Math.max(0, h[i])) + detail * (lum[i] - s / n);
  }
  for (let b = 0; b < blur; b++) { const t = out.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!inside[i]) continue; let s = 0, n = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; s += inside[Y * W + X] ? t[Y * W + X] : 0; n++; } out[i] = s / n; } }
  return out;
}
export function normalsOf(rgba, W, H, opt = {}) {
  const N = W * H, hgt = heightOf(rgba, W, H, opt), nm = new Float32Array(N * 3), g = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : hgt[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, dx = (g(x + 1, y) - g(x - 1, y)) / 2, dy = (g(x, y + 1) - g(x, y - 1)) / 2, l = Math.hypot(dx, dy, 1);
    nm[i * 3] = -dx / l; nm[i * 3 + 1] = -dy / l; nm[i * 3 + 2] = 1 / l;
  }
  return nm;
}
// lights = [{ x, y, z, r(빛 닿는 거리), c: [r, g, b] 0~1, I }] · emit = 스스로 빛나는 칸(제 빛 안 받음) · amb = 어둠(1 = 그대로)
export function shade(rgba, nm, emit, lights, amb, W, H, { steps = 14 } = {}) {
  const N = W * H, o = new Uint8ClampedArray(rgba);
  for (let i = 0; i < N; i++) {
    if (!rgba[i * 4 + 3] || (emit && emit[i])) continue;
    const x = i % W, y = (i / W) | 0, nx = nm[i * 3], ny = nm[i * 3 + 1], nz = nm[i * 3 + 2];
    let lr = 0, lg = 0, lb = 0;
    for (const Lt of lights) {
      const vx = Lt.x - x, vy = Lt.y - y, vz = Lt.z, dl = Math.hypot(vx, vy, vz), ndl = Math.max(0, (nx * vx + ny * vy + nz * vz) / dl);
      const k = Lt.I * ndl / (1 + (dl / Lt.r) ** 2);
      lr += Lt.c[0] * k; lg += Lt.c[1] * k; lb += Lt.c[2] * k;
    }
    const d = BAYER[(y & 3) * 4 + (x & 3)], q = v => Math.max(0, Math.round(Math.min(1.5, v) * steps + d) / steps);
    lr = q(lr); lg = q(lg); lb = q(lb);
    o[i * 4] = rgba[i * 4] * (amb + 1.2 * lr) + 22 * lr; o[i * 4 + 1] = rgba[i * 4 + 1] * (amb + 1.2 * lg) + 22 * lg; o[i * 4 + 2] = rgba[i * 4 + 2] * (amb + 1.2 * lb) + 22 * lb;
  }
  return o;
}
