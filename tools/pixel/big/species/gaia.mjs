// 가이아록(gaia) — 바위 갑주 선인장 요새. 컨셉 아트 concept/gaia.png 를 따른다:
//   넓고 낮은 골 진 초록 선인장 몸을 둥글둥글한 베이지 바윗덩이들이 덮고, 왼쪽 위로 청록 결정이 솟으며,
//   바위 틈엔 이끼, 앞에는 두 돌주먹이 흙을 짚고, 바위 사이로 작은 호박빛 눈이 내다본다.
// 움직임: 거의 움직이지 않는 요새 — 결정에 빛이 한 번 스치고, 이끼가 아주 살짝 흔들린다.
import { plant, MAT, cactusBall, crystal, eyes } from '../parts.mjs';
import { ellipse, poly, oklch } from '../engine.mjs';

const CACT = [oklch(0.32, 0.05, 150), oklch(0.44, 0.08, 140), oklch(0.56, 0.1, 132), oklch(0.68, 0.11, 125), oklch(0.8, 0.11, 115)];
const STONE = [oklch(0.4, 0.05, 55), oklch(0.56, 0.065, 66), oklch(0.7, 0.075, 75), oklch(0.81, 0.07, 82), oklch(0.9, 0.05, 88)];
const XTAL = [oklch(0.4, 0.07, 205), oklch(0.56, 0.1, 192), oklch(0.7, 0.12, 182), oklch(0.82, 0.11, 175), oklch(0.93, 0.07, 170)];
const MOSS = [oklch(0.4, 0.07, 140), oklch(0.55, 0.11, 130), oklch(0.68, 0.14, 122), oklch(0.79, 0.15, 115), oklch(0.88, 0.13, 108)];

// 바윗덩이: 가운데 (x, y), 반지름 r, 모서리 수 n, 각도 a — 둥글게 깎인 다각형
const rock = (x, y, r, n = 6, a = 0, sq = 0.85) => poly(Array.from({ length: n }, (_, i) => {
  const th = a + i * 2 * Math.PI / n, rr = r * (0.86 + 0.14 * Math.cos(i * 2.3 + a * 3));
  return [x + Math.cos(th) * rr, y + Math.sin(th) * rr * sq];
}), { hz: r * 0.55, bev: r * 0.45 });

export default function gaia(f = {}) {
  const S = plant(), t = f.t ?? null;
  // 선인장 몸(넓고 낮다)
  cactusBall(S, 'core', 48, 52, 25, 22, { ribs: 7, amp: 0.3, ramp: CACT, spine: { every: 7, len: 3, color: STONE[4] } });
  // 결정(왼쪽 위)
  crystal(S, 'xtal', [26, 36], -115, 16, 3.4, { ramp: XTAL });
  crystal(S, 'xtal', [31, 33], -82, 13, 3, { ramp: XTAL });
  crystal(S, 'xtal', [21, 40], -150, 10, 2.6, { ramp: XTAL });
  crystal(S, 'xtal', [62, 32], -70, 8, 2.2, { ramp: XTAL });
  // 바윗덩이들(층마다 다른 무리 — 맞닿은 자리에 선과 그림자)
  const R = { ramp: STONE, ...MAT.rock, smooth: 0.5 };
  // 얼굴(눈) 자리 47,41 둘레만 비워 두고 몸을 덮는다
  [[34, 31, 10, 6, 0.3], [60, 30, 10.5, 7, 0.1], [71, 44, 9, 6, 0.6], [25, 47, 9, 5, 0.2], [62, 55, 9.5, 6, 0.9], [36, 56, 9, 6, 0.4], [48, 27, 7, 5, 0.7], [73, 61, 7, 6, 0.2], [22, 61, 7, 6, 0.7]]
    .forEach(([x, y, r, n, a], k) => S.layer('stone' + (k % 4), R).add(rock(x, y, r, n, a)));
  // 이끼(바위 위)
  const sw = t === null ? 0 : Math.sin(2 * Math.PI * t) * 0.4;
  const moss = S.layer('moss', { ramp: MOSS, ...MAT.leaf, spec: null });
  [[33, 23.5, 5], [59, 22, 5], [48, 21.5, 3.5], [71, 37, 3.5], [25, 40, 3.5], [62, 48, 3.5], [36, 49, 3]].forEach(([x, y, r]) => moss.add(ellipse(x + sw, y, r, 1.7, { hz: 1.2 })));
  // 돌주먹 둘(앞, 흙을 짚음)
  S.layer('fistL', R).add(rock(35, 69, 10, 7, 0.4, 0.78));
  S.layer('fistR', R).add(rock(61, 69, 10, 7, 0.1, 0.78));
  moss.add(ellipse(33, 62.5, 4, 1.6, { hz: 1 })).add(ellipse(63, 62.5, 4, 1.6, { hz: 1 }));
  // 결정을 스치는 빛(한 바퀴에 한 번)
  if (t !== null) { const p = t * 1.6; if (p < 1) S.paint([[22 + p * 12, 28 + p * 4], [23 + p * 12, 28 + p * 4]], '#ffffff', S.layer('xtal').z); }
  eyes(S, [[42, 40], [51, 40]], { style: 'glint', g: oklch(0.78, 0.15, 70), c: oklch(0.93, 0.1, 95) });
  return S;
}
