(2026-10-22 사용자 "코덱스로 종자디자인과 상점의 아이템 디자인도 받아서 만들어줘 … 코덱스는 디자인만". 종자 = 속성 일곱(같은 크기 · 같은 결, 속성마다 다른 껍질), 상점 물건 = 아홉(종자 꾸러미 둘 · 카드 꾸러미 둘 · 보급품 다섯). 별 수에 따른 효과 · 색 변종 색은 클로드가 코드로 얹음 — 그림엔 넣지 않음. 회색 배경 → greycut.mjs 누끼 → 작은 도트(종자 약 30칸 · 물건 약 40칸)로 줄임. 한 장씩 한 번만 그림.)

Task: generate 16 game item illustrations, one PNG per line below, for a cozy retro-futuristic pixel-art mobile game about plant creatures raised and battled on a spaceship. A pixel artist will shrink every image to a small inventory icon (about 30 to 40 pixels), so each one must read instantly at that size.

Save each image as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\items\ using exactly the file name given. If the image tool saves files somewhere else, copy them into that folder with these names. If a file with that name already exists, skip it (so a later run can continue where this one stopped). Do not create, modify or delete any other file in the repository, do not commit, and do not run extra verification commands after saving. Generate each image only once (no redraws). Keep going until the whole list is done; if you must stop early, the files already saved are kept.

Do not open any existing image file in the repository. After you have saved the first seed and the first item of this run, you may open the images you made in this run (only those) to keep the whole set consistent.

Style for every image:
- One single object, centered, upright, filling about 65 to 70 percent of the square; generous empty space around it; nothing touching the edges.
- Bold, chunky, iconic silhouette with at most 2 or 3 big shapes; no tiny details, no thin lines, no small text-like marks, no particles, no floating effects, no sparkles detached from the object.
- Thick dark outline (deep navy-brown, not pure black) around the whole object; flat cel shading with only 3 or 4 tones per color; hue-shifted shading (cool shadows, warm highlights); soft light from the top left with a small crisp highlight.
- Slight three-quarter view from the front and a little above, like an item icon in a cozy farming RPG.
- Plain flat light grey background (#d9d9d9) filling the whole image, no gradient, no texture, no vignette, no ground, no cast shadow under the object.
- Square 1024x1024. No text, no letters, no numbers, no frame, no border, no watermark.

Seeds — the 7 seeds are one family: draw them at the same size and proportions (an upright seed about 60 percent of the image height, slightly wider at the bottom), same outline weight and lighting, each with its own element-specific shell. They should look precious and collectible, like magical seeds.

seed_fire.png - fire seed: a plump teardrop seed with a deep red to warm orange shell whose tip curls up like a small flame; three short glowing orange ember cracks on the shell.
seed_water.png - water seed: a round droplet-shaped seed with a glossy deep blue to bright sky-blue shell, one white wave swirl mark on the front and one big round highlight.
seed_grass.png - grass seed: an acorn-like light brown seed half wrapped in a fresh young green leaf, with a tiny curled green sprout on top.
seed_earth.png - earth seed: a sturdy round nut seed with a rough stone-like ochre-brown shell and two small amber crystal chips set in it.
seed_wind.png - wind seed: a winged seed like a maple key: a small pale lavender oval seed with one big curved translucent lilac wing sweeping up to one side.
seed_bolt.png - lightning seed: an oval seed with a dark navy shell crossed by one bold bright yellow lightning-zigzag stripe, the tip ending in a small yellow spark shape attached to the seed.
seed_ice.png - ice seed: a faceted crystal seed like a cut gem, icy teal and white with frosty highlights and a small frost-leaf shape at the top.

Shop items — supplies for a spaceship greenhouse, chunky and tactile, retro-futuristic (rivets, rounded metal, glass windows), friendly not grim:

item_seed_common.png - common seed pouch: a small round cloth pouch of warm tan burlap tied at the neck with a green string, a simple green leaf patch sewn on the front, two plain seeds peeking out of the opening.
item_seed_rare.png - rare seed pouch: the same pouch shape in deep royal-blue velvet with gold trim, a gold star patch on the front, tied with a gold cord, two softly glowing golden seeds peeking out.
item_card_basic.png - common card pack: a sealed trading-card booster pack standing upright and slightly tilted, sky-blue foil wrapper with zigzag crimped seals at the top and bottom and a simple white leaf emblem in the middle.
item_card_mut.png - mutation card pack: the same booster pack shape in purple-magenta foil with zigzag crimped seals and an emblem of a twisted vine double helix in the middle, a faint purple glow along its edges.
item_water.png - water: a sturdy riveted metal watering can (retro spaceship style, rounded body, long spout) with a big blue water-drop emblem on its side and a little water at the spout tip.
item_fert.png - fertilizer: a plump paper sack of fertilizer with the top folded over, a green sprout-and-plus emblem on the front, a few dark granules visible at the folded top.
item_regress.png - gene rewind injector: a chunky sci-fi injector with a thick glass barrel full of glowing teal liquid with a DNA double helix floating inside it, metal caps at both ends, and a circular backward-arrow (rewind) symbol on the end cap.
item_fuel.png - fuel capsule: an energy capsule: a short cylinder with metal end caps and a glass middle showing a bright yellow-orange glowing energy core.
item_parts.png - spaceship parts: a big steel gear with a hex bolt and a small curved metal plate leaning against it, steel grey with one small orange accent stripe on the plate.

When done, reply with the list of saved file paths.
