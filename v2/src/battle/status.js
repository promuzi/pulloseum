// v2 상태 효과(버프·디버프) — 순수 계산(화면·시각과 무관, 씨앗 난수만). 설계·결정 = docs/superpowers/specs/2026-10-15-v2-status-effects-design.md
// 사용자 결정(2026-10-15):
//  · 디버프 = 화상 · 독 · 젖음 · 빙결 · 감전 · 기절 · 덩굴 + 기생 씨앗 · 그늘 · 강풍(처음 이름 꽃가루) · 도발 · 뿌리 묶기 · 약화 · 부식
//  · 겹침은 독만(5겹까지). 독은 2턴 넘게 새로 안 걸리면 턴마다 1겹씩 줄어듦. 빙결·감전은 3이 되면 한 턴 쉬고 0으로
//    (빙결·감전 쌓인 수가 자연히 줄어드는 것도 독과 같은 규칙 — 내 추천).
//  · 턴 수는 효과마다 같음(기술마다 다르지 않음) · 빗나가면 안 걸림, 방어 자세여도 걸림, 치명이라고 더 걸리지 않음 · 같은 속성은 안 걸림
//  · 3:3 교체하면 독·화상만 따라감 · 연계 = 젖은 상대는 감전·빙결이 하나 더 쌓임, 물에 맞으면 화상이 꺼짐, 불에 맞으면 젖음·빙결·얼음이 녹음
//  · 쉬는 시점 = 다음 행동 한 번 취소(아직 안 움직였으면 이번 행동, 이미 움직였으면 다음 턴 — 쓴 에너지는 돌려줌)
//  · 쉬고 난 다음 턴은 '버팀'(기절·빙결·감전이 안 걸림) — 연속으로 쉬기 막기(다른 게임 조사 뒤 추천 → 사용자 "쉬는 거 다음 턴 방어 좋다").
//  · 같은 날 사용자 "기동성 떨어지면 회피도 당연히 어려워져야 함" → 기동성 하나가 선공 확률과 회피 자세 효과에 같이 들어감(mobK).
//    "젖음을 연계용으로만 너무 강하게 하지 말자 — 기동성 ↓ · 적중 ↓ · 방어 조금 ↓, 종합 디버프 느낌" → 젖음 = 셋 다, 연계는 두 배 → 하나 더.
//  · 같은 날 사용자: 쉬는 차례는 문구만 띄우고 자동으로 넘김(화면) · 3:3에서 쉬는 중엔 교체도 안 됨 · 버섯 디버프는 '포자'로 ·
//    기생 씨앗 · 뿌리 묶기(+ 그늘 · 부식)는 속성·종·생장에 묶이지 않는 변이·특수 기술용(식물 기술표에서 뺌, 규칙은 남겨 둠).
// 턴 세는 법: exp = 마지막으로 영향을 주는 턴 번호(턴 끝에 exp ≤ 지금 턴이면 사라짐) · left = 남은 턴 끝 횟수(지속 피해·빨아들이기).

import { canUseRes, turnDevices, galeTurn } from './devices.js';

export const FX = {
  // 해로운 상태이상(2026-10-23 엑셀 v10 효과 분류 19~31행): 기간 = 지금 N턴(걸린 턴 = 1턴째 · 만료 exp = T + N − 1 · 기술마다 o.turns 로 바꿈) ·
  //  다시 걸면 남은 턴과 새 기간 중 긴 쪽(now) · 교체해도 남음 · 정화로 지워짐(HARM)
  burn:    { el: 'fire', turns: 3, dot: 0.04, now: true, keep: true },   // 화상: 턴 끝 최대 체력 4% · 회복은 막지 않음(회복 방해는 출혈) · 물에 맞으면 꺼짐
  poison:  { stack: 5, dot: 0.02, keep: true },              // 겹마다 턴 끝 최대 체력 2%
  bleed:   { turns: 3, dot: 0.03, healK: 0.5, now: true },   // 출혈: 턴 끝 3% + 받는 회복 절반(거는 기술은 종 기술 때)
  wet:     { el: 'water', turns: 3, mob: 0.8, missAdd: 8, defK: 0.85, now: true },   // 종합: 기동성 −20% · 적중 ↓(빗나감 칸 +8) · 방어 −15%
  chill:   { el: 'ice', stack: 3, skip: 'frozen', mob: 0.8 }, // 쌓여 있는 동안 기동성 −20%(엑셀에 언급 없음 — 지금 동작) · 3 = 얼음(기절의 다른 이름 · 받는 피해 감소 없음)
  shock:   { el: 'bolt', turns: 3, dot: 0.02, p: 0.25, wetP: 0.5, now: true },   // 감전: 턴 끝 약한 피해 2% · 자기 차례마다 25%(젖으면 50%) 마비 → 감전 사라짐
  stun:    { skip: 'stun' },                                  // 바로 한 번 쉼
  // 제한(엑셀 v10 27~29행) = 다음 1턴(걸린 턴은 빼고 다음 턴 선택을 막음 · from = T + 1) · 그 턴에 쉬어도 끝 · 불에 안 풀림 · 의지가 확률로 막음
  seal:    { turns: 1, next: true },                          // 봉인(옛 덩굴): 손패 기술(기본기 · 못 쓸 기술 포함) 하나를 무작위로 골라 다음 턴에 막음 — 막는 개수는 밸런스(지금 1)
  leech:   { turns: 3, drain: 0.025, now: true },             // 기생: 턴 끝 2.5%를 빨아 처음 건 식물(by = slot)이 회복 · 건 식물이 쓰러지면 끝
  dark:    { turns: 1, now: true },                           // 암실: 걸린 턴 끝부터 자연 햇빛 N번 막음(N = 기술마다 · 그늘 = 이름 · 연출만 다른 같은 효과) · 재생 · 광합성은 안 막음
  // 전장 환경(엑셀 v10 38행): 켠 편의 상대 쪽 앞 식물에 둠(교체하면 다음 앞 식물로 · 대기석 제외) · 지금 N턴(기술마다) · 정화로 못 지움 · 같은 편이 켜 둔 동안 다시 켜지지 않음
  gale:    { env: true, turns: 2, missAdd: 12 },
  orbTrap: { env: true },   // 봉인 구슬 덫(볼트바인 — 내 쪽 지형: 교체 · 쓰러져도 남고 내 쪽 앞 식물이 맞을 때마다 하나씩 터짐 · devices.orbTrapBurst)
  thornTrap: { env: true },   // 쏜위드 덫(우리 편 지형 · 설치형: 교체 · 쓰러져도 남고 우리 편 공격이 빗나가거나 스치면 하나씩 터짐 · devices.thornBurst)
  morning: { env: true },   // 아침(프로스트벨 — 필드: 양쪽 앞 식물 · 프로스트벨이 나가면 사라짐 · devices.bellSync 가 깔고 걷음 · 메아리만)
  night:   { env: true },   // 밤(프로스트벨 — 필드: 양쪽 앞 식물 자연 햇빛이 안 참 · 교체로 들어와도 · 메아리 더 셈)
  cave:    { env: true },   // 동굴(스톤캡 타고남 — 스톤캡이 나와 있는 동안 상대 쪽 · 기간 없음 · devices.caveSync 가 깔고 걷음)              // 강풍: 그 쪽 앞 식물 공격 빗나감 +12
  taunt:   { turns: 1, next: true },                          // 도발: 다음 턴 공격 기술만(대표 분류 = 공격) · 교체 못 함 · 햇빛이 없으면 0번 평타, 그것도 봉인이면 쉼
  root:    { turns: 1, next: true },                          // 속박: 다음 턴 교체 못 함 · 같은 식물은 교체로 나갔다 들어오기 전까지 한 번만 · 1:1에선 봉인으로
  // 포자(엑셀 v10 30행) = 따로 쌓이는 지연 효과: 걸 때마다 하나씩 붙어 각자 셈(상한 없음) · 지연 N턴(기술마다 — 옛 1겹 기술 = 2턴 · 2겹 = 1턴) ·
  //  걸린 다음 턴부터 세어 N턴째 턴 끝에 핌 → 하나에 최대 체력 8%(같은 턴 여럿이면 더함) · 기본은 피해만(암실 · 흡혈은 특수 포자 기술에만) · 버섯은 안 걸림 · 불에 다 탐
  spore:   { jong: 'mushroom', delay: 2, bloom: 0.08 },
  // 능력치 버프 · 디버프(2026-10-23 엑셀 v10 효과 분류 9~18행 — 활력 · 억셈 · 가속 · 예리 · 집중 / 쇠약 · 시듦 · 둔화 · 무딤 · 교란):
  //  거는 만큼 겹이 쌓이고 겹마다 지금 5턴(걸린 턴 = 1턴째)이 따로 감 · 교체해도 남고 대기석에서도 시간이 감 · 정화로 안 지워짐(반대 효과로 메움) ·
  //  한 겹 값 v(기술마다 바꿀 수 있음 — o.v) = 공격 · 방어 · 기동은 배율에 더함(%), 치명 · 정확도는 판정표 칸에 더함 — 수치는 밸런스 전 임시(계획 문서 표)
  atkUp:   { stat: 'atk', sign: 1, v: 0.2, turns: 5 },  defUp:   { stat: 'def', sign: 1, v: 0.5, turns: 5 },  spdUp:   { stat: 'spd', sign: 1, v: 0.2, turns: 5 },
  critUp:  { stat: 'crit', sign: 1, v: 10, turns: 5 },  accUp:   { stat: 'acc', sign: 1, v: 8, turns: 5 },
  atkDown: { stat: 'atk', sign: -1, v: 0.15, turns: 5 }, defDown: { stat: 'def', sign: -1, v: 0.25, turns: 5 }, spdDown: { stat: 'spd', sign: -1, v: 0.2, turns: 5 },
  critDown: { stat: 'crit', sign: -1, v: 10, turns: 5 }, accDown: { stat: 'acc', sign: -1, v: 8, turns: 5 },
  // 버프(2026-10-16 — 기술 체계 문서 §3 짝: 불 분노 · 물 정화 · 풀 재생 · 대지 철벽 · 바람 가속 · 번개 집중 · 빙결 보호막 · 선인장 반사). 겹치지 않고 다시 걸면 새로
  regen:   { buff: true, turns: 3, heal: 0.05, now: true },  // 재생: 지금 3턴 · 턴 끝 최대 체력 5% 회복(출혈이면 절반 · 그늘로 멈추지 않음)
  reflect: { k: 0.3 },                                        // 반사(엑셀 v10 방어 스킬 — 기술의 reflect 표시): 그 턴 처음 맞은 한 타 피해의 30%를 되돌림(멀리 · 광역도)
  // 준비 효과(엑셀 v10 35~37행) = 일회성 · 교체 시 제거 · 기간 없음
  shield:  { buff: true, hp: 0.15 },                          // 보호막: 최대 체력 15% — 상대 공격 기술 한 번의 모든 타를 남은 양까지 막고 그 기술이 끝나면 잔량 제거 · 빗나감 · 상태이상 피해엔 남음
  aim:     { buff: true, k: 25 },                             // 조준(옛 집중 · 2026-10-23 재정의): 다음 공격 기술 한 번의 모든 타 결과표 — 빗나감 없음 · 치명 +25 · 회피는 스침으로(rules.js hitTable) → 그 기술이 끝나면 소비 · 쉬면 풀림
  will:    { buff: true, turns: 3, p: 0.5, now: true },      // 의지(엑셀 v10 33행): 기절(마비 · 얼음) · 봉인 · 속박 · 도발을 확률로 막음 — 막으면 빙결은 0으로, 감전은 사라짐(확률은 밸런스 전 임시)
  // 2026-10-18 바닥 규칙 2단계(species-identity §1): 방어구 = 체력 위 금속 칸(깨질 때까지 · 쌓임 · 교체해도 남음 · 망치에 ×1.5로 깎임 · 지속 피해는 통과)
  //  은신 = 이번 턴 광역 아닌 공격 95% 빗나감 + 기습(공격 ×1.5 · 상대 자세 무시) · 분신 = 2턴 광역 아닌 공격 90% 빗나감(진짜가 맞거나 광역이면 풀림)
  flourish: { buff: true, adds: { atkUp: 0.05, defUp: 0.05, spdUp: 0.05 } },   // 만개(페탈로즈 원안 '모든 스탯 증가' — 2026-10-19 '독립 상태 없이 공통 강화로'): 쓸 때마다 활력 · 억셈 · 가속 +5% 한 겹씩
  armor:   { buff: true, keep: true, hp: 0.15, cap: 0.5, hammerK: 1.5 },
  stealth: { buff: true, miss: 0.95, ambush: 1.5 },          // 은신(분신 = 연출만 — 2026-10-19 통합): 기술을 쓸 때 시작 · 광역 아닌 공격 95% 빗나감 · 맞거나 · 내가 공격하거나 · 쉬면 풀림 · 다 피하면 이어 공격(link · 기습 ×1.5)
};
// evadeLo/Hi·evadePow = 회피 자세 효과 = (내 기동 ÷ 상대 기동)^0.5, 0.7~1.3배(상대보다 빠르면 잘 피하고 느리면 덜 피함)
export const RULES_FX = { decayAfter: 2, wetStackAdd: 1, evadePow: 0.5, evadeLo: 0.7, evadeHi: 1.3, statFloor: 0.2 };
const STATS = Object.keys(FX).filter(k => FX[k].stat);   // 능력치 겹 열 개
const UPS = STATS.filter(k => FX[k].sign > 0), DOWNS = STATS.filter(k => FX[k].sign < 0);
const TIMED = ['burn', 'bleed', 'shock', 'wet', 'leech', 'regen', 'dark', 'seal', 'gale', 'taunt', 'root', 'will', 'morning', 'night', 'bounce'];
const BUFFS = ['stealth', 'armor', ...UPS, 'regen', 'will', 'shield', 'aim', 'revive', 'bounce'];
// 해로운 상태이상 = 정화가 지우는 것(능력치 디버프 · 환경 · 기절은 못 지움 — 엑셀 v10) · 지운 뒤 보호는 없음(2026-10-23 사용자 '보호 없애')
const HARM = ['burn', 'poison', 'bleed', 'wet', 'chill', 'shock', 'spore', 'seal', 'leech', 'dark', 'taunt', 'root'];
const ORDER = ['burn', 'poison', 'bleed', 'wet', 'chill', 'shock', 'spore', 'seal', 'leech', 'dark', 'gale', 'cave', 'orbTrap', 'thornTrap', 'morning', 'night', 'taunt', 'root', ...DOWNS];
// 옛 효과 이름 바꿈표(2026-10-23 기술 표를 엑셀 v10 이름으로 다 옮겨 비움 — 시험이 비었는지 봄)
export const OLD = {};
const nowExp = (T, n) => T + n - 1;   // 지금 N턴의 마지막 턴
const ENV = Object.keys(FX).filter(k => FX[k].env);
// 교체로 나갈 때 지우는 것(엑셀 v10 — 상태이상 · 능력치 겹 · 갑주는 남고 시간이 감): 준비 효과(조준 · 은신 · 보호막) · 속박 한 번 표시 · 면역(스스로 바꾸면 그게 행동) · 정화 보호 · 환경(다음 앞 식물로 옮김)
const DROP = ['aim', 'stealth', 'shield', 'rooted', 'immune', 'revive', 'bounce', ...ENV];
// 아쿠아벌브(2026-10-29): 해로운 상태이상 목록 · 이로운 상태이상(조화가 베끼는 것) · 지우기(윤회 = 버프 · 디버프 전부 — 능력치 겹 포함 예외 기술, 2026-10-28 사용자)
export const HARM_IDS = HARM, GOOD_IDS = ['regen', 'will'];
export function wipeEff(u, keys) { const e = u.eff || {}, gone = keys.filter(k => e[k]); for (const k of gone) delete e[k]; return gone; }
export const WIPE_ALL = [...new Set([...HARM, ...STATS, ...BUFFS])];

const E = u => (u.eff ||= {});
export const has = (u, id) => !!(u && u.eff && u.eff[id]);
// 능력치 겹 합(올림 − 내림): 공격 · 방어 · 기동 = 배율에 더할 몫, 치명 · 정확도 = 판정표 칸
export function statSum(u, stat) {
  const e = u && u.eff; if (!e) return 0;
  let t = 0;
  for (const k of STATS) if (FX[k].stat === stat && e[k]) for (const s of e[k].s) t += FX[k].sign * s.v;
  return t;
}
const statK = (u, stat) => Math.max(RULES_FX.statFloor, 1 + statSum(u, stat));   // 겹 상한이 아직 없어 음수만 막음(0.2 아래로 안 감)
export const critAddOf = u => statSum(u, 'crit');

// ── 다른 계산이 읽는 값 ──
// 기동성 배율: 기동을 바꾸는 효과는 모두 여기로(젖음 · 빙결 · 가속 · 둔화) → 선공 확률과 회피 자세에 같이 들어감
export function mobK(u) {
  let k = ((u && u.modeK && u.modeK.spd) || 1) * statK(u, 'spd');   // 모드(공통 장치 D9) 기동 배율
  if (has(u, 'wet')) k *= FX.wet.mob;
  if (has(u, 'chill')) k *= FX.chill.mob;
  if (has(u, 'cave')) k *= Math.max(0.2, 1 - CAVE.spd - caveAdds(u).reduce((s, x) => s + (CAVE[x] && CAVE[x].spd || 0), 0));   // 동굴 기동 하락(자갈밭 · 지반붕괴가 더함)
  return k;
}
export const effSpd = u => (u.spd || 1) * mobK(u);
// 회피 자세 효과: 상대보다 빠르면 잘 피하고, 느리면(원래 느린 식물이든 젖음·빙결로 느려졌든) 덜 피함
export function evadeK(def, att) {
  const r = effSpd(def) / Math.max(1, att ? effSpd(att) : effSpd(def));
  return Math.max(RULES_FX.evadeLo, Math.min(RULES_FX.evadeHi, r ** RULES_FX.evadePow));
}
export const atkK = u => statK(u, 'atk') * ((u && u.modeK && u.modeK.atk) || 1) * (stormOn(u) ? 1 - FX.atkDown.v : 1);
export const defK = u => statK(u, 'def') * (has(u, 'wet') ? FX.wet.defK : 1) * ((u && u.modeK && u.modeK.def) || 1);
// 내 공격 빗나감 칸 더하기: 강풍 · 젖음 + 교란(−집중)
export const missAddOf = u => (has(u, 'gale') ? FX.gale.missAdd : 0) + (has(u, 'wet') ? FX.wet.missAdd : 0) + (stormOn(u) ? FX.accDown.v : 0) + (caveAdds(u).includes('gravel') ? CAVE.gravel.acc : 0) - statSum(u, 'acc');
// 강풍에 덧붙은 공명(게일캑터 — 폭풍 · 치유 · 뇌전): 강풍 안에 들어 있어 강풍과 함께 끝나고 교체 때 같이 옮겨 감 · 폭풍 = 교란 · 쇠약 한 겹 몫(폭풍 동안만 · 쌓이지 않음)
// 동굴(스톤캡): 기본 기동 −10% · 자갈밭 기동 −10% + 적중 −8 · 지반붕괴 기동 −10% · 이끼덮기 = 설치물 하나당 최대 체력 10% 회복 · 용암지대 = 턴 끝 화상(devices.galeTurn) — 수치는 밸런스 전
export const CAVE = { spd: 0.1, gravel: { spd: 0.1, acc: 8 }, collapse: { spd: 0.1 }, mossHeal: 0.1 };
// 소환수(스포어캡): 한꺼번에 최대 셋 · 잠든 포자 · 새끼 = 주인 능력치 30% · 성체 버섯 50% · 평타 위력 30 · 포자회귀 포자 수(잠든 1 · 새끼 2 · 성체 버섯 3) — 수치는 밸런스 전
export const SUMMON = { max: 3, pct: 0.1, adultPct: 0.2, power: 30, burst: { sleep: 1, baby: 2, adult: 3 } };
const sumsOf = u => ((u && u.summons) || []).filter(x => x.hp > 0);
// 볼트바인 구슬(햇빛 바 끝 칸): 칸 수 새싹 1 · 성장기 3 · 성체 5 · 기본 햇빛 칸 −2 · 발사 = 구슬 하나당 위력 15 · 수호 = 하나당 최대 체력 6% 막음 · 전격 구슬 한 타 25 · 뇌격구 = 구슬 하나당 25 · 덫 한 번 15 + 봉인 · 흡수 = 하나당 5% — 수치는 밸런스 전
export const ORB = { slots: [1, 3, 5], baseCut: 2, fire: 8, guard: 0.06, blast: 25, trap: 15, absorb: 0.05 };
const orbFree = u => (u && u.orb ? u.orb.n : 0);
// 햇빛 내기: 기본 칸부터, 모자라면 구슬 햇빛
export function payEnergy(u, cost) { if (!u || !cost) return; const b = Math.min(Math.max(0, u.energy || 0), cost); u.energy = (u.energy || 0) - b; if (cost > b && u.orb) u.orb.n = Math.max(0, u.orb.n - (cost - b)); }
export const caveAdds = u => (u && u.eff && u.eff.cave && u.eff.cave.add) || [];
export const galeAdds = u => (u && u.eff && u.eff.gale && u.eff.gale.add) || [];
const stormOn = u => galeAdds(u).includes('storm');
export const healK = u => (has(u, 'bleed') ? FX.bleed.healK : 1);   // 받는 회복 배율 — 회복 방해는 출혈만(화상은 순수 지속 피해)
// 카드 패시브(2026-10-17 — game/cards.js, 전투 유닛 u.pas): 공격 배율(용의 분노 = 내 체력 절반 아래 · 공생 균사 = 상대 나쁜 효과 수) · 피해 배율(소화액 = 상대 체력 30% 아래 · 강산 = 독 걸린 상대 · 강철 비늘 = 받는 피해 ↓)
export const debuffCount = u => { const e = (u && u.eff) || {}; return HARM.filter(k => e[k]).length + DOWNS.filter(k => e[k]).length + (e.skip ? 1 : 0); };   // 나쁜 효과 종류 수(능력치 디버프는 종류마다 하나)
export function pasAtkK(u, foe) {
  const p = u && u.pas; if (!p) return 1;
  let k = 1;
  if (p.wrath && u.hp < u.max * 0.5) k *= 1 + p.wrath;
  if (p.mycel && foe) k *= 1 + p.mycel * Math.min(4, debuffCount(foe));
  return k;
}
export function pasDmgK(att, def) {
  let k = 1;
  const a = att && att.pas, d = def && def.pas;
  if (a && a.exec && def.hp < def.max * 0.3) k *= 1 + a.exec;
  if (a && a.acid && has(def, 'poison')) k *= 1 + a.acid;
  if (d && d.guard) k *= 1 - d.guard;
  return k;
}
export const mustSkip = u => has(u, 'skip');
export const noEnergy = u => has(u, 'dark') || has(u, 'night');   // 암실(그늘) · 밤(프로스트벨 필드) = 그 턴 끝 자연 햇빛이 안 참
// 교체할 수 있나: 쉬는 차례(기절 · 마비 · 얼음) · 속박 · 도발(다음 1턴 — from ≤ 턴 T)이면 못 함. T를 안 주면 걸려 있기만 해도 막음(화면)
export const canSwitch = (u, T = Infinity) => { const e = (u && u.eff) || {}; return !e.skip && !(e.root && e.root.from <= T) && !(e.taunt && e.taunt.from <= T); };
// 고를 수 있는 기술: 에너지 · 덩굴로 묶인 칸 · 도발(자세 금지)
// 변이 기술 = 판마다 정해진 횟수(2026-10-17 사용자 "변이는 충전이 아닌 고정된 횟수를 갖고 있어. 다 쓰면 못씀 그 판은"): u.used[기술 id] = 이번 판에 쓴 횟수
//  (3:3도 그 식물의 판 — 교체해 들어갔다 나와도 그대로) · 횟수 없는 기술 = 끝없음
export const usesLeft = (u, s) => (s && s.uses ? Math.max(0, s.uses - ((u && u.used && u.used[s.id]) || 0)) : Infinity);
export function useCount(u, s) { if (u && s && s.uses) { u.used = u.used || {}; u.used[s.id] = (u.used[s.id] || 0) + 1; } }
export function canUse(u, s, energy = u.energy, foe = null) {
  if (!s || (s.cost || 0) > energy + orbFree(u)) return false;   // 볼트바인 = 구슬 햇빛까지
  if ((s.orbGuard || s.orbDump || s.orbBlast || s.orbAbsorb || s.orbTrap) && !orbFree(u)) return false;
  if (s.orbRefill && !(u.orb && u.orb.max - u.orb.trap - u.orb.n > 0)) return false;
  if (s.galeAdd && !(foe && has(foe, 'gale') && !galeAdds(foe).includes(s.galeAdd))) return false;   // 공명 = 상대 쪽 강풍이 불 때만 · 같은 공명은 한 번
  if (s.summon && sumsOf(u).length >= SUMMON.max) return false;   // 소환수 셋이면 못 부름
  if (s.volley && !sumsOf(u).some(x => x.stage !== 'sleep')) return false;   // 일제 포자 = 깨어난 소환수가 있을 때
  if (s.grow && !sumsOf(u).some(x => x.stage === 'baby')) return false;   // 커져라! = 새끼가 있을 때
  if (s.burst && !sumsOf(u).length) return false;   // 포자회귀 = 소환수가 있을 때
  if (s.caveAdd && s.act === 'hex' && !(foe && has(foe, 'cave') && !caveAdds(foe).includes(s.caveAdd))) return false;   // 설치 = 동굴이 있을 때 · 같은 설치는 한 번(지반붕괴는 공격이라 늘 씀)
  if (usesLeft(u, s) <= 0) return false;
  if (!canUseRes(u, s)) return false;   // 공통 장치: 개수 · 모드 · 체력 비용(devices.js)
  if (s.bell && u.st && u.st.bell) return false;   // 아침 · 밤 = 하나만 켜짐 · 덧씌우기 불가(꺼진 갱신 차례에만)
  if (s.trapBoom && !(u.eff && u.eff.thornTrap && u.eff.thornTrap.n > 0)) return false;   // 폭발은 예술이지 = 덫이 하나 이상일 때
  if (s.fakeDeath && u.st && u.st.fakeLock) return false;   // 죽은 줄 알았나? = 버팀이 발동한 다음 턴엔 잠김
  if (s.taste && !(u.st && u.st.meal && u.st.meal.ready)) return false;   // 맛평가 = 식사시간 바로 다음 턴에만
  const e = u.eff || {};
  if (sealed(e, s.id)) return false;
  if (e.taunt && s.act !== 'attack') return false;   // 도발 = 대표 분류가 공격인 기술만(공격 + 버프 · 회복도 됨)
  return true;
}
export const lockOf = (u, s) => { const e = (u && u.eff) || {}; return sealed(e, s.id) ? 'seal' : e.taunt && s.act !== 'attack' ? 'taunt' : null; };
// 봉인된 기술인가: 처음 뽑힌 하나(skill) + 메아리로 더 막힌 것(more — 프로스트벨 정적을 유지하세요)
function sealed(e, id) { return !!(e.seal && (e.seal.skill === id || (e.seal.more || []).includes(id))); }

// 창에 보일 목록(이로운 것 먼저 · 숫자 = 쌓인 수만)
export function listOf(u) {
  const e = (u && u.eff) || {}, out = [];
  if (e.immune) out.push({ id: 'immune' });
  for (const k of BUFFS) if (e[k]) out.push(k === 'armor' ? { id: k, hp: Math.round(e.armor.hp) } : e[k].s ? { id: k, n: e[k].n } : k === 'stealth' ? { id: e.stealth.look === 'clone' ? 'clone' : 'stealth' } : { id: k });   // 방어구 = 남은 양(체력 막대 금속 칸) · 능력치 겹 = 겹 수 · 은신 = 연출 이름(분신)
  if (e.skip) out.push({ id: e.skip.src });
  for (const k of ORDER) if (e[k]) out.push(k === 'dark' ? { id: e.dark.look || 'dark' } : k === 'spore' ? { id: k, n: e.spore.n, t: Math.min(...e.spore.left) } : ENV.includes(k) ? { id: k === 'gale' && (e.gale.add || []).includes('storm') ? 'storm' : k, exp: e[k].exp ?? null, add: k === 'cave' ? e.cave.add : undefined, n: k === 'orbTrap' || k === 'thornTrap' ? e[k].n : undefined } : e[k].n ? { id: k, n: e[k].n } : { id: k });   // 환경 = 끝나는 턴(화면 환경 띠가 남은 턴을 셈)   // 암실 = 그 기술의 이름(그늘)으로 · 포자 = 개수 + 가장 빨리 피기까지 남은 턴 끝 수
  return out;
}

// ── 쉬기(기절 — 엑셀 v10 대표 태그 · 마비 · 얼음은 이름 · 연출만) ──
// 걸리면 참 · 이미 쉬는 차례 · 면역 · 의지(확률)에 막히면 거짓(막힌 까닭 = resist 사건)
function setSkip(tgt, src, ctx) {
  const e = E(tgt), base = { who: ctx.by.id, to: tgt.id, name: tgt.name, id: src };
  const why = e.skip ? 'skip' : e.immune ? 'immune' : e.will && ctx.rng && ctx.rng() < FX.will.p ? 'will' : null;
  if (why) { ctx.ev.push({ t: 'resist', ...base, why, list: listOf(tgt) }); return false; }
  e.skip = { src };
  ctx.ev.push({ t: 'fx', ...base, list: listOf(tgt) });
  return true;
}
// 쉬는 차례가 오면: 고른 행동 취소(쓴 에너지는 부르는 쪽이 refund 만큼 돌려줌) → 면역(다음 행동 한 번을 기절 없이 — 그 행동을 마치면 끝)
export function consumeSkip(u, turn, ev, refund = 0) {
  const e = E(u), src = e.skip.src;
  delete e.skip; e.skipDone = turn;
  delete e.aim; delete e.stealth;   // 한 턴 쉬면 조준 · 은신이 풀림(엑셀 v10 준비 효과)
  e.immune = {};
  ev.push({ t: 'skip', who: u.id, name: u.name, src, refund, list: listOf(u) });
}
// 쓸 수 있는 행동이 하나도 없어 쉼(model.js BLOCKED): 기절로 쉰 것처럼 다음 턴 면역(기절 표시는 없음)
export function blockedRest(u, turn, ev) {
  const e = E(u);
  delete e.aim; delete e.stealth;
  e.immune = {};
  ev.push({ t: 'skip', who: u.id, name: u.name, src: 'blocked', refund: 0, list: listOf(u) });
}
// 그 식물이 제 행동을 마침(rules.resolveTurn — 쉰 차례 · 다 막혀 쉰 차례는 빼고): 면역 끝
export function endAct(u, ev) {
  if (u && u.eff && u.eff.immune) { delete u.eff.immune; ev.push({ t: 'expire', who: u.id, ids: ['immune'], list: listOf(u) }); }
}

// ── 걸기 ──
// ctx = { turn, rng, ev, by(건 쪽 유닛) }
// 능력치 겹 하나 더하기(겹마다 제 만료 — 지금 N턴 = 걸린 턴 T부터 → exp = T + N − 1)
function addStat(u, id, T, o = {}) {
  const D = FX[id], s = (E(u)[id] ||= { n: 0, s: [] });
  if (o.tag && o.cap && s.s.filter(x => x.tag === o.tag).length >= o.cap) return;   // 같은 기술에서 온 겹의 상한(칼춤 +5% 여섯 겹 = +30%)
  s.s.push({ v: o.v ?? D.v, exp: T + (o.turns ?? D.turns) - 1, ...(o.tag ? { tag: o.tag } : {}) });
  s.n = s.s.length;
}
export function apply(tgt, id0, n, ctx, o = {}) {
  const id = id0, D = FX[id], e = E(tgt), T = ctx.turn, ev = ctx.ev, look = o.look || null, base = { who: ctx.by.id, to: tgt.id, name: tgt.name, id: look || id };   // look = 같은 효과의 다른 이름(암실 → 그늘)
  if (!D || tgt.hp <= 0) return;
  if (e.bounce && ctx.by && ctx.by.id !== tgt.id && ctx.by.hp > 0 && !ctx.bounced && (HARM.includes(id) || DOWNS.includes(id) || id === 'stun')) {   // 너꺼잉(젤리캡): 걸리려는 상태를 건 쪽에게 튕김 — 그 기술 한 번이 거는 것 전부(끝나면 rules 가 걷음)
    e.bounce.used = true; ev.push({ t: 'fx', ...base, id: 'bounce', bounced: id, list: listOf(tgt) });
    return apply(ctx.by, id0, n, { ...ctx, by: tgt, bounced: true }, o);
  }
  if ((D.el && tgt.el === D.el) || (D.jong && tgt.jong === D.jong)) { ev.push({ t: 'immune', ...base }); return; }   // 같은 속성(포자는 같은 종)은 안 걸림
  if (tgt.pas && tgt.pas.immune && tgt.pas.immune.includes(id)) { ev.push({ t: 'immune', ...base, card: true }); return; }   // 카드(해독 체질)
  const by = ctx.by && ctx.by.pas;
  if (by && id === 'poison' && by.poisonAdd) n += by.poisonAdd;   // 카드(맹독 농축)
  if (D.stat) {
    for (let i = 0; i < (n || 1); i++) addStat(tgt, id, T, o);
    ev.push({ t: 'fx', ...base, n: e[id].n, list: listOf(tgt) });
  } else if (id === 'poison') {
    const p = e.poison ||= { n: 0, last: T };
    p.n = Math.min(D.stack, p.n + n); p.last = T;
    ev.push({ t: 'fx', ...base, n: p.n, list: listOf(tgt) });
  } else if (id === 'chill') {
    const wet = !!e.wet, add = n + (wet ? RULES_FX.wetStackAdd : 0), s = e[id] ||= { n: 0, last: T };
    s.n = Math.min(D.stack, s.n + add); s.last = T;
    ev.push({ t: 'fx', ...base, n: s.n, wet, list: listOf(tgt) });
    if (s.n >= D.stack) { delete e[id]; setSkip(tgt, D.skip, ctx); }   // 3이 되면 한 번 쉬고 0으로 — 면역 · 의지 · 이미 쉬는 중이면 쉬지 않고 0으로
  } else if (id === 'spore') {   // 하나 더 붙음(앞당기지 않음) · left = 피기까지 남은 턴 끝 수(지연 N → N + 1: 걸린 턴 끝도 셈) · 카드 포자 번식 = 지연 −1
    const delay = Math.max(0, (o.delay ?? (n >= 2 ? 1 : D.delay)) - ((by && by.sporeAdd) || 0)), sp = e.spore ||= { n: 0, left: [] };
    sp.left.push(delay + 1); sp.n = sp.left.length;
    ev.push({ t: 'fx', ...base, n: sp.n, list: listOf(tgt) });
  } else if (id === 'stun') {
    setSkip(tgt, look || 'stun', ctx);   // 기절의 다른 이름(매혹 = charm — 이름 · 연출만, 2026-10-28)
  } else if (D.now) {   // 지금 N턴(화상 · 출혈 · 감전 · 젖음 · 암실 · 기생): 다시 걸면 긴 쪽
    const exp = Math.max((e[id] && e[id].exp) || 0, nowExp(T, o.turns ?? D.turns));
    e[id] = { ...(e[id] || {}), exp };
    if (id === 'leech') e.leech.by = (ctx.by && (ctx.by.slot || ctx.by.id)) || null;   // 회복은 처음 건 식물(다시 걸면 새로 건 식물)
    if (id === 'dark' && look) e.dark.look = look;
    ev.push({ t: 'fx', ...base, list: listOf(tgt) });
  } else if (D.env) {   // 전장 환경(강풍): 그 쪽 앞 식물에 · 이미 불고 있으면 다시 켜지지 않음(기간도 안 늘어남)
    if (e[id]) { ev.push({ t: 'resist', ...base, why: 'env', list: listOf(tgt) }); return; }
    e[id] = { env: true, exp: nowExp(T, o.turns ?? D.turns), by: ctx.by.id };
    ev.push({ t: 'fx', ...base, list: listOf(tgt) });
  } else if (D.next) {   // 제한 셋(봉인 · 속박 · 도발): 다음 1턴
    if (e.will && ctx.rng && ctx.rng() < FX.will.p) { ev.push({ t: 'resist', ...base, why: 'will', list: listOf(tgt) }); return; }
    if (id === 'root' && tgt.solo) return apply(tgt, 'seal', n, ctx, o);   // 1:1(교체가 없음) = 속박 대신 봉인
    if (id === 'root' && e.rooted) { ev.push({ t: 'resist', ...base, why: 'once', list: listOf(tgt) }); return; }   // 교체로 나갔다 들어오기 전까지 한 번만
    const at = { from: T + 1, exp: T + (o.turns ?? D.turns) };
    if (id === 'seal' && o.usesOnly) {   // 무기는 집에 놓고 왔나?(쏜위드): 횟수 제한 기술 전부를 다음 1턴(없으면 헛것 — 대체 효과 없음, 2026-10-28 사용자)
      const L = (tgt.kit || []).filter(k => k.uses);
      if (!L.length) { ev.push({ t: 'resist', ...base, why: 'none', list: listOf(tgt) }); return; }
      e.seal = { ...at, skill: L[0].id, skillName: L[0].name, more: L.slice(1).map(k => k.id) };
      ev.push({ t: 'fx', ...base, skill: L.map(k => k.name).join(' · '), list: listOf(tgt) });
      return;
    }
    if (id === 'seal' && o.extra && e.seal && e.seal.from === at.from) {   // 메아리 봉인(프로스트벨): 같은 턴 걸린 봉인에 다른 기술 하나 더
      const left = (tgt.kit || []).filter(k => !sealed(e, k.id)), pick = left[Math.floor((ctx.rng ? ctx.rng() : 0) * left.length)];
      if (!pick) return;
      (e.seal.more ||= []).push(pick.id);
      ev.push({ t: 'fx', ...base, skill: pick.name, list: listOf(tgt) });
      return;
    }
    if (id === 'seal') {   // 손패 전체에서 하나를 무작위로 — 기본기도(2026-10-21) · 햇빛이 모자라거나 횟수를 다 써 못 쓸 기술도(2026-10-23 사용자 '봉인걸때 못쓸 기술도 뽑힐 수 있게 해')
      const kit = tgt.kit || [], pick = kit[Math.floor((ctx.rng ? ctx.rng() : 0) * kit.length)];
      if (!pick) return;
      e.seal = { ...at, skill: pick.id, skillName: pick.name };
      ev.push({ t: 'fx', ...base, skill: pick.name, list: listOf(tgt) });
      return;
    }
    e[id] = at;
    if (id === 'root') e.rooted = true;
    ev.push({ t: 'fx', ...base, list: listOf(tgt) });
  } else {
    e[id] = { exp: T + D.turns };
    ev.push({ t: 'fx', ...base, list: listOf(tgt) });
  }
}
// 감전 굴림(자기 행동 차례 — rules.resolveTurn): 마비면 감전이 사라지고 이번 행동 취소(쉬기 · 햇빛 돌려줌) · 이미 쉬는 차례엔 안 굴림 ·
//  면역 중에도 굴림(엑셀 v10) — 면역 · 의지가 막으면 쉬지 않고 감전만 사라짐
export function shockRoll(u, ctx) {
  const e = u.eff;
  if (!e || !e.shock || e.skip || u.hp <= 0) return false;
  if (ctx.rng() >= (e.wet ? FX.shock.wetP : FX.shock.p)) return false;
  delete e.shock;
  return setSkip(u, 'paral', { ...ctx, by: u });
}
// 나에게 버프 걸기(버프 기술 또는 공격 기술의 덤)
export function selfBuff(u, id0, ctx, o = {}) {
  const id = id0, e = E(u), T = ctx.turn, base = { who: u.id, to: u.id, name: u.name, id };
  if (FX[id] && FX[id].stat) { addStat(u, id, T, o); ctx.ev.push({ t: 'fx', ...base, n: e[id].n, list: listOf(u) }); return; }
  if (id === 'flourish') { for (const [k, v] of Object.entries(FX.flourish.adds)) addStat(u, k, T, { v }); ctx.ev.push({ t: 'fx', ...base, n: e.atkUp.n, list: listOf(u) }); return; }
  if (id === 'aim') { e.aim = { k: Math.max((e.aim && e.aim.k) || 0, o.aimK || FX.aim.k) }; ctx.ev.push({ t: 'fx', ...base, list: listOf(u) }); return; }
  if (id === 'stealth') {   // o = 그 기술(이어 공격 link · 연출 look)
    e.stealth = { look: o.look === 'clone' ? 'clone' : 'stealth', reflect: o.pierceReflect || false, link: o.link ? { ...o.link, id: o.id, name: o.name, el: o.link.el !== undefined ? o.link.el : o.el || null } : null };
    ctx.ev.push({ t: 'fx', ...base, id: e.stealth.look, list: listOf(u) }); return;
  }
  if (id === 'purify') {
    const gone = HARM.filter(k => e[k]);   // 해로운 상태이상 한 종류 = 그 모든 겹(엑셀 v10) · 능력치 디버프 · 환경 · 기절은 남음
    for (const k of gone) delete e[k];
    ctx.ev.push({ t: 'fx', ...base, id: 'purified', ids: gone, list: listOf(u) }); return;   // 'purified' = 씻어 내는 연출 · 글자(보호 칸은 없음)
  }
  const D = FX[id]; if (!D) return;
  if (id === 'regen') e.regen = { exp: Math.max((e.regen && e.regen.exp) || 0, nowExp(T, o.turns ?? D.turns)) };   // 지금 3턴 · 다시 걸면 긴 쪽
  else if (id === 'shield') e.shield = { hp: Math.max((e.shield && e.shield.hp) || 0, Math.max(1, Math.round(u.max * D.hp))) };   // 기간 없음(일회성) · 다시 쓰면 큰 쪽
  else if (id === 'armor') e.armor = { hp: Math.min(Math.round(u.max * D.cap), ((e.armor && e.armor.hp) || 0) + Math.max(1, Math.round(u.max * D.hp))) };   // 쌓임(상한 최대 체력 50%)
  else if (D.now) e[id] = { exp: Math.max((e[id] && e[id].exp) || 0, nowExp(T, o.turns ?? D.turns)) };   // 지금 N턴(의지 등) · 다시 걸면 긴 쪽
  else e[id] = { exp: T + D.turns };
  ctx.ev.push({ t: 'fx', ...base, list: listOf(u) });
}
// 맞았을 때(빗나감이 아니면): ① 공격 속성 연계 ② 기술 효과
export function onHit(att, tgt, skill, ctx) {
  if (tgt.hp <= 0) return;
  const e = E(tgt), ev = ctx.ev;
  if (skill.el === 'water' && e.burn) { delete e.burn; ev.push({ t: 'cure', to: tgt.id, name: tgt.name, id: 'burn', why: 'water', list: listOf(tgt) }); }
  if (skill.el === 'fire') {
    const own = skill.inflict && skill.inflict.id;   // 그 기술이 거는 효과는 태우지 않음(불씨 포자 = 불 속성인데 포자를 거는 기술 — 2026-10-17 카드 밸런스 시험에서 발견: 제 포자를 태워 1겹을 못 넘었음)
    const gone = ['chill', 'wet', 'spore', 'leech'].filter(k => e[k] && k !== own);   // 불이 냉기 · 물기 · 포자 · 기생 씨앗을 태움 · 봉인 · 속박은 안 풀림(2026-10-21)
    if (e.skip && e.skip.src === 'frozen') { delete e.skip; gone.unshift('frozen'); }   // 얼음(기절의 다른 이름)도 녹아 쉬기가 풀림 — 2026-10-21 기록 '얼음 · 빙결 · 젖음 · 포자 · 기생이 불에 풀리는 지금 규칙은 그대로'
    for (const k of gone) delete e[k];
    if (gone.length) ev.push({ t: 'cure', to: tgt.id, name: tgt.name, id: gone[0], ids: gone, why: 'fire', list: listOf(tgt) });
  }
  for (const f of [skill.inflict, ...(skill.inflicts || [])]) if (f && !(f.p != null && (ctx.rng ? ctx.rng() : 1) >= f.p)) apply(tgt, f.id, f.n || 1, { ...ctx, by: att }, f);   // 기술에 적힌 값(지연 delay · 기간 turns · 이름 look) · inflicts = 덤 효과 여럿(윈드페탈 매혹 = 기절(매혹) + 쇠약 — 2026-10-29) · 한 겹 v)
}

// 쓰러짐 사건(2026-10-16 — 판정 순서 점검 tools/test/edgecases.mjs): 체력이 0이 된 그 자리에서 한 번만. 먼저 쓰러진 쪽이 진다(model·team이 첫 쓰러짐으로 승패)
export function noteFall(u, ev) { if (u && u.hp <= 0 && !ev.some(e => e.t === 'faint' && e.who === u.id)) ev.push({ t: 'faint', who: u.id, name: u.name, key: u.key }); }

// ── 턴 끝 ──
// pairs = [[유닛, 건너편 앞 식물], …]: 화상 · 독 · 출혈 · 감전 피해, 기생 씨앗(빨아서 건 식물 회복), 빙결 · 독 줄어듦
//  순서 = 이번 턴 선공 쪽 먼저(누가 늘 먼저가 아니게) · stop() 이 참이 되면 거기서 멈춤(1:1 = 누가 쓰러지면, 3:3 = 한쪽 식물이 다 쓰러지면 판이 끝나서)
//  all = 판의 모든 유닛(기생을 건 식물 찾기 — u.slot) · 지금 N턴 효과는 피해 · 회복 뒤 그 턴이 마지막이면 사라짐
const dotTick = (u, id, turn, ev) => {
  const e = u.eff, d = Math.max(1, Math.round(u.max * FX[id].dot));
  u.hp = Math.max(0, u.hp - d);
  if (e[id].exp <= turn) delete e[id];
  ev.push({ t: 'tick', who: u.id, name: u.name, id, dmg: d, list: listOf(u) });
};
export function endTurn(pairs, turn, ev, stop = null, all = []) {
  const find = slot => slot && (all.find(x => x && (x.slot || x.id) === slot) || pairs.flat().find(x => x && (x.slot || x.id) === slot));
  for (const [u, opp] of pairs) {
    if (stop && stop()) break;
    const e = u.eff;
    if (!e || u.hp <= 0) continue;
    if (e.burn) dotTick(u, 'burn', turn, ev);
    if (e.poison && u.hp > 0) {
      const d = Math.max(1, Math.round(u.max * FX.poison.dot * e.poison.n));
      u.hp = Math.max(0, u.hp - d);
      const n = e.poison.n;
      if (turn - e.poison.last >= RULES_FX.decayAfter && --e.poison.n <= 0) delete e.poison;   // 2턴 넘게 안 걸리면 1겹씩
      ev.push({ t: 'tick', who: u.id, name: u.name, id: 'poison', n, dmg: d, list: listOf(u) });
    }
    if (e.bleed && u.hp > 0) dotTick(u, 'bleed', turn, ev);
    if (e.shock && u.hp > 0) dotTick(u, 'shock', turn, ev);
    if (e.leech && u.hp > 0) {   // 기생: 처음 건 식물이 회복 · 건 식물이 쓰러졌으면 피해 · 회복 모두 끝(엑셀 v10) · 교체 뒤 연결은 보류 — 지금은 건 식물이 살아 있으면 어디 있든 회복
      const by = find(e.leech.by);
      if (by && by.hp <= 0) { delete e.leech; ev.push({ t: 'expire', who: u.id, ids: ['leech'], list: listOf(u) }); }
      else {
        const take = Math.min(u.hp, Math.max(1, Math.round(u.max * FX.leech.drain)));
        u.hp -= take;
        let heal = 0;
        if (by) { const before = by.hp; by.hp = Math.min(by.max, by.hp + Math.round(take * healK(by))); heal = by.hp - before; }
        if (e.leech.exp <= turn) delete e.leech;
        ev.push({ t: 'drain', who: u.id, name: u.name, to: by ? by.id : null, toSlot: by ? by.slot : null, toName: by ? by.name : '', dmg: take, heal, list: listOf(u), list2: by ? listOf(by) : null });
      }
    }
    if (e.regen && u.hp > 0) {   // 재생: 출혈이면 절반(그늘로 멈추지 않음 — 엑셀 v10)
      const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * FX.regen.heal * healK(u))); ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) });
      if (e.regen.exp <= turn) { delete e.regen; ev.push({ t: 'expire', who: u.id, ids: ['regen'], list: listOf(u) }); }
    }
    if (u.pas && u.hp > 0 && u.hp < u.max && (u.pas.regen || (u.pas.rot && opp))) {   // 카드: 재생 비늘(최대 체력 %) · 부생 회복(상대 나쁜 효과 하나당 %) — 화상이면 절반
      const r = (u.pas.regen || 0) + (u.pas.rot && opp ? u.pas.rot * debuffCount(opp) : 0);
      if (r > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.max(1, Math.round(u.max * r * healK(u)))); if (u.hp > before) ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, card: true, list: listOf(u) }); }
    }
    if (e.spore && u.hp > 0) {   // 포자: 턴 끝마다 하나씩 줄어 0이 된 것만 핌(피해를 더해 한 번) · 나머지는 그대로
      const left = e.spore.left.map(x => x - 1), k = left.filter(x => x <= 0).length;
      e.spore.left = left.filter(x => x > 0); e.spore.n = e.spore.left.length;
      if (!e.spore.n) delete e.spore;
      if (k) { const d = k * Math.max(1, Math.round(u.max * FX.spore.bloom)); u.hp = Math.max(0, u.hp - d); ev.push({ t: 'bloom', who: u.id, name: u.name, dmg: d, k, list: listOf(u) }); }
    }
    let dec = false;
    for (const k of ['chill']) if (e[k] && turn - e[k].last >= RULES_FX.decayAfter) { dec = true; if (--e[k].n <= 0) delete e[k]; }
    if (dec && u.hp > 0) ev.push({ t: 'expire', who: u.id, ids: [], list: listOf(u) });
    galeTurn(u, opp, turn, ev);   // 강풍 공명(폭풍 피해 · 감전 · 우리 편 회복) · 게일캑터 공명 셈(devices.js)
    turnDevices(u, turn, ev);   // 공통 장치: 시한 · 메아리 · 개수 칸 턴마다(devices.js)
    noteFall(u, ev);
  }
}
// 턴 끝 마지막(에너지 회복 뒤): 정한 턴이 지난 효과 · 쉰 턴이 끝난 얼음 · 버팀
export function expire(u, turn, ev) {
  const e = u.eff;
  if (!e) return;
  const gone = [];
  for (const k of TIMED) if (e[k] && e[k].exp <= turn) { delete e[k]; gone.push(k); }
  for (const k of STATS) if (e[k]) { const s = e[k].s.filter(x => x.exp > turn); if (s.length < e[k].s.length) { if (s.length) e[k] = { n: s.length, s }; else { delete e[k]; gone.push(k); } } }   // 겹마다 따로 만료
  if (u.st && u.st.bell && u.st.bell.exp <= turn) delete u.st.bell;   // 프로스트벨 아침 · 밤 3턴이 끝남 → 다음 턴부터 다시 켤 수 있음
  if (u.st && u.st.fakeLock && u.st.fakeLock <= turn) delete u.st.fakeLock;   // 죽은 줄 알았나? 잠김은 다음 한 턴
  if (u.st && u.st.formBoost && u.st.formBoost.exp <= turn) delete u.st.formBoost;   // 입맛 다시기 2턴
  if (u.st && u.st.meal) { if (u.st.meal.ready) delete u.st.meal; else if (u.st.meal.T === turn) u.st.meal.ready = true; }   // 식사시간 → 다음 한 턴만 맛평가
  if (gone.length) ev.push({ t: 'expire', who: u.id, ids: gone, list: listOf(u) });
}
// 3:3 교체로 나갈 때: 준비 효과 · 환경 등만 지움(DROP) — 나머지는 남아 대기석에서도 턴마다 진행(model.closeTurn) · 소환수는 주인이 나가면 사라짐
export function clearOnSwitch(u) {
  const e = u.eff;
  if (e) for (const k of DROP) delete e[k];
  delete u.summons;
  if (u.st) delete u.st.bell;   // 프로스트벨이 나가면 아침 · 밤이 사라짐(2026-10-28 사용자) — 필드 표시는 다음 턴 처음 devices.bellSync 가 걷음
}
// 교체 때 환경을 다음 앞 식물로(환경은 그 쪽 진영의 것 — 2026-10-21 게일캑터 '교체해도 강풍이 끝날 때까지 남고 그때 앞에 선 식물에게')
export function moveEnv(from, to) {
  if (!from || !to || from === to || !from.eff) return;
  for (const k of ENV) if (from.eff[k]) { (to.eff ||= {})[k] = from.eff[k]; delete from.eff[k]; }
}
// 소환수 턴 끝(지속 피해 · 회복 · 시간): 주인 사건으로 내보냄(sum = 몇째) · 깨지면 summonBreak(쓰러짐 아님)
export function summonTurn(owner, turn, ev) {
  const L = owner && owner.summons;
  if (!L || !L.length) return;
  L.forEach((s, i) => { if (s.hp <= 0) return; const e2 = []; endTurn([[s, null]], turn, e2); expire(s, turn, e2); for (const x of e2) if (x.t !== 'faint') ev.push({ ...x, who: owner.id, sum: i }); });
  for (let i = L.length - 1; i >= 0; i--) if (L[i].hp <= 0) { const s = L.splice(i, 1)[0]; ev.push({ t: 'summonBreak', who: owner.id, i, name: s.name }); }
}
