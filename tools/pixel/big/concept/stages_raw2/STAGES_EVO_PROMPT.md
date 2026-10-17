(2026-10-17 사용자 "용 처음 모습 뱀 > 이무기 > 용 느낌으로 · 처음부터 멋있으면 키웠을 때 강렬함이 약할 거 같아 · 다른 것들두" → 같은 날 다시 "새로 그린 애들 1 · 2번 진화 애들 다 바꿔줘 — 진화가 아니라 약간 성장한 느낌이야 지금은":
 오늘 그린 18종의 어린 · 자람 전부를 '작은 판'이 아니라 '다른 모습의 앞 단계(진화)'로 다시. 처음 11종(10-15 통과)과 게일바인 자람(10-15)은 그대로.
 같은 날 사용자 "나로 하자" — 파란 얼음 용(cut/draco_fruit_v2.png)은 새 종 프로스트드레이크(frost_drake · 태생 용족, cut/frost_drake.png)로, 둥근 드라코프루트는 보통 식물 → 드라코프루트 진화 = 열매 봉오리(용 알 아님) · 프로스트드레이크 = 알 → 새끼 용.
 같은 날 사용자 "어린 모습 괜찮은 거 같기도 하고 — 일단 용만 좀 수정해줘 코덱스로, 나머지는 냅둬" → 이번 요청은 드레이크캑터 · 프로스트드레이크 둘만(18종 전체 안 = STAGES_EVO_PROMPT_full.md 기록).
 결과 → stages_raw2/<키>_<단계>.png → `node tools/pixel/big/greycut.mjs … --main` → stages/<키>_<단계>.png. 첫 판(stages_raw/)은 기록으로 남김.)

Task: for each plant creature below, redesign its earlier evolution stages (young and teen). The adult form already exists as the reference image given on its line (open only that reference image for that creature; do not modify it).

THE MOST IMPORTANT RULE - THESE ARE EVOLUTIONS, NOT GROWTH. The previous attempt failed because the young and teen looked like the adult just smaller and slightly simpler. That is wrong. Think of evolution lines in monster-collecting games, where each stage is a clearly different creature design of the same family:
- YOUNG = a distinct first form with a DIFFERENT BODY PLAN and silhouette: a seed, a bud, an egg, a button mushroom, a little snake, a coiled sprout, a pebble - small, round, humble, cute or awkward. It must NOT look like a miniature of the adult. Almost none of the adult's signature parts (no hats, crowns, weapons, drums, lanterns, wings, armor, many thorns).
- TEEN = a clearly different middle form: the body plan is changing toward the adult, and one or two signature parts appear but are small, partial or unfinished. Different proportions from both the young and the adult.
- ADULT = the reference (the dramatic final form). A player should feel a real transformation at every evolution.
Keep the family identity: same main colors, same eye style and face design, so it is clearly the same creature line.

Rules for every image:
- Size: young about 55 to 70 percent of the adult's height in the reference; teen about 80 to 90 percent.
- Same art style, painterly quality and lighting as the reference. Eyes clearly visible.
- Plain flat light grey background (#d9d9d9) filling the whole image, no gradient, no texture. No flower pot, no soil, no ground shadow, no floating effect lines or particles. The base ends cleanly at the bottom center, where it would enter the soil.
- Front view from slightly above, body facing front, eyes looking naturally (not staring into the camera).
- 1254x1254, centered horizontally, base at about 88 percent down the canvas. No text, no frame.

Save every image as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\stages_raw2\ using exactly the file names given. If the image tool saves files elsewhere, copy them there with those names. If a file with that name already exists, skip it. Do not create, modify or delete any other file, and do not commit. Generate each image only once. Keep going through the whole list; if you must stop early, the files already saved are kept.

Creatures (key - reference image - young design - teen design):

drake_cactus - C:\dev\pulloseum\tools\pixel\big\concept\cut\drake_cactus.png - drake_cactus_young.png: a small red cactus SNAKE - a slender, plain serpent-shaped cactus rising from the soil in a gentle S-curve, a simple snake head with round eyes, only a few tiny soft spines; no horns, no wings, no legs, no crest. - drake_cactus_teen.png: an IMUGI (the Korean great serpent that has not yet become a dragon) - a longer, thicker serpent cactus in a bold S-curve, a ridge of spines along its back, two small horn nubs, short whiskers, faint ember cracks between scales; still NO wings and NO legs.

frost_drake - C:\dev\pulloseum\tools\pixel\big\concept\cut\frost_drake.png (a born ice dragon cactus) - frost_drake_young.png: an ICE DRAGON EGG - a small round frosty egg with a faint pattern of tiny blue scales, a sleepy face peeking out of a small crack at the top; no wings, no horns, no tail. - frost_drake_teen.png: a HATCHLING - a small scaly icy-blue cactus body just out of the egg (one piece of eggshell still sitting on its head), two tiny wing-pad nubs, two short horn nubs, a short curled tail root; no big wings, no frost breath.

When done (or if you must stop), reply with the list of saved files.
