// 상태 효과 겉모습(이름 · 아이콘 · 색) — 전투 화면 효과 창(battle.js statusWins)과 식물 관리 기술 카드(plant.js)가 같이 씀.
// 2026-10-15 사용자: "디버프 별로 색을 다르게", 이로운 효과 = 청록 홀로그램 하나로, 해로운 효과 = 효과마다 제 색, 숫자 = 쌓인 수만(stack).
import { icon } from './icons.js';
import { rbox } from './ui.js';

// 아이콘 = 효과 · 스킬 분류 엑셀 v10의 효과(2026-10-22 사용자 "아이콘 비슷한게 있는데 … 분노같은 경우 · 엑셀로 작업중인 변경될 예정인걸 기준으로"):
//  속성 · 종류 · 능력치 아이콘을 효과에 빌려 쓰지 않음(분노 = 불꽃 = 화상처럼 헷갈렸음). 이름은 그대로(엑셀을 게임에 적용할 때 바꿈), 아이콘만 그 엑셀 효과의 것.
//  지금 이름 → 엑셀 효과: 공격↑ · 분노 → 활력 · 철벽 → 억셈 · 약화 → 쇠약 · 부식 · 방어↓ → 시듦 · 덩굴(기술 묶임) → 봉인 · 뿌리(교체 못 함) → 속박 · 그늘 → 암실 ·
//  버팀 → 면역 · 정화(나쁜 효과 안 걸림) → 의지 · 집중(다음 공격 치명) → 조준 · 분신 → 은신 · 방어구 → 갑주 · 강풍 → 전장 환경 강풍 · 얼음 · 마비 = 기절의 다른 이름(그림만 다름)
//  짝 표 = docs/superpowers/specs/2026-10-22-v2-effect-icons.md · 그림이 없으면 art/icons.js ALIAS 의 옛 아이콘
export const STATUS = {
  guard: { name: '방어', icon: 'shield', buff: true }, evade: { name: '회피', icon: 'fx_evade', buff: true },
  critReady: { name: '치명', icon: 'fx_aim', buff: true }, initReady: { name: '선공', icon: 'ff', buff: true },
  atkUp: { name: '공격↑', icon: 'fx_atk_up', buff: true }, defDown: { name: '방어↓', icon: 'fx_def_down', col: '#ff6a6a' },
  burn: { name: '화상', icon: 'fx_burn', col: '#ff7a3a' }, poison: { name: '독', icon: 'fx_poison', col: '#b866ff', stack: 5 },
  wet: { name: '젖음', icon: 'fx_wet', col: '#4f9dff' }, chill: { name: '빙결', icon: 'fx_chill', col: '#c4ecff', stack: 3 },
  shock: { name: '감전', icon: 'fx_shock', col: '#ffd84a' }, stun: { name: '기절', icon: 'st_stun', col: '#ff86c8' },
  bind: { name: '덩굴', icon: 'fx_seal', col: '#6fd25c' }, spore: { name: '포자', icon: 'st_spore', col: '#8fe0b8', stack: 3 },
  // 쉬는 차례(빙결 3 = 얼음 · 감전 3 = 마비) · 추가 디버프(2026-10-15 사용자 "기생 씨앗·그늘·꽃가루(→ 강풍) 좋아보임, 나머지도 다 넣고") · 버팀(쉬고 난 다음 턴)
  frozen: { name: '얼음', icon: 'st_frozen', col: '#e8f8ff' }, paral: { name: '마비', icon: 'st_paral', col: '#ffe680' },
  leech: { name: '기생', icon: 'st_leech', col: '#c8e04a' }, shade: { name: '그늘', icon: 'fx_shade', col: '#a0a3c8' },
  gale: { name: '강풍', icon: 'env_gale', col: '#c0a8ff' }, taunt: { name: '도발', icon: 'fx_taunt', col: '#ff5a5a' },
  root: { name: '뿌리', icon: 'st_root', col: '#c08a5a' }, weak: { name: '약화', icon: 'fx_atk_down', col: '#ff8a8a' },
  corrode: { name: '부식', icon: 'fx_def_down', col: '#b9a04a' }, brace: { name: '버팀', icon: 'fx_immune', buff: true },
  // 버프(2026-10-16 구현 — 속성 짝: 불 분노 · 물 정화 · 풀 재생 · 대지 철벽 · 바람 가속 · 번개 집중 · 빙결 보호막 · 선인장 반사)
  rage: { name: '분노', icon: 'fx_atk_up', buff: true }, wall: { name: '철벽', icon: 'fx_def_up', buff: true }, haste: { name: '가속', icon: 'fx_spd_up', buff: true },
  regen: { name: '재생', icon: 'fx_regen', buff: true }, thorns: { name: '반사', icon: 'fx_reflect', buff: true }, shield: { name: '보호막', icon: 'fx_barrier', buff: true },
  flourish: { name: '만개', icon: 'fx_all_up', buff: true }, armor: { name: '방어구', icon: 'fx_armor', buff: true }, stealth: { name: '은신', icon: 'fx_stealth', buff: true }, clone: { name: '분신', icon: 'fx_stealth', buff: true },
  purified: { name: '정화', icon: 'fx_will', buff: true }, focus: { name: '집중', icon: 'fx_aim', buff: true },
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
