# 원화에서 날개(몸 뒤에 붙은 큰 부분)만 키우기(2026-10-17 사용자 "성체 불 선인장 용 날개만 더 크고 넓었으면")
#   python tools/pixel/big/wingscale.py <원화.png> <결과.png> <설정.json> [--mask=<확인용.png>]
#   설정 = { "pad": [왼, 위, 오른, 아래],
#            "front": [{"seed": [x, y], "cut": [x, 0], "dy": -190}],
#            "wings": [{"seed": [x, y], "cut": [[x1, y1], [x2, y2]], "ramp": 120, "pivot": [x, y], "tip": [x, y], "along": 1.08, "perp": 1.5, "rot": 8}] }
#   날개 = cut 선(두 점)의 seed 쪽에서 seed와 이어진 덩어리(알파 > 16 · 8방향)
#   변환 = 뿌리(pivot) 둘레로 뿌리 → 끝(tip) 방향 along배 · 그 직각 perp배 · 바깥으로 rot도. cut 선에서는 안 움직이고 ramp 칸에 걸쳐 점점 다 바뀜
#     (한 번에 통째로 옮기면 cut 선에 잘린 자국 · 틈이 보였음 — 2026-10-17 첫 시험)
#   그리는 차례 = 키운 날개(뒤) → 몸(원화 − 날개 − 앞 조각) → 앞 조각(front: 꼬리처럼 날개 앞에 오는 것, x < cut[0]인 seed 덩어리를 dx · dy만큼 옮겨)
#   좌표는 pad 전 원화 기준. pad를 넣으면 eyes.mjs 등 원화 좌표를 쓰는 표도 왼쪽 · 위 pad만큼 옮길 것
import sys, json, math
sys.stdout.reconfigure(encoding="utf-8")
import numpy as np
from PIL import Image
from scipy import ndimage

src, dst, cfgp = sys.argv[1], sys.argv[2], sys.argv[3]
maskp = next((a.split('=', 1)[1] for a in sys.argv[4:] if a.startswith('--mask=')), None)
cfg = json.load(open(cfgp, encoding='utf-8'))
im = np.array(Image.open(src).convert('RGBA'))
H, W = im.shape[:2]
a = im[..., 3]
yy, xx = np.mgrid[0:H, 0:W]
S8 = np.ones((3, 3))

def comp(region, seed):
    lab, _ = ndimage.label(region, structure=S8)
    sid = lab[seed[1], seed[0]]
    assert sid > 0, f'seed {seed} 비었음'
    return ndimage.binary_dilation(lab == sid, iterations=2) & (a > 0) & ndimage.binary_dilation(region, iterations=2)

fronts = []
for f in cfg.get('front', []):
    fronts.append((comp((a > 16) & (xx < f['cut'][0]), f['seed']), f.get('dx', 0), f.get('dy', 0)))
taken = np.zeros((H, W), bool)
for m, _, _ in fronts: taken |= m

pl, pt, pr, pb = cfg.get('pad', [0, 0, 0, 0])
OW, OH = W + pl + pr, H + pt + pb
def padded(arr):
    out = np.zeros((OH, OW) + arr.shape[2:], arr.dtype); out[pt:pt + H, pl:pl + W] = arr; return out

wings = []
for w in cfg['wings']:
    cuts = w['cuts'] if 'cuts' in w else [w['cut']]   # 여러 선이면 모두의 seed 쪽(교집합) · 점점 바뀌는 거리는 ramp_line 번째 선(뿌리 = 어깨)만
    region = (a > 16) & ~taken
    lines = []
    for (x1, y1), (x2, y2) in cuts:
        nx_, ny_ = -(y2 - y1), (x2 - x1); nl = math.hypot(nx_, ny_); nx_, ny_ = nx_ / nl, ny_ / nl
        sg = 1 if (w['seed'][0] - x1) * nx_ + (w['seed'][1] - y1) * ny_ > 0 else -1
        region &= sg * ((xx - x1) * nx_ + (yy - y1) * ny_) > 0
        lines.append((x1 + pl, y1 + pt, nx_ * sg, ny_ * sg))
    m = comp(region, w['seed'])
    wings.append((m, w, lines[w.get('ramp_line', 0)]))
    print('날개 칸', int(m.sum()), '범위', xx[m].min(), xx[m].max(), yy[m].min(), yy[m].max())

body = im.copy()
for m, _, _ in wings: body[m] = 0
for m, _, _ in fronts: body[m] = 0
canvas = np.zeros((OH, OW, 4), float)

def over(dstA, srcA):   # 둘 다 곧은 알파(0~1) RGBA float → 위에 덮기
    sa = srcA[..., 3:4]; da = dstA[..., 3:4]; oa = sa + da * (1 - sa)
    rgb = np.where(oa > 0, (srcA[..., :3] * sa + dstA[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-6), 0)
    return np.concatenate([rgb, oa], -1)

QY, QX = np.mgrid[0:OH, 0:OW].astype(float)
for m, w, (cx, cy, nx_, ny_) in wings:
    piece = im.astype(float) / 255; piece[~m] = 0
    pm = padded(piece)
    pre = np.concatenate([pm[..., :3] * pm[..., 3:4], pm[..., 3:4]], -1)   # 미리 곱한 알파로 뽑아야 가장자리가 안 검어짐
    P = np.array(w['pivot'], float) + [pl, pt]; T = np.array(w['tip'], float) + [pl, pt]
    u = (T - P) / np.linalg.norm(T - P); v = np.array([-u[1], u[0]])
    th = math.radians(w.get('rot', 0)) * (-1 if T[0] < P[0] else 1)        # 끝이 몸 바깥으로 가게
    Rm = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
    A = Rm @ (w['along'] * np.outer(u, u) + w['perp'] * np.outer(v, v))
    D = float(w.get('ramp', 120))
    def disp(X, Y):   # 원본 칸 → 옮길 거리(점점)
        d = (X - cx) * nx_ + (Y - cy) * ny_
        t = np.clip(d / D, 0, 1); k = t * t * (3 - 2 * t)
        dx, dy = X - P[0], Y - P[1]
        TX = P[0] + A[0, 0] * dx + A[0, 1] * dy; TY = P[1] + A[1, 0] * dx + A[1, 1] * dy
        return k * (TX - X), k * (TY - Y)
    px, py = QX.copy(), QY.copy()
    for _ in range(40):                       # q = p + disp(p) 를 p에 대해 풂(고정점 반복)
        ddx, ddy = disp(px, py); px, py = QX - ddx, QY - ddy
    ddx, ddy = disp(px, py); err = np.hypot(px + ddx - QX, py + ddy - QY)
    samp = np.stack([ndimage.map_coordinates(pre[..., c], [py, px], order=1, mode='constant', cval=0) for c in range(4)], -1)
    samp[err > 0.75] = 0
    al = samp[..., 3:4]
    layer = np.concatenate([np.where(al > 0, samp[..., :3] / np.maximum(al, 1e-6), 0), al], -1)
    canvas = over(canvas, layer)
canvas = over(canvas, padded(body.astype(float) / 255))
for m, dx, dy in fronts:
    piece = np.zeros_like(im); ys, xs = np.where(m)
    ny2, nx2 = ys + dy, xs + dx; ok = (ny2 >= 0) & (ny2 < H) & (nx2 >= 0) & (nx2 < W)
    piece[ny2[ok], nx2[ok]] = im[ys[ok], xs[ok]]
    canvas = over(canvas, padded(piece.astype(float) / 255))
out = Image.fromarray(np.clip(canvas * 255 + 0.5, 0, 255).astype(np.uint8))
out.save(dst)
print('결과', dst, '크기', out.size, '범위', out.getbbox())
if maskp:
    vis = Image.new('RGBA', (W, H), (40, 40, 80, 255)); vis.alpha_composite(Image.fromarray(im))
    ov = np.zeros((H, W, 4), np.uint8)
    for k, (m, _, _) in enumerate(wings): ov[m] = [0, 255, 120, 120] if k == 0 else [0, 160, 255, 120]
    for m, _, _ in fronts: ov[m] = [255, 220, 0, 120]
    vis.alpha_composite(Image.fromarray(ov)); vis.convert('RGB').save(maskp)
