// 엠버캑터(cactus_fire) — 다육 × 불. 그을린 통 선인장 벽. 골 사이로 붉은 균열이 빛나고, 정수리와 팔 끝에서 불이 일렁이며, 가시 끝은 달아 있다.
import { plant, R, cactus, cactusBall, flame, zigzag, eyes } from '../parts.mjs';

export default function cactusFire() {
  const S = plant();
  const SP = { every: 6.5, len: 5, color: '#c7dcd0', dark: '#2e222f' };
  // 팔(몸통 뒤): 왼쪽은 낮게, 오른쪽은 높이 치켜듦
  cactus(S, 'armL', [[32, 62], [22, 57], [19, 46]], [6.5, 6.2, 5.6], { ribs: 3, ramp: R.char, spine: { ...SP, len: 4 } });
  cactus(S, 'armR', [[64, 54], [75, 47], [77, 33]], [6.5, 6.2, 5.6], { ribs: 3, ramp: R.char, spine: { ...SP, len: 4 } });
  // 몸통
  const body = cactusBall(S, 'body', 48, 55, 23.5, 23.5, { ribs: 6, amp: 0.34, ramp: R.char, spine: SP });
  // 빛나는 균열(골을 따라)
  zigzag(S, [39, 37], [35, 70], 6, 1.1, '#f79617', body.z);
  zigzag(S, [58, 36], [61, 68], 6, 1.1, '#f79617', body.z);
  zigzag(S, [48, 58], [47, 74], 3, 1, '#f9c22b', body.z);
  // 눈
  eyes(S, [[41, 44], [51, 44]]);
  // 불: 정수리 셋 + 팔 끝
  flame(S, 'fire', { base: [44, 34], tip: [36, 12], bend: [36, 24], width: 4.6 });
  flame(S, 'fire', { base: [52, 33], tip: [59, 7], bend: [61, 21], width: 5.2 });
  flame(S, 'fire', { base: [48, 33], tip: [47, 18], width: 3.4 });
  flame(S, 'fire', { base: [19, 41], tip: [16, 30], width: 2.8 });
  flame(S, 'fire', { base: [77, 28], tip: [81, 16], width: 3.2 });
  // 달아오른 가시 끝·날리는 불티
  S.paint([[25, 34], [86, 30], [12, 52], [30, 24], [70, 20], [90, 44]], '#f9c22b');
  return S;
}
