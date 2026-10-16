// 식물에 입히는 상태 효과 연출 — 걸릴 때 · 턴 끝 피해 때 · 쉬는 차례(2026-10-16 사용자 "디버프에 관한 연출도 식물에게 넣어줘. 독이나 화상 데미지 등
//  추후에 데미지나 효과 입을 때. 화상의 경우 잠깐 타들어가는 효과 준다거나 등. 소스 조사하고 샘플 보여줘봐")
// 조사:
//  · 타들어감 = '녹아 사라짐(dissolve) + 타는 띠' 기법 — 잡음 값이 문턱보다 낮은 칸을 태우고, 문턱 바로 위 좁은 띠를 불꽃으로(띠는 그림 테두리가 아니라 타는 앞쪽을 따라감)
//    — godotshaders '2D dissolve with burn edge' · gamedev.net shaderlab 'sprite dissolve' · Mirza Beig 'Dissolve Shader'. 여기선 아래 → 위로 번지게 높이를 섞고, 사라지지 않고 그을림만 남겼다 돌아옴.
//  · 불 색 = 가운데 흰빛 → 노랑 → 주황 → 짙은 빨강(가장자리 갈색 금지 — 연기·흙처럼 읽힘), 밑동은 흔들리지 않게, 둘레를 데우는 빛(sprite-ai.art 불 도트)
//  · 효과마다 색 하나 — 화상 주황 · 독 보라 · 빙결 하늘 · 감전 노랑(포켓몬 5세대: 마비면 노랗게 빛남, 2세대부터 화상 · 독 피해 연출이 따로)
//  · 도트 그림에 맞게 그림 1화소 = 1칸으로만 그림(매끈한 흐림 없이, 색 몇 개) — GodotCon 2026 '도트 그림 절차 효과'(잡음 · 색 줄이기)
import { plantLayer } from './sprites.js';

export const SFX_LIFE = { burn: 950, poison: 900, shock: 700, paral: 800, chill: 900, frozen: 1050, wet: 900, stun: 1150, spore: 800, bloom: 1000, steam: 800 };
// 사건 → 연출: 걸릴 때(fx) · 턴 끝 피해(tick) · 피어남(bloom) · 쉬는 차례(skip: 얼음 · 마비 · 기절) · 풀림(cure = 김)
export const SFX_OF_FX = { burn: 'burn', poison: 'poison', shock: 'shock', paral: 'paral', chill: 'chill', frozen: 'frozen', wet: 'wet', stun: 'stun', spore: 'spore' };
export function sfxAdd(list, who, kind, t) { if (SFX_LIFE[kind]) list.push({ who, kind, t0: t, id: (list.n = (list.n || 0) + 1) }); }
export const sfxAlive = (list, t) => list.filter(e => t - e.t0 < SFX_LIFE[e.kind]);

// ── 도움 ──
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const oQ = x => 1 - (1 - x) * (1 - x);
const ioQ = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
function kf(ms, L) { if (ms <= L[0][0]) return L[0][1]; for (let i = 1; i < L.length; i++) { const [t1, v1, e] = L[i]; if (ms <= t1) { const [t0, v0] = L[i - 1], k = (ms - t0) / (t1 - t0); return v0 + (v1 - v0) * (e ? e(k) : k); } } return L[L.length - 1][1]; }
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 0x9e37, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const RGB = new Map(), rgb = hex => { let v = RGB.get(hex); if (!v) { const n = parseInt(hex.slice(1, 7), 16); RGB.set(hex, v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]); } return v; };
const keyHash = s => { let h = 7; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
// 값 잡음(칸 6 + 칸 3) — 식물마다 같은 무늬(같은 식물은 늘 같은 자리부터 탐)
const NOISE = new Map();
function noiseOf(key, w, h) {
  const id = key + ':' + w + 'x' + h; let N = NOISE.get(id); if (N) return N;
  const s = keyHash(key) & 0xffff, vn = (x, y, o) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), H = (a, b) => hash(a + o * 131 + s, b + o * 71); return (H(xi, yi) * (1 - u) + H(xi + 1, yi) * u) * (1 - v) + (H(xi, yi + 1) * (1 - u) + H(xi + 1, yi + 1) * u) * v; };
  N = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) N[y * w + x] = 0.65 * vn(x / 6, y / 6, 1) + 0.35 * vn(x / 3, y / 3, 2);
  NOISE.set(id, N); return N;
}
// 겹쳐 그릴 판(식물 그림과 같은 크기) — 한 장을 돌려 씀
let ovCv = null, ovCx = null, ovImg = null;
function overlay(w, h) {
  if (!ovCv) { ovCv = document.createElement('canvas'); ovCx = ovCv.getContext('2d'); }
  if (ovCv.width !== w || ovCv.height !== h || !ovImg) { ovCv.width = w; ovCv.height = h; ovImg = ovCx.createImageData(w, h); }
  ovImg.data.fill(0); return ovImg;
}
function put(ov, i, hex, a) { if (a <= 0) return; const [r, g, b] = rgb(hex), d = ov.data, k = i * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = Math.round(cl(a) * 255); }
function blit(g, L, ov) {
  ovCx.putImageData(ov, 0, 0);
  const c = g.c; c.save(); c.imageSmoothingEnabled = false;
  if (L.flip) { c.translate(L.x + L.w, L.y); c.scale(-1, 1); c.drawImage(ovCv, 0, 0); } else c.drawImage(ovCv, L.x, L.y);
  c.restore();
}
// 그림 좌표 → 화면 칸(뒤집기 반영)
const scr = (L, px, py) => [L.flip ? L.x + (L.w - 1 - px) : L.x + px, L.y + py];
function dot(g, x, y, hex, a = 1, s = 1) { if (a <= 0) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.rect(Math.round(x), Math.round(y), s, s, hex); c.globalAlpha = p; }
// 보이는 식물 칸 정보: 불투명 칸 목록 · 위아래 끝 · 높이 비율(아래 0 → 위 1) · 테두리 칸
function scan(L) {
  const { w, h } = L, a = L.img.data, op = [], H = new Float32Array(w * h);
  let y0 = h, y1 = -1, x0 = w, x1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 40) { op.push(y * w + x); if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const span = Math.max(1, y1 - y0);
  for (const i of op) H[i] = (y1 - Math.floor(i / w)) / span;
  const alpha = i => a[i * 4 + 3] > 40;
  return { op, H, y0, y1, x0, x1, alpha, cx: (x0 + x1) / 2 };
}
const edgeOf = (L, S, i) => { const { w, h } = L, x = i % w, y = Math.floor(i / w); return x === 0 || y === 0 || x === w - 1 || y === h - 1 || !S.alpha(i - 1) || !S.alpha(i + 1) || !S.alpha(i - w) || !S.alpha(i + w); };
// 미리 뽑아 둔 칸(효과 하나가 처음 그려질 때 — 같은 효과 동안 같은 자리에서 나오게)
function picks(e, S, n, filter, salt) {
  const key = 'p' + salt; if (e[key]) return e[key];
  const pool = S.op.filter(filter), out = [];
  for (let k = 0; k < n && pool.length; k++) out.push(pool[Math.floor(hash(e.id * 97 + k, salt) * pool.length)]);
  return (e[key] = out);
}

// ── 화상: 아래에서 위로 타는 띠가 올라갔다 내려오고, 지나간 자리는 잠깐 그을림 · 불꽃 혀 · 불티 · 연기 ──
const FIRE = ['#fff3c4', '#ffc23a', '#ff6a1a', '#c8281e'];
function burn(g, L, S, e, age, N) {
  const ov = overlay(L.w, L.h), band = 0.1, f = Math.floor(age / 60);
  const th = kf(age, [[0, -0.06], [280, 0.6, oQ], [430, 0.6], [950, -0.06, ioQ]]), soot = age < 560 ? 1 : 1 - (age - 560) / 390;
  const Sv = i => 0.62 * S.H[i] + 0.38 * N[i];
  for (const i of S.op) {
    const s = Sv(i);
    if (s < th - band) { const a = Math.min(0.78, ((th - band - s) / 0.2) * 0.78) * soot, coal = hash(i, f) < 0.04; put(ov, i, coal ? '#ff7a2a' : '#1a0c08', coal ? 0.9 * soot : a); }   // 그을림(가끔 숯불 칸)
    else if (s < th) { const u = (s - (th - band)) / band + (hash(i, f) - 0.5) * 0.3; put(ov, i, FIRE[u < 0.25 ? 0 : u < 0.55 ? 1 : u < 0.8 ? 2 : 3], 1); }   // 타는 띠
    else if (s < th + 0.05) put(ov, i, '#ff8a3a', 0.28);   // 띠 바로 위 = 달아오름
  }
  // 불꽃 혀: 타는 띠가 그림 윗선에 닿은 기둥에서 위로 2~4칸(60ms마다 흔들림)
  if (th > 0) for (let x = 0; x < L.w; x++) {
    let top = -1;
    for (let y = S.y0; y <= S.y1; y++) { const i = y * L.w + x; if (S.alpha(i)) { const s = Sv(i); if (s >= th - band && s < th + 0.02) top = i; break; } }
    if (top < 0 || hash(x, f) > 0.55) continue;
    const hgt = 2 + Math.floor(hash(x + 31, f) * 3), ty = Math.floor(top / L.w);
    for (let k = 1; k <= hgt && ty - k >= 0; k++) put(ov, (ty - k) * L.w + x, FIRE[Math.min(3, k)], 1);
  }
  blit(g, L, ov);
  // 불티: 타는 띠에서 떨어져 나와 흔들리며 위로(1칸)
  const sp = picks(e, S, 20, i => S.H[i] < 0.75, 1);
  sp.forEach((i, k) => {
    const ts = k * 30, a = age - ts, life = 560; if (a < 0 || a > life) return;
    const [x, y] = scr(L, i % L.w, Math.floor(i / L.w)), q = a / life;
    dot(g, x + Math.sin(a / 90 + k) * 1.5, y - q * (22 + 12 * hash(k, 9)), q < 0.4 ? '#ffe08a' : q < 0.75 ? '#ff8a2a' : '#c8281e', 1 - q * q, k % 4 === 0 && q < 0.5 ? 2 : 1);
  });
  // 연기: 그을린 꼭대기에서 회색 2칸이 위로
  if (age > 380) for (let k = 0; k < 4; k++) {
    const a = age - 380 - k * 70; if (a < 0) continue;
    const q = a / 500; if (q > 1) continue;
    const [x, y] = scr(L, Math.round(S.cx + (hash(e.id, k) - 0.5) * (S.x1 - S.x0) * 0.6), S.y0 + Math.round((S.y1 - S.y0) * 0.35));
    puff(g, x + Math.sin(a / 140 + k) * 2, y - q * 16, '#5a5560', 0.6 * (1 - q), q < 0.5 ? 1 : 2);
  }
}
// 둥근 덩이(연기 · 김 · 포자 구름): r 1 = 3칸 더하기 모양, 2 = 5칸 둥근 덩이
function puff(g, x, y, hex, a, r = 1) {
  x = Math.round(x); y = Math.round(y);
  if (r === 1) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) dot(g, x + dx, y + dy, hex, a); return; }
  for (let dy = -2; dy <= 2; dy++) { const w = Math.abs(dy) === 2 ? 1 : 2; for (let dx = -w; dx <= w; dx++) dot(g, x + dx, y + dy, hex, a); }
}

// ── 독: 보라로 두 번 물들고(얼룩) · 거품이 올라와 톡 터짐 ──
function poison(g, L, S, e, age, N) {
  const ov = overlay(L.w, L.h), p1 = Math.sin(Math.PI * cl(age / 260)), p2 = Math.sin(Math.PI * cl((age - 330) / 270)) * 0.7, a = 0.42 * Math.max(p1, p2);
  if (a > 0.01) { for (const i of S.op) put(ov, i, N[i] > 0.6 ? '#6a1fb0' : '#9a46e8', a + (N[i] > 0.6 ? 0.18 : 0)); blit(g, L, ov); }
  const sp = picks(e, S, 11, i => S.H[i] > 0.25, 2);
  sp.forEach((i, k) => {
    const ts = k * 50, b = age - ts, life = 520; if (b < 0 || b > life + 110) return;
    const [x0, y0] = scr(L, i % L.w, Math.floor(i / L.w)), q = Math.min(1, b / life), x = Math.round(x0 + Math.sin(b / 110 + k) * 1.2), y = Math.round(y0 - q * (12 + 8 * hash(k, 4)));
    if (b <= life) {   // 거품: 큰 것 = 5칸 고리(속 반투명 · 빛 한 점), 작은 것 = 3칸 고리
      if (k % 3 !== 0) {
        for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]]) dot(g, x + dx, y + dy, '#e0b8ff', 0.95);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) dot(g, x + dx, y + dy, '#8a3fd0', 0.45);
        dot(g, x - 1, y - 1, '#ffffff', 0.95);
      } else { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) dot(g, x + dx, y + dy, '#e0b8ff', 0.95); dot(g, x, y, '#8a3fd0', 0.5); }
    } else { const r = (b - life) / 110; for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -3], [0, 3]]) dot(g, x + dx * (0.7 + r), y + dy * (0.7 + r), '#e0b8ff', 1 - r); }   // 톡
  });
}

// 칸 선(브레즌햄) — 번개 줄기
function pixLine(g, x0, y0, x1, y1, hex, a) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (let n = 0; n < 200; n++) { dot(g, x0, y0, hex, a); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
// ── 감전 · 마비: 노랗게 번쩍번쩍 · 그림 위를 가로지르는 번개(70ms마다 새로) · 불똥 ──
function shock(g, L, S, e, age, strong) {
  const f = Math.floor(age / 60), on = age < (strong ? 520 : 360) && f % 2 === 0;
  if (on) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#fff27a', strong ? 0.62 : 0.5); blit(g, L, ov); }
  const b = Math.floor(age / 70); if (age > (strong ? 640 : 500) || b % 3 === 2) return;
  const n = strong ? 4 : 3;
  for (let k = 0; k < n; k++) {
    const pa = S.op[Math.floor(hash(e.id * 13 + k, b) * S.op.length)], pb = S.op[Math.floor(hash(e.id * 17 + k, b + 99) * S.op.length)];
    if (pa == null || pb == null) continue;
    let [x, y] = scr(L, pa % L.w, Math.floor(pa / L.w)); const [x2, y2] = scr(L, pb % L.w, Math.floor(pb / L.w));
    for (let s = 1; s <= 4; s++) {
      const t = s / 4, nx = s === 4 ? x2 : x + (x2 - x) / (5 - s) + (hash(k * 7 + s, b) - 0.5) * 8, ny = s === 4 ? y2 : y + (y2 - y) / (5 - s) + (hash(k * 5 + s, b + 7) - 0.5) * 8;
      pixLine(g, x + 1, y, nx + 1, ny, '#ffd84a', 0.55); pixLine(g, x, y, nx, ny, '#fffbd0', 1);
      x = nx; y = ny;
    }
    for (let j = 0; j < 2; j++) { const q = (age % 210) / 210, an = hash(k, j + b) * 6.28; dot(g, x2 + Math.cos(an) * q * 6, y2 + Math.sin(an) * q * 6, '#ffe680', 1 - q); }
  }
}

// ── 빙결 · 얼음: 서리가 아래에서 위로 덮였다 걷힘(얼음 = 끝까지 덮고 테두리 흰 얼음) · 얼음 결정 반짝 ──
function frost(g, L, S, e, age, N, full) {
  const ov = overlay(L.w, L.h), life = full ? SFX_LIFE.frozen : SFX_LIFE.chill, top = full ? 1.12 : 0.55;
  const th = kf(age, [[0, -0.05], [full ? 380 : 320, top, oQ], [full ? 720 : 600, top], [life, -0.05, ioQ]]), band = 0.07, keep = age < life * 0.7 ? 1 : 1 - (age - life * 0.7) / (life * 0.3);
  for (const i of S.op) {
    const s = 0.62 * S.H[i] + 0.38 * N[i];
    if (s < th - band) put(ov, i, full && edgeOf(L, S, i) ? '#ffffff' : '#d8f6ff', (full && edgeOf(L, S, i) ? 0.85 : 0.5) * keep);
    else if (s < th) put(ov, i, '#ffffff', 0.9 * keep);
    else if (s < th + 0.05) put(ov, i, '#8fd8ff', 0.3 * keep);
  }
  blit(g, L, ov);
  const sp = picks(e, S, full ? 8 : 6, i => edgeOf(L, S, i), 3);
  sp.forEach((i, k) => {
    const ts = 150 + k * 70, a = age - ts, life2 = full ? 700 : 520; if (a < 0 || a > life2) return;
    const [x, y] = scr(L, i % L.w, Math.floor(i / L.w)), z = Math.sin(Math.PI * a / life2), r = Math.round(z * (full ? 3 : 2));
    dot(g, x, y, '#ffffff', z);
    for (let d = 1; d <= r; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) dot(g, x + dx, y + dy, d === r ? '#8fd8ff' : '#e8f8ff', z);
  });
}

// ── 젖음: 잠깐 짙게 젖은 빛 · 윗부분 물기 반짝 · 물방울이 떨어져 흙에서 튐 ──
function wet(g, L, S, e, age, N) {
  const ov = overlay(L.w, L.h), a = 0.32 * Math.sin(Math.PI * cl(age / 600));
  if (a > 0.01) { for (const i of S.op) { const sheen = S.H[i] > 0.4 && N[i] > 0.66; put(ov, i, sheen ? '#e6f7ff' : '#2f6fb8', sheen ? a * 1.8 : a); } blit(g, L, ov); }   // 짙게 젖은 빛 + 윗부분 물기 반짝
  const sp = picks(e, S, 12, i => S.H[i] > 0.3 && !S.alpha(i + L.w), 4);
  sp.forEach((i, k) => {   // 물방울(1×3칸: 밝은 꼭대기 · 물빛 · 짙은 아래) → 흙에 닿으면 양옆으로 튐
    const ts = k * 55, b = age - ts; if (b < 0) return;
    const [x, y0] = scr(L, i % L.w, Math.floor(i / L.w)), floor = L.y + S.y1, tau = b / 1000, y = y0 + 0.5 * 320 * tau * tau;
    if (y < floor - 2) { dot(g, x, y, '#ffffff', 1); dot(g, x, y + 1, '#8fd3ff', 1); dot(g, x, y + 2, '#4f9dff', 1); }
    else { const land = Math.sqrt((2 * (floor - 2 - y0)) / 320) * 1000, r = (b - land) / 180; if (r < 1) for (const s of [-1, 1]) { dot(g, x + s * (1 + r * 3), floor - 1 - r * 3 + r * r * 3, '#8fd3ff', 1 - r); dot(g, x + s * (2 + r * 4), floor - r * 2, '#e6f7ff', 0.8 * (1 - r)); } }
  });
}

// ── 기절: 머리 위를 도는 별 셋(뒤로 갈 땐 흐리게) ──
function stun(g, L, S, e, age) {
  const life = SFX_LIFE.stun, a = Math.min(1, age / 120, (life - age) / 200), [cx, top] = scr(L, Math.round(S.cx), S.y0);
  // 별(5×5 도트: 꼭짓점 다섯 · 흰 가운데 · 주황 테두리 칸) 셋이 머리 위 타원을 돎
  const STAR = ['...o...', '..oyo..', 'ooyyyoo', '.oywyo.', '..yyy..', '.oy.yo.', '.o...o.'], C = { o: '#d07a10', y: '#ffe27a', w: '#ffffff' };
  for (let k = 0; k < 3; k++) {
    const an = age * 0.006 + (k * Math.PI * 2) / 3, x = Math.round(cx + Math.cos(an) * 18) - 3, y = Math.round(top - 9 + Math.sin(an) * 5) - 3, al = a * (Math.sin(an) < 0 ? 0.45 : 1);
    STAR.forEach((row, dy) => [...row].forEach((ch, dx) => { if (C[ch]) dot(g, x + dx, y + dy, C[ch], al); }));
  }
}

// ── 포자 · 피어남: 위에서 포자 알갱이가 퍼짐(피어남 = 크게 퍼지고 연둣빛으로 물듦) ──
function spores(g, L, S, e, age, big) {
  const life = big ? SFX_LIFE.bloom : SFX_LIFE.spore;
  if (big) { const ov = overlay(L.w, L.h), a = 0.35 * Math.sin(Math.PI * cl(age / 600)); if (a > 0.01) { for (const i of S.op) put(ov, i, '#a8d060', a); blit(g, L, ov); } }
  const sp = picks(e, S, big ? 26 : 16, i => S.H[i] > (big ? 0.35 : 0.5), big ? 5 : 6);
  sp.forEach((i, k) => {   // 포자 알갱이(2칸 · 가끔 더하기 모양) — 바깥으로 퍼지며 살짝 떠오름
    const ts = k * (big ? 18 : 30), b = age - ts, life2 = life - ts; if (b < 0 || b > life2) return;
    const [x0, y0] = scr(L, i % L.w, Math.floor(i / L.w)), q = b / life2, an = hash(e.id + k, 7) * Math.PI * 2, d = oQ(q) * (big ? 24 : 14), x = x0 + Math.cos(an) * d, y = y0 + Math.sin(an) * d * 0.7 - q * 10;
    if (k % 4 === 0) puff(g, x, y, '#f4ffc0', 1 - q); else dot(g, x, y, k % 2 ? '#f4ffc0' : '#c8e888', 1 - q, 2);
  });
  if (big && age < 600) for (let k = 0; k < 3; k++) {   // 포자 구름 덩이
    const q = cl((age - k * 90) / 450); if (q <= 0 || q >= 1) continue;
    const [x, y] = scr(L, Math.round(S.cx + (k - 1) * 10), S.y0 + Math.round((S.y1 - S.y0) * 0.3)), r = 4 + q * 10, c = g.c;
    c.save(); c.globalAlpha *= 0.35 * (1 - q); c.fillStyle = '#cfe89a'; c.beginPath(); c.arc(x, y - q * 6, r, 0, Math.PI * 2); c.fill(); c.restore();
  }
}

// ── 김(물에 화상이 꺼짐 · 불에 얼음이 녹음): 하얀 김이 위로 ──
function steam(g, L, S, e, age) {
  for (let k = 0; k < 12; k++) {   // 하얀 김 덩이(아래 한 줄 회색 — 밝은 바탕에서도 보이게)가 흔들리며 올라가 커지고 흐려짐
    const a = age - k * 40, q = a / 560; if (a < 0 || q > 1) continue;
    const [x0, y0] = scr(L, Math.round(S.x0 + hash(e.id, k) * (S.x1 - S.x0)), S.y0 + Math.round((S.y1 - S.y0) * (0.15 + 0.45 * hash(k, e.id)))), x = x0 + Math.sin(a / 120 + k) * 2, y = y0 - q * 22;
    puff(g, x, y + 1, '#9aa6b4', 0.5 * (1 - q), 2); puff(g, x, y, '#f2f6fa', 0.9 * (1 - q), 2);
  }
}

// 식물 하나 위에 그 식물의 효과를 모두(식물을 그린 바로 뒤에 부름). p = { key, pot, bx, by, flip, view, t, phase }
export function drawSfx(g, list, who, t, p) {
  let L = null, S = null, N = null;
  for (const e of list) {
    if (e.who !== who) continue;
    const age = t - e.t0; if (age < 0 || age >= SFX_LIFE[e.kind]) continue;
    if (!L) { L = plantLayer(p.key, p.pot, p.bx, p.by, { t: p.t, phase: p.phase, flip: p.flip, view: p.view }); if (!L) return; S = scan(L); if (!S.op.length) return; N = noiseOf(p.key, L.w, L.h); }
    if (e.kind === 'burn') burn(g, L, S, e, age, N);
    else if (e.kind === 'poison') poison(g, L, S, e, age, N);
    else if (e.kind === 'shock' || e.kind === 'paral') shock(g, L, S, e, age, e.kind === 'paral');
    else if (e.kind === 'chill' || e.kind === 'frozen') frost(g, L, S, e, age, N, e.kind === 'frozen');
    else if (e.kind === 'wet') wet(g, L, S, e, age, N);
    else if (e.kind === 'stun') stun(g, L, S, e, age);
    else if (e.kind === 'spore' || e.kind === 'bloom') spores(g, L, S, e, age, e.kind === 'bloom');
    else if (e.kind === 'steam') steam(g, L, S, e, age);
  }
}
// 화상 중 둘레를 데우는 빛(식물보다 먼저 — 바닥에 깔림)
export function drawSfxGlow(g, list, who, t, bx, by) {
  for (const e of list) {
    if (e.who !== who || e.kind !== 'burn') continue;
    const age = t - e.t0; if (age < 0 || age >= SFX_LIFE.burn) continue;
    const a = 0.32 * Math.sin(Math.PI * cl(age / SFX_LIFE.burn)), c = g.c, gr = c.createRadialGradient(bx, by - 26, 4, bx, by - 26, 46);
    gr.addColorStop(0, `rgba(255,140,50,${a.toFixed(3)})`); gr.addColorStop(1, 'rgba(255,140,50,0)');
    c.save(); c.fillStyle = gr; c.fillRect(bx - 50, by - 76, 100, 92); c.restore();
  }
}
