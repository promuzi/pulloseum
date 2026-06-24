# 변이 재설계 — 플랜 3: 하단 변이 스킬 바 + 변이형 전투 메커니즘

> 🟡 **진행 중.** 키스톤 ✅(`2b6cc7e` `variantSkillsOf`) + cats 칩 UI ✅(`02924b8`). 나머지 슬라이스 미착수.
> **재개 진입점:** 이 문서 → 슬라이스 3-2(하단 바 UI)부터.

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
- **3-6 용족형 콘텐츠:** `비늘 강화`(guard+selfBuff·비늘 스택)·`브레스`(자기 속성 발현 공격+rider). 대부분 기존 엔진 재사용.
- **3-7 포식 콘텐츠 조정:** 기본 포식기 위력 150→90·무속성 확정(스펙). DNA 강화 카드(predBoost 등) 매핑.
- **3-8 공통 버프/디버프·무등급:** battle-start 훅(전투 시작 시 buffs/debuffs push) + 무등급 특수 훅(만개/마지막잎새 등).

## ⚠️ 개발 환경 gotcha (이번 세션 발견)
- **preview 정적 서버가 옛 `index.html`을 메모리 캐시**해 수정이 반영 안 될 때가 있다(특히 공유 작업 트리에서 다른 세션이 git 조작한 뒤). 증상: `__selfTestCases` 개수가 옛 수치로 고정·새 함수 `undefined`.
  - **해결:** `preview_stop` → `preview_start`로 **서버 재시작**(새 인스턴스는 디스크 재독). SW/캐시 클리어·하드리로드·캐시버스트 URL로는 안 풀릴 수 있음.
- 판정은 항상 `__catalogSelfTest()` **반환 fails 배열**로(콘솔 버퍼엔 옛 red 잔존).
