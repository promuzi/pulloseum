Task: edit two existing concept images into transparent cut-outs of the plant creature only. Use the built-in image editing (image_gen edit with the source image as input) and preserve the generated alpha channel.

Inputs (do not modify these files):
- C:\dev\pulloseum\tools\pixel\big\concept\gaia.png
- C:\dev\pulloseum\tools\pixel\big\concept\flower_wind.png

For each input, produce an edited image where:
- The background is fully transparent (real alpha, not a white or checkered background).
- The terracotta flower pot, the soil, and the ground shadow are completely removed.
- The plant creature itself stays exactly the same as in the input: same pose, shapes, colors, face, eyes, stone plates, crystals, moss, petals, stamens, leaves, size and position in the frame. Do not redraw or restyle it.
- gaia.png (stone golem cactus): keep its two big stone fists exactly where they are (they rest at the soil line); only the pot and soil around and under them disappear. Close the bottom of the cactus body and the fists neatly at the soil line.
- flower_wind.png (slender lavender flower): keep the thin pale stem fully visible and unbroken from the flower head down to the soil line, and keep its two long leaves; end the stem cleanly at the soil line. Keep the loose petals that fly away.
- Do not add a pot, soil, or any new object. No text, no frame, square image, same size as the input.

Save the results as PNG files with alpha into C:\dev\pulloseum\tools\pixel\big\concept\cut\ using the same file names (gaia.png, flower_wind.png). If the image tool saves files elsewhere, copy them into that folder. Do not create, modify or delete any other file, and do not commit.

When done, reply with the saved file paths and whether each file really has a transparent background (check the alpha channel, for example by reading the PNG and confirming that the corner pixels are fully transparent).
