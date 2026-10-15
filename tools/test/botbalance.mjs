// 봇 상대 균형(화면 없이): 같은 단계·레벨의 내 식물(강화 포인트를 쓰지 않음 / 고르게 씀) vs 봇 — 양쪽 다 같은 봇 머리(aiPick)로
//   node tools/test/botbalance.mjs [--games 150]
import { newGame, makePlant, evolve, upgrade } from '../../v2/src/game/logic.js';
import { setupBot, botPlant, makeRng } from '../../v2/src/game/fight.js';
import { playTurn, aiPick } from '../../v2/src/battle/model.js';
import { STARTERS, SPECIES } from '../../v2/src/game/catalog.js';

const games = +(process.argv[process.argv.indexOf('--games') + 1] || 150) || 150;
function myPlant(key, stage, lv, spend, rng) {
  const s = newGame({ nickname: 'x', starter: key }, rng, 0);
  s.wallet.credits = 1e6;
  const p = s.plants[0];
  while (p.stage < stage) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = lv; p.pts = (stage * 5 + lv - 1) * 2;
  if (spend) { const order = ['hp', 'atk', 'def', 'spd']; let i = 0; while (p.pts > 0) upgrade(s, p.uid, order[i++ % 4], 1); }
  return p;
}
function play(p, tier, seed) {
  const rng = makeRng(seed), foe = botPlant(rng, p.stage, p.lv, tier);
  const B = setupBot({ seed: seed * 7 + 3, mode: 'tournament', mine: [p], foes: [foe], trainer: '봇', rank: '브론즈 1' });
  const pick = makeRng(seed * 13 + 5);
  while (!B.over && B.turn <= 80) playTurn(B, aiPick(B.me, B.foe, pick) || B.me.kit[0]);
  return B.over === 'win' ? 1 : 0;
}
console.log(`봇 상대 승률(판 ${games}) — 같은 머리로 둘 때 50%면 공정, 사람은 보통 봇보다 잘 고름`);
console.log('식물          단계 Lv | 포인트 안 씀 | 고르게 씀 | (대회 2단계 봇)');
for (const key of STARTERS) for (const [stage, lv] of [[0, 1], [0, 3], [0, 6], [1, 3], [2, 4]]) {
  let a = 0, b = 0, c = 0;
  for (let i = 1; i <= games; i++) {
    const rng = makeRng(i * 31 + stage * 7 + lv);
    a += play(myPlant(key, stage, lv, false, rng), 0, i);
    b += play(myPlant(key, stage, lv, true, makeRng(i * 31 + stage * 7 + lv)), 0, i);
    c += play(myPlant(key, stage, lv, true, makeRng(i * 31 + stage * 7 + lv)), 2, i);
  }
  console.log(`${SPECIES[key].name.padEnd(6, '　')} ${stage}  ${lv}  | ${(100 * a / games).toFixed(0).padStart(5)}%      | ${(100 * b / games).toFixed(0).padStart(5)}%   | ${(100 * c / games).toFixed(0).padStart(5)}%`);
}
