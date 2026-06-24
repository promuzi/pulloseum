# 풀로세움 변경 이력 (개발 로그)

> CLAUDE.md에서 분리한 전체 개발 로그. 최신 작업이 맨 위. 과거 맥락이 필요할 때만 읽으세요.

### 2026-06-24 — UI: 모달 열림 깜빡임 제거 (holoBoot → roomEnter 통일)
- 일반 모달이 열릴 때 쓰던 `holoBoot`(투명도를 `steps(12)`로 끊어 점멸시키는 "홀로그램 부팅" 효과)가 깜빡거려서 제거. 상점/탐사 모달이 이미 쓰던 부드러운 `roomEnter`(살짝 떠오르는 페이드+업)로 전 모달 통일 → `.modal:not(.hidden) .modal-card` 한 규칙으로 합치고 미사용 `@keyframes holoBoot` 삭제. 검증: 모달 `.modal-card` computed `animation-name=roomEnter`, holoBoot 키프레임 부재 확인.

### 2026-06-24 — #2 양육/열매 시스템 구현 (게이지·5색 희귀도·공통 RewardReveal) + #1 카탈로그 복구
> 설계 확정([spec](superpowers/specs/2026-06-24-nurture-fruit-system-design.md)) → 구현([plan](superpowers/plans/2026-06-24-nurture-fruit-system.md) Task 1~6). 셀프테스트(`__catalogSelfTest`) 전부 통과 + preview 구동 검증.
- **#1 긴급 복구**: OneDrive 사고로 커밋 `ee6be39`에 섞여 유실됐던 개체 카탈로그 코어(`RARITY_WEIGHT`·`pickAcquirableSpecies`·`applyCatalogVariantFields`·버섯형 `TYPE_STATS`·종 rarity·`SPECIES` 카탈로그 머지/rich필드 backfill·버섯 스프라이트·`rollSpeciesFromView` 희귀도가중·`SEED_ROOT` 균사)를 `ffb44da`에서 골라 재이식. 셀프테스트 8개 실패→0.
- **데이터 모델 v2**: `p.nursery = { gauge, maxFruits, ripe[{rarity}], lastTick, waterBuff, fertBuff, potQuality }` + `state.care{water,fert}`. 구 일일카운터/누적게이트 → `ensureNurseryFields` v2 1회 마이그레이션(무회귀).
- **게이지 모델**: `nurseryTick`(버프 감쇠→게이지 충전→열매 맺힘 상한·게이지 보존). 성장체부터, 단계 점증(maxFruits 2/3/5·충전속도). 맺힐 때 `rollFruitRarity`로 **5색 희귀도**(흰<초록<파랑<보라<주황, 버프/단계 가중) 롤·식물에 색별 표시. 꽉 차면 게이지 붉음·정지.
- **보상**: `rollFruitReward`(색=등급) — 흰/초록=소모품(물·비료·물약 묶음), 파랑/보라=변이카드, 주황=본인스킬(중복→크레딧)/고등급카드. `harvestPot`=맺힌 것 전부 보상화 + 게이지 보존(꽉 참은 0부터).
- **물/비료 = 감쇠형 버프**: `applyCare`(인벤토리 1 소모→버프↑). 일일 무료 카운터 폐기. **공급원=탐사 성공 보상**(물 55%·비료 32%) — 양육 루프 자원 순환 성립.
- **양육 UI**: 게이지 바(버프색 그라데이션/꽉참 붉음)+색별 열매 dot+보유 물/비료 버튼+💎미네랄 즉시가속(`doInstantFruit`). 수확→공통 개봉 연출.
- **공통 RewardReveal**(Task 7 포함): `openRewardReveal({kind,items})` — 배경 위 컨테이너 터치→순차 개봉. **열매 수확·보급박스 구매·탐사 성공 3종 모두 통일** 적용(fruit=희귀도색 열매 / supply=보급박스 / expedition=탐사상자). 보급박스는 기존 `#shopOpenModal` 대신 공통 연출, 탐사는 인라인 성공 카드(`exResultHtml`) 폐기→reveal. 보상은 개봉 전 지급·연출은 표시.
- **코드리뷰 반영**: 꽉 찬 화분 수확 후 게이지를 0.999→0으로(즉시-리필 악용 차단). `createItemInventoryEntry` planet/region null 방어.

### 2026-06-24 — 도감 스킬: 공유/고유 표시 + 클릭 시 보유 가능한 식물·해금 단계 모달
> HANDOFF.md 미반영 기능 ① 재적용(OneDrive 사고로 되돌려졌던 코드).
- **공유 범위 칩**: 각 스킬 행에 `타입 공유`/`속성 공유`/`전체 공유`/`개체 고유` 칩 표시. 판별은 게임의 `dexSkillScope(id)`(타입 기본공/방·타입특기 → 타입축, 속성발현·속성기·성장기 → 속성축, rally/광합성/집중/기본타격/방어 → 전체, 그 외 → 고유). `__DEX_API`에 `dexSkillScope` 노출(version `2026-06-24d`).
- **클릭 모달**: 스킬 행을 누르면 모달에 ① 스킬 설명 ② 공유 범위 안내 ③ **그 스킬을 보유 가능한 식물 목록 + 각자 어느 생장단계부터 얻는지**("○○부터"). `build()`에서 `SKILL_OWNERS` 역색인(종×단계, 최초 해금 단계 기록) 생성, 단계 정렬. 고유 스킬은 핑크 강조.
- **검증**: 칩 105개 렌더, `skill_basic_tree`→"목본형 공유"·보유 7종(엠버오크 씨앗부터), 고유 경로 `공명 방벽`→"개체 고유"·핑크. 도감 JS 콘솔 에러 0. (현재 시그니처 풀은 예약 상태라 실제 "개체 고유" 칩이 달린 종은 아직 없음 — 시그니처 배정 시 자동 표시.)

### 2026-06-24 — 도감 카드에 실제 식물 외형(절차적 SVG) 표시
- **외형 라이브 렌더**: 도감 카드의 외형 칸이 `🌳` 글리프 + "도트 예정" 플레이스홀더였던 것을 폐기 → 게임의 `composePlantSvg(seedType, growth, element)`를 그대로 호출해 **실제 식물 SVG**(타입×속성×생장단계, 화분 포함)를 렌더. `__DEX_API`에 `composePlantSvg` 노출(version `2026-06-24c`).
- **단계 동기화**: `paintCard`에 `paintSprite` 추가 → **단계 리본(씨앗~완숙체)을 누르면 외형도 그 단계로 자람**(완숙체엔 오라). API 미노출 시 글리프 폴백.
- **도감 CSS**: `.sprite{overflow:hidden}` + `.sprite svg{display:block}`, SVG size 68(box 84 안에 안전). 히어로 "예정" 안내 문구를 외형 라이브 반영에 맞게 갱신.
- **검증**: preview에서 SW/캐시 비운 뒤 35카드 외형 SVG 렌더, 단계 클릭 시 외형 변경(씨앗→완숙체+오라), 콘솔 에러 0.

### 2026-06-24 — 도감 라이브 연동(자동 동기화) + PWA 서비스워커
> 설계서: [`superpowers/specs/2026-06-24-live-codex-hosting-pwa-design.md`](superpowers/specs/2026-06-24-live-codex-hosting-pwa-design.md)
- **도감 자동 동기화**: `docs/dex/plant-codex.html`이 데이터를 자체 복제하던 것을 폐기 → 숨은 `<iframe src="../../index.html?dex=1">`로 게임을 불러와 **`window.__DEX_API`에서 실제 데이터·함수를 읽어** 렌더. 스탯=`SPECIES[].base×GROWTH_STAT_MULT`, 스킬=`plantKnownSkillIds` 게임 함수 그대로 → 게임 업데이트 시 도감 자동 반영. 도감 전용 서술(`CONCEPTS`/타입 글리프·설명)만 도감에 보존.
- **데이터 전용 모드(`?dex=1`)**: index.html이 이 플래그면 `bootWithSave`/렌더/Cloud/SW 등록을 모두 생략 → 도감이 게임을 불러와도 사용자 세이브 무손상. 끝부분에 `__DEX_API` 노출 블록 추가.
- **PWA**: 기존 `site.webmanifest`(아이콘 192/512 보유)에 더해 `sw.js` 추가(HTML network-first=항상 최신, 정적 cache-first, 구 캐시 정리). 비-dex 모드에서만 SW 등록. 홈 화면 추가로 앱처럼 사용.
- **호스팅(예정)**: GitHub Pages 켜면 `promuzi.github.io/pulloseum/`(게임)·`/docs/dex/plant-codex.html`(도감)을 어느 기기서나 링크로 열람(푸시 시 자동 배포). 활성화는 저장소 Settings→Pages 1회 토글(이 PC에 gh 없음).
- **검증**: 도감 36종 라이브 렌더·단계 전환·필터 OK, dex-mode 시 게임 부팅 안 됨(세이브 안전), 게임 본체 정상 부팅 + 셀프테스트 18/18 PASS, 콘솔 에러 0.

### 2026-06-24 — 버그픽스: 레벨업 물약이 한 클릭에 완숙체까지 점프하던 문제
- **증상**: 레벨업 물약을 쓰면 "1번 생장" 후 버튼이 비활성화돼 더 못 누름.
- **근본 원인**: 물약이 한 번에 500 EXP를 주는데 `gainGrowthExp`의 `while` 루프가 이를 전부 소모 → 새싹에서 곧장 완숙체(evolved)까지 4단계를 한 클릭에 점프. evolved가 되면 버튼 `disabled`(=`isMax`) 조건이 켜져 더 못 누르게 됨(코드상 정상이지만 의도와 불일치).
- **수정**: `levelupPotionExp(p)` 헬퍼 신설(현재 EXP에서 다음 단계까지 필요한 만큼만 부여) → `useItem`의 레벨업 분기에서 사용. 이제 **한 클릭당 정확히 한 단계씩** 생장, evolved 도달 시에만 비활성화. 토스트도 "○○ 단계로 생장"으로 변경.
- **검증**: 신규 셀프테스트 1건 추가, `window.__catalogSelfTest()` 전건 PASS·0 FAIL, 콘솔 에러 0.

### 2026-06-24 — 초본형 폐지(화초형 흡수) + 새싹·유체 스킬 타입/속성 축 재설계
> 설계서: [`superpowers/specs/2026-06-24-sprout-juvenile-skills-design.md`](superpowers/specs/2026-06-24-sprout-juvenile-skills-design.md)
- **초본형 완전 폐지 → 화초형 흡수**: "풀은 결국 꽃을 피운다"는 이유로 타입을 **5종(목본/화초/다육/덩굴/버섯)** 확정. (구)초본 7종(플레임모스 등)의 타입을 `grass`→`flower`로 전환(스탯·외형·스킬 모두 화초형, legacy 유지). `SEED_TYPE_NAMES`/`ORDER`·`EX_TYPE_*`·탐사 지역 `types`에서 초본형 제거, `SEED_TYPE_OF`/`seedTypeOf` 폴백 flower로. 세이브 `seed_type:'grass'`→`'flower'` 마이그레이션. ⚠️ `grass`는 **풀 '속성'으로만** 존속(`ELEMENTS`/`ELEMENT_STATS` 불변), `TYPE_STATS.grass`는 안전망 폴백으로만 잔존.
- **새싹·유체 스킬 재설계(`STAGE_SKILLS` 22종 신설)**: 개체 고유 없이 **타입 축(기본공격·기본방어·타입특기 ×5) + 속성 축(속성발현 ×7)** 으로 공유. 새싹=타입 기본공/방+속성발현, 유체=+타입특기+속성기(기존 `skill_elem_*` 재사용). `plantKnownSkillIds`를 `battleType(p)`(종 우선·grass→flower 안전망) 기준으로 재배선. 성장체 이상은 기존 `ELEMENT_GROWTH_SKILLS` 유지(후속 재설계).
- **`skill_basic_strike` 하드코딩 일반화**: `isBasicSkill`/`isBasicAttackSkill`/`plantBasicAttackId` 헬퍼 도입 → defaultLoadout·ensureSkillFields·skillGradeOf·energyOnEnemySkill·nurserySkillReward 치환(레거시 기본기 후방호환 유지).
- **검증**: 신규 셀프테스트 7건 포함 `window.__catalogSelfTest()` **17/17 PASS·0 FAIL**, 콘솔 에러 0. 새싹→완숙체 단계별 스킬 누적·전투 로드아웃·22종 표시 포맷터 무오류 확인. 부가효과는 전투 엔진 지원 필드만 사용(확률 라이더 없음).

### 2026-06-24 — 다운로드본 UI 반영: Galmuri 픽셀폰트 + 인라인 픽셀 아이콘 + 미니멀 정리 (3-way 머지)
> 다운로드본(`C:\Users\soosa\Downloads\index (1).html`)은 **`b353183`(홀로그램 픽셀 오버레이) 기반**에 UI 개편만 얹은 것이라, 그 사이에 들어온 개체 카탈로그/버섯형/희귀도 가중/변이 슬롯/셀프테스트 코드가 빠져 있었음. 통째 덮어쓰면 회귀 → **3-way 머지**(base=`b353183`, ours=현 HEAD, theirs=다운로드본)로 충돌 0건 병합해 **신규 UI + 기존 종 시스템 둘 다 보존**.
- **Galmuri 픽셀 폰트**: CSS가 참조만 하던 Galmuri7/9/11/14를 jsDelivr CDN으로 실제 로드(SIL OFL, 상업적 무료). 2026-06-23에 제거했던 누락 woff2 문제 해소. 픽셀 폰트 가독성용 본문 자간(`letter-spacing`) 보정.
- **인라인 픽셀 아이콘 시스템 `window.pxIcon(name,size)`**: 이모지(🌱🪴🎒·스탯 아이콘 등)를 11×11 `crispEdges` SVG 도트 아이콘으로 교체. 하단 네비·스탯 박스·종자가방 바·가방 FAB에 적용(`window.pxIcon` 가드로 미정의 시 이모지 폴백). → 도트 UI 로드맵의 "아이콘 도트화" 첫 착수.
- **설정 창 섹션화(v3)**: 텍스트 벽 → 카드 섹션(`.set-sec`/`.set-actions` 2열/`.set-help` details 접기).
- **메인 화면 가독성(v4)**: 좌측 스탯 라벨 대비↑·컴팩트(`info-pills`/`stat-box`), 가운데 식물 히어로 확대(`#centerPlant` ~182px), 우측 가방 FAB 확대.
- **프로필 배너·화분 칩·종자가방 바(v5)**: 프로필을 깔끔한 홀로 ID 카드로, 화분 칩 확대 + 상태(보유/빈칸/잠금) 구분 명확, 종자가방을 카운트+정렬 한 줄 바(`.seedbag-bar`)로 통합(설명 벽 제거).
- **격납고 배경 SVG 리디자인**: 밝은 타일 챔버 → 다크 스페이스 격납고(천장 빔·측벽 패널 라인·관측창 우주 그라데이션·글로우, `shape-rendering=geometricPrecision`).
- **검증**: 브라우저 로드 후 `window.__catalogSelfTest()` **0 FAIL**, `pxIcon` SVG 렌더·Galmuri 폰트 로드·다크 격납고/프로필/종자바/가방 FAB 렌더 확인. 종 시스템 식별자(`spore_cap`·`RARITY_WEIGHT`·`applyCatalogVariantFields`·`mushroom`·셀프테스트) 전부 보존.

### 2026-06-24 — 종 시스템: 수작업 개체 카탈로그(A+C) 전환 + 버섯형 추가
> 설계서: [`superpowers/specs/2026-06-24-plant-individual-catalog-design.md`](superpowers/specs/2026-06-24-plant-individual-catalog-design.md) · 계획서: [`superpowers/plans/2026-06-24-plant-individual-catalog.md`](superpowers/plans/2026-06-24-plant-individual-catalog.md)
- **개체 카탈로그(`SPECIES_CATALOG`)**: 자동 격자(`SPECIES_GRID`) 위에 개체별 확장 데이터(rarity·variantSlots·baseVariants·stageSkills·signatures·stats override)를 머지해 후방호환 `SPECIES`를 생성. 같은 타입·속성·단계여도 별개 개체 추가 가능.
- **스킬 정의 분리(`SKILL_LIB`)**: 신규/버섯/시그니처 스킬을 한 곳에 정의하고 개체는 키로만 참조(`ALL_SKILLS`에 합산). 네임스페이스 `common.*/sig.*/mushroom.*`. 향후 스킬 수정은 여기와 카탈로그만.
- **타입 개편**: 초본형(grass)이 화초형과 겹쳐 **레거시 보존**(신규 획득 제외, 보유분·외형 유지) → **버섯형(mushroom)** 추가. 버섯=저스탯(38/9/5/8)+포자 기본(`baseVariants:['spore']`)+희귀. 포자는 데이터로만 결정해 다른 종 확장 여지 유지.
- **희귀도 가중 획득**: `RARITY_WEIGHT`/`pickAcquirableSpecies()`로 탐사·적 종 분포를 가중 추출하고 레거시 초본형은 제외. 시범 버섯 개체 **스포어캡(spore_cap)** 추가(rare).
- **스킬 해금**: `plantKnownSkillIds`가 카탈로그 `stageSkills`/`signatures`를 인식(레거시는 기존 `ELEMENT_GROWTH_SKILLS` 풀 유지).
- **변이 슬롯/마이그레이션**: `applyCatalogVariantFields(p)` 공용 헬퍼로 심기·`normalizeState` 양쪽에서 `variant_slots`/`base_variants` 기록·backfill(구 세이브 무회귀). 버섯은 태생 포자로 form 초기화.
- **검증**: 콘솔 셀프테스트 하니스(`window.__catalogSelfTest()`, 11케이스 전부 PASS) + 브라우저 스모크(buildEnemy·외형·마이그레이션).
- **향후**: 전체 개체 목록·세부 스킬 효과·변이 슬롯 편집 UI·도트 PNG는 다음 작업.

### 2026-06-23 — 다운로드본 UI 반영: 픽셀/홀로그램 오버레이
- `C:\Users\soosa\Downloads\index.html`의 UI 변경을 프로젝트 `index.html`에 반영.
- 전체 버튼·패널·모달에 픽셀/홀로그램 시스템창 스타일 오버레이를 추가하고, 상점/탐사/양육/함선 방별 틴트와 전환 애니메이션을 보강.
- 일반 팝업을 세로 중앙 정렬하고, 메인 식물 화면에 홀로그램 격리 챔버와 개선된 우주선 내부 SVG 배경(타일·관측창·글로우)을 적용.
- 다운로드본에만 있던 `assets/fonts/*.woff2` 참조는 저장소에 실제 파일이 없어 제거하고 기존 fallback 폰트 체인을 유지.
- 밸런스 문서의 속성 상성 요약을 현행 표 기준으로 정정.

### 2026-06-23 — UI 리스타일 1단계: 흰 선체 + 청록 네온 공통 크롬
- **UI 룩 방향 확정(결정 #0011):** 전체 UI를 **흰색 우주선 선체 타일 + 청록(시안-틸) 네온**으로 통일. 하단 탭마다 "다른 방" 분위기(탐사=어두운 관측 갑판/상점=단말기/전투=콜로세움 스테이지/양육=함선 식물원/함선=정비 베이). 나중에 도트 PNG 교체와 호환되도록 플랫·각진 프레임 지향. (목업 2종 비교 후 사용자 채택)
- **1단계 — 공통 크롬(모든 화면 공통):** `:root`에 흰 선체 토큰 추가(`--hull/--hull2/--hull-line/--neon-ink/--neon-soft/--ink/--ink-sub`), `--neon`을 민트→시안틸(`#1fd9c4`)로 교체.
  - 상단 계기판 바(`#topHeader`)·하단 5탭(`#bottomNav`)을 흰 선체 타일 + 청록 테두리로, 그 위 글자는 진한 색(`--ink`)으로 명시(다크→화이트 전환 시 글자 안 보임 사고 방지). 자원칩/레벨바/경험치바/설정버튼/네비 활성색 청록 통일.
  - 빨강 "전투" 버튼·중앙 네비 버튼·기본 primary 버튼을 청록틸 그라데이션으로(빨강 톤 충돌 제거).
- **룩 보강(사용자 지시):** 흰색은 **선체 구조(프레임·바·타일 테두리)에만**, **방 내부 배경은 어둡게**(너무 밝으면 분위기 죽음). 방은 밝기 아닌 **어두운 틴트+포인트 색**으로 구분. 양육=밝은 온실❌ → 밤의 식물원. 패널 fill은 어둡게 유지(밝은 글자 그대로 가독·안전).
### 2026-06-23 — UI 3단계: 떠있는 도트 UI 전환(메인방) — 흰 슬랩 헤더 폐기
> 설계서: [`superpowers/specs/2026-06-23-ui-floating-interior-design.md`](superpowers/specs/2026-06-23-ui-floating-interior-design.md) (결정 #11 재정의)
- **흰 슬랩 헤더 폐기 → 떠있는 칩:** `#topHeader`·`#bottomNav` 배경 슬랩 제거(투명, `pointer-events` 패스스루). 레벨/재화/설정/네비 버튼을 **어두운 반투명 픽셀칩 + 청록·골드 테두리 + 하드 도트 그림자(`Npx Npx 0`)** 로 장면 위에 부유. 재화는 우상단으로, 네비 중앙(식물·전투)은 청록 솔리드 칩으로 크게.
- **메인방 배경 = 함선 내부 장면:** `#mainScene`(SVG) 추가 — 밝은 미래 타일 방, 완만한 1점 투시(넓고 열린 방), 뒷벽 관측창(행성+별), 청록 라인, 가장자리 음영. **나중에 도트 이미지로 교체할 배경 슬롯.** 콘텐츠는 `z-index:1`로 위에.
- **중앙 식물 = 보관 포드:** `#centerPlant::before`로 받침대+청록 발광(함선 안에 놓여 관리받는 느낌). `overflow:visible`로 변경.
- **전투 버튼:** 떠있는 픽셀칩(청록 솔리드 + 각진 보더 + 하드 그림자, 펄스 글로우).
- **🐞 버그 수정(같은 작업 중 회귀):** 다른 화면(탐사/상점/양육/함선)에서 상·하단 헤더가 사라지던 문제. 원인 = 위 `#mainScreen>*:not(#mainScene){position:relative;z-index:1}` 규칙이 #mainScreen 직계 자식인 `#topHeader`·`#bottomNav`에도 적용돼(특이도 ID 2>1) `position:fixed`를 덮어씀 → z:50 오버레이 화면에 가려짐. **수정:** 규칙에 `:not(#topHeader):not(#bottomNav)` 추가해 두 헤더는 fixed 유지. 전 화면(상점/탐사/함선)에서 fixed·visible 검증 완료.
- ⚠️ 탐사/양육/상점/함선/전투 방은 **아직 미전환**(다음 수직 단계). 이 환경 preview 스크린샷은 게임 실행 화면에서 불안정 → computed-style 검증(에러 없음). **시각 미세조정은 사용자가 게임 열어 핑퐁 예정.**

### 2026-06-23 — UI 리스타일 2단계: 액센트 청록 통일 + 방 헤더 흰 콘솔화
- **액센트 일괄 통일:** `--line` 테두리 토큰을 청록(`rgba(31,217,196,.28)`)으로, 코드 전반에 흩어진 옛 민트그린 하드코드 **96곳을 시안-틸로 일괄 치환**(스크립트). 모든 카드 테두리·호버·포인트색이 청록으로 통일. (양육방 고유 초록 배경·테두리는 별도 값이라 보존.)
- **방 헤더 → 흰 선체 콘솔 헤더(흰 골격을 방 안에서도 노출):**
  - 탐사(`.space-map-head`)·함선(`#shipTopbar`)·상점(`#shopModal h2`) = 흰 타일 + 청록 하단 테두리 + 진한 글자.
  - 양육(`.nursery-top`) = 흰 타일 + **초록** 하단 테두리·진한 초록 글자(밤의 식물원 정체성 유지). 자원 칩 흰 배경+초록 테두리.
  - 상점은 **단말기 화면 컨셉**으로 어두운 배경에 미세 스캔라인 추가.
  - 전투(`#battleHeader`)는 몰입형 스테이지라 어두운 오버레이 유지(흰 바 미적용).
- **남은 빨강 액션 버튼 정리:** 경기 버튼(`.mr-btn`) 빨강→청록. (체력바 위험 빨강은 의미상 유지.)
- ⚠️ 미완: 메인(식물-전투) 화면 내부 더 다듬기·정렬 점검·각 방 내부 패널 미세 조정 = **크롬 확장 연결 후 시각 확인하며 마무리 예정**. 이 환경 preview 스크린샷은 게임 실행 화면에서 불안정(타이틀만 캡처됨) → computed-style로 검증(에러 없음).

### 2026-06-23 — UI 리스타일 1단계: 흰 선체 + 청록 네온 공통 크롬
- **UI 룩 방향 확정(결정 #0011):** 전체 UI를 **흰색 우주선 선체 타일 + 청록(시안-틸) 네온**으로 통일. 하단 탭마다 "다른 방" 분위기(탐사=어두운 관측 갑판/상점=단말기/전투=콜로세움 스테이지/양육=함선 식물원/함선=정비 베이). 나중에 도트 PNG 교체와 호환되도록 플랫·각진 프레임 지향. (목업 2종 비교 후 사용자 채택)
- **1단계 — 공통 크롬(모든 화면 공통):** `:root`에 흰 선체 토큰 추가(`--hull/--hull2/--hull-line/--neon-ink/--neon-soft/--ink/--ink-sub`), `--neon`을 민트→시안틸(`#1fd9c4`)로 교체.
  - 상단 계기판 바(`#topHeader`)·하단 5탭(`#bottomNav`)을 흰 선체 타일 + 청록 테두리로, 그 위 글자는 진한 색(`--ink`)으로 명시(다크→화이트 전환 시 글자 안 보임 사고 방지). 자원칩/레벨바/경험치바/설정버튼/네비 활성색 청록 통일.
  - 빨강 "전투" 버튼·중앙 네비 버튼·기본 primary 버튼을 청록틸 그라데이션으로(빨강 톤 충돌 제거).
- **룩 보강(사용자 지시):** 흰색은 **선체 구조(프레임·바·타일 테두리)에만**, **방 내부 배경은 어둡게**(너무 밝으면 분위기 죽음). 방은 밝기 아닌 **어두운 틴트+포인트 색**으로 구분. 양육=밝은 온실❌ → 밤의 식물원. 패널 fill은 어둡게 유지(밝은 글자 그대로 가독·안전).

### 2026-06-23 — 양육·변이·스킬 레이아웃 개편 + 화분 식물 누끼/흔들림
- **식물양육 그리드 3열×4행** — 기존 4열 → `repeat(3,1fr)`로 변경(`.nursery-grid`).
- **양육 식물을 카드틀 없는 '누끼'로 크게** — `.pot-slot`에서 카드 배경·테두리 제거, 식물 스프라이트 38→78px로 확대(`composePlantSvg` 화분 포함). 양옆 흔들림 애니메이션 `potSway`(식물별 `animation-delay` 분산)로 생동감 부여, 열매시 골든 글로우. `prefers-reduced-motion`에서 흔들림 정지.
- **변이/스킬 서랍을 가로 스크롤 → 그리드** — `.drawer` flex→grid. **변이 4열**(`.drawer-mut`) · **스킬 3열**(`.drawer-skill`). `.dcard` 고정폭 제거(열 너비 자동).
- **양육 상세 팝업 통일감** — 화분 상세 모달의 식물에도 그리드와 동일한 `.pot-sprite` 흔들림/그림자 적용.

### 2026-06-23 — 양육 팝업 탭 전환·화면 잘림 수정
- 수확 목록을 포함한 공용 모달을 하단 탭 전환 시 일괄 닫아 다른 화면에 남지 않도록 수정.
- 공용 모달 높이와 상하 여백에 상단 헤더·하단 헤더·모바일 안전영역을 모두 반영하고, 긴 내용은 모달 내부에서 스크롤되도록 통일.


### 2026-06-22 — 하단 탭 탐사·함선 위치 교체
- 하단 헤더 순서를 **상점 / 탐사 / 식물·전투(중앙) / 식물양육 / 함선**으로 변경. 탐사는 왼쪽 두 번째, 함선은 오른쪽 끝에서 진입한다.


### 2026-06-22 — 식물 양육(식물원) + 스킬 고정 등급제 + 성장 보급상자
사용자 지시(#0009/#0010)대로 양육 시스템·생장 개편·스킬 등급 정리. (양육/탭 재배치/생장 물약은 `ca12e0f` 커밋, 이번 작업은 **스킬 고정 등급제 + 성장 보급상자**로 마무리.)
1. **하단 탭 재배치** — 상점 / 함선 / 식물·전투(중앙) / 🪴식물양육(4번째) / 🛰️탐사(5번째). (`ca12e0f`)
2. **식물원(양육)** — 3×4 = 12칸 화분. 식물에 💧물(일 20회)·🌿비료(일 10회, 자정 리셋) → 물10+비료5 누적 시 🍎열매 1~3개. 수확→`state.nursery_fruits`(🍎수확 목록). 열매=랜덤 박스로 개봉 시 **그 식물의 생장단계에서 쓸 수 있는 스킬**을 1개 지급(`p.bonus_skills`). 코어: `NURSERY_*`, `ensureNurseryFields`, `checkNurseryFruitReady`, `doHarvestPot`, `openFruit`, `nurserySkillReward`. (`ca12e0f`)
3. **생장 개편** — 물/비료 레벨업 폐기. 생장단계 경험치는 **전투 승리 + 경험치 아이템(레벨업 물약)**으로만. **레벨업 물약 무료·무한**(테스트용, `price:0/free`), **생장판 닫기 물약**(`p.growthLocked` → 경험치 영구 차단). (`ca12e0f`)
4. **스킬 고정 등급제(이번 작업 핵심)** — "등급에 따라 계수만 달라지는" 방식 폐기. 속성기·잠재특성 스킬(~28종)에 **고정 등급**(D~S) 부여(`TRAIT_SKILLS`/`ELEMENT_SKILLS`의 `grade`). `intrinsicSkillGrade()` 추가, `gradeGrowthSkill`이 고정 등급 스킬은 **계수 스케일 없이 정의 그대로** 반환. 코어 5종(기본공격/방어/광합성/기력집중/생장가속)만 `GRADE_SKILL_VARIANTS`로 **등급별 아예 다른 스킬**(잠재력으로 결정). `skillGradeOf`·`ensureSkillFields`도 고정 등급 우선(옛 세이브의 굴린 등급은 다음 로드 시 고정값으로 자동 정정). `ELEMENT_GROWTH_SKILLS`를 단계별 등급 오름차순으로 재정렬.
5. **열매 보상 가중** — `nurserySkillReward`가 잠재력↑일수록 상위 등급(고정) 스킬이 잘 나오게 가중 추첨(`POTENTIAL_BIAS`/`SKILL_GRADE_RANK`). 검증: D잠재력→대부분 C/D, S잠재력→대부분 S/A.
6. **성장 보급상자(랜덤 아이템 박스)** — `box_growth_supply`(group:`item`) 신설: 비료/영양제/레벨업물약/물/생장판닫기 무작위. 상점에 "성장 보급상자" 블록 추가 + **탐사 보상**에도 드롭(성공 마진 비례 ~16%, 즉시 개봉 지급).
- 무회귀: 전투 데미지/보상/AI 로직 불변. 검증: preview 콘솔 에러 0, 스킬 고정등급(화염 분사 항상 B/160·플라즈마 항상 S)·코어 변종(연속 타격 B/파멸의 일격 S)·열매 개봉→스킬 지급·열매 등급 가중분포·상점 성장상자 확률표·12칸 화분 DOM/eval 확인.

### 2026-06-20 — 전투 밸런스·봇 성장 구조 마무리
1. **속성기 차별화** — 불(화상), 물(회복), 풀(흡혈), 대지(방어무시), 바람(단일+자가속), 번개(치명타), 빙결(둔화)로 역할을 분리(`ELEMENT_SKILL_FX`).
2. **봇 절대 스탯화** — 플레이어 스탯 복사를 제거하고 티어+라운드+생장단계 기준으로 생성(`ENEMY_REF_BASE`, `ENEMY_TIER_GRADE`, `buildEnemy`). 같은 티어에서 식물 성장 효과가 실제 우위로 남는다.
3. **봇도 성장 시스템 사용** — 상위 라운드에서 속성 성장스킬을 해금하고, 티어별 스킬 등급과 변이형별 카드를 실제 전투에 적용.
4. **전투 버그 정리** — 포식 에너지 강탈·발광 에너지 회복의 상한을 `energyMax`로 통일하고 폐기된 독초 물약의 전투 경로를 제거. 기본공격을 특수 스킬로 오인하지 않도록 모든 전투 스킬에 ID를 전달.
5. **전투 UI 보강** — 손가락 인트로 제거, 블러 없는 중앙 카드, 턴·카드/기록 전환, 유저 닉네임과 드래그 가능한 기록을 구현. 판정창은 기동성 선공→방어 우선→최종 피해→회복·상태효과만 요약 표시.
6. **문서화** — `docs/battle-mechanics-deep-dive.md`를 현행 코드 기준으로 갱신. 잠재특성 패시브는 향후 발현용 예약 구조이며 현재 전투에는 의도적으로 미반영.
7. **메인·상점 정렬 보정** — 전투/식물 화면을 좌우 대칭 그리드로 바꿔 식물을 화면 중앙에 두면서 스탯 패널과 겹치지 않게 했고, 상점 상자 그림과 개봉 애니메이션을 카드 테두리에 맞췄다.
8. **전투 판정 연출 단순화** — 누적 판정 로그와 계산식을 제거하고 양쪽 사용 카드, `선공`/`방어 우선`, 상성·명중 결과 한 줄만 표시한다. 회복·버프·디버프는 수치 없이 짧은 문장으로 알리며, 스킬 숨김 상태에서 내 식물을 누르면 현재 전투 스펙을 확인할 수 있다.
9. **메인·상점 시각 정밀 보정** — 메인 식물을 실제 그림 기준으로 소폭 왼쪽 보정하고 중앙 칸 밖을 잘라 좌측 스탯과 겹치지 않게 했다. 상점 상자 아트와 개봉 애니메이션은 테두리 전체를 쓰는 동일 크기 레이어로 맞췄다.
10. **스킬 이름 표시 정리** — 전투와 식물 관리 스킬 UI에서 등급 문자를 제거하고 이름·테두리 색으로만 등급을 구분한다. 한글 스킬명은 단어 중간에서 끊지 않고 공백을 기준으로 줄바꿈한다.

### 2026-06-19 — 전투 인터페이스 전면 재설계(카드 선택 + 판정 창 + 결과 연출)
사용자 지시(전투 플레이 방식)대로 전투를 **상시 스킬 버튼 → 턴마다 뜨는 스킬 카드 + 판정 창 연출**로 전면 개편. 전투 데미지/보상 계산 로직은 그대로 두고 **표현 계층만 교체**(무회귀).
1. **스탠딩 무대(`#battleArena`)** — 하단 상시 스킬 버튼(`.moves`/`#moveButtons`) 제거. 적(위)·나(아래)가 **체력바·에너지(⚡)만 달고 서 있는** 화면. `#battleScreen`을 `position:relative` 풀스크린 무대로 재구성, 기존 `.fighter` 가로 레이아웃 → 세로 무대(`.arena-fighter`).
2. **인트로** — `playVsIntro`에 **손가락질**(👉👈 `vs-hand` 키프레임) 추가: 재배사 배너가 들어와 서로 가리키고 빠짐 → `enterBattleStage`가 식물 등장 애니(`fighterIn`/`fighterInTop`) 후 첫 카드 페이즈.
3. **스킬 카드 페이즈(`#cardPhase`)** — 매 턴 카드가 **허공에 뜸**(`cardFloat` 부유 애니, 배경 `backdrop-filter:blur` 흐림). 두 식물 거리 벌어짐(`#battleArena.spread`). 상단에 **사용 가능 에너지 번개**(`cp-energy`), **6칸 3×2 그리드**(`#cardHand`) + **포식은 아래 가로 한 줄**(`#cardPred .skillcard.pred`), 최하단 **항복**. 무기·독성형은 (차후 수정 전까지) 일반처럼 그리드에 배치. 카드엔 최소 정보(이름·등급색·코스트·계수), **꾹 누르면 상세**(`showSkillDetail`→`#battleSkillDetail`). 등급색은 `gradeColor`/`battleSkillGrade` 공통.
4. **판정 창(`#judgeWindow`)** — 카드 선택 시 카드가 내려가고(`hideCardPhase`), 두 식물 사이에 **좌→우 번개**(`jw-bolt` 스윕) 후 창이 열림(`openJudge`). 안에 **양쪽 사용 카드**(상대/나) → **선공 판정**(기동성 차 → 확률 → 선/후, `jl-roll`) → **공격 보정 계산식**(공격×위력%+속성−방어, `applySkill`에 `jl-calc` 로그) → 데미지 모션(`shake`/`dmgpop`)·체력·버프/디버프 적용 → 후순위 반복 → 창 닫히며(`closeJudge`) 카드 재등장. 기존 `#battleLog`을 판정 창 내부로 이동(턴마다 초기화).
5. **결과 연출(`#battleResult`)** — 승패 시 진 식물 **쓰러짐**(`collapse`) → 위·아래 **금속판이 닫힘**(`mr-plate`/`shut`) → 가운데 **진출 단계/예선 승수**(`mr-progress`) + **승리/패배/우승** 문구(`mr-outcome`) + **보상 카드**(💰크레딧·⭐성장·👑우승보너스, `mr-card`). 버튼으로 홈 복귀(`closeBattleResult`). 보상/티어/토너먼트 진행 계산은 종전 `endMatch` 로직 보존.
6. **항복** — 카드 페이즈 최하단 버튼 → **재확인 창**(`#surrenderConfirm`) → 확정 시 패배 처리(`confirmSurrender`/`doSurrender`).
- 무회귀: 전투 진입(`startMatch`)·데미지(`applySkill`)·AI(`aiPickSkill`)·보상(`endMatch`)·세이브 변화 없음. 구 `renderMoveButtons`/`surrenderMatch`/`.moves` 제거, `#resultModal`은 잔존(미사용). 검증: preview에서 인트로→식물등장→카드 페이즈(6칸+포식+에너지+항복)→꾹눌러 상세→카드 선택→판정 창(양쪽카드·선공판정·계산식)→체력 변동→카드 재등장→KO 시 쓰러짐+금속판+보상카드(승리/패배)→홈 복귀, 항복 재확인(계속/항복) 전 경로 DOM·실클릭 확인, 콘솔 에러 0. (※ preview 스크린샷은 이 환경에서 타임아웃 → eval/DOM으로 검증.)

### 2026-06-19 — 함선 내부 워킹(포켓몬식 도트) — "모드" 탭 → "🚀 함선"
하단 헤더의 잠겨 있던 **🎮 모드** 탭을 **🚀 함선**으로 열고, 탐사선 내부를 캐릭터(탐사복 도트)가 **타일 그리드 위를 걸어다니는** 포켓몬식 화면으로 구현. 콘솔 앞에서 Ⓐ로 상호작용해 기존 시스템으로 진입.
- **새 전체화면 `#shipScreen`** (battleScreen처럼 `mainScreen`을 가림 → 상단 헤더·하단 네비 자동 숨김, 몰입형). 자체 `✕ 나가기` 버튼으로 메인 복귀.
- **캔버스 엔진**(외부 의존성 0, vanilla): `SHIP_MAP`(13×9 ASCII 맵, `#`=벽 `.`=바닥 `@`=스폰) + `SHIP_FEATURES`(콘솔·장식 좌표 배열). `startShipEngine`/`stopShipEngine`(rAF 루프), `updateShip`(그리드 이동·바라보는 칸 콘솔 감지), `drawShip`(바닥/벽 타일·콘솔 박스+이모지·플레이어), `drawAvatar`(방향별 바이저·걷기 보브). 픽셀아트(`image-rendering:pixelated`).
- **조작**: 화면 D-패드(터치 `pointerdown/up`) + Ⓐ버튼, 데스크톱은 방향키/WASD·Space/Enter·Esc. 그리드 단위 트윈 이동, 콘솔·장식은 통행 불가(앞에서 조작).
- **콘솔 → 기존 시스템 연결**: ⚔️토너먼트→`startBattle()`, 🛰️탐사→`openExploration()`, 🛒상점→`openShop()`, 🌿재배 베이→`openUpgrade()`. 🤖정비 드로이드=NPC 대사(친구 초대 예고). 진입 시 `exitShip()`이 엔진 정지 후 해당 화면/모달 오픈.
- **확장 포인트(향후)**: `SHIP_FEATURES`를 `state.ship.furniture`로 옮기면 **가구 배치·꾸미기**; 맵을 여러 개 두고 워프 콘솔을 추가하면 **다른 행성·길드 정거장 방문**; NPC 타일로 **친구 초대/동행**. 데이터 주도라 콘텐츠 추가는 좌표·action만 늘리면 됨.
- 무회귀: 기존 세이브·시스템 변화 없음(`mode` 네비 라우팅만 `openLockedSection`→`openShip`으로 교체, 길드는 잠금 유지).
- 검증: preview에서 함선 진입·캔버스 렌더(픽셀 채움률 1.0)·통행 판정(벽/바닥/장식/맵밖)·드로이드 프롬프트+대사·탐사 콘솔 상호작용→탐사 모달 전환·재진입 시 엔진 재시작 확인, 콘솔 에러 0. (※ preview 스크린샷 도구는 이 환경에서 타임아웃 → eval/DOM으로 검증.)

### 2026-06-19 — 전투/식물 페이지 + 식물 관리창(강화/변이/스킬) 인터페이스 재설계
사용자 손그림(그림4·5·6·7) 기준으로 메인 화면과 식물 클릭 시 뜨는 관리창을 전면 재구성.
1. **메인 전투/식물 페이지(그림4)** — `.main-body`를 `#mainStage`(좌 `#statPanel` / 중앙 `#centerPlant` / 우 `#sidePanel`) 3분할로. 좌측: **둥근 박스 4개**(타입/속성/변이/잠재력 — `plantInfoPills`) + **사각 스탯 박스 8개**(`mainStatBoxes`: 체력/공격/방어/기동/적중/속성/치명/에너지). 우측: 🎒가방(`bagFabHtml`, 공지·랭크 버튼은 보류). `renderCenter` 재작성. 토너먼트 바는 **티어/토너먼트명/경기 현황 3분할 셀**(`.tcells`)로 바꾸고, 어느 셀이든 누르면 **참가 가능 경기 목록 모달**(`#matchesModal`, `openMatches`/`renderMatches` — 향후 확장) 표시.
2. **식물 관리창 공통 프레임(그림5/6/7)** — `#upgradeModal`을 새 프레임으로: 상단 **강화/변이/스킬 탭**(`.pm-tabs`), 우상단 **✕**(`#pmClose`), 항상 중앙에 식물, 식물 위 **이름+✏️ 수정**(`editPlantName`), 그 아래 **주요 정보 알약 5종**(타입/속성/변이/잠재력/등급). `renderUpgrade`/`bindUpgradeEvents` 재작성, 탭키 `up`/`mut`/`skill`. 식물 클릭 시 항상 **강화 탭**으로 시작.
3. **강화 탭(그림5)** — 식물 좌측 명중력/치명타률/속성/에너지, 우측 체력/공격력/방어력/기동력(`upStatCard`, `data-up`→크레딧 강화). 하단 **생장 게이지 + 💧물/🌿비료**(현재단계·경험치 표기).
4. **변이 탭(그림6)** — 식물 좌3·우3 슬롯 = **카드 5칸 + 자아 1칸(🔒 잠금, 색 구분)**. 하단 **보유 변이 카드 서랍**(가로 스크롤 + 정렬 버튼). 변이형 불일치 카드는 **어둡게(off)**. 카드 탭 → **상세 팝업**(`openCardDetail`): 미장착=장착 / 장착=해제 버튼. 빈 칸 있으면 **자동 장착**, 가득 차면 **스왑 모드**(장착 슬롯 테두리 붉어짐 `.pick` + 하단에 장착 예정 카드 떠있음 `.swap-float`, 슬롯 선택 시 교체). 등급 색: **흰D·초록C·하늘B·보라A·주황S**(`GRADE_PALETTE`/`gradeColor`, 카드·스킬 공통).
5. **스킬 탭(그림7)** — 식물 좌3·우3 = **장착 스킬 6칸**(스킬명+수치+등급색). 하단 보유 스킬 서랍. **변이 유래 스킬(포식·무기·카드)은 스킬 탭에 노출하지 않고 전투 시 자동 합류**(`isAutoFormSkill`/`plantSkillPool`/`plantBattleLoadout`, `startMatch`이 `plantBattleLoadout` 사용 / `makeCombatant`이 카드·포식 스킬 자동 주입). 장착/해제/스왑 동일, 최소 1개 유지.
6. 무회귀: `ensureSkillFields`가 기존 세이브의 `equipped_skills`에서 변이 유래 스킬을 제거(전투엔 자동 합류하므로 동일). 옛 탭 함수(`renderConsumTab`/`renderTraitTab`/`renderSkillTab`/`renderPlantTab`/`skillCardHtml`) 제거. 검증: preview 콘솔 에러 0, 3분할 레이아웃·강화/변이/스킬 탭·자동장착·스왑·해제·경기목록·전투 로드아웃(무기카드 스킬 자동 합류) DOM·실클릭 확인. (※ preview 스크린샷 도구는 이 환경에서 타임아웃 → DOM/스냅샷으로 검증.)

#### 2026-06-19 (후속) — 누락 로직/등급 가시성 점검 보완
새 관리창 도입 시 누락된 것 보완. (등급별 성능 차등은 로직상 정상: 카드 `cardInstanceEffects`가 주효과 등급 계수 스케일 + 서브특성 수(`subs`) 차등 / 스킬 `gradeGrowthSkill`이 위력 스케일 + A·S에 치명·자버프 부가. 카드 상세는 `cardEffectLabels`로 이미 노출.)
1. **방생 버튼 복구** — 새 `#upgradeModal`에 `releasePlant` 진입점이 없어 화분을 비울 방법이 사라졌던 회귀. `pm-body` 하단에 `#pmRelease` 추가·바인딩.
2. **스킬 등급 부가효과 가시화** — `openCardDetail` 스킬 분기에 `critBonus`/`selfBuff`(A·S 부가) + "등급 N — 위력·부가효과 강화" 줄 추가(카드처럼 등급 특징이 상세에 보이도록).
3. **각성(`awakened`) 알약** — `plantInfoPills`에 각성 시 ✦스탯 알약 추가(메인 좌측 패널·관리창 공통). 스탯 부스트는 기존대로 `p.mult`에 반영, 스프라이트 ✦도 유지.
- 미반영이지만 무방: 식물 `stability`/`mutation_rate`/`unlocked_trait_slots`는 현재 활성 전투·탐사 로직에 안 쓰이는 표시용 잔재라 생략해도 손실 없음. 옛 「무기고」(blade/cannon/shield)는 무기 변이 카드(검/도끼/총/방패)로 대체됨.

### 2026-06-19 — 모바일 진행도 유실 대책(세이브 백업/복원 + 네이티브 영구저장)
모바일 앱에서 진행도가 사라지던 문제(앱이 원격 GitHub Pages를 WebView로 띄우는데, 진행도가 WebView localStorage 한 곳에만 있어 캐시 삭제·OS eviction·재설치로 날아감)를 2단계로 대비.
1. **세이브 내보내기/가져오기(웹, 즉시 적용)** — 설정에 `#btnExport`/`#btnImport` + `#saveModal`. `encodeSaveCode`(JSON→`btoa(unescape(encodeURIComponent()))` 한글 안전 base64)·`decodeSaveCode`(base64 우선, 평문 JSON도 허용, 불량/빈값 거부). 복원은 `normalizeState` 거쳐 `saveState` 후 `renderMain`. APK 재빌드 없이 `git push`→Pages 배포만으로 앱 반영. (백로그의 "세이브 내보내기/가져오기" 항목 완료.)
2. **네이티브 영구저장(`@capacitor/preferences`)** — `saveState`가 `window.Capacitor.Plugins.Preferences` 있으면 미러 저장, 시작 시 `reconcileNativeSave`가 localStorage 비었으면 네이티브에서 자동 복구. `nativePrefs()` 가드로 일반 브라우저에선 기존 localStorage 동작 그대로(무회귀). `package.json`에 의존성 선언. **실제 적용은 빌드 머신에서 `npm install`→`npx cap sync android`→APK 재빌드 필요**(절차: [docs/android-capacitor-wrapper.md](docs/android-capacitor-wrapper.md) 8장).
- 검증: preview 콘솔 에러 0, 한글 포함 인코딩 라운드트립·복원 반영·UI 모달 전환 확인.
- **빌드:** 이 PC에 Node.js/Android Studio 설치 후 `npm install`(@capacitor/preferences@7.0.4)→`npx cap sync android`→`gradlew assembleDebug`로 디버그 APK 빌드 성공.

#### 2026-06-19 (후속) — 재부팅 시 초기화 버그 수정(클로버 방지)
재빌드한 APK에서도 **앱 나갔다 켜면 초기화**되던 문제. 원인: 부팅 시 ① `loadState`가 빈 localStorage→기본값 → ② `claimStarterSeed`가 `saveState` 호출 → **네이티브 백업을 기본값으로 덮어씀(클로버)** → ③ 그 뒤에야 `reconcileNativeSave`가 읽어 이미 망가진 백업으로 복구. 즉 백업을 읽기 전에 써버린 게 문제.
- 수정: `reconcileNativeSave` → **`bootWithSave`로 재구성** — 네이티브 백업을 **먼저** 읽어 복구한 뒤에 시작종자 지급/최초 저장. `nativeReconciled` 플래그로 **복구 완료 전엔 `saveState`가 네이티브에 절대 쓰지 않게** 가드. 초기화 코드(`bootWithSave()` 단일 호출)로 교체.
- **APK 재빌드 불필요**: index.html(JS)만 수정 → 앱은 원격 페이지를 띄우므로 `git push`→Pages 배포→앱 재실행이면 반영. 네이티브 플러그인은 이미 설치된 APK에 포함됨.
- 검증: preview에서 가짜 Capacitor.Preferences 주입 후 e2e — localStorage 유실+네이티브 백업 존재 시 복구(크레딧·한글 이름 복원, 백업 비덮어쓰기 확인), 진짜 새 게임 시 시작종자 지급+네이티브 최초 저장. 콘솔 에러 0.
- ⚠️ 미확인: 원격 페이지(GitHub Pages)에서 Capacitor 네이티브 브리지(`window.Capacitor.Plugins.Preferences`)가 실제 주입되는지는 실기기 확인 필요. 이 수정 후에도 재실행 초기화가 계속되면 브리지 미주입이므로, 게임을 APK에 **로컬 번들**(server.url 제거)하는 방향으로 전환해야 함.

### 2026-06-18 — 모바일 UI 클리핑/터치 보정 5종
사용자 피드백 기반 화면 정리.
1. **상점 하단 잘림** — `#shopModal .modal-card` 높이/패딩을 `env(safe-area-inset-top/bottom)`까지 차감(탐사 패널과 동일 방식). 제스처바·노치 기기에서 보급상자 마지막 줄이 하단 헤더 뒤로 잘리던 문제 해결.
2. **행성 이름 안 보임** — 기본 확대 `EX_DEFAULT_SCALE` 1.3→**1.0**, 궤도 반경 `EX_ORBIT_R` `{1:78,2:142,3:204}`→**`{1:56,2:100,3:132}`**로 축소해 8개 행성+이름이 한 화면(폭 360 기준)에 모두 들어오게. 가로 방향(angle ≈0/180°) 행성 라벨이 맵 가장자리에서 잘리던 것을 제거. `.explanet-label` 대비 강화(흰 글자·배경 진하게), 잠금 행성 라벨색 `#8a93a3`→`#b9c2cf`.
3. **행성 상세 탐사 버튼 고정/잘림** — `.exdet-foot`의 `position:sticky` 제거 → 버튼이 카드 스크롤 흐름 맨 끝(표 아래)에 붙어 더 이상 표를 가리거나 잘리지 않음.
4. **지역 터치 영역 = 지형 전체** — `.exreg`를 지형 블롭(타원, 맵의 44%×50%)으로 재설계: 블롭 전체가 버튼이고 지역명은 도형 중앙에 박스 없이 표기. 선택 시 네온 글로우. `.exdet-map`의 장식용 배경 블롭 제거(이제 지역 블롭이 곧 지형).
5. **강화창 하단으로 뜸** — `.modal-card` 세로 중앙정렬(`margin:auto`)이 콘텐츠가 길 때 상단을 잘라먹던 플렉스 버그 → `margin:0 auto`(상단 정렬)로 변경. `openUpgrade`에서 스크롤 0으로 리셋해 항상 상단부터 보이고 아래로 드래그.

### 2026-06-18 — 우주맵 이동/확대 복원 + 행성 축소 + 초기 크레딧 1000
탐사 우주맵 사용성 보정.
1. **이동/확대(마우스·터치)** — 궤도맵 콘텐츠(별·궤도·중앙 탐사선·행성)를 `.exmap-world`(`#exWorld`)로 감싸 `transform`(`exView`={x,y,scale})로 이동/확대. `applyExTransform`(스케일 0.55~2.6·이동 클램프), `bindExMap`(드래그=1포인터 pan / 핀치=2포인터 zoom / 휠 zoom), 우하단 `＋/－/⟳` 버튼(`#exZoomIn/Out/Reset`). **기본 확대 `EX_DEFAULT_SCALE=1.3`** → 안쪽 2궤도가 보이는 상태로 시작, 바깥 궤도는 드래그로 이동해 확인.
2. **행성 정보 팝업 위치** — 확대/이동에 맞춰 `exPopupHtml`을 인라인 좌표 대신 `exPositionPopup()`이 **선택 행성의 실제 화면 좌표**(getBoundingClientRect) 기준으로 앵커(위 공간 부족 시 `.below`로 뒤집기). `applyExTransform`가 매 변환마다 재배치.
3. **행성 크기 축소** — `.explanet-core` 46→30px(rare 34 / epic 38)로 탐사선 크기에 맞춤.
4. **중앙 탐사선 클릭** — 기존 격납고(`#exHangarOpenBtn`) 유지(전 작업분). pan 핸들러는 `.explanet`·`.exmap-center` 클릭을 제외해 버튼 동작 보존.
5. **초기 크레딧 1000** — `defaultState` 80→1000. 기존 세이브는 `normalizeState`에서 1회 보정(`starter_credit_1000` 플래그, 1000 미만이면 1000으로).

### 2026-06-18 — 탐사 시스템 대개편(탐사선 4스탯 작동 + 궤도 게이팅 + 종자/스킬 등급 + 소모품 폐지)
이전 재설계로 `EXPLORE_VIEW`(8행성/3궤도)가 라이브 화면이 됐지만 **탐사선 스탯이 아무 효과 없고 탐사는 무조건 성공**하던 사장 상태를, 실제 메커니즘으로 채움. 죽은 시스템(연료 소모·각종 저항·보관함·소모품)은 제거.
1. **탐사선 4스탯** — `newExplorerShip`/`SHIP_UPGRADES`를 `fuel_tank`(궤도 해금 레벨1~3)·`durability`(내구성)·`harvester`(채집기)·`scanner`(탐사장치)로 축소. 강화는 **크레딧 전용**(`shipUpgradeCost` 4트랙). 구 세이브는 `normalizeState`에서 4스탯으로 보정(내구성 보존). 저항·보관·연료 스탯·부품 시스템은 사장(정의는 남되 라이브 미사용). 내구도→**내구성** 명칭 통일.
2. **격납고 UI** — 궤도맵 중앙 🛰️(`#exHangarOpenBtn`) 클릭 → `exHangarHtml` 오버레이(스탯 + 4트랙 강화, `data-ship-upgrade`→`upgradeShipStat`). 구 `renderShipModRoom`/탐사상점 대체.
3. **궤도 게이팅** — `exOrbitLocked`: `행성.orbit > fuel_tank`면 잠금. `exPlanetNode`/`exOrbitRings`에 `.locked`(그림자) 처리, 연료탱크 강화 시 밝아짐.
4. **6단계 난이도** — `exDiffVsShip(region,planet)`: 지역 적정치(`exRegionNeed`=diff기반) vs 내구성·채집기 비율 → 매우쉬움~불가능. 궤도 잠금/스펙 대폭 미달=불가능. `exDetailHtml`에 난이도+예상 성공률 표기.
5. **성공/실패·보상** — `exploreViewRun` 재작성: `exSuccessChance`(내구성 위주), 실패=보상 0개. 성공 시 `exRewardCount`(채집기 위주). **아이템 보상 폐지**(종자+변이카드만). 보상 등급(D~S)은 `exRollRewardGrade`(지역 grade 중심·`scanner`가 상위 가중·행성 등급범위 클램프).
6. **행성 테마=카드 카테고리** — `EXPLORE_VIEW` 행성에 `cardTypes`(예 멸망폐허 아즈텔=무기·DNA / 우림 에르미아스=엽록체·DNA·포자 / 균사 카이렌=포자·물약). `grantThemedTraitCard`로 테마 카드만 지급.
7. **종자 등급=잠재력** — 발견 시 `createExplorationSeedEntry`에 `grade` 부여(=잠재력). 보관함/스펙감소 폐지(가방 무제한, 종자 스펙 종류별 고정·`mult=1`). 심을 때 `createPlantedPlantFromSeed`가 종자 등급을 **식물 잠재력**으로 사용(`p.potential`, 심기 후 등급결정 로직 제거). 등급 무관 심기 가능. `GRADES`에 D 추가.
8. **스킬 등급(1차)** — `ensureSkillFields`가 잠재력 기반으로 해금 스킬에 등급 부여(`rollSkillGrade`/`POTENTIAL_GRADE_BOOST`, `p.skillGrades`). `skillById`→`gradeGrowthSkill`로 위력 스케일 + 상위 등급(A/S) 부가효과 추가. 스킬명에 등급 표기.
9. **소모품→강화** — 소모품 아이템·상점 소모품 레인/상자·물약 판매 제거. 식물관리 `🧪 소모품` 탭 → **`🔧 강화`**(크레딧 전용 영구 스탯강화만). 검증: preview 콘솔 에러 0, 마이그레이션·궤도잠금·난이도·등급분포·강화탭 동작 확인.

### 2026-06-18 — 탐사 인터페이스 재설계(궤도 우주맵 + 행성 정보 팝업 + 지역 지도 상세)
기획 이미지(그림1·2·3) 기준으로 탐사 화면을 전면 재구성. 구버전 `openExploration`/`renderExploration`(우주맵 + 하단 시트 + 탐사선 개조실/상점)을 **새 정의로 덮어씀**(구 함수·헬퍼는 더 이상 호출되지 않는 사장 코드로 남김).
1. **궤도 우주맵(그림1)** — 중앙(🛰️) 기준 동심원 궤도 3개. 각 궤도에 **여러 행성 배치 가능**(궤도1:2 / 궤도2:3 / 궤도3:3, 총 8행성). 행성은 극좌표(`exPlanetXY`: 궤도 반경 `EX_ORBIT_R` × 각도)로 배치. 표시 전용 데이터 `EXPLORE_VIEW`(행성: 궤도·각도·색·소개·지역[], 지역: 속성`el`·타입`types`·난이도`diff`·등급`grade`·크레딧·지도좌표·설명·`link`).
2. **행성 정보 팝업(그림2)** — 행성 터치 시 작은 창(`exPopupHtml`): 표로 **궤도/등급/난이도/속성/타입**. 속성·타입은 **아이콘만**(속성=`ELEMENTS[].icon`, 타입=`EX_TYPE_ICON` 🌿🌳🌸🌵🍃). 등급은 지역들의 범위(`exGradeRange`, 예 D~C), 난이도도 범위(`exDiffRange`, 예 쉬움~보통). 빈 공간(`#exPopBackdrop`)·X로 닫기. 하단에 **행성 이름 버튼** → 상세 열림. 행성이 화면 위쪽이면 팝업이 아래로 뒤집힘(`.below`).
3. **행성 상세 — 지역 지도(그림3)** — `exDetailHtml`: 최상단 가로 박스(행성명·한줄 소개·우측 `궤도 N / 등급 D~C`), 그 아래 **지역 지도**(지역명 버튼 배치). 지역 터치 → 아래 **설명 + 지역명 박스 + 표(속성/타입/난이도)** 표시, 선택 지역에 **📍 마커**. 선택 전엔 표가 빈 상태(안내문). 최하단 **탐사 버튼 + 소모 크레딧**. X/빈 공간으로 닫기.
4. **탐사 동작** — `exploreViewRun`: 표시 크레딧만 차감하고(연료·탐사선 조건 게이팅 제거) **실제 보상은 `region.link`(기존 지역 id)로 `rollExplorationRewards` 호출** → 종자/아이템/변이 카드 지급. 이동 연출(`exTravelOverlay`) 후 결과 카드(`exResultHtml`: 획득 종자/아이템/카드 + 종자 가방으로/계속 탐사).
   - 탐사선 개조실·탐사 전용 상점·하단 시트·줌/팬 등 구 UI는 새 화면에서 진입점 제거(코드는 잔존). 행성/지역/탐사선 상세 데이터는 추후 재정비 예정.

### 2026-06-18 — 생장단계 외형 재설계 + 속성·이름·외형 일치 + 진화 연출 + 단계별 스킬 확장
1. **속성 테마 × 생장단계 외형 통합 생성기** — `ELEMENT_PALETTE`(속성별 색)·`elementMotif()`(속성 모티프: 불꽃·물방울·잎·암석·바람결·번개·눈결정)·`composePlantBody()`/`composePlantSvg()` 재작성. 씨앗→새싹→유체→성장체→성체→완숙체로 실루엣이 점점 자라고(완숙체엔 오라+✦), 속성이 색·모티프로 한눈에 드러난다. 식물타입(grass/tree/flower/cactus/vine)은 기본 형태로 유지.
2. **속성·이름·외형 불일치 해결** — 원인은 `buildEnemy`가 종(species)과 속성(element)을 따로 랜덤 추출한 것("윈드리프-번개-물외형"). 이제 **속성=종의 고정 속성**(`el=SPECIES[sp].element`)으로 묶고, 적도 `seedType`+`growth`를 받아 플레이어와 동일한 `spriteFor`로 렌더 → 적도 생장단계·속성이 외형에 반영. 구 `svgPlant`(종별 머리 도안)는 `SPECIES_SEEDTYPE` 매핑으로 통합 생성기에 위임하는 래퍼로 축소.
3. **진화 연출 팝업(`#evolveModal`)** — 물·비료·영양제(`applyGrowthAction`·`useItem`)로 단계가 오르면 `feedGrowth()`가 진화 모달을 띄움: 새싹 스프라이트가 **하얗게 변하며**(CSS `evoFlash`) 다음 형태로 변신(`evoReveal`+`evoBurst` 섬광). 아래에 **좌측=기존 값 / ▶ / 우측=변화 값(증감 표기)** 2열 스탯 비교(`statDiffRowsHtml`)와 **새로 획득한 스킬** 목록 표시. 전투 승리 성장은 결과창과 겹치지 않게 팝업 생략.
4. **생장 단계별 스킬 확장** — `plantKnownSkillIds` 재설계 + `ELEMENT_GROWTH_SKILLS`(속성별 4종). 단계마다 기본기 + 속성 맞춤 스킬을 1개씩 추가 해금(새싹 3종 → 완숙체 ~10종)로 다양화. 로드아웃 최대 6칸은 유지.

### 2026-06-18 — 변이 카드 등급(S~D) + 변이형별 보급상자 + 무기 스킬 재설계
변이(형질) 카드 시스템을 등급제로 확장하고 장착 제한·상점·UI를 정리.
1. **카드 등급 S~D 도입** — `CARD_GRADES`/`CARD_GRADE_META`(등급별 주효과 계수 `mult` + 서브 특성 수 `subs`). 카드 보유/장착 키를 `"카드ID@등급"` 인스턴스 키로 변경(`cardKeyOf`/`parseCardKey`/`cardDefOf`). 등급이 높을수록 주 효과↑ + 서브 특성(공/방/기동성/체력/치명/흡혈/반사/재생/에너지/적 방깎 — `SUB_FX`)이 카드별 `subPool` 앞쪽부터 N개 부여. `cardInstanceEffects()`로 등급 스케일 계산, `cardEffects()`가 집계, `cardEffectLabels()`로 표기. **기존 세이브 자동 마이그레이션**(`normalizeState`): 구 키 → `@C`.
2. **장착 제한 정상화** — 각 변이형 전용 카드는 그 변이형만, **공통은 전부** 장착 가능(`cardFitsForm`). 모두가 장착 가능했던 **독초 물약(POTIONS) 시스템 폐지**(상점 판매·강화창 장착 UI 제거, 로드 시 `p.potion=null`). 독성은 이제 독성 변이형의 물약 카드로만.
3. **상점 정리** — 무작위 **변이 카드 뽑기(가챠) 제거**, **독초 물약 블록 제거**. 변이 카드는 **변이형별 보급상자**(공통/DNA 변조 키트/무기/물약/포자/엽록체 — `box_card_*`)나 탐사 보상으로만. 보급상자는 해당 변이형 카드만 나오고 **등급은 개봉 시 무작위**(`rollCardGrade`, `box.gradeBoost`). 확률표에 등급 분포 표기.
4. **카드 성능 버프** — 모든 카드 base 수치 상향 + 등급 계수 적용.
5. **무기 변이형 스킬 = 에너지 무소모 + 경기당 횟수 제한** — 무기 카드/무기고 스킬에 `noEnergy:true` + `uses`(등급↑ 시 횟수↑). 전투에서 에너지 차감 대신 `unit.uses` 차감, 소진 시 버튼 비활성(`makeCombatant`·`applySkill`·`renderMoveButtons`·`updateBars`·`playerSkill`·`aiPickSkill`). 위력은 `gradeCardSkill`로 등급 스케일.
6. **UI** — 하단 헤더 가운데(식물·전투) 버튼: 열린 팝업 전부 닫고 메인 복귀(`closeAllModals`). 식물을 눌러 강화창을 열면 **항상 소모품 탭**으로 시작(`openUpgrade`에서 `upgradeTab='consum'`).

### 2026-06-17 — 상단 인터페이스 재설계 + 식물별 티어 시스템
메인 상단을 기획 이미지(클래시 로얄/스쿼드버스터즈식)대로 재구성.
1. **재화 헤더 신설(`#topHeader`)** — 화면 최상단 `position:fixed; z-index:70`으로 고정.
   상점/탐사/모드 등 **하단 헤더로 이동(모달 오버레이)해도 항상 위에 떠 있음**(모달들은 `padding-top`으로 헤더 아래에서 시작, 전체화면 패널 shop/exploration은 `height` 차감). 전투·타이틀 화면에선 부모(`#mainScreen`)가 `display:none`이라 자연히 숨겨짐.
   - 좌: 플레이어 레벨 + 경험치 바(`player_exp` / `playerExpNeeded()`, `gainPlayerExp()`). 전투 승리 시 레벨 직접 +1 → **경험치 누적 방식으로 변경**.
   - 중앙: 💰크레딧 | 💠미네랄. 우: ⚙️설정.
2. **프로필 배너(`#profileRow` 좌측 1/3, `#profileBanner`)** — 터치 시 **프로필 팝업(`#profileModal`, `openProfile()`)**.
   이름(수정 `editProfileName()`)·프로필 이미지(식물 도트 3종)·배너 이미지(풍경 도트 3종) 변경, 하단 2×2 통계(승리/패배, 최고 티어/최고 진출). 도트 아트는 `pixelSvg()` + `PROFILE_ART`/`BANNER_ART`.
3. **식물 목록을 배너 우측 2/3로 이동** — `#collectionBar`를 2행 가로 스크롤 그리드로.
4. **티어(등급)를 전역 → 식물 개체별로 이관** — `p.rankTier`/`p.rankPoints`/`p.bestRoundIdx`/`p.champion`. `plantRankTier(p)`, `nextRankThreshold(p)`, `topTierPlant()`, `bestRoundLabel(p)`. 상대 난이도(`buildEnemy`)·토너먼트명·점수 적립(`endMatch`)·승급(`checkPromotion(p)`)이 **선택된 식물의 티어 기준**. 본선 라운드 승리마다 `round.point` 적립.
   - 상단의 랭크 표시 제거. 대신 전투 버튼 위 토너먼트 바 **맨 우측에 티어 + (현재 점수 / 다음 티어 임계값)** 셀(`.tb-tier`) 추가.
   - `state.wins/losses`, `profile_name/profile_image/banner_image` 신설. **기존 세이브 자동 마이그레이션**(`normalizeState`): 구 전역 `rankTier`를 보유 식물 각각의 시작 티어로 이관.
5. **전투 매칭(VS) 인트로** — 전투 시작 시 바로 싸우지 않고 매칭 연출(`#vsIntro`, `playVsIntro()`, `startMatch` 끝에서 호출). 가운데 토너먼트명 → 슬래시+VS 팝 → 상대 배너(위·좌에서)·내 배너(아래·우에서) 슬라이드 인 → 화면이 위아래로 쪼개지며 전투 공개. 순수 CSS 키프레임(`vsInL/R`,`vsName`,`vsSlash`,`vsPop`,`vsHalfUp/Down`) + JS 타이머로 약 2.5초. `prefers-reduced-motion` 대응.
7. **스킬 위력 표기를 "공격 배수"로 통일** — 스킬 desc의 `위력 N`은 실제 피해가 아니라 계수(공격×N%)라 혼동을 줬음. 상대 방어까지 계산한 실제 피해는 정보 과다라, 대신 **공격 배수**만 표기: `×1.35(공격력)`, 원소기는 `×1.7(공격력) / ×1.0(속성)`. 핵심: `coefStr()`·`skillCoefLabel()`·`skillCoefDesc()`(스킬 객체용)·`coefifyText()`(임의 문자열용). 적용처: 전투 무브 버튼·강화창 스킬 탭(`skillCardHtml`)·특성 카드 desc. (PRED_TYPES.sub·WEAPONS.desc·트레잇/패시브 desc엔 `위력` 미표기라 무관)

6. **데미지 밸런스 — 기본 공격 약화 문제 보정** — 고정 방어 차감(`raw − def`) 방식이 저위력 공격(기본공격 위력100)을 1까지 무력화해(특히 방어형 종은 1타 1뎀) 기본공격이 무의미하던 문제. 기본공격 위력 100→**135**·단일 명중 페널티 제거, 데미지 공식에 **원 피해의 25% 하한선**(`applySkill`, `dm=max(raw*0.25, raw−def)`) 추가. 원소·잠재 스킬은 위력이 높아 하한선이 거의 안 걸려 기존 균형 유지(기본공격만 실효 데미지 약 2배↑).

### 2026-06-16 — 특성 카드 시스템 구현
형질을 3종 → **7종**(일반/포식/무기/독성/포자/발광/용족)으로 확장하고, **특성 카드 장착칸 5개**를 신설.
형질별로 장착 가능한 카드 카테고리가 다름(공통/DNA/무기/물약/포자/엽록체). 핵심 코드: `FORMS`,
`TRAIT_CARDS`, `CARD_SKILLS`, `formCardPool()`, `cardEffects()`, `makeCombatant`(카드 효과 합산),
`renderTraitTab()`(장착 UI), `rollForm()`(새 형질 분화).
- 무기/물약 카드 → 전투 스킬 자동 장착(검/방패/도끼/총/강산/가스)
- 포식형 DNA → 포식 스킬 흡혈·공격력·에너지 강탈 강화
- 독성형 독가시 → 모든 공격에 독속성 추가 피해(`poisonCoef`)
- 포자형 → 매 턴 마비/중독/방해 발동(`tickStatuses`)
- 발광형 → 턴당 에너지·체력 회복
- 기존 세이브 무회귀: `equipped_trait_cards`가 비면 전투가 종전과 100% 동일.
- 상세 설계·잔여 항목: [`docs/trait-growth-roadmap.md`](docs/trait-growth-roadmap.md)

### 2026-06-15 — 기획서 기반 대규모 업그레이드
원본은 `바탕 화면/풀로세움 기획서.pdf`(= `_analysis/pdf_pages/page_01~09`). 이 기획서를 기준으로 비어 있던 부분을 채웠다.

**시작 상태:** 탐사·종자·성장 시스템은 잘 구현돼 있었으나 ▲전투가 고정 4스킬이라 종자의 특성(20종)이 전투에 전혀 반영되지 않았고 ▲콜로세움인데 토너먼트가 아니라 단순 "제N전" 무한전투였음.

**이번에 한 작업:**
1. **속성 상성표**를 기획서의 약점표와 정확히 일치하도록 수정 (`eff()`, `ELEMENTS`).
2. **스킬 시스템 신설** — 식물이 속성+특성+생장단계에 따라 스킬을 얻고, **최대 6개 로드아웃**을 장착해 전투(클래시 로얄식). `UNIVERSAL_SKILLS / ELEMENT_SKILLS / TRAIT_SKILLS / FORM_SKILLS`, `TRAIT_SKILL_MAP`, `plantKnownSkillIds()`, `defaultLoadout()`, `ensureSkillFields()`.
3. **특성 패시브 + 상태이상 엔진** — 데이터의 `battle_effects/stat_modifiers`를 실제 전투에 적용(재생/흡혈/반사/방깎/보호막/치명상생존 등). 버프·디버프·지속피해(중독🟣/출혈🩸/화상🔥). `plantPassives()`, `applySkill()`, `tickStatuses()`.
4. **전투 전면 재작성** — 로드아웃 기반 + 특성효과 + 속도순 행동 + 항복 버튼.
5. **토너먼트 콜로세움** — 예선(3판2선)→16강→8강→4강→결승. 우승 시 랭크 포인트로 **브론즈→실버→골드→플래티넘→다이아→마스터→풀로세움** 승급. 토너먼트명은 생장단계+랭크로 자동 생성(예: "새싹 브론즈 토너먼트"). `RANK_TIERS`, `TOURNAMENT_ROUNDS`, `startMatch()`, `endMatch()`.
6. **전투 승리 → 성장 경험치** 지급(`gainGrowthExp()`)으로 전투↔성장↔스킬해금 연결. 생장단계가 오르면 전투 능력치도 강해짐(`GROWTH_STAT_MULT`).
7. **식물 관리 3탭**(소모품/특성/스킬) — `renderUpgrade()` 재구성. 스킬 로드아웃 편집, 특성 패시브 표시, 탐사로 얻은 **아이템 사용** 기능화(`useItem()`).
8. **하단 헤더 5탭** 신설 — 상점 / 탐사 / 식물·전투(중앙) / 모드🔒 / 길드🔒. 기존 플로팅 버튼 제거. 모드·길드는 미개발 잠금 모달.
9. **탐사선 이동 애니메이션** 추가 — 탐사 시작 시 탐사선이 행성으로 이동하는 연출 후 결과 팝업(`showExploreTravelOverlay()`, `executeExploration()`).
10. **데이터 인라인 내장** — `data/alien-plant-pvp-data.js`를 `index.html` 안으로 옮김. `file://`(더블클릭)로 열 때 외부 스크립트가 로드 안 돼 "탐사 데이터 없음"이 뜨던 문제 해결. **이후 데이터 수정은 index.html 내부에서.**
11. 성장 단계 명칭을 기획서대로(유체/완숙체) 정리. 기존 세이브 자동 마이그레이션 처리.

**백업:** `index.html.bak` = 모든 변경 이전의 최초 원본.

**git/GitHub:** 이 시점에 git 저장소 생성 후 `promuzi/pulloseum`에 올림. 협업 흐름: 작업 전 `git pull`, 후 `git push`.
