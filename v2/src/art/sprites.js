// 그림 파일(48×56 도트) 불러오기. 원본 레시피 = tools/pixel/sprites-data.js, 내보내기 = node tools/pixel/export.mjs
import { C } from './palette.js';
import { frameAt } from '../core/motion.js';
import { capOf, ringOf, bedOf, bareOf, dirtOf } from './potgrass.js';
import { shinyCanvas, shinyKey } from './shiny.js';

// 첫 출시 도감 = 1궤도 행성 세 곳의 기본 11종 + 지역 희귀 스포어캡
export const ROSTER = ['flower_grass', 'thorn', 'aqua', 'flower_wind', 'spark', 'vine_water', 'cactus_fire', 'gaia', 'flower_fire', 'cactus_wind', 'vine_wind', 'spore_cap', 'frost_bell', 'volt_vine', 'stone_cap', 'jelly_cap', 'fang_trap', 'blade_vine', 'toxi_cactus', 'draco_fruit', 'ember_cap', 'drake_cactus', 'gat_cap', 'mask_vine', 'drum_cactus', 'lantern_vine', 'jar_cactus', 'goblin_cap', 'crown_cap', 'frost_drake', 'gladi_cactus', 'jangseung_cactus', 'astro_cap', 'viking_cap', 'hyunmu_cap', 'gumiho_bloom', 'wizard_bell', 'ninja_vine', 'diver_vine', 'pirate_cactus', 'ranger_vine', 'miner_cap', 'volcano_cap', 'dandel_aero', 'snow_ballet'];   // 2026-10-18 새 여섯
export const EXTRA = ['tree_fire'];
export const BIG_EXTRA = [];   // 종이 아닌 큰 판 그림(처음 화면 대표 캐릭터 — 2026-10-17 사용자가 '불꽃 용 선인장'을 고름)
export const POTS = ['pot_terra', 'pot_ceramic', 'pot_glass', 'pot_crystal', 'pot_gold'];
export const IMG = {};

function load(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }

// 옛 48×56 도트(assets/sprites)는 처음 12종만 · 생장 단계 그림(_young · _teen)도 있는 종만 부름 — 새 종(2026-10-16 프로스트벨 등)은 성체 그림 하나(없는 파일을 부르지 않게)
// 생장 단계 그림이 있는 종(어린 · 자람 둘 다 — 하나만 있으면 그 단계만 바뀜). 새로 그리면 여기에 더함(2026-10-17)
export const STAGED_KEYS = ROSTER;   // 2026-10-17 모든 종(30) 어린 · 자람 그림 있음 — 프로스트드레이크 = 알 → 깨어나는 새끼 → 새끼 용(같은 날 받음)
const V1 = ROSTER.slice(0, 12), STAGED = new Set(STAGED_KEYS);
export async function loadSprites(base = '../assets/sprites/') {
  const keys = [...V1, ...EXTRA, ...POTS];
  const got = await Promise.all(keys.map(k => load(base + k + '.png')));
  keys.forEach((k, i) => { IMG[k] = got[i]; });
  return keys.filter(k => !IMG[k]);
}

// ── 큰 판 식물(96×112, 컨셉 그림을 도트로 변환 — node tools/pixel/big/convert.mjs --export <키…>) ──
// 종마다 시트 한 장: 대기 64장(눈 뜸) + 깜빡임 4장 × 두 층(under = 화분 뒤와 화분 앞 사이, over = 화분 앞보다 앞·특성 효과) + 정보 json
export const BIG = {}, POT_BIG = {};
// 처음 화면 대표 식물(2026-10-17 사용자 "이미 로그인 되어 있으면 그 식물을 초반 화면에"): 홈에서 본 내 식물(그림 키 · 화분)을 이 브라우저에 기억 —
//  로그인 열쇠가 있으면 그 식물, 없으면 바위 선인장(가이아록)
const HERO_KEY = 'pullo.hero';
export function heroSaved() { try { if (!localStorage.getItem('pullo.token')) return null; const h = JSON.parse(localStorage.getItem(HERO_KEY) || 'null'); return Array.isArray(h) && typeof h[0] === 'string' && /^[a-z_]+(~s[A-D]?)?$/.test(h[0]) ? [h[0], typeof h[1] === 'string' && /^pot_[a-z]+$/.test(h[1]) ? h[1] : 'pot_terra'] : null; } catch { return null; } }   // ~s = 색 변종(2026-10-22)
let heroLast = null;
export function heroRemember(key, pot) { const v = JSON.stringify([key, pot || 'pot_terra']); if (v === heroLast) return; heroLast = v; try { localStorage.setItem(HERO_KEY, v); } catch {} }
const HERO0 = heroSaved(), HERO0K = HERO0 && HERO0[0].replace(/~s.*$/, '');   // 받을 그림 = 색 변종 꼬리를 뗀 원래 그림
export const FIRST_BIG = HERO0K && HERO0K !== 'gaia' ? ['gaia', HERO0K] : ['gaia'], FIRST_POTS = HERO0 && HERO0[1] !== 'pot_terra' ? ['pot_terra', HERO0[1]] : ['pot_terra'], FIRST_BG = ['home_loft', 'home_loft_dim'];   // 처음 화면에 필요한 것(먼저 받음 — main.js)
const bigTried = new Set();
export async function loadBig(base = '../assets/v2/', only = null) {
  const json = u => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const keys = (only || [...ROSTER, ...BIG_EXTRA]).filter(k => !bigTried.has(k)), pots = (only ? FIRST_POTS : POTS).filter(p => !bigTried.has(p));   // 처음엔 테라코타(+ 내 식물 화분)만
  keys.forEach(k => bigTried.add(k)); pots.forEach(p => bigTried.add(p));
  await Promise.all([
    ...keys.map(async k => { const [im, meta] = await Promise.all([load(base + 'plants/' + k + '.png'), json(base + 'plants/' + k + '.json')]); if (im && meta) BIG[k] = { sheet: im, white: whiteOf(im), meta }; }),
    ...pots.map(async p => { const [b, f] = await Promise.all([load(base + 'pots/' + p + '_back.png'), load(base + 'pots/' + p + '_front.png')]); if (b && f) POT_BIG[p] = { back: b, front: f }; }),
    // 각도를 바꾼 화분(tools/pixel/big/pot_flat.mjs): flat = 대기실 의자 위 12° · far = 전투 먼 쪽(상대) 18°
    ...pots.flatMap(p => Object.keys(VIEW_DY).map(async v => { const [b, f] = await Promise.all([load(base + 'pots/' + p + '_' + v + '_back.png'), load(base + 'pots/' + p + '_' + v + '_front.png')]); if (b && f) POT_BIG[p + '_' + v] = { back: b, front: f }; })),
    // 생장 단계 묶음(어린·자람, convert.mjs --export --stage=…) — 없으면 성체 그림을 씀
    ...(only ? [] : ROSTER).filter(k => STAGED.has(k)).flatMap(k => ['young', 'teen'].map(async st => { const [im, meta] = await Promise.all([load(base + 'plants/' + k + '_' + st + '.png'), json(base + 'plants/' + k + '_' + st + '.json')]); if (im && meta) BIG[k + '_' + st] = { sheet: im, white: whiteOf(im), meta }; })),
  ]);
  return [...ROSTER.filter(k => !BIG[k]), ...BIG_EXTRA.filter(k => !BIG[k]), ...POTS.filter(p => !POT_BIG[p])];
}
// 큰 판 그림 하나(색 변종 키 '~s…'는 원래 그림의 색을 바꿔 처음 쓸 때 만듦 — art/shiny.js · 2026-10-22). 큰 판을 읽는 곳은 BIG[키] 대신 이걸로
export function bigOf(key) {
  const P = BIG[key]; if (P) return P;
  const sk = shinyKey(key), base = sk && BIG[sk[0]];
  if (!base) return undefined;
  const sheet = shinyCanvas(base.sheet, sk[0], sk[1], base.meta);
  return (BIG[key] = sheet ? { sheet, white: base.white, meta: base.meta } : base);
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
// 색 변종 작은 그림이 다 됐나(아직이면 굽는 쪽이 저장하지 않고 다음에 다시)
export const smallReady = key => !shinyKey(key) || !!SMALL[key];
// 작은 그림 하나(색 변종 키는 그 종 큰 판에서 찾은 눈 색을 두고 색을 바꿈 — 큰 판이 아직 없으면 원래 그림을 잠깐 씀)
export function smallOf(key) {
  const S = SMALL[key]; if (S) return S;
  const sk = shinyKey(key), base = sk && SMALL[sk[0]];
  if (!base) return undefined;
  const big = bigOf(key); if (!big || !big.sheet.eye) return base;
  return (SMALL[key] = shinyCanvas(base, sk[0], sk[1], null, big.sheet.eye) || base);
}
// (x, y) = 48×56 칸의 왼쪽 위. bob = 식물만 위로 n칸(숨쉬기)
export function drawSmall(g, key, potKey, x, y, opt = {}) {
  const pl = smallOf(key), pt = SMALL_POT[potKey] || SMALL_POT.pot_terra, b = opt.bob || 0, c = g.c;
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
  if (!cv) { cv = document.createElement('canvas'); cv.width = 48; cv.height = 56; drawSmall({ c: cv.getContext('2d') }, key, potKey, 0, 0); if (smallReady(key)) smallCache.set(id, cv); }
  return cv;
}

// ── 장소 배경(코덱스 그림 → tools/pixel/big/bgconv.mjs 로 정확한 칸 도트) — assets/v2/bg/<이름>.png ──
export const BGIMG = {};
export const BG_NAMES = ['arena_ship', 'arena_garden', 'arena_night', 'arena_retro', 'arena_cell', 'title_night', 'home_ship', 'home_cell', 'home_room', 'home_loft', 'home_loft_dim', 'nursery_garden', 'nursery_farm', 'nursery_lift', 'arena_colosseum'];
export const BGMETA = {};   // 그림에 딸린 자리 정보(json) — 스마트팜 식물 자리 등
const BG_META_NAMES = ['nursery_farm', 'home_loft', 'nursery_lift'];
export async function loadBg(base = '../assets/v2/bg/', only = null) {
  const names = (only || BG_NAMES).filter(n => !BGIMG[n]), metas = (only || BG_META_NAMES).filter(n => BG_META_NAMES.includes(n) && !BGMETA[n]);
  const got = await Promise.all(names.map(n => load(base + n + '.png')));
  names.forEach((n, i) => { if (got[i]) BGIMG[n] = got[i]; });
  await Promise.all(metas.map(async n => { try { const r = await fetch(base + n + '.json'); if (r.ok) BGMETA[n] = await r.json(); } catch {} }));
  return BG_NAMES.filter(n => !BGIMG[n]);
}
// 얼굴 초상: 대기 첫 장에서 머리 둘레 s×s 를 1배로 잘라 (x, y)에(under·over 두 층). flip = 좌우 뒤집기(상대)
// src = 그림에서 잘라 올 칸. 기본(2026-10-16 사용자 "식물 정사각형 사진이 이상한 곳을 찍고 있어" — 전엔 늘 1:1이라 작은 칸엔 머리 한 귀퉁이만):
//  44칸 이하 = 2배로 잘라 반으로 줄임(얼굴 전체 + 몸 위쪽, 칸이 고르게) · 그보다 큰 칸 = 1:1
export function drawPortrait(g, key, x, y, s, flip = false, src = null) {
  const P = bigOf(key); if (!P) return false;
  const m = P.meta, hx = Math.round(m.head[0]), hy = Math.round(m.head[1]);
  if (src == null) src = s * 2 <= Math.min(m.w, 88) ? s * 2 : s;
  let sy = Math.max(0, Math.min(m.h - src, hy - Math.floor(src / 2) + 3));
  // 얼굴이 몸 아래쪽인 종(엠버캑터 — 불꽃 둔덕 가운데 눈): 얼굴을 가운데 두면 칸 아래가 식물 밑 빈칸으로 차고 위 불꽃이 잘림 → 빈칸이 8칸 넘으면 그만큼 칸을 올림(얼굴은 칸 위에서 68% 안쪽)
  //  (2026-10-17 사용자 "불 선인장 프로필 사진이 너무 아래에 찍혀 있어")
  const box = bigBox(key), empty = box ? sy + src - (box[1] + 1) : 0;
  if (empty > 8) sy = Math.max(0, Math.max(hy - Math.round(src * 0.68), sy - (empty - 4)));
  const sx = Math.max(0, Math.min(m.w - src, hx - Math.floor(src / 2)));
  part(g, P.sheet, sx, sy, src, src, x, y, flip, s, s);
  part(g, P.sheet, sx, sy + m.rows * m.h, src, src, x, y, flip, s, s);
  return true;
}
// 식물 전체(머리만이 아니라 — 2026-10-16 사용자 "프로필 설정에서 보이는 식물이 머리만 찍혀있어"): 칠한 범위를 정사각으로 감싸 s칸에 맞춤(그림 칸 밖은 안 읽음)
export function drawWhole(g, key, x, y, s, flip = false) {
  const P = bigOf(key), b = P && bigBox(key); if (!b) return drawPortrait(g, key, x, y, s, flip);
  const m = P.meta, [t, bt, l, r] = b, side = Math.max(bt - t + 1, r - l + 1) + 4, cx = (l + r + 1) / 2, cy = (t + bt + 1) / 2;
  const w = Math.min(m.w, side), h = Math.min(m.h, side), sx = Math.round(Math.max(0, Math.min(m.w - w, cx - w / 2))), sy = Math.round(Math.max(0, Math.min(m.h - h, cy - h / 2)));
  const k = s / side, dw = Math.round(w * k), dh = Math.round(h * k), dx = x + Math.round((s - dw) / 2), dy = y + Math.round((s - dh) / 2);
  part(g, P.sheet, sx, sy, w, h, dx, dy, flip, dw, dh);
  part(g, P.sheet, sx, sy + m.rows * m.h, w, h, dx, dy, flip, dw, dh);
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
// 화분 풀(2026-10-17 사용자 "경기나 대기실에서 화분의 흙이 어색한데 — 스마트 팜처럼 풀로 · 흙이나 자갈 등으로 자연스러운 경계", art/potgrass.js):
//  화분 뒤 → 풀 마개 → 밑동 흙 자리(식물 뒤) → 식물 under → 앞 풀잎(밑동 앞) → 화분 앞 → over
function grassBack(g, P, key, back, x, y, fl) {
  const cap = capOf(back); if (cap) part(g, cap, 0, 0, 96, 112, x, y, fl);
  const r = P && ringOf(P, key, back); if (r) part(g, r.ring, 0, 0, 96, 112, x, y, fl);
  return r;
}
const grassFront = (g, r, x, y, fl) => { if (r) part(g, r.front, 0, 0, 96, 112, x, y, fl); };
// 옛 흙 덮기(보랏빛 흙 무늬)를 걷어 낸 시트 + 맞은 순간 흰 판(art/potgrass.js bareOf — 기본 각도 테라코타 뒤 그림을 받은 뒤부터, 그 전엔 원래 시트)
function bareSet(P) {
  if (P.bare) return P.bare;
  const back = POT_BIG.pot_terra && POT_BIG.pot_terra.back, sheet = back && bareOf(P, back);
  if (!sheet) return { sheet: P.sheet, white: P.white };
  return (P.bare = { sheet, white: whiteOf(sheet) });
}
function dirtSheet(P) {   // 스마트팜 잔디 판: 흙 덮기 띠를 갈색 흙으로
  if (P.dirt) return P.dirt;
  const back = POT_BIG.pot_terra && POT_BIG.pot_terra.back, sheet = back && dirtOf(P, back);
  return sheet ? (P.dirt = sheet) : P.sheet;
}
// 화분에 심은 큰 판 식물: (bx, by) = 화분 굽이 바닥에 닿는 점. t = 시각(ms), phase = 숨 엇갈림(ms), flip = 좌우 뒤집기(상대), flash = 맞은 순간 하얗게
// 게임 단계 → 그림 단계(CHANGELOG 2026-10-15 "게임 6단계와 잇기": 씨앗·새싹·유체 → 어린, 성장체 → 자람, 성체·완숙체 → 성체)
const STAGE_ART = { seed: 'young', sprout: 'young', juvenile: 'young', growing: 'teen', mature: null, evolved: null };
export function bigKey(key, stage, shiny = false) { const st = STAGE_ART[stage], k = st && BIG[key + '_' + st] ? key + '_' + st : key; return shiny ? k + '~s' : k; }   // shiny = 색 변종 그림(2026-10-22)
// 화분 각도(opt.view 또는 옛 opt.flat): 덜 내려다본 판은 굽이 그만큼 아래라 판을 올려 굽을 같은 바닥점에 둔다
const VIEW_DY = { flat: 2, far: 1 };
function potView(potKey, opt) {
  const v = opt.view || (opt.flat ? 'flat' : null), alt = v && POT_BIG[(potKey || 'pot_terra') + '_' + v];
  return alt ? [alt, VIEW_DY[v]] : [POT_BIG[potKey] || POT_BIG.pot_terra, 0];
}
export function drawBig(g, key, potKey, bx, by, opt = {}) {
  const P = bigOf(key), [pot, vdy] = potView(potKey, opt);
  if (!pot) return false;
  by -= vdy;
  if (!P) {   // 빈 화분
    const x = Math.round(bx - 48), y = Math.round(by - 96.55);
    part(g, pot.back, 0, 0, 96, 112, x, y, false); grassBack(g, null, null, pot.back, x, y, false); part(g, pot.front, 0, 0, 96, 112, x, y, false);
    return !key;
  }
  const m = P.meta, x = Math.round(bx - m.base[0]), y = Math.round(by - m.base[1]), t = Math.max(0, (opt.t || 0) + (opt.phase || 0));
  let f = frameAt(t, m.frameMs, m.frames);
  if (m.blinkIndex != null && f >= m.blinkAt && f < m.blinkAt + 4 && blinkLoop(key, Math.floor(t / (m.frames * m.frameMs)))) f = m.blinkIndex + f - m.blinkAt;
  const sx = (f % m.cols) * m.w, sy = Math.floor(f / m.cols) * m.h, B = bareSet(P), src = opt.flash ? B.white : B.sheet, fl = !!opt.flip;
  part(g, pot.back, 0, 0, m.w, m.h, x, y, fl);
  const gr = grassBack(g, P, key, pot.back, x, y, fl);
  part(g, src, sx, sy, m.w, m.h, x, y, fl);
  grassFront(g, gr, x, y, fl);
  part(g, pot.front, 0, 0, m.w, m.h, x, y, fl);
  part(g, src, sx, sy + m.rows * m.h, m.w, m.h, x, y, fl);
  return true;
}
// 지금 장에서 '보이는 식물 칸'만(화분 앞판에 가린 칸은 뺌, 뒤집기 전 그림 좌표) — 상태 효과(타들어감 · 물들임)를 화분 말고 식물에만 입힐 때
//  반환 { img: ImageData(w×h), x, y(화면 왼쪽 위), w, h, flip } — drawBig 과 같은 자리 · 같은 장(깜빡임 포함)
let layerCv = null, layerCx = null;
export function plantLayer(key, potKey, bx, by, opt = {}) {
  const P = bigOf(key), [pot, vdy] = potView(potKey, opt);
  if (!P || !pot) return null;
  const m = P.meta, x = Math.round(bx - m.base[0]), y = Math.round(by - vdy - m.base[1]), t = Math.max(0, (opt.t || 0) + (opt.phase || 0));
  let f = frameAt(t, m.frameMs, m.frames);
  if (m.blinkIndex != null && f >= m.blinkAt && f < m.blinkAt + 4 && blinkLoop(key, Math.floor(t / (m.frames * m.frameMs)))) f = m.blinkIndex + f - m.blinkAt;
  const sx = (f % m.cols) * m.w, sy = Math.floor(f / m.cols) * m.h, B = bareSet(P);
  if (!layerCv) { layerCv = document.createElement('canvas'); layerCx = layerCv.getContext('2d', { willReadFrequently: true }); }
  if (layerCv.width !== m.w || layerCv.height !== m.h) { layerCv.width = m.w; layerCv.height = m.h; }
  const c = layerCx; c.imageSmoothingEnabled = false; c.clearRect(0, 0, m.w, m.h);
  c.globalCompositeOperation = 'source-over'; c.drawImage(B.sheet, sx, sy, m.w, m.h, 0, 0, m.w, m.h);
  c.globalCompositeOperation = 'destination-out'; c.drawImage(pot.front, 0, 0, m.w, m.h, 0, 0, m.w, m.h);
  c.globalCompositeOperation = 'source-over'; c.drawImage(B.sheet, sx, sy + m.rows * m.h, m.w, m.h, 0, 0, m.w, m.h);
  return { img: c.getImageData(0, 0, m.w, m.h), x, y, w: m.w, h: m.h, flip: !!opt.flip };
}
// 큰 판 한 장 고르기(숨쉬기 + 깜빡임)
function bigFrame(key, m, t) {
  let f = frameAt(t, m.frameMs, m.frames);
  if (m.blinkIndex != null && f >= m.blinkAt && f < m.blinkAt + 4 && blinkLoop(key, Math.floor(t / (m.frames * m.frameMs)))) f = m.blinkIndex + f - m.blinkAt;
  return [(f % m.cols) * m.w, Math.floor(f / m.cols) * m.h];
}
// 잔디에 심긴 큰 판 식물(화분 없이, 양육 스마트팜): (bx, by) = 흙 줄 가운데. 흙 줄 아래는 안 그림 — 밑동 흙 자리(식물 뒤) → 뒤 층 → 앞 풀잎 → between → 앞 층
//  흙 자리 · 풀잎 = 화분과 같은 것(art/potgrass.js bedOf — 2026-10-17 사용자 "풀도 더 자연스럽게 · 흙이나 자갈 등으로 자연스러운 경계"), 흙 덮기 띠는 갈색 흙으로(dirtOf)
export function drawBigPlanted(g, key, bx, by, opt = {}) {
  const P = bigOf(key); if (!P) return false;
  //  화분에 앉힌 칸(m.sink — 굵은 밑동이 화분 흙에 묻히게 내린 만큼)은 잔디에선 다시 올림: 안 올리면 밑동이 잘려 움푹 파인 듯 · 뒤에 놓인 듯 보였음(2026-10-17 사용자 "스마트팜에서 불 선인장 밑동이 움푹 파여 있고 뒤에 배치된 것 같아")
  const m = P.meta, x = Math.round(bx - m.soil[0]), y = Math.round(by - m.soil[1] - (m.sink || 0)), [sx, sy] = bigFrame(key, m, Math.max(0, (opt.t || 0) + (opt.phase || 0)));
  const cut = Math.round(by) - y, bed = bedOf(P, key), D = dirtSheet(P), ry = y + (m.sink || 0);   // 흙 자리는 흙 줄에(잔디 판은 앉힌 만큼 올려 그리므로 그만큼 내려 그림)
  if (bed) part(g, bed.ring, 0, 0, 96, 112, x, ry, false);
  g.clip(x, y, m.w, cut, () => part(g, D, sx, sy, m.w, m.h, x, y, false));
  if (bed) part(g, bed.front, 0, 0, 96, 112, x, ry, false);
  if (opt.between) opt.between();
  g.clip(x, y, m.w, cut + 2, () => part(g, D, sx, sy + m.rows * m.h, m.w, m.h, x, y, false));
  return true;
}
// 화분째 큰 판 식물: (bx, by) = 화분 흙 줄 가운데. between = 흙 위 잔디 마개 등 — 식물 뒤에(capUnder — 몸통이 넓은 선인장 · 버섯도 마개에 묻혀 '얹힌' 듯 보이지 않게, 2026-10-16 사용자 "불 선인장이 화분의 중앙이 아닌 다른 곳에")
//  reveal(0~1) = 흙에서 위로 자라 나오는 만큼(심기 연출)
export function drawBigPotted(g, key, potKey, bx, by, opt = {}) {
  const P = bigOf(key), pot = POT_BIG[potKey] || POT_BIG.pot_terra; if (!pot) return false;
  const m = P ? P.meta : { w: 96, h: 112, soil: [48, 75.7] }, x = Math.round(bx - m.soil[0]), y = Math.round(by - m.soil[1]);
  const rv = opt.reveal == null ? 1 : Math.max(0, Math.min(1, opt.reveal)), cy = y + Math.round(m.soil[1] * (1 - rv)), plant = fn => (rv >= 1 ? fn() : g.clip(x, cy, m.w, m.h, fn));
  part(g, pot.back, 0, 0, 96, 112, x, y, false);
  const gr = grassBack(g, P, key, pot.back, x, y, false);
  if (opt.between && opt.capUnder) opt.between(x, y);
  let sx = 0, sy = 0; const B = P && bareSet(P); if (P && rv > 0) { [sx, sy] = bigFrame(key, m, Math.max(0, (opt.t || 0) + (opt.phase || 0))); plant(() => part(g, B.sheet, sx, sy, m.w, m.h, x, y, false)); }
  if (P && rv > 0) grassFront(g, gr, x, y, false);
  if (opt.between && !opt.capUnder) opt.between(x, y);
  part(g, pot.front, 0, 0, 96, 112, x, y, false);
  if (P && rv > 0) plant(() => part(g, B.sheet, sx, sy + m.rows * m.h, m.w, m.h, x, y, false));
  return true;
}
// 몸놀림을 준 큰 판 식물(전투 공격·피격): 흙 위 몸만 기울인다 — 흙 높이 0 → 맨 위 1만큼 (qx, qy)칸(그림 좌표, 뒤집기 전),
//  sq = 눌림(+ = 흙 줄 기준 세로로 줄어듦, − = 늘어남). 화분은 그대로라 밑동은 흙에 박힌 채(영상 굽기 attackField 의 근사).
export function drawBigPose(g, key, potKey, bx, by, opt = {}) {
  const P = bigOf(key), [pot, vdy] = potView(potKey, opt);
  if (!P || !pot || (!opt.qx && !opt.qy && !opt.sq)) return drawBig(g, key, potKey, bx, by, opt);
  by -= vdy;
  const m = P.meta, x = Math.round(bx - m.base[0]), y = Math.round(by - m.base[1]), t = Math.max(0, (opt.t || 0) + (opt.phase || 0));
  const f = frameAt(t, m.frameMs, m.frames), sx = (f % m.cols) * m.w, sy = Math.floor(f / m.cols) * m.h;
  const B = bareSet(P), src = opt.flash ? B.white : B.sheet, fl = !!opt.flip, soil = m.soil[1], sc = 1 - (opt.sq || 0) * 0.03, qx = opt.qx || 0, qy = opt.qy || 0;
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
  const gr = grassBack(g, P, key, pot.back, x, y, fl);
  rows(sy);
  grassFront(g, gr, x, y, fl);
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
  const P = bigOf(key); if (!P) return null;
  const m = P.meta, c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
  const x = c.getContext('2d'); x.drawImage(P.sheet, 0, 0, m.w, m.h, 0, 0, m.w, m.h); x.drawImage(P.sheet, 0, m.rows * m.h, m.w, m.h, 0, 0, m.w, m.h);
  const d = x.getImageData(0, 0, m.w, m.h).data;
  let t = m.h, b = -1, l = m.w, r = -1;
  for (let yy = 0; yy < m.h; yy++) for (let xx = 0; xx < m.w; xx++) if (d[(yy * m.w + xx) * 4 + 3] >= 128) { t = Math.min(t, yy); b = Math.max(b, yy); l = Math.min(l, xx); r = Math.max(r, xx); }
  const box = b < 0 ? null : [t, b, l, r];
  boxCache.set(key, box); return box;
}
