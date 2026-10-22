// 화면 공용 조각: 무대 층(2배 도트), 머리줄, 큰 제목, 씨앗 그림, 스탯 정의
import { C, RAMP, ELEMENT, BAYER4 } from '../art/palette.js';
import { icon, tinted, ICONART } from '../art/icons.js';
import { rbox, button, rrect } from '../art/ui.js';
import { hexMix } from '../art/statusLook.js';
import { seedSprite, seedEl, itemArt } from '../art/items.js';
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
  app.hdrRightX = opt.right ? W - 10 - g.textW(opt.right) : W - 4;   // 처음 안내 '?' 자리(오른쪽 글자 왼쪽)
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

// 종자 그리기(2026-10-23 — 코덱스 원화 도트 art/items.js + 별에 따른 효과, 사용자 "종자의 경우 별 수에 따라서 효과나 차이점?을 넣으면 좋겠는데 이건 너가 고민해서"):
//  (cx, cy) = 가운데 · k = 배율(정수) · pot = 별(잠재력) · shiny = 색 변종(껍질 색이 바뀜) · t = 시계(ms) — 그림이 아직 없으면 옛 타원 씨앗
//  ★1 그대로 · ★2 가끔 반짝 한 점 · ★3 은은한 빛무리(속성 색) · ★4 더 밝은 빛무리 + 도는 반짝이 둘 · ★5 금빛 빛무리 + 도는 반짝이 + 위로 오르는 빛가루 + 껍질을 쓸고 지나가는 금빛
const glowMemo2 = new Map();
function glowRings(col, R, a) {   // 계단 세 겹 빛무리(도트 결 — 부드러운 번짐 대신)
  const key = col + R + a; let cv = glowMemo2.get(key); if (cv) return cv;
  const n = R * 2 + 1; cv = document.createElement('canvas'); cv.width = cv.height = n;
  const c = cv.getContext('2d'), id = c.createImageData(n, n), d = id.data, rgb = hexRgb(col);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.hypot(x - R, (y - R) * 1.08) / R; if (r > 1) continue;
    const al = r < 0.5 ? a : r < 0.76 ? a * 0.58 : BAYER4[y & 3][x & 3] < 8 ? a * 0.3 : 0, k = (y * n + x) * 4;
    d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = Math.round(al * 255);
  }
  c.putImageData(id, 0, 0); glowMemo2.set(key, cv); return cv;
}
let shineCv = null;
function spark(g, x, y, u, col, big) { g.rect(x - u, y, u * 3, u, col); g.rect(x, y - u, u, u * 3, col); if (big) { g.rect(x - 2 * u, y, u, u, col); g.rect(x + 2 * u, y, u, u, col); g.rect(x, y - 2 * u, u, u, col); g.rect(x, y + 2 * u, u, u, col); } g.rect(x, y, u, u, '#ffffff'); }
export function drawSeed(g, cx, cy, key, o = {}) {   // key = 종(종마다 다른 종자 — 없으면 그 속성 종자) 또는 속성
  const el = seedEl(key), k = Math.max(1, Math.round(o.k || 1)), pot = Math.max(1, Math.min(5, o.pot || 1)), t = o.t || 0, spr = seedSprite(key, !!o.shiny, !!o.small), c = g.c, E = ELEMENT[el] || ELEMENT.grass;   // small = 28×32(좁은 칸)
  const w = spr ? spr.width : 14, h = spr ? spr.height : 18, X = Math.round(cx - (w * k) / 2), Y = Math.round(cy - (h * k) / 2);
  c.imageSmoothingEnabled = false;
  if (pot >= 3) {   // 빛무리(천천히 숨 쉬듯)
    const gc = glowRings(pot >= 5 ? '#ffd860' : E.light, Math.round(Math.max(w, h) * (pot >= 4 ? 0.74 : 0.64)), pot >= 5 ? 0.5 : pot >= 4 ? 0.42 : 0.3), s2 = gc.width * k;
    c.globalAlpha = 0.82 + 0.18 * Math.sin(t / 460); c.drawImage(gc, Math.round(cx - s2 / 2), Math.round(cy + h * k * 0.06 - s2 / 2), s2, s2); c.globalAlpha = 1;
  }
  if (spr) {
    if (pot >= 5 && (t % 2600) < 760) {   // 껍질을 쓸고 지나가는 금빛(그림 칸 위에만)
      if (!shineCv) shineCv = document.createElement('canvas');
      shineCv.width = w; shineCv.height = h; const sc = shineCv.getContext('2d'), u = (t % 2600) / 760, bx = Math.round(-h * 0.6 + (w + h * 1.2) * u);
      sc.clearRect(0, 0, w, h); sc.drawImage(spr, 0, 0); sc.globalCompositeOperation = 'source-atop'; sc.fillStyle = 'rgba(255,244,190,0.7)';
      for (let yy = 0; yy < h; yy++) sc.fillRect(bx - Math.round(yy * 0.5), yy, 3, 1);
      sc.globalCompositeOperation = 'source-over'; c.drawImage(shineCv, X, Y, w * k, h * k);
    } else c.drawImage(spr, X, Y, w * k, h * k);
  } else { c.save(); c.translate(cx, cy); c.scale(k * 2, k * 2); seedArt(g, 0, 0, el); c.restore(); }
  const u = k;
  if (pot === 2 && (t % 2400) < 300) spark(g, Math.round(X + w * k * 0.32), Math.round(Y + h * k * 0.34), u, '#fff6c8', false);   // 가끔 반짝
  if (pot >= 4) for (let i = 0; i < 2; i++) {   // 도는 반짝이 둘
    const a = (t / 1300) * Math.PI * 2 + i * Math.PI, sx = Math.round(cx + Math.cos(a) * w * k * 0.66), sy = Math.round(cy + Math.sin(a) * h * k * 0.3 - h * k * 0.08);
    spark(g, sx, sy, u, pot >= 5 ? '#ffe48a' : '#e8f6ff', Math.sin(a) > 0.6);
  }
  if (pot >= 5) for (let i = 0; i < 4; i++) {   // 위로 오르는 빛가루
    const pr = ((t + i * 420) % 1680) / 1680, px = Math.round(cx + (((i * 37) % 10) / 10 - 0.45) * w * k * 0.95), py = Math.round(cy + h * k * 0.42 - pr * h * k * 1.05);
    c.globalAlpha = 1 - pr; g.rect(px, py, u, u, i % 2 ? '#ffe48a' : '#fff6c8'); c.globalAlpha = 1;
  }
}
// 물건 그림(코덱스 도트 — art/items.js) 가운데 맞춰 그리기. 그림이 없으면 false(부르는 쪽이 옛 아이콘으로)
export function drawItemArt(g, key, cx, cy, small = false) {
  const im = itemArt(key, small); if (!im) return false;
  g.c.imageSmoothingEnabled = false; g.c.drawImage(im, Math.round(cx - im.width / 2), Math.round(cy - im.height / 2));
  return true;
}

export const STAT_DEF = [
  { k: 'hp', name: '체력', icon: 'heart' }, { k: 'atk', name: '공격', icon: 'sword' },
  { k: 'def', name: '방어', icon: 'shield' }, { k: 'spd', name: '기동', icon: 'speed' },
  { k: 'acc', name: '적중', icon: 'target', suf: '%' }, { k: 'elem', name: '속성', icon: 'sparkle' },
  { k: 'crit', name: '치명', icon: 'crit', suf: '%' }, { k: 'energy', name: '햇빛', icon: 'energy' },
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
  const dk = name + (ICONART[name] ? '*' : ''); let c = dim.get(dk); if (c) return c;   // 코덱스 아이콘이 오면 새로 구움(2026-10-23)
  const b = icon(name); c = document.createElement('canvas'); c.width = b.width; c.height = b.height;
  const x = c.getContext('2d'); x.drawImage(b, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const ink = p[i] === 0x2e && p[i + 1] === 0x22; if (!ink) { p[i] = 0x48; p[i + 1] = 0x4a; p[i + 2] = 0x77; } }
  x.putImageData(d, 0, 0); dim.set(dk, c); return c;
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

// 물건 카드(상점 · 종자 가방 — 2026-10-22 상점에서 옮김): 카드 테(전투 카드와 같은 결: 먹선 · 금속 테(위 · 왼 빛, 아래 · 오른 그늘) · 안쪽 먹선) · 그림 칸 바탕(갈래 색 빛이 가운데서 번짐)
const CARD_INK = '#0b1322';
export function cardBox(g, x, y, w, h, col) {
  const hi = hexMix(col, '#ffffff', 0.45), lo = hexMix(col, CARD_INK, 0.5);
  rrect(g, x, y, w, h, 5, CARD_INK); rrect(g, x + 1, y + 1, w - 2, h - 2, 4, col);
  g.rect(x + 4, y + 1, w - 8, 1, hi); g.rect(x + 1, y + 4, 1, h - 8, hi);
  g.rect(x + 4, y + h - 2, w - 8, 1, lo); g.rect(x + w - 2, y + 4, 1, h - 8, lo);
  rrect(g, x + 3, y + 3, w - 6, h - 6, 2, CARD_INK);
}
const glowMemo = new Map(), hexRgb = h => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export function glowArt(col, w, h) {   // 디더 네 단 · 한 번 굽고 재사용
  const key = col + w + 'x' + h; let cv = glowMemo.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'), id = c.createImageData(w, h), d = id.data;
  const steps = [hexMix(col, '#ffffff', 0.35), col, hexMix(col, CARD_INK, 0.45), hexMix(col, CARD_INK, 0.7), hexMix(col, CARD_INK, 0.85)].map(hexRgb), R = Math.hypot(w / 2, h / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h * 0.48) / R, tt = Math.max(0, Math.min(steps.length - 1.001, r * 1.25 * (steps.length - 1))), i0 = Math.floor(tt);
    const rgb = steps[BAYER4[y & 3][x & 3] / 16 < tt - i0 ? i0 + 1 : i0], k = (y * w + x) * 4;
    d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = 255;
  }
  c.putImageData(id, 0, 0); glowMemo.set(key, cv); return cv;
}
export { button };
