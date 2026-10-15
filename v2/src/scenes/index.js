import { C } from '../art/palette.js';
import { ICON_SRC, icon } from '../art/icons.js';
import { title } from './title.js';
import { home } from './home.js';
import { battle } from './battle.js';
import { result } from './result.js';
import { bag } from './bag.js';
import { plant } from './plant.js';
import { explore } from './explore.js';
import { shop } from './shop.js';
import { nursery } from './nursery.js';
import { dex } from './dex.js';
import { storage } from './storage.js';
import { matching } from './matching.js';
import { hangar } from './hangar.js';

// 아이콘 검토판(개발용)
const icons = {
  draw(app) {
    const { g, W, H } = app;
    g.rect(0, 0, W, H, '#2b2238');
    let x = 8, y = 8;
    for (const name of Object.keys(ICON_SRC)) {
      const ic = icon(name);
      if (x + 40 > W) { x = 8; y += 34; }
      g.rect(x, y, 38, 30, C.shade);
      g.img(ic, x + Math.round(19 - ic.width / 2), y + 3);
      g.text(name.slice(0, 6), x + 19, y + 17, { color: C.mute, align: 'center' });
      x += 42;
    }
  },
};

export const SCENES = { title, home, battle, result, bag, plant, explore, shop, nursery, storage, matching, hangar, dex, icons };
