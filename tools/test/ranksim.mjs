// 단계 오르는 속도 어림(판 수) — 진행은 실제 규칙(logic.js battleReward: 라운드 점수 · 칸 · 지면 대회 끝 · 감점, seasonSync: 시즌 끝 두 단계 내려감) 그대로,
//  이길 확률만 어림(단계별 85% → 52% — 봇 세기 실측 전 가정). 2026-10-23 칸 100점 · 단계 400점
//   node tools/test/ranksim.mjs
import { newGame, battleReward, seasonSync } from '../../v2/src/game/logic.js';
import { TIERS, DIVS, SEASON, seasonEnd, divOf, rankOf } from '../../v2/src/game/catalog.js';
import { makeRng } from '../../v2/src/battle/rules.js';

const P = [0.85, 0.75, 0.68, 0.62, 0.58, 0.55, 0.52];
const TOP = TIERS.length - 1, t0 = SEASON.epoch + 864e5;
const step = T => { const t = TIERS.indexOf(T.tier); return t >= TOP ? TOP * DIVS : t * DIVS + (DIVS - divOf(T)); };   // 0 = 브론즈 4 … 24 = 풀로세움
const label = d => (d >= TOP * DIVS ? TIERS[TOP] : `${TIERS[Math.floor(d / DIVS)]} ${DIVS - (d % DIVS)}`);
const play = (s, rnd, scale) => { const t = TIERS.indexOf(s.tournament.tier); battleReward(s, { mode: 'tournament', win: rnd() < Math.min(0.97, P[t] * scale), rng: rnd, now: t0 }); };

// 시즌 없이 풀로세움까지: 판 수 + 칸마다 처음 닿은 판
function climb(seed, scale) {
  const rnd = makeRng(seed), s = newGame({ nickname: '어림', starter: 'flower_grass' }, makeRng(seed + 7), t0), first = new Array(TOP * DIVS + 1).fill(0);
  let n = 0, hi = 0;
  while (step(s.tournament) < TOP * DIVS && n < 3e4) { play(s, rnd, scale); n++; const d = step(s.tournament); while (hi < d) first[++hi] = n; }
  return { n, first };
}
// 하루 perDay판 · 시즌(14일)마다 seasonSync(두 단계 내려감) → 시즌마다 가장 높이 간 칸
function seasons(seed, perDay, nS) {
  const rnd = makeRng(seed), s = newGame({ nickname: '시즌', starter: 'flower_grass' }, makeRng(seed + 7), t0), best = [];
  for (let k = 0; k < nS; k++) {
    let b = step(s.tournament);
    for (let i = 0; i < perDay * SEASON.days; i++) { play(s, rnd, 1); b = Math.max(b, step(s.tournament)); }
    best.push(b); seasonSync(s, seasonEnd(s.season.n) + 3600e3);
  }
  return best;
}
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const K = 120;
for (const sc of [0.92, 1, 1.08]) {
  const ns = [], sum = new Array(TOP * DIVS + 1).fill(0);
  for (let k = 0; k < K; k++) { const r = climb(1000 + k, sc); ns.push(r.n); r.first.forEach((x, i) => (sum[i] += x)); }
  const per = TIERS.slice(0, TOP).map((nm, t) => `${nm} ${Math.round((sum[(t + 1) * DIVS] - sum[t * DIVS]) / K / DIVS)}`);
  console.log(`승률×${sc}: 풀로세움까지 평균 ${Math.round(ns.reduce((a, b) => a + b, 0) / K)}판(중간 ${median(ns)}) · 칸 하나 = ${per.join(' · ')}판`);
}
for (const perDay of [20, 40, 80]) {
  const s1 = [], s6 = [];
  for (let k = 0; k < 60; k++) { const b = seasons(5000 + k, perDay, 6); s1.push(b[0]); s6.push(b[5]); }
  console.log(`하루 ${perDay}판: 첫 시즌 최고 ${label(median(s1))} · 여섯째 시즌 최고 ${label(median(s6))}`);
}
console.log(`확인: ${rankOf({ tier: '브론즈', pts: 0 })} · ${rankOf({ tier: '골드', pts: 250 })} · ${rankOf({ tier: TIERS[TOP], pts: 0 })}`);
