// 윈드페탈(flower_wind) — 화초 × 바람. 바람에 기댄 가는 줄기, 깃털 같은 긴 꽃잎이 전부 왼쪽으로 흩날리고 수술은 바람을 거슬러 휜다.
import { plant, R, MAT, stem, leaf, eyes } from '../parts.mjs';
import { bez, ellipse } from '../engine.mjs';

export default function flowerWind() {
  const S = plant();
  stem(S, 'stem', bez([52, 76], [62, 54], [56, 31], 10), [2.8, 2.7, 2.6, 2.5, 2.4, 2.3, 2.2, 2.1, 2.0, 2.0, 2.0], { ramp: R.rock });
  leaf(S, 'leaf', { base: [56, 60], tip: [16, 64], bend: [36, 52], width: 3.4, at: 0.3, full: 0.9, ramp: R.rock });
  leaf(S, 'leaf', { base: [58, 47], tip: [26, 40], bend: [42, 38], width: 2.9, at: 0.3, full: 0.9, ramp: R.rock });
  const P = { at: 0.5, full: 0.6, teeth: 11, serr: 0.3, fold: 0.5, rib: true, ramp: R.wind, mat: MAT.petal };
  // 뒤 꽃잎(조금 어둡게) → 앞 꽃잎
  leaf(S, 'petalB', { ...P, base: [56, 29], tip: [24, 0], bend: [40, 6], width: 5.4, bias: -0.06 });
  leaf(S, 'petalB', { ...P, base: [56, 32], tip: [12, 48], bend: [32, 43], width: 5.4, bias: -0.06 });
  leaf(S, 'petalF', { ...P, base: [55, 30], tip: [5, 11], bend: [30, 14], width: 6.2 });
  leaf(S, 'petalF', { ...P, base: [55, 31], tip: [2, 30], bend: [28, 25], width: 5.8 });
  leaf(S, 'petalF', { ...P, base: [58, 29], tip: [71, 9], bend: [68, 19], width: 4.2 });
  // 수술: 바람을 거슬러 오른쪽 위로 휜 가는 선 + 끝 꽃가루
  for (const [c, e] of [[[72, 24], [86, 12]], [[74, 30], [90, 24]], [[70, 18], [78, 4]]]) {
    const pts = bez([59, 30], c, e, 8);
    for (let i = 0; i < pts.length - 1; i++) S.line(pts[i], pts[i + 1], '#6b3e75');
    S.paint([e, [e[0] + 1, e[1]]], '#eaaded');
  }
  // 꽃심(얼굴) + 흩날리는 잔꽃잎
  S.layer('disk', { ramp: R.wind, ...MAT.petal, bias: 0.06 }).add(ellipse(57, 30, 7.5, 6, { hz: 4.5 }));
  for (const [b, t] of [[[13, 44], [5, 41]], [[20, 63], [10, 61]], [[46, 6], [38, 3]], [[8, 55], [2, 52]]])
    leaf(S, 'loose', { ...P, base: b, tip: t, width: 1.7, teeth: 0, rib: false });
  eyes(S, [[53, 28], [59, 28]], { style: 'side' });   // 바람 쪽으로 곁눈질
  return S;
}
