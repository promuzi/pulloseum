// 봇이 실제로 무엇을 들고 가고 무엇을 쓰는지(2026-11-04 사용자 '식사시간이 핵심인데 봇이 이걸 잘 안쓰는 거 아님? 지금 봇이 식물에 맞게 최적화 됨?
//  다 비슷한 규칙으로 싸울 거 같은데. 운용에 관해 컨셉을 기준으로 들고가는 스킬과 패턴을 각각 식물별로 따로 적용해보자'):
//  ① 들고 가는 것 = 대회 봇(fight.js botPlant — 서버와 같은 옵션)을 많이 만들어 종마다 개성 기술을 손패에 넣은 비율
//  ② 쓰는 것 = 성체 손패(그 종 개성 전부 + 평타 · 광합성 — specbalance --uni --basics 와 같은 손패)로 모든 종과 붙여, 쓸 수 있던 턴 가운데 고른 비율
//   node tools/test/botuse.mjs [--games 4] [--key fang_trap] [--tier 6] [--stage 2] [--log 2]
import { newGame, makePlant, evolve, upgrade } from '../../v2/src/game/logic.js';
import { unitOf, makeRng, botPlant } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, aiPick, REST, BRAIN } from '../../v2/src/battle/model.js';
import { canUse, mustSkip } from '../../v2/src/battle/status.js';
import { SPECIES, SKILLS, uniquesOf } from '../../v2/src/game/catalog.js';

const argv = process.argv, arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const games = +arg('--games', 4), TIER = +arg('--tier', 6), STAGE = +arg('--stage', 2), LV = 6, ONLY = arg('--key', null), LOGN = +arg('--log', 0);
const keys = Object.keys(SPECIES), shown = ONLY ? [ONLY] : keys;
for (const kv of (arg('--set', '') || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); BRAIN[k] = +v; }   // 머리 손잡이(model.js BRAIN)
const uniOf = k => { const u = []; for (let st = 0; st <= STAGE; st++) u.push(...uniquesOf(k, st).filter(id => SKILLS[id])); return [...new Set(u)]; };
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');

// ① 들고 가는 것
const carry = {}, made = {};
for (let i = 0; i < 30000; i++) {
  const p = botPlant(makeRng(900000 + i), STAGE, LV, TIER, { tierBoost: TIER, tier: TIER, concept: true, ivFloor: true, lvExact: true });
  made[p.key] = (made[p.key] || 0) + 1;
  const c = (carry[p.key] ||= {});
  for (const id of p.skills.battle) if (id) c[id] = (c[id] || 0) + 1;
}

// ② 쓰는 것
function plantOf(key, seed) {
  const rng = makeRng(seed), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0);
  s.wallet.credits = 1e7;
  const p = makePlant(s, { key }, rng, 0); s.plants.push(p);
  for (const k of Object.keys(p.ivs)) p.ivs[k] = 5;
  while (p.stage < STAGE) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = 4; p.pts = (STAGE * 5 + 4 - 1) * 2;
  const order = ['hp', 'atk', 'def', 'spd']; let i = 0; while (p.pts > 0) upgrade(s, p.uid, order[i++ % 4], 1);
  p.cards = [null, null]; p.drafts = [];
  p.skills.battle = [...uniOf(key), 'basic', 'sun'];
  return p;
}
const use = {}, avail = {}, turns = {}, extra = { mealPrep: [0, 0, 0, 0], tasteAvail: 0, tasteUsed: 0, biteBig: 0 };
const logs = [];
function duel(a, b, seed, keep) {
  const B = makeBattle({ me: unitOf('me', a), foe: unitOf('foe', b), seed }), r = makeRng(seed * 13 + 5);
  const last = { me: null, foe: null }, seen = { me: [], foe: [] }, lines = [];
  while (!B.over && B.turn <= 80) {
    const pick = {};
    for (const [side, other] of [['me', 'foe'], ['foe', 'me']]) {
      const u = B[side], f = B[other], k = u.key;
      if (mustSkip(u)) { pick[side] = REST; continue; }
      const U = (use[k] ||= {}), A = (avail[k] ||= {});
      turns[k] = (turns[k] || 0) + 1;
      for (const s of u.kit) if (canUse(u, s, u.energy, f)) A[s.id] = (A[s.id] || 0) + 1;
      const s = aiPick(u, f, r, { seen: seen[side], last: last[side] });
      pick[side] = s;
      if (s && s.id) U[s.id] = (U[s.id] || 0) + 1;
      if (k === 'fang_trap') {
        const prep = (u.res && u.res.prep) || 0;
        if (s && s.id === 'u_fang_3') extra.mealPrep[Math.min(3, prep)]++;
        if (u.kit.some(x => x.id === 'u_fang_3b' && canUse(u, x, u.energy, f))) { extra.tasteAvail++; if (s && s.id === 'u_fang_3b') extra.tasteUsed++; }
        if (s && s.id === 'u_fang_1' && prep >= 3) extra.biteBig++;
        if (keep && side === (a.key === 'fang_trap' ? 'me' : 'foe')) lines.push(`${B.turn}턴 준비 ${prep} 햇빛 ${u.energy} → ${s && s.name}`);
      }
    }
    const t = playTurnVs(B, pick.me, pick.foe);
    last.me = t.mySkill && t.mySkill.act; last.foe = t.foeSkill && t.foeSkill.act;
    if (t.mySkill && t.mySkill.act === 'attack') seen.foe.push(t.mySkill);
    if (t.foeSkill && t.foeSkill.act === 'attack') seen.me.push(t.foeSkill);
  }
  if (keep) logs.push({ vs: SPECIES[a.key === 'fang_trap' ? b.key : a.key].name, out: B.over, lines });
}
const plants = Object.fromEntries(keys.map((k, i) => [k, Array.from({ length: games }, (_, g) => plantOf(k, 1000 + i * 97 + g))]));
const t0 = Date.now();
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  if (ONLY && keys[i] !== ONLY && keys[j] !== ONLY) continue;
  for (let g = 0; g < games; g++) {
    const seed = 70000 + i * 1009 + j * 31 + g, keep = logs.length < LOGN && (keys[i] === 'fang_trap' || keys[j] === 'fang_trap');
    if (g % 2) duel(plants[keys[j]][g], plants[keys[i]][g], seed, keep); else duel(plants[keys[i]][g], plants[keys[j]][g], seed, keep);
  }
}
console.log(`봇 손패 · 쓰임 — 단계 ${STAGE} · 대회 단계 ${TIER} 봇 3만 개 · 성체 손패 리그 짝마다 ${games}판(${((Date.now() - t0) / 1000).toFixed(0)}초)`);
console.log('기술 이름  [들고 감 = 대회 봇 손패에 든 비율]  [씀 = 쓸 수 있던 턴 중 고른 비율 · 전체 턴 중 비율]');
for (const k of shown) {
  const sp = SPECIES[k], U = use[k] || {}, A = avail[k] || {}, T = turns[k] || 0, C = carry[k] || {}, M = made[k] || 0;
  const row = id => `${(SKILLS[id] || { name: id }).name}[들고 ${pct(C[id] || 0, M)} · 씀 ${pct(U[id] || 0, A[id] || 0)} · 전체 ${pct(U[id] || 0, T)}]`;
  console.log(`${sp.name}(${k}) 봇 ${M}개 · 턴 ${T}: ` + [...uniOf(k), 'basic', 'sun'].map(row).join(' '));
}
if (!ONLY || ONLY === 'fang_trap') {
  const m = extra.mealPrep, tot = m.reduce((a, b) => a + b, 0);
  console.log(`팽트랩 식사시간 쓸 때 준비 0/1/2/3 = ${m.join(' / ')}(${tot}번) · 맛평가 쓸 수 있던 턴 ${extra.tasteAvail} 중 씀 ${extra.tasteUsed} · 준비 3에서 깨물기(= 한입) ${extra.biteBig}`);
}
for (const L of logs) console.log(`\n[팽트랩 대 ${L.vs} — ${L.out}]\n` + L.lines.join('\n'));
