// 게일바인(vine_wind) — 덩굴 × 바람. 은빛 덩굴 몸이 S자로 솟아 화살촉 머리로 오른쪽 위를 겨눈 자객. 목에서 보랏빛 리본 잎이 바람에 길게 나부낀다.
import { plant, R, MAT, vine, leaf, wavy, spiral, eyes } from '../parts.mjs';
import { bez } from '../engine.mjs';

export default function vineWind() {
  const S = plant();
  const RB = { at: 0.3, full: 0.85, fold: 0.4, rib: false, ramp: R.wind };
  // 뒤로 나부끼는 리본 잎(뒤)
  leaf(S, 'ribbonB', { ...RB, path: wavy([50, 44], [3, 38], 3, 1.5, 30, 0.6), width: 2.7, bias: -0.06 });
  leaf(S, 'ribbonB', { ...RB, path: wavy([52, 60], [8, 58], 2.5, 1.5, 30, 1.8), width: 2.4, bias: -0.06 });
  // 몸: S자 덩굴 + 밑동 덩굴손
  vine(S, 'body', [...bez([36, 76], [78, 66], [46, 50], 14), ...bez([46, 50], [20, 35], [58, 26], 14).slice(1)], 4.4, 2.8, { ramp: R.light });
  vine(S, 'curl', [...bez([38, 72], [26, 74], [22, 64], 6), ...spiral(27, 62, 5, 1.5, 200, -60, 12).slice(1)], 1.8, 0.8, { ramp: R.light });
  // 몸에 돋은 작은 잎
  for (const [b, t] of [[[61, 63], [72, 57]], [[36, 37], [27, 29]], [[47, 50], [38, 57]]])
    leaf(S, 'bud', { base: b, tip: t, width: 2.6, at: 0.4, fold: 0.6, rib: true, ramp: R.wind });
  // 화살촉 머리 + 뒤로 뻗은 미늘 둘
  leaf(S, 'head', { base: [58, 26], tip: [90, 6], bend: [74, 14], width: 7.5, at: 0.22, full: 0.55, fold: 0.75, rib: true, ramp: R.light, mat: MAT.metal });
  leaf(S, 'head', { base: [60, 24], tip: [55, 13], width: 2.4, at: 0.35, rib: false, ramp: R.light, mat: MAT.metal });
  leaf(S, 'head', { base: [62, 29], tip: [63, 39], width: 2.4, at: 0.35, rib: false, ramp: R.light, mat: MAT.metal });
  // 목에서 나부끼는 리본 잎(앞)
  leaf(S, 'ribbonF', { ...RB, path: wavy([56, 27], [4, 16], 3.2, 1.6, 30, 0.2), width: 3.2 });
  eyes(S, [[63, 19], [69, 16]]);
  return S;
}
