// 전투 기술 카드(2026-10-16 사용자 "전투시 스킬도 뭔가 세로로 긴 카드 느낌 — 꾹 누르면 뒷면으로 가까이 앞으로 가져오는 느낌, 뒷면에 상세"
//  → "카드 디자인이 너무 별로임 예쁘게 해봐. 자료 참고해서").
//  참고: Marvel Snap(그림이 주인공 · 비용 = 왼쪽 위 파란 원 · 위력 = 오른쪽 위 주황 원 · 글은 최소), Balatro(도트 카드 · 굵은 먹선 테 · 그림자 · 고르면 떠오르고
//   금빛 · 특별할 때 비스듬한 빛 띠가 스침), 카드 틀 관례(틀 색 = 종류·속성, 보석은 모서리, 이름 띠는 대비 높게).
//  앞면 = 속성 색 도톰한 금속 테(위·왼 밝게 · 아래·오른 어둡게) · 그림(코덱스 스킬 그림을 도트로 — 없으면 속성 빛 + 큰 아이콘 임시 그림) ·
//   이름 띠(그림 아래를 짙게 덮으며 이어짐) · 비용 마름모(전투 화면 MP와 같은 파랑, 모자라면 빨강) · 위력 알약(공격만, 주황)
//  뒷면 = 같은 테 + 상세(등급 · 분류 · 사거리 · 위력 · 비용 · 걸리는 효과와 설명 · 지금 상대에게의 상성 · 못 쓰는 까닭)
//  꾹 누르기(battle.js) = 카드가 화면 가운데로 다가오며 커지고 원근 있게 뒤집힘 — 2D 캔버스라 세로 조각마다 깊이만큼 높이·간격을 줄여 3D 뒤집기를 흉내(drawFlip)
import { Gfx } from '../core/gfx.js';
import { wrap, glyphH } from '../core/text.js';
import { icon, tinted } from './icons.js';
import { ELEMENT, BAYER4 } from './palette.js';
import { rrect } from './ui.js';
import { STATUS, STATUS_DESC, BUFF_LOOK, fxChip, hexMix } from './statusLook.js';
import { CAT_ICON, CAT_NAME } from '../data/mock.js';
import { TIER_NAME, SKILLS } from '../game/catalog.js';

const C = { ink: '#0b1322', body: '#12294a', body2: '#183a62', plate: '#0c1e36', band: '#0c1526', text: '#eef4ff', sub: '#a9cdf0', dim: '#7396bb', line: '#8ccfff', gold: '#ffd890', good: '#ffd890' };
const GEM = { ok: ['#2d6fe0', '#9fd0ff', '#15347c'], bad: ['#c8392e', '#ff9e8e', '#5c1410'], off: ['#5b616e', '#a7adb8', '#2c3038'] };   // [속, 빛, 그늘]
const POW = ['#f08a24', '#ffd08a', '#7a320c'];
const NONE = { name: '무속성', main: '#8ea3c2', light: '#dfe8f5', dark: '#46566e' };
export const elOf = sk => (sk && ELEMENT[sk.el]) || NONE;
const BUFF_KEY = { purify: 'purified' };   // 기술의 self 이름 → 효과 표 이름
// 기본기 설명(battle/model.js BASICS 규칙 그대로)
const BASIC_DESC = {
  basic: ['누구나 쓰는 공짜 공격'],
  guard: ['상대보다 늦게 움직이면', '받는 피해가 40%로 줄어듦', '먼저 움직이면 헛자세'],
  evade: ['먼저든 늦게든 성립', '상대 공격이 빗나갈 확률 +22', '스칠 확률 +14'],
};
export const LOCK_TEXT = { bind: '덩굴에 묶여 이번 턴 못 씀', taunt: '도발에 넘어가 자세를 못 씀' };
const LOCK_SHORT = { bind: '묶임', taunt: '도발' };   // 카드 앞면(그림 위)
export const ART_W = 58, ART_H = 52;   // 그림 칸(논리 칸) — 코덱스 그림은 tools/pixel/big/bgconv.mjs --fit --w=58 --h=52 로 줄여 assets/v2/skills/<기술 id>.png

// ── 스킬 그림(코덱스 원화 → 도트). 없으면 임시 그림 ──
export const SKILLART = {};
// 2026-10-16 코덱스: 기본기 셋(모든 식물 공용) + 기술 그림(사용자 "남은 거 다해줘" — 91장 한 번에 요청 → 사용 한도로 두 번에 나눠 받음, 93개 다 있음). 기술이 새로 생기면 그림과 함께 여기에 id를 더함(없는 파일을 부르면 빠진 요청이 됨)
export const SKILLART_NAMES = ['basic', 'guard', 'evade', 'f_ember', 'f_rage', 'f_ball', 'f_pillar', 'f_storm', 'f_lava', 'w_gun', 'w_pure', 'w_cannon', 'w_tide', 'w_whirl', 'w_rain', 'g_leaf', 'g_photo', 'g_whip', 'g_venom', 'g_root', 'g_bomb', 'e_rock', 'e_hard', 'e_roll', 'e_quake', 'e_slide', 'e_wall', 'a_breeze', 'a_tail', 'a_twist', 'a_typhoon', 'a_vacuum', 'a_jet', 'b_static', 'b_charge', 'b_bolt', 'b_thunder', 'b_surge', 'b_chain', 'i_frost', 'i_shell', 'i_spear', 'i_blizzard', 'i_zero', 'j_scent', 'j_petals', 'j_wrap', 'j_lash', 'j_spines', 'j_needle', 'j_spore', 'j_cloud', 'br_sand', 'br_moss', 'br_bloom', 'br_trap', 'sp_leech', 'sp_root', 'sp_shade', 'sp_acid', 'u_petal_1', 'u_petal_2', 'u_petal_3', 'u_thorn_1', 'u_thorn_2', 'u_thorn_3', 'u_aqua_1', 'u_aqua_2', 'u_aqua_3', 'u_wind_1', 'u_wind_2', 'u_wind_3', 'u_spark_1', 'u_spark_2', 'u_spark_3', 'u_tide_1', 'u_tide_2', 'u_tide_3', 'u_ember_1', 'u_ember_2', 'u_ember_3', 'u_gaia_1', 'u_gaia_2', 'u_gaia_3', 'u_blaze_1', 'u_blaze_2', 'u_blaze_3', 'u_gale_1', 'u_gale_2', 'u_gale_3', 'u_gvine_1', 'u_gvine_2', 'u_gvine_3', 'u_spore_1', 'u_spore_2', 'u_spore_3'];
const NAME_ID = Object.fromEntries(Object.entries(SKILLS).map(([id, s]) => [s.name, id]));   // 시험판 기술(model.js s1·s2)도 이름으로 그림을 찾음
const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
export async function loadSkillArt(base = '../assets/v2/skills/') {
  const got = await Promise.all(SKILLART_NAMES.map(n => load(base + n + '.png')));
  SKILLART_NAMES.forEach((n, i) => { if (got[i]) SKILLART[n] = got[i]; });
  return SKILLART_NAMES.filter(n => !SKILLART[n]);
}
const artOf = sk => SKILLART[sk.id] || SKILLART[NAME_ID[sk.name]] || null;

// 그림 창의 큰 아이콘: 거는 효과 > 내 버프 > (공격 아닌) 분류 > 속성 > 칼
function artIcon(sk) {
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
  const name = artIcon(sk), key = (sk.el || '-') + '|' + name;
  let cv = tempArt.get(key); if (cv) return cv;
  const E = elOf(sk), W = ART_W, H = ART_H;
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
const frameCols = (sk, lit) => (lit ? ['#ffd890', '#fff3c8', '#b8852e'] : sk.el ? [elOf(sk).main, hexMix(elOf(sk).light, '#ffffff', 0.3), elOf(sk).dark] : ['#9fb0c8', '#e6eef8', '#4c5a70']);
function cardFrame(g, x, y, w, h, sk, lit) {
  const [mid, hi, lo] = frameCols(sk, lit);
  rrect(g, x, y, w, h, 5, C.ink);
  rrect(g, x + 1, y + 1, w - 2, h - 2, 4, mid);
  g.rect(x + 4, y + 1, w - 8, 1, hi); g.rect(x + 1, y + 4, 1, h - 8, hi);   // 위·왼 빛
  g.rect(x + 4, y + h - 2, w - 8, 1, lo); g.rect(x + w - 2, y + 4, 1, h - 8, lo);   // 아래·오른 그늘
  rrect(g, x + 3, y + 3, w - 6, h - 6, 2, C.ink);
}
// 마름모(비용 보석): (cx, cy) 가운데, r = 반지름
function diamond(g, cx, cy, r, [fill, hi, lo]) {
  for (let dy = -r - 1; dy <= r + 1; dy++) { const hw = r + 1 - Math.abs(dy); g.rect(cx - hw, cy + dy, hw * 2 + 1, 1, C.ink); }
  for (let dy = -r; dy <= r; dy++) { const hw = r - Math.abs(dy); g.rect(cx - hw, cy + dy, hw * 2 + 1, 1, dy < 0 ? hexMix(fill, hi, 0.25) : fill); }
  for (let k = 0; k < r; k++) { g.px(cx - r + k, cy - k, hi); g.px(cx + k + 1, cy + r - k - 1, lo); }   // 왼쪽 위 빛줄 · 오른쪽 아래 그늘줄
}

// 앞면(손패 크기 w×h, 논리 칸 — 지금 66×90). o = { can(쓸 수 있나), short(에너지가 모자라나), lit(고름), lock, shine(0~1 빛 띠) }
export function cardFront(g, x, y, w, h, sk, o = {}) {
  x |= 0; y |= 0;
  const c = g.c, ax = x + 4, ay = y + 4, aw = w - 8, ah = ART_H, dim = o.can === false;
  cardFrame(g, x, y, w, h, sk, o.lit);
  c.imageSmoothingEnabled = false;
  c.drawImage(artOf(sk) || placeholderArt(sk), ax, ay, aw, ah);
  // 이름 띠: 그림 아래 열 칸을 짙게 덮으며 이어지고, 위에 테 색 가는 줄
  const by = ay + ah, bh = y + h - 4 - by, gr = c.createLinearGradient(0, by - 12, 0, by);
  gr.addColorStop(0, 'rgba(12,21,38,0)'); gr.addColorStop(1, 'rgba(12,21,38,0.92)');
  c.fillStyle = gr; c.fillRect(ax, by - 12, aw, 12);
  g.rect(ax, by, aw, bh, C.band);
  g.rect(ax, by, aw, 1, hexMix(frameCols(sk, o.lit)[0], C.band, 0.45));
  const lines = wrap(sk.name, 'bold', aw - 4).slice(0, 2), lh = 12, gh = glyphH('bold'), ny = Math.round(by + 1 + (bh - 1 - (lines.length - 1) * lh - gh) / 2);
  lines.forEach((ln, i) => g.text(ln, x + w / 2, ny + i * lh, { font: 'bold', color: C.text, align: 'center' }));
  if (o.shine != null && o.shine < 1) {   // 쓸 수 있게 된 순간: 비스듬한 빛 띠가 한 번 스침(Balatro 박 카드처럼)
    const p = o.shine, bx = ax - 16 + p * (aw + 32);
    c.save(); c.beginPath(); c.rect(ax, ay, aw, h - 8); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.32)';
    c.beginPath(); c.moveTo(bx, ay + h); c.lineTo(bx + 7, ay + h); c.lineTo(bx + 7 + h * 0.5, ay - 4); c.lineTo(bx + h * 0.5, ay - 4); c.closePath(); c.fill();
    c.restore();
  }
  if (dim) rrect(g, x + 3, y + 3, w - 6, h - 6, 2, 'rgba(6,10,20,0.55)');
  // 비용 마름모(왼쪽 위) · 위력 알약(오른쪽 위, 공격만)
  diamond(g, x + 9, y + 9, 7, dim ? (o.short ? GEM.bad : GEM.off) : GEM.ok);
  g.text(String(sk.cost || 0), x + 9.5, y + 9 - Math.round(gh / 2), { font: 'bold', color: '#ffffff', align: 'center', outline: C.ink, outlineW: 2 });
  if (sk.power) {
    const txt = String(sk.power), pw = g.textW(txt, 'bold') + 9, px = x + w - pw - 2, py = y + 2, [pf, ph, pl] = POW;
    rrect(g, px, py, pw, 14, 5, C.ink); rrect(g, px + 1, py + 1, pw - 2, 12, 4, dim ? GEM.off[0] : pf);
    g.rect(px + 4, py + 2, pw - 8, 1, dim ? GEM.off[1] : ph); g.rect(px + 4, py + 11, pw - 8, 1, dim ? GEM.off[2] : pl);
    g.text(txt, px + pw / 2 + 0.5, py + Math.round((14 - gh) / 2), { font: 'bold', color: '#ffffff', align: 'center', outline: C.ink, outlineW: 2 });
  }
  if (dim && o.lock) {   // 묶임 · 도발: 그림 가운데에 짧게(자세한 까닭은 뒷면)
    const L = STATUS[o.lock] || {}, li = L.icon && icon(L.icon), txt = LOCK_SHORT[o.lock] || '', tw = g.textW(txt, 'bold') + (li ? 14 : 0), lx = Math.round(x + (w - tw) / 2), ly = Math.round(ay + (ah - 15) / 2);
    rrect(g, lx - 4, ly, tw + 8, 15, 3, 'rgba(6,10,20,0.88)');
    if (li) g.img(li, lx, ly + 2);
    g.text(txt, lx + (li ? 14 : 0), ly + Math.round((15 - gh) / 2), { font: 'bold', color: L.col || '#ff8a8a' });
  }
}

// 빈 칸(배운 기술이 셋보다 적을 때 · 꾹 눌러 들어 올린 카드의 자리)
export function cardSlot(g, x, y, w, h, label = '') {
  rrect(g, x, y, w, h, 5, 'rgba(140,207,255,0.16)');
  rrect(g, x + 1, y + 1, w - 2, h - 2, 4, 'rgba(8,14,26,0.55)');
  if (label) g.text(label, x + w / 2, y + Math.round(h / 2) - 6, { color: C.dim, align: 'center' });
}

// 뒷면 내용(큰 카드 크기 w×h, 1배 글자). o = { can, lock, energy, foe: { name, el }, mult }
function cardBack(g, w, h, sk, o) {
  const E = elOf(sk), P = 14, cw = w - P * 2, cat = (sk.cats && sk.cats[0]) || 'attack';
  const wm = icon(artIcon(sk));   // 아래쪽 옅은 문양(앞면 그림의 아이콘)
  if (wm) { const s = Math.floor(Math.min(cw * 0.55, h * 0.3) / wm.width), iw = wm.width * s; g.c.imageSmoothingEnabled = false; g.alpha(0.09, () => g.c.drawImage(tinted(artIcon(sk), E.light), Math.round((w - iw) / 2), h - iw - 18, iw, iw)); }
  let y = 16;
  const ei = sk.el && icon(sk.el);
  g.text(sk.name, P, y, { font: 'head', color: C.text });
  if (ei) { g.disc(w - P - 7, y + 7, 9, C.ink); g.disc(w - P - 7, y + 7, 8, E.dark); g.img(ei, w - P - 12, y + 2); }
  y += 22;
  const tags = [TIER_NAME[sk.tier], CAT_NAME[cat], sk.act === 'attack' ? (sk.ranged ? '원거리' : '근접') : null, sk.area ? '광역' : null, sk.el ? `${E.name} 속성` : null].filter(Boolean);
  for (const ln of wrap(tags.join(' · '), 'body', cw)) { g.text(ln, P, y, { color: C.sub }); y += 14; }
  y += 4; g.rect(P, y, cw, 1, hexMix(E.main, C.ink, 0.35)); y += 9;
  // 큰 수: 위력 · 비용
  const bw = Math.floor((cw - 8) / 2), box = (bx, label, val, ic) => {
    rrect(g, bx, y, bw, 34, 4, C.ink); rrect(g, bx + 1, y + 1, bw - 2, 32, 3, C.plate);
    g.text(label, bx + 8, y + 5, { color: C.dim });
    if (ic) g.img(icon(ic), bx + 8, y + 18);
    g.text(val, bx + (ic ? 22 : 8), y + 15, { font: 'name', color: C.text });
  };
  box(P, '위력', sk.power ? String(sk.power) : '—', null);
  box(P + bw + 8, '비용', String(sk.cost || 0), 'energy');
  y += 44;
  // 설명 줄: 기본기 → 규칙 문장, 효과 → 칩 + 누구에게 + 한 줄 설명
  const line = (txt, col = C.text, font = 'body') => { for (const ln of wrap(txt, font, cw)) { g.text(ln, P, y, { font, color: col }); y += 15; } };
  if (BASIC_DESC[sk.id]) for (const ln of BASIC_DESC[sk.id]) line(ln);
  const fx = [];
  if (sk.inflict) fx.push({ id: sk.inflict.id, n: sk.inflict.n || 1, to: '상대에게' });
  if (sk.self) fx.push({ id: BUFF_KEY[sk.self] || sk.self, buff: BUFF_LOOK[sk.self], to: '나에게' });
  if (sk.also) fx.push({ id: BUFF_KEY[sk.also] || sk.also, buff: BUFF_LOOK[sk.also], to: '나에게' });
  for (const f of fx) {
    y += 2;
    const cwid = fxChip(g, P, y, f.buff ? null : f.id, f.buff);
    g.text(f.to + (f.n > 1 ? ` ${f.n}겹` : ''), P + cwid + 6, y + 2, { color: C.sub });
    y += 19;
    if (STATUS_DESC[f.id]) line(STATUS_DESC[f.id]);
  }
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
    if (o.lock) line(LOCK_TEXT[o.lock] || '지금은 못 씀', (STATUS[o.lock] || {}).col || '#ff8a8a', 'bold');
    else if ((sk.cost || 0) > (o.energy ?? 99)) line(`에너지가 모자람 — 지금 ${o.energy} · 필요 ${sk.cost}`, '#ff9a9a', 'bold');
    else line('지금은 못 씀', '#ff9a9a', 'bold');
  }
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
  cardFront(G1, 0, 0, w, h, sk, { can: o.can, short: o.short, lock: o.lock });
  const back = mk(), bc = back.getContext('2d'), G2 = new Gfx(bc);
  bc.setTransform(k * S, 0, 0, k * S, 0, 0);
  cardFrame(G2, 0, 0, w, h, sk, false); backBody(G2, 0, 0, w, h);
  bc.setTransform(k, 0, 0, k, 0, 0);
  cardBack(G2, BW, BH, sk, o);
  return { front, back };
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
