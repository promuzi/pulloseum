// 아쿠아벌브(aqua) — 화초 × 물. 속에서 빛이 번지는 물방울 구근 + 위에 핀 수련, 밑에 연잎 두 장. 치유형이라 둥글고 차분하게.
import { plant, R, MAT, leaf, petal, glow, spots, eyes } from '../parts.mjs';
import { ellipse, poly } from '../engine.mjs';

export default function aqua() {
  const S = plant();
  // 연잎(평평, 홈 하나씩)
  S.layer('padL', { ramp: R.ice, ...MAT.leaf }).add(ellipse(32, 74.5, 9, 3.2, { hz: 1.4 })).cut(poly([[32, 74.5], [22, 72], [22, 76]]));
  S.layer('padR', { ramp: R.ice, ...MAT.leaf }).add(ellipse(64, 75, 8.5, 3, { hz: 1.3 })).cut(poly([[64, 75], [74, 72.5], [74, 76.5]]));
  // 구근(투명한 물 덩이) + 목
  S.layer('bulb', { ramp: R.water, ...MAT.gel })
    .add(ellipse(48, 57, 21, 19, { hz: 19 })).add(ellipse(48, 39, 7.5, 6, { hz: 7 }));
  glow(S, 'bulb', 48, 61, 13, 10, 1);
  spots(S, 'bulb', [[37, 64, 1.6], [57, 51, 1.3], [53, 69, 1.1], [42, 70, 0.9]], 4);
  // 수련: 뒤 꽃잎 넷 → 앞 꽃잎 셋 → 빛나는 꽃심
  for (const [tx, ty, bx, by] of [[22, 20, 34, 24], [38, 10, 42, 20], [60, 9, 54, 19], [76, 19, 64, 23]])
    leaf(S, 'petalB', { base: [48, 34], tip: [tx, ty], bend: [bx, by], width: 5, at: 0.5, full: 0.65, fold: 0.3, rib: false, ramp: R.lily, mat: MAT.petal, bias: -0.06 });
  for (const [tx, ty, bx, by] of [[16, 31, 30, 34], [80, 30, 66, 33], [48, 15, 46, 24]])
    leaf(S, 'petalF', { base: [48, 36], tip: [tx, ty], bend: [bx, by], width: 5.4, at: 0.5, full: 0.65, fold: 0.25, rib: false, ramp: R.lily, mat: MAT.petal });
  S.layer('core', { ramp: R.gold, outlineIn: false, outlineOut: false, emissive: (x, y) => ((x - 47.5) ** 2 / 25 + (y - 32.5) ** 2 / 9 < 0.4 ? 4 : 3) })
    .add(ellipse(48, 33, 5.5, 3.6, { hz: 3 }));
  // 물방울: 꽃잎 끝에서 떨어지는 한 방울 + 반짝임
  S.layer('drop', { ramp: R.water, ...MAT.gel }).add(ellipse(17, 39, 1.6, 2.3, { hz: 1.6 }));
  S.paint([[27, 26], [66, 16], [70, 26], [35, 33]], '#ffffff');
  eyes(S, [[41, 54], [52, 54]]);
  return S;
}
