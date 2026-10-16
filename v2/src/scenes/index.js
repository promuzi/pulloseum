import { C } from '../art/palette.js';
import { ICON_SRC, icon } from '../art/icons.js';
import { title, starter } from './title.js';
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
import { room } from './room.js';
import { cardFront } from '../art/skillcard.js';
import { SKILLS } from '../game/catalog.js';
import { BASICS } from '../battle/model.js';

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

// 카드 덧표시 검토판(개발용 · ?scene=cardlab): 왼쪽 = 보통, 오른쪽 = 그 상황(같은 자세 두 번째 · 충전 중 등)
const LAB = [['w_whirl', {}, {}, '흡수 = 회복 아이콘'], ['u_wind_3', {}, {}, '광역 = 폭탄'], ['guard', {}, { halved: true }, '같은 자세 두 번째'],
  ['u_thorn_3', {}, {}, '효과 겹 수'], ['m_bite', {}, { can: false, cd: 2 }, '변이 · 충전 중'], ['m_scale', {}, { can: false, cd: 1 }, '변이 · 충전 중']];
const cardlab = {
  draw(app) {
    const { g, W } = app;
    g.rect(0, 0, W, app.H, '#141a26');
    LAB.forEach(([id, a, b, label], i) => {
      const sk = SKILLS[id] || BASICS.find(x => x.id === id), col = i % 2, row = Math.floor(i / 2), x0 = 6 + col * 132, y0 = 6 + row * 112;
      cardFront(g, x0, y0, 62, 90, sk, { can: true, ...a });
      cardFront(g, x0 + 66, y0, 62, 90, sk, { can: true, ...b });
      g.text(label, x0 + 64, y0 + 93, { font: 'bold', color: '#e6f3ff', align: 'center' });
    });
  },
};

export const SCENES = { title, starter, room, home, battle, result, bag, plant, explore, shop, nursery, storage, matching, hangar, dex, icons, cardlab };
