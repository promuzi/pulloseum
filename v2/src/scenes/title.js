import { C } from '../art/palette.js';
import { rng, titleBg1, asteroid1 } from '../art/bg.js';
import { button } from '../art/ui.js';
import { drawBig } from '../art/sprites.js';
import { bigTitle } from './common.js';

export const title = {
  draw(app) {
    const { g, W, H, t } = app;
    // 1배 도트(2026-10-15 ①안): 우주 + 행성(한 번 그려 둠) + 떠 있는 소행성 위 큰 판 식물
    titleBg1(g, W, H);
    const cx = Math.floor(W / 2), py = 258 + (Math.floor(t / 800) % 2) * 2;
    asteroid1(g, cx, py);
    drawBig(g, 'flower_grass', 'pot_terra', cx, py, { t });
    // 반딧불 포자
    const R = rng(9);
    for (let i = 0; i < 9; i++) { const a = t / 1400 + i, x = cx + Math.round(Math.cos(a * 1.3 + i) * (54 + i * 6)), y = py - 64 + Math.round(Math.sin(a + i * 2) * 36); if (R() > 0.2) { g.rect(x, y, 2, 2, i % 2 ? '#cddf6c' : '#8ff8e2'); g.px(x - 1, y, '#45293f'); } }
    bigTitle(g, '풀로세움', W / 2, 74);
    g.text('식물 배틀 콜로세움', W / 2, 112, { color: C.mist, align: 'center', shadow: C.ink });
    const bw = 150, bx = Math.round((W - bw) / 2);
    button(app, 'title_start', bx, H - 168, bw, 30, '게임 시작', { style: 'teal', font: 'head', onTap: () => app.go('home') });
    button(app, 'title_opt', bx, H - 128, bw, 24, '설정', { style: 'night', onTap: () => app.toast('설정은 준비 중이에요') });
  },
};
