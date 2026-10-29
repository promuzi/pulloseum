# 보호막 효과 아이콘 = 새싹을 감싼 물방울 막(2026-10-29 사용자 '보호막도 아이콘이 뭘 말하려는지 모르겠음' — 전 = 원화 얼음 결정 · 카드 수치 = 얼음 눈꽃)
#  전투의 둥근 막(auras.js drawBarriers — 하늘 유리 방울)과 같은 뜻 · 세 크기: 11칸(fx_barrier.png · 카드 오른쪽 위 수치 · 뒷면) · 18칸(_m · 효과 칩 · 효과 창) · 22칸(_b · 두 배 자리)
#  11칸은 손으로 찍은 줄 그림, 18 · 22칸은 원(먹선 → 테 = 왼쪽 위 하늘 · 오른쪽 아래 파랑 → 속 = 아주 옅은 하늘 + 왼쪽 위 흰 빛 초승달 · 반짝 점) + 손으로 찍은 새싹
#  python tools/pixel/big/fx_barrier_bubble.py → assets/v2/icons/fx_barrier*.png (icons.mjs는 이 칸을 다시 뽑지 않음)
import math, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', '..', 'assets', 'v2', 'icons')
INK = (0x2e, 0x22, 0x2f); B = (0x8f, 0xd3, 0xff); b = (0x4d, 0x9b, 0xe6); I = (0xd2, 0xef, 0xff); W = (255, 255, 255)
G = (0x91, 0xdb, 0x69); g = (0x1e, 0xbc, 0x73); e = (0x23, 0x90, 0x63)
P11 = ['...ooooo...', '..oiiiiio..', '.oiwwiiiBo.', 'oiwiiiiiiBo', 'oiwiiGiGibo', 'oiiiiGgiibo', 'oiiiiigiibo', 'oiiiiggibbo', '.oBiieeBbo.', '..obbbbbo..', '...ooooo...']
SPROUT = {
    18: ['.GG...GG.', 'GGgG.GgGG', '.GgggggG.', '...ggg...', '....g....', '....g....', '...eee...'],
    22: ['.GGG...GGG.', 'GGGgG.GgGGG', 'GGggGgGggGG', '.GGgggggGG.', '....ggg....', '.....g.....', '.....g.....', '.....g.....', '....eee....'],
}
def rows11():
    L = {'o': INK, 'i': I, 'w': W, 'B': B, 'b': b, 'G': G, 'g': g, 'e': e}
    im = Image.new('RGBA', (11, 11), (0, 0, 0, 0))
    for j, r in enumerate(P11):
        for i, ch in enumerate(r):
            if ch in L: im.putpixel((i, j), L[ch] + (255,))
    return im
def bubble(S):
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); c = (S - 1) / 2; r = S / 2
    for j in range(S):
        for i in range(S):
            dx, dy = i - c, j - c; d = math.hypot(dx, dy)
            if d > r - 0.35: continue
            L = math.cos(math.atan2(dy, dx) - math.radians(225))
            if d > r - 1.35: col = INK
            elif d > r - 2.35: col = B if L > -0.25 else b
            elif L > 0.8 and d > r - (4.6 if S > 18 else 4.0): col = W
            elif L < -0.75 and d > r - 3.4: col = B
            else: col = I
            im.putpixel((i, j), col + (255,))
    gx, gy = round(c - r * 0.42), round(c - r * 0.42)
    for (x, y) in ([(gx, gy), (gx + 1, gy), (gx, gy + 1)] if S > 18 else [(gx, gy)]): im.putpixel((x, y), W + (255,))
    sp = SPROUT[S]; h = len(sp); w = len(sp[0]); x0 = round(c - (w - 1) / 2); y0 = round(c + r * 0.62 - h + 1)
    for jj, row in enumerate(sp):
        for ii, ch in enumerate(row):
            if ch != '.': im.putpixel((x0 + ii, y0 + jj), {'G': G, 'g': g, 'e': e}[ch] + (255,))
    return im
if __name__ == '__main__':
    rows11().save(os.path.join(OUT, 'fx_barrier.png')); bubble(18).save(os.path.join(OUT, 'fx_barrier_m.png')); bubble(22).save(os.path.join(OUT, 'fx_barrier_b.png'))
    print('fx_barrier · _m · _b')
