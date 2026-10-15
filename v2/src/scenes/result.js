import { arena1 } from '../art/bg.js';
import { button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig, BGIMG } from '../art/sprites.js';
import { T, plate, btnBody, padV, venueOf } from '../art/theme.js';
import { bigTitle } from './common.js';

export const result = {
  // 경기를 치른 경기장 그대로(장소 테마)
  theme(app) { return this.venue || venueOf(app.state.tournament?.tier); },
  enter(p) { this.win = p.win !== false && p.win !== 'false'; this.venue = p.venue || null; },
  draw(app) {
    const { g, W, H, t } = app;
    const win = this.win;
    g.rect(0, 0, W, H, T.bg2);
    // 무대(1배 도트): 경기장 그림을 어둡게 깔고, 이긴 식물 뒤로 빛살
    const SH = 340;
    g.clip(0, 0, W, SH, () => {
      const bg = BGIMG['arena_' + T.key];
      if (bg) g.img(bg, 0, 0); else arena1(g, 0, 0, W, SH, t);
      g.alpha(0.62, () => g.rect(0, 0, W, SH, T.bg));
      const cx = Math.floor(W / 2), cy = 240;
      if (win) {
        const n = 14, rot = t / 4000;
        g.alpha(0.35, () => { for (let i = 0; i < n; i += 2) { const a0 = rot + i * (Math.PI * 2 / n), a1 = a0 + Math.PI / n; g.poly([[cx, cy - 64], [cx + Math.cos(a0) * 240, cy - 64 + Math.sin(a0) * 240], [cx + Math.cos(a1) * 240, cy - 64 + Math.sin(a1) * 240]], T.text.gold); } });
      }
      // 아래로 갈수록 바탕색으로 녹아드는 띠
      g.dither(0, SH - 60, W, 30, T.bg2, 8);
      g.rect(0, SH - 30, W, 30, T.bg2);
      padV(g, cx, cy, 52, true);
      drawBig(g, 'flower_grass', 'pot_terra', cx, cy, { t });
      if (win) for (let i = 0; i < 12; i++) { const a = t / 700 + i * 0.52, r = 64 + (i % 3) * 14; g.rect(Math.round(cx + Math.cos(a) * r), Math.round(cy - 64 + Math.sin(a) * r * 0.7), 2, 2, i % 2 ? T.text.gold : '#ffffff'); }
    });
    // 제목 + 진행
    bigTitle(g, win ? '승리' : '패배', W / 2, 30, Object.assign({ font: 'huge' }, win ? { top: '#fbff86', mid: '#f9c22b', low: '#f79617', shadow: '#9e4539' } : { top: '#c7dcd0', mid: '#9babb2', low: '#7f708a', shadow: '#3e3546' }));
    const pill = '예선 2승째', pw = g.textW(pill) + 20;
    btnBody(g, Math.round(W / 2 - pw / 2), 90, pw, 19, T.btn.second, true);
    g.text(pill, W / 2, 94, { color: T.btn.second.text, align: 'center', font: 'bold' });
    // 보상 카드 3장
    const y = 318, cw = 78, gap = 7, x0 = Math.round((W - cw * 3 - gap * 2) / 2), P = T.ptext;
    const cards = [['coin', '+60', '크레딧', P.gold], ['star', '+12', '성장', P.accent], ['water', '+1', '물', P.accent]];
    cards.forEach(([ic, v, label, col], i) => {
      const x = x0 + i * (cw + gap);
      plate(g, x, y, cw, 64);
      g.img(icon(ic), x + cw / 2 - 5, y + 9);
      g.text(v, x + cw / 2, y + 24, { font: 'head', color: col, align: 'center' });
      g.text(label, x + cw / 2, y + 44, { color: P.sub, align: 'center' });
    });
    g.text('예선 2승 0패 · 5판 중 2판', W / 2, y + 76, { color: T.text.main, align: 'center' });
    if (!win) g.text('불은 풀에 강해요. 물 속성 식물로 바꿔 보세요', W / 2, y + 94, { color: T.text.gold, align: 'center' });
    button(app, 'res_home', 25, H - 112, W - 50, 30, '홈으로', { style: 'teal', font: 'head', onTap: () => app.go('home') });
    button(app, 'res_skill', 25, H - 72, W - 50, 26, '기술 장착하러 가기', { style: 'night', icon: 'sword', onTap: () => app.go('plant', { tab: 'skill' }) });
  },
};
