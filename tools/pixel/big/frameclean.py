import sys
from collections import Counter
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
# 사용: despeckle.py <입력.png> <출력.png> — 외톨이 한 칸(상하좌우 네 이웃과 색이 다 다르고, 여덟 이웃 중 다섯 이상이 한 색)을 그 색으로
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()
res = im.copy()
rp = res.load()
n = 0
for y in range(h):
    for x in range(w):
        c = px[x, y]
        if c[3] == 0:
            continue
        four = [px[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < w and 0 <= y + dy < h]
        if any(q == c for q in four):
            continue
        eight = [px[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and 0 <= x + dx < w and 0 <= y + dy < h]
        eight = [q for q in eight if q[3] > 0]
        if not eight:
            continue
        col, k = Counter(eight).most_common(1)[0]
        if k >= 5:
            rp[x, y] = col
            n += 1
res.save(out)
print(out, "바뀐 칸", n)
