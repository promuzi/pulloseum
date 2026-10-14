// 아쿠아벌브(aqua) — 물방울 구근의 치유사. 컨셉 아트 concept/aqua.png 를 따른다:
//   반짝이는 하늘빛 물 덩이 몸(속에 기포), 감은 눈의 평온한 얼굴, 위에 핀 흰 연꽃(노란 꽃술),
//   연꽃 밑에서 몸을 따라 늘어진 청록 잎과 잎끝 물방울, 흙 위의 작은 연잎들.
// 움직임: 잎끝 물방울이 맺혔다 떨어지고, 연꽃잎이 살랑이며, 몸의 반짝임이 흐른다.
import { plant, MAT, leaf, glow, spots, eyes, swayPt } from '../parts.mjs';
import { ellipse, poly, oklch } from '../engine.mjs';

const BULB = [oklch(0.42, 0.07, 225), oklch(0.6, 0.09, 215), oklch(0.75, 0.09, 205), oklch(0.86, 0.07, 198), oklch(0.96, 0.03, 190)];
const PETAL = [oklch(0.55, 0.05, 330), oklch(0.75, 0.05, 345), oklch(0.88, 0.04, 20), oklch(0.94, 0.035, 60), oklch(0.98, 0.02, 90)];
const GOLD = [oklch(0.6, 0.12, 70), oklch(0.75, 0.13, 80), oklch(0.85, 0.13, 88), oklch(0.92, 0.11, 95), oklch(0.97, 0.06, 100)];
const LEAF = [oklch(0.35, 0.05, 190), oklch(0.48, 0.07, 170), oklch(0.62, 0.08, 150), oklch(0.74, 0.09, 130), oklch(0.85, 0.09, 115)];
const PAD = [oklch(0.34, 0.05, 165), oklch(0.47, 0.08, 150), oklch(0.6, 0.1, 138), oklch(0.72, 0.11, 128), oklch(0.84, 0.1, 115)];

export default function aqua(f = {}) {
  const S = plant(), t = f.t ?? null;
  // 흙 위 작은 연잎(홈 하나씩)
  for (const [x, y, r, a] of [[33, 74, 5, -1], [62, 75, 4.5, 1], [44, 76, 3.5, -1]])
    S.layer('pad', { ramp: PAD, ...MAT.leaf }).add(ellipse(x, y, r, r * 0.42, { hz: 1.2 })).cut(poly([[x, y], [x + a * r * 1.2, y - 2], [x + a * r * 1.2, y + 2]]));
  // 물 덩이 몸(반투명 광택 + 안쪽 빛 + 기포)
  const B = S.layer('bulb', { ramp: BULB, ...MAT.gel, spec: [30, 0.86] }).add(ellipse(48, 54, 19, 17, { hz: 17 }));
  glow(S, 'bulb', 48, 58, 12, 9, 1);
  const sh = t === null ? 0 : Math.round(Math.sin(2 * Math.PI * t) * 1.5);
  spots(S, 'bulb', [[37 + sh, 60, 1.6], [57, 49, 1.3], [54 - sh, 64, 1.1], [42, 66, 0.9], [36, 46, 2.2]], 4);
  // 연꽃 밑에서 늘어진 잎(몸 뒤·앞) + 잎끝 물방울
  const LF = { at: 0.4, full: 0.7, fold: 0.55, rib: true, ramp: LEAF };
  const tips = [[25, 47], [71, 46], [31, 57], [66, 58]].map((p, k) => swayPt(p, t, 0.6, 0.6, k * 0.25));
  leaf(S, 'leafB', { ...LF, base: [44, 37], tip: tips[0], bend: [30, 34], width: 4.4, bias: -0.06 });
  leaf(S, 'leafB', { ...LF, base: [52, 37], tip: tips[1], bend: [66, 34], width: 4.4, bias: -0.06 });
  leaf(S, 'leafF', { ...LF, base: [42, 40], tip: tips[2], bend: [30, 42], width: 4 });
  leaf(S, 'leafF', { ...LF, base: [54, 40], tip: tips[3], bend: [67, 42], width: 4 });
  // 잎끝 물방울: 맺혔다가 떨어진다(두 잎만)
  const drop = S.layer('drop', { ramp: BULB, ...MAT.gel });
  [tips[0], tips[1]].forEach(([x, y], k) => {
    const p = t === null ? 0.1 : ((t + k * 0.5) % 1), fall = p < 0.55 ? 0 : (p - 0.55) * 30;
    drop.add(ellipse(x, y + 2 + fall, 1.3 + (p < 0.55 ? p : 0.55), 1.7 + (p < 0.55 ? p : 0.55), { hz: 1.4 }));
  });
  // 연꽃: 뒤 꽃잎 → 앞 꽃잎 → 노란 꽃술
  const PT = { at: 0.5, full: 0.6, fold: 0.35, rib: false, ramp: PETAL, mat: MAT.petal };
  for (const [a, l, w, ph] of [[-150, 15, 4.6, 0.1], [-118, 18, 4.8, 0.3], [-90, 19, 5, 0.5], [-62, 18, 4.8, 0.7], [-30, 15, 4.6, 0.9]]) {
    const r = a * Math.PI / 180;
    leaf(S, 'lotusB', { ...PT, base: [48, 31], tip: swayPt([48 + Math.cos(r) * l, 31 + Math.sin(r) * l], t, 0.5, 0.4, ph), width: w, bias: -0.04 });
  }
  for (const [a, l, w] of [[-170, 16, 5.2], [-132, 14, 5.4], [-48, 14, 5.4], [-10, 16, 5.2], [-90, 11, 5.6]]) {
    const r = a * Math.PI / 180;
    leaf(S, 'lotusF', { ...PT, base: [48, 33], tip: [48 + Math.cos(r) * l, 33 + Math.sin(r) * l], width: w });
  }
  S.layer('core', { ramp: GOLD, outlineIn: false, outlineOut: false, emissive: (x, y) => ((x + 0.5 - 48) ** 2 / 16 + (y + 0.5 - 30) ** 2 / 4 < 0.45 ? 4 : 3) }).add(ellipse(48, 30, 4.4, 2.4, { hz: 2 }));
  eyes(S, [[40, 55], [53, 55]], { style: 'calm', k: oklch(0.36, 0.07, 235) });
  return S;
}
