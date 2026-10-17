# v2 스킬 · 패시브 탭 분리 + 새 고르기 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기본기도 칸을 차지하는 스킬 장착 6 · 보관 6, 패시브 장착 3 · (변이) 보관 3, 탭 분리, 그리고 '얻은 카드 위 · 내 칸 아래 · [장착] → 칸 누르기 · 되돌리기 · 꾹 = 뒷면' 고르기 화면 + 맨 위 '보류' 단추.

**Architecture:** 규칙은 서버 · 화면 공용 `v2/src/game/logic.js`(+ `cards.js` · `ops.js`)에서 배치 전체를 받아 검사(`setSlots` 새 꼴 · `draftApply`). 화면은 `scenes/plant.js`(탭) · `scenes/draft.js`(고르기 다시 짬) · `scenes/popups.js`(보류 단추). 화면은 새 배치를 만들어 보내기만 하고 규칙을 믿게 함.

**Tech Stack:** 바닐라 JS ES 모듈 · 캔버스 2D(`core/gfx.js`) · Node 시험 스크립트(`tools/test/*.mjs` — `ok/throws` 도우미) · puppeteer-core 촬영(`tools/shots/*.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-18-v2-skill-passive-tabs-draft-design.md`

## Global Constraints
- 공용 규칙(`v2/src/game/`)에 `Math.random()` · `Date.now()` 금지 — 후보는 `seeded(\`${p.uid}:...\`)` 씨앗(지금 `addDraft`와 같은 방식).
- `main.js QUICK`에는 난수 없는 일만: `setSlots` · `draftApply`는 넣음(결정적).
- 칸 수: `LOADOUT = 6` · `SKILL_STORE = 6` · `CARD_SLOTS = 3` · `PASS_STORE = 3` · `MUT_MAX = 2`.
- 화면: 가로 270칸 · 짧은 기기 480~599 확인(`--size 270x480`) · 글자 12px 하한(`label` 이상) · 화면에 늘 떠 있는 설명 문장 금지(처음 안내 = `scenes/guide.js GUIDES`) · 색은 기존 `T.*` · 이미 쓰는 값(`#ffd890` 금빛 등) 재사용.
- 한국어 조사 = `core/josa.js`(`eul` · `ga` · `eun`).
- 커밋 = 바꾼 파일만 경로 지정 · 한국어 메시지 · `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 푸시는 문서 갱신과 함께(pre-push 훅).

## Review Focus
- 기본기가 장착에 없고 보관에 배운 기술 여섯이 찬 옛 세이브 → 기본기는 '지운 기술'로, 장착엔 하나 이상 남음(Task 1 시험).
- 고르기 화면이 열린 채 식물이 보관고로 가거나 팔림 · 다른 창에서 고르기가 먼저 확정됨 → 화면이 조용히 닫히고 오류 띠만(Task 4 시험: 오래된 `n`으로 `draftApply` = Err).
- 위 줄에 기존 기술이 남은 채 확정 → 기술은 '지운 기술', 카드는 가방, 확인 창이 먼저(Task 2 · 4 시험).
- 화면이 먼저 한 `draftApply`(QUICK)와 서버 결과가 같음 — 같은 입력 두 번 = 같은 상태(Task 2 시험).
- 짧은 기기에서 고르기 화면의 장착 · 보관 칸이 화면보다 길 때 끌어 넘기고 단추 줄이 늘 보임(Task 4 촬영 270×480).

---

### Task 1: 칸 규칙 — 기본기가 칸을 차지 · 패시브 3 + 변이 보관 3 · `setSlots` 새 꼴

**Files:**
- Modify: `v2/src/game/logic.js`(`normSkills` v8 · `learnNow` · `regress` · `setSlots` · `setCards` · `normCards` · `releaseCards`/`cardsOn` · `makePlant`)
- Modify: `v2/src/game/cards.js`(`CARD_SLOTS = 3`, `export const PASS_STORE = 3`)
- Modify: `v2/src/game/ops.js`(`setSlots` · `setCards` 인자)
- Test: `tools/test/loadout.mjs` · `tools/test/cards.mjs`

**Interfaces:**
- Produces: `setSlots(s, id, layout)` — `layout = { battle: (id|null)[6], store: id[≤6], cards: (id|null)[3], pstore: id[≤3] }` · 옛 꼴 `setSlots(s, id, battle[6], cards[2|3])`도 받음 · 반환 `{}`.
- Produces: `p.pstore`(배열) · `PASS_STORE` · `slotLayout(p) → { battle, store, cards, pstore }`(화면 · 고르기가 쓰는 현재 배치 복사본, `logic.js`에서 export).
- Produces: `learnNow(p, id)` 반환 `'battle' | 'store' | 'draft'`(칸이 없으면 `p.drafts`에 `{ kind: 'one', part: 'skill', st, lv, pick: 1, cands: [id] }`).

- [ ] **Step 1: 실패하는 시험 쓰기** — `loadout.mjs`에 ⑥ 블록:

```js
// ⑥ v8: 기본기도 칸을 차지(2026-10-18)
{ const s = game(), p = s.plants[0];
  p.skills = { battle: ['u_petal_1', 'j_scent', null, null, null, null], store: ['a1','a2','a3','a4','a5'], forgot: [], learned: [], v4: 1, v6: 1, v7: 1 };
  normSkills(p);
  ok(p.skills.v8 === 1, 'v8 표시');
  ok(p.skills.store.length === 6 && p.skills.store[5] === 'basic', '빈 보관 한 칸 = 평타 먼저: ' + p.skills.store);
  ok(['guard','evade','sun'].every(x => p.skills.forgot.includes(x)), '못 들어간 기본기 = 지운 기술: ' + p.skills.forgot);
  const once = JSON.stringify(p.skills); normSkills(p); ok(JSON.stringify(p.skills) === once, 'v8 두 번 = 그대로');
  p.pend = ['j_petals']; delete p.skills.v8; normSkills(p);
  ok(!p.pend.length && p.drafts.some(d => d.kind === 'one' && d.cands[0] === 'j_petals'), '놓을 칸 기다림 → 하나 고르기'); }
// ⑦ setSlots 새 꼴
{ const s = game(), p = s.plants[0], L0 = slotLayout(p);
  const L1 = { ...L0, battle: [...L0.battle], store: [...L0.store] }; const out = L1.battle.indexOf('evade'); L1.battle[out] = null; L1.store.push('evade');
  setSlots(s, p.uid, L1); ok(p.skills.store.includes('evade') && !p.skills.battle.includes('evade'), '기본기 해제 = 보관으로');
  throws(() => setSlots(s, p.uid, { ...slotLayout(p), store: slotLayout(p).store.filter(x => x !== 'evade') }), '기본 기술을 빼 버림 = 막힘');
  throws(() => setSlots(s, p.uid, { ...slotLayout(p), store: ['x1','x2','x3','x4','x5','x6','x7'] }), '보관 일곱 = 막힘');
  const old = slotLayout(p); setSlots(s, p.uid, old.battle, old.cards.slice(0, 2)); ok(p.cards.length === 3, '옛 꼴(카드 둘) = 셋째 칸 그대로'); }
```

  `cards.mjs` ⑫ 블록: 일반 식물에 변이 패시브 → 막힘 · 일반 식물 `pstore`에 아무것 → 막힘('패시브 보관은 변이 식물만') · 변이 식물 `pstore`에 일반 패시브 → 막힘 · 변이 식물 `pstore`에 그 변이 패시브 → 가방에서 1장 빠짐 · `pstore`에서 뺌(새 배치에 없음) → 가방 +1 · 변이 기술 카드를 장착 → 보관(`store`)으로 옮김 = 가방 그대로 · 보관에서 뺌 = 가방 +1 · `p.cards.length === 3`(새 식물 · `normCards` 뒤 옛 식물).
- [ ] **Step 2: 돌려서 실패 확인** — `node tools/test/loadout.mjs` · `node tools/test/cards.mjs` → `slotLayout is not a function` 등으로 실패.
- [ ] **Step 3: 규칙 구현**
  - `normSkills` v8(한 번): 장착에 없는 기본기를 `['basic','guard','evade','sun']` 차례로 보관 빈 칸에 → 못 넣은 것 `forgot` · `p.pend` 전부 → `kind: 'one'` 고르기(`p.pend = []`).
  - `normCards`: `p.cards` 길이 3으로 · `p.pstore` 없으면 `[]` · 일반 식물의 `pstore`가 있으면 가방으로 비움.
  - `learnNow`: 빈 장착 → 보관 6 미만이면 보관 → 아니면 `'one'` 고르기(`p.pend` 안 씀 · 기본기 자리 바꿔치기 없앰).
  - `regress`: 막는 조건을 '빈 장착 또는 보관 6 미만'으로(기본기도 되찾을 수 있음 — `forgot`에 기본기 허용).
  - `setSlots` 검사 = 설계 §3.3 그대로(기본 기술 = 배운 기술 + 기본기는 원래 `battle ∪ store`와 집합이 같아야 · 카드 출처 = 원래 식물 칸 ∪ 가방 · 빠진 카드 → 가방 · `pstore`는 `p.form` 있고 `CARDS[x].form === p.form` 이고 패시브인 것만 · 같은 것 두 칸 없음 · 장착 하나 이상 · 장착 변이 기술 카드 ≤ `MUT_MAX`). 옛 꼴 옮기기 = 설계 §3.3 ⟨내 결정⟩.
  - `cardsOn`/`releaseCards`: `p.skills.store`의 기술 카드 · `p.pstore`도 포함(식물이 떠나면 가방으로).
  - `makePlant`: `pstore: []`, `skills.v8: 1`, `cards` 길이 3.
  - `ops.js`: `setSlots`는 `a.store`가 배열이면 새 꼴(`battle` 6 · `store` ≤6 · `cards` 3 · `pstore` ≤3, 원소는 `str`/null), 아니면 옛 꼴(`cards` 2 또는 3). `setCards`는 2 또는 3.
- [ ] **Step 4: 시험 통과 확인** — `node tools/test/loadout.mjs` → `모두 통과`, `node tools/test/cards.mjs` → `모두 통과`(기존 ①~⑪ 포함 — 기존 시험이 기본기 '늘 앎'을 기대하면 새 규칙에 맞게 고침).
- [ ] **Step 5: 커밋** — `git add v2/src/game/logic.js v2/src/game/cards.js v2/src/game/ops.js tools/test/loadout.mjs tools/test/cards.mjs` → `v2 규칙: 기본기도 칸 차지 · 패시브 3 + 변이 보관 3 · setSlots 새 꼴`.

### Task 2: 고르기 규칙 — 패시브 고르기 · 후보 섞기 · `draftApply`

**Files:**
- Modify: `v2/src/game/logic.js`(`addDraft` · `feed` · `evolve` · 새 `draftApply` · `draftPick` 호환)
- Modify: `v2/src/game/ops.js`(`draftApply`) · `v2/src/main.js`(`QUICK`에 `'draftApply'`)
- Test: `tools/test/loadout.mjs`

**Interfaces:**
- Consumes: `slotLayout(p)` · `setSlots` 검사 도우미(Task 1 — 칸 검사는 함수 하나 `checkLayout(s, p, layout, extra)`로 빼서 둘이 같이 씀).
- Produces: 고르기 `{ kind: 'lv'|'top'|'evo'|'last'|'one', part: 'skill'|'passive', st, lv, pick, cands }` · `draftApply(s, id, n, layout) → { got: id[], dropped: id[] }` — 기술 고르기 `layout = { battle, store }`, 패시브 고르기 `layout = { cards, pstore }`.

- [ ] **Step 1: 실패하는 시험 쓰기** — `loadout.mjs` ⑧:

```js
// ⑧ 패시브 고르기 · 후보 섞기 · draftApply
{ const { feed, evolve, draftApply, slotLayout } = await import('../../v2/src/game/logic.js');
  const s = game(), p = s.plants[0]; s.items.fert = 999; p.drafts = [];
  while (p.lv < 6) feed(s, p.uid, 'fert', 1);
  ok(!p.drafts.some(d => d.part === 'passive'), 'Lv6(단계 끝)엔 패시브 고르기 없음');
  evolve(s, p.uid, makeRng(1));
  const ev = p.drafts.filter(d => d.st === 1);
  ok(ev.length === 2 && ev[0].part === 'skill' && ev[1].part === 'passive' && ev[1].pick === 1 && ev[1].cands.length <= 3, '진화 = 기술 다음 패시브(셋 중 하나)');
  // 후보 섞기: 이번 단계 후보를 다 알게 만들면 앞 단계 것이 나옴
  // (bloomPool(key,1)의 id를 전부 forgot 에 넣고 다음 레벨업 고르기의 후보가 bloomPool(key,0) 안에 있는지)
  const n = p.drafts.findIndex(d => d.part === 'skill'), d = p.drafts[n], L0 = slotLayout(p);
  throws(() => draftApply(s, p.uid, n, { battle: L0.battle, store: L0.store }), '후보를 하나도 안 놓음 = 막힘');
  const pick = d.cands.slice(0, d.pick), L1 = { battle: [...L0.battle], store: [...L0.store] };
  const out = L1.battle[0]; L1.battle[0] = pick[0]; if (pick[1]) L1.store.push(pick[1]);
  const before = JSON.stringify(s), r = draftApply(s, p.uid, n, L1);
  ok(r.dropped.includes(out) && p.skills.forgot.includes(out), '밀려나 남은 기존 기술 = 지운 기술');
  ok(!p.drafts.includes(d), '확정한 고르기는 빠짐');
  const s2 = JSON.parse(before); draftApply(s2, p.uid, n, L1); ok(JSON.stringify(s2.plants[0].skills) === JSON.stringify(p.skills), '같은 입력 = 같은 결과(QUICK)');
  throws(() => draftApply(s, p.uid, 9, L1), '없는 고르기 번호 = 막힘');
  const pn = p.drafts.findIndex(x => x.part === 'passive'), pd = p.drafts[pn], PL = slotLayout(p);
  const nc = [...PL.cards]; nc[nc.indexOf(null)] = pd.cands[0];
  const bag0 = JSON.stringify(s.cards); draftApply(s, p.uid, pn, { cards: nc, pstore: PL.pstore });
  ok(p.cards.includes(pd.cands[0]) && JSON.stringify(s.cards) === bag0, '고른 패시브 = 새 카드(가방 그대로)'); }
```

- [ ] **Step 2: 돌려서 실패 확인** — `node tools/test/loadout.mjs` → `draftApply is not a function`.
- [ ] **Step 3: 구현**
  - `addDraft(p, kind, part = 'skill')`: 기술 후보 = 설계 §3.4(이번 단계 `bloomPool(key, stage)` 무게 그대로 + `stage' < stage` 의 `bloomPool` 무게 × 0.25, 모르는 것 · 다른 고르기에 나온 것 · 기본기 빼고). 패시브 후보 = 그 식물이 끼울 수 있는 패시브(`cardFits(p, id) === null` · 패시브) 중 `p.cards ∪ p.pstore`에 없는 것, 무게 같게, `n: 3 · pick: 1`. 씨앗 = `` `${p.uid}:${kind}:${part}:${p.stage}:${p.lv}` ``.
  - 부르는 곳: `feed` 레벨업 = 기술(`lv`/`top`) · Lv16(`stage === 2 && lv === LV_MAX`)이면 이어서 패시브 · `evolve` = 기술(`evo`/`last`) 다음 패시브(`evo`).
  - `draftApply(s, id, n, layout)`: 설계 §3.4 확정 검사(새 배치 ⊆ 원래 칸 ∪ 후보 · 놓인 후보 수 = `min(pick, cands.length)` · `checkLayout`) → 빠진 기본 기술 `forgot`(배운 기술은 `learned`에도) · 빠진 카드 가방 · 패시브 후보는 가방을 거치지 않고 새로 생김 · 고르기 지움.
  - `draftPick` 호환: 고른 것을 `learnNow`로(칸 없으면 Err '칸이 다 찼어요 — 새 화면에서 골라요').
  - `ops.js`: `draftApply: (s, a) => L.draftApply(s, str(a.id), int(a.n, 0, 20, 0), layoutArg(a.layout))` — `layoutArg`는 배열 길이 · 원소 모양만 확인. `main.js QUICK`에 `'draftApply'`.
- [ ] **Step 4: 시험 통과 확인** — `node tools/test/loadout.mjs` · `cards.mjs` · `server.mjs`(51) → 통과.
- [ ] **Step 5: 커밋** — logic · ops · main · loadout → `v2 규칙: 패시브 고르기(진화 둘 · Lv16) · 앞 단계 기술 섞기 · draftApply`.

### Task 3: 식물 관리 — 스킬 탭 · 패시브 탭

**Files:**
- Modify: `v2/src/scenes/plant.js`(`TABS` · `drawSkill` 둘로 · `dropCard` · `idAt` · peek 단추 · '새로 핀 기술' · '스킬 정하기' 제거)
- Modify: `v2/src/scenes/bag.js`(`cardSheet` — 새 칸 규칙 · `setSlots` 새 꼴)
- Modify: `v2/src/scenes/guide.js`(`plant2` · `plant_card2` 장 → 새 탭 · 칸 이름)
- Modify: `tools/shots/v2shots.mjs`(촬영 `06_plant_skill` · `06_plant_passive` · 변이 식물 판)

**Interfaces:**
- Consumes: `slotLayout(p)` · `setSlots` 새 꼴(Task 1) · `PASS_STORE`.
- Produces: 탭 id `'skill' | 'passive' | 'up' | 'iv' | 'set'` · 칸 키 `b0~b5`(장착) · `s0~s5`(보관) · `mk:<id>`(가방 기술 카드) · `c0~c2`(패시브 장착) · `p0~p2`(패시브 보관) · `cl:<id>`(가방 패시브).

- [ ] **Step 1: 화면 바꾸기** — `TABS = [스킬, 패시브, 강화, 개체값, 설정]`(폭 = `(W - 24) / 5`). 스킬 탭 = 장착 6 → 보관 6 → (변이 식물) 가방 기술 카드 줄 → 지운 기술 · 접목 단추. 패시브 탭 = 장착 3 → (변이 식물) 보관 3 → 가방 패시브 줄. 옮기기는 전부 `slotLayout(p)`을 고쳐 `setSlots`로: 장착 ↔ 보관 · 가방 → 칸 · 장착에서 [해제] = 보관 끝으로(꽉 차면 알림 띠 '보관이 꽉 찼어요') · 보관 카드 뒷면에 [가방으로](카드만). 끌어 놓기 · 들어간 칸 톡 떨어짐은 그대로.
- [ ] **Step 2: 촬영으로 확인** — `node tools/shots/v2shots.mjs --label tabs --scale 2 --only 06_plant_skill,06_plant_passive,06_plant_passive_mut` 와 `--size 270x480` 같은 목록. 볼 것: 탭 다섯 글자가 안 잘림 · 기본기가 보관 칸에 · 변이 카드 테가 일반 카드와 구분됨(약하면 `skillcard.js cardFrame` 변이 테 색을 진하게) · 짧은 기기 아래 줄 안 잘림.
- [ ] **Step 3: 흐름 확인** — `tools/shots/draftflow.mjs`에 탭 점검 추가: 장착 기본기 [해제] → 보관에 들어감 · 보관 꽉 참에서 [해제] = 막힘 띠 · 패시브 탭 열림. `node tools/shots/draftflow.mjs` → `모두 통과`.
- [ ] **Step 4: 처음 안내 확인** — `node tools/shots/guidecheck.mjs` → 가리키는 자리 id가 다 있음.
- [ ] **Step 5: 커밋** — plant · bag · guide · v2shots · draftflow → `v2 화면: 식물 관리 스킬 · 패시브 탭 분리(장착 6 · 보관 6 / 장착 3 · 변이 보관 3)`.

### Task 4: 새 고르기 화면

**Files:**
- Modify: `v2/src/scenes/draft.js`(다시 짬 — `openDraft` · `draftScreen` · `draftScroll` 이름은 유지, `evoMotion` 그대로)
- Modify: `v2/src/main.js`(`__shot` `opt.draft` 확장: `part` · 놓은 상태 `moves`)
- Modify: `tools/shots/v2shots.mjs` · `tools/shots/draftflow.mjs`

**Interfaces:**
- Consumes: `slotLayout(p)` · `draftApply` 일(Task 2) · 칸 키(Task 3과 같은 이름 규칙 · 그림은 `cardFront` · 뒷면 `renderFaces`).
- Produces: `app.draft = { uid, t0, evo, top: id[], lay: { battle, store } | { cards, pstore }, hist: [], sel, arm, glow: [key, key] | null, sy, peek }` — `top` = 위 줄(후보 + 밀려 올라온 기존 카드), `lay` = 지금 놓인 배치, `hist` = 되돌리기용 이전 상태들.

- [ ] **Step 1: 화면 짜기** — 설계 §4.2 그대로: 제목 → "N장 고르기 · k/N"(k = `lay` 안의 후보 수) → 위 줄(셋씩 줄) → 끌어 넘기는 아래 영역(장착 → 보관 · 같은 3열 배치) → 단추 줄 [되돌리기][보류][확정]. 위 줄 누름 = `sel` + [장착] 단추(카드 아래) → [장착] = `arm` → 맞는 칸이 금빛 숨쉬기 → 칸 누름 = 빈 칸 채움 / 찬 칸 바꿈(원래 것 → `top` 끝) · `glow = [칸, 올라간 카드]` · `hist.push`. 후보가 이미 N장 놓였으면 새 후보 [장착] = 알림 띠 'N장까지예요'(밀려 올라온 기존 카드는 제한 없음). 규칙 위반(변이 기술 카드 장착 3장째 · 일반 패시브를 패시브 보관 · 장착 0)은 화면이 막고 알림 띠. 꾹(`input.holdMs() > 320` + `claimHold()`) = 그 카드 뒷면 크게(떼면 닫힘). [확정] = k === N일 때만 · `top`에 기존 카드가 남으면 `ask()` 확인 창 '○○ · ○○를 버려요'(기술 = 지운 기술 · 카드 = 가방 — 문구에 맞게) → `app.act('draftApply', { id, n: 0, layout: lay })` → 다음 고르기(같은 식물) 이어서. 진화 연출(`evoMotion`)은 그대로 앞에.
- [ ] **Step 2: 촬영 항목** — `06_draft_evo`(처음) · `06_draft_evo_placed`(하나 바꾼 뒤 빛남) · `06_draft_passive` · `06_draft_peek`(꾹 뒷면) · `06_draft_lv` — 270×600 · 270×480 둘 다 찍고 봄: 단추 줄 · 제목 안 잘림, 아래 영역 넘김 막대.
- [ ] **Step 3: 흐름 시험** — `draftflow.mjs`를 새 화면으로: 레벨업 → 후보 누름 → [장착] → 장착 칸 누름 → 원래 카드가 위 줄에 → [되돌리기] → 원래대로 → 다시 놓고 [확정](확인 창 [예]) → 기술이 칸에 · 원래 것은 지운 기술 · 진화 → 연출 → 기술 고르기 확정 → 패시브 고르기 창이 이어서 뜸 · 오래된 고르기(다른 데서 먼저 확정) → 오류 띠 뒤 화면 닫힘. `node tools/shots/draftflow.mjs` → `모두 통과`.
- [ ] **Step 4: 커밋** — draft · main · v2shots · draftflow → `v2 화면: 고르기 새로(얻은 카드 위 · 내 칸 아래 · [장착] → 칸 · 되돌리기 · 꾹 뒷면)`.

### Task 5: 맨 위 '보류 N' 단추

**Files:**
- Modify: `v2/src/scenes/popups.js`(`drawOverlays` 끝에 `holdButton(app)` — 고르기 · 확인 창 · 받은 것 판이 없을 때만)
- Modify: `v2/src/scenes/draft.js`([보류] 알림 문구) · `v2/src/scenes/home.js` · `plant.js`(빨간 점 조건에서 `p.pend` 빼기)

**Interfaces:**
- Consumes: `openDraft(app, p)`(Task 4).
- Produces: `pendingDrafts(s) → { n, p }`(`popups.js` 안 — 스마트팜 식물만 셈, `p` = 고르기가 남은 첫 식물).

- [ ] **Step 1: 단추** — `router.name`이 `home` · `nursery` · `plant` · `storage`이고 `router.phase` 없을 때 맨 위 띠 바로 아래 작은 금빛 단추 `보류 N` → `openDraft(app, p)`. 자리는 촬영으로 겹침 없는 곳(홈 = 레벨 판 아래 · 식물 관리 = 이름 줄과 안 겹치게).
- [ ] **Step 2: 촬영 · 흐름** — 촬영 `21_hold_home` · `21_hold_plant`(270×600 · 270×480) · `draftflow.mjs`에 [보류] → 단추 보임 → 누름 → 고르기 다시. 통과.
- [ ] **Step 3: 커밋** — popups · draft · home · plant · v2shots · draftflow → `v2 화면: 맨 위 '보류 N' 단추`.

### Task 6: 전체 확인 · 문서 · 푸시

**Files:**
- Modify: `docs/CHANGELOG.md`(69) · `docs/master-roadmap.md`(결정 로그: 기본기 '버릴 수 없음'(2026-10-16) → 칸 차지 · 버리면 지운 기술 / 패시브 칸 둘(2026-10-17) → 셋 + 변이 보관 셋) · `docs/superpowers/specs/2026-10-16-v2-mvp-design.md`(대기열 1번) · `CLAUDE.md`(🃏 · 🧬 줄의 칸 수 · '보관(전투 칸에 없는 기본기)' 문구)

- [ ] **Step 1: 전체 시험** — `for t in loadout cards status sun explore league coupon edgecases matchup team3v3 roomsave google server; do node tools/test/$t.mjs | tail -1; done` · `node cf/test_cf.mjs` · `node tools/shots/draftflow.mjs` → 전부 통과.
- [ ] **Step 2: 발열 점검** — `node tools/shots/perfcheck.mjs` → 고르기 화면이 열린 동안 말고는 장 수 변화 없음.
- [ ] **Step 3: 문서 갱신 · 커밋 · 푸시** — 위 문서 · `git push origin main`.
