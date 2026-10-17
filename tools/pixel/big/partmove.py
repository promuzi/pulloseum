# 원화에서 몸 한 부분만 떼어 옮기기(2026-10-17 사용자 "성체 용 꼬리가 이상해 — 위로 꼬리만" · 드레이크캑터 꼬리 190칸 위로)
#   python tools/pixel/big/partmove.py <원화.png> <결과.png> <seed_x> <seed_y> <cut_x> <dx> <dy>
#   x < cut_x 쪽에서 seed 칸과 이어진 덩어리(알파 > 16 · 8방향)만 떼어 (dx, dy)만큼 옮겨 위에 덮음 — 떼어 낸 자리는 비움
#   몸에 붙은 곳은 cut_x 세로 줄로 자르므로, 옮길 부분이 다른 부분(날개 등)과 배경으로 떨어져 있어야 함(확대해 보고 정할 것)
import sys
sys.stdout.reconfigure(encoding="utf-8")
import numpy as np
from PIL import Image
from scipy import ndimage
src, dst = sys.argv[1], sys.argv[2]
sx, sy, cut, dx, dy = (int(v) for v in sys.argv[3:8])
im = np.array(Image.open(src).convert('RGBA'))
H, W = im.shape[:2]
a = im[..., 3]
xx = np.mgrid[0:H, 0:W][1]
lab, _ = ndimage.label((a > 16) & (xx < cut), structure=np.ones((3, 3)))
assert lab[sy, sx] > 0, 'seed 칸이 비었음'
part = ndimage.binary_dilation(lab == lab[sy, sx], iterations=2) & (a > 0) & (xx < cut + 2)
ys, xs = np.where(part)
print('옮길 칸', int(part.sum()), '범위', xs.min(), xs.max(), ys.min(), ys.max())
out = im.copy()
out[part] = 0
piece = np.zeros_like(im)
ny, nx = ys + dy, xs + dx
ok = (ny >= 0) & (ny < H) & (nx >= 0) & (nx < W)
piece[ny[ok], nx[ok]] = im[ys[ok], xs[ok]]
A = Image.fromarray(out)
A.alpha_composite(Image.fromarray(piece))
A.save(dst)
