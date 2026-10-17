(2026-10-17 사용자 "코덱스는 다 써도 됨" — 그림이 없는 카드 · 기술 86장: 패시브 카드 23 · 변이 기술 카드 24 · 10-16~17 새 식물 개성 기술 39. 스타일 블록은 ALL_SKILL_ICON_PROMPT.md 그대로(작게 줄여도 읽히게 · 이미 있는 기술 그림과 같은 톤).
 결과 → `python tools/pixel/big/skillart.py <원본> assets/v2/skills/<id>.png` → `v2/src/art/skillcard.js SKILLART_NAMES`에 id 추가(패시브 카드도 카드 id로 찾음).)

Task: generate skill and card illustrations for a mobile pixel-art battle game whose creatures are plants. They are shown very small on battle cards (about 58x52 pixels after downscaling), so every image must read instantly at that size.

Work through the list below in order. For each line, generate ONE image and save it as a PNG into C:\dev\pulloseum\tools\pixel\big\concept\skill\ using exactly the file name given (the id + .png). If a file with that name already exists, skip it (this lets a later run continue where this one stopped). If the image tool saves files somewhere else, copy them into that folder with these names. Do not create, modify, or delete any other file in the repository, and do not commit. Keep going until the whole list is done; if you must stop early, the files already saved are kept.

Style for every image (same as the icons already in that folder):
- One big, bold, iconic subject filling about 70 percent of the square, centered; nothing small or fiddly, at most 2 or 3 big shapes.
- Flat cel shading with only 3 to 4 tones per color, a thick dark outline around the main shapes, no painterly texture, no fine detail, no tiny particles, no thin lines.
- Strong contrast between the subject and the background. Background = a plain soft gradient in the background color given below, slightly darker toward the edges.
- Background colors: fire = deep red-orange · water = deep blue · grass = deep green · earth = warm ochre brown · wind = soft lavender purple · bolt = dark navy with a yellow tint · ice = deep teal-cyan · normal = bright sky blue · predator = deep crimson · weapon = cool steel grey-blue · toxic = deep violet · spore = warm golden ochre · dragon = deep emerald teal.
- Plants and plant parts (leaves, petals, vines, roots, cactus, mushroom caps, seeds, cells) are the heroes; no humans, no animals, no faces (a carved mask object is fine where asked).
- Attacks show the moment of impact or launch with one bold motion shape; buffs and passives (marked "self" or "passive") show the plant part glowing or wrapped in the effect; status effects are shown by their color (burn orange flames, poison purple, wet blue drops, bind green vines, gale wind streaks, shock yellow sparks, chill ice crystals, stun stars, spore pale yellow spores, weak downward red arrow shape, taunt red angry spike).
- Square 1254x1254, no text, no letters, no numbers, no frame, no border, no watermark.

Images that already exist in that folder set the tone: before drawing, look at several of them (for example f_ball.png, w_tide.png, g_whip.png, e_quake.png, j_petals.png, u_thorn_1.png) and match their look exactly - same flat icon style, outline weight, tone count, contrast and background treatment.

Images (file name - background - what it shows):

n_fiber.png - normal - passive: a thick bundle of green plant fibers twisted together like a flexed arm, glowing with strength
n_wall.png - normal - passive: one big plant cell with a thick glowing double green wall, shaped like a sturdy shield
n_vacuole.png - normal - passive: a huge round water-filled bubble glowing inside a leaf, full and healthy
n_tropism.png - normal - passive: a sprout bending fast toward a beam of sunlight, with bold speed streaks
n_target.png - normal - passive: a glowing drop of sap with a crosshair ring made of curled leaves around it
n_chloro.png - normal - passive: three bright green chloroplast ovals stacked and sparkling with energy
n_spine.png - normal - passive: a stem covered in big sharp thorns, one thorn gleaming at the tip
n_balance.png - normal - passive: two leaves curled into a perfect yin-yang circle, glowing softly
v_sap.png - predator - passive: a sharp leafy jaw drinking a big glowing green sap droplet
v_digest.png - predator - passive: a pitcher-plant cup filled with bubbling orange digestive juice
v_jaw.png - predator - passive: a huge venus flytrap jaw with strong bristle teeth, edges glowing red
v_forge.png - weapon - passive: a leaf-shaped blade on an anvil being hammered, big bright sparks
v_ammo.png - weapon - passive: a belt of seed-pod shells packed with thorn bullets
v_edge.png - weapon - passive: a razor-sharp leaf blade with one bright gleam along its edge
v_venom.png - toxic - passive: a thorn dripping thick concentrated purple venom, three heavy drops
v_acid.png - toxic - passive: bright green acid bubbling and eating a hole into a grey stone
v_antidote.png - toxic - passive: a leaf shield turning purple poison drops into clear water
v_mycel.png - spore - passive: glowing mycelium threads spreading out in a web from a small mushroom
v_spread.png - spore - passive: a mushroom cap bursting out a ring of many pale spores
v_rot.png - spore - passive: a mushroom growing from a fallen log with green healing glow rising
v_scale.png - dragon - passive: overlapping hard dragon scales forming a shield, metallic shine
v_regen.png - dragon - passive: dragon scales glowing green while a cracked scale mends itself
v_wrath.png - dragon - passive: a crest of dragon scales erupting in roaring angry flames
m_bite.png - predator - a big plant jaw biting down hard, a red swirl drawn back into it
m_devour.png - predator - a gigantic flytrap jaw slamming shut, shockwave around it
m_hunt.png - predator - self buff: a flytrap head glowing with a red hunting aura and a target ring
m_slash.png - weapon - a leaf-blade sword slashing in a wide crescent arc
m_shot.png - weapon - a thorn bullet fired out of a seed-pod gun barrel with a muzzle flash
m_smash.png - weapon - a big gourd hammer smashing down, stun stars bursting
m_spit.png - toxic - a jet of purple poison spat out of a round plant bud
m_acid.png - toxic - a big splash of green corrosive acid hitting forward
m_miasma.png - toxic - a wide purple poison fog cloud rolling out
m_puff.png - spore - a mushroom puffing a big soft cloud of pale spores
m_sleep.png - spore - drowsy pale spores drifting around a crescent moon shape
m_bloom.png - spore - self buff: a mushroom blooming open with a warm healing glow and sparkles
m_breath.png - dragon - a dragon-shaped plant bud breathing a wide glowing beam forward
m_scale.png - dragon - self buff: a big round shield made of dragon scales
m_roar.png - dragon - a shockwave ring blasting out of a dragon-shaped bud, a red angry spike
m_flame.png - fire - a red-hot glowing leaf blade wreathed in flames, slashing
m_spear.png - bolt - a long thorn spear crackling with yellow lightning, thrusting forward
m_burrow.png - earth - a plant jaw bursting up out of the ground with flying dirt chunks
m_maw.png - water - a deep-sea plant jaw rising out of swirling water
m_bile.png - water - a jet of murky purple poison water shooting forward
m_ivy.png - grass - thorny poison ivy vines lashing out, purple drops flying
m_gust.png - wind - a strong gust of wind carrying a stream of pale spores
m_frostclaw.png - ice - three icy claw slashes ripping across
m_voltclaw.png - bolt - three crackling lightning claw slashes ripping across
u_fang_1.png - earth - a flytrap snapping its jaw shut in a quick bite
u_fang_2.png - earth - self buff: a mossy trap wall glowing green with healing
u_fang_3.png - earth - a huge earthen trap mouth swallowing, stun stars around
u_blade_1.png - fire - a flaming vine whipping in a slash
u_blade_2.png - fire - vines lined with blade leaves wrapping around tight
u_blade_3.png - fire - one blazing straight slash line of molten fire
u_toxi_1.png - grass - poison cactus spines shot forward, purple tips
u_toxi_2.png - grass - a cactus bristling all its spines with a red angry spike
u_toxi_3.png - grass - a poison cactus bursting open with a big purple splash
u_draco_1.png - ice - frosty scales shot forward like blades
u_draco_2.png - ice - self buff: icy scales raised up into a shield
u_draco_3.png - ice - a big icy breath stream blowing forward
u_emcap_1.png - fire - glowing fiery spores flying forward
u_emcap_2.png - fire - a mushroom cap glowing like a lantern, casting a warm beam
u_emcap_3.png - fire - a rolling cloud of burning spores
u_drake_1.png - fire - a flaming cactus spine shot forward
u_drake_2.png - fire - self buff: armor of red dragon scales with thorns
u_drake_3.png - fire - a huge roaring fire breath blast
u_gat_1.png - wind - a green leaf folding fan swinging out a strong gust
u_gat_2.png - wind - self buff: a black traditional Korean gat hat with its bead strap fluttering, speed lines
u_gat_3.png - wind - a whirlwind spinning around a black gat hat, carrying spores
u_tal_1.png - earth - vines swinging like dancing sleeves and wrapping around
u_tal_2.png - earth - a laughing carved wooden Korean Hahoe mask with a red angry spike beside it
u_tal_3.png - earth - vines stomping the ground so it cracks, stun stars bursting
u_drum_1.png - bolt - a drumstick striking down a bolt of lightning
u_drum_2.png - bolt - self buff: a red lacquered drum glowing with rhythm rings
u_drum_3.png - bolt - a ring of drums blasting out lightning rings
u_lamp_1.png - ice - a blue and red Korean silk lantern casting a cold blue beam
u_lamp_2.png - ice - frosty vines with icicles wrapping around tight
u_lamp_3.png - ice - a lantern spinning a swirling blizzard
u_jar_1.png - water - water pouring hard out of a brown earthenware jar
u_jar_2.png - water - self buff: a jar of cool water glowing with healing sparkles, thorns around it
u_jar_3.png - water - an earthenware jar smashing down with a huge splash
u_dok_1.png - bolt - a studded wooden goblin club zapping with lightning
u_dok_2.png - bolt - mischievous sparkling spores flying in a swirl
u_dok_3.png - bolt - a studded goblin club striking down with golden sparkles and lightning
u_crown_1.png - ice - an ice crown gem flashing a bright frosty light
u_crown_2.png - ice - self buff: a frosty white mantle cape wrapped like a shield
u_crown_3.png - ice - icy spores swirling out in a ring

When done (or if you must stop), reply with how many images were saved.
