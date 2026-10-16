---
name: plant-sprite
description: 풀로세움 v2 식물 도트 그림을 만들 때(새 종 추가·다시 그리기·움직임·공격·변이 연출). 코덱스 컨셉(누끼) → 96×112 도트 변환 → 검수(배치·흙 경계·눈) → 눈 타원 측정 → 생장 3단계 → 대기·특성 효과 → 공격 → 변이 → 휴대폰용 MP4 전달 → 커밋까지 순서와 명령을 담았다.
---

# 풀로세움 v2 식물 도트 파이프라인

도구 = `C:\dev\pulloseum\tools\pixel\big\`(convert.mjs 중심). 결과 = `out\conv\`. 규칙 정본 = 저장소 `CLAUDE.md`의 "v2 식물 그림" 항목, 이력 = `docs\CHANGELOG.md`.
사용자 취향(꼭 지킴): 규칙표로 종을 획일화하지 않음 · 옛 48×56 외형 참고 금지 · 눈은 그림 그대로(덧그리기 금지), 깜빡임만 · 무섭거나 징그러운 것 금지(없던 입·틈 속 빛나는 눈) · 결과는 휴대폰에서 보이게 MP4 · 산출물 안에 설명 글자 넣지 않음.

## 1. 컨셉(코덱스) — 비용: 새로 그리기 장당 5시간 한도 약 1~3%p, 참고 그림을 주고 그리기·편집 장당 약 4~8%p
- 새 종 = **밝은 단색 회색 배경(#d9d9d9)·화분·흙·그림자 없이, 밑동은 흙 높이에서 깔끔히 끝나게** 요청(2026-10-17부터 — 투명 누끼 요청은 그림 품질이 떨어짐. 예 `concept\new3\NEW3_PROMPT.md`: 정면 몸 + 머리 20° 옆 · 시선 자연스럽게 · 상징 하나를 크게 · 몸에서 떨어진 효과 선 금지 · "Do not open any image file"). 받은 그림 → `node tools/pixel/big/greycut.mjs <원본> concept\cut\<키>.png [--main]`(--main = 몸에서 떨어진 바람 줄 · 물보라 지움 — 줄이면 점가루가 됨). ~~처음부터 누끼(실제 알파)~~(2026-10-15 방식).
- 옛 컨셉(화분 있음)은 그대로 두고, 화분 색 지우기로 밑동이 깨지면 그 종만 **코덱스 편집 누끼**(`concept\CUT_PROMPT*.md` 형식 — "식물은 그대로, 화분·흙·자갈·그림자만 지우고 밑동을 흙 선에서 마감, 위치 이동 금지"). 위치가 그대로라 눈 좌표·흙 기준은 원래 컨셉에서 잰 값을 그대로 쓴다.
- 실행: `node "C:/dev/codex-plugin-cc/plugins/codex/scripts/codex-companion.mjs" task --write --cwd "C:/dev/pulloseum" --prompt-file "tools/pixel/big/concept/<요청>.md"`(백그라운드). 사용량은 `~\.codex\sessions\...\rollout-*.jsonl`의 token_count(rate_limits)로 전후를 재서 보고.

## 2. 변환 + 검수 (매번, 사용자에게 보내기 전에 직접 본다)
```
node tools/pixel/big/convert.mjs <키…>                 # 96×112 변환(축척·기준·몸 축 출력)
node tools/pixel/big/roster.mjs <키…>                  # 화분에 심은 전체 검수판
node tools/pixel/big/roster.mjs --guide <키…>          # 화분 축(세로)·흙선(가로) — 밑동이 축 위에 있나
node tools/pixel/big/stemcheck.mjs [키…]               # 게임 묶음(어린·자람·성체)의 줄기 시작점 ↔ 화분 가운데 선(out/stem/stemcheck.png)
```
- **없던 것·빠진 것:** 입처럼 보이는 눈, 끊긴 가는 줄기·깃털(→ `convert.mjs` `TUNE[키].fill` 0.3쯤), 사라진 눈, 흙 위 검은 점, 잘린 밑동(어두운 대가 흙 지우기에 같이 지워짐 → 그 종은 누끼, 2026-10-15 버섯), 경계에 낀 엉뚱한 색 점(→ `convert.mjs <키> --probe=x,y` 로 그 칸 재질 확인, 2026-10-15 수련 빨간 점).
- **가상 3D 배치:** 기준 = 원래 컨셉 화분의 흙 타원 가운데(가로 = 화분 몸통 윤곽 가운데). 누끼도 원래 컨셉에서 잰다. 몸 축 3~20° 기울면 자동으로 바로 세움.
- **줄기 시작점 = 화분 가운데(2026-10-15 사용자 "식물의 줄기 시작점이 화분의 중앙에 오게"):** 흙 타원으로만 놓으면 컨셉에서 줄기가 비껴 그려진 만큼 비껴 남는다(타이드바인 +5칸 · 게일캑터 +5 · 게일바인 +4 · 페탈로즈 +3). 새 그림·단계를 넣을 때마다 `stemcheck.mjs` 가운데 선 판을 보고 `convert.mjs` **`STEM[출력 키]`**(판 칸, − = 왼쪽)를 적는다 — 줄기가 여럿이거나 잎·주먹에 가려 애매하면 밑동 덩어리 가운데·무게중심을 선에 맞춤(가이아록은 그대로). 표에 없는 그림이 1.5칸 넘게 비끼면 변환 로그에 ⚠ 경고. 대기실 의자 화분(12°)은 흙 띠가 얇아 밑동이 가려져 쏠림이 더 보이니 홈 화면으로도 확인.
- **화분 조각:** 누끼 없는 종은 컨셉 화분 테의 짙은 그늘·밝은 반짝임이 남아 몸을 돌려 세울 때 같이 기울어 우리 테 위에 붉은 금으로 보일 수 있다 → 주황·빨강 몸이 아닌 종만 `TUNE[키].potClean`(타이드바인).
- **흙 경계·앞뒤:** `potblend.mjs`가 밑동을 흙으로 덮고(들쭉날쭉), 테 바깥까지 뻗은 덩어리(돌주먹 등)만 화분 앞에 둔다. 밑동 확대로 확인.

## 3. 눈 — `eyes.mjs`에 직접 잰 값
- 격자 확대로 원본(누끼면 누끼) 좌표를 읽어 `box: [[가운데x, y, 가로반지름, 세로반지름], …]`, `cheek: [볼 x, y]`. 원래 감은 눈이면 `closed: true`.
- `node tools/pixel/big/convert.mjs --blink <키…>` → `blink_all.png`(뜬 눈·반쯤·감음)을 꼭 본다. 감은 눈이 깔끔한 곡선(∪)이고 남은 점·엉뚱한 색이 없어야 함. 확인 못 하면 그 종은 깜빡임을 켜지 않는다(`convert.mjs` FX의 `blinkAt` 빼기).
- 색으로 눈을 자동으로 찾지 않는다(꽃잎·그늘로 번짐 — 2026-10-15 실측).

## 4. 생장 3단계(어린·자람·성체)
- 어린·자람은 코덱스가 단계마다 디자인해 누끼로(`concept\STAGES3_<키>.md` 형식, 크기는 성체의 85~95%, 장당 5시간 한도 약 8%p·주간 약 1.2%p). 모양은 내가 바꾸지 않는다. 크기는 변환 때 몸집 기준으로 줄인다: 도트 면적이 성체의 어린 42% · 자람 72%보다 크면 그 비율까지 + 키 상한(어린 = 성체 키의 82%, 자람 = 성체 − 2칸 — 코덱스가 자람을 성체보다 크게 그려 판 위가 잘렸음). 덩치가 비슷해 차이가 안 보이는 종은 `convert.mjs` `TUNE[키].youngArea·teenArea`로 더 벌림(가이아록 34%·58%, 2026-10-15 "최종 생장이랑 큰 차이가 없어").
- 단계 그림(화분 없음)의 밑동 = 아래 8% 띠에서 몸 가운데에 가장 가까운 덩어리(줄기). 띠 평균을 쓰면 처진 바위 주먹·잎 끝이 밑동이 돼 몸 축이 틀어지고, 그걸 '기울었다'고 돌려 세워 오히려 기움(가이아록 자람 17.6°, 2026-10-15). 변환 로그의 `기준 (x, y) · 몸 축 …°`로 확인.
- 단계 그림도 눈을 따로 잰다: `eyes.mjs`에 `<키>_young`·`<키>_teen` 키로 box·cheek(안 재면 줄일 때 눈이 사라짐).
- `node tools/pixel/big/convert.mjs --stages <키>` → `<키>_stages.png`(위 원화·아래 도트, 같은 축척). 단계 그림 색은 성체 색 분포에 맞춘 뒤 줄인다(기본 `--match=1`, 눈 제외) — 코덱스 단계 그림은 테두리 빛·그늘이 세서 그대로 줄이면 노랑·검정 얼룩.

## 5. 움직임·효과·공격·변이
- 대기: `convert.mjs --anim --mp4 <키…>` → `<키>_idle.mp4` + 격자. 종별 설정은 `convert.mjs`의 `FX`(bob·squash·sway·petal·leaf·flutter, `fire`, `electric`, `amb` = `fx.mjs` 효과: shine·gems·twinkle·drips·bubbles·petals·wind·swirl·spores·dust).
  종 특성으로 고른다 — 금속·칼날·은빛 = shine, 수정 = gems+twinkle, 물 = drips(+bubbles), 바람 = wind(+petals·swirl), 버섯 = spores, 대지 = dust + 숨 작게, 말랑함 = squash 크게, 덩굴·리본 = petal·leaf 크게.
- 공격: `convert.mjs --attack --mp4 <키…>` → `attacks_all.mp4`·`attacks_sheet.png`. 종별 기술은 `attack.mjs` `ATTACKS`(kind·move·색·status). 큰 효과는 어두운 테두리 층(o), 입자는 p 층.
  무대 = v2 전투 배치(`stage.mjs`: 나 = 왼쪽 아래, 상대 = 오른쪽 위·좌우 뒤집힘, 바닥 = 화분과 같은 26° 평면). 날아가는 효과는 L → T 방향(`S.D`), 몸에 붙은 출발점은 `S.fx`로 좌우 뒤집기 — 가로로 고정된 오프셋(`L[0] + 12` 같은)을 새로 쓰지 않는다.
  땅을 타는 기술(`GROUND`)은 바닥 평면에서: 출발·도착 = 두 화분 굽 가장자리(`S.S0`·`S.E0`, 화분 뒤 반쪽이면 옆으로), 바닥에 눕는 것 = `P.f`, 서 있는 것 = `P.u`(깊이 = 바닥 닿는 줄 → 화분 앞뒤 가림), 먼지 = `P.s`(테두리 없음). 흙 높이(G) 줄을 바닥처럼 쓰면 화분 사이 허공을 지난다(2026-10-15 사용자 지적). 바닥 기술은 거꾸로(`_rev`)도 꼭 본다.
- 변이: `convert.mjs --forms --mp4 <키>` → `<키>_forms.mp4`·`_reveal.mp4`. 설계 = `docs\superpowers\specs\2026-10-15-v2-mutation-staging-design.md`.
- 검토 정지 그림: `--frames=a,b,c`(대기·공격 모두).
- 흔들림은 큰 원본을 매 장 다시 줄여 만든다. 줄 단위 정수 이동만 하면 가로 이음선이 움직여 보이고, 매 장 새로 줄이기만 하면 칸이 끓는다 → 앞 장 기준 문턱(hysteresis) + 변위가 고른 곳은 정수 이동 섞기(`mixedMaps`). 움직임을 고칠 때 이 둘을 빼지 않는다.
- 여러 명령을 이어 백그라운드로 굽는 중에 `convert.mjs`를 고치면 뒤 명령이 고친 파일을 읽는다 → 고친 뒤 `node --check tools/pixel/big/convert.mjs`부터.

## 6. 게임에 넣기(v2)
- `node tools/pixel/big/convert.mjs --export <키…>` → `assets/v2/plants/<키>.png·.json`(대기 64장 + 깜빡임 4장 × under·over 두 층) + `assets/v2/pots/`. 게임은 `v2/src/art/sprites.js drawBig(g, 키, 화분, 굽x, 굽y, {t, flip, flash})`로 화분 뒤 → under → 화분 앞 → over.
- 식물이 서는 무대는 1배 도트(2026-10-15 ①안): `bg.js arena1`·`pad1`(받침 세로 = 가로 × 0.4384). 2배 층(`common.js stage`)에 큰 판 식물을 넣지 않는다(칸 크기가 섞임).
- 확인: `node tools/shots/v2shots.mjs --label <이름> --only battle` → `tools/shots/out/<이름>/`.

## 7. 전달·기록
- 사용자에게는 **SendUserFile로 MP4(+검수판 PNG)** — 휴대폰에서 재생되는 H.264(블렌더로 구움, `video.mjs`).
- `docs\CHANGELOG.md` 맨 위 항목 + 바뀐 결정은 `docs\master-roadmap.md` 결정 로그. 커밋은 내가 바꾼 파일만 골라서(`git add <경로>`), GIF·검토 띠는 저장소 제외(`out\conv\.gitignore`).
