'use strict';

const fs = require('fs');
const path = require('path');
const AlienPlantGameData = require('../data/alien-plant-pvp-data.js');

const source = AlienPlantGameData.gameData;

const ELEMENTS = [
  { id: 'fire', name: '불', strong_against: ['grass', 'ice'], color: '#ff6b4a' },
  { id: 'water', name: '물', strong_against: ['fire', 'ground'], color: '#4ac6ff' },
  { id: 'grass', name: '풀', strong_against: ['water', 'ground'], color: '#6bdd6b' },
  { id: 'thunder', name: '번개', strong_against: ['water', 'wind'], color: '#ffe14a' },
  { id: 'ground', name: '대지', strong_against: ['thunder', 'fire'], color: '#c9a26b' },
  { id: 'ice', name: '빙결', strong_against: ['grass', 'wind'], color: '#a8d8ff' },
  { id: 'wind', name: '바람', strong_against: ['grass', 'ground'], color: '#9adbe8' },
  { id: 'poison', name: '독초', strong_against: ['grass'], color: '#c77dff' },
];

const SPECIES_TYPES = [
  { id: 'grass', name: '풀', description: '균형 잡힌 성장과 회복형 스킬에 강한 기본 식물군.' },
  { id: 'tree', name: '나무', description: '체력과 방어가 높고 장기전에 강한 식물군.' },
  { id: 'vine', name: '덩굴', description: '속도와 제어 스킬에 강한 식물군.' },
  { id: 'flower', name: '꽃', description: '특수 공격과 상태 이상에 강한 식물군.' },
  { id: 'cactus', name: '선인장', description: '대지 속성과 반격형 전투에 강한 식물군.' },
  { id: 'succulent', name: '다육식물', description: '높은 안정성과 포식/DNA 계열 특성에 강한 식물군.' },
];

const GROWTH_STAGES = [
  { id: 'seed', name: '씨앗', min_level: 1, exp_to_next: 40, skill_slots: 2, stat_multiplier: 0.75 },
  { id: 'sprout', name: '새싹', min_level: 10, exp_to_next: 90, skill_slots: 3, stat_multiplier: 0.95 },
  { id: 'juvenile', name: '유체', min_level: 20, exp_to_next: 160, skill_slots: 4, stat_multiplier: 1.15 },
  { id: 'grown', name: '성장체', min_level: 30, exp_to_next: 260, skill_slots: 5, stat_multiplier: 1.35 },
  { id: 'adult', name: '성체', min_level: 40, exp_to_next: 0, skill_slots: 6, stat_multiplier: 1.6 },
];

const STORAGE_ENVIRONMENTS = [
  { id: 'general', name: '일반 보관', grade: 0, description: '대부분의 하급 종자를 보관한다.' },
  { id: 'chilled', name: '저온 보관', grade: 1, description: '냉기/수분 반응 종자를 안정화한다.' },
  { id: 'high_pressure', name: '고압 보관', grade: 2, description: '금속질, 중력질, 심해성 종자를 보관한다.' },
  { id: 'toxic_isolation', name: '독성 격리', grade: 3, description: '포식형과 독성 포자 종자를 격리한다.' },
  { id: 'bio_stable', name: '생체 안정화', grade: 4, description: '정신, 결정, 전설급 종자를 보존한다.' },
];

const RANK_TIERS = [
  { id: 'bronze', name: '브론즈', min_points: 0, reward_multiplier: 1.0 },
  { id: 'silver', name: '실버', min_points: 120, reward_multiplier: 1.2 },
  { id: 'gold', name: '골드', min_points: 280, reward_multiplier: 1.45 },
  { id: 'platinum', name: '플레티넘', min_points: 520, reward_multiplier: 1.8 },
  { id: 'diamond', name: '다이아', min_points: 840, reward_multiplier: 2.2 },
  { id: 'master', name: '마스터', min_points: 1200, reward_multiplier: 2.8 },
  { id: 'pluloseum', name: '풀로세움', min_points: 1700, reward_multiplier: 3.5 },
];

const SKILLS = [
  { id: 'seed_shot', name: '씨앗탄', element: 'grass', category: 'attack', power: 28, energy_cost: 1, accuracy: 0.96, description: '작은 씨앗을 발사한다.' },
  { id: 'photosynthesis', name: '광합성', element: 'grass', category: 'support', power: 0, energy_cost: 2, accuracy: 1.0, heal_ratio: 0.22, description: '체력을 회복한다.' },
  { id: 'root_guard', name: '뿌리 방어', element: 'ground', category: 'guard', power: 0, energy_cost: 1, accuracy: 1.0, defense_buff: 0.18, description: '방어력을 높인다.' },
  { id: 'thorn_whip', name: '가시 채찍', element: 'grass', category: 'attack', power: 34, energy_cost: 1, accuracy: 0.92, description: '가시 달린 줄기로 공격한다.' },
  { id: 'bind_vine', name: '속박 덩굴', element: 'grass', category: 'control', power: 18, energy_cost: 2, accuracy: 0.9, speed_debuff: 0.18, description: '상대 속도를 낮춘다.' },
  { id: 'flame_petal', name: '화염 꽃잎', element: 'fire', category: 'attack', power: 42, energy_cost: 2, accuracy: 0.9, description: '불꽃 잎을 흩뿌린다.' },
  { id: 'aqua_vine', name: '수류 덩굴', element: 'water', category: 'attack', power: 38, energy_cost: 2, accuracy: 0.93, description: '물줄기와 덩굴로 공격한다.' },
  { id: 'stone_root', name: '암석 뿌리', element: 'ground', category: 'attack', power: 40, energy_cost: 2, accuracy: 0.9, description: '대지를 뚫는 뿌리로 공격한다.' },
  { id: 'frost_bloom', name: '빙결 개화', element: 'ice', category: 'attack', power: 40, energy_cost: 2, accuracy: 0.9, speed_debuff: 0.12, description: '차가운 꽃가루를 터뜨린다.' },
  { id: 'gust_leaf', name: '돌풍 잎새', element: 'wind', category: 'attack', power: 36, energy_cost: 1, accuracy: 0.95, description: '빠른 바람 잎으로 공격한다.' },
  { id: 'spark_pollen', name: '전격 꽃가루', element: 'thunder', category: 'attack', power: 40, energy_cost: 2, accuracy: 0.9, speed_debuff: 0.15, description: '전류를 품은 꽃가루를 방출한다.' },
  { id: 'toxic_sap', name: '독성 수액', element: 'poison', category: 'status', power: 20, energy_cost: 2, accuracy: 0.88, poison: 3, description: '지속 피해를 주는 독을 부여한다.' },
  { id: 'iron_bark', name: '철갑 수피', element: 'ground', category: 'guard', power: 0, energy_cost: 2, accuracy: 1.0, defense_buff: 0.32, description: '단단한 껍질로 버틴다.' },
  { id: 'predatory_bite', name: '포식 교합', element: 'poison', category: 'attack', power: 46, energy_cost: 3, accuracy: 0.86, lifesteal: 0.25, description: '피해 일부를 흡수한다.' },
  { id: 'dna_absorb', name: 'DNA 흡수', element: 'poison', category: 'support', power: 10, energy_cost: 3, accuracy: 0.84, lifesteal: 0.35, description: '상대의 능력을 조금 빼앗는다.' },
  { id: 'solar_burst', name: '태양 폭발', element: 'fire', category: 'attack', power: 55, energy_cost: 3, accuracy: 0.84, description: '고위 성장체가 쓰는 강한 광열 공격.' },
  { id: 'gravity_press', name: '중력 압착', element: 'ground', category: 'control', power: 48, energy_cost: 3, accuracy: 0.86, speed_debuff: 0.24, description: '중력으로 상대 움직임을 누른다.' },
  { id: 'psionic_lull', name: '정신 수면향', element: 'wind', category: 'control', power: 30, energy_cost: 3, accuracy: 0.82, attack_debuff: 0.2, description: '정신성 향기로 공격력을 낮춘다.' },
];

const speciesMap = {
  moss: { species_kind: 'grass', element: 'grass', storage: 'general', skills: ['seed_shot', 'photosynthesis', 'root_guard', 'thorn_whip', 'gust_leaf', 'solar_burst'] },
  bulb: { species_kind: 'grass', element: 'water', storage: 'chilled', skills: ['aqua_vine', 'photosynthesis', 'root_guard', 'toxic_sap', 'seed_shot', 'frost_bloom'] },
  vine: { species_kind: 'vine', element: 'grass', storage: 'general', skills: ['thorn_whip', 'bind_vine', 'seed_shot', 'gust_leaf', 'photosynthesis', 'spark_pollen'] },
  fungal_tree: { species_kind: 'tree', element: 'poison', storage: 'toxic_isolation', skills: ['toxic_sap', 'root_guard', 'seed_shot', 'iron_bark', 'photosynthesis', 'dna_absorb'] },
  carnivorous_pod: { species_kind: 'succulent', element: 'poison', storage: 'toxic_isolation', skills: ['predatory_bite', 'toxic_sap', 'bind_vine', 'seed_shot', 'dna_absorb', 'gravity_press'] },
  metal_reed: { species_kind: 'tree', element: 'ground', storage: 'high_pressure', skills: ['stone_root', 'iron_bark', 'thorn_whip', 'root_guard', 'spark_pollen', 'gravity_press'] },
  psionic_lotus: { species_kind: 'flower', element: 'wind', storage: 'bio_stable', skills: ['psionic_lull', 'gust_leaf', 'photosynthesis', 'frost_bloom', 'bind_vine', 'solar_burst'] },
  crystal_flower: { species_kind: 'flower', element: 'ice', storage: 'bio_stable', skills: ['frost_bloom', 'seed_shot', 'photosynthesis', 'gust_leaf', 'spark_pollen', 'solar_burst'] },
  gravity_cactus: { species_kind: 'cactus', element: 'ground', storage: 'high_pressure', skills: ['stone_root', 'gravity_press', 'root_guard', 'thorn_whip', 'iron_bark', 'toxic_sap'] },
  storm_orchid: { species_kind: 'flower', element: 'thunder', storage: 'bio_stable', skills: ['spark_pollen', 'gust_leaf', 'seed_shot', 'psionic_lull', 'flame_petal', 'solar_burst'] },
};

const rarityWeight = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
const storageById = Object.fromEntries(STORAGE_ENVIRONMENTS.map(item => [item.id, item]));
const growthStageIdMap = { seed: 'seed', sprout: 'sprout', juvenile: 'juvenile', mature: 'grown', evolved: 'adult' };

function cleanStats(stats = {}) {
  return {
    hp: Math.max(1, Number(stats.hp || 42)),
    attack: Math.max(1, Number(stats.attack || 10)),
    defense: Math.max(1, Number(stats.defense || 8)),
    speed: Math.max(1, Number(stats.speed || 8)),
    energy: Math.max(1, Number(stats.energy || 3)),
  };
}

function seedMeta(seed) {
  const meta = speciesMap[seed.base_species_type] || speciesMap.moss;
  return {
    species_kind: meta.species_kind,
    element: meta.element,
    required_storage_environment: meta.storage,
    storage_grade_required: storageById[meta.storage].grade,
    initial_skills: meta.skills.slice(0, 2),
    learnable_skills: meta.skills.slice(0, 6),
  };
}

function stageSkillUnlocks(seed) {
  const skills = seedMeta(seed).learnable_skills;
  return {
    seed: skills.slice(0, 2),
    sprout: skills.slice(0, 3),
    juvenile: skills.slice(0, 4),
    grown: skills.slice(0, 5),
    adult: skills.slice(0, 6),
  };
}

function transformSeed(seed) {
  const meta = seedMeta(seed);
  const stats = cleanStats(seed.base_stats);
  const rarity = rarityWeight[seed.rarity] || 1;
  return {
    ...seed,
    ...meta,
    base_stats: stats,
    growth_profile: {
      exp_multiplier: Number((1 + rarity * 0.12).toFixed(2)),
      max_trait_slots: Math.min(5, 2 + rarity),
      max_skill_slots: 6,
    },
    stage_skill_unlocks: stageSkillUnlocks(seed),
  };
}

function transformRegion(region) {
  return {
    ...region,
    required_storage_environment: region.required_storage_environment || 'general',
    max_seed_rewards: Math.max(1, Math.min(3, Math.ceil((region.difficulty || 1) / 2))),
    success_formula: 'base_success_rate + ship.scanner_bonus + equipment_bonus - danger_penalty',
  };
}

function transformItem(item) {
  return {
    ...item,
    rarity: item.rarity || (item.price >= 700 ? 'rare' : item.price >= 300 ? 'uncommon' : 'common'),
    stackable: item.item_type !== 'equipment',
  };
}

const extraItems = [
  { id: 'item_basic_fertilizer', name: '하급 비료', item_type: 'nutrient', rarity: 'common', description: '성장 경험치를 조금 올린다.', target_trait_category: 'growth', effect: { growth_exp: 25 }, price: 40, stackable: true },
  { id: 'item_growth_nutrient', name: '영양제', item_type: 'nutrient', rarity: 'uncommon', description: '성장 경험치를 크게 올린다.', target_trait_category: 'growth', effect: { growth_exp: 70 }, price: 140, stackable: true },
  { id: 'item_trait_toolkit', name: '특성 장비 키트', item_type: 'equipment', rarity: 'uncommon', description: '특성 장착칸에 장비하는 범용 키트.', target_trait_category: 'utility', effect: { trait_power: 0.1 }, price: 260, stackable: false },
  { id: 'item_antidote_vial', name: '해독 앰플', item_type: 'stabilizer', rarity: 'common', description: '독 상태와 불안정성을 낮춘다.', target_trait_category: 'utility', effect: { poison_cleanse: true, stability: 4 }, price: 90, stackable: true },
  { id: 'item_dna_splice', name: '포식 DNA', item_type: 'mutagen', rarity: 'rare', description: '포식형 특성을 강화하는 DNA 시약.', target_trait_category: 'mutation', effect: { unlock_trait: 'predatory' }, price: 520, stackable: true },
];

const data = {
  version: 'pluloseum-godot-mvp-1',
  source_version: source.version,
  interface_concept: {
    main_tabs: ['종자 탐색', '식물 키우기/전투', '상점', '모드', '길드'],
    greenhouse_slots: 12,
    seed_storage_capacity_max: 50,
    skill_slots_max: 6,
    trait_slots_max: 5,
  },
  elements: ELEMENTS,
  species_types: SPECIES_TYPES,
  growth_stages: GROWTH_STAGES,
  storage_environments: STORAGE_ENVIRONMENTS,
  rank_tiers: RANK_TIERS,
  skills: SKILLS,
  planets: source.planets,
  regions: source.regions.map(transformRegion),
  seeds: source.seeds.map(transformSeed),
  traits: source.traits,
  items: source.items.map(transformItem).concat(extraItems),
  tournaments: source.tournaments.map((tournament, index) => ({
    ...tournament,
    required_growth_stage: growthStageIdMap[tournament.required_growth_stage] || tournament.required_growth_stage,
    tier: RANK_TIERS[Math.min(index, RANK_TIERS.length - 1)].id,
    bracket_sizes: tournament.bracket_size >= 64 ? [64] : [4, 16, tournament.bracket_size],
    loss_rule: tournament.bracket_size >= 64 ? 'one_chance_then_qualifier' : 'score_based_reward',
  })),
};

const outPath = path.join(__dirname, '..', 'data', 'pluloseum_godot_data.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Wrote ${outPath}`);
