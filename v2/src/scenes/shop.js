import { C } from '../art/palette.js';
import { plainBg, awning } from '../art/bg.js';
import { hud, navBar, panel, rbox, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { IMG } from '../art/sprites.js';

// 화분 그림은 48×56 판의 아래쪽(화분 부분)만 잘라 쓴다
function potArt(g, key, cx, y) {
  const im = IMG[key]; if (!im) return;
  g.c.drawImage(im, 12, 37, 24, 19, cx - 12, y, 24, 19);
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
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t, 'shop');
    awning(g, 28, W);
    hud(app, s);
    let y = 50;
    const cw = Math.floor((W - 16 - 12) / 3);
    SECTIONS.forEach(sec => {
      g.text(sec.title, 12, y + 4, { font: 'head', color: C.white, shadow: C.ink });
      y += 24;
      sec.items.forEach((it, i) => {
        const x = 8 + i * (cw + 6);
        panel(g, x, y, cw, 108, 'night');
        // 진열대
        rbox(g, x + 8, y + 8, cw - 16, 38, 4, '#2b2238');
        g.rect(x + 10, y + 40, cw - 20, 2, C.wood1);
        if (it.pot) potArt(g, it.pot, x + cw / 2, y + 20);
        else { const ic = icon(it.art); g.img(ic, Math.round(x + cw / 2 - ic.width / 2), y + 24); }
        g.text(it.name, x + cw / 2, y + 52, { font: 'bold', color: C.white, align: 'center' });
        g.text(it.desc, x + cw / 2, y + 67, { color: C.mute, align: 'center' });
        if (it.price < 0) { rbox(g, x + 6, y + 82, cw - 12, 20, 4, C.shade); g.text('구매 불가', x + cw / 2, y + 86, { color: C.slate2, align: 'center' }); }
        else button(app, 'buy_' + it.id, x + 6, y + 82, cw - 12, 20, it.price ? String(it.price) : '무료', { style: it.price ? 'gold' : 'teal', icon: it.price ? 'coin' : null, onTap: () => app.toast(it.name) });
      });
      y += 118;
    });
    navBar(app, 'shop');
  },
};
