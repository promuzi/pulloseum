// 보조 기술(버프 · 디버프 · 환경 켜기 · 설치 · 소환) 시전 연출 — 전엔 기술 이름 리본 0.65초뿐(2026-10-29 분석: 새 고유 기술 55%)
//  (2026-10-29 사용자 "서로 스킬을 쓰면 빠르게 판정되고 별다른 모션도 없이 넘어가서 상대가 어떤 스킬을 썼고, 이게 뭐가 어떻게 되는지 파악되기 전에 슥슥 지나가")
// 조사:
//  · saint11 'Impact' — 대기 → 준비(모으기) → 동작 → 넘침 → 정지, 준비가 있어야 세게 느껴짐(공격 연출 attack.mjs 와 같은 근거)
//  · 전투 가독성: 누가(쓰는 식물이 움직임) → 무엇을(종류마다 다른 모양) → 어디에(대상 쪽으로 가는 길이 보임) 순서를 늘 같게 — 늦거나 들쭉날쭉하면 운으로 오해
//  · 다키스트 던전 — 크게 흔들기는 큰 순간만(멀미) → 흔들기는 땅을 치는 환경 기술의 1칸 · 3장만
// 종류(castKind): self = 나에게(빛기둥) · curse = 상대에게 거는 것(문양 구슬이 날아가 터짐) · field = 상대 쪽 땅에 까는 환경(땅을 치면 물결이 건너감) ·
//   bell = 경기장 전체(종소리 고리) · ward = 내 쪽 땅에 설치(덫 · 구슬 — 내 받침 둘레 고리) · summon = 소환(포자 알갱이가 내 옆으로)
import { STATUS } from './statusLook.js';
import { ELEMENT } from './palette.js';

export const CAST_MS = 1300;
const PREP = [140, 460], REL = 460;   // 모으기(ms) · 터뜨리는 순간
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const oQ = x => 1 - (1 - x) * (1 - x);
const ioQ = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 0x9e37, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function dot(g, x, y, col, a = 1, s = 1) { if (a <= 0.02) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.rect(Math.round(x), Math.round(y), s, s, col); c.globalAlpha = p; }
function ring(g, cx, cy, rx, ry, col, a) { if (a <= 0.02 || rx < 2) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.ellipseRing(Math.round(cx), Math.round(cy), Math.round(rx), Math.max(1, Math.round(ry)), col); c.globalAlpha = p; }
function box(g, x, y, w, h, col, a) { if (a <= 0.02 || w < 1 || h < 1) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), col); c.globalAlpha = p; }

const ENV_OF = s => (s.inferno ? 'inferno' : s.miasma ? 'miasma' : s.caveAdd ? 'cave' : s.galeAdd === 'storm' ? 'storm' : s.galeAdd || (s.hex || []).some(h => h.id === 'gale') ? 'gale' : s.bell || (s.trapSet ? 'thornTrap' : s.orbTrap ? 'orbTrap' : null));
export function castKind(s) {
  if (!s) return 'self';
  if (s.bell) return 'bell';
  if (s.trapSet || s.orbTrap) return 'ward';
  if (s.inferno || s.miasma || s.caveAdd || s.galeAdd || (s.hex || []).some(h => h.id === 'gale')) return 'field';
  if (s.summon || s.grow || s.volley) return 'summon';
  if (s.act === 'hex') return 'curse';
  return 'self';
}
// 색: 환경 = 그 환경 색 · 거는 효과 = 그 효과 색 · 회복 = 초록 · 그 밖 = 기술 속성 색
const HEAL = '#7ef0a0';
export function castColor(s, kind) {
  const env = ENV_OF(s), fx = (s.hex && s.hex[0] && s.hex[0].id) || s.self || (s.inflict && s.inflict.id);
  if (env && STATUS[env] && STATUS[env].col) return STATUS[env].col;
  if (s.healPct || s.cleanseHeal || s.fruitUse === 'eat' || s.revive || s.self === 'regen') return HEAL;
  if (kind === 'curse' && fx && STATUS[fx] && STATUS[fx].col) return STATUS[fx].col;
  return (ELEMENT[s.el] || {}).light || '#9ff0ff';
}
// 쓰는 식물 몸놀림(drawBigPose qx · qy · sq — sq + = 눌림 · − = 늘어남): 모으며 웅크림 → 터뜨릴 때 쭉 늘어남(땅을 치는 것은 꾹 눌림) → 돌아옴
export function castPose(C, t) {
  const age = t - C.t0, prep = ioQ(cl((age - PREP[0]) / (PREP[1] - PREP[0]))), back = 1 - oQ(cl((age - REL - 90) / 420));
  if (age < REL) return { qx: 0, qy: Math.round(prep), sq: 1.3 * prep, flash: false };
  const stomp = C.kind === 'field' || C.kind === 'ward';
  return { qx: 0, qy: Math.round((stomp ? 2 : -2) * back), sq: (stomp ? 2 : -1.6) * back, flash: C.kind === 'self' && age < REL + 70 };
}
// 땅 치기 흔들림(환경 · 설치 — 1칸 · 3장)
export function castShake(C, t) { const age = t - C.t0; return (C.kind === 'field' || C.kind === 'ward') && age >= REL && age < REL + 150 ? [Math.floor((age - REL) / 50) % 2 ? 1 : -1, 1] : [0, 0]; }
// 상대에게 거는 것(curse)이 닿는 순간 맞는 쪽 움찔(1~2칸)
export const curseHit = C => (C && C.kind === 'curse' ? REL + 520 : null);
export function targetKick(C, t) { const h = curseHit(C); if (h == null) return 0; const k = t - C.t0 - h; return k >= 0 && k < 150 ? (Math.floor(k / 50) % 2 ? 1 : -2) : 0; }
// ㉥ 시안(2026-10-29 사용자 '상대카드도 설명이 많아지면 읽을 시간이 부족할 거 같은데' → 글 대신 아이콘): 이 기술이 거는 효과(상태 id · 아이콘이 있는 것만 · 최대 셋)
//  환경 · 거는 것(hex · inflict · inflicts) · 나에게(self · also · 첫째/둘째 쓸 때 덤)
export function fxIdsOf(s) {
  if (!s || s.swap) return [];
  const out = [], add = id => { if (id && STATUS[id] && STATUS[id].icon && !out.includes(id)) out.push(id); };
  add(ENV_OF(s));
  for (const h of s.hex || []) add(h.id);
  for (const o of [s, s.onFirst, s.onSecond]) if (o) { if (o.inflict) add(o.inflict.id); for (const f of o.inflicts || []) add(f.id); add(o.self); add(o.also); }
  return out.slice(0, 3);
}
// 효과음: 모으기 · 터뜨림(종류마다)
export const CAST_SFX = { self: 'release', curse: 'whoosh', field: 'slam', bell: 'purify', ward: 'slam', summon: 'spore' };

// ── 특수 시전(2026-10-29 밤샘 — 사용자 '각 스킬별 특수한 건 모션 만들고'): 공용 모양 위에 그 기술만의 장면을 덧그림(예고 → 터짐 → 결과가 몸에 남음 — auras.js 지속 표시로 이어짐) ──
//  부활잉 = 금빛 고리가 내려와 머리 위에 앉음 · 죽은 줄 알았나? = 혼이 빠져나갔다 쑥 돌아옴 · 냉기 응축 = 얼음 조각이 모여 열매가 맺힘 · 열매 먹기 = 열매를 한입에 · 알 깨기 = 알이 금 가며 깨져 기운이 솟음
export const castSpecial = s => (!s ? null : s.revive ? 'revive' : s.fakeDeath ? 'ghost' : s.fruitCondense ? 'condense' : s.fruitUse === 'eat' ? 'eat' : s.selfMore ? 'egg' : s.taste ? 'taste' : s.inject ? 'inject' : s.cycle ? 'cycle' : s.bounce ? 'bounce'
  : s.settle ? 'settle' : s.onFirst && s.onFirst.harmony ? 'harmony' : s.self === 'stealth' && typeof s.pierceReflect === 'number' ? 'melt' : s.self === 'stealth' && s.link && s.pierceReflect ? 'freq'
  : s.onFirst && s.onFirst.self && s.onSecond && s.onSecond.self ? 'shout' : s.cleanseHeal ? 'rain' : s.infuse ? 'infuse' : null);
//  (2026-10-29 오후 — 사용자 '나머지 3개 진행하자') 청산 = 물결이 상대를 쓸고 지나가며 상태이상 색 구슬을 뽑아 터뜨림 · 조화 = 두 식물 사이를 빛줄기 둘이 엇갈려 꼬이며 이음
//  은시잉 = 말랑한 몸에서 물결 고리가 퍼지고 물방울이 떨어지며 흐려짐 · 환각의 주파수 = 음파 줄이 몸을 위아래로 훑고 양옆으로 ))) · 기합 = 머리 위 큰 '!' + 빛살
//  치유의 물 = 물방울이 떨어져 튀고 초록 십자 · 불타는 의지 = 머리 위 칼을 불길이 감싸다 몸으로 쑥
//  맛평가 = 긴 혀가 상대 쪽으로 쭉 뻗어 핥고 돌아옴 · 좋은 거 주입 = 주사기가 위에서 꽂혀 보라 약이 들어감 · 윤회 = 물 고리 둘이 엇갈려 돌며 상대를 감쌈 · 너꺼잉 = 말랑한 막이 출렁이며 부풀었다 줄어듦
const GHOST = ['..xxxx..', '.xwwwwx.', 'xwbwwbwx', 'xwwwwwwx', 'xwwwwwwx', 'xwwwwwwx', 'xwxwwxwx', '.x.xx.x.'], EGG = ['..xxx..', '.xwwwx.', 'xwwbwwx', 'xwwwwwx', 'xbwwwbx', 'xwwwwwx', '.xwwwx.', '..xxx..'];
const FRUIT = ['..g..', '.xxx.', 'xwlbx', 'xllbx', 'xbbbx', '.xxx.'], PLUS = ['.p.', 'ppp', '.p.'];
function pix(g, x, y, rows, pal, a = 1, s = 2) { const w = rows[0].length * s, h = rows.length * s; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') dot(g, x - w / 2 + i * s, y - h / 2 + j * s, pal[ch], a, s); })); }
function pixO(g, x, y, rows, pal, a = 1, s = 2) { const ink = Object.fromEntries(Object.keys(pal).map(k => [k, '#1a1424'])); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) pix(g, x + dx, y + dy, rows, ink, a * 0.9, s); pix(g, x, y, rows, pal, a, s); }   // 둘레 먹선 1칸
const DROP = ['..x..', '.xbx.', '.xbx.', 'xbbbx', 'xbwbx', 'xbbbx', '.xxx.'], BANG = ['yy', 'yy', 'yw', 'yy', 'yy', '..', 'yy', 'yy'];
const SWORD = ['..x..', '.xlx.', '.xlx.', '.xsx.', '.xsx.', '.xsx.', '.xsx.', 'xgggx', '..b..', '..b..', '.xgx.'];
function special(g, C, age, x, y, cy, tx, ty) {
  const side = C.who === 'me' ? 1 : -1, head = cy - 40;
  if (C.sp === 'revive') {   // 금빛 고리가 위에서 내려와 머리 위에 앉고 · 금빛 십자가 몸 둘레에서 떠오름
    const u = oQ(cl((age - 160) / 520)), fade = 1 - cl((age - 1050) / 250), hy = head - 46 + 40 * u;
    if (age > 160) { ring(g, x, hy, 15, 4, '#ffd84a', fade); ring(g, x, hy + 1, 13, 3, '#fff4c0', 0.8 * fade); ring(g, x, hy - 1, 17, 5, '#b8862a', 0.5 * fade); }
    for (let k = 0; k < 6; k++) { const b = age - 420 - k * 90, q = cl(b / 600); if (b < 0 || q >= 1) continue; pix(g, x + (k % 2 ? 1 : -1) * (14 + (k % 3) * 8), y - 10 - q * 60, PLUS, { p: k % 2 ? '#ffd84a' : '#fff4c0' }, Math.sin(Math.PI * q), 2); }
  } else if (C.sp === 'ghost') {   // 혼(흰 유령)이 몸에서 빠져나와 위로 떠올라 흔들리다 · 쑥 돌아옴(돌아올 때 흰 고리)
    const out = oQ(cl((age - 140) / 420)), back = cl((age - 820) / 160), hy = cy - 4 - 44 * out * (1 - back), wob = Math.sin(age / 70) * 3 * (1 - back);
    if (age > 140 && back < 1) pix(g, x + wob, hy, GHOST, { x: '#4a4a66', w: '#e8eef8', b: '#1a1424' }, 0.85 * (1 - back * 0.5), 2);
    if (back >= 1 && age < 1150) { const q = cl((age - 980) / 170); ring(g, x, cy, 8 + 26 * q, (8 + 26 * q) * 0.7, '#ffffff', 1 - q); }
  } else if (C.sp === 'condense') {   // 얼음 조각 여덟이 돌며 내 옆 한 점으로 모여 → 열매가 톡 맺힘(반짝 고리)
    const fx = x + side * 30, fy = cy - 8, u = cl((age - 140) / 560);
    if (u < 1) for (let k = 0; k < 8; k++) { const a = k * 0.785 + u * 4, R = 34 * (1 - ioQ(u)) + 2; dot(g, fx + Math.cos(a) * R - 1, fy + Math.sin(a) * R * 0.8 - 1, k % 2 ? '#ffffff' : '#8ad6f0', 0.4 + 0.6 * u, 3); }
    if (age >= 700) { const q = cl((age - 700) / 260), fade = 1 - cl((age - 1100) / 200); pix(g, fx, fy, FRUIT, { g: '#6fd25c', x: '#1a1424', w: '#ffffff', l: '#bfefff', b: '#4a9ad8' }, fade, 2); ring(g, fx, fy, 6 + 16 * q, (6 + 16 * q) * 0.8, '#dcf6ff', 1 - q); }
  } else if (C.sp === 'eat') {   // 옆에 열매가 맺혀 → 머리로 휙 날아가 한입(흰 고리) → 초록 십자가 떠오름(회복)
    const fx = x + side * 30, fy = cy - 8;
    if (age >= 140 && age < 700) { const u = cl((age - 460) / 240), px = fx + (x - fx) * ioQ(u), py = fy + (head - fy) * ioQ(u) - Math.sin(Math.PI * u) * 16, sc = age < 300 ? 1 : 2; pix(g, px, py, FRUIT, { g: '#6fd25c', x: '#1a1424', w: '#ffffff', l: '#bfefff', b: '#4a9ad8' }, 1, sc); }
    if (age >= 700 && age < 1000) { const q = cl((age - 700) / 300); ring(g, x, head, 6 + 20 * q, (6 + 20 * q) * 0.7, '#ffffff', 1 - q); }
    for (let k = 0; k < 5; k++) { const b = age - 760 - k * 80, q = cl(b / 480); if (b < 0 || q >= 1) continue; pix(g, x + (k - 2) * 9, head + 6 - q * 34, PLUS, { p: '#7ef0a0' }, Math.sin(Math.PI * q), 2); }
  } else if (C.sp === 'egg') {   // 머리 위에 알이 톡 생겨 흔들리다 · 금이 가며(번개 금) 두 쪽으로 깨지고 조각이 튐 → 주황 기운이 솟음(공격 · 기동 ↑)
    const ex = x, ey = head - 18, born = cl((age - 140) / 160);
    if (age >= 140 && age < 560) { const wob = age > 300 ? Math.sin(age / 30) * 2 : 0; pix(g, ex + wob, ey, EGG, { x: '#1a1424', w: '#f4f8ff', b: '#8ad6f0' }, born, 3); if (age > 420) for (const [dx, dy] of [[-4, -2], [-2, 0], [0, -2], [2, 0], [4, -2]]) dot(g, ex + wob + dx, ey + dy, '#1a1424', 1, 2); }
    if (age >= 560 && age < 1100) { const q = cl((age - 560) / 420); for (const s of [-1, 1]) pix(g, ex + s * (4 + 26 * oQ(q)), ey + 30 * q * q - 6 * Math.sin(Math.PI * q), s < 0 ? EGG.slice(0, 4) : EGG.slice(4), { x: '#1a1424', w: '#f4f8ff', b: '#8ad6f0' }, 1 - q, 3);
      for (let k = 0; k < 8; k++) { const a = k * 0.785, d = 6 + 30 * oQ(q); dot(g, ex + Math.cos(a) * d, ey + Math.sin(a) * d * 0.8, k % 2 ? '#ffffff' : '#dcf6ff', 1 - q, 2); } }
    for (let k = 0; k < 6; k++) { const b = age - 640 - k * 60, q = cl(b / 520); if (b < 0 || q >= 1) continue; dot(g, x + (k - 2.5) * 7, y - 10 - q * 70, k % 2 ? '#ffb040' : '#ff6a3a', Math.sin(Math.PI * q), 3); }
  } else if (C.sp === 'taste' && tx != null) {   // 맛평가: 입(머리)에서 분홍 혀가 상대 쪽으로 쭉 뻗어(침 방울) 핥고 돌아옴
    const out = age < 760 ? ioQ(cl((age - 300) / 300)) : 1 - ioQ(cl((age - 760) / 260)), ex = tx, ey = ty - 46, n = 56;
    for (let i = 0; i <= n * out; i++) { const v = i / n, px = x + (ex - x) * v * 0.62, py = head + (ey - head) * v * 0.62 - Math.sin(Math.PI * v) * 14; dot(g, px - 3, py - 3, '#1a1424', 0.9, 6); }   // 먹선 먼저(혀 몸이 위를 덮음)
    for (let i = 0; i <= n * out; i++) { const v = i / n, px = x + (ex - x) * v * 0.62, py = head + (ey - head) * v * 0.62 - Math.sin(Math.PI * v) * 14; dot(g, px - 2, py - 2, i > n * out - 4 ? '#ffb8d0' : '#e8507e', 1, 4); dot(g, px - 1, py - 2, '#ff9ab8', 0.8, 1); }
    if (out > 0.8 && age < 900) for (let k = 0; k < 3; k++) { const q = cl((age - 560 - k * 70) / 300); if (q > 0 && q < 1) dot(g, x + (ex - x) * 0.55 + (k - 1) * 4, head + (ey - head) * 0.55 + q * 18, '#bfefff', 1 - q, 2); }
  } else if (C.sp === 'inject') {   // 좋은 거 주입: 주사기가 위에서 내려와 몸에 꽂히고(톡) 보라 약 줄이 줄어들며 들어감 → 초록 기운
    const down = oQ(cl((age - 140) / 320)), px = x + side * 10, py = head - 40 + 30 * down, left = 1 - cl((age - 520) / 420), fade = 1 - cl((age - 1050) / 220);
    if (age > 140) { box(g, px - 3, py - 22, 7, 20, '#1a1424', fade); box(g, px - 2, py - 21, 5, 18, '#e8eef8', fade); box(g, px - 2, py - 21 + Math.round(18 * (1 - left)), 5, Math.round(18 * left), '#9a5ad0', fade); box(g, px - 5, py - 24, 11, 3, '#9aa8c0', fade); box(g, px, py - 2, 1, 7, '#c8d4e4', fade); }
    if (age > 460 && age < 760) { const q = cl((age - 460) / 300); ring(g, px, py + 5, 4 + 14 * q, (4 + 14 * q) * 0.7, '#c890f0', 1 - q); }
    for (let k = 0; k < 5; k++) { const b = age - 700 - k * 70, q = cl(b / 460); if (b < 0 || q >= 1) continue; pix(g, x + (k - 2) * 9, head + 10 - q * 30, PLUS, { p: '#7ef0a0' }, Math.sin(Math.PI * q), 2); }
  } else if (C.sp === 'cycle' && tx != null) {   // 윤회: 물 고리 둘(하늘 · 남)이 상대 몸 둘레를 엇갈려 돌며 조여 들고 마지막에 흰 빛
    const u = cl((age - 420) / 620), ey = ty - 46, R = 34 - 18 * oQ(u), fade = age < 1100 ? 1 : 1 - cl((age - 1100) / 200);
    if (age > 420) for (let k = 0; k < 2; k++) for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + (k ? -1 : 1) * age / 160 + k * 1.57; if (Math.cos(a * 2) < -0.2) continue; dot(g, tx + Math.cos(a) * R, ey + Math.sin(a) * R * 0.75, k ? '#3a7ad0' : '#bfefff', fade, 3); }
    if (age > 980 && age < 1200) { const q = cl((age - 980) / 220); ring(g, tx, ey, 6 + 24 * q, (6 + 24 * q) * 0.75, '#ffffff', 1 - q); }
  } else if (C.sp === 'bounce') {   // 너꺼잉: 말랑한 막이 몸을 감싸며 출렁(가로세로가 번갈아 늘었다 줄었다) · 테두리에 빛
    const u = cl((age - 400) / 820), wob = Math.sin(u * Math.PI * 4) * (1 - u), rx = 30 * (1 + 0.18 * wob), ry = 40 * (1 - 0.18 * wob), fade = 1 - cl((age - 1100) / 200);
    if (age > 400) { ring(g, x, cy - 4, rx, ry, '#8ad8ff', 0.85 * fade); ring(g, x, cy - 4, rx - 2, ry - 2, '#ffffff', 0.5 * fade); ring(g, x, cy - 4, rx + 2, ry + 2, '#2a6aa8', 0.6 * fade); }
  } else if (C.sp === 'settle' && tx != null) {   // 청산: 물결 띠가 상대를 쓸고 지나감 → 걸린 상태이상(색 구슬)이 뽑혀 올라가 흰 빛으로 터짐
    const ey = ty - 46, u = cl((age - 420) / 420), wx = tx - side * 46 + side * 92 * ioQ(u), fade = 1 - cl((age - 1100) / 200), COLS = ['#b866e8', '#ff6a3a', '#ff4a5a', '#ffd84a'];
    if (age > 420 && u < 1) { box(g, wx - 6, ey - 38, 12, 76, '#8fd3ff', 0.45); box(g, wx - 2, ey - 38, 4, 76, '#ffffff', 0.75); for (let k = 0; k < 6; k++) dot(g, wx - side * (9 + k * 3), ey - 30 + k * 12, '#bfefff', 0.7, 3); }
    for (let k = 0; k < 4; k++) { const b = age - 640 - k * 70, q = cl(b / 420); if (b < 0) continue; const ox = tx + (k - 1.5) * 13, oy = ey + 8 - q * 56;
      if (q < 0.85) { dot(g, ox - 4, oy - 4, '#1a1424', fade, 8); dot(g, ox - 3, oy - 3, COLS[k], fade, 6); dot(g, ox - 2, oy - 3, '#ffffff', fade, 2); }
      else { const p = (q - 0.85) / 0.15; for (let a = 0; a < 6; a++) dot(g, ox + Math.cos(a * 1.05) * 9 * p - 1, oy + Math.sin(a * 1.05) * 9 * p - 1, '#ffffff', 1 - p, 3); } }
  } else if (C.sp === 'harmony' && tx != null) {   // 조화: 두 식물 사이를 하늘 · 흰 빛줄기가 엇갈려 꼬이며 이어지고 → 양쪽에 고리
    const u = cl((age - 420) / 480), fade = 1 - cl((age - 1080) / 220), ex = tx, ey = ty - 46, n = 44;
    for (let k = 0; k < 2; k++) for (let i = 0; i <= n * u; i++) { const v = i / n, px = x + (ex - x) * v, py = cy + (ey - cy) * v - Math.sin(Math.PI * v) * 26 + Math.sin(v * Math.PI * 4 + k * Math.PI + age / 120) * 7; dot(g, px - 1, py - 1, k ? '#ffffff' : '#8fd3ff', fade * 0.9, 3); }
    if (age > 900) { const q = cl((age - 900) / 300); for (const [px, py] of [[x, cy], [ex, ey]]) { ring(g, px, py, 8 + 22 * q, (8 + 22 * q) * 0.75, '#dcf6ff', 1 - q); ring(g, px, py, 7 + 22 * q, (7 + 22 * q) * 0.75, '#8fd3ff', 0.6 * (1 - q)); } }
  } else if (C.sp === 'melt') {   // 은시잉: 말랑한 몸에서 물결 고리 셋이 퍼지고 물방울이 톡톡 떨어짐 → 흐려짐(은신 — 지속 표시는 흐린 몸)
    for (let k = 0; k < 3; k++) { const b = age - 420 - k * 140, q = cl(b / 520); if (b < 0 || q >= 1) continue; const R = 6 + 42 * oQ(q); ring(g, x, cy + 6, R, R * 0.6, '#8ad8ff', 1 - q); ring(g, x, cy + 6, R + 1, (R + 1) * 0.6, '#ffffff', 0.55 * (1 - q)); ring(g, x, cy + 6, R - 1, (R - 1) * 0.6, '#2a6aa8', 0.5 * (1 - q)); }
    for (let k = 0; k < 5; k++) { const b = age - 500 - k * 90, q = cl(b / 380); if (b < 0 || q >= 1) continue; pix(g, x + (k - 2) * 12, cy - 30 + q * 50, DROP, { x: '#1a1424', b: '#4a9ad8', w: '#bfefff' }, 1 - q * 0.6, 2); }
  } else if (C.sp === 'freq') {   // 환각의 주파수: 몸을 가로지르는 음파 줄 셋이 위아래로 훑고 · 양옆으로 ))) 퍼짐 → 모습이 흔들리며 사라짐(은신)
    const fade = 1 - cl((age - 1050) / 220);
    if (age > 420) for (let k = 0; k < 3; k++) { const yy = cy - 36 + (((age - 420) / 4 + k * 26) % 80); for (let i = -26; i <= 26; i += 2) dot(g, x + i - 1, yy + Math.sin(i / 4 + age / 60 + k) * 3 - 1, k === 1 ? '#ffffff' : '#c8a8ff', 0.8 * fade, 3); }
    for (let k = 0; k < 3; k++) { const b = age - 460 - k * 150, q = cl(b / 480); if (b < 0 || q >= 1) continue; const R = 16 + 42 * q; for (const s of [-1, 1]) for (let a = -0.6; a <= 0.61; a += 0.12) dot(g, x + s * Math.cos(a) * R - 1, cy + Math.sin(a) * R - 1, '#a884f3', 1 - q, 3); }
  } else if (C.sp === 'shout') {   // 기합: 머리 옆에 큰 '!' 가 톡 튀어나오고 · 머리에서 굵은 빛살 여덟이 확 뻗음 + 둥근 충격 고리
    const pop = oQ(cl((age - 420) / 120)), fade = 1 - cl((age - 1000) / 220);
    if (age > 420) pixO(g, x + side * 28, head + 6 - 6 * pop, BANG, { y: '#ffd84a', w: '#fff4c0' }, fade, 3);   // 머리 옆(위는 기술 이름 띠 자리)
    if (age > 460 && age < 900) { const q = cl((age - 460) / 360); for (let k = 0; k < 8; k++) { const a = k * 0.785 + 0.39; for (let d = 0; d < 3; d++) dot(g, x + Math.cos(a) * (14 + q * 28 + d * 3) - 1, head + 6 + Math.sin(a) * (14 + q * 28 + d * 3) * 0.8 - 1, '#fff4c0', 1 - q, 3); } ring(g, x, head + 6, 10 + 30 * q, (10 + 30 * q) * 0.8, '#ffd84a', 1 - q); }
  } else if (C.sp === 'rain') {   // 치유의 물: 머리 위에서 물방울 여섯이 떨어져 몸에 닿으면 물결로 튐 → 초록 십자가 떠오름(회복)
    for (let k = 0; k < 6; k++) { const b = age - 300 - k * 60, q = cl(b / 360); if (b < 0) continue; const px = x + (hash(k, 3) - 0.5) * 40;
      if (q < 1) pix(g, px, head - 50 + q * 60, DROP, { x: '#1a1424', b: '#4a9ad8', w: '#bfefff' }, 1, 2); else { const p = cl((b - 360) / 220); if (p < 1) ring(g, px, head + 10, 3 + 11 * p, (3 + 11 * p) * 0.5, '#bfefff', 1 - p); } }
    for (let k = 0; k < 5; k++) { const b = age - 780 - k * 70, q = cl(b / 440); if (b < 0 || q >= 1) continue; pix(g, x + (k - 2) * 9, head + 10 - q * 30, PLUS, { p: '#7ef0a0' }, Math.sin(Math.PI * q), 2); }
  } else if (C.sp === 'infuse') {   // 불타는 의지: 머리 위에 칼이 나타나 불길이 감싸고(불티가 타오름) → 칼이 몸으로 쑥 들어감(불 고리)
    const born = cl((age - 200) / 200), dive = ioQ(cl((age - 760) / 220)), sx = x + side * 28 * (1 - dive), sy = head - 4 + dive * 34;   // 머리 옆에서 몸으로(위는 기술 이름 띠 자리)
    if (age > 200 && age < 980) { pixO(g, sx, sy, SWORD, { x: '#1a1424', l: '#ffffff', s: '#c8d4e4', g: '#ffd84a', b: '#8a5a24' }, born, 2);
      for (let k = 0; k < 9; k++) { const q = ((age / 300) + hash(k, 9)) % 1, fx = sx + (hash(k, 4) - 0.5) * 18, fy = sy + 12 - q * 30; dot(g, fx - 1, fy - 1, q < 0.5 ? '#ffb040' : '#ff6a3a', born * Math.sin(Math.PI * q), 3); } }
    if (age > 980 && age < 1250) { const q = cl((age - 980) / 270); ring(g, x, cy, 8 + 26 * q, (8 + 26 * q) * 0.75, '#ff8a3a', 1 - q); ring(g, x, cy, 6 + 26 * q, (6 + 26 * q) * 0.75, '#ffd84a', 0.6 * (1 - q)); }
  }
}
// 메아리(프로스트벨 — 같은 차례에 한 번 더 울림 · 'echo' 단계 0.45초): 머리 높이에서 종소리 고리 둘이 빠르게 퍼지고 · 음 조각 셋이 떠오름
export function drawEcho(g, age, at) {
  if (!at || age < 0 || age > 600) return;
  const [x, y] = at, hy = y - 70;
  for (let k = 0; k < 2; k++) { const b = age - k * 120, u = cl(b / 380); if (b < 0 || u >= 1) continue; const R = 8 + 52 * oQ(u); ring(g, x, hy, R, R * 0.55, '#c4ecff', 1 - u); ring(g, x, hy, R + 1, (R + 1) * 0.55, '#ffffff', 0.6 * (1 - u)); ring(g, x, hy, R - 2, (R - 2) * 0.55, '#6ab0e0', 0.5 * (1 - u)); }
  for (let k = 0; k < 3; k++) { const b = age - 60 - k * 90, q = cl(b / 420); if (b < 0 || q >= 1) continue; const nx = x + (k - 1) * 16 + Math.sin(q * 6 + k) * 3, ny = hy - 6 - q * 28; dot(g, nx, ny, '#ffffff', Math.sin(Math.PI * q), 3); dot(g, nx + 2, ny - 6, '#c4ecff', Math.sin(Math.PI * q), 1); dot(g, nx + 2, ny - 5, '#c4ecff', Math.sin(Math.PI * q), 1); dot(g, nx + 2, ny - 4, '#c4ecff', Math.sin(Math.PI * q), 1); }
}
// 그리기(경기장 판 좌표): C = { who, other, kind, col, t0, sp } · P = { me: [x, 받침 y], foe: [...] }
export function drawCast(g, C, t, P) {
  const age = t - C.t0; if (age < 0 || age > CAST_MS) return;
  const [x, y] = P[C.who], [tx, ty] = P[C.other], cy = y - 46;
  castBase(g, C, age, x, y, cy, tx, ty);
  if (C.sp) special(g, C, age, x, y, cy, tx, ty);   // 그 기술만의 장면은 공용 모양(빛기둥 · 구슬) 위에 — 아래에 그리면 칼 · '!'가 빛기둥에 가렸음(2026-10-29)
}
function castBase(g, C, age, x, y, cy, tx, ty) {
  const col = C.col;
  // 모으기: 빛 알갱이 열둘이 둘레에서 몸 가운데로 모임 + 발밑 고리
  if (age >= PREP[0] && age < REL + 60) {
    const u = cl((age - PREP[0]) / (REL - PREP[0]));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + hash(k, 5) * 0.4, r = 36 * (1 - ioQ(u)) + 3; dot(g, x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, k % 3 ? col : '#ffffff', 0.35 + 0.65 * u, u > 0.6 ? 2 : 1); }
    ring(g, x, y, 10 + 16 * u, (10 + 16 * u) * 0.36, col, 0.5 * u);
  }
  const r = age - REL;
  if (r < 0) return;
  if (C.kind === 'self') {   // 빛기둥: 발밑에서 위로 솟았다 사라짐 + 반짝이가 기둥을 타고 오름
    const rise = oQ(cl(r / 140)), fade = 1 - cl((r - 380) / 360), H = 120 * rise;   // 2026-10-29 녹화: 가운데 흰 줄만 보여 기둥을 넓힘
    box(g, x - 14, y - H, 28, H, col, 0.2 * fade); box(g, x - 7, y - H, 14, H, col, 0.42 * fade); box(g, x - 2, y - H, 4, H, '#ffffff', 0.85 * fade);
    ring(g, x, y, 24 + r / 26, (24 + r / 26) * 0.36, col, 0.8 * fade); ring(g, x, y + 1, 22 + r / 26, (22 + r / 26) * 0.36, '#ffffff', 0.5 * fade);
    for (let k = 0; k < 8; k++) { const b = r - k * 55, u = cl(b / 520); if (b < 0 || u >= 1) continue; dot(g, x + (hash(k, 9) - 0.5) * 28 - 1, y - 8 - u * 104, k % 2 ? '#ffffff' : col, (1 - u) * fade, 3); }
  } else if (C.kind === 'curse') {   // 문양 구슬: 몸 가운데 → 대상 가운데로 휘어 날아가 터짐(마름모 문양이 돌며 꼬리)
    const fly = cl((r - 40) / 480), hit = curseHit(C) - REL;
    const pos = u => { const sx = x, sy = cy, ex = tx, ey = ty - 46, mx = (sx + ex) / 2, my = Math.min(sy, ey) - 38; return [(1 - u) ** 2 * sx + 2 * (1 - u) * u * mx + u * u * ex, (1 - u) ** 2 * sy + 2 * (1 - u) * u * my + u * u * ey]; };
    if (r >= 40 && r < hit) {   // 2026-10-29 녹화: 5칸 구슬은 폰에서 점으로만 보여 2배(10칸) + 빛무리 + 굵은 꼬리
      for (let k = 1; k <= 8; k++) { const [px, py] = pos(Math.max(0, ioQ(fly) - k * 0.03)); dot(g, px - 1, py - 1, k < 3 ? '#ffffff' : col, 0.85 - k * 0.09, k < 4 ? 3 : 2); }
      const [ox, oy] = pos(ioQ(fly)), rot = Math.floor(r / 70) % 2;
      const c = g.c, p = c.globalAlpha; c.globalAlpha = p * (0.3 + 0.12 * rot); g.disc(Math.round(ox), Math.round(oy), 9, col); c.globalAlpha = p;
      const D = rot ? ['..x..', '.xox.', 'xowox', '.xox.', '..x..'] : ['.x.x.', 'xoxox', '.xwx.', 'xoxox', '.x.x.'];
      D.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') dot(g, ox - 5 + i * 2, oy - 5 + j * 2, ch === 'x' ? '#1a1424' : ch === 'w' ? '#ffffff' : col, 1, 2); }));
    }
    const b = r - hit;
    if (b >= 0 && b < 460) {   // 닿음: 고리가 번지고 조각 열둘이 튐
      const u = cl(b / 460), ey = ty - 46;
      if (b < 70) { const c = g.c, p = c.globalAlpha; c.globalAlpha = p * 0.55; g.disc(Math.round(tx), Math.round(ey), 12, '#ffffff'); c.globalAlpha = p; }
      ring(g, tx, ey, 6 + 34 * oQ(u), (6 + 34 * oQ(u)) * 0.8, col, 1 - u); ring(g, tx, ey, 5 + 34 * oQ(u), (5 + 34 * oQ(u)) * 0.8, col, 0.7 * (1 - u)); ring(g, tx, ey, 2 + 22 * oQ(u), (2 + 22 * oQ(u)) * 0.8, '#ffffff', 0.7 * (1 - u));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, d = 8 + 30 * oQ(u); dot(g, tx + Math.cos(a) * d - 1, ey + Math.sin(a) * d * 0.8 - 1, k % 2 ? col : '#ffffff', 1 - u, u < 0.5 ? 3 : 2); }
    }
  } else if (C.kind === 'field') {   // 땅을 치면 물결이 바닥을 타고 대상 받침까지 건너감(도착하면 그 땅에 환경이 깔림 — fieldfx 깔림 고리)
    // 2026-10-29 녹화: 13×4 고리는 폰에서 거의 안 보여 → 고리 2배 · 지나간 길에 빛 자국(그 환경 색)이 남았다 사그라듦 · 머리에서 흙 · 불티가 튐
    const u = cl((r - 40) / 560), at = v => [x + (tx - x) * ioQ(v), y + (ty - y) * ioQ(v)], persp = v => 1 - 0.25 * ioQ(v);
    if (r < 240) { const k = cl(r / 240); ring(g, x, y, 14 + 40 * k, (14 + 40 * k) * 0.36, col, 1 - k); ring(g, x, y + 1, 12 + 40 * k, (12 + 40 * k) * 0.36, '#ffffff', 0.6 * (1 - k)); }
    const fade = 1 - cl((r - 600) / 240);
    for (let s = 0; s < 18; s++) {   // 지나간 길(받침 → 받침): 머리가 지난 곳만 · 오래된 곳부터 흐려짐
      const v = s / 18; if (v > u) break;
      const [px, py] = at(v), age = u - v, w = Math.round(6 * persp(v));
      box(g, px - w, py - 1, w * 2, 2, col, (0.55 - age * 0.5) * fade);
      if (s % 2) dot(g, px + (hash(s, 7) - 0.5) * w * 2, py - 2 - hash(s, 8) * 3 - age * 10, s % 4 === 1 ? '#ffffff' : col, (0.9 - age) * fade, 2);
    }
    if (u > 0 && u < 1) for (let k = 0; k < 4; k++) {
      const v = cl(u - k * 0.05); if (v <= 0) continue;
      const [wx, wy] = at(v), s = (1 - k * 0.18) * persp(v);
      ring(g, wx, wy, 24 * s, 8 * s, k ? col : '#ffffff', (k ? 0.8 : 1) * (1 - k * 0.2)); if (!k) ring(g, wx, wy + 1, 22 * s, 7 * s, col, 0.9);
      if (k === 0) for (let d = 0; d < 8; d++) dot(g, wx + (hash(d, Math.floor(r / 60)) - 0.5) * 34 * s, wy - 3 - hash(d, 3) * 10, d % 3 ? col : '#ffffff', 0.9, 2);
    }
  } else if (C.kind === 'bell') {   // 종소리: 머리 높이에서 고리 셋이 차례로 크게 퍼짐(경기장 전체)
    for (let k = 0; k < 3; k++) { const b = r - k * 170, u = cl(b / 640); if (b < 0 || u >= 1) continue; const R = 8 + 120 * oQ(u); ring(g, x, y - 70, R, R * 0.55, col, 1 - u); ring(g, x, y - 70, R + 1, (R + 1) * 0.55, col, (1 - u) * 0.7); ring(g, x, y - 70, R - 2, (R - 2) * 0.55, '#ffffff', (1 - u) * 0.6); }
  } else if (C.kind === 'ward') {   // 설치: 내 받침 둘레에 굵은 고리 둘이 번지고 흙 · 빛 알갱이가 튐(2026-10-29 녹화: 1칸 고리 · 흙은 폰에서 거의 안 보여 굵게)
    for (let k = 0; k < 2; k++) { const b = r - k * 150, u = cl(b / 560); if (b < 0 || u >= 1) continue; const R = 16 + 60 * oQ(u); ring(g, x, y, R, R * 0.36, col, 1 - u); ring(g, x, y + 1, R - 1, (R - 1) * 0.36, col, 0.8 * (1 - u)); ring(g, x, y - 1, R - 3, (R - 3) * 0.36, '#ffffff', 0.6 * (1 - u)); }
    for (let d = 0; d < 14; d++) { const u = cl(r / 480), a = (d / 14) * Math.PI * 2 + 0.2; if (u >= 1) break; dot(g, x + Math.cos(a) * 36 * oQ(u) - 1, y + Math.sin(a) * 12 * oQ(u) - Math.sin(Math.PI * u) * 14, d % 3 ? '#cdb48a' : col, 1 - u, 2); }
  } else if (C.kind === 'summon') {   // 소환: 포자 알갱이 셋이 내 옆 자리로 톡톡 떨어지고 떨어진 자리에 작은 고리(2026-10-29 녹화: 3칸 알갱이는 폰에서 점이라 2배)
    for (let k = 0; k < 3; k++) {
      const b = r - k * 110; if (b < 0) continue;
      const ex = x + (C.who === 'me' ? -1 : 1) * (28 + k * 16), ey = y - 6 + k * 3;
      if (b < 460) {
        const u = b / 460, mx = (x + ex) / 2, my = cy - 34, px = Math.round((1 - u) ** 2 * x + 2 * (1 - u) * u * mx + u * u * ex), py = Math.round((1 - u) ** 2 * cy + 2 * (1 - u) * u * my + u * u * ey);
        g.disc(px, py, 5, '#3a2a10'); g.disc(px, py, 4, col); dot(g, px - 2, py - 2, '#ffffff', 1, 2);
      } else if (b < 760) { const u = (b - 460) / 300; ring(g, ex, ey, 6 + 12 * oQ(u), (6 + 12 * oQ(u)) * 0.4, col, 1 - u); ring(g, ex, ey, 4 + 9 * oQ(u), (4 + 9 * oQ(u)) * 0.4, '#ffffff', 0.7 * (1 - u)); }
    }
  }
}
