(2026-10-29 사용자 "새 기술 그림·환경 아이콘을 코덱스로 그려줘" — 10-29 친구 서버에 올린 아홉 종 중 둘째 묶음: 윈드페탈 · 프로스트벨 · 젤리캡 기술 열여덟. 새 그림은 concept/skill/v2/ 에.
 결과 → `python tools/pixel/big/skillart.py tools/pixel/big/concept/skill/v2/<id>.png assets/v2/skills/<id>.png`.)

Task: generate skill illustrations for a mobile pixel-art battle game whose creatures are plants. They are shown very small on battle cards (about 58x52 pixels after downscaling), so every image must read instantly at that size.

Work through the list below in order. For each line, generate ONE image, exactly once (do not redraw or make alternatives), and save it as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\skill\v2\ using exactly the file name given (the id + .png). If the image tool saves files somewhere else, copy them into that folder with the right name. If a file with that name already exists in v2\, skip it.

Style for every image (same as the illustrations already in C:\dev\pulloseum\tools\pixel\big\concept\skill\v2\ - look at u_gale_3c.png, u_spore_3b.png, u_stone_1.png and u_volt_2.png first and match them exactly):
- One big, bold, iconic subject filling about 70 percent of the square, centered; nothing small or fiddly, at most 2 or 3 big shapes.
- Flat cel shading with only 3 to 4 tones per color, a thick dark outline around the main shapes, no painterly texture, no fine detail, no tiny particles, no thin lines.
- Strong contrast between the subject and the background. Background = a plain soft gradient in the color given per line, slightly darker toward the edges: wind = soft lavender purple, ice = deep teal-cyan, water = deep blue, grass = deep green, neutral = muted steel blue-grey.
- Plants and plant parts are the heroes; no humans, no animals, no faces, no hands.
- Square 1254x1254, no text, no letters, no numbers, no frame, no border, no watermark.

The plants (reference art, look at it but do not copy the face):
- Windpetal (C:\dev\pulloseum\tools\pixel\big\concept\flower_wind.png): a slender dancer flower with long feather-like lavender petals streaming to one side.
- Frostbell (C:\dev\pulloseum\tools\pixel\big\concept\cut\frost_bell.png): a drooping pale-blue bell-shaped flower edged with white frost lace, on a curved silver-blue stem.
- Jellycap (C:\dev\pulloseum\tools\pixel\big\concept\cut\jelly_cap.png): a translucent light-blue jellyfish-like mushroom with a wide wobbly cap and soft dangling tentacles.

Images (file name - background - what it shows):

u_wind_1.png - wind - lavender feather petals spinning in a fast gust spiral, one sharp wind blade flying forward
u_wind_2.png - wind - self: the dancer flower twirling gracefully inside a joyful ring of swirling lavender petals, a faint afterimage beside it
u_wind_2b.png - wind - lavender petals turning crimson as they whirl, a red-tinted cutting wind slash across the image
u_wind_3.png - wind - four big petal blades whirling around in a circle like spinning swords
u_wind_3b.png - wind - big pink heart-shaped petals floating in a sweet swirling breeze with a dreamy pink glow
u_wind_3c.png - wind - one huge dark lavender petal blade sweeping down in a final decisive crescent slash

u_frost_1.png - ice - the frost bell flower ringing, a golden dawn sun rising behind it, two big curved sound rings spreading out
u_frost_2.png - ice - the frost bell striking a big block of ice so it shatters into large sharp shards
u_frost_2b.png - wind - the frost bell sending out one wide silent wind ring that closes around a lock-shaped seal
u_frost_3.png - ice - the frost bell flower hanging under a big crescent moon in a dark night sky, a faint cold glow on the bell
u_frost_3b.png - ice - self: clear sparkling ripples of icy water spreading out from the bell with a gentle white healing glow
u_frost_3c.png - neutral - three slender frosted flower stems swung like switches in a sweeping strike, three bold swoosh arcs

u_jelly_1.png - water - self: the soft jelly cap bouncing and wobbling while yellow electric sparks glance off its surface
u_jelly_2.png - water - a jelly tentacle stinging forward with a big purple poison drop at its tip
u_jelly_2b.png - grass - three wavy green seaweed ribbons whipping forward in a flurry
u_jelly_3.png - water - self: a deflated jelly cap puffing back up, glowing and rising with big bubbles
u_jelly_3b.png - water - self: the jelly cap fading almost invisible among water bubbles, only a shimmering outline left
u_jelly_3c.png - water - the wobbly jelly cap bouncing an incoming purple poison blob straight back like a rubber ball, a curved rebound arrow
