// 풀로세움 v2 — 전부 도트로 다시 그린 판. 저해상도 캔버스 하나에 그리고 정수배로 키워 보여 준다.
//  진행은 서버가 맡음(로그인 · 일 하나마다 자동 저장 — net/api.js). ?offline=1 이나 ?scene=(촬영·검토 도구)이면 이 브라우저에서 같은 규칙으로 돌림(저장 안 함).
import './core/canvasfix.js';   // 맨 처음: 코드가 만드는 그림 판 = CPU 판(앱이 뒤로 갔다 와도 내용이 남음 — 2026-10-18)
import { Screen } from './core/screen.js';
import { Gfx } from './core/gfx.js';
import { loadFonts, resetMetrics } from './core/text.js';
import { Input } from './core/input.js';
import { Router } from './core/router.js';
import { loadSprites, loadBig, loadBg, loadSmall, FIRST_BIG, FIRST_BG } from './art/sprites.js';
import { loadSkillArt } from './art/skillcard.js';
import { loadItemArt } from './art/items.js';   // 종자 · 상점 물건 그림(2026-10-22)
import { checkIcons, loadIconArt } from './art/icons.js';
import { loadShips } from './art/ship.js';
import { toast as drawToast } from './art/ui.js';
import { mockState } from './data/mock.js';
import { SCENES } from './scenes/index.js';
import { drawOverlays, gotScroll } from './scenes/popups.js';
import { draftScroll, openDraft, draftShot } from './scenes/draft.js';
import { seedPickDrag } from './scenes/seedpick.js';
import { teamPickDrag, openTeamPick } from './scenes/teampick.js';
import { CARDS, isSkillCard, cardFits } from './game/cards.js';
import { shotGuide } from './scenes/guide.js';
import { net, act as netAct } from './net/api.js';
import { closeForm } from './core/form.js';
import { setUi, UI_DEFAULT, holoFx } from './art/theme.js';
import { tryAutoStart, music } from './core/sound.js';
import { runOp } from './game/ops.js';
import { bloomPool, levelReward } from './game/catalog.js';
import { bigKey } from './art/sprites.js';
import { stageKey } from './game/view.js';
import { shinyBoard } from './scenes/shinyboard.js';

const screen = new Screen(document.getElementById('screen'));
screen.resize();
const g = new Gfx(screen.ctx);
const input = new Input(screen);
const router = new Router(SCENES);
const q0 = new URLSearchParams(location.search);
let chain = Promise.resolve();
// 빨리 반응(2026-10-17 사용자 "물주는거랑 비료 주는거 반응속도가 좀 느려 · 진화 버튼도 안 눌려 · 모든 버튼이 공통적으로"):
//  일마다 서버 한 번 왕복(0.2~0.3초)을 기다린 뒤에야 화면이 바뀌고, 여러 번 누르면 차례로 줄을 섬 →
//  QUICK(난수 · 보상 굴림 없는 일)은 같은 규칙(game/ops.js)으로 이 화면에서 먼저 하고 바로 보여 준 뒤 서버에 보냄.
//  서버 상태는 줄 선 일이 다 끝났을 때 한 번만 받아 맞춤(중간 답으로 덮으면 뒤에 누른 것이 잠깐 되돌아감) · 서버가 거절하면 다시 받아 맞춤.
//  그 밖의 일(진화 · 수확 · 탐사 · 구매 …)은 서버 답을 기다림 — 기다리는 동안 화면 맨 위 가는 띠(0.16초 넘으면)
const QUICK = new Set(['feed', 'draftPick', 'draftApply', 'graft', 'graftHold', 'seedMark', 'setActive', 'setFav', 'setMode', 'setLeague', 'setTeam', 'setProfile', 'upgrade', 'resetPoints', 'rename', 'swapJoker', 'setSlots', 'setCards', 'setLoadout', 'ack', 'guide', 'cardUp', 'sellCard', 'discardCard']);
let pendOps = 0, lastSrv = null, stale = false;
const app = {
  screen, g, input, router, W: screen.W, H: screen.H, t: 0, state: null, user: null, toastMsg: null, toastT: 0, waiting: 0, waitT: 0,
  popup: null, confirm: null, sheet: null, chest: null, guide: null, guideWait: null, noGuide: (q0.has('scene') && !q0.has('guide')) || q0.has('noguide'), busy: 0, invite: (q0.get('room') || '').toUpperCase() || null,
  go(name, params, style) { router.go(name, params, app.t, style); },
  toast(msg) { app.toastMsg = msg; app.toastT = app.t; },
  now() { return net.now(); },
  // 일 하나(서버에 보내고 새 상태를 받음 — 요청은 차례대로). 실패하면 알림 띠를 띄우고 null
  settle() { return chain; },   // 보낸 일이 다 끝난 뒤(식물 바꾸기 직후 출전해도 바꾼 식물로 — 2026-10-16 사용자 "다른 식물로 전투가 시작된 적이 있어")
  act(op, args) {
    if (net.offline) {   // 오프라인 체험 · 촬영: 이 화면에서 바로(저장 안 함)
      const p0 = chain.then(async () => { try { return await netAct(app, op, args); } catch (e) { app.toast(e.message || '문제가 생겼어요'); return null; } });
      chain = p0.catch(() => {});
      return p0;
    }
    const quick = QUICK.has(op) && !!app.state;
    let res = null;
    if (quick) { try { res = runOp(app.state, op, args, { rng: Math.random, now: app.now() }); } catch (e) { app.toast(e.message || '할 수 없어요'); return Promise.resolve(null); } }
    pendOps++;
    if (!quick && app.waiting++ === 0) app.waitT = app.t;
    const p = chain.then(async () => {
      app.busy++;
      try { const r = await net.req('/api/act', { op, args }); lastSrv = r.state; return quick ? res : r.res; }
      catch (e) { stale = true; app.toast(e.message || '문제가 생겼어요'); if (e.status === 401) app.logout(true); return null; }
      finally {
        app.busy--; if (!quick) app.waiting--;
        if (--pendOps === 0) {
          if (stale) { stale = false; lastSrv = null; if (net.token) net.req('/api/me').then(r => { if (r && r.state && pendOps === 0) app.state = r.state; }).catch(() => {}); }
          else if (lastSrv && app.user) { app.state = lastSrv; lastSrv = null; }
        }
      }
    });
    chain = p.catch(() => {});
    return quick ? Promise.resolve(res) : p;
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
//  600칸보다 긴 기기는 장면 높이를 600에서 멈추고 아래 끝 줄을 늘여 이음(scene.tall = 그 장면은 높이 그대로 — 전투). 짧은 기기(480~599)는 장면마다 아래 줄을 바닥에 붙여 맞춤.
export const VIEW_W = 270, VIEW_HMAX = 600;
const frameOf = (W, H, tall = false) => ({ ox: Math.max(0, Math.floor((W - VIEW_W) / 2)), w: Math.min(W, VIEW_W), h: tall ? H : Math.min(H, VIEW_HMAX) });
// 위 안전 여백(screen.oy — 카메라 구멍 · 둥근 모서리 · 노치)은 어두운 띠로 비움(장면은 그 아래부터) · 아래 여백 · 600칸 아래는 끝 줄을 늘여 이음
const TOP_FILL = '#05070d';
function stretchEdges(c, s, W, H, F, oy = 0, ob = 0) {
  const cv = c.canvas, x0 = F.ox * s, x1 = (F.ox + F.w) * s, y0 = oy * s, y1 = (oy + F.h) * s, DW = W * s, DH = (H + oy + ob) * s;
  if (!oy && y1 >= DH && F.ox <= 0 && x1 >= DW) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  if (y1 < DH) c.drawImage(cv, x0, y1 - 1, x1 - x0, 1, x0, y1, x1 - x0, DH - y1);
  if (y0 > 0) { c.fillStyle = TOP_FILL; c.fillRect(x0, 0, x1 - x0, y0); }
  if (x0 > 0) c.drawImage(cv, x0, 0, 1, DH, 0, 0, x0, DH);
  if (x1 < DW) c.drawImage(cv, x1 - 1, 0, 1, DH, x1, 0, DW - x1, DH);
  c.restore();
}
let running = true, lastErr = 0, timeOff = 0, lastDraw = -1e9;
// 장 수(2026-10-17 사용자 "게임 발열이 심하다는데 확인해봐"): 전엔 화면이 부를 때마다(1초 60장 · 120Hz 폰은 120장) 통째로 다시 그렸다 —
//  만지는 중 · 막 뗀 뒤 · 장면이 넘어가는 동안 = 1초 60장, 그 밖(숨쉬기 · 반짝임처럼 느린 움직임뿐) = 30장. 움직임은 시각으로 셈하므로 빠르기는 그대로
//  (식물 그림 움직임은 1초 20장 그림이라 30장이면 다 보임). scene.fast(app) = 그 장면이 지금 60장이 필요하다고 할 때
function frame(ts) {
  requestAnimationFrame(frame);   // 먼저 다음 장을 예약(그리다 오류가 나도 화면이 멈추지 않게)
  if (!running) return;
  const cur = router.cur, fast = input.busy() || router.phase || !!app.draft || (cur && cur.fast && cur.fast(app));
  if (ts - lastDraw < (fast ? 1000 / 60 : 1000 / 30) - 3) return;
  lastDraw = ts;
  frameBody(Math.max(app.t, ts + timeOff));
}
// 시험 도구: 창이 가려져 브라우저가 그림 시계를 멈췄을 때(미리보기 창 등) 시간을 직접 넘기며 그림 — 넘긴 만큼 시계를 앞당겨 둬서 진짜 시계와 섞여도 시간이 거꾸로 가지 않음
window.__advance = (ms = 600, dt = 33) => { const t0 = Math.max(app.t, performance.now() + timeOff); for (let k = dt; k <= ms; k += dt) frameBody(t0 + k); timeOff = app.t - performance.now(); return { scene: router.name, t: app.t }; };
window.__frame = ts => frameBody(ts);   // 영상 도구: 정확한 시각(ms)으로 한 장(누르기 처리 · 겹창 · 알림 띠까지 실제와 같게)
function frameBody(ts) {
  try {
    const F = frameOf(screen.W, screen.H, !!(router.cur && router.cur.tall));
    app.t = ts; app.W = F.w; app.H = F.h; screen.ox = F.ox;
    screen.begin();
    g.c.translate(F.ox, screen.oy || 0);
    input.begin();
    router.draw(app);
    if (!router.phase) drawOverlays(app);
    if (app.toastMsg && app.t - app.toastT < 1600) drawToast(app, app.toastMsg); else app.toastMsg = null;
    if (app.waiting > 0 && app.t - app.waitT > 160) {   // 서버 답을 기다리는 중: 화면 맨 위 2칸 띠에 빛 토막이 왼쪽 → 오른쪽
      const w = app.W, seg = Math.round(w * 0.3), x = Math.round(((app.t - app.waitT) / 900 % 1) * (w + seg)) - seg;
      g.rect(0, 0, w, 2, 'rgba(10,18,34,0.55)'); g.rect(Math.max(0, x), 0, Math.min(seg, w - Math.max(0, x), seg + x), 2, '#8ccfff');
    }
    stretchEdges(g.c, screen.s, screen.W, screen.H, F, screen.oy || 0, screen.ob || 0);
    screen.present();
    input.flush(app.guide ? null : app.popup && !app.confirm ? gotScroll(app) : app.draft ? draftScroll(app) : app.seedpick ? seedPickDrag(app) : app.teampick ? teamPickDrag(app) : router.cur);   // 처음 안내가 열린 동안엔 장면 끌기 · 밀기 없음 · 받은 것 판 = 그 판의 칸 줄 · 카드 고르기 = 설명 판 글을 끎
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
  const rest = Promise.all([loadSprites(), loadBig(), loadBg(), loadSmall(), loadShips(), loadSkillArt(), fonts, loadItemArt(), loadIconArt()]).then(([a, b, c, d, e, f, , h, ic]) => {
    const missing = [...a, ...b.map(k => 'v2/' + k), ...c.map(k => 'bg/' + k), ...d.map(k => 'small/' + k), ...e.map(k => 'ships/' + k), ...f.map(k => 'skills/' + k), ...h.map(k => 'items/' + k), ...ic.map(k => 'icons/' + k)], bad = checkIcons();
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
window.__shinyBoard = shinyBoard;   // 색 변종 검토판(개발용 — tools/shots/shinyboard.mjs)
window.__shot = (name, params = {}, opt = {}) => {
  running = false; net.offline = true;
  const W = opt.W || 270, H = opt.H || 600, k = opt.scale || 3, F = frameOf(W, H, !!(router.scenes[name] && router.scenes[name].tall));
  const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
  const cx = cv.getContext('2d'); cx.setTransform(k, 0, 0, k, 0, 0); cx.imageSmoothingEnabled = false; cx.translate(F.ox, 0);
  const realG = app.g.c; app.g.ctx = cx;
  app.W = F.w; app.H = F.h; app.t = opt.t ?? 1000; app.state = mockState(); app.pxScale = k;
  app.popup = opt.popup || null; app.confirm = null; app.sheet = opt.sheet || null; app.chest = null; app.guide = null; app.guideWait = null; app.noGuide = true;
  setUi(opt.ui || UI_DEFAULT); holoFx.on = !!opt.holoFx;   // 정지 촬영엔 창 띠리릭 끔(opt.holoFx 로 켬)
  if (opt.plants) opt.plants.forEach((o, i) => o && app.state.plants[i] && Object.assign(app.state.plants[i], o));
  if (opt.profile) Object.assign(app.state.profile, opt.profile);   // 배너 · 대표 식물 촬영(2026-10-22)
  if (opt.level2) app.state.user.level = opt.level2;
  if (opt.seedsAdd) opt.seedsAdd.forEach((o, i) => app.state.seeds.push({ id: 'shot_sa' + i, ...o }));   // 종자 가방 카드 · 정렬 촬영(2026-10-22 — 여러 종 · 희귀 · 전설 · 색 변종 · 변이 · 즐겨찾기 · 잠금)
  if (opt.seedsLike) { const k = app.state.plants[app.state.active || 0].key; for (let i = 0; i < opt.seedsLike; i++) app.state.seeds.push({ id: 'shot_sd' + i, key: k }); }   // 같은 종 종자 n개(종자 거름 촬영)   // 식물 바꿔 찍기(검토 — [{ key, stage }, …] = 앞에서부터)
  app.seedpick = null; app.teampick = null;
  if (opt.teampick) { openTeamPick(app, opt.teampick.sel.map(i => app.state.plants[i] && app.state.plants[i].uid), null); app.teampick.sy = opt.teampick.sy || 0; app.teampick.lift = opt.teampick.lift ?? null; }   // 3:3 팀 고르기 촬영(opt.teampick = { sel: [몇째 …], sy })
  if (opt.seedpick) {   // 종자 거름 고르기 촬영(opt.seedpick = { mode, sel: [몇째 …], stage: 'stat', stat, info: 몇째, special: 몇째를 전설로 })
    const O = opt.seedpick, p = app.state.plants[app.state.active || 0], mine = app.state.seeds.filter(sd => sd.key === p.key);
    if (O.special != null && mine[O.special]) mine[O.special].legend = true;
    for (const i of O.fav || []) if (mine[i]) mine[i].fav = true;
    for (const i of O.lock || []) if (mine[i]) mine[i].lock = true;
    app.seedpick = { uid: p.uid, sel: new Set((O.sel || []).map(i => mine[i] && mine[i].id).filter(Boolean)), mode: O.mode || 'view', sy: 0, info: O.info != null && mine[O.info] ? mine[O.info].id : null, stage: O.stage || null, stat: O.stat || null };
  }
  if (opt.level) { const box = levelReward(opt.level); delete box.seed; delete box.card; app.state.pending.push({ kind: 'level', level: opt.level, box, slots: 0 }); }   // 촬영용 상자(종자 · 카드는 뽑기라 뺌)
  app.draft = null;
  if (opt.draft) {   // 고르기 화면 촬영(opt.draft = { evo, at: 연 뒤 ms, part: 'skill' | 'passive', n, pick, moves: [[위 줄 몇째, 칸]], sel, arm, peek: 칸 | 't<몇째>', sy })
    const D = opt.draft, p = app.state.plants[params.act != null ? +params.act : (app.state.active || 0)], pas = D.part === 'passive';
    const pool = pas ? Object.keys(CARDS).filter(id => !isSkillCard(id) && !CARDS[id].base && !cardFits(p, id) && !(p.cards || []).includes(id)) : bloomPool(p.key, Math.max(1, p.stage)).map(x => x.id);
    const cands = pool.slice(0, D.n || (pas ? 3 : 4));
    p.drafts = [{ kind: D.kind || (D.evo ? 'evo' : 'lv'), part: pas ? 'passive' : 'skill', st: p.stage, lv: p.lv, pick: Math.min(D.pick || (pas ? 1 : 2), cands.length), cands }];   // kind 'graft' = 접목 고르기 촬영
    openDraft(app, p, D.evo ? { from: bigKey(p.key, stageKey({ stage: Math.max(0, p.stage - 1) })), to: bigKey(p.key, stageKey(p)), pot: p.pot } : null);
    app.draft.t0 = app.t - (D.at ?? 2600);
    if ((D.at ?? 2600) > 2000 || !D.evo) draftShot(app, D);
  }
  router.set(name, params);
  input.begin(); input.pressedId = opt.pressed || null;
  router.draw(app);
  if (opt.guide != null) shotGuide(app, +opt.guide);   // 처음 안내 촬영(opt.guide = 몇 번째 장)
  if (opt.overlay !== false) {
    if (opt.chestOpen != null || opt.chestAge != null) {   // 상자 상태를 그리기 전에 정함(전엔 한 번 그려 만든 뒤 다시 그려 어두운 막이 두 번 덮였음 — 2026-10-22 상자 영상) · chestAge = 상자가 뜬 지 · chestOpen = 연 지(ms)
      const item = app.state.pending.find(x => x.kind === 'level' || x.kind === 'season');
      if (item) app.chest = { item, t0: app.t - (opt.chestAge ?? 1000), open: opt.chestOpen != null ? app.t - opt.chestOpen : null };
    }
    drawOverlays(app);
  }
  if (opt.toast) drawToast(app, opt.toast);
  stretchEdges(cx, k, W, H, F);
  input.pressedId = null; app.g.ctx = realG; app.pxScale = 0;
  return cv.toDataURL('image/png');
};
