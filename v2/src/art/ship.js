// 탐사선(위에서 본 모습, 앞 = 위) — 탐사 지도(진짜 배, 작게)와 정비 화면(홀로그램, 크게)이 같은 모양을 쓴다.
//  모양 = 옛 게임 탐사선 그림의 구성: 앞 센서 돔(탐사 장치) · 몸체 + 양쪽 장갑 날개(내구성) · 뒤 연료 탱크 둘 + 추진기(연료 탱크) · 오른쪽 날개 끝 관절 팔(채집기).
//  크기마다 다각형을 다시 칸으로 채워(그림을 늘리지 않음) 어떤 배율에서도 칸이 또렷하다 — 탐사 → 정비로 커지는 연출이 장마다 다시 그림.
//  2026-10-15 사용자 "탐사도 탐사선 누르면 탐사선 모양이 홀로그램처럼 변하는 오버랩 효과와 함께 확대되며 탐사선 강화와 셋팅 UI로 넘어가게"
export const SHIP_SC = 1.25;   // 정비 화면 크기(처음 판은 작고 흐렸음 → 1.25배)
export const PART_IDS = ['durability', 'fuel_tank', 'harvester', 'scanner'];   // 그리는 순서(뒤 → 앞)
const POLY = {
  hull: [[0, -46], [6, -40], [12, -22], [15, 6], [13, 30], [9, 40], [-9, 40], [-13, 30], [-15, 6], [-12, -22], [-6, -40]],
  wingL: [[-14, -6], [-40, 10], [-42, 20], [-38, 24], [-14, 24]],
  wingR: [[14, -6], [40, 10], [42, 20], [38, 24], [14, 24]],
  arm: [[[40, 16], [50, 22], [48, 26], [38, 21]], [[47, 22], [52, 34], [48, 35], [44, 25]], [[48, 33], [45, 41], [48, 42], [52, 35]], [[51, 33], [56, 40], [53, 42], [49, 35]]],
  tanks: [[[-12, 26], [-4, 26], [-4, 52], [-6, 55], [-10, 55], [-12, 52]], [[4, 26], [12, 26], [12, 52], [10, 55], [6, 55], [4, 52]]],
  nozzle: [[[-11, 55], [-5, 55], [-4, 60], [-12, 60]], [[5, 55], [11, 55], [12, 60], [4, 60]]],
};
const SEAMS = [[-15, -10, 30], [-18, 8, 36], [-16, 26, 32], [-48, 18, 18], [30, 18, 18]];   // 몸체·날개 이음매(x, y, 길이)
export const ANCHOR = { scanner: [0, -44], durability: [-28, 12], harvester: [49, 30], fuel_tank: [8, 50] };   // 부위 자리(배율 1 기준)

function polyPx(pts) {
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const out = [];
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) out.push([x, y]);
  }
  return out;
}
const discPx = (cx, cy, r) => { const o = []; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) o.push([cx + x, cy + y]); return o; };
const keyOf = (x, y) => (x + 400) * 2000 + (y + 400);
const cache = new Map();
// 배율 sc의 칸 묶음: { parts: {부위: [[x,y]…]}, edge: {부위: 테두리 칸}, sub: 칸마다 세부(날개·탱크·노즐·팔 구분), seams, top, bot }
export function shipAt(sc) {
  const k = Math.round(sc * 40) / 40;
  if (cache.has(k)) return cache.get(k);
  const sp = pts => pts.map(([x, y]) => [x * k, y * k]), sub = new Map();
  const tag = (list, name) => { for (const [x, y] of list) sub.set(keyOf(x, y), name); return list; };
  const hull = tag(polyPx(sp(POLY.hull)), 'hull'), wings = tag([...polyPx(sp(POLY.wingL)), ...polyPx(sp(POLY.wingR))], 'wing');
  const arm = tag(POLY.arm.flatMap(p => polyPx(sp(p))), 'arm'), tanks = tag(POLY.tanks.flatMap(p => polyPx(sp(p))), 'tank'), noz = tag(POLY.nozzle.flatMap(p => polyPx(sp(p))), 'nozzle');
  const dome = tag(discPx(0, Math.round(-44 * k), Math.max(1, Math.round(8 * k))), 'dome');
  const parts = { durability: [...wings, ...hull], scanner: dome, harvester: arm, fuel_tank: [...tanks, ...noz] }, edge = {};
  for (const id of PART_IDS) { const set = new Set(parts[id].map(([x, y]) => keyOf(x, y))); edge[id] = parts[id].filter(([x, y]) => !set.has(keyOf(x + 1, y)) || !set.has(keyOf(x - 1, y)) || !set.has(keyOf(x, y + 1)) || !set.has(keyOf(x, y - 1))); }
  let top = 0, bot = 0; for (const id of PART_IDS) for (const [, y] of parts[id]) { top = Math.min(top, y); bot = Math.max(bot, y); }
  const S = { k, parts, edge, sub, seams: SEAMS.map(([x, y, l]) => [Math.round(x * k), Math.round(y * k), Math.round(l * k)]), top, bot };
  cache.set(k, S); return S;
}

// 진짜 배 색(쇠 몸체 · 짙은 날개 · 유리 돔 · 주황 연료 탱크 · 추진기), 왼쪽 위에서 빛
const SOLID = {
  hull: ['#c4ccd8', '#9aa6b8', '#6e7a8e'], wing: ['#a4aec0', '#7d889c', '#5a6476'], arm: ['#b4bccb', '#8a94a6', '#626c7e'],
  tank: ['#f0a862', '#c8763a', '#8a4a22'], nozzle: ['#5a6070', '#3a404c', '#262a33'], dome: ['#e4fbff', '#5ad0f0', '#2a8ab0'],
  ink: '#1b2029', seam: '#5a6476',
};
// 홀로그램 색(정비 화면) — sel = 고른 부위(주황)
export const HOLO = { line: '#97e8f7', hi: '#e4fbff', fill: '#1e4a6a', fill2: '#2f7aa0', seam: '#4c88a9', sel: '#f0be7d', selFill: '#8a5a2a', selFill2: '#c48a48' };
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// 한 칸의 색: 진짜(solid) 또는 홀로그램(holo). 홀로그램은 홀수 줄 일부·채움 일부가 비어 비침(null)
function solidPx(S, id, X, Y, isEdge) {
  if (isEdge) return SOLID.ink;
  const c = SOLID[S.sub.get(keyOf(X, Y)) || 'hull'], lit = X + Y * 0.3 < -2 ? 0 : X > 4 * S.k ? 2 : 1;
  return c[lit];
}
function holoPx(S, id, X, Y, isEdge, on, flash) {
  if (isEdge) return flash ? '#ffffff' : on ? HOLO.sel : HOLO.line;
  if ((Y & 1) && B4[(Y + 64) & 3][(X + 64) & 3] > 9) return null;   // 홀수 줄 = 주사선
  if (B4[(Y + 64) & 3][(X + 64) & 3] >= (on ? 11 : 8)) return null;
  const lit = X < -2;
  return flash ? '#ffffff' : on ? (lit ? HOLO.selFill2 : HOLO.selFill) : (lit ? HOLO.fill2 : HOLO.fill);
}
// 그리기: (cx, cy) = 배 가운데, sc = 배율, mix = 홀로그램으로 바뀐 정도(0 = 진짜 배, 1 = 홀로그램) — 위에서 아래로 훑는 밝은 줄이 지나간 칸만 홀로그램
//  opt: sel = 고른 부위, flash = 강화 번쩍 부위, glitch = {y, dx}, t = 시각(추진기·센서 깜빡임), dir = -1 이면 아래에서 위로 훑음(돌아갈 때)
export function drawShip(g, cx, cy, sc, mix, opt = {}) {
  const S = shipAt(sc), t = opt.t || 0, span = S.bot - S.top + 6;
  const scanY = opt.dir === -1 ? S.bot + 3 - mix * span : S.top - 3 + mix * span;   // 훑는 줄 자리(배 좌표)
  const holoAt = Y => (opt.dir === -1 ? Y > scanY : Y < scanY);
  const put = (X, Y, c) => { if (!c) return; const gx = opt.glitch && Y >= opt.glitch.y && Y < opt.glitch.y + 4 ? opt.glitch.dx : 0; g.px(cx + X + gx, cy + Y, c); };
  for (const id of PART_IDS) {
    const eset = new Set(S.edge[id].map(([x, y]) => keyOf(x, y))), on = opt.sel === id, flash = opt.flash === id;
    for (const [X, Y] of S.parts[id]) {
      const e = eset.has(keyOf(X, Y));
      put(X, Y, mix >= 1 || (mix > 0 && holoAt(Y)) ? holoPx(S, id, X, Y, e, on, flash) : solidPx(S, id, X, Y, e));
    }
  }
  for (const [sx, sy, len] of S.seams) for (let k = 0; k < len; k += 2) { const Y = sy; if (mix >= 1 || (mix > 0 && holoAt(Y))) put(sx + k, Y, HOLO.seam); else put(sx + k, Y, SOLID.seam); }
  // 센서 빛 · 추진기 빛
  const dy = Math.round(-48 * S.k);
  put(0, dy, Math.floor(t / 300) % 2 ? HOLO.hi : HOLO.line);
  const nz = Math.round(10 * S.k), ny = Math.round(61 * S.k);
  for (const nx of [-nz, nz]) for (let k = 0; k < 2 + Math.round(S.k) + (Math.floor(t / 70) % 3); k++) if ((k + Math.floor(t / 90)) % 2) put(nx + (k % 2 ? 1 : -1), ny + k, '#5ad0f0');
  // 훑는 줄(바뀌는 동안): 밝은 줄 + 바로 뒤 옅은 줄
  if (mix > 0 && mix < 1) {
    const L = Math.round(S.top - 8 * S.k), R = Math.round(56 * S.k + 6), y = Math.round(scanY);
    for (let X = Math.round(-46 * S.k) - 6; X <= R; X++) { g.px(cx + X, cy + y, '#e4fbff'); if (X & 1) g.px(cx + X, cy + y - (opt.dir === -1 ? -1 : 1), '#97e8f7'); }
    void L;
  }
}
