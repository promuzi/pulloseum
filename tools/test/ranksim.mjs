// 단계 오르는 속도 어림(판 수): 옛 규칙 vs 새 규칙 후보
const P = [0.85, 0.75, 0.68, 0.62, 0.58, 0.55, 0.52];   // 단계별 이길 확률(어림)
let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
function run(rule, scale = 1) {
  let tier = 0, round = 0, w = 0, l = 0, n = 0;
  const per = [];
  let start = 0;
  while (tier < 6 && n < 1e5) {
    n++;
    const p = Math.min(0.97, P[tier] * scale);
    const need = rule.need(tier);
    if (rnd() < p) w++; else l++;
    if (w >= need) { w = 0; l = 0; if (round >= 4) { tier++; round = 0; per.push(n - start); start = n; } else round++; }
    else if (l >= need) { w = 0; l = 0; round = rule.fail(tier, round); }
  }
  return { n, per };
}
const OLD = { need: () => 3, fail: (t, r) => (t >= 5 ? 0 : r) };
const NEW = { need: t => (t >= 3 ? 4 : 3), fail: (t, r) => (t >= 5 ? 0 : t >= 1 ? Math.max(0, r - 1) : r) };
for (const sc of [1, 0.92, 1.08]) {
  for (const [nm, R] of [['옛', OLD], ['새', NEW]]) {
    let tot = 0, perT = [0, 0, 0, 0, 0, 0]; const K = 400;
    for (let i = 0; i < K; i++) { const r = run(R, sc); tot += r.n; r.per.forEach((x, j) => perT[j] += x); }
    console.log(`승률×${sc} ${nm}: 풀로세움까지 평균 ${Math.round(tot / K)}판 · 단계별 ${perT.map(x => Math.round(x / K)).join(' / ')}`);
  }
}
