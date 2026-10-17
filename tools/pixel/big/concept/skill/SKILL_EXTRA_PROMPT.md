(2026-10-17 사용자 "코덱스는 다 써도 됨" — 그림 없는 기술 96장: 종마다 더 피는 개성 기술 90(UNI_EXTRA — 30종 × 자라는 1 · 다 자란 2) · 둥근 드라코프루트 개성 셋 다시(옛 그림 = 용 그림이라 프로스트드레이크 u_fdrake_1~3으로 옮김) · 새 무기 카드 셋(화염 방사 · 로켓포 · 석궁 — 사용자 "화염방사도 넣자" · "무기에 광역으로 로켓포도 넣고 석궁도"). 스타일 블록은 CARD_ICON_PROMPT.md 그대로.
 결과 → `python tools/pixel/big/skillart.py <원본> assets/v2/skills/<id>.png` → `v2/src/art/skillcard.js SKILLART_NAMES`에 id 추가.)

Task: generate skill and card illustrations for a mobile pixel-art battle game whose creatures are plants. They are shown very small on battle cards (about 58x52 pixels after downscaling), so every image must read instantly at that size.

Work through the list below in order. For each line, generate ONE image and save it as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\skill\ using exactly the file name given (the id + .png). If a file with that name already exists, skip it (this lets a later run continue where this one stopped). If the image tool saves files somewhere else, copy them into that folder with these names. Generate each image only once, no redraws. Do not create, modify, or delete any other file in the repository, do not commit, and do not run extra verification commands after saving. Keep going until the whole list is done; if you must stop early, the files already saved are kept.

Style for every image (same as the icons already in that folder):
- One big, bold, iconic subject filling about 70 percent of the square, centered; nothing small or fiddly, at most 2 or 3 big shapes.
- Flat cel shading with only 3 to 4 tones per color, a thick dark outline around the main shapes, no painterly texture, no fine detail, no tiny particles, no thin lines.
- Strong contrast between the subject and the background. Background = a plain soft gradient in the background color given below, slightly darker toward the edges.
- Background colors: fire = deep red-orange · water = deep blue · grass = deep green · earth = warm ochre brown · wind = soft lavender purple · bolt = dark navy with a yellow tint · ice = deep teal-cyan · weapon = cool steel grey-blue.
- Plants and plant parts (leaves, petals, vines, roots, cactus, mushroom caps, seeds, fruit) are the heroes; no humans, no animals, no faces (a carved mask object, a hat, a fan, a drum, a lantern, a jar, a club or a crown object is fine where asked; dragon parts are always made of plant material, flame or ice, never a real animal).
- Attacks show the moment of impact or launch with one bold motion shape; buffs (marked "self") show the plant part glowing or wrapped in the effect; status effects are shown by their color (burn orange flames, poison purple, wet blue drops, bind green vines, root brown roots, gale wind streaks, shock yellow sparks, chill ice crystals, stun stars, spore pale yellow spores, weak downward red arrow shape, taunt red angry spike, corrode green-brown dripping rust, drain a green glowing stream flowing back, heal green plus glow, purify white sparkles, shield a glowing translucent dome, wall a sturdy barrier, haste speed streaks, rage red glow, focus a bright target ring).
- Square 1254x1254, no text, no letters, no numbers, no frame, no border, no watermark.

Images that already exist in that folder set the tone: before drawing, look at several of them (for example f_ball.png, w_tide.png, g_whip.png, e_quake.png, u_thorn_1.png, m_slash.png) and match their look exactly - same flat icon style, outline weight, tone count, contrast and background treatment.

Images (file name - background - what it shows):

u_draco_1.png - ice - frosted pink-tipped dragon-fruit scales shooting forward like sharp icy thorns, chill ice crystals
u_draco_2.png - ice - self: a round mint-teal dragon fruit wrapped in a thick armored skin of pink-tipped scales with spines, a glowing shield dome around it
u_draco_3.png - ice - a big frosted dragon fruit bursting open, pink and pale-blue icy pulp and seeds blasting outward in a wide ring with ice crystals
u_draco_2b.png - ice - a round mint dragon fruit puffing a small cute frosty breath cloud like pretending to be a dragon, one red angry spike (taunt)
u_draco_3b.png - ice - self: a fortress of thick ice blocks built around pink-tipped dragon-fruit scales, glowing shield dome
u_draco_3c.png - ice - self: a juicy sliced dragon fruit dripping sweet glowing nectar, green plus glow and white sparkles
u_fdrake_2b.png - ice - a long scaly ice-blue tail made of frosted leaves sweeping in a heavy arc, ice crystals bursting at the impact
u_fdrake_3b.png - ice - self: ice-blue dragon scales made of frosted leaves standing up and glowing red with fury, a bright target ring
u_fdrake_3c.png - ice - a giant glacier block crashing down from above, huge ice crystals shattering on impact
u_petal_2b.png - grass - a pink rose blossom releasing a swirling cloud of sweet pink scent, one red downward arrow shape
u_petal_3b.png - grass - self: a dense thicket of thorny rose stems with red roses, glowing green with healing
u_petal_3c.png - grass - a whirling storm of red rose petals spinning outward, purple poison drops among them
u_thorn_2b.png - grass - a ring of sharp thorny vines snapping shut on the ground like a trap, brown roots pinning down
u_thorn_3b.png - grass - a thorny vine stabbing in and drinking a green glowing stream of sap back, purple poison drops
u_thorn_3c.png - grass - a cage of thick thorny vines closing in a dome, tight green vines binding
u_aqua_2b.png - water - self: a clear spring of fresh water bubbling up from a lily pad, green plus glow and white sparkles
u_aqua_3b.png - water - pink water-lily petals falling like heavy rain with big blue water drops
u_aqua_3c.png - water - self: a tall curtain of flowing water rising around a water lily, a glowing translucent dome
u_wind_2b.png - wind - sharp lavender petals flying fast in a straight line with bold speed streaks
u_wind_3b.png - wind - self: a flower spinning in a graceful whirl of wind, speed streaks and a bright target ring
u_wind_3c.png - wind - a huge spiral storm of petals rising into the sky, strong white wind streaks
u_spark_2b.png - bolt - self: a star-shaped flower gathering crackling static sparks into its center, speed streaks
u_spark_3b.png - bolt - a bright star-shaped flower flashing a blinding burst of yellow sparks forward
u_spark_3c.png - bolt - many star-shaped flowers raining down thunderbolts, big yellow lightning
u_tide_2b.png - water - a water vine pulling a strong curved current inward like a rope, brown roots
u_tide_3b.png - water - a vine spiraling into a whirlpool, a green glowing stream flowing back, blue drops
u_tide_3c.png - water - self: a rising tide wave washing over a water vine, green plus glow and white sparkles
u_ember_2b.png - fire - self: a cactus whose spines glow red-hot like armor, orange heat and a red glow
u_ember_3b.png - fire - a cactus flicking a bright ember spark forward, one red angry spike
u_ember_3c.png - fire - a blazing desert sun over sand dunes sending down waves of burning heat, orange flames
u_gaia_2b.png - earth - self: a big round stone shield covered with moss, a glowing translucent dome
u_gaia_3b.png - earth - self: the ground pulsing with a glowing green heartbeat ring, a sturdy rock barrier
u_gaia_3c.png - earth - a giant fist made of rock and roots smashing down, stun stars at the impact
u_blaze_2b.png - fire - a flaming flower bud thrusting forward like a spear tip, orange flames
u_blaze_3b.png - fire - self: a glowing burning heart-shaped flower bud with a red glow and a bright target ring
u_blaze_3c.png - fire - a huge crimson solar flare of fire bursting in a giant arc
u_gale_2b.png - wind - self: a spiky round cactus spinning like a top, sharp spines, speed streaks
u_gale_3b.png - wind - a wide swirling sandstorm of sand-colored wind streaks
u_gale_3c.png - wind - a whirlwind full of flying cactus spines, one red downward arrow shape
u_gvine_2b.png - wind - a ribbon-like vine cracking forward like a whip, speed streaks
u_gvine_3b.png - wind - self: a vine swinging on the wind like a swing, speed streaks and a bright target ring
u_gvine_3c.png - wind - many ribbon vines dancing in a wide spiral across the sky, white wind streaks
u_spore_2b.png - grass - self: a mushroom cap releasing a thick curtain of spores like a wall, green plus glow
u_spore_3b.png - grass - a drifting cloud of sleepy pale spores, stun stars floating in it
u_spore_3c.png - grass - a wide net of white mycelium threads spreading over the ground, brown roots
u_frost_2b.png - ice - self: a glass bell ringing with clear white sparkles, a glowing shield dome
u_frost_3b.png - ice - a large ice bell tolling, rings of icy sound waves spreading with ice crystals
u_frost_3c.png - ice - a single giant frost crystal freezing everything around it solid, huge ice crystals
u_volt_2b.png - bolt - a glowing bud like a light bulb flashing a blinding flash, one red downward arrow shape
u_volt_3b.png - bolt - self: a copper vine coil overcharged and glowing red with crackling yellow sparks, a bright target ring
u_volt_3c.png - bolt - a wide net of crackling lightning spreading across, big yellow sparks
u_stone_2b.png - earth - self: a stone mushroom cap coated in a film of stone dust, a glowing translucent dome
u_stone_3b.png - earth - self: a mushroom covered in a shell of sharp quartz crystals, a sturdy barrier
u_stone_3c.png - earth - a landslide of tumbling boulders sliding down, green-brown dripping rust
u_jelly_2b.png - water - self: a soft squishy jelly mushroom glowing green with healing and white sparkles
u_jelly_3b.png - water - a jelly mushroom's tentacle zapping with yellow sparks, a green glowing stream flowing back
u_jelly_3c.png - water - a swarm of small jelly mushroom caps floating forward, pale yellow spores
u_fang_2b.png - earth - self: an open flytrap jaw waiting in the ground, sharp teeth-like spines, a sturdy barrier
u_fang_3b.png - earth - a flytrap jaw closing in one big gulp, a green glowing stream flowing back
u_fang_3c.png - earth - a giant flytrap jaw bursting out of the ground and snapping shut, brown roots
u_blade_2b.png - fire - self: a blade-shaped leaf being sharpened with a bright spark at its edge, a red glow and a bright target ring
u_blade_3b.png - fire - three fiery blade-leaf slashes crossing in a fast combo, orange flames
u_blade_3c.png - fire - one huge crimson lotus-shaped slash of fire, green-brown dripping rust
u_toxi_2b.png - grass - a cactus squirting thick purple poison juice, a green glowing stream flowing back
u_toxi_3b.png - grass - self: a cactus covered in purple poison spines like armor, green plus glow
u_toxi_3c.png - grass - a rotten dark spine flying forward, green-brown dripping rust
u_emcap_2b.png - fire - self: a mushroom cap glowing like a warm lantern, speed streaks and a bright target ring
u_emcap_3b.png - fire - a cloud of glowing ember spores scattering, orange flames
u_emcap_3c.png - fire - a burst of glowing ash and embers exploding outward, pale yellow spores
u_drake_2b.png - fire - a pair of wings made of flame and cactus pads flapping a blast of fire wind
u_drake_3b.png - fire - self: fire-red dragon scales made of cactus skin glowing hot, orange heat and a red glow
u_drake_3c.png - fire - a huge silhouette of a dragon made of flame and cactus spines diving down, a firestorm
u_gat_2b.png - wind - self: an open folding paper fan held up like a shield, a glowing dome and speed streaks
u_gat_3b.png - wind - a closed folding fan pointing sharply forward, one red downward arrow shape
u_gat_3c.png - wind - the beaded black hat strings of a Korean gat hat whirling into a tornado, white wind streaks
u_tal_2b.png - earth - a carved wooden Korean hahoe mask with a big smile, one red downward arrow shape
u_tal_3b.png - earth - self: two carved wooden masks swapping in a spin, white sparkles and speed streaks
u_tal_3c.png - earth - a ring of carved masks dancing around in a circle, tight green vines binding
u_drum_2b.png - bolt - a cactus drum booming, rings of thunder sound waves with yellow sparks
u_drum_3b.png - bolt - self: a round drum held up like a shield, spikes around its rim, a sturdy barrier
u_drum_3c.png - bolt - a giant drum in the sky striking a huge lightning bolt down
u_lamp_2b.png - ice - self: a Korean silk lantern on a vine glowing softly, green plus glow and white sparkles
u_lamp_3b.png - ice - frosted vines closing into a cage, ice crystals and brown roots
u_lamp_3c.png - ice - a red silk Korean lantern blazing with cold blue frost light, ice crystals
u_jar_2b.png - water - self: a clay water jar overflowing with fresh water, green plus glow and a glowing dome
u_jar_3b.png - water - self: a coiled straw head-ring cushion under a heavy clay jar, holding firm, a sturdy barrier with spikes
u_jar_3c.png - water - a clay water jar tipping and pouring a huge waterfall, big blue drops
u_dok_2b.png - bolt - a floating blue-yellow goblin fire wisp, one red downward arrow shape
u_dok_3b.png - bolt - self: a Korean goblin club (bangmangi) tapping with a bright sparkle burst, green plus glow
u_dok_3c.png - bolt - two sturdy mushroom stems locked together pushing hard, a big yellow impact burst, stun stars
u_crown_2b.png - ice - an ice crown glowing with command, one red angry spike
u_crown_3b.png - ice - self: a throne carved from ice, a sturdy barrier and green plus glow
u_crown_3c.png - ice - a giant ice scepter striking down a pillar of icy light, ice crystals
m_flamer.png - weapon - a seed-pod flamethrower nozzle spraying a wide cone of orange flame
m_rocket.png - weapon - a pinecone rocket launched from a bamboo tube, exploding in a big round blast
m_xbow.png - weapon - a crossbow made of a bent branch and a vine string firing one heavy thorn bolt
