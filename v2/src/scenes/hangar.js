import { hud, navBar, button, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, holo, tbar } from '../art/theme.js';

// 탐사선 정비(2026-10-15 사용자 "탐사선 누르고 스펙 강화하는 창은 디스플레이에 떠 있는 탐사선 홀로그램에 각 부분을 강화하는 느낌으로"):
//  어두운 정비실 디스플레이 · 아래 투영기(빛 고리 + 위로 퍼지는 빛) · 그 위에 떠 있는 탐사선 홀로그램(위에서 본 모습 — 옛 게임 탐사선 그림의 구성:
//  앞 센서 돔 · 몸체 · 뒤 연료 탱크·추진기 · 옆 채집 팔). 반투명 디더 채움 + 밝은 테두리 + 주사선, 천천히 떠오르고 가끔 지직.
//  부위마다 점선 → 이름표(단계 점). 누르면 그 부위가 주황으로 빛나고 아래 판에 지금 → 다음 · 비용 · 강화. 강화하면 그 부위에서 스캔 고리가 퍼짐.
//  수치·이름 = 옛 게임 SHIP_UPGRADES(연료 탱크 = 탐사 궤도, 내구성 = 성공률, 채집기 = 보상 개수, 탐사 장치 = 높은 등급 확률)
const PARTS = [
  { id: 'scanner', label: '탐사 장치', desc: '높은 등급의 보상을 발견할 확률이 올라요', unit: '%', base: 10, step: 8, max: 140, anchor: [0, -44], box: [14, 74] },
  { id: 'durability', label: '내구성', desc: '탐사 성공률이 오르고 보상이 안정돼요', unit: '', base: 40, step: 12, max: 200, anchor: [-28, 12], box: [14, 258] },
  { id: 'harvester', label: '채집기', desc: '성공하면 가져오는 보상이 늘어나요', unit: '', base: 20, step: 8, max: 140, anchor: [49, 30], box: [178, 150] },
  { id: 'fuel_tank', label: '연료 탱크', desc: '탐사할 수 있는 궤도가 넓어져요', unit: '궤도', base: 1, step: 1, max: 4, anchor: [8, 50], box: [178, 316] },
];
const HC = { line: '#97e8f7', hi: '#e4fbff', fill: '#1e4a6a', fill2: '#2f7aa0', seam: '#4c88a9', sel: '#f0be7d', selFill: '#8a5a2a', selFill2: '#c48a48' };
const SHIP = { cx: 135, cy: 214 };
const DISP = { x: 8, y: 58, w: 254, h: 330 };
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// 다각형 안 칸들(한 번만 계산) — 좌표는 배 가운데 기준
function polyPx(pts) {
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const out = [];
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) out.push([x, y]);
  }
  return out;
}
const discPx = (cx, cy, r) => { const o = []; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) o.push([cx + x, cy + y]); return o; };
// 탐사선(위에서 본 모습, 앞 = 위) — 부위별 칸 묶음
const SC = 1.25;   // 탐사선 크기(처음 판은 작고 흐렸음 → 1.25배)
const sp = pts => pts.map(([x, y]) => [x * SC, y * SC]);
const SHAPES = (() => {
  const hull = polyPx(sp([[0, -46], [6, -40], [12, -22], [15, 6], [13, 30], [9, 40], [-9, 40], [-13, 30], [-15, 6], [-12, -22], [-6, -40]]));
  const wingL = polyPx(sp([[-14, -6], [-40, 10], [-42, 20], [-38, 24], [-14, 24]]));   // 양쪽 장갑 날개(내구성)
  const wingR = polyPx(sp([[14, -6], [40, 10], [42, 20], [38, 24], [14, 24]]));
  const arm = [...polyPx(sp([[40, 16], [50, 22], [48, 26], [38, 21]])), ...polyPx(sp([[47, 22], [52, 34], [48, 35], [44, 25]])), ...polyPx(sp([[48, 33], [45, 41], [48, 42], [52, 35]])), ...polyPx(sp([[51, 33], [56, 40], [53, 42], [49, 35]]))];   // 오른쪽 날개 끝의 관절 팔 + 집게 두 갈래
  const dome = discPx(0, Math.round(-44 * SC), Math.round(8 * SC));
  const tanks = [...polyPx(sp([[-12, 26], [-4, 26], [-4, 52], [-6, 55], [-10, 55], [-12, 52]])), ...polyPx(sp([[4, 26], [12, 26], [12, 52], [10, 55], [6, 55], [4, 52]]))];
  const nozzle = [...polyPx(sp([[-11, 55], [-5, 55], [-4, 60], [-12, 60]])), ...polyPx(sp([[5, 55], [11, 55], [12, 60], [4, 60]]))];
  return {
    durability: [...hull, ...wingL, ...wingR], scanner: dome, harvester: arm, fuel_tank: [...tanks, ...nozzle],
    seams: [[-15, -10, 30], [-18, 8, 36], [-16, 26, 32], [-48, 18, 18], [30, 18, 18]].map(([x, y, l]) => [Math.round(x * SC), Math.round(y * SC), Math.round(l * SC)]),   // 몸체·날개 이음매(x, y, 길이)
  };
})();
const keyOf = (x, y) => (x + 200) * 1000 + (y + 200);
const EDGE = {};   // 부위별 테두리 칸
for (const id of ['durability', 'scanner', 'harvester', 'fuel_tank']) { const set = new Set(SHAPES[id].map(([x, y]) => keyOf(x, y))); EDGE[id] = SHAPES[id].filter(([x, y]) => !set.has(keyOf(x + 1, y)) || !set.has(keyOf(x - 1, y)) || !set.has(keyOf(x, y + 1)) || !set.has(keyOf(x, y - 1))); }

export const hangar = {
  theme: 'loft',
  enter(p = {}) { this.sel = p.part || 'scanner'; this.fx = null; },
  lv(s, id) { s.ship = s.ship || { levels: { scanner: 1, durability: 2, harvester: 1, fuel_tank: 1 } }; return s.ship.levels[id] || 0; },
  val(pt, lv) { return Math.min(pt.max, pt.base + pt.step * lv); },
  cost(lv) { return Math.round(120 * Math.pow(lv + 1, 1.4) / 10) * 10; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    g.rect(0, 0, W, H, '#070b12');
    hud(app, s);
    g.text('탐사선 정비', 12, 34, { font: 'head', color: '#e4fbff' });
    button(app, 'hg_back', W - 58, 31, 50, 20, '‹ 탐사', { style: 'night', onTap: () => app.go('explore') });
    // 디스플레이: 짙은 판 + 홀로그램 격자 + 주사선
    const { x, y, w, h } = DISP;
    g.rect(x - 2, y - 2, w + 4, h + 4, '#1b2330'); g.rect(x - 1, y - 1, w + 2, h + 2, '#2e3a4c'); g.rect(x, y, w, h, '#060d16');
    for (let gx = x + 8; gx < x + w; gx += 16) g.rect(gx, y, 1, h, '#0b1826');
    for (let gy = y + 8; gy < y + h; gy += 16) g.rect(x, gy, w, 1, '#0b1826');
    // 투영기(아래 가운데): 쇠 받침 + 빛 고리 + 위로 퍼지는 옅은 빛
    const px0 = SHIP.cx, py0 = y + h - 34;
    for (let yy = SHIP.cy + 50; yy < py0; yy++) { const k = (yy - (SHIP.cy + 50)) / (py0 - SHIP.cy - 50), hw = Math.round(20 + (1 - k) * 36); for (let xx = -hw; xx <= hw; xx++) if (B4[yy & 3][(xx + 64) & 3] < 3 + k * 2) g.px(px0 + xx, yy, '#0f2a3c'); }
    g.ellipse(px0, py0 + 6, 46, 9, '#141b25'); g.ellipse(px0, py0 + 4, 44, 8, '#232d3c'); g.ellipseRing(px0, py0 + 3, 38, 6, '#3f9fd0', 0); g.ellipseRing(px0, py0 + 3, 30, 5, '#97e8f7', 2);
    g.rect(px0 - 3, py0 + 1, 6, 2, Math.floor(t / 400) % 2 ? '#e4fbff' : '#97e8f7');
    // 탐사선 홀로그램
    const bob = Math.round(Math.sin(t / 900) * 1.5), cx = SHIP.cx, cy = SHIP.cy + bob;
    const glitch = (t % 3100) < 90 ? { y: ((t / 3100) | 0) * 37 % 80 - 40, dx: (((t / 3100) | 0) % 2 ? 2 : -2) } : null;
    const put = (X, Y, c) => { const gx = glitch && Y >= glitch.y && Y < glitch.y + 4 ? glitch.dx : 0; g.px(cx + X + gx, cy + Y, c); };
    const fx = this.fx && t - this.fx.t0 < 900 ? this.fx : null;
    for (const id of ['durability', 'fuel_tank', 'harvester', 'scanner']) {
      const on = this.sel === id, flash = fx && fx.id === id && t - fx.t0 < 240;
      for (const [X, Y] of SHAPES[id]) {
        if ((Y & 1) && B4[(Y + 64) & 3][(X + 64) & 3] > 9) continue;   // 홀수 줄 = 주사선(일부 비어 비침)
        const lit = X < -2;   // 왼쪽 위 빛 받는 쪽 조금 밝게
        if (B4[(Y + 64) & 3][(X + 64) & 3] < (on ? 11 : 8)) put(X, Y, flash ? '#ffffff' : on ? (lit ? HC.selFill2 : HC.selFill) : (lit ? HC.fill2 : HC.fill));
      }
      for (const [X, Y] of EDGE[id]) put(X, Y, flash ? '#ffffff' : on ? HC.sel : HC.line);
    }
    for (const [sx, sy, len] of SHAPES.seams) for (let k = 0; k < len; k += 2) put(sx + k, sy, HC.seam);
    put(0, -48, Math.floor(t / 300) % 2 ? HC.hi : HC.line); put(-1, -49, HC.hi);   // 센서 빛
    for (const nx of [-10, 10]) for (let k = 0; k < 3 + (Math.floor(t / 70) % 3); k++) if ((k + Math.floor(t / 90)) % 2) put(nx + (k % 2 ? 1 : -1), 61 + k, '#5ad0f0');   // 추진기 빛 깜빡임
    // 지나가는 밝은 주사선(위 → 아래)
    const sw = ((t / 14) % 140) - 70; if (sw > -58 && sw < 64) for (let X = -46; X <= 48; X += 1) if ((X & 1) === 0) g.px(cx + X, cy + Math.round(sw), 'rgba(151,232,247,0.35)');
    // 강화 효과: 고른 부위에서 스캔 고리가 퍼짐
    if (fx) { const k = (t - fx.t0) / 900, pt = PARTS.find(p => p.id === fx.id), r = Math.round(6 + k * 34); g.ellipseRing(cx + Math.round(pt.anchor[0] * SC), cy + Math.round(pt.anchor[1] * SC), r, Math.round(r * 0.6), k < 0.5 ? '#ffffff' : HC.sel, 2); }
    // 이름표 + 점선(부위 → 이름표)
    for (const pt of PARTS) {
      const [bx, by] = pt.box, bw = 78, bh = 30, on = this.sel === pt.id, lv = this.lv(s, pt.id);
      const ax = cx + Math.round(pt.anchor[0] * SC), ay = cy + Math.round(pt.anchor[1] * SC), ex = bx < SHIP.cx ? bx + bw : bx, ey = by + bh / 2;   // 부위 자리(탐사선 크기 SC 만큼)
      const n = Math.max(Math.abs(ex - ax), Math.abs(ey - ay));
      for (let i = 0; i <= n; i += 2) g.px(Math.round(ax + (ex - ax) * i / n), Math.round(ay + (ey - ay) * i / n), on ? HC.sel : '#3f7f9a');
      g.rect(ax - 1, ay - 1, 3, 3, on ? HC.sel : HC.line);
      holo(g, bx, by, bw, bh, on ? { fill: '#3a2a18', fill2: '#5a3e20', frame: HC.sel, frameHi: '#ffe8c8', frameLo: '#a8743a' } : (T.card || T.panel), 12);
      g.text(pt.label, bx + 6, by + 4, { font: 'bold', color: on ? '#ffe8c8' : '#e4fbff' });
      g.text(`Lv.${lv}`, bx + bw - 6, by + 4, { color: on ? HC.sel : '#97e8f7', align: 'right' });
      const maxLv = Math.ceil((pt.max - pt.base) / pt.step);
      for (let i = 0; i < Math.min(8, maxLv); i++) g.rect(bx + 6 + i * 8, by + 21, 6, 3, i < lv ? (on ? HC.sel : '#97e8f7') : '#1e3a50');
      app.input.hit('hg_' + pt.id, bx, by, bw, bh, () => { this.sel = pt.id; }, 2);
      app.input.hit('hg_part_' + pt.id, ax - 14, ay - 14, 28, 28, () => { this.sel = pt.id; });
    }
    // 고른 부위 정보 + 강화
    const pt = PARTS.find(p => p.id === this.sel), lv = this.lv(s, pt.id), cur = this.val(pt, lv), nxt = this.val(pt, lv + 1), atMax = cur >= pt.max, cost = this.cost(lv);
    const PY = DISP.y + DISP.h + 10, st = T.card || T.panel, P = T.ptext;
    holo(g, 10, PY, W - 20, 104, st, 13);
    g.text(pt.label, 22, PY + 8, { font: 'head', color: P.main });
    g.text(`Lv.${lv}`, 24 + g.textW(pt.label, 'head') + 6, PY + 11, { color: HC.sel });
    g.text(pt.desc, 22, PY + 30, { color: P.sub });
    const fmtV = v => (pt.unit === '궤도' ? `${v}궤도` : `${v}${pt.unit}`);
    g.text('지금', 22, PY + 50, { color: P.dim }); g.text(fmtV(cur), 50, PY + 50, { font: 'bold', color: P.main });
    if (!atMax) { g.text('→', 94, PY + 50, { color: P.dim }); g.text(fmtV(nxt), 108, PY + 50, { font: 'bold', color: '#9ff0b0' }); }
    tbar(g, 22, PY + 68, 120, 5, cur / pt.max, 'exp');
    const can = !atMax && s.credits >= cost;
    button(app, 'hg_up', W - 116, PY + 52, 96, 40, atMax ? '최대 강화' : '강화', { style: 'gold', font: 'head', icon: atMax ? null : 'up', iconTint: true, disabled: !can, sub: atMax ? null : `${fmt(cost)} 크레딧`, onTap: () => { s.credits -= cost; s.ship.levels[pt.id] = lv + 1; this.fx = { id: pt.id, t0: app.t }; app.toast(`${pt.label} 강화!`); } });
    navBar(app, 'explore');
  },
};
