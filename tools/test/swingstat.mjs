// 한 판에 몰리는 일 재기(2026-11-05 밤샘 — 친구 소감 '첫 턴 기절 + 큰 피해가 한 판에 몰림'을 아침에 같이 보려고): 단계마다 봇 손패끼리(모든 종 짝 · 자리 바꿔 둘씩)
//  첫 두 턴 안에 기절(못 움직임)이 걸린 판 · 한 방 피해가 상대 최대 체력의 40% · 50%를 넘은 판 · 둘이 같은 판에 몰린 판 · 평균 턴 · 그 일을 가장 많이 만든 기술
//   node tools/test/swingstat.mjs [--stage 0|1|2] [--games 2]
import { unitOf, makeRng, botPlant } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, aiPick, REST } from '../../v2/src/battle/model.js';
import { mustSkip } from '../../v2/src/battle/status.js';
import { SPECIES, SKILLS } from '../../v2/src/game/catalog.js';
const argv = process.argv, arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? +argv[i + 1] : d; };
const STAGE = arg('--stage', 2), G = arg('--games', 2), KEYS = Object.keys(SPECIES);
const mk = (k, seed) => botPlant(makeRng(seed), STAGE, 6, 6, { tier: 6, concept: true, ivFloor: true, lvExact: true, key: k });
const field = KEYS.map((k, i) => mk(k, 4000 + i * 17));
const nm = id => (SKILLS[id] && SKILLS[id].name) || ({ basic: '평타' }[id] || id);
let games = 0, stunEarly = 0, big40 = 0, big50 = 0, both = 0, turns = 0;
const stunBy = {}, bigBy = {};
for (let i = 0; i < KEYS.length; i++) for (let j = 0; j < KEYS.length; j++) {
  if (i === j) continue;
  for (let g = 0; g < G; g++) {
    const seed = 30000 + i * 1009 + j * 31 + g, B = makeBattle({ me: unitOf('me', field[i]), foe: unitOf('foe', field[j]), seed }), r = makeRng(seed * 13 + 5);
    let early = false, b40 = false, b50 = false;
    while (!B.over && B.turn <= 80) {
      const sm = mustSkip(B.me) ? REST : aiPick(B.me, B.foe, r, { iq: 0.9 }), sf = mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, r, { iq: 0.9 });
      const t = playTurnVs(B, sm, sf), byId = { me: t.mySkill && t.mySkill.id, foe: t.foeSkill && t.foeSkill.id };
      for (const e of t.events) {
        if (t.n <= 2 && e.t === 'fx' && (e.id === 'stun' || e.id === 'frozen')) { early = true; const s = byId[e.who === 'me' || e.who === B.me.id ? 'me' : 'foe']; if (s) stunBy[s] = (stunBy[s] || 0) + 1; }
        if (e.t === 'hit' && e.dmg > 0) { const tg = e.to === B.me.id ? B.me : B.foe, share = e.dmg / Math.max(1, tg.max); if (share >= 0.4) { b40 = true; const s = e.id || byId[e.who === B.me.id ? 'me' : 'foe']; if (s) bigBy[s] = (bigBy[s] || 0) + 1; } if (share >= 0.5) b50 = true; }
      }
    }
    games++; turns += B.turn - 1; if (early) stunEarly++; if (b40) big40++; if (b50) big50++; if (early && b40) both++;
  }
}
const pc = x => `${(100 * x / games).toFixed(1)}%`, top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) => `${nm(id)} ${n}`).join(' · ');
console.log(`단계 ${STAGE} · ${games}판 · 평균 ${(turns / games).toFixed(1)}턴 — 첫 두 턴 기절 · 빙결 ${pc(stunEarly)} · 한 방 40%↑ ${pc(big40)} · 50%↑ ${pc(big50)} · 둘이 한 판에 ${pc(both)}`);
console.log(`  첫 두 턴 기절을 건 기술: ${top(stunBy)}`);
console.log(`  한 방 40%↑ 기술: ${top(bigBy)}`);
