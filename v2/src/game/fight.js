// 식물 → 전투 유닛, 봇 상대 만들기, 같은 씨앗·같은 선택이면 같은 결과(서버 확인용 다시 돌리기). 서버·화면 공용.
// 봇 판: 서버가 씨앗·상대를 정해 주고(battle/start) 화면이 그 씨앗으로 싸운 뒤 고른 기술 목록을 보내면(battle/finish) 서버가 똑같이 다시 돌려 승패를 확인 → 보상.
import { SPECIES, SKILLS, IV_KEYS, IV_MAX, uniqueOf, uniquesOf, bloomPool, STAGE_KEY, FORM_KEYS, PLANETS } from './catalog.js';
import { CARDS, passivesOf, isSkillCard, formCards, rollCard, baseOf } from './cards.js';
import { plantStats, Err } from './logic.js';
import { basicsOf, makeBattle, playTurn, playTurnVs, REST, elemMult } from '../battle/model.js';
import { makeTeamBattle, playTurn3, sendIn } from '../battle/team.js';
import { makeRng } from '../battle/rules.js';

// 손패 = 전투 칸 여섯(배운 기술 · 기본기 · 변이 기술 카드 섞어서 — 2026-10-17 사용자 "6개 들고 갈 수 있게 · 변이는 6개 중 2개를 변이 스킬 카드로"), 순서 그대로.
//  옛 판은 그때 손패 그대로 — 이어 하는 판 · 다시 돌리기(서버가 판을 시작할 때 식물을 통째로 저장)가 같은 결과가 나오게:
//  v4 표시 없음 = 전투 3칸 + 기본기 셋 늘 · v4 = 전투 넷 + 카드 칸의 기술 카드가 손패 뒤에(extra: true — 화면 아래 줄)
export function kitOfPlant(p) {
  const S = p.skills, B = basicsOf(p.key), pas = passivesOf(p.cards), sk = id => B.find(b => b.id === id) || (isSkillCard(id) ? cardSkill(p, id, pas, false) : { act: 'attack', cats: ['attack'], ...SKILLS[id], fx: p.key });
  if (!S.v4) return [...B.filter(b => b.id !== 'sun'), ...S.battle.filter(Boolean).map(sk)];   // 가장 옛 판 = 기본기 셋 그대로(광합성 모으기 2026-10-18 전 — 이어 하는 판을 다시 돌려도 같게)
  const kit = S.battle.filter(id => id && (isSkillCard(id) ? CARDS[id].form === p.form : SKILLS[id] || B.some(b => b.id === id))).map(sk);
  if (S.v6) return kit.length ? kit : B;
  return [...(kit.length ? kit : B), ...cardKit(p, pas)];
}
// 기술 카드 하나 → 손패 기술(그 식물 변이의 것만 · 에너지 대신 판마다 정해진 횟수): 숨결(elOwn)은 그 식물 속성, 단조 · 위턱(mutPow) = 위력 ↑, 탄약 보급(mutUses) = 횟수 +
function cardSkill(p, id, pas, extra) {
  const s = SKILLS[id], el = SPECIES[p.key] && SPECIES[p.key].el, o = { ...s, ...(s.elOwn ? { el } : {}), mut: true, extra };
  if (pas.mutPow && o.power) o.power = Math.round(o.power * (1 + pas.mutPow));
  if (pas.mutUses && o.uses) o.uses += pas.mutUses;
  return o;
}
export function cardKit(p, pas = passivesOf(p.cards)) {
  return (p.cards || []).filter(id => isSkillCard(id) && SKILLS[id] && CARDS[id].form === p.form).map(id => cardSkill(p, id, pas, true));
}
export const mutKit = p => cardKit(p);   // 옛 이름(시험 · 다른 화면)
// 화면(식물 관리)용: 이 식물에 끼운 기술 카드가 전투에서 어떤 기술이 되나(숨결 = 그 식물 속성 · 단조 · 탄약 보급 반영)
export const cardSkillOf = (p, id) => (isSkillCard(id) && SKILLS[id] ? cardSkill(p, id, passivesOf(p.cards), false) : null);
// 전투 유닛(rules.js가 읽는 값) — 화면 그림용 key · stage(그림 단계) · pot · shiny도 실어 둠
//  카드 패시브(2026-10-17): 능력치 배율(체력 · 공격 · 방어 · 기동 %, 치명 +) · 시작 에너지 + · 나머지 효과는 u.pas 로 규칙이 읽음(rules.js · status.js)
export function unitOf(id, p, extra = {}) {
  const st = plantStats(p), sp = SPECIES[p.key], pas = passivesOf(p.cards), k = s => 1 + (pas[s] || 0), hp = Math.round(st.hp * k('hp'));
  return {
    id, key: p.key, name: p.name, el: sp.el, jong: sp.type, pot: p.pot || 'pot_terra', stage: STAGE_KEY[p.stage], form: p.form || null, shiny: !!p.shiny, legend: !!p.legend,
    hp, max: hp, atk: Math.round(st.atk * k('atk')), def: Math.round(st.def * k('def')), spd: Math.round(st.spd * k('spd')), acc: st.acc, eva: 0, crit: st.crit + (pas.crit || 0),
    energy: 2 + (pas.energy || 0), energyMax: st.sunMax || 8, sunPer: st.sunRegen || 1, kit: kitOfPlant(p), eff: {}, pas, cards: (p.cards || []).filter(Boolean), ...extra,
  };
}
// 봇 식물: 내 식물 단계에 맞춰(공정하게) 무작위 식물 · 레벨 · 개체값 · 강화 · 기술
const BOT_NAMES = ['코스모싹', '은하 원예단', '별가루 농부', '혜성 정원사', '궤도 식물원', '달빛 온실'];
// 종마다 처음 나오는 궤도(행성 지도 PLANETS) — 2026-10-22 사용자 "식물의 종류는 완전랜덤이 아닌 어려워질 수록 멀리 있는 행성?의 식물이 등장하도록"
const ORBIT_OF = (() => { const o = {}; for (const p of PLANETS) for (const k of p.pool) o[k] = Math.min(o[k] || 9, p.orbit); return o; })();
export const orbitOf = k => ORBIT_OF[k] || 2;
// 대회 단계(0 브론즈 · 1 실버 · 2 골드 · 3 플래티넘 · 4 다이아 · 5 마스터 · 6 풀로세움) → 나올 수 있는 가장 먼 궤도.
//  가장 먼 궤도 식물이 더 자주(×1.5), 바로 안쪽은 보통, 그보다 가까우면 드물게(×0.4 · ×0.2) — 단계가 오를수록 먼 행성 식물을 만남
export const ORBIT_CAP = [1, 2, 2, 3, 3, 4, 4];
const orbitW = (k, cap) => { const o = orbitOf(k); return o > cap ? 0 : o === cap ? 1.5 : o === cap - 1 ? 1 : o === cap - 2 ? 0.4 : 0.2; };
// 처음 판(튜토리얼식 — 2026-10-22 사용자 "첫 계정 생성 후 튜토리얼식 전투는 상성이 좋은 애로 배치"): 내 속성이 잘 듣고(×1.5) 상대 속성은 나에게 보통인 종만
export const favorable = (myEl, k) => elemMult(myEl, SPECIES[k].el) > 1 && elemMult(SPECIES[k].el, myEl) === 1;
// 높은 단계 봇 = 강화 카드(+1 · +2 — 2026-10-22 일반 카드 강화와 함께): 골드부터 가끔 +1 · 다이아부터 가끔 +2(브론즈 · 실버는 굴리지 않음 — 낮은 단계 봇은 전과 같음)
const UP1 = [0, 0, 0.2, 0.3, 0.4, 0.5, 0.6], UP2 = [0, 0, 0, 0, 0.15, 0.25, 0.35];
function upCard(rng, c, tier) {
  const t = Math.max(0, Math.min(6, tier | 0)), C = CARDS[c];
  if (!C || !C.next || !(UP1[t] + UP2[t])) return c;
  const r = rng();
  return r < UP2[t] ? CARDS[C.next].next || C.next : r < UP2[t] + UP1[t] ? C.next : c;
}
export function botPlant(rng, stage, lvHint = 3, tierBoost = 0, opt = {}) {
  // 종 고르기: 드문 종은 덜, 변이 고정 종(태생 변이 — 드묾)은 더 드물게(2026-10-17 새 다섯을 넣자 봇 넷 중 하나가 변이가 됨) · 대회 단계만큼 먼 궤도까지(opt.tier)
  const cap = ORBIT_CAP[Math.max(0, Math.min(ORBIT_CAP.length - 1, opt.tier == null ? tierBoost : opt.tier))];
  const base = k => (SPECIES[k].form ? 0.2 : SPECIES[k].rarity === 'rare' ? 0.6 : 1) * orbitW(k, cap);
  let keys = Object.keys(SPECIES).filter(k => base(k) > 0);
  if (opt.favorEl) { const fav = keys.filter(k => favorable(opt.favorEl, k) && !SPECIES[k].form); if (fav.length) keys = fav; }
  const wOf = k => base(k), tot = keys.reduce((a, k) => a + wOf(k), 0);
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
    const us = uniquesOf(key, st).filter(id => !battle.includes(id));
    if (st > 0 && us.length && rng() < 0.7) battle.push(us[Math.floor(rng() * us.length)]);   // 그 단계 개성 중 하나(2026-10-17 단계마다 여럿)
    else if (pool.length) battle.push(pool[Math.floor(rng() * pool.length)].id);
  }
  // 봇 손패 여섯 = 배운 기술(셋까지) + 평타 · 방어 · 회피(사람과 같은 여섯 칸 — 2026-10-17)
  const six = [...battle, 'basic', 'guard', 'evade'];
  while (six.length < 6) six.push(null);
  // 변이 봇(자라는 단계부터 가끔): 버섯 = 포자 · 그 밖 = 포식 · 무기 · 독성 · 용족 중
  let form = sp.form || null;
  if (!form && stage >= 1 && rng() < 0.08 + 0.02 * tierBoost) { const fs = sp.type === 'mushroom' ? ['spore'] : FORM_KEYS.filter(k => k !== 'spore'); form = fs[Math.floor(rng() * fs.length)]; }
  // 카드(2026-10-17 — 사람과 같은 칸): 변이 봇 = 그 변이 기술 카드 한두 장(전투 칸의 회피 · 방어 자리) + 그 변이 패시브 하나, 일반 봇 = 단계만큼(어린 0~1 · 자람 1 · 다 자람 1~2) 일반 카드
  const cards = [null, null];
  if (form) {
    const fc = formCards(form), sk = fc.filter(isSkillCard), pa = fc.filter(x => !isSkillCard(x)), n = stage >= 2 && rng() < 0.5 ? 2 : 1;
    for (let i = 0; i < n && sk.length; i++) { const c = sk.splice(Math.floor(rng() * sk.length), 1)[0]; six[six.lastIndexOf(i ? 'guard' : 'evade')] = c; }
    cards[0] = pa[Math.floor(rng() * pa.length)];
  }
  else { const n = stage === 0 ? (rng() < 0.5 ? 1 : 0) : stage === 1 ? 1 : rng() < 0.6 ? 2 : 1; for (let i = 0; i < n; i++) { let c = rollCard(rng, 'normal'); c = cards.some(x => x && baseOf(x) === c) ? null : upCard(rng, c, tierBoost); cards[i] = c; } }
  return { uid: 'bot', key, name: sp.name, stage, lv, ivs, up, pts: 0, pot: 'pot_terra', form, cards, skills: { battle: six.slice(0, 6), store: [], forgot: [], learned: [], v4: 1, v6: 1, v7: 1 }, shiny: false, legend: false };
}
export const botTrainer = rng => BOT_NAMES[Math.floor(rng() * BOT_NAMES.length)];

// 봇 판 차리기(서버·화면 같은 값): 1:1 = 내 식물 하나, 3:3 = 내 팀 셋
// 봇 머리 좋음(0~1, model.js aiPick — 2026-10-22): 대회 단계가 오를수록 · 같은 단계에선 라운드(예선 0 … 결승 4)마다 조금씩 · 첫 판(튜토리얼식)은 낮게
export const aiOfTier = (tier, tut = false, round = 0) => (tut ? 0.15 : Math.min(0.95, 0.35 + 0.1 * Math.max(0, tier) + 0.02 * Math.max(0, round)));
export function setupBot({ seed, mode, mine, foes, trainer, rank, tlv, swapCd = 0, swOrder = false, ownSun = false, ai = 0.5 }) {
  if (mode === 'swap3') {
    const me = mine.map(p => unitOf('me', p)), foe = foes.map(p => unitOf('foe', p, { trainer, rank, tlv, ai }));
    return makeTeamBattle({ me, foe, seed, swapCd, swOrder, ownSun });   // ownSun = 햇빛 식물마다 따로(2026-10-22~ 새 판 — 옛 판 spec 엔 없음 = 팀 햇빛 그대로)
  }
  return makeBattle({ me: unitOf('me', mine[0]), foe: unitOf('foe', foes[0], { trainer, rank, tlv, ai }), seed });
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
  hp: u.hp, max: u.max, atk: u.atk, def: u.def, spd: u.spd, acc: u.acc, eva: u.eva, crit: u.crit, energy: u.energy, energyMax: u.energyMax, kit: u.kit, eff: u.eff, st: u.st || null, used: u.used || null,   // used = 변이 기술을 이번 판에 쓴 횟수
  pas: u.pas || null, cards: u.cards || null });   // 카드(패시브 합 · 끼운 카드 id — 친구 대결에선 상대 것을 감춤, rooms.mjs)
export function viewOf(B) {
  if (B.mode === 'swap3') return { mode: 'swap3', turn: B.turn, over: B.over, need: B.need, act: { ...B.act }, pool: { ...B.pool }, ownSun: !!B.ownSun, cd: { ...(B.swapCd || { me: 0, foe: 0 }) }, team: { me: B.team.me.map(unitV), foe: B.team.foe.map(unitV) } };
  return { mode: '1v1', turn: B.turn, over: B.over, me: unitV(B.me), foe: unitV(B.foe) };
}
// 화면 쪽: 서버가 보낸 모습으로 판을 세우고(처음) · 턴마다 같은 유닛 객체를 고쳐 씀(교체 연출이 유닛 객체를 붙잡고 있음)
const UNIT_KEYS = ['hp', 'max', 'atk', 'def', 'spd', 'acc', 'eva', 'crit', 'energyMax', 'kit', 'eff', 'st', 'used', 'pas', 'cards', 'name', 'key', 'el', 'jong', 'pot', 'stage', 'shiny', 'legend', 'trainer', 'rank', 'tlv'];
export function battleFromView(v) {
  if (v.mode === 'swap3') {
    const B = makeTeamBattle({ me: v.team.me.map(u => ({ ...u })), foe: v.team.foe.map(u => ({ ...u })), seed: 1, ownSun: !!v.ownSun });
    applyView(B, v);
    return B;
  }
  return { me: { ...v.me }, foe: { ...v.foe }, rng: null, turn: v.turn, over: v.over, log: [] };
}
export function applyView(B, v) {
  B.turn = v.turn; B.over = v.over;
  if (v.mode === 'swap3') {
    B.need = v.need; B.act = { ...v.act }; B.pool = { ...v.pool }; if (v.cd) B.swapCd = { ...v.cd };   // 에너지 = 팀 풀(유닛 energy 는 B.pool 을 읽음) · 교체까지 남은 턴
    for (const side of ['me', 'foe']) v.team[side].forEach((u, i) => { const t = B.team[side][i]; for (const k of UNIT_KEYS) t[k] = u[k]; if (B.ownSun) t.energy = u.energy; });   // 햇빛 식물마다 따로인 판 = 유닛 값
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
  if (v.mode === 'swap3') return { ...v, over: FLIP[v.over] || v.over, need: SW[v.need] || v.need, act: { me: v.act.foe, foe: v.act.me }, pool: { me: v.pool.foe, foe: v.pool.me }, cd: v.cd ? { me: v.cd.foe, foe: v.cd.me } : v.cd, team: { me: v.team.foe.map(u => ({ ...u, id: 'me' })), foe: v.team.me.map(u => ({ ...u, id: 'foe' })) } };
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
  return makeTeamBattle({ me: a.map(p => unitOf('me', p, { trainer: aName })), foe: b.map(p => unitOf('foe', p, { trainer: bName })), seed, swapCd: 2, swOrder: true, ownSun: true });   // 교체 제한 2턴 · 교체도 선공 · 후공 순서(2026-10-18) · 햇빛 식물마다 따로(2026-10-22)
}
// 서버가 받은 수({ kind:'skill', id } · { kind:'switch', to } · { kind:'rest' }) → 판 수(기술 객체)
const act3 = (u, a) => (a && a.kind === 'skill' ? { kind: 'skill', skill: u.kit.find(k => k.id === a.id) || u.kit[0] } : a && (a.kind === 'switch' || a.kind === 'rest') ? { kind: a.kind, to: a.to } : { kind: 'rest' });
export const pvpTurn3 = (B, aAct, bAct) => playTurn3(B, act3(B.me, aAct), act3(B.foe, bAct));
const SW = { me: 'foe', foe: 'me' };
export function mirrorEvents(events) {
  return events.map(e => { const o = { ...e }; if (o.who in SW) o.who = SW[o.who]; if (o.to in SW) o.to = SW[o.to]; return o; });
}
export { makeRng };
