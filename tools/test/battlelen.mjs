// 한 판이 몇 턴 가나(2026-11-05 — 5턴짜리 디버프가 판 안에서 다 쓰이는지 보려고): 단계마다 모든 종 봇(짠 손패)끼리 · 세 쌍 중 하나만
//   node tools/test/battlelen.mjs
import { makeRng, botPlant, unitOf } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, aiPick, REST } from '../../v2/src/battle/model.js';
import { mustSkip } from '../../v2/src/battle/status.js';
import { SPECIES } from '../../v2/src/game/catalog.js';
const KEYS = Object.keys(SPECIES);
for (let st = 0; st <= 2; st++) {
  const P = KEYS.map((k, i) => botPlant(makeRng(4000 + i * 17), st, 6, 6, { tier: 6, concept: true, ivFloor: true, lvExact: true, key: k }));
  const T = [];
  for (let i = 0; i < P.length; i++) for (let j = 0; j < P.length; j++) {
    if (i === j || (i + j) % 3) continue;
    const seed = 50000 + i * 101 + j, B = makeBattle({ me: unitOf('me', P[i]), foe: unitOf('foe', P[j]), seed }), r = makeRng(seed * 13 + 5);
    const last = { me: null, foe: null }, seen = { me: [], foe: [] };
    while (!B.over && B.turn <= 80) {
      const sm = mustSkip(B.me) ? REST : aiPick(B.me, B.foe, r, { seen: seen.me, last: last.me, iq: 0.9 });
      const sf = mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, r, { seen: seen.foe, last: last.foe, iq: 0.9 });
      const t = playTurnVs(B, sm, sf);
      last.me = t.mySkill && t.mySkill.act; last.foe = t.foeSkill && t.foeSkill.act;
      if (t.mySkill && t.mySkill.act === 'attack') seen.foe.push(t.mySkill);
      if (t.foeSkill && t.foeSkill.act === 'attack') seen.me.push(t.foeSkill);
    }
    T.push(B.turn - 1);
  }
  T.sort((a, b) => a - b);
  const q = p => T[Math.floor(p * (T.length - 1))];
  console.log(`${['새싹', '성장기', '성체'][st]}: ${T.length}판 · 평균 ${(T.reduce((a, b) => a + b, 0) / T.length).toFixed(1)}턴 · 가운데 ${q(0.5)} · 아래 1/4 ${q(0.25)} · 위 1/4 ${q(0.75)}`);
}
