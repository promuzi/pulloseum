// 종별 공격 연출 — 무대(stage.mjs: 나 = 왼쪽 아래·상대 = 오른쪽 위가 비스듬히 마주 봄) 장면을 장마다 그린다. convert.mjs --attack 이 부른다.
// 근거: saint11 "Impact"(대기 → 준비 → 동작 → 넘침 → 정지 · 준비가 있어야 세게 느껴짐 · 중간 장을 빼서 빠르게 + 잔상 · 대상이 튕기며 반응 ·
//       화면과 대상 흔들기 · 맞기 직전 한 장 멈춤), "Electricity"(벼락 순서), "Fire"·"Explosion"(밝은 속 → 고리 → 파편 → 연기), "Wind"(입자·고리).
// 큰 모양(불덩이·폭발·베기·물방울·돌가시·파도)은 어두운 1칸 테두리를 둘러(o 층) 복잡한 몸 위에서도 읽히게, 잔 입자는 그냥(p 층).
// 속성 성질(로드맵 #14)을 맞은 쪽에 보인다: 불 = 화상, 물 = 젖음, 풀 = 가시·흡수, 번개 = 감전, 대지 = 둔화(먼지·부스러기), 바람 = 교란(머리 둘레 소용돌이).
// 한 바퀴 = FRA장 × 0.05초. 크기는 96칸 식물에 맞춰(2026-10-15 실측: 처음 크기는 몸 위에서 묻힘 → 약 1.8배).
// 방향: 날아가는 것은 공격 머리 L → 대상 머리 T 쪽(S.D), 몸에 붙은 출발점(팔·관 끝)과 베기 모양은 상대가 있는 좌우(S.fx)로 뒤집는다 — 위아래로 마주 봐도 그대로.
// 바닥을 타는 기술(대지 내려치기·파도 — 2026-10-15 사용자 "땅을 타고 가는 모션, 바닥 경계 선과 시작·끝점이 어색하지 않게, 화분이 있으니까 · 마주 보는 각도도"):
//   화분과 같은 26° 내려다본 바닥 평면 위에서 그린다. 출발 = 공격 쪽 화분 굽 가장자리(상대 쪽, 화분 뒤 반쪽이면 옆), 도착 = 대상 화분 굽 가장자리.
//   바닥에 눕는 것(갈라짐·물자국·고리·웅덩이)은 바닥 층 f, 서 있는 것(돌가시·물마루·물기둥·먼지)은 바닥에 닿는 줄(깊이)로 화분과 앞뒤를 가리는 u 층.
//   근거: 바닥 위 고리는 납작한 타원이고 고리 → 점으로 갈라져 사라짐(Budget Pixel 비 4장), 바닥 높이 충격파 = 납작한 원판(Tuts+ 충돌 충격파),
//   땅을 타고 간 힘은 대상 발밑에서 솟는다(포켓몬 대지의힘 — the ground under the target erupts).
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
// 변이 스킬(변이형별 기본 스킬, 설계 = specs/2026-10-15-v2-mutation-staging-design.md ⑥) — 공격하는 쪽은 변이 후광·문장을 두른다
export const VARIANTS = {
  predator: { kind: 'bite', move: 'lunge', c: ['#ffffff', '#ffd0d6', '#e8344a', '#5a0e1c'], status: 'drain' },
  weapon: { kind: 'sword', move: 'lunge', c: ['#ffffff', '#e8eef8', '#9aa8c0', '#3a4458'], status: 'none' },
  toxic: { kind: 'poison', move: 'cast', c: ['#f0d8ff', '#c890f0', '#8a40c8', '#3a1660'], fizz: '#b8f070', status: 'poison' },
  dragon: { kind: 'breath', move: 'cast', c: ['#ffffff', '#c8ffa0', '#5ac850', '#1e5a2a'], status: 'none' },
  spore: { kind: 'sporepuff', move: 'cast', c: ['#fffbd8', '#f8e488', '#d0b050', '#6a5a28'], status: 'weaken' },
};
export const GROUND = new Set(['slam', 'wave']);   // 바닥을 타고 가는 기술
export const impactAt = A => ({ slash: 15, whip: 15, bolt: 14, blades: 17, slam: 19, wave: 19, bubbles: 19, gale: 19, rings: 19, fireball: 20, bloom: 20, spores: 21, bite: 15, sword: 15, poison: 19, breath: 19, sporepuff: 18 })[A.kind] || 18;

// 공격하는 쪽 몸놀림(앞 = 상대 쪽, 그림 좌표 qx+): 0~5 대기, 6~11 준비(점점), 12 멈춤, 13~14 동작, 15 넘침, 16~23 복귀
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
// 맞는 쪽: 넉백(kb, 뒤로) · 번쩍 · 흔들림 · 들썩(hop — 발밑에서 땅이 솟는 기술은 화분째 위로)
export function targetPose(f, I, A = {}) {
  const k = f - I;
  if (k < 0) return { kb: 0, flash: false, shake: 0, hop: 0 };
  return { kb: k <= 1 ? 5 : Math.round(5 * (1 - ease(Math.min(1, (k - 1) / 7)))), flash: k === 0, shake: k <= 3 ? (k % 2 ? 1 : -1) : 0, hop: A.kind === 'slam' ? ([2, 3, 1][k] || 0) : 0 };
}
export const cameraShake = (f, A, I) => { const k = f - I, slam = A.move === 'slam' && f >= 13 && f <= 16; return (k >= 0 && k <= 2) || slam ? [k % 2 ? 2 : -2, slam ? (f % 2 ? 1 : -1) : 0] : [0, 0]; };

// ── 그리기 도구(무대 좌표). P = { o(x,y,색) = 테두리 층, p(x,y,색) = 입자 층, f(x,y,색|곱) = 바닥 층, u(x,y,색,깊이) = 바닥에 선 것 } ──
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
// 좌우 뒤집을 수 있는 초승달(fx < 0 이면 세로축으로 거울 — 각 a → π − a)
const crescentF = (fx, put, cx, cy, R, a0, a1, w, c0, c1, keep = () => true) => fx > 0 ? crescent(put, cx, cy, R, a0, a1, w, c0, c1, keep) : crescent(put, cx, cy, R, Math.PI - a1, Math.PI - a0, w, c0, c1, u => keep(1 - u));
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

// ── 바닥 평면 도구(k = 내려다본 각의 세로 납작함, stage.mjs K) ──
// 바닥 고리: 가운데 c, 가로 반지름 r, 세로 = r × k
function floorRing(put, c, r, k, col, keep = () => true) { const n = Math.max(16, Math.round(r * 8)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if (keep(a)) put(Math.floor(c[0] + Math.cos(a) * r), Math.floor(c[1] + Math.sin(a) * r * k), col); } }
// 바닥 길: 출발 S0 → 도착 E0 사이를 바닥 평면에서 옆으로 들쭉날쭉(세계 수직 방향을 화면으로 눌러) + 가지 몇 개
function crackPath(S0, E0, k, seed) {
  const r = rng(seed), dx = E0[0] - S0[0], dz = (E0[1] - S0[1]) / k, len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len;
  const n = Math.max(3, Math.round(len / 13)), pts = [], br = [];
  for (let i = 0; i <= n; i++) { const s = i / n, j = i === 0 || i === n ? 0 : (r() - 0.5) * 7; pts.push([S0[0] + dx * s + nx * j, S0[1] + (dz * s + nz * j) * k]); }
  for (let i = 2; i < n - 1; i += 3) { const sg = r() < 0.5 ? -1 : 1, l = 5 + r() * 6, a = pts[i]; br.push({ s: i / n, pts: [a, [a[0] + (dx / len * 0.5 + nx * sg) * l, a[1] + (dz / len * 0.5 + nz * sg) * l * k]] }); }
  const vert = Math.abs(E0[1] - S0[1]) > Math.abs(E0[0] - S0[0]);
  return { pts, br, n, lip: vert ? [1, 0] : [0, 1], wide: vert ? [1, 0] : [0, -1] };   // 빛(왼쪽 위)을 받는 갈라진 벽 = 오른쪽·아래 한 칸
}
const pathAt = (cp, u) => { const f = Math.max(0, Math.min(1, u)) * cp.n, i = Math.min(cp.n - 1, Math.floor(f)), t = f - i, a = cp.pts[i], b = cp.pts[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
const CRACK = '#231a28', LIP = '#6e6280';
function crackPx(put, cells, lip, fade) {
  for (const [key, [x, y]] of cells) if (!cells.has((y + lip[1]) * 4096 + x + lip[0]) && !(fade && (x + y) % 2)) put(x + lip[0], y + lip[1], LIP);
  for (const [, [x, y]] of cells) if (!(fade && (x + y) % 2)) put(x, y, CRACK);
}
// 갈라짐을 u(0~1)까지 — 출발 쪽 반은 두 칸 폭(점점 가늘게), fade 1 = 성기게
function drawCrack(put, cp, u, fade = 0) {
  const n = Math.floor(Math.min(1, u) * cp.n), pts = cp.pts.slice(0, n + 1);
  if (u < 1) pts.push(pathAt(cp, u));
  const cells = new Map(), add = (x, y) => cells.set(y * 4096 + x, [x, y]), line1 = strokePx(pts);
  line1.forEach(([x, y], i) => { add(x, y); if (i < line1.length * 0.5) add(x + cp.wide[0], y + cp.wide[1]); });
  for (const b of cp.br) if (b.s <= u) for (const [x, y] of strokePx(b.pts)) add(x, y);
  crackPx(put, cells, cp.lip, fade);
}
// 화분 굽 둘레 짧은 잔금(뒤쪽은 화분이 가림 — 바닥 층이 화분보다 먼저 그려지므로)
function radialCracks(put, c, r0, k, seed, fade) {
  const r = rng(seed), cells = new Map();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + r() * 0.6, len = 5 + r() * 5, pts = [];
    for (let s = 0; s <= 3; s++) { const rr = r0 + len * s / 3, j = s ? (r() - 0.5) * 0.3 : 0; pts.push([c[0] + Math.cos(a + j) * rr, c[1] + Math.sin(a + j) * rr * k]); }
    for (const [x, y] of strokePx(pts)) cells.set(y * 4096 + x, [x, y]);
  }
  crackPx(put, cells, [0, 1], fade);
}
// 바위 조각(땅에서 비스듬히 솟음): 밑 base → 끝 tip, 밑 반폭 w. 가장자리는 들쭉날쭉, 등줄기(조금 왼쪽)를 경계로 왼면 = 빛, 오른면 = 그늘, 끝 = 가장 밝게, 금 몇 줄.
//  keep = 남길 길이 비율(부서질 때 위부터 사라짐)
function rockShard(put, base, tip, w, c, d, seed, keep = 1) {
  const ax = tip[0] - base[0], ay = tip[1] - base[1], len = Math.hypot(ax, ay) || 1, ux = ax / len, uy = ay / len, px = -uy, py = ux, r = rng(seed);
  const notch = Array.from({ length: 12 }, () => [(r() - 0.5) * 1.6, (r() - 0.5) * 1.6]), cracks = [0.3 + r() * 0.15, 0.58 + r() * 0.15];
  const x0 = Math.floor(Math.min(base[0], tip[0]) - w - 2), x1 = Math.ceil(Math.max(base[0], tip[0]) + w + 2), y0 = Math.floor(Math.min(base[1], tip[1]) - 2), y1 = Math.ceil(Math.max(base[1], tip[1]) + 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x + 0.5 - base[0], dy = y + 0.5 - base[1], t = (dx * ux + dy * uy) / len, s = dx * px + dy * py;
    if (t < 0 || t > keep) continue;
    const [nl, nr] = notch[Math.min(11, Math.floor(t * 12))], hw = w * (1 - t) ** 0.85, ridge = -hw * 0.2;
    if (s < -hw - nl * (1 - t) || s > hw + nr * (1 - t)) continue;
    const crack = cracks.some(q => Math.abs(t - q) < 0.6 / len * 1.5 && s > ridge);
    put(x, y, t > 0.86 && s < ridge + 1 ? c[0] : crack ? c[3] : s < ridge ? c[1] : s > hw - 1 ? c[3] : c[2], d);
  }
}
// 흙먼지 뭉치(테두리 없는 부드러운 층): 가운데 + 양옆 작은 덩이, 왼쪽 위 밝게
function dustPuff(put, x, y, r, d, thin = false) {
  for (const [ox, oy, rr] of [[0, 0, r], [-r * 0.75, r * 0.3, r * 0.7], [r * 0.8, r * 0.35, r * 0.62]]) for (let yy = Math.floor(y + oy - rr); yy <= y + oy + rr; yy++) for (let xx = Math.floor(x + ox - rr); xx <= x + ox + rr; xx++) {
    const ex = xx + 0.5 - x - ox, ey = yy + 0.5 - y - oy;
    if (ex * ex + ey * ey > rr * rr || (thin && (xx + yy) % 2)) continue;
    put(xx, yy, ex + ey < -rr * 0.35 ? '#cbbba6' : ex + ey > rr * 0.45 ? '#7e7062' : '#a89a88', d);
  }
}
// 물: 바닥에서 솟는 물기둥 · 물보라 왕관 · 지나간 물줄기 자국 · 웅덩이
// 물기둥(바닥에서 솟는 분수): 밑 b, 높이 h, 밑 반폭 w, 줄마다 기울기 lean. 왼쪽 = 밝은 물, 오른쪽 끝 = 어두운 물, 몸에 흐르는 빛줄, 위 = 거품 머리.
//  broken(0~1) = 위에서부터 끊겨 물방울로 흩어지는 정도
function spout(put, b, h, w, lean, c, d, f, broken = 0, seed = 1) {
  const pd = (x, y, cc) => put(x, y, cc, d);
  for (let j = 0; j < h; j++) {
    const t = j / h, ww = w * (1 - 0.4 * t), cx = b[0] + lean * j;
    if (broken && t > 1 - broken) {   // 끊긴 위쪽은 떨어지는 물방울로
      if ((Math.floor(j * 1.7) + seed) % 3) continue;
      const jx = ((j * 5 + seed) % 3) - 1;
      put(Math.floor(cx + jx), Math.floor(b[1] - j), c[1], d); put(Math.floor(cx + jx + 1), Math.floor(b[1] - j), c[2], d);
      continue;
    }
    for (let s = Math.floor(-ww); s <= ww; s++) put(Math.floor(cx + s), Math.floor(b[1] - j), s <= -ww + 1 ? c[1] : s >= ww - 0.8 ? c[3] : (j + Math.floor(s) * 3 + f * 2 + 99) % 7 === 0 ? c[1] : c[2], d);
  }
  if (!broken) {   // 물머리: 거품 뭉치 셋(한가운데가 가장 밝게)
    const tp = [b[0] + lean * h, b[1] - h];
    for (const [ox, oy, rr] of [[0, 0, w * 0.95 + 0.6], [-w * 0.8, w * 0.5, w * 0.6], [w * 0.8, w * 0.45, w * 0.55]]) disc(pd, tp[0] + ox, tp[1] + oy, rr, c[1]);
    disc(pd, tp[0] - 0.6, tp[1] - 0.8, w * 0.5, c[0]);
  }
}
// 꼭대기에서 물방울이 부채꼴로 솟았다 떨어지는 줄 일곱(분수 끝) — p = 0~1 진행
function sprayFan(put, top, lean, c, d, p) {
  for (let q = 0; q < 7; q++) {
    const a = -Math.PI / 2 + (q - 3) * 0.4 + lean * 0.8, v = 3.4 - Math.abs(q - 3) * 0.3, T = 7 * p;
    for (let t = 0; t < T; t += 0.3) put(Math.floor(top[0] + Math.cos(a) * v * t), Math.floor(top[1] + Math.sin(a) * v * t + 0.42 * t * t), t > T - 1.2 ? c[0] : c[1], d);
  }
}
// 물기둥 하나의 시간표: t = 솟은 뒤 장 수 → [높이 배율, 끊김]
const SPOUT_T = [[0.55, 0], [1, 0], [0.92, 0.3], [0.65, 0.6], [0.35, 0.9]];
// 물보라 왕관: 줄(가로 ±w, 세계)을 따라 물기둥이 솟아 위가 들쭉날쭉 깨진다 — 가운데가 높고 toward(화면 x) 쪽으로 기울며, 위쪽은 성기게(물방울 사이 틈)
function crown(put, P0, g, w, H, toward, c, f, d) {
  for (let s = -w; s <= w; s += 0.5) {
    const b = [P0[0] + g.nx * s, P0[1] + g.nz * s * g.k], hs = H * (0.5 + 0.5 * Math.cos(s / w * Math.PI / 2)) * (0.82 + 0.18 * Math.sin(s * 1.9 + f * 2.3));
    for (let j = 0; j < hs; j++) {
      const t = j / hs, x = Math.floor(b[0] + (toward - b[0]) * 0.32 * t ** 1.6 + Math.sign(s) * t * t * 3), y = Math.floor(b[1] - j);
      if (t > 0.62 && (x * 3 + y * 5 + f) % 4 === 0) continue;
      put(x, y, t > 1 - 2.5 / hs ? c[0] : t > 0.55 ? c[1] : j < 1 ? c[3] : c[2], d);
    }
  }
}
// 웅덩이: 울퉁불퉁한 바닥 타원 — 가장자리 밝은 물, 안은 물빛과 젖은 바닥이 섞임(화분 밑은 화분이 가림)
function puddle(put, c0, r, k, c, fade, seed = 3) {
  const R = rng(seed), wob = Array.from({ length: 9 }, () => 0.82 + R() * 0.34);
  for (let y = Math.floor(c0[1] - r * k * 1.2 - 1); y <= c0[1] + r * k * 1.2 + 1; y++) for (let x = Math.floor(c0[0] - r * 1.2 - 1); x <= c0[0] + r * 1.2 + 1; x++) {
    const ex = x + 0.5 - c0[0], ez = (y + 0.5 - c0[1]) / k, an = (Math.atan2(ez, ex) / (Math.PI * 2) + 1) % 1 * 8, i0 = Math.floor(an), rr = r * (wob[i0] + (wob[i0 + 1] - wob[i0]) * (an - i0)), d = Math.hypot(ex, ez) / rr;
    if (d > 1 || (fade && (x + y) % 2)) continue;
    put(x, y, d > 0.86 ? c[1] : ((x * 374761393 + y * 668265263) >>> 0) % 29 === 0 ? c[1] : 0.72);   // 가장자리 밝은 물 · 안 = 젖어 어두운 바닥에 드문 반짝임(줄무늬 안 생기게 흩뿌림)
  }
}
// 바닥 길의 세계 방향(가로 dx·깊이 dz, 수직 nx·nz)
function groundOf(S) { const dx = S.E0[0] - S.S0[0], dz = (S.E0[1] - S.S0[1]) / S.K, len = Math.hypot(dx, dz) || 1; return { S0: S.S0, dx, dz, len, ux: dx / len, nx: -dz / len, nz: dx / len, k: S.K }; }
// 도착점에서 솟는 바위 조각: [바닥에서 옆(세계, 도착 둘레 접선 쪽), 길이 배율, 밑 반폭, 바깥으로 벌어짐] — 첫째가 식물을 찌르는 큰 조각
const SHARDS = [[0, 1, 7, 0], [-10, 0.55, 4.5, 0.55], [9, 0.45, 4, 0.6]];

// 기술 효과(공격 → 대상). L = 공격 쪽 머리, T = 대상 머리, G = 대상 흙 높이(무대 y),
// S = 무대: D(L→T 단위), fx(상대가 오른쪽이면 +1), K, A0·B0(공격·대상 화분 굽 가운데), S0·E0(바닥 길 출발·도착), phiE(도착 각), rf(굽 반지름)
export function skillFx(P, A, f, L, T, G, seed = 1, S = { D: [1, 0], fx: 1 }) {
  const I = impactAt(A), c = A.c, k = f - I, fx = S.fx, D = S.D;
  switch (A.kind) {
    case 'slash': {   // 장미 칼날 잎 베기: 초승달(흰 속·연두 겉) → 꽉 찬 베기 → 조각 → 흩어짐 + 꽃잎 터짐
      if (k === 0) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 26, -2.4, 0.9, 5.5, c[0], c[1]);
      if (k === 1) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 27, -2.6, 1.1, 4.2, c[1], c[2]);
      if (k === 2) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 28, -2.6, 1.1, 2.6, c[2], c[2], u => Math.floor(u * 6) % 2 === 0);
      if (f === 13 || f === 14) for (let s = 0; s < 3; s++) line(P.p, [L[0] + 6 * fx, L[1] - 10 + s * 6], [L[0] + 22 * fx, L[1] - 12 + s * 6], c[1]);   // 잔상
      if (k >= 0 && k < 16) particles(P.p, burstParticles(seed, T[0] - 2, T[1] - 2, 9, 2.2, A.petal, { g: 0.1, life: 16, up: 0.8, size: 2 }), k);
      break;
    }
    case 'whip': {   // 가시 채찍: 덩굴 줄이 뻗어(곡선) 끝에서 '딱' 별 → 줄 거두기 + 가시 파편
      const from = [L[0] + 12 * fx, L[1] + 2];
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
        const t0 = 13 + d, t = f - t0, dur = 6, hx = T[0] - 4 * fx + q * 4 * fx, hy = T[1] - 2 + q * 3, sx = L[0] + 8 * fx;
        if (t >= 0 && t < dur) { const u = t / dur, x = sx + (hx - sx) * u, y = L[1] + (hy - L[1]) * u - Math.sin(Math.PI * u) * 16; disc(P.o, x, y, 4.5, c[2]); disc(P.o, x, y, 3.2, c[1]); P.o(Math.floor(x) - 2, Math.floor(y) - 2, c[0]); P.o(Math.floor(x) - 1, Math.floor(y) - 2, c[0]); }
        if (t >= dur && t < dur + 12) { const kk = t - dur; if (kk < 3) ringPx(P.o, hx, hy, 4 + kk * 3, kk < 2 ? c[1] : c[2], () => true, 1, 2); particles(P.p, burstParticles(seed + q, hx, hy, 7, 1.7, [c[0], c[1], c[2]], { g: 0.22, life: 12, up: 1.1, size: 2 }), kk); }
      });
      break;
    }
    case 'gale': {   // 꽃잎 돌풍: 굵은 바람결 선 여럿 + 꽃잎이 물결치며 대상으로(공격 머리 → 대상 머리 방향)
      const [dx, dy] = D, nx = -dy, ny = dx, dist = Math.hypot(T[0] - L[0], T[1] - L[1]), sp = (dist + 16) / 7;
      for (let q = 0; q < 7; q++) { const t = f - 13 - (q % 3); if (t < 0 || t > 7) continue; const off = q * 5 - 14, head = 8 + t * sp; for (let s = 0; s < 22; s++) { const a = head - s, w = off + Math.sin((a + q * 5) * 0.18) * 1.3, x = L[0] + dx * a + nx * w, y = L[1] + dy * a + ny * w; P.p(Math.floor(x), Math.floor(y), s < 3 ? c[0] : c[2]); if (s < 10) P.p(Math.floor(x + nx), Math.floor(y + ny), c[1]); } }
      for (let q = 0; q < 9; q++) { const t = f - 13 - (q % 4), dur = 7; if (t < 0 || t > dur + 5) continue; const u = Math.min(1, t / dur), a = 10 + (dist - 10) * u + (t > dur ? (t - dur) * 3 : 0), w = (q * 3 - 12 + Math.sin(t * 0.9 + q) * 4) * (1 - u * 0.6); disc(P.o, L[0] + dx * a + nx * w, L[1] + dy * a + ny * w, 1.6, A.petal[q % 2]); }
      break;
    }
    case 'bolt': {   // 낙뢰(saint11 벼락 순서): 첫 충격 → 하얗게·다른 모양 → 쉼 → 첫 장 조각 → 쉼 → 흩어짐 + 불똥
      const top = [T[0] + 6, -2], ang = Math.atan2(T[1] - top[1], T[0] - top[0]), len = Math.hypot(T[0] - top[0], T[1] - top[1]), first = zigzag(top, ang, len, rng(seed), 7), hw = s => 1.2 + 2.2 * Math.sin(Math.PI * Math.min(1, s * 1.05)) ** 0.5;
      if (k === 0) fillBolt(P.o, first, hw, c[1], c[2]);
      if (k === 1) fillBolt(P.o, zigzag(top, ang + 0.05, len, rng(seed + 1), 7), s => hw(s) * 0.9, c[0], c[1], () => true, 0.8);
      if (k === 3) fillBolt(P.o, first, s => hw(s) * 0.5, c[2], c[2], s => (s > 0.1 && s < 0.3) || (s > 0.45 && s < 0.62) || (s > 0.78 && s < 0.95));
      if (k >= 1 && k <= 4) particles(P.p, burstParticles(seed, T[0], T[1] - 2, 9, 3, [c[0], c[2], c[3]], { g: 0.18, life: 5, size: 2 }), k - 1);
      if (f >= 11 && f <= 13) { const a0 = [L[0] + 4 * fx, L[1] - 16]; for (const [x, y] of strokePx([a0, [a0[0] + 4 * fx, a0[1] - 4], [a0[0] + fx, a0[1] - 8], [a0[0] + 5 * fx, a0[1] - 12]])) { P.p(x, y, f === 12 ? c[0] : c[1]); P.p(x + 1, y, c[2]); } }
      break;
    }
    case 'wave': {   // 물기둥 줄: 공격 쪽 화분 굽 옆에서 첫 물기둥 → 바닥을 따라 한 장에 하나씩 솟으며 다가감(지나간 자리는 물결 고리·젖은 줄) → 대상 화분 굽 옆에서 큰 물기둥이 식물 쪽으로 터짐 → 무너져 화분 둘레 웅덩이
      const g = groundOf(S), N = Math.max(3, Math.round(g.len / 75)), at = u => [S.S0[0] + g.dx * u, S.S0[1] + g.dz * u * S.K], lead = (S.E0[0] - S.S0[0]) / Math.hypot(S.E0[0] - S.S0[0], S.E0[1] - S.S0[1]) * 0.12;
      const head = Math.max(0, Math.min(1, (f - 13) / N));   // 젖은 줄은 마지막으로 솟은 기둥까지
      if (f >= 13 && k < 12) for (let i = 0; i <= 120; i++) { const u = head * i / 120, p = at(u), x = Math.floor(p[0]), y = Math.floor(p[1]); if (k >= 5 && ((x * 7 + y * 13) % 10) / 10 > 1 - (k - 4) / 7) continue; P.f(x, y, 0.8); if (i % 9 === 0) P.f(x + 1, y, c[2]); }
      for (let i = 0; i < N; i++) {
        const fi = 13 + Math.round(i * (I - 1 - 13) / N), t = f - fi, b = at(i / N); if (t < 0) continue;
        if (t < SPOUT_T.length) { const [hs, br] = SPOUT_T[t]; spout(P.u, b, (13 + 5 * i / N) * hs, 2.6, lead, c, b[1] + 0.5, f, br, seed + i); }
        if (t < 4) floorRing(P.f, b, 4 + t * 3, S.K, c[1], a => t < 2 || Math.floor(a * 3) % 2 === 0);
        if (t >= 2 && t < 9) particles(P.p, burstParticles(seed + i * 11, b[0], b[1] - 14 - 4 * i / N, 5, 1.2, [c[0], c[1], c[2]], { g: 0.3, life: 7, size: 2 }), t - 2);
        if (t >= 1 && t < 12) puddle(P.f, b, 4 + Math.min(t, 4), S.K, c, t >= 8, seed + i);
      }
      // 대상 화분 굽 옆 큰 물기둥: 식물 쪽으로 기울어 아랫몸을 친다
      const kk = f - (I - 1), Hg = 56, lean2 = (T[0] - S.E0[0]) * 0.6 / Hg;
      if (kk >= 0 && kk < 6) { const [hs, br] = [[0.5, 0], [1, 0], [1.05, 0], [0.88, 0.3], [0.62, 0.6], [0.32, 0.9]][kk]; spout(P.u, S.E0, Hg * hs, 5.2, lean2, c, S.E0[1] + 0.5, f, br, seed); }
      if (kk >= 1 && kk < 5) sprayFan(P.u, [S.E0[0] + lean2 * Hg * [1, 1.05, 0.9, 0.7][kk - 1], S.E0[1] - Hg * [1, 1.05, 0.9, 0.7][kk - 1]], lean2, c, S.E0[1] + 0.5, [0.45, 0.8, 1, 1][kk - 1]);
      if (kk >= 0 && kk < 4) crown(P.u, S.E0, g, 9, [7, 12, 10, 6][kk], S.E0[0], c, f, S.E0[1] + 0.6);
      if (kk >= 0 && kk < 4) floorRing(P.f, S.E0, 6 + kk * 4, S.K, c[1], a => kk < 2 || Math.floor(a * 3) % 2 === 0);
      if (k >= 2 && k < 14) particles(P.p, burstParticles(seed + 3, S.E0[0] + lean2 * Hg, S.E0[1] - Hg * 0.95, 12, 1.8, [c[0], c[1], c[2]], { g: 0.3, life: 12, size: 2 }), k - 2);
      if (k >= 1 && k < 15) puddle(P.f, S.B0, S.rf + 6 + Math.min(k, 7) * 3, S.K, c, k >= 10, seed);
      if (k >= 0 && k < 14) particles(P.p, burstParticles(seed, T[0] - 2, T[1] + 8, 14, 2.2, [c[0], c[1], c[2]], { g: 0.22, life: 14, up: 1.6, size: 2 }), k);
      break;
    }
    case 'fireball': {   // 불덩이: 팔 끝에서 날아가며 불티 꼬리 → 폭발
      const from = [L[0] + 16 * fx, L[1] + 4], dur = 7, t = f - 13, fl = Math.hypot(T[0] - from[0], T[1] - from[1]) || 1, ux = (T[0] - from[0]) / fl, uy = (T[1] - from[1]) / fl;
      if (t >= 0 && t < dur) { const u = t / dur, x = from[0] + (T[0] - from[0]) * u, y = from[1] + (T[1] - from[1]) * u - Math.sin(Math.PI * u) * 8; for (let q = 1; q <= 5; q++) disc(P.p, x - q * 4 * ux, y - q * 4 * uy + Math.sin((t + q) * 2) * 1.5, Math.max(0.6, 2.4 - q * 0.4), q < 2 ? c[1] : q < 4 ? c[2] : c[3]); disc(P.o, x, y, 5, c[2]); disc(P.o, x + 0.6 * fx, y - 0.4, 3.4, c[1]); disc(P.o, x + 1.2 * fx, y - 1, 1.6, c[0]); }
      if (k >= 0 && k <= 8) explosion(P, T[0], T[1], k, c, seed);
      if (k >= 1 && k < 11) particles(P.p, burstParticles(seed + 5, T[0], T[1], 12, 2.6, [c[0], c[1], c[2], c[3]], { g: 0.12, life: 10, size: 2 }), k - 1);
      break;
    }
    case 'slam': {   // 땅 내려치기: 공격 쪽 화분 굽 둘레 흙먼지 고리·잔금 → 갈라짐이 바닥을 달려 대상 화분 굽 가장자리에 닿음 → 그 자리에서 바위 조각이 비스듬히 솟아 식물을 찌름 + 화분째 들썩 → 부서져 내림
      const run0 = 14, run1 = I - 1, cp = crackPath(S.S0, S.E0, S.K, seed);
      if (f >= 13 && f <= 16) { const t = f - 13; floorRing(P.f, S.A0, S.rf + 4 + t * 6, S.K, t < 2 ? '#b8a688' : '#8c7a60', a => t < 2 || Math.floor(a * 4 + t) % 2 === 0); }
      if (f >= 13 && f < 21) for (const side of [-1, 1]) { const t = f - 13, b = [S.A0[0] + side * (S.rf + 4), S.A0[1]]; dustPuff(P.s, b[0] + side * t * 1.3, b[1] - 2 - t * 0.9, 2.4 + t * 0.4, b[1] + 0.5, t > 4); }
      if (f >= 13 && f < 32) radialCracks(P.f, S.A0, S.rf + 1, S.K, seed + 3, f >= 25);
      if (f >= run0 && k < 14) drawCrack(P.f, cp, (f - run0 + 1) / (run1 - run0 + 1), k >= 7 ? 1 : 0);
      for (let fs = run0; fs <= run1; fs++) {   // 갈라짐 머리에서 튀는 돌 조각·먼지
        const t = f - fs; if (t < 0 || t >= 6) continue;
        const h = pathAt(cp, (fs - run0 + 1) / (run1 - run0 + 1)), r1 = rng(seed + fs * 31);
        for (let j = 0; j < 3; j++) { const vx = (r1() - 0.5) * 2.2, vy = -1.6 - r1() * 1.4, x = h[0] + vx * t, y = h[1] - 1 + vy * t + 0.28 * t * t; if (y > h[1]) continue; const col = j ? c[2] : c[1]; P.u(Math.floor(x), Math.floor(y), col, h[1]); if (t < 3) P.u(Math.floor(x) + 1, Math.floor(y), col, h[1]); }
        if (t < 5) dustPuff(P.s, h[0] - 2, h[1] - 2 - t * 0.8, 1.6 + t * 0.45, h[1], t > 2);
      }
      // 도착점(대상 굽 가장자리)에서 바위 조각: 큰 것 = 식물 줄기 쪽으로 비스듬히, 작은 둘 = 양옆으로 벌어짐
      const rad = [Math.cos(S.phiE), Math.sin(S.phiE)], tan = [-rad[1], rad[0]], b0 = [S.B0[0] + rad[0] * (S.rf + 3), S.B0[1] + rad[1] * (S.rf + 3) * S.K];
      const aim = [S.B0[0] + rad[0] * 4, G - 28];   // 식물 아랫몸(흙 위 28칸, 화분 가운데 쪽)
      const shardAt = ([o, sc, w, spread]) => {   // 옆 조각은 큰 조각에서 먼 쪽(화면 좌우)으로 벌어짐
        const b = [b0[0] + tan[0] * o, b0[1] + tan[1] * o * S.K], L0 = Math.hypot(aim[0] - b0[0], aim[1] - b0[1]), dir = [(aim[0] - b0[0]) / L0, (aim[1] - b0[1]) / L0];
        const side = Math.abs(b[0] - b0[0]) >= 2 ? Math.sign(b[0] - b0[0]) : Math.sign(o);
        return { b, w, tip: [b[0] + (dir[0] + side * spread) * L0 * sc, b[1] + dir[1] * L0 * sc] };
      };
      if (k >= 0 && k < 10) {
        const gr = k === 0 ? 0.5 : k === 1 ? 1.08 : 1, keep = k <= 3 ? 1 : 1 - (k - 3) / 6;
        SHARDS.forEach((sh, q) => { const { b, w, tip } = shardAt(sh), tp2 = [b[0] + (tip[0] - b[0]) * gr, b[1] + (tip[1] - b[1]) * gr]; rockShard(P.u, b, tp2, w, c, b[1] + 0.5, seed + q * 7, keep); if (q === 0 && (k === 1 || k === 2)) disc((x, y, cc) => P.u(x, y, cc, b[1] + 0.6), tp2[0], tp2[1] + 2, 2, A.gem); });
        if (k >= 4) SHARDS.forEach((sh, q) => { const { b, tip } = shardAt(sh); particles(P.p, burstParticles(seed + 20 + q, b[0] + (tip[0] - b[0]) * keep, b[1] + (tip[1] - b[1]) * keep, 4, 1.3, [c[1], c[2], c[3]], { g: 0.35, life: 6, size: 2 }), k - 4); });   // 부서져 떨어지는 조각
      }
      if (k >= 0 && k < 3) floorRing(P.f, b0, 6 + k * 6, S.K, k < 2 ? c[1] : c[2], a => k < 2 || Math.floor(a * 4) % 2 === 0);
      if (k >= 0 && k < 16) radialCracks(P.f, S.B0, S.rf + 1, S.K, seed + 9, k >= 10);
      if (k >= 0 && k < 7) dustPuff(P.s, b0[0] - tan[0] * 12, b0[1] - 2 - k * 0.7, 2.2 + k * 0.5, b0[1] + 0.4, k > 3);
      if (k >= 0 && k < 7) dustPuff(P.s, b0[0] + tan[0] * 12, b0[1] - 2 - k * 0.7, 2 + k * 0.5, b0[1] + 0.4, k > 3);
      if (k >= 1 && k < 13) particles(P.p, burstParticles(seed, b0[0], b0[1] - 6, 10, 2.4, [c[1], c[2], c[3]], { g: 0.28, life: 12, up: 1.8, size: 2 }), k - 1);
      if (k >= 0 && k < 8) particles(P.p, burstParticles(seed + 2, T[0], G, 6, 1.6, ['#966c6c', '#694f62', '#4c3e24'], { g: 0.3, life: 8, up: 2.2 }), k);   // 들썩여 튄 흙
      break;
    }
    case 'bloom': {   // 불꽃 만개: 불꽃 꽃잎 다섯이 돌며 날아가 대상에서 꽃 모양으로 터짐
      const sx = L[0] + 10 * fx;
      for (let q = 0; q < 5; q++) { const t = f - 13, dur = 7; if (t < 0 || t >= dur) continue; const u = t / dur, a = q * 1.2566 + u * 3, rr = 12 * Math.sin(Math.PI * u), x = sx + (T[0] - sx) * u + Math.cos(a) * rr, y = L[1] + (T[1] - L[1]) * u + Math.sin(a) * rr; flameTongue(P.o, x, y, 7, f + q, c, 1.5); }
      if (k >= 0 && k < 10) { const R = 5 + k * 2.6; for (let q = 0; q < 5; q++) { const a = q * 1.2566 - 1.57, x = T[0] + Math.cos(a) * R, y = T[1] + Math.sin(a) * R; if (k < 8) flameTongue(P.o, x, y, Math.max(2, 9 - k), f + q, c, 1.6); } if (k < 2) { disc(P.o, T[0], T[1], 6 - k * 2, c[1]); disc(P.o, T[0], T[1], 3, c[0]); } }
      if (k >= 2 && k < 12) particles(P.p, burstParticles(seed, T[0], T[1], 12, 1.8, [c[1], c[2], c[3]], { g: -0.06, life: 10, size: 2 }), k - 2);
      break;
    }
    case 'rings': {   // 바람 고리: 파이프 끝에서 고리 셋이 커지며 날아가 터짐
      [0, 2, 4].forEach((d, q) => {
        const t = f - 13 - d, dur = 6, from = [L[0] + 12 * fx, L[1] - 22 + q * 6];
        if (t >= 0 && t < dur) { const u = t / dur, x = from[0] + (T[0] - from[0]) * u, y = from[1] + (T[1] - from[1]) * u; ringPx(P.o, x, y, 5 + u * 4, t % 2 ? c[1] : c[0], () => true, 1.5, 2); }
        if (t >= dur && t < dur + 5) for (let i = 0; i < 8; i++) { const a = i * 0.785 + q, r1 = 5 + (t - dur) * 3; line(P.p, [T[0] + Math.cos(a) * r1, T[1] + Math.sin(a) * r1 * 1.3], [T[0] + Math.cos(a) * (r1 + 4), T[1] + Math.sin(a) * (r1 + 4) * 1.3], c[1]); }
      });
      break;
    }
    case 'blades': {   // 바람 칼날: 초승달 칼날 둘이 빠르게 날아가 대상을 사선으로 벰
      [0, 2].forEach((d, q) => {
        const t = f - 14 - d, dur = 3, sx = L[0] + 14 * fx;
        if (t >= 0 && t < dur) { const u = (t + 1) / dur, x = sx + (T[0] - sx) * u, y = L[1] - 6 + q * 9 + (T[1] - L[1]) * u; crescentF(fx, P.o, x - 9 * fx, y, 12, -1.2, 1.2, 3.6, c[0], c[2]); for (let s = 1; s < 6; s++) P.p(Math.floor(x - (12 + s * 4) * fx), Math.floor(y + (q ? 2 : -2)), c[2]); }
      });
      if (k >= 0 && k < 5) { const L2 = k < 2 ? 1 : 0.6; line(P.o, [T[0] - 14 * fx, T[1] - 14], [T[0] + 14 * L2 * fx, T[1] + 14 * L2], k < 2 ? c[0] : c[2], 2); if (k >= 1) line(P.o, [T[0] + 14 * fx, T[1] - 11], [T[0] - 14 * L2 * fx, T[1] + 12 * L2], k < 3 ? c[0] : c[2], 2); }
      if (k >= 1 && k < 10) particles(P.p, burstParticles(seed, T[0], T[1], 9, 2, [c[1], c[2], c[3]], { g: 0.06, life: 9, size: 2 }), k - 1);
      break;
    }
    case 'bite': {   // 포식 물기: 위·아래 턱(이빨 지그재그)이 벌어졌다 맞는 장에 닫힘 → 진홍 빛이 공격 쪽으로(흡혈)
      const open = f < I - 2 ? 0 : k < 0 ? 9 + (k + 2) * 3 : k === 0 ? 1 : k === 1 ? 0 : -1;
      if (open >= 0 && f >= I - 3 && k <= 1) [-1, 1].forEach(s => {
        const yb = T[1] + s * (open + 3);
        crescent(P.o, T[0], yb - s * 10, 13, s < 0 ? 0.35 : -2.8, s < 0 ? 2.8 : -0.35, 3.6, c[0], c[2]);
        for (let i = -8; i <= 8; i += 4) { P.o(Math.floor(T[0] + i), Math.floor(yb + s * 1), c[0]); P.o(Math.floor(T[0] + i + 1), Math.floor(yb + s * 2), c[0]); }
      });
      if (k >= 2 && k < 14) for (let q = 0; q < 4; q++) { const t = (k - 2 - q) / 9; if (t < 0 || t > 1) continue; const x = T[0] + (L[0] - T[0]) * t, y = T[1] + (L[1] - T[1]) * t - Math.sin(Math.PI * t) * 12; disc(P.o, x, y, 1.6, q % 2 ? c[2] : c[1]); }
      if (k >= 0 && k < 8) particles(P.p, burstParticles(seed, T[0], T[1], 6, 1.6, [c[1], c[2], c[3]], { g: 0.1, life: 8 }), k);
      break;
    }
    case 'sword': {   // 무기 검 베기: 굵은 강철 사선 + 초승달 잔상 → 쇠 불꽃
      if (k === 0) { line(P.o, [T[0] - 20 * fx, T[1] - 18], [T[0] + 18 * fx, T[1] + 16], c[0], 2); crescentF(fx, P.o, T[0] - 4 * fx, T[1], 22, -2.3, 0.7, 4, c[1], c[2]); }
      if (k === 1) { line(P.o, [T[0] - 20 * fx, T[1] - 18], [T[0] + 18 * fx, T[1] + 16], c[1], 2); crescentF(fx, P.o, T[0] - 4 * fx, T[1], 23, -2.4, 0.8, 2.6, c[2], c[2], u => Math.floor(u * 5) % 2 === 0); }
      if (k >= 0 && k < 6) particles(P.p, burstParticles(seed, T[0] - 2 * fx, T[1] - 2, 10, 3, ['#ffffff', '#fff2a0', '#f0a030'], { g: 0.2, life: 6 }), k);
      break;
    }
    case 'poison': {   // 독성 독 뿌리기: 보라 독방울이 포물선으로 날아가 터지며 튐
      const t = f - 13, dur = 6, sx = L[0] + 8 * fx;
      if (t >= 0 && t < dur) { const u = t / dur, x = sx + (T[0] - sx) * u, y = L[1] + (T[1] - L[1]) * u - Math.sin(Math.PI * u) * 14; disc(P.o, x, y, 4.2, c[2]); disc(P.o, x - 0.6, y - 0.8, 2.6, c[1]); P.o(Math.floor(x) - 2, Math.floor(y) - 2, c[0]); }
      if (k >= 0 && k < 3) { disc(P.o, T[0], T[1], 6 - k, c[2]); disc(P.o, T[0], T[1], 3.5 - k, c[1]); }
      if (k >= 0 && k < 12) particles(P.p, burstParticles(seed, T[0], T[1], 12, 2, [c[1], c[2], c[3]], { g: 0.18, life: 12, up: 0.8, size: 2 }), k);
      break;
    }
    case 'breath': {   // 용족 숨결(자기 속성 — 여기선 풀): 입에서 대상까지 넓어지는 원뿔 입자 + 맞는 곳 소용돌이
      const t = f - 12, sx = L[0] + 10 * fx;
      if (t >= 0 && t < 12) for (let q = 0; q < 40; q++) { const r = rng(seed + q * 13 + t * 101), u = ((t + q * 0.3) % 6) / 6, x = sx + (T[0] - sx) * u, spread = 2 + u * 13, y = L[1] + (T[1] - L[1]) * u + (r() - 0.5) * spread * 2; if (q % 5 === 0) disc(P.o, x, y, 1.5 + u, u < 0.5 ? c[1] : c[2]); else P.p(Math.floor(x), Math.floor(y), q % 2 ? c[0] : c[2]); }
      if (k >= 0 && k < 8) ringPx(P.o, T[0], T[1], 6 + k * 2, k < 4 ? c[1] : c[2], a => Math.floor(a * 2 + k) % 2 === 0, 1, 2);
      break;
    }
    case 'sporepuff': {   // 포자 퍼프(턴 끝 자동): 대상 위에서 포자 구름이 피어남 + 약화 표시(아래 화살표)
      if (k >= 0 && k < 14) { const R = 4 + k * 1.5, r1 = rng(seed); for (let i = 0; i < 26; i++) { const a = r1() * 6.283, rr = R * Math.sqrt(r1()); const x = T[0] + Math.cos(a) * rr, y = T[1] - 6 + Math.sin(a) * rr * 0.7 - k * 0.4; if (k > 10 && i % 2) continue; if (i % 6 === 0) disc(P.o, x, y, 1.6, c[1]); else P.p(Math.floor(x), Math.floor(y), i % 3 ? c[2] : c[0]); } }
      if (k >= 4 && k < 18) { const x = T[0] + 16 * fx, y = T[1] - 18 + Math.min(4, k - 4); for (let j = 0; j < 7; j++) P.o(x, y + j, '#a8b8ff'); for (let s = 1; s <= 3; s++) { P.o(x - s, y + 6 - s, '#a8b8ff'); P.o(x + s, y + 6 - s, '#a8b8ff'); } }
      break;
    }
    case 'spores': {   // 포자 구름: 몽글몽글 퍼지며 천천히 날아가 대상을 감쌈
      const t = f - 13, dur = 8, sx = L[0] + 10 * fx;
      if (t >= 0 && t < dur + 16) { const u = Math.min(1, t / dur), cx = sx + (T[0] - sx) * ease(u), cy = L[1] - 4 + (T[1] - L[1]) * u - Math.sin(Math.PI * u) * 6, R = 5 + u * 10 + Math.max(0, t - dur) * 0.5, r1 = rng(seed); for (let i = 0; i < 30; i++) { const a = r1() * 6.283 + t * 0.15, rr = R * Math.sqrt(r1()), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8; if (t > dur + 10 && i % 2) continue; if (i % 6 === 0) disc(P.o, x, y, 1.6, c[1]); else P.p(Math.floor(x), Math.floor(y), i % 3 === 0 ? c[0] : c[2]); } }
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
    case 'dust': for (let q = 0; q < 5; q++) { const r = rng(seed + q * 7), x = T[0] - 14 + r() * 28, t = (k + q * 4) % 12, y = T[1] - 8 + t * 1.8; if (y < G) disc(P.o, x, y, 1.1, q % 2 ? '#b8a688' : '#8c7a60'); } if (k < 9) for (let q = 0; q < 3; q++) { const x = T[0] - 12 + q * 12, y = G - 2 - k * 0.4, r = 3 - k * 0.3; if (P.s) dustPuff(P.s, x, y, r, G + 22, k > 5); else disc(P.o, x, y, r, '#9a8c7c'); } break;
    case 'swirl': { const n = 14, rot = k * 0.5; for (let i = 0; i < n; i++) { if (i % 4 === 3 || (fade && i % 2)) continue; const a = rot + i / n * Math.PI * 2; disc(P.o, T[0] + Math.cos(a) * 16, T[1] - 8 + Math.sin(a) * 5, 0.9, i % 3 ? c[1] : c[0]); } break; }
    case 'spore': for (let i = 0; i < 8; i++) { if (fade && i % 2) continue; const a = k * 0.18 + i * 0.785; disc(P.o, T[0] + Math.cos(a) * 13, T[1] - 4 + Math.sin(a * 1.3) * 7, 1, i % 2 ? c[0] : c[1]); } break;
    case 'poison': {   // 독: 대상에서 보라 거품이 오르고 머리 위 독 칸 눈금이 1 → 2로 쌓임
      for (let q = 0; q < 3; q++) { const t = (k + q * 4) % 12, x = T[0] - 8 + q * 8, y = T[1] + 6 - t * 1.4; if (!(fade && q)) { disc(P.o, x, y, 1.2, c[1]); P.p(Math.floor(x), Math.floor(y) - 1, A.fizz || c[0]); } }
      const n = k < 6 ? 1 : 2; for (let i = 0; i < n; i++) { disc(P.o, T[0] - 4 + i * 6, T[1] - 24, 2, c[2]); P.o(Math.floor(T[0] - 5 + i * 6), Math.floor(T[1] - 25), c[0]); }
      break;
    }
  }
}
