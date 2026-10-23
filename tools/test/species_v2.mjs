// 종 고유 기술 v2 시험(사용자와 짠 설계 — docs/superpowers/specs/2026-10-18-v2-species-skills.md 각 종 절)
//   node tools/test/species_v2.mjs
import { makeUnit } from '../../v2/src/battle/model.js';
import { protoStats } from '../../v2/src/battle/team.js';
import { resolveTurn, makeRng } from '../../v2/src/battle/rules.js';
import { endTurn, expire, canUse, has, missAddOf, atkK, effSpd, payEnergy } from '../../v2/src/battle/status.js';
import { orbInit } from '../../v2/src/battle/devices.js';
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
  const g5 = mk('me', 'vine_wind', { spd: 99 }), f5 = mk('foe', 'aqua', { spd: 1 });
  const h5 = turn(g5, f5, SKILLS.u_gvine_3c, B('guard'), 1, () => 0).find(e => e.t === 'hit' && e.who === 'me');
  ok(h5 && h5.tier === 'hit', '피해?의 확정 치명은 방어태세에 막혀 보통 타격(2026-10-24 사용자)');
  const g3 = mk('me', 'vine_wind'), f3 = mk('foe', 'aqua');
  const ev3 = turn(g3, f3, SKILLS.u_gvine_3b, OTHER, 1);
  ok(ev3.filter(e => e.t === 'hit' && e.who === 'me').length === 3 && has(f3, 'gale'), '빠르지? 열받지? = 3타 + 상대 쪽 강풍');
  const g4 = mk('me', 'vine_wind'), f4 = mk('foe', 'aqua');
  turn(g4, f4, SKILLS.u_gvine_2, OTHER, 1);
  ok(f4.eff.taunt && f4.eff.accDown, '이딴게.. 공격? = 도발 + 교란');
  ok(!SKILLS.u_gvine_1.uses && SKILLS.u_gvine_1.self === 'stealth' && SKILLS.u_gvine_1.link.ambush, '그건 내 잔상인데? = 횟수 제한 없는 은신 · 피하면 기습');
}
// ── 15. 스톤캡 ──
ok(SPECIES_V2.has('stone_cap'), '스톤캡 v2 켜짐');
{
  const s = mk('me', 'stone_cap'), f = mk('foe', 'aqua'), sp0 = effSpd(f);
  turn(s, f, OTHER, OTHER, 1);
  ok(has(f, 'cave') && effSpd(f) < sp0, '스톤캡이 나와 있으면 상대 쪽에 동굴 — 기동 하락');
  const m0 = missAddOf(f), sp1 = effSpd(f);
  turn(s, f, SKILLS.u_stone_2, OTHER, 2);
  ok(effSpd(f) < sp1 && missAddOf(f) > m0, '자갈밭 = 기동 · 적중 더 떨어짐');
  ok(!canUse(s, SKILLS.u_stone_2, 8, f), '같은 설치는 한 번');
  turn(s, f, SKILLS.u_stone_3, OTHER, 3);
  ok(has(f, 'burn'), '용암지대 = 턴 끝마다 상대에게 화상');
  const sp2 = effSpd(f);
  turn(s, f, SKILLS.u_stone_3b, OTHER, 4);
  ok(effSpd(f) < sp2, '지반붕괴 = 기동 더 떨어짐(설치)');
  s.hp = Math.round(s.max * 0.5); const h0 = s.hp;
  turn(s, f, SKILLS.u_stone_3c, OTHER, 5);
  ok(s.hp > h0 && f.eff.cave && !(f.eff.cave.add || []).length && Math.abs(effSpd(f) - sp1) < 1e-9, '이끼덮기 = 설치물 걷고 그 수만큼 회복 · 동굴(기동 하락)은 남음');
  const t = mk('foe', 'aqua'); turn(mk('me', 'aqua'), t, OTHER, OTHER, 1);
  ok(!has(t, 'cave'), '스톤캡이 아니면 동굴 없음');
  const s2 = mk('me', 'stone_cap'), f2 = mk('foe', 'aqua', { eff: { shield: { hp: 999 } } });
  const h2 = turn(s2, f2, SKILLS.u_stone_2b, OTHER, 1).find(e => e.t === 'hit' && e.who === 'me');
  ok(h2 && h2.dmg > 0 && !h2.absorb, '석순 = 보호막 무시');
  ok(SKILLS.u_stone_1.inflict.id === 'stun' && SKILLS.u_stone_1.inflict.p < 0.5, '낙석 = 낮은 확률 기절');
}
// ── 12. 스포어캡 ──
ok(SPECIES_V2.has('spore_cap'), '스포어캡 v2 켜짐');
{
  const ONE = { id: 'one', name: '한 방', act: 'attack', power: 60, cost: 0, cats: ['attack'], el: 'water' };
  const s = mk('me', 'spore_cap'), f = mk('foe', 'aqua');
  turn(s, f, SKILLS.u_spore_1, OTHER, 1);
  ok(s.summons && s.summons.length === 1 && s.summons[0].stage === 'sleep' && s.summons[0].hp > 0, '포자 배양 = 잠든 포자 하나(체력 있음)');
  ok(!canUse(s, SKILLS.u_spore_2b, 8, f), '깨어난 소환수가 없으면 일제 포자 못 씀');
  const fh = f.hp, ev = turn(s, f, OTHER, OTHER, 2);
  ok(s.summons[0].stage === 'baby' && ev.some(e => e.t === 'counter' && e.from === 'summon') && f.hp < fh, '다음 턴 시작에 깨어나 새끼 · 그 턴부터 평타');
  const sh0 = s.summons[0].hp, oh0 = s.hp;
  turn(s, f, OTHER, ONE, 3, () => 0.5);
  ok(s.summons.length === 0 || s.summons[0].hp < sh0, '상대 공격은 앞 소환수가 대신 맞음');
  ok(s.hp === oh0, '주인은 안 맞음(한 타로 깨져도 남는 피해는 안 넘어감)');
  const s2 = mk('me', 'spore_cap'), f2 = mk('foe', 'aqua');
  for (let i = 1; i <= 4; i++) turn(s2, f2, SKILLS.u_spore_1, OTHER, i);
  ok(s2.summons.length === 3, '소환수는 한꺼번에 최대 셋');
  ok(canUse(s2, SKILLS.u_spore_2b, 8, f2), '깨어난 새끼가 있으면 일제 포자');
  const n0 = turn(s2, f2, SKILLS.u_spore_2b, OTHER, 5).filter(e => e.t === 'counter' && e.from === 'summon').length;
  ok(n0 >= 5, `일제 포자 = 턴 시작 평타 + 지금 한 번 더 (${n0}번)`);
  const before = s2.summons.map(x => x.hp / x.max), atk0 = s2.summons[0].atk;
  turn(s2, f2, SKILLS.u_spore_3c, OTHER, 6);
  ok(s2.summons.every(x => x.stage === 'adult') && s2.summons[0].atk > atk0, '커져라! = 깨어난 새끼가 성체 버섯 · 능력치 오름');
  ok(s2.summons.every((x, i) => Math.abs(x.hp / x.max - before[i]) < 0.05 || x.hp / x.max <= before[i]), '체력은 남은 비율 그대로');
  turn(s2, f2, SKILLS.u_spore_3, OTHER, 7);
  ok(!s2.summons || !s2.summons.length, '포자회귀 = 소환수를 모두 터뜨림');
  ok(f2.eff.spore && f2.eff.spore.n >= 6, `소환수마다 상대에게 포자(성체 버섯 셋 = ${f2.eff.spore && f2.eff.spore.n})`);
  const s3 = mk('me', 'spore_cap'), f3 = mk('foe', 'aqua');
  turn(s3, f3, SKILLS.u_spore_2, OTHER, 1);
  ok(s3.eff.shield && s3.eff.shield.spore, '포자벽 = 보호막');
  turn(s3, f3, OTHER, ONE, 2, () => 0.5);
  ok(f3.eff.spore, '포자벽이 막으면 때린 상대에게 포자 하나');
  const s4 = mk('me', 'spore_cap'), f4 = mk('foe', 'aqua');
  const h4 = turn(s4, f4, SKILLS.u_spore_3b, OTHER, 1, () => 0.5).find(e => e.t === 'hit' && e.who === 'me');
  ok(SKILLS.u_spore_3b.el === 'bolt' && h4 && h4.tier !== 'miss' && f4.eff.spore, '포자작! = 번개 평타 + 포자');
}
// ── 14. 볼트바인 ──
ok(SPECIES_V2.has('volt_vine'), '볼트바인 v2 켜짐');
{
  const ONE = { id: 'one', name: '한 방', act: 'attack', power: 60, cost: 0, cats: ['attack'], el: 'water' };
  const v = mk('me', 'volt_vine', { stage: 2, energy: 0 }), f = mk('foe', 'aqua');
  orbInit(v, 1);
  ok(v.orb && v.orb.max === 5 && v.orb.n === 5, '구슬 칸 = 성체 5 · 처음엔 가득');
  ok(canUse(v, { id: 'c3', cost: 3 }, 0) && !canUse(v, { id: 'c9', cost: 9 }, 0), '햇빛이 모자라면 구슬 햇빛까지 끌어 씀');
  v.energy = 1; payEnergy(v, 3);
  ok(v.energy === 0 && v.orb.n === 3, '기본 칸부터 쓰고 모자란 만큼 구슬');
  const v2 = mk('me', 'volt_vine', { stage: 2 }), f2 = mk('foe', 'aqua'); orbInit(v2, 1);
  turn(v2, f2, OTHER, OTHER, 1);
  ok(v2.orb.n === 5, '홀수 턴 끝엔 발사 안 함');
  const fh = f2.hp, ev2 = turn(v2, f2, OTHER, OTHER, 2);
  ok(ev2.some(e => e.t === 'counter' && e.from === 'orb') && f2.hp < fh && v2.orb.n === 0, '짝수 턴 끝에 남은 구슬 발사 · 소모');
  turn(v2, f2, OTHER, OTHER, 3);
  ok(v2.orb.n === 5, '홀수 턴 시작에 구슬 가득');
  const v3 = mk('me', 'volt_vine', { stage: 2 }), f3 = mk('foe', 'aqua'); orbInit(v3, 1);
  const r0 = mk('me', 'volt_vine', { stage: 2 }), r1 = mk('foe', 'aqua'); orbInit(r0, 1);
  const d0 = turn(r0, r1, OTHER, ONE, 1).find(e => e.t === 'hit' && e.who === 'foe').dmg;
  const h3 = turn(v3, f3, SKILLS.u_volt_1, ONE, 1).find(e => e.t === 'hit' && e.who === 'foe');
  ok(h3.dmg < d0 && v3.orb.n < 5 && v3.orb.n >= 5 - Math.ceil(d0 / Math.round(v3.max * 0.06)), `수호 구슬 = 구슬이 막고 막은 만큼만 깎임(${d0} → ${h3.dmg}, 남은 구슬 ${v3.orb.n})`);
  const v4 = mk('me', 'volt_vine', { stage: 2 }), f4 = mk('foe', 'aqua'); orbInit(v4, 1);
  const hs = turn(v4, f4, SKILLS.u_volt_2, OTHER, 1).filter(e => e.t === 'hit' && e.who === 'me');
  ok(hs.length === 5 && v4.orb.n === 0, '전격 구슬 = 남은 구슬만큼 연타 · 구슬 0');
  const e4 = turn(v4, f4, SKILLS.u_volt_2b, OTHER, 2).find(e => e.t === 'counter' && e.from === 'orb');
  ok(e4 && e4.n === 5, '구슬 회수 = 빈 구슬 칸 바로 충전(그 짝수 턴 끝에 다섯 발사)');
  const v5 = mk('me', 'volt_vine', { stage: 2 }), f5 = mk('foe', 'aqua'); orbInit(v5, 1);
  turn(v5, f5, SKILLS.u_volt_3, OTHER, 1);
  ok(v5.orb.trap === 5 && v5.orb.n === 0, '구슬 속박 = 남은 구슬 전부 덫');
  const ev5 = turn(v5, f5, OTHER, ONE, 2, () => 0.5);
  ok(ev5.some(e => e.t === 'counter' && e.from === 'trap') && f5.eff.seal && v5.orb.trap === 4, '상대가 맞히면 덫 하나가 터져 피해 + 봉인 · 구슬 돌아옴');
  turn(v5, f5, OTHER, OTHER, 3);
  ok(v5.orb.n === 1, '안 터진 덫 구슬은 충전에서 빠짐(5 − 덫 4)');
  const v6 = mk('me', 'volt_vine', { stage: 2 }), f6 = mk('foe', 'aqua'); orbInit(v6, 1);
  const ev6 = turn(v6, f6, SKILLS.u_volt_3b, OTHER, 1, () => 0.5);
  ok(SKILLS.u_volt_3b.area && ev6.some(e => e.t === 'hit' && e.who === 'me' && e.tier !== 'miss') && has(f6, 'burn') && v6.orb.n === 0, '뇌격구 = 광역 번개 + 화상 · 구슬 전부');
  const v7 = mk('me', 'volt_vine', { stage: 2, eff: { poison: { n: 1, last: 1 } } }), f7 = mk('foe', 'aqua'); orbInit(v7, 1);
  v7.hp = Math.round(v7.max * 0.5); const h7 = v7.hp;
  turn(v7, f7, SKILLS.u_volt_3c, OTHER, 1);
  ok(v7.hp > h7 && !v7.eff.poison && v7.orb.n === 0, '구슬흡수 = 구슬만큼 회복 · 가득이면 전부 정화');
}
console.log(fails ? `실패 ${fails} / ${n}` : `모두 통과 (${n})`);
process.exit(fails ? 1 : 0);
