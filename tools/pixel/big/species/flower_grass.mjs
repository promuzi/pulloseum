// 페탈로즈(flower_grass) — 꽃잎 투구를 쓴 장미 기사. 형태·단서는 tools/pixel/sprites-data.js 의 48×56 판과 같다:
//   머리(봉오리)가 몸보다 크다 · 오른쪽 잎 칼날이 윤곽 밖으로 솟는다 · 투구 틈 = 얼굴(점눈 둘) · 왼쪽 잎은 방패처럼 내림 · 줄기에 가시
import { plant, R, MAT, stem, leaf, thorns, petal, hole, eyes } from '../parts.mjs';
import { ellipse } from '../engine.mjs';

export default function flowerGrass() {
  const S = plant();
  const slit = ellipse(45, 28.5, 15, 3.1);   // 투구 눈구멍 — 앞 꽃잎들을 이 모양으로 도려낸다

  // 머리 뒤로 보이는 꽃받침 두 장
  leaf(S, 'sepalB', { base: [42, 41], tip: [21, 47], bend: [30, 39], width: 3.2, at: 0.3, rib: false });
  leaf(S, 'sepalB', { base: [48, 41], tip: [70, 46], bend: [61, 38], width: 3.2, at: 0.3, rib: false });

  // 줄기 + 밑동, 가시
  stem(S, 'stem', [[48, 76], [49, 69], [47.5, 61], [46, 53], [45, 45]], [4.4, 3.9, 3.6, 3.3, 3.1]);
  S.layer('stem').add(ellipse(48, 75, 7, 2.5, { hz: 2 }));
  thorns(S, 'thorn', [[51.5, 69.5, 59, 67, 2.6], [45.5, 53, 38.5, 50, 2.4]]);

  // 머리 = 닫힌 장미 봉오리 투구(뒤 덩이 → 눈구멍 속 → 뾰족한 속봉오리 → 감싼 속꽃잎 둘 → 양옆 겉꽃잎 → 턱 꽃잎)
  petal(S, 'head', 45, 25, 20, 21, { hz: 16, bias: -0.12, vgrad: 0.2 });
  hole(S, 'slit', 45, 28.5, 16, 4.6);
  leaf(S, 'tip', { base: [46, 20], tip: [48, 1], bend: [43.5, 9], width: 6.5, at: 0.4, full: 0.7, fold: 0.2, rib: false, ramp: R.rose, mat: MAT.petal });
  petal(S, 'wrapR', 53, 15, 9, 11, { rot: 0.45, hz: 8 });
  petal(S, 'wrapL', 39, 14, 8, 10, { rot: -0.5, hz: 7 });
  petal(S, 'petalR', 56, 26, 12, 16.5, { rot: 0.3, hz: 14, vgrad: 0.22, cut: slit });
  petal(S, 'petalL', 34, 24, 13.5, 18, { rot: -0.28, hz: 14, vgrad: 0.18, cut: slit });
  petal(S, 'chin', 45, 38, 16, 8.5, { hz: 10, vgrad: 0.2, cut: slit });

  // 꽃턱 + 앞 꽃받침(투구 아래 목가리개)
  S.layer('hip', { ramp: R.grass, amb: 0.24, dif: 0.8, th: [0.4, 0.6, 0.84], dither: 0.05, smooth: 2 }).add(ellipse(45, 45, 6.5, 4, { hz: 4 }));
  leaf(S, 'sepalF', { base: [41, 44], tip: [28, 51], bend: [31, 43], width: 3.4, at: 0.3, rib: false });
  leaf(S, 'sepalF', { base: [49, 44], tip: [62, 51], bend: [59, 43], width: 3.4, at: 0.3, rib: false });

  // 오른쪽 = 치켜든 칼 잎(밑의 턱잎 두 장이 칼코등이)
  leaf(S, 'sword', { base: [58, 55], tip: [89, 5], bend: [77, 34], width: 7, at: 0.3, full: 0.85, teeth: 13, serr: 0.16, fold: 0.8, veins: 8 });
  leaf(S, 'sword', { base: [58.5, 55], tip: [64, 58.5], width: 1.8, at: 0.4, rib: false });
  leaf(S, 'sword', { base: [58.5, 55], tip: [53.5, 51.5], width: 1.8, at: 0.4, rib: false });
  stem(S, 'sword', [[47, 60], [53, 57.5], [58.5, 55]], [2.0, 1.8, 1.6]);

  // 왼쪽 = 내려 든 방패 잎
  leaf(S, 'shield', { base: [46, 61], tip: [12, 58], bend: [27, 67], width: 9.5, at: 0.45, full: 0.7, baseW: 1.6, teeth: 12, serr: 0.1, fold: 0.6, veins: 5 });

  // 눈
  eyes(S, [[38, 27], [50, 27]]);
  return S;
}
