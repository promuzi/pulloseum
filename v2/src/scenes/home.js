import { C, ELEMENT, TYPE } from '../art/palette.js';
import { room, stand } from '../art/bg.js';
import { hud, navBar, button, bar, chip, rbox, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { plantStack, bob } from '../art/sprites.js';
import { stage, gradeBadge, STAT_DEF } from './common.js';
import { STAGE_NAME } from '../data/mock.js';

export const home = {
  enter(p) { this.empty = !!p.empty; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const p = this.empty ? null : s.plants[s.active];
    g.rect(0, 0, W, H, '#2b2238');
    // 무대(2배 도트): 온실 함교 + 받침 + 식물
    const SY = 28, SH = 300;
    stage(app, 0, SY, W, SH, (w2, w, h) => {
      room(w2, w, h, t);
      const cx = Math.floor(w / 2), topY = h - 38;
      stand(w2, cx, topY);
      if (p) plantStack(w2, p.key, p.pot, cx - 24, topY - 56, { bob: bob(t) });
      else plantStack(w2, null, 'pot_terra', cx - 24, topY - 56);
    });
    hud(app, s);
    // 오른쪽 둥근 버튼: 가방·도감
    const sideBtn = (id, ic, label, y, scene) => {
      const pressed = app.input.isPressed(id), yy = y + (pressed ? 1 : 0);
      rbox(g, W - 36, yy, 30, 34, 6, C.night); g.rect(W - 33, yy + 1, 24, 1, C.night2);
      g.img(icon(ic), W - 36 + 7, yy + 4);
      g.text(label, W - 21, yy + 21, { color: C.mist, align: 'center' });
      app.input.hit(id, W - 36, y, 30, 34, () => app.go(scene), 4);
    };
    sideBtn('home_bag', 'navBag', '가방', 40, 'bag');
    sideBtn('home_dex', 'navBook', '도감', 80, 'dex');
    // 식물 넘기기
    if (p) {
      for (const [id, ic, x] of [['home_prev', 'left', 8], ['home_next', 'right', W - 16]]) {
        const pr = app.input.isPressed(id);
        g.img(icon(ic), x, 196 + (pr ? 1 : 0));
        app.input.hit(id, x - 6, 186, 20, 30, () => { s.active = (s.active + (id === 'home_next' ? 1 : s.plants.length - 1)) % s.plants.length; }, 4);
      }
      // 화분 점(몇 번째 식물인지)
      const n = s.plants.length, dx = Math.round(W / 2 - (n - 1) * 4);
      for (let i = 0; i < n; i++) g.rect(dx + i * 8 - 1, SY + SH - 8, 3, 3, i === s.active ? C.teal3 : C.slate);
    }
    let y = SY + SH + 6;
    if (!p) {
      g.text('빈 화분', W / 2, y, { font: 'head', color: C.white, align: 'center', shadow: C.ink });
      g.text('종자를 심으면 여기서 자라요', W / 2, y + 22, { color: C.mute, align: 'center' });
      button(app, 'home_cta', 25, H - 92, W - 50, 32, '첫 종자 심기', { style: 'gold', font: 'head', icon: 'seed', onTap: () => app.go('bag') });
      navBar(app, 'home');
      return;
    }
    // 이름 + 등급
    const nameW = g.textW(p.name, 'head');
    g.text(p.name, W / 2 - 9, y, { font: 'head', color: C.white, align: 'center', shadow: C.ink });
    gradeBadge(g, Math.round(W / 2 - 9 + nameW / 2 + 4), y, p.grade);
    // 칩: 타입 · 속성 · 단계
    y += 21;
    const sp = { flower_grass: ['flower', 'grass'], cactus_fire: ['cactus', 'fire'], vine_water: ['vine', 'water'] }[p.key] || ['flower', 'grass'];
    const chips = [
      { label: TYPE[sp[0]], icon: sp[0] },
      { label: ELEMENT[sp[1]].name, icon: sp[1], color: ELEMENT[sp[1]].light },
      { label: STAGE_NAME[sp[0]][p.stage], icon: 'seed' },
    ];
    let total = 0; chips.forEach(c => { total += g.textW(c.label) + 22 + 4; }); total -= 4;
    let cx = Math.round((W - total) / 2);
    chips.forEach(c => { cx += chip(g, cx, y, c.label, { icon: c.icon, color: c.color }) + 4; });
    // 핵심 스탯 4칸
    y += 22;
    const cw = Math.floor((W - 24) / 4);
    STAT_DEF.slice(0, 4).forEach((d, i) => {
      const x = 12 + i * cw;
      rbox(g, x, y, cw - 4, 32, 4, C.night); g.rect(x + 2, y + 1, cw - 8, 1, C.night2);
      g.img(icon(d.icon), x + 5, y + 4);
      g.text(d.name, x + 19, y + 4, { color: C.mute });
      g.text(fmt(p.stats[d.k]), x + (cw - 4) / 2, y + 17, { font: 'bold', color: C.white, align: 'center' });
    });
    // 성장
    y += 40;
    g.text('새잎까지', 12, y, { color: C.mute });
    bar(g, 62, y + 2, W - 122, 8, p.exp / p.expNext, 'exp');
    g.text(`${p.exp}/${p.expNext}`, W - 12, y, { color: C.teal4, align: 'right' });
    // 토너먼트 줄 + 출전 버튼
    const T = s.tournament;
    y += 20;
    rbox(g, 12, y, W - 24, 22, 4, C.shade);
    g.img(icon('trophy'), 18, y + 5);
    g.text(`${T.name} · ${T.round}`, 33, y + 5, { color: C.gold });
    g.text(`${T.wins}승 ${T.losses}패 / ${T.bestOf}판`, W - 18, y + 5, { color: C.mist, align: 'right' });
    button(app, 'home_cta', 25, H - 92, W - 50, 32, '토너먼트 출전', { style: 'gold', font: 'head', icon: 'sword', onTap: () => app.go('battle') });
    // 식물 누르면 관리
    app.input.hit('home_plant', W / 2 - 50, SY + 90, 100, 150, () => app.go('plant'));
    navBar(app, 'home', { badge: { nursery: true } });
  },
};
