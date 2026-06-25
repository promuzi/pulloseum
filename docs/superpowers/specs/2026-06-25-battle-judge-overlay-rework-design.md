# 전투 판정 오버레이 재개편 설계 (2026-06-25, v2)

> 상태: **구현 완료(2026-06-25, main)**. 이전 판([2026-06-25-battle-ui-redesign-design.md](2026-06-25-battle-ui-redesign-design.md))의 "양쪽 카드 상시 + 상단 흐림" 방식을 사용자 의도에 맞게 교체. `__catalogSelfTest()` 0 fail · preview 실전 1턴 검증(식물/상태바 0 겹침·시퀀스·팝업·HP·턴 종료).
> 브레인스토밍 합의(2026-06-25, 비주얼 컴패니언). 접근: 기존 `#judgeWindow`/`#cardPhase` 재배선(새 DOM 골격 최소).

## 1. 문제 (이전 판의 어긋남)

이전 구현은 판정 시 **상단 식물 무대 전체를 흐리고** 그 위 중앙에 **양쪽 카드를 동시에** 띄웠다. 사용자 의도와 어긋남:

1. 판정 중 **식물·상태바가 흐려지고/가려짐** → 안 됨. 항상 또렷이 보여야 함.
2. 카드가 **양쪽에 계속** 떠 있음 → 원하는 건 "선공 판정 때만 둘, 이후엔 행동 카드 한 장씩".
3. 하단 스킬바가 화면 46%로 너무 큼 + 카드 앞면이 복잡(분류칩 노출).

## 2. 확정 사항

- **흐림 폐지.** 식물·상태바는 전 과정 또렷이 보인다(`setBlur`→no-op).
- **카드 좌우 고정:** 내 카드=**왼쪽**, 상대=**오른쪽**(기존 enemy-left/player-right에서 스왑).
- **카드+판정은 두 식물 사이 빈 중앙 띠**(`#judgeWindow`, `top:50%`)에 떠오른다. 식물 행은 무대 상/하단이라 안 겹침.
- **데미지·치명타·버프·디버프는 전부 해당 식물 위 이펙트**(`popup`/`fxPopup`/`spriteFx`). 판정 칸엔 **상성 한 줄만**.
- **하단 스킬 카드 단순화:** 앞면=아이콘+이름+비용만(분류칩 제거). 하단바 비율 46%→38%.
- **상세=꾹→뒤집기**(기존 `cardFlipIn` 유지) — 등급·분류·속성·계수·설명.

## 3. 한 턴 시퀀스

3칸 그리드 `[왼 슬롯 | 중앙 | 오른 슬롯]`. 내 홈=왼, 상대 홈=오른.

1. **선공 판정** — 왼=내 카드, 오른=상대 카드, 중앙=선공 화살표(`➜ 선공·나` / `⬅ 선공·상대` / `방어 우선`). 공격이 관여할 때만 화살표.
2. **선공 행동** — 비행동 카드 사라짐(반대 슬롯 비움), 행동 카드만 홈에 남음 → 반대(빈) 슬롯에 **상성 한 줄** 판정. 동시에 식물 위로 데미지·치명타·버프·디버프 이펙트.
3. **후공 행동** — 후공 카드가 자기 홈 슬롯에 **다시 등장**, 선공 카드 슬롯은 비워지고 거기에 **판정 한 줄**.
4. 턴 종료 지속피해(`tickStatuses`)는 식물 위 숫자+VFX로 동시 전달(텍스트 줄 없음).

상성 판정 문구: `eff(a.element,d.element)` 배수 → `>1` "효과가 굉장하다!"(good) / `<1` "효과가 별로다…"(weak) / `=1` "정확히 들어갔다!". 빗나가면 "빗나갔다!"(miss). 비공격 스킬은 한 줄 라벨(방어 태세!/기운을 차렸다!/힘이 솟는다!/상대를 약화시켰다! 등).

## 4. 코드 변경 (재사용 우선)

| 대상 | 변경 |
|---|---|
| `#judgeWindow` 마크업 | `#judgeMessage` 제거. `#judgeCards`만 → 슬롯 3칸(`#judgeSlotLeft`/`#judgeOrder`/`#judgeSlotRight`). |
| `openJudge` | 슬롯에 양쪽 카드(왼=나·오른=상대) 렌더, 흐림 호출 제거. |
| 신규 `judgeCardMarkup(side,id)` | 슬롯용 카드 1장 HTML(`#judgePlayerCard`/`#judgeEnemyCard` id 유지 → `animateJudgeCardUse` 호환). |
| 신규 `setJudgeAction(side,id)` | 행동 카드만 홈 슬롯에, 반대 슬롯 비움, 중앙 화살표 제거. |
| 신규 `setVerdict(actingSide,text,tone)` | 행동측 반대 슬롯에 상성 한 줄. |
| 신규 `fxPopup(side,text,cls)` | 식물 위 치명타/버프/디버프 텍스트 팝업(`popup` 형제). |
| `applySkill` | 내부 `showJudgeMessage`(hit/miss)→`setVerdict`. 치명타→`fxPopup(tgt,'치명타!','crit')`. selfBuff/scaleStack→`fxPopup(side,'🔺…','buf')`. enemyDebuff/defDown→`fxPopup(tgt,'🔻…','deb')`. 비공격 스킬 한 줄 verdict. |
| `playerSkill` | 선공 계산 후 **단일 순차 루프**로 통일(needsOrder=false 동시적용 분기 폐지). 각 행동 전 `setJudgeAction`. |
| `setBlur`/`setVerdictSide`/`showJudgeMessage` | no-op(잔존 호출 안전). |
| `skillCardHtml` | 앞면 foot=비용만(`battleCardFootChips` 제거). |
| CSS | `#battleArena{bottom:38%}`·`#cardPhase{height:38%}`, `.jw-slot`/`.jw-verdict`/`.jo-arrow` 신설, `.dmgpop.crit/.buf/.deb`, `.skillcard` min-height 축소. |
| `showSkillDetail`(뒷장) | 분류 칩 pill 추가(등급·속성·계수·설명 정돈). |

## 5. 회귀 검증

- `window.__catalogSelfTest()` fails 배열로 판정.
- 수동(preview): (1) 흐림 없음·식물/상태바 상시 보임, (2) 선공 판정 양쪽카드+화살표 → 선공 카드만+반대칸 상성 → 후공 카드 재등장+반대칸 상성, (3) 데미지/치명타/버프/디버프가 식물 위에, (4) 꾹→뒤집기 상세, (5) 항복·승패·다음 턴 정상.
- preview 정적 서버(HMR 없음) → 수정 후 `location.reload()`, 안 풀리면 `preview_stop`+`preview_start`.

## 6. 범위 밖

- 데미지 공식/밸런스 변경 없음(연출/표시만).
- 스킬 아이콘 일러스트 교체 없음.
