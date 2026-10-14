// 윈드페탈(flower_wind) — 바람에 기댄 무희 꽃. 컨셉 아트 concept/flower_wind.png 를 따른다(바람은 오른쪽으로 분다):
//   가는 연둣빛 줄기가 휘어 올라 머리를 받치고, 크림빛 얼굴에서 깃털 같은 긴 라벤더 꽃잎이 모두 오른쪽으로 흐르며,
//   금빛 긴 수술도 함께 날린다. 떨어져 나간 꽃잎 몇 장이 오른쪽으로 날아가고, 밑동의 가는 잎도 오른쪽으로 눕는다.
// 움직임: 꽃잎이 끝으로 갈수록 크게 물결치고(위상 차), 수술이 흔들리며, 떨어진 꽃잎이 오른쪽으로 날아간다.
import { plant, MAT, stem, leaf, eyes, swayPt, wavy } from '../parts.mjs';
import { ellipse, bez, oklch } from '../engine.mjs';

const PET = [oklch(0.42, 0.07, 300), oklch(0.58, 0.09, 305), oklch(0.7, 0.08, 312), oklch(0.81, 0.06, 330), oklch(0.9, 0.04, 350)];
const FACE = [oklch(0.5, 0.06, 320), oklch(0.68, 0.06, 330), oklch(0.8, 0.05, 340), oklch(0.88, 0.04, 350), oklch(0.95, 0.025, 10)];
const STEM = [oklch(0.38, 0.04, 170), oklch(0.52, 0.05, 155), oklch(0.66, 0.07, 140), oklch(0.77, 0.08, 130), oklch(0.87, 0.07, 118)];
const GOLD = oklch(0.76, 0.11, 70), GOLD2 = oklch(0.9, 0.09, 85);

export default function flowerWind(f = {}) {
  const S = plant(), t = f.t ?? null;
  const H = [38, 24];
  // 밑동 가는 잎(오른쪽으로 눕는다) + 휘어 오른 줄기
  const LF = { at: 0.3, full: 0.85, fold: 0.55, rib: true, ramp: STEM };
  leaf(S, 'leaf', { ...LF, base: [46, 74], tip: swayPt([78, 62], t, 1, 0.6, 0.2), bend: [62, 74], width: 3 });
  leaf(S, 'leaf', { ...LF, base: [48, 72], tip: swayPt([72, 50], t, 1, 0.6, 0.5), bend: [56, 60], width: 2.8 });
  leaf(S, 'leaf', { ...LF, base: [45, 74], tip: swayPt([28, 64], t, 0.6, 0.4, 0.8), bend: [34, 72], width: 2.6, bias: -0.05 });
  const st = bez([47, 76], [30, 52], H, 12);
  stem(S, 'stem', st, st.map((_, i) => 2.5 - i * 0.05), { ramp: STEM });
  // 꽃잎: 머리에서 오른쪽으로 흐르는 넓고 부드러운 꽃잎(뒤 → 앞). 물결이 밑에서 끝으로 흘러간다(위상이 시간에 따라 돈다).
  const P = { at: 0.34, full: 0.62, teeth: 0, fold: 0.45, rib: true, ramp: PET, mat: MAT.petal };
  const ph0 = t === null ? 0 : 2 * Math.PI * t;
  const pet = (name, tip, amp, w, ph, o = {}) => leaf(S, name, { ...P, path: wavy([H[0] + 3, H[1]], tip, amp, 0.9, 24, ph0 * 1 + ph), width: w, ...o });
  pet('petB', [72, 1], 5.5, 6.2, 0.4, { bias: -0.07 });
  pet('petB', [90, 33], 5.5, 6, 2.1, { bias: -0.07 });
  pet('petB', [26, 8], 3, 5, 3.0, { bias: -0.07 });                 // 머리 위를 감싸고 넘어가는 앞머리 꽃잎
  pet('petF', [89, 11], 6, 7, 1.0);
  pet('petF', [95, 23], 5.8, 6.6, 1.6);
  pet('petF', [78, 44], 5, 5.6, 2.6);
  pet('petF', [55, 3], 4, 5, 0);
  pet('petF', [70, 52], 4, 4.6, 3.4);                              // 아래로 처져 흐르는 꽃잎
  // 금빛 긴 수술(오른쪽으로 날림) + 끝 꽃가루
  [[86, 4, 0.1], [93, 14, 0.4], [90, 36, 0.7]].forEach(([x, y, ph]) => {
    const e = swayPt([x, y], t, 1.4, 2, ph), pts = bez([H[0] + 2, H[1] - 1], [(H[0] + e[0]) / 2, (H[1] + e[1]) / 2 - 6], e, 12);
    for (let i = 0; i < pts.length - 1; i++) S.line(pts[i], pts[i + 1], GOLD);
    S.paint([e, [e[0] + 1, e[1]]], GOLD2);
  });
  // 크림빛 얼굴 + 곁눈질(바람 반대쪽을 본다)
  S.layer('face', { ramp: FACE, amb: 0.42, dif: 0.55, th: [0.36, 0.56, 0.8], dither: 0.04 }).add(ellipse(H[0], H[1] + 1, 8, 7, { hz: 4.5 }));
  eyes(S, [[32, 23], [40, 23]], { style: 'side', k: oklch(0.35, 0.06, 300) });
  // 떨어져 날아가는 꽃잎 셋(오른쪽으로 흘러간다)
  for (let k = 0; k < 3; k++) {
    const p = t === null ? 0.2 + k * 0.3 : (t + k / 3) % 1, x = 62 + p * 34, y = 50 + k * 8 - p * 14 + Math.sin(2 * Math.PI * (p * 1.5 + k)) * 2;
    if (x < 95) leaf(S, 'loose', { ...P, teeth: 0, rib: false, base: [x - 3, y + 1], tip: [x + 3, y - 1], width: 1.7 });
  }
  return S;
}
