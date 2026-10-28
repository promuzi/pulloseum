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
  // 보호 · 강화
  shield(g, B, t) {   // 보호막: 몸 둘레 막(속 = 옅은 하늘 · 테 = 하늘 2칸 + 어두운 바깥 줄) + 왼쪽 위 흰 빛 줄 — 숨 쉬듯
    const rx = wide(B) * 1.45, ry = (B.soil - B.top) / 2 + 7, cy = (B.soil + B.top) / 2, a = 0.6 + 0.2 * Math.sin(t / 420), c = g.c, o = c.globalAlpha, n = Math.round(rx * 7);
    c.save(); c.globalAlpha = o * 0.12; c.fillStyle = '#8ccfff'; c.beginPath(); c.ellipse(B.cx, cy, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.restore();
    for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2, x = Math.round(B.cx + Math.cos(an) * rx), y = Math.round(cy + Math.sin(an) * ry), hi = an > 3.5 && an < 4.5;
      c.globalAlpha = o * a * 0.6; g.rect(x + Math.sign(Math.cos(an)), y + Math.sign(Math.sin(an)), 1, 1, INK); c.globalAlpha = o * (hi ? 1 : a); g.rect(x, y, 1, 1, hi ? '#ffffff' : '#8ccfff'); }
    c.globalAlpha = o;
  },
  armor(g, B, t) { const q = cyc(t, 2200); if (q > 0.22) return; const u = q / 0.22, w = wide(B) * 2.2, x = B.cx - w / 2 + u * w, c = g.c, o = c.globalAlpha; c.globalAlpha = o * Math.sin(u * Math.PI); for (let s = 0; s < 16; s++) g.rect(Math.round(x - s * 0.6), Math.round(B.top + 4 + s * 3), 2, 2, '#f4f8ff'); c.globalAlpha = o; },   // 갑주: 쇠빛이 몸을 비스듬히 훑음
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
const PRI = ['frozen', 'stun', 'charm', 'paral', 'root', 'taunt', 'seal', 'burn', 'poison', 'bleed', 'leech', 'shock', 'chill', 'wet', 'dark', 'revive', 'shield', 'armor', 'will', 'aim', 'fruit', 'spore', 'regen', 'down', 'up'];
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
