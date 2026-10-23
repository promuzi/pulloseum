// 상태 효과 시험(화면 없이): 규칙 하나하나 + 같은 씨앗 → 같은 결과 + 12종 1:1 돌려 보기(효과 있음/없음 비교)
//   node tools/test/status.mjs [--games 40]
import { makeUnit, makeBattle, playTurn, aiPick, kitOf, REST, BLOCKED, firstOk } from '../../v2/src/battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats } from '../../v2/src/battle/team.js';
import { resolveTurn, makeRng } from '../../v2/src/battle/rules.js';
import { apply, onHit, endTurn, expire, listOf, canUse, canSwitch, effSpd, mustSkip, clearOnSwitch, selfBuff, shockRoll, RULES_FX, atkK } from '../../v2/src/battle/status.js';
import { SPECIES } from '../../v2/src/data/mock.js';
import { SKILLS as CSK, RULES_VER } from '../../v2/src/game/catalog.js';
import * as ST from '../../v2/src/battle/status.js';
const { FX } = ST, OLD_ = ST.OLD;

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
  ok(b.eff.burn.exp === 8, '다시 걸면 남은 턴과 새 기간 중 긴 쪽(5턴에 걸고 6턴에 다시 = 8턴까지)');
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
  ok(!b.eff.chill && mustSkip(b) && b.eff.skip.src === 'frozen' && !b.eff.frozen, '빙결 3 → 얼음(기절의 다른 이름 · 쉼) · 0으로');
  const c = mk('foe', 'flower_grass');
  // 감전 = 확률형(2026-10-18): 걸려도 바로 쉬지 않음 · 자기 차례 굴림이 25%(젖으면 50%) 아래면 마비 → 감전 풀림 · 버팀 중엔 안 굴림
  apply(c, 'shock', 1, ctx(a, 1, []));
  ok(c.eff.shock && !mustSkip(c), '감전 = 걸려도 바로 안 쉼');
  const r = v => ({ turn: 1, rng: () => v, ev: [] });
  ok(!shockRoll(c, r(0.3)) && c.eff.shock, '감전 굴림 0.3 = 안 걸림(25%)');
  c.eff.wet = { exp: 9 };
  ok(shockRoll(c, r(0.4)) && !c.eff.shock && c.eff.skip && c.eff.skip.src === 'paral', '젖으면 50% — 굴림 0.4 = 마비 · 감전 풀림');
  delete c.eff.wet; delete c.eff.skip; c.eff.immune = {}; apply(c, 'shock', 1, ctx(a, 1, []));
  ok(!shockRoll(c, r(0)) && !c.eff.shock && !mustSkip(c), '면역(쉰 뒤) 중에도 굴리고, 걸리면 쉬지 않고 감전만 사라짐(엑셀 v10)');
  delete c.eff.immune; delete c.eff.shock;
  const d = mk('foe', 'flower_grass');
  apply(d, 'chill', 1, ctx(a, 1, [])); endTurn([[d, a]], 1, []); endTurn([[d, a]], 2, []); ok(d.eff.chill && d.eff.chill.n === 1, '빙결 1턴 안 쌓임 → 그대로'); endTurn([[d, a]], 3, []);
  ok(d.eff.chill === undefined || d.eff.chill.n < 1, '빙결도 2턴 안 쌓이면 줄어듦');
  const f = mk('foe', 'flower_grass');   // 불에 맞으면 젖음·빙결·얼음 녹음(쉬기도 풀림)
  apply(f, 'wet', 1, ctx(a, 1, [])); apply(f, 'chill', 2, ctx(a, 1, []));
  ok(mustSkip(f), '젖음 + 칼바람(2) = 바로 얼음');
  const fe = []; onHit(mk('me', 'cactus_fire'), f, sk(mk('me', 'cactus_fire'), 's1'), { turn: 1, rng: makeRng(1), ev: fe });
  ok(!f.eff.wet && mustSkip(f) && f.eff.burn, '불에 맞으면 젖음이 마르고 화상 — 이미 걸린 얼음(기절)은 안 풀림(엑셀 v10 기절 제거 불가)');
}
// ── 6. 쉬는 시점 · 에너지 돌려받음 · 버팀 ──
{ // 선공이 기절시킴 → 후공의 이번 행동 취소 + 에너지 환불
  const B = makeBattle({ me: mk('me', 'gaia', { spd: 99 }), foe: mk('foe', 'flower_grass', { spd: 1 }), seed: 3 });
  B.me.energy = 8; B.foe.energy = 8;
  const foeS = sk(B.foe, 's2'), r = resolveTurn(B.me, B.foe, sk(B.me, 's2'), foeS, fixed(0.5), { turn: 1 });
  const sk1 = r.events.find(e => e.t === 'skip');
  ok(sk1 && sk1.who === 'foe' && sk1.refund === foeS.cost, '선공이 기절 → 후공 이번 행동 취소, 쓴 에너지 돌려받음');
  ok(!r.events.some(e => e.t === 'hit' && e.who === 'foe'), '취소된 쪽은 공격 안 함');
  ok(B.foe.eff.immune && !B.foe.eff.brace, '쉬고 나면 면역(옛 버팀)');
  const ev = []; apply(B.foe, 'stun', 1, ctx(B.me, 1, ev));
  ok(!mustSkip(B.foe) && ev.some(e => e.t === 'resist' && e.why === 'immune') && B.foe.eff.immune, '면역 중에는 기절 안 걸리고 면역도 남음');
  expire(B.foe, 1, []); expire(B.foe, 2, []); ok(B.foe.eff.immune, '면역은 턴으로 끝나지 않음(다음 행동 한 번을 마쳐야 끝)');
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
  apply(a, 'burn', 1, ctx(b, 2, [])); let hpA = a.hp; endTurn([[b, a]], 2, []);
  ok(a.hp - hpA === Math.round(b.max * 0.025), '화상이어도 기생 회복은 그대로(회복 방해는 출혈만 — 엑셀 v10)');
  delete a.eff.burn; apply(a, 'bleed', 1, ctx(b, 3, [])); hpA = a.hp; endTurn([[b, a]], 3, []);
  ok(a.hp - hpA === Math.round(Math.round(b.max * 0.025) * 0.5), '출혈이면 회복 절반');
  ok(!b.eff.leech, '기생 씨앗 = 지금 3턴(1턴에 걸면 3턴 끝까지)');
}
{
  const B = makeBattle({ me: mk('me', 'spore_cap'), foe: mk('foe', 'aqua'), seed: 5 });
  apply(B.foe, 'dark', 1, ctx(B.me, 1, []), { look: 'shade' });   // 그늘 드리우기 = 암실 1턴(이름 · 연출 그늘)
  const e0 = B.foe.energy, t = playTurn(B, B.me.kit[1]), sun = t.foeSkill && t.foeSkill.act === 'sun' ? t.foeSkill.gain || 0 : 0;   // 봇이 광합성(그 턴 대신 +2)을 고르면 그만큼은 빼고 봄(2026-10-22 봇 머리)
  ok(B.foe.energy <= e0 + sun && t.events.some(e => e.t === 'noEnergy' && e.who === 'foe'), '그늘 = 그 턴 끝 에너지 안 참');
  ok(!B.foe.eff.dark && !B.foe.eff.shade, '그늘(암실 1턴)은 그 턴 끝 한 번 막고 사라짐');
}
{
  const a = mk('me', 'flower_grass'), b = mk('foe', 'gaia');
  b.energy = 4; apply(b, 'seal', 1, ctx(a, 1, []));
  const locked = b.eff.seal && b.kit.find(s => s.id === b.eff.seal.skill);
  ok(locked && !canUse(b, locked) && (locked.cost || 0) <= 5, '봉인(옛 덩굴) = 다음 턴에 쓸 수 있을 기술 하나를 막음');
  expire(b, 1, []); ok(b.eff.seal, '걸린 턴 끝엔 남음'); expire(b, 2, []); ok(!b.eff.seal, '다음 턴 끝에 풀림');
  apply(b, 'taunt', 1, ctx(a, 3, []));
  ok(!canUse(b, sk(b, 'guard')) && !canUse(b, sk(b, 'evade')) && canUse(b, b.kit[0]), '도발 = 방어·회피 자세 못 씀');
}
{
  const a = mk('me', 'gaia'), b = mk('foe', 'aqua'), base = { ...a }, b0 = { ...b };
  const dmg = (x, y) => { const xx = mk('me', x.key), yy = mk('foe', y.key); Object.assign(xx.eff, x.eff); Object.assign(yy.eff, y.eff); const r = resolveTurn(xx, yy, xx.kit[0], REST, fixed(0.5), { turn: 1 }); return (r.events.find(e => e.t === 'hit') || {}).dmg; };
  const plain = dmg(a, b);
  apply(a, 'atkDown', 1, ctx(b, 1, []));
  const weak = dmg(a, b);
  ok(weak < plain, `약화 = 공격 ↓ (${plain} → ${weak})`);
  a.eff = {}; apply(b, 'defDown', 1, ctx(a, 1, []));
  ok(dmg(a, b) > plain, '부식 = 방어 ↓');
  const p = mk('me', 'gaia'); apply(p, 'gale', 1, ctx(b, 1, []));
  const t0 = resolveTurn(mk('me', 'gaia'), mk('foe', 'aqua'), sk(p, 's1'), REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').table;
  const t1 = resolveTurn(p, mk('foe', 'aqua'), sk(p, 's1'), REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').table;
  ok(t1.miss === t0.miss + 12, '강풍 = 빗나감 칸 +12');
}
// ── 8. 3:3: 교체해도 상태이상 · 능력치 겹은 남음(준비 효과만 사라짐 — 엑셀 v10) · 속박이면 교체 못 함 ──
{
  const me = ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe = ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k));
  const B = makeTeamBattle({ me, foe, seed: 9 });
  apply(B.me, 'poison', 1, ctx(B.foe, 1, [])); apply(B.me, 'burn', 1, ctx(B.foe, 1, [])); apply(B.me, 'wet', 1, ctx(B.foe, 1, [])); apply(B.me, 'leech', 1, ctx(B.foe, 1, []));
  selfBuff(B.me, 'aim', { turn: 1, ev: [] }); selfBuff(B.me, 'shield', { turn: 1, ev: [] }); selfBuff(B.me, 'stealth', { turn: 1, ev: [] }, {});
  const out = B.me;
  playTurn3(B, { kind: 'switch', to: 1 });
  ok(B.me !== out && out.eff.poison && out.eff.burn && out.eff.wet && out.eff.leech, '교체로 나가도 상태이상은 남음(엑셀 v10 — 교체 시 유지 · 턴 진행)');
  ok(!out.eff.aim && !out.eff.shield && !out.eff.stealth, '준비 효과(조준 · 보호막 · 은신)는 교체로 사라짐');
  apply(B.me, 'root', 1, ctx(B.foe, B.turn - 1, []));   // 앞 턴에 걸린 속박 = 이번 턴 교체 막음(다음 1턴)
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
// ── 9. 포자(엑셀 v10 30행 = 따로 쌓이는 지연 효과): 기술마다 지연 N턴 · 걸린 다음 턴부터 세어 N턴째 끝에 핌 · 상한 없음 · 기본은 피해만 · 불에 탐 · 버섯은 안 걸림 ──
{
  const a = mk('me', 'spore_cap'), b = mk('foe', 'gaia');
  apply(b, 'spore', 1, ctx(a, 1, []));   // 옛 1겹 기술 = 지연 2턴
  ok(b.eff.spore && b.eff.spore.n === 1, '포자 하나');
  const e1 = [], e2 = [], e3 = [], hp0 = b.hp;
  endTurn([[b, a]], 1, e1); endTurn([[b, a]], 2, e2);
  ok(b.eff.spore && !e1.concat(e2).some(e => e.t === 'bloom') && b.hp === hp0, '1턴에 건 지연 2 포자는 1 · 2턴 끝엔 안 핌');
  endTurn([[b, a]], 3, e3);
  ok(!b.eff.spore && hp0 - b.hp === Math.round(b.max * 0.08) && e3.some(e => e.t === 'bloom' && e.k === 1), '3턴 끝에 핌: 8% 피해');
  // 따로 쌓임: 다시 걸면 앞당기지 않고 하나 더(각자 셈)
  const c2 = mk('foe', 'gaia'); apply(c2, 'spore', 1, ctx(a, 1, [])); endTurn([[c2, a]], 1, []); apply(c2, 'spore', 1, ctx(a, 2, [])); endTurn([[c2, a]], 2, []);
  ok(c2.eff.spore.n === 2 && listOf(c2).some(x => x.id === 'spore' && x.n === 2 && x.t === 1), `포자 둘 · 가장 빨리 피는 것 = 이번 턴 끝(${JSON.stringify(listOf(c2).find(x => x.id === 'spore'))})`);
  const h3 = c2.hp; endTurn([[c2, a]], 3, []);
  ok(c2.eff.spore && c2.eff.spore.n === 1 && h3 - c2.hp === Math.round(c2.max * 0.08), '3턴 끝 하나만 핌 · 하나 남음');
  const h4 = c2.hp; endTurn([[c2, a]], 4, []);
  ok(!c2.eff.spore && h4 - c2.hp === Math.round(c2.max * 0.08), '4턴 끝 남은 하나 핌');
  // 같은 턴에 둘 = 피해를 더한 사건 하나 · 숨막힘(햇빛 막힘) 없음
  const B = makeBattle({ me: mk('me', 'spore_cap'), foe: mk('foe', 'gaia'), seed: 4 });
  apply(B.foe, 'spore', 2, ctx(B.me, 1, [])); apply(B.foe, 'spore', 2, ctx(B.me, 1, []));   // 옛 2겹 기술 = 지연 1턴
  playTurn(B, B.me.kit[1]);
  const hb = B.foe.hp, tt = playTurn(B, B.me.kit[1]), bl = tt.events.find(e => e.t === 'bloom');
  ok(bl && bl.k === 2 && bl.dmg === 2 * Math.round(B.foe.max * 0.08), `같은 턴 둘 = 피해를 더해 한 번(${bl && bl.dmg})`);
  ok(!tt.events.some(e => e.t === 'noEnergy' && e.who === 'foe'), '기본 포자는 피어도 햇빛을 막지 않음(암실은 특수 포자만)');
  // 카드 포자 번식 = 걸 때 지연 1턴 줄임(지연 1 기술 → 그 턴 끝에 핌)
  const pa = mk('me', 'spore_cap'); pa.pas = { sporeAdd: 1 };
  const pb = mk('foe', 'gaia'), hpb = pb.hp; apply(pb, 'spore', 2, ctx(pa, 1, [])); endTurn([[pb, pa]], 1, []);
  ok(!pb.eff.spore && hpb - pb.hp === Math.round(pb.max * 0.08), '포자 번식 카드 = 지연 1턴 줄임');
  // 정화 = 포자 모두 지움
  const pu = mk('foe', 'gaia'); apply(pu, 'spore', 1, ctx(a, 1, [])); apply(pu, 'spore', 1, ctx(a, 1, [])); selfBuff(pu, 'purify', { turn: 1, ev: [] });
  ok(!pu.eff.spore, '정화 = 포자 모두 지움');
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
  const r = mk('me', 'gaia'); sb(r, 'atkUp');
  const rd = hitOf(r, mk('foe', 'aqua')).dmg;
  ok(rd > plain, `분노 = 주는 피해 ↑ (${plain} → ${rd})`);
  const w = mk('foe', 'aqua'); sb(w, 'defUp');
  const wd = hitOf(mk('me', 'gaia'), w).dmg;
  ok(wd < plain, `철벽 = 받는 피해 ↓ (${plain} → ${wd})`);
  const h = mk('me', 'gaia'), s0 = effSpd(h); sb(h, 'spdUp');
  ok(effSpd(h) > s0, '가속 = 기동성 ↑');
  const x = mk('foe', 'aqua');
  const g = mk('me', 'gaia'); g.hp = Math.round(g.max / 2); sb(g, 'regen');
  const ev1 = []; endTurn([[g, x]], 1, ev1);
  const rg = ev1.find(e => e.t === 'regen');
  ok(rg && rg.heal === Math.round(g.max * 0.05), '재생 = 턴 끝 5% 회복');
  endTurn([[g, x]], 2, []); endTurn([[g, x]], 3, []);
  ok(!g.eff.regen, '재생은 3번 뒤 끝');
  const g2 = mk('me', 'gaia'); g2.hp = 10; sb(g2, 'regen'); apply(g2, 'dark', 1, ctx(x, 1, []), { look: 'shade' });
  const ev2 = []; endTurn([[g2, x]], 1, ev2);
  ok(ev2.some(e => e.t === 'regen'), '그늘이어도 재생은 그대로(엑셀 v10 — 재생 멈춤 없앰)');
  const g3 = mk('me', 'gaia'); g3.hp = Math.round(g3.max / 2); sb(g3, 'regen'); apply(g3, 'burn', 1, ctx(x, 1, []));
  const ev3 = []; endTurn([[g3, x]], 1, ev3);
  ok((ev3.find(e => e.t === 'regen') || {}).heal === Math.round(g3.max * 0.05), '화상이어도 재생 그대로(회복 방해는 출혈만)');
  const SPINES = { id: 'spines', name: '가시 세우기', act: 'buff', cost: 0, reflect: true, cats: ['buff'] };   // 반사 = 그 턴 처음 맞는 한 타(엑셀 v10 방어 스킬)
  const th = mk('foe', 'aqua');
  const att = mk('me', 'gaia'), hp0 = att.hp;
  const evT = resolveTurn(att, th, att.kit[0], SPINES, fixed(0.5), { turn: 1 }).events;
  const hT = evT.find(e => e.t === 'hit'), rf = evT.find(e => e.t === 'reflect');
  ok(rf && rf.dmg === Math.max(1, Math.round((hT.dmg + hT.absorb) * 0.3)) && hp0 - att.hp === rf.dmg, '반사 = 그 턴 처음 맞은 한 타의 30% 되돌림');
  const th2 = mk('foe', 'aqua'); const att2 = mk('me', 'gaia');
  const evT2 = resolveTurn(att2, th2, { ...att2.kit[0], ranged: true }, SPINES, fixed(0.5), { turn: 1 }).events;
  ok(evT2.some(e => e.t === 'reflect'), '멀리서 때려도 반사(처음 맞는 한 타 — 엑셀 v10)');
  const sh = mk('foe', 'aqua'); sb(sh, 'shield'); const cap = sh.eff.shield.hp;
  ok(cap === Math.round(sh.max * 0.15), '보호막 = 최대 체력 15%');
  const hS = hitOf(mk('me', 'gaia'), sh);
  ok(hS.absorb === Math.min(cap, plain) && hS.dmg === plain - hS.absorb, '보호막이 먼저 막음');
  const p = mk('me', 'gaia'); apply(p, 'poison', 1, ctx(x, 1, [])); apply(p, 'wet', 1, ctx(x, 1, []));
  sb(p, 'purify');
  ok(!p.eff.poison && !p.eff.wet && p.eff.purified, '정화 = 나쁜 효과 다 지움');
  const evR = []; apply(p, 'burn', 1, ctx(x, 2, evR));
  ok(!p.eff.burn && evR.some(e => e.t === 'resist'), '정화 중엔 안 걸림');
  const f = mk('me', 'gaia'); sb(f, 'aim');
  ok(f.eff.aim && f.eff.aim.k === 25 && listOf(f).some(o => o.id === 'aim'), '조준(옛 집중) = 다음 공격 치명 +25');
  const tc0 = hitOf(mk('me', 'gaia'), mk('foe', 'aqua')).table, tc1 = hitOf(f, mk('foe', 'aqua')).table;
  ok(tc1.crit > tc0.crit && !f.eff.aim, '조준은 공격 기술 한 번에 쓰이고 사라짐');
  const bs = { id: 'x_rage', name: '불타오르기', el: 'fire', act: 'buff', self: 'atkUp', cost: 0, cats: ['buff'] };
  const u = mk('me', 'gaia'), evB = resolveTurn(u, mk('foe', 'aqua'), bs, REST, fixed(0.5), { turn: 1 }).events;
  ok(evB.some(e => e.t === 'cast') && u.eff.atkUp, '버프 기술 = 나에게 걸림(분노 → 활력 한 겹)');
  const u2 = mk('me', 'gaia');
  resolveTurn(u2, mk('foe', 'aqua'), { ...u2.kit[0], also: 'spdUp' }, REST, fixed(0.5), { turn: 1 });
  ok(u2.eff.spdUp, '공격 기술의 덤 버프(가속 한 겹)');
}
// ── 9-4. 상태이상 다시 맞춤(엑셀 v10 효과 분류 19~34행) ──
{
  const x = mk('me', 'aqua');
  // 출혈: 턴 끝 3% · 지금 3턴 · 받는 회복 절반
  const bl = mk('foe', 'gaia'); apply(bl, 'bleed', 1, ctx(x, 1, []));
  let n0 = 0, hp0 = bl.hp; for (let t = 1; t <= 5; t++) { const ev = []; endTurn([[bl, x]], t, ev); n0 += ev.filter(e => e.t === 'tick' && e.id === 'bleed').length; }
  ok(n0 === 3 && hp0 - bl.hp === 3 * Math.round(bl.max * 0.03) && !bl.eff.bleed, '출혈 = 턴 끝 3%씩 3번(지금 3턴)');
  const br = mk('foe', 'gaia'); br.hp = Math.round(br.max / 2); selfBuff(br, 'regen', { turn: 1, ev: [] }); apply(br, 'bleed', 1, ctx(x, 1, []));
  const evB = []; endTurn([[br, x]], 1, evB);
  ok((evB.find(e => e.t === 'regen') || {}).heal === Math.round(br.max * 0.05 * 0.5), '출혈이면 재생 절반');
  // 감전: 턴 끝 약한 피해 2%
  const sh = mk('foe', 'gaia'); apply(sh, 'shock', 1, ctx(x, 1, []));
  const evS = [], h1 = sh.hp; endTurn([[sh, x]], 1, evS);
  ok(evS.some(e => e.t === 'tick' && e.id === 'shock') && h1 - sh.hp === Math.round(sh.max * 0.02), '감전 = 턴 끝 최대 체력 2% 피해');
  // 암실: 기술마다 N턴 · 걸린 턴 끝부터 N번 막음 · 다시 걸면 긴 쪽
  const B = makeBattle({ me: mk('me', 'spore_cap'), foe: mk('foe', 'aqua'), seed: 5 });
  apply(B.foe, 'dark', 1, ctx(B.me, 1, []), { turns: 3 });
  const blocked = [];
  for (let i = 0; i < 4; i++) { const t = playTurn(B, B.me.kit[0]); blocked.push(t.events.some(e => e.t === 'noEnergy' && e.who === 'foe')); }
  ok(blocked.join() === 'true,true,true,false', `암실 3턴 = 걸린 턴 끝부터 세 번 막음(${blocked})`);
  const dk = mk('foe', 'aqua'); apply(dk, 'dark', 1, ctx(x, 1, []), { turns: 3 }); apply(dk, 'dark', 1, ctx(x, 2, []), { turns: 1 });
  ok(dk.eff.dark && dk.eff.dark.exp === 3, '암실 3턴(3턴까지)에 1턴을 다시 걸어도 줄지 않음(긴 쪽)');
  // 얼음(빙결 3) = 기절의 다른 이름 — 받는 피해가 줄지 않음
  const plain = resolveTurn(mk('me', 'gaia'), mk('foe', 'flower_grass'), mk('me', 'gaia').kit[0], REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').dmg;
  const fz = mk('foe', 'flower_grass'); apply(fz, 'chill', 3, ctx(x, 1, []));
  const hz = resolveTurn(mk('me', 'gaia'), fz, mk('me', 'gaia').kit[0], REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').dmg;
  ok(hz === plain, `얼음은 받는 피해가 그대로(${plain} → ${hz})`);
  // 기생: 처음 건 식물이 회복 · 건 식물이 쓰러지면 끝
  const lc = mk('me', 'vine_water'), lt = mk('foe', 'gaia'), other = mk('me', 'aqua');
  lc.slot = 'me0'; other.slot = 'me1'; lt.slot = 'foe0';
  lc.hp = 50; other.hp = 50; apply(lt, 'leech', 1, ctx(lc, 1, []));
  endTurn([[lt, other]], 1, [], null, [lc, lt, other]);
  ok(lc.hp > 50 && other.hp === 50, '기생 = 처음 건 식물이 회복(맞은편 다른 식물이 아님)');
  lc.hp = 0; const hpL = lt.hp, evL = []; endTurn([[lt, other]], 2, evL, null, [lc, lt, other]);
  ok(!lt.eff.leech && lt.hp === hpL, '건 식물이 쓰러지면 기생도 끝(피해 없음)');
  // 화상: 기술마다 기간 · 다시 걸면 긴 쪽
  const bu = mk('foe', 'gaia'); apply(bu, 'burn', 1, ctx(x, 1, []), { turns: 5 }); apply(bu, 'burn', 1, ctx(x, 2, []));
  ok(bu.eff.burn && bu.eff.burn.exp === 5, '화상 5턴(5턴까지)에 3턴을 다시 걸어도 줄지 않음');
  // 정화 = 해로운 상태이상만(능력치 디버프 · 강풍 · 기절은 남음)
  const pu = mk('foe', 'gaia'); for (const id of ['burn', 'poison', 'bleed', 'shock', 'wet', 'leech']) apply(pu, id, 1, ctx(x, 1, []));
  apply(pu, 'atkDown', 1, ctx(x, 1, [])); apply(pu, 'gale', 1, ctx(x, 1, [])); apply(pu, 'stun', 1, ctx(x, 1, []));
  selfBuff(pu, 'purify', { turn: 1, ev: [] });
  ok(!['burn', 'poison', 'bleed', 'shock', 'wet', 'leech'].some(k => pu.eff[k]) && pu.eff.atkDown && pu.eff.gale && mustSkip(pu), '정화 = 해로운 상태이상만 지움(쇠약 · 강풍 · 기절은 남음)');
  const pd = mk('foe', 'gaia'); selfBuff(pd, 'purify', { turn: 1, ev: [] }); apply(pd, 'atkDown', 1, ctx(x, 1, []));
  ok(pd.eff.atkDown, '정화 보호 중에도 능력치 디버프는 걸림(보호는 상태이상만)');
}
// ── 9-5. 기절 · 면역 · 의지(엑셀 v10 효과 분류 26 · 33 · 34행) ──
{
  const ZAP = { id: 'zap', name: '찌릿', act: 'attack', power: 1, cost: 0, cats: ['attack'], inflict: { id: 'stun' } };
  const HIT = { id: 'hit', name: '치기', act: 'attack', power: 1, cost: 0, cats: ['attack'] };
  // 매 턴 기절을 받아도 '한 번 쉬고 한 번 행동' — 거는 쪽이 선공이든 후공이든
  for (const [first, label] of [[true, '거는 쪽 선공'], [false, '거는 쪽 후공']]) {
    const z = mk('me', 'gaia', { spd: first ? 99 : 1 }), v = mk('foe', 'flower_grass', { spd: first ? 1 : 99 });
    let rests = 0;
    for (let t = 1; t <= 6; t++) { const r = resolveTurn(z, v, ZAP, mustSkip(v) ? REST : HIT, fixed(0.5), { turn: t }); if (r.events.some(e => e.t === 'skip' && e.who === 'foe')) rests++; expire(z, t, []); expire(v, t, []); }
    ok(rests === 3, `매 턴 기절이 와도 6턴에 3번만 쉼(${label} · ${rests}번)`);
  }
  // 면역 = 쉰 뒤 다음 행동 한 번까지: 그 행동을 마치면 끝 → 같은 턴 뒤에 오는 기절은 걸림
  { const z = mk('me', 'gaia', { spd: 1 }), v = mk('foe', 'flower_grass', { spd: 99 });
    v.eff.immune = {};
    const r = resolveTurn(z, v, ZAP, HIT, fixed(0.5), { turn: 1 });
    ok(r.events.some(e => e.t === 'hit' && e.who === 'foe') && mustSkip(v) && !v.eff.immune, '면역은 내 행동을 마치면 끝 · 그 뒤 같은 턴 기절은 걸림'); }
  // 면역 중 빙결은 쌓이고 가득 차면 쉬지 않고 0으로
  { const v = mk('foe', 'flower_grass'), x = mk('me', 'gaia'); v.eff.immune = {};
    apply(v, 'chill', 2, ctx(x, 1, [])); ok(v.eff.chill && v.eff.chill.n === 2, '면역 중에도 빙결은 쌓임');
    const ev = []; apply(v, 'chill', 1, ctx(x, 1, ev));
    ok(!mustSkip(v) && !v.eff.chill && ev.some(e => e.t === 'resist' && e.why === 'immune'), '면역 중 빙결이 가득 차면 쉬지 않고 0으로'); }
  // 면역 중 감전: 굴림이 걸리면 쉬지 않고 감전만 사라짐 · 안 걸리면 감전 남음
  { const v = mk('foe', 'flower_grass'), x = mk('me', 'gaia'); v.eff.immune = {}; apply(v, 'shock', 1, ctx(x, 1, []));
    ok(!shockRoll(v, { turn: 1, rng: () => 0.9, ev: [] }) && v.eff.shock, '면역 중 감전 굴림이 안 걸리면 감전 남음');
    const ev = []; ok(!shockRoll(v, { turn: 1, rng: () => 0, ev }) && !v.eff.shock && !mustSkip(v) && ev.some(e => e.t === 'resist' && e.why === 'immune'), '면역 중 마비가 터지면 막고 감전은 사라짐'); }
  // 의지: 기절을 확률로 막음(굴림 0 = 막음) · 막으면 감전 사라짐
  { const v = mk('foe', 'flower_grass'), x = mk('me', 'gaia'); selfBuff(v, 'will', { turn: 1, ev: [] });
    ok(v.eff.will && v.eff.will.exp === 3, '의지 = 지금 3턴');
    const ev = []; apply(v, 'stun', 1, { turn: 1, rng: () => 0, ev, by: x });
    ok(!mustSkip(v) && ev.some(e => e.t === 'resist' && e.why === 'will'), '의지가 기절을 막음');
    const ev2 = []; apply(v, 'stun', 1, { turn: 1, rng: () => 0.99, ev: ev2, by: x });
    ok(mustSkip(v), '의지 굴림이 안 되면 기절');
    const w = mk('foe', 'flower_grass'); selfBuff(w, 'will', { turn: 1, ev: [] }); apply(w, 'shock', 1, ctx(x, 1, []));
    ok(!shockRoll(w, { turn: 1, rng: () => 0, ev: [] }) && !w.eff.shock && !mustSkip(w), '의지가 마비를 막으면 감전도 사라짐'); }
  // 쓸 수 있는 행동이 없어 쉬면(BLOCKED) 다음 턴 면역
  { const z = mk('me', 'gaia'), v = mk('foe', 'flower_grass');
    const r = resolveTurn(z, v, HIT, BLOCKED, fixed(0.5), { turn: 1 });
    ok(r.events.some(e => e.t === 'skip' && e.who === 'foe' && e.src === 'blocked') && v.eff.immune, '다 막혀 쉬면 다음 턴 면역'); }
}
// ── 9-6. 제한 — 봉인 · 속박 · 도발(엑셀 v10 효과 분류 27~29행) ──
{
  const x = mk('me', 'gaia');
  // 봉인: 기본기도 무작위로 고름 · 다음 턴 그 기술 못 씀 · 불에 안 풀림
  const s1 = mk('foe', 'flower_grass'); s1.energy = 0; apply(s1, 'seal', 1, { turn: 1, rng: () => 0, ev: [], by: x });
  ok(s1.eff.seal && s1.eff.seal.skill === 'basic' && !canUse(s1, sk(s1, 'basic')), '봉인은 기본기(평타)도 막을 수 있음');
  const fe = []; onHit(mk('me', 'cactus_fire'), s1, sk(mk('me', 'cactus_fire'), 's1'), { turn: 1, rng: makeRng(1), ev: fe });
  ok(s1.eff.seal, '불에 맞아도 봉인은 안 풀림');
  // 속박: 다음 1턴 교체 금지 · 불에 안 풀림 · 같은 식물은 교체로 나갔다 들어오기 전까지 한 번만
  const team = () => { const me = ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe = ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)); return makeTeamBattle({ me, foe, seed: 21, swOrder: true }); };
  { const B = team(); apply(B.me, 'root', 1, ctx(B.foe, B.turn, []));
    ok(canSwitch(B.me, B.turn) && !canSwitch(B.me, B.turn + 1), '속박은 걸린 턴이 아니라 다음 턴 교체를 막음');
    onHit(mk('foe', 'cactus_fire'), B.me, sk(mk('foe', 'cactus_fire'), 's1'), { turn: B.turn, rng: makeRng(1), ev: [] });
    ok(B.me.eff.root, '불에 맞아도 속박은 안 풀림');
    expire(B.me, B.turn + 1, []); ok(!B.me.eff.root, '다음 턴 끝에 풀림');
    const ev = []; apply(B.me, 'root', 1, ctx(B.foe, B.turn + 2, ev));
    ok(!B.me.eff.root && ev.some(e => e.t === 'resist' && e.why === 'once'), '풀린 뒤 다시 걸어도 안 걸림(교체 전까지 한 번)'); }
  { const B = team(); B.me.spd = 1; B.foe.spd = 99;
    const ROOT = { id: 'grab', name: '붙잡기', act: 'attack', power: 1, cost: 0, cats: ['attack'], inflict: { id: 'root' } };
    const cur = B.me; playTurn3(B, { kind: 'switch', to: 1 }, { kind: 'skill', skill: ROOT });
    ok(B.me !== cur, '속박이 걸린 그 턴의 늦은 교체는 됨(이미 고른 교체)'); }
  { const B = team(); const u = B.me; apply(u, 'root', 1, ctx(B.foe, 1, [])); expire(u, 2, []);
    playTurn3(B, { kind: 'switch', to: 1 }); playTurn3(B, { kind: 'switch', to: 0 });
    apply(u, 'root', 1, ctx(B.foe, B.turn, []));
    ok(B.me === u && u.eff.root, '교체로 나갔다 들어오면 다시 걸림'); }
  // 1:1에서 속박 → 봉인으로
  { const Bt = makeBattle({ me: mk('me', 'gaia'), foe: mk('foe', 'flower_grass'), seed: 3 });
    apply(Bt.foe, 'root', 1, { turn: 1, rng: () => 0, ev: [], by: Bt.me });
    ok(!Bt.foe.eff.root && Bt.foe.eff.seal, '1:1에서는 속박 대신 봉인(다음 1턴)'); }
  // 도발: 다음 1턴 공격 기술만 · 교체 금지
  { const t = mk('foe', 'flower_grass'); t.energy = 8; apply(t, 'taunt', 1, ctx(x, 1, []));
    const buff = { id: 'bf', act: 'buff', cost: 0, self: 'atkUp' }, atkBuff = { id: 'ab', act: 'attack', power: 10, cost: 0, self: 'atkUp' };
    ok(!canUse(t, buff) && !canUse(t, sk(t, 'sun')) && canUse(t, atkBuff) && canUse(t, sk(t, 's2')), '도발 = 공격 기술만(공격 + 버프는 됨 · 버프 · 광합성은 못 씀)');
    ok(canSwitch(t, 1) && !canSwitch(t, 2), '도발은 다음 턴 교체도 막음'); }
  // 도발 + 햇빛 0 + 평타 봉인 = 쓸 게 없어 쉼 → 다음 턴 면역
  { const t = mk('foe', 'flower_grass'); t.energy = 0; apply(t, 'taunt', 1, ctx(x, 1, [])); apply(t, 'seal', 1, { turn: 1, rng: () => 0, ev: [], by: x });
    ok(firstOk(t) === BLOCKED, '도발 중 햇빛이 없고 평타도 봉인되면 쓸 행동이 없음');
    const r = resolveTurn(x, t, x.kit[0], firstOk(t), fixed(0.5), { turn: 2 });
    ok(r.events.some(e => e.t === 'skip' && e.who === 'foe' && e.src === 'blocked') && t.eff.immune, '그 턴 쉬고 다음 턴 면역'); }
  // 의지가 제한 셋을 막음(굴림 0)
  { const w = mk('foe', 'flower_grass'); selfBuff(w, 'will', { turn: 1, ev: [] });
    const ev = []; for (const id of ['seal', 'root', 'taunt']) apply(w, id, 1, { turn: 1, rng: () => 0, ev, by: x });
    ok(!w.eff.seal && !w.eff.root && !w.eff.taunt && ev.filter(e => e.t === 'resist' && e.why === 'will').length === 3, '의지 = 봉인 · 속박 · 도발도 확률로 막음'); }
}
// ── 9-7. 강풍 환경 · 대기석 진행(엑셀 v10 38행 · 검토 대기 B10) ──
{
  const team = (seed = 31) => { const me = ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe = ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)); return makeTeamBattle({ me, foe, seed, ownSun: true }); };
  // 강풍: 켠 편의 상대 쪽 앞 식물 공격 빗나감 +12 · 지금 2턴 · 교체하면 새 앞 식물로 · 켜져 있는 동안 다시 켜도 안 늘어남
  { const B = team(), x = B.foe; apply(B.me, 'gale', 1, ctx(x, 1, []));
    const t1 = resolveTurn(B.me, mk('foe', 'aqua'), B.me.kit[0], REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').table;
    const t0 = resolveTurn(mk('me', 'flower_grass'), mk('foe', 'aqua'), mk('me', 'flower_grass').kit[0], REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit').table;
    ok(t1.miss === t0.miss + 12 && B.me.eff.gale.env, '강풍 = 그 쪽 앞 식물 공격 빗나감 +12(환경)');
    apply(B.me, 'gale', 1, ctx(x, 2, []));
    ok(B.me.eff.gale.exp === 2, '켜져 있는 동안 같은 편이 다시 켜도 기간이 안 늘어남');
    const out = B.me; playTurn3(B, { kind: 'switch', to: 1 });
    ok(!out.eff.gale && B.me.eff.gale, '교체하면 강풍은 새 앞 식물에게(대기석 제외)');
    expire(B.me, 2, []); ok(!B.me.eff.gale, '지금 2턴 = 1턴에 켜면 2턴 끝에 꺼짐'); }
  // 대기석: 화상 · 독이 턴 끝마다 깎이고 재생은 차고 포자가 핌 · 능력치 겹 시간도 감
  { const B = team(); const bench = B.team.me[1];
    apply(bench, 'poison', 1, ctx(B.foe, 1, [])); selfBuff(bench, 'atkUp', { turn: 1, ev: [] }); apply(bench, 'spore', 1, ctx(B.foe, 1, []), { delay: 0 });   // 대기석 = 엠버캑터(불 — 화상 면역이라 독)
    const h0 = bench.hp, t = playTurn3(B, { kind: 'skill', skill: B.me.kit[0] });
    ok(bench.hp < h0 && t.events.some(e => e.t === 'tick' && e.bench && e.idx === 1) && t.events.some(e => e.t === 'bloom' && e.bench), '대기석에서도 독 피해 · 포자가 핌(사건에 bench 표시)');
    for (let i = 0; i < 5 && !B.over; i++) playTurn3(B, { kind: 'skill', skill: B.me.kit[0] });
    ok(!bench.eff.atkUp && !bench.eff.poison, '대기석에서도 시간이 가 활력이 끝나고 독이 줄어 사라짐'); }
  { const B = team(); const bench = B.team.me[2]; bench.hp = 1; apply(bench, 'poison', 3, ctx(B.foe, 1, []));
    const front = B.me, t = playTurn3(B, { kind: 'skill', skill: B.me.kit[0] });
    const f = t.events.find(e => e.t === 'faint' && e.bench);
    ok(bench.hp === 0 && f && f.idx === 2 && B.me === front && front.hp > 0 && !B.over, '대기석에서 쓰러져도 앞 식물은 그대로(쓰러짐 사건 = bench)'); }
  // 기생: 건 식물이 대기석에 있어도 회복(교체 뒤 연결은 보류 — 지금 동작)
  { const B = team(); const caster = B.team.foe[0]; caster.hp = 50; apply(B.me, 'leech', 1, ctx(caster, 1, []));
    B.foe = B.team.foe[1]; B.act.foe = 1;
    const t = playTurn3(B, { kind: 'skill', skill: B.me.kit[0] }, { kind: 'skill', skill: B.foe.kit[0] });
    ok(caster.hp > 50 && t.events.some(e => e.t === 'drain' && e.heal > 0), '기생 = 건 식물이 대기석에 있어도 회복'); }
}
// ── 9-3. 능력치 겹(엑셀 v10 효과 분류 9~18행): 겹마다 지금 5턴 · 따로 만료 · 교체해도 남음 · 정화로 안 지워짐 ──
{
  const sb = (u, id, t = 1) => selfBuff(u, id, { turn: t, ev: [] });
  const hitOf = (x, y, s = x.kit[0]) => resolveTurn(x, y, s, REST, fixed(0.5), { turn: 1 }).events.find(e => e.t === 'hit');
  const x = mk('foe', 'aqua');
  const u = mk('me', 'gaia'); sb(u, 'atkUp'); const one = hitOf(u, mk('foe', 'aqua')).dmg;
  sb(u, 'atkUp'); const two = hitOf(u, mk('foe', 'aqua')).dmg;
  ok(u.eff.atkUp && u.eff.atkUp.n === 2 && two > one, `활력 두 겹 = 한 겹보다 셈(${one} → ${two})`);
  const w = mk('me', 'gaia'); sb(w, 'atkUp', 1); sb(w, 'atkUp', 3);
  expire(w, 4, []); ok(w.eff.atkUp && w.eff.atkUp.n === 2, '1턴에 건 겹은 4턴 끝엔 남음(지금 5턴)');
  expire(w, 5, []); ok(w.eff.atkUp && w.eff.atkUp.n === 1, '1턴에 건 겹은 5턴 끝에 사라지고 3턴에 건 겹은 남음');
  expire(w, 7, []); ok(!w.eff.atkUp, '3턴에 건 겹은 7턴 끝에 사라짐');
  const d = mk('foe', 'aqua'); apply(d, 'atkDown', 1, ctx(u, 1, [])); sb(d, 'purify');
  ok(d.eff.atkDown && d.eff.atkDown.n === 1, '쇠약은 정화로 안 지워짐(디버프 제거 불가)');
  const lo = mk('me', 'gaia'); for (let i = 0; i < 7; i++) apply(lo, 'atkDown', 1, ctx(x, 1, []));
  ok(atkK(lo) >= 0.2 && atkK(lo) < 0.3, `쇠약 일곱 겹이어도 공격 배율 0.2 아래로 안 감(${atkK(lo).toFixed(2)})`);
  const c0 = hitOf(mk('me', 'gaia'), mk('foe', 'aqua')).table, cu = mk('me', 'gaia'); sb(cu, 'critUp');
  ok(hitOf(cu, mk('foe', 'aqua')).table.crit === c0.crit + 10, '예리 한 겹 = 치명 +10');
  const au = mk('me', 'gaia'); apply(au, 'accDown', 1, ctx(x, 1, []));
  ok(hitOf(au, mk('foe', 'aqua')).table.miss === c0.miss + 8, '교란 한 겹 = 내 공격 빗나감 +8');
  const me = ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe = ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k));
  const B = makeTeamBattle({ me, foe, seed: 9 }); sb(B.me, 'atkUp', B.turn); const out = B.me;
  playTurn3(B, { kind: 'switch', to: 1 });
  ok(B.me !== out && out.eff.atkUp && out.eff.atkUp.n === 1, '교체로 나가도 활력 남음');
}
// ── 9-8. 기술 표 옮기기 검사(2026-10-23 계획 Task 8): 모든 기술의 효과 이름이 엑셀 v10 효과 표(FX)에 있고 옛 이름이 없음 · RULES_VER 6 ──
{
  const SELF_OK = new Set(['purify', 'flourish', 'stealth', 'aim']);
  const OLDS = ['rage', 'wall', 'haste', 'focus', 'thorns', 'clone', 'weak', 'corrode', 'bind', 'shade'];
  const all = [...Object.values(CSK), ...Object.keys(SPECIES).flatMap(k => kitOf(k))];
  const badSelf = all.filter(s => [s.self, s.also].some(b => b && !(FX[b] || SELF_OK.has(b))));
  const badInf = all.filter(s => s.inflict && !FX[s.inflict.id]);
  const old = all.filter(s => [s.self, s.also, s.inflict && s.inflict.id].some(b => OLDS.includes(b)) || s.stealth === true);
  ok(!badSelf.length && !badInf.length, `기술 효과가 모두 효과 표에 있음(나에게 ${badSelf.map(s => s.id)} · 상대에게 ${badInf.map(s => s.id)})`);
  ok(!old.length, `옛 효과 이름이 남은 기술 없음(${old.map(s => s.id)})`);
  ok(all.filter(s => s.inflict && s.inflict.id === 'spore').every(s => s.inflict.delay >= 1 && s.inflict.n == null), '포자 기술 = 지연 턴(delay)으로');
  ok(CSK.u_ninja_2.self === 'stealth' && CSK.u_ninja_2.look === 'clone' && CSK.u_ninja_2.link && CSK.u_ninja_2.link.hits === 3 && CSK.u_ninja_3b.self === 'stealth' && CSK.u_ninja_3b.link.ambush && CSK.u_ninja_3b.act === 'buff', '닌자바인 은신 기술 둘 = 공통 은신 + 이어 공격(연타 · 기습)');
  ok(RULES_VER === 6, `RULES_VER = 6(${RULES_VER})`);
  // 기술에 적힌 효과 값(지연 · 기간 · 이름)이 실제로 걸 때 쓰임
  const hitWith = inf => { const a = mk('me', 'gaia'), b = mk('foe', 'aqua'); resolveTurn(a, b, { ...a.kit[0], inflict: inf }, REST, fixed(0.5), { turn: 1 }); return b; };
  const sp1 = hitWith({ id: 'spore', delay: 1 }), dk = hitWith({ id: 'dark', turns: 1, look: 'shade' }), gl = hitWith({ id: 'gale', turns: 3 });
  ok(sp1.eff.spore && sp1.eff.spore.left[0] === 2, `기술의 포자 지연 1턴이 걸 때 쓰임(${sp1.eff.spore && sp1.eff.spore.left})`);
  ok(listOf(dk).some(x => x.id === 'shade'), '기술의 암실 이름(그늘)이 걸 때 쓰임');
  ok(gl.eff.gale && gl.eff.gale.exp === 3, `기술의 강풍 기간 3턴이 걸 때 쓰임(${gl.eff.gale && gl.eff.gale.exp})`);
  ok(!OLD_ || !Object.keys(OLD_).length, '옛 이름 바꿈표를 비움');
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
