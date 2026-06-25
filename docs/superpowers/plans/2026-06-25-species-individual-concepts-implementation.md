# 개체 고유화 구현 계획 (개체 + 고유 스킬 + 외형 액센트)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [docs/superpowers/specs/2026-06-24-species-individual-concepts-design.md](../specs/2026-06-24-species-individual-concepts-design.md)에 확정된 **175 개체**(비버섯 base 28 + 변이 140 + 버섯 base 7)에 **개체당 고유 스킬 3개(성장체/성체/완숙체)** 와 **변이형 자동 외형 액센트 시스템**을 `index.html`에 반영한다.

**Architecture:** 데이터는 `SPECIES_CATALOG`(개체 컨셉·rarity·form·stageSkills) + `SKILL_LIB`(고유 스킬 정의)에만 추가한다(기존 빌더/머지/도감 라이브 연동이 자동 흡수). 외형은 `composePlantBody`/`composePlantSvg`에 `bodyAccent` 인자를 배선하고 `ACCENT_MODULES` 레지스트리(6키)를 추가해 **변이형→액센트 자동 매핑**으로 분기한다(손그림 0). 변이 개체의 form은 기존 `baseVariants[0]` 오버라이드 메커니즘으로 박는다.

**Tech Stack:** 바닐라 HTML/CSS/JS 단일 파일(`index.html`). 빌드 없음. 회귀 검증 = `window.__catalogSelfTest()` 반환 fails 배열 + preview(`pullosseum`, 정적 서버).

## Global Constraints

- **단일 진실 위치:** 개체 = `SPECIES_CATALOG[key]`, 스킬 = `SKILL_LIB[id]`. 그 외 파일 수정 금지(빌더가 자동 흡수).
- **세이브 무회귀:** 기존 종 key·필드 유지. 새 종은 신규 key만 추가. 단계 키 = `GROWTH_STAGE_ORDER = ['seed','sprout','juvenile','growing','mature','evolved']` (성장체=`growing`, 성체=`mature`, 완숙체=`evolved`).
- **새싹·유체 공유 스킬 보존:** `stageSkills`에는 **`growing`/`mature`/`evolved`만** 넣는다(sprout/juvenile 키 금지 — 그 단계는 `plantKnownSkillIds`의 공유 라인이 채움). 버섯은 예외(기존 sprout/juvenile:`mushroom.spore_burst` 유지).
- **엔진 지원 필드만 사용**(확률성 라이더 없음): `power`+(`single`|`aoe`), `pierce`, `critBonus`, `lifesteal`, `dot{kind,pct,turns}`, `enemyDebuff{stat,pct,turns}`, `selfBuff{stat,pct,turns}`, `guardMult`(+`counterPct`), `heal`, `cleanse:true`, `energyGain`, `elem:true`.
- **시그니처 ≠ 변이 카드:** 개체 고유 스킬은 변이 카드(`CARD_SKILLS`)의 범용 효과를 그대로 베끼지 않는다(결이 달라야 함).
- **검증 게이트:** 매 Task 끝에 `window.__catalogSelfTest()` 0 fail 확인 → 커밋. preview 정적 서버라 코드 수정 후 `preview_stop`+`preview_start` 재시작 후 검증.
- **문서 동기화 의무:** 타입 한 묶음 완료 시 `master-roadmap.md`(§1 #1 상태·§5 결정로그)·`CHANGELOG.md`·설계서 진행표를 같은 커밋에.
- **미커밋 주의:** 작업 시작 시 워킹트리에 이전 세션의 플랜4(보급상자) 미커밋 변경이 있을 수 있음 — `index.html`은 영역이 다르니(박스 ~3650, 테스트 ~11833) 물리 충돌 없음. 커밋 시 **내가 만진 줄만** 가도록 주의(`git add` 후 `git diff --cached`로 확인).

---

## 스킬 효과 → `SKILL_LIB` 필드 매핑 규칙 (전 Task 공통 — 한 번만 정의)

설계서의 한국어 스킬 서술을 아래 규칙으로 기계적으로 변환한다.

| 설계 표현 | 필드 |
|---|---|
| `위력N 단일` | `kind:'attack', power:N, single:true` |
| `위력N 광역` | `kind:'attack', power:N, aoe:true` |
| `화상(NT)` | `dot:{kind:'burn', pct:0.06, turns:N}` |
| `중독(NT)` | `dot:{kind:'poison', pct:0.05, turns:N}` |
| `출혈(NT)` | `dot:{kind:'bleed', pct:0.06, turns:N}` |
| `흡혈 P%` | `kind:'drain', lifesteal:P/100` (공격 스킬에 동반 시 kind는 attack 유지하고 `lifesteal`만 부가) |
| `자신 공격/방어/기동 +P%(NT)` | `selfBuff:{stat:'atk'|'def'|'spd', pct:P/100, turns:N}` |
| `적 공격/방어/기동 −P%(NT)` | `enemyDebuff:{stat:'atk'|'def'|'spd', pct:P/100, turns:N}` |
| `체력 P% 회복` | `heal:P/100` (단독이면 `kind:'heal'`) |
| `상태이상 해제` | `cleanse:true` |
| `에너지 +1` | `energyGain:1` |
| `방어 관통` | `pierce:0.5` |
| `치명 +P%` | `critBonus:P/100` |
| `피해 P%↓` (가드) | `kind:'guard', guardMult:(1 − P/100)` → 50%↓=0.5, 55%↓=0.45, 60%↓=0.4, 65%↓=0.35, 70%↓=0.3 |
| `가시 반격` | 가드 스킬에 `counterPct:0.25` |
| `강한(전격) 반격` | 가드 스킬에 `counterPct:0.35` |
| `자기 속성 발현`(브레스) | `kind:'elemental', elem:true` |

**부가 규칙:**
- **cost:** 성장체 = 2, 성체 = 2, 완숙체 = 3. 단, 완숙체가 회복/버프 위주(공격 power 없음)면 2. cost1은 spec이 명시한 경우만.
- **grade:** 성장체 = `'B'`, 성체 = `'A'`, 완숙체 = `'S'`. (도감·잠재력 표기용. 밸런스 후속 조정.)
- **kind 우선순위:** power>0이면 `'attack'`(흡혈 동반 시 `lifesteal`만 부가, kind는 attack), power 없고 회복 위주면 `'heal'`, 버프 위주면 `'buff'`, 디버프/dot 위주면 `'debuff'`, 가드면 `'guard'`.
- **icon:** 속성 이모지 우선(🔥💧🌿🪨🌪️⚡❄️), 가드=🛡️, 회복=💚, 포식=🦷, 무기=⚔️, 용족=🐉, 독성=☠️.
- **desc:** 설계서의 한국어 서술을 그대로(간결화).
- **tag:** `'성장체'`/`'성체'`/`'완숙체'`.

**스킬 ID 규칙(기존 컨벤션 — 목본 base 7이 이미 사용 중):** `ind.<speciesKey>.g` (성장체) / `.m` (성체) / `.e` (완숙체=evolved). 예: `ind.tree_fire.g`. 카탈로그 `stageSkills:{ growing:['ind.tree_fire.g'], mature:['ind.tree_fire.m'], evolved:['ind.tree_fire.e'] }`. `tag`는 `'개체'`. ⚠️ `uniq.*`/`.f` 쓰지 말 것(목본 base 7과 불일치).

### 완전 worked example — 엠버오크(`tree_fire`, 설계 #1) — ✅ 이미 구현됨(참고용)

```js
// SKILL_LIB (이미 존재)
'ind.tree_fire.g': { name:'화로 점화', icon:'🔥', cost:2, kind:'attack', power:110, single:true,
  dot:{kind:'burn',pct:0.06,turns:3}, selfBuff:{stat:'def',pct:0.2,turns:3},
  desc:'위력110 · 단일 + 화상(3턴) + 자신 방어 20%↑(3턴)', tag:'개체', grade:'B' },
'ind.tree_fire.m': { name:'속불 재생', icon:'💚', cost:2, kind:'heal', heal:0.2, cleanse:true, energyGain:1,
  desc:'체력 20% 회복 + 상태이상 해제 · ⚡+1', tag:'개체', grade:'A' },
'ind.tree_fire.e': { name:'대화로 분출', icon:'🔥', cost:3, kind:'attack', power:150, aoe:true,
  dot:{kind:'burn',pct:0.06,turns:3}, pierce:0.5,
  desc:'위력150 · 광역 + 화상(3턴) + 방어 관통', tag:'개체', grade:'A' },

// SPECIES_CATALOG (이미 존재 — base 종은 GRID에 있으니 보강만)
tree_fire: { rarity:'common', stageSkills:{
  growing:['ind.tree_fire.g'], mature:['ind.tree_fire.m'], evolved:['ind.tree_fire.e'] } },
```

> **⚠️ 구현 현황(2026-06-25):** **Task 1(외형)·Task 2(form/게이트)·Task 3(목본 base 7) = 완료.** 변이종 스킬 ID도 `ind.<key>.g/.m/.e`로 통일. 남은 시작점 = **Task 4(화초 base 7, 설계 #8~#14)**.

---

## File Structure

- **Modify `index.html`만** (단일 파일):
  - `SPECIES_CATALOG` (~3428): base 28 보강 엔트리 + 변이 140 신규 엔트리.
  - `SKILL_LIB` (~4003): 고유 스킬 ~512개(base 28×3 + 버섯 7×2 + 변이 140×3).
  - `elementMotif` (~8141): 7속성 모티프 강화(현재 단순) — 액센트 시스템 기반.
  - `composePlantBody` (~8168) / `composePlantSvg` (~8237): `bodyAccent` 인자 배선 + `ACCENT_MODULES` 호출.
  - 신규 `ACCENT_MODULES` 레지스트리(composePlantBody 근처).
  - `pickAcquirableSpecies` (~3768): `released:false` 게이트 추가.
  - 신규 플랜 변이종 form 고정 보강(`base_variants` 오버라이드, ~7986).
  - 셀프테스트(`window.__test`, ~11800대): 신규 케이스.

---

## Task 1: 외형 액센트 시스템 (공유 인프라)

**Files:** Modify `index.html` (`elementMotif` ~8141, `composePlantBody` ~8168, `composePlantSvg` ~8237, 신규 `ACCENT_MODULES`).

**Interfaces:**
- Produces: `ACCENT_MODULES = { none, maw, arms, toxin, draco, enhance }` — 각 `(el, gi, P) → svgString`. `accentFromForm(form) → accentKey`. `composePlantBody(seedType, gi, P, el, bodyStyle, bodyAccent)` / `composePlantSvg(seedType, growth, element, opts)` opts에 `form`/`bodyAccent` 추가.

- [ ] **Step 1: `accentFromForm` + `ACCENT_MODULES` 추가** — 설계 §"외형 액센트 명세" 매핑표대로. 6 모듈 각각 절차적 SVG 오버레이(속성색 `P` 사용). `none`=빈 문자열(모티프만), `maw`=어두운 입+삼각 이빨 3 + 흡입 입자, `arms`=금속회색 칼날/갑주판 stroke, `toxin`=독방울 ●×3+독안개 타원+어두운 틴트, `draco`=겹비늘 arc+뿔 2+오라, `enhance`=글로우 링.

```js
const ACCENT_MODULES = {
  none:    (el,gi,P)=>'',
  maw:     (el,gi,P)=>`<g opacity="0.9"><ellipse cx="50" cy="62" rx="${8+gi}" ry="${5+gi*0.5}" fill="#1a0d14"/>`+
                      `<path d="M${44-gi} 60 l3 5 l3 -5 M${50} 60 l3 5 l3 -5" stroke="#fff" stroke-width="1.2" fill="none"/></g>`,
  arms:    (el,gi,P)=>`<g stroke="#9aa3ad" stroke-width="2" fill="#c2c9d1" opacity="0.95"><path d="M70 ${70-gi*2} l14 -10 l3 4 l-13 10 z"/></g>`,
  toxin:   (el,gi,P)=>`<g fill="#7fd84a" opacity="0.85"><circle cx="40" cy="78" r="2.2"/><circle cx="58" cy="80" r="2"/><circle cx="50" cy="84" r="1.8"/><ellipse cx="50" cy="80" rx="16" ry="5" fill="#7fd84a" opacity="0.15"/></g>`,
  draco:   (el,gi,P)=>`<g opacity="0.9"><path d="M42 40 l4 -10 l3 8 M58 40 l4 -10 l-3 8" stroke="${P.deep||'#888'}" stroke-width="2.5" fill="none"/>`+
                      `<path d="M40 60 q5 -4 10 0 q5 -4 10 0" stroke="${P.light||'#ccc'}" stroke-width="1.5" fill="none" opacity="0.7"/></g>`,
  enhance: (el,gi,P)=>`<circle cx="50" cy="64" r="${22+gi*2}" fill="none" stroke="${P.light||'#fff'}" stroke-width="1" opacity="0.35"/>`,
};
function accentFromForm(form){
  return ({ pred:'maw', weapon:'arms', toxic:'toxin', dragon:'draco', normal:'enhance' })[form] || 'none';
}
```
*(좌표는 viewBox 0~100 가정 — 실제 `composePlantBody` viewBox에 맞춰 Step 3에서 보정.)*

- [ ] **Step 2: `composePlantBody`/`composePlantSvg`에 `bodyAccent` 배선** — `composePlantSvg`가 `opts.form`(또는 `opts.bodyAccent`)에서 accent 키를 구해 body 위에 `ACCENT_MODULES[key](el,gi,P)` 문자열을 삽입. 합성 순서 = 화분→body→elementMotif→accent→완숙오라. idle 흔들림 그룹에 accent 포함(화분 제외).

- [ ] **Step 3: viewBox 보정** — 실제 `composePlantBody`의 좌표계 읽고 모듈 좌표를 body 실루엣에 맞춤(`preview_eval`로 반환 SVG 확인).

- [ ] **Step 4: 셀프테스트 추가**

```js
window.__test('accent: form→accent 매핑', function(){
  __eq(accentFromForm('pred'),'maw'); __eq(accentFromForm('weapon'),'arms');
  __eq(accentFromForm('toxic'),'toxin'); __eq(accentFromForm('dragon'),'draco');
  __eq(accentFromForm('normal'),'enhance'); __eq(accentFromForm(undefined),'none');
});
window.__test('accent: composePlantSvg가 변이형별로 다른 SVG', function(){
  const a = composePlantSvg('tree','mature','fire',{form:'pred'});
  const b = composePlantSvg('tree','mature','fire',{form:'weapon'});
  __ok(a !== b, '포식≠무기 외형');
});
```

- [ ] **Step 5: 검증 + 커밋** — `preview_stop`+`preview_start` → `preview_eval`로 6 변이형×대표 속성 SVG 마커 확인. `__catalogSelfTest()` 0 fail. `git add index.html` → `git diff --cached`로 내 변경만 확인 → 커밋 `feat(#1): 외형 액센트 시스템(변이형 자동 매핑)`.

---

## Task 2: 변이 개체 form 고정 + 비획득 게이트

**Files:** Modify `index.html` (`SPECIES` 빌더 ~3506 rich 필드, `pickAcquirableSpecies` ~3768, base_variants 오버라이드 ~7986).

**Interfaces:**
- Produces: `SPECIES[key].released`(기본 true, 카탈로그 `released:false`면 false) — 비획득 종 표식. 변이종 form은 `baseVariants[0]`로 무조건 고정.

- [ ] **Step 1: `released` 리치필드 추가** — 빌더 Step3(`s.rarity=...` 근처)에 `s.released = c.released !== false;`.

- [ ] **Step 2: `pickAcquirableSpecies` 게이트** — pool 필터에 `&& SPECIES[k].released` 추가.

- [ ] **Step 3: form 고정 보강** — `~7986`의 `if((!p.form || p.form==='normal') && p.base_variants.length) p.form = p.base_variants[0];` 를 **base_variants가 있으면 무조건** 적용: `if(p.base_variants.length) p.form = p.base_variants[0];` (변이종은 rollForm 결과 무시하고 태생 변이 고정. 버섯 spore도 동일하게 안전.) predType은 form==='pred'일 때 없으면 기본 'vamp' 보강.

- [ ] **Step 4: 셀프테스트**

```js
window.__test('gate: released=false 종은 비획득', function(){
  // 임시 변이종이 있으면 acquirable 풀에서 제외되는지(있을 때만)
  Object.keys(SPECIES).filter(k=>SPECIES[k].released===false).forEach(k=>{
    for(let i=0;i<50;i++){ __ok(pickAcquirableSpecies()!==k, '비획득 종 '+k+' 등장'); }
  });
  __ok(SPECIES.tree_fire.released, 'base 종은 획득가능');
});
```

- [ ] **Step 5: 검증 + 커밋** — `__catalogSelfTest()` 0 fail. 커밋 `feat(#1): 변이종 form 고정 + released 비획득 게이트`.

---

## Task 3: 목본 base 7 고유 스킬 (설계 #1~#7)

**Files:** Modify `index.html` (`SKILL_LIB`, `SPECIES_CATALOG`).

- [ ] **Step 1: SKILL_LIB에 21 스킬 추가** — 설계 #1~#7(엠버오크 tree_fire / 타이드우드 tree_water / 엘더우드 tree_grass / 스톤오크 tree_earth / 게일우드 tree_wind / 썬더오크 tree_bolt / 프로스트베리 frost)의 성장체/성체/완숙체를 매핑 규칙으로 변환. `tree_fire`는 위 worked example 그대로.
- [ ] **Step 2: SPECIES_CATALOG 7 보강 엔트리** — 각 `<key>: { rarity, stageSkills:{growing,mature,evolved} }`. rarity = 설계 표기(썬더오크=rare 등). key 매핑: 엠버오크=`tree_fire`, 타이드우드=`tree_water`, 엘더우드=`tree_grass`, 스톤오크=`tree_earth`, 게일우드=`tree_wind`, 썬더오크=`tree_bolt`, 프로스트베리=`frost`.
- [ ] **Step 3: 셀프테스트** — `plantKnownSkillIds`로 tree_fire growing/mature/evolved에 uniq 스킬이 해금되는지 + 모든 stageSkills 참조 id가 SKILL_LIB에 실재하는지 일반 검사 추가:

```js
window.__test('catalog: 모든 stageSkills id가 SKILL_LIB/ALL_SKILLS에 실재', function(){
  Object.keys(SPECIES).forEach(k=>{ const ss=SPECIES[k].stageSkills; if(!ss) return;
    Object.values(ss).forEach(arr=>arr.forEach(id=>__ok(ALL_SKILLS[id], k+' → 미정의 스킬 '+id))); });
});
```

- [ ] **Step 4: 검증 + 커밋** — `__catalogSelfTest()` 0 fail. preview에서 엠버오크 성장 단계별 스킬 노출 확인(`plantKnownSkillIds`). 커밋 `feat(#1): 목본 base 7 고유 스킬`.

---

## Task 4: 화초 base 7 (설계 #8~#14) · Task 5: 다육 base 7 (#15~#21) · Task 6: 덩굴 base 7 (#22~#28)

**각 Task 구조는 Task 3과 동일** (21 스킬 + 7 카탈로그 보강 + 검증 + 커밋). key 매핑:
- **화초:** 블레이즈블룸=`flower_fire`, 아쿠아벌브=`aqua`, 페탈로즈=`flower_grass`, 클레이블룸=`flower_earth`, 윈드페탈=`flower_wind`, 스파크번=`spark`, 프로스트블룸=`flower_ice`.
- **다육:** 엠버캑터=`cactus_fire`, 듀캑터=`cactus_water`, 비리캑터=`cactus_grass`, 가이아록=`gaia`, 게일캑터=`cactus_wind`, 볼트캑터=`cactus_bolt`, 프로스트캑터=`cactus_ice`.
- **덩굴:** 플레임바인=`vine_fire`, 타이드바인=`vine_water`, 쏜위드=`thorn`, 루트바인=`vine_earth`, 게일바인=`vine_wind`, 볼트바인=`vine_bolt`, 프로스트바인=`vine_ice`.

각 Task 끝: `__catalogSelfTest()` 0 fail → 커밋 `feat(#1): <타입> base 7 고유 스킬`.

---

## Task 7: 버섯 base 7 성체/완숙체 (설계 #29~#35)

**Files:** Modify `index.html`.

- [ ] **Step 1: SKILL_LIB에 14 스킬 추가** — 버섯 7종 각 성체(`.m`)·완숙체(`.f`)만(성장체는 기존 `sig.*` 유지). 설계 #29~#35 서술 변환.
- [ ] **Step 2: 카탈로그 stageSkills 확장** — 기존 7 엔트리의 `stageSkills`에 `mature:['uniq.spore_*.m'], evolved:['uniq.spore_*.f']` 추가(growing의 기존 `sig.*` 유지). sprout/juvenile `mushroom.spore_burst`도 유지.
- [ ] **Step 3: 검증 + 커밋** — `__catalogSelfTest()` 0 fail. 커밋 `feat(#1): 버섯 base 7 성체·완숙체 스킬`. **→ 여기까지 base 35종 = 칸당 3스킬 깊이 통일 완료.** 로드맵·CHANGELOG·설계서 진행표 갱신(같은 커밋).

---

## Task 8~12: 변이 개체 140종 (타입별 배치)

> 설계 "변이 개체 — 풀 매트릭스" 섹션(목본/화초/다육/덩굴 각 × 5변이형). 신규 카탈로그 종 + 3스킬씩. **버섯 비포자 변이는 설계 미완 → 이번 범위 제외.**

각 변이 개체 카탈로그 엔트리 형식:
```js
carno_oak: { name:'카르노오크', type:'tree', element:'fire', rarity:'rare', released:false,
  baseVariants:['pred'], variantSlots:{ pred:2, normal:4 },
  stageSkills:{ growing:['ind.carno_oak.g'], mature:['ind.carno_oak.m'], evolved:['ind.carno_oak.e'] } },
```
- `type`/`element` = 설계 표기. `stats` 생략(타입+속성 자동; 설계 스탯과 일치함을 빌더가 보장). 단, 설계 스탯이 타입+속성 합과 다른 특수 케이스만 `stats:{hp,atk,def,spd}` 명시.
- `baseVariants` = 변이형 1개(`pred`/`weapon`/`toxic`/`dragon`/`normal`). `variantSlots` = 그 변이형 2 + normal 4.
- `released:false`(분포 #7 후속).
- form별 `variantSlots` 키: pred/weapon/toxic/dragon/normal.

**Task 8 = 목본 변이 35종**(설계 "🌳 목본 × 포식/무기/독성/용족/일반" 5섹션). 35 카탈로그 + 105 스킬.
**Task 9 = 화초 변이 35종.** **Task 10 = 다육 변이 35종.** **Task 11 = 덩굴 변이 35종.**

> ⚠️ 한 Task(35종·105스킬)가 한 세션 한도를 넘으면 **속성 단위로 더 쪼갠다**(예: 목본×포식 6종씩). 서브에이전트 1개 = 한 변이형 섹션 권장.

각 Task:
- [ ] **Step 1:** 해당 섹션 종들의 카탈로그 엔트리 추가(위 형식, key는 설계의 `(key)`).
- [ ] **Step 2:** 종별 3스킬 SKILL_LIB 추가(매핑 규칙).
- [ ] **Step 3:** `__catalogSelfTest()` 0 fail(stageSkills 실재 테스트가 자동 커버). preview에서 1종 planting→form 고정·외형 액센트·스킬 해금 확인.
- [ ] **Step 4:** 커밋 `feat(#1): <타입> 변이 개체 35종`.

**Task 12 = 마감:** 설계서 "남은 설계 = 버섯 비포자 변이"만 남기고 진행표 전부 ✅. 로드맵 §1 #1 = "🟢 base 35 + 변이 140 완성, 버섯 변이·분포 후속". CHANGELOG 종합 항목. 도감 라이브 자동 반영 확인.

---

## Self-Review (작성자 체크)

- **Spec coverage:** base 35(#1~#35) = Task 3~7. 변이 140 = Task 8~11. 외형 액센트 명세 = Task 1. form 고정/획득 게이트(spec "구현 파급") = Task 2. 식물/화분 분리 = 이미 main 구현됨(#12, 범위 외). 버섯 비포자 변이 35 = spec이 "남은 설계"로 명시 → 범위 외(Task 12에 기록).
- **Placeholder scan:** worked example(엠버오크) 완전 코드 제공. 나머지는 동일 매핑 규칙의 기계적 반복이라 스킬별 코드 대신 규칙+key매핑+spec 줄 참조(콘텐츠 진실원 = spec). 각 Task는 독립 검증·커밋.
- **Type consistency:** 스킬 id `uniq.<key>.<g|m|f>` 일관. 단계 키 `growing`/`mature`/`evolved` 일관(GROWTH_STAGE_ORDER 확인됨). `released` 필드명 일관.
- **위험:** (a) `composePlantBody` viewBox 좌표 — Task1 Step3에서 실측 보정. (b) 변이종 스탯이 타입+속성 합과 다르면 `stats` 명시 필요 — Task8~11 Step1에서 spec 스탯과 빌더 산출 대조. (c) 적 봇(`buildEnemy`)이 변이종을 안 뽑게 — released 게이트가 커버하는지 buildEnemy 경로 확인(Task2).
