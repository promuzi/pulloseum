---
name: plant-sprite
description: 풀로세움 v2 식물 도트 그림을 만들 때(새 종 추가·다시 그리기·움직임·공격·변이 연출). 코덱스 컨셉(누끼) → 96×112 도트 변환 → 검수(배치·흙 경계·눈) → 눈 타원 측정 → 생장 3단계 → 대기·특성 효과 → 공격 → 변이 → 휴대폰용 MP4 전달 → 커밋까지 순서와 명령을 담았다.
---

# 풀로세움 v2 식물 도트 파이프라인

도구 = `C:\dev\pulloseum\tools\pixel\big\`(convert.mjs 중심). 결과 = `out\conv\`. 규칙 정본 = 저장소 `CLAUDE.md`의 "v2 식물 그림" 항목, 이력 = `docs\CHANGELOG.md`.
사용자 취향(꼭 지킴): 규칙표로 종을 획일화하지 않음 · 옛 48×56 외형 참고 금지 · 눈은 그림 그대로(덧그리기 금지), 깜빡임만 · 무섭거나 징그러운 것 금지(없던 입·틈 속 빛나는 눈) · 결과는 휴대폰에서 보이게 MP4 · 산출물 안에 설명 글자 넣지 않음.

## 1. 컨셉(코덱스) — 비용: 새로 그리기 장당 5시간 한도 약 1~3%p, 참고 그림을 주고 그리기·편집 장당 약 4~8%p
- 새 종 = **처음부터 누끼(실제 알파)·화분·흙·그림자 없이, 밑동은 흙 높이에서 깔끔히 끝나게** 요청(`concept\PROMPT.md` 첫 줄 지시). 저장 `concept\cut\<키>.png`.
- 옛 컨셉(화분 있음)은 그대로 두고, 화분 색 지우기로 밑동이 깨지면 그 종만 **코덱스 편집 누끼**(`concept\CUT_PROMPT*.md` 형식 — "식물은 그대로, 화분·흙·자갈·그림자만 지우고 밑동을 흙 선에서 마감, 위치 이동 금지").
- 실행: `node "C:/dev/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs" task --write --cwd "C:/dev/pulloseum" --prompt-file "tools/pixel/big/concept/<요청>.md"`(백그라운드). 사용량은 `~\.codex\sessions\...\rollout-*.jsonl`의 token_count(rate_limits)로 전후를 재서 보고.

## 2. 변환 + 검수 (매번, 사용자에게 보내기 전에 직접 본다)
```
node tools/pixel/big/convert.mjs <키…>                 # 96×112 변환(축척·기준·몸 축 출력)
node tools/pixel/big/roster.mjs <키…>                  # 화분에 심은 전체 검수판
node tools/pixel/big/roster.mjs --guide <키…>          # 화분 축(세로)·흙선(가로) — 밑동이 축 위에 있나
```
- **없던 것·빠진 것:** 입처럼 보이는 눈, 끊긴 가는 줄기·깃털(→ `convert.mjs` `TUNE[키].fill` 0.3쯤), 사라진 눈, 흙 위 검은 점.
- **가상 3D 배치:** 기준 = 원래 컨셉 화분의 흙 타원 가운데(가로 = 화분 몸통 윤곽 가운데). 누끼도 원래 컨셉에서 잰다. 몸 축 3~20° 기울면 자동으로 바로 세움.
- **흙 경계·앞뒤:** `potblend.mjs`가 밑동을 흙으로 덮고(들쭉날쭉), 테 바깥까지 뻗은 덩어리(돌주먹 등)만 화분 앞에 둔다. 밑동 확대로 확인.

## 3. 눈 — `eyes.mjs`에 직접 잰 값
- 격자 확대로 원본(누끼면 누끼) 좌표를 읽어 `box: [[가운데x, y, 가로반지름, 세로반지름], …]`, `cheek: [볼 x, y]`. 원래 감은 눈이면 `closed: true`.
- `node tools/pixel/big/convert.mjs --blink <키…>` → `blink_all.png`(뜬 눈·반쯤·감음)을 꼭 본다. 감은 눈이 깔끔한 곡선(∪)이고 남은 점·엉뚱한 색이 없어야 함. 확인 못 하면 그 종은 깜빡임을 켜지 않는다(`convert.mjs` FX의 `blinkAt` 빼기).
- 색으로 눈을 자동으로 찾지 않는다(꽃잎·그늘로 번짐 — 2026-10-15 실측).

## 4. 생장 3단계(어린·자람·성체)
- 어린·자람은 코덱스가 단계마다 디자인해 누끼로(`concept\STAGES3_PROMPT.md` 형식, 크기는 성체의 85~95%). 내가 크기·모양을 임의로 바꾸지 않는다.
- `node tools/pixel/big/convert.mjs --stages <키>` → `<키>_stages.png`(위 원화·아래 도트, 같은 축척).

## 5. 움직임·효과·공격·변이
- 대기: `convert.mjs --anim --mp4 <키…>` → `<키>_idle.mp4` + 격자. 종별 설정은 `convert.mjs`의 `FX`(bob·squash·sway·petal·leaf·flutter, `fire`, `electric`, `amb` = `fx.mjs` 효과: shine·gems·twinkle·drips·bubbles·petals·wind·swirl·spores·dust).
  종 특성으로 고른다 — 금속·칼날·은빛 = shine, 수정 = gems+twinkle, 물 = drips(+bubbles), 바람 = wind(+petals·swirl), 버섯 = spores, 대지 = dust + 숨 작게, 말랑함 = squash 크게, 덩굴·리본 = petal·leaf 크게.
- 공격: `convert.mjs --attack --mp4 <키…>` → `attacks_all.mp4`·`attacks_sheet.png`. 종별 기술은 `attack.mjs` `ATTACKS`(kind·move·색·status). 큰 효과는 어두운 테두리 층(o), 입자는 p 층.
- 변이: `convert.mjs --forms --mp4 <키>` → `<키>_forms.mp4`·`_reveal.mp4`. 설계 = `docs\superpowers\specs\2026-10-15-v2-mutation-staging-design.md`.
- 검토 정지 그림: `--frames=a,b,c`(대기·공격 모두).

## 6. 전달·기록
- 사용자에게는 **SendUserFile로 MP4(+검수판 PNG)** — 휴대폰에서 재생되는 H.264(블렌더로 구움, `video.mjs`).
- `docs\CHANGELOG.md` 맨 위 항목 + 바뀐 결정은 `docs\master-roadmap.md` 결정 로그. 커밋은 내가 바꾼 파일만 골라서(`git add <경로>`), GIF·검토 띠는 저장소 제외(`out\conv\.gitignore`).
