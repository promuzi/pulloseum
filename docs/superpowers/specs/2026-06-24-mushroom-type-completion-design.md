# 버섯 타입 완성 — 설계서

> 상태: **설계 확정(2026-06-24)** · 다음 단계 = 구현 계획서(writing-plans)
> 관련 허브: [master-roadmap](../../master-roadmap.md) · 종 시스템: [species-system-guide](../../species-system-guide.md)
> 선행 결정: 타입 5종 확정(목본/화초/다육/덩굴/버섯), 버섯 = 저스탯+포자 기본+희귀(2026-06-24 개편)

## 1. 목표 / 범위

버섯 타입은 골격(스탯·타입스킬·도감 아이콘·포자 변이형·셀프테스트)만 깔려 있고 **실제 종은 스포어캡(풀) 1개뿐**이며, **전용 외형이 없어 나무로 렌더된다**. 이번 작업으로 버섯을 4축에서 완성한다:

1. **종 추가** — 7속성 풀그리드(스포어캡 유지 + 6속성 신규 = 총 7종)
2. **전용 외형** — `composePlantBody`에 `mushroom` case 신설(클래식 독버섯, 6단계 절차적 성장). 나무 폴백 버그 제거.
3. **전용 스킬** — 종별 시그니처 1종씩(신규 6종을 `SKILL_LIB`에 추가)
4. **도감/탐사 연동 점검** — 버섯이 탐사 드롭·도감에 실제로 노출되는지 확인·보정

추가로 **타입별 생장 단계명**(5타입 전체) 기능을 함께 구현한다(아래 §3). 과거 구두로만 정하고 코드·문서에 반영되지 않았던 항목.

**비범위(이번엔 구현 안 함, 기록만):** B(군락 클러스터)·C(발광) 외형 변이 → §6.

## 2. 외형 — `mushroom` case 신설

`composePlantBody(seedType, gi, P, el)` (index.html ~7809)에 버섯 분기 추가. 현재 `else`가 tree로 빠지는 폴백 제거(명시적 mushroom 분기).

**A 클래식 독버섯 — 6단계 절차적 성장:**
- **gi0 (포자/씨앗):** 기존 공통 씨앗 로직 유지(변경 없음).
- **gi1~2 (균사·버섯눈):** 짧고 통통한 자루 + 작고 둥근 갓 봉오리. **버섯은 떡잎(gi≤2 떡잎 블록)을 생략**(어색) — mushroom 분기는 떡잎을 그리지 않는다.
- **gi3~4 (어린갓·성숙버섯):** 자루 길어지고 갓이 활짝 펴짐 + 점박이(spots) + 고리(annulus).
- **gi5 (포자갓/완숙체):** 갓 최대 + 떠오르는 포자 입자 + 기존 완숙 오라/✦(상위 `composePlantSvg`가 처리).
- 색은 `elementPalette(el)`(P.main/dark/light/accent/stem) 그대로 → 속성색 자동. 갓 위에 `elementMotif(el, gi, ...)` 얹음.

**확장 훅:** 종 데이터에 선택 필드 **`bodyStyle`**(기본 `'classic'`)를 도입. `composePlantBody`/`composePlantSvg` 경로에서 이 값으로 분기할 수 있게 배선만 해 둔다(현재는 `'classic'`만 구현). 향후 `'cluster'`(B)·`'glow'`(C)를 값만 추가하면 붙도록.

**참고:** 종 가이드 §5 실루엣 표에 버섯 행 추가(현재 누락).

## 3. 타입별 생장 단계명 (5타입 전체)

컨셉·흐름(6단계 순서 `GROWTH_STAGE_ORDER`)은 그대로, **표시 이름만 타입별로** 분기.

**기술 설계:**
- 새 상수 `STAGE_NAMES_BY_TYPE[seedType] = [6단계 이름]`(또는 `{stageId: 이름}`) 추가.
- `growthStageName(stage, seedType)` 시그니처 확장: `seedType` 있고 매핑 있으면 타입별 이름, 없으면 기존 전역 `GROWTH_STAGE_NAMES` 폴백(하위호환 — `seedType` 없는 호출부는 전역 그대로).
- 호출부에 식물의 `seed_type`(또는 종→타입 파생값)을 넘긴다. 식물 컨텍스트가 없는 호출부(예: 초기 단계 안내문)는 인자 생략 → 전역 폴백.

**확정 이름표:**

| 단계 | 🌳목본 tree | 🌸화초 flower | 🌵다육 cactus | 🍃덩굴 vine | 🍄버섯 mushroom |
|---|---|---|---|---|---|
| seed | 씨앗 | 씨앗 | 씨앗 | 씨앗 | 포자 |
| sprout | 떡잎 | 새싹 | 움 | 새순 | 균사 |
| juvenile | 묘목 | 새잎 | 어린기둥 | 어린덩굴 | 버섯눈 |
| growing | 어린나무 | 꽃봉오리 | 가시몸 | 덩굴손 | 어린갓 |
| mature | 성목 | 개화 | 성체선인장 | 성체덩굴 | 성숙버섯 |
| evolved | 거목 | 만개 | 꽃선인장 | 만연덩굴 | 포자갓 |

> 이름은 데이터로만 존재 → 추후 칸 단위 수정 용이. (작명 근거: 버섯은 실제 생활사 포자→균사→버튼(버섯눈)→갓에서 차용. 나머지는 컨셉 합성어.)

## 4. 종 7개 (속성 × 버섯)

`SPECIES_CATALOG`에 등록. 스탯은 `TYPE_STATS.mushroom + ELEMENT_STATS`로 빌더가 자동 계산(명시 `stats` 불필요). 전부 **rarity:'rare'**, **`baseVariants:['spore']`, `variantSlots:{spore:2, normal:4}`**(스포어캡과 동일 패턴).

| 속성 | key | 이름(초안) | HP/공/방/기동 | 시그니처 키 |
|---|---|---|---|---|
| 🌿풀 | `spore_cap` *(기존)* | 스포어캡 | 94/20/15/20 | `sig.spore_cloud` |
| 🔥불 | `spore_fire` | 이그니캡 | 78/23/11/15 | `sig.spore_ignite` |
| 💧물 | `spore_water` | 미스트캡 | 104/16/21/13 | `sig.spore_mist` |
| 🪨대지 | `spore_earth` | 트러플캡 | 96/18/21/10 | `sig.myco_net` |
| 🌪️바람 | `spore_wind` | 윈드퍼프 | 78/20/10/24 | `sig.spore_gust` |
| ⚡번개 | `spore_bolt` | 볼트캡 | 76/26/9/22 | `sig.spore_charge` |
| ❄️빙결 | `spore_ice` | 프로스트캡 | 90/20/13/12 | `sig.frost_spore` |

> key 명명: `spore_<element>` 규칙(기존 `spore_cap`은 세이브 호환 위해 유지). 이름은 초안 — 데이터라 추후 변경 용이.

**각 종의 `stageSkills`**(스포어캡 패턴 복제):
```
stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['<자기 시그니처>'] },
signatures:['<자기 시그니처>'],
```

## 5. 신규 시그니처 6종 (`SKILL_LIB`)

기존 `sig.spore_cloud` 스키마(엔진 `applyMove` 지원 필드만 사용 — 확률성 라이더 없음, 결정형) 재사용. cost 3, grade A 기준(스포어캡 시그니처와 동급). 수치는 구현 시 밸런스 셀프테스트로 미세조정.

| 키 | 이름 | icon | 효과(초안) |
|---|---|---|---|
| `sig.spore_ignite` | 포자 발화 | 🔥 | 위력100·광역(aoe) + 화상(burn, 3턴) |
| `sig.spore_mist` | 포자 안개 | 💧 | 자기 체력 15% 회복 + 적 적중(acc) 20%↓(2턴) |
| `sig.myco_net` | 균사 그물 | 🕸️ | 적 기동(spd) 30%↓(2턴) + 자기 방어(def) 20%↑(3턴) + 약한 중독 |
| `sig.spore_gust` | 포자 질풍 | 🌪️ | 위력90·광역 + 중독(poison, 3턴) + 자기 기동↑ |
| `sig.spore_charge` | 전도 포자 | ⚡ | 위력110·광역 + 치명타율 +20% + 중독(2턴) |
| `sig.frost_spore` | 빙결 포자 | ❄️ | 위력90·광역 + 적 기동 25%↓(2턴) + 중독(2턴) |

> 사용 필드 예: `aoe`, `power`, `dot:{kind:'poison'|'burn',pct,turns}`, `enemyDebuff:{stat,pct,turns}`, `selfBuff:{stat,pct,turns}`, `heal`, `critBonus`. 전부 기존 스킬에서 검증된 필드.

## 6. 도감 / 탐사 연동 점검

- **탐사 드롭(`rollSpeciesFromView`):** 지역 테마(속성 `el` · 타입 `types`)로 종 결정. **현재 탐사 지역 데이터의 `types`에 `mushroom`이 포함된 곳이 있는지 점검** → 없으면 버섯이 탐사로 영영 안 나옴. 습지/동굴/부생(腐生)류 지역 1~2곳의 테마에 `mushroom`을 추가해 실제 등장 보장. (지역 데이터 위치 = `index.html`의 `AlienPlantGameData`)
- **도감(`plant-codex.html`):** `__DEX_API`로 `SPECIES`를 읽어 자동 렌더. `EX_TYPE_ORDER`에 버섯형 이미 존재 → 신규 6종 자동 노출. 개수·그룹핑·외형(새 mushroom case 반영) 확인.
- **희귀도 가중(`RARITY_WEIGHT`/`pickAcquirableSpecies`):** rare → 등장률 낮게 자동. legacy 제외 로직과 충돌 없는지 확인.
- **무지개 시작 종자:** `makeRainbowStarterSeed`가 35종(+버섯) 풀에서 뽑을 때 신규 버섯 포함되는지 확인.

## 7. 비범위 — 기록만 (B/C 외형 변이)

향후 개체 확장 시 `bodyStyle` 훅(§2)으로 추가:
- **B `bodyStyle:'cluster'` (군락):** 키 다른 버섯 여러 송이가 무리지어 성장. **게임 기믹 = "추가타"** — 갓(송이)이 여러 개일수록 공격이 다단 히트(multi-hit). 특정 종에 부여.
- **C `bodyStyle:'glow'` (발광 외계 균류):** 가늘고 긴 자루 + 빛나는 주름(gills) + 떠오르는 포자 입자. 완숙/포자 정체성 강조.

이 둘은 별도 작업으로 분리. 이번 스펙은 `'classic'`만 구현하되 분기 훅은 미리 배선.

## 8. 검증 (테스트 러너 없음 → 콘솔 셀프테스트)

`window.__test('name', fn)`로 케이스 추가, `window.__catalogSelfTest()` 반환값(fails 배열)으로 판정:
- 신규 6종이 `SPECIES`에 등록되고 `seedType==='mushroom'`인가
- 각 종 스탯 = `TYPE_STATS.mushroom + ELEMENT_STATS[el]`와 일치하는가
- 신규 6 시그니처가 `ALL_SKILLS`/`skillById`로 해결되는가
- `growthStageName('growing','mushroom') === '어린갓'` 등 타입별 단계명 폴백 동작
- `composePlantBody('mushroom', ...)`가 tree 폴백이 아닌 버섯 분기를 타는가(외형 회귀)
- 태생 포자변이(`applyCatalogVariantFields`)가 신규 종에도 적용되는가

## 9. 영향 파일

- `index.html`: `SPECIES_CATALOG`(+6종), `SKILL_LIB`(+6 시그니처), `composePlantBody`(mushroom 분기 + bodyStyle 훅 + 떡잎 생략), `STAGE_NAMES_BY_TYPE`(신규) + `growthStageName` 확장, 호출부 seed_type 전달, 탐사 지역 테마(`AlienPlantGameData`)에 mushroom 추가, 셀프테스트 케이스.
- `docs/species-system-guide.md`: 버섯 7종 표·실루엣 행·단계명 표 갱신.
- `docs/master-roadmap.md`: 결정 로그 + 현황 갱신, 이 스펙 문서지도 등록.
- `docs/CHANGELOG.md`: 작업 항목.
