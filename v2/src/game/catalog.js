// 풀로세움 v2 게임 표(서버·화면 공용, 순수 데이터) — 식물 · 기술 · 아이템 · 행성 · 수치.
// 설계 = docs/superpowers/specs/2026-10-16-v2-mvp-design.md(MVP), 2026-10-15-v2-skill-system-design.md(기술 층·효과 짝), 2026-10-15-v2-growth-economy-design.md(키우기·돈).
// 사용자 결정(2026-10-15~16): 식물은 물·비료로만 자람 · 단계마다 Lv1~6, Lv6에서 진화 단추 · 진화 때 기술 1~2개(상급은 미리 안 보임) ·
//  기억 = 전투 3칸 + 조커 1칸 · 개체값(숫자 + 원형 게이지)·별 · 강화 = 레벨업 포인트 + 돈(상한 없음, 리셋 = 돈) · 완제품 아이템만 ·
//  수확 = 돈·물·비료가 주로, 나머지는 드물게 · 재배사 레벨 = 스마트팜 칸 + 행성(여유 있게) · 레벨업 보상(클래시로얄처럼) · 물·비료 = 전투·탐사·수확, 상점은 보석.

// ── 종 · 속성 ──
export const JONG = { flower: '꽃', vine: '덩굴', cactus: '선인장', mushroom: '버섯' };
export const ELEM = { fire: '불', water: '물', grass: '풀', earth: '대지', wind: '바람', bolt: '번개', ice: '빙결' };
const TYPE_BASE = { flower: [210, 34, 22, 30], vine: [232, 32, 24, 26], cactus: [252, 31, 28, 22], mushroom: [224, 30, 26, 24] };
const EL_ADD = { fire: [0, 3, 0, 1], water: [12, 0, 1, 0], wind: [0, 1, 0, 4], bolt: [0, 2, 0, 4], earth: [8, 0, 4, -2], grass: [6, 1, 1, 0], ice: [4, 1, 2, 0] };
const base = (type, el) => { const b = TYPE_BASE[type], e = EL_ADD[el]; return { hp: b[0] + e[0], atk: b[1] + e[1], def: b[2] + e[2], spd: b[3] + e[3], acc: 0, crit: 5 }; };

// 식물 16(그림이 있는 것) — 가지 = 가까운 식물 무리(중간 층 기술을 나눠 가짐). 2026-10-16 새 넷(사용자 "새식물 그대로 고 — 단계별로 만들어가자") = 빈 칸(빙결 없음 · 버섯 하나뿐) 채우기
export const SPECIES = {
  flower_grass: { name: '페탈로즈', type: 'flower', el: 'grass', rarity: 'common', branch: 'meadow' },
  thorn: { name: '쏜위드', type: 'vine', el: 'grass', rarity: 'common', branch: 'shade' },
  aqua: { name: '아쿠아벌브', type: 'flower', el: 'water', rarity: 'common', branch: 'shore' },
  flower_wind: { name: '윈드페탈', type: 'flower', el: 'wind', rarity: 'common', branch: 'meadow' },
  spark: { name: '스파크번', type: 'flower', el: 'bolt', rarity: 'rare', branch: 'meadow' },
  vine_water: { name: '타이드바인', type: 'vine', el: 'water', rarity: 'common', branch: 'shore' },
  cactus_fire: { name: '엠버캑터', type: 'cactus', el: 'fire', rarity: 'common', branch: 'desert' },
  gaia: { name: '가이아록', type: 'cactus', el: 'earth', rarity: 'common', branch: 'desert' },
  flower_fire: { name: '블레이즈블룸', type: 'flower', el: 'fire', rarity: 'common', branch: 'meadow' },
  cactus_wind: { name: '게일캑터', type: 'cactus', el: 'wind', rarity: 'common', branch: 'desert' },
  vine_wind: { name: '게일바인', type: 'vine', el: 'wind', rarity: 'common', branch: 'shade' },
  spore_cap: { name: '스포어캡', type: 'mushroom', el: 'grass', rarity: 'rare', branch: 'shade' },
  frost_bell: { name: '프로스트벨', type: 'flower', el: 'ice', rarity: 'rare', branch: 'meadow' },
  volt_vine: { name: '볼트바인', type: 'vine', el: 'bolt', rarity: 'common', branch: 'shade' },
  stone_cap: { name: '스톤캡', type: 'mushroom', el: 'earth', rarity: 'common', branch: 'desert' },
  jelly_cap: { name: '젤리캡', type: 'mushroom', el: 'water', rarity: 'rare', branch: 'shore' },
  // 2026-10-16 새 다섯 = 변이 고정(사용자 승인 "변이 특화 식물" + "다른 식물들도 계속 늘리자") — 빈 칸(종×속성)을 채움, 드묾
  fang_trap: { name: '팽트랩', type: 'flower', el: 'earth', rarity: 'rare', branch: 'meadow', form: 'predator' },
  blade_vine: { name: '블레이드바인', type: 'vine', el: 'fire', rarity: 'rare', branch: 'shade', form: 'weapon' },
  toxi_cactus: { name: '톡시캑터', type: 'cactus', el: 'grass', rarity: 'rare', branch: 'desert', form: 'toxic' },
  draco_fruit: { name: '드라코프루트', type: 'cactus', el: 'ice', rarity: 'rare', branch: 'desert', form: 'dragon' },
  ember_cap: { name: '엠버캡', type: 'mushroom', el: 'fire', rarity: 'rare', branch: 'shade', form: 'spore' },
  drake_cactus: { name: '드레이크캑터', type: 'cactus', el: 'fire', rarity: 'rare', branch: 'desert', form: 'dragon' },
  // 2026-10-17 새 셋(사용자 "식물이라는 컨셉 때문에 디자인이 비슷해져 — 갓을 쓴 형태 등 상징적인 걸 강조") = 빈 칸(버섯 × 바람 · 덩굴 × 대지 · 선인장 × 번개), 일반 식물(카드 = 일반 카드)
  gat_cap: { name: '갓캡', type: 'mushroom', el: 'wind', rarity: 'common', branch: 'meadow' },      // 버섯 갓 = 선비의 갓 · 갓끈 · 잎 부채
  mask_vine: { name: '탈바인', type: 'vine', el: 'earth', rarity: 'common', branch: 'desert' },     // 하회탈 얼굴 · 탈춤 소매 덩굴
  drum_cactus: { name: '드럼캑터', type: 'cactus', el: 'bolt', rarity: 'rare', branch: 'desert' },  // 천둥북 고리 · 북채 팔   // 2026-10-17 태생 용족(불 선인장 용 — 갈빗대 몸에 용 비늘 · 뿔 · 날개)
};
for (const k of Object.keys(SPECIES)) SPECIES[k].base = base(SPECIES[k].type, SPECIES[k].el);
for (const k of Object.keys(SPECIES)) if (SPECIES[k].form) { const b = SPECIES[k].base; b.hp = Math.round(b.hp * 0.94); b.atk = Math.round(b.atk * 0.94); b.def = Math.round(b.def * 0.94); }   // 변이 고정 종 = 능력치 조금 낮음(대신 변이 칸 둘이 처음부터)
export const BRANCH = { meadow: '꽃밭 가지', shore: '물가 가지', desert: '사막 가지', shade: '숲그늘 가지' };
export const STARTERS = ['flower_grass', 'cactus_fire', 'aqua'];

// ── 생장 ──
export const STAGES = ['어린', '자라는', '다 자란'];
export const STAGE_KEY = ['sprout', 'growing', 'mature'];   // 그림 단계(sprites bigKey: sprout→_young, growing→_teen, mature→기본)
export const STAGE_MUL = [0.8, 0.9, 1];                     // 체력·공격·방어 배율
export const LV_MAX = 6;
export const growNeed = (stage, lv) => 20 + 10 * lv + 30 * stage;   // 다음 레벨까지 생장치(물 +10 · 비료 +25)
export const FEED = { water: 10, fert: 25 };
export const PTS_PER_LV = 2;                                 // 레벨업마다 강화 포인트
export const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'acc', 'crit'];
export const IV_KEYS = ['hp', 'atk', 'def', 'spd'];          // 개체값(0~10, 1당 +1%) — 원형 게이지
export const IV_MAX = 10;
export const UP_GAIN = { hp: 5, atk: 1, def: 1, spd: 1, acc: 1, crit: 1 };   // 강화 포인트 1당
export const STAT_NAME = { hp: '체력', atk: '공격', def: '방어', spd: '기동', acc: '적중', crit: '치명' };
export const upCost = spent => 8 + 4 * Math.floor(spent / 4);  // 포인트 쓸 때 돈(너무 비싸지 않게)
export const resetCost = p => 150 + 100 * p.stage;           // 포인트 리셋(돈, 아이템 없음)
export const starsOf = ivs => { const t = IV_KEYS.reduce((a, k) => a + (ivs[k] || 0), 0); return t >= 33 ? 5 : t >= 25 ? 4 : t >= 17 ? 3 : t >= 9 ? 2 : 1; };

// ── 기술 ──
// tier: u = 개성(꽃 기술, 식물 전용) · c1/c2/c3 = 공통(뿌리 기술) 하급·중급·상급 · g = 가지 기술 · s = 변이·특수
// self = 나에게 거는 버프(공격 기술의 덤이거나 버프 기술 자체) · drain = 준 피해의 몇 %를 회복 · area · ranged
const S = (id, name, el, tier, power, cost, o = {}) => ({ id, name, el, tier, power, cost, act: power > 0 ? 'attack' : 'buff', cats: [power > 0 ? 'attack' : 'buff'], ...o });
export const SKILLS = Object.fromEntries([
  // 불
  S('f_ember', '불씨 튕기기', 'fire', 'c1', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('f_rage', '불타오르기', 'fire', 'c1', 0, 1, { self: 'rage' }),
  S('f_ball', '화염구', 'fire', 'c2', 95, 2, { ranged: true, inflict: { id: 'burn' } }),
  S('f_pillar', '불기둥', 'fire', 'c3', 125, 4, { area: true, inflict: { id: 'burn' } }),
  S('f_storm', '화염 폭풍', 'fire', 'c3', 110, 3, { ranged: true, inflict: { id: 'burn' }, self: 'rage' }),
  S('f_lava', '용암 분출', 'fire', 'c3', 150, 5, { inflict: { id: 'burn' } }),
  // 물
  S('w_gun', '물총', 'water', 'c1', 55, 1, { ranged: true, inflict: { id: 'wet' } }),
  S('w_pure', '맑은 물', 'water', 'c1', 0, 1, { self: 'purify' }),
  S('w_cannon', '물대포', 'water', 'c2', 95, 2, { ranged: true, inflict: { id: 'wet' } }),
  S('w_tide', '해일', 'water', 'c3', 125, 4, { area: true, inflict: { id: 'wet' } }),
  S('w_whirl', '소용돌이', 'water', 'c3', 115, 3, { inflict: { id: 'wet' }, drain: 0.3 }),
  S('w_rain', '단비', 'water', 'c3', 0, 3, { self: 'regen', also: 'purify' }),
  // 풀
  S('g_leaf', '가시 잎', 'grass', 'c1', 55, 1, { ranged: true, inflict: { id: 'poison', n: 1 } }),
  S('g_photo', '광합성', 'grass', 'c1', 0, 1, { self: 'regen' }),
  S('g_whip', '독초 채찍', 'grass', 'c2', 90, 2, { inflict: { id: 'poison', n: 2 } }),
  S('g_venom', '맹독 덩굴', 'grass', 'c3', 115, 4, { inflict: { id: 'poison', n: 3 } }),
  S('g_root', '흡수 뿌리', 'grass', 'c3', 105, 3, { drain: 0.5 }),
  S('g_bomb', '씨앗 폭탄', 'grass', 'c3', 130, 4, { area: true, inflict: { id: 'poison', n: 1 } }),
  // 대지
  S('e_rock', '돌 던지기', 'earth', 'c1', 60, 1, { ranged: true }),
  S('e_hard', '단단해지기', 'earth', 'c1', 0, 1, { self: 'wall' }),
  S('e_roll', '바위 굴리기', 'earth', 'c2', 100, 2),
  S('e_quake', '지진', 'earth', 'c3', 115, 4, { area: true, inflict: { id: 'stun' } }),
  S('e_slide', '산사태', 'earth', 'c3', 140, 4),
  S('e_wall', '흙벽', 'earth', 'c3', 0, 3, { self: 'shield', also: 'wall' }),
  // 바람
  S('a_breeze', '산들바람', 'wind', 'c1', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('a_tail', '순풍', 'wind', 'c1', 0, 1, { self: 'haste' }),
  S('a_twist', '회오리', 'wind', 'c2', 90, 2, { ranged: true, inflict: { id: 'gale' } }),
  S('a_typhoon', '태풍', 'wind', 'c3', 125, 4, { area: true, inflict: { id: 'gale' } }),
  S('a_vacuum', '진공 칼날', 'wind', 'c3', 115, 3, { ranged: true, self: 'focus' }),
  S('a_jet', '제트 기류', 'wind', 'c3', 100, 3, { ranged: true, self: 'haste' }),
  // 번개
  S('b_static', '정전기', 'bolt', 'c1', 55, 1, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('b_charge', '정전기 충전', 'bolt', 'c1', 0, 1, { self: 'focus' }),
  S('b_bolt', '번개 줄기', 'bolt', 'c2', 95, 2, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('b_thunder', '천둥', 'bolt', 'c3', 120, 4, { area: true, inflict: { id: 'shock', n: 2 } }),
  S('b_surge', '전류 폭주', 'bolt', 'c3', 150, 5, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('b_chain', '연쇄 번개', 'bolt', 'c3', 105, 3, { ranged: true, inflict: { id: 'shock', n: 1 }, self: 'haste' }),
  // 빙결(빙결 식물 = 프로스트벨부터, 2026-10-16)
  S('i_frost', '서리', 'ice', 'c1', 55, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('i_shell', '얼음 껍질', 'ice', 'c1', 0, 1, { self: 'shield' }),
  S('i_spear', '얼음 창', 'ice', 'c2', 95, 2, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('i_blizzard', '눈보라', 'ice', 'c3', 120, 4, { area: true, inflict: { id: 'chill', n: 2 } }),
  S('i_zero', '절대 영도', 'ice', 'c3', 150, 5, { inflict: { id: 'chill', n: 2 } }),
  // 종 공통(뿌리)
  S('j_scent', '꽃향기', null, 'c1', 60, 1, { jong: 'flower', ranged: true, inflict: { id: 'weak' } }),
  S('j_petals', '꽃잎 춤', null, 'c2', 90, 2, { jong: 'flower', ranged: true, self: 'haste' }),
  S('j_wrap', '휘감기', null, 'c1', 60, 1, { jong: 'vine', inflict: { id: 'bind' } }),
  S('j_lash', '덩굴 채찍', null, 'c2', 90, 2, { jong: 'vine', inflict: { id: 'bind' } }),
  S('j_spines', '가시 세우기', null, 'c1', 0, 1, { jong: 'cactus', self: 'thorns' }),
  S('j_needle', '도발 가시', null, 'c2', 85, 2, { jong: 'cactus', inflict: { id: 'taunt' } }),
  S('j_spore', '포자 뿌리기', null, 'c1', 50, 1, { jong: 'mushroom', ranged: true, inflict: { id: 'spore', n: 1 } }),
  S('j_cloud', '버섯 구름', null, 'c2', 80, 3, { jong: 'mushroom', ranged: true, area: true, inflict: { id: 'spore', n: 2 } }),
  // 가지(중간 층 — 가까운 식물 무리, 먼 행성 특이 식물은 예외로도)
  S('br_sand', '모래 폭풍', 'earth', 'g', 95, 3, { branch: 'desert', area: true, inflict: { id: 'gale' } }),
  S('br_moss', '물이끼', 'water', 'g', 0, 2, { branch: 'shore', self: 'regen', also: 'shield' }),
  S('br_bloom', '꽃비', 'grass', 'g', 85, 3, { branch: 'meadow', area: true, inflict: { id: 'weak' } }),
  S('br_trap', '이끼 덫', 'grass', 'g', 75, 2, { branch: 'shade', inflict: { id: 'bind' } }),
  // 변이·특수(속성·종·생장 무관 — 특수 접목 가지로만)
  S('sp_leech', '기생 씨앗', null, 's', 40, 2, { inflict: { id: 'leech' } }),
  S('sp_root', '뿌리 얽기', null, 's', 60, 2, { inflict: { id: 'root' } }),
  S('sp_shade', '그늘 드리우기', null, 's', 50, 2, { ranged: true, inflict: { id: 'shade' } }),
  S('sp_acid', '부식액', null, 's', 60, 2, { ranged: true, inflict: { id: 'corrode' } }),
  // 개성(꽃 기술) — 식물마다 어린 1 · 자라는 1 · 다 자란 1
  S('u_petal_1', '꽃잎 향기', 'grass', 'u', 65, 1, { ranged: true, inflict: { id: 'weak' } }),
  S('u_petal_2', '장미 가시', 'grass', 'u', 85, 2, { inflict: { id: 'poison', n: 1 } }),
  S('u_petal_3', '꽃잎 칼날', 'grass', 'u', 115, 3),
  S('u_thorn_1', '가시 채찍', 'grass', 'u', 60, 1, { inflict: { id: 'poison', n: 1 } }),
  S('u_thorn_2', '가시 그물', 'grass', 'u', 80, 2, { inflict: { id: 'bind' } }),
  S('u_thorn_3', '독가시 덤불', 'grass', 'u', 110, 3, { inflict: { id: 'poison', n: 2 } }),
  S('u_aqua_1', '물방울', 'water', 'u', 66, 1, { ranged: true, inflict: { id: 'wet' } }),   // 2026-10-16 봇 상대 승률 41%(처음 셋 중 가장 낮음) → 위력 60 → 66
  S('u_aqua_2', '물거품 방패', 'water', 'u', 0, 2, { self: 'shield', also: 'purify' }),
  S('u_aqua_3', '물방울 세례', 'water', 'u', 112, 3, { ranged: true, inflict: { id: 'wet' } }),
  S('u_wind_1', '꽃잎 바람', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_wind_2', '꽃잎 회오리', 'wind', 'u', 85, 2, { ranged: true, self: 'haste' }),
  S('u_wind_3', '꽃잎 돌풍', 'wind', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'weak' } }),
  S('u_spark_1', '전기 불꽃', 'bolt', 'u', 60, 1, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_spark_2', '전기 꽃가루', 'bolt', 'u', 75, 2, { ranged: true, area: true, inflict: { id: 'shock', n: 1 } }),
  S('u_spark_3', '낙뢰', 'bolt', 'u', 120, 4, { ranged: true, inflict: { id: 'shock', n: 2 } }),
  S('u_tide_1', '물살 새순', 'water', 'u', 65, 1, { inflict: { id: 'bind' } }),
  S('u_tide_2', '조류 휘감기', 'water', 'u', 85, 2, { inflict: { id: 'wet' } }),
  S('u_tide_3', '파도 덮치기', 'water', 'u', 105, 3, { area: true, inflict: { id: 'wet' } }),
  S('u_ember_1', '불씨', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_ember_2', '불가시 난사', 'fire', 'u', 75, 2, { ranged: true, inflict: { id: 'burn' }, self: 'thorns' }),
  S('u_ember_3', '불덩이', 'fire', 'u', 120, 4, { ranged: true, inflict: { id: 'burn' } }),
  S('u_gaia_1', '돌 주먹', 'earth', 'u', 75, 1, { inflict: { id: 'taunt' } }),
  S('u_gaia_2', '바위 갑옷', 'earth', 'u', 0, 2, { self: 'wall', also: 'thorns' }),
  S('u_gaia_3', '대지 내려치기', 'earth', 'u', 120, 4, { area: true, inflict: { id: 'stun' } }),
  S('u_blaze_1', '불꽃 꽃잎', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_blaze_2', '열꽃', 'fire', 'u', 0, 2, { self: 'rage', also: 'haste' }),
  S('u_blaze_3', '불꽃 만개', 'fire', 'u', 105, 3, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_gale_1', '바람 고리', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_gale_2', '가시 회오리', 'wind', 'u', 85, 2, { inflict: { id: 'taunt' } }),
  S('u_gale_3', '돌개바람', 'wind', 'u', 110, 3, { ranged: true, inflict: { id: 'taunt' } }),
  S('u_gvine_1', '휘감는 바람', 'wind', 'u', 65, 1, { ranged: true, inflict: { id: 'bind' } }),
  S('u_gvine_2', '바람 채찍', 'wind', 'u', 85, 2, { ranged: true, inflict: { id: 'gale' } }),
  S('u_gvine_3', '칼바람', 'wind', 'u', 105, 3, { ranged: true, inflict: { id: 'gale' } }),
  S('u_spore_1', '포자', 'grass', 'u', 50, 1, { ranged: true, inflict: { id: 'spore', n: 1 } }),
  S('u_spore_2', '포자 폭발', 'grass', 'u', 80, 2, { area: true, inflict: { id: 'spore', n: 1 } }),
  S('u_spore_3', '포자 구름', 'grass', 'u', 90, 3, { ranged: true, area: true, inflict: { id: 'spore', n: 2 } }),
  // 새 넷(2026-10-16) — 효과 짝: 속성(빙결 = 빙결 · 번개 = 감전 · 대지 = 기절 · 물 = 젖음) 또는 종(꽃 = 약화 · 덩굴 = 덩굴 · 버섯 = 포자), 센 효과(겹 2 · 기절)는 비용 4
  S('u_frost_1', '서리 종소리', 'ice', 'u', 60, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('u_frost_2', '서리꽃 날림', 'ice', 'u', 80, 2, { ranged: true, inflict: { id: 'weak' } }),
  S('u_frost_3', '빙결의 종', 'ice', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'chill', n: 2 } }),
  S('u_volt_1', '전깃줄 감기', 'bolt', 'u', 60, 1, { inflict: { id: 'bind' } }),
  S('u_volt_2', '방전', 'bolt', 'u', 85, 2, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_volt_3', '고압 채찍', 'bolt', 'u', 120, 4, { inflict: { id: 'shock', n: 2 } }),
  S('u_stone_1', '돌가루 포자', 'earth', 'u', 55, 1, { ranged: true, inflict: { id: 'spore', n: 1 } }),
  S('u_stone_2', '바위 갓', 'earth', 'u', 0, 2, { self: 'wall', also: 'shield' }),
  S('u_stone_3', '갓 내려찍기', 'earth', 'u', 120, 4, { area: true, inflict: { id: 'stun' } }),
  S('u_jelly_1', '젤리 방울', 'water', 'u', 60, 1, { ranged: true, inflict: { id: 'wet' } }),
  S('u_jelly_2', '흐물 촉수', 'water', 'u', 80, 2, { inflict: { id: 'spore', n: 1 } }),
  S('u_jelly_3', '해파리 비', 'water', 'u', 105, 3, { ranged: true, area: true, inflict: { id: 'wet' } }),
  S('u_fang_1', '덫 물기', 'earth', 'u', 65, 1, { inflict: { id: 'weak' } }),
  S('u_fang_2', '이끼 덫', 'earth', 'u', 0, 2, { self: 'wall', also: 'regen' }),
  S('u_fang_3', '대지 집어삼키기', 'earth', 'u', 115, 4, { inflict: { id: 'stun' } }),
  S('u_blade_1', '불꽃 베기', 'fire', 'u', 60, 1, { inflict: { id: 'burn' } }),
  S('u_blade_2', '칼날 덩굴', 'fire', 'u', 80, 2, { inflict: { id: 'bind' } }),
  S('u_blade_3', '용광로 일섬', 'fire', 'u', 115, 3, { inflict: { id: 'burn' } }),
  S('u_toxi_1', '독가시 쏘기', 'grass', 'u', 55, 1, { ranged: true, inflict: { id: 'poison', n: 1 } }),
  S('u_toxi_2', '가시 도발', 'grass', 'u', 70, 2, { inflict: { id: 'taunt' }, self: 'thorns' }),
  S('u_toxi_3', '맹독 터뜨리기', 'grass', 'u', 105, 3, { area: true, inflict: { id: 'poison', n: 2 } }),
  S('u_draco_1', '서리 비늘', 'ice', 'u', 60, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('u_draco_2', '비늘 세우기', 'ice', 'u', 0, 2, { self: 'shield', also: 'thorns' }),
  S('u_draco_3', '빙룡의 숨', 'ice', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'chill', n: 2 } }),
  S('u_emcap_1', '불씨 포자', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'spore', n: 1 } }),
  S('u_emcap_2', '등불 빛', 'fire', 'u', 75, 2, { ranged: true, inflict: { id: 'burn' } }),
  S('u_emcap_3', '불꽃 포자 구름', 'fire', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'spore', n: 2 } }),
  S('u_drake_1', '용불 가시', 'fire', 'u', 60, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_drake_2', '비늘 갑옷', 'fire', 'u', 0, 2, { self: 'wall', also: 'thorns' }),
  S('u_drake_3', '화룡의 숨결', 'fire', 'u', 115, 4, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_gat_1', '부채 바람', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_gat_2', '갓끈 휘날리기', 'wind', 'u', 0, 2, { self: 'haste', also: 'focus' }),
  S('u_gat_3', '갓 회오리', 'wind', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'spore', n: 2 } }),
  S('u_tal_1', '탈춤 휘감기', 'earth', 'u', 60, 1, { inflict: { id: 'bind' } }),
  S('u_tal_2', '탈놀이', 'earth', 'u', 70, 2, { inflict: { id: 'taunt' } }),
  S('u_tal_3', '대지의 탈춤', 'earth', 'u', 115, 4, { area: true, inflict: { id: 'stun' } }),
  S('u_drum_1', '북채 번개', 'bolt', 'u', 60, 1, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_drum_2', '천둥 장단', 'bolt', 'u', 0, 2, { self: 'focus', also: 'haste' }),
  S('u_drum_3', '뇌고 연타', 'bolt', 'u', 120, 4, { ranged: true, area: true, inflict: { id: 'shock', n: 2 } }),
  // 변이 기술(2026-10-16 사용자 "변이 스킬은 별개로 2칸 — 최대 6칸" · 추천안 "변이마다 정해진 목록에서 언제든 골라 끼움 · 에너지 대신 충전" · "변이식물의 장점은 변이스킬로 6칸"):
  //  tier 'm' · form = 변이형 · 에너지 0 · charge = 쓰고 나서 못 쓰는 턴 수 · 잊기 없음(목록 안에서 언제든 바꿈). 수치는 시제품 — 밸런스는 나중에(사용자)
  S('m_bite', '물어뜯기', null, 'm', 70, 0, { form: 'predator', uses: 3, drain: 0.4 }),
  S('m_devour', '집어삼키기', null, 'm', 110, 0, { form: 'predator', uses: 1, drain: 0.6 }),
  S('m_hunt', '사냥 본능', null, 'm', 0, 0, { form: 'predator', uses: 2, self: 'focus', also: 'rage' }),
  S('m_slash', '칼날 베기', null, 'm', 90, 0, { form: 'weapon', uses: 3 }),
  S('m_shot', '가시 탄환', null, 'm', 75, 0, { form: 'weapon', uses: 3, ranged: true }),
  S('m_smash', '쇠망치 내려치기', null, 'm', 115, 0, { form: 'weapon', uses: 1, inflict: { id: 'stun' } }),
  S('m_spit', '독 뱉기', null, 'm', 50, 0, { form: 'toxic', uses: 3, ranged: true, inflict: { id: 'poison', n: 2 } }),
  S('m_acid', '부식액', null, 'm', 65, 0, { form: 'toxic', uses: 2, ranged: true, inflict: { id: 'corrode' } }),
  S('m_miasma', '독안개', null, 'm', 45, 0, { form: 'toxic', uses: 1, ranged: true, area: true, inflict: { id: 'poison', n: 3 } }),
  S('m_puff', '포자 퍼프', null, 'm', 45, 0, { form: 'spore', uses: 3, ranged: true, inflict: { id: 'weak' } }),
  S('m_sleep', '잠 포자', null, 'm', 30, 0, { form: 'spore', uses: 1, ranged: true, inflict: { id: 'stun' } }),
  S('m_bloom', '포자 만개', null, 'm', 0, 0, { form: 'spore', uses: 1, self: 'regen', also: 'purify' }),
  S('m_breath', '용의 숨결', null, 'm', 100, 0, { form: 'dragon', uses: 2, ranged: true, elOwn: true }),   // 속성 = 그 식물 속성(kitOfPlant)
  S('m_scale', '비늘 방패', null, 'm', 0, 0, { form: 'dragon', uses: 2, self: 'shield' }),
  S('m_roar', '용의 포효', null, 'm', 55, 0, { form: 'dragon', uses: 2, inflict: { id: 'taunt' } }),
  // 속성 변이 기술(2026-10-17 사용자 "변이 카드 수를 늘리자 — 불 속성 공격도 있고 물도 있고 · 다 만들지 말고 어울리는 거와 연결해서"): 변이마다 어울리는 속성 한두 개만
  S('m_flame', '달군 칼날', 'fire', 'm', 85, 0, { form: 'weapon', uses: 2, inflict: { id: 'burn' } }),
  S('m_spear', '번개 창', 'bolt', 'm', 80, 0, { form: 'weapon', uses: 2, ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('m_burrow', '땅굴 습격', 'earth', 'm', 90, 0, { form: 'predator', uses: 2, drain: 0.3 }),
  S('m_maw', '심해 아가리', 'water', 'm', 85, 0, { form: 'predator', uses: 2, drain: 0.3, inflict: { id: 'wet' } }),
  S('m_bile', '독물 쏘기', 'water', 'm', 70, 0, { form: 'toxic', uses: 3, ranged: true, inflict: { id: 'poison', n: 1 } }),
  S('m_ivy', '독가시 덩굴', 'grass', 'm', 80, 0, { form: 'toxic', uses: 2, inflict: { id: 'poison', n: 2 } }),
  S('m_gust', '포자 바람', 'wind', 'm', 60, 0, { form: 'spore', uses: 3, ranged: true, area: true, inflict: { id: 'spore', n: 1 } }),
  S('m_frostclaw', '서리 발톱', 'ice', 'm', 90, 0, { form: 'dragon', uses: 2, inflict: { id: 'chill', n: 1 } }),
  S('m_voltclaw', '뇌룡 발톱', 'bolt', 'm', 90, 0, { form: 'dragon', uses: 2, inflict: { id: 'shock', n: 1 } }),
].map(s => [s.id, s]));
// 변이형(변이 연출 설계 2026-10-15: 포식 = 진홍 · 무기 = 강철 · 독성 = 보라 · 포자 = 금빛 · 용족 = 청록) — 포자는 버섯 전용. 일반(무변이) = null
export const FORMS = {
  predator: { name: '포식', col: '#e8344a', light: '#ffd0d6' },
  weapon: { name: '무기', col: '#9aa8c0', light: '#e8eef8' },
  toxic: { name: '독성', col: '#a868e8', light: '#f0d8ff' },
  spore: { name: '포자', col: '#d0b050', light: '#fffbd8' },
  dragon: { name: '용족', col: '#30e1b9', light: '#c8fff0' },
};
export const FORM_KEYS = Object.keys(FORMS);
export const formSkills = form => Object.values(SKILLS).filter(x => x.tier === 'm' && x.form === form).map(x => x.id);
export const MUT_SLOTS = 2;   // 옛 변이 칸 둘(p.skills.mut) — 2026-10-17부터 카드 칸 둘(game/cards.js)로 옮겨 감(logic.js normCards)
// 탐사 종자가 변이일 확률(지역 mut 배율을 곱함 — 행성 지역 고르기) · 변이 고정 종(SPECIES[키].form)은 늘 그 변이
export const MUT_P = 0.04;
const UNI = { flower_grass: 'petal', thorn: 'thorn', aqua: 'aqua', flower_wind: 'wind', spark: 'spark', vine_water: 'tide', cactus_fire: 'ember', gaia: 'gaia', flower_fire: 'blaze', cactus_wind: 'gale', vine_wind: 'gvine', spore_cap: 'spore', frost_bell: 'frost', volt_vine: 'volt', stone_cap: 'stone', jelly_cap: 'jelly', fang_trap: 'fang', blade_vine: 'blade', toxi_cactus: 'toxi', draco_fruit: 'draco', ember_cap: 'emcap', drake_cactus: 'drake', gat_cap: 'gat', mask_vine: 'tal', drum_cactus: 'drum' };
export const uniqueOf = (key, stage) => `u_${UNI[key]}_${stage + 1}`;
export const TIER_NAME = { u: '개성', c1: '하급', c2: '중급', c3: '상급', g: '가지', s: '특수', m: '변이' };
const tierAt = stage => ['c1', 'c2', 'c3'][stage];
// 진화(또는 처음) 때 피어날 후보: 그 단계 개성 + 그 단계 급의 속성·종 공통 + (자라는 단계부터) 가지
export function bloomPool(key, stage) {
  const sp = SPECIES[key], t = tierAt(stage), out = [{ id: uniqueOf(key, stage), w: 4 }];
  for (const s of Object.values(SKILLS)) {
    if (s.tier === t && s.el === sp.el && !s.jong && !s.branch) out.push({ id: s.id, w: 3 });
    else if (s.tier === t && s.jong === sp.type) out.push({ id: s.id, w: 2 });
    else if (stage >= 1 && s.tier === 'g' && s.branch === sp.branch) out.push({ id: s.id, w: 1 });
  }
  return out;
}
// 접목 가능: 같은 속성 또는 같은 종 · 급은 단계까지(상급은 다 자란 식물만) · 가지는 같은 가지 · 특수는 누구나
export function canGraft(p, skillId) {
  const s = SKILLS[skillId], sp = SPECIES[p.key];
  if (!s) return '없는 기술';
  if (s.tier === 's') return null;
  if (s.tier === 'm') return '변이 기술은 변이 칸에서 골라요';
  if (s.tier === 'u') return '개성 기술은 그 식물만 가져요';
  if (s.tier === 'g') return s.branch === sp.branch || p.legend ? null : `${BRANCH[s.branch]} 식물만 배워요`;
  if (!(s.el === sp.el || s.jong === sp.type)) return '속성이나 종이 맞지 않아요';
  if ((s.tier === 'c2' && p.stage < 1) || (s.tier === 'c3' && p.stage < 2)) return `${STAGES[s.tier === 'c3' ? 2 : 1]} 단계부터 배워요`;
  return null;
}

// ── 아이템(모두 완제품) ──
export const ITEMS = {
  water: { name: '물', icon: 'potion', desc: '생장치 +10' },
  fert: { name: '비료', icon: 'fert', desc: '생장치 +25' },
  regress: { name: '유전자 회귀 주사', icon: 'potion', desc: '지운 기술 하나를 되돌려요' },
  fuel: { name: '연료 캡슐', icon: 'energy', desc: '탐사 한 번(+ 탐사비)' },
  parts: { name: '부품', icon: 'gear', desc: '탐사선 강화 재료' },
};
export const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legend'];
export const RARITY_COL = ['#e8eef4', '#7cf0a0', '#6fb8ff', '#c48cff', '#ffb04a'];   // 흰 · 초록 · 파랑 · 보라 · 주황(옛 판 5색과 같음)

// ── 재배사 레벨 ──
export const userNeed = L => 60 + 40 * L;
export const XP = { botWin: 30, botLose: 12, pvpWin: 40, pvpLose: 15, explore: 18, harvest: 2, evolve: 25, plant: 5 };
export const FARM_START = 3, FARM_MAX = 12, STORE_MAX = 120;   // 스마트팜 칸(재배사 레벨로 열림) · 동면 보관고(사용자 "100개 정도 이상")
export const FARM_LV = [2, 3, 5, 7, 9, 12, 15, 18, 21];        // 이 레벨마다 스마트팜 한 칸
export const farmSlots = L => Math.min(FARM_MAX, FARM_START + FARM_LV.filter(x => L >= x).length);
// 레벨업 보상(클래시로얄 왕 레벨처럼 — 상자 하나): 돈 · 물 · 비료 + 가끔 보석 · 회귀 주사 · 종자
export function levelReward(L) {
  const r = { credits: 120 + 60 * L, water: 3 + Math.floor(L / 2), fert: 1 + Math.floor(L / 3), gems: L % 3 === 0 ? 10 : 0, fuel: 1 + (L % 5 === 0 ? 1 : 0) };
  if (L % 4 === 0) r.regress = 1;
  if (L % 5 === 0) r.seed = 'rare';
  if (L % 3 === 2) r.card = 'normal';   // 카드(2026-10-17): 세 레벨마다 일반 카드 한 장(addXp가 뽑음)
  return r;
}

// ── 수확(스마트팜) ──
export const HARVEST = { periodMin: [6, 5, 4], maxBase: [2, 3, 4] };   // 단계별 열매 하나 걸리는 분 · 최대 개수(Lv3부터 +1, 열매용 +1)
export const harvestMax = p => HARVEST.maxBase[p.stage] + (p.lv >= 3 ? 1 : 0) + (p.trait === 'fruity' ? 1 : 0);
// 열매 하나 = 보상 한 가지: 돈·물·비료가 주로(92%), 나머지는 드물게
export const HARVEST_TABLE = [
  { w: 46, kind: 'credits', rar: 0 }, { w: 22, kind: 'water', rar: 1 }, { w: 14, kind: 'fert', rar: 1 }, { w: 10, kind: 'credits', big: true, rar: 2 },
  { w: 4, kind: 'seed', rar: 3 }, { w: 2.5, kind: 'scion', rar: 3 }, { w: 1.2, kind: 'regress', rar: 4 }, { w: 0.3, kind: 'gems', rar: 4 },
];

// ── 탐사(행성 11 — 탐사 화면 지도와 같은 이름) ──
// 레벨 문턱은 여유 있게(보통 진행이면 걸리지 않고, 너무 앞서가는 사람만 잠깐 기다림): 1궤도 Lv1 · 2궤도 Lv4 · 3궤도 Lv8 · 4궤도 Lv13
// 2026-10-16 사용자 개편: 모선(집)에서 탐사선이 다녀옴 · 먼 궤도라고 무조건 어렵지 않게 섞음 · 행성마다 나오는 속성이 다름 · 식물보다 자원이 많은 곳도.
//  행성 변수: hazard 위험(0~3, 실패 · 내구 소모) · rich 풍요(보상 양) · vital 생기(0~2, 종자 개체값) · kind 종자형 seed / 섞임 mixed / 자원형 resource · pool = 나오는 식물(속성 = 그 환경)
//  종자끼리의 확률(어느 식물이 나오나)은 행성만 정함 — 탐사선 부위와 상관없음(사용자 "종자끼리의 확률은 변하지 않는걸로")
export const PLANETS = [
  { id: 'ex_ermias', name: '에르미아스', orbit: 1, hazard: 0, rich: 1, vital: 1, kind: 'seed', pool: ['flower_grass', 'aqua', 'spark', 'vine_water', 'flower_wind'] },   // 온화한 우림 = 여러 속성 고루(시작)
  { id: 'ex_calisto', name: '칼리스토', orbit: 1, hazard: 1, rich: 1.1, vital: 0, kind: 'resource', pool: ['gaia', 'cactus_fire', 'stone_cap', 'mask_vine'] },   // 채굴 잔해 건조 지대 = 대지 · 불 · 부품(나중에 기계)
  { id: 'ex_seraphin', name: '세라핀', orbit: 1, hazard: 0, rich: 1, vital: 1, kind: 'seed', pool: ['flower_wind', 'cactus_wind', 'vine_wind', 'gat_cap'] },   // 부유 고원 = 바람
  { id: 'ex_kairen', name: '카이렌', orbit: 2, hazard: 0, rich: 1.3, vital: 1, kind: 'seed', pool: ['flower_fire', 'flower_grass', 'thorn', 'toxi_cactus'] },   // 따뜻한 들판 = 불 · 풀, 쉬움
  { id: 'ex_mirdin', name: '미르딘', orbit: 2, hazard: 1, rich: 1.1, vital: 2, kind: 'seed', pool: ['thorn', 'spore_cap', 'vine_water', 'jelly_cap', 'fang_trap'] },   // 안개 습지 = 풀 · 물, 생기 높음
  { id: 'ex_volkar', name: '볼카르', orbit: 2, hazard: 2, rich: 1.2, vital: 1, kind: 'mixed', pool: ['spark', 'volt_vine', 'cactus_fire', 'flower_fire', 'blade_vine', 'drake_cactus', 'drum_cactus'] },   // 번개 화산 = 번개 · 불, 위험
  { id: 'ex_veloc', name: '벨로크', orbit: 3, hazard: 3, rich: 1.5, vital: 0, kind: 'resource', pool: ['cactus_fire', 'gaia', 'flower_fire', 'stone_cap', 'ember_cap'], legend: true },   // 용암 바위 사막 = 불 · 대지, 자원 · 아주 위험
  { id: 'ex_aztel', name: '아즈텔', orbit: 3, hazard: 0, rich: 1.3, vital: 1, kind: 'seed', pool: ['flower_wind', 'flower_grass', 'vine_wind', 'gat_cap'] },   // 꽃잎 바람 고원 = 바람 · 풀, 먼데도 쉬움
  { id: 'ex_octavis', name: '옥타비스', orbit: 3, hazard: 1, rich: 1.3, vital: 2, kind: 'seed', pool: ['aqua', 'vine_water', 'jelly_cap'], legend: true },   // 해저 동굴 = 물, 생기 높음
  { id: 'ex_nereidon', name: '네레이돈', orbit: 4, hazard: 2, rich: 1.4, vital: 1, kind: 'mixed', pool: ['vine_water', 'aqua', 'jelly_cap', 'frost_bell'], legend: true },   // 고리 바다 = 물 · 빙결
  { id: 'ex_tiamen', name: '티아멘', orbit: 4, hazard: 3, rich: 1.6, vital: 1, kind: 'mixed', pool: ['frost_bell', 'vine_wind', 'cactus_wind', 'draco_fruit'], legend: true },   // 얼음 바람 = 빙결 · 바람, 아주 위험
];
// 지역(2026-10-16 사용자 "행성 지도에서 지역 고르기" — 지역마다 나오는 속성·종, 위험과 귀한 보상, 종자 위주/부품 위주를 다르게 · 탐사 장치 단계에 따라 하나씩 열림):
//  행성마다 3~4곳 · need = 탐사 장치 단계 · 첫 곳(need 1) = 행성 값 그대로(옛 판과 같은 확률 · 보상 — 다른 값을 넣지 말 것)
//  pool = 그 행성 식물 중 일부(흔한 것을 겹쳐 쓰면 더 자주 · 흔한 것 하나 이상) · dh · dv = 행성 위험 · 생기에 더함(위험 0~3 · 생기 0~2 안으로) · kind = 종자형/섞임/자원형 바꿈
//  rare = 귀한 보상 배수(희귀 종자 18% · 접목 가지 · 회귀 주사 · 보석에 곱함 — 위험이 높은 곳일수록 큼: dh −1 = 0.8 · 0 = 1 · +1 = 1.3 · +2 = 1.6) · mut = 변이 종자 확률 배수(1 · 1.5 · 2)
//  수치는 가볍게(사용자 "벨런스 보고 보정도 나중에")
const REGIONS = {
  ex_ermias: [
    { id: 'grove', name: '우림 입구', need: 1, rare: 1, mut: 1 },
    { id: 'brook', name: '이끼 개울', need: 2, pool: ['aqua', 'aqua', 'vine_water', 'flower_grass'], rare: 1, mut: 1 },   // 물 · 풀
    { id: 'storm', name: '번개 숲', need: 3, pool: ['flower_wind', 'spark'], dh: 1, kind: 'mixed', rare: 1.3, mut: 1.5 },   // 바람 · 번개
    { id: 'vault', name: '시료 창고', need: 4, dh: 1, dv: 1, rare: 1.3, mut: 2 },   // 옛 문명 시료 = 고루 · 생기 높음
  ],
  ex_calisto: [
    { id: 'pit', name: '채굴장', need: 1, rare: 1, mut: 1 },
    { id: 'canyon', name: '마른 협곡', need: 2, pool: ['cactus_fire', 'cactus_fire', 'gaia', 'mask_vine'], dv: 1, kind: 'mixed', rare: 1, mut: 1 },   // 불 선인장 · 종자 늘어남
    { id: 'scrap', name: '기계 무덤', need: 3, pool: ['stone_cap', 'stone_cap', 'gaia'], dh: 1, rare: 1.3, mut: 2 },   // 대지 · 부품(나중에 기계 식물)
  ],
  ex_seraphin: [
    { id: 'hill', name: '바람 언덕', need: 1, rare: 1, mut: 1 },
    { id: 'bridge', name: '구름 다리', need: 2, pool: ['vine_wind', 'vine_wind', 'flower_wind', 'gat_cap'], rare: 1, mut: 1 },
    { id: 'eye', name: '폭풍의 눈', need: 3, pool: ['cactus_wind', 'cactus_wind', 'vine_wind'], dh: 2, dv: 1, kind: 'mixed', rare: 1.6, mut: 2 },
  ],
  ex_kairen: [
    { id: 'field', name: '꽃 들판', need: 1, rare: 1, mut: 1 },
    { id: 'bramble', name: '가시 덤불', need: 2, pool: ['thorn', 'thorn', 'flower_grass', 'toxi_cactus'], dh: 1, rare: 1.3, mut: 1 },   // 풀
    { id: 'ember', name: '불꽃 언덕', need: 3, pool: ['flower_fire', 'flower_fire', 'thorn'], dh: 1, dv: 1, kind: 'mixed', rare: 1.3, mut: 1.5 },   // 불
  ],
  ex_mirdin: [
    { id: 'mire', name: '안개 늪', need: 1, rare: 1, mut: 1 },
    { id: 'shade', name: '그늘 숲', need: 2, pool: ['thorn', 'spore_cap', 'fang_trap'], rare: 1, mut: 1.5 },   // 풀 · 스포어캡
    { id: 'pond', name: '젤리 연못', need: 3, pool: ['vine_water', 'jelly_cap'], dh: 1, kind: 'mixed', rare: 1.3, mut: 1.5 },   // 물 · 젤리캡
  ],
  ex_volkar: [
    { id: 'foot', name: '화산 기슭', need: 1, rare: 1, mut: 1 },
    { id: 'ash', name: '잿빛 들', need: 2, pool: ['flower_fire', 'flower_fire', 'cactus_fire'], dh: -1, kind: 'seed', rare: 0.8, mut: 1 },   // 불 · 덜 위험
    { id: 'thunder', name: '천둥 고개', need: 3, pool: ['volt_vine', 'spark', 'drum_cactus'], dh: 1, rare: 1.3, mut: 2 },   // 번개
    { id: 'lava', name: '용암 광맥', need: 4, pool: ['cactus_fire', 'cactus_fire', 'volt_vine', 'blade_vine', 'drake_cactus'], dh: 1, kind: 'resource', rare: 1.3, mut: 1.5 },   // 부품
  ],
  ex_veloc: [
    { id: 'sands', name: '용암 사막', need: 1, rare: 1, mut: 1 },
    { id: 'crater', name: '식은 화구', need: 2, pool: ['flower_fire', 'flower_fire', 'cactus_fire', 'ember_cap'], dh: -1, dv: 1, kind: 'mixed', rare: 0.8, mut: 1 },   // 불 · 덜 위험
    { id: 'obsidian', name: '흑요석 굴', need: 3, pool: ['gaia', 'stone_cap', 'stone_cap'], dv: 1, rare: 1, mut: 2 },   // 대지 · 부품
  ],
  ex_aztel: [
    { id: 'petal', name: '꽃잎 고원', need: 1, rare: 1, mut: 1 },
    { id: 'pollen', name: '꽃가루 계곡', need: 2, pool: ['flower_grass', 'flower_grass', 'flower_wind'], dv: 1, rare: 1, mut: 1 },   // 풀 · 생기 높음
    { id: 'gust', name: '돌개바람 절벽', need: 3, pool: ['vine_wind', 'vine_wind', 'flower_wind'], dh: 2, kind: 'mixed', rare: 1.6, mut: 1.5 },   // 바람 · 위험
  ],
  ex_octavis: [
    { id: 'shallow', name: '얕은 동굴', need: 1, rare: 1, mut: 1 },
    { id: 'crystal', name: '수정 동굴', need: 2, pool: ['aqua', 'jelly_cap'], dh: 1, kind: 'resource', rare: 1.3, mut: 1.5 },   // 부품
    { id: 'trench', name: '심해 해구', need: 3, pool: ['vine_water', 'jelly_cap'], dh: 2, rare: 1.6, mut: 2 },   // 젤리캡 · 아주 위험
  ],
  ex_nereidon: [
    { id: 'waves', name: '물결 바다', need: 1, rare: 1, mut: 1 },
    { id: 'reef', name: '산호 섬', need: 2, pool: ['aqua', 'aqua', 'vine_water'], dh: -1, dv: 1, kind: 'seed', rare: 0.8, mut: 1 },   // 물 · 덜 위험 · 생기 높음
    { id: 'ring', name: '얼음 고리', need: 3, pool: ['vine_water', 'aqua', 'frost_bell'], dh: 1, rare: 1.3, mut: 1.5 },   // 빙결
    { id: 'glacier', name: '빙하 해구', need: 4, pool: ['vine_water', 'jelly_cap', 'frost_bell'], dh: 1, kind: 'resource', rare: 1.3, mut: 2 },   // 부품
  ],
  ex_tiamen: [
    { id: 'blizzard', name: '눈보라 벌판', need: 1, rare: 1, mut: 1 },
    { id: 'hollow', name: '바람굴', need: 2, pool: ['cactus_wind', 'vine_wind', 'vine_wind'], dh: -1, kind: 'seed', rare: 0.8, mut: 1 },   // 바람 · 덜 위험
    { id: 'spire', name: '얼음 첨탑', need: 3, pool: ['cactus_wind', 'frost_bell', 'draco_fruit'], dv: 1, rare: 1, mut: 2 },   // 빙결 · 생기 높음
  ],
};
for (const p of PLANETS) p.regions = REGIONS[p.id];
export const KIND_NAME = { seed: '종자가 많아요', mixed: '종자 · 자원 섞임', resource: '자원이 많아요' };
// ── 리그 · 시즌(1:1 토너먼트) — 리그는 단계별(성장 설계 2026-10-15 "리그는 단계별(어린 · 자라는 · 무제한)"), 리그마다 단계 사다리(브론즈 → 풀로세움) 따로
//  시즌 = 2주. 끝나면 리그마다 그 시즌 가장 높이 간 단계로 상자(돈 · 보석 · 연료 캡슐 · 골드부터 칭호) → 모든 리그가 두 단계 내려가 예선부터
export const LEAGUES = { sprout: { name: '새싹 리그', short: '새싹', cap: 0, desc: '어린 식물만' }, growing: { name: '자람 리그', short: '자람', cap: 1, desc: '자라는 단계까지' }, open: { name: '무제한 리그', short: '무제한', cap: 2, desc: '단계 제한 없음' } };
export const LEAGUE_KEYS = Object.keys(LEAGUES);
export const TIERS = ['브론즈', '실버', '골드', '플래티넘', '다이아', '마스터', '풀로세움'];
export const SEASON = { days: 14, epoch: Date.UTC(2026, 9, 12, 15) };   // 2026-10-13(화) 0시(한국) 시작, 2주마다
export const seasonOf = now => 1 + Math.floor((now - SEASON.epoch) / (SEASON.days * 864e5));
export const seasonEnd = n => SEASON.epoch + n * SEASON.days * 864e5;
export const seasonReward = tier => ({ credits: 150 + 150 * tier, gems: 3 * tier, fuel: 1 + Math.floor(tier / 2) });
// 탐사선 부위(사용자 정리: 연료 탱크 = 거리 · 내구성 = 성공/실패 · 탐사 장치 = 질 좋은 보상(종자 제외) · 채집기 = 보상 수 · 종자 보관함 = 종자 개체값)
export const PROBE = {
  tank: { name: '연료 탱크', max: 4, desc: '갈 수 있는 궤도가 넓어져요' },
  hull: { name: '내구성', max: 5, desc: '위험한 곳에서도 탐사에 성공해요' },
  scanner: { name: '탐사 장치', max: 5, desc: '새 지역이 열리고 귀한 보상이 올라요' },
  cargo: { name: '채집기', max: 5, desc: '가져오는 보상이 늘어요(무거워 위험한 곳은 내구성이 더 필요해요)' },
  vault: { name: '종자 보관함', max: 5, desc: '종자 개체값이 좋게 나올 확률이 올라요' },
};
export const PROBE_KEYS = Object.keys(PROBE);
export const probeUpCost = lv => ({ credits: Math.round(150 * Math.pow(lv, 1.5) / 10) * 10, parts: 3 * lv });   // lv → lv+1
// 탐사선 스펙 = 필수(연료 탱크 = 궤도 · 탐사 장치 = 지역 단계 — 모자라면 못 감) + 권장(내구성 — 모자라면 실패할 수 있음, logic exploreOdds) · 내구도(닳고 고치기)는 2026-10-16 없앰
export const EXPLORE_COST = { 1: 40, 2: 70, 3: 110, 4: 160 };                     // 탐사 한 번 = 연료 캡슐 1 + 이 돈(사용자 "탐사에는 돈이 필요하고, 잘 아껴 써야") — 탐사로 얻는 돈의 평균은 늘 이보다 적게
export const ORBIT_LV = { 1: 1, 2: 4, 3: 8, 4: 13 };
export const FUEL = { max: 3, regenMin: 480 };               // 연료 캡슐: 무료로는 8시간에 1(하루 3) · 그 밖에 레벨업 상자 · 대결 승리 · 보석 상점(사용자 "뽑기 쿠폰처럼" — 돈만으로 무한 탐사 막기)
export const SHINY_P = 1 / 64, LEGEND_P = 1 / 120, TRAIT_P = 0.12;   // 색 변종 · 전설(전설 행성만) · 관상용/열매용

// ── 상점(돈 = 종자·화분, 보석 = 물·비료·회귀 주사 — 사용자 "상점에서는 유료 재화로 구매") ──
export const SHOP = [
  { id: 'seed_common', name: '일반 종자 꾸러미', cost: { credits: 120 }, give: { seed: 'common' } },
  { id: 'seed_rare', name: '희귀 종자 꾸러미', cost: { credits: 480 }, give: { seed: 'rare' } },
  { id: 'card_basic', name: '일반 카드 꾸러미', cost: { credits: 300 }, give: { card: 'normal' } },   // 카드(2026-10-17) — 일반 식물용
  { id: 'card_mut', name: '변이 카드 꾸러미', cost: { gems: 18 }, give: { card: 'mut' } },          // 변이 식물용(가진 변이 쪽이 자주)
  { id: 'water10', name: '물 10', cost: { gems: 6 }, give: { water: 10 } },
  { id: 'fert5', name: '비료 5', cost: { gems: 8 }, give: { fert: 5 } },
  { id: 'regress1', name: '유전자 회귀 주사', cost: { gems: 15 }, give: { regress: 1 } },
  { id: 'fuel3', name: '연료 캡슐 3', cost: { gems: 5 }, give: { fuel: 3 } },
];
// 암시장(컨셉) = 판매(돈, 무조건·적게) · 해체(접목 가지 등 무작위, 많이 키울수록 좋은 것 확률 ↑)
export const SELL_BASE = { common: 40, rare: 110 };
