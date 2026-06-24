# 버섯 타입 완성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 버섯 타입을 종(7속성)·전용 외형·시그니처 스킬·탐사 연동까지 완성하고, 5타입 전체에 타입별 생장 단계명을 도입한다.

**Architecture:** 모든 변경은 단일 파일 `index.html`(바닐라 JS, 빌드 없음)에 데이터/함수 추가로 이뤄진다. 종은 `SPECIES_CATALOG`에 항목만 추가하면 빌더(`buildBase`)가 스탯을 자동 계산하고 탐사·적등장·상성·도감이 자동 연결된다. 외형은 절차적 SVG(`composePlantBody`)에 `mushroom` 분기를 추가한다. 회귀 검증은 콘솔 셀프테스트 `window.__catalogSelfTest()`(반환 fails 배열로 판정).

**Tech Stack:** HTML/CSS/JS(vanilla), 테스트 러너 없음 → `window.__test(name, fn)` + `window.__catalogSelfTest()`. 미리보기 서버 `pullosseum`(정적, HMR 없음).

## Global Constraints

- 전부 `index.html` 한 파일. 빌드 과정 없음.
- **테스트 = 셀프테스트.** `window.__test('name', fn)`로 케이스 등록, `fn`은 **실패 사유 문자열의 배열(fails)** 을 반환. 판정은 반환값으로 — preview 콘솔 버퍼는 리로드해도 옛 에러가 남으므로 신뢰 금지.
- **검증 절차(매 태스크):** preview에서 `index.html` 로드 → 콘솔에서 `window.__catalogSelfTest()` 실행 → 반환 객체의 `fails`(또는 실패 케이스 목록)가 비어 있는지 확인. 코드 수정 후 반드시 `location.reload()`. 옛 게임이 읽히면 서비스워커/캐시 비우기(`sw.js`가 캐시함).
- **`'grass'` 일괄치환 금지** — 타입 grass(레거시 폴백)와 속성 grass(풀)가 동일 문자열.
- **`spore_cap` key 유지**(세이브 호환). 신규 종 key = `spore_<element>` 규칙.
- 단계 이름·종 이름은 **데이터로만** 존재(추후 칸 단위 수정 용이).
- **커밋은 코드+문서 함께.** pre-push 훅(`.githooks`)이 코드만 바뀐 푸시를 막으므로, 푸시 전 `docs/`(species-guide·roadmap·CHANGELOG) 갱신 포함. 최종 Task 5에서 문서 일괄 갱신 후 푸시.
- 신규 시그니처는 전투 엔진 `applyMove` 지원 필드만 사용(결정형, 확률성 라이더 없음): `aoe`, `power`, `single`, `dot:{kind,pct,turns}`, `enemyDebuff:{stat,pct,turns}`, `selfBuff:{stat,pct,turns}`, `heal`, `critBonus`, `lifesteal`.

---

### Task 1: 타입별 생장 단계명 (`STAGE_NAMES_BY_TYPE` + `growthStageName` 확장)

**Files:**
- Modify: `index.html` — `GROWTH_STAGE_NAMES` 직후(현재 ~3673)에 새 상수 추가; `growthStageName`(현재 ~8362) 시그니처 확장; 호출부에 `seed_type` 전달.
- Test: `index.html` 끝 셀프테스트 블록(현재 ~10853 이후)에 `window.__test(...)` 추가.

**Interfaces:**
- Produces: `STAGE_NAMES_BY_TYPE[seedType][stageId] -> string`; `growthStageName(stage, seedType?) -> string`(seedType 없거나 미매핑이면 기존 전역 폴백).

- [ ] **Step 1: 실패하는 셀프테스트 추가**

`index.html` 셀프테스트 블록 끝(다른 `window.__test` 들 사이/뒤)에 추가:

```js
window.__test('stage names: per-type override + safe fallback', function(){
  const fails = [];
  if(growthStageName('growing','mushroom') !== '어린갓') fails.push('mushroom growing should be 어린갓');
  if(growthStageName('evolved','mushroom') !== '포자갓') fails.push('mushroom evolved should be 포자갓');
  if(growthStageName('seed','mushroom') !== '포자') fails.push('mushroom seed should be 포자');
  if(growthStageName('juvenile','cactus') !== '어린기둥') fails.push('cactus juvenile should be 어린기둥');
  if(growthStageName('sprout','tree') !== '떡잎') fails.push('tree sprout should be 떡잎');
  if(growthStageName('growing') !== '성장체') fails.push('no-type fallback should be 성장체');
  if(growthStageName('growing','nonsense') !== '성장체') fails.push('unknown type should fall back');
  return fails;
});
```

- [ ] **Step 2: 셀프테스트 실패 확인**

Run: preview에서 `index.html` 로드 후 콘솔 `window.__catalogSelfTest()`.
Expected: 위 케이스가 FAIL(아직 `STAGE_NAMES_BY_TYPE` 없음, `growthStageName`이 2번째 인자 무시 → mushroom/cactus/tree 단계명이 전역값과 달라 불일치).

- [ ] **Step 3: `STAGE_NAMES_BY_TYPE` 상수 추가**

`const GROWTH_STAGE_NAMES = {...};`(현재 3673) 바로 다음 줄에 추가:

```js
/* 타입별 생장 단계 표시명. 흐름(6단계)은 동일, 이름만 타입색. 미매핑이면 GROWTH_STAGE_NAMES 폴백. */
const STAGE_NAMES_BY_TYPE = {
  tree:     { seed:'씨앗', sprout:'떡잎', juvenile:'묘목',    growing:'어린나무', mature:'성목',        evolved:'거목' },
  flower:   { seed:'씨앗', sprout:'새싹', juvenile:'새잎',    growing:'꽃봉오리', mature:'개화',        evolved:'만개' },
  cactus:   { seed:'씨앗', sprout:'움',   juvenile:'어린기둥', growing:'가시몸',   mature:'성체선인장', evolved:'꽃선인장' },
  vine:     { seed:'씨앗', sprout:'새순', juvenile:'어린덩굴', growing:'덩굴손',   mature:'성체덩굴',    evolved:'만연덩굴' },
  mushroom: { seed:'포자', sprout:'균사', juvenile:'버섯눈',  growing:'어린갓',   mature:'성숙버섯',    evolved:'포자갓' },
};
```

- [ ] **Step 4: `growthStageName` 확장**

현재(8362):
```js
function growthStageName(stage){
  return GROWTH_STAGE_NAMES[stage] || stage || '새싹';
}
```
교체:
```js
function growthStageName(stage, seedType){
  const byType = seedType && STAGE_NAMES_BY_TYPE[seedType];
  if(byType && byType[stage]) return byType[stage];
  return GROWTH_STAGE_NAMES[stage] || stage || '새싹';
}
```

- [ ] **Step 5: 호출부에 `seed_type` 전달**

다음 호출부에서 in-scope 식물(`p`/`f`)의 `seed_type`을 2번째 인자로 추가(식물이 scope에 없는 곳은 그대로 두면 안전 폴백). 각 줄을 검색해 수정:

- `growthStageName(p.growth_stage)` → `growthStageName(p.growth_stage, p.seed_type)` (현재 ~8387, ~8603, ~8918)
- `growthStageName(p.growth_stage||'seed')` → `growthStageName(p.growth_stage||'seed', p.seed_type)` (현재 ~10221, ~10249)
- `growthStageName(f.growth_stage)` → `growthStageName(f.growth_stage, f.seed_type)` (현재 ~10371)
- `growthStageName(fromStage)` / `growthStageName(toStage)` 진화 연출(현재 ~8453): 같은 함수에 식물 `p`가 있으면 `growthStageName(fromStage, p.seed_type)`, 없으면 그대로.
- `const stage = p ? growthStageName(p.growth_stage) : '새싹';`(현재 ~4422) → `p ? growthStageName(p.growth_stage, p.seed_type) : '새싹'`

> 검증은 함수 단위 테스트(Step 1)로 충분. 호출부 변경은 표시 개선이며 폴백이 안전하므로 회귀 위험 없음.

- [ ] **Step 6: 셀프테스트 통과 확인**

Run: preview 리로드 후 `window.__catalogSelfTest()`.
Expected: `stage names: per-type override + safe fallback` PASS(fails 빈 배열), 기존 케이스 전부 PASS 유지.

- [ ] **Step 7: 커밋**

```bash
git add index.html
git commit -m "feat(plant): 타입별 생장 단계명(STAGE_NAMES_BY_TYPE) + growthStageName 확장"
```

---

### Task 2: 버섯 전용 외형 (`composePlantBody` mushroom 분기 + bodyStyle 훅 + 떡잎 생략)

**Files:**
- Modify: `index.html` — `composePlantBody`(현재 ~7642) 본문; `composePlantSvg`(현재 ~7687)의 `composePlantBody(...)` 호출(현재 ~7698).
- Test: 셀프테스트 블록에 `window.__test(...)` 추가.

**Interfaces:**
- Consumes: `elementPalette(el) -> {main,dark,light,accent,stem}`(기존), `composePlantBody(seedType, gi, P, el)`(기존 시그니처).
- Produces: `composePlantBody(seedType, gi, P, el, bodyStyle?)` — `bodyStyle` 기본 `'classic'`. mushroom 분기는 `'classic'`만 구현(향후 `'cluster'`·`'glow'` 분기 자리 확보).

- [ ] **Step 1: 실패하는 셀프테스트 추가**

```js
window.__test('appearance: mushroom body distinct + skips cotyledon', function(){
  const fails = [];
  const P = elementPalette('grass');
  const m = composePlantBody('mushroom', 4, P, 'grass');
  const t = composePlantBody('tree', 4, P, 'grass');
  if(m === t) fails.push('mushroom must not render identical to tree (no branch)');
  const m1 = composePlantBody('mushroom', 1, P, 'grass');
  if(m1.indexOf('rotate(-28 49 84)') >= 0) fails.push('mushroom young stage should skip cotyledon ellipses');
  return fails;
});
```

- [ ] **Step 2: 셀프테스트 실패 확인**

Run: preview 리로드 → `window.__catalogSelfTest()`.
Expected: FAIL — 현재 mushroom은 `else`로 tree와 동일 출력(`m === t`), gi≤2 떡잎(`rotate(-28 49 84)`)이 그려짐.

- [ ] **Step 3: 떡잎 블록을 버섯 제외로 가드**

현재(7652):
```js
  if(gi<=2){ // 어린 단계: 떡잎
```
교체:
```js
  if(gi<=2 && seedType!=='mushroom'){ // 어린 단계: 떡잎 (버섯은 떡잎 없음)
```

- [ ] **Step 4: 기본 줄기 그리기를 버섯 제외로 가드**

현재(7650~7651):
```js
  const stemTop = 76 - gi*7, stemW = 3 + gi*0.7, cy = stemTop;
  let svg = `<path d="M60 96 C 57 86 63 ${stemTop+12} 60 ${stemTop}" stroke="${P.stem}" stroke-width="${stemW}" fill="none" stroke-linecap="round"/>`;
```
교체(버섯은 자루가 줄기를 대체하므로 초록 줄기를 생략):
```js
  const stemTop = 76 - gi*7, stemW = 3 + gi*0.7, cy = stemTop;
  let svg = (seedType==='mushroom') ? '' : `<path d="M60 96 C 57 86 63 ${stemTop+12} 60 ${stemTop}" stroke="${P.stem}" stroke-width="${stemW}" fill="none" stroke-linecap="round"/>`;
```

- [ ] **Step 5: 시그니처에 `bodyStyle` 추가 + mushroom 분기 신설**

함수 시그니처(7642) 교체:
```js
function composePlantBody(seedType, gi, P, el, bodyStyle){
```

기존 분기 체인에서 `} else { // tree` 직전에 mushroom 분기를 삽입. 즉 현재(7672~7678 부근):
```js
  } else if(seedType==='cactus'){
    ... (기존 cactus 코드 그대로) ...
  } else { // tree
```
사이에 추가:
```js
  } else if(seedType==='mushroom'){
    const style = bodyStyle || 'classic';   // 향후 'cluster'(B)·'glow'(C) 분기 자리
    // A 클래식 독버섯: 통통한 자루 + 점박이 갓 + 고리. gi가 클수록 갓이 펴지고 점·고리 생김.
    const capW = 14 + gi*5, capLift = 22 + gi*3;
    const stipeW = 4 + gi*0.8, topY = cy, baseY = cy + 16;
    // 자루
    svg += `<path d="M${cx-stipeW} ${baseY} Q${cx-stipeW-1} ${topY+9} ${cx-stipeW+1} ${topY} L${cx+stipeW-1} ${topY} Q${cx+stipeW+1} ${topY+9} ${cx+stipeW} ${baseY} Z" fill="${P.light}"/>`;
    svg += `<path d="M${cx-stipeW} ${baseY} Q${cx-stipeW-1} ${topY+9} ${cx-stipeW+1} ${topY} L${cx-stipeW+3} ${topY} Q${cx-1} ${topY+10} ${cx-2} ${baseY} Z" fill="${P.dark}" opacity=".4"/>`;
    // 고리(annulus) — 성장체(gi>=3)부터
    if(gi>=3) svg += `<path d="M${cx-stipeW-2} ${topY+11} Q${cx} ${topY+17} ${cx+stipeW+2} ${topY+11} l0 3 Q${cx} ${topY+20} ${cx-stipeW-2} ${topY+14} Z" fill="${P.dark}"/>`;
    // 갓 돔
    svg += `<path d="M${cx-capW} ${topY} Q${cx} ${topY-capLift} ${cx+capW} ${topY} Q${cx} ${topY+7} ${cx-capW} ${topY} Z" fill="${P.main}"/>`;
    svg += `<path d="M${cx-capW} ${topY} Q${cx} ${topY-capLift} ${cx+capW} ${topY}" fill="none" stroke="${P.dark}" stroke-width="1.4"/>`;
    // 점박이 — 성장체부터
    if(gi>=3){
      svg += `<circle cx="${cx-capW*0.45}" cy="${topY-capLift*0.45}" r="${2+gi*0.3}" fill="${P.light}" opacity=".9"/>`;
      svg += `<circle cx="${cx+capW*0.4}" cy="${topY-capLift*0.5}" r="${1.8+gi*0.25}" fill="${P.light}" opacity=".9"/>`;
      svg += `<circle cx="${cx}" cy="${topY-capLift*0.28}" r="${1.6+gi*0.2}" fill="${P.light}" opacity=".9"/>`;
    }
    // 완숙체(gi>=5): 떠오르는 포자
    if(gi>=5){
      svg += `<circle cx="${cx-12}" cy="${topY-capLift-6}" r="2" fill="${P.accent}" opacity=".8"/>`;
      svg += `<circle cx="${cx+10}" cy="${topY-capLift-10}" r="1.6" fill="${P.accent}" opacity=".7"/>`;
    }
```

> `cx`(=60)는 함수 상단에서 이미 정의됨. `svg`/`cy`/`gi`/`P`도 동일 스코프. 마지막 `svg += elementMotif(el, gi, cx, cy-18);`(7684)는 모든 분기 공통으로 갓 위에 모티프를 얹으니 그대로 둔다.

- [ ] **Step 6: `composePlantSvg`에서 bodyStyle 전달(훅 배선)**

현재(7698):
```js
    ${composePlantBody(seedType, gi, P, el)}
```
교체:
```js
    ${composePlantBody(seedType, gi, P, el, opts.bodyStyle || 'classic')}
```

> `opts`는 `composePlantSvg` 상단에서 `opts = opts||{}`로 보장됨(7688). 현재 호출부는 `opts.bodyStyle`를 안 넘기므로 항상 `'classic'`. 향후 B/C는 호출부에서 `SPECIES[key].bodyStyle`를 `opts.bodyStyle`로 전달하면 됨(이번 범위 아님).

- [ ] **Step 7: 셀프테스트 통과 확인**

Run: preview 리로드 → `window.__catalogSelfTest()`.
Expected: `appearance: mushroom body distinct + skips cotyledon` PASS. 그리고 **수동 육안 확인**: 도감(`docs/dex/plant-codex.html`) 또는 게임에서 버섯 종이 나무가 아닌 버섯 실루엣으로, 단계 리본을 올릴수록 갓이 펴지는지 본다(preview 스크린샷).

- [ ] **Step 8: 커밋**

```bash
git add index.html
git commit -m "feat(plant): 버섯 전용 외형(composePlantBody mushroom 분기)+bodyStyle 훅, 떡잎 생략"
```

---

### Task 3: 버섯 6종 + 시그니처 6종 (`SKILL_LIB` + `SPECIES_CATALOG`)

**Files:**
- Modify: `index.html` — `SKILL_LIB`(현재 ~3814, `sig.spore_cloud` 항목 뒤)에 시그니처 6종; `SPECIES_CATALOG`(현재 ~3372, `spore_cap` 뒤)에 종 6개.
- Test: 셀프테스트 블록에 `window.__test(...)` 추가.

**Interfaces:**
- Consumes: `buildBase(type, el)`(빌더, 스탯 자동계산), `skillById(id)`, `ELEMENT_STATS`, `TYPE_STATS.mushroom`, `SPECIES`.
- Produces: `SPECIES.spore_fire|spore_water|spore_earth|spore_wind|spore_bolt|spore_ice`(seedType `'mushroom'`, rarity `'rare'`); 시그니처 `sig.spore_ignite|spore_mist|myco_net|spore_gust|spore_charge|frost_spore`.

- [ ] **Step 1: 실패하는 셀프테스트 추가**

```js
window.__test('mushroom: 7-element grid + signatures resolve', function(){
  const fails = [];
  const elByKey = { spore_fire:'fire', spore_water:'water', spore_earth:'earth',
                    spore_wind:'wind', spore_bolt:'bolt', spore_ice:'ice' };
  Object.keys(elByKey).forEach(function(k){
    const s = SPECIES[k];
    if(!s){ fails.push('missing species '+k); return; }
    if(s.seedType !== 'mushroom') fails.push(k+' seedType should be mushroom');
    if(s.rarity !== 'rare') fails.push(k+' rarity should be rare');
    const e = ELEMENT_STATS[elByKey[k]], t = TYPE_STATS.mushroom;
    if(s.base.hp!==e.hp+t.hp || s.base.atk!==e.atk+t.atk || s.base.def!==e.def+t.def || s.base.spd!==e.spd+t.spd)
      fails.push(k+' base stat != ELEMENT_STATS+TYPE_STATS.mushroom');
    (s.signatures||[]).forEach(function(sig){ if(!skillById(sig)) fails.push(k+' signature unresolved: '+sig); });
    if(!s.baseVariants || s.baseVariants[0] !== 'spore') fails.push(k+' should be born spore variant');
  });
  ['sig.spore_ignite','sig.spore_mist','sig.myco_net','sig.spore_gust','sig.spore_charge','sig.frost_spore']
    .forEach(function(id){ if(!skillById(id)) fails.push('skill missing: '+id); });
  return fails;
});
```

- [ ] **Step 2: 셀프테스트 실패 확인**

Run: preview 리로드 → `window.__catalogSelfTest()`.
Expected: FAIL — 6종·6시그니처 모두 미존재.

- [ ] **Step 3: 시그니처 6종을 `SKILL_LIB`에 추가**

`SKILL_LIB`의 `'sig.spore_cloud': {...},` 항목 바로 뒤(닫는 `};` 전)에 추가:

```js
  'sig.spore_ignite': { name:'포자 발화', icon:'🔥', cost:3, kind:'attack', aoe:true, power:100,
    dot:{kind:'burn',pct:0.06,turns:3},
    desc:'위력100 · 광역 + 화상(3턴)', tag:'시그니처', grade:'A' },
  'sig.spore_mist': { name:'포자 안개', icon:'💧', cost:3, kind:'heal', heal:0.15,
    enemyDebuff:{stat:'acc',pct:0.2,turns:2},
    desc:'체력 15% 회복 + 적 적중 20%↓(2턴)', tag:'시그니처', grade:'A' },
  'sig.myco_net': { name:'균사 그물', icon:'🕸️', cost:3, kind:'debuff',
    enemyDebuff:{stat:'spd',pct:0.3,turns:2}, selfBuff:{stat:'def',pct:0.2,turns:3}, dot:{kind:'poison',pct:0.04,turns:2},
    desc:'적 기동 30%↓(2턴) + 자기 방어 20%↑(3턴) + 중독(2턴)', tag:'시그니처', grade:'A' },
  'sig.spore_gust': { name:'포자 질풍', icon:'🌪️', cost:3, kind:'attack', aoe:true, power:90,
    dot:{kind:'poison',pct:0.05,turns:3}, selfBuff:{stat:'spd',pct:0.2,turns:2},
    desc:'위력90 · 광역 + 중독(3턴) + 자기 기동 20%↑(2턴)', tag:'시그니처', grade:'A' },
  'sig.spore_charge': { name:'전도 포자', icon:'⚡', cost:3, kind:'attack', aoe:true, power:110,
    critBonus:0.2, dot:{kind:'poison',pct:0.04,turns:2},
    desc:'위력110 · 광역 + 치명타율 +20% + 중독(2턴)', tag:'시그니처', grade:'A' },
  'sig.frost_spore': { name:'빙결 포자', icon:'❄️', cost:3, kind:'attack', aoe:true, power:90,
    enemyDebuff:{stat:'spd',pct:0.25,turns:2}, dot:{kind:'poison',pct:0.04,turns:2},
    desc:'위력90 · 광역 + 적 기동 25%↓(2턴) + 중독(2턴)', tag:'시그니처', grade:'A' },
```

- [ ] **Step 4: 종 6개를 `SPECIES_CATALOG`에 추가**

`spore_cap: {...},` 항목 바로 뒤(`SPECIES_CATALOG`의 닫는 `};` 전)에 추가:

```js
  spore_fire: {
    name:'이그니캡', type:'mushroom', element:'fire', rarity:'rare',
    baseVariants:['spore'], variantSlots:{ spore:2, normal:4 },
    signatures:['sig.spore_ignite'],
    stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['sig.spore_ignite'] },
  },
  spore_water: {
    name:'미스트캡', type:'mushroom', element:'water', rarity:'rare',
    baseVariants:['spore'], variantSlots:{ spore:2, normal:4 },
    signatures:['sig.spore_mist'],
    stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['sig.spore_mist'] },
  },
  spore_earth: {
    name:'트러플캡', type:'mushroom', element:'earth', rarity:'rare',
    baseVariants:['spore'], variantSlots:{ spore:2, normal:4 },
    signatures:['sig.myco_net'],
    stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['sig.myco_net'] },
  },
  spore_wind: {
    name:'윈드퍼프', type:'mushroom', element:'wind', rarity:'rare',
    baseVariants:['spore'], variantSlots:{ spore:2, normal:4 },
    signatures:['sig.spore_gust'],
    stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['sig.spore_gust'] },
  },
  spore_bolt: {
    name:'볼트캡', type:'mushroom', element:'bolt', rarity:'rare',
    baseVariants:['spore'], variantSlots:{ spore:2, normal:4 },
    signatures:['sig.spore_charge'],
    stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['sig.spore_charge'] },
  },
  spore_ice: {
    name:'프로스트캡', type:'mushroom', element:'ice', rarity:'rare',
    baseVariants:['spore'], variantSlots:{ spore:2, normal:4 },
    signatures:['sig.frost_spore'],
    stageSkills:{ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'], growing:['sig.frost_spore'] },
  },
```

- [ ] **Step 5: 셀프테스트 통과 확인**

Run: preview 리로드 → `window.__catalogSelfTest()`.
Expected: `mushroom: 7-element grid + signatures resolve` PASS. 기존 `catalog: every species has default rich fields`·`skills: catalog stageSkills unlock for catalog species`도 PASS 유지(신규 6종 자동 포함).

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "feat(species): 버섯 6속성 종(이그니/미스트/트러플/윈드퍼프/볼트/프로스트캡)+시그니처 6종"
```

---

### Task 4: 탐사 연동 — `EXPLORE_VIEW` 지역 테마에 `버섯형` 추가

**Files:**
- Modify: `index.html` — `EXPLORE_VIEW`(현재 ~6491) 내 6개 지역의 `types` 배열에 `'버섯형'` 추가.
- Test: 셀프테스트 블록에 `window.__test(...)` 추가.

**Interfaces:**
- Consumes: `rollSpeciesFromView`가 region `el`(속성)·`types`(타입 한글명)로 종을 필터(element AND type 모두 일치). `SEED_TYPE_BY_KO['버섯형'] === 'mushroom'`(자동 생성).
- Produces: 버섯 7속성 전부가 최소 한 지역에서 드롭 가능(element별 도달성).

- [ ] **Step 1: 실패하는 셀프테스트 추가**

```js
window.__test('exploration: every mushroom element reachable via 버섯형 region', function(){
  const fails = [];
  ['grass','fire','water','earth','wind','bolt','ice'].forEach(function(el){
    const ok = EXPLORE_VIEW.some(function(planet){
      return (planet.regions||[]).some(function(r){
        return (r.el||[]).indexOf(el) >= 0 && (r.types||[]).indexOf('버섯형') >= 0;
      });
    });
    if(!ok) fails.push('no 버섯형 region covers element '+el);
  });
  return fails;
});
```

- [ ] **Step 2: 셀프테스트 실패 확인**

Run: preview 리로드 → `window.__catalogSelfTest()`.
Expected: FAIL — 현재 어떤 지역 `types`에도 `'버섯형'`이 없어 7속성 전부 도달 불가.

- [ ] **Step 3: 6개 지역 `types`에 `'버섯형'` 추가**

각 지역의 고유 이름으로 줄을 찾아 `types` 배열만 수정(같은 `types:['화초형']` 문자열이 여러 곳이라 **반드시 지역명 줄로 식별**):

1. 포자 늪 `el:['grass','wind'], types:['화초형']` → `types:['화초형','버섯형']`  *(grass, wind 커버)*
2. 균사 회랑 `el:['grass'], types:['목본형','덩굴형']` → `types:['목본형','덩굴형','버섯형']`  *(grass)*
3. 흑요암 능선 `el:['fire'], types:['다육형','목본형']` → `types:['다육형','목본형','버섯형']`  *(fire)*
4. 잿빛 평원 `el:['earth','fire'], types:['화초형']` → `types:['화초형','버섯형']`  *(earth)*
5. 전자기 늪 `el:['bolt','water'], types:['화초형']` → `types:['화초형','버섯형']`  *(bolt, water)*
6. 서리 동굴 `el:['ice'], types:['다육형','덩굴형']` → `types:['다육형','덩굴형','버섯형']`  *(ice)*

> 7속성 = grass·wind·fire·earth·bolt·water·ice 전부 1곳 이상에서 도달. 카이렌(균사 행성)·벨로크(용암)·번개/빙결 지역에 분산해 테마 정합 유지.

- [ ] **Step 4: 셀프테스트 통과 확인**

Run: preview 리로드 → `window.__catalogSelfTest()`.
Expected: `exploration: every mushroom element reachable via 버섯형 region` PASS.

- [ ] **Step 5: 도감 확인(수동)**

Run: `docs/dex/plant-codex.html`을 preview로 열어 버섯형 그룹에 7종(스포어캡+6)이 버섯 외형으로 노출되는지 확인(서비스워커/캐시 비우고). 코드 변경 없음(자동 반영 확인용).

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "feat(explore): 탐사 지역 테마에 버섯형 추가(7속성 버섯 드롭 보장)"
```

---

### Task 5: 문서 갱신 + 최종 검증/푸시

**Files:**
- Modify: `docs/species-system-guide.md`(버섯 7종 표·실루엣 행·타입별 단계명 표), `docs/master-roadmap.md`(결정 로그+현황+문서지도), `docs/CHANGELOG.md`(최상단 신규 항목).

**Interfaces:**
- Consumes: Task 1~4의 확정 데이터(종 7개·시그니처 6·단계명·탐사 지역).

- [ ] **Step 1: `species-system-guide.md` 갱신**

- §2.x에 **버섯형 7종 표** 신설(속성·종 이름·HP/공/방/기동). 스탯은 `TYPE_STATS.mushroom + ELEMENT_STATS`:
  이그니캡 78/23/11/15 · 미스트캡 104/16/21/13 · 스포어캡 94/20/15/20 · 트러플캡 96/18/21/10 · 윈드퍼프 78/20/10/24 · 볼트캡 76/26/9/22 · 프로스트캡 90/20/13/12.
- §5 실루엣 표에 `🍄 버섯형 | 통통한 자루 + 점박이 갓 + 고리(완숙=포자 입자)` 행 추가.
- **타입별 단계명 표**(Task 1 STAGE_NAMES_BY_TYPE) 섹션 추가.

- [ ] **Step 2: `master-roadmap.md` 갱신**

- 결정 로그에 항목 추가: `2026-06-24 — 버섯 타입 완성: 7속성 종·전용 외형(클래식 독버섯+bodyStyle 훅)·시그니처 6·타입별 단계명(5타입)·탐사 드롭 연동. B(군락=추가타)·C(발광)는 후속.`
- 현황 요약에 버섯 종 7개 반영.
- 문서지도에 이 스펙/플랜 등록.

- [ ] **Step 3: `CHANGELOG.md` 최상단 항목 추가**

```
- **2026-06-24** — 버섯 타입 완성: 7속성 종(스포어캡+6)·전용 외형(composePlantBody mushroom 분기, 떡잎 생략, bodyStyle 훅)·시그니처 6종(SKILL_LIB)·타입별 생장 단계명(STAGE_NAMES_BY_TYPE, 5타입)·탐사 지역 6곳에 버섯형 추가. B(군락=추가타)·C(발광) 외형은 기록만(후속).
```

- [ ] **Step 4: 전체 셀프테스트 최종 확인**

Run: preview 리로드 → `window.__catalogSelfTest()`.
Expected: 전 케이스 PASS(fails 빈 배열). 신규 4개 케이스 + 기존 케이스 모두 통과.

- [ ] **Step 5: 커밋 + 푸시**

```bash
git add docs/species-system-guide.md docs/master-roadmap.md docs/CHANGELOG.md
git commit -m "docs: 버섯 타입 완성 반영(종 7·외형·단계명·탐사) + 결정 로그/CHANGELOG"
git push
```

> pre-push 훅이 코드+문서 동반 푸시를 요구하므로 이 커밋까지 묶어 푸시.

---

## Self-Review

**Spec coverage:**
- §2 외형 → Task 2 ✓ (mushroom 분기 + bodyStyle 훅 + 떡잎 생략)
- §3 타입별 단계명 → Task 1 ✓ (STAGE_NAMES_BY_TYPE + growthStageName + 호출부)
- §4 종 7개 → Task 3 ✓ (spore_cap 유지 + 6 신규, 스탯 자동, 태생 포자변이)
- §5 시그니처 6 → Task 3 ✓ (SKILL_LIB)
- §6 도감/탐사 연동 → Task 4 ✓ (EXPLORE_VIEW 6지역 + 도감 수동확인)
- §7 B/C 기록만 → Task 2의 bodyStyle 훅 + 스펙/문서에 기록 ✓ (구현 제외)
- §8 검증 → 각 Task에 셀프테스트 ✓
- §9 영향 파일 → Task 5 문서 일괄 ✓

**Placeholder scan:** 모든 코드 스텝에 실제 코드/정확 수치 포함. TBD/TODO 없음.

**Type consistency:** `growthStageName(stage, seedType)` 시그니처 Task1 정의 ↔ Task1 호출부 일치. 시그니처 키(`sig.spore_ignite` 등) Task3 SKILL_LIB 정의 ↔ SPECIES_CATALOG `signatures`/`stageSkills` 참조 일치. `composePlantBody(..., bodyStyle)` Task2 정의 ↔ `composePlantSvg` 호출 일치. `'버섯형'`/`SEED_TYPE_BY_KO` 한글명 Task4 일치.
