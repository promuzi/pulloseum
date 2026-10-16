# 앱 아이콘 · 시작 화면 만들기(2026-10-16 사용자 "가운데를 아이콘으로" = icon_b.png 페탈로즈 대 아쿠아벌브)
#  안드로이드: mipmap-*/ic_launcher(.png 둥근 모서리) · ic_launcher_round(원) · ic_launcher_foreground(적응형 앞 층 — 108dp 중 그림 80dp, 보이는 72dp 안에 90%)
#  시작 화면 drawable*/splash.png = 처음 화면과 같은 검정 + 가운데 아이콘 · 플레이 스토어 아이콘 512
#  사용: python tools/pixel/big/concept/icon/make_icons.py
import os, sys
sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", ".."))
RES = os.path.join(REPO, "android", "app", "src", "main", "res")
SRC = Image.open(os.path.join(HERE, "icon_b.png")).convert("RGB")
BG = (3, 4, 9)   # 처음 화면 검정(#030409)

def sq(size):
    return SRC.resize((size, size), Image.LANCZOS)

def rounded(im, r):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0)); out.paste(im, (0, 0), m); return out

def circle(im):
    big = im.resize((im.width * 4, im.height * 4), Image.LANCZOS)
    m = Image.new("L", big.size, 0); ImageDraw.Draw(m).ellipse((0, 0, big.width - 1, big.height - 1), fill=255)
    out = Image.new("RGBA", big.size, (0, 0, 0, 0)); out.paste(big, (0, 0), m)
    return out.resize(im.size, Image.LANCZOS)

DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for d, k in DENS.items():
    folder = os.path.join(RES, "mipmap-" + d)
    n = round(48 * k)
    rounded(sq(n), round(n * 0.18)).save(os.path.join(folder, "ic_launcher.png"))
    circle(sq(n)).save(os.path.join(folder, "ic_launcher_round.png"))
    fg, art = round(108 * k), round(80 * k)
    layer = Image.new("RGBA", (fg, fg), (0, 0, 0, 0)); layer.paste(sq(art), ((fg - art) // 2, (fg - art) // 2))
    layer.save(os.path.join(folder, "ic_launcher_foreground.png"))
    print("mipmap", d, n, fg)

# 시작 화면: 있는 크기 그대로 검정 + 가운데 둥근 아이콘(짧은 변의 30%)
for name in sorted(os.listdir(RES)):
    p = os.path.join(RES, name, "splash.png")
    if not os.path.exists(p):
        continue
    w, h = Image.open(p).size
    s = round(min(w, h) * 0.30)
    out = Image.new("RGB", (w, h), BG)
    ic = rounded(sq(s), round(s * 0.18)); out.paste(ic, ((w - s) // 2, (h - s) // 2), ic)
    out.save(p); print("splash", name, w, h)

# 적응형 아이콘 뒤 층 색(그림이 보이는 칸을 덮으니 거의 안 보임 — 가장자리가 드러나는 실행기용)
with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0E2236</color>\n</resources>\n')

# 플레이 스토어 아이콘(512 · 꽉 찬 정사각 — 둥근 모서리는 스토어가 씌움)
store = os.path.join(REPO, "assets", "store"); os.makedirs(store, exist_ok=True)
sq(512).save(os.path.join(store, "icon_512.png")); print("store icon 512")
