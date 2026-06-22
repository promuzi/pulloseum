# 세션 체이닝 가이드 (태오 원칙 #6)

큰 기능은 한 대화창에서 끝내지 말고 **리서치 → 기획 → 실행** 3창으로 쪼갠다.
각 단계는 **상태 파일만 남기고** /clear → 다음 창은 그 파일만 읽고 시작한다. (index.html 통독 금지)

## 흐름

| 단계 | 창에서 하는 일 | 산출 파일 | 다음 창 시작 지시 |
|---|---|---|---|
| 1. 리서치 | 관련 코드 위치·현행 동작·제약 조사 (file-explorer 서브에이전트 활용) | `docs/research-notes.md` | "research-notes.md만 읽고 기획해줘" |
| 2. 기획 | 플랜 모드로 설계·변경 범위·회귀 위험 정리 | `docs/plan.md` | "plan.md만 읽고 실행해줘" |
| 3. 실행 | plan.md 따라 구현 + preview 검증 | 코드 + `docs/CHANGELOG.md` 항목 | (완료) |

## 규칙
- 각 창은 60~70% 차면 [reset-handoff](../.claude/prompts/reset-handoff.md)로 요약 후 /clear.
- 큰 작업·PDF·9,796줄 파일 분석은 **플랜 모드 먼저**(태오 원칙 #4).
- 반복 탐색/요약은 Haiku 서브에이전트(`file-explorer`, `doc-summarizer`)에 위임(원칙 #5).
- 실행 단계 완료 시 CHANGELOG.md 맨 위에 날짜 항목 추가.

## research-notes.md / plan.md 템플릿
```
# research-notes (1단계 산출)
- 목표: 
- 관련 코드: index.html:라인 (함수명) — 현행 동작
- 제약/회귀 위험:
- 미해결 질문:

# plan.md (2단계 산출)
- 변경 요약:
- 단계별 작업: 1) ... 2) ...
- 건드릴 파일/라인:
- 검증 방법(preview):
```
