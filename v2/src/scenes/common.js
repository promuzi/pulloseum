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

// 별(개체값 합으로 1~5 — 등급 대신, 2026-10-16 사용자 "등급 대신 개체값 수치 혹은 별의 수"): 작은 별 n개(빈 별 포함 max개). 폭을 돌려줌
const STAR7 = ['...a...', '..aba..', 'aabbbaa', '.abbba.', '.abbba.', 'abb.bba', 'aa...aa'];
const starCache = new Map();
function starCv(on) {
  const k = on ? 1 : 0; let cv = starCache.get(k); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = 7; cv.height = 8; const c = cv.getContext('2d');
  const col = on ? { a: '#f0a830', b: '#ffd84a' } : { a: '#2b3c50', b: '#3e5670' };
  STAR7.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; c.fillStyle = col[ch]; c.fillRect(x, y, 1, 1); }));
  if (on) { c.fillStyle = '#fff6c8'; c.fillRect(3, 2, 1, 1); c.fillRect(2, 3, 1, 1); }
  c.fillStyle = 'rgba(5,7,15,0.7)'; c.fillRect(1, 7, 2, 1); c.fillRect(4, 7, 2, 1);
  starCache.set(k, cv); return cv;
}
export function miniStars(g, x, y, n, max = 5) {
  for (let i = 0; i < max; i++) g.img(starCv(i < n), x + i * 8, y);
  return max * 8 - 1;
}
// 개체값 원형 게이지(사용자 "숫자와 원형 그래프 게이지 — 꽉 차면 최대치, 얼마나 올릴지 알 수 있게"): 반지름 r · 두께 3 · v/max 만큼 채움 · 가운데 숫자
const ringCache = new Map();
export function ivRing(g, cx, cy, r, v, max, col, opt = {}) {
  const key = [r, v, max, col, opt.add || 0].join('|');
  let cv = ringCache.get(key);
  if (!cv) {
    cv = document.createElement('canvas'); cv.width = cv.height = r * 2 + 2; const c = cv.getContext('2d');
    const fill = v / max, add = Math.min(1, (v + (opt.add || 0)) / max);
    for (let y = 0; y < r * 2 + 2; y++) for (let x = 0; x < r * 2 + 2; x++) {
      const dx = x + 0.5 - (r + 1), dy = y + 0.5 - (r + 1), d = Math.hypot(dx, dy);
      if (d > r + 0.5 || d < r - 3.5) continue;
      const a = ((Math.atan2(dx, -dy) / (Math.PI * 2)) + 1) % 1;   // 12시부터 시계 방향
      const edge = d > r - 0.5 || d < r - 2.5;
      c.fillStyle = a < fill ? (edge ? hexDim(col) : col) : a < add ? '#9ff0b0' : edge ? '#0a1626' : '#1d3346';
      c.fillRect(x, y, 1, 1);
    }
    ringCache.set(key, cv);
  }
  g.img(cv, cx - r - 1, cy - r - 1);
  g.text(String(v), cx, cy - 7, { font: 'value', color: v >= max ? '#ffd890' : '#ffffff', align: 'center' });
}
const hexDim = h => { const n = parseInt(h.slice(1), 16), f = v => Math.round(v * 0.62).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };

// 등급 알약
const GRADE_COL = { S: C.gold, A: '#a884f3', B: C.blue, C: C.green, D: C.mute };
export function gradeBadge(g, x, y, grade) {
  rbox(g, x, y, 15, 15, 3, GRADE_COL[grade] || C.mute, T.ink);
  g.text(grade, x + 8, y + 2, { font: 'bold', color: C.ink, align: 'center' });
}

export function elemColor(el) { return (ELEMENT[el] || ELEMENT.grass).main; }
export { button };
