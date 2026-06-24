# 변이 재설계 — 플랜 1: 시스템 토대 Implementation Plan

> ✅ **구현 완료 (2026-06-24):** Task 1~4 전부 커밋(`2fbd2b7`/`255dd66`/`9c69e89`/`b39f16b`), `__catalogSelfTest()` 0 fail. 다음 = 플랜 2(카드 콘텐츠).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 변이 카드 콘텐츠 재작성(플랜 2)과 전투/UI(플랜 3) 이전에 필요한 **시스템 토대** 4가지를 깔고 회귀 검증한다 — `cats` 스킬 라벨 도출, 독 스택 상한, 같은 카드 자동교체, 발광형 폐지.

**Architecture:** 전부 `index.html` 단일 파일에 인라인 추가/수정. 새 순수 함수(`skillCats`/`cardsAfterEquip`/`addDot`)를 데이터 정의 근처에 추가하고, 기존 호출부를 그 함수로 갈아끼운다. 테스트 러너가 없으므로 회귀는 `window.__test(name, fn)` 케이스 등록 + `window.__catalogSelfTest()` 반환값(fails 배열)으로 검증한다.

**Tech Stack:** 바닐라 HTML/CSS/JS(빌드 없음). preview 서버명 `pullosseum`(정적, HMR 없음 → 수정 후 `location.reload()`).

## Global Constraints

- 모든 변경은 `C:\Users\soosa\Documents\풀로세움\index.html` 내부(인라인). 외부 파일 추가 없음.
- **격리 작업:** 사용자가 같은 `index.html`을 동시 편집 중 → **반드시 git worktree(별도 브랜치)에서 작업**. 병합은 사용자 편집 커밋 후.
- 회귀 판정 = `__catalogSelfTest()`가 **반환하는 fails 배열**(콘솔 버퍼 신뢰 금지 — 리로드해도 옛 에러 잔존).
- 세이브 무회귀: 기존 발광 식물·기존 카드 보유분은 깨지지 않게(legacy 보존).
- 커밋 메시지는 한국어 `type(scope): 요약` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

| 파일 | 책임 | 변경 |
|---|---|---|
| `index.html` (~4080 `ALL_SKILLS` 직후) | `CAT_META` + `skillCats()` 스킬 분류 도출 | 추가 |
| `index.html` (~3947 `TRAIT_CARDS`/`parseCardKey` 근처) | `cardsAfterEquip()` 자동교체 순수 헬퍼 | 추가 |
| `index.html` (~8919 `confirmCardEquip` mut 분기) | 자동교체 헬퍼 적용 | 수정 |
| `index.html` (~9350 전투 유닛 생성 근처) | `DOT_STACK_CAP` + `addDot()` | 추가 |
| `index.html` (~9868·9871·9878·9902 DoT 적용부) | `.dots.push` → `addDot` 교체 | 수정 |
| `index.html` (~3509 `rollForm`) | 발광(lumen) 제거 + 확률 재분배 | 수정 |
| `index.html` (~11130 셀프테스트 블록 끝) | 4개 `__test` 케이스 추가 | 추가 |

---

### Task 1: `skillCats` — 스킬 복수 태그 분류 도출

**Files:**
- Modify: `index.html` (`ALL_SKILLS` 정의 직후, 현재 ~4080)
- Test: `index.html` 셀프테스트 블록(현재 ~11130, 마지막 `__test` 뒤)

**Interfaces:**
- Produces: `skillCats(sk) -> string[]` (값: `'attack'|'guard'|'buff'|'debuff'|'heal_hp'|'heal_energy'`), `CAT_META` (키별 `{icon,name,color}`). 플랜 3 UI 칩이 소비.

- [ ] **Step 1: 실패 테스트 작성** — 셀프테스트 블록 마지막 `__test(...)` 뒤에 추가:

```js
window.__test('cats: attack skill tagged attack', function(){
  __ok(skillCats({kind:'attack',power:100}).includes('attack'), 'attack');
});
window.__test('cats: acid hybrid = attack + debuff', function(){
  const c = skillCats({kind:'debuff', power:135, enemyDebuff:{stat:'def',pct:0.3}});
  __ok(c.includes('attack') && c.includes('debuff'), 'acid hybrid '+JSON.stringify(c));
});
window.__test('cats: heal splits hp vs energy', function(){
  __ok(skillCats({kind:'heal', heal:0.2}).includes('heal_hp'), 'heal_hp');
  __ok(skillCats({kind:'special', energyGain:2}).includes('heal_energy'), 'heal_energy');
});
```

- [ ] **Step 2: 실패 확인** — preview에서 `location.reload()` 후 콘솔: `__catalogSelfTest()`. 기대: 위 3개가 fails 배열에 포함(`skillCats is not defined`).

- [ ] **Step 3: 최소 구현** — `ALL_SKILLS = Object.assign(...)` 줄 **다음에** 추가:

```js
/* ===== 스킬 분류 복수 태그(cats) — kind + 라이더로 도출. UI 칩 + 향후 특성 시너지 키 ===== */
const CAT_META = {
  attack:      { icon:'🗡️', name:'공격',     color:'#ff7a5a' },
  guard:       { icon:'🛡️', name:'방어',     color:'#4ac6ff' },
  buff:        { icon:'✨', name:'버프',     color:'#b06bff' },
  debuff:      { icon:'🥀', name:'디버프',   color:'#9be15d' },
  heal_hp:     { icon:'❤️', name:'체력회복', color:'#ff6bd4' },
  heal_energy: { icon:'⚡', name:'에너지회복', color:'#ffe14a' },
};
function skillCats(sk){
  if(!sk) return [];
  const out = new Set();
  if(Array.isArray(sk.cats)) sk.cats.forEach(c => out.add(c)); // 명시 태그 우선(플랜2/3 카드)
  const k = sk.kind;
  if(k==='attack' || k==='elemental' || k==='dot') out.add('attack');
  if(k==='guard') out.add('guard');
  if(k==='buff')  out.add('buff');
  if(k==='debuff') out.add('debuff');
  // 라이더 기반 보조 태그(하이브리드 표현)
  if((sk.power||0) > 0) out.add('attack');
  if(sk.dot || sk.enemyDebuff) out.add('debuff');
  if(sk.selfBuff) out.add('buff');
  if(sk.heal || sk.lifesteal) out.add('heal_hp');
  if(sk.energyGain || sk.energyRegen) out.add('heal_energy');
  return Array.from(out);
}
```

- [ ] **Step 4: 통과 확인** — `location.reload()` 후 `__catalogSelfTest()`. 기대: 위 3개가 fails에서 사라짐(전체 fails 길이가 Step 2보다 3 감소, 신규 회귀 0).

- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat(변이): 스킬 복수 태그 분류 skillCats + CAT_META 도출

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 같은 카드 자동교체 (`cardsAfterEquip`)

**Files:**
- Modify: `index.html` (`parseCardKey`/`cardKeyOf` 근처, 현재 ~3974)
- Modify: `index.html` (`confirmCardEquip`의 `kind === 'mut'` 분기, 현재 ~8919)
- Test: 셀프테스트 블록

**Interfaces:**
- Consumes: `parseCardKey(key) -> {id,grade}` (기존).
- Produces: `cardsAfterEquip(cards, newKey) -> string[]` — 같은 `id`(등급 무관) 제거 후 newKey 추가.

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('equip: same card_id auto-replaces (등급 무관)', function(){
  const after = cardsAfterEquip(['card_cellwall@C','card_sap@B'], 'card_cellwall@S');
  __eq(after.filter(k=>k.indexOf('card_cellwall')===0).length, 1, 'one cellwall');
  __ok(after.includes('card_cellwall@S') && !after.includes('card_cellwall@C'), 'replaced to S');
  __ok(after.includes('card_sap@B'), 'other kept');
});
```

- [ ] **Step 2: 실패 확인** — `location.reload()` → `__catalogSelfTest()`. 기대: fails에 `cardsAfterEquip is not defined`.

- [ ] **Step 3: 최소 구현** — `function cardDefOf(key){...}` 정의 **앞 또는 뒤**(같은 카드 헬퍼 묶음)에서 추가:

```js
/* 같은 card_id는 등급 무관 1장만 — 새로 장착 시 기존 동일 id 제거 후 추가(자동 교체) */
function cardsAfterEquip(cards, newKey){
  const id = parseCardKey(newKey).id;
  const kept = (cards||[]).filter(k => parseCardKey(k).id !== id);
  kept.push(newKey);
  return kept;
}
```

- [ ] **Step 4: 장착 핸들러 적용** — `confirmCardEquip`의 mut 분기(현재 8920~8924)를 교체:

기존:
```js
    if(!Array.isArray(p.equipped_trait_cards)) p.equipped_trait_cards = [];
    const eq = p.equipped_trait_cards;
    if(eq.includes(key)) return;
    if(eq.length < 5){ eq.push(key); sfx.heal(); saveState(); renderUpgrade(); renderMain(); }
    else { swapPending = { kind:'mut', key }; sfx.tap(); renderUpgrade(); }
```
교체:
```js
    if(!Array.isArray(p.equipped_trait_cards)) p.equipped_trait_cards = [];
    const eq = p.equipped_trait_cards;
    if(eq.includes(key)) return;
    const id = parseCardKey(key).id;
    const sameIdIdx = eq.findIndex(k => parseCardKey(k).id === id);
    if(sameIdIdx >= 0){ // 같은 카드 다른 등급 → 그 자리 교체(슬롯 증가 없음)
      eq[sameIdIdx] = key; sfx.heal(); saveState(); renderUpgrade(); renderMain();
    } else if(eq.length < 5){ eq.push(key); sfx.heal(); saveState(); renderUpgrade(); renderMain(); }
    else { swapPending = { kind:'mut', key }; sfx.tap(); renderUpgrade(); }
```

- [ ] **Step 5: 통과 확인** — `location.reload()` → `__catalogSelfTest()` fails에서 해당 케이스 사라짐. 추가로 수동: 관리창 변이 탭에서 같은 카드 다른 등급 장착 시 칸이 안 늘고 교체되는지 1회 확인.

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "feat(변이): 같은 card_id 등급 무관 자동교체(cardsAfterEquip)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 독 스택 상한 (`DOT_STACK_CAP` + `addDot`)

**Files:**
- Modify: `index.html` (전투 유닛 생성/DoT 근처, 현재 ~9350 위)
- Modify: `index.html` (DoT 적용 4곳: 현재 ~9868·9871·9878·9902)
- Test: 셀프테스트 블록

**Interfaces:**
- Produces: `DOT_STACK_CAP`(상수, 4), `addDot(unit, dot)` — `unit.dots`에 push 후 같은 kind가 상한 초과면 가장 오래된 것 제거.

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('dot: same kind capped at DOT_STACK_CAP', function(){
  const u = { dots:[] };
  for(let i=0;i<7;i++) addDot(u, {kind:'poison',dmg:5,turns:3,icon:'🟣'});
  __eq(u.dots.filter(d=>d.kind==='poison').length, DOT_STACK_CAP, 'poison capped');
});
window.__test('dot: different kinds stack independently', function(){
  const u = { dots:[] };
  for(let i=0;i<6;i++) addDot(u, {kind:'poison',dmg:5,turns:3});
  for(let i=0;i<6;i++) addDot(u, {kind:'burn',dmg:3,turns:3});
  __eq(u.dots.length, DOT_STACK_CAP*2, 'two kinds capped each');
});
```

- [ ] **Step 2: 실패 확인** — `location.reload()` → `__catalogSelfTest()` fails에 `addDot is not defined`.

- [ ] **Step 3: 최소 구현** — 전투 함수들보다 위(예 `dotIcon` 함수 근처 ~9301)에서 추가:

```js
/* 독/출혈/화상 스택 상한 — 같은 종류가 상한 초과면 가장 오래된 스택 1개 제거(방무시 무한증식 방지) */
const DOT_STACK_CAP = 4;
function addDot(unit, dot){
  if(!unit.dots) unit.dots = [];
  unit.dots.push(dot);
  while(unit.dots.filter(d => d.kind === dot.kind).length > DOT_STACK_CAP){
    const i = unit.dots.findIndex(d => d.kind === dot.kind);
    if(i < 0) break;
    unit.dots.splice(i, 1);
  }
}
```

- [ ] **Step 4: 적용부 교체(4곳)** — 각 `<대상>.dots.push({...})` 를 `addDot(<대상>, {...})` 로:
  - ~9868: `d.dots.push({kind:'poison',dmg:pd,turns:2,icon:dotIcon('poison')});` → `addDot(d, {kind:'poison',dmg:pd,turns:2,icon:dotIcon('poison')});`
  - ~9871: `d.dots.push({kind:s.dot.kind,dmg:ddmg,turns:s.dot.turns,icon:dotIcon(s.dot.kind)});` → `addDot(d, {...동일...});`
  - ~9878: 동일 패턴(else 분기) → `addDot(d, {...});`
  - ~9902: `opp.dots.push({kind:'poison',dmg:pd,turns:2,icon:dotIcon('poison')});` → `addDot(opp, {...});`

- [ ] **Step 5: 통과 확인** — `location.reload()` → `__catalogSelfTest()` fails에서 2케이스 사라짐, 신규 회귀 0. 수동: 독성/포자 식물로 전투 1판 — 콘솔 에러 없이 DoT가 들어가는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add index.html
git commit -m "feat(전투): 독/출혈/화상 스택 상한 DOT_STACK_CAP(4) + addDot

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 발광형(lumen) 폐지 — `rollForm`

**Files:**
- Modify: `index.html` (`rollForm`, 현재 ~3509)
- Test: 셀프테스트 블록

**Interfaces:**
- Consumes/Produces: `rollForm() -> {form, predType}` — 더 이상 `'lumen'` 반환 안 함. `FORMS.lumen`·기존 발광 식물은 legacy로 데이터 보존(미삭제).

- [ ] **Step 1: 실패 테스트 작성**

```js
window.__test('form: rollForm never returns lumen (발광 폐지)', function(){
  for(let i=0;i<500;i++){ __ok(rollForm().form !== 'lumen', 'rolled lumen'); }
});
window.__test('form: FORMS.lumen kept for legacy plants', function(){
  __ok(FORMS.lumen, 'lumen def kept for legacy');
});
```

- [ ] **Step 2: 실패 확인** — `location.reload()` → `__catalogSelfTest()`. 기대: 첫 케이스가 가끔/항상 fails(현재 lumen 14% 굴림). (둘째는 이미 통과.)

- [ ] **Step 3: 최소 구현** — `rollForm` 본문 교체(lumen 구간 제거 + 재분배, dragon은 0.60~0.64 = 4% 유지):

```js
function rollForm(){
  const r = Math.random();
  if(r < 0.16) return { form:'weapon', predType:null };
  if(r < 0.32) return { form:'pred', predType: Math.random()<0.5 ? 'vamp' : 'absorb' };
  if(r < 0.46) return { form:'toxic',  predType:null };
  if(r < 0.60) return { form:'spore',  predType:null };
  if(r < 0.64) return { form:'dragon', predType:null }; // 희귀 4% (lumen 0.60~0.74 제거)
  return { form:'normal', predType:null };               // 0.64~1.0 = 일반(발광 몫 흡수)
}
```

- [ ] **Step 4: 통과 확인** — `location.reload()` → `__catalogSelfTest()` 전체 통과(신규 회귀 0).

- [ ] **Step 5: 커밋**

```bash
git add index.html
git commit -m "feat(변이): 발광형(lumen) 신규 획득 폐지(rollForm), 기존분 legacy 보존

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage(플랜1 범위):** 스펙 §1.5(자동교체)=Task2 · §2(cats 라벨)=Task1 · §3(독 스택 상한)=Task3 · §1.1(발광 폐지)=Task4. 무등급(`fixed`) 카드·포식 무료기본기 제거·하단 변이 스킬 바·카드 콘텐츠는 **플랜 2/3**으로 명시 분리(범위 밖, 의도적).
**2. Placeholder scan:** 모든 Step에 실제 코드/명령/기대출력 포함. "적절히 처리" 류 없음.
**3. Type consistency:** `parseCardKey().id`(Task2), `unit.dots`/`dot.kind`(Task3), `rollForm().form`(Task4), `skillCats()→string[]`(Task1) — 호출부와 일치.

## 다음 플랜
- **플랜 2 (카드 콘텐츠):** `fixed` 카드 클래스 + 6변이형 `TRAIT_CARDS` 재작성 + `cardInstanceEffects` 효과 해석. (수치 확정 필요 → 밸런스 패스와 연동)
- **플랜 3 (전투/UI):** 하단 변이 스킬 바(포식1/무기2/독성2/용족2) · 브레스 속성 발현 · 비늘/독 스택 스킬 · cats 칩 렌더 · 무기 종류 2장 룰.
