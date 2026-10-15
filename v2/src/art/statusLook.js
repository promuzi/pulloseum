// 상태 효과 겉모습(이름 · 아이콘 · 색) — 전투 화면 효과 창(battle.js statusWins)과 식물 관리 기술 카드(plant.js)가 같이 씀.
// 2026-10-15 사용자: "디버프 별로 색을 다르게", 이로운 효과 = 청록 홀로그램 하나로, 해로운 효과 = 효과마다 제 색, 숫자 = 쌓인 수만(stack).
import { icon } from './icons.js';
import { rbox } from './ui.js';

export const STATUS = {
  guard: { name: '방어', icon: 'shield', buff: true }, evade: { name: '회피', icon: 'speed', buff: true },
  critReady: { name: '치명', icon: 'crit', buff: true }, initReady: { name: '선공', icon: 'ff', buff: true },
  atkUp: { name: '공격↑', buff: true }, defDown: { name: '방어↓', col: '#ff6a6a' },
  burn: { name: '화상', icon: 'fire', col: '#ff7a3a' }, poison: { name: '독', icon: 'poison', col: '#b866ff', stack: 5 },
  wet: { name: '젖음', icon: 'water', col: '#4f9dff' }, chill: { name: '빙결', icon: 'ice', col: '#c4ecff', stack: 3 },
  shock: { name: '감전', icon: 'bolt', col: '#ffd84a', stack: 3 }, stun: { name: '기절', icon: 'star', col: '#ff86c8' },
  bind: { name: '덩굴', icon: 'vine', col: '#6fd25c' }, spore: { name: '포자', icon: 'mushroom', col: '#8fe0b8', stack: 3 },
  // 쉬는 차례(빙결 3 = 얼음 · 감전 3 = 마비) · 추가 디버프(2026-10-15 사용자 "기생 씨앗·그늘·꽃가루(→ 강풍) 좋아보임, 나머지도 다 넣고") · 버팀(쉬고 난 다음 턴)
  frozen: { name: '얼음', icon: 'ice', col: '#e8f8ff' }, paral: { name: '마비', icon: 'bolt', col: '#ffe680' },
  leech: { name: '기생', icon: 'seed', col: '#c8e04a' }, shade: { name: '그늘', icon: 'shade', col: '#a0a3c8' },
  gale: { name: '강풍', icon: 'wind', col: '#c0a8ff' }, taunt: { name: '도발', icon: 'target', col: '#ff5a5a' },
  root: { name: '뿌리', icon: 'tree', col: '#c08a5a' }, weak: { name: '약화', icon: 'down', col: '#ff8a8a' },
  corrode: { name: '부식', icon: 'potion', col: '#b9a04a' }, brace: { name: '버팀', icon: 'lock', buff: true },
};
export const SW_ON = { fill: '#123a52', fill2: '#16465f', frame: '#97e8f7', frameHi: '#e4fbff', frameLo: '#4c88a9', text: '#d8faff', num: '#97e8f7' };
export const hexMix = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
export const swCache = new Map();
export const swStyle = col => { let s = swCache.get(col); if (!s) swCache.set(col, s = { fill: hexMix(col, '#0a0c18', 0.8), fill2: hexMix(col, '#0a0c18', 0.72), frame: col, frameHi: hexMix(col, '#ffffff', 0.55), frameLo: hexMix(col, '#000000', 0.45), text: hexMix(col, '#ffffff', 0.72), num: hexMix(col, '#ffffff', 0.35) }); return s; };

// 버프 이름(기술 카드의 효과 칩 — 버프 규칙은 아직, 겉모습만): 대표 속성 짝(기술 체계 문서 §3)
export const BUFF_LOOK = { rage: '분노', purify: '정화', regen: '재생', wall: '철벽', haste: '가속', focus: '집중', shield: '보호막', thorns: '반사' };
// 기술 카드용 작은 효과 칩: [아이콘][이름] — 디버프는 그 색, 버프는 청록. 너비를 돌려줌
export function fxChip(g, x, y, id, buffName) {
  const D = buffName ? { name: buffName, buff: true } : STATUS[id];
  if (!D) return 0;
  const S = D.buff ? SW_ON : swStyle(D.col || '#ff6a6a'), ic = D.icon ? icon(D.icon) : null, w = (ic ? 13 : 4) + g.textW(D.name) + 5;
  rbox(g, x, y, w, 15, 4, S.fill, S.frame);
  if (ic) g.img(ic, x + 2, y + 2);
  g.text(D.name, x + (ic ? 14 : 5), y + 2, { color: S.text });
  return w;
}
