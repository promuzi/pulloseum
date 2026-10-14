// 마스터 팔레트 = Resurrect 64 (Kerrie Lake). 식물 스프라이트 렌더러(tools/pixel/renderer-v2.js)와 같은 64색.
// 화면의 모든 색은 여기서만 꺼내 쓴다 — 새 색을 코드에 직접 적지 말 것.
export const RAMP = {
  fire:  ['#ae2334', '#e83b3b', '#fb6b1d', '#f79617', '#f9c22b'],
  water: ['#323353', '#484a77', '#4d65b4', '#4d9be6', '#8fd3ff'],
  grass: ['#165a4c', '#239063', '#1ebc73', '#91db69', '#cddf6c'],
  earth: ['#7a3045', '#9e4539', '#cd683d', '#e6904e', '#fbb954'],
  wind:  ['#45293f', '#6b3e75', '#905ea9', '#a884f3', '#eaaded'],
  bolt:  ['#4c3e24', '#676633', '#a2a947', '#d5e04b', '#fbff86'],
  ice:   ['#0b5e65', '#0b8a8f', '#0eaf9b', '#30e1b9', '#8ff8e2'],
  rock:  ['#313638', '#374e4a', '#547e64', '#92a984', '#b2ba90'],
  gray:  ['#2e222f', '#3e3546', '#625565', '#7f708a', '#9babb2'],
  light: ['#625565', '#7f708a', '#9babb2', '#c7dcd0', '#ffffff'],
  warm:  ['#3e3546', '#694f62', '#966c6c', '#ab947a', '#c7dcd0'],
  red:   ['#6e2727', '#b33831', '#ea4f36', '#f57d4a', '#fca790'],
  rose:  ['#753c54', '#a24b6f', '#cf657f', '#ed8099', '#fdcbb0'],
  pink:  ['#831c5d', '#c32454', '#f04f78', '#f68181', '#fca790'],
};

// 화면 토큰(역할 이름). UI는 이 이름만 쓴다.
export const C = {
  ink: '#2e222f',        // 외곽선·가장 어두운 바탕
  shade: '#3e3546',      // 패널 그늘
  night: '#323353',      // 패널 바탕(남색)
  night2: '#484a77',     // 패널 밝은 테
  dusk: '#45293f',       // 우주 바탕 보라
  plum: '#694f62',
  slate: '#625565',
  slate2: '#7f708a',     // 비활성 글자
  mute: '#9babb2',       // 보조 글자
  mist: '#c7dcd0',       // 본문 글자
  white: '#ffffff',
  teal0: '#0b5e65', teal1: '#0b8a8f', teal: '#0eaf9b', teal3: '#30e1b9', teal4: '#8ff8e2', // 주 강조(선택·주 버튼)
  gold0: '#9e4539', gold1: '#f79617', gold: '#f9c22b', gold3: '#fbff86',                    // 재화·큰 버튼
  red0: '#6e2727', red1: '#ae2334', red: '#e83b3b', red3: '#f57d4a',                         // 피해·위험
  green0: '#165a4c', green1: '#239063', green: '#1ebc73', green3: '#91db69',                 // 체력·회복
  blue1: '#4d65b4', blue: '#4d9be6', blue3: '#8fd3ff',
  wood0: '#4c3e24', wood1: '#694f62', wood: '#966c6c', wood3: '#ab947a',
  clay0: '#7a3045', clay1: '#9e4539', clay: '#cd683d', clay3: '#e6904e', clay4: '#fbb954',
};

// 속성 표시색(아이콘·칩). 바람은 라벤더(포켓몬 비행 타입과 같은 계열) — 스프라이트 바람 램프와 맞춤.
export const ELEMENT = {
  fire:  { name: '불',   main: '#fb6b1d', light: '#f9c22b', dark: '#ae2334' },
  water: { name: '물',   main: '#4d9be6', light: '#8fd3ff', dark: '#4d65b4' },
  grass: { name: '풀',   main: '#1ebc73', light: '#91db69', dark: '#239063' },
  earth: { name: '대지', main: '#cd683d', light: '#e6904e', dark: '#9e4539' },
  wind:  { name: '바람', main: '#a884f3', light: '#eaaded', dark: '#6b3e75' },
  bolt:  { name: '번개', main: '#d5e04b', light: '#fbff86', dark: '#a2a947' },
  ice:   { name: '빙결', main: '#30e1b9', light: '#8ff8e2', dark: '#0b8a8f' },
};

export const TYPE = {
  tree: '목본', flower: '화초', cactus: '다육', vine: '덩굴', mushroom: '버섯',
};

// 4×4 베이어 행렬 — 디더(점 섞기) 단계용
export const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
