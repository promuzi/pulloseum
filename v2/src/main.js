// 풀로세움 v2 — 전부 도트로 다시 그린 판. 저해상도 캔버스 하나에 그리고 정수배로 키워 보여 준다.
import { Screen } from './core/screen.js';
import { Gfx } from './core/gfx.js';
import { loadFonts } from './core/text.js';
import { Input } from './core/input.js';
import { Router } from './core/router.js';
import { loadSprites } from './art/sprites.js';
import { checkIcons } from './art/icons.js';
import { toast as drawToast } from './art/ui.js';
import { mockState } from './data/mock.js';
import { SCENES } from './scenes/index.js';

const screen = new Screen(document.getElementById('screen'));
screen.resize();
const g = new Gfx(screen.ctx);
const input = new Input(screen);
const router = new Router(SCENES);
const app = {
  screen, g, input, router, W: screen.W, H: screen.H, t: 0, state: mockState(), toastMsg: null, toastT: 0,
  go(name, params) { router.go(name, params, app.t); },
  toast(msg) { app.toastMsg = msg; app.toastT = app.t; },
};
window.__app = app;

window.addEventListener('resize', () => { if (!screen.fixed) { screen.resize(); g.ctx = screen.ctx; } });

let running = true;
function frame(ts) {
  if (running) {
    app.t = ts; app.W = screen.W; app.H = screen.H;
    screen.begin();
    input.begin();
    router.draw(app);
    if (app.toastMsg && app.t - app.toastT < 1400) drawToast(app, app.toastMsg); else app.toastMsg = null;
    screen.present();
    input.flush(router.cur);
  }
  requestAnimationFrame(frame);
}

(async () => {
  await loadFonts();
  const missing = await loadSprites();
  const bad = checkIcons();
  if (missing.length) console.warn('빠진 그림', missing);
  if (bad.length) console.warn('아이콘 오류', bad);
  const q = new URLSearchParams(location.search);
  router.set(q.get('scene') || 'title', Object.fromEntries(q.entries()));
  window.__ready = { missing, bad };
  requestAnimationFrame(frame);
})();

// 촬영: 정해진 논리 크기·배율로 한 장면을 오프스크린 캔버스에 그려 PNG 주소로 돌려준다(도구 tools/shots/v2shots.mjs)
window.__shot = (name, params = {}, opt = {}) => {
  running = false;
  const W = opt.W || 270, H = opt.H || 600, k = opt.scale || 3;
  const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
  const cx = cv.getContext('2d'); cx.setTransform(k, 0, 0, k, 0, 0); cx.imageSmoothingEnabled = false;
  const realG = app.g.c; app.g.ctx = cx;
  app.W = W; app.H = H; app.t = opt.t ?? 1000; app.state = mockState();
  router.set(name, params);
  input.begin(); input.pressedId = opt.pressed || null;
  router.draw(app);
  if (opt.toast) drawToast(app, opt.toast);
  input.pressedId = null; app.g.ctx = realG;
  return cv.toDataURL('image/png');
};
