import { plainBg } from '../art/bg.js';
import { icon } from '../art/icons.js';
import { IMG, ROSTER } from '../art/sprites.js';
import { T, plate } from '../art/theme.js';
import { header } from './common.js';
import { SPECIES } from '../data/mock.js';

export const dex = {
  theme: 'ship',
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t);
    const found = new Set(s.discovered);
    header(app, '도감', { right: `${found.size}/${ROSTER.length}` });
    const cols = 3, cw = Math.floor((W - 16 - 12) / cols), ch = 96, P = T.ptext;
    ROSTER.forEach((k, i) => {
      const x = 8 + (i % cols) * (cw + 6), y = 38 + Math.floor(i / cols) * (ch + 6);
      const sp = SPECIES[k], got = found.has(k);
      plate(g, x, y, cw, ch, got ? 'panel' : 'deep');
      g.text(String(i + 1).padStart(3, '0'), x + 7, y + 6, { color: got ? P.sub : T.text.dim });
      if (got) g.img(icon(sp.el), x + cw - 17, y + 6);
      const im = IMG[k], px = Math.round(x + cw / 2 - 24), py = y + 18;
      g.ellipse(x + cw / 2, py + 33, 14, 2, T.deep.fill);
      if (im) { if (got) g.img(im, px, py - 4); else g.silhouette(im, px, py - 4, T.deep.frame); }
      g.text(got ? sp.name : '???', x + cw / 2, y + ch - 21, { font: got ? 'bold' : 'body', color: got ? P.main : T.text.dim, align: 'center' });
    });
  },
};
