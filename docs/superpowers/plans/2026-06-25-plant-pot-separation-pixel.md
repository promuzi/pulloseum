# 식물·화분 도트 분리 & 등급별 픽셀 화분 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식물과 화분을 항상 별개 레이어로 분리하고, 화분을 등급별로 다른 "나무 도트" 픽셀아트로 통일하여 메인화면·양육·빈 화분이 같은 자산을 쓰게 한다.

**Architecture:** 단일 파일 `index.html`(바닐라 JS). `potVisual()`을 ASCII-그리드 픽셀 빌더(`pixelArt`)로 재작성해 5종 픽셀 화분을 동일 `120×140` viewBox로 출력한다. 메인화면(`renderCenter`)은 식물(`noPot:true`)과 `potVisual(장착팟)`을 2레이어로 분리하고, 양육 빈/잠긴 슬롯도 `potVisual('pot_terra')`로 통일한다. 양육 식물 레이어 흔들림을 회전→좌우 이동으로 바꾼다.

**Tech Stack:** 바닐라 HTML/CSS/JS, 인라인 SVG(`shape-rendering:crispEdges`). 빌드 없음. 회귀 검증 = `window.__catalogSelfTest()` 반환 fails 배열 + preview 시각 확인.

## Global Constraints

- 빌드 과정 없음. `index.html` 한 파일 인라인 수정만.
- 다른 세션/OneDrive가 `index.html`(탐사 궤도 개편)·`CLAUDE.md`·`master-roadmap.md`를 미커밋 편집 중 → **그 변경 절대 건드리지 않는다.** 작업은 격리 워크트리(`C:\dev\…`, OneDrive 밖)에서 `feat/plant-pot-separation` 기준으로 한다.
- 화분 SVG는 항상 `120×140` viewBox, `width=size`, `height=round(size*140/120)`. 식물 레이어(`composePlantSvg(...,{noPot:true})`)와 바닥/입구 좌표 정렬.
- 화분 입구 ≈ y96, 몸통 y100~138, 좌우 x≈28~92(중심 x=60).
- `POT_SPRITE_OVERRIDES[potId]`(PNG 훅) 우선 분기 유지.
- `composePlantSvg`의 `noPot` 미설정 시 내장 화분은 그대로 둔다(도감 등 의존). 메인화면 호출만 `noPot:true`로.
- self-test 케이스 `pots: visual separation`·`accent`는 계속 통과해야 한다.

---

### Task 0: 격리 워크트리 준비

**Files:** 없음(환경 준비).

- [ ] **Step 1: 현재 브랜치·커밋 확인**

Run:
```bash
git rev-parse --abbrev-ref HEAD && git log --oneline -1
```
Expected: `feat/plant-pot-separation` / `a6db712 docs(#12)...`

- [ ] **Step 2: OneDrive 밖에 워크트리 생성**

Run:
```bash
git worktree add C:/dev/pulloseum-pot feat/plant-pot-separation
```
Expected: `Preparing worktree ... HEAD is now at a6db712`

- [ ] **Step 3: 워크트리가 깨끗한지 확인(남의 미커밋 변경 없음)**

Run:
```bash
git -C C:/dev/pulloseum-pot status --short
```
Expected: 출력 없음(clean). 이후 모든 편집은 `C:/dev/pulloseum-pot/index.html`에 한다.

---

### Task 1: `potVisual()` → 등급별 픽셀아트 화분 재작성

**Files:**
- Modify: `C:/dev/pulloseum-pot/index.html` — `potVisual` 함수(현 ~9280) 및 바로 위에 빌더·데이터 추가.

**Interfaces:**
- Produces: `pixelArt(rows, pal, cell, ox, oy) -> string`(rect 문자열), `POT_PIXELS`(potId→{rows,pal}), `potVisual(potId, size) -> string`(`<svg…>` 또는 `<img…>`).
- Consumes: `POT_CATALOG`, `POT_SPRITE_OVERRIDES`(기존).

- [ ] **Step 1: 픽셀 빌더 + 화분 데이터 추가**

`potVisual` 함수 정의 **바로 위**에 삽입:

```javascript
/* ASCII 그리드 → 픽셀 rect. 공백/'.'=투명, 그 외 문자는 pal에서 색을 찾아 가로런 병합 rect로 출력. */
function pixelArt(rows, pal, cell, ox, oy){
  let out = '';
  for(let r=0; r<rows.length; r++){
    const row = rows[r];
    let c = 0;
    while(c < row.length){
      const ch = row[c];
      if(ch===' ' || ch==='.' || !pal[ch]){ c++; continue; }
      let run = 1;
      while(c+run < row.length && row[c+run]===ch) run++;
      out += `<rect x="${ox+c*cell}" y="${oy+r*cell}" width="${run*cell}" height="${cell}" fill="${pal[ch]}"/>`;
      c += run;
    }
  }
  return out;
}
/* 등급별 픽셀 화분(나무 도트 톤). 14열×9행 권장, cell=5, ox=25, oy=94 → 입구≈y96·바닥≈y139·중심 x=60. */
const POT_PIXELS = {
  pot_terra: { // 테라코타(기본) — 메인화면 빈 화분 기준
    pal:{ T:'#c87b48', t:'#b5673a', d:'#934e29', D:'#7d3f20', r:'#cd8350' },
    rows:[
      "  TTTTTTTTTT  ",
      " rrrrrrrrrrrr ",
      "  tttttttttt  ",
      "  Ttttttttd  .",
      "  Ttttttttd  .",
      "  Ttttttttd  .",
      "   Tttttdd   .",
      "   DDDDDDDD   ",
      "    DDDDDD    ",
    ],
  },
  pot_ceramic: { // 도자기 — 초록 유약
    pal:{ G:'#8fe89a', g:'#5fd56a', d:'#37a347', D:'#2c7d39', r:'#aff0b6' },
    rows:[
      "  GGGGGGGGGG  ",
      " rrrrrrrrrrrr ",
      "  gggggggggg  ",
      "  Gggggggggd  ",
      "  Gggggggggd  ",
      "  Gggggggggd  ",
      "   Gggggddd   ",
      "   DDDDDDDD   ",
      "    DDDDDD    ",
    ],
  },
  pot_glass: { // 유리 — 반투명 하늘색 + 안쪽 흙·수면
    pal:{ L:'#bdecff', l:'#7fd4f5', w:'#4ac6ff', s:'#6b4a30', d:'#2f8fc0', D:'#1f6f99' },
    rows:[
      "  LLLLLLLLLL  ",
      " LllllllllllL ",
      "  Llllllllld  ",
      "  Lwwwwwwwwd  ",
      "  Lwwwwwwwwd  ",
      "  Lssssssssd  ",
      "   Lssssddd   ",
      "   DDDDDDDD   ",
      "    DDDDDD    ",
    ],
  },
  pot_crystal: { // 크리스탈 — 각진 보라 결정 + 광택
    pal:{ P:'#e0c8ff', p:'#b98cff', v:'#9b6bff', d:'#7a4ad0', D:'#5a32a0' },
    rows:[
      "  P.P.P.P.P.  ",
      " ppppppppppp  ",
      "  Ppppppppvd  ",
      "  PppppppvvD  ",
      "  Ppppppvvvd  ",
      "   Pppvvvvd   ",
      "   ppvvvvD    ",
      "    DvvvD     ",
      "     DDD      ",
    ],
  },
  pot_gold: { // 황금 — 금빛 + 왕관 테두리
    pal:{ Y:'#ffe7a0', y:'#ffc24a', o:'#ff9a3c', d:'#d4730a', D:'#9c5208', k:'#ffd24a' },
    rows:[
      " k.k.kk.k.k.k ",
      " kkkkkkkkkkkk ",
      "  YYYYYYYYYY  ",
      "  Yyyyyyyyod  ",
      "  Yyyyyyyyod  ",
      "  Yyyyyyyyod  ",
      "   Yyyyoodd   ",
      "   DDDDDDDD   ",
      "    DDDDDD    ",
    ],
  },
};
```

- [ ] **Step 2: `potVisual` 본문 교체**

기존 `potVisual`(매끈한 SVG 생성부 전체)을 아래로 교체:

```javascript
/* 화분 종류별 픽셀 레이어(식물과 동일 120x140 viewBox 정렬). PNG 교체 훅=POT_SPRITE_OVERRIDES. */
function potVisual(potId, size){
  size = size || 78;
  const h = Math.round(size*140/120);
  if(POT_SPRITE_OVERRIDES[potId]){
    return `<img src="${POT_SPRITE_OVERRIDES[potId]}" width="${size}" height="${h}" alt="" style="object-fit:contain;display:block"/>`;
  }
  const art = POT_PIXELS[potId] || POT_PIXELS.pot_terra;
  const body = pixelArt(art.rows, art.pal, 5, 25, 94);
  return `<svg width="${size}" height="${h}" viewBox="0 0 120 140" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
```

- [ ] **Step 3: preview 주입 검증(self-test + 5종 렌더)**

primary preview 페이지에 워크트리 함수를 주입해 검증(워크트리는 preview가 직접 서빙 안 함 → 주입 방식). preview가 떠 있지 않으면 `preview_start`.

`preview_eval`로 실행(Task1의 `pixelArt`/`POT_PIXELS`/`potVisual` 정의 문자열을 그대로 eval한 뒤):
```javascript
// (위 3개 정의를 eval로 주입한 다음)
const ids = ['pot_terra','pot_ceramic','pot_glass','pot_crystal','pot_gold'];
JSON.stringify(ids.map(id => {
  const s = potVisual(id, 78);
  return { id, hasSvg: s.indexOf('<svg')>=0, rects: (s.match(/<rect/g)||[]).length };
}));
```
Expected: 5종 모두 `hasSvg:true`, `rects` > 8.

- [ ] **Step 4: self-test 통과 확인**

`preview_eval`:
```javascript
JSON.stringify(window.__catalogSelfTest())
```
Expected: 반환 객체의 fails 배열 비어 있음(특히 `pots: visual separation` 통과). 실패 시 그 메시지로 수정.

- [ ] **Step 5: 커밋**

```bash
git -C C:/dev/pulloseum-pot add index.html
git -C C:/dev/pulloseum-pot commit -m "feat(#12): potVisual 등급별 픽셀 화분 재작성 + pixelArt 빌더"
```

---

### Task 2: 메인화면(`renderCenter`) 식물/화분 분리

**Files:**
- Modify: `C:/dev/pulloseum-pot/index.html` — `renderCenter`(~9606), `.plant-stage` 영역 CSS(~1979).

**Interfaces:**
- Consumes: `composePlantSvg`, `potVisual`, `ensureNurseryFields`, `seedTypeOf`, `plantDisplayName`, `calcStats`.

- [ ] **Step 1: CSS — 2레이어 스택 클래스 추가**

`.empty-pot` 정의(~1991) 바로 뒤(`</style>` 직전)에 추가:
```css
/* 메인화면 식물/화분 2레이어 분리(흔들림 없음·정적) */
.pp-stack{position:relative;display:inline-block;line-height:0;}
.pp-stack .pp-pot,.pp-stack .pp-plant{position:absolute;left:0;bottom:0;line-height:0;}
.pp-stack .pp-pot{z-index:1;}
.pp-stack .pp-plant{z-index:2;}
.pp-stack .pp-spacer{visibility:hidden;}
```

- [ ] **Step 2: JS — 활성 식물 분기 교체**

`renderCenter`에서 활성 식물 `box.innerHTML`의 `<div class="plant-stage">${spriteFor(p,150)}<span class="wood-stool"></span></div>` 줄을 교체:
```javascript
  ensureNurseryFields(p);
  const ppSize = 150;
  const ppPot = potVisual(p.nursery.potId, ppSize);
  const ppPlant = composePlantSvg(seedTypeOf(p), p.growth_stage||'mature', p.element||'grass',
    { size:ppSize, grade:p.grade, awakened:p.awakened, noPot:true, form:p.form });
  box.innerHTML = `
    <div class="plant-stage"><span class="pp-stack"><span class="pp-spacer">${ppPot}</span><span class="pp-pot">${ppPot}</span><span class="pp-plant">${ppPlant}</span></span><span class="wood-stool"></span></div>
    <div class="pname">${plantDisplayName(p)}</div>
    <div class="hint">▲ 식물을 탭하면 관리할 수 있어요</div>`;
```
(`pp-spacer`는 스택이 부모에 크기를 주도록 같은 화분 SVG를 숨겨 깔아둔다. `#centerPlant svg` 폭 규칙이 자식 SVG에 적용되어 정렬됨.)

- [ ] **Step 3: JS — 빈 상태 분기 교체**

`renderCenter`의 빈 분기 `box.innerHTML`을 교체:
```javascript
    box.innerHTML = `
      <div class="plant-stage"><span class="pp-stack"><span class="pp-spacer">${potVisual('pot_terra',150)}</span><span class="pp-pot">${potVisual('pot_terra',150)}</span></span><span class="wood-stool"></span></div>
      <div class="pname">빈 화분</div>
      <div class="hint">▲ 화분을 탭해 종자를 심어보세요</div>`;
```

- [ ] **Step 4: preview 시각 검증**

`preview_eval`로 위 `renderCenter` 새 정의를 주입 후 활성 식물/빈 상태 각각 렌더해 DOM 확인:
```javascript
JSON.stringify({
  hasStack: !!document.querySelector('#centerPlant .pp-stack'),
  potSvgs: document.querySelectorAll('#centerPlant .pp-pot svg, #centerPlant .pp-pot img').length,
  plant: document.querySelectorAll('#centerPlant .pp-plant svg').length
});
```
Expected: 식물 있을 때 `hasStack:true, potSvgs:1, plant:1`. `preview_screenshot`이 가능하면 캡처(애니메이션 타임아웃 시 생략).

- [ ] **Step 5: 커밋**

```bash
git -C C:/dev/pulloseum-pot add index.html
git -C C:/dev/pulloseum-pot commit -m "feat(#12): 메인화면 식물/화분 2레이어 분리(정적)"
```

---

### Task 3: 빈/잠긴 화분 자산 통일

**Files:**
- Modify: `C:/dev/pulloseum-pot/index.html` — `renderNurseryGrid`(~11818, ~11822).

- [ ] **Step 1: 잠긴 슬롯 교체**

`renderNurseryGrid`의 locked 분기에서 `<div class="pot-vessel"></div>`를 교체:
```javascript
        html += `<div class="pot-slot locked"><div class="pot-stack"><span class="pot-layer">${potVisual('pot_terra',78)}</span></div><div class="lock-badge"><span class="lb-ic" data-pic="gear" data-size="18px"></span></div><div class="pot-name">잠긴 화분</div><div class="pot-stage">Lv.${lvNeed} 해금</div></div>`;
```

- [ ] **Step 2: 빈 슬롯 교체**

empty 분기:
```javascript
        html += `<div class="pot-slot empty"><div class="pot-stack"><span class="pot-layer">${potVisual('pot_terra',78)}</span></div><div class="pot-name">빈 화분</div><div class="pot-stage">식물 없음</div></div>`;
```

- [ ] **Step 3: CSS — 잠긴 슬롯 회색 처리를 새 구조에 유지**

`.pot-slot.locked .pot-vessel` 규칙(~1440)을 교체:
```css
.pot-slot.locked .pot-stack{filter:grayscale(.85) brightness(.4);opacity:.6;}
```

- [ ] **Step 4: preview 검증**

`preview_eval`로 `renderNurseryGrid` 주입 후:
```javascript
renderNurseryGrid();
JSON.stringify({
  emptyPots: document.querySelectorAll('#nurseryGrid .pot-slot.empty .pot-layer svg').length,
  lockedPots: document.querySelectorAll('#nurseryGrid .pot-slot.locked .pot-layer svg').length
});
```
Expected: 빈·잠긴 슬롯에 각각 `.pot-layer svg` 1개 이상.

- [ ] **Step 5: 커밋**

```bash
git -C C:/dev/pulloseum-pot add index.html
git -C C:/dev/pulloseum-pot commit -m "feat(#12): 빈/잠긴 화분을 potVisual 픽셀팟으로 통일"
```

---

### Task 4: 양육 흔들림 — 화분 고정 + 식물만 좌우

**Files:**
- Modify: `C:/dev/pulloseum-pot/index.html` — `.pot-stack .plant-layer` 애니메이션·keyframe(~1473).

- [ ] **Step 1: 좌우 흔들림 keyframe + 적용**

`.pot-stack .plant-layer` 규칙(~1473)과 그 아래 `@keyframes potSway`(~1474, 회전판)를 교체:
```css
.pot-stack .plant-layer{position:absolute;left:0;bottom:0;z-index:2;line-height:0;transform-origin:50% 88%;animation:plantSwaySide 3.4s ease-in-out infinite;}
@keyframes plantSwaySide{0%,100%{transform:translateX(-3px);}50%{transform:translateX(3px);}}
```
(주의: `.pot-sprite`가 참조하는 ~1448의 `@keyframes potSway`는 건드리지 않는다. 양육 `.pot-stack`만 새 keyframe을 쓴다.)

- [ ] **Step 2: preview 검증**

`preview_eval`:
```javascript
const pl = document.querySelector('#nurseryGrid .pot-stack .plant-layer');
pl ? getComputedStyle(pl).animationName : 'no-plant';
```
Expected: `plantSwaySide`(식물 있는 슬롯이 있을 때). 화분 레이어는 애니메이션 없음 확인:
```javascript
const pot = document.querySelector('#nurseryGrid .pot-stack .pot-layer');
pot ? getComputedStyle(pot).animationName : 'n/a';
```
Expected: `none`.

- [ ] **Step 3: 커밋**

```bash
git -C C:/dev/pulloseum-pot add index.html
git -C C:/dev/pulloseum-pot commit -m "feat(#12): 양육 식물 좌우 흔들림(화분 고정)"
```

---

### Task 5: 최종 검증 · 문서 갱신 · 통합

**Files:**
- Modify: `C:/dev/pulloseum-pot/docs/CHANGELOG.md`(맨 위 항목), `docs/master-roadmap.md`(해당 항목 상태).

- [ ] **Step 1: 전체 self-test 통과 확인**

`preview_eval`로 최종 `index.html`(워크트리)을 서빙하거나 변경 전부 주입 후:
```javascript
JSON.stringify(window.__catalogSelfTest())
```
Expected: fails 배열 비어 있음.

- [ ] **Step 2: 3개 화면 시각 확인**

메인화면(식물 있음/없음)·양육 그리드(채움/빈/잠김)·양육 상세 각각 `preview_eval` DOM 확인(또는 가능 시 `preview_screenshot`). 화분 교체 반영 확인:
```javascript
// 활성 식물 화분을 황금으로 바꿔 메인화면이 바뀌는지
const p = activePlant(); if(p){ ensureNurseryFields(p); p.nursery.potId='pot_gold'; renderCenter(); }
document.querySelector('#centerPlant .pp-pot svg') ? 'pot-rendered' : 'none';
```
Expected: `pot-rendered`(그리고 황금 픽셀 팔레트 색이 보임).

- [ ] **Step 3: 문서 갱신**

`docs/CHANGELOG.md` 맨 위에 항목 추가(날짜 2026-06-25, 식물·화분 도트 분리/등급별 픽셀 화분/양육 좌우 흔들림 요약). `docs/master-roadmap.md`의 #12 관련 상태/체크 갱신. 단, primary 트리에서 다른 세션이 master-roadmap을 미커밋 편집 중이므로 **워크트리의 master-roadmap만 수정**한다.

- [ ] **Step 4: 문서 커밋**

```bash
git -C C:/dev/pulloseum-pot add docs/CHANGELOG.md docs/master-roadmap.md
git -C C:/dev/pulloseum-pot commit -m "docs(#12): 식물·화분 분리 작업 로그·로드맵 갱신"
```

- [ ] **Step 5: 통합 결정(finishing-a-development-branch)**

`feat/plant-pot-separation`을 어디에 합칠지는 다른 세션의 미커밋 작업과 충돌 여부를 보고 사용자와 결정한다(FF push vs PR vs 대기). 워크트리 정리: `git worktree remove C:/dev/pulloseum-pot` → `git worktree prune`.

## Self-Review

**Spec coverage:**
- 변경1 `potVisual` 픽셀 재작성 → Task 1 ✔
- 변경2 메인화면 분리 → Task 2 ✔
- 변경3 빈/잠긴 통일 → Task 3 ✔
- 변경4 양육 좌우 흔들림(메인 정적) → Task 4 + Task 2(메인 무애니메이션) ✔
- 검증(self-test·3화면·교체 반영) → Task 1/5 ✔
- 문서 갱신 → Task 5 ✔

**Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. 픽셀 그리드 미세 외형은 preview에서 육안 조정(기능 아닌 시각 폴리시).

**Type consistency:** `pixelArt(rows,pal,cell,ox,oy)`·`POT_PIXELS[id]={rows,pal}`·`potVisual(potId,size)` 시그니처가 Task 1 정의와 Task 2/3 호출에서 일치. CSS 클래스 `.pp-stack/.pp-pot/.pp-plant/.pp-spacer`(메인), `.pot-stack/.pot-layer/.plant-layer`(양육) 구분 일관.
