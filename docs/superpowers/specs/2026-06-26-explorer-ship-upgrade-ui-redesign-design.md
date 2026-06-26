# 탐사선 개조실 UI 재설계 — 설계서

- **날짜:** 2026-06-26
- **상태:** 🔵 설계 완료·구현 대기
- **로드맵 연결:** §4.6-1 "탐사선 강화 UI"(미등록 #16 후보) — "묻혀 있는 4스탯을 식물 강화처럼 눈에 보이는 성장 축으로 표면화"의 구체화
- **관련 함수(현행):** `renderShipModRoom`·`renderShipUpgradeCard`·`renderEquippedParts`·`renderOwnedParts`(index.html ~7909), `SHIP_PARTS`/`SHIP_UPGRADES`(~4189), `executeExploration`(~9615), `upgradeShipStat`/`upgradeScanner`/`upgradeSeedStorageCapacity`(~9409·9544·9557)

---

## 1. 목표 한 줄
탐사선 개조실을 **식물 강화창처럼** 바꾼다: 중앙에 탐사선 SVG를 크게 두고, 사방에 강화 박스를 배치하되 각 박스가 **선(콜아웃)으로 탐사선의 해당 부품 위치에 이어지게** 한다. 동시에 라이브 탐사에서 죽어 있는 **부품 시스템·연료 소모재를 걷어내** 강화 축을 4트랙으로 단순화한다.

## 2. 범위 (3덩어리)

### A. UI 개편 — 중앙 탐사선 + 사방 콜아웃 강화 박스
- 개조실 본문을 **강화 스테이지**(`.ship-upgrade-stage`)로 교체. 중앙에 절차적 탐사선 SVG(`shipDiagramSvg()`, 신규), 사방에 4개의 강화 콜아웃 박스.
- 각 박스는 스테이지를 덮는 SVG 오버레이의 `<line>`/`<path>`로 탐사선 부품 앵커 좌표에 연결된다.

### B. 부품 시스템 제거 (죽은 시스템 — 확인됨)
라이브 아틀라스 탐사(`EXPLORE_VIEW`)의 지역은 `required_ship_stats`(저항 게이트)를 **전혀 사용하지 않는다**(저항 요구치는 레거시 `AlienPlantGameData.regions`에만 존재, 라이브 미사용). 따라서 부품과 저항 스탯은 현재 플레이에서 무의미.

### C. 연료 소모재 제거 — 탐사 = 크레딧 전용
현재 `executeExploration`은 `ship.stats.fuel -= fuelCost` + `spendCredits(planetCost)`로 **연료와 크레딧을 둘 다** 소모한다. 소모재 연료를 제거하고 탐사 비용을 **크레딧 단일화**한다.

> ⚠️ **네이밍:** 소모재 `fuel`(연료, 충전식)과 강화 트랙 `fuel_tank`(연료 탱크 = 궤도 해금 레벨)는 별개다. **소모재 연료만 제거**하고 **연료 탱크 트랙은 유지**한다. 소모재가 사라지면 "연료"라는 단어가 연료 탱크 하나만 남아 혼동이 자동 해소된다(연료 탱크 = 탐사 도달 궤도 범위).

## 3. 중앙 콜아웃 = 강화 4트랙

`SHIP_UPGRADES`의 4트랙을 그대로 사방 박스로 표면화한다(신규 강화 경로 없음).

| 박스 | 스탯(`stat`) | 효과 | 탐사선 앵커 위치 |
|---|---|---|---|
| ⛽ 연료 탱크 | `fuel_tank` | 탐사 가능 궤도 1~4 해금 | 후미 추진부 |
| 🛡️ 내구성 | `durability` | 탐사 성공률 | 선체 중앙 |
| 🧺 채집기 | `harvester` | 성공 시 보상 개수 | 측면 채집 암 |
| 🔭 탐사 장치 | `scanner` | 높은 등급 보상 발견 확률 (+ 희귀 종자 탐지 역할 흡수) | 전방 센서 |

각 박스 구성(기존 `renderShipUpgradeCard` 정보 유지): `아이콘 + 이름` / `현재값 → 강화 후 값` / `비용(💰)` / `강화 버튼`(최대 시 비활성·"최대"). 클릭은 기존 `upgradeShipStat(id)` 경로로 통일(아래 5절).

## 4. 레이아웃 / 시각

### 스테이지 배치
- 컨테이너: 기존 `.ship-mod-room` 패널 셸(고정 오버레이·스크롤) 재사용. 헤더 = 개조실 타이틀 + 닫기 + (탐사 상점) 토글 유지.
- 본문 `.ship-upgrade-stage`: `position:relative` 박스. 중앙 탐사선 SVG(약 200×220). 4박스는 **상(탐사 장치)·하(연료 탱크)·좌(내구성)·우(채집기)** 배치.
- **연결선:** 스테이지를 덮는 절대배치 `<svg>` 오버레이(`pointer-events:none`)에 박스 모서리 → 부품 앵커 좌표로 `<line>` 그림. 앵커는 탐사선 SVG의 고정 좌표(추진부/선체/암/센서)와 일치.

### 탐사선 SVG (`shipDiagramSvg()`)
- 절차적 SVG 1개. 식물 SVG처럼 인라인. 4개 부품 앵커 좌표를 상수로 노출해 연결선이 참조.
- 외형은 단순 우주 탐사선(선체 + 후미 추진 + 측면 암 + 전방 센서 디시). 도트 PNG 교체는 #3 후속(`SPRITE_OVERRIDES` 유사 훅은 이번 범위 밖).

### 반응형
- 좁은 폭(모바일 ~375): 탐사선 축소 + 4박스를 상2·하2(코너)로 재배치, 연결선 좌표도 그에 맞춰 계산. CSS로 박스 위치를 폭에 따라 전환하되 연결선 SVG는 렌더 시점 좌표로 다시 그림.
- ⚠️ preview viewport 1px collapse 주의(측정 전 `window.innerWidth` 확인·`preview_resize`).

## 5. 데이터 / 로직 변경

### 제거 대상
- **부품:** `SHIP_PARTS`·`SHIP_PART_SLOTS`·`SHIP_PART_INDEX`·`SHIP_PART_SHOP_INFO`, `renderEquippedParts`·`renderOwnedParts`, 상점의 part 항목(`explorationShopItems`의 part 머지), `data-equip-part`/`data-unequip-part` 핸들러, `shipPartModifiers`·`shipPartInventory`·`hasShipPart` 등 부품 전용 헬퍼, 저항 스탯(`heat/cold/pressure/hydro_pressure_resistance`) 표시·`requirementFailures`의 저항 체크.
- **연료 소모재:** `ship.stats.fuel`·`max_fuel`, 상점 연료셀(`fuel_cell_*`), `explorationFuelCost`·"연료 소모" 표시(`renderRegionBriefPopup`/`renderRegionDetail`), `executeExploration`의 연료 차감, `shipSummaryStats`의 연료 항목.
- **부수 경제:** 강화 키트(`upgrade_material_kit`) + `shipUpgradeFinalCost`의 키트 할인 로직(→ 비용 = 기본가), `upgradeScanner`(희귀탐지 별도 레버 → 탐사 장치 트랙이 역할 흡수), `upgradeSeedStorageCapacity` + 보관함 용량 강화 카드(렌더 ~8342).

### 유지/조정
- **강화 4트랙:** `SHIP_UPGRADES`·`upgradeShipStat`·`shipUpgradeCost`(키트 분기 제거)·`shipUpgradeAtMax`·`shipUpgradeNextText` 유지. 클릭 핸들러는 `upgradeShipStat` **단일 경로로 통일**(현재 `data-ship-upgrade`가 두 군데서 다른 핸들러로 분기 → 신규 박스는 `upgradeShipStat`만 사용).
- **탐사 비용:** `planetCost`(크레딧) 단일. `executeExploration`은 `spendCredits(planetCost)`만 남김.
- **종자 보관함 용량:** 강화 경로 제거 → **고정 18칸**(기존 `MAX_SEED_STORAGE_CAPACITY`). `newExplorerShip`/`normalizeState`에서 `seed_storage_capacity` 기본값을 18로 설정해 가방 크기 보존. (검토 포인트 — §7)
- **탐사 장치 → 보상 등급/희귀 탐지:** `scanner` 스탯이 희귀 발견 가중치 역할을 겸하도록 매핑(`playerEquipmentBonus`/보상 추첨이 `scanner_bonus` 대신 `scanner` 스탯 기반이 되도록 조정). `exploration_equipment_bonus` 상태는 마이그레이션에서 정리.

### 마이그레이션 (`normalizeState`)
- 기존 세이브의 `ship.equipped_parts`·`owned_parts`·`upgrade_levels`(부품 외) 정리, `ship.stats.fuel`·`max_fuel`·저항 스탯·`scanner_bonus`/`rare_seed_bonus`/`item_find_bonus`·`seed_storage_environment_bonus` 제거.
- `seed_storage_capacity` 미설정/구값이면 18로 보정. `exploration_equipment_bonus` 제거.
- 멱등(무회귀): 여러 번 호출해도 동일 결과.

## 6. 테스트
- `window.__catalogSelfTest()` 0 fail 유지(부품/연료 제거 후 종 분포·탐사 키 테스트 영향 없음 확인, 필요 시 케이스 보강).
- preview 실측: 개조실 진입 → 4박스 + 연결선 렌더 확인(`window.innerWidth` 점검 후 `preview_resize`), 강화 버튼 클릭 시 크레딧 차감·값 상승, 탐사 1회 실행 시 **크레딧만** 차감(연료 미차감) 확인.
- 마이그레이션: 부품·연료가 있던 기존 세이브를 불러도 오류 없이 정리되는지(콘솔 `normalizeState` 후 필드 부재 확인).

## 7. 검토 포인트 (구현/밸런스 시 결정)
- **종자 보관함 용량 고정값 18** — 강화 제거로 진행 막힘 방지. 사용자 검토에서 다른 값/유지 여부 조정 가능.
- **탐사 장치 ↔ 희귀 탐지 매핑** — 기존 `scanner_bonus`(0~0.5)와 `scanner` 스탯(10~140)의 스케일이 달라, 보상 추첨이 `scanner`를 읽도록 바꿀 때 희귀 발견율 곡선 재조정 필요(밸런스 1차 후 튜닝).
- **연료 제거에 따른 탐사 페이싱** — 연료가 "탐사 횟수 제한" 역할도 했다면 제거 시 무제한 반복 가능. 크레딧 비용이 충분한 페이싱 레버인지 1차 플레이로 확인.
- **연결선 모바일 좌표** — 폭 전환 시 선 좌표 재계산이 깔끔히 되는지 실측.

## 8. YAGNI (이번 범위 밖)
- 탐사선 도트 PNG 교체(#3 후속), 탐사선 외형 커스터마이즈, 신규 강화 트랙/스탯, 부품을 대체하는 새 장비 시스템, 연료를 대체하는 새 자원.
