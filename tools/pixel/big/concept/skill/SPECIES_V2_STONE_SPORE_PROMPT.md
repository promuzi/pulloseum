(2026-10-24 사용자 "새 스킬이랑 기타 추가된 거 코덱스로 다시 그려서 추가해줘" — 종 고유 기술 v2 둘째 묶음(스톤캡 · 스포어캡) 열둘. 새 그림은 concept/skill/v2/ 에.
 결과 → `python tools/pixel/big/skillart.py tools/pixel/big/concept/skill/v2/<id>.png assets/v2/skills/<id>.png` → 같은 id라 `SKILLART_NAMES` 그대로.)

Task: generate skill illustrations for a mobile pixel-art battle game whose creatures are plants. They are shown very small on battle cards (about 58x52 pixels after downscaling), so every image must read instantly at that size.

Work through the list below in order. For each line, generate ONE image, exactly once (do not redraw or make alternatives), and save it as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\skill\v2\ using exactly the file name given (the id + .png). If the image tool saves files somewhere else, copy them into that folder with the right name. If a file with that name already exists in v2\, skip it.

Style for every image (same as the illustrations already in C:\dev\pulloseum\tools\pixel\big\concept\skill\v2\ - look at u_gale_1.png, u_gvine_3b.png and u_gale_3.png first and match them exactly):
- One big, bold, iconic subject filling about 70 percent of the square, centered; nothing small or fiddly, at most 2 or 3 big shapes.
- Flat cel shading with only 3 to 4 tones per color, a thick dark outline around the main shapes, no painterly texture, no fine detail, no tiny particles, no thin lines.
- Strong contrast between the subject and the background. Background = a plain soft gradient in the background color given per line, slightly darker toward the edges: earth = warm ochre brown, fire = deep red-orange, grass = deep green, bolt = dark navy with a yellow tint.
- Plants and plant parts are the heroes; no humans, no animals, no faces, no hands.
- Square 1254x1254, no text, no letters, no numbers, no frame, no border, no watermark.

The two plants: the stone mushroom is a grey-brown mushroom whose cap is made of stacked boulders, living in a rocky cave; the spore mushroom is a golden-brown spotted mushroom that puffs golden spores and has tiny baby mushrooms.

Images (file name - background - what it shows):

u_stone_1.png - earth - a big jagged boulder falling from a rocky cave ceiling onto the ground with a heavy impact, small stun stars
u_stone_2.png - earth - a wide patch of sharp grey gravel spread over a cave floor with a blurry dizzy swirl above it
u_stone_2b.png - earth - one huge sharp stone stalagmite bursting straight up out of the ground, cracking through a thin glowing translucent shield
u_stone_3.png - fire - glowing orange lava flowing through cracks in a dark cave floor, small orange flames rising
u_stone_3b.png - earth - a cave floor collapsing into a deep pit with big falling rock chunks and a wide shockwave ring, small stun stars
u_stone_3c.png - grass - soft green moss spreading over grey cave rocks and covering them, a bright green plus glow
u_spore_1.png - grass - three small round sleeping golden spore balls nestled on dark soil, a soft glow and a tiny curled sprout on one
u_spore_2.png - grass - self: a glowing translucent wall made of drifting golden spores standing in front of a spotted mushroom cap
u_spore_2b.png - grass - three small baby mushrooms all puffing golden spore blasts forward at the same time
u_spore_3.png - grass - several small mushrooms bursting into a big golden spore explosion cloud flying forward
u_spore_3b.png - bolt - a golden spore cloud crackling with bright yellow zigzag lightning, shooting forward
u_spore_3c.png - grass - a baby mushroom growing into a tall adult mushroom with a big upward green arrow glow
