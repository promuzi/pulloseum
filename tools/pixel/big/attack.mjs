// 종별 공격 연출 — 무대(왼쪽 공격·오른쪽 대상) 장면을 장마다 그린다. convert.mjs --attack 이 부른다.
// 근거: saint11 "Impact"(대기 → 준비 → 동작 → 넘침 → 정지 · 준비가 있어야 세게 느껴짐 · 중간 장을 빼서 빠르게 + 잔상 · 대상이 튕기며 반응 ·
//       화면과 대상 흔들기 · 맞기 직전 한 장 멈춤), "Electricity"(벼락 순서), "Fire"·"Explosion"(밝은 속 → 고리 → 파편 → 연기), "Wind"(입자·고리).
// 큰 모양(불덩이·폭발·베기·물방울·돌가시·파도)은 어두운 1칸 테두리를 둘러(o 층) 복잡한 몸 위에서도 읽히게, 잔 입자는 그냥(p 층).
// 속성 성질(로드맵 #14)을 맞은 쪽에 보인다: 불 = 화상, 물 = 젖음, 풀 = 가시·흡수, 번개 = 감전, 대지 = 둔화(먼지·부스러기), 바람 = 교란(머리 둘레 소용돌이).
// 한 바퀴 = FRA장 × 0.05초. 크기는 96칸 식물에 맞춰(2026-10-15 실측: 처음 크기는 몸 위에서 묻힘 → 약 1.8배).
import { rng } from './engine.mjs';
import { zigzag, fillBolt, strokePx } from './motion.mjs';

export const FRA = 48;
const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const ease = u => 1 - (1 - u) ** 3;
export const ATTACKS = {
  flower_grass: { kind: 'slash', move: 'lunge', c: ['#ffffff', '#d8f8b0', '#7cc850', '#2e5a26'], petal: ['#f6a0b4', '#d8607a'], status: 'thorn' },
  thorn: { kind: 'whip', move: 'lunge', c: ['#f0f4c8', '#a8c860', '#5a7a30', '#24381a'], status: 'thorn' },
  aqua: { kind: 'bubbles', move: 'cast', c: ['#f4feff', '#a8e4f8', '#5ab0e0', '#244e88'], status: 'wet' },
  flower_wind: { kind: 'gale', move: 'cast', c: ['#ffffff', '#e4d8fa', '#b49ae8', '#5a4a98'], petal: ['#d8b8f8', '#a888e0'], status: 'swirl' },
  spark: { kind: 'bolt', move: 'cast', c: ['#ffffff', '#fff4b0', '#ffd84a', '#c87a20'], status: 'shock' },
  vine_water: { kind: 'wave', move: 'lunge', c: ['#f4feff', '#9ad8f0', '#4a98d0', '#22487e'], status: 'wet' },
  cactus_fire: { kind: 'fireball', move: 'cast', c: ['#fff6c8', '#ffc848', '#f26a22', '#8a2416'], status: 'burn' },
  gaia: { kind: 'slam', move: 'slam', c: ['#f0dcb0', '#c8a46a', '#8a6640', '#3e2e1e'], gem: '#7fe8e0', status: 'dust' },
  flower_fire: { kind: 'bloom', move: 'cast', c: ['#fff6c8', '#ffc848', '#f26a22', '#8a2416'], status: 'burn' },
  cactus_wind: { kind: 'rings', move: 'cast', c: ['#ffffff', '#e2e8fa', '#a8b4e0', '#4a5690'], status: 'swirl' },
  vine_wind: { kind: 'blades', move: 'lunge', c: ['#ffffff', '#e8e0fa', '#b0a0e8', '#4c3e90'], status: 'swirl' },
  spore_cap: { kind: 'spores', move: 'cast', c: ['#fffbd8', '#f8e488', '#d0b050', '#6a5a28'], status: 'spore' },
};
export const impactAt = A => ({ slash: 15, whip: 15, bolt: 14, blades: 17, slam: 19, wave: 19, bubbles: 19, gale: 19, rings: 19, fireball: 20, bloom: 20, spores: 21 })[A.kind] || 18;

// 공격하는 쪽 몸놀림: 0~5 대기, 6~11 준비(점점), 12 멈춤, 13~14 동작, 15 넘침, 16~23 복귀
export function attackerPose(f, A) {
  const prep = sm(5.5, 11.5, f), hold = f === 12, back = f > 15 ? 1 - ease(Math.min(1, (f - 15) / 8)) : 1;
  if (A.move === 'slam') {
    if (f <= 12) return { qx: -Math.round(2 * prep), qy: -Math.round(4 * prep), sq: -1.5 * prep };
    if (f <= 15) return { qx: 2, qy: 3, sq: 2 };
    return { qx: Math.round(2 * back), qy: Math.round(3 * back), sq: 2 * back };
  }
  const reach = A.move === 'lunge' ? 8 : 4;
  if (f <= 11 || hold) return { qx: -Math.round((A.move === 'lunge' ? 4 : 3) * prep), qy: Math.round(prep), sq: 1.2 * prep };
  if (f <= 14) return { qx: reach, qy: -1, sq: -1.2 };
  if (f === 15) return { qx: reach + 1, qy: 0, sq: -0.6 };
  return { qx: Math.round((reach + 1) * back), qy: 0, sq: -0.6 * back };
}
export function targetPose(f, I) {
  const k = f - I;
  if (k < 0) return { kb: 0, flash: false, shake: 0 };
  return { kb: k <= 1 ? 5 : Math.round(5 * (1 - ease(Math.min(1, (k - 1) / 7)))), flash: k === 0, shake: k <= 3 ? (k % 2 ? 1 : -1) : 0 };
}
export const cameraShake = (f, A, I) => { const k = f - I, slam = A.move === 'slam' && f >= 13 && f <= 16; return (k >= 0 && k <= 2) || slam ? [k % 2 ? 2 : -2, slam ? (f % 2 ? 1 : -1) : 0] : [0, 0]; };

// ── 그리기 도구(무대 좌표). P = { o(x,y,색) = 테두리 층, p(x,y,색) = 입자 층 } ──
function disc(put, cx, cy, r, col) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) put(x, y, col); }
function ringPx(put, cx, cy, r, col, keep = () => true, sy = 1, thick = 1) { for (let t = 0; t < thick; t++) { const rr = r - t, n = Math.max(8, Math.round(rr * 7)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if (keep(a)) put(Math.floor(cx + Math.cos(a) * rr), Math.floor(cy + Math.sin(a) * rr * sy), col); } } }
function line(put, a, b, col, thick = 1) { for (const [x, y] of strokePx([a, b])) { put(x, y, col); if (thick > 1) put(x, y + 1, col); } }
function crescent(put, cx, cy, R, a0, a1, w, c0, c1, keep = () => true) {
  for (let y = Math.floor(cy - R - w); y <= cy + R + w; y++) for (let x = Math.floor(cx - R - w); x <= cx + R + w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
    let a = Math.atan2(dy, dx);
    while (a < a0) a += Math.PI * 2;
    if (a > a1) continue;
    const u = (a - a0) / (a1 - a0), ww = w * Math.sin(Math.PI * u) ** 0.7;
    if (r > R || r < R - ww - 0.3 || !keep(u)) continue;
    put(x, y, r > R - ww * 0.45 ? c0 : c1);
  }
}
function particles(put, list, k) { for (const p of list) { if (k < p.t0 || k >= p.t0 + p.life) continue; const t = k - p.t0, x = p.x + p.vx * t, y = p.y + p.vy * t + 0.5 * (p.g || 0) * t * t, ci = Math.min(p.cols.length - 1, Math.floor(t / p.life * p.cols.length)); put(Math.floor(x), Math.floor(y), p.cols[ci]); if (p.size === 2 && t < p.life * 0.6) { put(Math.floor(x) + 1, Math.floor(y), p.cols[ci]); put(Math.floor(x), Math.floor(y) + 1, p.cols[ci]); } } }
function burstParticles(seed, x, y, n, speed, cols, { g = 0.12, life = 10, up = 0, size = 1 } = {}) { const r = rng(seed), out = []; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, s = speed * (0.5 + r() * 0.7); out.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, g, life: life - Math.floor(r() * 3), t0: 0, cols, size }); } return out; }
// 폭발(saint11 Explosion): 0 흰 속 → 1 불 속·고리 → 2 큰 고리·빛살 → 3 깨진 고리·파편 → 4~8 연기 오르며 흐려짐
function explosion(P, x, y, k, c, seed) {
  if (k === 0) { disc(P.o, x, y, 6, c[1]); disc(P.o, x, y, 4, c[0]); }
  if (k === 1) { disc(P.o, x, y, 8, c[2]); disc(P.o, x, y, 6, c[1]); disc(P.o, x, y, 3.5, c[0]); }
  if (k === 2) { ringPx(P.o, x, y, 13, c[2], () => true, 1, 2); disc(P.o, x, y, 7, c[1]); disc(P.o, x, y, 3, c[0]); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; line(P.p, [x + Math.cos(a) * 15, y + Math.sin(a) * 15], [x + Math.cos(a) * 20, y + Math.sin(a) * 20], i % 2 ? c[1] : c[0]); } }
  if (k === 3) { ringPx(P.o, x, y, 16, c[3], a => Math.floor(a * 3) % 2 === 0, 1, 2); disc(P.o, x, y, 5, c[2]); }
  if (k >= 3 && k <= 8) for (let i = 0; i < 5; i++) { const r2 = rng(seed + i), sx = x + (r2() - 0.5) * 22, sy = y - 3 - (k - 3) * 2.2 + (r2() - 0.5) * 8, rr = 4.2 - (k - 3) * 0.6; if (rr > 0.8) disc(P.o, sx, sy, rr, k < 6 ? '#8a8098' : '#5c5670'); }
}
function flameTongue(put, x, y, h, k, c, w = 1) { for (let j = 0; j < h; j++) { const sx = Math.round(Math.sin((k + j) * 1.3) * (j / h) * 1.5), ww = Math.max(0, Math.round(w * (1 - j / h))); for (let s = -ww; s <= ww; s++) put(Math.floor(x + sx + s), Math.floor(y - j), j < h * 0.35 ? c[1] : j < h - 1 ? c[2] : c[3]); } }

// 기술 효과(공격 → 대상). L = 공격 쪽 머리, T = 대상 머리, G = 대상 흙 높이(무대 y)
export function skillFx(P, A, f, L, T, G, seed = 1) {
  const I = impactAt(A), c = A.c, k = f - I;
  switch (A.kind) {
    case 'slash': {   // 장미 칼날 잎 베기: 초승달(흰 속·연두 겉) → 꽉 찬 베기 → 조각 → 흩어짐 + 꽃잎 터짐
      if (k === 0) crescent(P.o, T[0] - 6, T[1], 26, -2.4, 0.9, 5.5, c[0], c[1]);
      if (k === 1) crescent(P.o, T[0] - 6, T[1], 27, -2.6, 1.1, 4.2, c[1], c[2]);
      if (k === 2) crescent(P.o, T[0] - 6, T[1], 28, -2.6, 1.1, 2.6, c[2], c[2], u => Math.floor(u * 6) % 2 === 0);
      if (f === 13 || f === 14) for (let s = 0; s < 3; s++) line(P.p, [L[0] + 6, L[1] - 10 + s * 6], [L[0] + 22, L[1] - 12 + s * 6], c[1]);   // 잔상
      if (k >= 0 && k < 16) particles(P.p, burstParticles(seed, T[0] - 2, T[1] - 2, 9, 2.2, A.petal, { g: 0.1, life: 16, up: 0.8, size: 2 }), k);
      break;
    }
    case 'whip': {   // 가시 채찍: 덩굴 줄이 뻗어(곡선) 끝에서 '딱' 별 → 줄 거두기 + 가시 파편
      const from = [L[0] + 12, L[1] + 2];
      if (f >= 13 && f <= 17) {
        const ext = f === 13 ? 0.55 : f <= 15 ? 1 : f === 16 ? 0.6 : 0.25, to = [from[0] + (T[0] - from[0]) * ext, from[1] + (T[1] - from[1]) * ext], mid = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 14 * ext];
        const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, u = 1 - t; pts.push([u * u * from[0] + 2 * u * t * mid[0] + t * t * to[0], u * u * from[1] + 2 * u * t * mid[1] + t * t * to[1]]); }
        for (const [x, y] of strokePx(pts)) { P.o(x, y, c[1]); P.o(x, y + 1, c[2]); }
      }
      if (k === 0 || k === 1) { disc(P.o, T[0], T[1], 4 - k, c[0]); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.4; line(P.p, [T[0] + Math.cos(a) * 5, T[1] + Math.sin(a) * 5], [T[0] + Math.cos(a) * (11 - k * 2), T[1] + Math.sin(a) * (11 - k * 2)], c[0]); } }
      if (k >= 0 && k < 12) particles(P.p, burstParticles(seed, T[0], T[1], 7, 1.8, ['#f4f0d0', '#c8c098', '#8a8460'], { g: 0.12, life: 12, up: 0.5, size: 2 }), k);
      break;
    }
    case 'bubbles': {   // 물방울 셋: 포물선으로 날아가 터지며 물이 튐
      [0, 2, 4].forEach((d, q) => {
        const t0 = 13 + d, t = f - t0, dur = 6, hx = T[0] - 4 + q * 4, hy = T[1] - 2 + q * 3;
        if (t >= 0 && t < dur) { const u = t / dur, x = L[0] + 8 + (hx - L[0] - 8) * u, y = L[1] + (hy - L[1]) * u - Math.sin(Math.PI * u) * 16; disc(P.o, x, y, 4.5, c[2]); disc(P.o, x, y, 3.2, c[1]); P.o(Math.floor(x) - 2, Math.floor(y) - 2, c[0]); P.o(Math.floor(x) - 1, Math.floor(y) - 2, c[0]); }
        if (t >= dur && t < dur + 12) { const kk = t - dur; if (kk < 3) ringPx(P.o, hx, hy, 4 + kk * 3, kk < 2 ? c[1] : c[2], () => true, 1, 2); particles(P.p, burstParticles(seed + q, hx, hy, 7, 1.7, [c[0], c[1], c[2]], { g: 0.22, life: 12, up: 1.1, size: 2 }), kk); }
      });
      break;
    }
    case 'gale': {   // 꽃잎 돌풍: 굵은 바람결 선 여럿 + 꽃잎이 물결치며 대상으로
      for (let q = 0; q < 7; q++) { const t = f - 13 - (q % 3); if (t < 0 || t > 7) continue; const y = L[1] - 14 + q * 5, head = L[0] + 8 + t * 18; for (let s = 0; s < 16; s++) { const x = head - s, yy = y + Math.sin((x + q * 5) * 0.25) * 2; P.p(Math.floor(x), Math.floor(yy), s < 3 ? c[0] : c[2]); if (s < 8) P.p(Math.floor(x), Math.floor(yy) + 1, c[1]); } }
      for (let q = 0; q < 9; q++) { const t = f - 13 - (q % 4), dur = 7; if (t < 0 || t > dur + 5) continue; const u = Math.min(1, t / dur), x = L[0] + 10 + (T[0] - L[0]) * u + (t > dur ? (t - dur) * 3 : 0), y = L[1] - 12 + q * 3 + Math.sin(t * 0.9 + q) * 4 + (T[1] - L[1]) * u * 0.5; disc(P.o, x, y, 1.6, A.petal[q % 2]); }
      break;
    }
    case 'bolt': {   // 낙뢰(saint11 벼락 순서): 첫 충격 → 하얗게·다른 모양 → 쉼 → 첫 장 조각 → 쉼 → 흩어짐 + 불똥
      const top = [T[0] + 6, -2], ang = Math.atan2(T[1] - top[1], T[0] - top[0]), len = Math.hypot(T[0] - top[0], T[1] - top[1]), first = zigzag(top, ang, len, rng(seed), 7), hw = s => 1.2 + 2.2 * Math.sin(Math.PI * Math.min(1, s * 1.05)) ** 0.5;
      if (k === 0) fillBolt(P.o, first, hw, c[1], c[2]);
      if (k === 1) fillBolt(P.o, zigzag(top, ang + 0.05, len, rng(seed + 1), 7), s => hw(s) * 0.9, c[0], c[1], () => true, 0.8);
      if (k === 3) fillBolt(P.o, first, s => hw(s) * 0.5, c[2], c[2], s => (s > 0.1 && s < 0.3) || (s > 0.45 && s < 0.62) || (s > 0.78 && s < 0.95));
      if (k >= 1 && k <= 4) particles(P.p, burstParticles(seed, T[0], T[1] - 2, 9, 3, [c[0], c[2], c[3]], { g: 0.18, life: 5, size: 2 }), k - 1);
      if (f >= 11 && f <= 13) { const a0 = [L[0] + 4, L[1] - 16]; for (const [x, y] of strokePx([a0, [a0[0] + 4, a0[1] - 4], [a0[0] + 1, a0[1] - 8], [a0[0] + 5, a0[1] - 12]])) { P.p(x, y, f === 12 ? c[0] : c[1]); P.p(x + 1, y, c[2]); } }
      break;
    }
    case 'wave': {   // 파도: 물마루가 땅을 따라 밀려가 대상에서 부서짐(물보라)
      const t = f - 13;
      if (t >= 0 && t < 6) { const x0 = L[0] + 14 + t * ((T[0] - L[0] - 14) / 6), base = G - 1, h = 10 + t * 1.6; for (let s = -11; s <= 11; s++) { const top = base - h * Math.cos(s / 11 * Math.PI / 2) ** 1.5; for (let y = Math.floor(top); y <= base; y++) P.o(Math.floor(x0 + s), y, y < top + 1.5 ? c[0] : y < top + 4 ? c[1] : c[2]); } for (let s = -3; s <= 6; s++) P.o(Math.floor(x0 + s + 4), Math.floor(base - h - 1 + Math.abs(s) * 0.6), c[0]); }
      if (k >= 0 && k < 14) particles(P.p, burstParticles(seed, T[0] - 2, T[1] + 8, 14, 2.2, [c[0], c[1], c[2]], { g: 0.22, life: 14, up: 1.6, size: 2 }), k);
      break;
    }
    case 'fireball': {   // 불덩이: 팔 끝에서 날아가며 불티 꼬리 → 폭발
      const from = [L[0] + 16, L[1] + 4], dur = 7, t = f - 13;
      if (t >= 0 && t < dur) { const u = t / dur, x = from[0] + (T[0] - from[0]) * u, y = from[1] + (T[1] - from[1]) * u - Math.sin(Math.PI * u) * 8; for (let q = 1; q <= 5; q++) disc(P.p, x - q * 4, y + Math.sin((t + q) * 2) * 1.5, Math.max(0.6, 2.4 - q * 0.4), q < 2 ? c[1] : q < 4 ? c[2] : c[3]); disc(P.o, x, y, 5, c[2]); disc(P.o, x + 0.6, y - 0.4, 3.4, c[1]); disc(P.o, x + 1.2, y - 1, 1.6, c[0]); }
      if (k >= 0 && k <= 8) explosion(P, T[0], T[1], k, c, seed);
      if (k >= 1 && k < 11) particles(P.p, burstParticles(seed + 5, T[0], T[1], 12, 2.6, [c[0], c[1], c[2], c[3]], { g: 0.12, life: 10, size: 2 }), k - 1);
      break;
    }
    case 'slam': {   // 땅 내려치기: 갈라짐·먼지가 땅을 달려가 대상 밑에서 돌가시가 솟음 + 돌 파편
      const t = f - 13, run = 6;
      if (t >= 0 && t < run + 2) { const x = L[0] + 24 + Math.min(1, t / run) * (T[0] - L[0] - 24); for (let s = 0; s < 10; s++) P.o(Math.floor(x - s * 2 + (s % 2)), G + (s % 2), c[3]); disc(P.o, x, G - 3, 3.6, '#a89a88'); disc(P.o, x - 6, G - 2, 2.6, '#8a7e70'); disc(P.o, x - 11, G - 1, 1.8, '#6e6458'); }
      if (k >= 0 && k < 11) { const h = k < 3 ? (k + 1) * 6 : Math.max(0, 18 - (k - 3) * 2.6); [-10, 0, 10].forEach((dx, q) => { const hh = h * (q === 1 ? 1.25 : 0.85); for (let j = 0; j < hh; j++) { const w = Math.max(0, Math.floor((hh - j) / 3.2)); for (let s = -w; s <= w; s++) P.o(Math.floor(T[0] + dx + s), Math.floor(G - j), s === -w || s === w ? c[2] : j > hh - 3 ? c[0] : c[1]); } }); if (k === 1 || k === 2) disc(P.o, T[0] + 4, G - 18, 2, A.gem); }
      if (k >= 1 && k < 13) particles(P.p, burstParticles(seed, T[0], G - 8, 10, 2.4, [c[1], c[2], c[3]], { g: 0.28, life: 12, up: 1.8, size: 2 }), k - 1);
      break;
    }
    case 'bloom': {   // 불꽃 만개: 불꽃 꽃잎 다섯이 돌며 날아가 대상에서 꽃 모양으로 터짐
      for (let q = 0; q < 5; q++) { const t = f - 13, dur = 7; if (t < 0 || t >= dur) continue; const u = t / dur, a = q * 1.2566 + u * 3, rr = 12 * Math.sin(Math.PI * u), x = L[0] + 10 + (T[0] - L[0] - 10) * u + Math.cos(a) * rr, y = L[1] + (T[1] - L[1]) * u + Math.sin(a) * rr; flameTongue(P.o, x, y, 7, f + q, c, 1.5); }
      if (k >= 0 && k < 10) { const R = 5 + k * 2.6; for (let q = 0; q < 5; q++) { const a = q * 1.2566 - 1.57, x = T[0] + Math.cos(a) * R, y = T[1] + Math.sin(a) * R; if (k < 8) flameTongue(P.o, x, y, Math.max(2, 9 - k), f + q, c, 1.6); } if (k < 2) { disc(P.o, T[0], T[1], 6 - k * 2, c[1]); disc(P.o, T[0], T[1], 3, c[0]); } }
      if (k >= 2 && k < 12) particles(P.p, burstParticles(seed, T[0], T[1], 12, 1.8, [c[1], c[2], c[3]], { g: -0.06, life: 10, size: 2 }), k - 2);
      break;
    }
    case 'rings': {   // 바람 고리: 파이프 끝에서 고리 셋이 커지며 날아가 터짐
      [0, 2, 4].forEach((d, q) => {
        const t = f - 13 - d, dur = 6, from = [L[0] + 12, L[1] - 22 + q * 6];
        if (t >= 0 && t < dur) { const u = t / dur, x = from[0] + (T[0] - from[0]) * u, y = from[1] + (T[1] - from[1]) * u; ringPx(P.o, x, y, 5 + u * 4, t % 2 ? c[1] : c[0], () => true, 1.5, 2); }
        if (t >= dur && t < dur + 5) for (let i = 0; i < 8; i++) { const a = i * 0.785 + q, r1 = 5 + (t - dur) * 3; line(P.p, [T[0] + Math.cos(a) * r1, T[1] + Math.sin(a) * r1 * 1.3], [T[0] + Math.cos(a) * (r1 + 4), T[1] + Math.sin(a) * (r1 + 4) * 1.3], c[1]); }
      });
      break;
    }
    case 'blades': {   // 바람 칼날: 초승달 칼날 둘이 빠르게 날아가 대상을 사선으로 벰
      [0, 2].forEach((d, q) => {
        const t = f - 14 - d, dur = 3;
        if (t >= 0 && t < dur) { const u = (t + 1) / dur, x = L[0] + 14 + (T[0] - L[0] - 14) * u, y = L[1] - 6 + q * 9 + (T[1] - L[1]) * u; crescent(P.o, x - 9, y, 12, -1.2, 1.2, 3.6, c[0], c[2]); for (let s = 1; s < 6; s++) P.p(Math.floor(x - 12 - s * 4), Math.floor(y + (q ? 2 : -2)), c[2]); }
      });
      if (k >= 0 && k < 5) { const L2 = k < 2 ? 1 : 0.6; line(P.o, [T[0] - 14, T[1] - 14], [T[0] + 14 * L2, T[1] + 14 * L2], k < 2 ? c[0] : c[2], 2); if (k >= 1) line(P.o, [T[0] + 14, T[1] - 11], [T[0] - 14 * L2, T[1] + 12 * L2], k < 3 ? c[0] : c[2], 2); }
      if (k >= 1 && k < 10) particles(P.p, burstParticles(seed, T[0], T[1], 9, 2, [c[1], c[2], c[3]], { g: 0.06, life: 9, size: 2 }), k - 1);
      break;
    }
    case 'spores': {   // 포자 구름: 몽글몽글 퍼지며 천천히 날아가 대상을 감쌈
      const t = f - 13, dur = 8;
      if (t >= 0 && t < dur + 16) { const u = Math.min(1, t / dur), cx = L[0] + 10 + (T[0] - L[0] - 10) * ease(u), cy = L[1] - 4 + (T[1] - L[1]) * u - Math.sin(Math.PI * u) * 6, R = 5 + u * 10 + Math.max(0, t - dur) * 0.5, r1 = rng(seed); for (let i = 0; i < 30; i++) { const a = r1() * 6.283 + t * 0.15, rr = R * Math.sqrt(r1()), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8; if (t > dur + 10 && i % 2) continue; if (i % 6 === 0) disc(P.o, x, y, 1.6, c[1]); else P.p(Math.floor(x), Math.floor(y), i % 3 === 0 ? c[0] : c[2]); } }
      break;
    }
  }
}

// 맞은 쪽 성질 — I+3부터 20장쯤. pts = 대상 윗머리 점들, T = 머리, G = 흙 높이, L = 공격 쪽 머리(흡수가 돌아갈 곳)
export function statusFx(P, A, f, T, G, pts, L, seed = 1) {
  const I = impactAt(A), k = f - I - 3;
  if (k < 0 || k > 22) return;
  const fade = k > 18, c = A.c;
  switch (A.status) {
    case 'burn': pts.slice(0, 3).forEach(([x, y], q) => { if (fade && (k + q) % 2) return; flameTongue(P.o, x, y + 2, 5 + ((k + q) % 3 === 0 ? 1 : 0), f + q * 2, c, 1); }); break;
    case 'wet': pts.slice(0, 3).forEach(([x, y], q) => { const t = (k + q * 4) % 10, yy = y + 8 + t * 2; if (yy < G) { disc(P.o, x + q * 3 - 3, yy, 1.4, c[1]); P.p(Math.floor(x + q * 3 - 3), Math.floor(yy) - 1, c[0]); } }); break;
    case 'thorn': {
      pts.slice(0, 3).forEach(([x, y], q) => { if (fade && q) return; P.o(Math.floor(x), Math.floor(y + 3), '#f4f0d0'); P.o(Math.floor(x) + 1, Math.floor(y + 4), '#c8c098'); P.o(Math.floor(x), Math.floor(y + 4), '#c8c098'); P.o(Math.floor(x) + 1, Math.floor(y + 5), '#8a8460'); });
      if (A.kind === 'slash' || A.kind === 'whip') for (let q = 0; q < 4; q++) { const t = (k - q * 2) / 10; if (t < 0 || t > 1) continue; const x = T[0] + (L[0] - T[0]) * t, y = T[1] + (L[1] - T[1]) * t - Math.sin(Math.PI * t) * 14; disc(P.o, x, y, 1.5, '#c8ff90'); if (t > 0.9) disc(P.p, L[0], L[1] - 2, 2, '#ffffff'); }   // 흡수: 빛이 공격 쪽으로
      break;
    }
    case 'shock': if (k % 3 !== 2 && !fade) { const r = rng(seed + Math.floor(k / 2) * 17), [x, y] = pts[Math.floor(r() * pts.length)] || T; for (const [px, py] of strokePx([[x - 3, y + 3], [x, y], [x - 2, y - 3], [x + 3, y - 6]])) { P.o(px, py, k % 3 ? '#fff4b0' : '#ffffff'); } } break;
    case 'dust': for (let q = 0; q < 5; q++) { const r = rng(seed + q * 7), x = T[0] - 14 + r() * 28, t = (k + q * 4) % 12, y = T[1] - 8 + t * 1.8; if (y < G) disc(P.o, x, y, 1.1, q % 2 ? '#b8a688' : '#8c7a60'); } if (k < 9) for (let q = 0; q < 3; q++) disc(P.o, T[0] - 12 + q * 12, G - 2 - k * 0.4, 3 - k * 0.3, '#9a8c7c'); break;
    case 'swirl': { const n = 14, rot = k * 0.5; for (let i = 0; i < n; i++) { if (i % 4 === 3 || (fade && i % 2)) continue; const a = rot + i / n * Math.PI * 2; disc(P.o, T[0] + Math.cos(a) * 16, T[1] - 8 + Math.sin(a) * 5, 0.9, i % 3 ? c[1] : c[0]); } break; }
    case 'spore': for (let i = 0; i < 8; i++) { if (fade && i % 2) continue; const a = k * 0.18 + i * 0.785; disc(P.o, T[0] + Math.cos(a) * 13, T[1] - 4 + Math.sin(a * 1.3) * 7, 1, i % 2 ? c[0] : c[1]); } break;
  }
}
