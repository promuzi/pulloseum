# 풀로세움 — 마스터 개발 로드맵 (단일 진실 문서 / SSOT)

> **이 문서가 무엇인가:** 풀로세움의 **현재 구현 현황 + 앞으로의 방향 + 모든 하위 문서로 가는 지도**를 한곳에 모은 **유일한 허브 문서**다.
> 어느 기기에서 어떤 AI(Claude·Codex·Copilot 등)로 작업하든 **이 파일을 가장 먼저 읽고** 현황과 방향을 파악한다.
> 세부 수치·설계는 길어지므로 본문에 다 쓰지 않고 **하위 문서로 타고 들어간다**(§2 문서 지도).
>
> ⚠️ **갱신 의무(가장 중요):** 코드/데이터/기획이 바뀌면 **그 변경을 이 문서(또는 해당 하위 문서)에 즉시 반영하고 함께 푸시**한다. 놓치는 것 없이, 항상 실시간으로. 규칙은 §6 참고.

- **최종 갱신:** 2026-06-23
- **별칭:** 이 문서를 **"마스터 로드맵" = "로드맵" = "마스터 문서"** 무엇으로 부르든 전부 이 파일(`docs/master-roadmap.md`)을 가리킨다.
- **📱 모바일에서 보기:** GitHub에서 열면 마크다운이 예쁘게 렌더링된다(푸시만 돼 있으면 항상 최신) → <https://github.com/promuzi/pulloseum/blob/main/docs/master-roadmap.md> (브라우저 즐겨찾기 또는 GitHub 앱에서 파일 열기).
- **게임 실행:** [index.html](../index.html) (브라우저 더블클릭, 빌드 없음 — 전부 단일 파일에 인라인)
- **상위 안내:** [CLAUDE.md](../CLAUDE.md) / [AGENTS.md](../AGENTS.md) / [.github/copilot-instructions.md](../.github/copilot-instructions.md) — 셋 다 이 문서를 첫 줄에서 가리킨다.

---

## 1. 개발 방향 — 상태 한눈에 보기

| # | 방향 | 상태 | 다음 한 걸음 | 관련 문서 |
|---|------|------|-------------|----------|
| 1 | 식물 종류 확장 | 🟡 개체 카탈로그 구조 완료 | 개체/스킬 내용 채우기(`SPECIES_CATALOG`/`SKILL_LIB`) + 변이 슬롯 UI | [species](species-system-guide.md) · [trait](trait-growth-roadmap.md) · [plan](superpowers/plans/2026-06-24-plant-individual-catalog.md) |
| 2 | 양육/열매 시스템 ⭐ | ✅ **구현 완료**(개봉연출 통일까지) | (후속) 전투/랜덤상자 물·비료 추가 공급원·밸런스 튜닝 | [nurture spec](superpowers/specs/2026-06-24-nurture-fruit-system-design.md) · [plan](superpowers/plans/2026-06-24-nurture-fruit-system.md) |
| 3 | 도트 UI 적용 | 🟡 홀로그램 오버레이 적용 | 식물 1종 PNG 시범 → `SPRITE_OVERRIDES` | [pixel-art](pixel-art-ui-roadmap.md) |
| 4 | 함선/길드/방꾸 → **오픈월드** | 🟡 함선 기초 有 | 타일 워킹 → 오픈월드 확장, 가구 기능 연결 | — |
| 5 | 애니메이션 | 🟡 일부 有 | 도입부/전환 연출(3번 연동) | [pixel-art §4](pixel-art-ui-roadmap.md) |
| 10 | 전투 화면 UI 수정 | 🔲 미착수 | 카드/판정창 레이아웃·연출 개편 | — |
| 11 | 시작화면 수정 | 🔲 미착수 | 타이틀→게임 전환 연출(5번 연동) | — |
| 12 | 종자 가방 창 + 식물/화분 분리 | 🔲 미착수 | 가방 UI 재설계 + 식물·화분 레이어 분리 | [pixel-art §-](pixel-art-ui-roadmap.md) |
| 6 | 음악/효과음 | 🔲 미착수 | 라이선스·재생 방식 조사 | — |
| 7 | 탐사 시스템 재설계 | 🟢 **구현 완료**(아틀라스+종분포+폴드+행성11) | 새 개체를 행성 `species`/지역 `signature`에 배치 · 분포 밸런스 튜닝 | [exploration spec](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md) · [species §4](species-system-guide.md) |
| 8 | PvP/서버 | 🔲 미착수 | 비동기(고스트) PvP vs 실시간 결정 | — |
| 9 | 구글 플레이 출시 | 🟡 APK 기반 有 | 로컬 번들 결정 → 릴리스 서명·등록 | [android](android-capacitor-wrapper.md) |

상태 기호: 🔲 미착수 · 🟡 진행/설계 중 · ✅ 완료 · ❄️ 보류

---

## 2. 문서 지도 (어디에 무엇이 있나)

> 이 허브는 **방향과 현황**만 담고, **세부 수치·설계는 아래 하위 문서**에 있다. 작업 주제에 맞는 문서를 타고 들어가라.

| 문서 | 무엇이 들어있나 | 언제 보나 |
|---|---|---|
| **[balance-sheet.md](balance-sheet.md)** | 밸런스 시트(정식): 35종 스탯·상성·생장·데미지 공식·스킬 전체·변이 카드·토너먼트 + **index.html 수정 위치(줄번호) 맵** + **밸런스 검토 포인트** | 수치 조정·"이 스킬/종 약하다" |
| **[battle-mechanics-deep-dive.md](battle-mechanics-deep-dive.md)** | 전투 엔진 *동작 순서*: 턴 진행·데미지 파이프라인·상태이상 순서·봇 내부 구성·예약된(미반영) 패시브 | 전투 로직 디버그·확장 |
| **[species-system-guide.md](species-system-guide.md)** | 종 시스템: 속성×타입 35종, 외형 자동생성 규칙, 탐사 드롭·무지개 종자 연동 | 종 추가·외형·탐사 분포 |
| **[trait-growth-roadmap.md](trait-growth-roadmap.md)** | 용어 체계(타입/속성/생장/변이형/잠재특성), 변이형↔카드 매핑, 잠재특성 향후 설계 | 변이형/특성/타입 설계 |
| **[pixel-art-ui-roadmap.md](pixel-art-ui-roadmap.md)** | 도트화 인계: 채택 방식(PNG 교체), 규격, AI 도트 도구, 모션, 미확정 결정 | #3·#5 작업 시작 전 필독 |
| **[android-capacitor-wrapper.md](android-capacitor-wrapper.md)** | Capacitor 안드로이드 포장·APK 빌드 절차, 네이티브 세이브 | #9 빌드·출시 |
| **[benchmark-proposals.md](benchmark-proposals.md)** | 유사 게임 분석 + 업데이트 제안 **선택 시트**(방치/리텐션/엔드게임/번식/PvP 등 A~D 택1) | 다음 방향 정할 때·사용자 선택 대기 |
| **[feature-designs.md](feature-designs.md)** | 위 8대 항목의 **구현 직전 상세 설계**(선택지별 동작·UI·데이터모델·구현방식·난이도) | 항목 확정 후 구현 직전 참조 |
| **[handoff-next.md](handoff-next.md)** | **🔖 인계 문서** — 기기 바꿔 이어갈 때 가장 먼저 읽기(현황·선택 대기 8항목·재개 절차) | 새 세션/다른 기기 시작 시 |
| **[superpowers/specs/2026-06-24-nurture-fruit-system-design.md](superpowers/specs/2026-06-24-nurture-fruit-system-design.md)** | 양육/열매 시스템 설계(✅확정) — 2축·게이지 모델·5색 희귀도·공통 RewardReveal·기존 개편 관계 | **#2 양육 설계 근거** |
| **[superpowers/plans/2026-06-24-nurture-fruit-system.md](superpowers/plans/2026-06-24-nurture-fruit-system.md)** | 양육/열매 구현 계획(Task 1~8) — 데이터모델·게이지/보상 로직·UI·RewardReveal·연결 | **#2 양육 구현 중** |
| **[superpowers/specs/2026-06-24-plant-individual-catalog-design.md](superpowers/specs/2026-06-24-plant-individual-catalog-design.md)** | 개체 카탈로그(A+C) 설계서 — 데이터 구조·타입 개편·마이그레이션 | #1 종 확장 설계 |
| **[superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md)** | 탐사 업그레이드 설계(✅확정) — 행성 풀+지역 시그니처 종 분포·아틀라스 세계관·폴드(차원이동) 모션·경기장 무료입장 | **#7 탐사 재설계 근거** |
| **[superpowers/plans/2026-06-24-plant-individual-catalog.md](superpowers/plans/2026-06-24-plant-individual-catalog.md)** | 개체 카탈로그 전환 구현 계획(Task 0~7, 완료) | #1 구현 참조 |
| **[superpowers/specs/2026-06-24-species-individual-concepts-design.md](superpowers/specs/2026-06-24-species-individual-concepts-design.md)** | 개체 고유화 설계(진행 중) — 타입/속성 공통 컨셉 한 줄·개체 템플릿·개체당 고유 스킬 3개(성장체/성체/완숙체)·개체 로스터 누적 | **#1 개체 컨셉·스킬 — 작업 중** |
| **[superpowers/specs/2026-06-24-mutation-forms-cards-redesign-design.md](superpowers/specs/2026-06-24-mutation-forms-cards-redesign-design.md)** | 변이형·변이 카드 재설계(🟢설계완료) — 6변이형 컨셉·카드 로스터, 무등급(`fixed`) 카드, `cats` 스킬 라벨, 독 스택 상한, 발광 폐지·자동교체 룰. **수치 placeholder** | **#1 변이 — 구현 계획(writing-plans)** |

**정리된(폐기) 문서:** `battle-growth-guide.md`(→ balance-sheet.md로 통합, 삭제), `pluloseum_godot_migration_plan.md`(Godot 이식 잔재 — 무관, gitignore).

---

## 3. 현재 구현 현황 (지금 게임이 어디까지 됐나)

> 세부는 §2 하위 문서로. 여기선 "무엇이 작동하는가"만 요약.

- **종/식물:** **개체 카탈로그(`SPECIES_CATALOG`)** 기반 — 레거시 격자 35종 위에 개체별 확장(rarity·변이슬롯·고유스킬)을 머지. 타입 5종 = 버섯/목본/화초/다육/덩굴(**초본형 폐지 → 화초형 흡수**, 구 초본 7종은 flower로 전환·legacy). 외형은 **절차적 SVG**(타입×속성×생장단계 자동). 새 게임 시 **무지개 시작 종자** 1개 지급. → [species](species-system-guide.md) · [plan](superpowers/plans/2026-06-24-plant-individual-catalog.md)
- **스킬(새싹·유체):** 타입 축(기본공격·기본방어·타입특기 ×5) + 속성 축(속성발현 ×7) **공유 스킬**(`STAGE_SKILLS`, 개체 고유 없음). 새싹=타입기본공/방+속성발현, 유체=+타입특기+속성기. 성장체 이상은 기존 `ELEMENT_GROWTH_SKILLS`(후속 재설계). → [species §2-5](species-system-guide.md)
- **생장:** 6단계(씨앗→새싹→유체→성장체→성체→완숙체). 단계 상승 시 스탯 배율↑ + 스킬 해금 + 진화 연출. **현재 경험치원이 전투 승리 + 물/비료로 이원화** → #2에서 경험치 단일화 예정. → [balance §3](balance-sheet.md)
- **전투:** 로드아웃 **6칸**, 카드 선택 페이즈 + 판정 창 연출. 속성 상성(1.5/0.67), 상태이상 엔진(중독/출혈/화상·버프/디버프), **데미지 25% 하한선**. 봇은 플레이어 비례가 아닌 **티어+라운드+생장 절대 스탯**. → [battle-mechanics](battle-mechanics-deep-dive.md)
- **변이형/카드:** **6변이형**(일반/포식/무기/독성/포자/용족, **발광 폐지**). 변이형=패시브 없음·카드 슬롯 게이트. 공통 스탯 코어 4종 포함 **변이 카드 S~D 등급제**(주효과 계수+서브특성+`fixed` 무등급 클래스), 변이형별 보급상자로 획득. 무기 카드 최대 2장, 전투 중 variant bar(하단 별도 슬롯)에서 사용. 스킬 `cats` 6종 태그(공격/방어/버프/디버프/체력회복/에너지회복). **잠재특성 20종은 스킬 해금 분류로만 쓰고 패시브는 의도적 미반영(예약)**. → [balance §6](balance-sheet.md) · [trait](trait-growth-roadmap.md) · [변이 재설계](superpowers/specs/2026-06-24-mutation-forms-cards-redesign-design.md)
- **토너먼트/티어:** 예선(5판3선)→16강→8강→4강→결승. 티어·점수는 **식물 개체별**(브론즈→…→풀로세움 4000). → [balance §7](balance-sheet.md)
- **탐사:** **아틀라스 궤도 우주맵(11행성/3궤도)** — 행성=다른 은하의 공유 좌표, **연료=폴드 에너지**(=궤도/폴드심도 해금), 탐사 실행 시 **시공간 폴드(차원이동) 연출**. 종 분포 = **행성 서식 풀(`species`) + 지역 시그니처(`signature`) + 지역 테마(속성·타입) 필터**(`rollSpeciesFromView`). 탐사선 4스탯·궤도 게이팅·6단계 난이도. 보상=종자+변이카드(아이템 폐지). 풀로세움=상시 개방 게이트(무료 입장).
- **함선:** "🚀 함선" 탭 = 포켓몬식 **타일 워킹**(`#shipScreen`), 콘솔 앞 Ⓐ로 토너먼트/탐사/상점/재배 진입. 가구·NPC는 데이터 주도(확장 여지).
- **상점:** 변이형별 보급상자 + 크레딧 영구 강화. (소모품·가챠 폐지)
- **메인 UI:** 상단 재화 헤더(레벨/크레딧/미네랄/설정), 프로필 배너, 식물 목록, 식물 관리창 3탭(강화/변이/스킬). 하단 탭은 **상점 / 탐사 / 식물·전투(중앙) / 식물양육 / 함선** 순서. 다운로드본 반영으로 픽셀/홀로그램 CSS 오버레이, 방별 틴트, 팝업 중앙 정렬, 메인방 우주선 내부 SVG 보강이 적용됐다. 공용 팝업은 상·하단 헤더와 안전영역 사이에 스크롤 배치되며 탭 전환 시 닫힌다.
- **세이브/플랫폼:** localStorage + **세이브 내보내기/가져오기** + Capacitor **네이티브 영구저장**. 안드로이드 디버그 APK 빌드 성공. → [android](android-capacitor-wrapper.md)

**알려진 밸런스 이슈**(검토 대기)는 [balance-sheet.md §8](balance-sheet.md) 참고: 잠재특성 패시브 미작동, 종간 BST 격차(~42), 무기 스킬 고위력, 속성기 광역 편중 등.

---

## 4. 개발 방향 — 상세

### 1. 식물 종류 만들기
**목표:** 종을 늘려 수집·육성의 다양성 확대. 세부 모델은 [species-system-guide.md](species-system-guide.md).
**원칙(일관성):** 종은 **고정 속성 1개** + **식물 타입 1개**. 외형·이름·스킬이 속성과 일치(과거 "속성·이름·외형 불일치" 버그 교훈). 변이형은 종과 독립이며 변이 카드로 후천 부여(종에 못박지 않음).
- [ ] 새 종 목록 확정: 이름/속성/타입/콘셉트 — `SPECIES_GRID`에 `[key,이름,타입,속성]` 한 줄로 추가하면 스탯·외형·적·탐사·상성 자동 연결
- [ ] 종별 스킬이 속성 스킬 풀(`ELEMENT_SKILLS`/`ELEMENT_GROWTH_SKILLS`)과 어긋나지 않는지 검토
- [ ] 도트화(#3) 시 종별 PNG는 `SPRITE_OVERRIDES`로 교체
- **열린 질문:** 속성당 목표 종 수? 종 고유 패시브(잠재특성 연결) 줄지?

### 2. 식물 양육 / 열매 시스템 ⭐ 핵심
**비전:** 전투와 분리된 **양육 루프**. 식물을 키워 **열매**를 맺고 보상(소모품·스킬·변이 카드)을 얻는 방치형 감성의 축.
> 📄 **설계 박제: [superpowers/specs/2026-06-24-nurture-fruit-system-design.md](superpowers/specs/2026-06-24-nurture-fruit-system-design.md)** — 브레인스토밍 진행 중. **재개 시 이 문서부터.**

**확정 골격(2026-06-24 브레인스토밍):**
- **생장과 열매는 분리된 2축.** 생장(진화)=경험치/레벨업, **열매=시간 경과+환경(물·비료·화분)**. 경험치는 열매와 무관.
- **열매는 성장체부터.** 그 이전(씨앗·새싹·유체)은 **낙엽=하위 소모품**만.
- **환경 레버:** 물/비료(양)→열매 **질 확률↑(상한·보수적, 다 줘도 전부 S 아님)**, 화분(품질)→**주기 단축**. 즉시수확=**미네랄**. 비료종류·환경=보류.
- **수확 보상 희소도:** 흔함=**소모품**, 희귀=**변이 카드(본인 변이형, 타 식물에도 장착 가능=전파)** / **본인 스킬(자기 전용 풀 확장, 전파 X)**.
- **화분 = 양육 전용**(전투 스탯 무영향). 페이지: 양육=4번째, 탐사선=5번째.

**열린 질문(스펙 §3):** 소모품 종류 + **물/비료 자급 순환 루프** 살릴지 / 단계 점증 영향 / 수확 단위 / 수치 / 본인 스킬 상한.
**구현 메모:** 식물에 `fruit` 상태 필드 신설 + `normalizeState` 마이그레이션(무회귀). 수확 연출 `#evolveModal` 재활용. 식물/화분 2레이어 분리(#12·#3 전제).

### 3. 도트(픽셀아트) UI 적용
**상태/규격:** [pixel-art-ui-roadmap.md](pixel-art-ui-roadmap.md) — **작업 전 필독**. 방식은 캔버스 재작성이 아니라 **PNG를 DOM에 교체**(`spriteFor`의 `SPRITE_OVERRIDES`).
- [ ] **식물·화분 분리 이미지** 여부 결정 — 권장: 분리(식물 PNG + 화분 PNG 레이어, 화분 입구 앵커, idle sway는 식물 레이어만). 겹쳤을 때 자연스러운지 시범 제작으로 검증(#2 화분과 직결)
- [ ] 도트 생성 AI 선정·시범(PixelLab/Retro Diffusion 후보)
- [ ] 적용 순서: 식물 → 아이콘 → 모달 창틀(9-slice) → 애니메이션
- [ ] 미확정: 식물 격자 해상도 / 공통 캔버스 크기 (사용자 결정 대기)
- 📌 **UI 미세수정을 사용자가 전달하는 법**(번호라벨·스크린샷 마킹·게임 내 디자인 모드·DevTools·목업 툴): [pixel-art-ui-roadmap.md §8~10](pixel-art-ui-roadmap.md)

### 4. 함선 / 길드 / 방꾸 시스템
**상태:** 함선 타일 워킹 기초 구현됨(`#shipScreen`/`SHIP_MAP`/`SHIP_FEATURES`).
- [ ] 방 내부 고도화(여러 방·워프 콘솔)
- [ ] **꾸미기 → 기능 연결**(가구가 장식이 아니라 양육 속도↑ 등 기능). `SHIP_FEATURES` → `state.ship.furniture` 데이터화
- [ ] 캐릭터 꾸미기(탐사복 색·파츠), 이동/연출 속도 조절
- [ ] 길드(현재 🔒): 친구 초대/동행, 길드 정거장, 공동 목표 — #8과 연동
- [ ] **오픈월드화** — 단일 함선방 → 연결된 여러 구역/행성 표면을 자유 이동(타일 워킹 확장). 범위·전환 방식 설계 필요

### 5. 애니메이션 추가
**상태:** VS 인트로·진화 연출·전투 판정 연출 일부 구현.
- [ ] 도입부/전주(타이틀→게임) 전환 연출
- [ ] 도트(#3)와 연동된 식물 idle/공격/피격 모션(스프라이트시트 `steps()`)
- [ ] 열매 수확·탐사 결과 보상 연출
- [ ] `prefers-reduced-motion` 유지

### 6. 음악 / 효과음
- [ ] 라이선스(CC0/구매) 조사 + 출처 기록(#9 출시 대비)
- [ ] 재생 방식(Web Audio/`<audio>`), 모바일 자동재생·무음 스위치 대응
- [ ] 설정에 on/off·볼륨 UI, 오디오는 `assets/` 외부 파일

### 7. 탐사 시스템 재설계
**상태:** 🟢 **구현 완료** (아틀라스 세계관 + 종 분포 + 폴드 모션 + 행성 11개). → 📄 [`specs/2026-06-24-exploration-atlas-upgrade-design.md`](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md)
- [x] **행성마다 모든 종이 나오지 않게** — **행성 서식 풀(`species`) + 지역 시그니처(`signature`)** 모델(옵션 C). 지역은 기존 `el`/`types`로 풀을 좁힘. `rollSpeciesFromView(region, planet)` + `SIGNATURE_CHANCE`(0.10) + 폴백 사다리
- [x] **아틀라스 세계관 리스킨** — 행성=다른 은하의 공유 좌표, **연료=폴드 에너지**, 궤도=폴드 심도(구조 무변경, 명칭/문구만). 은하 성운 앰비언스
- [x] **탐사 모션 = 차원 이동(폴드) 연출** (격자 왜곡→rift→흡입→섬광, `prefers-reduced-motion` 축약)
- [x] **풀로세움 참가 비용 = 없음(무료 입장)으로 확정** — "항상 열린 게이트" 로어로 비대칭 해소. 연료/참가권 안 둠
- [x] **행성 종류 확장** — 8→11(세라핀 궤도1·볼카르 궤도2·티아멘 궤도3). UI 종 미리보기(`exPlanetSpeciesPreview`/`exRegionSpecies`)
- [ ] (후속) **새 개체를 행성 `species`/지역 `signature`에 배치** + 분포 밸런스 튜닝
- [x] **분포 버그/얇은 지역 수정 완료(2026-06-25)** — 심해 균열·전자기 늪 0종 버그 해결 + 얇은 지역 6→1(심해 균열만 S랭크 의도적 희박). 상세 = [exploration spec §10](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md)

### 8. PvP / 서버 운용
- [ ] **비동기(고스트) PvP** vs 실시간 — 비동기(상대 로드아웃 스냅샷 재생)가 현실적, 1순위 권장
- [ ] 백엔드(Firebase/Supabase/자체) — 클라우드 세이브 동기화도 함께 해결
- [ ] 랭킹/매칭, 치트 방지. 길드(#4)·클라우드 세이브와 묶어 한 번에 검토

### 9. 구글 플레이 출시
**상태:** Capacitor 래퍼 + 디버그 APK 빌드 성공. 절차 [android-capacitor-wrapper.md](android-capacitor-wrapper.md).
- [ ] **로컬 번들 vs 원격(GitHub Pages) 로드** 결정 — 네이티브 세이브 브리지 안정성 이슈로 **로컬 번들** 검토
- [ ] 릴리스 키스토어 서명, `assembleRelease`
- [ ] 스토어 등록(아이콘/스크린샷/설명/개인정보 처리방침/콘텐츠 등급)
- [ ] 에셋 라이선스 정리(#6 연동), 버전 정책

### 10. 전투 화면 UI 수정
**상태:** 카드 선택 페이즈 + 판정창 연출 구현됨(기능은 동작). UI 룩 개편 대상.
- [ ] 카드 로드아웃(6칸)·HP/상태 표시·판정 연출 레이아웃 재설계(부유 픽셀칩 룩 #11과 통일)
- [ ] 도트(#3)·애니메이션(#5)과 연동된 식물 idle/공격/피격 모션 자리 확보

### 11. 시작화면 수정
**상태:** 미착수.
- [ ] 타이틀 화면 디자인(로고·메뉴·세이브 진입) + 게임 전환 연출(#5와 연동)

### 12. 종자 가방 창 + 식물/화분 분리
**상태:** 미착수. 사용자 1순위 인터페이스 항목.
- [ ] **종자 가방 창 재설계** — 종자 목록·정렬·필터·상세, 보관 한도 표시
- [ ] **식물/화분 이미지 분리** — 식물 PNG + 화분 PNG 레이어(화분 입구 앵커, idle sway는 식물만). #2 양육·#3 도트의 전제 ([pixel-art §- 식물/화분 분리](pixel-art-ui-roadmap.md))

---

## 5. 결정 로그

> 확정된 결정만 날짜와 함께 한 줄로. 번복되면 줄을 갱신한다.

- **2026-06-20** — 생장은 **경험치로만**(물/비료 폐지). 생장 정지 아이템 추가. (#2)
- **2026-06-20** — 화분은 **양육 전용**(전투 스탯 무영향). (#2)
- **2026-06-20** — 페이지 순서: 양육=4번째, **탐사선=5번째**. (#2)
- **2026-06-20** — 행성마다 모든 종이 나오지 않게 **종 분포 제한**. (#7)
- **2026-06-20** — 종은 **고정 속성**, 변이형은 카드로 후천 부여(종에 못박지 않음). (#1)
- **2026-06-21** — 문서 체계 정리: `master-roadmap.md`를 **유일 허브(SSOT)**로, 밸런스는 `balance-sheet.md`로 단일화(`battle-growth-guide.md` 폐기).
- **2026-06-23** — 양육/변이/스킬 UI 개편 적용(양육 3×4·식물 누끼+흔들림·변이4열/스킬3열). 향후 8대 기능 기획 완료(`benchmark-proposals.md`/`feature-designs.md`) → **사용자 선택 대기**. 재개 진입점 = `handoff-next.md`.
- **2026-06-23** — **UI 룩 = 흰 우주선 선체 타일 + 청록 네온**으로 전체 통일, 하단 탭마다 "다른 방" 분위기. 도트 PNG 교체와 호환되게 플랫·각진 프레임. (#11) **1단계 공통 크롬(상단바·하단탭·버튼) 완료.** 세부 = `pixel-art-ui-roadmap.md`.
- **2026-06-23** — **(룩 보강 #11) 흰색은 "선체 구조(프레임·바·타일 테두리·시스템창 헤더)"에만, 방 내부 배경은 어둡고 무게감 있게.** 방은 밝기가 아니라 **어두운 색조(틴트)+포인트 색**으로 구분. 양육도 "밝은 온실"❌ → **밤의 식물원**(어두운 배경+초록 재배등 글로우). 패널 fill은 어둡게 유지(밝은 글자 가독성·안전). 화면 전체를 흰색으로 칠하지 말 것.
- **2026-06-23** — **(#11 재정의 — 최종) UI = "함선 내부 한 장면 + 떠있는 도트 UI".** 헤더↔배경 경계 제거(흰 슬랩 헤더 폐기), 배경은 **밝은 미래 타일 함선 내부 + 완만한 깊이(넓고 열린 방) + 가장자리 음영**, UI는 장면 위 **부유 픽셀칩**(하드 도트 그림자), 중앙 식물은 **보관 포드**. 미니멀+인디 도트 톡 튀게. 1·2단계의 흰 슬랩 헤더는 부유 칩으로 전환. **한 방씩 수직 완성(메인→탐사→양육→상점→함선→전투→모달).** 설계서 = [`superpowers/specs/2026-06-23-ui-floating-interior-design.md`](superpowers/specs/2026-06-23-ui-floating-interior-design.md).
- **2026-06-23** — **다운로드본 UI 오버레이 반영:** 전체 버튼·패널·모달을 픽셀/홀로그램 시스템창 톤으로 덮는 CSS 레이어를 적용하고, 상점/탐사/양육/함선 방별 틴트, 팝업 중앙 정렬, 메인방 우주선 내부 SVG 디테일을 보강. 저장소에 없는 `assets/fonts/*.woff2` 참조는 제거하고 기존 폰트 fallback으로 유지.
- **2026-06-24** — **종 시스템 = 수작업 개체 카탈로그(A+C)로 전환.** `SPECIES_CATALOG`(개체별 rarity·변이슬롯·baseVariants·stageSkills·signatures) + `SKILL_LIB`(스킬 정의 분리). 기존 `SPECIES_GRID`는 레거시 자동생성으로 머지 기반 유지. 설계서 = [`superpowers/specs/2026-06-24-plant-individual-catalog-design.md`](superpowers/specs/2026-06-24-plant-individual-catalog-design.md). (#1)
- **2026-06-24** — **타입 개편: 초본형(grass) 제거 → 버섯형(mushroom) 추가.** 버섯=저스탯+포자 기본(`baseVariants:['spore']`)+희귀. 포자는 하드코딩 아닌 `baseVariants` 데이터로만 결정(확장 여지). 초본형은 신규 획득 제외하되 보유분·외형 보존(레거시). (#1)
- **2026-06-24** — **초본형 완전 폐지 → 화초형 흡수(타입 5종 확정).** "풀은 결국 꽃을 피운다"는 사용자 결정. 구 초본 7종 타입 `grass`→`flower` 전환(스탯·외형·스킬 화초형, legacy), 세이브 마이그레이션. `grass`는 풀 **속성**으로만 존속. (#1)
- **2026-06-24** — **(#2 양육/열매) 생장과 열매를 분리된 2축으로 확정.** 생장(진화)=경험치, 열매=시간+환경(물·비료·화분). **기존 "생장은 경험치로만, 물/비료 폐지" 결정을 일부 수정** — 물/비료는 폐지가 아니라 **열매 쪽으로 부활**(생장엔 여전히 무영향). 열매=성장체부터, 그 전엔 낙엽=하위소모품. 물/비료(양)→질확률↑(상한·보수적), 화분→주기단축, 즉시수확=미네랄. 보상 희소도: 흔함=소모품 / 희귀=변이카드(전파O)·본인스킬(전파X). 설계 박제 = [`specs/2026-06-24-nurture-fruit-system-design.md`](superpowers/specs/2026-06-24-nurture-fruit-system-design.md). 브레인스토밍 진행 중(열린 질문 5개). (#2)
- **2026-06-24** — **(#2 양육/열매) 설계 확정 — 열린 질문 5개 전부 결정, 구현 착수.** ① 물/비료 출처 = **탐사·전투 보상 + 랜덤 소모품 상자**(상점 직구매 아님, 교차 루프). ② 게이지 모델: 식물별 `maxFruits` 고정, 게이지 차면 열매 1개 맺힘(맺힐 때 희귀도 색 롤·식물에 표시) → 리셋 후 다음, 꽉 차면 정지+게이지 붉음. 수확=맺힌 것 전부, **게이지 진행도 보존(수확 후 이어서)**. ③ 단계 점증 = 등급·개수·주기 전부. ④ 물/비료 = **감쇠형 활성 버프**(속도↑·등급확률↑, 시간 지나면 줄며 게이지 색 그라데이션), 화분 = 패시브 베이스(기본속도+maxFruits). ⑤ 열매 = **5색 희귀도**(흰<초록<파랑<보라<주황, 색=테두리+글로우), **이미지 통일·색만 차이**. 색=등급(흰/초록=소모품, 파랑/보라=변이카드, 주황=본인스킬·고등급). 열매 1개=보상 1종(소모품은 묶음 가능, 카드·스킬은 1개). ⑥ 본인스킬 풀 무제한 수집·**중복=크레딧 전환**, 장착 6칸 고정. ⑦ **신규 공통 RewardReveal 연출** — 상점 보급박스·탐사 상자·열매를 "배경 위 컨테이너 터치→개봉" 패턴으로 통일(순차 개봉). 설계서 갱신 = [`specs/2026-06-24-nurture-fruit-system-design.md`](superpowers/specs/2026-06-24-nurture-fruit-system-design.md). (#2)
- **2026-06-24** — **OneDrive 동기화 사고:** 저장소가 OneDrive 폴더 안이라, 작업 중 OneDrive가 다른 기기 사본을 작업 트리에 덮어써 미커밋 편집(양육 스펙·로드맵 갱신)이 유실·혼합됨. 복구 후 재커밋. **재발 방지: 작업 중 OneDrive 일시정지, 근본은 저장소를 OneDrive 바깥으로 이전.** CLAUDE.md에 주의 추가.
- **2026-06-24** — **(#1 복구) OneDrive 사고로 유실됐던 개체 카탈로그 코어 복원.** 커밋 `ee6be39`(도감 라이브+PWA)에 OneDrive가 index.html을 옛 상태로 되돌린 게 섞여, **카탈로그 데이터/셀프테스트는 신버전인데 핵심 함수·필드가 구버전**인 혼합 상태로 박혀 셀프테스트 8개가 실패하고 있었다(버섯형 TYPE_STATS·종 rarity·`RARITY_WEIGHT`·`pickAcquirableSpecies`·`applyCatalogVariantFields`·`SPECIES` 카탈로그 머지/리치필드 backfill·`rollSpeciesFromView` 희귀도가중·버섯 스프라이트·`SEED_ROOT` 균사 유실). `ee6be39^`(`ffb44da`)의 카탈로그 블록만 골라 현재 HEAD에 재이식(dex/PWA·renderCenter UI 변경 등 정당한 작업은 보존). **`window.__catalogSelfTest()` 전부 통과(0 fail)로 검증.** (#1)
- **2026-06-24** — **(#2 ✅ 구현 완료) Task 7까지 — 보급박스·탐사결과·열매 수확을 모두 공통 RewardReveal(배경 위 컨테이너 터치→순차 개봉)로 통일.** 보급박스(`buyShopBox`)=보급박스 모양, 탐사 성공(`exResultHtml` 인라인 카드 폐기→reveal)=탐사상자 모양, 열매=희귀도색 모양. 보상은 개봉 전 지급, 연출은 표시. preview로 3종 개봉 검증·self-test 0. (#2)
- **2026-06-24** — **(#2 코어 구현 완료) 양육/열매 루프 작동.** 데이터모델 v2(`p.nursery.{gauge,maxFruits,ripe,lastTick,waterBuff,fertBuff,potQuality}`+`state.care`)·`nurseryTick`(게이지/감쇠/상한·보존)·`rollFruitRarity`(5색)·`rollFruitReward`(색=등급)·`harvestPot`·`applyCare`·양육 UI(게이지/색별 열매/인벤토리 버튼/💎즉시가속)·**공통 `openRewardReveal`**(열매 수확에 적용)·**탐사 성공 물/비료 드롭**(공급원). 셀프테스트 전부 통과+preview 구동 검증. 코드리뷰 반영(꽉참 수확 게이지 0·`createItemInventoryEntry` null방어). **잔여(Task 7): 보급박스·탐사결과 창을 공통 RewardReveal 시각으로 통일**(보급박스는 이미 자체 터치개봉 보유 → 시각 통일만). 전투 승리/랜덤상자 물·비료 드롭은 추가 공급원으로 후속. (#2)
- **2026-06-24** — **9대 항목 재확인 + 신규 방향 추가:** 사용자 기준 작업 목록 반영 → #10 전투 화면 UI 수정, #11 시작화면 수정, #12 종자 가방 창 + 식물/화분 분리 신설. #4 함선은 **오픈월드화** 방향 추가. **식물 스킬/변이/스탯/디자인 콘텐츠는 사용자가 별도 구상 후 진행**(브레인스토밍/구현은 시스템·UI 구조부터). (#1·#4·#10·#11·#12)
- **2026-06-24** — **새싹·유체 스킬을 타입 축/속성 축 공유 체계로 재설계(`STAGE_SKILLS`).** 개체 고유 없이 타입(기본공격·기본방어·타입특기)+속성(속성발현) 공유, 유체 속성심화는 기존 속성기 재사용. 성장체 이상은 후속 재설계 보류. 설계서 = [`superpowers/specs/2026-06-24-sprout-juvenile-skills-design.md`](superpowers/specs/2026-06-24-sprout-juvenile-skills-design.md). (#1)
- **2026-06-24** — **(#7 탐사 재설계) 설계 확정 — 아틀라스 세계관 + 종 분포.** ① 종 분포 = **행성 서식 풀 + 지역 시그니처(옵션 C)**: 행성에 `species` 풀, 지역은 기존 `el`/`types`로 좁힘 + `signature`(지역 전용 희귀종, `SIGNATURE_CHANCE` 0.10). ② 세계관 = **아틀라스**: 행성 = 여러 외계 문명이 다른 은하에서 탐사해 공유한 좌표, **시공간 폴드 점프**로 이동 → "왜 다 생명?" 자연 해소. ③ 지도 = **로어 재해석(구조 무변경)** + 은하 앰비언스 + **차원이동(폴드) 모션**. ④ **연료 = 폴드 에너지**(궤도 해금 = 폴드 심도 해금, 명칭만 리스킨). ⑤ **경기장 = 항상 열린 게이트 → 무료 입장**(연료/참가권 없음, 로어로 비대칭 해소). **속성 상성표·타입 5종 무변경.** UI는 "행성 누를 때 복잡X"(주요 서식종 3~4 아이콘 미리보기, 지역 선택 시에만 종 아이콘 줄). 행성 종류 확장은 후속. 설계서 = [`specs/2026-06-24-exploration-atlas-upgrade-design.md`](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md). (#7)
- **2026-06-24** — **(#7 탐사 재설계) 구현 완료.** `rollSpeciesFromView(region, planet)` = 행성 `species` 풀 ∩ 지역 `el`/`types` + `region.signature` 별도 저확률(`SIGNATURE_CHANCE=0.10`) + 폴백 사다리(무회귀). `EXPLORE_VIEW` **8→11행성**(세라핀 궤도1·볼카르 궤도2·티아멘 궤도3)에 종 풀+지역 시그니처+아틀라스 `intro`. UI: 행성 팝업 `exPlanetSpeciesPreview`(주요 서식종 4칩)·지역 상세 `exRegionSpecies`(서식 종+✦희귀). 모션: `exTravelOverlay`를 시공간 폴드 연출(격자 왜곡→rift→흡입→섬광·reduced-motion 축약)로 교체. 로어: 연료=폴드 에너지, 우주맵=아틀라스, 풀로세움=상시 개방 게이트(무료입장), 은하 성운 앰비언스. 셀프테스트 7종 추가·전부 통과(0 fail)+preview 검증. **속성표·타입 무변경. 새 개체 배치는 후속.** (#7)
- **2026-06-25** — **(#7 탐사) 분포 점검 후속 수정.** 점검에서 나온 0-종 버그 2건 해결: 심해 균열(types에 화초형 추가→aqua 등장, vine_water는 희귀 시그니처 유지), 전자기 늪(행성 풀에 spark·aqua 추가; 충돌하던 방사 폐허 signature는 spark→tree_bolt 교체). 얇은 지역 6곳은 지역 `types`에 어울리는 2번째 타입 추가로 2~3종 보강(심해 균열만 S랭크 의도적 1+시그니처). 검증 = Node로 `EXPLORE_VIEW` 추출·eval해 분포 재계산(preview HttpListener 환경 이슈로 정적 검증). 상세 = [exploration spec §10](superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md). (#7)
- **2026-06-24** — **도감 스킬 공유/고유 표시 + 보유 식물 모달.** `__DEX_API`에 `dexSkillScope` 노출(version `2026-06-24d`) → 도감이 각 스킬에 타입/속성/전체 공유·개체 고유 칩을 달고, 클릭 시 그 스킬을 얻을 수 있는 식물·생장단계를 모달로 보여줌. HANDOFF ① 재적용. (시그니처 풀 예약 상태라 현재 "개체 고유" 실표시 종은 없음.)
- **2026-06-24** — **도감 카드에 실제 식물 외형 표시.** `__DEX_API`에 `composePlantSvg` 노출(version `2026-06-24c`) → 도감이 글리프 플레이스홀더 대신 게임의 절차적 SVG(타입×속성×생장단계, 화분 포함)를 렌더. 단계 리본 클릭 시 외형도 같이 자람(`paintSprite`). 게임 외형을 고치면 도감 자동 반영.
- **2026-06-24** — **도감 라이브 연동 + PWA.** `docs/dex/plant-codex.html`이 게임을 숨은 iframe(`index.html?dex=1`)으로 불러와 `window.__DEX_API`에서 실제 데이터·함수를 읽어 렌더 → 게임 업데이트 자동 반영(수동 갱신 폐기). `?dex=1` 데이터 전용 모드(부팅·세이브 생략)로 세이브 무손상. `sw.js`(PWA) 추가. 호스팅(GitHub Pages)은 사용자가 Settings→Pages 1회 토글. 설계서 = [`superpowers/specs/2026-06-24-live-codex-hosting-pwa-design.md`](superpowers/specs/2026-06-24-live-codex-hosting-pwa-design.md).
- **2026-06-24** — **(#1 변이형·변이 카드 재설계 — 브레인스토밍 진행 중)** 변이형 = **패시브 없는 카드 슬롯 게이트**(식물당 1변이, 다중 슬롯 폐기, 포식 무료 기본기 제거). **무등급(`fixed`) 카드 클래스 신설**, 같은 `card_id` **자동 교체**, **스킬 `cats` 복수 태그 라벨**(공격/방어/버프/디버프/체력회복/에너지회복 → 향후 특성 시너지 키), **독 스택 상한제**(상태이상 = DoT 확정·강제어만 확률), **발광형 폐지**(6변이형). 공통/포식/무기/독성/포자(버섯 전용·디버프 전용)/**용족(방어 비늘 + 속성 브레스 투트랙)** 6변이형 카드 로스터 **설계 완료**. 수치 placeholder(밸런스 패스 대기) → 다음 writing-plans. 설계 박제 = [`superpowers/specs/2026-06-24-mutation-forms-cards-redesign-design.md`](superpowers/specs/2026-06-24-mutation-forms-cards-redesign-design.md). (#1)
- **2026-06-24** — **(#1 변이 재설계 — 플랜1 시스템 토대 ✅ 구현)** 코드 반영(브랜치 `feat/mushroom-type-completion`): `skillCats`+`CAT_META`(스킬 cats 복수태그 도출) · `cardsAfterEquip`(같은 card_id 등급무관 자동교체) · `DOT_STACK_CAP(4)`+`addDot`(독/출혈/화상 스택 상한, DoT 적용 4곳 교체) · `rollForm` 발광 제거(기존분 legacy 보존). 셀프테스트 `__catalogSelfTest()` 0 fail. 콘텐츠(플랜2: `TRAIT_CARDS` 재작성·`fixed` 카드)·전투/UI(플랜3: 하단 변이 스킬 바·브레스·비늘/독 스택·cats 칩)는 후속. 계획 = [`superpowers/plans/2026-06-24-mutation-redesign-phase1-foundation.md`](superpowers/plans/2026-06-24-mutation-redesign-phase1-foundation.md). (#1)
- **2026-06-24** — **(#1 변이 재설계 — 플랜2 카드 콘텐츠 슬라이스 2-A ✅)** `cardInstanceEffects`에 무등급(`fixed`) 처리(등급 무시 계수1·서브0) + 스탯 코어 base(atkPct/hpPct/spdPct/critBonus) 스케일 추가. 공통 스탯 코어 카드 4종(💪근섬유·🫀거대액포·🌀향성운동·🎯표적분비물) 추가 → 공통 스탯 6축 완성. 셀프테스트 0 fail. 공통 버프/디버프·무등급·변이형별(포식/무기/독성/용족) 카드는 전투엔진·하단 변이 스킬 바 필요 → 플랜3 연동(후속). 계획 = [`superpowers/plans/2026-06-24-mutation-redesign-phase2-cards.md`](superpowers/plans/2026-06-24-mutation-redesign-phase2-cards.md). (#1)
- **2026-06-24** — **(#1 변이 재설계 — 플랜3 첫 슬라이스: cats 칩 UI ✅)** 플랜1의 `skillCats`/`CAT_META`를 화면에 노출 — 스킬 서랍 카드에 공격/방어/버프/디버프/체력·에너지회복 색칩(`skillCatChipsHtml` + `.cat-chip` CSS). 셀프테스트 0 fail. (#1)
- **2026-06-25** — **(문서 정합성) "수집 화분 5종"은 미구현 — CLAUDE.md 정정.** `potVisual`·`composePlantSvg({noPot:true})`·`POT_SPRITE_OVERRIDES`·`state.pot_inventory`·`pot_terra~pot_gold` 전부 코드에 없음(grep 0건). 실제는 화분이 `composePlantSvg`에 하드코딩(한 SVG)되고 양육 속도용 숫자 `potQuality`만 존재. **로드맵 #12(식물/화분 분리) "미착수"가 정확** — CLAUDE.md "수집 화분" 단락을 실상(미구현)으로 교체. (#12)
- **2026-06-25** — **(시작종자 UX) 무지개 종자 = 심기 전 정보 전면 비공개.** `renderSeedBagCard`/`renderSeedDetail`에서 `rainbow`일 때 등급 배지·잠재력·변이 가능 여부·희귀도·기본 능력치 예상값·변이율 예상치를 전부 `???`로 가림(실제 grade/species 누출 없음, preview 검증). 의도: "심으면 정체가 드러나는" 미지의 종자 컨셉과 일치. 0 fail.
- **2026-06-25** — **(#1 변이 재설계 — 플랜3 슬라이스 3-7+3-8 ✅ → 플랜3 전체 완료)** 3-7: 포식 기본기 위력 150→90·cost 3→2·무속성. 3-8a(battle-start 훅): `cardInstanceEffects`/`cardEffects`에 `allStatPct`·`startEnemyDebuff`·`startSelfRandom`·`surviveOnce`, `applyCardStartHooks`(전투 개시 적 디버프+자기 랜덤 버프) + survive once 소진 → 카드 5종(위조페로몬·약화효소·항상성·마지막잎새·불안정변이). 3-8b(턴 훅): `rampStat`·`thresholdBuff`·`bloom` + `applyCardTurnHooks`(tickStatuses 매턴 재계산) → 카드 3종(굴광성장·아드레날린·만개). `cardEffectLabels` 라벨 추가. 0 fail. **이로써 변이 플랜3(3-1~3-8) 전부 완료 — 6변이형 하단 변이 스킬 바 + 공통 카드 8종 전 구현.** 후속=밸런스 튜닝·적 봇 공통카드 분배 검토. (#1)
- **2026-06-25** — **(#1 변이 재설계 — 플랜3 슬라이스 3-6 용족형 + 3-3~3-5 회귀 수정 ✅)** 용족: `skill_card_scale`(비늘 강화 · guard+`scaleStack` 영구 방어 누적 cap5) + `skill_card_breath`(원소 브레스 · `elem:true` 자기 속성 발현), `variantSkillsOf`/`makeCombatant`/`applySkill` scaleStack 엔진. **검토 회귀 수정:** 3-4 도입 버그(전투 유닛에 `cards` 미저장 → 무기형이 전투에서 무기 스킬 소실) → `unit.cards` 저장 + `uses` 초기화 `variantSkillsOf` 포함 확장. `aiPickSkill`에 variant 후보 추가(적 봇 변이 스킬 사용). `buildEnemy` 폐지 lumen 제거+dragon 추가. 0 fail. (#1)
- **2026-06-25** — **(#1 변이 재설계 — 플랜3 슬라이스 3-5 ✅)** `skill_card_infuse`(독 묻히기 · `infuse` 버프 → 공격 적중 시 `addDot`) + `skill_card_spray`(독 뿌리기 · `dotTimes:2` 즉발). `variantSkillsOf` toxic 케이스 추가, `makeCombatant` toxic loadout 자동 포함, `applySkill` infuse/dotTimes 엔진. 0 fail. (#1)
- **2026-06-25** — **(#1 변이 재설계 — 플랜3 슬라이스 3-2~3-4 ✅)** 3-2: 관리창 스킬 탭에 `variantSkillBarHtml` 하단 읽기 전용 변이 스킬 바 표시. 3-3: 전투 `showCardPhase`의 하드코딩 pred 분기 → `variantSkillsOf(B.p)` 일반화·`.cp-pred` auto-fit 그리드(1~2칸). 3-4: `variantSkillsOf`에 `p.cards` 폴백(전투 유닛 지원), `makeCombatant`에서 weapon grantSkill → loadout 제외(variant bar 전용), `detailEquip`에 무기 카드 최대 2장 초과 시 토스트 차단. 셀프테스트 0 fail. (#1)
- **2026-06-24** — **(#1 변이 재설계 — 플랜3 키스톤 `variantSkillsOf` ✅)** 하단 변이 스킬 바의 단일 진실 함수(포식=기본 포식기·무기=장착 무기 종류 카드 스킬 최대2·독성/용족 후속). 하단바 UI·전투가 이걸 소비 예정. 셀프테스트 0 fail. 플랜3 계획서 박제 = [`superpowers/plans/2026-06-24-mutation-redesign-phase3-variant-skill-bar.md`](superpowers/plans/2026-06-24-mutation-redesign-phase3-variant-skill-bar.md). **남은 슬라이스(미착수):** 하단 바 UI(관리/전투)·무기 로드아웃→하단바 이동+2장룰·독성 묻히기/뿌리기(인퓨전 엔진)·용족 비늘/브레스·포식 위력 조정·공통 버프/디버프 battle-start 훅. ⚠️ **개발 gotcha:** preview 정적 서버가 옛 index.html 캐시 → 반영 안 되면 `preview_stop`+`preview_start` 재시작(SW클리어로 안 풀림). (#1)

---

## 6. 이 문서 다루는 법 (AI·사람 공통) — 실시간 갱신 규약

> **핵심 원칙: 모든 개발·기획 변경은 그 즉시 이 허브(또는 해당 하위 문서)에 반영되고 함께 푸시된다. 놓치는 것 없이.**

0. **작업 시작 시 `git pull`** 로 최신본부터 받는다(다른 기기/대화창의 변경이 먼저 반영됐을 수 있음). 끝나면 `git push`.
1. **작업 시작 전** 이 문서를 읽는다. CLAUDE.md/AGENTS.md/copilot-instructions가 여기로 안내한다.
2. **코드·데이터를 바꿨으면** 같은 작업 안에서:
   - 해당 방향의 **상태/체크박스**(§1 표, §4)를 갱신하고,
   - 수치·메커니즘이 바뀌었으면 **해당 하위 문서**(밸런스→`balance-sheet.md` 등)도 함께 고치고,
   - **결정이 생겼으면** §5 결정 로그에 한 줄 남긴다.
3. **새 방향/아이디어**는 §4에 추가, 사라진 계획은 삭제하거나 ❄️ 보류 표시.
4. **큰 항목을 완료**하면 CLAUDE.md/AGENTS.md "변경 이력"에 상세 로그를 남기고, 여기선 ✅ + 하위 문서 링크.
5. **새 하위 문서**를 만들면 §2 문서 지도에 한 줄 등록(미등록 문서 금지 — 떠도는 문서를 만들지 않는다).
6. **상대 날짜 금지** — "오늘/이번 주" 대신 절대 날짜.
7. **커밋 시** 코드 변경과 문서 변경을 **같이** 올린다(문서만 뒤처지지 않게).
8. **강제 장치(pre-push 훅):** `.githooks/pre-push`가 "index.html은 바뀌었는데 문서가 안 바뀐" 푸시를 막는다. 새 기기에서 클론하면 **한 번** `git config core.hooksPath .githooks` 실행(설정은 기기별 로컬이라 자동 전파 안 됨). 의도적으로 건너뛸 땐 `git push --no-verify`.

> **여러 AI 호환:** Claude Code=`CLAUDE.md`, Codex·Cursor 등=`AGENTS.md`, GitHub Copilot=`.github/copilot-instructions.md` — 셋 다 이 문서를 첫 줄에서 가리키므로, 어떤 기기/AI로 열어도 별도 지시 없이 이 허브로 수렴한다.
