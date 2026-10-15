// 식물 → 전투 유닛, 봇 상대 만들기, 같은 씨앗·같은 선택이면 같은 결과(서버 확인용 다시 돌리기). 서버·화면 공용.
// 봇 판: 서버가 씨앗·상대를 정해 주고(battle/start) 화면이 그 씨앗으로 싸운 뒤 고른 기술 목록을 보내면(battle/finish) 서버가 똑같이 다시 돌려 승패를 확인 → 보상.
import { SPECIES, SKILLS, IV_KEYS, IV_MAX, uniqueOf, bloomPool, STAGE_KEY } from './catalog.js';
import { plantStats } from './logic.js';
import { BASICS, makeBattle, playTurn, playTurnVs, REST } from '../battle/model.js';
import { makeTeamBattle, playTurn3, sendIn } from '../battle/team.js';
import { makeRng } from '../battle/rules.js';

export function kitOfPlant(p) {
  const own = p.skills.battle.filter(Boolean).map(id => ({ act: 'attack', cats: ['attack'], ...SKILLS[id], fx: p.key }));
  return [...BASICS.map(b => ({ ...b, fx: b.act === 'attack' ? p.key : null })), ...own];
}
// 전투 유닛(rules.js가 읽는 값) — 화면 그림용 key · stage(그림 단계) · pot · shiny도 실어 둠
export function unitOf(id, p, extra = {}) {
  const st = plantStats(p), sp = SPECIES[p.key];
  return {
    id, key: p.key, name: p.name, el: sp.el, jong: sp.type, pot: p.pot || 'pot_terra', stage: STAGE_KEY[p.stage], shiny: !!p.shiny, legend: !!p.legend,
    hp: st.hp, max: st.hp, atk: st.atk, def: st.def, spd: st.spd, acc: st.acc, eva: 0, crit: st.crit,
    energy: 2, energyMax: 8, kit: kitOfPlant(p), eff: {}, ...extra,
  };
}
// 봇 식물: 내 식물 단계에 맞춰(공정하게) 무작위 식물 · 레벨 · 개체값 · 강화 · 기술
const BOT_NAMES = ['코스모싹', '은하 원예단', '별가루 농부', '혜성 정원사', '궤도 식물원', '달빛 온실'];
export function botPlant(rng, stage, lvHint = 3, tierBoost = 0) {
  const keys = Object.keys(SPECIES), key = keys[Math.floor(rng() * keys.length)], sp = SPECIES[key];
  const lv = Math.max(1, Math.min(6, lvHint + Math.floor(rng() * 3) - 1));
  const ivs = Object.fromEntries(IV_KEYS.map(k => [k, Math.min(IV_MAX, Math.floor(rng() * 9) + tierBoost)]));
  const pts = (stage * 5 + lv - 1) * 2, up = {};
  const pref = ['atk', 'hp', 'def', 'spd'];
  for (let i = 0; i < pts; i++) { const k = pref[Math.floor(rng() * (rng() < 0.6 ? 2 : 4))]; up[k] = (up[k] || 0) + 1; }
  const battle = [uniqueOf(key, 0)];
  for (let st = 0; st <= stage && battle.length < 3; st++) {
    const pool = bloomPool(key, st).filter(x => !battle.includes(x.id));
    if (st > 0 && rng() < 0.7) battle.push(uniqueOf(key, st));
    else if (pool.length) battle.push(pool[Math.floor(rng() * pool.length)].id);
  }
  while (battle.length < 3) battle.push(null);
  return { uid: 'bot', key, name: sp.name, stage, lv, ivs, up, pts: 0, pot: 'pot_terra', skills: { battle: battle.slice(0, 3), joker: null, forgot: [], learned: [] }, shiny: false, legend: false };
}
export const botTrainer = rng => BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)];

// 봇 판 차리기(서버·화면 같은 값): 1:1 = 내 식물 하나, 3:3 = 내 팀 셋
export function setupBot({ seed, mode, mine, foes, trainer, rank }) {
  if (mode === 'swap3') {
    const me = mine.map(p => unitOf('me', p)), foe = foes.map(p => unitOf('foe', p, { trainer, rank }));
    return makeTeamBattle({ me, foe, seed });
  }
  return makeBattle({ me: unitOf('me', mine[0]), foe: unitOf('foe', foes[0], { trainer, rank }), seed });
}
// 다시 돌리기: acts = 화면이 고른 순서대로 — 1:1 = 기술 id, 3:3 = { kind: 'skill', id } | { kind: 'switch', to } | { kind: 'rest' } | { kind: 'send', to }
export function replayBot(spec, acts) {
  const B = setupBot(spec);
  for (const a of acts) {
    if (B.over) break;
    if (spec.mode === 'swap3') {
      if (a.kind === 'send') { if (B.need === 'me') sendIn(B, a.to); continue; }
      if (B.need === 'me') { const nx = B.team.me.findIndex(u => u.hp > 0); if (nx >= 0) sendIn(B, nx); }
      const act = a.kind === 'skill' ? { kind: 'skill', skill: B.me.kit.find(k => k.id === a.id) || B.me.kit[0] } : a.kind === 'switch' ? { kind: 'switch', to: a.to } : { kind: 'rest' };
      playTurn3(B, act);
    } else playTurn(B, B.me.kit.find(k => k.id === a) || REST);
    if (B.turn > 80) break;
  }
  return { over: B.over, turns: B.turn - 1 };
}
// PvP(1:1): 서버가 두 사람 선택으로 한 턴씩 풂 — 사건은 A 쪽에서 본 것('me' = A). B에게 보낼 땐 mirror로 뒤집음
export function setupPvp({ seed, a, b, aName, bName }) {
  return makeBattle({ me: unitOf('me', a, { trainer: aName }), foe: unitOf('foe', b, { trainer: bName }), seed });
}
export const pvpTurn = (B, aSkill, bSkill) => playTurnVs(B, aSkill, bSkill);
const SW = { me: 'foe', foe: 'me' };
export function mirrorEvents(events) {
  return events.map(e => { const o = { ...e }; if (o.who in SW) o.who = SW[o.who]; if (o.to in SW) o.to = SW[o.to]; return o; });
}
export { makeRng };
