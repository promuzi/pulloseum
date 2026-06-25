# 수집 화분 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans 로 task 단위 실행. 각 step은 체크박스(`- [ ]`).

**Goal:** 죽어있던 `potQuality`를 **수집 화분 5종**으로 부활시키고(획득/장착/효과), 그 과정에서 **식물/화분 시각을 분리**(#12 진입점)한다.

**Architecture:** `index.html` 단일 파일. 순수 로직(`potOf`·효과 반영)은 셀프테스트, UI/획득은 preview. 화분=영구 해금(`state.pot_inventory` 집합), 장착=`p.nursery.potId`. 시각 분리는 `composePlantSvg(...,{noPot})` + `potVisual()` 2레이어.

**Tech Stack:** 바닐라 JS/CSS. 테스트 = `window.__test(name, fn)`(throw 기반, `__ok`/`__eq`), `window.__catalogSelfTest()`.

**작업 폴더:** `풀로세움-2`(work-2 브랜치) — 모든 커밋 여기서. 버섯 세션(`풀로세움`)과 충돌 격리.

## Global Constraints
- 단일 `index.html`, 빌드/의존성 추가 금지.
- 세이브 무회귀: 신규 필드는 `normalizeState`/`ensureNurseryFields`/`defaultState`에서 기본값 주입. 기존 세이브=테라코타 장착·보유.
- **`composePlantBody`는 절대 수정 금지**(버섯 세션 영역). `composePlantSvg`는 화분 블록에 `if(!opts.noPot)` 한 줄만.
- 화분은 **소비 없음**(영구 해금, 자유 장착, 중복 획득→크레딧 환급 150).
- 수치는 시드값(spec §2). 시각 분리는 **양육 화면 한정**.
- 각 task 끝에 `cd "C:/Users/soosa/Documents/풀로세움-2" && git ...`로 커밋.

---

## Task 1: 화분 카탈로그 + potOf + 데이터/마이그레이션

**Files:** Modify `index.html` — 상수(`FRUIT_*` 근처), `defaultState`[4479], `normalizeState`[4542], `ensureNurseryFields`[4563], 셀프테스트.

**Interfaces:**
- Produces: `POT_CATALOG`, `POT_SPRITE_OVERRIDES`, `potOf(p)→catalogEntry`, `state.pot_inventory:{id:true}`, `p.nursery.potId`.

- [ ] **Step 1: 카탈로그 + potOf 추가** (`nurseryMaxFruits`[4611] 바로 위에):

```js
const POT_CATALOG = {
  pot_terra:   { id:'pot_terra',   name:'테라코타',   icon:'🪵', rarity:'white',  speed:0.00, maxFruitDelta:0, gradeLift:0.00, color:'#e6edf2' },
  pot_ceramic: { id:'pot_ceramic', name:'도자기',     icon:'🏺', rarity:'green',  speed:0.15, maxFruitDelta:0, gradeLift:0.00, color:'#5fd56a' },
  pot_glass:   { id:'pot_glass',   name:'유리 화분',  icon:'🫙', rarity:'blue',   speed:0.10, maxFruitDelta:1, gradeLift:0.00, color:'#4ac6ff' },
  pot_crystal: { id:'pot_crystal', name:'크리스탈',   icon:'💎', rarity:'purple', speed:0.30, maxFruitDelta:1, gradeLift:0.06, color:'#b98cff' },
  pot_gold:    { id:'pot_gold',    name:'황금 화분',  icon:'👑', rarity:'orange', speed:0.40, maxFruitDelta:2, gradeLift:0.10, color:'#ff9a3c' },
};
const POT_ORDER = ['pot_terra','pot_ceramic','pot_glass','pot_crystal','pot_gold'];
const POT_SPRITE_OVERRIDES = {};   // #3 도트화 훅: POT_SPRITE_OVERRIDES['pot_gold']='assets/...png'
function potOf(p){ const id=(p&&p.nursery&&p.nursery.potId)||'pot_terra'; return POT_CATALOG[id]||POT_CATALOG.pot_terra; }
```

- [ ] **Step 2: `ensureNurseryFields`에 potId 기본값** — [4563] 함수의 "신모델 필드 방어" 구역에 추가(`n.maxFruits = nurseryMaxFruits(p);` 줄 위):

```js
  if(typeof n.potId !== 'string' || !POT_CATALOG[n.potId]) n.potId = 'pot_terra';
  delete n.potQuality; // 구 필드 폐기(화분 기반으로 대체)
```

- [ ] **Step 3: `defaultState` + `normalizeState`** — `defaultState`[4479] `care:{...}` 옆에 `pot_inventory:{ pot_terra:true },` 추가. `normalizeState`[4542] care 방어 옆에:

```js
  if(!s.pot_inventory || typeof s.pot_inventory !== 'object') s.pot_inventory = {};
  s.pot_inventory.pot_terra = true;  // 테라코타는 항상 보유
```

- [ ] **Step 4: 셀프테스트** (`window.__test('nursery: harvest...` 케이스 뒤에):

```js
window.__test('pots: catalog + potOf fallback + migration', function(){
  __ok(POT_ORDER.length===5, 'pot catalog 5종');
  __eq(potOf({}).id, 'pot_terra', 'potOf 폴백');
  __eq(potOf({nursery:{potId:'pot_gold'}}).id, 'pot_gold', 'potOf 장착');
  const p={ growth_stage:'mature', nursery:{ potQuality:1, potId:'bad_id' } };
  ensureNurseryFields(p);
  __eq(p.nursery.potId, 'pot_terra', '잘못된 potId→테라코타');
  __ok(!('potQuality' in p.nursery), '구 potQuality 제거');
});
```

- [ ] **Step 5: 검증** — preview에서 `window.__catalogSelfTest()` 호출, fails 0 확인(아래 명령). **Step 6 커밋 전 Task 2도 함께**(효과 반영 없으면 카탈로그만 있음 — Task1·2 한 커밋 가능).
Run: preview_eval `JSON.stringify(window.__catalogSelfTest().length)` → Expected `0` 부분 통과(pots 테스트 PASS).

- [ ] **Step 6: 커밋**
```bash
cd "C:/Users/soosa/Documents/풀로세움-2" && git add index.html && git commit -m "feat(pots): 화분 카탈로그 5종 + potOf + 데이터모델/마이그레이션"
```

---

## Task 2: 효과 반영 (속도/최대열매/등급확률)

**Files:** Modify `index.html` — `nurseryMaxFruits`[4611], `rollFruitRarity`[4614], `nurseryTick` rate줄[4648], 셀프테스트.

**Interfaces:** Consumes `potOf`(Task1). Produces: 화분이 충전속도·maxFruits·rarity에 반영.

- [ ] **Step 1: `nurseryMaxFruits`에 화분 보너스** — [4611] 교체:

```js
function nurseryMaxFruits(p){ const base = FRUIT_MAX_BY_STAGE[(p && p.growth_stage)] || 0; return base>0 ? base + potOf(p).maxFruitDelta : 0; }
```

- [ ] **Step 2: `nurseryTick` 충전식에 화분 속도** — [4648] 교체(`n.potQuality||1` → 화분 속도):

```js
  const rate = (1 + potOf(p).speed) * stageSpeed * (1 + avgBuff*CARE_SPEED_BONUS) / (FRUIT_BASE_CYCLE_MS/3600000);
```

- [ ] **Step 3: `rollFruitRarity` lift에 화분 등급가중** — [4614] 함수 내 `const lift = buff*0.5 + stageBonus;` 를 교체:

```js
  const lift = buff*0.5 + stageBonus + potOf(p).gradeLift;
```

- [ ] **Step 4: 셀프테스트**:

```js
window.__test('pots: effects (maxFruits/speed/lift)', function(){
  const terra={ growth_stage:'mature', nursery:{potId:'pot_terra'} }; ensureNurseryFields(terra);
  const gold ={ growth_stage:'mature', nursery:{potId:'pot_gold'} };  ensureNurseryFields(gold);
  __eq(nurseryMaxFruits(terra), 3, 'terra mature maxFruits 3');
  __eq(nurseryMaxFruits(gold), 5, 'gold mature maxFruits 3+2=5');
  __eq(nurseryMaxFruits({growth_stage:'seed',nursery:{potId:'pot_gold'}}), 0, 'seed 단계는 화분 무관 0');
  // 속도: 같은 시간/버프0에서 gold가 더 많이 충전 → 더 빨리 맺힘
  const t={growth_stage:'growing',nursery:{potId:'pot_terra'}}; ensureNurseryFields(t); t.nursery.gauge=0; t.nursery.lastTick=0;
  const g={growth_stage:'growing',nursery:{potId:'pot_gold'}};  ensureNurseryFields(g); g.nursery.gauge=0; g.nursery.lastTick=0;
  nurseryTick(t, 2*3600000); nurseryTick(g, 2*3600000);
  __ok((g.nursery.ripe.length + g.nursery.gauge) > (t.nursery.ripe.length + t.nursery.gauge), 'gold가 더 빨리 충전');
});
```

- [ ] **Step 5: 검증** — `window.__catalogSelfTest()` fails 0.
- [ ] **Step 6: 커밋**
```bash
cd "C:/Users/soosa/Documents/풀로세움-2" && git add index.html && git commit -m "feat(pots): 화분 효과 반영 — 충전속도/최대열매/등급확률"
```

---

## Task 3: 식물/화분 시각 분리 — composePlantSvg noPot + potVisual

**Files:** Modify `index.html` — `composePlantSvg`[7897](화분 블록만), `potVisual` 신규(composePlantSvg 근처), CSS(`.pot-gauge` 근처), 셀프테스트.

**Interfaces:** Produces: `composePlantSvg(seedType,growth,element,{noPot:true})` 식물만, `potVisual(potId,size)→svg`.

- [ ] **Step 1: `composePlantSvg`에 noPot** — [7897] 함수의 화분 3요소(`<rect x="36" y="96"...>` + `<path d="M40 103...>` + `<rect x="46" y="110"...>`)를 템플릿 리터럴 보간으로 감싼다:

```js
    ${aura}
    ${composePlantBody(seedType, gi, P, el)}
    ${opts.noPot ? '' : `<rect x="36" y="96" width="48" height="7" rx="3.5" fill="${P.main}" opacity="0.9"/>
    <path d="M40 103 h40 l-4.5 24 a8 8 0 0 1 -8 6.5 h-15 a8 8 0 0 1 -8 -6.5 Z" fill="#232b3d" stroke="rgba(255,255,255,0.15)"/>
    <rect x="46" y="110" width="28" height="3.5" rx="1.75" fill="${P.main}" opacity="0.45"/>`}
    ${spark}
```
(`composePlantBody` 호출은 그대로 — 건드리지 않음.)

- [ ] **Step 2: `potVisual` 신규** (composePlantSvg 바로 뒤):

```js
// 화분 종류별 레이어(절차적 SVG, 같은 120x140 viewBox로 식물과 정렬). PNG 교체 훅 = POT_SPRITE_OVERRIDES.
function potVisual(potId, size){
  size = size || 78;
  if(POT_SPRITE_OVERRIDES[potId]){
    const h = Math.round(size*140/120);
    return `<img src="${POT_SPRITE_OVERRIDES[potId]}" width="${size}" height="${h}" alt="" style="object-fit:contain;display:block"/>`;
  }
  const pot = POT_CATALOG[potId] || POT_CATALOG.pot_terra;
  const c = pot.color, dark = '#232b3d';
  // 등급 높을수록 테두리/광택 강화
  const glow = (potId==='pot_crystal'||potId==='pot_gold') ? `<rect x="36" y="96" width="48" height="40" rx="6" fill="${c}" opacity="0.12"/>` : '';
  const facet = potId==='pot_crystal' ? `<path d="M48 108 l12 -6 l12 6 -12 22 Z" fill="${c}" opacity="0.25"/>` : '';
  const crown = potId==='pot_gold' ? `<path d="M44 96 l4 -7 4 5 4 -7 4 7 4 -5 4 7 Z" fill="${c}"/>` : '';
  return `<svg width="${size}" height="${Math.round(size*140/120)}" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
    ${glow}
    <rect x="36" y="96" width="48" height="7" rx="3.5" fill="${c}" opacity="0.95"/>
    <path d="M40 103 h40 l-4.5 24 a8 8 0 0 1 -8 6.5 h-15 a8 8 0 0 1 -8 -6.5 Z" fill="${dark}" stroke="${c}" stroke-width="1.4"/>
    <rect x="46" y="110" width="28" height="3.5" rx="1.75" fill="${c}" opacity="0.6"/>
    ${facet}${crown}
  </svg>`;
}
```

- [ ] **Step 3: CSS 2레이어** (`.pot-gauge` 근처):

```css
.pot-stack{position:absolute;bottom:46px;left:50%;transform:translateX(-50%);z-index:3;}
.pot-stack .pot-layer{position:absolute;left:0;top:0;z-index:1;}
.pot-stack .plant-layer{position:relative;z-index:2;transform-origin:50% 90%;animation:potSway 3.4s ease-in-out infinite;}
@keyframes potSway{0%,100%{transform:rotate(-2.5deg);}50%{transform:rotate(2.5deg);}}
@media (prefers-reduced-motion: reduce){ .pot-stack .plant-layer{animation:none;} }
```

- [ ] **Step 4: 셀프테스트**:

```js
window.__test('pots: visual separation', function(){
  const full = composePlantSvg('flower','mature','fire',{});
  const noPot = composePlantSvg('flower','mature','fire',{noPot:true});
  __ok(full.indexOf('M40 103')>=0, '기본은 화분 path 포함');
  __ok(noPot.indexOf('M40 103')<0, 'noPot은 화분 path 없음');
  POT_ORDER.forEach(id => __ok(potVisual(id,40).indexOf('<svg')>=0 || potVisual(id,40).indexOf('<img')>=0, 'potVisual '+id));
});
```

- [ ] **Step 5: 검증** — `window.__catalogSelfTest()` fails 0.
- [ ] **Step 6: 커밋**
```bash
cd "C:/Users/soosa/Documents/풀로세움-2" && git add index.html && git commit -m "feat(pots): 식물/화분 시각 분리 — composePlantSvg noPot + potVisual 레이어(#12 진입점)"
```

---

## Task 4: 양육 2레이어 렌더 + 화분 바꾸기 UI

**Files:** Modify `index.html` — `renderNurseryGrid`[10189], `openNurseryDetail`[10230], `equipPot`/`openPotPicker` 신규.

**Interfaces:** Consumes `potVisual`,`composePlantSvg({noPot})`,`potOf`,`POT_CATALOG`,`state.pot_inventory`.

- [ ] **Step 1: `renderNurseryGrid` 스프라이트 2레이어화** — [10189] 함수 내 `const sprite = composePlantSvg(st, p.growth_stage || 'seed', el, {size:78, ...});` 와 `<div class="pot-sprite" ...>${sprite}</div>` 부분을 교체:

```js
        const plantLayer = composePlantSvg(st, p.growth_stage || 'seed', el, {size:78, grade:p.grade, awakened:p.awakened, noPot:true});
        const potLayer = potVisual(p.nursery.potId, 78);
        // ... html += 내부에서 기존 <div class="pot-sprite"...>${sprite}</div> 를 아래로:
        //   <div class="pot-stack" style="animation-delay:${delay}s"><span class="pot-layer">${potLayer}</span><span class="plant-layer">${plantLayer}</span></div>
```
(기존 `<div class="pot-sprite" style="animation-delay:${delay}s">${sprite}</div>` 한 줄을 `<div class="pot-stack"><span class="pot-layer">${potLayer}</span><span class="plant-layer" style="animation-delay:${delay}s">${plantLayer}</span></div>`로 교체. `.pot-vessel` 줄은 화분 레이어와 중복되니 제거.)

- [ ] **Step 2: `openNurseryDetail` 스프라이트 2레이어 + 화분 바꾸기 버튼** — [10230] 상세 sprite를 동일하게 2레이어로, 그리고 `🪴 화분 바꾸기` 버튼 추가(`화분 상세` howto 위):

```js
  // sprite 줄 교체:
  const plantLayer = composePlantSvg(st, p.growth_stage||'seed', el, {size:72, grade:p.grade, awakened:p.awakened, noPot:true});
  const potLayer = potVisual(p.nursery.potId, 72);
  // 상단 sprite div를: <div style="text-align:center;margin-bottom:10px;position:relative;height:84px"><span style="position:absolute;left:50%;transform:translateX(-50%)">${potLayer}</span><span style="position:relative;display:inline-block">${plantLayer}</span></div>
  // 버튼: <button class="btn ghost" onclick="openPotPicker(${idx})" style="width:100%;margin-top:8px;font-size:12px;padding:9px">🪴 화분 바꾸기 (${potOf(p).icon} ${potOf(p).name})</button>
```

- [ ] **Step 3: `openPotPicker` + `equipPot` 신규** (openNurseryDetail 뒤):

```js
function openPotPicker(idx){
  const p=(state.plants||[])[idx]; if(!p) return;
  const cur = p.nursery.potId;
  const rows = POT_ORDER.map(id=>{
    const pot=POT_CATALOG[id], owned=!!(state.pot_inventory&&state.pot_inventory[id]);
    const fx=`속도+${Math.round(pot.speed*100)}% · 열매+${pot.maxFruitDelta}${pot.gradeLift?' · 등급↑':''}`;
    return `<div class="rr-item" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:12px;border:1.5px solid ${owned?pot.color:'rgba(255,255,255,.12)'};background:rgba(20,30,40,.5);${owned?'cursor:pointer':'opacity:.5'}" ${owned?`onclick="equipPot(${idx},'${id}')"`:''}>
      <div style="font-size:24px">${pot.icon}</div>
      <div style="flex:1;text-align:left"><div style="font-weight:800;color:${pot.color}">${pot.name}${id===cur?' ✓':''}</div><div style="font-size:10.5px;color:#9fd9b6">${owned?fx:'🔒 미보유'}</div></div>
    </div>`;
  }).join('');
  const body=document.querySelector('#nurseryPopBody');
  body.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:15px;font-weight:900;color:#d6ffe6">🪴 화분 선택</div><button onclick="closeNurseryPop()" style="background:none;border:none;color:#9fd9b6;font-size:20px;cursor:pointer">✕</button></div>${rows}`;
  show('#nurseryPopModal');
}
function equipPot(idx, potId){
  const p=(state.plants||[])[idx]; if(!p||!POT_CATALOG[potId]) return;
  if(!(state.pot_inventory&&state.pot_inventory[potId])){ toast('아직 보유하지 않은 화분입니다'); return; }
  ensureNurseryFields(p); nurseryTick(p, Date.now());
  p.nursery.potId = potId;
  saveState(); sfx.tap&&sfx.tap();
  closeNurseryPop(); openNurseryDetail(idx); renderNurseryGrid();
  toast(`🪴 ${POT_CATALOG[potId].name} 장착!`);
}
```

- [ ] **Step 4: preview 검증** — `state.pot_inventory={pot_terra:true,pot_gold:true}`, 성장체 식물에서 화분 바꾸기→황금 장착→상세창 열매개수/속도 반영 + 양육 칸에 화분/식물 2레이어. snapshot/eval로 `potOf(plant).id==='pot_gold'`, maxFruits 증가 확인.

- [ ] **Step 5: 커밋**
```bash
cd "C:/Users/soosa/Documents/풀로세움-2" && git add index.html && git commit -m "feat(pots): 양육 2레이어 렌더 + 화분 바꾸기 UI(openPotPicker/equipPot)"
```

---

## Task 5: 획득 — 상점 + RewardReveal 'pot' + 드롭

**Files:** Modify `index.html` — `grantPot` 신규, `openRewardReveal`/`rrContainerHtml`[10279], 상점 렌더+`buyPot`, `rollFruitReward`/탐사·보급 드롭.

**Interfaces:** Consumes `openRewardReveal`,`POT_CATALOG`,`state.pot_inventory`,`addCredits`. Produces `grantPot(potId)→rewardObj`.

- [ ] **Step 1: `grantPot` 신규**(potOf 근처) — 보유 시 크레딧 환급, 아니면 해금. RewardReveal 표시 객체 반환:

```js
function grantPot(potId){
  const pot = POT_CATALOG[potId]; if(!pot) return null;
  if(!state.pot_inventory) state.pot_inventory = { pot_terra:true };
  if(state.pot_inventory[potId]){ addCredits(150); return { kind:'credit', label:`${pot.name}(보유) → 크레딧 +150`, icon:'🪙', color:pot.color, payload:{credits:150} }; }
  state.pot_inventory[potId] = true;
  return { kind:'pot', label:`${pot.name} 획득!`, icon:pot.icon, color:pot.color, payload:{potId} };
}
```

- [ ] **Step 2: RewardReveal 'pot' 컨테이너** — `rrContainerHtml`[10279]에 분기 추가(fruit 분기 옆):

```js
  if(kind==='pot'){ const c=(item&&item.color)||'#e6edf2'; return `<div class="rr-box fruit" style="--rc:${c}">🪴</div>`; }
```
그리고 `openRewardReveal`의 `titleMap`에 `pot:'🪴 화분 개봉'` 추가.

- [ ] **Step 3: 상점에 화분 항목** — 상점 렌더에서 화분 레인 추가. `buyPot` 핸들러:

```js
const POT_SHOP = [
  { potId:'pot_ceramic', price:400 },
  { potId:'pot_glass',   price:900 },
];
function buyPot(potId){
  const row = POT_SHOP.find(x=>x.potId===potId); if(!row) return;
  if(state.pot_inventory && state.pot_inventory[potId]){ toast('이미 보유한 화분입니다'); return; }
  if((state.credits||0) < row.price){ toast('크레딧이 부족합니다'); return; }
  spendCredits(row.price);
  const reward = grantPot(potId);
  saveState();
  openRewardReveal({ kind:'pot', items:[reward], onDone:()=>renderMain() });
  renderMain();
}
```
상점 렌더(`renderShop`/`#shopList` 구성부)에 화분 카드 렌더 한 줄 추가: 각 `POT_SHOP` 항목을 `data-buy-pot="${potId}"` 버튼으로. 클릭 핸들러(`#shopList` 위임 또는 기존 패턴)에서 `buyPot(dataset.buyPot)` 호출. (기존 `data-shop-box` 위임 패턴 미러 — `renderShop` 끝 `document.querySelectorAll('#shopList [data-buy-pot]').forEach(c=>c.addEventListener('click',()=>{sfx.tap();buyPot(c.dataset.buyPot);}));`)

- [ ] **Step 4: 보상 드롭에 화분 추가** — 크리스탈·황금은 희귀 드롭:
  - 탐사 성공(`rollExplorationRewards` 궤도 콜백, 물/비료 드롭 옆): `if(Math.random()<0.05){ const r=grantPot(Math.random()<0.3?'pot_gold':'pot_crystal'); rewards.care.push({potReward:r, name:POT_CATALOG[r.payload?r.payload.potId:'pot_crystal']? r.label:'화분', icon:'🪴', count:1}); }` — 단, 탐사 reveal items에 화분도 넣기(Task7 expedition items 빌드에서 `rewards.care`의 potReward 처리). **간단화:** 탐사 reveal 빌드에서 화분 보상은 `r`(grantPot 반환)를 그대로 items에 push.
  - 열매 수확(`rollFruitReward` 주황 분기): 낮은 확률로 화분 대신 줄 수 있으나 **범위 밖**(YAGNI) — 상점+탐사로 충분. 보급상자 드롭도 후속.

  **실제 적용(탐사만, 최소):** 궤도 탐사 콜백의 reveal items 빌드(`if(success){ const items=[]...}`)에 추가:
```js
      if(Math.random() < 0.05){ const pr = grantPot(Math.random()<0.3?'pot_gold':'pot_crystal'); if(pr) items.push(pr); }
```
  (grantPot이 state 갱신까지 하므로 items에 표시만 push. care 배열 불필요.)

- [ ] **Step 5: preview 검증** — ① 상점 화분 구매→pot reveal 개봉→`state.pot_inventory[potId]===true` ② 중복 구매 시 "이미 보유" ③ 탐사 reveal에 화분 등장(확률 강제: `Math.random` 스텁 또는 여러 번). 콘솔 에러 0.

- [ ] **Step 6: 커밋**
```bash
cd "C:/Users/soosa/Documents/풀로세움-2" && git add index.html && git commit -m "feat(pots): 획득 — 상점 구매 + RewardReveal 'pot' 개봉 + 탐사 드롭 + 중복→크레딧"
```

---

## Task 6: 마감 — 전체 회귀 + 문서

**Files:** `index.html`, `docs/CHANGELOG.md`.

- [ ] **Step 1: 전체 셀프테스트** — `window.__catalogSelfTest()` 0 fail(pots 4종 + 기존 nursery/catalog 전부).
- [ ] **Step 2: preview 통합 시나리오** — 새 세이브 + 구 세이브(potId 없는) 둘 다 양육 정상(테라코타 기본), 화분 구매→장착→효과→2레이어 렌더, 콘솔 에러 0.
- [ ] **Step 3: 문서** — `docs/CHANGELOG.md` 맨 위 화분 시스템 로그. (⚠️ `master-roadmap.md` 등록은 **버섯 세션과 충돌 회피 위해 main 머지 시점에** 추가 — 여기선 건드리지 않음, 커밋 메시지에 명시.)
- [ ] **Step 4: 커밋(코드+CHANGELOG)**
```bash
cd "C:/Users/soosa/Documents/풀로세움-2" && git add index.html docs/CHANGELOG.md && git commit -m "feat(pots): 수집 화분 시스템 완료 — 회귀 검증 + CHANGELOG(로드맵 등록은 머지 시)"
```

---

## Self-Review (작성자 점검)
- **Spec 커버리지:** §2 카탈로그→T1 · §3 획득→T5 · §4 장착→T4 · §5 효과→T2 · §6 시각분리→T3·T4 · §7 데이터/마이그레이션→T1 · §8 검증→각 task+T6. 누락 없음.
- **Placeholder:** T5 Step3 상점 렌더 한 줄은 기존 `data-shop-box` 위임 패턴을 명시 참조(실행 시 그 패턴 복제). 그 외 실제 코드.
- **타입 일관성:** `potOf(p)`/`POT_CATALOG[id].{speed,maxFruitDelta,gradeLift,color,icon,name}`/`state.pot_inventory{id:true}`/`p.nursery.potId`/`grantPot→{kind,label,icon,color,payload}` — 전 task 일치. `potVisual(potId,size)`/`composePlantSvg(...,{noPot})` 시그니처 일관.
- **충돌 안전:** `composePlantBody` 미변경, 종/스킬/master-roadmap 미변경. work-2 격리.
