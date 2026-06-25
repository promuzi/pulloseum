# 상점 세로그리드 · 진화 버튼 중앙 · 컬렉션 드래그 재배열 설계 (2026-06-26)

## 목적
UI 수정 3건: ① 상점 아이템을 가로 스크롤 → 아래로 채워지는 그리드, ② 진화 모달 확인 버튼 중앙 정렬, ③ 메인 컬렉션 바에서 식물을 드래그&드롭으로 재배열(순서 변경 시 양육 그리드도 같이 바뀜).

## 배경 (origin/main)
- **상점:** `.shop-lane`(`index.html` ~633) = `display:flex; overflow-x:auto; scroll-snap-type:x`(가로 스크롤 레인). `.shop-card`(~637) = `min-width:138px; width:138px; scroll-snap-align:start`(고정폭 카드). `renderShopLane`이 모든 블록(특가/재화/소모품/화분/상자)에 이 레인을 씀.
- **진화 버튼:** `showEvolveModal`(~9956) `<button class="btn primary" id="evolveClose" style="margin-top:14px">확인</button>`. `.btn`은 폭 미지정(버튼 기본 auto·인라인) → `.modal-card` 좌측에 치우침.
- **컬렉션 바:** `#collectionBar`(~139) = 2행 column-flow 그리드(가로 스크롤). `renderCollection`(~9711)이 `state.plants[i]`로 `i=0..POT_MAX-1` 칩 생성(plant=`.chip data-id`, 빈=`.potempty`, 잠금=`.potlocked`). 탭 핸들러(~12521)가 `state.activeId` 설정.
- **연동 핵심:** `#collectionBar`(메인)와 `renderNurseryGrid`(양육) **둘 다 `state.plants` 같은 배열을 인덱스로** 렌더. 양육 상태는 슬롯이 아니라 **식물 객체(`p.nursery`)** 에 있음 → `state.plants` 순서만 바꾸면 양쪽 동기화 + 양육 진행도는 식물 따라 이동.
- `#profileRow`(~125) = `display:flex` `[#profileBanner | #collectionBar]`.

## 결정
- #1 = 아래로 채워지는 그리드(가로 스크롤 폐기). #3 = 드래그&드롭. (사용자 선택)
- #3 범위 = **순서(시퀀스) 재배열만**. dense 모델 유지(빈 칸은 항상 뒤). 특정 슬롯 gap 배치는 제외.

## 구현

### #1 상점 — 세로 그리드
- `.shop-lane`: `display:grid; grid-template-columns:repeat(auto-fill,minmax(132px,1fr)); gap:10px; padding:1px 2px 10px;` (가로 스크롤·스냅·스크롤바 규칙 제거).
- `.shop-card`: `min-width/width:138px` → `width:auto; min-width:0;` 제거, `scroll-snap-align` 제거. 나머지(테두리/패딩/세로 flex) 유지. `min-height` 유지.
- 결과: 모든 상점 블록이 자동으로 여러 열 → 아래로 줄바꿈(세로 스크롤). JS 변경 없음.

### #2 진화 확인 버튼 중앙
- `#evolveClose` 인라인 스타일 `margin-top:14px` → `margin:14px auto 0; display:block; width:fit-content; min-width:120px`. 중앙 정렬·내용폭.

### #3 컬렉션 드래그&드롭 재배열 + 편집 토글
1. **편집 토글 버튼** — `#profileRow`에 `#collectionBar` 뒤로 `<button id="collEditBtn" class="coll-edit">✏️</button>` 추가(CSS `.coll-edit` 컴팩트, 편집 중 `.on`이면 ✓/완료 톤). 클릭 → `collectionEditMode` 토글 → `document.body.classList.toggle('coll-editing')` + `renderCollection()`.
2. **renderCollection 보강** — 각 칩에 `data-idx="${i}"` 부여(plant·빈·잠금 전부). 편집 모드면 컨테이너에 흔들림/안내(CSS `body.coll-editing #collectionBar .chip[data-id]{animation:chipWiggle…; cursor:grab}`).
3. **드래그 로직(`setupCollectionDrag`)** — `#collectionBar`에 포인터 이벤트 위임:
   - `pointerdown`(편집 모드 + `.chip[data-id]`에서만): 시작 좌표·소스 칩 기록, `setPointerCapture`.
   - `pointermove`: 임계(6px) 넘으면 드래그 시작 — 떠다니는 클론(`position:fixed; pointer-events:none; z-index`) 생성해 손가락 따라 이동, `document.elementFromPoint`로 대상 `.chip[data-idx]` 하이라이트.
   - `pointerup`: 대상 칩의 `data-idx`로 타깃 인덱스 산출 → `movePlantOrder(srcIdx, dstIdx)`; 클론 제거.
   - 임계 미만이면 드래그 아님(탭으로 처리되지 않게 편집 모드에선 무동작).
4. **`movePlantOrder(src, dst)`** — `state.plants`에서 src 식물을 빼서 dst 위치에 삽입(dst가 식물 수 이상이면 끝으로). 변화 있으면 `saveState()` + `renderCollection()` + `renderNurseryGrid()`(존재 시) + `sfx.tap()`.
5. **탭 핸들러(~12521)** — 맨 앞에 `if(collectionEditMode) return;` 추가(편집 중 탭으로 activeId 변경 안 되게).

## 영향/주의
- 양육 그리드는 `state.plants` 인덱스 기반이라 재배열 즉시 반영. `p.nursery`(게이지·열매)는 식물에 붙어 함께 이동(슬롯 종속 아님) → 데이터 안전.
- 드래그 클론은 `spriteFor` 2레이어 SVG 포함 → 클론은 칩 `outerHTML` 복제로 단순화(렌더 재호출 X).
- 가로 스크롤 폐기로 `#collectionBar`가 세로로 자라지 않게 `grid-template-rows:1fr 1fr` 유지(2행 고정, 칸 많으면 여전히 가로로? → 편집/표시 일관 위해 **2행 유지하되 가로 스크롤은 남김**; #1은 상점에만 적용, 컬렉션 바 레이아웃은 불변).

## 검증
- `__catalogSelfTest()` 0 fail · node 구문검사 0 에러.
- preview: 상점 세로 그리드 줄바꿈, 진화 버튼 중앙, 편집 토글 후 드래그로 칩 순서 변경 → `state.plants` 순서·컬렉션 바·양육 그리드 동기화 확인(`movePlantOrder` 직접 호출 + DOM 검증).

## 문서
- `docs/CHANGELOG.md`·`docs/master-roadmap.md` 갱신, 코드와 함께 커밋·푸시.
