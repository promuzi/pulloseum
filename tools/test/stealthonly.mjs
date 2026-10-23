// 은신만 써서 이기나(사용자 요청 2026-10-21 게일바인 '나중에 은신만 써서 이길 수 있는지 확인해줘'):
//  게일바인이 '그건 내 잔상인데?'만 쓰고(햇빛이 모자라면 광합성) 다른 모든 종의 봇과 싸운 승률 — 종 리그전과 같은 조건(단계 2 · Lv4 · 개체값 5)
//  상대 손패에 광역(은신을 무시) · 연타가 있는지로 나눠 봄(사용자 2026-10-24 '상대가 광역이 없었던거 아님?') · 상대가 실제로 쓴 광역 횟수
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
const grp = { area: [0, 0], multi: [0, 0], none: [0, 0] };
let w = 0, all = 0, areaUsed = 0, areaHad = 0;
const rows = [];
for (const k of Object.keys(SPECIES)) {
  if (k === ME) continue;
  let kw = 0;
  for (let g = 0; g < games; g++) {
    const B = makeBattle({ me: unitOf('me', plantOf(ME, 7000 + g)), foe: unitOf('foe', plantOf(k, 9000 + g)), seed: 31 * g + k.length });
    B.me.kit = [...B.me.kit.filter(s => s.id !== HIDE.id), HIDE];
    const hasArea = B.foe.kit.some(s => s.act === 'attack' && s.area), hasMulti = B.foe.kit.some(s => s.act === 'attack' && (s.hits || 1) > 1);
    while (!B.over && B.turn <= 80) {
      playTurn(B, canUse(B.me, HIDE) ? HIDE : SUN);
      const last = B.log[B.log.length - 1], fs = last && (last.foeSkill || last.foe);
      if (fs && fs.area) areaUsed++;
    }
    const r = B.over === 'win' ? 1 : B.over === 'lose' ? 0 : 0.5, gk = hasArea ? 'area' : hasMulti ? 'multi' : 'none';
    grp[gk][0] += r; grp[gk][1]++; if (hasArea) areaHad++;
    kw += r;
  }
  rows.push([SPECIES[k].name, kw / games]); w += kw; all += games;
}
rows.sort((a, b) => b[1] - a[1]);
const pct = ([a, b]) => b ? `${(100 * a / b).toFixed(1)}% (${b}판)` : '—';
console.log(`게일바인 은신만: 승률 ${(100 * w / all).toFixed(1)}% (${all}판) · 가장 잘 이긴 상대 ${rows.slice(0, 3).map(([n, r]) => `${n} ${(100 * r).toFixed(0)}%`).join(' · ')}`);
console.log(`상대 손패별: 광역 있음 ${pct(grp.area)} · 광역 없이 연타만 ${pct(grp.multi)} · 둘 다 없음 ${pct(grp.none)} · 상대가 쓴 광역 ${areaUsed}번`);
