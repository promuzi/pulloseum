(2026-11-04 사용자 '세포 무늬 테로' — 일반 패시브 카드 22장(근섬유 다발 · 튼튼한 세포벽 · 거대 액포 · 향성 운동 · 표적 분비물 · 엽록체 증식 · 가시 줄기 · 항상성과 강화 +1 · +2)의 테 = 식물 몸의 성질이라 세포 무늬. 하늘색 한 장을 받아 강화 +1 = 은빛 · +2 = 금빛은 게임에서 다시 칠함. 받은 그림 → `node tools/pixel/big/greycut.mjs` 누끼 → `node tools/pixel/big/itemconv.mjs … --w=30 --h=30 --colors=10` → `frameclean.py` → `assets/v2/frames/ps_cell.png`. 한 번만 요청 — 다시 그리지 않음.)

Task: generate ONE decorative card-frame CORNER PIECE for a mobile pixel-art battle game whose creatures are plants. It joins a set of frames that already exists, so it must match that set exactly in style.

Before drawing, look at the existing set in C:\dev\pulloseum\tools\pixel\big\concept\frame\v1\ (open ty_vine.png, ty_cactus.png and el_earth.png) and match their look: same composition, same chunky proportions, same flat cel shading, same thick dark navy outline.

Generate the image exactly once (do not redraw, do not make alternatives) and save it as C:\dev\pulloseum\tools\pixel\big\concept\frame\v5\ps_cell.png (create the folder if needed). If the image tool saves files somewhere else, copy the generated file byte for byte into that folder with that name. If the file already exists, skip it. When done, write C:\dev\pulloseum\tools\pixel\big\concept\frame\v5\generation-record.json with the prompt you used and where the tool saved the original.

Composition (square 1254x1254):
- It will be shrunk to about 30x30 pixels and mirrored to the four corners of a small 66x90 pixel card, so shapes must be big, bold and chunky - anything thin or small will disappear. Never use rows of small dots, small holes, rivets or tiny particles: once shrunk they look like ugly holes.
- Background: one plain flat light gray #d9d9d9 everywhere, no gradient, no shadow, no texture, no vignette.
- The piece is an L-shaped part of a card border, seen perfectly flat (no perspective, no 3D tilt). Its outer corner is near the TOP-LEFT of the image, with a clean margin of plain background of about 7 percent on the top and left so nothing touches the image edges.
- One arm runs from the corner to the right, along the top, ending about 7 percent before the right edge. The other arm runs from the corner down, along the left side, ending about 7 percent before the bottom edge.
- Each arm is a straight band about 16 percent of the image wide (about 200 px), the same thickness along its whole length, with a simple pattern of a few BIG shapes that repeats evenly along the band (so a piece of it can be tiled).
- The corner ornament sits ON the corner and may bulge inward (toward the lower right) up to about 40 percent of the image. The inner area of the L (lower right) stays plain background. This is just TWO ARMS of a corner, never a whole rectangular frame.
- Style: bold cartoon mobile-game look, flat cel shading with only 3 to 4 tones per color, one or two big glossy highlights, a THICK dark navy outline (#0b1322) around every shape. No thin lines, no fine detail, no painterly texture. Do not draw a pixel grid; this is high resolution concept art for later pixel conversion.
- No text, no letters, no numbers, no faces, no eyes, no creatures, no hands, no watermark.

ps_cell.png - PLANT CELL frame, for cards that are inner traits of a plant's body (muscle fibers, cell walls, vacuoles, chloroplasts): the band is a chain of BIG plant cells seen like a cartoon microscope slice - rounded rectangles packed side by side with thick shared cell walls, only three or four cells per arm, in sky blue (#5fb3d9) with a lighter glossy inside (#d8f2ff); the corner ornament is one big round plant cell with a thick wall, a large glossy round nucleus and one big bean-shaped chloroplast inside. All shapes big and simple; no small dots or specks.
