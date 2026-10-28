(2026-10-29 사용자 "새 기술 그림·환경 아이콘을 코덱스로 그려줘" — 10-29 친구 서버에 올린 아홉 종 중 셋째 묶음: 팽트랩 · 톡시캑터 · 드라코프루트 기술 열여덟. 새 그림은 concept/skill/v2/ 에.
 결과 → `python tools/pixel/big/skillart.py tools/pixel/big/concept/skill/v2/<id>.png assets/v2/skills/<id>.png`.)

Task: generate skill illustrations for a mobile pixel-art battle game whose creatures are plants. They are shown very small on battle cards (about 58x52 pixels after downscaling), so every image must read instantly at that size.

Work through the list below in order. For each line, generate ONE image, exactly once (do not redraw or make alternatives), and save it as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\skill\v2\ using exactly the file name given (the id + .png). If the image tool saves files somewhere else, copy them into that folder with the right name. If a file with that name already exists in v2\, skip it.

Style for every image (same as the illustrations already in C:\dev\pulloseum\tools\pixel\big\concept\skill\v2\ - look at u_gale_3c.png, u_spore_3b.png, u_stone_1.png and u_volt_2.png first and match them exactly):
- One big, bold, iconic subject filling about 70 percent of the square, centered; nothing small or fiddly, at most 2 or 3 big shapes.
- Flat cel shading with only 3 to 4 tones per color, a thick dark outline around the main shapes, no painterly texture, no fine detail, no tiny particles, no thin lines.
- Strong contrast between the subject and the background. Background = a plain soft gradient in the color given per line, slightly darker toward the edges: grass = deep green, fire = deep red-orange, ice = deep teal-cyan, wind = soft lavender purple, neutral = muted steel blue-grey.
- Plants and plant parts are the heroes; no humans, no real animals, no faces, no hands.
- Square 1254x1254, no text, no letters, no numbers, no frame, no border, no watermark.

The plants (reference art, look at it but do not copy the face):
- Fangtrap (C:\dev\pulloseum\tools\pixel\big\concept\cut\fang_trap.png): a big green venus flytrap jaw with a red inside and pale tooth-like spikes on its rim.
- Toxicactus (C:\dev\pulloseum\tools\pixel\big\concept\cut\toxi_cactus.png): a round green barrel cactus with long purple spines dripping purple poison, purple flowers on top.
- Dracofruit (C:\dev\pulloseum\tools\pixel\big\concept\cut\draco_fruit_v2.png): a leafy plant creature shaped like a small dragon, made of blue-green frosted leaves, with leaf wings; it grows pale icy-blue fruits.

Images (file name - background - what it shows):

u_fang_1.png - grass - the flytrap jaw snapping shut with its pale teeth, a bold bite impact flash
u_fang_2.png - grass - the flytrap jaw hanging open and drooling big clear nectar drops, a glint of hunger
u_fang_2b.png - grass - thick bubbling green-purple digestive juice splashing out of the flytrap jaw
u_fang_3.png - grass - the flytrap jaw lunging wide open for one huge devouring bite, motion lines behind it
u_fang_3b.png - grass - the flytrap jaw closed and tasting, a big golden star sparkle above it
u_fang_3c.png - fire - the flytrap jaw biting down with bright orange flames curling around its teeth

u_toxi_1.png - grass - a round poison sac on the cactus bursting in a big purple splash
u_toxi_2.png - grass - one long purple-tipped cactus spine flying forward with yellow electric sparks crackling around it
u_toxi_2b.png - grass - a thick low cloud of purple poison fog rolling out over the ground from the cactus
u_toxi_3.png - grass - a heavy rain of big purple poison cactus spines falling from above, only a few large spines
u_toxi_3b.png - grass - self: one big purple cactus spine shaped like a syringe injecting glowing green-purple liquid into the cactus, a power aura
u_toxi_3c.png - grass - a fan-shaped burst of three big purple poison darts fired from the cactus

u_draco_1.png - ice - self: a pale icy-blue fruit forming out of a swirl of frost and condensing in the air
u_draco_2.png - ice - self: one big pale icy-blue fruit with a bite taken out of it, a soft green healing glow
u_draco_2b.png - ice - an egg made of frosted blue-green leaves cracking open, bright light pouring out of the crack
u_draco_3.png - ice - the leafy dragon-shaped plant breathing out a wide cone of white-blue frost breath
u_draco_3b.png - wind - a swirling wind storm full of ice shards and small yellow lightning sparks
u_draco_3c.png - neutral - three pale icy-blue fruits thrown in an arc, the front one shattering into frost on impact
