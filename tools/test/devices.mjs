// 바닥 규칙 2단계 장치 시험(2026-10-18 — docs/superpowers/specs/2026-10-18-v2-species-identity-design.md §1)
//  방어구 · 관통 · 연타 · 은신 · 분신 · 순서 손잡이 — node tools/test/devices.mjs
import { resolveTurn, rollFirst, baseDamage } from '../../v2/src/battle/rules.js';
import { selfBuff, listOf, has, FX } from '../../v2/src/battle/status.js';
import { SKILLS } from '../../v2/src/game/catalog.js';

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const unit = (id, o = {}) => ({ id, name: id, hp: 300, max: 300, atk: 40, def: 30, spd: 30, acc: 0, eva: 0, crit: 0, energy: 5, energyMax: 8, eff: {}, ...o });
const seq = arr => { let i = 0; return () => arr[Math.min(i++, arr.length - 1)]; };   // 정해진 굴림
const atk = (o = {}) => ({ id: 'x', act: 'attack', power: 60, cost: 0, ...o });
const rest = { id: 'rest', act: 'skip', cost: 0 };
const hits = ev => ev.filter(e => e.t === 'hit');

// ── 방어구 ──
{
  const u = unit('a');
  selfBuff(u, 'armor', { turn: 1, ev: [] }); selfBuff(u, 'armor', { turn: 1, ev: [] });
  ok(u.eff.armor.hp === 90, `방어구 두 번 = 최대 체력 15% × 2 (${u.eff.armor.hp})`);
  for (let i = 0; i < 5; i++) selfBuff(u, 'armor', { turn: 1, ev: [] });
  ok(u.eff.armor.hp === 150, `방어구 상한 = 최대 체력 50% (${u.eff.armor.hp})`);
  ok(listOf(u).some(x => x.id === 'armor' && x.hp === 150), '효과 목록에 방어구 남은 양');
  const A = unit('a'), D = unit('d', { eff: { armor: { hp: 20 } } });
  const r = resolveTurn(A, D, atk(), rest, seq([0, 0.5, 0.5]), { turn: 1 });
  const h = hits(r.events)[0];
  ok(h && h.absorb === 20 && h.ab === 'armor' && !D.eff.armor && r.events.some(e => e.t === 'armorBreak'), '방어구가 먼저 막고 부서짐');
  const D2 = unit('d', { eff: { armor: { hp: 30 } } });
  resolveTurn(unit('a'), D2, atk({ id: 'm_smash', power: 10 }), rest, seq([0, 0.5, 0.5]), { turn: 1 });
  ok(D2.eff.armor && D2.eff.armor.hp < 30 - 6, `망치는 방어구를 더 깎음(남은 ${D2.eff.armor && D2.eff.armor.hp})`);
}
// ── 관통 ──
{
  const a = { atk: 50 }, d = { def: 100 };
  const n = baseDamage(a, d, { power: 100 }), p = baseDamage(a, { def: 70 }, { power: 100 });   // 관통은 한 턴 계산(hitDmg)이 방어를 줄여 넘김
  ok(Math.abs(n - 50) < 0.01, `방어 100 = 절반(${n})`);
  const A = unit('a'), D = unit('d', { def: 100 }), D2 = unit('d', { def: 100 });
  resolveTurn(A, D, atk({ power: 100 }), rest, seq([0, 0.5]), { turn: 1 });
  resolveTurn(unit('a'), D2, atk({ power: 100, pierce: 0.3 }), rest, seq([0, 0.5]), { turn: 1 });
  ok(D2.hp < D.hp, `관통 30% = 더 아픔(${300 - D.hp} → ${300 - D2.hp})`);
  ok(p > n, '관통 계산');
}
// ── 연타 ──
{
  const A = unit('a'), D = unit('d');
  const r = resolveTurn(A, D, atk({ power: 20, hits: 3, inflict: { id: 'weak' } }), rest, seq([0, 0.5]), { turn: 1 });
  const hs = hits(r.events);
  ok(hs.length === 3 && hs[2].n === 3 && hs[2].of === 3, `연타 = 타마다 사건(${hs.length})`);
  ok(r.events.filter(e => e.t === 'fx' && e.id === 'weak').length === 1, '효과는 첫 적중 한 번');
  // 연타는 불운 보정 없음: 계속 빗나감 굴림이면 끝까지 빗나감
  const B2 = unit('d'), r2 = resolveTurn(unit('a'), B2, atk({ power: 20, hits: 4 }), { id: 'evade', act: 'evade', cost: 0, shift: { miss: 15, graze: 10 } }, seq([0, 0.01]), { turn: 1 });
  ok(hits(r2.events).every(h => h.tier === 'miss') && B2.hp === 300, '연타 = 불운 보정 없음(넷 다 빗나갈 수 있음)');
  // 방어태세 1타만 막음
  const G = unit('d'), r3 = resolveTurn(unit('a'), G, atk({ power: 20, hits: 3 }), { id: 'guard', act: 'guard', cost: 0 }, seq([0, 0.5]), { turn: 1 });
  const g3 = hits(r3.events);
  ok(g3.length === 3 && g3[0].guard && !g3[1].guard && !g3[2].guard, '방어태세는 첫 타만 막음(연타의 천적 관계)');
}
// ── 은신 · 분신 · 순서 손잡이 ──
{
  const S = unit('s', { spd: 50 }), F = unit('f', { spd: 10 });
  const hide = atk({ id: 'h', power: 70, stealth: true, late: true });
  const r = resolveTurn(S, F, hide, atk({ power: 60 }), seq([0.5, 0.5, 0.5, 0.5]), { turn: 1 });
  ok(r.first === 'f', '나중(late) = 무조건 후공');
  const fh = hits(r.events);
  ok(fh[0].who === 'f' && fh[0].tier === 'miss' && fh[0].veil, '은신 = 광역 아닌 공격 빗나감(95%)');
  ok(fh[1].who === 's' && fh[1].ambush, '은신한 쪽 공격 = 기습');
  const ar = resolveTurn(unit('s'), unit('f'), hide, atk({ power: 60, area: true }), seq([0.5, 0.5, 0.5]), { turn: 1 });
  ok(ar.events.some(e => e.t === 'reveal' && e.id === 'stealth'), '광역에 은신이 들킴');
  ok(rollFirst(unit('a', { spd: 80 }), unit('b', { spd: 10 }), () => 0.5, [-1, -1]).first.id === 'b', '둘 다 나중 = 빠른 쪽이 나중일 확률 높음');
  ok(rollFirst(unit('a', { spd: 1 }), unit('b', { spd: 99 }), () => 0.99, [1, 0]).first.id === 'a', '먼저(early) = 무조건 선공');
  const C = unit('c'); selfBuff(C, 'clone', { turn: 1, ev: [] });
  const c1 = resolveTurn(unit('a'), C, atk(), rest, seq([0, 0.5]), { turn: 1 });
  ok(hits(c1.events)[0].tier === 'miss' && has(C, 'clone'), '분신 = 빗나감(90%) · 분신 남음');
  const c2 = resolveTurn(unit('a'), C, atk(), rest, seq([0, 0.95, 0.5]), { turn: 1 });
  ok(hits(c2.events)[0].tier !== 'miss' && !has(C, 'clone'), '진짜를 맞히면 분신 풀림');
  ok(FX.stealth.miss === 0.95 && FX.clone.miss === 0.9, '수치');
}
// ── 기술 연결 ──
ok(SKILLS.u_ninja_3.hits === 3 && SKILLS.u_ninja_3b.stealth && SKILLS.u_ninja_2.self === 'clone' && SKILLS.u_hyunmu_2.self === 'armor' && SKILLS.u_gladi_1.pierce === 0.3 && SKILLS.u_astro_3.early, '기술 연결');

console.log(`장치 시험 ${pass}/${pass + fails.length}`);
if (fails.length) { for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
