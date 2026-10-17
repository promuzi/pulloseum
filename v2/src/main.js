// 풀로세움 v2 — 전부 도트로 다시 그린 판. 저해상도 캔버스 하나에 그리고 정수배로 키워 보여 준다.
//  진행은 서버가 맡음(로그인 · 일 하나마다 자동 저장 — net/api.js). ?offline=1 이나 ?scene=(촬영·검토 도구)이면 이 브라우저에서 같은 규칙으로 돌림(저장 안 함).
import { Screen } from './core/screen.js';
import { Gfx } from './core/gfx.js';
import { loadFonts, resetMetrics } from './core/text.js';
import { Input } from './core/input.js';
import { Router } from './core/router.js';
import { loadSprites, loadBig, loadBg, loadSmall, FIRST_BIG, FIRST_BG } from './art/sprites.js';
import { loadSkillArt } from './art/skillcard.js';
import { checkIcons } from './art/icons.js';
import { loadShips } from './art/ship.js';
import { toast as drawToast } from './art/ui.js';
import { mockState } from './data/mock.js';
import { SCENES } from './scenes/index.js';
import { drawOverlays } from './scenes/popups.js';
import { shotGuide } from './scenes/guide.js';
import { net, act as netAct } from './net/api.js';
import { closeForm } from './core/form.js';
import { setUi, UI_DEFAULT, holoFx } from './art/theme.js';
import { tryAutoStart, music } from './core/sound.js';

const screen = new Screen(document.getElementById('screen'));
screen.resize();
const g = new Gfx(screen.ctx);
const input = new Input(screen);
const router = new Router(SCENES);
const q0 = new URLSearchParams(location.search);
let chain = Promise.resolve();
const app = {
  screen, g, input, router, W: screen.W, H: screen.H, t: 0, state: null, user: null, toastMsg: null, toastT: 0,
  popup: null, confirm: null, sheet: null, chest: null, guide: null, guideWait: null, noGuide: (q0.has('scene') && !q0.has('guide')) || q0.has('noguide'), busy: 0, invite: (q0.get('room') || '').toUpperCase() || null,
  go(name, params, style) { router.go(name, params, app.t, style); },
  toast(msg) { app.toastMsg = msg; app.toastT = app.t; },
  now() { return net.now(); },
  // 일 하나(서버에 보내고 새 상태를 받음 — 요청은 차례대로). 실패하면 알림 띠를 띄우고 null
  settle() { return chain; },   // 보낸 일이 다 끝난 뒤(식물 바꾸기 직후 출전해도 바꾼 식물로 — 2026-10-16 사용자 "다른 식물로 전투가 시작된 적이 있어")
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
    net.setToken(null); app.user = null; app.state = null; app.sheet = null; app.popup = null; app.confirm = null; app.guide = null;
    if (app.room && app.room.stream) app.room.stream.close();
    app.room = null; closeForm();
    if (expired) app.toast('다시 로그인해 주세요');
    app.go('title', {}, 'dither');
  },
  openSettings() { app.sheet = 'settings'; },
};
window.__app = app;

window.addEventListener('resize', () => { if (!screen.fixed) { screen.resize(); g.ctx = screen.ctx; } });

// 화면 틀(2026-10-16 사용자 "화면의 길이, 기기에 따라서 여러 창 혹은 글자가 겹치는게 있어" · "홀로그램 화면도 왼쪽으로 쏠려있어"):
//  장면은 늘 가로 270칸으로 그림(그림·자리 값이 다 270 기준) — 더 넓은 기기는 가운데에 두고 양옆은 가장자리 한 줄을 늘여 잇고,
//  600칸보다 긴 기기는 장면 높이를 600에서 멈추고 아래 끝 줄을 늘여 이음. 짧은 기기(480~599)는 장면마다 아래 줄을 바닥에 붙여 맞춤.
export const VIEW_W = 270, VIEW_HMAX = 600;
const frameOf = (W, H) => ({ ox: Math.max(0, Math.floor((W - VIEW_W) / 2)), w: Math.min(W, VIEW_W), h: Math.min(H, VIEW_HMAX) });
function stretchEdges(c, s, W, H, F) {
  const cv = c.canvas, x0 = F.ox * s, x1 = (F.ox + F.w) * s, y1 = F.h * s, DW = W * s, DH = H * s;
  if (F.h >= H && F.ox <= 0 && x1 >= DW) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  if (y1 < DH) c.drawImage(cv, x0, y1 - 1, x1 - x0, 1, x0, y1, x1 - x0, DH - y1);
  if (x0 > 0) c.drawImage(cv, x0, 0, 1, DH, 0, 0, x0, DH);
  if (x1 < DW) c.drawImage(cv, x1 - 1, 0, 1, DH, x1, 0, DW - x1, DH);
  c.restore();
}
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
    const F = frameOf(screen.W, screen.H);
    app.t = ts; app.W = F.w; app.H = F.h; screen.ox = F.ox;
    screen.begin();
    g.c.translate(F.ox, 0);
    input.begin();
    router.draw(app);
    if (!router.phase) drawOverlays(app);
    if (app.toastMsg && app.t - app.toastT < 1600) drawToast(app, app.toastMsg); else app.toastMsg = null;
    stretchEdges(g.c, screen.s, screen.W, screen.H, F);
    screen.present();
    input.flush(app.guide ? null : router.cur);   // 처음 안내가 열린 동안엔 장면 끌기 · 밀기 없음
  } catch (e) {
    if (ts - lastErr > 2000) { lastErr = ts; console.error('화면 오류', router.name, e); window.__lastError = String(e && e.stack || e); }
    try { g.c.restore(); } catch {}
  }
}

(async () => {
  // 처음 로딩(2026-10-17 사용자 "처음에 로딩시간 너무 긴데"): 처음 화면 그림만 먼저 → 바로 조율, 글꼴 · 나머지는 조율 · 점화 동안 한꺼번에(전엔 글꼴 다음 묶음 여섯을 하나씩 차례로)
  const toTitle = !q0.get('scene');
  if (toTitle && !q0.has('mute') && !q0.has('at')) { music('title'); tryAutoStart(); }   // 켜자마자 처음 화면 곡(그림은 조율 2마디 검정 동안 받음 — 2026-10-17 "키자마자 노래가")
  if (toTitle) await Promise.all([loadBg(undefined, FIRST_BG), loadBig(undefined, FIRST_BIG)]);   // 처음 화면 그림만 먼저(글꼴 3.2MB와 통신을 나눠 쓰지 않게 — 글꼴은 그 뒤)
  const fonts = loadFonts().then(resetMetrics);
  if (!toTitle) await fonts;   // 검토 화면은 글자부터(촬영 도구가 바로 그림)
  const rest = Promise.all([loadSprites(), loadBig(), loadBg(), loadSmall(), loadShips(), loadSkillArt(), fonts]).then(([a, b, c, d, e, f]) => {
    const missing = [...a, ...b.map(k => 'v2/' + k), ...c.map(k => 'bg/' + k), ...d.map(k => 'small/' + k), ...e.map(k => 'ships/' + k), ...f.map(k => 'skills/' + k)], bad = checkIcons();
    if (missing.length) console.warn('빠진 그림', missing);
    if (bad.length) console.warn('아이콘 오류', bad);
    app.assetsReady = true;
    return { missing, bad };
  });
  if (!toTitle) await rest;
  // 검토 도구(?scene=)·오프라인 체험(?offline=1) = 시험 세이브로 이 브라우저에서
  if (q0.get('ui')) setUi(q0.get('ui'));   // 창 겉모습 후보 비교(?ui=sky|screen|glass|metal|ink|holo)
  if (q0.get('scene') || q0.has('offline')) { net.offline = true; app.state = mockState(); }
  router.set(q0.get('scene') || 'title', Object.fromEntries(q0.entries()));
  if (!q0.has('mute')) tryAutoStart();   // 자동 재생이 막혀 있지 않으면(앱 WebView 등) 바로 소리 — 막혀 있으면 첫 누름에(처음 화면 = 작은 '눌러서 시작')
  rest.then(r => { window.__ready = r; });   // 촬영 · 시험 도구는 다 받은 뒤(__ready)를 기다림
  window.__pause = (on = true) => { running = !on; };   // 촬영 도구가 시간을 직접 넘길 때 원래 화면 갱신을 멈춤(두 시계가 섞이면 끌기·용수철 계산이 꼬임)
  window.__holoFx = holoFx;   // 검토 도구: 창 띠리릭 켜기·간격
  requestAnimationFrame(frame);
})();

// 촬영: 정해진 논리 크기·배율로 한 장면을 오프스크린 캔버스에 그려 PNG 주소로 돌려준다(도구 tools/shots/v2shots.mjs)
window.__shot = (name, params = {}, opt = {}) => {
  running = false; net.offline = true;
  const W = opt.W || 270, H = opt.H || 600, k = opt.scale || 3, F = frameOf(W, H);
  const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
  const cx = cv.getContext('2d'); cx.setTransform(k, 0, 0, k, 0, 0); cx.imageSmoothingEnabled = false; cx.translate(F.ox, 0);
  const realG = app.g.c; app.g.ctx = cx;
  app.W = F.w; app.H = F.h; app.t = opt.t ?? 1000; app.state = mockState(); app.pxScale = k;
  app.popup = opt.popup || null; app.confirm = null; app.sheet = opt.sheet || null; app.chest = null; app.guide = null; app.guideWait = null; app.noGuide = true;
  setUi(opt.ui || UI_DEFAULT); holoFx.on = !!opt.holoFx;   // 정지 촬영엔 창 띠리릭 끔(opt.holoFx 로 켬)
  if (opt.plants) opt.plants.forEach((o, i) => o && app.state.plants[i] && Object.assign(app.state.plants[i], o));   // 식물 바꿔 찍기(검토 — [{ key, stage }, …] = 앞에서부터)
  if (opt.level) app.state.pending.push({ kind: 'level', level: opt.level, box: { credits: 120 + 60 * opt.level, water: 3 + (opt.level >> 1), fert: 1 + Math.floor(opt.level / 3), gems: opt.level % 3 ? 0 : 10 }, slots: 0 });
  router.set(name, params);
  input.begin(); input.pressedId = opt.pressed || null;
  router.draw(app);
  if (opt.guide != null) shotGuide(app, +opt.guide);   // 처음 안내 촬영(opt.guide = 몇 번째 장)
  if (opt.overlay !== false) { if (opt.chestOpen) { drawOverlays(app); if (app.chest) app.chest.open = app.t - (opt.chestOpen || 3000); } drawOverlays(app); }
  if (opt.toast) drawToast(app, opt.toast);
  stretchEdges(cx, k, W, H, F);
  input.pressedId = null; app.g.ctx = realG; app.pxScale = 0;
  return cv.toDataURL('image/png');
};
