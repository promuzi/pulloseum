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
    ink: '#06111f', bg: '#0b1d2c', bg2: '#082033', bgLine: '#174f5c',
    panel: { fill: '#1a3145', fill2: '#2a4961', frame: '#e3e9ef', frameHi: '#ffffff', frameLo: '#8db2bf', frameDk: '#3f677d', bolt: '#6c90a0' },
    deep: { fill: '#10243a', fill2: '#1a3145', frame: '#3f677d', frameHi: '#6c90a0', frameLo: '#2a4961', frameDk: '#0b1d2c' },
    msg: { fill: '#0b273d', edge: '#28aaba', edgeHi: '#77f0f1', edgeLo: '#186c7e' },
    btn: {
      primary: { fill: '#03acb6', hi: '#20eae5', hi2: '#7fe0e4', lo: '#046271', ring: '#046271', text: '#ffffff' },
      gold: { fill: '#ffc83c', hi: '#ffe08a', hi2: '#fff4c8', lo: '#b8781c', ring: '#b8781c', text: '#3a2408' },
      second: { fill: '#2a4961', hi: '#3f677d', hi2: '#6c90a0', lo: '#10243a', ring: '#10243a', text: '#e3e9ef' },
      off: { fill: '#14263a', hi: '#1a3145', hi2: '#1a3145', lo: '#0b1d2c', ring: '#0b1d2c', text: '#4a6278' },
      danger: { fill: '#e2537b', hi: '#f48aa8', hi2: '#ffc0d0', lo: '#8b2440', ring: '#8b2440', text: '#ffffff' },
      good: { fill: '#3ec25f', hi: '#45f777', hi2: '#b8ffc8', lo: '#1f6a34', ring: '#1f6a34', text: '#06111f' },
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

// 레트로(클로드 직접 시안 — 2026-10-15 사용자 "너무 화려 — 약간 레트로 느낌의 우주선에 투박한 느낌"): 바랜 쇠 테(나사 넷)·짙은 쇳빛 속·
//   녹색 브라운관 대사 상자(주사선)·올리브 건반 단추(두꺼운 턱)·호박색 강조·LED 에너지 칸·경고 빗금 받침. 경기장 그림 = tools/pixel/big/retro_bg.mjs
THEMES.retro = {
  key: 'retro', name: '레트로 화물선', shape: 'chamfer',
  ink: '#121518', bg: '#21262b', bg2: '#191d21', bgLine: '#2a3035',
  panel: { fill: '#2a3035', fill2: '#343a3f', frame: '#8f9283', frameHi: '#c9c5ad', frameLo: '#555a54', frameDk: '#21262b', bolt: '#c9c5ad' },
  deep: { fill: '#191d21', fill2: '#21262b', frame: '#555a54', frameHi: '#787c70', frameLo: '#3b403f', frameDk: '#121518' },
  msg: { fill: '#14302a', edge: '#787c70', edgeHi: '#aaa995', edgeLo: '#474c49', scan: '#11281f' },
  btn: {
    primary: { fill: '#667650', hi: '#869468', hi2: '#a8b088', lo: '#3a4530', ring: '#2c3326', text: '#f2ead0' },
    gold: { fill: '#dba04a', hi: '#f2c774', hi2: '#fff0c4', lo: '#7a5520', ring: '#4a3214', text: '#2a1a08' },
    second: { fill: '#656a61', hi: '#8f9283', hi2: '#aaa995', lo: '#3b403f', ring: '#2a3035', text: '#f2ead0' },
    off: { fill: '#2f3439', hi: '#3a4045', hi2: '#3a4045', lo: '#21262b', ring: '#191d21', text: '#6a6e66' },
    danger: { fill: '#a0402e', hi: '#c8603e', hi2: '#e89a72', lo: '#6e2a24', ring: '#3f1a14', text: '#f2ead0' },
    good: { fill: '#667650', hi: '#869468', hi2: '#a8b088', lo: '#3a4530', ring: '#2c3326', text: '#f2ead0' },
  },
  text: { main: '#ece4c8', sub: '#aaa995', dim: '#6a6e66', accent: '#dba04a', gold: '#f2c774', bad: '#e0603e', good: '#86d28e' },
  ptext: { main: '#ece4c8', sub: '#aaa995', dim: '#6a6e66', accent: '#dba04a', gold: '#f2c774', bad: '#e0603e', good: '#86d28e' },
  mtext: { main: '#9fe0a0', sub: '#4f8a62' },
  bar: { back: '#121518', hp: ['#86c860', '#c4e8a0', '#3f7a2e'], mid: ['#dba04a', '#f2c774', '#7a5520'], low: ['#d0503a', '#f0907a', '#6e2a24'], exp: ['#dba04a', '#f2c774', '#7a5520'] },
  pip: { on: '#dba04a', onHi: '#fff0c4', onLo: '#7a5520', off: '#2f3439', offLo: '#191d21', kind: 'led' },
  pad: { fill: '#474c49', top: '#555a54', rim: '#787c70', edge: '#21262b', glow: '#dba04a', glow2: '#a0402e', hazard: true },
};

// 흰 쿠션 타일 독방(클로드 직접 시안 — 2026-10-15 사용자 "미래 느낌·화려함보다 심플함, 세련됨보다 투박함, 흰 볼록한 타일이 가득한 독방,
//   약간 어둡고 가운데 둥근 통창, 천장에서 주황 조명이 원뿔로"): 판·단추 = 흰 쿠션 타일(두꺼운 검은 테 + 위 밝음·아래 그늘 + 두툼한 턱),
//   어두운 바탕 위 흰 타일이라 단순하고 또렷하게, 강조 = 주황 등불색. 경기장 그림 = tools/pixel/big/cell_bg.mjs
THEMES.cell = {
  key: 'cell', name: '타일 독방', shape: 'round',
  ink: '#16161a', bg: '#1e1e23', bg2: '#18181c', bgLine: '#26262c',
  panel: { fill: '#c9c9ce', fill2: '#e2e2e6', frame: '#a0a0a7', frameHi: '#f0f0f2', frameLo: '#6c6c75', frameDk: '#56565f', bolt: null },
  deep: { fill: '#34343b', fill2: '#3e3e46', frame: '#56565f', frameHi: '#6c6c75', frameLo: '#26262c', frameDk: '#1b1b20' },
  msg: { fill: '#d6d6da', edge: '#a0a0a7', edgeHi: '#f0f0f2', edgeLo: '#6c6c75' },
  btn: {
    primary: { fill: '#d6d6da', hi: '#ececee', hi2: '#ffffff', lo: '#85858d', ring: '#16161a', text: '#1e1e24' },
    gold: { fill: '#e0903e', hi: '#f2aa5c', hi2: '#ffd09a', lo: '#8e5424', ring: '#16161a', text: '#1e1208' },
    second: { fill: '#85858d', hi: '#a0a0a7', hi2: '#bdbdc2', lo: '#4d4d57', ring: '#16161a', text: '#101014' },
    off: { fill: '#3a3a42', hi: '#44444c', hi2: '#44444c', lo: '#26262c', ring: '#16161a', text: '#6a6a72' },
    danger: { fill: '#c8583a', hi: '#e07a58', hi2: '#f4a888', lo: '#7a2e1e', ring: '#16161a', text: '#1e0e08' },
    good: { fill: '#d6d6da', hi: '#ececee', hi2: '#ffffff', lo: '#85858d', ring: '#16161a', text: '#1e1e24' },
  },
  text: { main: '#ececee', sub: '#a8a8b0', dim: '#62626a', accent: '#f0a050', gold: '#f2b866', bad: '#e8705a', good: '#8fd08a' },
  ptext: { main: '#1e1e24', sub: '#4e4e58', dim: '#7a7a84', accent: '#b8601a', gold: '#a85a10', bad: '#b03a2a', good: '#2f7a3a' },
  mtext: { main: '#1e1e24', sub: '#5a5a62' },
  bar: { back: '#16161a', hp: ['#7ac85e', '#c0eaa0', '#3e7a30'], mid: ['#e0903e', '#f8c890', '#8e5424'], low: ['#d0503a', '#f0907a', '#6e2a24'], exp: ['#e0903e', '#f8c890', '#8e5424'] },
  pip: { on: '#f0a050', onHi: '#ffe0b0', onLo: '#8e5424', off: '#3a3a42', offLo: '#26262c', kind: 'led' },
  pad: { fill: '#a0a0a7', top: '#bdbdc2', rim: '#6c6c75', edge: '#26262c', glow: '#f0a050', glow2: '#c8583a' },
};

// 원기둥 방(홈, 클로드 직접 — 2026-10-15 사용자 "관련 스펙은 푸른색 홀로그램처럼, 최신 기능 + 절제된 디자인과 여백"):
//   스펙·판·작은 단추 = 푸른 홀로그램(반투명 디더 채움 + 밝은 테두리 1칸 + 주사선 + 모서리 꺾쇠 — Dead Space 식 '게임 속 홀로그램'),
//   큰 단추 하나만 흰 세라믹(평범한 물건 쪽). 배경 = tools/pixel/big/room_bg.mjs(원기둥 방·통창·주황 원뿔 등·다리 셋 원목 의자)
THEMES.room = {
  key: 'room', name: '원기둥 방', shape: 'chamfer', holo: true,
  ink: '#0a0e1a', bg: '#121a2c', bg2: '#0c1222', bgLine: '#1a2440',
  panel: { fill: '#0d2a4a', fill2: '#174a74', frame: '#6cb8ff', frameHi: '#d0e8ff', frameLo: '#1f5f8f', frameDk: '#0a1c32' },
  deep: { fill: '#0a2038', fill2: '#123a5e', frame: '#4a8edc', frameHi: '#8fe0ff', frameLo: '#174a74', frameDk: '#08182c' },
  msg: { fill: '#0d2a4a', fill2: '#174a74', edge: '#6cb8ff', edgeHi: '#d0e8ff', edgeLo: '#1f5f8f' },
  btn: {
    primary: { holo: true, fill: '#0f3456', fill2: '#1a5a88', hi: '#6cb8ff', hi2: '#d0e8ff', lo: '#0a2038', ring: '#6cb8ff', text: '#d8f6ff' },
    gold: { solid: true, fill: '#e4e8ee', hi: '#f6f7f9', hi2: '#ffffff', lo: '#8f99ad', ring: '#0a0e1a', text: '#141a2a' },
    second: { holo: true, fill: '#0a2038', fill2: '#123a5e', hi: '#4a8edc', hi2: '#8fe0ff', lo: '#08182c', ring: '#4a8edc', text: '#a8e6ff' },
    off: { holo: true, fill: '#0b1626', fill2: '#0f1e32', hi: '#1f3a58', hi2: '#2a4a6a', lo: '#08101c', ring: '#1f3a58', text: '#3a5a78' },
    danger: { holo: true, fill: '#3a1020', fill2: '#5a1a30', hi: '#ff7a8a', hi2: '#ffc0c8', lo: '#200810', ring: '#ff7a8a', text: '#ffd0d8' },
    good: { holo: true, fill: '#0f3456', fill2: '#1a5a88', hi: '#6cb8ff', hi2: '#d0e8ff', lo: '#0a2038', ring: '#6cb8ff', text: '#d8f6ff' },
  },
  text: { main: '#e6f6ff', sub: '#8fc0dc', dim: '#4a6a88', accent: '#8cc8ff', gold: '#ffb868', bad: '#ff8a8a', good: '#9ff0b0' },
  ptext: { main: '#d0f4ff', sub: '#82c8e8', dim: '#3f7fa8', accent: '#8cc8ff', gold: '#ffc070', bad: '#ff8a8a', good: '#9ff0b0' },
  mtext: { main: '#d0f4ff', sub: '#82c8e8' },
  bar: { back: '#08182c', hp: ['#7fe0a0', '#d0ffe0', '#3f9f6a'], mid: ['#ffb060', '#ffe0b0', '#9a5a20'], low: ['#ff7a7a', '#ffc8c8', '#9a2a2a'], exp: ['#6cb8ff', '#d8f8ff', '#2a7fb0'] },
  pip: { on: '#6cb8ff', onHi: '#e0faff', onLo: '#1f5f8f', off: '#0f2a44', offLo: '#08182c', kind: 'led' },
  pad: { fill: '#2a3550', top: '#3a4868', rim: '#5a6a8a', edge: '#0a0e1a', glow: '#6cb8ff', glow2: '#ff7a8a' },
};
// 코덱스 홈 시안(2026-10-15 사용자 "코덱스 판이 마음에 들어 — 이걸 살릴 수 있나?"): concept/ui/cell_home.png 의 UI 를 그대로 따름 —
//   상단 = 판 없이 아이콘·숫자, 식물 옆 작은 푸른 홀로그램 카드, 주황 큰 단추 하나(모서리 꺾임·진한 갈색 아이콘), 하단 탭 = 짙은 남색 + 강철색 아이콘(고른 탭 주황 + 밑줄).
//   색은 시안에서 뽑음(bgconv 색 모으기). 배경 = 코덱스가 UI·식물을 지운 판(cell_home_clean.png → home_loft.png)
THEMES.loft = {
  ...THEMES.room, key: 'loft', name: '원형 방(코덱스)',
  ink: '#121a26', bg: '#212b3c', bg2: '#1e2838', bgLine: '#283347',
  panel: { fill: '#26649e', fill2: '#3c78b0', frame: '#8ccfff', frameHi: '#e0f0ff', frameLo: '#4f84bf', frameDk: '#173860' },
  deep: { fill: '#1e4878', fill2: '#26649e', frame: '#6699cc', frameHi: '#8ccfff', frameLo: '#2a5888', frameDk: '#122f52' },
  msg: { fill: '#26649e', fill2: '#3c78b0', edge: '#8ccfff', edgeHi: '#e0f0ff', edgeLo: '#4f84bf' },
  btn: {
    ...THEMES.room.btn,
    gold: { solid: true, notch: true, fill: '#eca548', hi: '#f7bb59', hi2: '#ffd890', lo: '#b8762c', ring: '#1a1208', text: '#4a2c10', sub: '#7a4a1c' },
    second: { holo: true, fill: '#1e4878', fill2: '#26649e', hi: '#6699cc', hi2: '#8ccfff', lo: '#122f52', ring: '#6699cc', text: '#e0f0ff' },
  },
  text: { main: '#eef3f8', sub: '#a8bcd2', dim: '#5a6a82', accent: '#8ccfff', gold: '#f9dc9a', bad: '#ff8a8a', good: '#9ff0b0' },
  ptext: { main: '#e6f3ff', sub: '#b8dcfa', dim: '#78a2cc', accent: '#e6f3ff', gold: '#ffd890', bad: '#ff9a9a', good: '#a8f8c0' },
  card: { fill: '#17487a', fill2: '#1f5c96', frame: '#8ccfff', frameHi: '#e6f3ff', frameLo: '#4f84bf' },   // 식물 옆 홀로그램 카드(글자가 읽히게 조금 더 짙게)
  bar: { ...THEMES.room.bar, mid: ['#f2d23c', '#fff4a8', '#a08a1c'] },   // 체력 절반 아래 = 노랑(포켓몬처럼 초록 → 노랑 → 빨강) — 깎인 칸 주황과 헷갈리지 않게
  hudPlain: { ring: '#8eaed2', ink: '#121a26', fill: '#2b374b', text: '#eef3f8', sub: '#8eaed2', gold: '#f9dc9a', icon: '#a8bcd2', track: '#2b374b', bar: '#8ccfff', barHi: '#e6f3ff' },
  nav: { bg: '#212b3c', bg2: '#283347', top: '#121a26', sep: '#3a4250', icon: '#829bb7', dim: '#4a5568', on: '#f0be7d', onLo: '#a8743a', badge: '#ff8a6a' },
};

// 콜로세움(2026-10-15 사용자 "전투는 거대한 콜로세움 — 흙 바닥, 관중석 밖은 우주, 투명한 돔, 다양한 종족, 떠다니는 비행체"):
//  대회 기본 경기장. UI 는 홈(코덱스 원형 방)과 같은 푸른 홀로그램 판 + 주황 단추, 받침 = 모래색 돌. 그림 = concept/ui/arena_colosseum.png → bgconv
THEMES.colosseum = {
  ...THEMES.loft, key: 'colosseum', name: '콜로세움',
  pad: { fill: '#a88a66', top: '#c4a77e', rim: '#7e6448', edge: '#2e2218', glow: '#8ccfff', glow2: '#f0a070' },
};

// ── 창 겉모습(2026-10-16 사용자 "홀로그램 창 디자인이 너무 밤티야 바꿔줘 전체적으로") ──
//  옛 홀로그램(밝은 청록 테 + 주사선 줄무늬 + 모서리 꺾쇠)을 걷어냄. 같은 날 사용자 "하늘색의 디스플레이는 안 돼? 지금은 약간 청록색인데" → UI 색을 하늘색 계열로, 기본 = screen. 후보(?ui= 로 비교):
//   sky    = 하늘색 디스플레이(밝게) — 창 색이 비치는 밝은 하늘색 판 · 위쪽이 빛남 · 하늘색 테(기본)
//   screen = 하늘색 디스플레이(차분) — 한 단 어둡게
//   glass = 짙은 반투명 유리 · 둥근 모서리 · 옅은 테 한 줄 · 위 안쪽 빛 한 줄 — 창마다의 색(효과 창 등)은 속과 테에 조금만
//   metal = 무광 쇳빛 판 · 얇은 빛 턱(위·왼 밝게 · 아래·오른 그늘) · 모서리 한 칸 깎음 — 투박한 우주선
//   ink   = 먹빛 반투명 캡슐 · 테 없음 · 큰 둥근 모서리(아이폰식)
//   holo  = 옛 홀로그램(비교용)
//   mecha = 메카 최신 조종석의 '하늘색 바탕 디스플레이 홀로그램'(같은 날 사용자 "그 메카 프로젝트 보면 홀로그램 창 느낌이 나서 좋은데" → "최신 작업본도 참고해봐. 본 게임 말구"
//           = mecha-haran `proto/cockpit/v2/style.css` `.mv5 .hud .status`, 요구 47) — 뒤가 비치는 판 · 비스듬히(110°) 짙은 남색 → 밝은 하늘색 · 얇은 하늘색 테 ·
//           위 안쪽 빛 한 줄 · 거의 네모난 모서리 · 오른쪽 위 모서리에만 밝은 꺾쇠 하나(기본)
export const UI_DEFAULT = 'mecha';
export let UI = UI_DEFAULT;
const LIGHT_TEXT = new Set(['ship', 'night', 'retro']);   // 판 글자가 밝은 장소(유리 판으로 바꿔도 읽힘)
export const UI_ACCENT = { mecha: '#f0be7d', screen: '#f0be7d', sky: '#f0be7d', glass: '#f0be7d', metal: '#e8b04a', ink: '#ffffff', holo: '#8ccfff' };
export function setUi(name) { if (UI_ACCENT[name] && name !== UI) { UI = name; holoCache.clear(); } }
const rgbOf = hex => { const n = parseInt(String(hex || '#000000').slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mixC = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
const lit = (c, d) => c.map(v => Math.max(0, Math.min(255, Math.round(v + d))));
// 둥근 모서리 안쪽인가(r칸 둥근 사각형)
const inRound = (x, y, w, h, r) => {
  const dx = x < r ? r - x - 0.5 : x >= w - r ? x - (w - r) + 0.5 : 0, dy = y < r ? r - y - 0.5 : y >= h - r ? y - (h - r) + 0.5 : 0;
  return dx * dx + dy * dy <= r * r + 0.25;
};
function panelPixels(w, h, s, put) {
  const fill = rgbOf(s.fill), edge = rgbOf(s.frame), hi = rgbOf(s.frameHi || s.frame);
  if (UI === 'mecha') {   // 메카 하늘색 디스플레이: 속 = 창 색을 짙게(왼쪽) → 창 색에 테 색 25%(오른쪽)를 110°로 · 뒤가 비침(왼 86% → 오른 75%) · 테 1칸 · 위 안쪽 빛 · 오른쪽 위 꺾쇠
    const dark = mixC(fill, [0, 0, 0], 0.42), light = mixC(fill, edge, 0.25), rim = mixC(edge, dark, 0.22), shine = mixC(hi, [255, 255, 255], 0.2);
    const dx = 0.9397, dy = 0.342, span = (w - 1) * dx + (h - 1) * dy || 1, L = Math.max(3, Math.min(8, Math.round(w / 7))), cH = h >= 14 ? 3 : 2, grille = w >= 12 && h >= 8;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if ((y === 0 && x >= w - L) || (x === w - 1 && y < cH)) { put(x, y, shine, 255); continue; }   // 꺾쇠(메카 .status::before)
      if ((x === 0 || x === w - 1) && (y === 0 || y === h - 1)) continue;   // 모서리 한 칸만 깎음(거의 네모)
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { put(x, y, rim, 228); continue; }
      const t = (x * dx + y * dy) / span;
      let c = mixC(dark, light, t);
      if (y === 1) c = mixC(c, hi, 0.28);   // 위 안쪽 빛 한 줄
      else if (y === h - 2) c = mixC(c, edge, 0.14);
      else if (grille && x >= 2 && (x - 2) % 3 === 0) c = mixC(c, hi, 0.07);   // 투사 결: 3칸마다 아주 연한 세로줄(띠리릭 빛이 이 줄을 타고 오름 — holo())
      put(x, y, c, Math.round(219 - 28 * t));
    }
    return;
  }
  if (UI === 'metal') {   // 쇳빛: 겉 먹선 · 위·왼 빛 턱 · 아래·오른 그늘 · 속 = 쇳빛에 창 색 조금 · 윗변 가운데 짧은 색 줄(창 정체)
    const base = mixC([46, 50, 58], fill, 0.22);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) continue;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { put(x, y, [13, 15, 19], 255); continue; }
      const k = y / Math.max(1, h - 1);
      let c = lit(base, 7 - 14 * k);
      if (y === 1 || x === 1) c = lit(base, y === 1 ? 34 : 18);
      else if (y === h - 2 || x === w - 2) c = lit(base, y === h - 2 ? -26 : -16);
      put(x, y, c, 255);
    }
    return;
  }
  if (UI === 'ink') {   // 먹빛 캡슐: 테 없이 반투명 · 창 색은 아주 조금
    const r = Math.min(Math.floor(h / 2), 7), base = mixC([10, 12, 18], fill, 0.16);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inRound(x, y, w, h, r)) continue;
      put(x, y, lit(base, y === 0 ? 10 : 0), y === 0 ? 205 : 184);
    }
    return;
  }
  if (UI === 'screen' || UI === 'sky') {   // 하늘색 디스플레이(사용자 "하늘색의 디스플레이는 안 돼?"): 창 색이 그대로 비치는 판 · 위쪽이 빛나는 화면 · 하늘색 테 · 위 안쪽 빛 한 줄(sky = 한 단 더 밝게)
    const bright = UI === 'sky', r = h >= 16 && w >= 16 ? 3 : 2, base = bright ? lit(mixC([26, 62, 108], fill, 0.7), 10) : mixC([14, 30, 56], fill, 0.74), rim = mixC(base, mixC(edge, hi, bright ? 0.5 : 0.35), bright ? 0.75 : 0.66);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inRound(x, y, w, h, r)) continue;
      const isEdge = !inRound(x - 1, y, w, h, r) || !inRound(x + 1, y, w, h, r) || !inRound(x, y - 1, w, h, r) || !inRound(x, y + 1, w, h, r) || x === 0 || y === 0 || x === w - 1 || y === h - 1;
      if (isEdge) { put(x, y, rim, 252); continue; }
      const k = y / Math.max(1, h - 1), glow = k < 0.4 ? (1 - k / 0.4) * 14 : 0;
      put(x, y, y === 1 ? lit(base, 30) : lit(base, glow + 3 - 9 * k), 236);
    }
    return;
  }
  // glass: 짙은 반투명 유리 — 속 = 남먹색에 창 색 35%, 위가 살짝 밝음 · 테 = 속과 창 테 색을 섞은 옅은 한 줄 · 위 안쪽 빛 한 줄
  const r = h >= 16 && w >= 16 ? 3 : 2, base = mixC([15, 21, 33], fill, 0.35), rim = mixC(base, mixC(edge, hi, 0.3), 0.42);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inRound(x, y, w, h, r)) continue;
    const isEdge = !inRound(x - 1, y, w, h, r) || !inRound(x + 1, y, w, h, r) || !inRound(x, y - 1, w, h, r) || !inRound(x, y + 1, w, h, r) || x === 0 || y === 0 || x === w - 1 || y === h - 1;
    if (isEdge) { put(x, y, rim, 250); continue; }
    const k = y / Math.max(1, h - 1);
    put(x, y, y === 1 ? lit(base, 22) : lit(base, 9 - 15 * k), 228);
  }
}
const holoCache = new Map();
const BAY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export function holoCanvas(w, h, s, dens = 10) {
  w |= 0; h |= 0;
  const key = [UI, w, h, s.fill, s.frame, s.frameHi, dens].join('|');
  let cv = holoCache.get(key); if (cv) return cv;
  if (UI !== 'holo') {
    cv = document.createElement('canvas'); cv.width = Math.max(1, w); cv.height = Math.max(1, h);
    const c = cv.getContext('2d'), id = c.createImageData(cv.width, cv.height), d = id.data;
    panelPixels(w, h, s, (x, y, rgb, a) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a; });
    c.putImageData(id, 0, 0); holoCache.set(key, cv); return cv;
  }
  cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'), id = c.createImageData(w, h), d = id.data;
  const put = (x, y, hex) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const n = parseInt(hex.slice(1, 7), 16), i = (y * w + x) * 4; d[i] = n >> 16; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255; d[i + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) put(x, y, s.frame);
    else if (x === 1 || y === 1 || x === w - 2 || y === h - 2) { if ((x + y) % 2) put(x, y, s.frameLo); }
    // 속은 거의 꽉 채움(2026-10-15 사용자 "UI의 글자가 작거나 깨지는 거 같아 — 특히 식물 아래 이름"): 반투명 점무늬 구멍으로 밝은 벽이 비쳐
    //  글자 획 사이에 흰 점이 섞여 깨져 보였음 → 구멍은 16칸에 1칸만(홀로그램 느낌은 주사선 두 색 줄·밝은 테·꺾쇠로)
    else if (y % 2 === 0) put(x, y, s.fill2 || s.fill);
    else if (BAY[y & 3][x & 3] < Math.max(dens, 15)) put(x, y, s.fill);
  }
  const L = Math.min(5, Math.floor(Math.min(w, h) / 4));
  for (const [cx, cy, dx, dy] of [[0, 0, 1, 1], [w - 1, 0, -1, 1], [0, h - 1, 1, -1], [w - 1, h - 1, -1, -1]]) for (let k = 0; k < L; k++) { put(cx + dx * k, cy, s.frameHi); put(cx, cy + dy * k, s.frameHi); }
  c.putImageData(id, 0, 0); holoCache.set(key, cv); return cv;
}
// 홀로그램 결(2026-10-16 사용자 "연한 세로줄이 띠리릭 올라오는" — 화면 아래에서 한꺼번에 올라오던 첫 판은 "너무 대충 … 화면 맨 아래에서 위로 구불구불한 줄 올리는 거잖아,
//  소스 등 기법 찾아서 제대로"). 홀로그램 셰이더의 층 나누기를 따름 — shaders.com hologram(투사 결 · 위로 흐르는 주사선 · 새로 고침 띠 · 가장자리 빛),
//  Godot 'Simple Hologram'(줄 = fract(y·밀도 − 시간·속도)), Ren'Py SWHolo(줄마다 투명도) — 가로 주사선 대신 사용자 말대로 세로 결에, 창마다 따로:
//  ① 투사 결 = 3칸마다 아주 연한 세로줄(늘 — panelPixels 에 구움)
//  ② 띠리릭 = 창마다 8~13초에 한 번, 세로줄마다 빛 한 토막(머리 밝고 꼬리로 옅게, 8칸)이 창 아래에서 위로 오름 — 왼쪽 줄부터 차례로 출발(창 폭과 상관없이 0.26초 안에)해 물결처럼
//  ③ 빛 머리가 위 테에 닿는 순간 그 자리 테가 잠깐 밝아짐(빛이 테에 부딪힘)
//  창 바탕에만 그림(글자는 창 위에 따로 그려져 그대로) · 시계 = 라우터가 넣는 app.t · 정지 촬영(__shot)은 끔 · 검토 영상은 gap 을 줄여 잦게
export const holoFx = { t: 0, on: true, gap: 8000, spread: 260 };   // gap = 창마다 띠리릭 간격(8~13초 — 화면 전체로는 3할쯤의 시간에 어딘가 한 창)
export function setHoloClock(t) { holoFx.t = t; }
const hash32 = n => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };
const PULSE = [0.62, 0.5, 0.38, 0.28, 0.2, 0.13, 0.08, 0.04], pulseCache = new Map();
function pulse(col) {   // 빛 한 토막(1 × 8): 위(머리) 밝게 → 아래(꼬리) 옅게
  let cv = pulseCache.get(col); if (cv) return cv;
  const [r, g, b] = rgbOf(col);
  cv = document.createElement('canvas'); cv.width = 1; cv.height = PULSE.length;
  const c = cv.getContext('2d'), id = c.createImageData(1, PULSE.length);
  PULSE.forEach((a, i) => id.data.set([r, g, b, Math.round(255 * a)], i * 4));
  c.putImageData(id, 0, 0); pulseCache.set(col, cv); return cv;
}
export const holo = (g, x, y, w, h, s, dens) => {
  x |= 0; y |= 0; w |= 0; h |= 0;
  const c = g.c;
  c.imageSmoothingEnabled = false;
  c.drawImage(holoCanvas(w, h, s, dens), x, y);
  if (UI !== 'mecha' || !holoFx.on || w < 12 || h < 8) return;
  const seed = hash32(Math.imul(w, 73856093) ^ Math.imul(h, 19349663) ^ Math.imul(x >> 3, 83492791)), P = Math.round(holoFx.gap * (1 + (seed % 1000) / 1500)), u = (holoFx.t + (seed >>> 6)) % P;
  const R = 200 + h * 3, L = PULSE.length;
  if (u >= R + holoFx.spread + 100) return;
  const cols = Math.floor((w - 5) / 3) + 1, st = holoFx.spread / cols, lit = s.frameHi || s.frame, pv = pulse(lit), top = R * (h - 3) / (h - 3 + L);
  for (let i = 0; i < cols; i++) {
    const tc = u - i * st; if (tc < 0) break;
    const xx = x + 2 + i * 3;
    if (tc <= R) {
      const head = Math.round(h - 2 - (tc / R) * (h - 3 + L)), sy = Math.max(0, 1 - head), dy = Math.max(1, head), n = Math.min(L - sy, h - 1 - dy);   // 머리: 창 바닥 줄 → 위 테 너머
      if (n > 0) c.drawImage(pv, 0, sy, 1, n, xx, y + dy, 1, n);
    }
    const hit = tc - top;   // 머리가 위 테에 닿은 뒤 지난 시간
    if (hit >= 0 && hit < 90) { c.fillStyle = lit; c.globalAlpha = 0.7 * (1 - hit / 90); c.fillRect(xx - (hit < 30 ? 1 : 0), y, hit < 30 ? 3 : 1, 1); c.globalAlpha = 1; }
  }
};

export let T = THEMES.ship;
export function setTheme(key) { T = THEMES[key] || THEMES.ship; return T; }
// 대회 경기장 = 콜로세움(2026-10-15 사용자: 전투는 콜로세움, "전투장도 나중에 상황별로") — 옛 세 장소(온실·우주선·밤 정원)는 상황별 경기장 후보로 남김(?venue=)
export const VENUE_OF_TIER = { bronze: 'colosseum', silver: 'colosseum', gold: 'colosseum', platinum: 'colosseum', diamond: 'colosseum', master: 'colosseum', pulloseum: 'colosseum' };
export const TIER_KEY = { 브론즈: 'bronze', 실버: 'silver', 골드: 'gold', 플래티넘: 'platinum', 다이아: 'diamond', 마스터: 'master', 풀로세움: 'pulloseum' };
export const venueOf = tierName => VENUE_OF_TIER[TIER_KEY[tierName] || tierName] || 'colosseum';

// ── 모양 ──
// 모서리를 c칸 깎은 사각형(채움)
export function cham(g, x, y, w, h, c, col) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  for (let j = 0; j < h; j++) { const ins = j < c ? c - j : j >= h - c ? j - (h - c) + 1 : 0; g.rect(x + ins, y + j, w - ins * 2, 1, col); }
}
const fillShape = (g, x, y, w, h, r, col) => (T.shape === 'round' ? rrect(g, x, y, w, h, r, col) : cham(g, x, y, w, h, r, col));

// 판(체력판·카드·창): kind = 'panel'(기본) | 'deep'(한 단 어두운 속)
export function plate(g, x, y, w, h, kind = 'panel') {
  const glassy = UI !== 'holo' && LIGHT_TEXT.has(T.key), s = glassy ? THEMES.loft[kind] || THEMES.loft.panel : T[kind] || T.panel;   // 새 겉모습: 장소가 달라도 판 색은 같은 하늘색 디스플레이
  x |= 0; y |= 0; w |= 0; h |= 0;
  if (T.holo || glassy) { holo(g, x, y, w, h, s, kind === 'deep' ? 8 : 10); return; }   // 새 겉모습 = 판도 창과 같은 유리(글자가 밝은 장소만 — 온실·독방은 판 글자가 어두워 옛 판 그대로)
  if (T.key === 'cell') { pillow(g, x, y, w, h, s, 4); return; }
  if (T.key === 'retro') {   // 두꺼운 쇠 테(빛 받는 위·왼 밝게, 아래·오른 그늘) + 네 모서리 나사 + 짙은 속
    cham(g, x, y, w, h, 2, T.ink);
    cham(g, x + 1, y + 1, w - 2, h - 2, 1, s.frameLo);
    g.rect(x + 2, y + 1, w - 4, 2, s.frame); g.rect(x + 1, y + 2, 2, h - 4, s.frame);
    g.rect(x + 2, y + 1, w - 4, 1, s.frameHi);
    g.rect(x + 3, y + h - 3, w - 5, 1, s.frameLo); g.rect(x + w - 3, y + 3, 1, h - 5, s.frameLo);
    g.rect(x + 3, y + 3, w - 6, h - 6, s.frameDk);
    g.rect(x + 4, y + 4, w - 8, h - 8, s.fill);
    g.rect(x + 4, y + 4, w - 8, 1, s.fill2);
    if (s.bolt && w > 20 && h > 16) for (const [bx, by] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + h - 3], [x + w - 3, y + h - 3]]) { g.rect(bx, by, 2, 2, s.bolt); g.px(bx + 1, by + 1, s.frameLo); }
    return;
  }
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
// 쿠션 타일(독방 테마): 검은 테 + 위·왼 밝은 둥근 턱 2칸 + 아래·오른 그늘 2칸 + 가운데 속(위 한 줄 더 밝게) — 단순하고 두툼하게
function pillow(g, x, y, w, h, s, r = 4) {
  rrect(g, x, y, w, h, r, T.ink);
  rrect(g, x + 1, y + 1, w - 2, h - 2, r - 1, s.frameLo);
  rrect(g, x + 1, y + 1, w - 3, h - 3, r - 1, s.frame);
  rrect(g, x + 2, y + 2, w - 5, h - 5, Math.max(1, r - 2), s.frameHi);
  rrect(g, x + 3, y + 3, w - 6, h - 6, Math.max(1, r - 2), s.fill);
  g.rect(x + 4, y + 3, w - 9, 1, s.fill2);
}
// 안쪽 속 좌표(테 두께만큼 들인 곳)
export const inset = () => (T.key === 'night' ? 3 : 4);

// 대사·안내 상자
export function msgBox(g, x, y, w, h) {
  const s = UI !== 'holo' && LIGHT_TEXT.has(T.key) ? THEMES.loft.msg : T.msg;
  x |= 0; y |= 0; w |= 0; h |= 0;
  if (T.holo || (UI !== 'holo' && LIGHT_TEXT.has(T.key))) { holo(g, x, y, w, h, { fill: s.fill, fill2: s.fill2 || s.fill, frame: s.edge, frameHi: s.edgeHi, frameLo: s.edgeLo }, 11); return; }
  if (T.key === 'cell') { pillow(g, x, y, w, h, { fill: s.fill, fill2: '#e8e8ec', frame: s.edge, frameHi: s.edgeHi, frameLo: s.edgeLo }, 4); return; }
  if (T.key === 'retro') {   // 브라운관: 쇠 테두리 + 짙은 녹색 화면 + 주사선 + 구석 나사
    cham(g, x, y, w, h, 2, T.ink);
    g.rect(x + 1, y + 1, w - 2, h - 2, s.edgeLo);
    g.rect(x + 1, y + 1, w - 2, 1, s.edgeHi); g.rect(x + 1, y + 2, 1, h - 4, s.edge);
    g.rect(x + 3, y + 3, w - 6, h - 6, T.ink);
    g.rect(x + 4, y + 4, w - 8, h - 8, s.fill);
    for (let yy = y + 5; yy < y + h - 4; yy += 2) g.rect(x + 4, yy, w - 8, 1, s.scan);
    for (const bx of [x + 1, x + w - 3]) { g.rect(bx, y + 1, 2, 2, s.edgeHi); g.rect(bx, y + h - 3, 2, 2, s.edgeHi); }
    return;
  }
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
//  돌려줌 = { yy: 겉 테 윗줄, top: 판 윗변, inner: 판 높이 } — 속 내용은 top 기준으로 가운데(top + (inner − 높이) / 2).
//  yy 로 가운데를 잡으면 1칸 위로 감(2026-10-25 사용자 "글자랑 아이콘이 상자안에서 중앙보다 조금 더 위에 있는 느낌 · 항상 이런 문제" — ui.button 만 +1 로 맞고 다른 곳은 빠뜨렸음)
export function btnBody(g, x, y, w, h, st, down = false) {
  const yy = y + (down ? 1 : 0), hh = h - (down ? 1 : 0), lip = down ? 0 : 2;
  if (T.holo && st.holo) {   // 창과 같은 판 단추(눌리면 1칸 내려가고 더 밝게) — 새 겉모습에선 아래 그늘 한 줄로 '누르는 것'임을 보임
    const live = st !== T.btn.off, fillB = UI === 'holo' ? (down ? st.fill2 : st.fill) : down ? st.hi : live ? st.fill2 : st.fill;   // 새 겉모습: 누를 수 있는 단추 = 한 단 밝은 유리, 눌림 = 더 밝게
    holo(g, x, yy, w, hh, { fill: fillB, fill2: st.fill2, frame: st.hi, frameHi: st.hi2, frameLo: st.lo }, down ? 13 : 10);
    if (UI !== 'holo' && !down && w > 8) { g.c.fillStyle = 'rgba(0,0,0,0.38)'; g.c.fillRect(x + 3, yy + hh, w - 6, 1); }
    return { yy, inner: hh - 2, top: yy + 1 };
  }
  if (T.holo && st.solid && st.notch) {   // 코덱스 시안의 주황 단추: 모서리 2칸 꺾임 + 아래 그늘 띠 + 위 빛 줄
    const lp = down ? 1 : 3, yk = y + (down ? 2 : 0), hk = h - (down ? 2 : 0);
    cham(g, x, yk, w, hk, 3, st.ring);
    cham(g, x + 1, yk + 1, w - 2, hk - 2, 2, st.lo);
    cham(g, x + 1, yk + 1, w - 2, hk - 2 - lp, 2, st.fill);
    g.rect(x + 4, yk + 2, w - 8, 1, st.hi2); g.rect(x + 3, yk + 3, w - 6, 1, st.hi);
    return { yy: yk, inner: hk - 2 - lp, top: yk + 1 };
  }
  if (T.holo && st.solid) {   // 흰 세라믹 단추(큰 단추 하나): 둥근 몸 + 위 빛 + 아래 두툼한 턱
    const lp = down ? 1 : 3, yk = y + (down ? 2 : 0), hk = h - (down ? 2 : 0);
    rrect(g, x, yk, w, hk, 6, st.ring);
    rrect(g, x + 1, yk + 1, w - 2, hk - 2, 5, st.lo);
    rrect(g, x + 1, yk + 1, w - 2, hk - 2 - lp, 5, st.fill);
    g.rect(x + 6, yk + 2, w - 12, 1, st.hi2); g.rect(x + 4, yk + 3, w - 8, 1, st.hi);
    return { yy: yk, inner: hk - 2 - lp, top: yk + 1 };
  }
  if (T.key === 'cell') {   // 쿠션 타일 단추: 두툼한 아래 턱 3칸(눌리면 1칸), 위 둥근 빛
    const lp = down ? 1 : 3, yk = y + (down ? 2 : 0), hk = h - (down ? 2 : 0);
    rrect(g, x, yk, w, hk, 5, st.ring);
    rrect(g, x + 1, yk + 1, w - 2, hk - 2, 4, st.lo);
    rrect(g, x + 1, yk + 1, w - 2, hk - 2 - lp, 4, st.hi);
    rrect(g, x + 2, yk + 3, w - 4, hk - 5 - lp, 3, st.fill);
    g.rect(x + 5, yk + 2, w - 10, 1, st.hi2);
    return { yy: yk, inner: hk - 2 - lp, top: yk + 1 };
  }
  if (T.key === 'retro') {   // 투박한 건반: 두꺼운 아래 턱(3칸) · 위·왼 밝은 비탈 2칸 · 아래·오른 그늘
    const lp = down ? 1 : 3, yk = y + (down ? 2 : 0), hk = h - (down ? 2 : 0);
    cham(g, x, yk, w, hk, 2, T.ink);
    g.rect(x + 1, yk + 1, w - 2, hk - 2, st.lo);
    g.rect(x + 1, yk + 1, w - 2, hk - 2 - lp, st.fill);
    g.rect(x + 2, yk + 1, w - 4, 1, st.hi2); g.rect(x + 2, yk + 2, w - 4, 1, st.hi); g.rect(x + 1, yk + 2, 1, hk - 4 - lp, st.hi); g.rect(x + 2, yk + 3, 1, hk - 6 - lp, st.hi);
    g.rect(x + w - 2, yk + 2, 1, hk - 4 - lp, st.lo);
    return { yy: yk, inner: hk - 2 - lp, top: yk + 1 };
  }
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
  return { yy, inner: hh - 2 - lip, top: yy + 1 };
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
    if (P.kind === 'led') {   // 네모 LED: 검은 틀 + 불빛 + 빛 한 점
      g.rect(cx - 3, y, 7, 7, T.ink); g.rect(cx - 2, y + 1, 5, 5, lo); g.rect(cx - 2, y + 1, 4, 4, a);
      if (on) g.px(cx - 1, y + 2, hi);
      continue;
    }
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
// k = 세로/가로(내려다본 각도의 sin) — 기본 26°, 먼 쪽(상대)은 화분처럼 18°(0.31)로 납작하게
export function padV(g, cx, cy, rx, mine, k = 0.4384) {
  const P = T.pad, ry = Math.round(rx * k);
  g.ellipse(cx, cy + 3, rx + 1, ry + 1, T.ink);              // 두께 그늘
  g.ellipse(cx, cy + 2, rx, ry, P.edge);
  g.ellipse(cx, cy, rx, ry, P.rim);
  g.ellipse(cx, cy - 1, rx - 2, ry - 2, P.fill);
  g.ellipse(cx - Math.round(rx * 0.12), cy - 2, Math.round(rx * 0.7), Math.max(2, ry - 6), P.top);   // 윗면 빛(왼쪽 위)
  if (P.moss) for (const [dx, dy] of [[-0.8, 0.3], [0.7, 0.45], [0.2, 0.7]]) g.rect(Math.round(cx + dx * rx), Math.round(cy + dy * ry), 3, 1, P.moss);
  if (P.hazard) {   // 레트로: 테두리에 노랑·검정 경고 빗금 고리 + 안쪽 색 띠(내 쪽 호박 · 상대 녹 빨강)
    const n = Math.round(rx * 6);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, px = Math.round(cx + Math.cos(a) * (rx - 1)), py = Math.round(cy - 1 + Math.sin(a) * (ry - 1)); g.px(px, py, Math.floor(i / 3) % 2 ? T.ink : '#c09c36'); }
    g.ellipseRing(cx, cy - 1, rx - 5, Math.max(2, ry - 4), mine ? P.glow : P.glow2, 0);
    return;
  }
  g.ellipseRing(cx, cy - 1, rx - 3, ry - 2, mine ? P.glow : P.glow2, 0);
}
