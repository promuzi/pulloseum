(2026-10-23 사용자 "종자도 식물별로 다 다르게해줘" — 마흔다섯 종마다 다른 종자. 종자는 아주 작게(28×32칸) 쓰여 한 장에 넷씩(2×2) 그리게 함 → 클로드가 칸을 잘라 누끼 · 도트(tools/pixel/big/items.mjs --seeds). 모양 = 종류(꽃 · 선인장 · 덩굴 · 버섯), 색 = 속성, 상징 하나 = 그 식물. 얼굴 · 눈 없음. 별 효과 · 색 변종은 클로드가 코드로. 한 장씩 한 번만.)

Task: generate 12 images of magical plant seeds for a cozy retro-futuristic pixel-art mobile game about plant creatures. Each seed belongs to one plant creature and must hint at it with ONE simple signature motif. A pixel artist will cut each seed out and shrink it to about 28x32 pixels, so every seed must read instantly at that size.

Images 1 to 11 each show FOUR different seeds arranged in a 2x2 grid (top-left, top-right, bottom-left, bottom-right, in the order listed for that image). Image 12 shows ONE seed alone, centered. Save each image as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\items\ using exactly the file name given. If the image tool saves files somewhere else, copy them into that folder with these names. If a file with that name already exists, skip it. Do not create, modify or delete any other file in the repository, do not commit, and do not run extra verification commands after saving. Generate each image only once (no redraws). Keep going until all 12 are done; if you must stop early, the files already saved are kept.

You may open these seven seed images first to match their style exactly (they were made for the same game): C:\dev\pulloseum\tools\pixel\big\concept\items\seed_fire.png, seed_water.png, seed_grass.png, seed_earth.png, seed_wind.png, seed_bolt.png, seed_ice.png in that folder. Do not open any other existing image file. After saving your first image, you may open the images you made in this run to keep the set consistent.

Layout for the 2x2 images:
- Square image, divided into four equal quadrants (no visible lines, no borders, no frames, no labels).
- Exactly one seed in each quadrant, centered in its quadrant, all four seeds drawn at the same size (about 60 percent of the quadrant height), with plenty of empty background around each seed; no seed touches another or the quadrant edges.

Style for every seed (same as the seven reference seeds):
- One upright seed, bold chunky silhouette, at most 2 or 3 big shapes; the signature motif is big and simple, attached to the seed (no separate floating parts, no particles, no sparkles detached from the seed).
- Thick dark outline (deep navy-brown, not pure black); flat cel shading with 3 or 4 tones per color; hue-shifted shading (cool shadows, warm highlights); soft light from the top left with one crisp highlight.
- No faces, no eyes, no mouths, no text, no letters, no numbers.
- Base shape by plant type: flower = teardrop or almond seed; cactus = round seed with soft vertical ribs and a few tiny spine dots; vine = long bean-like seed, often with a small curled tendril; mushroom = round spore-pod seed with a small cap-like top.
- Main color by element: fire = red-orange; water = blue to sky-blue; grass = fresh green; earth = ochre and warm brown; wind = pale lavender and white; bolt = dark navy with bright yellow; ice = icy teal and white.
- Plain flat light grey background (#d9d9d9) filling the whole image, no gradient, no texture, no ground, no cast shadows.
- Square 1024x1024 (or the tool's square size).

Images (file name - top-left / top-right / bottom-left / bottom-right; each seed = plant type x element - signature motif):

seeds_01.png
1. flower x grass - a green almond seed wrapped by two leaf sepals like a sword guard, a small pink rose-bud tip on top.
2. vine x grass - a dark green bean seed with three small hooked thorns along its side and a curled tendril.
3. flower x water - a round onion-bulb shaped seed of translucent blue with a white ring-halo mark around its middle.
4. flower x wind - a pale lavender teardrop seed with one long flowing petal ribbon curling around it.

seeds_02.png
1. flower x bolt - a yellow-green seed shaped like a light bulb, its glowing yellow tip with a lightning-bolt mark.
2. vine x water - a sea-blue curled bean seed wrapped twice by a coiled tendril like a rope, with a small wave mark.
3. cactus x fire - a round red ribbed seed with a small orange flame tuft on top and tiny spine dots.
4. cactus x earth - a sandstone ochre ribbed seed with a carved geometric totem band around its middle (simple stripes and triangles, no symbols).

seeds_03.png
1. flower x fire - a dark crimson teardrop seed with black-red petal tips curling at the top and an ember-orange glow line.
2. cactus x wind - a pale lavender ribbed round seed with three small round holes in a row like a flute.
3. vine x wind - a slim pale grey-violet bean seed with a wispy purple ribbon wrapped loosely around it.
4. mushroom x grass - a green spore-pod seed with a small round mushroom cap on top covered with pale dots.

seeds_04.png
1. flower x ice - an icy white bell-shaped seed with a tiny bell clapper bead at the bottom and frost on its rim.
2. vine x bolt - a dark navy bean seed with a bright yellow zigzag tendril coiling around it.
3. mushroom x earth - a grey stone pebble seed with a flat slab-like rock cap on top.
4. mushroom x water - a translucent blue-pink jelly seed with three short soft tendrils hanging from its bottom (attached), like a tiny jellyfish.

seeds_05.png
1. flower x earth - an olive-ochre seed shaped like a closed flytrap with small blunt teeth along the closed seam.
2. vine x fire - a red-orange long seed shaped like a leaf blade with a bright steel-silver edge.
3. cactus x grass - a purple-green ribbed seed with a few spines whose tips hold small purple poison droplets (attached).
4. cactus x ice - a dragon-fruit-like seed: an icy pink-white bulb covered with frost-tipped scale flaps.

seeds_06.png
1. mushroom x fire - an orange glowing spore-pod seed with a small dark ember cap on top.
2. cactus x fire - a round red ribbed seed with two tiny dragon horns and a scale pattern.
3. cactus x ice - an icy blue scaled seed with two small wing-like flaps and two tiny horns.
4. mushroom x wind - a tan spore-pod seed wearing a tiny black Korean gat hat brim (wide flat round brim) with a thin string.

seeds_07.png
1. vine x earth - an ochre bean seed with bold red and blue stripes like the sleeves of a traditional mask-dance costume.
2. cactus x bolt - a round seed shaped like a small drum with laced rims at top and bottom and a yellow lightning mark on its side.
3. vine x ice - a seed shaped like a Korean blue-and-red silk lantern (blue top band, red bottom band) with frost.
4. cactus x water - a round ribbed seed shaped like a small earthenware water jar with a blue water band around its rim.

seeds_08.png
1. mushroom x bolt - a spore-pod seed with one small horn on top and a yellow lightning band around it.
2. mushroom x ice - an icy spore-pod seed with a small ice crown on top.
3. cactus x earth - a ribbed brown seed with a red plume crest on top like a gladiator helmet.
4. cactus x grass - a tall ribbed green seed with a tiny black gat hat brim on top and carved stripes like a village guardian totem pole.

seeds_09.png
1. mushroom x wind - a pale lavender spore-pod seed inside a tiny clear glass bubble dome like a space helmet.
2. mushroom x ice - an icy spore-pod seed with two small curved horns like a viking helmet.
3. mushroom x water - a seed with a hexagonal turtle-shell pattern on its back and a thin blue water-snake coiled around it.
4. flower x fire - an orange-red teardrop seed with two fox-ear petal tips and a curled fluffy tail tuft at its side.

seeds_10.png
1. flower x bolt - a navy bell-shaped seed with a pointed wizard-hat tip and a small yellow star on it.
2. vine x wind - a dark green bean seed with a black band across its middle like a ninja mask and a red leaf scarf tied to it.
3. vine x water - a sea-green bean seed with a small orange float ball attached by a short cord, and round diving goggles strap around it.
4. cactus x water - a round ribbed green seed wearing a tiny navy tricorn hat with a small white anchor emblem.

seeds_11.png
1. vine x grass - a green bean seed with a leaf hood folded over its tip and two tiny reed arrow feathers at its side.
2. mushroom x earth - an ochre spore-pod seed with a tiny yellow miner's helmet with a brass lamp, and an amber chip on its side.
3. flower x ice - an icy white seed with a frilly snowflake-patterned tutu ring around its middle.
4. mushroom x fire - a charcoal cone-shaped seed with a glowing orange crater on top and two orange lava lines down its sides.

seeds_12.png (one seed alone, centered, about 60 percent of the image height)
1. flower x wind - a small seed hanging under a fluffy white dandelion parachute puff, with a tiny brass goggles band around the seed.

When done, reply with the list of saved file paths.
