// 스포어캡(spore_cap) — 버섯 × 풀(태생 포자 변이, 희귀). 넓게 처진 올리브 갓에 노란 반점, 갓 그늘 속에서 빛나는 눈, 갓 밑에서 포자 안개가 쉬지 않고 피어오른다.
import { plant, R, MAT, stem, spots, haze, eyes } from '../parts.mjs';
import { ellipse, box } from '../engine.mjs';

const SPORE = ['#676633', '#a2a947', '#cddf6c', '#d5e04b', '#fbff86'];

export default function sporeCap() {
  const S = plant();
  // 포자 구름(뒤)
  haze(S, 'puffB', [[13, 46, 7, 5], [84, 47, 7.5, 5.2], [9, 56, 5, 3.6], [88, 57, 5, 3.6]], { ramp: SPORE, bias: -0.1 });
  // 대 + 밑 주머니 + 턱받이
  stem(S, 'stem', [[48, 75], [47, 64], [48, 52], [48, 40]], [8.6, 7.8, 7.4, 7.2], { ramp: R.warm });
  S.layer('stem').add(ellipse(48, 72.5, 12, 4.6, { hz: 4 }));
  S.layer('skirt', { ramp: R.warm, ...MAT.petal, lip: 3 }).add(ellipse(48, 52, 11.5, 3, { hz: 2.5 })).add(ellipse(48, 54.5, 10, 2.4, { hz: 2 }));
  // 주름(갓 밑면)
  const gill = S.layer('gill', { ramp: R.dusk, ...MAT.cap }).add(ellipse(48, 38.5, 27, 5.5, { hz: 3 }));
  S.patterns.push((x, y, ln, tv) => ln === 'gill' && (x + Math.round((y - 38) * (x - 48) / 30)) % 3 === 0 ? Math.max(1, tv - 1) : tv);
  // 갓: 위는 둥글고 밑은 평평, 가장자리가 처진다
  S.layer('cap', { ramp: R.olive, ...MAT.cap }).add(ellipse(48, 31, 33, 20, { hz: 16 })).add(ellipse(19, 35, 6, 4, { hz: 3 })).add(ellipse(77, 35, 6, 4, { hz: 3 }))
    .cut(box(0, 37.5, 96, 60));
  spots(S, 'cap', [[33, 21, 3.2], [50, 15, 3.8], [64, 24, 3.2], [42, 29, 2], [74, 31, 2.3], [24, 29, 2.2], [57, 32, 1.6]], 4);
  // 포자 구름(앞) + 흩날리는 포자 알갱이
  haze(S, 'puffF', [[21, 45, 5.5, 4], [75, 46, 6, 4.2], [20, 60, 4.2, 3], [77, 61, 4.4, 3]], { ramp: SPORE });
  S.paint([[6, 40], [26, 54], [70, 56], [92, 42], [30, 64], [66, 64], [4, 62], [90, 64]], '#d5e04b');
  S.paint([[10, 50], [86, 52], [26, 68], [70, 68]], '#fbff86');
  eyes(S, [[42, 44]], { style: 'dot', k: '#d5e04b', w: '#fbff86' });                     // 갓 그늘 속 짝짝이 눈 — 홀리는 교란자
  eyes(S, [[50, 45]], { style: 'sleepy', k: '#d5e04b', w: '#fbff86', l: '#694f62' });
  return S;
}
