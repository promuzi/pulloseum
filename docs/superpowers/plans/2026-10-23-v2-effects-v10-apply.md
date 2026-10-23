# 엑셀 v10 공통 효과 → 전투 계산 적용 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 이 저장소에서는 하위 에이전트를 쓰지 않는다(사용자 지시) — superpowers:executing-plans 로 한 세션이 직접 한다.

**Goal:** 효과 · 스킬 분류 엑셀 v10과 v10 뒤 확정을 전투 계산(`v2/src/battle/`)에 넣고, 지금 46종 기술 · 기본기 · 변이 기술이 쓰는 옛 효과를 새 효과로 옮긴다(친구 서버 올리기는 사용자 허락 뒤).

**Architecture:** 효과 정의와 걸기 · 턴 끝 · 사라짐은 `status.js` 한 곳(효과 표 `FX`)에서, 한 차례 공격 판정(방어 · 반사 · 보호막 · 은신 · 소환수 받기)은 `rules.js`의 공격 함수 하나로 모은다. 3:3 대기석 진행 · 환경 넘겨주기 · 교체 규칙은 `team.js`, 1:1 표시는 `model.js`가 맡는다. 옮기는 동안 옛 효과 이름은 `status.js`의 옛 이름 표가 새 효과로 바꿔 주고, 기술 표를 다 옮긴 뒤 그 표를 지운다.

**Tech Stack:** 순수 JavaScript(ES 모듈, Node 내장 SQLite 서버 · Cloudflare 워커가 같은 파일을 씀), 시험 = `node --test` + `tools/test/*.mjs`(자체 ok() 묶음), 화면 = 캔버스 2D(`v2/src/scenes/battle.js` · `v2/src/art/*`).

**Spec:**
- [효과 · 스킬 분류 엑셀 v10](../../../outputs/01a151d0-9d92-7900-b5be-31a811469c9d/풀로세움_효과와스킬_분류_v10.xlsx) — 효과 분류 · 스킬 분류 · 검토 대기 · 미분류 · 공통 처리 시트
- [v4 인계의 최신 확정](../specs/2026-10-20-v4-effects-workbook-handoff.md) — v10 뒤 확정(확정 치명 · 보호막은 소환수 앞 · 소환수는 효과도 대신 받음 · 환경도 받음)
- [은신 통합](../specs/2026-10-19-v2-unified-stealth-design.md), [종 기술 표 10~12번](../specs/2026-10-18-v2-species-skills.md)(공통 은신 95% · 강풍은 상대 쪽 · 소환수 공통 규칙의 출처)

## Global Constraints

- 전투 계산은 순수 함수 · 씨앗 난수 `rng()`만 · DOM · `Math.random()` · `Date.now()` 없음. 같은 씨앗 · 같은 수 → 같은 결과(서버 다시 돌리기).
- 효과 상태(`u.eff`)는 JSON으로 그대로 저장되는 값만(유닛 참조 금지 — 방 저장 `rooms.mjs packB`가 JSON으로 묶음). 다른 유닛은 `u.slot` 글자로 가리킨다(1:1 = `'me'` · `'foe'`, 3:3 = `'me0'`~`'foe2'`).
- 전투 계산이 바뀌므로 `catalog.js RULES_VER` 5 → 6. 기술 · 카드 id는 바꾸지 않는다(`RENAMED` · `SAVE_VER` 그대로). 저장 모양도 그대로(`MIGRATIONS` 없음).
- 기간 표기(엑셀 효과 분류 7행): 지금 N턴 = 걸린 턴 T를 1턴째로 — 만료 `exp = T + N − 1`(그 턴 끝 `expire`에서 사라짐) · 다음 N턴(제한) = `from = T + 1`, `exp = T + N` · 일회성 = 한 번 쓰이면 끝(기간 없음) · 지연 N턴 = 걸린 다음 턴부터 세어 N턴째 끝에 발동(`at = T + N`, 턴 끝에 `at ≤ 턴`이면 핌).
- 기간형 상태이상을 다시 걸면 남은 턴과 새 기간 중 긴 쪽(`exp = max`). 능력치 겹 · 독 · 빙결 · 포자 · 속박은 따로 정한 규칙.
- 미결 · 수치 미정은 지금 게임 동작이나 아래 임시 값으로 두고 보고한다. 원안 문서(엑셀 · 종 기술 표 원문)는 고치지 않는다.
- 내 파일만 경로를 지정해 커밋(`git add -A` 금지). 다른 세션의 미커밋 파일(`tools/pixel/big/out/conv/` 등)은 건드리지 않는다. 푸시는 전체 시험 뒤 한 번. 친구 서버 배포 금지.

**임시 수치(밸런스 전 — 사용자가 나중에 정함, 보고에 표로 적음):**

| 효과 | 한 겹 · 한 번 | 기간 | 근거 |
|---|---|---|---|
| 활력 `atkUp` | 공격 +20% | 지금 5턴 | 옛 분노 +25% · 3턴 |
| 억셈 `defUp` | 방어 +50% | 지금 5턴 | 옛 철벽(받는 피해 −20% · 2턴) — 보통 방어 30에서 받는 피해 약 −10% |
| 가속 `spdUp` | 기동 +20% | 지금 5턴 | 옛 가속 +30% · 2턴 |
| 예리 `critUp` · 무딤 `critDown` | 치명 ±10 | 지금 5턴 | 새 효과(지금 거는 기술 없음) |
| 집중 `accUp` · 교란 `accDown` | 빗나감 칸 ∓8 | 지금 5턴 | 젖음의 빗나감 +8과 같은 크기 |
| 쇠약 `atkDown` | 공격 −15% | 지금 5턴 | 옛 약화 −20% · 2턴 |
| 시듦 `defDown` | 방어 −25% | 지금 5턴 | 옛 부식 −40% · 2턴 |
| 둔화 `spdDown` | 기동 −20% | 지금 5턴 | 새 효과 |
| 능력치 배율 하한 | 1 + Σ(올림) − Σ(내림), 0.2 아래로 안 내려감 | — | 겹 상한 미정이라 음수 막기만 |
| 출혈 `bleed` | 턴 끝 최대 체력 3% + 받는 회복 절반 | 지금 3턴 | 10-19 제안(화상 4% · 출혈 3%) |
| 감전 `shock` 피해 | 턴 끝 최대 체력 2% | 지금 3턴 | '약하게'(10-19 사용자) |
| 의지 `will` | 기절 · 봉인 · 속박 · 도발 50% 막음 | 지금 3턴 | 새 효과 |
| 강풍 `gale` | 상대 쪽 앞 식물 공격 빗나감 +12 | 지금 2턴(기술마다 다를 수 있음) | 엑셀 H38 |
| 은신 `stealth` | 광역 아닌 공격 95% 빗나감 | 일회성 | 종 기술 표 10번 '공통 은신' |
| 보호막 · 조준 · 반사 · 포자 · 재생 · 기생 · 화상 | 15% · 치명 +25 · 첫 타 30% · 8% · 5% · 2.5% · 4% | — | 지금 값 그대로 |

## Review Focus

1. **3:3 대기석에서 지속 피해로 쓰러짐** — 사람은 앞 식물이 그대로 서 있고 대기석 아이콘만 쓰러진 것으로 보길 기대한다(앞 식물 쓰러짐 연출 · 판 끝 판정이 잘못 나면 안 됨). Task 7 시험에 넣는다.
2. **기절 → 면역 → 다시 기절의 순서** — 선공이든 후공이든 매 턴 기절을 받아도 '한 번 쉬고 한 번 행동'이어야 한다. Task 3 시험에 두 순서 모두.
3. **봉인 + 도발 + 햇빛 부족으로 쓸 수 있는 게 없음** — 판이 멈추거나 오류 없이 그 턴을 쉬고 다음 턴 면역. Task 4 시험.
4. **포자 여럿이 같은 턴에 핌 · 정화 · 불** — 피해는 핀 포자 수만큼 더하고 남은 포자는 그대로, 정화 · 불은 모두 지움. Task 5 시험.
5. **옛 판 이어 하기** — `RULES_VER`가 바뀌어 진행 중이던 봇 판 · 친구 대결은 승패 없이 닫혀야 한다(`tools/test/resumefresh.mjs` · `roomsave.mjs`가 지킴). Task 10에서 돌린다.

---

## 차이표 — 엑셀 v10 · v10 뒤 확정 ↔ 지금 전투 코드

**처리:** ● = 이번에 넣음 · ○ = 지금 동작 유지(미결 · 수치 미정 → 보고) · ◇ = 종 기술 묶음 때(지금 거는 기술 없음).

### 능력치 버프 · 디버프(효과 분류 9~18행 · 각 겹 지금 5턴 · 독립 만료 · 교체 중 진행 · 제거 불가)

| 엑셀 | 지금 코드 | 이번 처리 |
|---|---|---|
| 활력(공격↑) | 분노 `rage` 공격 +25% · 3턴 · 다시 걸면 새로 | ● `atkUp` 겹 목록 `{ n, s: [{ v, exp }] }` · 겹마다 따로 만료 · 교체해도 남고 대기석에서도 시간이 감 |
| 억셈(방어↑) · 철벽 = 이름만 | 철벽 `wall` 받는 피해 −20% · 2턴 | ● `defUp` 방어 배율. 받는 피해 배율 `dmgTakenK` 없앰 |
| 가속(기동↑) | `haste` +30% · 2턴 | ● `spdUp` |
| 예리 · 집중 · 둔화 · 무딤 · 교란 | 없음(지금 '집중'은 다음 공격 치명 = 엑셀 조준) | ● `critUp` · `accUp` · `spdDown` · `critDown` · `accDown` 정의만(거는 기술 없음) |
| 쇠약(공격↓) · 시듦(방어↓) | 약화 `weak` −20% · 2턴 · 부식 `corrode` 방어 −40% · 2턴, 정화로 지워짐 | ● `atkDown` · `defDown`, 정화로 안 지워짐 |
| 착취(스킬 분류 23행) | 없음 | ◇ |

### 해로운 상태이상(효과 분류 19~31행)

| 엑셀 | 지금 코드 | 이번 처리 |
|---|---|---|
| 화상: 지금 3턴 · 회복은 막지 않음 · 물에 꺼짐 | 3번 · 4% · 받는 회복 절반(`burnHealK`) | ● 회복 절반 없앰. 지옥 불 2겹 · 갈증 ◇ |
| 독: 5겹 · 2턴 안 걸리면 매 턴 1겹 | 같음 | ○ 그대로(대기석에서도 진행 ●) |
| 출혈: 지금 3턴 · 약한 지속 피해 + 받는 회복 절반 | 없음 | ● `bleed` 정의(거는 기술 없음) |
| 감전: 지금 3턴 · 약한 피해 · 확률 마비 · 마비가 터지면 사라짐 · 면역 중에도 판정 · 대기 중에도 피해 | 피해 없음 · 25%(젖음 50%) · 버팀 중엔 안 굴림 | ● 턴 끝 2% 피해 · 면역 · 의지가 막아도 감전 사라짐 |
| 빙결: 겹 → 얼음(기절) · 불에 풀림 · 면역 중 가득 차면 기절 없이 초기화 | 3겹 → 얼음(받는 피해 −25%) · 쌓인 동안 기동 −20% · 버팀 중엔 안 쌓임 | ● 얼음의 받는 피해 −25% 없앰 · 면역 중에도 쌓이고 가득 차면 0으로. ○ 쌓인 동안 기동 −20%(엑셀에 언급 없음) |
| 젖음: 지금 3턴 · 기동 · 정확도 · 방어 ↓ · 연계 | 같음(걸린 턴 + 2턴) | ○ 그대로 |
| 암실(= 그늘): 걸린 턴 끝부터 자연 햇빛 N번 차단 · N은 기술마다 · 다시 걸면 긴 쪽 | 그늘 `shade` = 그 턴 끝 1번 + 재생 멈춤 · 포자 핌 = 숨막힘 `choke` 1번 | ● `dark { exp, look }`(그늘 드리우기 = 그늘 1턴) · 재생 멈춤 없앰 · 기본 포자의 숨막힘 없앰 |
| 기절(마비 · 얼음 = 이름 · 연출만) · 일회성 · 제거 불가 | `skip { src }` · 불에 맞으면 얼음이 녹아 쉬기도 풀림 | ● 대표 태그 그대로 · 불에 녹는 쉬기 풀림 없앰(기절 제거 불가) |
| 봉인: 다음 1턴 · 무작위 기술(기본기 포함) · 다 막히면 쉼(다음 턴 면역) · 불에 안 풀림 | 덩굴 `bind` = 종 기술 우선 · 기본기 피함 · 불에 풀림 · 장치 `seal` = 직전 기술 2턴 | ● `seal`(옛 `bind` 자리) · 장치 `seal`도 새 봉인으로 · 막는 개수 1(○ 밸런스) |
| 속박: 다음 1턴 교체 금지 · 같은 식물 한 번(교체로 나갔다 오면 다시) · 1:1에서는 봉인 · 불에 안 풀림 | 뿌리 `root` 걸린 턴 + 2턴 · 다시 걸면 갱신 · 불에 풀림 · 1:1 효과 없음 | ● |
| 도발: 다음 1턴 공격 기술만 · 교체 금지 · 햇빛 없으면 0번 평타 · 그것도 봉인되면 쉼 | 다음 턴 방어 · 회피 자세 금지 | ● 대표 분류 = `act === 'attack'` |
| 포자: 따로 쌓이는 지연 효과 · 1겹 기술 = 지연 2턴 · 2겹 = 1턴 · 턴 끝에 핀 것만 · 상한 없음 · 기본은 피해만 · 포자 번식 카드 = 지연 −1 | 하나가 1~3으로 자라 3이면 8% + 숨막힘 · 카드 = +1겹 | ● `spore { n, at: [..] }` |
| 기생: 지금 3턴 · 처음 건 식물이 회복 · 건 식물이 죽으면 끝 · 교체 후 연결 = 보류 | 3번 · 맞은편 앞 식물 회복 · 화상이면 회복 절반 | ● 건 식물(`by` = slot) 회복 · 쓰러지면 끝. ○ 연결 보류 → 임시로 건 식물이 대기석에 있어도 회복 |

### 이로운 상태이상(32~34행)

| 엑셀 | 지금 코드 | 이번 처리 |
|---|---|---|
| 재생: 지금 3턴 · 대기 중에도 회복 | 3번 5% · 그늘이면 멈춤 · 화상이면 절반 | ● 그늘 영향 없음 · 출혈만 절반 |
| 의지: 지금 3턴 · 기절 · 봉인 · 속박 · 도발을 확률로 막음 · 막으면 빙결 0 · 감전 사라짐 | 없음 | ● `will`(거는 기술 없음) |
| 면역: 쉰 뒤 다음 행동 한 번까지(그 행동을 마치면 끝) · 기절만 막음 · 다 막혀 쉰 다음도 | 버팀 `brace` = 쉰 턴부터 다음 턴 끝 · 기절 · 빙결 안 걸림 · 감전 안 굴림 | ● `immune` |
| (엑셀에 없음) 정화 보호 `purified` = 다음 턴까지 나쁜 효과 안 걸림 | 정화 기술마다 붙음 | ○ 유지 — 10-19 기록 '보호 자체를 남길지는 보류'. 대상만 해로운 상태이상으로(능력치 디버프는 막지 않음) |

### 준비 효과 · 스킬 분류 · 환경 · 소환수

| 엑셀 | 지금 코드 | 이번 처리 |
|---|---|---|
| 조준(옛 집중): 다음 공격 기술 1회 모든 타 · 기술 끝에 소비 · 한 턴 쉬면 풀림 · 교체 시 제거 | `u.st.nextCrit` 첫 타에 소비 · 교체해도 남음 | ● `aim { k }` |
| 은신(분신 = 연출만): 기술을 실제 쓸 때 시작 · 피하면 바로 이어 공격(기술마다) · 내 공격 · 맞음 · 쉼으로 풀림 · 교체 시 제거 · 상태이상 피해로는 안 풀림 | 은신 = 이번 턴 95% + 기습 ×1.5 · 분신 = 2턴 90% · 광역 전에 걷힘 | ● `stealth { look, link }` · 광역은 가리지 못하고 맞으면 풀림. ○ 은신끼리 서로 보임 · 비공격 행동은 은신 유지 |
| 보호막: 상대 공격 기술 1회 모든 타를 남은 양까지 · 그 기술 끝나면 잔량 제거 · 빗나감 · 상태이상 피해엔 유지 · 교체 시 제거 · 소환수보다 먼저 · 광역도 | 3턴 · 바닥날 때까지 여러 공격 | ● 기간 없음 · 한 기술 뒤 제거 |
| 갑주(옛 방어구) | 같음 | ○ 이름만 |
| 불타는 의지(준비 N회) | 장치 `infuse` | ◇ 페탈로즈 |
| 방어: 그 턴 상대 공격 모든 타 · 연달아 쓰면 절반 | 첫 1타(`guardHits`) 뒤 해제 | ● |
| 회피: 그 턴 모든 타 · 타마다 판정 | 같음 | ○ |
| 반사: 그 턴 처음 맞는 한 타만 · 방어 스킬 · 상태창 미표시 | 반사 버프 `thorns` 2턴 · 붙어서 맞은 타마다 30% | ● 기술의 `reflect` 표시 → 그 턴 첫 적중 30%(멀리 · 광역도) · 머리 위 '반사' |
| 범위 공격: 확정 명중 폐기 · 회피 자세 · 기동 · 은신에 단일보다 잘 맞음 · 빗나갈 수 있음 | 확정 명중 · 스침 없음 · 위력 85% · 공격 전 은신 걷힘 | ● 보통 판정표 + 회피 자세 효과 절반(`areaEvadeK` 0.5 — 있던 값) · 은신이 못 가림. ○ 위력 85% · 비용(밸런스) |
| 연타: 회피 · 방어 그 턴 모든 타 · 반사 첫 적중 · 보호막 · 조준 기술 1회 전체 · 불운 보정 없음 | 효과는 첫 적중 한 번 | ● 위 규칙들로 맞춤 · 효과는 맞은 대상마다 첫 적중 한 번 |
| 확정 치명 · 치명 방어 | 없음 | ◇ 게일캑터 · 게일바인 |
| 강풍(전장 환경): 지금 2턴 · 상대 쪽 앞 식물 · 교체해도 남음 · 같은 편 같은 환경은 켜져 있는 동안 다시 안 켜짐 · 정화 불가 | 맞은 식물의 디버프 · 걸린 턴 + 2턴 · 교체로 사라짐 · 정화로 지워짐 | ● `gale { env, exp, by }`를 상대 쪽 앞 식물에 두고 교체 때 다음 앞 식물로 넘김. ○ 상대 편이 같은 환경을 켜는 경우 = 편마다 따로 |
| 지옥 · 구름/밤 · 비 · 바람길 · 눈보라 · 개인 환경 · 설치형 | 경기장 장치 `FIELD`(쓰는 기술 없음) | ◇ |
| 소환수: 피해 · 디버프 · 상태이상 대신 받음 · 연타는 깨진 뒤 남은 타 주인 · 광역은 모두 · 한 타 남는 피해는 안 넘어감 · 보호막이 먼저 · 주인 교체 시 사라짐 | 없음 | ● 받기 규칙만(`u.summons`) · 부르는 기술과 화면은 ◇ 스포어캡 · 스톤캡 |
| 대기 중 상태 발동(검토 대기 B10): 대기석에서도 피해 · 회복 · 포자 발동 · 시간 진행 | 교체로 나가면 독 · 화상 · 만개 · 방어구만 남고 멈춤 | ● 준비 효과만 지우고 나머지는 남겨 턴 끝마다 진행 |
| 메아리(장치 `echo` = 다음 턴 끝 한 번 더) | 옛 해석 | ◇ 프로스트벨(같은 차례 안 25%) |

---

### Task 1: 능력치 겹과 옛 이름 바꿈표

**Files:**
- Modify: `v2/src/battle/status.js` (FX · atkK · defK · mobK · 치명 · 정확도 · listOf · expire · selfBuff · apply)
- Modify: `v2/src/battle/rules.js:171,183` (hitDmg에서 `dmgTakenK` 빼기 · 판정표에 치명 · 정확도 겹)
- Test: `tools/test/status.mjs` (9-2 버프 절 · 7번 약화 · 부식 · 강풍 절 다시 씀)

**Interfaces:**
- Produces: `FX.atkUp … FX.accDown = { stat: 'atk'|'def'|'spd'|'crit'|'acc', sign: 1|-1, v, turns: 5 }` · `statSum(u, stat) → number`(올림 − 내림) · `atkK(u)` · `defK(u)` · `mobK(u)`는 `max(0.2, 1 + statSum)`을 곱함 · `critAddOf(u)` · `accAddOf(u)` · `OLD = { rage: 'atkUp', wall: 'defUp', haste: 'spdUp', weak: 'atkDown', corrode: 'defDown', bind: 'seal', focus: 'aim', clone: 'stealth', shade: 'dark' }`(Task 8에서 지움) · `apply(tgt, id, n, ctx, o = {})` · `selfBuff(u, id, ctx, o = {})` — `o.v` · `o.turns` · `o.delay`로 기술마다 값을 바꿀 수 있음.

- [x] **Step 1: 시험 — 능력치 겹**: `status.mjs`에 `activeStat` 절. ① `selfBuff(u,'atkUp')` 두 번 → `u.eff.atkUp.n === 2` · 피해가 한 겹보다 큼 ② 1턴에 건 겹은 `expire(u,5)`에 사라지고 3턴에 건 겹은 남음(`n === 1`) ③ `apply(b,'atkDown')` 뒤 정화(`selfBuff(b,'purify')`) → `atkDown` 남음 ④ 3:3 교체로 나가도 `atkUp` 남음 ⑤ 옛 이름 `selfBuff(u,'rage')` → `u.eff.atkUp` ⑥ 쇠약 7겹이어도 `atkK(u) >= 0.2` ⑦ `critUp` 한 겹 → 판정표 치명 +10 · `accDown` 한 겹 → 빗나감 +8.
- [x] **Step 2: 실패 확인**: `node tools/test/status.mjs --games 1` → 새 절 실패.
- [x] **Step 3: 구현** — 겹은 `{ v, exp: T + turns − 1 }`를 목록에 더함, `n = s.length`. `expire`가 `exp ≤ 턴`인 겹만 빼고 비면 지움. 철벽 계산 `FX.wall.dmgK` · 분노 `rage` 처리 · `dmgTakenK`의 얼음 · 철벽을 지운다(얼음 쪽은 Task 2와 같이). `listOf`는 겹 효과를 `{ id, n }`으로.
- [x] **Step 4: 통과 확인**: `node tools/test/status.mjs --games 1` · `node --test v2/src/battle/rules.test.mjs`(부식 기대값 31 → 시듦 값으로 고침).
- [x] **Step 5: 커밋**(푸시는 Task 11) — `git add v2/src/battle/status.js v2/src/battle/rules.js tools/test/status.mjs v2/src/battle/rules.test.mjs`.

### Task 2: 해로운 · 이로운 상태이상 다시 맞춤

**Files:** Modify `v2/src/battle/status.js` · Test `tools/test/status.mjs`(3 · 4 · 5 · 7 · 9-2 절)

**Interfaces:**
- Produces: `FX.bleed = { turns: 3, dot: 0.03, healK: 0.5 }` · `FX.shock.dot = 0.02` · `FX.dark = { turns: 1 }`(기술 `inflict: { id: 'dark', turns, look: 'shade' }`) · `FX.will = { turns: 3, p: 0.5 }` · `healK(u)` = 출혈이면 0.5 · `noEnergy(u)` = `has(u,'dark')` · 기생 `e.leech = { exp, by: slot }` · `endTurn(pairs, turn, ev, stop, all = [])` — `all` = 판의 모든 유닛(기생 건 식물 찾기).

- [x] **Step 1: 시험** — ① 화상 중 재생 = 5% 그대로 ② 출혈 중 재생 · 흡수 = 절반, 턴 끝 3% · 3번 ③ 감전 턴 끝 2% 피해 ④ 그늘(암실 1턴) 중 재생은 멈추지 않음 · 그 턴 끝 햇빛 막힘 ⑤ 암실 3턴은 걸린 턴 끝부터 3번 막고 사라짐 · 암실 1턴 남음 + 3턴 → 3턴 ⑥ 얼음(빙결 3)은 받는 피해가 줄지 않음 ⑦ 불에 맞아도 이미 걸린 얼음 쉬기는 남음(빙결 겹은 녹음) ⑧ 기생 = 건 식물 회복(맞은편이 아니라 `by`), 건 식물 hp 0이면 턴 끝에 기생이 사라짐 ⑨ 화상 2턴 남음 + 다시 화상 → 남은 턴이 3턴으로(긴 쪽) ⑩ 정화 = 해로운 상태이상 다 지움 · 능력치 디버프 · 강풍 · 기절은 남음.
- [x] **Step 2: 실패 확인** — 같은 명령.
- [x] **Step 3: 구현** — 화상 · 기생 · 재생은 `left` 대신 `exp`(지금 3턴 = `T + 2`). 턴 끝 순서는 지금처럼 화상 → 독 → 출혈 → 감전 → 기생 → 재생 → 카드 회복 → 포자 → 겹 감소 → 장치. `SKIP_IDS` · 얼음 녹음(`onHit` 불 분기의 `skip` 지우기)을 없앤다. 정화 대상 목록 `HARM` = 화상 · 독 · 출혈 · 감전 · 빙결 · 젖음 · 암실 · 봉인 · 속박 · 도발 · 포자 · 기생.
- [x] **Step 4: 통과 확인** — `node tools/test/status.mjs --games 1`.
- [x] **Step 5: 커밋**.

### Task 3: 기절 · 면역 · 의지

**Files:** Modify `v2/src/battle/status.js`(setSkip · consumeSkip · shockRoll · apply 빙결 분기), `v2/src/battle/rules.js:145-162`(행동 끝에 면역 끝), `v2/src/battle/model.js`(`BLOCKED`) · Test `tools/test/status.mjs` 6번 절, `v2/src/battle/rules.test.mjs`

**Interfaces:**
- Produces: `e.immune = {}`(쉰 차례 `consumeSkip`과 다 막혀 쉰 차례에 생김) · `endAct(u, ev)`(그 식물이 행동을 마치면 면역을 지움 — rules가 행동 끝마다 부름) · `resist` 사건 `why: 'immune' | 'will'` · `BLOCKED = { ...REST, blocked: true }`(model.js export) — `resolveTurn`이 `a.blocked`면 면역을 줌.

- [x] **Step 1: 시험** — ① 선공이 기절 → 후공 이번 행동 취소 · 면역 · 같은 턴 다시 기절 = 막힘(면역 남음) ② 다음 턴 그 식물이 행동을 마치면 면역 끝 → 그 뒤 같은 턴 기절은 걸림 ③ 후공이 매 턴 기절을 걸어도 선공은 '쉼 · 행동 · 쉼 · 행동'(6턴 돌려 쉼이 3번) — 선공 · 후공 바꿔서도 ④ 면역 중 빙결은 쌓이고 3이 되면 쉬지 않고 0 ⑤ 면역 중 감전 굴림이 걸리면 쉬지 않고 감전만 사라짐 · 안 걸리면 감전 남음 ⑥ 의지(확률 1로 고정한 rng) = 기절 막음 · 막으면 감전 사라짐 ⑦ `BLOCKED`로 쉬면 다음 턴 면역.
- [x] **Step 2: 실패 확인**.
- [x] **Step 3: 구현** — 면역은 `expire`로 지우지 않는다. `canSwitch`의 쉬는 차례 막기는 그대로. 의지 굴림은 `ctx.rng`(같은 씨앗 → 같은 결과).
- [x] **Step 4: 통과 확인** — `node tools/test/status.mjs --games 1` · `node --test v2/src/battle/rules.test.mjs`.
- [x] **Step 5: 커밋**.

### Task 4: 제한(봉인 · 속박 · 도발)과 다 막히면 쉬기

**Files:** Modify `v2/src/battle/status.js`(apply 봉인 · 속박 · 도발, canUse, lockOf, canSwitch), `v2/src/battle/team.js`(okSwitch · 늦은 교체가 `canSwitch(u, B.turn)`), `v2/src/battle/model.js`(makeBattle이 `u.solo = true`, firstOk · aiPick · searchPick → `BLOCKED`), `v2/src/battle/devices.js:103-106`(장치 seal = 새 봉인) · Test `tools/test/status.mjs` 7 · 8번 절, `tools/test/devices.mjs`

**Interfaces:**
- Produces: `e.seal = { from, exp, skill, skillName }` · `e.root = { from, exp }` · `e.taunt = { from, exp }` · `u.st.rooted = true`(교체로 나가면 지움) · `canUse(u, s)`(봉인된 기술 · 도발 중 공격 아닌 기술 = 못 씀) · `canSwitch(u, T)`(쉼 · `root.from ≤ T` · `taunt.from ≤ T`) · `lockOf(u, s) → 'seal' | 'taunt' | null`.

- [x] **Step 1: 시험** — ① 봉인은 기본기도 고름(rng를 고정해 `basic`이 뽑히게) · 걸린 턴엔 그 턴 고른 기술에 영향 없음 · 다음 턴 그 기술 못 씀 · 그 턴 끝에 풀림 ② 불에 맞아도 봉인 · 속박 남음 ③ 속박: 다음 턴 교체 못 함 · 걸린 턴의 늦은 교체(swOrder)는 됨 · 풀린 뒤 다시 걸면 안 걸림(`resist why:'once'`) · 교체로 나갔다 들어오면 다시 걸림 ④ 1:1(`solo`)에서 속박 → 봉인으로 걸림 ⑤ 도발: 다음 턴 방어 · 회피 · 버프 · 광합성 못 씀, 공격 + 버프 기술은 씀, 교체 못 함 ⑥ 도발 + 햇빛 0 + 평타 봉인 → `firstOk`가 `BLOCKED` · 그 턴 쉼 · 다음 턴 면역 ⑦ 장치 seal → 새 봉인(무작위 · 다음 1턴).
- [x] **Step 2: 실패 확인**.
- [x] **Step 3: 구현** — 봉인 뽑기 = 다음 턴에 쓸 수 있을 기술(비용 ≤ min(그릇, 지금 햇빛 + 턴당 회복), 횟수 · 개수 칸 됨) 중 `ctx.rng`로 하나, 없으면 손패 아무거나. 막는 개수 1.
- [x] **Step 4: 통과 확인** — `status.mjs` · `devices.mjs` · `node tools/test/team3v3.mjs`.
- [x] **Step 5: 커밋**.

### Task 5: 포자 = 따로 쌓이는 지연 효과

**Files:** Modify `v2/src/battle/status.js`(apply 포자 · endTurn 포자 · onHit 불), `v2/src/game/cards.js:36`(포자 번식 설명) · Test `tools/test/status.mjs` 9번 절, `tools/test/cards.mjs`(포자 번식)

**Interfaces:**
- Produces: `e.spore = { n, at: [턴, …] }`(`n = at.length`) · 기술 `inflict: { id: 'spore', delay }`(옛 `n` 1 → `delay` 2, `n` 2 이상 → `delay` 1 — 옮기기 전엔 `n`으로 셈) · 카드 `sporeAdd` = 지연 −1(0이면 그 턴 끝) · `listOf` → `{ id: 'spore', n, t: 가장 빨리 피는 남은 턴 }` · 사건 `bloom { who, name, dmg, k: 핀 수, list }`.

- [x] **Step 1: 시험** — ① 1턴에 지연 2 포자 → 2턴 끝 안 핌 · 3턴 끝 8% ② 1턴 지연 2 + 2턴 지연 2 → 3턴 끝 하나(8%) · 4턴 끝 하나, 3턴 뒤 `n === 1` ③ 같은 턴 둘 핌 = 16% 한 사건(`k: 2`) ④ 핀 뒤 숨막힘 없음(그 턴 끝 햇빛 참) ⑤ 불에 맞으면 다 탐 · 정화도 다 지움 · 버섯은 안 걸림 ⑥ 포자 번식 카드 = 지연 1 기술이 그 턴 끝에 핌 ⑦ 대기석에서도 핌(Task 7에서 3:3로 한 번 더).
- [x] **Step 2: 실패 확인**.
- [x] **Step 3: 구현** — 장치 `consume`(D12)은 `fe.spore.n`(개수)을 그대로 읽음.
- [x] **Step 4: 통과 확인** — `status.mjs` · `node tools/test/cards.mjs`.
- [x] **Step 5: 커밋**.

### Task 6: 공격 한 차례 — 방어 · 반사 · 보호막 · 조준 · 은신 · 범위

**Files:** Modify `v2/src/battle/rules.js`(resolveTurn의 공격 부분을 `strike(u, foe, a, X)`로 떼어 냄 · hitTable 범위), `v2/src/battle/status.js`(aim · stealth · shield 걸기 · clearOnSwitch) · Test `v2/src/battle/rules.test.mjs`, `tools/test/devices.mjs`(연타 · 은신 · 분신 절)

**Interfaces:**
- Consumes: Task 1~3의 `atkK` · `defK` · `critAddOf` · `accAddOf` · `endAct`.
- Produces: 기술 표시 `reflect: true`(그 턴 첫 적중 30% 되돌림, 옮기기 전엔 `self`/`also`가 `'thorns'`인 것도) · `e.aim = { k }` · `e.stealth = { look: 'stealth'|'clone', link: { name, power, hits?, ambush?, el } | null }` · `e.shield = { hp }` · 사건 `stance { kind: 'reflect' }` · 이어 공격의 `hit`에 `link: { id, name }`.

- [x] **Step 1: 시험(rules.test.mjs)** — ① 방어태세는 연타 세 타 모두 막음 · `guardBreak` 없음 ② 반사: 붙어서 · 멀리 · 광역 모두 첫 적중 한 타만 30% · 두 번째 타는 없음 · 빗나감은 소모하지 않음 ③ 보호막 60에 30×3 → 60 막고 30 받음 · 기술 끝나면 보호막 없음 · 보호막 100에 30×3 → 90 막고 사라짐 · 모두 빗나가면 남음 · 3턴 지나도 남음 ④ 조준 = 연타 모든 타 치명 +25 · 기술 끝에 사라짐 · 쉬면 사라짐 · 교체하면 사라짐 ⑤ 범위: 판정표에 빗나감 · 스침 있음 · 회피 자세가 옮기는 칸은 절반 · 은신한 상대도 가리지 못하고 맞으면 은신이 풀림 ⑥ 은신: 선공으로 쓰고 상대 단일 공격을 다 피하면 바로 이어 공격(사건 순서 hit(miss) → hit(link)) · 은신 · 이어 공격 소모 ⑦ 후공으로 쓰면 그 턴 앞 공격은 못 피함 · 다음 턴까지 남음 ⑧ 은신 중 내 공격 → 은신 풀림 · 이어 공격 없음 ⑨ 은신 중 쉬면 풀림 · 화상 피해로는 안 풀림.
- [x] **Step 2: 실패 확인** — `node --test v2/src/battle/rules.test.mjs`.
- [x] **Step 3: 구현** — 방어 `guards`를 참/거짓으로, 반사는 같은 방식의 `reflects`(턴 처음, 쉬는 차례가 아니면). 이어 공격은 은신을 먼저 지우고 `strike`로(그 공격 자체가 은신 해제 규칙에 걸리지 않게). 은신끼리는 지금처럼 서로 보임. 기습(`ambush`)은 이어 공격에만 ×1.5 · 자세 무시.
- [x] **Step 4: 통과 확인** — `node --test v2/src/battle/rules.test.mjs` · `node tools/test/devices.mjs`.
- [x] **Step 5: 커밋**.

### Task 7: 강풍 환경 · 대기석 진행 · 소환수 받기

**Files:** Modify `v2/src/battle/status.js`(gale · clearOnSwitch · endTurn의 소환수), `v2/src/battle/team.js`(makeTeamBattle slot · swapIn 환경 넘김 · 면역 끝 · closeTurn 대기석), `v2/src/battle/model.js`(closeTurn(pair, turn, ev, gain, stop, bench = [], all = [])), `v2/src/battle/rules.js`(`strike`의 대상 고르기) · Test `tools/test/status.mjs` 8번 절, `tools/test/team3v3.mjs`, `v2/src/battle/rules.test.mjs`

**Interfaces:**
- Produces: `e.gale = { env: true, exp, by: 켠 편('me'|'foe') }`(상대 쪽 앞 식물에) · `moveEnv(from, to)` · 대기석 사건에 `bench: true, idx` · `u.summons = [{ name, hp, max, def, eff: {} }]`(유닛 모양) · 사건 `summonBreak { who, i }`.

- [x] **Step 1: 시험** — ① 강풍: 맞은 쪽 앞 식물 공격 빗나감 +12 · 지금 2턴(1턴에 켜면 2턴 끝에 꺼짐) · 3:3 교체하면 새 앞 식물로 넘어감 · 켜져 있는 동안 같은 편이 다시 켜도 기간이 안 늘어남 · 정화로 안 지워짐 ② 대기석: 화상 · 독이 대기석에서도 턴 끝마다 깎이고 재생은 차며 포자가 핌 · 능력치 겹 기간도 줄어듦 · 대기석에서 쓰러지면 `faint { bench: true }` · 앞 식물은 그대로 · 셋 다 쓰러지면 판 끝 ③ 준비 효과(조준 · 은신 · 보호막)는 교체로 사라지고 나머지는 남음 ④ 소환수: 단일 공격은 앞 소환수가 맞고 남는 피해는 주인에게 안 감 · 연타는 소환수가 깨진 뒤 남은 타를 주인이 · 광역은 소환수와 주인 모두 · 보호막이 소환수보다 먼저 막음 · 효과는 맞은 쪽에 · 주인이 교체되면 소환수 사라짐 · 소환수가 깨져도 `faint` 사건 없음.
- [x] **Step 2: 실패 확인**.
- [x] **Step 3: 구현** — 대기석 처리 순서 = 앞 식물 둘(선공 쪽 먼저) → 각 편 대기석(번호 순). 대기석은 햇빛이 차지 않음(ownSun 규칙 그대로).
- [x] **Step 4: 통과 확인** — `status.mjs` · `team3v3.mjs` · `node tools/test/pvp3.mjs` · `node tools/test/edgecases.mjs`.
- [x] **Step 5: 커밋**.

### Task 8: 기술 표를 새 효과로 옮김 · RULES_VER 6

**Files:** Modify `v2/src/game/catalog.js`(SKILLS의 `self` · `also` · `inflict` · 그림자 분신 · 그림자 숨기 · `RULES_VER`), `v2/src/battle/model.js`(시제품 SKILLS · BASICS 설명 · aiScore · newFx · hitChance), `v2/src/battle/status.js`(OLD 표 지움), `v2/src/battle/devices.js`(BUFF_IDS → 이로운 상태이상 · charge 은신), `v2/src/game/cards.js`(공생 균사 · 부생 회복 = 나쁜 효과 종류 수) · Test `tools/test/cards.mjs`, `tools/test/botbrain.mjs`, `tools/test/status.mjs`

**옮기기 표(id만 — 위력 · 비용 그대로):** `self`/`also`: rage → atkUp · wall → defUp · haste → spdUp · focus → aim · thorns → 기술에 `reflect: true`(덤이 하나뿐이면 `act` 그대로 buff) · clone → stealth(look clone) · purify · regen · shield · armor 그대로. `inflict`: weak → atkDown · corrode → defDown · bind → seal · shade → `{ id: 'dark', turns: 1, look: 'shade' }` · spore `n` 1 → `delay: 2`, `n` 2 이상 → `delay: 1` · 나머지 그대로. 은신 기술: 그림자 분신 `u_ninja_2` = `self: 'stealth'`, `look: 'clone'`, `early: true`, `link: { power: 24, hits: 3 }`(게일바인 연타 제안값) · 그림자 숨기 `u_ninja_3b` = 위력 0 버프, `self: 'stealth'`, `early: true`, `link: { power: 70, ambush: true }`, `uses: 2` 그대로.

- [x] **Step 1: 시험** — `status.mjs` 끝에 '옮기기 검사': 모든 `SKILLS` · `model.js` 시제품 기술의 `self` · `also` · `inflict.id`가 `FX`에 있고 옛 이름(OLD 표 키)이 하나도 없음 · `RULES_VER === 6`.
- [x] **Step 2: 실패 확인**.
- [x] **Step 3: 구현** — 표를 손으로 고친다(스크립트로 고치면 CRLF · 백슬래시 함정 — 프로젝트 지침).
- [x] **Step 4: 통과 확인** — `status.mjs` · `cards.mjs` · `botbrain.mjs` · `node tools/test/resumefresh.mjs` · `node tools/test/roomsave.mjs`.
- [x] **Step 5: 커밋**.

### Task 9: 화면 — 효과 이름 · 아이콘 · 기술 설명 · 머리 위 글

**Files:** Modify `v2/src/art/statusLook.js`(STATUS · STATUS_DESC · BUFF_LOOK), `v2/src/scenes/battle.js`(FX_MSG · FX_SOUND · CURE_FIRE · 사건 → 장면: resist · bloom · tick(출혈 · 감전) · noEnergy · 대기석 사건 · 반사 자세 · 이어 공격 리본), `v2/src/art/skillcard.js`(BUFF_KEY · LOCK_TEXT · LOCK_SHORT · statOf · BASIC_DESC 방어 · 반사 · 은신 설명), `v2/src/art/statusfx.js`(SFX_OF_FX 새 id → 있던 연출), `server/rooms.mjs:254`(상대 `st.nextCrit` 감추기 → 조준은 eff로 보임), `v2/src/scenes/index.js`(fxlab 이름 대조만)

- [x] **Step 1: 이름 표(엑셀 그대로)** — 활력 · 억셈 · 가속 · 예리 · 집중 · 쇠약 · 시듦 · 둔화 · 무딤 · 교란 · 화상 · 독 · 출혈 · 감전 · 빙결 · 젖음 · 암실 · 그늘 · 기절 · 마비 · 얼음 · 봉인 · 속박 · 도발 · 포자 · 기생 · 재생 · 의지 · 면역 · 조준 · 은신 · 분신 · 보호막 · 갑주 · 강풍 · 정화. 아이콘 = [효과 아이콘 표](../specs/2026-10-22-v2-effect-icons.md) 그대로(새 그림 없음).
- [x] **Step 2: 확인** — 새 글자가 글꼴 부분집합에 있는지(`tools/fonts/unicodes.txt` 대조 — 2026-10-23 확인: 효과 이름 글자는 모두 있음). 화면 촬영 `node tools/shots/v2shots.mjs --label fx10`로 전투 · 식물 관리(기술 카드 뒷면) · `?scene=fxlab`을 보고 효과 창 넘침 · 겹 수 · 포자 남은 턴 · 머리 위 글을 확인.
- [x] **Step 3: 커밋**.

### Task 10: 검증 · 종 리그전

- [x] **Step 1** — `node --test v2/src/battle/rules.test.mjs` · `tools/test/*.mjs` 전부(네트워크가 필요한 `prodcheck` · `pvpfriend`는 뺌) · `node cf/test_cf.mjs` → 모두 통과.
- [x] **Step 2** — `node tools/test/specbalance.mjs` → 모든 종 40~60%. 벗어나면 임시 수치(Global Constraints 표)만 조금 고치고 다시, 그래도 벗어나는 종은 보고.
- [x] **Step 3** — 화면 촬영(전투 1:1 · 3:3, 식물 관리) 확인 후 커밋.

### Task 11: 기록 · 커밋 · 푸시

- [x] **Step 1** — `CLAUDE.md` · `AGENTS.md`의 '종 설계 단계 = 논의 · 기록만 … 게임 적용은 여러 종을 한 번에' 줄을 '만들기 = 공통 효과 → 같은 장치 묶음으로 종 하나씩, 친구 서버엔 몇 종씩 모아 종 리그전 밸런스 뒤(사용자 허락)'로(두 파일 같게).
- [x] **Step 2** — `docs/master-roadmap.md` 결정 로그 · `docs/CHANGELOG.md` 맨 위 · `docs/superpowers/specs/2026-10-16-v2-mvp-design.md` 맨 위 「최근 세션 맥락」 · 이 계획의 체크 표시.
- [x] **Step 3** — 내 파일만 경로 지정 · `git diff --cached` 확인 · 커밋 · `git push`. 친구 서버 올리기는 하지 않음(사용자 허락 뒤 `cf/배포.md`).

---

## 실행 기록(2026-10-23, 클로드 — 한 세션에서 직접, 하위 에이전트 없이)

- 커밋: `b1b13ff` 다음부터 `78dd520`(계획) … `8e2a048`(화면) · `c391a9b`(상태이상 아이콘 18칸 — 사용자 직접 요청). 시험 = 표준 묶음 27개 · `rules.test` 32 · `status` 150 · `devices` 60 · `test_cf` 54/54.
- 종 리그전: 40~60% 밖 19종 → 17종(CHANGELOG 228에 종별 수치). 공통 임시 수치는 고치지 않았다(아래 마지막 판정).
- 마지막 검토 = 작성자 자기 검토(하위 에이전트 금지 지시) — 새 눈의 검토보다 약하다.

### 클로드 판정(엑셀 · 기록이 정하지 않은 것 — 틀리면 이 줄만 고침)

> **2026-10-23 저녁 사용자 교정(CHANGELOG 230):** ‘엑셀말고 내가 정한 거 있는 … 왜 너가 마음대로 다 정하냐 확인도 안하고’. 아래를 효과 인계 문서 · 은신 통합 설계 · 종 기술 표와 대조했다. **[바뀜]** = 사용자 답 · 기록대로 고침, **[기록]** = 기록이 이미 정한 것, **[유지]** = 지금(옛) 동작 그대로, **[질문]** = 기록에 없어 사용자 확인 대기(답이 올 때까지 지금 코드 그대로).

1. **[바뀜]** 사용자 ‘보호 없애’(10-23) — 정화는 지우기만. 옛 판정: ~~정화 보호(purified)는~~ 엑셀 v10에 없지만 남김 — 대상은 해로운 상태이상 + 기절(능력치 디버프는 걸림). 틀리면 정화 기술이 조금 약하거나 셈.
2. **[답]** 사용자 ‘일단 유지하고, 사기면 빼자’(10-23) — 지금대로. (기록 = 교체 뒤 연결은 시뮬 때 정하는 보류) 기생은 교체 뒤에도 건 식물이 살아 있으면 어디 있든 회복(보류된 연결의 임시값). 틀리면 대기석 회복 하나.
3. **[바뀜]** ~~불에 맞아도 이미 걸린 얼음(기절)은 안 풀림~~ → 10-21 기록 ‘얼음 · 빙결 · 젖음 · 포자 · 기생이 불에 풀리는 지금 규칙은 그대로’대로 얼음도 녹음.
4. **[바뀜]** 사용자 ‘시간초과 하면 랜덤으로 스킬써짐’(10-23) — 시간 초과 = 쓸 수 있는 기술 중 무작위(진짜 행동이라 면역도 끝남). 옛 판정: 시간 초과로 넘어간 차례도 ‘행동’으로 보고 면역을 끝냄. 틀리면 시간 초과 뒤 면역 한 턴 차이.
5. **[바뀜]** 봉인은 걸 때 뽑되 ~~쓸 수 있을 기술만~~ → 사용자 ‘봉인걸때 못쓸 기술도 뽑힐 수 있게 해’ — 손패 전체(기본기 · 못 쓸 기술 포함)에서 무작위.
6. **[유지]** 반사 패시브(가시 줄기 카드 · 장치 thornRes)는 그대로, 반사 자세만 그 턴 첫 타. 틀리면 가시 카드 세기만 다름.
7. **[바뀜]** ~~은신끼리는 서로 보임~~ → 사용자 ‘은신끼리도 서로 안 보임’. **[답]** 사용자 ‘공격이 아니면 은신 안 풀림’(10-23) — 방어 · 버프 같은 비공격 행동이 은신을 유지하는지(은신 통합 설계 ‘별도 검토’) — 지금은 유지.
8. **[기록]** 피한 직후(은신 통합 설계) — 이어 공격은 공격 끝의 되받아치기 · 회피 보상 뒤, 쓰러짐 판정 앞. 틀리면 사건 순서만 다름.
9. **[기록]** 강풍 기본 기간 = 엑셀 ‘지금 2턴’(옛 코드보다 한 턴 짧음) · 게일 종 기술은 기술마다 정함. 틀리면 공용 강풍 기술이 한 턴 짧음.
10. **[답]** 사용자 ‘따로 셈’(10-23). (기록 = 상대 편 같은 환경은 미결) 양쪽이 강풍을 켜면 편마다 따로 셈. 틀리면 양쪽 강풍 겹침 처리.
11. **[기록]** 소환수 공통 규칙(10-21~22 확정) 중 받기 규칙만 먼저(행동 · 화면은 스포어캡 · 스톤캡 묶음 때). 틀리면 그때 받기 규칙만 다시.
12. **[답]** 사용자 ‘6번 그렇게 해’(10-23) — 바꾼 대로. 그림자 숨기 = 위력 70 공격 → 은신 기술(피하면 기습 70) · 그림자 분신 연타 24×3(게일바인 값을 빌림). 틀리면 닌자바인 성체 기술 하나의 쓰임새.
13. **[기록 확인]** 회수(버프 날리기) = 10-20 ‘이로운/해로운 지정 가능’ · 능력치 버프 제거 불가 · 지금 쓰는 기술 없음 — 준비 효과를 지우는지는 그 기술(아쿠아벌브 윤회 등)을 만들 때 묻기. 빼앗기 · 날리기 장치 대상 = 이로운 상태이상(재생 · 의지 · 정화 보호), 면역 제외. 틀리면 장치 대상 하나.
14. **[바뀜]** ~~포자 창은 이름 없이~~ → 사용자 ‘포자도 이름 붙여줘’ — 이름 + 개수(아이콘 오른쪽 위) + 남은 턴(오른쪽 아래).
15. 효과 창 아이콘 18칸 · 창 20칸 · 겹 수 아이콘 오른쪽 위(사용자 요청 ‘알아보기 힘들어’, 계획 밖 — 아이콘 왼쪽 끝 · 글자는 아이콘을 뺀 자리의 가운데는 사용자 지시) — 이름이 긴 보호막은 아이콘 없이 이름만 가운데. 틀리면 창 높이 · 겹 수 자리만.
16. **[바뀜 · 질문]** 광역 = 사용자 ‘빗나감과 스침을 줄이고 정타만 높이는 치명타도 그대로’ → 빗나감 · 스침 절반(양은 임시). 남은 질문 = 임시 수치(능력치 겹 값 — 옛 값보다 낮춤 · 감전 2% · 의지 50%)와, 종 리그전 범위 밖 17종이어도 공통 임시 수치는 그대로 — 바람 약세 · 선인장/불 강세가 넣기 전부터 같아 공통 수치로는 못 고침, 종 묶음에서 맞춤. 틀리면 공통 수치 조정 한 번 더.
