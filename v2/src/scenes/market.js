import { plainBg } from '../art/bg.js';
import { button } from '../art/ui.js';
import { drawPortrait } from '../art/sprites.js';
import { T, holo } from '../art/theme.js';
import { header, miniStars } from './common.js';
import { sellPrice } from '../game/logic.js';
import { stageName, stars } from '../game/view.js';
import { ask, showGot } from './popups.js';
import { eul } from '../core/josa.js';

// 암시장(2026-10-16 사용자 "암시장은 무조건 환급이지만 돈을 적게 주는 거임. 싸게 팔기 or 분해해서 얻을 거 챙기기 — 실제로는 버리기+판매"):
//  스마트팜 · 보관고 식물 목록 → 팔기(돈) 또는 해체(접목 가지 · 회귀 주사 · 물건 — 많이 키운 식물일수록 좋은 것). 스마트팜엔 하나는 남겨 둠.
const ROW = 50, TOP = 66;
export const market = {
  theme: 'night',
  enter() { this.scroll = 0; },
  onDrag(dy, dx, ev) { if (ev.y0 < TOP) return; this.scroll = Math.max(0, Math.min(this.max || 0, this.scroll - dy)); },
  draw(app) {
    const { g, W, H, t, state: s } = app, P = T.ptext;
    plainBg(g, W, H, t);
    g.c.fillStyle = 'rgba(20,8,30,0.45)'; g.c.fillRect(0, 0, W, H);
    header(app, '암시장', { backTo: 'shop', right: `돈 ${s.wallet.credits}` });
    g.text('무조건 사 주지만 싸요 · 해체하면 접목 가지가 나와요', W / 2, 40, { color: '#c8b8e8', align: 'center' });
    const list = [...s.plants.map(p => ({ p, farm: true })), ...s.storage.map(p => ({ p, farm: false }))];
    const bottom = H - 10, viewH = bottom - TOP;
    this.max = Math.max(0, list.length * ROW - viewH);
    const hits = [];
    g.clip(0, TOP, W, viewH, () => {
      list.forEach(({ p, farm }, i) => {
        const y = TOP + i * ROW - Math.round(this.scroll);
        if (y + ROW < TOP || y > bottom) return;
        const last = farm && s.plants.length < 2, price = sellPrice(p);
        holo(g, 8, y, W - 16, ROW - 6, { fill: '#160f20', fill2: '#1d1428', frame: '#5a4478', frameHi: '#a884f3', frameLo: '#2a1e3a' }, 16);
        g.rect(14, y + 5, 34, 34, '#0a0614');
        g.clip(15, y + 6, 32, 32, () => drawPortrait(g, p.key, 15, y + 6, 32, false));
        g.text(p.name, 54, y + 5, { font: 'bold', color: p.shiny ? '#ffe8a8' : '#e8d8ff' });
        miniStars(g, 58 + g.textW(p.name, 'bold'), y + 8, stars(p));
        g.text(`${stageName(p)} Lv${p.lv} · ${farm ? '스마트팜' : '보관고'}`, 54, y + 23, { color: last ? '#ff9a8a' : '#a898c8' });
        const bx = W - 116;
        button(app, 'mk_sell_' + p.uid, bx, y + 8, 52, 28, String(price), { style: last ? 'off' : 'gold', icon: 'coin', disabled: last, onTap: null });
        button(app, 'mk_cut_' + p.uid, bx + 56, y + 8, 46, 28, '해체', { style: last ? 'off' : 'red', disabled: last, onTap: null });
        if (!last) {
          hits.push({ id: 'mk_sell_' + p.uid, x: bx, y: y + 8, w: 52, h: 28, fn: () => ask(app, `${eul(p.name)} 팔까요?`, `돈 ${price} 받기 · 되돌릴 수 없어요`, () => app.act('sell', { id: p.uid }).then(r => r && app.toast(`돈 +${r.credits}`)), '팔기') });
          hits.push({ id: 'mk_cut_' + p.uid, x: bx + 56, y: y + 8, w: 46, h: 28, fn: () => ask(app, `${eul(p.name)} 해체할까요?`, '식물은 사라지고 접목 가지 · 주사 · 물건이 나와요', () => app.act('dismantle', { id: p.uid }).then(r => r && showGot(app, `${p.name} 해체`, r.got)), '해체') });
        }
      });
    });
    for (const h of hits) if (h.y >= TOP && h.y + h.h <= bottom) app.input.hit(h.id, h.x, h.y, h.w, h.h, h.fn, 2);
  },
};
