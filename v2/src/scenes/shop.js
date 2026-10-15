import { plainBg, awning } from '../art/bg.js';
import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, plate, holo } from '../art/theme.js';
import { seedArt } from './common.js';
import { SHOP, SPECIES } from '../game/catalog.js';
import { showGot } from './popups.js';

// 상점(2026-10-16 사용자 "물 비료는 전투 탐사 수확에서 얻고 상점에서는 유료 재화로 구매"):
//  종자 꾸러미 = 돈, 보급품(물 · 비료 · 회귀 주사 · 연료) = 보석. 아래 = 암시장(식물 팔기 · 해체 — 컨셉은 뒷골목, 실제는 판매 + 해체).
const ART = { seed_common: { seed: 'grass' }, seed_rare: { seed: 'bolt', rare: true }, water10: { ic: 'water' }, fert5: { ic: 'fert' }, regress1: { ic: 'potion' }, fuel3: { ic: 'energy' } };
const DESC = { seed_common: '흔한 식물', seed_rare: '희귀 식물', water10: '생장 +10씩', fert5: '생장 +25씩', regress1: '기술 되돌리기', fuel3: '탐사 3번' };
const SHORT = { seed_common: '일반 종자', seed_rare: '희귀 종자', water10: '물 10', fert5: '비료 5', regress1: '회귀 주사', fuel3: '연료 3' };

export const shop = {
  theme: 'ship',   // 함선 장터(장소 테마 — 2026-10-15)
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t, 'shop_ship');
    awning(g, 28, W);
    hud(app, s);
    const cw = Math.floor((W - 16 - 12) / 3), P = T.ptext;
    let y = 46;
    const sections = [['종자 꾸러미', SHOP.filter(x => x.give.seed)], ['보급품', SHOP.filter(x => !x.give.seed)]];
    for (const [title, items] of sections) {
      g.text(title, 12, y + 4, { font: 'head', color: T.text.main, shadow: T.ink });
      if (title === '보급품') g.text('보석으로 사요', W - 12, y + 7, { color: T.text.sub, align: 'right', shadow: T.ink });
      y += 24;
      items.forEach((it, i) => {
        const col = i % 3, x = 8 + col * (cw + 6), yy = y + Math.floor(i / 3) * 106, A = ART[it.id] || {};
        plate(g, x, yy, cw, 100);
        plate(g, x + 7, yy + 7, cw - 14, 36, 'deep');
        if (A.seed) { seedArt(g, x + cw / 2, yy + 25, A.seed); if (A.rare) g.img(icon('star'), x + cw / 2 + 8, yy + 10); }
        else { const ic = icon(A.ic || 'box'); g.img(ic, Math.round(x + cw / 2 - ic.width), yy + 25 - ic.height, 2); }
        g.text(SHORT[it.id] || it.name, x + cw / 2, yy + 48, { font: 'bold', color: P.main, align: 'center' });
        g.text(DESC[it.id] || '', x + cw / 2, yy + 63, { color: P.sub, align: 'center' });
        const [cur, n] = Object.entries(it.cost)[0], can = s.wallet[cur] >= n;
        button(app, 'buy_' + it.id, x + 6, yy + 76, cw - 12, 19, String(n), { style: can ? 'gold' : 'off', icon: cur === 'gems' ? 'gem' : 'coin', disabled: !can, onTap: () => this.buy(app, it) });
      });
      y += Math.ceil(items.length / 3) * 106 + 4;
    }
    // 암시장
    const pr = app.input.isPressed('to_market'), my = y + 2 + (pr ? 1 : 0), mh = 58;
    holo(g, 8, my, W - 16, mh, { fill: '#1c1424', fill2: '#241a2e', frame: '#a884f3', frameHi: '#e0c8ff', frameLo: '#4a3460' }, 16);
    g.img(icon('coin'), 18, my + 10, 2);
    g.text('암시장', 46, my + 8, { font: 'head', color: '#e8d8ff' });
    g.text('식물 팔기(싸게) · 해체하면 접목 가지', 46, my + 30, { color: '#b8a8d8' });
    g.text('›', W - 22, my + 16, { font: 'head', color: '#e8d8ff' });
    app.input.hit('to_market', 8, y + 2, W - 16, mh, () => app.go('market'), 2);
    navBar(app, 'shop');
  },
  async buy(app, it) {
    const r = await app.act('buy', { item: it.id });
    if (!r) return;
    if (r.seed) { const sp = SPECIES[r.seed.key]; showGot(app, it.name, [{ kind: 'seed', seed: r.seed, rar: sp.rarity === 'rare' ? 3 : 1 }], '가방에 넣었어요 — 스마트팜에 심어 보세요'); }
    else app.toast(Object.entries(r.give).map(([k, n]) => `${{ water: '물', fert: '비료', regress: '회귀 주사', fuel: '연료' }[k] || k} +${n}`).join(' · '));
  },
};
