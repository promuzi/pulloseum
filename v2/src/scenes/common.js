// 화면 공용 조각: 무대 층(2배 도트), 머리줄, 큰 제목, 씨앗 그림, 스탯 정의
import { C, RAMP, ELEMENT } from '../art/palette.js';
import { icon, tinted } from '../art/icons.js';
import { rbox, button } from '../art/ui.js';
import { T, btnBody } from '../art/theme.js';
import { drawTitle } from '../core/text.js';
import { layer } from '../core/gfx.js';

// 반해상도 무대 층: 그 위에 그린 것은 화면에서 정확히 2배(도트 한 칸 = 2×2)
const layers = new Map();
export function stage(app, x, y, w, h, drawFn) {
  const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2), key = w2 + 'x' + h2;
  let L = layers.get(key);
  if (!L) { L = layer(w2, h2); layers.set(key, L); }
  L.g.c.clearRect(0, 0, w2, h2);
  drawFn(L.g, w2, h2);
  app.g.c.imageSmoothingEnabled = false;
  app.g.c.drawImage(L.cv, 0, 0, w2, h2, x, y, w2 * 2, h2 * 2);
}

// 머리줄: 뒤로 + 제목 (+ 오른쪽 글)
export function header(app, title, opt = {}) {
  const { g, W } = app;
  g.rect(0, 0, W, 30, T.bg2);
  g.rect(0, 28, W, 1, T.panel.frameLo); g.rect(0, 29, W, 1, T.ink);
  if (opt.back !== false) {
    const pressed = app.input.isPressed('hdr_back');
    btnBody(g, 6, 5, 24, 20, T.btn.second, pressed);
    g.img(tinted('back', T.btn.second.text), 13, 11 + (pressed ? 1 : 0));
    app.input.hit('hdr_back', 6, 5, 24, 20, () => app.go(opt.backTo || 'home'), 6);
  }
  g.text(title, opt.back === false ? 12 : 37, 8, { font: 'head', color: T.text.main, shadow: T.ink });
  if (opt.right) g.text(opt.right, W - 10, 10, { color: opt.rightColor || T.text.sub, align: 'right' });
}

// 큰 제목: 고해상도 글자 + 3단 색 띠 + 외곽선 + 그림자
export function bigTitle(g, str, cx, y, opt = {}) {
  return drawTitle(g.c, str, cx, y, {
    font: opt.font || 'big', top: opt.top || C.teal4, mid: opt.mid || C.teal3, low: opt.low || C.teal,
    line: opt.line || C.ink, shadow: opt.shadow || C.teal0,
  });
}

// 씨앗 그림(1배): 속성 램프로 칠한 타원 씨앗 + 빛. rainbow면 무지개 띠
const ELR = { fire: 'fire', water: 'water', grass: 'grass', earth: 'earth', wind: 'wind', bolt: 'bolt', ice: 'ice' };
export function seedArt(g, cx, cy, el, opt = {}) {
  const rx = 6, ry = 8;
  g.ellipse(cx, cy, rx + 1, ry + 1, C.ink);
  if (opt.rainbow) {
    const band = ['#e83b3b', '#f79617', '#f9c22b', '#1ebc73', '#4d9be6', '#a884f3'];
    g.clip(cx - rx, cy - ry, rx * 2 + 1, ry * 2 + 1, () => { for (let i = 0; i < band.length; i++) g.ellipse(cx, cy, rx, ry, band[i]) ; });
    for (let j = -ry; j <= ry; j++) { const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry))) + 0.5); const k = Math.min(band.length - 1, Math.floor(((j + ry) / (ry * 2 + 1)) * band.length)); g.rect(cx - half, cy + j, half * 2 + 1, 1, band[k]); }
  } else {
    const R = RAMP[ELR[el] || 'grass'];
    g.ellipse(cx, cy, rx, ry, R[2]);
    g.ellipse(cx + 1, cy + 1, rx - 2, ry - 2, R[1]);
    g.ellipse(cx - 1, cy - 1, rx - 2, ry - 2, R[2]);
  }
  g.rect(cx - 3, cy - 5, 2, 3, C.white); g.px(cx - 1, cy - 6, C.white);
  // 꼭지
  g.rect(cx, cy - ry - 2, 1, 2, C.ink); g.px(cx + 1, cy - ry - 3, C.green3); g.px(cx + 2, cy - ry - 3, C.green);
}

export const STAT_DEF = [
  { k: 'hp', name: '체력', icon: 'heart' }, { k: 'atk', name: '공격', icon: 'sword' },
  { k: 'def', name: '방어', icon: 'shield' }, { k: 'spd', name: '기동', icon: 'speed' },
  { k: 'acc', name: '적중', icon: 'target', suf: '%' }, { k: 'elem', name: '속성', icon: 'sparkle' },
  { k: 'crit', name: '치명', icon: 'crit', suf: '%' }, { k: 'energy', name: '에너지', icon: 'energy' },
];

// 에너지 칸: 켜진 칸 = 노란 번개, 꺼진 칸 = 어두운 번개
export function energyPips(g, x, y, cur, max, gap = 12) {
  for (let i = 0; i < max; i++) {
    const on = i < cur;
    g.img(on ? icon('energy') : dimIcon('energy'), x + i * gap, y);
  }
}
const dim = new Map();
export function dimIcon(name) {
  let c = dim.get(name); if (c) return c;
  const b = icon(name); c = document.createElement('canvas'); c.width = b.width; c.height = b.height;
  const x = c.getContext('2d'); x.drawImage(b, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const ink = p[i] === 0x2e && p[i + 1] === 0x22; if (!ink) { p[i] = 0x48; p[i + 1] = 0x4a; p[i + 2] = 0x77; } }
  x.putImageData(d, 0, 0); dim.set(name, c); return c;
}

// 등급 알약
const GRADE_COL = { S: C.gold, A: '#a884f3', B: C.blue, C: C.green, D: C.mute };
export function gradeBadge(g, x, y, grade) {
  rbox(g, x, y, 15, 15, 3, GRADE_COL[grade] || C.mute, T.ink);
  g.text(grade, x + 8, y + 2, { font: 'bold', color: C.ink, align: 'center' });
}

export function elemColor(el) { return (ELEMENT[el] || ELEMENT.grass).main; }
export { button };
