// 은신만 써서 이기나(사용자 요청 2026-10-21 게일바인 '나중에 은신만 써서 이길 수 있는지 확인해줘'):
//  게일바인이 '그건 내 잔상인데?'만 쓰고(햇빛이 모자라면 광합성) 다른 모든 종의 봇과 싸운 승률 — 종 리그전과 같은 조건(단계 2 · Lv4 · 개체값 5)
//   node tools/test/stealthonly.mjs [--games 16]
import { newGame, makePlant, evolve, upgrade } from '../../v2/src/game/logic.js';
import { unitOf, makeRng } from '../../v2/src/game/fight.js';
import { makeBattle, playTurn, BASICS } from '../../v2/src/battle/model.js';
import { canUse } from '../../v2/src/battle/status.js';
import { SPECIES, SKILLS } from '../../v2/src/game/catalog.js';

const i0 = process.argv.indexOf('--games'), games = i0 > 0 ? +process.argv[i0 + 1] : 16, ME = 'vine_wind', HIDE = SKILLS.u_gvine_1, SUN = BASICS.find(s => s.id === 'sun');
function plantOf(key, seed) {
  const rng = makeRng(seed), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0);
  s.wallet.credits = 1e7;
  const p = makePlant(s, { key }, rng, 0); s.plants.push(p);
  for (const k of Object.keys(p.ivs)) p.ivs[k] = 5;
  while (p.stage < 2) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = 4; p.pts = (2 * 5 + 4 - 1) * 2;
  const order = ['hp', 'atk', 'def', 'spd']; let i = 0; while (p.pts > 0) upgrade(s, p.uid, order[i++ % 4], 1);
  p.cards = [null, null];
  return p;
}
let w = 0, all = 0;
const rows = [];
for (const k of Object.keys(SPECIES)) {
  if (k === ME) continue;
  let kw = 0;
  for (let g = 0; g < games; g++) {
    const B = makeBattle({ me: unitOf('me', plantOf(ME, 7000 + g)), foe: unitOf('foe', plantOf(k, 9000 + g)), seed: 31 * g + k.length });
    B.me.kit = [...B.me.kit.filter(s => s.id !== HIDE.id), HIDE];
    while (!B.over && B.turn <= 80) playTurn(B, canUse(B.me, HIDE) ? HIDE : SUN);
    kw += B.over === 'win' ? 1 : B.over === 'lose' ? 0 : 0.5;
  }
  rows.push([SPECIES[k].name, kw / games]); w += kw; all += games;
}
rows.sort((a, b) => b[1] - a[1]);
console.log(`게일바인 은신만: 승률 ${(100 * w / all).toFixed(1)}% (${all}판) · 가장 잘 이긴 상대 ${rows.slice(0, 3).map(([n, r]) => `${n} ${(100 * r).toFixed(0)}%`).join(' · ')}`);
