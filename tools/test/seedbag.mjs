// 종자 가방 시험(2026-10-23 — 사용자 "꾹눌러 선택모드로 바껴서 판매" · "별 수에 따라서 효과나 차이점"):
//  ① 별(잠재력)이 높을수록 비싸게(별 하나마다 +25%, 전설은 늘 별 다섯이라 따로 안 곱함) ② 여러 종자 한 번에 팔기(잠긴 · 없는 종자는 건너뜀, 하나도 못 팔면 막힘) ③ 작업 이름으로도
//   node tools/test/seedbag.mjs
import { newGame, seedOf, seedPrice, seedStarMul, sellSeeds, potOf, Err } from '../../v2/src/game/logic.js';
import { SELL_BASE, SPECIES } from '../../v2/src/game/catalog.js';
import { runOp } from '../../v2/src/game/ops.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const throws = (f, m, want) => { try { f(); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err && (!want || e.message.includes(want)), m + ' — ' + e.message); } };
const game = () => newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(3), 0);

// ① 별에 따른 값
{
  const base = SELL_BASE[SPECIES.thorn.rarity] * 0.5, mk = pot => ({ id: 'x' + pot, key: 'thorn', pot });
  ok([1, 2, 3, 4, 5].every(p => potOf(mk(p)) === p), '별 = pot');
  ok([1, 2, 3, 4, 5].map(p => seedPrice(mk(p))).join() === [1, 1.25, 1.5, 1.75, 2].map(m => Math.round(base * m)).join(), '별 하나마다 +25% · 다섯 = 두 배');
  ok(seedStarMul({ id: 'l', key: 'thorn', legend: true }) === 1 && seedPrice({ id: 'l', key: 'thorn', legend: true }) === Math.round(base * 8), '전설 = 8배 그대로(별로 안 곱함)');
  ok(seedPrice({ id: 's', key: 'thorn', shiny: true, pot: 5 }) === Math.round(base * 4 * 2), '색 변종 · 별 다섯 = 4배 × 2');
}
// ② 여러 개 팔기
{
  const s = game(), rng = makeRng(5); s.seeds = [];
  for (let i = 0; i < 5; i++) s.seeds.push(seedOf(s, 'aqua', rng));
  s.seeds[1].lock = true;
  const ids = s.seeds.map(sd => sd.id), want = s.seeds.filter(sd => !sd.lock).reduce((a, sd) => a + seedPrice(sd), 0), c0 = s.wallet.credits;
  const r = sellSeeds(s, [...ids, ids[0], 'none']);
  ok(r.n === 4 && r.credits === want && s.wallet.credits === c0 + want, `팔림 4 · 돈 +${want}`);
  ok(s.seeds.length === 1 && s.seeds[0].lock, '잠긴 종자만 남음');
  throws(() => sellSeeds(s, [s.seeds[0].id]), '잠긴 것만 = 막힘', '팔 수 있는');
  throws(() => sellSeeds(s, []), '빈 목록 = 막힘', '골라');
}
// ③ 작업(서버 · 화면 공용)
{
  const s = game(), rng = makeRng(7); s.seeds = [seedOf(s, 'thorn', rng), seedOf(s, 'thorn', rng)];
  const r = runOp(s, 'sellSeeds', { seeds: s.seeds.map(sd => sd.id) }, { rng: makeRng(1), now: 0 });
  ok(r && r.n === 2 && s.seeds.length === 0, 'ops sellSeeds');
  try { runOp(s, 'sellSeeds', { seeds: [123] }, { rng: makeRng(1), now: 0 }); ok(false, '숫자 아이디 막혀야 함'); } catch (e) { ok(e instanceof Err, 'ops: 문자열 아이디만'); }
}
console.log(fails ? `종자 가방 시험 실패 ${fails}/${n}` : `종자 가방 시험 ${n}개 통과`);
process.exit(fails ? 1 : 0);
