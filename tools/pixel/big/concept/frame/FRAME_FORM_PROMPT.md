(2026-11-04 사용자 '변이카드도 만들어봐. 변이도 속성이 있을 수 있는데 어떻게 하는게 좋을까? 변이로 통일하는게 낫겠지?' — 변이 카드(변이 기술 27 · 변이 패시브 15)는 속성과 상관없이 그 변이의 테 하나(포식 · 무기 · 독성 · 포자 · 용족). 변이 색이 속성 테 색과 겹치는 것이 많아(용족 = 빙결 청록 · 독성 ≈ 바람 보라 · 포자 ≈ 번개 노랑 · 무기 ≈ 기본 쇠 · 포식 ≈ 불 빨강) 색이 아니라 모양으로 구분. 받은 그림 → `node tools/pixel/big/greycut.mjs` 누끼 → `node tools/pixel/big/itemconv.mjs … --w=30 --h=30 --colors=10` → `frameclean.py` → `assets/v2/frames/fm_<변이>.png`. 한 번만 요청 — 다시 그리지 않음.)

Task: generate decorative card-frame CORNER PIECES for a mobile pixel-art battle game whose creatures are plants. They join a set of frames that already exists, so they must match that set exactly in style.

Before drawing, look at the existing set in C:\dev\pulloseum\tools\pixel\big\concept\frame\v1\ (open ty_vine.png, ty_cactus.png, el_fire.png and el_earth.png) and match their look: same composition, same chunky proportions, same flat cel shading, same thick dark navy outline. Also open C:\dev\pulloseum\tools\pixel\big\concept\frame\v3\basic.png (a plain steel frame that already exists - the weapon frame below must look clearly different from it).

Work through the list below in order. For each line, generate ONE image, exactly once (do not redraw, do not make alternatives), and save it as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\frame\v4\ (create the folder if needed) using exactly the file name given. If the image tool saves files somewhere else, copy the generated file byte for byte into that folder with the right name. If a file with that name already exists in v4\, skip it. When done, write C:\dev\pulloseum\tools\pixel\big\concept\frame\v4\generation-record.json listing, for every file, the prompt you used and where the tool saved the original.

Composition of every corner piece (square 1254x1254):
- It will be shrunk to about 30x30 pixels and mirrored to the four corners of a small 66x90 pixel skill card, so shapes must be big, bold and chunky - anything thin or small will disappear. Never use rows of small dots, small holes, rivets or tiny particles: once shrunk they look like ugly holes.
- Background: one plain flat light gray #d9d9d9 everywhere, no gradient, no shadow, no texture, no vignette.
- The piece is an L-shaped part of a card border, seen perfectly flat (no perspective, no 3D tilt). Its outer corner is near the TOP-LEFT of the image, with a clean margin of plain background of about 7 percent on the top and left so nothing touches the image edges.
- One arm runs from the corner to the right, along the top, ending about 7 percent before the right edge. The other arm runs from the corner down, along the left side, ending about 7 percent before the bottom edge.
- Each arm is a straight band about 16 percent of the image wide (about 200 px), the same thickness along its whole length, with a simple pattern of a few BIG shapes that repeats evenly along the band (so a piece of it can be tiled).
- The corner ornament sits ON the corner and may bulge inward (toward the lower right) up to about 40 percent of the image. The inner area of the L (lower right) stays plain background. This is just TWO ARMS of a corner, never a whole rectangular frame.
- Style: bold cartoon mobile-game look, flat cel shading with only 3 to 4 tones per color, one or two big glossy highlights, a THICK dark navy outline (#0b1322) around every shape. No thin lines, no fine detail, no painterly texture. Do not draw a pixel grid; this is high resolution concept art for later pixel conversion.
- No text, no letters, no numbers, no faces, no eyes, no full creatures, no hands, no watermark.

These are MUTANT frames: plants that mutated into something stronger. Each one must be recognizable by its SHAPE alone, not only by its color.

Images (file name - what it shows):

fm_predator.png - PREDATOR mutation (carnivorous plant jaws): the band is a thick fleshy crimson-red lip (#e8344a, with pink highlights) edged on its inner side with a row of BIG ivory triangular teeth pointing inward, only three or four teeth per arm, evenly spaced; the corner ornament is a big jaw-like trap corner with two long curved ivory fangs.

fm_weapon.png - WEAPON mutation (blades): the band is a sharp sword blade in cool blue-gray steel (#9aa8c0) lying along the edge, with one bright sharpened edge bevel running along its inner side; the corner ornament is a chunky brass-gold sword cross-guard with a wrapped dark leather grip and a round gold pommel, where the two blades meet. It must look like weapons, clearly different from a plain steel bar.

fm_toxic.png - TOXIC mutation (poison): the band is a glossy violet slime tube (#a868e8) with big acid-green drips hanging inward from it at even spacing, only two or three drips per arm; the corner ornament is one big bulging violet poison drop with an acid-green glossy core and two big bubbles. No skulls.

fm_spore.png - SPORE mutation (mushroom spores): the band is a thick ochre-gold mycelium rope (#d0b050) with a few BIG round puffy spore pods along it, evenly spaced; the corner ornament is one big round puffball mushroom bursting out a small cloud made of three BIG round spores. It must not look like a red mushroom cap.

fm_dragon.png - DRAGON mutation (scales and horn): the band is a row of big overlapping mint-teal dragon scales (#30e1b9, darker teal edges) running along the edge; the corner ornament is one big curved ivory-and-gold dragon horn rising from a cluster of big scales. No full dragon, no eyes, no head.
