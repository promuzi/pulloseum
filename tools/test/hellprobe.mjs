// 사본 안 tools/test/ 에서 실행: node tools/test/hellprobe.mjs <단계>
// 첫 턴 지옥전개(first) 대 안 씀(never): 2 · 3턴에 무엇을 쓰나 · 여왕이 켜져 있나 · 1 ~ 3턴에 준 피해 · 판 길이
import { makeRng, botPlant, unitOf } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, aiPick, REST } from '../../v2/src/battle/model.js';
import { mustSkip, canUse } from '../../v2/src/battle/status.js';
import { SPECIES, SKILLS } from '../../v2/src/game/catalog.js';
import { buildDeck } from '../../v2/src/game/botdeck.js';
import { PLAYBOOK_BY } from '../../v2/src/battle/playbook.js';
const STAGE = +(process.argv[2] || 0), N = 8, TIER = 6, K = 'blade_vine', ID = 'u_blade_1';
const KEYS = Object.keys(SPECIES);
const mk = (k, seed) => botPlant(makeRng(seed), STAGE, 6, TIER, { tier: TIER, concept: true, ivFloor: true, lvExact: true, key: k });
const field = KEYS.map((k, i) => mk(k, 4000 + i * 17));
const i0 = KEYS.indexOf(K), body = mk(K, 8000 + i0), mutN = body.form ? 1 : 0;
const con0 = buildDeck(makeRng(900 + i0), { key: K, stage: STAGE, form: body.form, mutN }).con;
const hand = buildDeck(makeRng(901 + i0), { key: K, stage: STAGE, form: body.form, mutN, con: con0, must: [ID] }).ids;
const book0 = (PLAYBOOK_BY[STAGE] || PLAYBOOK_BY[2] || {})[K] || [];
const never = { [K]: [...book0.filter(x => x.id !== ID), { id: ID, when: { k: 'always' }, b: -50 }] };
const nm = id => ({ basic: '평타', guard: '방어태세', evade: '회피 자세', sun: '광합성' }[id] || (SKILLS[id] && SKILLS[id].name) || id);
for (const pol of ['never', 'first']) {
  const pick = {}, q = { 2: 0, 3: 0 }, dmg = [0, 0, 0, 0], took = [0, 0, 0, 0], end = {}, firstMe = [0, 0];
  let w = 0, n = 0;
  const p = structuredClone(body); p.skills.battle = [...hand]; while (p.skills.battle.length < 6) p.skills.battle.push(null);
  for (let g = 0; g < N; g++) field.forEach((f, j) => {
    if (j === i0) return;
    const seed = 71000 + i0 * 1009 + j * 31 + g * 7;
    const B = makeBattle({ me: unitOf('me', p), foe: unitOf('foe', f), seed }), r = makeRng(seed * 13 + 5);
    const last = { me: null, foe: null }, seen = { me: [], foe: [] };
    while (!B.over && B.turn <= 80) {
      const T = B.turn;
      const sf = mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, r, { seen: seen.foe, last: last.foe, iq: 0.9 });
      const t0 = B.me.kit.find(s => s.id === ID), ok = t0 && canUse(B.me, t0, B.me.energy, B.foe);
      const sm = mustSkip(B.me) ? REST : pol === 'first' && T === 1 && ok ? t0 : aiPick(B.me, B.foe, r, { seen: seen.me, last: last.me, iq: 0.9, book: never });
      if (T === 2 || T === 3) { const k = `${T}턴 ${nm(sm ? sm.id : 'rest')}`; pick[k] = (pick[k] || 0) + 1; if (B.me.st && B.me.st.queen) q[T]++; }
      const fh = B.foe.hp, mh = B.me.hp;
      const t = playTurnVs(B, sm, sf);
      if (T <= 3) { dmg[T] += (fh - B.foe.hp) / B.foe.max; took[T] += (mh - B.me.hp) / B.me.max; }
      if (T === 1) { const fe = t.events.find(e => e.t === 'first'); if (fe) firstMe[fe.who === 'me' ? 0 : 1]++; }
      last.me = t.mySkill && t.mySkill.act; last.foe = t.foeSkill && t.foeSkill.act;
      if (t.mySkill && t.mySkill.act === 'attack') seen.foe.push(t.mySkill);
      if (t.foeSkill && t.foeSkill.act === 'attack') seen.me.push(t.foeSkill);
    }
    w += B.over === 'win' ? 1 : B.over === 'lose' ? 0 : 0.5; n++;
    const L = Math.min(B.turn - 1, 9); end[L] = (end[L] || 0) + 1;
  });
  const P = x => (100 * x / n).toFixed(1);
  console.log(`\n[${pol}] 단계 ${STAGE} 손패 ${hand.map(nm).join(' · ')} · 승률 ${P(w)}% · 1턴 선공 나 ${P(firstMe[0])}%`);
  console.log(`  상대 체력에 준 피해(최대 체력 %, 턴 끝 화상 포함): 1턴 ${P(dmg[1])} · 2턴 ${P(dmg[2])} · 3턴 ${P(dmg[3])} / 받은 피해: ${P(took[1])} · ${P(took[2])} · ${P(took[3])}`);
  console.log(`  여왕 켜짐: 2턴 ${P(q[2])}% · 3턴 ${P(q[3])}%`);
  console.log(`  2 · 3턴에 쓴 것: ` + Object.entries(pick).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${P(v)}%`).join(' · '));
  console.log(`  판 길이(턴): ` + Object.entries(end).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}턴 ${P(v)}%`).join(' · '));
}
