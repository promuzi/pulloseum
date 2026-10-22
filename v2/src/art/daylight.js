// 스마트팜 하루(현실 시각 — 2026-10-22 사용자 "스마트팜은 현실 시간에 따라 아침 낮 노을 밤 다 넣어줘 그러면 식물의 빛효과 덕을 볼 거 같아")
//  시각(0~24, 이 기기 시계) → 천장 창 하늘 · 방 물들임 · 해/달 빛(방향 · 색 · 세기) · 식물 어둠 · 스스로 빛 세기. 마디 사이는 부드럽게 섞음
//  게임 셈(전투 · 성장)과 무관한 그림만 — 시계는 그리기에서만 읽음
const lerp = (a, b, k) => a + (b - a) * k, mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
// 마디: 시각 → { tint 방, amb 식물 어둠, L 빛(dx · dy = 식물 기준 방향, c, I), self, top · bot 하늘 위 · 아래, sun · moon [x, y](창 안 0~1) · 세기, stars }
const K = [
  { h: 0, tint: [0.42, 0.46, 0.64], amb: [0.4, 0.44, 0.62], L: [110, -260, [0.62, 0.72, 1], 0.38], self: 1, top: [8, 12, 40], bot: [26, 36, 76], sun: [0.5, 1.4, 0], moon: [0.62, 0.3, 1], stars: 1 },
  { h: 4.8, tint: [0.42, 0.46, 0.64], amb: [0.4, 0.44, 0.62], L: [110, -260, [0.62, 0.72, 1], 0.38], self: 1, top: [8, 12, 40], bot: [26, 36, 76], sun: [0.1, 1.4, 0], moon: [0.85, 0.45, 1], stars: 1 },
  { h: 6.2, tint: [1, 0.88, 0.86], amb: [0.92, 0.82, 0.82], L: [-220, -110, [1, 0.82, 0.66], 0.9], self: 0.5, top: [120, 146, 214], bot: [255, 186, 152], sun: [0.12, 0.82, 1], moon: [0.95, 0.6, 0], stars: 0.1 },
  { h: 8.5, tint: [1, 0.97, 0.92], amb: [0.92, 0.9, 0.86], L: [-160, -220, [1, 0.9, 0.75], 0.75], self: 0.4, top: [112, 166, 232], bot: [214, 226, 236], sun: [0.26, 0.48, 1], moon: [1, 1, 0], stars: 0 },
  { h: 11, tint: [1, 1, 1], amb: [0.88, 0.88, 0.88], L: [0, -300, [0.92, 0.96, 1], 0.62], self: 0.35, top: [90, 154, 222], bot: [182, 218, 246], sun: [0.5, 0.22, 1], moon: [1, 1, 0], stars: 0 },
  { h: 15.5, tint: [1, 1, 1], amb: [0.88, 0.88, 0.88], L: [60, -290, [0.95, 0.96, 1], 0.62], self: 0.35, top: [90, 154, 222], bot: [182, 218, 246], sun: [0.7, 0.32, 1], moon: [1, 1, 0], stars: 0 },
  { h: 17.6, tint: [1, 0.74, 0.56], amb: [0.86, 0.64, 0.52], L: [220, -120, [1, 0.52, 0.26], 1.0], self: 0.6, top: [82, 78, 160], bot: [255, 140, 90], sun: [0.86, 0.76, 1], moon: [1, 1, 0], stars: 0 },
  { h: 18.8, tint: [0.64, 0.58, 0.72], amb: [0.58, 0.52, 0.64], L: [200, -60, [0.95, 0.5, 0.45], 0.45], self: 0.85, top: [36, 36, 92], bot: [178, 92, 108], sun: [0.95, 1.05, 0.6], moon: [0.2, 0.7, 0.3], stars: 0.3 },
  { h: 20, tint: [0.42, 0.46, 0.64], amb: [0.4, 0.44, 0.62], L: [110, -260, [0.62, 0.72, 1], 0.38], self: 1, top: [8, 12, 40], bot: [26, 36, 76], sun: [0.95, 1.4, 0], moon: [0.3, 0.42, 1], stars: 1 },
  { h: 24, tint: [0.42, 0.46, 0.64], amb: [0.4, 0.44, 0.62], L: [110, -260, [0.62, 0.72, 1], 0.38], self: 1, top: [8, 12, 40], bot: [26, 36, 76], sun: [0.5, 1.4, 0], moon: [0.62, 0.3, 1], stars: 1 },
];
const NAME = h => (h >= 5.5 && h < 9.5 ? 'morning' : h >= 9.5 && h < 16.8 ? 'day' : h >= 16.8 && h < 19.4 ? 'sunset' : 'night');
// 지금 시각(0~24): over = 촬영 · 검토용으로 정한 시각(?hour=18.5)
export function hourNow(over = null) {
  if (over != null && over !== '' && Number.isFinite(+over)) return ((+over % 24) + 24) % 24;
  const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
export function dayAt(h) {
  let i = 0; while (i < K.length - 2 && h >= K[i + 1].h) i++;
  const A = K[i], B = K[i + 1], k = Math.max(0, Math.min(1, (h - A.h) / (B.h - A.h || 1))), s = k * k * (3 - 2 * k);
  return {
    h, name: NAME(h), tint: mix(A.tint, B.tint, s), amb: mix(A.amb, B.amb, s), self: lerp(A.self, B.self, s), stars: lerp(A.stars, B.stars, s),
    L: { dx: lerp(A.L[0], B.L[0], s), dy: lerp(A.L[1], B.L[1], s), c: mix(A.L[2], B.L[2], s), I: lerp(A.L[3], B.L[3], s) },
    top: mix(A.top, B.top, s), bot: mix(A.bot, B.bot, s), sun: mix(A.sun, B.sun, s), moon: mix(A.moon, B.moon, s),
  };
}
// 식물 빛(art/plantlight.js opt.light): (x, y) = 식물 자리(흙 줄) — 해 · 달은 멀리서 오는 빛이라 식물마다 같은 방향
export const dayLight = (D, x, y, id) => ({ amb: D.amb, self: D.self, id, lights: [{ x: x + D.L.dx, y: y + D.L.dy, z: 150, r: 420, c: D.L.c, I: D.L.I }] });

// 색 물들임: '#rrggbb' × tint(방이 그 시각 빛을 받은 색) — 같은 색 · 같은 물들임은 한 번만 셈
const TC = new Map();
export function tintHex(hex, t) {
  if (!t || (t[0] === 1 && t[1] === 1 && t[2] === 1)) return hex;
  const key = hex + '|' + t.map(v => v.toFixed(3)).join(','); let v = TC.get(key);
  if (!v) {
    const n = parseInt(hex.slice(1, 7), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x, i) => Math.min(255, Math.round(x * t[i])));
    v = '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
    if (TC.size > 4000) TC.clear(); TC.set(key, v);
  }
  return v;
}

// ── 천장 창 하늘(배경 그림의 창 칸만 바꿔 그림) ──
let SKY = null;
// 창 칸 찾기: 하늘빛(파랑이 빨강보다 18↑ · 초록이 빨강보다 10↑) 또는 해(밝은 노랑)인 칸 중 창 가운데에서 이어진 것만(옆벽 하늘색 줄은 뺌)
function skyMask(bg) {
  const c = document.createElement('canvas'); c.width = bg.width; c.height = 60;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bg, 0, 0);
  const d = x.getImageData(0, 0, bg.width, 60).data, W = bg.width, H = 60, ok = new Uint8Array(W * H), m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; ok[i] = (b - r >= 18 && g - r >= 10) || (r > 240 && g > 235 && b > 200 && r >= b) ? 1 : 0; }
  const st = [Math.round(W / 2) + 25 * W]; m[st[0]] = 1;
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  while (st.length) { const i = st.pop(), px = i % W, py = (i / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < W * H && Math.abs((j % W) - px) <= 1 && ok[j] && !m[j]) { m[j] = 1; st.push(j); } }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const mk = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) mk[y * w + xx] = m[(y0 + y) * W + x0 + xx];
  return { x0, y0, w, h, mk, cv, cx: cv.getContext('2d'), img: null, key: '' };
}
const hs = n => { let h = Math.imul(n | 0, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// D = dayAt(…) · t = ms(별 반짝임) · (ox, oy) = 배경을 그린 자리
export function drawSky(g, bg, D, t, ox = 0, oy = 0) {
  if (!bg || typeof document === 'undefined') return;
  if (!SKY || SKY.bg !== bg) { SKY = skyMask(bg); SKY.bg = bg; }
  const S = SKY, tq = Math.floor(t / 250), key = D.h.toFixed(3) + '|' + tq;
  if (S.key !== key) {
    const img = S.img || (S.img = S.cx.createImageData(S.w, S.h)), o = img.data, [sx, sy, sa] = D.sun, [mx, my, ma] = D.moon;
    const SX = sx * S.w, SY = sy * S.h, MX = mx * S.w, MY = my * S.h, sun = [255, 236, 190].map((v, i) => lerp(v, [255, 150, 90][i], Math.max(0, Math.min(1, (sy - 0.4) / 0.5))));
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
      const i = y * S.w + x, p = i * 4; if (!S.mk[i]) { o[p + 3] = 0; continue; }
      const v = y / Math.max(1, S.h - 1);
      let r = lerp(D.top[0], D.bot[0], v), gg = lerp(D.top[1], D.bot[1], v), b = lerp(D.top[2], D.bot[2], v);
      // 해 둘레 번짐(해가 낮을수록 넓고 붉게)
      if (sa > 0) { const d = Math.hypot(x - SX, (y - SY) * 1.6), a = sa * Math.max(0, 1 - d / (S.w * 0.35)) ** 2 * 0.55; r = lerp(r, sun[0], a); gg = lerp(gg, sun[1], a); b = lerp(b, sun[2], a); }
      // 낮 빛줄(원래 그림처럼 비스듬한 밝은 띠)
      const day = Math.max(0, 1 - Math.abs(D.h - 13) / 5) * sa;
      if (day > 0 && (((x + y * 1.9) / 26) % 1) < 0.18) { r = lerp(r, 236, 0.25 * day); gg = lerp(gg, 246, 0.25 * day); b = lerp(b, 254, 0.25 * day); }
      // 별(밤 — 칸마다 정해진 자리에서 반짝)
      if (D.stars > 0) { const hv = hs(x * 131 + y * 7919); if (hv > 0.985) { const tw = 0.55 + 0.45 * Math.sin(tq * 0.9 + hv * 60), a = D.stars * tw; r = lerp(r, 255, a); gg = lerp(gg, 250, a); b = lerp(b, 235, a); } }
      // 해 · 달 원반
      if (sa > 0.02) { const d = Math.hypot(x - SX, y - SY), R = 3.2 + 1.8 * Math.max(0, sy - 0.4); if (d <= R) { r = lerp(r, sun[0], sa); gg = lerp(gg, sun[1], sa); b = lerp(b, sun[2], sa); } }
      if (ma > 0.02) { const d = Math.hypot(x - MX, y - MY), d2 = Math.hypot(x - MX - 1.6, y - MY + 1); if (d <= 3.4 && d2 > 2.8) { r = lerp(r, 240, ma); gg = lerp(gg, 238, ma); b = lerp(b, 214, ma); } }
      o[p] = r; o[p + 1] = gg; o[p + 2] = b; o[p + 3] = 255;
    }
    S.cx.putImageData(img, 0, 0); S.key = key;
  }
  g.c.drawImage(S.cv, ox + S.x0, oy + S.y0);
}
// 배경 그림을 그 시각 빛으로 물들인 한 장(물들임이 바뀔 때만 다시 — 하늘 창은 drawSky 가 덮음)
let BGT = null;
export function tintedBg(bg, tint) {
  if (!bg || typeof document === 'undefined') return bg;
  const key = tint.map(v => v.toFixed(3)).join(',');
  if (tint[0] === 1 && tint[1] === 1 && tint[2] === 1) return bg;
  if (BGT && BGT.bg === bg && BGT.key === key) return BGT.cv;
  if (!BGT || BGT.bg !== bg) { const cv = document.createElement('canvas'); cv.width = bg.width; cv.height = bg.height; BGT = { bg, cv, cx: cv.getContext('2d') }; }
  const c = BGT.cx; c.globalCompositeOperation = 'source-over'; c.drawImage(bg, 0, 0);
  c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgb(${tint.map(v => Math.round(v * 255)).join(',')})`; c.fillRect(0, 0, bg.width, bg.height);
  c.globalCompositeOperation = 'source-over'; BGT.key = key;
  return BGT.cv;
}
