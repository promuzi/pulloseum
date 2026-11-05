// v2 전투 판 만들기 — 식물(종·스탯) → 전투 유닛, 기술 목록(기본기 셋 + 종 기술), 속성 상성, 상대 고르기.
// 계산은 rules.js(순수 함수·씨앗 난수 하나)에 맡기고 여기선 판을 차리고 한 턴을 돌린다. 화면 무관(헤드리스 시험 가능).
import { makeRng, resolveTurn, baseDamage, hitTable, initiativeChance, guardDefMult, RULES } from './rules.js';
import { formMult } from './matchup.js';
import { SKILLS as CAT_SKILLS, SPECIES, SPECIES_V2, uniquesOf, STAGE_KEY } from '../game/catalog.js';
import { caveSync, orbInit, dynAct, echoK, DYN, liveSkill, sporeDmg } from './devices.js';
import { canUse, mustSkip, noEnergy, endTurn, expire, summonTurn, has, FX, useCount, payEnergy, HARM_IDS, FRUIT, RULES_FX, defK, atkK, evadeK, effSpd, usesLeft, givesFx } from './status.js';
const STAT_UPS = Object.keys(FX).filter(k => FX[k].stat && FX[k].sign > 0), STAT_DOWNS = Object.keys(FX).filter(k => FX[k].stat && FX[k].sign < 0);

// 상성 = battle/elem.js(2026-11-04 옮김 — 포자 시간차 공격도 씀)
import { elemMult } from './elem.js';
import { PLAYBOOK_BY } from './playbook.js';
export { elemMult };
// 한 번 칠 때 배율 = 속성 상성 × 변이 상성(2026-10-17 — 변이끼리 · 변이 ↔ 속성 · 무기 종류)
export const hitMult = (u, d, s) => elemMult(s && s.el, d.el) * formMult(u, d, s);

// 기본기(누구나·무료): 평타 30 · 방어태세(순서 무관 방어 ×4, 적중 1회 후 해제) · 회피 자세(빗나감 +15·스침 +10칸)
export const BASICS = [
  { id: 'basic', name: '평타', act: 'attack', power: 30, cost: 0, cats: ['attack'], el: null },   // 40 → 30(2026-10-18 방어 비율 공식으로 작은 타가 덜 깎여서)
  { id: 'guard', name: '방어태세', act: 'guard', cost: 0, cats: ['guard'], guardDefMult: 4, guardHits: 1 },
  { id: 'evade', name: '회피 자세', act: 'evade', cost: 0, cats: ['evade'], shift: { miss: 15, graze: 10 } },   // 22 · 14 → 15 · 10(2026-10-18 평균 −35% → −25%, 턴 전체)
  { id: 'sun', name: '광합성', act: 'sun', cost: 0, gain: 2, cats: ['heal_energy'] },   // 이 턴 대신 햇빛 +2(턴 끝 +1과 따로 — 2026-10-18 사용자 "햇빛 채우는 카드")
];
// 쉬는 차례(얼음·마비·기절)에 고르는 대신 넘기는 행동
export const REST = { id: 'rest', name: '쉬기', act: 'skip', cost: 0, cats: ['other'] };
// 쓸 수 있는 행동이 하나도 없어 쉼(봉인 · 도발 · 햇빛 부족 — 엑셀 v10 '다 막히면 쉼, 쉰 다음 턴 면역'): 시간 초과로 넘어가는 REST와 달리 다음 턴 면역
export const BLOCKED = { ...REST, blocked: true };
// 종 기술(시제품 값): 1 = 가벼운 속성기(1 에너지), 2 = 대표 기술(3 에너지·영상 굽기의 종별 공격 연출)
// 상태 효과(inflict, 2026-10-15 사용자 "효과 있는 건 위력 감소 — 다만 센 컨셉이면 비용을 올리자"):
//  위력을 깎는 폭 = 효과 값만큼: 지속 피해·쌓여서 쉬게 하는 것 −10~15, 젖음·덩굴·부식·도발처럼 약한 것 −5~10. 센 컨셉(낙뢰·불덩이·대지 내려치기)은 위력 그대로 비용 3 → 4.
//  (12종 1:1 봇 대결 tools/test/status.mjs 로 효과 있음/없음 승률 차이를 보며 맞춤 — 젖음은 혼자선 득실이 거의 없어(느려진 쪽이 후공 방어가 더 잘 통함) −5, 연계용)
//  쌓는 수: 상태이상은 한 번에 한 겹(2026-11-05 사용자 '상태이상만 한 겹하고 버프 디버프는 여러겹 허용하자' — 전 = 대표 기술 2). 어느 식물에 무엇을 붙일지는 시제품 — 기술 체계(공통·가지·개성)로 다시 짤 때 갈아엎음.
//  도발은 봇을 상대로는 거의 쓸모가 없어(봇이 자세를 드물게 씀) 위력을 깎지 않음 — 사람끼리 심리전용.
//  효과 짝(2026-10-15 사용자 "효과 짝표 좋아"): 디버프는 그 식물의 속성(불 화상 · 물 젖음 · 풀 독 · 대지 기절 · 바람 강풍 · 번개 감전 · 빙결 빙결)
//  또는 종(꽃 약화 · 덩굴 덩굴 · 선인장 도발 · 버섯 포자)에서만. 기생 씨앗 · 뿌리 묶기 · 그늘 · 부식은 변이·특수 기술용이라 여기엔 없음.
const SKILLS = {
  flower_grass: [{ id: 's1', name: '꽃잎 향기', power: 65, cost: 1, el: 'grass', ranged: true, inflict: { id: 'atkDown' } }, { id: 's2', name: '꽃잎 칼날', power: 115, cost: 3, el: 'grass' }],
  thorn: [{ id: 's1', name: '가시 채찍', power: 60, cost: 1, el: 'grass', inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '가시 덤불', power: 110, cost: 3, el: 'grass', inflict: { id: 'seal' } }],
  aqua: [{ id: 's1', name: '물방울', power: 60, cost: 1, el: 'water', ranged: true, inflict: { id: 'wet' } }, { id: 's2', name: '물방울 세례', power: 100, cost: 3, el: 'water', ranged: true, inflict: { id: 'wet' } }],
  flower_wind: [{ id: 's1', name: '꽃잎 바람', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '꽃잎 돌풍', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'atkDown' } }],
  spark: [{ id: 's1', name: '전기 불꽃', power: 60, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '낙뢰', power: 120, cost: 4, el: 'bolt', ranged: true, inflict: { id: 'shock' } }],
  vine_water: [{ id: 's1', name: '물살 새순', power: 65, cost: 1, el: 'water', inflict: { id: 'seal' } }, { id: 's2', name: '파도 덮치기', power: 105, cost: 3, el: 'water', area: true, inflict: { id: 'wet' } }],
  cactus_fire: [{ id: 's1', name: '불씨', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불덩이', power: 120, cost: 4, el: 'fire', ranged: true, inflict: { id: 'burn' } }],
  gaia: [{ id: 's1', name: '돌 주먹', power: 75, cost: 1, el: 'earth', inflict: { id: 'taunt' } }, { id: 's2', name: '대지 내려치기', power: 120, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  flower_fire: [{ id: 's1', name: '불꽃 꽃잎', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불꽃 만개', power: 105, cost: 3, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  cactus_wind: [{ id: 's1', name: '바람 고리', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '돌개바람', power: 110, cost: 3, el: 'wind', ranged: true, inflict: { id: 'taunt' } }],
  vine_wind: [{ id: 's1', name: '휘감는 바람', power: 65, cost: 1, el: 'wind', ranged: true, inflict: { id: 'seal' } }, { id: 's2', name: '칼바람', power: 105, cost: 3, el: 'wind', ranged: true, inflict: { id: 'gale' } }],
  spore_cap: [{ id: 's1', name: '포자', power: 50, cost: 1, el: 'grass', ranged: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '포자 구름', power: 90, cost: 3, el: 'grass', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  frost_bell: [{ id: 's1', name: '서리 종소리', power: 60, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙결의 종', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill' } }],
  volt_vine: [{ id: 's1', name: '전깃줄 감기', power: 60, cost: 1, el: 'bolt', inflict: { id: 'seal' } }, { id: 's2', name: '고압 채찍', power: 120, cost: 4, el: 'bolt', inflict: { id: 'shock' } }],
  stone_cap: [{ id: 's1', name: '돌가루 포자', power: 55, cost: 1, el: 'earth', ranged: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '갓 내려찍기', power: 120, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  jelly_cap: [{ id: 's1', name: '젤리 방울', power: 60, cost: 1, el: 'water', ranged: true, inflict: { id: 'wet' } }, { id: 's2', name: '해파리 비', power: 105, cost: 3, el: 'water', ranged: true, area: true, inflict: { id: 'wet' } }],
  fang_trap: [{ id: 's1', name: '덫 물기', power: 65, cost: 1, el: 'earth', inflict: { id: 'atkDown' } }, { id: 's2', name: '대지 집어삼키기', power: 105, cost: 4, el: 'earth', inflict: { id: 'stun' } }],
  blade_vine: [{ id: 's1', name: '불꽃 베기', power: 60, cost: 1, el: 'fire', inflict: { id: 'burn' } }, { id: 's2', name: '용광로 일섬', power: 105, cost: 3, el: 'fire', inflict: { id: 'burn' } }],
  toxi_cactus: [{ id: 's1', name: '독가시 쏘기', power: 55, cost: 1, el: 'grass', ranged: true, inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '맹독 터뜨리기', power: 105, cost: 3, el: 'grass', area: true, inflict: { id: 'poison' } }],
  draco_fruit: [{ id: 's1', name: '서리 가시', power: 66, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '서리 열매 터뜨리기', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill' } }],
  frost_drake: [{ id: 's1', name: '서리 비늘', power: 66, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙룡의 숨', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill' } }],
  ember_cap: [{ id: 's1', name: '불씨 포자', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '불꽃 포자 구름', power: 100, cost: 3, el: 'fire', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  drake_cactus: [{ id: 's1', name: '용불 가시', power: 60, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '화룡의 숨결', power: 115, cost: 4, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  gat_cap: [{ id: 's1', name: '부채 바람', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '갓 회오리', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  mask_vine: [{ id: 's1', name: '탈춤 휘감기', power: 60, cost: 1, el: 'earth', inflict: { id: 'seal' } }, { id: 's2', name: '대지의 탈춤', power: 115, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  lantern_vine: [{ id: 's1', name: '초롱 불빛', power: 60, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '청사초롱 눈보라', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill' } }],
  jar_cactus: [{ id: 's1', name: '물동이 쏟기', power: 60, cost: 1, el: 'water', inflict: { id: 'wet' } }, { id: 's2', name: '물동이 내려치기', power: 115, cost: 3, el: 'water', area: true, inflict: { id: 'wet' } }],
  goblin_cap: [{ id: 's1', name: '방망이 찌릿', power: 60, cost: 1, el: 'bolt', inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '금 나와라 뚝딱', power: 120, cost: 4, el: 'bolt', inflict: { id: 'shock' } }],
  crown_cap: [{ id: 's1', name: '서리 광채', power: 55, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙왕의 포자', power: 100, cost: 3, el: 'ice', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  gladi_cactus: [{ id: 's1', name: '가시 칼 찌르기', power: 60, cost: 1, el: 'earth', contact: true }, { id: 's2', name: '검투사의 일격', power: 115, cost: 4, el: 'earth', contact: true, inflict: { id: 'defDown' } }],
  jangseung_cactus: [{ id: 's1', name: '장승 눈빛', power: 55, cost: 1, el: 'grass', ranged: true, inflict: { id: 'atkDown' } }, { id: 's2', name: '천하대장군', power: 105, cost: 3, el: 'grass', contact: true, inflict: { id: 'taunt' } }],
  astro_cap: [{ id: 's1', name: '공기 방울', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '궤도 돌진', power: 105, cost: 3, el: 'wind', contact: true, self: 'spdUp' }],
  viking_cap: [{ id: 's1', name: '뿔 박치기', power: 60, cost: 1, el: 'ice', contact: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙하 돌격', power: 115, cost: 4, el: 'ice', contact: true, inflict: { id: 'chill' } }],
  hyunmu_cap: [{ id: 's1', name: '물뱀 휘감기', power: 55, cost: 1, el: 'water', inflict: { id: 'seal' } }, { id: 's2', name: '현무의 물결', power: 110, cost: 4, el: 'water', ranged: true, area: true, inflict: { id: 'wet' } }],
  gumiho_bloom: [{ id: 's1', name: '여우불', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '아홉 꼬리 불', power: 110, cost: 4, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  wizard_bell: [{ id: 's1', name: '별빛 찌릿', power: 55, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '번개 주문', power: 110, cost: 4, el: 'bolt', ranged: true, inflict: { id: 'shock' } }],
  ninja_vine: [{ id: 's1', name: '잎 수리검', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '수리검 난무', power: 105, cost: 3, el: 'wind', ranged: true, area: true }],
  diver_vine: [{ id: 's1', name: '물질', power: 55, cost: 1, el: 'water', inflict: { id: 'wet' } }, { id: 's2', name: '파도타기', power: 105, cost: 3, el: 'water', ranged: true, area: true, inflict: { id: 'wet' } }],
  pirate_cactus: [{ id: 's1', name: '물보라 칼질', power: 60, cost: 1, el: 'water', contact: true, inflict: { id: 'wet' } }, { id: 's2', name: '큰 파도 베기', power: 110, cost: 3, el: 'water', contact: true, inflict: { id: 'taunt' } }],
  ranger_vine: [{ id: 's1', name: '덩굴 화살', power: 55, cost: 1, el: 'grass', ranged: true, inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '잎새 연사', power: 105, cost: 3, el: 'grass', ranged: true, inflict: { id: 'seal' } }],
  miner_cap: [{ id: 's1', name: '곡괭이 찍기', power: 60, cost: 1, el: 'earth', contact: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '광맥 폭파', power: 105, cost: 3, el: 'earth', area: true, inflict: { id: 'stun' } }],
  snow_ballet: [{ id: 's1', name: '눈꽃 회전', power: 55, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '얼음 피루엣', power: 100, cost: 3, el: 'ice', area: true, inflict: { id: 'chill' } }],
  volcano_cap: [{ id: 's1', name: '불씨 분출', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '화산 폭발', power: 115, cost: 4, el: 'fire', area: true, inflict: { id: 'burn' } }],
  dandel_aero: [{ id: 's1', name: '솜털 바람', power: 50, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '민들레 폭풍', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'atkDown' } }],
  drum_cactus: [{ id: 's1', name: '북채 번개', power: 60, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '뇌고 연타', power: 120, cost: 4, el: 'bolt', ranged: true, area: true, inflict: { id: 'shock' } }],
};
// 기본기 이름(2026-10-16 사용자 "평타도 내가 임의로 만든 거지 스킬 이름이 있어야 해. 스킬 같아야 하고 식물마다 다른") — 규칙(위력 30 공격 · 방어태세 · 회피 자세)은
//  BASICS 그대로, 이름만 식물마다 [공격, 방어, 회피]. 이름은 임시(사용자가 고칠 수 있음) — 기술 id(basic · guard · evade)는 그대로라 서버·기록·친구 대결과 맞음
export const BASIC_NAMES = {
  flower_grass: ['잎사귀 치기', '꽃잎 오므리기', '꽃잎 흩날리기'],
  thorn: ['덩굴 후리기', '가시 세우기', '덩굴 숨기'],
  aqua: ['알뿌리 박치기', '물막 두르기', '물결 피하기'],
  flower_wind: ['꽃대 휘두르기', '잎 겹치기', '바람 타기'],
  spark: ['꽃머리 박치기', '전기막 치기', '번쩍 피하기'],
  vine_water: ['덩굴 낚아채기', '덩굴 똬리', '물살 타기'],
  cactus_fire: ['가시 박치기', '몸 웅크리기', '아지랑이'],
  gaia: ['바위 박치기', '바위 되기', '모래 숨기'],
  flower_fire: ['꽃잎 할퀴기', '꽃잎 방패', '불꽃 흔들기'],
  cactus_wind: ['가시팔 휘두르기', '가시 갑옷', '회오리 피하기'],
  vine_wind: ['덩굴 감아치기', '덩굴 감싸기', '덩굴 그네'],
  spore_cap: ['갓 박치기', '갓 덮기', '포자 연막'],
  frost_bell: ['종 흔들기', '서리 덮기', '눈발 숨기'],
  volt_vine: ['덩굴 후려치기', '절연 감기', '번쩍 비키기'],
  stone_cap: ['돌갓 박치기', '바위처럼 버티기', '돌가루 숨기'],
  jelly_cap: ['촉수 치기', '말랑 막기', '물살 미끄럼'],
  fang_trap: ['덫 박치기', '덫 닫기', '흙먼지 숨기'],
  blade_vine: ['칼잎 휘두르기', '칼잎 막기', '불티 비키기'],
  toxi_cactus: ['가시 박치기', '가시 웅크리기', '독안개 숨기'],
  draco_fruit: ['열매 박치기', '껍질 웅크리기', '서리 흩날리기'],
  frost_drake: ['비늘 박치기', '비늘 웅크리기', '서리 날갯짓'],
  ember_cap: ['갓 박치기', '갓 덮기', '불티 연막'],
  drake_cactus: ['가시 박치기', '비늘 웅크리기', '날개 비키기'],
  gat_cap: ['갓 박치기', '갓 숙이기', '바람 타기'],
  mask_vine: ['소매 덩굴 치기', '탈 가리기', '춤사위 비키기'],
  drum_cactus: ['북채 내려치기', '북 방패', '장단 비키기'],
  lantern_vine: ['초롱 흔들기', '초롱 감싸기', '덩굴 비키기'],
  jar_cactus: ['동이 박치기', '똬리 웅크리기', '출렁 비키기'],
  goblin_cap: ['방망이 휘두르기', '방망이 막기', '도깨비 걸음'],
  crown_cap: ['왕관 박치기', '망토 두르기', '얼음 미끄럼'],
  gladi_cactus: ['가시 칼 베기', '방패 들기', '모래 구르기'],
  jangseung_cactus: ['장승 박치기', '장승 버티기', '솔가지 숨기'],
  astro_cap: ['헬멧 박치기', '헬멧 웅크리기', '공기 분사 비키기'],
  viking_cap: ['뿔 들이받기', '망토 두르기', '얼음 미끄럼'],
  hyunmu_cap: ['물뱀 물기', '등껍질 숨기', '물살 비키기'],
  gumiho_bloom: ['꼬리 할퀴기', '꼬리 감싸기', '여우 둔갑'],
  wizard_bell: ['지팡이 톡', '꽃잎 망토', '순간 이동'],
  ninja_vine: ['덩굴 수도', '잎 방패', '분신 피하기'],
  diver_vine: ['물갈퀴 찰싹', '테왁 붙잡기', '자맥질'],
  pirate_cactus: ['커틀러스 휘두르기', '삼각모 눌러쓰기', '갑판 구르기'],
  ranger_vine: ['활 끝 찌르기', '두건 웅크리기', '덤불 숨기'],
  miner_cap: ['곡괭이 톡', '헬멧 웅크리기', '굴 파고 비키기'],
  snow_ballet: ['발끝 차기', '꽃잎 오므리기', '회전 비키기'],
  volcano_cap: ['분화구 박치기', '현무암 웅크리기', '연기 비키기'],
  dandel_aero: ['솜털 박치기', '고글 내리기', '바람 타고 비키기'],
};
export const basicsOf = key => { const n = BASIC_NAMES[key]; return BASICS.map((b, i) => ({ ...b, name: (n && n[i]) || b.name, fx: b.act === 'attack' ? key : null })); };
// 옛 종 기술(s1 · s2) 손패 — 고유 기술 v2를 켠 종도 공통 효과 시험(tools/test/status.mjs)이 옛 기술로 돌 수 있게(2026-10-29)
export const legacyKitOf = key => [...basicsOf(key), ...(SKILLS[key] || SKILLS.flower_grass).map(s => ({ act: 'attack', cats: ['attack'], ...s, fx: key }))];
export function kitOf(key) {
  if (SPECIES_V2.has(key)) return [...basicsOf(key), ...[0, 1, 2].flatMap(st => uniquesOf(key, st)).map(id => ({ ...CAT_SKILLS[id], fx: key }))];   // 종 고유 v2 = 세 단계 고유 기술 여섯(검토 화면 · 시험 유닛)
  const own = (SKILLS[key] || SKILLS.flower_grass).map(s => ({ act: 'attack', cats: ['attack'], ...s, fx: key }));
  return [...basicsOf(key), ...own];
}

// 유닛: id·이름·속성·스탯(rules.js 가 읽는 hp·atk·def·spd·acc·eva·crit) + 에너지·기술 + 상태 효과(eff)
export function makeUnit(id, sp, o) {
  return {
    id, key: o.key, name: o.name || sp.name, el: sp.el, jong: sp.type, pot: o.pot || 'pot_terra', stage: o.stage, form: o.form || sp.form || null, trainer: o.trainer, rank: o.rank, tlv: o.tlv,
    hp: o.hp, max: o.hp, atk: o.atk, def: o.def, spd: o.spd, acc: 0, eva: 0, crit: o.crit ?? 5,
    energy: 2, energyMax: 8, kit: kitOf(o.key), eff: {},
  };
}

// 못 쓰는 기술을 골랐을 때 대신 = 손패에서 쓸 수 있는 첫 기술, 없으면 넘어감(손패 넷에 기본기가 없으면 기력이 모자랄 수 있음)
export const firstOk = u => u.kit.find(s => canUse(u, s)) || BLOCKED;
// 시간 초과(2026-10-23 사용자 '시간초과 하면 랜덤으로 스킬써짐'): 지금 쓸 수 있는 기술 중 하나를 무작위로 · 없으면 막혀 쉼 — rnd = 0~1 난수(화면 Math.random · 서버 crypto)
export const randomOk = (u, rnd) => { const ok = u.kit.filter(s => canUse(u, s)); return ok.length ? ok[Math.min(ok.length - 1, Math.floor(rnd() * ok.length))] : BLOCKED; };
// 봇 머리(2026-10-22 사용자 "봇 지능 향상. 교환 등 전투를 전략적으로 하도록"): 기술마다 점수를 매겨 높은 것을 고름.
//  기대 피해(위력 · 상성 · 방어 · 맞을 확률) ÷ 상대 남은 체력 · 이번에 끝낼 수 있으면 크게 · 은신/분신엔 광역 ·
//  상대가 이번 턴 나를 쓰러뜨릴 만하면(상대가 쓴 기술 · 상대 햇빛으로 짐작) 방어 · 회피 · 막는 버프 · 햇빛이 모자라면 광합성.
//  머리 좋음 iq(0~1 — 봇 판을 열 때 대회 단계로 정함, fight.js) 만큼 높은 점수를 고르고, 낮으면 더 무작위(첫 판 · 낮은 단계가 쉬움).
//  사람과 같은 정보만 씀: 내 손패 · 상대 앞 식물의 보이는 값(속성 · 능력치 · 체력 · 햇빛 · 효과) · 상대가 이번 판에 쓴 기술(ctx.seen).
// 봇 시스템(2026-11-04 사용자 '봇 또한 이 고유 스킬 조합과 각각 버프 디버프, 상태이상의 연계와 활용을 잘 하며, 햇빛의 여유분을 고려하여 큰 비용, 적은 비용을 적절히 사용하도록 해줘.
//  체력의 상황에 따라, 상대의 속성에 따라도 조합하며, 자신의 스탯을 기준으로 어떤 전략을 취할지도' — 설계 docs/superpowers/specs/2026-11-04-bot-system-design.md):
//  ① 효과 값 fxVal = 거는 효과마다 이번 판에 주는 몫(지속 피해 · 쉬게 함 · 능력치 내림 · 연계 — 공격과 같은 잣대: 2.5 × 상대 남은 체력 몫)
//  ② 방어태세 · 회피 자세 = 내 방어 · 기동으로 실제 막는 몫(방어가 높으면 방어태세 · 빠르면 회피 자세가 더 막음)
//  ③ 먼저 · 나중 갈래가 있는 기술 = 선공 확률로 두 갈래 점수를 섞음
//  ④ 다음 턴 내다보기 nextBest = 이번 수가 남기는 햇빛 · 개수 칸 · 열린 기술(식사시간 → 맛평가) · 상대 상태(빙결 겹 · 독 겹 · 남은 체력)로 다음 턴에 쓸 가장 좋은 수를 LOOK 만큼 더함
const hitChance = (u, foe, s) => {
  const t = hitTable(u, foe, { area: !!s.area });
  let p = (t.hit + 1.5 * t.crit + 0.5 * t.graze) / 100;
  if (!s.area && has(foe, 'stealth')) p *= 0.05;   // 은신(분신 = 연출만) = 광역 아닌 공격 95% 빗나감
  return p;
};
// 덤 효과가 걸릴 확률 = 빗나가지만 않으면(스침도 걸림)
const landChance = (u, foe, s) => { const t = hitTable(u, foe, { area: !!s.area }); let p = 1 - t.miss / 100; if (!s.area && has(foe, 'stealth')) p *= 0.05; return Math.max(0, p); };
// 머리 손잡이(2026-11-04 — 기능마다 켜고 끄며 시뮬레이션으로 고름: node tools/test/botsys.mjs brain --set 이름=값,…) — 기본값 = 그 재기에서 이긴 조합
//  fx = 효과 값(1) · 옛 '새 효과면 덤'(0) / fxK = 효과 값 배율 / stance = 방어태세 · 회피 자세를 내 방어 · 기동으로(1) · 옛 고정값(0) / branch = 먼저 · 나중 갈래 섞기 /
//  look = 다음 턴 내다보기 무게 / deep = 그 뒤 두 턴을 햇빛만 따져 더 봄 / pot = 모아 둔 개수(준비 · 용의 심장 · 열매 · 덫)의 값 무게 / sunOld = 광합성을 옛 규칙(가장 비싼 기술까지 모으기)으로 / rDmg = 버프 · 효과 잣대 R을 피해 몫으로 / drain = 흡수 회복 값 / selfK = 공격 덤 버프 값 배율
export const BRAIN = { fx: 1, fxK: 2, stance: 1, branch: 1, look: 0.3, deep: 0, pot: 0.6, sunOld: 1, rDmg: 1, drain: 1, selfK: 0.8 };
const newFx = (s, foe) => { const f = s.inflict; if (!f) return false; const D = FX[f.id]; return !!D && !(D.el && D.el === foe.el) && !(D.jong && D.jong === foe.jong) && (D.stack || D.stat ? true : !has(foe, f.id)); };   // 옛 덤: 쌓이는 것(독 · 빙결 · 포자 · 능력치 겹)은 늘 새로
// 그 차례 실제 값으로 본 기술(2026-10-29 봇 손질): 열매 · 덫 · 잃은 체력 · 준비 개수 · 상대 상태 보너스 · 속성 바꾸기(dynAct) — 판 상태는 건드리지 않게 복사본으로 · 운은 가운데 값
const peekAct = (u, s, foe) => (s && s.act === 'attack' && (DYN.some(k => s[k]) || (u.st && u.st.formBoost)) ? dynAct({ ...u, st: { ...(u.st || {}) }, res: u.res ? { ...u.res } : undefined }, s, foe, () => 0.5) || s : s);
export const expDamage = (u, foe, s0) => { const s = peekAct(u, s0, foe); return s && s.act === 'attack' && s.power ? baseDamage(u, foe, s, hitMult(u, foe, s)) * (s.strikes ? s.strikes.length : s.hits || 1) * hitChance(u, foe, s) : 0; };
// 상대가 이번 턴 나에게 줄 만한 피해: 쓴 기술 중 가장 센 것과, 상대 햇빛만큼 센 자기 속성 기술(짐작) 중 큰 쪽
export function threatOf(foe, u, seen = []) {
  const guess = { act: 'attack', power: 30 + 12 * Math.min(5, foe.energy || 0), el: foe.el, cost: 0 };
  return Math.max(expDamage(foe, u, guess), ...seen.filter(s => s && s.act === 'attack' && (s.cost || 0) <= (foe.energy || 0)).map(s => expDamage(foe, u, s)));
}
const hpPart = (d, hp) => 2.5 * Math.min(1.2, d / Math.max(1, hp)) + (d >= hp * 0.95 ? 2.5 : 0);   // 공격 점수의 피해 몫 = 2.5 × 상대 남은 체력 몫 + 끝내기
// 회복 점수 = 공격과 같은 잣대(2.5 × 되찾는 체력 ÷ 지금 체력)를 조금 덜(판을 끝내 주지 않음) — 빈 체력보다 더 차는 몫은 안 셈
const healScore = (u, pct) => 2.5 * 0.8 * Math.min(pct, Math.max(0, 1 - u.hp / u.max)) * u.max / Math.max(1, u.hp);

// ① 효과 값
const defGain = (foe, k) => { const D = Math.max(0, (foe.def || 0) * defK(foe)); return (100 + D) / (100 + D * (1 - k)) - 1; };   // 상대 방어가 k만큼 내려가면 내 피해가 몇 몫 느나(받는 몫 = 100 ÷ (100 + 방어))
const USE = new WeakMap();
function useOf(u) {   // 내 손패가 받아 쓰는 연계: 독 겹 소모 · 얼음 깨기 · 감전 · 빙결 · 강풍 공명 · 상태 종류 청산 · 변이 기술
  const kit = u.kit || [];
  let k = USE.get(kit); if (k) return k;
  k = { poison: kit.some(s => s.consume && s.consume.id === 'poison'), frozen: kit.some(s => s.bonusIf && s.bonusIf.id === 'frozen'), shock: kit.some(s => givesFx(s, 'shock')), chill: kit.some(s => givesFx(s, 'chill')), gale: !!(SPECIES[u.key] || {}).reso || kit.some(s => s.galeAdd), mut: kit.some(s => s.tier === 'm') };
  USE.set(kit, k);
  return k;
}
function fxVal(u, foe, f, C) {
  const D = FX[f.id];
  if (!D || !foe || foe.hp <= 0) return 0;
  if ((D.el && D.el === foe.el) || (D.jong && D.jong === foe.jong)) return 0;   // 같은 속성 · 버섯 포자 = 안 걸림
  const H = C.H, R = C.R, thr = Math.min(1.2, C.risk), life = foe.max / Math.max(1, foe.hp), T = n => Math.max(0, Math.min(n, H)), K = C.useK, n = f.n || 1;
  const deny = 2.5 * thr * 0.7 + 0.25 * R;   // 상대 행동 한 번을 막음(그 피해를 안 받고 한 턴을 범)
  const cur = id => (foe.eff && foe.eff[id] && foe.eff[id].n) || 0;
  let v;
  switch (f.id) {
    case 'burn': v = has(foe, 'burn') ? 0.3 * 2.5 * D.dot * life : 2.5 * D.dot * T(f.turns || D.turns) * life; break;
    case 'poison': { const add = Math.max(0, Math.min(D.stack, cur('poison') + n) - cur('poison')); v = 2.5 * D.dot * add * T(4) * life * (1 + ((u.pas && u.pas.poisonDmg) || 0)) + (K.poison ? 0.12 * R * add : 0); break; }   // 맹독 농축 = 내가 건 독 피해 +50%
    case 'bleed': v = 2.5 * D.dot * T(f.turns || D.turns) * life + 0.08 * R; break;
    case 'shock': v = (has(foe, 'shock') ? 0.3 : 1) * 2.5 * D.dot * T(D.turns) * life + (has(foe, 'wet') ? D.wetP : D.p) * deny * Math.min(1.5, T(D.turns) * 0.5); break;
    case 'chill': { const m = n + (has(foe, 'wet') ? RULES_FX.wetStackAdd : 0); v = cur('chill') + m >= D.stack ? 0.9 * deny + (K.frozen ? 0.6 * R : 0) : 0.4 * deny * m / D.stack + 0.05 * R; break; }   // 3겹 = 얼음(한 번 쉼)
    case 'stun': v = deny; break;
    case 'seal': v = 0.25 * R; break;
    case 'taunt': v = 0.08 * R; break;
    case 'root': v = u.solo ? 0.25 * R : 0.06 * R; break;   // 1:1에선 봉인으로
    case 'wet': v = has(foe, 'wet') ? 0.05 * R : R * defGain(foe, 1 - D.defK) * T(D.turns) + 2.5 * thr * D.missAdd / 100 * T(D.turns) * 0.5 + (K.shock || K.chill ? 0.15 * R : 0); break;
    case 'gale': v = has(foe, 'gale') ? 0.05 * R : 2.5 * thr * D.missAdd / 100 * T(f.turns || D.turns) * 0.6 + (K.gale ? 0.35 * R : 0); break;
    case 'spore': v = n * (H >= 2 ? 2.5 * sporeDmg(foe, D.power, (u.atk || 10) * atkK(u), u.el) / Math.max(1, foe.hp) : 0.1 * R); break;   // 하나 = 붙인 턴 포함 3번째 턴 끝 위력 35
    case 'atkDown': v = 2.5 * thr * Math.min(0.8, D.v * n) * T(D.turns) * 0.5; break;   // n 겹(맛평가 · 능력치 바닥 0.2 — 0.8까지)
    case 'defDown': v = R * defGain(foe, Math.min(0.8, D.v * n)) * T(D.turns - 1); break;
    case 'spdDown': v = 0.05 * R * T(D.turns); break;
    case 'accDown': v = 2.5 * thr * D.v / 100 * T(D.turns) * 0.6; break;
    case 'critDown': v = 2.5 * thr * D.v / 200 * T(D.turns) * 0.6; break;
    case 'leech': v = 2.5 * D.drain * T(D.turns) * (life + 0.5 * u.max / Math.max(1, u.hp)); break;
    case 'dark': v = 0.2 * R * (f.turns || D.turns); break;
    default: v = 0.1 * R;
  }
  return Math.max(0, v) * (f.p ?? 1);
}
// 이 기술이 상대에게 거는 효과(덤 · 여럿 · 타마다 · 치명마다 · 피해 없이)
function fxList(u, s) {
  const L = [];
  if (s.inflict) L.push(s.inflict);
  for (const f of s.inflicts || []) L.push(f);
  if (s.perHitInflict) L.push({ ...s.perHitInflict, n: (s.perHitInflict.n || 1) * (s.strikes ? s.strikes.length : s.hits || 1) });
  if (s.critInflict) L.push({ ...s.critInflict, p: Math.min(1, ((u.crit || 5) + (s.critPlus || 0)) / 100 * (s.hits || 1)) });
  if (s.act === 'hex') for (const h of s.hex || []) L.push(h);
  return L;
}
const fxSum = (u, foe, s, C) => fxList(u, s).reduce((t, f) => t + fxVal(u, foe, f, C), 0);

// ② 방어태세 · 회피 자세(받는 몫 = 100 ÷ (100 + 방어) — 방어태세는 방어 ×4 · 같은 자세를 잇달아 쓰면 더하는 몫 절반 · 회피 자세는 내 기동 ÷ 상대 기동만큼)
const guardRed = (u, s, rep) => { const D = Math.max(1, (u.def || 0) * defK(u)); return 1 - (100 + D) / (100 + D * guardDefMult(s, rep)); };
const evadeRed = (u, foe, s, rep) => { const sh = s.shift || { miss: 15, graze: 10 }; return Math.min(0.6, (sh.miss + 0.5 * sh.graze) / 100 * evadeK(u, foe) * (rep ? RULES.repeatStanceK : 1)); };
function stanceRed(u, foe, s, last) {
  if (s.act === 'guard' || s.guardWith) return guardRed(u, s, last === 'guard');
  if (s.act === 'evade' || s.evadeWith) return evadeRed(u, foe, s, last === 'evade');
  return 0;
}
function stanceVal(u, foe, s, C, k = 1) {
  const red = stanceRed(u, foe, s, C.last), take = Math.min(1.2, C.risk) * u.hp;
  const live = C.risk >= 1 && take * (1 - red) < u.hp ? (s.act === 'evade' || s.evadeWith ? 0.6 : 1.2) : 0;   // 막으면 이번 턴을 버팀(회피는 확률이라 덜)
  return k * (2.5 * 0.85 * take * red / Math.max(1, u.hp) + live);
}
// 나에게 거는 버프 값(공격 덤 · 버프 기술 · 자세 덤 같은 잣대)
function buffVal(u, foe, sides, C, down = 0, nOf = () => 1) {   // nOf = 그 버프를 몇 겹 거나(알 깨기 selfN)
  const R = C.R, H = C.H, rk = Math.min(1.2, C.risk), after = n => Math.max(0, Math.min(n, H - 1));
  let v = 0;
  for (const b of sides) {
    const stack = FX[b] && FX[b].stat, again = has(u, b);
    if (again && !stack) continue;
    const k = again ? 0.35 : 1;
    if (b === 'shield' || b === 'armor') v += 2.5 * Math.min(0.15 * u.max, C.risk * u.hp) / Math.max(1, u.hp) * k;   // 막는 것 = 위협만큼(보호막 15%)
    else if (b === 'defUp') v += 2.5 * rk * 0.3 * Math.min(4, H) * 0.5 * k;
    else if (b === 'stealth') v += 2.5 * rk * 0.95 + 0.4 * R;   // 은신 = 이번 턴 피하고 다음 공격 기습
    else if (b === 'regen') v += healScore(u, 0.15);
    else if (b === 'spdUp') v += (u.spd < foe.spd ? 0.6 : 0.05) * R * k;   // 가속 = 내가 느릴 때(먼저 움직이게)
    else if (b === 'atkUp') v += R * FX.atkUp.v * nOf(b) * after(5) * k;
    else if (b === 'critUp') v += R * FX.critUp.v / 200 * after(5) * k;   // 예리 = 치명 칸 +10(치명 ×1.5)
    else if (b === 'aim') v += R * 0.35;
    else if (b === 'flourish') v += R * 0.05 * after(5) * 2 + 2.5 * rk * 0.05;
    else if (b === 'purify') v += 0.2 * R * HARM_IDS.filter(x => has(u, x)).length;
    else v += 0.3 * R * k;
  }
  return Math.max(0.03, v - 0.15 * R * down);
}
// 공격 점수 = 2.5 × (기대 피해 ÷ 상대 남은 체력) + 끝내기 · 거는 효과 값 · 흡수 회복 · 덤 버프 · 은신엔 광역. 메아리(아침 · 밤)면 그만큼 더 맞힘
function atkScore(u, foe, s, C, d0 = null) {
  const a = peekAct(u, s, foe), d = (d0 ?? expDamage(u, foe, s)) * (1 + echoK(u, 0));
  const awake = s.sumVolley ? (u.summons || []).filter(x => x.hp > 0 && x.stage !== 'sleep').length : 0;   // 엠버캡 집중 포화 = 깨어난 소환수도 함께 침
  const heal = s.critHeal ? healScore(u, s.critHeal * (s.hits || 1) * Math.min(0.5, ((u.crit || 0) + (s.critPlus || 0)) / 100)) : 0;   // 싹둑마마 피의 축제 = 치명마다 회복
  if (s.execute && foe.hp > 0 && foe.hp < foe.max * s.execute) return 5;   // 처형의 춤 = 기준 아래면 처형(sureExec면 빗나가도)
  const fx = BRAIN.fx ? BRAIN.fxK * fxSum(u, foe, a, C) * landChance(u, foe, a) : newFx(a, foe) ? 0.5 * foe.hp / foe.max : 0;
  const drain = BRAIN.drain && a.drain ? healScore(u, d * a.drain / Math.max(1, u.max)) : 0;   // 흡수(준 피해의 몇 몫을 회복)
  const self = a.self ? (BRAIN.fx ? BRAIN.selfK * buffVal(u, foe, [a.self, a.also].filter(Boolean), C) : 0.25) : 0;
  return hpPart(d, foe.hp) + fx + (a.area && has(foe, 'stealth') ? 1 : 0) + self + 0.2 * awake + heal + drain;
}
// 보조 기술 점수(2026-10-29 사용자 '봇부터 고치고' — 성체 개성 기술 전부 손패에서 드라코프루트 = 냉기 응축만 80% · 젤리캡 = 말랑잉 · 너꺼잉 93% ·
//  페탈로즈 = 기합 · 불타는 의지 57% · 프로스트벨 아침 31%): 전엔 고정값(0.5~1)이라 공격 점수(보통 0.3 안팎)를 늘 이겨 보조만 되풀이했다.
//  이제 '지금 가장 좋은 공격의 피해 몫 R'과 '상대를 끝낼 때까지 남은 턴 H'로 값을 매김 — 공격을 n턴 x만큼 세게 = R × x × (H − 1 과 n 중 작은 쪽), 막기 = 위협 × 줄이는 몫.
function aiScore(u, foe, s, C) {
  if (s.act === 'attack') return (C.A0 && C.A0.has(s) ? C.A0.get(s) : atkScore(u, foe, s, C)) + (s.guardWith || s.evadeWith ? stanceVal(u, foe, s, C, 0.8) : 0);   // 검방술 = 공격 + 막기 · 피하기
  const R = C.R, H = C.H, risk = C.risk, after = n => Math.max(0, Math.min(n, H - 1)), rk = Math.min(1.2, risk);
  if (s.act === 'guard' || s.act === 'evade') {   // 자세 + 덤(용가시 반사 · 치명적 무희 예리)
    if (!BRAIN.stance) { const rep = C.last === s.act ? 0.5 : 1; return (s.act === 'guard' ? (risk >= 1 ? 2.2 : 1.4 * risk) : (risk >= 1 ? 1.8 : 1.1 * risk)) * rep; }   // 옛 고정값
    let v = stanceVal(u, foe, s, C);
    if (s.reflect) v += 2.5 * rk * (s.reflectK ?? FX.reflect.k) * 0.5 * u.hp / Math.max(1, foe.hp) * 0.6 + (s.reflectInflict ? 0.5 * fxVal(u, foe, s.reflectInflict, C) : 0);   // 막고 반사(용가시 · 말랑잉 = 기술마다 되돌리는 몫)
    if (s.self) v += buffVal(u, foe, [s.self], C);
    return v;
  }
  if (s.act === 'hex') {   // 피해 없이 거는 기술(종 고유 v2): 거는 효과 값 · 공명(강풍에 덧붙임)은 쓸 수 있을 때 높게
    if (s.galeAdd || s.caveAdd) return 1.0;
    if (s.settle) { const k = HARM_IDS.filter(x => has(foe, x)).length; return k ? 0.3 + 0.45 * Math.min(5, k) : 0.02; }   // 청산 = 상대 상태이상 종류가 많을 때
    if (s.cycle) { const up = z => STAT_UPS.filter(x => has(z, x)).length, bad = z => HARM_IDS.filter(x => has(z, x)).length + STAT_DOWNS.filter(x => has(z, x)).length, v = up(foe) + bad(u) - up(u) - bad(foe); return v > 0 ? R * (0.4 + 0.3 * v) : 0.03; }   // 윤회 = 지우면 내가 이득일 때
    if (s.harmony) return 0.2 * R;
    if (s.harvest) { const n = (foe.eff && foe.eff.spore && foe.eff.spore.n) || 0; return n ? healScore(u, s.harvest.per * n) + 0.15 * n + (u.mode === 'rage' ? 0.2 * R : 0.25) : 0.1; }   // 엠버캡 포자수확 = 상대에게 포자가 많고 내가 다쳤을 때
    if (s.miasma) return R * (0.6 + 0.2 * after(3));   // 독안개(켜져 있으면 canUse 가 막음) = 세 턴 독
    if (s.burst) return 0.25 + 0.2 * ((u.summons || []).filter(x => x.hp > 0).length);
    if (s.inferno) {   // 지옥전개 = 상대가 화상이 아니면 3턴 화상 피해 + 지옥의 여왕(블레이드바인)이면 그동안 기동 · 치명
      const dot = has(foe, 'burn') ? 0 : 2.5 * FX.burn.dot * Math.min(3, H + 1) * foe.max / Math.max(1, foe.hp), q = (SPECIES[u.key] || {}).queen;
      return 0.1 + dot + (q ? R * 0.3 * after(3) : 0);
    }
    if (s.taste) { const n = (u.st && u.st.meal && u.st.meal.n) || 0, tz = s.taste; return [['atkDown', 1, tz.atk || 1], ['defDown', 2, tz.def || 1], ['seal', 3, 1]].reduce((t, [id, at, c]) => t + (n >= at ? fxVal(u, foe, { id, n: c }, C) : 0), 0.02); }   // 맛평가 = 먹은 준비 수만큼 쇠약 · 시듦 · 봉인(쇠약 · 시듦 겹 수)
    if (!BRAIN.fx) { const fresh = (s.hex || []).filter(h => !has(foe, h.id)).length; return fresh ? 0.55 + 0.35 * fresh : 0.15; }   // 옛 값
    return BRAIN.fxK * fxSum(u, foe, s, C) + (s.formBoost && C.useK.mut ? 0.25 * R : 0) + 0.02;   // 입맛 다시기 = 이번 · 다음 턴 내 변이 기술 +20%
  }
  if (s.act === 'sun') { if (C.look && !BRAIN.sunOld) return 0.05; const need = Math.max(0, ...u.kit.map(k => k.cost || 0)); return (u.energy || 0) < need && risk < 0.5 ? 1 + 0.2 * (need - (u.energy || 0)) : 0.08; }   // 내다보기가 켜져 있으면 광합성 값은 다음 턴에 쓸 수 있게 되는 기술로 셈
  if (s.toggle) { const on = u.mode === s.toggle; return on ? (u.hp < u.max * 0.4 ? 0.6 : 0.03) : (u.hp > u.max * 0.55 ? 0.45 * R + 0.15 : 0.04); }   // 엠버캡 포악 ↔ 온순 = 체력이 넉넉하면 포악(포자가 피면 활력) · 위태로우면 온순(회복)
  if (s.dragonTry) { const n = (u.res && u.res.dragon) || 0, p = s.dragonTry[Math.min(s.dragonTry.length - 1, n)] || 0; return p >= 0.45 ? R * (0.4 + 1.4 * p) : 0.03; }   // 드라코프루트 용의 자격 = 확률이 높을 때만
  if (s.heartArmor) { const n = (u.res && u.res.heart) || 0, cur = (u.eff && u.eff.armor && u.eff.armor.hp) || 0; return cur >= u.max * 0.45 ? 0.03 : 2.5 * Math.min((s.heartArmor.base + s.heartArmor.per * n) * u.max, Math.max(0.15, rk) * u.hp) / Math.max(1, u.hp) * 0.8 + 0.05; }   // 드레이크캑터 용갑 강화 = 스택이 많을수록 · 갑주가 가득이면 안 씀
  if (s.heartCleanse) { const n = (u.res && u.res.heart) || 0, bad = [...HARM_IDS, ...STAT_DOWNS].filter(k => has(u, k)).length; return n && bad ? 0.3 * R * Math.min(n, bad) + 0.15 : 0.02; }   // 드레이크캑터 몸 태우기 = 나쁜 효과가 있고 스택이 있을 때
  if (s.orbGuard) return u.orb && u.orb.n ? (risk >= 1 ? 1.7 : 1.1 * risk) : 0;   // 볼트바인 구슬 기술
  if (s.orbRefill) { const o = u.orb; return o && o.max - o.trap - o.n >= 2 ? R * 1.1 : 0.05; }
  if (s.orbTrap) return u.orb && u.orb.n >= 2 ? R * (0.6 + 0.6 * Math.min(1, risk)) : 0.05;
  if (s.orbAbsorb) { const o = u.orb; return o && o.n ? healScore(u, 0.06 * o.n) : 0; }
  if (s.summon || s.volley || s.grow) { const L = (u.summons || []).filter(x => x.hp > 0), aw = L.filter(x => x.stage !== 'sleep').length; return s.summon ? 1.1 - 0.25 * L.length : s.volley ? 0.45 * aw : 0.3 + 0.3 * L.filter(x => x.stage === 'baby').length; }   // 소환수(스포어캡)
  if (s.moss) { const n = ((foe.eff && foe.eff.cave && foe.eff.cave.add) || []).length; return n && u.hp < u.max * 0.75 ? 0.4 + 0.35 * n : 0.05; }   // 이끼덮기 = 설치물이 있고 다쳤을 때
  if (s.bell) {   // 프로스트벨 아침 · 밤 = 켜는 턴을 쓰고 남은 턴(최대 3)에 메아리 몫만큼 더 · 아침 중 빙결 공격이 있으면 깨기 짝(빙결 한 겹 더) · 밤은 상대 햇빛도 막음
    const k = ((SPECIES[u.key] || {}).bell || {})[s.bell] || 0.25, ice = u.kit.some(x => x.act === 'attack' && (x.inflict || {}).id === 'chill');
    return R * (k * after(3) + (ice ? 0.35 : 0) + (s.bell === 'night' ? 0.15 * Math.min(3, foe.energy || 0) / 3 : 0));
  }
  if (s.trapSet) { const n = (u.eff && u.eff.thornTrap && u.eff.thornTrap.n) || 0; return n < s.trapSet.max ? R * (1 - 0.3 * n) : 0.02; }   // 덫 설치(쏜위드)
  if (s.fakeDeath) return risk >= 1 ? 1.5 : risk >= 0.6 ? 0.4 : 0.03;   // 죽은 줄 알았나? = 이번 턴 쓰러질 만할 때
  if (s.cleanseHeal) { const bad = HARM_IDS.filter(k => has(u, k)).length; return healScore(u, s.cleanseHeal.base + s.cleanseHeal.per * bad) + 0.15 * R * bad; }   // 치유의 물 = 다쳤거나 상태이상이 있을 때
  if (s.healPct) { const bad = HARM_IDS.filter(k => has(u, k)).length; return healScore(u, s.healPct) + 0.15 * R * bad; }   // 바로 회복 + 정화(청아함의 물결)
  if (s.fruitCondense) {   // 냉기 응축(드라코프루트) = 열매 하나(방어 +20% · 햇빛 칸 하나를 얼림) — 많을수록 덜 · 열매로 쓰는 기술이 있으면 조금 더
    const fn = (u.eff && u.eff.fruit && u.eff.fruit.n) || 0, use = u.kit.some(x => x.fruitUse && x.fruitUse !== 'eat');
    return (2.5 * rk * 0.15 * Math.min(4, H) + (use ? 0.5 * R : 0)) / (1 + 0.7 * fn);
  }
  if (s.fruitUse === 'eat') { const fn = (u.eff && u.eff.fruit && u.eff.fruit.n) || 0; return fn ? healScore(u, FRUIT.eat * fn) : 0; }   // 열매 먹기
  if (s.revive) return u.eff && u.eff.revive ? 0.02 : risk >= 0.8 ? 1.6 : risk >= 0.5 ? 0.6 : 0.05;   // 부활잉 = 쓰러질 만할 때 미리
  if (s.bounce) { const k = (C.seen || []).some(x => x && (x.inflict || x.inflicts)); return k ? R * (0.4 + 0.4 * Math.min(1, risk)) : 0.05; }   // 너꺼잉 = 상대가 효과 거는 기술을 쓴 적 있을 때
  if (s.inject) return u.st && u.st.hpBuff ? 0.05 : R * (0.2 * 3 * after(5) / 5 + 0.3) + healScore(u, 0.2) * 0.5;   // 좋은 거 주입 = 공격 · 방어 · 기동 + 최대 체력 5턴
  if (s.infuse) {   // 불타는 의지(페탈로즈) = 같은 꼬리표 기술 n번을 다른 속성으로 — 바뀐 속성이 이득일 때만
    const sw = u.kit.filter(x => x.act === 'attack' && x.tag === s.infuse.tag), gain = sw.length ? Math.max(...sw.map(x => expDamage(u, foe, { ...x, el: s.infuse.el }) - expDamage(u, foe, x))) : 0;
    return gain > 0 ? 2.5 * gain * Math.min(s.infuse.n, H - 1) / Math.max(1, foe.hp) : 0.03;
  }
  if (s.act === 'buff' && s.bare) return ((u.res && u.res.evs) || 0) >= 2 ? 0.5 + Math.min(1, risk) : 0.1;   // 방심하기 = 쌓아 둔 스택을 쓸 때
  if (s.act === 'buff') {
    const sides = [s.self, s.also].filter(Boolean), down = (s.selfMore || []).length;
    if (!sides.length && s.reflect) {   // 반사 자세 = 맞은 한 타의 몫을 되돌림 · 너꺼잉(완전 반사) = 그 타를 안 맞음(막기 값) + 100% 되돌림
      const dodge = s.nullFirst ? 2.5 * 0.85 * rk + (risk >= 1 ? 1.2 : 0) : 0;
      return (2.5 * rk * (s.reflectK ?? FX.reflect.k) * u.hp / Math.max(1, foe.hp) * 0.6 + dodge + (s.reflectInflict ? 0.3 * R : 0)) * (C.last === 'buff' ? 0.6 : 1);
    }
    return buffVal(u, foe, sides, C, down, b => (s.selfN && s.selfN[b]) || 1);
  }
  return 0.4 * R;
}
// ③ 먼저 · 나중 갈래: 선공 확률로 두 갈래 점수를 섞음(먼저 움직이는 기술 = 거의 먼저 · 나중 기술 = 거의 나중)
const firstP = (u, foe, s) => (s.early ? 0.92 : s.late ? 0.08 : initiativeChance(effSpd(u), effSpd(foe)));
function scoreOf(u, foe, s0, C) {
  const s = liveSkill(u, s0);   // 지금 모습으로 셈(드라코프루트가 용이면 용 쪽 기술) — 고르는 건 원래 카드
  if (!BRAIN.branch || (!s.onFirst && !s.onSecond)) return aiScore(u, foe, s, C);
  const p = firstP(u, foe, s);
  return p * aiScore(u, foe, s.onFirst ? { ...s, ...s.onFirst } : s, C) + (1 - p) * aiScore(u, foe, s.onSecond ? { ...s, ...s.onSecond } : s, C);
}
// ④ 다음 턴 내다보기 — 이번 수 뒤 내 모습 · 상대 모습을 어림으로 만들어(판 상태는 안 건드림) 다음 턴에 쓸 수 있는 가장 좋은 수의 점수(무게 = BRAIN.look)
const DEP_KEYS = [...DYN, 'taste', 'consume', 'settle', 'execute', 'harvest', 'heartArmor', 'heartCleanse', 'fruitCondense', 'dragonTry', 'trapSet', 'revive', 'bounce', 'cycle', 'moss', 'orbGuard', 'orbRefill', 'orbTrap', 'orbAbsorb', 'summon', 'volley', 'grow', 'burst', 'toggle', 'inferno', 'miasma', 'bell', 'healPct', 'cleanseHeal', 'inject', 'critHeal', 'sumVolley', 'onFirst', 'onSecond', 'guardWith', 'evadeWith'];
const DEP = new WeakMap();
const depOf = s => { let d = DEP.get(s); if (d == null) { d = s.act === 'sun' || s.act === 'guard' || s.act === 'evade' || ['regen', 'shield', 'armor', 'defUp'].includes(s.self) || DEP_KEYS.some(k => s[k]); DEP.set(s, d); } return d; };   // 내 개수 · 체력 · 햇빛이나 상대 상태를 읽는 기술 = 다음 턴 모습으로 다시 셈
const resNow = u => (u.res ? { ...u.res } : Object.fromEntries(Object.entries((SPECIES[u.key] || {}).res || {}).map(([k, v]) => [k, v[0]])));
const capNow = (u, k) => { if (u.resMax && u.resMax[k] != null) return u.resMax[k]; const m = (((SPECIES[u.key] || {}).res || {})[k] || [])[1]; return Array.isArray(m) ? m[Math.min(m.length - 1, STAGE_I[u.stage] ?? 2)] : m ?? 99; };
const STAGE_I = { sprout: 0, growing: 1, mature: 2 };
const healNow = (u, a) => Math.round(u.max * ((a.healPct || 0) + (a.cleanseHeal ? a.cleanseHeal.base + a.cleanseHeal.per * HARM_IDS.filter(k => has(u, k)).length : 0) + (a.self === 'regen' || a.also === 'regen' ? FX.regen.heal : 0)));
function afterMe(u, foe, s, C) {
  const a = s.ifRes && (resNow(u)[s.ifRes.k] || 0) >= s.ifRes.at ? { ...s, ...s.ifRes.then } : s;   // 깨물기 → 준비 3이면 한입
  const res = resNow(u), st = { ...(u.st || {}) }, eff = { ...(u.eff || {}) };
  delete eff.seal; delete eff.taunt; delete eff.skip;   // 이번 턴 막힘은 다음 턴엔 풀림(새로 걸릴 것은 모름)
  let spent = 0;
  if (a.spend) { spent = a.spend.all ? res[a.spend.k] || 0 : a.spend.n || 1; res[a.spend.k] = Math.max(0, (res[a.spend.k] || 0) - spent); }
  if (a.gain && a.gain.k) res[a.gain.k] = Math.min(capNow(u, a.gain.k), (res[a.gain.k] || 0) + (a.gain.n === 'spent' ? spent : a.gain.n || 1));
  const hk = (SPECIES[u.key] || {}).heart; if (hk) res[hk] = a.el === 'fire' ? 0 : Math.min(capNow(u, hk), (res[hk] || 0) + 1);   // 드레이크캑터 용의 심장 = 불 기술을 안 쓴 턴 끝마다 +1
  delete st.meal; if (a.mealMark) st.meal = { n: spent, ready: true };   // 식사시간 → 바로 다음 턴 맛평가
  if (a.fruitCondense) eff.fruit = { n: ((eff.fruit && eff.fruit.n) || 0) + 1 };
  if (a.fruitUse) delete eff.fruit;
  if (a.trapSet) eff.thornTrap = { ...(eff.thornTrap || { env: true }), n: Math.min(a.trapSet.max, ((eff.thornTrap && eff.thornTrap.n) || 0) + 1) };
  if (a.trapBoom) delete eff.thornTrap;
  for (const b of [a.self, a.also].filter(Boolean)) eff[b] = FX[b] && FX[b].stat ? { s: [...((eff[b] && eff[b].s) || []), { v: FX[b].v }] } : eff[b] || { v: 1 };
  const reg = noEnergy(u) ? 0 : u.sunPer || 1, energy = Math.min(u.energyMax || 8, Math.max(0, (u.energy || 0) - (a.cost || 0)) + (a.act === 'sun' ? a.gain || 2 : 0) + reg);
  const hp = Math.max(1, Math.min(u.max, u.hp - C.risk * u.hp * 0.7 * (1 - stanceRed(u, foe, a, C.last)) + healNow(u, a)));
  return { ...u, hp, energy, res, st, eff };
}
function afterFoe(u, foe, s, C) {
  const a = peekAct(u, s, foe), d = s.act === 'attack' ? (C.dmg.has(s) ? C.dmg.get(s) : expDamage(u, foe, s)) * (1 + echoK(u, 0)) : 0, eff = { ...(foe.eff || {}) };
  if (landChance(u, foe, a) >= 0.5) for (const f of fxList(u, a)) {
    const D = FX[f.id];
    if (!D || (D.el && D.el === foe.el) || (D.jong && D.jong === foe.jong)) continue;
    if (D.stack) {
      const n = Math.min(D.stack, ((eff[f.id] && eff[f.id].n) || 0) + (f.n || 1) + (f.id === 'chill' && has(foe, 'wet') ? RULES_FX.wetStackAdd : 0));
      if (f.id === 'chill' && n >= D.stack) { delete eff.chill; eff.frozen = { v: 1 }; } else eff[f.id] = { ...(eff[f.id] || {}), n };
    } else if (D.stat) eff[f.id] = { s: [...((eff[f.id] && eff[f.id].s) || []), { v: D.v }] };   // 능력치 겹 = 겹 목록(statSum)
    else if (!eff[f.id]) eff[f.id] = { v: 1 };
  }
  if (a.consume) delete eff[a.consume.id];
  return { ...foe, hp: Math.max(1, foe.hp - d), eff };
}
const statOf = (u, foe, t0, C) => { if (!C.stat.has(t0)) C.stat.set(t0, scoreOf(u, foe, t0, C)); return C.stat.get(t0); };
// 모아 둔 개수의 값(pot — 2026-11-04 팽트랩 식사시간을 준비 0 · 1에서 써 버려 맛평가를 못 씀): 개수 칸(준비 · 용의 심장 · 용 스택 · 스택) · 열매 · 덫을 쓰는 기술이
//  지금 개수로 쓸 때와 0개로 쓸 때의 점수 차이 = 쌓아 둔 몫. 이번 수가 개수를 늘리면 그만큼 더하고, 다 써 버리면 그만큼 뺌(쓰는 기술 자체 점수엔 이미 들어 있음)
function stocksOf(u) {
  const o = {};
  if (u.res) for (const [k, v] of Object.entries(u.res)) o['res:' + k] = v || 0;
  else for (const [k, v] of Object.entries((SPECIES[u.key] || {}).res || {})) o['res:' + k] = v[0] || 0;
  if ((SPECIES[u.key] || {}).fruits) o.fruit = (u.eff && u.eff.fruit && u.eff.fruit.n) || 0;
  if (u.kit.some(s => s.trapBoom)) o.trap = (u.eff && u.eff.thornTrap && u.eff.thornTrap.n) || 0;
  return o;
}
const withStock = (u, key, n) => key.startsWith('res:') ? { ...u, res: { ...resNow(u), [key.slice(4)]: n } } : key === 'fruit' ? { ...u, eff: { ...(u.eff || {}), fruit: n ? { n } : undefined } } : { ...u, eff: { ...(u.eff || {}), thornTrap: n ? { env: true, n } : undefined } };
const PAY = new WeakMap();
function payoffsOf(u, key) {   // 그 개수를 쓰거나 읽는 기술
  let m = PAY.get(u.kit); if (!m) PAY.set(u.kit, m = {});
  if (m[key]) return m[key];
  const k = key.slice(4), hk = (SPECIES[u.key] || {}).heart;
  return (m[key] = u.kit.filter(s => key === 'fruit' ? s.fruitUse : key === 'trap' ? s.trapBoom : (s.spend && s.spend.k === k) || (s.scale && s.scale.k === k) || (s.ifRes && s.ifRes.k === k) || [s.powTbl, s.critBy, s.accBy, s.spdBy].some(x => x && x.k === k) || (s.bare && k === 'evs') || (s.dragonTry && k === 'dragon') || ((s.heartArmor || s.heartCleanse) && k === hk)));
}
function potOf(u, foe, key, n, C) {
  if (!n) return 0;
  const memo = C.potMemo || (C.potMemo = {}), id = key + ':' + n;
  if (memo[id] != null) return memo[id];
  let best = 0;
  for (const p of payoffsOf(u, key)) { const v = scoreOf(withStock(u, key, n), foe, p, C) - scoreOf(withStock(u, key, 0), foe, p, C); if (v > best) best = v; }
  return (memo[id] = best);
}
function potGain(u, foe, u2, C) {
  const a = stocksOf(u), b = stocksOf(u2);
  let g = 0;
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) if ((b[key] || 0) > (a[key] || 0) && payoffsOf(u, key).length) g += potOf(u, foe, key, b[key] || 0, C) - potOf(u, foe, key, a[key] || 0, C);   // 늘릴 때만 더함(다 쓰는 쪽은 그 기술 점수에 이미 들어 있음 — 가득 찬 뒤 쓰는 것을 막지 않게)
  return g;
}
// 그 뒤 두 턴(deep): 지금 모습의 점수로 햇빛만 따져 가장 좋은 차례 — 광합성으로 모아 큰 기술을 쓰는 길도 봄(V[h][e] = h턴 동안 햇빛 e로 얻는 점수)
function deepTable(u, foe, C) {
  const g = BRAIN.deep, reg = noEnergy(u) ? 0 : u.sunPer || 1, top = u.energyMax || 8, kit = u.kit.filter(t => !t.uses || usesLeft(u, t) > 0);
  let V = Array.from({ length: top + 1 }, () => 0);
  for (let h = 0; h < 2; h++) {
    const W = V.map((_, e) => {
      let best = 0;
      for (const t of kit) { if ((t.cost || 0) > e) continue; const e2 = Math.min(top, e - (t.cost || 0) + (t.act === 'sun' ? t.gain || 2 : 0) + reg), v = (t.act === 'sun' ? 0 : Math.max(0, statOf(u, foe, t, C))) + g * V[Math.floor(e2)]; if (v > best) best = v; }
      return best;
    });
    V = W;
  }
  return e => V[Math.max(0, Math.min(top, Math.floor(e)))];
}
function nextBest(u, foe, s0, C) {
  const s = liveSkill(u, s0), u2 = afterMe(u, foe, s, C), f2 = afterFoe(u, foe, s, C);
  const C2 = { ...C, risk: C.risk * u.hp / Math.max(1, u2.hp), last: s.act, A0: null };
  const reg = noEnergy(u) ? 0 : u.sunPer || 1, top = u.energyMax || 8;
  let best = 0;
  for (const t0 of u.kit) {
    if (t0 === s0 && s0.uses && usesLeft(u, s0) <= 1) continue;   // 이번에 마지막 횟수
    const t = liveSkill(u2, t0);
    if (!canUse(u2, t, u2.energy, f2)) continue;
    let v;
    if (depOf(t) || t !== liveSkill(u, t0)) v = scoreOf(u2, f2, t0, C2);
    else {
      v = statOf(u, foe, t0, C);
      if (t.act === 'attack') { if (!C.dmg.has(t)) C.dmg.set(t, expDamage(u, foe, t)); const d = C.dmg.get(t) * (1 + echoK(u, 0)); v += hpPart(d, f2.hp) - hpPart(d, foe.hp); }   // 상대가 덜 남으면 끝내기 쉬움
    }
    if (C.deep) v += BRAIN.deep * C.deep(Math.min(top, Math.max(0, u2.energy - (t.cost || 0)) + (t.act === 'sun' ? t.gain || 2 : 0) + reg));
    if (v > best) best = v;
  }
  return BRAIN.look * best + (BRAIN.pot ? BRAIN.pot * potGain(u, foe, u2, C) : 0);
}
function brainCtx(u, foe, ok, ctx) {
  const seen = ctx.seen || [], risk = threatOf(foe, u, seen) / Math.max(1, u.hp);
  const lv = ok.map(s => liveSkill(u, s)), atk = lv.filter(s => s.act === 'attack'), dm = atk.map(s => expDamage(u, foe, s));
  const D = atk.length ? Math.max(...dm) : 0;
  const C = { risk, last: ctx.last, seen, R: Math.max(0.25, 2.5 * Math.min(1.2, D / Math.max(1, foe.hp))), H: D > 0 ? Math.max(1, Math.min(6, foe.hp / D)) : 4, useK: useOf(u), look: ctx.look !== false && BRAIN.look > 0, stat: new Map(), dmg: new Map(atk.map((s, i) => [s, dm[i]])) };   // R = 지금 가장 좋은 공격의 피해 몫 · H = 그 공격으로 끝낼 때까지 남은 턴
  C.A0 = new Map(atk.map((s, i) => [s, atkScore(u, foe, s, C, dm[i])]));
  if (!BRAIN.rDmg && C.A0.size) C.R = Math.max(0.25, ...C.A0.values());   // 옛 잣대 = 가장 좋은 공격 점수
  if (C.look && BRAIN.deep > 0) C.deep = deepTable(u, foe, C);
  return C;
}
// 종마다 쓰는 패턴(battle/playbook.js — 시뮬레이션으로 승률이 오른 것만): 조건이 맞으면 그 기술 점수에 b
const nOf = (o, id) => (o && o.eff && o.eff[id] && (o.eff[id].n || 1)) || 0;
export function ruleOk(w, u, foe) {
  switch (w.k) {
    case 'res': return ((u.res && u.res[w.r]) || 0) >= w.n;
    case 'meal': return !!(u.st && u.st.meal && u.st.meal.ready && u.st.meal.n >= w.n);
    case 'fxn': return nOf(foe, w.r) >= w.n;
    case 'fx': return w.r === 'frozen' ? !!(foe.eff && (foe.eff.frozen || (foe.eff.skip && foe.eff.skip.src === 'frozen'))) : has(foe, w.r);
    case 'nofx': return !has(foe, w.r);
    case 'harm': return HARM_IDS.filter(x => has(foe, x)).length >= w.n;
    case 'fruit': return nOf(u, 'fruit') >= w.n;
    case 'trap': return ((u.eff && u.eff.thornTrap && u.eff.thornTrap.n) || 0) >= w.n;
    case 'foelow': return foe.hp < foe.max * w.x;
    case 'melow': return u.hp < u.max * w.x;
    case 'nobell': return !(u.st && u.st.bell);
    case 'sum': return ((u.summons || []).filter(x => x.hp > 0).length) < w.n;
    case 'foebig': return foe.kit.some(x => x.act === 'attack' && (x.power || 0) >= w.n && canUse(foe, x, foe.energy, u));   // 상대가 위력 n 넘는 공격을 쓸 햇빛이 있음(반사 자세 — 2026-11-05)
    case 'always': return true;
    default: return false;
  }
}
// 생장마다 따로(2026-11-05 사용자 '봇의 성향도 생장에 따라 나눠') = 봇 식물 단계의 칸 · 아직 안 잰 단계는 성체 칸
export const bookOf = u => { const i = STAGE_KEY.indexOf(u && u.stage); return PLAYBOOK_BY[i < 0 ? 2 : i] || PLAYBOOK_BY[2] || {}; };
export const playBonus = (u, foe, s, book = bookOf(u)) => { const L = book[u.key]; if (!L) return 0; let b = 0; for (const r of L) if (r.id === s.id && ruleOk(r.when, u, foe)) b += r.b; return b; };
// 점수 들여다보기(시험 · 도구용 — tools/test/botsys.mjs): 쓸 수 있는 기술마다 지금 점수 · 다음 턴 몫
export function aiScores(u, foe, ctx = {}) {
  const ok = u.kit.filter(s => canUse(u, s, u.energy, foe)), C = brainCtx(u, foe, ok, ctx);
  return ok.map(s => ({ id: s.id, name: s.name, now: scoreOf(u, foe, s, C), next: C.look ? nextBest(u, foe, s, C) : 0 }));
}
export function aiPick(u, foe, rng, ctx = {}) {
  const ok = u.kit.filter(s => canUse(u, s, u.energy, foe));
  if (!ok.length) return BLOCKED;
  const iq = ctx.iq ?? u.ai ?? 0.5, C = brainCtx(u, foe, ok, ctx);
  const pk = Math.max(0, Math.min(1, (iq - 0.3) / 0.6));   // 종마다 패턴은 머리 좋음만큼(브론즈 0.35 = 거의 안 씀 · 풀로세움 0.95 = 다) — 낮은 단계 봇은 서툴게
  const sc = ok.map(s => scoreOf(u, foe, s, C) + (C.look ? nextBest(u, foe, s, C) : 0) + pk * playBonus(u, foe, s, ctx.book || bookOf(u)));
  const top = Math.max(...sc), temp = 0.15 + (1 - iq) * 0.85;
  const w = sc.map(v => Math.exp((v - top) / temp));
  let r = rng() * w.reduce((a, b) => a + b, 0), i = 0;
  for (; i < w.length - 1; i++) { r -= w[i]; if (r <= 0) break; }
  return ok[i];
}
// 판 기록에서: 사람이 이번 판에 쓴 기술(봇이 아는 것) · 봇이 지난 턴에 쓴 수
export const seenOf = B => B.log.map(t => t.mySkill).filter(s => s && s.act === 'attack');
export const lastOf = B => { const t = B.log[B.log.length - 1]; return t && t.foeSkill ? t.foeSkill.act : null; };
// 수 읽기 머리(2026-10-23 사용자 "실력자체를 올릴 수 없나?"): 봇이 쓸 수 있는 기술마다 지금 판을 복제해 n번 빠르게 끝까지(최대 12턴 — 넘으면 남은 체력 비율로)
//  해 보고 평균 결과가 가장 좋은 수를 고름. 사람 쪽은 지금까지 이 판에서 본 기술 + 기본기만 안다고 보고(사람과 같은 정보) 두 쪽 다 빠른 머리(aiPick)로 둠.
//  판의 난수(B.rng)는 건드리지 않고 턴 · 체력 · 햇빛으로 만든 씨앗만 써서 같은 판 · 같은 턴이면 늘 같은 답(서버가 판을 다시 세워도 같음)
const BASIC_IDS = new Set(BASICS.map(s => s.id));
export function searchPick(B, n) {
  const u = B.foe, ok = u.kit.filter(s => canUse(u, s, u.energy, B.me));
  if (!ok.length) return BLOCKED;
  if (ok.length === 1) return ok[0];
  const known = new Set([...BASIC_IDS, ...B.log.map(t => t.mySkill && t.mySkill.id).filter(Boolean)]);
  const seed0 = (B.turn * 7919 + Math.round(B.me.hp) * 131 + Math.round(B.foe.hp) * 31 + (B.me.energy | 0) * 7 + (B.foe.energy | 0)) >>> 0;
  let best = ok[0], bestV = -1;
  ok.forEach((cand, ci) => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const C = structuredClone({ me: B.me, foe: B.foe, turn: B.turn, over: null, log: [], field: B.field || {} });
      const mine = C.me.kit.filter(s => known.has(s.id)); if (mine.length) C.me.kit = mine;
      C.rng = makeRng(seed0 + ci * 1009 + i * 97 + 1);
      const r = C.rng;
      playTurnVs(C, aiPick(C.me, C.foe, r, { iq: 0.7, look: false }), cand);
      for (let d = 0; d < 12 && !C.over; d++) playTurnVs(C, aiPick(C.me, C.foe, r, { iq: 0.7, look: false }), aiPick(C.foe, C.me, r, { iq: 0.8, look: false }));
      sum += C.over === 'lose' ? 1 : C.over === 'win' ? 0 : 0.5 + 0.5 * (C.foe.hp / C.foe.max - C.me.hp / C.me.max);   // 'lose' = 사람이 짐 = 봇이 이김
    }
    if (sum / n > bestV) { bestV = sum / n; best = cand; }
  });
  return best;
}

// 판 차리기: 씨앗 하나로 난수 고정(결정론 — 같은 씨앗·같은 선택이면 같은 결과)
export function makeBattle({ me, foe, seed = 20261015 }) {
  me.solo = foe.solo = true; me.slot = 'me'; foe.slot = 'foe';
  caveSync(me, foe, []); orbInit(me, 1); orbInit(foe, 1);   // 스톤캡 동굴 · 볼트바인 구슬은 처음부터 보이게   // 1:1 표시(속박 → 봉인) · 유닛 이름표(기생을 건 식물 찾기)
  return { me, foe, rng: makeRng(seed), turn: 1, over: null, log: [] };
}
// 턴 끝 공통(1:1·3:3): 화상·독·기생 씨앗 → 에너지 +1(그늘이면 안 참, gain 으로 넘김) → 정한 턴이 지난 효과 사라짐
//  pair = [선공, 후공](턴 끝 피해도 선공 쪽 먼저 — 늘 'me'가 먼저면 같이 쓰러질 때 한쪽만 늘 짐) · stop() 이 참이면 거기서 끝(판이 끝남)
//  bench = [{ u, idx }] 대기석 식물(3:3 — 엑셀 v10 '대기 중에도 피해 · 회복 · 포자 발동 · 시간 진행': 사건에 bench · idx) · all = 판의 모든 유닛(기생을 건 식물 찾기)
export function closeTurn(pair, turn, ev, gain, stop = () => false, bench = [], all = []) {
  const [a, b] = pair, every = all.length ? all : pair;
  endTurn([[a, b], [b, a]], turn, ev, stop, every);
  if (stop()) return;
  for (const u of pair) summonTurn(u, turn, ev);
  for (const { u, idx } of bench) {
    if (stop()) break;
    const evB = []; endTurn([[u, null]], turn, evB, stop, every);
    for (const e of evB) { e.bench = true; e.idx = idx; }
    ev.push(...evB);
  }
  if (stop()) return;
  for (const u of pair) { if (u.hp <= 0) continue; if (noEnergy(u)) ev.push({ t: 'noEnergy', who: u.id, name: u.name, why: (u.eff.dark && u.eff.dark.look) || (u.eff.night ? 'night' : 'dark') }); else gain(u); }   // 밤(프로스트벨 필드)도
  for (const u of pair) expire(u, turn, ev);
  for (const { u, idx } of bench) { if (u.hp <= 0) continue; const evB = []; expire(u, turn, evB); for (const e of evB) { e.bench = true; e.idx = idx; } ev.push(...evB); }
}
// 한 턴: 내 기술 → 상대 고르기 → 에너지 쓰기 → rules.resolveTurn → 턴 끝 효과 → 사건 목록. 쉬는 차례면 고른 기술 대신 '쉬기'.
export function playTurn(B, mySkill) {
  const me = mustSkip(B.me) ? REST : canUse(B.me, mySkill, B.me.energy, B.foe) ? mySkill : firstOk(B.me);
  const foeSkill = mustSkip(B.foe) ? REST : B.foe.search > 0 ? searchPick(B, B.foe.search) : aiPick(B.foe, B.me, B.rng, { seen: seenOf(B), last: lastOf(B) });   // 수 읽기 봇(대회 — fight.js SEARCH)
  return playTurnVs(B, me, foeSkill);
}
// 두 쪽이 다 고른 한 턴(PvP — 서버가 두 사람 선택으로 풂, 봇 판도 이걸 씀). 기술은 id 또는 기술 객체
export function playTurnVs(B, mySkill, foeSkill) {
  const T = B.turn, pickOf = (u, s, f) => { if (s === 'rest' || s === REST) return REST; const k = typeof s === 'string' ? u.kit.find(x => x.id === s) : s; return mustSkip(u) ? REST : k && canUse(u, k, u.energy, f) ? k : firstOk(u); };   // 'rest' = 넘어감(시간 초과)
  const me = pickOf(B.me, mySkill, B.foe);
  foeSkill = pickOf(B.foe, foeSkill, B.me);
  const before = { me: B.me.hp, foe: B.foe.hp };
  payEnergy(B.me, me.cost || 0); payEnergy(B.foe, foeSkill.cost || 0);   // 기본 칸부터 · 모자라면 구슬(볼트바인)
  useCount(B.me, me); useCount(B.foe, foeSkill);   // 변이 기술 횟수
  B.me.curEl = me.el; B.foe.curEl = foeSkill.el;
  const res = resolveTurn(B.me, B.foe, me, foeSkill, B.rng, { elemMult: (u, d, a) => elemMult(u.curEl, d.el) * formMult(u, d, a), turn: T, field: B.field || (B.field = {}) });   // field = 경기장 효과(공통 장치)
  const events = res.events.filter(e => !(e.t === 'first' && (me.act === 'skip' || foeSkill.act === 'skip')));   // 한쪽이 쉬면 선공 판정은 보여 주지 않음
  for (const e of events) if (e.t === 'skip' && e.refund) B[e.who].energy += e.refund;   // 취소된 행동의 에너지 돌려줌
  // 누가 쓰러지면 그 자리에서 판이 끝남(턴 끝 피해 없음) · 같이 쓰러지는 일 없이 먼저 쓰러진 쪽이 짐(2026-10-16 — 전엔 둘 다 쓰러지면 늘 'me' 승리)
  const down = () => B.me.hp <= 0 || B.foe.hp <= 0;
  if (!down()) closeTurn(res.first === B.foe.id ? [B.foe, B.me] : [B.me, B.foe], T, events, u => { u.energy = Math.min(u.energyMax, u.energy + (u.sunPer || 1)); }, down);   // 턴 끝 햇빛(회복 강화 = 반칸씩 더)
  const fell = events.find(e => e.t === 'faint');
  if (fell) B.over = fell.who === B.foe.id ? 'win' : 'lose';
  const turn = { n: B.turn, mySkill: me, foeSkill, before, events, first: res.first };
  B.log.push(turn); B.turn++;
  return turn;
}
