import { rng, titleBg1, asteroid1 } from '../art/bg.js';
import { button } from '../art/ui.js';
import { drawBig, drawPortrait, BGIMG } from '../art/sprites.js';
import { icon } from '../art/icons.js';
import { ELEMENT } from '../art/palette.js';
import { ro, wa } from '../core/josa.js';
import { T, holo } from '../art/theme.js';
import { bigTitle } from './common.js';
import { net } from '../net/api.js';
import { openForm } from '../core/form.js';
import { STARTERS, SPECIES, JONG, ELEM } from '../game/catalog.js';

// 밤 정원 타이틀 그림(assets/v2/bg/title_night.png)의 떠 있는 섬 윗면 가운데 = 화분 굽이 닿는 점(그림을 바꾸면 다시 잼)
export const TITLE_ISLAND = [134, 266];

// 시작 화면: 로그인 열쇠가 있으면 확인 → '게임 시작', 없으면 '로그인' · '새로 시작', 서버가 안 되면 '다시 시도' · '오프라인 체험'
export const LOGIN_RE = /^[a-z0-9_]{3,20}$/;
export function enterGame(app) {
  if (app.invite && !net.offline) { const code = app.invite; app.invite = null; return app.go('room', { join: code }, 'shutterClose'); }
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

export const title = {
  theme: 'night',   // 밤 정원(장소 테마 — 2026-10-15)
  enter(p = {}) { this.mode = net.offline ? 'in' : 'boot'; this.checking = false; this.err = null; },
  async check(app) {
    this.checking = true;
    if (!net.token) { this.mode = 'out'; return; }
    try { const r = await net.req('/api/me'); app.user = r.user; app.state = r.state; this.mode = 'in'; }
    catch (e) { this.mode = e.status === 0 ? 'down' : 'out'; this.err = e.status === 0 ? e.message : null; }
  },
  draw(app) {
    const { g, W, H, t } = app;
    if (this.mode === 'boot' && !this.checking) this.check(app);
    const bg = BGIMG.title_night, bob = (Math.floor(t / 800) % 2) * 2;
    let cx = Math.floor(W / 2), py = 258;
    if (bg) { g.img(bg, 0, 0); [cx, py] = TITLE_ISLAND; }
    else { titleBg1(g, W, H); asteroid1(g, cx, py + bob); }
    const s = app.state, star = (s && s.plants && s.plants[s.active]) || null;
    drawBig(g, star ? star.key : 'flower_grass', 'pot_terra', cx, py + (bg ? 0 : bob), { t });
    // 반딧불 포자
    const R = rng(9);
    for (let i = 0; i < 9; i++) { const a = t / 1400 + i, x = cx + Math.round(Math.cos(a * 1.3 + i) * (54 + i * 6)), y = py - 64 + Math.round(Math.sin(a + i * 2) * 36); if (R() > 0.2) { g.rect(x, y, 2, 2, i % 2 ? '#cddf6c' : '#9ad2ff'); g.px(x - 1, y, T.ink); } }
    bigTitle(g, '풀로세움', W / 2, 74, { top: '#ffffff', mid: '#c8f8ec', low: '#8efbdb', line: T.ink, shadow: '#5e5cb1' });
    g.text('식물 배틀 콜로세움', W / 2, 112, { color: T.text.main, align: 'center', shadow: T.ink });
    const bw = 170, bx = Math.round((W - bw) / 2), y0 = H - 178;
    if (this.mode === 'boot') { g.text('서버에 연결하는 중' + '.'.repeat(1 + Math.floor(t / 350) % 3), W / 2, y0 + 10, { font: 'bold', color: T.text.main, align: 'center', outline: T.ink }); return; }
    if (this.mode === 'down') {
      g.text(this.err || '서버에 연결할 수 없어요', W / 2, y0 - 22, { font: 'bold', color: '#ffb0a0', align: 'center', outline: T.ink });
      button(app, 'title_retry', bx, y0, bw, 32, '다시 시도', { style: 'teal', font: 'head', onTap: () => { this.mode = 'boot'; this.checking = false; } });
      button(app, 'title_off', bx, y0 + 42, bw, 28, '오프라인 체험(저장 안 됨)', { style: 'night', onTap: () => { net.offline = true; import('../data/mock.js').then(m => { app.state = m.mockState(); this.mode = 'in'; app.go('home'); }); } });
      return;
    }
    if (this.mode === 'out') {
      button(app, 'title_login', bx, y0, bw, 32, '로그인', { style: 'teal', font: 'head', onTap: () => loginForm(app, this) });
      button(app, 'title_new', bx, y0 + 42, bw, 32, '새로 시작하기', { style: 'gold', font: 'head', onTap: () => registerForm(app, this) });
      if (app.invite) g.text(`초대받은 방 ${app.invite} — 로그인하면 바로 들어가요`, W / 2, y0 + 84, { color: '#ffe8a8', align: 'center', outline: T.ink });
      return;
    }
    button(app, 'title_start', bx, y0, bw, 34, app.invite ? '초대받은 방으로' : '게임 시작', { style: 'gold', font: 'head', onTap: () => enterGame(app) });
    const who = net.offline ? '오프라인 체험 — 저장되지 않아요' : app.user ? `${app.user.nickname} 님 · ${app.user.login}` : '';
    g.text(who, W / 2, y0 + 44, { color: T.text.main, align: 'center', outline: T.ink });
    if (!net.offline && app.user) button(app, 'title_out', bx + 30, y0 + 64, bw - 60, 24, '다른 계정으로', { style: 'night', onTap: () => app.logout() });
  },
};

// 처음 식물 고르기(가입 마지막 단계): 셋 중 하나 — 가운데 크게 · 아래 얼굴 셋 · 설명 · 시작
const DESC = {
  flower_grass: '풀 · 꽃. 꽃잎 향기로 상대 공격을 떨어뜨리고, 자라면 장미 가시와 꽃잎 칼날을 써요.',
  cactus_fire: '불 · 선인장. 불씨로 화상을 입히고, 가시를 세워 붙어서 때린 상대에게 되돌려 줘요.',
  aqua: '물 · 꽃. 물방울로 상대를 적시고, 물거품 방패로 나쁜 효과를 씻어 내요.',
};
export const starter = {
  theme: 'night',
  enter() { this.i = 0; this.showT = null; this.busy = false; },
  draw(app) {
    const { g, W, H, t } = app;
    if (this.showT == null) this.showT = t - 1000;
    const bg = BGIMG.title_night;
    if (bg) g.img(bg, 0, 0); else titleBg1(g, W, H);
    g.c.fillStyle = 'rgba(6,10,24,0.35)'; g.c.fillRect(0, 0, W, H);
    g.text('처음 식물을 골라 주세요', W / 2, 30, { font: 'head', color: '#ffffff', align: 'center', outline: T.ink, outlineW: 3 });
    g.text('어느 식물이든 끝까지 키울 수 있어요', W / 2, 52, { color: '#cfe8f8', align: 'center', outline: T.ink });
    const key = STARTERS[this.i], sp = SPECIES[key], [cx, py] = TITLE_ISLAND, k = Math.min(1, (t - this.showT) / 280);
    g.clip(0, Math.round(py - 120 + (1 - k) * 120), W, 140, () => drawBig(g, key, 'pot_terra', cx, py, { t }));
    for (const [id, d, x] of [['st_prev', -1, 26], ['st_next', 1, W - 26]]) {
      const pr = app.input.isPressed(id), c = pr ? '#ffffff' : '#8ccfff', cy = py - 50;
      for (let j = 0; j < 7; j++) g.rect(d < 0 ? x - j : x + j, cy - 6 + j, 1, 13 - j * 2, c);
      app.input.hit(id, x - 18, cy - 22, 36, 44, () => { this.i = (this.i + d + STARTERS.length) % STARTERS.length; this.showT = app.t; }, 2);
    }
    // 이름 · 종 · 속성 · 설명
    const y = py + 22, el = ELEMENT[sp.el];
    g.text(sp.name, W / 2, y, { font: 'name', color: '#ffffff', align: 'center', outline: T.ink, outlineW: 3 });
    const tags = [[sp.type, JONG[sp.type], '#e6f3ff'], [sp.el, ELEM[sp.el], el.light]];
    let tw = tags.reduce((a, [, l]) => a + 22 + g.textW(l, 'label') + 4, -4), tx = Math.round(W / 2 - tw / 2);
    for (const [ic, l, col] of tags) { const w = 22 + g.textW(l, 'label'); holo(g, tx, y + 24, w, 18, { fill: '#102844', fill2: '#12304a', frame: '#4f84bf', frameHi: '#8ccfff', frameLo: '#18385e' }, 16); g.img(icon(ic), tx + 5, y + 28); g.text(l, tx + 18, y + 27, { font: 'label', color: col }); tx += w + 4; }
    holo(g, 14, y + 50, W - 28, 46, { fill: '#0b1d2e', fill2: '#0f2538', frame: '#2f5c8a', frameHi: '#4f84bf', frameLo: '#18385e' }, 16);
    g.para ? g.para(DESC[key], 24, y + 56, W - 48, { color: '#d8f0ff' }) : g.text(DESC[key], 24, y + 58, { color: '#d8f0ff' });
    // 얼굴 셋
    const fy = y + 106, fw = 52, gap = 12, fx0 = Math.round(W / 2 - (fw * 3 + gap * 2) / 2);
    STARTERS.forEach((k2, i) => {
      const x = fx0 + i * (fw + gap), on = i === this.i;
      g.rect(x - 2, fy - 2, fw + 4, fw + 4, on ? '#ffd890' : '#2f5c8a'); g.rect(x, fy, fw, fw, '#0a1c32');
      g.clip(x + 1, fy + 1, fw - 2, fw - 2, () => drawPortrait(g, k2, x + 1, fy + 1, fw - 2, false));
      app.input.hit('st_' + k2, x - 2, fy - 2, fw + 4, fw + 4, () => { if (this.i !== i) { this.i = i; this.showT = app.t; } });
    });
    button(app, 'st_go', 40, H - 74, W - 80, 38, this.busy ? '만드는 중…' : `${ro(sp.name)} 시작`, { style: 'gold', font: 'head', disabled: this.busy, onTap: () => this.go(app, key) });
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
