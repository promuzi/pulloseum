// 엠버캑터(cactus_fire) — 불타는 통 선인장. 컨셉 아트 concept/cactus_fire.png 를 따른다:
//   짙은 진홍 통 몸, 골마다 빛나는 주황 균열, 별 모양 크림빛 가시 뭉치, 정수리의 큰 불꽃 왕관,
//   짧은 두 팔(왼쪽은 낮게, 오른쪽은 높게) 끝에도 불, 달아오른 매서운 눈.
// 움직임: 불꽃이 일렁이고(모양만), 균열이 숨 쉬듯 밝아졌다 어두워지며, 불티가 오른다.
import { plant, cactus, cactusBall, flame, FIRE, eyes } from '../parts.mjs';
import { oklch } from '../engine.mjs';

const BODY = [oklch(0.28, 0.07, 22), oklch(0.37, 0.1, 22), oklch(0.47, 0.13, 26), oklch(0.56, 0.16, 30), oklch(0.66, 0.16, 36)];
const SPINE = oklch(0.92, 0.06, 90), SPINE2 = oklch(0.8, 0.07, 80);

export default function cactusFire(f = {}) {
  const S = plant(), t = f.t ?? null;
  const C = [48, 55], RX = 22.5, RY = 21.5;
  // 팔(몸 뒤): 왼쪽은 낮게, 오른쪽은 높게
  cactus(S, 'armL', [[31, 62], [21, 56], [18, 46]], [6.4, 6.2, 5.8], { ribs: 3, amp: 0.3, ramp: BODY });
  cactus(S, 'armR', [[65, 54], [75, 47], [77, 35]], [6.4, 6.2, 5.8], { ribs: 3, amp: 0.3, ramp: BODY });
  const body = cactusBall(S, 'body', C[0], C[1], RX, RY, { ribs: 6, amp: 0.34, ramp: BODY });
  // 골을 따라 빛나는 균열(위아래로 휜 선), 숨 쉬듯 밝기가 바뀐다
  const pulse = t === null ? 1 : 0.5 + 0.5 * Math.sin(2 * Math.PI * t);
  for (let k = -2; k <= 2; k++) {
    const th = (k + 0.5) * Math.PI / 6 - Math.PI / 12, bright = (k + 2) % 2 ? pulse > 0.5 : pulse <= 0.5;
    for (let y = C[1] - RY * 0.8; y < Math.min(C[1] + RY * 0.82, 77); y += 0.5) {
      const v = (y - C[1]) / RY, x = C[0] + RX * Math.sqrt(Math.max(0, 1 - v * v)) * Math.sin(th);
      S.paint([[x, y]], bright ? FIRE[3] : FIRE[2], body.z);
    }
  }
  // 별 모양 가시 뭉치(등성이 위)
  const star = (x, y) => { S.paint([[x, y]], SPINE, body.z); S.paint([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], SPINE2, body.z); };
  [[34, 44], [44, 38], [56, 39], [63, 47], [30, 58], [41, 52], [55, 52], [66, 60], [36, 69], [48, 66], [60, 70], [48, 40]].forEach(([x, y]) => star(x, y));
  [[22, 50], [19, 57], [74, 41], [77, 49]].forEach(([x, y]) => star(x, y));
  // 불꽃 왕관 + 팔 끝 불
  flame(S, 'fire', { base: [42, 36], tip: [33, 13], bend: [35, 26], width: 5.5, t, ph: 0.1 });
  flame(S, 'fire', { base: [48, 35], tip: [49, 6], bend: [46, 20], width: 7, t, ph: 0.45 });
  flame(S, 'fire', { base: [54, 36], tip: [64, 12], bend: [62, 25], width: 5.5, t, ph: 0.75 });
  flame(S, 'fire', { base: [18, 42], tip: [14, 26], width: 4, t, ph: 0.3 });
  flame(S, 'fire', { base: [77, 31], tip: [81, 15], width: 4.4, t, ph: 0.6 });
  if (t !== null) for (let k = 0; k < 4; k++) { const p = (t + k / 4) % 1, x = 30 + k * 12 + Math.sin(2 * Math.PI * (p + k * 0.3)) * 2, y = 14 - p * 14; if (y > 0) S.paint([[x, y]], p < 0.5 ? FIRE[3] : FIRE[2]); }
  eyes(S, [[39, 48], [53, 48]], { style: 'blaze', g: oklch(0.74, 0.18, 52), c: oklch(0.94, 0.12, 95) });
  return S;
}
