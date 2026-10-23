// 종 고유 기술 v2 시험(사용자와 짠 설계 — docs/superpowers/specs/2026-10-18-v2-species-skills.md 각 종 절)
//   node tools/test/species_v2.mjs
import { makeUnit } from '../../v2/src/battle/model.js';
import { protoStats } from '../../v2/src/battle/team.js';
import { resolveTurn, makeRng } from '../../v2/src/battle/rules.js';
import { endTurn, expire, canUse, has, missAddOf, atkK } from '../../v2/src/battle/status.js';
import { BASICS } from '../../v2/src/battle/model.js';
import { SPECIES } from '../../v2/src/data/mock.js';
import { SKILLS, SPECIES_V2 } from '../../v2/src/game/catalog.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const mk = (id, k, o = {}) => makeUnit(id, SPECIES[k], { key: k, ...protoStats(SPECIES[k]), energy: 8, ...o });
const B = id => BASICS.find(s => s.id === id);
const turn = (a, b, sa, sb, T, rng = () => 0.5) => { const r = resolveTurn(a, b, sa, sb, rng, { turn: T }); endTurn([[a, b], [b, a]], T, r.events); expire(a, T, r.events); expire(b, T, r.events); return r.events; };
const OTHER = { id: 'x', name: '가만히', act: 'other', cost: 0, cats: ['other'] };

// ── 10. 게일캑터 ──
ok(SPECIES_V2.has('cactus_wind'), '게일캑터 v2 켜짐');
{ // 시작의 공명 = 강풍 3턴 + 쇠약 · 새 강풍 = 공명 +1 · 부는 턴 끝 +1
  const g = mk('me', 'cactus_wind'), f = mk('foe', 'aqua');
  const ev = turn(g, f, SKILLS.u_gale_1, OTHER, 1);
  ok(has(f, 'gale') && f.eff.gale.exp === 3, '시작의 공명 = 상대 쪽 강풍 3턴');
  ok(f.eff.atkDown && f.eff.atkDown.n === 1, '시작의 공명 = 쇠약 한 겹');
  ok(g.res && g.res.reso === 2, `새 강풍 +1 · 부는 턴 끝 +1 = 2 (지금 ${g.res && g.res.reso})`);
  const ev2 = turn(g, f, SKILLS.u_gale_1, OTHER, 2);
  ok(f.eff.atkDown.n === 2 && f.eff.gale.exp === 3, '강풍이 불면 쇠약만(강풍 기간 그대로)');
  const c = ev2.find(e => e.t === 'counter' && e.from === 'reso');
  ok(c && c.tier === 'crit' && c.dmg > 0, '3번째(부는 턴 끝)에 무속성 확정 치명 추가 공격');
  ok(g.res.reso === 0, '터진 뒤 0부터');
  ok(!ev.some(e => e.t === 'counter'), '첫 턴엔 안 터짐');
}
{ // 방어태세(치명 방어)에는 막혀 정타
  const g = mk('me', 'cactus_wind'), f = mk('foe', 'aqua');
  g.res = { reso: 2 }; g.resMax = { reso: 3 };
  const ev = turn(g, f, SKILLS.u_gale_2, B('guard'), 1);
  const c = ev.find(e => e.t === 'counter' && e.from === 'reso');
  ok(c && c.tier === 'hit', '방어태세면 확정 치명이 정타로');
  ok(f.eff.accDown && f.eff.critDown, '길 잃은 주파수 = 교란 + 무딤');
}
{ // 공명 기술 = 강풍이 불 때만 · 같은 공명은 다시 못 고름
  const g = mk('me', 'cactus_wind'), f = mk('foe', 'aqua');
  ok(!canUse(g, SKILLS.u_gale_3, 8, f), '강풍이 없으면 폭풍 공명 못 씀');
  turn(g, f, SKILLS.u_gale_1, OTHER, 1);
  ok(canUse(g, SKILLS.u_gale_3, 8, f), '강풍이 불면 폭풍 공명 씀');
  const m0 = missAddOf(f), a0 = atkK(f), hp0 = f.hp;
  const ev = turn(g, f, SKILLS.u_gale_3, OTHER, 2);
  ok(!canUse(g, SKILLS.u_gale_3, 8, f), '이미 붙은 공명은 다시 못 고름');
  ok(missAddOf(f) > m0 && atkK(f) < a0, '폭풍 = 교란 · 쇠약(폭풍 동안만)');
  ok(ev.some(e => e.t === 'tick' && e.id === 'storm' && e.who === 'foe') && f.hp < hp0, '폭풍 = 상대 턴 끝 피해');
  ok(canUse(g, SKILLS.u_gale_3b, 8, f), '폭풍 중에도 치유 공명');
  g.hp = Math.round(g.max * 0.5);
  const h0 = g.hp, ev3 = turn(g, f, SKILLS.u_gale_3b, OTHER, 3);
  ok(g.hp > h0, '치유 공명 = 우리 편 턴 끝 회복');
  expire(f, 9, []);
  ok(!has(f, 'gale') && missAddOf(f) <= m0 && atkK(f) >= a0, '강풍이 끝나면 폭풍 효과도 함께 사라짐');
  ok(!canUse(g, SKILLS.u_gale_3b, 8, f), '강풍이 끝나면 공명 못 씀');
}
{ // 뇌전 공명 = 상대 턴 끝 감전
  const g = mk('me', 'cactus_wind'), f = mk('foe', 'aqua');
  turn(g, f, SKILLS.u_gale_1, OTHER, 1);
  turn(g, f, SKILLS.u_gale_3c, OTHER, 2);
  ok(has(f, 'shock'), '뇌전 공명 = 상대 감전');
}
{ // 환각의 주파수 = 은신 · 피하면 바람 공격 · 뚫리면 첫 타 반사 · 판마다 2번
  const g = mk('me', 'cactus_wind', { spd: 99 }), f = mk('foe', 'aqua', { spd: 1 });
  ok(SKILLS.u_gale_2b.uses === 2, '판마다 2번');
  const AREA = { id: 'ar', name: '광역', act: 'attack', power: 60, cost: 0, cats: ['attack'], area: true, el: 'water' };
  const hp0 = f.hp, ev = turn(g, f, SKILLS.u_gale_2b, AREA, 1);
  ok(ev.some(e => e.t === 'reflect' && e.who === 'me') && f.hp < hp0, '광역에 뚫리면 처음 맞은 피해 일부 반사');
  const g2 = mk('me', 'cactus_wind', { spd: 99 }), f2 = mk('foe', 'aqua', { spd: 1 });
  const ONE = { id: 'one', name: '한 방', act: 'attack', power: 60, cost: 0, cats: ['attack'], el: 'water' };
  const ev2 = turn(g2, f2, SKILLS.u_gale_2b, ONE, 1, () => 0.01);
  ok(ev2.some(e => e.t === 'hit' && e.who === 'me' && e.link), '은신으로 피하면 바로 바람 공격');
}
// ── 11. 게일바인 ──
ok(SPECIES_V2.has('vine_wind'), '게일바인 v2 켜짐');
{
  const ONE = { id: 'one', name: '한 방', act: 'attack', power: 60, cost: 0, cats: ['attack'], el: 'water' };
  const g = mk('me', 'vine_wind'), f = mk('foe', 'aqua');
  turn(g, f, OTHER, ONE, 1, () => 0);
  ok(g.res && g.res.evs === 1, `상대 공격이 빗나가면 스택 +1 (지금 ${g.res && g.res.evs})`);
  const g2 = mk('me', 'vine_wind'), f2 = mk('foe', 'aqua');
  turn(g2, f2, OTHER, ONE, 1, () => 0.1);
  ok(!(g2.res && g2.res.evs), '스침은 안 쌓임');
  const g3 = mk('me', 'vine_wind'), f3 = mk('foe', 'aqua');
  turn(g3, f3, OTHER, { ...ONE, power: 20, hits: 3 }, 1, () => 0);
  ok(g3.res.evs === 3, '연타는 빗나간 타마다 +1');
  g3.res.evs = 5; turn(g3, f3, OTHER, { ...ONE, power: 20, hits: 3 }, 2, () => 0);
  ok(g3.res.evs === 5, '상한 5');
  const g4 = mk('me', 'vine_wind'), f4 = mk('foe', 'aqua');
  g4.res = { evs: 3 }; g4.resMax = { evs: 5 };
  const ev4 = turn(g4, f4, OTHER, ONE, 1);
  ok(ev4.some(e => e.t === 'counter' && e.from === 'stack' && e.who === 'me') && has(f4, 'bleed') && g4.res.evs === 0, '맞으면 스택을 다 써서 반격 · 3 이상이면 출혈');
  const g5 = mk('me', 'vine_wind', { spd: 99 }), f5 = mk('foe', 'aqua', { spd: 1 });
  turn(g5, f5, ONE, OTHER, 1);
  ok(g5.eff.atkUp && g5.eff.atkUp.n === 1, '선공하면 활력 한 겹');
}
{ // 휙- 푹찍 = 후공형 — 먼저 공격한 상대가 나를 빗나갔으면 확정 치명 · 내가 먼저면 치명 없음
  const ONE = { id: 'one', name: '한 방', act: 'attack', power: 60, cost: 0, cats: ['attack'], el: 'water' };
  const g = mk('me', 'vine_wind'), f = mk('foe', 'aqua');
  const ev = turn(f, g, ONE, SKILLS.u_gvine_2b, 1, () => 0);
  ok(ev.find(e => e.t === 'hit' && e.who === 'me').tier === 'crit', '상대가 빗나간 뒤면 확정 치명');
  const g2 = mk('me', 'vine_wind', { spd: 1 }), f2 = mk('foe', 'aqua', { spd: 99 });
  const ev2 = turn(f2, g2, { ...OTHER, late: true }, SKILLS.u_gvine_2b, 1, () => 0.999);
  ok(ev2.find(e => e.t === 'hit' && e.who === 'me').tier === 'hit', '내가 먼저 움직이면 치명 없이 보통');
}
{ // 방심하기 = 그 턴 상대 공격을 빗나감 · 스침 없이 다 맞고 받는 피해 −40%
  const ONE = { id: 'one', name: '한 방', act: 'attack', power: 60, cost: 0, cats: ['attack'], el: 'water' };
  const g = mk('me', 'vine_wind'), f = mk('foe', 'aqua');
  const h = turn(g, f, SKILLS.u_gvine_3, ONE, 1, () => 0).find(e => e.t === 'hit' && e.who === 'foe');
  ok(h && h.tier !== 'miss' && h.tier !== 'graze', '방심하기면 빗나감 · 스침 없음');
  const r1 = mk('me', 'vine_wind'), r2 = mk('foe', 'aqua'), g2 = mk('me', 'vine_wind'), f2 = mk('foe', 'aqua');
  const d0 = turn(r1, r2, OTHER, ONE, 1).find(e => e.t === 'hit' && e.who === 'foe').dmg;
  const d1 = turn(g2, f2, SKILLS.u_gvine_3, ONE, 1).find(e => e.t === 'hit' && e.who === 'foe').dmg;
  ok(Math.abs(d1 - d0 * 0.6) <= 1, `받는 피해 −40% (${d0} → ${d1})`);
}
{ // 피해? = 반드시 맞음 · 회피 자세 · 은신 무시 · 선공이면 확정 치명 / 빠르지? 열받지? = 연타 + 강풍 / 이딴게.. 공격? = 도발 + 교란
  const g = mk('me', 'vine_wind', { spd: 99 }), f = mk('foe', 'aqua', { spd: 1 });
  const h = turn(g, f, SKILLS.u_gvine_3c, B('evade'), 1, () => 0).find(e => e.t === 'hit' && e.who === 'me');
  ok(h && h.tier === 'crit', '회피 자세여도 맞고 선공이면 확정 치명');
  const g2 = mk('me', 'vine_wind', { spd: 99 }), f2 = mk('foe', 'aqua', { spd: 1, eff: { stealth: { look: 'stealth', link: null } } });
  const h2 = turn(g2, f2, SKILLS.u_gvine_3c, OTHER, 1, () => 0).find(e => e.t === 'hit' && e.who === 'me');
  ok(h2 && h2.tier === 'crit' && !has(f2, 'stealth'), '은신도 찾아내 맞힘');
  const g3 = mk('me', 'vine_wind'), f3 = mk('foe', 'aqua');
  const ev3 = turn(g3, f3, SKILLS.u_gvine_3b, OTHER, 1);
  ok(ev3.filter(e => e.t === 'hit' && e.who === 'me').length === 3 && has(f3, 'gale'), '빠르지? 열받지? = 3타 + 상대 쪽 강풍');
  const g4 = mk('me', 'vine_wind'), f4 = mk('foe', 'aqua');
  turn(g4, f4, SKILLS.u_gvine_2, OTHER, 1);
  ok(f4.eff.taunt && f4.eff.accDown, '이딴게.. 공격? = 도발 + 교란');
  ok(!SKILLS.u_gvine_1.uses && SKILLS.u_gvine_1.self === 'stealth' && SKILLS.u_gvine_1.link.ambush, '그건 내 잔상인데? = 횟수 제한 없는 은신 · 피하면 기습');
}
console.log(fails ? `실패 ${fails} / ${n}` : `모두 통과 (${n})`);
process.exit(fails ? 1 : 0);
