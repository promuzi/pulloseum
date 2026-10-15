// 장소 테마 — 2026-10-15 사용자: 시안 세 방향(우주선 경기장 · 온실 콜로세움 · 밤 정원)을 고르지 않고 "다 적용하고 위치나 장소에 따라서".
// 색은 코덱스 시안(tools/pixel/big/concept/ui/direction_battle_crowd.png)의 판·단추에서 뽑았다(tools/pixel/big/bgconv.mjs 색 모으기).
//   우주선 = 흰 선체 테 + 짙은 남색 속 + 청록 네온, 각진 모서리 · 온실 = 구리 테 + 크림 종이 속 + 민트 단추, 둥근 모서리와 구리 꼭지 ·
//   밤 정원 = 라일락 테 + 남색 속 + 파스텔 민트 단추, 각진 모서리와 별 반짝.
// 장소 배정: 대회 경기장은 랭크 단계로(브론즈·실버 = 온실 → 골드·플래티넘 = 우주선 → 다이아 이상 = 밤 정원),
//   홈·상점·가방·식물 = 우주선(함선 안), 양육 = 온실, 탐사·타이틀 = 밤 정원.
// 모서리가 r칸 둥근 사각형(채움) — ui.js rrect 와 같음(서로 부르지 않게 따로 둠)
function rrect(g, x, y, w, h, r, col) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  for (let j = 0; j < h; j++) {
    const dy = j < r ? r - j - 0.5 : (j >= h - r ? j - (h - r) + 0.5 : 0);
    const ins = dy > 0 ? Math.ceil(r - Math.sqrt(Math.max(0, r * r - dy * dy)) - 0.01) : 0;
    g.rect(x + ins, y + j, w - ins * 2, 1, col);
  }
}

export const THEMES = {
  ship: {
    key: 'ship', name: '우주선 경기장', shape: 'chamfer',
    ink: '#06121c', bg: '#0b1d2c', bg2: '#082033', bgLine: '#174f5c',
    panel: { fill: '#1a3145', fill2: '#2a4961', frame: '#e3e9ef', frameHi: '#ffffff', frameLo: '#8db2bf', frameDk: '#3f677d', bolt: '#6c90a0' },
    deep: { fill: '#10243a', fill2: '#1a3145', frame: '#3f677d', frameHi: '#6c90a0', frameLo: '#2a4961', frameDk: '#0b1d2c' },
    msg: { fill: '#0b273d', edge: '#28aaba', edgeHi: '#77f0f1', edgeLo: '#186c7e' },
    btn: {
      primary: { fill: '#03acb6', hi: '#20eae5', hi2: '#7fe0e4', lo: '#046271', ring: '#046271', text: '#ffffff' },
      gold: { fill: '#ffc83c', hi: '#ffe08a', hi2: '#fff4c8', lo: '#b8781c', ring: '#b8781c', text: '#3a2408' },
      second: { fill: '#2a4961', hi: '#3f677d', hi2: '#6c90a0', lo: '#10243a', ring: '#10243a', text: '#e3e9ef' },
      off: { fill: '#14263a', hi: '#1a3145', hi2: '#1a3145', lo: '#0b1d2c', ring: '#0b1d2c', text: '#4a6278' },
      danger: { fill: '#e2537b', hi: '#f48aa8', hi2: '#ffc0d0', lo: '#8b2440', ring: '#8b2440', text: '#ffffff' },
      good: { fill: '#3ec25f', hi: '#45f777', hi2: '#b8ffc8', lo: '#1f6a34', ring: '#1f6a34', text: '#06121c' },
    },
    text: { main: '#ffffff', sub: '#a8c8d8', dim: '#5a7a90', accent: '#57f1f5', gold: '#ffc83c', bad: '#ff7a8a', good: '#45f777' },
    ptext: { main: '#ffffff', sub: '#a8c8d8', dim: '#5a7a90', accent: '#57f1f5', gold: '#ffc83c', bad: '#ff7a8a', good: '#45f777' },
    mtext: { main: '#e3fbff', sub: '#77f0f1' },
    bar: { back: '#0b1d2c', hp: ['#45f777', '#b8ffc8', '#1f9a4a'], mid: ['#ffc83c', '#fff0a0', '#b8781c'], low: ['#ff5a6a', '#ffb0b8', '#a02030'], exp: ['#57f1f5', '#c8fcff', '#1a8a9a'] },
    pip: { on: '#57f1f5', onHi: '#e0ffff', onLo: '#1a8a9a', off: '#1a3145', offLo: '#0b1d2c', kind: 'diamond' },
    pad: { fill: '#22384e', top: '#2e4a64', rim: '#3f677d', edge: '#0b1d2c', glow: '#57f1f5', glow2: '#e2537b' },
  },
  garden: {
    key: 'garden', name: '온실 콜로세움', shape: 'round',
    ink: '#2b1608', bg: '#221b12', bg2: '#2b2418', bgLine: '#4a3a24',
    panel: { fill: '#f6e6ca', fill2: '#ead2ac', frame: '#c8783c', frameHi: '#f0a868', frameLo: '#8a3e1e', frameDk: '#a6432d', bolt: '#f0c070' },
    deep: { fill: '#2b4224', fill2: '#35522c', frame: '#a86b49', frameHi: '#d99d6f', frameLo: '#6e4430', frameDk: '#1d2c18' },
    msg: { fill: '#f6e6ca', edge: '#b86535', edgeHi: '#e0955a', edgeLo: '#7a3a1c', leaf: '#64ae48', leaf2: '#3f8f46' },
    btn: {
      primary: { fill: '#42d78e', hi: '#7be898', hi2: '#afefaa', lo: '#25985e', ring: '#be8040', text: '#16341f' },
      gold: { fill: '#ffc24a', hi: '#ffe08a', hi2: '#fff2c0', lo: '#c07a1c', ring: '#8a4a1c', text: '#3a2008' },
      second: { fill: '#f6e6ca', hi: '#fff6e4', hi2: '#ffffff', lo: '#d8b88a', ring: '#be8040', text: '#5a3418' },
      off: { fill: '#5a4a38', hi: '#6a5844', hi2: '#6a5844', lo: '#3e3226', ring: '#3e3226', text: '#a08a70' },
      danger: { fill: '#f08a6a', hi: '#ffb498', hi2: '#ffd8c8', lo: '#b04a32', ring: '#8a3e1e', text: '#3a1408' },
      good: { fill: '#42d78e', hi: '#7be898', hi2: '#afefaa', lo: '#25985e', ring: '#be8040', text: '#16341f' },
    },
    text: { main: '#fff4dc', sub: '#e0c8a0', dim: '#9a8468', accent: '#7be898', gold: '#ffc24a', bad: '#ff9a7a', good: '#7be898' },
    ptext: { main: '#3a2410', sub: '#7a5432', dim: '#b0946c', accent: '#2f8a52', gold: '#b86a10', bad: '#c03a2a', good: '#2f8a52' },
    mtext: { main: '#3a2410', sub: '#8a5a30' },
    bar: { back: '#172e24', hp: ['#4df87a', '#c8ffd0', '#1f9a4a'], mid: ['#ffc24a', '#fff0a0', '#c07a1c'], low: ['#f05a4a', '#ffb0a0', '#9a2a1a'], exp: ['#7be898', '#e0ffe0', '#2f8a52'] },
    pip: { on: '#4df87a', onHi: '#d8ffd8', onLo: '#1f8a4a', off: '#3e5a30', offLo: '#1d2c18', kind: 'leaf' },
    pad: { fill: '#d8c4a0', top: '#e8dabc', rim: '#a88a62', edge: '#6e5638', glow: '#7be898', glow2: '#f08a6a', moss: '#7aa050' },
  },
  night: {
    key: 'night', name: '밤 정원', shape: 'chamfer',
    ink: '#0c1430', bg: '#141f44', bg2: '#182a58', bgLine: '#283c7f',
    panel: { fill: '#192e5b', fill2: '#22397a', frame: '#9f88d8', frameHi: '#e9c8e2', frameLo: '#5e5cb1', frameDk: '#2a2f6a', bolt: '#cfa8ea' },
    deep: { fill: '#141f44', fill2: '#192e5b', frame: '#4f51b6', frameHi: '#8d75c8', frameLo: '#283c7f', frameDk: '#0c1430' },
    msg: { fill: '#1d2f5d', edge: '#8d75c8', edgeHi: '#f0d8f6', edgeLo: '#48459f' },
    btn: {
      primary: { fill: '#8efbdb', hi: '#befdeb', hi2: '#ffffff', lo: '#53c8c0', ring: '#b1c5f2', text: '#152a53' },
      gold: { fill: '#ffc8a8', hi: '#ffe0cc', hi2: '#fff4ec', lo: '#d08a78', ring: '#f0b8c8', text: '#3a1a28' },
      second: { fill: '#283c7f', hi: '#4f51b6', hi2: '#8d75c8', lo: '#182a58', ring: '#8d75c8', text: '#f0d8f6' },
      off: { fill: '#1d2a50', hi: '#22305c', hi2: '#22305c', lo: '#141f44', ring: '#2a3570', text: '#5a6a9a' },
      danger: { fill: '#f477a1', hi: '#ffa8c4', hi2: '#ffd8e6', lo: '#be335e', ring: '#f0b8c8', text: '#2a0a18' },
      good: { fill: '#8efbdb', hi: '#befdeb', hi2: '#ffffff', lo: '#53c8c0', ring: '#b1c5f2', text: '#152a53' },
    },
    text: { main: '#ffffff', sub: '#c8b8f0', dim: '#6a72a8', accent: '#8efbdb', gold: '#ffc8a8', bad: '#f477a1', good: '#8efbdb' },
    ptext: { main: '#ffffff', sub: '#c8b8f0', dim: '#6a72a8', accent: '#8efbdb', gold: '#ffc8a8', bad: '#f477a1', good: '#8efbdb' },
    mtext: { main: '#f8eefc', sub: '#cfa8ea' },
    bar: { back: '#0c1430', hp: ['#40f981', '#c8ffd8', '#1f9a5a'], mid: ['#ffd88a', '#fff2c8', '#c08a3a'], low: ['#f477a1', '#ffc0d4', '#a02a5a'], exp: ['#8efbdb', '#e8fff8', '#3aa898'] },
    pip: { on: '#8ce8e5', onHi: '#f0ffff', onLo: '#3aa898', off: '#283c7f', offLo: '#141f44', kind: 'diamond' },
    pad: { fill: '#8a86c8', top: '#a8a2dc', rim: '#5e5cb1', edge: '#2a2f6a', glow: '#8efbdb', glow2: '#f477a1' },
  },
};

export let T = THEMES.ship;
export function setTheme(key) { T = THEMES[key] || THEMES.ship; return T; }
export const VENUE_OF_TIER = { bronze: 'garden', silver: 'garden', gold: 'ship', platinum: 'ship', diamond: 'night', master: 'night', pulloseum: 'night' };
export const TIER_KEY = { 브론즈: 'bronze', 실버: 'silver', 골드: 'gold', 플래티넘: 'platinum', 다이아: 'diamond', 마스터: 'master', 풀로세움: 'pulloseum' };
export const venueOf = tierName => VENUE_OF_TIER[TIER_KEY[tierName] || tierName] || 'garden';

// ── 모양 ──
// 모서리를 c칸 깎은 사각형(채움)
export function cham(g, x, y, w, h, c, col) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  for (let j = 0; j < h; j++) { const ins = j < c ? c - j : j >= h - c ? j - (h - c) + 1 : 0; g.rect(x + ins, y + j, w - ins * 2, 1, col); }
}
const fillShape = (g, x, y, w, h, r, col) => (T.shape === 'round' ? rrect(g, x, y, w, h, r, col) : cham(g, x, y, w, h, r, col));

// 판(체력판·카드·창): kind = 'panel'(기본) | 'deep'(한 단 어두운 속)
export function plate(g, x, y, w, h, kind = 'panel') {
  const s = T[kind] || T.panel;
  x |= 0; y |= 0; w |= 0; h |= 0;
  if (T.key === 'ship') {
    cham(g, x, y, w, h, 4, T.ink);
    cham(g, x + 1, y + 1, w - 2, h - 2, 3, s.frameLo);
    cham(g, x + 1, y + 1, w - 3, h - 3, 3, s.frame);
    g.rect(x + 4, y + 1, w - 8, 1, s.frameHi);
    cham(g, x + 3, y + 3, w - 6, h - 6, 2, s.frameDk);
    cham(g, x + 4, y + 4, w - 8, h - 8, 1, s.fill);
    g.rect(x + 5, y + 4, w - 10, 1, s.fill2);
    if (s.bolt && w > 30) for (const bx of [x + 8, x + w - 9]) { g.px(bx, y + 2, s.bolt); g.px(bx, y + h - 3, s.bolt); }
  } else if (T.key === 'garden') {
    rrect(g, x, y, w, h, 4, T.ink);
    rrect(g, x + 1, y + 1, w - 2, h - 2, 3, s.frameLo);
    rrect(g, x + 1, y + 1, w - 3, h - 3, 3, s.frame);
    g.rect(x + 4, y + 1, w - 8, 1, s.frameHi);
    rrect(g, x + 3, y + 3, w - 6, h - 6, 2, s.frameDk);
    rrect(g, x + 4, y + 4, w - 8, h - 8, 1, s.fill);
    g.rect(x + 5, y + 4, w - 10, 1, s.fill2);
    if (kind === 'panel' && w > 24 && h > 20) for (const [kx, ky] of [[x - 1, y - 1], [x + w - 3, y - 1], [x - 1, y + h - 3], [x + w - 3, y + h - 3]]) { g.rect(kx, ky, 4, 4, T.ink); g.rect(kx + 1, ky + 1, 2, 2, s.frame); g.px(kx + 1, ky + 1, s.frameHi); }
  } else {
    cham(g, x, y, w, h, 3, T.ink);
    cham(g, x + 1, y + 1, w - 2, h - 2, 2, s.frameLo);
    cham(g, x + 1, y + 1, w - 3, h - 3, 2, s.frame);
    g.rect(x + 3, y + 1, w - 6, 1, s.frameHi);
    cham(g, x + 3, y + 3, w - 6, h - 6, 1, s.fill);
    g.rect(x + 4, y + 3, w - 8, 1, s.fill2);
  }
}
// 안쪽 속 좌표(테 두께만큼 들인 곳)
export const inset = () => (T.key === 'night' ? 3 : 4);

// 대사·안내 상자
export function msgBox(g, x, y, w, h) {
  const s = T.msg;
  x |= 0; y |= 0; w |= 0; h |= 0;
  if (T.key === 'garden') {
    rrect(g, x, y, w, h, 4, T.ink);
    rrect(g, x + 1, y + 1, w - 2, h - 2, 3, s.edgeLo);
    rrect(g, x + 1, y + 1, w - 3, h - 3, 3, s.edge);
    g.rect(x + 4, y + 1, w - 8, 1, s.edgeHi);
    rrect(g, x + 3, y + 3, w - 6, h - 6, 2, s.fill);
    for (const ly of [y + 4, y + h - 9]) { g.rect(x + 2, ly + 1, 2, 3, s.leaf2); g.rect(x + 3, ly, 2, 3, s.leaf); g.px(x + 4, ly, '#a8e080'); }   // 왼쪽 모서리 잎 장식
  } else {
    cham(g, x, y, w, h, 3, T.ink);
    cham(g, x + 1, y + 1, w - 2, h - 2, 2, s.edgeLo);
    cham(g, x + 1, y + 1, w - 3, h - 3, 2, s.edge);
    g.rect(x + 3, y + 1, w - 6, 1, s.edgeHi);
    cham(g, x + 3, y + 3, w - 6, h - 6, 1, s.fill);
    if (T.key === 'ship') for (const [cx, cy, dx, dy] of [[x + 5, y + 5, 1, 1], [x + w - 6, y + 5, -1, 1], [x + 5, y + h - 6, 1, -1], [x + w - 6, y + h - 6, -1, -1]]) { g.rect(Math.min(cx, cx + dx * 3), cy, 4, 1, s.edgeHi); g.rect(cx, Math.min(cy, cy + dy * 3), 1, 4, s.edgeHi); }   // 모서리 꺾쇠
    else { const sx = x + 8, sy = y + 8; g.rect(sx - 2, sy, 5, 1, s.edgeHi); g.rect(sx, sy - 2, 1, 5, s.edgeHi); g.px(sx, sy, '#ffffff'); }   // 별 반짝
  }
}

// 단추 몸통(글자·아이콘은 ui.button이 얹음). down = 눌림(1칸 내려가고 아래 턱이 사라짐)
export function btnBody(g, x, y, w, h, st, down = false) {
  const yy = y + (down ? 1 : 0), hh = h - (down ? 1 : 0), lip = down ? 0 : 2;
  if (T.key === 'ship') {
    cham(g, x, yy, w, hh, 3, T.ink);
    cham(g, x + 1, yy + 1, w - 2, hh - 2, 2, st.lo);
    cham(g, x + 1, yy + 1, w - 2, hh - 2 - lip, 2, st.fill);
    g.rect(x + 3, yy + 1, w - 6, 1, st.hi2);
    g.rect(x + 1, yy + 3, 1, Math.max(0, hh - 6 - lip), st.hi);
    g.rect(x + 3, yy + 2, w - 6, 1, st.hi);
  } else if (T.key === 'garden') {
    rrect(g, x, yy, w, hh, 4, T.ink);
    rrect(g, x + 1, yy + 1, w - 2, hh - 2, 3, st.ring);
    rrect(g, x + 2, yy + 2, w - 4, hh - 4, 2, st.lo);
    rrect(g, x + 2, yy + 2, w - 4, hh - 4 - lip, 2, st.fill);
    g.rect(x + 4, yy + 2, w - 8, 1, st.hi2); g.rect(x + 3, yy + 3, w - 6, 1, st.hi);
  } else {
    rrect(g, x, yy, w, hh, 5, T.ink);
    rrect(g, x + 1, yy + 1, w - 2, hh - 2, 4, st.ring);
    rrect(g, x + 2, yy + 2, w - 4, hh - 4, 3, st.lo);
    rrect(g, x + 2, yy + 2, w - 4, hh - 4 - lip, 3, st.fill);
    g.rect(x + 5, yy + 2, w - 10, 1, st.hi2); g.rect(x + 4, yy + 3, w - 8, 1, st.hi);
  }
  return { yy, inner: hh - 2 - lip };
}

// 체력·경험 막대(테마 색, 체력은 반 이하 노랑·5분의 1 이하 빨강)
export function tbar(g, x, y, w, h, ratio, kind = 'hp') {
  ratio = Math.max(0, Math.min(1, ratio));
  const B = T.bar, c = kind === 'hp' ? (ratio <= 0.2 ? B.low : ratio <= 0.5 ? B.mid : B.hp) : (B[kind] || B.exp);
  g.rect(x, y, w, h, T.ink); g.rect(x + 1, y + 1, w - 2, h - 2, B.back);
  const fw = Math.round((w - 2) * ratio);
  if (fw > 0) { g.rect(x + 1, y + 1, fw, h - 2, c[0]); g.rect(x + 1, y + 1, fw, 1, c[1]); if (h > 4) g.rect(x + 1, y + h - 2, fw, 1, c[2]); }
}

// 에너지 칸(마름모·잎): 켜진 칸 = 밝은 색
export function tpips(g, x, y, cur, max, gap = 8) {
  const P = T.pip;
  for (let i = 0; i < max; i++) {
    const on = i < cur, cx = x + i * gap + 3, a = on ? P.on : P.off, hi = on ? P.onHi : P.off, lo = on ? P.onLo : P.offLo;
    if (P.kind === 'leaf') {   // 잎: 비스듬한 타원 + 잎맥
      for (let j = 0; j < 7; j++) { const hw = [1, 2, 2, 3, 2, 2, 1][j], ox = Math.round((3 - j) * 0.35); g.rect(cx - hw + ox - 1, y + j, hw * 2 + 2, 1, T.ink); }
      for (let j = 1; j < 6; j++) { const hw = [1, 2, 2, 2, 1][j - 1], ox = Math.round((3 - j) * 0.35); g.rect(cx - hw + ox, y + j, hw * 2, 1, a); }
      g.px(cx, y + 2, hi); g.px(cx, y + 4, lo);
    } else {   // 마름모
      for (let j = 0; j < 7; j++) { const hw = 3 - Math.abs(3 - j); g.rect(cx - hw - 1, y + j, hw * 2 + 3, 1, T.ink); }
      for (let j = 1; j < 6; j++) { const hw = 2 - Math.abs(3 - j); g.rect(cx - hw, y + j, hw * 2 + 1, 1, a); }
      g.px(cx - 1, y + 2, hi); g.px(cx, y + 2, hi); g.px(cx + 1, y + 4, lo);
    }
  }
}

// 받침 원판(경기장마다): (cx, cy) = 화분 굽이 바닥에 닿는 점, rx = 가로 반지름(세로 = 바닥 각도 0.4384배)
export function padV(g, cx, cy, rx, mine) {
  const P = T.pad, ry = Math.round(rx * 0.4384);
  g.ellipse(cx, cy + 3, rx + 1, ry + 1, T.ink);              // 두께 그늘
  g.ellipse(cx, cy + 2, rx, ry, P.edge);
  g.ellipse(cx, cy, rx, ry, P.rim);
  g.ellipse(cx, cy - 1, rx - 2, ry - 2, P.fill);
  g.ellipse(cx - Math.round(rx * 0.12), cy - 2, Math.round(rx * 0.7), Math.max(2, ry - 6), P.top);   // 윗면 빛(왼쪽 위)
  if (P.moss) for (const [dx, dy] of [[-0.8, 0.3], [0.7, 0.45], [0.2, 0.7]]) g.rect(Math.round(cx + dx * rx), Math.round(cy + dy * ry), 3, 1, P.moss);
  g.ellipseRing(cx, cy - 1, rx - 3, ry - 2, mine ? P.glow : P.glow2, 0);
}
