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
