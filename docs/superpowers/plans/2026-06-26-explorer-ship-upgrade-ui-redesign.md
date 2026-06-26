# 탐사선 개조실 UI 재설계 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 탐사선 개조실을 식물 강화창처럼 "중앙 탐사선 SVG + 사방 4트랙 콜아웃(부품 위치로 연결선)"으로 바꾸고, 라이브 탐사에서 죽은 부품 시스템·연료 소모재를 제거(크레딧 전용)하며, 두 강화창(식물·탐사선)에 강화 레벨(Lv.1~)을 표시한다.

**Architecture:** 전부 단일 파일 `index.html`(바닐라 JS, 빌드 없음) 수정. 강화 4트랙(`SHIP_UPGRADES`)·강화 함수(`upgradeShipStat`)는 유지하고 표면(`renderShipModRoom`)만 다이어그램으로 교체. 부품/연료/별도강화는 데이터·UI·마이그레이션에서 제거. 연결선은 모달이 보일 때 `getBoundingClientRect()`로 콜아웃·앵커 위치를 측정해 오버레이 SVG `<line>` 좌표를 설정(`drawShipConnectors`).

**Tech Stack:** 바닐라 HTML/CSS/JS. 테스트 러너 없음 → 회귀 검증은 콘솔 셀프테스트 `window.__catalogSelfTest()`(케이스 등록 `window.__test(name, fn)`, 판정은 **반환 fails 배열**) + preview 도구(`preview_eval`로 DOM/함수 확인).

## Global Constraints

- 수정 파일은 `index.html` 단일. 심볼 위치는 줄번호가 아니라 **grep**으로 찾는다(파일이 커서 줄번호 어긋남).
- 공유 파일이므로 커밋 전 `git diff index.html`로 **내 변경만인지** 확인하고 `git add index.html`만 스테이징(`-A` 금지).
- 검증 = `__catalogSelfTest()` **0 fail 유지** + preview 실측. 셀프테스트 케이스의 `fn`은 실패 시 반드시 `throw`(`if(fails.length) throw new Error(...)`), `return` 금지.
- preview viewport가 1px로 collapse될 수 있음 → 좌표/레이아웃 측정 전 `window.innerWidth` 확인, 1이면 `preview_resize`(preset:'mobile'). 모달은 메인 진입(`#btnStart` 클릭) 후 열어야 폭 정상.
- preview는 정적 서버(HMR 없음) → 코드 수정 후 `location.reload()`로 재독, 안 풀리면 `preview_stop`+`preview_start`.
- 마이그레이션(`normalizeState`)은 **멱등**(여러 번 호출해도 동일 결과)·무회귀.

---

### Task 1: 부품 시스템 제거 (데이터·헬퍼·UI·상점·저항게이트)

**근거:** 라이브 아틀라스 탐사(`EXPLORE_VIEW`)의 지역은 `required_ship_stats`(저항)를 전혀 쓰지 않음 → 부품·저항은 죽은 시스템.

**Files:**
- Modify: `index.html` (부품 정의·헬퍼·렌더·상점·마이그레이션)

**Interfaces:**
- Produces: 없음(순수 제거). `renderShipModRoom`은 부품 섹션 없이 유효한 상태로 남김(Task 3에서 전면 교체).
- Consumes: 없음.

- [ ] **Step 1: 제거 셀프테스트 작성** — 부품 전역이 사라졌는지 검증. `index.html` 끝 셀프테스트 블록(`window.__test('sig: ...')` 근처)에 추가:

```javascript
window.__test('ship: 부품 시스템 제거됨', function(){
  const fails=[];
  if(typeof SHIP_PARTS !== 'undefined') fails.push('SHIP_PARTS 잔존');
  if(typeof SHIP_PART_INDEX !== 'undefined') fails.push('SHIP_PART_INDEX 잔존');
  // 마이그레이션 후 부품 필드 부재
  const s = JSON.parse(JSON.stringify(state));
  s.exploration_ship = { stats:{ fuel_tank:1, durability:60, harvester:10, scanner:10 }, equipped_parts:{slot_x:'part_old'}, owned_parts:['part_old'] };
  normalizeState(s);
  if(s.exploration_ship.equipped_parts && Object.keys(s.exploration_ship.equipped_parts).length) fails.push('equipped_parts 미정리');
  if(s.exploration_ship.owned_parts && s.exploration_ship.owned_parts.length) fails.push('owned_parts 미정리');
  if(fails.length) throw new Error(fails.join(' | '));
});
```

- [ ] **Step 2: 실패 확인** — preview에서 `location.reload()` 후 `__catalogSelfTest()` 반환 fails에 `'ship: 부품 시스템 제거됨'`이 포함되는지 확인(아직 SHIP_PARTS 존재 → 실패).

Run(preview_eval): `(function(){return __catalogSelfTest().filter(f=>f.indexOf('부품 시스템')>=0)})()`
Expected: `["ship: 부품 시스템 제거됨 → SHIP_PARTS 잔존"]`

- [ ] **Step 3: 부품 데이터·헬퍼 삭제** — grep으로 위치 찾아 제거:
  - `SHIP_PART_SLOTS`, `SHIP_PARTS`, `SHIP_PART_INDEX`, `SHIP_PART_SHOP_INFO` 상수 블록 삭제(`grep -n "const SHIP_PART"`).
  - 부품 전용 헬퍼 삭제: `shipPartModifiers`, `shipPartInventory`, `hasShipPart`, `renderEquippedParts`, `renderOwnedParts`, `partModifierText`(부품 전용이면). (`grep -n "function shipPart\|function renderEquippedParts\|function renderOwnedParts\|function hasShipPart\|function partModifierText"`)
  - `shipStat`(`grep -n "function shipStat"`)가 `shipPartModifiers`를 참조하면 그 가산 항을 제거하고 **base 스탯만 반환**하도록 단순화:

```javascript
function shipStat(ship, key){
  return shipBaseStat(ship, key);
}
```

- [ ] **Step 4: 저항 게이트 제거** — `requirementFailures`(`grep -n "function requirementFailures"`)에서 저항 체크(heat/cold/pressure/hydro_pressure_resistance) 행을 삭제하고 fuel·durability만 남김:

```javascript
function requirementFailures(requirements = {}, ship = state.exploration_ship || newExplorerShip()){
  const checks = [
    ['fuel', '연료가 부족합니다.'],
    ['durability', '탐사선 내구성이 부족합니다.'],
  ];
  return checks
    .filter(([key]) => typeof requirements[key] === 'number' && shipStat(ship, key) < requirements[key])
    .map(([,message]) => message);
}
```
(주: `fuel` 체크는 Task 2에서 추가 정리. 여기선 저항만 제거.)

- [ ] **Step 5: 상점에서 부품 제거** — `explorationShopItems`(`grep -n "function explorationShopItems"`)에서 `SHIP_PARTS.map(...)` 부분과 `...partItems` 머지를 삭제, `EXPLORATION_SHOP_ITEMS`만 반환:

```javascript
function explorationShopItems(){
  return [...EXPLORATION_SHOP_ITEMS];
}
```
- `EXPLORATION_SHOP_CATEGORIES`에서 `ship_parts`/`storage`/`environment` 카테고리가 부품 전용이면 제거(연료/장비/지원만 남김). `explorationShopBuyState`·`explorationShopOwnedCount`의 `item.type==='part'` 분기 삭제.

- [ ] **Step 6: `renderShipModRoom` 부품 섹션 제거(잠정)** — `grep -n "function renderShipModRoom"`. "장착 중인 부품"·"보유한 부품" `<section>` 둘을 삭제(스탯 요약 + 스탯 강화 그리드만 남김). Task 3에서 전면 교체되므로 잠정 유효 상태만 유지.

- [ ] **Step 7: 마이그레이션 정리** — `normalizeState`(`grep -n "function normalizeState"`)에 부품 필드 정리 추가(멱등):

```javascript
// 부품 시스템 폐지 — 잔존 필드 제거
if(state.exploration_ship){
  delete state.exploration_ship.equipped_parts;
  delete state.exploration_ship.owned_parts;
  const st = state.exploration_ship.stats || {};
  ['heat_resistance','cold_resistance','pressure_resistance','water_pressure_resistance','hydro_pressure_resistance','weapon_power','weapon_performance','seed_storage_environment','seed_storage_environment_grade','seed_storage_environment_bonus','rare_seed_bonus','scanner_bonus','item_find_bonus','item_detection_bonus'].forEach(k=>delete st[k]);
}
```
(인자 `state`가 매개변수명이면 그에 맞춤 — 위 테스트는 `s` 전달하므로 함수가 받는 인자명을 사용.)

- [ ] **Step 8: `newExplorerShip` 정리** — `grep -n "function newExplorerShip"`. `equipped_parts:{}`, `owned_parts:[]` 제거(stats는 fuel_tank/durability/harvester/scanner 유지).

- [ ] **Step 9: 통과 확인 + 탐사 회귀** — preview reload 후:

Run(preview_eval): `__catalogSelfTest().length`  → Expected: `0`
Run(preview_eval): 메인 진입 후 탐사 화면 열어 개조실 진입 → 부품 섹션 없음·스탯강화 4카드 렌더 확인:
`(function(){document.querySelector('#btnStart')&&document.querySelector('#btnStart').click(); openExploration&&openExploration(); return typeof SHIP_PARTS;})()` → Expected: `"undefined"`

- [ ] **Step 10: 커밋**

```bash
git add index.html
git commit -m "$(printf 'refactor(ship): \xeb\xb6\x80\xed\x92\x88 \xec\x8b\x9c\xec\x8a\xa4\xed\x85\x9c \xec\xa0\x9c\xea\xb1\xb0(\xeb\x9d\xbc\xec\x9d\xb4\xeb\xb8\x8c \xed\x83\x90\xec\x82\xac \xeb\xaf\xb8\xec\x82\xac\xec\x9a\xa9 \xed\x99\x95\xec\x9d\xb8)\n\nSHIP_PARTS/\xeb\xb6\x80\xed\x92\x88 \xed\x97\xac\xed\x8d\xbc/\xec\x9e\xa5\xec\xb0\xa9UI/\xec\x83\x81\xec\xa0\x90 \xeb\xb6\x80\xed\x92\x88/\xec\xa0\x80\xed\x95\xad \xea\xb2\x8c\xec\x9d\xb4\xed\x8a\xb8 \xec\xa0\x9c\xea\xb1\xb0 + normalizeState \xeb\xa7\x88\xec\x9d\xb4\xea\xb7\xb8\xeb\xa0\x88\xec\x9d\xb4\xec\x85\x98. self-test 0 fail.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```
(또는 PowerShell here-string으로 한글 메시지 커밋.)

---

### Task 2: 연료 소모재 제거 (크레딧 전용 탐사) + 보관함 고정 + 별도강화 UI 제거

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: Task 1의 `shipStat`(base만), `requirementFailures`(저항 제거됨).
- Produces: 탐사 비용 = `planetCost`(크레딧)만. 종자 보관함 용량 = 고정 18.

- [ ] **Step 1: 셀프테스트 작성** — 탐사 실행이 연료를 차감하지 않고 크레딧만 쓰는지 + 보관함 18 검증:

```javascript
window.__test('explore: 연료 미사용·크레딧 전용·보관함 18', function(){
  const fails=[];
  if(typeof explorationFuelCost !== 'undefined') fails.push('explorationFuelCost 잔존');
  const s = JSON.parse(JSON.stringify(state));
  s.exploration_ship = { stats:{ fuel_tank:1, durability:60, harvester:10, scanner:10, fuel:5, max_fuel:6 } };
  normalizeState(s);
  const st = s.exploration_ship.stats;
  if('fuel' in st || 'max_fuel' in st) fails.push('fuel/max_fuel 미정리');
  if(st.seed_storage_capacity !== 18) fails.push('보관함 18 아님: '+st.seed_storage_capacity);
  if(fails.length) throw new Error(fails.join(' | '));
});
```

- [ ] **Step 2: 실패 확인** — reload 후 `__catalogSelfTest()` fails에 위 케이스 포함 확인.

- [ ] **Step 3: `executeExploration` 연료 차감 제거** — `grep -n "function executeExploration"`. `const fuelCost = explorationFuelCost(...)`와 `ship.stats.fuel = Math.max(0, ... - fuelCost)` 줄 삭제. `spendCredits(planetCost(planet))`는 유지. `lastExplorationResult`의 `fuelCost`/`remainingFuel` 필드 제거.

- [ ] **Step 4: 연료 함수·표시 제거**
  - `explorationFuelCost` 함수 삭제(`grep -n "function explorationFuelCost"`).
  - `renderRegionBriefPopup`/`renderRegionDetail`에서 "연료 소모" 셀 삭제(`grep -n "연료 소모"`). `renderRegionBriefPopup`의 `const fuelCost = ...` 제거.
  - `shipSummaryStats`(`grep -n "function shipSummaryStats"`)에서 연료/최대연료 항목 제거(4트랙만).
  - `renderExplorationResult`(`grep -n "function renderExplorationResult"`)에서 연료 표시 제거.

- [ ] **Step 5: 연료 상점 제거** — `EXPLORATION_SHOP_ITEMS`(`grep -n "EXPLORATION_SHOP_ITEMS ="`)에서 `fuel_cell_small`·`fuel_cell_bundle` 항목 삭제. `explorationShopBuyState`·`explorationShopOwnedCount`의 `item.type==='fuel'` 분기 제거. `EXPLORATION_SHOP_CATEGORIES`에서 `fuel` 카테고리 제거. 연료 충전(`item.type==='fuel'`) 구매 처리 코드도 삭제(`grep -n "type === 'fuel'\|type==='fuel'"`).

- [ ] **Step 6: 별도 강화 UI 제거** — `upgradeScanner`·`upgradeSeedStorageCapacity` 함수 및 그 호출/버튼 삭제(`grep -n "upgradeScanner\|upgradeSeedStorageCapacity"`). 탐사 화면의 보관함 용량 강화 카드(`grep -n "canUpgradeCapacity\|capacityCost"`)와 스캐너 강화 카드 마크업·핸들러 삭제. `scannerUpgradeCost`/`storageCapacityUpgradeCost`도 미사용이면 삭제.

- [ ] **Step 7: 보관함 용량 고정 18** — `newExplorerShip`의 `stats`에 `seed_storage_capacity:18` 추가. `normalizeState`에 추가(멱등):

```javascript
if(state.exploration_ship){
  const st = state.exploration_ship.stats || (state.exploration_ship.stats={});
  delete st.fuel; delete st.max_fuel;
  st.seed_storage_capacity = 18;
  delete st.cargo_slots;
}
```
- `seedBagCapacity`(`grep -n "function seedBagCapacity"`)는 `shipStat(ship,'seed_storage_capacity')`를 읽으므로 그대로 18 반환. `exploration_equipment_bonus`는 `normalizeState`에서 `delete state.exploration_equipment_bonus`로 정리(있다면). `playerEquipmentBonus`가 이를 참조하면 0 폴백 유지되도록 둠(보상 로직 무변경).

- [ ] **Step 8: 통과 + 탐사 회귀 확인** — preview reload 후:

Run(preview_eval): `__catalogSelfTest().length` → Expected: `0`
Run(preview_eval): 탐사 1회 실행 시 크레딧만 차감·연료 필드 없음:
`(function(){var sh=state.exploration_ship.stats; return {hasFuel:'fuel' in sh, cap:sh.seed_storage_capacity};})()` → Expected: `{hasFuel:false, cap:18}`

- [ ] **Step 9: 커밋** (`git add index.html`; 메시지: `refactor(ship): 연료 소모재 제거 — 탐사 크레딧 전용 + 보관함 18 고정 + 별도강화 UI 제거`)

---

### Task 3: 탐사선 다이어그램 SVG + 사방 4콜아웃 강화 UI (연결선)

**Files:**
- Modify: `index.html` (`renderShipModRoom` 교체, 신규 `shipDiagramSvg`/`renderShipCallout`/`drawShipConnectors`, CSS 추가)

**Interfaces:**
- Consumes: `SHIP_UPGRADES`(4트랙), `upgradeShipStat(id)`, `shipUpgradeCost`/`shipUpgradeAtMax`/`shipUpgradeCurrentText`/`shipUpgradeNextText`.
- Produces: `renderShipModRoom(ship)`(다이어그램), 앵커 좌표 상수 `SHIP_ANCHORS`, `drawShipConnectors()`.

- [ ] **Step 1: 앵커 좌표 + 탐사선 SVG 함수 추가** — `renderShipModRoom` 위에 추가. 앵커는 SVG viewBox(0~100) 기준 좌표:

```javascript
// 탐사선 부품 앵커(viewBox 100×100 기준) — 콜아웃 연결선이 가리킬 지점
const SHIP_ANCHORS = {
  scanner:    { x:50, y:18 },  // 전방 센서(상)
  fuel_tank:  { x:50, y:86 },  // 후미 추진(하)
  durability: { x:50, y:52 },  // 선체 중앙(좌측 콜아웃)
  harvester:  { x:74, y:60 },  // 측면 채집 암(우측 콜아웃)
};
function shipDiagramSvg(){
  return `<svg class="ship-diagram-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="shipHull" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a4a57"/><stop offset="1" stop-color="#14242c"/></linearGradient></defs>
    <ellipse cx="50" cy="60" rx="9" ry="26" fill="url(#shipHull)" stroke="#3fe0c4" stroke-width="1"/>
    <circle cx="50" cy="22" r="7" fill="#0d1b22" stroke="#7fd6f0" stroke-width="1.4"/>
    <circle cx="50" cy="22" r="3" fill="#7fd6f0" opacity=".8"/>
    <path d="M44 80 L40 92 L50 86 L60 92 L56 80 Z" fill="#ff8a4a" stroke="#3fe0c4" stroke-width=".8"/>
    <path d="M41 52 L20 56 L20 64 L43 62 Z" fill="#1b3540" stroke="#3fe0c4" stroke-width=".8"/>
    <path d="M59 55 L82 58 L82 66 L60 66 Z" fill="#1b3540" stroke="#3fe0c4" stroke-width=".8"/>
  </svg>`;
}
```

- [ ] **Step 2: 콜아웃 카드 렌더 함수 추가** — 강화 박스(레벨 표시는 Task 4에서 추가):

```javascript
function renderShipCallout(ship, upgrade, side){
  const atMax = shipUpgradeAtMax(ship, upgrade);
  const cost = shipUpgradeCost(upgrade);
  const canBuy = !atMax && state.credits >= cost;
  return `<div class="ship-callout ship-callout-${side}" data-anchor="${upgrade.id}">
    <div class="sc-head">${upgrade.icon} ${upgrade.label}</div>
    <div class="sc-cmp">현재 <b>${shipUpgradeCurrentText(ship, upgrade)}</b> → <b>${atMax ? shipUpgradeCurrentText(ship, upgrade) : shipUpgradeNextText(ship, upgrade)}</b></div>
    <button class="upbtn sc-btn" data-ship-upgrade="${upgrade.id}" ${canBuy ? '' : 'disabled'}>${atMax ? '최대' : fmt(cost)+'💰 강화'}</button>
  </div>`;
}
```

- [ ] **Step 3: `renderShipModRoom` 다이어그램으로 교체** — 4트랙을 상(scanner)·하(fuel_tank)·좌(durability)·우(harvester)로 배치:

```javascript
function renderShipModRoom(ship){
  const byId = id => SHIP_UPGRADE_INDEX[id];
  return `<div class="ship-mod-room">
    <div class="ship-mod-head">
      <button class="btn ship-mod-back" id="btnShipRoomShop">🛒 탐사 상점</button>
      <div class="ship-mod-title"><h3>🛰️ 탐사선 개조실</h3></div>
      <button class="btn ship-mod-back" id="btnShipRoomBack">닫기</button>
    </div>
    <div class="ship-stage" id="shipStage">
      <svg class="ship-connectors" id="shipConnectors" aria-hidden="true"></svg>
      ${renderShipCallout(ship, byId('scanner'), 'top')}
      <div class="ship-stage-mid">
        ${renderShipCallout(ship, byId('durability'), 'left')}
        <div class="ship-craft" id="shipCraft">${shipDiagramSvg()}</div>
        ${renderShipCallout(ship, byId('harvester'), 'right')}
      </div>
      ${renderShipCallout(ship, byId('fuel_tank'), 'bottom')}
    </div>
  </div>`;
}
```

- [ ] **Step 4: 연결선 그리기 함수 추가** — 모달이 보일 때 콜아웃·앵커 실측 좌표로 `<line>` 생성:

```javascript
function drawShipConnectors(){
  const stage = document.getElementById('shipStage');
  const svg = document.getElementById('shipConnectors');
  const craft = document.getElementById('shipCraft');
  if(!stage || !svg || !craft) return;
  const sr = stage.getBoundingClientRect();
  if(sr.width < 2) return; // collapse 가드
  const cr = craft.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
  svg.innerHTML = '';
  stage.querySelectorAll('.ship-callout').forEach(box => {
    const id = box.dataset.anchor; const a = SHIP_ANCHORS[id]; if(!a) return;
    const ax = cr.left - sr.left + cr.width * (a.x/100);
    const ay = cr.top - sr.top + cr.height * (a.y/100);
    const br = box.getBoundingClientRect();
    const bx = br.left - sr.left + br.width/2;
    const by = br.top - sr.top + br.height/2;
    const ln = document.createElementNS('http://www.w3.org/2000/svg','line');
    ln.setAttribute('x1', bx); ln.setAttribute('y1', by);
    ln.setAttribute('x2', ax); ln.setAttribute('y2', ay);
    ln.setAttribute('class','ship-conn-line');
    svg.appendChild(ln);
    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx', ax); dot.setAttribute('cy', ay); dot.setAttribute('r', 3);
    dot.setAttribute('class','ship-conn-dot'); svg.appendChild(dot);
  });
}
```

- [ ] **Step 5: 연결선 호출 연결** — 개조실이 렌더/표시될 때 `drawShipConnectors()` 호출. `renderExploration`에서 `explorationPanelMode==='ship'` 렌더 직후(`grep -n "explorationPanelMode === 'ship'"`) `requestAnimationFrame(drawShipConnectors)` 추가. 리사이즈 대응: `window.addEventListener('resize', () => { if(document.getElementById('shipStage')) drawShipConnectors(); })`를 1회 등록(중복 등록 가드 `if(!window.__shipConnBound)`).

- [ ] **Step 6: CSS 추가** — `#dexModal` CSS 근처 또는 ship-mod-room CSS 블록(`grep -n "ship-mod-room"`)에 추가:

```css
.ship-stage{position:relative;padding:10px 6px 14px;}
.ship-connectors{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;}
.ship-conn-line{stroke:rgba(63,224,196,.5);stroke-width:1.5;stroke-dasharray:3 3;}
.ship-conn-dot{fill:#3fe0c4;}
.ship-stage-mid{display:flex;align-items:center;justify-content:center;gap:8px;position:relative;z-index:2;}
.ship-craft{flex:0 0 120px;width:120px;}
.ship-diagram-svg{width:100%;height:auto;display:block;filter:drop-shadow(0 6px 18px rgba(0,0,0,.5));}
.ship-callout{position:relative;z-index:2;background:rgba(9,16,29,.92);border:1px solid rgba(63,224,196,.3);border-radius:10px;padding:8px 10px;min-width:120px;max-width:150px;}
.ship-callout-top{margin:0 auto 6px;} .ship-callout-bottom{margin:6px auto 0;}
.sc-head{font-size:12px;font-weight:700;color:#cfeee6;white-space:nowrap;}
.sc-cmp{font-size:11px;color:var(--sub);margin:3px 0 6px;} .sc-cmp b{color:#fff;}
.sc-btn{width:100%;font-size:11px;padding:5px 6px;}
@media(max-width:560px){ .ship-callout{min-width:96px;max-width:120px;padding:6px 7px;} .ship-craft{flex-basis:88px;width:88px;} }
```

- [ ] **Step 7: 강화 버튼 핸들러 통일 확인** — 신규 콜아웃의 `data-ship-upgrade`가 `upgradeShipStat`로 연결되는지 확인. `renderExploration`의 바인딩(`grep -n "data-ship-upgrade"`)이 `upgradeShipStat(btn.dataset.shipUpgrade)`를 호출하는지 확인하고, 다른 경로(`shipUpgradeCost` 직접 차감 핸들러 8479/8737)가 신규 마크업에도 걸리면 **`upgradeShipStat` 단일 경로만** 남도록 정리. 강화 후 `drawShipConnectors()` 재호출(재렌더되므로 Step 5 경로로 자동).

- [ ] **Step 8: preview 검증** — 메인 진입 후 개조실 진입:

Run(preview_eval): `(function(){document.querySelector('#btnStart')&&document.querySelector('#btnStart').click(); openExploration&&openExploration(); explorationPanelMode='ship'; renderExploration(); return new Promise(r=>setTimeout(()=>{drawShipConnectors(); var st=document.getElementById('shipStage'); var lines=document.querySelectorAll('#shipConnectors line'); r({callouts:document.querySelectorAll('.ship-callout').length, lines:lines.length, stageW:st?st.getBoundingClientRect().width:0});},300));})()`
Expected: `{callouts:4, lines:4, stageW:>0}` (stageW 0이면 `preview_resize` 후 재측정)

Run(preview_eval): 강화 버튼 클릭 → 크레딧 차감·값 상승 확인:
`(function(){var b=document.querySelector('.ship-callout[data-anchor="durability"] .sc-btn'); var c0=state.credits; b&&b.click(); return {spent: c0-state.credits, dur: shipStat(state.exploration_ship,'durability')};})()`
Expected: `spent>0`, durability 상승.

- [ ] **Step 9: 셀프테스트 0 fail 확인** → `__catalogSelfTest().length` === 0.

- [ ] **Step 10: 커밋** (`git add index.html`; 메시지: `feat(ship): 개조실 UI 재설계 — 중앙 탐사선 SVG + 사방 4트랙 콜아웃 + 부품 위치 연결선`)

---

### Task 4: 강화 레벨(Lv.N) 표시 — 탐사선 콜아웃 + 식물 강화 카드

**Files:**
- Modify: `index.html` (`renderShipCallout`, `upStatCard`)

**Interfaces:**
- Consumes: `ship.upgrade_levels[id]`(탐사선, 0부터), `p.up[k]`(식물, 0부터).
- Produces: 표시 레벨 = 횟수 + 1(시작 Lv.1).

- [ ] **Step 1: 셀프테스트 작성** — 레벨 표시 헬퍼 검증. 공통 헬퍼 추가 후 테스트:

```javascript
window.__test('upgrade: 레벨 표시 = 횟수+1(시작 Lv.1)', function(){
  __eq(upgradeLevelText(0), 'Lv.1', '0회 → Lv.1');
  __eq(upgradeLevelText(4), 'Lv.5', '4회 → Lv.5');
});
```

- [ ] **Step 2: 실패 확인** — reload 후 fails에 해당 케이스 포함(헬퍼 미정의).

- [ ] **Step 3: 헬퍼 추가** — `renderShipCallout` 근처에:

```javascript
function upgradeLevelText(count){ return 'Lv.' + ((count||0) + 1); }
```

- [ ] **Step 4: 탐사선 콜아웃에 레벨 배지** — `renderShipCallout`의 `sc-head`에 레벨 추가:

```javascript
const lv = (ship.upgrade_levels && ship.upgrade_levels[upgrade.id]) || 0;
// ...sc-head 라인을 교체:
`<div class="sc-head">${upgrade.icon} ${upgrade.label} <span class="sc-lv">${upgradeLevelText(lv)}</span></div>`
```

- [ ] **Step 5: 식물 강화 카드에 레벨 배지** — `upStatCard`(`grep -n "function upStatCard"`)의 `ust-name`에 레벨 추가:

```javascript
function upStatCard(p, s, d){
  const lv = p.up[d.k] || 0, cost = upCost(lv), dis = state.credits < cost;
  return `<button class="up-stat" data-up="${d.k}" ${dis?'disabled':''}>
    <div class="ust-name">${d.name} <span class="ust-lv">${upgradeLevelText(lv)}</span></div>
    <div class="ust-mid">
      <span class="ust-val">${upStatVal(s, d.k)}</span>
      <span class="ust-buy">💰${fmt(cost)}<small>강화</small></span>
    </div></button>`;
}
```

- [ ] **Step 6: 레벨 배지 CSS** — 강화 CSS 근처:

```css
.sc-lv,.ust-lv{font-size:10px;font-weight:700;color:#3fe0c4;background:rgba(63,224,196,.12);border:1px solid rgba(63,224,196,.3);border-radius:6px;padding:0 5px;margin-left:4px;}
```

- [ ] **Step 7: preview 검증** — 식물 강화창 + 탐사선 개조실 둘 다 Lv 표시·강화 시 상승:

Run(preview_eval) 식물: 강화창 열고 한 스탯 강화 전후 Lv 확인:
`(function(){var p=activePlant(); if(!p){claimStarterSeed&&claimStarterSeed(true);} openUpgrade&&openUpgrade(); var card=document.querySelector('.up-stat .ust-lv'); var before=card&&card.textContent; document.querySelector('.up-stat[data-up="hp"]').click(); openUpgrade(); var after=document.querySelector('.up-stat[data-up="hp"] .ust-lv').textContent; return {before, after};})()`
Expected: `before:"Lv.1"`, `after:"Lv.2"`(hp 카드).

Run(preview_eval) 탐사선: 개조실 콜아웃 Lv 표시 확인:
`document.querySelector('.ship-callout .sc-lv') && document.querySelector('.ship-callout .sc-lv').textContent` → Expected: `"Lv.1"`(미강화 시)

- [ ] **Step 8: 셀프테스트 0 fail** → `__catalogSelfTest().length` === 0.

- [ ] **Step 9: 커밋** (`git add index.html`; 메시지: `feat(upgrade): 식물·탐사선 강화창 강화 레벨(Lv.1~) 표시`)

---

### Task 5: 로드맵·CHANGELOG 갱신 + 푸시

**Files:**
- Modify: `docs/master-roadmap.md`, `docs/CHANGELOG.md`

- [ ] **Step 1: 로드맵 갱신** — §1 표의 #16(또는 신규 행) "탐사선 강화 UI"를 🔲→✅로, §4.6-1 "탐사선 강화 UI" 항목을 구현 완료로 표기하고 스펙/플랜 링크 추가.
- [ ] **Step 2: CHANGELOG 항목 추가**(맨 위) — 부품/연료 제거 + 다이어그램 UI + 레벨 표시 요약, 검증 결과(self-test 0 fail·preview 실측) 기록.
- [ ] **Step 3: 커밋 + 푸시** — `git add docs/master-roadmap.md docs/CHANGELOG.md` 커밋 후 `git push origin HEAD`(feat/explore-orbits; 거부 시 `git fetch`+`git rebase origin/feat/explore-orbits`).

---

## Self-Review

**Spec coverage:**
- A. UI 개편(중앙 SVG+4콜아웃+연결선) → Task 3 ✓
- B. 부품 제거 → Task 1 ✓
- C. 연료 제거(크레딧 전용) → Task 2 ✓
- §3.5 레벨 표시(식물+탐사선) → Task 4 ✓
- 보관함 18 고정 → Task 2 Step 7 ✓
- 희귀탐지=탐사장치 흡수 → `scanner` 스탯이 이미 보상 등급 구동(엔진 무변경, Task 2에서 별도 스캐너 강화만 제거) ✓
- 마이그레이션(부품/연료/보관함) → Task 1 Step 7 + Task 2 Step 7 ✓
- 연료탱크 트랙명 유지 → `SHIP_UPGRADES` label 'connector 연료 탱크' 무변경 ✓

**Placeholder scan:** 코드 단계는 실제 코드 포함. 삭제 단계는 grep 심볼 + 제거 대상 명시(거대 단일파일 특성상 삭제는 심볼 기준이 actionable). ✓

**Type consistency:** `upgradeLevelText(count)` Task 4에서 정의·식물/탐사선 양쪽 사용 일치. `drawShipConnectors`/`SHIP_ANCHORS`/`renderShipCallout` Task 3 정의·Task 4 확장 일치. `shipStat`(base만) Task 1 정의 후 Task 2/3에서 사용 일치. ✓

**알려진 검토 포인트(구현 중 결정):** 연결선 모바일 좌표(폭 collapse 가드 있음), 별도 스캐너 강화 제거 후 `playerEquipmentBonus` 0 폴백(보상 로직 무변경이라 안전), 탐사 무제한 반복(크레딧 비용이 페이싱) — 1차 플레이로 확인.
