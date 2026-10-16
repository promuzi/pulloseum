// 풀로세움 v2 — 전부 도트로 다시 그린 판. 저해상도 캔버스 하나에 그리고 정수배로 키워 보여 준다.
//  진행은 서버가 맡음(로그인 · 일 하나마다 자동 저장 — net/api.js). ?offline=1 이나 ?scene=(촬영·검토 도구)이면 이 브라우저에서 같은 규칙으로 돌림(저장 안 함).
import { Screen } from './core/screen.js';
import { Gfx } from './core/gfx.js';
import { loadFonts } from './core/text.js';
import { Input } from './core/input.js';
import { Router } from './core/router.js';
import { loadSprites, loadBig, loadBg, loadSmall } from './art/sprites.js';
import { loadSkillArt } from './art/skillcard.js';
import { checkIcons } from './art/icons.js';
import { loadShips } from './art/ship.js';
import { toast as drawToast } from './art/ui.js';
import { mockState } from './data/mock.js';
import { SCENES } from './scenes/index.js';
import { drawOverlays } from './scenes/popups.js';
import { net, act as netAct } from './net/api.js';
import { closeForm } from './core/form.js';
import { setUi, UI_DEFAULT, holoFx } from './art/theme.js';
import { tryAutoStart } from './core/sound.js';

const screen = new Screen(document.getElementById('screen'));
screen.resize();
const g = new Gfx(screen.ctx);
const input = new Input(screen);
const router = new Router(SCENES);
const q0 = new URLSearchParams(location.search);
let chain = Promise.resolve();
const app = {
  screen, g, input, router, W: screen.W, H: screen.H, t: 0, state: null, user: null, toastMsg: null, toastT: 0,
  popup: null, confirm: null, sheet: null, chest: null, busy: 0, invite: (q0.get('room') || '').toUpperCase() || null,
  go(name, params, style) { router.go(name, params, app.t, style); },
  toast(msg) { app.toastMsg = msg; app.toastT = app.t; },
  now() { return net.now(); },
  // 일 하나(서버에 보내고 새 상태를 받음 — 요청은 차례대로). 실패하면 알림 띠를 띄우고 null
  act(op, args) {
    const p = chain.then(async () => {
      app.busy++;
      try { return await netAct(app, op, args); }
      catch (e) { app.toast(e.message || '문제가 생겼어요'); if (e.status === 401) app.logout(true); return null; }
      finally { app.busy--; }
    });
    chain = p.catch(() => {});
    return p;
  },
  logout(expired = false) {
    if (!expired && !net.offline && net.token) net.req('/api/logout', {}).catch(() => {});
    net.setToken(null); app.user = null; app.state = null; app.sheet = null; app.popup = null; app.confirm = null;
    if (app.room && app.room.stream) app.room.stream.close();
    app.room = null; closeForm();
    if (expired) app.toast('다시 로그인해 주세요');
    app.go('title', {}, 'dither');
  },
  openSettings() { app.sheet = 'settings'; },
};
window.__app = app;

window.addEventListener('resize', () => { if (!screen.fixed) { screen.resize(); g.ctx = screen.ctx; } });

let running = true, lastErr = 0, timeOff = 0;
function frame(ts) {
  requestAnimationFrame(frame);   // 먼저 다음 장을 예약(그리다 오류가 나도 화면이 멈추지 않게)
  if (running) frameBody(Math.max(app.t, ts + timeOff));
}
// 시험 도구: 창이 가려져 브라우저가 그림 시계를 멈췄을 때(미리보기 창 등) 시간을 직접 넘기며 그림 — 넘긴 만큼 시계를 앞당겨 둬서 진짜 시계와 섞여도 시간이 거꾸로 가지 않음
window.__advance = (ms = 600, dt = 33) => { const t0 = Math.max(app.t, performance.now() + timeOff); for (let k = dt; k <= ms; k += dt) frameBody(t0 + k); timeOff = app.t - performance.now(); return { scene: router.name, t: app.t }; };
window.__frame = ts => frameBody(ts);   // 영상 도구: 정확한 시각(ms)으로 한 장(누르기 처리 · 겹창 · 알림 띠까지 실제와 같게)
function frameBody(ts) {
  try {
    app.t = ts; app.W = screen.W; app.H = screen.H;
    screen.begin();
    input.begin();
    router.draw(app);
    if (!router.phase) drawOverlays(app);
    if (app.toastMsg && app.t - app.toastT < 1600) drawToast(app, app.toastMsg); else app.toastMsg = null;
    screen.present();
    input.flush(router.cur);
  } catch (e) {
    if (ts - lastErr > 2000) { lastErr = ts; console.error('화면 오류', router.name, e); window.__lastError = String(e && e.stack || e); }
    try { g.c.restore(); } catch {}
  }
}

(async () => {
  await loadFonts();
  const missing = [...await loadSprites(), ...(await loadBig()).map(k => 'v2/' + k), ...(await loadBg()).map(k => 'bg/' + k), ...(await loadSmall()).map(k => 'small/' + k), ...(await loadShips()).map(k => 'ships/' + k), ...(await loadSkillArt()).map(k => 'skills/' + k)];
  const bad = checkIcons();
  if (missing.length) console.warn('빠진 그림', missing);
  if (bad.length) console.warn('아이콘 오류', bad);
  // 검토 도구(?scene=)·오프라인 체험(?offline=1) = 시험 세이브로 이 브라우저에서
  if (q0.get('ui')) setUi(q0.get('ui'));   // 창 겉모습 후보 비교(?ui=sky|screen|glass|metal|ink|holo)
  if (q0.get('scene') || q0.has('offline')) { net.offline = true; app.state = mockState(); }
  router.set(q0.get('scene') || 'title', Object.fromEntries(q0.entries()));
  if (!q0.has('mute')) tryAutoStart();   // 자동 재생이 막혀 있지 않으면(앱 WebView 등) 바로 소리 — 막혀 있으면 첫 누름에(처음 화면 = 작은 '눌러서 시작')
  window.__ready = { missing, bad };
  window.__pause = (on = true) => { running = !on; };   // 촬영 도구가 시간을 직접 넘길 때 원래 화면 갱신을 멈춤(두 시계가 섞이면 끌기·용수철 계산이 꼬임)
  window.__holoFx = holoFx;   // 검토 도구: 창 띠리릭 켜기·간격
  requestAnimationFrame(frame);
})();

// 촬영: 정해진 논리 크기·배율로 한 장면을 오프스크린 캔버스에 그려 PNG 주소로 돌려준다(도구 tools/shots/v2shots.mjs)
window.__shot = (name, params = {}, opt = {}) => {
  running = false; net.offline = true;
  const W = opt.W || 270, H = opt.H || 600, k = opt.scale || 3;
  const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
  const cx = cv.getContext('2d'); cx.setTransform(k, 0, 0, k, 0, 0); cx.imageSmoothingEnabled = false;
  const realG = app.g.c; app.g.ctx = cx;
  app.W = W; app.H = H; app.t = opt.t ?? 1000; app.state = mockState(); app.pxScale = k;
  app.popup = opt.popup || null; app.confirm = null; app.sheet = opt.sheet || null; app.chest = null;
  setUi(opt.ui || UI_DEFAULT); holoFx.on = !!opt.holoFx;   // 정지 촬영엔 창 띠리릭 끔(opt.holoFx 로 켬)
  if (opt.level) app.state.pending.push({ kind: 'level', level: opt.level, box: { credits: 120 + 60 * opt.level, water: 3 + (opt.level >> 1), fert: 1 + Math.floor(opt.level / 3), gems: opt.level % 3 ? 0 : 10 }, slots: 0 });
  router.set(name, params);
  input.begin(); input.pressedId = opt.pressed || null;
  router.draw(app);
  if (opt.overlay !== false) { if (opt.chestOpen) { drawOverlays(app); if (app.chest) app.chest.open = app.t - (opt.chestOpen || 3000); } drawOverlays(app); }
  if (opt.toast) drawToast(app, opt.toast);
  input.pressedId = null; app.g.ctx = realG; app.pxScale = 0;
  return cv.toDataURL('image/png');
};
