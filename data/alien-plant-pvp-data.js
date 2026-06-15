'use strict';

const AlienPlantGameData = (() => {
  const DATA_VERSION = 'alien-plant-pvp-v1';

  const ENUMS = {
    rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    species_types: [
      'moss',
      'bulb',
      'vine',
      'fungal_tree',
      'carnivorous_pod',
      'metal_reed',
      'psionic_lotus',
      'crystal_flower',
      'gravity_cactus',
      'storm_orchid',
    ],
    growth_stages: ['seed', 'sprout', 'juvenile', 'mature', 'evolved'],
    trait_categories: ['offense', 'defense', 'mobility', 'growth', 'mutation', 'utility', 'control', 'support'],
    item_types: ['nutrient', 'mutagen', 'stabilizer', 'graft', 'equipment', 'ticket'],
    stat_keys: ['hp', 'attack', 'defense', 'speed', 'energy'],
  };

  const REQUIRED_FIELDS = {
    PlanetData: ['id', 'name', 'description', 'required_level', 'travel_cost', 'regions'],
    RegionData: ['id', 'planet_id', 'name', 'description', 'seed_drop_table', 'trait_probability_modifiers'],
    SeedData: ['id', 'name', 'origin_planet', 'origin_region', 'rarity', 'base_species_type', 'possible_traits', 'base_stats'],
    PlantInstance: [
      'unique_id',
      'custom_name',
      'seed_id',
      'origin_planet',
      'origin_region',
      'species_type',
      'growth_stage',
      'growth_exp',
      'level',
      'traits',
      'unlocked_trait_slots',
      'equipment',
      'evolution_history',
      'battle_stats',
      'stability',
      'mutation_rate',
      'growth_history',
    ],
    TraitData: [
      'id',
      'name',
      'category',
      'description',
      'stat_modifiers',
      'battle_effects',
      'required_species_type',
    ],
    ItemData: ['id', 'name', 'item_type', 'description', 'target_trait_category', 'effect', 'price'],
    TournamentData: ['id', 'name', 'required_growth_stage', 'bracket_size', 'entry_fee', 'rewards'],
    LootData: ['reward_type', 'reward_id', 'weight', 'min_count', 'max_count', 'rarity', 'required_condition'],
  };

  const gameData = {
    version: DATA_VERSION,
    planets: [
      {
        id: 'planet_elyndor',
        name: '아일린도르',
        description: '인류가 처음 개척한 생체발광 정글 행성. 낮은 위험도와 높은 생장 에너지로 초심자 배양에 적합하다.',
        required_level: 1,
        travel_cost: { credits: 0, fuel_cells: 0 },
        display_position: { x: 22, y: 58 },
        display_color: '#5cf2c2',
        grade: 'common',
        environment: { heat: 8, cold: 4, pressure: 6, hydro_pressure: 2, toxic_atmosphere: 5, radiation: 3, gravity: 7 },
        required_ship_stats: { fuel: 1, durability: 35, heat_resistance: 0, cold_resistance: 0, pressure_resistance: 0, hydro_pressure_resistance: 0 },
        representative_seed_types: ['이끼형', '덩굴형', '정신 연화형'],
        representative_item_types: ['영양제', '성장 촉매'],
        danger_level: 1,
        regions: ['region_elyndor_lumenwood', 'region_elyndor_spore_marsh'],
      },
      {
        id: 'planet_vathra',
        name: '바스라',
        description: '산성 폭풍과 철모래가 뒤섞인 사막 행성. 강한 방어형, 포식형 종자가 자주 발견된다.',
        required_level: 4,
        travel_cost: { credits: 600, fuel_cells: 2 },
        display_position: { x: 56, y: 36 },
        display_color: '#ff8a4a',
        grade: 'rare',
        environment: { heat: 42, cold: 6, pressure: 24, hydro_pressure: 0, toxic_atmosphere: 35, radiation: 18, gravity: 14 },
        required_ship_stats: { fuel: 3, durability: 60, heat_resistance: 18, cold_resistance: 0, pressure_resistance: 14, hydro_pressure_resistance: 0 },
        representative_seed_types: ['금속 갈대형', '중력 선인장형', '포식낭형'],
        representative_item_types: ['방열 코팅', '철질 접목 키트'],
        danger_level: 4,
        regions: ['region_vathra_iron_dunes', 'region_vathra_sulfur_rift'],
      },
      {
        id: 'planet_nereion',
        name: '네레이온',
        description: '거대 행성의 조석권에 갇힌 해양 위성. 중력과 수압을 견디는 희귀 변이체가 산란한다.',
        required_level: 8,
        travel_cost: { credits: 1200, fuel_cells: 4 },
        display_position: { x: 78, y: 68 },
        display_color: '#4ac6ff',
        grade: 'epic',
        environment: { heat: 4, cold: 32, pressure: 38, hydro_pressure: 44, toxic_atmosphere: 8, radiation: 22, gravity: 19 },
        required_ship_stats: { fuel: 4, durability: 72, heat_resistance: 0, cold_resistance: 20, pressure_resistance: 24, hydro_pressure_resistance: 28 },
        representative_seed_types: ['결정화형', '덩굴형', '중력 선인장형'],
        representative_item_types: ['수압막', '정신 조율 장비'],
        danger_level: 7,
        regions: ['region_nereion_tideglass_reef', 'region_nereion_orbit_canopy'],
      },
    ],

    regions: [
      {
        id: 'region_elyndor_lumenwood',
        planet_id: 'planet_elyndor',
        name: '루멘우드 숲',
        description: '푸른 형광 수액이 흐르는 거목 군락. 성장형과 광합성 계열 특성의 발현률이 높다.',
        display_position: { x: 30, y: 56 },
        difficulty: 1,
        base_success_rate: 0.88,
        environment: { heat: 7, cold: 3, pressure: 5, hydro_pressure: 1, toxic_atmosphere: 4, radiation: 2, gravity: 7 },
        required_ship_stats: { fuel: 1, durability: 30, heat_resistance: 0, cold_resistance: 0, pressure_resistance: 0, hydro_pressure_resistance: 0 },
        obtainable_item_types: ['영양제', '성장 촉매'],
        expected_reward_count: { min: 1, max: 2 },
        failure_risks: ['연료 1 소모', '낮은 확률로 내구도 3 감소'],
        seed_drop_table: [
          { seed_id: 'seed_lumen_moss', weight: 46 },
          { seed_id: 'seed_prism_vine', weight: 30 },
          { seed_id: 'seed_orbit_bloom', weight: 2 },
        ],
        loot_table: [
          { reward_type: 'seed', reward_id: 'seed_lumen_moss', weight: 46, min_count: 1, max_count: 1, rarity: 'common', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_prism_vine', weight: 30, min_count: 1, max_count: 1, rarity: 'uncommon', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_orbit_bloom', weight: 2, min_count: 1, max_count: 1, rarity: 'legendary', required_condition: { min_success_margin: 0.2 } },
          { reward_type: 'item', reward_id: 'item_nutrient_gel', weight: 8, min_count: 1, max_count: 1, rarity: 'common', required_condition: null },
        ],
        trait_probability_modifiers: { growth: 1.25, support: 1.1, offense: 0.9 },
      },
      {
        id: 'region_elyndor_spore_marsh',
        planet_id: 'planet_elyndor',
        name: '포자 늪지',
        description: '저산소 늪 위로 공생 포자가 안개처럼 부유한다. 제어형과 돌연변이형 배양에 유리하다.',
        display_position: { x: 68, y: 42 },
        difficulty: 2,
        base_success_rate: 0.78,
        environment: { heat: 10, cold: 5, pressure: 8, hydro_pressure: 6, toxic_atmosphere: 16, radiation: 4, gravity: 7 },
        required_ship_stats: { fuel: 1, durability: 40, heat_resistance: 0, cold_resistance: 0, pressure_resistance: 0, hydro_pressure_resistance: 2 },
        obtainable_item_types: ['포자 앰풀', '안정화 혈청'],
        expected_reward_count: { min: 1, max: 2 },
        failure_risks: ['독성 포자로 내구도 5 감소', '탐사 보상 없음'],
        seed_drop_table: [
          { seed_id: 'seed_myco_bulb', weight: 42 },
          { seed_id: 'seed_nerve_lotus', weight: 18 },
          { seed_id: 'seed_lumen_moss', weight: 12 },
        ],
        loot_table: [
          { reward_type: 'seed', reward_id: 'seed_myco_bulb', weight: 42, min_count: 1, max_count: 1, rarity: 'common', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_nerve_lotus', weight: 18, min_count: 1, max_count: 1, rarity: 'rare', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_lumen_moss', weight: 12, min_count: 1, max_count: 1, rarity: 'common', required_condition: null },
          { reward_type: 'item', reward_id: 'item_spore_ampoule', weight: 6, min_count: 1, max_count: 1, rarity: 'uncommon', required_condition: { min_success_margin: 0.1 } },
        ],
        trait_probability_modifiers: { control: 1.25, mutation: 1.2, mobility: 0.85 },
      },
      {
        id: 'region_vathra_iron_dunes',
        planet_id: 'planet_vathra',
        name: '철모래 사구',
        description: '자기장을 띤 모래 언덕. 금속성 줄기와 중력 결절을 가진 종자가 묻혀 있다.',
        display_position: { x: 34, y: 38 },
        difficulty: 4,
        base_success_rate: 0.68,
        environment: { heat: 32, cold: 4, pressure: 20, hydro_pressure: 0, toxic_atmosphere: 18, radiation: 12, gravity: 12 },
        required_ship_stats: { fuel: 2, durability: 58, heat_resistance: 14, cold_resistance: 0, pressure_resistance: 10, hydro_pressure_resistance: 0 },
        obtainable_item_types: ['철질 접목 키트', '방열 코팅'],
        expected_reward_count: { min: 1, max: 3 },
        failure_risks: ['열 손상으로 내구도 8 감소', '연료 1 추가 소모'],
        seed_drop_table: [
          { seed_id: 'seed_iron_reed', weight: 36 },
          { seed_id: 'seed_gravity_cactus', weight: 24 },
          { seed_id: 'seed_sulfur_snapper', weight: 10 },
        ],
        loot_table: [
          { reward_type: 'seed', reward_id: 'seed_iron_reed', weight: 36, min_count: 1, max_count: 1, rarity: 'uncommon', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_gravity_cactus', weight: 24, min_count: 1, max_count: 1, rarity: 'rare', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_sulfur_snapper', weight: 10, min_count: 1, max_count: 1, rarity: 'rare', required_condition: { min_success_margin: 0.08 } },
          { reward_type: 'item', reward_id: 'item_iron_graft', weight: 5, min_count: 1, max_count: 1, rarity: 'rare', required_condition: { min_success_margin: 0.15 } },
        ],
        trait_probability_modifiers: { defense: 1.3, control: 1.15, support: 0.8 },
      },
      {
        id: 'region_vathra_sulfur_rift',
        planet_id: 'planet_vathra',
        name: '황화 균열',
        description: '행성 맨틀의 열이 새어 나오는 균열 지대. 산성 수액과 플라즈마 꽃술 변이가 흔하다.',
        display_position: { x: 72, y: 62 },
        difficulty: 5,
        base_success_rate: 0.58,
        environment: { heat: 48, cold: 2, pressure: 26, hydro_pressure: 0, toxic_atmosphere: 38, radiation: 22, gravity: 13 },
        required_ship_stats: { fuel: 3, durability: 66, heat_resistance: 22, cold_resistance: 0, pressure_resistance: 16, hydro_pressure_resistance: 0 },
        obtainable_item_types: ['산성 변이 촉매', '플라즈마 안정제'],
        expected_reward_count: { min: 1, max: 3 },
        failure_risks: ['고열로 내구도 12 감소', '독성 대기 오염'],
        seed_drop_table: [
          { seed_id: 'seed_sulfur_snapper', weight: 32 },
          { seed_id: 'seed_ember_orchid', weight: 16 },
          { seed_id: 'seed_iron_reed', weight: 14 },
        ],
        loot_table: [
          { reward_type: 'seed', reward_id: 'seed_sulfur_snapper', weight: 32, min_count: 1, max_count: 1, rarity: 'rare', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_ember_orchid', weight: 16, min_count: 1, max_count: 1, rarity: 'epic', required_condition: { min_success_margin: 0.12 } },
          { reward_type: 'seed', reward_id: 'seed_iron_reed', weight: 14, min_count: 1, max_count: 1, rarity: 'uncommon', required_condition: null },
          { reward_type: 'item', reward_id: 'item_acidic_mutagen', weight: 6, min_count: 1, max_count: 1, rarity: 'rare', required_condition: { min_success_margin: 0.16 } },
        ],
        trait_probability_modifiers: { offense: 1.3, mutation: 1.15, growth: 0.85 },
      },
      {
        id: 'region_nereion_tideglass_reef',
        planet_id: 'planet_nereion',
        name: '조석유리 산호초',
        description: '유리질 산호와 해조가 조석 에너지에 맞춰 성장한다. 방어막과 수막 특성이 잘 붙는다.',
        display_position: { x: 32, y: 66 },
        difficulty: 6,
        base_success_rate: 0.55,
        environment: { heat: 4, cold: 24, pressure: 34, hydro_pressure: 42, toxic_atmosphere: 6, radiation: 16, gravity: 18 },
        required_ship_stats: { fuel: 3, durability: 70, heat_resistance: 0, cold_resistance: 16, pressure_resistance: 22, hydro_pressure_resistance: 26 },
        obtainable_item_types: ['수막 랩', '조석 안정제'],
        expected_reward_count: { min: 1, max: 3 },
        failure_risks: ['수압 손상으로 내구도 10 감소', '종자 보관 환경 저하'],
        seed_drop_table: [
          { seed_id: 'seed_tideglass_kelp', weight: 38 },
          { seed_id: 'seed_prism_vine', weight: 20 },
          { seed_id: 'seed_orbit_bloom', weight: 4 },
        ],
        loot_table: [
          { reward_type: 'seed', reward_id: 'seed_tideglass_kelp', weight: 38, min_count: 1, max_count: 1, rarity: 'common', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_prism_vine', weight: 20, min_count: 1, max_count: 1, rarity: 'uncommon', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_orbit_bloom', weight: 4, min_count: 1, max_count: 1, rarity: 'legendary', required_condition: { min_success_margin: 0.2 } },
          { reward_type: 'item', reward_id: 'item_tide_membrane_wrap', weight: 5, min_count: 1, max_count: 1, rarity: 'rare', required_condition: { min_success_margin: 0.12 } },
        ],
        trait_probability_modifiers: { defense: 1.2, support: 1.15, offense: 0.9 },
      },
      {
        id: 'region_nereion_orbit_canopy',
        planet_id: 'planet_nereion',
        name: '궤도수관 돔',
        description: '저궤도 온실 잔해가 숲처럼 자란 구역. 희귀한 결정화, 양자 종자 변이가 관측된다.',
        display_position: { x: 70, y: 34 },
        difficulty: 7,
        base_success_rate: 0.5,
        environment: { heat: 6, cold: 34, pressure: 18, hydro_pressure: 8, toxic_atmosphere: 10, radiation: 34, gravity: 5 },
        required_ship_stats: { fuel: 4, durability: 76, heat_resistance: 0, cold_resistance: 24, pressure_resistance: 12, hydro_pressure_resistance: 6 },
        obtainable_item_types: ['정신 조율 포크', '형질 슬롯 절개기'],
        expected_reward_count: { min: 1, max: 4 },
        failure_risks: ['방사능으로 내구도 14 감소', '탐사선 센서 오류'],
        seed_drop_table: [
          { seed_id: 'seed_orbit_bloom', weight: 14 },
          { seed_id: 'seed_nerve_lotus', weight: 20 },
          { seed_id: 'seed_gravity_cactus', weight: 18 },
        ],
        loot_table: [
          { reward_type: 'seed', reward_id: 'seed_orbit_bloom', weight: 14, min_count: 1, max_count: 1, rarity: 'legendary', required_condition: { min_success_margin: 0.18 } },
          { reward_type: 'seed', reward_id: 'seed_nerve_lotus', weight: 20, min_count: 1, max_count: 1, rarity: 'rare', required_condition: null },
          { reward_type: 'seed', reward_id: 'seed_gravity_cactus', weight: 18, min_count: 1, max_count: 1, rarity: 'rare', required_condition: null },
          { reward_type: 'item', reward_id: 'item_psionic_tuning_fork', weight: 5, min_count: 1, max_count: 1, rarity: 'rare', required_condition: { min_success_margin: 0.12 } },
        ],
        trait_probability_modifiers: { utility: 1.25, mutation: 1.2, defense: 1.05 },
      },
    ],

    seeds: [
      {
        id: 'seed_lumen_moss',
        name: '루멘 이끼 종자',
        origin_planet: 'planet_elyndor',
        origin_region: 'region_elyndor_lumenwood',
        rarity: 'common',
        base_species_type: 'moss',
        possible_traits: ['trait_biolume_chlorophyll', 'trait_rapid_germination', 'trait_symbiotic_microbes'],
        base_stats: { hp: 86, attack: 16, defense: 14, speed: 18, energy: 3 },
      },
      {
        id: 'seed_prism_vine',
        name: '프리즘 덩굴 종자',
        origin_planet: 'planet_elyndor',
        origin_region: 'region_elyndor_lumenwood',
        rarity: 'uncommon',
        base_species_type: 'vine',
        possible_traits: ['trait_vector_thorns', 'trait_phase_pollen', 'trait_crystal_refraction'],
        base_stats: { hp: 92, attack: 21, defense: 15, speed: 24, energy: 3 },
      },
      {
        id: 'seed_myco_bulb',
        name: '마이코 구근 종자',
        origin_planet: 'planet_elyndor',
        origin_region: 'region_elyndor_spore_marsh',
        rarity: 'common',
        base_species_type: 'bulb',
        possible_traits: ['trait_spore_cloud', 'trait_tide_membrane', 'trait_resonant_roots'],
        base_stats: { hp: 112, attack: 15, defense: 20, speed: 11, energy: 2 },
      },
      {
        id: 'seed_nerve_lotus',
        name: '신경 연화 종자',
        origin_planet: 'planet_elyndor',
        origin_region: 'region_elyndor_spore_marsh',
        rarity: 'rare',
        base_species_type: 'psionic_lotus',
        possible_traits: ['trait_psionic_lattice', 'trait_phase_pollen', 'trait_quantum_seeds'],
        base_stats: { hp: 98, attack: 18, defense: 16, speed: 23, energy: 4 },
      },
      {
        id: 'seed_iron_reed',
        name: '철관 갈대 종자',
        origin_planet: 'planet_vathra',
        origin_region: 'region_vathra_iron_dunes',
        rarity: 'uncommon',
        base_species_type: 'metal_reed',
        possible_traits: ['trait_metallic_xylem', 'trait_iron_bark', 'trait_stable_core'],
        base_stats: { hp: 108, attack: 20, defense: 25, speed: 10, energy: 2 },
      },
      {
        id: 'seed_gravity_cactus',
        name: '중력 선인장 종자',
        origin_planet: 'planet_vathra',
        origin_region: 'region_vathra_iron_dunes',
        rarity: 'rare',
        base_species_type: 'gravity_cactus',
        possible_traits: ['trait_gravity_nodes', 'trait_resonant_roots', 'trait_adaptive_genome'],
        base_stats: { hp: 124, attack: 17, defense: 24, speed: 8, energy: 3 },
      },
      {
        id: 'seed_sulfur_snapper',
        name: '황화 포식낭 종자',
        origin_planet: 'planet_vathra',
        origin_region: 'region_vathra_sulfur_rift',
        rarity: 'rare',
        base_species_type: 'carnivorous_pod',
        possible_traits: ['trait_hunger_maw', 'trait_acid_sap', 'trait_vector_thorns'],
        base_stats: { hp: 96, attack: 29, defense: 13, speed: 19, energy: 3 },
      },
      {
        id: 'seed_ember_orchid',
        name: '잿불 난초 종자',
        origin_planet: 'planet_vathra',
        origin_region: 'region_vathra_sulfur_rift',
        rarity: 'epic',
        base_species_type: 'storm_orchid',
        possible_traits: ['trait_plasma_stamen', 'trait_solar_burst', 'trait_adaptive_genome'],
        base_stats: { hp: 84, attack: 33, defense: 12, speed: 27, energy: 4 },
      },
      {
        id: 'seed_tideglass_kelp',
        name: '조석유리 켈프 종자',
        origin_planet: 'planet_nereion',
        origin_region: 'region_nereion_tideglass_reef',
        rarity: 'common',
        base_species_type: 'vine',
        possible_traits: ['trait_tide_membrane', 'trait_symbiotic_microbes', 'trait_rapid_germination'],
        base_stats: { hp: 106, attack: 17, defense: 19, speed: 17, energy: 3 },
      },
      {
        id: 'seed_orbit_bloom',
        name: '궤도 결정화 종자',
        origin_planet: 'planet_nereion',
        origin_region: 'region_nereion_orbit_canopy',
        rarity: 'legendary',
        base_species_type: 'crystal_flower',
        possible_traits: ['trait_crystal_refraction', 'trait_quantum_seeds', 'trait_plasma_stamen'],
        base_stats: { hp: 118, attack: 28, defense: 22, speed: 21, energy: 5 },
      },
    ],

    traits: [
      {
        id: 'trait_biolume_chlorophyll',
        name: '생체광 엽록소',
        category: 'growth',
        description: '빛이 약한 환경에서도 생장 에너지를 축적한다.',
        stat_modifiers: { hp_pct: 0.08, energy: 1 },
        battle_effects: [{ trigger: 'turn_start', effect: 'regen_hp_pct', value: 0.025 }],
        required_species_type: null,
      },
      {
        id: 'trait_resonant_roots',
        name: '공명 뿌리망',
        category: 'defense',
        description: '행성 지각의 진동을 읽어 충격을 분산한다.',
        stat_modifiers: { defense_pct: 0.1, stability: 4 },
        battle_effects: [{ trigger: 'hit_taken', effect: 'reduce_damage_pct', value: 0.06 }],
        required_species_type: null,
      },
      {
        id: 'trait_acid_sap',
        name: '산성 수액',
        category: 'offense',
        description: '상처에 닿으면 장갑을 부식시키는 수액을 분비한다.',
        stat_modifiers: { attack_pct: 0.09 },
        battle_effects: [{ trigger: 'hit_dealt', effect: 'apply_defense_down_pct', value: 0.08, duration_turns: 2 }],
        required_species_type: null,
      },
      {
        id: 'trait_iron_bark',
        name: '철질 수피',
        category: 'defense',
        description: '표피에 철분 결정이 자라 물리 타격에 강해진다.',
        stat_modifiers: { defense_pct: 0.16, speed_pct: -0.04 },
        battle_effects: [{ trigger: 'battle_start', effect: 'gain_barrier_pct', value: 0.08 }],
        required_species_type: null,
      },
      {
        id: 'trait_vector_thorns',
        name: '벡터 가시',
        category: 'offense',
        description: '가시가 적의 회피 방향을 예측해 휘어진다.',
        stat_modifiers: { attack_pct: 0.07, speed_pct: 0.04 },
        battle_effects: [{ trigger: 'attack', effect: 'crit_rate_bonus', value: 0.08 }],
        required_species_type: null,
      },
      {
        id: 'trait_phase_pollen',
        name: '위상 꽃가루',
        category: 'control',
        description: '꽃가루가 짧은 위상차를 일으켜 상대 감각을 흐린다.',
        stat_modifiers: { speed_pct: 0.05 },
        battle_effects: [{ trigger: 'skill_hit', effect: 'apply_accuracy_down_pct', value: 0.1, duration_turns: 2 }],
        required_species_type: null,
      },
      {
        id: 'trait_gravity_nodes',
        name: '중력 결절',
        category: 'control',
        description: '줄기 마디가 국소 중력장을 만들어 상대 움직임을 늦춘다.',
        stat_modifiers: { defense_pct: 0.06, speed_pct: -0.02 },
        battle_effects: [{ trigger: 'battle_start', effect: 'enemy_speed_down_pct', value: 0.1, duration_turns: 3 }],
        required_species_type: 'gravity_cactus',
      },
      {
        id: 'trait_tide_membrane',
        name: '조석 수막',
        category: 'defense',
        description: '수분막이 충격을 흘려보내며 열 손상을 줄인다.',
        stat_modifiers: { hp_pct: 0.06, defense_pct: 0.06 },
        battle_effects: [{ trigger: 'element_hit_taken', element: 'fire', effect: 'reduce_damage_pct', value: 0.14 }],
        required_species_type: null,
      },
      {
        id: 'trait_spore_cloud',
        name: '마비 포자운',
        category: 'control',
        description: '부유 포자가 상대 신경계를 둔화한다.',
        stat_modifiers: { energy: 1 },
        battle_effects: [{ trigger: 'skill_hit', effect: 'apply_speed_down_pct', value: 0.12, duration_turns: 2 }],
        required_species_type: null,
      },
      {
        id: 'trait_plasma_stamen',
        name: '플라즈마 꽃술',
        category: 'offense',
        description: '꽃술 끝에 고온 플라즈마를 모아 폭발적인 타격을 낸다.',
        stat_modifiers: { attack_pct: 0.14, energy: 1 },
        battle_effects: [{ trigger: 'charged_skill', effect: 'bonus_damage_pct', value: 0.18 }],
        required_species_type: null,
      },
      {
        id: 'trait_adaptive_genome',
        name: '적응형 게놈',
        category: 'mutation',
        description: '배양 환경의 자극을 빠르게 형질 발현으로 전환한다.',
        stat_modifiers: { mutation_rate: 0.03, stability: -3 },
        battle_effects: [{ trigger: 'level_up', effect: 'extra_trait_roll_chance', value: 0.08 }],
        required_species_type: null,
      },
      {
        id: 'trait_stable_core',
        name: '안정핵',
        category: 'mutation',
        description: '돌연변이 폭주를 억제하는 단단한 세포핵 구조.',
        stat_modifiers: { stability: 10, mutation_rate: -0.015 },
        battle_effects: [{ trigger: 'mutation_check', effect: 'reduce_negative_mutation_chance', value: 0.2 }],
        required_species_type: null,
      },
      {
        id: 'trait_psionic_lattice',
        name: '정신 격자',
        category: 'utility',
        description: '미세 전위망이 상대의 전투 의도를 읽는다.',
        stat_modifiers: { speed_pct: 0.06, energy: 1 },
        battle_effects: [{ trigger: 'enemy_skill_used', effect: 'gain_energy', value: 1 }],
        required_species_type: 'psionic_lotus',
      },
      {
        id: 'trait_metallic_xylem',
        name: '금속 물관',
        category: 'defense',
        description: '금속화된 물관이 장비 이식 효율과 내구도를 높인다.',
        stat_modifiers: { defense_pct: 0.12, hp_pct: 0.04 },
        battle_effects: [{ trigger: 'equipment_effect', effect: 'increase_equipment_bonus_pct', value: 0.12 }],
        required_species_type: 'metal_reed',
      },
      {
        id: 'trait_hunger_maw',
        name: '공복 포식구',
        category: 'offense',
        description: '포식낭이 피해량 일부를 생체 에너지로 회수한다.',
        stat_modifiers: { attack_pct: 0.08 },
        battle_effects: [{ trigger: 'damage_dealt', effect: 'lifesteal_pct', value: 0.12 }],
        required_species_type: 'carnivorous_pod',
      },
      {
        id: 'trait_rapid_germination',
        name: '급속 발아',
        category: 'growth',
        description: '초기 성장 단계에서 경험치 흡수량이 증가한다.',
        stat_modifiers: { growth_exp_pct: 0.15 },
        battle_effects: [{ trigger: 'battle_end', effect: 'bonus_growth_exp_pct', value: 0.12 }],
        required_species_type: null,
      },
      {
        id: 'trait_symbiotic_microbes',
        name: '공생 미생물',
        category: 'support',
        description: '뿌리권 미생물이 상처 회복과 영양 흡수를 돕는다.',
        stat_modifiers: { hp_pct: 0.05, stability: 3 },
        battle_effects: [{ trigger: 'turn_end', effect: 'cleanse_minor_debuff_chance', value: 0.15 }],
        required_species_type: null,
      },
      {
        id: 'trait_crystal_refraction',
        name: '결정 굴절',
        category: 'defense',
        description: '결정화된 꽃잎이 에너지 공격을 굴절시킨다.',
        stat_modifiers: { defense_pct: 0.08, speed_pct: 0.03 },
        battle_effects: [{ trigger: 'skill_taken', effect: 'reflect_damage_pct', value: 0.08 }],
        required_species_type: null,
      },
      {
        id: 'trait_solar_burst',
        name: '태양 폭발',
        category: 'offense',
        description: '축적한 광에너지를 한 번에 방출한다.',
        stat_modifiers: { attack_pct: 0.1, energy: 1 },
        battle_effects: [{ trigger: 'energy_full', effect: 'next_attack_bonus_pct', value: 0.22 }],
        required_species_type: null,
      },
      {
        id: 'trait_quantum_seeds',
        name: '양자 종자',
        category: 'utility',
        description: '종자가 확률적으로 다른 위치에 존재해 치명타를 회피한다.',
        stat_modifiers: { speed_pct: 0.08, mutation_rate: 0.01 },
        battle_effects: [{ trigger: 'lethal_damage_taken', effect: 'survive_chance', value: 0.1, hp_pct_after: 0.12 }],
        required_species_type: null,
      },
    ],

    items: [
      {
        id: 'item_nutrient_gel',
        name: '고농축 영양 젤',
        item_type: 'nutrient',
        description: '성장 경험치를 즉시 부여하는 범용 배양제.',
        target_trait_category: 'growth',
        effect: { growth_exp: 80 },
        price: 90,
      },
      {
        id: 'item_lumen_fertilizer',
        name: '루멘 비료',
        item_type: 'nutrient',
        description: '성장형 특성 발현률을 높이는 생체광 비료.',
        target_trait_category: 'growth',
        effect: { trait_category_weight_bonus: 0.18, duration_growth_actions: 3 },
        price: 140,
      },
      {
        id: 'item_acidic_mutagen',
        name: '산성 변이 촉매',
        item_type: 'mutagen',
        description: '공격형 특성 발현률과 돌연변이율을 함께 높인다.',
        target_trait_category: 'offense',
        effect: { trait_category_weight_bonus: 0.2, mutation_rate_delta: 0.025, stability_delta: -5 },
        price: 220,
      },
      {
        id: 'item_stability_serum',
        name: '안정화 혈청',
        item_type: 'stabilizer',
        description: '불안정한 변이를 진정시켜 안정도를 회복한다.',
        target_trait_category: 'mutation',
        effect: { stability_delta: 12, mutation_rate_delta: -0.015 },
        price: 180,
      },
      {
        id: 'item_iron_graft',
        name: '철질 접목 키트',
        item_type: 'graft',
        description: '방어형 또는 금속성 특성 후보를 추가한다.',
        target_trait_category: 'defense',
        effect: { add_trait_candidates: ['trait_iron_bark', 'trait_metallic_xylem'] },
        price: 260,
      },
      {
        id: 'item_spore_ampoule',
        name: '포자 앰풀',
        item_type: 'mutagen',
        description: '제어형 포자 특성의 발현 기회를 높인다.',
        target_trait_category: 'control',
        effect: { add_trait_candidates: ['trait_spore_cloud', 'trait_phase_pollen'], trait_category_weight_bonus: 0.12 },
        price: 210,
      },
      {
        id: 'item_tide_membrane_wrap',
        name: '수막 랩',
        item_type: 'equipment',
        description: '대회 한 번 동안 방어형 특성의 전투 효과를 보조한다.',
        target_trait_category: 'defense',
        effect: { temporary_battle_stat_bonus: { defense_pct: 0.05 }, battles: 1 },
        price: 160,
      },
      {
        id: 'item_psionic_tuning_fork',
        name: '정신 조율 포크',
        item_type: 'equipment',
        description: '유틸리티 특성의 에너지 회복 발동률을 높인다.',
        target_trait_category: 'utility',
        effect: { battle_effect_trigger_bonus: 0.08, battles: 2 },
        price: 240,
      },
      {
        id: 'item_trait_slot_splice',
        name: '형질 슬롯 절개기',
        item_type: 'graft',
        description: '안정도가 충분한 식물의 특성 슬롯을 하나 연다.',
        target_trait_category: null,
        effect: { unlock_trait_slots: 1, minimum_stability: 55 },
        price: 480,
      },
      {
        id: 'item_rookie_ticket',
        name: '루키 컵 참가권',
        item_type: 'ticket',
        description: '초급 대회 참가비를 대신 지불하는 티켓.',
        target_trait_category: null,
        effect: { pays_entry_fee_for: ['tournament_rookie_pod_cup'] },
        price: 70,
      },
    ],

    tournaments: [
      {
        id: 'tournament_rookie_pod_cup',
        name: '루키 포드 컵',
        required_growth_stage: 'sprout',
        bracket_size: 8,
        entry_fee: 50,
        rewards: { credits: 250, items: ['item_nutrient_gel'], growth_exp: 60 },
        entry_rules: { max_plants_per_player: 1 },
      },
      {
        id: 'tournament_synapse_bloom_league',
        name: '시냅스 블룸 리그',
        required_growth_stage: 'juvenile',
        bracket_size: 16,
        entry_fee: 180,
        rewards: { credits: 700, items: ['item_spore_ampoule', 'item_stability_serum'], growth_exp: 140 },
        entry_rules: { max_plants_per_player: 1 },
      },
      {
        id: 'tournament_exoplanet_grand_prix',
        name: '외행성 그랑프리',
        required_growth_stage: 'mature',
        bracket_size: 32,
        entry_fee: 420,
        rewards: { credits: 1600, items: ['item_iron_graft', 'item_psionic_tuning_fork'], growth_exp: 260 },
        entry_rules: { max_plants_per_player: 1 },
      },
      {
        id: 'tournament_apex_singularity_garden',
        name: '에이펙스 특이점 가든',
        required_growth_stage: 'evolved',
        bracket_size: 64,
        entry_fee: 900,
        rewards: { credits: 4200, items: ['item_trait_slot_splice'], title: 'Singularity Cultivator', growth_exp: 520 },
        entry_rules: { max_plants_per_player: 1 },
      },
    ],
  };

  const PLANT_INSTANCE_TEMPLATE = {
    unique_id: '',
    custom_name: '',
    seed_id: '',
    origin_planet: '',
    origin_region: '',
    species_type: '',
    growth_stage: 'seed',
    growth_exp: 0,
    level: 1,
    traits: [],
    unlocked_trait_slots: 1,
    equipment: {
      primary: null,
      support: [],
    },
    evolution_history: [],
    battle_stats: {
      hp: 0,
      attack: 0,
      defense: 0,
      speed: 0,
      energy: 0,
    },
    stability: 100,
    mutation_rate: 0.05,
    growth_history: [],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function indexById(list, label) {
    return list.reduce((index, item) => {
      if (index[item.id]) throw new Error(`Duplicate ${label} id: ${item.id}`);
      index[item.id] = item;
      return index;
    }, {});
  }

  function createIndexes(data = gameData) {
    return {
      planets: indexById(data.planets, 'planet'),
      regions: indexById(data.regions, 'region'),
      seeds: indexById(data.seeds, 'seed'),
      traits: indexById(data.traits, 'trait'),
      items: indexById(data.items, 'item'),
      tournaments: indexById(data.tournaments, 'tournament'),
    };
  }

  function getById(collectionName, id, data = gameData) {
    const collection = data[collectionName];
    if (!Array.isArray(collection)) return null;
    return collection.find(item => item.id === id) || null;
  }

  function hasRequiredFields(record, fields) {
    return fields.filter(field => !(field in record));
  }

  function validateGameData(data = gameData) {
    const errors = [];
    const minimumCounts = {
      planets: 3,
      regions: 6,
      seeds: 10,
      traits: 20,
      items: 10,
      tournaments: 4,
    };

    Object.entries(minimumCounts).forEach(([collectionName, minimum]) => {
      const collection = data[collectionName];
      if (!Array.isArray(collection)) {
        errors.push(`${collectionName} must be an array`);
      } else if (collection.length < minimum) {
        errors.push(`${collectionName} requires at least ${minimum} records`);
      }
    });

    const schemaMap = {
      planets: 'PlanetData',
      regions: 'RegionData',
      seeds: 'SeedData',
      traits: 'TraitData',
      items: 'ItemData',
      tournaments: 'TournamentData',
    };

    Object.entries(schemaMap).forEach(([collectionName, schemaName]) => {
      const collection = data[collectionName] || [];
      collection.forEach(record => {
        const missing = hasRequiredFields(record, REQUIRED_FIELDS[schemaName]);
        if (missing.length > 0) {
          errors.push(`${schemaName} ${record.id || '(missing id)'} missing fields: ${missing.join(', ')}`);
        }
      });
    });

    const templateMissing = hasRequiredFields(PLANT_INSTANCE_TEMPLATE, REQUIRED_FIELDS.PlantInstance);
    if (templateMissing.length > 0) {
      errors.push(`PlantInstance template missing fields: ${templateMissing.join(', ')}`);
    }

    let indexes;
    try {
      indexes = createIndexes(data);
    } catch (error) {
      errors.push(error.message);
      return { ok: false, errors };
    }

    data.planets.forEach(planet => {
      planet.regions.forEach(regionId => {
        const region = indexes.regions[regionId];
        if (!region) errors.push(`Planet ${planet.id} references missing region ${regionId}`);
        if (region && region.planet_id !== planet.id) {
          errors.push(`Region ${region.id} belongs to ${region.planet_id}, but is listed under ${planet.id}`);
        }
      });
    });

    data.regions.forEach(region => {
      if (!indexes.planets[region.planet_id]) {
        errors.push(`Region ${region.id} references missing planet ${region.planet_id}`);
      }

      region.seed_drop_table.forEach(drop => {
        if (!indexes.seeds[drop.seed_id]) errors.push(`Region ${region.id} references missing seed ${drop.seed_id}`);
        if (typeof drop.weight !== 'number' || drop.weight <= 0) {
          errors.push(`Region ${region.id} has invalid drop weight for ${drop.seed_id}`);
        }
      });

      (region.loot_table || []).forEach((loot, index) => {
        const missing = hasRequiredFields(loot, REQUIRED_FIELDS.LootData);
        if (missing.length > 0) {
          errors.push(`Region ${region.id} LootData #${index + 1} missing fields: ${missing.join(', ')}`);
        }
        if (!['seed', 'item'].includes(loot.reward_type)) {
          errors.push(`Region ${region.id} LootData #${index + 1} has unknown reward_type ${loot.reward_type}`);
        }
        if (loot.reward_type === 'seed' && !indexes.seeds[loot.reward_id]) {
          errors.push(`Region ${region.id} LootData references missing seed ${loot.reward_id}`);
        }
        if (loot.reward_type === 'item' && !indexes.items[loot.reward_id]) {
          errors.push(`Region ${region.id} LootData references missing item ${loot.reward_id}`);
        }
        if (typeof loot.weight !== 'number' || loot.weight < 0) {
          errors.push(`Region ${region.id} LootData ${loot.reward_id} has invalid weight`);
        }
        if (typeof loot.min_count !== 'number' || typeof loot.max_count !== 'number' || loot.min_count < 0 || loot.max_count < loot.min_count) {
          errors.push(`Region ${region.id} LootData ${loot.reward_id} has invalid count range`);
        }
      });

      Object.keys(region.trait_probability_modifiers).forEach(category => {
        if (!ENUMS.trait_categories.includes(category)) {
          errors.push(`Region ${region.id} has unknown trait category modifier ${category}`);
        }
      });
    });

    data.seeds.forEach(seed => {
      if (!indexes.planets[seed.origin_planet]) errors.push(`Seed ${seed.id} references missing origin_planet ${seed.origin_planet}`);
      if (!indexes.regions[seed.origin_region]) errors.push(`Seed ${seed.id} references missing origin_region ${seed.origin_region}`);
      if (!ENUMS.rarities.includes(seed.rarity)) errors.push(`Seed ${seed.id} has unknown rarity ${seed.rarity}`);
      if (!ENUMS.species_types.includes(seed.base_species_type)) {
        errors.push(`Seed ${seed.id} has unknown base_species_type ${seed.base_species_type}`);
      }
      if (indexes.regions[seed.origin_region] && indexes.regions[seed.origin_region].planet_id !== seed.origin_planet) {
        errors.push(`Seed ${seed.id} origin_region is not on origin_planet`);
      }
      seed.possible_traits.forEach(traitId => {
        if (!indexes.traits[traitId]) errors.push(`Seed ${seed.id} references missing trait ${traitId}`);
      });
      ENUMS.stat_keys.forEach(statKey => {
        if (typeof seed.base_stats[statKey] !== 'number') errors.push(`Seed ${seed.id} missing numeric base stat ${statKey}`);
      });
    });

    data.traits.forEach(trait => {
      if (!ENUMS.trait_categories.includes(trait.category)) errors.push(`Trait ${trait.id} has unknown category ${trait.category}`);
      if (trait.required_species_type !== null && !ENUMS.species_types.includes(trait.required_species_type)) {
        errors.push(`Trait ${trait.id} has unknown required_species_type ${trait.required_species_type}`);
      }
      if (!Array.isArray(trait.battle_effects)) errors.push(`Trait ${trait.id} battle_effects must be an array`);
    });

    data.items.forEach(item => {
      if (!ENUMS.item_types.includes(item.item_type)) errors.push(`Item ${item.id} has unknown item_type ${item.item_type}`);
      if (item.target_trait_category !== null && !ENUMS.trait_categories.includes(item.target_trait_category)) {
        errors.push(`Item ${item.id} has unknown target_trait_category ${item.target_trait_category}`);
      }
      if (typeof item.price !== 'number' || item.price < 0) errors.push(`Item ${item.id} has invalid price`);
    });

    data.tournaments.forEach(tournament => {
      if (!ENUMS.growth_stages.includes(tournament.required_growth_stage)) {
        errors.push(`Tournament ${tournament.id} has unknown required_growth_stage ${tournament.required_growth_stage}`);
      }
      if (typeof tournament.bracket_size !== 'number' || tournament.bracket_size < 2) {
        errors.push(`Tournament ${tournament.id} has invalid bracket_size`);
      }
      if (typeof tournament.entry_fee !== 'number' || tournament.entry_fee < 0) {
        errors.push(`Tournament ${tournament.id} has invalid entry_fee`);
      }
      if (!tournament.entry_rules || tournament.entry_rules.max_plants_per_player !== 1) {
        errors.push(`Tournament ${tournament.id} must allow exactly one plant entry per player`);
      }
      (tournament.rewards.items || []).forEach(itemId => {
        if (!indexes.items[itemId]) errors.push(`Tournament ${tournament.id} rewards missing item ${itemId}`);
      });
    });

    return { ok: errors.length === 0, errors };
  }

  function createPlantInstance({ seed_id, custom_name = '', unique_id = '', traits = [] } = {}) {
    const seed = getById('seeds', seed_id);
    if (!seed) throw new Error(`Unknown seed_id: ${seed_id}`);

    const selectedTraits = traits.length > 0 ? traits : seed.possible_traits.slice(0, 1);
    selectedTraits.forEach(traitId => {
      if (!getById('traits', traitId)) throw new Error(`Unknown trait id: ${traitId}`);
      if (!seed.possible_traits.includes(traitId)) {
        throw new Error(`Trait ${traitId} is not listed in possible_traits for seed ${seed.id}`);
      }
    });

    return {
      ...clone(PLANT_INSTANCE_TEMPLATE),
      unique_id: unique_id || `plant_${seed.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      custom_name: custom_name || seed.name.replace(' 종자', ''),
      seed_id: seed.id,
      origin_planet: seed.origin_planet,
      origin_region: seed.origin_region,
      species_type: seed.base_species_type,
      traits: selectedTraits,
      battle_stats: clone(seed.base_stats),
      growth_history: [
        {
          event: 'created_from_seed',
          seed_id: seed.id,
          growth_stage: 'seed',
          level: 1,
        },
      ],
    };
  }

  return {
    DATA_VERSION,
    ENUMS,
    REQUIRED_FIELDS,
    gameData,
    PLANT_INSTANCE_TEMPLATE,
    createIndexes,
    getById,
    validateGameData,
    createPlantInstance,
  };
})();

if (typeof window !== 'undefined') {
  window.AlienPlantGameData = AlienPlantGameData;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlienPlantGameData;
}
