import { TYPE } from '../art/palette.js';
import { plainBg } from '../art/bg.js';
import { button, chip, holoTab } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, plate, btnBody } from '../art/theme.js';
import { header, seedArt } from './common.js';
import { SPECIES } from '../data/mock.js';

export const bag = {
  theme: 'ship',
  enter() { this.sort = 'rarity'; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t);
    header(app, '종자 가방', { right: `${s.seeds.length}/${s.bagMax}` });
    // 정렬
    let x = 10; const y0 = 37;
    [['rarity', '희귀도'], ['name', '이름'], ['planet', '행성']].forEach(([id, label]) => {
      const on = this.sort === id, w = g.textW(label, 'label') + 18;
      holoTab(app, 'sort_' + id, x, y0, w, 21, label, on, () => { this.sort = id; });
      x += w + 5;
    });
    // 목록
    let y = 64;
    const P = T.ptext;
    s.seeds.forEach(sd => {
      const sp = sd.key && SPECIES[sd.key];
      plate(g, 8, y, W - 16, 54);
      plate(g, 13, y + 7, 32, 40, 'deep');
      seedArt(g, 29, y + 27, sp ? sp.el : 'grass', { rainbow: sd.rainbow });
      g.text(sd.name, 52, y + 7, { font: 'bold', color: sd.rainbow ? P.gold : P.main });
      // 희귀도 별
      const stars = sd.rainbow ? 0 : (sd.rarity === 'rare' ? 3 : 1);
      if (!sd.rainbow) for (let i = 0; i < 3; i++) g.img(icon(i < stars ? 'star' : 'starOff'), 52 + i * 12, y + 22);
      if (sd.rainbow) g.text('심기 전엔 모름', 52, y + 23, { color: P.sub });
      else {
        const sx = 92;
        chip(g, sx, y + 20, TYPE[sp.type], { icon: sp.type });
        g.img(icon(sp.el), sx + 44, y + 22);
      }
      g.text(sd.rainbow ? '시작 선물' : sd.from, 52, y + 37, { color: P.dim });
      button(app, 'plant_' + sd.id, W - 66, y + 7, 50, 21, '심기', { style: 'teal', onTap: () => app.go('home') });
      button(app, 'sell_' + sd.id, W - 66, y + 30, 50, 18, `${sd.price}`, { style: 'night', icon: 'coin', onTap: () => app.toast('판매') });
      y += 60;
    });
    button(app, 'bag_explore', 25, H - 50, W - 50, 30, '우주 지도에서 종자 찾기', { style: 'night', icon: 'navExplore', onTap: () => app.go('explore') });
  },
};
