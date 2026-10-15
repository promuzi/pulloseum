import { ELEMENT, TYPE } from '../art/palette.js';
import { plainBg } from '../art/bg.js';
import { button, chip, tabs, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig } from '../art/sprites.js';
import { T, plate, btnBody, tbar, padV } from '../art/theme.js';
import { header, gradeBadge, STAT_DEF } from './common.js';
import { STAGE_NAME, CAT_ICON, CAT_NAME } from '../data/mock.js';

export const plant = {
  theme: 'ship',
  enter(p) { this.tab = p.tab || 'skill'; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const p = s.plants[s.active], P = T.ptext;
    plainBg(g, W, H, t);
    header(app, p.name, { right: '' });
    g.img(icon('pencil'), 37 + g.textW(p.name, 'head') + 6, 11);
    // 초상(1배 도트 — 2026-10-15 ①안): 받침 + 큰 판 식물
    plate(g, 8, 37, 108, 126, 'deep');
    g.clip(11, 40, 102, 120, () => {
      padV(g, 61, 151, 40, true);
      drawBig(g, p.key, p.pot, 61, 151, { t });
    });
    // 오른쪽 정보
    const ix = 122;
    gradeBadge(g, ix, 40, p.grade);
    g.text('등급', ix + 20, 42, { color: T.text.sub });
    let cy = 62;
    chip(g, ix, cy, `${TYPE.flower}형`, { icon: 'flower' }); cy += 19;
    chip(g, ix, cy, `${ELEMENT.grass.name} 속성`, { icon: 'grass', color: ELEMENT.grass.light }); cy += 19;
    chip(g, ix, cy, `${STAGE_NAME.flower[p.stage]} 단계`, { icon: 'seed' }); cy += 22;
    g.text('새잎까지', ix, cy, { color: T.text.sub });
    g.text(`${p.exp}/${p.expNext}`, W - 10, cy, { color: T.text.accent, align: 'right' });
    tbar(g, ix, cy + 15, W - ix - 10, 7, p.exp / p.expNext, 'exp');
    g.text(`${p.rank.tier} ${p.rank.pts}/${p.rank.next}`, ix, cy + 28, { color: T.text.gold });
    // 탭(첫 출시 = 기술·강화. 변이는 나중)
    tabs(app, 8, 170, W - 16, [{ id: 'skill', label: '기술' }, { id: 'up', label: '강화' }], this.tab, id => { this.tab = id; });
    plate(g, 8, 194, W - 16, H - 202);
    if (this.tab === 'up') this.drawUp(app, p, P); else this.drawSkill(app, p, P);
  },
  drawUp(app, p, P) {
    const { g, W } = app;
    let y = 203;
    STAT_DEF.forEach((d, i) => {
      const rowH = 38;
      if (i) g.rect(16, y - 4, W - 32, 1, T.panel.fill2);
      g.img(icon(d.icon), 18, y + 6);
      g.text(d.name, 34, y + 6, { color: P.sub });
      g.text(fmt(p.stats[d.k]) + (d.suf || ''), 104, y + 5, { font: 'bold', color: P.main, align: 'right' });
      btnBody(g, 111, y + 3, 36, 17, T.btn.second, true); g.text(`Lv${p.lv[d.k]}`, 129, y + 6, { color: T.btn.second.text, align: 'center' });
      button(app, 'up_' + d.k, W - 92, y, 76, 25, '40', { style: 'gold', icon: 'coin', onTap: () => app.toast(d.name + ' 강화') });
      y += rowH;
    });
  },
  drawSkill(app, p, P) {
    const { g, W } = app;
    g.text('장착한 기술', 18, 203, { font: 'bold', color: P.main });
    g.text(`${p.kit.length}/6`, W - 18, 203, { color: P.sub, align: 'right' });
    const cw = Math.floor((W - 32 - 6) / 2), ch = 36;
    for (let i = 0; i < 6; i++) {
      const x = 16 + (i % 2) * (cw + 6), y = 220 + Math.floor(i / 2) * (ch + 6), sk = p.kit[i];
      if (!sk) { btnBody(g, x, y, cw, ch, T.btn.off, true); g.text('빈 칸', x + cw / 2, y + 12, { color: T.btn.off.text, align: 'center' }); continue; }
      const st = T.btn.second;
      btnBody(g, x, y, cw, ch, st, true);
      if (sk.el) g.img(icon(sk.el), x + cw - 17, y + 5);
      g.text(sk.name, x + 8, y + 6, { font: 'bold', color: st.text });
      g.img(icon(CAT_ICON[sk.cats[0]]), x + 8, y + 21);
      g.text(CAT_NAME[sk.cats[0]], x + 22, y + 21, { color: st.text });
      if (sk.cost) { g.img(icon('energy'), x + cw - 22, y + 21); g.text(String(sk.cost), x + cw - 8, y + 21, { font: 'bold', color: st.text, align: 'right' }); }
      else g.text('무료', x + cw - 8, y + 21, { color: st.text, align: 'right' });
    }
    let y = 220 + 3 * (ch + 6) + 6;
    g.text('익힌 기술', 18, y, { font: 'bold', color: P.main }); y += 18;
    p.known.forEach(sk => {
      const locked = !!sk.lock;
      plate(g, 16, y, W - 32, 27, 'deep');
      g.img(icon(locked ? 'lock' : CAT_ICON[sk.cats[0]]), 23, y + 8);
      g.text(sk.name, 39, y + 7, { color: locked ? T.text.dim : T.text.main });
      if (locked) g.text(sk.lock + ' 배움', W - 25, y + 7, { color: T.text.dim, align: 'right' });
      else g.text('장착됨', W - 25, y + 7, { color: T.text.accent, align: 'right' });
      y += 30;
    });
  },
};
