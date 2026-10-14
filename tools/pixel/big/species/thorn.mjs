// 쏜위드(thorn) — 가시덩굴 덤불. 컨셉 아트 concept/thorn.png 를 따른다:
//   굵은 가시덩굴이 엉켜 만든 둥근 덤불 몸, 그 가운데 그늘 속에서 노란 눈이 내다보고, 양옆으로 뻗은 덩굴손 끝이 나선으로 말린다.
//   덩굴엔 연한 크림빛 가시, 꼭대기엔 새 잎 몇 장.
// 움직임: 덩굴손이 출렁이고 잎이 살랑이며 덤불이 숨 쉬듯 1칸 오르내린다.
import { plant, vine, leaf, eyes, spiral, swayPt } from '../parts.mjs';
import { ellipse, bez, oklch } from '../engine.mjs';

const VINE = [oklch(0.3, 0.04, 140), oklch(0.42, 0.06, 128), oklch(0.55, 0.08, 118), oklch(0.67, 0.1, 112), oklch(0.8, 0.11, 105)];
const THORN = [oklch(0.45, 0.04, 60), oklch(0.62, 0.05, 70), oklch(0.78, 0.06, 80), oklch(0.88, 0.06, 88), oklch(0.95, 0.04, 95)];
const LEAF = [oklch(0.34, 0.05, 150), oklch(0.48, 0.09, 138), oklch(0.62, 0.12, 128), oklch(0.74, 0.13, 120), oklch(0.86, 0.12, 110)];
const SHADE = [oklch(0.22, 0.03, 150), oklch(0.26, 0.035, 145), oklch(0.31, 0.04, 140), oklch(0.36, 0.045, 135), oklch(0.42, 0.05, 130)];

export default function thorn(f = {}) {
  const S = plant(), t = f.t ?? null, b = t === null ? 0 : Math.round(Math.sin(2 * Math.PI * t) * 0.6);
  const T = { every: 5, len: 3.4, r: 1.5, ramp: THORN, hook: 0.25 }, V = { ramp: VINE };
  const C = [48, 48 + b];
  // 흙으로 들어가는 밑동(짧게) + 덤불 속 덩이(어두운 바탕)
  vine(S, 'root', bez([42, 64 + b], [40, 70], [41, 77], 5), 3.6, 3, V);
  vine(S, 'root', bez([54, 64 + b], [56, 70], [55, 77], 5), 3.6, 3, V);
  S.layer('core', { ...V, amb: 0.2, dif: 0.7, th: [0.42, 0.66, 0.9], bias: -0.16, dither: 0.06, smooth: 2 }).add(ellipse(C[0], C[1], 21, 19, { hz: 14 }));
  // 얼굴 그늘(검정이 아니라 짙은 초록)
  S.layer('shade', { ramp: SHADE, amb: 0.4, dif: 0.4, th: [0.3, 0.5, 0.75], dither: 0.06, casts: false }).add(ellipse(C[0], C[1] - 3, 10.5, 6.5, { hz: 4 }));
  // 덤불 덩굴: 서로 다른 방향으로 휘감은 여덟 가닥(층이 달라 겹친 자리마다 선·그림자) — 얼굴 그늘은 비워 둔다
  const strands = [
    [[27, 52], [36, 30], [60, 29]], [[69, 52], [60, 30], [36, 29]],      // 위쪽 둥근 고리 둘(눈썹)
    [[28, 44], [40, 66], [64, 62]], [[68, 44], [56, 66], [32, 62]],      // 아래 고리 둘(볼)
    [[30, 34], [24, 52], [36, 65]], [[66, 34], [72, 52], [60, 65]],      // 옆 고리 둘
    [[38, 27], [48, 23], [58, 27]], [[40, 67], [48, 70], [57, 67]],      // 꼭대기·밑 마감
  ];
  strands.forEach((s, k) => vine(S, 'strand' + (k % 3), bez(s[0].map((v, i) => v + (i ? b : 0)), s[1].map((v, i) => v + (i ? b : 0)), s[2].map((v, i) => v + (i ? b : 0)), 16), 4.2, 3.6, { ...V, bias: k < 2 ? 0.02 : -0.04, thorn: { ...T, start: 0.15, end: 0.85 } }));
  // 덩굴손: 양옆으로 뻗어 위로 나선처럼 말린다
  const eL = swayPt([12, 42], t, 1.2, 1.5, 0.1), eR = swayPt([84, 40], t, 1.2, 1.5, 0.6);
  vine(S, 'tendril', [...bez([29, 49 + b], [18, 54], eL, 10), ...spiral(eL[0] + 3.5, eL[1] - 4.5, 5.5, 1.4, 145, -150, 16).slice(1)], 3.4, 1.1, { ...V, thorn: { ...T, len: 3, end: 0.6 } });
  vine(S, 'tendril', [...bez([67, 49 + b], [78, 54], eR, 10), ...spiral(eR[0] - 3.5, eR[1] - 4.5, 5.5, 1.4, 35, 330, 16).slice(1)], 3.4, 1.1, { ...V, thorn: { ...T, len: 3, end: 0.6 } });
  // 꼭대기 새 잎
  const LF = { width: 3.4, at: 0.4, full: 0.75, fold: 0.6, rib: true, ramp: LEAF };
  leaf(S, 'sprout', { ...LF, base: [42, 28 + b], tip: swayPt([33, 17], t, 0.8, 0.5, 0.2) });
  leaf(S, 'sprout', { ...LF, base: [49, 25 + b], tip: swayPt([51, 11], t, 0.8, 0.5, 0.5), width: 3.8 });
  leaf(S, 'sprout', { ...LF, base: [56, 28 + b], tip: swayPt([66, 19], t, 0.8, 0.5, 0.8) });
  eyes(S, [[40, 43 + b], [53, 43 + b]], { style: 'cat', g: oklch(0.85, 0.15, 95), k: oklch(0.25, 0.05, 60) });
  return S;
}
