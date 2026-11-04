# fxref.mjs가 찍은 우리 효과 · 바탕 + PVFX 도트 엄격판 → 비교판(줄 = 원소 · 왼쪽 우리 · 오른쪽 PVFX를 같은 자리 · 같은 배율로)
#  PVFX 기준점(pivot): 땅에서 솟는 효과(번개 · 서리 · 덩굴 · 포자 · 물) = 맞는 식물 화분 밑 · 바람 칼 = 칼 가운데를 몸 가운데 · 나머지 = 몸 가운데(맞는 자리)
#  python tools/shots/fxref_sheet.py           → tools/shots/out/fxref/fxref.png(네 순간)
#  python tools/shots/fxref_sheet.py --video   → tools/shots/out/fxref/frames/*.png(맞는 순간부터 0.8초 · 50ms마다 · 원소마다 왼쪽 우리 | 오른쪽 PVFX) — fxref.mjs --video 뒤
#  --mod = 셋째 칸에 우리 그림체로 고친 PVFX(tools/pixel/big/pvfxmod.py → tools/pixel/fx_ref/pvfx_mod) — 같은 순간(맞는 순간부터 ms)으로 견줌
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out", "fxref")
rows = json.load(open(os.path.join(OUT, "rows.json"), encoding="utf-8"))
K, HW, HU, HD = 3, 72, 82, 64   # 화면 배율 · 자를 반폭 · 위 · 아래(논리 칸, 맞는 식물 몸 가운데 기준)
GROUND = {"lightning/lightning-strike", "ice/frost-nova", "nature/vine-snare", "nature/spore-burst", "water/water-splash"}
font = ImageFont.truetype(r"C:\Windows\Fonts\malgunbd.ttf", 30); small = ImageFont.truetype(r"C:\Windows\Fonts\malgunbd.ttf", 22)
def crop(path, t):
    im = Image.open(path).convert("RGB"); x, y = t["x"] * K, t["y"] * K
    return im.crop((x - HW * K, y - HU * K, x + HW * K, y + HD * K))
def pv_at(r, i):
    sh = Image.open(r["sheet"]).convert("RGBA"); w, h = r["size"]
    return sh.crop(((i % 8) * w, (i // 8) * h, (i % 8) * w + w, (i // 8) * h + h))
MOD = os.path.join(HERE, "..", "pixel", "fx_ref", "pvfx_mod")
def mod_row(r):   # 같은 효과의 고친 판(크기 · 기준점 · 장 길이가 다름)
    d = os.path.join(MOD, r["fx"]); m = json.load(open(os.path.join(d, "manifest.json"), encoding="utf-8"))
    return {**r, "sheet": os.path.join(d, "sprite-sheet.png"), "size": m["source_size"], "pivot": m["pivot"], "n": len(m["frames"]), "dur": [f["duration"]["numerator_ms"] for f in m["frames"]]}
def safe_place(r, base, fr):   # PVFX 한 장을 바탕(잘라 낸 칸)에 기준점대로 얹음 — 바탕 밖으로 나가는 부분은 잘림(큰 판에 붙인 뒤 바탕 크기로 자름)
    b = base.copy().convert("RGBA"); w, h = r["size"]; px, py = r["pivot"]
    if r["fx"] == "wind/wind-blade": px = w // 2
    ax, ay = (r["ground"]["x"] - r["tgt"]["x"], r["ground"]["y"] - r["tgt"]["y"]) if r["fx"] in GROUND else (0, 0)   # 몸 가운데 기준 칸
    fr3 = fr.resize((w * K, h * K), Image.NEAREST); x0, y0 = b.width // 2 + (ax - px) * K, HU * K + (ay - py) * K
    big = Image.new("RGBA", (b.width + 2 * fr3.width, b.height + 2 * fr3.height)); big.alpha_composite(b, (fr3.width, fr3.height)); big.alpha_composite(fr3, (x0 + fr3.width, y0 + fr3.height))
    return big.crop((fr3.width, fr3.height, fr3.width + b.width, fr3.height + b.height)).convert("RGB")
def frame_at_ms(r, ms):   # PVFX 시간표(장마다 길이)에서 ms 순간의 장 · 끝나면 None
    t = 0
    for i, d in enumerate(r["dur"]):
        if ms < t + d: return i
        t += d
    return None
USE_MOD = "--mod" in sys.argv
if "--video" in sys.argv:
    FD = os.path.join(OUT, "frames_mod" if USE_MOD else "frames"); os.makedirs(FD, exist_ok=True)
    for f in os.listdir(FD): os.remove(os.path.join(FD, f))
    n = 0; s = 0.5
    for r in rows:
        base = crop(r["base"], r["tgt"]); rm = mod_row(r) if USE_MOD else None
        for j, ms in enumerate(r["at"]):
            ours = crop(r["ours"][j], r["tgt"]); i = frame_at_ms(r, ms)
            cols = [ours, safe_place(r, base, pv_at(r, i)) if i is not None else base]
            if rm: k = frame_at_ms(rm, ms); cols.append(safe_place(rm, base, pv_at(rm, k)) if k is not None else base)
            cw, ch = int(ours.width * s), int(ours.height * s)
            fr = Image.new("RGB", (cw * len(cols) + 10 * (len(cols) + 1), ch + 96), (24, 28, 36)); d = ImageDraw.Draw(fr); d.text((10, 12), r["name"], font=font, fill=(230, 236, 245))
            for c, (im, lab) in enumerate(zip(cols, ["우리", "PVFX 원본", "PVFX 고침"])):
                x = 10 + c * (cw + 10); fr.paste(im.resize((cw, ch), Image.LANCZOS), (x, 56)); d.text((x + 6, 56 + ch + 4), lab, font=small, fill=(255, 230, 160))
            fr = fr.crop((0, 0, fr.width - fr.width % 2, fr.height - fr.height % 2))
            fr.save(os.path.join(FD, f"f{n:05d}.png")); n += 1
        for _ in range(6): fr.save(os.path.join(FD, f"f{n:05d}.png")); n += 1   # 원소 사이 잠깐 멈춤
    print("장", n, fr.size)
    sys.exit(0)
cells = []
for r in rows:
    ours = [crop(f, r["tgt"]) for f in r["ours"]]
    base = crop(r["base"], r["tgt"]); n = r["n"]
    pv = [safe_place(r, base, pv_at(r, round(n * f))) for f in (0.12, 0.3, 0.5, 0.75)]
    cells.append((r["name"], ours, pv))
cw, ch = cells[0][1][0].size; s = 0.5; cw2, ch2 = int(cw * s), int(ch * s)
LW, GAP, SEP, TOP = 170, 6, 26, 56
W = LW + 8 * cw2 + 7 * GAP + SEP + 20; H = TOP + len(cells) * (ch2 + GAP) + 10
sheet = Image.new("RGB", (W, H), (24, 28, 36)); d = ImageDraw.Draw(sheet)
d.text((LW + 2 * cw2, 12), "우리 효과", font=font, fill=(255, 230, 160)); d.text((LW + 4 * (cw2 + GAP) + SEP + 1.5 * cw2, 12), "PVFX", font=font, fill=(160, 220, 255))
for j, (name, ours, pv) in enumerate(cells):
    y = TOP + j * (ch2 + GAP); d.text((12, y + ch2 // 2 - 16), name, font=small if len(name) > 4 else font, fill=(230, 236, 245))
    for i, im in enumerate(ours + pv):
        x = LW + i * (cw2 + GAP) + (SEP if i >= 4 else 0)
        sheet.paste(im.resize((cw2, ch2), Image.LANCZOS), (x, y))
sheet.save(os.path.join(OUT, "fxref.png")); print(os.path.join(OUT, "fxref.png"), sheet.size)
