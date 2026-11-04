# hitstopclip.mjs가 찍은 장(기술 · 끔/켬 · 맞기 앞뒤 ms) → 경기장만 잘라 '끔 | 켬' 나란히 장 그림(보통 빠르기 = 50ms마다 · 이어서 절반 빠르기 = 25ms마다)
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")
raw, fd = sys.argv[1], sys.argv[2]; skills, ms_list = json.loads(sys.argv[3]), json.loads(sys.argv[4])
os.makedirs(fd, exist_ok=True)
for f in os.listdir(fd): os.remove(os.path.join(fd, f))
font = ImageFont.truetype(r"C:\Windows\Fonts\malgunbd.ttf", 26)
CROP = (0, 110, 540, 760)   # 2배 화면에서 경기장(상대 · 나 식물)
n = 0
def frame(sk, label, ms, tag):
    global n
    a = Image.open(os.path.join(raw, f"{sk}_0_{ms + 1000:04d}.png")).convert("RGB").crop(CROP)
    b = Image.open(os.path.join(raw, f"{sk}_1_{ms + 1000:04d}.png")).convert("RGB").crop(CROP)
    s = 0.62; w, h = int(a.width * s), int(a.height * s)
    im = Image.new("RGB", (w * 2 + 30, h + 64), (24, 28, 36)); d = ImageDraw.Draw(im)
    d.text((12, 14), f"{label} · {tag}", font=font, fill=(230, 236, 245))
    d.text((12 + w // 2 - 30, h + 26), "끔", font=font, fill=(200, 210, 225)); d.text((w + 18 + w // 2 - 30, h + 26), "켬", font=font, fill=(255, 220, 140))
    im.paste(a.resize((w, h), Image.LANCZOS), (10, 54)); im.paste(b.resize((w, h), Image.LANCZOS), (w + 20, 54))
    im = im.crop((0, 0, im.width - im.width % 2, im.height - im.height % 2)); im.save(os.path.join(fd, f"f{n:05d}.png")); n += 1
for sk, label in skills:
    for ms in ms_list[::2]: frame(sk, label, ms, "보통 빠르기")
    for ms in ms_list: frame(sk, label, ms, "절반 빠르기")
print("장", n)
