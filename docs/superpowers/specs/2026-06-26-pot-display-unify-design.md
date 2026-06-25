# 화분 표시 전역 통일 (식물/화분 분리 유지) 설계 (2026-06-26)

## 목적
게임 내 모든 식물 표시를 **"변경 가능한 픽셀 화분(`potVisual`) 레이어 + 식물 레이어"** 2레이어로 통일한다. 화분은 끝까지 **독립 교체 레이어**로 유지(식물 SVG에 합치지 않음). 이모지 화분·일회성 화분 외형·맨 식물(화분 없음)을 전부 제거한다.

## 배경 — 현재 불일치 (origin/main d63176a)
- **이모지 화분:** 화분 픽커(`openPotPicker` ~12003 `pot.icon`), "화분 바꾸기" 버튼(~11984 `potOf(p).icon`), 화분 상점(`POT_SHOP` 이모지) → 실제 화분 외형이 안 보임.
- **맨 식물(화분 없음):** 직전 "접지" 변경으로 `composePlantSvg` 기본이 화분 없는 식물 → 식물 관리/강화창(`pm-plant` ×3), 전투(`#eSpriteBox`/`#pSpriteBox`), VS 스트립, 진화 모달, 종자가방 썸네일, 탐사 종 칩, 타이틀·유전자 미리보기 전부 맨 식물.
- **일치하는 곳:** 메인(`pp-stack`)·양육(`pot-stack`)·빈/잠긴 슬롯은 이미 `potVisual` 픽셀 화분.

## 결정 (사용자)
- 식물과 화분은 **분리 유지**(화분만 독립 교체) — baking 금지.
- 모든 화분 외형 = `potVisual` 픽셀 화분 하나로 통일(이모지·일회성 제거).
- 맨 식물 0 — 타이틀·유전자 등 장식 식물도 화분에 담음.
- 빈 화분·나무 받침은 현행 유지(받침은 메인만).

## 구현

### 1. `composePlantSvg` = 항상 식물만, 140 viewBox
- 직전 "접지 crop"(`plantBaseY`·가변 vbH) **폐기** → 항상 `viewBox="0 0 120 140"`, 식물만(내장 화분 없음). 화분 레이어가 별도로 같은 140 좌표에 깔리므로 식물 base y96이 화분 입구에 정렬.
- `plantBaseY` 함수 제거. `opts.noPot`은 더 이상 분기 불필요(항상 식물만).

### 2. `spriteStack` 헬퍼 신설 + `spriteFor` 2레이어화
```javascript
/* 화분 레이어(뒤) + 식물 레이어(앞) 2레이어 스택. 둘 다 같은 120x140 좌표 → 식물이 화분에 앉음. */
function spriteStack(potHtml, plantHtml){
  return `<span class="sprite-stack"><span class="ss-spacer">${potHtml}</span>`
    + `<span class="ss-pot">${potHtml}</span><span class="ss-plant">${plantHtml}</span></span>`;
}
```
- `spriteFor(obj,size)`: 식물 레이어 = `composePlantSvg(...,{noPot:true})` 또는 PNG override, 화분 = `potVisual(potId,size)`. `potId = (obj.nursery&&obj.nursery.potId) || obj.potId || 'pot_terra'`. 반환을 `spriteStack(pot, plant)`로.
- CSS `.sprite-stack`(= `.pp-stack`과 동형: 상대위치 + spacer 크기 + pot z1/plant z2 절대겹침).

### 3. `svgPlant`(종 기준, 식물 객체 없음) 2레이어화
- 식물 레이어(`noPot:true`) + `potVisual('pot_terra',size)` → `spriteStack`. 타이틀·유전자 미리보기 자동 화분.

### 4. 직접 `composePlantSvg` 호출처 화분 부여
- 진화 모달(`showEvolveModal` ~9935/9936): before/after를 `spriteStack(potVisual(p.nursery.potId,120), composePlantSvg(...,{noPot:true}))`로.
- 탐사 종 칩(`exSpeciesChip` ~8079): `svgPlant(k, s.element, null,null,26,'juvenile')`로 교체(화분 포함).

### 5. 전투 유닛에 potId 전달
- `makeCombatant` unit에 `potId:(src.nursery&&src.nursery.potId)||'pot_terra'` 추가 → 플레이어는 장착 화분, 봇은 기본 테라코타.

### 6. 이모지 화분 → 픽셀 화분
- 화분 픽커(`openPotPicker` 12003): `<div style="font-size:24px">${pot.icon}</div>` → `potVisual(id, 40)` 미니.
- "화분 바꾸기" 버튼(11984): `${potOf(p).icon}` → 인라인 `potVisual(potOf(p).id, 22)`.
- 화분 상점(`renderShop` potLane ~10681): map에 `icon: potVisual(x.id, 40)` 주입(`shopCard`가 `item.icon`을 HTML로 렌더하므로 SVG 삽입 가능).

### 7. self-test 갱신
- 기존 "접지 crop" 단언 → "식물 SVG=화분 없음·항상 140" + `spriteStack` 2레이어 구조 단언으로 교체. `potVisual` 5종·accent 케이스 유지.

## 영향/주의
- 메인(`pp-stack`)·양육(`pot-stack`)·빈/잠긴 슬롯: `noPot:true` + 별도 `potVisual` 구조라 변경 없음(자동 정렬 유지).
- `.sprite-stack`은 컨테이너의 `svg{max-width}` 규칙을 spacer로 흡수 → 전투(`.fsprite`)·관리창(`.pm-plant`)·VS 등 기존 사이즈 규칙과 호환.
- 도감(`__DEX_API` composePlantSvg)은 식물만(화분 없음) 노출 — 도감은 종 외형 도감이므로 의도. (필요 시 후속.)

## 검증
- `window.__catalogSelfTest()` 0 fail.
- 인라인 스크립트 node 구문검사 0 에러.
- preview 주입/구조 확인: `spriteFor`가 `ss-pot`+`ss-plant` 반환·전투/관리창/진화/픽커/상점이 픽셀 화분 표시·메인/양육 정렬 유지. 위젯으로 시각 점검.

## 문서
- `docs/CHANGELOG.md`·`docs/master-roadmap.md` #12 갱신, 코드와 함께 커밋·푸시.
