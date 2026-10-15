import { C } from '../art/palette.js';
import { arena1, pad1 } from '../art/bg.js';
import { panel, rbox, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig } from '../art/sprites.js';
import { bigTitle } from './common.js';

export const result = {
  enter(p) { this.win = p.win !== false && p.win !== 'false'; },
  draw(app) {
    const { g, W, H, t } = app;
    const win = this.win;
    g.rect(0, 0, W, H, '#2b2238');
    // 무대(1배 도트 — 2026-10-15 ①안): 경기장을 어둡게 깔고, 이긴 식물 뒤로 빛살
    const SH = 340;
    g.clip(0, 0, W, SH, () => {
      arena1(g, 0, 0, W, SH, t);
      g.alpha(0.72, () => g.rect(0, 0, W, SH, '#1f1828'));
      const cx = Math.floor(W / 2), cy = 240;
      if (win) {
        const n = 14, rot = t / 4000;
        for (let i = 0; i < n; i++) {
          const a0 = rot + i * (Math.PI * 2 / n), a1 = a0 + Math.PI / n;
          g.poly([[cx, cy - 64], [cx + Math.cos(a0) * 240, cy - 64 + Math.sin(a0) * 240], [cx + Math.cos(a1) * 240, cy - 64 + Math.sin(a1) * 240]], i % 2 ? '#352845' : '#3e2a4d');
        }
      }
      // 아래로 갈수록 바탕색으로 녹아드는 띠
      g.vgrad(0, SH - 52, W, 52, ['#2b2238']);
      g.dither(0, SH - 80, W, 28, '#2b2238', 8);
      pad1(g, cx, cy, 52, win ? C.gold : C.slate);
      drawBig(g, 'flower_grass', 'pot_terra', cx, cy, { t });
      if (win) for (let i = 0; i < 12; i++) { const a = t / 700 + i * 0.52, r = 64 + (i % 3) * 14; g.rect(Math.round(cx + Math.cos(a) * r), Math.round(cy - 64 + Math.sin(a) * r * 0.7), 2, 2, i % 2 ? C.gold3 : C.white); }
    });
    // 제목 + 진행
    bigTitle(g, win ? '승리' : '패배', W / 2, 30, Object.assign({ font: 'huge' }, win ? { top: C.gold3, mid: C.gold, low: C.gold1, shadow: '#9e4539' } : { top: C.mist, mid: C.mute, low: C.slate2, shadow: C.shade }));
    const pill = '예선 2승째';
    const pw = g.textW(pill) + 18;
    rbox(g, Math.round(W / 2 - pw / 2), 92, pw, 17, 4, C.night); g.text(pill, W / 2, 95, { color: C.gold, align: 'center' });
    // 보상 카드 3장
    const y = 318, cw = 76, gap = 8, x0 = Math.round((W - cw * 3 - gap * 2) / 2);
    const cards = [['coin', '+60', '크레딧', C.gold], ['star', '+12', '성장', C.teal4], ['water', '+1', '물', C.blue3]];
    cards.forEach(([ic, v, label, col], i) => {
      const x = x0 + i * (cw + gap);
      panel(g, x, y, cw, 62, 'night');
      g.img(icon(ic), x + cw / 2 - 5, y + 9);
      g.text(v, x + cw / 2, y + 24, { font: 'head', color: col, align: 'center', shadow: C.ink });
      g.text(label, x + cw / 2, y + 43, { color: C.mute, align: 'center' });
    });
    g.text('예선 2승 0패 · 5판 중 2판', W / 2, y + 74, { color: C.mist, align: 'center' });
    if (!win) g.text('불은 풀에 강해요. 물 속성 식물로 바꿔 보세요', W / 2, y + 92, { color: C.gold, align: 'center' });
    button(app, 'res_home', 25, H - 112, W - 50, 30, '홈으로', { style: 'teal', font: 'head', onTap: () => app.go('home') });
    button(app, 'res_skill', 25, H - 72, W - 50, 24, '기술 장착하러 가기', { style: 'night', icon: 'sword', onTap: () => app.go('plant', { tab: 'skill' }) });
  },
};
