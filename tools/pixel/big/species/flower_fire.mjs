// 블레이즈블룸(flower_fire) — 불꽃 백합. 컨셉 아트 concept/flower_fire.png 를 따른다:
//   활짝 핀 붉은 범백합, 뒤로 젖힌 꽃잎 끝이 말려 오르는 불꽃이 되고 꽃잎엔 짙은 반점,
//   가운데 금빛 얼굴에 불씨 눈, 위로 솟은 수술 끝은 촛불, 떠오르는 불티. 긴 올리브 띠잎과 굵은 줄기.
// 움직임: 꽃잎 끝 불꽃·촛불 수술이 일렁이고(모양만 바뀜, 밑은 그대로), 불티가 올라가 사라지며, 잎이 살짝 흔들린다.
import { plant, MAT, stem, leaf, flame, FIRE, spots, eyes, swayPt } from '../parts.mjs';
import { ellipse, bez, oklch } from '../engine.mjs';

const PET = [oklch(0.35, 0.11, 12), oklch(0.47, 0.17, 20), oklch(0.57, 0.2, 26), oklch(0.67, 0.19, 36), oklch(0.81, 0.15, 60)];
const LEAF = [oklch(0.34, 0.04, 150), oklch(0.47, 0.06, 130), oklch(0.6, 0.08, 116), oklch(0.72, 0.1, 108), oklch(0.84, 0.1, 100)];
const FACE = [oklch(0.5, 0.1, 50), oklch(0.68, 0.13, 66), oklch(0.8, 0.14, 80), oklch(0.89, 0.12, 90), oklch(0.96, 0.07, 98)];

export default function flowerFire(f = {}) {
  const S = plant(), t = f.t ?? null;
  const C = [50, 36], P = (p, a, ph) => swayPt(p, t, a, a * 0.5, ph);
  // 띠잎 넷(밖으로 휘어 내려옴) + 굵은 줄기
  const L = { at: 0.3, full: 0.85, fold: 0.55, rib: true, ramp: LEAF };
  leaf(S, 'leafB', { ...L, base: [47, 73], tip: P([30, 52], 0.6, 0.3), bend: [34, 66], width: 3.4, bias: -0.06 });
  leaf(S, 'leafB', { ...L, base: [53, 73], tip: P([70, 50], 0.6, 0.8), bend: [66, 64], width: 3.4, bias: -0.06 });
  stem(S, 'stem', bez([50, 76], [53, 60], [50, 44], 8), [3.6, 3.5, 3.4, 3.3, 3.2, 3.1, 3.0, 3.0, 3.0], { ramp: LEAF });
  leaf(S, 'leafF', { ...L, base: [46, 74], tip: P([12, 66], 0.8, 0.1), bend: [18, 54], width: 4, at: 0.25 });
  leaf(S, 'leafF', { ...L, base: [54, 74], tip: P([86, 64], 0.8, 0.6), bend: [80, 52], width: 4, at: 0.25 });
  // 꽃잎 여섯: 가운데에서 뻗어 끝이 뒤로 젖혀진다. 위·옆 넷의 끝은 불꽃이 된다.
  const fire = [];
  // droop = 끝이 뒤로 젖혀 처지는 정도(옆 꽃잎일수록 크게)
  const pet = (name, ang, len, w, ph, burn, droop = 0) => {
    const a = ang * Math.PI / 180, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
    const tip = P([C[0] + d[0] * len, C[1] + d[1] * len + droop], 0.6, ph), bend = [C[0] + d[0] * len * 0.6 - n[0] * 3, C[1] + d[1] * len * 0.6 - n[1] * 3 - droop * 0.3];
    leaf(S, name, { base: C, tip, bend, width: w, at: 0.45, full: 0.68, fold: 0.45, rib: false, ramp: PET, mat: MAT.petal });
    if (burn) fire.push([[tip[0] - d[0] * 6, tip[1] - d[1] * 4], [tip[0] + d[0] * 9 + n[0] * 2, tip[1] - 21], ph]);
  };
  pet('petB', -128, 33, 9, 0.15, true, 3); pet('petB', -52, 33, 9, 0.55, true, 3); pet('petB', -92, 29, 8.5, 0.35, false);
  pet('petF', 170, 34, 8.5, 0.25, true, 8); pet('petF', 10, 34, 8.5, 0.75, true, 8); pet('petF', 92, 17, 10, 0.5, false);
  // 범백합 반점(꽃잎 안쪽에 짙은 점)
  const dots = [[38, 26, 1], [42, 20, 0.9], [61, 25, 1], [57, 19, 0.9], [33, 37, 1], [67, 36, 1], [44, 46, 0.9], [57, 46, 0.9], [36, 31, 0.8], [64, 30, 0.8]];
  spots(S, 'petB', dots, 1); spots(S, 'petF', dots, 1);
  // 금빛 얼굴 + 불씨 눈
  S.layer('face', { ramp: FACE, amb: 0.4, dif: 0.6, th: [0.36, 0.56, 0.8], dither: 0.04 }).add(ellipse(C[0], C[1], 6.5, 5.8, { hz: 4 }));
  eyes(S, [[45, 33], [52, 33]], { style: 'iris', k: oklch(0.3, 0.09, 25), i: oklch(0.66, 0.2, 40) });
  // 꽃잎 끝 불꽃(일렁임) + 촛불 수술 + 떠오르는 불티
  fire.forEach(([b, tp, ph]) => flame(S, 'fire', { base: b, tip: tp, bend: [(b[0] + tp[0]) / 2 + (tp[0] > C[0] ? 5 : -5), (b[1] + tp[1]) / 2 + 2], width: 6, at: 0.3, t, ph }));
  const stalk = oklch(0.7, 0.12, 75);
  [[40, 13], [46, 8], [53, 7], [60, 12]].forEach(([x, y], k) => {
    for (let s = 0; s <= 8; s++) { const u = s / 8; S.paint([[C[0] + (x - C[0]) * u, C[1] - 6 + (y + 4 - C[1] + 6) * u]], stalk); }
    flame(S, 'candle', { base: [x, y + 4], tip: [x, y - 3], width: 1.8, t, ph: k * 0.27, core: 0.5 });
  });
  if (t !== null) for (let k = 0; k < 5; k++) {
    const p = (t + k / 5) % 1, x = 20 + k * 14 + Math.sin(2 * Math.PI * (p + k * 0.3)) * 2, y = 18 - p * 16;
    if (y > 0) S.paint([[x, y]], p < 0.5 ? FIRE[3] : FIRE[2]);
  }
  return S;
}
