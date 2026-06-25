# 식물 그림에서 화분 제거 + 접지 설계 (2026-06-25)

## 목적
`composePlantSvg`가 식물 그림 안에 그리던 내장 화분(어두운 둥근 화분)을 완전히 제거한다. 화분을 빼면 viewBox 하단이 비어 식물이 떠 보이므로, 단독 표시(전투·모달 등)에서는 식물 종류별 실제 바닥까지 viewBox를 잘라 식물이 박스 바닥에 앉게(접지) 한다. 메인화면·양육처럼 외부 픽셀 화분을 따로 얹는 곳은 영향 없이 유지한다.

## 배경
- 내장 화분 = `composePlantSvg` 한 곳(`index.html` ~9279–9281, y96–138의 `rect`+`path`+`rect`). `opts.noPot`일 때만 생략.
- 식물 바닥 좌표(`composePlantBody`): 줄기 `M60 96` → **목본/화초/다육/덩굴/풀(grass) = y96**. 씨앗(gi0) 타원 바닥 ≈ **y88**. 버섯은 줄기 없음, 자루 바닥 `cy+16 = (76-gi*7)+16 = 92-gi*7`.
- 단독 표시 호출은 전부 `noPot` 미지정 → 내장 화분 노출: 전투 `spriteFor(...,108)`(`#eSpriteBox`/`#pSpriteBox`), 진화 모달(`composePlantSvg(...,{size:120})`), 식물관리 모달(`pm-plant`), VS 스트립, 유전자/타이틀/도감(`svgPlant`).
- 전투 발밑 그림자 `.fsprite::after`는 스프라이트 **하단**에 위치 → 화분만 지우면 식물(base y96)이 그림자(viewBox 하단 y140) 위로 ~44px 떠 "연결 안 됨".

## 결정
- 전투 등 단독 표시 = **화분 없음 + 접지**(경기장 바닥에 서는 식물). 픽셀 화분을 전투에 깔지 않는다.
- 접지 방식 = **종별 바닥 y까지 viewBox crop**(translate 아님). 식물이 박스를 꽉 채우며 바닥에 앉아 그림자와 붙는다.
- 버섯·씨앗은 네이티브 그림이 작아 접지해도 다른 종보다 작게 보일 수 있음 → v1 허용, 어색하면 버섯만 후속 미세조정.

## 구현

### 1. `plantBaseY` 헬퍼 신설 (`composePlantSvg` 위)
```javascript
/* 종/단계별 식물 바닥 y(접지 crop 기준). composePlantBody의 줄기·자루 좌표와 일치. */
function plantBaseY(seedType, gi){
  if(gi <= 0) return 88;                       // 씨앗: 타원 바닥
  if(seedType === 'mushroom') return 92 - gi*7; // 버섯: 자루 바닥(cy+16)
  return 96;                                    // 줄기 뿌리(M60 96)
}
```

### 2. `composePlantSvg` 수정
- 내장 화분 블록(`${opts.noPot ? '' : ...}`) **삭제**.
- viewBox 높이를 모드별로:
  - `opts.noPot` (외부 화분용·메인/양육): 기존대로 **140**(식물 base y96 + 아래 픽셀 화분 자리).
  - 미지정 (단독·접지): `vbH = clamp(plantBaseY+8, 60, 140)`.
```javascript
  const vbH = opts.noPot ? 140 : clamp(plantBaseY(seedType, gi) + 8, 60, 140);
  return `<svg width="${size}" height="${Math.round(size*vbH/120)}" viewBox="0 0 120 ${vbH}" xmlns="http://www.w3.org/2000/svg">
    ${aura}
    ${composePlantBody(seedType, gi, P, el, opts.bodyStyle || 'classic')}
    ${bodyAccentSvg(opts, el, gi, P)}
    ${spark}
  </svg>`;
```
- `noPot` 의미 정리: **`noPot:true` = 전체 높이(외부 화분용), 미지정 = 접지(단독)**. 내장 화분은 어느 쪽도 안 그림.

### 3. self-test 갱신
- `pots: visual separation`: `full`/`noPot` 모두 이제 화분 path(`M40 103`) 없음 → 단언을 **둘 다 화분 path 없음** + **접지(default)는 viewBox 높이 < 140, noPot은 =140** 으로 교체. `potVisual` 5종 검사는 유지.
- `accent: ...변이형별로 다른 외형`: `base.indexOf('M40 103')>=0` 단언을 화분 비의존(예: `base.indexOf('<svg')>=0` 또는 본체 요소 존재)으로 교체.

## 영향/주의
- 메인화면(`renderCenter`)·양육 그리드/상세는 `noPot:true` 유지 → 변경 없음(전체 140 + 픽셀 화분 레이어).
- 도감(`__DEX_API`)·타이틀·유전자 미리보기는 자동으로 화분 없는 접지 식물로 표시(의도된 변경).
- 버섯/완숙체 aura(반경 큼)가 접지 crop 하단에 약간 잘릴 수 있음 → 무해(소프트 글로우).

## 검증
- `window.__catalogSelfTest()` 반환 fails 비어야 함(갱신된 케이스 포함).
- 인라인 스크립트 node 구문검사 0 에러.
- preview 주입: 전투 스프라이트(`spriteFor` 108)가 그림자에 붙는지(식물 base가 svg 하단 근처), 5종×대표단계 접지 확인, 메인/양육은 그대로(140·화분 정렬) 확인.

## 문서
- `docs/CHANGELOG.md` 맨 위 항목 + `docs/master-roadmap.md` #12 항목 갱신, 코드와 함께 커밋·푸시.
