import { hud, navBar, button, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, holo, tbar } from '../art/theme.js';
import { drawShip, HOLO, SHIP_SC } from '../art/ship.js';

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
const HC = HOLO;
export const SHIP = { cx: 135, cy: 214 };
const DISP = { x: 8, y: 58, w: 254, h: 330 };
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const SC = SHIP_SC, IN_MS = 380, OUT_MS = 200;

// 정비실 바닥(탐사 → 정비 연출이 같은 것을 깔며 넘어옴): 짙은 바탕 · 디스플레이 판 + 홀로그램 격자 · 아래 투영기(빛 고리 + 위로 퍼지는 옅은 빛)
export function hangarBack(app, k = 1) {
  const { g, W, H, t } = app;
  g.alpha(k, () => {
    g.rect(0, 0, W, H, '#070b12');
    const { x, y, w, h } = DISP;
    g.rect(x - 2, y - 2, w + 4, h + 4, '#1b2330'); g.rect(x - 1, y - 1, w + 2, h + 2, '#2e3a4c'); g.rect(x, y, w, h, '#060d16');
    for (let gx = x + 8; gx < x + w; gx += 16) g.rect(gx, y, 1, h, '#0b1826');
    for (let gy = y + 8; gy < y + h; gy += 16) g.rect(x, gy, w, 1, '#0b1826');
    const px0 = SHIP.cx, py0 = y + h - 34;
    for (let yy = SHIP.cy + 50; yy < py0; yy++) { const kk = (yy - (SHIP.cy + 50)) / (py0 - SHIP.cy - 50), hw = Math.round(20 + (1 - kk) * 36); for (let xx = -hw; xx <= hw; xx++) if (B4[yy & 3][(xx + 64) & 3] < 3 + kk * 2) g.px(px0 + xx, yy, '#0f2a3c'); }
    g.ellipse(px0, py0 + 6, 46, 9, '#141b25'); g.ellipse(px0, py0 + 4, 44, 8, '#232d3c'); g.ellipseRing(px0, py0 + 3, 38, 6, '#3f9fd0', 0); g.ellipseRing(px0, py0 + 3, 30, 5, '#97e8f7', 2);
    g.rect(px0 - 3, py0 + 1, 6, 2, Math.floor(t / 400) % 2 ? '#e4fbff' : '#97e8f7');
  });
}

export const hangar = {
  theme: 'loft',
  enter(p = {}) { this.sel = p.part || 'scanner'; this.fx = null; this.from = p.from || null; this.inT = null; this.out = null; },
  lv(s, id) { s.ship = s.ship || { levels: { scanner: 1, durability: 2, harvester: 1, fuel_tank: 1 } }; return s.ship.levels[id] || 0; },
  val(pt, lv) { return Math.min(pt.max, pt.base + pt.step * lv); },
  cost(lv) { return Math.round(120 * Math.pow(lv + 1, 1.4) / 10) * 10; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    if (this.inT == null) this.inT = t;
    // 탐사에서 왔으면 이름표·아래 판·제목이 나타남(배는 이미 홀로그램으로 와 있음), 돌아갈 땐 거꾸로 사라진 뒤 탐사가 배를 진짜로 되돌림
    let ui = this.from === 'explore' ? Math.min(1, (t - this.inT) / IN_MS) : 1;
    if (this.out != null) { const o = Math.min(1, (t - this.out) / OUT_MS); ui = Math.min(ui, 1 - o); if (o >= 1 && !this.gone) { this.gone = true; app.go('explore', { from: 'hangar' }, 'cut'); } }
    const live = ui >= 1 && this.out == null;
    hangarBack(app);
    hud(app, s);
    // 탐사선 홀로그램
    const bob = Math.round(Math.sin(t / 900) * 1.5), cx = SHIP.cx, cy = SHIP.cy + bob;
    const glitch = (t % 3100) < 90 ? { y: ((t / 3100) | 0) * 37 % 80 - 40, dx: (((t / 3100) | 0) % 2 ? 2 : -2) } : null;
    const fx = this.fx && t - this.fx.t0 < 900 ? this.fx : null;
    drawShip(g, cx, cy, SC, 1, { t, sel: ui > 0.5 ? this.sel : null, flash: fx && t - fx.t0 < 240 ? fx.id : null, glitch });
    // 지나가는 밝은 주사선(위 → 아래)
    const sw = ((t / 14) % 140) - 70; if (sw > -58 && sw < 64) for (let X = -46; X <= 48; X += 1) if ((X & 1) === 0) g.px(cx + X, cy + Math.round(sw), 'rgba(151,232,247,0.35)');
    // 강화 효과: 고른 부위에서 스캔 고리가 퍼짐
    if (fx) { const k = (t - fx.t0) / 900, pt = PARTS.find(p => p.id === fx.id), r = Math.round(6 + k * 34); g.ellipseRing(cx + Math.round(pt.anchor[0] * SC), cy + Math.round(pt.anchor[1] * SC), r, Math.round(r * 0.6), k < 0.5 ? '#ffffff' : HC.sel, 2); }
    if (ui <= 0) { navBar(app, 'explore'); return; }
    g.alpha(ui, () => this.panels(app, cx, cy, fx, live));
    navBar(app, 'explore');
  },
  panels(app, cx, cy, fx, live) {
    const { g, W, state: s } = app;
    g.text('탐사선 정비', 12, 34, { font: 'head', color: '#e4fbff' });
    button(app, 'hg_back', W - 58, 31, 50, 20, '‹ 탐사', { style: 'night', onTap: live ? () => { this.out = app.t; } : null });
    // 이름표 + 점선(부위 → 이름표)
    for (const pt of PARTS) {
      const [bx, by] = pt.box, bw = 78, bh = 30, on = this.sel === pt.id, lv = this.lv(s, pt.id);
      const ax = cx + Math.round(pt.anchor[0] * SC), ay = cy + Math.round(pt.anchor[1] * SC), ex = bx < SHIP.cx ? bx + bw : bx, ey = by + bh / 2;   // 부위 자리(탐사선 크기 SC 만큼)
      const n = Math.max(Math.abs(ex - ax), Math.abs(ey - ay));
      for (let i = 0; i <= n; i += 2) g.px(Math.round(ax + (ex - ax) * i / n), Math.round(ay + (ey - ay) * i / n), on ? HC.sel : '#3f7f9a');
      g.rect(ax - 1, ay - 1, 3, 3, on ? HC.sel : HC.line);
      holo(g, bx, by, bw, bh, on ? { fill: '#3a2a18', fill2: '#5a3e20', frame: HC.sel, frameHi: '#ffe8c8', frameLo: '#a8743a' } : (T.card || T.panel), 12);
      g.text(pt.label, bx + 6, by + 3, { font: 'label', color: on ? '#ffe8c8' : '#e4fbff' });
      g.text(`Lv.${lv}`, bx + bw - 6, by + 4, { color: on ? HC.sel : '#97e8f7', align: 'right' });
      const maxLv = Math.ceil((pt.max - pt.base) / pt.step);
      for (let i = 0; i < Math.min(8, maxLv); i++) g.rect(bx + 6 + i * 8, by + 21, 6, 3, i < lv ? (on ? HC.sel : '#97e8f7') : '#1e3a50');
      if (live) { app.input.hit('hg_' + pt.id, bx, by, bw, bh, () => { this.sel = pt.id; }, 2); app.input.hit('hg_part_' + pt.id, ax - 14, ay - 14, 28, 28, () => { this.sel = pt.id; }); }
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
    button(app, 'hg_up', W - 116, PY + 52, 96, 40, atMax ? '최대 강화' : '강화', { style: 'gold', font: 'head', icon: atMax ? null : 'up', iconTint: true, disabled: !can, sub: atMax ? null : `${fmt(cost)} 크레딧`, onTap: !live ? null : () => { s.credits -= cost; s.ship.levels[pt.id] = lv + 1; this.fx = { id: pt.id, t0: app.t }; app.toast(`${pt.label} 강화!`); } });
  },
};
