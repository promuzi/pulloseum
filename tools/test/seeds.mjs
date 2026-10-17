// 종자 시험(2026-10-18 사용자 "종자가 엄청 많이 얻을 수 있는 거 같은데 · 같은 식물 종자는 거름으로 · 너무 많아지면 관리가 어려울 듯 ·
//  열매로 종자 나오는 거 확률 많이 낮추거나 빼자 · 가방 한도도 만들되 넉넉히 · 꽉 찼을 때 막을 방법 · 키운 식물은 거름 기능 없애자 — 투자한 돈의 몇 % 돌려주거나 해체 시 좋은 거"):
//  ① 열매 종자 무게 ② 가방 한도 · 넘친 보통 종자는 그 자리에서 팔림 · 특별 종자는 넘어도 들어옴 ③ 상점 종자는 꽉 차면 못 삼
//  ④ 종자 거름(같은 종 · 고른 개체값 게이지 · 높을수록 비쌈 · 최대에서 멈춤) ⑤ 식물 통째 거름 없음 ⑥ 팔기 = 들인 것 50% · 해체 = 들인 만큼 더
//   node tools/test/seeds.mjs
import { newGame, makePlant, seedOf, addSeed, couponGive, buy, seedFeed, sell, sellPrice, dismantle, seedPrice, SEED_MAX, Err } from '../../v2/src/game/logic.js';
import { HARVEST_TABLE, IV_MAX } from '../../v2/src/game/catalog.js';
import { runOp, OPS } from '../../v2/src/game/ops.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const throws = (f, m) => { try { f(); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err, m + ' — 다른 오류: ' + e.message); } };
const game = () => newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(3), 0);
const fill = (s, n, key = 'aqua') => { const rng = makeRng(9); while (s.seeds.length < n) s.seeds.push(seedOf(s, key, rng)); };

// ① 열매 종자 무게 4 → 1(열매 하나에 약 1%)
{
  const w = HARVEST_TABLE.find(e => e.kind === 'seed').w, all = HARVEST_TABLE.reduce((a, e) => a + e.w, 0);
  ok(w === 1 && w / all < 0.012, `열매 종자 ${w}/${all}`);
}
// ② 가방 한도 · 넘침
{
  const s = game(); fill(s, SEED_MAX);
  ok(SEED_MAX === 50, '종자 가방 50');
  const c0 = s.wallet.credits, sd = seedOf(s, 'thorn', makeRng(1)), r = addSeed(s, sd);
  ok(s.seeds.length === SEED_MAX && r && r.sold === seedPrice(sd) && s.wallet.credits === c0 + seedPrice(sd), '꽉 차면 보통 종자 = 팔림');
  const leg = { ...seedOf(s, 'thorn', makeRng(2)), legend: true };
  ok(addSeed(s, leg) === null && s.seeds.length === SEED_MAX + 1, '전설 종자는 넘어도 들어옴');
  const mut = { ...seedOf(s, 'thorn', makeRng(3)), form: 'toxic' };
  ok(addSeed(s, mut) === null && s.seeds.length === SEED_MAX + 2, '변이 종자도');
  const got = couponGive(s, { seeds: ['common'] }, makeRng(4));
  ok(got[0].kind === 'seed' && got[0].sold > 0 && s.seeds.length === SEED_MAX + 2, '쿠폰 종자도 꽉 차면 팔림(받은 것 판에 sold): ' + JSON.stringify(got[0].sold));
  const s2 = game(); fill(s2, 10);
  ok(addSeed(s2, seedOf(s2, 'thorn', makeRng(5))) === null && s2.seeds.length === 11, '자리가 있으면 그냥 들어옴');
}
// ③ 상점 종자 = 꽉 차면 못 삼
{
  const s = game(); fill(s, SEED_MAX); s.wallet.credits = 9999;
  throws(() => buy(s, 'seed_common', makeRng(1)), '꽉 차면 종자 꾸러미 못 삼');
}
// ④ 종자 거름
{
  const s = game(), p = s.plants[0], rng = makeRng(7), mk = (key = p.key) => { const sd = seedOf(s, key, rng); s.seeds.push(sd); return sd.id; };
  p.ivs.hp = 2; p.ivp = {};
  const a = [mk(), mk()];
  let r = seedFeed(s, p.uid, 'hp', a);
  ok(p.ivs.hp === 2 && p.ivp.hp === 2 && r.used === 2 && r.need === 3, '종자 둘 = 게이지 2/3: ' + JSON.stringify(r));
  r = seedFeed(s, p.uid, 'hp', [mk()]);
  ok(p.ivs.hp === 3 && p.ivp.hp === 0 && r.to === 3, '셋째 = +1(0~4 = 종자 셋)');
  p.ivs.hp = 5; p.ivp.hp = 0;
  r = seedFeed(s, p.uid, 'hp', [mk(), mk(), mk()]);
  ok(p.ivs.hp === 5 && r.need === 4, '5~7 = 종자 넷');
  p.ivs.hp = 9; p.ivp.hp = 0;
  const many = [mk(), mk(), mk(), mk(), mk(), mk(), mk()], n0 = s.seeds.length;
  r = seedFeed(s, p.uid, 'hp', many);
  ok(p.ivs.hp === IV_MAX && r.used === 5 && s.seeds.length === n0 - 5, '9 → 10 = 종자 다섯 · 남는 종자는 가방에: ' + JSON.stringify(r));
  throws(() => seedFeed(s, p.uid, 'hp', [mk()]), '최대면 막힘');
  throws(() => seedFeed(s, p.uid, 'atk', [mk('thorn')]), '다른 식물 종자 = 막힘');
  throws(() => seedFeed(s, p.uid, 'atk', ['nope']), '없는 종자 = 막힘');
  throws(() => seedFeed(s, p.uid, 'luck', [mk()]), '모르는 개체값 = 막힘');
  const before = p.ivs.atk;
  runOp(s, 'seedFeed', { id: p.uid, stat: 'atk', seeds: [mk(), mk(), mk()] }, { rng: makeRng(1), now: 0 });
  ok(p.ivs.atk === Math.min(IV_MAX, before + 1) || before >= 5, '서버 일 목록(ops seedFeed)');
}
// ⑤ 식물 통째 거름 없음
{
  ok(!OPS.merge, '옛 거름(merge) 일 없음');
}
// ⑥ 팔기 = 기본값 + 들인 것 50% · 해체 = 들인 만큼 더
{
  const s = game(), p = makePlant(s, { key: 'aqua' }, makeRng(2), 0); s.plants.push(p);
  const base = sellPrice(p); p.invest = 1000;
  ok(sellPrice(p) === base + 500, `팔기 = 들인 것 50%: ${base} → ${sellPrice(p)}`);
  const cnt = inv => { const t = game(), q = makePlant(t, { key: 'aqua' }, makeRng(2), 0); t.plants.push(q); q.invest = inv; return dismantle(t, q.uid, makeRng(11)).got.length; };
  ok(cnt(3000) >= cnt(0) + 3, `해체 = 들인 만큼 더: ${cnt(0)} → ${cnt(3000)}`);
  sell(s, p.uid);
}
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
