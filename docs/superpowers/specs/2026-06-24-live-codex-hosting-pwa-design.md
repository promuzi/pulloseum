# 설계: 자동 동기화 도감(라이브) + 호스팅 + PWA

작성일 2026-06-24 · 상태: 구현 완료(호스팅 토글만 사용자 1회)

## 문제
`docs/dex/plant-codex.html`이 게임 데이터(스탯·스킬·종·규칙)를 **자체 복제**해 둬서, 게임을 고치면 도감이 옛 데이터로 남는다. 매번 수동 갱신 요청은 비효율.

## 결정한 접근 (사용자 승인: A + PWA)
**A. 라이브 읽기** — 도감이 복제본 대신 게임의 실제 데이터를 읽는다. + GitHub Pages 호스팅 + PWA.
- 대안 B(공유 모듈 리팩터)·C(노드 빌드)는 각각 위험/제약(이 PC 노드 없음)으로 기각.

## 구성

### 1) 게임 데이터 노출 (index.html, 1회)
- 스크립트 끝에 `window.__DEX_API = { SPECIES, ALL_SKILLS, ELEMENTS, ELEMENT_STATS, TYPE_STATS, SEED_TYPE_NAMES, SEED_TYPE_ORDER, TYPE_CONCEPT, RARITY_META, FORMS, GROWTH_STAT_MULT, GROWTH_STAGE_NAMES, GROWTH_STAGE_ORDER, plantKnownSkillIds, skillGradeOf, skillById, displaySkillName, battleType }` 노출. (대부분 `const`라 window 밖에서 못 읽으므로 명시 노출 필요.)
- **데이터 전용 모드**: `?dex=1`이면 `bootWithSave`/렌더/Cloud/SW를 모두 생략 → 도감이 게임을 불러와도 **사용자 세이브 무손상**.

### 2) 도감 리팩터 (plant-codex.html)
- 자체 복제 데이터 전부 제거. 숨은 `<iframe src="../../index.html?dex=1">` → `contentWindow.__DEX_API`에서 읽어 렌더.
- 스탯 = `SPECIES[key].base × GROWTH_STAT_MULT[stage]`, 스킬 = `plantKnownSkillIds(...)` 게임 함수 그대로. → 자동 일치.
- 도감 전용 서술(`CONCEPTS` 36종·`TYPE_DESC`·`TYPE_GLYPH`)만 도감에 보존(신규 종은 게임 `desc` 폴백).
- iframe 읽기 실패(`file://` 등) 시 안내 폴백 + 12초 타임아웃.

### 3) 호스팅 (GitHub Pages)
- 공개 저장소에 Pages(main / root) → 게임 `https://promuzi.github.io/pulloseum/`, 도감 `.../docs/dex/plant-codex.html`. 푸시 시 자동 배포. 같은 출처라 iframe 읽기 안정.
- ⚠️ 활성화는 저장소 Settings → Pages에서 1회 토글(이 PC에 `gh` 없음).

### 4) PWA
- `site.webmanifest`(기존, name·start_url·standalone·아이콘 192/512 보유) + 신규 `sw.js`(HTML network-first=항상 최신, 정적 cache-first, 구 캐시 정리). index.html에서 비-dex 모드일 때만 SW 등록.
- 설치 대상 = 게임. 홈 화면 추가 시 앱처럼 전체화면.

## 검증 (완료)
- 도감: 36종/36카드/6섹션 렌더, 단계 전환·필터 동작, 스탯·스킬 게임과 일치(예: spore_cap 새싹 HP94·포자 분출/운무막, 완숙체 HP141), 콘솔 에러 0.
- dex-mode: iframe 게임 부팅 안 됨(titleArt 비어있음) → 세이브 무손상 확인.
- 게임 본체: 정상 부팅 + `__DEX_API` 노출 + 셀프테스트 18/18 PASS.

## 범위 밖
- 스토어 앱(Capacitor) — 별도 트랙. 게임 진행도 기기 동기화 — 기존 Supabase 클라우드 세이브.
