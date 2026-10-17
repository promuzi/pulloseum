(2026-10-17 사용자 "3번까지 다 하자" — 새 식물 아홉의 개성 기술 54장(종마다 어린 1 · 자라는 2 · 다 자란 3). 스타일 블록은 SKILL_EXTRA_PROMPT.md 그대로.
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

u_gladi_1.png - earth - a short sword made of one long sharpened cactus spine thrusting forward with a sharp impact flash
u_gladi_2.png - earth - self: a round bronze-studded shield made of a flat cactus pad raised up, a sturdy glowing barrier with spines
u_gladi_2b.png - earth - a round cactus-pad shield bashing forward with a heavy impact, one red downward arrow shape
u_gladi_3.png - earth - a long cactus-spine sword slashing down in one heavy bold arc, green-brown dripping rust at the cut
u_gladi_3b.png - earth - self: a bronze gladiator helmet object with a tall red-brown crest of dried cactus-flower fibers glowing red with fury, a bright target ring
u_gladi_3c.png - earth - a huge cactus-spine sword planted into sandy arena ground with a shockwave ring, one red angry spike
u_jang_1.png - grass - a stern beam of light shooting from the top of a carved green cactus guardian-totem pillar object, one red downward arrow shape
u_jang_2.png - grass - self: a tall carved green cactus guardian-totem pillar object standing firm, a sturdy barrier and green plus glow
u_jang_2b.png - grass - leafy pine-needle sprigs whipping forward, purple poison drops
u_jang_3.png - grass - a tall carved cactus totem pillar object topped with a black scholar hat slamming down like a pillar, one red angry spike
u_jang_3b.png - grass - self: a carved cactus totem pillar object with a wide carved grin pattern, a glowing translucent dome and white sparkles
u_jang_3c.png - grass - thick brown roots bursting up from the ground in a wide ring around the base of a carved cactus totem pillar
u_astro_1.png - wind - a big clear air bubble shooting forward from a pale mushroom cap, wind streaks
u_astro_2.png - wind - self: a small white air-tank backpack object with two nozzles blasting jets, speed streaks and a bright target ring
u_astro_2b.png - wind - pale yellow spores floating weightlessly inside a big clear glass bubble
u_astro_3.png - wind - a pale mushroom cap inside a round glass helmet bubble rocketing forward along a curved orbit trail, speed streaks
u_astro_3b.png - wind - self: a clear round glass astronaut helmet bubble object with small orange rim lights, a glowing translucent dome and white sparkles
u_astro_3c.png - wind - a swirling cosmic wind storm with small stars spinning in a wide spiral
u_viking_1.png - ice - two short curved ice horns on a mushroom cap butting forward, ice crystals at the impact
u_viking_2.png - ice - self: a steel-grey horned helmet object with two curved ice horns glowing red with fury, speed streaks
u_viking_2b.png - ice - one big curved ice horn stabbing forward, ice crystals bursting
u_viking_3.png - ice - a horned helmet mushroom cap charging through a wall of shattering glacier ice
u_viking_3b.png - ice - self: a thick frosty lichen cloak wrapped around a mushroom stalk, a sturdy barrier and green plus glow
u_viking_3c.png - ice - a giant frozen braid of frosty roots swinging down like a hammer, stun stars
u_hyunmu_1.png - water - a slender glossy blue water vine shaped like a little serpent coiling tight, green vines binding
u_hyunmu_2.png - water - self: a domed mushroom cap shaped like a tortoise shell with hexagonal dark-teal plates, a glowing translucent dome
u_hyunmu_2b.png - water - a finned blue water-vine tail lashing out a curved water blade, big blue drops
u_hyunmu_3.png - water - a huge rolling wave spreading in a wide ring from a tortoise-shell-shaped mushroom cap
u_hyunmu_3b.png - water - self: a hexagonal-plated shell-shaped mushroom cap glowing pale gold, green plus glow and spiky barrier edges
u_hyunmu_3c.png - water - a big glossy dark-blue serpent made of water vines and fin leaves diving down in a spiral, a green glowing stream flowing back
u_gumiho_1.png - fire - a small blue-white flame flying forward from the tip of a fluffy orange tail-shaped petal
u_gumiho_2.png - fire - swirling hypnotic orange and cream petals curling in a spiral, one red downward arrow shape
u_gumiho_2b.png - fire - a fluffy orange-cream tail-shaped petal sweeping in an arc trailing orange flames
u_gumiho_3.png - fire - nine fluffy tail-shaped petals fanned out, each tip shooting a blue-white flame outward in a wide ring
u_gumiho_3b.png - fire - self: a glowing pearl bead floating above orange petals, green plus glow and a bright target ring
u_gumiho_3c.png - fire - one giant blue-white flame blazing forward with fluffy tail-shaped petals behind it
u_wizard_1.png - bolt - a small glowing yellow star-shaped bud zapping a crackling spark
u_wizard_2.png - bolt - a long thin stem wand with a glowing star bud tip casting a bolt, one red downward arrow shape
u_wizard_2b.png - bolt - self: a closed bell-flower glowing inside a translucent magic dome, a bright target ring
u_wizard_3.png - bolt - a tall crooked dark-indigo petal wizard hat object with yellow star spots, a big zigzag lightning bolt shooting out
u_wizard_3b.png - bolt - self: white sparkles and small yellow stars pouring out of a tipped indigo petal hat object, speed streaks
u_wizard_3c.png - bolt - a glowing yellow star-shaped seal of crackling lightning, stun stars
u_ninja_1.png - wind - a four-pointed shuriken-shaped leaf spinning fast forward, wind streaks
u_ninja_2.png - wind - self: a dark-green vine blurring into fast afterimages, speed streaks and a bright target ring
u_ninja_2b.png - wind - a dark-green vine snapping out into a tight lasso loop, green vines binding
u_ninja_3.png - wind - many four-pointed shuriken-shaped leaves flying out in a wide spinning ring
u_ninja_3b.png - wind - self: a puff of soft lavender smoke cloud wrapped around a vine, a glowing translucent dome and speed streaks
u_ninja_3c.png - wind - a long red ribbon-like leaf scarf trailing behind one fast diagonal slash, one red downward arrow shape
u_haenyeo_1.png - water - a teal water vine diving down into blue water with a splash, big blue drops
u_haenyeo_2.png - water - self: a round leaf with a round diving mask object breathing out a whistling burst of bubbles, green plus glow and white sparkles
u_haenyeo_2b.png - water - a bright orange round float buoy object flying forward trailing water drops
u_haenyeo_3.png - water - a big curling wave with an orange round float buoy object riding on top
u_haenyeo_3b.png - water - a small net bag made of vines catching and pinning down, brown roots pinning down
u_haenyeo_3c.png - water - a vine reaching deep into dark-blue water pulling up a glowing shell, a green glowing stream flowing back

When done (or if you must stop), reply with the list of saved files.
