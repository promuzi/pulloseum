# 전투 UI 개편 구현 플랜 (2026-06-25)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 또는 superpowers:executing-plans 로 태스크별 실행. 체크박스(`- [ ]`)로 추적.

**Goal:** 전투 화면을 포켓몬식 고정 레이아웃(식물 상단·스킬 하단 고정) + 간결 판정 연출(상단 흐림, 상성 한 줄, 동시 효과, 순간형 상태 VFX, 카드 앞면 3단 + 꾹→뒤집기)로 개편한다.

**Architecture:** 접근 A — 기존 DOM 골격 재사용. `#cardPhase`(스킬 그리드)를 하단 고정 풋바로, `#judgeWindow`를 식물 위 판정 오버레이로 역할 변경. `playerSkill`/`openJudge` 타이밍·메시지 로직 재배선. 신규는 최소(`spriteFx`, flip CSS, 블러 레이어, 카드 앞면 3단).

**Tech Stack:** 바닐라 HTML/CSS/JS 단일 `index.html`. 빌드 없음. 검증 = preview 서버 + `window.__catalogSelfTest()`.

**설계 출처:** [docs/superpowers/specs/2026-06-25-battle-ui-redesign-design.md](../specs/2026-06-25-battle-ui-redesign-design.md)

## Global Constraints

- **단일 파일:** 모든 편집은 `index.html` 한 파일. 데이터/CSS/JS 인라인.
- **⚠️ 병렬 세션:** 다른 세션이 같은 main에서 종/스킬(`SPECIES_CATALOG`~3300, `SKILL_LIB`~4300)을 동시 편집 중 → **반드시 worktree 격리**(`feat/battle-ui-redesign`)에서 작업, 머지로 합침. **라인 번호 신뢰 금지** — 함수명·앵커 문자열로 위치 지정. 커밋은 `git add index.html` 등 **선택 스테이징만**(`git add -A` 금지).
- **테스트 러너 없음:** "테스트" = preview에서 `preview_eval`로 DOM·반환값 확인 + `window.__catalogSelfTest()` 반환 `fails` 배열로 회귀 판정. 스크린샷은 배경 애니로 타임아웃 잦으니 `preview_eval` 우선.
- **preview:** 정적 서버(HMR 없음). 수정 후 `location.reload()`, 안 풀리면 `preview_stop`+`preview_start`. **worktree의 `.claude/serve.ps1`**으로 서빙(`$PSScriptRoot` 기준).
- **밸런스 불변:** 데미지 공식·`applySkill` 수치 로직은 건드리지 않음 — 연출/표시만 개편.
- **회귀:** 매 태스크 후 `window.__catalogSelfTest()` 반환값에 새 실패 없는지 확인.

---

## Task 0: worktree 격리 + 플랜 커밋

**Files:** (없음 — 환경 설정)

- [ ] **Step 1: worktree 생성**

REQUIRED SUB-SKILL: superpowers:using-git-worktrees. 별도 폴더 + 브랜치:
```bash
git worktree add ../pulloseum-battleui -b feat/battle-ui-redesign
```
이후 모든 편집·preview·커밋은 `../pulloseum-battleui` 트리에서. (현재 폴더는 다른 세션이 main으로 사용 중)

- [ ] **Step 2: 플랜 문서를 feature 브랜치로 가져오기**

플랜/스펙은 이미 main에 커밋됨(`d01a658`). worktree는 그 위(`b24dcbc`)에서 분기되므로 자동 포함. 확인:
```bash
git -C ../pulloseum-battleui log --oneline -3
```
Expected: `d01a658 docs(#?): 전투 UI 스펙 보강…`이 조상에 보임.

- [ ] **Step 3: preview 서버 worktree로 기동**

worktree의 `.claude/serve.ps1` 실행(포트 8765). `preview_start`로 등록. 게임 정상 로딩 확인.

---

## Task 1: battleViewBtn 폐지 + 스킬바 상시 고정 토대

스킬을 매 턴 show/hide 하던 구조를 걷어내고, 전투 동안 하단에 상주시키는 토대를 만든다. 연출(흐림·VFX)은 후속 태스크.

**Files:**
- Modify: `index.html` — `#battleScreen` 마크업(`battleViewBtn` 제거), `toggleBattleView`/`B.view`/`showBattleField`/`renderBattleIdleView`/`updateBattleHud`(view 분기), `showCardPhase`/`hideCardPhase` 호출부, `startMatch`.

**Interfaces:**
- Produces: `refreshSkillBar()` — 하단 스킬바를 현재 상태로 (재)렌더하고 각 카드의 불 켜짐/꺼짐(`B.busy||B.over`면 전체 꺼짐, 아니면 `skillUnusable`로 개별)을 적용. `playerSkill`·턴 종료·`startMatch`에서 호출.

- [ ] **Step 1: `battleViewBtn` 마크업 제거**

`#battleScreen` 안의 `<button class="battle-view-btn" id="battleViewBtn" …>스킬 숨기기</button>` 줄 삭제.

- [ ] **Step 2: view 토글 로직 제거**

함수 `toggleBattleView` 삭제. `updateBattleHud`에서 `battleViewBtn` 참조 블록 삭제. `showBattleField` 삭제(또는 빈 함수화 후 호출부 제거). `B.view`/`B.view==='hidden'` 분기 전부 제거. `battleViewBtn` 이벤트 바인딩(있으면) 제거.

- [ ] **Step 3: `renderBattleIdleView`를 스킬바 갱신으로 단순화**

기존 view 분기(`if(B.view==='hidden') showBattleField(); else showCardPhase();`)를 →
```js
function renderBattleIdleView(){
  if(!B || B.over || B.busy) return;
  updateBattleHud();
  refreshSkillBar();
}
```

- [ ] **Step 4: `showCardPhase`→`refreshSkillBar`로 분리**

`showCardPhase`의 렌더 로직(에너지 pips, `#cardHand`=일반, `#cardPred`=변이, `bindSkillCards`)을 `refreshSkillBar()`로 옮기고, 매 턴 떠오르는 애니(`spread`/`dealing`/`closing` 클래스 토글)는 제거. `#cardPhase`는 전투 시작 시 `show`되어 상주. `hideCardPhase`는 전투 종료 시 1회만(또는 결과 화면에서) 호출.

각 카드 불 상태: `skillCardHtml`이 이미 `skillUnusable`로 `disabled` 부여. `refreshSkillBar`에서 `B.busy||B.over`면 컨테이너에 `.locked` 클래스(전체 클릭 차단·디밍) 추가.

- [ ] **Step 5: `startMatch`에서 1회 렌더**

`startMatch` 끝에 `refreshSkillBar()` 호출(스킬바 상주 시작). `['#cardPhase',…].forEach(hide)` 초기화 목록에서 `#cardPhase` 제외(상주해야 함) — 단 결과/시작 전엔 숨김 유지하도록 `#battleScreen` 표시 시점에 맞춰 조정.

- [ ] **Step 6: 검증**

preview reload 후 `preview_eval`:
```js
B && B.view  // undefined 여야 함(분기 제거됨)
document.getElementById('battleViewBtn')  // null
document.querySelectorAll('#cardPhase .skillcard').length  // >0 (상주)
```
전투 1턴 진행 → 카드가 사라졌다 나타나지 않고 계속 보이는지 확인. `window.__catalogSelfTest()` 반환 `fails`에 새 실패 없음.

- [ ] **Step 7: 커밋**
```bash
git add index.html
git commit -m "feat(#13): 전투 스킬바 상시 고정 토대 — view 토글 폐지·refreshSkillBar 분리"
```

---

## Task 2: 하단 고정바 CSS + 식물/상태바 좌우 대각 배치

**Files:**
- Modify: `index.html` — `.cp-stack`/`.cp-hand`/`.cp-pred`/`.cp-energy` CSS, `#cardPhase` 위치, `.arena-fighter`/`.finfo`/`.fsprite` 정렬 CSS.

- [ ] **Step 1: `#cardPhase`를 하단 고정 풋바로**

`#cardPhase` CSS를 오버레이(중앙 absolute)에서 전투 화면 하단 고정으로 변경. `.cp-stack` `max-height:68vh` → 하단 풋바 높이에 맞게 축소. `position` 풋바(예: `#battleScreen` flex 칼럼의 마지막 항목 또는 `position:absolute;bottom:0;left:0;right:0`). 식물 무대(`#battleArena`)는 그 위 영역을 차지.

- [ ] **Step 2: 불 꺼짐/켜짐 스타일**

`.skillcard:disabled`(이미 존재: opacity .4 grayscale) 유지 = 불 꺼짐. `#cardPhase.locked .skillcard`(판정 중 전체 잠금) = `pointer-events:none; opacity:.5`. 사용 가능 카드엔 은은한 발광(테두리 `--gc` glow) 추가해 "불 들어옴" 느낌.

- [ ] **Step 3: 식물/상태바 좌우 대각 정렬**

목표: 적 = 상태바 좌·식물 우 / 나 = 식물 좌·상태바 우. 현재 DOM 순서(`#enemyFighter`=finfo→fsprite, `#playerFighter`=fsprite→finfo)가 이미 일치 → `.arena-fighter`를 `display:flex; flex-direction:row; align-items:center`로, 적/나 각각 `justify-content` 및 폭 배분 확인. 어긋나면 `.arena-fighter.enemy`/`.player`에 정렬 보정.

- [ ] **Step 4: 검증**

preview `preview_eval`:
```js
getComputedStyle(document.getElementById('cardPhase')).position  // fixed/absolute (풋바)
const ef=document.getElementById('enemyFighter').getBoundingClientRect();
const es=document.getElementById('eSpriteBox').getBoundingClientRect();
const ei=document.querySelector('#enemyFighter .finfo').getBoundingClientRect();
es.left > ei.left  // 적: 식물(sprite)이 상태바(finfo)보다 우측 → true
const ps=document.getElementById('pSpriteBox').getBoundingClientRect();
const pi=document.querySelector('#playerFighter .finfo').getBoundingClientRect();
ps.left < pi.left  // 나: 식물이 상태바보다 좌측 → true
```

- [ ] **Step 5: 커밋**
```bash
git add index.html
git commit -m "feat(#13): 하단 고정 스킬바 CSS + 식물/상태바 좌우 대각 배치"
```

---

## Task 3: 카드 앞면 3단 재구성 (이름/아이콘/분류칩+비용)

**Files:**
- Modify: `index.html` — `skillCardHtml`, `.skillcard`/`.sc-top`/`.sc-name`/`.sc-desc`/`.sc-cost` CSS. 신규 분류칩 헬퍼 또는 `skillCatChipsHtml` 재사용.

**Interfaces:**
- Consumes: `skillCatChipsHtml(sk)`+`CAT_META`(분류 아이콘), `ELEMENTS[elem]`(속성 아이콘), `moveCostLabel(s,unit)`(비용), `battleSkillGrade`+`gradeColor`(테두리), `displaySkillName`.
- Produces: 카드 하단칩 헬퍼 `battleCardFootChips(s)` — `cats`칩 + 속성칩(`s.elem`) + 독계열칩(`s.dot`/`s.infuse`의 kind) 합친 HTML.

- [ ] **Step 1: `battleCardFootChips(s)` 작성**
```js
function battleCardFootChips(s){
  let html = skillCatChipsHtml(s) || '';
  if(s.elem){ const el=ELEMENTS[s.elem]; if(el) html += `<span class="cat-chip" style="--cc:${el.color}" title="${el.name}">${el.icon}</span>`; }
  const dk = (s.dot&&s.dot.kind) || (s.infuse&&s.infuse.kind);
  if(dk){ const ic = dk==='poison'?'🟣':dk==='bleed'?'🩸':dk==='burn'?'🔥':''; if(ic) html += `<span class="cat-chip" title="${dotName?dotName(dk):dk}">${ic}</span>`; }
  return `<div class="sc-chips">${html}</div>`;
}
```
(`ELEMENTS[elem]`의 실제 필드명 `color`/`icon`/`name`은 정의부 확인 후 맞춤.)

- [ ] **Step 2: `skillCardHtml` 3단으로 교체**
```js
function skillCardHtml(id, pred){
  const s = skillById(id, B.p) || { name:id, icon:'❔', cost:0 };
  const g = battleSkillGrade(B.p, id), col = gradeColor(g);
  const dis = skillUnusable(B.p, id) ? ' disabled' : '';
  const cost = moveCostLabel(s, B.p);
  return `<button class="skillcard${pred?' pred':''}${dis}" style="--gc:${col}" data-skill="${id}"${dis}>
    <div class="sc-name">${displaySkillName(s.name)}</div>
    <div class="sc-icon">${s.icon||'❔'}</div>
    <div class="sc-foot">${battleCardFootChips(s)}<span class="sc-cost">${cost}</span></div>
  </button>`;
}
```

- [ ] **Step 3: CSS — 3단 세로 정렬**

`.skillcard`를 `display:flex; flex-direction:column; align-items:center; justify-content:space-between`. `.sc-name`(상, 작은 볼드 말줄임), `.sc-icon`(중, 큰 이모지 ~26px), `.sc-foot`(하, flex row, 칩 + 우측 비용). 기존 `.sc-top`/`.sc-desc` 규칙 제거 또는 무시. `.pred`(변이) 카드도 동일 3단으로(기존 row 레이아웃 제거).

- [ ] **Step 4: 검증**
```js
// 전투 진입 후
const c=document.querySelector('#cardPhase .skillcard');
c.querySelector('.sc-name') && c.querySelector('.sc-icon') && c.querySelector('.sc-foot')  // 모두 존재
c.querySelector('.sc-desc')  // null (설명 제거됨)
```
육안: 이름(상)/아이콘(중)/칩+비용(하) 보이는지. `__catalogSelfTest()` 회귀 없음.

- [ ] **Step 5: 커밋**
```bash
git add index.html
git commit -m "feat(#13): 전투 카드 앞면 3단(이름/아이콘/분류칩+비용) 미니멀화"
```

---

## Task 4: 꾹 누르기 → 카드 뒤집기 상세

**Files:**
- Modify: `index.html` — `#battleSkillDetail`/`.bsd-card` CSS(flip 트랜지션), `showSkillDetail`(내용 유지). 트리거는 기존 `bindSkillCards` 롱프레스(480ms) 그대로.

- [ ] **Step 1: flip 연출 CSS**

`#battleSkillDetail` 표시 시 뒷면 카드가 **확대 + rotateY**로 뒤집혀 나오는 키프레임 추가. 예:
```css
#battleSkillDetail .bsd-card{ transform-style:preserve-3d; animation:cardFlipIn .34s cubic-bezier(.2,.7,.3,1) both; }
@keyframes cardFlipIn{ from{ transform:perspective(700px) rotateY(90deg) scale(.7); opacity:0; } to{ transform:perspective(700px) rotateY(0) scale(1); opacity:1; } }
```
배경 살짝 어둡게(기존 오버레이 유지). 아무 곳 탭하면 닫힘(기존 동작).

- [ ] **Step 2: 내용 확인**

`showSkillDetail`은 이름·비용·태그·`skillCoefDesc`(계수 포함 전체 설명) 그대로 = "자세한 데미지 계수"가 뒷면. 변경 불필요. (앞면에서 desc를 뺐으므로 이게 유일한 상세 경로 — 정상.)

- [ ] **Step 3: 검증**
```js
// 카드 롱프레스 시뮬은 어려우니 직접 호출
showSkillDetail(document.querySelector('#cardPhase .skillcard').dataset.skill);
!document.getElementById('battleSkillDetail').classList.contains('hidden')  // true
document.querySelector('#battleSkillDetailCard .bsd-desc')  // 계수 설명 존재
```
육안: 뒤집히며 나오는 연출. 탭하면 닫힘.

- [ ] **Step 4: 커밋**
```bash
git add index.html
git commit -m "feat(#13): 스킬 카드 꾹→뒤집기 상세 연출"
```

---

## Task 5: 상태 VFX (순간형, 스프라이트 위)

**Files:**
- Modify: `index.html` — 신규 `spriteFx`, `.sprite-fx-*` CSS 키프레임, `applySkill`/`tickStatuses`에서 트리거.

**Interfaces:**
- Produces: `spriteFx(side, kind)` — `side`('p'|'e')의 스프라이트 박스(`#pSpriteBox`/`#eSpriteBox`) 위에 `kind`별 VFX 엘리먼트를 1회 띄웠다 제거. kind: `'shield'`(코팅막)·`'shieldBreak'`(갈라짐)·`'poison'`·`'burn'`·`'bleed'`·`'buff'`·`'debuff'`.

- [ ] **Step 1: `spriteFx` 작성**
```js
function spriteFx(side, kind){
  const box = side==='p' ? $('#pSpriteBox') : $('#eSpriteBox');
  if(!box) return;
  const fx = document.createElement('span');
  fx.className = 'sprite-fx fx-'+kind;
  box.appendChild(fx);
  setTimeout(()=>fx.remove(), kind==='shield'?700:600);
}
```

- [ ] **Step 2: CSS 키프레임**

`.sprite-fx{position:absolute;inset:0;pointer-events:none;z-index:5;}` + kind별:
- `.fx-shield` — 금속 코팅막 번쩍(은회색 그라데이션 테두리 펄스).
- `.fx-shieldBreak` — 막이 쩍 갈라지는 크랙(흰 섬광 + 조각).
- `.fx-poison` — 보라색 전체 한 번 번쩍 후 페이드.
- `.fx-burn` — 하단에서 불꽃 솟구침.
- `.fx-bleed` — 붉은 방울 튐.
- `.fx-buff` — 상승 화살/오라(상향 이동 + 청록 글로우).
- `.fx-debuff` — 하강 그림자(하향 + 어두워짐).

- [ ] **Step 3: 트리거 연결**

`applySkill` 내 효과 적용 지점에서: 피해 입힐 때 데미지계열 dot 부여 시 해당 kind, 방어/보호막 부여 시 `'shield'`, 보호막이 0으로 소진되는 순간 `'shieldBreak'`, 버프/디버프 부여 시 `'buff'`/`'debuff'`. `tickStatuses`의 지속피해(독/화상/출혈) 적용 시 해당 kind 번쩍. **순간형만** — 지속 표시는 기존 `statusTags` 아이콘 유지(변경 없음).

- [ ] **Step 4: 검증**
```js
spriteFx('p','poison'); document.querySelector('#pSpriteBox .fx-poison')  // 존재(곧 사라짐)
spriteFx('e','shield'); document.querySelector('#eSpriteBox .fx-shield')  // 존재
```
전투에서 독/방어 스킬 사용 시 번쩍 확인. `__catalogSelfTest()` 회귀 없음.

- [ ] **Step 5: 커밋**
```bash
git add index.html
git commit -m "feat(#13): 순간형 상태 VFX(독·화상·출혈·방어막·버프/디버프)"
```

---

## Task 6: 판정 오버레이 재배선 (핵심)

매 턴 카드가 좌우로 등장 + 상단 흐림 → 선공/후공 순서로 카드 안쪽에 상성 한 줄 → 흐림 해제 + 동시 효과 적용. 순차 메시지 폐지.

**Files:**
- Modify: `index.html` — `#judgeWindow`/`#judgeCards`/`.jw-card`/`.jw-order`/`#judgeMessage` CSS·마크업, `openJudge`, `closeJudge`, `playerSkill`, `setJudgeOrder`, `showJudgeMessage`, `showEffectMessages`(폐지), `animateJudgeCardUse`. 신규 상단 블러 레이어.

**Interfaces:**
- Consumes: `eff(elemA, elemB)`(상성 배수), `applySkill`(효과 적용), `popup`(데미지 숫자), `spriteFx`(Task 5).
- Produces: `setBlur(on)` — `#battleArena`(식물 무대) 위 블러 레이어 토글. `judgeVerdict(side, attacker, defender)` — 상성 한 줄 텍스트('효과가 굉장하다!'/'평범하다'/'효과가 별로…' + 치명타 병합) 결정·표시(행동 카드 안쪽 위치).

- [ ] **Step 1: 상단 블러 레이어**

`#battleArena`에 블러 오버레이용 자식 또는 클래스. CSS: `#battleArena.blurred .arena-fighter{ filter:blur(3px) brightness(.8); transition:filter .2s; }` (식물·HP만 흐려지고 그 위 `#judgeWindow`는 또렷). `setBlur(on)` = `#battleArena`에 `.blurred` 토글.

- [ ] **Step 2: `#judgeWindow` 카드 좌우 배치 CSS**

`#judgeCards`를 좌(적 카드)·우(내 카드) 양끝 배치(`display:flex; justify-content:space-between`). `.jw-card.foe`=좌, `.jw-card.mine`=우. 카드는 판정 내내 제자리. `#judgeMessage`/`.jw-order`는 행동 카드 **안쪽(중앙쪽)**에 절대배치로 띄움(좌측 카드 행동 시 그 우측, 우측 카드 행동 시 그 좌측).

- [ ] **Step 3: `openJudge` — 좌우 등장 + 블러 ON**

기존 카드 HTML(적/나)을 좌우 배치로 출력. 등장 후 `setBlur(true)`. 식물 분리(`spread`)·중앙 끼움 로직 제거.

- [ ] **Step 4: `judgeVerdict` — 상성 한 줄**
```js
async function judgeVerdict(side, a, d, crit){
  const m = eff(a.element, d.element);
  const txt = m>1 ? '효과가 굉장하다!' : (m<1 ? '효과가 별로…' : '정확히 들어갔다!');
  const tone = m>1?'good':(m<1?'weak':'');
  // 행동 카드 안쪽에 한 줄(치명타면 빨강 '치명타!' 병합)
  showJudgeVerdict(side, txt, tone, crit);
  await sleep(520);
}
```
`showJudgeVerdict(side,txt,tone,crit)` = `#judgeMessage`를 해당 side 카드 안쪽에 위치시키고 표시.

- [ ] **Step 5: `playerSkill` 시퀀스 재배선**

기존 순차 흐름을 →
1. `B.busy=true; refreshSkillBar();`(스킬바 잠금)
2. `eId=aiPickSkill(B.e); await openJudge(skillId,eId);`(좌우 등장+블러)
3. 선공 판정(기존 `prioritySide`/`playerFirst` 로직 유지) → `setJudgeOrder`로 짧은 라벨.
4. 순서대로 각 행동:
   - `await judgeVerdict(side, attacker, defender, crit)` (카드 안쪽 한 줄)
   - `setBlur(false)` → `await applySkill(attacker,defender,chosen,side)` (피해·독·버프 **동시** 적용; `applySkill` 내부의 순차 `showEffectMessages` 호출 제거, 데미지 `popup`+`spriteFx`만)
   - 사망 체크 → `finishMatch`
   - 다음 행동 전 `setBlur(true)`(다음 카드 판정용)
5. `tickStatuses` 동시 정리(텍스트 줄 없이 popup+spriteFx) → 에너지+1 → `closeJudge(); setBlur(false); B.turn++; B.busy=false; renderBattleIdleView();`

- [ ] **Step 6: 순차 메시지 폐지**

`showEffectMessages` 호출 전부 제거(함수 자체 삭제 또는 no-op). `applySkill`/`tickStatuses` 내 상태이상 "걸렸다!" 텍스트 줄 → `spriteFx` 번쩍으로 대체. 치명타 별도 줄 → `judgeVerdict` 한 줄에 병합. `animateJudgeCardUse`의 카드 사용 모션은 유지하되 중앙 이동(use-left/right) 대신 제자리 강조로.

- [ ] **Step 7: 검증**

preview에서 전투 1턴 수동 진행하며 확인:
- 카드 탭 → 양쪽 카드 좌(적)·우(나) 등장 + 식물 영역 흐려짐.
- 선공 카드 안쪽에 상성 한 줄 → 흐림 풀리며 데미지 숫자 + VFX.
- 후공 카드 안쪽에 한 줄 → 흐림 풀리며 데미지/VFX.
- 순차 "중독되었다!" 류 텍스트 줄 안 뜸(아이콘/VFX로만).
```js
B.busy  // 판정 중 true, 끝나면 false
document.getElementById('battleArena').classList.contains('blurred')  // 판정 중 true
```
`__catalogSelfTest()` 회귀 없음.

- [ ] **Step 8: 커밋**
```bash
git add index.html
git commit -m "feat(#13): 판정 오버레이 재배선 — 좌우 카드·상단 흐림·상성 한 줄·동시 효과"
```

---

## Task 7: 통합 검증 + 정리 + 문서 갱신

**Files:**
- Modify: `index.html`(잔여 정리), `CLAUDE.md`/`docs/master-roadmap.md`/`docs/CHANGELOG.md`(현행화).

- [ ] **Step 1: 전체 전투 플로우 수동 검증**

예선 1경기 끝까지: 카드 선택→판정→데미지→상태→턴 전환→승/패→결과 화면. 항복도. 데드 케이스(HP 0)에서 흐림/스킬바 잔존 없는지.

- [ ] **Step 2: 셀프테스트 + 콘솔 에러 확인**

`window.__catalogSelfTest()` 반환 `fails` 빈 배열. `preview_console_logs`로 새 에러 없음.

- [ ] **Step 3: 문서 현행화**

스펙 상태 → "구현 완료". `docs/CHANGELOG.md` 맨 위 항목 추가. `master-roadmap.md` 현황·문서지도 갱신. CLAUDE.md "구현된 시스템"의 전투 항목에 새 UI 반영.

- [ ] **Step 4: 커밋(코드+문서 함께)**
```bash
git add index.html docs/CHANGELOG.md docs/master-roadmap.md docs/superpowers/specs/2026-06-25-battle-ui-redesign-design.md CLAUDE.md
git commit -m "docs(#13): 전투 UI 개편 완료 현행화 + 잔여 정리"
```

- [ ] **Step 5: main 머지**

REQUIRED SUB-SKILL: superpowers:finishing-a-development-branch. main 체크아웃 트리에서 `git merge feat/battle-ui-redesign`(3-way). 충돌 시 종/스킬 영역(다른 세션)과 전투 영역이 분리돼 있어 대부분 자동. 머지 후 worktree 정리(`git worktree remove ../pulloseum-battleui` → `git worktree prune` → `git branch -d feat/battle-ui-redesign`).

---

## Self-Review (작성자 점검)

- **스펙 커버리지:** §3 레이아웃→T2, §4.1 스킬바→T1/T2, §4.2 카드앞면→T3, §4.3 뒤집기→T4, §4.4 판정→T6, §4.5 VFX→T5, §4.6 폐지→T1/T6. 전 항목 매핑됨.
- **플레이스홀더:** 코드 스텝에 실제 코드/명령 포함. `ELEMENTS` 필드명 등 "정의부 확인" 표기한 곳은 실행 시 1줄 확인으로 해소(앵커 제공).
- **타입 일관성:** `refreshSkillBar`(T1) · `battleCardFootChips`(T3) · `spriteFx`(T5) · `setBlur`/`judgeVerdict`(T6) 명칭 태스크 간 일치.
- **범위:** 단일 전투 UI 개편 — 적정. 종/스킬은 다른 세션 소관, 건드리지 않음.
