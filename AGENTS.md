# 풀로세움 (Pulloseum) — 프로젝트 안내

> 다른 PC에서 이 폴더를 Codex로 열면 이 파일을 먼저 읽고 맥락을 파악하세요.

## ★ 개발 방향은 여기부터 (작업 시작 전 반드시 먼저 읽을 것)
- **마스터 개발 로드맵 → [docs/master-roadmap.md](docs/master-roadmap.md)** — 현재 구현 현황·앞으로의 방향·확정 결정·**모든 하위 문서로 가는 지도**가 한곳에 모인 **유일 허브(SSOT)**. 어떤 기기/AI로 작업하든 이 파일을 먼저 읽고 현황을 파악한다. 세부 수치/설계는 그 안의 "문서 지도"를 타고 하위 문서로 들어간다.
- ⚠️ **실시간 갱신 의무:** 코드·데이터·기획을 바꾸면 **같은 작업 안에서** 로드맵(또는 해당 하위 문서)의 상태/체크박스/수치를 갱신하고, 결정이 생기면 "결정 로그"에 남기고, **코드와 문서를 함께 커밋·푸시**한다. 놓치는 것 없이 항상 실시간으로. (상세 규약: 로드맵 §6)
- **별칭:** 사용자가 "마스터 로드맵 / 로드맵 / 마스터 문서" 무엇으로 부르든 전부 `docs/master-roadmap.md`를 뜻한다.
- **작업 시작 시 `git pull`**(다른 기기/대화창 변경 선반영), 끝나면 `git push`. 새 기기에서 클론했으면 한 번 `git config core.hooksPath .githooks` 실행(코드만 바뀌고 문서 안 바뀐 푸시를 막는 pre-push 훅 활성화).

## 한 줄 소개
미래 우주 배경의 **식물 배틀 콜로세움** 웹게임. 외계 행성을 탐사해 종자를 모으고, 식물을 키워 토너먼트에서 싸운다. (장르: 방치형 + 포켓몬식 턴제 전투 + 수집/육성)

## 실행 방법
- **가장 간단:** `index.html`을 브라우저로 더블클릭 (외부 의존성 없음 — 데이터가 파일 안에 내장됨)
- **로컬 서버로 보기:** PowerShell에서
  `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1 -Port 8765` → `http://localhost:8765`
- 빌드 과정 없음. 순수 HTML/CSS/JS(바닐라).

## 구조 (중요)
- **`index.html`** — 게임 전체가 이 한 파일에 들어 있음. CSS·JS·**게임 데이터 전부 인라인**.
  - ⚠️ 게임 데이터(행성/지역/종자/특성/아이템/토너먼트)는 `index.html` 안의 `const AlienPlantGameData = ...` 블록에 **내장**돼 있음. 데이터를 고치려면 여기를 수정. (`data/alien-plant-pvp-data.js`는 원본 참고용일 뿐, 게임은 더 이상 읽지 않음. 둘을 같이 고치려면 둘 다 수정)
- **`data/alien-plant-pvp-data.js`** — 데이터 원본(참고용). `scripts/validate-alien-plant-data.js`로 검증 가능.
- **`_analysis/pdf_pages/`** — 기획서 PDF를 페이지별 PNG로 변환한 것 (기획 참고용, page_01~09에 내용 있음).
- **`바탕 화면/풀로세움 기획서.pdf`** — 원본 기획서(이 폴더 밖, 데스크탑).
- **Godot 관련 파일**(`.godot/`, `*.gd`, `*.tscn`, `scenes/`, `Main.tscn`, `docs/pluloseum_godot_migration_plan.md`, `data/pluloseum_godot_data.json`) — 과거 Godot 이식 시도의 잔재. **이 웹게임과 무관**하니 무시. `.gitignore`로 추적 제외함.

## 구현된 시스템 (기획서 기반)
- **탐사:** 우주맵(행성 3 / 지역 6), 탐사선 개조(연료·내구·보관함·탐색장치), 행성·지역별 종자 드롭, 탐사선 이동 애니메이션 → 결과 팝업.
- **종자/보관:** 희귀도·보관환경, 종자 가방(최대치), 변이.
- **식물 육성:** 생장 단계(씨앗→새싹→유체→성체→완숙체). 전투 승리로 성장 경험치 획득 → 단계별 새 스킬 해금.
- **스킬/변이형:** 식물은 속성+변이형+생장 단계로 스킬을 얻고, **최대 6개 로드아웃**을 장착해 전투(클래시 로얄식). 포식/무기/독성/포자/발광 등은 **변이형**이며 변이 카드로 강화한다. 잠재특성은 생장 단계에서 나중에 발현될 패시브 분류로 남겨두되 현재 전투에는 반영하지 않음.
- **전투/토너먼트:** 예선(3판2선) → 16강 → 8강 → 4강 → 결승. 우승 시 랭크 포인트로 **브론즈→실버→…→풀로세움** 승급. 토너먼트명은 생장단계+랭크로 자동 생성(예: "새싹 브론즈 토너먼트").
- **속성 상성:** 기획서의 약점표 기준(불←물·대지 / 물←풀·빙결·번개 / 풀←불·바람·번개 / 번개←대지·빙결 / 대지←풀·물 / 빙결←불·대지 / 바람←대지·불).
- **하단 헤더(5탭):** 상점 / 탐사 / 식물·전투(중앙) / 모드🔒 / 길드🔒. 모드·길드는 미개발 잠금.
- **식물 관리 3탭:** 소모품(스탯 강화+탐사 아이템 사용) / 변이형 / 스킬(로드아웃 편집).

## 주의사항
- **세이브는 브라우저 localStorage에 저장** → PC/브라우저마다 따로. 기기 간 진행도 자동 동기화 안 됨.
- 코드 수정 후 검증은 미리보기(preview) 도구 또는 위 로컬 서버로.

## 앞으로 할 만한 것 (백로그)
- 모드·길드 실제 콘텐츠
- 상점 가챠 박스(변이 카드/소모품 뽑기)
- 세이브 내보내기/가져오기(기기 간 이동용)
- 용족·독초 등 추가 변이형

## 변경 이력 (개발 로그)
- 전체 개발 로그는 **[docs/CHANGELOG.md](docs/CHANGELOG.md)** 로 분리됨 (CLAUDE.md와 공유). 과거 맥락이 필요할 때만 열어보세요.

## 참고 문서 (필요할 때만)
- 전투/성장: [docs/battle-mechanics-deep-dive.md](docs/battle-mechanics-deep-dive.md), [docs/battle-growth-guide.md](docs/battle-growth-guide.md) / 종: [docs/species-system-guide.md](docs/species-system-guide.md) / 밸런스: [docs/balance-sheet.md](docs/balance-sheet.md)
- 토큰 절약: [.claude/prompts/reset-handoff.md](.claude/prompts/reset-handoff.md), [docs/session-chaining-guide.md](docs/session-chaining-guide.md)
