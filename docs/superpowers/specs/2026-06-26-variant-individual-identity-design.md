# 변이 개체 정체성 시스템 (아키타입 축) — 설계

> 2026-06-26 · 짧은 설계(사용자 요청). 개체별 개성은 **데이터로 두고 나중에 수정** 가능하게 하는 게 핵심.

## 배경 / 문제
같은 타입+속성이라도 변이형(form)이 다르면 별개 개체(예: 화초·불의 포식 `flame_trap` / 무기 `blaze_lance`). 하지만 현재:
- **스펙(스탯)**: 같은 타입+속성이면 form 무관하게 동일 → 차별화 0.
- **성향 컨셉**: 변이 140종은 도감 `CONCEPTS` 미등록 → 제네릭 폴백.
- **고유 스킬**: 개체별 3개(`ind.<key>.g/.m/.e`) 존재하나 form 기준이라 획일적.
- (발견 지역은 `MUTANT_SIGNATURES`로 이미 개체별 배정됨 — 범위 밖.)

## 핵심 아이디어: 축을 하나 더 — **아키타입(개체 정체성)**
```
개체 = 타입 × 속성 × 변이형(form) × 아키타입(personality)
```
- **form** = 메커니즘 레인. 주요 전투 스킬은 변이 카드로 분류(기존 유지).
- **아키타입** = 성격/정체성. **form과 독립.** 같은 무기형이라도 `광폭`이면 난폭, `도사`면 집중·일격. → **고유 스킬의 이름·느낌·DoT 종류**와 **컨셉 서술**과 **스탯 보정**을 결정.

→ 손으로 140개 안 만들고 `(아키타입 × form × 속성)` 조합으로 다양성 확보. 사용자가 **개체별로 나중에 수정**.

## 데이터 구조 (편집 용이성이 1순위)
1. `ARCHETYPES` — 아키타입 사전(많이, ~14종). 각 항목:
   `{ name, tone:[키워드…], statMod:{hp,atk,def,spd}, dot, skillVerb:[…] }`
   예: `berserk`(광폭) `{statMod:{atk:+, def:-}, dot:'bleed', skillVerb:['물어뜯기','난폭한…']}`,
   `sage`(도사) `{statMod:balanced, skillVerb:['집중','일격','기 모으기']}`.
2. `ARCHETYPE_OVERRIDES` — `{ speciesKey: archetypeId }`. **사용자 편집 표면.** 비어 있으면 기본 배정 사용.
3. `archetypeOf(key)` = `ARCHETYPE_OVERRIDES[key] || deterministicArchetype(key)`.
   - `deterministicArchetype`: key 문자열 해시 → `ARCHETYPES` 인덱스. 140개를 안정적·다양하게 분산(같은 form이라도 제각각). 나중에 override로 큐레이션.

## 적용 지점 (3곳)
- **스펙**: `SPECIES` 빌드 시 `base = base(type+element) + formStatMod(form) + archetypeStatMod(archetype)`. (변이종은 `stats` 미지정 → 이 경로로 들어옴. base 35·legacy는 미적용.)
- **컨셉**: `buildConcept(species, form, archetype)` → 한 줄 서술 생성 → `SPECIES[key].desc`에 주입. 도감은 `CONCEPTS[key] || sp.desc`라 **자동 반영**(게임이 단일 진실).
- **고유 스킬 리테마**: init 후 각 변이 개체의 `ind.<key>.g/.m/.e`(각 개체 전용 id) 를 아키타입 기준으로 **이름 교체 + DoT 종류 정렬**(예: 광폭→burn을 bleed로, 이름 "물어뜯기"). 효과 위력/구조는 기존 밸런스 유지(이름·flavor·DoT종류 중심). 멱등.

## 범위
- ✅ 성향 컨셉(아키타입 정의 + 배정 + 컨셉문 + 고유 스킬 정체성 리테마)
- ✅ 스펙(form + 아키타입 스탯 보정)
- ❌ 스킬트리 확장(새싹/유체) — 제외(확정).
- 🔜 외형 — 나중에. 사용자가 도트 PNG 직접 제공 예정 → 스프라이트 오버라이드 훅만 자리 확보, 절차적은 폴백. **지금 범위 밖.**

## 검증
- `__catalogSelfTest()`에 케이스 추가: 같은 타입+속성·다른 form 두 개체의 ① 스탯이 달라짐 ② desc(컨셉)이 달라짐 ③ 고유 스킬 이름이 아키타입 반영. override가 deterministic을 덮어쓰는지.
- 도감 preview 실측: 변이 카드의 desc/스탯이 개체마다 다르게 렌더.

## 비고
- 모든 개성은 `ARCHETYPES` + `ARCHETYPE_OVERRIDES` 두 데이터에 모임 → 사용자가 한 곳에서 수정.
- 밸런스 1차는 거칠게, 이후 반복 튜닝(사용자 큐레이션).
