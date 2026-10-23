// 상태 효과 겉모습(이름 · 아이콘 · 색) — 전투 화면 효과 창(battle.js statusWins)과 식물 관리 기술 카드(plant.js)가 같이 씀.
// 2026-10-15 사용자: "디버프 별로 색을 다르게", 이로운 효과 = 청록 홀로그램 하나로, 해로운 효과 = 효과마다 제 색, 숫자 = 쌓인 수만(stack).
import { icon, iconMid } from './icons.js';
import { glyphH } from '../core/text.js';
import { rbox } from './ui.js';

// 아이콘 = 효과 · 스킬 분류 엑셀 v10의 효과(2026-10-22 사용자 "아이콘 비슷한게 있는데 … 분노같은 경우 · 엑셀로 작업중인 변경될 예정인걸 기준으로"):
//  속성 · 종류 · 능력치 아이콘을 효과에 빌려 쓰지 않음(분노 = 불꽃 = 화상처럼 헷갈렸음). 2026-10-23 이름도 엑셀 v10 그대로(전투에 엑셀을 넣으며 — 계획 Task 9).
//  같은 효과의 다른 이름: 마비 · 얼음 = 기절, 그늘 = 암실, 분신 = 은신(그림만 다름) · 짝 표 = docs/superpowers/specs/2026-10-22-v2-effect-icons.md · 그림이 없으면 art/icons.js ALIAS 의 옛 아이콘
//  stack = 창에 쌓인 수를 보이는 효과(그 수까지) · 능력치 겹은 겹 수
const UP = { buff: true, stack: 99 }, DOWN = { col: '#ff8a8a', stack: 99 };
export const STATUS = {
  // 자세(머리 위 · 그 턴만) · 선공 준비
  guard: { name: '방어', icon: 'shield', buff: true }, evade: { name: '회피', icon: 'fx_evade', buff: true }, reflect: { name: '반사', icon: 'fx_reflect', buff: true },
  initReady: { name: '선공', icon: 'ff', buff: true },
  // 능력치 강화 · 약화(겹마다 5턴)
  atkUp: { name: '활력', icon: 'fx_atk_up', ...UP }, defUp: { name: '억셈', icon: 'fx_def_up', ...UP }, spdUp: { name: '가속', icon: 'fx_spd_up', ...UP },
  critUp: { name: '예리', icon: 'fx_crit_up', ...UP }, accUp: { name: '집중', icon: 'fx_acc_up', ...UP },
  atkDown: { name: '쇠약', icon: 'fx_atk_down', ...DOWN }, defDown: { name: '시듦', icon: 'fx_def_down', ...DOWN }, spdDown: { name: '둔화', icon: 'fx_spd_down', ...DOWN },
  critDown: { name: '무딤', icon: 'fx_crit_down', ...DOWN }, accDown: { name: '교란', icon: 'fx_acc_down', ...DOWN },
  // 해로운 상태이상
  burn: { name: '화상', icon: 'fx_burn', col: '#ff7a3a' }, poison: { name: '독', icon: 'fx_poison', col: '#b866ff', stack: 5 }, bleed: { name: '출혈', icon: 'fx_bleed', col: '#ff5a6e' },
  shock: { name: '감전', icon: 'fx_shock', col: '#ffd84a' }, chill: { name: '빙결', icon: 'fx_chill', col: '#c4ecff', stack: 3 }, wet: { name: '젖음', icon: 'fx_wet', col: '#4f9dff' },
  dark: { name: '암실', icon: 'fx_shade', col: '#a0a3c8' }, shade: { name: '그늘', icon: 'fx_shade', col: '#a0a3c8' },
  stun: { name: '기절', icon: 'st_stun', col: '#ff86c8' }, paral: { name: '마비', icon: 'st_paral', col: '#ffe680' }, frozen: { name: '얼음', icon: 'st_frozen', col: '#e8f8ff' },
  seal: { name: '봉인', icon: 'fx_seal', col: '#6fd25c' }, root: { name: '속박', icon: 'st_root', col: '#c08a5a' }, taunt: { name: '도발', icon: 'fx_taunt', col: '#ff5a5a' },
  spore: { name: '포자', icon: 'st_spore', col: '#8fe0b8', stack: 99 }, leech: { name: '기생', icon: 'st_leech', col: '#c8e04a' },
  gale: { name: '강풍', icon: 'env_gale', col: '#c0a8ff', env: true },   // env = 효과 창이 아니라 환경 띠(battle.js envBand)
  // 이로운 상태이상 · 준비 효과 · 갑주
  regen: { name: '재생', icon: 'fx_regen', buff: true }, will: { name: '의지', icon: 'fx_will', buff: true }, immune: { name: '면역', icon: 'fx_immune', buff: true },
  aim: { name: '조준', icon: 'fx_aim', buff: true }, stealth: { name: '은신', icon: 'fx_stealth', buff: true }, clone: { name: '분신', icon: 'fx_stealth', buff: true },
  shield: { name: '보호막', icon: 'fx_barrier', buff: true }, armor: { name: '갑주', icon: 'fx_armor', buff: true },
  purified: { name: '정화', icon: 'fx_will', buff: true }, flourish: { name: '만개', icon: 'fx_all_up', buff: true },
};
// 효과 설명(전투 화면 '효과' 단추 · 기술 카드 뒷면 — 한 줄씩)
export const STATUS_DESC = {
  atkUp: '공격 +20% · 겹마다 5턴', defUp: '방어 +50% · 겹마다 5턴', spdUp: '기동 +20%(먼저 움직이고 잘 피함) · 겹마다 5턴', critUp: '치명 +10 · 겹마다 5턴', accUp: '적중 ↑ · 겹마다 5턴',
  atkDown: '공격 −15% · 겹마다 5턴', defDown: '방어 −25% · 겹마다 5턴', spdDown: '기동 −20% · 겹마다 5턴', critDown: '치명 −10 · 겹마다 5턴', accDown: '적중 ↓ · 겹마다 5턴',
  burn: '턴 끝 체력 4%씩 · 3턴', poison: '턴 끝 체력 2% × 겹(5겹까지) · 안 걸리면 줄어듦', bleed: '턴 끝 체력 3%씩 · 받는 회복 절반 · 3턴',
  shock: '턴 끝 체력 2% · 3턴 · 차례마다 25%(젖으면 50%) 마비 — 마비되면 사라짐', chill: '기동 ↓ · 3이 되면 얼음(한 번 쉼)', wet: '기동 · 적중 · 방어 ↓ · 빙결 · 감전이 더 쌓임',
  dark: '턴 끝 햇빛이 안 참', shade: '그 턴 끝 햇빛이 안 참', stun: '다음 차례를 쉼', paral: '몸이 굳어 한 번 쉼', frozen: '얼어서 한 번 쉼',
  seal: '다음 턴에 기술 하나를 못 씀', root: '다음 턴에 교체할 수 없음', taunt: '다음 턴엔 공격 기술만 · 교체 못 함',
  spore: '하나씩 따로 셈 · 피면 하나마다 체력 8%', leech: '턴 끝 체력을 건 식물이 빨아감 · 3턴', gale: '강풍 — 이쪽 공격이 잘 빗나감',
  regen: '턴 끝 체력 5% 회복 · 3턴', will: '기절 · 봉인 · 속박 · 도발을 막을 때가 있음 · 3턴', immune: '방금 쉬어서 다음 행동까지 기절하지 않음',
  aim: '다음 공격 기술의 모든 타 빗나감 없음 · 치명 +25 · 상대가 피하면 스침', stealth: '광역이 아닌 공격을 거의 피함 · 피하면 바로 이어 공격 · 맞거나 공격하면 풀림', clone: '광역이 아닌 공격을 거의 피함 · 피하면 바로 이어 공격 · 맞거나 공격하면 풀림',
  shield: '상대 공격 기술 한 번을 최대 체력 15%만큼 먼저 막음', purified: '내게 걸린 해로운 상태이상을 모두 지움(능력치 약화 · 기절은 못 지움)', flourish: '활력 · 억셈 · 가속 +5%씩 한 겹',
  armor: '체력 위 금속 칸 — 깨질 때까지 피해를 먼저 막음 · 쌓임(최대 체력 50%까지) · 망치에 약함 · 지속 피해는 못 막음',
  guard: '방어력 4배(연속 2.5배) · 그 턴 모든 공격', evade: '회피 자세 — 빗나감 ↑', reflect: '그 턴 처음 맞은 공격 피해의 30%를 되돌림', initReady: '다음 턴 먼저 움직이기 쉬움',
};
export const SW_ON = { fill: '#13385e', fill2: '#17446e', frame: '#8ccfff', frameHi: '#e6f3ff', frameLo: '#4f84bf', text: '#e0f0ff', num: '#8ccfff' };
export const hexMix = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
export const swCache = new Map();
export const swStyle = col => { let s = swCache.get(col); if (!s) swCache.set(col, s = { fill: hexMix(col, '#0a0c18', 0.8), fill2: hexMix(col, '#0a0c18', 0.72), frame: col, frameHi: hexMix(col, '#ffffff', 0.55), frameLo: hexMix(col, '#000000', 0.45), text: hexMix(col, '#ffffff', 0.72), num: hexMix(col, '#ffffff', 0.35) }); return s; };

// 나에게 거는 효과 이름(식물 관리 기술 줄의 작은 칩 — 엑셀 v10 이름)
export const BUFF_LOOK = { flourish: '만개', armor: '갑주', stealth: '은신', purify: '정화', regen: '재생', will: '의지', atkUp: '활력', defUp: '억셈', spdUp: '가속', critUp: '예리', accUp: '집중', aim: '조준', shield: '보호막' };
// 기술 카드용 작은 효과 칩: [아이콘][이름] — 디버프는 그 색, 버프는 청록. 너비를 돌려줌
export function fxChip(g, x, y, id, buffName, big = false) {   // big = 18칸 아이콘 · 20칸 칩(기술 카드 뒷면 — 2026-10-23 "상태이상 아이콘이 … 너무 작아져서")
  const D = buffName ? { name: buffName, buff: true } : STATUS[id];
  if (!D) return 0;
  const S = D.buff ? SW_ON : swStyle(D.col || '#ff6a6a'), ic = D.icon ? (big && iconMid(D.icon)) || icon(D.icon) : null, h = big ? 20 : 15, tx = ic ? 3 + ic.width : 5, w = tx - 1 + g.textW(D.name) + 5;
  rbox(g, x, y, w, h, 4, S.fill, S.frame);
  if (ic) g.img(ic, x + 2, y + Math.round((h - ic.height) / 2));
  g.text(D.name, x + tx, y + (big ? Math.round((h - glyphH('body')) / 2) : 2), { color: S.text });
  return w;
}
