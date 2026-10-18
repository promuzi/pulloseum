// 상태 효과 시험(화면 없이): 규칙 하나하나 + 같은 씨앗 → 같은 결과 + 12종 1:1 돌려 보기(효과 있음/없음 비교)
//   node tools/test/status.mjs [--games 40]
import { makeUnit, makeBattle, playTurn, aiPick, kitOf, REST } from '../../v2/src/battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats } from '../../v2/src/battle/team.js';
import { resolveTurn, makeRng } from '../../v2/src/battle/rules.js';
import { apply, onHit, endTurn, expire, listOf, canUse, effSpd, mustSkip, clearOnSwitch, selfBuff, shockRoll, RULES_FX } from '../../v2/src/battle/status.js';
import { SPECIES } from '../../v2/src/data/mock.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const mk = (id, k, o = {}) => makeUnit(id, SPECIES[k], { key: k, ...protoStats(SPECIES[k]), ...o });
const ctx = (by, turn = 1, ev = []) => ({ turn, rng: makeRng(1), ev, by });
const sk = (u, id) => u.kit.find(s => s.id === id);
// 판정을 고정하는 굴림: 0 → 표의 맨 앞(빗나감), 0.999 → 맨 뒤(치명)
const fixed = v => () => v;

// ── 1. 걸리는 조건 ──
{
  const a = mk('me', 'cactus_fire'), b = mk('foe', 'flower_grass');
  const ev = [], r = resolveTurn(a, b, sk(a, 's1'), b.kit[0], () => 0.0001, { turn: 1 });   // 굴림 0 → 빗나감
  ok(r.events.some(e => e.t === 'hit' && e.tier === 'miss') && !b.eff.burn, '빗나가면 안 걸림');
  const a2 = mk('me', 'cactus_fire'), b2 = mk('foe', 'flower_grass');
  b2.st = { miss: {}, init: 5, critTaken: false, nextInit: 0, nextCrit: 0, lastStance: null };   // 상대 선공 불운 보정 → 내가 선공 아님 쪽으로
  const r2 = resolveTurn(a2, b2, sk(a2, 's1'), sk(b2, 'guard'), fixed(0.5), { turn: 1 });
  const hit = r2.events.find(e => e.t === 'hit');
  ok(hit && hit.tier !== 'miss' && b2.eff.burn, '정타면 화상');
  ok(!r2.events.some(e => e.t === 'fx' && e.n > 1), '치명이라고 더 쌓이지 않음(쌓는 효과 아님)');
}
{ // 방어 자세여도 걸림: 후공 방어가 성립한 상태에서 맞아도 화상
  const a = mk('me', 'cactus_fire', { spd: 99 }), b = mk('foe', 'flower_grass', { spd: 1 });
  const r = resolveTurn(a, b, sk(a, 's1'), sk(b, 'guard'), fixed(0.5), { turn: 1 });
  const hit = r.events.find(e => e.t === 'hit');
  ok(hit && hit.guard && b.eff.burn, '방어 자세로 막아도 걸림');
}
{ // 치명이어도 1겹(독)
  const a = mk('me', 'thorn'), b = mk('foe', 'aqua');
  a.crit = 50;
  resolveTurn(a, b, sk(a, 's1'), b.kit[0], fixed(0.999), { turn: 1 });
  ok(b.eff.poison && b.eff.poison.n === 1, '치명이어도 독 1겹');
}
// ── 2. 같은 속성 ──
{
  const a = mk('me', 'cactus_fire'), b = mk('foe', 'flower_fire'), ev = [];
  apply(b, 'burn', 1, ctx(a, 1, ev));
  ok(!b.eff.burn && ev.some(e => e.t === 'immune'), '불 식물은 화상 안 걸림');
  const w = mk('foe', 'aqua'); apply(w, 'wet', 1, ctx(a, 1, []));
  ok(!w.eff.wet, '물 식물은 젖음 안 걸림');
  const s = mk('foe', 'spark'); apply(s, 'shock', 1, ctx(a, 1, []));
  ok(!s.eff.shock, '번개 식물은 감전 안 걸림');
}
// ── 3. 독: 5겹까지 · 2턴 넘게 안 걸리면 턴마다 1겹씩 ──
{
  const a = mk('me', 'thorn'), b = mk('foe', 'aqua');
  for (let t = 1; t <= 7; t++) apply(b, 'poison', 1, ctx(a, t, []));
  ok(b.eff.poison.n === 5, '독 5겹이 끝');
  const hp0 = b.hp, ev = [];
  endTurn([[b, a]], 7, ev);   // 걸린 턴 = 7 → 안 줄어듦
  ok(hp0 - b.hp === Math.round(b.max * 0.02 * 5) && b.eff.poison.n === 5, '독 5겹 = 최대 체력 10%, 걸린 턴엔 안 줄어듦');
  endTurn([[b, a]], 8, []);
  ok(b.eff.poison.n === 5, '1턴 안 걸림 → 그대로');
  endTurn([[b, a]], 9, []);
  ok(b.eff.poison.n === 4, '2턴 안 걸림 → 1겹 줄어듦');
  endTurn([[b, a]], 10, []);
  ok(b.eff.poison.n === 3, '그 뒤 턴마다 1겹씩');
  apply(b, 'poison', 1, ctx(a, 11, []));
  endTurn([[b, a]], 11, []); endTurn([[b, a]], 12, []);
  ok(b.eff.poison.n === 4, '다시 걸리면 줄어듦 멈춤');
}
// ── 4. 화상: 턴 끝 3번 5% · 물에 맞으면 꺼짐 · 다시 걸리면 새로 ──
{
  const a = mk('me', 'cactus_fire'), b = mk('foe', 'gaia');
  apply(b, 'burn', 1, ctx(a, 1, []));
  let hits = 0, t = 1; const hp0 = b.hp;
  while (b.eff.burn && t < 9) { endTurn([[b, a]], t, []); hits++; t++; }
  ok(hits === 3 && hp0 - b.hp === 3 * Math.round(b.max * 0.04), '화상 = 턴 끝 3번, 4%씩');
  apply(b, 'burn', 1, ctx(a, 5, [])); endTurn([[b, a]], 5, []); apply(b, 'burn', 1, ctx(a, 6, []));
  ok(b.eff.burn.left === 3, '다시 걸리면 처음 길이로');
  const ev = []; onHit(mk('me', 'aqua'), b, sk(mk('me', 'aqua'), 's1'), { turn: 6, rng: makeRng(1), ev });
  ok(!b.eff.burn && ev.some(e => e.t === 'cure' && e.why === 'water') && b.eff.wet, '물에 맞으면 화상 꺼짐(젖음은 걸림)');
}
// ── 5. 젖음·빙결·감전 ──
{
  const a = mk('me', 'vine_wind'), b = mk('foe', 'gaia');
  const s0 = effSpd(b);
  apply(b, 'wet', 1, ctx(a, 1, []));
  ok(Math.abs(effSpd(b) - s0 * 0.8) < 1e-9, '젖음 = 기동성 −20%');
  // 회피 자세 = 상대와 기동을 견줌(같은 기동이면 그대로, 느려지면 덜, 빠르면 더)
  const evT = (u, attSpd) => resolveTurn(mk('me', 'flower_grass', { spd: attSpd }), u, mk('me', 'flower_grass').kit[0], sk(u, 'evade'), fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').table;
  const ev0 = mk('foe', 'gaia'), same = evT(ev0, ev0.spd), wetU = mk('foe', 'gaia'); apply(wetU, 'wet', 1, ctx(a, 1, []));
  ok(evT(wetU, ev0.spd).miss < same.miss, `젖으면 회피 자세가 덜 됨(빗나감 칸 ${same.miss} → ${evT(wetU, ev0.spd).miss})`);
  ok(evT(mk('foe', 'gaia'), 10).miss > same.miss && evT(mk('foe', 'gaia'), 60).miss < same.miss, '상대보다 빠르면 더 잘 피하고 느리면 덜 피함');
  // 젖음 = 적중 ↓ · 방어 ↓ 도
  const hitOf = (att, def) => resolveTurn(att, def, att.kit[0], REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit');
  const wa = mk('me', 'gaia'); apply(wa, 'wet', 1, ctx(b, 1, []));
  ok(hitOf(wa, mk('foe', 'aqua')).table.miss === hitOf(mk('me', 'gaia'), mk('foe', 'aqua')).table.miss + 8, '젖으면 내 공격 빗나감 칸 +8');
  const wd = mk('foe', 'flower_fire'); apply(wd, 'wet', 1, ctx(a, 1, []));
  ok(hitOf(mk('me', 'gaia'), wd).dmg > hitOf(mk('me', 'gaia'), mk('foe', 'flower_fire')).dmg, '젖으면 방어 ↓(받는 피해 ↑)');
  apply(b, 'chill', 1, ctx(a, 1, []));
  ok(b.eff.chill.n === 2, '젖은 상대 = 빙결 하나 더');
  ok(Math.abs(effSpd(b) - s0 * 0.8 * 0.8) < 1e-9, '빙결 = 기동성 −20%(쌓인 수와 무관)');
  apply(b, 'chill', 1, ctx(a, 1, []));
  ok(!b.eff.chill && mustSkip(b) && b.eff.frozen, '빙결 3 → 얼음(쉼) · 0으로');
  const c = mk('foe', 'flower_grass');
  // 감전 = 확률형(2026-10-18): 걸려도 바로 쉬지 않음 · 자기 차례 굴림이 25%(젖으면 50%) 아래면 마비 → 감전 풀림 · 버팀 중엔 안 굴림
  apply(c, 'shock', 1, ctx(a, 1, []));
  ok(c.eff.shock && !mustSkip(c), '감전 = 걸려도 바로 안 쉼');
  const r = v => ({ turn: 1, rng: () => v, ev: [] });
  ok(!shockRoll(c, r(0.3)) && c.eff.shock, '감전 굴림 0.3 = 안 걸림(25%)');
  c.eff.wet = { exp: 9 };
  ok(shockRoll(c, r(0.4)) && !c.eff.shock && c.eff.skip && c.eff.skip.src === 'paral', '젖으면 50% — 굴림 0.4 = 마비 · 감전 풀림');
  delete c.eff.wet; delete c.eff.skip; c.eff.brace = { exp: 2 }; apply(c, 'shock', 1, ctx(a, 1, []));
  ok(!shockRoll(c, r(0)) && c.eff.shock, '버팀(쉰 다음 턴)엔 안 굴림');
  delete c.eff.brace; delete c.eff.shock;
  const d = mk('foe', 'flower_grass');
  apply(d, 'chill', 1, ctx(a, 1, [])); endTurn([[d, a]], 1, []); endTurn([[d, a]], 2, []); ok(d.eff.chill && d.eff.chill.n === 1, '빙결 1턴 안 쌓임 → 그대로'); endTurn([[d, a]], 3, []);
  ok(d.eff.chill === undefined || d.eff.chill.n < 1, '빙결도 2턴 안 쌓이면 줄어듦');
  const f = mk('foe', 'flower_grass');   // 불에 맞으면 젖음·빙결·얼음 녹음(쉬기도 풀림)
  apply(f, 'wet', 1, ctx(a, 1, [])); apply(f, 'chill', 2, ctx(a, 1, []));
  ok(mustSkip(f), '젖음 + 칼바람(2) = 바로 얼음');
  const fe = []; onHit(mk('me', 'cactus_fire'), f, sk(mk('me', 'cactus_fire'), 's1'), { turn: 1, rng: makeRng(1), ev: fe });
  ok(!f.eff.wet && !f.eff.frozen && !mustSkip(f) && f.eff.burn, '불에 맞으면 얼음·젖음 녹고 화상');
}
// ── 6. 쉬는 시점 · 에너지 돌려받음 · 버팀 ──
{ // 선공이 기절시킴 → 후공의 이번 행동 취소 + 에너지 환불
  const B = makeBattle({ me: mk('me', 'gaia', { spd: 99 }), foe: mk('foe', 'flower_grass', { spd: 1 }), seed: 3 });
  B.me.energy = 8; B.foe.energy = 8;
  const foeS = sk(B.foe, 's2'), r = resolveTurn(B.me, B.foe, sk(B.me, 's2'), foeS, fixed(0.5), { turn: 1 });
  const sk1 = r.events.find(e => e.t === 'skip');
  ok(sk1 && sk1.who === 'foe' && sk1.refund === foeS.cost, '선공이 기절 → 후공 이번 행동 취소, 쓴 에너지 돌려받음');
  ok(!r.events.some(e => e.t === 'hit' && e.who === 'foe'), '취소된 쪽은 공격 안 함');
  ok(B.foe.eff.brace, '쉬고 나면 버팀');
  const ev = []; apply(B.foe, 'stun', 1, ctx(B.me, 1, ev));
  ok(!mustSkip(B.foe) && ev.some(e => e.t === 'resist'), '버팀 중에는 기절 안 걸림');
  expire(B.foe, 1, []); ok(B.foe.eff.brace, '버팀은 다음 턴까지');
  expire(B.foe, 2, []); ok(!B.foe.eff.brace, '그다음 턴 끝에 사라짐');
}
{ // 후공이 기절시킴 → 선공은 이미 움직였으니 다음 턴 쉼
  const me = mk('me', 'flower_grass', { spd: 99 }), foe = mk('foe', 'gaia', { spd: 1 });
  foe.energy = 8;
  const r = resolveTurn(me, foe, me.kit[0], sk(foe, 's2'), fixed(0.5), { turn: 1 });
  ok(r.events.some(e => e.t === 'hit' && e.who === 'me') && mustSkip(me), '후공이 기절 → 다음 턴 쉼');
  const r2 = resolveTurn(me, foe, REST, foe.kit[0], fixed(0.5), { turn: 2 });
  ok(r2.events.some(e => e.t === 'skip' && e.who === 'me' && e.refund === 0) && !mustSkip(me), '다음 턴에 쉼(쉬기 = 에너지 0)');
}
// ── 7. 기생 씨앗 · 그늘 · 덩굴 · 도발 · 뿌리 · 약화 · 부식 · 강풍 ──
{
  const a = mk('me', 'vine_water'), b = mk('foe', 'gaia');
  a.hp = 100;
  apply(b, 'leech', 1, ctx(a, 1, []));
  const ev = []; endTurn([[b, a]], 1, ev);
  const d = ev.find(e => e.t === 'drain');
  ok(d && d.dmg === Math.round(b.max * 0.025) && a.hp === 100 + d.dmg, '기생 씨앗 = 2.5% 빨아 건너편 회복');
  apply(a, 'burn', 1, ctx(b, 2, [])); const hpA = a.hp; endTurn([[b, a]], 2, []);
  ok(a.hp - hpA === Math.round(Math.round(b.max * 0.025) * 0.5), '화상이면 회복 절반');
  endTurn([[b, a]], 3, []); ok(!b.eff.leech, '기생 씨앗 3번 뒤 사라짐');
}
{
  const B = makeBattle({ me: mk('me', 'spore_cap'), foe: mk('foe', 'aqua'), seed: 5 });
  apply(B.foe, 'shade', 1, ctx(B.me, 1, []));
  const e0 = B.foe.energy, t = playTurn(B, B.me.kit[1]);
  ok(B.foe.energy <= e0 && t.events.some(e => e.t === 'noEnergy' && e.who === 'foe'), '그늘 = 그 턴 끝 에너지 안 참');
  ok(!B.foe.eff.shade, '그늘은 한 번 뒤 사라짐');
}
{
  const a = mk('me', 'flower_grass'), b = mk('foe', 'gaia');
  b.energy = 4; apply(b, 'bind', 1, ctx(a, 1, []));
  const locked = b.kit.find(s => s.id === b.eff.bind.skill);
  ok(locked && !canUse(b, locked) && (locked.cost || 0) <= 5, '덩굴 = 다음 턴에 쓸 수 있을 기술 하나 묶음');
  expire(b, 1, []); ok(b.eff.bind, '걸린 턴 끝엔 남음'); expire(b, 2, []); ok(!b.eff.bind, '다음 턴 끝에 풀림');
  apply(b, 'taunt', 1, ctx(a, 3, []));
  ok(!canUse(b, sk(b, 'guard')) && !canUse(b, sk(b, 'evade')) && canUse(b, b.kit[0]), '도발 = 방어·회피 자세 못 씀');
}
{
  const a = mk('me', 'gaia'), b = mk('foe', 'aqua'), base = { ...a }, b0 = { ...b };
  const dmg = (x, y) => { const xx = mk('me', x.key), yy = mk('foe', y.key); Object.assign(xx.eff, x.eff); Object.assign(yy.eff, y.eff); const r = resolveTurn(xx, yy, xx.kit[0], REST, fixed(0.5), { turn: 1 }); return (r.events.find(e => e.t === 'hit') || {}).dmg; };
  const plain = dmg(a, b);
  apply(a, 'weak', 1, ctx(b, 1, []));
  const weak = dmg(a, b);
  ok(weak < plain, `약화 = 공격 ↓ (${plain} → ${weak})`);
  a.eff = {}; apply(b, 'corrode', 1, ctx(a, 1, []));
  ok(dmg(a, b) > plain, '부식 = 방어 ↓');
  const p = mk('me', 'gaia'); apply(p, 'gale', 1, ctx(b, 1, []));
  const t0 = resolveTurn(mk('me', 'gaia'), mk('foe', 'aqua'), sk(p, 's1'), REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').table;
  const t1 = resolveTurn(p, mk('foe', 'aqua'), sk(p, 's1'), REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').table;
  ok(t1.miss === t0.miss + 12, '강풍 = 빗나감 칸 +12');
}
// ── 8. 3:3: 교체하면 독·화상만 · 뿌리 묶기면 교체 못 함 ──
{
  const me = ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe = ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k));
  const B = makeTeamBattle({ me, foe, seed: 9 });
  apply(B.me, 'poison', 1, ctx(B.foe, 1, [])); apply(B.me, 'burn', 1, ctx(B.foe, 1, [])); apply(B.me, 'wet', 1, ctx(B.foe, 1, [])); apply(B.me, 'leech', 1, ctx(B.foe, 1, []));
  const out = B.me;
  playTurn3(B, { kind: 'switch', to: 1 });
  ok(B.me !== out && out.eff.poison && out.eff.burn && !out.eff.wet && !out.eff.leech, '교체로 나가면 독·화상만 남음');
  apply(B.me, 'root', 1, ctx(B.foe, B.turn, []));
  const cur = B.me; playTurn3(B, { kind: 'switch', to: 2 });
  ok(B.me === cur || B.me.hp <= 0, '뿌리 묶기면 교체 안 됨');
}
{ // 3:3 쉬는 차례엔 교체도 못 함(사용자 2026-10-15) — 고른 교체는 무시되고 그 턴은 쉼
  const me = ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe = ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k));
  const B = makeTeamBattle({ me, foe, seed: 12 });
  apply(B.me, 'stun', 1, ctx(B.foe, 1, []));
  const cur = B.me, t = playTurn3(B, { kind: 'switch', to: 1 });
  ok(B.me === cur && t.events.some(e => e.t === 'skip' && e.who === 'me'), '쉬는 차례엔 교체 안 되고 그 턴 쉼');
}
// ── 9. 포자(버섯 종): 턴 끝마다 자라 3이면 피어남(10% + 에너지 안 참) · 불에 탐 · 버섯은 안 걸림 ──
{
  const a = mk('me', 'spore_cap'), b = mk('foe', 'gaia');
  apply(b, 'spore', 1, ctx(a, 1, []));
  ok(b.eff.spore.n === 1, '포자 1');
  endTurn([[b, a]], 1, []);
  ok(b.eff.spore.n === 1, '붙은 턴 끝엔 안 자람');
  const ev1 = []; endTurn([[b, a]], 2, ev1);
  ok(b.eff.spore && b.eff.spore.n === 2 && ev1.some(e => e.t === 'grow'), '다음 턴 끝부터 스스로 자람(2)');
  const hp0 = b.hp, ev2 = []; endTurn([[b, a]], 3, ev2);
  ok(!b.eff.spore && hp0 - b.hp === Math.round(b.max * 0.08) && ev2.some(e => e.t === 'bloom') && b.eff.choke, '3이면 피어남: 8% 피해 + 숨막힘');
  const B = makeBattle({ me: mk('me', 'spore_cap'), foe: mk('foe', 'gaia'), seed: 4 });
  apply(B.foe, 'spore', 3, ctx(B.me, 1, []));
  const tt = playTurn(B, B.me.kit[1]);
  ok(tt.events.some(e => e.t === 'noEnergy' && e.who === 'foe' && e.why === 'spore'), '포자가 피면 그 턴 끝 에너지 안 참');
  const c = mk('foe', 'flower_grass'); apply(c, 'spore', 1, ctx(a, 1, []));
  const fe = []; onHit(mk('me', 'cactus_fire'), c, sk(mk('me', 'cactus_fire'), 's1'), { turn: 1, rng: makeRng(1), ev: fe });
  ok(!c.eff.spore && fe.some(e => e.t === 'cure' && e.ids.includes('spore')), '불에 맞으면 포자가 탐');
  const m = mk('foe', 'spore_cap'), me2 = []; apply(m, 'spore', 1, ctx(a, 1, me2));
  ok(!m.eff.spore && me2.some(e => e.t === 'immune'), '버섯은 포자에 안 걸림');
}
// ── 9-2. 버프: 분노·철벽·가속·재생·반사·보호막·정화·집중 ──
{
  const sb = (u, id, t = 1, ev = []) => selfBuff(u, id, { turn: t, ev });
  const hitOf = (x, y, s = x.kit[0]) => resolveTurn(x, y, s, REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit');
  const plain = hitOf(mk('me', 'gaia'), mk('foe', 'aqua')).dmg;
  const r = mk('me', 'gaia'); sb(r, 'rage');
  const rd = hitOf(r, mk('foe', 'aqua')).dmg;
  ok(rd > plain, `분노 = 주는 피해 ↑ (${plain} → ${rd})`);
  const w = mk('foe', 'aqua'); sb(w, 'wall');
  const wd = hitOf(mk('me', 'gaia'), w).dmg;
  ok(wd < plain, `철벽 = 받는 피해 ↓ (${plain} → ${wd})`);
  const h = mk('me', 'gaia'), s0 = effSpd(h); sb(h, 'haste');
  ok(effSpd(h) > s0, '가속 = 기동성 ↑');
  const x = mk('foe', 'aqua');
  const g = mk('me', 'gaia'); g.hp = Math.round(g.max / 2); sb(g, 'regen');
  const ev1 = []; endTurn([[g, x]], 1, ev1);
  const rg = ev1.find(e => e.t === 'regen');
  ok(rg && rg.heal === Math.round(g.max * 0.05), '재생 = 턴 끝 5% 회복');
  endTurn([[g, x]], 2, []); endTurn([[g, x]], 3, []);
  ok(!g.eff.regen, '재생은 3번 뒤 끝');
  const g2 = mk('me', 'gaia'); g2.hp = 10; sb(g2, 'regen'); apply(g2, 'shade', 1, ctx(x, 1, []));
  const ev2 = []; endTurn([[g2, x]], 1, ev2);
  ok(!ev2.some(e => e.t === 'regen'), '그늘이면 재생 멈춤');
  const g3 = mk('me', 'gaia'); g3.hp = Math.round(g3.max / 2); sb(g3, 'regen'); apply(g3, 'burn', 1, ctx(x, 1, []));
  const ev3 = []; endTurn([[g3, x]], 1, ev3);
  ok((ev3.find(e => e.t === 'regen') || {}).heal === Math.round(g3.max * 0.05 * 0.5), '화상이면 재생 절반');
  const th = mk('foe', 'aqua'); sb(th, 'thorns');
  const att = mk('me', 'gaia'), hp0 = att.hp;
  const evT = resolveTurn(att, th, att.kit[0], REST, fixed(0.5), { turn: 1 }).events;
  const hT = evT.find(e => e.t === 'hit'), rf = evT.find(e => e.t === 'reflect');
  ok(rf && rf.dmg === Math.max(1, Math.round(hT.dmg * 0.3)) && hp0 - att.hp === rf.dmg, '반사 = 붙어서 때리면 30% 되돌림');
  const th2 = mk('foe', 'aqua'); sb(th2, 'thorns'); const att2 = mk('me', 'gaia');
  const evT2 = resolveTurn(att2, th2, { ...att2.kit[0], ranged: true }, REST, fixed(0.5), { turn: 1 }).events;
  ok(!evT2.some(e => e.t === 'reflect'), '멀리서 때리면 반사 없음');
  const sh = mk('foe', 'aqua'); sb(sh, 'shield'); const cap = sh.eff.shield.hp;
  ok(cap === Math.round(sh.max * 0.15), '보호막 = 최대 체력 15%');
  const hS = hitOf(mk('me', 'gaia'), sh);
  ok(hS.absorb === Math.min(cap, plain) && hS.dmg === plain - hS.absorb, '보호막이 먼저 막음');
  const p = mk('me', 'gaia'); apply(p, 'poison', 1, ctx(x, 1, [])); apply(p, 'wet', 1, ctx(x, 1, []));
  sb(p, 'purify');
  ok(!p.eff.poison && !p.eff.wet && p.eff.purified, '정화 = 나쁜 효과 다 지움');
  const evR = []; apply(p, 'burn', 1, ctx(x, 2, evR));
  ok(!p.eff.burn && evR.some(e => e.t === 'resist'), '정화 중엔 안 걸림');
  const f = mk('me', 'gaia'); sb(f, 'focus');
  ok(f.st.nextCrit === 25 && listOf(f).some(o => o.id === 'focus'), '집중 = 다음 공격 치명 +25');
  const tc0 = hitOf(mk('me', 'gaia'), mk('foe', 'aqua')).table, tc1 = hitOf(f, mk('foe', 'aqua')).table;
  ok(tc1.crit > tc0.crit && !f.st.nextCrit, '집중은 한 번 쓰면 사라짐');
  const bs = { id: 'x_rage', name: '불타오르기', el: 'fire', act: 'buff', self: 'rage', cost: 0, cats: ['buff'] };
  const u = mk('me', 'gaia'), evB = resolveTurn(u, mk('foe', 'aqua'), bs, REST, fixed(0.5), { turn: 1 }).events;
  ok(evB.some(e => e.t === 'cast') && u.eff.rage, '버프 기술 = 나에게 걸림');
  const u2 = mk('me', 'gaia');
  resolveTurn(u2, mk('foe', 'aqua'), { ...u2.kit[0], also: 'haste' }, REST, fixed(0.5), { turn: 1 });
  ok(u2.eff.haste, '공격 기술의 덤 버프');
}
// ── 9. 같은 씨앗 → 같은 결과 ──
const runPair = (k1, k2, seed, off = false) => {
  const strip = u => { if (off) u.kit = u.kit.map(s => ({ ...s, inflict: undefined })); return u; };
  const B = makeBattle({ me: strip(mk('me', k1)), foe: strip(mk('foe', k2)), seed });
  const pickRng = makeRng(seed * 7 + 1), stat = { skips: 0, fx: 0, dot: 0, turns: 0 };
  while (!B.over && B.turn <= 60) {
    const t = playTurn(B, aiPick(B.me, B.foe, pickRng) || B.me.kit[0]);
    for (const e of t.events) { if (e.t === 'skip') stat.skips++; if (e.t === 'fx') stat.fx++; if (e.t === 'tick' || e.t === 'drain') stat.dot += e.dmg; }
  }
  stat.turns = B.turn - 1;
  return { over: B.over || 'draw', ...stat, log: B.log.map(t => t.events.map(e => e.t + (e.dmg ?? '')).join(',')).join('|') };
};
{
  const x = runPair('spark', 'vine_water', 11), y = runPair('spark', 'vine_water', 11);
  ok(x.log === y.log, '같은 씨앗 → 같은 결과');
}
console.log(`규칙 시험 ${n}개 중 ${n - fails}개 통과`);

// ── 10. 12종 1:1 돌려 보기(같은 능력치 규칙 protoStats · 양쪽 봇) ──
const games = +(process.argv[process.argv.indexOf('--games') + 1] || 40) || 40;
const keys = Object.keys(SPECIES);
const table = (off) => {
  const res = Object.fromEntries(keys.map(k => [k, { w: 0, g: 0 }])), all = { turns: 0, skips: 0, fx: 0, dot: 0, g: 0, draw: 0 };
  for (const a of keys) for (const b of keys) if (a !== b) for (let s = 1; s <= games; s++) {
    const r = runPair(a, b, s * 131 + keys.indexOf(a) * 17 + keys.indexOf(b), off);
    res[a].g++; res[b].g++;
    if (r.over === 'win') res[a].w++; else if (r.over === 'lose') res[b].w++; else all.draw++;
    all.turns += r.turns; all.skips += r.skips; all.fx += r.fx; all.dot += r.dot; all.g++;
  }
  return { res, all };
};
const on = table(false), offT = table(true);
console.log(`\n1:1 ${keys.length}종 서로 ${games}판씩(양쪽 봇) — 효과 있음 vs 없음`);
console.log('종           승률(있음)  승률(없음)');
for (const k of keys.sort((a, b) => on.res[b].w / on.res[b].g - on.res[a].w / on.res[a].g)) console.log(`${SPECIES[k].name.padEnd(7, '　')} ${(100 * on.res[k].w / on.res[k].g).toFixed(1).padStart(6)}%   ${(100 * offT.res[k].w / offT.res[k].g).toFixed(1).padStart(6)}%`);
const A = on.all;
console.log(`판당: 평균 ${(A.turns / A.g).toFixed(1)}턴(효과 없음 ${(offT.all.turns / offT.all.g).toFixed(1)}턴) · 효과 걸림 ${(A.fx / A.g).toFixed(1)}번 · 쉰 차례 ${(A.skips / A.g).toFixed(2)}번 · 지속 피해 ${(A.dot / A.g).toFixed(0)} · 60턴 넘김 ${A.draw}판`);
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
