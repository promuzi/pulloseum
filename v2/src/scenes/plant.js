import { ELEMENT, TYPE } from '../art/palette.js';
import { button, fmt, rbox } from '../art/ui.js';
import { icon, tinted } from '../art/icons.js';
import { bigKey } from '../art/sprites.js';
import { T, btnBody, tbar, holo } from '../art/theme.js';
import { gradeBadge, STAT_DEF } from './common.js';
import { STAGE_NAME, CAT_ICON, CAT_NAME } from '../data/mock.js';
import { LOFT_STOOL, loftView, loftPlant, loftZoom, loftPlantCy } from '../art/loft.js';
import { FOCUS, SPK } from './home.js';

// 식물 관리(2026-10-15 사용자 "가운데 식물을 누르면 주변 전등이 꺼지면서 암실이 되는 연출과 함께 위 주황전등만 남아서 집중시키고, 동시에 식물이
//  조금 확대되는 줌. 이렇게 집중시키면서 식물의 강화와, 각종 식물 스킬과 세팅을 할 수 있는 기능으로 넘어가게 해줘"):
//  홈이 불을 끄고 다가간 그 카메라 그대로(암실 · 전등 빛기둥 · 의자 위 식물 1.35배) — 위 = 돌아가기·이름·정체성 꼬리표, 아래 = 판이 올라오며 기술 · 강화 · 설정.
//  돌아가기 = 판이 내려가고 홈이 카메라를 물리며 불을 켬(home.js unfocus).
const SHEET_Y = 258, IN_MS = 320, OUT_MS = 220;
const TABS = [{ id: 'skill', label: '기술' }, { id: 'up', label: '강화' }, { id: 'set', label: '설정' }];
const ease = k => k * k * (3 - 2 * k);

export const plant = {
  theme: 'loft',
  enter(p) { this.tab = p.tab || 'skill'; this.t0 = p.focus ? null : -1e9; this.out = null; this.gone = false; },   // 홈 암실 연출에서 왔을 때만 판이 올라옴
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const p = s.plants[s.active], key = bigKey(p.key, p.stage), [mx, my] = LOFT_STOOL, pc = loftPlantCy(key);
    if (this.t0 == null) this.t0 = t;
    loftView(app, { dark: 1, z: loftZoom(app, FOCUS.want), px: mx, py: pc, sx: FOCUS.sx, sy: FOCUS.sy, plant: () => loftPlant(app, key, p.pot, mx, my) });
    // 들어옴 = 위 글자가 나타나고 아래 판이 올라옴, 나감 = 거꾸로 → 홈(불 켜짐)
    let k = ease(Math.min(1, (t - this.t0) / IN_MS));
    if (this.out != null) { const o = Math.min(1, (t - this.out) / OUT_MS); k = Math.min(k, 1 - ease(o)); if (o >= 1 && !this.gone) { this.gone = true; app.go('home', { from: 'plant' }, 'cut'); } }
    const live = k >= 1 && this.out == null;
    g.alpha(k, () => this.top(app, p, live));
    const sy = Math.round(SHEET_Y + (1 - k) * (H - SHEET_Y + 4));
    g.c.save(); g.c.translate(0, sy - SHEET_Y);
    this.sheet(app, p, live);
    g.c.restore();
  },
  // 위: 돌아가기 · 이름 + 등급 + 이름 바꾸기 · 정체성 꼬리표 · 새잎까지 막대(오른쪽 위)
  top(app, p, live) {
    const { g, W } = app, P = T.ptext, pr = app.input.isPressed('pl_back');
    const { yy } = btnBody(g, 6, 6, 30, 26, T.btn.second, pr);
    g.img(tinted('back', T.btn.second.text), 17, yy + 8);
    if (live) app.input.hit('pl_back', 6, 6, 30, 26, () => { this.out = app.t; }, 8);
    g.text(p.name, 44, 9, { font: 'name', color: '#f4fbff', outline: '#05070f', outlineW: 3 });
    const nw = g.textW(p.name, 'name');
    gradeBadge(g, 44 + nw + 6, 10, p.grade);
    g.img(icon('pencil'), 44 + nw + 26, 12);
    if (live) app.input.hit('pl_name', 44, 6, nw + 40, 26, () => { const v = typeof prompt === 'function' ? prompt('이름(10자까지)', p.name) : null; if (v && v.trim()) p.name = v.trim().slice(0, 10); }, 2);
    // 정체성 꼬리표(홈과 같은 꼴)
    const sp = SPK[p.key] || ['flower', 'grass'], el = ELEMENT[sp[1]], ty = sp[0];
    const list = [{ ic: ty, label: TYPE[ty] }, { ic: sp[1], label: el.name, col: el.light }, { ic: 'seed', label: (STAGE_NAME[ty] || STAGE_NAME.flower)[p.stage] }];
    let x = 8;
    for (const r of list) { const w = 22 + g.textW(r.label, 'label'); rbox(g, x, 40, w, 18, 5, '#10283c', '#4c88a9'); g.img(icon(r.ic), x + 5, 44); g.text(r.label, x + 18, 43, { font: 'label', color: r.col || '#e4fbff' }); x += w + 4; }
    // 새잎까지 + 랭크(오른쪽 위, 꽉 찬 작은 판)
    const bx = W - 98, st = T.card || T.panel;
    holo(g, bx, 6, 92, 52, st, 16);
    g.text('새잎까지', bx + 7, 10, { font: 'label', color: P.sub });
    g.text(p.exp != null ? `${p.exp}/${p.expNext}` : '–', bx + 85, 10, { font: 'label', color: P.main, align: 'right' });
    tbar(g, bx + 7, 27, 78, 4, p.exp != null ? p.exp / p.expNext : 0, 'exp');
    const rk = p.rank || { tier: '브론즈', pts: 0, next: 300 };
    g.text(rk.tier, bx + 7, 38, { font: 'label', color: '#ffd890' });
    g.text(`${rk.pts}/${rk.next}`, bx + 85, 38, { color: P.sub, align: 'right' });
  },
  // 아래 판: 탭(기술 · 강화 · 설정) + 내용
  sheet(app, p, live) {
    const { g, W, H } = app, st = T.card || T.panel;
    holo(g, 4, SHEET_Y, W - 8, H - SHEET_Y + 6, st, 16);
    const tw = Math.floor((W - 24) / TABS.length);
    TABS.forEach((tb, i) => {
      const on = tb.id === this.tab, x = 12 + i * tw, S = on ? T.btn.gold : T.btn.second;
      const { yy } = btnBody(g, x, SHEET_Y + 8, tw - 4, 28, S, !on && app.input.isPressed('pt_' + tb.id));
      g.text(tb.label, x + (tw - 4) / 2, yy + 6, { font: 'value', color: S.text, align: 'center' });
      if (live) app.input.hit('pt_' + tb.id, x, SHEET_Y + 8, tw - 4, 28, () => { this.tab = tb.id; }, 2);
    });
    const y0 = SHEET_Y + 44;
    if (this.tab === 'up') this.drawUp(app, p, y0, live);
    else if (this.tab === 'set') this.drawSet(app, p, y0, live);
    else this.drawSkill(app, p, y0, live);
  },
  drawUp(app, p, y0, live) {
    const { g, W } = app, P = T.ptext, ps = p.stats || {}, lv = p.lv || {};
    let y = y0;
    STAT_DEF.forEach((d, i) => {
      if (i) g.rect(14, y - 3, W - 28, 1, '#24506e');
      g.img(icon(d.icon), 16, y + 9);
      g.text(d.name, 32, y + 7, { font: 'label', color: P.sub });
      g.text(ps[d.k] != null ? fmt(ps[d.k]) + (d.suf || '') : '–', 112, y + 6, { font: 'value', color: P.main, align: 'right' });
      g.text(`Lv${lv[d.k] || 1}`, 124, y + 7, { font: 'label', color: '#97e8f7' });
      button(app, 'up_' + d.k, W - 96, y + 2, 82, 26, '40', { style: 'gold', font: 'value', icon: 'coin', onTap: live ? () => app.toast(d.name + ' 강화') : null });
      y += 34;
    });
  },
  drawSkill(app, p, y0, live) {
    const { g, W } = app, P = T.ptext, kit = p.kit || [], known = p.known || kit;
    g.text('장착한 기술', 14, y0, { font: 'value', color: P.main });
    g.text(`${kit.length}/6`, W - 14, y0, { font: 'label', color: P.sub, align: 'right' });
    const cw = Math.floor((W - 28 - 6) / 2), ch = 34;
    for (let i = 0; i < 6; i++) {
      const x = 14 + (i % 2) * (cw + 6), y = y0 + 20 + Math.floor(i / 2) * (ch + 4), sk = kit[i];
      if (!sk) { btnBody(g, x, y, cw, ch, T.btn.off, true); g.text('빈 칸', x + cw / 2, y + 11, { font: 'label', color: T.btn.off.text, align: 'center' }); continue; }
      const st = T.btn.second;
      btnBody(g, x, y, cw, ch, st, true);
      if (sk.el) g.img(icon(sk.el), x + cw - 17, y + 5);
      g.text(sk.name, x + 7, y + 3, { font: 'label', color: st.text });
      g.img(icon(CAT_ICON[sk.cats[0]]), x + 7, y + 20);
      g.text(CAT_NAME[sk.cats[0]], x + 21, y + 19, { color: st.text });
      if (sk.cost) { g.img(icon('energy'), x + cw - 22, y + 20); g.text(String(sk.cost), x + cw - 7, y + 19, { font: 'label', color: st.text, align: 'right' }); }
      else g.text('무료', x + cw - 7, y + 19, { color: st.text, align: 'right' });
    }
    let y = y0 + 20 + 3 * (ch + 4) + 4;
    g.text('익힌 기술', 14, y, { font: 'value', color: P.main }); y += 19;
    for (const sk of known) {
      if (y > app.H - 26) break;
      const locked = !!sk.lock;
      holo(g, 12, y, W - 24, 24, T.deep, 16);
      g.img(icon(locked ? 'lock' : CAT_ICON[sk.cats[0]]), 19, y + 7);
      g.text(sk.name, 35, y + 5, { font: 'label', color: locked ? T.text.dim : '#e4fbff' });
      g.text(locked ? sk.lock + ' 배움' : '장착됨', W - 20, y + 5, { color: locked ? T.text.dim : '#97e8f7', align: 'right' });
      y += 27;
    }
  },
  // 설정: 이름 · 화분 · 동면 보관(첫 판 = 자리만, 실제 동작은 게임 규칙 상태로 옮길 때)
  drawSet(app, p, y0, live) {
    const { g, W } = app, P = T.ptext;
    const rows = [
      { id: 'name', ic: 'pencil', label: '이름 바꾸기', sub: p.name, act: '바꾸기', fn: () => { const v = typeof prompt === 'function' ? prompt('이름(10자까지)', p.name) : null; if (v && v.trim()) p.name = v.trim().slice(0, 10); } },
      { id: 'pot', ic: 'seed', label: '화분 바꾸기', sub: { pot_terra: '테라코타', pot_ceramic: '도자기', pot_glass: '유리', pot_crystal: '크리스탈', pot_gold: '황금' }[p.pot] || '테라코타', act: '고르기', fn: () => app.toast('화분 고르기') },
      { id: 'store', ic: 'lock', label: '동면 보관고로', sub: '스마트팜 자리를 비워요', act: '보내기', fn: () => app.toast('동면 보관고로 보냄') },
    ];
    let y = y0;
    for (const r of rows) {
      holo(g, 12, y, W - 24, 46, T.deep, 16);
      g.img(icon(r.ic), 20, y + 9);
      g.text(r.label, 36, y + 7, { font: 'value', color: P.main });
      g.text(r.sub, 36, y + 26, { color: P.sub });
      button(app, 'set_' + r.id, W - 84, y + 10, 64, 26, r.act, { style: 'night', font: 'label', onTap: live ? r.fn : null });
      y += 52;
    }
  },
};
