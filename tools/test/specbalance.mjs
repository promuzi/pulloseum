// 종 리그전(화면 없이 · 보고용 — 2026-10-17 전투 칸 여섯 뒤 점검, 사용자 "3번까지 다 하자" · 밸런스는 나중에 사용자가):
//  모든 종을 같은 단계 · 레벨 · 개체값 · 고르게 쓴 강화로 맞추고 서로 한 번씩 여러 판(양쪽 다 봇 머리 aiPick) → 종마다 평균 승률.
//  기술 = 진짜 규칙으로 진화시켜 핀 전투 칸 여섯(태생 변이는 처음 핀 기술 카드 포함), 카드 칸 패시브는 뺌(종 자체 힘만).
//  기준(시제품): 45~55% 고름 · 60% 넘거나 40% 아래면 쏠림
//   node tools/test/specbalance.mjs [--games 16] [--stage 2] [--lv 4]
import { newGame, makePlant, evolve, upgrade } from '../../v2/src/game/logic.js';
import { unitOf, makeRng } from '../../v2/src/game/fight.js';
import { makeBattle, playTurn, aiPick } from '../../v2/src/battle/model.js';
import { SPECIES, ROLES, JONG, ELEM, SKILLS } from '../../v2/src/game/catalog.js';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? +process.argv[i + 1] : d; };
const FULL = process.argv.includes('--full'), BASIC = new Set(['basic', 'guard', 'evade', 'sun']);
const games = arg('--games', 16), STAGE = arg('--stage', 2), LV = arg('--lv', 4);
const keys = Object.keys(SPECIES);
function plantOf(key, seed) {
  const rng = makeRng(seed), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0);
  s.wallet.credits = 1e7;
  const p = makePlant(s, { key }, rng, 0); s.plants.push(p);
  for (const k of Object.keys(p.ivs)) p.ivs[k] = 5;
  while (p.stage < STAGE) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = LV; p.pts = (STAGE * 5 + LV - 1) * 2;
  const order = ['hp', 'atk', 'def', 'spd']; let i = 0; while (p.pts > 0) upgrade(s, p.uid, order[i++ % 4], 1);
  p.cards = [null, null];
  if (FULL) fullHand(p);
  return p;
}
// --full(2026-10-29 밤샘): 진화 고르기를 사람처럼 마저 골라 전투 칸을 채움 — 기본은 고르기가 안 끝나 새싹 때 손패(개성 1 + 하급 1 + 기본기)만으로 싸움.
//  고르기마다 그 종 개성 기술 먼저 · 다음은 위력 높은 것 · 전투 칸 = 고른 기술 넷(개성 먼저) + 평타 · 방어태세
function fullHand(p) {
  const got = [...(p.skills.battle || []).filter(id => id && SKILLS[id] && !BASIC.has(id))];
  for (const d of p.drafts || []) {
    if (d.part === 'passive') continue;
    const c = [...d.cands].filter(id => SKILLS[id]).sort((a, b) => (SKILLS[b].tier === 'u') - (SKILLS[a].tier === 'u') || (SKILLS[b].power || 0) - (SKILLS[a].power || 0));
    got.push(...c.slice(0, d.pick));
  }
  p.drafts = [];
  const hand = [...new Set(got)].sort((a, b) => (SKILLS[b].tier === 'u') - (SKILLS[a].tier === 'u')).slice(0, 4);
  p.skills.battle = [...hand, 'basic', 'guard', null, null].slice(0, 6);
}
function fight(a, b, seed) {
  const B = makeBattle({ me: unitOf('me', a), foe: unitOf('foe', b), seed }), pick = makeRng(seed * 13 + 5);
  while (!B.over && B.turn <= 80) playTurn(B, aiPick(B.me, B.foe, pick) || B.me.kit[0]);   // 상대 = playTurn 안의 같은 봇 머리
  return B.over === 'win' ? 1 : B.over === 'lose' ? 0 : 0.5;
}
const plants = Object.fromEntries(keys.map((k, i) => [k, Array.from({ length: games }, (_, g) => plantOf(k, 1000 + i * 97 + g))]));
const win = Object.fromEntries(keys.map(k => [k, 0])), n = Object.fromEntries(keys.map(k => [k, 0]));
const pair = {};
const t0 = Date.now();
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  let w = 0;
  for (let g = 0; g < games; g++) {   // 자리 바꿔 반씩(선공 · 위치 차이를 지움)
    const seed = 50000 + i * 1009 + j * 31 + g;
    w += g % 2 ? 1 - fight(plants[keys[j]][g], plants[keys[i]][g], seed) : fight(plants[keys[i]][g], plants[keys[j]][g], seed);
  }
  win[keys[i]] += w; win[keys[j]] += games - w; n[keys[i]] += games; n[keys[j]] += games;
  pair[keys[i] + '>' + keys[j]] = w / games;
}
const rows = keys.map(k => ({ k, r: win[k] / n[k] })).sort((a, b) => b.r - a.r);
console.log(`종 리그전 — 단계 ${STAGE} · Lv${LV} · 개체값 5 · 강화 고르게 · 카드 패시브 없음 · 짝마다 ${games}판(${((Date.now() - t0) / 1000).toFixed(0)}초)`);
for (const { k, r } of rows) {
  const sp = SPECIES[k], flag = r > 0.6 ? '  ▲ 셈' : r < 0.4 ? '  ▼ 약함' : '';
  const kit = plants[k][0].skills.battle.filter(Boolean).length;
  console.log(`${(100 * r).toFixed(1).padStart(5)}%  ${sp.name.padEnd(8, '　')} ${JONG[sp.type]}·${ELEM[sp.el]}${sp.form ? '·변이' : ''}  ${ROLES[sp.role] || ''}  손패 ${kit}${flag}`);
}
// 가장 기운 짝 다섯
const lop = Object.entries(pair).map(([k, r]) => ({ k, d: Math.abs(r - 0.5), r })).sort((a, b) => b.d - a.d).slice(0, 5);
console.log('가장 기운 짝: ' + lop.map(({ k, r }) => { const [a, b] = k.split('>'); return `${SPECIES[a].name} 대 ${SPECIES[b].name} ${(100 * r).toFixed(0)}%`; }).join(' · '));
