# 풀로세움 — 전투 메커니즘 정밀 분석 (판정 · 스킬 · 변이 · 봇)

> **목적:** 전투 엔진이 *어떤 순서로, 무엇을 계산하는지*를 코드 기준으로 해부한 문서.
> 스탯표·데미지 공식 요약·티어표는 자매 문서 [`battle-growth-guide.md`](battle-growth-guide.md)(밸런스 시트)와 겹치므로, 여기서는 **진행 순서 · 봇 구성 · 예약된 패시브**에 집중한다.
> 모든 내용은 `index.html`의 함수에서 추출. **기준일: 2026-06-20** · 함수명은 검색해서 바로 찾을 수 있게 그대로 적었다.
>
> 이 문서는 현재 구현(as-is)을 설명한다. §8은 2026-06-20에 반영한 수정 내역이다.

---

## 0. 한눈에 — 전투의 뼈대

```
경기 시작(startMatch)
  └ 플레이어 식물 → makeCombatant → playerC
  └ 상대 봇        → buildEnemy → makeCombatant → enemyC
  └ 시작 패시브(enemySpdDownStart 등) 적용 → VS 인트로

매 턴(playerSkill 1회 = 1턴):
  ① 선공 판정 (기동성)
  ② 선공자 행동 (applySkill)  → 상대 사망 시 즉시 종료
  ③ 후공자 행동 (applySkill)  → 사망 체크
  ④ 상태이상 처리 — 플레이어 먼저(tickStatuses) → 사망 체크
  ⑤ 상태이상 처리 — 상대(tickStatuses)        → 사망 체크
  ⑥ 양쪽 에너지 +1
  ⑦ 에너지 풀충전 시 nextAtk 보너스 예약
```

핵심: **"턴"은 양쪽이 1번씩 행동하는 한 묶음.** 속도가 빨라도 2번 치는 게 아니라 *순서만* 먼저다.

---

## 1. 판정 — 한 턴의 진행 순서 (`playerSkill`)

| 단계 | 처리 | 공식 / 비고 |
|:--:|---|---|
| ① 선공 판정 | 누가 먼저 행동할지 | `선공% = clamp(50 + (내 기동 − 상대 기동), 5, 95)` |
| ② 선공자 행동 | `applySkill` (아래 §2) | 마비(skipNext)면 행동 스킵 |
| ②' 사망 체크 | 상대 HP≤0 → `endMatch` | 즉시 경기 종료 |
| ③ 후공자 행동 | `applySkill` | 선공자가 후공자를 못 죽였을 때만 |
| ③' 사망 체크 | 양쪽 HP 체크 | |
| ④ 상태이상(플레이어) | `tickStatuses(B.p)` | §3 순서대로 |
| ⑤ 상태이상(상대) | `tickStatuses(B.e)` | §3 순서대로 |
| ⑥ 에너지 회복 | 양쪽 `energy = min(energyMax, energy+1)` | 턴당 +1 |
| ⑦ nextAtk 예약 | 에너지가 꽉 차면 `nextAtk = passives.nextAtkBonus` | 현재 패시브 0이라 미발동(§7) |

> **마비(skipNext):** 행동 직전에 체크 → 이번 턴 행동만 날아가고 플래그는 해제.

---

## 2. 판정 — 데미지 파이프라인 (`applySkill`, 순서 중요)

한 번의 스킬 사용은 **정확히 이 순서로** 처리된다. (질문하신 "공격 → 독 → 회복" 의 실제 순서)

### 2-A. 비용·선처리
1. `guard` 해제(이번에 새로 거는 게 아니면)
2. **비용 차감** — 무기 스킬이면 `uses`(횟수) −1, 아니면 `energy −= cost`
3. 방어자 패시브 `energyOnEnemySkill` (적이 기본공격 외 스킬 쓰면 에너지 회복) — *현재 0*
4. `guardMult`(방어 태세) / `energyGain`(충전) / `cleanse`(디버프 해제) / `heal`(회복) / `selfBuff`(자버프) — **위력 계산 전에** 먼저 적용

### 2-B. 명중 → 데미지 (스킬에 `power>0`일 때만)
```
1. 회피 판정
   유효적중 = 적중 + (광역 +10 / 단일 −7) + accBonus
   회피% = clamp(30 + (방어자 기동 − 유효적중), 5, 90)
   → 회피 성공 시 MISS, 여기서 종료

2. normal      = 공격력 × 위력% / 100
3. elementPart = (속성기면) 속성수치 × 상성배율(eff)
4. raw         = normal + elementPart
5. dm = max(1, max(raw×0.25, raw − 방어×(1−pierce)))   ← ★방어 25% 하한선
6. 치명타: 확률 = critRate% + 스킬 critBonus + 패시브 critBonus → 적중 시 dm × critMult(1.5)
7. nextAtk 보너스: dm × (1 + nextAtk)   (있으면, 사용 후 0으로)
8. 방어 태세(guard): dm × guardMult
9. 받는 피해 감소(passives.reduceDmgPct): dm × (1−reduceDmgPct)   ← 현재 0
10. 속성 저항(passives.elementReduce[속성]): dm × (1−저항)        ← 현재 0
11. 난수: dm × rand(0.97~1.03), 정수화
12. 보호막(barrier): 먼저 흡수하고 남은 만큼만 HP 차감
13. HP 차감
14. 치명상 생존(passives.surviveChance): 확률로 HP를 surviveHpAfter%로 생존  ← 현재 0
```

### 2-C. 피해 후처리 (순서대로)
| 순서 | 효과 | 비고 |
|:--:|---|---|
| 15 | **흡혈** | `(스킬 lifesteal + 패시브 lifesteal + 포식 흡혈) × 피해` |
| 16 | **능력치 흡수**(steal) | 적 공/방 일부를 빼앗아 내 것에 더함 |
| 17 | **포식 강탈**(predBoost) | 공격력 강탈 / 에너지 강탈 |
| 18 | **독가시**(poisonCoef) | 카드 효과: 모든 공격에 중독 추가 |
| 19 | **공격 시 적 방깎**(defDownOnHit) | 카드/패시브 |
| 20 | **적 디버프**(enemyDebuff) | 스킬 부가 |
| 21 | **지속피해**(dot) | 중독/출혈/화상 부여 |
| 22 | ~~독초 물약(potion)~~ | 전투 경로에서 제거 완료 — §8 |
| 23 | **반사**(reflectPct) | 받은 피해 일부를 공격자에게 |
| 24 | **반격**(guard.counter) | 방어 태세/방패의 카운터 |

> `power`가 없는 스킬(순수 버프/디버프)은 2-B를 건너뛰고 enemyDebuff·dot만 적용.

---

## 3. 판정 — 상태이상 처리 순서 (`tickStatuses`)

> ⚠️ **회복이 독보다 먼저다.** (질문하신 "독 → 회복"과 실제는 반대)

```
1. 재생(passives.regenPct)        → HP 회복      ★먼저
2. 지속피해(dots) 합산             → HP 차감, 각 dot turns −1, 0 되면 제거
3. 버프/디버프 turns −1, 만료 제거
4. 자연 디버프 해제(cleanseChance) → 확률로 디버프 1개 제거   (현재 0)
5. 포자(spores) 발동              → 마비 / 중독 / 방어버프 (각 확률, 중복 가능)
6. 발광 에너지 회복(energyRegen)   → 엽록체 카드의 턴당 추가 에너지
```

플레이어 tick(④) → 상대 tick(⑤) 순. 각 유닛 안에서는 위 1~6 순서 고정.

---

## 4. 속성 상성 배율 (`eff`, `ELEMENTS[].strong/weak`)

| 상황 | 배율 |
|---|:--:|
| 공격 속성이 상대의 약점 | **1.5×** |
| 상대 속성이 내 약점(역상성) | **0.67×** |
| 그 외 | 1.0× |

약점표: 불←물 / 물←풀·번개·빙결 / 풀←불·바람·빙결 / 대지←풀·물 / 바람←대지 / 번개←대지 / 빙결←불.

> **중요:** 상성배율은 `elementPart`(속성수치 부분)에만 곱해진다. **일반 공격분(normal)에는 상성이 안 붙는다.** 속성수치(elem)가 작으면 상성 체감도 작다.

---

## 5. 스킬 — 종류 · 배정 · 등급

### 5-1. 스킬 풀 (정의 위치)
| 그룹 | 상수 | 특징 |
|---|---|---|
| 공용 | `UNIVERSAL_SKILLS` | 기본공격·방어·광합성·집중·생장가속 |
| 속성기 | `ELEMENT_SKILLS` / `ELEMENT_SKILL_FX` | 속성당 1종, 위력·범위·부가효과 차별화 |
| 잠재특성기 | `TRAIT_SKILLS` (20종) | 생장단계로 해금되는 시그니처기 |
| 변이형기 | `FORM_SKILLS` / `CARD_SKILLS` | 포식·무기·독성 (자동 합류) |

> 스킬 스펙 표는 [`battle-growth-guide.md` §6](battle-growth-guide.md) 참조.

### 5-2. 식물에게 배정되는 경로 (`plantKnownSkillIds`)
생장단계 인덱스(씨앗0 → 완숙체5)로 **순차 해금**:

| 단계 | 추가 해금 |
|---|---|
| 새싹(1) | 방어 태세 + **속성기** |
| 유체(2) | 광합성 · 기력 집중 · 속성 성장스킬① |
| 성장체(3) | 생장 가속 · 속성 성장스킬② |
| 성체(4) | 속성 성장스킬③ |
| 완숙체(5) | 속성 성장스킬④ |

- 속성별 성장스킬 순서: `ELEMENT_GROWTH_SKILLS`.
- 로드아웃 **최대 6칸**(`MAX_LOADOUT`). 변이형 자동 스킬(포식/무기/카드)은 칸을 안 먹고 전투 때 자동 합류(`plantBattleLoadout`).

### 5-3. 스킬 등급 D~S (`ensureSkillFields` → `gradeGrowthSkill`)
- 식물의 **잠재력(potential)** 으로 해금 스킬마다 등급을 1회 결정·저장(`skillGrades`).
- 분포 가중: `POTENTIAL_GRADE_BOOST` = D 0.4 / C 0.8 / B 1.3 / A 1.9 / S 2.8.
- 등급 효과(`GROWTH_GRADE_MULT`): 위력 ×(D 0.85 ~ S 1.42), 힐 보정, **A·S 는 치명타 보너스(+7%/+12%)**, **S 는 공격기에 자버프(공격 12%↑)** 추가.
- 단, **기본공격·무기 스킬은 등급 부여 제외**.

---

## 6. 변이 — 변이형 7종 + 카드 등급별 스펙

### 6-1. 변이형 (`FORMS`, 분화 `rollForm`)
| 변이형 | 분화% | 카드 | 전투 정체성 |
|---|:--:|---|---|
| 🌱 일반 | ~22 | 공통 | 무난 |
| 🦷 포식 | 16 | DNA | 포식 기본기(위력150) + DNA로 흡혈·강탈 강화 |
| 🗡️ 무기 | 16 | 무기 | 에너지 무소모 + 경기당 횟수 제한 강타 |
| ☠️ 독성 | 14 | 물약 | 공격에 독 추가 |
| 🍄 포자 | 14 | 포자 | 매 턴 종료 마비/중독/방해 |
| 💡 발광 | 14 | 엽록체 | 턴당 에너지·체력 회복 |
| 🐉 용족 | 4 | 용DNA | 미구현 |

### 6-2. 카드 등급 (`CARD_GRADE_META`)
| 등급 | 주효과 계수 | 서브 특성 수 | 출현 가중치 |
|:--:|:--:|:--:|:--:|
| S | ×1.90 | 4 | 5 |
| A | ×1.55 | 3 | 11 |
| B | ×1.30 | 2 | 20 |
| C | ×1.00 | 1 | 30 |
| D | ×0.80 | 0 | 34 |

서브 특성 풀(`SUB_FX`): 공+10% / 방+12% / 기동+14% / 체력+10% / 치명+10% / 흡혈+10% / 반사+12% / 재생+4% / 에너지+1 / 적 방깎 12%.

### 6-3. 카드 전체 스펙 (`TRAIT_CARDS`, C등급 기준 주효과)
| 카드 | 형 | C등급 주효과 | 서브풀(앞→뒤) |
|---|---|---|---|
| 🧱 튼튼한 세포벽 | 공통 | 방어 +25% | 체력·방어·재생·반사 |
| 🌵 가시 줄기 | 공통 | 피해 반사 25% | 반사·방어·적방깎·체력 |
| 🩸 진액 흡수 | DNA | 포식 흡혈 +40% | 흡혈·공격·치명·체력 |
| 🔋 엽록체 흡수 | DNA | 포식 에너지강탈 +1 | 에너지·공격·기동·치명 |
| 🧬 미토콘드리아 | DNA | 포식 공격강탈 +22% | 공격·치명·적방깎·흡혈 |
| ⚔️ 검 | 무기 | 검 베기 장착(위력160+치명15%, 4회) | 공격·치명·기동·적방깎 |
| 🛡️ 방패 | 무기 | 방패 방어(피해68%↓+반격, 4회) | 방어·체력·반사·재생 |
| 🪓 도끼 | 무기 | 내려찍기(위력215+방관50%, 3회) | 공격·적방깎·치명·체력 |
| 🔫 총 | 무기 | 총 쏘기(위력150+방관60%, 4회) | 공격·기동·치명·적방깎 |
| 🧪 강산 | 물약 | 강산 뿌리기(위력135+방깎30%+중독) | 적방깎·공격·치명·기동 |
| ☁️ 독성가스 | 물약 | 가스 유출(위력60+공깎28%+중독) | 적방깎·기동·공격·체력 |
| 🌿 독가시 | 물약 | 모든 공격에 독 추가(계수0.08) | 공격·치명·흡혈·적방깎 |
| 💤 마비 포자 | 포자 | 매 턴 30% 마비 | 기동·방어·체력·재생 |
| 🟣 중독 포자 | 포자 | 매 턴 40% 중독(6%) | 공격·체력·재생·적방깎 |
| 🌀 방해 포자 | 포자 | 매 턴 38% 방어버프(22%) | 방어·체력·재생·반사 |
| 🍃 엽록체 증가 | 엽록체 | 턴당 에너지 +1 | 에너지·재생·기동·체력 |
| 🌞 광합성 세포 | 엽록체 | 매 턴 체력 +7% | 재생·체력·방어·흡혈 |

- 무기/물약 카드의 스킬 위력·횟수는 등급으로 스케일(`gradeCardSkill`).
- 보유 키는 `"카드ID@등급"`(인스턴스). 효과 집계는 `cardEffects` → `makeCombatant`.

---

## 7. 전투 봇 (상대) 정밀 분석

### 7-1. 생성 (`buildEnemy`)
- **봇은 매 경기 새로 생성**되며 플레이어 스탯을 참조하지 않는다.
- 기준 스탯(`ENEMY_REF_BASE`)에 생장단계·티어·라운드 배율과 소폭 난수를 적용한다.
  `스케일 = 생장단계배율 × (1 + 티어×0.15) × (1 + 라운드×0.06)`
- 종(species)은 랜덤, 속성 = 종 고정속성, 외형도 플레이어와 같은 생성기.
- 생장단계: 라운드별 고정 `ENEMY_STAGE_BY_ROUND` = 유체→성장체→성장체→성체→완숙체.
- 변이형 확률은 `15% + 라운드×6% + 티어×4%`. 발동 시 포식·독성·포자·발광·무기형 중 하나를 사용한다.

### 7-2. 봇 스펙
| 항목 | 값 |
|---|---|
| HP/공/방/기동/속성 | `ENEMY_REF_BASE × 스케일 × rand(0.95~1.08)` |
| 적중 | `86 + 티어×1.5 + 라운드`, 60~99 |
| 치명률 | `5 + 티어×3 + 라운드×2` (최대 60) |
| 에너지max | 3 (다이아 이상 4) |
| 기대 등급 | 브론즈 C → 풀로세움 S (`ENEMY_TIER_GRADE`) |
| critMult | 1.5 고정 |

### 7-3. 봇 스킬 / AI
- 기본 로드아웃은 `기본공격 + 속성기 + 방어 태세 + 광합성`. 라운드·티어가 오르면 속성 성장스킬을 추가해 최대 6개를 구성한다.
- 기본공격 외 스킬에는 티어 기대 등급을 기준으로 실제 `skillGrades`를 부여한다.
- 실버 이상은 공통 카드 1장, 변이형 봇은 해당 변이 카드 1장을 추가한다. 카드 등급도 티어 기대 등급에 따라 추첨한다.
- 카드가 주는 포식·무기·독성·포자·발광 효과와 자동 스킬은 플레이어와 같은 `cardEffects`/`makeCombatant` 경로를 사용한다.
- AI 우선순위(`aiPickSkill`): HP<32% & 힐 보유 → 60% 힐 / 드레인 50% / 최고위력기 72% / 가드 18% / 나머지 랜덤.

### 7-4. 성장 체감 설계
같은 티어·라운드의 봇 기준치는 고정이다. 식물이 성장하거나 강화되면 같은 상대를 더 쉽게 이기고, 승급하면 더 높은 절대 스탯과 등급의 봇을 만난다. `ENEMY_REF_BASE`와 티어·라운드 계수는 플레이테스트로 조정한다.

---

## 8. 2026-06-20 반영 내역

| 항목 | 반영 결과 |
|---|---|
| 에너지 상한 | 포식 강탈·발광 회복 모두 하드코딩 5 대신 각 유닛의 `energyMax` 사용 |
| 속성기 | 불=화상, 물=자힐, 풀=흡혈, 대지=방어무시, 바람=단일+자가속, 번개=치명타, 빙결=적 둔화 |
| 봇 스탯 | 플레이어 비례 스케일 제거, 티어+라운드+생장단계 절대값으로 전환 |
| 봇 성장 | 속성 성장스킬·실제 스킬 등급·변이형별 카드를 부여 |
| 독초 물약 | `makeCombatant`·`startMatch`·`applySkill`의 폐기된 전투 경로 제거 |
| 전투 UI | 손가락 인트로 제거, 중앙 카드, 턴·카드/기록 전환, 닉네임 표시, 기동성·방어·최종 피해·후속효과 요약 판정 창을 구현 |

봇 밸런스 기준치는 `ENEMY_REF_BASE`, 티어 기대 등급은 `ENEMY_TIER_GRADE`, 속성기 차이는 `ELEMENT_SKILL_FX`에서 조정한다.

---

## 9. 잠재특성용 예약 패시브 (`plantPassives`)

### 9-1. 무슨 일이 일어나는가
`plantPassives(traitIds)`는 현재 인자를 적용하지 않고 전부 0인 객체를 반환한다. 잠재특성은 향후 생장 단계에서 발현할 패시브 분류로 보존하며, **현재 전투에는 의도적으로 반영하지 않는다.**

```js
function plantPassives(traitIds){
  const P = { hpPct:0, atkPct:0, … elementReduce:{} };
  return P;   // ← traitIds를 전혀 안 본다
}
```

### 9-2. 이 P 객체가 *원래* 채워야 할 패시브들 (전투에서 실제로 읽는 곳)
| 패시브 필드 | 의미 | 소비 위치 | 현재 |
|---|---|---|:--:|
| `hpPct/atkPct/defPct/spdPct/accPct` | 스탯 % 증가 | `makeCombatant` 스탯 스케일 | 0 |
| `energyBonus` | 최대 에너지 +N | `makeCombatant` energyMax | 0 |
| `regenPct` | 매 턴 HP 재생 | `tickStatuses` 1단계 | 0 |
| `reduceDmgPct` | 받는 피해 감소 | `applySkill` 9단계 | 0 |
| `lifestealPct` | 흡혈 | `applySkill` 흡혈 | 0 |
| `reflectPct` | 피해 반사 | `applySkill` 반사 | 0 |
| `critBonus` | 치명타율 가산 | `applySkill` 치명 | 0 |
| `barrierPct` | 시작 보호막 | `makeCombatant` barrier | 0 |
| `enemySpdDownStart` | 개전 시 적 둔화 | `startMatch` | 0 |
| `energyOnEnemySkill` | 적 스킬 시 에너지 회복 | `applySkill` 선처리 | 0 |
| `cleanseChance` | 매 턴 디버프 자연해제 | `tickStatuses` 4단계 | 0 |
| `nextAtkBonus` | 에너지 풀충전 시 다음 공격 증폭 | `playerSkill` ⑦ | 0 |
| `surviveChance`/`surviveHpAfter` | 치명상 생존 | `applySkill` 14단계 | 0 |
| `defDownOnHit` | 공격 시 적 방깎 | `applySkill` 19단계 | 0 |
| `elementReduce{속성}` | 속성별 피해 저항 | `applySkill` 10단계 | 0 |

### 9-3. 현재 동작
- 위 패시브 중 **카드(변이)가 채워주는 일부**(regen/reflect/crit/lifesteal/defDownOnHit/energyBonus/스탯%)만 `makeCombatant`에서 `cardEffects`로 합산돼 실제로 작동한다.
- **나머지**(reduceDmgPct·barrierPct·enemySpdDownStart·energyOnEnemySkill·cleanseChance·nextAtkBonus·surviveChance·elementReduce)는 향후 잠재특성 발현을 위해 소비 코드만 준비된 상태다.
- 20종 잠재특성은 현재 **시그니처 스킬(`TRAIT_SKILLS`) 해금 분류**로 사용하며 별도 패시브는 부여하지 않는다.

### 9-4. 향후 활성화하려면
`plantPassives`에서 `traitIds`를 순회하며 각 특성의 패시브를 P에 누적하도록 구현 + 식물에 실제 `traits`(잠재특성)를 부여하는 경로 연결. → 별도 설계 문서 [`trait-growth-roadmap.md`](trait-growth-roadmap.md) 와 연동.

---

## 10. 빠른 참조 — 함수 위치 (index.html)
| 무엇 | 함수/상수 |
|---|---|
| 턴 진행 | `playerSkill` |
| 데미지 1회 | `applySkill` |
| 상태이상 | `tickStatuses` |
| 전투원 생성 | `makeCombatant` |
| 봇 생성 | `buildEnemy` |
| 봇 AI | `aiPickSkill` |
| 경기 시작/종료 | `startMatch` / `endMatch` |
| 상성 | `eff` / `ELEMENTS` |
| 스킬 정의 | `UNIVERSAL_SKILLS`·`ELEMENT_SKILLS`·`TRAIT_SKILLS`·`CARD_SKILLS` |
| 스킬 등급 | `gradeGrowthSkill`·`gradeCardSkill`·`ensureSkillFields` |
| 변이형/카드 | `FORMS`·`TRAIT_CARDS`·`CARD_GRADE_META`·`cardEffects` |
| 패시브(죽음) | `plantPassives` |
| 티어/라운드 | `RANK_TIERS`·`TOURNAMENT_ROUNDS` |
