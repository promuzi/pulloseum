# 개체 카탈로그 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자동 생성 종 격자를 "수정·확장이 편한 수작업 개체 카탈로그(`SPECIES_CATALOG`) + 스킬 정의 분리(`SKILL_LIB`)" 구조로 전환하고, 초본형 타입을 버섯형으로 교체한다(초본형은 레거시 보존).

**Architecture:** 기존 `SPECIES_GRID`(레거시 35종 자동생성)는 남기고, 그 위에 개체별 리치 데이터(`SPECIES_CATALOG`: rarity·variantSlots·baseVariants·stageSkills·signatures·stats override)를 **머지**해 후방호환 `SPECIES` 객체를 만든다. 스킬 실제 정의는 `SKILL_LIB` 한 곳에 모으고 개체는 키로만 참조한다. 타입은 `mushroom`을 추가하고 `grass`(초본형)는 신규 획득 풀에서만 제외(`legacy:true`)하되 데이터·외형 코드는 보존한다.

**Tech Stack:** 바닐라 HTML/CSS/JS 단일 파일(`index.html`), 빌드 없음, `file://` 더블클릭 실행. 테스트 러너 없음 → 검증은 **브라우저 콘솔 assertion**(preview_eval) + 인라인 `window.__catalogSelfTest()` 개발 함수.

## Global Constraints

- 단일 파일 `index.html`에 모든 코드·데이터 인라인. **외부 JSON `fetch` 금지**(`file://` CORS).
- 세이브 무회귀: 기존 localStorage 세이브(키 `pullosseum_v1`)가 깨지지 않아야 한다. 특히 레거시 초본형 개체 `flame`(플레임모스)·`windy`(윈드리프) 보유분은 그대로 렌더링·전투돼야 한다.
- 기존 7종 key 유지: flame/aqua/thorn/gaia/windy/spark/frost.
- 변경 후 **문서 동반 갱신 의무**(CLAUDE.md §실시간 갱신): 코드 변경 커밋에 관련 문서 갱신 포함. pre-push 훅이 "코드만 바뀐 푸시"를 막는다.
- 변이형 키 고정: `normal/predator(pred)/weapon/toxic/spore/lumen/dragon`. 코드상 포식은 `pred`.
- 검증용 dev 함수는 `window.` 네임스페이스로만, 게임 로직에 부작용 없게.

---

## Task 0: 검증용 셀프테스트 하니스 추가

테스트 러너가 없으므로, 콘솔에서 호출 가능한 누적 assertion 함수를 먼저 만든다. 이후 모든 Task가 여기에 케이스를 추가한다.

**Files:**
- Modify: `index.html` — `<script>` 영역 맨 끝(닫는 `</script>` 직전, 대략 `index.html:10260` 부근 `state = normalizeState(obj)` 호출부 이후 전역 스코프)

**Interfaces:**
- Produces: `window.__catalogSelfTest()` → 콘솔에 `PASS n / FAIL m` 출력하고 실패 케이스 배열 반환. `window.__assert(cond, msg)` 헬퍼.

- [ ] **Step 1: 셀프테스트 하니스 추가**

`index.html` 전역 스코프(다른 `function` 정의들과 같은 레벨)에 추가:

```js
/* ===== 개발용 셀프테스트 (게임 로직 무관, 콘솔에서 __catalogSelfTest() 호출) ===== */
window.__selfTestCases = window.__selfTestCases || [];
window.__test = function(name, fn){ window.__selfTestCases.push({ name, fn }); };
window.__catalogSelfTest = function(){
  let pass=0; const fails=[];
  window.__selfTestCases.forEach(c => {
    try { c.fn(); pass++; }
    catch(e){ fails.push(c.name + ' → ' + e.message); }
  });
  console.log('%c셀프테스트 PASS '+pass+' / FAIL '+fails.length, fails.length?'color:#ff6b4a':'color:#5fe06b');
  fails.forEach(f => console.error('  ✗ '+f));
  return fails;
};
function __eq(a,b,msg){ if(a!==b) throw new Error((msg||'')+' expected '+JSON.stringify(b)+' got '+JSON.stringify(a)); }
function __ok(c,msg){ if(!c) throw new Error(msg||'assertion failed'); }
```

- [ ] **Step 2: 베이스라인 케이스 1개 추가**

위 블록 바로 아래에:

```js
window.__test('baseline: SPECIES has legacy keys', function(){
  ['flame','aqua','thorn','gaia','windy','spark','frost'].forEach(k => __ok(SPECIES[k], 'missing legacy species '+k));
});
```

- [ ] **Step 3: 게임을 띄우고 셀프테스트 실행(통과 확인)**

preview_start로 서버 띄우고, preview_eval로:
```js
window.__catalogSelfTest()
```
Expected: 콘솔 `셀프테스트 PASS 1 / FAIL 0`, 반환값 `[]`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "test: 개체 카탈로그용 콘솔 셀프테스트 하니스 추가"
```

---

## Task 1: 버섯형 타입 추가 + 초본형 레거시 보존

타입 축에 `mushroom`을 추가한다. `grass`(초본형) 관련 상수·외형은 전부 남기되, 새 타입표/이름맵에 mushroom을 등록하고 외형 실루엣을 그린다.

**Files:**
- Modify: `index.html:3125` `TYPE_STATS`
- Modify: `index.html:3132` `TYPE_CONCEPT`
- Modify: `index.html:3162` `SPECIES` 빌더 내 `TYPE_KO`
- Modify: `index.html:3396` `SEED_TYPE_NAMES`, `index.html:3397` `SEED_TYPE_ORDER`
- Modify: `index.html:7443` `SEED_ROOT`
- Modify: `index.html:7402` `composePlantBody`의 `else { // tree }` 분기 앞에 mushroom 분기 추가

**Interfaces:**
- Produces: `TYPE_STATS.mushroom`, `TYPE_CONCEPT.mushroom`, `SEED_TYPE_NAMES.mushroom`, `composePlantBody`가 `seedType==='mushroom'`을 그림.

- [ ] **Step 1: 실패 케이스 추가**

Task 0 케이스 블록에 추가:

```js
window.__test('type: mushroom registered, grass legacy kept', function(){
  __ok(TYPE_STATS.mushroom, 'TYPE_STATS.mushroom missing');
  __ok(TYPE_STATS.grass, 'TYPE_STATS.grass (legacy) must be kept');
  __eq(SEED_TYPE_NAMES.mushroom, '버섯형', 'mushroom KO name');
  __ok(SEED_TYPE_ORDER.indexOf('mushroom') >= 0, 'mushroom in order');
});
```

- [ ] **Step 2: 실패 확인**

preview_eval: `window.__catalogSelfTest()`
Expected: 새 케이스 FAIL (`TYPE_STATS.mushroom missing`).

- [ ] **Step 3: 상수에 mushroom 추가**

`index.html:3125` `TYPE_STATS` — `grass` 줄은 그대로 두고 `vine` 다음에 추가:
```js
  mushroom: { hp:38, atk:9,  def:5,  spd:8  }, // 버섯형 — 저스탯(포자 메커니즘으로 보완)
```

`index.html:3132` `TYPE_CONCEPT` — 끝에 `, mushroom:'포자·교란'` 추가.

`index.html:3162` `TYPE_KO` — 끝에 `, mushroom:'버섯형'` 추가.

`index.html:3396` `SEED_TYPE_NAMES` — 끝에 `, mushroom:'버섯형'` 추가.
`index.html:3397` `SEED_TYPE_ORDER` — `'mushroom'`을 배열 끝에 추가: `['grass', 'tree', 'flower', 'cactus', 'vine', 'mushroom']`.

`index.html:7443` `SEED_ROOT` — 끝에 `, mushroom:'균사'` 추가.

- [ ] **Step 4: 버섯 외형 실루엣 추가**

`index.html:7402`의 `} else { // tree` 바로 **앞**에 새 분기 삽입:
```js
  } else if(seedType==='mushroom'){
    const capW=16+gi*4, capH=10+gi*2.4, stalkH=12+gi*4;
    svg+=`<rect x="${cx-3-gi*0.3}" y="${cy}" width="${6+gi*0.6}" height="${stalkH}" rx="3" fill="${P.light}"/>`;
    svg+=`<path d="M${cx-capW/2} ${cy} Q ${cx} ${cy-capH*1.8} ${cx+capW/2} ${cy} Z" fill="${P.main}"/>`;
    for(let i=0;i<2+gi;i++){ const px=cx-capW/2+ (i+0.5)*(capW/(2+gi)); svg+=`<circle cx="${px}" cy="${cy-capH*0.5}" r="${1.6+gi*0.2}" fill="${P.light}" opacity=".85"/>`; }
    if(gi>=4){ svg+=`<circle cx="${cx-capW*0.18}" cy="${cy+stalkH*0.4}" r="2.2" fill="${P.accent}"/>`; }
```
(주의: 이 코드는 기존 `} else { // tree` 줄을 대체하지 않고 그 앞에 끼워, 기존 tree 분기는 `else`로 유지된다.)

- [ ] **Step 5: 통과 확인 + 외형 육안 확인**

preview_eval: `window.__catalogSelfTest()` → 해당 케이스 PASS.
preview_eval로 버섯 SVG 렌더 확인:
```js
document.body.insertAdjacentHTML('beforeend', '<div id="__mtest" style="position:fixed;z-index:99999;right:0;bottom:0;background:#000">'+composePlantSvg('mushroom','mature','grass',{size:120})+'</div>'); 'ok'
```
preview_screenshot로 버섯 모양(갓+대) 보이는지 확인. 확인 후:
```js
document.getElementById('__mtest').remove(); 'cleaned'
```

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(species): 버섯형 타입 추가 + 외형 실루엣(초본형 레거시 보존)"
```

---

## Task 2: SPECIES_CATALOG 도입 (리치 개체 데이터 머지)

`SPECIES_GRID`로 만든 기본 `SPECIES`에 개체별 확장 필드를 머지한다. 카탈로그에 없는 종은 안전한 기본값을 받는다.

**Files:**
- Modify: `index.html:3161-3175` `SPECIES` 빌더 (머지 단계 추가)
- Create(인라인): `index.html:3160` `SPECIES_GRID` 닫힌 직후 `SPECIES_CATALOG` 선언

**Interfaces:**
- Consumes: `SPECIES`(Task 1 후), `ELEMENT_STATS`, `TYPE_STATS`.
- Produces: 각 `SPECIES[key]`에 필드 보강 — `rarity:string`('common'|'uncommon'|'rare'|'epic'|'legendary'), `variantSlots:object`(예 `{normal:6}`), `baseVariants:string[]`, `stageSkills:object|null`, `signatures:string[]`, `legacy:boolean`. 신규 종(grid에 없던 mushroom 개체)도 카탈로그만으로 `SPECIES`에 등록.

- [ ] **Step 1: 실패 케이스 추가**

```js
window.__test('catalog: every species has default rich fields', function(){
  Object.keys(SPECIES).forEach(k => {
    const s = SPECIES[k];
    __ok(typeof s.rarity === 'string', k+' missing rarity');
    __ok(s.variantSlots && typeof s.variantSlots === 'object', k+' missing variantSlots');
    __ok(Array.isArray(s.baseVariants), k+' missing baseVariants');
    __ok(Array.isArray(s.signatures), k+' missing signatures');
    __ok('stageSkills' in s, k+' missing stageSkills key');
  });
  // 레거시 초본형은 legacy 플래그
  __ok(SPECIES.flame.legacy === true, 'flame should be legacy');
});
```

- [ ] **Step 2: 실패 확인**

preview_eval: `window.__catalogSelfTest()` → FAIL (`missing rarity`).

- [ ] **Step 3: SPECIES_CATALOG 선언**

`index.html:3160`의 `SPECIES_GRID` 배열 닫는 `];` 바로 다음 줄에:
```js
/* ── 개체 카탈로그 (A+C) ──
   key → 개체별 확장 데이터. grid에 있는 key는 보강만, 없는 key(예: 버섯)는 신규 종으로 등록.
   필드 전부 선택사항: 없으면 빌더가 안전한 기본값을 채운다. 향후 개체/스킬은 여기와 SKILL_LIB만 수정. */
const SPECIES_CATALOG = {
  // 레거시 초본형(신규 획득 풀에서 제외, 보유분은 유지)
  flame:  { legacy:true }, windy:  { legacy:true },
  grass_water:{legacy:true}, grass_grass:{legacy:true}, grass_earth:{legacy:true},
  grass_bolt:{legacy:true}, grass_ice:{legacy:true},
  // 시범 신규 개체: 버섯 1종 (저스탯·포자 기본·희귀)
  spore_cap: {
    name:'스포어캡', type:'mushroom', element:'grass', rarity:'rare',
    baseVariants:['spore'], variantSlots:{ spore:2, normal:4 },
    signatures:['sig.spore_cloud'],
    stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['sig.spore_cloud'] },
  },
};
```

- [ ] **Step 4: SPECIES 빌더에 머지 + 기본값 단계 추가**

`index.html:3161-3175` `SPECIES` IIFE를 아래로 교체(기존 grid 루프 유지 + 카탈로그 머지 추가):
```js
const SPECIES = (function(){
  const TYPE_KO = { grass:'초본형', tree:'목본형', flower:'화초형', cactus:'다육형', vine:'덩굴형', mushroom:'버섯형' };
  const EL_KO = { fire:'불', water:'물', grass:'풀', earth:'대지', wind:'바람', bolt:'번개', ice:'빙결' };
  const out = {};
  function buildBase(type, el, statsOverride){
    if(statsOverride) return Object.assign({ hp:0,atk:0,def:0,spd:0 }, statsOverride);
    const e=ELEMENT_STATS[el], t=TYPE_STATS[type];
    return { hp:e.hp+t.hp, atk:e.atk+t.atk, def:e.def+t.def, spd:e.spd+t.spd };
  }
  // 1) 레거시 grid 35종
  SPECIES_GRID.forEach(function(row){
    const key=row[0], name=row[1], type=row[2], el=row[3];
    out[key] = {
      key, name, element:el, seedType:type, base:buildBase(type, el),
      desc:`${EL_KO[el]}속성 ${TYPE_KO[type]} — ${TYPE_CONCEPT[type]} 성향.`,
    };
  });
  // 2) 카탈로그 머지(보강) + 신규 종 등록
  Object.keys(SPECIES_CATALOG).forEach(function(key){
    const c = SPECIES_CATALOG[key];
    if(!out[key]){ // grid에 없던 신규 종
      const type=c.type, el=c.element;
      out[key] = { key, name:c.name||key, element:el, seedType:type,
        base:buildBase(type, el, c.stats),
        desc:`${EL_KO[el]||el}속성 ${TYPE_KO[type]||type} — ${TYPE_CONCEPT[type]||''} 성향.` };
    } else if(c.stats){ out[key].base = buildBase(out[key].seedType, out[key].element, c.stats); }
    if(c.name) out[key].name = c.name;
  });
  // 3) 모든 종에 리치 필드 기본값 보강
  Object.keys(out).forEach(function(key){
    const s = out[key], c = SPECIES_CATALOG[key] || {};
    s.rarity = c.rarity || 'common';
    s.legacy = !!c.legacy;
    s.baseVariants = Array.isArray(c.baseVariants) ? c.baseVariants.slice() : [];
    s.signatures = Array.isArray(c.signatures) ? c.signatures.slice() : [];
    s.stageSkills = c.stageSkills || null;
    s.variantSlots = c.variantSlots || { normal:6 };
  });
  return out;
})();
```

- [ ] **Step 5: 통과 확인**

preview_eval:
```js
window.__catalogSelfTest()
```
Expected: 새 케이스 PASS, 베이스라인 케이스도 유지.
추가 수동 확인:
```js
JSON.stringify({sc:SPECIES.spore_cap.base, rare:SPECIES.spore_cap.rarity, bv:SPECIES.spore_cap.baseVariants})
```
Expected: base 합산값(저스탯), rarity 'rare', baseVariants ['spore'].

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(species): SPECIES_CATALOG 도입 — 개체별 rarity/변이슬롯/스킬 머지"
```

---

## Task 3: SKILL_LIB 도입 (스킬 정의 분리 + ALL_SKILLS 통합)

신규 개체/버섯 전용 스킬을 한 곳(`SKILL_LIB`)에 정의하고 `ALL_SKILLS`에 합친다. 기존 스킬 정의는 건드리지 않는다.

**Files:**
- Create(인라인): `index.html:3614` `TRAIT_SKILLS` 닫힌 직후 `SKILL_LIB` 선언
- Modify: `index.html:3823` `ALL_SKILLS` 머지에 `SKILL_LIB` 추가

**Interfaces:**
- Consumes: 없음(독립).
- Produces: `SKILL_LIB` 객체(키 네임스페이스 `common.*` / `sig.*` / `mushroom.*`), `ALL_SKILLS`가 이를 포함 → `skillById`/`skillDisplay`가 신규 키를 해석.

- [ ] **Step 1: 실패 케이스 추가**

```js
window.__test('skilllib: namespaced skills resolve via ALL_SKILLS', function(){
  __ok(ALL_SKILLS['mushroom.spore_burst'], 'mushroom.spore_burst missing');
  __ok(ALL_SKILLS['sig.spore_cloud'], 'sig.spore_cloud missing');
  __ok(skillById('mushroom.spore_burst'), 'skillById cannot resolve mushroom skill');
});
```

- [ ] **Step 2: 실패 확인**

preview_eval: `window.__catalogSelfTest()` → FAIL.

- [ ] **Step 3: SKILL_LIB 선언**

`index.html:3614` `TRAIT_SKILLS` 객체 닫는 `};` 다음 줄에:
```js
/* ── 신규 개체/시그니처/버섯 전용 스킬 정의(분리) ──
   개체는 SPECIES_CATALOG의 stageSkills/signatures에서 이 키만 참조한다.
   기존 스킬 스키마와 동일(name/icon/cost/kind/power/desc/grade…). 향후 스킬은 여기만 수정. */
const SKILL_LIB = {
  'mushroom.spore_burst': { name:'포자 분출', icon:'🍄', cost:2, kind:'debuff', aoe:true, power:90,
    dot:{kind:'poison',pct:0.05,turns:3}, enemyDebuff:{stat:'acc',pct:0.15,turns:2},
    desc:'위력90 · 광역 + 중독(3턴) + 적 적중 15%↓(2턴)', tag:'버섯', grade:'B' },
  'sig.spore_cloud': { name:'포자 운무막', icon:'🌫️', cost:3, kind:'debuff', aoe:true,
    enemyDebuff:{stat:'atk',pct:0.2,turns:2}, dot:{kind:'poison',pct:0.04,turns:3},
    desc:'적 공격 20%↓(2턴) + 중독(3턴)', tag:'시그니처', grade:'A' },
};
```

- [ ] **Step 4: ALL_SKILLS에 합치기**

`index.html:3823`:
```js
const ALL_SKILLS = Object.assign({}, UNIVERSAL_SKILLS, ELEMENT_SKILLS, TRAIT_SKILLS, FORM_SKILLS, CARD_SKILLS, SKILL_LIB);
```
(주의: `SKILL_LIB`는 3614에 정의되어 3823 시점에 이미 존재한다 — 순서 OK.)

- [ ] **Step 5: 통과 확인**

preview_eval: `window.__catalogSelfTest()` → PASS.
수동: `skillDisplay('mushroom.spore_burst').name` → `'포자 분출'`.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(skill): SKILL_LIB 분리 — 신규/버섯/시그니처 스킬 정의를 한 곳에"
```

---

## Task 4: plantKnownSkillIds를 카탈로그 stageSkills 인식하게

개체에 `stageSkills`가 있으면 그것을 단계별로 더하고, 없으면 기존 `ELEMENT_GROWTH_SKILLS` 경로를 그대로 쓴다(후방호환). 시그니처는 해당 변이 보유 시 추가.

**Files:**
- Modify: `index.html:3942-3959` `plantKnownSkillIds`

**Interfaces:**
- Consumes: `SPECIES[p.species].stageSkills/signatures/baseVariants`, `GROWTH_STAGE_ORDER`, `ALL_SKILLS`.
- Produces: 기존과 동일한 반환(스킬 id 배열, 중복 제거·존재 검증). 카탈로그 개체는 stageSkills를, 레거시는 기존 풀을 사용.

- [ ] **Step 1: 실패 케이스 추가**

```js
window.__test('skills: catalog stageSkills unlock for catalog species', function(){
  const p = { species:'spore_cap', element:'grass', growth_stage:'growing', form:'normal' };
  const ids = plantKnownSkillIds(p);
  __ok(ids.indexOf('mushroom.spore_burst') >= 0, 'spore_burst should unlock by sprout/juvenile');
  __ok(ids.indexOf('sig.spore_cloud') >= 0, 'spore_cloud should unlock by growing');
});
window.__test('skills: legacy species still use element growth pool', function(){
  const p = { species:'aqua', element:'water', growth_stage:'evolved', form:'normal' };
  const ids = plantKnownSkillIds(p);
  __ok(ids.indexOf('skill_elem_water') >= 0, 'legacy element skill missing');
  __ok(ids.indexOf('skill_symbiotic') >= 0, 'legacy water growth top skill missing');
});
```

- [ ] **Step 2: 실패 확인**

preview_eval: `window.__catalogSelfTest()` → 첫 케이스 FAIL.

- [ ] **Step 3: plantKnownSkillIds 수정**

`index.html:3942-3959`를 아래로 교체:
```js
function plantKnownSkillIds(p){
  if(!p) return ['skill_basic_strike'];
  const idx = Math.max(0, GROWTH_STAGE_ORDER.indexOf(p.growth_stage || INITIAL_PLANTED_GROWTH_STAGE));
  const known = ['skill_basic_strike'];
  const sp = SPECIES[p.species];
  // 공통 단계기(모든 종 공통): 새싹부터 가드/속성기, 유체부터 광합성/집중, 성장체부터 결집
  if(idx >= 1){ known.push('skill_guard'); if(p.element && ELEMENTS[p.element]) known.push(elementSkillId(p.element)); }
  if(idx >= 2){ known.push('skill_photosynthesis', 'skill_focus'); }
  if(idx >= 3){ known.push('skill_rally'); }
  if(sp && sp.stageSkills){
    // 카탈로그 개체: 단계별 고유 스킬을 누적 해금(해당 단계 idx까지)
    GROWTH_STAGE_ORDER.forEach((stage, si) => {
      if(si <= idx && Array.isArray(sp.stageSkills[stage])) sp.stageSkills[stage].forEach(id => known.push(id));
    });
    // 시그니처: 해당 변이를 태생 보유했거나 변이형이면 추가
    if(Array.isArray(sp.signatures)) sp.signatures.forEach(id => known.push(id));
  } else {
    // 레거시: 속성×단계 풀
    const eg = ELEMENT_GROWTH_SKILLS[p.element] || ELEMENT_GROWTH_SKILLS.grass;
    if(idx >= 2) known.push(eg[0]);
    if(idx >= 3) known.push(eg[1]);
    if(idx >= 4) known.push(eg[2]);
    if(idx >= 5) known.push(eg[3]);
  }
  if(p.form === 'pred') known.push('skill_card_predation');
  if(p.form === 'weapon' && p.weaponKey) known.push('skill_weapon');
  if(Array.isArray(p.bonus_skills)) p.bonus_skills.forEach(id => { if(ALL_SKILLS[id]) known.push(id); });
  return known.filter((v, i, a) => a.indexOf(v) === i && skillById(v, p));
}
```

- [ ] **Step 4: 통과 확인**

preview_eval: `window.__catalogSelfTest()` → 두 케이스 모두 PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(skill): plantKnownSkillIds가 카탈로그 stageSkills/시그니처 인식(레거시 호환)"
```

---

## Task 5: 희귀도 가중 + 레거시 초본형 신규 획득 제외

신규 종 출현(탐사 `rollSpeciesFromView`, 적 `buildEnemy`)을 `legacy` 종 제외 + 희귀도 가중으로 바꾼다. 버섯은 희귀도 높아 잘 안 나오게.

**Files:**
- Modify: `index.html:3414` 부근 — `ACQUIRABLE_SPECIES`/`RARITY_WEIGHT`/`pickAcquirableSpecies` 추가
- Modify: `index.html:3417-3424` `rollSpeciesFromView`
- Modify: `index.html:8869` `buildEnemy`의 `const sp = pick(Object.keys(SPECIES));`

**Interfaces:**
- Consumes: `SPECIES`(rarity·legacy), `speciesForTypeEl`.
- Produces: `RARITY_WEIGHT:object`, `pickAcquirableSpecies(filterFn?)→key`. `rollSpeciesFromView`/`buildEnemy`는 legacy 제외 + 희귀도 가중을 적용.

- [ ] **Step 1: 실패 케이스 추가**

```js
window.__test('acquire: legacy grass excluded from acquirable pool', function(){
  __ok(typeof pickAcquirableSpecies === 'function', 'pickAcquirableSpecies missing');
  for(let i=0;i<300;i++){ const k=pickAcquirableSpecies(); __ok(!SPECIES[k].legacy, 'legacy species '+k+' should not be acquirable'); }
});
window.__test('acquire: RARITY_WEIGHT defined for all rarities', function(){
  ['common','uncommon','rare','epic','legendary'].forEach(r => __ok(typeof RARITY_WEIGHT[r]==='number', 'weight missing '+r));
  __ok(RARITY_WEIGHT.common > RARITY_WEIGHT.rare, 'common must be more frequent than rare');
});
```

- [ ] **Step 2: 실패 확인**

preview_eval: `window.__catalogSelfTest()` → FAIL.

- [ ] **Step 3: 가중 추출 헬퍼 추가**

`index.html:3415` `randomSpeciesKey` 함수 다음 줄에 추가:
```js
/* 희귀도 가중치 — 등장/드롭률만 좌우(스탯은 거의 동일). 값이 클수록 자주 나온다. */
const RARITY_WEIGHT = { common:100, uncommon:55, rare:22, epic:8, legendary:3 };
/* 신규 획득 가능 종 = legacy 아님. filterFn으로 타입/속성 추가 제한 가능. */
function pickAcquirableSpecies(filterFn){
  const pool = Object.keys(SPECIES).filter(k => !SPECIES[k].legacy && (!filterFn || filterFn(SPECIES[k])));
  if(!pool.length) return 'thorn';
  let total = 0; const w = pool.map(k => { const x = RARITY_WEIGHT[SPECIES[k].rarity]||50; total += x; return x; });
  let r = Math.random()*total;
  for(let i=0;i<pool.length;i++){ r -= w[i]; if(r <= 0) return pool[i]; }
  return pool[pool.length-1];
}
```

- [ ] **Step 4: rollSpeciesFromView를 가중·legacy 인식으로 교체**

`index.html:3417-3424`를 교체:
```js
function rollSpeciesFromView(viewRegion){
  const els = (viewRegion && viewRegion.el && viewRegion.el.length) ? viewRegion.el : null;
  const typesKo = (viewRegion && viewRegion.types && viewRegion.types.length) ? viewRegion.types : null;
  const okType = typesKo ? typesKo.map(t => SEED_TYPE_BY_KO[t]).filter(Boolean) : null;
  // 지역 테마(속성/타입)에 맞는 비-legacy 종을 희귀도 가중으로 추출
  const key = pickAcquirableSpecies(s =>
    (!els || els.indexOf(s.element) >= 0) && (!okType || okType.indexOf(s.seedType) >= 0));
  return key;
}
```

- [ ] **Step 5: buildEnemy 종 선택 교체**

`index.html:8869` `const sp = pick(Object.keys(SPECIES));`를:
```js
  const sp = pickAcquirableSpecies();
```
로 교체. (적도 신규 획득 풀 기준 — 레거시 초본형은 적으로 안 나옴.)

- [ ] **Step 6: 통과 확인 + 전투 스모크 테스트**

preview_eval: `window.__catalogSelfTest()` → PASS.
수동: 탐사 분포 확인
```js
(function(){ const c={}; for(let i=0;i<500;i++){ const k=rollSpeciesFromView(null); c[k]=(c[k]||0)+1; } return JSON.stringify({mushroomShare: (c.spore_cap||0), total:500}); })()
```
Expected: spore_cap이 rare라 평균보다 적게 등장(0보다 크되 소수).

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(species): 희귀도 가중 획득 + 레거시 초본형 신규 등장 제외"
```

---

## Task 6: 변이 슬롯/태생 변이 plumbing + 세이브 마이그레이션

개체의 `variantSlots`/`baseVariants`를 심을 때 식물에 기록하고, normalizeState에서 기존 세이브에 안전 기본값을 채운다. (변이 슬롯 UI는 이번 범위 밖 — 데이터만 연결.)

**Files:**
- Modify: `index.html:8871` 부근 `createPlantedPlantFromSeed`(종자→식물 심기) — `variant_slots`/`base_variants` 기록 + 버섯 태생 포자 반영
- Modify: `index.html:4163-4168` `normalizeState` 식물 루프 — 신규 필드 backfill

**Interfaces:**
- Consumes: `SPECIES[key].variantSlots/baseVariants`.
- Produces: 심긴 식물 객체에 `p.variant_slots:object`, `p.base_variants:string[]`. 버섯 개체는 `p.form`이 비어있으면 `'spore'`로 초기화. normalizeState가 구 세이브 식물에 동일 필드 backfill(레거시는 `{normal:6}`/`[]`).

- [ ] **Step 1: 실패 케이스 추가**

```js
window.__test('plant: planting catalog species records variant slots + base variants', function(){
  const seed = { id:'t', species:'spore_cap', element:'grass', grade:'B', rarity:'rare' };
  const pl = createPlantedPlantFromSeed(seed);
  __ok(pl.variant_slots && pl.variant_slots.spore === 2, 'variant_slots.spore should be 2');
  __ok(pl.base_variants.indexOf('spore') >= 0, 'base_variants should include spore');
  __eq(pl.form, 'spore', 'mushroom base variant should set form spore when empty');
});
window.__test('migrate: normalizeState backfills variant fields on legacy plant', function(){
  const s = { plants:[ { species:'flame', element:'fire', growth_stage:'mature' } ] };
  const n = normalizeState(s);
  const p = n.plants[0];
  __ok(p.variant_slots && typeof p.variant_slots==='object', 'variant_slots backfilled');
  __ok(Array.isArray(p.base_variants), 'base_variants backfilled');
});
```

- [ ] **Step 2: 실패 확인**

preview_eval: `window.__catalogSelfTest()` → FAIL.

- [ ] **Step 3: createPlantedPlantFromSeed 기록 추가**

`index.html:8871` 부근 — `createPlantedPlantFromSeed`가 식물 객체를 만들어 `return`하기 직전에 다음을 추가(함수 본문에서 식물 변수명이 `plant`/`p`인지 Read로 확인 후 해당 변수에 대입). 변수명을 `pl`이라 가정한 예:
```js
  const _sp = SPECIES[pl.species];
  if(_sp){
    pl.variant_slots = Object.assign({}, _sp.variantSlots);
    pl.base_variants = (_sp.baseVariants||[]).slice();
    if((!pl.form || pl.form==='normal') && pl.base_variants.length) pl.form = pl.base_variants[0];
  }
```
(실제 변수명에 맞춰 `pl`을 교체할 것. 종자 species가 SPECIES에 없으면 건드리지 않음.)

- [ ] **Step 4: normalizeState backfill 추가**

`index.html:4163` 식물 루프 `(s.plants || []).forEach(p => {` 내부, 기존 필드 보정들 다음에 추가:
```js
    if(!p.variant_slots || typeof p.variant_slots !== 'object'){
      const sp = SPECIES[p.species];
      p.variant_slots = sp ? Object.assign({}, sp.variantSlots) : { normal:6 };
    }
    if(!Array.isArray(p.base_variants)){
      const sp = SPECIES[p.species];
      p.base_variants = sp ? (sp.baseVariants||[]).slice() : [];
    }
```

- [ ] **Step 5: 통과 확인 + 세이브 라운드트립**

preview_eval: `window.__catalogSelfTest()` → PASS.
세이브 무회귀 스모크: 현재 세이브 export → reimport 후 식물 목록·전투 진입 정상인지 육안(preview_screenshot). 콘솔:
```js
JSON.stringify((state.plants||[]).slice(0,2).map(p=>({sp:p.species, vs:p.variant_slots, bv:p.base_variants})))
```
Expected: 모든 식물에 variant_slots/base_variants 존재, 기존 종 깨짐 없음.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(species): 변이 슬롯/태생 변이 데이터 연결 + 세이브 마이그레이션"
```

---

## Task 7: 문서 동반 갱신

코드 변경을 하위 문서에 반영(CLAUDE.md 실시간 갱신 규약).

**Files:**
- Modify: `docs/species-system-guide.md` — 카탈로그 모델·버섯형 추가·초본형 레거시 설명, 타입표 갱신
- Modify: `docs/balance-sheet.md` — `TYPE_STATS` 버섯형 수치, 희귀도 가중치(RARITY_WEIGHT)
- Modify: `docs/master-roadmap.md` — §1 표 #1 상태 갱신, §5 결정 로그 2줄 추가, §2 문서지도에 본 plan/spec 등록
- Modify: `docs/trait-growth-roadmap.md` — 변이 슬롯·시그니처 스킬·SKILL_LIB 개념 추가
- Modify: `docs/CHANGELOG.md` — 맨 위 새 항목

**Interfaces:** 없음(문서).

- [ ] **Step 1: master-roadmap §5 결정 로그 추가**

`docs/master-roadmap.md` §5 결정 로그 맨 아래에:
```markdown
- **2026-06-24** — **종 시스템 = 수작업 개체 카탈로그(A+C)로 전환.** `SPECIES_CATALOG`(개체별 rarity·변이슬롯·baseVariants·stageSkills·signatures) + `SKILL_LIB`(스킬 정의 분리). 기존 `SPECIES_GRID`는 레거시 자동생성으로 머지 기반 유지. 설계서 = [`superpowers/specs/2026-06-24-plant-individual-catalog-design.md`](superpowers/specs/2026-06-24-plant-individual-catalog-design.md). (#1)
- **2026-06-24** — **타입 개편: 초본형(grass) 제거 → 버섯형(mushroom) 추가.** 버섯=저스탯+포자 기본(`baseVariants:['spore']`)+희귀. 포자는 하드코딩 아닌 `baseVariants` 데이터로만 결정(확장 여지). 초본형은 신규 획득 제외하되 보유분·외형 보존(레거시). (#1)
```

- [ ] **Step 2: master-roadmap §1 표 + §2 문서지도 갱신**

§1 표의 #1 행 "다음 한 걸음"을 `개체/스킬 내용 채우기(카탈로그 구조 완료)`로, §2 문서지도 표에 plan 파일 한 줄 등록:
```markdown
| **[superpowers/plans/2026-06-24-plant-individual-catalog.md](superpowers/plans/2026-06-24-plant-individual-catalog.md)** | 개체 카탈로그 전환 구현 계획(Task별) | #1 구현 시 |
```

- [ ] **Step 3: species-system-guide.md 갱신**

§1-2 타입표에서 초본형 행을 "(레거시)"로 표기하고 버섯형 행 추가(`mushroom HP38/공9/방5/기동8 — 저스탯·포자 기본`). 문서 상단에 "5타입 = 버섯/목본/화초/다육/덩굴(초본형은 레거시 보존)" 명시. §6 개발자 표에 `SPECIES_CATALOG`/`SKILL_LIB`/`pickAcquirableSpecies`/`RARITY_WEIGHT` 행 추가.

- [ ] **Step 4: balance-sheet.md / trait-growth-roadmap.md / CHANGELOG.md 갱신**

- balance-sheet.md: `TYPE_STATS`에 mushroom 수치, 희귀도 가중치 `RARITY_WEIGHT` 표 추가.
- trait-growth-roadmap.md: "변이 슬롯(개체별 배분)·시그니처 스킬·SKILL_LIB(스킬 정의 분리)" 절 추가.
- CHANGELOG.md 맨 위:
```markdown
## 2026-06-24
- feat(species): 종 시스템을 수작업 개체 카탈로그(A+C)로 전환 — `SPECIES_CATALOG`+`SKILL_LIB`, 희귀도 가중 획득.
- feat(species): 버섯형 타입 추가(저스탯+포자 기본·희귀), 초본형은 레거시 보존(신규 획득 제외).
```

- [ ] **Step 5: 전체 셀프테스트 최종 회귀 확인**

preview_eval: `window.__catalogSelfTest()` → 전부 PASS(베이스라인 포함). 게임 한 바퀴(메인→식물 목록→전투 진입→탐사) preview_screenshot로 깨짐 없음 확인.

- [ ] **Step 6: Commit (코드+문서 동반)**

```bash
git add docs/ index.html
git commit -m "docs: 개체 카탈로그/버섯형 전환 — 로드맵·종가이드·밸런스·체인지로그 갱신"
git push
```

---

## Self-Review

**1. Spec coverage**
- §1 데이터 구조 A+C → Task 2(SPECIES_CATALOG)·Task 3(SKILL_LIB) ✅
- §1-3 키 네임스페이스 → Task 3 ✅
- §2 타입 개편(초본형→버섯형) → Task 1 ✅
- §2-1 마이그레이션(b) 레거시 보존 → Task 1(외형)·Task 2(legacy 플래그)·Task 5(획득 제외)·Task 6(세이브 backfill) ✅
- §3 버섯 특수(저스탯·포자 기본·희귀·확장여지·별개 네임스페이스) → Task 1(스탯)·Task 2(baseVariants)·Task 3(mushroom.*)·Task 5(rarity) ✅
- §4 변이 슬롯·희귀도 → Task 5(rarity)·Task 6(variant_slots) ✅ (슬롯 UI는 스펙 §6에서 명시적 제외)
- §5 스킬 분담(공통+고유, 고유 비중↑) → Task 4 ✅
- §6 시범 변환(버섯 1종+기존 일부) → Task 2(spore_cap + grass legacy 표기) ✅
- §7 문서 갱신 → Task 7 ✅

**2. Placeholder scan:** 모든 코드 스텝에 실제 코드 포함. Task 6 Step 3만 "실제 변수명 확인 후 대입" 지시 — 이는 Read 한 번으로 해소되는 구체 지시(플레이스홀더 아님).

**3. Type consistency:** `pickAcquirableSpecies`(Task5 정의→Task5 사용), `SPECIES_CATALOG`(Task2 정의→Task2/5/6 사용), `SKILL_LIB`(Task3 정의→ALL_SKILLS 사용), `variant_slots`/`base_variants`(Task6 정의·사용·마이그레이션 일치), `RARITY_WEIGHT`(Task5 일관). stageSkills 단계 키는 `GROWTH_STAGE_ORDER`와 동일 문자열(seed/sprout/juvenile/growing/mature/evolved) 사용 — Task 2 카탈로그의 `growing` 키가 `GROWTH_STAT_MULT`의 `growing`과 일치 ✅.

> **주의(실행자):** Task 6 Step 3는 `createPlantedPlantFromSeed`의 실제 식물 변수명을 Read로 먼저 확인하고 `pl`을 그 이름으로 치환할 것. 또한 카탈로그 `stageSkills`의 단계 키는 반드시 `GROWTH_STAGE_ORDER`의 실제 문자열과 일치해야 한다(구현 전 해당 상수 1회 확인).
