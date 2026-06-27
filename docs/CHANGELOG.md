# 풀로세움 변경 이력 (개발 로그)

> CLAUDE.md에서 분리한 전체 개발 로그. 최신 작업이 맨 위. 과거 맥락이 필요할 때만 읽으세요.

### 2026-06-27 — 덩굴 픽셀 고디테일 변이형 히어로 (#3, 42/42 재제작)
- 사용자 요청("각 변이별 개성 확실히·더 크고 디테일하게")로 덩굴 격자를 **고해상 변이형 히어로**(cell 1.7 ~36×52)로 전면 교체. 구조: `SPECIES_PIXELS` 개별 격자 → **`VINE_FORM_PIXELS`(변이형 히어로 6장) + 종→변이형 매핑**(index.html 1225줄→272줄).
- 6 히어로: base=잎 가지덩굴 / toxic=반점 독주머니+가시 / pred=이빨 포충낭(어두운 아가리) / weapon=금속 낫+갑옷 / dragon=뿔·얼굴·막날개·비늘 / normal=꽃관+넓은 잎. **개성=변이형 실루엣, 속성=리컬러.**
- 42종 콘택트시트로 변이별 구분 실측 · 구조색 불변 · `__catalogSelfTest()` 0 fail · 런타임 픽셀화 게이팅 유지.

### 2026-06-27 — 픽셀 격자 배치 7: normal 7속성 → 덩굴 42/42 완성 ✅ (#3)
- `green_vine`/`glow_vine`(발광끝)/`kelp_vine`(드리운)/`terra_vine`(넓은)/`aero_vine`(성긴)/`dynamo_vine`(뾰족)/`ever_vine`(침엽) — 잎 배열 변주 + 속성 리컬러.
- **덩굴 타입 42개체 전부 손그림 픽셀 격자 완료** = base(비변이) + **5 변이형**(일반·포식·무기·독성·용족) × 7속성. ⚠️ 비버섯 종의 변이형은 5개(포자=버섯 전용·발광=폐지라 제외). 실루엣(base=잎 / 독성=독주머니 / 포식=아가리 / 무기=칼날·곤봉 / 용족=뿔날개 / 일반=무성잎)으로 모양=정체성, 속성은 리컬러만. 셀프테스트 0 fail. 다음 타입=다육(cactus).

### 2026-06-27 — 픽셀 격자 배치 6: dragon 7속성 (#3, 누적 36/42)
- `draca_flame`/`draca_tide`/`draca_thorn`/`draca_root`(무날개 육중)/`draca_wind`(큰 날개)/`draca_glace`/`draca_vine` — 용족 뿔·날개·비늘띠, 날개 크기·뿔 변주 + 속성 리컬러. 셀프테스트 0 fail.

### 2026-06-27 — 픽셀 격자 배치 5: toxic 7속성 (#3, 누적 30/42)
- `venom_weed`/`blight_vine`(시든)/`tox_kelp`(이중)/`swamp_vine`(진흙혹)/`spore_vine`(포자분출)/`acid_vine`(산액방울)/`tox_vine`(결정) — 독주머니 변주 + 가시 줄기 공통. 셀프테스트 0 fail.

### 2026-06-27 — 픽셀 격자 배치 4: pred 7속성 (#3, 누적 24/42)
- `carni_vine`/`leech_vine`(빨판)/`root_eater`(송곳니빗)/`wind_ripper`(갈래부리)/`blood_weed`(넓은 아가리)/`volt_leech`/`frost_leech`(고드름송곳니) — 포식형 아가리 변주 + 속성 리컬러. 셀프테스트 0 fail.

### 2026-06-27 — 픽셀 격자 배치 3: weapon 7속성 (#3, 누적 18/42)
- `whip_vine`/`kelp_whip`/`thorn_whip`/`root_club`(곤봉)/`wind_whip`(갈래)/`volt_whip`/`frost_whip` — 무기형 안에서 곤봉·채찍·칼날 실루엣 차별 + 속성 리컬러. 셀프테스트 0 fail.

### 2026-06-27 — 픽셀 격자 배치 2: normal 템플릿 + base 7속성 (#3, 누적 12/42)
- `green_vine`(normal=무성한 둥근 잎) + 기본 덩굴 6속성 — **속성마다 잎 모양을 다르게**(불=뾰족 불꽃잎·물=둥근 물방울잎·대지=넓은잎·바람=휜잎·번개=들쭉 번개잎·빙결=각진 결정잎)로 "색만 구분 금지" 준수. **6개 그룹(base + 5 변이형) 템플릿 전부 확보.** 콘택트시트 실측·`__catalogSelfTest()` 0 fail.

### 2026-06-27 — 픽셀 격자 양산 배치 1: 덩굴 변이형 템플릿 3종 (#3, 누적 5/42)
- 화풍 사용자 승인(고해상 cell=1.8) 후 양산 착수. 변이형(form)이 실루엣을 결정하는 원칙으로 **변이형별 템플릿** 추가: `carni_vine`(포식=이빨 포충낭/아가리)·`whip_vine`(무기=칼날+미늘 채찍)·`draca_flame`(용족=뿔+막날개+비늘띠). 앞선 파일럿(`thorn` base·`venom_weed` toxic) 포함 **6개 그룹(base + 5 변이형) 중 5개 템플릿 확정**(남은=normal 변이형).
- 5종이 서로 완전히 다른 실루엣으로 구분(모양=정체성)·속성 리컬러 불변 — Chromium 콘택트시트 실측. `__catalogSelfTest()` 0 fail·게이팅 유지.
- 다음: normal 템플릿 + 덩굴 나머지 37종(템플릿 변주) → 타입별 묶음.

### 2026-06-27 — 개체 손그림 픽셀 격자(redraw) 인프라 + 덩굴 파일럿 2종 (#3)
- **배경/결정:** "모든 개체 외형 바꾸기"에 두 접근이 충돌 — ① 런타임 픽셀화(절차 SVG 자동 도트화, 같은 타입+속성=색만 다름) ② main 확정 설계의 **개체별 손그림 격자 175장**(🚫 색·효과만의 구분 금지·정체성=모양 하드 원칙). 사용자 결정 = **redraw 채택 + 런타임 픽셀화는 폴백으로 공존**. 설계=[redraw spec](superpowers/specs/2026-06-27-pixel-sprite-individual-redraw-design.md).
- **인프라:** `STRUCT_PALETTE`(O 외곽·S/s/H 금속·W/w 목질·K/k 상아 = 속성 무관 고정색) + `elementBodyPalette(el)`(B/b/l 본체·F/f 기운 = 속성 팔레트) + `speciesPixelPalette` 합성 + `SPECIES_PIXELS` 레지스트리 + `renderSpeciesPixels`(바닥 base y96·중심 x=60 자동 정렬, gi3 축소, 기존 `pixelArt` 재사용).
- **`composePlantSvg` 분기:** 등록 종 + `gi>=3`(성장체↑) → 픽셀 경로(`featuresSvg`/`markingSvg`/variant 색필터 **스킵** — 사용자가 "지저분"하다던 랜덤 부속 제거), svg에 `data-pixelgrid` 표식. 초반 3단계·미등록 종은 기존 절차 폴백.
- **공존 게이팅:** 런타임 픽셀화 사후 패스(`applyPixelArt`)가 `data-pixelgrid` 격자는 **재픽셀화 스킵**(블러 방지). 손그림 격자=정체성 / 런타임 픽셀화=아직 안 그린 종 임시 도트.
- **덩굴 파일럿 2종:** `venom_weed`(곧은 가시 줄기+독주머니)·`thorn`(가시 줄기+잎 둘, 독주머니 없음), cell=2. **실루엣으로 구분**(모양=정체성) + 불/풀 리컬러 시 **구조색 불변·본체색만 변경** Chromium 실측.
- **검증:** `__catalogSelfTest()` **0 fail**(픽셀 경로/폴백·속성 리컬러 불변 케이스 추가) · 게이팅(런타임 픽셀화가 격자 미교체) · 페이지 에러 0.
- **다음:** 사용자 화풍/해상도 확인 → 덩굴 나머지 40종 → 타입별 묶음(다육→화초→목본→버섯, 버섯 보류).

### 2026-06-27 — 전체 픽셀(도트) 통일: 모든 개체 외형 런타임 픽셀화 (#3·#16 1·2단계, 이후 redraw 폴백으로 격하)
- **배경:** 175개체×6단계 외형이 전부 `composePlantSvg`의 부드러운 벡터 SVG라 픽셀 폰트·도트 톤과 어긋났다. 손그림 PNG로 전부 교체하면 1,000장+ 필요 → 비현실적. 설계 #16의 D2(엔진 런타임 픽셀화)로 **자산 0개로 전 개체를 일관된 도트로** 전환. 설계=[pixel-art-unification spec](superpowers/specs/2026-06-26-pixel-art-unification-design.md) §7 1·2단계.
- **규정(1단계):** `:root --px:3px`(온스크린 도트 1칸) + 전역 제한 팔레트 `PIXEL_PALETTE`(7속성 `ELEMENT_PALETTE` 램프 5색 + 중립색 ≈24색, `ELEMENT_PALETTE` 직후).
- **엔진(2단계):** `pixelizeSvg(svg,size,cb)` = SVG→`Image`→offscreen 캔버스 `round(size/--px)` 격자로 다운샘플 → ImageData 색을 `PIXEL_PALETTE` 최근접 스냅(불투명만) → `toDataURL` → 표시는 `image-rendering:pixelated` 정수배 확대. **외형 마크업 해시로 캐시**(외형당 1회만 굽기, 캐시 히트 동기 반환).
- **사후 패스(비동기 분리):** 렌더는 기존대로 동기 SVG 주입 유지(셀프테스트·dex 동기성 무영향) → `MutationObserver`(rAF 디바운스)가 `.ss-plant`/`.plant-layer`의 내부 SVG만 픽셀화 `<img>`로 교체(`data-px` 플래그로 피드백 루프 차단). **화분 레이어(`.ss-pot`)는 이미 픽셀 그리드라 제외.** 정상 부팅에서만 옵저버 기동(`startPixelArtObserver`), `__DEX_MODE`·`state.pixelArt===false`면 미동작. (후속: 손그림 격자(redraw)가 생긴 종은 `data-pixelgrid` 표식으로 재픽셀화 스킵 → 런타임 픽셀화는 "아직 안 그린 종" 폴백으로 격하됨.)
- **검증(Chromium/Playwright):** `__catalogSelfTest()` **0 fail** · 변이종(`spore_cap`, hue-rotate 인라인 필터) 래스터화 성공 + **캔버스 오염 없음**(dataURL 정상) · 캐시 동기 히트 · 타이틀/인게임 식물 레이어 전부 픽셀화·화분 0개 픽셀화(올바른 제외) · dex 모드 옵저버 미실행·`__DEX_API` 정상 · 페이지 에러 0.
- **비범위(후속):** UI 토큰화(버튼·카드·HP바)=3단계, AI 그림(`SPRITE_OVERRIDES`+`assets/`+sw.js)=4단계, 모션 엔진=5단계, 사운드=6단계.

### 2026-06-26 — 이중 변이 버섯 28종 (포자 + 두 번째 변이) + 다변이 엔진
- **배경:** 버섯은 전부 포자 단일 변이였음. 처음으로 **변이 2개**를 가진 종(포자 + toxic/pred/weapon/dragon)을 도입해 버섯 도감을 7→35종으로 확장. 설계=[spec](superpowers/specs/2026-06-26-spore-variant-rework-dual-variant-mushrooms-design.md) · 계획=[plan](superpowers/plans/2026-06-26-dual-variant-mushrooms.md).
- **다변이 엔진(공존, 융합 메커니즘 없음):** 포자가 6변이형 중 유일하게 전용 스킬을 안 주는(매턴 발산 패시브) 변이라, 두 번째 변이를 그대로 얹어도 스킬 칸이 안 터짐 → **`cardFitsForm`·`variantSkillsOf`를 `p.form`(단수) → `base_variants` 전체로 확장**(헬퍼 `formsOf`). 다변이 종은 포자 카드 + 두 번째 변이 카드를 둘 다 장착 가능하고, 두 번째 변이 전용 스킬(포식기/주입·분사/비늘·브레스)이 하단 변이 바에 노출. 문자열 form 호출 하위호환 유지.
- **28종:** `baseVariants:['spore',X]`, 버섯 저스탯 유지(type=mushroom→`applyVariantIdentity` 제외). 단계 스킬 g/m/e(독=중독·방깎 / 균사=흡혈 / 갓=관통 / 룡=브레스 충전 j+방출 m/e) 91개를 멱등 생성기 `scripts/gen-dual-mushrooms.js`로 마커 블록에 주입.
- **포자 발산:** 매 턴 끝 발산을 **항상 표시**(효과 미적중 턴도 "포자를 흩뿌렸다" 로그), 효과별 적중 확률은 유지 → 밸런스 무변경.
- **외형 1차:** varKey 기반 `plantVariant`가 28종 자동 차별 + 두 번째 변이별 포자색 글로우 액센트(독록/핏빛/강철/주홍, 가산 오버레이). 순수 버섯·기존 렌더 무변경.
- **분포:** `released:false` + `MUTANT_SIGNATURES` 속성별 지역 7곳에 변이 4종씩(지역 발견으로만 획득).
- **검증:** `__catalogSelfTest()` 0 fail(카드 게이트·변이 스킬·분포 누락0·외형 액센트 셀프테스트 추가). preview 실제 plant(`spore_pred_water`) 통합: form=spore·base_variants=['spore','pred']·포식기 노출·포자+포식 카드 적격·무기 카드 거부 확인.
- **후속(같은 날):** 새싹·유체가 공용 `spore_burst` 플레이스홀더였던 것을 변이×속성 **고유 `.s`(새싹)·`.j`(유체)** 스킬로 교체 → 28종 전 단계(s/j/g/m/e)가 개체별로 갈림(다른 개체와 동일 구조). 스킬 91→140개. 생성기 `gen-dual-mushrooms.js` 갱신·재실행, 전 단계 resolve·0 fail.
- **보급상자·열매 획득 경로 점검(같은 날):** 이중 버섯이 두 보상계에 온전히 들어가는지 검증. ① **보급상자** — 두 번째 변이 카드(spore/potion/dna/weapon)는 전부 기존 `box_card_*` 드롭 풀에 이미 등록(누락 0). dragon 카드는 애초에 0종(용족=스킬형, 박스 불필요). ② **씨앗** — 28종 `released:false` + `MUTANT_SIGNATURES`로 탐사 지역 시그니처에서 획득(`rollSpeciesFromView` 2000회 시뮬로 균사 회랑서 4변이 전부 등장 실측). ③ **열매 본인스킬 보상 갭 발견·수정** — `rollFruitReward`/`nurserySkillReward`가 `fake`에 **`species`를 빼고** `plantKnownSkillIds`를 호출해 **개체 고유 스킬(`ind.*`)이 열매로 절대 안 나오던** 버그(이중 버섯뿐 아니라 기존 175개체 전부). `species`/`base_variants`를 통과시켜 수정 → dual 버섯 고유 스킬이 열매로 나옴(species 있을 때 249/400, 없을 때 0/400 실측). 회귀 셀프테스트 추가.

### 2026-06-26 — 죽은 코드 정리 1차: 구버전 renderExploration 3종 + bindSpaceMapInteractions 제거 (438줄)
- **배경:** 위 격납고 UI 작업 중 `renderExploration`이 **4번 재정의**(마지막 9233/현 ~8869만 활성)됨을 발견 — 계획서가 이 죽은 코드에 속았다. 사용자 요청으로 정리 착수("지금 바로 조심스럽게").
- **제거:** 구버전 `renderExploration` 3종(함수 선언 #1 + space-map-world 재정의 #2 + try/catch 래퍼 #3)과 그들만 쓰던 `bindSpaceMapInteractions`·`renderExplorationUnsafe`를 삭제(438줄). **참조 그래프 검증:** 이 블록은 서로(+자신)만 참조하고 라이브 `ex*` 경로(`exHangarHtml`/`exploreViewRun`)는 전혀 안 씀(닫힌 죽은 클러스터). `openExploration`(라이브 진입점)은 보존.
- **strict 안전:** `'use strict'` 하에서 선언 없는 `renderExploration = function(){}`(라이브 override) 할당이 깨지지 않도록 **선언 보존용 1줄 스텁** `function renderExploration(){}`만 남김(현재 "선언+override" 패턴과 동일).
- **검증:** `__catalogSelfTest()` 0 fail · preview 라이브 탐사 정상(`.exmap` 렌더)·격납고 콜아웃4·연결선4. 내 변경만(1 insertion/437 deletions).
- **남은 후속:** 이제 고아가 된 헬퍼들 → **아래 정리 2차에서 제거.**

### 2026-06-26 — 탐사 모달 닫기 ✕ 버튼 강화창과 통일
- 격납고(`.exhangar-x`)는 `btn` 클래스가 붙어 일반 버튼 룩, 지역 상세(`.exdet-x`)는 흐린 반투명 원으로 **제각각**이라 이질적이었음.
- 둘 다 **강화창 `pm-close`와 동일 룩**으로 통합(원형 30×30·어두운 배경 `rgba(0,0,0,.3)`·하늘색 ✕ `#9fd9ff`·파란 링 `box-shadow 0 0 0 1.5px`, 우상단 절대배치). 격납고 버튼에서 `btn` 클래스 제거. `.exdet-x` 옛 규칙은 통합 규칙으로 일원화.
- 검증: preview 실측 — 격납고 ✕ bg `rgba(0,0,0,.3)`·color `#9fd9ff`·box-shadow 파란 링·원형 30×30·우상단(우11·상11)로 pm-close와 일치.

### 2026-06-26 — 죽은 코드 정리 2차: 고아 탐사 헬퍼 제거 (265줄)
- 정리 1차로 호출자가 사라진 고아 함수들을 제거: `renderRegionBriefPopup`·`renderRegionDetail`·`renderPlanetPopup`·`renderInventoryPreview`·`renderExplorationResult`(Region B 144줄) + `upgradeScanner`·`upgradeSeedStorageCapacity`·`upgradeSeedStorageEnvironment`·`showExploreTravelOverlay`·`runExploration`·`executeExploration`(Region C) + 죽은 `shipSummaryStats` 중복(7766, 7787 라이브에 덮임).
- **라이브 보존(중요):** Region C 한가운데의 `let explorationBusy = false;`는 **라이브 `exploreViewRun`이 쓰는 변수**라 보존(블라인드 삭제 방지). `createSeedInventoryEntry`(스타터 종자)·`openExploration`(진입점)도 보존. 콘텐츠 앵커 splice(7개 앵커 전부 유일성 확인 후).
- **검증:** `__catalogSelfTest()` 0 fail · `explorationBusy`(boolean)·`createSeedInventoryEntry`(function)·`exploreViewRun`(function) 보존 확인 · 삭제분(`runExploration`/`executeExploration`/`upgradeScanner`/`renderRegionBriefPopup`) 전부 `undefined` · 라이브 탐사(`.exmap`)·격납고(콜아웃4·연결선4) 정상.
- **1·2차 합산:** 죽은 탐사 코드 ~703줄 제거. **남은 소량 고아**(`renderShipModRoom`·`renderShipSummary`·`renderShipUpgradeCard`·`explorationFuelCost`)는 라이브 ship 헬퍼와 인접해 위험 대비 이득 낮아 보류(무해·미호출).

### 2026-06-26 — 탐사선 격납고 개조실 UI 재설계 (중앙 탐사선 SVG + 사방 4콜아웃 연결선 + 강화 레벨 Lv 표시)
- **계획 vs 현실 — 죽은 코드 발견:** [탐사선 개조실 UI 재설계 계획](superpowers/plans/2026-06-26-explorer-ship-upgrade-ui-redesign.md) Task 2~4가 지목한 함수(`executeExploration`·`explorationFuelCost`·`renderRegionBriefPopup`·`renderExplorationResult`·`renderShipModRoom`)가 **전부 죽은 코드**였다. `renderExploration`이 4번 재정의되고 **마지막(9233)만 활성** — 라이브 경로는 `ex*` 아틀라스 재작성본(`exHangarHtml`·`exploreViewRun`·`exResultHtml`·`exDetailHtml`). **라이브 러너 `exploreViewRun`은 이미 크레딧만 차감·연료 차감 없음**(궤도=연료탱크로만 게이팅) → **Task 2(연료 제거)는 라이브에서 이미 충족**. 사용자 결정(Option A)으로 죽은 코드는 그대로 두고, Task 3·4를 **라이브 `exHangarHtml`로 재지정**해 구현.
- **Task 3 — 격납고 다이어그램:** `exHangarHtml`을 "중앙 탐사선 SVG(`shipDiagramSvg`) + 사방 4콜아웃(상=탐사장치·하=연료탱크·좌=내구성·우=채집기)"으로 교체. 콜아웃→부품 위치로 **점선 연결선**(`drawShipConnectors`가 `getBoundingClientRect` 실측 → SVG `<line>`+앵커 dot, `SHIP_ANCHORS` viewBox 100×100 기준). 라이브 `renderExploration`에서 `exHangarOpen`일 때 `requestAnimationFrame(drawShipConnectors)` + 리사이즈 1회 바인딩. 강화 버튼은 기존 `data-ship-upgrade`→`upgradeShipStat` 단일 경로 재사용. `exh-` 프리픽스 CSS.
- **Task 4 — 강화 레벨(Lv.N):** 공용 헬퍼 `upgradeLevelText(count)=Lv.(count+1)`. 탐사선 콜아웃 `exh-head`(`upgrade_levels[id]` 기준)와 식물 강화 카드 `upStatCard`의 `ust-name`(`p.up[k]` 기준)에 Lv 배지(`.exh-lv`/`.ust-lv`).
- **검증(preview 실측):** 셀프테스트 0 fail. 격납고: 콜아웃 4·연결선 4·앵커 dot 4·중앙 SVG 렌더, 실제 모바일 폭(375)에서 카드 내 수납·중앙행렬 무겹침. 강화 클릭 → 크레딧 차감(내구 140)·스탯 60→72·`upgrade_levels` 0→1·Lv 배지 Lv.1→Lv.2·연결선 재렌더. 식물 강화창: ust-lv Lv.1→Lv.2. (스크린샷은 배경 애니메이션으로 타임아웃 → 기하 측정으로 확정)
- **미적용(Option A 범위 밖):** 죽은 연료/레거시 코드(`executeExploration`·구 `renderExploration` 3종·`renderShipModRoom`·연료 상점 항목·죽은 `shipSummaryStats` 중복) 정리는 후속. `min_equipment_bonus` 행성/지역 게이팅은 라이브 경로에서 미사용이라 무영향.

### 2026-06-26 — 메인화면 화분/나무 의자 정렬 수정 (의자가 화분 앞으로 튀어나옴 + 높이 어긋남)
- **증상:** 메인화면에서 나무 의자(`.wood-stool`)가 화분(`.pp-pot`) **앞에** 그려지고, 화분 베이스가 좌석면보다 ~20px 아래로 꺼져 다리 사이에 박혀 높이가 안 맞음.
- **원인 1 (z-order):** `.wood-stool`(z-index:1)과 `.pp-pot`(z-index:1)이 같은 z인데 의자가 DOM상 뒤라 화분 위에 페인팅 → 의자가 앞. **수정:** `.pp-stack{z-index:2}` 부여 → 화분+식물 그룹이 의자(z1) 위 단일 스택으로. (의자 뒤·화분/식물 앞)
- **원인 2 (높이):** `margin-top:-34px` 당김이 과해 의자가 너무 위로 올라와 화분이 좌석을 지나 다리에 박힘. **수정:** `-34px → -16px`. 측정 검증: 화분 베이스(366.5px)가 좌석 상단(356.7)~앞단(372.2) 사이에 안착, 다리(→403)는 아래 노출.
- **검증:** preview 실측(z-order: 의자 z1 < 스택 z2 · 화분 베이스 좌석면 안착). 빈 화분 케이스도 동일 구조라 함께 해결. (스크린샷은 배경 애니메이션으로 타임아웃 → 기하 측정으로 확정)

### 2026-06-26 — 게임 내 도감 file:// 빈 화면 수정 (중첩 iframe 제거 → Shadow DOM 직접 렌더)
- **근본 원인:** 게임 내 도감(`#dexModal`)이 `plant-codex.html`을 iframe으로 띄우고, 그 도감이 다시 `index.html?dex=1`을 **중첩 iframe**으로 불러 `contentWindow.__DEX_API`를 직접 읽었다. `file://`(더블클릭 실행)에서는 브라우저 동일출처 정책이 **프레임 간 스크립트 접근을 차단** → 도감이 데이터를 영영 못 읽어 빈 화면. (http 서버에선 같은 출처라 통과 → 서버로 열면 정상이라 그동안 안 잡힘.)
- **수정:** 도감 렌더를 **공유 모듈 `docs/dex/codex-render.js`**(`window.PlantCodex.mount(api, root)`)로 추출. 게임 내 모달은 iframe(`#dexFrame`) → **Shadow DOM 호스트(`#dexHost`)**로 바꾸고, **같은 창의 `window.__DEX_API`를 직접** 넘겨 렌더(`openDex` 재작성). 중첩 iframe·크로스프레임 접근이 **0** → file://·서버·앱 전부 작동. CSS는 Shadow DOM(`.cdx-host` 스코프)으로 격리.
- **검증(http preview):** 모달에 종 182개 렌더 · 단계 리본/스킬 상세 모달/타입·변이형·속성 필터 작동 · 콘솔 에러 0 · `__catalogSelfTest()` 0 fail. 크로스프레임 호출을 전부 제거했으므로 file:// 작동은 구조상 보장(차이나던 동작 자체가 사라짐).
- **독립 `plant-codex.html`**(웹/깃허브용)은 자체 inline 렌더 유지 — http에서 정상이라 미변경. (※ 렌더 로직이 잠시 모듈과 중복되나 데이터 단일소스 `__DEX_API`는 양쪽 공유. 추후 독립 페이지도 모듈로 전환하면 중복 해소.)

### 2026-06-26 — 식물 도감 모달 닫기 버튼 통일 + 제목 한 줄 고정
- 도감(`#dexModal`) 닫기를 텍스트 "닫기"(`btn modal-close`) → **강화창과 동일한 원형 ✕**(`pm-close`)로 통일(상단 우측 유지). `#dexClose` 핸들러 그대로라 동작 동일.
- 제목 "📖 식물 도감"에 `white-space:nowrap` → **줄바꿈 없이 한 줄**. 검증: 닫기 정상·제목 1줄(높이 28px).

### 2026-06-26 — 강화창 닫기(✕) 버튼을 식물 이름 옆 → 상단 우측으로 이동
- 식물 관리(강화/변이/스킬) 창의 ✕가 이름 행(`pm-namerow`) 안에 있어 애매했음 → **상단 탭 바 우측 끝**으로 분리(`pm-top` flex 래퍼: 탭 3개 `flex:1` + ✕). 이름 행은 연필+이름만 남기고 **이름 중앙 정렬 유지**(우측에 숨김 스페이서). `#pmClose` id·바인딩 그대로라 동작 동일. 검증: 닫기 정상·이름 중앙(±4px)·self-test 0 fail.

### 2026-06-26 — 변이카드·스킬 보관함을 "도감"화 (보유=밝게 위 / 미보유=어둡게 아래)
- **요청:** 안 가진 변이 카드·스킬도 어두운 실루엣으로 남겨 전체 라인업이 보이게(보유한 것만 불이 들어오는 느낌), 보유분은 위로 올라와 정렬.
- **변이 카드(`mutDrawerHtml`):** 공통/변이 섹션마다 **보유분(밝게·카드 단위 그룹)을 위**, 그 아래 `🔒 미보유 N` 서브섹션에 **나머지 전체 `TRAIT_CARDS`를 어두운 타일**(`lockedMutCardHtml`)로. 헤더 배지 = `보유수/전체수`(예: 2/26). 0장이어도 전체 도감 노출(빈-상태 조기리턴 제거).
- **스킬(`skillDrawerHtml`):** 새 헬퍼 `plantStageSkillPool`/`plantSkillUnlockMap`(단계별 `plantKnownSkillIds` 누적→스킬별 최초 해금 단계). 현재 단계 스킬은 밝게 위, **미해금(상위 단계) 스킬은 어둡게** + `🔒 단계명`(성체/완숙체 등) 라벨로 아래.
- **잠금 타일 = 읽기 전용 열람:** 클릭 시 `openCardDetail(...,{locked})` — 효과/계수는 보여주되 **장착 버튼·등급 핀 숨김** + 획득/해금 안내 노트. (`data-card-info`/`data-skill-info` 바인딩.)
- **시각:** 보유 타일은 등급색 글로우, 잠금 타일은 `grayscale .9·brightness .6` 매트 다크 + 🔒 배지. 새 CSS `.dcard.locked`/`.lock-sub`/`.dcard-locked-grid`.
- **검증:** preview DOM/computed-style — 카드 2/26·1/15, 잠금 38장, 0장 시 41장 전체 잠금; 스킬 bench 5 + 잠금 3(성체·완숙체); 잠금 상세 장착버튼 없음·노트 표시. `__catalogSelfTest()` 0 fail·콘솔 에러 없음.

### 2026-06-26 — 변이카드 보관함 UI 가독성 강화 (#4 폴리시)
- **공통/변이 구분 확실화:** 기존엔 옅은 회색 텍스트 헤더뿐이라 공통 마지막 줄이 변이형 헤더와 뭉개져 보였음. → 두 섹션(`mutDrawerHtml`)을 **색 패널**로 분리: 공통=시안(`#46b6ff`)·변이형=보라(`#c07bff`), 좌측 4px 액센트 바 + 틴트 배경 + 하단 구분선. 헤더에 아이콘·부제(모든 변이형 장착 / 해당 변이형만)·보유 수 배지 추가.
- **"같은 카드 = 같은 가로줄":** `trait_cards`는 `card_id@등급`으로 저장 → 같은 카드를 등급만 다르게(예: 튼튼한 세포벽 S·B·D) 동시 보유 가능. 1차 구현(`mutGradeRowsHtml`)은 등급별로 묶어 같은 카드가 여러 줄로 흩어졌음. → `mutCardRowsHtml`로 **카드 단위 그룹핑**: 한 카드의 등급 변종(스펙만 다름)을 한 줄에 S→D 순으로 모음. 단일 등급은 보통 행, **2등급↑ 보유 카드는 강조 묶음(`.dcard-row.multi`)** — 섹션 색 점선 테두리 + 틴트 + "🧱 카드명 · 등급 N종" 라벨.
- **검증:** preview DOM/computed-style로 시안/보라 패널·multi 그룹(가시줄기 A·C / 튼튼한세포벽 S·B·D / 진액흡수 S·C 각각 한 줄·등급 정렬) 확인, `__catalogSelfTest()` 0 fail·콘솔 에러 없음. (배경 애니메이션으로 screenshot 타임아웃 → DOM 검증으로 대체.) CSS(`.drawer-sec`/`.drawer-sec-h`/`.dcard-row`/`.dcr-lab`) + 마크업(`sec-common`/`sec-variant`).

### 2026-06-26 — 메인 화면 도감 빈 화면 버그 수정 (폰트 @import 스크립트 차단)
- **증상:** 메인 화면 📖 도감 버튼을 눌러도 모달이 **빈 화면("도감 불러오는 중…")에 멈춤**. 도감(`docs/dex/plant-codex.html`)을 브라우저로 **직접** 열면 정상 → 게임 모달의 iframe으로 **중첩**해서 열 때만 재현.
- **원인:** plant-codex.html의 `<style>` 첫머리 외부 폰트 `@import`(googleapis/jsdelivr 3개)가 로딩되는 동안 브라우저가 **그 뒤 인라인 `<script>`(도감 빌드 코드) 실행을 보류**(보류 스타일시트 → 후속 스크립트 차단 규칙). 폰트 요청이 느리거나 막히면 파서가 `readyState:'loading'`에 갇혀 `build()`가 영영 실행 안 됨 → `__DEX_API`는 멀쩡히 떠 있어도 도감이 못 그림. 중첩 iframe(게임+도감+게임?dex=1 3단)에서 폰트 요청 경합으로 더 잘 터짐.
- **수정:** 폰트 3개를 `<style>@import` → `<head>`의 **비차단 `<link rel="stylesheet" media="print" onload="this.media='all'">`** 로 이동(+`preconnect`). 폰트는 폴백 스택(Do Hyeon→Pretendard→sans-serif)으로 자연 대체되므로 장식용일 뿐, 스크립트를 막아선 안 됨. 이제 폰트가 느리거나 실패해도 도감이 즉시 빌드됨.
- **검증:** 헤드리스(Chromium)로 **버그 재현 그대로**(CDN 실패 샌드박스) 중첩 경로 재검 — 수정 전 0카드·`loading` 고착 → 수정 후 6섹션·182카드 정상 렌더, "불러오는 중" 사라짐. 직접 열기 경로도 정상 유지.

### 2026-06-26 — 게임 내 도감 모달 (메인 화면 가방 아래 → 도감)
- 메인 화면 우측 `#sidePanel`의 **가방 버튼 아래에 📖 도감 버튼**(`bagFabHtml`에 `data-act="dex"` side-fab 추가) → 클릭 시 게임 내 모달(`#dexModal`)로 웹 도감(`docs/dex/plant-codex.html`)을 **iframe 그대로 삽입**해 띄움(`openDex()`, 첫 열림 lazy-load·재열기 즉시). 닫기 시 iframe src 유지. 탭 전환 시 `closeAllModals`로 닫힘. (종자 가방 팝업 안이 아니라 메인 화면.)
- 도감은 기존대로 `index.html?dex=1`을 읽어 실제 데이터/외형(개체 차별화 포함) 렌더 → 게임 떠나지 않고 앱 안에서 확인. preview 검증: 모달 표시·iframe 도감 렌더(title·콘텐츠)·닫기 정상. self-test 0 fail.
- ⚠️ **안드로이드(Capacitor) 빌드 시** `docs/dex/`도 앱에 번들해야 모달이 뜸(웹/로컬은 무관).

### 2026-06-26 — 개체별 외형 절차적 차별화 1차 (#1-A·#3 연동)
- **문제:** 외형이 `composePlantSvg(타입,단계,속성)` 3개로만 결정 → 같은 타입+속성이면 개체가 다 똑같이 생김(도감/수집).
- **해결:** `plantVariant(key)` — 개체 키 해시로 **색감(hue ±16°·채도·명도) + 형태(크기/비율 0.88~1.10) + 무늬(아키타입 테마: 공격형=가시·정밀형=문양·방어형=판·제어형=점·기본=잎맥)** 를 결정. `composePlantSvg`에 `opts.varKey` 추가 → 변형 레이어(필터+transform+`markingSvg`) 적용. 호출부에 `varKey`(plant.species / sp.key) 연결(spriteFor·svgPlant·관리/전투/진화/도감).
- **결과:** 전 175 개체 **전부 고유 외형**(175/175 distinct SVG)·scale 0.88~1.10 정상·self-test 0 fail. legacy 종은 변형 제외(원형 유지).
- **성격:** PNG 교체 전 **임시·영감용 절차적 1차**. 도트 PNG는 `SPRITE_OVERRIDES`로 개별 교체(#3). 무늬가 아키타입과 연동돼 컨셉 구체화 시 시각 힌트.
- **실루엣(형태) 분기 — 전 5타입:** 색·무늬를 넘어 **타입별 몸통 실루엣을 성격 패밀리로 분기**(`SHAPE_FAMILY`/`shapeFamily`, `composePlantBody`). 5종: jagged(뾰족)·bulky(육중)·slender(가늘고 높음)·wild(비대칭)·classic. **목본 수관·화초 꽃잎·다육 몸통·덩굴 줄기·버섯 갓 전부 갈래별로 다르게**(타입당 5/5 distinct). 같은 타입+속성도 성격 따라 구조 상이.
- **조합형 고유 특징("포켓몬식 변화량"):** 5갈래 규칙만으론 획일적이라, **개체마다 특징 모듈을 고유 조합**으로 얹음 — `FEATURE_MODULES`(눈·뿔·날개·결정·꼬투리·덩굴·주름·더듬이·가시·꼬리) + `individualFeatures(key)`(키 해시, ~80% 눈 보유로 생물감). 전 175개체 **고유 SVG**(175/175 distinct). 색+크기+무늬+실루엣+특징조합이 곱해져 다 제각각.
- **PNG 파이프라인(개체별 손그림 교체):** `SPRITE_OVERRIDES` 조회를 **개체 단위로 확장**. 우선순위 = `'<species>.<stage>'`(예 `carno_oak.evolved`) → `'<species>'`(전 단계) → `'<type>_<stage>_<element>'`(기존). 규격=120×140 비율·투명 배경·**식물만**(화분은 별도 `potVisual` 레이어)·바닥 정렬(base y96=화분 입구). `SPRITE_OVERRIDES['carno_oak']='url'`이면 절차적 외형 대신 그 PNG 사용. → 진짜 포켓몬식 고유 디자인은 이 훅으로 개체별 그림 투입(#3). self-test 0 fail.

### 2026-06-26 — 개체 컨셉 스킬: 전 개체 커버리지 + 광신 자해화상 (#1-A)
- **전 175 개체 커버리지:** 벌크 생성에 **base 28(폼·성격 없음=속성 시그니처#14+타입 성향)** + **버섯 7(포자/중독)** 추가 → 40 손작업 + 660 생성기 = 전 개체 단계별 컨셉 스킬 보유([scripts/gen-concept-skills.js](../scripts/gen-concept-skills.js), 멱등).
- **광신(zealot) 자해화상 엔진:** 신규 `selfDot`(자해 DoT)+`selfBuffs`(복수 자기버프) → 광신 개체 = 자신에게 화상 + 공격·방어 동시↑. zealot 개체 g2 시그니처 + ash_bloom 반영. (생성기 ser() 배열 직렬화 버그 수정 — selfBuffs 배열이 `[object Object]`로 깨지던 것.)
- **큐레이션 1차:** 생성기 네이밍 정리(중첩 제거, 단계별 distinct).
- **검증:** `__catalogSelfTest()` 0 fail · preview 실전투로 엔진 6종(출혈 회복감소·에너지 흡수·무기 속성부여·독 증폭·브레스 충전/발동·광신 자해화상) 전수 동작 확인 · 165개체 660스킬 전수 검증(미지원 필드 0). 잔여=깊은 개체별 큐레이션(`ARCHETYPE_OVERRIDES`/`CONCEPT_OVERRIDES`)·밸런스 점검.

### 2026-06-26 — 개체 컨셉+단계별 스킬 확장 P0(엔진+컨셉 인프라) 구현 (#1-A)
- **목표:** 개체마다 컨셉(2축 블렌드+스토리)을 정하고 단계별 스킬을 대규모로 추가하는 작업의 **토대(P0)**. 설계=[2026-06-26-individual-concept-skill-expansion-design.md](superpowers/specs/2026-06-26-individual-concept-skill-expansion-design.md) · 계획=[plan](superpowers/plans/2026-06-26-individual-concept-skill-expansion.md). 콘텐츠 배치(T7+)는 후속.
- **엔진 5종(전부 순수 헬퍼+`__test`):** ① **출혈=회복감소 전역**(`healMult` ×0.5 — 회복·흡혈·재생에 적용) ② **에너지 흡수**(`energyDrain`/`drainEnergy` — 탐식) ③ **무기형 속성 부여**(`infuse` kind 일반화→`element_infuse` 버프 + `elemInfuseBonus` 온히트 추가피해) ④ **독성 자기 독 증폭**(`poisonAmp`→`poison_amp` 버프가 독 DoT 배수, `poisonAmpMult`) ⑤ **용족 브레스 충전**(`breathCharge`/`breathScale`/`breathStack`/`breathPowerMult` — ⚠️ #14 `rampStack` 점유 회피로 별도 `kind:'breath'`).
- **컨셉 인프라:** `CONCEPT_OVERRIDES`(큐레이션)+`autoConcept`(자동 2축 시드)+`conceptOf` → 속성/타입/변이형/성격 중 둘을 묶은 정체성+스토리를 `SPECIES.desc`에 주입(도감 자동 노출). `applyVariantIdentity`에 합류·멱등.
- **#14 통합:** 속성 시그니처(#14)와 직교(form/성격/컨셉 축). 속성 축 콘텐츠 스킬은 후속 배치에서 `signature:` 필드로 #14에 합류.
- **검증:** `__catalogSelfTest()` **0 fail / 110**(#14 카드 ramp·toxic infuse 등 기존 테스트 유지). preview(alt 8771) 리로드 검증. 커밋 6건(T1~T6).
- **콘텐츠 벌크 생성(생성기):** 나머지 130 비버섯 변이 개체에 단계별 컨셉 스킬 **520종**을 [scripts/gen-concept-skills.js](../scripts/gen-concept-skills.js)로 일괄 생성(멱등 마커 블록 `__CONCEPT_GEN__`). 패턴=폼 메커니즘(포식 흡혈·무기 속성부여·독성 독증폭·용족 브레스충전) × 14성격 효과경향 × 단계별 역할(견제/셋업/대박). `stageSkills` 런타임 누적. **이로써 140 비버섯 변이 전부 컨셉 스킬 보유**(10 손작업 + 130 생성). self-test 111 0 fail · 130개체 stageSkills/520스킬 전수 검증(미지원 필드 0). 남은 것=버섯 7·base 28·큐레이션(어색한 이름/획일 개체 손보기).
- **콘텐츠 배치2:** 물 화초 5변이(cure_bulb 냉혹·drosera_bulb 은둔·coral_bulb 폭군·tox_lotus 교활·aqua_drake 탐식) + bright_bloom(불 우직) — 24 스킬(`CONCEPT_BATCH2_SKILLS`). 신규 아키타입 6종 검증 + 물=`signature:'wet'`(#14 통합) + 에너지 흡수(탐식) 실사용. self-test 111 0 fail.
- **콘텐츠 데모 배치1(T7, 톤 합의용):** 불 화초 4개체에 단계별 컨셉 스킬 16종 추가(`CONCEPT_BATCH1_SKILLS`, 개체당 새싹~성체 +4·역할/비용 차별화) — flame_trap(포식·광폭: 출혈/흡혈)·blaze_lance(무기·도사: 속성부여/치명)·ash_bloom(독성·광신: 독증폭/화상)·draca_bloom(용족·수호: 브레스충전/방어). `stageSkills` 누적(공유 새싹/유체 + 개체). self-test 111 0 fail. ⚠️ 광신 자해화상은 엔진 미구현이라 근사(공버프+화상). 톤 승인 후 나머지 배치 진행.

### 2026-06-26 — 속성별 시그니처 성질(상태이상) 1차 구현 (#14)
- **의도:** 지금 속성은 상성 배율만 차이 → 속성마다 고유 "성질"을 얹어 같은 위력이라도 전투 맛이 달라지게. **속성 = 정체성.** 브레인스토밍으로 7속성 하나씩 확정 후 구현. 설계: [2026-06-26-element-signature-effects-design.md](superpowers/specs/2026-06-26-element-signature-effects-design.md).
- **7성질(속성기+속성발현 공격 자동 부여):** 🔥불=화상 DoT / 💧물=젖음(기동↓+방어↓) / 🌿풀=재생(적중 시 고정 자가회복·피해 무관) / ⚡번개=감전(확률 스턴+에너지 회복 차단) / 🪨대지=관통(방어 일부 무시·방어 태세 상대엔 강화) / ❄️빙결=스택(2턴·비례 spd↓·acc↓·3스택 확정 스턴→리셋) / 🌪️바람=연속타(기동성 비례 추가타).
- **공통 규칙:** 상성 연동 없음 · 자기 속성 성질만 경감(`SIG.selfResist`, 면역 아님) · 스턴 연속 면역 없음. 옛 속성기 라이더(자힐·흡혈·방무·자가속·치명타·둔화) → 시그니처로 교체.
- **엔진:** 스턴은 **기존 `skipNext` 재사용**(신설 불필요였음). 데이터=`ELEMENTS[el].signature`+`ELEMENT_SIGNATURE`/`SIG`. 적용=`applyElementSignature`(적중 직후)·`applyWindFlurry`·`effStat`(빙결 spd)·`freezeAccPenalty`·턴 루프 에너지 회복 차단(`_noRegen`)·`tickStatuses`(빙결 만료). UI=`statusTags`(❄️/💤)·`showSkillDetail` 성질 pill·도감 desc 자동.
- **검증:** `__catalogSelfTest()` 0 fail/104. preview 실전투로 7속성 전부 발동 확인(바람 연속타 추가 데미지·빙결 3스택 스턴·감전 스턴+노리젠·물 이중디버프·불 화상·풀 자가회복).
- **리뷰 후 폴리시:** 물 젖음 디버프는 매 적중 자동 부여라 **누적 대신 갱신**(`sig:'wet'` 태그로 기존 제거 후 재부여) — 6회 적중 시 디버프 12개 누적→영구 spd/def 바닥 런어웨이 차단. (빙결=스택 3캡·화상=`DOT_STACK_CAP` 으로 이미 안전.)
- **확정 결정:** 속성발현 중 자기에게 거는 스킬(물 자힐·풀/대지/바람 버프)은 성질 미부여 = "속성에 의한 추가 스탯"으로 해석(의도된 설계). 빙결 새싹은 이미 적 spd↓ = 미니 빙결. 불·번개 새싹만 성질 적용.
- **남은 것:** 수치 밸런스 패스 / 성장체 `ELEMENT_GROWTH_SKILLS` 적용 여부(로드맵 §4-14).

### 2026-06-26 — 변이 개체 정체성(아키타입 축) 1차 구현
- **의도:** 같은 타입+속성이라도 변이형마다 별개 개체 → 컨셉·스탯·고유스킬이 달라야 함. form은 큰 틀만, 진짜 차별화는 **개체 정체성**. (form 하나로 획일화 금지)
- **모델:** `개체 = 타입 × 속성 × 변이형(form) × 아키타입(personality)`. 아키타입은 form과 독립 → 같은 무기형이라도 광폭/도사가 공존.
- **데이터(편집 표면 2곳):** `ARCHETYPES` 14종(광폭/도사/교활/우직/수호/광신/냉혹/야성/책략/은둔/폭군/탐식/망령/맹장 — 각 `sm`스탯배율·`dot`·`nouns`스킬명) + `ARCHETYPE_OVERRIDES`(개체별 고정, 비우면 `archetypeOf` 해시 분산). 사용자가 나중에 큐레이션.
- **적용 3곳(`ALL_SKILLS` 직후 멱등 패스):** ① 스탯 = `base(타입+속성) × form배율 × 아키타입배율` ② 컨셉문 `SPECIES.desc` 주입(도감 자동 노출) ③ 고유스킬 `ind.<key>.g/m/e` 이름(원소어+아키타입 noun) + DoT 강제(예: 광폭→출혈). base 35·legacy·버섯 제외.
- **검증:** `__catalogSelfTest()` 0 fail(신규 정체성 테스트 포함). 화초·불 3종이 전혀 다름 — 플레임트랩(광폭/포식 "물어뜯기"+출혈)·블레이즈랜스(도사/무기 "집중")·애시블룸(광신/독성). 140 변이 전부 아키타입 배정, 14종 모두 사용. 도감 컨셉/스킬명 실측 반영.
- **범위:** 스킬트리 확장(새싹/유체) 제외(확정). 외형은 후속(사용자 도트 제공 예정). 설계: [2026-06-26-variant-individual-identity-design.md](superpowers/specs/2026-06-26-variant-individual-identity-design.md).

### 2026-06-26 — 도감: 변이형(form) 필터 추가 + 로딩 타임아웃 견고화
- 도감 상단 헤더에 **변이형 필터 축**(🧬전체/🌿기본/🌱일반/🦷포식/🗡️무기/☠️독성/🐉용족/🍄포자) 신설. 각 카드 `data-form`(태생 변이형) + 타입·속성과 AND 조합. (예: 포식+화초 → 원소별 7종 교차)
- iframe `load` 의존 제거 → 500ms 폴링(최대 30s)으로 `__DEX_API` 대기 → "도감을 불러올 수 없습니다" 타임아웃 버그 수정.
- 파일: `docs/dex/plant-codex.html`. 커밋 `0459936`. (이 항목은 동시 세션 머지 중 유실되어 복구함.)

### 2026-06-26 — 상점 세로그리드 · 진화 버튼 중앙 · 컬렉션 드래그 재배열
- **상점 세로 그리드:** `.shop-lane` 가로 스크롤(`flex+overflow-x`) → `display:grid; repeat(auto-fill,minmax(132px,1fr))`로 변경, `.shop-card` 고정폭 제거(`width:auto`) → 모든 상점 블록이 여러 열로 **아래로 줄바꿈(세로 스크롤)**.
- **진화 확인 버튼 중앙:** `#evolveClose` 좌측 치우침 → `margin:14px auto 0; display:block; width:fit-content`로 중앙 정렬.
- **메인 컬렉션 바 드래그&드롭 재배열 + 양육 연동:** `#profileRow`에 편집 토글(`#collEditBtn` ✏️/완료) 추가. 편집 모드에서 식물 칩을 포인터 이벤트(터치/마우스) 드래그&드롭으로 재배열 → `movePlantOrder(src,dst)`가 `state.plants` 순서 변경. **컬렉션 바·양육 그리드 둘 다 `state.plants` 인덱스라 자동 동기화**(양육 진행도는 식물 객체에 붙어 함께 이동). 칩에 `data-idx`, 편집 중 탭은 활성식물 변경 차단. 범위=순서 재배열(빈 칸은 뒤, dense).
- **검증:** `__catalogSelfTest()` 0 fail · node 구문검사 0 에러. preview: `.shop-lane` computed `display:grid`·다열, 진화 함수에 중앙 스타일, `movePlantOrder` 3케이스(중간이동·앞이동·끝클램프) 정확, 편집 토글 body class·`data-idx` 12칩 확인. 설계=[design](superpowers/specs/2026-06-26-shop-evolve-collection-ui-design.md).

### 2026-06-26 — 스킬 장착/보관함 표시 통일 + 수치 노출 (#5)
- **피드백:** "스킬 장착도 보관함과 장착 시가 통일됐으면 — 수치가 있는 방향으로."
- **수정:** 공용 `skillMetaHtml(p,id,sk)` 신설 — **비용(⚡)·위력·등급(S~D 칩)·분류칩**을 한 줄로. 장착 슬롯(`skillSlotHtml`)·보관함 카드(`skillDrawerHtml`)가 동일 컴포넌트 사용 → 표시 통일. `skillCostLabel`(무소모/N회 포함)·`skillPowerLabel`(위력/회복/방어/버프/디버프) 분리. CSS `.sk-meta/.skm-cost/.skm-pow/.skm-grade` 추가. (전투 인게임 하단 카드는 현 정책 유지 — 관리화면만 변경.)
- **검증:** preview 스킬탭 — 장착 슬롯·보관함 카드 양쪽 모두 `비용·위력·등급·분류칩` 노출 동일 확인. `__catalogSelfTest()` 0 fail.
- 설계: [2026-06-26-ui-battle-polish-batch-design.md](superpowers/specs/2026-06-26-ui-battle-polish-batch-design.md) §5. **→ 피드백 7항목(#1~#7) 전부 완료.**

### 2026-06-26 — 변이카드 보관함 가독성: 공통/변이 분류 + 등급별 가로줄 (#4)
- **피드백:** "변이카드 가독성 증대 — 공통/변이 분류, 등급별로 같은 가로줄 배치."
- **수정:** `mutDrawerHtml` 재작성 — ① **🌐 공통 / 🧬 변이형 전용** 두 섹션 분리(`c.type==='common'` 기준), ② 각 섹션을 **등급(S→A→B→C→D) 가로줄**로 묶어 같은 등급이 한 행에(`mutGradeRowsHtml`, 행 앞 등급 칩). 카드 단건 렌더는 `mutCardHtml`로 분리. 기존 정렬 토글 버튼 제거(상시 등급 그룹). CSS `.drawer-sec/.dgrade-row/.dgrade-lab` 추가.
- **검증:** preview에서 공통·변이 카드 다등급 지급 → 2섹션·등급행(S/A/B…) 그룹·같은 등급 동일 행 확인. `__catalogSelfTest()` 0 fail.
- 설계: [2026-06-26-ui-battle-polish-batch-design.md](superpowers/specs/2026-06-26-ui-battle-polish-batch-design.md) §4.

### 2026-06-26 — 보상 개봉 "전부 개봉" 버튼 (#7)
- **피드백:** "양육 열매는 한 번에 전부 열기 기능이 있으면 좋겠음. 여러개 나오면 일일이 터치 귀찮음."
- **수정:** 공통 개봉 연출(`openRewardReveal`)에 **⚡전부 개봉** 버튼 추가 — 2개 이상일 때만 노출, 누르면 남은 상자를 한 번에 전부 개봉(소리 1회) 후 버튼 숨기고 완료 노출. 단건 개봉(`rrOpenOne`)·전부 개봉(`rrOpenAll`)이 공용 `rrRevealNode`/`rrSyncDone` 사용. 열매뿐 아니라 탐사·보급·화분 보상에도 공통 적용.
- **검증:** preview에서 3개 reveal → 전부 개봉 노출 확인 → 클릭 시 3개 전부 opened·완료 표시·버튼 숨김. `__catalogSelfTest()` 0 fail.
- 설계: [2026-06-26-ui-battle-polish-batch-design.md](superpowers/specs/2026-06-26-ui-battle-polish-batch-design.md) §7.

### 2026-06-26 — 탐사 궤도 연료 태그 톤다운 (#6)
- **피드백:** "탐사의 궤도 표시가 너무 눈에 띔, 불투명도해서 글자로만." → 링은 유지, 연료 태그(⛽N/🔒N)만 흐리게.
- **수정:** `.exmap-orbit-tag`에서 배경(`rgba(6,11,20,.86)`)·테두리·pill 패딩 제거 → 박스 없이 흐린 글자만(`color` alpha .42, 약한 text-shadow만 유지). 궤도 링(`.exmap-orbit`)은 변경 없음.
- **검증:** preview 탐사맵 열어 computed style — 태그 `background:transparent·border:0·color:rgba(191,233,255,.42)`, 링 `border 1.5px·boxShadow` 그대로.
- 설계: [2026-06-26-ui-battle-polish-batch-design.md](superpowers/specs/2026-06-26-ui-battle-polish-batch-design.md) §6.

### 2026-06-26 — 브라우저 세이브 소실 + 변이카드/스킬 장착 해제 버그 수정 (#3) ⚠️중대
- **피드백:** "변이카드 및 스킬 장착 고정이 안 됨, 나갔다오면 다 해제됨."
- **근본 원인 3중 구조(systematic-debugging으로 추적):**
  1. `let loadedFromLocal = false`가 `let state = loadState()`보다 **뒤에** 선언(2026-06-19 백업 커밋) → loadState가 `loadedFromLocal=true` 대입 시 TDZ.
  2. **핵심:** `let state = loadState()`가 **state 자기 초기화(TDZ) 중** 실행 → loadState→normalizeState→ensureSkillFields→`ownedTraitCardIds`의 `typeof state`가 TDZ에서 ReferenceError → loadState catch가 삼켜 `defaultState()` 반환 → **2026-06-19 이후 식물 있는 브라우저 세이브가 매 리로드마다 빈 상태로 덮어써짐**.
  3. load 중 `ownedTraitCardIds`가 글로벌 `state.trait_cards`(아직 default=빈 인벤토리)를 읽어 → 장착 변이카드가 소유 필터에서 전부 탈락("장착 해제" 증상).
- **수정:** `loadedFromLocal`·`nativeReconciled` 선언을 loadState 호출 전으로 이동 / `let state = defaultState()`로 안전 초기화 후 **실제 로딩을 `bootWithSave`(모든 심볼 정의 후)로 이동** / `loadState`에서 `normalizeState(s)` 전에 글로벌 `state = s` 대입(로드 인벤토리 인식).
- **검증:** SW/캐시 클리어 리로드 라운드트립 — credits·식물·장착 변이카드·장착 스킬 **전부 유지**(이전 전량 소실). `__catalogSelfTest()` 0 fail.
- 설계: [2026-06-26-ui-battle-polish-batch-design.md](superpowers/specs/2026-06-26-ui-battle-polish-batch-design.md) §3.

### 2026-06-26 — 화분 표시 전역 통일 (식물/화분 분리 유지)
- **모든 식물 = 화분 레이어 + 식물 레이어 2레이어로 통일.** 직전 "접지" 변경으로 관리/강화창·전투·VS·진화·썸네일이 맨 식물(화분 없음)로 보이던 것을 수정 → `spriteFor`/`svgPlant`가 `spriteStack(potVisual + composePlantSvg(noPot))` 반환. 화분은 끝까지 **독립 교체 레이어**(baking 안 함). 화분 = 식물 장착 `potId`(전투 유닛은 `makeCombatant`에 `potId` 추가, 봇은 `pot_terra`).
- **`composePlantSvg` = 항상 식물만·140 viewBox**(접지 crop·`plantBaseY` 폐기) → 화분 레이어와 같은 좌표로 정렬(식물 base y96이 화분 입구에 앉음).
- **이모지 화분 → 픽셀 화분.** 화분 픽커(`openPotPicker`)·"화분 바꾸기" 버튼·화분 상점(`POT_SHOP` 레인)의 `pot.icon` 이모지(🪵🏺🫙💎👑)를 `potVisual(id)` 미니 렌더로 교체 → 실제 화분 외형이 보임.
- **빈 화분/나무 받침**: 현행 유지(받침은 메인만). 메인(`pp-stack`)·양육(`pot-stack`)은 기존 2레이어라 영향 없음.
- **검증:** 워크트리 실파일 복사본을 preview로 서빙해 `__catalogSelfTest()` **0 fail** + 인라인 스크립트 node 구문검사 0 에러. `spriteFor`가 `ss-pot`+`ss-plant` 2레이어·장착 화분(테라/도자기/유리/크리스탈/황금) 색 반영·식물 SVG는 화분 없음(140) 구조 확인. 설계=[design](superpowers/specs/2026-06-26-pot-display-unify-design.md).

### 2026-06-26 — 도감: 변이형(form) 필터 추가 + 로딩 타임아웃 견고화
- **배경(피드백):** "변이형에 따라 개체가 다르고(예: 화초+불+포식 ≠ 화초+불+무기) 생장 단계마다 스킬이 다른 듯" → 검증 + 도감 분류 요청.
- **검증 결과:** 같은 타입+속성이라도 변이형이 다르면 `SPECIES_CATALOG`의 **별개 종**(예: `flame_trap`/`blaze_lance`/`ash_bloom` = 화초+불 의 포식/무기/독성). **기본 스탯은 동일**(`buildBase()`가 타입+속성만으로 산출, 변이형은 `stats` 미지정) — 차이는 **3개 고유 스킬(성장체/성체/완숙체, 변이형 테마)** + 변이형(장착 가능 카드)뿐. 도감은 이미 182장으로 개체별 별개 카드 + 타입/속성 필터 + 버섯 7종을 렌더 중이었음.
- **추가:** 도감 상단 헤더에 **변이형 필터 축**(🧬전체/🌿기본/🌱일반/🦷포식/🗡️무기/☠️독성/🐉용족/🍄포자) 신설. 각 카드에 `data-form`(태생 변이형) 부여, 타입·속성과 **AND 조합**. 예: 포식+화초 → 7종(원소별 1) 교차 추출. 🍄포자 = 버섯 7종 한 번에.
- **버그픽스:** 도감 부팅이 느릴 때 iframe `load` 이벤트와 `__DEX_API` 노출 시점이 어긋나 12초 후 "불러올 수 없습니다"가 뜨던 문제 → load 의존 제거, **500ms 폴링(최대 ~30s)**으로 `__DEX_API` 준비를 견고하게 대기.
- **파일:** `docs/dex/plant-codex.html` (게임 `index.html` 미변경). **검증:** preview 실측 — 182장 빌드, 포자=7(전부 버섯)·포식=28·포식+화초=7, 콘솔 에러 0.

### 2026-06-26 — 전투 턴 종료 후 스킬바 재활성 지연 단축 (#1)
- **문제(피드백):** "마지막 후공 처리 끝나고 다음 스킬 뜨는데까지 오래걸림" — 턴 종료 꼬리에서 스킬바가 늦게 켜짐.
- **원인:** `playerSkill` 말미 `sleep(620)`(판정 닫힘 대기) + `closeJudge()` + `sleep(380)`(유휴뷰 복귀 대기) → 마지막 행동 해소 후 ~1초간 `#cardPhase`가 잠긴 채 비활성.
- **수정:** 판정 닫힘 대기 `620→300ms`, 유휴뷰 복귀 전 `380ms` 대기 제거(`renderBattleIdleView` 즉시 호출 → 스킬바 잠금 즉시 해제). 꼬리 지연 ~1.8s→~1.1s(상태이상 틱 없으면 더 짧음).
- **검증:** `__catalogSelfTest()` 0 fail. 전투 부팅 후 1턴 진행 → 턴 정상 증가(1→2)·`B.busy` 해제·`#cardPhase` 잠금 해제 확인.
- 설계: [2026-06-26-ui-battle-polish-batch-design.md](superpowers/specs/2026-06-26-ui-battle-polish-batch-design.md) §1.

### 2026-06-26 — 흡혈(포식)=변이형 전용: 일반형 흡혈 스킬 22종을 다양한 효과로 교체 (#2)
- **문제(피드백):** "포식 스킬이 포식 아닌 식물도 갖고 있음" — 일반형 개체의 성체/완숙 시그니처 스킬 다수가 흡혈(`kind:'drain'`)을 가져 변이/일반 경계가 흐림.
- **규칙 확정:** 흡혈(lifesteal/drain)은 **변이형(`form!=='normal'`) 전용** 메커니즘. 변이형 흡혈 76종은 보존, **일반형 흡혈 22종**(base 35 + mutant-normal 소속)만 비-흡혈 스킬로 교체.
- **다양한 효과로 교체:** 단순 일반공격 획일화 대신 속성·단계별 분산 — DoT(화상/출혈) 4, 자기버프(공/방/속) 6, 적디버프(공/방/속) 7, 치명타 3, 회복 2. 부가효과 없던 순수 흡혈 5종(전부 물)엔 서로 다른 효과 신규 부여(적 방어↓/회복/적 기동↓/자기 방어↑/적 공격↓). 흡혈 어휘(포식·흡식·흡수·흡혈·삼키기) 이름 중립화.
- **도구:** `scripts/patch-drain-normal.js`(멱등 인플레이스 패치 — 종 form을 `SPECIES_CATALOG.baseVariants`로 판별해 일반형 소속 흡혈만 변환, 흡혈 제거분은 재실행 시 건너뜀). 손수정 금지 관례 준수.
- **검증:** 패치 후 일반형 흡혈 0·변이형 76 보존(분석), `__catalogSelfTest()` 0 fail, 실제 로드 확인(`ind.tree_water.e`=해일 붕괴 attack·흡혈 없음 / `ind.carno_oak.e` 포식 변이=흡혈 0.4 유지).
- 설계: [2026-06-26-ui-battle-polish-batch-design.md](superpowers/specs/2026-06-26-ui-battle-polish-batch-design.md) §2.

### 2026-06-25 — 탐사 궤도 링 가시성 복원 + 궤도별 연료 표식
- **문제:** 연료탱크가 낮으면 잠긴 궤도 링이 `rgba(255,255,255,.04)`(4% 불투명)로 사실상 안 보임 → "궤도 원이 사라진" 것처럼 보임(4궤도 확장 후 더 부각). 궤도 링은 거리(=필요 연료)를 가늠하는 기준이라 보여야 함.
- **링 가시성 강화:** 해금 링 `.075`→teal `rgba(126,214,194,.30)` solid(+은은한 inner glow), 잠금 링 `.04`→white `.13` dashed.
- **궤도별 연료 표식 추가:** 어떤 행성도 없는 정좌측(180°)에 `⛽N`(해금)/`🔒N`(잠금) 배지(`exmap-orbit-tag`). N=궤도=필요 연료탱크 레벨 → 거리에 따른 필요 연료를 눈금처럼 직독. `exOrbitRings`에서 링과 함께 렌더, `z-index:5`로 행성 위에 항상 가독.
- **기본 줌 조정:** `EX_DEFAULT_SCALE 1.0→0.9` — 4궤도 + 외곽 연료 표식이 잘림 없이 기본 화면에 전부 들어오게.
- **검증:** preview(375px)에서 4링·4표식 렌더, 연료탱크별 ⛽/🔒 색·잠금 정확, 표식 무잘림, `__catalogSelfTest()` 0 fail.

### 2026-06-25 — 식물 그림에서 내장 화분 제거 + 접지
- **내장 화분 완전 제거:** `composePlantSvg`가 식물 SVG 안에 그리던 어두운 화분(y96–138)을 삭제 → 식물 그림은 식물만. (메인/양육은 이미 별개 픽셀 화분 레이어를 얹으므로 영향 없음.)
- **단독 표시 접지(grounded):** 화분을 빼면 viewBox 하단이 비어 떠 보이므로, 종별 실제 바닥(`plantBaseY`: 줄기식물 y96·씨앗 y88·버섯 stem)까지 viewBox를 crop → 식물이 박스 바닥에 앉아 **전투 발밑 그림자(`.fsprite::after`)와 자연스럽게 연결**. 전투 스프라이트·진화 모달·식물관리 모달·VS 스트립·유전자/타이틀/도감에 자동 적용.
- **`noPot` 의미 정리:** `noPot:true`=전체 140 높이(외부 화분용·메인/양육), 미지정=접지 crop(단독). 내장 화분은 어느 쪽도 안 그림.
- **검증:** 인라인 스크립트 node 구문검사 0 에러. 신규 `composePlantSvg`를 실제 테스트 하네스에 주입해 `__catalogSelfTest()` 실행 → 갱신 전 옛 화분 단언 2건만 실패(워크트리에서 접지 기준으로 재작성), 그 외 전부 통과 = 부수 회귀 없음. 종별 crop 높이(목본/화초/다육/덩굴/풀=104·버섯완숙=65) 및 양육·메인 140 유지 확인.

### 2026-06-25 — 식물·화분 도트 분리 + 등급별 픽셀 화분 통일
- **화분 = 항상 별개 레이어:** 메인화면(`renderCenter`)이 식물 SVG에 속성색 화분을 박아 그리던 것을 폐기 → 식물(`composePlantSvg(...,{noPot:true})`) + 장착 화분(`potVisual(p.nursery.potId)`)을 2레이어(`.pp-stack`)로 겹쳐 표시. 화분 업그레이드가 메인화면에 즉시 반영.
- **`potVisual` 픽셀 재작성:** 색만 다른 매끈한 SVG → ASCII 그리드 빌더(`pixelArt`)로 등급별 **완전히 다른 도트 화분 5종**(테라코타·도자기·유리·크리스탈·황금). 동일 `120×140` viewBox·중심 x60·y94~139로 식물 레이어와 정렬. PNG 훅(`POT_SPRITE_OVERRIDES`) 유지.
- **빈/잠긴 화분 통일:** 양육 그리드 빈·잠긴 슬롯의 `.pot-vessel`(별도 CSS 픽셀팟) → `potVisual('pot_terra')`로 교체(잠금 회색 필터는 `.pot-slot.locked .pot-stack`로 이전). 채움/빈/잠금 슬롯이 같은 도트 자산 사용.
- **양육 흔들림 변경:** `.pot-stack .plant-layer` 회전(`potSway`) → 좌우 이동(`@keyframes plantSwaySide`, translateX ±3px). 화분 레이어는 고정. 메인화면 식물 레이어는 정적(흔들림 없음).
- **검증:** `__catalogSelfTest()` 0 fail(신규 `potVisual` 주입 기준). 인라인 스크립트 3블록 node 구문검사 0 에러. potVisual 5종 렌더·중심정렬, 메인 2레이어 동일 bottom·z순서, 빈/잠긴 슬롯 렌더·잠금필터, 양육 plant=`plantSwaySide`·pot=`none` DOM 확인.
- **후속 다듬기:** 크리스탈 화분 도트가 아래로 수렴하는 뾰족 보석형이라 식물이 점 위에 얹힌 듯 보이던 문제 → 상단 결정 돌기 + 좌광/우암 면 분할 + 평평한 입구·바닥의 면 분할 픽셀 팟으로 재구성(식물이 화분에서 솟도록).

### 2026-06-25 — 탐사 우주맵: 4궤도 확장 + 행성 겹침 해소
- **문제:** 행성이 커서 인접 궤도(특히 궤도 2↔3 간격 32px < 행성 34~38px)에서 겹쳐 보임.
- **궤도 4개로 확장:** `EX_ORBIT_R = {1:54,2:96,3:138,4:180}`(균등 42px 간격) + `SHIP_ORBIT_MAX 3→4`(연료탱크 4단계까지 강화 → 궤도 4 해금). `exOrbitRings` `[1,2,3,4]`.
- **행성 축소:** `.explanet-core` 30/34/38px → 24/28/31px(normal/rare/epic).
- **재배치(겹침 제거):** 11행성을 3/3/3/2로 분산(기존 궤도 2·3에 4개씩 몰림 → 분산). 궤도별 균등 각도 + 궤도 간 60° 스태거. 난이도 일관 유지(궤도=폴드심도): 벨로크 궤도 2→3, 네레이돈·티아멘 궤도 3→4(intro 폴드 심도도 갱신). 최악 코어 간격 55px(겹침 0).
- **검증:** `__catalogSelfTest()` 0 fail/92. preview: 4궤도 링·11행성 렌더, 327px 폭 안에 전부 수용(scale 1.0), 연료탱크 게이팅(궤도>연료 잠금)·최대 4 해금 정상.

### 2026-06-25 — #13 태그 시너지 버그픽스 2건 (코드리뷰 후속)
- **비용 할인 미적용 버그:** `playerSkill`의 에너지 게이트가 할인가가 아닌 원가(`s.cost`)로 판정 → 과부하 대사(공격 비용 −1) 등 장착 시 카드는 사용 가능(`skillUnusable`/표시 비용은 `effectiveCost` 기준)으로 보이는데 탭하면 "에너지 부족"으로 튕기던 모순. 게이트를 `effectiveCost(B.p, s)`로 교체([index.html](../index.html) `playerSkill`).
- **순수 독 스킬 효과 배율 누락:** 위력 0인 dot 스킬(else 분기, 예: 독 뿌리기)의 지속피해가 `effMul`을 곱하지 않아 맹독 코팅(+40%)·독소 시너지 등 중독 효과 강화가 미반영. 같은 분기 `enemyDebuff`·위력 분기 dot과 일관되게 `s.dot.pct*effMul`로 수정.
- **검증:** `__catalogSelfTest()` **0 fail**. preview에서 두 케이스 직접 시뮬 — 할인가 게이트 통과(원가 게이트는 차단)·중독 효과 보정 0.4 반영 확인.

### 2026-06-25 — #13 스킬 태그 & 태그 시너지 3단계(콘텐츠·폴리시) ✅ = 전 단계 완료
- **태그 카드 12종(common, 전부 `box_card_common` 드롭 등록):**
  - 속성: `card_firecore`(불 위력+20%)·`card_aquacore`(물 위력+20%)·`card_purecore`(무속성 위력+18%, `elem:none` 겨냥 → 기본·포식·무기)
  - 변이형: `card_weaponmod`(무기 스킬 위력+22%, `var:weapon`) — 무기 스킬 4종(`skill_card_sword/shield/axe/gun`)에 `variant:'weapon'` 부여
  - 상태이상: `card_venomcoat`(중독 효과+40%, `dot:poison`)·`card_toxinsyn`(compose: 디버프 2개↑→중독+50%)
  - 대상: `card_blastwave`(광역 위력+25%)·`card_focuslens`(단일 위력+20%)
  - 분류/콤보: `card_overclock`(공격 비용−1)·`card_warhost`(compose: 공격 3개↑→모든 공격+15%)·`card_counterflow`(combo: 방어→다음 공격+30%)·`card_emberchain`(combo: 불→다음 불+35%)
  - 발동 스킬: `tag.flame_exalt`(불꽃 고양 — 3턴 불 위력+30%)
- **활성 보정 표시 UI:** `skillTagBoostState(unit,s)` → 하단 스킬 카드에 `.boosted` 글로우 + `.sc-boost` 배지(🔺 위력/효과 · ⚡ 비용 할인 · 🔗 콤보 점화, title에 수치). `skillCardHtml`에서 매 렌더 평가.
- **밸런스 1차:** power +18~25% · effect +40~50% · cost −1 · compose 조건부 +15%. 등급 m 스케일(`fixed` 카드는 평탄). 봇은 시너지 카드 미부여(플레이어 중심, 추후 선택).
- **검증:** 셀프테스트 8종 추가 → `__catalogSelfTest()` **0 fail / 92**(기존 "공통 상자가 모든 공통 카드 드롭" 테스트가 12종 드롭 등록 자동 확인). preview 실전투: 화염핵+폭심 확산 장착 → `skill_card_breath`(불) 🔺위력+20%·`spore_burst`(광역) 🔺위력+25% 배지 렌더, 기본 스킬 무배지 확인.

### 2026-06-25 — #13 스킬 태그 & 태그 시너지 2단계(효과 완성) ✅
- **effect (부가효과 배율):** `applySkill` 상단에서 `effMul = 1 + tagModSum(a,s,'effect') + comboEff` 산출 → `heal`·`selfBuff`·`dot`·`enemyDebuff`(scaled copy)·`infuse`·`energyGain` 수치에 곱. 보정 없으면 `effMul=1`(불변).
- **combo (점화/소비):** `applySkill` 상단(코스트 차감 직후)에서 처리 — 직전 점화(`a.comboPrimed`)가 이번 스킬 `toTag`를 겨냥하면 `comboPow`/`comboEff`로 이번 행동에 적용 후 1회 소비, 이어서 이번 스킬이 규칙 `fromTag`를 충족하면 다음 행동용 재점화. 규칙 출처 = 카드 `base.combo` + 스킬 `s.combo`(`unit.comboRules`). early-return(miss) 앞에 배치해 안전.
- **compose (구성보너스):** `makeCombatant` 말미에서 로드아웃 스킬 태그를 집계 → 카드 `base.compose`의 `ifTag/count` 충족 시 `grant` 보정을 `unit.tagMods`에 합류(전투시작 1회).
- **수집/정합:** `cardInstanceEffects`/`cardEffects`에 `compose[]`·`combo[]` 수집(`grant.value`·`combo.value` 등급 m 스케일). `aiPickSkill` 사용가능 필터를 `effectiveCost`로 교체(할인 스킬 사용 판정 일치).
- **예시 콘텐츠:** `card_toxinsyn`(compose — 디버프 태그 스킬 2개↑ → 중독 효과 +50%)·`card_counterflow`(combo — 방어 후 다음 공격 위력 +30%, `fixed`) + 공통 보급상자 드롭 등록.
- **검증:** 셀프테스트 5종 추가 → `__catalogSelfTest()` **0 fail / 84**. preview 실전투(부팅 후)에서 화염핵 `tagMods`·역류 반격 `comboRules` 라이브 주입 확인, 방어→공격 콤보가 실제로 점화(`comboPrimed` 세팅)·소비(공격 후 `null`)되고 데미지 부스트(~15→19) 확인.
- **다음:** 3단계 — 태그 축별 실제 카드/스킬 콘텐츠 + 드롭풀 + 뒷장 태그 pill·활성 보정 표시 UI + 밸런스 튜닝.

### 2026-06-25 — #13 스킬 태그 & 태그 시너지 1단계(토대) ✅
- **목표:** 스킬에 5축 태그(분류·속성·변이형·대상·상태이상)를 붙이고, 그 태그를 겨냥한 보정을 카드·스킬로 푸는 시스템의 토대. 설계 SSOT = [tag-synergy spec](superpowers/specs/2026-06-25-skill-tag-synergy-system-design.md).
- **신규 엔진:** `skillTags(s,unit)`(태그는 (스킬,유닛) 쌍에서 도출 — 속성은 유닛 속성 기준) · `tagModSum(unit,s,type)`(지속 `unit.tagMods` + 임시 `kind:'tagmod'` 버프를 같은 풀로 합산) · `effectiveCost(unit,s)`(cost 할인·0 하한·`noEnergy` 제외) · `TAG_META`.
- **통합:** `cardInstanceEffects`/`cardEffects`(`base.tagMods`→등급 m 스케일→`E.tagMods`) · `makeCombatant`(`unit.tagMods`·`comboPrimed`) · `applySkill`(power 배율=원소저항 직후·variance 직전 / `effectiveCost` 차감 / `s.tagBuff`·`tagBuffs` 임시 보정) · `skillUnusable`·`moveCostLabel`·`showSkillDetail`(할인 반영 + 변이형/대상 pill).
- **데이터:** 변이 5종(`skill_card_predation`=pred·`infuse`/`spray`=toxic·`scale`/`breath`=dragon)에 `variant` 추가. 예시 콘텐츠 — 카드 `card_firecore`(불 위력 +20%, 등급 스케일)·`card_overclock`(공격 비용 −1, `fixed`) + 스킬 `tag.flame_exalt`(불 위력 +30%·3턴) + 공통 보급상자 드롭 등록(획득 가능).
- **엔진 안전성:** `kind:'tagmod'` 버프는 `effStat`(공/방/속) 무시·`tickStatuses` 자동 만료 → 기존 스탯 계산 회귀 0.
- **검증:** 셀프테스트 10종 추가 → `__catalogSelfTest()` **0 fail / 79**. preview에서 비용 할인 라벨(⚡2→⚡1)·사용 판정(1에너지로 할인 스킬 사용 가능) 실함수 확인.
- **다음:** 2단계(effect 배율·combo 점화·compose 구성보너스) → 3단계(축별 콘텐츠·드롭풀·태그 pill UI·밸런스).

### 2026-06-25 — 전투 시작 에너지 = 최대 에너지(항상 가득)
- **버그**: 에너지 스탯을 업글해 `energyMax`가 늘어도 시작 에너지는 `Math.min(..., 3)`으로 3 고정 → 남는 칸이 비어 시작.
- **수정**: `makeCombatant`(`index.html` ~9614)의 시작 `energy`를 `energyMax`와 동일하게(`Math.min(...,3)` 캡 제거). 플레이어·적 공용 함수라 양쪽 동시 적용.
- **검증**: preview에서 `energy(8)===energyMax(8)` 확인, `__catalogSelfTest()` fails 0.

### 2026-06-25 — #1 개체 스킬 밸런스 1차: 약해진 버프 스킬 17종 보강
- **감사:** `scripts/audit-skills.js`로 ind 스킬 518종 이상치 점검 — **논리 오류 0**. 통계적 이상치(완숙 위력 180~190 용족/글래스캐논 = 의도된 프리미엄, 버섯·독성 완숙 110~120 = 의도된 광역 컨트롤)는 전부 설계 의도라 유지.
- **수정:** 설계상 **자기버프 2개**였으나 엔진 제약(스킬당 자기버프 1개)으로 1개만 남아 단계 대비 빈약했던 **버프 전용 스킬 17종**(`flower_grass.m`·`thorn.m`·`vine_bolt.m`·`draca_vine.m`·`volt_leech.m` 등)에 `energyGain:1` 부여 → 버프 턴이 에너지 중립이 되어 헛돌지 않음(검증된 `spark.m` 패턴). 설계상 단일버프였던 3종(`granite_oak.g`·`bright_bloom.g`·`terra_cactus.g`)은 새싹 버프와 동급이라 보존.
- **방식:** `scripts/patch-buff-skills.js`(단일·2줄 포맷 모두 처리, 블록 구문 검증). degenerate 버프 20→3. 위력/데미지 공식 불변(에너지 경제만 보강).

### 2026-06-25 — #1·#7 변이 140종 탐사 분포 배치 (획득 가능화)
- **목표:** `released:false`로 정의·도감·외형만 있고 **획득 불가**였던 변이 140종을 탐사로 얻을 수 있게 분포 배치.
- **방식 = 지역 시그니처:** `MUTANT_SIGNATURES` 테이블(생성기 [scripts/gen-variant-distribution.js](../scripts/gen-variant-distribution.js)) + EXPLORE_VIEW 병합 루프(원본 미수정·멱등·중복제거). 시그니처 경로(`rollSpeciesFromView`)는 `released`를 우회 → **`released:false`를 유지한 채** 변이가 "지역 희귀 발견"으로 등장. 따라서 **적 봇·일반 종 풀은 불변**(변이 홍수 없음).
- **매칭:** 지역 `el`⊇속성 & `types`⊇타입(전부 충족) + 변이형↔행성 `cardType` 선호(포식→dna·무기→weapon·독성→물약·용족→dragon) + 부하 균형. 25지역에 지역당 4~9종, 빈 지역 0. 타입까지 맞는 지역이 없는 35건은 속성만 매칭(같은 속성 지역).
- **출현율:** 시그니처 `SIGNATURE_CHANCE` 10% × 지역 변이 비율 → 홈 지역 탐사당 변이 ~8.5%, 개별 변이 ~1%(희귀 사냥).
- **검증:** 실제 런타임에 분포 주입 — `rollSpeciesFromView` 2000롤에서 변이 8.5% 출현·무효 롤 0·대상 지역 변이 전종 출현. 격리 워크트리 `feat/variant-dist`(다른 세션 동시 편집 회피). 남은 것 = 분포 밸런스 튜닝.
### 2026-06-25 — #12 잠재력 개념 완전 폐기 + 무지개 종자 정보 누출 차단
- **표시 제거:** 종자 카드 칩(`renderSeedBagCard`), 심기 확인 창(`renderPlantConfirm`), 식물 상세 좌측 알약(`plantInfoPills`)에서 "잠재력" 노출을 전부 삭제(미사용 `grade`/`pot` 변수 정리).
- **무지개 종자 누출 차단:** 심기 확인 창이 무지개 종자(`entry.rainbow`)의 타입·기원·등급을 그대로 노출하던 버그 수정 → 카드와 일관되게 타입 `???`·기원 "미지의 종자"로 마스킹, 아이콘 🌈, "심어야 정체가 드러납니다" 안내.
- ⚠️ **(경위·정정) 잠재력은 학습 스킬 등급에 영향 없었다:** 처음엔 "잠재력이 5대 핵심 스킬 등급 변종을 결정하니 메커니즘은 유지"로 적었으나 사용자 지적으로 재검증 → **오독.** 획득 가능한 카탈로그 175/182종이 전부 `stageSkills`(고정 등급)를 거쳐 잠재력 등급 추첨(`skill_rally`/`GRADE_SKILL_VARIANTS`) 경로는 폐지된 비카탈로그 grass 7종(획득 불가)만 남아 실플레이 미도달(tree_fire를 S/D로 돌려도 `skillGrades` 동일). **각 스킬은 하나의 고정 등급만 가진다(사용자 말이 맞음).** 유일 잔존 소비처는 양육 열매 스킬 보상 가중뿐이었다.
- **메커니즘 완전 제거(사용자 결정):** `p.potential` 필드, `POTENTIAL_ORDER`·`POTENTIAL_GRADE_BOOST`·`POTENTIAL_BIAS`·`SKILL_GRADE_RANK`·죽은 `potentialIndex` 삭제. `ensureSkillFields`의 잠재력 등급 추첨 제거(비고정 스킬=기본 C). 양육 열매 스킬 보상(`nurserySkillReward`)을 잠재력 무관 **균등 추첨**으로 전환. **봇 등급 스케일 헬퍼는 `GRADE_ROLL_BOOST`/`GRADE_ORDER`로 개명해 보존**(봇 자체 등급 기반·플레이어 잠재력과 무관). **개체 등급 `p.grade`는 별개 개념이라 유지**(등급 알약·`gradeOf`).
- **검증:** `window.__catalogSelfTest()` **0 fail**. preview에서 — 무지개 종자 심기창 마스킹(타입 `???`·기원 "미지의 종자"), 종자 카드/식물 알약 잠재력 미노출, 양육 열매 보상 200회 무오류(null 0)·균등 분포, 종자→식물 생성 경로에 `potential` 필드 부재 확인.

### 2026-06-25 — #1 버섯 = 전부 포자 고정(비포자 변이 폐지) + 포자 외형 액센트
- **결정:** 버섯형은 **비포자 변이형(일반/포식/무기/독성/용족)을 갖지 않는다 — 전부 포자(태생) 고정**(`baseVariants:['spore']`). 따라서 이전 로드맵의 "버섯 비포자 변이 35종" 항목은 **폐지**(변이 개체는 비버섯 28종만). 설계서(species-individual-concepts-design) 해당 항목 정리.
- **포자 외형 액센트(신규):** `ACCENT_MODULES.spore` 추가 + `FORM_ACCENT.spore='spore'` 매핑 → 버섯 포자형이 고유 외형을 갖는다(갓에서 피어오르는 포자 안개 타원 + 떠다니는 포자 입자 5개, 속성색·단계 gi 스케일). 씨앗 단계 제외(성장체부터). 기존 6액센트(none/maw/arms/toxin/draco/enhance)와 동급 모듈.
- **검증:** 실제 렌더 파이프라인(`composePlantSvg`→`bodyAccentSvg`)에 주입해 — spore 버섯에 액센트 적용(none 대비 +404자)·씨앗 제외·성장체부터 입자 노출·**비버섯 변이형(pred 등) 외형 불변** 확인. 격리 워크트리 `feat/spore-accent`에서 작업(다른 세션이 index.html 동시 편집 중이라 충돌 회피).
### 2026-06-25 — 전투 판정 오버레이 재개편: 흐림 폐지 + 식물 사이 빈 중앙 한 장씩 판정 + 카드 단순화
- **설계:** [specs/2026-06-25-battle-judge-overlay-rework-design.md](superpowers/specs/2026-06-25-battle-judge-overlay-rework-design.md). 이전 판("양쪽 카드 상시 + 상단 흐림")이 사용자 의도와 어긋나(식물·상태바가 가려짐/흐려짐) 재개편. 브레인스토밍(비주얼 컴패니언)으로 시퀀스 합의.
- **흐림 폐지·식물 안 가림:** `setBlur`→no-op(`.blurred` 미사용). 판정 시 `#battleArena.spread`로 두 식물을 위·아래(±42px·scale .88)로 벌리고, 그 **실제 빈 중앙**에 판정창을 `positionJudgeInGap()`으로 동적 정렬(스프라이트가 무대 박스를 넘쳐 `getBoundingClientRect().height`가 부정확 → offsetParent+스프라이트 gap으로 계산). 스프라이트 124→108px. 검증: 위·아래 24px 여유·식물/상태바 0 겹침.
- **한 장씩 판정 시퀀스:** `#judgeMessage` 제거, `#judgeCards`=3칸 슬롯 `[#judgeSlotLeft 내 카드 | #judgeOrder 화살표 | #judgeSlotRight 상대]`. ① 선공 판정=양쪽 카드+`setJudgeOrder`(➜선공·나/⬅선공·상대/방어 우선). ② 행동측만 홈 슬롯에 남기고(`setJudgeAction`) 반대 빈 슬롯에 상성 한 줄(`setVerdict`). ③ 후공 카드 홈 슬롯 재등장+반대 슬롯 판정. 신규 `judgeCardMarkup`/`setJudgeAction`/`setVerdict`. `playerSkill` **단일 순차 루프**(기존 needsOrder=false 동시적용 분기 폐지).
- **데미지·치명타·버프·디버프 = 식물 위 팝업:** 판정 칸엔 상성 한 줄만(효과가 굉장하다!/별로다…/정확히 들어갔다!/빗나갔다!). 데미지=`popup`, 치명타=`fxPopup(tgt,'치명타!','crit')`, 버프=`fxPopup(side,'🔺…','buf')`, 디버프=`fxPopup(tgt,'🔻…','deb')`. `applySkill` 내부 `showJudgeMessage`(hit/miss)→`setVerdict`로 교체.
- **카드 단순화:** 앞면 `skillCardHtml`=아이콘/이름/비용만(`battleCardFootChips` 제거). 하단 스킬바 46%→**38%**·`.skillcard` min-height 58→50. 뒷장(`showSkillDetail`)에 등급·분류·속성·독계열 pill 추가(꾹→`cardFlipIn` 유지).
- **검증:** `window.__catalogSelfTest()` **0 fail**. preview 실전 1턴: `➜선공·나`→내 카드+오른쪽 `정확히 들어갔다!`→상대 카드 재등장+왼쪽 `효과가 별로다…`(weak 경로), 식물 위 `E=-15`/`P=-21` 팝업·HP 정상 변동·턴 종료 후 spread 복귀·스킬바 재점등.
- **폐지/잔존:** `setVerdictSide`/`clearJudgeMessage` no-op, `showJudgeMessage` sleep만, `battleCardFootChips` 미사용(정의만 잔존).
- **후속 수정:** ① 선공 화살표를 **선공한 쪽을 가리키도록**(`setJudgeOrder`: 내 선공=⬅·상대 선공=➜ — 라벨과 모순되던 방향 교정). ② 무대 바닥(`#battleArena::before`)을 `height:42%`→`bottom:0`으로 늘려 **스킬바 상단과 바닥 경계를 하나로 일치**(이전엔 바닥이 끊겨 빈 띠가 생겨 상/하단 구분선이 어긋나 보였음).
- **후속 수정 2:** ③ 판정 시 `spread`를 `translateY(±42)`(식물이 무대 밖·스킬바로 튀어나감)에서 **바깥 모서리 기준 축소**(`scale(.8)`+`transform-origin` 위/아래)로 교체 → 식물이 제자리에서 줄며 가운데만 열림(무대 안에 머묾, 검증: 0 이탈·위·아래 160px 여유). ④ **하단 스킬바 높이를 스킬 수에 맞춰 자동**(`#cardPhase` `height:auto`·`max-height:52%`, `syncStageToSkillBar()`가 무대 `bottom`을 바 높이에 맞춤) → 스킬 3개면 18%(144px@812)로 딱 맞고 무대가 나머지 차지(휑함 해소·식물 공간↑). `hideCardPhase`에서 무대 bottom 복귀.
- **후속 수정 3:** ⑤ 전투 카드 앞면 하단에 **분류 칩(`skillCats`→`CAT_META`) 복원** — 공격🗡️/방어🛡️/버프✨/디버프🥀/체력회복❤️/에너지회복⚡(하이브리드는 복수 표시). `skillCardHtml` 풋에 `sc-chips`(좌)+`sc-cost`(우, `space-between`). 사용자가 스킬 성질을 한눈에 보고 변이 카드 적용을 판단하기 위함(분류 기준 = `skillCats`: 명시 `cats` 우선 + `kind`(attack/elemental/dot→공격·guard→방어·buff→버프·debuff→디버프) + 라이더(`power>0`→공격·`dot`/`enemyDebuff`→디버프·`selfBuff`→버프·`heal`/`lifesteal`→체력회복·`energyGain`/`energyRegen`→에너지회복)).

### 2026-06-25 — #1 개체 고유화: 버섯 base 성체/완숙 + 변이 개체 140종 고유 스킬 (생성기 일괄 반영)
- **범위:** 설계서([species-individual-concepts-design](superpowers/specs/2026-06-24-species-individual-concepts-design.md))의 **풀 매트릭스 잔여분 전부** — 버섯 base 7 성체/완숙 14스킬 + 비버섯 변이 140종(28칸 × 5변이형). `SPECIES_CATALOG`(140 신규 엔트리)·`SKILL_LIB`(434 신규 스킬)만 수정(빌더/머지/도감 라이브가 자동 흡수).
- **버섯 base 7:** 성장체 시그니처(`sig.spore_*`)는 유지하고 성체(`ind.spore_*.m`)·완숙체(`ind.spore_*.e`)만 추가 → base 35 전 종이 성장체/성체/완숙체 3스킬 깊이로 통일.
- **변이 140종:** (타입×속성×변이형) = 별개 카탈로그 개체. 태생 변이 고정(`baseVariants:['pred'|'weapon'|'toxic'|'dragon'|'normal']` → form 고정·외형 액센트 자동)·`released:false`(획득 풀 제외, 분포 배치는 #7 후속)·`variantSlots`(변이형 2 + normal 4, 일반형은 normal 6). 각 개체 고유 스킬 3개(`ind.<key>.g/.m/.e`).
- **구현 방식 = 스펙 파서 생성기** [scripts/gen-individuals.js](../scripts/gen-individuals.js): 설계서 한국어 서술("위력110+흡혈35%+화상(3T)" 등)을 엔진 필드로 기계 변환. 매핑 = impl plan + **기존 base 28 코드 관례**: 흡혈 동반 공격→`kind:'drain'`, 엔진 1개 제약상 **이중 selfBuff는 첫 번째만**, grade g/m/e=B/B/A(완숙 위력170↑=S), heal·buff 공존 시 **선두 토큰**으로 주효과 판정. 충돌·앵커·구문 자동 검사.
- **검증:** `window.__catalogSelfTest()` **0 fail**. preview: 신규 종 빌드(182종)·form 고정(`carno_oak`→pred)·`released:false` 140·단계별 고유 스킬 해금(growing→g, mature→+m, evolved→+e)·획득 풀 누출 0·**신규 ind 스킬 518개 전부 엔진 지원 필드만(0 bad)**. 도감 라이브 자동 반영.
- **남은 설계:** 버섯 비포자 변이 35종 + 변이 분포 배치(#7)·밸런스 튜닝.

### 2026-06-25 — 전투 UI 개편: 하단 고정 스킬바 + 포켓몬식 레이아웃 + 간결 판정 연출
- **설계/플랜:** [specs/2026-06-25-battle-ui-redesign-design.md](superpowers/specs/2026-06-25-battle-ui-redesign-design.md) · [plans/2026-06-25-battle-ui-redesign.md](superpowers/plans/2026-06-25-battle-ui-redesign.md). 워크트리 `feat/battle-ui-redesign`에서 7태스크 → main FF 머지.
- **스킬바 상시 고정:** 매 턴 떠올랐다 사라지던 `#cardPhase` 오버레이를 **하단 영구 고정 풋바**로(상단 54% 무대 / 하단 46% 스킬바). `showCardPhase`→`refreshSkillBar`(상주 렌더+불 켜짐/꺼짐)·`lockSkillBar`(판정 중 잠금). **`battleViewBtn`(숨기기/보이기 토글)·`toggleBattleView`·`B.view` 폐지.**
- **포켓몬식 대각 배치:** 적=상태바 좌/식물 우, 나=식물 좌/상태바 우(`.arena-fighter` row 정렬, DOM 순서 그대로 활용).
- **카드 앞면 3단:** 이름(상)/대표 아이콘(중)/분류칩+비용(하). `battleCardFootChips`(cats+속성+독계열). 설명·계수는 앞면 제거 → **꾹 누르면 카드가 뒤집혀(`cardFlipIn`) 뒷면에 계수 상세**.
- **판정 연출 재배선:** 양쪽 카드 적 좌·나 우 제자리 등장 + **상단(식물)만 흐림(`setBlur`)** → 데미지 적용 시 흐림 해제. 상성 한 줄을 행동 카드 안쪽으로(`setVerdictSide`). `applySkill` 전부 `suppressMessages:true`로 **순차 effectNotes 폐지**(상성 한 줄만), `tickStatuses` 순차 메시지도 폐지.
- **순간형 상태 VFX:** `spriteFx(side,kind)` — 스프라이트 위 1회 번쩍(독=보라/화상=불/출혈=붉은방울/방어막=금속코팅·소진 시 깨짐/버프·디버프). `addDot` 내부 트리거로 모든 독·화상·출혈 자동 커버. 지속 표시는 기존 `statusTags` 아이콘 유지.
- **검증:** `window.__catalogSelfTest()` 0 fail. preview에서 다턴 진행·매치 종료·판정 흐름 수동 검증. **밸런스/데미지 공식 불변(연출·표시만 개편).**

### 2026-06-25 — #1 개체 고유화: 외형 액센트 시스템 + 변이종 form/획득 게이트 + 목본 base 7 고유 스킬
- **외형 액센트 시스템(신규):** `composePlantBody`/`composePlantSvg`에 `bodyAccent` 배선 + `ACCENT_MODULES` 레지스트리 6키(none/maw·포식/arms·무기/toxin·독성/draco·용족/enhance·일반). **변이형→액센트 자동 매핑**(`accentFromForm`)이라 같은 타입·속성이라도 변이마다 외형이 달라진다(절차적 SVG 오버레이, 손그림 0). `spriteFor`·`svgPlant`·진화모달·양육 레이어가 `form`을 전달하도록 연결. 씨앗 단계엔 액센트 없음. preview에서 6변이형 외형 전부 구별·화분 합성 무손상 검증.
- **변이종 form 고정 + 비획득 게이트(신규):** `applyCatalogVariantFields`가 `baseVariants[0]`로 form을 **무조건 고정**(변이종은 rollForm 무시·태생 변이 확정, 포식형 predType 기본 보강). `SPECIES[].released` 필드 추가 + `pickAcquirableSpecies`가 `released` 종만 풀에 포함 → 향후 변이 개체 140종을 정의해도 획득/적봇 풀이 범람하지 않음(분포 배치는 #7 후속).
- **base 35 고유 스킬 완성:** 목본/화초/다육/덩굴 각 7종(28) 성장체/성체/완숙체 고유 스킬 3개씩(`ind.<key>.g/.m/.e`, 84종) + 버섯 7종(성장체 sig). 모든 base 종 카탈로그 `stageSkills` 연결(설계 #1~#28). **버섯 성체/완숙체·변이 개체 140은 후속 배치.**
- **계획서:** [docs/superpowers/plans/2026-06-25-species-individual-concepts-implementation.md](superpowers/plans/2026-06-25-species-individual-concepts-implementation.md) — 12 Task 배치 계획 + 스킬 효과→엔진 필드 매핑 규칙.
- ⚠️ **깨진 커밋 복구:** 직전 consolidation 커밋(619fc25)은 **동시 편집(OneDrive 동기화)이 화초/다육/덩굴 스킬 정의 63개를 `SPECIES_CATALOG` 안(잘못된 위치)에 넣어 게임이 로드 시 크래시**하는 상태로 박혀 있었다(커밋 전 재검증 누락). 스킬 정의를 `SKILL_LIB`로 이전 + `aqua`→카탈로그 종 승격으로 stale해진 레거시 폴백 테스트를 `grass_water`로 교체. `window.__catalogSelfTest()` **0 fail**·게임 정상 로드·외형 액센트 적용 검증.
- ⚠️ **OneDrive 다중 세션 경고:** 저장소 경로가 OneDrive 안(`C:\Users\soosa\OneDrive\...`)이라 동기화가 작업 중 파일을 덮어쓴다. 또한 동시에 별도 세션이 #10 전투 UI(`battle-ui-redesign-design.md`)를 작업 중. **작업 시 OneDrive 일시정지·세션 간 index.html 동시 편집 금지 권장.**

### 2026-06-25 — 버그픽스: 양육 화분 상세 팝업이 화면 아래로 벗어나던 문제
- **증상**: 식물양육 탭에서 화분(식물)을 누르면 상세 팝업이 화면을 넘어 아래로 떠 보이지 않음.
- **루트 원인**: `#nurseryDetailCard`는 인라인 `position:absolute;bottom:0`로 바텀시트를 의도했으나, 홀로그램 테마 규칙(`index.html` ~1692 `.nursery-pop-card{position:relative !important}`)이 이를 덮어써 카드가 일반 흐름으로 `#nurseryGrid` **아래**에 배치됨 → 그리드가 길면 스크롤 영역 하단(화면 밖)으로 밀림. (같은 클래스 `#nurseryPopBody`는 `.modal` 오버레이 안이라 flex 중앙정렬로 정상이던 게 단서.)
- **수정**: 상세 팝업을 기존에 정상 동작하는 `.modal` 오버레이 패턴(`#nurseryDetailModal`)으로 통일 — `#nurseryScreen` 내부의 절대배치 카드+백드롭 제거, 최상위 `.modal`로 이전(백드롭 클릭 시 닫힘). `openNurseryDetail/closeNurseryDetail`는 모달 show/hide로 변경, `closeAllModals` 목록에 `#nurseryDetailModal` 추가.
- **검증**: preview(375×812)에서 카드 세로 완전 가시(top 278/bottom 522<812)·가로 중앙정렬·닫기/백드롭 정상. `window.__catalogSelfTest()` 0 fail.

### 2026-06-25 — #1 변이 재설계 플랜4: 카드 획득 경로 연결 (공통 카드 14종 + 발광 상자 폐지)
- **공통 보급상자(`box_card_common`)에 공통 카드 14종 전부 연결** — 그동안 `card_cellwall`·`card_thornstem` 2종만 드롭됐고, 플랜2~3에서 효과 엔진은 완성됐으나 **나머지 12종(스탯코어 4·버프디버프 4·무등급 4)이 보급상자 드롭 풀에 미연결 → 플레이어 획득 불가** 상태였음. 14종 전부 드롭하도록 확장하고 `chance` 가중치 재배분(스탯/방어 토대 高 9~10 · 버프/디버프 中 7 · 무등급 강카드 低 4~5).
- **발광 전용 상자(`box_card_chloro`) 폐지** — 발광형(`lumen`) 신규 폐지에 맞춰 전용 구매처 제거. **엽록체 카드 2종(`card_chloroboost`·`card_solarheal`)과 탐사 'chloro' 테마(5개 지역)는 legacy 발광 식물용으로 존속**(탐사로만 획득). 카드 type을 common으로 흡수하지 않은 이유 = 흡수 시 탐사 5개 지역 `cardTypes`/themeNote까지 연쇄 수정 필요(blast radius↑) → 최소 변경·무회귀 우선.
- **용족 강화 카드 + 전용 상자는 다음 작업으로 보류** — 용족은 기본 스킬(비늘/브레스)로 이미 동작하므로 미연결이 곧 버그는 아님.
- **셀프테스트 4종 추가**: 모든 상자 카드 reward의 `card_id` 실재 검증 / 공통 상자가 공통 타입 카드 전부 드롭(고아 공통 카드 0) / 카드 상자는 box `cardType`과 일치하는 카드만 드롭 / 발광 상자 폐지 확인. `window.__catalogSelfTest()` **0 fail(65케이스)**. preview에서 공통 상자 5000회 롤 → 14종 전부 출현·등급 부여·런타임 오류 0 검증.
- **문서 동기화**: `master-roadmap.md`(결정 로그·#1 상태), 플랜3 문서(플랜4 진입점 체크), `CHANGELOG.md`(이 항목).

### 2026-06-24 — 버섯 타입 완성: 7속성 종·전용 외형·시그니처·타입별 단계명·탐사 드롭
- **7속성 종 추가**: 스포어캡(풀)·이그니캡(불)·미스트캡(물)·트러플캡(대지)·윈드퍼프(바람)·볼트캡(번개)·프로스트캡(빙결). 스탯 = `TYPE_STATS.mushroom`(38/9/5/8, 저스탯) + `ELEMENT_STATS`. 희귀도 rare(레거시 common 대비 획득확률↓). 태생 변이 `baseVariants:['spore']`(포자변이 기본 장착).
- **전용 외형**: `composePlantBody`에 mushroom 분기 신설 → **클래식 독버섯 실루엣**(통통한 자루+점박이 갓+고리, 완숙체엔 떠오르는 포자 입자). 떡잎 단계(`drawCotyledons`) 생략. 후속 bodyStyle 훅(B·C 외형, 현재 기록만).
- **시그니처 6종**: `SKILL_LIB`에 버섯 전용 스킬 추가(포자 방출·균사 장악·독포자·포자 군락·진균 증식·포자 폭발). 각 종의 `signatures` 배열에 단계별 해금(성장체/성체/완숙체).
- **타입별 생장 단계명**: `STAGE_NAMES_BY_TYPE` 5타입 전체 정의(목본·화초·다육·덩굴·버섯). 버섯 = 포자·균사·버섯눈·어린갓·성숙버섯·포자갓. `growthStageName(stage, seedType)` 헬퍼로 UI 표시(진화 토스트·모달·도감).
- **탐사 드롭 연동**: `EXPLORE_VIEW` 6개 지역(포자 늪·균사 회랑·흑요암 능선·잿빛 평원·전자기 늪·서리 동굴)의 `types` 배열에 `'버섯형'` 추가 → 탐사 성공 시 버섯형 종자 획득 가능.
- **셀프테스트**: 4개 신규 케이스(`window.__test`) 추가(버섯형 스탯·단계명·외형·탐사 드롭) + 기존 케이스 전부 통과(`window.__catalogSelfTest()` 0 fails).
- **문서 동기화**: `species-system-guide.md`(버섯형 7종 스탯표·실루엣 행·단계명 표), `master-roadmap.md`(현황 요약·결정 로그·문서지도), `CHANGELOG.md`(이 항목) 갱신.

### 2026-06-24 — #2 양육 보완 배치: 뱃지·전체수확·낙엽·전투 공급원·유령버튼 정리
> 양육 감사에서 찾은 QoL/버그 항목 일괄 처리(work-2).
- **🔔 열매 준비됨 뱃지**: 익은 열매 화분이 있으면 하단 양육 탭에 빨간 점(`updateNurseryBadge`/`nurseryHasReady`, `renderMain`에서 갱신).
- **🧺 전체 수확**: 식물원 헤더 버튼 → 익은 화분 전부를 묶어 한 번에 공통 RewardReveal 개봉(`harvestAllPots`). 기존 유령 "수확 목록"(빈 `openFruitBag`) 버튼을 이걸로 교체.
- **🍂 낙엽 산출**: 성장체 이전(씨앗·새싹·유체)도 빈 시간 없이 낙엽→양분(물)을 느린 트리클로 산출(`nurseryTick` leafGauge, 열매 절반 속도).
- **💧 물·비료 공급원 확대**: 전투 승리 시 물 1~2(+비료 50%) 보상(`endMatch`), 결과창에 "양육 자원" 카드 표시. (탐사에 이어 두 번째 공급원)
- **검토(변경 불필요):** 즉시가속 게이지 리셋·장기 방치 버프 평균은 현 동작이 적절하여 유지.

### 2026-06-24 — #2 양육 보완: 수집 화분 시스템 + 식물/화분 시각 분리(#12 진입점)
> 설계 [spec](superpowers/specs/2026-06-24-collectible-pots-design.md) · 계획 [plan](superpowers/plans/2026-06-24-collectible-pots.md). work-2 브랜치(병렬 버섯 세션과 충돌 격리)에서 구현, self-test 0·preview 검증.
- **죽어있던 `potQuality` 부활** → **수집 화분 5종**(테라코타·도자기·유리·크리스탈·황금, 등급색 흰<초록<파랑<보라<주황). `POT_CATALOG`·`potOf(p)`.
- **효과:** 화분이 충전속도(+0~40%)·최대 열매(+0~2)·등급확률에 반영. `nurseryMaxFruits`/`nurseryTick`/`rollFruitRarity` 연동.
- **획득:** 도자기·유리=상점 크레딧, 크리스탈·황금=탐사 5% 드롭(+보급 후속). **전부 공통 RewardReveal 'pot' 개봉**(🪴). 영구 해금·자유 장착, 중복→크레딧150 환급.
- **장착:** 화분 상세창 `🪴 화분 바꾸기`(`openPotPicker`/`equipPot`), 미보유 잠금 표시.
- **⭐ 식물/화분 시각 분리(#12·#3 진입점):** `composePlantSvg(...,{noPot})`(화분 3요소 스킵, `composePlantBody` 미변경) + `potVisual(potId)`(화분 종류별 절차적 SVG, 크리스탈 facet/황금 crown, `POT_SPRITE_OVERRIDES` PNG 훅). 양육 칸 = 화분 레이어+식물 레이어 합성, 흔들림은 식물만.
- **데이터:** `state.pot_inventory{id:true}`·`p.nursery.potId`, 무회귀 마이그레이션(구 세이브→테라코타).
- ⚠️ 로드맵 §2/§5 등록은 main 머지 시 추가(병렬 세션과 충돌 회피).

### 2026-06-25 — #7 탐사 분포 점검 후속: 0-종 버그 2건 해결 + 얇은 지역 6→1
> 직전 점검([spec §10](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md))에서 나온 분포 품질 이슈 수정. EXPLORE_VIEW 데이터만 변경(로직 무변경).
- **0-종 버그(테마 매칭 0종→조용히 행성 풀 전역 폴백) 해결**: ① 네레이돈/심해 균열 `types`에 `화초형` 추가 → 풀의 `aqua`가 일반 등장(`vine_water`는 희귀 시그니처 유지). ② 아즈텔 행성 풀에 `spark`·`aqua` 추가 → 전자기 늪 2종; 풀로 올라와 충돌하던 방사 폐허 `signature`는 `spark`→`tree_bolt`(풀 밖 전용)로 교체.
- **얇은 지역(1종) 6→1**: 아르키아·잿빛 평원·윈드테라스·방전 평원·자철 협곡·빙저 동굴의 `types`에 어울리는 2번째 타입 추가 → 각 2~3종. 심해 균열만 S랭크 의도적 희박(흔함 1+희귀 시그니처).
- **검증**: preview HttpListener 환경 이슈로 라이브 셀프테스트 불가 → Node로 `index.html`에서 `EXPLORE_VIEW`·`SPECIES_GRID` 추출·eval해 분포 재계산(정적). 0-종 0건·thin 1건(의도적)·EXPLORE_VIEW eval 성공(문법 무결). 속성표·타입 무변경.

### 2026-06-24 — #7 탐사 업그레이드: 아틀라스 세계관 + 종 분포 + 폴드 모션 + 행성 11개
> 브레인스토밍 → 설계([spec](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md)) → 구현. 셀프테스트 7종 추가·전부 통과(0 fail) + preview 검증.
- **종 분포(옵션 C)**: `rollSpeciesFromView(region, planet)` = 행성 `species` 풀 ∩ 지역 `el`/`types` + `region.signature` 별도 저확률 경로(`SIGNATURE_CHANCE=0.10`) + 폴백 사다리(교집합 비면 행성 풀→테마 전역, 무회귀). 행성마다 "사는 종"이 정해지고, 특정 지역엔 풀에서 제외한 **희귀 시그니처 종**(✦)이 가끔 등장.
- **데이터**: `EXPLORE_VIEW` **8→11행성** — 세라핀(궤도1·바람 고원)·볼카르(궤도2·번개)·티아멘(궤도3·빙해) 추가. 모든 행성에 `species` 풀 + 일부 지역에 `signature` + 아틀라스 `intro`.
- **UI(복잡도 억제)**: 행성 팝업 `exPlanetSpeciesPreview`(주요 서식종 4칩 미리보기), 지역 선택 시 `exRegionSpecies`(서식 종 + ✦희귀 시그니처 칩, 가로 스크롤). 종 칩은 절차적 SVG(`composePlantSvg`) 재사용.
- **세계관 리스킨**: 행성=여러 외계 문명이 다른 은하에서 공유한 좌표, **연료=폴드 에너지**(궤도 해금=폴드 심도), 우주맵="아틀라스 — 폴드 좌표망", 은하 성운 앰비언스(#explorationBody). 구조 무변경, 명칭/문구만.
- **탐사 모션**: `exTravelOverlay`를 "시공간 폴드(차원이동)" 연출로 교체 — 격자 왜곡(`etwarp`)→균열 개방(`etrift`)→탐사선 흡입(`etfold`)→섬광(`etflash`). `prefers-reduced-motion`이면 ~480ms 축약(애니메이션 정지).
- **경기장**: 풀로세움=모든 문명의 **상시 개방 게이트** → 무료 입장(연료/참가권 없음). 게임방법 ①⑦ 문구·콘솔 라벨 보강.
- **회귀 안전**: 신규 필드(`species`/`signature`) 전부 옵셔널 — 없으면 기존 동작. 셀프테스트: 풀∩테마 한정·시그니처 분리 경로·빈 교집합 폴백·풀 미지정 레거시 동작·`EXPLORE_VIEW` 키 무결성·프리뷰 렌더. **속성 상성표·타입 5종 무변경.**

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
