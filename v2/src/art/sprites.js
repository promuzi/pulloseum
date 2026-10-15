// 그림 파일(48×56 도트) 불러오기. 원본 레시피 = tools/pixel/sprites-data.js, 내보내기 = node tools/pixel/export.mjs
import { C } from './palette.js';

// 첫 출시 도감 = 1궤도 행성 세 곳의 기본 11종 + 지역 희귀 스포어캡
export const ROSTER = ['flower_grass', 'thorn', 'aqua', 'flower_wind', 'spark', 'vine_water', 'cactus_fire', 'gaia', 'flower_fire', 'cactus_wind', 'vine_wind', 'spore_cap'];
export const EXTRA = ['tree_fire'];
export const POTS = ['pot_terra', 'pot_ceramic', 'pot_glass', 'pot_crystal', 'pot_gold'];
export const IMG = {};

function load(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

export async function loadSprites(base = '../assets/sprites/') {
  const keys = [...ROSTER, ...EXTRA, ...POTS];
  const got = await Promise.all(keys.map(k => load(base + k + '.png')));
  keys.forEach((k, i) => { IMG[k] = got[i]; });
  return keys.filter(k => !IMG[k]);
}

// ── 큰 판 식물(96×112, 컨셉 그림을 도트로 변환 — node tools/pixel/big/convert.mjs --export <키…>) ──
// 종마다 시트 한 장: 대기 64장(눈 뜸) + 깜빡임 4장 × 두 층(under = 화분 뒤와 화분 앞 사이, over = 화분 앞보다 앞·특성 효과) + 정보 json
export const BIG = {}, POT_BIG = {};
export async function loadBig(base = '../assets/v2/') {
  const json = u => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null);
  await Promise.all([
    ...ROSTER.map(async k => { const [im, meta] = await Promise.all([load(base + 'plants/' + k + '.png'), json(base + 'plants/' + k + '.json')]); if (im && meta) BIG[k] = { sheet: im, white: whiteOf(im), meta }; }),
    ...POTS.map(async p => { const [b, f] = await Promise.all([load(base + 'pots/' + p + '_back.png'), load(base + 'pots/' + p + '_front.png')]); if (b && f) POT_BIG[p] = { back: b, front: f }; }),
  ]);
  return [...ROSTER.filter(k => !BIG[k]), ...POTS.filter(p => !POT_BIG[p])];
}
function whiteOf(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C.white; x.fillRect(0, 0, c.width, c.height); return c; }
// 깜빡임은 한 바퀴(3.2초)마다 종·바퀴 번호로 반쯤만 → 3~6초에 한 번쯤, 무작위처럼
function blinkLoop(key, n) { let h = (n + 1) * 2654435761; for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 2246822519); return ((h >>> 15) & 1) === 0; }
function part(g, im, sx, sy, w, h, x, y, flip) {
  const c = g.c; c.imageSmoothingEnabled = false;
  if (flip) { c.save(); c.translate(x + w, y); c.scale(-1, 1); c.drawImage(im, sx, sy, w, h, 0, 0, w, h); c.restore(); }
  else c.drawImage(im, sx, sy, w, h, x, y, w, h);
}
// 화분에 심은 큰 판 식물: (bx, by) = 화분 굽이 바닥에 닿는 점. t = 시각(ms), phase = 숨 엇갈림(ms), flip = 좌우 뒤집기(상대), flash = 맞은 순간 하얗게
export function drawBig(g, key, potKey, bx, by, opt = {}) {
  const P = BIG[key], pot = POT_BIG[potKey] || POT_BIG.pot_terra;
  if (!pot) return false;
  if (!P) {   // 빈 화분
    const x = Math.round(bx - 48), y = Math.round(by - 96.55);
    part(g, pot.back, 0, 0, 96, 112, x, y, false); part(g, pot.front, 0, 0, 96, 112, x, y, false);
    return !key;
  }
  const m = P.meta, x = Math.round(bx - m.base[0]), y = Math.round(by - m.base[1]), t = Math.max(0, (opt.t || 0) + (opt.phase || 0));
  let f = Math.floor(t / m.frameMs) % m.frames;
  if (m.blinkIndex != null && f >= m.blinkAt && f < m.blinkAt + 4 && blinkLoop(key, Math.floor(t / (m.frames * m.frameMs)))) f = m.blinkIndex + f - m.blinkAt;
  const sx = (f % m.cols) * m.w, sy = Math.floor(f / m.cols) * m.h, src = opt.flash ? P.white : P.sheet, fl = !!opt.flip;
  part(g, pot.back, 0, 0, m.w, m.h, x, y, fl);
  part(g, src, sx, sy, m.w, m.h, x, y, fl);
  part(g, pot.front, 0, 0, m.w, m.h, x, y, fl);
  part(g, src, sx, sy + m.rows * m.h, m.w, m.h, x, y, fl);
  return true;
}

const SP_W = 48, SP_H = 56;
// 화분 + 식물 한 몸. (x,y) = 48×56 판의 왼쪽 위. bob = 식물만 위로 n칸(숨쉬기)
export function plantStack(g, key, potKey, x, y, opt = {}) {
  const pot = IMG[potKey || 'pot_terra'];
  if (pot) g.img(pot, x, y);
  const im = IMG[key];
  if (!im) return;
  const by = opt.bob ? -opt.bob : 0;
  if (opt.flash) g.silhouette(im, x, y + by, C.white);
  else g.img(im, x, y + by, 1, !!opt.flip);
}
// 숨쉬기: 1.2초 주기로 1칸 위아래(두 단계)
export const bob = (t, phase = 0) => (Math.floor((t + phase) / 600) % 2) ? 1 : 0;
export const SPRITE = { W: SP_W, H: SP_H };
