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

// 식물 12(그림이 있는 것) — 가지 = 가까운 식물 무리(중간 층 기술을 나눠 가짐)
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
};
for (const k of Object.keys(SPECIES)) SPECIES[k].base = base(SPECIES[k].type, SPECIES[k].el);
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
  // 빙결(빙결 식물은 아직 — 접목으로만)
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
  S('u_aqua_1', '물방울', 'water', 'u', 60, 1, { ranged: true, inflict: { id: 'wet' } }),
  S('u_aqua_2', '물거품 방패', 'water', 'u', 0, 2, { self: 'shield', also: 'purify' }),
  S('u_aqua_3', '물방울 세례', 'water', 'u', 100, 3, { ranged: true, inflict: { id: 'wet' } }),
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
].map(s => [s.id, s]));
const UNI = { flower_grass: 'petal', thorn: 'thorn', aqua: 'aqua', flower_wind: 'wind', spark: 'spark', vine_water: 'tide', cactus_fire: 'ember', gaia: 'gaia', flower_fire: 'blaze', cactus_wind: 'gale', vine_wind: 'gvine', spore_cap: 'spore' };
export const uniqueOf = (key, stage) => `u_${UNI[key]}_${stage + 1}`;
export const TIER_NAME = { u: '개성', c1: '하급', c2: '중급', c3: '상급', g: '가지', s: '특수' };
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
  fuel: { name: '탐사 연료', icon: 'energy', desc: '탐사 한 번' },
};
export const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legend'];
export const RARITY_COL = ['#e8eef4', '#7cf0a0', '#6fb8ff', '#c48cff', '#ffb04a'];   // 흰 · 초록 · 파랑 · 보라 · 주황(옛 판 5색과 같음)

// ── 재배사 레벨 ──
export const userNeed = L => 60 + 40 * L;
export const XP = { botWin: 30, botLose: 12, pvpWin: 40, pvpLose: 15, explore: 18, harvest: 2, evolve: 25, plant: 5 };
export const FARM_START = 3, FARM_MAX = 12;
export const farmSlots = L => Math.min(FARM_MAX, FARM_START + [2, 3, 5, 7, 9, 12, 15, 18, 21].filter(x => L >= x).length);
// 레벨업 보상(클래시로얄 왕 레벨처럼 — 상자 하나): 돈 · 물 · 비료 + 가끔 보석 · 회귀 주사 · 종자
export function levelReward(L) {
  const r = { credits: 120 + 60 * L, water: 3 + Math.floor(L / 2), fert: 1 + Math.floor(L / 3), gems: L % 3 === 0 ? 10 : 0 };
  if (L % 4 === 0) r.regress = 1;
  if (L % 5 === 0) r.seed = 'rare';
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
export const PLANETS = [
  { id: 'ex_ermias', name: '에르미아스', orbit: 1, pool: ['flower_grass', 'aqua', 'spark', 'vine_water'] },
  { id: 'ex_calisto', name: '칼리스토', orbit: 1, pool: ['gaia', 'cactus_fire', 'thorn'] },
  { id: 'ex_seraphin', name: '세라핀', orbit: 1, pool: ['flower_wind', 'cactus_wind', 'vine_wind'] },
  { id: 'ex_kairen', name: '카이렌', orbit: 2, pool: ['flower_fire', 'flower_grass', 'spore_cap'] },
  { id: 'ex_mirdin', name: '미르딘', orbit: 2, pool: ['thorn', 'spore_cap', 'vine_wind'] },
  { id: 'ex_volkar', name: '볼카르', orbit: 2, pool: ['spark', 'cactus_fire', 'flower_fire'] },
  { id: 'ex_veloc', name: '벨로크', orbit: 3, pool: ['cactus_fire', 'gaia', 'flower_fire'], legend: true },
  { id: 'ex_aztel', name: '아즈텔', orbit: 3, pool: ['flower_grass', 'flower_wind', 'spark'] },
  { id: 'ex_octavis', name: '옥타비스', orbit: 3, pool: ['aqua', 'vine_water', 'spore_cap'], legend: true },
  { id: 'ex_nereidon', name: '네레이돈', orbit: 4, pool: ['vine_water', 'aqua', 'thorn'], legend: true },
  { id: 'ex_tiamen', name: '티아멘', orbit: 4, pool: ['vine_wind', 'cactus_wind', 'gaia'], legend: true },
];
export const ORBIT_LV = { 1: 1, 2: 4, 3: 8, 4: 13 };
export const FUEL = { max: 5, regenMin: 12 };                // 연료: 12분에 1, 최대 5(탐사 1번 = 1)
export const SHINY_P = 1 / 64, LEGEND_P = 1 / 120, TRAIT_P = 0.12;   // 색 변종 · 전설(전설 행성만) · 관상용/열매용

// ── 상점(돈 = 종자·화분, 보석 = 물·비료·회귀 주사 — 사용자 "상점에서는 유료 재화로 구매") ──
export const SHOP = [
  { id: 'seed_common', name: '일반 종자 꾸러미', cost: { credits: 120 }, give: { seed: 'common' } },
  { id: 'seed_rare', name: '희귀 종자 꾸러미', cost: { credits: 480 }, give: { seed: 'rare' } },
  { id: 'water10', name: '물 10', cost: { gems: 6 }, give: { water: 10 } },
  { id: 'fert5', name: '비료 5', cost: { gems: 8 }, give: { fert: 5 } },
  { id: 'regress1', name: '유전자 회귀 주사', cost: { gems: 15 }, give: { regress: 1 } },
  { id: 'fuel3', name: '탐사 연료 3', cost: { gems: 5 }, give: { fuel: 3 } },
];
// 암시장(컨셉) = 판매(돈, 무조건·적게) · 해체(접목 가지 등 무작위, 많이 키울수록 좋은 것 확률 ↑)
export const SELL_BASE = { common: 40, rare: 110 };
