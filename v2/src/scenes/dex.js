import { C, ELEMENT, TYPE } from '../art/palette.js';
import { plainBg } from '../art/bg.js';
import { panel, rbox } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { IMG, ROSTER } from '../art/sprites.js';
import { header } from './common.js';
import { SPECIES } from '../data/mock.js';

export const dex = {
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t);
    const found = new Set(s.discovered);
    header(app, '도감', { right: `${found.size}/${ROSTER.length}` });
    const cols = 3, cw = Math.floor((W - 16 - 12) / cols), ch = 96;
    ROSTER.forEach((k, i) => {
      const x = 8 + (i % cols) * (cw + 6), y = 38 + Math.floor(i / cols) * (ch + 6);
      const sp = SPECIES[k], got = found.has(k);
      panel(g, x, y, cw, ch, got ? 'night' : 'dark');
      g.text(String(i + 1).padStart(3, '0'), x + 6, y + 5, { color: got ? C.mute : C.slate });
      if (got) g.img(icon(sp.el), x + cw - 16, y + 5);
      const im = IMG[k], px = Math.round(x + cw / 2 - 24), py = y + 18;
      g.ellipse(x + cw / 2, py + 33, 14, 2, got ? C.shade : '#2b2238');
      if (im) { if (got) g.img(im, px, py - 4); else g.silhouette(im, px, py - 4, '#3e3546'); }
      g.text(got ? sp.name : '???', x + cw / 2, y + ch - 20, { font: got ? 'bold' : 'body', color: got ? C.white : C.slate, align: 'center' });
    });
  },
};
