// 효과 그리기 공용 조각 — 다른 모듈에 기대지 않는 순수 함수만(노드 도구와 브라우저 게임이 함께 씀).
// engine.mjs(rng·linePx)·motion.mjs(strokePx·zigzag·fillBolt)는 여기서 가져다 그대로 내보낸다. 공격 효과(attack.mjs)는 여기만 쓴다.

// 씨앗 난수(mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 두 점 사이 칸(브레젠험)
export function linePx(a, b) {
  let x0 = Math.round(a[0]), y0 = Math.round(a[1]);
  const x1 = Math.round(b[0]), y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, out = [];
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
// 꺾은선 칸: 겹친 칸·계단 모서리(대각 이웃 사이 칸) 빼고 한 칸 굵기로
export function strokePx(pts) {
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
export function zigzag(o, ang, len, r, n = 4) {
  const ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, pts = [[o[0], o[1]]];
  let side = r() < 0.5 ? 1 : -1;
  for (let i = 1; i < n; i++) { const s = (i + (r() - 0.5) * 0.3) / n, a = side * (1.4 + r() * 2.2); pts.push([o[0] + ux * len * s + vx * a, o[1] + uy * len * s + vy * a]); side = -side; }
  pts.push([o[0] + ux * len, o[1] + uy * len]);
  return pts;
}
// 굵기 있는 지그재그 칠하기: 길이 비율 s의 반폭 hw(s)(끝은 가늘고 가운데 굵게), 안쪽 = core, 바깥 = edge, keep(s)로 조각만 남기기
export function fillBolt(paint, pts, hw, core, edge, keep = () => true, inner = 0.9) {
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
