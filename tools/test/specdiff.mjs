// 종 리그전 앞뒤 견주기(2026-11-06): 단계마다 표준편차 · 40~60% 밖 종 수 · 가장 낮음/높음 · 많이 오른/내린 종 다섯
//   node tools/test/specdiff.mjs <앞 폴더> <뒤 폴더> [--out <파일>]   (폴더 안 specbal_stage0~2.json — specbalance.mjs --json 결과)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [A, B] = process.argv.slice(2), oi = process.argv.indexOf('--out'), OUT = oi > 0 ? process.argv[oi + 1] : null;
const NAME = ['새싹', '성장기', '성체'], pct = v => Math.round(v * 1000) / 10;
const sd = a => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
const lines = [];
for (const s of [0, 1, 2]) {
  const fa = join(A, `specbal_stage${s}.json`), fb = join(B, `specbal_stage${s}.json`);
  if (!existsSync(fa) || !existsSync(fb)) { lines.push(`${NAME[s]}: 파일 없음`); continue; }
  const ra = JSON.parse(readFileSync(fa, 'utf8')).rows, rb = JSON.parse(readFileSync(fb, 'utf8')).rows;
  const ma = new Map(ra.map(r => [r.k, r])), va = ra.map(r => pct(r.r)), vb = rb.map(r => pct(r.r));
  const out = v => v.filter(x => x < 40 || x > 60).length;
  lines.push(`${NAME[s]}: 표준편차 ${sd(va).toFixed(1)} → ${sd(vb).toFixed(1)} · 40~60 밖 ${out(va)} → ${out(vb)}종 · 가장 낮음 ${Math.min(...va)} → ${Math.min(...vb)} · 가장 높음 ${Math.max(...va)} → ${Math.max(...vb)}`);
  const d = rb.filter(r => ma.has(r.k)).map(r => ({ n: r.name, d: Math.round((pct(r.r) - pct(ma.get(r.k).r)) * 10) / 10, v: pct(r.r) }));
  const up = [...d].sort((x, y) => y.d - x.d).slice(0, 5), dn = [...d].sort((x, y) => x.d - y.d).slice(0, 5);
  lines.push('  오른 종: ' + up.map(x => `${x.n} ${x.d >= 0 ? '+' : ''}${x.d}(${x.v})`).join(' · '));
  lines.push('  내린 종: ' + dn.map(x => `${x.n} ${x.d}(${x.v})`).join(' · '));
}
console.log(lines.join('\n'));
if (OUT) writeFileSync(OUT, lines.join('\n') + '\n');
