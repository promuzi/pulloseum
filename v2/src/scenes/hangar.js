import { hud, navBar, button, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, holo, tbar } from '../art/theme.js';
import { drawShip, HOLO, SHIP_SC, SHIPS, SHIPIMG, partAt } from '../art/ship.js';
import { PROBE, probeMaxDur, probeUpCost, REPAIR_PER } from '../game/catalog.js';
import { probeOf } from '../game/logic.js';

// 탐사선 정비(2026-10-15 사용자 "탐사선 누르고 스펙 강화하는 창은 디스플레이에 떠 있는 탐사선 홀로그램에 각 부분을 강화하는 느낌으로"):
//  어두운 정비실 디스플레이 · 아래 투영기(빛 고리 + 위로 퍼지는 빛) · 그 위에 떠 있는 탐사선 홀로그램(위에서 본 모습 — 옛 게임 탐사선 그림의 구성:
//  앞 센서 돔 · 몸체 · 뒤 연료 탱크·추진기 · 옆 채집 팔). 반투명 디더 채움 + 밝은 테두리 + 주사선, 천천히 떠오르고 가끔 지직.
//  부위마다 점선 → 이름표(단계 점). 누르면 그 부위가 주황으로 빛나고 아래 판에 지금 → 다음 · 비용 · 강화. 강화하면 그 부위에서 스캔 고리가 퍼짐.
//  수치·이름 = 옛 게임 SHIP_UPGRADES(연료 탱크 = 탐사 궤도, 내구성 = 성공률, 채집기 = 보상 개수, 탐사 장치 = 높은 등급 확률)
// 이름표 = 디스플레이 네 모서리(탐사 장치 왼위 · 채집기 오른위 · 내구성 왼아래 · 연료 탱크 오른아래) — 배 그림(세로 149~279)과 겹치지 않게, 폭 넓은 원반선도
// 2026-10-16 사용자 정리 → 부위 다섯(규칙 = catalog PROBE · logic explore): 연료 탱크 = 거리 · 내구성 = 성공/실패 · 탐사 장치 = 질 좋은 보상(종자 제외) · 채집기 = 보상 수 · 종자 보관함 = 종자 개체값
//  강화 = 돈 + 부품(자원이 많은 행성에서) — 서버 일 upgradeProbe, 고치기 = 내구도 1당 돈(repairProbe). 이름표 자리: 네 모서리 + 아래 가운데(종자 보관함)
const PARTS = [
  { id: 'scanner', at: 'scanner', box: [14, 74] },
  { id: 'cargo', at: 'harvester', box: [178, 74] },
  { id: 'hull', at: 'durability', box: [14, 316] },
  { id: 'tank', at: 'fuel_tank', box: [178, 316] },
  { id: 'vault', at: 'vault', box: [83, 352], bw: 104 },
].map(p => ({ ...p, label: PROBE[p.id].name, desc: PROBE[p.id].desc, max: PROBE[p.id].max }));
// 부위 단계 → 화면에 보일 값(규칙과 같은 식)
const rareP = q => Math.round(100 * (4 + 10 * q + 1 + 4 * q + 0.5 + 3 * q) / (30 + 22 + 14 + 18 + 4 + 10 * q + 1 + 4 * q + 0.5 + 3 * q));
const VAL = {
  tank: lv => `${lv}궤도까지`,
  hull: lv => `내구도 ${probeMaxDur(lv)}`,
  scanner: lv => `귀한 보상 ${rareP((lv - 1) / 4)}%`,
  cargo: lv => { const a = 1 + Math.floor((lv - 1) * 0.75), b = 1 + Math.floor((lv - 1) * 0.75 + 0.5); return a === b ? `보상 ${a}개` : `보상 ${a}~${b}개`; },
  vault: lv => `개체값 ${1 + Math.floor((lv - 1) / 2)}번 굴려 좋은 쪽`,
};
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
    g.ellipse(px0, py0 + 6, 46, 9, '#141b25'); g.ellipse(px0, py0 + 4, 44, 8, '#232d3c'); g.ellipseRing(px0, py0 + 3, 38, 6, '#4a8edc', 0); g.ellipseRing(px0, py0 + 3, 30, 5, '#8ccfff', 2);
    g.rect(px0 - 3, py0 + 1, 6, 2, Math.floor(t / 400) % 2 ? '#e6f3ff' : '#8ccfff');
  });
}

export const hangar = {
  theme: 'loft',
  enter(p = {}) { this.sel = PROBE[p.part] ? p.part : 'scanner'; this.fx = null; this.from = p.from || null; this.inT = null; this.out = null; this.choose = p.choose ? 'open' : null; this.preset = p.model ? +p.model : null; },   // ?model=n = 그 배로(촬영용)   // ?choose=1 = 모양 고르기 창(촬영용)
  lv(s, id) { s.ship = s.ship || {}; return probeOf(s).lv[id] || 1; },
  model(s) { return (s.ship && s.ship.model) || 1; },
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
    s.ship = s.ship || {};
    if (this.preset) { s.ship.model = this.preset; this.preset = null; }
    if (s.ship.model == null && !this.choose) this.choose = 'first';   // 처음 정비실 = 탐사선 모양부터 고름(성능 차이 없음 — 나중에 꾸미기)
    const model = this.model(s);
    const atOf = id => (PARTS.find(p => p.id === id) || {}).at || id;
    drawShip(g, cx, cy, SC, 1, { t, model, sel: ui > 0.5 ? atOf(this.sel) : null, flash: fx && t - fx.t0 < 240 ? atOf(fx.id) : null, glitch });
    // 지나가는 밝은 주사선(위 → 아래)
    const sw = ((t / 14) % 140) - 70; if (sw > -58 && sw < 64) for (let X = -46; X <= 48; X += 1) if ((X & 1) === 0) g.px(cx + X, cy + Math.round(sw), 'rgba(151,232,247,0.35)');
    // 강화 효과: 고른 부위에서 스캔 고리가 퍼짐
    if (fx) { const k = (t - fx.t0) / 900, pa = partAt(model, (PARTS.find(p => p.id === fx.id) || {}).at || fx.id), r = Math.round(6 + k * 34); g.ellipseRing(cx + Math.round(pa[0] * SC), cy + Math.round(pa[1] * SC), r, Math.round(r * 0.6), k < 0.5 ? '#ffffff' : HC.sel, 2); }
    if (ui <= 0) { navBar(app, 'explore'); return; }
    g.alpha(ui, () => this.panels(app, cx, cy, fx, live && !this.choose, model));
    navBar(app, 'explore');
    if (this.choose) this.chooser(app);
  },
  // 탐사선 모양 고르기(처음 한 번 + '모양' 단추): 넷 다 성능 같음, 나중에 탐사선 꾸미기로 이어짐
  chooser(app) {
    const { g, W, H, state: s } = app, P = T.ptext, first = this.choose === 'first';
    g.c.fillStyle = 'rgba(6,10,18,0.78)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('hc_block', 0, 0, W, H, () => {});
    const x = 10, w = W - 20, y = 70, h = 404;
    holo(g, x, y, w, h, T.card || T.panel, 16);
    g.text(first ? '탐사선을 골라 주세요' : '탐사선 모양', x + 12, y + 10, { font: 'head', color: P.main });
    g.text('넷 다 성능은 같아요 · 나중에 꾸미기에서 바꿀 수 있어요', x + 12, y + 32, { color: P.sub });
    const cur = s.ship.model;
    SHIPS.forEach((sh, i) => {
      const cw = (w - 30) / 2, cx0 = Math.round(x + 10 + (i % 2) * (cw + 10)), cy0 = y + 54 + Math.floor(i / 2) * 168, on = cur === sh.n, id = 'hc_' + sh.n, pr = app.input.isPressed(id), yy = cy0 + (pr ? 1 : 0);
      holo(g, cx0, yy, Math.round(cw), 160, on ? { fill: '#3a2a18', fill2: '#4a3420', frame: '#f0be7d', frameHi: '#ffe8c8', frameLo: '#a8743a' } : T.deep, 16);
      const im = SHIPIMG[sh.n] && SHIPIMG[sh.n].big;
      if (im) { const k = Math.min(100 / im.height, (cw - 12) / im.width), dw = Math.round(im.width * k), dh = Math.round(im.height * k); g.c.imageSmoothingEnabled = false; g.c.drawImage(im, Math.round(cx0 + cw / 2 - dw / 2), yy + 8, dw, dh); }
      g.text(sh.name, Math.round(cx0 + cw / 2), yy + 114, { font: 'label', color: on ? '#ffe8c8' : P.main, align: 'center' });
      g.text(sh.desc, Math.round(cx0 + cw / 2), yy + 134, { color: P.sub, align: 'center' });
      app.input.hit(id, cx0, cy0, Math.round(cw), 160, () => { s.ship.model = sh.n; this.choose = null; app.act('setShip', { model: sh.n }).then(r => r && app.toast(sh.name + ' — 정했어요')); });
    });
  },
  panels(app, cx, cy, fx, live, model) {
    const { g, W, state: s } = app;
    g.text('탐사선 정비', 12, 34, { font: 'head', color: '#e6f3ff' });
    button(app, 'hg_back', W - 58, 31, 50, 20, '‹ 탐사', { style: 'night', onTap: live ? () => { this.out = app.t; } : null });
    button(app, 'hg_model', W - 112, 31, 50, 20, '모양', { style: 'night', onTap: live ? () => { this.choose = 'open'; } : null });
    // 이름표 + 점선(부위 → 이름표)
    for (const pt of PARTS) {
      const [bx, by] = pt.box, bw = pt.bw || 78, bh = 30, on = this.sel === pt.id, lv = this.lv(s, pt.id);
      const pa = partAt(model, pt.at), ax = cx + Math.round(pa[0] * SC), ay = cy + Math.round(pa[1] * SC), ex = bx < SHIP.cx ? bx + bw : bx, ey = by + bh / 2;   // 부위 자리(배마다 다름 — art/ship.js PARTS)
      const n = Math.max(Math.abs(ex - ax), Math.abs(ey - ay));
      for (let i = 0; i <= n; i += 2) g.px(Math.round(ax + (ex - ax) * i / n), Math.round(ay + (ey - ay) * i / n), on ? HC.sel : '#3f7f9a');
      g.rect(ax - 1, ay - 1, 3, 3, on ? HC.sel : HC.line);
      holo(g, bx, by, bw, bh, on ? { fill: '#3a2a18', fill2: '#5a3e20', frame: HC.sel, frameHi: '#ffe8c8', frameLo: '#a8743a' } : (T.card || T.panel), 12);
      g.text(pt.label, bx + 6, by + 3, { font: 'label', color: on ? '#ffe8c8' : '#e6f3ff' });
      g.text(`Lv.${lv}`, bx + bw - 6, by + 4, { color: on ? HC.sel : '#8ccfff', align: 'right' });
      for (let i = 0; i < pt.max; i++) g.rect(bx + 6 + i * 8, by + 21, 6, 3, i < lv ? (on ? HC.sel : '#8ccfff') : '#1e3a50');
      if (live) { app.input.hit('hg_' + pt.id, bx, by, bw, bh, () => { this.sel = pt.id; }, 2); app.input.hit('hg_part_' + pt.id, ax - 14, ay - 14, 28, 28, () => { this.sel = pt.id; }); }
    }
    // 고른 부위 정보 + 강화
    const pt = PARTS.find(p => p.id === this.sel), lv = this.lv(s, pt.id), atMax = lv >= pt.max, c = probeUpCost(lv), Pr = probeOf(s), dmax = probeMaxDur(Pr.lv.hull);
    const PY = DISP.y + DISP.h + 10, st = T.card || T.panel, P = T.ptext, parts = s.items.parts || 0;
    holo(g, 10, PY, W - 20, 104, st, 13);
    g.text(pt.label, 22, PY + 8, { font: 'head', color: P.main });
    g.text(`Lv.${lv}`, 24 + g.textW(pt.label, 'head') + 6, PY + 11, { color: HC.sel });
    g.text(`부품 ${parts}`, W - 22, PY + 10, { color: P.sub, align: 'right' });
    g.text(pt.desc, 22, PY + 30, { color: P.sub });
    g.text('지금', 22, PY + 50, { color: P.dim }); g.text(VAL[pt.id](lv), 50, PY + 50, { font: 'bold', color: P.main });
    if (!atMax) g.text(`→ ${VAL[pt.id](lv + 1)}`, 50, PY + 64, { font: 'bold', color: '#9ff0b0' });
    // 내구도(모든 부위 판에 — 탐사 때마다 닳음) + 고치기
    g.text('내구도', 22, PY + 82, { color: P.dim }); tbar(g, 58, PY + 85, 48, 5, Pr.dur / dmax, 'hp'); g.text(`${Pr.dur}/${dmax}`, 110, PY + 82, { color: Pr.dur / dmax < 0.3 ? '#ff9a8a' : P.sub });
    const miss = dmax - Pr.dur, fix = Math.min(miss, Math.floor(s.wallet.credits / REPAIR_PER));
    if (miss > 0) button(app, 'hg_fix', W - 116, PY + 28, 96, 20, `고치기 · ${fix * REPAIR_PER}`, { style: 'night', disabled: !live || fix <= 0, onTap: () => app.act('repairProbe', {}).then(r => { if (r) { this.fx = { id: 'hull', t0: app.t }; app.toast(`내구도 +${r.fixed}`); } }) });
    const can = !atMax && s.wallet.credits >= c.credits && parts >= c.parts;
    button(app, 'hg_up', W - 116, PY + 52, 96, 40, atMax ? '끝까지 올림' : '강화', { style: 'gold', font: 'head', disabled: !live || !can, sub: atMax ? '' : `돈 ${c.credits} · 부품 ${c.parts}`, onTap: () => app.act('upgradeProbe', { part: pt.id }).then(r => { if (r) { this.fx = { id: pt.id, t0: app.t }; app.toast(`${pt.label} Lv.${r.lv}`); } }) });
  },
};
