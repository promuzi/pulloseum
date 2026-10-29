// 걸려 있는 동안 식물 몸에 계속 보이는 표시(2026-10-29 밤샘 — 사용자 '각종 고유스킬과 여러 상태이상 등 연출적으로 가독성을 높일 수 있는 것들 스스로 탐색하고 찾아서 …'):
//  체력바 밑 효과 칸 = 무엇이 걸렸는지(글자 · 아이콘), 이 표시 = '어느 식물에 · 어떤 종류가' 몸에서 바로 — 전엔 걸리는 순간 연출(statusfx.js)이 끝나면 강풍 말고는 식물이 그대로였음.
//  근거: 효과는 아이콘 + 글자에 '짧고 약한 겹침'을 함께(색만으로는 색약이 못 봄) · 포켓몬 5세대 마비 = 노란 빛 + 움직임이 느려짐 · 라이엇 '명료함' = 중요한 만큼만 눈길(행동을 막는 효과가 가장 크게, 잔효과는 작게 · 동시에 너무 많이 안 띄움)
//  모양 말: 지속 피해(화상 · 독 · 출혈) = 몸에서 새어 나옴 · 묶임(빙결 · 기절 · 매혹 · 마비 · 뿌리 · 도발 · 봉인) = 몸을 감싸거나 머리 위 · 약화 = 아래 꺾쇠가 가라앉음 · 강화 = 위 꺾쇠가 떠오름 · 보호 = 둘레 막
//  작은 도트 그림마다 어두운 1칸 테두리(공격 연출과 같은 규칙 — 복잡한 식물 몸 · 밝은 모래 위에서도 읽힘) · 한 식물에 넷까지(중요한 것부터 — PRI) · 그림 몇 개씩만이라 가벼움(10-17 발열 결정)
import { bigOf } from './sprites.js';

const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 0x9e37, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cyc = (t, per, off = 0) => (((t + off) % per) + per) % per / per;   // 0~1 되풀이
const INK = '#1a1424';
// 도트 그림(글자 = 팔레트 칸 · '.' = 빔) + 바깥 1칸 어두운 테두리 — 테두리 칸은 한 번만 셈해 둠
const OUTL = new Map();
function outline(rows) {
  let o = OUTL.get(rows); if (o) return o;
  const on = (x, y) => y >= 0 && y < rows.length && x >= 0 && x < rows[y].length && rows[y][x] !== '.';
  o = [];
  for (let y = -1; y <= rows.length; y++) for (let x = -1; x <= Math.max(...rows.map(r => r.length)); x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) o.push([x, y]);
  OUTL.set(rows, o); return o;
}
function spr(g, x, y, rows, pal, a = 1) {   // (x, y) = 그림 가운데
  if (a <= 0.03) return;
  const c = g.c, p = c.globalAlpha, w = rows[0].length, X = Math.round(x - w / 2), Y = Math.round(y - rows.length / 2);
  c.globalAlpha = p * cl(a) * 0.85; for (const [dx, dy] of outline(rows)) g.rect(X + dx, Y + dy, 1, 1, INK);
  c.globalAlpha = p * cl(a); rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') g.rect(X + i, Y + j, 1, 1, pal[r[i]]); });
  c.globalAlpha = p;
}
// 그림들
const S = {   // 5~9칸(식물 96칸에 맞춰 — 3칸이던 첫 판은 몸 위에서 거의 안 보였음)
  ember: ['..a..', '.aba.', '.aba.', 'abcba', 'abcba', '.aca.', '..a..'], bubble: ['.aaa.', 'ab..a', 'a...a', 'a...a', '.aaa.'], drop: ['..a..', '..a..', '.aba.', 'aabba', 'aaaba', '.aaa.'],
  flake: ['..a..', 'a.a.a', '.aba.', 'aabaa', '.aba.', 'a.a.a', '..a..'], star: ['...a...', '...a...', '..aba..', 'aabbbaa', '..aba..', '...a...', '...a...'],
  heart: ['.aa.aa.', 'abbabba', 'abbbbba', '.abbba.', '..aba..', '...a...'], spark: ['...aa', '..aa.', '.aab.', 'aaaab', '..aa.', '.aa..', 'aa...'],
  lock: ['..aaa..', '.a...a.', '.a...a.', 'bbbbbbb', 'bbbcbbb', 'bbbcbbb', 'bbbbbbb'], plus: ['..a..', '..a..', 'aabaa', '..a..', '..a..'], mote: ['.a.', 'aba', '.a.'],
  anger: ['.a.a.', 'aa.aa', '.....', 'aa.aa', '.a.a.'], cloud: ['....aaaa....', '..aabbbbaa..', '.abbbbbbbbaa', 'abbbbbbbbbba', 'abbbbbbbbbba', '.aaaaaaaaaa.'],
  fruit: ['..c..', '.aaa.', 'aabba', 'aaaba', '.aaa.'], spore: ['.a.', 'aba', '.a.'], down: ['a.....a', 'ab...ba', '.ab.ba.', '..aba..', '...a...'], up: ['...a...', '..aba..', '.ab.ba.', 'ab...ba', 'a.....a'],
  sprout: ['aa...bb', '.aa.bb.', '...c...', '...c...', '...c...'], reticle: ['aaa...aaa', 'a.......a', 'a.......a', '.........', '....b....', '.........', 'a.......a', 'a.......a', 'aaa...aaa'],
};
const PAL = {
  ember: { a: '#ff5a1a', b: '#ffa03a', c: '#ffe890' }, poison: { a: '#a050e0', b: '#f0d8ff' }, blood: { a: '#ff4a5a', b: '#b01e30' }, water: { a: '#bfefff', b: '#3a8ad0' },
  flake: { a: '#ffffff', b: '#8ad6f0' }, star: { a: '#ffd84a', b: '#ffffff' }, heart: { a: '#e8407e', b: '#ffb0d0' }, spark: { a: '#ffffff', b: '#ffe84a' },
  lock: { a: '#c8b0f0', b: '#7a5ac0', c: '#24143a' }, plus: { a: '#4ac85a', b: '#c8ffb0' }, gold: { a: '#ffd84a', b: '#fff4c0' }, anger: { a: '#ff3a3a' },
  cloud: { a: '#5a5a7e', b: '#8a8aaa' }, fruit: { a: '#8ad6f0', b: '#3a8ac0', c: '#6fd25c' }, spore: { a: '#f8e488', b: '#b08a30' }, down: { a: '#ffb0b0', b: '#e84a5a' }, up: { a: '#d8f0ff', b: '#3aa0e8' },
  sprout: { a: '#9ae070', b: '#6fd25c', c: '#4a8a30' }, reticle: { a: '#ffd84a', b: '#ff6a4a' },
};

// 식물 판 위 자리(그림 정보 base · soil · head · headR — assets/v2/plants/*.json): 머리 가운데 · 머리 반지름 · 흙 줄 · 가운데 x
export function plantBox(key, bx, by, flip) {
  const P = bigOf(key); if (!P) return null;
  const m = P.meta, x = bx - m.base[0], y = by - m.base[1], hr = m.headR || 14;
  const hx = flip ? x + m.w - m.head[0] : x + m.head[0], hy = y + m.head[1];
  return { cx: bx, hx, hy, hr, top: hy - hr, soil: y + m.soil[1], dir: flip ? -1 : 1 };
}
const wide = B => Math.max(16, B.hr * 1.3);   // 몸 반폭(머리 반지름 기준)

// ── 모양 하나씩(B = plantBox, t = 시각 ms, n = 겹 수) ──
const M = {
  // 지속 피해 — 몸에서 새어 나옴
  burn(g, B, t) { for (let i = 0; i < 3; i++) { const per = 1000, q = cyc(t, per, i * 333), k = Math.floor((t + i * 333) / per), x = B.cx + (hash(k, i) - 0.5) * wide(B) * 2, y = B.soil - 4 - q * (B.soil - B.top) * 0.85; spr(g, x + Math.sin(q * 9 + i) * 2, y, S.ember, PAL.ember, Math.sin(q * Math.PI) * 1.4); } },   // 불티가 떠올라 꺼짐
  poison(g, B, t) { for (let i = 0; i < 3; i++) { const per = 1200, q = cyc(t, per, i * 400), k = Math.floor((t + i * 400) / per), x = B.cx + (hash(k, i + 3) - 0.5) * wide(B) * 1.8, y = B.soil - 4 - q * (B.soil - B.hy) * 0.95; spr(g, x, y, q < 0.85 ? S.bubble : S.flake, PAL.poison, q < 0.85 ? 1 : (1 - q) * 6); } },   // 거품이 떠올라 톡
  bleed(g, B, t) { drip(g, B, t, PAL.blood, 1300, 0.45); },
  wet(g, B, t) { drip(g, B, t, PAL.water, 1000, 0.15); },
  // 묶임(행동을 막음 — 가장 크게)
  frozen(g, B, t) {   // 얼음 덩어리: 흙 줄부터 몸 아래 2/3를 감싼 반투명 수정(면 · 빛 줄) + 가끔 반짝 · 식물은 멈춤(battle.js plantClock)
    const w = Math.round(wide(B) * 1.25), y1 = Math.round(B.soil + 2), y0 = Math.round(B.soil - (B.soil - B.top) * 0.72), x0 = Math.round(B.cx - w), x1 = Math.round(B.cx + w), c = g.c;
    c.save(); c.globalAlpha *= 0.34; c.fillStyle = '#9fe4ff'; c.beginPath(); c.moveTo(x0 + 3, y0); c.lineTo(x1 - 4, y0 + 2); c.lineTo(x1, y0 + 8); c.lineTo(x1 - 1, y1); c.lineTo(x0 + 1, y1); c.lineTo(x0, y0 + 6); c.closePath(); c.fill(); c.restore();
    const px = (x, y, col, a = 1) => { const p = c.globalAlpha; c.globalAlpha = p * a; g.rect(Math.round(x), Math.round(y), 1, 1, col); c.globalAlpha = p; };
    for (let x = x0 + 3; x <= x1 - 4; x++) { const y = y0 + Math.round((x - x0 - 3) / (x1 - x0 - 7) * 2); px(x, y - 1, INK, 0.7); px(x, y, '#ffffff'); px(x, y + 1, '#bfefff'); }   // 윗면
    for (let y = y0 + 6; y <= y1; y++) { px(x0 - 1, y, INK, 0.7); px(x0, y, '#e8faff'); px(x1, y, '#4a90c0'); px(x1 + 1, y, INK, 0.7); }
    for (const [a, b] of [[0.18, 0.5], [0.52, 0.8]]) for (let s = 0; s < 9; s++) px(x0 + (x1 - x0) * a + s, y0 + 9 + s * 2 + (b - 0.5) * 10, '#ffffff', 0.55);   // 면 빛 줄
    const q = cyc(t, 1500); if (q < 0.3) spr(g, x0 + 4 + q / 0.3 * (x1 - x0 - 8), y0 + 1, S.flake, PAL.flake);
  },
  stun(g, B, t) { orbit(B, t, 3, (x, y, a) => spr(g, x, y, S.star, PAL.star, a)); },   // 별 셋이 머리 위를 돎
  charm(g, B, t) { for (let i = 0; i < 2; i++) { const q = cyc(t, 1400, i * 700); spr(g, B.hx + Math.sin(q * 6 + i) * 4 + (i ? 9 : -10), B.top - 2 - q * 18, S.heart, PAL.heart, Math.sin(q * Math.PI) * 1.5); } },   // 하트가 떠오르며 흔들림
  paral(g, B, t) { sparks(g, B, t, 380, 3); },   // 마비: 노란 불꽃이 자주 튐 · 식물은 느릿느릿(plantClock)
  root(g, B, t) {   // 뿌리 묶임: 흙 줄을 덩굴 둘이 감음(마디 · 가시) — 조이듯 숨 쉼
    const rx = Math.round(wide(B) * 1.15), p = 0.8 + 0.2 * Math.sin(t / 300), c = g.c, o = c.globalAlpha;
    for (let i = -rx; i <= rx; i++) for (const [ph, dy, col] of [[0, 2, '#4a8a30'], [2.4, -3, '#3a6a24']]) { const y = Math.round(B.soil + dy + Math.sin((i / rx) * Math.PI + ph) * 2); c.globalAlpha = o * p * 0.85; g.rect(B.cx + i, y - 1, 1, 1, INK); g.rect(B.cx + i, y + 2, 1, 1, INK); c.globalAlpha = o * p; g.rect(B.cx + i, y, 1, 2, i % 5 ? col : '#9ad050'); }
    c.globalAlpha = o;
  },
  taunt(g, B, t) { spr(g, B.hx + B.dir * (B.hr * 0.9), B.top - 3, S.anger, PAL.anger, 0.75 + 0.25 * Math.sin(t / 140)); },   // 도발: 머리 옆 빨간 핏대(두근)
  seal(g, B, t) { spr(g, B.hx, B.top - 13 + Math.sin(t / 380) * 1.5, S.lock, PAL.lock); },   // 봉인: 머리 위 자물쇠가 둥실
  leech(g, B, t) { spr(g, B.hx + Math.round(Math.sin(t / 420)), B.top - 4, S.sprout, PAL.sprout); },   // 기생 씨앗: 머리에 싹(흔들림)
  dark(g, B, t) { const x = B.hx + Math.sin(t / 700) * 2, y = B.top - 16; spr(g, x, y, S.cloud, PAL.cloud, 0.95); const q = cyc(t, 1500); if (q < 0.4) spr(g, x + 2, y + 5 + q * 22, S.drop, PAL.cloud, 1 - q * 2.5); },   // 햇빛 가림 · 그늘: 머리 위 먹구름
  // 보호 · 강화(보호막 · 갑주 · 튕김은 아래 '막는 효과 = 둘레 원'으로 — 2026-10-29)
  will(g, B, t) { for (let i = 0; i < 3; i++) { const q = cyc(t, 900, i * 300), x = B.cx + (hash(i, Math.floor((t + i * 300) / 900)) - 0.5) * wide(B) * 2; spr(g, x, B.soil - q * 30, S.mote, PAL.gold, Math.sin(q * Math.PI) * 1.3); } },   // 의지: 흙 줄에서 금빛 알갱이가 오름
  aim(g, B, t) { spr(g, B.hx + B.dir * (B.hr + 9), B.hy, S.reticle, PAL.reticle, 0.8 + 0.2 * Math.sin(t / 200)); },   // 겨눔: 상대 쪽 앞 조준 꺾쇠
  regen(g, B, t) { for (let i = 0; i < 2; i++) { const q = cyc(t, 1200, i * 600); spr(g, B.cx + (i ? 1 : -1) * wide(B) * 0.9, B.hy + 10 - q * 20, S.plus, PAL.plus, Math.sin(q * Math.PI) * 1.4); } },   // 재생: 초록 십자가 떠오름
  revive(g, B, t) { const rx = Math.round(B.hr * 0.85), a = 0.75 + 0.25 * Math.sin(t / 300), n = rx * 7, c = g.c, o = c.globalAlpha; for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2, x = Math.round(B.hx + Math.cos(an) * rx), y = Math.round(B.top - 12 + Math.sin(an) * 2.5); c.globalAlpha = o * a * 0.7; g.rect(x, y + 1, 1, 1, INK); c.globalAlpha = o * a; g.rect(x, y, 1, 1, Math.sin(an) > 0 ? '#fff4c0' : '#d8a840'); } c.globalAlpha = o; },   // 부활 대기: 머리 위 금빛 고리
  fruit(g, B, t, n) { orbit(B, t, Math.min(4, n || 1), (x, y, a) => spr(g, x, y, S.fruit, PAL.fruit, a), 0.55, 1.6); },   // 빙결열매: 몸 둘레를 열매가 돎(개수)
  spore(g, B, t, n) { for (let i = 0; i < Math.min(5, n || 1); i++) spr(g, B.cx + (hash(i, 9) - 0.5) * wide(B) * 1.8, B.hy + 4 + hash(i, 4) * (B.soil - B.hy - 8), S.spore, PAL.spore, 0.7 + 0.3 * Math.sin(t / 260 + i)); },   // 포자: 몸에 붙은 포자가 깜빡(개수)
  chill(g, B, t, n) { for (let i = 0; i < 2 + Math.min(3, n || 1); i++) { const q = cyc(t, 1600, i * 330); spr(g, B.cx + (hash(i, 2) - 0.5) * wide(B) * 2.6 + Math.sin(q * 6 + i) * 2, B.top - 4 + q * (B.soil - B.top), S.flake, PAL.flake, Math.sin(q * Math.PI) * 1.2); } },   // 서리: 눈송이가 내려앉음(쌓인 만큼)
  shock(g, B, t) { sparks(g, B, t, 900, 1); },   // 감전(쌓임): 가끔 불꽃
  down(g, B, t) { chev(g, B, t, -1, S.down, PAL.down); },   // 약화: 옆에서 아래 꺾쇠가 가라앉음
  up(g, B, t) { chev(g, B, t, 1, S.up, PAL.up); },          // 강화: 옆에서 위 꺾쇠가 떠오름
};
function drip(g, B, t, pal, per, from) {   // 방울: 몸에서 흙 줄로 떨어져(가속) 양옆으로 튐
  const q = cyc(t, per), k = Math.floor(t / per), x = B.cx + (hash(k, 5) - 0.5) * wide(B) * 1.6, y0 = B.hy + (B.soil - B.hy) * from, y1 = B.soil - 2;
  if (q < 0.7) { const u = q / 0.7; spr(g, x, y0 + (y1 - y0) * u * u, S.drop, pal); }
  else { const s = (q - 0.7) * 12, a = 1 - (q - 0.7) * 3.3; spr(g, x - 2 - s, y1 - s * 0.6, ['a'], pal, a); spr(g, x + 2 + s, y1 - s * 0.6, ['a'], pal, a); }
}
function orbit(B, t, n, draw, yk = 0, rk = 1) {   // 머리 위(yk = 0) 또는 몸 둘레(yk = 위에서부터 비율)를 n개가 돎 · 뒤쪽은 옅게
  const rx = (B.hr + 5) * rk, ry = 4 * rk, cy = yk ? B.top + (B.soil - B.top) * yk : B.top - 8, cx = yk ? B.cx : B.hx;
  for (let i = 0; i < n; i++) { const an = t / 420 + i * (Math.PI * 2 / n); draw(cx + Math.cos(an) * rx, cy + Math.sin(an) * ry, Math.sin(an) > 0 ? 1 : 0.6); }
}
function sparks(g, B, t, per, n) {   // 노란 지그재그 불꽃: per마다 몸 위 아무 데서나 잠깐(0.14초)
  for (let i = 0; i < n; i++) { const q = cyc(t, per, i * per / n), k = Math.floor((t + i * per / n) / per); if (q * per > 140) continue;
    spr(g, B.cx + (hash(k, i + 11) - 0.5) * wide(B) * 2, B.hy + hash(k, i + 13) * (B.soil - B.hy - 6), hash(k, i) > 0.5 ? S.spark : S.spark.map(r => [...r].reverse().join('')), PAL.spark); }
}
function chev(g, B, t, dir, rows, pal) {   // 꺾쇠(∨ 약화 · ∧ 강화): 몸 양옆에서 하나씩 천천히 오르내리며 사라짐
  for (let i = 0; i < 2; i++) { const q = cyc(t, 1500, i * 750), side = i ? 1 : -1; spr(g, B.cx + side * wide(B) * 1.35, (B.hy + B.soil) / 2 - dir * (q - 0.5) * 20, rows, pal, Math.sin(q * Math.PI) * 1.3); }
}

// 중요한 것부터(행동을 막는 것 → 지속 피해 → 나머지) · 한 식물에 넷까지
const PRI = ['frozen', 'stun', 'charm', 'paral', 'root', 'taunt', 'seal', 'burn', 'poison', 'bleed', 'leech', 'shock', 'chill', 'wet', 'dark', 'revive', 'will', 'aim', 'fruit', 'spore', 'regen', 'down', 'up'];
const DOWN = new Set(['atkDown', 'defDown', 'spdDown', 'critDown', 'accDown']), UP = new Set(['atkUp', 'defUp', 'spdUp', 'critUp', 'accUp', 'flourish']);
export function auraKinds(list) {
  const have = new Map();
  for (const s of list || []) { const k = DOWN.has(s.id) ? 'down' : UP.has(s.id) ? 'up' : s.id === 'shade' ? 'dark' : s.id; if (M[k] && !have.has(k)) have.set(k, s.n || 1); }
  return PRI.filter(k => have.has(k)).slice(0, 4).map(k => [k, have.get(k)]);
}
// 식물 하나의 표시를 모두(식물을 그린 바로 뒤에 부름) — list = 그 식물에 걸린 효과(listOf) · B = plantBox
export function drawAuras(g, list, B, t) {
  if (!B) return;
  for (const [k, n] of auraKinds(list)) M[k](g, B, t, n);
}

// ── 막는 효과 = 식물을 화분까지 감싸는 원(2026-10-29 사용자 '보호막이나 이런건 눈으로 계속 보이게 해줄 수 있나? 원형으로') ──
//  전엔 보호막 = 몸에 붙은 1칸 가는 타원(하늘색이라 아쿠아벌브 유리 몸과 섞여 거의 안 보임) · 갑주 = 2.2초에 한 번 쇠빛만 지나감
//  보호막 = 하늘빛 유리 방울(속은 옅게 · 가장자리로 갈수록 짙게 · 왼쪽 위 흰 빛 초승달 · 빛 한 점이 테를 돎) · 갑주 = 쇠 고리(판 여덟 · 이음매 · 징 · 쇠빛이 돎)
//  튕김 = 분홍 젤리 막(여섯 장으로 출렁) · 방어 자세 = 상대 쪽 앞을 가리는 금빛 쇠 반달 · 반사 = 보라 거울 고리(흰 빛 줄이 비스듬히 스침) — 자세 둘은 그 턴만
//  생길 때 톡 커지며 · 막을 때 밝게 번쩍하며 살짝 부풂 · 없어질 때 보호막 · 튕김 = 조각나 튐, 갑주 = 판이 떨어짐, 자세 = 스르르
//  원 그림은 (종류 · 반지름 · 장)마다 한 번 그려 둠 — 매 장 점 수천 개를 찍지 않게(10-17 발열 결정)
const TAU = Math.PI * 2;
const BODY = new Map();
function bodyOf(key) {   // 그림 판 안에서 식물이 차지하는 칸(대기 네 장 · 앞뒤 층을 합침) — 한 번만 셈 · 못 세면 null
  if (BODY.has(key)) return BODY.get(key);
  const P = bigOf(key), m = P && P.meta; let b = null;
  if (!m) return null;
  try {
    const cv = document.createElement('canvas'); cv.width = m.w; cv.height = m.h;
    const x = cv.getContext('2d', { willReadFrequently: true });
    let x0 = m.w, y0 = m.h, x1 = -1, y1 = -1;
    for (const f of [0, 16, 32, 48]) for (const ly of [0, m.rows]) {
      if (f >= m.frames) continue;
      x.clearRect(0, 0, m.w, m.h); x.drawImage(P.sheet, (f % m.cols) * m.w, (Math.floor(f / m.cols) + ly) * m.h, m.w, m.h, 0, 0, m.w, m.h);
      const d = x.getImageData(0, 0, m.w, m.h).data;
      for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (d[(j * m.w + i) * 4 + 3] > 60) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    }
    if (x1 >= 0) b = { x0, y0, x1, y1 };
  } catch (e) { b = null; }
  BODY.set(key, b); return b;
}
// 원 자리: 식물 + 화분(판 x 25~71 · 굽 = base 줄)을 다 넣는 가장 작은 원 + 3칸 — { cx, cy, r }
export function barrierBox(key, bx, by, flip) {
  const P = bigOf(key); if (!P) return null;
  const m = P.meta, b = bodyOf(key) || { x0: 12, y0: 4, x1: m.w - 12, y1: m.base[1] };
  const x0 = Math.min(b.x0, 25), x1 = Math.max(b.x1, 71), y0 = b.y0, y1 = Math.max(Math.min(b.y1, m.h - 1), m.base[1] + 1);
  const ox = bx - m.base[0], oy = by - m.base[1], mx = (x0 + x1) / 2, cx = Math.round(ox + (flip ? m.w - mx : mx)), cy = Math.round(oy + (y0 + y1) / 2);
  return { cx, cy, r: Math.ceil(Math.max(x1 - x0, y1 - y0) / 2) + 3 };
}
// 한 칸씩 색: e = 테 안쪽으로 몇 칸(0~1 = 맨 바깥 테 줄 · 0 아래 = 바깥 먹선) · L = 왼쪽 위 빛(1) ~ 오른쪽 아래(-1) · th = 각도 · face = 상대 쪽 각도
const metal = (pal, v) => pal[v > 0.85 ? 0 : v > 0.66 ? 1 : v > 0.48 ? 2 : v > 0.3 ? 3 : 4];
const STEEL = ['#f4f8ff', '#d2dae6', '#a9b3c3', '#7f899b', '#5a6274'], GOLD = ['#fff4c0', '#f2cf66', '#cfa040', '#9c7028', '#6a4a1a'];
const angGap = (a, b) => Math.abs((((a - b) % TAU) + TAU + Math.PI) % TAU - Math.PI);
const LOOK = {
  shield(e, L) {   // 유리 방울
    if (e <= 0) return [INK, 0.5];
    if (e <= 1) return ['#e4f8ff', 0.95];
    if (e <= 2) return ['#74c4f2', 0.9];
    if (L > 0.9 && e > 2.4 && e <= 2.4 + 4 * (L - 0.9) / 0.1) return ['#ffffff', L > 0.96 ? 0.95 : 0.7];   // 왼쪽 위 흰 빛 초승달(가운데 4칸 · 끝 가늘게)
    if (L < -0.94 && e <= 3.6) return ['#ffffff', 0.4];   // 오른쪽 아래 되비침
    return ['#8ccfff', e <= 3 ? 0.36 : e <= 4 ? 0.24 : e <= 6 ? 0.15 : 0.09];
  },
  bounce(e, L) {   // 젤리 막(분홍)
    if (e <= 0) return [INK, 0.45];
    if (e <= 1) return ['#ffd2f2', 0.95];
    if (e <= 2.2) return ['#e25cbc', 0.85];
    if (L > 0.93 && e > 2.6 && e <= 2.6 + 3 * (L - 0.93) / 0.07) return ['#ffffff', 0.75];
    return ['#ff8ad8', e <= 3.2 ? 0.34 : e <= 5 ? 0.2 : 0.1];
  },
  armor(e, L, th, r) {   // 쇠 고리: 4칸 띠(안 밝게 · 바깥 어둡게 + 왼쪽 위 빛) · 판 여덟 이음매 · 판 가운데 징(어두운 3칸 + 흰 점)
    if (e <= 0 || (e > 4 && e <= 5)) return [INK, 0.75];
    if (e > 5) return null;
    const u = ((th / (TAU / 8)) % 1 + 1) % 1, arc = Math.min(u, 1 - u) * (TAU / 8) * r, mid = Math.abs(u - 0.5) * (TAU / 8) * r;   // 이음매(판 경계) · 판 가운데까지 테 길이
    if (arc < 0.7) return ['#3a4050', 1];
    if (mid < 1.6 && e > 1.4 && e <= 3.6) return [mid < 0.6 && e > 2.4 ? '#ffffff' : '#3a4050', 1];
    return [metal(STEEL, 0.52 + 0.36 * L + (e > 3 ? 0.16 : e > 2 ? 0.06 : e > 1 ? -0.04 : -0.18)), 1];
  },
  guard(e, L, th, r, face) {   // 금빛 쇠 반달(방패 테): 상대 쪽 ±54° · 6칸(끝으로 갈수록 가늘게) · 징 셋
    const da = angGap(th, face), span = 0.95;
    if (da > span + 0.05) return null;
    const w = da > span - 0.1 ? 3 : da > span - 0.25 ? 5 : 6;
    if (e <= 0 || (e > w && e <= w + 1) || da > span) return e <= w + 1 ? [INK, 0.8] : null;
    if (e > w + 1) return null;
    const rv = Math.min(da * r, Math.abs(da - span * 0.55) * r);
    if (rv < 1.6 && e > 2 && e <= 4.4) return [rv < 0.6 && e > 3.2 ? '#ffffff' : '#6a4a1a', 1];   // 징(가운데 · 양옆)
    return [metal(GOLD, 0.5 + 0.36 * L + (e > 4 ? 0.16 : e > 2.5 ? 0.06 : e > 1 ? -0.04 : -0.18)), 1];
  },
  reflect(e) {   // 거울 고리: 3칸 테(흰 · 보라 · 흰) + 안쪽 먹선 · 속은 옅은 보라
    if (e <= 0) return [INK, 0.6];
    if (e <= 1) return ['#f6f2ff', 0.95];
    if (e <= 2) return ['#a890ec', 0.95];
    if (e <= 3) return ['#e8e0ff', 0.8];
    if (e <= 4) return [INK, 0.3];
    return ['#d8d0ff', e <= 6 ? 0.16 : 0.08];
  },
};
const RING = new Map();
function ringCv(kind, r, fr = 0, face = 0) {   // 원 한 장 — 가운데 칸 = (r + 2, r + 2)
  const fk = kind === 'guard' ? Math.round(face * 10) : 0, k = kind + ':' + r + ':' + fr + ':' + fk;
  let cv = RING.get(k); if (cv) return cv;
  const S = 2 * r + 5, C = r + 2.5;
  cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d');
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = i + 0.5 - C, dy = j + 0.5 - C, th = Math.atan2(dy, dx), L = Math.cos(th + Math.PI * 0.75);
    const d = Math.hypot(dx, dy) - (kind === 'bounce' ? 1.6 * Math.sin(3 * th + (fr / 6) * TAU) : 0), e = r - d;
    if (e < -1) continue;
    const p = LOOK[kind](e, L, th, r, fk / 10); if (!p) continue;
    x.globalAlpha = p[1]; x.fillStyle = p[0]; x.fillRect(i, j, 1, 1);
  }
  if (kind === 'shield' || kind === 'bounce') {   // 왼쪽 위 반짝 한 점(십자)
    const gx = Math.floor(C - Math.cos(Math.PI / 4) * r * 0.62), gy = Math.floor(C - Math.sin(Math.PI / 4) * r * 0.62);
    x.globalAlpha = 0.9; x.fillStyle = '#ffffff'; x.fillRect(gx, gy - 1, 1, 3); x.fillRect(gx - 1, gy, 3, 1);
  }
  RING.set(k, cv); return cv;
}
const BAR = ['armor', 'bounce', 'shield', 'reflect', 'guard'];   // 안 → 바깥(여럿이면 4칸씩 바깥으로)
// 지금 그릴 막: 효과 목록(보호막 · 갑주 · 튕김) + 이 턴 자세(방어 · 반사 — 헛자세 빼고)
export function barrierKinds(list, stance) {
  const out = [];
  for (const s of list || []) if ((s.id === 'shield' || s.id === 'armor' || s.id === 'bounce') && !out.includes(s.id)) out.push(s.id);
  if (stance && stance.active && (stance.kind === 'guard' || stance.kind === 'reflect')) out.push(stance.kind);
  return out;
}
// 막을 때 번쩍(장면이 맞는 순간에 부름) — S = 장면이 들고 있는 상태(this.bars)
export function barrierHit(S, who, kind, t) { const s = S && (S[who] ||= { uid: null, on: {}, pops: [] }); if (s) s.hit = { k: kind, t }; }
const oq = q => 1 - (1 - q) * (1 - q);
function wedge(g, x0, y0, r, a0, a1, dx, dy, cv, X, Y, alpha) {   // 원 그림의 부채꼴 한 조각만 (dx, dy) 옮겨 그림 — 깨질 때
  const c = g.c; c.save(); c.globalAlpha = alpha; c.translate(dx, dy);
  c.beginPath(); c.moveTo(x0, y0); c.arc(x0, y0, r, a0, a1); c.closePath(); c.clip(); c.drawImage(cv, X, Y); c.restore();
}
// 식물 하나의 막을 모두(식물을 그린 바로 뒤) — have = barrierKinds · B = barrierBox · uid = 식물이 바뀌면 상태를 새로(터짐 없이) · face = 상대 쪽 각도
export function drawBarriers(g, S, who, have, B, t, uid, face) {
  if (!B || !S) return;
  const s = (S[who] ||= { uid, on: {}, pops: [] });
  if (s.uid !== uid) { s.uid = uid; s.on = {}; s.pops = []; }
  for (const k of Object.keys(s.on)) if (!have.includes(k)) { s.pops.push({ k, t0: t, r: s.on[k].r, cx: B.cx, cy: B.cy, face }); delete s.on[k]; }
  const c = g.c, o = c.globalAlpha;
  let i = 0;
  for (const k of BAR) {
    if (!have.includes(k)) continue;
    const on = (s.on[k] ||= { t0: t }), r = B.r + 4 * i++, age = t - on.t0, hit = s.hit && s.hit.k === k ? t - s.hit.t : 1e9;
    on.r = r;
    let sc = 1, a = 1;
    if (age < 300) { sc = age < 160 ? 0.72 + 0.36 * oq(age / 160) : 1.08 - 0.08 * ((age - 160) / 140); a = Math.min(1, age / 120); }   // 톡 커지며 나타남
    if (hit < 300) sc *= 1 + 0.05 * (1 - hit / 300);   // 막을 때 살짝 부풂
    const rr = Math.max(6, Math.round(r * sc)), cv = ringCv(k, rr, k === 'bounce' ? Math.floor(t / 110) % 6 : 0, face), X = B.cx - rr - 2, Y = B.cy - rr - 2;
    const breath = k === 'shield' || k === 'bounce' ? 0.86 + 0.14 * Math.sin(t / 480) : 1;
    c.globalAlpha = o * a * breath; c.drawImage(cv, X, Y);
    if (hit < 320) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = o * 0.85 * (1 - hit / 320); c.drawImage(cv, X, Y); c.restore(); }   // 번쩍
    c.globalAlpha = o * a;
    const px = (an, rad, col, al) => { c.globalAlpha = o * a * al; g.rect(Math.floor(B.cx + 0.5 + Math.cos(an) * rad), Math.floor(B.cy + 0.5 + Math.sin(an) * rad), 1, 1, col); };
    if (k === 'shield' || k === 'bounce') { const ph = -t / 2600 * TAU; for (let q = -6; q <= 6; q++) px(ph + q / rr, rr - 0.5, '#ffffff', 1 - Math.abs(q) / 7); }   // 빛 한 점이 테를 돎
    else if (k === 'armor') { const ph = t / 3000 * TAU; for (let q = -8; q <= 8; q++) for (const rd of [rr - 1.5, rr - 2.5, rr - 3.5]) px(ph + q / rr, rd, '#ffffff', 0.8 * (1 - Math.abs(q) / 9)); }   // 쇠빛이 돎
    else if (k === 'reflect') {   // 흰 빛 줄 둘이 비스듬히 스침(1.6초마다 0.4초)
      const q = cyc(t, 1600); if (q < 0.25) for (const off of [0, 6]) { const u = (q / 0.25) * 2.4 - 1.2 - off / rr, mx = B.cx + 0.5 + u * rr * 0.7071, my = B.cy + 0.5 + u * rr * 0.7071;
        for (let s2 = -rr; s2 <= rr; s2++) { const x = mx + s2 * 0.7071, y = my - s2 * 0.7071; if (Math.hypot(x - B.cx - 0.5, y - B.cy - 0.5) < rr - 3) { c.globalAlpha = o * a * (off ? 0.35 : 0.65); g.rect(Math.floor(x), Math.floor(y), off ? 1 : 2, 1, '#ffffff'); } } }
    }
  }
  // 없어짐: 보호막 · 튕김 = 부풀었다 조각나 튐 · 갑주 = 판 여덟이 떨어짐 · 자세 = 스르르
  s.pops = s.pops.filter(p => t - p.t0 < (p.k === 'armor' ? 700 : p.k === 'shield' || p.k === 'bounce' ? 520 : 260));
  for (const p of s.pops) {
    const age = t - p.t0, cv = ringCv(p.k, p.r, 0, p.face), X = p.cx - p.r - 2, Y = p.cy - p.r - 2, C = [p.cx + 0.5, p.cy + 0.5];
    if (p.k === 'guard' || p.k === 'reflect') { c.globalAlpha = o * (1 - age / 260); c.drawImage(cv, X, Y); continue; }
    if (p.k === 'armor') { const q = age / 700; for (let n = 0; n < 8; n++) { const a0 = (n / 8) * TAU, mid = a0 + TAU / 16, sp = 6 + (n % 3) * 3; wedge(g, C[0], C[1], p.r + 2, a0, a0 + TAU / 8, Math.cos(mid) * q * sp, Math.sin(mid) * q * sp + q * q * 34, cv, X, Y, o * (1 - q * q)); } continue; }
    if (age < 90) { const q = age / 90, rr = p.r + Math.round(q * 3), cv2 = ringCv(p.k, rr); c.globalAlpha = o; c.drawImage(cv2, p.cx - rr - 2, p.cy - rr - 2); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = o * q * 0.7; c.drawImage(cv2, p.cx - rr - 2, p.cy - rr - 2); c.restore(); continue; }   // 부풂
    const q = oq((age - 90) / 430);
    for (let n = 0; n < 12; n++) { const a0 = (n / 12) * TAU + hash(n, 7) * 0.2, mid = a0 + TAU / 24, sp = 10 + hash(n, 3) * 10; wedge(g, C[0], C[1], p.r + 2, a0, a0 + TAU / 12, Math.cos(mid) * q * sp, Math.sin(mid) * q * sp + q * q * 8, cv, X, Y, o * (1 - q)); }
    for (let n = 0; n < 10; n++) { const an = (n / 10) * TAU + 0.3, rd = p.r + 2 + q * (14 + hash(n, 5) * 10); c.globalAlpha = o * (1 - q); g.rect(Math.floor(C[0] + Math.cos(an) * rd), Math.floor(C[1] + Math.sin(an) * rd), 2, 2, p.k === 'bounce' ? '#ffd2f2' : '#e4f8ff'); }   // 물방울
  }
  c.globalAlpha = o;
}
