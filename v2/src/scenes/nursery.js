import { C } from '../art/palette.js';
import { plainBg } from '../art/bg.js';
import { hud, navBar, panel, rbox, rrect, button, bar, chip } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { plantStack, bob } from '../art/sprites.js';
import { STAGE_NAME, SPECIES } from '../data/mock.js';

const FRUIT = [{ have: 3, max: 3, gauge: 1 }, { have: 1, max: 3, gauge: 0.62 }, { have: 0, max: 2, gauge: 0.18 }];

export const nursery = {
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t, 'nursery');
    hud(app, s);
    g.text('양육', 12, 32, { font: 'head', color: C.white, shadow: C.ink });
    let rx = W - 12;
    rx -= chip(g, rx - 46, 31, `${s.care.fert}`, { icon: 'fert' }) + 4;
    chip(g, rx - 46 - 4, 31, `${s.care.water}`, { icon: 'water' });
    const cw = Math.floor((W - 16 - 8) / 2), ch = 112;
    for (let i = 0; i < 6; i++) {
      const x = 8 + (i % 2) * (cw + 8), y = 54 + Math.floor(i / 2) * (ch + 8);
      const p = s.plants[i];
      if (!p) {
        const locked = i >= s.slots;
        rrect(g, x, y, cw, ch, 5, C.shade); rrect(g, x + 1, y + 1, cw - 2, ch - 2, 4, '#1b3b35');
        g.img(icon(locked ? 'lock' : 'potIcon'), x + cw / 2 - 5, y + ch / 2 - 14);
        g.text(locked ? `Lv.${4 + (i - s.slots) * 3}에 열림` : '빈 화분', x + cw / 2, y + ch / 2 + 2, { color: C.slate2, align: 'center' });
        continue;
      }
      const f = FRUIT[i] || FRUIT[2];
      const ready = f.have > 0;
      panel(g, x, y, cw, ch, 'night');
      rbox(g, x + 6, y + 6, 52, 64, 5, '#1b3b35');
      plantStack(g, p.key, p.pot, x + 8, y + 10, { bob: bob(t, i * 300) });
      if (ready) { // 열매 반짝
        g.img(icon('fruit'), x + 44, y + 8 + (Math.floor(t / 500 + i) % 2));
      }
      g.text(p.name, x + 64, y + 8, { font: 'bold', color: C.white });
      const sp = SPECIES[p.key];
      g.text(STAGE_NAME[sp.type][p.stage], x + 64, y + 24, { color: C.mute });
      g.img(icon('fruit'), x + 64, y + 41);
      g.text(`${f.have}/${f.max}`, x + 78, y + 41, { color: ready ? C.red3 : C.mute });
      bar(g, x + 8, y + 76, cw - 16, 7, f.gauge, 'gold');
      if (ready) button(app, 'har_' + i, x + 8, y + 88, cw - 16, 18, '수확', { style: 'green', onTap: () => app.toast('수확') });
      else g.text('열매 자라는 중', x + cw / 2, y + 90, { color: C.slate2, align: 'center' });
    }
    button(app, 'har_all', 25, H - 84, W - 50, 28, '전체 수확', { style: 'green', font: 'head', icon: 'fruit', onTap: () => app.toast('전체 수확') });
    navBar(app, 'nursery');
  },
};
