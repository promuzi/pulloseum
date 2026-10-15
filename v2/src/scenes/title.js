import { rng, titleBg1, asteroid1 } from '../art/bg.js';
import { button } from '../art/ui.js';
import { drawBig, BGIMG } from '../art/sprites.js';
import { T } from '../art/theme.js';
import { bigTitle } from './common.js';

// 밤 정원 타이틀 그림(assets/v2/bg/title_night.png)의 떠 있는 섬 윗면 가운데 = 화분 굽이 닿는 점(그림을 바꾸면 다시 잼)
export const TITLE_ISLAND = [134, 266];

export const title = {
  theme: 'night',   // 밤 정원(장소 테마 — 2026-10-15)
  draw(app) {
    const { g, W, H, t } = app;
    const bg = BGIMG.title_night, bob = (Math.floor(t / 800) % 2) * 2;
    let cx = Math.floor(W / 2), py = 258;
    if (bg) { g.img(bg, 0, 0); [cx, py] = TITLE_ISLAND; }
    else { titleBg1(g, W, H); asteroid1(g, cx, py + bob); }
    drawBig(g, 'flower_grass', 'pot_terra', cx, py + (bg ? 0 : bob), { t });
    // 반딧불 포자
    const R = rng(9);
    for (let i = 0; i < 9; i++) { const a = t / 1400 + i, x = cx + Math.round(Math.cos(a * 1.3 + i) * (54 + i * 6)), y = py - 64 + Math.round(Math.sin(a + i * 2) * 36); if (R() > 0.2) { g.rect(x, y, 2, 2, i % 2 ? '#cddf6c' : '#8ff8e2'); g.px(x - 1, y, T.ink); } }
    bigTitle(g, '풀로세움', W / 2, 74, { top: '#ffffff', mid: '#c8f8ec', low: '#8efbdb', line: T.ink, shadow: '#5e5cb1' });
    g.text('식물 배틀 콜로세움', W / 2, 112, { color: T.text.main, align: 'center', shadow: T.ink });
    const bw = 150, bx = Math.round((W - bw) / 2);
    button(app, 'title_start', bx, H - 168, bw, 32, '게임 시작', { style: 'teal', font: 'head', onTap: () => app.go('home') });
    button(app, 'title_opt', bx, H - 126, bw, 26, '설정', { style: 'night', onTap: () => app.toast('설정은 준비 중이에요') });
  },
};
