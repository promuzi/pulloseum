(2026-10-24 사용자 "새 스킬이랑 기타 추가된 거 코덱스로 다시 그려서 추가해줘" — 종 고유 기술 v2 첫 묶음(게일캑터 · 게일바인) 열둘. 옛 개성 기술 그림(같은 id)은 concept/skill/ 에 그대로 두고 새 그림은 concept/skill/v2/ 에.
 결과 → `python tools/pixel/big/skillart.py tools/pixel/big/concept/skill/v2/<id>.png assets/v2/skills/<id>.png` → 같은 id라 `SKILLART_NAMES` 그대로.)

Task: generate skill illustrations for a mobile pixel-art battle game whose creatures are plants. They are shown very small on battle cards (about 58x52 pixels after downscaling), so every image must read instantly at that size.

Work through the list below in order. For each line, generate ONE image, exactly once (do not redraw or make alternatives), and save it as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\skill\v2\ using exactly the file name given (the id + .png). Create the folder if it does not exist. If the image tool saves files somewhere else, copy them into that folder with the right name. If a file with that name already exists in v2\, skip it.

Style for every image (same as the skill illustrations already in C:\dev\pulloseum\tools\pixel\big\concept\skill\):
- One big, bold, iconic subject filling about 70 percent of the square, centered; nothing small or fiddly, at most 2 or 3 big shapes.
- Flat cel shading with only 3 to 4 tones per color, a thick dark outline around the main shapes, no painterly texture, no fine detail, no tiny particles, no thin lines.
- Strong contrast between the subject and the background. Background = a plain soft gradient in soft lavender purple (these are all wind skills), slightly darker toward the edges.
- Plants and plant parts are the heroes; no humans, no animals, no faces, no hands.
- Attacks show the moment of impact or launch with one bold motion shape; buffs (marked "self") show the plant part glowing or wrapped in the effect; status effects are shown by their color and one simple symbol (a red downward arrow = weaker attack, a blurry dizzy swirl = worse aim, a broken dull arrowhead = fewer critical hits, a red angry spike = taunt, yellow zigzag arcs = electric shock, a green plus glow = healing, a pale translucent haze with faded copies = hidden/stealth).
- Square 1254x1254, no text, no letters, no numbers, no musical notes, no frame, no border, no watermark.

Before drawing, look at several existing images in C:\dev\pulloseum\tools\pixel\big\concept\skill\ (for example a_breeze.png, a_typhoon.png, u_wind_1.png, u_gale_1.png, u_gvine_3.png, f_ball.png) and match their look exactly - same flat icon style, outline weight and tone count.

The two plants: the desert-flute cactus is a cluster of tall hollow olive-green cactus pipes with round holes like a flute; the assassin vine is a slender pale silver-green vine with a sharp leaf-blade tip and pale lavender ribbon leaves.

Images (file name - what it shows):

u_gale_1.png - a hollow olive-green cactus flute pipe sending out three wide lavender ring-shaped sound waves and a gust, one red downward arrow shape
u_gale_2.png - wobbly tangled lavender sound waves spiraling out of a hollow cactus flute pipe, a blurry dizzy swirl and a broken dull arrowhead
u_gale_2b.png - self: a hollow cactus flute pipe fading into two shimmering translucent mirage copies inside a pale haze, one curved mirror-like arc bouncing back
u_gale_3.png - a hollow cactus flute pipe at the center of a huge dark violet storm whirlwind with heavy gust bands
u_gale_3b.png - self: a hollow cactus flute pipe wrapped in soft lavender wind ribbons that carry a bright green plus glow
u_gale_3c.png - bright yellow zigzag lightning arcs riding inside lavender wind gusts that circle a hollow cactus flute pipe
u_gvine_1.png - self: the slender silver-green assassin vine leaving two fading translucent afterimage copies of itself in a pale haze
u_gvine_2.png - the slender assassin vine tip curled into a lazy beckoning hook, one red angry spike and a blurry dizzy swirl
u_gvine_2b.png - the sharp leaf-blade tip of the assassin vine stabbing forward from behind with one fast dash streak and a bright white-yellow impact star
u_gvine_3.png - self: the assassin vine drooping loosely and relaxed inside a thin pale protective shell, a sharp hidden blade spark glinting at its tip
u_gvine_3b.png - three fast crossing vine-blade slashes in a flurry with strong lavender wind streaks
u_gvine_3c.png - one single vine-blade thrust piercing straight through the center of a target ring with a big white-yellow impact burst
