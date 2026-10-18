// v2 전투 규칙 시험 — node --test v2/src/battle/rules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, pityLimit, rollPity, pityRate, initiativeChance, hitTable, judgeHit, resolveTurn, RULES } from './rules.js';

// 정해 둔 값을 차례로 내는 난수(순서 판정 시험용)
const script = vals => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };
const unit = (id, o = {}) => ({ id, spd: 30, atk: 50, def: 0, acc: 0, eva: 0, crit: 10, hp: 1000, ...o });
const STRIKE = { id: 'strike', act: 'attack', power: 50, contact: true };
const GUARD = { id: 'guard', act: 'guard', guardMult: 0.5 };
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

test('명중 표: 합 100, 회피 자세는 빗나감·스침을 늘리고 치명부터 줄임, 범위 공격은 확정 명중(2026-10-18)', () => {
  const a = unit('a', { crit: 10 }), d = unit('d');
  const t0 = hitTable(a, d);
  assert.deepEqual(t0, { miss: 6, graze: 12, hit: 72, crit: 10 });
  const t1 = hitTable(a, d, { shift: EVADE.shift });
  assert.equal(t1.miss + t1.graze + t1.hit + t1.crit, 100);
  assert.deepEqual(t1, { miss: 26, graze: 27, hit: 47, crit: 0 });
  const t2 = hitTable(a, d, { shift: EVADE.shift, area: true });
  assert.deepEqual(t2, { miss: 0, graze: 0, hit: 90, crit: 10 });   // 회피 자세여도 빗나감 · 스침 없음, 치명은 그대로
});

test('연속 빗나감 보정: 빗나감 70%(적중 30%)면 3번 빗나간 뒤 정타 확정', () => {
  const t = { miss: 70, graze: 0, hit: 30, crit: 0 }, always = () => 0;   // 굴림 0 = 늘 빗나감
  let s = 0, r;
  for (let i = 0; i < 3; i++) { r = judgeHit(t, s, always); assert.equal(r.tier, 'miss'); s = r.missStreak; }
  r = judgeHit(t, s, always);
  assert.equal(r.tier, 'hit'); assert.equal(r.forced, true);
});

test('순서 판정: 선공 공격 → 후공 방어 = 방어 성립(피해 절반)', () => {
  const A = unit('A'), B = unit('B');
  const { events } = resolveTurn(A, B, STRIKE, GUARD, script([0, 0.5]));   // 0 → A 선공, 0.5 → 정타
  const hit = events.find(e => e.t === 'hit');
  assert.equal(events[0].who, 'A'); assert.equal(hit.guard, true);
  const full = unit('C'), plain = resolveTurn(unit('A2'), full, STRIKE, { act: 'other', id: 'x' }, script([0, 0.5])).events.find(e => e.t === 'hit');
  assert.equal(hit.dmg, Math.round(plain.dmg * 0.5));
});

test('순서 판정: 선공 방어 → 후공 공격 = 방어 헛됨(판정이 먼저라)', () => {
  const A = unit('A'), B = unit('B');
  const { events } = resolveTurn(A, B, GUARD, STRIKE, script([0, 0.5]));
  const st = events.find(e => e.t === 'stance'), hit = events.find(e => e.t === 'hit');
  assert.equal(st.active, false); assert.equal(hit.guard, false);
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

test('같은 자세를 연달아 쓰면 효과 절반', () => {
  const A = unit('A', { spd: 90 }), B = unit('B', { spd: 20 });   // A가 거의 늘 선공(보정에 안 걸리게)
  resolveTurn(A, B, STRIKE, GUARD, script([0, 0.5]));
  const ev = resolveTurn(A, B, STRIKE, GUARD, script([0, 0.5])).events;
  const plain = resolveTurn(unit('A2'), unit('C'), STRIKE, { act: 'other', id: 'x' }, script([0, 0.5])).events.find(e => e.t === 'hit');
  assert.equal(ev.find(e => e.t === 'hit').dmg, Math.round(plain.dmg * 0.75));
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
