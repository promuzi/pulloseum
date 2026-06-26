# 전투 결정론 시드 + 시간 시드 도입 (서버 준비 씨앗) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미래의 "전투 엔진 서버 재검증"을 싸게 만들기 위해, 지금 전투 난수를 시드 단일 함수 `rng()`로, 방치형 시간 읽기를 단일 함수 `gameNow()`로 깔때기(funnel)화한다. 동작/밸런스는 그대로.

**Architecture:** index.html 단일 파일에 (1) 결정론 PRNG(`makeRng`/`rng`/`seedBattleRng`/`clearBattleRng`)를 추가하고 전투 시작 시 시드를 주입, (2) 전투 **시뮬 경로의** `Math.random()` 호출만 `rng()`로 교체, (3) 방치형 진행(`nurseryTick`)의 시간 출처를 `gameNow()` 한 곳으로 모은다. 큰 리팩터(전투 계산/연출 분리, 보상 서버 이전, 세이브 분리)는 **범위 밖**(서버 착수 시).

**Tech Stack:** 바닐라 JS, 단일 `index.html`, 빌드 없음. 테스트 = `window.__test(name, fn)` + `window.__catalogSelfTest()`(반환 `fails` 배열, fn은 실패 시 `throw`). 회귀 시각검증 = preview(`pullosseum`, 정적·HMR 없음 → 수정 후 `location.reload()`).

## Global Constraints

- **단일 파일·빌드 없음:** 모든 변경은 `index.html` 인라인. 외부 의존성 추가 금지.
- **결정론 규율(CLAUDE.md 하드 지침):** 전투 시뮬 난수는 `rng()` 하나로만. 시뮬 경로에서 `Math.random()` 직접 호출 금지. *배경/연출/경제(탐사·양육 보상·ID 생성) 난수는 범위 밖 — 건드리지 않는다.*
- **밸런스 불변:** 확률·계수·로직은 그대로. `Math.random()`→`rng()`는 **호출 표면만** 바꾸는 1:1 치환(분포 동일).
- **선택 스테이징:** `git add <정확한 경로>`만. 다른 세션의 미커밋 변경 금지. 공유 파일 스테이징 전 `git diff index.html`로 내 영역만인지 확인.
- **검증 판정:** preview 콘솔 버퍼가 아니라 `window.__catalogSelfTest()` **반환값(fails 배열)**으로 판정. 새 테스트 fn은 `if(fails.length) throw new Error(...)` 또는 `__eq`/`__ok`로 throw.
- **격리 실행:** 다른 세션이 index.html을 동시 편집 중이면 OneDrive 밖(`C:\dev\...`) 워크트리에서 작업(실행 핸드오프 참조).

---

## File Structure

- **Modify only:** `C:\Users\soosa\Documents\풀로세움\index.html`
  - 유틸 영역(`clamp` 정의 직후): 결정론 PRNG 4함수 + `gameNow()` 추가.
  - `startMatch()` 상단: 전투 시드 주입.
  - 전투 시뮬 경로 ~13개 `Math.random()` 호출 → `rng()`.
  - 방치형 진행 콜러 8곳 `Date.now()` → `gameNow()`(테스트 콜러는 제외).
  - 셀프테스트 블록 끝: rng/시간 결정론 테스트 케이스 추가.

새 파일 없음. 위치는 줄번호가 아니라 **유니크 문자열 grep**으로 찾는다(index.html 줄번호는 자주 어긋남).

---

### Task 1: 결정론 PRNG 인프라 + 전투 시드 주입

전투 난수가 거쳐 갈 단일 깔때기를 만든다. 같은 시드 → 같은 수열(재현 가능). 평소 비전투 코드는 영향 없음(기본 `Math.random` 폴백).

**Files:**
- Modify: `index.html` — `clamp` 함수 직후(유틸 영역) + `startMatch()` 상단 + 셀프테스트 블록 끝
- Test: `index.html` 셀프테스트(`window.__test`) 케이스 1개

**Interfaces:**
- Produces:
  - `makeRng(seed:number) → (() => number)` — `[0,1)` 결정론 난수 생성기(mulberry32)
  - `rng() → number` — 현재 활성 생성기 호출(기본 `Math.random`)
  - `seedBattleRng(seed:number) → void` — 활성 생성기를 시드로 설정
  - `clearBattleRng() → void` — 활성 생성기를 `Math.random`으로 복귀
  - `gameNow() → number` — 진행시간 출처(현재 `Date.now()`, 나중 서버시간으로 교체할 단일 지점)

- [ ] **Step 1: 실패하는 셀프테스트 추가**

`index.html`에서 마지막 `window.__test('sig: ...', ...)` 케이스 블록을 grep으로 찾는다:
Run: `grep -n "옛 라이더 제거 — 속성기에 heal/pierce/critBonus 없음" index.html`
그 `window.__test(...)` 호출이 끝나는 `});` **직후**에 아래를 추가:

```javascript
window.__test('rng: 시드 동일 → 수열 동일(재현)', function(){
  seedBattleRng(12345); const a=[rng(),rng(),rng(),rng()];
  seedBattleRng(12345); const b=[rng(),rng(),rng(),rng()];
  clearBattleRng();
  __ok(a.join(',')===b.join(','), '같은 시드인데 수열이 다름');
  __ok(a[0]!==a[1] || a[1]!==a[2], 'rng가 변하지 않음(상수 의심)');
  __ok(a.every(x=>x>=0 && x<1), 'rng 값이 [0,1) 밖');
});
window.__test('rng: 기본은 Math.random 폴백(비전투 무영향)', function(){
  clearBattleRng();
  const x=rng(); __ok(x>=0 && x<1, '폴백 rng가 [0,1) 밖');
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

preview에서 `index.html` 로드 후 콘솔/eval:
Run (preview_eval): `window.__catalogSelfTest()`
Expected: 반환된 fails 배열에 `rng: 시드 동일 ...` 항목 포함(예: `seedBattleRng is not defined`).

- [ ] **Step 3: PRNG 4함수 + `gameNow()` 구현**

grep으로 `clamp` 정의를 찾는다:
Run: `grep -n "function clamp(n, min, max)" index.html`
그 한 줄(`function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }`) **직후**에 추가:

```javascript
/* ── 결정론 난수(전투 시뮬 전용) — 서버 재검증 대비 단일 깔때기 ──
   makeRng=mulberry32. 전투 시작 시 seedBattleRng로 시드 주입,
   끝나면 clearBattleRng로 Math.random 복귀. 비전투/연출 난수는 무관. */
function makeRng(seed){
  let s = seed >>> 0;
  return function(){
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let __battleRng = Math.random;                 // 기본: 비전투 코드 영향 없음
function rng(){ return __battleRng(); }
function seedBattleRng(seed){ __battleRng = makeRng(seed); }
function clearBattleRng(){ __battleRng = Math.random; }
/* ── 진행 시간 출처 단일화 — 나중에 서버 타임스탬프로 교체할 지점 ── */
function gameNow(){ return Date.now(); }
```

- [ ] **Step 4: 전투 시작 시 시드 주입**

grep으로 `startMatch` 본문 시작을 찾는다:
Run: `grep -n "function startMatch()" index.html`
`startMatch()` 본문에서 `ensureSkillFields(p);`(첫 호출) 줄을 찾아 **그 직후**에 추가:

```javascript
  // 전투 난수 시드 주입(현재는 클라 임의 시드; 추후 서버 제공 시드로 교체).
  // makeCombatant/buildEnemy의 난수보다 먼저 실행되어야 함.
  seedBattleRng(((Date.now() >>> 0) ^ ((((state.tournament&&state.tournament.roundIndex)||0)+1) * 0x9E3779B1)) >>> 0);
```

(참고: `startMatch`의 `ensureSkillFields(p);`는 `makeCombatant`(12391 부근)·`buildEnemy`(12399 부근) **이전**이라, 그들 내부 난수가 시드를 따른다.)

- [ ] **Step 5: 셀프테스트 통과 확인**

preview `location.reload()` 후:
Run (preview_eval): `window.__catalogSelfTest()`
Expected: 반환 fails 배열에 `rng:` 항목 **없음**(0개여야 통과). 기존 케이스도 전부 통과(fails 변동 없음).

- [ ] **Step 6: 전투 스모크(회귀 없음 확인)**

preview에서 실제 전투 1회 진입(새 상태면): `claimStarterSeed(true)` → `plantSeedFromBag(state.seed_inventory[0].inventory_id,'시드테스트')` → `state.activeId=p.id` → `startBattle()`. 콘솔 에러 없이 카드 페이즈가 뜨고 `playerSkill(<로드아웃 첫 스킬 id>)`가 정상 진행되면 OK(이 시점엔 아직 전투 난수가 `rng()`로 안 바뀌었지만 시드 주입이 깨지지 않았는지 확인).

- [ ] **Step 7: 커밋**

```bash
git add index.html docs/superpowers/plans/2026-06-26-battle-determinism-seams.md
git commit -m "feat(server-prep): 결정론 rng() 인프라 + 전투 시드 주입 + gameNow() 깔때기

전투 시뮬 난수를 거를 단일 시드 함수(mulberry32) 추가. startMatch에서 시드
주입. 진행시간 출처 gameNow() 단일화(현재 Date.now 폴백). 호출 교체는 다음 태스크.
셀프테스트: rng 재현성 케이스 추가.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 전투 시뮬 경로 `Math.random()` → `rng()` 치환

전투 결과를 좌우하는 난수(선공·회피·치명·생존·상태이상 발동·AI 선택·속성 시그니처)를 `rng()`로 1:1 치환. **분포·확률 불변**(`Math.random()`↔`rng()`는 둘 다 `[0,1)`). 보상/경제/연출 난수는 건드리지 않는다.

**Files:**
- Modify: `index.html` — 아래 13개 전투 시뮬 호출(각각 유니크 문자열 grep으로 위치)
- Test: `index.html` 셀프테스트(전투 경로 비-`Math.random` 가드 케이스 1개)

**Interfaces:**
- Consumes: `rng()` (Task 1)

각 치환은 해당 줄에서 `Math.random`을 `rng`로만 바꾼다(그 외 문자 변경 없음). 위치는 grep 앵커로 찾는다:

| # | grep 앵커(유니크 부분) | 변경 |
|---|---|---|
| 1 | `if(Math.random() < ch && d.hp>0){ d.skipNext = true;` | `Math.random()`→`rng()` (번개 감전) |
| 2 | `let add = true; if(selfResist && Math.random()<rk) add = false;` | `Math.random()`→`rng()` (자기속성 저항) |
| 3 | `if(Math.random() < (0.15 + roundIndex*0.06 + tierIndex*0.04)){` | `Math.random()`→`rng()` (전투 셋업 확률) |
| 4 | `if(e.hp < e.max*0.32 && healId && Math.random()<0.6) return healId;` | `Math.random()`→`rng()` (AI 회복) |
| 5 | `if(drainId && Math.random()<0.5) return drainId;` | `Math.random()`→`rng()` (AI 흡혈) |
| 6 | `if(dmgIds.length && Math.random()<0.72) return dmgIds[0];` | `Math.random()`→`rng()` (AI 공격) |
| 7 | `if(guardId && Math.random()<0.18) return guardId;` | `Math.random()`→`rng()` (AI 방어) |
| 8 | `return ids[Math.floor(Math.random()*ids.length)];` | `Math.random()`→`rng()` (AI 랜덤 폴백) |
| 9 | `const dodgeRoll = Math.random()*100;` | `Math.random()`→`rng()` (회피) |
| 10 | `const critRoll = Math.random();` | `Math.random()`→`rng()` (치명타) |
| 11 | `const surviveRoll=Math.random(), survived=surviveRoll<d.passives.surviveChance;` | `Math.random()`→`rng()` (생존 패시브) |
| 12 | `if(u.passives.cleanseChance>0 && u.buffs.some(b=>b.kind==='debuff')){ const roll=Math.random(),` | 첫 `Math.random()`→`rng()` (자연 정화) |
| 13 | `const roll=Math.random(), success=roll<sp.chance;` | `Math.random()`→`rng()` (상태이상 발동) |
| 14 | `playerFirst = Math.random()*100 < firstChance;` | `Math.random()`→`rng()` (선공 판정) |

> **명시적 제외(이번 범위 아님 — 서버 보상발급 작업에서 처리):** `const w=1+Math.floor(Math.random()*2); grantCareReward('water', w);`(전투 승리 물/비료 보상)와 `const skillId = pool[Math.floor(Math.random()*pool.length)];`(스킬 풀 선택, 보상/연출 계열)은 **그대로 둔다**. 보상 지급은 결정론 시드가 아니라 추후 서버 발급 대상.

- [ ] **Step 1: 가드 셀프테스트 추가(전투 시뮬 경로에 Math.random 없음)**

Task 1에서 추가한 `rng:` 테스트 블록 **직후**에 추가. 이 테스트는 전투 시뮬 핵심 함수들의 소스 문자열에 `Math.random`이 없음을 검사한다(`Function.prototype.toString` 사용):

```javascript
window.__test('rng: 전투 시뮬 경로에 Math.random 직접호출 없음', function(){
  const srcs = [applySkill, tickStatuses, aiPickSkill].map(f => f.toString()).join('\n');
  __ok(!/Math\.random/.test(srcs), '전투 시뮬 함수에 Math.random 잔존(rng()로 교체 필요)');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run (preview_eval, reload 후): `window.__catalogSelfTest()`
Expected: fails에 `rng: 전투 시뮬 경로에 Math.random 직접호출 없음` 포함(아직 미치환).

- [ ] **Step 3: 위 표 14개 치환 적용**

각 앵커를 grep으로 찾아 `Math.random`만 `rng`으로 바꾼다. 예:
Run: `grep -n "const dodgeRoll = Math.random()\*100;" index.html`
→ `const dodgeRoll = rng()*100;` 로 수정. 14개 전부 동일 방식. 표의 "제외" 2개는 건드리지 않는다.

- [ ] **Step 4: 잔존 확인(시뮬 함수 한정)**

Run: `grep -n "Math.random" index.html`
Expected: 출력에 회피/치명/AI/선공/감전/저항/생존/정화/상태이상 라인이 **더는 없음**. 남는 건 탐사·양육 보상·ID 생성·`rollForm` 등 비-시뮬 호출뿐.

- [ ] **Step 5: 셀프테스트 통과 확인**

Run (preview_eval, reload 후): `window.__catalogSelfTest()`
Expected: 반환 fails **0개**(전부 통과). 특히 `rng: 전투 시뮬 경로에 Math.random 직접호출 없음` 통과.

- [ ] **Step 6: 전투 스모크(밸런스/동작 회귀 없음)**

preview에서 전투 1~2회: `startBattle()` → `playerSkill(id)` 반복으로 승/패까지 진행. 회피 MISS·치명 CRIT·상태이상(감전/화상 등) 팝업이 정상 등장하고 콘솔 에러 없음 확인. (확률 분포는 동일하므로 체감 변화 없어야 정상.)

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(server-prep): 전투 시뮬 난수를 rng()로 일원화(14개 호출)

회피·치명·생존·상태이상 발동·선공·AI 선택·속성 시그니처 난수를 시드 rng()로
1:1 치환(분포 불변). 보상/경제/연출 난수는 범위 밖으로 제외. 가드 셀프테스트로
시뮬 함수 내 Math.random 잔존 0 검증.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 방치형 진행 시간 출처 `Date.now()` → `gameNow()`

양육/열매(방치형) 진행이 **기기 시계**를 직접 읽는 지점을 단일 `gameNow()`로 모은다. 나중에 `gameNow()` 한 줄만 서버 타임스탬프로 바꾸면 "폰 시간 조작으로 열매 무한" 치트 경로가 닫힌다. **동작 불변**(`gameNow()`는 현재 `Date.now()` 반환).

**Files:**
- Modify: `index.html` — `nurseryTick(p, Date.now())` 형태의 **프로덕션 콜러 8곳**
- Test: `index.html` 셀프테스트(시간 출처 가드 케이스 1개)

**Interfaces:**
- Consumes: `gameNow()` (Task 1)

> **범위 한정:** `nurseryTick(p, gameNow())`로 바꾸는 건 **프로덕션 콜러만**. 셀프테스트 안의 `nurseryTick(p, 100*3600000)` 등 **고정 시간 인자 호출은 그대로 둔다**(이미 결정론적). ID 생성용 `Date.now()`(`inventory_id`, `plant_${...}_${Date.now()}` 등)도 진행시간이 아니므로 **건드리지 않는다**.

- [ ] **Step 1: 가드 셀프테스트 추가**

Task 2의 가드 테스트 직후에 추가:

```javascript
window.__test('time: gameNow가 진행시간 출처 단일 지점', function(){
  __ok(typeof gameNow==='function', 'gameNow 미정의');
  __ok(typeof gameNow()==='number' && gameNow()>0, 'gameNow가 시각을 반환하지 않음');
  // 프로덕션 양육 콜러는 gameNow를 쓴다(harvestAllPots 소스 검사)
  __ok(/nurseryTick\([^,]+,\s*gameNow\(\)\)/.test(harvestAllPots.toString()), 'harvestAllPots가 아직 Date.now() 사용');
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run (preview_eval, reload 후): `window.__catalogSelfTest()`
Expected: fails에 `time: gameNow가 진행시간 출처 단일 지점` 포함(아직 미치환).

- [ ] **Step 3: 프로덕션 콜러 8곳 치환**

`nurseryTick(p, Date.now())`(및 `nurseryTick(q, Date.now())`/변수명 차이) 형태를 grep으로 찾아 `Date.now()`→`gameNow()`:
Run: `grep -n "nurseryTick(.*Date.now())" index.html`
출력 중 **셀프테스트 라인(고정 숫자 인자, 예 `nurseryTick(p, 100*3600000)`)을 제외한** 8곳을 모두 `gameNow()`로 변경한다. (대상 함수: `harvestAllPots`, 양육 수확가능 검사, 물/비료 투입, 양육 탭 렌더 계열 등 — 전부 `Date.now()` 인자만 교체.)

- [ ] **Step 4: 잔존 확인**

Run: `grep -n "nurseryTick(.*Date.now())" index.html`
Expected: 프로덕션 콜러 출력 0(셀프테스트의 고정 인자 호출만 남고, 그건 `Date.now()` 아님).

- [ ] **Step 5: 셀프테스트 통과 확인**

Run (preview_eval, reload 후): `window.__catalogSelfTest()`
Expected: 반환 fails **0개**. 특히 `time: gameNow ...` + 기존 `nursery: ...` 케이스 전부 통과.

- [ ] **Step 6: 양육 스모크**

preview에서 양육 탭 진입(`#nav-nursery` 등) → 열매 게이지/수확 UI가 정상 렌더되고 콘솔 에러 없음. (동작 불변이므로 변화 없어야 정상.)

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(server-prep): 방치형 진행 시간 출처를 gameNow()로 단일화

nurseryTick 프로덕션 콜러 8곳의 Date.now()를 gameNow()로 교체(동작 불변).
추후 gameNow() 한 줄을 서버 타임스탬프로 바꾸면 시간조작 치트 경로 차단.
ID 생성용 Date.now()와 셀프테스트 고정 인자는 범위 밖.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** (대상 스펙 = [server-authority-anticheat §5 규율 + §3 리스크 상위 3개]):
- §5-① 전투 RNG 시드 단일화 → Task 1(인프라)+Task 2(치환). ✅
- §3-#3 시간기반 진행 클라시계 → Task 3(gameNow 단일화). ✅
- §5-② "계산→연출" 분리 + §3-#1 sim/render 분리 → **의도적 범위 밖**(서버 착수 시). 본 계획은 "더 악화 방지"만. ✅
- §3-#4 보상 서버 이전, §3-#5 세이브 분리 → 범위 밖(명시 제외). ✅

**Placeholder scan:** TBD/임의 처리 없음 — 모든 치환은 정확한 grep 앵커+전후 코드 제시. ✅

**Type consistency:** `makeRng/rng/seedBattleRng/clearBattleRng/gameNow` 명칭이 Task 1 정의와 Task 2·3 사용에서 일치. 셀프테스트 헬퍼 `__ok`는 기존 정의(14091) 재사용. ✅

---

## Execution Handoff

**격리 권장:** 다른 세션이 `index.html`을 동시 편집 중이면, 실행 전 `superpowers:using-git-worktrees`로 OneDrive 밖(`C:\dev\...`) 워크트리를 만들어 작업하고 FF로 머지한다. 단독 작업이면 현재 트리에서 진행하되 커밋 전 `git diff index.html`로 내 영역만인지 확인. 작업 완료 후 `git push`.

**Plan complete and saved to `docs/superpowers/plans/2026-06-26-battle-determinism-seams.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 태스크별 신선한 서브에이전트 + 태스크 간 리뷰, 빠른 반복.

**2. Inline Execution** - 이 세션에서 executing-plans로 체크포인트 단위 실행.

**Which approach?**
