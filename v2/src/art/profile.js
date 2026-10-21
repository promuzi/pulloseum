// 프로필 배너 · 사용자 아이콘(2026-10-22 사용자 "배너(다양하게 늘리거나)나 사용자 아이콘도 맞춰보자 식물 아이콘이 별로야 화분이 없어서인지 배경이 이상해서인지 뭔가 이상해 함 고민해봐"):
//  배너 = 색 넷(전과 같음) + 무늬 넷(별빛 · 잎맥 · 물결 · 회로 — 재배사 레벨로 열림) · 아이콘 = 식물만 오려 남색 칸에 띄우던 것 → 화분째 + 배너 색 빛이 번지는 방(바닥 그림자)
import { Gfx } from '../core/gfx.js';
import { BAYER4 } from './palette.js';
import { hexMix } from './statusLook.js';
import { BIG, POT_BIG, drawBig } from './sprites.js';
import { BANNER_LV } from '../game/catalog.js';

// i = s.profile.color(옛 이름 그대로 — 0~3 은 전의 색 넷) · lv = 열리는 재배사 레벨
export const BANNERS = [
  { col: '#8ccfff', name: '하늘' }, { col: '#f0be7d', name: '노을' }, { col: '#9ff0b0', name: '새싹' }, { col: '#c8a8f0', name: '라벤더' },
  { col: '#ffd84a', name: '별빛', pat: 'stars' }, { col: '#7cf0a0', name: '잎맥', pat: 'leaf' },
  { col: '#6fb8ff', name: '물결', pat: 'wave' }, { col: '#ff8a6a', name: '회로', pat: 'circuit' },
].map((b, i) => ({ ...b, lv: BANNER_LV[i] || 1 }));
export const bannerOf = i => BANNERS[i] || BANNERS[0];

// 배너 무늬(옅게 — 글자 뒤): 별빛 = 흩뿌린 별 · 잎맥 = 비스듬한 잎 · 물결 = 가로 물결 · 회로 = 선과 마디
const patMemo = new Map();
function patCanvas(pat, col, w, h) {
  const key = pat + col + w + 'x' + h; let cv = patMemo.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = new Gfx(cv.getContext('2d')), hi = hexMix(col, '#ffffff', 0.4);
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  if (pat === 'stars') for (let i = 0; i < Math.round(w * h / 140); i++) {
    const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), big = rnd() < 0.22;
    if (big) { g.rect(x - 2, y, 5, 1, col); g.rect(x, y - 2, 1, 5, col); g.px(x, y, hi); } else g.px(x, y, rnd() < 0.5 ? col : hi);
  }
  else if (pat === 'leaf') for (let cx = -10; cx < w + 20; cx += 22) for (let cy = 4 + ((cx / 22) & 1) * 14; cy < h + 10; cy += 28) {
    for (let k = 0; k < 9; k++) { const half = Math.round(3 * Math.sin(Math.PI * k / 8)); g.rect(cx + k - half, cy - k, half * 2 + 1, 1, col); }   // 잎 몸
    for (let k = 0; k < 9; k++) g.px(cx + k, cy - k, hi);   // 잎맥
  }
  else if (pat === 'wave') for (let y0 = 6; y0 < h + 6; y0 += 9) for (let x = 0; x < w; x++) { const y = y0 + Math.round(2.2 * Math.sin((x + y0 * 3) / 7)); g.px(x, y, col); if (x % 3 === 0) g.px(x, y - 1, hi); }
  else if (pat === 'circuit') {
    for (let y = 8; y < h; y += 16) { g.rect(0, y, w, 1, col); for (let x = 10 + (y % 32 ? 8 : 0); x < w; x += 26) { g.rect(x - 1, y - 1, 3, 3, hi); g.rect(x, y, 1, 8, col); g.rect(x, y + 8, 10, 1, col); } }
  }
  patMemo.set(key, cv); return cv;
}
export function bannerPattern(g, x, y, w, h, i, alpha = 0.2) {
  const B = bannerOf(i); if (!B.pat) return;
  const cv = patCanvas(B.pat, B.col, w, h);
  g.c.imageSmoothingEnabled = false;
  g.alpha(alpha, () => g.c.drawImage(cv, x, y));
}

// 사용자 아이콘(정사각): 배너 색 빛이 가운데서 번지는 방 + 바닥 그림자 + 화분째 식물(본디 크기로 그린 뒤 보이는 칸만 정사각으로 잘라 줄임 — 한 번 굽고 재사용)
const avMemo = new Map();
const hexRgb = h => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
function avatarCanvas(key, potKey, col) {
  const id = key + '|' + potKey + '|' + col; if (avMemo.has(id)) return avMemo.get(id);
  if (!BIG[key] || !POT_BIG[potKey]) return null;   // 그림이 아직 안 옴(굽지 않음 — 다음에 다시)
  const a = document.createElement('canvas'); a.width = 128; a.height = 150;
  const ga = new Gfx(a.getContext('2d'));
  if (!drawBig(ga, key, potKey, 64, 140, { t: 0 })) return null;
  const d = a.getContext('2d').getImageData(0, 0, a.width, a.height).data;
  let t = 1e9, b = -1, l = 1e9, r = -1;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) if (d[(y * a.width + x) * 4 + 3] > 20) { if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x; }
  if (b < 0) return null;
  const side = Math.max(b - t + 1, r - l + 1) + 12, cv = document.createElement('canvas'); cv.width = side; cv.height = side;
  const c = cv.getContext('2d'), id2 = c.createImageData(side, side), px = id2.data;
  const steps = [hexMix(col, '#ffffff', 0.2), hexMix(col, '#16243c', 0.35), hexMix(col, '#0c1626', 0.62), hexMix(col, '#0a1220', 0.8), '#0a1220'].map(hexRgb);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const rr = Math.hypot(x + 0.5 - side / 2, y + 0.5 - side * 0.42) / (side * 0.72), tt = Math.max(0, Math.min(steps.length - 1.001, rr * (steps.length - 1))), i0 = Math.floor(tt);
    const rgb = steps[BAYER4[y & 3][x & 3] / 16 < tt - i0 ? i0 + 1 : i0], k = (y * side + x) * 4;
    px[k] = rgb[0]; px[k + 1] = rgb[1]; px[k + 2] = rgb[2]; px[k + 3] = 255;
  }
  c.putImageData(id2, 0, 0);
  const g = new Gfx(c), ox = Math.round((side - (r - l + 1)) / 2) - l, oy = side - 4 - (b + 1);
  const fy = b + oy - 1, fw = Math.round((r - l + 1) * 0.42);
  g.ellipse(Math.round(side / 2), fy, fw, 3, 'rgba(0,0,0,0.38)');   // 바닥 그림자
  c.imageSmoothingEnabled = false; c.drawImage(a, ox, oy);
  avMemo.set(id, cv); return cv;
}
// (x, y)에 s칸 아이콘. 그림이 아직 없으면 false(부르는 쪽이 옛 그림으로)
export function drawAvatar(g, key, x, y, s, col = BANNERS[0].col, potKey = 'pot_terra') {
  const cv = avatarCanvas(key, potKey, col); if (!cv) return false;
  g.c.imageSmoothingEnabled = false;
  g.c.drawImage(cv, x, y, s, s);
  return true;
}
