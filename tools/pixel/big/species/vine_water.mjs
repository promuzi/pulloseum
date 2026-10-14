// 타이드바인(vine_water) — 해조 덩굴. 컨셉 아트 concept/vine_water.png 를 따른다:
//   물빛 파란 덩굴 두 가닥이 밧줄처럼 꼬여 솟고, 끝에 물개 같은 둥근 머리(반쯤 감긴 금빛 눈),
//   머리와 몸에서 구멍 난 미역 잎이 머리카락처럼 길게 흘러내리며, 둘레에 맑은 공기주머니, 잎끝 물방울.
// 움직임: 미역 잎이 물결처럼 흐느적이고(위상이 끝으로 흘러감), 공기주머니가 오르내리며, 물방울이 떨어진다.
import { plant, MAT, stem, leaf, wavy, eyes, swayPt } from '../parts.mjs';
import { ellipse, oklch } from '../engine.mjs';

const BODY = [oklch(0.4, 0.07, 235), oklch(0.55, 0.09, 225), oklch(0.68, 0.1, 215), oklch(0.79, 0.09, 205), oklch(0.9, 0.06, 195)];
const KELP = [oklch(0.34, 0.05, 195), oklch(0.47, 0.06, 178), oklch(0.6, 0.075, 162), oklch(0.72, 0.075, 150), oklch(0.84, 0.065, 138)];
const BUB = [oklch(0.5, 0.06, 230), oklch(0.68, 0.07, 220), oklch(0.82, 0.06, 210), oklch(0.91, 0.04, 200), '#ffffff'];

export default function vineWater(f = {}) {
  const S = plant(), t = f.t ?? null, ph = t === null ? 0 : 2 * Math.PI * t;
  const H = [48, 27];
  const K = { at: 0.36, full: 0.6, fold: 0.3, rib: true, ramp: KELP, teeth: 0, wave: 0.12, waves: 3 };
  const kelp = (name, a, b, amp, w, p, holes = [], o = {}) => {
    const lay = leaf(S, name, { ...K, path: wavy(a, b, amp, 1.3, 26, ph + p), width: w, ...o });
    for (const [x, y, r] of holes) lay.cut(ellipse(x, y, r, r * 0.8));
  };
  // 뒤 미역 잎(어둡게)
  kelp('kelpB', [43, 22], [20, 4], 4.5, 6.4, 0.3, [[29, 12, 1.4]], { bias: -0.08 });
  kelp('kelpB', [53, 22], [78, 4], 4.5, 6.4, 1.5, [[68, 12, 1.4]], { bias: -0.08 });
  kelp('kelpB', [43, 30], [8, 36], 4, 6, 2.4, [[22, 33, 1.3]], { bias: -0.08 });
  kelp('kelpB', [53, 30], [88, 36], 4, 6, 3.1, [[74, 33, 1.3]], { bias: -0.08 });
  // 꼬인 몸: 같은 길을 반대 위상으로 도는 두 가닥
  const a = wavy([45, 77], [48, 33], 4.5, 1.5, 24, 0), b2 = wavy([51, 77], [48, 33], 4.5, 1.5, 24, Math.PI);
  stem(S, 'bodyA', a, a.map((_, i) => 4.4 - i * 0.04), { ramp: BODY, ...MAT.gel, thin: 0, bias: -0.06 });
  stem(S, 'bodyB', b2, b2.map((_, i) => 4.4 - i * 0.04), { ramp: BODY, ...MAT.gel, thin: 0 });
  // 공기주머니(가는 대 + 맑은 구슬, 오르내림)
  const bub = S.layer('bub', { ramp: BUB, ...MAT.gel, spec: [30, 0.82] }), stalk = KELP[2];
  [[30, 44, 2.6, 0.1], [67, 40, 2.4, 0.4], [33, 60, 2.2, 0.7], [64, 58, 2.3, 0.9]].forEach(([x, y, r, p]) => {
    const yy = y + (t === null ? 0 : Math.sin(2 * Math.PI * (t + p)) * 1.2), sx = x < 48 ? x + 6 : x - 6;
    S.line([sx, yy + 4], [x, yy], stalk);
    bub.add(ellipse(x, yy, r, r, { hz: r }));
  });
  // 머리
  S.layer('head', { ramp: BODY, ...MAT.gel, thin: 0 }).add(ellipse(H[0], H[1], 11, 9, { hz: 9 }));
  // 앞 미역 잎(머리에서 흘러내림)
  kelp('kelpF', [40, 28], [18, 58], 4.5, 6, 0.9, [[27, 43, 1.4]]);
  kelp('kelpF', [56, 28], [78, 58], 4.5, 6, 2.0, [[69, 43, 1.4]]);
  // 잎끝 물방울
  const drop = S.layer('drop', { ramp: BUB, ...MAT.gel });
  [[18, 60, 0], [78, 60, 0.5]].forEach(([x, y, p]) => {
    const q = t === null ? 0.2 : (t + p) % 1;
    drop.add(ellipse(x, y + (q < 0.5 ? 0 : (q - 0.5) * 34), 1.2 + Math.min(q, 0.5), 1.6 + Math.min(q, 0.5), { hz: 1.3 }));
  });
  eyes(S, [[41, 25], [51, 25]], { style: 'lidIris', l: BODY[0], i: oklch(0.72, 0.13, 70), k: oklch(0.3, 0.06, 40) });
  return S;
}
