// v2 전투 규칙 시험 — node --test v2/src/battle/rules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, pityLimit, rollPity, pityRate, initiativeChance, hitTable, judgeHit, resolveTurn, RULES } from './rules.js';
import { BASICS } from './model.js';
import { selfBuff, expire, has } from './status.js';

// 정해 둔 값을 차례로 내는 난수(순서 판정 시험용)
const script = vals => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };
const unit = (id, o = {}) => ({ id, spd: 30, atk: 50, def: 0, acc: 0, eva: 0, crit: 10, hp: 1000, ...o });
const STRIKE = { id: 'strike', act: 'attack', power: 50, contact: true };
const GUARD = { id: 'guard', act: 'guard', guardDefMult: 4, guardHits: 1 };
const EVADE = { id: 'evade', act: 'evade', shift: { miss: 20, graze: 15 } };

test('불운 보정 상한: 10%면 9번 실패 뒤 확정', () => {
  assert.equal(pityLimit(0.1), 9);
  assert.equal(pityLimit(0.25), 3);
  assert.equal(pityLimit(0.3), 3);
  assert.equal(pityLimit(0.5), 1);
  assert.equal(pityLimit(0.92), 1);
  assert.equal(pityLimit(1), 0);
  assert.equal(pityLimit(0), Infinity);
});

test('불운 보정: 10만 번 굴려도 연속 실패가 상한을 넘지 않고, 실제 평균은 보정 계산과 맞음', () => {
  for (const p of [0.1, 0.25, 0.3, 0.5]) {
    const rng = makeRng(42 + Math.round(p * 100));
    let streak = 0, worst = 0, ok = 0;
    for (let i = 0; i < 100000; i++) { const r = rollPity(p, streak, rng); streak = r.streak; worst = Math.max(worst, streak); if (r.ok) ok++; }
    assert.ok(worst <= pityLimit(p), `p=${p} 최악 연속 실패 ${worst} > ${pityLimit(p)}`);
    assert.ok(Math.abs(ok / 100000 - pityRate(p)) < 0.01, `p=${p} 실제 ${ok / 100000} · 계산 ${pityRate(p)}`);
  }
});

test('선공 확률: 같은 기동 50%, 빠를수록 높지만 92%를 넘지 않음', () => {
  assert.equal(initiativeChance(30, 30), 0.5);
  assert.ok(Math.abs(initiativeChance(30, 25) - 0.633) < 0.01);
  assert.equal(initiativeChance(90, 20), RULES.initMax);
  assert.equal(initiativeChance(20, 90), RULES.initMin);
});

test('명중 표: 합 100, 회피 자세는 빗나감·스침을 늘리고 치명부터 줄임, 범위 공격은 확정 명중 없이 회피 자세 효과 절반(엑셀 v10)', () => {
  const a = unit('a', { crit: 10 }), d = unit('d');
  const t0 = hitTable(a, d);
  assert.deepEqual(t0, { miss: 6, graze: 12, hit: 72, crit: 10 });
  const t1 = hitTable(a, d, { shift: EVADE.shift });
  assert.equal(t1.miss + t1.graze + t1.hit + t1.crit, 100);
  assert.deepEqual(t1, { miss: 26, graze: 27, hit: 47, crit: 0 });
  const t2 = hitTable(a, d, { shift: EVADE.shift, area: true });
  assert.deepEqual(t2, { miss: 16, graze: 20, hit: 64, crit: 0 });   // 범위 = 보통 판정표(빗나감 · 스침 있음) + 회피 자세가 옮기는 칸 절반
  assert.deepEqual(hitTable(a, d, { area: true }), t0);
});

test('연속 빗나감 보정: 빗나감 70%(적중 30%)면 3번 빗나간 뒤 정타 확정', () => {
  const t = { miss: 70, graze: 0, hit: 30, crit: 0 }, always = () => 0;   // 굴림 0 = 늘 빗나감
  let s = 0, r;
  for (let i = 0; i < 3; i++) { r = judgeHit(t, s, always); assert.equal(r.tier, 'miss'); s = r.missStreak; }
  r = judgeHit(t, s, always);
  assert.equal(r.tier, 'hit'); assert.equal(r.forced, true);
});

test('순서 판정: 후공 방어도 방어력 4배로 막고 적중 뒤 해제', () => {
  const A = unit('A'), B = unit('B', { def: 25 });
  const { events } = resolveTurn(A, B, STRIKE, GUARD, script([0, 0.5]));   // 0 → A 선공, 0.5 → 정타
  const hit = events.find(e => e.t === 'hit');
  assert.equal(events[0].who, 'A'); assert.equal(hit.guard, true);
  assert.equal(hit.dmg, 25);
  assert.equal(B.def, 25);
  assert.deepEqual(events.filter(e => e.t === 'stance' || e.t === 'hit' || e.t === 'guardBreak').map(e => e.t), ['stance', 'hit']);   // 방어는 그 턴 내내(엑셀 v10) — 맞아도 안 풀림
});

test('순서 판정: 선공 방어도 같은 배율로 막음', () => {
  const A = unit('A', { def: 25 }), B = unit('B');
  const { events } = resolveTurn(A, B, GUARD, STRIKE, script([0, 0.5]));
  const st = events.find(e => e.t === 'stance'), hit = events.find(e => e.t === 'hit');
  assert.equal(st.active, true); assert.equal(hit.guard, true); assert.equal(hit.dmg, 25);
});

test('순서 판정: 회피는 선공·후공 모두 성립(표가 옮겨짐)', () => {
  const A = unit('A'), B = unit('B');
  let ev = resolveTurn(A, B, EVADE, STRIKE, script([0, 0.5])).events;   // 선공 회피 → 후공 공격
  assert.equal(ev.find(e => e.t === 'stance').active, true);
  assert.equal(ev.find(e => e.t === 'hit').evade, true);
  ev = resolveTurn(unit('A'), unit('B'), STRIKE, EVADE, script([0, 0.5])).events;   // 선공 공격 → 후공 회피
  assert.equal(ev.find(e => e.t === 'stance').active, true);
  assert.equal(ev.find(e => e.t === 'hit').evade, true);
});

test('순서 판정: 둘 다 공격 = 선공이 먼저 때림, 선공이 쓰러뜨리면 후공은 못 침', () => {
  const A = unit('A', { atk: 5000 }), B = unit('B', { hp: 10 });
  const { events } = resolveTurn(A, B, STRIKE, STRIKE, script([0, 0.5, 0.5]));
  const hits = events.filter(e => e.t === 'hit');
  assert.equal(hits.length, 1); assert.equal(hits[0].who, 'A'); assert.equal(B.hp, 0);
});

test('흘리기 반격: 회피가 성립하고 빗나감·스침이면 짧게 되받아침(범위·원거리는 못 받아침)', () => {
  const RIP = { id: 'riposte', act: 'evade', shift: { miss: 15, graze: 25 }, counter: 15 };
  const A = unit('A'), B = unit('B');
  const ev = resolveTurn(B, A, RIP, STRIKE, script([0, 0.01])).events;   // B 선공 회피, A 공격 굴림 1 → 빗나감
  assert.ok(ev.some(e => e.t === 'counter' && e.who === 'B'));
  const ev2 = resolveTurn(unit('B'), unit('A'), RIP, { ...STRIKE, area: true }, script([0, 0.01])).events;
  assert.ok(!ev2.some(e => e.t === 'counter'));
});

test('방어를 연달아 쓰면 추가 방어가 절반(4배 → 2.5배)', () => {
  const A = unit('A', { spd: 90 }), B = unit('B', { spd: 20, def: 25 });
  resolveTurn(A, B, STRIKE, GUARD, script([0, 0.5]));
  const ev = resolveTurn(A, B, STRIKE, GUARD, script([0, 0.5])).events;
  assert.equal(ev.find(e => e.t === 'hit').dmg, 31);
});

test('방어는 고정 피해 감소가 아님: 방어 0 · 상한 · 시듦(방어 −25% 한 겹)', () => {
  for (const [def, eff, want] of [[0, {}, 50], [1000, {}, 13], [25, { defDown: { n: 1, s: [{ v: 0.25, exp: 9 }] } }, 29]]) {
    const ev = resolveTurn(unit('a'), unit('b', { def, eff }), STRIKE, GUARD, script([0, 0.5])).events;
    assert.equal(ev.find(e => e.t === 'hit').dmg, want);
  }
});

test('빗나감은 방어를 깨거나 막기 보상을 주지 않음', () => {
  const ev = resolveTurn(unit('a'), unit('b', { def: 25 }), STRIKE, { ...GUARD, counterPct: 0.5, energyOnBlock: 1 }, script([0, 0])).events;
  assert.equal(ev.find(e => e.t === 'hit').tier, 'miss');
  assert.equal(ev.some(e => ['guardBreak', 'counter', 'energy'].includes(e.t)), false);
});

test('스침 · 보호막에 전부 흡수된 적중도 방어가 막은 몫 그대로(방어는 그 턴 내내)', () => {
  for (const [roll, eff, want, absorb] of [[0.1, {}, 13, 0], [0.5, { shield: { hp: 100 } }, 0, 25]]) {
    const ev = resolveTurn(unit('a'), unit('b', { def: 25, eff }), STRIKE, GUARD, script([0, roll])).events;
    const hit = ev.find(e => e.t === 'hit');
    assert.equal(hit.dmg, want); assert.equal(hit.absorb, absorb);
    assert.equal(ev.filter(e => e.t === 'guardBreak').length, 0);
  }
});

test('방어는 다음 턴에 남지 않고 원래 방어 수치도 보존', () => {
  const a = unit('a'), b = unit('b', { def: 25 });
  resolveTurn(a, b, STRIKE, GUARD, script([0, 0.5]));
  const hit = resolveTurn(a, b, STRIKE, { act: 'other' }, script([0, 0.5])).events.find(e => e.t === 'hit');
  assert.equal(hit.guard, false); assert.equal(hit.dmg, 40); assert.equal(b.def, 25);
});

test('실제 기본기 방어와 여러 타용 태세: 치명 막기 · 타수 잔여', () => {
  const basic = BASICS.find(s => s.id === 'guard');
  const ev = resolveTurn(unit('a'), unit('b', { def: 25 }), STRIKE, basic, script([0, 0.99])).events;
  const hit = ev.find(e => e.t === 'hit');
  assert.equal(hit.tier, 'hit'); assert.equal(hit.dmg, 25);
  const two = resolveTurn(unit('c'), unit('d', { def: 25 }), STRIKE, { ...basic, guardHits: 2 }, script([0, 0.5])).events;
  assert.equal(two.find(e => e.t === 'hit').dmg, 25);
  assert.equal(two.some(e => e.t === 'guardBreak'), false);
});

test('쉬는 차례에는 선공·후공 모두 방어태세가 성립하지 않음', () => {
  for (const order of [0, 0.99]) {
    const ev = resolveTurn(unit('a'), unit('b', { def: 25, eff: { skip: { src: 'stun' } } }), STRIKE, GUARD, script([order, 0.5]), { turn: 1 }).events;
    const hit = ev.find(e => e.t === 'hit');
    assert.equal(hit.guard, false); assert.equal(hit.dmg, 40);
    assert.equal(ev.some(e => e.t === 'stance' || e.t === 'guardBreak'), false);
  }
});

test('막은 뒤 쓰러져도 태세가 다시 켜지거나 행동하지 않음', () => {
  const ev = resolveTurn(unit('a'), unit('b', { hp: 10, def: 25 }), STRIKE, GUARD, script([0, 0.5])).events;
  assert.deepEqual(ev.filter(e => ['stance', 'hit', 'guardBreak', 'faint'].includes(e.t)).map(e => e.t), ['stance', 'hit', 'faint']);
});

test('선공: 같은 기동끼리 번갈아 고정되지 않음(한 번 여유) — 1000턴 중 같은 쪽이 연달아 먼저 가는 일이 있어야 함', () => {
  const A = unit('A'), B = unit('B'), rng = makeRng(7);
  let prev = null, same = 0;
  for (let i = 0; i < 1000; i++) { const f = resolveTurn(A, B, { act: 'other', id: 'x' }, { act: 'other', id: 'y' }, rng).first; if (f === prev) same++; prev = f; }
  assert.ok(same > 150, `연달아 먼저 ${same}번`);
});

test('선공 불운 보정: 느린 쪽(먼저 갈 확률 낮음)도 계속 밀리면 결국 먼저 감', () => {
  const A = unit('A', { spd: 40 }), B = unit('B', { spd: 25 });
  const pB = 1 - initiativeChance(40, 25), lim = Math.max(1, Math.ceil(1 / pB) - 1) + RULES.initPitySlack;
  const always = () => 0;   // 굴림 0 = 늘 A 선공(확률상)
  let firsts = [];
  for (let i = 0; i <= lim; i++) firsts.push(resolveTurn(A, B, STRIKE, STRIKE, always).first);
  assert.equal(firsts[lim], 'B', `B는 ${lim}번 밀린 뒤 먼저: ${firsts.join(',')}`);
});

// ── 엑셀 v10 공격 한 차례(2026-10-23 계획 Task 6) ──
const MULTI = { id: 'multi', act: 'attack', power: 30, hits: 3, contact: true };
test('방어태세는 그 턴 연타 모든 타를 막음 · 맞아도 안 풀림', () => {
  const ev = resolveTurn(unit('a'), unit('b', { def: 25 }), MULTI, GUARD, script([0, 0.5, 0.5, 0.5])).events;
  const hs = ev.filter(e => e.t === 'hit');
  assert.equal(hs.length, 3); assert.ok(hs.every(h => h.guard && h.dmg === 15)); assert.ok(!ev.some(e => e.t === 'guardBreak'));
});
test('반사: 그 턴 처음 맞는 한 타만 30% · 멀리 · 광역도 · 빗나감은 소모하지 않음', () => {
  const SPINES = { id: 'spines', act: 'buff', cost: 0, reflect: true };
  for (const att of [MULTI, { ...MULTI, ranged: true, contact: false }, { ...MULTI, area: true }]) {
    const A = unit('a'), ev = resolveTurn(A, unit('b'), att, SPINES, script([0, 0.5, 0.5, 0.5])).events;
    const rf = ev.filter(e => e.t === 'reflect'), first = ev.find(e => e.t === 'hit' && e.tier !== 'miss');
    assert.equal(rf.length, 1, JSON.stringify(att)); assert.equal(rf[0].dmg, Math.max(1, Math.round((first.dmg + first.absorb) * 0.3)));
  }
  const ev2 = resolveTurn(unit('a'), unit('b'), MULTI, SPINES, script([0, 0.01, 0.5, 0.5])).events;
  const h2 = ev2.filter(e => e.t === 'hit');
  assert.equal(h2[0].tier, 'miss'); assert.equal(ev2.filter(e => e.t === 'reflect').length, 1);
  assert.ok(ev2.findIndex(e => e.t === 'reflect') > ev2.indexOf(h2[1]));
});
test('보호막: 상대 공격 기술 한 번의 모든 타를 남은 양까지 · 그 기술이 끝나면 잔량 제거 · 빗나감엔 남음 · 턴으로 안 끝남', () => {
  const b60 = unit('b', { eff: { shield: { hp: 60 } } }), e60 = resolveTurn(unit('a'), b60, MULTI, { act: 'other' }, script([0, 0.5, 0.5, 0.5])).events.filter(e => e.t === 'hit');
  assert.equal(e60.reduce((s, h) => s + h.absorb, 0), 60); assert.equal(e60.reduce((s, h) => s + h.dmg, 0), 30); assert.ok(!has(b60, 'shield'));
  const b100 = unit('b', { eff: { shield: { hp: 100 } } }), e100 = resolveTurn(unit('a'), b100, MULTI, { act: 'other' }, script([0, 0.5, 0.5, 0.5])).events.filter(e => e.t === 'hit');
  assert.equal(e100.reduce((s, h) => s + h.absorb, 0), 90); assert.ok(!has(b100, 'shield'));
  const bm = unit('b', { eff: { shield: { hp: 100 } } }); resolveTurn(unit('a'), bm, MULTI, { act: 'other' }, script([0, 0, 0, 0]));
  assert.equal(bm.eff.shield.hp, 100);
  const bt = unit('b'); selfBuff(bt, 'shield', { turn: 1, ev: [] }); expire(bt, 9, []);
  assert.ok(has(bt, 'shield'));
});
test('조준(옛 집중): 다음 공격 기술 한 번의 모든 타 치명 +25 · 기술이 끝나면 사라짐 · 쉬면 사라짐', () => {
  const A = unit('a'); selfBuff(A, 'aim', { turn: 1, ev: [] });
  const hs = resolveTurn(A, unit('b'), MULTI, { act: 'other' }, script([0, 0.5, 0.5, 0.5])).events.filter(e => e.t === 'hit');
  assert.ok(hs.length === 3 && hs.every(h => h.table.crit === 35), hs.map(h => h.table.crit).join());
  assert.ok(!has(A, 'aim'));
  const R = unit('a', { eff: { skip: { src: 'stun' } } }); selfBuff(R, 'aim', { turn: 1, ev: [] });
  resolveTurn(R, unit('b'), STRIKE, { act: 'other' }, script([0, 0.5]));
  assert.ok(!has(R, 'aim'));
});
test('범위 공격은 은신을 가리지 못함 · 맞으면 은신이 풀림', () => {
  const F = unit('f', { eff: { stealth: { look: 'stealth', link: null } } });
  const ev = resolveTurn(unit('a'), F, { ...STRIKE, area: true }, { act: 'other' }, script([0, 0.5])).events;
  const h = ev.find(e => e.t === 'hit');
  assert.ok(h.tier !== 'miss' && !h.veil); assert.ok(!has(F, 'stealth'));
});
const HIDE = { id: 'hide', name: '숨기', act: 'buff', cost: 0, self: 'stealth', early: true, link: { power: 40 } };
test('은신: 선공으로 숨고 상대 단일 공격을 다 피하면 바로 이어 공격 · 은신 소모', () => {
  const S = unit('s'), F = unit('f');
  const ev = resolveTurn(S, F, HIDE, STRIKE, script([0.5, 0.5, 0.5])).events;
  const hs = ev.filter(e => e.t === 'hit');
  assert.equal(hs[0].who, 'f'); assert.equal(hs[0].tier, 'miss'); assert.ok(hs[0].veil);
  assert.equal(hs[1].who, 's'); assert.ok(hs[1].link && hs[1].link.id === 'hide'); assert.ok(hs[1].dmg > 0);
  assert.ok(!has(S, 'stealth'));
});
test('은신: 후공으로 쓰면 그 턴 앞 공격은 못 피함 · 다음 턴까지 남아 피하면 이어 공격', () => {
  const S = unit('s'), F = unit('f');
  const e1 = resolveTurn(S, F, { ...HIDE, early: false }, { ...STRIKE, early: true }, script([0.5, 0.5])).events;
  assert.ok(e1.find(e => e.t === 'hit').tier !== 'miss'); assert.ok(has(S, 'stealth'));
  const e2 = resolveTurn(S, F, { act: 'other', id: 'wait' }, STRIKE, script([0.99, 0.5, 0.5])).events;
  const hs = e2.filter(e => e.t === 'hit');
  assert.equal(hs[0].tier, 'miss'); assert.ok(hs[1] && hs[1].link); assert.ok(!has(S, 'stealth'));
});
test('은신 중 내가 공격하면 은신이 풀리고 이어 공격은 없음 · 쉬면 풀림 · 화상 피해로는 안 풀림', () => {
  const S = unit('s', { spd: 99, eff: { stealth: { look: 'stealth', link: { power: 40 } } } }), F = unit('f', { spd: 1 });
  const ev = resolveTurn(S, F, STRIKE, { act: 'other' }, script([0, 0.5])).events;
  assert.ok(!has(S, 'stealth')); assert.ok(!ev.some(e => e.t === 'hit' && e.link));
  const R = unit('s', { eff: { skip: { src: 'stun' }, stealth: { look: 'stealth', link: null } } });
  resolveTurn(R, unit('f'), STRIKE, { act: 'other' }, script([0, 0.5]));
  assert.ok(!has(R, 'stealth'));
});

// ── 소환수 받기(엑셀 v10 50행 + 2026-10-21~22 확정) ──
const pup = (hp = 40) => ({ name: '새끼', hp, max: hp, def: 0, eva: 0, eff: {}, st: { miss: {}, critTaken: false } });
test('소환수: 단일 공격은 앞 소환수가 맞고 남는 피해는 주인에게 안 감', () => {
  const D = unit('d', { summons: [pup(20)] });
  const ev = resolveTurn(unit('a'), D, STRIKE, { act: 'other' }, script([0, 0.5])).events;
  assert.equal(D.hp, 1000); assert.equal(D.summons.length, 0); assert.ok(ev.some(e => e.t === 'summonBreak'));
  assert.ok(!ev.some(e => e.t === 'faint'));
});
test('소환수: 연타는 소환수가 깨진 뒤 남은 타를 주인이 맞음', () => {
  const D = unit('d', { summons: [pup(30)] });
  const hs = resolveTurn(unit('a'), D, MULTI, { act: 'other' }, script([0, 0.5, 0.5, 0.5])).events.filter(e => e.t === 'hit');
  assert.equal(hs[0].sum, 0); assert.equal(hs[1].sum, undefined); assert.equal(D.hp, 1000 - 60);
});
test('소환수: 광역은 소환수와 주인 모두 · 효과도 맞은 쪽에', () => {
  const D = unit('d', { summons: [pup(100)] });
  const AREA = { ...STRIKE, area: true, inflict: { id: 'burn' } };
  const hs = resolveTurn(unit('a'), D, AREA, { act: 'other' }, script([0, 0.5, 0.5])).events.filter(e => e.t === 'hit');
  assert.equal(hs.length, 2); assert.ok(D.hp < 1000 && D.summons[0].hp < 100);
  assert.ok(D.eff.burn && D.summons[0].eff.burn);
});
test('소환수: 보호막이 소환수보다 먼저 막음', () => {
  const D = unit('d', { summons: [pup(100)], eff: { shield: { hp: 30 } } });
  const h = resolveTurn(unit('a'), D, STRIKE, { act: 'other' }, script([0, 0.5])).events.find(e => e.t === 'hit');
  assert.equal(h.sum, 0); assert.equal(h.absorb, 30); assert.equal(D.summons[0].hp, 80); assert.ok(!D.eff.shield);
});

