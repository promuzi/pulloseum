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

// 그리기(경기장 판 좌표): C = { who, other, kind, col, t0 } · P = { me: [x, 받침 y], foe: [...] }
export function drawCast(g, C, t, P) {
  const age = t - C.t0; if (age < 0 || age > CAST_MS) return;
  const [x, y] = P[C.who], [tx, ty] = P[C.other], col = C.col, cy = y - 46;
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
