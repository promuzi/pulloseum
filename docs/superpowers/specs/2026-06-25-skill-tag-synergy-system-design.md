# 스킬 태그 & 태그 시너지 시스템 설계 (2026-06-25)

> 상태: **1단계(토대) 구현 완료(2026-06-25, 브랜치 `feat/skill-tag-synergy`)** · 2·3단계 대기. 다른 기기에서 이 문서를 진입점으로 이어서 구현.
> 브레인스토밍 합의(2026-06-25). 접근 = **A: 전체 아키텍처를 한 번에 설계 + 구현은 3단계로 분할**(단일 `index.html`·테스트러너 없는 환경의 회귀 위험 분산).
> ⚠️ 이 문서는 **구현 시 단일 진실(SSOT)**. 코드와 어긋나면 코드를 고치거나 이 문서를 갱신해 항상 일치시킬 것. 함수명·필드명·통합 라인은 실제 코드(2026-06-25 기준 `index.html`)에서 검증됨.

---

## 1. 목적 / 그림

스킬마다 **여러 축의 "태그"** 를 붙이고, 그 태그를 겨냥한 **시너지 보정**(강화/할인/콤보/구성보너스)을 **카드·스킬·특성**으로 푼다. 목표 = 스킬 다양성 + 덱/조합 빌딩.

예시:
- 🔥 "화염핵" 카드 장착 → **불 태그** 스킬 위력 +20% (경기 내내)
- "불꽃 고양" 스킬 시전 → **3턴간** 불 태그 스킬 위력 +30%
- → 둘 다면 불 스킬 ×1.5, 물 스킬엔 무영향
- "무기 강화" → **무기 태그** 스킬↑ · "무속성 강화" → **무속성 태그** 스킬↑

핵심 통찰(브레인스토밍에서 확정): 이 게임엔 이미 **두 층**이 있다 — ① 전투시작 고정값(`makeCombatant`: 스탯+패시브+카드효과), ② 전투중 임시 버프(`a.buffs`+턴, `tickStatuses` 감소, `effStat`로 합산). **둘 다 "전체 스탯(공/방/속)"만** 바꾼다. 지금 **빠진 것 = "특정 태그 스킬만" 골라 바꾸는 층**. 그게 이 시스템이다. 출처는 두 층 어디서 와도 같은 풀에 합산된다.

---

## 2. 태그 분류 체계 (5축, 확정)

태그는 **네임스페이스 접두사**로 축을 구분(`elem:fire`가 `cat:` 등과 충돌하지 않게). 한 스킬은 여러 태그를 동시에 가짐.

| 축 | 태그 예 | 출처(도출) |
|---|---|---|
| **분류(cats)** | `cat:attack` `cat:guard` `cat:buff` `cat:debuff` `cat:heal_hp` `cat:heal_energy` | 기존 `skillCats(sk)` 재사용 |
| **속성(element)** | `elem:fire` `elem:water` `elem:grass` `elem:bolt` `elem:earth` `elem:ice` `elem:wind` / **`elem:none`(무속성)** | `s.elem`(불리언)이면 `unit.element`, 아니면 `none` |
| **변이형(variant)** | `var:weapon` `var:pred` `var:toxic` `var:dragon` `var:spore` `var:normal` | 스킬에 명시한 `s.variant`, 없으면 `normal` |
| **사거리/대상(target)** | `tgt:single` `tgt:aoe` | `s.single`/`s.aoe` (둘 다 아니면 무태그) |
| **상태이상(dot)** | `dot:poison` `dot:burn` `dot:bleed` | `s.dot.kind` 또는 `s.infuse.kind` |

> ⚠️ 비용대 태그는 **범위 밖**(사용자 결정).
> ⚠️ **속성 태그 주의**: 이 게임에서 `s.elem`은 "자기 속성 발현" 불리언이고 실제 속성은 `unit.element`(식물 속성)다(`eff(a.element,d.element)`로 상성 계산). 따라서 같은 "화염구" 스킬도 불 식물이 쓰면 `elem:fire`, 물 식물이 쓰면 `elem:water`. **태그는 (스킬, 유닛) 쌍에서 도출**해야 정확하다 → `skillTags(skill, unit)` 시그니처 필수.
> ⚠️ **변이형 태그**: 변이 스킬(`variantSkillsOf`가 반환하는 `skill_card_*`)은 현재 `tag`(한글: '포식'/'무기'/'용족'/'독성') 필드만 가짐. 태그용으로 **각 변이 스킬 정의에 영어 키 `variant` 필드 추가**(`skill_card_predation.variant='pred'` 등). 일반 스킬은 미지정 → `var:normal`.

---

## 3. 핵심 엔진

### 3.1 `skillTags(skill, unit)` — 통합 태그 도출 (신규)

```js
function skillTags(s, unit){
  const t = new Set();
  if(!s) return t;
  (skillCats(s)||[]).forEach(c => t.add('cat:'+c));               // 분류
  if(s.elem && unit && unit.element) t.add('elem:'+unit.element); // 속성(유닛 속성)
  else t.add('elem:none');                                        // 무속성
  t.add('var:' + (s.variant || 'normal'));                        // 변이형
  if(s.aoe) t.add('tgt:aoe'); if(s.single) t.add('tgt:single');   // 대상
  const dk = (s.dot && s.dot.kind) || (s.infuse && s.infuse.kind);
  if(dk) t.add('dot:'+dk);                                        // 상태이상
  return t;
}
```
- `unit` 없으면(도감 등) 속성은 `none`로 폴백(또는 `s.elem`만으로 "유속성"이라고만 표기). 표시용은 유닛 없이도 호출되므로 방어적으로.

### 3.2 태그 보정 모델

보정 1개 = `{ tag, type, value }`. `type` 종류:

| type | 의미 | 적용 지점 |
|---|---|---|
| `power` | 위력 +value (예 0.2 = +20%) | `applySkill` 데미지 계산 |
| `effect` | 부가효과 배율(독·디버프·회복·버프 수치) +value | 부가효과 산출부 (2단계) |
| `cost` | 에너지 비용 +value (음수=할인) | 비용 차감·사용가능 판정·카드 표시 |
| `combo` | 콤보 점화(태그A 쓰면 다음 태그B 강화) | 상태 기반 (2단계) |

조건부(구성보너스)는 별도 `compose` 규칙으로 **전투시작에 평가**(§3.5).

### 3.3 보정 합산 — `tagModSum(unit, skill, type)` (신규)

지속(`unit.tagMods`) + 임시(`unit.buffs` 중 `kind:'tagmod'`)를 **같은 풀로 합산**:
```js
function tagModSum(unit, s, type){
  if(!unit) return 0;
  const tags = skillTags(s, unit);
  let sum = 0;
  (unit.tagMods||[]).forEach(m => { if(m.type===type && tags.has(m.tag)) sum += m.value; });
  (unit.buffs||[]).forEach(b => { if(b.kind==='tagmod' && b.type===type && tags.has(b.tag)) sum += b.value; });
  return sum;
}
```
> ✅ **안전성 검증됨**: `effStat(u,stat)`는 `b.stat`만 읽으므로 `kind:'tagmod'`(stat 없음) 버프는 **스탯 계산에서 자동 무시**된다. `tickStatuses`는 모든 버프의 `b.turns--` 후 만료 필터 → tagmod 임시 버프도 **자동 만료**. 즉 임시 출처는 기존 버프 인프라를 그대로 탄다.

### 3.4 출처 — 두 층, 같은 풀에 합산

**① 지속형(카드/특성)** — `TRAIT_CARDS[id].base.tagMods = [{tag,type,value}, ...]`.
- `cardInstanceEffects(key)`: `out.tagMods=[]` 추가. `base.tagMods`가 있으면 `value`를 **등급 계수 `m`로 스케일**(상위 등급=강함, 타 효과와 일관) 후 push. `fixed:true` 카드는 `m=1`.
- `cardEffects(cardKeys)`: `E.tagMods` 추가(각 카드 `ie.tagMods` concat).
- `makeCombatant(src)`: `unit.tagMods = CE.tagMods.slice()`. (`CE = cardEffects(src.cards)` 이미 호출됨 — 라인 10700.)

**② 발동형(전투중 스킬)** — 스킬에 `s.tagBuff = {tag, type, value, turns}`.
- `applySkill`에서 `selfBuff`와 같은 위치에 처리: `if(s.tagBuff){ a.buffs.push({kind:'tagmod', tag:s.tagBuff.tag, type:s.tagBuff.type, value:s.tagBuff.value, turns:s.tagBuff.turns}); spriteFx(side,'buff'); fxPopup(side,'🔺 강화','buf'); }`. (복수 태그 버프가 필요하면 `tagBuffs:[]` 배열도 허용.)

### 3.5 조건부/구성 보너스 — `compose` (전투시작 평가, 2단계)

`makeCombatant`에서 로드아웃 스킬을 `skillTags`로 집계 → 태그별 개수. 카드/특성이 선언한 `compose` 규칙 적용:
```
compose: { ifTag:'cat:debuff', count:2, grant:{tag:'dot:poison', type:'effect', value:0.5} }
// 디버프 태그 스킬 2개 이상이면 → 중독 효과 +50% 보정을 unit.tagMods에 추가
```
- 평가 위치: `makeCombatant` 말미(`unit.loadout` 확정 후). 결과는 지속 `unit.tagMods`로 합류.

### 3.6 콤보 — `combo` (2단계)

"태그A 스킬을 쓰면 **다음** 태그B 스킬 +X". 상태 `unit.comboPrimed` 사용:
- `applySkill` 시작부: 현 스킬 태그가 점화된 `toTag`를 포함하면 해당 보정을 이번에 적용 후 `unit.comboPrimed=null`.
- `applySkill` 말미: 현 스킬 태그가 어떤 콤보 규칙의 `fromTag`면 `unit.comboPrimed = {toTag, type, value}` 설정.
- 콤보 규칙 출처 = 카드 `base.combo` 또는 스킬 `s.combo`. 1턴/1회성. 턴 종료 시 만료 정책은 구현 시 확정(기본=다음 자기 행동까지 유지).

---

## 4. 적용 지점 (정확한 통합 라인)

| 효과 | 통합 위치 | 방법 |
|---|---|---|
| `power` | `applySkill` 데미지식 (`dm` 산출 직후, variance 전) | `dm *= (1 + tagModSum(a, s, 'power'))` + modLine 1줄 |
| `cost` 차감 | `applySkill` 에너지 차감부 (`a.energy -= s.cost`) | `effectiveCost(a, s)` 사용 |
| `cost` 사용판정 | `skillUnusable(unit, id)` | `unit.energy < effectiveCost(unit, s)` |
| `cost` 표시 | `moveCostLabel(s, unit)` / 카드 앞면 | 할인 반영된 비용 표기(원가 취소선은 선택) |
| `effect`(2단계) | dot/enemyDebuff/heal/selfBuff 수치 산출부 | 각 수치 `* (1 + tagModSum(a,s,'effect'))` |
| `combo`(2단계) | `applySkill` 시작/말미 | `unit.comboPrimed` 점화/소비 |

신규 헬퍼 `effectiveCost(unit, s)`:
```js
function effectiveCost(unit, s){
  if(!s || s.noEnergy) return 0;
  return Math.max(0, (s.cost||0) + Math.round(tagModSum(unit, s, 'cost')));
}
```
> ⚠️ `noEnergy`(무기 변이 = 횟수제) 스킬은 비용 할인 대상 외. `moveCostLabel`은 `noEnergy`면 `🔁N회`를 그대로.

---

## 5. UI 표시

- **카드 앞면**: 현행 유지 — 분류 칩(cat)만(이미 구현 `skillCardHtml`+`sc-chips`). 과밀 방지.
- **뒷장 상세(`showSkillDetail`)**: 전체 태그를 pill로 노출(속성/변이형/대상/상태이상). 기존 등급·분류 pill 줄에 합류.
- **활성 보정 표시(2/3단계)**: 켜진 태그 보정이 있으면 해당 카드에 작은 ↑ 글로우 또는 상단 띠. v1은 생략 가능(데미지 숫자·판정으로 체감).
- 신규 `TAG_META`(축별 표시 이름/아이콘/색) — pill 렌더용. 속성은 기존 `ELEMENTS`, 분류는 `CAT_META` 재사용, 변이형은 `FORMS`(아이콘/이름) 재사용, 대상/상태이상만 신규 라벨.

---

## 6. 단계별 구현 계획

### 🪨 1단계 — 토대(전체의 ~60%) ✅ **완료(2026-06-25)**
> 구현 메모: 비용 보정 `value`도 등급 m로 스케일(설계대로). 예시 비용할인 카드 `card_overclock`은 `fixed:true`로 평탄 −1 적용. `card_firecore`는 등급 스케일 power 카드. 변이 5종에 `variant` 추가(무기 grantSkill 4종은 var:weapon 미부착 — 겨냥 카드 없을 때까지 보류). `applySkill` power 보정은 원소저항 직후·variance 직전에 삽입. `showSkillDetail`에 변이형·대상 pill 추가. 셀프테스트 10종(설계 §7) 등록.
- `skillTags(skill, unit)` + `TAG_META`(표시 최소) + `tagModSum` + `effectiveCost`.
- 효과 **2종(`power`, `cost`)** + 출처 **둘 다**(카드 `base.tagMods`, 스킬 `s.tagBuff`).
- 통합: `cardInstanceEffects`/`cardEffects`/`makeCombatant`(tagMods 주입), `applySkill`(power·cost), `skillUnusable`/`moveCostLabel`(cost).
- 변이 스킬 5종에 `variant` 필드 추가.
- **예시 콘텐츠 최소**: 카드 1(예 화염핵: `tagMods:[{tag:'elem:fire',type:'power',value:0.2}]`) + 스킬 1(예 불꽃 고양: `tagBuff:{tag:'elem:fire',type:'power',value:0.3,turns:3}`) + 비용할인 카드 1.
- **셀프테스트**(§7).

### 🧱 2단계 — 효과 4종 완성(엔진 공유, 얇음)
- `effect`(부가효과 배율) · `combo`(점화/소비) · `compose`(구성보너스, 전투시작).
- `aiPickSkill`이 할인/강화된 스킬을 선호하도록(선택) 가치 평가 보강.

### 🎴 3단계 — 콘텐츠 & 폴리시(열린 작업)
- 태그 축별 실제 카드/스킬(불 강화·무기 강화·무속성 강화·중독 특화 등) + **보급상자 드롭 풀(`box_card_*`) 등록**(⚠️ 정의만으론 획득 불가 — CLAUDE.md 규약).
- 뒷장 태그 pill·활성 보정 표시 UI.
- 밸런스 튜닝.

각 단계 종료 시 `__catalogSelfTest()` **0 fail** + preview 검증. 단계 경계에서 멈춰도 게임은 안 깨짐.

---

## 7. 회귀 검증 (`window.__test`)

1단계 셀프테스트(throw 패턴 `if(fails.length) throw new Error(...)`):
- **태그 도출**: 불 식물의 `s.elem` 스킬 → `elem:fire`; 비속성 스킬 → `elem:none`; 공격+중독 스킬 → `cat:attack`·`cat:debuff`·`dot:poison` 포함.
- **합산**: 지속 `tagMods` + 임시 `tagmod` 버프가 같은 태그면 **더해짐**; 다른 태그면 **0**.
- **power**: 일치 태그 스킬만 데미지 증가, 불일치 스킬 불변(순수 함수로 `tagModSum` 검사).
- **cost**: `effectiveCost`가 음수 보정 시 **0 하한**; `noEnergy` 스킬은 불변.
- **버프 무해성**: `kind:'tagmod'` 버프가 `effStat`(공/방/속)에 **영향 0**(회귀: 기존 스탯 계산 불변).

preview 수동: 카드 장착 → 불 스킬 데미지↑·물 스킬 동일 / 발동 스킬 시전 → 3턴 합산·만료 후 원복 / 비용 할인 카드 → 카드 표시·실차감·사용판정 일치.

---

## 8. 범위 밖 (YAGNI)

- 비용대 태그.
- 적(봇)에게도 같은 태그 시너지 부여(1·2단계는 플레이어 중심; 봇 보강은 3단계 선택).
- 태그 기반 도감 필터/검색.
- 활성 보정의 화려한 VFX(데미지 숫자로 충분, 3단계 선택).

---

## 9. 통합 함수/필드 요약 (구현 체크리스트)

**신규:** `skillTags(s,unit)` · `tagModSum(unit,s,type)` · `effectiveCost(unit,s)` · `TAG_META` · (2단계) compose/combo 평가.
**수정:** `cardInstanceEffects`(+`out.tagMods`) · `cardEffects`(+`E.tagMods`) · `makeCombatant`(+`unit.tagMods`·`unit.comboPrimed`) · `applySkill`(power·cost·tagBuff·combo) · `skillUnusable`·`moveCostLabel`(cost) · 변이 스킬 5종(+`variant`) · `showSkillDetail`(태그 pill).
**데이터 스키마 추가:** `TRAIT_CARDS[id].base.tagMods`·`.base.compose`·`.base.combo` / 스킬 `s.tagBuff`·`s.combo`·`s.variant`.
**불변(재사용):** `skillCats`·`CAT_META`·`ELEMENTS`·`FORMS`·`effStat`·`tickStatuses`(버프 인프라)·`a.buffs`.
