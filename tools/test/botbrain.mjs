// 봇 머리 비교(2026-10-22 사용자 "봇 지능 향상. 교환 등 전투를 전략적으로 하도록"):
//  옛 머리(가중 추첨) 대 새 머리(점수 · 교체 판단)를 같은 식물 짝으로 맞붙여 새 머리 승률을 봄 — 자리(선 · 후)도 바꿔 두 번씩.
//   node tools/test/botbrain.mjs [판 수=300]
import { botPlant, unitOf } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, aiPick, seenOf, lastOf, hitMult, REST } from '../../v2/src/battle/model.js';
import { makeTeamBattle, playTurn3, aliveOf } from '../../v2/src/battle/team.js';
import { canUse, has, FX, mustSkip } from '../../v2/src/battle/status.js';
import { makeRng } from '../../v2/src/battle/rules.js';

const N = +(process.argv[2] || 300);
// 옛 머리(2026-10-18까지의 aiPick 그대로)
const newFx = (s, foe) => { const f = s.inflict; if (!f) return false; const D = FX[f.id]; return !(D.el && D.el === foe.el) && !(D.jong && D.jong === foe.jong) && (D.stack ? true : !has(foe, f.id)); };
function oldPick(u, foe, rng) {
  const ok = u.kit.filter(s => canUse(u, s));
  if (!ok.length) return REST;
  const low = u.hp < u.max * 0.4, poor = (u.energy || 0) <= 1 && u.kit.some(s => (s.cost || 0) >= 2);
  const w = ok.map(s => (s.act === 'attack' ? Math.max(0.3, 1 + (s.power || 0) * (s.hits || 1) / 45 + 2.4 * (hitMult(u, foe, s) - 1) + (newFx(s, foe) ? 0.6 : 0) + (s.area && (has(foe, 'clone') || has(foe, 'stealth')) ? 1.5 : 0)) : s.act === 'guard' ? (low ? 1.3 : 0.45) : s.act === 'sun' ? (poor && !low ? 0.9 : 0.15) : (low ? 1.1 : 0.55)));
  let r = rng() * w.reduce((a, b) => a + b, 0), i = 0;
  for (; i < w.length - 1; i++) { r -= w[i]; if (r <= 0) break; }
  return ok[i];
}
// 1:1 — 'me' = 옛 머리, 'foe' = 새 머리(iq)
function duel(pa, pb, seed, iq) {
  const B = makeBattle({ me: unitOf('me', pa), foe: unitOf('foe', pb, { ai: iq }), seed }), rng = makeRng(seed * 7 + 1);
  while (!B.over && B.turn <= 80) {
    const mine = mustSkip(B.me) ? REST : oldPick(B.me, B.foe, rng), theirs = mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, rng, { seen: seenOf(B), last: lastOf(B) });
    playTurnVs(B, mine, theirs);
  }
  return B.over === 'lose' ? 1 : B.over === 'win' ? 0 : 0.5;   // 새 머리 이김 = 1
}
let tot = 0, nB = 0;
for (const iq of [0.15, 0.55, 0.95]) {
  let w = 0, n = 0;
  for (let i = 0; i < N; i++) {
    const rng = makeRng(10007 + i), st = i % 3, a = botPlant(rng, st, 3, 3), b = botPlant(rng, st, 3, 3);
    w += duel(a, b, 300 + i, iq); n++;
    w += duel(b, a, 900 + i, iq); n++;   // 같은 짝을 자리 바꿔 한 번 더
  }
  console.log(`1:1 새 머리(iq ${iq}) 승률: ${(100 * w / n).toFixed(1)}%  (${n}판)`);
  if (iq === 0.95) { tot = w / n; nB = n; }
}
// 3:3 — 'me' = 옛 머리(교체 안 함 · 쓰러지면 첫 식물), 'foe' = 새 머리(교체 판단 포함)
let w3 = 0, n3 = 0;
for (let i = 0; i < Math.floor(N / 2); i++) {
  const rng = makeRng(5003 + i), team = () => [0, 1, 2].map(() => botPlant(rng, 1, 3, 3));
  const A = team(), Bt = team();
  const B = makeTeamBattle({ me: A.map(p => unitOf('me', p)), foe: Bt.map(p => unitOf('foe', p, { ai: 0.95 })), seed: 40 + i, swapCd: 2, swOrder: true }), r2 = makeRng(i + 3);
  while (!B.over && B.turn <= 80) {
    if (B.need === 'me') { const nx = aliveOf(B, 'me')[0]; B.act.me = nx; B.me = B.team.me[nx]; B.need = null; continue; }
    const k = mustSkip(B.me) ? { kind: 'rest' } : { kind: 'skill', skill: oldPick(B.me, B.foe, r2) };
    playTurn3(B, k.kind === 'skill' && k.skill === REST ? { kind: 'rest' } : k);
  }
  w3 += B.over === 'lose' ? 1 : B.over === 'win' ? 0 : 0.5; n3++;
}
console.log(`3:3 새 머리(iq 0.95, 교체 판단) 승률: ${(100 * w3 / n3).toFixed(1)}%  (${n3}판)`);
const bad = tot < 0.55;
console.log(bad ? '실패: 새 머리(iq 0.95)가 옛 머리보다 뚜렷이 낫지 않음' : '새 머리가 옛 머리보다 나음');
if (bad) process.exit(1);
