// 약한 기술 실험실(2026-11-05 사용자 '약한 기술부터' — 아침 목록 한 항목씩 같이 봄):
//  audit(botsys.mjs) 와 같은 손패 · 같은 상대 · 같은 씨앗으로, 그 기술을 '언제 쓰나'를 바꿔 가며 승률을 견줌.
//  audit 에 없던 것 = 상대 수를 읽는 조건 — 봇도 알 수 있는 것(상대 햇빛으로 쓸 수 있는 수 · 상대 지난 수)과
//   완벽히 읽을 때(상대가 이번 턴 고른 수를 미리 앎 = 사람이 가장 잘 써도 이 정도라는 천장).
//  그 밖 = 지금 봇 · 안 씀(죽은 칸) · 그 기술 대신 다른 카드로 짠 손패(바꿈) · 그 칸에 방어태세.
//   node tools/test/weaklab.mjs --key jelly_cap --id u_jelly_1 [--stage 2] [--games 8] [--conds now,never,big70,...]
//   만약 실험: --k 0.6(반사 되돌림 몫 — 모든 반사에 걸림) · --kx 1.0(이 기술로 반사할 때만 그 몫) · --cost 0(그 기술 햇빛) · --set power=80(그 기술 칸 바꿈) · --hold(너꺼잉 튕김이 쓰일 때까지 서 있음) · --perm(한 번 쓰면 판 끝까지) · --hand a,b,c(손패 직접) · --alt(쓸 수 있던 턴의 내 햇빛 · 대신 고른 것)
import { makeRng, botPlant, unitOf } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, aiPick, REST } from '../../v2/src/battle/model.js';
import { mustSkip, FX, CAVE, FRUIT, canUse } from '../../v2/src/battle/status.js';
import { SPECIES, SKILLS } from '../../v2/src/game/catalog.js';
import { buildDeck } from '../../v2/src/game/botdeck.js';
import { PLAYBOOK_BY } from '../../v2/src/battle/playbook.js';

const argv = process.argv, arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const KEYS = Object.keys(SPECIES), STAGE = +arg('--stage', 2), N = +arg('--games', 8), TIER = +arg('--tier', 6);
const K = arg('--key'), ID = arg('--id');
if (!K || !ID || !SKILLS[ID]) { console.log('--key <종> --id <기술> 이 필요해요'); process.exit(1); }
if (arg('--k')) FX.reflect.k = +arg('--k');
for (const kv of (arg('--rule', '') || '').split(',').filter(Boolean)) {   // --rule CAVE.gravel.acc=16 = 규칙 표 값(FX · CAVE) 바꿔 보기
  const [a, b] = kv.split('='), ks = a.split('.'), last = ks.pop();
  let o = { FX, CAVE, FRUIT }; for (const k of ks) o = o[k];
  o[last] = +b;
}
if (arg('--cost')) SKILLS[ID].cost = +arg('--cost');
for (const kv of (arg('--set', '') || '').split(',').filter(Boolean)) {   // --set taste.n=2 = 칸 안의 값(점으로 내려감)
  const [a, b] = kv.split('='), ks = a.split('.'), last = ks.pop();
  let o = SKILLS[ID]; for (const k of ks) o = o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {};
  o[last] = b.includes('+') ? b.split('+') : isNaN(+b) ? b : +b;   // selfMore=atkUp+spdUp+defDown = 목록
}
if (SKILLS[ID].power > 0 && SKILLS[ID].act === 'buff') { SKILLS[ID].act = 'attack'; SKILLS[ID].cats = ['attack']; }   // --set power=55 = 공격 + 원래 효과 덤
const AURA = arg('--aura') ? arg('--aura').split(',').map(Number) : null;
const HOLD = argv.includes('--hold'), PERM = argv.includes('--perm'),K0 = FX.reflect.k, KX = +arg('--kx', 0), CD = +arg('--cd', 0);
const pct = x => `${(100 * x).toFixed(1)}%`;
const nameOf = id => ({ basic: '평타', guard: '방어태세', evade: '회피 자세', sun: '광합성' }[id] || (SKILLS[id] && SKILLS[id].name) || id);
const isHex = s => !!(s && (s.inflict || s.inflicts || s.hex || s.act === 'hex' || (s.cats || []).includes('debuff')));
const atkP = s => (s && s.act === 'attack' ? s.power || 0 : 0);

// 상대를 먼저 고르게 한 한 판(완벽히 읽기 조건이 상대의 이번 수를 볼 수 있게 — 모든 쓰는 법에 같은 차례)
function duel(a, b, seed, pa, pb) {
  const B = makeBattle({ me: unitOf('me', a), foe: unitOf('foe', b), seed }), r = makeRng(seed * 13 + 5);
  const last = { me: null, foe: null }, seen = { me: [], foe: [] };
  let prev = null, permOn = false, lastUse = -99;
  while (!B.over && B.turn <= 80) {
    if (KX) FX.reflect.k = K0;
    const sf = mustSkip(B.foe) ? REST : pb(B.foe, B.me, r, { seen: seen.foe, last: last.foe, iq: 0.9 });
    if (KX) FX.reflect.k = KX;
    const T0 = B.turn, sm = mustSkip(B.me) ? REST : pa(B.me, B.foe, r, { seen: seen.me, last: last.me, iq: 0.9 }, { now: sf, prev, cool: CD > 0 && T0 - lastUse <= CD, T: T0 });
    if (KX) FX.reflect.k = sm && sm.id === ID ? KX : K0;   // --kx: 이 기술로 반사할 때만 그 몫(같은 턴 다른 반사는 원래 몫)
    if (AURA && sm && sm.id === ID && B.me.hp > 0) (B.me.eff ||= {}).frostAura = { exp: T0 + AURA[0] - 1, n: AURA[1] };   // 만약 실험 --aura 턴,겹: 그 기술을 쓰면 냉기(때린 쪽 빙결 — whatif_frost.mjs 사본에서만 걸림)
    if (sm && sm.bounceNow && B.me.hp > 0) (B.me.eff ||= {}).bounce = { exp: T0 };   // 만약 실험 bounceNow: 그 턴 자세로 튕김(순서 무관 · 그 턴 끝까지)
    const t = playTurnVs(B, sm, sf);
    if (t.mySkill && t.mySkill.id === ID) lastUse = T0;
    if (HOLD && B.me.eff && B.me.eff.bounce) B.me.eff.bounce.exp = B.turn + 1;   // 만약 실험 --hold: 튕김이 쓰일 때까지 서 있음
    if (PERM && t.mySkill && t.mySkill.id === ID) permOn = true;
    if (PERM && permOn && B.me.hp > 0) (B.me.eff ||= {}).bounce = { exp: B.turn + 1 };   // 만약 실험 --perm: 한 번 쓰면 판 끝까지 튕김(쓰여도 다시 섬)
    last.me = t.mySkill && t.mySkill.act; last.foe = t.foeSkill && t.foeSkill.act;
    if (t.mySkill && t.mySkill.act === 'attack') seen.foe.push(t.mySkill);
    if (t.foeSkill && t.foeSkill.act === 'attack') seen.me.push(t.foeSkill);
    prev = t.foeSkill || null;
  }
  if (lastUse >= 0) { REM.s += B.turn - 1 - lastUse; REM.n++; }   // --alt: 그 기술을 (마지막으로) 쓴 뒤 판이 몇 턴 더 갔나
  return B.over === 'win' ? 1 : B.over === 'lose' ? 0 : 0.5;
}
const REM = { s: 0, n: 0 };

// 쓰는 법: 조건이 맞고 쓸 수 있으면 그 기술 · 아니면 그 기술은 빼고 봇이 고름
const CONDS = {
  big70: { text: '상대가 위력 70 넘는 공격을 쓸 햇빛이 있을 때', f: (u, foe) => foe.kit.some(s => atkP(s) >= 70 && canUse(foe, s, foe.energy, u)) },
  big90: { text: '상대가 위력 90 넘는 공격을 쓸 햇빛이 있을 때', f: (u, foe) => foe.kit.some(s => atkP(s) >= 90 && canUse(foe, s, foe.energy, u)) },
  atkLast: { text: '상대가 지난 턴에 공격했을 때', f: (u, foe, X) => atkP(X.prev) > 0 },
  hex: { text: '상대가 상태를 거는 기술을 쓸 햇빛이 있을 때', f: (u, foe) => foe.kit.some(s => isHex(s) && canUse(foe, s, foe.energy, u)) },
  hexLast: { text: '상대가 지난 턴에 상태를 걸었을 때', f: (u, foe, X) => isHex(X.prev) },
  oAtk: { text: '완벽히 읽음 — 상대가 이번 턴 공격할 때만', f: (u, foe, X) => atkP(X.now) > 0 },
  oBig: { text: '완벽히 읽음 — 상대가 이번 턴 위력 70 넘게 칠 때만', f: (u, foe, X) => atkP(X.now) >= 70 },
  oHex: { text: '완벽히 읽음 — 상대가 이번 턴 상태를 걸 때만', f: (u, foe, X) => isHex(X.now) },
  once: { text: '튕김이 안 서 있고 상대에게 상태 거는 기술이 있을 때(--hold 와 함께)', f: (u, foe) => !(u.eff && u.eff.bounce) && foe.kit.some(isHex) },
  always: { text: '쓸 수 있으면 늘(이것만 쓰기)', f: () => true },
  meal2: { text: '먹은 준비가 둘 넘을 때(팽트랩 식사시간 뒤)', f: u => !!(u.st && u.st.meal && u.st.meal.n >= 2) },
  meal3: { text: '먹은 준비가 셋일 때', f: u => !!(u.st && u.st.meal && u.st.meal.n >= 3) },
  poor: { text: '햇빛이 모자라 평타 말고는 공격을 못 할 때', f: (u, foe) => !u.kit.some(s => s.id !== 'basic' && atkP(s) > 0 && canUse(u, s, u.energy, foe)) },
  e1: { text: '내 햇빛이 1 이하일 때', f: u => u.energy <= 1 },
  e2: { text: '내 햇빛이 2 이하일 때', f: u => u.energy <= 2 },
  melow: { text: '내 체력이 절반 아래일 때', f: u => u.hp < u.max * 0.5 },
  first: { text: '판 첫 턴에만', f: (u, foe, X) => X.T === 1 },
  early: { text: '처음 두 턴에만', f: (u, foe, X) => X.T <= 2 },
  gale1: { text: '강풍이 이번 턴 뒤에도 남을 때(공명)', f: (u, foe, X) => !!(foe.eff && foe.eff.gale && foe.eff.gale.exp - X.T >= 1) },
};
const conds = (arg('--conds', '') || (SKILLS[ID].bounce ? 'now,never,hex,hexLast,oHex,repl,guard' : 'now,never,big70,big90,atkLast,oAtk,oBig,repl,guard')).split(',');

const mk = (k, seed) => botPlant(makeRng(seed), STAGE, 6, TIER, { tier: TIER, concept: true, ivFloor: true, lvExact: true, key: k });
const field = KEYS.map((k, i) => mk(k, 4000 + i * 17));
const i0 = KEYS.indexOf(K), body = mk(K, 8000 + i0), mutN = body.form ? 1 : 0;
const con0 = buildDeck(makeRng(900 + i0), { key: K, stage: STAGE, form: body.form, mutN }).con;
const handX = arg('--hand') ? arg('--hand').split(',') : buildDeck(makeRng(901 + i0), { key: K, stage: STAGE, form: body.form, mutN, con: con0, must: [ID] }).ids;   // --hand a,b,c = 손패를 직접(그 기술이 든 손패)
const handR = buildDeck(makeRng(901 + i0), { key: K, stage: STAGE, form: body.form, mutN, con: con0, ban: [ID] }).ids;
const handG = handX.includes('guard') ? null : handX.map(x => (x === ID ? 'guard' : x));
const book0 = (PLAYBOOK_BY[STAGE] || PLAYBOOK_BY[2] || {})[K] || [];
const never = { [K]: [...book0.filter(x => x.id !== ID), { id: ID, when: { k: 'always' }, b: -50 }] };

console.log(`${SPECIES[K].name} · ${nameOf(ID)} — ${['새싹', '성장기', '성체'][STAGE]} · 대회 단계 ${TIER} 몸 · 상대 ${KEYS.length - 1}종 × ${N}판${arg('--k') ? ` · 반사 몫 ${FX.reflect.k}` : ''}${KX ? ` · 이 기술 반사 몫 ${KX}` : ''}${arg('--cost') ? ` · 햇빛 ${SKILLS[ID].cost}` : ''}${arg('--set') ? ` · ${arg('--set')}` : ''}${HOLD ? ' · 쓰일 때까지 서 있음' : ''}${PERM ? ' · 한 번 쓰면 판 끝까지' : ''}${CD ? ` · 쓴 뒤 ${CD}턴 못 씀` : ''}`);
console.log(`  넣은 손패: ${handX.filter(Boolean).map(nameOf).join(' · ')}`);
console.log(`  바꾼 손패: ${handR.filter(Boolean).map(nameOf).join(' · ')}`);
const t0 = Date.now();
for (const c of conds) {
  let used = 0, could = 0, eSum = 0; REM.s = REM.n = 0;
  const alt = {}, hp = { foe: [0, 0, 0], me: [0, 0, 0], gale: {} };   // 쓸 수 있었는데 대신 고른 것(2026-11-05 사용자 '햇빛이 별로 없을 때 쓰는 느낌이면 별로인가?')
  const hand = c === 'repl' ? handR : c === 'guard' ? handG : handX;
  if (!hand) { console.log(`  ${c}: 손패에 이미 방어태세가 있어 건너뜀`); continue; }
  const pa = (u, foe, r, ctx, X) => {
    const t = u.kit.find(s => s.id === ID), ok = t && canUse(u, t, u.energy, foe) && !X.cool;   // --cd N: 쓴 뒤 N턴은 못 씀
    if (X.cool) return aiPick(u, foe, r, { ...ctx, book: never });
    if (ok) could++;
    let s;
    if (c === 'now' || c === 'repl' || c === 'guard') s = aiPick(u, foe, r, { ...ctx, book: { [K]: book0 } });
    else if (c === 'never') s = aiPick(u, foe, r, { ...ctx, book: never });
    else s = ok && CONDS[c].f(u, foe, X) ? t : aiPick(u, foe, r, { ...ctx, book: never });
    if (ok && s && s.id === ID) used++;
    if (ok) { eSum += u.energy; if (!s || s.id !== ID) { const a = s ? s.id : 'rest'; alt[a] = (alt[a] || 0) + 1; } }
    if (ok) { const f = foe.hp / foe.max, m = u.hp / u.max; hp.foe[f < 0.25 ? 0 : f < 0.5 ? 1 : 2]++; hp.me[m < 0.25 ? 0 : m < 0.5 ? 1 : 2]++; }   // 쓸 수 있던 턴의 체력(4분의 1 · 절반 아래 · 위)
    if (ok && foe.eff && foe.eff.gale) { const g = Math.min(2, foe.eff.gale.exp - X.T); hp.gale[g] = (hp.gale[g] || 0) + 1; }   // 강풍이 이번 턴 뒤로 몇 턴 남았나(0 · 1 · 2 이상)
    return s;
  };
  const p = structuredClone(body); p.skills.battle = [...hand]; while (p.skills.battle.length < 6) p.skills.battle.push(null);
  let w = 0, n = 0;
  for (let g = 0; g < N; g++) field.forEach((f, j) => { if (j === i0) return; w += duel(p, f, 71000 + i0 * 1009 + j * 31 + g * 7, pa, aiPick); n++; });
  const label = { now: '지금 봇', never: '안 씀(죽은 칸)', repl: '그 칸에 다른 카드(바꿈)', guard: '그 칸에 방어태세' }[c] || CONDS[c].text;
  console.log(`  ${label}: ${pct(w / n)}${c === 'repl' || c === 'guard' ? '' : ` · 쓸 수 있을 때 ${pct(could ? used / could : 0)} 씀`} (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
  if (argv.includes('--alt') && could && (c === 'never' || c === 'now')) console.log(`    쓸 수 있던 ${could}번 · 그때 내 햇빛 평균 ${(eSum / could).toFixed(1)} · 대신 고른 것: ${Object.entries(alt).sort((a, b) => b[1] - a[1]).map(([a, k]) => `${nameOf(a === 'rest' ? '쉼' : a)} ${pct(k / could)}`).join(' · ')}`);
  if (argv.includes('--alt') && REM.n && c !== 'never') console.log(`    쓴 판 ${REM.n}판 · 마지막으로 쓴 뒤 판이 평균 ${(REM.s / REM.n).toFixed(1)}턴 더 감`);
  if (argv.includes('--alt') && could && c === 'never') { const b = a => a.map(x => pct(x / could)).join(' / '); console.log(`    쓸 수 있던 턴 체력(4분의 1 아래 / 절반 아래 / 절반 위): 상대 ${b(hp.foe)} · 나 ${b(hp.me)}${Object.keys(hp.gale).length ? ` · 강풍이 이번 턴 뒤로 0 / 1 / 2턴 넘게: ${b([0, 1, 2].map(g => hp.gale[g] || 0))}` : ''}`); }
}
