// 스파크번(spark) — 화초 × 번개. 번개 모양으로 꺾인 꽃잎 다섯이 별처럼 터지고, 더듬이 수술 끝 구슬 사이로 전기가 튄다.
import { plant, R, MAT, stem, zigzag, place, glow, eyes } from '../parts.mjs';
import { ellipse, poly } from '../engine.mjs';

const BOLT = [[-3, 0], [-4.5, -9], [-0.5, -9.5], [-2.5, -21], [4.5, -8], [0.5, -8], [3, 0]];   // 위를 향한 번개 꽃잎 틀
const LEAF = [[-2.5, 0], [-3.5, -7], [-0.5, -7.5], [-1.5, -16], [3.5, -6], [0.5, -6], [2.5, 0]];

export default function spark() {
  const S = plant();
  stem(S, 'stem', [[46, 76], [51, 67], [44, 58], [51, 49], [48, 42]], [3.4, 3.2, 3.0, 2.8, 2.7], { ramp: R.olive });
  const L = S.layer('leaf', { ramp: R.bolt, ...MAT.leaf, bias: 0.04 });
  L.add(poly(place(LEAF, 45, 64, -66, 1.75), { hz: 3, bev: 2.6 })).add(poly(place(LEAF, 50, 55, 64, 1.65), { hz: 3, bev: 2.6 }));
  const pB = S.layer('petalB', { ramp: R.bolt, ...MAT.petal, lip: 0, bias: 0.02 }), pF = S.layer('petalF', { ramp: R.bolt, ...MAT.petal, lip: 4, bias: 0.1 });
  [0, 72, 144, 216, 288].forEach((a, i) => (i % 2 ? pB : pF).add(poly(place(BOLT, 48, 32, a + 12, 1.5), { hz: 3.6, bev: 3.4 })));
  glow(S, 'petalF', 48, 32, 15, 15, 1);
  glow(S, 'petalB', 48, 32, 15, 15, 1);
  S.layer('disk', { ramp: R.olive, ...MAT.petal, lip: 0, bias: -0.1 }).add(ellipse(48, 32, 8.5, 7.5, { hz: 5 }));
  // 더듬이 수술 셋 + 끝의 빛 구슬, 사이를 잇는 전기
  const tips = [[30, 8], [52, 2], [72, 10]];
  for (const t of tips) S.line([48, 25], t, '#a2a947');
  const glowTip = S.layer('tip', { ramp: R.bolt, outlineIn: false, outlineOut: false, emissive: (x, y) => (tips.some(([tx, ty]) => Math.abs(x + 0.5 - tx) < 1.2 && Math.abs(y + 0.5 - ty - 0.5) < 1.2) ? 4 : 3) });
  for (const [x, y] of tips) glowTip.add(ellipse(x, y + 0.5, 2.6, 2.6, { hz: 1 }));
  zigzag(S, [33, 7], [49, 2], 5, 1.6, '#fbff86');
  zigzag(S, [55, 3], [69, 9], 5, 1.6, '#ffffff');
  zigzag(S, [82, 26], [93, 18], 4, 1.8, '#fbff86');
  zigzag(S, [12, 38], [3, 30], 4, 1.8, '#ffffff');
  zigzag(S, [76, 50], [88, 56], 3, 1.8, '#fbff86');
  zigzag(S, [16, 58], [6, 64], 3, 1.6, '#fbff86');
  eyes(S, [[42, 30], [51, 30]], { style: 'wide' });   // 크게 뜬 눈 — 전기에 찌릿한
  return S;
}
