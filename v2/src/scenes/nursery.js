import { plainBg } from '../art/bg.js';
import { hud, navBar, button, chip } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { plantStack, bob } from '../art/sprites.js';
import { T, plate, tbar } from '../art/theme.js';
import { STAGE_NAME, SPECIES } from '../data/mock.js';

const FRUIT = [{ have: 3, max: 3, gauge: 1 }, { have: 1, max: 3, gauge: 0.62 }, { have: 0, max: 2, gauge: 0.18 }];

export const nursery = {
  theme: 'garden',   // 온실(장소 테마 — 2026-10-15)
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t, 'nursery_garden');
    hud(app, s);
    g.text('양육', 12, 32, { font: 'head', color: T.text.main, shadow: T.ink });
    let rx = W - 12;
    rx -= chip(g, rx - 46, 31, `${s.care.fert}`, { icon: 'fert' }) + 4;
    chip(g, rx - 46 - 4, 31, `${s.care.water}`, { icon: 'water' });
    const cw = Math.floor((W - 16 - 8) / 2), ch = 112, P = T.ptext;
    for (let i = 0; i < 6; i++) {
      const x = 8 + (i % 2) * (cw + 8), y = 54 + Math.floor(i / 2) * (ch + 8);
      const p = s.plants[i];
      if (!p) {
        const locked = i >= s.slots;
        plate(g, x, y, cw, ch, 'deep');
        g.img(icon(locked ? 'lock' : 'potIcon'), x + cw / 2 - 5, y + ch / 2 - 14);
        g.text(locked ? `Lv.${4 + (i - s.slots) * 3}에 열림` : '빈 화분', x + cw / 2, y + ch / 2 + 2, { color: T.text.sub, align: 'center' });
        continue;
      }
      const f = FRUIT[i] || FRUIT[2];
      const ready = f.have > 0;
      plate(g, x, y, cw, ch);
      plate(g, x + 6, y + 6, 54, 66, 'deep');
      plantStack(g, p.key, p.pot, x + 9, y + 10, { bob: bob(t, i * 300) });
      if (ready) g.img(icon('fruit'), x + 46, y + 9 + (Math.floor(t / 500 + i) % 2));   // 열매 반짝
      g.text(p.name, x + 65, y + 9, { font: 'bold', color: P.main });
      const sp = SPECIES[p.key];
      g.text(STAGE_NAME[sp.type][p.stage], x + 65, y + 25, { color: P.sub });
      g.img(icon('fruit'), x + 65, y + 42);
      g.text(`${f.have}/${f.max}`, x + 79, y + 42, { color: ready ? P.bad : P.sub });
      tbar(g, x + 8, y + 77, cw - 16, 7, f.gauge, 'mid');
      if (ready) button(app, 'har_' + i, x + 8, y + 88, cw - 16, 19, '수확', { style: 'green', onTap: () => app.toast('수확') });
      else g.text('열매 자라는 중', x + cw / 2, y + 91, { color: P.dim, align: 'center' });
    }
    button(app, 'har_all', 25, H - 86, W - 50, 30, '전체 수확', { style: 'green', font: 'head', icon: 'fruit', onTap: () => app.toast('전체 수확') });
    navBar(app, 'nursery');
  },
};
