// 탐사 개편 시험(2026-10-16 — 모선 · 탐사선 부위 다섯 · 연료 캡슐 · 탐사비 · 내구도): 화면 없이 규칙만 많이 돌려
//  ① 탐사로 돈을 불릴 수 없음(얻는 돈 평균 < 탐사비 — 어떤 행성 · 어떤 부위 단계든) ② 성공률 · 닳는 양이 위험 · 짐 · 내구성을 따라감
//  ③ 종자 보관함 · 행성 생기가 높을수록 개체값이 좋아짐 ④ 종자 종류 비율은 부위와 상관없음 ⑤ 잘못된 탐사는 막힘(탱크 · 돈 · 캡슐 · 망가짐)
//   node tools/test/explore.mjs [행성당 판 수 4000]
import { newGame, explore, exploreOdds, probeOf, repairProbe, upgradeProbe, makePlant, Err } from '../../v2/src/game/logic.js';
import { PLANETS, PROBE, IV_KEYS, probeMaxDur } from '../../v2/src/game/catalog.js';
import { makeRng } from '../../v2/src/battle/rules.js';
const N = +(process.argv[2] || 4000);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const fresh = (lv = 1, seed = 1) => { const r = makeRng(seed), s = newGame({ nickname: '시험', starter: 'flower_grass' }, r, 0); s.user.level = 30; const P = probeOf(s); for (const k of Object.keys(PROBE)) P.lv[k] = Math.min(PROBE[k].max, lv); P.lv.tank = 4; P.dur = probeMaxDur(P.lv.hull); return s; };
const ivAvg = (s, rng) => { let t = 0, n = 0; for (const sd of s.seeds) { const p = makePlant(s, sd, rng, 0); for (const k of IV_KEYS) { t += p.ivs[k]; n++; } } return n ? t / n : 0; };
const rows = [];
for (const lv of [1, 3, 5]) for (const pl of PLANETS) {
  const s = fresh(lv), rng = makeRng(7 + lv), O0 = exploreOdds(s, pl);
  let spent = 0, back = 0, okN = 0, wear = 0, parts = 0, seeds = 0, keys = {};
  for (let i = 0; i < N; i++) {
    s.items.fuel = 9; s.wallet.credits = 1e6; s.probe.dur = probeMaxDur(s.probe.lv.hull); s.seeds.length = 0;
    const c0 = s.wallet.credits, p0 = s.items.parts || 0;
    const r = explore(s, pl.id, rng, 0);
    spent += r.cost; back += s.wallet.credits - (c0 - r.cost); parts += (s.items.parts || 0) - p0; wear += r.wear;
    if (r.ok) okN++;
    for (const g of r.got) if (g.kind === 'seed') { seeds++; keys[g.seed.key] = (keys[g.seed.key] || 0) + 1; }
  }
  rows.push({ lv, id: pl.id, name: pl.name, hz: pl.hazard, okP: okN / N, predicted: O0.ok, ret: back / spent, wear: wear / N, parts: parts / N, seeds: seeds / N, keys });
  ok(back < spent, `${pl.name} 부위 ${lv}: 돈이 불어남(${(back / spent).toFixed(2)}배)`);
  ok(Math.abs(okN / N - O0.ok) < 0.03, `${pl.name} 부위 ${lv}: 성공률 ${(okN / N).toFixed(3)} ≠ 미리 보인 ${O0.ok.toFixed(3)}`);
}
// 종자 종류 비율 = 부위와 상관없음(같은 행성 · 부위 1 vs 5 — 흔한 것끼리 비율 차 5%p 안)
for (const pl of PLANETS) {
  const a = rows.find(r => r.id === pl.id && r.lv === 1).keys, b = rows.find(r => r.id === pl.id && r.lv === 5).keys, ta = Object.values(a).reduce((x, y) => x + y, 0), tb = Object.values(b).reduce((x, y) => x + y, 0);
  for (const k of pl.pool) ok(Math.abs((a[k] || 0) / ta - (b[k] || 0) / tb) < 0.05, `${pl.name}: ${k} 비율이 부위로 바뀜`);
}
// 개체값: 생기 0 · 2 행성 × 종자 보관함 1 · 5
const iv = {};
for (const [id, vlt] of [['ex_calisto', 1], ['ex_calisto', 5], ['ex_mirdin', 1], ['ex_mirdin', 5]]) {
  const s = fresh(1), rng = makeRng(99); s.probe.lv.vault = vlt; let t = 0, n = 0;
  for (let i = 0; i < 1500; i++) { s.items.fuel = 9; s.wallet.credits = 1e6; s.probe.dur = probeMaxDur(1); s.seeds.length = 0; explore(s, id, rng, 0); if (s.seeds.length) { t += ivAvg(s, rng); n++; } }
  iv[id + vlt] = t / n;
}
ok(iv.ex_calisto1 < iv.ex_calisto5 && iv.ex_calisto5 < iv.ex_mirdin5 && iv.ex_mirdin1 < iv.ex_mirdin5, '개체값이 생기 · 종자 보관함을 따라가지 않음 ' + JSON.stringify(iv));
// 막힘
{
  const s = fresh(1), rng = makeRng(3), far = PLANETS.find(p => p.orbit === 2); s.probe.lv.tank = 1;
  const tryE = (id, m) => { try { explore(s, id, rng, 0); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err, m + ' ' + e.message); } };
  tryE(far.id, '연료 탱크 1단계로 2궤도');
  s.wallet.credits = 10; tryE('ex_ermias', '탐사비 모자람');
  s.wallet.credits = 1000; s.items.fuel = 0; tryE('ex_ermias', '연료 캡슐 없음');
  s.items.fuel = 3; s.probe.dur = 0; tryE('ex_ermias', '망가진 탐사선');
  const rp = repairProbe(s); ok(rp.fixed === probeMaxDur(1) && rp.cost === rp.fixed * 2, '고치기');
  s.items.parts = 0; try { upgradeProbe(s, 'tank'); ok(false, '부품 없이 강화'); } catch (e) { ok(e instanceof Err, '부품 없이 강화 막힘'); }
  s.items.parts = 50; s.wallet.credits = 5000; const up = upgradeProbe(s, 'hull'); ok(up.lv === 2 && s.probe.dur === probeMaxDur(2), '내구성 강화 = 내구도 한도 +20 · 지금 값도');
}
const pct = x => (x * 100).toFixed(0) + '%';
console.log('부위 | 행성(위험) | 성공 | 돈 돌려받음 | 닳음 | 부품 | 종자');
for (const r of rows.filter(r => r.lv !== 3)) console.log(`  ${r.lv} | ${r.name}(${r.hz}) | ${pct(r.okP)} | ${r.ret.toFixed(2)}배 | ${r.wear.toFixed(1)} | ${r.parts.toFixed(2)} | ${r.seeds.toFixed(2)}`);
console.log('개체값 평균(0~10):', Object.entries(iv).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · '));
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
