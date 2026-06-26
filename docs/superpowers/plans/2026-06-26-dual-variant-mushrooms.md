# 이중 변이 버섯 (포자 + 두 번째 변이 28종) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포자 단일 변이 버섯 위에 "포자 + 두 번째 변이(toxic/pred/weapon/dragon)" 이중 변이 버섯 28종을 추가하고, 다변이 종이 두 변이의 카드·스킬을 모두 쓰도록 엔진 2함수를 확장한다.

**Architecture:** `baseVariants:['spore', X]` 다변이 종. `cardFitsForm`/`variantSkillsOf`를 `p.form`(단수) → 종의 변이 목록 전체로 확장해 두 번째 변이 카드·전용 스킬을 노출(공존, 융합 메커니즘 없음). 28종 컨셉/스킬은 멱등 생성기 `scripts/gen-dual-mushrooms.js`로 `SKILL_LIB`/`SPECIES_CATALOG`/`MUTANT_SIGNATURES` 마커 블록에 주입. 버섯은 저스탯 by design 유지(`applyVariantIdentity` 제외 그대로).

**Tech Stack:** 바닐라 JS 단일 파일(`index.html`), Node 생성기 스크립트, 콘솔 셀프테스트 `window.__catalogSelfTest()`.

## Global Constraints

- 빌드 없음. 순수 HTML/CSS/JS. 데이터는 `index.html` 인라인.
- 테스트 러너 없음 → 회귀 검증은 `window.__catalogSelfTest()` **반환 fails 배열**. 케이스는 `window.__test('name', fn)`, `fn` 내부는 `if(fails.length) throw new Error(...)`.
- 결정론 규율: 신규/수정 전투 난수는 `rng()`만(`Math.random()` 금지), resolve 경로 순수 유지.
- 변이 카드 슬롯 = 총 5칸(`equipped_trait_cards.slice(0,5)`), 칸별 예약 없음. 게이트 = `cardFitsForm`뿐.
- `'use strict'` — 함수 선언 삭제 금지(빈 스텁 보존).
- 생성기 직렬화: 배열-of-객체는 재귀 직렬화 필수. 생성기 실행 후 반드시 `__catalogSelfTest()` 검증.
- 버섯 = 전부 포자(첫 변이 `spore` 고정). 저스탯 유지.
- 작업 시작 `git pull`, 끝 `git push origin HEAD:main`. 내가 만진 파일만 선택 스테이징.

---

### Task 1: `cardFitsForm` 다변이 확장

**Files:**
- Modify: `index.html` (함수 `cardFitsForm` ~5193, 셀프테스트 블록 ~14266 영역)

**Interfaces:**
- Produces: `cardFitsForm(key, formOrPlant)` — 두 번째 인자가 문자열(form)이면 기존 동작, plant 객체면 `base_variants` 전체를 고려. 기존 호출부(문자열 form 전달)는 무변경 호환.

- [ ] **Step 1: 셀프테스트 추가(실패 확인용)** — 파일 끝 셀프테스트 영역(`window.__test(...)` 근처, ~14400)에 추가:

```js
window.__test('dual-variant card gate', function(){
  const fails = [];
  // 가짜 이중 변이 종 등록
  const K='__dualtest_tox';
  SPECIES[K] = { name:'테스트독버섯', seedType:'mushroom', element:'grass', baseVariants:['spore','toxic'], variant_slots:{}, released:false };
  // 포자 카드(spore)·독성 카드(potion)·공통(common)·무기(weapon) 적격 판정
  const p = { species:K, form:'spore', base_variants:['spore','toxic'] };
  if(!cardFitsForm('card_poisonspore', p)) fails.push('spore 카드가 이중버섯에 안 맞음');
  if(!cardFitsForm('card_toxise', p) && !cardFitsForm(__anyCardOfType('potion'), p)) fails.push('독성(potion) 카드가 이중버섯에 안 맞음');
  if(!cardFitsForm(__anyCardOfType('common'), p)) fails.push('공통 카드가 이중버섯에 안 맞음');
  if(cardFitsForm(__anyCardOfType('weapon'), p)) fails.push('무기 카드가 (spore+toxic)에 잘못 맞음');
  delete SPECIES[K];
  if(fails.length) throw new Error(fails.join(' | '));
});
// 테스트 헬퍼: 특정 타입의 임의 카드 id 1개
function __anyCardOfType(t){ return Object.keys(TRAIT_CARDS).find(k=>TRAIT_CARDS[k].type===t); }
```

- [ ] **Step 2: 브라우저 콘솔에서 실패 확인** — preview(`pullosseum` 8765) 리로드 후 콘솔: `__catalogSelfTest()` → `dual-variant card gate` 케이스가 fails에 포함됨을 확인(현재 `cardFitsForm`은 plant 객체를 form으로 받으면 `FORMS[객체]`=undefined→normal로 처리돼 오작동).

- [ ] **Step 3: `cardFitsForm` 구현 교체** — `index.html` ~5193:

```js
/* 카드가 이 변이형(또는 다변이 종)에 장착 가능한지.
   form 인자 = 문자열(단일 form) 또는 plant/unit 객체(base_variants 전체 고려). */
function cardFitsForm(key, formOrPlant){
  const c = cardDefOf(key); if(!c) return false;
  // 종의 변이 목록 추출 (객체면 base_variants, 문자열이면 단일)
  let forms;
  if(formOrPlant && typeof formOrPlant === 'object'){
    forms = (formOrPlant.base_variants && formOrPlant.base_variants.length)
      ? formOrPlant.base_variants.slice()
      : [formOrPlant.form || 'normal'];
  } else {
    forms = [formOrPlant || 'normal'];
  }
  // 공통 카드: 변이 중 하나라도 dragon이 아니면 OK (spore가 늘 common 허용 → 이중버섯 공통 항상 가능)
  if(c.type === 'common') return forms.some(f => f !== 'dragon');
  // 변이 카드: 변이 중 하나라도 그 form의 cardType과 일치하면 OK
  return forms.some(f => { const fd = FORMS[f] || FORMS.normal; return c.type === fd.cardType; });
}
```

- [ ] **Step 4: 호출부 plant 전달로 갱신** — `cardFitsForm(key, p.form||'normal')` 호출 2곳(~11231, ~11395)을 `cardFitsForm(key, p)`로, `ownedFormCards(form)`는 plant를 받게 보강:

```js
// ~5204 부근
function ownedFormCards(formOrPlant){ return ownedTraitCardIds().filter(key => cardFitsForm(key, formOrPlant)); }
```
그리고 `ownedFormCards(p.form || 'normal')`(~6549) → `ownedFormCards(p)`로 교체. (단일 form 문자열 호출도 여전히 호환되므로 다른 호출부는 그대로 두어도 무방.)

- [ ] **Step 5: 셀프테스트 통과 확인** — 리로드 후 콘솔 `__catalogSelfTest()` → `dual-variant card gate` 통과 + 전체 0 fail.

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -F - <<'EOF'
feat(mushroom): cardFitsForm 다변이(base_variants) 확장 — 이중 변이 카드 게이트

plant/unit 객체를 받으면 변이 목록 전체로 적격 판정(공통=dragon만 아니면 OK,
변이카드=변이 중 하나라도 cardType 일치). 문자열 form 호출 호환 유지.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 2: `variantSkillsOf` + born-skill 다변이 확장

**Files:**
- Modify: `index.html` (`variantSkillsOf` ~5171, `makeCombatant` born-skill push ~12105 영역, 셀프테스트)

**Interfaces:**
- Consumes: Task 1 없음(독립).
- Produces: `variantSkillsOf(p)` — `p.base_variants`(없으면 `[p.form]`) 전체를 순회해 각 변이의 전용 스킬을 합집합으로 반환(중복 제거). 무기형은 장착 무기 카드 기반(기존 로직 유지).

- [ ] **Step 1: 셀프테스트 추가** — 파일 끝 셀프테스트 영역:

```js
window.__test('dual-variant skills', function(){
  const fails = [];
  // 포자+포식 = 포식 전용 스킬 포함, 포자+용족 = 비늘·브레스 포함
  const pPred = { form:'spore', base_variants:['spore','pred'], equipped_trait_cards:[] };
  const sp = variantSkillsOf(pPred);
  if(!sp.includes('skill_card_predation')) fails.push('포자+포식이 포식기 미부여');
  const pDr = { form:'spore', base_variants:['spore','dragon'], equipped_trait_cards:[] };
  const sd = variantSkillsOf(pDr);
  if(!(sd.includes('skill_card_scale') && sd.includes('skill_card_breath'))) fails.push('포자+용족이 브레스 미부여');
  // 순수 포자(두번째 변이 없음)는 전용 스킬 0개 유지
  const pSpore = { form:'spore', base_variants:['spore'], equipped_trait_cards:[] };
  if(variantSkillsOf(pSpore).length !== 0) fails.push('순수 포자가 전용 스킬을 가짐(회귀)');
  if(fails.length) throw new Error(fails.join(' | '));
});
```

- [ ] **Step 2: 실패 확인** — `__catalogSelfTest()` → `dual-variant skills` fails에 포함(현재 `variantSkillsOf`는 `p.form`='spore'만 봐서 빈 배열 반환).

- [ ] **Step 3: `variantSkillsOf` 구현 교체** — `index.html` ~5171:

```js
/* 변이 스킬(하단 바) — 종의 변이 목록 전체에서 각 변이형이 부여하는 별도 스킬 ID 합집합.
   포자=전용 스킬 0(패시브 아우라). 무기=장착 무기 카드(최대2). 그 외=고정 전용기. */
function variantSkillsOf(p){
  const forms = (p && p.base_variants && p.base_variants.length) ? p.base_variants : [(p && p.form) || 'normal'];
  const out = [];
  const add = id => { if(id && !out.includes(id)) out.push(id); };
  forms.forEach(form => {
    if(form === 'pred'){ add('skill_card_predation'); }
    else if(form === 'weapon'){
      (p.equipped_trait_cards || p.cards || []).forEach(key => {
        const def = cardDefOf(key);
        if(def && def.type === 'weapon' && def.grantSkill && !out.includes(def.grantSkill) && out.length < 6){ add(def.grantSkill); }
      });
    }
    else if(form === 'toxic'){ add('skill_card_infuse'); add('skill_card_spray'); }
    else if(form === 'dragon'){ add('skill_card_scale'); add('skill_card_breath'); }
    // spore·normal = 전용 스킬 없음
  });
  return out;
}
```

- [ ] **Step 4: 셀프테스트 통과 확인** — `__catalogSelfTest()` 전체 0 fail. 특히 기존 `dual-variant skills` 통과 + 비버섯 변이종 회귀 없음.

- [ ] **Step 5: preview 실전투 스모크** — 콘솔에서 포자+포식 이중버섯 1개를 심어 전투 진입 후 하단 변이 바에 포식기가 뜨는지 확인(Task 4 이후 재확인). 지금은 가짜 plant로 `variantSkillsOf` 반환만 검증.

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -F - <<'EOF'
feat(mushroom): variantSkillsOf 다변이 확장 — 두 번째 변이 전용 스킬 노출

base_variants 전체 순회로 포식/독성/용족/무기 전용 스킬 합집합 반환(중복 제거).
포자·노멀=0 유지. 순수 변이종 회귀 없음(셀프테스트).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 3: 포자 발산 시각 보장 (선택·경량)

**Files:**
- Modify: `index.html` (`tickStatuses` 포자 루프 ~12882)

**Interfaces:**
- Produces: 포자 변이형(또는 spore in base_variants) 유닛은 매 턴 끝에 "포자 발산" 로그/VFX가 **항상** 1회 표시(효과 적중은 기존 효과별 확률 유지). 밸런스 무변경.

- [ ] **Step 1: 현재 동작 확인** — `tickStatuses` ~12882 `u.cardFx.spores.forEach(sp=>{ const roll=rng(), success=roll<sp.chance; if(!success) return; ... })`. 효과별 확률은 그대로 둔다(사용자 결정 A안).

- [ ] **Step 2: 항상-발산 cue 추가** — 포자 카드가 1장 이상 있고 아무 효과도 안 떴을 때 무해한 로그 1줄:

```js
// u.cardFx.spores 루프 직후(닫는 } 다음)에 추가
if(u.cardFx && u.cardFx.spores && u.cardFx.spores.length && B && !changed){
  blog(`<span class="em">${u.name}</span> 🍄 포자를 흩뿌렸다…`);
}
```
(`changed`는 효과 적중 시 true가 됨 → 효과가 떴으면 중복 로그 안 냄. 밸런스·상태 변화 없음.)

- [ ] **Step 3: preview 확인** — 포자 카드 장착 유닛 전투에서 매 턴 포자 로그가 항상 나오는지(효과 미적중 턴 포함). `rng` 사용 분기 무변경.

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -F - <<'EOF'
feat(mushroom): 포자 발산을 매 턴 항상 표시(효과별 확률은 유지)

포자 카드 보유 유닛은 미적중 턴에도 발산 로그 1줄. 밸런스·상태 무변경.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 4: 28종 이중 변이 버섯 — 데이터 생성기 (종 + 스킬)

**Files:**
- Create: `scripts/gen-dual-mushrooms.js`
- Modify: `index.html` (마커 블록 2개 신설 + 주입)

**Interfaces:**
- Consumes: Task 1·2(다변이 엔진).
- Produces: `SPECIES_CATALOG`에 28개 키 `spore_<v>_<el>`(v∈{tox,pred,wpn,drg}, el∈7속성). 각 `{ name, type:'mushroom', element, rarity, released:false, baseVariants:['spore', X], variant_slots, signatures, stageSkills }`. `SKILL_LIB`에 `ind.spore_<v>_<el>.m`/`.e`(+ drg는 `.j`/`.m2`).

- [ ] **Step 1: index.html에 멱등 마커 블록 2개 추가** — 빈 블록을 손으로 한 번 삽입(생성기가 이 사이를 교체).
  - `SKILL_LIB` 안, `ind.spore_ice.e` 정의 직후(~4560 부근)에:
```js
  /* __DUAL_MUSHROOM_SKILLS_START__ */
  /* __DUAL_MUSHROOM_SKILLS_END__ */
```
  - `SPECIES_CATALOG`(=`const SPECIES_CATALOG = { ... }`) 안, `spore_ice` 종 정의 직후(~3625 부근)에:
```js
  /* __DUAL_MUSHROOM_SPECIES_START__ */
  /* __DUAL_MUSHROOM_SPECIES_END__ */
```

- [ ] **Step 2: 생성기 작성** — `scripts/gen-dual-mushrooms.js`. 매핑 규칙(고정·확정):

```js
/* 이중 변이 버섯 생성기 — 멱등. SKILL_LIB·SPECIES_CATALOG 마커 블록 교체.
   사용: node scripts/gen-dual-mushrooms.js --dry  /  node scripts/gen-dual-mushrooms.js */
const fs=require('fs'), path=require('path');
const HTML=path.join(__dirname,'..','index.html');
const DRY=process.argv.includes('--dry');

const ELS=['fire','water','grass','earth','wind','bolt','ice'];
const EL_KO={fire:'불',water:'물',grass:'풀',earth:'대지',wind:'바람',bolt:'번개',ice:'서리'};
const EL_ICON={fire:'🔥',water:'💧',grass:'🌿',earth:'🪨',wind:'🌪️',bolt:'⚡',ice:'❄️'};
const DOT_BY_EL={fire:'burn',ice:'bleed',bolt:'poison',water:'poison',grass:'poison',earth:'poison',wind:'poison'};
// 두 번째 변이별: form, cardType, 희귀도, 스킬 메커니즘, 이름 토큰
const VAR={
  tox: { form:'toxic',  rarity:'common', nameTok:'독',  // 독증폭형: 중독 강화 + 적 방깎
    m:e=>({name:EL_KO[e]+' 독포자', icon:'☠️', cost:2, kind:'attack', power:85, single:true, dot:{kind:'poison',pct:0.05,turns:3}, enemyDebuff:{stat:'def',pct:0.15,turns:2}, desc:'위력85 · 단일 + 중독(3턴) + 적 방어 15%↓(2턴)', tag:'개체', grade:'B'}),
    e:e=>({name:EL_KO[e]+' 부식 만개', icon:'☠️', cost:3, kind:'attack', power:120, aoe:true, dot:{kind:'poison',pct:0.06,turns:3}, enemyDebuff:{stat:'def',pct:0.2,turns:2}, desc:'위력120 · 광역 + 강중독(3턴) + 적 방어 20%↓(2턴)', tag:'개체', grade:'A'}) },
  pred:{ form:'pred',   rarity:'common', nameTok:'균사',  // 흡혈형: drain
    m:e=>({name:EL_KO[e]+' 균사 흡수', icon:'🦷', cost:2, kind:'drain', power:90, single:true, lifesteal:0.5, desc:'위력90 · 단일 + 피해 50% 흡혈', tag:'개체', grade:'B'}),
    e:e=>({name:EL_KO[e]+' 포식 균사', icon:'🦷', cost:3, kind:'drain', power:120, single:true, lifesteal:0.6, dot:{kind:'poison',pct:0.05,turns:2}, desc:'위력120 · 단일 + 60% 흡혈 + 중독(2턴)', tag:'개체', grade:'A'}) },
  wpn: { form:'weapon', rarity:'common', nameTok:'갓',  // 물리·관통형: 낮은 DoT, 방어/관통
    m:e=>({name:EL_KO[e]+' 갓 가시', icon:'🗡️', cost:2, kind:'attack', power:100, single:true, pierce:0.5, desc:'위력100 · 단일 + 방어 50% 관통', tag:'개체', grade:'B'}),
    e:e=>({name:EL_KO[e]+' 균각 강타', icon:'🗡️', cost:3, kind:'attack', power:135, aoe:true, pierce:0.5, critBonus:0.15, desc:'위력135 · 광역 + 관통 + 치명 +15%', tag:'개체', grade:'A'}) },
  drg: { form:'dragon', rarity:'rare',   nameTok:'룡',  // 브레스 충전→방출
    j:e=>({name:EL_KO[e]+' 포자 숨 고르기', icon:'🐉', cost:1, kind:'buff', breathCharge:{atkPct:0.12,cap:4}, energyGain:1, desc:'브레스 충전(공격 누적↑) + ⚡1 · 저비용', tag:'개체'}),
    m:e=>({name:EL_KO[e]+' 포자 브레스', icon:'🐲', cost:3, kind:'attack', power:115, single:true, breathScale:true, dot:{kind:DOT_BY_EL[e],pct:0.05,turns:3}, desc:'위력115(브레스 충전 비례↑·소비) · 단일 + 지속피해(3턴)', tag:'개체', grade:'A'}),
    e:e=>({name:EL_KO[e]+' 대포자 브레스', icon:'🐲', cost:3, kind:'attack', power:135, aoe:true, breathScale:true, dot:{kind:'poison',pct:0.05,turns:3}, desc:'위력135(충전 비례↑·소비) · 광역 + 중독(3턴)', tag:'개체', grade:'A'}) },
};
const NAME_BASE={fire:'이그니',water:'미스트',grass:'스포어',earth:'트러플',wind:'윈드',bolt:'볼트',ice:'프로스트'};

function ser(o){ // 재귀 직렬화(배열-of-객체 안전)
  if(Array.isArray(o)) return '['+o.map(ser).join(',')+']';
  if(o && typeof o==='object') return '{'+Object.keys(o).map(k=>k+':'+ser(o[k])).join(', ')+'}';
  if(typeof o==='string') return JSON.stringify(o);
  return String(o);
}

const skillLines=[], speciesLines=[];
Object.keys(VAR).forEach(v=>{ const V=VAR[v];
  ELS.forEach(el=>{
    const key=`spore_${v}_${el}`;
    const ind=`ind.${key}`;
    const stage={ sprout:['mushroom.spore_burst'], juvenile:['mushroom.spore_burst'] };
    // growing = 공유 시그니처(속성 포자) 재사용, mature/evolved = 생성 스킬
    stage.growing=['mushroom.spore_burst'];
    if(v==='drg'){ skillLines.push(`  '${ind}.j': ${ser(V.j(el))},`); stage.juvenile=[`${ind}.j`]; }
    skillLines.push(`  '${ind}.m': ${ser(V.m(el))},`);
    skillLines.push(`  '${ind}.e': ${ser(V.e(el))},`);
    stage.mature=[`${ind}.m`]; stage.evolved=[`${ind}.e`];
    const slots = v==='drg' ? {spore:1,dragon:1,normal:3} : (()=>{const o={spore:1,normal:3};o[V.form]=1;return o;})();
    const sp={ name:NAME_BASE[el]+V.nameTok, type:'mushroom', element:el, rarity:V.rarity, released:false,
      baseVariants:['spore',V.form], variant_slots:slots, signatures:[], stageSkills:stage };
    speciesLines.push(`  ${key}: ${ser(sp).replace('variant_slots:','variantSlots:')},`);
  });
});

function replaceBlock(html, start, end, body){
  const re=new RegExp('('+start.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')[\\s\\S]*?('+end.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')');
  return html.replace(re, '$1\n'+body+'\n  $2');
}
let html=fs.readFileSync(HTML,'utf8');
html=replaceBlock(html,'/* __DUAL_MUSHROOM_SKILLS_START__ */','/* __DUAL_MUSHROOM_SKILLS_END__ */', skillLines.join('\n'));
html=replaceBlock(html,'/* __DUAL_MUSHROOM_SPECIES_START__ */','/* __DUAL_MUSHROOM_SPECIES_END__ */', speciesLines.join('\n'));
console.log('skills:',skillLines.length,' species:',speciesLines.length);
if(!DRY) fs.writeFileSync(HTML,html); else console.log('(dry run)');
```

- [ ] **Step 3: dry run** — `node scripts/gen-dual-mushrooms.js --dry` → `skills: 70  species: 28` 출력 확인(drg 7종은 j 추가 → 7*3 + 21*2 = 63... 실제: tox/pred/wpn=각7*2=42, drg=7*3=21 → 70). species 28.

- [ ] **Step 4: 실제 주입** — `node scripts/gen-dual-mushrooms.js`.

- [ ] **Step 5: 셀프테스트로 카탈로그 무결성 확인** — preview 리로드 후 콘솔 `__catalogSelfTest()`:
  - 전체 0 fail (JS 파싱 안 깨짐 = 직렬화 OK).
  - `Object.keys(SPECIES).filter(k=>/^spore_(tox|pred|wpn|drg)_/.test(k)).length === 28`.
  - 28종 각 `SPECIES[k].baseVariants[0]==='spore'` (버섯 spore 단언 통과).

- [ ] **Step 6: 커밋**

```bash
git add scripts/gen-dual-mushrooms.js index.html
git commit -F - <<'EOF'
feat(mushroom): 이중 변이 버섯 28종 + 생성기(gen-dual-mushrooms)

4 두번째변이(독/균사/갓/룡) × 7속성 = 28종. baseVariants:['spore',X],
저스탯 유지, released:false. 단계 스킬(m/e, 룡은 j/m2 브레스) 멱등 생성.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 5: 외형 1차 차별화 (두 번째 변이 포인트)

**Files:**
- Modify: `index.html` (`composePlantSvg` 호출 경로는 이미 `varKey=species` 전달됨 — `plantVariant`가 색/무늬 자동. 추가로 두 번째 변이 색조 1개만)

**Interfaces:**
- Produces: 이중 버섯은 `varKey`로 종별 색/크기/무늬가 이미 갈림 + 두 번째 변이별 포자색 액센트 1개(toxic=독록, pred=핏빛, weapon=강철, dragon=주홍).

- [ ] **Step 1: 두 번째 변이 색조 헬퍼 추가** — `composePlantSvg` 근처에 종의 두 번째 변이 → 포자/반점 색 매핑(있으면 적용, 없으면 기존):

```js
/* 이중 버섯 두 번째 변이 액센트 색(1차 간단) */
const DUAL_MUSHROOM_ACCENT = { toxic:'#9be15d', pred:'#ff5d7a', weapon:'#cfd8e3', dragon:'#ff7a3a' };
function dualMushroomAccent(varKey){
  const s = (typeof SPECIES!=='undefined') && SPECIES[varKey];
  if(!s || s.seedType!=='mushroom' || !s.baseVariants || s.baseVariants.length<2) return null;
  return DUAL_MUSHROOM_ACCENT[s.baseVariants[1]] || null;
}
```

- [ ] **Step 2: 적용** — `composePlantSvg`에서 버섯 반점/포자 입자 색 결정 부분에 `dualMushroomAccent(opts.varKey)`가 non-null이면 그 색을 spot/입자에 우선 사용(기존 `plantVariant` 색 위 오버레이). 정확한 삽입 지점은 `composePlantSvg` 내 버섯 `bodyStyle`/spot 렌더 부근(grep `mushroom` in composePlantSvg). 단순 색 치환 1곳.

- [ ] **Step 3: preview 시각 확인** — `preview_eval`로 4종(`spore_tox_grass`,`spore_pred_water`,`spore_wpn_earth`,`spore_drg_fire`) `svgPlant(key,...)` 호출 → 반환 SVG 문자열에 각 액센트 색(`#9be15d` 등) 포함 확인(스크린샷은 floaty 타임아웃 위험 → DOM/문자열 검증).

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -F - <<'EOF'
feat(mushroom): 이중 변이 버섯 외형 1차 차별화 — 두 번째 변이 색조 액센트

varKey 기반 plantVariant(자동) + 두번째 변이별 포자색 1개(독록/핏빛/강철/주홍).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 6: 탐사 분포 (MUTANT_SIGNATURES)

**Files:**
- Modify: `index.html` (`MUTANT_SIGNATURES` ~8220) — 또는 Task 4 생성기에 통합

**Interfaces:**
- Consumes: Task 4(28종 키 존재).
- Produces: 28종이 지역 시그니처 풀에 분포(`released:false`라 일반/봇 풀 제외, 지역 발견으로만 획득).

- [ ] **Step 1: 28종을 기존 지역에 배분** — 속성·테마 맞는 지역에 키 추가. 예시(편집할 구체 라인):
  - 포자 늪(`ex_kairen|포자 늪`)에 `'spore_tox_grass','spore_pred_grass'` 추가
  - 균사 회랑(`ex_kairen|균사 회랑`)에 `'spore_pred_earth','spore_tox_earth'`
  - 흑요암 능선(불)·서리 동굴(빙결)·방전 평원(번개)·윈드테라스(바람)·빙정 평원(물) 등 속성 일치 지역에 나머지 26개를 2~3개씩 분산.
  - drg(rare) 7종은 rare 시그니처가 있는 희소 지역(심해 균열 등)에 1개씩.
  - 전체 28키가 최소 1개 지역에 등장하도록 배치(누락 0).

- [ ] **Step 2: 분포 셀프테스트 추가** — 파일 끝:

```js
window.__test('dual mushroom distribution', function(){
  const fails=[];
  const all=new Set(); Object.values(MUTANT_SIGNATURES).forEach(a=>a.forEach(k=>all.add(k)));
  const dual=Object.keys(SPECIES).filter(k=>/^spore_(tox|pred|wpn|drg)_/.test(k));
  const missing=dual.filter(k=>!all.has(k));
  if(missing.length) fails.push('분포 누락: '+missing.join(','));
  if(fails.length) throw new Error(fails.join(' | '));
});
```

- [ ] **Step 3: 통과 확인** — `__catalogSelfTest()` → `dual mushroom distribution` 통과(누락 0) + 전체 0 fail.

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -F - <<'EOF'
feat(mushroom): 이중 변이 버섯 28종 탐사 분포(MUTANT_SIGNATURES)

속성·테마 맞는 지역에 분산 배치, drg(rare)는 희소 지역. 분포 누락 0 셀프테스트.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

### Task 7: 통합 전투 검증 + 문서 갱신

**Files:**
- Modify: `docs/master-roadmap.md`(상태 갱신), `docs/CHANGELOG.md`(맨 위 항목), spec 상태 ✅
- (코드 무변경 — 검증·문서만)

- [ ] **Step 1: preview 실전투 스모크** — 콘솔에서 이중버섯 4종 각 1개를 심고(`plantSeedFromBag`→`state.activeId`→`startBattle()`) ① 하단 변이 바에 두 번째 변이 스킬이 뜨는지(포식기/주입·분사/비늘·브레스), ② 변이 카드 장착 UI에서 포자+해당 변이 카드가 둘 다 장착 가능한지(`ownedFormCards(p)` 결과), ③ 포자 발산 로그가 매 턴 뜨는지. 각 항목 통과 기록.

- [ ] **Step 2: 전체 셀프테스트 최종** — `__catalogSelfTest()` 반환 fails.length === 0 확인(스크린샷 말고 반환값).

- [ ] **Step 3: 문서 갱신** — 로드맵 §2 spec/plan 상태를 "🟢 구현 완료"로, CHANGELOG 맨 위에 날짜 항목 추가, spec 헤더의 "재개 예정" → "구현 완료(2026-06-26)".

- [ ] **Step 4: 커밋 + 푸시**

```bash
git add docs/master-roadmap.md docs/CHANGELOG.md docs/superpowers/specs/2026-06-26-spore-variant-rework-dual-variant-mushrooms-design.md
git commit -F - <<'EOF'
docs: 이중 변이 버섯 28종 구현 완료 반영(로드맵·CHANGELOG·spec)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
git push origin HEAD:main
```

---

## Self-Review

**Spec coverage:**
- 풀 그리드 28종 → Task 4 ✅
- 컨셉/스킬 아키텍처 파이프라인(두번째 변이=메커니즘) → Task 4 생성기 VAR 매핑 ✅
- 함수 2개 확장(cardFitsForm·variantSkillsOf) → Task 1·2 ✅
- 포자 발산 A안(항상 발산+효과별 확률) → Task 3 ✅
- 외형 1차 → Task 5 ✅
- 분포(MUTANT_SIGNATURES·released:false) → Task 6 ✅
- 저스탯 유지(applyVariantIdentity 제외) → 버섯 type이라 자동 제외, Task 4에서 stats 미지정 ✅

**Placeholder scan:** Task 5 Step 2 삽입 지점은 "grep mushroom in composePlantSvg"로 명시 — 실행자가 정확 라인 확인 필요(코드 형태는 단순 색 치환). 그 외 전 스텝 코드 구체.

**Type consistency:** `cardFitsForm(key, formOrPlant)`·`variantSkillsOf(p)`·`ownedFormCards(formOrPlant)`·키 패턴 `spore_<v>_<el>`·`ind.<key>.m/.e/.j`·`variantSlots`(직렬화 시 변환) 전 태스크 일관.

> ⚠️ 실행 시 주의: 생성기(Task 4)는 직렬화 버그가 index.html 전체를 정지시킬 수 있음 → 주입 직후 반드시 `__catalogSelfTest()` 반환값으로 검증, 깨지면 즉시 `git checkout -- index.html` 후 생성기 수정.
