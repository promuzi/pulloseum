# 서버 도입 — 클라우드 세이브 (Phase 1) + 결제·PvP 로드맵

> **상태:** 🔵 설계 확정 · 구현 대기 (2026-06-26 브레인스토밍)
> **상위:** 마스터 로드맵 #8(PvP/서버)·#9(출시) "서버 묶음" 마일스톤의 확정 설계.
> **다음 단계:** writing-plans로 Phase 1 구현 계획.

## 0. 한 줄 요약

Firebase(Auth + Firestore) 위에 **세이브 blob 1문서 동기화**를 얹어 크로스기기 클라우드 세이브를 구현하고 출시한다(Phase 1). 같은 백엔드 토대 위에 결제(Phase 2)·비동기 PvP(Phase 3)를 후속으로 쌓는다. 게임 로직(`index.html`)은 거의 무수정.

## 1. 동기와 전략 (왜·언제)

브레인스토밍에서 확정된 방향:
- **목표(궁극):** ① 수익화(인앱결제) ② 크로스기기 세이브 ③ PvP/랭킹/시즌 — 셋 다.
- **출시 순서:** **세이브만 먼저 출시**, 결제·PvP는 후속. (가장 빠른 시장 검증 + 리스크 최소 + 피드백 빠름)
- **백엔드:** **Firebase** (Auth + Firestore + Cloud Functions 한 세트, 구글 로그인·구글플레이 결제검증 연동이 가장 매끄럽고 무료티어 넉넉).

**Phase 1의 진짜 목적(전략적 프레이밍):** 유저 체감 가치(2기기/재설치 유저만 득)는 작지만, **돈이 올라타기 전에 백엔드를 실전에서 검증하는 안전한 리허설**이다. Phase 2 결제가 얹히기 전에 auth + Firestore + 보안규칙을 라이브에서 단련시킨다.

## 2. 아키텍처

```
┌─ 클라이언트 (index.html — 웹 브라우저 & Capacitor 안드로이드 공용) ─┐
│  게임 로직·상태 = 현행 유지 (localStorage 그대로)                    │
│  + [신규] cloudSave 모듈 (~200줄, 게임 코드와 분리된 얇은 레이어)    │
│     - Firebase Auth (익명 → 구글 링크)                              │
│     - 플랫폼 분기: 웹=signInWithPopup / 안드=네이티브 플러그인       │
│     - 저장 후킹: localStorage JSON → (디바운스·dirty) Firestore push │
│     - 부팅 시: Firestore pull → localStorage 주입 → 기존 부팅        │
└──────────────────────────────────────────────────────────────────────┘
              │ Firebase SDK (CDN <script>, 빌드 없음)
              ▼
┌─ Firebase ────────────────────────────────────────────────────────────┐
│  Auth        : 익명 계정 + 구글 로그인                                  │
│  Firestore   : users/{uid}/save (세이브 blob 1문서) + /backups          │
│  보안규칙    : 본인 uid 문서만 read/write                               │
│  Functions   : Phase 1 미사용 — Phase 2 결제검증부터 등판               │
└────────────────────────────────────────────────────────────────────────┘
```

**원칙:**
- **게임 로직 무수정.** `cloudSave`가 localStorage save/load를 감싸는 얇은 레이어. 세이브 포맷·`normalizeState`·전투·종 시스템 전부 그대로. 서버 다운돼도 로컬로 100% 동작(오프라인 완결 유지).
- **단일 파일 철학 유지.** Firebase는 CDN `<script>` + 인라인 모듈. 빌드 단계 안 생김.
- **Phase 1엔 Functions 없음.** 클라우드 세이브는 Firestore 보안규칙만으로 충분. Functions는 서버 시크릿이 필요한 Phase 2 결제검증부터.

## 3. 데이터 모델

```
Firestore:
  users/{uid}/
    save:                              ← 세이브 blob (soft, 클라가 씀)
      blob:        "<localStorage JSON, 필요시 LZ 압축>"
      compressed:  true|false
      rev:         42                  ← 단조증가 카운터 (충돌 판정)
      savedAt:     <서버 타임스탬프>
      device:      "기기 별명"          ← 충돌창 표시용
      gameVersion: "2026-06-26"         ← 버전 드리프트 방어
      summary:     { lv, plants, credits }  ← 충돌창 미리보기용 요약

    backups/{ts}:                       ← 충돌에서 진 세이브 1개 보관(되돌리기 보험)
      blob, rev, savedAt, summary

    [Phase 2 추가]
    entitlements:                       ← 유료 소유권 (hard, Functions만 write)
      paidCurrency, purchases[]         ← 보안규칙: 클라 write 금지
```

- **세이브는 통짜 blob 1개.** 전체 데이터를 Firestore 필드로 쪼개 옮기지 않는다(GPT 원안 "전체 Firestore 이전" 폐기). 읽기/쓰기 각 1회 → 무료티어로 수천 DAU 커버, 게임 코드 0 수정.
- **`rev` 카운터**가 충돌 판정의 전부. 로컬도 마지막 동기화 `rev`를 보관. `cloud.rev == local 동기화 rev`면 무충돌(그냥 push). 어긋나면 → §5 충돌 프롬프트.
- **`summary`** = blob 안 까봐도 양쪽 비교 가능하게 추출한 작은 요약.
- **entitlements 분리** = 치트 방지 핵심. 세이브 blob은 유저가 조작해도 무관(자기 싱글플레이). 유료재화만 Functions 권위로 격리.

## 4. Phase 1 동작 흐름

**부팅 시퀀스:**
```
1. ?dex=1 이면 cloudSave 통째 비활성 (도감 모드 — 부팅·세이브 스킵 분기 재사용)
2. Firebase Auth 상태 확인
   - 계정 없음   → 익명 로그인 자동 생성 (유저는 모름, 바로 플레이)
   - 익명 계정   → 로컬만 사용 (현행과 동일, 클라우드 미참조)
   - 구글 연동됨 → 자동 로그인 → Firestore pull
3. (구글 연동 시) cloud.gameVersion 체크 → 클라보다 신버전이면 덮어쓰기 차단+경고
4. cloud.rev vs local.rev 비교
   - 같거나 cloud 신규본 → 클라우드 → localStorage 주입
   - 어긋남(충돌)       → 충돌 프롬프트 1회 (§5)
5. bootWithSave() — 기존 부팅 그대로
```

**저장 시퀀스:**
```
기존 saveState() → [후킹] 구글 연동 상태면:
   - blob 해시가 직전과 같으면 skip (dirty할 때만)
   - 디바운스 5초 + push 간 최소간격 → Firestore push (rev++, savedAt 갱신)
   - 오프라인이면 큐에 보관 → 온라인 복귀 시 flush
```

**연동 UI:** 설정 화면 "구글 계정으로 백업" 버튼 1개(기존 세이브 내보내기/가져오기 옆). 누르면 `linkWithCredential`로 익명→구글 승격(익명 진행도 보존). 익명 유저에겐 재설치 시 유실 방지용 "백업하려면 연동" 가벼운 안내.

## 5. 충돌 처리

평소엔 클라우드가 정본(source of truth)이라 충돌이 안 난다(동시에 두 곳서 못 노니). 프롬프트는 **딱 두 순간**:

1. **연동 순간:** 익명 로컬 세이브가 있는데 연동하려는 구글 계정에 *이미* 클라우드 세이브 존재.
2. **오프라인 복귀:** 한 기기가 오프라인 동안 진행됐는데 클라우드가 그새 더 신규본.

→ 동일 모달: 양쪽 `summary`("[식물 12·크레딧 5000]" vs "[식물 10·크레딧 8000]") 표시 → 선택한 쪽이 이김 → **진 쪽은 `users/{uid}/backups`에 1개 백업**(되돌리기 보험). 하드락(동시접속 차단)은 1인 게임엔 거슬려서 안 함 — 나중 저장 우선.

## 6. 핵심 리스크와 결정 (구현 전 반드시)

1. **Capacitor 안드로이드 구글 로그인 = Phase 1 유일한 진짜 기술 리스크.** WebView에서 `signInWithPopup` 안 됨 → **네이티브 플러그인 `@capacitor-firebase/authentication`** 으로 네이티브 로그인 → `signInWithCredential`로 JS SDK에 브리지. **결정: Phase 1을 이 네이티브 로그인 credential 왕복 스파이크부터** 하고(실제 APK에서 증명), 그 뒤 동기화 로직을 쌓는다. Firebase에 **SHA-1 지문 등록** 필요.
2. **개인정보 처리방침 = Phase 1 출시 차단 요소(deferred 아님).** 구글 계정(PII) 저장 → Play Console "데이터 보안" 신고 + 처리방침 URL이 출시 필수. → 간단한 처리방침 페이지(GitHub Pages) Phase 1 체크리스트에 포함.
3. **세이브 크기.** Firestore 문서 한도 1 MiB. → **결정: 현재 세이브 크기 측정 → 200KB 초과 시 LZ-string 압축**(보통 5~10배) 후 blob 저장(`compressed` 플래그). 대역폭도 절약.
4. **무료티어 보호.** → **결정: 디바운스 5초 + dirty(blob 해시 변화)일 때만 + push 최소간격.** 실플레이 1분당 1 write 미만 → 무료로 수천 DAU.
5. **`?dex=1` 도감 모드는 Firebase 미초기화** (auth/firestore 안 켬, 기존 스킵 분기 재사용).
6. **버전 드리프트 방어.** 클라우드 세이브 `gameVersion` 보관 → 클라우드가 신버전이면 덮어쓰기 차단+경고(`normalizeState`는 forward만, backward는 차단).

## 7. 3단계 마일스톤

- **Phase 1 (지금):** Firebase 생성 + 네이티브 로그인 스파이크 + blob 동기화 + 충돌 + 보안규칙 + 처리방침 → Play Console 내부테스트 → **출시**. 결과 = 크로스기기 세이브 되는 게임.
- **Phase 2:** 인앱상품 1개 → Play Billing 연결 → **Cloud Function으로 purchaseToken 검증**(원안에 빠졌던 핵심) → entitlements doc에 재화 지급 → 내부테스트 결제확인 → closed test → 정식.
- **Phase 3:** 비동기(고스트) PvP — 상대 로드아웃 스냅샷 재생 + 랭킹/시즌. 같은 토대 위.

## 8. GPT 원안 17단계 → 수정본 매핑

| GPT 원안 | 판정 | 수정 |
|---|---|---|
| 1. HTML 백업 | ✅ | 유지 (git 태그 `pre-server`) |
| 2. Capacitor 빌드 확인 | ✅ | 유지 (디버그 APK 이미 성공) |
| 3. 데이터 목록화 | 🔁 축소 | blob 통짜라 목록화 불필요. "세이브 포맷 버전 필드 확인"만 |
| 4. Firebase 생성 | ✅ | 유지 |
| 5. Auth | 🔁 구체화 | 익명 기본 + 구글 링크 + 안드 네이티브 플러그인 |
| 6. 전체 Firestore 이전 | ❌ 폐기 | → "세이브 blob 1문서 동기화"로 교체 |
| 7. 유료재화만 서버 | ⏭ Phase 2 | Phase 1엔 유료재화 없음 |
| (신규) | ➕ | 충돌 처리 + 오프라인 큐 (원안 누락) |
| (신규) | ➕ | Firestore 보안규칙 (원안 누락) |
| (신규) | ➕ | 개인정보 처리방침 (Phase 1 필수) |
| 8~9. Play Console·AAB | ✅ | 유지 → **Phase 1 출시 지점** |
| 10. 인앱상품 1개 | ⏭ | Phase 2 시작 |
| 11. Play Billing | ⏭ | Phase 2 |
| 12. purchaseToken 백엔드 검증 | ✅⏭ | Phase 2 — **Cloud Function 필요**(원안에 Function 항목 없던 게 구멍) |
| 13. 검증 후 재화 지급 | ⏭ | Phase 2 (entitlements doc) |
| 14. 내부테스트 결제확인 | ⏭ | Phase 2 |
| 15. closed test | ✅ | 유지 |
| 16. 정식 출시 | ✅ | 유지 |
| 17. PvP/랭킹/시즌 | ⏭ Phase 3 | 같은 토대 위 비동기 고스트 PvP |

**가장 큰 교정:** 6번(전체이전) 폐기 → blob 동기화 / Function 항목 명시 / 충돌·보안규칙·처리방침 추가 / 결제를 출시 후로 분리.

## 9. YAGNI (Phase 1에서 안 하는 것)

- 전체 데이터 서버 스키마화, 실시간 동기화, 서버 권위 게임로직, 동시접속 하드락, 친구/소셜, 리더보드, 자체 서버 — 전부 후속 또는 폐기.
