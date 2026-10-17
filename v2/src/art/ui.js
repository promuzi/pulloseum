// UI 부품(전부 도트). 창·버튼·막대·칩·탭·상단 정보줄·하단 탭.
// 색·모양은 장소 테마(theme.js: 우주선 · 온실 · 밤 정원)를 따른다 — 화면마다 라우터가 setTheme 한 뒤 그린다.
import { ELEMENT } from './palette.js';
import { icon, tinted } from './icons.js';
import { T, THEMES, plate, msgBox, btnBody, tbar, holo, UI, UI_ACCENT } from './theme.js';
import { userNeed } from '../game/catalog.js';

// 모서리가 r칸 둥근 사각형(채움). r 칸짜리 도트 원 모서리.
export function rrect(g, x, y, w, h, r, col) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  for (let j = 0; j < h; j++) {
    let inset = 0;
    const dy = j < r ? r - j - 0.5 : (j >= h - r ? j - (h - r) + 0.5 : 0);
    if (dy > 0) inset = Math.ceil(r - Math.sqrt(Math.max(0, r * r - dy * dy)) - 0.01);
    g.rect(x + inset, y + j, w - inset * 2, 1, col);
  }
}
// 테두리 있는 둥근 사각형: 바깥 1칸 outline, 안쪽 fill
export function rbox(g, x, y, w, h, r, fill, line = T.ink) {
  rrect(g, x, y, w, h, r, line);
  rrect(g, x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1), fill);
}

// 창: style 'night'(기본 판) · 'deep'/'dark'(한 단 어두운 속) · 'paper'(대사 상자)
export function panel(g, x, y, w, h, style = 'night') {
  if (style === 'paper') return msgBox(g, x, y, w, h);
  plate(g, x, y, w, h, style === 'deep' || style === 'dark' ? 'deep' : 'panel');
}
// 판 속 글자색(판 위) — 온실은 크림 판이라 어두운 글자
export const PT = () => T.ptext;
// 제목 띠가 붙은 창
export function titledPanel(g, x, y, w, h, title, style = 'night') {
  panel(g, x, y, w, h, style);
  const tw = g.textW(title, 'head') + 16, st = T.btn.primary;
  btnBody(g, x + 8, y - 8, tw, 18, st, true);
  g.text(title, x + 8 + tw / 2, y - 6, { font: 'head', color: st.text, align: 'center' });
}

const STYLE = { teal: 'primary', gold: 'gold', night: 'second', ghost: 'second', red: 'danger', green: 'good', off: 'off' };
// 버튼: 눌리면 1칸 내려가고 아래 턱이 사라진다. pad = 투명 터치 여유
export function button(app, id, x, y, w, h, label, opt = {}) {
  const { g, input } = app;
  const st = T.btn[opt.disabled ? 'off' : (STYLE[opt.style || 'teal'] || 'primary')];
  const down = input.isPressed(id) && !opt.disabled;
  const { yy, inner } = btnBody(g, x, y, w, h, st, down);
  const ic = opt.icon && (opt.disabled || opt.iconTint ? tinted(opt.icon, st.text) : icon(opt.icon));   // iconTint = 글자색 한 가지(코덱스 시안의 진한 갈색 아이콘)
  const font = opt.font || 'body';
  const tw = label ? g.textW(label, font) : 0;
  const total = (ic ? ic.width + (label ? 3 : 0) : 0) + tw;
  let cx = Math.round(x + (w - total) / 2);
  const lh = g.lineH(font), sh = opt.sub ? g.lineH('body') + 1 : 0;   // sub = 아래 작은 둘째 줄(대회 상황 등)
  const ty = yy + 1 + Math.round((inner - lh - sh) / 2);
  if (ic) { g.img(ic, cx, ty + Math.round((lh - ic.height) / 2)); cx += ic.width + 3; }
  if (label) g.text(label, cx, ty, { font, color: st.text });
  if (opt.sub) g.text(opt.sub, x + w / 2, ty + lh + 1, { color: st.sub || st.text, align: 'center' });
  input.mark(id, x, y, w, h);
  if (!opt.disabled && opt.onTap) input.hit(id, x, y, w, h, opt.onTap, opt.pad ?? 4);
}

// 막대(체력·경험치). ratio 0~1. kind: 'hp'(색 단계) | 'exp' | 'gold' | 'energy'
export function bar(g, x, y, w, h, ratio, kind = 'hp') {
  tbar(g, x, y, w, h, ratio, kind === 'gold' ? 'mid' : kind === 'hp' ? 'hp' : 'exp');
}

// 칩: 아이콘 + 글자 작은 알약(어두운 속 — 어느 바탕 위에서도 밝은 글자)
export function chip(g, x, y, label, opt = {}) {
  const ic = opt.icon && icon(opt.icon);
  const tw = label ? g.textW(label) : 0;
  const w = (ic ? ic.width + (label ? 3 : 0) : 0) + tw + 8;
  const h = 15;
  if (T.holo) holo(g, x, y, w, h, T.deep, 8); else rbox(g, x, y, w, h, 3, opt.fill || T.deep.fill, opt.line || T.ink);
  if (!T.holo) g.rect(x + 2, y + 1, w - 4, 1, T.deep.frameHi);
  let cx = x + 4;
  if (ic) { g.img(ic, cx, y + 2); cx += ic.width + 3; }
  if (label) g.text(label, cx, y + 2, { color: opt.color || T.text.main });
  return w;
}
export function chipW(g, label, iconName) {
  const ic = iconName && icon(iconName);
  return (ic ? ic.width + (label ? 3 : 0) : 0) + (label ? g.textW(label) : 0) + 8;
}

// 속성 칩
export function elemChip(g, x, y, el) {
  const E = ELEMENT[el];
  return chip(g, x, y, E.name, { icon: el, color: E.light });
}

// 홀로그램 탭(2026-10-15 사용자 "여러 탭들도 홀로그램 느낌을 내줘"): 고른 탭 = 밝은 청록 판 + 아래 빛 줄, 안 고른 탭 = 짙고 흐린 판(파란 테).
//  판 속은 꽉 채움(글자 깨짐 방지), 반짝이거나 움직이는 꾸밈 없음(지글거림·어지러움 방지)
const TAB_ON = { fill: '#1f5c96', fill2: '#2a7099', frame: '#8ccfff', frameHi: '#e6f3ff', frameLo: '#4f84bf' };
const TAB_OFF = { fill: '#0b1d2e', fill2: '#0f2538', frame: '#2f5c8a', frameHi: '#4f84bf', frameLo: '#18385e' };
export function holoTab(app, id, x, y, w, h, label, on, onTap, font = 'label') {
  const { g, input } = app, pr = input.isPressed(id), yy = y + (pr && !on ? 1 : 0), acc = UI_ACCENT[UI];
  holo(g, x, yy, w, h, on ? TAB_ON : TAB_OFF, 16);
  if (UI === 'holo') { if (on) { g.rect(x + 3, yy + h, w - 6, 1, '#8ccfff'); g.rect(x + Math.round(w / 2) - 7, yy + h + 1, 14, 1, '#e6f3ff'); } }   // 옛 홀로그램: 아래 빛 줄
  else if (on) g.rect(x + Math.round(w / 2) - Math.min(9, (w >> 2)), yy + h - 3, Math.min(18, w >> 1), 2, acc);   // 고른 탭 = 글자 아래 짧은 강조 줄(한 가지 색)
  g.text(label, x + w / 2, yy + Math.round((h - g.lineH(font)) / 2) - (on && UI !== 'holo' ? 1 : 0), { font, color: on ? '#ffffff' : UI === 'holo' ? '#86acd6' : '#8e9cb0', align: 'center' });
  input.mark(id, x, y, w, h);
  if (onTap) input.hit(id, x, y, w, h, onTap, 3);
}
// 작은 꼬리표 판(종 · 속성 · 단계) — 창과 같은 겉모습
export function tagBox(g, x, y, w, h) { holo(g, x, y, w, h, TAG_STYLE, 16); }
const TAG_STYLE = { fill: '#102844', fill2: '#12304a', frame: '#4f84bf', frameHi: '#8ccfff', frameLo: '#18385e' };
// 탭 줄. tabs=[{id,label}], active=id
export function tabs(app, x, y, w, list, active, onPick) {
  const tw = Math.floor(w / list.length);
  list.forEach((t, i) => {
    const tx = x + i * tw, ww = i === list.length - 1 ? w - tw * i : tw;
    holoTab(app, 'tab_' + t.id, tx, y, ww - 2, 22, t.label, t.id === active, () => onPick(t.id));
  });
}

// 숫자 콤마
export const fmt = n => Math.round(n).toLocaleString('ko-KR');

// 위 정보줄 숫자: 게임 상태(user · wallet) → 레벨 · 경험 · 돈 · 보석
export function hudData(s) {
  if (!s) return { level: 1, exp: 0, expMax: 1, credits: 0, gems: 0 };
  if (!s.user) return s;
  return { level: s.user.level, exp: s.user.xp, expMax: userNeed(s.user.level), credits: s.wallet.credits, gems: s.wallet.gems };
}
// 작은 알약 판(상단 정보줄): 어두운 속 + 빛 한 줄
function pill(g, x, y, w, h) { if (T.holo) return holo(g, x, y, w, h, T.deep, 9); rbox(g, x, y, w, h, 4, T.deep.fill, T.ink); g.rect(x + 3, y + 1, w - 6, 1, T.deep.frameHi); }
// 상단 정보줄: 레벨·경험치 / 크레딧 / 젬 / 설정
export function hud(app, st) {
  const { g, W } = app, s = hudData(st);
  const y = 6;
  if (T.hudPlain) return hudPlain(app, s);
  pill(g, 4, y, 92, 18);
  g.text('Lv', 9, y + 4, { color: T.text.accent });
  g.text(String(s.level), 25, y + 4, { font: 'bold', color: T.text.main });
  bar(g, 38, y + 6, 52, 7, s.exp / s.expMax, 'exp');
  const gx = W - 22;   // 설정(보이는 판 18×18, 터치 여유 4)
  pill(g, gx, y, 18, 18);
  g.img(icon('gear'), gx + 4, y + 4);
  app.input.hit('hud_gear', gx, y, 18, 18, () => app.openSettings && app.openSettings(), 6);
  const gemTxt = fmt(s.gems), gw = g.textW(gemTxt) + 24, gemX = gx - 4 - gw;
  pill(g, gemX, y, gw, 18);
  g.img(icon('gem'), gemX + 5, y + 4);
  g.text(gemTxt, gemX + 19, y + 4, { color: T.text.accent });
  const cTxt = fmt(s.credits), cw = g.textW(cTxt) + 24, cX = gemX - 4 - cw;
  pill(g, cX, y, cw, 18);
  g.img(icon('coin'), cX + 5, y + 4);
  g.text(cTxt, cX + 19, y + 4, { color: T.text.gold });
}

// 상단 상태 바(2026-10-15 사용자 "기존 초기 UI인 상단 레벨·크레딧 등 보고 바를 만들고" — 옛 메인 화면의 칸 나눈 띠):
//  왼쪽 칸 = Lv·경험 막대·경험 수, 오른쪽 칸들 = 크레딧 · 젬 · 설정. 가운데(천장 전등)는 비워 둠. 칸 = 홀로그램 판
function hudPlain(app, s) {
  const { g, W } = app, H = T.hudPlain, st = T.card || T.deep, y = 4, h = 19;
  //  칸 폭 = 'Lv n' + 막대 + 경험 수(글자 폭을 재서 — 막대는 수 앞 5칸에서 끝남, 수가 길면 칸이 넓어짐 · 막대는 24칸 이상)
  const lvW = g.textW(String(s.level), 'bold'), xt = `${s.exp}/${s.expMax}`, tw = g.textW(xt), bx = Math.max(36, 23 + lvW + 6), bw = Math.max(24, 104 - 5 - tw - bx), pw = bx + bw + 5 + tw + 6 - 4;
  holo(g, 4, y, pw, h, st, 13);
  g.text('Lv', 9, y + 4, { color: H.sub });
  g.text(String(s.level), 23, y + 4, { font: 'bold', color: H.text });
  const r = Math.max(0, Math.min(1, s.exp / s.expMax));
  g.rect(bx, y + 8, bw, 4, H.ink); g.rect(bx + 1, y + 9, bw - 2, 2, H.track);
  g.rect(bx + 1, y + 9, Math.round((bw - 2) * r), 2, H.bar); g.rect(bx + 1, y + 9, Math.round((bw - 2) * r), 1, H.barHi);
  g.text(xt, 4 + pw - 6, y + 4, { color: H.sub, align: 'right' });
  const gx = W - 24;   // 설정
  holo(g, gx, y, 20, h, st, 13); g.img(tinted('gear', H.icon), gx + 4, y + 4);
  app.input.hit('hud_gear', gx, y, 20, h, () => app.openSettings && app.openSettings(), 3);
  const gemTxt = fmt(s.gems), gw = g.textW(gemTxt) + 24, gemX = gx - 4 - gw;
  holo(g, gemX, y, gw, h, st, 13); g.img(icon('gem'), gemX + 5, y + 4); g.text(gemTxt, gemX + 19, y + 4, { color: H.text });
  const cTxt = fmt(s.credits), cw = g.textW(cTxt) + 24, cX = gemX - 4 - cw;
  holo(g, cX, y, cw, h, st, 13); g.img(icon('coin'), cX + 5, y + 4); g.text(cTxt, cX + 19, y + 4, { color: H.gold });
}

// 하단 탭. active = 'shop'|'explore'|'home'|'nursery'|'ship'
export const NAV = [
  { id: 'shop', label: '상점', icon: 'navShop', scene: 'shop' },
  { id: 'explore', label: '탐사', icon: 'navExplore', scene: 'explore' },
  { id: 'home', label: '식물', icon: 'navHome', scene: 'home' },
  { id: 'nursery', label: '양육', icon: 'navNursery', scene: 'nursery' },
  { id: 'ship', label: '함선', icon: 'navShip', locked: true },
];
export function navBar(app, active, opt = {}) {
  const { g, W, H, input } = app;
  const h = 44, y = H - h;
  if (T.nav || UI !== 'holo') {   // 코덱스 홈 시안: 짙은 남색 띠 + 가는 칸막이, 강철색 한 빛깔 아이콘, 고른 탭 = 주황 아이콘·글자 + 밑줄(새 겉모습에선 모든 화면 같은 탭 줄)
    const N = T.nav || THEMES.loft.nav, n = NAV.length, sw = Math.floor(W / n), x0 = Math.floor((W - sw * n) / 2);
    g.rect(0, y, W, h, N.bg); g.rect(0, y, W, 1, N.top); g.rect(0, y + 1, W, 1, N.bg2);
    NAV.forEach((t, i) => {
      const x = x0 + i * sw, on = t.id === active, pressed = input.isPressed('nav_' + t.id);
      if (i) g.rect(x, y + 11, 1, h - 22, N.sep);
      const col = on ? N.on : t.locked ? N.dim : N.icon, ic = tinted(t.icon, col), by = y + 6 + (pressed ? 1 : 0);
      const ix = x + Math.floor((sw - ic.width) / 2);
      g.img(ic, ix, by);
      if (t.locked) {   // 작은 자물쇠를 아이콘 오른쪽 아래에(바탕색 테두리로 떼어 보이게 — 큰 자물쇠는 로켓을 반쯤 가렸음)
        const lb = tinted('lockS', N.bg), lc = tinted('lockS', N.dim), lx = ix + 11, ly = by + 8;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.img(lb, lx + dx, ly + dy);
        g.img(lc, lx, ly);
      }
      g.text(t.label, x + sw / 2, by + 19, { color: col, align: 'center', font: on ? 'bold' : 'body' });
      if (on) { g.rect(x + Math.floor(sw / 2) - 9, y + h - 4, 18, 2, N.on); g.rect(x + Math.floor(sw / 2) - 7, y + h - 2, 14, 1, N.onLo); }
      if (opt.badge && opt.badge[t.id]) { g.disc(x + sw / 2 + 9, by + 1, 3, N.bg); g.disc(x + sw / 2 + 9, by + 1, 2, N.badge); }
      input.hit('nav_' + t.id, x, y, sw, h, () => {
        if (t.locked) return app.toast && app.toast('함선은 준비 중이에요');
        if (t.scene && app.go) app.go(t.scene);
      });
    });
    return;
  }
  g.rect(0, y, W, h, T.ink);
  g.rect(0, y + 1, W, h - 1, T.bg2);
  g.rect(0, y + 1, W, 1, T.panel.frameLo); g.rect(0, y + 2, W, 1, T.panel.frame);
  const n = NAV.length, sw = Math.floor((W - 8) / n), x0 = Math.floor((W - sw * n) / 2);
  NAV.forEach((t, i) => {
    const x = x0 + i * sw, on = t.id === active;
    const pressed = input.isPressed('nav_' + t.id);
    const by = y + 5 + (on ? -3 : 0) + (pressed ? 1 : 0);
    if (on) btnBody(g, x + 2, by, sw - 4, 37, T.btn.second, false);
    const ic = t.locked ? tinted(t.icon, T.text.dim) : icon(t.icon);
    g.img(ic, x + Math.floor((sw - ic.width) / 2), by + 4);
    if (t.locked) g.img(icon('lock'), x + Math.floor(sw / 2) + 4, by + 1);
    g.text(t.label, x + sw / 2, by + 21, { color: on ? T.btn.second.text : (t.locked ? T.text.dim : T.text.sub), align: 'center', font: on ? 'bold' : 'body' });
    if (opt.badge && opt.badge[t.id]) { g.disc(x + sw - 9, by + 4, 3, T.ink); g.disc(x + sw - 9, by + 4, 2, T.text.bad); }
    input.hit('nav_' + t.id, x, y, sw, h, () => {
      if (t.locked) return app.toast && app.toast('함선은 준비 중이에요');
      if (t.scene && app.go) app.go(t.scene);
    });
  });
}

// 알림 띠(토스트)
export function toast(app, msg) {
  const { g, W, H } = app;
  const w = Math.min(W - 24, g.textW(msg) + 24), x = Math.round((W - w) / 2), y = H - 78;
  msgBox(g, x, y, w, 24);
  g.text(msg, W / 2, y + 7, { color: T.mtext.main, align: 'center' });
}
