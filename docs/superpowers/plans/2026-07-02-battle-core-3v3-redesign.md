# 전투 코어 3v3 재설계 구현 계획 (팀·심리전·손패·두 리그)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1v1 고정 전투를 "팀3·교체 심리전·덱8/손패4·에너지 커브·두 리그(1v1/3v3 랭크 분리)"로 재설계한다. 스펙 = [2026-07-02-battle-core-3v3-redesign-design.md](../specs/2026-07-02-battle-core-3v3-redesign-design.md).

**Architecture:** `B.p`/`B.e`를 **활성 유닛 별칭**으로 유지(수백 호출부 무접촉)하고 `B.pTeam/eTeam/pActive/eActive`를 추가. 에너지는 **팀 공유 풀 + 유닛 accessor**(기존 `a.energy±=` 코드 전부 그대로 동작). 기존 `playerSkill` 해소 루프는 이미 "양측 공개→속도순"이라 **의도(intent) 수집 단계만 앞에 삽입**. 1v1 리그 = 팀 크기 1 포맷(같은 코드).

**Tech Stack:** 바닐라 JS 단일 `index.html`(클로저 전역) · 테스트=`window.__test`+`__catalogSelfTest()`(preview에서 실행) · 전투 난수=`rng()`만(결정론 하드 지침).

## Global Constraints

- **전투 시뮬 난수는 `rng()`만** — `Math.random()`/`Date.now()` 금지(연출/ID 생성은 무관). 덱 셔플도 `rng()`(전투 시드 이후).
- **테스트 러너 없음** — 검증은 `__test('이름', fn)` 추가 → preview `location.reload()` → `__catalogSelfTest()` **반환값(fails 배열)** 확인. `fn`은 실패 시 반드시 throw(§CLAUDE.md).
- **함수 위치는 줄번호가 아니라 심볼 grep으로** 찾을 것. 같은 함수 다중 정의 시 **마지막 정의가 라이브**.
- 커밋 메시지는 PowerShell here-string(`git commit -m @'...'@`, 닫는 `'@` 열0) — **메시지에 큰따옴표(") 금지**(인자 경계 깨짐, 2026-07-02 실측).
- 다른 세션 동시편집 대비: 커밋 전 `git status`·`git diff <파일>`로 내 변경만인지 확인, `git add`는 파일 지정.
- 수치 상수(1안·튜닝 대상): `ENERGY_START=2`, `ENERGY_POOL_MAX=8`, 매턴 재생 +1(기존 코드 재사용), 손패 4, 팀 최대 3.

---

### Task 1: 팀 편성 데이터 계층 — 로드아웃 8·팀/랭크 마이그레이션

**Files:**
- Modify: `index.html` — `const MAX_LOADOUT`(grep) / `function normalizeState`(grep) / 파일 끝 `__test` 블록들 옆

**Interfaces:**
- Produces: `MAX_LOADOUT===8` · `state.last_team:[plantId×≤3]` · `state.team_rankPoints:number` · `state.team_rankTier:number` · `state.team_tournament:null|{active,roundIndex,prelimWins,prelimLosses,teamIds}` · `currentTeam():plant[]`(1~3마리, activePlant 우선 포함)

- [ ] **Step 1: 실패하는 테스트 작성** — `window.__test('i18n: josa...'` 정의 직전에 삽입:

```js
window.__test('team: loadout 8 + team state migration + currentTeam', function(){
  __eq(MAX_LOADOUT, 8, 'MAX_LOADOUT 8');
  if(typeof state==='undefined' || !state || !Array.isArray(state.plants)) return; // dex 모드 스킵
  __ok(Array.isArray(state.last_team), 'last_team array');
  __ok(typeof state.team_rankPoints==='number', 'team_rankPoints');
  __ok(typeof state.team_rankTier==='number', 'team_rankTier');
  __ok(state.team_tournament===null || typeof state.team_tournament==='object', 'team_tournament slot');
  const t = currentTeam();
  __ok(Array.isArray(t) && t.length>=0 && t.length<=3, 'currentTeam ≤3');
  if(state.plants.length){ __ok(t.length>=1, 'has plants → team ≥1'); __ok(t.some(p=>p.id===state.activeId) || !activePlant(), 'active plant included'); }
});
```

- [ ] **Step 2: preview 리로드 → 실패 확인** — `preview_eval`로 `location.reload()` 후:

```js
(()=>{ try{ return JSON.stringify(window.__catalogSelfTest()); }catch(e){ return 'ERR '+e.message; } })()
```
Expected: fails에 `team: loadout 8...` 항목(MAX_LOADOUT 6이라 실패).

- [ ] **Step 3: 구현**
① `const MAX_LOADOUT = 6;` → `const MAX_LOADOUT = 8; // 3v3 재설계: 덱 8장(스펙 §3)`
② `normalizeState` 안 `// #15 미션/스토리 모드 진행 상태` 블록 바로 아래 삽입:

```js
  // 3v3 재설계(스펙 2026-07-02): 팀 편성·재배사(3v3) 랭크 트랙
  if(!Array.isArray(s.last_team)) s.last_team = [];
  s.last_team = s.last_team.filter(id => (s.plants||[]).some(p => p.id === id)).slice(0,3);
  if(typeof s.team_rankPoints !== 'number') s.team_rankPoints = 0;
  if(typeof s.team_rankTier !== 'number') s.team_rankTier = rankTierIndexFromPoints(s.team_rankPoints);
  if(s.team_tournament === undefined) s.team_tournament = null;
```
③ `function plantBattleLoadout`(grep) 정의 **바로 위**에 신규 함수:

```js
/* 3v3 팀 — last_team 우선, 비면 활성 식물+앞선 식물로 채움(최대 3). 반환=plant 객체 배열. */
function currentTeam(){
  const byId = id => (state.plants||[]).find(p => p.id === id);
  let team = (state.last_team||[]).map(byId).filter(Boolean);
  const act = activePlant();
  if(act && !team.some(p => p.id === act.id)) team.unshift(act);
  for(const p of (state.plants||[])){ if(team.length>=3) break; if(!team.some(x=>x.id===p.id)) team.push(p); }
  team = team.slice(0,3);
  state.last_team = team.map(p=>p.id);
  return team;
}
```

- [ ] **Step 4: 리로드 → 통과 확인** — Step 2와 같은 eval. Expected: `[]` (0 fail).
- [ ] **Step 5: 커밋** — `git add index.html` → `git commit -m @'\nfeat(battle3v3): 팀 데이터 계층 — MAX_LOADOUT 8·last_team·재배사 랭크 마이그레이션 (Task 1)\n'@` (형식은 Global Constraints 준수)

---

### Task 2: 덱/핸드 사이클 순수 모듈 (CR 사이클)

**Files:**
- Modify: `index.html` — Task 1의 `currentTeam` 정의 바로 아래 + `__test` 블록

**Interfaces:**
- Produces: `makeDeckState(ids:string[]):{hand:string[],queue:string[]}`(rng 셔플, 손패≤4) · `deckPlay(ds,id):boolean`(손패에서 제거→큐 끝, 큐 앞에서 드로우; 카드 5장 미만이면 즉시 손패 복귀) · `deckNext(ds):string|null`(다음 카드 미리보기)
- Consumes: `rng()`(결정론 셔플)

- [ ] **Step 1: 실패하는 테스트** — Task 1 테스트 아래 삽입:

```js
window.__test('deck: CR cycle — shuffle/hand4/rotate/small-deck', function(){
  seedBattleRng(12345);
  const ds = makeDeckState(['a','b','c','d','e','f','g','h']);
  __eq(ds.hand.length, 4, 'hand 4'); __eq(ds.queue.length, 4, 'queue 4');
  const first = ds.hand[0], nxt = deckNext(ds);
  __ok(!!nxt, 'next preview');
  __ok(deckPlay(ds, first), 'play ok');
  __eq(ds.hand.length, 4, 'refilled to 4');
  __eq(ds.hand[3], nxt, 'drew previewed card');
  __eq(ds.queue[ds.queue.length-1], first, 'played card to back');
  __ok(!deckPlay(ds, 'zz'), 'not-in-hand rejected');
  const small = makeDeckState(['x','y','z']); // 5장 미만 → 사이클 없이 재사용
  __eq(small.hand.length, 3, 'small hand=all'); __eq(deckNext(small), null, 'no next');
  __ok(deckPlay(small, 'x'), 'small play ok');
  __ok(small.hand.includes('x'), 'small deck: card returns to hand');
  seedBattleRng(999); const d1 = makeDeckState(['a','b','c','d','e','f']);
  seedBattleRng(999); const d2 = makeDeckState(['a','b','c','d','e','f']);
  __eq(JSON.stringify(d1), JSON.stringify(d2), 'deterministic shuffle');
  clearBattleRng();
});
```

- [ ] **Step 2: 리로드 → 실패 확인** (`makeDeckState is not defined`)
- [ ] **Step 3: 구현** — `currentTeam` 아래:

```js
/* ── 덱8/손패4 CR 사이클(스펙 §3) — 셔플은 전투 시드 rng() → 결정론 ── */
function makeDeckState(ids){
  const order = (ids||[]).slice();
  for(let i=order.length-1;i>0;i--){ const j=Math.floor(rng()*(i+1)); const t=order[i]; order[i]=order[j]; order[j]=t; }
  return { hand: order.slice(0,4), queue: order.slice(4) };
}
function deckNext(ds){ return (ds && ds.queue.length) ? ds.queue[0] : null; }
function deckPlay(ds, id){
  if(!ds) return false;
  const i = ds.hand.indexOf(id); if(i<0) return false;
  ds.hand.splice(i,1);
  if(ds.queue.length){ ds.queue.push(id); ds.hand.push(ds.queue.shift()); }
  else ds.hand.push(id); // 카드 5장 미만: 사이클 없이 재사용
  return true;
}
```

- [ ] **Step 4: 리로드 → 0 fail 확인**
- [ ] **Step 5: 커밋** — `feat(battle3v3): 덱8/손패4 CR 사이클 순수 모듈 (Task 2)`

---

### Task 3: 공유 에너지 풀 — accessor로 기존 엔진 무수정 통과

**Files:**
- Modify: `index.html` — `function makeCombatant`(grep) 반환 직전 + 상수는 `const MAX_LOADOUT` 옆 + `__test`

**Interfaces:**
- Produces: `ENERGY_START=2` · `ENERGY_POOL_MAX=8` · `makeEnergyPool(bonus=0):{cur,max}` · `attachEnergyPool(unit,pool)`(unit.energy/energyMax를 풀 위 getter/setter로 재정의)
- Consumes: 기존 엔진의 모든 `a.energy ± / a.energyMax` 접근(무수정 동작해야 함)

- [ ] **Step 1: 실패하는 테스트**:

```js
window.__test('energy: shared pool via accessors', function(){
  const pool = makeEnergyPool(0);
  __eq(pool.cur, ENERGY_START, 'start 2'); __eq(pool.max, ENERGY_POOL_MAX, 'max 8');
  const u1 = { energy:5, energyMax:5 }, u2 = { energy:3, energyMax:3 };
  attachEnergyPool(u1, pool); attachEnergyPool(u2, pool);
  u1.energy += 3; // 기존 엔진 문법 그대로
  __eq(u2.energy, Math.min(ENERGY_POOL_MAX, ENERGY_START+3), 'shared across team');
  u2.energy = Math.max(0, u2.energy - 4);
  __eq(u1.energy, u2.energy, 'still shared');
  u1.energy = 99; __eq(u1.energy, ENERGY_POOL_MAX, 'setter clamps to max');
  __eq(u1.energyMax, ENERGY_POOL_MAX, 'energyMax from pool');
  __eq(makeEnergyPool(2).max, ENERGY_POOL_MAX+2, 'bonus raises max');
});
```

- [ ] **Step 2: 리로드 → 실패 확인**
- [ ] **Step 3: 구현** — `const MAX_LOADOUT = 8;` 아래 상수, `makeDeckState` 위 함수:

```js
const ENERGY_START = 2;      // 3v3: 시작 낮게(만땅 폐지) — 아끼는 커브(스펙 §3)
const ENERGY_POOL_MAX = 8;   // 팀 공유 에너지 상한
```

```js
/* ── 팀 공유 에너지 풀(스펙 §3/§6) — 유닛 energy/energyMax를 풀 위 accessor로 재정의해
   기존 엔진 코드(a.energy±=, drainEnergy, energyGain …)가 무수정으로 공유 풀을 때리게 한다. ── */
function makeEnergyPool(bonus){ return { cur: ENERGY_START, max: ENERGY_POOL_MAX + (bonus||0) }; }
function attachEnergyPool(unit, pool){
  Object.defineProperty(unit, 'energy', {
    configurable: true,
    get(){ return pool.cur; },
    set(v){ pool.cur = clamp(Math.round(v), 0, pool.max); },
  });
  Object.defineProperty(unit, 'energyMax', {
    configurable: true,
    get(){ return pool.max; },
    set(_v){ /* 풀이 진실 — 개별 재정의 무시 */ },
  });
  unit.__energyPool = pool;
  return unit;
}
```

- [ ] **Step 4: 리로드 → 0 fail 확인** (기존 에너지 테스트 `engine: drainEnergy...`도 여전히 통과해야 — plain 객체는 attach 안 하면 기존 동작)
- [ ] **Step 5: 커밋** — `feat(battle3v3): 팀 공유 에너지 풀 accessor (Task 3)`

---

### Task 4: B 팀 구조 + 교체 코어 (`beginTeamBattle`/`switchActive`/기절 판정)

**Files:**
- Modify: `index.html` — `function startMatch`(grep) 주변 + `function bootBattleUI` + `__test`

**Interfaces:**
- Produces: `beginTeamBattle(pUnits[],eUnits[],opts{mission?,league:'solo'|'team'})`(B 구성: pTeam/eTeam/pActive/eActive/pPool/ePool/league + `B.p/B.e` 별칭 + 유닛별 `deckState`) · `switchActive(side,idx):boolean`(별칭 갱신+무대 재렌더) · `teamAliveCount(team):number` · `renderActiveUnits()`(스프라이트·이름표 재렌더)
- Consumes: Task 2 `makeDeckState` · Task 3 `attachEnergyPool` · 기존 `makeCombatant`/`variantSkillsOf`/`spriteFor`/`FORMS`/`ELEMENTS`

- [ ] **Step 1: 실패하는 테스트**:

```js
window.__test('team: beginTeamBattle wiring + switchActive alias', function(){
  seedBattleRng(777);
  const mk = n => makeCombatant({ name:n, species:'spore_cap', element:'grass', grade:'C',
    seedType:'mushroom', growth:'growing', form:'spore', baseStats:{hp:100,atk:20,def:15,spd:15,acc:90,elem:10,critRate:5,critMult:1.5,energy:3},
    traits:[], loadout:['skill_basic_strike','skill_guard','skill_photosynthesis','skill_focus','skill_rally'], skillGrades:{}, cards:[] });
  const savedB = (typeof B!=='undefined') ? B : null;
  beginTeamBattle([mk('A1'),mk('A2'),mk('A3')], [mk('E1')], { league:'team', noUI:true });
  __eq(B.pTeam.length, 3, 'pTeam 3'); __eq(B.eTeam.length, 1, 'eTeam 1(1v1 포맷 공존)');
  __ok(B.p === B.pTeam[0] && B.e === B.eTeam[0], 'aliases');
  __eq(B.p.energy, ENERGY_START, 'pool start');
  B.pTeam[1].energy += 2; __eq(B.p.energy, ENERGY_START+2, 'team shares pool');
  __ok(B.pTeam.every(u => u.deckState && u.deckState.hand.length>=1), 'deckState per unit');
  __ok(switchActive('p', 1), 'switch ok');
  __ok(B.p === B.pTeam[1] && B.pActive===1, 'alias moved');
  __ok(!switchActive('p', 1), 'same idx rejected');
  B.pTeam[2].hp = 0; __ok(!switchActive('p', 2), 'fainted rejected');
  __eq(teamAliveCount(B.pTeam), 2, 'alive count');
  B = savedB; clearBattleRng();
});
```

- [ ] **Step 2: 리로드 → 실패 확인** (`beginTeamBattle is not defined`)
- [ ] **Step 3: 구현** — `function startMatch(` 정의 **바로 위**에 삽입:

```js
/* ── 3v3 코어(스펙 §6): B에 팀 구조를 얹되 B.p/B.e는 "활성 유닛 별칭"으로 유지 —
   applySkill/tickStatuses/updateBars 등 기존 호출부 무접촉. ── */
function teamAliveCount(team){ return (team||[]).filter(u=>u && u.hp>0).length; }
function unitDeckIds(u){ return u.loadout.concat(variantSkillsOf(u)).filter((v,i,a)=>a.indexOf(v)===i); }
function beginTeamBattle(pUnits, eUnits, opts){
  opts = opts || {};
  const pPool = makeEnergyPool(Math.max(0, ...pUnits.map(u=>u.passives.energyBonus||0)));
  const ePool = makeEnergyPool(Math.max(0, ...eUnits.map(u=>u.passives.energyBonus||0)));
  pUnits.forEach(u => { attachEnergyPool(u, pPool); u.deckState = makeDeckState(unitDeckIds(u)); });
  eUnits.forEach(u => { attachEnergyPool(u, ePool); u.deckState = makeDeckState(unitDeckIds(u)); });
  B = {
    pTeam:pUnits, eTeam:eUnits, pActive:0, eActive:0,
    p:pUnits[0], e:eUnits[0], pPool, ePool,
    league: opts.league || (pUnits.length>1 || eUnits.length>1 ? 'team' : 'solo'),
    pIntent:null, eIntent:null, eForecast:null,
    over:false, busy:false, turn:1, mission: opts.mission || undefined,
  };
  return B;
}
function renderActiveUnits(){
  if(!B) return;
  $('#eSpriteBox').innerHTML = spriteFor(B.e, 108);
  $('#pSpriteBox').innerHTML = spriteFor(B.p, 108);
  const eEl = ELEMENTS[B.e.element], pEl = ELEMENTS[B.p.element];
  const badge = u => { const f = FORMS[u.form||'normal']||FORMS.normal;
    return u.form && u.form!=='normal' ? ` <span class="badge" style="color:${f.color};border:1px solid ${f.color}" title="${f.name}">${f.icon}</span>` : ''; };
  $('#eName').innerHTML = `${B.e.name} <span class="badge b-${B.e.element}">${eEl.icon}</span>${badge(B.e)}`;
  $('#pName').innerHTML = `${B.p.name} <span class="badge b-${B.p.element}">${pEl.icon}</span>${badge(B.p)}`;
  updateBars();
}
function switchActive(side, idx){
  const team = side==='p' ? B.pTeam : B.eTeam;
  const cur = side==='p' ? B.pActive : B.eActive;
  if(idx===cur || !team[idx] || team[idx].hp<=0) return false;
  if(side==='p'){ B.pActive = idx; B.p = team[idx]; } else { B.eActive = idx; B.e = team[idx]; }
  if(!B._noUI){ renderActiveUnits(); if(typeof renderTeamBar==='function') renderTeamBar(); }
  return true;
}
```
그리고 `beginTeamBattle` 반환 직전에 `if(opts.noUI) B._noUI = true;` 추가(테스트용 — `B = {...}` 객체 리터럴에 `_noUI: !!opts.noUI,` 필드로 넣어도 됨. 리터럴 방식 권장).

- [ ] **Step 4: 리로드 → 0 fail 확인**
- [ ] **Step 5: `startMatch`/`startMissionBattle`를 팀 빌더로 전환** — `startMatch` 내:

```js
  const playerC = makePlayerCombatant(p);
  const enemyC = buildEnemy(T.roundIndex, plantRankTierIdx(p));
  B = { p:playerC, e:enemyC, over:false, busy:false, turn:1 };
  bootBattleUI(p);
```
을 다음으로 교체(1v1 리그 = 팀1 포맷·기존 동작 보존):

```js
  const playerC = makePlayerCombatant(p);
  const enemyC = buildEnemy(T.roundIndex, plantRankTierIdx(p));
  beginTeamBattle([playerC], [enemyC], { league:'solo' });
  bootBattleUI(p);
```
`startMissionBattle`의 `B = { p:playerC, e:enemyC, over:false, busy:false, turn:1, mission:{ cid, idx } };`도:

```js
  beginTeamBattle([playerC], [enemyC], { league:'solo', mission:{ cid, idx } });
```
로 교체(미션 팀화는 Task 9). `bootBattleUI` 안의 스프라이트·이름표 8줄(`$('#eSpriteBox').innerHTML …`부터 `$('#pName').innerHTML …`까지)을 `renderActiveUnits();` 한 줄로 교체.

- [ ] **Step 6: 리로드 → 0 fail + 수동 스모크** — preview에서 `startBattle()` 경로(CLAUDE.md 전투 테스트 레시피)로 전투 부팅·스킬 1회 사용이 기존과 동일하게 동작하는지 확인(`B.pTeam.length===1`).
- [ ] **Step 7: 커밋** — `feat(battle3v3): B 팀 구조·공유풀·switchActive — 1v1은 팀1 포맷으로 무손실 이행 (Task 4)`

---

### Task 5: 의도 수집·해소 루프 — 교체/휴식 액션 + 기절 교대 + 팀 전멸 종료

**Files:**
- Modify: `index.html` — `async function playerSkill`(grep) 전체 재구성 + `function skillUnusable` 옆

**Interfaces:**
- Produces: `submitIntent(intent:{kind:'skill',id}|{kind:'switch',to}|{kind:'rest'})`(플레이어 진입점) · `resolveTurn(pIntent,eIntent)`(비동기 해소) · `handleFaintAndMaybeEnd():Promise<boolean>`(true=경기 종료) · `promptFreeSwitch(side):Promise<void>` · `REST_INTENT` 상수
- Consumes: Task 4 전부 · 기존 `applySkill`/`tickStatuses`/`openJudge`/`setJudgeAction`/`setVerdict`/`finishMatch`/`aiPickSkill`(Task 6에서 aiPickIntent로 대체될 때까지 임시 사용)

- [ ] **Step 1: 실패하는 테스트**(로직 부분만 — 연출은 preview 수동):

```js
window.__test('turn: switch-first + rest + team-wipe end condition', function(){
  __ok(typeof submitIntent==='function' && typeof resolveTurn==='function', 'api exists');
  __ok(typeof promptFreeSwitch==='function', 'free switch api');
  // 교체 우선 규칙: resolveTurn 내부 순서는 코드 검사로 대신(연출 비동기라 여기선 시그니처만)
});
```

- [ ] **Step 2: 리로드 → 실패 확인**
- [ ] **Step 3: `playerSkill`을 intent 진입점으로 재구성** — 기존 `async function playerSkill(skillId){...}` **전체를** 아래로 교체(기존 본문 로직은 `resolveTurn`으로 이동·확장):

```js
/* ── 3v3 의도 수집(스펙 §1): 플레이어 입력 → 봇 의도 → 해소. playerSkill은 하위호환 어댑터. ── */
async function playerSkill(skillId){ return submitIntent({ kind:'skill', id:skillId }); }
async function submitIntent(intent){
  if(!B || B.busy || B.over) return;
  if(intent.kind==='skill'){
    const s = skillById(intent.id, B.p);
    if(!s) return;
    if(!B.p.deckState.hand.includes(intent.id)){ toast('손패에 없는 카드입니다'); return; }
    if(s.noEnergy){
      const rem = (B.p.uses && B.p.uses[intent.id]!=null) ? B.p.uses[intent.id] : (s.uses||0);
      if(rem <= 0){ toast('이 스킬은 더 쓸 수 없습니다 (횟수 소진)'); return; }
    } else if(B.p.energy < effectiveCost(B.p, s)){ toast('⚡에너지가 부족합니다'); return; }
  }
  if(intent.kind==='switch' && !(B.pTeam[intent.to] && B.pTeam[intent.to].hp>0 && intent.to!==B.pActive)){ toast('교체할 수 없는 대상입니다'); return; }
  B.busy = true; B.pIntent = intent;
  updateBattleHud(); hide('#battleSkillDetail'); lockSkillBar();
  try{ sfx.tap(); }catch(e){}
  await sleep(280);
  const eIntent = (typeof aiPickIntent==='function') ? aiPickIntent() : { kind:'skill', id:aiPickSkill(B.e) };
  await resolveTurn(intent, eIntent);
}
async function resolveTurn(pIntent, eIntent){
  // ① 교체 먼저(포켓몬 룰 §1) — 교체한 쪽은 이번 턴 스킬 없음
  for(const [side,intent] of [['p',pIntent],['e',eIntent]]){
    if(intent.kind==='switch'){
      switchActive(side, intent.to);
      blog(`<span class="em">${side==='p'?B.p.name:B.e.name}</span> 교체 투입!`);
      setVerdict(side==='p'?'e':'p', side==='p'?'교체! — '+B.p.name:'교체! — '+B.e.name, 'effect');
      await sleep(520);
    }
    if(intent.kind==='rest'){
      const u = side==='p' ? B.p : B.e;
      u.energy += 1;
      blog(`<span class="em">${u.name}</span> 숨을 고른다 (⚡+1)`);
      await sleep(320);
    }
  }
  const pSkill = pIntent.kind==='skill' ? pIntent.id : null;
  const eSkill = eIntent.kind==='skill' ? eIntent.id : null;
  if(pSkill || eSkill){
    await openJudge(pSkill, eSkill); // 동시 공개(한쪽 null이면 그 슬롯 비움 — openJudge가 null 허용하도록 아래 Step 4)
    const pChosen = pSkill ? skillById(pSkill, B.p) : null, eChosen = eSkill ? skillById(eSkill, B.e) : null;
    const pAttack = !!(pChosen && pChosen.power>0), eAttack = !!(eChosen && eChosen.power>0);
    const pDefense = isPriorityDefenseSkill(pChosen), eDefense = isPriorityDefenseSkill(eChosen);
    const needsOrder = pAttack || eAttack;
    const prioritySide = needsOrder && pDefense!==eDefense ? (pDefense?'p':'e') : null;
    let playerFirst = true;
    if(needsOrder && !prioritySide){
      const myS = effStat(B.p,'spd'), enS = effStat(B.e,'spd');
      playerFirst = rng()*100 < clamp(50 + (myS - enS), 5, 95);
      B.firstSide = playerFirst ? 'p' : 'e';
    } else { B.firstSide = prioritySide; }
    if(needsOrder){
      const arrowSide = prioritySide || B.firstSide;
      setJudgeOrder(arrowSide, prioritySide ? '방어 우선' : (arrowSide==='p'?'선공 · 나':'선공 · 상대'));
      await sleep(860);
    } else await sleep(300);
    const seq = prioritySide ? (prioritySide==='p'?['p','e']:['e','p'])
              : (needsOrder ? (playerFirst?['p','e']:['e','p']) : ['p','e']);
    for(const side of seq){
      const id = side==='p' ? pSkill : eSkill;
      if(!id) continue;
      const a = side==='p' ? B.p : B.e, d = side==='p' ? B.e : B.p;
      if(a.hp<=0) continue;
      setJudgeAction(side, id);
      await sleep(150);
      if(a.skipNext){ a.skipNext=false; if(a.zapNoRegen){ a._noRegen=true; a.zapNoRegen=false; } await animateJudgeCardUse(side,false); setVerdict(side, a._noRegen?'감전 — 움직일 수 없다!':'마비되어 움직일 수 없다!','effect'); await sleep(620); updateBars(); continue; }
      deckPlay(a.deckState, id); // 손패 사이클(봇 포함)
      await applySkill(a, d, skillById(id, a), side, {suppressMessages:true});
      if(await handleFaintAndMaybeEnd()) return;
      await sleep(240);
    }
  }
  await tickStatuses(B.p,'p'); if(await handleFaintAndMaybeEnd()) return;
  await tickStatuses(B.e,'e'); if(await handleFaintAndMaybeEnd()) return;
  if(B.p._noRegen){ B.p._noRegen=false; } else B.p.energy = Math.min(B.p.energyMax, B.p.energy+1);
  if(B.e._noRegen){ B.e._noRegen=false; } else B.e.energy = Math.min(B.e.energyMax, B.e.energy+1);
  if(B.p.energy>=B.p.energyMax && B.p.passives.nextAtkBonus>0) B.p.nextAtk = B.p.passives.nextAtkBonus;
  if(B.e.energy>=B.e.energyMax && B.e.passives.nextAtkBonus>0) B.e.nextAtk = B.e.passives.nextAtkBonus;
  if(typeof updateEnemyForecast==='function') updateEnemyForecast(); // Task 6
  await sleep(300);
  closeJudge();
  B.turn += 1; B.pIntent = B.eIntent = null;
  B.busy = false; updateBars(); updateBattleHud();
  if(!B.over) renderBattleIdleView();
}
/* 기절 처리(스펙 §2): 팀 전멸=종료 / 생존자 있으면 무료 교대(플레이어=선택, 봇=자동 최적) */
async function handleFaintAndMaybeEnd(){
  updateBars();
  for(const side of ['e','p']){
    const team = side==='p' ? B.pTeam : B.eTeam;
    const active = side==='p' ? B.p : B.e;
    if(active.hp > 0) continue;
    if(teamAliveCount(team)===0){ await finishMatch(side==='e'); return true; }
    blog(`<span class="em">${active.name}</span> 쓰러졌다! 다음 식물 투입…`);
    if(side==='e'){
      const idx = team.findIndex(u=>u.hp>0);
      switchActive('e', idx);
    } else {
      await promptFreeSwitch('p');
    }
    await sleep(420);
  }
  return false;
}
/* 플레이어 무료 교대 — 팀 바를 선택 모드로 강조하고 선택을 기다린다(Task 7의 renderTeamBar 연동) */
function promptFreeSwitch(side){
  return new Promise(resolve => {
    B._freeSwitchResolve = (idx) => { switchActive(side, idx); B._freeSwitchResolve = null; resolve(); };
    if(typeof renderTeamBar==='function') renderTeamBar(true);
    toast('교대할 식물을 선택하세요');
  });
}
```

- [ ] **Step 4: `openJudge`가 한쪽 null 허용하는지 확인/보정** — `function openJudge`(grep) 확인. 인자 id가 null이면 해당 슬롯 `innerHTML=''`로 비우도록 분기 추가(기존: 항상 양쪽 카드 렌더). `judgeCardMarkup` 호출 전 `if(!id){ slot.innerHTML=''; } else {...}` 형태.
- [ ] **Step 5: 리로드 → 셀프테스트 0 fail + preview 실전투** — 전투 부팅 후 카드 1장 사용 → 판정 → 턴 증가 확인. `B.p.deckState.hand.length===4` 유지 확인:

```js
(()=>{ startBattle(); return new Promise(r=>setTimeout(()=>{ const c=document.querySelector('button.skillcard:not([disabled])'); c&&c.click(); setTimeout(()=>r(JSON.stringify({turn:B.turn, hand:B.p.deckState.hand.length, energy:B.p.energy})), 6000); }, 3600)); })()
```
Expected: `turn:2, hand:4, energy:` 시작2−비용+1 값.
- [ ] **Step 6: 커밋** — `feat(battle3v3): 의도 수집·해소 루프 — 교체 우선·휴식·기절 무료교대·팀 전멸 종료 (Task 5)`

---

### Task 6: 봇 AI — 아키타입 성향 + 교체 판단 + 큰 기술 예고

**Files:**
- Modify: `index.html` — `function aiPickSkill`(grep) 아래 신규 + `__test`

**Interfaces:**
- Produces: `aiPickIntent():intent`(손패 기반·성향 가중·교체 판단) · `updateEnemyForecast()`(다음 턴 3코+ 스킬 예고 — `B.eForecast={id}` 설정+⚠️ 표시) · `AI_TEMPER:{[archetype]:{atk,guard,heal,debuff,switch}}` 가중치표
- Consumes: `B.e.deckState.hand` · `archetypeOf`/`SPECIES[...].archetype` · `eff()`(상성) · `rng()`

- [ ] **Step 1: 실패하는 테스트**:

```js
window.__test('ai: intent from hand + forecast honored + temper table', function(){
  __ok(typeof aiPickIntent==='function' && typeof updateEnemyForecast==='function', 'api');
  __ok(AI_TEMPER.berserk && AI_TEMPER.guardian && Object.keys(AI_TEMPER).length>=14, 'temper 14+ archetypes');
  seedBattleRng(4242);
  const mk = (n,arch) => { const u = makeCombatant({ name:n, species:'spore_cap', element:'grass', grade:'C',
    seedType:'mushroom', growth:'growing', form:'spore', baseStats:{hp:100,atk:20,def:15,spd:15,acc:90,elem:10,critRate:5,critMult:1.5,energy:3},
    traits:[], loadout:['skill_basic_strike','skill_guard','skill_photosynthesis','skill_focus','skill_rally'], skillGrades:{}, cards:[] }); u.archetype=arch; return u; };
  const savedB = (typeof B!=='undefined') ? B : null;
  beginTeamBattle([mk('P','berserk')], [mk('E','berserk')], { league:'solo', noUI:true });
  B.ePool.cur = 8;
  const it = aiPickIntent();
  __ok(it && (it.kind==='skill'||it.kind==='rest'), 'intent shape');
  if(it.kind==='skill') __ok(B.e.deckState.hand.includes(it.id), 'picks from hand');
  B.eForecast = { id: B.e.deckState.hand[0] };
  const it2 = aiPickIntent();
  __eq(it2.id, B.eForecast.id, 'forecast honored when playable');
  B = savedB; clearBattleRng();
});
```

- [ ] **Step 2: 리로드 → 실패 확인**
- [ ] **Step 3: 구현** — `aiPickSkill` 정의 아래:

```js
/* ── 봇 성향(스펙 §4) — 아키타입=읽을 수 있는 패턴. 가중치는 카테고리 선호 배율. ── */
const AI_TEMPER = {
  berserk:{atk:1.6,guard:0.3,heal:0.4,debuff:0.6,switch:0.3}, sage:{atk:1.2,guard:0.8,heal:0.8,debuff:0.8,switch:0.7},
  trickster:{atk:0.9,guard:0.6,heal:0.6,debuff:1.6,switch:1.6}, stalwart:{atk:0.9,guard:1.5,heal:0.9,debuff:0.6,switch:0.4},
  guardian:{atk:0.7,guard:1.7,heal:1.2,debuff:0.5,switch:0.5}, zealot:{atk:1.7,guard:0.2,heal:0.3,debuff:0.5,switch:0.2},
  executioner:{atk:1.5,guard:0.5,heal:0.4,debuff:0.8,switch:0.6}, feral:{atk:1.4,guard:0.4,heal:0.5,debuff:0.5,switch:0.8},
  strategist:{atk:0.8,guard:0.8,heal:0.7,debuff:1.7,switch:1.0}, hermit:{atk:0.7,guard:1.2,heal:1.6,debuff:0.6,switch:0.5},
  tyrant:{atk:1.3,guard:0.7,heal:0.6,debuff:1.2,switch:0.4}, glutton:{atk:1.3,guard:0.5,heal:1.0,debuff:0.6,switch:0.5},
  phantom:{atk:1.1,guard:0.5,heal:0.5,debuff:1.1,switch:1.4}, warlord:{atk:1.5,guard:0.8,heal:0.5,debuff:0.7,switch:0.5},
};
function aiTemperOf(u){ return AI_TEMPER[u.archetype || (SPECIES[u.species]&&SPECIES[u.species].archetype) || 'sage'] || AI_TEMPER.sage; }
function aiPickIntent(){
  const e = B.e, t = aiTemperOf(e);
  // 예고한 큰 기술은 지킨다(§4 — 예고=플레이어가 대응할 기회)
  if(B.eForecast && e.deckState.hand.includes(B.eForecast.id) && !skillUnusable(e, B.eForecast.id)){
    const id = B.eForecast.id; B.eForecast = null; return { kind:'skill', id };
  }
  B.eForecast = null;
  // 교체 판단(3v3만): 상성 불리+생존 대체자, 성향 배율
  if(B.eTeam.length>1 && teamAliveCount(B.eTeam)>1){
    const bad = eff(B.p.element, e.element) > 1.01;
    const cand = B.eTeam.findIndex((u,i)=>i!==B.eActive && u.hp>0 && eff(B.p.element, u.element) <= 1.0);
    if(bad && cand>=0 && rng() < 0.25*t.switch) return { kind:'switch', to:cand };
    if(e.hp < e.max*0.18 && cand>=0 && rng() < 0.35*t.switch) return { kind:'switch', to:cand };
  }
  const hand = e.deckState.hand.filter(id => !skillUnusable(e, id));
  if(!hand.length) return { kind:'rest' };
  const catOf = id => { const s = skillById(id, e);
    if(s.heal && s.heal>=0.15) return 'heal';
    if(s.guardMult!=null) return 'guard';
    if((s.power||0)>0) return 'atk';
    if(s.enemyDebuff||s.dot||s.infuse) return 'debuff';
    return 'atk'; };
  let best=null, bestW=-1;
  for(const id of hand){
    const s = skillById(id, e), cat = catOf(id);
    let w = (t[cat]||1) * (10 + (s.power||0)/20) * (0.9 + rng()*0.2);
    if(cat==='heal' && e.hp < e.max*0.35) w *= 2.2;
    if(cat==='heal' && e.hp > e.max*0.8) w *= 0.1;
    if(w > bestW){ bestW = w; best = id; }
  }
  return best ? { kind:'skill', id:best } : { kind:'rest' };
}
/* 큰 기술 예고(§4): 턴 정리 때 다음 턴 3코+ 스킬 사용 계획이면 ⚠️ 노출(종류 숨김) */
function updateEnemyForecast(){
  const e = B.e; B.eForecast = null;
  const nextEnergy = Math.min(e.energyMax, e.energy); // 재생 반영 후 호출됨
  const bigs = e.deckState.hand.filter(id => { const s = skillById(id, e);
    return s && !s.noEnergy && (s.cost||0)>=3 && effectiveCost(e, s) <= nextEnergy && (s.power||0)>0; });
  if(bigs.length && rng() < 0.55){
    B.eForecast = { id: bigs[Math.floor(rng()*bigs.length)] };
  }
  const box = $('#eSpriteBox');
  if(box){ box.classList.toggle('forecast', !!B.eForecast); }
}
```
CSS(스타일 블록의 `.spritebox` 관련 규칙 근처에 추가):

```css
#eSpriteBox.forecast::after{content:'⚠️';position:absolute;top:-6px;right:-2px;font-size:18px;animation:pulse .9s infinite alternate;filter:drop-shadow(0 0 6px #ff9a4d);}
```

- [ ] **Step 4: 리로드 → 0 fail 확인** (기존 `aiPickSkill`은 그대로 두되 이제 미호출 — Task 10에서 제거)
- [ ] **Step 5: 커밋** — `feat(battle3v3): 봇 성향 AI(아키타입 가중)·교체 판단·큰 기술 예고 (Task 6)`

---

### Task 7: 전투 UI — 손패4+다음 카드·에너지 바·팀 바(교체/상성)·성향 표시

**Files:**
- Modify: `index.html` — `function refreshSkillBar`(grep) 재작성 + `#cardPhase` HTML(grep `id="cardHand"`) + CSS + `bindSkillCards`

**Interfaces:**
- Produces: `renderTeamBar(freeSwitchMode?)` · 손패 4장만 렌더(덱 나머지 숨김) + `#cardNext` 다음 카드 미리보기 + `#restCard` 숨 고르기 + 팀 슬롯 탭→`submitIntent({kind:'switch',to})`
- Consumes: `B.p.deckState` · `deckNext` · `submitIntent` · `eff()` · `B._freeSwitchResolve`(Task 5)

- [ ] **Step 1: HTML 확장** — `<div id="cardHand">` 요소가 있는 `#cardPhase` 블록에서 `#cardPred` 행을 제거하고(변이 스킬은 덱에 흡수됨) 아래 구조로:

```html
<div id="teamBar"></div>
<div id="cardHandRow">
  <div id="cardHand"></div>
  <div id="cardSide">
    <div id="cardNext"><span class="cn-label">다음</span><div id="cardNextBody"></div></div>
    <button id="restCard" class="skillcard rest"><div class="sc-name">숨 고르기</div><div class="sc-icon">🌬️</div><div class="sc-foot"><span class="sc-cost">⚡+1</span></div></button>
  </div>
</div>
```
(기존 `#cardEnergy` 행은 유지.)

- [ ] **Step 2: `refreshSkillBar` 재작성**:

```js
function refreshSkillBar(){
  if(!B) return;
  const ds = B.p.deckState || { hand: B.p.loadout.slice(0,4), queue: [] };
  $('#cardHand').innerHTML = ds.hand.map(id => skillCardHtml(id, false)).join('');
  const nx = deckNext(ds);
  const nb = $('#cardNextBody');
  if(nb){ const s = nx ? skillById(nx, B.p) : null; nb.innerHTML = s ? `<span class="cn-icon">${s.icon||'❔'}</span><span class="cn-name">${displaySkillName(s.name)}</span>` : '<span class="cn-none">—</span>'; }
  let pips = `<span class="ce-label">⚡ 에너지</span>`;
  for(let i=0;i<B.p.energyMax;i++) pips += `<span class="${i<B.p.energy?'':'off'}">⚡</span>`;
  $('#cardEnergy').innerHTML = pips;
  renderTeamBar();
  bindSkillCards();
  const rest = $('#restCard'); if(rest){ rest.onclick = () => { if(!B.busy && !B.over) submitIntent({kind:'rest'}); }; }
  const cp = $('#cardPhase');
  cp.classList.remove('hidden');
  cp.classList.toggle('locked', !!(B.busy || B.over));
  syncStageToSkillBar();
}
/* 팀 바(스펙 §5/§7) — 슬롯: 초상·HP바·vs현재적 상성 아이콘. freeSwitchMode=기절 무료교대 선택 강조. */
function renderTeamBar(freeSwitchMode){
  const bar = $('#teamBar'); if(!bar) return;
  if(B.pTeam.length<=1){ bar.innerHTML=''; bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  bar.innerHTML = B.pTeam.map((u,i)=>{
    const active = i===B.pActive, dead = u.hp<=0;
    const adv = eff(u.element, B.e.element), dis = eff(B.e.element, u.element);
    const matchup = dead?'':(adv>1.01?'<span class="tb-adv">▲유리</span>':(dis>1.01?'<span class="tb-dis">▼불리</span>':''));
    const hpPct = Math.round(u.hp/u.max*100);
    return `<button class="tb-slot${active?' active':''}${dead?' dead':''}${freeSwitchMode&&!dead&&!active?' pick':''}" data-team="${i}">
      <span class="tb-spr">${spriteFor(u, 34)}</span>
      <span class="tb-hp"><i style="width:${hpPct}%"></i></span>
      ${matchup}${dead?'<span class="tb-x">✖</span>':''}
    </button>`;
  }).join('');
  bar.querySelectorAll('.tb-slot').forEach(btn => btn.addEventListener('click', ()=>{
    const i = +btn.dataset.team;
    if(B._freeSwitchResolve){ if(B.pTeam[i].hp>0 && i!==B.pActive) B._freeSwitchResolve(i); return; }
    if(B.busy || B.over || i===B.pActive || B.pTeam[i].hp<=0) return;
    submitIntent({ kind:'switch', to:i });
  }));
}
```
`skillCardHtml`의 disabled 판정은 그대로(`skillUnusable`) — 손패 밖 카드는 아예 렌더 안 되므로 추가 게이트 불필요.

- [ ] **Step 3: CSS 추가**(스킬바 CSS 근처):

```css
#teamBar{display:flex;gap:6px;padding:4px 8px 0;}
#teamBar.hidden{display:none;}
.tb-slot{position:relative;flex:1;max-width:88px;background:var(--card);border:1.5px solid var(--line);border-radius:10px;padding:3px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;}
.tb-slot.active{border-color:var(--neon);box-shadow:0 0 8px rgba(31,217,196,.35);}
.tb-slot.dead{opacity:.35;filter:grayscale(1);}
.tb-slot.pick{border-color:#ffcf6b;animation:pulse .8s infinite alternate;}
.tb-hp{width:90%;height:4px;background:#1c2b3f;border-radius:2px;overflow:hidden;}
.tb-hp i{display:block;height:100%;background:var(--neon);}
.tb-adv{font-size:9px;color:#9be15d;}.tb-dis{font-size:9px;color:#ff8a70;}
.tb-x{position:absolute;top:2px;right:4px;font-size:10px;color:#ff8a70;}
#cardHandRow{display:flex;gap:6px;align-items:stretch;}
#cardHand{flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
#cardSide{width:76px;display:flex;flex-direction:column;gap:4px;}
#cardNext{background:rgba(255,255,255,.04);border:1px dashed var(--line);border-radius:8px;padding:3px;text-align:center;font-size:10px;}
.cn-icon{font-size:16px;display:block;}
.skillcard.rest{border-style:dashed;opacity:.9;}
```
(기존 `#cardHand` grid 규칙과 충돌하면 기존 규칙을 이 4열 grid로 대체.)

- [ ] **Step 4: 적 성향 표시** — `renderBattleHeader` 끝 또는 `#eProfile` 세팅부(grep `#eProfile`)에서:

```js
  const eArch = ARCHETYPES[B.e.archetype || (SPECIES[B.e.species]&&SPECIES[B.e.species].archetype)] ;
  $('#eProfile').textContent = `👤 ${B.e.trainerName||'상대 재배사'}${eArch?` · 성향: ${eArch.name}`:''}`;
```

- [ ] **Step 5: preview 검증** — 3마리 팀 전투를 강제 부팅해 확인:

```js
(()=>{ const t=currentTeam(); /* 식물 3마리 사전 심기 필요 — claimStarterSeed 레시피 반복 */
  const pu=t.map(p=>makePlayerCombatant(p)); seedBattleRng(1);
  beginTeamBattle(pu, [buildEnemy(0,0),buildEnemy(0,0),buildEnemy(0,0)], {league:'team'});
  bootBattleUI(t[0]); return 'ok'; })()
```
스냅샷/DOM으로: 팀 바 3슬롯·상성 아이콘·손패 4장·다음 카드·숨 고르기 렌더 + 교체 탭→교체 해소 + 기절 시 pick 모드 강조 확인. 콘솔 에러 0.
- [ ] **Step 6: 커밋** — `feat(battle3v3): 전투 UI — 팀 바·손패4·다음 카드·숨 고르기·성향 표시 (Task 7)`

---

### Task 8: 두 리그 — 종목 선택·3v3 토너먼트·재배사 랭크·봇 팀

**Files:**
- Modify: `index.html` — `function startBattle`/`function startMatch`/`function endMatch`/`function renderTournamentBar`(각 grep) + `__test`

**Interfaces:**
- Produces: `startBattle(league='solo'|'team')` · `buildEnemyTeam(roundIndex,tierIdx,n):unit[]` · `teamTierIdx():number`(=state.team_rankTier) · endMatch의 `B.league==='team'` 분기(재배사 랭크 적립·승급) · 토너먼트 바 종목 2행
- Consumes: Task 4 `beginTeamBattle` · 기존 `TOURNAMENT_ROUNDS`/`RANK_TIERS`/`rankTierIndexFromPoints`/`checkPromotion` 패턴

- [ ] **Step 1: 실패하는 테스트**:

```js
window.__test('league: buildEnemyTeam diversity + team rank fields', function(){
  seedBattleRng(31337);
  const team = buildEnemyTeam(1, 0, 3);
  __eq(team.length, 3, '3 bots');
  __ok(new Set(team.map(u=>u.species)).size >= 2, 'species diversity ≥2');
  __ok(team.every(u=>u.hp>0 && u.loadout.length>0), 'units sane');
  clearBattleRng();
});
```

- [ ] **Step 2: 리로드 → 실패 확인**
- [ ] **Step 3: 구현**
① `buildEnemy` 아래:

```js
/* 3v3 봇 팀 — buildEnemy 재사용 + 속성/타입 다양성 보장(같은 속성 3연속 방지) */
function buildEnemyTeam(roundIndex, tierIndex, n){
  const team = [];
  let guard = 0;
  while(team.length < n && guard++ < 30){
    const u = buildEnemy(roundIndex, tierIndex);
    if(team.length && team.every(x=>x.element===u.element) && guard < 25) continue; // 다양성
    team.push(u);
  }
  return team;
}
```
② `startBattle` 재작성:

```js
function startBattle(league){
  league = league || 'solo';
  const p = activePlant();
  if(!p){ toast('전투할 식물이 없습니다. 탐사 후 종자 가방에서 심어주세요'); openSeedBag(); return; }
  ensureSkillFields(p);
  if(league==='team'){
    const team = currentTeam();
    if(!state.team_tournament || !state.team_tournament.active){
      state.team_tournament = { active:true, roundIndex:0, prelimWins:0, prelimLosses:0, teamIds:team.map(x=>x.id) };
    }
  } else {
    if(!state.tournament || !state.tournament.active || state.tournament.plantId !== p.id){
      state.tournament = { active:true, roundIndex:0, prelimWins:0, prelimLosses:0, plantId:p.id };
    }
  }
  startMatch(league);
}
```
③ `startMatch(league)` — 시그니처에 league 추가, `const T = league==='team' ? state.team_tournament : state.tournament;`로 치환하고:

```js
  if(league==='team'){
    const team = currentTeam().map(x=>{ ensureSkillFields(x); return makePlayerCombatant(x); });
    const bots = buildEnemyTeam(T.roundIndex, teamTierIdx(), 3);
    beginTeamBattle(team, bots, { league:'team' });
  } else {
    const playerC = makePlayerCombatant(p);
    const enemyC = buildEnemy(T.roundIndex, plantRankTierIdx(p));
    beginTeamBattle([playerC], [enemyC], { league:'solo' });
  }
  bootBattleUI(p);
```
`teamTierIdx` 헬퍼: `function teamTierIdx(){ return clamp(state.team_rankTier||0, 0, RANK_TIERS.length-1); }` (②의 함수 옆).
④ `endMatch` — `const T = state.tournament` 줄을 `const isTeam = B.league==='team'; const T = isTeam ? state.team_tournament : state.tournament;`로. 랭크 적립부(`p.rankPoints`)는 `if(isTeam){ state.team_rankPoints += round.point; ... } else { p.rankPoints ... }` 분기(승급은 `rankTierIndexFromPoints(state.team_rankPoints) > state.team_rankTier`로 동일 패턴, 3v3 보상 `gain`은 `Math.round(gain*1.25)` 상향 — 스펙 §9). `renderBattleHeader`/`playVsIntro`의 `tournamentTitle(p)`는 `B.league==='team' ? (RANK_TIERS[state.team_rankTier].name+' 팀 토너먼트') : tournamentTitle(p)` 분기.
⑤ `renderTournamentBar` — `#btnBattle` 하나 대신 종목 2행: 기존 배너 마크업의 `tcells` 아래에 1v1/3v3 행 각각 상태(티어·진행)와 시작 버튼(`data-league`); 클릭 바인딩 `startBattle(btn.dataset.league)`. `#btnBattle`은 `data-league='solo'` 기본으로 유지(하위호환).

- [ ] **Step 4: 리로드 → 0 fail + preview** — 3v3 리그 시작→예선 1경기 승/패→`state.team_rankPoints` 변동·티어 표시 확인.
- [ ] **Step 5: 커밋** — `feat(battle3v3): 두 리그 — 종목 선택·3v3 재배사 랭크·봇 팀 생성 (Task 8)`

---

### Task 9: 미션 `enemies[]` 전환 + 캠페인 재저작 (1v1/3v3 혼합)

**Files:**
- Modify: `index.html` — `const CAMPAIGNS`/`function buildMissionEnemy`/`function startMissionBattle`/`renderMissionCampaign`(각 grep) + `__test`

**Interfaces:**
- Produces: 스테이지 스키마 `enemies:[{species,growth,grade,cards?,name?,statBoost?,gimmick?}]`(1~3) — 기존 단수 필드는 `missionEnemiesAt(c,idx)`가 배열로 정규화 · `buildMissionEnemies(c,idx):unit[]`
- Consumes: `buildMissionEnemy`(내부 재사용) · `beginTeamBattle`

- [ ] **Step 1: 테스트 수정·추가** — 기존 `mission: campaign data integrity` 테스트의 종 검증 루프를 `missionEnemiesAt(c,i)` 배열 기준으로 바꾸고:

```js
window.__test('mission: enemies[] normalize + team build', function(){
  const c = CAMPAIGNS[0];
  const e0 = missionEnemiesAt(c, 0);
  __ok(Array.isArray(e0) && e0.length>=1 && e0.length<=3, 'stage enemies 1..3');
  const bossE = missionEnemiesAt(c, c.stages.length);
  __ok(bossE.length>=2, 'boss stage has escort (재저작)');
  seedBattleRng(5); const team = buildMissionEnemies(c, c.stages.length);
  __eq(team.length, bossE.length, 'team size matches');
  __ok(team.some(u=>u.gimmick || u.gimmickAura), 'boss gimmick attached'); clearBattleRng();
});
```

- [ ] **Step 2: 리로드 → 실패 확인**
- [ ] **Step 3: 구현**
① 정규화+팀 빌더(`buildMissionEnemy` 아래):

```js
function missionEnemiesAt(c, idx){
  const spec = missionStageAt(c, idx);
  if(Array.isArray(spec.enemies)) return spec.enemies;
  return [spec]; // 구 스키마(단수) 하위호환
}
function buildMissionEnemies(c, idx){
  const isBoss = idx >= c.stages.length;
  return missionEnemiesAt(c, idx).map((en, i) => {
    // buildMissionEnemy를 개별 en으로 호출하기 위해 임시 스테이지 뷰 구성
    const view = Object.assign({}, en);
    const fake = Object.assign({}, c, { stages: isBoss ? c.stages : c.stages.map((s,si)=> si===idx ? view : s),
                                        boss: isBoss ? view : c.boss });
    return buildMissionEnemy(fake, isBoss ? c.stages.length : idx);
  });
}
```
(더 단순한 대안: `buildMissionEnemy(c, idx, en)` 3번째 인자로 스펙 직접 전달하도록 리팩터 — 구현자가 택1, 시그니처는 `buildMissionEnemies` 유지.)
② `startMissionBattle` — `const enemyC = buildMissionEnemy(c, idx);` → `const enemies = buildMissionEnemies(c, idx);` + `beginTeamBattle(playerTeam, enemies, { league: enemies.length>1?'team':'solo', mission:{cid,idx} })`. 플레이어는 `enemies.length>1 ? currentTeam().map(makePlayerCombatant...) : [makePlayerCombatant(p)]`.
③ 캠페인 재저작 — 기존 3캠페인 스테이지에 `enemies` 부여: 볼카르 1~3스테이지=단일(1v1 유지), 보스=`enemies:[보스(기존 spec), {species:'flower_fire',growth:'growing',grade:'C'}]`(보스+호위 1). 네레이돈 3·4스테이지=2마리, 보스=보스+호위 1. 챔피언 전 스테이지=2마리·보스=`enemies:[뇌룡 파른(기존), {species:'igni_drake',growth:'mature',grade:'A'}, {species:'volt_eater',growth:'mature',grade:'A'}]`(3마리). 보상·대사·기믹 필드는 기존 값 유지.
④ `renderMissionCampaign` 스테이지 행 이름부를 `missionEnemiesAt(c,i).map(en=>en.name||SPECIES[en.species].name).join(' + ')`로.

- [ ] **Step 4: 리로드 → 0 fail + preview 미션 E2E**(스테이지1 1v1·보스 다인전 각 1회 승리 플로우).
- [ ] **Step 5: 커밋** — `feat(battle3v3): 미션 enemies[] 팀 전환 + 캠페인 3종 재저작 (Task 9)`

---

### Task 10: 구 경로 정리·문서 갱신·최종 E2E

**Files:**
- Modify: `index.html` · `docs/master-roadmap.md` · `docs/CHANGELOG.md` · `CLAUDE.md` · `docs/balance-sheet.md`(에너지 커브 §1-4 주기)

- [ ] **Step 1: 죽은 경로 제거** — `aiPickSkill`(aiPickIntent로 대체 확인 후 — 단 `'use strict'` 재할당 이슈 없게 **빈 스텁 보존 원칙** 검토), `#cardPred` 관련 CSS/참조, `startMatch`의 미사용 잔재. grep으로 참조 0 확인 후 삭제.
- [ ] **Step 2: 시작 에너지 만땅 잔재 정리** — `makeCombatant`의 `energy: clamp(...)` 초기값은 풀 attach로 덮이므로 그대로 두되 주석 갱신(`// 팀 전투에선 attachEnergyPool이 accessor로 대체`).
- [ ] **Step 3: 셀프테스트 전체 0 fail + preview E2E 총점검** — ① 1v1 리그 예선 1경기 ② 3v3 리그 1경기(교체·기절 교대·팀 전멸) ③ 미션 1v1 스테이지+보스 다인전 ④ 예고 ⚠️ 노출·대응 ⑤ 콘솔 에러 0.
- [ ] **Step 4: 문서 갱신** — 로드맵 §1 표(전투 재설계 행 신설·상태 갱신)+결정로그, CHANGELOG 맨 위, CLAUDE.md "전투/토너먼트" 문단을 두 리그·팀3·손패 체계로 재기술, balance-sheet 에너지/명중 관련 수치 갱신. 스펙 상태 ✅ 구현 완료로.
- [ ] **Step 5: 최종 커밋·푸시** — 코드+문서 함께. `git push origin main`.

---

## Self-Review 결과

- **스펙 커버리지:** §1 턴루프=T5 · §2 팀/교체=T4/T5 · §3 덱/에너지=T2/T3/T7 · §4 심리전=T6 · §5 상성 승격=T7(팀 바 아이콘) · §6 B 구조=T4 · §7 UI=T7 · §8 마이그레이션=T1 · §9 두 리그=T8/T9 · §10 검증=각 태스크+T10. 갭 없음.
- **자리표시자:** 없음(모든 코드 단계에 실제 코드. T9 ①은 택1 대안 명시 — 시그니처 고정이므로 허용).
- **타입/이름 일관성:** `beginTeamBattle/switchActive/teamAliveCount/deckState/deckPlay/deckNext/makeEnergyPool/attachEnergyPool/submitIntent/resolveTurn/aiPickIntent/updateEnemyForecast/renderTeamBar/buildEnemyTeam/buildMissionEnemies/currentTeam` — 태스크 간 교차 참조 확인 완료.
