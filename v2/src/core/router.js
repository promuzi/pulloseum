// 화면 전환. 기본 = 어두운 점이 차오르며 사라지고(110ms) 새 화면이 점이 빠지며 나타남(도트식 페이드).
// 금속·도트 전환 후보(2026-10-15 사용자 "전투장 이동이나 대기, 종료 화면 등은 심플한 금속 느낌의 부딪힘이나 도트 느낌, 애매하면 후보 여러 장"):
//   shutter = 위아래 철 셔터가 쾅(록맨 보스 셔터처럼 닫힌 채 잠깐 멈춤) · doors = 좌우 미닫이 철문 · iris = 금속 테 원형 닫힘 ·
//   pixel = 도트가 커졌다 풀림 · blinds = 철 블라인드 판이 차례로 닫힘. 금속은 닿는 순간 판이 흔들리고 불꽃 몇 칸.
// 근거 = docs/superpowers/specs/2026-10-15-v2-look-references.md(화면 전환 줄)
// 그리기 전에 화면의 장소 테마를 고른다(scene.theme = 키 또는 (app) => 키).
import { C, BAYER4 } from '../art/palette.js';
import { setTheme } from '../art/theme.js';

const STEEL = { hi: '#e8ecf2', a: '#c6ccd6', b: '#a2aab8', c: '#7e8796', d: '#596170', edge: '#2a2f3a', rivet: '#eef2f8', rivetLo: '#4a5160' };
export const TRANSITIONS = {
  dither: { close: 110, hold: 0, open: 110 },
  shutter: { close: 210, hold: 170, open: 240, metal: true },
  doors: { close: 220, hold: 170, open: 240, metal: true },
  iris: { close: 260, hold: 140, open: 260, metal: true },
  pixel: { close: 260, hold: 60, open: 260 },
  blinds: { close: 300, hold: 140, open: 260, metal: true },
};

export class Router {
  constructor(scenes) { this.scenes = scenes; this.cur = null; this.name = null; this.pending = null; this.t0 = 0; this.phase = 0; this.style = 'dither'; }
  set(name, params) {
    const sc = this.scenes[name]; if (!sc) throw new Error('scene ' + name);
    this.cur = sc; this.name = name; if (sc.enter) sc.enter(params || {});
    this.pending = null; this.phase = 0;
  }
  // style = 전환 이름(없으면 기본 점 페이드)
  go(name, params, now = performance.now(), style) {
    if (!this.cur) return this.set(name, params);
    this.pending = { name, params }; this.t0 = now; this.phase = 1; this.style = TRANSITIONS[style] ? style : 'dither';
  }
  draw(app) {
    const S = TRANSITIONS[this.style] || TRANSITIONS.dither;
    if (this.phase === 1 && app.t - this.t0 >= S.close) { const p = this.pending; this.set(p.name, p.params); this.phase = S.hold ? 3 : 2; this.t0 = app.t; }
    if (this.phase === 3 && app.t - this.t0 >= S.hold) { this.phase = 2; this.t0 = app.t; }
    if (this.phase === 2 && app.t - this.t0 >= S.open) this.phase = 0;
    const th = this.cur.theme;
    setTheme(typeof th === 'function' ? th.call(this.cur, app) : th || 'ship');
    this.cur.draw(app);
    if (!this.phase) return;
    const dt = app.t - this.t0;
    // 닫힘 정도 k(0 = 열림, 1 = 다 닫힘): 닫힐 땐 점점 빨라지고(떨어지는 철판), 열릴 땐 처음 빠르다 느려짐
    const k = this.phase === 1 ? Math.min(1, dt / S.close) ** 2 : this.phase === 3 ? 1 : 1 - (1 - (1 - Math.min(1, dt / S.open)) ** 2);
    const hold = this.phase === 3 ? dt : -1;
    DRAW[this.style](app.g, app.W, app.H, k, hold, app.t);
  }
}

// ── 그리기 ──
function fadeDither(g, W, H, k) {
  const level = Math.round(k * 16);
  if (level >= 16) return g.rect(0, 0, W, H, C.ink);
  if (level <= 0) return;
  g.c.fillStyle = C.ink;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BAYER4[y & 3][x & 3] < level) g.c.fillRect(x, y, 1, 1);
}
// 철판 한 장: (x, y, w, h), 닿는 가장자리 쪽(edge = 'top'|'bottom'|'left'|'right') — 판 결(띠)·리벳 줄·닿는 날 어두운 테
function plate(g, x, y, w, h, edge) {
  x = Math.round(x); y = Math.round(y);
  const horiz = edge === 'top' || edge === 'bottom';
  g.rect(x, y, w, h, STEEL.b);
  if (horiz) { for (let yy = y; yy < y + h; yy += 12) { g.rect(x, yy, w, 1, STEEL.a); g.rect(x, yy + 10, w, 1, STEEL.c); } }
  else { for (let xx = x; xx < x + w; xx += 12) { g.rect(xx, y, 1, h, STEEL.a); g.rect(xx + 10, y, 1, h, STEEL.c); } }
  // 닿는 날: 굵은 테 + 리벳
  const L = 6;
  if (edge === 'bottom') { g.rect(x, y + h - L, w, L, STEEL.d); g.rect(x, y + h - L, w, 1, STEEL.hi); g.rect(x, y + h - 1, w, 1, STEEL.edge); for (let xx = x + 8; xx < x + w; xx += 22) { g.rect(xx, y + h - 4, 2, 2, STEEL.rivet); g.px(xx + 1, y + h - 3, STEEL.rivetLo); } }
  if (edge === 'top') { g.rect(x, y, w, L, STEEL.d); g.rect(x, y, w, 1, STEEL.edge); g.rect(x, y + L - 1, w, 1, STEEL.c); for (let xx = x + 8; xx < x + w; xx += 22) { g.rect(xx, y + 2, 2, 2, STEEL.rivet); g.px(xx + 1, y + 3, STEEL.rivetLo); } }
  if (edge === 'right') { g.rect(x + w - L, y, L, h, STEEL.d); g.rect(x + w - L, y, 1, h, STEEL.hi); g.rect(x + w - 1, y, 1, h, STEEL.edge); for (let yy = y + 8; yy < y + h; yy += 22) { g.rect(x + w - 4, yy, 2, 2, STEEL.rivet); g.px(x + w - 3, yy + 1, STEEL.rivetLo); } }
  if (edge === 'left') { g.rect(x, y, L, h, STEEL.d); g.rect(x, y, 1, h, STEEL.edge); g.rect(x + L - 1, y, 1, h, STEEL.c); for (let yy = y + 8; yy < y + h; yy += 22) { g.rect(x + 2, yy, 2, 2, STEEL.rivet); g.px(x + 3, yy + 1, STEEL.rivetLo); } }
}
// 닿는 순간: 판이 위아래(또는 좌우)로 2칸 흔들리고 이음매에서 불꽃 몇 칸이 튐(처음 140ms)
const shake = hold => (hold >= 0 && hold < 120 ? [2, -2, 1, -1, 1, 0][Math.floor(hold / 20)] || 0 : 0);
function sparks(g, cx, cy, hold, horiz) {
  if (hold < 0 || hold > 150) return;
  const n = 10, k = hold / 150;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, sp = 18 + (i % 3) * 9, d = sp * k;
    const x = cx + (horiz ? (i - n / 2) * 22 : Math.cos(a) * d * 0.5), y = cy + (horiz ? Math.sin(a) * d * 0.6 : (i - n / 2) * 20);
    g.rect(Math.round(x), Math.round(y), 2, 1, k < 0.5 ? '#fff6c8' : '#ffb84a');
  }
}
const DRAW = {
  dither: (g, W, H, k) => fadeDither(g, W, H, k),
  shutter: (g, W, H, k, hold) => {
    const s = shake(hold), half = Math.ceil(H / 2);
    plate(g, 0, -half + half * k + s, W, half, 'bottom');
    plate(g, 0, H - half * k - s, W, half + 1, 'top');
    if (k >= 1) { g.rect(0, half - 1 + s, W, 2, STEEL.edge); sparks(g, W / 2, half, hold, true); }
  },
  doors: (g, W, H, k, hold) => {
    const s = shake(hold), half = Math.ceil(W / 2);
    plate(g, -half + half * k + s, 0, half, H, 'right');
    plate(g, W - half * k - s, 0, half + 1, H, 'left');
    if (k >= 1) { g.rect(half - 1 + s, 0, 2, H, STEEL.edge); sparks(g, half, H / 2, hold, false); }
  },
  iris: (g, W, H, k, hold) => {
    const R = Math.hypot(W, H) / 2 + 8, r = R * (1 - k), cx = W / 2, cy = H / 2, s = shake(hold);
    g.c.fillStyle = C.ink;
    for (let y = 0; y < H; y++) {   // 원 밖을 가로줄로 칠함(원 안 = 그대로)
      const dy = y + 0.5 - cy - s;
      if (Math.abs(dy) >= r) { g.c.fillRect(0, y, W, 1); continue; }
      const hw = Math.sqrt(r * r - dy * dy); g.c.fillRect(0, y, Math.max(0, Math.round(cx - hw)), 1); g.c.fillRect(Math.round(cx + hw), y, W, 1);
    }
    if (r > 2) for (let a = 0; a < 360; a += 1) { const t = a * Math.PI / 180; for (let w = 0; w < 4; w++) g.px(Math.round(cx + Math.cos(t) * (r + w)), Math.round(cy + s + Math.sin(t) * (r + w)), w === 0 ? STEEL.hi : w === 3 ? STEEL.edge : (a % 30 < 2 ? STEEL.rivet : STEEL.b)); }
    if (k >= 1) sparks(g, cx, cy, hold, true);
  },
  pixel: (g, W, H, k) => {   // 화면을 점점 큰 칸으로 뭉갰다가(2 → 32칸) 어둡게 → 새 화면은 반대로
    const cv = g.c.canvas, b = Math.max(1, Math.round(2 ** (k * 5)));
    if (b > 1) {
      const sw = Math.ceil(W / b), sh = Math.ceil(H / b);
      const tmp = DRAW._tmp || (DRAW._tmp = document.createElement('canvas'));
      tmp.width = sw; tmp.height = sh; const tc = tmp.getContext('2d'); tc.imageSmoothingEnabled = true;
      const tf = g.c.getTransform(), sc = tf.a || 1;
      tc.drawImage(cv, 0, 0, W * sc, H * sc, 0, 0, sw, sh);
      g.c.imageSmoothingEnabled = false; g.c.drawImage(tmp, 0, 0, sw, sh, 0, 0, sw * b, sh * b);
    }
    fadeDither(g, W, H, Math.max(0, (k - 0.55) / 0.45));
  },
  blinds: (g, W, H, k, hold) => {   // 위에서부터 철 블라인드 판(24칸)이 차례로 내려와 닫힘
    const n = Math.ceil(H / 24), s = shake(hold);
    for (let i = 0; i < n; i++) {
      const kk = Math.max(0, Math.min(1, k * 1.6 - (i / n) * 0.6)), hgt = Math.round(24 * kk);
      if (hgt <= 0) continue;
      const y = i * 24 + s;
      g.rect(0, y, W, hgt, STEEL.b); g.rect(0, y, W, 1, STEEL.hi); g.rect(0, y + Math.max(0, hgt - 2), W, 1, STEEL.c); g.rect(0, y + hgt - 1, W, 1, STEEL.edge);
      if (hgt > 10) for (let xx = 10; xx < W; xx += 30) { g.rect(xx, y + 4, 2, 2, STEEL.rivet); g.px(xx + 1, y + 5, STEEL.rivetLo); }
    }
    if (k >= 1) sparks(g, W / 2, H - 4, hold, true);
  },
};
