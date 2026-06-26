# 개체 컨셉 + 단계별 스킬 대규모 확장 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개체마다 컨셉(2축 블렌드+스토리)을 정하고, 그 컨셉에 맞는 스킬을 단계별로 대규모로 추가해 식물 다양성을 키운다.

**Architecture:** ① 엔진에 작은 메커니즘 5종 추가(출혈 회복감소·에너지 흡수·무기 속성부여·독 증폭·용족 브레스 충전) — 전부 **테스트 가능한 순수 헬퍼**로 만든 뒤 전투 코드에 배선. ② 컨셉 인프라(`CONCEPT_OVERRIDES`/`autoConcept`/`conceptOf`)를 추가하고 `SPECIES.desc`에 컨셉문+스토리 주입. ③ 콘텐츠는 **배치 단위**(개체 4~8개씩)로 컨셉→스토리→단계별 스킬을 정의해 `SKILL_LIB`/`SPECIES_CATALOG.stageSkills`에 멱등 주입. P0(엔진+인프라) 완성 후 콘텐츠 배치를 반복한다.

**Tech Stack:** 바닐라 JS 단일 파일 `index.html`(빌드 없음). 검증 = `window.__catalogSelfTest()`(반환 `fails[]`) + preview 서버 실전투. 콘텐츠 대량 생성 = node `scripts/gen-individuals.js` 계열.

## Global Constraints

- **단일 파일:** 모든 코드·데이터는 `index.html` 인라인. 새 파일 만들지 않음(스크립트 제외).
- **검증 판정 = 반환값:** preview 콘솔 버퍼는 리로드해도 옛 에러 잔존 → 반드시 `__catalogSelfTest()` **반환 배열 길이**로 판정. `__test` fn 내부에서 `return fails` 금지 — `if(fails.length) throw new Error(fails.join(' | '))`.
- **엔진 제약(불변):** 스킬당 `selfBuff`·`enemyDebuff` 각 1개. 화상/출혈 pct 0.06·중독 0.05·관통 0.5. DoT 스택 상한 `DOT_STACK_CAP=4`.
- **변이형 중복 회피:** 흡혈=포식 전용(다른 성격엔 안 줌), 관통=무기, 중독=독성. 정말 특수할 때만 교차.
- **단순 스펙업 금지:** 새 스킬은 역할(견제/대박/셋업/유지/회피) + 비용 스펙트럼(0~3)으로 차별화.
- **버섯 7종:** 컨셉·스토리·스킬은 다양화하되 스탯 보정 제외(저스탯 전용 밸런스 유지).
- **멱등:** 모든 주입 패스는 base에서 재계산 → 재실행 안전.
- **preview:** 정적 서버라 HMR 없음 → 수정 후 `location.reload()`. 안 풀리면 `preview_stop`+`preview_start`. 전투 부팅 = `claimStarterSeed(true)`→`plantSeedFromBag(...)`→`state.activeId`→`startBattle()`, 측정 전 다른 `.screen` 숨김.
- **커밋:** 내가 만진 파일만 선택 스테이징(`git add <경로>`). `git add -A` 금지. 코드+문서(로드맵/CHANGELOG) 함께 커밋.

**참조 설계:** [docs/superpowers/specs/2026-06-26-individual-concept-skill-expansion-design.md](../specs/2026-06-26-individual-concept-skill-expansion-design.md)

**⚠️ #14 베이스라인(2026-06-26 갱신):** 다른 세션이 **속성 시그니처 성질 시스템(#14)**을 먼저 구현·푸시함(HEAD 77a3517). 변경점:
- `ELEMENTS[el].signature`(불=burn·물=wet·풀=regen·대지=pierce·바람=flurry·번개=shock(감전 스턴)·빙결=freeze(스택→스턴)) + `ELEMENT_SIGNATURE`(3780) + `SIG`(3790) + `sigOf(s)`(3800). 속성기/속성발현 스킬은 `signature:` 필드를 가짐.
- **스턴 = `skipNext`**(이미 구현). 유닛 신규 필드 `freezeStacks`/`freezeTurns`/`zapNoRegen`(makeCombatant ~11161).
- ⚠️ **`rampStack` + `kind:'ramp'` 버프는 이미 점유됨**(공통 카드 매턴 훅 `applyCardTurnHooks` 11096 = 굴광성장, 매턴 재계산·필터). → **T5 용족 브레스는 `rampStack` 재사용 금지, 별도 `breathStack`/`kind:'breath'` 사용.**
- **통합점:** 속성 축 콘텐츠 스킬(T6/T7)은 element signature와 싸우지 말고 `signature:` 필드를 세팅해 #14에 합류. 내 P0(출혈healcut·energyDrain·무기infuse·독amp·용족breath)는 속성 시그니처와 직교(form/성격/컨셉 축).

**주요 코드 위치(현행 77a3517):** `ARCHETYPES`/`applyVariantIdentity` ~5350 부근 · `FORM_SKILLS` ~4960 · `SKILL_LIB` ind 스킬 ~4290+ · `SPECIES_CATALOG` stageSkills 3500+ · `applySkill` 회복 11680·infuse 11687·scaleStack 11688·흡혈 11763·steal 11764 · `tickStatuses` 11792(재생 11795) · `makeCombatant` 초기화 11161(rampStack 옆에 breathStack 추가) · 공통 매턴 훅 11096 · 셀프테스트 블록(`window.__test`) ~12900+. **편집 전 매번 Grep/Read로 현행 라인 재확인**(파일이 세션 중 이동).

---

## Task 1: 출혈 → 회복 감소 (전역)

**Files:**
- Modify: `index.html` — 새 헬퍼 추가(`tickStatuses` 정의부 위, ~11716 직전), 회복 3사이트 배선(11616·11693·11720)
- Test: `index.html` 셀프테스트 블록(~12860 부근에 `window.__test` 추가)

**Interfaces:**
- Produces: `BLEED_HEAL_MULT`(const), `healMult(u)` → `number`(출혈 dot 있으면 `BLEED_HEAL_MULT`, 없으면 1)

- [ ] **Step 1: 실패 테스트 작성** — 셀프테스트 블록에 추가:

```js
window.__test('engine: bleed halves healing (healMult)', function(){
  const noBleed = { dots:[] };
  const bleeding = { dots:[{kind:'bleed',dmg:5,turns:2}] };
  __eq(healMult(noBleed), 1, 'no bleed → 1');
  __eq(healMult(bleeding), 0.5, 'bleed → 0.5');
});
```

- [ ] **Step 2: 실패 확인** — preview에서 `location.reload()` 후 `__catalogSelfTest()` 실행. 기대: 반환 배열에 `engine: bleed halves healing` 항목 포함(`healMult is not defined`).

Run (preview_eval): `JSON.stringify(window.__catalogSelfTest().filter(f=>f.includes('healMult')))`
Expected: 길이 1 (실패 1건)

- [ ] **Step 3: 헬퍼 구현** — `async function tickStatuses(u, side){` 정의 바로 위에 삽입:

```js
const BLEED_HEAL_MULT = 0.5; // 출혈 = 지속피해 + 회복 감소(전역 정체성)
function healMult(u){ return (u && u.dots && u.dots.some(d=>d.kind==='bleed')) ? BLEED_HEAL_MULT : 1; }
```

- [ ] **Step 4: 회복 3사이트 배선** — 각 회복량에 `* healMult(대상)` 곱:
  - 11616 `s.heal`: `const healPct = s.heal * (s.elem ? (1 + (a.elem||0)/100) : 1) * effMul * healMult(a);`
  - 11693 흡혈: `if(ls>0 && dm>0){ const h=Math.round(dm*ls*healMult(a)), before=a.hp; ...`
  - 11720 재생(`regenPct`): `const h=Math.round(u.max*u.passives.regenPct*healMult(u)), before=u.hp;`

- [ ] **Step 5: 통과 확인** — reload 후 `JSON.stringify(window.__catalogSelfTest())` → 반환 배열 길이 0.

- [ ] **Step 6: preview 실전투 확인** — 출혈 건 적이 회복 스킬 써도 회복량이 줄어드는지 blog/HP로 확인(선택, 헬퍼 테스트로 충분하면 생략 가능).

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(#1-A): 출혈에 회복 감소 전역 적용(healMult)"
```

---

## Task 2: 에너지 흡수 (탐식)

**Files:**
- Modify: `index.html` — 헬퍼 `drainEnergy` 추가(Task1 헬퍼 옆), `applySkill` steal 직후(~11694) 배선
- Test: 셀프테스트 블록

**Interfaces:**
- Consumes: 없음
- Produces: `drainEnergy(a, d, amount)` → `number`(실제 이전된 에너지). `a.energy`↑·`d.energy`↓, 양쪽 0/max 클램프. 스킬 필드 `energyDrain:n`.

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('engine: drainEnergy moves energy capped', function(){
  const a = { energy:1, energyMax:5 }, d = { energy:3 };
  const moved = drainEnergy(a, d, 4);
  __eq(moved, 3, 'limited by d.energy');
  __eq(a.energy, 4, 'a gained 3'); __eq(d.energy, 0, 'd drained');
  const a2 = { energy:4, energyMax:5 }, d2 = { energy:3 };
  drainEnergy(a2, d2, 4); __eq(a2.energy, 5, 'a capped at max');
});
```

- [ ] **Step 2: 실패 확인** — `JSON.stringify(window.__catalogSelfTest().filter(f=>f.includes('drainEnergy')))` 길이 1.

- [ ] **Step 3: 헬퍼 구현** — `healMult` 옆에 삽입:

```js
function drainEnergy(a, d, amount){ const se=Math.min(d.energy||0, amount); d.energy=Math.max(0,(d.energy||0)-se); a.energy=Math.min(a.energyMax,(a.energy||0)+se); return se; }
```

- [ ] **Step 4: applySkill 배선** — 11694 `if(s.steal){...}` 줄 바로 다음에 추가:

```js
    if(s.energyDrain){ const se=drainEnergy(a,d,s.energyDrain); if(se>0){ effectNotes.push('상대의 에너지를 흡수하였다!'); blog(`▶ 🔋 에너지 ${se} 흡수`); } }
```

- [ ] **Step 5: 통과 확인** — `window.__catalogSelfTest()` 반환 길이 0.

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "feat(#1-A): 에너지 흡수 필드(energyDrain) + drainEnergy 헬퍼"
```

---

## Task 3: 무기형 속성 부여 (infuse 일반화)

**Files:**
- Modify: `index.html` — `applySkill` infuse 적용부(11623) + 온히트부(11703) 일반화, 헬퍼 추가
- Test: 셀프테스트 블록

**Interfaces:**
- Consumes: 없음
- Produces: `s.infuse:{kind, pct, turns}`에서 `kind==='element'` 지원. 버프 `kind:'element_infuse'`. 온히트 추가피해 = `elemInfuseBonus(a)` → `number`(없으면 0).

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('engine: element_infuse bonus from buff', function(){
  const none = { buffs:[], elem:20 };
  const armed = { buffs:[{kind:'element_infuse', pct:0.5, turns:3}], elem:20 };
  __eq(elemInfuseBonus(none), 0, 'no buff → 0');
  __eq(elemInfuseBonus(armed), 10, 'elem 20 × 0.5 = 10');
});
```

- [ ] **Step 2: 실패 확인** — filter `elemInfuseBonus` 길이 1.

- [ ] **Step 3: 헬퍼 구현** — Task1 헬퍼 옆:

```js
function elemInfuseBonus(a){ const b=(a.buffs||[]).find(x=>x.kind==='element_infuse'); return b ? Math.round((a.elem||0)*b.pct) : 0; }
```

- [ ] **Step 4: infuse 적용부 일반화(11623)** — 기존 poison 전용을 kind 분기로 교체:

```js
  if(s.infuse){
    if(s.infuse.kind==='element'){ a.buffs = a.buffs.filter(b=>b.kind!=='element_infuse'); a.buffs.push({kind:'element_infuse', pct:round2(s.infuse.pct*effMul), turns:s.infuse.turns}); effectNotes.push('무기에 속성이 깃들었다!'); blog(`▶ ✨ 속성 부여!(${s.infuse.turns}턴)`); }
    else { a.buffs = a.buffs.filter(b=>b.kind!=='poison_infuse'); a.buffs.push({kind:'poison_infuse', pct:round2(s.infuse.pct*effMul), turns:s.infuse.turns}); effectNotes.push('독이 묻어나기 시작했다!'); blog(`▶ ☠️ 독 묻히기!(${s.infuse.turns}턴)`); }
  }
```

- [ ] **Step 5: 온히트 추가피해 배선(11703 부근)** — `infuseBuff`(독) 처리 다음에 element 분기 추가:

```js
    const elemBonus = elemInfuseBonus(a);
    if(elemBonus>0 && dm>0){ const eb=Math.round(elemBonus*(s.elem?1:1)); d.hp=Math.max(0,d.hp-eb); popup(tgtSide,'-'+eb,false); effectNotes.push('속성 일격!'); blog(`▶ ✨ 속성 부여 추가피해 ${eb}`); }
```

- [ ] **Step 6: 통과 확인** — `window.__catalogSelfTest()` 반환 길이 0. 기존 `toxic infuse` 테스트(13285~)도 통과 유지.

- [ ] **Step 7: preview 확인** — element_infuse 버프 주입 후 공격 시 추가피해 blog 출력 확인.

- [ ] **Step 8: 커밋**

```bash
git add index.html
git commit -m "feat(#1-A): 무기형 속성 부여(infuse kind:element) + elemInfuseBonus"
```

---

## Task 4: 독성 자기 독 증폭 (poison_amp)

**Files:**
- Modify: `index.html` — 헬퍼 추가, selfBuff 적용부에 `poisonAmp` 분기, dot/infuse 데미지에 배수 곱
- Test: 셀프테스트 블록

**Interfaces:**
- Produces: 스킬 필드 `poisonAmp:{mult, turns}`. 버프 `kind:'poison_amp'`. `poisonAmpMult(a)` → `number`(없으면 1).

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('engine: poison_amp multiplies poison', function(){
  __eq(poisonAmpMult({buffs:[]}), 1, 'none → 1');
  __eq(poisonAmpMult({buffs:[{kind:'poison_amp', mult:1.5, turns:2}]}), 1.5, 'amp → 1.5');
});
```

- [ ] **Step 2: 실패 확인** — filter `poison_amp` 길이 1.

- [ ] **Step 3: 헬퍼 구현**

```js
function poisonAmpMult(a){ const b=(a&&a.buffs||[]).find(x=>x.kind==='poison_amp'); return b ? b.mult : 1; }
```

- [ ] **Step 4: poisonAmp 버프 부여** — selfBuff 적용부(11617) 다음에 추가:

```js
  if(s.poisonAmp){ a.buffs = a.buffs.filter(b=>b.kind!=='poison_amp'); a.buffs.push({kind:'poison_amp', mult:s.poisonAmp.mult, turns:s.poisonAmp.turns}); spriteFx(side,'buff'); fxPopup(side,'🔺 독','buf'); effectNotes.push('독이 짙어졌다!'); blog(`▶ ☠️ 독 위력 ${Math.round((s.poisonAmp.mult-1)*100)}%↑(${s.poisonAmp.turns}턴)`); }
```

- [ ] **Step 5: 독 데미지에 배수 곱** — poison dot 부여 3곳에 `poisonAmpMult(a)` 곱:
  - 11702 `s.dot`: poison일 때만 — `const ampMul=(s.dot.kind==='poison')?poisonAmpMult(a):1; const ddmg=Math.max(1,Math.round(effStat(a,'atk')*s.dot.pct*effMul*ampMul));`
  - 11704 infuse 온히트: `const pd=Math.max(1,Math.round(effStat(a,'atk')*infuseBuff.pct*poisonAmpMult(a)));`
  - 11711 (else 분기 dot): poison이면 `*poisonAmpMult(a)` 동일 적용.

- [ ] **Step 6: 통과 확인** — 반환 길이 0.

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(#1-A): 독성 자기 독 증폭(poisonAmp) — 독 데미지 배수"
```

---

## Task 5: 용족 브레스 충전 (rampStack / breathScale)

**Files:**
- Modify: `index.html` — 헬퍼 추가, `ramp` 충전 스킬 처리, `breathScale` power 스케일 + 소비
- Test: 셀프테스트 블록

**Interfaces:**
- Produces: 신규 유닛 필드 `breathStack`. 스킬 필드 `breathCharge:{atkPct, cap}`(충전: breathStack++ & `kind:'breath'` atk 버프) + `breathScale:true`(power가 breathStack에 비례, 발동 시 소비). `breathPowerMult(u)` → `number`. (⚠️ `rampStack`/`kind:'ramp'`는 #14 점유 — 재사용 금지)

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('engine: breathPowerMult scales with breathStack', function(){
  __eq(breathPowerMult({breathStack:0}), 1, '0 stacks → 1');
  __eq(breathPowerMult({breathStack:3}), 1.6, '3 stacks → 1+0.2*3');
});
```

- [ ] **Step 2: 실패 확인** — filter `breathPowerMult` 길이 1.

- [ ] **Step 3: 헬퍼 구현**

```js
const BREATH_PER_STACK = 0.2;
function breathPowerMult(u){ return 1 + BREATH_PER_STACK*(u.breathStack||0); }
```
> ⚠️ `rampStack`/`kind:'ramp'`는 #14 카드 매턴 훅이 점유 → **`breathStack`/`kind:'breath'` 신설**(별개 필드).

- [ ] **Step 4a: breathStack 초기화** — `makeCombatant`의 유닛 초기화(11161 `...scaleStack:0, rampStack:0, freezeStacks:0...`)에 `breathStack:0,` 추가.

- [ ] **Step 4b: breathCharge 충전 스킬 처리** — scaleStack 처리부(`if(s.scaleStack)` ~11688) 다음에 추가:

```js
  if(s.breathCharge){ const cap=s.breathCharge.cap||4; a.breathStack=Math.min(cap,(a.breathStack||0)+1); const ap=round2(s.breathCharge.atkPct*a.breathStack); a.buffs=a.buffs.filter(b=>b.kind!=='breath'); a.buffs.push({kind:'breath', stat:'atk', pct:ap, turns:99}); spriteFx(side,'buff'); fxPopup(side,'🔺 충전','buf'); effectNotes.push('브레스를 모은다!'); blog(`▶ 🐉 브레스 충전 ${a.breathStack}겹! 공격 ${Math.round(ap*100)}%↑`); }
```

- [ ] **Step 5: breathScale power 스케일 + 소비** — Grep으로 power 계산부(`const normal = attackStat * s.power / 100;`)를 찾아 유효 power로 교체:

```js
    const breathMul = s.breathScale ? breathPowerMult(a) : 1;
    const normal = attackStat * (s.power * breathMul) / 100;
```
  그리고 데미지 적용(`d.hp = Math.max(0, d.hp - dm);`) 다음 줄에 소비:
```js
    if(s.breathScale && (a.breathStack||0)>0){ a.breathStack=0; a.buffs=a.buffs.filter(b=>b.kind!=='breath'); blog(`▶ 🐉 충전 방출!`); }
```

- [ ] **Step 6: 통과 확인** — 반환 길이 0. `kind:'breath'` 버프가 `effStat`의 `b.stat` 합산에 포함되는지(ramp/scale와 동일 패턴 → atk↑), `applyCardTurnHooks`가 breath를 필터 안 함(충전 유지) 확인.

- [ ] **Step 7: preview 확인** — breathCharge 2회 후 breathScale 스킬 위력이 1.4배로 들어가고 breathStack 0으로 소비되는지 blog 확인.

- [ ] **Step 8: 커밋**

```bash
git add index.html
git commit -m "feat(#1-A): 용족 브레스 충전(breathCharge/breathScale/breathStack)"
```

---

## Task 6: 컨셉 인프라 (CONCEPT_OVERRIDES / autoConcept / conceptOf) + 도감 노출

**Files:**
- Modify: `index.html` — `ARCHETYPE_OVERRIDES`/`archetypeOf`(5305–5310) 다음에 컨셉 레이어 추가, `applyVariantIdentity`(5341 `s.desc=`)에 스토리 합류
- Test: 셀프테스트 블록

**Interfaces:**
- Consumes: `archetypeOf(key)`, `SPECIES`, `ELEMENTS`, `SEED_TYPE_NAMES`, `FORMS`, `__hashStr`
- Produces:
  - `CONCEPT_AXES`(개체별 축 후보 산출), `autoConcept(key)` → `{primary, secondary}`(축 ∈ `'element'|'type'|'form'|'archetype'`, 둘은 서로 다름)
  - `CONCEPT_OVERRIDES = {}`(큐레이션 표, 초기 비움)
  - `conceptOf(key)` → `{primary, secondary, theme, story}`
  - `buildStory(key, concept)` → `string`(1문장)

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('concept: conceptOf blends two distinct axes + override wins', function(){
  const variantKeys = Object.keys(SPECIES).filter(k=>{ const s=SPECIES[k]; return s.baseVariants && s.baseVariants[0] && !s.legacy && s.seedType!=='mushroom'; });
  __ok(variantKeys.length>0, 'have variant keys');
  const c = conceptOf(variantKeys[0]);
  __ok(c.primary && c.secondary, 'has two axes');
  __ok(c.primary!==c.secondary, 'axes distinct');
  __ok(typeof c.story==='string' && c.story.length>0, 'has story');
  // override 우선
  CONCEPT_OVERRIDES.__t = { primary:'element', secondary:'form', theme:'t', story:'s' };
  __eq(conceptOf('__t').primary, 'element', 'override wins'); delete CONCEPT_OVERRIDES.__t;
});
```

- [ ] **Step 2: 실패 확인** — filter `conceptOf blends` 길이 1.

- [ ] **Step 3: 컨셉 레이어 구현** — `function archetypeOf(...)`(5310) 다음에 삽입:

```js
const CONCEPT_OVERRIDES = {}; // 사용자 큐레이션 표면 — { key:{primary,secondary,theme,story} }
function conceptAxes(key){ const s=SPECIES[key]||{}; const ax=['element','type']; if(s.baseVariants && s.baseVariants[0] && s.baseVariants[0]!=='normal') ax.push('form'); ax.push('archetype'); return ax; }
function autoConcept(key){ const ax=conceptAxes(key); const h=__hashStr(key); const i=h%ax.length; let j=(Math.floor(h/ax.length)+1)%ax.length; if(j===i) j=(j+1)%ax.length; return { primary:ax[i], secondary:ax[j] }; }
function axisLabel(key, axis){ const s=SPECIES[key]||{}; if(axis==='element') return (ELEMENTS[s.element]&&ELEMENTS[s.element].name)||s.element||'';
  if(axis==='type') return (SEED_TYPE_NAMES[s.seedType]||s.seedType||'');
  if(axis==='form'){ const f=s.baseVariants&&s.baseVariants[0]; return (FORMS[f]&&FORMS[f].name)||f||''; }
  if(axis==='archetype'){ const a=ARCHETYPES[archetypeOf(key)]; return a?a.name:''; } return ''; }
function buildStory(key, c){ const p=axisLabel(key,c.primary), s2=axisLabel(key,c.secondary); return `${p}을(를) 중심으로 ${s2}의 기질이 어우러진 개체.`; }
function conceptOf(key){ const o=CONCEPT_OVERRIDES[key]; if(o) return o; const a=autoConcept(key); const theme=`${axisLabel(key,a.primary)}·${axisLabel(key,a.secondary)}`; return { primary:a.primary, secondary:a.secondary, theme, story:buildStory(key,a) }; }
```

- [ ] **Step 4: 스토리 도감 노출** — `applyVariantIdentity` IIFE의 `s.desc = A.tone + ...`(5341)에 컨셉 스토리 합류:

```js
    const cc = conceptOf(key);
    s.desc = A.tone + '. ' + elName + '속성 ' + typeName + '이며 ' + formName + '으로 태어났다. ' + cc.story;
    s.concept = cc;
```

- [ ] **Step 5: 통과 확인** — 반환 길이 0. 기존 `identity: same type+el ... distinct concept` 테스트(12863) 통과 유지.

- [ ] **Step 6: 도감 확인(선택)** — `?dex=1` preview에서 변이 개체 desc에 스토리 문장이 붙는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(#1-A): 컨셉 인프라(conceptOf 2축 블렌드 + 스토리) + 도감 노출"
```

---

## Task 7: 콘텐츠 배치 #1 — 단계별 스킬 주입 파이프라인 + 첫 배치 (템플릿)

> 이 태스크가 **이후 모든 콘텐츠 배치의 형틀**이다. 배치 #2..N은 같은 구조로 개체 목록만 바꿔 반복(각 배치 = 컨셉+스토리+단계별 스킬 완결, 검증·커밋·도감 확인).

**Files:**
- Modify: `index.html` — `SKILL_LIB`에 배치 스킬 정의 추가, `SPECIES_CATALOG[key].stageSkills` 배열 확장(주입 패스 또는 직접)
- Create: `scripts/gen-concept-skills.js`(배치 데이터 → 멱등 주입; `gen-individuals.js` 패턴 계승)
- Test: 셀프테스트 블록

**Interfaces:**
- Consumes: `conceptOf(key)`, `ARCHETYPES`, 효과 경향 표(설계 §효과 경향), form 시그니처 표(설계 §변이형), 엔진 필드(Task1~5: `energyDrain`/`infuse.kind:element`/`poisonAmp`/`ramp`/`breathScale`)
- Produces: 배치 개체들의 `stageSkills`가 단계별 예산(새싹 간단1·유체+1·성장체+2·성체+2·완숙체 캡스톤)에 맞게 확장. 모든 신규 스킬 id는 `ALL_SKILLS`에 존재.

- [ ] **Step 1: 첫 배치 개체 선정(4개)** — 컨셉 다양성이 보이게 같은 (타입+속성) 다른 form/축 묶음으로 4개 선정. 예: `flame_trap`(포식·불 화초), `blaze_lance`(무기·불 화초) + 다른 슬롯 2개. 각 개체 `conceptOf(key)`로 주축/보조축 확인해 스킬 색깔 결정.

- [ ] **Step 2: 실패 테스트 작성** — 배치 개체의 단계별 스킬 수·해소·다양성 회귀:

```js
window.__test('content batch1: stageSkills expanded + resolve + diverse', function(){
  const batch = ['flame_trap','blaze_lance']; // Step1에서 확정한 4개로 교체
  const fails=[];
  batch.forEach(k=>{
    const ss = (SPECIES_CATALOG[k]||{}).stageSkills || {};
    ['growing','mature'].forEach(st=>{ if(!(ss[st]&&ss[st].length>=2)) fails.push(k+' '+st+' <2'); });
    Object.values(ss).flat().forEach(id=>{ if(!ALL_SKILLS[id]) fails.push(k+' missing '+id); });
  });
  // 같은 타입+속성 두 개체의 성장체 스킬 구성이 달라야(다양성)
  const a=(SPECIES_CATALOG['flame_trap']||{}).stageSkills, b=(SPECIES_CATALOG['blaze_lance']||{}).stageSkills;
  if(a&&b&&JSON.stringify(a.growing)===JSON.stringify(b.growing)) fails.push('flame_trap/blaze_lance growing identical');
  if(fails.length) throw new Error(fails.join(' | '));
});
```

- [ ] **Step 3: 실패 확인** — filter `content batch1` 길이 1.

- [ ] **Step 4: 배치 스킬 정의 작성** — `SKILL_LIB`에 배치 개체별 신규 스킬 추가. 각 스킬은 **역할+비용 차별화**(단순 스펙업 금지), 컨셉 주축 색깔 + 성격 효과 경향 반영. 예(flame_trap = 포식·불, 광폭 성격 → 출혈/회복차단 경향 + 포식 form):

```js
  // ── batch1: flame_trap (포식·불 화초 / 광폭) ──
  'ind.flame_trap.j':  { name:'불씨 할퀴기', icon:'🔥', cost:1, kind:'attack', power:70, single:true, dot:{kind:'bleed',pct:0.06,turns:2}, desc:'위력70 · 단일 + 출혈(2턴) · 저비용 견제', tag:'개체' },
  'ind.flame_trap.g2': { name:'생채기 작열', icon:'🩸', cost:2, kind:'attack', power:95, dot:{kind:'bleed',pct:0.06,turns:3}, desc:'위력95 + 출혈(3턴, 회복감소)', tag:'개체' },
  'ind.flame_trap.m2': { name:'포식 본능', icon:'🦷', cost:2, kind:'attack', power:110, single:true, enemyDebuff:{stat:'def',pct:0.18,turns:2}, desc:'위력110 · 단일 + 적 방어 18%↓(2턴)', tag:'개체' },
```
  > 위는 예시 1개체. Step1의 4개 전부에 대해 유체+1/성장체+2(기존 .g 포함)/성체+2(기존 .m 포함)/완숙 캡스톤이 채워지도록 정의. 흡혈은 포식 form 기본 스킬로 충당(중복 회피).

- [ ] **Step 5: stageSkills 확장** — `SPECIES_CATALOG`의 각 배치 개체 `stageSkills`에 신규 id push:

```js
  // 예: flame_trap
  // juvenile:[...기존, 'ind.flame_trap.j'], growing:['ind.flame_trap.g','ind.flame_trap.g2'],
  // mature:['ind.flame_trap.m','ind.flame_trap.m2'], evolved:['ind.flame_trap.e']
```

- [ ] **Step 6: 통과 확인** — reload 후 `JSON.stringify(window.__catalogSelfTest())` 반환 길이 0. 신규 스킬 필드가 엔진 지원 범위인지 `node scripts/audit-skills.js`(있으면) 또는 셀프테스트로 확인.

- [ ] **Step 7: 생성기 골격(`scripts/gen-concept-skills.js`)** — 배치 데이터(개체→컨셉→단계별 스킬)를 코드로 두고, `index.html`의 마커 사이에 멱등 주입하는 node 스크립트 작성(`gen-individuals.js`의 파일 read/replace 패턴 계승). `--dry`로 카운트만. (대량 배치를 손이 아닌 스크립트로 찍기 위함.)

- [ ] **Step 8: preview 실전투 확인** — 배치 개체 1종 심기→전투 부팅(Global Constraints의 부팅 절차)→단계별 스킬이 로드아웃에 뜨고 출혈 회복감소·form 스킬이 동작하는지 확인.

- [ ] **Step 9: 문서 갱신 + 커밋** — 로드맵 #1-A 진행 상태(배치 1/N), CHANGELOG 상단 항목 추가.

```bash
git add index.html scripts/gen-concept-skills.js docs/master-roadmap.md docs/CHANGELOG.md
git commit -m "feat(#1-A): 콘텐츠 배치1 — 단계별 스킬 주입 + 첫 4개체 컨셉 스킬"
```

---

## 이후 배치 (반복 — Task 7 형틀)

- 남은 개체(비버섯 base 28 + 변이 140 + 버섯 7)를 **배치당 4~8개**로 묶어 Task 7의 Step 1~9를 반복.
- 각 배치: 개체 선정 → `conceptOf`로 주/보조축 확인 → 단계별 스킬 정의(역할·비용 차별화·form/속성/타입/성격 색깔, 표는 출발 예시이므로 **변형을 다양하게**) → stageSkills 확장 → 셀프테스트 0 fail → preview 확인 → 커밋.
- 배치마다 사용자가 결과(도감/전투)를 보고 `CONCEPT_OVERRIDES`/`ARCHETYPE_OVERRIDES`로 큐레이션.
- 버섯 배치는 스탯 보정 제외(컨셉·스토리·스킬만).

---

## Self-Review (작성자 체크)

- **Spec coverage:** 출혈 회복감소(T1)·에너지 흡수(T2)·무기 속성부여(T3)·독 증폭(T4)·용족 브레스(T5)·컨셉 인프라+스토리(T6)·단계별 스킬 예산·역할/비용 차별화·다양성·생성기·검증(T7) — 설계 각 절에 대응 태스크 있음. 효과 경향 14·form 시그니처는 T7+반복 배치에서 콘텐츠로 소화(엔진 훅은 T1~5에서 완비).
- **Placeholder scan:** 엔진 태스크(T1~6)는 실제 코드·테스트·명령 포함. T7은 콘텐츠 특성상 "예시 1개체 + 형틀"로 제시하고 배치별 반복을 명시(설계의 '배치별 진행'과 일치) — 콘텐츠 항목은 본질적으로 반복이라 형틀화가 맞음.
- **Type consistency:** 헬퍼명 일관 — `healMult`/`drainEnergy`/`elemInfuseBonus`/`poisonAmpMult`/`breathPowerMult`/`conceptOf`/`autoConcept`. 필드명 일관 — `energyDrain`/`infuse.kind`/`poisonAmp`/`ramp`/`breathScale`. 버프 kind — `element_infuse`/`poison_amp`/`ramp`. 라인 참조는 현행 기준(편집으로 이동하면 인접 코드로 재확인).
