// 식물 → 전투 유닛, 봇 상대 만들기, 같은 씨앗·같은 선택이면 같은 결과(서버 확인용 다시 돌리기). 서버·화면 공용.
// 봇 판: 서버가 씨앗·상대를 정해 주고(battle/start) 화면이 그 씨앗으로 싸운 뒤 고른 기술 목록을 보내면(battle/finish) 서버가 똑같이 다시 돌려 승패를 확인 → 보상.
import { SPECIES, SKILLS, IV_KEYS, IV_MAX, uniqueOf, bloomPool, STAGE_KEY, FORM_KEYS, formSkills, MUT_SLOTS } from './catalog.js';
import { plantStats, Err } from './logic.js';
import { basicsOf, makeBattle, playTurn, playTurnVs, REST } from '../battle/model.js';
import { makeTeamBattle, playTurn3, sendIn } from '../battle/team.js';
import { makeRng } from '../battle/rules.js';

// 손패 = 전투 칸 넷(배운 기술 · 기본기 섞어서 — 2026-10-16 사용자 "총 전투에 들고가는 스킬은 4개"), 순서 그대로.
//  옛 판(v4 표시 없음 = 전투 3칸 + 기본기 셋 늘)은 그때 손패 그대로 — 이어 하는 판 · 다시 돌리기가 같은 결과가 나오게
export function kitOfPlant(p) {
  const S = p.skills, B = basicsOf(p.key), sk = id => B.find(b => b.id === id) || ({ act: 'attack', cats: ['attack'], ...SKILLS[id], fx: p.key });
  if (!S.v4) return [...B, ...S.battle.filter(Boolean).map(sk)];
  const kit = S.battle.filter(id => id && (SKILLS[id] || B.some(b => b.id === id))).map(sk);
  return [...(kit.length ? kit : B), ...mutKit(p)];
}
// 변이 칸 둘(그 식물 변이의 기술만 · 에너지 대신 판마다 정해진 횟수) — 숨결(elOwn)은 그 식물 속성, 연출은 기술 id(attack.mjs)
export function mutKit(p) {
  if (!p.form || !p.skills || !Array.isArray(p.skills.mut)) return [];
  const el = SPECIES[p.key] && SPECIES[p.key].el;
  return p.skills.mut.slice(0, MUT_SLOTS).filter(id => id && SKILLS[id] && SKILLS[id].form === p.form).map(id => ({ ...SKILLS[id], ...(SKILLS[id].elOwn ? { el } : {}), mut: true }));
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
  // 종 고르기: 드문 종은 덜, 변이 고정 종(태생 변이 — 드묾)은 더 드물게(2026-10-17 새 다섯을 넣자 봇 넷 중 하나가 변이가 됨)
  const keys = Object.keys(SPECIES), wOf = k => (SPECIES[k].form ? 0.2 : SPECIES[k].rarity === 'rare' ? 0.6 : 1), tot = keys.reduce((a, k) => a + wOf(k), 0);
  let r0 = rng() * tot, key = keys[keys.length - 1];
  for (const k of keys) { r0 -= wOf(k); if (r0 <= 0) { key = k; break; } }
  const sp = SPECIES[key];
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
  // 봇 손패 넷 = 배운 기술 앞 둘 + 평타 + 방어나 회피(사람과 같은 넷 — 셋째 배운 기술이 있으면 방어 · 회피 대신 반쯤)
  const extra = battle[2] && rng() < 0.5 ? battle[2] : rng() < 0.5 ? 'guard' : 'evade';
  const four = [battle[0], battle[1] || (rng() < 0.5 ? 'guard' : 'evade'), 'basic', extra].filter((x, i, a) => x && a.indexOf(x) === i);
  for (const b of ['guard', 'evade']) if (four.length < 4 && !four.includes(b)) four.push(b);
  // 변이 봇(자라는 단계부터 가끔 — 사람과 같은 변이 칸 둘): 버섯 = 포자 · 그 밖 = 포식 · 무기 · 독성 · 용족 중
  let form = sp.form || null, mut = [null, null];
  if (!form && stage >= 1 && rng() < 0.08 + 0.02 * tierBoost) { const fs = sp.type === 'mushroom' ? ['spore'] : FORM_KEYS.filter(k => k !== 'spore'); form = fs[Math.floor(rng() * fs.length)]; }
  if (form) { const list = formSkills(form); for (let i = 0; i < MUT_SLOTS && list.length; i++) mut[i] = list.splice(Math.floor(rng() * list.length), 1)[0]; }
  return { uid: 'bot', key, name: sp.name, stage, lv, ivs, up, pts: 0, pot: 'pot_terra', form, skills: { battle: four.slice(0, 4), joker: null, forgot: [], learned: [], v4: 1, mut }, shiny: false, legend: false };
}
export const botTrainer = rng => BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)];

// 봇 판 차리기(서버·화면 같은 값): 1:1 = 내 식물 하나, 3:3 = 내 팀 셋
export function setupBot({ seed, mode, mine, foes, trainer, rank, tlv }) {
  if (mode === 'swap3') {
    const me = mine.map(p => unitOf('me', p)), foe = foes.map(p => unitOf('foe', p, { trainer, rank, tlv }));
    return makeTeamBattle({ me, foe, seed });
  }
  return makeBattle({ me: unitOf('me', mine[0]), foe: unitOf('foe', foes[0], { trainer, rank, tlv }), seed });
}
// 한 수: 1:1 = 기술 id('rest' = 쉬는 차례), 3:3 = { kind: 'skill', id } | { kind: 'switch', to } | { kind: 'rest' } | { kind: 'send', to }(쓰러진 자리 채우기)
//  잘못된 수는 Err — 서버는 화면이 보낸 수를 이걸로만 판에 넣음(봇 판은 서버가 한 턴씩 풂: 화면은 씨앗을 모르고 결과만 받음)
export const MAX_TURNS = 80;
const bad = msg => { throw new Err(msg); };
export function botStep(B, mode, a) {
  if (B.over) bad('이미 끝난 판이에요');
  if (B.turn > MAX_TURNS) bad('판이 너무 길어요');
  if (mode === 'swap3') {
    if (!a || typeof a !== 'object') bad('잘못된 수');
    if (a.kind === 'send') {
      if (B.need !== 'me') bad('지금은 내보낼 때가 아니에요');
      const u = B.team.me[a.to]; if (!Number.isInteger(a.to) || !u || u.hp <= 0) bad('그 식물은 나갈 수 없어요');
      return { send: sendIn(B, a.to) };
    }
    if (B.need === 'me') bad('다음 식물을 먼저 골라 주세요');
    if (a.kind === 'skill') { const k = B.me.kit.find(x => x.id === a.id); if (!k) bad('모르는 기술'); return { turn: playTurn3(B, { kind: 'skill', skill: k }) }; }
    if (a.kind === 'switch') { if (!Number.isInteger(a.to) || !B.team.me[a.to]) bad('잘못된 교체'); return { turn: playTurn3(B, { kind: 'switch', to: a.to }) }; }
    if (a.kind === 'rest') return { turn: playTurn3(B, { kind: 'rest' }) };
    bad('잘못된 수');
  }
  if (typeof a !== 'string') bad('잘못된 수');
  const k = a === 'rest' ? REST : B.me.kit.find(x => x.id === a);
  if (!k) bad('모르는 기술');
  return { turn: playTurn(B, k) };
}
// 다시 돌리기(서버가 저장한 수들로 판을 다시 세움 — 같은 씨앗·같은 수 → 같은 판)
export function replayBot(spec, acts) {
  const B = setupBot(spec);
  for (const a of acts) { if (B.over) break; botStep(B, spec.mode, a); }
  return B;
}
// 화면에 보낼 판 모습(유닛 값 그대로 — 화면은 이걸로 자기 판을 고쳐 씀)
const unitV = u => ({ id: u.id, key: u.key, name: u.name, el: u.el, jong: u.jong, pot: u.pot, stage: u.stage, shiny: !!u.shiny, legend: !!u.legend, trainer: u.trainer, rank: u.rank, tlv: u.tlv,
  hp: u.hp, max: u.max, atk: u.atk, def: u.def, spd: u.spd, acc: u.acc, eva: u.eva, crit: u.crit, energy: u.energy, energyMax: u.energyMax, kit: u.kit, eff: u.eff, st: u.st || null, used: u.used || null });   // used = 변이 기술을 이번 판에 쓴 횟수
export function viewOf(B) {
  if (B.mode === 'swap3') return { mode: 'swap3', turn: B.turn, over: B.over, need: B.need, act: { ...B.act }, pool: { ...B.pool }, team: { me: B.team.me.map(unitV), foe: B.team.foe.map(unitV) } };
  return { mode: '1v1', turn: B.turn, over: B.over, me: unitV(B.me), foe: unitV(B.foe) };
}
// 화면 쪽: 서버가 보낸 모습으로 판을 세우고(처음) · 턴마다 같은 유닛 객체를 고쳐 씀(교체 연출이 유닛 객체를 붙잡고 있음)
const UNIT_KEYS = ['hp', 'max', 'atk', 'def', 'spd', 'acc', 'eva', 'crit', 'energyMax', 'kit', 'eff', 'st', 'used', 'name', 'key', 'el', 'jong', 'pot', 'stage', 'shiny', 'legend', 'trainer', 'rank', 'tlv'];
export function battleFromView(v) {
  if (v.mode === 'swap3') {
    const B = makeTeamBattle({ me: v.team.me.map(u => ({ ...u })), foe: v.team.foe.map(u => ({ ...u })), seed: 1 });
    applyView(B, v);
    return B;
  }
  return { me: { ...v.me }, foe: { ...v.foe }, rng: null, turn: v.turn, over: v.over, log: [] };
}
export function applyView(B, v) {
  B.turn = v.turn; B.over = v.over;
  if (v.mode === 'swap3') {
    B.need = v.need; B.act = { ...v.act }; B.pool = { ...v.pool };   // 에너지 = 팀 풀(유닛 energy 는 B.pool 을 읽음)
    for (const side of ['me', 'foe']) v.team[side].forEach((u, i) => { const t = B.team[side][i]; for (const k of UNIT_KEYS) t[k] = u[k]; });
    B.me = B.team.me[B.act.me]; B.foe = B.team.foe[B.act.foe];
    return;
  }
  for (const side of ['me', 'foe']) { const t = B[side], u = v[side]; for (const k of UNIT_KEYS) t[k] = u[k]; t.energy = u.energy; }
}
// PvP B 쪽 모습: 나·상대를 바꾸고(id 도 'me'/'foe'로), 승패도 뒤집음. 3:3은 팀 · 앞 번호 · 기력 · 쓰러진 자리(need)도
const FLIP = { win: 'lose', lose: 'win' };
export function viewFor(B, side) {
  const v = viewOf(B);
  if (side !== 'b') return v;
  if (v.mode === 'swap3') return { ...v, over: FLIP[v.over] || v.over, need: SW[v.need] || v.need, act: { me: v.act.foe, foe: v.act.me }, pool: { me: v.pool.foe, foe: v.pool.me }, team: { me: v.team.foe.map(u => ({ ...u, id: 'me' })), foe: v.team.me.map(u => ({ ...u, id: 'foe' })) } };
  return { ...v, over: FLIP[v.over] || v.over, me: { ...v.foe, id: 'me' }, foe: { ...v.me, id: 'foe' } };
}
export function turnFor(turn, side) {
  if (side !== 'b') return turn;
  return { ...turn, mySkill: turn.foeSkill, foeSkill: turn.mySkill, mySwitch: turn.foeSwitch, foeSwitch: turn.mySwitch, before: { me: turn.before.foe, foe: turn.before.me }, first: SW[turn.first] || turn.first, events: mirrorEvents(turn.events) };
}
// PvP(1:1): 서버가 두 사람 선택으로 한 턴씩 풂 — 사건은 A 쪽에서 본 것('me' = A). B에게 보낼 땐 mirror로 뒤집음
export function setupPvp({ seed, a, b, aName, bName }) {
  return makeBattle({ me: unitOf('me', a, { trainer: aName }), foe: unitOf('foe', b, { trainer: bName }), seed });
}
export const pvpTurn = (B, aSkill, bSkill) => playTurnVs(B, aSkill, bSkill);
// PvP 3:3(2026-10-16 사용자 "남은 거 다해줘" — 3:3 친구 대결): 양쪽 식물 셋, 수는 두 사람이 고르고 쓰러진 자리도 저마다 직접(B.need = 'me' | 'foe' | 'both')
export function setupPvp3({ seed, a, b, aName, bName }) {
  return makeTeamBattle({ me: a.map(p => unitOf('me', p, { trainer: aName })), foe: b.map(p => unitOf('foe', p, { trainer: bName })), seed });
}
// 서버가 받은 수({ kind:'skill', id } · { kind:'switch', to } · { kind:'rest' }) → 판 수(기술 객체)
const act3 = (u, a) => (a && a.kind === 'skill' ? { kind: 'skill', skill: u.kit.find(k => k.id === a.id) || u.kit[0] } : a && (a.kind === 'switch' || a.kind === 'rest') ? { kind: a.kind, to: a.to } : { kind: 'rest' });
export const pvpTurn3 = (B, aAct, bAct) => playTurn3(B, act3(B.me, aAct), act3(B.foe, bAct));
const SW = { me: 'foe', foe: 'me' };
export function mirrorEvents(events) {
  return events.map(e => { const o = { ...e }; if (o.who in SW) o.who = SW[o.who]; if (o.to in SW) o.to = SW[o.to]; return o; });
}
export { makeRng };
