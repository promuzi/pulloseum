// v2 전투 판 만들기 — 식물(종·스탯) → 전투 유닛, 기술 목록(기본기 셋 + 종 기술), 속성 상성, 상대 고르기.
// 계산은 rules.js(순수 함수·씨앗 난수 하나)에 맡기고 여기선 판을 차리고 한 턴을 돌린다. 화면 무관(헤드리스 시험 가능).
import { makeRng, resolveTurn, baseDamage, hitTable } from './rules.js';
import { formMult } from './matchup.js';
import { SKILLS as CAT_SKILLS, SPECIES_V2, uniquesOf } from '../game/catalog.js';
import { canUse, mustSkip, noEnergy, endTurn, expire, summonTurn, has, FX, useCount } from './status.js';

// 상성: WEAK[맞는 쪽 속성] = 그 속성이 약한 공격 속성(기획서 약점표 — 불←물·대지 / 물←풀·빙결·번개 / 풀←불·바람·번개 / 번개←대지·빙결 / 대지←풀·물 / 빙결←불·대지 / 바람←대지·불)
const WEAK = { fire: ['water', 'earth'], water: ['grass', 'ice', 'bolt'], grass: ['fire', 'wind', 'bolt'], bolt: ['earth', 'ice'], earth: ['grass', 'water'], ice: ['fire', 'earth'], wind: ['earth', 'fire'] };
export const elemMult = (atkEl, defEl) => (atkEl && (WEAK[defEl] || []).includes(atkEl) ? 1.5 : 1);
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
//  쌓는 수: 가벼운 기술 1 · 대표 기술 2(독·빙결·감전·포자). 어느 식물에 무엇을 붙일지는 시제품 — 기술 체계(공통·가지·개성)로 다시 짤 때 갈아엎음.
//  도발은 봇을 상대로는 거의 쓸모가 없어(봇이 자세를 드물게 씀) 위력을 깎지 않음 — 사람끼리 심리전용.
//  효과 짝(2026-10-15 사용자 "효과 짝표 좋아"): 디버프는 그 식물의 속성(불 화상 · 물 젖음 · 풀 독 · 대지 기절 · 바람 강풍 · 번개 감전 · 빙결 빙결)
//  또는 종(꽃 약화 · 덩굴 덩굴 · 선인장 도발 · 버섯 포자)에서만. 기생 씨앗 · 뿌리 묶기 · 그늘 · 부식은 변이·특수 기술용이라 여기엔 없음.
const SKILLS = {
  flower_grass: [{ id: 's1', name: '꽃잎 향기', power: 65, cost: 1, el: 'grass', ranged: true, inflict: { id: 'atkDown' } }, { id: 's2', name: '꽃잎 칼날', power: 115, cost: 3, el: 'grass' }],
  thorn: [{ id: 's1', name: '가시 채찍', power: 60, cost: 1, el: 'grass', inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '가시 덤불', power: 110, cost: 3, el: 'grass', inflict: { id: 'seal' } }],
  aqua: [{ id: 's1', name: '물방울', power: 60, cost: 1, el: 'water', ranged: true, inflict: { id: 'wet' } }, { id: 's2', name: '물방울 세례', power: 100, cost: 3, el: 'water', ranged: true, inflict: { id: 'wet' } }],
  flower_wind: [{ id: 's1', name: '꽃잎 바람', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '꽃잎 돌풍', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'atkDown' } }],
  spark: [{ id: 's1', name: '전기 불꽃', power: 60, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '낙뢰', power: 120, cost: 4, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 2 } }],
  vine_water: [{ id: 's1', name: '물살 새순', power: 65, cost: 1, el: 'water', inflict: { id: 'seal' } }, { id: 's2', name: '파도 덮치기', power: 105, cost: 3, el: 'water', area: true, inflict: { id: 'wet' } }],
  cactus_fire: [{ id: 's1', name: '불씨', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불덩이', power: 120, cost: 4, el: 'fire', ranged: true, inflict: { id: 'burn' } }],
  gaia: [{ id: 's1', name: '돌 주먹', power: 75, cost: 1, el: 'earth', inflict: { id: 'taunt' } }, { id: 's2', name: '대지 내려치기', power: 120, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  flower_fire: [{ id: 's1', name: '불꽃 꽃잎', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불꽃 만개', power: 105, cost: 3, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  cactus_wind: [{ id: 's1', name: '바람 고리', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '돌개바람', power: 110, cost: 3, el: 'wind', ranged: true, inflict: { id: 'taunt' } }],
  vine_wind: [{ id: 's1', name: '휘감는 바람', power: 65, cost: 1, el: 'wind', ranged: true, inflict: { id: 'seal' } }, { id: 's2', name: '칼바람', power: 105, cost: 3, el: 'wind', ranged: true, inflict: { id: 'gale' } }],
  spore_cap: [{ id: 's1', name: '포자', power: 50, cost: 1, el: 'grass', ranged: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '포자 구름', power: 90, cost: 3, el: 'grass', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  frost_bell: [{ id: 's1', name: '서리 종소리', power: 60, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙결의 종', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill', n: 2 } }],
  volt_vine: [{ id: 's1', name: '전깃줄 감기', power: 60, cost: 1, el: 'bolt', inflict: { id: 'seal' } }, { id: 's2', name: '고압 채찍', power: 120, cost: 4, el: 'bolt', inflict: { id: 'shock', n: 2 } }],
  stone_cap: [{ id: 's1', name: '돌가루 포자', power: 55, cost: 1, el: 'earth', ranged: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '갓 내려찍기', power: 120, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  jelly_cap: [{ id: 's1', name: '젤리 방울', power: 60, cost: 1, el: 'water', ranged: true, inflict: { id: 'wet' } }, { id: 's2', name: '해파리 비', power: 105, cost: 3, el: 'water', ranged: true, area: true, inflict: { id: 'wet' } }],
  fang_trap: [{ id: 's1', name: '덫 물기', power: 65, cost: 1, el: 'earth', inflict: { id: 'atkDown' } }, { id: 's2', name: '대지 집어삼키기', power: 105, cost: 4, el: 'earth', inflict: { id: 'stun' } }],
  blade_vine: [{ id: 's1', name: '불꽃 베기', power: 60, cost: 1, el: 'fire', inflict: { id: 'burn' } }, { id: 's2', name: '용광로 일섬', power: 105, cost: 3, el: 'fire', inflict: { id: 'burn' } }],
  toxi_cactus: [{ id: 's1', name: '독가시 쏘기', power: 55, cost: 1, el: 'grass', ranged: true, inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '맹독 터뜨리기', power: 105, cost: 3, el: 'grass', area: true, inflict: { id: 'poison', n: 2 } }],
  draco_fruit: [{ id: 's1', name: '서리 가시', power: 66, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '서리 열매 터뜨리기', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill', n: 2 } }],
  frost_drake: [{ id: 's1', name: '서리 비늘', power: 66, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙룡의 숨', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill', n: 2 } }],
  ember_cap: [{ id: 's1', name: '불씨 포자', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '불꽃 포자 구름', power: 100, cost: 3, el: 'fire', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  drake_cactus: [{ id: 's1', name: '용불 가시', power: 60, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '화룡의 숨결', power: 115, cost: 4, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  gat_cap: [{ id: 's1', name: '부채 바람', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '갓 회오리', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  mask_vine: [{ id: 's1', name: '탈춤 휘감기', power: 60, cost: 1, el: 'earth', inflict: { id: 'seal' } }, { id: 's2', name: '대지의 탈춤', power: 115, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  lantern_vine: [{ id: 's1', name: '초롱 불빛', power: 60, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '청사초롱 눈보라', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill', n: 2 } }],
  jar_cactus: [{ id: 's1', name: '물동이 쏟기', power: 60, cost: 1, el: 'water', inflict: { id: 'wet' } }, { id: 's2', name: '물동이 내려치기', power: 115, cost: 3, el: 'water', area: true, inflict: { id: 'wet' } }],
  goblin_cap: [{ id: 's1', name: '방망이 찌릿', power: 60, cost: 1, el: 'bolt', inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '금 나와라 뚝딱', power: 120, cost: 4, el: 'bolt', inflict: { id: 'shock', n: 2 } }],
  crown_cap: [{ id: 's1', name: '서리 광채', power: 55, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙왕의 포자', power: 100, cost: 3, el: 'ice', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }],
  gladi_cactus: [{ id: 's1', name: '가시 칼 찌르기', power: 60, cost: 1, el: 'earth', contact: true }, { id: 's2', name: '검투사의 일격', power: 115, cost: 4, el: 'earth', contact: true, inflict: { id: 'defDown' } }],
  jangseung_cactus: [{ id: 's1', name: '장승 눈빛', power: 55, cost: 1, el: 'grass', ranged: true, inflict: { id: 'atkDown' } }, { id: 's2', name: '천하대장군', power: 105, cost: 3, el: 'grass', contact: true, inflict: { id: 'taunt' } }],
  astro_cap: [{ id: 's1', name: '공기 방울', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '궤도 돌진', power: 105, cost: 3, el: 'wind', contact: true, self: 'spdUp' }],
  viking_cap: [{ id: 's1', name: '뿔 박치기', power: 60, cost: 1, el: 'ice', contact: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙하 돌격', power: 115, cost: 4, el: 'ice', contact: true, inflict: { id: 'chill', n: 2 } }],
  hyunmu_cap: [{ id: 's1', name: '물뱀 휘감기', power: 55, cost: 1, el: 'water', inflict: { id: 'seal' } }, { id: 's2', name: '현무의 물결', power: 110, cost: 4, el: 'water', ranged: true, area: true, inflict: { id: 'wet' } }],
  gumiho_bloom: [{ id: 's1', name: '여우불', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '아홉 꼬리 불', power: 110, cost: 4, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  wizard_bell: [{ id: 's1', name: '별빛 찌릿', power: 55, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '번개 주문', power: 110, cost: 4, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 2 } }],
  ninja_vine: [{ id: 's1', name: '잎 수리검', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '수리검 난무', power: 105, cost: 3, el: 'wind', ranged: true, area: true }],
  diver_vine: [{ id: 's1', name: '물질', power: 55, cost: 1, el: 'water', inflict: { id: 'wet' } }, { id: 's2', name: '파도타기', power: 105, cost: 3, el: 'water', ranged: true, area: true, inflict: { id: 'wet' } }],
  pirate_cactus: [{ id: 's1', name: '물보라 칼질', power: 60, cost: 1, el: 'water', contact: true, inflict: { id: 'wet' } }, { id: 's2', name: '큰 파도 베기', power: 110, cost: 3, el: 'water', contact: true, inflict: { id: 'taunt' } }],
  ranger_vine: [{ id: 's1', name: '덩굴 화살', power: 55, cost: 1, el: 'grass', ranged: true, inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '잎새 연사', power: 105, cost: 3, el: 'grass', ranged: true, inflict: { id: 'seal' } }],
  miner_cap: [{ id: 's1', name: '곡괭이 찍기', power: 60, cost: 1, el: 'earth', contact: true, inflict: { id: 'spore', delay: 2 } }, { id: 's2', name: '광맥 폭파', power: 105, cost: 3, el: 'earth', area: true, inflict: { id: 'stun' } }],
  snow_ballet: [{ id: 's1', name: '눈꽃 회전', power: 55, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '얼음 피루엣', power: 100, cost: 3, el: 'ice', area: true, inflict: { id: 'chill', n: 2 } }],
  volcano_cap: [{ id: 's1', name: '불씨 분출', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '화산 폭발', power: 115, cost: 4, el: 'fire', area: true, inflict: { id: 'burn', n: 2 } }],
  dandel_aero: [{ id: 's1', name: '솜털 바람', power: 50, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '민들레 폭풍', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'atkDown' } }],
  drum_cactus: [{ id: 's1', name: '북채 번개', power: 60, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '뇌고 연타', power: 120, cost: 4, el: 'bolt', ranged: true, area: true, inflict: { id: 'shock', n: 2 } }],
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

// 상대 고르기(봇 — 사람과 같은 정보만 씀): 쓸 수 있는 기술 중 가중 추첨. 위력·상성이 좋으면 자주, 체력이 낮으면 방어·회피를 조금 더,
//  상대에게 아직 없는 효과(같은 속성 면역이 아니면)를 거는 기술은 조금 더.
const newFx = (s, foe) => { const f = s.inflict; if (!f) return false; const D = FX[f.id]; return !!D && !(D.el && D.el === foe.el) && !(D.jong && D.jong === foe.jong) && (D.stack || D.stat ? true : !has(foe, f.id)); };   // 쌓이는 것(독 · 빙결 · 포자 · 능력치 겹)은 늘 새로
// 못 쓰는 기술을 골랐을 때 대신 = 손패에서 쓸 수 있는 첫 기술, 없으면 넘어감(손패 넷에 기본기가 없으면 기력이 모자랄 수 있음)
export const firstOk = u => u.kit.find(s => canUse(u, s)) || BLOCKED;
// 시간 초과(2026-10-23 사용자 '시간초과 하면 랜덤으로 스킬써짐'): 지금 쓸 수 있는 기술 중 하나를 무작위로 · 없으면 막혀 쉼 — rnd = 0~1 난수(화면 Math.random · 서버 crypto)
export const randomOk = (u, rnd) => { const ok = u.kit.filter(s => canUse(u, s)); return ok.length ? ok[Math.min(ok.length - 1, Math.floor(rnd() * ok.length))] : BLOCKED; };
// 봇 머리(2026-10-22 사용자 "봇 지능 향상. 교환 등 전투를 전략적으로 하도록"): 기술마다 점수를 매겨 높은 것을 고름.
//  기대 피해(위력 · 상성 · 방어 · 맞을 확률) ÷ 상대 남은 체력 · 이번에 끝낼 수 있으면 크게 · 아직 없는 효과 · 은신/분신엔 광역 ·
//  상대가 이번 턴 나를 쓰러뜨릴 만하면(상대가 쓴 기술 · 상대 햇빛으로 짐작) 방어 · 회피 · 막는 버프 · 햇빛이 모자라면 광합성.
//  머리 좋음 iq(0~1 — 봇 판을 열 때 대회 단계로 정함, fight.js) 만큼 높은 점수를 고르고, 낮으면 더 무작위(첫 판 · 낮은 단계가 쉬움).
//  사람과 같은 정보만 씀: 내 손패 · 상대 앞 식물의 보이는 값(속성 · 능력치 · 체력 · 햇빛 · 효과) · 상대가 이번 판에 쓴 기술(ctx.seen).
const hitChance = (u, foe, s) => {
  const t = hitTable(u, foe, { area: !!s.area });
  let p = (t.hit + 1.5 * t.crit + 0.5 * t.graze) / 100;
  if (!s.area && has(foe, 'stealth')) p *= 0.05;   // 은신(분신 = 연출만) = 광역 아닌 공격 95% 빗나감
  return p;
};
export const expDamage = (u, foe, s) => (s && s.act === 'attack' && s.power ? baseDamage(u, foe, s, hitMult(u, foe, s)) * (s.hits || 1) * hitChance(u, foe, s) : 0);
// 상대가 이번 턴 나에게 줄 만한 피해: 쓴 기술 중 가장 센 것과, 상대 햇빛만큼 센 자기 속성 기술(짐작) 중 큰 쪽
export function threatOf(foe, u, seen = []) {
  const guess = { act: 'attack', power: 30 + 12 * Math.min(5, foe.energy || 0), el: foe.el, cost: 0 };
  return Math.max(expDamage(foe, u, guess), ...seen.filter(s => s && s.act === 'attack' && (s.cost || 0) <= (foe.energy || 0)).map(s => expDamage(foe, u, s)));
}
const SHIELDS = ['shield', 'defUp', 'armor'];
function aiScore(u, foe, s, risk, last) {
  if (s.act === 'attack') {
    const d = expDamage(u, foe, s), frac = Math.min(1.2, d / Math.max(1, foe.hp));
    return 2.5 * frac + (d >= foe.hp * 0.95 ? 2.5 : 0) + (newFx(s, foe) ? 0.5 * foe.hp / foe.max : 0) + (s.area && has(foe, 'stealth') ? 1 : 0) + (s.self ? 0.25 : 0);
  }
  const rep = last === s.act ? 0.5 : 1;   // 같은 자세를 연달아 쓰면 효과가 절반(rules repeatStanceK)
  if (s.act === 'guard') return (risk >= 1 ? 2.2 : 1.4 * risk) * rep;
  if (s.act === 'evade') return (risk >= 1 ? 1.8 : 1.1 * risk) * rep;
  if (s.act === 'hex') {   // 피해 없이 거는 기술(종 고유 v2): 새로 걸리는 것이 많을수록 · 공명(강풍에 덧붙임)은 쓸 수 있을 때 높게
    if (s.galeAdd) return 1.0;
    const fresh = (s.hex || []).filter(h => !has(foe, h.id)).length;
    return fresh ? 0.55 + 0.35 * fresh : 0.15;
  }
  if (s.act === 'sun') { const need = Math.max(0, ...u.kit.map(k => k.cost || 0)); return (u.energy || 0) < need && risk < 0.5 ? 1 + 0.2 * (need - (u.energy || 0)) : 0.08; }
  if (s.act === 'buff' && s.bare) return ((u.res && u.res.evs) || 0) >= 2 ? 0.5 + Math.min(1, risk) : 0.1;   // 방심하기 = 쌓아 둔 스택을 쓸 때
  if (s.act === 'buff') {
    const b = s.self, stack = b && FX[b] && FX[b].stat;   // 능력치 겹은 다시 걸어도 쌓임(조금 덜 쳐 줌)
    if (b && has(u, b) && !stack) return 0.1;
    const k = b && has(u, b) ? 0.6 : 1;
    if (SHIELDS.includes(b) || (!b && s.reflect)) return (0.4 + 1.2 * Math.min(1, risk)) * k;   // 막는 것(보호막 · 억셈 · 갑주 · 반사 자세)
    if (b === 'stealth') return 0.5 + 0.9 * Math.min(1, risk);   // 은신 = 피하고 이어 공격
    if (b === 'regen') return u.hp < u.max * 0.7 ? 1 : 0.3;
    if (b === 'spdUp') return (u.spd < foe.spd ? 0.9 : 0.3) * k;
    if (b === 'aim' || b === 'atkUp') return (0.6 + (foe.hp > foe.max * 0.5 ? 0.3 : 0)) * k;
    return 0.5 * k;
  }
  return 0.3;
}
export function aiPick(u, foe, rng, ctx = {}) {
  const ok = u.kit.filter(s => canUse(u, s, u.energy, foe));
  if (!ok.length) return BLOCKED;
  const iq = ctx.iq ?? u.ai ?? 0.5, risk = threatOf(foe, u, ctx.seen) / Math.max(1, u.hp);
  const sc = ok.map(s => aiScore(u, foe, s, risk, ctx.last));
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
      playTurnVs(C, aiPick(C.me, C.foe, r, { iq: 0.7 }), cand);
      for (let d = 0; d < 12 && !C.over; d++) playTurnVs(C, aiPick(C.me, C.foe, r, { iq: 0.7 }), aiPick(C.foe, C.me, r, { iq: 0.8 }));
      sum += C.over === 'lose' ? 1 : C.over === 'win' ? 0 : 0.5 + 0.5 * (C.foe.hp / C.foe.max - C.me.hp / C.me.max);   // 'lose' = 사람이 짐 = 봇이 이김
    }
    if (sum / n > bestV) { bestV = sum / n; best = cand; }
  });
  return best;
}

// 판 차리기: 씨앗 하나로 난수 고정(결정론 — 같은 씨앗·같은 선택이면 같은 결과)
export function makeBattle({ me, foe, seed = 20261015 }) {
  me.solo = foe.solo = true; me.slot = 'me'; foe.slot = 'foe';   // 1:1 표시(속박 → 봉인) · 유닛 이름표(기생을 건 식물 찾기)
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
  for (const u of pair) { if (u.hp <= 0) continue; if (noEnergy(u)) ev.push({ t: 'noEnergy', who: u.id, name: u.name, why: u.eff.dark.look || 'dark' }); else gain(u); }
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
  B.me.energy -= me.cost || 0; B.foe.energy -= foeSkill.cost || 0;
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
