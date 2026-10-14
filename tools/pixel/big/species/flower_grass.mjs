// 페탈로즈(flower_grass) — 장미 기사. 컨셉 아트 concept/flower_grass.png 를 따른다:
//   겹겹 꽃잎이 두건처럼 감싼 봉오리 머리, 그 아래로 내다보는 크림빛 얼굴, 턱을 가린 초록 꽃받침 목도리,
//   가는 줄기 몸과 팔 — 왼손은 톱니 잎 칼을 치켜들고 오른손은 넓은 잎 방패. 잎 가장자리는 분홍, 줄기에 분홍 가시, 밑동에 넓은 잎 둘.
import { plant, MAT, stem, leaf, leafRim, petal, thorns, eyes, swayPt } from '../parts.mjs';
import { ellipse, bez, oklch } from '../engine.mjs';

const ROSE = [oklch(0.38, 0.11, 355), oklch(0.52, 0.16, 5), oklch(0.65, 0.175, 14), oklch(0.77, 0.13, 28), oklch(0.88, 0.07, 55)];
const LEAF = [oklch(0.33, 0.05, 160), oklch(0.46, 0.075, 140), oklch(0.59, 0.095, 122), oklch(0.71, 0.11, 113), oklch(0.83, 0.12, 104)];
const STEM = [oklch(0.34, 0.05, 155), oklch(0.5, 0.09, 138), oklch(0.64, 0.12, 128), oklch(0.75, 0.13, 120), oklch(0.86, 0.12, 110)];
const FACE = [oklch(0.5, 0.06, 30), oklch(0.7, 0.06, 45), oklch(0.84, 0.06, 65), oklch(0.91, 0.05, 78), oklch(0.96, 0.03, 90)];

export default function flowerGrass(f = {}) {
  const S = plant(), t = f.t ?? null;
  const hb = t === null ? 0 : Math.round(Math.sin(2 * Math.PI * t) * 0.6);   // 머리 숨쉬기(0~1칸)
  const P = (p, ax, ay, ph) => swayPt(p, t, ax, ay, ph);
  // 밑동 넓은 잎 둘
  leaf(S, 'baseL', { base: [48, 74], tip: P([30, 63], 0.6, 0.4, 0.1), bend: [35, 73], width: 5.6, at: 0.45, full: 0.7, fold: 0.55, veins: 3, ramp: LEAF });
  leaf(S, 'baseR', { base: [52, 74], tip: P([68, 64], 0.6, 0.4, 0.6), bend: [63, 73], width: 5.4, at: 0.45, full: 0.7, fold: 0.55, veins: 3, ramp: LEAF });
  // 줄기 몸 + 분홍 가시
  const body = bez([50, 76], [55, 60], [52, 44 + hb], 10);
  stem(S, 'stem', body, body.map((_, i) => 2.7 - i * 0.05), { ramp: STEM });
  thorns(S, 'thorn', [[52, 68, 56.5, 66.5, 1.6], [50.5, 61, 46.5, 59, 1.5], [53.5, 55, 57.5, 53, 1.4], [51.5, 49, 48, 47.5, 1.3]], { ramp: ROSE, hook: 0.2 });
  // 팔 둘(줄기에서 갈라진 가는 덩굴) + 주먹 매듭
  const hL = P([31, 50], 0.5, 0.6, 0.15), hR = P([67, 59], 0.4, 0.5, 0.55);
  stem(S, 'armL', bez([51, 58], [42, 58], hL, 6), [1.9, 1.8, 1.7, 1.7, 1.8, 2.0, 2.2], { ramp: STEM });
  stem(S, 'armR', bez([53, 62], [60, 63], hR, 6), [1.9, 1.8, 1.7, 1.7, 1.8, 2.0, 2.2], { ramp: STEM });
  S.layer('armL').add(ellipse(hL[0], hL[1], 3, 2.8, { hz: 2.5 }));
  S.layer('armR').add(ellipse(hR[0], hR[1], 2.8, 2.7, { hz: 2.5 }));
  // 칼 잎(왼쪽 위로 치켜듦) — 톱니, 분홍 가장자리, 잎맥
  leafRim(S, 'sword', { base: [hL[0] - 1, hL[1] - 2], tip: P([14, 3], 1.4, 0.6, 0.2), bend: [17, 30], width: 6, at: 0.36, full: 0.85, teeth: 13, serr: 0.3, fold: 0.7, veins: 7, ramp: LEAF }, ROSE, 1.4);
  // 방패 잎(오른쪽) — 넓은 달걀꼴, 끝이 오른쪽 아래
  leafRim(S, 'shield', { base: [hR[0] + 1, hR[1] - 12], tip: P([86, 69], 0.5, 0.8, 0.6), bend: [88, 47], width: 10.5, at: 0.42, full: 0.55, teeth: 10, serr: 0.12, fold: 0.5, veins: 6, ramp: LEAF }, ROSE, 1.3);
  // 머리: 봉오리 뒤 덩이 → 얼굴 → 꼭대기 속꽃잎 → 오른쪽 감싼 꽃잎 → 왼쪽 위에서 덮은 두건 꽃잎 → 꽃받침 목도리
  const y = hb;
  petal(S, 'bud', 52, 25 + y, 17, 19, { ramp: ROSE, hz: 14, bias: -0.08 });
  S.layer('face', { ramp: FACE, amb: 0.45, dif: 0.5, th: [0.36, 0.56, 0.8], dither: 0.04, casts: false }).add(ellipse(51, 31 + y, 9.5, 7.5, { hz: 5 }));
  petal(S, 'top', 57, 8 + y, 8, 6.5, { ramp: ROSE, hz: 6 });
  petal(S, 'top2', 50, 11 + y, 7.5, 5.5, { ramp: ROSE, hz: 5, rot: -0.3 });
  petal(S, 'flare', 67, 11 + y, 6.5, 3.6, { ramp: ROSE, hz: 3, rot: -0.7 });
  petal(S, 'wrapR', 63, 24 + y, 8.5, 15, { ramp: ROSE, hz: 10, rot: 0.28 });
  const faceCut = ellipse(51.5, 33 + y, 9.5, 7);
  petal(S, 'hood', 45, 18 + y, 15.5, 13.5, { ramp: ROSE, hz: 12, rot: -0.45, cut: faceCut });
  // 두건 꽃잎의 말린 끝: 얼굴 위 가장자리 안쪽 한 줄을 밝게(가장자리 자체는 어두운 선)
  S.patterns.push((x, yy, ln, tv) => {
    if (ln !== 'hood') return tv;
    const u = (x + 0.5 - 51.5) / 9.5, v = (yy + 0.5 - 33 - y) / 7, r = Math.hypot(u, v);
    return r > 1.06 && r < 1.3 && yy < 33 + y ? 4 : tv;
  });
  // 꼭대기 속꽃잎 나선
  for (let k = 0; k < 6; k++) { const a = (200 + k * 28) * Math.PI / 180, r = 4.2 - k * 0.45; S.paint([[57 + r * Math.cos(a), 8 + y + r * Math.sin(a)]], ROSE[1]); }
  for (const [tx, ty] of [[35, 41], [42, 48], [52, 50], [62, 48], [69, 41]])
    leaf(S, 'sepal', { base: [52, 38 + y], tip: [tx, ty + y], width: 3.6, at: 0.32, full: 0.8, fold: 0.6, rib: false, ramp: LEAF, bias: 0.04 });
  eyes(S, [[45, 28 + y], [54, 28 + y]], { style: 'lidIris', l: ROSE[0], i: oklch(0.5, 0.11, 40), k: oklch(0.3, 0.05, 20) });
  return S;
}
