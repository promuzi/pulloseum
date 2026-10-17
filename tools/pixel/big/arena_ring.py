# 콜로세움 바닥 원 다시 그리기(2026-10-17 사용자 "가운데 원이 좀 어색해 — 맵은 지구본처럼 둥글게 뒤로 넘어가는데 원은 그냥 타원형이고
#  큰 원과 중간의 작은 원도 정렬이 안 된 것 같아"):
#  코덱스 그림(bgconv 270×348)의 두 원 = 중심 · 납작함이 같은 평면 타원(위아래 간격 같음, 중심 y 225.5 — 바닥 빛 가운데 y 207보다 아래)
#  → 옛 원을 지우고(원 둘레 칸을 원과 수직 방향 2~3칸 밖 모래 칸으로 메움), 바닥 원근에 맞춘 원을 1칸 선으로 다시 그림.
#  바닥 원근 = 받침 두 개(battle.js 상대 y 156 · 납작함 0.31, 나 y 282 · 0.4384)에서 역산한 지평선 y −148 · 초점 981(그림 좌표, 카메라 높이 = 1):
#   땅 점(X, Z) → 화면 x = 135 + F·X/Z, y = −148 + F/Z. 원 가운데 = 두 받침의 깊이 가운데(y 208 — 빛 가운데와 같음), 반지름 = 가운데 깊이에서 폭 112 · 56칸.
#  입력 = concept/ui/arena_colosseum_270.png(옛 원이 있는 변환본 — 다시 돌려도 같은 결과), 출력 = assets/v2/bg/arena_colosseum.png
#  사용: python tools/pixel/big/arena_ring.py [--show 검토.png]
import sys, math, os
sys.stdout.reconfigure(encoding="utf-8")
from PIL import Image
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'concept', 'ui', 'arena_colosseum_270.png')
DST = os.path.join(HERE, '..', '..', '..', 'assets', 'v2', 'bg', 'arena_colosseum.png')
OLD = [(134.5, 225.5, 112.0, 49.0), (135.0, 225.5, 56.0, 24.5)]   # 옛 원(중심 x, y, 가로 · 세로 반지름 — ring 맞춤으로 잼)
YH, F, CX = -148.0, 981.0, 135.0
FOE_Y, ME_Y = 156.0, 282.0          # 받침 자리(battle.js EY − AY · PY − AY)
HALF = [112.0, 56.0]                # 새 원 가운데 깊이에서의 가로 반폭

im = Image.open(SRC).convert('RGB')
a = np.asarray(im).astype(np.int32).copy()
H, W, _ = a.shape
L = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]

# ① 옛 원 지우기: 타원까지 거리(|F| / |∇F|) ≤ 1.6칸이고 원과 수직 방향 양쪽(3칸)보다 어두운 칸 → 그 방향 2~3칸 밖 칸 색
rng = np.random.default_rng(20261017)
ring = np.zeros((H, W), bool)
for (cx, cy, A, B) in OLD:
    for y in range(int(cy - B - 3), int(cy + B + 4)):
        for x in range(int(cx - A - 3), int(cx + A + 4)):
            if not (0 <= x < W and 0 <= y < H): continue
            u, v = (x - cx) / A, (y - cy) / B
            f = u * u + v * v - 1
            gx, gy = 2 * (x - cx) / (A * A), 2 * (y - cy) / (B * B)
            gn = math.hypot(gx, gy) or 1
            if abs(f) / gn <= 1.6: ring[y, x] = True
out = a.copy()
ys, xs = np.nonzero(ring)
fixed = 0
for y, x in zip(ys, xs):
    # 이 칸에서 가장 가까운 옛 원의 수직 방향
    best = None
    for (cx, cy, A, B) in OLD:
        u, v = (x - cx) / A, (y - cy) / B
        f = u * u + v * v - 1
        gx, gy = 2 * (x - cx) / (A * A), 2 * (y - cy) / (B * B)
        gn = math.hypot(gx, gy) or 1
        d = abs(f) / gn
        if best is None or d < best[0]: best = (d, gx / gn, gy / gn)
    _, nx, ny = best
    side = 1 if rng.random() < 0.5 else -1
    for s2 in (side, -side):
        for dist in (3, 2, 4):
            X, Y = int(round(x + nx * dist * s2)), int(round(y + ny * dist * s2))
            if 0 <= X < W and 0 <= Y < H and not ring[Y, X]:
                out[y, x] = a[Y, X]; fixed += 1; break
        else: continue
        break

# ② 새 원(바닥 원근): 땅 원 → 화면 칸 줄(8방향 1칸 선 — 꺾인 자리 L자 칸 뺌)
Zf, Zm = F / (FOE_Y - YH), F / (ME_Y - YH)
Zc = (Zf + Zm) / 2
def ring_px(R):
    pts = []
    for i in range(8000):
        t = 2 * math.pi * i / 8000
        Xg, Zg = R * math.cos(t), Zc + R * math.sin(t)
        pts.append((int(round(CX + F * Xg / Zg)), int(round(YH + F / Zg))))
    path = []
    for p in pts:
        if not path or path[-1] != p: path.append(p)
    if path[0] == path[-1]: path.pop()
    changed = True
    while changed:   # 앞뒤 칸이 8방향으로 붙으면 가운데(L자 모서리) 칸은 뺌
        changed = False; i = 0
        while i < len(path) and len(path) > 8:
            p0, p2 = path[i - 1], path[(i + 1) % len(path)]
            if max(abs(p0[0] - p2[0]), abs(p0[1] - p2[1])) <= 1: path.pop(i); changed = True
            else: i += 1
    return path
# 선 색 = 그 자리 모래 × 옛 원 선의 어둡기(옛 원 칸 / 수직 3칸 밖 칸, 색마다 중앙값)
ratios = []
for y, x in zip(ys, xs):
    if L[y, x] < np.median(L[max(0, y - 3):y + 4, max(0, x - 3):x + 4]) - 8: ratios.append(a[y, x] / np.maximum(1, out[y, x]))
K = np.median(np.array(ratios), axis=0) if ratios else np.array([0.82, 0.78, 0.76])
K = np.clip(K, 0.6, 0.95) ** 1.6   # 옛 원(1~2칸 굵기)과 비슷한 무게 — 1칸 선을 조금 더 진하게 + 아래 칸에 옅은 그늘
for R in [h * Zc / F for h in HALF]:
    for (x, y) in ring_px(R):
        if 0 <= x < W and 0 <= y < H:
            out[y, x] = np.clip(np.round(out[y, x] * K), 0, 255)
            if y + 1 < H: out[y + 1, x] = np.clip(np.round(out[y + 1, x] * 0.94), 0, 255)
res = Image.fromarray(out.astype(np.uint8), 'RGB')
res.save(DST)
far = [YH + F / (Zc + h * Zc / F) for h in HALF]; near = [YH + F / (Zc - h * Zc / F) for h in HALF]; mid = YH + F / Zc
print(f'옛 원 칸 {int(ring.sum())} · 메움 {fixed} · 선 어둡기 {np.round(K, 3)}')
print(f'새 원 가운데 y {mid:.1f} · 큰 원 y {far[0]:.1f}~{near[0]:.1f} · 작은 원 y {far[1]:.1f}~{near[1]:.1f} · 먼 쪽 간격 {far[1] - far[0]:.1f} · 가까운 쪽 {near[0] - near[1]:.1f}')
if '--show' in sys.argv:
    o = sys.argv[sys.argv.index('--show') + 1]
    z = 3; A0 = im.resize((W * z, H * z), Image.NEAREST); B0 = res.resize((W * z, H * z), Image.NEAREST)
    sh = Image.new('RGB', (W * z, (190) * z * 2 + 8), (255, 255, 255))
    sh.paste(A0.crop((0, 140 * z, W * z, 330 * z)), (0, 0)); sh.paste(B0.crop((0, 140 * z, W * z, 330 * z)), (0, 190 * z + 8))
    sh.save(o); print('검토 →', o)
