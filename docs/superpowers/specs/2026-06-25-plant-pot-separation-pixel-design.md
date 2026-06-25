# 식물·화분 도트 분리 & 통일 설계 (2026-06-25)

## 목적
식물 그림과 화분 그림을 **항상 별개 레이어**로 분리해, 화분을 독립적으로 업그레이드·교체하면 그림이 바뀌도록 한다. 화분은 메인화면의 나무 도트(픽셀) 화분을 기준으로 **게임 전역에서 동일한 픽셀아트 자산**을 쓰고, 빈 화분도 같은 자산으로 통일한다. 양육 그리드에서는 화분은 고정한 채 식물만 좌우로 흔들린다.

## 배경 — 현재 화분 렌더링이 3갈래로 갈림
1. **메인화면**(`renderCenter`, `index.html` ~9606): 활성 식물은 `spriteFor(p,150)` → `composePlantSvg(...)`가 **식물 SVG 안에 속성색 화분을 통째로 박아** 그린다(분리 안 됨). 빈 상태는 `.empty-pot`(픽셀 테라코타) + `.wood-stool`(픽셀 나무 받침).
2. **양육 그리드 채워진 슬롯**(`renderNurseryGrid`, ~11820): `composePlantSvg(...,{noPot:true})`(식물만) + `potVisual(potId,78)`(**색만 다른 매끈한 SVG 화분**) 2레이어.
3. **양육 빈/잠긴 슬롯**: `.pot-vessel`(또 다른 CSS 픽셀 테라코타).

→ 같은 "화분"이 위치마다 다른 그림. 통일이 목표.

## 결정 사항
- 화분 등급 외형: **5종 각각 완전히 다른 픽셀(도트) 디자인**. (사용자 선택)
- 메인화면 식물 레이어: **흔들림 없음**(정적). (사용자 지정)
- 좌우 흔들림은 **양육 그리드 식물 레이어에만** 적용.
- 빈 화분·잠긴 화분·메인 빈 상태: 전부 `potVisual('pot_terra')` 단일 자산으로 통일.

## 변경 1 — `potVisual()`를 등급별 픽셀아트 화분으로 재작성
`index.html` `potVisual(potId, size)` (~9280) 교체.

- 출력은 기존과 동일하게 `120×140` viewBox SVG 문자열. `width=size`, `height=round(size*140/120)`.
- `shape-rendering:crispEdges` + `<rect>` 픽셀 그리드로 그린다(메인 `.wood-stool`/`.empty-pot` 도트 톤과 통일).
- 화분 몸체는 동일 바닥/입구 좌표대(입구 y≈96, 몸통 y≈100~136, 폭 x≈34~86)에 배치 → 식물 레이어(`noPot`)와 정확히 겹쳐 "식물이 화분에서 솟는" 정렬 유지.
- `POT_SPRITE_OVERRIDES[potId]`(PNG 훅) 우선 분기는 유지.
- 5종 디자인 방향:
  - `pot_terra`(테라코타·기본): 기존 `.empty-pot`의 나무/테라코타 도트를 120×140 좌표로 옮긴 것. **메인화면 화분의 기준 자산.**
  - `pot_ceramic`(도자기): 초록 유약 도트 + 굽/하이라이트 라인.
  - `pot_glass`(유리): 반투명 하늘색 + 안쪽 흙·수면 픽셀 비침.
  - `pot_crystal`(크리스탈): 각진 보라 결정 + 광택 픽셀.
  - `pot_gold`(황금): 금빛 도트 + 상단 왕관 테두리 픽셀.
- 각 등급 `POT_CATALOG[id].color`를 픽셀 팔레트의 주조색으로 활용(밝게/어둡게 파생색 1~2개 더 둠).

## 변경 2 — 메인화면(`renderCenter`) 식물/화분 분리
- 활성 식물: `spriteFor(p,150)`(속성색 박힌 화분) → **2레이어 스택**으로 교체.
  - 화분 레이어: `potVisual(p.nursery.potId, 150)` (장착 화분; `ensureNurseryFields(p)`로 potId 보장).
  - 식물 레이어: `composePlantSvg(seedTypeOf(p), p.growth_stage, p.element, {size:150, grade, awakened, noPot:true, form})`.
  - 두 레이어를 같은 바닥·좌측 기준으로 절대 겹침(화분 뒤, 식물 앞). **흔들림 없음**.
  - 바닥 받침 `.wood-stool`은 그대로 유지.
- 빈 상태: `.empty-pot` 대신 `potVisual('pot_terra', 150)`(또는 적정 크기) + `.wood-stool`.
- 필요한 신규 CSS 클래스(예: `.pp-stack`/`.pp-pot`/`.pp-plant`)로 절대 겹침·정렬 처리. `#centerPlant svg,img` 사이즈 규칙과 충돌하지 않도록 스택 래퍼에 폭 고정.

## 변경 3 — 빈/잠긴 화분 자산 통일
- 양육 그리드 빈 슬롯(`pot-slot empty`)·잠긴 슬롯(`pot-slot locked`)의 `<div class="pot-vessel"></div>`를 `potVisual('pot_terra', …)` 출력으로 교체.
- 잠긴 슬롯은 기존처럼 회색/흐림 처리(`.pot-slot.locked` 필터)를 래퍼에 유지.
- 사용처가 사라지는 `.pot-vessel` CSS는 제거 또는 잔존 무해 처리. `.empty-pot`은 메인 빈 상태도 potVisual로 가면 미사용 → 제거 가능(보수적으로 남겨도 됨).

## 변경 4 — 양육 흔들림: 화분 고정 + 식물만 좌우로
- `.pot-stack .plant-layer` 애니메이션을 `rotate`(현 `potSway` 후순위 정의) → **좌우 `translateX` 흔들림** 전용 keyframe으로 변경(예: `@keyframes plantSwaySide{0%,100%{transform:translateX(-3px)}50%{transform:translateX(3px)}}`).
- 화분 레이어(`.pot-stack .pot-layer`)는 애니메이션 없음(고정) 유지.
- `prefers-reduced-motion` 분기 유지.
- 메인화면 식물 레이어에는 애니메이션을 부여하지 않는다(정적).

## 영향 없음/주의
- `composePlantSvg`의 `noPot` 분기, `noPot` 미설정 시 내장 화분은 **그대로 둔다**(도감 등 다른 호출처가 의존). 메인화면만 호출을 `noPot:true`로 바꾼다.
- 양육 상세(`openNurseryDetail`, ~11855)는 이미 `noPot:true` + `potVisual` 분리 구조 → potVisual 재작성으로 자동 반영. 추가 수정 불필요(정렬만 육안 확인).

## 검증
- `window.__catalogSelfTest()` 반환 fails 배열 비어야 함.
  - `pots: visual separation` 케이스: `potVisual(id)`가 여전히 `<svg`(또는 `<img`) 포함 → 통과 유지.
  - `accent` 케이스: `composePlantSvg` 변경 없음 → 통과 유지.
- preview 시각 확인 3곳: 메인화면(식물 있음/없음), 양육 그리드(채움/빈/잠김), 양육 상세.
- 화분 교체(`equipPot`) 후 메인화면·양육에서 그림이 바뀌는지 확인.

## 문서 갱신
- `docs/master-roadmap.md` 해당 항목 상태 갱신, `docs/CHANGELOG.md` 맨 위 항목 추가. 코드와 함께 커밋.
