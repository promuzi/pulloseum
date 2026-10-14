// 게일캑터(cactus_wind) — 다육 × 바람. 키가 다른 피리 기둥 셋. 몸통에 뚫린 구멍으로 바람이 지나가며 울고, 가시는 전부 바람 부는 쪽(왼쪽)으로 누웠다.
import { plant, R, MAT, cactus, arc, wavy, eyes } from '../parts.mjs';
import { ellipse } from '../engine.mjs';

export default function cactusWind() {
  const S = plant();
  const SP = { every: 8, len: 4.5, color: '#ffffff', lean: -2.4 };
  const pipe = (name, pts, radii, holes, ribs) => {
    const wall = S.layer(name + 'W', { ramp: R.dusk, ...MAT.cactus, bias: -0.15 });
    for (const [x, y, rx, ry] of holes) wall.add(ellipse(x, y + 2, rx, ry, { hz: 2 }));
    return cactus(S, name, pts, radii, { ribs, amp: 0.3, ramp: R.wind, cut: holes.map(([x, y, rx, ry]) => ellipse(x, y, rx, ry)), spine: SP });
  };
  pipe('pipeL', [[33, 76], [29, 56], [27, 38]], [7.2, 7.0, 6.6], [[28.5, 54, 2.6, 3.4]], 3);
  pipe('pipeR', [[63, 76], [67, 54], [69, 28]], [7.6, 7.4, 7.1], [[67.5, 46, 2.8, 3.6]], 3);
  pipe('main', [[48, 76], [47, 52], [48, 24], [48, 13]], [12.5, 12, 11, 9], [[46, 57, 3.6, 4.6]], 5);
  // 바람 소리: 구멍에서 왼쪽으로 새는 줄 + 휘감는 바람
  for (const [a, b] of [[[42, 56], [24, 50]], [[25, 53], [12, 48]]]) {
    const pts = wavy(a, b, 1.2, 1.5, 10);
    for (let i = 0; i < pts.length - 1; i++) S.line(pts[i], pts[i + 1], '#eaaded');
  }
  arc(S, 82, 30, 8, 200, 330, '#eaaded');
  arc(S, 86, 56, 5, 210, 340, '#a884f3');
  arc(S, 14, 30, 6, 190, 320, '#a884f3');
  eyes(S, [[42, 27], [52, 27]], { style: 'ring', k: '#45293f' });   // 동그랗게 뜬 눈 — 휘파람 부는 얼굴
  return S;
}
