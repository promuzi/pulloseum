// UI 부품(전부 도트). 창·버튼·막대·칩·탭·상단 정보줄·하단 탭.
import { C, ELEMENT } from './palette.js';
import { icon, tinted } from './icons.js';

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
export function rbox(g, x, y, w, h, r, fill, line = C.ink) {
  rrect(g, x, y, w, h, r, line);
  rrect(g, x + 1, y + 1, w - 2, h - 2, Math.max(0, r - 1), fill);
}

const PANEL = {
  night: { fill: C.night, hi: C.night2, lo: C.shade },
  deep:  { fill: C.shade, hi: C.slate, lo: C.ink },
  dark:  { fill: '#2b2238', hi: C.shade, lo: C.ink },
  paper: { fill: C.mist, hi: C.white, lo: C.mute },
};
// 창: 모서리 1칸 깎인 테 + 위·왼 밝은 선 + 아래·오른 그늘 선
export function panel(g, x, y, w, h, style = 'night') {
  const s = PANEL[style] || PANEL.night;
  x |= 0; y |= 0; w |= 0; h |= 0;
  g.rect(x + 1, y, w - 2, 1, C.ink); g.rect(x + 1, y + h - 1, w - 2, 1, C.ink);
  g.rect(x, y + 1, 1, h - 2, C.ink); g.rect(x + w - 1, y + 1, 1, h - 2, C.ink);
  g.rect(x + 1, y + 1, w - 2, h - 2, s.fill);
  g.rect(x + 1, y + 1, w - 2, 1, s.hi); g.rect(x + 1, y + 2, 1, h - 4, s.hi);
  g.rect(x + 2, y + h - 2, w - 3, 1, s.lo); g.rect(x + w - 2, y + 2, 1, h - 3, s.lo);
}
// 제목 띠가 붙은 창
export function titledPanel(g, x, y, w, h, title, style = 'night', accent = C.teal) {
  panel(g, x, y, w, h, style);
  const tw = g.textW(title, 'head') + 16;
  rbox(g, x + 8, y - 8, tw, 17, 3, accent);
  g.rect(x + 9, y - 7, tw - 2, 1, C.teal4);
  g.text(title, x + 8 + tw / 2, y - 6, { font: 'head', color: C.ink, align: 'center' });
}

const BTN = {
  teal: { fill: C.teal, hi: C.teal3, lip: C.teal1, text: C.ink },
  gold: { fill: C.gold, hi: C.gold3, lip: C.gold1, text: C.ink },
  night: { fill: C.night2, hi: '#4d65b4', lip: C.night, text: C.mist },
  red: { fill: C.red, hi: C.red3, lip: C.red1, text: C.white },
  green: { fill: C.green, hi: C.green3, lip: C.green1, text: C.ink },
  off: { fill: C.shade, hi: C.slate, lip: C.ink, text: C.slate2 },
  ghost: { fill: C.night, hi: C.night2, lip: C.shade, text: C.mist },
};
// 버튼: 눌리면 1칸 내려가고 아래 턱이 사라진다. pad = 투명 터치 여유
export function button(app, id, x, y, w, h, label, opt = {}) {
  const { g, input } = app;
  const st = BTN[opt.style || 'teal'];
  const down = input.isPressed(id) && !opt.disabled;
  const yy = y + (down ? 1 : 0), lip = down ? 0 : 2;
  const r = opt.r ?? 3;
  rrect(g, x, yy, w, h - (down ? 1 : 0), r, C.ink);
  rrect(g, x + 1, yy + 1, w - 2, h - 2 - (down ? 1 : 0), Math.max(0, r - 1), st.lip);
  rrect(g, x + 1, yy + 1, w - 2, h - 2 - lip - (down ? 1 : 0), Math.max(0, r - 1), st.fill);
  g.rect(x + r, yy + 1, w - r * 2, 1, st.hi);
  const ic = opt.icon && icon(opt.icon);
  const font = opt.font || 'body';
  const tw = label ? g.textW(label, font) : 0;
  const total = (ic ? ic.width + (label ? 3 : 0) : 0) + tw;
  let cx = Math.round(x + (w - total) / 2);
  const inner = h - 2 - lip;
  const lh = g.lineH(font);
  const ty = yy + 1 + Math.round((inner - lh) / 2);
  if (ic) { g.img(opt.disabled ? tinted(opt.icon, C.slate2) : ic, cx, yy + 1 + Math.round((inner - ic.height) / 2)); cx += ic.width + 3; }
  if (label) g.text(label, cx, ty, { font, color: st.text });
  if (!opt.disabled && opt.onTap) input.hit(id, x, y, w, h, opt.onTap, opt.pad ?? 4);
}

// 막대(체력·경험치). ratio 0~1. kind: 'hp'(색 단계) | 'exp' | 'gold' | 'energy'
export function bar(g, x, y, w, h, ratio, kind = 'hp') {
  ratio = Math.max(0, Math.min(1, ratio));
  rrect(g, x, y, w, h, 1, C.ink);
  g.rect(x + 1, y + 1, w - 2, h - 2, '#2b2238');
  let main = C.green, hi = C.green3, lo = C.green1;
  if (kind === 'hp') { if (ratio <= 0.2) { main = C.red; hi = C.red3; lo = C.red1; } else if (ratio <= 0.5) { main = C.gold; hi = C.gold3; lo = C.gold1; } }
  else if (kind === 'exp') { main = C.teal; hi = C.teal4; lo = C.teal1; }
  else if (kind === 'gold') { main = C.gold; hi = C.gold3; lo = C.gold1; }
  else if (kind === 'violet') { main = '#a884f3'; hi = '#eaaded'; lo = '#6b3e75'; }
  const fw = Math.round((w - 2) * ratio);
  if (fw > 0) {
    g.rect(x + 1, y + 1, fw, h - 2, main);
    g.rect(x + 1, y + 1, fw, 1, hi);
    if (h > 4) g.rect(x + 1, y + h - 2, fw, 1, lo);
  }
}

// 칩: 아이콘 + 글자 작은 알약
export function chip(g, x, y, label, opt = {}) {
  const ic = opt.icon && icon(opt.icon);
  const tw = label ? g.textW(label) : 0;
  const w = (ic ? ic.width + (label ? 3 : 0) : 0) + tw + 8;
  const h = 15;
  rbox(g, x, y, w, h, 3, opt.fill || C.shade, opt.line || C.ink);
  let cx = x + 4;
  if (ic) { g.img(ic, cx, y + 2); cx += ic.width + 3; }
  if (label) g.text(label, cx, y + 2, { color: opt.color || C.mist });
  return w;
}
export function chipW(g, label, iconName) {
  const ic = iconName && icon(iconName);
  return (ic ? ic.width + (label ? 3 : 0) : 0) + (label ? g.textW(label) : 0) + 8;
}

// 속성 칩
export function elemChip(g, x, y, el) {
  const E = ELEMENT[el];
  return chip(g, x, y, E.name, { icon: el, fill: C.shade, color: E.light });
}

// 탭 줄. tabs=[{id,label}], active=id
export function tabs(app, x, y, w, list, active, onPick) {
  const { g, input } = app;
  const tw = Math.floor(w / list.length);
  list.forEach((t, i) => {
    const tx = x + i * tw, on = t.id === active;
    const ww = i === list.length - 1 ? w - tw * i : tw;
    rrect(g, tx, y, ww - 1, 22, 3, C.ink);
    rrect(g, tx + 1, y + 1, ww - 3, 21, 2, on ? C.night : C.shade);
    if (on) { g.rect(tx + 3, y + 1, ww - 7, 1, C.teal3); }
    g.text(t.label, tx + (ww - 1) / 2, y + 5, { font: on ? 'bold' : 'body', color: on ? C.white : C.slate2, align: 'center' });
    input.hit('tab_' + t.id, tx, y, ww - 1, 22, () => onPick(t.id), 4);
  });
}

// 숫자 콤마
export const fmt = n => Math.round(n).toLocaleString('ko-KR');

// 상단 정보줄: 레벨·경험치 / 크레딧 / 젬 / 설정
export function hud(app, s) {
  const { g, W } = app;
  const y = 6;
  // 레벨판
  rbox(g, 4, y, 92, 18, 4, C.night);
  g.rect(6, y + 1, 88, 1, C.night2);
  g.text('Lv', 9, y + 4, { color: C.teal3 });
  g.text(String(s.level), 25, y + 4, { font: 'bold', color: C.white });
  bar(g, 38, y + 6, 52, 7, s.exp / s.expMax, 'exp');
  // 설정(보이는 판 18×18, 터치 여유 4)
  const gx = W - 22;
  rbox(g, gx, y, 18, 18, 4, C.night); g.rect(gx + 2, y + 1, 14, 1, C.night2);
  g.img(icon('gear'), gx + 4, y + 4);
  app.input.hit('hud_gear', gx, y, 18, 18, () => app.toast && app.toast('설정'), 6);
  // 젬
  const gemTxt = fmt(s.gems);
  const gw = g.textW(gemTxt) + 24;
  const gemX = gx - 4 - gw;
  rbox(g, gemX, y, gw, 18, 4, C.night); g.rect(gemX + 2, y + 1, gw - 4, 1, C.night2);
  g.img(icon('gem'), gemX + 5, y + 4);
  g.text(gemTxt, gemX + 19, y + 4, { color: C.teal4 });
  // 크레딧
  const cTxt = fmt(s.credits);
  const cw = g.textW(cTxt) + 24;
  const cX = gemX - 4 - cw;
  rbox(g, cX, y, cw, 18, 4, C.night); g.rect(cX + 2, y + 1, cw - 4, 1, C.night2);
  g.img(icon('coin'), cX + 5, y + 4);
  g.text(cTxt, cX + 19, y + 4, { color: C.gold });
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
  // 바탕 띠
  g.rect(0, y, W, h, C.ink);
  g.rect(0, y + 1, W, h - 1, '#2b2238');
  g.rect(0, y + 1, W, 1, C.shade);
  const n = NAV.length, sw = Math.floor((W - 8) / n), x0 = Math.floor((W - sw * n) / 2);
  NAV.forEach((t, i) => {
    const x = x0 + i * sw, on = t.id === active;
    const pressed = input.isPressed('nav_' + t.id);
    const by = y + 4 + (on ? -3 : 0) + (pressed ? 1 : 0);
    if (on) { rbox(g, x + 2, by, sw - 4, 38, 4, C.night); g.rect(x + 5, by + 1, sw - 10, 1, C.teal3); }
    const ic = t.locked ? tinted(t.icon, C.slate) : icon(t.icon);
    g.img(ic, x + Math.floor((sw - ic.width) / 2), by + 4);
    if (t.locked) g.img(icon('lock'), x + Math.floor(sw / 2) + 4, by + 1);
    g.text(t.label, x + sw / 2, by + 22, { color: on ? C.white : (t.locked ? C.slate : C.mute), align: 'center', font: on ? 'bold' : 'body' });
    if (opt.badge && opt.badge[t.id]) { g.disc(x + sw - 9, by + 4, 3, C.ink); g.disc(x + sw - 9, by + 4, 2, C.red); }
    input.hit('nav_' + t.id, x, y, sw, h, () => {
      if (t.locked) return app.toast && app.toast('함선은 준비 중이에요');
      if (t.scene && app.go) app.go(t.scene);
    });
  });
}

// 알림 띠(토스트)
export function toast(app, msg) {
  const { g, W, H } = app;
  const w = Math.min(W - 24, g.textW(msg) + 20), x = Math.round((W - w) / 2), y = H - 76;
  rbox(g, x, y, w, 20, 4, C.ink, C.teal);
  g.text(msg, W / 2, y + 5, { color: C.white, align: 'center' });
}
