# 변이 재설계 — 플랜 3: 하단 변이 스킬 바 + 변이형 전투 메커니즘

> ✅ **완료.** 슬라이스 3-1~3-8 전부 구현. 6변이형 하단 변이 스킬 바 + 공통 카드 8종 전부 동작(`__catalogSelfTest()` 0 fail).
> **후속:** 변이 카드 밸런스 튜닝(수치 패스) · 적 봇에 공통 버프/디버프 카드 분배 여부 검토 · 변이형별 보급상자 드롭에 새 카드 반영.

설계 근거 = [`../specs/2026-06-24-mutation-forms-cards-redesign-design.md`](../specs/2026-06-24-mutation-forms-cards-redesign-design.md).

## 핵심 개념
- **하단 "변이 스킬 바"** = 변이형이 부여하는 별도 스킬(상단 6칸 로드아웃과 별개). `variantSkillsOf(p)`가 단일 진실.
- 구조는 변이형마다 다름: 포식=1슬롯 · 무기=2슬롯 · 독성=2슬롯(묻히기/뿌리기) · 용족=2슬롯(비늘/브레스).
- 포식은 이미 전투에서 `#cardPred` 별도 슬롯으로 렌더 중 → 이 패턴을 일반화.

## 완료
- **3-1 키스톤 `variantSkillsOf(p)`** ✅ — 포식=기본 포식기, 무기=장착 무기 종류 카드 스킬(최대2). 독성/용족은 콘텐츠 슬라이스에서 채움.
- **(별도) cats 칩 UI** ✅ — `skillCatChipsHtml` 스킬 서랍 표시.

## 남은 슬라이스 (순서)
- ~~**3-2 하단 바 UI(관리창):**~~ ✅ `44ac142` — 스킬 탭에 `variantSkillBarHtml`로 별개 줄 표시(읽기 전용·cats 칩). (로드아웃 중복 dedup은 3-4에서.)
- ~~**3-3 하단 바 UI(전투):**~~ ✅ — `showCardPhase`의 hardcoded pred 분기 → `variantSkillsOf(B.p)` 일반화. `.cp-pred` auto-fit 그리드(1~2칸 자동).
- ~~**3-4 무기형 전환:**~~ ✅ `4eff627` — `variantSkillsOf` `p.cards` 폴백 추가(전투 유닛 지원). `makeCombatant`에서 weapon grantSkill을 loadout 제외(variant bar로). `detailEquip`에 무기 카드 최대 2장 초과 시 토스트 차단.
- ~~**3-5 독성형 콘텐츠:**~~ ✅ — `skill_card_infuse`(독 묻히기 · `infuse` 버프 → 공격 적중 시 `addDot`) + `skill_card_spray`(독 뿌리기 · `dotTimes:2` 즉발). `variantSkillsOf` toxic 케이스 추가. `makeCombatant`에 toxic loadout 자동 추가. 0 fail.
- ~~**3-6 용족형 콘텐츠:**~~ ✅ — `skill_card_scale`(비늘 강화 · guard+`scaleStack` 영구 방어 누적 cap5) + `skill_card_breath`(원소 브레스 · `elem:true` 자기 속성 발현). `variantSkillsOf` dragon 케이스, `makeCombatant` dragon loadout, `applySkill` scaleStack 엔진.
  - **(동시 회귀 수정)** 3-4 버그: `makeCombatant`가 전투 유닛에 `cards`를 저장 안 해 무기형이 전투에서 무기 스킬을 영영 못 쓰던 문제 → `unit.cards` 저장 + `uses` 초기화를 `variantSkillsOf` 포함으로 확장. `aiPickSkill`에 variant 스킬 후보 추가(적 봇도 사용). `buildEnemy` 폐지된 lumen 제거 + dragon 추가.
- ~~**3-7 포식 콘텐츠 조정:**~~ ✅ — 기본 포식기 위력 150→90·cost 3→2·무속성 확정(`cats:[attack]`). DNA 강화 카드(predBoost) 기존 매핑 유지.
- ~~**3-8 공통 버프/디버프·무등급:**~~ ✅ (3-8a + 3-8b)
  - **3-8a battle-start 훅:** `cardInstanceEffects`/`cardEffects`에 `allStatPct`·`startEnemyDebuff`·`startSelfRandom`·`surviveOnce` 필드. `applyCardStartHooks(self,foe)` → `startMatch`에서 적 디버프+자기 랜덤 버프. survive once 소진(`surviveOnce` 플래그). 카드 5종(🥀위조페로몬·💢약화효소·☯️항상성·💗마지막잎새·🎲불안정변이).
  - **3-8b 턴 기반 훅:** `rampStat`·`thresholdBuff`·`bloom` 필드. `applyCardTurnHooks(u,turn)` → `tickStatuses`에서 매턴 ramp/adren/bloom 버프 재계산. 카드 3종(✨굴광성장·🔥아드레날린·⏳만개).
  - `cardEffectLabels`에 모든 신규 효과 라벨 추가.

## ⚠️ 개발 환경 gotcha (이번 세션 발견)
- **preview 정적 서버가 옛 `index.html`을 메모리 캐시**해 수정이 반영 안 될 때가 있다(특히 공유 작업 트리에서 다른 세션이 git 조작한 뒤). 증상: `__selfTestCases` 개수가 옛 수치로 고정·새 함수 `undefined`.
  - **해결:** `preview_stop` → `preview_start`로 **서버 재시작**(새 인스턴스는 디스크 재독). SW/캐시 클리어·하드리로드·캐시버스트 URL로는 안 풀릴 수 있음.
- 판정은 항상 `__catalogSelfTest()` **반환 fails 배열**로(콘솔 버퍼엔 옛 red 잔존).
