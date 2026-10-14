// 스파크번(spark) — 번개꽃. 컨셉 아트 concept/spark.png 를 따른다:
//   번개처럼 톱니 진 노란 꽃잎 일곱이 별처럼 펼쳐지고(그늘은 라벤더), 가운데 크림빛 얼굴에 크고 둥근 눈,
//   위로 솟은 더듬이 수술 끝에 빛 구슬, 둘레로 튀는 전기. 꺾인 연두 줄기와 톱니 진 잎 둘.
// 움직임: 꽃잎·잎이 살짝 흔들리고, 빛 구슬이 깜빡이며 커졌다 작아지고, 번개가 프레임마다 다른 모양으로 튀었다 꺼진다.
import { plant, stem, leaf, bolt, eyes, glow, swayPt } from '../parts.mjs';
import { ellipse, plane, oklch } from '../engine.mjs';

const PET = [oklch(0.45, 0.07, 305), oklch(0.66, 0.08, 318), oklch(0.85, 0.15, 92), oklch(0.92, 0.15, 100), oklch(0.97, 0.08, 105)];
const LEAF = [oklch(0.38, 0.06, 280), oklch(0.52, 0.07, 262), oklch(0.7, 0.12, 115), oklch(0.8, 0.14, 110), oklch(0.9, 0.12, 105)];
const STEM = [oklch(0.4, 0.07, 150), oklch(0.55, 0.1, 138), oklch(0.7, 0.14, 126), oklch(0.82, 0.15, 118), oklch(0.92, 0.12, 110)];
const FACE = [oklch(0.55, 0.08, 60), oklch(0.75, 0.1, 75), oklch(0.88, 0.12, 90), oklch(0.94, 0.1, 98), oklch(0.98, 0.05, 100)];
const GLOW = [oklch(0.6, 0.12, 90), oklch(0.8, 0.15, 95), oklch(0.9, 0.15, 100), oklch(0.95, 0.12, 103), '#ffffff'];

export default function spark(f = {}) {
  const S = plant(), t = f.t ?? null, fi = f.i ?? 0;
  const C = [50, 31], P = (p, a, ph) => swayPt(p, t, a, a * 0.6, ph);
  // 잎 둘(톱니 진 번개 잎) + 꺾인 줄기
  leaf(S, 'leafL', { base: [47, 73], tip: P([15, 50], 0.8, 0.1), bend: [25, 71], width: 6, at: 0.4, full: 0.7, teeth: 3, serr: 0.5, fold: 0.65, rib: true, ramp: LEAF });
  leaf(S, 'leafR', { base: [53, 73], tip: P([83, 53], 0.8, 0.6), bend: [75, 71], width: 6, at: 0.4, full: 0.7, teeth: 3, serr: 0.5, fold: 0.65, rib: true, ramp: LEAF });
  stem(S, 'stem', [[48, 76], [52, 65], [46, 56], [51, 47], [50, 38]], [3, 2.9, 2.8, 2.7, 2.7], { ramp: STEM });
  // 꽃잎 일곱: 뒤 셋 → 앞 넷. 꽃잎마다 평면 두 장 — 한쪽 면은 노랑(빛), 다른 면은 라벤더(그늘) — 에 번개 꺾임 홈 하나
  const pet = (name, ang, len, w, ph) => {
    const a = ang * Math.PI / 180, sw = t === null ? 0 : Math.sin(2 * Math.PI * (t + ph)) * 0.04, d = [Math.cos(a + sw), Math.sin(a + sw)], p = [-d[1], d[0]];
    const at = (s, q) => [C[0] + d[0] * s + p[0] * q, C[1] + d[1] * s + p[1] * q], k = 0.55;
    const lay = S.layer(name, { ramp: PET, amb: 0.22, dif: 0.84, th: [0.42, 0.62, 0.86], dither: 0.04, smooth: 0.3, lip: 0 });
    lay.add(plane([at(0, -w * 0.5), at(len * 0.42, -w), at(len * 0.52, -w * 0.3), at(len * 0.6, -w * 0.85), at(len, 0), at(0, 0)], { h0: 5, g: [p[0] * k, p[1] * k], ref: C }));
    lay.add(plane([at(0, 0), at(len, 0), at(len * 0.5, w), at(0, w * 0.5)], { h0: 5, g: [-p[0] * k, -p[1] * k], ref: C }));
  };
  pet('petB', -150, 26, 8, 0.2); pet('petB', 140, 25, 8, 0.5); pet('petB', 40, 25, 8, 0.8);
  pet('petF', -100, 31, 9, 0.1); pet('petF', 176, 32, 8.5, 0.35); pet('petF', 4, 32, 8.5, 0.65); pet('petF', -45, 26, 8, 0.9);
  glow(S, 'petF', C[0], C[1], 10, 9, 1);
  // 얼굴 + 큰 눈
  S.layer('face', { ramp: FACE, amb: 0.42, dif: 0.55, th: [0.36, 0.56, 0.82], dither: 0.04 }).add(ellipse(C[0], C[1], 7.5, 6.5, { hz: 5 }));
  eyes(S, [[43, 28], [53, 28]], { style: 'big', k: oklch(0.32, 0.08, 300), i: oklch(0.72, 0.15, 70) });
  // 더듬이 수술 + 빛 구슬(깜빡이며 커졌다 작아짐)
  const tips = [[37, 8], [45, 3], [56, 2], [66, 9]];
  const stalk = oklch(0.62, 0.1, 80);
  tips.forEach(([x, y], k) => { for (let s = 0; s <= 10; s++) { const u = s / 10; S.paint([[C[0] + (x - C[0]) * u + Math.sin(u * Math.PI) * (k - 1.5) * 1.6, C[1] - 5 + (y - C[1] + 5) * u]], stalk); } });
  const orb = S.layer('orb', { ramp: GLOW, outlineIn: false, outlineOut: false, emissive: (x, y) => tips.some(([tx, ty]) => Math.hypot(x + 0.5 - tx, y + 0.5 - ty) < 1.2) ? 4 : 3 });
  tips.forEach(([x, y], k) => orb.add(ellipse(x, y, 2.2 + (t === null ? 0 : 0.6 * Math.sin(2 * Math.PI * (2 * t + k * 0.25))), 2.2, { hz: 1 })));
  // 전기: 수술 구슬 사이 + 꽃 둘레(프레임마다 씨앗이 달라 모양이 바뀌고, 몇 줄기는 꺼졌다 켜진다)
  const on = k => t === null || (fi + k) % 3 !== 0;
  [[[38, 9], [44, 4]], [[47, 3], [55, 2]], [[57, 3], [65, 9]], [[86, 26], [93, 20]], [[13, 26], [5, 21]], [[84, 46], [91, 51]]].forEach(([a, b], k) => {
    if (on(k)) bolt(S, a, b, { seed: fi * 31 + k * 7 + 1, depth: 2, amp: 0.3, fork: 0.3, core: '#ffffff', glow: GLOW[2] });
  });
  return S;
}
