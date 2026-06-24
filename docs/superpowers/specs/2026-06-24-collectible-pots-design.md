# 수집 화분(Collectible Pots) 시스템 설계 — #2 양육 보완 / #12·#3 진입점

- **작성:** 2026-06-24
- **상태:** ✅ 설계 확정 → 구현 계획으로
- **상위:** [master-roadmap §4-2 (#2 양육)](../../master-roadmap.md) · #12(식물/화분 분리)·#3(도트) 연동
- **배경:** #2 양육 구현 후 감사에서 **`potQuality`(화분 품질) 레버가 죽어 있음**(항상 1, 올릴 방법 없음)을 발견. 이를 살리되, 단순 레벨업이 아니라 게임의 수집·뽑기 정체성에 맞는 **수집 화분**으로 설계. 동시에 사용자 요청에 따라 **식물/화분 시각 분리**를 이 작업에서 시작한다.
- **작업 격리:** 병렬 버섯 세션과 충돌 0을 위해 **`풀로세움-2`(work-2 브랜치)** 에서 구현. 양육 영역 + 신규 함수만 건드리고, 버섯 세션이 만지는 `composePlantBody`/종·스킬 영역은 안 건드린다.

---

## 1. 목표
- 죽어있던 화분 품질 레버를 **수집 화분**으로 부활 → 충전 속도·최대 열매·등급 확률에 실제 영향.
- 화분을 **수집/장착 아이템**으로(종자·변이카드와 동일 결) — 상점·보급상자·열매·탐사 보상으로 획득, 기존 RewardReveal로 개봉.
- **식물/화분 시각 분리**(#12·#3)를 양육 화면에서 시작 — 화분은 독립 레이어로 렌더.

## 2. 화분 카탈로그 (5종)
등급색 = 열매·스킬과 동일(흰<초록<파랑<보라<주황).

| id | 이름 | 등급 | 충전속도 | 최대열매Δ | 등급확률 | 비고 |
|---|---|---|---|---|---|---|
| `pot_terra` | 🪵 테라코타 | white | +0% | +0 | +0 | 기본 지급(시작 화분) |
| `pot_ceramic` | 🏺 도자기 | green | +15% | +0 | +0 | 속도형 |
| `pot_glass` | 🫙 유리 화분 | blue | +10% | +1 | +0 | 용량형 |
| `pot_crystal` | 💎 크리스탈 | purple | +30% | +1 | 소폭↑ | 속도+등급 |
| `pot_gold` | 👑 황금 화분 | orange | +40% | +2 | ↑ | 최상급 종합 |

- **데이터:** `POT_CATALOG = { id: { name, icon, rarity, speed, maxFruitDelta, gradeLift, color } }`.
- 수치는 시드값(밸런스 추후). `gradeLift`는 `rollFruitRarity`의 `lift`에 가산.

## 3. 획득 (기존 시스템 재활용)
- **테라코타:** 새 게임/마이그레이션 시 1개 기본 지급.
- **도자기·유리:** 상점 크레딧 구매(신규 상점 항목 `data-buy-pot`).
- **크리스탈·황금:** 보급상자·열매 수확·탐사 성공 보상 풀에 추가 → **전부 `openRewardReveal`로 개봉**(연출 추가 0). 보상 객체 `{ kind:'pot', label, icon, color, payload:{potId} }`.
- **중복 획득(이미 보유):** 화분은 영구 해금이라 더 가질 필요 없음 → **소량 크레딧 환급**(스킬 중복→크레딧 패턴 재활용, 예: 150💰).

## 4. 장착 (영구 해금 모델)
- **데이터:** `p.nursery.potId`(장착 화분, 기본 `pot_terra`), `state.pot_inventory = { potId: true, ... }`(보유 해금 집합).
- **UI:** 화분 상세창(`openNurseryDetail`)에 `🪴 화분 바꾸기` 버튼 → 보유 화분 목록 시트(아이콘·이름·효과, 미보유는 잠김 표시) → 선택 시 `potId` 변경.
- **장착 규칙:** 화분은 **소비되지 않는 영구 해금**. 한 번 얻으면(`pot_inventory[id]=true`) **모든 식물에 자유롭게 장착·교체** 가능(차감 없음). 식물 방생해도 화분 보유는 그대로(카탈로그 참조이므로 회수 로직 불필요). → 소모/회수/수량 로직 전부 없음(YAGNI, 저버그).

## 5. 효과 반영
- `potOf(p)` → 장착 화분 정의 반환(없으면 테라코타).
- `nurseryTick` 충전식: `potQuality` 자리에 `1 + pot.speed` 사용.
- `nurseryMaxFruits(p)` = `FRUIT_MAX_BY_STAGE[stage] + pot.maxFruitDelta` (성장체 미만은 여전히 0).
- `rollFruitRarity` `lift`에 `pot.gradeLift` 가산.
- 기존 `potQuality` 필드는 화분 기반으로 대체(마이그레이션 시 제거 또는 무시).

## 6. ⭐ 식물/화분 시각 분리 (#12·#3 진입점)
현재 `composePlantSvg`는 식물 본체(`composePlantBody`) + 화분(테두리 rect + 몸통 path + 하이라이트 rect, 마지막 3요소)을 **한 SVG**로 그린다. 이를 분리한다(버섯 세션이 만지는 `composePlantBody`는 **안 건드림**):

- **`composePlantSvg(..., {noPot:true})`** — opts에 `noPot` 추가. true면 화분 3요소를 **건너뛰고 식물만** 그림. (composePlantSvg 내 화분 블록에만 `if(!opts.noPot)` 한 줄 — 국소 변경, 저충돌)
- **`potVisual(potId, size)`** — 신규 함수. 화분 종류별 **절차적 SVG 화분**(종류별 색·형태). `POT_SPRITE_OVERRIDES[potId]` 있으면 PNG로 교체(#3 도트화 훅, `SPRITE_OVERRIDES` 패턴 미러).
- **양육 칸 렌더(`renderNurseryGrid`/`openNurseryDetail`):** 두 레이어 합성 —
  - 아래: `potVisual(potId)` (화분)
  - 위: `composePlantSvg(..., {noPot:true})` (식물, 화분 입구 앵커 위치)
  - idle 흔들림(`pot-sprite` sway)은 **식물 레이어에만** 적용.
- **범위:** 이 분리는 **양육 화면에 한정**(전투·메인 등 다른 곳은 기존 통합 스프라이트 유지). 전체 적용은 #12 후속. 단 `potVisual`+`noPot`+`POT_SPRITE_OVERRIDES` 구조가 #12·#3의 토대가 된다.

## 7. 데이터 모델 / 마이그레이션
- `POT_CATALOG`(상수), `POT_SPRITE_OVERRIDES = {}`(빈 훅).
- `defaultState`: `pot_inventory:{ pot_terra:true }`.
- `normalizeState`: `pot_inventory` 객체 방어 + 최소 `pot_terra:true` 보장.
- `ensureNurseryFields`: `n.potId` 기본 `'pot_terra'`. 구 `potQuality`는 무시/제거.
- 무회귀: 기존 세이브는 테라코타 장착 + 보유 1로 시작.

## 8. 검증
- **셀프테스트:** ① `potOf` 폴백 ② 화분별 `nurseryMaxFruits`(유리=+1, 황금=+2) ③ 충전 속도 반영(황금 > 테라코타) ④ `composePlantSvg({noPot:true})` 결과에 화분 path 없음 ⑤ 마이그레이션(구 세이브 → pot_terra).
- **preview:** 상점 화분 구매 → RewardReveal 개봉 → 장착 → 게이지 속도·최대열매 변화 → 양육 칸에 화분/식물 2레이어 렌더 확인. self-test 0, 콘솔 에러 0.

## 9. 충돌 안전 (병렬 버섯 세션 대비)
- **건드리는 곳:** 신규 함수(`POT_CATALOG`·`potVisual`·`potOf`·장착 UI), 양육 함수(내 영역), `composePlantSvg`에 `noPot` 한 줄, 상점에 화분 항목, RewardReveal 보상 매핑.
- **안 건드리는 곳:** `composePlantBody`, 종/타입/스킬/외형 데이터(버섯 세션 영역), `master-roadmap.md`(머지 시 등록).
- 양육·화분 코드는 index.html에서 종·스킬 영역과 줄 범위가 분리돼 있어 자동 머지 가능성 높음.

## 10. 참고 코드 위치 (-2/work-2 기준, 줄번호는 변동)
- 화분 충전식: `nurseryTick`, `nurseryMaxFruits`, `rollFruitRarity`
- 양육 UI: `renderNurseryGrid`, `openNurseryDetail`, `doWaterPot`/`doHarvestPot`
- 스프라이트: `composePlantSvg`(화분 3요소 분리), `composePlantBody`(건드리지 않음), `SPRITE_OVERRIDES`(미러)
- 개봉: `openRewardReveal`(kind 'pot' 추가), `buyShopBox`, 탐사/열매 보상 롤
- 마이그레이션: `defaultState`/`normalizeState`/`ensureNurseryFields`
- 셀프테스트: `window.__test`
