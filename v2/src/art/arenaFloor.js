// 콜로세움 흙바닥 늘이기(2026-10-23 사용자 "흙바닥의 경우 직선 가로줄이 보이는데 원형의 소점?에 맞게 자연스럽게 바꾸고, 가로선도 안 보이게 해줘.
//  다른 맵은 냅둬. 가운데 원도 이거 고려해서 적절히 중간에 맞추고"):
//  긴 화면(gap줄 더) = 같은 땅을 더 높은 자리에서 내려다본 원근 — 벽 밑 FL0줄부터 아래를 세로로 s배(내 받침이 손패 위에 오게) 늘임.
//  ① 빛(부드러운 바탕) = 원을 지운 그림을 흐려서 세로로 매끈하게 늘임(가로줄 없음)
//  ② 모래 알갱이 = 원래 알갱이(그림 − 바탕)를 줄마다 근처 다른 줄 · 가로로 밀어서 가져옴(같은 줄이 겹쳐 늘어나 보이지 않게)
//  ③ 가운데 원 = tools/pixel/big/arena_ring.py 와 같은 땅 원(두 받침 깊이 가운데)을 늘인 원근으로 다시 그림 — 늘 두 식물 사이 가운데
//  gap = 0 이면 그림 그대로(보통 화면 = 그린 그대로)
const YH = -148, F = 981, CX = 135, FOE_Y = 156, ME_Y = 282, HALF = [112, 56], FL0 = 150;
const Zf = F / (FOE_Y - YH), Zm = F / (ME_Y - YH), Zc = (Zf + Zm) / 2;
const hash = n => (Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0) / 4294967296;

// 원 칸(그림 원근 · 8방향 1칸 선 — arena_ring.py ring_px 와 같은 방식) → [x, y(실수)] 목록, my = 그림 줄 → 화면 줄
function ringPath(R, my) {
  const pts = [];
  for (let i = 0; i < 4000; i++) {
    const t = 2 * Math.PI * i / 4000, Xg = R * Math.cos(t), Zg = Zc + R * Math.sin(t), p = [Math.round(CX + F * Xg / Zg), Math.round(my(YH + F / Zg))];
    if (!pts.length || pts[pts.length - 1][0] !== p[0] || pts[pts.length - 1][1] !== p[1]) pts.push(p);
  }
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  for (let changed = true; changed;) {   // 앞뒤 칸이 8방향으로 붙으면 가운데(L자 모서리) 칸은 뺌
    changed = false;
    for (let i = 0; i < pts.length && pts.length > 8;) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
      if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 1) { pts.splice(i, 1); changed = true; } else i++;
    }
  }
  return pts;
}

// 그림 한 장마다 한 번: 원 지운 그림 · 흐린 바탕 · 알갱이 · 원 선 어둡기
const prep = new WeakMap();
function prepOf(bg) {
  let P = prep.get(bg); if (P) return P;
  const W = bg.width, H = bg.height, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.drawImage(bg, 0, 0);
  const src = c.getImageData(0, 0, W, H).data, mask = new Uint8Array(W * H);
  for (const h of HALF) for (const [x, y] of ringPath(h * Zc / F, y => y)) for (let yy = y - 1; yy <= y + 2; yy++) if (x >= 0 && x < W && yy >= 0 && yy < H) mask[yy * W + x] = 1;   // 원 선 + 아래 옅은 그늘(반올림 차이 한 칸씩 넉넉히)
  const clean = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i++) for (let k = 0; k < 3; k++) clean[i * 3 + k] = src[i * 4 + k];
  const ks = [0, 0, 0], lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b; let kn = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // 원 칸 = 둘레 7×7 안 원 아닌 칸 평균으로 메움
    const i = y * W + x; if (!mask[i]) continue;
    const s = [0, 0, 0]; let n = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H || mask[Y * W + X]) continue; const j = Y * W + X; s[0] += src[j * 4]; s[1] += src[j * 4 + 1]; s[2] += src[j * 4 + 2]; n++; }
    if (!n) continue;
    for (let k = 0; k < 3; k++) clean[i * 3 + k] = s[k] / n;
    if (lum(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]) < lum(s[0] / n, s[1] / n, s[2] / n) - 10) { for (let k = 0; k < 3; k++) ks[k] += src[i * 4 + k] / Math.max(1, s[k] / n); kn++; }   // 원 선 칸
  }
  const K = kn ? ks.map(v => Math.min(0.95, Math.max(0.5, v / kn))) : [0.72, 0.67, 0.64];   // 원 선 어둡기(선 칸 / 메운 색)
  // 흐린 바탕(가로 · 세로 상자 흐림 반지름 3) — 땅 쪽만
  const R = 3, tmp = new Float32Array(W * H * 3), base = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) { let s = 0, n = 0; for (let d = -R; d <= R; d++) { const X = x + d; if (X < 0 || X >= W) continue; s += clean[(y * W + X) * 3 + k]; n++; } tmp[(y * W + x) * 3 + k] = s / n; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) { let s = 0, n = 0; for (let d = -R; d <= R; d++) { const Y = y + d; if (Y < FL0 - 8 || Y >= H) continue; s += tmp[(Y * W + x) * 3 + k]; n++; } base[(y * W + x) * 3 + k] = n ? s / n : tmp[(y * W + x) * 3 + k]; }
  P = { W, H, src, clean, base, K, cache: new Map() };
  prep.set(bg, P); return P;
}

export function colosseumFloor(bg, gap) {
  if (!gap) return bg;
  const P = prepOf(bg); let cv = P.cache.get(gap); if (cv) return cv;
  const { W, H, src, clean, base, K } = P, OH = H + gap, s = (ME_Y + gap - FL0) / (ME_Y - FL0);   // 늘이는 배율(벽 밑 FL0 고정 · 내 받침 → 손패 위)
  cv = document.createElement('canvas'); cv.width = W; cv.height = OH;
  const c = cv.getContext('2d'), img = c.createImageData(W, OH), d = img.data;
  for (let i = 0; i < W * FL0; i++) for (let k = 0; k < 4; k++) d[i * 4 + k] = src[i * 4 + k];   // 하늘 · 관중석 · 벽 = 그대로
  for (let y = FL0; y < OH; y++) {
    const yo = Math.min(H - 1, FL0 + (y - FL0) / s), y0 = Math.floor(yo), y1 = Math.min(H - 1, y0 + 1), f = yo - y0;
    // 알갱이 줄: 근처(±2) 다른 줄 · 가로로 −20~20 밈 — 줄마다 따로 골라 같은 결이 이어지지 않게
    const ys = Math.min(H - 1, Math.max(FL0, Math.round(yo + (hash(y * 7 + 1) * 5 | 0) - 2))), ox = (hash(y * 13 + 5) * 41 | 0) - 20;
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, xs = (x + ox + W) % W;
      for (let k = 0; k < 3; k++) {
        const b = base[(y0 * W + x) * 3 + k] * (1 - f) + base[(y1 * W + x) * 3 + k] * f, grain = clean[(ys * W + xs) * 3 + k] - base[(ys * W + xs) * 3 + k];
        d[o + k] = Math.max(0, Math.min(255, Math.round(b + grain)));
      }
      d[o + 3] = 255;
    }
  }
  // 가운데 원: 같은 땅 원을 늘인 원근으로(그림 줄 y → 화면 줄 FL0 + (y − FL0)·s) — 선 = 그 자리 색 × 원 선 어둡기 · 아래 칸 옅은 그늘
  for (const h of HALF) for (const [x, y] of ringPath(h * Zc / F, yo => FL0 + (yo - FL0) * s)) {
    if (x < 0 || x >= W || y < FL0 || y >= OH) continue;
    const o = (y * W + x) * 4; for (let k = 0; k < 3; k++) d[o + k] = Math.round(d[o + k] * K[k]);
    if (y + 1 < OH) { const u = ((y + 1) * W + x) * 4; for (let k = 0; k < 3; k++) d[u + k] = Math.round(d[u + k] * 0.94); }
  }
  c.putImageData(img, 0, 0);
  if (P.cache.size > 6) P.cache.clear();
  P.cache.set(gap, cv); return cv;
}
