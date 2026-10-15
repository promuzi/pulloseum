import { plainBg, awning } from '../art/bg.js';
import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { SMALL_POT } from '../art/sprites.js';
import { T, plate, btnBody } from '../art/theme.js';

// 화분 그림 = 작은 칸 화분(48×56, 위 뒤 · 아래 앞 — small.mjs)에서 화분 둘레만 잘라 뒤 → 앞 순서로
function potArt(g, key, cx, y) {
  const im = SMALL_POT[key]; if (!im) return;
  const c = g.c; c.imageSmoothingEnabled = false;
  c.drawImage(im, 10, 28, 28, 24, cx - 14, y - 4, 28, 24);
  c.drawImage(im, 10, 56 + 28, 28, 24, cx - 14, y - 4, 28, 24);
}

const SECTIONS = [
  { title: '소모품', items: [
    { id: 'lvpot', name: '레벨업 물약', desc: '한 단계 성장', price: 0, art: 'potion' },
    { id: 'lock', name: '생장 멈춤 물약', desc: '단계 고정', price: 300, art: 'clock' },
    { id: 'box', name: '성장 상자', desc: '경험치 아이템', price: 200, art: 'box' },
  ] },
  { title: '화분', items: [
    { id: 'pot_ceramic', name: '도자기 화분', desc: '충전 +15%', price: 400, pot: 'pot_ceramic' },
    { id: 'pot_glass', name: '유리 화분', desc: '열매 +1', price: 900, pot: 'pot_glass' },
    { id: 'pot_crystal', name: '크리스탈 화분', desc: '탐사에서 발견', price: -1, pot: 'pot_crystal' },
  ] },
];

export const shop = {
  theme: 'ship',   // 함선 장터(장소 테마 — 2026-10-15)
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t, 'shop_ship');
    awning(g, 28, W);
    hud(app, s);
    let y = 50;
    const cw = Math.floor((W - 16 - 12) / 3);
    SECTIONS.forEach(sec => {
      g.text(sec.title, 12, y + 4, { font: 'head', color: T.text.main, shadow: T.ink });
      y += 24;
      sec.items.forEach((it, i) => {
        const x = 8 + i * (cw + 6);
        plate(g, x, y, cw, 110);
        // 진열대
        plate(g, x + 7, y + 7, cw - 14, 40, 'deep');
        g.rect(x + 11, y + 40, cw - 22, 2, T.deep.frame);
        if (it.pot) potArt(g, it.pot, x + cw / 2, y + 20);
        else { const ic = icon(it.art); g.img(ic, Math.round(x + cw / 2 - ic.width / 2), y + 24); }
        g.text(it.name, x + cw / 2, y + 52, { font: 'bold', color: T.ptext.main, align: 'center' });
        g.text(it.desc, x + cw / 2, y + 67, { color: T.ptext.sub, align: 'center' });
        if (it.price < 0) { btnBody(g, x + 6, y + 83, cw - 12, 21, T.btn.off, true); g.text('구매 불가', x + cw / 2, y + 87, { color: T.btn.off.text, align: 'center' }); }
        else button(app, 'buy_' + it.id, x + 6, y + 83, cw - 12, 21, it.price ? String(it.price) : '무료', { style: it.price ? 'gold' : 'teal', icon: it.price ? 'coin' : null, onTap: () => app.toast(it.name) });
      });
      y += 118;
    });
    navBar(app, 'shop');
  },
};
