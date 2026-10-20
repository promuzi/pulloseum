# 풀로세움 (Pulloseum) — 프로젝트 안내

> 먼저 [마스터 로드맵](docs/master-roadmap.md)을 읽는다. 현재 개발은 **v2 + 서버**이며 루트 `index.html`은 v1이다.
> **이어받기 = `C:\dev\pulloseum\docs\superpowers\specs\2026-10-16-v2-mvp-design.md` 맨 위 「최근 세션 맥락」.** 구현·배포·검수 상태와 다음 작업은 그곳에서만 갱신한다.
> 게임: **https://pulloseum.getchat.workers.dev/v2/** — 새 작업 대화에서 사용자에게 이 주소를 전달한다.

미래 우주 배경의 식물 수집·육성·턴제 전투 웹게임. Claude·Codex는 이 파일과 짝 지침을 둘 다 읽는다. 공통 프로젝트 규칙을 바꾸면 두 파일을 함께 갱신한다.

## 작업 순서

- 시작에 작업 트리 상태를 확인하고 `git pull`. 남의 미커밋 변경은 보존한다. 새 클론은 `git config core.hooksPath .githooks`.
- 방향·현황·문서 지도는 `C:\dev\pulloseum\docs\master-roadmap.md`가 유일 허브다. 코드·데이터·기획 변경과 같은 작업에서 해당 문서·결정 로그를 갱신하고 함께 커밋·푸시한다. 개발 로그는 `C:\dev\pulloseum\docs\CHANGELOG.md` 맨 위에 추가.
- 기록된 사용자 결정을 새 설계 권고로 뒤집기 전에는 확인한다. 과거 계획·검수 대기·구현 완료를 구분한다.
- 커밋 직전 브랜치·diff를 다시 확인한다. 내 파일만 올리고, 같은 파일에 남의 편집이 섞이면 내 변경 부분만 스테이징한다. 전체 `git add -A` 금지.
- 격리가 필요하면 프로젝트 내부 워크트리를 쓴다. 검증 서버가 어느 작업 트리를 읽는지 확인하고 남의 서버를 종료하지 않는다.
- 하위 에이전트는 보수적으로 사용한다. 대규모 호출 전에는 사용자에게 확인한다. 한도를 고려해 전체 문서를 반복해서 읽지 말고 필요한 절로 들어간다.
- **엑셀 소폭 수정:** 기존 파일의 요청 셀 수정 → 변경 부분 대조 → 필요한 기억만 짧게 기록한다. 전체 작성기 재실행·광범위한 재조사로 확대하지 않으며, 추가 검증도 실제 발견한 문제 범위로 한정한다(2026-10-19 시간·토큰 과소비 교정). 사용자가 직접 편집한 최신 파일의 이름·기간·메모가 옛 문서보다 우선하며, 메모의 제안·미결을 확정 규칙으로 바꾸지 않는다(2026-10-20).
- XLSX 시트 복제 시 스크롤 시작 셀은 고정 영역 뒤여야 한다. 고정 열 안을 가리키면 실제 Excel 열기에 실패한다(2026-10-20).
- **종 설계 단계 = 논의 · 기록만**(2026-10-18 사용자 교정 — 페탈로즈를 바로 코드에 넣었다가 되돌림): 사용자가 보낸 종 설계는 검토 후 `docs/superpowers/specs/2026-10-18-v2-species-skills.md` 그 종 절(원안 그대로)과 `docs/lore/plant-characters.md`(부제 · 한 줄 · 성격 · 컨셉 그대로)에 적는다. 설계 중 "추천대로 해" = 설계 반영이지 게임 적용이 아니다. 게임 적용은 여러 종을 **한 번에 적용 · 다듬기 · 밸런스(종 리그전) 뒤 올림** — 사용자가 "적용해"라고 할 때만.

## 실행·검증·배포

명령은 `C:\dev\pulloseum`에서 실행한다. v2는 HTTP 서버가 필요하며 v1처럼 파일을 더블클릭해서 실행하지 않는다.

```powershell
node server/index.mjs
# http://localhost:8790/v2/
node --test v2/src/battle/rules.test.mjs
node tools/test/savesafety.mjs
node tools/test/roomsave.mjs
node cf/test_cf.mjs
node cf/pagecheck.mjs https://pulloseum.getchat.workers.dev
```

- 서버는 내장 SQLite를 지원하는 Node가 필요하다. 각 변경 분야에 맞는 `C:\dev\pulloseum\tools\test\` 시험을 추가로 실행한다. UI는 실제 화면까지 확인한다.
- 화면 촬영: `node tools/shots/v2shots.mjs --label <이름>`. 짧고 긴 화면은 `--size 270x480`, `--size 270x660`으로 확인. 숨겨진 창은 rAF가 멈출 수 있어 `__advance(ms)` 사용.
- **Git 푸시만으로 서비스가 갱신되지 않는다.** 배포 절차 = [C:\dev\pulloseum\cf\배포.md](cf/배포.md). 빌드·Cloudflare 시험·업로드·실제 주소 확인을 구분한다.
- `workers.dev` 하위 주소 **getchat 변경 금지**. 이 기기의 `CLOUDFLARE_API_TOKEN`은 다른 프로젝트용이므로 Wrangler 실행 프로세스에서만 제거하고 기존 OAuth를 사용한다. 로그인 후 기존 pulloseum 배포 목록으로 계정을 확인한다. 서버 본체 교체가 늦을 수 있으니 화면 파일만 보고 서버 배포 성공을 단정하지 않는다. **업로드 성공은 wrangler 출력의 `Success` · `Current Version ID`로만 판정** — `pagecheck`는 옛 버전이 떠 있어도 통과한다(2026-10-18 OAuth 만료 `Failed to fetch auth token: 400`를 출력 거르기로 놓쳐 '올림'으로 착각할 뻔함 → 다시 로그인 = `node cf/login.mjs`).
- 저장소 파일을 Node 스크립트로 고칠 땐 줄을 `/\r?\n/`로 나눈다 — 작업본이 CRLF인데 편집 도구로 넣은 줄은 LF라 섞여 있어, 한 가지 줄바꿈으로 찾으면 표식을 못 찾는다(2026-10-18 두 번).
- 서비스 내리기는 저장소까지 지우므로 별도 사용자 확인이 필요하다.

## 코드 지도와 변경 규칙

| 대상 | 저장소 루트 아래 경로 |
|---|---|
| 시작·화면·입력 | `v2/src/main.js`, `v2/src/scenes/`, `v2/src/core/` |
| 그림·테마·카드 | `v2/src/art/` |
| 서버·화면 공용 규칙·데이터 | `v2/src/game/`, `v2/src/battle/` |
| 요청·PC 서버·대결 방 | `server/api.mjs`, `server/index.mjs`, `server/rooms.mjs` |
| Cloudflare 앞단·저장 | `cf/src/worker.js`, Durable Object Hub의 SQLite |

- 전투·성장 계산은 순수 함수로: 시드 난수 `rng()`를 쓰고 계산 경로에 DOM·`Math.random()`·`Date.now()`·UI 가변 전역을 넣지 않는다. 연출은 결과만 읽는다. v1 방치 시간은 기존 `gameNow()` 사용.
- 진행·보상은 서버 권위. 화면 작업은 `ops.js` 목록으로 연결한다. `main.js QUICK`에는 **난수·보상 추첨이 없는 작업만** 넣는다.
- 전투 계산 변경은 `catalog.js RULES_VER` 증가. 저장 모양 변경은 `logic.js MIGRATIONS`와 `SAVE_VER`, 기술·카드 ID 변경은 `catalog.js RENAMED`와 `SAVE_VER`를 함께 갱신한다. 기존 저장·진행 중인 판의 안전을 검증한다.
- 방 필드를 추가하면 `rooms.mjs pack/unpack`도 변경하고 방 저장 시험을 한다. 친구 대결 알림은 롱 폴링. 상대의 숨겨진 식물·기술·능력치를 응답이나 UI로 유출하지 않는다.
- 저장 DB·인증·관리 열쇠(`cf/.admin-key`)·실제 쿠폰 번호는 Git·문서·채팅에 넣지 않는다. PC 저장소와 배포 서버 저장소는 별개다.

## 화면·그림에서 유지할 결정

**해당 분야 수정 전 [v2 개발 참고](docs/v2-development-reference.md)의 관련 절을 읽는다.** 긴 구현 요령과 사용자 교정 원문을 그곳에 옮겼다.

- 그림은 정수 도트, 글자는 고해상도 프리텐다드. 색·창·단추는 공용 팔레트와 `theme.js`의 `T.*`, `holo/plate/tagBox/btnBody`를 사용한다. 현재 창은 하늘색, 강조는 주황.
- 가로 270칸, 짧은 화면 아래 정렬, 전투는 `tall`. 전투 위치는 `layOf`·`this.at(who)`로 맞추고 길어진 화면은 하늘보다 경기장 땅을 늘린다.
- 기술 카드 3×2 두 줄·보관 여섯, 패시브 장착 셋(변이 보관 셋). 변경 전 카드 설계와 최신 인계를 확인한다. 아래 단추는 카드 끝선에 정렬하고 같은 줄 단추 크기를 맞춘다.
- 항상 보이는 부가 설명은 추가하지 않는다. 안내는 처음 안내·물음표, 전투 글자는 짧은 머리 위 표현·기술 리본·승패만. 화면 MP 명칭은 **햇빛**, 내부 `energy` 이름은 유지.
- 새 화면 그림은 초기 로딩 `FIRST_*`, 글자는 글꼴 부분집합 포함 여부를 확인한다. 정적 그림은 캐시하고 반복 픽셀 계산을 피한다. 전체 화면 요청은 `pointerup`.
- 식물 제작은 [.claude/skills/plant-sprite/SKILL.md](.claude/skills/plant-sprite/SKILL.md)부터: **컨셉 → 96×112 도트 변환 → 종별 눈·밑동·흙 경계·중앙축 검수**. 종마다 개성을 유지하고 빛나는 틈 눈은 금지. 눈 위치를 직접 확인하지 못한 종은 깜빡임을 켜지 않는다.
- 그림 이어받기 = [2026-10-15 작업 계획](docs/superpowers/plans/2026-10-15-v2-plant-motion-fx-overnight.md) 맨 위 맥락. 장소·카드·식물 상세는 개발 참고의 해당 절로 들어간다.

## v1 작업과 과거 기록

- v1 작업 전 [축약 전 지침과 분야 색인](docs/history/2026-10-18-guides/README.md)의 해당 부분을 읽는다. 원문 전체를 보존했으며 옛 상태보다 현재 로드맵·사용자 결정이 우선한다.
- v1 데이터는 `index.html` 내부 `AlienPlantGameData`; 별도 `data/alien-plant-pvp-data.js`는 참고본이다. 종은 `SPECIES_CATALOG`, 기술은 `SKILL_LIB`, 생성기 소유 영역은 생성기를 고친다.
- 사용자 제공 `index.html`을 통째로 덮어쓰지 않는다. 기반 커밋·이미 적용된 변경부터 확인해 병합한다. 함수는 마지막 재정의가 활성일 수 있으니 줄번호 대신 심볼로 찾는다.
- 타입·속성 모두 쓰는 `grass` 일괄 치환 금지. 새 v1 카드는 정의뿐 아니라 드롭 풀까지 연결하고, `released:false`의 지역 발견 예외도 확인한다.
- v1 검증은 `__catalogSelfTest()`의 반환 실패 배열로 판정한다. v1의 localStorage·폰트·옛 화면 규칙을 v2에 적용하지 않는다. Godot 잔재는 현재 웹게임과 무관하다.
