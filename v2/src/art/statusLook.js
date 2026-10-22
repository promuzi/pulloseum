// 상태 효과 겉모습(이름 · 아이콘 · 색) — 전투 화면 효과 창(battle.js statusWins)과 식물 관리 기술 카드(plant.js)가 같이 씀.
// 2026-10-15 사용자: "디버프 별로 색을 다르게", 이로운 효과 = 청록 홀로그램 하나로, 해로운 효과 = 효과마다 제 색, 숫자 = 쌓인 수만(stack).
import { icon } from './icons.js';
import { rbox } from './ui.js';

export const STATUS = {
  guard: { name: '방어', icon: 'shield', buff: true }, evade: { name: '회피', icon: 'speed', buff: true },
  critReady: { name: '치명', icon: 'crit', buff: true }, initReady: { name: '선공', icon: 'ff', buff: true },
  // 상태 아이콘 = 전용 그림 st_*(2026-10-22 코덱스 — 전엔 속성 · 종류 아이콘을 빌려 씀, 그림이 없으면 art/icons.js ALIAS 의 옛 아이콘)
  atkUp: { name: '공격↑', icon: 'st_atkUp', buff: true }, defDown: { name: '방어↓', col: '#ff6a6a' },
  burn: { name: '화상', icon: 'st_burn', col: '#ff7a3a' }, poison: { name: '독', icon: 'st_poison', col: '#b866ff', stack: 5 },
  wet: { name: '젖음', icon: 'st_wet', col: '#4f9dff' }, chill: { name: '빙결', icon: 'st_chill', col: '#c4ecff', stack: 3 },
  shock: { name: '감전', icon: 'st_shock', col: '#ffd84a' }, stun: { name: '기절', icon: 'st_stun', col: '#ff86c8' },
  bind: { name: '덩굴', icon: 'st_bind', col: '#6fd25c' }, spore: { name: '포자', icon: 'st_spore', col: '#8fe0b8', stack: 3 },
  // 쉬는 차례(빙결 3 = 얼음 · 감전 3 = 마비) · 추가 디버프(2026-10-15 사용자 "기생 씨앗·그늘·꽃가루(→ 강풍) 좋아보임, 나머지도 다 넣고") · 버팀(쉬고 난 다음 턴)
  frozen: { name: '얼음', icon: 'st_frozen', col: '#e8f8ff' }, paral: { name: '마비', icon: 'st_paral', col: '#ffe680' },
  leech: { name: '기생', icon: 'st_leech', col: '#c8e04a' }, shade: { name: '그늘', icon: 'st_shade', col: '#a0a3c8' },
  gale: { name: '강풍', icon: 'st_gale', col: '#c0a8ff' }, taunt: { name: '도발', icon: 'st_taunt', col: '#ff5a5a' },
  root: { name: '뿌리', icon: 'st_root', col: '#c08a5a' }, weak: { name: '약화', icon: 'st_weak', col: '#ff8a8a' },
  corrode: { name: '부식', icon: 'st_corrode', col: '#b9a04a' }, brace: { name: '버팀', icon: 'lock', buff: true },
  // 버프(2026-10-16 구현 — 속성 짝: 불 분노 · 물 정화 · 풀 재생 · 대지 철벽 · 바람 가속 · 번개 집중 · 빙결 보호막 · 선인장 반사)
  rage: { name: '분노', icon: 'fire', buff: true }, wall: { name: '철벽', icon: 'shield', buff: true }, haste: { name: '가속', icon: 'speed', buff: true },
  regen: { name: '재생', icon: 'heal', buff: true }, thorns: { name: '반사', icon: 'cactus', buff: true }, shield: { name: '보호막', icon: 'ice', buff: true },
  flourish: { name: '만개', icon: 'star', buff: true }, armor: { name: '방어구', icon: 'gear', buff: true }, stealth: { name: '은신', icon: 'down', buff: true }, clone: { name: '분신', icon: 'sparkle', buff: true },
  purified: { name: '정화', icon: 'water', buff: true }, focus: { name: '집중', icon: 'crit', buff: true },
};
// 효과 설명(전투 화면 '효과' 단추 — 한 줄씩)
export const STATUS_DESC = {
  burn: '턴 끝 체력 4%씩 3번 · 회복이 절반', poison: '턴 끝 체력 2% × 겹침(5겹까지) · 안 걸리면 줄어듦', wet: '기동 · 적중 · 방어 ↓ · 빙결·감전이 더 쌓임',
  chill: '기동 ↓ · 3이 되면 한 턴 얼음', shock: '3턴 · 차례마다 25%(젖으면 50%) 마비 — 마비되면 풀림', stun: '다음 차례를 쉼', frozen: '얼어서 한 턴 쉼(받는 피해 ↓)', paral: '몸이 굳어 한 턴 쉼',
  bind: '기술 하나가 한 턴 묶임', leech: '턴 끝 체력을 상대가 빨아감(3번)', shade: '그 턴 끝 햇빛이 안 참', gale: '적중 ↓', taunt: '방어·회피 자세를 못 씀',
  root: '교체할 수 없음', weak: '공격 ↓', corrode: '방어 ↓', spore: '턴 끝마다 자라 3이면 피어남(피해 + 햇빛 안 참)', brace: '방금 쉬어서 쉬게 하는 효과에 안 걸림',
  rage: '공격 +25%', wall: '받는 피해 −20%', haste: '기동 +30%(먼저 움직이고 잘 피함)', regen: '턴 끝 체력 5% 회복(3번)', thorns: '붙어서 때린 상대에게 피해 30%를 되돌림',
  shield: '최대 체력 15%만큼 피해를 먼저 막음',
  flourish: '공격 · 방어 · 기동 +5%씩 겹침(4번까지) · 판 끝까지',
  armor: '체력 위 금속 칸 — 깨질 때까지 피해를 먼저 막음 · 쌓임(최대 체력 50%까지) · 망치에 약함 · 지속 피해는 못 막음',
  stealth: '이번 턴 광역이 아닌 공격은 거의 빗나감 · 내 공격은 기습(×1.5, 자세 무시)', clone: '2턴 · 광역이 아닌 공격이 대부분 빗나감 — 진짜가 맞거나 광역이면 풀림', purified: '나쁜 효과가 안 걸림(한 턴)', focus: '다음 공격 치명 +25', guard: '방어력 4배(연속 2.5배) · 한 번 맞으면 해제', evade: '회피 자세 — 빗나감 ↑', initReady: '다음 턴 먼저 움직이기 쉬움',
};
export const SW_ON = { fill: '#13385e', fill2: '#17446e', frame: '#8ccfff', frameHi: '#e6f3ff', frameLo: '#4f84bf', text: '#e0f0ff', num: '#8ccfff' };
export const hexMix = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
export const swCache = new Map();
export const swStyle = col => { let s = swCache.get(col); if (!s) swCache.set(col, s = { fill: hexMix(col, '#0a0c18', 0.8), fill2: hexMix(col, '#0a0c18', 0.72), frame: col, frameHi: hexMix(col, '#ffffff', 0.55), frameLo: hexMix(col, '#000000', 0.45), text: hexMix(col, '#ffffff', 0.72), num: hexMix(col, '#ffffff', 0.35) }); return s; };

// 버프 이름(기술 카드의 효과 칩 — 버프 규칙은 아직, 겉모습만): 대표 속성 짝(기술 체계 문서 §3)
export const BUFF_LOOK = { flourish: '만개', armor: '방어구', stealth: '은신', clone: '분신', rage: '분노', purify: '정화', regen: '재생', wall: '철벽', haste: '가속', focus: '집중', shield: '보호막', thorns: '반사' };
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
