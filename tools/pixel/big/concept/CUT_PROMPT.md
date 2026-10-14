Task: edit two existing concept images into transparent cut-outs of the plant creature only. Use the built-in image editing (image_gen edit with the source image as input) and preserve the generated alpha channel.

Inputs (do not modify these files):
- C:\dev\pulloseum\tools\pixel\big\concept\cactus_fire.png
- C:\dev\pulloseum\tools\pixel\big\concept\flower_fire.png

For each input, produce an edited image where:
- The background is fully transparent (real alpha, not a white or checkered background).
- The terracotta flower pot, the soil, and the ground shadow are completely removed.
- The plant creature itself stays exactly the same as in the input: same pose, shapes, colors, face, eyes, flames, spines, leaves, size and position in the frame. Do not redraw or restyle it.
- Where the plant entered the soil, end its base cleanly and naturally at that soil line (for the cactus, close the round bottom of the body; for the lily, end the stem and leaf bases neatly). Do not add a pot, soil, or any new object.
- No text, no frame, square image, same size as the input.

Save the results as PNG files with alpha into C:\dev\pulloseum\tools\pixel\big\concept\cut\ using the same file names (cactus_fire.png, flower_fire.png). Create the cut folder if needed. If the image tool saves files elsewhere, copy them into that folder. Do not create, modify or delete any other file, and do not commit.

When done, reply with the saved file paths and whether each file really has a transparent background (check the alpha channel, for example by reading the PNG and confirming that the corner pixels are fully transparent).
