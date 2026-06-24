# 양육/열매 시스템(#2) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (권장) 또는 superpowers:executing-plans 로 task 단위 실행. 각 step은 체크박스(`- [ ]`)로 추적.

**Goal:** 기존 일일카운터/스킬박스 양육을 **시간 게이지 + 감쇠형 물·비료 버프 + 5색 희귀도 열매 + 공통 개봉 연출**로 개편한다.

**Architecture:** `index.html` 단일 파일 인라인 JS. 순수 로직(게이지 틱·희귀도/보상 롤·수확)은 셀프테스트(`window.__test`)로, UI는 preview로 검증. 데이터는 `p.nursery`(개체별) + `state.care`(물/비료 인벤토리). 기존 세이브는 `ensureNurseryFields` 마이그레이션으로 무회귀.

**Tech Stack:** 바닐라 JS/CSS/HTML. 빌드 없음. 테스트 = `window.__test(name, fn)` → fails 배열 반환, `window.__catalogSelfTest()` 일괄.

## Global Constraints

- 단일 파일 `index.html`. 외부 의존성·빌드 추가 금지.
- 세이브 무회귀: 모든 신규 필드는 `ensureNurseryFields`/`normalizeState`에서 기본값 주입. 기존 `nursery_fruits`(미개봉분) 유실 금지.
- `grass`는 타입·속성 동일 문자열 — 일괄치환 금지.
- 종/스킬 콘텐츠 신규 추가는 본 계획 범위 밖(시스템·UI만). 보상 풀은 기존 스킬/카드/아이템 재사용.
- 식물/화분 2레이어 분리(#12·#3)는 **본 계획 범위 밖** — 열매는 기존 `composePlantSvg` 위 **오버레이**로 표시.
- 수치는 시드값(spec §7). 밸런스 튜닝은 후속.
- 각 task 끝에 커밋. UI 변경은 preview로 회귀 확인 후 커밋.

---

## File Structure

전부 `index.html` 내 인라인. 영역별 책임:
- **상수 블록** (`NURSERY_*` 교체, 4520~4533): 주기·버프·희귀도 상수.
- **데이터/마이그레이션** (`ensureNurseryFields` 4493, `defaultState` 4412, `normalizeState` 4473): 신규 필드 + 구→신 변환.
- **순수 로직** (양육 함수군 근처 신설): `nurseryTick`, `rollFruitRarity`, `rollFruitReward`, `applyCare`, `harvestPot`.
- **UI** (`renderNurseryGrid` 9970, `openNurseryDetail` 10007, `doWaterPot`/`doFertPot` 10054, `doHarvestPot` 10092): 게이지·열매·버튼 개편.
- **공통 연출** (신설): `openRewardReveal`, 모달 `#rewardRevealModal` + CSS. 보급상자·탐사결과 연결.
- **셀프테스트** (10605~): 신규 케이스 등록.

---

## Task 1: 데이터 모델 + 마이그레이션

**Files:**
- Modify: `index.html` 4493 (`ensureNurseryFields`), 4520~4524 (상수), 4412 (`defaultState`), 4473 (`normalizeState`)
- Test: `index.html` 10605~ (`window.__test`)

**Interfaces:**
- Produces: `p.nursery = { gauge:Number(0..1), maxFruits:Number, ripe:Array<{rarity:String}>, lastTick:Number(ms), waterBuff:Number(0..1), fertBuff:Number(0..1), potQuality:Number }`. 레거시 필드(`water,fert,stage,fruitCount,fruitReady`)는 마이그레이션 후 제거.
- Produces: `state.care = { water:Number, fert:Number }` (물/비료 인벤토리).
- Produces 상수: `FRUIT_BASE_CYCLE_MS`, `FRUIT_MAX_BY_STAGE`, `CARE_BUFF_*`, `FRUIT_RARITIES`, `FRUIT_RARITY_COLOR`, `nurseryMaxFruits(p)`.

- [ ] **Step 1: 상수 교체** — 4520~4524의 `NURSERY_DAILY_*`/`NURSERY_WATER_NEED`/`NURSERY_FERT_NEED`를 아래로 교체(`NURSERY_POTS`는 유지). 일일카운터 함수(`nurseryDaily`/`nurseryWaterLeft`/`nurseryFertLeft` 4526~4533)는 **이 시점엔 남겨두고** Task 4에서 제거.

```js
const NURSERY_POTS = 12;                        // 화분 그리드 칸 수(3×4) — 유지
const FRUIT_BASE_CYCLE_MS = 4*60*60*1000;       // 성장체 기본 4시간/열매(시드값)
const FRUIT_STAGE_SPEED = { growing:1, mature:1.3, evolved:1.7 };   // 단계↑ = 충전 빠름
const FRUIT_MAX_BY_STAGE = { growing:2, mature:3, evolved:5 };      // 단계↑ = 더 많이
const CARE_BUFF_PER_USE  = 0.34;                // 물/비료 1회 투입당 버프 +0.34(≈3회 만충)
const CARE_BUFF_DECAY_HR = 0.25;                // 버프 시간당 감쇠(시드값)
const CARE_SPEED_BONUS   = 0.5;                 // 버프 평균 만충 시 충전속도 +50%
const FRUIT_RARITIES     = ['white','green','blue','purple','orange'];
const FRUIT_RARITY_COLOR = { white:'#e6edf2', green:'#5fd56a', blue:'#4ac6ff', purple:'#b98cff', orange:'#ff9a3c' };
const FRUIT_RARITY_NAME  = { white:'흔함', green:'고급', blue:'희귀', purple:'영웅', orange:'전설' };
function nurseryMaxFruits(p){ return FRUIT_MAX_BY_STAGE[(p && p.growth_stage)] || 0; }  // 성장체 미만=0
```

- [ ] **Step 2: `ensureNurseryFields` 개편** — 4493~4512 본문을 교체. 신규 필드 보장 + 구필드 1회 마이그레이션 + 구필드 제거.

```js
function ensureNurseryFields(p){
  if(!p) return p;
  if(typeof p.growthLocked !== 'boolean') p.growthLocked = false;
  if(!p.nursery || typeof p.nursery !== 'object') p.nursery = {};
  const n = p.nursery;
  // --- 레거시(구 일일카운터/누적게이트) → 신모델 1회 변환 ---
  if(n._v !== 2){
    const wasFruiting = (n.stage === 'fruiting') || n.fruitReady;
    const legacyCount = wasFruiting ? Math.max(1, n.fruitCount||1) : 0;
    n.ripe = Array.isArray(n.ripe) ? n.ripe : [];
    for(let i=0;i<legacyCount;i++) n.ripe.push({ rarity: rollFruitRarity(p) });  // Task2 함수 — 로드 순서상 함수 선언이 위에 있음
    n.gauge = 0;
    n.waterBuff = 0; n.fertBuff = 0;
    n.potQuality = (typeof n.potQuality==='number') ? n.potQuality : 1;
    n.lastTick = Date.now();
    n.maxFruits = nurseryMaxFruits(p);
    delete n.water; delete n.fert; delete n.stage; delete n.fruitCount;
    delete n.fruitReady; delete n.waterDay; delete n.waterCount;
    delete n.fertDay; delete n.fertCount; delete n.lastCareAt;
    n._v = 2;
  }
  // --- 신모델 필드 방어 ---
  if(!Array.isArray(n.ripe)) n.ripe = [];
  if(typeof n.gauge !== 'number' || n.gauge<0) n.gauge = 0;
  if(typeof n.waterBuff !== 'number') n.waterBuff = 0;
  if(typeof n.fertBuff  !== 'number') n.fertBuff = 0;
  if(typeof n.potQuality!== 'number') n.potQuality = 1;
  if(typeof n.lastTick  !== 'number') n.lastTick = Date.now();
  n.maxFruits = nurseryMaxFruits(p);   // 단계 바뀌면 갱신
  return p;
}
```

- [ ] **Step 3: `state.care` 기본값** — `defaultState()` (4412 부근, `nursery_fruits:[]` 옆)에 `care:{ water:0, fert:0 },` 추가. `normalizeState()` (4473 부근, `nursery_fruits` 방어 옆)에 추가:

```js
  if(!s.care || typeof s.care !== 'object') s.care = { water:0, fert:0 };
  if(typeof s.care.water !== 'number') s.care.water = 0;
  if(typeof s.care.fert  !== 'number') s.care.fert  = 0;
```

- [ ] **Step 4: 셀프테스트 작성(실패 확인)** — 10605 근처에 등록:

```js
window.__test('nursery_migrate_v2', function(){
  const fails=[];
  const p={ growth_stage:'mature', nursery:{ stage:'fruiting', fruitReady:true, fruitCount:3, water:10, fert:5 } };
  ensureNurseryFields(p);
  const n=p.nursery;
  if(n._v!==2) fails.push('migrate: _v not 2');
  if(n.ripe.length!==3) fails.push('migrate: ripe expected 3 got '+n.ripe.length);
  if('water' in n || 'stage' in n) fails.push('migrate: legacy fields not removed');
  if(n.maxFruits!==3) fails.push('migrate: maxFruits expected 3 got '+n.maxFruits);
  const seed={ growth_stage:'seed', nursery:{} };
  ensureNurseryFields(seed);
  if(seed.nursery.maxFruits!==0) fails.push('seed stage maxFruits should be 0');
  return fails;
});
```

- [ ] **Step 5: 테스트 실행** — preview에서 `window.__catalogSelfTest()` 호출, 콘솔 반환값 확인. `rollFruitRarity`가 아직 없으면 Task 2 먼저 병행. (Task 1·2는 함께 커밋 가능 — 의존)
Run: preview_eval `JSON.stringify(window.__test_run? window.__test_run('nursery_migrate_v2'):'use __catalogSelfTest')`
Expected: fails 배열이 비어야 PASS.

- [ ] **Step 6: 커밋**

```bash
git add index.html docs/superpowers/plans/2026-06-24-nurture-fruit-system.md
git commit -m "feat(#2): 양육 데이터모델 v2 — 게이지/희귀도 필드 + 구모델 마이그레이션"
```

---

## Task 2: 게이지 틱 + 희귀도 롤 (순수 로직)

**Files:**
- Modify: `index.html` (양육 함수군, `ensureNurseryFields` 아래 신설)
- Test: `index.html` 10605~

**Interfaces:**
- Consumes: `p.nursery`(Task1), `nurseryMaxFruits`, 상수.
- Produces: `nurseryTick(p, now)` — 경과시간만큼 버프 감쇠·게이지 충전·열매 맺힘(상한). 반환 `{ newFruits:Number }`. `rollFruitRarity(p)` → `FRUIT_RARITIES` 중 하나(버프·단계 가중).

- [ ] **Step 1: `rollFruitRarity` 작성** (Task1보다 코드상 위에 선언 — hoisting 위해 `function` 선언):

```js
// 버프(물·비료 평균)·생장단계가 높을수록 상위 희귀도 확률↑. 보수적(주황은 항상 희소).
function rollFruitRarity(p){
  const n = (p && p.nursery) || {};
  const buff = Math.min(1, ((n.waterBuff||0)+(n.fertBuff||0))/2);
  const stageBonus = { growing:0, mature:0.10, evolved:0.22 }[(p&&p.growth_stage)] || 0;
  const lift = buff*0.5 + stageBonus;                 // 0..0.72
  // 기본 가중치(흰 우세) → lift로 상위 등급에 가중 이동
  const base = { white:0.50, green:0.27, blue:0.14, purple:0.07, orange:0.02 };
  const w = {
    white:  base.white  * (1 - lift*0.9),
    green:  base.green  * (1 + lift*0.2),
    blue:   base.blue   * (1 + lift*0.8),
    purple: base.purple * (1 + lift*1.4),
    orange: base.orange * (1 + lift*2.0),
  };
  const total = FRUIT_RARITIES.reduce((s,k)=>s+w[k],0);
  let r = Math.random()*total;
  for(const k of FRUIT_RARITIES){ r -= w[k]; if(r<=0) return k; }
  return 'white';
}
```

- [ ] **Step 2: `nurseryTick` 작성**:

```js
// 마지막 틱 이후 경과를 반영: 버프 감쇠 → 게이지 충전 → 게이지 1 도달 시 열매 1개(상한까지).
// 게이지는 열매 맺힌 뒤 나머지(remainder)를 보존한다(수확과 무관, 충전 연속성).
function nurseryTick(p, now){
  ensureNurseryFields(p);
  const n = p.nursery;
  now = now || Date.now();
  let dtH = Math.max(0, (now - n.lastTick) / 3600000);   // 시간
  n.lastTick = now;
  if(dtH <= 0) return { newFruits:0 };
  // 1) 버프 감쇠(시간 평균으로 충전속도 반영 위해 시작값 기록)
  const startBuff = Math.min(1, (n.waterBuff + n.fertBuff)/2);
  n.waterBuff = Math.max(0, n.waterBuff - CARE_BUFF_DECAY_HR*dtH);
  n.fertBuff  = Math.max(0, n.fertBuff  - CARE_BUFF_DECAY_HR*dtH);
  const endBuff = Math.min(1, (n.waterBuff + n.fertBuff)/2);
  const avgBuff = (startBuff + endBuff)/2;
  // 2) 충전 속도: 단계·화분·버프
  const stageSpeed = FRUIT_STAGE_SPEED[p.growth_stage] || 0;
  if(stageSpeed <= 0) return { newFruits:0 };            // 성장체 미만은 열매 없음
  const rate = (n.potQuality||1) * stageSpeed * (1 + avgBuff*CARE_SPEED_BONUS) / (FRUIT_BASE_CYCLE_MS/3600000);
  // 3) 게이지 충전 + 열매 맺힘(상한)
  let newFruits = 0;
  const cap = n.maxFruits = nurseryMaxFruits(p);
  if(n.ripe.length >= cap){ n.gauge = 1; return { newFruits:0 }; }  // 꽉 참 → 게이지 붉음(=1) 정지
  n.gauge += rate * dtH;
  while(n.gauge >= 1 && n.ripe.length < cap){
    n.gauge -= 1;
    n.ripe.push({ rarity: rollFruitRarity(p) });
    newFruits++;
  }
  if(n.ripe.length >= cap) n.gauge = 1;                  // 정지 표시
  else n.gauge = Math.min(0.999, n.gauge);
  return { newFruits };
}
```

- [ ] **Step 3: 셀프테스트(맺힘 상한 + 게이지 보존 + 버프 감쇠)**:

```js
window.__test('nursery_tick', function(){
  const fails=[];
  const p={ growth_stage:'mature', nursery:{} };
  ensureNurseryFields(p);
  const n=p.nursery; n.gauge=0; n.waterBuff=0; n.fertBuff=0; n.lastTick=0;
  // 100시간 경과 → maxFruits(3) 상한에서 멈춰야
  const r = nurseryTick(p, 100*3600000);
  if(n.ripe.length!==3) fails.push('cap: ripe expected 3 got '+n.ripe.length);
  if(n.gauge!==1) fails.push('cap: gauge should be 1(stopped) got '+n.gauge);
  // 버프 감쇠 확인
  const q={ growth_stage:'growing', nursery:{} }; ensureNurseryFields(q);
  q.nursery.waterBuff=1; q.nursery.lastTick=0;
  nurseryTick(q, 5*3600000);
  if(q.nursery.waterBuff!==0) fails.push('decay: waterBuff should reach 0 got '+q.nursery.waterBuff);
  // rarity 유효성
  for(let i=0;i<50;i++){ if(FRUIT_RARITIES.indexOf(rollFruitRarity(p))<0){ fails.push('rarity invalid'); break; } }
  return fails;
});
```

- [ ] **Step 4: 테스트 실행** — `window.__catalogSelfTest()` → `nursery_tick`/`nursery_migrate_v2` fails 비어야 PASS.
- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat(#2): 양육 게이지 틱 + 5색 희귀도 롤(순수 로직) + 셀프테스트"
```

---

## Task 3: 수확 + 보상 롤 (순수 로직)

**Files:**
- Modify: `index.html` (Task2 함수 아래 신설)
- Test: `index.html` 10605~

**Interfaces:**
- Consumes: `p.nursery.ripe`, `addItemReward`/`createItemInventoryEntry`, `grantThemedTraitCard`, `bonus_skills`/`skillGrades`, `addCredits`, `nurserySkillReward`(10175 재사용).
- Produces: `rollFruitReward(p, rarity)` → `{ kind, label, icon, color, payload }`. `harvestPot(p)` → 맺힌 열매 전부를 보상으로 변환한 배열 반환, **게이지 보존**(ripe만 비움).

- [ ] **Step 1: `rollFruitReward` 작성** — 색=등급 매핑(흰/초록=소모품, 파랑/보라=변이카드, 주황=본인스킬/고등급카드). 소모품은 묶음(count>1) 가능, 카드·스킬은 1개. 스킬 중복=크레딧.

```js
const FRUIT_CONSUMABLES = ['levelup_potion'];  // 시드: 소모품 후보(물/비료는 state.care로 별도 — 아래서 추가)
function rollFruitReward(p, rarity){
  const color = FRUIT_RARITY_COLOR[rarity] || '#e6edf2';
  // 소모품: 물/비료(state.care)도 후보. 묶음 수량.
  if(rarity==='white' || rarity==='green'){
    const stack = rarity==='green' ? (2+Math.floor(Math.random()*3)) : (1+Math.floor(Math.random()*3));
    const pick = Math.random();
    if(pick < 0.45){ state.care.water += stack; return { kind:'care', label:`물 ×${stack}`, icon:'💧', color, payload:{res:'water',count:stack} }; }
    if(pick < 0.80){ state.care.fert  += stack; return { kind:'care', label:`비료 ×${stack}`, icon:'🌿', color, payload:{res:'fert',count:stack} }; }
    const item = ALIEN_INDEX.items['levelup_potion'];
    if(item){ addItemReward(createItemInventoryEntry(item, stack, null, null)); return { kind:'item', label:`${item.name} ×${stack}`, icon:item.icon||'⬆️', color, payload:{item_id:'levelup_potion',count:stack} }; }
    state.care.water += stack; return { kind:'care', label:`물 ×${stack}`, icon:'💧', color, payload:{res:'water',count:stack} };
  }
  // 변이 카드: 파랑/보라(보라가 더 상위 등급)
  if(rarity==='blue' || rarity==='purple'){
    const grade = rarity==='purple' ? (Math.random()<0.5?'A':'S') : (Math.random()<0.5?'C':'B');
    const card = grantThemedTraitCard(p.cardTypes || null, grade);
    return { kind:'card', label:`변이카드 ${card.name} [${grade}]`, icon:card.icon||'🧬', color, payload:card };
  }
  // 주황: 본인 전용 스킬(중복=크레딧). 풀 비면 고등급 카드로 폴백.
  const fake = { element:p.element, form:p.form, growth_stage:p.growth_stage, potential:p.potential||p.grade||'B' };
  const sk = nurserySkillReward(fake);
  if(sk){
    ensureSkillFields(p);
    if(!Array.isArray(p.bonus_skills)) p.bonus_skills = [];
    if(p.bonus_skills.includes(sk.id)){
      const refund = 200;
      addCredits(refund);
      return { kind:'credit', label:`중복 스킬 → 크레딧 +${refund}`, icon:'🪙', color, payload:{credits:refund} };
    }
    p.bonus_skills.push(sk.id);
    if(!p.skillGrades) p.skillGrades = {};
    p.skillGrades[sk.id] = sk.grade||'C';
    return { kind:'skill', label:`${displaySkillName(sk.name||'')} [${sk.grade||'C'}]`, icon:sk.icon||'✨', color, payload:{id:sk.id,grade:sk.grade} };
  }
  const card = grantThemedTraitCard(p.cardTypes || null, 'S');
  return { kind:'card', label:`변이카드 ${card.name} [S]`, icon:card.icon||'🧬', color, payload:card };
}
```

- [ ] **Step 2: `harvestPot` 작성** — ripe 전부 보상화, **게이지 보존**:

```js
// 맺힌 열매 전부를 보상으로 변환해 반환. 게이지(n.gauge)는 초기화하지 않는다(이어서 충전).
function harvestPot(p){
  ensureNurseryFields(p);
  const n = p.nursery;
  const ripe = n.ripe.slice();
  n.ripe = [];                      // 열매만 비움
  if(n.gauge >= 1) n.gauge = 0.999; // 정지(붉음) 해제 → 다시 충전 가능, 진행도 보존
  n.lastTick = Date.now();
  return ripe.map(fr => rollFruitReward(p, fr.rarity));
}
```

- [ ] **Step 3: 셀프테스트(게이지 보존 + 묶음 + 중복 크레딧)**:

```js
window.__test('nursery_harvest', function(){
  const fails=[];
  const before = { water: state.care && state.care.water };
  if(!state.care) state.care={water:0,fert:0};
  const startW = state.care.water;
  const p={ element:'fire', growth_stage:'mature', nursery:{} };
  ensureNurseryFields(p);
  p.nursery.ripe=[{rarity:'white'},{rarity:'white'}]; p.nursery.gauge=0.5;
  const rewards = harvestPot(p);
  if(rewards.length!==2) fails.push('harvest: reward count expected 2 got '+rewards.length);
  if(p.nursery.ripe.length!==0) fails.push('harvest: ripe not cleared');
  if(Math.abs(p.nursery.gauge-0.5)>1e-9) fails.push('harvest: gauge not preserved got '+p.nursery.gauge);
  // 중복 스킬 → 크레딧 폴백
  const q={ element:'fire', growth_stage:'mature', potential:'S', bonus_skills:[], skillGrades:{}, nursery:{} };
  ensureNurseryFields(q);
  const r1 = rollFruitReward(q,'orange');
  if(r1.kind==='skill'){
    const dup = rollFruitReward(q,'orange');  // 같은 풀에서 또 뽑힐 수 있음
    // 통계적이라 단정 못함 — kind가 skill 또는 credit이면 통과
    if(!['skill','credit','card'].includes(dup.kind)) fails.push('orange reward kind invalid: '+dup.kind);
  }
  return fails;
});
```

- [ ] **Step 4: 테스트 실행** — `window.__catalogSelfTest()` PASS 확인.
- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat(#2): 열매 보상 롤(색=등급) + 수확(게이지 보존) + 중복 스킬→크레딧"
```

---

## Task 4: 물/비료 인벤토리 + 투입(버프) — 일일카운터 폐기

**Files:**
- Modify: `index.html` 4526~4533 (일일카운터 제거), 10054~10080 (`doWaterPot`/`doFertPot`), 9963 (`renderNurseryRes`)
- 보상원: 5159~5175 (`rollExplorationRewards`), 3554 (`box_growth_supply`) — 물/비료 드롭 추가

**Interfaces:**
- Consumes: `state.care`(Task1), `nurseryTick`(Task2).
- Produces: `applyCare(p, res)` — `state.care[res]` 1 소모 → 해당 버프 += `CARE_BUFF_PER_USE`(상한 1). `grantCareReward(res,count)` 보상 헬퍼.

- [ ] **Step 1: 일일카운터 함수 제거** — 4526~4533 (`nurseryToday`/`nurseryDaily`/`nurseryWaterLeft`/`nurseryFertLeft`)와 `state.nursery_daily` 참조 삭제. (검색해 잔존 호출 없음 확인: `nurseryWaterLeft`/`nurseryFertLeft`/`nurseryDaily`.)

- [ ] **Step 2: `applyCare` + 보상 헬퍼 작성** (양육 함수군):

```js
function applyCare(p, res){
  if(!state.care) state.care={water:0,fert:0};
  if((state.care[res]||0) <= 0) return false;
  ensureNurseryFields(p);
  nurseryTick(p, Date.now());                 // 투입 전 시간 반영
  state.care[res] -= 1;
  const key = res==='water' ? 'waterBuff' : 'fertBuff';
  p.nursery[key] = Math.min(1, p.nursery[key] + CARE_BUFF_PER_USE);
  return true;
}
function grantCareReward(res, count){ if(!state.care) state.care={water:0,fert:0}; state.care[res]=(state.care[res]||0)+count; }
```

- [ ] **Step 3: `doWaterPot`/`doFertPot` 교체** (10054~10080) — 일일한도 대신 인벤토리 소모:

```js
function doWaterPot(idx){
  const p=(state.plants||[])[idx]; if(!p) return;
  if(!applyCare(p,'water')){ toast('💧 물이 없습니다. 탐사·전투·상자로 모으세요'); return; }
  saveState(); sfx.heal(); openNurseryDetail(idx); renderNurseryGrid(); renderNurseryRes();
  toast('💧 물을 주었습니다 (충전 속도↑)');
}
function doFertPot(idx){
  const p=(state.plants||[])[idx]; if(!p) return;
  if(!applyCare(p,'fert')){ toast('🌿 비료가 없습니다. 탐사·전투·상자로 모으세요'); return; }
  saveState(); sfx.heal(); openNurseryDetail(idx); renderNurseryGrid(); renderNurseryRes();
  toast('🌿 비료를 주었습니다 (등급 확률↑)');
}
```

- [ ] **Step 4: `renderNurseryRes` 교체** (9963) — 보유 물/비료 인벤토리 표시:

```js
function renderNurseryRes(){
  const el=document.querySelector('#nurseryRes'); if(!el) return;
  const c=state.care||{water:0,fert:0};
  el.innerHTML=`<span>💧 물 ${c.water}</span><span>🌿 비료 ${c.fert}</span>`;
}
```

- [ ] **Step 5: 보상원에 물/비료 추가** — `rollExplorationRewards` (5160 카드드롭 근처)에 추가:

```js
  // 양육 재료(물/비료) 드롭 — 탐사 성공 보상
  if(Math.random() < 0.5){ const c=2+Math.floor(Math.random()*3); grantCareReward('water', c); rewards.items.push({ care:'water', count:c, name:'물', icon:'💧' }); }
  if(Math.random() < 0.3){ const c=1+Math.floor(Math.random()*2); grantCareReward('fert', c);  rewards.items.push({ care:'fert',  count:c, name:'비료', icon:'🌿' }); }
```
(탐사 결과 렌더가 `rewards.items`의 `care` 항목을 표시하도록 표시부에서 `it.care?`(아이콘+이름+count) 분기 한 줄 추가 — 탐사 결과 렌더 위치는 `lastExResult` 사용처에서 확인.)

- [ ] **Step 6: preview 검증** — 양육 탭 열기, 물/비료 0이면 버튼이 "없습니다" 토스트, `state.care.water=5` 주입 후 물주기 → 버프 반영·인벤토리 감소 확인.
Run: preview_eval `state.care={water:5,fert:5}; openNursery(); 'ok'` 후 물주기 클릭 → snapshot.

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(#2): 물/비료 인벤토리화(일일카운터 폐기) + 보상 드롭 + 투입=버프"
```

---

## Task 5: 양육 UI — 게이지/열매/수확 개편

**Files:**
- Modify: `index.html` 9970 (`renderNurseryGrid`), 10007 (`openNurseryDetail`), 10092 (`doHarvestPot`)
- CSS: `index.html` 1310~1384 (`.pot-*`) 근처에 게이지·열매 클래스 추가

**Interfaces:**
- Consumes: `nurseryTick`, `harvestPot`, `FRUIT_RARITY_COLOR`, `openRewardReveal`(Task6 — 이 task는 임시로 toast, Task7에서 연결).

- [ ] **Step 1: `openNursery`에 틱 적용** (9956) — 화면 열 때 경과시간 반영:

```js
function openNursery(){
  (state.plants||[]).forEach(p => { ensureNurseryFields(p); nurseryTick(p, Date.now()); });
  saveState();
  renderNurseryGrid(); renderNurseryRes();
  show('#nurseryScreen');
}
```

- [ ] **Step 2: `renderNurseryGrid` 개편** (9970~10005) — 게이지 바(버프색 그라데이션·꽉참 붉음) + 식물에 달린 열매(색):

```js
function renderNurseryGrid(){
  const grid=document.querySelector('#nurseryGrid'); if(!grid) return;
  const cap=potCapacity(); const plants=state.plants||[]; let html='';
  for(let i=0;i<NURSERY_POTS;i++){
    const delay=((i%6)*0.4).toFixed(2);
    if(i>=cap){ const lvNeed=potUnlockLevel(i);
      html+=`<div class="pot-slot locked"><div class="pot-vessel"></div><div class="lock-badge"><span class="lb-ic" data-pic="gear" data-size="18px"></span></div><div class="pot-name">잠긴 화분</div><div class="pot-stage">Lv.${lvNeed} 해금</div></div>`; continue; }
    const p=plants[i];
    if(!p){ html+=`<div class="pot-slot empty"><div class="pot-vessel"></div><div class="pot-name">빈 화분</div><div class="pot-stage">식물 없음</div></div>`; continue; }
    ensureNurseryFields(p); nurseryTick(p, Date.now());
    const n=p.nursery; const st=seedTypeOf(p), el=p.element||'grass';
    const sprite=composePlantSvg(st, p.growth_stage||'seed', el, {size:78, grade:p.grade, awakened:p.awakened});
    const canFruit = nurseryMaxFruits(p) > 0;
    const full = canFruit && n.ripe.length >= n.maxFruits;
    const gaugePct = Math.round((full?1:n.gauge)*100);
    const buff = Math.min(1,(n.waterBuff+n.fertBuff)/2);
    const gaugeCol = full ? '#ff5a4a' : `hsl(${150 - buff*40}, ${55+buff*30}%, ${50+buff*8}%)`; // 버프↑=진하고 붉은녹
    const fruitDots = n.ripe.map(fr=>`<span class="pot-fruit-dot" style="--fc:${FRUIT_RARITY_COLOR[fr.rarity]}"></span>`).join('');
    html+=`<div class="pot-slot filled ${n.ripe.length?'fruiting':''}" data-nursery-idx="${i}" onclick="openNurseryDetail(${i})">
      <div class="pot-vessel"></div>
      ${n.ripe.length?`<div class="pot-fruits">${fruitDots}</div>`:''}
      <div class="pot-sprite" style="animation-delay:${delay}s">${sprite}</div>
      <div class="pot-name">${plantDisplayName(p)}</div>
      ${canFruit?`<div class="pot-gauge"><div class="pot-gauge-fill" style="width:${gaugePct}%;background:${gaugeCol}"></div></div>
      <div class="pot-stage">${full?'🍎 꽉 참 — 수확!':(n.ripe.length?`🍎 ${n.ripe.length}/${n.maxFruits}`:`충전 ${gaugePct}%`)}</div>`
      :`<div class="pot-stage">${growthStageName(p.growth_stage||'seed')} · 성장체부터 열매</div>`}
    </div>`;
  }
  grid.innerHTML=html;
  if(window.hydratePixIcons) hydratePixIcons(grid);
}
```

- [ ] **Step 3: CSS 추가** (1384 `.pot-*` 근처):

```css
.pot-gauge{height:6px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:3px 6px 1px}
.pot-gauge-fill{height:100%;border-radius:99px;transition:width .4s ease}
.pot-fruits{position:absolute;top:6px;right:6px;display:flex;gap:3px;flex-wrap:wrap;max-width:46px;justify-content:flex-end;z-index:3}
.pot-fruit-dot{width:11px;height:11px;border-radius:50%;background:var(--fc);border:1.5px solid #fff;box-shadow:0 0 6px var(--fc),0 0 2px var(--fc);}
```

- [ ] **Step 4: `openNurseryDetail` 개편** (10007~10047) — 게이지·열매·물/비료(보유량)·수확 버튼. `fruiting` 판정을 `n.ripe.length>0`로, 일일한도 howto 제거:

핵심 변경(전체 본문 교체) — `wPct/fPct`→버프%, 버튼 라벨에 보유량, 수확 버튼은 `n.ripe.length` 개. (구체 HTML은 Step2 톤과 동일하게: 게이지 + 열매 dots + `💧 물 주기 (보유 ${state.care.water})` / `🌿 비료 (보유 ${state.care.fert})` + `n.ripe.length>0`일 때 `🧺 수확하기 (${n.ripe.length}개)` 버튼 + `💎 즉시 가속` (미네랄). howto는 "💧물=충전 속도↑ · 🌿비료=등급 확률↑ · 성장체부터 열매" 로 교체.)

- [ ] **Step 5: `doHarvestPot` 교체** (10092) — `harvestPot` 호출 + (임시) 결과 toast(Task7에서 RewardReveal 연결):

```js
function doHarvestPot(idx){
  const p=(state.plants||[])[idx];
  if(!p) return; ensureNurseryFields(p);
  if(!p.nursery.ripe.length){ toast('수확할 열매가 없습니다'); return; }
  const count=p.nursery.ripe.length;
  const rewards=harvestPot(p);
  saveState(); sfx.win(); closeNurseryDetail(); renderNurseryGrid(); renderNurseryRes();
  openRewardReveal({ kind:'fruit', items:rewards });   // Task6에서 정의 — 그 전엔 임시 toast로 대체
  toast(`🧺 열매 ${count}개 수확!`);
}
```
(Task6 전이면 `openRewardReveal` 줄을 주석 처리하고 toast만 — Task6/7에서 활성화.)

- [ ] **Step 6: preview 검증** — `state.care={water:9,fert:9}`, 성장체 식물에 물/비료 투입 → 게이지 색 진해짐, 시간 점프(`p.nursery.lastTick -= 5*3600000; openNursery()`)로 열매 dots 색 표시, 수확 버튼 동작, 게이지 보존 확인. snapshot/screenshot.

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(#2): 양육 UI 개편 — 시간 게이지(버프색/붉음) + 색별 열매 + 수확(보존)"
```

---

## Task 6: 공통 RewardReveal 연출 컴포넌트

**Files:**
- Modify: `index.html` — 모달 DOM 1개 추가(다른 모달 근처), CSS 추가(연출), JS 함수 추가
- Test: preview 상호작용

**Interfaces:**
- Produces: `openRewardReveal({ kind, items, onDone })` — `kind`∈`'fruit'|'supply'|'expedition'`. `items` = 보상 객체 배열(`{label,icon,color,kind}` 또는 fruit의 경우 rarity 색). 배경 위 컨테이너(들) 등장 → 터치하면 순차 개봉 → 각 보상 공개 → 전부 열면 닫기 버튼/`onDone`.

- [ ] **Step 1: 모달 DOM 추가** — 기존 `#nurseryPopModal` 근처 HTML에:

```html
<div id="rewardRevealModal" class="modal-backdrop" style="display:none">
  <div class="rr-stage">
    <div class="rr-title" id="rrTitle"></div>
    <div class="rr-row" id="rrRow"></div>
    <div class="rr-hint" id="rrHint">컨테이너를 눌러 여세요</div>
    <button class="btn primary" id="rrDone" style="display:none;width:100%;margin-top:10px" onclick="closeRewardReveal()">완료</button>
  </div>
</div>
```

- [ ] **Step 2: CSS 추가** — 컨테이너 모양(보급박스/탐사상자/열매), 흔들림·개봉 팝:

```css
#rewardRevealModal .rr-stage{background:radial-gradient(120% 100% at 50% 0%,rgba(40,60,80,.6),rgba(10,16,24,.92));border:1.5px solid rgba(120,200,255,.25);border-radius:18px;padding:20px 16px;max-width:340px;width:90%;text-align:center}
.rr-title{font-size:15px;font-weight:900;color:#d6ffe6;margin-bottom:14px}
.rr-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;min-height:96px;align-items:center}
.rr-item{width:72px;cursor:pointer;user-select:none}
.rr-box{width:64px;height:64px;margin:0 auto;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:34px;animation:rrShake 1.4s ease-in-out infinite}
.rr-item.opened .rr-box{animation:rrPop .4s cubic-bezier(.2,1.5,.4,1) forwards}
.rr-item.opened{cursor:default}
.rr-box.fruit{border:2.5px solid var(--rc);box-shadow:0 0 12px var(--rc),inset 0 0 8px rgba(255,255,255,.2)}
.rr-box.supply{background:linear-gradient(160deg,#caa15a,#8a6a32);border:2px solid #e8c878}
.rr-box.expedition{background:linear-gradient(160deg,#5a8bca,#324f8a);border:2px solid #78a8e8}
.rr-label{font-size:10.5px;color:#cfe;margin-top:6px;min-height:26px;opacity:0;transition:opacity .3s}
.rr-item.opened .rr-label{opacity:1}
.rr-hint{font-size:11px;color:#9fd9b6;margin-top:12px}
@keyframes rrShake{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes rrPop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1.08)}}
```

- [ ] **Step 3: JS 함수 추가**:

```js
let _rrState=null;
function rrContainer(kind, item){
  if(kind==='fruit'){ const c=item.color||'#e6edf2'; return `<div class="rr-box fruit" style="--rc:${c}">🍎</div>`; }
  if(kind==='supply') return `<div class="rr-box supply">🎁</div>`;
  return `<div class="rr-box expedition">📦</div>`;
}
function openRewardReveal(opts){
  const items=(opts&&opts.items)||[]; if(!items.length){ return; }
  _rrState={ kind:opts.kind||'fruit', items, opened:0, onDone:opts.onDone||null };
  const titleMap={ fruit:'🍎 열매 개봉', supply:'🎁 보급 개봉', expedition:'📦 탐사 결과' };
  document.querySelector('#rrTitle').textContent=titleMap[_rrState.kind]||'보상';
  const row=document.querySelector('#rrRow');
  row.innerHTML=items.map((it,i)=>`<div class="rr-item" data-rr="${i}" onclick="rrOpenOne(${i})">${rrContainer(_rrState.kind,it)}<div class="rr-label"></div></div>`).join('');
  document.querySelector('#rrHint').style.display='';
  document.querySelector('#rrDone').style.display='none';
  show('#rewardRevealModal');
}
function rrOpenOne(i){
  const it=_rrState.items[i]; const node=document.querySelector(`#rrRow .rr-item[data-rr="${i}"]`);
  if(!it||!node||node.classList.contains('opened')) return;
  node.classList.add('opened');
  node.querySelector('.rr-box').innerHTML=it.icon||'✨';
  node.querySelector('.rr-label').textContent=it.label||'';
  if(it.color) node.querySelector('.rr-box').style.setProperty('--rc',it.color);
  sfx && sfx.win && sfx.win();
  _rrState.opened++;
  if(_rrState.opened>=_rrState.items.length){
    document.querySelector('#rrHint').style.display='none';
    document.querySelector('#rrDone').style.display='';
  }
}
function closeRewardReveal(){ hide('#rewardRevealModal'); const cb=_rrState&&_rrState.onDone; _rrState=null; if(cb) cb(); }
```

- [ ] **Step 4: preview 검증** — `openRewardReveal({kind:'fruit',items:[{label:'물 ×3',icon:'💧',color:'#5fd56a'},{label:'전설 스킬',icon:'✨',color:'#ff9a3c'}]})` → 컨테이너 2개 흔들림, 각 클릭 시 개봉·라벨, 둘 다 열면 완료 버튼. screenshot.

- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat(#2): 공통 RewardReveal 개봉 연출 컴포넌트(열매/보급/탐사)"
```

---

## Task 7: 연결 — 수확·보급상자·탐사결과를 RewardReveal로 통일

**Files:**
- Modify: `index.html` `doHarvestPot`(Task5 — 주석 해제), 보급상자 개봉 함수, 탐사 결과 표시 함수

**Interfaces:**
- Consumes: `openRewardReveal`(Task6), `harvestPot` 반환.

- [ ] **Step 1: 수확 연결** — Task5 `doHarvestPot`의 `openRewardReveal({ kind:'fruit', items:rewards })` 활성화(주석이면 해제). rewards 항목은 이미 `{label,icon,color,kind}` 형태.

- [ ] **Step 2: 보급상자 개봉 연결** — 상점 보급상자 개봉 결과를 `openRewardReveal({kind:'supply', items:[...]})`로 표시. 개봉 함수(검색: `data-shop-box`/`rollShopBoxReward` 호출부)에서 기존 결과 toast/모달 대신 reveal 사용. 보상 객체를 `{label,icon}`로 매핑.

- [ ] **Step 3: 탐사 결과 연결** — 탐사 완료 결과 창(`lastExResult` 표시부)에서 보상 목록을 `openRewardReveal({kind:'expedition', items:[...]})`로 표시(또는 기존 결과창 유지 + "개봉" 버튼으로 진입). 종자·아이템·카드·물/비료를 `{label,icon}`로 매핑.

- [ ] **Step 4: preview 회귀 검증** — ① 수확 → fruit reveal ② 보급상자 구매·개봉 → supply reveal ③ 탐사 1회 → expedition reveal. 각 정상 개봉·닫힘·보상 반영 확인. 콘솔 에러 0.

- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat(#2): 수확·보급상자·탐사결과를 공통 RewardReveal로 통일"
```

---

## Task 8: 마감 — 회귀 검증 + 문서 갱신

**Files:**
- Modify: `index.html`(잔존 참조 정리), `docs/master-roadmap.md`, `CLAUDE.md`/`docs/CHANGELOG.md`

- [ ] **Step 1: 잔존 참조 스캔** — `nursery_daily`, `NURSERY_DAILY`, `NURSERY_WATER_NEED`, `fruitReady`, `n.stage`, `nurserySkillReward`(여전히 보상롤서 쓰면 유지) 잔존 호출 검색해 정리. `openFruitBag`/`openFruit`/`showFruitReveal`/`nursery_fruits`는 RewardReveal로 대체됐으면 제거 또는 레거시 미개봉분 1회 흡수 처리.
- [ ] **Step 2: 전체 셀프테스트** — `window.__catalogSelfTest()` 전부 PASS(fails 빈 배열). 콘솔 에러 0.
- [ ] **Step 3: preview 통합 시나리오** — 새 세이브 + 기존 세이브(레거시 nursery 있는 것) 둘 다 양육 탭 정상, 마이그레이션 무회귀 확인.
- [ ] **Step 4: 문서 갱신** — 로드맵 §1 #2 상태 ✅/구현 완료 항목 체크, 결정 로그에 구현 완료 한 줄, `docs/CHANGELOG.md` 맨 위 상세 로그, spec §8 "개편 후"를 실제 구현과 일치하게.
- [ ] **Step 5: 커밋(코드+문서 함께)**

```bash
git add index.html docs/
git commit -m "feat(#2): 양육/열매 시스템 개편 완료 — 회귀 검증 + 문서 갱신"
```

---

## Self-Review (작성자 점검 결과)

**Spec 커버리지:** §2 양육경제→Task4(보상드롭) · §3 게이지/단계점증/환경레버→Task1·2·5 · §3-4 수확 보존→Task3·5 · §4 5색 희귀도/색=등급→Task2·3·5 · §4-2 본인스킬 무제한·중복크레딧→Task3 · §5 RewardReveal→Task6·7 · §6 UI/데이터/마이그레이션→Task1·5 · §8 기존개편→전 Task. 누락 없음.

**Placeholder 스캔:** Task5 Step4(openNurseryDetail HTML 전체)는 톤 지침으로 축약 — 실행 시 Step2 패턴을 따라 완전 작성. 그 외 실제 코드 제공.

**타입 일관성:** `p.nursery.{gauge,ripe,maxFruits,lastTick,waterBuff,fertBuff,potQuality}` / `state.care.{water,fert}` / 보상객체 `{kind,label,icon,color,payload}` — Task 전체에서 동일 사용 확인. `rollFruitRarity`/`nurseryTick`/`rollFruitReward`/`harvestPot`/`applyCare`/`openRewardReveal` 시그니처 일치.

**범위:** 식물/화분 2레이어(#12·#3)는 제외(열매 오버레이로 대체) — 단일 plan 적정 범위.
