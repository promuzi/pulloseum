# 스킬 그림(코덱스 원화, 정사각) → 전투 카드 그림 칸 도트(58×52).
# 2026-10-16 샘플 두 장으로 고른 방식: 피사체 쪽으로 1.3배 당겨 자르고(그림 칸 비율) → 잔무늬를 먼저 누그러뜨림(가운데값 5 + 흐림 5) → 대비·채도 조금 올림
#  → 58×52 로 줄이고 16색(점 흩뿌림 없이). 그대로 줄이면(bgconv --fit) 잔무늬가 점 잡음이 돼 뭉개짐.
# 사용: python tools/pixel/big/skillart.py <원화.png> <출력.png> [가운데x 0~1] [가운데y 0~1] [당김 1.3]
#  예: python tools/pixel/big/skillart.py tools/pixel/big/concept/skill/flower_grass_s2.png assets/v2/skills/u_petal_3.png 0.42 0.45
import sys
from PIL import Image, ImageFilter, ImageEnhance

W, H = 58, 52
src, out = sys.argv[1], sys.argv[2]
cx = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
cy = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
zoom = float(sys.argv[5]) if len(sys.argv) > 5 else 1.3

im = Image.open(src).convert("RGB")
w, h = im.size
cw = int(w / zoom)
ch = int(cw * H / W)
x0 = int(min(max(0, cx * w - cw / 2), w - cw))
y0 = int(min(max(0, cy * h - ch / 2), h - ch))
c = im.crop((x0, y0, x0 + cw, y0 + ch)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(5))
c = ImageEnhance.Color(ImageEnhance.Contrast(c).enhance(1.25)).enhance(1.15)
q = c.resize((W, H), Image.LANCZOS).quantize(colors=16, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
q.save(out)
print(f"{src} -> {out} · {W}x{H} · 16색 · 자름 ({x0},{y0}) {cw}x{ch}")
