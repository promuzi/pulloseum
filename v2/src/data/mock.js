// 화면 시안용 상태(이름·기술·스탯은 옛 게임에서 뽑은 실제 값). 2단계에서 실제 게임 규칙 상태로 교체한다.
export const SPECIES = {
  flower_grass: { name: '페탈로즈', type: 'flower', el: 'grass', rarity: 'common' },
  thorn:        { name: '쏜위드', type: 'vine', el: 'grass', rarity: 'common' },
  aqua:         { name: '아쿠아벌브', type: 'flower', el: 'water', rarity: 'common' },
  flower_wind:  { name: '윈드페탈', type: 'flower', el: 'wind', rarity: 'common' },
  spark:        { name: '스파크번', type: 'flower', el: 'bolt', rarity: 'rare' },
  vine_water:   { name: '타이드바인', type: 'vine', el: 'water', rarity: 'common' },
  cactus_fire:  { name: '엠버캑터', type: 'cactus', el: 'fire', rarity: 'common' },
  gaia:         { name: '가이아록', type: 'cactus', el: 'earth', rarity: 'common' },
  flower_fire:  { name: '블레이즈블룸', type: 'flower', el: 'fire', rarity: 'common' },
  cactus_wind:  { name: '게일캑터', type: 'cactus', el: 'wind', rarity: 'common' },
  vine_wind:    { name: '게일바인', type: 'vine', el: 'wind', rarity: 'common' },
  spore_cap:    { name: '스포어캡', type: 'mushroom', el: 'grass', rarity: 'rare' },
};
export const STAGE_NAME = {
  flower: { sprout: '새싹', juvenile: '새잎', growing: '꽃봉오리', mature: '개화', evolved: '만개' },
  vine: { sprout: '새순', juvenile: '어린덩굴', growing: '덩굴손', mature: '성체덩굴', evolved: '만연덩굴' },
  cactus: { sprout: '움', juvenile: '어린기둥', growing: '가시몸', mature: '성체선인장', evolved: '꽃선인장' },
  mushroom: { sprout: '균사', juvenile: '버섯눈', growing: '어린갓', mature: '성숙버섯', evolved: '포자갓' },
  tree: { sprout: '떡잎', juvenile: '묘목', growing: '어린나무', mature: '성목', evolved: '거목' },
};
export const CAT_ICON = { attack: 'sword', guard: 'shield', evade: 'speed', buff: 'up', debuff: 'down', heal_hp: 'heal', heal_energy: 'energy' };
export const CAT_NAME = { attack: '공격', guard: '방어', evade: '회피', buff: '강화', debuff: '약화', heal_hp: '회복', heal_energy: '에너지' };

const KIT_PETAL = [
  { id: 'a', name: '꽃대 찌르기', cost: 0, power: 125, cats: ['attack'], el: null },
  { id: 'b', name: '꽃받침 오므리기', cost: 0, power: 0, cats: ['guard', 'buff'], el: null },
  { id: 'c', name: '새순 감기', cost: 2, power: 0, cats: ['buff'], el: 'grass' },
  { id: 'd', name: '덩굴 새순', cost: 1, power: 55, cats: ['attack'], el: 'grass' },
];

// 동면 보관고 시험 데이터(37그루): 종·등급·단계를 돌려 가며
const GRADES = ['S', 'A', 'B', 'C', 'D'], STAGES = ['sprout', 'juvenile', 'growing', 'mature'];
const STORE_KEYS = ['flower_grass', 'thorn', 'aqua', 'flower_wind', 'spark', 'vine_water', 'cactus_fire', 'gaia', 'flower_fire', 'cactus_wind', 'vine_wind', 'spore_cap'];
function mockStorage() {
  return Array.from({ length: 37 }, (_, i) => {
    const key = STORE_KEYS[(i * 5 + 3) % STORE_KEYS.length];
    return { id: 100 + i, key, name: SPECIES[key].name + (i >= 12 ? '-' + (Math.floor(i / 12) + 1) : ''), grade: GRADES[(i * 3 + 1) % 5], stage: STAGES[(i * 7) % 4], pot: 'pot_terra', days: 1 + ((i * 13) % 40) };
  });
}

export function mockState() {
  return {
    level: 3, exp: 34, expMax: 90, credits: 1240, gems: 12,
    active: 0,
    plants: [
      { id: 1, key: 'flower_grass', name: '페탈로즈', grade: 'A', stage: 'mature', exp: 12, expNext: 45, pot: 'pot_terra', fruit: { have: 3, max: 3, gauge: 1 },
        stats: { hp: 100, atk: 35, def: 24, spd: 30, acc: 86, elem: 14, crit: 5, energy: 2 },
        lv: { hp: 2, atk: 3, def: 1, spd: 1, acc: 1, elem: 1, crit: 1, energy: 1 }, kit: KIT_PETAL,
        known: [...KIT_PETAL, { id: 'e', name: '덩굴 일격', cost: 2, power: 140, cats: ['attack'], el: 'grass', lock: '새잎에서' }] ,
        rank: { tier: '브론즈', pts: 40, next: 300 } },
      { id: 2, key: 'cactus_fire', name: '엠버캑터', grade: 'S', stage: 'growing', pot: 'pot_ceramic', fruit: { have: 1, max: 3, gauge: 0.62 } },
      { id: 3, key: 'vine_water', name: '타이드바인', grade: 'D', stage: 'juvenile', pot: 'pot_terra', fruit: { have: 0, max: 2, gauge: 0.18 } },
      { id: 4, key: 'thorn', name: '쏜위드', grade: 'B', stage: 'sprout', pot: 'pot_terra', fruit: { have: 2, max: 3, gauge: 0.4 } },
      { id: 5, key: 'aqua', name: '아쿠아벌브', grade: 'C', stage: 'growing', pot: 'pot_glass', fruit: { have: 0, max: 2, gauge: 0.82 } },
      { id: 6, key: 'spark', name: '스파크번', grade: 'A', stage: 'mature', pot: 'pot_terra', fruit: { have: 3, max: 3, gauge: 1 } },
    ],
    slots: 8, slotsMax: 12,   // 양육(스마트팜) 자리 = 열린 수 · 최대
    // 내 프로필(홈 배너 — 2026-10-15 사용자 "그 아래에 배너처럼 내 프로필 설정하게"): 이름 · 칭호 · 대표 식물(얼굴) · 배너 색
    profile: { name: '재배사', title: '꿈꾸는 원예가', avatar: 'flower_grass', color: 0 },
    titles: ['초보 재배사', '꿈꾸는 원예가', '콜로세움 신인', '별빛 수집가'],
    storageMax: 120,          // 동면 보관고(2026-10-15 사용자 "보관해 둘 수 있는 양은 100개 정도 이상으로")
    storage: mockStorage(),
    seeds: [
      { id: 's1', name: '무지개 종자', rainbow: true, price: 40 },
      { id: 's2', key: 'flower_wind', name: '윈드페탈 종자', rarity: 'common', price: 40, from: '세라핀 · 윈드테라스' },
      { id: 's3', key: 'spark', name: '스파크번 종자', rarity: 'rare', price: 120, from: '에르미아스 · 토르시단' },
      { id: 's4', key: 'gaia', name: '가이아록 종자', rarity: 'common', price: 40, from: '칼리스토 · 세이라 분지' },
    ],
    bagMax: 20,
    tournament: { tier: '브론즈', name: '새싹 브론즈', round: '예선', wins: 1, losses: 0, bestOf: 5 },
    mode: 'tournament', team: [0, 1, 2], swap3: { wins: 0, losses: 0 },   // 전투 종류 · 3:3 교체전 내 팀(식물 번호) · 교체전 승패
    care: { water: 3, fert: 1 },
    discovered: ['flower_grass', 'cactus_fire', 'vine_water', 'thorn', 'aqua', 'gaia'],
  };
}

export function mockBattle(phase = 'pick') {
  return {
    phase, turn: phase === 'pick' ? 1 : 2, round: '예선', roundNo: 2, bestOf: 5, wins: 1,
    me: { key: 'flower_grass', name: '페탈로즈', el: 'grass', pot: 'pot_terra', hp: 100, max: 100, energy: 2, energyMax: 8, trainer: '재배사' },
    foe: { key: 'vine_water', name: '타이드바인', el: 'water', pot: 'pot_terra', hp: phase === 'pick' ? 112 : 48, max: 112, energy: 3, energyMax: 8, trainer: '코스모싹', rank: '브론즈 2' },
    kit: KIT_PETAL,
    picked: 'a',
    hit: phase === 'hit' ? { side: 'foe', dmg: 64, mult: 1.5 } : null,
  };
}
