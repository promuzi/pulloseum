# tools/pixel — 레트로 도트 스프라이트 렌더러 (2026-09-10)

브라우저로 `pulloseum-retro-v2.html`을 열면(로컬 서버 필요 — `.claude/serve.ps1`) 확정 5종을 v1/v2로 비교한다.

- `sprites-data.js` — 48×56 정수 좌표 도형 레시피(`SPR`)와 화분(`POT`). **형태의 정본.** 눈은 2×2 점, 밑동 y=38.
- `renderer-v2.js` — 렌더 규칙: Resurrect 64 마스터 팔레트 양자화(속성 램프 우대 + 종별 재질 오버라이드) → 고아 픽셀 병합 → 광원 좌상단 림 셰이딩(램프 단 ±1) → selout 3분법 외곽선(밑면 검정·광원 쪽 램프 −2·그늘 쪽 램프 0·접지면 선 없음) → ㄱ자 더블 제거. 근거 = `docs/sprite-quality-research.md`.
- `out/` — v2 산출 PNG(1×, 투명, 48×56)와 비교 시트. 게임 반입 시 `assets/sprites/`로 복사하고 `SPRITE_OVERRIDES`에 등록(표시 크기는 144·96·48 정수배로 맞출 것).
- 미구현: 계단 길이 균일화, 내부 AA, 밴딩 검사, 대기 프레임 자동 생성.
