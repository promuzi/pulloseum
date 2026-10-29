// 전투 기술 카드(2026-10-16 사용자 "전투시 스킬도 뭔가 세로로 긴 카드 느낌 — 꾹 누르면 뒷면으로 가까이 앞으로 가져오는 느낌, 뒷면에 상세"
//  → "카드 디자인이 너무 별로임 예쁘게 해봐. 자료 참고해서").
//  참고: Marvel Snap(그림이 주인공 · 비용 = 왼쪽 위 파란 원 · 위력 = 오른쪽 위 주황 원 · 글은 최소), Balatro(도트 카드 · 굵은 먹선 테 · 그림자 · 고르면 떠오르고
//   금빛 · 특별할 때 비스듬한 빛 띠가 스침), 카드 틀 관례(틀 색 = 종류·속성, 보석은 모서리, 이름 띠는 대비 높게).
//  앞면 = 속성 색 도톰한 금속 테(위·왼 밝게 · 아래·오른 어둡게) · 그림(코덱스 스킬 그림을 도트로 — 없으면 속성 빛 + 큰 아이콘 임시 그림) ·
//   이름 띠(그림 아래를 짙게 덮으며 이어짐) · 비용 마름모(전투 화면 MP와 같은 파랑, 모자라면 빨강) · 수치 표(오른쪽 위 — 공격 = 검 · 방어 = 방패 · 회피 · 보호막 · 회복, 버프는 비움 — statOf)
//  뒷면 = 같은 테 + 상세(등급 · 분류 · 사거리 · 위력 · 비용 · 걸리는 효과와 설명 · 지금 상대에게의 상성 · 못 쓰는 까닭)
//  꾹 누르기(battle.js) = 카드가 화면 가운데로 다가오며 커지고 원근 있게 뒤집힘 — 2D 캔버스라 세로 조각마다 깊이만큼 높이·간격을 줄여 3D 뒤집기를 흉내(drawFlip)
import { Gfx } from '../core/gfx.js';
import { wrap, wrapName, glyphH, sized } from '../core/text.js';
import { icon, tinted } from './icons.js';
import { ELEMENT, BAYER4 } from './palette.js';
import { rrect } from './ui.js';
import { STATUS, STATUS_DESC, BUFF_LOOK, fxChip, hexMix } from './statusLook.js';
import { CAT_ICON, CAT_NAME } from '../data/mock.js';
import { TIER_NAME, SKILLS, FORMS } from '../game/catalog.js';
import { FX, FRUIT } from '../battle/status.js';
import { RULES, guardDefMult } from '../battle/rules.js';

const C = { ink: '#0b1322', body: '#12294a', body2: '#183a62', plate: '#0c1e36', band: '#0c1526', text: '#eef4ff', sub: '#a9cdf0', dim: '#7396bb', line: '#8ccfff', gold: '#ffd890', good: '#ffd890' };
const GEM = { ok: ['#2d6fe0', '#9fd0ff', '#15347c'], bad: ['#c8392e', '#ff9e8e', '#5c1410'], off: ['#5b616e', '#a7adb8', '#2c3038'] };   // [속, 빛, 그늘]
const POW = ['#f08a24', '#ffd08a', '#7a320c'];
const NONE = { name: '무속성', main: '#8ea3c2', light: '#dfe8f5', dark: '#46566e' };
export const elOf = sk => (sk && ELEMENT[sk.el]) || NONE;
const BUFF_KEY = { purify: 'purified' };   // 기술의 self 이름 → 효과 표 이름
// 기본기 설명(battle/model.js BASICS 규칙 그대로)
const BASIC_DESC = {
  basic: ['누구나 쓰는 공짜 공격'],
  guard: ['순서와 상관없이 방어력 4배', '그 턴 모든 공격을 막음', '연속 사용하면 방어력 2.5배'],
  evade: ['먼저든 늦게든 성립', '상대 공격이 빗나갈 확률 +15', '스칠 확률 +10'],
};
export const LOCK_TEXT = { seal: '봉인되어 이번 턴 못 씀', taunt: '도발에 넘어가 공격 기술만 씀' };
const LOCK_SHORT = { seal: '봉인', taunt: '도발' };   // 카드 앞면(그림 위)
export const ART_W = 58, ART_H = 52;   // 그림 칸(논리 칸) — 코덱스 그림은 tools/pixel/big/bgconv.mjs --fit --w=58 --h=52 로 줄여 assets/v2/skills/<기술 id>.png

// ── 스킬 그림(코덱스 원화 → 도트). 없으면 임시 그림 ──
export const SKILLART = {};
// 2026-10-16 코덱스: 기본기 셋(모든 식물 공용) + 기술 그림(사용자 "남은 거 다해줘" — 91장 한 번에 요청 → 사용 한도로 두 번에 나눠 받음, 93개 다 있음). 기술이 새로 생기면 그림과 함께 여기에 id를 더함(없는 파일을 부르면 빠진 요청이 됨)
export const SKILLART_NAMES = ['basic', 'guard', 'evade', 'f_ember', 'f_rage', 'f_ball', 'f_pillar', 'f_storm', 'f_lava', 'w_gun', 'w_pure', 'w_cannon', 'w_tide', 'w_whirl', 'w_rain', 'g_leaf', 'g_photo', 'g_whip', 'g_venom', 'g_root', 'g_bomb', 'e_rock', 'e_hard', 'e_roll', 'e_quake', 'e_slide', 'e_wall', 'a_breeze', 'a_tail', 'a_twist', 'a_typhoon', 'a_vacuum', 'a_jet', 'b_static', 'b_charge', 'b_bolt', 'b_thunder', 'b_surge', 'b_chain', 'i_frost', 'i_shell', 'i_spear', 'i_blizzard', 'i_zero', 'j_scent', 'j_petals', 'j_wrap', 'j_lash', 'j_spines', 'j_needle', 'j_spore', 'j_cloud', 'br_sand', 'br_moss', 'br_bloom', 'br_trap', 'sp_leech', 'sp_root', 'sp_shade', 'sp_acid', 'u_petal_1', 'u_petal_2', 'u_petal_3', 'u_thorn_1', 'u_thorn_2', 'u_thorn_3', 'u_aqua_1', 'u_aqua_2', 'u_aqua_3', 'u_wind_1', 'u_wind_2', 'u_wind_3', 'u_spark_1', 'u_spark_2', 'u_spark_3', 'u_tide_1', 'u_tide_2', 'u_tide_3', 'u_ember_1', 'u_ember_2', 'u_ember_3', 'u_gaia_1', 'u_gaia_2', 'u_gaia_3', 'u_blaze_1', 'u_blaze_2', 'u_blaze_3', 'u_gale_1', 'u_gale_2', 'u_gale_3', 'u_gvine_1', 'u_gvine_2', 'u_gvine_3', 'u_spore_1', 'u_spore_2', 'u_spore_3', 'u_frost_1', 'u_frost_2', 'u_frost_3', 'u_volt_1', 'u_volt_2', 'u_volt_3', 'u_stone_1', 'u_stone_2', 'u_stone_3', 'u_jelly_1', 'u_jelly_2', 'u_jelly_3', 'n_fiber', 'n_wall', 'n_vacuole', 'n_tropism', 'n_target', 'n_chloro', 'n_spine', 'n_balance', 'v_sap', 'v_digest', 'v_jaw', 'v_forge', 'v_ammo', 'v_edge', 'v_venom', 'v_acid', 'v_antidote', 'v_mycel', 'v_spread', 'v_rot', 'v_scale', 'v_regen', 'v_wrath', 'm_bite', 'm_devour', 'm_hunt', 'm_slash', 'm_shot', 'm_smash', 'm_spit', 'm_acid', 'm_miasma', 'm_puff', 'm_sleep', 'm_bloom', 'm_breath', 'm_scale', 'm_roar', 'm_flame', 'm_spear', 'm_burrow', 'm_maw', 'm_bile', 'm_ivy', 'm_gust', 'm_frostclaw', 'm_voltclaw', 'u_fang_1', 'u_fang_2', 'u_fang_3', 'u_blade_1', 'u_blade_2', 'u_blade_3', 'u_toxi_1', 'u_toxi_2', 'u_toxi_3', 'u_draco_1', 'u_draco_2', 'u_draco_3', 'u_emcap_1', 'u_emcap_2', 'u_emcap_3', 'u_drake_1', 'u_drake_2', 'u_drake_3', 'u_fdrake_1', 'u_fdrake_2', 'u_fdrake_3', 'u_gat_1', 'u_gat_2', 'u_gat_3', 'u_tal_1', 'u_tal_2', 'u_tal_3', 'u_drum_1', 'u_drum_2', 'u_drum_3', 'u_lamp_1', 'u_lamp_2', 'u_lamp_3', 'u_jar_1', 'u_jar_2', 'u_jar_3', 'u_dok_1', 'u_dok_2', 'u_dok_3', 'u_crown_1', 'u_crown_2', 'u_crown_3', 'u_draco_2b', 'u_draco_3b', 'u_draco_3c', 'u_fdrake_2b', 'u_fdrake_3b', 'u_fdrake_3c', 'u_petal_2b', 'u_petal_3b', 'u_petal_3c', 'u_thorn_2b', 'u_thorn_3b', 'u_thorn_3c', 'u_aqua_2b', 'u_aqua_3b', 'u_aqua_3c', 'u_wind_2b', 'u_wind_3b', 'u_wind_3c', 'u_spark_2b', 'u_spark_3b', 'u_spark_3c', 'u_tide_2b', 'u_tide_3b', 'u_tide_3c', 'u_ember_2b', 'u_ember_3b', 'u_ember_3c', 'u_gaia_2b', 'u_gaia_3b', 'u_gaia_3c', 'u_blaze_2b', 'u_blaze_3b', 'u_blaze_3c', 'u_gale_2b', 'u_gale_3b', 'u_gale_3c', 'u_gvine_2b', 'u_gvine_3b', 'u_gvine_3c', 'u_spore_2b', 'u_spore_3b', 'u_spore_3c', 'u_frost_2b', 'u_frost_3b', 'u_frost_3c', 'u_volt_2b', 'u_volt_3b', 'u_volt_3c', 'u_stone_2b', 'u_stone_3b', 'u_stone_3c', 'u_jelly_2b', 'u_jelly_3b', 'u_jelly_3c', 'u_fang_2b', 'u_fang_3b', 'u_fang_3c', 'u_blade_2b', 'u_blade_3b', 'u_blade_3c', 'u_toxi_2b', 'u_toxi_3b', 'u_toxi_3c', 'u_emcap_2b', 'u_emcap_3b', 'u_emcap_3c', 'u_drake_2b', 'u_drake_3b', 'u_drake_3c', 'u_gat_2b', 'u_gat_3b', 'u_gat_3c', 'u_tal_2b', 'u_tal_3b', 'u_tal_3c', 'u_drum_2b', 'u_drum_3b', 'u_drum_3c', 'u_lamp_2b', 'u_lamp_3b', 'u_lamp_3c', 'u_jar_2b', 'u_jar_3b', 'u_jar_3c', 'u_dok_2b', 'u_dok_3b', 'u_dok_3c', 'u_crown_2b', 'u_crown_3b', 'u_crown_3c', 'm_flamer', 'm_rocket', 'm_xbow', 'u_gladi_1', 'u_gladi_2', 'u_gladi_2b', 'u_gladi_3', 'u_gladi_3b', 'u_gladi_3c', 'u_jang_1', 'u_jang_2', 'u_jang_2b', 'u_jang_3', 'u_jang_3b', 'u_jang_3c', 'u_astro_1', 'u_astro_2', 'u_astro_2b', 'u_astro_3', 'u_astro_3b', 'u_astro_3c', 'u_viking_1', 'u_viking_2', 'u_viking_2b', 'u_viking_3', 'u_viking_3b', 'u_viking_3c', 'u_hyunmu_1', 'u_hyunmu_2', 'u_hyunmu_2b', 'u_hyunmu_3', 'u_hyunmu_3b', 'u_hyunmu_3c', 'u_gumiho_1', 'u_gumiho_2', 'u_gumiho_2b', 'u_gumiho_3', 'u_gumiho_3b', 'u_gumiho_3c', 'u_wizard_1', 'u_wizard_2', 'u_wizard_2b', 'u_wizard_3', 'u_wizard_3b', 'u_wizard_3c', 'u_ninja_1', 'u_ninja_2', 'u_ninja_2b', 'u_ninja_3', 'u_ninja_3b', 'u_ninja_3c', 'u_haenyeo_1', 'u_haenyeo_2', 'u_haenyeo_2b', 'u_haenyeo_3', 'u_haenyeo_3b', 'u_haenyeo_3c', 'u_aqua_3d'];
const NAME_ID = Object.fromEntries(Object.entries(SKILLS).map(([id, s]) => [s.name, id]));   // 시험판 기술(model.js s1·s2)도 이름으로 그림을 찾음
const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
export async function loadSkillArt(base = '../assets/v2/skills/') {
  const got = await Promise.all(SKILLART_NAMES.map(n => load(base + n + '.png')));
  SKILLART_NAMES.forEach((n, i) => { if (got[i]) SKILLART[n] = got[i]; });
  return SKILLART_NAMES.filter(n => !SKILLART[n]);
}
const ART_ALIAS = { sun: 'g_photo' };   // 기본기 광합성(2026-10-18) = 옛 광합성 그림
const artOf = sk => SKILLART[sk.id] || SKILLART[sk.artId] || SKILLART[ART_ALIAS[sk.id]] || SKILLART[NAME_ID[sk.name]] || null;   // artId = 강화 카드(+1 · +2)의 처음 카드 그림

// 그림 창의 큰 아이콘: 거는 효과 > 내 버프 > (공격 아닌) 분류 > 속성 > 칼
function artIcon(sk) {
  if (sk.passive && sk.icon) return sk.icon;   // 패시브 카드(game/cards.js)
  const f = sk.inflict && STATUS[sk.inflict.id];
  if (f && f.icon) return f.icon;
  const b = sk.self && STATUS[BUFF_KEY[sk.self] || sk.self];
  if (b && b.icon) return b.icon;
  const cat = (sk.cats && sk.cats[0]) || 'attack';
  if (cat !== 'attack') return CAT_ICON[cat] || 'sword';
  return sk.el && icon(sk.el) ? sk.el : 'sword';
}
// 임시 그림(58×52 도트, 한 번 굽고 재사용): 속성 빛이 가운데서 번지는 배경(디더 네 단) + 옅은 빛살 + 큰 아이콘(먹선 · 그림자) + 반짝이
const hexRgb = h => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const tempArt = new Map();
function placeholderArt(sk) {
  const name = artIcon(sk), look = sk.passive && sk.look, key = (sk.el || '-') + '|' + name + (look ? '|' + look.col : '');
  let cv = tempArt.get(key); if (cv) return cv;
  const E = look ? { main: look.col, light: look.light, dark: hexMix(look.col, '#0b1322', 0.55) } : elOf(sk), W = ART_W, H = ART_H;
  cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), id = c.createImageData(W, H), d = id.data;
  const steps = [E.light, hexMix(E.light, E.main, 0.55), E.main, hexMix(E.main, E.dark, 0.5), E.dark, hexMix(E.dark, '#0b1322', 0.45)].map(hexRgb);
  const cx = W / 2, cy = H * 0.46, R = Math.hypot(W / 2, H / 2) * 0.95;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy) / R, a = Math.atan2(dy, dx);
    const ray = Math.cos(a * 8) > 0.82 ? -0.35 : 0;   // 빛살 여덟(조금 밝게)
    let t = Math.max(0, Math.min(steps.length - 1.001, (r * 1.15 + ray * (1 - r)) * (steps.length - 1)));
    const i0 = Math.floor(t), f = t - i0, pick = BAYER4[y & 3][x & 3] / 16 < f ? i0 + 1 : i0, col = steps[pick], k = (y * W + x) * 4;
    d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
  }
  c.putImageData(id, 0, 0);
  const ic = icon(name);
  if (ic) {
    const s = 3, iw = ic.width * s, ih = ic.height * s, ix = Math.round((W - iw) / 2), iy = Math.round((H - ih) / 2) - 1, ink = tinted(name, '#0b1322');
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 0.45; c.drawImage(ink, ix + 3, iy + 3, iw, ih); c.globalAlpha = 1;   // 그림자
    for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.drawImage(ink, ix + ox, iy + oy, iw, ih);   // 먹선
    c.drawImage(ic, ix, iy, iw, ih);
  }
  c.fillStyle = '#ffffff';
  for (const [sx, sy] of [[9, 9], [W - 11, 13], [12, H - 15], [W - 9, H - 18]]) { c.globalAlpha = 0.85; c.fillRect(sx, sy, 1, 1); c.globalAlpha = 0.45; c.fillRect(sx - 1, sy, 3, 1); c.fillRect(sx, sy - 1, 1, 3); }
  c.globalAlpha = 1;
  tempArt.set(key, cv); return cv;
}

// 테: 먹선 → 속성 색 금속 테 2칸(위·왼 빛 · 아래·오른 그늘) → 안쪽 먹선. 고른 카드 = 금빛 테
const frameCols = (sk, lit) => (lit ? ['#ffd890', '#fff3c8', '#b8852e'] : sk.form && FORMS[sk.form] ? [FORMS[sk.form].col, FORMS[sk.form].light, hexMix(FORMS[sk.form].col, C.ink, 0.5)]   // 변이 기술 = 변이 색 테
  : sk.passive && sk.look && sk.lv >= 2 ? (sk.lv >= 3 ? ['#d8a03a', '#fff3c8', '#8a5a1a'] : ['#c8d4e4', '#ffffff', '#5a6a84'])   // 강화 패시브 = +1 은빛 · +2 금빛 테(2026-10-22)
  : sk.passive && sk.look ? [sk.look.col, sk.look.light, hexMix(sk.look.col, C.ink, 0.5)]   // 일반 카드 = 하늘색 테
  : sk.el ? [elOf(sk).main, hexMix(elOf(sk).light, '#ffffff', 0.3), elOf(sk).dark] : ['#9fb0c8', '#e6eef8', '#4c5a70']);
// 모서리를 c칸 비스듬히 자른 네모 채우기(변이 카드 테)
function cham(g, x, y, w, h, c, col) {
  for (let i = 0; i < c; i++) { g.rect(x + c - i, y + i, w - 2 * (c - i), 1, col); g.rect(x + c - i, y + h - 1 - i, w - 2 * (c - i), 1, col); }
  g.rect(x, y + c, w, h - 2 * c, col);
}
function cardFrame(g, x, y, w, h, sk, lit) {
  const [mid, hi, lo] = frameCols(sk, lit), F = sk.form && FORMS[sk.form];
  if (F) {   // 변이 카드(2026-10-17 사용자 "변이스킬이나 그 외 스킬 카드 테두리 차이가 있으면"): 둥근 테 대신 모서리를 자른 각진 갑옷 테 + 비스듬한 빛 · 그늘 + 모서리 징
    cham(g, x, y, w, h, 6, C.ink);
    cham(g, x + 1, y + 1, w - 2, h - 2, 5, mid);
    g.rect(x + 7, y + 1, w - 14, 1, hi); g.rect(x + 1, y + 7, 1, h - 14, hi);
    g.rect(x + 7, y + h - 2, w - 14, 1, lo); g.rect(x + w - 2, y + 7, 1, h - 14, lo);
    for (let i = 0; i < 5; i++) { g.px(x + 1 + i, y + 6 - i, hi); g.px(x + w - 2 - i, y + h - 7 + i, lo); }
    cham(g, x + 3, y + 3, w - 6, h - 6, 3, C.ink);
    for (const [px, py] of [[x + 6, y + 2], [x + w - 7, y + 2], [x + 6, y + h - 3], [x + w - 7, y + h - 3], [x + 2, y + 6], [x + w - 3, y + 6], [x + 2, y + h - 7], [x + w - 3, y + h - 7]]) g.px(px, py, lit ? '#fff3c8' : F.light);
    return;
  }
  rrect(g, x, y, w, h, 5, C.ink);
  rrect(g, x + 1, y + 1, w - 2, h - 2, 4, mid);
  g.rect(x + 4, y + 1, w - 8, 1, hi); g.rect(x + 1, y + 4, 1, h - 8, hi);   // 위·왼 빛
  g.rect(x + 4, y + h - 2, w - 8, 1, lo); g.rect(x + w - 2, y + 4, 1, h - 8, lo);   // 아래·오른 그늘
  rrect(g, x + 3, y + 3, w - 6, h - 6, 2, C.ink);
  kindMarks(g, x, y, w, h, sk, mid);
}
// 패시브 카드 = 테에 점선(우표처럼 — 기술 카드와 갈림, 2026-10-22). 테 아래 가운데 등급 보석 · 점(개성 금 · 가지 · 특수 청록 · 중급 하늘 점 · 상급 보라 점 둘)은
//  2026-10-29 사용자 '아래 표시가 직관적이지 않아' → '빼자'로 지움 — 등급은 꾹 눌러 보는 뒷면 첫 줄 글(예: '개성 · 공격 · 근접 · 불 속성')로
//  (변이 카드 = 각진 갑옷 테 · 강화 패시브 = 은빛 · 금빛 테는 frameCols)
function kindMarks(g, x, y, w, h, sk, mid) {
  if (!sk.passive) return;
  const dc = hexMix(mid, '#ffffff', 0.6);
  for (let i = x + 7; i < x + w - 7; i += 3) { g.px(i, y + 2, dc); g.px(i, y + h - 3, dc); }
  for (let j = y + 7; j < y + h - 7; j += 3) { g.px(x + 2, j, dc); g.px(x + w - 3, j, dc); }
}
// 해(비용 = 햇빛 에너지 — 2026-10-17 사용자 "카드 왼쪽 상단 mp 소모량 숫자가 너무 작아 · 그 아이콘을 해 모양으로"): 먹선 원판 + 빛살 여덟(십자 = 굵게 · 대각선 = 점)
//  색 = [속, 빛, 그늘] — ok 금빛 · bad(에너지 모자람) 주황빛 빨강 · off(못 씀) 회색. 빛살 끝 = 반지름 r + 3
export const SUN = { ok: ['#ffb627', '#fff3b8', '#c96a10'], bad: ['#ff6a3a', '#ffd2b8', '#9a2a14'], off: ['#7d8290', '#c3c7d0', '#3e424c'] };
export function sunDisc(g, cx, cy, r, [fill, hi, lo]) {
  const R = r + 3, q = Math.round((r + 1) * 0.74);
  const rays = (col, e) => {   // e = 1(먹선 — 한 칸 두껍게) · 0(속)
    for (let d = r - 1; d <= R + e; d++) {
      const hw = (d <= r + 1 ? 1 : 0) + e;
      g.rect(cx - hw, cy - d, 2 * hw + 1, 1, col); g.rect(cx - hw, cy + d, 2 * hw + 1, 1, col);
      g.rect(cx - d, cy - hw, 1, 2 * hw + 1, col); g.rect(cx + d, cy - hw, 1, 2 * hw + 1, col);
    }
    for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) g.rect(cx + sx * q - (sx < 0 ? 1 : 0) - e, cy + sy * q - (sy < 0 ? 1 : 0) - e, 2 + 2 * e, 2 + 2 * e, col);
  };
  rays(C.ink, 1); g.disc(cx, cy, r + 1, C.ink);
  rays(hexMix(fill, hi, 0.35), 0); g.disc(cx, cy, r, lo); g.disc(cx, cy - 1, r - 1, fill);
  g.disc(cx - Math.round(r * 0.3), cy - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.4)), hexMix(fill, hi, 0.55));
}
// 마름모(비용 보석): (cx, cy) 가운데, r = 반지름
function diamond(g, cx, cy, r, [fill, hi, lo]) {
  for (let dy = -r - 1; dy <= r + 1; dy++) { const hw = r + 1 - Math.abs(dy); g.rect(cx - hw, cy + dy, hw * 2 + 1, 1, C.ink); }
  for (let dy = -r; dy <= r; dy++) { const hw = r - Math.abs(dy); g.rect(cx - hw, cy + dy, hw * 2 + 1, 1, dy < 0 ? hexMix(fill, hi, 0.25) : fill); }
  for (let k = 0; k < r; k++) { g.px(cx - r + k, cy - k, hi); g.px(cx + k + 1, cy + r - k - 1, lo); }   // 왼쪽 위 빛줄 · 오른쪽 아래 그늘줄
}

// ── 오른쪽 위 수치 표(2026-10-16 사용자 "방어 공격 회피 등 주요 능력치 아이콘 — %는 %, 고정값이면 그냥 숫자 · 공격은 검 아이콘 위에 숫자 · 방어는 방패 모양에 숫자 · 버프나 디버프 등은 비워 놔") ──
//  공격 = 검(위력 그대로 — 상대에게 얼마나 들어갈지는 써 보며 상대 방어를 가늠) · 방어 = 방패(막는 몫 %) · 회피 = 빗나감 +% · 보호막 · 회복 = 최대 체력의 %
//  수는 규칙에서 그대로: 방어태세 guardDefMult(방어 배율) · 회피 자세 shift.miss · 철벽 · 보호막 · 재생(FX). 분노 · 가속 · 집중 · 반사 · 정화 = 비움
const pct = v => Math.round(v * 100) + '%';
export function statOf(sk, o = {}) {
  if (!sk) return null;
  if (sk.passive) { const L = sk.look || {}; return sk.badge ? { kind: 'pill', txt: sk.badge[0], icon: null, col: [hexMix(L.col || '#5fb3d9', C.ink, 0.25), L.light || '#d8f2ff', hexMix(L.col || '#5fb3d9', C.ink, 0.6)], label: '효과' } : null; }
  if (sk.act === 'attack') { if (!sk.power) return null; const pw = sk.area ? Math.round(sk.power * RULES.areaK) : sk.power; return { kind: sk.area ? 'bomb' : 'pow', txt: sk.hits > 1 ? `${pw}×${sk.hits}` : String(pw), label: sk.hits > 1 ? '위력 × 타' : '위력' }; }   // 연타 = 한 타 위력 × 타 수(2026-10-18)   // 광역 = 확정 명중 대신 위력 areaK배(2026-10-18)   // 광역 = 폭탄(사용자 "광역은 검 대신 폭탄 아이콘")
  const half = !!o.halved, k = half ? RULES.repeatStanceK : 1;   // 바로 전 턴에도 같은 자세 = 효과 절반(rules.js) — 두 번째에만 바뀐 수 · 주황
  if (sk.act === 'guard') return { kind: 'block', txt: '×' + guardDefMult(sk, half), label: '방어력', half };
  if (sk.act === 'evade') return sk.shift && sk.shift.miss ? { kind: 'dodge', txt: Math.round(sk.shift.miss * k) + '%', label: '회피', half } : null;
  for (const b of [sk.self, sk.also]) {   // 버프 기술은 주 효과(self)부터 수가 있는 것 하나
    if (b === 'defUp') return { kind: 'block', txt: '+' + pct(FX.defUp.v), label: '방어' };   // 억셈 = 방어 +%
    if (b === 'shield') return { kind: 'barrier', txt: pct(FX.shield.hp), label: '보호막' };
    if (b === 'armor') return { kind: 'barrier', txt: pct(FX.armor.hp), label: '방어구' };
    if (b === 'regen') return { kind: 'heal', txt: pct(FX.regen.heal * FX.regen.turns), label: '회복' };
  }
  return null;
}
const BADGE = {   // [속, 빛, 그늘] — 빛 = 연타 ×N 글자색
  pow: { icon: 'sword', col: ['#b83a22', '#ffb08a', '#5a1a10'] }, block: { icon: 'shield', col: ['#56677e', '#d8e2ee', '#2c3646'] },
  bomb: { icon: 'bomb', col: POW },                                       // 광역 공격 = 폭탄 + 주황(공격 쪽 색)
  dodge: { icon: 'evade', col: ['#0b8a8f', '#30e1b9', '#0b5e65'] },     // 회피 = 잎이 흰 바람 줄을 달고 휙 비켜 감(icons.js evade — 전 = 빨리 감기 꺾쇠)
  barrier: { icon: 'fx_barrier', col: ['#4d9be6', '#8fd3ff', '#4d65b4'] },  // 보호막 = 새싹을 감싼 물방울 막(효과 칩과 같은 그림 — tools/pixel/big/fx_barrier_bubble.py · 전 = 얼음 눈꽃 · 전투의 둥근 막과 같은 뜻)
  heal: { icon: 'heal', col: ['#239063', '#91db69', '#165a4c'] },       // 초록
};
const WARM = ['#8a5a24', '#ffd890', '#a8743a'];   // 절반이 된 자세(주황 — 바뀐 걸 알게)
// 오른쪽 위 수치(내용 = 2026-10-16 사용자 '%는 %, 고정값이면 그냥 숫자 · 공격은 검 · 방어는 방패 · 버프나 디버프 등은 비워 놔' 그대로):
//  모양 = 2026-10-29 사용자가 고른 시안 ㉡ '바탕 없이' — 종류 아이콘(먹선 1칸) + 큰 숫자(먹선 3칸)만, 연타 ×N은 작게. 왼쪽 해에 닿을 만큼 길면 글자를 한 칸씩 줄임(maxW)
//  전 = 검(가로 · 날 위 숫자 · 끝이 화살표처럼 뾰족) · 방패 · 알약 · 폭탄 + 알약 네 모양이 섞이고 '35×3' · '+50%'가 그림을 넓게 가렸음. 버린 시안 = 한 모양 꼬리표 ㉠ · 동전(결정 로그)
const splitHits = txt => { const m = /^(.+?)(×\d+)$/.exec(txt); return m && !txt.startsWith('×') ? [m[1], m[2]] : [txt, null]; };   // '35×3' → ['35', '×3'] · 방어 '×4'는 그대로
// xr = 오른쪽 끝(이 칸 앞까지), cy = 가운데 줄(비용 숫자와 같은 줄), maxW = 왼쪽 해 오른쪽 끝까지 너비
function statBadge(g, xr, cy, st, dim, maxW = 42) {
  if (!st) return;
  const B = BADGE[st.kind] || { icon: st.icon, col: st.col }, hi = (dim ? GEM.off : st.half ? WARM : st.col || B.col || GEM.off)[1];
  const [main, sub] = splitHits(st.txt), SUB = sized('bold', 9), ic = B.icon || null, im = ic && icon(ic), sw = sub ? g.textW(sub, SUB) + 1 : 0, iw = im ? im.width + 1 : 0;
  const font = ['value', 'bold', sized('bold', 10)].find(k => 1 + g.textW(main, k) + sw + iw <= maxW) || sized('bold', 10), gh = glyphH(font);
  const mw = g.textW(main, font), x = Math.round(xr - 1 - mw - sw - iw);
  g.c.imageSmoothingEnabled = false;
  if (im) g.alpha(dim ? 0.55 : 1, () => { const L = Math.floor(im.height / 2); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.img(tinted(ic, C.ink), x + dx, cy - L + dy); g.img(im, x, cy - L); });   // 아이콘 둘레 먹선 1칸
  g.text(main, x + iw, cy - Math.round(gh / 2), { font, color: dim ? '#c3c7d0' : '#ffffff', outline: C.ink, outlineW: 3 });
  if (sub) g.text(sub, x + iw + mw + 1, cy - Math.round(gh / 2) + 4, { font: SUB, color: hi, outline: C.ink, outlineW: 2 });
}

// 카드 이름 두 줄(2026-10-29 사용자 '검방술의 경우 )가 아랫줄로 밀림'): wrapName으로 끊고, 띄어쓰기가 있는 이름이 두 줄에 안 들어가 단어 가운데서 끊기면
//  글자를 한 칸씩 줄여 다시(11 → 10 → 9 — '예로부터 매가 약이었죠.'). 셋 다 안 되면 11칸 글자 사이 끊기 그대로
function nameLines(name, maxW) {
  for (const sz of [11, 10, 9]) {
    const font = sz === 11 ? 'bold' : sized('bold', sz), lines = wrapName(name, font, maxW);
    if (lines.length <= 2 && !lines.split) return { lines, font, lh: sz + 1 };
  }
  return { lines: wrapName(name, 'bold', maxW).slice(0, 2), font: 'bold', lh: 12 };
}
// 앞면(손패 크기 w×h, 논리 칸 — 지금 66×90). o = { can(쓸 수 있나), short(에너지가 모자라나), lit(고름), lock, shine(0~1 빛 띠) }
export function cardFront(g, x, y, w, h, sk, o = {}) {
  x |= 0; y |= 0;
  const c = g.c, ax = x + 4, ay = y + 4, aw = w - 8, ah = ART_H, dim = o.can === false;
  cardFrame(g, x, y, w, h, sk, o.lit);
  c.imageSmoothingEnabled = false;
  { const im = artOf(sk) || placeholderArt(sk), sw = Math.min(aw, im.width);   // 좁은 카드(손패 한 줄 넷)는 그림 가운데를 잘라 1배 그대로(줄이면 도트가 뭉개짐)
    c.drawImage(im, Math.floor((im.width - sw) / 2), 0, sw, im.height, ax + Math.floor((aw - sw) / 2), ay, sw, ah); }
  // 이름 띠: 그림 아래 열 칸을 짙게 덮으며 이어지고, 위에 테 색 가는 줄
  const by = ay + ah, bh = y + h - 4 - by, gr = c.createLinearGradient(0, by - 12, 0, by);
  gr.addColorStop(0, 'rgba(12,21,38,0)'); gr.addColorStop(1, 'rgba(12,21,38,0.92)');
  c.fillStyle = gr; c.fillRect(ax, by - 12, aw, 12);
  const MF = sk.form && FORMS[sk.form], band = MF ? hexMix(MF.col, C.band, 0.72) : C.band;   // 변이 카드 = 이름 띠도 변이 색으로 물듦
  g.rect(ax, by, aw, bh, band);
  g.rect(ax, by, aw, 1, MF ? MF.light : sk.tier === 'u' && !sk.passive ? '#e0a830' : hexMix(frameCols(sk, o.lit)[0], C.band, 0.45));   // 개성 기술 = 금빛 줄(2026-10-22)
  if (MF) {   // 테 위 가운데 변이 문장(아래로 뾰족한 작은 깃발 + 빛 점)
    const cx = x + (w >> 1), [fm, fh] = frameCols(sk, o.lit);
    for (const [dy, hw] of [[-1, 7], [0, 7], [1, 7], [2, 7], [3, 6], [4, 4], [5, 2]]) g.rect(cx - hw, y + dy, hw * 2, 1, C.ink);
    for (const [dy, hw] of [[0, 6], [1, 6], [2, 6], [3, 5], [4, 3]]) g.rect(cx - hw, y + dy, hw * 2, 1, dy === 0 ? fh : fm);
    g.rect(cx - 1, y + 1, 2, 2, MF.light);
  }
  const { lines, font, lh } = nameLines(sk.name, aw - 4), gh = glyphH(font), ny = Math.round(by + 1 + (bh - 1 - (lines.length - 1) * lh - gh) / 2);
  lines.forEach((ln, i) => g.text(ln, x + w / 2, ny + i * lh, { font, color: C.text, align: 'center' }));
  if (o.shine != null && o.shine < 1) {   // 쓸 수 있게 된 순간: 비스듬한 빛 띠가 한 번 스침(Balatro 박 카드처럼)
    const p = o.shine, bx = ax - 16 + p * (aw + 32);
    c.save(); c.beginPath(); c.rect(ax, ay, aw, h - 8); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.32)';
    c.beginPath(); c.moveTo(bx, ay + h); c.lineTo(bx + 7, ay + h); c.lineTo(bx + 7 + h * 0.5, ay - 4); c.lineTo(bx + h * 0.5, ay - 4); c.closePath(); c.fill();
    c.restore();
  }
  // 속성 배지(2026-10-18 사용자 "카드가 어떤 속성인지 모르겠어" → 안 ①): 그림 왼쪽 아래 둥근 판 + 속성 아이콘(식물 이름 옆과 같은 그림) · 테 = 그 속성 색 —
  //  속성 없는 기본기(평타 · 방어 · 회피 · 광합성)와 패시브는 없음. 지금 상대에게 잘 듣는지는 뒷면(꾹)에 이미 있음
  if (sk.el && !sk.passive && ELEMENT[sk.el]) {
    const ic = icon(sk.el);
    if (ic) { const cx = ax + 8, cy = by - 8; g.disc(cx, cy, 7, C.ink); g.disc(cx, cy, 6, ELEMENT[sk.el].main); g.disc(cx, cy, 5, '#101a2e'); g.img(ic, cx - Math.floor(ic.width / 2), cy - Math.floor(ic.height / 2)); }
  }
  if (sk.passive && sk.lv > 1) upTag(g, ax + 2, by - 15, sk.lv, gh);   // 강화 카드(+1 · +2 — 2026-10-22): 그림 왼쪽 아래
  if (dim) rrect(g, x + 3, y + 3, w - 6, h - 6, 2, 'rgba(6,10,20,0.55)');
  // 비용 마름모(왼쪽 위) · 수치 표(오른쪽 위 — 검 · 방패 · 회피 · 보호막 · 회복, 버프는 비움)
  let leftR = 20;   // 왼쪽 위 표시의 오른쪽 끝(카드 왼쪽에서 몇 칸) — 오른쪽 위 수치가 여기까지 비켜 섬
  if (o.cd) leftR = cdDial(g, x, y, o.cd);   // 재사용 대기(블레이드바인 지옥전개 — 2026-10-29 사용자 'ㄱ으로 하자'): 비용 자리에 다시 쓸 수 있을 때까지 남은 턴 + 모래시계
  else if (sk.uses) leftR = usesDial(g, x, y, o.left != null ? o.left : sk.uses, sk.uses, FORMS[sk.form], dim);   // 변이 기술 = 에너지 대신 판마다 쓸 수 있는 횟수(전투 중 = 남은 횟수)
  else if (sk.passive) {   // 패시브 카드: 비용 대신 카드 색 마름모 + 반짝이
    const L = sk.look || {}, ic = icon('sparkle');
    diamond(g, x + 9, y + 9, 7, dim ? GEM.off : [hexMix(L.col || '#5fb3d9', C.ink, 0.2), L.light || '#d8f2ff', hexMix(L.col || '#5fb3d9', C.ink, 0.6)]);
    if (ic) g.img(tinted('sparkle', '#ffffff'), x + 9 - Math.floor(ic.width / 2), y + 9 - Math.floor(ic.height / 2));
  } else {   // 비용 = 해(햇빛 에너지) + 큰 숫자
    const vh = glyphH('value');
    sunDisc(g, x + 10, y + 10, 7, dim ? (o.short ? SUN.bad : SUN.off) : SUN.ok);
    g.text(String(sk.cost || 0), x + 10.5, y + 10 - Math.round(vh / 2), { font: 'value', color: '#ffffff', align: 'center', outline: dim ? C.ink : '#6a2c04', outlineW: 2 });
  }
  statBadge(g, x + w - 2, y + 9, statOf(sk, o), dim, w - 4 - leftR);   // 왼쪽 위 표시(해 · 보석 띠 · 모래시계) 오른쪽 끝 + 2칸까지
  cardMarks(g, x, y, w, sk, dim);
  if (o.left === 0) {   // 이번 판엔 다 씀: 그림 가운데 = '다 씀'
    const txt = '다 씀', tw = g.textW(txt, 'bold'), lx = Math.round(x + (w - tw) / 2), ly = Math.round(ay + (ah - 17) / 2);
    rrect(g, lx - 5, ly, tw + 10, 17, 4, 'rgba(6,10,20,0.88)');
    g.text(txt, lx, ly + Math.round((17 - gh) / 2), { font: 'bold', color: (FORMS[sk.form] || {}).light || '#ffffff' });
  }
  if (o.cd) {   // 재사용 대기: 그림 가운데 = 'N턴 뒤'(다시 쓸 수 있을 때까지 — '다 씀' · '봉인'과 같은 자리)
    const txt = `${o.cd}턴 뒤`, tw = g.textW(txt, 'bold'), lx = Math.round(x + (w - tw) / 2), ly = Math.round(ay + (ah - 17) / 2);
    rrect(g, lx - 5, ly, tw + 10, 17, 4, 'rgba(6,10,20,0.88)');
    g.text(txt, lx, ly + Math.round((17 - gh) / 2), { font: 'bold', color: '#ffe3a0' });
  }
  if (dim && o.lock) {   // 묶임 · 도발: 그림 가운데에 짧게(자세한 까닭은 뒷면)
    const L = STATUS[o.lock] || {}, li = L.icon && icon(L.icon), txt = LOCK_SHORT[o.lock] || '', tw = g.textW(txt, 'bold') + (li ? 14 : 0), lx = Math.round(x + (w - tw) / 2), ly = Math.round(ay + (ah - 15) / 2);
    rrect(g, lx - 4, ly, tw + 8, 15, 3, 'rgba(6,10,20,0.88)');
    if (li) g.img(li, lx, ly + 2);
    g.text(txt, lx + (li ? 14 : 0), ly + Math.round((15 - gh) / 2), { font: 'bold', color: L.col || '#ff8a8a' });
  }
}

// 덧표시(2026-10-16 사용자가 샘플을 보고 고름: "회복은 회복 아이콘만 아래에 — 수치는 꾹 눌러서" · "효과 겹수는 좋아" · 원거리 · 체력 글자 · 연속 미리 보기는 뺌)
function tag(g, xr, y, txt, col, ic) {   // 작은 꼬리표(오른쪽 끝 xr 맞춤): 짙은 속 + 글자(+ 아이콘)
  const im = ic && icon(ic), tw = g.textW(txt) + (im ? im.width + 2 : 0) + 6, x = Math.round(xr - tw);
  rrect(g, x, y, tw, 12, 3, 'rgba(6,10,20,0.86)');
  let cx = x + 3;
  if (im) { g.img(im, cx, y + 1); cx += im.width + 2; }
  g.text(txt, cx, y, { color: col });
  return x;
}
function cardMarks(g, x, y, w, sk, dim) {
  const xr = x + w - 3, artB = y + 4 + ART_H;
  if (sk.drain && sk.act === 'attack') { const im = icon('heal'); rrect(g, xr - 13, y + 18, 13, 13, 3, 'rgba(6,10,20,0.86)'); if (im) g.alpha(dim ? 0.55 : 1, () => g.img(im, xr - 11, y + 19)); }   // 흡수(때린 만큼 회복)
  if (sk.inflict && (sk.inflict.n || 1) > 1) { const L = STATUS[sk.inflict.id] || {}; tag(g, xr, artB - 14, '×' + sk.inflict.n, dim ? '#a7adb8' : (L.col || '#ffffff'), L.icon); }   // 걸리는 효과 겹 수
}
// 비용 자리의 다른 표시 둘(2026-10-29 사용자 '햇빛대신 빨간원이랑 검은 원은 뭐임?' → '두개도 다듬어봐' — 숫자 동그라미가 햇빛 비용처럼 읽혀 뜻을 몰랐음):
//  변이 기술 = 판마다 쓸 수 있는 횟수 → 변이 색 띠에 보석 칸(남은 칸 = 밝은 보석 · 쓴 칸 = 빈 홈) · 재사용 대기 = 또렷한 모래시계 + 남은 턴(+ 못 쓰는 동안 그림 가운데 'N턴 뒤')
const GEM7 = ['...a...', '..aba..', '.abbba.', 'abbbbba', '.abbba.', '..aba..', '...a...'];
function usesDial(g, x0, y0, n, max, F, dim) {   // (x0, y0) = 카드 왼쪽 위 · n = 남은 횟수 · max = 판마다 횟수(1~3) → 오른쪽 끝(카드 왼쪽에서 몇 칸)
  const m = Math.max(1, Math.min(max || 1, 4)), w = m * 8 + 4, x = x0 + 2, y = y0 + 4, base = dim ? GEM.off[0] : F ? F.col : '#8ea3c2', light = dim ? GEM.off[1] : F ? F.light : '#ffffff';
  rrect(g, x, y, w, 13, 4, C.ink); rrect(g, x + 1, y + 1, w - 2, 11, 3, hexMix(base, C.ink, 0.3)); g.rect(x + 3, y + 1, w - 6, 1, hexMix(base, '#ffffff', 0.35));
  for (let k = 0; k < m; k++) {
    const gx = x + 3 + k * 8, gy = y + 3, on = k < n;
    GEM7.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] !== '.') g.px(gx + i, gy + j, r[i] === 'a' ? C.ink : on ? (j < 3 ? '#ffffff' : light) : hexMix(base, C.ink, 0.7)); });   // 남은 칸 = 밝은 보석(위 반 흰빛) · 쓴 칸 = 빈 홈
  }
  return 2 + w;
}
const HOUR = ['ooooooo', 'oyyyyyo', 'ooooooo', '.olXlo.', '..oXo..', '...o...', '..olo..', '.oXXXo.', 'ooooooo', 'oyyyyyo', 'ooooooo'];   // 모래시계: 금 테 위아래 · 위 모래가 아래로
const HOUR_COL = { o: '#2e222f', y: '#f9c22b', X: '#fbb954', l: '#c7dcd0' };
function cdDial(g, x0, y0, n) {   // 재사용 대기: 어두운 띠 + 모래시계 + 남은 턴
  const vh = glyphH('value'), tw = g.textW(String(n), 'value'), w = 3 + 7 + 2 + tw + 4, x = x0 + 2, y = y0 + 3;
  rrect(g, x, y, w, 15, 4, C.ink); rrect(g, x + 1, y + 1, w - 2, 13, 3, '#2c3346'); g.rect(x + 3, y + 1, w - 6, 1, '#4a5470');
  HOUR.forEach((r, j) => { for (let i = 0; i < 7; i++) { const ch = r[i]; if (ch !== '.') g.px(x + 3 + i, y + 2 + j, HOUR_COL[ch]); } });
  g.text(String(n), x + 12, y + 7.5 - Math.round(vh / 2), { font: 'value', color: '#ffe3a0', outline: C.ink, outlineW: 2 });
  return 2 + w;
}

// 빈 칸(배운 기술이 셋보다 적을 때 · 꾹 눌러 들어 올린 카드의 자리)
export function cardSlot(g, x, y, w, h, label = '') {
  rrect(g, x, y, w, h, 5, 'rgba(140,207,255,0.16)');
  rrect(g, x + 1, y + 1, w - 2, h - 2, 4, 'rgba(8,14,26,0.55)');
  if (label) g.textMid(label, x + w / 2, y + h / 2, { color: C.dim, align: 'center' });
}

const ORB_TEXT = [['orbGuard', '이번 턴 구슬이 상대 공격 한 번의 모든 타를 막음(하나당 체력 6%) · 막은 만큼만 구슬이 깎임'], ['orbDump', '남은 구슬을 지금 전부 연타로(구슬 하나 = 한 타)'], ['orbRefill', '빈 구슬 칸을 바로 채움(덫에 나간 것 빼고)'], ['orbTrap', '남은 구슬을 모두 내 쪽 덫으로(교체 · 쓰러져도 남음) — 내 쪽이 맞으면 하나씩 터져 피해 + 봉인'], ['orbBlast', '구슬 전부 · 하나당 위력 25'], ['orbAbsorb', '구슬 전부 흡수해 하나당 체력 5% 회복 · 가득일 때 쓰면 나쁜 효과 전부 정화']];
const SUM_TEXT = [['summon', '잠든 포자 하나 — 다음 턴 시작에 깨어나 새끼(턴 시작마다 평타) · 나 대신 맞음 · 최대 셋'], ['sporeWall', '보호막이 막으면 때린 상대에게 포자 하나'], ['volley', '깨어난 새끼 · 성체 버섯이 모두 지금 평타 한 번 더'], ['burst', '소환수를 모두 터뜨려 상대에게 포자(잠든 포자 1 · 새끼 2 · 성체 버섯 3)'], ['grow', '새끼가 모두 성체 버섯으로(능력치 오름 · 체력 비율 그대로)']];
const CAVE_ADD_TEXT = { gravel: '동굴에 자갈밭 — 상대 기동 · 적중 더 하락', lava: '동굴에 용암 — 턴 끝마다 상대 화상', collapse: '동굴이 무너짐 — 상대 기동 더 하락' };
const GALE_ADD_TEXT = { storm: '상대 쪽 강풍이 불 때만 · 남은 강풍이 폭풍으로(턴 끝 피해 · 교란 · 쇠약)', heal: '상대 쪽 강풍이 불 때만 · 강풍 동안 우리 편 턴 끝 회복', shock: '상대 쪽 강풍이 불 때만 · 강풍 동안 상대 턴 끝 감전' };
// 고유 장치 설명(2026-10-29 사용자 '나머지 3개 진행하자' — 뒷면 설명이 빈 개성 기술 41개): 기술 칸 값으로 문장을 만듦(값이 바뀌면 문장도 따라 바뀜)
//  먼저/나중 갈래(onFirst · onSecond — 이번 턴 순서로 고름, rules.js br) = '먼저 움직이면 … / 나중이면 …' 두 줄
const PCT = v => Math.round(v * 100);
const fxName = id => (STATUS[id] || {}).name || BUFF_LOOK[id] || id;
function branchText(o) {
  if (!o) return '';
  const t = [];
  if (o.power != null) t.push(`위력 ${o.power}`);
  if (o.hits > 1) t.push(`${o.hits}연타`);
  if (o.area) t.push('광역');
  if (o.pierce) t.push(`방어 ${PCT(o.pierce)}% 무시`);
  if (o.guardWith) t.push(`방어 자세 ×${o.guardDefMult || RULES.guardDefMult}`);
  if (o.counterPct) t.push(`막으면 받은 피해 ${PCT(o.counterPct)}% 되받아침`);
  if (o.onBlock && o.onBlock.stun) t.push(`막으면 ${PCT(o.onBlock.stun)}% 확률로 기절`);
  if (o.evadeWith || o.act === 'evade') t.push(`회피 자세(빗나감 +${o.shift ? o.shift.miss : 0})`);
  if (o.counter) t.push(`피하면 반격 ${o.counter}${o.counterAll ? '(멀리서 온 것도)' : ''}`);
  if (o.nextCrit) t.push(`피하면 다음 공격 치명 +${o.nextCrit}`);
  if (o.reflect) t.push('반사 자세');
  if (o.self) t.push(`나에게 ${fxName(o.self)}`);
  if (o.inflict) t.push(`상대에게 ${fxName(o.inflict.look || o.inflict.id)}`);
  if (o.inflicts) t.push('상대에게 ' + o.inflicts.map(f => fxName(f.look || f.id) + (f.p != null ? `(${PCT(f.p)}%)` : '')).join(' + '));
  if (o.perHitInflict) t.push(`맞힌 타마다 ${fxName(o.perHitInflict.id)}`);
  if (o.ifFoe) { const th = o.ifFoe.then || {}; t.push(`상대가 ${fxName(o.ifFoe.has)}이면 한 방 ${th.power}${th.pierce ? `(방어 ${PCT(th.pierce)}% 무시)` : ''}`); }
  if (o.harmony) t.push(o.harmony === 'toFoe' ? '상대 상태이상을 내 것과 똑같이' : '내 상태이상을 상대 것과 똑같이');
  return t.join(' · ');
}
function mechLines(sk) {
  const L = [], A = '#9fd8ff', H = '#9ff0b0', X = '#c9a8ff', B = '#ffe3a0';
  if (sk.onFirst || sk.onSecond) { L.push(['먼저 움직이면 ' + branchText(sk.onFirst), B]); L.push(['나중이면 ' + branchText(sk.onSecond), B]); }
  if (sk.late) L.push(['나중에 움직임', A]);
  if (sk.pierce) L.push([`상대 방어 ${PCT(sk.pierce)}% 무시`, A]);
  if (sk.strikes) { const at = sk.strikes.map((x, i) => (x.pierce ? i + 1 : 0)).filter(Boolean); if (at.length) L.push([`${at.join(' · ')}타째는 방어 ${PCT(sk.strikes[at[0] - 1].pierce)}% 무시`, A]); }
  if (sk.critPlus) L.push([`치명 +${sk.critPlus}`, A]);
  if (sk.critHeal) L.push([`치명이 터질 때마다 체력 ${PCT(sk.critHeal)}% 회복`, H]);
  if (sk.lostHp) L.push([`내가 잃은 체력 1%당 위력 +${sk.lostHp}`, A]);
  if (sk.spdGap) L.push([`내가 상대보다 빠른 만큼 위력 ↑(최대 ${1 + sk.spdGap}배)`, A]);
  if (sk.execute) L.push([`맞혔을 때 상대 체력이 ${PCT(sk.execute)}% 미만이면 쓰러뜨림('죽은 줄 알았나?'로 버티면 막힘)`, A]);
  if (sk.dodgeSeal) L.push(['상대가 회피 자세로 피하면 봉인', X]);
  if (sk.bleedAt) L.push([`상대 독이 ${sk.bleedAt}겹이면 그 타에 출혈`, X]);
  if (sk.consume) L.push([`상대 ${fxName(sk.consume.id)}을 터뜨림 — 겹 하나당 최대 체력 ${PCT(sk.consume.per)}% 피해(최대 ${PCT(sk.consume.cap || 1)}%) · ${fxName(sk.consume.id)} 지움`, X]);
  if (sk.perHit) L.push([`맞힌 타마다 나에게 ${fxName(sk.perHit.id)} +${PCT(sk.perHit.v)}%(이 기술로 ${sk.perHit.cap}겹까지)`, A]);
  if (sk.fakeDeath) L.push([`이번 턴 쓰러질 공격을 받으면 체력 ${PCT(sk.fakeDeath)}%로 버팀 · 버티고 나면 다음 턴엔 못 씀`, H]);
  if (sk.cleanseHeal) L.push([`내 해로운 상태이상을 모두 지우고 체력 ${PCT(sk.cleanseHeal.base)}% + 지운 종류 하나당 ${PCT(sk.cleanseHeal.per)}% 회복(능력치 약화는 못 지움)`, H]);
  if (sk.cycle) L.push(['양쪽에 걸린 이로운 · 해로운 효과를 모두 지움(능력치 겹 포함)', X]);
  if (sk.settle) L.push([`상대 해로운 상태이상을 종류째 지우고 종류 하나당 최대 체력 ${PCT(sk.settle.per)}% 피해(최대 ${sk.settle.cap}종)`, X]);
  if (sk.infuse) L.push([`다음 칼 기술 ${sk.infuse.n}번이 ${(ELEMENT[sk.infuse.el] || {}).name || sk.infuse.el} 속성으로`, A]);
  if (sk.inject) L.push([`최대 체력 +${PCT(sk.inject.hp)}%(${sk.inject.turns}턴) · 나에게 활력 · 억셈 · 가속 · 내 독 거는 기술이 다음 턴부터 ${sk.inject.seal}턴 봉인`, H]);
  if (sk.inferno && sk.inferno.cd) L.push([`끝나고 ${sk.inferno.cd}턴 뒤에 다시 씀`, X]);
  if (sk.fruitCondense) L.push(['햇빛 하나가 열매로 · 햇빛 +1', A]);
  if (sk.fruitUse === 'eat') L.push([`열매를 모두 먹음 — 하나당 체력 ${PCT(FRUIT.eat)}% 회복 · 상태이상 한 종류씩 지움 · 먹은 열매는 햇빛으로 돌아옴 · 열매가 없으면 못 씀`, H]);
  if (sk.fruitUse === 'throw') L.push(['열매를 모두 던짐 — 하나당 한 타 · 햇빛으로 돌아옴 · 열매가 없으면 못 씀', A]);
  if (sk.scale && sk.scale.k === 'prep') L.push([`준비를 모두 먹음 — 먹은 준비 0 · 1 · 2 · 3개 = 피해 +${sk.scale.dmg.map(PCT).join(' · ')}%` + (sk.scale.drain ? ` · 흡수 ${sk.scale.drain.map(PCT).join(' · ')}%` : ''), A]);
  if (sk.mealMark) L.push(['다음 턴에 맛평가를 쓸 수 있음', X]);
  if (sk.taste) L.push(['식사시간 바로 다음 턴에만 — 먹은 준비 1 = 쇠약 · 2 = 쇠약 + 시듦 · 3 = 쇠약 + 시듦 + 봉인', X]);
  if (sk.gain && sk.gain.k === 'prep' && sk.gain.n) L.push([`준비 +${sk.gain.n}`, B]);
  return L;
}
// 뒷면 내용(큰 카드 크기 w×h, 1배 글자). o = { can, lock, energy, foe: { name, el }, mult }
function cardBack(g, w, h, sk, o) {
  if (sk.passive) return passiveBack(g, w, h, sk);
  const E = elOf(sk), P = 14, cw = w - P * 2, cat = (sk.cats && sk.cats[0]) || 'attack';
  const wm = icon(artIcon(sk));   // 아래쪽 옅은 문양(앞면 그림의 아이콘)
  if (wm) { const s = Math.floor(Math.min(cw * 0.55, h * 0.3) / wm.width), iw = wm.width * s; g.c.imageSmoothingEnabled = false; g.alpha(0.09, () => g.c.drawImage(tinted(artIcon(sk), E.light), Math.round((w - iw) / 2), h - iw - 18, iw, iw)); }
  let y = 16;
  const ei = sk.el && icon(sk.el);
  g.text(sk.name, P, y, { font: 'head', color: C.text });
  if (ei) { g.disc(w - P - 7, y + 7, 9, C.ink); g.disc(w - P - 7, y + 7, 8, E.dark); g.img(ei, w - P - 12, y + 2); }
  y += 22;
  const tags = [sk.form && FORMS[sk.form] ? `${FORMS[sk.form].name} 변이` : TIER_NAME[sk.tier], CAT_NAME[cat], sk.act === 'attack' ? (sk.ranged ? '원거리' : '근접') : null, sk.area ? '광역' : null, sk.el ? `${E.name} 속성` : null].filter(Boolean);
  for (const ln of wrap(tags.join(' · '), 'body', cw)) { g.text(ln, P, y, { color: C.sub }); y += 14; }
  y += 4; g.rect(P, y, cw, 1, hexMix(E.main, C.ink, 0.35)); y += 9;
  // 큰 수: 앞면 오른쪽 위 수치(위력 · 막음 · 회피 · 보호막 · 회복 — 없으면 위력 —) · 비용
  const st = statOf(sk, o), bw = Math.floor((cw - 8) / 2), box = (bx, label, val, ic) => {
    rrect(g, bx, y, bw, 34, 4, C.ink); rrect(g, bx + 1, y + 1, bw - 2, 32, 3, C.plate);
    g.text(label, bx + 8, y + 5, { color: C.dim });
    if (ic) g.img(icon(ic), bx + 8, y + 18);
    g.text(val, bx + (ic ? 22 : 8), y + 15, { font: 'name', color: C.text });
  };
  box(P, st ? st.label : '위력', st ? st.txt : '—', st ? BADGE[st.kind].icon : null);
  if (sk.uses) box(P + bw + 8, '판마다', o.left != null ? `${o.left} / ${sk.uses}번` : `${sk.uses}번`, null); else box(P + bw + 8, '비용', String(sk.cost || 0), 'energy');
  y += 44;
  // 설명 줄: 기본기 → 규칙 문장, 효과 → 칩 + 누구에게 + 한 줄 설명
  const SM = o.small, BODY = SM ? sized('body', 10) : 'body', LH = SM ? 13 : 15;   // o.small = 글이 뒷면보다 길 때(renderFaces가 재 보고 정함) — 설명만 한 칸 작게
  const line = (txt, col = C.text, font = 'body') => { const f = font === 'body' ? BODY : font; for (const ln of wrap(txt, f, cw)) { g.text(ln, P, y, { font: f, color: col }); y += LH; } };
  if (BASIC_DESC[sk.id]) for (const ln of BASIC_DESC[sk.id]) line(ln);
  if (sk.drain) line(`때린 피해의 ${Math.round(sk.drain * 100)}%만큼 회복`, '#9ff0b0');
  if (st && st.half) line(`바로 전 턴에도 같은 자세 — 효과 절반`, '#ffd890');
  const fx = [];
  if (sk.inflict) fx.push({ id: sk.inflict.look || sk.inflict.id, n: sk.inflict.n || 1, to: '상대에게', delay: sk.inflict.delay });
  for (const f of sk.inflicts || []) fx.push({ id: f.look || f.id, n: f.n || 1, to: f.p != null ? `상대에게 · ${Math.round(f.p * 100)}% 확률` : '상대에게' });   // 여러 효과(2026-10-29 — 전엔 뒷면이 이 칸을 안 읽어 비었음)
  if (sk.perHitInflict) fx.push({ id: sk.perHitInflict.id, n: sk.perHitInflict.n || 1, to: '맞힌 타마다' });
  if (sk.critInflict) fx.push({ id: sk.critInflict.id, n: sk.critInflict.n || 1, to: '치명 타마다' });
  if (sk.trapSet) fx.push({ id: 'thornTrap', to: `우리 쪽 · 최대 ${sk.trapSet.max}개` });
  if (sk.revive) fx.push({ id: 'revive', to: '나에게' });
  if (sk.bounce) fx.push({ id: 'bounce', to: '나에게' });
  if (sk.miasma) fx.push({ id: 'miasma', to: `상대 쪽 · ${sk.miasma.turns}턴` });
  if (sk.inferno) fx.push({ id: 'inferno', to: `상대 쪽 · ${sk.inferno.turns}턴` });
  if (sk.bell) fx.push({ id: sk.bell, to: '양쪽 · 3턴' });
  if (sk.fruitCondense) fx.push({ id: 'fruit', to: '나에게' });
  for (const h of sk.hex || []) fx.push({ id: h.id, n: h.n || 1, to: h.turns ? `상대 쪽 · ${h.turns}턴` : '상대에게' });   // 피해 없이 거는 기술(종 고유 v2)
  for (const b of [sk.self, sk.also]) if (b) fx.push({ id: BUFF_KEY[b] || (b === 'stealth' && sk.look === 'clone' ? 'clone' : b), to: '나에게' });
  if (sk.reflect) fx.push({ id: 'reflect', to: '이번 턴' });   // 반사 자세(엑셀 v10 — 그 턴 처음 맞는 한 타)
  const chip = (f, x) => fxChip(g, x, y, STATUS[f.id] ? f.id : null, STATUS[f.id] ? null : BUFF_LOOK[f.id] || f.id, true);
  if (fx.length === 2 && fx[0].to === fx[1].to && !fx.some(f => f.n > 1 || f.delay != null)) {   // 효과 둘 · 같은 대상 = 칩 둘을 한 줄에 · 설명은 '이름: …'(2026-10-29 — 신경독 · 소화액 같은 카드가 뒷면 아래로 넘쳤음)
    y += 2;
    const w1 = chip(fx[0], P), w2 = chip(fx[1], P + w1 + 4);
    if (w1 + w2 + 10 + g.textW(fx[0].to) <= cw) g.text(fx[0].to, P + w1 + w2 + 10, y + Math.round((20 - glyphH('body')) / 2), { color: C.sub });   // 자리가 모자라면 대상 글은 뺌(공격이 거는 효과 = 상대에게)
    y += SM ? 22 : 24;
    for (const f of fx) if (STATUS_DESC[f.id]) line(`${fxName(f.id)}: ${STATUS_DESC[f.id]}`);
  } else for (const f of fx) {
    y += 2;
    const cwid = chip(f, P);
    g.text(f.to + (f.n > 1 ? ` ${f.n}겹` : '') + (f.delay != null ? ` · ${f.delay}턴 뒤 핌` : ''), P + cwid + 6, y + Math.round((20 - glyphH('body')) / 2), { color: C.sub });
    y += SM ? 22 : 24;
    if (STATUS_DESC[f.id]) line(STATUS_DESC[f.id]);
  }
  if (sk.galeAdd) line(GALE_ADD_TEXT[sk.galeAdd], '#c0a8ff');
  if (sk.caveAdd) line(CAVE_ADD_TEXT[sk.caveAdd], '#d9b27a');
  if (SUM_TEXT.find(([k]) => sk[k])) line(SUM_TEXT.find(([k]) => sk[k])[1], '#b8e07a');
  if (ORB_TEXT.find(([k]) => sk[k])) line(ORB_TEXT.find(([k]) => sk[k])[1], '#c9a8ff');
  if (sk.moss) line('동굴 설치물을 모두 걷고 하나당 체력 10% 회복(동굴은 남음)', '#9ff0b0');
  if (sk.noShield) line('보호막을 무시하고 들어감', '#9fd8ff');
  if (sk.inflict && sk.inflict.p != null) line(`기절은 ${Math.round(sk.inflict.p * 100)}% 확률`, C.sub);
  if (sk.critIfDodged) line('나중에 움직임 · 먼저 친 상대가 나를 빗나갔으면 확정 치명 · 내가 먼저면 치명 없음', '#9fd8ff');
  if (sk.bare) line(`이번 턴 상대 공격을 빗나감 · 스침 없이 다 맞고 받는 피해 −${Math.round((1 - sk.bare) * 100)}%`, '#9fd8ff');
  if (sk.sure) line('반드시 맞음 · 방어태세 · 회피 자세 · 은신 무시 · 먼저 움직이면 확정 치명', '#9fd8ff');
  if (sk.pierceReflect) line('뚫리면 첫 타 일부 반사', '#9fd8ff');
  for (const [t, col] of mechLines(sk)) line(t, col);   // 고유 장치 설명(2026-10-29 — 뒷면이 비던 개성 기술 41개)
  if (sk.link) line(`이어 공격 위력 ${sk.link.hits > 1 ? `${sk.link.power}×${sk.link.hits}` : sk.link.power}${sk.link.ambush ? ' · 기습 ×1.5 · 자세 무시' : ''}`, '#9fd8ff');   // 은신 설명에 '피하면 바로 이어 공격'이 이미 있어 수치만(2026-10-24 — 카드 밖으로 넘침)
  // 지금 상대에게의 상성(공격 기술)
  if (o.foe && sk.act === 'attack') {
    y += 4; g.rect(P, y, cw, 1, hexMix(C.line, C.ink, 0.6)); y += 8;
    const fe = ELEMENT[o.foe.el];
    if (o.mult > 1) line(`상대 ${o.foe.name}${fe ? `(${fe.name})` : ''}에게 효과가 굉장하다 · 피해 ×1.5`, C.good, 'bold');
    else line(`상대 ${o.foe.name}${fe ? `(${fe.name})` : ''}에게 보통`, C.dim);
  }
  // 못 쓰는 까닭
  if (o.can === false) {
    y += 4;
    if (o.left === 0) line('이번 판엔 다 썼어요', (FORMS[sk.form] || {}).light || '#ff9a9a', 'bold');
    else if (o.lock) line(LOCK_TEXT[o.lock] || '지금은 못 씀', (STATUS[o.lock] || {}).col || '#ff8a8a', 'bold');
    else if ((sk.cost || 0) > (o.energy ?? 99)) line(`햇빛이 모자람 — 지금 ${o.energy} · 필요 ${sk.cost}`, '#ff9a9a', 'bold');
    else line('지금은 못 씀', '#ff9a9a', 'bold');
  }
  return y;   // 글 끝(backHeight)
}
// 패시브 카드 뒷면(2026-10-17 카드): 이름 · '일반 카드 · 패시브' 꼬리표 · 큰 수(앞면 수치) · 설명 줄 · 누가 쓰나
function passiveBack(g, w, h, sk) {
  const L = sk.look || {}, P = 14, cw = w - P * 2, wm = sk.icon && icon(sk.icon);
  if (wm) { const s = Math.floor(Math.min(cw * 0.55, h * 0.3) / wm.width), iw = wm.width * s; g.c.imageSmoothingEnabled = false; g.alpha(0.09, () => g.c.drawImage(tinted(sk.icon, L.light || '#d8f2ff'), Math.round((w - iw) / 2), h - iw - 18, iw, iw)); }
  let y = 16;
  g.text(sk.name, P, y, { font: 'head', color: C.text });
  y += 22;
  const who = sk.form && FORMS[sk.form] ? `${FORMS[sk.form].name} 변이 카드` : '일반 카드';
  g.text(`${who} · 패시브`, P, y, { color: C.sub }); y += 18;
  g.rect(P, y, cw, 1, hexMix(L.col || '#5fb3d9', C.ink, 0.35)); y += 9;
  if (sk.badge) {
    rrect(g, P, y, cw, 34, 4, C.ink); rrect(g, P + 1, y + 1, cw - 2, 32, 3, C.plate);
    g.text('효과', P + 8, y + 5, { color: C.dim });
    const ic = icon(sk.badge[1]); if (ic) g.img(ic, P + 8, y + 18);
    g.text(sk.badge[0], P + (ic ? 22 : 8), y + 15, { font: 'name', color: L.light || C.text });
    y += 44;
  }
  for (const d of sk.desc || []) for (const ln of wrap(d, 'body', cw)) { g.text(ln, P, y, { color: C.text }); y += 15; }
  y += 6;
  g.text(sk.form && FORMS[sk.form] ? `${FORMS[sk.form].name} 변이 식물만 끼워요` : '일반 식물만 끼워요', P, y, { color: C.dim });
  return y + 15;
}
// 강화 꼬리표(+1 = 은빛 · +2 = 금빛): (x, y) 왼쪽 위, 높이 13
const UP_COL = { 2: ['#5a6a84', '#e6eef8'], 3: ['#b8852e', '#fff3c8'] };
function upTag(g, x, y, lv, gh) {
  const txt = '+' + (lv - 1), tw = g.textW(txt, 'bold') + 8, [f, t] = UP_COL[lv] || UP_COL[3];
  rrect(g, x, y, tw, 13, 3, C.ink); rrect(g, x + 1, y + 1, tw - 2, 11, 2, f);
  g.text(txt, x + 4, y + Math.round((13 - gh) / 2), { font: 'bold', color: t });
}
// 작은 카드(보상 칸 · 가방 줄 · 상점 — 그림 대신 카드 모양): (x, y) 왼쪽 위, 20×28 — 테 색 = 카드 색, 가운데 = 카드 아이콘 · 강화 카드 = 아래 점(+1 하나 · +2 둘)
export function cardTiny(g, x, y, sk) {
  if (!sk) return;
  const [mid, hi, lo] = frameCols(sk, false), w = 20, h = 28, ic = icon(artIcon(sk));
  rrect(g, x, y, w, h, 3, C.ink); rrect(g, x + 1, y + 1, w - 2, h - 2, 2, mid);
  g.rect(x + 3, y + 1, w - 6, 1, hi); g.rect(x + 3, y + h - 2, w - 6, 1, lo);
  rrect(g, x + 3, y + 3, w - 6, h - 6, 1, hexMix(mid, C.ink, 0.55));
  if (ic) g.img(ic, x + Math.round((w - ic.width) / 2), y + Math.round((h - ic.height) / 2));
  if (sk.passive && sk.lv > 1) { const n = sk.lv - 1, col = (UP_COL[sk.lv] || UP_COL[3])[1], px0 = x + Math.round(w / 2 - (n * 4 - 1) / 2); for (let i = 0; i < n; i++) { g.rect(px0 + i * 4 - 1, y + h - 7, 5, 4, C.ink); g.rect(px0 + i * 4, y + h - 6, 3, 2, col); } }
}
// 카드 꾸러미(2026-10-22 — 상점 · 받은 것 판 · 가방 물건 · 식물 관리 '꾸러미'): 위아래를 톱니로 봉한 은박 봉지 22×28 + 가운데 카드 문장 · 일반 = 하늘 · 변이 = 보라
const PACK_COL = { n: ['#3f8fc4', '#bfe6ff', '#1f4f7c'], m: ['#8a5ad0', '#e2c8ff', '#45287a'] };
export function packTiny(g, x, y, mut) {
  const [mid, hi, lo] = PACK_COL[mut ? 'm' : 'n'], w = 22, h = 28, band = hexMix(mid, hi, 0.35);
  g.rect(x, y + 1, w, h - 2, C.ink);                                    // 먹선
  g.rect(x + 1, y + 2, w - 2, h - 4, mid);                              // 몸통
  g.rect(x + 1, y + 2, w - 2, 3, band); g.rect(x + 1, y + h - 5, w - 2, 3, hexMix(mid, lo, 0.35));   // 봉한 띠(위 · 아래)
  for (let i = 2; i < w - 2; i += 2) { g.px(x + i, y + 3, hexMix(band, lo, 0.5)); g.px(x + i, y + h - 4, lo); }   // 봉한 자리 주름
  for (let i = 0; i < w; i += 2) { g.px(x + i, y, C.ink); g.px(x + i + 1, y + h - 1, C.ink); }   // 톱니 끝
  g.rect(x + 1, y + 5, 1, h - 10, hi); g.rect(x + w - 2, y + 5, 1, h - 10, lo);   // 옆 빛 · 그늘
  for (let j = 0; j < h - 12; j++) { const sx = x + 4 + (j >> 1); if (sx < x + w - 3) g.px(sx, y + 6 + j, hexMix(mid, hi, 0.55)); }   // 비스듬한 은박 빛
  const cx = x + 6, cy = y + 8;                                         // 가운데 카드 문장(10×13)
  rrect(g, cx, cy, 10, 13, 2, C.ink); rrect(g, cx + 1, cy + 1, 8, 11, 1, hexMix(mid, C.ink, 0.45));
  g.rect(cx + 2, cy + 1, 6, 1, hi);
  g.rect(cx + 4, cy + 4, 2, 5, hi); g.rect(cx + 3, cy + 5, 4, 3, hi); g.px(cx + 4, cy + 6, '#ffffff'); g.px(cx + 5, cy + 6, '#ffffff');   // 반짝 별
}
// 뒷면 바탕(테 안쪽): 위가 한 단 밝은 남색(점 섞어 이음)
function backBody(g, x, y, w, h) {
  rrect(g, x + 4, y + 4, w - 8, h - 8, 1, C.body);
  g.vgrad(x + 4, y + 4, w - 8, h - 8, [C.body2, C.body, C.body]);
}

// 꾹 눌러 볼 큰 카드 두 장(앞 · 뒤)을 기기 화소로 미리 그림: 앞면 = 손패 그림 그대로 S배(테·도트·글자가 함께 커짐), 뒷면 = 같은 테를 S배 + 상세는 1배 글자
export function renderFaces(sk, w, h, BW, BH, k, o = {}) {
  const S = BW / w, mk = () => { const cv = document.createElement('canvas'); cv.width = Math.round(BW * k); cv.height = Math.round(BH * k); return cv; };
  const front = mk(), fc = front.getContext('2d'), G1 = new Gfx(fc);
  fc.setTransform(k * S, 0, 0, k * S, 0, 0);
  cardFront(G1, 0, 0, w, h, sk, { can: o.can, short: o.short, lock: o.lock, halved: o.halved, left: o.left });
  const back = mk(), bc = back.getContext('2d'), G2 = new Gfx(bc);
  bc.setTransform(k * S, 0, 0, k * S, 0, 0);
  const hb = o.free ? Math.round(BH / S) : h;   // o.free = 뒷면을 카드 비율과 다르게(넓게) — 카드 고르기 화면 설명 판(짧은 기기에서도 글이 들어가게)
  cardFrame(G2, 0, 0, w, hb, sk, false); backBody(G2, 0, 0, w, hb);
  bc.setTransform(k, 0, 0, k, 0, 0);
  if (o.bodyH) {   // o.bodyH = 글을 따로 한 장(높이 = 글 전체) — 판보다 길면 부르는 쪽이 테 안쪽에 잘라 끌어 넘김(scenes/draft.js)
    const body = document.createElement('canvas'); body.width = Math.round(BW * k); body.height = Math.round(o.bodyH * k);
    const bb = body.getContext('2d'); bb.setTransform(k, 0, 0, k, 0, 0);
    cardBack(new Gfx(bb), BW, o.bodyH, sk, o);
    return { front, back, body };
  }
  cardBack(G2, BW, BH, sk, backHeight(sk, BW, o) > BH ? { ...o, small: true } : o);
  return { front, back };
}
// 손패 크기 앞면 한 장만(기기 화소 k) — 상대 카드 더미를 펼쳐 볼 때(scenes/battle.js drawSpread · 뒷면은 누를 때 renderFaces로 따로)
export function renderFront(sk, w, h, k, o = {}) {
  const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  const c = cv.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0);
  cardFront(new Gfx(c), 0, 0, w, h, sk, o);
  return cv;
}
// 뒷면 글이 폭 w(1배 칸)에서 차지하는 높이(위 · 아래 테 포함) — 설명 판 높이를 글에 맞출 때
let measureG = null;
export function backHeight(sk, w, o = {}) {
  measureG = measureG || new Gfx(document.createElement('canvas').getContext('2d'));
  return Math.ceil(cardBack(measureG, w, 400, sk, o)) + 14;
}

// 교체 카드(3:3 턴 시작 공개 — 2026-10-18 사용자 "교체할 때도 스킬 카드처럼 교체 카드가 뜨면서 뭐로 바뀔지 안내"): 스킬 카드와 같은 틀 ·
//  그림 칸 = 들어올 식물 얼굴(art(g, x, y, w, h) — 부르는 쪽이 그림, 모르면 물음표) · 이름 띠 = 그 식물 이름 · 왼쪽 위 = 하늘색 원에 엇갈린 두 화살표(비용 자리) · 오른쪽 위 = '교체' 꼬리표 · 속성 배지
export function renderSwapFront(u, w, h, BW, BH, k, art) {
  const S = BW / w, cv = document.createElement('canvas'); cv.width = Math.round(BW * k); cv.height = Math.round(BH * k);
  const c = cv.getContext('2d'), g = new Gfx(c), el = u && u.el, ax = 4, ay = 4, aw = w - 8, ah = ART_H;
  c.setTransform(k * S, 0, 0, k * S, 0, 0); c.imageSmoothingEnabled = false;
  cardFrame(g, 0, 0, w, h, { el }, false);
  g.vgrad(ax, ay, aw, ah, ['#1d3554', '#12233c', '#0b1628']);
  const s = Math.min(aw, ah) - 4, px = ax + Math.floor((aw - s) / 2), py = ay + ah - s;
  if (!(u && art && art(g, px, py, s, s))) g.text('?', w / 2, ay + Math.round((ah - glyphH('name')) / 2), { font: 'name', color: '#8ccfff', align: 'center' });
  const by = ay + ah, bh = h - 4 - by, gr = c.createLinearGradient(0, by - 12, 0, by);
  gr.addColorStop(0, 'rgba(12,21,38,0)'); gr.addColorStop(1, 'rgba(12,21,38,0.92)');
  c.fillStyle = gr; c.fillRect(ax, by - 12, aw, 12);
  g.rect(ax, by, aw, bh, C.band); g.rect(ax, by, aw, 1, '#8ccfff');
  const { lines, font, lh } = nameLines((u && u.name) || '교체', aw - 4), gh = glyphH(font), ny = Math.round(by + 1 + (bh - 1 - (lines.length - 1) * lh - gh) / 2);
  lines.forEach((ln, i) => g.text(ln, w / 2, ny + i * lh, { font, color: C.text, align: 'center' }));
  if (el && ELEMENT[el]) { const ic = icon(el); if (ic) { const cx = ax + 8, cy = by - 8; g.disc(cx, cy, 7, C.ink); g.disc(cx, cy, 6, ELEMENT[el].main); g.disc(cx, cy, 5, '#101a2e'); g.img(ic, cx - Math.floor(ic.width / 2), cy - Math.floor(ic.height / 2)); } }
  g.disc(10, 10, 8, C.ink); g.disc(10, 10, 7, '#3d8fd6'); g.disc(10, 10, 6, '#1f5d9c');   // 엇갈린 두 화살표: 위 = 오른쪽 · 아래 = 왼쪽
  g.rect(6, 7, 7, 1, '#ffffff'); g.rect(11, 6, 1, 3, '#ffffff'); g.px(12, 7, '#ffffff');
  g.rect(8, 12, 7, 1, '#ffffff'); g.rect(8, 11, 1, 3, '#ffffff'); g.px(7, 12, '#ffffff');
  tag(g, w - 4, 4, '교체', '#8ccfff');
  return cv;
}
// 엎어 둔 카드(공개 전 상대 카드 — 2026-10-17 사용자 "스킬 카드가 나와 상대 거가 회전하듯 등장해서 보여주고"): 은빛 테 · 남색 바탕 · 안쪽 가는 테 · 가운데 금빛 마름모에 씨앗
export function renderDown(w, h, BW, BH, k) {
  const S = BW / w, cv = document.createElement('canvas'); cv.width = Math.round(BW * k); cv.height = Math.round(BH * k);
  const c = cv.getContext('2d'), G = new Gfx(c);
  c.setTransform(k * S, 0, 0, k * S, 0, 0); c.imageSmoothingEnabled = false;
  cardFrame(G, 0, 0, w, h, {}, false); backBody(G, 0, 0, w, h);
  rrect(G, 8, 8, w - 16, h - 16, 3, 'rgba(140,207,255,0.22)'); rrect(G, 9, 9, w - 18, h - 18, 2, C.body);
  for (let i = 0; i < 4; i++) { const [px, py] = [[12, 12], [w - 13, 12], [12, h - 13], [w - 13, h - 13]][i]; G.rect(px, py, 1, 1, C.line); }   // 네 모서리 점
  const cx = w >> 1, cy = h >> 1;
  diamond(G, cx, cy, 15, ['#c89a3e', '#ffe7a8', '#6a4a14']);
  diamond(G, cx, cy, 10, [C.body2, '#2c5a8e', C.ink]);
  const ic = icon('seed'); if (ic) G.img(tinted('seed', '#ffe7a8'), cx - Math.floor(ic.width / 2), cy - Math.floor(ic.height / 2));
  return cv;
}
// 원근 뒤집기: (cx, cy) = 카드 가운데, w·h = 지금 크기(논리 칸), th = 0(앞) → π(뒤). 세로 조각마다 깊이 z = x·sinθ, 원근 s = f / (f + z)
export function drawFlip(c, front, back, cx, cy, w, h, th) {
  const cos = Math.cos(th), sin = Math.sin(th), face = cos >= 0 ? front : back, f = 2.6 * w, N = Math.max(12, Math.round(w / 2)), fw = face.width, fh = face.height;
  c.save();
  c.imageSmoothingEnabled = true;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, x0 = (u0 - 0.5) * w, x1 = (u1 - 0.5) * w;
    const s0 = f / (f + x0 * sin), s1 = f / (f + x1 * sin), X0 = cx + x0 * cos * s0, X1 = cx + x1 * cos * s1;
    const L = Math.min(X0, X1), Wd = Math.abs(X1 - X0);
    if (Wd < 0.05) continue;
    const su = cos >= 0 ? u0 : 1 - u1, hh = h * (s0 + s1) / 2;   // 뒷면은 좌우가 뒤집혀 보이므로 그림을 거꾸로 읽음
    c.drawImage(face, su * fw, 0, fw / N, fh, L, cy - hh / 2, Wd + 0.35, hh);
  }
  c.restore();
}
