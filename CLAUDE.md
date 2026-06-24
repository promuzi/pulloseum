# 풀로세움 (Pulloseum) — 프로젝트 안내

> 다른 PC에서 이 폴더를 Claude Code로 열면 이 파일을 먼저 읽고 맥락을 파악하세요.

## ★ 개발 방향은 여기부터 (Claude에게: 작업 시작 전 반드시 먼저 읽을 것)
- **마스터 개발 로드맵 → [docs/master-roadmap.md](docs/master-roadmap.md)** — 현재 구현 현황·앞으로의 방향·확정 결정·**모든 하위 문서로 가는 지도**가 한곳에 모인 **유일 허브(SSOT)**. 어떤 기기/AI로 작업하든 이 파일을 먼저 읽고 현황을 파악한다. 세부 수치/설계는 그 안의 "문서 지도"를 타고 하위 문서로 들어간다.
- ⚠️ **실시간 갱신 의무:** 코드·데이터·기획을 바꾸면 **같은 작업 안에서** 로드맵(또는 해당 하위 문서)의 상태/체크박스/수치를 갱신하고, 결정이 생기면 "결정 로그"에 남기고, **코드와 문서를 함께 커밋·푸시**한다. 놓치는 것 없이 항상 실시간으로. (상세 규약: 로드맵 §6)
- **별칭:** 사용자가 "마스터 로드맵 / 로드맵 / 마스터 문서" 무엇으로 부르든 전부 `docs/master-roadmap.md`를 뜻한다.
- **작업 시작 시 `git pull`**(다른 기기/대화창 변경 선반영), 끝나면 `git push`. 새 기기에서 클론했으면 한 번 `git config core.hooksPath .githooks` 실행(코드만 바뀌고 문서 안 바뀐 푸시를 막는 pre-push 훅 활성화).
- 🧩 **사용자가 "수정한 index.html"을 주면 통째로 덮어쓰지 말 것.** 먼저 ① 어느 커밋 기반인지(`git log -S '<특징문자열>' -- index.html` 또는 최근 커밋들과 diff) ② 그 변경이 이미 main에 반영됐는지 확인. 구버전 기반이면 덮어쓰기=최근 비-UI 작업(종 시스템 등) 리버트. UI만 합치려면 진짜 공통조상을 base로 `git merge`(3-way)로 처리. (2026-06-24: 받은 파일 UI가 이미 main에 적용돼 있어 적용할 게 없던 사례)
- ⚠️ **OneDrive 주의(해결됨, 2026-06-24 — 저장소 OneDrive 밖으로 이전):** 과거 OneDrive가 `.git`까지 동기화해 작업 트리 파일·HEAD가 세션 중 흔들리고 미커밋 편집이 유실되는 사고가 있었다. 다시 OneDrive 안에서 작업하게 되면, 커밋·푸시·머지 직전 `git rev-parse HEAD`·`git fetch`로 현재 상태를 재확인하고 시작 시점 스냅샷을 신뢰하지 말 것.
- ⚠️ **여러 대화창(세션) 동시 작업 주의(2026-06-24):** 다른 Claude 세션이 같은 저장소에서 동시에 `index.html`·공용 문서(로드맵·CHANGELOG)를 편집·커밋하며 **브랜치가 세션 중 바뀔 수 있다**(예: main→feat/*). 커밋·푸시 전 `git status`·`git rev-parse --abbrev-ref HEAD`로 재확인하고 **내가 만진 파일만 선택 스테이징**(`git add <경로>`)한다. `git add -A`·전체 스테이징 금지(남의 미커밋 작업이 딸려감). 푸시 거부되면 fetch+rebase.
- **병렬 세션 격리 → git worktree 활용:** `git worktree add 풀로세움-2 -b work-2`로 별도 폴더+브랜치 생성 → 각 세션이 독립 파일 트리에서 작업 → 머지(FF 또는 3-way)로 합침. 현재 워크트리: `C:\Users\soosa\Documents\풀로세움`(main/feat 브랜치용), `C:\Users\soosa\Documents\풀로세움-2`(병렬 작업용, work-2 브랜치). preview 서버: 풀로세움=8765, 풀로세움-2=8770.

## ▶ 게임 바로 열기 (Claude에게: 매 대화 시작 시 이 링크를 항상 먼저 보여줄 것)
- **게임 실행:** [index.html](index.html) (클릭하면 브라우저로 열림 — 현재 게임 현황 바로 확인)
- 파일 직접 경로: `file:///C:/Users/soosa/Documents/풀로세움/index.html` (저장소 OneDrive 밖 이전 반영)
- 세이브는 브라우저 localStorage에 저장되므로, 같은 브라우저로 열면 진행 상황이 그대로 보입니다.

## 한 줄 소개
미래 우주 배경의 **식물 배틀 콜로세움** 웹게임. 외계 행성을 탐사해 종자를 모으고, 식물을 키워 토너먼트에서 싸운다. (장르: 방치형 + 포켓몬식 턴제 전투 + 수집/육성)

## 실행 방법
- **가장 간단:** `index.html`을 브라우저로 더블클릭 (외부 의존성 없음 — 데이터가 파일 안에 내장됨)
- **로컬 서버로 보기:** PowerShell에서
  `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1 -Port 8765` → `http://localhost:8765`
- 빌드 과정 없음. 순수 HTML/CSS/JS(바닐라).

## 구조 (중요)
- **`index.html`** — 게임 전체가 이 한 파일에 들어 있음. CSS·JS·**게임 데이터 전부 인라인**.
  - ⚠️ 행성/지역/아이템/토너먼트 데이터는 `index.html`의 `const AlienPlantGameData = ...` 블록에 내장. (`data/alien-plant-pvp-data.js`는 참고용, 게임은 안 읽음)
  - ⚠️ **종·스킬은 별개 위치(2026-06-24~):** 종 = `SPECIES_CATALOG`(레거시 격자 `SPECIES_GRID` 위에 머지), 스킬 = `SKILL_LIB`. 종/스킬 확장은 이 둘만 수정(개체 템플릿: `spore_cap`). → [species-system-guide](docs/species-system-guide.md)
- **`docs/dex/plant-codex.html`** — 식물 도감(카드뉴스형). 데이터 복제 없이 숨은 `<iframe src="../../index.html?dex=1">`로 게임을 불러와 `window.__DEX_API`에서 실제 데이터·함수를 읽어 렌더 → 종/스킬/스탯/**외형(절차적 SVG, `composePlantSvg`)** 은 index.html만 고치면 자동 반영(외형은 단계 리본 클릭 시 같이 자람). `?dex=1`은 부팅·세이브·SW 생략(데이터 전용). ⚠️ `sw.js`(PWA)가 게임을 캐시하니 preview 테스트 시 옛 게임이 읽히면 서비스워커·캐시 비우기. 잔여작업: [docs/dex/HANDOFF.md](docs/dex/HANDOFF.md)
- **`data/alien-plant-pvp-data.js`** — 데이터 원본(참고용). `scripts/validate-alien-plant-data.js`로 검증 가능.
- **`_analysis/pdf_pages/`** — 기획서 PDF를 페이지별 PNG로 변환한 것 (기획 참고용, page_01~09에 내용 있음).
- **`바탕 화면/풀로세움 기획서.pdf`** — 원본 기획서(이 폴더 밖, 데스크탑).
- **Godot 관련 파일**(`.godot/`, `*.gd`, `*.tscn`, `scenes/`, `Main.tscn`, `docs/pluloseum_godot_migration_plan.md`, `data/pluloseum_godot_data.json`) — 과거 Godot 이식 시도의 잔재. **이 웹게임과 무관**하니 무시. `.gitignore`로 추적 제외함.

## 구현된 시스템 (기획서 기반)
- **탐사:** 아틀라스 궤도 우주맵(**11행성/3궤도**, 행성=다른 은하 공유 좌표·연료=폴드 에너지), 탐사선 개조(연료·내구·채집기·탐사장치), **행성 서식 풀(`species`)+지역 시그니처(`signature`)+테마 필터** 종 분포(`rollSpeciesFromView`), 탐사 시 시공간 폴드(차원이동) 연출 → 결과 팝업. → [exploration spec](docs/superpowers/specs/2026-06-24-exploration-atlas-upgrade-design.md)
- **종자/보관:** 희귀도·보관환경, 종자 가방(최대치), 변이.
- **식물 육성:** 생장 6단계(씨앗→새싹→유체→성장체→성체→완숙체). 성장 경험치 → 단계별 새 스킬 해금.
- **양육/열매 시스템(2026-06-24~):** 양육 탭에서 시간 게이지(방치형) 방식으로 열매 맺기. 성장체 이상 단계부터 활성화, 게이지 가득 차면 1개씩 최대치까지 맺힘. 5색 희귀도(흰<초록<파랑<보라<주황). 물/비료 버프로 속도 가속. 낙엽 상태(시듦)면 물 트리클 생성. 전투 승리 시 물/비료 공급. `harvestAllPots()` 전체 수확. 공통 개봉 연출 `openRewardReveal`. 양육 뱃지(`nurseryNavDot`)로 수확 가능 알림.
- **수집 화분(2026-06-24~):** 5종(`pot_terra`흰→`pot_ceramic`초록→`pot_glass`파랑→`pot_crystal`보라→`pot_gold`주황). 각각 충전속도·최대열매Δ·등급확률 보너스 부여. 영구 해금 모델(`state.pot_inventory = {potId:true}`). 양육 칸 = 식물 레이어(`composePlantSvg({noPot:true})`) + 화분 레이어(`potVisual(potId)`) 합성(#12·#3 진입점). 상점 구매·탐사 성공·열매 보상으로 획득. `POT_SPRITE_OVERRIDES` = 도트화 훅(비어있음).
- **스킬/특성:** 식물은 속성+특성+생장단계로 스킬을 얻고, **최대 6개 로드아웃**을 장착해 전투(클래시 로얄식). 특성(20종)은 전투 패시브(재생/흡혈/반사/방깎 등) + 시그니처 스킬을 부여. 상태이상(버프/디버프/중독·출혈·화상) 엔진. DoT 스택 상한 `DOT_STACK_CAP=4`(`addDot()`으로 추가, 초과 시 오래된 것 제거).
- **변이 카드 시스템(2026-06-25~):** 변이형 6종(무기/포식/독성/포자/용족/일반). ⚠️ **발광(lumen) 폐지**(`rollForm` 제거, 기존분 legacy 보존). **포자형=버섯 전용**. 변이형=패시브 없음·"해당 변이 카드 장착 가능" 슬롯 게이트만. `variantSkillsOf(p)` = 하단 변이 스킬 바 단일 진실 함수. 스킬 분류(`cats`) 6종: attack/guard/buff/debuff/heal_hp/heal_energy. `TRAIT_CARDS` `fixed:true` = 등급 고정(mult=1). 같은 card_id 장착 시 등급 무관 자동 교체(중복 불가). → 설계: [mutation-forms-cards-redesign-design.md](docs/superpowers/specs/2026-06-24-mutation-forms-cards-redesign-design.md)
- **전투/토너먼트:** 예선(5판3선) → 16강 → 8강 → 4강 → 결승. 우승 시 랭크 포인트로 **브론즈→실버→…→풀로세움** 승급. 토너먼트명은 생장단계+랭크로 자동 생성(예: "새싹 브론즈 토너먼트").
- **속성 상성:** 기획서의 약점표 기준(불←물·대지 / 물←풀·빙결·번개 / 풀←불·바람·번개 / 번개←대지·빙결 / 대지←풀·물 / 빙결←불·대지 / 바람←대지·불).
- **하단 헤더(5탭):** 상점 / 탐사 / 식물·전투(중앙) / 식물양육 / 함선.
- **식물 관리 3탭:** 소모품(스탯 강화+탐사 아이템 사용) / 특성 / 스킬(로드아웃 편집).

## 주의사항
- ⚠️ **`grass`는 타입·속성 양쪽 문자열:** 타입 `grass`(=구 초본형, 폐지→화초형 흡수, 내부 폴백만 잔존)와 속성 `grass`(=풀)가 동일 문자열. 종/타입 코드에서 `'grass'` 일괄치환 금지(풀속성 깨짐). 현행 타입 5종 = 목본/화초/다육/덩굴/버섯.
- **세이브는 브라우저 localStorage에 저장** → PC/브라우저마다 따로. 기기 간 진행도 자동 동기화 안 됨.
- 코드 수정 후 검증은 미리보기(preview) 도구 또는 위 로컬 서버로.
- **테스트 러너 없음** → 회귀 검증은 콘솔 셀프테스트 `window.__catalogSelfTest()` (케이스 추가: `index.html` 끝 `window.__test('name', fn)`). 판정은 **반환값(fails 배열)**으로 — preview 콘솔 버퍼는 리로드해도 옛 에러가 남는다.
- preview 서버명은 `.claude/launch.json`의 `pullosseum`. **정적 서버라 HMR 없음** → 코드 수정 후 `location.reload()` 하고 다시 검증. `location.reload()`로 안 풀리면(특히 다른 세션 git 조작 후) → **`preview_stop` + `preview_start`로 서버 재시작**(새 인스턴스가 디스크 재독). SW 클리어·캐시버스트 URL로는 안 풀릴 수 있음.
- **`preview_screenshot`는 배경 무한 애니메이션(`floaty` 등) 때문에 자주 타임아웃** → 시각 검증은 `preview_eval`로 DOM(`querySelector`·computed style)·함수 반환값을 확인하는 방식으로 대체(렌더러는 살아있음).

## 앞으로 할 만한 것 (백로그)
> ⚠️ **앞으로의 방향·우선순위는 이제 [`docs/master-roadmap.md`](docs/master-roadmap.md)(유일 허브)에서 관리한다.** 아래는 요약일 뿐, 갱신은 로드맵에서 한다.
- 식물 종류 확장 / 도트 UI / 함선·길드·방꾸 / 애니메이션 / 사운드 / PvP·서버 / 구글 플레이 출시 → 전부 로드맵 §4에 구체화됨.
- ~~세이브 내보내기/가져오기~~ ✅ 2026-06-19 · ~~특성 카드 시스템~~ ✅ 2026-06-16 · ~~양육·열매 시스템(화분 포함)~~ ✅ 2026-06-24

## 변경 이력 (개발 로그)
- 전체 개발 로그는 **[docs/CHANGELOG.md](docs/CHANGELOG.md)** 로 분리됨. 과거 작업 맥락이 필요할 때만 열어보세요.
- 작업 완료 후 새 항목은 CHANGELOG.md **맨 위**에 날짜순으로 추가.

## 참고 문서 (라우팅 — 필요할 때만 읽기)
- 전투/성장 메커니즘: [docs/battle-mechanics-deep-dive.md](docs/battle-mechanics-deep-dive.md) (성장·밸런스는 [balance-sheet.md](docs/balance-sheet.md)로 통합)
- 종 시스템: [docs/species-system-guide.md](docs/species-system-guide.md)
- 밸런스 시트: [docs/balance-sheet.md](docs/balance-sheet.md)
- 특성/생장 로드맵: [docs/trait-growth-roadmap.md](docs/trait-growth-roadmap.md)
- 안드로이드 빌드: [docs/android-capacitor-wrapper.md](docs/android-capacitor-wrapper.md)
- 토큰 절약 워크플로: [.claude/prompts/reset-handoff.md](.claude/prompts/reset-handoff.md), [docs/session-chaining-guide.md](docs/session-chaining-guide.md)
- 브레인스토밍/설계 박제: `docs/superpowers/specs/YYYY-MM-DD-<주제>-design.md` (미완 설계는 여기 박제 + 로드맵 §2 문서지도에 등록 → 다음 세션 진입점).
- ✅ **#2 양육/열매+화분 설계(완료):** [nurture-fruit-system-design](docs/superpowers/specs/2026-06-24-nurture-fruit-system-design.md) · [collectible-pots-design](docs/superpowers/specs/2026-06-24-collectible-pots-design.md)
- **#1 종/스킬 개체 고유화**(타입/속성 공통 컨셉·35종 ×고유스킬3[성장체/성체/완숙체]·변이 재편[발광폐지·포자=버섯전용·일반5]·식물/화분 분리·외형 접근) = [docs/superpowers/specs/2026-06-24-species-individual-concepts-design.md](docs/superpowers/specs/2026-06-24-species-individual-concepts-design.md) — **설계 확정·코드 미반영(소유권 대기)**. 변이 개체 1차 어울림 28종(V1~V28) 완성, 남은 설계 = 각 종 2차 어울림 변이 + 외형 액센트 명세. 변이 시스템 권위 = [mutation 재설계](docs/superpowers/specs/2026-06-24-mutation-forms-cards-redesign-design.md).
