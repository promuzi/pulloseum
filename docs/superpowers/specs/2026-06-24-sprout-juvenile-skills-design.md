# 설계: 초본형→화초형 병합 + 새싹/유체 스킬 재설계

작성일 2026-06-24 · 상태: 구현 진행

## 목표
1. **타입 5종 확정** — 초본형(grass type)을 폐지하고 화초형(flower)으로 흡수. (※ `grass`는 **타입**과 **풀 속성** 양쪽에 쓰이는 문자열 → 속성 grass는 절대 건드리지 않는다.)
2. **새싹·유체 스킬을 타입 축 / 속성 축으로 재설계.** 개체 고유 스킬 없음(타입+속성에만 종속). 성장체 이상은 기존 ELEMENT_GROWTH_SKILLS 유지.

## 엔진 제약 (전투 `applyMove` 기준 — 반드시 준수)
한 스킬은 `guardMult(+counterPct)` · `energyGain` · `cleanse` · `heal` · `selfBuff{stat,pct,turns}`를 **동시에** 가질 수 있고, `power>0`이면 공격 분기(`aoe`/`single` · `pierce` · `critBonus` · `lifesteal` · `enemyDebuff{stat,pct,turns}` · `dot{kind,pct,turns}` · `elem`)가 추가로 돈다.
- **확률성 부가효과 없음** — 일반 스킬의 enemyDebuff/dot은 항상 적용된다. (확률 라이더는 포자 카드 전용.) → 초안의 "20% 확률 가시반격" 등은 결정형으로 변경.
- counterPct는 guardMult와 함께일 때만 발동(가드 반격).

## 1) 타입 병합 — 통합 지점 체크리스트
- `SPECIES_GRID`: 초본 7행 타입 `'grass'`→`'flower'` (flame/grass_water/grass_grass/grass_earth/windy/grass_bolt/grass_ice). 스탯은 flower 기준 재계산(완전 전환).
- `SPECIES_CATALOG`: 7종 legacy:true 유지(주석만 갱신).
- `SEED_TYPE_NAMES`/`SEED_TYPE_ORDER`: grass 제거.
- `SEED_TYPE_OF`: `moss`,`metal_reed` → `flower`. `seedTypeOf` 폴백 `'grass'`→`'flower'`.
- 탐사 지역 `types:['초본형'...]` → `'화초형'` (6292/6296/6304/6314/6354). `EX_TYPE_ORDER`/`EX_TYPE_ICON`에서 초본형 제거.
- `normalizeState` 식물 루프: `p.seed_type==='grass' → 'flower'` 마이그레이션.
- 안전망: `TYPE_STATS.grass`/`TYPE_CONCEPT.grass`/`TYPE_KO.grass`는 내부 폴백으로 유지(미표시). `battleType(p)`가 grass→flower 매핑.

## 2) 스킬 정의 (STAGE_SKILLS 신설, ALL_SKILLS에 병합)

### 타입 기본 공격 (cost0 · attack · single · grade C) — 5
| 타입 | id | 이름 | power | 부가 |
|---|---|---|--|---|
| 목본 | skill_basic_tree | 새순 들이받기 | 100 | — |
| 화초 | skill_basic_flower | 꽃대 찌르기 | 125 | — |
| 다육 | skill_basic_cactus | 가시 콕찌르기 | 105 | — |
| 덩굴 | skill_basic_vine | 덩굴손 후리기 | 110 | lifesteal 0.12 |
| 버섯 | skill_basic_mushroom | 포자 날리기 | 95 | dot poison 0.03/2턴 |

### 타입 기본 방어 (cost0 · guard) — 5
| 타입 | id | 이름 | 효과 |
|---|---|---|---|
| 목본 | skill_def_tree | 어린 껍질 굳히기 | guardMult 0.4(60%↓) + ⚡+1 |
| 화초 | skill_def_flower | 꽃받침 오므리기 | guardMult 0.55(45%↓) + selfBuff atk 12%/2턴 |
| 다육 | skill_def_cactus | 가시 곤두세우기 | guardMult 0.5(50%↓) + counterPct 0.25 |
| 덩굴 | skill_def_vine | 덩굴 사리기 | guardMult 0.5(50%↓) + heal 0.06 |
| 버섯 | skill_def_mushroom | 균사 보호막 | guardMult 0.5(50%↓) + ⚡+1 |

### 타입 특기 (유체 · cost2 · grade B) — 5
| 타입 | id | 이름 | 효과 |
|---|---|---|---|
| 목본 | skill_trait_tree | 수피 재생 | heal 0.22 |
| 화초 | skill_trait_flower | 개화 준비 | selfBuff atk 20%/3턴 |
| 다육 | skill_trait_cactus | 수분 저장 | selfBuff def 25%/3턴 + heal 0.10 |
| 덩굴 | skill_trait_vine | 흡수 뿌리 | attack single power120 + lifesteal 0.40 |
| 버섯 | skill_trait_mushroom | 포자 살포 | enemyDebuff atk 18%/2턴 + dot poison 0.05/2턴 |

### 속성 발현 (새싹 · grade C) — 7
| 속성 | id | 이름 | 효과 |
|---|---|---|---|
| 불 | skill_sprout_fire | 불씨 틔우기 | cost2 attack single power120 + dot burn 0.06/2 |
| 물 | skill_sprout_water | 물방울 머금기 | cost2 heal 0.18 |
| 풀 | skill_sprout_grass | 새순 감기 | cost2 selfBuff atk 15%/3 |
| 대지 | skill_sprout_earth | 흙 다지기 | cost2 selfBuff def 20%/3 |
| 바람 | skill_sprout_wind | 산들바람 | cost1 selfBuff spd 25%/3 |
| 번개 | skill_sprout_bolt | 정전기 방출 | cost2 attack single power110 + critBonus 0.20 |
| 빙결 | skill_sprout_ice | 성에 끼우기 | cost2 enemyDebuff spd 25%/2 |

### 속성 심화 (유체) — 기존 `skill_elem_*`(속성기) 재사용. 신규 정의 없음.

## 3) plantKnownSkillIds 재배선
```
known = [ TYPE_BASIC_ATK[type] ]                       // 무료 기본기(skill_basic_strike 대체)
idx>=1 (새싹): + TYPE_BASIC_DEF[type] + ELEMENT_SPROUT[el]
idx>=2 (유체): + TYPE_TRAIT[type]   + skill_elem_[el]
catalog(stageSkills): 단계별 누적 + signatures
legacy 성장체+: idx>=3 rally+eg[1], idx>=4 eg[2], idx>=5 eg[3]   // ELEMENT_GROWTH_SKILLS
+ form/bonus skills (기존 유지)
```
- `battleType(p)` = seedTypeOf 결과를 5타입으로(grass→flower).
- 하드코딩 일반화: `isBasicSkill(id)`, `plantBasicAttackId(p)` 헬퍼 추가 → defaultLoadout/ensureSkillFields의 skill_basic_strike 강제 삽입, skillGradeOf, energyOnEnemySkill(9568) 치환.

## 4) 셀프테스트
- 타입 5종 각각 기본공격/기본방어 id가 ALL_SKILLS에 존재.
- 새싹 단계 식물이 타입기본공/방·속성발현 3종 보유, 유체에서 타입특기+속성기 추가.
- SPECIES에 seedType==='grass'인 종이 없음.
- normalizeState가 seed_type grass→flower 마이그레이션.

## 미적용(후속)
- 성장체/성체/완숙체 스킬의 타입×속성 재설계(이번 범위 아님 — 기존 ELEMENT_GROWTH 유지).
