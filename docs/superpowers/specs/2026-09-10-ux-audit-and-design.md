# 풀로세움 UX 진단·설계 (2026-09-10)

- 상태: v1 (사용자 검토 대기). 범위: 게임 UI·가독성·화면 전환·전투 피드백·재미 루프·직관성·검증 방법.
- 방법: ① 375×812 신규 유저 흐름을 직접 플레이하며 화면 8종 관찰 + 스크립트 실측(탭 타깃·글자 크기) ② 업계 기준 병렬 조사 3각도(모바일 UX 기준 / 게임 필·전환 / 수집형 재미 루프·검증법), 출처 100여 건 ③ 기존 문서(benchmark-proposals·feature-designs 8항목)와 중복 배제.
- 결론 한 줄: **콘텐츠는 충분한데, 신규 유저가 "무엇을 왜 하는지"를 화면이 말해주지 않는다.** 원인은 세 가지 — 글자·타깃이 모바일 기준 미달, 첫 10분에 결정보다 정보가 먼저 쏟아짐, 전투 피드백이 결과를 "보여주지" 않고 "알려줌".

---

## 1. 진단

### 1-1. 실측 (375×812, 신규 세이브)

| 화면 | 탭 타깃 | 44px 미만 | 텍스트 | 12px 미만 | 비고 |
|---|---|---|---|---|---|
| 메인(빈 화분) | 23 | 14 (61%) | 40 | 20 (50%) | 슬롯 55×43, 설정 37×36, 슬롯 라벨 7px |
| 메인(식물) | 34 | 15 | 89 | 39 (44%) | 스탯 8칸 상시 노출 |
| 강화 모달 | 42 | 17 | 103 | 57 (55%) | 심기 직후 자동 오픈 |
| 상점 | 43 | 19 | 85 | 51 (60%) | 미동작 IAP 카드 4장 + 원화 가격 |
| 양육 | 41 | 16 | 88 | 57 (65%) | 12칸 중 6칸 잠김 |
| 함선 | 33 | 15 | 71 | 36 (51%) | 타일 걷기 미니 방 |
| 전투 | 1 | 1 | 29 | 3 (10%) | 글자는 양호, 무대의 70%가 빈 어둠 |

- 픽셀 폰트(Galmuri)는 CSS 참조만 있고 `@font-face`·파일이 없다 → 7~13px 시스템 폰트(맑은 고딕)로 렌더. "픽셀 UI"가 아니라 "작은 시스템 글자"다.
- 온보딩·튜토리얼 코드 없음. 전투 배속·스킵 없음. 한 턴 연출 ≈ 4초(sleep 950×3 + 560×2 + …).

### 1-2. 관찰 (신규 유저 눈으로)

| # | 순간 | 문제 | 등급 |
|---|---|---|---|
| O1 | 게임 시작 직후 | 안내 0. 화면의 가장 큰 요소가 지금 못 누르는 "전투 시작", 잠긴 슬롯 6개가 첫인상 | P0 |
| O2 | 종자 심기 | 가방 → 심기 → 확인창(이름·단계·가능 여부) → 확정 = 4단계. 첫 식물을 보기 전에 **강화 모달(스탯 8칸·비용 40×8·EXP·물약)** 이 자동으로 뜸 | P0 |
| O3 | 메인(식물) | 결정은 1개(전투)인데 정보 20개(스탯 8·티어 3칸·리그 배너·미션 배너·가방·도감). 배너 글자 줄바꿈 깨짐("브론\n즈") | P1 |
| O4 | 방 전환 | 새 방이 반투명으로 메인 위에 겹쳐 뒤 화면이 비침. 어수선하고 "어디에 있는지" 흐림 | P1 |
| O5 | 상점 | "구글 스토어 결제 예정 · 현재 선택 불가" 카드 4장에 원화 취소선 가격. 비공개 테스트에 미동작 결제 UI는 혼란 + Play 정책 위험 | P0 |
| O6 | 탐사 | 별지도는 예쁘지만 무엇을 눌러야 하는지 안내 없음, 행성명 9~10px, 잠금 다수 | P1 |
| O7 | 양육 | 12칸 중 6칸 "Lv.N 해금". 신규엔 빈칸이 대부분 | P2 |
| O8 | 함선 | D-패드로 걷는 방. 게임 정체성과 연결 안 보임 | P2 (v1.0 숨김 검토) |
| O9 | 전투 | 무대 70%가 빈 어둠에 96px 스프라이트 둘. 판정은 "카드 → 문구 → 상대 카드"로 **말해주지만** 피격 연출(플래시·넉백·숫자)이 약해 결과가 몸으로 안 느껴짐. 상대 다음 행동은 3코스트 이상만 예고 | P0 |
| O10 | 전투 UI | "⚡ 에너지" 라벨이 "예\n너지"로 줄바꿈. 배속·스킵 없음 → 반복 전투가 4초×턴 | P1 |
| O11 | 대기 모션 | 화분 흔들림·둥실만. 스프라이트 프레임 없음 | P2 |

등급: P0 = 비공개 테스트 전 필수, P1 = 테스트 중 1라운드 후, P2 = 출시 후.

---

## 2. 재미는 어디서 나오는가 — 조사 결론이 풀로세움에 말하는 것

업계 원칙은 한 문장으로 수렴한다. **"읽을 수 있는 정보 위에서, 결과가 즉시 되돌아오는 결정을 반복하게 하라."** (Sid Meier GDC 2012 · Into the Breach 2018 · Slay the Spire · 포켓몬 Gen VII 상성 표시)

| 원칙 | 출처 | 풀로세움 적용 |
|---|---|---|
| 흥미로운 결정 = 트레이드오프·상황 의존·리스크-리워드. "결정했는데 게임이 그냥 진행되는 게 최악" | Sid Meier, GDC 2012 | 스킬 선택 뒤 반드시 **눈에 보이는 결과**(피격 연출·숫자·상성 문구·사운드)가 따라야 함 → 전투 피드백 재설계(§6) |
| 적 의도는 전부 보여준다. "멋진 아이디어는 명확성을 위해 매번 희생" | Into the Breach 개발자, 2018 | ~~3코스트 이상만 예고 → 모든 턴 상대 의도 아이콘(공격/방어/버프 + 예상 위력)으로 확대~~ **폐기(2026-09-11 사용자 결정): PvP 예정이라 상대 다음 수는 비공개. ⚠️ 큰 기술 예고·성향 표시만 유지** |
| 자원 커브는 고정·단순(턴당 에너지 3) | Slay the Spire | 현행 에너지 커브(시작 2·+1/턴·최대 8)는 유지하되 **핍 UI를 크게**, 다음 턴 예상치 표시 |
| 초보에게 해로운 건 이해·보드 복잡도, 전략 복잡도는 안 보임 | Rosewater 2011 | 스탯 8칸·개체값은 **숨기고**, 외형·카드 같은 "보이는 차이"만 앞에 |
| 상성은 메시지+사운드+데미지 차이로 동시에 가르친다. 도감에 등록된 종에게만 상성 힌트 | 포켓몬(Bulbapedia) | "효과가 굉장하다" 문구에 **사운드·색·숫자 크기**를 묶고, 도감 등록 종에 상성 아이콘 |
| 코어 루프 = 행동→보상→투자. 방치는 양념 | Kinniburgh 2017 · AFK Arena 해부 2019 | 메인 CTA는 **전투**, 보상은 **종자·변이 카드**, 투자는 **로드아웃**. 열매 게이지는 "돌아올 이유"로만 |
| 안 할수록 돌아올 이유가 커진다(오프라인 성장), 초반 성장은 빠르게 | Pecorella GDC 2015·2016 | 첫 세션 안에 1→2단계 완성, 앱 종료 시 "돌아오면 자라 있음" 표시 |
| 애착 = 이름 + 고유성 + 함께 성장. 완성했을 때만 애착(IKEA 효과) | Masuda 2000 · Norton 2012 | 이름 짓기는 유지(단 첫 심기는 기본 이름 자동), 단계 완성 순간을 연출 |
| 임의로 묶어도 "세트"면 채우고 싶어진다 | Barasz 2017 | 도감 140/140 대신 **행성별·타입별 5칸 소세트** |

## 3. 첫 세션(10분) 설계 — 반드시 일어나야 할 순간 5개

| 분 | 순간 | 화면이 해야 할 일 |
|---|---|---|
| 0~1 | 첫 화면에 결정이 하나만 | 빈 화분 + "종자를 심자" 한 줄 + 탭 타깃 하나. 잠긴 슬롯·전투 버튼·티어 정보는 **심기 전엔 숨김** |
| 1~2 | 심기 = 1탭 | 확인창 생략(기본 이름 자동, 나중에 연필로 변경). 심는 순간 도트 스프라이트가 화분에 "돋아나는" 연출 0.6초 |
| 2~4 | 첫 전투, 첫 상성 피드백 | 강화 모달 자동 오픈 폐지. 심기 직후 CTA = "첫 전투". 상대 성향·⚠️ 큰 기술 예고와 상성을 보고 스킬을 고르는 결정 1회(상대 다음 수 전체 공개는 PvP 때문에 폐기, 2026-09-11). 결과는 플래시·숫자·문구·사운드 동시 |
| 4~7 | 승리 → 보상 개봉 → 투자 | 종자 1 + 변이 카드 1 개봉 연출(기존 `openRewardReveal`) → "카드를 장착해 보자" 한 줄 → 로드아웃에 꽂기 |
| 7~10 | 1→2단계 완성 + 돌아올 이유 | 첫 성장 단계 전환 연출(기존 evo 키프레임) → 종료 직전 화면에 "돌아오면 자라 있어요" 게이지 + 도감 소세트 1/5 |

이 다섯 개는 전부 기존 시스템(종자·전투·보상 개봉·진화 연출·열매 게이지)으로 만들 수 있다. 새 시스템이 아니라 **순서와 노출 제어**의 문제다.

## 4. 검증 계획 (12명 비공개 테스트)

- **RITE**: 5~6명씩 2라운드. 1라운드 중에도 2~3명마다 고쳐서 다음 사람에게 검증(Medlock 2002). 마지막 3~4명은 검증용으로 남긴다.
- **think-aloud**: 최소 4명은 첫 10분을 녹화하고 개발자는 말하지 않는다(Nielsen 2012). 로그는 "멈춘 시각 · 화면 · 추정 이유" 세 칸.
- **혼자 하는 인지적 워크스루**(Wharton 1994): 매 화면 4문항 — 올바른 행동을 시도할까? 그 행동이 가능함을 알아챌까? 행동과 효과를 연결할까? 진전을 볼 수 있을까?
- **5초 테스트**(Perfetti 2007): 메인·전투·탐사 화면을 5초 보여주고 "뭘 할 수 있나"를 묻는다.
- **질문지 10문항**(플레이 직후, 두 방향 척도, 예/아니오 금지 — Bromley 2022): ① 처음 10분이 기본 설명에 도움/방해(1~7) ② 안내 뒤 준비됨/안 됨(1~7) ③ "뭘 해야 하지?" 멈춘 빈도(1~5)+그 화면 ④ 상대 다음 행동 알기 어려움/쉬움(1~7) ⑤ 스킬이 왜 먹혔는지 이해(1~7) ⑥ 카드 5칸·스킬 6칸이 단순/복잡(1~5, 3 적정) ⑦ 가장 애착 가는 식물과 이유·이름 붙였는지 ⑧ 닫을 때 다시 열면 뭐가 달라질지 분명/불분명(1~7) ⑨ 도감 빈칸 채우고 싶은 마음(1~7)+어느 칸 ⑩ 정보·숫자가 너무 많은 화면과 뺄 것.

## 5. 가독성·조작 규칙 (전 화면 공통)

플랫폼 1차 문서(Apple HIG · Material/Android · WCAG)로 수렴한 수치. 현재 실측과의 격차가 곧 작업 목록이다.

| 규칙 | 기준 | 현재 | 조치 |
|---|---|---|---|
| 탭 히트 영역 | ≥ 48×48 CSS px, 간격 ≥ 8px (Material/Android 48dp · Apple 44pt) | 슬롯 55×43, 설정 37×36, 화면당 14~19개 미달 | 시각 크기는 두고 **패딩으로 히트 영역** 확보. 슬롯 격자 3×2 → 높이 48 이상 |
| 본문 글자 | ≥ 12 CSS px (Apple 11pt · M3 11sp 하한), 10px 이하 금지 | 7px×11, 9px×11~23 | 7px 라벨 전면 제거(슬롯 라벨은 아이콘+툴팁으로), 9px→12px |
| 흘깃 읽는 숫자 | HUD 재화·레벨·판정·데미지는 24px 이상 (NN/g glanceable) | 재화 15px, 판정 문구 13px | HUD·판정·데미지 팝업 2배 |
| 픽셀 폰트 | 원 크기 정수배로만 (갈무리11 = 12px, 14 = 15px) | 파일 없음 → 시스템 폰트 | **갈무리 woff2 동봉**(OFL) + `@font-face`, 크기는 12·24·36 배수만 |
| 대비 | 텍스트 4.5:1, 아이콘·상태 3:1 (WCAG 1.4.3/1.4.11) | 청록 라벨·흐린 서브텍스트 미측정 | 팔레트 토큰 3종(주 텍스트·보조·비활성)으로 정리 후 실측 |
| 상태 표현 | 색만으로 구분 금지 | 잠금·선택이 색+아이콘 | 유지, 강화 가능/불가는 아이콘 병기 |
| 눌림 피드백 | 100ms 이내 눌림 상태 (Apple · NN/g 0.1s) | `:active` scale(.98) 일부 | 전 버튼 공통 눌림 + `touch-action: manipulation` |
| 하단 탭 | 3~5개, 항상 라벨, 내비게이션 전용 | 5탭 라벨 있음 | 유지. "함선"은 v1.0에서 숨김 검토(§7) |
| 주 행동 위치 | 중앙~하단 중앙 큰 버튼 1개 (Hoober 2017: 중앙 정확도 7mm vs 가장자리 11~12mm) | 전투 시작이 하단 중앙 — 좋음 | 유지. 코너 설정 버튼은 48으로 |
| 한 화면 결정 | ≤ 4개, 나머지는 점진 공개 (Cowan 3~5청크 · Nielsen 점진적 공개) | 메인 20개 | §7 메인 재배치 |
| Android 필수 | 뒤로가기·제스처, 백그라운드 복귀 상태 보존, 세이프 에어리어, Reduce Motion | 미확인 | 비공개 테스트 전 실기 확인 항목 |

## 6. 전투 피드백·전환 타이밍 (게임 필)

근거는 세 층이다. UI 모션은 **Material(모바일 진입 225·퇴장 195·표준 300ms, 400ms 초과는 굼뜸, transform/opacity만)**, 전투 판정은 **포켓몬 Emerald 디컴파일 원본**(공격 애니 → 상성 효과음 → 피격 점멸 32f → HP바 1HP/프레임 → 메시지 64f), 주스는 **원칙**(Juice it: 트윈·스쿼시·파티클·셰이크·사운드 겹쌓기 / Vlambeer: 히트스톱 1~2f·넉백·영구성)이다. 원 강연 두 편은 수치를 제시하지 않으므로 아래 값은 근거에서 유도한 추론이며, 배속 2×에서는 전부 절반이 된다. 60fps 기준 1f = 16.7ms.

| 단계 | 권장값 | 현재 | 근거 |
|---|---|---|---|
| 버튼 눌림 반응 | ≤100ms, 스케일 0.96 (50~100ms) | 일부만 `:active` | RAIL·Nielsen·Swink 100ms, M3 short1~2 |
| 방 전환(하단 탭) | 총 300ms = 퇴장 195(가속) + 진입 225(감속), 관계 약하면 fade-through. **뒤 화면 비침 제거** | roomEnter 반투명 겹침 | Material v1 duration/movement |
| 전투 진입 | 300~375ms 와이프/슬라이스(포켓몬 CLOCKWISE_WIPE 계열), 400ms 초과 금지 | VS 연출 다단 | Material 큰 전환 375, pokeemerald 전환 목록 |
| 선공 판정 카드 | 533ms(32f) 유지 | 950ms | B_WAIT_TIME_SHORT |
| 행동 카드 | 800ms(48f) 유지 후 공격 애니 | 950ms | B_WAIT_TIME_MED |
| 공격 애니(48×56) | windup+attack 4~6프레임 × 100ms | 통짜 transform | Cassette Beasts 100ms/f |
| 히트스톱 | 일반 2f(33ms) · 굉장 3f(50ms) · 급소 5~6f(83~100ms), 상한 8f | 없음 | Nijman 1~2f, Celeste 3f, Sakurai "상한" |
| 피격 표현 | 흰 플래시 2f → hurt 3f×100ms(또는 포켓몬식 4f on/off ×4) + 넉백 6px | 흔들림 약함 | Cassette Beasts hurt 3f, pokeemerald 32f |
| 스크린셰이크 | trauma 방식(일반 +0.2·굉장 +0.5, 흔들림 = trauma²), 150~250ms 선형 감쇠, 오프셋 1~2 논리픽셀 | 없음 | Eiserloh GDC 2016, Morrill |
| HP바 감소 | 1HP/f, 총 상한 1.0s, ease-out. 색 >50% 초록 · >20% 노랑 · ≤20% 빨강 | 즉시 | pokeemerald CalcNewBarValue |
| 데미지 숫자 | 24px, 수명 1.0~1.2s, 40px/s 상승, 후반 페이드. 치명·굉장 32px·진한 색·2s 잔류·팝 스케일 | 22px 팝업(눈에 안 띔) | Terraria 위키, Grasp/Wayline 관행 |
| 상성 문구 | 효과음은 타격 순간, 문구는 HP바 완료 후 1.07s(64f) | 문구가 먼저 | pokeemerald effectivenesssound→resultmessage |
| 대기 애니 | 6~8f × 100ms 루프(최소 3f·1px 바운스), 25% 대체 idle | 화분 흔들림만 | Cassette Beasts, itch idle 튜토리얼 |
| 2배속·스킵 | 전투 UI 상시 2× 토글 + 연출 생략. 배속 시 히트스톱 최소 1f, 팝업 최소 0.6s | 없음 | 포켓몬 Battle Scene OFF, Masters AUTO, HSR 2× |
| 로딩 | <1s 무표시(스켈레톤 즉시), 1~10s 스켈레톤, >10s 진행률 | — | NN/g, Luke W |
| 접근성 | `prefers-reduced-motion`이면 셰이크 0·전환은 opacity만 | 없음 | MDN |

한 턴 목표 길이: 현행 ≈4.0s → **약 2.6s**(카드 533 + 행동 800 + 공격 500 + 피격/HP 800), 2배속 1.3s. 판정을 빠르게 하는 게 아니라 **말하는 시간을 줄이고 보여주는 시간을 늘리는** 재배분이다.


## 7. 화면별 설계

원칙: **새 시스템을 만들지 않는다.** 이미 있는 연출(키프레임 60여 종)·시스템(보상 개봉·진화·열매)을 순서와 노출로 다시 엮는다.

### 7-1. 타이틀 → 첫 진입
- 유지: 타이틀 구성. 변경: "게임 시작" 첫 탭 시 **이름 입력·설명 없이 메인으로**. 설정은 유지.
- 첫 진입 메인 = "빈 화분 + 한 줄 + 한 버튼". 잠긴 슬롯 격자·티어 3칸·리그·미션 배너·가방/도감 버튼은 **첫 식물이 생길 때까지 숨김**. 가방 FAB만 남긴다.

### 7-2. 심기 (4단계 → 1탭)
- 화분 탭 → 가방에서 종자 탭 → **즉시 심기**. 확인창은 "다른 이름 짓기" 연필로 이동. 첫 심기는 기본 이름 자동.
- 심는 순간 연출 0.6초: 화분에 도트 스프라이트가 아래서 솟아오름(기존 `fighterIn` 변형) + 흙 튐 파티클 + 짧은 사운드.
- **강화 모달 자동 오픈 폐지.** 심은 뒤 화면은 메인이고, 다음 CTA는 "첫 전투".

### 7-3. 메인(식물 있음) — 결정 1개, 정보 4개
- 위: 식물 슬롯 격자(보유분만, 잠긴 칸은 "다음 해금 Lv.N" 한 칸으로 압축).
- 중앙: 식물 144px + 이름 + **체력·에너지 바 2개**(숫자 8칸 폐지 → 관리창으로 이동).
- 아래: 큰 버튼 "토너먼트 시작"(현재 티어·다음 상대 이름 한 줄 포함). 미션·3v3 리그는 승리 2회 뒤 해금되는 순서로 **점진 공개**.
- 보조: 가방·도감 FAB 유지(48px). 상단 HUD: 레벨·재화 24px.

### 7-4. 관리(강화·변이·스킬)
- 진입은 식물 탭. 탭 순서를 **스킬 → 변이 → 강화**로(첫 세션의 결정은 로드아웃이고 강화는 재화가 생긴 뒤). 강화 카드 8칸은 "체력·공격·방어·기동" 4칸을 먼저, 나머지 4칸은 접기(점진 공개).
- 모든 수치 옆에 바. 강화 가능/불가는 색+아이콘.

### 7-5. 상점
- 비공개 테스트 빌드에서 **"구글 스토어 결제 예정" 카드와 원화 가격 전부 제거**(정책 위험·혼란). 크레딧 상점(소모품·화분)만 남긴다. IAP는 결제 연동 후 별도 빌드.

### 7-6. 탐사
- 첫 진입 시 한 줄 안내 + 첫 목표 행성 1개 하이라이트(펄스). 행성명 12px 이상, 잠긴 행성은 라벨 대신 자물쇠+해금 조건 툴팁.
- 탐사 결과 팝업은 "종자 획득 → 도감 소세트 n/5" 를 같이 보여준다(세트 프레이밍).

### 7-7. 양육
- 잠긴 6칸을 "다음 해금 Lv.4" 한 칸으로 압축. 열매 게이지는 바 + 남은 시간 텍스트. 앱 종료 시 "돌아오면 자라 있어요" 토스트(오프라인 진행 표시)는 ①방치 결정과 연동.

### 7-8. 함선
- v1.0 비공개 테스트에서는 **탭 숨김**(정체성과 안 이어지고 안내가 없음). 출시 후 오픈월드 확장 때 다시.

### 7-9. 전투 (§6 타이밍 표와 함께)
- 무대: 상대 위·나 아래 대각 배치 유지. **무대 높이를 줄여** 빈 어둠을 없애고(스프라이트 96px 기준 무대 ≈ 화면 45%), 남는 높이는 스킬 바에.
- ~~상대 의도: 매 턴 상대 카드 위에 의도 아이콘 + 예상 위력(Into the Breach·StS 방식)~~ → **폐기(2026-09-11 사용자 결정):** PvP 예정이라 사람 상대에겐 줄 수 없는 정보. P0-C에서 구현했다가 되돌림. 3코스트+ 큰 기술 ⚠️ 예고(종류 숨김)와 성향 표시만 유지.
- 판정 순서(현행 유지) + **피격 연출 강화**: 흰 플래시 2프레임 → 넉백 6px → 데미지 숫자 24px 이상(치명타 32px·색 구분) → HP 바 감소는 0.4초 이징. 상성 문구는 색·크기·사운드 3종 세트.
- 대기: 스프라이트 대기 프레임(2~4) 자동 생성 + 화분 흔들림 유지.
- **배속 2× 토글 + 연출 스킵(탭)** 추가. 반복 전투의 4초 턴이 이탈 원인이 된다.
- "⚡ 에너지" 줄바꿈 수정(라벨 `white-space: nowrap`).

### 7-10. 결과·보상
- 승리 → 보상 개봉(기존 `openRewardReveal`) → **"장착해 보자" 한 줄 + 로드아웃 바로가기**(투자 단계로 연결). 패배 → "상성이 불리했어요: 🔥 vs 💧" 한 줄 힌트(오류 회복).

## 8. 1주일 스프린트 배치 (비공개 테스트 전 = P0)

| 일 | 작업 | 근거 절 |
|---|---|---|
| 1 | **P0-A 첫 세션 재배선**: 잠긴 슬롯·티어·배너 첫 식물 전까지 숨김 / 심기 1탭(확인창 → 연필) / 강화 모달 자동 오픈 폐지 / 심기 직후 CTA "첫 전투" | §3, §7-1~7-3 |
| 2 | **P0-B 가독성**: 갈무리 woff2 동봉 + `@font-face` / 7·9px 라벨 제거·12px 하한 / HUD·판정·데미지 24px / 히트 영역 48px 패딩 / `touch-action` + 공통 눌림 | §5 |
| 3 | **P0-C 전투 피드백**: 판정 타이밍 표 적용(sleep 재배분) / 흰 플래시·넉백·히트스톱 / 데미지 숫자 크기·색 / HP바 이징·색 임계 / 2× 토글 / ~~상대 의도 매 턴 표시~~(폐기, PvP) / "에너지" 줄바꿈 | §6, §7-9 |
| 4 | **P0-D 정리**: 상점 IAP 카드 제거 / 함선 탭 숨김 / 방 전환 fade-through 300ms(뒤 비침 제거) / 결과 화면 "장착해 보자" 연결 / 패배 힌트 | §7-5·7-8·7-10 |
| 5 | **셀프테스트 + 인지적 워크스루 4문항 전 화면** + 5초 테스트 3화면 / 실기(Android) 뒤로가기·복귀·세이프 에어리어 확인 | §4, §5 |
| 6~7 | 비공개 테스트 1라운드(5~6명, think-aloud 4명) → RITE 수정 | §4 |

P1(1라운드 뒤): 메인 스탯 8칸 → 바 2개 + 관리창 이동, 탐사 첫 목표 하이라이트, 양육 잠금 압축, 대기 프레임 자동 생성, 스켈레톤 로딩.
P2(출시 후): 스크린셰이크 trauma 시스템, 도감 소세트 프레이밍, 벤치마크 8항목(①방치·②리텐션…)은 기존 선택 시트대로.

기존 결정과의 관계: benchmark-proposals의 ①방치 ②리텐션 ④교배 ⑥도감 보상은 이 문서의 §3 "돌아올 이유"·"소세트"와 맞물린다. 선택은 그 시트에서 하고, 이 문서는 **어떻게 보여줄지**만 다룬다.

## 9. 상충·미검증
- "한 화면에 결정 1개"는 그 문구 그대로의 1차 출처가 없다. Hick's Law + Cowan 3~5청크 + Nielsen 점진적 공개 + Material "가장 두드러진 버튼은 하나"를 합친 실무 규칙.
- 터치 타깃: Apple 44pt / Material·Android 48dp / WCAG AA 24px. 48을 설계 하한, 44 예외 허용.
- 엄지 존: "하단 중앙이 자연 존"(Ingram 2016) vs "사용자는 중앙을 선호하고 파지는 수 초마다 바뀐다"(Hoober 2013·2017). 주 행동은 중앙~하단 중앙, 고정 히트맵 맹신 금지.
- 히트스톱 길이는 장르별 5~15f(대전) vs 2~3f(인디 액션). 턴제 포켓몬은 히트스톱 없이 점멸 32f. 우리는 2~6f로.
- 피격 플래시 "1~2프레임 흰색"은 근거 약함 → Cassette Beasts 공식 hurt 3f×100ms를 기준선.
- 포켓몬 HP바 속도: 코드 1HP/f 채택(Smogon 보고는 자체 모순).
- "F2P 70%가 첫 몇 분에 이탈"은 2013년 단일 세션 소개문.
- 방치형 세션 벤치마크(8분×5.3회)는 GameAnalytics 단일 원천.
- KS X 3253(국내 모바일 접근성)의 9mm·3:1 수치는 검색 스니펫 단일 출처.

## 10. 출처 (핵심만 — 전체는 조사 원문 3편, 100여 건)
- 플랫폼: [Apple HIG Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) · [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) · [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) · [Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) · [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) · [Android Core app quality](https://developer.android.com/docs/quality-guidelines/core-app-quality) · [Material 접근성 48dp](https://m1.material.io/usability/accessibility.html) · [Material Duration & easing](https://m1.material.io/motion/duration-easing.html) · [Material Movement](https://m1.material.io/motion/movement.html) · [M3 MotionTokens](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt) · [WCAG 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) · [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [web.dev RAIL](https://web.dev/articles/rail) · [web.dev animations](https://web.dev/articles/animations-overview) · [Chrome 300ms tap delay](https://developer.chrome.com/blog/300ms-tap-delay-gone-away)
- UX 이론: [NN/g 10 휴리스틱](https://www.nngroup.com/articles/ten-usability-heuristics/) · [게임 적용](https://www.nngroup.com/articles/usability-heuristics-applied-video-games/) · [응답시간 3한계](https://www.nngroup.com/articles/response-times-3-important-limits/) · [진행 표시](https://www.nngroup.com/articles/progress-indicators/) · [점진적 공개](https://www.nngroup.com/articles/progressive-disclosure/) · [글랜서블 타이포](https://www.nngroup.com/articles/glanceable-fonts/) · [Hoober 파지 연구](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php) · [Hoober 터치 정확도](https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php) · [Cowan 2001](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/44023F1147D4A1D44BDC0AD226838496/S0140525X01003922a.pdf/the-magical-number-4-in-short-term-memory-a-reconsideration-of-mental-storage-capacity.pdf) · [Hodent GDC17](https://celiahodent.com/gamers-brain-part-3-ux-engagement-immersion-retention-gdc17-talk/) · [Hodent Fortnite UX](https://www.gamedeveloper.com/business/understanding-the-success-of-fortnite-a-ux-psychology-perspective) · [GameAnalytics FTUE](https://www.gameanalytics.com/blog/tips-for-a-great-first-time-user-experience-ftue-in-f2p-games) · [Marvel Snap 해부](https://www.deconstructoroffun.com/blog/2023/5/23/marvel-snap-the-definitive-deconstruction) · [Nunes & Drèze 2006](https://academic.oup.com/jcr/article-abstract/32/4/504/1787425)
- 재미·루프: [Sid Meier GDC 2012](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions) · [Into the Breach 명확성](https://www.gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-) · [StS Intent](https://slaythespire.wiki.gg/wiki/Intent) · [Brode 복잡도/깊이](https://www.hearthpwn.com/news/2195-ben-brode-on-defining-complexity-depth-and-design) · [Rosewater New World Order](https://magic.wizards.com/en/news/making-magic/new-world-order-2011-12-05) · [Bulbapedia Type](https://bulbapedia.bulbagarden.net/wiki/Type) · [Bulbapedia Gen VII](https://bulbapedia.bulbagarden.net/wiki/Generation_VII) · [Ryan·Rigby·Przybylski 2006](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf) · [Kinniburgh 코어 루프](https://mobilefreetoplay.com/bible/crafting-strong-core-loop/) · [AFK Arena 해부](https://www.deconstructoroffun.com/blog/2019/6/6/afk-arena-puts-lilith-into-the-billionaire-club) · [Pecorella GDC 2015](https://archive.org/stream/GDC2015Pecorella/GDC2015-Pecorella_djvu.txt) · [Pecorella Math of Idle](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i) · [Quantic Foundry idle](https://quanticfoundry.com/2016/07/06/idle-clickers/) · [Masuda·Sugimori 2000](https://lavacutcontent.com/sugimori-masuda-developer-interview/) · [IKEA 효과](https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2011.08.002) · [Pseudo-set framing](https://www.hbs.edu/ris/Publication%20Files/Psuedo%20Set%20Framing_2b3dd94c-fffd-4659-866d-fb8963cf6ce2.pdf) · [Rasche 2017 포켓몬GO](https://pmc.ncbi.nlm.nih.gov/articles/PMC5399220/)
- 검증법: [NN/g think-aloud](https://www.nngroup.com/articles/thinking-aloud-the-1-usability-tool/) · [인지적 워크스루](https://www.usabilitybok.org/cognitive-walkthrough/) · [5초 테스트](https://articles.centercentre.com/five_second_test/) · [5명이면 85%](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/) · [RITE](https://www.jpattonassociates.com/wp-content/uploads/2015/04/rite_method.pdf) · [Pinelle 게임 휴리스틱](https://dl.acm.org/doi/10.1145/1357054.1357282) · [Bromley 설문](https://gamesuserresearch.com/how-to-write-a-playtest-survey/) · [PlaytestCloud FTUE 문항](https://help.playtestcloud.com/en/articles/6332229-survey-questions-for-playtesting-your-game-s-tutorials-and-first-time-user-experience)
- 게임 필: [Juice it or lose it](https://gdcvault.com/play/1016789/Juice-It-or-Lose) · [Art of Screenshake](https://www.youtube.com/watch?v=AJdEqssNZ-U) · [Eiserloh 스크린셰이크 GDC 2016](https://archive.org/stream/GDC2016Eiserloh/GDC2016-Eiserloh_djvu.txt) · [SmashWiki Hitlag](https://www.ssbwiki.com/Hitlag) · [Sakurai 히트스톱](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) · [Game Feel 정의](https://www.gamedeveloper.com/design/game-feel-the-secret-ingredient) · [pokeemerald battle_scripts](https://raw.githubusercontent.com/pret/pokeemerald/master/data/battle_scripts_1.s) · [pokeemerald battle.h](https://raw.githubusercontent.com/pret/pokeemerald/master/include/constants/battle.h) · [pokeemerald battle_interface.c](https://raw.githubusercontent.com/pret/pokeemerald/master/src/battle_interface.c) · [pokeemerald battle_transition.h](https://raw.githubusercontent.com/pret/pokeemerald/master/include/battle_transition.h) · [Cassette Beasts 애니 규격](https://wiki.cassettebeasts.com/wiki/Modding:Monster_Making_Guide_Part_1) · [Terraria 치명타](https://terraria.wiki.gg/wiki/Critical_hit) · [Bulbapedia Options](https://bulbapedia.bulbagarden.net/wiki/Options) · [Pokémon Masters AUTO](https://pokemonmasters-game.com/en-US/announcements/Update_1110_1W_1) · [Luke W 스켈레톤](https://www.lukew.com/ff/entry.asp?1797) · [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- 폰트: [갈무리](https://github.com/quiple/galmuri) · [Neo둥근모](https://github.com/neodgm/neodgm) · [물마루](https://github.com/mushsooni/mulmaru)
