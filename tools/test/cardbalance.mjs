// 카드 균형(화면 없이 · 보고용 — 2026-10-17 사용자 "수치 임시는 좋아 · 해보고 밸런스 ㄱㄱ"):
//  같은 식물 둘(같은 단계 · 레벨 · 개체값 · 같은 기술)을 봇 머리(aiPick)로 싸우게 하고 한쪽에만 카드를 끼워 이긴 비율을 잰다.
//  ① 카드 하나씩(카드 쪽 승률) ② 일반 식물 + 일반 카드 둘 vs 같은 종 변이 식물 + 그 변이 카드 둘 ③ 태생 변이(카드 칸 둘 + 전투 칸 카드) vs 일반 식물 + 일반 카드 둘
//  선공 · 운 차이를 줄이려고 종 여섯 × 판 수만큼 씨앗을 바꿔 돌림. 목표(시제품): 카드 하나 52~62% · ②③ 45~55%
//   node tools/test/cardbalance.mjs [--games 160] [--only n_fiber,v_sap]
import { newGame, makePlant, evolve } from '../../v2/src/game/logic.js';
import { unitOf } from '../../v2/src/game/fight.js';
import { CARDS, NORMAL_CARDS, formCards, isSkillCard } from '../../v2/src/game/cards.js';
import { SPECIES, FORMS } from '../../v2/src/game/catalog.js';
import { makeBattle, playTurnVs, aiPick } from '../../v2/src/battle/model.js';
import { makeRng } from '../../v2/src/battle/rules.js';
import { mustSkip } from '../../v2/src/battle/status.js';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const GAMES = +(arg('games') || 160), ONLY = arg('only') ? new Set(arg('only').split(',')) : null;
const KEYS = ['flower_grass', 'thorn', 'aqua', 'cactus_fire', 'gaia', 'spark'];   // 종 여섯(종 넷 · 속성 다섯)
const MUSH = ['spore_cap', 'stone_cap', 'jelly_cap'];                              // 포자 변이는 버섯만
// 같은 식물(같은 씨앗) — 단계 1 · Lv3 · 개체값 5 · 강화 없음
function plantOf(key, form, seed) {
  const rng = makeRng(seed), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0);
  const p = makePlant(s, { key, form: form || undefined }, rng, 0);
  s.plants.push(p); p.lv = 6; evolve(s, p.uid, rng); p.lv = 3;
  p.ivs = { hp: 5, atk: 5, def: 5, spd: 5 }; p.up = {}; p.cards = [null, null];
  return p;
}
function duel(pa, pb, seed) {   // a 쪽 승 = 1(무승부 · 80턴 넘김 = 0.5)
  const a = unitOf('me', pa), b = unitOf('foe', pb), B = makeBattle({ me: a, foe: b, seed }), ra = makeRng(seed * 3 + 1), rb = makeRng(seed * 5 + 2);
  while (!B.over && B.turn <= 80) playTurnVs(B, mustSkip(B.me) ? 'rest' : aiPick(B.me, B.foe, ra), mustSkip(B.foe) ? 'rest' : aiPick(B.foe, B.me, rb));
  return B.over === 'win' ? 1 : B.over === 'lose' ? 0 : 0.5;
}
// 한쪽 카드(cardsA) vs 다른 쪽 카드(cardsB) — 같은 종 · 같은 기술, 자리(선 · 후 씨앗)를 번갈아
function rate(keys, form, cardsA, cardsB, games = GAMES) {
  let w = 0, n = 0;
  for (let g = 0; g < games; g++) {
    const key = keys[g % keys.length], base = 9000 + g * 17;
    const pa = plantOf(key, form, base), pb = plantOf(key, form, base);
    pa.cards = [...cardsA, null, null].slice(0, 2); pb.cards = [...cardsB, null, null].slice(0, 2);
    w += g % 2 ? duel(pa, pb, base + 7) : 1 - duel(pb, pa, base + 7); n++;
  }
  return w / n;
}
const pct = x => (100 * x).toFixed(0).padStart(3) + '%';
const mark = x => (x > 0.64 ? ' ▲ 셈' : x < 0.5 ? ' ▼ 약함' : '');

console.log(`카드 균형(판 ${GAMES}씩 · 같은 식물끼리, 카드 쪽 승률 — 목표 52~62%)`);
console.log('\n[일반 카드 — 일반 식물]');
for (const id of NORMAL_CARDS) { if (ONLY && !ONLY.has(id)) continue; const r = rate(KEYS, null, [id], []); console.log(`  ${CARDS[id].name.padEnd(8, '　')} ${pct(r)}${mark(r)}`); }
for (const f of Object.keys(FORMS)) {
  const keys = f === 'spore' ? MUSH : KEYS, ids = formCards(f).filter(id => !ONLY || ONLY.has(id));
  if (!ids.length) continue;
  console.log(`\n[${FORMS[f].name} 변이 카드 — ${FORMS[f].name} 변이 식물]`);
  for (const id of ids) { const r = rate(keys, f, [id], []); console.log(`  ${(CARDS[id].name + (isSkillCard(id) ? '(기술)' : '')).padEnd(10, '　')} ${pct(r)}${mark(r)}`); }
}
if (!ONLY) {
  // ①' 짝 카드: 기술 카드 하나를 끼운 같은 식물끼리 — 한쪽만 짝 카드를 더함
  console.log('\n[짝 카드 — 기술 카드와 함께일 때(같은 기술 카드끼리, 짝 카드 쪽 승률)]');
  for (const [f, sk, pair] of [['weapon', 'm_slash', 'v_forge'], ['weapon', 'm_slash', 'v_ammo'], ['predator', 'm_bite', 'v_jaw'], ['toxic', 'm_spit', 'v_venom'], ['spore', 'm_puff', 'v_spread']]) {
    const r = rate(f === 'spore' ? MUSH : KEYS, f, [sk, pair], [sk, null]);
    console.log(`  ${CARDS[pair].name} + ${CARDS[sk].name}  ${pct(r)}${mark(r)}`);
  }
  // ② 일반 + 일반 카드 둘(공격 · 체력) vs 같은 종 변이 + 그 변이 카드 둘(기술 하나 + 패시브 하나) — 다른 식물이라 rate를 따로
  console.log('\n[일반 식물 + 일반 카드 둘  vs  같은 종 변이 식물 + 변이 카드 둘 — 일반 쪽 승률, 목표 45~55%]');
  const pairs = { predator: ['m_bite', 'v_sap'], weapon: ['m_slash', 'v_forge'], toxic: ['m_spit', 'v_venom'], dragon: ['m_breath', 'v_scale'], spore: ['m_puff', 'v_mycel'] };
  for (const [f, mc] of Object.entries(pairs)) {
    const keys = f === 'spore' ? MUSH : KEYS;
    let w = 0;
    for (let g = 0; g < GAMES; g++) {
      const key = keys[g % keys.length], base = 5000 + g * 13, pa = plantOf(key, null, base), pb = plantOf(key, f, base);
      pa.cards = ['n_fiber', 'n_vacuole']; pb.cards = [...mc];
      w += g % 2 ? duel(pa, pb, base + 3) : 1 - duel(pb, pa, base + 3);
    }
    console.log(`  ${FORMS[f].name.padEnd(3, '　')} (${mc.map(id => CARDS[id].name).join(' · ')}) ${pct(w / GAMES)}${w / GAMES > 0.58 ? ' ▲ 일반이 셈' : w / GAMES < 0.42 ? ' ▼ 변이가 셈' : ''}`);
  }
  // ③ 태생 변이(드레이크캑터: 카드 칸 둘 + 전투 칸 하나에 기술 카드) vs 같은 종 · 속성의 일반 식물(엠버캑터 + 일반 카드 둘)
  console.log('\n[태생 변이  vs  일반 식물 + 일반 카드 둘 — 태생 쪽 승률]');
  //  상대 = 같은 속성 일반 식물(속성 상성이 끼지 않게): 드레이크 · 블레이드 · 엠버캡 = 불, 드라코 = 빙결, 톡시 = 풀, 팽트랩 = 대지
  for (const [inn, norm, f] of [['drake_cactus', 'cactus_fire', 'dragon'], ['draco_fruit', 'frost_bell', 'dragon'], ['blade_vine', 'flower_fire', 'weapon'], ['toxi_cactus', 'thorn', 'toxic'], ['fang_trap', 'gaia', 'predator'], ['ember_cap', 'cactus_fire', 'spore']]) {
    let w = 0;
    for (let g = 0; g < GAMES; g++) {
      const base = 7000 + g * 11, pa = plantOf(inn, null, base), pb = plantOf(norm, null, base), fc = formCards(f), sk = fc.filter(isSkillCard), pas = fc.filter(id => !isSkillCard(id));
      pa.cards = [sk[0], pas[0]];
      const bi = pa.skills.battle.findIndex(x => ['basic', 'guard', 'evade'].includes(x));
      if (bi >= 0 && sk[1]) pa.skills.battle[bi] = sk[1];
      pb.cards = ['n_fiber', 'n_vacuole'];
      w += g % 2 ? duel(pa, pb, base + 5) : 1 - duel(pb, pa, base + 5);
    }
    console.log(`  ${SPECIES[inn].name.padEnd(7, '　')} vs ${SPECIES[norm].name.padEnd(6, '　')} ${pct(w / GAMES)}`);
  }
}
