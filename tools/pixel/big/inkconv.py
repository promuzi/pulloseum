# 도장 잉크(코덱스 회색 배경 → greycut 누끼) → W×W 도트: 덮인 비율 0.45 이상 = 잉크 · 두 붉은색(밝기로) · 먹선 없음 · 홀로 떨어진 한 칸 지움
#  (itemconv.mjs는 바깥 둘레를 한 단 어둡게 해 도장 잉크가 먹선 두른 것처럼 보였음 — 2026-11-04 선공 · 후공 도장 시안)
#  사용: python tools/pixel/big/inkconv.py <누끼.png> <out.png> 60
import sys
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
# 도장 잉크(누끼) → W×H 도트: 덮인 비율 0.45 이상 = 잉크 · 색은 두 붉은색(밝기로) · 먹선 없음 · 홀로 떨어진 한 칸 지움
src, dst, W = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert("RGBA")
bb = im.getbbox(); im = im.crop(bb)
s = W / max(im.width, im.height); w2, h2 = max(1, round(im.width * s)), max(1, round(im.height * s))
small = im.resize((w2, h2), Image.BOX)
out = Image.new("RGBA", (W, W), (0, 0, 0, 0)); ox, oy = (W - w2) // 2, (W - h2) // 2
px = small.load(); A = {}
for j in range(h2):
    for i in range(w2):
        r, g, b, a = px[i, j]
        if a < 0.45 * 255: continue
        lum = (0.299 * r + 0.587 * g + 0.114 * b)
        A[(i, j)] = (196, 42, 34, 255) if lum < 92 else (224, 51, 42, 255)
for (i, j), c in A.items():
    n = sum(((i + di, j + dj) in A) for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    if n == 0: continue
    out.putpixel((ox + i, oy + j), c)
out.save(dst); print(dst, out.size, len(A))
