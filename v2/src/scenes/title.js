import { C } from '../art/palette.js';
import { space, planet, rng } from '../art/bg.js';
import { button } from '../art/ui.js';
import { plantStack, bob } from '../art/sprites.js';
import { stage, bigTitle } from './common.js';

// 떠 있는 소행성 받침(반해상도 층 기준)
function asteroid(g, cx, cy) {
  const R = rng(5);
  g.ellipse(cx, cy + 3, 30, 7, C.ink);
  g.ellipse(cx, cy + 2, 29, 6, '#625565');
  g.ellipse(cx, cy, 28, 5, '#7f708a');
  g.ellipse(cx - 3, cy - 1, 22, 3, '#9babb2');
  for (let i = 0; i < 9; i++) { const x = cx - 22 + Math.floor(R() * 44); g.px(x, cy + 1 + Math.floor(R() * 3), '#625565'); }
  // 아래 바위 뿌리
  for (let k = 0; k < 4; k++) { const w = 22 - k * 5; g.rect(cx - w / 2 + (k % 2), cy + 7 + k * 3, w, 3, k % 2 ? '#3e3546' : '#45293f'); g.rect(cx - w / 2 + (k % 2), cy + 7 + k * 3, 1, 3, C.ink); g.rect(cx + w / 2 + (k % 2) - 1, cy + 7 + k * 3, 1, 3, C.ink); }
  g.rect(cx - 2, cy + 19, 4, 2, C.ink);
}

export const title = {
  draw(app) {
    const { g, W, H, t } = app;
    stage(app, 0, 0, W, H, (s, w, h) => {
      space(s, 0, 0, w, h, t, 11);
      planet(s, 6, h - 22, 46, 'water', { bands: true });
      planet(s, w - 22, 54, 9, 'earth', { ring: true, ringCol: '#ab947a' });
      planet(s, 28, 30, 3, 'wind');
      const cx = Math.floor(w / 2), py = 128 + (Math.floor(t / 800) % 2);
      asteroid(s, cx, py + 2);
      plantStack(s, 'flower_grass', 'pot_terra', cx - 24, py - 54, { bob: bob(t) });
      // 반딧불 포자
      const R = rng(9);
      for (let i = 0; i < 7; i++) { const a = t / 1400 + i, x = cx + Math.round(Math.cos(a * 1.3 + i) * (26 + i * 3)), y = py - 30 + Math.round(Math.sin(a + i * 2) * 18); if (R() > 0.2) s.px(x, y, i % 2 ? '#cddf6c' : '#8ff8e2'); }
    });
    bigTitle(g, '풀로세움', W / 2, 74);
    g.text('식물 배틀 콜로세움', W / 2, 112, { color: C.mist, align: 'center', shadow: C.ink });
    const bw = 150, bx = Math.round((W - bw) / 2);
    button(app, 'title_start', bx, H - 168, bw, 30, '게임 시작', { style: 'teal', font: 'head', onTap: () => app.go('home') });
    button(app, 'title_opt', bx, H - 128, bw, 24, '설정', { style: 'night', onTap: () => app.toast('설정은 준비 중이에요') });
  },
};
