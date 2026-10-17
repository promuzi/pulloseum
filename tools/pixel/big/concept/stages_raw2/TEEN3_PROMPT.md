(2026-10-17 사용자 "마법사 풀 · 닌자 · 선인장 장승이 2와 3생장에서 외형 차이가 작아 — 확인하고 변화를 줘" → 셋의 자람(teen)만 다시. 첫 판 자람은 성체 상징을 거의 다 갖춘 '조금 작은 성체'였음 → 상징 하나만 작게 · 몸 비율을 다르게. 첫 판 = stages_raw2/v1/<키>_teen.png.
 결과 → `node tools/pixel/big/greycut.mjs stages_raw2/<키>_teen.png stages/<키>_teen.png --main`.)

Task: redraw ONLY the TEEN (middle) evolution stage of the 3 plant creatures below. For each creature, open only these two images and no other image file: its ADULT C:\dev\pulloseum\tools\pixel\big\concept\new9\<key>.png and its YOUNG C:\dev\pulloseum\tools\pixel\big\concept\stages_raw2\<key>_young.png, so the new teen sits clearly between them in the same family (same colors, materials and eye style). Do not open the old teen images.

THE PROBLEM TO FIX: the previous teens looked almost the same as the adult - they already had nearly all of the adult's signature parts, so growing from teen to adult felt like no change. The new TEEN must be a clearly different MIDDLE form, like a middle stage in a monster-collecting evolution line: the body plan is changing from the young toward the adult, ONLY ONE signature part has begun to appear and it is small and unfinished, and the proportions differ from both the young and the adult. A player must see a big, exciting jump from this teen to the adult. Height about 80 to 85 percent of the adult's.

Same drawing rules as the adult and young:
- Camera: view from the front and slightly above (about 25 degrees down), like a plant in a flower pot seen by someone standing in front of it - not from below.
- Pose and gaze: the body faces the front, but the head is turned slightly (about 20 degrees) to one side and the eyes look naturally toward that side - it does not stare into the camera. A relaxed, characterful stance with slight asymmetry.
- Bold, readable shapes; taller than wide; the lower stem narrows to about one third of the image width where it meets the soil line at the very bottom, so it fits in a small pot. Keep every part attached to the body - no separate floating effect lines, swirls or particles.
- Eyes clearly visible and big enough to survive at pixel size. Never glowing eyes in dark holes, no eyebrows, no fangs.
- Full, high-detail painterly illustration quality: warm rim light from above, soft gradients, hue-shifted shading (cool shadows, warm highlights). No pure black, no neon overload.
- Plain flat light grey background (#d9d9d9) filling the whole image, no gradient, no texture. No flower pot, no soil, no ground shadow, no props on the ground. The base of the creature ends cleanly at a flat soil line at the bottom, as if it grows out of soil that is not drawn.
- Full body, centered, filling most of the frame. Square image about 1024x1024 (or 1254x1254), no text, no labels, no watermark, no frame.

Creatures (key - adult it grows into / the new TEEN):

1. wizard_bell - adult = a bell-flower wizard with a tall crooked star-spotted hat, a long glowing star wand and a cape of drooping purple leaves. NEW TEEN = an apprentice: the bell flower is only half open (still partly a bud), wearing a simple soft rounded cap made of one curled indigo petal - short, not tall, not crooked, no star spots. NO wand at all (its leaf hands are empty and slightly curled). NO cape - just two plain green leaves at the sides. A rounder head on a thicker, shorter stem. The only hint of magic: two tiny yellow sparks attached at the cap tip.

2. ninja_vine - adult = a vine ninja with a navy cloth mask over the face, a long red trailing scarf and two shuriken leaves. NEW TEEN = a trainee: one single twisted vine body, thinner and with fewer coils than the adult. The young's dark leaf hood has grown into a hood covering the top and back of the head, but the face is fully visible - NO face mask. A short red scarf wrapped once around the neck, with only a short stub end (no long trailing scarf). NO shuriken at all (the vine hands are empty and curled). Eyes alert and eager.

3. jangseung_cactus - adult = a carved village-guardian totem cactus with a wide carved grin, a tall black scholar's hat and a vertical carved band. NEW TEEN = a guardian still being carved: a column cactus a bit taller and thicker than the young; on its face only the big round eyes are carved so far, with a small closed mouth line (NO wide grin yet). NO vertical carved band on the body. NO hat: instead, a small tuft of two dark leaves sprouts on top where the hat will grow later. Small leafy sprigs at the sides.

Save each as C:\dev\pulloseum\tools\pixel\big\concept\stages_raw2\<key>_teen.png. If the image tool saves elsewhere, copy it there with that name. If a file with that name already exists, skip it. Generate each image only once, no redraws. Do not create, modify or delete any other file, do not commit. When done, reply with the list of saved files.
