import { C, ELEMENT, TYPE } from '../art/palette.js';
import { plainBg, pad1 } from '../art/bg.js';
import { panel, rbox, rrect, button, bar, chip, tabs, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig } from '../art/sprites.js';
import { header, gradeBadge, STAT_DEF } from './common.js';
import { STAGE_NAME, CAT_ICON, CAT_NAME } from '../data/mock.js';

export const plant = {
  enter(p) { this.tab = p.tab || 'skill'; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const p = s.plants[s.active];
    plainBg(g, W, H, t);
    header(app, p.name, { right: '' });
    g.img(icon('pencil'), 36 + g.textW(p.name, 'head') + 6, 11);
    // 초상(1배 도트 — 2026-10-15 ①안): 받침 + 큰 판 식물
    panel(g, 8, 38, 106, 124, 'dark');
    g.clip(10, 40, 102, 120, () => {
      g.rect(10, 40, 102, 120, '#2b2238');
      pad1(g, 61, 151, 40);
      drawBig(g, p.key, p.pot, 61, 151, { t });
    });
    // 오른쪽 정보
    const ix = 122;
    gradeBadge(g, ix, 40, p.grade);
    g.text('등급', ix + 20, 42, { color: C.mute });
    let cy = 62;
    chip(g, ix, cy, `${TYPE.flower}형`, { icon: 'flower' }); cy += 19;
    chip(g, ix, cy, `${ELEMENT.grass.name} 속성`, { icon: 'grass', color: ELEMENT.grass.light }); cy += 19;
    chip(g, ix, cy, `${STAGE_NAME.flower[p.stage]} 단계`, { icon: 'seed' }); cy += 22;
    g.text('새잎까지', ix, cy, { color: C.mute });
    g.text(`${p.exp}/${p.expNext}`, W - 10, cy, { color: C.teal4, align: 'right' });
    bar(g, ix, cy + 15, W - ix - 10, 7, p.exp / p.expNext, 'exp');
    g.text(`${p.rank.tier} ${p.rank.pts}/${p.rank.next}`, ix, cy + 28, { color: C.gold });
    // 탭(첫 출시 = 기술·강화. 변이는 나중)
    tabs(app, 8, 170, W - 16, [{ id: 'skill', label: '기술' }, { id: 'up', label: '강화' }], this.tab, id => { this.tab = id; });
    panel(g, 8, 191, W - 16, H - 199, 'night');
    if (this.tab === 'up') this.drawUp(app, p); else this.drawSkill(app, p);
  },
  drawUp(app, p) {
    const { g, W } = app;
    let y = 199;
    STAT_DEF.forEach((d, i) => {
      const rowH = 38;
      if (i) g.rect(16, y - 4, W - 32, 1, C.shade);
      g.img(icon(d.icon), 18, y + 6);
      g.text(d.name, 34, y + 6, { color: C.mist });
      g.text(fmt(p.stats[d.k]) + (d.suf || ''), 104, y + 5, { font: 'bold', color: C.white, align: 'right' });
      rbox(g, 112, y + 4, 34, 15, 3, C.shade); g.text(`Lv${p.lv[d.k]}`, 129, y + 6, { color: C.teal3, align: 'center' });
      button(app, 'up_' + d.k, W - 92, y, 76, 24, '40', { style: 'gold', icon: 'coin', onTap: () => app.toast(d.name + ' 강화') });
      y += rowH;
    });
  },
  drawSkill(app, p) {
    const { g, W } = app;
    g.text('장착한 기술', 18, 200, { font: 'bold', color: C.white });
    g.text(`${p.kit.length}/6`, W - 18, 200, { color: C.mute, align: 'right' });
    const cw = Math.floor((W - 32 - 6) / 2), ch = 36;
    for (let i = 0; i < 6; i++) {
      const x = 16 + (i % 2) * (cw + 6), y = 218 + Math.floor(i / 2) * (ch + 6), sk = p.kit[i];
      if (!sk) { rrect(g, x, y, cw, ch, 4, C.shade); rrect(g, x + 1, y + 1, cw - 2, ch - 2, 3, '#2b2238'); g.text('빈 칸', x + cw / 2, y + 12, { color: C.slate, align: 'center' }); continue; }
      rbox(g, x, y, cw, ch, 4, C.night2); g.rect(x + 3, y + 1, cw - 6, 1, '#4d65b4');
      g.rect(x + 2, y + 5, 2, ch - 10, sk.el ? ELEMENT[sk.el].main : C.mute);
      g.text(sk.name, x + 8, y + 5, { font: 'bold', color: C.white });
      g.img(icon(CAT_ICON[sk.cats[0]]), x + 8, y + 20);
      g.text(CAT_NAME[sk.cats[0]], x + 22, y + 20, { color: C.mute });
      if (sk.cost) { g.img(icon('energy'), x + cw - 22, y + 20); g.text(String(sk.cost), x + cw - 8, y + 20, { font: 'bold', color: C.gold, align: 'right' }); }
      else g.text('무료', x + cw - 8, y + 20, { color: C.teal4, align: 'right' });
    }
    let y = 218 + 3 * (ch + 6) + 6;
    g.text('익힌 기술', 18, y, { font: 'bold', color: C.white }); y += 18;
    p.known.forEach(sk => {
      const locked = !!sk.lock;
      rbox(g, 16, y, W - 32, 26, 4, locked ? C.shade : C.night);
      g.img(icon(locked ? 'lock' : CAT_ICON[sk.cats[0]]), 22, y + 7);
      g.text(sk.name, 38, y + 7, { color: locked ? C.slate2 : C.mist });
      if (locked) g.text(sk.lock + ' 배움', W - 24, y + 7, { color: C.slate2, align: 'right' });
      else g.text('장착됨', W - 24, y + 7, { color: C.teal3, align: 'right' });
      y += 30;
    });
  },
};
