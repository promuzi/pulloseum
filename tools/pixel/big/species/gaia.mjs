// 가이아록(gaia) — 다육 × 대지. 움직이지 않는 요새. 선인장 몸에 각진 바위 갑주를 두르고, 어깨엔 청록 결정이 솟고, 바위 위엔 이끼. 거대한 돌주먹이 땅을 짚는다.
import { plant, R, MAT, cactusBall, crystal, eyes } from '../parts.mjs';
import { ellipse, limb, plane } from '../engine.mjs';

export default function gaia() {
  const S = plant();
  const rock = (name, faces, o = {}) => { const l = S.layer(name, { ramp: R.warm, ...MAT.rock, smooth: 0.3, ...o }); faces.forEach(f => l.add(f)); return l; };
  // 선인장 몸
  cactusBall(S, 'core', 48, 50, 19.5, 28, { ribs: 6, amp: 0.3, ramp: R.grass, bias: -0.06, spine: { every: 8, len: 3, color: '#b2ba90' } });
  // 바위 갑주: 어깨 둘(윗면·앞면), 배판, 이마판
  rock('shL', [plane([[12, 40], [24, 27], [40, 29], [35, 40]], { h0: 6, g: [0, 0.5], ref: [26, 40] }), plane([[12, 40], [35, 40], [37, 51], [16, 53]], { h0: 6, g: [0.1, 0], ref: [26, 40] })]);
  rock('shR', [plane([[56, 28], [72, 25], [86, 36], [62, 39]], { h0: 6, g: [0, 0.5], ref: [70, 38] }), plane([[62, 39], [86, 36], [83, 50], [64, 51]], { h0: 6, g: [-0.25, 0], ref: [70, 38] })]);
  rock('belly', [plane([[33, 55], [62, 53], [67, 69], [58, 76], [38, 76], [30, 68]], { h0: 6, g: [0, 0.05], ref: [48, 60] })], { bias: -0.04 });
  rock('brow', [plane([[31, 27], [63, 24], [60, 32], [35, 33]], { h0: 6, g: [0, 0.6], ref: [47, 32] })]);
  // 팔 + 돌주먹: 어깨에서 내려와 화분 흙 위를 짚는다(몸 앞)
  S.layer('arms', { ramp: R.warm, ...MAT.rock, bias: -0.04 }).add(limb([[21, 46], [23, 56], [30, 64]], [5.6, 5.8, 5.4])).add(limb([[75, 44], [73, 55], [66, 63]], [5.6, 5.8, 5.4]));
  rock('fistL', [plane([[25, 77], [24, 67], [29, 61], [39, 62], [42, 71], [39, 77]], { h0: 6, g: [0.12, 0.06], ref: [33, 69] })]);
  rock('fistR', [plane([[57, 77], [54, 71], [57, 62], [67, 61], [72, 67], [71, 77]], { h0: 6, g: [-0.1, 0.06], ref: [63, 69] })]);
  // 결정
  crystal(S, 'xtal', [70, 28], -72, 17, 3.3);
  crystal(S, 'xtal', [77, 31], -35, 12, 2.7);
  crystal(S, 'xtal', [63, 27], -104, 10, 2.4);
  crystal(S, 'xtal2', [21, 53], -158, 9, 2.2);
  // 이끼
  const moss = S.layer('moss', { ramp: R.grass, ...MAT.leaf, spec: null });
  for (const [x, y, rx] of [[25, 29.5, 6], [36, 29, 4], [48, 25, 4.5], [76, 27.5, 4], [33, 62.5, 3.5], [62, 62, 4]]) moss.add(ellipse(x, y, rx, 1.8, { hz: 1.2 }));
  eyes(S, [[41, 36], [52, 36]]);
  return S;
}
