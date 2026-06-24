# 변이 재설계 — 플랜 2: 카드 콘텐츠 Implementation Plan

> 🟡 **진행 중:** 슬라이스 2-A ✅ 완료(`2781c98` 엔진 fixed+스탯코어 base · `776f60a` 공통 스탯 코어 4종, `__catalogSelfTest()` 0 fail). 2-B(버프/디버프·무등급)·2-C(변이형별)는 플랜3(전투/UI) 연동 필요 → 후속.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. 셀프테스트 TDD(`window.__test`+`__catalogSelfTest()`). preview `pullosseum`(정적 → `location.reload()` 후 검증).

**Goal:** 6변이형 변이 카드를 새 로스터로 재작성한다. 단, 전투엔진/하단 바 UI가 필요한 효과(포식 단일강화·무기/독성/용족 하단바·battle-start 버프)는 **플랜 3**으로 미루고, **기존 패시브 스탯 파이프라인으로 동작하는 것부터** 슬라이스로 구현한다.

**Architecture:** `index.html` 인라인. `cardInstanceEffects`가 카드 효과 해석의 단일 지점. 여기에 ① 무등급(`fixed`) 처리, ② 스탯 코어 base(atkPct/hpPct/spdPct/critBonus) 스케일을 추가하고, `TRAIT_CARDS`에 카드 정의를 더한다.

## Global Constraints
- 변경은 `index.html` 인라인. 회귀 = `__catalogSelfTest()` 반환 fails 배열.
- 수치 = 스펙 base(C) 확정값 사용(밸런스 패스에서 추후 튜닝).
- 세이브 무회귀: 기존 카드/식물 보존.
- 커밋: 한국어 `feat(변이): …` + Co-Authored-By 푸터.

## 슬라이스 순서
- **2-A (이 문서 우선):** 엔진 — `fixed` 클래스 + 스탯 코어 base 스케일. + 공통 스탯 코어 카드 4종(근섬유/거대액포/향성운동/표적분비물).
- **2-B:** 공통 버프/디버프 + 무등급 카드 → battle-start 훅 필요 → **플랜 3과 함께**.
- **2-C:** 포식/무기/독성/용족 카드 → 하단 바·전투 스킬 필요 → **플랜 3**.

---

### Task 2-A1: `cardInstanceEffects` — 무등급(fixed) + 스탯 코어 base

**Files:** Modify `index.html` `cardInstanceEffects`(현재 ~4138) · Test 셀프테스트 블록.

**Interfaces:**
- Produces: `cardInstanceEffects(key)` 가 `def.fixed`면 등급 무시(mult=1·subs=0), `base.atkPct/hpPct/spdPct/critBonus`를 등급 계수로 스케일해 `out`에 반영.

- [ ] **Step 1: 실패 테스트** (셀프테스트 블록 끝 `</script>` 앞):

```js
window.__test('card: stat-core base atkPct scales by grade', function(){
  TRAIT_CARDS.__tmp_core = { id:'__tmp_core', type:'common', name:'tmp', icon:'x', base:{atkPct:0.20}, subPool:[] };
  const c = cardInstanceEffects('__tmp_core@C').atkPct;
  const s = cardInstanceEffects('__tmp_core@S').atkPct;
  __ok(Math.abs(c-0.20)<0.001, 'C atk '+c);
  __ok(s > c, 'S scales up '+s);
  delete TRAIT_CARDS.__tmp_core;
});
window.__test('card: fixed card ignores grade (mult=1, no subs)', function(){
  TRAIT_CARDS.__tmp_fix = { id:'__tmp_fix', type:'common', name:'tmp', icon:'x', fixed:true, base:{atkPct:0.30}, subPool:['atk','def','hp','crit'] };
  const a = cardInstanceEffects('__tmp_fix@S'); // 등급 S여도 고정
  __ok(Math.abs(a.atkPct-0.30)<0.001, 'fixed atk '+a.atkPct);
  delete TRAIT_CARDS.__tmp_fix;
});
```

- [ ] **Step 2: 실패 확인** — reload → `__catalogSelfTest()`. 기대: 두 케이스 fails(현재 base.atkPct 미반영·fixed 미처리).

- [ ] **Step 3: 구현** — `cardInstanceEffects`의 `const g = cardGradeMeta(grade), m = g.mult, base = def.base || {};` 줄을 교체:

```js
  const fixed = !!def.fixed;
  const g = fixed ? { mult:1, subs:0 } : cardGradeMeta(grade);
  const m = g.mult, base = def.base || {};
```
그리고 `if(base.defPct) ...` 묶음에 스탯 코어 base 4종 추가(같은 자리, defPct 줄 위/아래):
```js
  if(base.atkPct)    out.atkPct    += round2(base.atkPct*m);
  if(base.hpPct)     out.hpPct     += round2(base.hpPct*m);
  if(base.spdPct)    out.spdPct    += round2(base.spdPct*m);
  if(base.critBonus) out.critBonus += round2(base.critBonus*m);
```

- [ ] **Step 4: 통과 확인** — reload → `__catalogSelfTest()` fails에서 2케이스 사라짐, 신규 회귀 0.

- [ ] **Step 5: 커밋** — `feat(변이): cardInstanceEffects 무등급(fixed) + 스탯 코어 base 스케일`

---

### Task 2-A2: 공통 스탯 코어 카드 4종 추가

**Files:** Modify `index.html` `TRAIT_CARDS` 공통 섹션(현재 ~4070) · Test 셀프테스트.

**Interfaces:** Consumes Task 2-A1(stat-core base). Produces 카드 `card_muscle`/`card_vacuole`/`card_tropism`/`card_target`.

- [ ] **Step 1: 실패 테스트**:

```js
window.__test('card: common stat cores defined + typed common', function(){
  ['card_muscle','card_vacuole','card_tropism','card_target'].forEach(id=>{
    __ok(TRAIT_CARDS[id], 'missing '+id);
    __eq(TRAIT_CARDS[id].type, 'common', id+' type');
  });
  __ok(cardInstanceEffects('card_muscle@C').atkPct > 0.2-0.001, 'muscle atk');
  __ok(cardInstanceEffects('card_target@C').critBonus > 0.15, 'target crit');
});
```

- [ ] **Step 2: 실패 확인** — reload → fails 포함(카드 미정의).

- [ ] **Step 3: 구현** — `TRAIT_CARDS` 공통 섹션(card_cellwall/card_thornstem 옆)에 추가:

```js
  card_muscle:   { id:'card_muscle',   type:'common', name:'근섬유 다발', icon:'💪', base:{atkPct:0.22},  subPool:['atk','crit','enemydef','hp'] },
  card_vacuole:  { id:'card_vacuole',  type:'common', name:'거대 액포',   icon:'🫀', base:{hpPct:0.28},   subPool:['hp','def','regen','spd'] },
  card_tropism:  { id:'card_tropism',  type:'common', name:'향성 운동',   icon:'🌀', base:{spdPct:0.30},  subPool:['spd','crit','atk','enemydef'] },
  card_target:   { id:'card_target',   type:'common', name:'표적 분비물', icon:'🎯', base:{critBonus:0.16}, subPool:['crit','atk','spd','life'] },
```

- [ ] **Step 4: 통과 확인** — reload → `__catalogSelfTest()` 전체 통과.

- [ ] **Step 5: 커밋** — `feat(변이): 공통 스탯 코어 카드 4종(근섬유/거대액포/향성운동/표적분비물)`

---

## 후속(플랜 3 연동 필요 — 이 문서 범위 밖)
- 공통 버프/디버프(굴광성장·위조페로몬·약화효소·아드레날린) + 무등급(불안정변이·마지막잎새·만개·항상성) = battle-start/특수 훅.
- 포식(하단바1+DNA강화) · 무기(하단바2+종류/강화) · 독성(묻히기/뿌리기+업그레이드) · 용족(비늘/브레스) = 하단 변이 스킬 바 + 전투 스킬(플랜3).
- 기존 발광 카드(card_chloroboost/solarheal) legacy 처리 · 무기 상태이상(원소칼날/출혈날) 4축 정리(후속).
