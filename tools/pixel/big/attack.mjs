// 종별 공격 연출 — 무대(stage.mjs: 나 = 왼쪽 아래·상대 = 오른쪽 위가 비스듬히 마주 봄) 장면을 장마다 그린다. convert.mjs --attack 이 부른다.
// 근거: saint11 "Impact"(대기 → 준비 → 동작 → 넘침 → 정지 · 준비가 있어야 세게 느껴짐 · 중간 장을 빼서 빠르게 + 잔상 · 대상이 튕기며 반응 ·
//       화면과 대상 흔들기 · 맞기 직전 한 장 멈춤), "Electricity"(벼락 순서), "Fire"·"Explosion"(밝은 속 → 고리 → 파편 → 연기), "Wind"(입자·고리).
// 큰 모양(불덩이·폭발·베기·물방울·돌가시·파도)은 어두운 1칸 테두리를 둘러(o 층) 복잡한 몸 위에서도 읽히게, 잔 입자는 그냥(p 층).
// 속성 성질(로드맵 #14)을 맞은 쪽에 보인다: 불 = 화상, 물 = 젖음, 풀 = 가시·흡수, 번개 = 감전, 대지 = 둔화(먼지·부스러기), 바람 = 교란(머리 둘레 소용돌이).
// 한 바퀴 = FRA장 × 0.05초. 크기는 96칸 식물에 맞춰(2026-10-15 실측: 처음 크기는 몸 위에서 묻힘 → 약 1.8배).
// 방향: 날아가는 것은 공격 머리 L → 대상 머리 T 쪽(S.D), 몸에 붙은 출발점(팔·관 끝)과 베기 모양은 상대가 있는 좌우(S.fx)로 뒤집는다 — 위아래로 마주 봐도 그대로.
// 바닥을 타는 기술(대지 내려치기·파도 — 2026-10-15 사용자 "땅을 타고 가는 모션, 바닥 경계 선과 시작·끝점이 어색하지 않게, 화분이 있으니까 · 마주 보는 각도도"):
//   화분과 같은 26° 내려다본 바닥 평면 위에서 그린다. 출발 = 공격 쪽 화분 굽 가장자리(상대 쪽, 화분 뒤 반쪽이면 옆), 도착 = 대상 화분 굽 가장자리.
//   바닥에 눕는 것(갈라짐·물자국·고리·웅덩이)은 바닥 층 f, 서 있는 것(돌가시·물마루·물기둥·먼지)은 바닥에 닿는 줄(깊이)로 화분과 앞뒤를 가리는 u 층.
//   근거: 바닥 위 고리는 납작한 타원이고 고리 → 점으로 갈라져 사라짐(Budget Pixel 비 4장), 바닥 높이 충격파 = 납작한 원판(Tuts+ 충돌 충격파),
//   땅을 타고 간 힘은 대상 발밑에서 솟는다(포켓몬 대지의힘 — the ground under the target erupts).
import { rng, zigzag, fillBolt, strokePx } from './fxcore.mjs';


export const FRA = 48;
const sm = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const ease = u => 1 - (1 - u) ** 3;
export const ATTACKS = {
  flower_grass: { kind: 'slash', move: 'lunge', c: ['#ffffff', '#d8f8b0', '#7cc850', '#2e5a26'], petal: ['#f6a0b4', '#d8607a'], status: 'thorn' },
  thorn: { kind: 'whip', move: 'lunge', c: ['#f0f4c8', '#a8c860', '#5a7a30', '#24381a'], status: 'thorn' },
  aqua: { kind: 'bubbles', move: 'cast', c: ['#f4feff', '#a8e4f8', '#5ab0e0', '#244e88'], status: 'wet' },
  flower_wind: { kind: 'gale', move: 'cast', c: ['#ffffff', '#e4d8fa', '#b49ae8', '#5a4a98'], petal: ['#d8b8f8', '#a888e0'], status: 'swirl' },
  spark: { kind: 'bolt', move: 'cast', c: ['#ffffff', '#fff4b0', '#ffd84a', '#c87a20'], status: 'shock' },
  vine_water: { kind: 'wave', move: 'lunge', c: ['#f4feff', '#9ad8f0', '#4a98d0', '#22487e'], status: 'wet' },
  cactus_fire: { kind: 'fireball', move: 'cast', c: ['#fff6c8', '#ffc848', '#f26a22', '#8a2416'], status: 'burn' },
  gaia: { kind: 'slam', move: 'slam', c: ['#f0dcb0', '#c8a46a', '#8a6640', '#3e2e1e'], gem: '#7fe8e0', status: 'dust' },
  flower_fire: { kind: 'bloom', move: 'cast', c: ['#fff6c8', '#ffc848', '#f26a22', '#8a2416'], status: 'burn' },
  cactus_wind: { kind: 'rings', move: 'cast', c: ['#ffffff', '#e2e8fa', '#a8b4e0', '#4a5690'], status: 'swirl' },
  vine_wind: { kind: 'blades', move: 'lunge', c: ['#ffffff', '#e8e0fa', '#b0a0e8', '#4c3e90'], status: 'swirl' },
  spore_cap: { kind: 'spores', move: 'cast', c: ['#fffbd8', '#f8e488', '#d0b050', '#6a5a28'], status: 'spore' },
  // 새 넷(2026-10-16): 얼음 종소리 = 퍼지는 서리 고리 · 전깃줄 덩굴 = 번개 줄기 · 바위 버섯 = 내려찍기 · 해파리 버섯 = 물방울
  frost_bell: { kind: 'rings', move: 'cast', c: ['#ffffff', '#dcf6ff', '#8ad6f0', '#2a6688'], status: 'swirl' },
  volt_vine: { kind: 'bolt', move: 'cast', c: ['#ffffff', '#fff4c0', '#f0c040', '#9a6a1a'], status: 'shock' },
  stone_cap: { kind: 'slam', move: 'slam', c: ['#f4e8c8', '#d8bc88', '#a08458', '#4a3a24'], gem: '#8ff0e0', status: 'dust' },
  jelly_cap: { kind: 'bubbles', move: 'cast', c: ['#f6feff', '#b8e8fc', '#6ab8ec', '#2a5a96'], status: 'wet' },
  // 변이 고정 새 다섯(2026-10-17): 덫 꽃 = 무는 덫 · 칼날 덩굴 = 불 칼날 · 독 선인장 = 독 · 용 과일 선인장 = 서리 숨결 · 불씨 버섯 = 불씨 포자
  fang_trap: { kind: 'bite', move: 'lunge', c: ['#fff4d8', '#d8e070', '#7ca83a', '#2e4a1e'], status: 'dust' },
  blade_vine: { kind: 'blades', move: 'lunge', c: ['#fff6c8', '#ffc848', '#f26a22', '#8a2416'], status: 'burn' },
  toxi_cactus: { kind: 'poison', move: 'cast', c: ['#f0d8ff', '#c890f0', '#8a40c8', '#3a1660'], fizz: '#b8f070', status: 'poison' },
  draco_fruit: { kind: 'blades', move: 'cast', c: ['#ffffff', '#dcf6ff', '#8ad6f0', '#2a6688'], status: 'swirl' },   // 2026-10-17 보통 식물 = 서리 가시를 날림(숨결은 프로스트드레이크)
  frost_drake: { kind: 'breath', move: 'cast', c: ['#ffffff', '#dcf6ff', '#8ad6f0', '#2a6688'], status: 'swirl' },   // 태생 용족 = 서리 숨결
  ember_cap: { kind: 'spores', move: 'cast', c: ['#fff6c8', '#ffc848', '#f26a22', '#8a2416'], status: 'burn' },
  drake_cactus: { kind: 'breath', move: 'cast', c: ['#fff6c8', '#ffb040', '#e8442a', '#7a1a14'], status: 'burn' },   // 태생 용족 = 불 숨결
  // 새 셋(2026-10-17): 갓 버섯 = 부채 바람 · 하회탈 덩굴 = 덩굴 채찍(흙빛) · 천둥북 선인장 = 번개
  gat_cap: { kind: 'gale', move: 'cast', c: ['#ffffff', '#e4d8fa', '#b49ae8', '#5a4a98'], petal: ['#cfe8b8', '#8ab870'], status: 'swirl' },
  mask_vine: { kind: 'whip', move: 'lunge', c: ['#f4e4c0', '#d8b47a', '#9a7040', '#4a3420'], status: 'dust' },
  drum_cactus: { kind: 'bolt', move: 'cast', c: ['#ffffff', '#fff4b0', '#ffd84a', '#c87a20'], status: 'shock' },
  // 둘째 넷(2026-10-17): 청사초롱 = 차가운 빛 덩이 · 물동이 = 물결 · 도깨비 방망이 = 번개 내려찍기 · 얼음 왕관 = 서리 포자
  lantern_vine: { kind: 'fireball', move: 'cast', c: ['#ffffff', '#dcf6ff', '#8ad6f0', '#2a6688'], status: 'swirl' },
  jar_cactus: { kind: 'wave', move: 'lunge', c: ['#f4feff', '#a8e4f8', '#5ab0e0', '#244e88'], status: 'wet' },
  goblin_cap: { kind: 'slam', move: 'slam', c: ['#fff6c8', '#ffd84a', '#c87a20', '#5a3410'], gem: '#fff4b0', status: 'shock' },
  crown_cap: { kind: 'spores', move: 'cast', c: ['#ffffff', '#dcf6ff', '#8ad6f0', '#2a6688'], status: 'swirl' },
  // 셋째 아홉(2026-10-17): 검투사 = 칼 · 장승 = 내려찍기 · 우주 버섯 = 공기 방울 · 바이킹 = 뿔 돌격 · 현무 = 물 숨결 · 구미호 = 여우불 · 마법사 = 번개 · 닌자 = 수리검 · 해녀 = 물결
  gladi_cactus: { kind: 'sword', move: 'lunge', c: ['#fff4d8', '#e8c48a', '#a87444', '#4a3020'], status: 'dust' },
  jangseung_cactus: { kind: 'slam', move: 'slam', c: ['#f0f8d8', '#a8d070', '#5a8a3a', '#2a4a1e'], gem: '#e8d8a8', status: 'thorn' },
  astro_cap: { kind: 'bubbles', move: 'cast', c: ['#ffffff', '#e8eefc', '#a8bce8', '#4a5a98'], status: 'swirl' },
  viking_cap: { kind: 'slam', move: 'slam', c: ['#ffffff', '#dcf6ff', '#8ad6f0', '#2a6688'], gem: '#e8f8ff', status: 'swirl' },
  hyunmu_cap: { kind: 'breath', move: 'cast', c: ['#f4feff', '#a8e4f8', '#3a90c8', '#1a3e6e'], status: 'wet' },
  gumiho_bloom: { kind: 'fireball', move: 'cast', c: ['#ffffff', '#d8eeff', '#ff9a3a', '#8a2416'], status: 'burn' },
  wizard_bell: { kind: 'bolt', move: 'cast', c: ['#ffffff', '#fff4b0', '#ffd84a', '#6a3aa0'], status: 'shock' },
  ninja_vine: { kind: 'blades', move: 'lunge', c: ['#ffffff', '#e8e0fa', '#b0a0e8', '#4c3e90'], status: 'swirl' },
  pirate_cactus: { kind: 'wave', move: 'lunge', c: ['#f4feff', '#a8e4f8', '#5ab0e0', '#244e88'], status: 'wet' },   // 2026-10-18 새 여섯(기술 그림은 사용자가 기술을 다시 만든 뒤)
  ranger_vine: { kind: 'blades', move: 'cast', c: ['#f4ffe8', '#bfe89a', '#6aa848', '#2a5a28'], status: 'swirl' },
  miner_cap: { kind: 'slam', move: 'slam', c: ['#f8e8c0', '#e0b868', '#a07838', '#4a3418'], gem: '#ffb84a', status: 'dust' },
  snow_ballet: { kind: 'rings', move: 'cast', c: ['#ffffff', '#ecdcff', '#a8b8f0', '#4a4a98'], status: 'swirl' },
  volcano_cap: { kind: 'spores', move: 'cast', c: ['#fff6c8', '#ffb848', '#e2541e', '#6a1e10'], status: 'burn' },
  dandel_aero: { kind: 'gale', move: 'cast', c: ['#ffffff', '#fff6c8', '#e8d878', '#8a8a38'], petal: ['#ffffff', '#f0ead0'], status: 'swirl' },
  diver_vine: { kind: 'wave', move: 'lunge', c: ['#f4feff', '#a8e4f8', '#5ab0e0', '#244e88'], status: 'wet' },
};
// 개성 기술(catalog.js u_*)마다 제 모습(2026-10-16 사용자 "불가시 난사가 불씨와 스킬 모션·효과가 같다") — 있는 연출(kind)을 그 종 색·성질로 다시 쓴다(새 그림 없음).
//   전투는 ATTACKS[기술 id] → ATTACKS[종] 순으로 찾는다(battle.js). 여기 없는 공격 기술 = 종 연출: 1단 기술, 단 종 연출이 그 이름으로 만들어진 기술
//   (불덩이 · 낙뢰 · 대지 내려치기 · 파도 덮치기 · 갓 내려찍기 · 포자 구름 — 그 종은 1단 기술을 여기서 바꿈). 위력 0(방어·강화) 기술은 공격 연출이 없다.
const UNIQUE = {
  u_petal_2: ['flower_grass', 'whip'], u_petal_3: ['flower_grass', 'blades'],      // 장미 가시 · 꽃잎 칼날
  u_thorn_2: ['thorn', 'rings'], u_thorn_3: ['thorn', 'slam'],                      // 가시 그물 · 독가시 덤불(가시가 땅을 타고 와 솟음)
  u_aqua_3: ['aqua', 'breath'],
  u_draco_3: ['draco_fruit', 'rings'],
  u_draco_2b: ['draco_fruit', 'breath'],
  // 2026-10-17 단계마다 더 피는 개성(28종 × 공격 기술) — 종 색에 기술마다 다른 모습
  u_petal_2b: ['flower_grass', 'bloom'], u_petal_3c: ['flower_grass', 'gale'], u_thorn_2b: ['thorn', 'bite'], u_thorn_3b: ['thorn', 'whip'], u_thorn_3c: ['thorn', 'wave'], u_aqua_3b: ['aqua', 'bloom'], u_wind_2b: ['flower_wind', 'blades'], u_wind_3c: ['flower_wind', 'rings'], u_spark_3b: ['spark', 'fireball'], u_spark_3c: ['spark', 'bolt'], u_tide_2b: ['vine_water', 'whip'], u_tide_3b: ['vine_water', 'rings'], u_ember_3b: ['cactus_fire', 'blades'], u_ember_3c: ['cactus_fire', 'rings'], u_gaia_3c: ['gaia', 'slam'], u_blaze_2b: ['flower_fire', 'blades'], u_blaze_3c: ['flower_fire', 'fireball'], u_gale_3b: ['cactus_wind', 'gale'], u_gale_3c: ['cactus_wind', 'blades'], u_gvine_2b: ['vine_wind', 'whip'], u_gvine_3c: ['vine_wind', 'gale'], u_spore_3b: ['spore_cap', 'spores'], u_spore_3c: ['spore_cap', 'rings'], u_frost_3b: ['frost_bell', 'rings'], u_frost_3c: ['frost_bell', 'breath'], u_volt_2b: ['volt_vine', 'rings'], u_volt_3c: ['volt_vine', 'bolt'], u_stone_3c: ['stone_cap', 'slam'], u_jelly_3b: ['jelly_cap', 'whip'], u_jelly_3c: ['jelly_cap', 'bubbles'], u_fang_3b: ['fang_trap', 'bite'], u_fang_3c: ['fang_trap', 'slam'], u_blade_3b: ['blade_vine', 'w_slash'], u_blade_3c: ['blade_vine', 'w_thrust'], u_toxi_2b: ['toxi_cactus', 'poison'], u_toxi_3c: ['toxi_cactus', 'blades'], u_emcap_3b: ['ember_cap', 'spores'], u_emcap_3c: ['ember_cap', 'fireball'], u_drake_2b: ['drake_cactus', 'gale'], u_drake_3c: ['drake_cactus', 'slam'], u_gat_3b: ['gat_cap', 'rings'], u_gat_3c: ['gat_cap', 'blades'], u_tal_2b: ['mask_vine', 'rings'], u_tal_3c: ['mask_vine', 'whip'], u_drum_2b: ['drum_cactus', 'rings'], u_drum_3c: ['drum_cactus', 'slam'], u_lamp_3b: ['lantern_vine', 'whip'], u_lamp_3c: ['lantern_vine', 'fireball'], u_jar_3c: ['jar_cactus', 'bubbles'], u_dok_2b: ['goblin_cap', 'fireball'], u_dok_3c: ['goblin_cap', 'slam'], u_crown_2b: ['crown_cap', 'rings'], u_crown_3c: ['crown_cap', 'breath'],                                            // 용 따라하기 = 작은 서리 콧김
  u_fdrake_2b: ['frost_drake', 'whip'], u_fdrake_3c: ['frost_drake', 'slam'],       // 꼬리치기 · 빙하 낙하                                              // 서리 열매 터뜨리기 = 퍼지는 서리 고리                                                     // 물방울 세례
  u_wind_2: ['flower_wind', 'bloom'], u_wind_3: ['flower_wind', 'breath'],          // 꽃잎 회오리 · 꽃잎 돌풍
  u_spark_1: ['spark', 'fireball'], u_spark_2: ['spark', 'spores'],                 // 전기 불꽃 · 전기 꽃가루
  u_tide_1: ['vine_water', 'whip'], u_tide_2: ['vine_water', 'gale'],               // 물살 새순 · 조류 휘감기
  u_ember_1: ['cactus_fire', 'bubbles'], u_ember_2: ['cactus_fire', 'blades'],      // 불씨 · 불가시 난사
  u_gaia_1: ['gaia', 'slash'],                                                      // 돌 주먹
  u_blaze_3: ['flower_fire', 'gale'],                                               // 불꽃 만개(불꽃 꽃잎 = 종 연출)
  u_gale_2: ['cactus_wind', 'bloom'], u_gale_3: ['cactus_wind', 'gale'],            // 가시 회오리 · 돌개바람
  u_gvine_2: ['vine_wind', 'whip'], u_gvine_3: ['vine_wind', 'slash'],              // 바람 채찍 · 칼바람
  u_spore_1: ['spore_cap', 'poison'], u_spore_2: ['spore_cap', 'fireball'],         // 포자 · 포자 폭발
  u_frost_2: ['frost_bell', 'bloom'], u_frost_3: ['frost_bell', 'spores'],          // 서리꽃 날림 · 빙결의 종
  u_volt_2: ['volt_vine', 'rings'], u_volt_3: ['volt_vine', 'whip'],                // 방전 · 고압 채찍
  u_stone_1: ['stone_cap', 'spores'],                                               // 돌가루 포자
  u_jelly_2: ['jelly_cap', 'whip'], u_jelly_3: ['jelly_cap', 'spores'],             // 흐물 촉수 · 해파리 비
  u_gat_3: ['gat_cap', 'spores'],                                                   // 갓 회오리(포자를 바람에 실어)
  u_tal_2: ['mask_vine', 'rings'], u_tal_3: ['mask_vine', 'slam'],                  // 탈놀이(놀리는 고리) · 대지의 탈춤
  u_drum_3: ['drum_cactus', 'rings'],                                               // 뇌고 연타(북소리 번개 고리)
  u_lamp_2: ['lantern_vine', 'whip'], u_lamp_3: ['lantern_vine', 'gale'],           // 서리 덩굴 · 청사초롱 눈보라
  u_jar_3: ['jar_cactus', 'slam'],                                                  // 물동이 내려치기
  u_dok_2: ['goblin_cap', 'spores'],                                                // 도깨비 장난(포자)
  u_crown_3: ['crown_cap', 'gale'],                                                 // 빙왕의 포자(눈보라에 실어)
  // 셋째 아홉(2026-10-17) — 기술마다 다른 모습
  u_gladi_2b: ['gladi_cactus', 'slam'], u_gladi_3: ['gladi_cactus', 'slash'], u_gladi_3c: ['gladi_cactus', 'slam'],
  u_jang_1: ['jangseung_cactus', 'rings'], u_jang_2b: ['jangseung_cactus', 'whip'], u_jang_3c: ['jangseung_cactus', 'wave'],
  u_astro_2b: ['astro_cap', 'spores'], u_astro_3: ['astro_cap', 'slash'], u_astro_3c: ['astro_cap', 'gale'],
  u_viking_2b: ['viking_cap', 'slash'], u_viking_3: ['viking_cap', 'wave'],
  u_hyunmu_1: ['hyunmu_cap', 'whip'], u_hyunmu_2b: ['hyunmu_cap', 'blades'], u_hyunmu_3: ['hyunmu_cap', 'wave'],
  u_gumiho_2: ['gumiho_bloom', 'rings'], u_gumiho_2b: ['gumiho_bloom', 'whip'], u_gumiho_3: ['gumiho_bloom', 'bloom'], u_gumiho_3c: ['gumiho_bloom', 'breath'],
  u_wizard_1: ['wizard_bell', 'fireball'], u_wizard_2: ['wizard_bell', 'rings'], u_wizard_3c: ['wizard_bell', 'spores'],
  u_ninja_2b: ['ninja_vine', 'whip'], u_ninja_3: ['ninja_vine', 'rings'], u_ninja_3c: ['ninja_vine', 'slash'],
  u_haenyeo_1: ['diver_vine', 'whip'], u_haenyeo_2b: ['diver_vine', 'bubbles'], u_haenyeo_3b: ['diver_vine', 'rings'], u_haenyeo_3c: ['diver_vine', 'bite'],
};
const MOVE_OF = { whip: 'lunge', blades: 'lunge', slash: 'lunge', slam: 'slam' };   // 나머지 = cast(그 연출을 쓰는 종과 같은 몸놀림)
for (const [id, [sp, kind]] of Object.entries(UNIQUE)) {
  const B = ATTACKS[sp];
  ATTACKS[id] = { kind, move: MOVE_OF[kind] || 'cast', c: B.c, status: B.status,
    ...((kind === 'slash' || kind === 'gale') && { petal: B.petal || [B.c[1], B.c[2]] }), ...(kind === 'slam' && { gem: B.gem || B.c[0] }) };
}
// 변이 스킬(변이형별 기본 스킬, 설계 = specs/2026-10-15-v2-mutation-staging-design.md ⑥) — 공격하는 쪽은 변이 후광·문장을 두른다
export const VARIANTS = {
  predator: { kind: 'bite', move: 'lunge', c: ['#ffffff', '#ffd0d6', '#e8344a', '#5a0e1c'], status: 'drain' },
  weapon: { kind: 'sword', move: 'lunge', c: ['#ffffff', '#e8eef8', '#9aa8c0', '#3a4458'], status: 'none' },
  toxic: { kind: 'poison', move: 'cast', c: ['#f0d8ff', '#c890f0', '#8a40c8', '#3a1660'], fizz: '#b8f070', status: 'poison' },
  dragon: { kind: 'breath', move: 'cast', c: ['#ffffff', '#c8ffa0', '#5ac850', '#1e5a2a'], status: 'none' },
  spore: { kind: 'sporepuff', move: 'cast', c: ['#fffbd8', '#f8e488', '#d0b050', '#6a5a28'], status: 'weaken' },
};
// 무기 변이 공격(설계 = specs/2026-10-15-v2-battle-rules-design.md §9) — 동작 중 무기 모양이 보이고, 맞은 뒤 무기별 성질이 남는다
const STEEL = ['#ffffff', '#e8eef8', '#9aa8c0', '#3a4458'], WOOD = ['#f0d0a0', '#c8945a', '#8a5a30', '#3e2a18'], GUNC = ['#fffbe0', '#ffe070', '#ff9a30', '#8a3a10'], GUNW = ['#d8c8a0', '#9a8a6a', '#5a4e3a', '#2a2420'];
export const WEAPONS = {
  sword_slash: { kind: 'w_slash', move: 'lunge', c: STEEL, w: WOOD, blood: ['#ffd0d0', '#ff5a5a', '#c02838', '#5a0c18'], status: 'bleed' },
  sword_thrust: { kind: 'w_thrust', move: 'lunge', c: STEEL, w: WOOD, status: 'none' },
  axe_chop: { kind: 'w_chop', move: 'slam', c: STEEL, w: WOOD, status: 'guardbreak' },
  axe_sweep: { kind: 'w_sweep', move: 'lunge', c: STEEL, w: WOOD, status: 'none', area: true },
  gun_shot: { kind: 'w_shot', move: 'shoot', c: GUNC, w: GUNW, status: 'none' },
  gun_burst: { kind: 'w_burst', move: 'shoot', c: GUNC, w: GUNW, status: 'none' },
  gun_snipe: { kind: 'w_snipe', move: 'shoot', c: GUNC, w: GUNW, status: 'none' },
  hammer_smash: { kind: 'w_smash', move: 'slam', c: ['#f0e8e0', '#c0b0a0', '#807060', '#3a3028'], w: WOOD, status: 'stun' },
  spear_thrust: { kind: 'w_spear', move: 'lunge', c: STEEL, w: WOOD, status: 'none' },
  dagger_flurry: { kind: 'w_flurry', move: 'lunge', c: STEEL, w: WOOD, tox: ['#f0d8ff', '#c890f0', '#8a40c8', '#3a1660'], fizz: '#b8f070', status: 'poison' },
  whip_bind: { kind: 'w_bind', move: 'cast', c: ['#e8f8b0', '#9ad050', '#4a8a30', '#1e3a18'], status: 'bind' },
  scythe_reap: { kind: 'w_reap', move: 'lunge', c: ['#f0fff0', '#b8e0c0', '#6a9a7a', '#24402e'], w: WOOD, status: 'none', area: true },
  shield_bash: { kind: 'w_bash', move: 'lunge', c: ['#fff4d8', '#e0c070', '#a07830', '#4a3010'], status: 'guardself' },
};
// 변이 기술(카드)마다 제 모습(2026-10-17 — 전엔 그 식물 종 연출을 빌려 씀): 변이 연출(VARIANTS) · 무기 연출(WEAPONS)을 기술 id로, 속성 카드는 그 속성 색
//  전투는 ATTACKS[기술 id] → ATTACKS[종] 순으로 찾음(battle.js). 용의 숨결(속성 = 그 식물)은 종 연출 그대로(드레이크캑터 · 드라코프루트 = 숨결)
{
  const EC = { fire: ATTACKS.cactus_fire.c, water: ATTACKS.aqua.c, earth: ATTACKS.gaia.c, bolt: ATTACKS.spark.c, ice: ATTACKS.frost_bell.c, wind: ATTACKS.flower_wind.c, grass: ATTACKS.flower_grass.c };
  const as = (B, o) => ({ ...B, ...o });
  Object.assign(ATTACKS, {
    m_bite: VARIANTS.predator, m_devour: as(VARIANTS.predator, {}), m_burrow: as(VARIANTS.predator, { c: EC.earth, status: 'dust' }), m_maw: as(VARIANTS.predator, { c: EC.water, status: 'wet' }),
    m_slash: WEAPONS.sword_slash, m_shot: WEAPONS.gun_shot, m_smash: WEAPONS.hammer_smash,
    m_flame: as(WEAPONS.sword_slash, { c: EC.fire, blood: EC.fire, status: 'burn' }), m_spear: as(WEAPONS.spear_thrust, { c: EC.bolt, status: 'shock' }), m_flamer: { kind: 'breath', move: 'cast', c: EC.fire, status: 'burn' },   // 화염 방사 = 불길 뿜기
    m_rocket: { kind: 'fireball', move: 'shoot', c: ['#fff6c8', '#ffb040', '#d8542a', '#4a3428'], status: 'none' },   // 로켓포 = 쏘아 터짐
    m_xbow: as(WEAPONS.gun_snipe, { c: ['#f4ecdc', '#c8a878', '#8a6a44', '#3a2a1a'] }),   // 석궁 = 한 발 저격(나무 · 쇠촉 색)
    m_spit: VARIANTS.toxic, m_acid: as(VARIANTS.toxic, {}), m_miasma: as(VARIANTS.toxic, {}), m_bile: as(VARIANTS.toxic, { c: EC.water }), m_ivy: { kind: 'whip', move: 'lunge', c: VARIANTS.toxic.c, status: 'poison' },
    m_puff: VARIANTS.spore, m_sleep: as(VARIANTS.spore, {}), m_gust: as(VARIANTS.spore, { c: EC.wind }),
    m_roar: { kind: 'rings', move: 'cast', c: VARIANTS.dragon.c, status: 'swirl' }, m_frostclaw: { kind: 'slash', move: 'lunge', c: EC.ice, status: 'swirl', petal: [EC.ice[1], EC.ice[2]] }, m_voltclaw: { kind: 'slash', move: 'lunge', c: EC.bolt, status: 'shock', petal: [EC.bolt[1], EC.bolt[2]] },
  });
}
// 종 고유 v2 공격 기술마다 제 모습(2026-10-29 밤샘 — 사용자 '각 스킬별 특수한 건 모션 만들고 …'): 옛 개성 기술 자리(같은 id)에 남은 옛 연출(위 UNIQUE)이
//  새 기술과 어긋나던 것(낙석 = 포자 구름 · 깨물기 = 채찍 · 빙결 브레스 = 고리 · 처형의 춤 = 고리 · 칼춤 = 숨결 · 폭발은 예술이지 = 풀색 물기둥 · ..력일섬! = 불색 · 번뇌 = 물색 꽃 등)을
//  기술 이름 · 하는 일에 맞춰 다시 짝지음 — 색 = 그 기술 속성(속성 없으면 종 · 주제 색) · 새 모양 넷 = 낙석 rockfall · 얼음 깨짐 shatter · 폭발 blast · 바늘비 rain(skillFx)
{
  const EC = { fire: ATTACKS.cactus_fire.c, water: ATTACKS.aqua.c, earth: ATTACKS.gaia.c, bolt: ATTACKS.spark.c, ice: ATTACKS.frost_bell.c, wind: ATTACKS.flower_wind.c, grass: ATTACKS.flower_grass.c };
  const ST = { fire: 'burn', water: 'wet', earth: 'dust', bolt: 'shock', ice: 'swirl', wind: 'swirl', grass: 'thorn' };
  const BLOOD = WEAPONS.sword_slash.blood, PETAL4 = ['#fff0f6', '#f6a0b4', '#d8607a', '#6a1e44'], PINK = ['#fff0f8', '#ffb8dc', '#e8609e', '#5e1a3e'], WOODC = ['#f0d0a0', '#c8945a', '#8a5a30', '#3e2a18'];
  const TOX = ATTACKS.toxi_cactus.c, ACID = ['#f4ffd0', '#c8f070', '#7ab830', '#2e4a14'], WEED = ['#e8f4c0', '#8ab060', '#4a7a3a', '#1e3420'], DUSK = ['#f0e8ff', '#c8b0f0', '#6a4aa0', '#24143a'], FRUIT = ATTACKS.draco_fruit.c;
  const MV = { slash: 'lunge', whip: 'lunge', blades: 'lunge', bite: 'lunge', sword: 'lunge', slam: 'slam' };
  const cOf = col => (typeof col === 'string' ? EC[col] : col), stOf = col => (typeof col === 'string' ? ST[col] : 'none');
  const mk = (kind, col, o = {}) => { const c = cOf(col); return { kind, move: MV[kind] || 'cast', c, status: stOf(col), ...((kind === 'slash' || kind === 'gale') && { petal: [c[1], c[2]] }), ...(kind === 'slam' && { gem: c[0] }), ...o }; };
  const wp = (name, col, o = {}) => ({ ...WEAPONS[name], c: cOf(col), ...(WEAPONS[name].blood && { blood: cOf(col) }), status: stOf(col), ...o });
  Object.assign(ATTACKS, {
    u_gvine_2b: wp('sword_thrust', 'wind'), u_gvine_3b: mk('blades', 'wind'), u_gvine_3c: mk('slash', 'wind'),                         // 휙- 푹찍 = 찌르기 · 빠르지? = 칼날 셋 · 피해? = 베기
    u_stone_1: mk('rockfall', 'earth'), u_stone_2b: mk('slam', 'earth'), u_stone_3b: mk('slam', 'earth'),                              // 낙석 · 석순 · 지반붕괴 = 땅이 갈라져 돌가시
    u_spore_3b: mk('spores', 'bolt'), u_volt_2: mk('bubbles', 'bolt'), u_volt_3b: mk('bolt', 'bolt'),                                   // 포자작! = 전기 포자 · 전격 구슬 = 구슬 셋 · 뇌격구 = 벼락
    u_frost_2: mk('shatter', 'ice'), u_frost_2b: mk('rings', 'wind'), u_frost_3c: mk('whip', WOODC, { status: 'dust' }),                 // 깨트려드리죠 = 얼음 깨짐 · 정적을 = 종소리 고리 · 매 = 나무 회초리
    u_petal_1: mk('sword', 'grass'), u_petal_2: mk('slash', 'grass', { petal: [PETAL4[1], PETAL4[2]] }), u_petal_3: wp('sword_slash', 'grass', { blood: PETAL4, status: 'thorn' }),   // 검방술 = 검 · 꽃잎 베기 · 큰 초승달(꽃잎)
    u_wind_1: mk('gale', 'wind'), u_wind_2b: mk('slash', BLOOD, { status: 'bleed' }), u_wind_3: mk('blades', 'wind'), u_wind_3b: mk('bloom', PINK, { status: 'swirl' }), u_wind_3c: wp('scythe_reap', DUSK),   // 춤 다섯 · 처형 = 낫
    u_aqua_2: mk('wave', 'water'), u_aqua_3b: mk('bolt', 'bolt'),                                                                       // 정죄 = 물기둥 · 번뇌 = 번개
    u_thorn_2b: mk('gale', 'grass'), u_thorn_3b: mk('whip', 'grass'), u_thorn_3c: mk('blast', 'fire'),                                 // 교란 = 가시 돌풍 · 무기는? = 가시 채찍 · 폭발은 예술이지 = 덫 폭발
    u_jelly_2: mk('whip', 'water'), u_jelly_2b: mk('whip', WEED, { status: 'thorn' }),                                                  // 톡씽 = 촉수 · 미역잉 = 미역 채찍
    u_fang_1: mk('bite', ATTACKS.fang_trap.c, { status: 'thorn' }), u_fang_2b: mk('poison', ACID, { fizz: '#f0ff90', status: 'poison' }), u_fang_3: mk('bite', VARIANTS.predator.c, { status: 'drain' }), u_fang_3c: mk('bite', 'fire'),   // 깨물기 · 소화액 · 식사시간 · 익혀먹기
    u_toxi_1: mk('poison', TOX, { fizz: '#b8f070', status: 'poison' }), u_toxi_2: mk('bubbles', TOX, { status: 'poison' }), u_toxi_3: mk('rain', TOX, { fizz: '#b8f070', status: 'poison' }), u_toxi_3c: mk('blades', TOX, { status: 'poison' }),   // 독 주머니 · 신경독 방울 · 만천화우 = 바늘비 · 독점사
    u_draco_3: mk('breath', 'ice'), u_draco_3b: mk('gale', 'ice'), u_draco_3c: mk('bubbles', FRUIT, { status: 'swirl' }),               // 빙결 브레스 = 숨결 · 빙결 폭풍 = 눈보라 · 열매 던지기
    u_blade_2: mk('blades', 'fire'), u_blade_3b: wp('sword_slash', 'bolt'), u_blade_3c: mk('bloom', BLOOD, { status: 'bleed' }),        // 칼날 잎 · ..력일섬! = 번개 베기 · 피의 축제
  });
}
export const GROUND = new Set(['slam', 'wave']);   // 바닥을 타고 가는 기술
export const impactAt = A => ({ slash: 15, whip: 15, bolt: 14, blades: 17, slam: 19, wave: 19, bubbles: 19, gale: 19, rings: 19, fireball: 20, bloom: 20, spores: 21, bite: 15, sword: 15, poison: 19, breath: 19, sporepuff: 18, rockfall: 16, shatter: 16, blast: 17, rain: 17,
  w_slash: 15, w_thrust: 14, w_chop: 19, w_sweep: 16, w_shot: 15, w_burst: 15, w_snipe: 18, w_smash: 19, w_spear: 15, w_flurry: 16, w_bind: 17, w_reap: 16, w_bash: 15 })[A.kind] || 18;

// 공격하는 쪽 몸놀림(앞 = 상대 쪽, 그림 좌표 qx+): 0~5 대기, 6~11 준비(점점), 12 멈춤, 13~14 동작, 15 넘침, 16~23 복귀
export function attackerPose(f, A) {
  const prep = sm(5.5, 11.5, f), hold = f === 12, back = f > 15 ? 1 - ease(Math.min(1, (f - 15) / 8)) : 1;
  if (A.move === 'slam') {
    if (f <= 12) return { qx: -Math.round(2 * prep), qy: -Math.round(4 * prep), sq: -1.5 * prep };
    if (f <= 15) return { qx: 2, qy: 3, sq: 2 };
    return { qx: Math.round(2 * back), qy: Math.round(3 * back), sq: 2 * back };
  }
  if (A.move === 'shoot') {   // 총: 겨누며 조금 웅크림 → 쏘는 장에 뒤로 반동 → 돌아옴
    if (f <= 12) return { qx: -Math.round(prep), qy: Math.round(prep), sq: 0.8 * prep };
    if (f <= 14) return { qx: -3, qy: 0, sq: -0.6 };
    return { qx: -Math.round(3 * back), qy: 0, sq: -0.6 * back };
  }
  const reach = A.move === 'lunge' ? 8 : 4;
  if (f <= 11 || hold) return { qx: -Math.round((A.move === 'lunge' ? 4 : 3) * prep), qy: Math.round(prep), sq: 1.2 * prep };
  if (f <= 14) return { qx: reach, qy: -1, sq: -1.2 };
  if (f === 15) return { qx: reach + 1, qy: 0, sq: -0.6 };
  return { qx: Math.round((reach + 1) * back), qy: 0, sq: -0.6 * back };
}
// 맞는 쪽: 넉백(kb, 뒤로) · 번쩍 · 흔들림 · 들썩(hop — 발밑에서 땅이 솟는 기술은 화분째 위로)
export function targetPose(f, I, A = {}) {
  const k = f - I;
  if (k < 0) return { kb: 0, flash: false, shake: 0, hop: 0 };
  return { kb: k <= 1 ? 5 : Math.round(5 * (1 - ease(Math.min(1, (k - 1) / 7)))), flash: k === 0, shake: k <= 3 ? (k % 2 ? 1 : -1) : 0, hop: A.kind === 'slam' ? ([2, 3, 1][k] || 0) : 0 };
}
export const cameraShake = (f, A, I) => { const k = f - I, slam = A.move === 'slam' && f >= 13 && f <= 16; return (k >= 0 && k <= 2) || slam ? [k % 2 ? 2 : -2, slam ? (f % 2 ? 1 : -1) : 0] : [0, 0]; };

// ── 그리기 도구(무대 좌표). P = { o(x,y,색) = 테두리 층, p(x,y,색) = 입자 층, f(x,y,색|곱) = 바닥 층, u(x,y,색,깊이) = 바닥에 선 것 } ──
function disc(put, cx, cy, r, col) { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) put(x, y, col); }
function ringPx(put, cx, cy, r, col, keep = () => true, sy = 1, thick = 1) { for (let t = 0; t < thick; t++) { const rr = r - t, n = Math.max(8, Math.round(rr * 7)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if (keep(a)) put(Math.floor(cx + Math.cos(a) * rr), Math.floor(cy + Math.sin(a) * rr * sy), col); } } }
function line(put, a, b, col, thick = 1) { for (const [x, y] of strokePx([a, b])) { put(x, y, col); if (thick > 1) put(x, y + 1, col); } }
function crescent(put, cx, cy, R, a0, a1, w, c0, c1, keep = () => true) {
  for (let y = Math.floor(cy - R - w); y <= cy + R + w; y++) for (let x = Math.floor(cx - R - w); x <= cx + R + w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
    let a = Math.atan2(dy, dx);
    while (a < a0) a += Math.PI * 2;
    if (a > a1) continue;
    const u = (a - a0) / (a1 - a0), ww = w * Math.sin(Math.PI * u) ** 0.7;
    if (r > R || r < R - ww - 0.3 || !keep(u)) continue;
    put(x, y, r > R - ww * 0.45 ? c0 : c1);
  }
}
// 좌우 뒤집을 수 있는 초승달(fx < 0 이면 세로축으로 거울 — 각 a → π − a)
const crescentF = (fx, put, cx, cy, R, a0, a1, w, c0, c1, keep = () => true) => fx > 0 ? crescent(put, cx, cy, R, a0, a1, w, c0, c1, keep) : crescent(put, cx, cy, R, Math.PI - a1, Math.PI - a0, w, c0, c1, u => keep(1 - u));
function particles(put, list, k) { for (const p of list) { if (k < p.t0 || k >= p.t0 + p.life) continue; const t = k - p.t0, x = p.x + p.vx * t, y = p.y + p.vy * t + 0.5 * (p.g || 0) * t * t, ci = Math.min(p.cols.length - 1, Math.floor(t / p.life * p.cols.length)); put(Math.floor(x), Math.floor(y), p.cols[ci]); if (p.size === 2 && t < p.life * 0.6) { put(Math.floor(x) + 1, Math.floor(y), p.cols[ci]); put(Math.floor(x), Math.floor(y) + 1, p.cols[ci]); } } }
function burstParticles(seed, x, y, n, speed, cols, { g = 0.12, life = 10, up = 0, size = 1 } = {}) { const r = rng(seed), out = []; for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, s = speed * (0.5 + r() * 0.7); out.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, g, life: life - Math.floor(r() * 3), t0: 0, cols, size }); } return out; }
// 폭발(saint11 Explosion): 0 흰 속 → 1 불 속·고리 → 2 큰 고리·빛살 → 3 깨진 고리·파편 → 4~8 연기 오르며 흐려짐
function explosion(P, x, y, k, c, seed) {
  if (k === 0) { disc(P.o, x, y, 6, c[1]); disc(P.o, x, y, 4, c[0]); }
  if (k === 1) { disc(P.o, x, y, 8, c[2]); disc(P.o, x, y, 6, c[1]); disc(P.o, x, y, 3.5, c[0]); }
  if (k === 2) { ringPx(P.o, x, y, 13, c[2], () => true, 1, 2); disc(P.o, x, y, 7, c[1]); disc(P.o, x, y, 3, c[0]); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; line(P.p, [x + Math.cos(a) * 15, y + Math.sin(a) * 15], [x + Math.cos(a) * 20, y + Math.sin(a) * 20], i % 2 ? c[1] : c[0]); } }
  if (k === 3) { ringPx(P.o, x, y, 16, c[3], a => Math.floor(a * 3) % 2 === 0, 1, 2); disc(P.o, x, y, 5, c[2]); }
  if (k >= 3 && k <= 8) for (let i = 0; i < 5; i++) { const r2 = rng(seed + i), sx = x + (r2() - 0.5) * 22, sy = y - 3 - (k - 3) * 2.2 + (r2() - 0.5) * 8, rr = 4.2 - (k - 3) * 0.6; if (rr > 0.8) disc(P.o, sx, sy, rr, k < 6 ? '#8a8098' : '#5c5670'); }
}
function flameTongue(put, x, y, h, k, c, w = 1) { for (let j = 0; j < h; j++) { const sx = Math.round(Math.sin((k + j) * 1.3) * (j / h) * 1.5), ww = Math.max(0, Math.round(w * (1 - j / h))); for (let s = -ww; s <= ww; s++) put(Math.floor(x + sx + s), Math.floor(y - j), j < h * 0.35 ? c[1] : j < h - 1 ? c[2] : c[3]); } }

// ── 바닥 평면 도구(k = 내려다본 각의 세로 납작함, stage.mjs K) ──
// 바닥 고리: 가운데 c, 가로 반지름 r, 세로 = r × k
function floorRing(put, c, r, k, col, keep = () => true) { const n = Math.max(16, Math.round(r * 8)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if (keep(a)) put(Math.floor(c[0] + Math.cos(a) * r), Math.floor(c[1] + Math.sin(a) * r * k), col); } }
// 바닥 길: 출발 S0 → 도착 E0 사이를 바닥 평면에서 옆으로 들쭉날쭉(세계 수직 방향을 화면으로 눌러) + 가지 몇 개
function crackPath(S0, E0, k, seed) {
  const r = rng(seed), dx = E0[0] - S0[0], dz = (E0[1] - S0[1]) / k, len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len;
  const n = Math.max(3, Math.round(len / 13)), pts = [], br = [];
  for (let i = 0; i <= n; i++) { const s = i / n, j = i === 0 || i === n ? 0 : (r() - 0.5) * 7; pts.push([S0[0] + dx * s + nx * j, S0[1] + (dz * s + nz * j) * k]); }
  for (let i = 2; i < n - 1; i += 3) { const sg = r() < 0.5 ? -1 : 1, l = 5 + r() * 6, a = pts[i]; br.push({ s: i / n, pts: [a, [a[0] + (dx / len * 0.5 + nx * sg) * l, a[1] + (dz / len * 0.5 + nz * sg) * l * k]] }); }
  const vert = Math.abs(E0[1] - S0[1]) > Math.abs(E0[0] - S0[0]);
  return { pts, br, n, lip: vert ? [1, 0] : [0, 1], wide: vert ? [1, 0] : [0, -1] };   // 빛(왼쪽 위)을 받는 갈라진 벽 = 오른쪽·아래 한 칸
}
const pathAt = (cp, u) => { const f = Math.max(0, Math.min(1, u)) * cp.n, i = Math.min(cp.n - 1, Math.floor(f)), t = f - i, a = cp.pts[i], b = cp.pts[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
const CRACK = '#231a28', LIP = '#6e6280';
function crackPx(put, cells, lip, fade) {
  for (const [key, [x, y]] of cells) if (!cells.has((y + lip[1]) * 4096 + x + lip[0]) && !(fade && (x + y) % 2)) put(x + lip[0], y + lip[1], LIP);
  for (const [, [x, y]] of cells) if (!(fade && (x + y) % 2)) put(x, y, CRACK);
}
// 갈라짐을 u(0~1)까지 — 출발 쪽 반은 두 칸 폭(점점 가늘게), fade 1 = 성기게
function drawCrack(put, cp, u, fade = 0) {
  const n = Math.floor(Math.min(1, u) * cp.n), pts = cp.pts.slice(0, n + 1);
  if (u < 1) pts.push(pathAt(cp, u));
  const cells = new Map(), add = (x, y) => cells.set(y * 4096 + x, [x, y]), line1 = strokePx(pts);
  line1.forEach(([x, y], i) => { add(x, y); if (i < line1.length * 0.5) add(x + cp.wide[0], y + cp.wide[1]); });
  for (const b of cp.br) if (b.s <= u) for (const [x, y] of strokePx(b.pts)) add(x, y);
  crackPx(put, cells, cp.lip, fade);
}
// 화분 굽 둘레 짧은 잔금(뒤쪽은 화분이 가림 — 바닥 층이 화분보다 먼저 그려지므로)
function radialCracks(put, c, r0, k, seed, fade) {
  const r = rng(seed), cells = new Map();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + r() * 0.6, len = 5 + r() * 5, pts = [];
    for (let s = 0; s <= 3; s++) { const rr = r0 + len * s / 3, j = s ? (r() - 0.5) * 0.3 : 0; pts.push([c[0] + Math.cos(a + j) * rr, c[1] + Math.sin(a + j) * rr * k]); }
    for (const [x, y] of strokePx(pts)) cells.set(y * 4096 + x, [x, y]);
  }
  crackPx(put, cells, [0, 1], fade);
}
// 바위 조각(땅에서 비스듬히 솟음): 밑 base → 끝 tip, 밑 반폭 w. 가장자리는 들쭉날쭉, 등줄기(조금 왼쪽)를 경계로 왼면 = 빛, 오른면 = 그늘, 끝 = 가장 밝게, 금 몇 줄.
//  keep = 남길 길이 비율(부서질 때 위부터 사라짐)
function rockShard(put, base, tip, w, c, d, seed, keep = 1) {
  const ax = tip[0] - base[0], ay = tip[1] - base[1], len = Math.hypot(ax, ay) || 1, ux = ax / len, uy = ay / len, px = -uy, py = ux, r = rng(seed);
  const notch = Array.from({ length: 12 }, () => [(r() - 0.5) * 1.6, (r() - 0.5) * 1.6]), cracks = [0.3 + r() * 0.15, 0.58 + r() * 0.15];
  const x0 = Math.floor(Math.min(base[0], tip[0]) - w - 2), x1 = Math.ceil(Math.max(base[0], tip[0]) + w + 2), y0 = Math.floor(Math.min(base[1], tip[1]) - 2), y1 = Math.ceil(Math.max(base[1], tip[1]) + 2);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x + 0.5 - base[0], dy = y + 0.5 - base[1], t = (dx * ux + dy * uy) / len, s = dx * px + dy * py;
    if (t < 0 || t > keep) continue;
    const [nl, nr] = notch[Math.min(11, Math.floor(t * 12))], hw = w * (1 - t) ** 0.85, ridge = -hw * 0.2;
    if (s < -hw - nl * (1 - t) || s > hw + nr * (1 - t)) continue;
    const crack = cracks.some(q => Math.abs(t - q) < 0.6 / len * 1.5 && s > ridge);
    put(x, y, t > 0.86 && s < ridge + 1 ? c[0] : crack ? c[3] : s < ridge ? c[1] : s > hw - 1 ? c[3] : c[2], d);
  }
}
// 흙먼지 뭉치(테두리 없는 부드러운 층): 가운데 + 양옆 작은 덩이, 왼쪽 위 밝게
function dustPuff(put, x, y, r, d, thin = false) {
  for (const [ox, oy, rr] of [[0, 0, r], [-r * 0.75, r * 0.3, r * 0.7], [r * 0.8, r * 0.35, r * 0.62]]) for (let yy = Math.floor(y + oy - rr); yy <= y + oy + rr; yy++) for (let xx = Math.floor(x + ox - rr); xx <= x + ox + rr; xx++) {
    const ex = xx + 0.5 - x - ox, ey = yy + 0.5 - y - oy;
    if (ex * ex + ey * ey > rr * rr || (thin && (xx + yy) % 2)) continue;
    put(xx, yy, ex + ey < -rr * 0.35 ? '#cbbba6' : ex + ey > rr * 0.45 ? '#7e7062' : '#a89a88', d);
  }
}
// 물: 바닥에서 솟는 물기둥 · 물보라 왕관 · 지나간 물줄기 자국 · 웅덩이
// 물기둥(바닥에서 솟는 분수): 밑 b, 높이 h, 밑 반폭 w, 줄마다 기울기 lean. 왼쪽 = 밝은 물, 오른쪽 끝 = 어두운 물, 몸에 흐르는 빛줄, 위 = 거품 머리.
//  broken(0~1) = 위에서부터 끊겨 물방울로 흩어지는 정도
function spout(put, b, h, w, lean, c, d, f, broken = 0, seed = 1) {
  const pd = (x, y, cc) => put(x, y, cc, d);
  for (let j = 0; j < h; j++) {
    const t = j / h, ww = w * (1 - 0.4 * t), cx = b[0] + lean * j;
    if (broken && t > 1 - broken) {   // 끊긴 위쪽은 떨어지는 물방울로
      if ((Math.floor(j * 1.7) + seed) % 3) continue;
      const jx = ((j * 5 + seed) % 3) - 1;
      put(Math.floor(cx + jx), Math.floor(b[1] - j), c[1], d); put(Math.floor(cx + jx + 1), Math.floor(b[1] - j), c[2], d);
      continue;
    }
    for (let s = Math.floor(-ww); s <= ww; s++) put(Math.floor(cx + s), Math.floor(b[1] - j), s <= -ww + 1 ? c[1] : s >= ww - 0.8 ? c[3] : (j + Math.floor(s) * 3 + f * 2 + 99) % 7 === 0 ? c[1] : c[2], d);
  }
  if (!broken) {   // 물머리: 거품 뭉치 셋(한가운데가 가장 밝게)
    const tp = [b[0] + lean * h, b[1] - h];
    for (const [ox, oy, rr] of [[0, 0, w * 0.95 + 0.6], [-w * 0.8, w * 0.5, w * 0.6], [w * 0.8, w * 0.45, w * 0.55]]) disc(pd, tp[0] + ox, tp[1] + oy, rr, c[1]);
    disc(pd, tp[0] - 0.6, tp[1] - 0.8, w * 0.5, c[0]);
  }
}
// 꼭대기에서 물방울이 부채꼴로 솟았다 떨어지는 줄 일곱(분수 끝) — p = 0~1 진행
function sprayFan(put, top, lean, c, d, p) {
  for (let q = 0; q < 7; q++) {
    const a = -Math.PI / 2 + (q - 3) * 0.4 + lean * 0.8, v = 3.4 - Math.abs(q - 3) * 0.3, T = 7 * p;
    for (let t = 0; t < T; t += 0.3) put(Math.floor(top[0] + Math.cos(a) * v * t), Math.floor(top[1] + Math.sin(a) * v * t + 0.42 * t * t), t > T - 1.2 ? c[0] : c[1], d);
  }
}
// 물기둥 하나의 시간표: t = 솟은 뒤 장 수 → [높이 배율, 끊김]
const SPOUT_T = [[0.55, 0], [1, 0], [0.92, 0.3], [0.65, 0.6], [0.35, 0.9]];
// 물보라 왕관: 줄(가로 ±w, 세계)을 따라 물기둥이 솟아 위가 들쭉날쭉 깨진다 — 가운데가 높고 toward(화면 x) 쪽으로 기울며, 위쪽은 성기게(물방울 사이 틈)
function crown(put, P0, g, w, H, toward, c, f, d) {
  for (let s = -w; s <= w; s += 0.5) {
    const b = [P0[0] + g.nx * s, P0[1] + g.nz * s * g.k], hs = H * (0.5 + 0.5 * Math.cos(s / w * Math.PI / 2)) * (0.82 + 0.18 * Math.sin(s * 1.9 + f * 2.3));
    for (let j = 0; j < hs; j++) {
      const t = j / hs, x = Math.floor(b[0] + (toward - b[0]) * 0.32 * t ** 1.6 + Math.sign(s) * t * t * 3), y = Math.floor(b[1] - j);
      if (t > 0.62 && (x * 3 + y * 5 + f) % 4 === 0) continue;
      put(x, y, t > 1 - 2.5 / hs ? c[0] : t > 0.55 ? c[1] : j < 1 ? c[3] : c[2], d);
    }
  }
}
// 웅덩이: 울퉁불퉁한 바닥 타원 — 가장자리 밝은 물, 안은 물빛과 젖은 바닥이 섞임(화분 밑은 화분이 가림)
function puddle(put, c0, r, k, c, fade, seed = 3) {
  const R = rng(seed), wob = Array.from({ length: 9 }, () => 0.82 + R() * 0.34);
  for (let y = Math.floor(c0[1] - r * k * 1.2 - 1); y <= c0[1] + r * k * 1.2 + 1; y++) for (let x = Math.floor(c0[0] - r * 1.2 - 1); x <= c0[0] + r * 1.2 + 1; x++) {
    const ex = x + 0.5 - c0[0], ez = (y + 0.5 - c0[1]) / k, an = (Math.atan2(ez, ex) / (Math.PI * 2) + 1) % 1 * 8, i0 = Math.floor(an), rr = r * (wob[i0] + (wob[i0 + 1] - wob[i0]) * (an - i0)), d = Math.hypot(ex, ez) / rr;
    if (d > 1 || (fade && (x + y) % 2)) continue;
    put(x, y, d > 0.86 ? c[1] : ((x * 374761393 + y * 668265263) >>> 0) % 29 === 0 ? c[1] : 0.72);   // 가장자리 밝은 물 · 안 = 젖어 어두운 바닥에 드문 반짝임(줄무늬 안 생기게 흩뿌림)
  }
}
// 바닥 길의 세계 방향(가로 dx·깊이 dz, 수직 nx·nz)
function groundOf(S) { const dx = S.E0[0] - S.S0[0], dz = (S.E0[1] - S.S0[1]) / S.K, len = Math.hypot(dx, dz) || 1; return { S0: S.S0, dx, dz, len, ux: dx / len, nx: -dz / len, nz: dx / len, k: S.K }; }
// 도착점에서 솟는 바위 조각: [바닥에서 옆(세계, 도착 둘레 접선 쪽), 길이 배율, 밑 반폭, 바깥으로 벌어짐] — 첫째가 식물을 찌르는 큰 조각
const SHARDS = [[0, 1, 7, 0], [-10, 0.55, 4.5, 0.55], [9, 0.45, 4, 0.6]];

// ── 무기 변이 공격(설계 = specs/2026-10-15-v2-battle-rules-design.md §9) ──
// 식물은 무기를 몸 옆(상대 쪽)에 늘 들고 있다 → 준비(뒤로 젖힘·겨눔) → 휘두름(잔상 호) → 맞는 자리에 무기 그림자가 내리치거나(도끼·망치·낫·방패)
// 베인 자국·꿰뚫는 줄·총알이 닿음 → 무기별 성질(출혈·방어 깨짐·기절·독·묶기·방패 기운).
// 무기 그림 = 손잡이 g 에서 끝 쪽 각 a 로 뻗은 작은 도형들(u = 길이, v = 옆 — 얼굴 오른쪽 기준, 왼쪽을 보면 v 를 뒤집음). 공중 층(o)이라 어두운 테두리가 저절로 둘린다.
const ptA = (p, a, r) => [p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r];
// 몸을 두른 고리: 앞 반쪽만(뒤 반쪽은 몸이 가림 — 공중 층은 식물보다 위에 그려지므로) + 아래 한 칸 그늘
function ellipseRingPx(put, cx, cy, rx, ry, colFront, colEdge) { const n = Math.max(24, Math.round(rx * 6)); for (let i = 0; i <= n; i++) { const a = -0.12 + i / n * (Math.PI + 0.24), x = Math.floor(cx + Math.cos(a) * rx), y = Math.floor(cy + Math.sin(a) * ry); put(x, y, colFront); put(x, y + 1, colEdge); } }
function starBurst(put, x, y, r1, r2, n, c0, c1, rot = 0) { for (let i = 0; i < n; i++) { const a = rot + i * Math.PI * 2 / n; line(put, [x + Math.cos(a) * r1, y + Math.sin(a) * r1], [x + Math.cos(a) * r2 * (i % 2 ? 0.7 : 1), y + Math.sin(a) * r2 * (i % 2 ? 0.7 : 1)], i % 2 ? c1 : c0); } }
// 채운 다각형(가로줄 채우기)
function poly(put, pts, col) {
  const ys = pts.map(p => p[1]), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc) !== (b[1] <= yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) put(x, y, col);
  }
}
const GOLD = ['#fff0b0', '#f0c040', '#b07820', '#5a3a10'];
const angF = (fx, a) => fx > 0 ? a : Math.PI - a;   // 얼굴 오른쪽 기준 각 → 무대 각
// 열쇠 장 사이를 부드럽게: keys = [[장, 값], …]
function keyAt(keys, f) { if (f <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (f <= keys[i][0]) { const [f0, v0] = keys[i - 1], [f1, v1] = keys[i], u = (f - f0) / (f1 - f0); return v0 + (v1 - v0) * u * u * (3 - 2 * u); } return keys[keys.length - 1][1]; }

// 무기 한 자루: kind = sword·dagger·axe·hammer·spear·scythe·gun·shield·whip, g = 손잡이, a = 무대 각, sc = 크기, ghost = 맞는 자리에 내리치는 무기 그림자(밝은 두 색).
// 돌려주는 값 = 무기 끝(총구·창끝·날끝)
function drawWeapon(put, kind, g, a, fx, A, { sc = 1, ghost = false, len = 30 } = {}) {
  const c = A.c, w = A.w || WOOD, ca = Math.cos(a), sa = Math.sin(a);
  const T = ([u, v]) => [g[0] + (ca * u - sa * v * fx) * sc, g[1] + (sa * u + ca * v * fx) * sc];
  const F = (pts, col) => poly(put, pts.map(T), col);
  const Ln = (p, q, col) => { for (const [x, y] of strokePx([T(p), T(q)])) put(x, y, col); };
  const lit = Math.sign(fx * (sa - ca)) || -1;   // 빛(왼쪽 위)을 받는 쪽의 v 부호
  const cc = ghost ? [c[0], c[0], c[1], c[1]] : c, ww = ghost ? [c[0], c[1], c[1], c[2]] : w, gg = ghost ? [c[0], c[1], c[1], c[2]] : GOLD;
  const haft = (u0, u1, hw = 1) => { F([[u0, -hw], [u1, -hw], [u1, hw], [u0, hw]], ww[1]); Ln([u0, lit * hw * 0.5], [u1, lit * hw * 0.5], ww[0]); };
  switch (kind) {
    case 'sword': case 'dagger': {   // 손잡이 · 금빛 가드 · 날(빛 받는 날끝 밝게, 반대 날끝 어둡게)
      const s = kind === 'dagger' ? 0.5 : 1, bl = 24 * s;
      haft(-6 * s - 1, 0, 1.1); disc(put, ...T([-6 * s - 2, 0]), 1.5 * sc, gg[1]);
      F([[0, -4.6 * s - 0.6], [2.2, -4.6 * s - 0.6], [2.2, 4.6 * s + 0.6], [0, 4.6 * s + 0.6]], gg[1]);
      F([[2, -2], [bl + 2, -2], [bl + 6, 0], [bl + 2, 2], [2, 2]], cc[1]);
      Ln([3, lit * 1.3], [bl + 3, lit * 0.6], cc[0]); Ln([3, -lit * 1.3], [bl + 2, -lit * 1.3], cc[2]);
      return T([bl + 6, 0]);
    }
    case 'axe': {   // 긴 자루 + 휘두르는 쪽(v+)으로 넓은 날 + 뒤 뿔
      haft(-8, 25, 1);
      F([[13, -2.4], [21, -2.4], [21, 1.6], [26, 5], [25.5, 12], [18, 11], [14.5, 6], [15, 1.6]], cc[2]);
      F([[16, 2.4], [20, 2.4], [23.6, 6], [23.2, 10], [18.6, 9.4], [16.4, 6]], cc[1]);
      Ln([25.6, 5.6], [25, 11.4], cc[0]); Ln([24.6, 11.6], [18.6, 10.8], cc[0]);
      F([[15, -2.4], [19.6, -2.4], [17.3, -6.2]], cc[2]);
      return T([25, 9]);
    }
    case 'hammer': {   // 자루 + 가로로 긴 머리(쇠띠 둘)
      haft(-8, 20, 1.1);
      F([[18, -7.5], [28, -7.5], [28, 7.5], [18, 7.5]], cc[2]);
      F([[18, -7.5 * lit], [28, -7.5 * lit], [28, -4 * lit], [18, -4 * lit]], cc[1]);
      Ln([20.5, -7], [20.5, 7], cc[3]); Ln([25.5, -7], [25.5, 7], cc[3]);
      return T([23, 0]);
    }
    case 'spear': {   // 긴 자루(len) + 잎 모양 창끝 + 금빛 묶음
      haft(-14, len, 0.9);
      F([[len - 1, -2.6], [len + 4, -3.3], [len + 12, 0], [len + 4, 3.3], [len - 1, 2.6]], cc[1]);
      Ln([len, lit * 1.2], [len + 10, 0], cc[0]); Ln([len, -lit * 1.6], [len + 8, -lit * 0.5], cc[2]);
      F([[len - 3.4, -1.9], [len - 1, -1.9], [len - 1, 1.9], [len - 3.4, 1.9]], gg[1]);
      return T([len + 12, 0]);
    }
    case 'scythe': {   // 긴 자루 + 끝에서 앞쪽으로 휘어 내려오는 낫날(안쪽 날 밝게)
      haft(-10, 28, 1);
      F([[25, -1.4], [29.5, -1], [31.5, 5], [30.5, 12], [26.5, 18.5], [19.5, 23], [23.5, 15], [25.8, 8.5], [25.6, 2.5]], cc[1]);
      Ln([29.6, -0.6], [31.2, 5], cc[2]); Ln([31.2, 5.4], [30.2, 12], cc[2]); Ln([30, 12.4], [26.4, 18.4], cc[2]);
      Ln([20.4, 21.6], [23.6, 14.6], cc[0]); Ln([23.8, 14.2], [25.4, 8.4], cc[0]);
      return T([26, 18]);
    }
    case 'gun': {   // 씨앗총: 손잡이(아래) · 몸통 · 총열 · 총구 · 위에 초록 씨앗 통
      F([[-5, 2], [-1, 2], [-3.4, 9], [-7.4, 9]], ww[2]);
      F([[-7, -3.2], [6, -3.2], [6, 3], [-7, 3]], ww[1]); Ln([-6.5, lit * 2.4], [5.5, lit * 2.4], ww[0]);
      F([[6, -2.2], [16, -2.2], [16, 1.8], [6, 1.8]], ww[2]); Ln([6.5, lit * 1.3], [15.5, lit * 1.3], ww[1]);
      F([[15, -3], [18, -3], [18, 2.6], [15, 2.6]], ww[3]);
      const tk = T([-1, -5.4]); disc(put, tk[0], tk[1], 2.5 * sc, ghost ? cc[1] : '#6ab848'); put(Math.floor(tk[0] - 1), Math.floor(tk[1] - 1), ghost ? cc[0] : '#d8f8b0');
      return T([18.6, -0.2]);
    }
    case 'shield': {   // 방패(앞을 봄 — 돌리지 않음, 빛은 늘 왼쪽 위): 테 · 몸 · 빛 받는 왼쪽 반 · 가운데 돌기
      const Q = (pts, col) => poly(put, pts.map(([x, y]) => [g[0] + x * sc, g[1] + y * sc]), col);
      Q([[-7.5, -9.5], [7.5, -9.5], [7.5, 2], [0, 11], [-7.5, 2]], cc[3]);
      Q([[-6.5, -8.5], [6.5, -8.5], [6.5, 1.6], [0, 9.6], [-6.5, 1.6]], cc[2]);
      Q([[-6.5, -8.5], [0, -8.5], [0, 9.6], [-6.5, 1.6]], cc[1]);
      disc(put, g[0], g[1] - 0.5 * sc, 2.3 * sc, cc[0]);
      return g;
    }
    case 'whip': {   // 짧은 손잡이(덩굴은 따로 그림)
      haft(-6, 2, 1.3);
      return T([2.5, 0]);
    }
  }
  return g;
}

// 큰 방패(방패 변이, 2026-10-15 사용자 "너무 작고 옹졸 — 상대 쪽으로 큰 방패, 식물 앞으로 빼서 그만큼 가려지게, 상대가 쓰면 식물이 가려지게"):
//  화분 옆 바닥점 Gp 위에 떠서 상대 쪽을 막아선다. 바닥에 선 것(u 층)이라 깊이 = Gp 줄 → 상대가 카메라 쪽(우리 앞)이면 그 식물 앞을 가리고,
//  상대가 먼 쪽이면 내 화분 옆(같은 깊이)에서 몸 옆을 가린다. front = 앞면이 보임(금테·나무판·잎 문장), 아니면 뒷면(어두운 판·가죽끈·감은 덩굴).
function bigShield(put, Gp, d, front, fx, A, { W = 36, Hh = 52, lift = 10, ghost = false } = {}) {
  const c = A.c, w = ghost ? [c[0], c[1], c[1], c[2]] : WOOD, cx = Gp[0], top = Gp[1] - lift - Hh;
  const hwAt = y => { const t = (y - top) / Hh; if (t < 0 || t > 1) return 0; if (t < 0.06) return W / 2 - (0.06 - t) * 40; if (t < 0.55) return W / 2; const u = (t - 0.55) / 0.45; return W / 2 * Math.sqrt(Math.max(0, 1 - u * u)); };
  const rim = ghost ? [c[0], c[1]] : front ? [c[1], c[2]] : [c[2], c[3]];
  for (let y = Math.floor(top); y <= top + Hh; y++) {
    const hw = hwAt(y + 0.5); if (hw <= 0.4) continue;
    for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
      const dx = x + 0.5 - cx, ex = hw - Math.abs(dx), ey = y + 0.5 - top, edge = ex < 2.2 || ey < 2.2 || hwAt(y + 2.5) < Math.abs(dx) + 0.6;
      const plank = Math.round(dx + 100) % 7 === 0;
      const col = edge ? (dx < 0 || ey < 2.2 ? rim[0] : rim[1]) : front ? (plank ? w[2] : dx < 0 ? w[0] : w[1]) : (plank ? w[3] : w[2]);
      put(x, y, col, d);
    }
  }
  if (front) {   // 잎 문장 + 금 돌기
    const ly = top + Hh * 0.44, g1 = ghost ? c[0] : '#8cd860', g2 = ghost ? c[1] : '#4a9a3a', g3 = ghost ? c[2] : '#24501e';
    for (let y = -8; y <= 8; y++) { const hw = 4.6 * Math.cos(y / 8.6 * Math.PI / 2); for (let x = -Math.round(hw); x < Math.round(hw); x++) put(Math.round(cx + x), Math.round(ly + y), x * fx < 0 ? g1 : g2, d); }
    for (let y = -7; y <= 7; y++) put(Math.round(cx) - (fx < 0 ? 1 : 0), Math.round(ly + y), g3, d);
    disc((x, y, col) => put(x, y, col, d), cx, top + 5, 2.2, ghost ? c[0] : c[0]);
  } else {   // 가죽끈 + 끈을 감아 쥔 덩굴(식물이 들고 있음)
    const sy = Math.round(top + Hh * 0.4);
    for (let x = Math.round(-W / 2 + 3); x < Math.round(W / 2 - 3); x++) { put(Math.round(cx + x), sy, ghost ? c[1] : '#7a5038', d); put(Math.round(cx + x), sy + 1, ghost ? c[2] : '#4a2e1e', d); }
    for (let q = -2; q <= 2; q++) { put(Math.round(cx + q * 2 - fx * 3), sy - 1 + (q & 1), ghost ? c[0] : '#6ab848', d); put(Math.round(cx + q * 2 - fx * 3), sy + 2 - (q & 1), ghost ? c[1] : '#2e6a26', d); }
  }
}

const WKIND = { w_slash: 'sword', w_thrust: 'sword', w_chop: 'axe', w_sweep: 'axe', w_shot: 'gun', w_burst: 'gun', w_snipe: 'gun', w_smash: 'hammer', w_spear: 'spear', w_flurry: 'dagger', w_bind: 'whip', w_reap: 'scythe', w_bash: 'shield' };
const REST = { w_slash: -1.15, w_thrust: -1.0, w_chop: -1.0, w_sweep: -1.0, w_smash: -1.2, w_spear: -1.25, w_flurry: -0.9, w_reap: -1.35, w_bind: -1.0, w_bash: 0 };
// 무기를 든 각(얼굴 오른쪽 기준, 0 = 앞 수평 · −π/2 = 위)의 열쇠 장. aim = 상대를 겨눈 각
function swingKeys(kind, aim) {
  const R = REST[kind];
  switch (kind) {
    case 'w_slash': return [[0, R], [6, R], [12, -2.6], [13, -0.3], [14, 0.7], [18, 0.7], [26, R]];
    case 'w_chop': return [[0, R], [6, R], [12, -2.9], [13, -1.2], [14, 0.6], [19, 0.6], [27, R]];
    case 'w_sweep': return [[0, R], [6, R], [12, -3.0], [13, -0.9], [14, 0.35], [19, 0.35], [27, R]];
    case 'w_smash': return [[0, R], [6, R], [12, -2.5], [13, -1.0], [14, 0.45], [20, 0.45], [28, R]];
    case 'w_reap': return [[0, R], [6, R], [12, -2.8], [13, -0.6], [14, 0.5], [19, 0.5], [27, R]];
    case 'w_bind': return [[0, R], [8, R], [12, -2.4], [13, aim], [20, aim], [27, R]];
    case 'w_shot': case 'w_burst': case 'w_snipe': return [[0, aim + 0.55], [6, aim + 0.55], [10, aim], [24, aim], [30, aim + 0.55]];
    default: return [[0, R], [7, R], [11, aim], [21, aim], [28, R]];   // 찌르기류(검 찌르기·창·단검)
  }
}
// 손을 무기 방향으로 밀고 당김(찌르기·방패 밀치기)
const PUSH = {
  w_thrust: [[0, 0], [9, 0], [12, -7], [13, 10], [16, 10], [21, 0]],
  w_spear: [[0, 0], [9, 0], [12, -8], [13, 0]],
  w_flurry: [[0, 0], [11, 0], [12, -3], [13, 7], [14, -2], [15, 7], [16, -2], [17, 7], [19, 0]],
  w_bash: [[0, 0], [8, 0], [12, -4], [13, 10], [16, 10], [22, 0]],
};
// 맞는 자리에 내리치는 무기 그림자: 손잡이 = 대상 머리에서 (옆, 아래), 크기, 장(k)별 얼굴 오른쪽 기준 각
const GHOST = {
  w_chop: { at: [-22, 4], sc: 1.55, ang: { '-2': -2.3, '-1': -1.1, 0: 0.45, 1: 0.45, 2: 0.45 } },
  w_smash: { at: [-34, 4], sc: 1.7, ang: { '-2': -2.2, '-1': -1.2, 0: -0.3, 1: -0.3, 2: -0.3 } },
  w_reap: { at: [-30, 10], sc: 1.6, ang: { '-2': -2.6, '-1': -1.2, 0: 0.1, 1: 0.6 } },
};

function weaponFx(P, A, f, L, T, G, seed, S) {
  const I = impactAt(A), c = A.c, w = A.w || WOOD, k = f - I, fx = S.fx || 1, R = S.Rh || 15, kind = A.kind, wk = WKIND[kind];
  const H = [L[0] + fx * (R + 7), Math.min(L[1] + R + 9, (S.soilA ?? 1e9) - 10)];   // 손잡이 자리: 몸 옆(상대 쪽, 얼굴에 안 겹치게 머리 아래) · 흙보다 위
  const aimF = Math.atan2(T[1] - H[1], Math.abs(T[0] - H[0])), toT = Math.atan2(T[1] - H[1], T[0] - H[0]), dist = Math.hypot(T[0] - H[0], T[1] - H[1]);
  const shots = kind === 'w_burst' ? [13, 14, 15] : kind === 'w_snipe' ? [17] : [13];
  const fa = ff => keyAt(swingKeys(kind, aimF), ff), a = angF(fx, fa(f));
  const push = wk === 'gun' ? (shots.includes(f) ? -3.5 : shots.includes(f - 1) ? -1.5 : 0) : PUSH[kind] ? keyAt(PUSH[kind], f) : 0;
  const g = wk === 'shield' ? ptA(H, toT, 4 + push) : ptA(H, a, push);
  // 휘두름 잔상: 한 장에 0.6rad 넘게 돌면 손잡이 둘레에 무기 길이만큼 호
  const reach = { sword: 30, axe: 26, hammer: 27, scythe: 30 }[wk], d0 = fa(f - 1), d1 = fa(f);
  if (reach && Math.abs(d1 - d0) > 0.6) crescentF(fx, P.p, g[0], g[1], reach, Math.min(d0, d1), Math.max(d0, d1), 6, c[0], c[1]);
  // 창은 찌르는 동안 자루가 상대까지 늘어남
  const ext = kind === 'w_spear' ? keyAt([[12, 0], [13, 0.55], [14, 1], [15, 1], [16, 0.6], [17, 0.25], [18, 0]], f) : 0;
  let tip = g;
  if (wk === 'shield' && S.A0 && S.B0) {   // 큰 방패: 화분 옆 상대 쪽 바닥점에 서서(밀치기 때 앞으로) 깊이로 식물과 앞뒤를 가림
    const ph = S.phiS ?? 0, r0 = (S.rf || 18) + 7, r = r0 + Math.max(-3, push * 0.9), Kk = S.K || 0.4384;
    const Gp = [S.A0[0] + Math.cos(ph) * r, S.A0[1] + Math.sin(ph) * r * Kk], d = S.A0[1] + Math.sin(ph) * r0 * Kk;
    bigShield(P.u || ((x, y, col) => P.o(x, y, col)), Gp, Math.round(d), S.B0[1] > S.A0[1], fx, A);
  } else tip = drawWeapon(P.o, wk, g, a, fx, A, { len: 30 + Math.max(0, dist - 40) * ext, sc: wk === 'gun' ? 1.35 : 1 });
  // 무기 그림자(맞는 자리)
  const gh = GHOST[kind];
  if (gh && gh.ang[k] !== undefined) drawWeapon(P.o, wk, [T[0] + gh.at[0] * fx, T[1] + gh.at[1]], angF(fx, gh.ang[k]), fx, A, { sc: gh.sc, ghost: true });
  switch (kind) {
    case 'w_slash': {   // 검 베기: 큰 초승달 베기 → 베인 자리 붉은 줄 + 피 방울(출혈 강화)
      if (k === 0) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 32, -2.4, 0.9, 7, c[0], c[1]);
      if (k === 1) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 33, -2.6, 1.1, 4.5, c[1], c[2]);
      if (k === 2) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 34, -2.6, 1.1, 2.4, c[2], c[2], u => Math.floor(u * 6) % 2 === 0);
      if (k >= 1 && k < 10) for (const [x, y] of strokePx([[T[0] - 13 * fx, T[1] - 11], [T[0] + 13 * fx, T[1] + 9]])) if (k < 6 || (x + y) % 2) P.o(x, y, k < 3 ? A.blood[1] : A.blood[2]);
      if (k >= 1 && k < 14) particles(P.p, burstParticles(seed, T[0], T[1], 12, 1.7, A.blood.slice(1), { g: 0.25, life: 13, up: 0.6, size: 2 }), k - 1);
      break;
    }
    case 'w_thrust': {   // 검 찌르기: 칼끝에서 곧은 섬광 → 칼 그림자가 대상을 꿰뚫음 → 뒤로 빠지는 불꽃
      if (f === 13) line(P.p, tip, ptA(T, toT, -6), c[0], 2);
      if (k === 0 || k === 1) drawWeapon(P.o, 'sword', ptA(T, toT, 14 - 39), toT, fx, A, { sc: 1.3, ghost: true });
      if (k === 0) starBurst(P.o, T[0], T[1], 3, 13, 8, c[0], c[1], 0.3);
      if (k === 1) starBurst(P.p, T[0], T[1], 6, 15, 8, c[1], c[2], 0.6);
      if (k >= 0 && k < 8) particles(P.p, burstParticles(seed, ...ptA(T, toT, 12), 9, 2.4, [c[0], c[1], c[2]], { g: 0.08, life: 8 }), k);
      break;
    }
    case 'w_chop': {   // 도끼 내려찍기: 큰 도끼 그림자가 위에서 내리꽂힘(호) → 바닥 잔금 · 방어 파편(방어 깨기)
      if (k === 0 || k === 1) crescentF(fx, P.p, T[0] + gh.at[0] * fx, T[1] + gh.at[1], 40, -1.1, 0.45, k ? 3 : 6, c[0], c[1]);
      if (k >= 0 && k < 12 && S.B0) radialCracks(P.f, S.B0, S.rf + 1, S.K, seed + 5, k >= 7);
      if (k >= 1 && k < 12) particles(P.p, burstParticles(seed + 9, T[0], T[1] + 4, 10, 2.2, ['#e8f4ff', '#a8c0e0', '#607898'], { g: 0.3, life: 11, up: 1.4, size: 2 }), k - 1);
      break;
    }
    case 'w_sweep': {   // 도끼 휘두르기(범위): 대상 앞을 크게 휩쓰는 넓은 호 + 바람결
      if (k >= 0 && k < 3) crescentF(fx, P.o, T[0] - 24 * fx, T[1] + 2, 42, -0.95, 0.95, [8, 5, 2.4][k], c[k ? 1 : 0], c[k < 2 ? 1 : 2], k === 2 ? u => Math.floor(u * 6) % 2 === 0 : undefined);
      if (k >= 0 && k < 6) for (let q = 0; q < 4; q++) line(P.p, [T[0] + (10 + k * 3) * fx, T[1] - 15 + q * 9], [T[0] + (24 + k * 3) * fx, T[1] - 16 + q * 9], c[1]);
      break;
    }
    case 'w_shot': case 'w_burst': case 'w_snipe': {   // 씨앗총: 총구 불꽃 + 씨앗 탄(꼬리) → 맞은 자리 폭발, 씨앗 껍질이 뒤로 튐 / 연사 = 3발 / 저격 = 붉은 조준선 뒤 굵은 한 발
      const M = tip;
      if (kind === 'w_snipe' && f >= 8 && f <= 16 && f % 2 === 0) { for (const [x, y] of strokePx([M, T])) if ((x + y) % 3 === 0) P.p(x, y, '#ff4a4a'); ringPx(P.p, T[0], T[1], 7, '#ff4a4a', q => Math.floor(q * 4 / Math.PI) % 2 === 0); }
      shots.forEach((fs, q) => {
        const t = f - fs, tg = [T[0] + (kind === 'w_burst' ? [-3, 3, 0][q] : 0), T[1] + (kind === 'w_burst' ? [-4, 2, 6][q] : 0)];
        if (t === 0) { disc(P.o, M[0], M[1], kind === 'w_snipe' ? 5 : 3.5, c[1]); disc(P.o, M[0], M[1], kind === 'w_snipe' ? 3 : 2, c[0]); starBurst(P.p, M[0], M[1], 3, kind === 'w_snipe' ? 12 : 8, 6, c[0], c[2], 0.2); }
        if (kind === 'w_snipe' && t === 0) line(P.o, M, tg, c[0], 2);
        if (kind !== 'w_snipe' && (t === 0 || t === 1)) { const u = (t + 1) / 2, b = [M[0] + (tg[0] - M[0]) * u, M[1] + (tg[1] - M[1]) * u]; line(P.p, ptA(b, toT, -14), b, c[0]); disc(P.o, b[0], b[1], 2, c[1]); }
        const kk = t - (kind === 'w_snipe' ? 1 : 2);
        if (kk >= 0 && kk < 3) { disc(P.o, tg[0], tg[1], [4, 5.5, 3.5][kk], c[kk ? 2 : 1]); ringPx(P.o, tg[0], tg[1], 5 + kk * 3, c[1]); }
        if (kk >= 0 && kk < 8) particles(P.p, burstParticles(seed + q * 3, tg[0], tg[1], 7, 2, [c[0], c[1], c[2]], { g: 0.15, life: 7 }), kk);
        if (t >= 0 && t < 10) particles(P.p, [{ x: g[0] - 2 * fx, y: g[1] - 3, vx: -1.3 * fx, vy: -2.2, g: 0.4, life: 10, t0: 0, cols: [w[0], w[1]], size: 2 }], t);   // 씨앗 껍질
      });
      if (kind === 'w_snipe' && k >= 0 && k < 3) starBurst(P.o, T[0], T[1], 5, 17, 8, c[0], c[1], 0.4);
      break;
    }
    case 'w_smash': {   // 망치 강타: 큰 망치 그림자가 머리 위로 내리찍음 → 별빛 + 바닥 충격 고리 → 머리 위 별 빙빙(기절)
      if (k === 0 || k === 1) starBurst(P.p, T[0], T[1] - 12, 6, 15, 8, c[0], c[1], 0.2);
      if (k >= 0 && k < 5 && S.B0) floorRing(P.f, S.B0, S.rf + 4 + k * 7, S.K, k < 3 ? c[0] : c[1], q => k < 3 || Math.floor(q * 3) % 2 === 0);
      if (k >= 0 && k < 9) particles(P.p, burstParticles(seed, T[0], T[1] - 6, 10, 2.4, [c[0], c[1], c[2]], { g: 0.3, life: 9, up: 1 }), k);
      break;
    }
    case 'w_spear': {   // 창 찌르기: 자루가 쭉 늘어나 대상을 찌름(긴 거리) → 불꽃 → 거둠
      if (k >= 0 && k < 3) starBurst(P.o, T[0], T[1], 3, 12 - k * 2, 6, c[0], c[1], toT);
      if (k >= 0 && k < 7) particles(P.p, burstParticles(seed, ...ptA(T, toT, 6), 8, 2.2, [c[0], c[1], c[2]], { g: 0.1, life: 7 }), k);
      break;
    }
    case 'w_flurry': {   // 단검 연속 찌르기: 짧은 찌르기 셋(자리 바꿔) + 작은 X 자국 → 독 쌓임
      [[-6, -6], [5, 2], [-2, 8]].forEach(([dx, dy], q) => { const t = f - (I - 2 + q), x = T[0] + dx, y = T[1] + dy; if (t === 0 || t === 1) { line(P.o, [x - 5, y - 5], [x + 5, y + 5], t ? c[1] : c[0]); line(P.o, [x + 5, y - 5], [x - 5, y + 5], t ? c[1] : c[0]); } if (t >= 0 && t < 5) particles(P.p, burstParticles(seed + q, x, y, 5, 1.8, [c[0], c[1]], { g: 0.1, life: 5 }), t); });
      break;
    }
    case 'w_bind': {   // 덩굴 채찍: 쉴 땐 손잡이에서 늘어진 덩굴 → 뒤로 젖혔다 뻗어 → 대상 아랫몸을 고리 셋이 감아 조임(묶기)
      const vc = A.c, low = [T[0], (T[1] + G) / 2 + 2];
      if (f >= 13 && f <= 19) {
        const e = Math.min(1, (f - 12) / 4), to = [tip[0] + (low[0] - tip[0]) * e, tip[1] + (low[1] - tip[1]) * e], mid = [(tip[0] + to[0]) / 2, Math.min(tip[1], to[1]) - 18 * e], pts = [];
        for (let i = 0; i <= 24; i++) { const t = i / 24, u = 1 - t; pts.push([u * u * tip[0] + 2 * u * t * mid[0] + t * t * to[0], u * u * tip[1] + 2 * u * t * mid[1] + t * t * to[1]]); }
        for (const [x, y] of strokePx(pts)) { P.o(x, y, vc[1]); P.o(x, y + 1, vc[2]); }
      } else {   // 늘어진 덩굴(손잡이 끝 → 아래로 한 번 말림)
        const pts = [tip, [tip[0] + fx * 5, tip[1] + 6], [tip[0] + fx * 3, tip[1] + 12], [tip[0] - fx * 1, tip[1] + 10], [tip[0], tip[1] + 7]];
        for (const [x, y] of strokePx(pts)) { P.o(x, y, vc[1]); P.o(x + 1, y, vc[2]); }
      }
      if (k >= 0 && k < 6) { const r = 16 - k * 0.8; [-8, 0, 8].forEach(dy => ellipseRingPx(P.o, low[0], low[1] + dy, r, r * 0.32, vc[1], vc[3])); }
      break;
    }
    case 'w_reap': {   // 낫 베어 넘기기(범위): 큰 낫 그림자가 대상을 가로지름 + 넓은 호 → 초록 빛이 공격 쪽으로(흡수)
      if (k >= 0 && k < 3) crescentF(fx, P.o, T[0] - 30 * fx, T[1] + 4, 46, -0.7, 0.75, [7, 5, 2.6][k], c[k ? 1 : 0], c[k < 2 ? 1 : 2], k === 2 ? u => Math.floor(u * 6) % 2 === 0 : undefined);
      if (k >= 2 && k < 14) for (let q = 0; q < 5; q++) { const t = (k - 2 - q) / 9; if (t < 0 || t > 1) continue; const x = T[0] + (L[0] - T[0]) * t, y = T[1] + (L[1] - T[1]) * t - Math.sin(Math.PI * t) * 14; disc(P.o, x, y, 1.6, q % 2 ? c[1] : '#a8ff90'); }
      break;
    }
    case 'w_bash': {   // 방패 밀치기: 방패를 앞세워 밀고 들어감 → 방패 그림자가 대상 옆을 들이받음 → 밀림 물결 ))) → 내 둘레 방어 기운
      if (k >= -1 && k <= 2) bigShield((x, y, col) => P.o(x, y, col), [T[0] - fx * [30, 19, 17, 17][k + 1], T[1] + 34], 0, true, fx, A, { ghost: true, W: 30, Hh: 44 });
      if (k >= 0 && k < 5) for (let q = 0; q < 3; q++) crescentF(fx, P.p, T[0] + (6 + q * 5 + k * 2) * fx, T[1], 11 + q * 2, -0.8, 0.8, 1.3, c[0], c[1]);
      break;
    }
  }
}

// 기술 효과(공격 → 대상). L = 공격 쪽 머리, T = 대상 머리, G = 대상 흙 높이(무대 y),
// S = 무대: D(L→T 단위), fx(상대가 오른쪽이면 +1), K, A0·B0(공격·대상 화분 굽 가운데), S0·E0(바닥 길 출발·도착), phiE(도착 각), rf(굽 반지름)
export function skillFx(P, A, f, L, T, G, seed = 1, S = { D: [1, 0], fx: 1 }) {
  if (A.kind.startsWith('w_')) return weaponFx(P, A, f, L, T, G, seed, S);
  const I = impactAt(A), c = A.c, k = f - I, fx = S.fx, D = S.D;
  switch (A.kind) {
    case 'slash': {   // 장미 칼날 잎 베기: 초승달(흰 속·연두 겉) → 꽉 찬 베기 → 조각 → 흩어짐 + 꽃잎 터짐
      if (k === 0) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 26, -2.4, 0.9, 5.5, c[0], c[1]);
      if (k === 1) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 27, -2.6, 1.1, 4.2, c[1], c[2]);
      if (k === 2) crescentF(fx, P.o, T[0] - 6 * fx, T[1], 28, -2.6, 1.1, 2.6, c[2], c[2], u => Math.floor(u * 6) % 2 === 0);
      if (f === 13 || f === 14) for (let s = 0; s < 3; s++) line(P.p, [L[0] + 6 * fx, L[1] - 10 + s * 6], [L[0] + 22 * fx, L[1] - 12 + s * 6], c[1]);   // 잔상
      if (k >= 0 && k < 16) particles(P.p, burstParticles(seed, T[0] - 2, T[1] - 2, 9, 2.2, A.petal, { g: 0.1, life: 16, up: 0.8, size: 2 }), k);
      break;
    }
    case 'whip': {   // 가시 채찍: 덩굴 줄이 뻗어(곡선) 끝에서 '딱' 별 → 줄 거두기 + 가시 파편
      const from = [L[0] + 12 * fx, L[1] + 2];
      if (f >= 13 && f <= 17) {
        const ext = f === 13 ? 0.55 : f <= 15 ? 1 : f === 16 ? 0.6 : 0.25, to = [from[0] + (T[0] - from[0]) * ext, from[1] + (T[1] - from[1]) * ext], mid = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - 14 * ext];
        const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, u = 1 - t; pts.push([u * u * from[0] + 2 * u * t * mid[0] + t * t * to[0], u * u * from[1] + 2 * u * t * mid[1] + t * t * to[1]]); }
        for (const [x, y] of strokePx(pts)) { P.o(x, y, c[1]); P.o(x, y + 1, c[2]); }
      }
      if (k === 0 || k === 1) { disc(P.o, T[0], T[1], 4 - k, c[0]); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.4; line(P.p, [T[0] + Math.cos(a) * 5, T[1] + Math.sin(a) * 5], [T[0] + Math.cos(a) * (11 - k * 2), T[1] + Math.sin(a) * (11 - k * 2)], c[0]); } }
      if (k >= 0 && k < 12) particles(P.p, burstParticles(seed, T[0], T[1], 7, 1.8, ['#f4f0d0', '#c8c098', '#8a8460'], { g: 0.12, life: 12, up: 0.5, size: 2 }), k);
      break;
    }
    case 'bubbles': {   // 물방울 셋: 포물선으로 날아가 터지며 물이 튐
      [0, 2, 4].forEach((d, q) => {
        const t0 = 13 + d, t = f - t0, dur = 6, hx = T[0] - 4 * fx + q * 4 * fx, hy = T[1] - 2 + q * 3, sx = L[0] + 8 * fx;
        if (t >= 0 && t < dur) { const u = t / dur, x = sx + (hx - sx) * u, y = L[1] + (hy - L[1]) * u - Math.sin(Math.PI * u) * 16; disc(P.o, x, y, 4.5, c[2]); disc(P.o, x, y, 3.2, c[1]); P.o(Math.floor(x) - 2, Math.floor(y) - 2, c[0]); P.o(Math.floor(x) - 1, Math.floor(y) - 2, c[0]); }
        if (t >= dur && t < dur + 12) { const kk = t - dur; if (kk < 3) ringPx(P.o, hx, hy, 4 + kk * 3, kk < 2 ? c[1] : c[2], () => true, 1, 2); particles(P.p, burstParticles(seed + q, hx, hy, 7, 1.7, [c[0], c[1], c[2]], { g: 0.22, life: 12, up: 1.1, size: 2 }), kk); }
      });
      break;
    }
    case 'gale': {   // 꽃잎 돌풍: 굵은 바람결 선 여럿 + 꽃잎이 물결치며 대상으로(공격 머리 → 대상 머리 방향)
      const [dx, dy] = D, nx = -dy, ny = dx, dist = Math.hypot(T[0] - L[0], T[1] - L[1]), sp = (dist + 16) / 7;
      for (let q = 0; q < 7; q++) { const t = f - 13 - (q % 3); if (t < 0 || t > 7) continue; const off = q * 5 - 14, head = 8 + t * sp; for (let s = 0; s < 22; s++) { const a = head - s, w = off + Math.sin((a + q * 5) * 0.18) * 1.3, x = L[0] + dx * a + nx * w, y = L[1] + dy * a + ny * w; P.p(Math.floor(x), Math.floor(y), s < 3 ? c[0] : c[2]); if (s < 10) P.p(Math.floor(x + nx), Math.floor(y + ny), c[1]); } }
      for (let q = 0; q < 9; q++) { const t = f - 13 - (q % 4), dur = 7; if (t < 0 || t > dur + 5) continue; const u = Math.min(1, t / dur), a = 10 + (dist - 10) * u + (t > dur ? (t - dur) * 3 : 0), w = (q * 3 - 12 + Math.sin(t * 0.9 + q) * 4) * (1 - u * 0.6); disc(P.o, L[0] + dx * a + nx * w, L[1] + dy * a + ny * w, 1.6, A.petal[q % 2]); }
      break;
    }
    case 'bolt': {   // 낙뢰(saint11 벼락 순서): 첫 충격 → 하얗게·다른 모양 → 쉼 → 첫 장 조각 → 쉼 → 흩어짐 + 불똥
      const top = [T[0] + 6, -2], ang = Math.atan2(T[1] - top[1], T[0] - top[0]), len = Math.hypot(T[0] - top[0], T[1] - top[1]), first = zigzag(top, ang, len, rng(seed), 7), hw = s => 1.2 + 2.2 * Math.sin(Math.PI * Math.min(1, s * 1.05)) ** 0.5;
      if (k === 0) fillBolt(P.o, first, hw, c[1], c[2]);
      if (k === 1) fillBolt(P.o, zigzag(top, ang + 0.05, len, rng(seed + 1), 7), s => hw(s) * 0.9, c[0], c[1], () => true, 0.8);
      if (k === 3) fillBolt(P.o, first, s => hw(s) * 0.5, c[2], c[2], s => (s > 0.1 && s < 0.3) || (s > 0.45 && s < 0.62) || (s > 0.78 && s < 0.95));
      if (k >= 1 && k <= 4) particles(P.p, burstParticles(seed, T[0], T[1] - 2, 9, 3, [c[0], c[2], c[3]], { g: 0.18, life: 5, size: 2 }), k - 1);
      if (f >= 11 && f <= 13) { const a0 = [L[0] + 4 * fx, L[1] - 16]; for (const [x, y] of strokePx([a0, [a0[0] + 4 * fx, a0[1] - 4], [a0[0] + fx, a0[1] - 8], [a0[0] + 5 * fx, a0[1] - 12]])) { P.p(x, y, f === 12 ? c[0] : c[1]); P.p(x + 1, y, c[2]); } }
      break;
    }
    case 'wave': {   // 물기둥 줄: 공격 쪽 화분 굽 옆에서 첫 물기둥 → 바닥을 따라 한 장에 하나씩 솟으며 다가감(지나간 자리는 물결 고리·젖은 줄) → 대상 화분 굽 옆에서 큰 물기둥이 식물 쪽으로 터짐 → 무너져 화분 둘레 웅덩이
      const g = groundOf(S), N = Math.max(3, Math.round(g.len / 75)), at = u => [S.S0[0] + g.dx * u, S.S0[1] + g.dz * u * S.K], lead = (S.E0[0] - S.S0[0]) / Math.hypot(S.E0[0] - S.S0[0], S.E0[1] - S.S0[1]) * 0.12;
      const head = Math.max(0, Math.min(1, (f - 13) / N));   // 젖은 줄은 마지막으로 솟은 기둥까지
      if (f >= 13 && k < 12) for (let i = 0; i <= 120; i++) { const u = head * i / 120, p = at(u), x = Math.floor(p[0]), y = Math.floor(p[1]); if (k >= 5 && ((x * 7 + y * 13) % 10) / 10 > 1 - (k - 4) / 7) continue; P.f(x, y, 0.8); if (i % 9 === 0) P.f(x + 1, y, c[2]); }
      for (let i = 0; i < N; i++) {
        const fi = 13 + Math.round(i * (I - 1 - 13) / N), t = f - fi, b = at(i / N); if (t < 0) continue;
        if (t < SPOUT_T.length) { const [hs, br] = SPOUT_T[t]; spout(P.u, b, (13 + 5 * i / N) * hs, 2.6, lead, c, b[1] + 0.5, f, br, seed + i); }
        if (t < 4) floorRing(P.f, b, 4 + t * 3, S.K, c[1], a => t < 2 || Math.floor(a * 3) % 2 === 0);
        if (t >= 2 && t < 9) particles(P.p, burstParticles(seed + i * 11, b[0], b[1] - 14 - 4 * i / N, 5, 1.2, [c[0], c[1], c[2]], { g: 0.3, life: 7, size: 2 }), t - 2);
        if (t >= 1 && t < 12) puddle(P.f, b, 4 + Math.min(t, 4), S.K, c, t >= 8, seed + i);
      }
      // 대상 화분 굽 옆 큰 물기둥: 식물 쪽으로 기울어 아랫몸을 친다
      const kk = f - (I - 1), Hg = 56, lean2 = (T[0] - S.E0[0]) * 0.6 / Hg;
      if (kk >= 0 && kk < 6) { const [hs, br] = [[0.5, 0], [1, 0], [1.05, 0], [0.88, 0.3], [0.62, 0.6], [0.32, 0.9]][kk]; spout(P.u, S.E0, Hg * hs, 5.2, lean2, c, S.E0[1] + 0.5, f, br, seed); }
      if (kk >= 1 && kk < 5) sprayFan(P.u, [S.E0[0] + lean2 * Hg * [1, 1.05, 0.9, 0.7][kk - 1], S.E0[1] - Hg * [1, 1.05, 0.9, 0.7][kk - 1]], lean2, c, S.E0[1] + 0.5, [0.45, 0.8, 1, 1][kk - 1]);
      if (kk >= 0 && kk < 4) crown(P.u, S.E0, g, 9, [7, 12, 10, 6][kk], S.E0[0], c, f, S.E0[1] + 0.6);
      if (kk >= 0 && kk < 4) floorRing(P.f, S.E0, 6 + kk * 4, S.K, c[1], a => kk < 2 || Math.floor(a * 3) % 2 === 0);
      if (k >= 2 && k < 14) particles(P.p, burstParticles(seed + 3, S.E0[0] + lean2 * Hg, S.E0[1] - Hg * 0.95, 12, 1.8, [c[0], c[1], c[2]], { g: 0.3, life: 12, size: 2 }), k - 2);
      if (k >= 1 && k < 15) puddle(P.f, S.B0, S.rf + 6 + Math.min(k, 7) * 3, S.K, c, k >= 10, seed);
      if (k >= 0 && k < 14) particles(P.p, burstParticles(seed, T[0] - 2, T[1] + 8, 14, 2.2, [c[0], c[1], c[2]], { g: 0.22, life: 14, up: 1.6, size: 2 }), k);
      break;
    }
    case 'fireball': {   // 불덩이: 팔 끝에서 날아가며 불티 꼬리 → 폭발
      const from = [L[0] + 16 * fx, L[1] + 4], dur = 7, t = f - 13, fl = Math.hypot(T[0] - from[0], T[1] - from[1]) || 1, ux = (T[0] - from[0]) / fl, uy = (T[1] - from[1]) / fl;
      if (t >= 0 && t < dur) { const u = t / dur, x = from[0] + (T[0] - from[0]) * u, y = from[1] + (T[1] - from[1]) * u - Math.sin(Math.PI * u) * 8; for (let q = 1; q <= 5; q++) disc(P.p, x - q * 4 * ux, y - q * 4 * uy + Math.sin((t + q) * 2) * 1.5, Math.max(0.6, 2.4 - q * 0.4), q < 2 ? c[1] : q < 4 ? c[2] : c[3]); disc(P.o, x, y, 5, c[2]); disc(P.o, x + 0.6 * fx, y - 0.4, 3.4, c[1]); disc(P.o, x + 1.2 * fx, y - 1, 1.6, c[0]); }
      if (k >= 0 && k <= 8) explosion(P, T[0], T[1], k, c, seed);
      if (k >= 1 && k < 11) particles(P.p, burstParticles(seed + 5, T[0], T[1], 12, 2.6, [c[0], c[1], c[2], c[3]], { g: 0.12, life: 10, size: 2 }), k - 1);
      break;
    }
    case 'slam': {   // 땅 내려치기: 공격 쪽 화분 굽 둘레 흙먼지 고리·잔금 → 갈라짐이 바닥을 달려 대상 화분 굽 가장자리에 닿음 → 그 자리에서 바위 조각이 비스듬히 솟아 식물을 찌름 + 화분째 들썩 → 부서져 내림
      const run0 = 14, run1 = I - 1, cp = crackPath(S.S0, S.E0, S.K, seed);
      if (f >= 13 && f <= 16) { const t = f - 13; floorRing(P.f, S.A0, S.rf + 4 + t * 6, S.K, t < 2 ? '#b8a688' : '#8c7a60', a => t < 2 || Math.floor(a * 4 + t) % 2 === 0); }
      if (f >= 13 && f < 21) for (const side of [-1, 1]) { const t = f - 13, b = [S.A0[0] + side * (S.rf + 4), S.A0[1]]; dustPuff(P.s, b[0] + side * t * 1.3, b[1] - 2 - t * 0.9, 2.4 + t * 0.4, b[1] + 0.5, t > 4); }
      if (f >= 13 && f < 32) radialCracks(P.f, S.A0, S.rf + 1, S.K, seed + 3, f >= 25);
      if (f >= run0 && k < 14) drawCrack(P.f, cp, (f - run0 + 1) / (run1 - run0 + 1), k >= 7 ? 1 : 0);
      for (let fs = run0; fs <= run1; fs++) {   // 갈라짐 머리에서 튀는 돌 조각·먼지
        const t = f - fs; if (t < 0 || t >= 6) continue;
        const h = pathAt(cp, (fs - run0 + 1) / (run1 - run0 + 1)), r1 = rng(seed + fs * 31);
        for (let j = 0; j < 3; j++) { const vx = (r1() - 0.5) * 2.2, vy = -1.6 - r1() * 1.4, x = h[0] + vx * t, y = h[1] - 1 + vy * t + 0.28 * t * t; if (y > h[1]) continue; const col = j ? c[2] : c[1]; P.u(Math.floor(x), Math.floor(y), col, h[1]); if (t < 3) P.u(Math.floor(x) + 1, Math.floor(y), col, h[1]); }
        if (t < 5) dustPuff(P.s, h[0] - 2, h[1] - 2 - t * 0.8, 1.6 + t * 0.45, h[1], t > 2);
      }
      // 도착점(대상 굽 가장자리)에서 바위 조각: 큰 것 = 식물 줄기 쪽으로 비스듬히, 작은 둘 = 양옆으로 벌어짐
      const rad = [Math.cos(S.phiE), Math.sin(S.phiE)], tan = [-rad[1], rad[0]], b0 = [S.B0[0] + rad[0] * (S.rf + 3), S.B0[1] + rad[1] * (S.rf + 3) * S.K];
      const aim = [S.B0[0] + rad[0] * 4, G - 28];   // 식물 아랫몸(흙 위 28칸, 화분 가운데 쪽)
      const shardAt = ([o, sc, w, spread]) => {   // 옆 조각은 큰 조각에서 먼 쪽(화면 좌우)으로 벌어짐
        const b = [b0[0] + tan[0] * o, b0[1] + tan[1] * o * S.K], L0 = Math.hypot(aim[0] - b0[0], aim[1] - b0[1]), dir = [(aim[0] - b0[0]) / L0, (aim[1] - b0[1]) / L0];
        const side = Math.abs(b[0] - b0[0]) >= 2 ? Math.sign(b[0] - b0[0]) : Math.sign(o);
        return { b, w, tip: [b[0] + (dir[0] + side * spread) * L0 * sc, b[1] + dir[1] * L0 * sc] };
      };
      if (k >= 0 && k < 10) {
        const gr = k === 0 ? 0.5 : k === 1 ? 1.08 : 1, keep = k <= 3 ? 1 : 1 - (k - 3) / 6;
        SHARDS.forEach((sh, q) => { const { b, w, tip } = shardAt(sh), tp2 = [b[0] + (tip[0] - b[0]) * gr, b[1] + (tip[1] - b[1]) * gr]; rockShard(P.u, b, tp2, w, c, b[1] + 0.5, seed + q * 7, keep); if (q === 0 && (k === 1 || k === 2)) disc((x, y, cc) => P.u(x, y, cc, b[1] + 0.6), tp2[0], tp2[1] + 2, 2, A.gem); });
        if (k >= 4) SHARDS.forEach((sh, q) => { const { b, tip } = shardAt(sh); particles(P.p, burstParticles(seed + 20 + q, b[0] + (tip[0] - b[0]) * keep, b[1] + (tip[1] - b[1]) * keep, 4, 1.3, [c[1], c[2], c[3]], { g: 0.35, life: 6, size: 2 }), k - 4); });   // 부서져 떨어지는 조각
      }
      if (k >= 0 && k < 3) floorRing(P.f, b0, 6 + k * 6, S.K, k < 2 ? c[1] : c[2], a => k < 2 || Math.floor(a * 4) % 2 === 0);
      if (k >= 0 && k < 16) radialCracks(P.f, S.B0, S.rf + 1, S.K, seed + 9, k >= 10);
      if (k >= 0 && k < 7) dustPuff(P.s, b0[0] - tan[0] * 12, b0[1] - 2 - k * 0.7, 2.2 + k * 0.5, b0[1] + 0.4, k > 3);
      if (k >= 0 && k < 7) dustPuff(P.s, b0[0] + tan[0] * 12, b0[1] - 2 - k * 0.7, 2 + k * 0.5, b0[1] + 0.4, k > 3);
      if (k >= 1 && k < 13) particles(P.p, burstParticles(seed, b0[0], b0[1] - 6, 10, 2.4, [c[1], c[2], c[3]], { g: 0.28, life: 12, up: 1.8, size: 2 }), k - 1);
      if (k >= 0 && k < 8) particles(P.p, burstParticles(seed + 2, T[0], G, 6, 1.6, ['#966c6c', '#694f62', '#4c3e24'], { g: 0.3, life: 8, up: 2.2 }), k);   // 들썩여 튄 흙
      break;
    }
    case 'bloom': {   // 불꽃 만개: 불꽃 꽃잎 다섯이 돌며 날아가 대상에서 꽃 모양으로 터짐
      const sx = L[0] + 10 * fx;
      for (let q = 0; q < 5; q++) { const t = f - 13, dur = 7; if (t < 0 || t >= dur) continue; const u = t / dur, a = q * 1.2566 + u * 3, rr = 12 * Math.sin(Math.PI * u), x = sx + (T[0] - sx) * u + Math.cos(a) * rr, y = L[1] + (T[1] - L[1]) * u + Math.sin(a) * rr; flameTongue(P.o, x, y, 7, f + q, c, 1.5); }
      if (k >= 0 && k < 10) { const R = 5 + k * 2.6; for (let q = 0; q < 5; q++) { const a = q * 1.2566 - 1.57, x = T[0] + Math.cos(a) * R, y = T[1] + Math.sin(a) * R; if (k < 8) flameTongue(P.o, x, y, Math.max(2, 9 - k), f + q, c, 1.6); } if (k < 2) { disc(P.o, T[0], T[1], 6 - k * 2, c[1]); disc(P.o, T[0], T[1], 3, c[0]); } }
      if (k >= 2 && k < 12) particles(P.p, burstParticles(seed, T[0], T[1], 12, 1.8, [c[1], c[2], c[3]], { g: -0.06, life: 10, size: 2 }), k - 2);
      break;
    }
    case 'rings': {   // 바람 고리: 파이프 끝에서 고리 셋이 커지며 날아가 터짐
      [0, 2, 4].forEach((d, q) => {
        const t = f - 13 - d, dur = 6, from = [L[0] + 12 * fx, L[1] - 22 + q * 6];
        if (t >= 0 && t < dur) { const u = t / dur, x = from[0] + (T[0] - from[0]) * u, y = from[1] + (T[1] - from[1]) * u; ringPx(P.o, x, y, 5 + u * 4, t % 2 ? c[1] : c[0], () => true, 1.5, 2); }
        if (t >= dur && t < dur + 5) for (let i = 0; i < 8; i++) { const a = i * 0.785 + q, r1 = 5 + (t - dur) * 3; line(P.p, [T[0] + Math.cos(a) * r1, T[1] + Math.sin(a) * r1 * 1.3], [T[0] + Math.cos(a) * (r1 + 4), T[1] + Math.sin(a) * (r1 + 4) * 1.3], c[1]); }
      });
      break;
    }
    case 'blades': {   // 바람 칼날: 초승달 칼날 둘이 빠르게 날아가 대상을 사선으로 벰
      [0, 2].forEach((d, q) => {
        const t = f - 14 - d, dur = 3, sx = L[0] + 14 * fx;
        if (t >= 0 && t < dur) { const u = (t + 1) / dur, x = sx + (T[0] - sx) * u, y = L[1] - 6 + q * 9 + (T[1] - L[1]) * u; crescentF(fx, P.o, x - 9 * fx, y, 12, -1.2, 1.2, 3.6, c[0], c[2]); for (let s = 1; s < 6; s++) P.p(Math.floor(x - (12 + s * 4) * fx), Math.floor(y + (q ? 2 : -2)), c[2]); }
      });
      if (k >= 0 && k < 5) { const L2 = k < 2 ? 1 : 0.6; line(P.o, [T[0] - 14 * fx, T[1] - 14], [T[0] + 14 * L2 * fx, T[1] + 14 * L2], k < 2 ? c[0] : c[2], 2); if (k >= 1) line(P.o, [T[0] + 14 * fx, T[1] - 11], [T[0] - 14 * L2 * fx, T[1] + 12 * L2], k < 3 ? c[0] : c[2], 2); }
      if (k >= 1 && k < 10) particles(P.p, burstParticles(seed, T[0], T[1], 9, 2, [c[1], c[2], c[3]], { g: 0.06, life: 9, size: 2 }), k - 1);
      break;
    }
    case 'bite': {   // 포식 물기: 위·아래 턱(이빨 지그재그)이 벌어졌다 맞는 장에 닫힘 → 진홍 빛이 공격 쪽으로(흡혈)
      const open = f < I - 2 ? 0 : k < 0 ? 9 + (k + 2) * 3 : k === 0 ? 1 : k === 1 ? 0 : -1;
      if (open >= 0 && f >= I - 3 && k <= 1) [-1, 1].forEach(s => {
        const yb = T[1] + s * (open + 3);
        crescent(P.o, T[0], yb - s * 10, 13, s < 0 ? 0.35 : -2.8, s < 0 ? 2.8 : -0.35, 3.6, c[0], c[2]);
        for (let i = -8; i <= 8; i += 4) { P.o(Math.floor(T[0] + i), Math.floor(yb + s * 1), c[0]); P.o(Math.floor(T[0] + i + 1), Math.floor(yb + s * 2), c[0]); }
      });
      if (k >= 2 && k < 14) for (let q = 0; q < 4; q++) { const t = (k - 2 - q) / 9; if (t < 0 || t > 1) continue; const x = T[0] + (L[0] - T[0]) * t, y = T[1] + (L[1] - T[1]) * t - Math.sin(Math.PI * t) * 12; disc(P.o, x, y, 1.6, q % 2 ? c[2] : c[1]); }
      if (k >= 0 && k < 8) particles(P.p, burstParticles(seed, T[0], T[1], 6, 1.6, [c[1], c[2], c[3]], { g: 0.1, life: 8 }), k);
      break;
    }
    case 'sword': {   // 무기 검 베기: 굵은 강철 사선 + 초승달 잔상 → 쇠 불꽃
      if (k === 0) { line(P.o, [T[0] - 20 * fx, T[1] - 18], [T[0] + 18 * fx, T[1] + 16], c[0], 2); crescentF(fx, P.o, T[0] - 4 * fx, T[1], 22, -2.3, 0.7, 4, c[1], c[2]); }
      if (k === 1) { line(P.o, [T[0] - 20 * fx, T[1] - 18], [T[0] + 18 * fx, T[1] + 16], c[1], 2); crescentF(fx, P.o, T[0] - 4 * fx, T[1], 23, -2.4, 0.8, 2.6, c[2], c[2], u => Math.floor(u * 5) % 2 === 0); }
      if (k >= 0 && k < 6) particles(P.p, burstParticles(seed, T[0] - 2 * fx, T[1] - 2, 10, 3, ['#ffffff', '#fff2a0', '#f0a030'], { g: 0.2, life: 6 }), k);
      break;
    }
    case 'poison': {   // 독성 독 뿌리기: 보라 독방울이 포물선으로 날아가 터지며 튐
      const t = f - 13, dur = 6, sx = L[0] + 8 * fx;
      if (t >= 0 && t < dur) { const u = t / dur, x = sx + (T[0] - sx) * u, y = L[1] + (T[1] - L[1]) * u - Math.sin(Math.PI * u) * 14; disc(P.o, x, y, 4.2, c[2]); disc(P.o, x - 0.6, y - 0.8, 2.6, c[1]); P.o(Math.floor(x) - 2, Math.floor(y) - 2, c[0]); }
      if (k >= 0 && k < 3) { disc(P.o, T[0], T[1], 6 - k, c[2]); disc(P.o, T[0], T[1], 3.5 - k, c[1]); }
      if (k >= 0 && k < 12) particles(P.p, burstParticles(seed, T[0], T[1], 12, 2, [c[1], c[2], c[3]], { g: 0.18, life: 12, up: 0.8, size: 2 }), k);
      break;
    }
    // ── 종 고유 v2 새 모양 넷(2026-10-29 밤샘 — 사용자 '각 스킬별 특수한 건 모션 만들고'): 예고(어디에 떨어질지 · 무엇이 터질지) → 맞음 → 넘침 세 박자 ──
    case 'rockfall': {   // 낙석: 대상 머리 위에서 돌가루가 먼저 부스스 떨어지고(예고) → 큰 바위 셋이 차례로 떨어져 머리에 부딪힘(흰 별빛 · 바위가 깨짐) → 부스러기 · 흙먼지
      [[0, 0, 9], [4, -13, 6.5], [8, 12, 7.5]].forEach(([d, dx, r], q) => {
        const t0 = I - 7 + d, land = I + d, x = T[0] + dx * 0.7, y1 = T[1] + (q ? 6 : 0);
        if (f >= t0 - 6 && f < t0 + 2) for (let s = 0; s < 3; s++) { const yy = y1 - 74 + ((f - t0 + 6) * 4 + s * 9) % 26; P.p(Math.floor(x - 3 + s * 3), Math.floor(yy), s % 2 ? c[2] : c[1]); }   // 돌가루(예고)
        if (f >= t0 && f < land) { const u = (f - t0) / (land - t0), y = y1 - 74 * (1 - u * u); for (let s = 1; s <= 5; s++) { P.p(Math.floor(x - 2), Math.floor(y - r - s * 3), c[1]); P.p(Math.floor(x + 2), Math.floor(y - r - s * 3 - 1), c[2]); }
          disc(P.o, x, y, r, c[2]); disc(P.o, x - r * 0.3, y - r * 0.3, r * 0.55, c[1]); disc(P.o, x - r * 0.45, y - r * 0.45, r * 0.22, c[0]); line(P.o, [x + r * 0.1, y - r * 0.1], [x + r * 0.55, y + r * 0.45], c[3]); }   // 떨어지는 바위(빛 받은 면 · 금)
        const kk = f - land;
        if (kk >= 0 && kk < 3) { disc(P.o, x, y1, r + 3 - kk * 2, kk ? c[1] : c[0]); starBurst(P.o, x, y1, r + 2, r + 13, 10, c[0], c[1], q); }
        if (kk >= 1 && kk < 6) for (let s = 0; s < 4; s++) { const an = s * 1.57 + q, d2 = r * 0.4 + kk * 2.2; rockShard(P.o, [x + Math.cos(an) * d2, y1 + Math.sin(an) * d2 + kk * kk * 0.4], [x + Math.cos(an) * (d2 + 5), y1 + Math.sin(an) * (d2 + 5) + kk * kk * 0.4], 2.4, c, 0, seed + q * 5 + s); }   // 바위가 깨진 조각
        if (kk >= 0 && kk < 12) particles(P.p, burstParticles(seed + q * 7, x, y1, 12, 2.6, [c[1], c[2], c[3]], { g: 0.26, life: 12, up: 0.8, size: 2 }), kk);
        if (kk >= 2 && kk < 11) dustPuff(P.p, x, y1 + 6, 4 + kk * 0.9, kk / 11, kk > 7);
      });
      break;
    }
    case 'shatter': {   // 얼음 깨짐: 얼음 조각 여섯이 대상 둘레로 모여 큰 수정이 됨(예고) → 맞는 장에 하얗게 번쩍 → 날카로운 파편 열둘이 사방으로 + 서리 고리
      for (let q = 0; q < 6; q++) {
        const a = q * 1.0472 - 1.57, t = f - (I - 9); if (t < 0 || t >= 10) continue;
        const u = ease(Math.min(1, t / 8)), R = 34 * (1 - u) + 7, x = T[0] + Math.cos(a) * R, y = T[1] + Math.sin(a) * R * 0.85;
        rockShard(P.o, [x - Math.cos(a) * 7, y - Math.sin(a) * 7], [x + Math.cos(a) * 5, y + Math.sin(a) * 5], 4, c, 0, seed + q);
        if (t >= 8) disc(P.o, T[0], T[1], 6 + (t - 8) * 2, c[1]);   // 모여 수정
      }
      if (k >= 0 && k < 3) { disc(P.o, T[0], T[1], 14 - k * 3, k ? c[1] : c[0]); disc(P.o, T[0], T[1], 7 - k * 2, c[0]); starBurst(P.o, T[0], T[1], 10, 24 - k * 2, 12, c[0], c[1], 0.3); }
      if (k >= 1 && k < 11) for (let q = 0; q < 12; q++) { const a = q * 0.5236 + 0.26, d = 8 + (k - 1) * 3.8, x = T[0] + Math.cos(a) * d, y = T[1] + Math.sin(a) * d * 0.9 + (k - 1) ** 2 * 0.15; if (k < 8 || q % 2) rockShard(P.o, [x, y], [x + Math.cos(a) * 6, y + Math.sin(a) * 6], 2.2, c, 0, seed + 20 + q); }
      if (k >= 2 && k < 10) ringPx(P.p, T[0], T[1], 14 + k * 2.6, k < 6 ? c[0] : c[2], a => Math.floor(a * 4 + k) % 3 !== 0, 0.85, 2);
      if (k >= 2 && k < 12) particles(P.p, burstParticles(seed + 41, T[0], T[1], 14, 2.2, [c[0], c[1], c[2]], { g: 0.05, life: 11, size: 2 }), k - 2);
      break;
    }
    case 'blast': {   // 폭발(덫이 터짐): 대상 발밑 붉은 점이 깜빡이며 빨라짐(예고) → 큰 폭발 둘(대상 · 옆) → 파편 · 연기 · 바닥 그을음
      const B = S.B0 || [T[0], T[1] + 44];
      if (f >= I - 9 && f < I) { const on = (I - f) > 5 ? f % 3 === 0 : f % 2 === 0; if (on) for (const [dx, dy] of [[-12, 0], [11, 2], [0, 5]]) { disc(P.o, B[0] + dx, B[1] + dy - 2, 2.5, '#ff3a2a'); P.o(B[0] + dx, B[1] + dy - 3, '#ffe0c0'); } }
      if (k >= 0 && k <= 8) explosion(P, T[0], T[1] + 6, k, c, seed);
      if (k >= 2 && k <= 10) explosion(P, T[0] + 16 * fx, T[1] + 16, k - 2, c, seed + 3);
      if (k >= 1 && k < 13) particles(P.p, burstParticles(seed + 9, T[0], T[1] + 8, 18, 3.2, [c[0], c[1], c[2], c[3]], { g: 0.16, life: 12, up: 1, size: 2 }), k - 1);
      if (k >= 3 && k < 20) for (let yy = -5; yy <= 5; yy++) for (let xx = -18; xx <= 18; xx++) if ((xx / 18) ** 2 + (yy / 5) ** 2 <= 1 && (xx + yy + k) % 3 === 0) P.f(Math.floor(B[0] + xx), Math.floor(B[1] + yy), '#2a1a14');   // 그을음
      break;
    }
    case 'rain': {   // 바늘비(만천화우): 대상 위 하늘에 바늘이 촘촘히 맺혀 반짝임(예고) → 사선으로 쏟아져 대상 둘레에 꽂힘(작은 튐 · 독빛) · 맞는 동안 고리
      const r1 = rng(seed + 31);
      for (let q = 0; q < 28; q++) {
        const ox = (r1() - 0.5) * 56, oy = (r1() - 0.5) * 30, start = I - 6 + Math.floor(r1() * 9), dur = 4;
        const sx = T[0] + ox - 24 * fx, sy = T[1] - 66 + oy * 0.3, ex = T[0] + ox * 0.6, ey = T[1] + oy * 0.6, t = f - start;
        if (t < -7) continue;
        if (t < 0) { if ((f + q) % 2 === 0) { P.o(Math.floor(sx), Math.floor(sy), c[1]); P.o(Math.floor(sx), Math.floor(sy) + 1, c[2]); } continue; }   // 맺힘(예고)
        if (t < dur) { const u = (t + 1) / dur, x = sx + (ex - sx) * u, y = sy + (ey - sy) * u, L0 = Math.hypot(ex - sx, ey - sy) || 1, nx = (ex - sx) / L0, ny = (ey - sy) / L0; line(P.o, [x - nx * 9, y - ny * 9], [x, y], c[1], 2); P.o(Math.floor(x), Math.floor(y), c[0]); P.o(Math.floor(x), Math.floor(y) + 1, c[0]); }
        else if (t < dur + 4) { const kk = t - dur; P.p(Math.floor(ex - 1 - kk), Math.floor(ey - kk), c[1]); P.p(Math.floor(ex + 1 + kk), Math.floor(ey - kk), c[1]); if (A.fizz && kk < 2) P.p(Math.floor(ex), Math.floor(ey - 2 - kk), A.fizz); }
      }
      if (k >= 0 && k < 10 && k % 3 === 0) ringPx(P.p, T[0], T[1], 14 + k, c[2], a => Math.floor(a * 5) % 2 === 0, 0.7, 2);
      break;
    }
    case 'breath': {   // 용족 숨결(자기 속성 — 여기선 풀): 입에서 대상까지 넓어지는 원뿔 입자 + 맞는 곳 소용돌이
      const t = f - 12, sx = L[0] + 10 * fx;
      if (t >= 0 && t < 12) for (let q = 0; q < 40; q++) { const r = rng(seed + q * 13 + t * 101), u = ((t + q * 0.3) % 6) / 6, x = sx + (T[0] - sx) * u, spread = 2 + u * 13, y = L[1] + (T[1] - L[1]) * u + (r() - 0.5) * spread * 2; if (q % 5 === 0) disc(P.o, x, y, 1.5 + u, u < 0.5 ? c[1] : c[2]); else P.p(Math.floor(x), Math.floor(y), q % 2 ? c[0] : c[2]); }
      if (k >= 0 && k < 8) ringPx(P.o, T[0], T[1], 6 + k * 2, k < 4 ? c[1] : c[2], a => Math.floor(a * 2 + k) % 2 === 0, 1, 2);
      break;
    }
    case 'sporepuff': {   // 포자 퍼프(턴 끝 자동): 대상 위에서 포자 구름이 피어남 + 약화 표시(아래 화살표)
      if (k >= 0 && k < 14) { const R = 4 + k * 1.5, r1 = rng(seed); for (let i = 0; i < 26; i++) { const a = r1() * 6.283, rr = R * Math.sqrt(r1()); const x = T[0] + Math.cos(a) * rr, y = T[1] - 6 + Math.sin(a) * rr * 0.7 - k * 0.4; if (k > 10 && i % 2) continue; if (i % 6 === 0) disc(P.o, x, y, 1.6, c[1]); else P.p(Math.floor(x), Math.floor(y), i % 3 ? c[2] : c[0]); } }
      if (k >= 4 && k < 18) { const x = T[0] + 16 * fx, y = T[1] - 18 + Math.min(4, k - 4); for (let j = 0; j < 7; j++) P.o(x, y + j, '#a8b8ff'); for (let s = 1; s <= 3; s++) { P.o(x - s, y + 6 - s, '#a8b8ff'); P.o(x + s, y + 6 - s, '#a8b8ff'); } }
      break;
    }
    case 'spores': {   // 포자 구름: 몽글몽글 퍼지며 천천히 날아가 대상을 감쌈
      const t = f - 13, dur = 8, sx = L[0] + 10 * fx;
      if (t >= 0 && t < dur + 16) { const u = Math.min(1, t / dur), cx = sx + (T[0] - sx) * ease(u), cy = L[1] - 4 + (T[1] - L[1]) * u - Math.sin(Math.PI * u) * 6, R = 5 + u * 10 + Math.max(0, t - dur) * 0.5, r1 = rng(seed); for (let i = 0; i < 30; i++) { const a = r1() * 6.283 + t * 0.15, rr = R * Math.sqrt(r1()), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.8; if (t > dur + 10 && i % 2) continue; if (i % 6 === 0) disc(P.o, x, y, 1.6, c[1]); else P.p(Math.floor(x), Math.floor(y), i % 3 === 0 ? c[0] : c[2]); } }
      break;
    }
  }
}

// 맞은 쪽 성질 — I+3부터 20장쯤. pts = 대상 윗머리 점들, T = 머리, G = 흙 높이, L = 공격 쪽 머리(흡수가 돌아갈 곳)
export function statusFx(P, A, f, T, G, pts, L, seed = 1) {
  const I = impactAt(A), k = f - I - 3;
  if (k < 0 || k > 22) return;
  const fade = k > 18, c = A.c;
  switch (A.status) {
    case 'burn': pts.slice(0, 3).forEach(([x, y], q) => { if (fade && (k + q) % 2) return; flameTongue(P.o, x, y + 2, 5 + ((k + q) % 3 === 0 ? 1 : 0), f + q * 2, c, 1); }); break;
    case 'wet': pts.slice(0, 3).forEach(([x, y], q) => { const t = (k + q * 4) % 10, yy = y + 8 + t * 2; if (yy < G) { disc(P.o, x + q * 3 - 3, yy, 1.4, c[1]); P.p(Math.floor(x + q * 3 - 3), Math.floor(yy) - 1, c[0]); } }); break;
    case 'thorn': {
      pts.slice(0, 3).forEach(([x, y], q) => { if (fade && q) return; P.o(Math.floor(x), Math.floor(y + 3), '#f4f0d0'); P.o(Math.floor(x) + 1, Math.floor(y + 4), '#c8c098'); P.o(Math.floor(x), Math.floor(y + 4), '#c8c098'); P.o(Math.floor(x) + 1, Math.floor(y + 5), '#8a8460'); });
      if (A.kind === 'slash' || A.kind === 'whip') for (let q = 0; q < 4; q++) { const t = (k - q * 2) / 10; if (t < 0 || t > 1) continue; const x = T[0] + (L[0] - T[0]) * t, y = T[1] + (L[1] - T[1]) * t - Math.sin(Math.PI * t) * 14; disc(P.o, x, y, 1.5, '#c8ff90'); if (t > 0.9) disc(P.p, L[0], L[1] - 2, 2, '#ffffff'); }   // 흡수: 빛이 공격 쪽으로
      break;
    }
    case 'shock': if (k % 3 !== 2 && !fade) { const r = rng(seed + Math.floor(k / 2) * 17), [x, y] = pts[Math.floor(r() * pts.length)] || T; for (const [px, py] of strokePx([[x - 3, y + 3], [x, y], [x - 2, y - 3], [x + 3, y - 6]])) { P.o(px, py, k % 3 ? '#fff4b0' : '#ffffff'); } } break;
    case 'dust': for (let q = 0; q < 5; q++) { const r = rng(seed + q * 7), x = T[0] - 14 + r() * 28, t = (k + q * 4) % 12, y = T[1] - 8 + t * 1.8; if (y < G) disc(P.o, x, y, 1.1, q % 2 ? '#b8a688' : '#8c7a60'); } if (k < 9) for (let q = 0; q < 3; q++) { const x = T[0] - 12 + q * 12, y = G - 2 - k * 0.4, r = 3 - k * 0.3; if (P.s) dustPuff(P.s, x, y, r, G + 22, k > 5); else disc(P.o, x, y, r, '#9a8c7c'); } break;
    case 'swirl': { const n = 14, rot = k * 0.5; for (let i = 0; i < n; i++) { if (i % 4 === 3 || (fade && i % 2)) continue; const a = rot + i / n * Math.PI * 2; disc(P.o, T[0] + Math.cos(a) * 16, T[1] - 8 + Math.sin(a) * 5, 0.9, i % 3 ? c[1] : c[0]); } break; }
    case 'spore': for (let i = 0; i < 8; i++) { if (fade && i % 2) continue; const a = k * 0.18 + i * 0.785; disc(P.o, T[0] + Math.cos(a) * 13, T[1] - 4 + Math.sin(a * 1.3) * 7, 1, i % 2 ? c[0] : c[1]); } break;
    case 'poison': {   // 독: 대상에서 보라 거품이 오르고 머리 위 독 칸 눈금이 1 → 2로 쌓임
      const tc = A.tox || c;
      for (let q = 0; q < 3; q++) { const t = (k + q * 4) % 12, x = T[0] - 8 + q * 8, y = T[1] + 6 - t * 1.4; if (!(fade && q)) { disc(P.o, x, y, 1.2, tc[1]); P.p(Math.floor(x), Math.floor(y) - 1, A.fizz || tc[0]); } }
      const n = k < 6 ? 1 : 2; for (let i = 0; i < n; i++) { disc(P.o, T[0] - 4 + i * 6, T[1] - 24, 2, tc[2]); P.o(Math.floor(T[0] - 5 + i * 6), Math.floor(T[1] - 25), tc[0]); }
      break;
    }
    case 'bleed': pts.slice(0, 3).forEach(([x, y], q) => { const t = (k + q * 5) % 11, yy = y + 6 + t * 1.8; if (yy < G && !(fade && q)) { const b = A.blood || ['#ffd0d0', '#ff5a5a', '#c02838', '#5a0c18']; disc(P.o, x + q * 4 - 4, yy, 1.2, b[2]); P.p(Math.floor(x + q * 4 - 4), Math.floor(yy) - 1, b[1]); } }); break;   // 출혈: 붉은 방울이 흘러내림
    case 'stun': if (!fade || k % 2) for (let i = 0; i < 3; i++) { const a = k * 0.45 + i * 2.094, x = T[0] + Math.cos(a) * 12, y = T[1] - 20 + Math.sin(a) * 3.5; starBurst(P.o, x, y, 0, 2.6, 4, '#fff6a0', '#ffd040', 0.4); } break;   // 기절: 머리 위 별 셋이 빙빙
    case 'bind': { const cy = (T[1] + G) / 2 + 2; if (!(fade && k % 2)) [-8, 0, 8].forEach(dy => ellipseRingPx(P.o, T[0], cy + dy, 11.5, 3.7, c[1], c[3])); break; }   // 묶기: 아랫몸 덩굴 고리가 남음
    case 'guardbreak': if (k < 10) for (let q = 0; q < 4; q++) { const t = k + q * 2, x = T[0] - 12 + q * 8 + Math.sin(t) * 2, y = T[1] - 6 + t * 2.2; if (y < G) { P.o(Math.floor(x), Math.floor(y), '#c8dcf8'); P.o(Math.floor(x) + 1, Math.floor(y) + 1, '#7890b8'); } } break;   // 방어 깨짐: 푸른 파편이 떨어짐
    case 'guardself': if (k < 12 && !(k > 8 && k % 2)) ringPx(P.o, L[0], L[1] + 4, 18 + (k % 3), c[1], a => Math.floor(a * 6 / Math.PI + k) % 3 !== 0, 1.25, 1); break;   // 방패: 내 둘레 방어 기운
  }
}
