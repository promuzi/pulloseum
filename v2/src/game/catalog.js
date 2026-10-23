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
  flower_grass: { name: '페탈로즈', type: 'flower', el: 'grass', rarity: 'common', branch: 'meadow', role: 'dis', tilt: { spd: 1.08 } },
  thorn: { name: '쏜위드', type: 'vine', el: 'grass', rarity: 'common', branch: 'shade', role: 'dot' },
  aqua: { name: '아쿠아벌브', type: 'flower', el: 'water', rarity: 'common', branch: 'shore', role: 'sup', tilt: { hp: 1.1 } },
  flower_wind: { name: '윈드페탈', type: 'flower', el: 'wind', rarity: 'common', branch: 'meadow', role: 'fast', tilt: { spd: 1.2 } },
  spark: { name: '스파크번', type: 'flower', el: 'bolt', rarity: 'rare', branch: 'meadow', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },
  vine_water: { name: '타이드바인', type: 'vine', el: 'water', rarity: 'common', branch: 'shore', role: 'dis', tilt: { spd: 1.08 } },
  cactus_fire: { name: '엠버캑터', type: 'cactus', el: 'fire', rarity: 'common', branch: 'desert', role: 'ctr' },
  gaia: { name: '가이아록', type: 'cactus', el: 'earth', rarity: 'common', branch: 'desert', role: 'tank', tilt: { hp: 1.15, def: 1.15, atk: 0.85, spd: 0.9 } },
  flower_fire: { name: '블레이즈블룸', type: 'flower', el: 'fire', rarity: 'common', branch: 'meadow', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },
  cactus_wind: { name: '게일캑터', type: 'cactus', el: 'wind', rarity: 'common', branch: 'desert', role: 'ctr', tilt: { def: 1.12, spd: 0.95 } },
  vine_wind: { name: '게일바인', type: 'vine', el: 'wind', rarity: 'common', branch: 'shade', role: 'fast', tilt: { spd: 1.2 } },
  spore_cap: { name: '스포어캡', type: 'mushroom', el: 'grass', rarity: 'rare', branch: 'shade', role: 'dis', tilt: { spd: 1.08 } },
  frost_bell: { name: '프로스트벨', type: 'flower', el: 'ice', rarity: 'rare', branch: 'meadow', role: 'dis', tilt: { spd: 1.08 } },
  volt_vine: { name: '볼트바인', type: 'vine', el: 'bolt', rarity: 'common', branch: 'shade', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },
  stone_cap: { name: '스톤캡', type: 'mushroom', el: 'earth', rarity: 'common', branch: 'desert', role: 'tank', tilt: { hp: 1.15, def: 1.15, atk: 0.85, spd: 0.9 } },
  jelly_cap: { name: '젤리캡', type: 'mushroom', el: 'water', rarity: 'rare', branch: 'shore', role: 'sup', tilt: { hp: 1.1 } },
  // 2026-10-16 새 다섯 = 변이 고정(사용자 승인 "변이 특화 식물" + "다른 식물들도 계속 늘리자") — 빈 칸(종×속성)을 채움, 드묾
  fang_trap: { name: '팽트랩', type: 'flower', el: 'earth', rarity: 'rare', branch: 'meadow', form: 'predator', role: 'drain', tilt: { hp: 1.06, def: 0.96 } },
  blade_vine: { name: '블레이드바인', type: 'vine', el: 'fire', rarity: 'rare', branch: 'shade', form: 'weapon', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },
  toxi_cactus: { name: '톡시캑터', type: 'cactus', el: 'grass', rarity: 'rare', branch: 'desert', form: 'toxic', role: 'ctr', tilt: { def: 1.12, spd: 0.95 } },
  draco_fruit: { name: '드라코프루트', type: 'cactus', el: 'ice', rarity: 'rare', branch: 'desert', role: 'tank', tilt: { hp: 1.15, def: 1.15, atk: 0.85, spd: 0.9 } },   // 탱커(사용자 "드라코프루트는 탱커로")   // 2026-10-17 사용자 "나로 하자" — 용 변이 고정 뺌(서리 용과 선인장 = 보통 식물), 용은 프로스트드레이크
  ember_cap: { name: '엠버캡', type: 'mushroom', el: 'fire', rarity: 'rare', branch: 'shade', form: 'spore', role: 'dis', tilt: { spd: 1.08 } },
  drake_cactus: { name: '드레이크캑터', type: 'cactus', el: 'fire', rarity: 'rare', branch: 'desert', form: 'dragon', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },
  frost_drake: { name: '프로스트드레이크', type: 'cactus', el: 'ice', rarity: 'rare', branch: 'desert', form: 'dragon', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },   // 2026-10-17 사용자 "얘도 귀엽네" → "나로 하자": 드라코프루트를 용답게 다시 그린 안(비늘 몸 · 날개 · 뿔)을 새 종으로 — 태생 용족
  // 2026-10-17 새 셋(사용자 "식물이라는 컨셉 때문에 디자인이 비슷해져 — 갓을 쓴 형태 등 상징적인 걸 강조") = 빈 칸(버섯 × 바람 · 덩굴 × 대지 · 선인장 × 번개), 일반 식물(카드 = 일반 카드)
  gat_cap: { name: '갓캡', type: 'mushroom', el: 'wind', rarity: 'common', branch: 'meadow', role: 'dis', tilt: { spd: 1.1, atk: 1.1 } },      // 버섯 갓 = 선비의 갓 · 갓끈 · 잎 부채
  mask_vine: { name: '탈바인', type: 'vine', el: 'earth', rarity: 'common', branch: 'desert', role: 'dis', tilt: { spd: 1.08 } },     // 하회탈 얼굴 · 탈춤 소매 덩굴
  drum_cactus: { name: '드럼캑터', type: 'cactus', el: 'bolt', rarity: 'rare', branch: 'desert', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },  // 천둥북 고리 · 북채 팔
  // 2026-10-17 둘째 넷 = 남은 빈 칸(덩굴 × 빙결 · 선인장 × 물 · 버섯 × 번개 · 버섯 × 빙결) — 종 × 속성 스물여덟 칸이 다 참
  lantern_vine: { name: '초롱바인', type: 'vine', el: 'ice', rarity: 'rare', branch: 'shade', role: 'sup', tilt: { hp: 1.1 } },       // 청사초롱을 든 서리 덩굴
  jar_cactus: { name: '동이캑터', type: 'cactus', el: 'water', rarity: 'common', branch: 'shore', role: 'ltank', tilt: { hp: 1.1, def: 1.1, atk: 0.92, spd: 0.95 } },    // 물동이를 인 선인장 · 똬리
  goblin_cap: { name: '도깨비캡', type: 'mushroom', el: 'bolt', rarity: 'common', branch: 'shade', role: 'dis', tilt: { spd: 1.08 } },  // 뿔 하나 · 번개 감긴 도깨비 방망이
  crown_cap: { name: '크라운캡', type: 'mushroom', el: 'ice', rarity: 'rare', branch: 'meadow', role: 'ltank', tilt: { hp: 1.1, def: 1.1, atk: 0.92, spd: 0.95 } },     // 얼음 왕관 갓 · 서리 이끼 망토   // 2026-10-17 태생 용족(불 선인장 용 — 갈빗대 몸에 용 비늘 · 뿔 · 날개)
  // 2026-10-17 셋째 아홉(사용자 "더 다양한 식물을 늘려줘") = 같은 칸(종 × 속성)의 둘째 종 일곱 + 태생 변이 둘(무기 · 용족) — 상징 하나를 크게 · 기울기는 종 리그전(specbalance.mjs)으로 한 번 맞춤(아스트로 24% · 현무 32% · 닌자 37% · 구미호 65% → 가운데 쪽으로)
  gladi_cactus: { name: '글라디캑터', type: 'cactus', el: 'earth', rarity: 'rare', branch: 'desert', form: 'weapon', role: 'ctr', tilt: { def: 1.12, spd: 0.95 } },   // 검투사 투구 · 선인장 방패 · 가시 칼(태생 무기)
  jangseung_cactus: { name: '장승캑터', type: 'cactus', el: 'grass', rarity: 'common', branch: 'desert', role: 'tank', tilt: { hp: 1.15, def: 1.15, atk: 0.85, spd: 0.9 } },   // 마을 장승 얼굴 · 검은 갓
  astro_cap: { name: '아스트로캡', type: 'mushroom', el: 'wind', rarity: 'rare', branch: 'meadow', role: 'fast', tilt: { spd: 1.12, atk: 1.12, hp: 1.05 } },   // 유리 우주 헬멧 · 공기통 분사
  viking_cap: { name: '바이킹캡', type: 'mushroom', el: 'ice', rarity: 'common', branch: 'shade', role: 'atk', tilt: { atk: 1.12, hp: 0.93, def: 0.93 } },   // 얼음 뿔 투구 · 땋은 서리 수염
  hyunmu_cap: { name: '현무캡', type: 'mushroom', el: 'water', rarity: 'rare', branch: 'shore', form: 'dragon', role: 'ltank', tilt: { hp: 1.1, def: 1.1, atk: 0.95, spd: 0.95 } },   // 거북 등껍질 갓 · 감긴 물뱀(태생 용족)
  gumiho_bloom: { name: '구미호블룸', type: 'flower', el: 'fire', rarity: 'rare', branch: 'meadow', role: 'dot', tilt: { atk: 0.95 } },   // 여우 귀 꽃잎 · 아홉 꼬리 꽃잎 · 여우불
  wizard_bell: { name: '위저드벨', type: 'flower', el: 'bolt', rarity: 'rare', branch: 'meadow', role: 'dis', tilt: { spd: 1.08 } },   // 마법사 꽃잎 모자 · 별 지팡이
  ninja_vine: { name: '닌자바인', type: 'vine', el: 'wind', rarity: 'rare', branch: 'shade', role: 'fast', tilt: { spd: 1.12, atk: 1.12 } },   // 복면 · 붉은 잎 목도리 · 잎 수리검
  diver_vine: { name: '해녀바인', type: 'vine', el: 'water', rarity: 'common', branch: 'shore', role: 'sup', tilt: { hp: 1.1 } },   // 물안경 · 주황 테왁 · 망사리
  pirate_cactus: { name: '파이렛캑터', type: 'cactus', el: 'water', rarity: 'common', branch: 'shore', role: 'atk', tilt: { atk: 1.12, def: 0.95 } },   // 해적 선장 · 닻 무늬 삼각모 · 가시 칼 · 파도 띠 (2026-10-18 밤 — 고유 기술은 사용자가 다시)
  ranger_vine: { name: '레인저바인', type: 'vine', el: 'grass', rarity: 'common', branch: 'shade', role: 'fast', tilt: { spd: 1.12, atk: 1.05, hp: 0.93 } },   // 숲 궁수 · 잎 두건 · 덩굴 장궁 · 갈대 화살통 (2026-10-18 밤 — 고유 기술은 사용자가 다시)
  miner_cap: { name: '마이너캡', type: 'mushroom', el: 'earth', rarity: 'common', branch: 'shade', role: 'tank', tilt: { hp: 1.15, def: 1.12, atk: 0.9, spd: 0.88 } },   // 광부 헬멧 · 놋쇠 헤드램프 · 돌 곡괭이 뿌리 · 호박 광석 (2026-10-18 밤 — 고유 기술은 사용자가 다시)
  snow_ballet: { name: '스노우발레', type: 'flower', el: 'ice', rarity: 'rare', branch: 'meadow', role: 'dis', tilt: { spd: 1.08, def: 0.95 } },   // 얼음꽃 발레리나 · 눈꽃 무늬 튀튀 · 발끝 뿌리 · 얼음 꽃잎 관 (2026-10-18 밤 — 고유 기술은 사용자가 다시)
  volcano_cap: { name: '볼케이노캡', type: 'mushroom', el: 'fire', rarity: 'rare', branch: 'desert', role: 'dot', tilt: { atk: 1.08, hp: 1.05, spd: 0.92 } },   // 화산 갓 · 빛나는 분화구 · 식은 용암 줄기 (2026-10-18 밤 — 고유 기술은 사용자가 다시)
  dandel_aero: { name: '단델에어로', type: 'flower', el: 'wind', rarity: 'common', branch: 'meadow', role: 'sup', tilt: { spd: 1.1, hp: 1.05, atk: 0.92 } },   // 민들레 비행사 · 솜털 낙하산 머리 · 놋쇠 고글 · 꽃 리본 목도리 (2026-10-18 밤 — 고유 기술은 사용자가 다시)
};
for (const k of Object.keys(SPECIES)) SPECIES[k].base = base(SPECIES[k].type, SPECIES[k].el);
for (const k of Object.keys(SPECIES)) for (const [st, m] of Object.entries(SPECIES[k].tilt || {})) SPECIES[k].base[st] = Math.round(SPECIES[k].base[st] * m);   // 역할 기울기(탱커 = 체력 · 방어 ↑ 등 — 2026-10-17)
for (const k of Object.keys(SPECIES)) if (SPECIES[k].form) { const b = SPECIES[k].base; b.hp = Math.round(b.hp * 0.94); b.atk = Math.round(b.atk * 0.94); b.def = Math.round(b.def * 0.94); }   // 변이 고정 종 = 능력치 조금 낮음(대신 변이 칸 둘이 처음부터)
// 역할(2026-10-17 — 모습 · 컨셉에서): 기술 구성과 능력치 기울기(tilt)를 정함
export const ROLES = {'tank': '탱커', 'ltank': '가벼운 탱커', 'atk': '공격형', 'fast': '속공형', 'sup': '지원형', 'dis': '방해형', 'ctr': '반격형', 'dot': '지속 피해형', 'drain': '흡수형'};
export const BRANCH = { meadow: '꽃밭 가지', shore: '물가 가지', desert: '사막 가지', shade: '숲그늘 가지' };
export const STARTERS = ['flower_grass', 'cactus_fire', 'aqua'];

// ── 생장 ──
export const STAGES = ['새싹', '성장기', '성체'];   // 공통 단계 이름(2026-10-18 사용자 결정 — 버섯 첫 단계 '균사'는 view.js stageName)
export const STAGE_KEY = ['sprout', 'growing', 'mature'];   // 그림 단계(sprites bigKey: sprout→_young, growing→_teen, mature→기본)
export const STAGE_MUL = [0.8, 0.9, 1];                     // 체력·공격·방어 배율
export const LV_MAX = 6;
// 다음 레벨까지 생장치(물 +10 · 비료 +25). 단계마다 배수(2026-10-22 사용자 "개체값 레벨업 열매획득 등 너무 쉬움 며칠하면 다 만렙 쪽을 수 있으니 이를 실제 게임처럼 어려움을 주자"):
//  새싹 ×1.5 · 성장기 ×3 · 성체 ×4 — 처음은 금방, 뒤로 갈수록 오래(한 식물 끝까지 생장치 1200 → 약 3800)
//  → 2026-10-23 두 배(사용자 "여전히 식물을 많이 키우면 애들 레벨업이 쉬움 레벨업을 어렵게") — 한 식물 끝까지 약 7600 · 스마트팜 물 · 비료 하루 상한(FARM_DAY)과 함께
export const GROW_K = [3, 6, 8];
export const growNeed = (stage, lv) => Math.round((20 + 10 * lv + 30 * stage) * (GROW_K[stage] || 1));
export const FEED = { water: 10, fert: 25 };
export const PTS_PER_LV = 2;                                 // 레벨업마다 강화 포인트
export const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'acc', 'crit'];
export const IV_KEYS = ['hp', 'atk', 'def', 'spd', 'fruit'];   // 개체값(0~10) — 넷 = 능력치 1당 +1%, 열매 = 맺는 속도 1당 +3% · 5마다 최대 +1(2026-10-18 관상용 · 열매용 대신) — 원형 게이지
export const IV_MAX = 10;
export const UP_GAIN = { hp: 5, atk: 1, def: 1, spd: 1, acc: 1, crit: 1 };   // 강화 포인트 1당
export const STAT_NAME = { hp: '체력', atk: '공격', def: '방어', spd: '기동', acc: '적중', crit: '치명', fruit: '열매' };
export const upCost = spent => 8 + 4 * Math.floor(spent / 4);  // 포인트 쓸 때 돈(너무 비싸지 않게)
// 햇빛 강화(2026-10-18 사용자 "햇빛의 경우 스탯 강화해서 할 수 있게 — 최대 용량과 회복량, 몇 칸씩?"): 칸 단위라 한 단에 포인트 여럿 · p.up 에는 쓴 포인트(다른 능력치와 같게 — 초기화도 같이)
//  햇빛 그릇 = 최대 8칸 → 단마다 +1칸(최대 4단 = 12칸, 3포인트씩) · 햇빛 회복 = 턴마다 1칸 → 단마다 반칸 더(사용자 "반칸씩" — 1.5 · 2 · 2.5칸, 4포인트씩)
//  햇빛은 반칸(0.5) 단위 — 기술 비용은 정수 그대로(가진 햇빛 ≥ 비용이면 씀)
export const SUN_UP = { sunMax: { name: '햇빛 그릇', pts: 3, max: 4 }, sunRegen: { name: '햇빛 회복', pts: 4, max: 3 } };
export const SUN_REGEN = [1, 1.5, 2, 2.5];   // 햇빛 회복 단 → 턴마다 차는 칸
export const sunSteps = (p, k) => Math.min(SUN_UP[k].max, Math.floor(((p.up || {})[k] || 0) / SUN_UP[k].pts));
export const resetCost = p => 150 + 100 * p.stage;           // 포인트 리셋(돈, 아이템 없음)
export const starsOf = ivs => { const t = IV_KEYS.reduce((a, k) => a + (ivs[k] || 0), 0); return t >= 41 ? 5 : t >= 31 ? 4 : t >= 21 ? 3 : t >= 11 ? 2 : 1; };   // 다섯 칸 합(최대 50) — 넷일 때 33 · 25 · 17 · 9 를 늘림

// ── 기술 ──
// tier: u = 개성(꽃 기술, 식물 전용) · c1/c2/c3 = 공통(뿌리 기술) 하급·중급·상급 · g = 가지 기술 · s = 변이·특수
// self = 나에게 거는 버프(공격 기술의 덤이거나 버프 기술 자체) · drain = 준 피해의 몇 %를 회복 · area · ranged
const S = (id, name, el, tier, power, cost, o = {}) => ({ id, name, el, tier, power, cost, act: power > 0 ? 'attack' : 'buff', cats: [power > 0 ? 'attack' : 'buff'], ...o });
export const SKILLS = Object.fromEntries([
  // 불
  S('f_ember', '불씨 튕기기', 'fire', 'c1', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('f_rage', '불타오르기', 'fire', 'c1', 0, 1, { self: 'atkUp' }),
  S('f_ball', '화염구', 'fire', 'c2', 95, 2, { ranged: true, inflict: { id: 'burn' } }),
  S('f_pillar', '불기둥', 'fire', 'c3', 125, 4, { area: true, inflict: { id: 'burn' } }),
  S('f_storm', '화염 폭풍', 'fire', 'c3', 110, 3, { ranged: true, inflict: { id: 'burn' }, self: 'atkUp' }),
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
  S('g_photo', '세포합성', 'grass', 'c1', 0, 1, { self: 'regen' }),   // 옛 이름 광합성 → 기본기 sun 이 '광합성'(2026-10-18)
  S('g_whip', '독초 채찍', 'grass', 'c2', 90, 2, { inflict: { id: 'poison', n: 2 } }),
  S('g_venom', '맹독 덩굴', 'grass', 'c3', 115, 4, { inflict: { id: 'poison', n: 3 } }),
  S('g_root', '흡수 뿌리', 'grass', 'c3', 105, 3, { drain: 0.5 }),
  S('g_bomb', '씨앗 폭탄', 'grass', 'c3', 130, 4, { area: true, inflict: { id: 'poison', n: 1 } }),
  // 대지
  S('e_rock', '돌 던지기', 'earth', 'c1', 60, 1, { ranged: true }),
  S('e_hard', '단단해지기', 'earth', 'c1', 0, 1, { self: 'defUp' }),
  S('e_roll', '바위 굴리기', 'earth', 'c2', 100, 2),
  S('e_quake', '지진', 'earth', 'c3', 115, 4, { area: true, inflict: { id: 'stun' } }),
  S('e_slide', '산사태', 'earth', 'c3', 140, 4),
  S('e_wall', '흙벽', 'earth', 'c3', 0, 3, { self: 'shield', also: 'defUp' }),
  // 바람
  S('a_breeze', '산들바람', 'wind', 'c1', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('a_tail', '순풍', 'wind', 'c1', 0, 1, { self: 'spdUp' }),
  S('a_twist', '회오리', 'wind', 'c2', 90, 2, { ranged: true, inflict: { id: 'gale' } }),
  S('a_typhoon', '태풍', 'wind', 'c3', 125, 4, { area: true, inflict: { id: 'gale' } }),
  S('a_vacuum', '진공 칼날', 'wind', 'c3', 115, 3, { ranged: true, self: 'aim' }),
  S('a_jet', '제트 기류', 'wind', 'c3', 100, 3, { ranged: true, self: 'spdUp' }),
  // 번개
  S('b_static', '정전기', 'bolt', 'c1', 55, 1, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('b_charge', '정전기 충전', 'bolt', 'c1', 0, 1, { self: 'aim' }),
  S('b_bolt', '번개 줄기', 'bolt', 'c2', 95, 2, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('b_thunder', '천둥', 'bolt', 'c3', 120, 4, { area: true, inflict: { id: 'shock', n: 2 } }),
  S('b_surge', '전류 폭주', 'bolt', 'c3', 150, 5, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('b_chain', '연쇄 번개', 'bolt', 'c3', 105, 3, { ranged: true, inflict: { id: 'shock', n: 1 }, self: 'spdUp' }),
  // 빙결(빙결 식물 = 프로스트벨부터, 2026-10-16)
  S('i_frost', '서리', 'ice', 'c1', 55, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('i_shell', '얼음 껍질', 'ice', 'c1', 0, 1, { self: 'shield' }),
  S('i_spear', '얼음 창', 'ice', 'c2', 95, 2, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('i_blizzard', '눈보라', 'ice', 'c3', 120, 4, { area: true, inflict: { id: 'chill', n: 2 } }),
  S('i_zero', '절대 영도', 'ice', 'c3', 150, 5, { inflict: { id: 'chill', n: 2 } }),
  // 종 공통(뿌리)
  S('j_scent', '꽃향기', null, 'c1', 60, 1, { jong: 'flower', ranged: true, inflict: { id: 'atkDown' } }),
  S('j_petals', '꽃잎 춤', null, 'c2', 90, 2, { jong: 'flower', ranged: true, self: 'spdUp' }),
  S('j_wrap', '휘감기', null, 'c1', 60, 1, { jong: 'vine', inflict: { id: 'seal' } }),
  S('j_lash', '덩굴 채찍', null, 'c2', 90, 2, { jong: 'vine', inflict: { id: 'seal' } }),
  S('j_spines', '가시 세우기', null, 'c1', 0, 1, { jong: 'cactus', reflect: true }),
  S('j_needle', '도발 가시', null, 'c2', 85, 2, { jong: 'cactus', inflict: { id: 'taunt' } }),
  S('j_spore', '포자 뿌리기', null, 'c1', 50, 1, { jong: 'mushroom', ranged: true, inflict: { id: 'spore', delay: 2 } }),
  S('j_cloud', '버섯 구름', null, 'c2', 80, 3, { jong: 'mushroom', ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }),
  // 가지(중간 층 — 가까운 식물 무리, 먼 행성 특이 식물은 예외로도)
  S('br_sand', '모래 폭풍', 'earth', 'g', 95, 3, { branch: 'desert', area: true, inflict: { id: 'gale' } }),
  S('br_moss', '물이끼', 'water', 'g', 0, 2, { branch: 'shore', self: 'regen', also: 'shield' }),
  S('br_bloom', '꽃비', 'grass', 'g', 85, 3, { branch: 'meadow', area: true, inflict: { id: 'atkDown' } }),
  S('br_trap', '이끼 덫', 'grass', 'g', 75, 2, { branch: 'shade', inflict: { id: 'seal' } }),
  // 변이·특수(속성·종·생장 무관 — 특수 접목 가지로만)
  S('sp_leech', '기생 씨앗', null, 's', 40, 2, { inflict: { id: 'leech' } }),
  S('sp_root', '뿌리 얽기', null, 's', 60, 2, { inflict: { id: 'root' } }),
  S('sp_shade', '그늘 드리우기', null, 's', 50, 2, { ranged: true, inflict: { id: 'dark', turns: 1, look: 'shade' } }),
  S('sp_acid', '부식액', null, 's', 60, 2, { ranged: true, inflict: { id: 'defDown' } }),
  // 개성(꽃 기술) — 식물마다 어린 1 · 자라는 1 · 다 자란 1
  S('u_petal_1', '꽃잎 향기', 'grass', 'u', 65, 1, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_petal_2', '장미 가시', 'grass', 'u', 85, 2, { inflict: { id: 'poison', n: 1 } }),
  S('u_petal_3', '꽃잎 칼날', 'grass', 'u', 115, 3),
  S('u_thorn_1', '가시 채찍', 'grass', 'u', 60, 1, { inflict: { id: 'poison', n: 1 } }),
  S('u_thorn_2', '가시 그물', 'grass', 'u', 80, 2, { inflict: { id: 'seal' } }),
  S('u_thorn_3', '독가시 덤불', 'grass', 'u', 110, 3, { inflict: { id: 'poison', n: 2 } }),
  S('u_aqua_1', '물방울', 'water', 'u', 66, 1, { ranged: true, inflict: { id: 'wet' } }),   // 2026-10-16 봇 상대 승률 41%(처음 셋 중 가장 낮음) → 위력 60 → 66
  S('u_aqua_2', '물거품 방패', 'water', 'u', 0, 2, { self: 'shield', also: 'purify' }),
  S('u_aqua_3', '물방울 세례', 'water', 'u', 112, 3, { ranged: true, inflict: { id: 'wet' } }),
  S('u_wind_1', '꽃잎 바람', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_wind_2', '꽃잎 회오리', 'wind', 'u', 85, 2, { ranged: true, self: 'spdUp' }),
  S('u_wind_3', '꽃잎 돌풍', 'wind', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'atkDown' } }),
  S('u_spark_1', '전기 불꽃', 'bolt', 'u', 60, 1, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_spark_2', '전기 꽃가루', 'bolt', 'u', 75, 2, { ranged: true, area: true, inflict: { id: 'shock', n: 1 } }),
  S('u_spark_3', '낙뢰', 'bolt', 'u', 120, 4, { ranged: true, inflict: { id: 'shock', n: 2 } }),
  S('u_tide_1', '물살 새순', 'water', 'u', 65, 1, { inflict: { id: 'seal' } }),
  S('u_tide_2', '조류 휘감기', 'water', 'u', 85, 2, { inflict: { id: 'wet' } }),
  S('u_tide_3', '파도 덮치기', 'water', 'u', 105, 3, { area: true, inflict: { id: 'wet' } }),
  S('u_ember_1', '불씨', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_ember_2', '불가시 난사', 'fire', 'u', 75, 2, { ranged: true, inflict: { id: 'burn' }, reflect: true }),
  S('u_ember_3', '불덩이', 'fire', 'u', 120, 4, { ranged: true, inflict: { id: 'burn' } }),
  S('u_gaia_1', '돌 주먹', 'earth', 'u', 75, 1, { inflict: { id: 'taunt' } }),
  S('u_gaia_2', '바위 갑옷', 'earth', 'u', 0, 2, { self: 'armor', reflect: true }),
  S('u_gaia_3', '대지 내려치기', 'earth', 'u', 120, 4, { area: true, inflict: { id: 'stun' } }),
  S('u_blaze_1', '불꽃 꽃잎', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_blaze_2', '열꽃', 'fire', 'u', 0, 2, { self: 'atkUp', also: 'spdUp' }),
  S('u_blaze_3', '불꽃 만개', 'fire', 'u', 105, 3, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_gale_1', '바람 고리', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_gale_2', '가시 회오리', 'wind', 'u', 85, 2, { inflict: { id: 'taunt' } }),
  S('u_gale_3', '돌개바람', 'wind', 'u', 110, 3, { ranged: true, inflict: { id: 'taunt' } }),
  S('u_gvine_1', '휘감는 바람', 'wind', 'u', 65, 1, { ranged: true, inflict: { id: 'seal' } }),
  S('u_gvine_2', '바람 채찍', 'wind', 'u', 85, 2, { ranged: true, inflict: { id: 'gale' } }),
  S('u_gvine_3', '칼바람', 'wind', 'u', 105, 3, { ranged: true, inflict: { id: 'gale' } }),
  S('u_spore_1', '포자', 'grass', 'u', 50, 1, { ranged: true, inflict: { id: 'spore', delay: 2 } }),
  S('u_spore_2', '포자 폭발', 'grass', 'u', 80, 2, { area: true, inflict: { id: 'spore', delay: 2 } }),
  S('u_spore_3', '포자 구름', 'grass', 'u', 90, 3, { ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }),
  // 새 넷(2026-10-16) — 효과 짝: 속성(빙결 = 빙결 · 번개 = 감전 · 대지 = 기절 · 물 = 젖음) 또는 종(꽃 = 약화 · 덩굴 = 덩굴 · 버섯 = 포자), 센 효과(겹 2 · 기절)는 비용 4
  S('u_frost_1', '서리 종소리', 'ice', 'u', 60, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('u_frost_2', '서리꽃 날림', 'ice', 'u', 80, 2, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_frost_3', '빙결의 종', 'ice', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'chill', n: 2 } }),
  S('u_volt_1', '전깃줄 감기', 'bolt', 'u', 60, 1, { inflict: { id: 'seal' } }),
  S('u_volt_2', '방전', 'bolt', 'u', 85, 2, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_volt_3', '고압 채찍', 'bolt', 'u', 120, 4, { inflict: { id: 'shock', n: 2 } }),
  S('u_stone_1', '돌가루 포자', 'earth', 'u', 55, 1, { ranged: true, inflict: { id: 'spore', delay: 2 } }),
  S('u_stone_2', '바위 갓', 'earth', 'u', 0, 2, { self: 'defUp', also: 'shield' }),
  S('u_stone_3', '갓 내려찍기', 'earth', 'u', 120, 4, { area: true, inflict: { id: 'stun' } }),
  S('u_jelly_1', '젤리 방울', 'water', 'u', 60, 1, { ranged: true, inflict: { id: 'wet' } }),
  S('u_jelly_2', '흐물 촉수', 'water', 'u', 80, 2, { inflict: { id: 'spore', delay: 2 } }),
  S('u_jelly_3', '해파리 비', 'water', 'u', 105, 3, { ranged: true, area: true, inflict: { id: 'wet' } }),
  S('u_fang_1', '덫 물기', 'earth', 'u', 65, 1, { inflict: { id: 'atkDown' } }),
  S('u_fang_2', '이끼 덫', 'earth', 'u', 0, 2, { self: 'defUp', also: 'regen' }),
  S('u_fang_3', '대지 집어삼키기', 'earth', 'u', 105, 4, { inflict: { id: 'stun' } }),
  S('u_blade_1', '불꽃 베기', 'fire', 'u', 60, 1, { inflict: { id: 'burn' } }),
  S('u_blade_2', '칼날 덩굴', 'fire', 'u', 70, 2, { inflict: { id: 'seal' } }),
  S('u_blade_3', '용광로 일섬', 'fire', 'u', 105, 3, { inflict: { id: 'burn' } }),
  S('u_toxi_1', '독가시 쏘기', 'grass', 'u', 55, 1, { ranged: true, inflict: { id: 'poison', n: 1 } }),
  S('u_toxi_2', '가시 도발', 'grass', 'u', 70, 2, { inflict: { id: 'taunt' }, reflect: true }),
  S('u_toxi_3', '맹독 터뜨리기', 'grass', 'u', 105, 3, { area: true, inflict: { id: 'poison', n: 2 } }),
  S('u_draco_1', '서리 가시', 'ice', 'u', 66, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('u_draco_2', '가시 껍질', 'ice', 'u', 0, 2, { self: 'shield', reflect: true }),
  S('u_draco_3', '서리 열매 터뜨리기', 'ice', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'chill', n: 2 } }),
  S('u_fdrake_1', '서리 비늘', 'ice', 'u', 66, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),   // 프로스트드레이크(옛 드라코프루트 용 기술 그대로)
  S('u_fdrake_2', '비늘 세우기', 'ice', 'u', 0, 2, { self: 'shield', reflect: true }),
  S('u_fdrake_3', '빙룡의 숨', 'ice', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'chill', n: 2 } }),
  // 단계마다 더 피는 개성(UNI_EXTRA) — 드라코프루트 = 탱커(도발 · 막기 · 버티기), 프로스트드레이크 = 공격형(발톱 · 분노 · 한 방)
  S('u_draco_2b', '용 따라하기', 'ice', 'u', 50, 1, { ranged: true, inflict: { id: 'taunt' } }),   // 용처럼 숨을 뿜는 흉내 — 서리 콧김만 나옴(사용자 "용따라하기" · ㉠)
  S('u_draco_3b', '얼음 요새', 'ice', 'u', 0, 3, { self: 'defUp', also: 'shield' }),
  S('u_draco_3c', '단물 열매', 'ice', 'u', 0, 2, { self: 'regen', also: 'purify' }),
  S('u_fdrake_2b', '빙룡 꼬리치기', 'ice', 'u', 85, 2, { contact: true, inflict: { id: 'chill', n: 1 } }),
  S('u_fdrake_3b', '빙룡의 분노', 'ice', 'u', 0, 2, { self: 'atkUp', also: 'aim' }),
  S('u_fdrake_3c', '빙하 낙하', 'ice', 'u', 140, 5, { inflict: { id: 'chill', n: 2 } }),
  // 나머지 28종 — 자라는 +1 · 다 자란 +2(역할에 맞춰: 2026-10-17 사용자 "이런 식으로 각 외모와 컨셉을 다른 식물에도")
  S('u_petal_2b', '홀리는 향기', 'grass', 'u', 45, 2, { ranged: true, area: true, inflict: { id: 'atkDown' } }),
  S('u_petal_3b', '장미 덤불', 'grass', 'u', 0, 2, { self: 'regen', reflect: true }),
  S('u_petal_3c', '붉은 장미 폭풍', 'grass', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'poison', n: 2 } }),
  S('u_thorn_2b', '가시 덫', 'grass', 'u', 60, 2, { inflict: { id: 'root' } }),
  S('u_thorn_3b', '수액 빨기', 'grass', 'u', 75, 2, { drain: 0.4, inflict: { id: 'poison', n: 1 } }),
  S('u_thorn_3c', '가시 감옥', 'grass', 'u', 95, 4, { area: true, inflict: { id: 'seal' } }),
  S('u_aqua_2b', '맑은 샘', 'water', 'u', 0, 2, { self: 'regen', also: 'purify' }),
  S('u_aqua_3b', '수련 꽃비', 'water', 'u', 90, 3, { ranged: true, area: true, inflict: { id: 'wet' } }),
  S('u_aqua_3c', '물의 장막', 'water', 'u', 0, 3, { self: 'shield', also: 'defUp' }),
  S('u_wind_2b', '질풍 꽃잎', 'wind', 'u', 65, 1, { ranged: true, self: 'spdUp' }),
  S('u_wind_3b', '회오리 춤', 'wind', 'u', 0, 2, { self: 'spdUp', also: 'aim' }),
  S('u_wind_3c', '하늘 꽃잎 폭풍', 'wind', 'u', 125, 4, { ranged: true, inflict: { id: 'gale' } }),
  S('u_spark_2b', '정전기 모으기', 'bolt', 'u', 0, 1, { self: 'aim', also: 'spdUp' }),
  S('u_spark_3b', '번쩍 별', 'bolt', 'u', 90, 2, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_spark_3c', '천둥 별꽃', 'bolt', 'u', 130, 5, { ranged: true, area: true, inflict: { id: 'shock', n: 1 } }),
  S('u_tide_2b', '물살 끌어당기기', 'water', 'u', 70, 2, { inflict: { id: 'root' } }),
  S('u_tide_3b', '소용돌이 덩굴', 'water', 'u', 85, 3, { drain: 0.4, inflict: { id: 'wet' } }),
  S('u_tide_3c', '밀물', 'water', 'u', 0, 2, { self: 'regen', also: 'purify' }),
  S('u_ember_2b', '달군 가시 갑옷', 'fire', 'u', 0, 3, { self: 'atkUp', reflect: true }),
  S('u_ember_3b', '불씨 도발', 'fire', 'u', 70, 2, { inflict: { id: 'taunt' } }),
  S('u_ember_3c', '사막의 태양', 'fire', 'u', 125, 4, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_gaia_2b', '돌 방패', 'earth', 'u', 0, 1, { self: 'shield' }),
  S('u_gaia_3b', '대지의 맥박', 'earth', 'u', 0, 3, { self: 'regen', also: 'defUp' }),
  S('u_gaia_3c', '거신의 주먹', 'earth', 'u', 130, 5, { contact: true, inflict: { id: 'stun' } }),
  S('u_blaze_2b', '불꽃 찌르기', 'fire', 'u', 90, 2, { inflict: { id: 'burn' } }),
  S('u_blaze_3b', '타오르는 심장', 'fire', 'u', 0, 2, { self: 'atkUp', also: 'aim' }),
  S('u_blaze_3c', '홍염', 'fire', 'u', 145, 5, { ranged: true, inflict: { id: 'burn' } }),
  S('u_gale_2b', '가시 팽이', 'wind', 'u', 0, 2, { self: 'spdUp', reflect: true }),
  S('u_gale_3b', '모래 폭풍', 'wind', 'u', 90, 3, { ranged: true, area: true, inflict: { id: 'gale' } }),
  S('u_gale_3c', '가시 선풍', 'wind', 'u', 125, 4, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_gvine_2b', '리본 채찍', 'wind', 'u', 70, 1, { ranged: true, self: 'spdUp' }),
  S('u_gvine_3b', '바람 그네', 'wind', 'u', 0, 2, { self: 'spdUp', also: 'aim' }),
  S('u_gvine_3c', '하늘 리본 춤', 'wind', 'u', 110, 3, { ranged: true, area: true, inflict: { id: 'gale' } }),
  S('u_spore_2b', '포자 장막', 'grass', 'u', 0, 2, { self: 'defUp', also: 'regen' }),
  S('u_spore_3b', '잠 포자', 'grass', 'u', 60, 3, { ranged: true, inflict: { id: 'stun' } }),
  S('u_spore_3c', '균사 그물', 'grass', 'u', 80, 3, { area: true, inflict: { id: 'root' } }),
  S('u_frost_2b', '맑은 종소리', 'ice', 'u', 0, 2, { self: 'purify', also: 'shield' }),
  S('u_frost_3b', '얼음 종 울림', 'ice', 'u', 85, 3, { ranged: true, area: true, inflict: { id: 'chill', n: 1 } }),
  S('u_frost_3c', '절대 서리', 'ice', 'u', 120, 5, { ranged: true, inflict: { id: 'chill', n: 3 } }),
  S('u_volt_2b', '전구 번쩍', 'bolt', 'u', 60, 1, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_volt_3b', '과충전', 'bolt', 'u', 0, 2, { self: 'atkUp', also: 'aim' }),
  S('u_volt_3c', '번개 그물', 'bolt', 'u', 105, 4, { ranged: true, area: true, inflict: { id: 'shock', n: 2 } }),
  S('u_stone_2b', '돌가루 막', 'earth', 'u', 0, 1, { self: 'shield' }),
  S('u_stone_3b', '수정 껍데기', 'earth', 'u', 0, 3, { self: 'armor', reflect: true }),
  S('u_stone_3c', '산사태', 'earth', 'u', 110, 4, { area: true, inflict: { id: 'defDown' } }),
  S('u_jelly_2b', '말랑 회복', 'water', 'u', 0, 2, { self: 'regen', also: 'purify' }),
  S('u_jelly_3b', '찌릿 촉수', 'water', 'u', 85, 2, { contact: true, drain: 0.4 }),
  S('u_jelly_3c', '해파리 떼', 'water', 'u', 95, 4, { ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }),
  S('u_fang_2b', '덫 기다리기', 'earth', 'u', 0, 2, { self: 'defUp', reflect: true }),
  S('u_fang_3b', '꿀꺽 삼키기', 'earth', 'u', 90, 3, { contact: true, drain: 0.5 }),
  S('u_fang_3c', '거대 덫', 'earth', 'u', 130, 5, { contact: true, inflict: { id: 'root' } }),
  S('u_blade_2b', '칼날 갈기', 'fire', 'u', 0, 2, { self: 'aim', also: 'atkUp' }),
  S('u_blade_3b', '불꽃 연속 베기', 'fire', 'u', 95, 3, { contact: true, inflict: { id: 'burn' } }),
  S('u_blade_3c', '홍련 일섬', 'fire', 'u', 145, 5, { contact: true, inflict: { id: 'defDown' } }),
  S('u_toxi_2b', '독 즙', 'grass', 'u', 65, 2, { drain: 0.3, inflict: { id: 'poison', n: 1 } }),
  S('u_toxi_3b', '독가시 갑옷', 'grass', 'u', 0, 2, { self: 'regen', reflect: true }),
  S('u_toxi_3c', '썩은 가시', 'grass', 'u', 120, 4, { ranged: true, inflict: { id: 'defDown' } }),
  S('u_emcap_2b', '등불 밝히기', 'fire', 'u', 0, 2, { self: 'aim', also: 'spdUp' }),
  S('u_emcap_3b', '불티 포자', 'fire', 'u', 80, 3, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_emcap_3c', '잿불 폭발', 'fire', 'u', 125, 4, { inflict: { id: 'spore', delay: 1 } }),
  S('u_drake_2b', '날개 불바람', 'fire', 'u', 70, 2, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_drake_3b', '화룡 비늘', 'fire', 'u', 0, 3, { self: 'atkUp', reflect: true }),
  S('u_drake_3c', '화룡 강림', 'fire', 'u', 135, 5, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_gat_2b', '부채 막기', 'wind', 'u', 0, 2, { self: 'shield', also: 'spdUp' }),
  S('u_gat_3b', '선비의 꾸짖음', 'wind', 'u', 70, 2, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_gat_3c', '갓끈 폭풍', 'wind', 'u', 120, 4, { ranged: true, area: true, inflict: { id: 'gale' } }),
  S('u_tal_2b', '웃는 탈', 'earth', 'u', 50, 1, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_tal_3b', '탈 바꿔 쓰기', 'earth', 'u', 0, 2, { self: 'purify', also: 'spdUp' }),
  S('u_tal_3c', '탈춤 한마당', 'earth', 'u', 100, 4, { area: true, inflict: { id: 'seal' } }),
  S('u_drum_2b', '천둥 울림', 'bolt', 'u', 70, 2, { ranged: true, area: true, inflict: { id: 'shock', n: 1 } }),
  S('u_drum_3b', '북 방패 두드리기', 'bolt', 'u', 0, 2, { self: 'defUp', reflect: true }),
  S('u_drum_3c', '하늘 북', 'bolt', 'u', 140, 5, { ranged: true, inflict: { id: 'shock', n: 2 } }),
  S('u_lamp_2b', '초롱 밝히기', 'ice', 'u', 0, 2, { self: 'purify', also: 'regen' }),
  S('u_lamp_3b', '서리 덩굴 감옥', 'ice', 'u', 80, 3, { area: true, inflict: { id: 'root' } }),
  S('u_lamp_3c', '홍사초롱', 'ice', 'u', 125, 4, { ranged: true, inflict: { id: 'chill', n: 2 } }),
  S('u_jar_2b', '물 길어 오기', 'water', 'u', 0, 2, { self: 'regen', also: 'shield' }),
  S('u_jar_3b', '똬리 버티기', 'water', 'u', 0, 2, { self: 'defUp', reflect: true }),
  S('u_jar_3c', '물동이 폭포', 'water', 'u', 120, 4, { ranged: true, area: true, inflict: { id: 'wet' } }),
  S('u_dok_2b', '도깨비불', 'bolt', 'u', 65, 2, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_dok_3b', '뚝딱 회복', 'bolt', 'u', 0, 2, { self: 'regen', also: 'purify' }),
  S('u_dok_3c', '도깨비 씨름', 'bolt', 'u', 125, 4, { contact: true, inflict: { id: 'stun' } }),
  S('u_crown_2b', '왕의 명령', 'ice', 'u', 55, 2, { ranged: true, inflict: { id: 'taunt' } }),
  S('u_crown_3b', '얼음 왕좌', 'ice', 'u', 0, 3, { self: 'defUp', also: 'regen' }),
  S('u_crown_3c', '빙왕의 심판', 'ice', 'u', 130, 5, { ranged: true, inflict: { id: 'chill', n: 2 } }),
  S('u_emcap_1', '불씨 포자', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'spore', delay: 2 } }),
  S('u_emcap_2', '등불 빛', 'fire', 'u', 85, 2, { ranged: true, inflict: { id: 'burn' } }),
  S('u_emcap_3', '불꽃 포자 구름', 'fire', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }),
  S('u_drake_1', '용불 가시', 'fire', 'u', 60, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_drake_2', '비늘 갑옷', 'fire', 'u', 0, 2, { self: 'armor', reflect: true }),
  S('u_drake_3', '화룡의 숨결', 'fire', 'u', 115, 4, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_gat_1', '부채 바람', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_gat_2', '갓끈 휘날리기', 'wind', 'u', 0, 2, { self: 'spdUp', also: 'aim' }),
  S('u_gat_3', '갓 회오리', 'wind', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }),
  S('u_tal_1', '탈춤 휘감기', 'earth', 'u', 60, 1, { inflict: { id: 'seal' } }),
  S('u_tal_2', '탈놀이', 'earth', 'u', 70, 2, { inflict: { id: 'taunt' } }),
  S('u_tal_3', '대지의 탈춤', 'earth', 'u', 115, 4, { area: true, inflict: { id: 'stun' } }),
  S('u_drum_1', '북채 번개', 'bolt', 'u', 60, 1, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_drum_2', '천둥 장단', 'bolt', 'u', 0, 2, { self: 'aim', also: 'spdUp' }),
  S('u_drum_3', '뇌고 연타', 'bolt', 'u', 40, 4, { hits: 3, ranged: true, area: true, inflict: { id: 'shock', n: 2 } }),
  S('u_lamp_1', '초롱 불빛', 'ice', 'u', 60, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('u_lamp_2', '서리 덩굴', 'ice', 'u', 75, 2, { inflict: { id: 'seal' } }),
  S('u_lamp_3', '청사초롱 눈보라', 'ice', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'chill', n: 2 } }),
  S('u_jar_1', '물동이 쏟기', 'water', 'u', 60, 1, { inflict: { id: 'wet' } }),
  S('u_jar_2', '시원한 물동이', 'water', 'u', 0, 2, { self: 'regen', reflect: true }),
  S('u_jar_3', '물동이 내려치기', 'water', 'u', 115, 3, { area: true, inflict: { id: 'wet' } }),
  S('u_dok_1', '방망이 찌릿', 'bolt', 'u', 60, 1, { inflict: { id: 'shock', n: 1 } }),
  S('u_dok_2', '도깨비 장난', 'bolt', 'u', 70, 2, { ranged: true, inflict: { id: 'spore', delay: 2 } }),
  S('u_dok_3', '금 나와라 뚝딱', 'bolt', 'u', 120, 4, { inflict: { id: 'shock', n: 2 } }),
  S('u_crown_1', '서리 광채', 'ice', 'u', 55, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('u_crown_2', '왕의 망토', 'ice', 'u', 0, 2, { self: 'shield', also: 'defUp' }),
  S('u_crown_3', '빙왕의 포자', 'ice', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'spore', delay: 1 } }),
  // 셋째 아홉 개성(2026-10-17 — 어린 1 · 자라는 2 · 다 자란 3, 수치는 시제품)
  S('u_gladi_1', '가시 칼 찌르기', 'earth', 'u', 60, 1, { contact: true, pierce: 0.3 }),
  S('u_gladi_2', '방패 막기', 'earth', 'u', 0, 2, { self: 'defUp', reflect: true }),
  S('u_gladi_2b', '방패 밀치기', 'earth', 'u', 65, 2, { contact: true, inflict: { id: 'atkDown' } }),
  S('u_gladi_3', '검투사의 일격', 'earth', 'u', 115, 4, { contact: true, inflict: { id: 'defDown' } }),
  S('u_gladi_3b', '관중의 함성', 'earth', 'u', 0, 2, { self: 'atkUp', also: 'aim' }),
  S('u_gladi_3c', '콜로세움의 왕', 'earth', 'u', 140, 5, { contact: true, inflict: { id: 'taunt' } }),
  S('u_jang_1', '장승 눈빛', 'grass', 'u', 55, 1, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_jang_2', '마을 지킴이', 'grass', 'u', 0, 2, { self: 'defUp', also: 'regen' }),
  S('u_jang_2b', '솔잎 가지', 'grass', 'u', 70, 2, { inflict: { id: 'poison', n: 1 } }),
  S('u_jang_3', '천하대장군', 'grass', 'u', 105, 3, { contact: true, inflict: { id: 'taunt' } }),
  S('u_jang_3b', '수호의 웃음', 'grass', 'u', 0, 3, { self: 'shield', also: 'purify' }),
  S('u_jang_3c', '지하여장군', 'grass', 'u', 130, 5, { area: true, inflict: { id: 'root' } }),
  S('u_astro_1', '공기 방울', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_astro_2', '분사 추진', 'wind', 'u', 0, 2, { self: 'spdUp', also: 'aim' }),
  S('u_astro_2b', '무중력 포자', 'wind', 'u', 65, 2, { ranged: true, inflict: { id: 'spore', delay: 2 } }),
  S('u_astro_3', '궤도 돌진', 'wind', 'u', 105, 3, { contact: true, early: true, self: 'spdUp' }),
  S('u_astro_3b', '헬멧 방어막', 'wind', 'u', 0, 2, { self: 'shield', also: 'purify' }),
  S('u_astro_3c', '우주 폭풍', 'wind', 'u', 130, 5, { ranged: true, area: true, inflict: { id: 'gale' } }),
  S('u_viking_1', '뿔 박치기', 'ice', 'u', 60, 1, { contact: true, inflict: { id: 'chill', n: 1 } }),
  S('u_viking_2', '전사의 함성', 'ice', 'u', 0, 2, { self: 'atkUp', also: 'spdUp' }),
  S('u_viking_2b', '얼음 뿔 찌르기', 'ice', 'u', 80, 2, { contact: true, pierce: 0.3, inflict: { id: 'chill', n: 1 } }),
  S('u_viking_3', '빙하 돌격', 'ice', 'u', 115, 4, { contact: true, inflict: { id: 'chill', n: 2 } }),
  S('u_viking_3b', '털 망토', 'ice', 'u', 0, 2, { self: 'defUp', also: 'regen' }),
  S('u_viking_3c', '라그나 서리', 'ice', 'u', 140, 5, { contact: true, inflict: { id: 'stun' } }),
  S('u_hyunmu_1', '물뱀 휘감기', 'water', 'u', 55, 1, { inflict: { id: 'seal' } }),
  S('u_hyunmu_2', '거북 등껍질', 'water', 'u', 0, 2, { self: 'armor', also: 'defUp' }),
  S('u_hyunmu_2b', '물살 꼬리', 'water', 'u', 70, 2, { ranged: true, inflict: { id: 'wet' } }),
  S('u_hyunmu_3', '현무의 물결', 'water', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'wet' } }),
  S('u_hyunmu_3b', '북방의 수호', 'water', 'u', 0, 3, { self: 'regen', reflect: true }),
  S('u_hyunmu_3c', '흑수룡 강림', 'water', 'u', 135, 5, { ranged: true, drain: 0.3 }),
  S('u_gumiho_1', '여우불', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_gumiho_2', '여우 홀림', 'fire', 'u', 60, 2, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_gumiho_2b', '꼬리 불꽃', 'fire', 'u', 75, 2, { inflict: { id: 'burn' } }),
  S('u_gumiho_3', '아홉 꼬리 불', 'fire', 'u', 110, 4, { ranged: true, area: true, inflict: { id: 'burn' } }),
  S('u_gumiho_3b', '여우 구슬', 'fire', 'u', 0, 2, { self: 'regen', also: 'aim' }),
  S('u_gumiho_3c', '천년 여우불', 'fire', 'u', 140, 5, { ranged: true, inflict: { id: 'burn' } }),
  S('u_wizard_1', '별빛 찌릿', 'bolt', 'u', 55, 1, { ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('u_wizard_2', '별 지팡이', 'bolt', 'u', 75, 2, { ranged: true, inflict: { id: 'atkDown' } }),
  S('u_wizard_2b', '마법 방울', 'bolt', 'u', 0, 2, { self: 'shield', also: 'aim' }),
  S('u_wizard_3', '번개 주문', 'bolt', 'u', 110, 4, { ranged: true, inflict: { id: 'shock', n: 2 } }),
  S('u_wizard_3b', '모자 속 비밀', 'bolt', 'u', 0, 2, { self: 'purify', also: 'spdUp' }),
  S('u_wizard_3c', '봉인 주문', 'bolt', 'u', 120, 5, { ranged: true, inflict: { id: 'stun' } }),
  S('u_ninja_1', '잎 수리검', 'wind', 'u', 55, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_ninja_2', '그림자 분신', 'wind', 'u', 0, 2, { self: 'stealth', look: 'clone', early: true, link: { power: 24, hits: 3 }, uses: 1 }),   // 2026-10-23 엑셀 v10 은신 통합: 은신(연출 = 분신) · 피하면 바로 연타 3타×24(게일바인 제안값 — 밸런스 전)
  S('u_ninja_2b', '덩굴 올가미', 'wind', 'u', 65, 2, { inflict: { id: 'seal' } }),
  S('u_ninja_3', '수리검 난무', 'wind', 'u', 36, 3, { ranged: true, hits: 3 }),
  S('u_ninja_3b', '그림자 숨기', 'wind', 'u', 0, 2, { self: 'stealth', early: true, link: { power: 70, ambush: true }, uses: 2 }),   // 은신 · 피하면 바로 기습(위력 70 · ×1.5 · 자세 무시) — 옛 '턴 처음 은신 + 나중 공격'은 은신 통합(기술을 쓸 때 시작)으로 바뀜
  S('u_ninja_3c', '질풍 베기', 'wind', 'u', 135, 5, { contact: true, inflict: { id: 'atkDown' } }),
  S('u_haenyeo_1', '물질', 'water', 'u', 55, 1, { inflict: { id: 'wet' } }),
  S('u_haenyeo_2', '숨비소리', 'water', 'u', 0, 2, { self: 'regen', also: 'purify' }),
  S('u_haenyeo_2b', '테왁 던지기', 'water', 'u', 70, 2, { ranged: true, inflict: { id: 'wet' } }),
  S('u_haenyeo_3', '파도타기', 'water', 'u', 105, 3, { ranged: true, area: true, inflict: { id: 'wet' } }),
  S('u_haenyeo_3b', '망사리 그물', 'water', 'u', 70, 2, { inflict: { id: 'root' } }),
  S('u_haenyeo_3c', '심해 물질', 'water', 'u', 125, 4, { contact: true, drain: 0.4 }),
  // 2026-10-18 밤 새 여섯(개성 기술 = 단계마다 하나씩 껍데기 — 사용자가 다시 만듦)
  S('u_pirate_1', '물보라 칼질', 'water', 'u', 60, 1, { contact: true, inflict: { id: 'wet' } }),
  S('u_pirate_2', '해적의 호령', 'water', 'u', 0, 2, { self: 'atkUp' }),
  S('u_pirate_3', '큰 파도 베기', 'water', 'u', 110, 3, { contact: true, inflict: { id: 'taunt' } }),
  S('u_ranger_1', '덩굴 화살', 'grass', 'u', 55, 1, { ranged: true, inflict: { id: 'poison', n: 1 } }),
  S('u_ranger_2', '숲의 숨결', 'grass', 'u', 0, 2, { self: 'spdUp', also: 'aim' }),
  S('u_ranger_3', '잎새 연사', 'grass', 'u', 27, 3, { hits: 4, ranged: true, inflict: { id: 'seal' } }),
  S('u_miner_1', '곡괭이 찍기', 'earth', 'u', 60, 1, { contact: true, pierce: 0.3, inflict: { id: 'spore', delay: 2 } }),
  S('u_miner_2', '헬멧 단단히', 'earth', 'u', 0, 2, { self: 'defUp', also: 'regen' }),
  S('u_miner_3', '광맥 폭파', 'earth', 'u', 105, 3, { area: true, inflict: { id: 'stun' } }),
  S('u_ballet_1', '눈꽃 회전', 'ice', 'u', 55, 1, { ranged: true, inflict: { id: 'chill', n: 1 } }),
  S('u_ballet_2', '우아한 인사', 'ice', 'u', 0, 2, { self: 'shield' }),
  S('u_ballet_3', '얼음 피루엣', 'ice', 'u', 100, 3, { area: true, inflict: { id: 'chill', n: 2 } }),
  S('u_volcano_1', '불씨 분출', 'fire', 'u', 55, 1, { ranged: true, inflict: { id: 'burn' } }),
  S('u_volcano_2', '마그마 껍질', 'fire', 'u', 0, 2, { self: 'defUp' }),
  S('u_volcano_3', '화산 폭발', 'fire', 'u', 115, 4, { area: true, inflict: { id: 'burn', n: 2 } }),
  S('u_dandel_1', '솜털 바람', 'wind', 'u', 50, 1, { ranged: true, inflict: { id: 'gale' } }),
  S('u_dandel_2', '활공 바람', 'wind', 'u', 0, 2, { self: 'spdUp', also: 'regen' }),
  S('u_dandel_3', '민들레 폭풍', 'wind', 'u', 100, 3, { ranged: true, area: true, inflict: { id: 'atkDown' } }),
  // 변이 기술(2026-10-16 사용자 "변이 스킬은 별개로 2칸 — 최대 6칸" · 추천안 "변이마다 정해진 목록에서 언제든 골라 끼움 · 에너지 대신 충전" · "변이식물의 장점은 변이스킬로 6칸"):
  //  tier 'm' · form = 변이형 · 에너지 0 · charge = 쓰고 나서 못 쓰는 턴 수 · 잊기 없음(목록 안에서 언제든 바꿈). 수치는 시제품 — 밸런스는 나중에(사용자)
  S('m_bite', '물어뜯기', null, 'm', 70, 0, { form: 'predator', uses: 2, pierce: 0.3, drain: 0.4 }),
  S('m_devour', '집어삼키기', null, 'm', 75, 0, { form: 'predator', uses: 1, drain: 0.6 }),
  S('m_hunt', '사냥 본능', null, 'm', 0, 0, { form: 'predator', uses: 3, self: 'aim', also: 'atkUp' }),
  S('m_slash', '칼날 베기', null, 'm', 80, 0, { form: 'weapon', uses: 2 }),
  S('m_shot', '가시 탄환', null, 'm', 27, 0, { form: 'weapon', uses: 3, ranged: true, hits: 3 }),
  S('m_smash', '쇠망치 내려치기', null, 'm', 70, 0, { form: 'weapon', uses: 1, inflict: { id: 'stun' } }),
  S('m_spit', '독 뱉기', null, 'm', 45, 0, { form: 'toxic', uses: 3, ranged: true, inflict: { id: 'poison', n: 1 } }),
  S('m_acid', '부식액', null, 'm', 65, 0, { form: 'toxic', uses: 2, ranged: true, inflict: { id: 'defDown' } }),
  S('m_miasma', '독안개', null, 'm', 45, 0, { form: 'toxic', uses: 1, ranged: true, area: true, inflict: { id: 'poison', n: 2 } }),
  S('m_puff', '포자 퍼프', null, 'm', 45, 0, { form: 'spore', uses: 3, ranged: true, inflict: { id: 'atkDown' } }),
  S('m_sleep', '잠 포자', null, 'm', 45, 0, { form: 'spore', uses: 1, ranged: true, inflict: { id: 'stun' } }),
  S('m_bloom', '포자 만개', null, 'm', 0, 0, { form: 'spore', uses: 1, self: 'regen', also: 'purify' }),
  S('m_breath', '용의 숨결', null, 'm', 80, 0, { form: 'dragon', uses: 2, ranged: true, elOwn: true }),   // 속성 = 그 식물 속성(kitOfPlant)
  S('m_scale', '비늘 방패', null, 'm', 0, 0, { form: 'dragon', uses: 2, self: 'armor' }),
  S('m_roar', '용의 포효', null, 'm', 70, 0, { form: 'dragon', uses: 2, inflict: { id: 'taunt' } }),
  // 속성 변이 기술(2026-10-17 사용자 "변이 카드 수를 늘리자 — 불 속성 공격도 있고 물도 있고 · 다 만들지 말고 어울리는 거와 연결해서"): 변이마다 어울리는 속성 한두 개만
  S('m_flame', '달군 칼날', 'fire', 'm', 50, 0, { form: 'weapon', uses: 2, inflict: { id: 'burn' } }),
  S('m_spear', '번개 창', 'bolt', 'm', 70, 0, { form: 'weapon', uses: 2, pierce: 0.3, ranged: true, inflict: { id: 'shock', n: 1 } }),
  S('m_rocket', '로켓포', null, 'm', 60, 0, { form: 'weapon', uses: 1, ranged: true, area: true }),   // 2026-10-17 사용자 "무기에 광역으로 로켓포도" — 상대 전부 · 한 번(수치 임시)
  S('m_xbow', '석궁', null, 'm', 85, 0, { form: 'weapon', uses: 2, pierce: 0.3, ranged: true }),   // 2026-10-17 사용자 "석궁도" — 묵직한 한 발(수치 임시)
  S('m_flamer', '화염 방사', 'fire', 'm', 50, 0, { form: 'weapon', uses: 2, ranged: true, area: true, inflict: { id: 'burn' } }),   // 2026-10-17 사용자 "화염방사도 넣자" — 무기 종류 화염방사(수치 임시 — 변이 카드는 사용자가 나중에 보고 정함)
  S('m_burrow', '땅굴 습격', 'earth', 'm', 65, 0, { form: 'predator', uses: 2, drain: 0.25 }),
  S('m_maw', '심해 아가리', 'water', 'm', 50, 0, { form: 'predator', uses: 2, drain: 0.25, inflict: { id: 'wet' } }),
  S('m_bile', '독물 쏘기', 'water', 'm', 50, 0, { form: 'toxic', uses: 2, ranged: true, inflict: { id: 'poison', n: 1 } }),
  S('m_ivy', '독가시 덩굴', 'grass', 'm', 45, 0, { form: 'toxic', uses: 1, inflict: { id: 'poison', n: 2 } }),
  S('m_gust', '포자 바람', 'wind', 'm', 60, 0, { form: 'spore', uses: 2, ranged: true, area: true, inflict: { id: 'spore', delay: 2 } }),
  S('m_frostclaw', '서리 발톱', 'ice', 'm', 70, 0, { form: 'dragon', uses: 2, inflict: { id: 'chill', n: 1 } }),
  S('m_voltclaw', '뇌룡 발톱', 'bolt', 'm', 70, 0, { form: 'dragon', uses: 2, inflict: { id: 'shock', n: 1 } }),
].map(s => [s.id, s]));
// ── 종 고유 기술 v2(사용자와 짠 설계 — docs/superpowers/specs/2026-10-18-v2-species-skills.md 각 종 절) ──
//  켠 종(SPECIES_V2)만 옛 개성 기술 자리(같은 id라 저장 그대로)를 바꿔 끼우고 타고남을 붙임 · 빼면 옛 기술. 수치는 종 리그전 밸런스 전 제안값
//  hex = 피해 없이 상대에게 거는 기술(빗나가지 않음 — 2026-10-24 사용자 확정 · 공격에 붙은 방해는 적중해야 걸림) · galeAdd = 상대 쪽 강풍에 덧붙임(강풍이 불 때만 · 같은 것은 한 번)
export const SPECIES_V2 = new Set(['cactus_wind', 'vine_wind', 'stone_cap', 'spore_cap']);
const V2 = {
  cactus_wind: {   // 10. 게일캑터 — 방해 디버프 기술 · 강풍이 부는 턴 끝마다 공명 +1, 3이면 무속성 확정 치명(치명 방어엔 정타)
    sp: { res: { reso: [0, 3, '공명'] }, reso: { k: 'reso', at: 3, power: 45, count: ['gale', 'accDown', 'critDown', 'seal'] } },
    skills: [
      S('u_gale_1', '시작의 공명', 'wind', 'u', 0, 1, { act: 'hex', cats: ['debuff'], hex: [{ id: 'gale', turns: 3 }, { id: 'atkDown' }] }),
      S('u_gale_2', '길 잃은 주파수', 'wind', 'u', 0, 2, { act: 'hex', cats: ['debuff'], hex: [{ id: 'accDown' }, { id: 'critDown' }] }),
      S('u_gale_2b', '환각의 주파수', 'wind', 'u', 0, 2, { self: 'stealth', early: true, link: { power: 60, el: 'wind' }, pierceReflect: true, uses: 2 }),
      S('u_gale_3', '폭풍 공명', 'wind', 'u', 0, 3, { act: 'hex', cats: ['debuff'], galeAdd: 'storm' }),
      S('u_gale_3b', '치유 공명', 'wind', 'u', 0, 2, { act: 'hex', cats: ['heal_hp'], galeAdd: 'heal' }),
      S('u_gale_3c', '뇌전 공명', 'wind', 'u', 0, 2, { act: 'hex', cats: ['debuff'], galeAdd: 'shock' }),
    ],
  },
  vine_wind: {   // 11. 게일바인 — 피하면 스택(상한 5) · 맞으면 스택을 다 써서 반격(3 이상 출혈) · 선공하면 활력
    sp: { res: { evs: [0, 5, '스택'] }, evStack: { k: 'evs', per: 10, bleedAt: 3 }, firstUp: 'atkUp' },
    skills: [
      S('u_gvine_1', '그건 내 잔상인데?', 'wind', 'u', 0, 3, { self: 'stealth', early: true, link: { power: 20, ambush: true, el: 'wind' } }),
      S('u_gvine_2', '이딴게.. 공격?', 'wind', 'u', 0, 2, { act: 'hex', cats: ['debuff'], hex: [{ id: 'taunt' }, { id: 'accDown' }] }),
      S('u_gvine_2b', '휙- 푹찍', 'wind', 'u', 70, 2, { late: true, critIfDodged: true }),
      S('u_gvine_3', '방심하기', 'wind', 'u', 0, 1, { bare: 0.6 }),
      S('u_gvine_3b', '빠르지? 열받지?', 'wind', 'u', 24, 3, { hits: 3, inflict: { id: 'gale', turns: 3 } }),
      S('u_gvine_3c', '피해?', 'wind', 'u', 80, 4, { early: true, sure: true }),
    ],
  },
  stone_cap: {   // 15. 스톤캡 — 동굴의 주인: 나와 있는 동안 상대 쪽에 동굴(개인 환경 · 기동 하락) · 기술이 동굴에 설치물을 더함(스톤캡이 나가면 설치물째 걷힘)
    sp: { cave: true },
    skills: [
      S('u_stone_1', '낙석', 'earth', 'u', 60, 1, { inflict: { id: 'stun', p: 0.15 } }),
      S('u_stone_2', '자갈밭', 'earth', 'u', 0, 2, { act: 'hex', cats: ['debuff'], caveAdd: 'gravel' }),
      S('u_stone_2b', '석순', 'earth', 'u', 80, 2, { noShield: true }),
      S('u_stone_3', '용암지대', 'fire', 'u', 0, 3, { act: 'hex', cats: ['debuff'], caveAdd: 'lava' }),
      S('u_stone_3b', '지반붕괴', 'earth', 'u', 70, 3, { area: true, inflict: { id: 'stun', p: 0.25 }, caveAdd: 'collapse' }),
      S('u_stone_3c', '이끼덮기', 'grass', 'u', 0, 2, { cats: ['heal_hp'], moss: true }),
    ],
  },
  spore_cap: {   // 12. 스포어캡 — 소환수 = 잠든 포자 → 다음 턴 시작에 깨어나 새끼(턴 시작마다 평타) · 주인 대신 맞음 · 능력치 = 주인의 %(status.js SUMMON)
    sp: { summon: true },
    skills: [
      S('u_spore_1', '포자 배양', 'grass', 'u', 0, 2, { cats: ['buff'], summon: true }),
      S('u_spore_2', '포자벽', 'grass', 'u', 0, 2, { self: 'shield', sporeWall: true }),
      S('u_spore_2b', '일제 포자', 'grass', 'u', 0, 1, { cats: ['attack'], volley: true }),
      S('u_spore_3', '포자회귀', 'grass', 'u', 0, 3, { act: 'hex', cats: ['debuff'], burst: true }),
      S('u_spore_3b', '포자작!', 'bolt', 'u', 40, 1, { inflict: { id: 'spore', delay: 2 } }),
      S('u_spore_3c', '커져라!', 'grass', 'u', 0, 2, { cats: ['buff'], grow: true }),
    ],
  },
};
for (const [k, v] of Object.entries(V2)) if (SPECIES_V2.has(k)) { Object.assign(SPECIES[k], v.sp); for (const s of v.skills) SKILLS[s.id] = s; }
// 변이형(변이 연출 설계 2026-10-15: 포식 = 진홍 · 무기 = 강철 · 독성 = 보라 · 포자 = 금빛 · 용족 = 청록) — 포자는 버섯 전용. 일반(무변이) = null
export const FORMS = {
  predator: { name: '포식', col: '#e8344a', light: '#ffd0d6' },
  weapon: { name: '무기', col: '#9aa8c0', light: '#e8eef8' },
  toxic: { name: '독성', col: '#a868e8', light: '#f0d8ff' },
  spore: { name: '포자', col: '#d0b050', light: '#fffbd8' },
  dragon: { name: '용족', col: '#30e1b9', light: '#c8fff0' },
};
export const FORM_KEYS = Object.keys(FORMS);
// 업데이트 안전(2026-10-18 — docs/superpowers/specs/2026-10-18-v2-species-identity-design.md §7):
//  RULES_VER = 전투 계산(battle/rules.js · status.js · model.js · team.js)을 바꿔 올릴 때 +1 — 다른 번호로 시작한 봇 판 · 친구 대결은 이어 하지 않고 승패 없이 닫힘(진 판 아님)
//  RENAMED = 이름(id)을 바꾼 기술 · 카드 { 옛 id: 새 id } — 적을 때 logic.js SAVE_VER 도 +1(옮기기 직전 원본이 서버에 보관됨). 모르는 id는 지우지 않음
export const RULES_VER = 12;   // 12 = 2026-10-24 스포어캡(소환수 · 포자벽 · 포자회귀) · 스톤캡(동굴 · 설치 · 석순 보호막 무시 · 기절 확률) · 피해?의 확정 치명은 방어태세에 막힘
//  11 = 2026-10-23 종 고유 기술 v2 첫 묶음(게일캑터 · 게일바인 — 피해 없이 거는 기술 · 공명 · 스택 반격 · 반드시 맞음 · 방심하기)
//  10 = 2026-10-23 조준 재정의(빗나감 칸 없음 · 치명 +25 · 회피가 옮기는 칸은 스침으로 — 사용자)
//  9 = 2026-10-23 광역 = 빗나감 · 스침 절반 → 정타(치명 그대로 — 사용자)
//  8 = 2026-10-23 정화 뒤 보호 없앰(사용자 '보호 없애')
//  7 = 2026-10-23 사용자 교정(은신끼리도 서로 안 보임 · 봉인은 못 쓸 기술도 뽑음 · 불에 맞으면 얼음도 녹음)
//  6 = 2026-10-23 엑셀 v10 공통 효과(능력치 겹 · 상태이상 · 면역 · 제한 · 포자 · 방어 · 반사 · 보호막 · 조준 · 은신 · 범위 · 강풍 · 대기석 진행 — 계획 docs/superpowers/plans/2026-10-23-v2-effects-v10-apply.md)
//  5 = 2026-10-22 봇 머리(점수로 고르기 · 교체 판단 · 단계별 머리 좋음 — 봇 판 다시 돌리기가 달라짐)
//  4 = 2026-10-18 방어구 · 관통 · 연타 · 은신 · 분신 · 순서 손잡이(먼저 · 나중)
//  3 = 2026-10-18 방어태세(순서 무관 방어 ×4 · 적중 후 해제)
export const RENAMED = { skill: {}, card: {} };
export const formSkills = form => Object.values(SKILLS).filter(x => x.tier === 'm' && x.form === form).map(x => x.id);
export const MUT_SLOTS = 2;   // 옛 변이 칸 둘(p.skills.mut) — 2026-10-17부터 카드 칸 둘(game/cards.js)로 옮겨 감(logic.js normCards)
// 탐사 종자가 변이일 확률(지역 mut 배율을 곱함 — 행성 지역 고르기) · 변이 고정 종(SPECIES[키].form)은 늘 그 변이
export const MUT_P = 0.04;
const UNI = { flower_grass: 'petal', thorn: 'thorn', aqua: 'aqua', flower_wind: 'wind', spark: 'spark', vine_water: 'tide', cactus_fire: 'ember', gaia: 'gaia', flower_fire: 'blaze', cactus_wind: 'gale', vine_wind: 'gvine', spore_cap: 'spore', frost_bell: 'frost', volt_vine: 'volt', stone_cap: 'stone', jelly_cap: 'jelly', fang_trap: 'fang', blade_vine: 'blade', toxi_cactus: 'toxi', draco_fruit: 'draco', ember_cap: 'emcap', drake_cactus: 'drake', frost_drake: 'fdrake', gat_cap: 'gat', mask_vine: 'tal', drum_cactus: 'drum', lantern_vine: 'lamp', jar_cactus: 'jar', goblin_cap: 'dok', crown_cap: 'crown', gladi_cactus: 'gladi', jangseung_cactus: 'jang', astro_cap: 'astro', viking_cap: 'viking', hyunmu_cap: 'hyunmu', gumiho_bloom: 'gumiho', wizard_bell: 'wizard', ninja_vine: 'ninja', diver_vine: 'haenyeo', pirate_cactus: 'pirate', ranger_vine: 'ranger', miner_cap: 'miner', snow_ballet: 'ballet', volcano_cap: 'volcano', dandel_aero: 'dandel' };
export const uniqueOf = (key, stage) => `u_${UNI[key]}_${stage + 1}`;
// 단계마다 더 피는 개성 기술(2026-10-17 — 어린 1 · 자라는 2 · 다 자란 3). 아직 없는 종은 단계 첫 개성 하나
export const UNI_EXTRA = {
  draco_fruit: { 1: ['u_draco_2b'], 2: ['u_draco_3b', 'u_draco_3c'] }, frost_drake: { 1: ['u_fdrake_2b'], 2: ['u_fdrake_3b', 'u_fdrake_3c'] },
  flower_grass: { 1: ['u_petal_2b'], 2: ['u_petal_3b', 'u_petal_3c'] },
  thorn: { 1: ['u_thorn_2b'], 2: ['u_thorn_3b', 'u_thorn_3c'] },
  aqua: { 1: ['u_aqua_2b'], 2: ['u_aqua_3b', 'u_aqua_3c'] },
  flower_wind: { 1: ['u_wind_2b'], 2: ['u_wind_3b', 'u_wind_3c'] },
  spark: { 1: ['u_spark_2b'], 2: ['u_spark_3b', 'u_spark_3c'] },
  vine_water: { 1: ['u_tide_2b'], 2: ['u_tide_3b', 'u_tide_3c'] },
  cactus_fire: { 1: ['u_ember_2b'], 2: ['u_ember_3b', 'u_ember_3c'] },
  gaia: { 1: ['u_gaia_2b'], 2: ['u_gaia_3b', 'u_gaia_3c'] },
  flower_fire: { 1: ['u_blaze_2b'], 2: ['u_blaze_3b', 'u_blaze_3c'] },
  cactus_wind: { 1: ['u_gale_2b'], 2: ['u_gale_3b', 'u_gale_3c'] },
  vine_wind: { 1: ['u_gvine_2b'], 2: ['u_gvine_3b', 'u_gvine_3c'] },
  spore_cap: { 1: ['u_spore_2b'], 2: ['u_spore_3b', 'u_spore_3c'] },
  frost_bell: { 1: ['u_frost_2b'], 2: ['u_frost_3b', 'u_frost_3c'] },
  volt_vine: { 1: ['u_volt_2b'], 2: ['u_volt_3b', 'u_volt_3c'] },
  stone_cap: { 1: ['u_stone_2b'], 2: ['u_stone_3b', 'u_stone_3c'] },
  jelly_cap: { 1: ['u_jelly_2b'], 2: ['u_jelly_3b', 'u_jelly_3c'] },
  fang_trap: { 1: ['u_fang_2b'], 2: ['u_fang_3b', 'u_fang_3c'] },
  blade_vine: { 1: ['u_blade_2b'], 2: ['u_blade_3b', 'u_blade_3c'] },
  toxi_cactus: { 1: ['u_toxi_2b'], 2: ['u_toxi_3b', 'u_toxi_3c'] },
  ember_cap: { 1: ['u_emcap_2b'], 2: ['u_emcap_3b', 'u_emcap_3c'] },
  drake_cactus: { 1: ['u_drake_2b'], 2: ['u_drake_3b', 'u_drake_3c'] },
  gat_cap: { 1: ['u_gat_2b'], 2: ['u_gat_3b', 'u_gat_3c'] },
  mask_vine: { 1: ['u_tal_2b'], 2: ['u_tal_3b', 'u_tal_3c'] },
  drum_cactus: { 1: ['u_drum_2b'], 2: ['u_drum_3b', 'u_drum_3c'] },
  lantern_vine: { 1: ['u_lamp_2b'], 2: ['u_lamp_3b', 'u_lamp_3c'] },
  jar_cactus: { 1: ['u_jar_2b'], 2: ['u_jar_3b', 'u_jar_3c'] },
  goblin_cap: { 1: ['u_dok_2b'], 2: ['u_dok_3b', 'u_dok_3c'] },
  crown_cap: { 1: ['u_crown_2b'], 2: ['u_crown_3b', 'u_crown_3c'] },
  gladi_cactus: { 1: ['u_gladi_2b'], 2: ['u_gladi_3b', 'u_gladi_3c'] },
  jangseung_cactus: { 1: ['u_jang_2b'], 2: ['u_jang_3b', 'u_jang_3c'] },
  astro_cap: { 1: ['u_astro_2b'], 2: ['u_astro_3b', 'u_astro_3c'] },
  viking_cap: { 1: ['u_viking_2b'], 2: ['u_viking_3b', 'u_viking_3c'] },
  hyunmu_cap: { 1: ['u_hyunmu_2b'], 2: ['u_hyunmu_3b', 'u_hyunmu_3c'] },
  gumiho_bloom: { 1: ['u_gumiho_2b'], 2: ['u_gumiho_3b', 'u_gumiho_3c'] },
  wizard_bell: { 1: ['u_wizard_2b'], 2: ['u_wizard_3b', 'u_wizard_3c'] },
  ninja_vine: { 1: ['u_ninja_2b'], 2: ['u_ninja_3b', 'u_ninja_3c'] },
  diver_vine: { 1: ['u_haenyeo_2b'], 2: ['u_haenyeo_3b', 'u_haenyeo_3c'] },
};
export const uniquesOf = (key, stage) => [uniqueOf(key, stage), ...(((UNI_EXTRA[key] || {})[stage]) || [])];
export const TIER_NAME = { u: '개성', c1: '하급', c2: '중급', c3: '상급', g: '가지', s: '특수', m: '변이' };
const tierAt = stage => ['c1', 'c2', 'c3'][stage];
// 진화(또는 처음) 때 피어날 후보: 그 단계 개성 + 그 단계 급의 속성·종 공통 + (자라는 단계부터) 가지
export function bloomPool(key, stage) {
  const sp = SPECIES[key], t = tierAt(stage), out = uniquesOf(key, stage).map(id => ({ id, w: 4 }));
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
  pack_n: { name: '일반 카드 꾸러미', icon: 'star', desc: '일반 식물 관리에서 열어요' },   // 2026-10-22 — 산 카드는 꾸러미로 가방에 · 식물에서 열면 그 식물에 맞는 카드
  pack_m: { name: '변이 카드 꾸러미', icon: 'star', desc: '변이 식물 관리에서 열어요' },
  nutr: { name: '영양제', icon: 'potion', desc: '고른 개체값 +1(8까지 — 9 · 10은 종자 거름으로)' },   // 2026-10-22 사용자 "개체값 올리는 영양제 아직 없는 건가"
};
// 영양제(2026-10-22): 고른 개체값 하나를 반드시 +1 — 단 NUTR_CAP 까지(9 · 10은 확률인 종자 거름으로만 — 돈으로 끝까지 채우지 못하게)
//  얻는 곳 = 상점(보석 20) · 재배사 레벨 10마다 상자에 하나
export const NUTR_CAP = 8;
export const RARITY = ['common', 'uncommon', 'rare', 'epic', 'legend'];
export const RARITY_COL = ['#e8eef4', '#7cf0a0', '#6fb8ff', '#c48cff', '#ffb04a'];   // 흰 · 초록 · 파랑 · 보라 · 주황(옛 판 5색과 같음)

// ── 재배사 레벨 ──
export const userNeed = L => 80 + 50 * L + 4 * L * L;   // 다음 재배사 레벨까지(2026-10-22 — 옛 60 + 40L: Lv20까지 약 8700 → 약 2만 900)
export const XP = { botWin: 30, botLose: 12, pvpWin: 40, pvpLose: 15, explore: 18, harvest: 2, evolve: 25, plant: 5 };
export const FARM_START = 3, FARM_MAX = 12, STORE_MAX = 120;   // 스마트팜 칸(재배사 레벨로 열림) · 동면 보관고(사용자 "100개 정도 이상")
export const FARM_LV = [2, 3, 5, 7, 9, 12, 15, 18, 21];        // 이 레벨마다 스마트팜 한 칸
export const farmSlots = L => Math.min(FARM_MAX, FARM_START + FARM_LV.filter(x => L >= x).length);
// 레벨업 보상(클래시로얄 왕 레벨처럼 — 상자 하나). 2026-10-22 사용자 "레벨업시 상자나 승리시 보상이 너무 다양해. 다양한 건 좋은데 한 번에 나오는 보상수는 적절히 조율하자":
//  한 상자 = 돈 + 자원 하나(레벨마다 차례로 물 → 비료 → 부품 → 연료) + 특별한 것 하나까지(종자 > 카드 > 회귀 주사 > 보석 — 그 레벨에 걸린 것 중 앞의 것) = 많아야 셋
export function levelReward(L) {
  const r = { credits: 120 + 60 * L };
  const main = ['fuel', 'water', 'fert', 'parts'][L % 4];
  if (L % 10 === 0) r.nutr = 1;   // 영양제(2026-10-22) — 레벨 10마다, 그 레벨은 기본 물건 대신(상자 보상 세 가지까지 — 2026-10-22 사용자 "한 번에 나오는 보상수는 적절히 조율")
  else r[main] = main === 'water' ? 6 + Math.floor(L / 2) : main === 'fert' ? 3 + Math.floor(L / 3) : main === 'parts' ? 4 + Math.floor(L / 2) : 2 + Math.floor(L / 5);
  if (L % 5 === 0) r.seed = 'rare';
  else if (L % 3 === 2) r.pack_n = 1;   // 카드(2026-10-17) → 2026-10-22 일반 카드 꾸러미 하나(식물에서 열기)
  else if (L % 4 === 0) r.regress = 1;
  else if (L % 3 === 0) r.gems = 10;
  return r;
}

// ── 수확(스마트팜) ──
export const FARM_DAY = { water: 30, fert: 12 };   // 스마트팜 열매에서 나오는 물 · 비료 하루(한국 날짜) 상한 — 넘은 열매는 돈(2026-10-23 · 식물이 많아도 성장 재료는 일정하게)
export const HARVEST = { periodMin: [36, 30, 24], maxBase: [2, 3, 4] };   // 단계별 열매 하나 걸리는 분 · 최대 개수(Lv3부터 +1, 열매 개체값 5마다 +1) — 2026-10-22 6·5·4분 → 36·30·24분(너무 쉬움)
const fruitIv = p => ((p.ivs && p.ivs.fruit) || 0);
export const harvestMax = p => HARVEST.maxBase[p.stage] + (p.lv >= 3 ? 1 : 0) + Math.floor(fruitIv(p) / 5);
export const harvestK = p => 1 - 0.03 * fruitIv(p);   // 열매 하나 걸리는 시간 배수(열매 개체값)
// 열매 하나 = 보상 한 가지: 돈·물·비료가 주로(92%), 나머지는 드물게
export const HARVEST_TABLE = [
  { w: 46, kind: 'credits', rar: 0 }, { w: 22, kind: 'water', rar: 1 }, { w: 14, kind: 'fert', rar: 1 }, { w: 10, kind: 'credits', big: true, rar: 2 },
  { w: 1, kind: 'seed', rar: 3 }, { w: 2.5, kind: 'scion', rar: 3 },   // 종자 4 → 1(2026-10-18 사용자 "열매로 종자 나오는 거 많이 낮추거나 빼자" — 같은 종 종자는 종자 거름 재료라 남김)
  { w: 1.2, kind: 'regress', rar: 4 }, { w: 0.3, kind: 'gems', rar: 4 }, { w: 6, kind: 'parts', rar: 1 },   // 부품(2026-10-17)
];

// ── 탐사(행성 11 — 탐사 화면 지도와 같은 이름) ──
// 레벨 문턱은 여유 있게(보통 진행이면 걸리지 않고, 너무 앞서가는 사람만 잠깐 기다림): 1궤도 Lv1 · 2궤도 Lv4 · 3궤도 Lv8 · 4궤도 Lv13
// 2026-10-16 사용자 개편: 모선(집)에서 탐사선이 다녀옴 · 먼 궤도라고 무조건 어렵지 않게 섞음 · 행성마다 나오는 속성이 다름 · 식물보다 자원이 많은 곳도.
//  행성 변수: hazard 위험(0~3, 실패 · 내구 소모) · rich 풍요(보상 양) · vital 생기(0~2, 종자 개체값) · kind 종자형 seed / 섞임 mixed / 자원형 resource · pool = 나오는 식물(속성 = 그 환경)
//  종자끼리의 확률(어느 식물이 나오나)은 행성만 정함 — 탐사선 부위와 상관없음(사용자 "종자끼리의 확률은 변하지 않는걸로")
export const PLANETS = [
  { id: 'ex_ermias', name: '에르미아스', orbit: 1, hazard: 0, rich: 1, vital: 1, kind: 'seed', pool: ['flower_grass', 'aqua', 'spark', 'vine_water', 'flower_wind', 'jar_cactus', 'goblin_cap', 'wizard_bell'] },   // 온화한 우림 = 여러 속성 고루(시작)
  { id: 'ex_calisto', name: '칼리스토', orbit: 1, hazard: 1, rich: 1.1, vital: 0, kind: 'resource', pool: ['gaia', 'cactus_fire', 'stone_cap', 'mask_vine', 'gladi_cactus'] },   // 채굴 잔해 건조 지대 = 대지 · 불 · 부품(나중에 기계)
  { id: 'ex_seraphin', name: '세라핀', orbit: 1, hazard: 0, rich: 1, vital: 1, kind: 'seed', pool: ['flower_wind', 'cactus_wind', 'vine_wind', 'gat_cap', 'astro_cap'] },   // 부유 고원 = 바람
  { id: 'ex_kairen', name: '카이렌', orbit: 2, hazard: 0, rich: 1.3, vital: 1, kind: 'seed', pool: ['flower_fire', 'flower_grass', 'thorn', 'toxi_cactus', 'jangseung_cactus', 'gumiho_bloom'] },   // 따뜻한 들판 = 불 · 풀, 쉬움
  { id: 'ex_mirdin', name: '미르딘', orbit: 2, hazard: 1, rich: 1.1, vital: 2, kind: 'seed', pool: ['thorn', 'spore_cap', 'vine_water', 'jelly_cap', 'fang_trap', 'ranger_vine'] },   // 안개 습지 = 풀 · 물, 생기 높음
  { id: 'ex_volkar', name: '볼카르', orbit: 2, hazard: 2, rich: 1.2, vital: 1, kind: 'mixed', pool: ['spark', 'volt_vine', 'cactus_fire', 'flower_fire', 'blade_vine', 'drake_cactus', 'drum_cactus', 'volcano_cap'] },   // 번개 화산 = 번개 · 불, 위험
  { id: 'ex_veloc', name: '벨로크', orbit: 3, hazard: 3, rich: 1.5, vital: 0, kind: 'resource', pool: ['cactus_fire', 'gaia', 'flower_fire', 'stone_cap', 'ember_cap', 'miner_cap'], legend: true },   // 용암 바위 사막 = 불 · 대지, 자원 · 아주 위험
  { id: 'ex_aztel', name: '아즈텔', orbit: 3, hazard: 0, rich: 1.3, vital: 1, kind: 'seed', pool: ['flower_wind', 'flower_grass', 'vine_wind', 'gat_cap', 'ninja_vine', 'dandel_aero'] },   // 꽃잎 바람 고원 = 바람 · 풀, 먼데도 쉬움
  { id: 'ex_octavis', name: '옥타비스', orbit: 3, hazard: 1, rich: 1.3, vital: 2, kind: 'seed', pool: ['aqua', 'vine_water', 'jelly_cap', 'hyunmu_cap'], legend: true },   // 해저 동굴 = 물, 생기 높음
  { id: 'ex_nereidon', name: '네레이돈', orbit: 4, hazard: 2, rich: 1.4, vital: 1, kind: 'mixed', pool: ['vine_water', 'aqua', 'jelly_cap', 'frost_bell', 'lantern_vine', 'diver_vine', 'pirate_cactus'], legend: true },   // 고리 바다 = 물 · 빙결
  { id: 'ex_tiamen', name: '티아멘', orbit: 4, hazard: 3, rich: 1.6, vital: 1, kind: 'mixed', pool: ['frost_bell', 'vine_wind', 'cactus_wind', 'draco_fruit', 'crown_cap', 'frost_drake', 'viking_cap', 'snow_ballet'], legend: true },   // 얼음 바람 = 빙결 · 바람, 아주 위험
];
// 지역(2026-10-16 사용자 "행성 지도에서 지역 고르기" — 지역마다 나오는 속성·종, 위험과 귀한 보상, 종자 위주/부품 위주를 다르게 · 탐사 장치 단계에 따라 하나씩 열림):
//  행성마다 3~4곳 · need = 탐사 장치 단계 · 첫 곳(need 1) = 행성 값 그대로(옛 판과 같은 확률 · 보상 — 다른 값을 넣지 말 것)
//  pool = 그 행성 식물 중 일부(흔한 것을 겹쳐 쓰면 더 자주 · 흔한 것 하나 이상) · dh · dv = 행성 위험 · 생기에 더함(위험 0~3 · 생기 0~2 안으로) · kind = 종자형/섞임/자원형 바꿈
//  rare = 귀한 보상 배수(희귀 종자 18% · 접목 가지 · 회귀 주사 · 보석에 곱함 — 위험이 높은 곳일수록 큼: dh −1 = 0.8 · 0 = 1 · +1 = 1.3 · +2 = 1.6) · mut = 변이 종자 확률 배수(1 · 1.5 · 2)
//  수치는 가볍게(사용자 "벨런스 보고 보정도 나중에")
const REGIONS = {
  ex_ermias: [
    { id: 'grove', name: '우림 입구', need: 1, rare: 1, mut: 1 },
    { id: 'brook', name: '이끼 개울', need: 2, pool: ['aqua', 'aqua', 'vine_water', 'flower_grass', 'jar_cactus'], rare: 1, mut: 1 },   // 물 · 풀
    { id: 'storm', name: '번개 숲', need: 3, pool: ['flower_wind', 'spark', 'goblin_cap', 'wizard_bell'], dh: 1, kind: 'mixed', rare: 1.3, mut: 1.5 },   // 바람 · 번개
    { id: 'vault', name: '시료 창고', need: 4, dh: 1, dv: 1, rare: 1.3, mut: 2 },   // 옛 문명 시료 = 고루 · 생기 높음
  ],
  ex_calisto: [
    { id: 'pit', name: '채굴장', need: 1, rare: 1, mut: 1 },
    { id: 'canyon', name: '마른 협곡', need: 2, pool: ['cactus_fire', 'cactus_fire', 'gaia', 'mask_vine'], dv: 1, kind: 'mixed', rare: 1, mut: 1 },   // 불 선인장 · 종자 늘어남
    { id: 'scrap', name: '기계 무덤', need: 3, pool: ['stone_cap', 'stone_cap', 'gaia', 'gladi_cactus'], dh: 1, rare: 1.3, mut: 2 },   // 대지 · 부품(나중에 기계 식물)
  ],
  ex_seraphin: [
    { id: 'hill', name: '바람 언덕', need: 1, rare: 1, mut: 1 },
    { id: 'bridge', name: '구름 다리', need: 2, pool: ['vine_wind', 'vine_wind', 'flower_wind', 'gat_cap'], rare: 1, mut: 1 },
    { id: 'eye', name: '폭풍의 눈', need: 3, pool: ['cactus_wind', 'cactus_wind', 'vine_wind', 'astro_cap'], dh: 2, dv: 1, kind: 'mixed', rare: 1.6, mut: 2 },
  ],
  ex_kairen: [
    { id: 'field', name: '꽃 들판', need: 1, rare: 1, mut: 1 },
    { id: 'bramble', name: '가시 덤불', need: 2, pool: ['thorn', 'thorn', 'flower_grass', 'toxi_cactus', 'jangseung_cactus'], dh: 1, rare: 1.3, mut: 1 },   // 풀
    { id: 'ember', name: '불꽃 언덕', need: 3, pool: ['flower_fire', 'flower_fire', 'thorn', 'gumiho_bloom'], dh: 1, dv: 1, kind: 'mixed', rare: 1.3, mut: 1.5 },   // 불
  ],
  ex_mirdin: [
    { id: 'mire', name: '안개 늪', need: 1, rare: 1, mut: 1 },
    { id: 'shade', name: '그늘 숲', need: 2, pool: ['thorn', 'spore_cap', 'fang_trap', 'ranger_vine'], rare: 1, mut: 1.5 },   // 풀 · 스포어캡
    { id: 'pond', name: '젤리 연못', need: 3, pool: ['vine_water', 'jelly_cap'], dh: 1, kind: 'mixed', rare: 1.3, mut: 1.5 },   // 물 · 젤리캡
  ],
  ex_volkar: [
    { id: 'foot', name: '화산 기슭', need: 1, rare: 1, mut: 1 },
    { id: 'ash', name: '잿빛 들', need: 2, pool: ['flower_fire', 'flower_fire', 'cactus_fire'], dh: -1, kind: 'seed', rare: 0.8, mut: 1 },   // 불 · 덜 위험
    { id: 'thunder', name: '천둥 고개', need: 3, pool: ['volt_vine', 'spark', 'drum_cactus'], dh: 1, rare: 1.3, mut: 2 },   // 번개
    { id: 'lava', name: '용암 광맥', need: 4, pool: ['cactus_fire', 'cactus_fire', 'volt_vine', 'blade_vine', 'drake_cactus', 'volcano_cap'], dh: 1, kind: 'resource', rare: 1.3, mut: 1.5 },   // 부품
  ],
  ex_veloc: [
    { id: 'sands', name: '용암 사막', need: 1, rare: 1, mut: 1 },
    { id: 'crater', name: '식은 화구', need: 2, pool: ['flower_fire', 'flower_fire', 'cactus_fire', 'ember_cap'], dh: -1, dv: 1, kind: 'mixed', rare: 0.8, mut: 1 },   // 불 · 덜 위험
    { id: 'obsidian', name: '흑요석 굴', need: 3, pool: ['gaia', 'stone_cap', 'stone_cap', 'miner_cap'], dv: 1, rare: 1, mut: 2 },   // 대지 · 부품
  ],
  ex_aztel: [
    { id: 'petal', name: '꽃잎 고원', need: 1, rare: 1, mut: 1 },
    { id: 'pollen', name: '꽃가루 계곡', need: 2, pool: ['flower_grass', 'flower_grass', 'flower_wind', 'dandel_aero'], dv: 1, rare: 1, mut: 1 },   // 풀 · 생기 높음
    { id: 'gust', name: '돌개바람 절벽', need: 3, pool: ['vine_wind', 'vine_wind', 'flower_wind', 'ninja_vine'], dh: 2, kind: 'mixed', rare: 1.6, mut: 1.5 },   // 바람 · 위험
  ],
  ex_octavis: [
    { id: 'shallow', name: '얕은 동굴', need: 1, rare: 1, mut: 1 },
    { id: 'crystal', name: '수정 동굴', need: 2, pool: ['aqua', 'jelly_cap'], dh: 1, kind: 'resource', rare: 1.3, mut: 1.5 },   // 부품
    { id: 'trench', name: '심해 해구', need: 3, pool: ['vine_water', 'jelly_cap', 'hyunmu_cap'], dh: 2, rare: 1.6, mut: 2 },   // 젤리캡 · 아주 위험
  ],
  ex_nereidon: [
    { id: 'waves', name: '물결 바다', need: 1, rare: 1, mut: 1 },
    { id: 'reef', name: '산호 섬', need: 2, pool: ['aqua', 'aqua', 'vine_water', 'diver_vine', 'pirate_cactus'], dh: -1, dv: 1, kind: 'seed', rare: 0.8, mut: 1 },   // 물 · 덜 위험 · 생기 높음
    { id: 'ring', name: '얼음 고리', need: 3, pool: ['vine_water', 'aqua', 'frost_bell', 'lantern_vine'], dh: 1, rare: 1.3, mut: 1.5 },   // 빙결
    { id: 'glacier', name: '빙하 해구', need: 4, pool: ['vine_water', 'jelly_cap', 'frost_bell'], dh: 1, kind: 'resource', rare: 1.3, mut: 2 },   // 부품
  ],
  ex_tiamen: [
    { id: 'blizzard', name: '눈보라 벌판', need: 1, rare: 1, mut: 1 },
    { id: 'hollow', name: '바람굴', need: 2, pool: ['cactus_wind', 'vine_wind', 'vine_wind'], dh: -1, kind: 'seed', rare: 0.8, mut: 1 },   // 바람 · 덜 위험
    { id: 'spire', name: '얼음 첨탑', need: 3, pool: ['cactus_wind', 'frost_bell', 'draco_fruit', 'crown_cap', 'frost_drake', 'viking_cap', 'snow_ballet'], dv: 1, rare: 1, mut: 2 },   // 빙결 · 생기 높음
  ],
};
for (const p of PLANETS) p.regions = REGIONS[p.id];
export const KIND_NAME = { seed: '종자가 많아요', mixed: '종자 · 자원 섞임', resource: '자원이 많아요' };
// ── 리그 · 시즌(1:1 토너먼트) — 리그는 단계별(성장 설계 2026-10-15 "리그는 단계별(어린 · 자라는 · 무제한)"), 리그마다 단계 사다리(브론즈 → 풀로세움) 따로
//  시즌 = 2주. 끝나면 리그마다 그 시즌 가장 높이 간 단계로 상자(돈 · 보석 · 연료 캡슐 · 골드부터 칭호) → 모든 리그가 두 단계 내려가 예선부터
export const LEAGUES = { sprout: { name: '새싹 리그', short: '새싹', cap: 0, desc: '어린 식물만' }, growing: { name: '자람 리그', short: '자람', cap: 1, desc: '자라는 단계까지' }, open: { name: '무제한 리그', short: '무제한', cap: 2, desc: '단계 제한 없음' } };
export const LEAGUE_KEYS = Object.keys(LEAGUES);
export const TIERS = ['브론즈', '실버', '골드', '플래티넘', '다이아', '마스터', '풀로세움'];
// 프로필 배너가 열리는 재배사 레벨(2026-10-22 — 색 넷은 처음부터 · 무늬 넷(별빛 · 잎맥 · 물결 · 회로)은 Lv5 · 10 · 15 · 20, 그림은 art/profile.js)
export const BANNER_LV = [1, 1, 1, 1, 5, 10, 15, 20, 3, 8, 25, 30];   // 배너 열둘(번호 = s.profile.color · 2026-10-22 새 넷: 오로라 3 · 성운 8 · 황금 25 · 풀로세움 30 — art/profile.js)
// 한 라운드 판 수(2026-10-22 사용자 "랭크도 너무 빨리 오르는 경향이 있어 시스템 자체를 개편할지 고민해보자"): 브론즈 ~ 골드 = 5판 3선승 · 플래티넘부터 = 7판 4선승(전엔 모두 3선승)
export const roundBest = tier => (tier >= 3 ? 7 : 5);
// 대회 점수 · 칸(2026-10-23 사용자 안 C + "결승을 이기는 점수가 모여야 4>3으로" · "랭크전이니깐 어쩔 수 없는걸로해"):
//  라운드 통과 = 예선 · 16강 0 · 8강 +25 · 4강 +30 · 우승 +45, 라운드에서 지면 그 대회 끝(다음은 예선부터) · 예선 탈락 −10 · 16강 탈락 −5 · 8강부터는 감점 없음
//  칸 = 단계마다 넷(브론즈 IV → I) · 칸 하나 100점(우승 한 번어치) · 칸 넷(400점)이면 다음 단계(남는 점수 넘어감) · 강등 · 보호 · 시즌 넘김은 아래 하락 규칙
//  칸(맨 위는 별)이 오를 때마다 보상(전 단계 승급 보상 그대로)
export const ROUND_PTS = [0, 0, 25, 30, 45], LOSE_PTS = [10, 5, 0, 0, 0], DIV_PTS = 100, DIVS = 4, DIV_REWARD = { credits: 300, parts: 5 };
export const TIER_PTS = DIV_PTS * DIVS;
// 하락 규칙(2026-10-23 사용자 "추천안대로 넣어줘"): 시즌 중 단계 강등(IV칸 0점에서 감점되면 아래 단계 I칸 · 브론즈 IV 0점이 바닥) · 단계가 오른 뒤 대회 GUARD_CUPS번은 그 단계 아래로 안 떨어짐 ·
//  풀로세움도 점수제(위가 없음 · 100점마다 별 하나 · 0점 아래면 마스터 I) · 시즌 끝 = 골드 IV(SEASON_FLOOR) 위로 올라간 점수의 절반만 남김(그 아래는 칸 · 점수까지 그대로)
export const GUARD_CUPS = 3, SEASON_FLOOR = 2 * TIER_PTS;
export const isTopTier = tier => TIERS.indexOf(tier) >= TIERS.length - 1;
export const starOf = T => (T && isTopTier(T.tier) ? Math.floor(Math.max(0, T.pts || 0) / DIV_PTS) : 0);   // 풀로세움 별 = 100점마다 하나
export const divOf = T => DIVS - Math.min(DIVS - 1, Math.floor(Math.max(0, (T && T.pts) || 0) / DIV_PTS));   // 4(처음) → 1
export const ROMAN = ['', 'I', 'II', 'III', 'IV'];   // 칸 = 로마 숫자로 보임(2026-10-23 사용자 "로마숫자가 멋있을 거 같아" — 엠블럼 아래 숫자 판 · 글자 모두)
export const rankOf = T => (isTopTier(T.tier) ? T.tier : `${T.tier} ${ROMAN[divOf(T)]}`);   // '브론즈 IV' · 맨 위 = '풀로세움'
export const tourName = T => (isTopTier(T.tier) ? T.name : `${T.name} ${ROMAN[divOf(T)]}`);   // '새싹 브론즈 IV'
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
export const SHINY_P = 1 / 1000, LEGEND_P = 1 / 120;   // 색 변종 · 전설(전설 행성만) — 색 변종 1/64 → 1/1000(종자 천 개에 하나꼴, 2026-10-22 사용자 "색변종은 진짜 희귀하게 해줘")

// ── 상점(돈 = 종자·화분, 보석 = 물·비료·회귀 주사 — 사용자 "상점에서는 유료 재화로 구매") ──
export const SHOP = [
  { id: 'seed_common', name: '일반 종자 꾸러미', cost: { credits: 120 }, give: { seed: 'common' } },
  { id: 'seed_rare', name: '희귀 종자 꾸러미', cost: { credits: 480 }, give: { seed: 'rare' } },
  { id: 'card_basic', name: '일반 카드 꾸러미', cost: { credits: 300 }, give: { pack_n: 1 } },   // 카드(2026-10-17) — 일반 식물용 · 2026-10-22 꾸러미째 가방에(일반 식물 관리에서 열기)
  { id: 'card_mut', name: '변이 카드 꾸러미', cost: { gems: 18 }, give: { pack_m: 1 } },        // 변이 식물용 — 연 식물의 변이 카드(전엔 사자마자 무작위 변이)
  { id: 'water10', name: '물 10', cost: { gems: 6 }, give: { water: 10 } },
  { id: 'fert5', name: '비료 5', cost: { gems: 8 }, give: { fert: 5 } },
  { id: 'regress1', name: '유전자 회귀 주사', cost: { gems: 15 }, give: { regress: 1 } },
  { id: 'nutr1', name: '영양제', cost: { gems: 20 }, give: { nutr: 1 } },   // 개체값 +1(8까지 — 2026-10-22)
  { id: 'fuel3', name: '연료 캡슐 3', cost: { gems: 5 }, give: { fuel: 3 } },
  { id: 'parts5', name: '탐사선 부품 5', cost: { credits: 350 }, give: { parts: 5 } },   // 부품(2026-10-17)
];
// 암시장(컨셉) = 판매(돈, 무조건·적게) · 해체(접목 가지 등 무작위, 많이 키울수록 좋은 것 확률 ↑)
export const SELL_BASE = { common: 40, rare: 110 };
