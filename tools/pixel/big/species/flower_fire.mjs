// 블레이즈블룸(flower_fire) — 화초 × 불. 활짝 터진 붉은 백합. 뒤로 젖힌 꽃잎 끝이 불꽃으로 타오르고, 그을린 꽃심에 잉걸 균열과 눈, 수술 끝에 불씨.
import { plant, R, MAT, stem, leaf, flame, zigzag, eyes } from '../parts.mjs';
import { bez, ellipse } from '../engine.mjs';

export default function flowerFire() {
  const S = plant();
  leaf(S, 'leaf', { base: [46, 74], tip: [12, 50], bend: [30, 62], width: 4, at: 0.3, full: 0.9, ramp: R.olive });
  leaf(S, 'leaf', { base: [50, 74], tip: [85, 54], bend: [68, 62], width: 4, at: 0.3, full: 0.9, ramp: R.olive });
  stem(S, 'stem', bez([48, 76], [52, 60], [47, 42], 8), [3.2, 3.1, 3.0, 2.9, 2.8, 2.7, 2.7, 2.6, 2.6], { ramp: R.olive });
  // 꽃잎 여섯(뒤 셋 → 앞 셋): 가운데에서 뻗었다가 끝이 뒤로 젖혀진다. 끝마다 불꽃.
  const C = [47, 33], fire = [];
  const pet = (name, ang, len, w, o = {}) => {
    const a = ang * Math.PI / 180, d = [Math.cos(a), Math.sin(a)], p = [-d[1], d[0]];
    const tip = [C[0] + d[0] * len, C[1] + d[1] * len], bend = [C[0] + d[0] * len * 0.55 + p[0] * 5, C[1] + d[1] * len * 0.55 + p[1] * 5];
    leaf(S, name, { base: C, tip, bend, width: w, at: 0.42, full: 0.7, fold: 0.4, ramp: R.red, mat: MAT.petal, ...o });
    fire.push([[tip[0] - d[0] * 4, tip[1] - d[1] * 4], [tip[0] + d[0] * 9 + 0, tip[1] + d[1] * 6 - 9]]);
  };
  pet('petalB', -118, 30, 6.4, { bias: -0.08 }); pet('petalB', -10, 32, 6.2, { bias: -0.08 }); pet('petalB', 150, 28, 6.0, { bias: -0.08 });
  pet('petalF', -62, 31, 6.6); pet('petalF', 196, 30, 6.4); pet('petalF', 32, 29, 6.2);
  for (const [b, t] of fire) flame(S, 'fire', { base: b, tip: t, width: 3.4 });
  // 그을린 꽃심 + 잉걸 균열 + 눈
  const coal = S.layer('coal', { ramp: R.char, ...MAT.petal, lip: 0, bias: 0.12 }).add(ellipse(47, 33, 8.5, 7, { hz: 5 }));
  zigzag(S, [40, 31], [42, 39], 3, 1, '#f9c22b', coal.z);
  zigzag(S, [54, 30], [52, 38], 3, 1, '#f9c22b', coal.z);
  eyes(S, [[43, 30], [50, 30]]);
  // 수술 + 불씨
  for (const e of [[30, 10], [62, 8], [74, 22]]) { S.line([47, 30], e, '#9e4539'); S.paint([e, [e[0], e[1] - 1]], '#f9c22b'); }
  S.paint([[20, 4], [84, 6], [6, 30], [90, 34], [40, 2]], '#fb6b1d');
  return S;
}
