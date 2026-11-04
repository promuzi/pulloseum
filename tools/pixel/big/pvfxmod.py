# PVFX Foundry(CC0) 도트 엄격판(strict) → 우리 그림체로 고친 장 그림판(2026-11-04 사용자 'pvfx가 좋긴한데 아직 좀 어색하네. 이걸 수정해서 쓰거나 할 수는 있나?')
#  어색한 까닭 → 고침:
#   ① 우리 큰 모양은 어두운 1칸 테두리(먹선 #0b1322 — attack.mjs o 층)인데 PVFX는 테두리가 없어 붕 떠 보임 → 넓이 MIN_AREA칸 넘는 덩어리만 바깥 1칸 먹선(잔 입자는 그대로)
#   ② 색이 우리 속성 색과 다름(번개가 파랑 · 서리가 하늘) → --el 속성 색 계단(palette.js ELEMENT — frames.js recolor와 같은 계단)으로 밝기대로 옮겨 칠함
#   ③ 맞기 전 예고 장이 길어 우리 맞는 장(소리 · 흰 번쩍)보다 정점이 늦음 → --peak = 가장 넓은 장의 두 장 앞부터
#   ④ 방향 있는 것(불덩이 · 바람 칼) → --mirror = 좌우 뒤집기(상대가 왼쪽에서 때릴 때)
#  python tools/pixel/big/pvfxmod.py <효과 폴더(…/strict/grid)> <out 폴더> [--el bolt] [--peak] [--mirror] [--no-outline]
#  → <out>/sprite-sheet.png + manifest.json(남긴 장 · 길이 · 기준점 — 뒤집으면 기준점도)
import sys, os, json
from PIL import Image
sys.stdout.reconfigure(encoding="utf-8")
ELEMENT = {   # v2/src/art/palette.js ELEMENT 그대로(main · light · dark)
    "fire": ("#fb6b1d", "#f9c22b", "#ae2334"), "water": ("#4d9be6", "#8fd3ff", "#4d65b4"), "grass": ("#1ebc73", "#91db69", "#239063"), "earth": ("#cd683d", "#e6904e", "#9e4539"),
    "wind": ("#a884f3", "#eaaded", "#6b3e75"), "bolt": ("#d5e04b", "#fbff86", "#a2a947"), "ice": ("#30e1b9", "#8ff8e2", "#0b8a8f"),
}
INK, MIN_AREA = (11, 19, 34), 14
args = sys.argv[1:]; src, dst = args[0], args[1]; opt = lambda k: k in args; val = lambda k: args[args.index(k) + 1] if k in args else None
hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
mix = lambda a, b, t: tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
lum = lambda c: (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255
man = json.load(open(os.path.join(src, "manifest.json"), encoding="utf-8")); W, H = man["source_size"]; px, py = man["pivot"]; N = len(man["frames"])
sheet = Image.open(os.path.join(src, "sprite-sheet.png")).convert("RGBA")
frames = [sheet.crop(((i % 8) * W, (i // 8) * H, (i % 8) * W + W, (i // 8) * H + H)) for i in range(N)]
dur = [f["duration"]["numerator_ms"] / f["duration"].get("denominator", 1) for f in man["frames"]]
start = 0
if opt("--peak"):   # 가장 넓은 장의 두 장 앞부터(맞는 순간 = 정점 바로 전)
    area = [sum(1 for a in fr.getchannel("A").getdata() if a) for fr in frames]; start = max(0, area.index(max(area)) - 2)
frames, dur = frames[start:], dur[start:]
el = val("--el")
if el:
    m, l, d = (hexrgb(c) for c in ELEMENT[el]); ramp = [mix(d, INK, 0.35), d, mix(d, m, 0.5), m, mix(m, l, 0.5), l, mix(l, (255, 255, 255), 0.55)]
    L = [lum(p[:3]) for fr in frames for p in fr.getdata() if p[3]]; lo, hi = min(L), max(L)
    for fr in frames:
        P = fr.load()
        for y in range(H):
            for x in range(W):
                r, g, b, a = P[x, y]
                if not a: continue
                t = (lum((r, g, b)) - lo) / (hi - lo) if hi > lo else 0.5
                c = ramp[min(len(ramp) - 1, round(t * (len(ramp) - 1)))]; P[x, y] = (*c, a)
def outline(fr):   # 넓이 MIN_AREA칸 넘는 덩어리(4이웃)만 바깥 1칸 먹선 — 판 둘레 1칸 넓혀 그림(가장자리 덩어리도)
    big = Image.new("RGBA", (W + 2, H + 2)); big.alpha_composite(fr, (1, 1)); P = big.load(); seen = set(); keep = set()
    for y in range(H + 2):
        for x in range(W + 2):
            if P[x, y][3] and (x, y) not in seen:
                st, comp = [(x, y)], []; seen.add((x, y))
                while st:
                    a = st.pop(); comp.append(a)
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        b = (a[0] + dx, a[1] + dy)
                        if 0 <= b[0] < W + 2 and 0 <= b[1] < H + 2 and b not in seen and P[b][3]: seen.add(b); st.append(b)
                if len(comp) >= MIN_AREA: keep.update(comp)
    add = set()
    for (x, y) in keep:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            b = (x + dx, y + dy)
            if 0 <= b[0] < W + 2 and 0 <= b[1] < H + 2 and not P[b][3]: add.add(b)
    for b in add: P[b] = (*INK, 255)
    return big
if not opt("--no-outline"): frames = [outline(fr) for fr in frames]; W2, H2, px, py = W + 2, H + 2, px + 1, py + 1
else: W2, H2 = W, H
if opt("--mirror"): frames = [fr.transpose(Image.FLIP_LEFT_RIGHT) for fr in frames]; px = W2 - 1 - px
os.makedirs(dst, exist_ok=True)
out = Image.new("RGBA", (W2 * 8, H2 * ((len(frames) + 7) // 8)))
for i, fr in enumerate(frames): out.alpha_composite(fr, ((i % 8) * W2, (i // 8) * H2))
out.save(os.path.join(dst, "sprite-sheet.png"))
json.dump({"source": src.replace("\\", "/"), "source_size": [W2, H2], "pivot": [px, py], "start": start, "frames": [{"duration": {"numerator_ms": d, "denominator": 1}} for d in dur]}, open(os.path.join(dst, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(dst, f"{W2}×{H2}", len(frames), "장 · 처음", start, "· 속성", el or "그대로")
