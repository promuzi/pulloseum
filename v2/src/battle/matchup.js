// 변이 상성(2026-10-17 사용자 결정 — docs/superpowers/specs/2026-10-17-v2-mutation-matchup.md 안 3): 속성 상성(×1.5)에 곱하는 양념
//  ㉮ 변이끼리 다섯 바퀴(무기 → 포식 → 포자 → 독성 → 용족 → 무기) — 치는 쪽이 변이 기술로 칠 때 ×1.25
//  ㉯ 맞는 쪽 변이의 약한 속성(늘 — 그 속성 기술에 맞으면 ×1.25) · 치는 쪽 변이 기술의 센 속성(×1.25)
//  무기 = 무기 종류마다(칠 때): 셈 ×1.25 · 안 듦 ×0.8(사용자 "무기 종류에 상성을 다르게 — 그게 무기 변이의 재미" · "무기류는 다 물에 약하게, 번개 무기는 다르게")
import { SPECIES } from '../game/catalog.js';

export const FORM_K = 1.25, RESIST_K = 0.8;
export const FORM_BEATS = { weapon: 'predator', predator: 'spore', spore: 'toxic', toxic: 'dragon', dragon: 'weapon' };   // 칼이 턱을 벰 · 버섯을 먹어 치움 · 균이 독을 삭임 · 독은 큰 짐승을 쓰러뜨림 · 비늘이 칼을 튕김
export const FORM_WEAK = { weapon: ['bolt', 'water'], predator: ['grass'], toxic: ['water', 'grass'], spore: ['fire', 'wind'], dragon: ['ice'] };
export const FORM_STRONG = { predator: ['water'], toxic: ['earth', 'ice'], spore: ['earth'], dragon: ['fire', 'bolt'] };   // 무기는 무기 종류로
export const WEAPON_TYPES = {
  blade: { name: '칼', strong: ['grass'], resist: ['earth', 'water'] },           // 덩굴 · 잎을 벰 / 돌에 날이 무뎌짐 · 물은 벨 수 없음
  hammer: { name: '망치', strong: ['ice', 'earth'], resist: ['water'] },          // 얼음을 깸 · 바위를 부숨 / 쳐도 갈라졌다 다시 붙음
  gun: { name: '총', strong: ['fire'], resist: ['wind', 'water'] },               // 불길에 다가가지 않고 멀리서 / 바람에 빗나감 · 물속에선 느려짐
  flamer: { name: '화염방사', strong: [], resist: ['fire', 'water'] },            // 불 속성이 이미 풀 · 빙결 · 바람에 셈(×1.5) / 불 식물은 안 탐 · 물에 꺼짐 — 2026-10-17 사용자 "새로 추가한 무기도 상성을 고민해줘": 빙결 셈(속성과 겹쳐 ×1.875) · 바람 안 듦(불 > 바람과 부딪힘) 뺌
  spear: { name: '번개 창', strong: ['water'], resist: ['earth'] },               // 전기 작살 / 전기가 땅으로 빠짐(번개 무기 = 물에 안 듦 없음) — 2026-10-17 사용자 "풀과 번개는 중립 · 번개는 땅한테 약함으로"(풀 안 듦은 '번개 > 풀'과 부딪혀 뺌)
  rocket: { name: '로켓포', strong: ['earth'], resist: ['water', 'wind'] },       // 폭발이 흙더미 · 바위를 날려 버림 / 물에선 안 터짐 · 바람에 휨(사용자 "광역으로 로켓포")
  xbow: { name: '석궁', strong: ['wind', 'bolt'], resist: ['water', 'earth'] },   // 무거운 화살이 바람을 뚫음 · 나무 화살이라 감전 걱정 없이 멀리서(번개 = 무기 변이의 천적에 맞설 카드) / 물에 막힘 · 바위에 튕김(사용자 "석궁도")
};
// 무기 기술 → 종류(변이 카드 + 태생 무기 식물 블레이드바인의 베기 기술)
export const SKILL_WEAPON = {
  m_slash: 'blade', m_flame: 'blade', m_shot: 'gun', m_smash: 'hammer', m_flamer: 'flamer', m_spear: 'spear', m_rocket: 'rocket', m_xbow: 'xbow',
  u_blade_1: 'blade', u_blade_2: 'blade', u_blade_3: 'blade', u_blade_3b: 'blade', u_blade_3c: 'blade',
};
// 변이 기술 = 변이 카드 기술(tier m) · 태생 변이 식물의 개성 기술(그 변이 것)
const formSkill = (u, s) => !!(u && u.form) && (s.tier === 'm' || (s.tier === 'u' && SPECIES[u.key] && SPECIES[u.key].form === u.form));

// 치는 쪽 u · 맞는 쪽 d · 기술 s → 배율(속성 상성과 곱함). 공격 기술이 아니면 1
export function formMult(u, d, s) {
  if (!s || !d || !(s.power > 0)) return 1;
  let k = 1;
  if (d.form && s.el && (FORM_WEAK[d.form] || []).includes(s.el)) k *= FORM_K;   // 맞는 쪽 변이의 약한 속성
  const wt = SKILL_WEAPON[s.id];
  if (wt) { const W = WEAPON_TYPES[wt]; if (W.strong.includes(d.el)) k *= FORM_K; else if (W.resist.includes(d.el)) k *= RESIST_K; }
  if (formSkill(u, s)) {
    if (d.form && FORM_BEATS[u.form] === d.form) k *= FORM_K;                       // ㉮
    if (!wt && (FORM_STRONG[u.form] || []).includes(d.el)) k *= FORM_K;             // ㉯ 센 속성
  }
  return k;
}
