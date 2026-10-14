// 타이드바인(vine_water) — 덩굴 × 물. 물기 도는 굵은 덩굴 몸통에 가는 덩굴이 나선으로 감기고, 머리에서 미역 잎이 물결치며 뻗는다. 잎 밑엔 공기주머니.
import { plant, R, MAT, stem, leaf, wavy, eyes } from '../parts.mjs';
import { bez, ellipse, limb } from '../engine.mjs';

export default function vineWater() {
  const S = plant();
  const K = { at: 0.45, full: 0.6, teeth: 15, serr: 0.18, wave: 0.18, waves: 4, fold: 0.3, rib: true, ramp: R.ice };
  // 뒤쪽 미역 잎 둘(어둡게)
  leaf(S, 'kelpB', { ...K, path: wavy([40, 50], [5, 60], 3, 2, 30, 1), width: 4.6, bias: -0.08 });
  leaf(S, 'kelpB', { ...K, path: wavy([50, 44], [91, 52], 3, 2, 30, 2), width: 4.6, bias: -0.08 });
  // 감기는 덩굴 — 몸통 뒤로 가는 마디
  const axis = y => 46 - (76 - y) * 0.06 + Math.sin((76 - y) / 14) * 4;
  const coil = [], N = 46;
  for (let i = 0; i <= N; i++) { const t = i / N, y = 74 - t * 42, a = t * Math.PI * 5; coil.push([axis(y) + Math.sin(a) * 9, y, Math.cos(a)]); }
  const back = S.layer('coilB', { ramp: R.water, ...MAT.stem, bias: -0.1 }), front = [];
  for (let i = 0; i < N; i++) (coil[i][2] < 0 ? back.add(limb([coil[i], coil[i + 1]], [1.8, 1.8])) : front.push(i));
  // 몸통 + 머리 혹
  stem(S, 'trunk', bez([46, 76], [58, 52], [43, 27], 14), [6.4, 6.2, 6.0, 5.8, 5.6, 5.4, 5.2, 5.0, 4.8, 4.6, 4.5, 4.4, 4.3, 4.2, 4.2], { ramp: R.water, ...MAT.gel, thin: 0 });
  S.layer('trunk').add(ellipse(43, 24, 9.5, 8, { hz: 8 }));
  // 감기는 덩굴 — 몸통 앞 마디
  const fl = S.layer('coilF', { ramp: R.water, ...MAT.stem });
  for (const i of front) fl.add(limb([coil[i], coil[i + 1]], [1.8, 1.8]));
  // 공기주머니 + 앞쪽 미역 잎 둘
  S.layer('float', { ramp: R.water, ...MAT.gel }).add(ellipse(34, 20, 3.4, 3.2, { hz: 3 })).add(ellipse(53, 18, 3.4, 3.2, { hz: 3 }));
  leaf(S, 'kelpF', { ...K, path: wavy([33, 18], [6, 2], 3, 2, 30, 0.5), width: 5 });
  leaf(S, 'kelpF', { ...K, path: wavy([55, 16], [86, 2], 3, 2, 30, 2.5), width: 5 });
  // 잎 끝 물방울
  const dr = S.layer('drop', { ramp: R.water, ...MAT.gel });
  for (const [x, y] of [[8, 9], [89, 9], [92, 59]]) dr.add(ellipse(x, y, 1.5, 2.1, { hz: 1.5 }));
  eyes(S, [[38, 21], [46, 21]]);
  return S;
}
