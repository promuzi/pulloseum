// 쏜위드(thorn) — 덩굴 × 풀. 가시덩굴이 엉켜 웅크린 덤불 짐승. 덩굴 틈 속 점눈, 양쪽으로 휘두르는 채찍 덩굴손.
import { plant, R, MAT, leaf, vine, eyes, spiral } from '../parts.mjs';
import { bez, ellipse } from '../engine.mjs';

export default function thorn() {
  const S = plant();
  const T = { every: 5.5, len: 3.6, r: 1.5 };
  // 뒤 덩굴 두 가닥(어둡게) — 밑동은 화분 흙 안에서 솟는다
  vine(S, 'back1', bez([33, 76], [18, 30], [62, 40], 16), 4.6, 3.0, { bias: -0.08, thorn: T });
  vine(S, 'back2', bez([63, 76], [82, 32], [36, 32], 16), 4.6, 3.0, { bias: -0.08, thorn: T });
  // 덩굴이 뭉친 얼굴 매듭
  S.layer('face', { ramp: R.grass, ...MAT.stem, bias: 0.04 }).add(ellipse(47, 49, 11, 8.5, { hz: 7 }));
  // 가운데 덩굴: 눈 위 눈썹 · 눈 아래 턱
  vine(S, 'brow', bez([20, 54], [46, 28], [76, 50], 18), 4.2, 3.4, { thorn: { ...T, start: 0.15, end: 0.85 } });
  vine(S, 'jaw', bez([29, 72], [48, 56], [68, 71], 18), 4.4, 3.6, { thorn: { ...T, start: 0.15, end: 0.85 } });
  // 잎 몇 장
  leaf(S, 'leaf', { base: [62, 40], tip: [76, 26], bend: [72, 36], width: 4.2, at: 0.4, teeth: 9, serr: 0.18, veins: 3 });
  leaf(S, 'leaf', { base: [30, 40], tip: [16, 30], bend: [20, 38], width: 3.6, at: 0.4, teeth: 8, serr: 0.18, veins: 3 });
  leaf(S, 'leaf', { base: [56, 73], tip: [67, 66], bend: [63, 72], width: 3, at: 0.4, teeth: 7, serr: 0.18 });
  // 앞 덩굴: 왼쪽 위로 치켜든 팔(끝이 말림) + 휘두르는 채찍 둘(끝은 갈고리처럼 말림)
  vine(S, 'arm', [...bez([40, 74], [28, 66], [18, 52], 12), ...spiral(15, 48, 3.5, 1.5, 90, -150, 10).slice(1)], 4.2, 1.4, { thorn: { ...T, end: 0.7 } });
  vine(S, 'whipL', [...bez([36, 38], [22, 10], [8, 16], 16), ...spiral(10, 21, 4.8, 1.6, -115, 150, 12).slice(1)], 3.4, 1.0, { thorn: { ...T, len: 3, end: 0.75 } });
  vine(S, 'whipR', [...bez([68, 56], [94, 48], [84, 26], 16), ...spiral(79, 27, 4.8, 1.8, 0, -250, 12).slice(1)], 3.6, 1.0, { thorn: { ...T, len: 3, end: 0.75 } });
  eyes(S, [[42, 47], [51, 47]]);
  return S;
}
