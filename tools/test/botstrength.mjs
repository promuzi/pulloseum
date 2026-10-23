// 대회 봇 세기 어림(2026-10-23 — 단계별 봇 몸 · 컨셉 스펙 · 수 읽기를 바꿀 때마다): '내 식물'(무제한 = 성체 Lv6 · 포인트 고르게 · 개체값 0~8)을
//  빠른 머리(0.95 — 꽤 잘 두는 사람 흉내)로 두고 대회 단계마다 그 단계 봇(server/game.mjs battleStart 와 같은 몸 · 머리)과 붙여 내 승률
//   node tools/test/botstrength.mjs [판 수=20] [--league sprout|growing|open]
//  사람은 봇 버릇을 읽어 이 어림보다 훨씬 잘 이김(친구 서버 실측 90%대) — 올린 뒤 server/report.mjs 단계별 승률로 다시 맞춤
import { newGame, evolve, upgrade } from '../../v2/src/game/logic.js';
import { setupBot, botPlant, botBody, aiOfTier, searchOfTier, makeRng } from '../../v2/src/game/fight.js';
import { playTurn, aiPick } from '../../v2/src/battle/model.js';
import { STARTERS, TIERS, LEAGUES } from '../../v2/src/game/catalog.js';

const N = +(process.argv[2] || 20), lgi = process.argv.indexOf('--league'), lg = lgi > 0 ? process.argv[lgi + 1] : 'open', cap = LEAGUES[lg].cap;
function myPlant(key, rng) {
  const s = newGame({ nickname: 'x', starter: key }, rng, 0); s.wallet.credits = 1e6;
  const p = s.plants[0];
  while (p.stage < cap) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = 6; p.pts = (cap * 5 + 5) * 2;
  const order = ['hp', 'atk', 'def', 'spd']; let i = 0; while (p.pts > 0) upgrade(s, p.uid, order[i++ % 4], 1);
  return p;
}
const row = [];
for (let tier = 0; tier < TIERS.length; tier++) {
  let w = 0, n = 0; const t0 = performance.now();
  for (const key of STARTERS) for (let i = 1; i <= N; i++) {
    const sd = i * 101 + tier * 7919, p = myPlant(key, makeRng(sd)), r = makeRng(sd + 1), body = botBody(r, cap, tier);
    const foe = botPlant(r, body.stage, body.lv, tier, { tier, concept: true, ivFloor: true, lvExact: true });
    const B = setupBot({ seed: sd, mode: 'tournament', mine: [p], foes: [foe], trainer: 'b', rank: 'x', ai: aiOfTier(tier, false, 2), search: searchOfTier(tier) });
    const pick = makeRng(sd * 13 + 5);
    while (!B.over && B.turn <= 80) playTurn(B, aiPick(B.me, B.foe, pick, { iq: 0.95 }));
    w += B.over === 'win' ? 1 : 0; n++;
  }
  row.push(`${TIERS[tier]} ${Math.round((100 * w) / n)}%(${((performance.now() - t0) / n).toFixed(0)}ms/판)`);
}
console.log(`${LEAGUES[lg].name} · 내 식물 단계 ${cap} Lv6 · 빠른 머리 0.95 — 단계별 내 승률: ${row.join(' · ')}`);
