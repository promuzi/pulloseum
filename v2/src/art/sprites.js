// 그림 파일(48×56 도트) 불러오기. 원본 레시피 = tools/pixel/sprites-data.js, 내보내기 = node tools/pixel/export.mjs
import { C } from './palette.js';
import { frameAt } from '../core/motion.js';

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
    // 각도를 바꾼 화분(tools/pixel/big/pot_flat.mjs): flat = 대기실 의자 위 12° · far = 전투 먼 쪽(상대) 18°
    ...POTS.flatMap(p => Object.keys(VIEW_DY).map(async v => { const [b, f] = await Promise.all([load(base + 'pots/' + p + '_' + v + '_back.png'), load(base + 'pots/' + p + '_' + v + '_front.png')]); if (b && f) POT_BIG[p + '_' + v] = { back: b, front: f }; })),
    // 생장 단계 묶음(어린·자람, convert.mjs --export --stage=…) — 없으면 성체 그림을 씀
    ...ROSTER.flatMap(k => ['young', 'teen'].map(async st => { const [im, meta] = await Promise.all([load(base + 'plants/' + k + '_' + st + '.png'), json(base + 'plants/' + k + '_' + st + '.json')]); if (im && meta) BIG[k + '_' + st] = { sheet: im, white: whiteOf(im), meta }; })),
  ]);
  return [...ROSTER.filter(k => !BIG[k]), ...POTS.filter(p => !POT_BIG[p])];
}
// ── 작은 칸 그림(양육·도감·상점, 2026-10-15): 큰 판 대기 첫 장을 도트 규칙대로 절반(48×56) — tools/pixel/big/small.mjs → assets/v2/small/ ──
//  식물 = 위 under · 아래 over(48×112), 화분 = 위 뒤 · 아래 앞(48×112). 그리는 순서는 큰 판과 같음(화분 뒤 → under → 화분 앞 → over)
export const SMALL = {}, SMALL_POT = {};
export async function loadSmall(base = '../assets/v2/small/') {
  await Promise.all([
    ...ROSTER.map(async k => { const im = await load(base + k + '.png'); if (im) SMALL[k] = im; }),
    ...POTS.map(async p => { const im = await load(base + 'pots/' + p + '.png'); if (im) SMALL_POT[p] = im; }),
  ]);
  return [...ROSTER.filter(k => !SMALL[k]), ...POTS.filter(p => !SMALL_POT[p])];
}
// (x, y) = 48×56 칸의 왼쪽 위. bob = 식물만 위로 n칸(숨쉬기)
export function drawSmall(g, key, potKey, x, y, opt = {}) {
  const pl = SMALL[key], pt = SMALL_POT[potKey] || SMALL_POT.pot_terra, b = opt.bob || 0, c = g.c;
  if (!pt) return false;
  c.imageSmoothingEnabled = false;
  c.drawImage(pt, 0, 0, 48, 56, x, y, 48, 56);
  if (pl) c.drawImage(pl, 0, 0, 48, 56, x, y - b, 48, 56);
  c.drawImage(pt, 0, 56, 48, 56, x, y, 48, 56);
  if (pl) c.drawImage(pl, 0, 56, 48, 56, x, y - b, 48, 56);
  return !!pl;
}
// 한 장으로 합친 작은 그림(실루엣·잘라 쓰기용, 종·화분마다 한 번)
const smallCache = new Map();
export function smallCanvas(key, potKey = 'pot_terra') {
  const id = key + '|' + potKey; let cv = smallCache.get(id);
  if (!cv) { cv = document.createElement('canvas'); cv.width = 48; cv.height = 56; drawSmall({ c: cv.getContext('2d') }, key, potKey, 0, 0); smallCache.set(id, cv); }
  return cv;
}

// ── 장소 배경(코덱스 그림 → tools/pixel/big/bgconv.mjs 로 정확한 칸 도트) — assets/v2/bg/<이름>.png ──
export const BGIMG = {};
export const BG_NAMES = ['arena_ship', 'arena_garden', 'arena_night', 'arena_retro', 'arena_cell', 'title_night', 'home_ship', 'home_cell', 'home_room', 'home_loft', 'home_loft_dim', 'nursery_garden', 'nursery_farm', 'nursery_lift', 'arena_colosseum'];
export const BGMETA = {};   // 그림에 딸린 자리 정보(json) — 스마트팜 식물 자리 등
const BG_META_NAMES = ['nursery_farm', 'home_loft', 'nursery_lift'];
export async function loadBg(base = '../assets/v2/bg/') {
  const got = await Promise.all(BG_NAMES.map(n => load(base + n + '.png')));
  BG_NAMES.forEach((n, i) => { if (got[i]) BGIMG[n] = got[i]; });
  await Promise.all(BG_META_NAMES.map(async n => { try { const r = await fetch(base + n + '.json'); if (r.ok) BGMETA[n] = await r.json(); } catch {} }));
  return BG_NAMES.filter(n => !BGIMG[n]);
}
// 얼굴 초상: 대기 첫 장에서 머리 둘레 s×s 를 1배로 잘라 (x, y)에(under·over 두 층). flip = 좌우 뒤집기(상대)
// src = 그림에서 잘라 올 칸(기본 s — 1:1). 작은 칸에 얼굴 전체를 넣을 땐 src를 크게(예 s 20 · src 40 = 반으로 줄여 그림, 2배 화면에선 그대로 또렷)
export function drawPortrait(g, key, x, y, s, flip = false, src = s) {
  const P = BIG[key]; if (!P) return false;
  const m = P.meta, hx = Math.round(m.head[0]), hy = Math.round(m.head[1]);
  const sx = Math.max(0, Math.min(m.w - src, hx - Math.floor(src / 2))), sy = Math.max(0, Math.min(m.h - src, hy - Math.floor(src / 2) + 3));
  part(g, P.sheet, sx, sy, src, src, x, y, flip, s, s);
  part(g, P.sheet, sx, sy + m.rows * m.h, src, src, x, y, flip, s, s);
  return true;
}
function whiteOf(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C.white; x.fillRect(0, 0, c.width, c.height); return c; }
// 깜빡임은 한 바퀴(3.2초)마다 종·바퀴 번호로 반쯤만 → 3~6초에 한 번쯤, 무작위처럼
function blinkLoop(key, n) { let h = (n + 1) * 2654435761; for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 2246822519); return ((h >>> 15) & 1) === 0; }
function part(g, im, sx, sy, w, h, x, y, flip, dw = w, dh = h) {
  const c = g.c; c.imageSmoothingEnabled = false;
  if (flip) { c.save(); c.translate(x + dw, y); c.scale(-1, 1); c.drawImage(im, sx, sy, w, h, 0, 0, dw, dh); c.restore(); }
  else c.drawImage(im, sx, sy, w, h, x, y, dw, dh);
}
// 화분에 심은 큰 판 식물: (bx, by) = 화분 굽이 바닥에 닿는 점. t = 시각(ms), phase = 숨 엇갈림(ms), flip = 좌우 뒤집기(상대), flash = 맞은 순간 하얗게
// 게임 단계 → 그림 단계(CHANGELOG 2026-10-15 "게임 6단계와 잇기": 씨앗·새싹·유체 → 어린, 성장체 → 자람, 성체·완숙체 → 성체)
const STAGE_ART = { seed: 'young', sprout: 'young', juvenile: 'young', growing: 'teen', mature: null, evolved: null };
export function bigKey(key, stage) { const st = STAGE_ART[stage]; return st && BIG[key + '_' + st] ? key + '_' + st : key; }
// 화분 각도(opt.view 또는 옛 opt.flat): 덜 내려다본 판은 굽이 그만큼 아래라 판을 올려 굽을 같은 바닥점에 둔다
const VIEW_DY = { flat: 2, far: 1 };
function potView(potKey, opt) {
  const v = opt.view || (opt.flat ? 'flat' : null), alt = v && POT_BIG[(potKey || 'pot_terra') + '_' + v];
  return alt ? [alt, VIEW_DY[v]] : [POT_BIG[potKey] || POT_BIG.pot_terra, 0];
}
export function drawBig(g, key, potKey, bx, by, opt = {}) {
  const P = BIG[key], [pot, vdy] = potView(potKey, opt);
  if (!pot) return false;
  by -= vdy;
  if (!P) {   // 빈 화분
    const x = Math.round(bx - 48), y = Math.round(by - 96.55);
    part(g, pot.back, 0, 0, 96, 112, x, y, false); part(g, pot.front, 0, 0, 96, 112, x, y, false);
    return !key;
  }
  const m = P.meta, x = Math.round(bx - m.base[0]), y = Math.round(by - m.base[1]), t = Math.max(0, (opt.t || 0) + (opt.phase || 0));
  let f = frameAt(t, m.frameMs, m.frames);
  if (m.blinkIndex != null && f >= m.blinkAt && f < m.blinkAt + 4 && blinkLoop(key, Math.floor(t / (m.frames * m.frameMs)))) f = m.blinkIndex + f - m.blinkAt;
  const sx = (f % m.cols) * m.w, sy = Math.floor(f / m.cols) * m.h, src = opt.flash ? P.white : P.sheet, fl = !!opt.flip;
  part(g, pot.back, 0, 0, m.w, m.h, x, y, fl);
  part(g, src, sx, sy, m.w, m.h, x, y, fl);
  part(g, pot.front, 0, 0, m.w, m.h, x, y, fl);
  part(g, src, sx, sy + m.rows * m.h, m.w, m.h, x, y, fl);
  return true;
}
// 큰 판 한 장 고르기(숨쉬기 + 깜빡임)
function bigFrame(key, m, t) {
  let f = frameAt(t, m.frameMs, m.frames);
  if (m.blinkIndex != null && f >= m.blinkAt && f < m.blinkAt + 4 && blinkLoop(key, Math.floor(t / (m.frames * m.frameMs)))) f = m.blinkIndex + f - m.blinkAt;
  return [(f % m.cols) * m.w, Math.floor(f / m.cols) * m.h];
}
// 잔디에 심긴 큰 판 식물(화분 없이, 양육 스마트팜): (bx, by) = 흙 줄 가운데. 흙 줄 아래는 안 그림 — 뒤 층 → between(잔디 덤불) → 앞 층
export function drawBigPlanted(g, key, bx, by, opt = {}) {
  const P = BIG[key]; if (!P) return false;
  const m = P.meta, x = Math.round(bx - m.soil[0]), y = Math.round(by - m.soil[1]), [sx, sy] = bigFrame(key, m, Math.max(0, (opt.t || 0) + (opt.phase || 0)));
  const cut = Math.round(by) - y;
  g.clip(x, y, m.w, cut, () => part(g, P.sheet, sx, sy, m.w, m.h, x, y, false));
  if (opt.between) opt.between();
  g.clip(x, y, m.w, cut + 2, () => part(g, P.sheet, sx, sy + m.rows * m.h, m.w, m.h, x, y, false));
  return true;
}
// 화분째 큰 판 식물: (bx, by) = 화분 흙 줄 가운데. between = 식물 뒤 층과 화분 앞 사이(흙 위 잔디 마개 등)
export function drawBigPotted(g, key, potKey, bx, by, opt = {}) {
  const P = BIG[key], pot = POT_BIG[potKey] || POT_BIG.pot_terra; if (!pot) return false;
  const m = P ? P.meta : { w: 96, h: 112, soil: [48, 75.7] }, x = Math.round(bx - m.soil[0]), y = Math.round(by - m.soil[1]);
  part(g, pot.back, 0, 0, 96, 112, x, y, false);
  let sx = 0, sy = 0; if (P) { [sx, sy] = bigFrame(key, m, Math.max(0, (opt.t || 0) + (opt.phase || 0))); part(g, P.sheet, sx, sy, m.w, m.h, x, y, false); }
  if (opt.between) opt.between(x, y);
  part(g, pot.front, 0, 0, 96, 112, x, y, false);
  if (P) part(g, P.sheet, sx, sy + m.rows * m.h, m.w, m.h, x, y, false);
  return true;
}
// 몸놀림을 준 큰 판 식물(전투 공격·피격): 흙 위 몸만 기울인다 — 흙 높이 0 → 맨 위 1만큼 (qx, qy)칸(그림 좌표, 뒤집기 전),
//  sq = 눌림(+ = 흙 줄 기준 세로로 줄어듦, − = 늘어남). 화분은 그대로라 밑동은 흙에 박힌 채(영상 굽기 attackField 의 근사).
export function drawBigPose(g, key, potKey, bx, by, opt = {}) {
  const P = BIG[key], [pot, vdy] = potView(potKey, opt);
  if (!P || !pot || (!opt.qx && !opt.qy && !opt.sq)) return drawBig(g, key, potKey, bx, by, opt);
  by -= vdy;
  const m = P.meta, x = Math.round(bx - m.base[0]), y = Math.round(by - m.base[1]), t = Math.max(0, (opt.t || 0) + (opt.phase || 0));
  const f = frameAt(t, m.frameMs, m.frames), sx = (f % m.cols) * m.w, sy = Math.floor(f / m.cols) * m.h;
  const src = opt.flash ? P.white : P.sheet, fl = !!opt.flip, soil = m.soil[1], sc = 1 - (opt.sq || 0) * 0.03, qx = opt.qx || 0, qy = opt.qy || 0;
  const rows = oy => {
    const c = g.c; c.save(); c.imageSmoothingEnabled = false;
    if (fl) { c.translate(x + m.w, y); c.scale(-1, 1); } else c.translate(x, y);
    for (let yd = 0; yd < m.h; yd++) {
      const ys = yd >= soil ? yd : Math.round(soil - (soil - yd) / sc);
      if (ys < 0 || ys >= m.h) continue;
      const w = Math.max(0, Math.min(1, (soil - ys) / soil));
      c.drawImage(src, sx, oy + ys, m.w, 1, Math.round(qx * w), yd + Math.round(qy * w), m.w, 1);
    }
    c.restore();
  };
  part(g, pot.back, 0, 0, m.w, m.h, x, y, fl);
  rows(sy);
  part(g, pot.front, 0, 0, m.w, m.h, x, y, fl);
  rows(sy + m.rows * m.h);
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
// 큰 판 첫 장(under·over)의 칠해진 범위 [위, 아래, 왼, 오른](판 좌표, 한 번 재 둠) — 홈 옆 창을 식물 가운데에 맞출 때(2026-10-15 "식물의 중앙과 디스플레이 전체 중앙을 정렬시켜 항상")
const boxCache = new Map();
export function bigBox(key) {
  if (boxCache.has(key)) return boxCache.get(key);
  const P = BIG[key]; if (!P) return null;
  const m = P.meta, c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
  const x = c.getContext('2d'); x.drawImage(P.sheet, 0, 0, m.w, m.h, 0, 0, m.w, m.h); x.drawImage(P.sheet, 0, m.rows * m.h, m.w, m.h, 0, 0, m.w, m.h);
  const d = x.getImageData(0, 0, m.w, m.h).data;
  let t = m.h, b = -1, l = m.w, r = -1;
  for (let yy = 0; yy < m.h; yy++) for (let xx = 0; xx < m.w; xx++) if (d[(yy * m.w + xx) * 4 + 3] >= 128) { t = Math.min(t, yy); b = Math.max(b, yy); l = Math.min(l, xx); r = Math.max(r, xx); }
  const box = b < 0 ? null : [t, b, l, r];
  boxCache.set(key, box); return box;
}
