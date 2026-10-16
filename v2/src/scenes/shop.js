import { plainBg, awning } from '../art/bg.js';
import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, plate } from '../art/theme.js';
import { seedArt } from './common.js';
import { SHOP, SPECIES } from '../game/catalog.js';
import { showGot } from './popups.js';
import { CARDS, cardFace } from '../game/cards.js';
import { cardTiny } from '../art/skillcard.js';

// 상점(2026-10-16 사용자 "물 비료는 전투 탐사 수확에서 얻고 상점에서는 유료 재화로 구매"):
//  종자 꾸러미 = 돈, 보급품(물 · 비료 · 회귀 주사 · 연료) = 보석. 식물 팔기 · 해체 = 고른 식물 아래 단추(스마트팜 · 보관고 · 식물 관리 설정).
const ART = { seed_common: { seed: 'grass' }, seed_rare: { seed: 'bolt', rare: true }, card_basic: { card: 'n_wall' }, card_mut: { card: 'v_scale' }, water10: { ic: 'can' }, fert5: { ic: 'fert' }, regress1: { ic: 'potion' }, fuel3: { ic: 'energy' } };
const DESC = { seed_common: '흔한 식물', seed_rare: '희귀 식물', card_basic: '일반 식물용', card_mut: '변이 식물용', water10: '생장 +10씩', fert5: '생장 +25씩', regress1: '기술 되돌리기', fuel3: '탐사 3번' };
const SHORT = { seed_common: '일반 종자', seed_rare: '희귀 종자', card_basic: '일반 카드', card_mut: '변이 카드', water10: '물 10', fert5: '비료 5', regress1: '회귀 주사', fuel3: '연료 3' };

export const shop = {
  theme: 'ship',   // 함선 장터(장소 테마 — 2026-10-15)
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t, 'shop_ship');
    awning(g, 28, W);
    hud(app, s);
    const cw = Math.floor((W - 16 - 12) / 3), P = T.ptext;
    // 짧은 화면(560 아래): 카드에서 설명 줄을 빼고 낮춰 암시장 판까지 탭 줄 위에 들어오게
    const compact = H < 560, CH = compact ? 82 : 100, RS = compact ? 88 : 106;
    let y = 46;
    const sections = [['종자 꾸러미', SHOP.filter(x => x.give.seed)], ['보급품', SHOP.filter(x => !x.give.seed)]];
    for (const [title, items] of sections) {
      g.text(title, 12, y + 4, { font: 'head', color: T.text.main, shadow: T.ink });
      y += 24;
      items.forEach((it, i) => {
        const col = i % 3, x = 8 + col * (cw + 6), yy = y + Math.floor(i / 3) * RS, A = ART[it.id] || {};
        plate(g, x, yy, cw, CH);
        plate(g, x + 7, yy + 7, cw - 14, 36, 'deep');
        if (A.seed) { seedArt(g, x + cw / 2, yy + 25, A.seed); if (A.rare) g.img(icon('star'), x + cw / 2 + 8, yy + 10); }
        else if (A.card) { cardTiny(g, Math.round(x + cw / 2 - 16), yy + 11, cardFace(A.card)); cardTiny(g, Math.round(x + cw / 2 - 4), yy + 9, cardFace(A.card)); }   // 카드 꾸러미 = 겹친 카드 두 장
        else { const ic = icon(A.ic || 'box'); g.img(ic, Math.round(x + cw / 2 - ic.width), yy + 25 - ic.height, 2); }
        g.text(SHORT[it.id] || it.name, x + cw / 2, yy + 48, { font: 'bold', color: P.main, align: 'center' });
        if (!compact) g.text(DESC[it.id] || '', x + cw / 2, yy + 63, { color: P.sub, align: 'center' });
        const [cur, n] = Object.entries(it.cost)[0], can = s.wallet[cur] >= n;
        button(app, 'buy_' + it.id, x + 6, yy + CH - 24, cw - 12, 19, String(n), { style: can ? 'gold' : 'off', icon: cur === 'gems' ? 'gem' : 'coin', disabled: !can, onTap: () => this.buy(app, it) });
      });
      y += Math.ceil(items.length / 3) * RS + 4;
    }
    navBar(app, 'shop');
  },
  async buy(app, it) {
    const r = await app.act('buy', { item: it.id });
    if (!r) return;
    if (r.seed) { const sp = SPECIES[r.seed.key]; showGot(app, it.name, [{ kind: 'seed', seed: r.seed, rar: sp.rarity === 'rare' ? 3 : 1 }], '가방에 넣었어요'); }
    else if (r.card) showGot(app, it.name, [{ kind: 'card', card: r.card, rar: (CARDS[r.card] || {}).rar || 1 }], '가방에 넣었어요');
    else app.toast(Object.entries(r.give).map(([k, n]) => `${{ water: '물', fert: '비료', regress: '회귀 주사', fuel: '연료' }[k] || k} +${n}`).join(' · '));
  },
};
