import { button } from '../art/ui.js';
import { drawPortrait, bigKey } from '../art/sprites.js';
import { icon } from '../art/icons.js';
import { ELEMENT } from '../art/palette.js';
import { ro, wa } from '../core/josa.js';
import { T, holo } from '../art/theme.js';
import { bigTitle } from './common.js';
import { net } from '../net/api.js';
import { openForm } from '../core/form.js';
import { STARTERS, SPECIES, JONG, ELEM } from '../game/catalog.js';
import { stageKey } from '../game/view.js';
import { LOFT_STOOL, enterLoft, loftBack, loftFront, loftBoot, loftNight, loftNightBeam, loftNightFront, loftNightStool, loftNightPlant, loftPrepare } from '../art/loft.js';
import { soundLocked, introTime, introSkip, bootPlan, musicNow, lampNow, MUSIC_BAR, MUSIC_STEP } from '../core/sound.js';

// 처음 화면(2026-10-16 사용자 "초반 화면을 바꿔줘. 검은 배경에 의자에 내 식물이 올려져 있고. 천장에서 불빛이 지지직 거리면서 켜져.
//  그리고 터치하면 주변 검은 배경이 밝아지는 느낌으로 대기화면으로 이어지게" · "처음에는 음악단? 조율할때 나는 우우웅하는 소리처럼 검은 배경에서 점점 들리면서
//  화분 등장할 때쯤 자연스럽게 끝남. 그리고 전등 켜지는 소리가 두드 두드등 나면서 전등도 그에 맞게 켜짐"):
//  대기 화면의 원형 방이 전부 꺼진 디스플레이인 채 — 음악 지휘자(core/music.js 처음 화면 곡)의 시각을 그대로 따라감(소리와 그림이 같은 순간):
//   0~2마디 = 검정 + 조율(우우웅) → 1.45마디쯤 의자 속 투영기가 아래부터 의자 · 식물을 푸르게 비춤(조율이 사라질 때쯤) →
//   2마디 = 전등 점화 '두드 두드등'(전등 칸 사건을 따라 켜졌다 꺼졌다, '등'에 켜진 채) → 로고가 전광판처럼 켜짐 → 3마디부터 단추 · 베이스와 지지직 되풀이 · 천천히 킥.
//  누르면(로그인 상태) 다음 박에 디스플레이가 켜지기 시작(loft.js loftBoot — LED 가 방 덩어리마다 생김새를 따라 하나씩) → 대기 곡이 떨어지는 마디에 대기 화면으로('cut').
//  조율 중에 누르면 건너뜀(다음 마디가 점화). 소리가 막힌 브라우저 = 검정 + 작은 '눌러서 시작' → 누르면 그때부터(조율을 놓치지 않게).
//  ?at=초 = 그 시각 모습으로 멈춘 촬영 · &bootu=0~1 = 켜짐 중간 촬영.
const B = MUSIC_BAR, S16 = MUSIC_STEP;
export const INTRO = { reveal: 1.45 * B, revealD: 0.42 * B, ign: 2 * B, logo: 2 * B + 10 * S16, ui: 3 * B };
const BG0 = '#030409';
// 대기 화면의 그 의자 · 내 대표 식물(로그인 전이면 기본 식물)
const myPlant = app => { const s = app.state, p = s && s.plants && s.plants[s.active]; return p ? [bigKey(p.key, stageKey(p)), p.pot || 'pot_terra'] : ['flower_grass', 'pot_terra']; };
const clamp01 = v => Math.max(0, Math.min(1, v));

// 시작 화면: 로그인 열쇠가 있으면 확인 → '게임 시작', 없으면 '로그인' · '새로 시작', 서버가 안 되면 '다시 시도' · '오프라인 체험'
export const LOGIN_RE = /^[a-z0-9_]{3,20}$/;
// 들어가기: 처음 화면 · 처음 식물 고르기에서는 디스플레이가 켜지며 대기 화면으로 이어짐, 초대 링크면 대결 방으로
export function enterGame(app) {
  if (app.invite && !net.offline) { const code = app.invite; app.invite = null; return app.go('room', { join: code }, 'shutterClose'); }
  const sc = app.router.cur;
  if (sc && sc.startBoot && (app.router.name === 'title' || app.router.name === 'starter')) return sc.startBoot(app);
  app.go('home', {}, 'dither');
}
async function signed(app, r) { net.setToken(r.token); app.user = r.user; app.state = r.state; }
export function loginForm(app, sc) {
  openForm(app, {
    title: '로그인', note: '아이디와 비밀번호를 써 주세요',
    fields: [{ id: 'login', label: '아이디', auto: 'username', max: 20 }, { id: 'pw', label: '비밀번호', type: 'password', auto: 'current-password', max: 72 }],
    ok: '로그인', alt: { label: '처음이에요 — 새로 시작하기', fn: () => registerForm(app, sc) },
    onSubmit: async v => {
      try { await signed(app, await net.req('/api/login', { login: v.login.trim().toLowerCase(), password: v.pw })); }
      catch (e) { return e.message; }
      if (sc) sc.mode = 'in';
      enterGame(app);
      return null;
    },
  });
}
export function registerForm(app, sc, keep = {}) {
  openForm(app, {
    title: '새로 시작하기', note: '다른 기기에서도 이어 하려면 아이디와 비밀번호를 기억해 두세요',
    fields: [
      { id: 'login', label: '아이디', auto: 'username', max: 20, value: keep.login || '', hint: '영어 소문자 · 숫자 · 밑줄 3~20자' },
      { id: 'pw', label: '비밀번호', type: 'password', auto: 'new-password', max: 72, hint: '6자 이상' },
      { id: 'pw2', label: '비밀번호 한 번 더', type: 'password', auto: 'new-password', max: 72 },
      { id: 'nick', label: '별명', auto: 'nickname', max: 12, value: keep.nick || '', hint: '게임에서 보일 이름(12자까지)' },
    ],
    ok: '다음 — 식물 고르기', alt: { label: '이미 계정이 있어요 — 로그인', fn: () => loginForm(app, sc) },
    onSubmit: async v => {
      const login = v.login.trim().toLowerCase(), nick = v.nick.trim();
      if (!LOGIN_RE.test(login)) return '아이디는 영어 소문자·숫자·밑줄 3~20자예요';
      if (v.pw.length < 6) return '비밀번호는 6자 이상이에요';
      if (v.pw !== v.pw2) return '비밀번호 두 칸이 달라요';
      if (!nick) return '별명을 써 주세요';
      try { await net.req('/api/check', { login }); } catch (e) { return e.message; }
      app.reg = { login, password: v.pw, nickname: nick };
      app.go('starter', {}, 'dither');
      return null;
    },
  });
}

// ── 처음 화면 · 처음 식물 고르기가 같이 쓰는 그림 ──
// 꺼진 방 + 전등(k) + 빛줄기 + 의자 · 식물(rv = 투영기가 아래부터 비춘 정도) + 빛줄기 안 먼지
function nightRoom(app, key, pot, k, rv) {
  const { g, W, H } = app, [mx, my] = LOFT_STOOL, kk = Math.min(1, k);
  loftNight(app, k);
  loftNightBeam(app, kk);
  if (rv > 0) {
    const top = my - 116, bot = 412, ry = Math.round(bot - (bot - top) * rv);
    g.clip(0, ry, W, H - ry, () => { loftNightStool(app, 1 - kk); loftNightPlant(app, key, pot, mx, my, { dark: 0.74 * (1 - kk), cool: 1 - kk, warm: kk }); });
    if (rv < 1) { g.rect(mx - 30, ry, 60, 1, '#8ccfff'); g.rect(mx - 20, ry - 1, 40, 1, '#e6f3ff'); }   // 투영기 빛 줄(대기 화면의 식물 나타남과 같은 꼴)
  }
  loftNightFront(app, kk);
}
// 켜짐: 다음 박에 시작 → 대기 곡 마디에 대기 화면으로. 그동안 처음 화면 곡은 그대로 이어지고 종 · 건반이 화음을 타고 올라감(music.js FILLS.boot)
function startBoot(sc, app) {
  if (sc.boot) return;
  const b = bootPlan();
  sc.boot = { t0: b.t0, t1: b.t1, a0: app.t };
}
function drawBoot(sc, app, key, pot, uiDraw) {
  const { g } = app, [mx, my] = LOFT_STOOL, bt = sc.boot, now = sc.p && sc.p.bootu != null ? bt.t0 + (bt.t1 - bt.t0) * +sc.p.bootu : musicNow();
  const D = Math.max(0.2, bt.t1 - bt.t0), u = clamp01((now - bt.t0) / D), fade = 1 - clamp01((app.t - bt.a0) / 260);
  if (now < bt.t0) { nightRoom(app, key, pot, lampNow().k, 1); if (fade > 0 && uiDraw) g.alpha(fade, uiDraw); return; }
  g.rect(0, 0, app.W, app.H, BG0);    // 방 그림(270×600)보다 넓거나 긴 화면의 남는 곳
  loftBack(app);                       // 켜진 방(창 밖 우주까지) 위에
  loftBoot(app, u, D * 1000);          // 아직 안 켜진 칸 = 꺼진 방
  loftNightBeam(app, 1 - u);           // 빛줄기는 방이 밝아지며 사라짐(대기 화면엔 원래 그림의 원뿔만)
  loftNightPlant(app, key, pot, mx, my, { warm: 1 - u });
  g.alpha(u, () => loftFront(app));
  loftNightFront(app, 1 - u);
  if (fade > 0 && uiDraw) g.alpha(fade, uiDraw);
  if (u >= 1 && !bt.gone && !(sc.p && sc.p.bootu != null)) { bt.gone = true; app.go('home', { from: 'boot' }, 'cut'); }
}

export const title = {
  theme: 'loft',   // 원형 방(꺼진 디스플레이) — 단추도 대기 화면과 같은 판
  enter(p = {}) {
    this.mode = net.offline ? 'in' : 'boot'; this.checking = false; this.err = null;
    this.p = p; this.boot = null; this.revealT = null; this.at = p.at != null ? +p.at : null;
    if (p.bootu != null) this.boot = { t0: 0, t1: 3, a0: -1e9 };   // 켜짐 중간 촬영
    enterLoft();   // 창 밖 풍경 = 다음 것(대기 화면이 그대로 이어 받음)
  },
  startBoot(app) { startBoot(this, app); },
  async check(app) {
    this.checking = true;
    if (!net.token) { this.mode = 'out'; return; }
    try { const r = await net.req('/api/me'); app.user = r.user; app.state = r.state; this.mode = 'in'; }
    catch (e) { this.mode = e.status === 0 ? 'down' : 'out'; this.err = e.status === 0 ? e.message : null; }
  },
  // 처음 화면 곡 시각(초) — 촬영(?at=)이면 그 값
  it() { return this.at != null ? this.at : introTime(); },
  draw(app) {
    const { g, W, H } = app;
    if (this.mode === 'boot' && !this.checking) this.check(app);
    const [key, pot] = myPlant(app);
    if (this.boot) return drawBoot(this, app, key, pot, () => this.ui(app, 1, false));
    const it = this.it();
    // 화면이 검을 때 한 장에 한 가지씩 미리 잼(점화 · 켜짐 순간 멈칫 없게) — 그린 것은 바로 아래에서 검정으로 덮임
    if (!this.prepared && (it == null || it < INTRO.reveal)) { this.prepStep = this.prepStep || 0; this.prepared = loftPrepare(app, this.prepStep++); }
    if (it == null) {   // 처음 화면 곡이 아직 — 소리가 막혀 첫 누름을 기다림(작은 표시) · 앞 곡이 마디를 마치는 중
      g.rect(0, 0, W, H, BG0);
      if (soundLocked()) {
        const a = 0.35 + 0.25 * Math.sin(app.t / 700);
        g.alpha(a, () => g.text('화면을 누르면 시작해요', W / 2, H - 46, { color: '#8eaed2', align: 'center' }));
      }
      app.input.hit('title_wake', 0, 0, W, H, () => {});
      return;
    }
    // 전등: 지휘자의 전등 칸(촬영이면 점화 뒤 켜짐)
    const k = this.at != null ? (it >= INTRO.ign + 0.45 ? 1 : 0) : it < INTRO.ign - 0.02 ? 0 : lampNow().k;   // 점화 전엔 늘 꺼짐(곡이 막 시작된 첫 몇 장에 켜진 방이 비치지 않게)
    if (this.revealT == null && it >= INTRO.reveal) this.revealT = this.at != null ? -1e9 : app.t;
    const rv = this.revealT == null ? 0 : clamp01((app.t - this.revealT) / (INTRO.revealD * 1000));
    nightRoom(app, key, pot, k, rv);
    // 조율 · 점화 중에 누르면 건너뜀 → 그 뒤엔(로그인 상태) 어디를 눌러도 켜짐
    const uiK = clamp01((it - INTRO.ui) / 0.4);
    app.input.hit('title_tap', 0, 0, W, H, () => { if (it < INTRO.ign) introSkip(); else if (uiK >= 1 && this.mode === 'in') enterGame(app); });
    // 로고: '등'에 전광판처럼 깜빡이며 켜짐
    const lk = it - INTRO.logo;
    if (lk >= 0 && (lk > 0.32 || [1, 0, 1, 1, 0, 0, 1][Math.floor(lk / 0.045)])) this.logo(app);
    if (uiK > 0) g.alpha(uiK, () => this.ui(app, uiK, uiK >= 1));
  },
  logo(app) {
    const { g, W } = app;
    bigTitle(g, '풀로세움', W / 2, 92, { top: '#ffffff', mid: '#ffe8c8', low: '#f0be7d', line: '#121a26', shadow: '#5a3a1c' });
    g.text('식물 배틀 콜로세움', W / 2, 130, { color: '#d8c4a4', align: 'center', shadow: '#121a26' });
  },
  // 단추(전등이 켜진 뒤, 어두운 방에 맞게 = 대기 화면과 같은 유리 판 + 주황 큰 단추 하나)
  ui(app, a, live) {
    const { g, W, H, t } = app, bw = 176, bx = Math.round((W - bw) / 2), on = fn => (live ? fn : null);
    const y0 = Math.max(H - 168, Math.min(LOFT_STOOL[1] + 58, H - 128));   // 의자 다리 아래(짧은 화면이면 조금 겹쳐도 단추가 화면 안에)
    if (this.mode === 'boot') { g.text('서버에 연결하는 중' + '.'.repeat(1 + Math.floor(t / 350) % 3), W / 2, y0 + 10, { font: 'bold', color: T.text.sub, align: 'center', outline: T.ink }); return; }
    if (this.mode === 'down') {
      g.text(this.err || '서버에 연결할 수 없어요', W / 2, y0 - 22, { font: 'bold', color: '#ffb0a0', align: 'center', outline: T.ink });
      button(app, 'title_retry', bx, y0, bw, 34, '다시 시도', { style: 'night', font: 'head', onTap: on(() => { this.mode = 'boot'; this.checking = false; }) });
      button(app, 'title_off', bx, y0 + 44, bw, 28, '오프라인 체험(저장 안 됨)', { style: 'night', onTap: on(() => { net.offline = true; import('../data/mock.js').then(m => { app.state = m.mockState(); this.mode = 'in'; enterGame(app); }); }) });
      return;
    }
    if (this.mode === 'out') {
      button(app, 'title_login', bx, y0, bw, 34, '로그인', { style: 'night', font: 'head', onTap: on(() => loginForm(app, this)) });
      button(app, 'title_new', bx, y0 + 44, bw, 34, '새로 시작하기', { style: 'gold', font: 'head', onTap: on(() => registerForm(app, this)) });
      if (app.invite) g.text(`초대받은 방 ${app.invite} — 로그인하면 바로 들어가요`, W / 2, y0 + 88, { color: '#ffe8a8', align: 'center', outline: T.ink });
      return;
    }
    button(app, 'title_start', bx, y0, bw, 36, app.invite ? '초대받은 방으로' : '게임 시작', { style: 'gold', font: 'head', onTap: on(() => enterGame(app)) });
    const who = net.offline && !app.user ? '오프라인 체험 — 저장되지 않아요' : app.user ? `${app.user.nickname} 님 · ${app.user.login}` : '';
    g.text(who, W / 2, y0 + 46, { color: T.text.sub, align: 'center', outline: T.ink });
    if (!net.offline && app.user) button(app, 'title_out', bx + 34, y0 + 66, bw - 68, 24, '다른 계정으로', { style: 'night', onTap: on(() => app.logout()) });
  },
};

// 처음 식물 고르기(가입 마지막 단계): 같은 꺼진 방 · 전등 아래 의자에 고른 식물(바꿀 때마다 투영기가 아래부터 비춤) · 아래 이름 · 설명 · 얼굴 셋 · 시작
const DESC = {
  flower_grass: '풀 · 꽃. 꽃잎 향기로 상대 공격을 떨어뜨리고, 자라면 장미 가시와 꽃잎 칼날을 써요.',
  cactus_fire: '불 · 선인장. 불씨로 화상을 입히고, 가시를 세워 붙어서 때린 상대에게 되돌려 줘요.',
  aqua: '물 · 꽃. 물방울로 상대를 적시고, 물거품 방패로 나쁜 효과를 씻어 내요.',
};
export const starter = {
  theme: 'loft',
  enter(p = {}) { this.i = 0; this.showT = null; this.busy = false; this.boot = null; this.p = p; },
  startBoot(app) { startBoot(this, app); },
  draw(app) {
    const { g, W, H, t } = app;
    if (this.showT == null) this.showT = t - 1000;
    const key = STARTERS[this.i], sp = SPECIES[key], [mx, my] = LOFT_STOOL;
    if (this.boot) return drawBoot(this, app, key, 'pot_terra', null);
    const L = lampNow(), k = L.letter === 'a' && !L.burst ? 1 : L.k;   // 처음 화면 곡이 아니면(바로 들어온 촬영 등) 켜진 전등
    nightRoom(app, key, 'pot_terra', k, clamp01((t - this.showT) / 320));
    g.text('처음 식물을 골라 주세요', W / 2, 150, { font: 'head', color: '#ffffff', align: 'center', outline: T.ink, outlineW: 3 });
    g.text('어느 식물이든 끝까지 키울 수 있어요', W / 2, 174, { color: '#d8c4a4', align: 'center', outline: T.ink });
    for (const [id, d, x] of [['st_prev', -1, 26], ['st_next', 1, W - 26]]) {
      const pr = app.input.isPressed(id), c = pr ? '#ffffff' : '#8ccfff', cy = my - 50;
      for (let j = 0; j < 7; j++) g.rect(d < 0 ? x - j : x + j, cy - 6 + j, 1, 13 - j * 2, c);
      app.input.hit(id, x - 18, cy - 22, 36, 44, () => { this.i = (this.i + d + STARTERS.length) % STARTERS.length; this.showT = app.t; }, 2);
    }
    // 이름 · 종 · 속성 · 설명(의자 다리 아래)
    const y = 412, el = ELEMENT[sp.el];
    g.text(sp.name, W / 2, y, { font: 'name', color: '#ffffff', align: 'center', outline: T.ink, outlineW: 3 });
    const tags = [[sp.type, JONG[sp.type], '#e6f3ff'], [sp.el, ELEM[sp.el], el.light]];
    let tw = tags.reduce((a, [, l]) => a + 22 + g.textW(l, 'label') + 4, -4), tx = Math.round(W / 2 - tw / 2);
    for (const [ic, l, col] of tags) { const w = 22 + g.textW(l, 'label'); holo(g, tx, y + 23, w, 18, T.card || T.panel, 16); g.img(icon(ic), tx + 5, y + 27); g.text(l, tx + 18, y + 26, { font: 'label', color: col }); tx += w + 4; }
    holo(g, 14, y + 46, W - 28, 40, T.card || T.panel, 16);
    g.para(DESC[key], 22, y + 50, W - 44, { color: T.ptext.main });
    // 얼굴 셋
    const fy = y + 92, fw = 42, gap = 12, fx0 = Math.round(W / 2 - (fw * 3 + gap * 2) / 2);
    STARTERS.forEach((k2, i) => {
      const x = fx0 + i * (fw + gap), on = i === this.i;
      g.rect(x - 2, fy - 2, fw + 4, fw + 4, on ? '#f0be7d' : '#4f84bf'); g.rect(x, fy, fw, fw, '#0a1c32');
      g.clip(x + 1, fy + 1, fw - 2, fw - 2, () => drawPortrait(g, k2, x + 1, fy + 1, fw - 2, false));
      app.input.hit('st_' + k2, x - 2, fy - 2, fw + 4, fw + 4, () => { if (this.i !== i) { this.i = i; this.showT = app.t; } });
    });
    button(app, 'st_go', 40, Math.min(H - 46, fy + fw + 10), W - 80, 36, this.busy ? '만드는 중…' : `${ro(sp.name)} 시작`, { style: 'gold', font: 'head', disabled: this.busy, onTap: () => this.go(app, key) });
    button(app, 'st_back', 8, 6, 52, 22, '‹ 뒤로', { style: 'night', onTap: () => { const r = app.reg; app.go('title'); setTimeout(() => registerForm(app, null, { login: r && r.login, nick: r && r.nickname }), 250); } });
  },
  async go(app, key) {
    if (this.busy) return;
    const r = app.reg;
    if (!r) { app.go('title'); return; }
    this.busy = true;
    try {
      const out = await net.req('/api/register', { ...r, starter: key });
      net.setToken(out.token); app.user = out.user; app.state = out.state; app.reg = null;
      app.toast(`${wa(SPECIES[key].name)} 함께 시작해요!`);
      enterGame(app);
    } catch (e) {
      app.toast(e.message);
      if (/아이디/.test(e.message)) { app.go('title'); setTimeout(() => registerForm(app, null, { login: r.login, nick: r.nickname }), 250); }
    } finally { this.busy = false; }
  },
};
