// 탐사 개편 시험(2026-10-16 — 모선 · 탐사선 부위 다섯 · 연료 캡슐 · 탐사비 · 필수/권장 단계): 화면 없이 규칙만 많이 돌려
//  ① 탐사로 돈을 불릴 수 없음(얻는 돈 평균 < 탐사비 — 어떤 행성 · 어떤 부위 단계든) ② 성공률 = 권장 내구성을 채우면 95% · 모자란 단계마다 −20%p(필수만 채우면 갈 수 있음)
//  ③ 종자 보관함 · 행성 생기가 높을수록 개체값이 좋아짐 ④ 종자 종류 비율은 부위와 상관없음 ⑤ 잘못된 탐사는 막힘(탱크 · 탐사 장치 · 돈 · 캡슐)
//  ⑥ 지역(2026-10-16): 표 규칙(첫 곳 = 행성 값 · 단계 1 · 2 · 3 · 4 · 식물은 행성 것 중 · 위험 높을수록 귀한 보상 배수 큼) · 첫 곳 = 지역 없이 보낸 것과 같음 ·
//     잠긴 곳은 막힘(아무것도 안 씀) · 지역마다 돈 안 불어남 · 성공률 = 미리 보인 값 · 종자 비율 = 종류(kind) · 드문 종자 = 18% × rare · 귀한 보상 = 미리 보인 값
//   node tools/test/explore.mjs [행성당 판 수 4000]
import { newGame, explore, exploreOdds, regionOf, probeOf, upgradeProbe, makePlant, Err } from '../../v2/src/game/logic.js';
import { PLANETS, PROBE, IV_KEYS, SPECIES, KIND_NAME } from '../../v2/src/game/catalog.js';
import { OPS } from '../../v2/src/game/ops.js';
import { makeRng } from '../../v2/src/battle/rules.js';
const N = +(process.argv[2] || 4000);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const fresh = (lv = 1, seed = 1) => { const r = makeRng(seed), s = newGame({ nickname: '시험', starter: 'flower_grass' }, r, 0); s.user.level = 30; const P = probeOf(s); for (const k of Object.keys(PROBE)) P.lv[k] = Math.min(PROBE[k].max, lv); P.lv.tank = 4; return s; };
const ivAvg = (s, rng) => { let t = 0, n = 0; for (const sd of s.seeds) { const p = makePlant(s, sd, rng, 0); for (const k of IV_KEYS) { t += p.ivs[k]; n++; } } return n ? t / n : 0; };
const near = (x, p, n) => Math.abs(x - p) <= 4 * Math.sqrt(p * (1 - p) / Math.max(1, n)) + 0.005;   // 비율이 기대값 근처(표본 수로 4σ)
const KIND_P = { seed: 0.92, mixed: 0.7, resource: 0.35 };
// ⑥ 지역 표 규칙(첫 곳 = 행성 값 그대로 · 탐사 장치 1 · 2 · 3 · 4 차례 · 식물은 행성 것 중 · 위험이 높은 곳일수록 귀한 보상 배수 큼)
for (const pl of PLANETS) {
  const rs = pl.regions || [], nm = `${pl.name} 지역`;
  ok(rs.length >= 3 && rs.length <= 4, `${nm} 수 ${rs.length}(3~4곳)`);
  ok(rs.every((R, i) => R.need === i + 1 && R.need <= PROBE.scanner.max), `${nm}: 탐사 장치 단계가 1 · 2 · 3 · 4 차례가 아님`);
  ok(new Set(rs.map(R => R.id)).size === rs.length && new Set(rs.map(R => R.name)).size === rs.length, `${nm}: id · 이름 겹침`);
  ok(rs.every(R => R.name.length <= (rs.length === 4 ? 5 : 7)), `${nm}: 이름이 화면 칸보다 김(4곳 = 5자 · 3곳 = 7자까지)`);
  const R0 = rs[0]; ok(R0 && !R0.pool && !R0.dh && !R0.dv && !R0.kind && (R0.rare ?? 1) === 1 && (R0.mut ?? 1) === 1, `${nm}: 첫 곳은 행성 값 그대로여야 함`);
  for (const R of rs) {
    const hz = (pl.hazard || 0) + (R.dh || 0), vt = (pl.vital || 0) + (R.dv || 0), pool = R.pool || pl.pool;
    ok(hz >= 0 && hz <= 3 && vt >= 0 && vt <= 2, `${nm} ${R.name}: 위험 ${hz} · 생기 ${vt}가 범위 밖`);
    ok(pool.every(k => pl.pool.includes(k)) && pool.some(k => SPECIES[k].rarity === 'common'), `${nm} ${R.name}: 식물은 행성 것 중 · 흔한 것 하나 이상`);
    ok(!R.kind || KIND_NAME[R.kind], `${nm} ${R.name}: 모르는 종류 ${R.kind}`);
    ok([1, 1.5, 2].includes(R.mut ?? 1), `${nm} ${R.name}: 변이 배수 ${R.mut}`);
  }
  for (const A of rs) for (const B of rs) { const a = regionOf(pl, A.id), b = regionOf(pl, B.id); if (a.hazard < b.hazard) ok(a.rare < b.rare, `${nm}: ${A.name}(위험 ${a.hazard}) 귀한 보상 ${a.rare} ≥ ${B.name}(위험 ${b.hazard}) ${b.rare}`); }
}
// 첫 곳 = 지역 없이 보낸 것(옛 화면) = 모르는 지역 — 같은 씨앗이면 결과 · 상태가 똑같음
for (const pl of PLANETS) {
  const run = rid => { const s = fresh(3, 5), rng = makeRng(31), out = []; for (let i = 0; i < 300; i++) { s.items.fuel = 9; s.wallet.credits = 1e6; out.push(explore(s, pl.id, rng, 0, rid)); } return JSON.stringify([out, s.wallet, s.items, s.probe, s.seeds, s.user]); };
  const a = run(undefined);
  ok(a === run(pl.regions[0].id) && a === run('없는곳'), `${pl.name}: 첫 지역 · 지역 없음 · 모르는 지역 결과가 다름`);
  const s = fresh(3); ok(JSON.stringify(exploreOdds(s, pl)) === JSON.stringify(exploreOdds(s, pl, pl.regions[0].id)), `${pl.name}: 첫 지역 미리 보기가 다름`);
}
// 행성 × 지역(그 부위 단계 탐사 장치로 열린 곳) × 부위 1 · 3 · 5 — 첫 곳은 지역 없이(옛 판과 같은 판)
const rows = [];
for (const lv of [1, 3, 5]) for (const pl of PLANETS) pl.regions.forEach((R, ri) => {
  if (R.need > lv) return;
  const s = fresh(lv), rng = makeRng(7 + lv + 100 * ri), Z = regionOf(pl, R.id), O0 = exploreOdds(s, pl, R.id), rid = ri ? R.id : undefined;
  let spent = 0, back = 0, okN = 0, parts = 0, seeds = 0, rareN = 0, slots = 0, gems = 0, keys = {};
  for (let i = 0; i < N; i++) {
    s.items.fuel = 9; s.wallet.credits = 1e6; s.seeds.length = 0;
    const c0 = s.wallet.credits, p0 = s.items.parts || 0;
    const r = explore(s, pl.id, rng, 0, rid);
    if (i === 0) ok(r.region === R.id, `${pl.name} ${R.name}: 결과의 지역 ${r.region}`);
    spent += r.cost; back += s.wallet.credits - (c0 - r.cost); parts += (s.items.parts || 0) - p0;
    if (r.ok) { okN++; for (const g of r.got) if (g.kind !== 'seed') { slots++; if (g.kind === 'scion' || g.kind === 'regress' || g.kind === 'gems') gems++; } }
    for (const g of r.got) if (g.kind === 'seed') { seeds++; keys[g.seed.key] = (keys[g.seed.key] || 0) + 1; if (SPECIES[g.seed.key].rarity === 'rare') rareN++; }
  }
  const tag = `${pl.name} ${R.name} 부위 ${lv}`, rareP = Math.min(1, 0.18 * Z.rare);
  rows.push({ lv, id: pl.id, ri, name: pl.name, area: R.name, hz: Z.hazard, okP: okN / N, predicted: O0.ok, ret: back / spent, hull: O0.rec.hull, parts: parts / N, seeds: seeds / N, gem: gems / slots, keys, nSeed: seeds });
  ok(back < spent, `${tag}: 돈이 불어남(${(back / spent).toFixed(2)}배)`);
  ok(Math.abs(okN / N - O0.ok) < 0.03, `${tag}: 성공률 ${(okN / N).toFixed(3)} ≠ 미리 보인 ${O0.ok.toFixed(3)}`);
  ok(Object.keys(keys).every(k => Z.pool.includes(k)), `${tag}: 지역에 없는 식물 ${Object.keys(keys)}`);
  ok(near(seeds / okN, KIND_P[Z.kind], okN), `${tag}: 종자 비율 ${(seeds / okN).toFixed(3)} ≠ ${Z.kind} ${KIND_P[Z.kind]}`);
  if (Z.pool.some(k => SPECIES[k].rarity === 'rare')) ok(near(rareN / seeds, rareP, seeds), `${tag}: 드문 종자 ${(rareN / seeds).toFixed(3)} ≠ ${rareP.toFixed(3)}`);
  ok(near(gems / slots, O0.gem, slots), `${tag}: 귀한 보상 ${(gems / slots).toFixed(3)} ≠ 미리 보인 ${O0.gem.toFixed(3)}`);
});
// 종자 종류 비율 = 부위와 상관없음(같은 행성 · 부위 1 vs 5 — 흔한 것끼리 비율 차 5%p 안) · 지역도(부위 3 vs 5)
for (const pl of PLANETS) {
  const a = rows.find(r => r.id === pl.id && r.lv === 1 && r.ri === 0).keys, b = rows.find(r => r.id === pl.id && r.lv === 5 && r.ri === 0).keys, ta = Object.values(a).reduce((x, y) => x + y, 0), tb = Object.values(b).reduce((x, y) => x + y, 0);
  for (const k of pl.pool) { const pa = (a[k] || 0) / ta, pb = (b[k] || 0) / tb, p = (pa + pb) / 2; ok(Math.abs(pa - pb) <= 4 * Math.sqrt(p * (1 - p) * (1 / ta + 1 / tb)) + 0.01, `${pl.name}: ${k} 비율이 부위로 바뀜(${pa.toFixed(3)} · ${pb.toFixed(3)} · 종자 ${ta} · ${tb})`); }   // 표본 수에 맞춘 4σ(위험한 행성은 부위 1의 성공이 30%라 종자가 적음)
  pl.regions.forEach((R, ri) => {
    if (!ri || R.need > 3) return;
    const A = rows.find(r => r.id === pl.id && r.lv === 3 && r.ri === ri), B = rows.find(r => r.id === pl.id && r.lv === 5 && r.ri === ri);
    for (const k of new Set(R.pool)) { const pa = (A.keys[k] || 0) / A.nSeed, pb = (B.keys[k] || 0) / B.nSeed, p = (pa + pb) / 2; ok(Math.abs(pa - pb) <= 4 * Math.sqrt(p * (1 - p) * (1 / A.nSeed + 1 / B.nSeed)) + 0.01, `${pl.name} ${R.name}: ${k} 비율이 부위로 바뀜(${pa.toFixed(3)} · ${pb.toFixed(3)})`); }
  });
}
// 개체값: 생기 0 · 2 행성 × 종자 보관함 1 · 5
const iv = {};
for (const [id, vlt] of [['ex_calisto', 1], ['ex_calisto', 5], ['ex_mirdin', 1], ['ex_mirdin', 5]]) {
  const s = fresh(1), rng = makeRng(99); s.probe.lv.vault = vlt; let t = 0, n = 0;
  for (let i = 0; i < 1500; i++) { s.items.fuel = 9; s.wallet.credits = 1e6; s.seeds.length = 0; explore(s, id, rng, 0); if (s.seeds.length) { t += ivAvg(s, rng); n++; } }
  iv[id + vlt] = t / n;
}
ok(iv.ex_calisto1 < iv.ex_calisto5 && iv.ex_calisto5 < iv.ex_mirdin5 && iv.ex_mirdin1 < iv.ex_mirdin5, '개체값이 생기 · 종자 보관함을 따라가지 않음 ' + JSON.stringify(iv));
// 지역 생기: 칼리스토 마른 협곡(생기 1) > 채굴장(생기 0) — 종자 보관함 1 · 탐사 장치 2
{
  const s = fresh(1), rng = makeRng(99); s.probe.lv.scanner = 2; let t = 0, n = 0;
  for (let i = 0; i < 1500; i++) { s.items.fuel = 9; s.wallet.credits = 1e6; s.seeds.length = 0; explore(s, 'ex_calisto', rng, 0, 'canyon'); if (s.seeds.length) { t += ivAvg(s, rng); n++; } }
  iv.canyon1 = t / n;
  ok(iv.ex_calisto1 + 0.5 < iv.canyon1, `지역 생기가 개체값을 안 올림(채굴장 ${iv.ex_calisto1.toFixed(2)} · 마른 협곡 ${iv.canyon1.toFixed(2)})`);
}
// 필수 · 권장 단계: 필수 = 연료 탱크 = 궤도 · 탐사 장치 = 지역 단계 · 권장 내구성 1~5(위험할수록 높음) · 권장을 채우면 95% · 모자란 단계마다 −20%p(30% 아래로 안 감) · 모자라도 갈 수 있음
for (const pl of PLANETS) pl.regions.forEach(R => {
  const s = fresh(5), O = exploreOdds(s, pl, R.id), Z = regionOf(pl, R.id), tag = `${pl.name} ${R.name}`;
  ok(O.req.tank === pl.orbit && O.req.scanner === R.need, `${tag}: 필수 단계 ${JSON.stringify(O.req)}`);
  ok(O.rec.hull >= 1 && O.rec.hull <= PROBE.hull.max, `${tag}: 권장 내구성 ${O.rec.hull}`);
  ok(O.ok === 0.95, `${tag}: 권장을 채웠는데 ${O.ok}`);
  for (const B of pl.regions) { const b = regionOf(pl, B.id); if (Z.hazard < b.hazard) ok(O.rec.hull <= exploreOdds(s, pl, B.id).rec.hull, `${tag}: 위험이 낮은데 권장 내구성이 더 높음`); }
  const w = fresh(1); w.probe.lv.tank = 4; w.probe.lv.scanner = 5; const Ow = exploreOdds(w, pl, R.id), short = Math.max(0, Ow.rec.hull - 1);
  ok(Math.abs(Ow.ok - Math.max(0.3, 0.95 - 0.2 * short)) < 1e-9, `${tag}: 내구성 1 · 모자람 ${short}단계인데 ${Ow.ok}`);
  w.items.fuel = 3; w.wallet.credits = 1e6; let went = true; try { explore(w, pl.id, makeRng(5), 0, R.id); } catch (e) { went = false; }
  ok(went, `${tag}: 필수만 채웠는데(권장 내구성 ${Ow.rec.hull} · 지금 1) 못 감`);
});
// 막힘
{
  const s = fresh(1), rng = makeRng(3), far = PLANETS.find(p => p.orbit === 2); s.probe.lv.tank = 1;
  const tryE = (id, m) => { try { explore(s, id, rng, 0); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err, m + ' ' + e.message); } };
  tryE(far.id, '연료 탱크 1단계로 2궤도');
  s.wallet.credits = 10; tryE('ex_ermias', '탐사비 모자람');
  s.wallet.credits = 1000; s.items.fuel = 0; tryE('ex_ermias', '연료 캡슐 없음');
  s.items.fuel = 3;
  s.items.parts = 0; try { upgradeProbe(s, 'tank'); ok(false, '부품 없이 강화'); } catch (e) { ok(e instanceof Err, '부품 없이 강화 막힘'); }
  s.items.parts = 50; s.wallet.credits = 5000; const up = upgradeProbe(s, 'hull'); ok(up.lv === 2 && s.probe.lv.hull === 2, '내구성 강화');
  // 잠긴 지역(탐사 장치 1단계로 2단계 지역): 막히고 캡슐 · 돈을 쓰지 않음
  s.items.fuel = 3; s.wallet.credits = 1000; s.probe.lv.scanner = 1;
  try { explore(s, 'ex_ermias', rng, 0, 'brook'); ok(false, '잠긴 지역 — 막혀야 함'); } catch (e) { ok(e instanceof Err && e.message === '탐사 장치 2단계가 필요해요', '잠긴 지역 ' + e.message); }
  ok(s.items.fuel === 3 && s.wallet.credits === 1000, '잠긴 지역인데 캡슐 · 돈을 씀');
  // 화면 요청(ops): 지역 id(글자)를 넘김 · 없으면 첫 곳 · 글자가 아니면 막힘
  s.probe.lv.scanner = 2;
  ok(OPS.explore(s, { planet: 'ex_ermias', region: 'brook' }, { rng, now: 0 }).region === 'brook', 'ops: 지역 전달');
  ok(OPS.explore(s, { planet: 'ex_ermias' }, { rng, now: 0 }).region === 'grove', 'ops: 지역 없으면 첫 곳');
  try { OPS.explore(s, { planet: 'ex_ermias', region: 5 }, { rng, now: 0 }); ok(false, 'ops: 숫자 지역 — 막혀야 함'); } catch (e) { ok(e instanceof Err, 'ops: 숫자 지역 막힘'); }
}
const pct = x => (x * 100).toFixed(0) + '%';
console.log('부위 | 행성(위험 · 권장 내구성) | 성공 | 돈 돌려받음 | 부품 | 종자');
for (const r of rows.filter(r => r.lv !== 3 && r.ri === 0)) console.log(`  ${r.lv} | ${r.name}(${r.hz} · ${r.hull}) | ${pct(r.okP)} | ${r.ret.toFixed(2)}배 | ${r.parts.toFixed(2)} | ${r.seeds.toFixed(2)}`);
console.log('지역(부위 5) · 위험 · 권장 내구성 | 성공 | 돈 돌려받음 | 부품 | 종자 | 귀한 보상(칸마다)');
for (const r of rows.filter(r => r.lv === 5)) console.log(`  ${r.name} ${r.area}(${r.hz} · ${r.hull}) | ${pct(r.okP)} | ${r.ret.toFixed(2)}배 | ${r.parts.toFixed(2)} | ${r.seeds.toFixed(2)} | ${pct(r.gem)}`);
console.log('개체값 평균(0~10):', Object.entries(iv).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · '));
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
