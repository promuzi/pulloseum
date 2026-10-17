(2026-10-17 사용자 "용 처음 모습 뱀 > 이무기 > 용 느낌으로 · 처음부터 멋있으면 키웠을 때 강렬함이 약할 거 같아 · 다른 것들두" → 같은 날 다시 "새로 그린 애들 1 · 2번 진화 애들 다 바꿔줘 — 진화가 아니라 약간 성장한 느낌이야 지금은":
 오늘 그린 18종의 어린 · 자람 전부를 '작은 판'이 아니라 '다른 모습의 앞 단계(진화)'로 다시. 처음 11종(10-15 통과)과 게일바인 자람(10-15)은 그대로.
 같은 날 사용자 "나로 하자" — 파란 얼음 용(cut/draco_fruit_v2.png)은 새 종 프로스트드레이크(frost_drake · 태생 용족, cut/frost_drake.png)로, 둥근 드라코프루트는 보통 식물 → 드라코프루트 진화 = 열매 봉오리(용 알 아님) · 프로스트드레이크 = 알 → 새끼 용.
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

draco_fruit - C:\dev\pulloseum\tools\pixel\big\concept\cut\draco_fruit.png (a frosty dragon-fruit cactus - a plant, not a dragon) - draco_fruit_young.png: a small closed PITAYA BUD - smooth round pale pink-and-teal skin with tightly closed tiny bracts and a sleepy face peeking out; no frost, no spines, no side pads. - draco_fruit_teen.png: the bud has swollen into a young dragon fruit: its bracts start to curl outward with small icy tips, a few short red-tipped spines, the first small side pads, a light sprinkle of frost.

frost_drake - C:\dev\pulloseum\tools\pixel\big\concept\cut\frost_drake.png (a born ice dragon cactus) - frost_drake_young.png: an ICE DRAGON EGG - a small round frosty egg with a faint pattern of tiny blue scales, a sleepy face peeking out of a small crack at the top; no wings, no horns, no tail. - frost_drake_teen.png: a HATCHLING - a small scaly icy-blue cactus body just out of the egg (one piece of eggshell still sitting on its head), two tiny wing-pad nubs, two short horn nubs, a short curled tail root; no big wings, no frost breath.

fang_trap - C:\dev\pulloseum\tools\pixel\big\concept\cut\fang_trap.png - fang_trap_young.png: a tiny round CLOSED trap bud like a little clam on a short stem, soft fuzz instead of bristles, an innocent sleepy face; no teeth, no mouth showing. - fang_trap_teen.png: a small open trap mouth with short soft bristle-teeth and a cheeky grin, a second closed bud beside it.

blade_vine - C:\dev\pulloseum\tools\pixel\big\concept\cut\blade_vine.png - blade_vine_young.png: a small glowing EMBER SEED with one tiny sprout leaf on top and a sleepy face on the seed; no vine body yet. - blade_vine_teen.png: a short vine with two leaves that have turned into small sharp blades, an ember-bud head with one small flame.

toxi_cactus - C:\dev\pulloseum\tools\pixel\big\concept\cut\toxi_cactus.png - toxi_cactus_young.png: a small smooth round green cactus BALL with soft hairs instead of spines and a calm face; no flower, no purple. - toxi_cactus_teen.png: short spines grow with purple tips, a closed purple flower bud on top, one small poison drop.

ember_cap - C:\dev\pulloseum\tools\pixel\big\concept\cut\ember_cap.png - ember_cap_young.png: a tiny charcoal-brown BUTTON mushroom with one faint ember glow under the cap and a sleepy face; no flames, no frills. - ember_cap_teen.png: the cap opens and turns red-orange with a few glowing spots, short flame frills under the cap.

gat_cap - C:\dev\pulloseum\tools\pixel\big\concept\cut\gat_cap.png - gat_cap_young.png: a tiny plain round cream BUTTON mushroom with one small leaf; no hat. - gat_cap_teen.png: a taller mushroom whose cap has flattened and darkened into a small black brimmed gat with short strings, a small folded leaf like a closed fan.

mask_vine - C:\dev\pulloseum\tools\pixel\big\concept\cut\mask_vine.png - mask_vine_young.png: a round wooden ACORN-like seed with a simple carved smile and one tiny sprout; no vines yet. - mask_vine_teen.png: vines have sprouted and the seed head has grown into a half-carved Hahoe mask (one side finished, one side rough wood); vines swing like short sleeves.

drum_cactus - C:\dev\pulloseum\tools\pixel\big\concept\cut\drum_cactus.png - drum_cactus_young.png: a tiny round cactus BUD with one stubby spine like a drumstick and a curious face; no arms, no drums. - drum_cactus_teen.png: small arms appear, holding one small drum against its chest and one drumstick, tiny sparks.

lantern_vine - C:\dev\pulloseum\tools\pixel\big\concept\cut\lantern_vine.png - lantern_vine_young.png: a tiny frosty SEED-BUD with a sleepy face and one short curled tendril; no lantern, no tall stem. - lantern_vine_teen.png: a curled frosty vine with a small closed blue-and-red bud-lantern at its tip, no gold frame, no tassel.

frost_bell - C:\dev\pulloseum\tools\pixel\big\concept\cut\frost_bell.png - frost_bell_young.png: a tiny frozen SNOWDROP BUD like an ice-covered water drop with a sleepy face and two tiny leaves; no bell shape yet. - frost_bell_teen.png: one small bell flower hanging from a curved stem with frost veins; no extra bells.

volt_vine - C:\dev\pulloseum\tools\pixel\big\concept\cut\volt_vine.png - volt_vine_young.png: a small curled copper-green sprout like a COILED WIRE SPRING, with one tiny dim bulb bud on top and a face on the bud; no big leaves. - volt_vine_teen.png: the coil uncurls into a vine with two leaves and two small glowing bulbs, faint sparks.

stone_cap - C:\dev\pulloseum\tools\pixel\big\concept\cut\stone_cap.png - stone_cap_young.png: a round PEBBLE with a sleepy face and a tiny mushroom button cap sprouting from its top. - stone_cap_teen.png: the pebble has become a sturdy stalk and the cap widens into a flat rock slab with moss and one small crystal.

jelly_cap - C:\dev\pulloseum\tools\pixel\big\concept\cut\jelly_cap.png - jelly_cap_young.png: a small round JELLY BLOB like a water droplet with a tiny cap nub on top and a cute face; no tentacles. - jelly_cap_teen.png: a small jelly dome cap with three short drippy tentacles.

jar_cactus - C:\dev\pulloseum\tools\pixel\big\concept\cut\jar_cactus.png - jar_cactus_young.png: a small round cactus SEED-POD with a sleepy face and a tiny clay shard resting on top like a little hat; no arms. - jar_cactus_teen.png: small arms appear, holding a small clay cup up over its head (not a big jar yet), no water spilling.

goblin_cap - C:\dev\pulloseum\tools\pixel\big\concept\cut\goblin_cap.png - goblin_cap_young.png: a tiny round yellow BUTTON mushroom with one small horn nub and a cheeky face; no arms, no club. - goblin_cap_teen.png: small arms appear holding a short twig stick, the horn has grown a little.

crown_cap - C:\dev\pulloseum\tools\pixel\big\concept\cut\crown_cap.png - crown_cap_young.png: a tiny icy BUTTON mushroom with a single small ice crystal on top and a plain short stalk; no cape. - crown_cap_teen.png: a small tiara of three ice points and a short frosty collar.

vine_wind - C:\dev\pulloseum\tools\pixel\big\concept\vine_wind.png (adult; its teen stage already exists at C:\dev\pulloseum\tools\pixel\big\concept\stages\vine_wind_teen.png - open it too) - vine_wind_young.png only: a tiny curled FIDDLEHEAD sprout (a tight spiral) with a sleepy face and one small lavender ribbon leaf; clearly an earlier form than that teen.

When done (or if you must stop), reply with the list of saved files.
