# 레트로 픽셀 몬스터 스프라이트 품질 조사 (2026-09-10)

> 질문: 풀로세움 식물 몬스터 스프라이트(48×56, 정면, 화분 위, 표시 ×1/×2/×3, 현재 5종 확정본)를 **프로 수준으로 올리려면** 무엇을 바꾸고 무엇을 참고해야 하는가. 병렬 조사 4각도(기법·팔레트·벤치마크·도구), 출처 100여 건, 확인일 2026-09-10. 출처 없는 주장은 넣지 않았다. 각 절 끝에 출처 목록.

## 핵심 결론

1. **지금 "아쉬움"의 원인은 형태가 아니라 렌더링 규칙 세 가지다.** ① 그림자·외곽선을 원색 ×0.42로 만드는 직선 램프(탁함) ② 종마다 임의 hex(세트 통일감 없음) ③ 정수 좌표 도형을 그대로 래스터화한 뒤 정리를 안 함(계단 불균일·고아 픽셀·등폭 밴딩). 셋 다 파이프라인 코드로 고칠 수 있고, 형태(1차 디자인)는 그대로 둬도 된다.
2. **기준은 포켓몬 Gen 3(GBA)와 Cassette Beasts.** 64×64·16색·색당 3톤·광원 좌상단이 Gen 3 규격이고, 외곽선은 Cassette Beasts의 3분법(밑면 검정 / 광원 쪽은 색 외곽선 / 나머지 위쪽은 최암 톤)이 개발사 문서로 공개돼 있다. 48×56은 64×64의 75%라 같은 톤 예산을 그대로 쓴다.
3. **팔레트는 Resurrect 64를 마스터로 고정하고 속성 7램프(5단)를 배정한다.** 종당 9~11색. 변이 140종은 새 색을 만들지 않고 램프만 재배정한다(포켓몬 색광·Coromon Potential 방식).
4. **"진짜 격자"를 보장하는 AI는 Retro Diffusion API(장당 $0.03~0.18, 팔레트 강제·img2img)와 PixelLab($12/월)뿐.** 무료 경로는 Pixelorama + 무료 참조 생성 + unfake.js/pixel-art-fixer 격자 복원. 외부 에셋은 iOS까지 고려하면 CC0만.
5. **디자인 원칙(스기모리 1차 출처):** 아군 괴수가 출발점 / 너무 멋있으면 잊히므로 안 멋진 요소 하나를 일부러 남긴다 / 실루엣이 겹치면 요소를 교체한다 / 정의 특성은 하나. "3형태 규칙"은 1차 발언에 없다(2차 분석의 조언).

## 토큰 비용 (사용자 질문에 대한 답)

이번 세션 실측·추정. 판독기·조사 에이전트 사용량은 하네스가 보고한 값.

| 작업 단위 | 토큰 | 근거 |
|---|---|---|
| 종 1개 레시피 작화 | 출력 2~4k | 5종 작화분 |
| 시안 페이지 전체 재작성 | 출력 ~10k | 20KB 파일 1회 |
| 스크린샷·PNG 확인 1장 | 입력 1~2k | 이미지 1장 |
| 블라인드 판독 1회(5종, sonnet) | 63~65k | 서브에이전트 보고 4회 평균 |
| 웹 조사 에이전트 1개 | 100~140k | 이번 4개: 113k·100k·137k·140k |

- **이번 조사 = 약 49만 토큰**(에이전트 4개) + 본 세션 합성분.
- **35종 전체 작화 예상 ≈ 70만**: 작화 35×3k + 판독 7회×65k + 수정 라운드. 판독기를 haiku로, 종 10개씩 묶으면 절반 이하.
- 줄이는 법: 시안 페이지는 데이터 파일 분리(재작성 금지), 스크린샷 대신 작은 PNG Read, 아티팩트 재게시는 라운드마다 하지 않기, 판독은 "범주 확인"에만(심미 판정은 사용자).

## 우리 파이프라인에 적용할 것 (우선순위)

| 순서 | 변경 | 근거 절 | 비용 |
|---|---|---|---|
| 1 | **마스터 팔레트 고정**: Resurrect 64에서 속성 7램프 + 공용 외곽선/중성 램프. 레시피의 hex를 램프 인덱스로 치환 | 각도 2 | 코드 반나절 |
| 2 | **광원 좌상단 고정 + HSV 램프 셰이딩**: 그림자 = 램프 아래 단(−20° 한색), 하이라이트 = 램프 위 단(+20° 난색), 채도는 중간 피크. ×0.42 곱셈 폐기 | 각도 1 규칙 1·2 | 위와 함께 |
| 3 | **외곽선 3분법(selout)**: 밑면·그림자 쪽 = 검정(#2e222f), 광원 쪽 = 인접색보다 한 단계 어두운 같은 계열, 화분 접지면은 선 없음 | 각도 1 규칙 3, 각도 3 CB | 코드 반나절 |
| 4 | **래스터 후 클린업 패스**: doubles 제거 → 계단 길이 균일화(1,1,2,3 / 2,1,2) → 고아 픽셀 병합(눈·하이라이트 예외) → 등폭 밴딩 검사 | 각도 1 규칙 4·5·7 | 코드 하루 |
| 5 | **내부 AA만 짧게**, 바깥 가장자리 AA 금지, 디더링 off | 각도 1 규칙 6·9 | 코드 반나절 |
| 6 | **바이블 첫 줄 = 정의 특성 하나**, 실루엣 충돌 시 요소 교체, "안 멋진 요소 하나" 의도적으로 남기기 | 각도 3 원칙 2·3·7 | 문서 |
| 7 | 검증: 좌우 반전 + 그레이스케일 + 남색 배경 대비 3:1(몸통 기본색은 램프 3단 이상) | 각도 2 (4) | 스크립트 |
| 8 | 선택: Retro Diffusion API로 5~10종 히어로만 img2img(내 도형 레시피 + `input_palette`) → 판독 대조 | 각도 4 | $1~2 |

이 여덟 개는 전부 **형태를 다시 그리지 않고** 적용된다. 확정된 5종 레시피는 그대로 두고 렌더러만 바꾼 뒤, 전후 비교를 한 번 더 보여드리는 것이 다음 단계다.
## 각도 1 — 기법: 48×56 크리처를 프로 수준으로 올리는 규칙

조사 출처 7곳 이상(Slynyrd, Pedro Medeiros/saint11, Derek Yu, Michael Azzi 《Pixel Logic》, Arne Jansson, Lospec, Pixel Parmesan)에서 대부분 교차 확인. 확인일 2026-09-10.

### 우리 파이프라인이 지금 어기고 있는 것

| 현재 방식 | 어기는 규칙 | 결과 |
|---|---|---|
| 그림자·외곽선 = 원색 × 0.42 | 램프는 hue-shift(어두울수록 보라·파랑, 밝을수록 노랑, 스와치당 약 20°) | 탁하고 인공적인 "straight ramp" |
| 종마다 임의 hex 색 | 램프 간 공유 그림자·하이라이트 앵커 | 세트로 놓으면 통일감 없음 |
| 가장자리 1px 자동 외곽선 | selout: 인접색보다 한 단계 어두운 같은 계열, 광원 쪽은 밝게·접지면은 선 없음 | 모든 형태가 같은 두께로 둘러싸여 평평함 |
| 정수 좌표 polygon을 1:1 래스터화 | 계단 길이 균일(1,1,2,3 / 2,1,2), doubles·고아 픽셀 제거 | 곡선이 울퉁불퉁(jaggies), 노이즈 |
| 광원 없음 | 전 종 단일 광원(위-좌) | 그림자가 방향 없이 붙어 pillow shading에 가까움 |
| 외곽선 1px + 다음 톤 1px 등폭 | 밴딩 금지 | 격자가 강조됨 |

### 규칙 10개 (우선순위, 출처)

1. **광원 고정** 위-좌 단일 광원, 전 종 공통. — Slynyrd Pixelblog 6·31, Derek Yu, saint11 art.4
2. **HSV 램프** 어두운 쪽 −20° (보라·파랑), 밝은 쪽 +20° (노랑), 채도는 중간톤 최고·하이라이트 감소. — Slynyrd 1, saint11 6, Azzi, Arne, Pixel Parmesan
3. **selout** 외곽선 = 인접 픽셀보다 한 단계 어두운 같은 계열. 그림자 쪽은 램프 최암색, 광원 쪽 내부 선은 한 단계 밝게, 실루엣 외곽은 어두운 캡 유지, 화분 접지면은 선 없음. — Lospec Outlines P2, Derek Yu, Arne, imonk, Tsugumo
4. **라인 클린업 패스** doubles 제거 → 계단 길이 균일화 → 1px 두께 부위 제거. — Azzi, Arne, Lospec P1, saint11 1
5. **고아 픽셀 병합** 1픽셀 클러스터 자동 제거, 눈·하이라이트는 예외. — saint11 2, Slynyrd 2, Arne
6. **내부 AA만, 짧게** 계단 길이 >1인 내부 경계에만, 선분의 절반 이하, 45°·직선 제외, 바깥 가장자리 금지. — saint11 5, Azzi, Pixel Parmesan, Derek Yu
7. **밴딩 검사** 같은 길이·같은 방향 색 띠 탐지 → 압축 또는 터미네이터 근처로. — Azzi, saint11 5, Arne
8. **pillow shading 차단** 그림자는 광원 반대편 면에만, 대비는 과감히. — Derek Yu, saint11 4, Innkeep
9. **디더링 기본 off** 매끈한 면 금지, 화분 흙처럼 거친 재질에만 소량. — Derek Yu, Arne, Pixel Parmesan
10. **눈 규격** 2×2~3×2 + 검정 1px 눈썹 행, 동공 작게·흰자 남김(큰 동공 = 귀여움), 몸색과 고대비. — Sandro Maglione, Slynyrd 29, Innkeep

### 상충·주의
- 광원 쪽 외곽선을 "밝게/생략"(Derek Yu·Arne) vs "항상 대상과 배경보다 어둡게"(Lospec P2). 배경이 미정인 게임 스프라이트는 **실루엣 외곽은 어두운 캡 유지, 밝게 하는 건 내부 선만**으로 절충.
- hue-shift 방향은 다수설(빛=난색, 그림자=한색)이 기본값. 상대 규칙(Pixel Parmesan)과 스타일 예외(Tofu) 존재.
- 수치 "+15~25° / −20~30°"는 2차 정리 문서 것이고 원문(Slynyrd)은 "스와치당 +20°"만 말한다.

### 출처
- Slynyrd Pixelblog: [1 Color Palettes](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes) · [2 Texture](https://www.slynyrd.com/blog/2018/2/15/pixelblog-2-texture) · [5 Back to Basics](https://www.slynyrd.com/blog/2018/5/16/pixelblog-5-back-to-basics) · [6 Light and Shadow](https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow) · [15 Plant Life](https://www.slynyrd.com/blog/2019/3/7/pixelblog-15-plant-life) · [22 Top Down Characters](https://www.slynyrd.com/blog/2019/10/21/pixelblog-22-top-down-character-sprites) · [29 Anime Faces](https://www.slynyrd.com/blog/2020/7/28/pixelblog-29-anime-faces-and-hair) · [31 Shmup Sprite Design](https://www.slynyrd.com/blog/2020/12/14/pixelblog-31-shmup-sprite-design) · [47 Tiny Pixels](https://www.slynyrd.com/blog/2023/11/26/pixelblog-47-tiny-pixels) · [59 Tiny Sci-Fi Pixels](https://www.slynyrd.com/blog/2025/11/28/pixelblog-59-tiny-sci-fi-pixels)
- Pedro Medeiros (saint11): [1 Lines](https://saint11.art/pixel_art_articles/article1) · [2 Clusters](https://saint11.art/pixel_art_articles/article2) · [4 Shading](https://saint11.art/pixel_art_articles/article4) · [5 AA & Banding](https://saint11.art/pixel_art_articles/article5) · [6 Color](https://saint11.art/pixel_art_articles/article6) · [GIF 튜토리얼 전집 (CC BY 4.0)](https://github.com/saint11/Saint11Tutorials)
- Derek Yu: [Basics](https://www.derekyu.com/makegames/pixelart.html) · [Common Mistakes](https://www.derekyu.com/makegames/pixelart2.html)
- Michael Azzi 《Pixel Logic》: [gumroad](https://michafrar.gumroad.com/l/pixel-logic)
- Arne Jansson: [Pixel Art Tutorial](https://androidarts.com/pixtut/pixelart.htm)
- Lospec: [Outlines Part 1](https://lospec.com/articles/pixel-art-outlines/) · [Outlines Part 2: Using Color](https://lospec.com/articles/pixel-art-outlines-part-2-using-color/) · [Cyangmou Shapes and Outlines](https://lospec.com/pixel-art-tutorials/pixel-art-shapes-and-outlines-by-cyangmou) · [Brullov Clusters](https://lospec.com/pixel-art-tutorials/beginners-guide-clusters-by-artem-brullov) · [Vinik24 팔레트](https://lospec.com/palette-list/vinik24)
- Pixel Parmesan: [AA Fundamentals](https://pixelparmesan.com/blog/anti-aliasing-fundamentals-for-pixel-artists) · [Color Theory](https://pixelparmesan.com/blog/color-theory-for-pixel-artists-its-all-relative) · [Dithering](https://pixelparmesan.com/blog/dithering-for-pixel-artists)
- 기타: [imonk 몬스터 디자인 팁](https://itch.io/t/5120320/pixel-art-tips-monster-designs) · [imonk selout](https://itch.io/t/2422252/pixel-tutorial-selective-outlines) · [Sandro Maglione 눈 디자인](https://www.sandromaglione.com/articles/pixel-art-eyes-techniques-and-styles) · [Innkeep 8 Ways](https://innkeepgame.com/eight-ways-to-improve-your-pixel-art/) · [Tofu Hue Shifting](https://tofupixel.tumblr.com/post/758205573119557632/pixel-art-fundamentals-hue-shifting) · [Clip Studio 픽셀아트](https://www.clipstudio.net/how-to-draw/archives/161082)
## 각도 2 — 팔레트: 175종이 한 세트로 보이게 하는 법

### 핵심
- 통일감은 "종마다 색 고르기"가 아니라 **마스터 팔레트 하나에서 속성별 램프(5단)를 고정 배정**하고 램프 안에서만 음영을 만드는 데서 나온다. 포켓몬 GBA(스프라이트당 16색 팔레트, 가시 15색), Cassette Beasts(몬스터 공용 극소 팔레트, 1단 음영 + 가끔 하이라이트, 밑면 외곽선은 항상 검정), TIC-80(Sweetie 16 고정)이 실제 사례.
- 현재 ×0.42 그림자는 hue·채도가 그대로인 직선 램프라 탁하고, 남색 배경(#1a1c2c) 위에서 명도비 2:1 미만으로 가라앉는다(WCAG 공식 계산, 추론). 몸통 기본색은 배경 대비 3:1 이상인 단(5단 램프의 3단 이상)을 쓴다.
- 변이 140종은 새 hex를 만들지 않고 **같은 팔레트 안에서 램프만 재배정**한다(Gen II 색광 = 종별 2색 교체, Coromon Potential = 값이 색을 결정). Aseprite·Pixelorama Indexed 모드로 "그리지 않고 생성" 가능.

### 마스터 팔레트 후보 (Lospec, 2026-09-10 확인)

| 이름 | 색 수 | 다운로드 | 특징 | 7속성 적합도(추론) |
|---|---|---|---|---|
| **Resurrect 64** (Kerrie Lake) | 64 | 356,179 (최다) | 5단 램프 13개가 선형 정렬 | **높음** — 7속성 각각 다른 hue 램프 + 변이용 예비 6개 |
| Apollo (AdamCYounis) | 46 | 203,162 | 6단 램프 7개 | 중 — 노랑·시안 램프 없음(번개·빙결 분할 필요) |
| Endesga 32 | 32 | 203,427 | 고대비·고채도, 램프 2~4단 | 중 — 물/빙결 램프 공유 |
| AAP-64 | 64 | 82,102 | 빨강→노랑 8단 램프, 파스텔 | 중 |
| Lospec500 | 42 | 103,515 | 램프 3~7단 | 중 |
| Sweetie 16 / PICO-8 / DB32 | 16/16/32 | — | TIC-80 기본 / 판타지 콘솔 / Aseprite 기본 | 낮음(7램프 불가) |

### 램프 규칙 (교차 확인)
- 밝아질수록 채도를 낮추고 채도는 램프 중간에서 피크. hue shift는 한 단당 약 20°가 상한(Slynyrd). 그림자는 더 파랗고 덜 채도 높게, 빛은 더 노랗고 채도 높게(saint11). 채도는 종 모양 곡선(Pixel Parmesan).
- 초보자는 이론보다 **기존 팔레트를 그냥 고르라**(Derek Yu).

### 추천안: Resurrect 64 마스터 + 속성 7램프 고정 배정 (hex 근거: Lospec 페이지, 램프 분할은 추론)

| 속성 | 램프 1단(어두움)→5단(밝음) | 관례 대응 |
|---|---|---|
| 불 | `#ae2334 #e83b3b #fb6b1d #f79617 #f9c22b` | Fire E62829 ≈ 2단 |
| 물 | `#323353 #484a77 #4d65b4 #4d9be6 #8fd3ff` | Water 2980EF ≈ 4단 |
| 풀 | `#165a4c #239063 #1ebc73 #91db69 #cddf6c` | Grass 3FA129 ≈ 2~3단 |
| 대지 | `#7a3045 #9e4539 #cd683d #e6904e #fbb954` | Ground 915121 ≈ 2단 |
| 바람 | `#45293f #6b3e75 #905ea9 #a884f3 #eaaded` | Flying(구 관례) A98FF3 ≈ 4단 |
| 번개 | `#4c3e24 #676633 #a2a947 #d5e04b #fbff86` + 액센트 `#f9c22b` | Electric FAC000 — 액센트 10~20% |
| 빙결 | `#0b5e65 #0b8a8f #0eaf9b #30e1b9 #8ff8e2` + `#c7dcd0 #ffffff` | Ice 3DCEF3 ≈ 4~5단 |

- 공용: 외곽선 `#2e222f`, 중성 그림자 `#3e3546 #625565`, 중성 밝음 `#9babb2 #c7dcd0 #ffffff`. 변이 예비 램프: 빨강·연지·핑크·회녹·난색/한색 중성(원문 표 참조).
- 운용: 종당 색 = 속성 램프 5 + 외곽선 1 + 타입용 보조 램프 3~4 = **9~11색**(포켓몬 GBA 상한 15색 이내). 타입 5종은 hue가 아니라 보조 램프(갈색/회녹)와 실루엣으로 구분.
- 대안: Apollo 46 — 관리가 가볍지만 물/빙결 공유·순노랑 없음.

### 도구
- Lospec 다운로드 PNG/PAL/ASE/GPL/HEX, API `https://lospec.com/palette-list/{slug}.json`.
- 램프 생성기: [PalGen](https://maciaz.itch.io/palgen-oklch-palette-ramp-generator-for-aseprite)(Aseprite Lua, OKLCH, 2026-05) · [Wayline Color Ramp Generator](https://www.wayline.io/color-ramp-generator)(웹, 무료).
- 검증: 좌우 반전 + 그레이스케일로 음영 확인(Derek Yu). 남색 배경 대비 3:1 계산(WCAG 공식).

### 출처
- [Resurrect 64](https://lospec.com/palette-list/resurrect-64) · [Apollo](https://lospec.com/palette-list/apollo) · [Endesga 32](https://lospec.com/palette-list/endesga-32) · [AAP-64](https://lospec.com/palette-list/aap-64) · [Lospec500](https://lospec.com/palette-list/lospec500) · [Sweetie 16](https://lospec.com/palette-list/sweetie-16) · [Lospec API](https://lospec.com/palettes/api) · [팔레트 가져오기](https://lospec.com/palette-list/importing-palettes)
- [Slynyrd Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes) · [saint11 Color](https://saint11.art/pixel_art_articles/article6) · [Pixel Parmesan Color Theory](https://pixelparmesan.com/blog/color-theory-for-pixel-artists-its-all-relative) · [Derek Yu](https://www.derekyu.com/makegames/pixelart.html) · [Lospec Outlines P2](https://lospec.com/articles/pixel-art-outlines-part-2-using-color/)
- 게임 사례: [포켓몬 GBA 팔레트 분석 (Voliol)](https://voliol.neocities.org/articles/palettebackgrounds) · [Gen II 팔레트 (Voliol)](https://voliol.neocities.org/articles/genIIpalettes) · [Bulbapedia 색 팔레트](https://bulbapedia.bulbagarden.net/wiki/Color_palette_(Generations_I%E2%80%93II)) · [Cassette Beasts 공식 몬스터 제작 가이드](https://wiki.cassettebeasts.com/wiki/Modding:Monster_Making_Guide_Part_1) · [Coromon Potential](https://coromon.wiki.gg/wiki/Potential) · [ConcernedApe 인터뷰](https://mentalnerd.com/blog/getting-started-pixel-art-interview/)
- 속성색 관례: [Bulbapedia 타입 색 템플릿](https://bulbapedia.bulbagarden.net/wiki/Template:Fire_color) · [타입 색 gist(2016)](https://gist.github.com/apaleslimghost/0d25ec801ca4fc43317bcff298af43c3)
- [WCAG 1.4.11 대비 공식](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html) · [Aseprite Indexed](https://www.aseprite.org/docs/color-mode/) · [Aseprite Shading](https://www.aseprite.org/docs/shading/)
## 각도 3 — 벤치마크: 픽셀 몬스터 수집 게임들은 어떻게 그리나

### 기준 두 개
1. **포켓몬 Gen 3 (FRLG·Emerald, GBA)** — 64×64, 16색 팔레트(가시 15), 검정/근검정 외곽선, 색당 3톤(+가끔 하이라이트 1), 광원 좌상단. 48×56은 64×64의 75%라 같은 톤 예산을 그대로 쓸 수 있다. 시리즈 출발점이 "적이 아니라 **아군으로 싸우는 괴수(kaijuu)**"(스기모리 2000)이고, Gen 4부터 색·디테일이 늘어 "cluttered"해졌다는 분석(Compton 2020) → **레트로 심플 + 괴수** 두 조건을 동시에 만족하는 세대는 Gen 3까지.
2. **Cassette Beasts (2023, Bytten Studio)** — 조사 대상 중 유일하게 개발사가 규격을 문서로 공개. 64×64 그리드, 5톤 팔레트, 외곽선 3분법(**밑면은 항상 검정 / 광원(우상단)을 향한 면은 4번 'Outline' 톤 / 위지만 광원 방향 아닌 곳은 5번 최암 톤**), 곡선엔 어두운 픽셀로 AA, "뚜렷한 실루엣과 개성", "픽셀아트는 과한 디테일을 허용하지 않는다". 애니 규격(idle 6~8프레임·100ms, hurt 3프레임)도 공개돼 있어 다음 단계에 그대로 쓸 만하다.

### 게임별 표 (확인일 2026-09-10 · "추론"은 위키 파일 크기 실측 기반)

| 게임 | 캔버스 | 색 | 외곽선 | 비고 |
|---|---|---|---|---|
| 포켓몬 Gen 1 (GB 1996) | 40/48/56² | 4색(흑백+2) | 검정 | 190종 기획 → 메모리로 39종 삭제 |
| 포켓몬 Gen 2 (GBC) | ≤56² | 흑백 고정+종별 2색 | 검정 | 색광 = 2색 교체 |
| **포켓몬 Gen 3 (GBA)** | **64²** | **16색** | 검정/근검정 | 색당 3톤, 광원 좌상단 |
| 포켓몬 Gen 4 (DS) | 80² | 16색(추론) | 검정 | 주요색 4개+가 표준, "cluttered" |
| **Cassette Beasts (2023)** | **64²** | 5톤 팔레트 | 밑면 검정 + 색 selout | 공식 제작 가이드 공개 |
| Coromon (2022) | 고정 없음(위키 파일 140×132 등) | 미확인 | 미확인 | 30+프레임 애니, "옛 포켓몬·골든선 참고" |
| Monster Sanctuary (2020) | 미확인 | 미확인 | 미확인 | 진화 대신 고유종 다수(솔로 제약) |
| Disc Creatures (2019) | GB 스타일(≤56² 추론) | SGB 4계조 | 검정 | 후속작 World는 **GBA 스타일로 재작화 중**(2026) |
| Siralim Ultimate | ≈64²(추론) | 미확인 | 미확인 | 1,200+종 다크 판타지 |
| Dragon Quest Monsters (GBC 1998) | ≤48²(가변) | 4색 | 검정 | 토리야마: 큰 눈·큰 얼굴 요소·적은 선 |
| Digimon Anode Tamer (WS 1999) | 가변(성체 128×117) | 8계조/241색 | 미확인 | |
| Moonstone Island (2023) | ≈50²(추론) | 미확인 | 미확인 | "귀엽고 기발" → 우리 목표와 거리 |

제외(픽셀 아님): Nexomon Extinction(손그림), Kindred Fates(3D), Ova Magica(3D 치비).

### 포켓몬 디자인 원칙 — 1차 출처(개발자 발언)
1. **출발점은 아군 괴수.** 스기모리(2000): 판타지 RPG의 적 몬스터가 아니라 당신 편에서 싸우는 kaijuu. 초기 스케치는 귀여운 것·멋진 것·기어다니는 것·정체불명이 섞였고 디자이너 5~6명 스타일을 섞어 다양성. — [shmuplations](https://shmuplations.com/pokemon/)
2. **너무 멋있으면 잊힌다.** 스기모리(USUM 설정집): 너무 멋진 포켓몬엔 안 멋진 요소를, 너무 진지하면 밝은 요소를 **일부러** 넣는다. 오샤왓 주근깨를 빼면 얼굴이 덜 기억된다. — [Nintendo Everything 2018](https://nintendoeverything.com/ken-sugimori-on-balancing-pokemon-designs/)
3. **실루엣이 겹치면 요소를 교체.** 토네로스·볼트로스가 격투 타입과 실루엣이 겹쳐 뿔을 빼고 눈썹을 넣었다. 위압적 얼굴은 풍신·뇌신·아수라상에서. "토마토에 얼굴만 붙이면 유루캬라가 된다." — [닌텐도드림 2011-05 (Lava Cut Content)](https://lavacutcontent.com/ken-sugimori-nintendo-dream/)
4. **모티프는 친숙한 동물, 요소는 자제.** Patrat에 특이한 꼬리까지 주면 과하다. 애니메이션했을 때 재미있어 보이는지가 중요. 스타터는 처음엔 강해 보이면 안 되고 진화하면 강해진다. — [닌텐도드림 2011-01](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/)
5. **스타터 3종 = 쿨·진지·웃김 역할 분담.** — [Dorkaholics 2019](https://www.dorkaholics.com/ken-sugimori-reveals-the-secret-to-designing-starter-pokemon/)(2차 경유)
6. **"친구가 될 수 있을 것 같아야 한다."** 위협만으론 안 된다. 제임스 터너. — [Kotaku 2026-08](https://kotaku.com/pokemon-james-turner-art-character-designs-interview-2000727904)
7. **"3형태 규칙"은 스기모리 1차 발언으로는 없음.** 2차 분석(cjleo 2019, Creative Bloq 2026)에 "검정으로 채워도 알아보면 통과", "원·삼각·사각 단순 도형", "정의 특성 하나(사이덕 = 두통 오리)"가 있다. — [cjleo](https://cjleo.com/blog/a-shady-trick-for-designing-distinct-video-game-characters/) · [Creative Bloq](https://www.creativebloq.com/art/digital-art/what-artists-can-learn-from-30-years-of-pokemon-character-design)

### 우리에게 주는 시사점
- 색당 3톤·총 ≤15색·광원 좌상단·외곽선은 Gen 3 규격을 그대로 쓰되, 외곽선은 Cassette Beasts 3분법(밑면 검정·윗면 색)으로 부피감을 얻는다.
- 종당 "정의 특성 하나"를 바이블 첫 줄로. 실루엣이 겹치면 요소 교체(엠버오크·가이아록이 둘 다 "넓은 어깨"면 한쪽은 바꾼다).
- "너무 멋있으면 잊힌다"는 규칙은 사용자의 "멋있게" 요구와 긴장한다. 스기모리 방식은 멋진 몸에 **안 멋진 요소 하나**(주근깨·이상한 꼬리)를 남기는 것이다. 스포어캡의 졸린 눈, 아쿠아벌브의 대롱 주둥이가 그 자리다.

### 출처
- [Bulbapedia Pokémon sprite](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_sprite) · [Data Crystal Gen3](https://datacrystal.tcrf.net/wiki/Pok%C3%A9mon_3rd_Generation) · [PokéBase 64×64](https://pokemondb.net/pokebase/339724/what-pixel-size-are-thi-sprites-battle-pokemon-fire-leaf-green) · [PokéCommunity 64×64 16색](https://www.pokecommunity.com/threads/gba-64x64-16-colour-trainer-sprites.463927/) · [Cave of Dragonflies 스프라이팅 가이드](https://www.dragonflycave.com/spriting-guide/) · [PokéHeroes 가이드](https://pokeheroes.com/forum_thread?id=935) · [Game Developer: Gen 4 디자인 진화 (Compton 2020)](https://www.gamedeveloper.com/design/evolution-of-pokemon-design-generation-4) · [Helix Chamber 1996 내부 목록](https://helixchamber.com/2018/09/11/internallist/)
- [Cassette Beasts Monster Making Guide](https://wiki.cassettebeasts.com/wiki/Modding:Monster_Making_Guide_Part_1) · [Game Developer 2023](https://www.gamedeveloper.com/design/cassette-beasts-is-a-fun-rpg-that-turns-monster-into-mixtapes) · [Godot Showcase](https://godotengine.org/article/godot-showcase-cassette-beasts/)
- [Coromon 인터뷰 (Twinfinite 2021)](https://twinfinite.net/pc/coromon-interview-tragsoft/) · [Coromon Pixel Joint 구인글](http://pixeljoint.com/forum/forum_posts.asp?TID=24638) · [Monster Sanctuary 인터뷰](https://www.jpswitchmania.com/post/interview-027-denis-sinner-moi-rai-games) · [Disc Creatures 인터뷰 (Indie Tsushin 2023)](https://indietsushin.net/posts/2023-10-25-Interview-with-Satto.html) · [Disc Creatures World (RPGamer 2026)](https://rpgamer.com/2026/03/disc-creatures-world-releasing-this-year/) · [Siralim Ultimate (PC Gamer)](https://www.pcgamer.com/collect-and-combine-some-1200-monsters-in-creature-rpg-siralim-ultimate/) · [Game Boy Essentials 토리야마 분석](https://gameboyessentials.com/articles/cgb-bd3e) · [Moonstone Island (80.lv)](https://80.lv/articles/developing-a-zelda-pok-mon-inspired-creature-collecting-life-sim-game)
- 스기모리·터너: [shmuplations 2000](https://shmuplations.com/pokemon/) · [Nintendo Everything 2018](https://nintendoeverything.com/ken-sugimori-on-balancing-pokemon-designs/) · [닌텐도드림 2011-01](https://lavacutcontent.com/ken-sugimori-nintendo-dream-3/) · [닌텐도드림 2011-05](https://lavacutcontent.com/ken-sugimori-nintendo-dream/) · [Dorkaholics 2019](https://www.dorkaholics.com/ken-sugimori-reveals-the-secret-to-designing-starter-pokemon/) · [Kotaku 2026](https://kotaku.com/pokemon-james-turner-art-character-designs-interview-2000727904) · [cjleo 실루엣](https://cjleo.com/blog/a-shady-trick-for-designing-distinct-video-game-characters/) · [Creative Bloq 2026](https://www.creativebloq.com/art/digital-art/what-artists-can-learn-from-30-years-of-pokemon-character-design)
- 학습용 참고(재사용 불가): [Spriters Resource Monster Sanctuary](https://www.spriters-resource.com/pc_computer/monstersanctuary/) · [DQM GBC](https://www.spriters-resource.com/game_boy_gbc/dwmons/) · [Digimon WS](https://www.spriters-resource.com/wonderswan_wsc/digimonanode/)
## 각도 4 — 도구·AI·에셋·피드백 (2026-09-10 확인)

### 편집기

| 도구 | 가격 | 크리처 작업 핵심 | 라이선스 |
|---|---|---|---|
| **Pixelorama** | 무료(PWYW) | v1.2.2(2026-09-09). Indexed 모드, 팔레트, 픽셀퍼펙트 선, 비파괴 아웃라인·그라디언트 맵, Aseprite 파일 내보내기 | MIT |
| **Aseprite** | $19.99 / Steam ₩21,000 일회성 | Shading ink(램프 위에서 좌/우클릭으로 어둡게/밝게), Indexed 256색, CLI 스프라이트시트 내보내기 | 독점. 소스 빌드는 개인용만 허용(EULA 2g), 체험판은 저장 불가 |
| LibreSprite | 무료 | 2016 GPL 포크, v1.2(2025-03) | GPLv2 |
| Piskel | 무료 | 2017 이후 정체 | Apache 2.0 |
| Pyxel Edit | $9(2차) | 타일 우선이라 크리처엔 이점 적음 | 독점 |

"팔레트 잠금"은 Indexed 모드로 대신한다(양쪽 공식 문서).

### AI 픽셀 도구 — "진짜 격자"를 공식 보장하는 건 둘뿐

| 도구 | 가격 | 격자 | 참조 입력 | 상업 |
|---|---|---|---|---|
| **Retro Diffusion API** | RD Fast ~$0.03 / Plus ~$0.06 / Pro $0.18 장당, `check_cost` 무료 견적. 웹은 가입 시 50크레딧 | **예** (`upscale_output_factor=1` = 네이티브) | `input_image`+`strength`, `input_palette`(팔레트 강제), `reference_images` 9장(Pro만) | 약관 "소유권 주장 안 함", 상업 조항 명시 없음 → 문의 권장 |
| Retro Diffusion Aseprite 확장(로컬) | $65 / Lite $20 일회성 | 예 | Neural Pixelate, Palettize | 상업 가능(itch 명시). 6GB VRAM 가능 여부 미확인 |
| **PixelLab.ai** | 무료 체험 40회 → $12/월(장기 $9) | 예(16~512px 캔버스) | 참조 이미지 스타일 일치, 인페인트, 스켈레톤 애니 | ToS(2025-11) 상업 허용, 출력물로 모델 학습 금지, **API는 용도 제한(인게임 실시간·바이브코딩)** |
| Scenario | $15/월(무료는 상업권 없음) | RD Plus 호스팅 | 커스텀 모델 학습 | 유료부터 |
| Layer.ai | $10/월~ | 미확인 | image-to-sprite | 전 플랜 |
| Leonardo | 무료 150토큰/일 | **아니오**(후처리 필요) | 커뮤니티 모델 | 무료는 공개 생성 |
| 로컬 SD + Pixel Art XL LoRA (RTX 3050 6GB) | 0원 | **아니오** — 모델 카드: 8배 축소(Nearest) 필수 | ComfyUI img2img | RAIL++-M, 상업 가능 |
| pollinations.ai | 0원(단 GitHub README상 이제 API 키·Pollen 체계 도입) | 아니오 | — | — |

### 격자 복원 후처리 (전부 무료·MIT·GPU 불필요)
- [Retro-Diffusion/pixel-art-fixer](https://github.com/Retro-Diffusion/pixel-art-fixer) — 모델 불필요 CLI, 자사 벤치 77% 복원(이해상충 주의)
- [unfake.js](https://github.com/jenissimo/unfake.js) — 브라우저 데모, 스케일 검출·격자 정렬·팔레트 축소 / [unfake.py](https://github.com/painebenjamin/unfake.py)
- [Astropulse/pixeldetector](https://github.com/Astropulse/pixeldetector) · [Pixel-Extractor](https://github.com/univeous/Pixel-Extractor)(다중 스프라이트 분리) · [pixelit](https://github.com/giventofly/pixelit)(바닐라 JS 삽입 가능)
- ImageMagick `magick in.png -remap palette.png +dither out.png` — 프로젝트 팔레트 강제

### 에셋 (라이선스 주의: OGA FAQ — CC-BY·CC-BY-SA·GPL은 Apple App Store 약관과 충돌 → **iOS까지 가면 CC0만**)
- [Kenney Monster Builder Pack](https://kenney-assets.itch.io/monster-builder-pack) CC0, 170+ 부위 × 6색 → **변이 140종 조합 설계 참고**
- [Tiny Creatures](https://opengameart.org/content/tiny-creatures) CC0, 16×16 몬스터 100+ (실루엣 연구용)
- [LuizMelo Monsters Creatures Fantasy](https://luizmelo.itch.io/monsters-creatures-fantasy) CC0, 종당 28프레임 (애니 프레임 분배 참고)
- [itch CC0 Monsters 태그](https://itch.io/game-assets/assets-cc0/tag-monsters)
- [BOB Games Monsters & Plants](https://bob-games-studio.itch.io/free-pixel-animation-monsters-plants-pack) 식물 적 애니 — 라이선스 문구 없음(댓글로만 허용) → 배포 전 확인

### 피드백 커뮤니티
- [Lospec Discord](https://lospec.com/discord) 피드백 채널. **갤러리는 2023-06부터 AI 개입 작품 거부** → "AI 참조 후 직접 찍은 결과물"만, 과정 명시
- [Pixel Joint](https://pixeljoint.com/) 큐레이션 갤러리·주간 챌린지(규칙 원문 접근 실패)
- [DCinside 도트 마이너 갤러리](https://gall.dcinside.com/mgallery/board/lists/?id=pixelart) 국내 최대, 튜토리얼 공지, 외주 글 자제
- r/PixelArt 규칙 미확인(접근 차단)

### 추천 조합
- **0원**: Pixelorama(Indexed) + 참조는 pollinations/로컬 SD1.5 + 격자 복원 unfake.js/pixel-art-fixer + ImageMagick 팔레트 강제 + Kenney·Tiny Creatures(CC0) + 도트갤·Lospec 피드백. 판독 루프 대조 샘플은 PixelLab 무료 40회.
- **월 3만원 이내**: Aseprite ₩21,000 일회성 + Retro Diffusion API 선불 $5~10(175장 한 바퀴 = RD Fast $5.25, `input_palette`로 팔레트 강제, 내 도형 레시피를 img2img) 또는 PixelLab $12/월.

### 출처
- Aseprite: [FAQ](https://www.aseprite.org/faq/) · [EULA](https://github.com/aseprite/aseprite/blob/main/EULA.txt) · [Steam](https://store.steampowered.com/app/431730/Aseprite/) · [Shading](https://www.aseprite.org/docs/shading/) · [Color mode](https://www.aseprite.org/docs/color-mode/)
- [LibreSprite](https://github.com/LibreSprite/LibreSprite) · [Piskel](https://github.com/piskelapp/piskel/releases) · [Pixelorama itch](https://orama-interactive.itch.io/pixelorama) · [Pixelorama releases](https://github.com/Orama-Interactive/Pixelorama/releases) · [Pyxel Edit](https://pyxeledit.com/get.php)
- Retro Diffusion: [API examples](https://github.com/Retro-Diffusion/api-examples) · [웹앱](https://astropulse.itch.io/retrodiffusionai) · [Aseprite 확장](https://astropulse.itch.io/retrodiffusion) · [terms](https://www.retrodiffusion.ai/terms) · [system compatibility](https://astropulse.gitbook.io/retro-diffusion/aseprite-extension/retro-diffusion-for-aseprite/system-compatibility.md)
- PixelLab: [홈](https://www.pixellab.ai/) · [ToS](https://www.pixellab.ai/termsofservice) · [FAQ](https://www.pixellab.ai/docs/faq) · [API](https://www.pixellab.ai/pixellab-api) · 가격 2차 [jonathanyu](https://www.jonathanyu.xyz/2025/12/31/pixellab-review-the-best-ai-tool-for-2d-pixel-art-games/) · [gamedevaihub](https://gamedevaihub.com/retro-diffusion-vs-pixellab/)
- [Scenario pricing](https://www.scenario.com/pricing) · [Layer pricing](https://layer.ai/pricing) · [Leonardo commercial](https://intercom.help/leonardo-ai/en/articles/8044018-commercial-usage) · [Pixel Art XL (HF)](https://huggingface.co/nerijs/pixel-art-xl) · [A1111 Troubleshooting](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Troubleshooting) · [RTX 3050 실측](https://note.com/leal_toad1763/n/na2bea88de4cb?hl=en)
- [pixel-bench](https://github.com/Retro-Diffusion/pixel-bench) · [ImageMagick quantize](https://usage.imagemagick.org/quantize/) · [sd-palettize](https://github.com/Astropulse/sd-palettize) · [Pixelator](https://ronenness.itch.io/pixelator)
- [Kenney support](https://kenney.nl/support) · [OGA FAQ](https://opengameart.org/content/faq) · [Lospec AI 정책](https://lospec.com/articles/lospec-will-no-longer-be-accepting-ai-related-art-submissions) · [Lospec 커뮤니티 목록](https://lospec.com/pixel-art-communities) · [나무위키 도트갤](https://namu.wiki/w/%EB%8F%84%ED%8A%B8%20%EB%A7%88%EC%9D%B4%EB%84%88%20%EA%B0%A4%EB%9F%AC%EB%A6%AC) · [pollinations GitHub](https://github.com/pollinations/pollinations)
## 상충·미검증 사항

- **외곽선 밝기**: "광원 쪽은 밝게/생략"(Derek Yu·Arne) vs "항상 대상과 배경보다 어둡게"(Lospec). 절충 = 실루엣 외곽은 어두운 캡 유지, 밝게 하는 건 내부 선만. Cassette Beasts 3분법이 이 절충과 일치.
- **hue-shift 수치**: Slynyrd 원문은 "스와치당 +20°"뿐. "+15~25° / −20~30°"는 2차 정리 문서의 종합값.
- **어두운 단의 채도**: OpenGameArt 5장은 "어두울수록 채도 증가", Slynyrd·saint11은 반대. Pixel Parmesan의 "중간 피크"로 포괄.
- **Gen 4 색 수 16색**: 직접 문서 미확보(간접 근거 1개). Gen 4 캔버스 80×80은 3출처 일치.
- **Coromon·Moonstone 캔버스**: 위키 파일 크기가 원본 배율인지 확인 불가.
- **Retro Diffusion**: 크레딧 단위(98×98 vs 276×276)와 무료 크레딧(50 vs 20)이 출처마다 다름 → 최신 공식 페이지 값 채택. API 가격은 공식 GitHub 단일 출처. 상업 이용 조항 명시 없음(문의 권장). pixel-bench 결과는 자사 제작(이해상충).
- **PixelLab 요금**: 공식 페이지 JS 렌더로 미확인, 2차 출처 3개 일치($12/$24/$50).
- **pollinations.ai**: GitHub README상 API 키·Pollen 체계 도입 → 이번 세션에서 키 없이 동작한 것이 계속 유효한지 불확실.
- **접근 실패로 미확인**: Tsugumo 원문, Neil Blevins, Pixel Joint 규칙, r/PixelArt 규칙, Data Crystal·TCRF·Fandom·Spriters Resource(403/402).
- **"대부분의 2단계 진화가 원래 3단계"**(Nintendo Power 2000): 검색 스니펫에만 존재, 미검증.

## 출처
각 절 끝의 출처 목록이 전체다. 조사 에이전트 4개의 원문 보고는 세션 기록에만 있고 이 문서가 정본이다.
