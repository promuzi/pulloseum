// 게임 진행(서버 권위 — 2026-06-26 설계): 상태 불러오기·저장(일 하나마다 저장 = 자동 저장) · 일 하기(ops) · 봇 판(서버가 한 턴씩 풂) · 플레이 기록
//  봇 판: 서버가 씨앗·상대를 정해 저장하고, 화면은 고른 수만 보냄 → 서버가 저장된 수를 다시 돌려 판을 세운 뒤 새 수를 넣고 결과·판 모습을 돌려줌.
//  화면은 씨앗을 모름(미리 계산해 이기는 수 찾기 불가) · 서버를 다시 켜도 판이 이어짐(저장된 수로 다시 세움).
import { randomBytes, randomInt } from 'node:crypto';
import * as L from '../v2/src/game/logic.js';
import { runOp } from '../v2/src/game/ops.js';
import { setupBot, replayBot, botStep, botPlant, botTrainer, viewOf, makeRng } from '../v2/src/game/fight.js';
import { econ, diff, plantLite, plantRef, slimArgs } from './log.mjs';
import { LEAGUES } from '../v2/src/game/catalog.js';

export const newRng = () => makeRng(randomInt(1, 2 ** 31 - 1));
const TIERS = ['브론즈', '실버', '골드', '플래티넘', '다이아', '마스터', '풀로세움'];
const RESUME_MS = 2 * 3600e3;   // 2시간 안의 안 끝난 판은 이어서(새로고침 · 앱 닫았다 열기), 그보다 오래되면 진 판으로 정리
const clone = o => JSON.parse(JSON.stringify(o));
export const fail = msg => { throw new L.Err(msg); };

export function makeGame({ q, log }) {
  const load = uid => {
    const r = q.save.get(uid);
    if (!r) fail('저장된 게임이 없어요');
    return { s: JSON.parse(r.state), ver: r.version };
  };
  const save = (uid, s, now) => { L.syncTimers(s, now); q.putSave.run(uid, JSON.stringify(s), now); };

  // ── 새 게임(가입 때) ──
  function create(uid, { nickname, starter }, now) {
    const s = L.newGame({ nickname, starter }, newRng(), now);
    save(uid, s, now);
    return s;
  }
  function state(uid, now) { const { s, ver } = load(uid); L.syncTimers(s, now); return { state: s, ver }; }

  // ── 일 하나(양육·탐사·상점·설정…) ──
  function act(uid, op, args, now) {
    const { s, ver } = load(uid);
    const before = econ(s), p = plantRef(s, args);
    const res = runOp(s, op, args, { rng: newRng(), now });
    save(uid, s, now);
    log(uid, 'act', { op, a: slimArgs(op, args), r: res, d: diff(before, econ(s)), p, L: s.user.level }, now);
    return { state: s, res, ver: ver + 1 };
  }

  // ── 쿠폰(api.mjs 가 번호 · 기간 · 쓴 수 · 받았는지를 확인한 뒤) ──
  function coupon(uid, reward, code, now) {
    const { s, ver } = load(uid), before = econ(s);
    const got = L.couponGive(s, reward, newRng());
    save(uid, s, now);
    log(uid, 'coupon', { code, d: diff(before, econ(s)), n: got.length }, now);
    return { state: s, got, ver: ver + 1 };
  }

  // ── 봇 판 ──
  const teamPlants = s => (s.team && s.team.length === 3 ? s.team.map(i => s.plants[i]).filter(Boolean) : []);
  function finishBattle(uid, b, spec, acts, B, now) {
    const { s } = load(uid), win = B.over === 'win', before = econ(s);
    const reward = L.battleReward(s, { mode: spec.mode, win, rng: newRng(), now });
    save(uid, s, now);
    q.doneBattle.run(win ? 1 : 2, now, b.id);
    log(uid, 'battle', { mode: spec.mode, win, turns: B.turn - 1, mine: spec.mine.map(plantLite), foes: spec.foes.map(plantLite), picks: countPicks(acts), round: reward.round, reset: reward.reset, d: diff(before, econ(s)), L: s.user.level }, now);
    return { reward, state: s };
  }
  function forfeitRow(uid, b, now, why) {
    const spec = JSON.parse(b.spec), acts = JSON.parse(b.acts), { s } = load(uid);
    const reward = L.battleForfeit(s, spec.mode);
    save(uid, s, now);
    q.doneBattle.run(3, now, b.id);
    log(uid, 'battle', { mode: spec.mode, win: false, forfeit: why, turns: acts.length, mine: spec.mine.map(plantLite), foes: spec.foes.map(plantLite), picks: countPicks(acts), L: s.user.level }, now);
    return { reward, state: s };
  }
  function battleStart(uid, now) {
    const open = q.openBattle.get(uid);
    if (open && now - open.created < RESUME_MS) {   // 안 끝난 판 = 이어서
      const spec = JSON.parse(open.spec), B = replayBot(spec, JSON.parse(open.acts));
      return { id: open.id, mode: spec.mode, view: viewOf(B), info: spec.info, resume: true };
    }
    if (open) forfeitRow(uid, open, now, 'stale');
    const { s } = load(uid);
    const mode = s.mode === 'swap3' ? 'swap3' : 'tournament';
    const mine = mode === 'swap3' ? teamPlants(s) : [s.plants[s.active] || s.plants[0]];
    if (!mine[0]) fail('싸울 식물이 없어요');
    if (mode === 'tournament') { L.leaguesOf(s); const cap = L.leagueCap(s); if (mine[0].stage > cap) fail(`${LEAGUES[s.league].name}는 ${LEAGUES[s.league].desc} — 리그를 바꾸거나 다른 식물을 내보내 주세요`); }
    if (mode === 'swap3' && mine.length < 3) fail('3:3 교체전은 식물 셋이 필요해요 — 팀을 골라 주세요');
    const seed = randomInt(1, 2 ** 31 - 1), rng = makeRng(randomInt(1, 2 ** 31 - 1)), tier = Math.max(0, TIERS.indexOf(s.tournament.tier));
    const foes = mine.map(p => botPlant(rng, p.stage, p.lv, tier));
    const T = s.tournament, trainer = botTrainer(rng), rank = `${T.tier} ${1 + Math.floor(rng() * 3)}`, tlv = Math.max(1, (s.user.level || 1) - 1 + Math.floor(rng() * 4));   // 봇 재배사 레벨 = 내 레벨 -1~+2
    const info = mode === 'swap3' ? { mode, title: '3:3 교체전', swap3: { ...s.swap3 } } : { mode, title: `${T.name} · ${T.round}`, tier: T.tier, round: T.round, wins: T.wins, losses: T.losses, bestOf: T.bestOf };
    const spec = { seed, mode, mine: mine.map(clone), foes, trainer, rank, tlv, info };
    const B = setupBot(spec), id = randomBytes(9).toString('base64url');
    q.addBattle.run(id, uid, mode, JSON.stringify(spec), '[]', now, now);
    log(uid, 'battle.start', { mode, mine: mine.map(plantLite), foes: foes.map(plantLite), tier: T.tier, round: T.round }, now);
    return { id, mode, view: viewOf(B), info };
  }
  function battleTurn(uid, id, act, now, turn = null) {
    const b = q.battle.get(String(id || ''), uid);
    if (!b || b.done) fail('끝났거나 없는 판이에요');
    const spec = JSON.parse(b.spec), acts = JSON.parse(b.acts), B = replayBot(spec, acts);
    // 화면이 아는 턴과 다르면(응답을 못 받고 다시 보냄 등) 수를 넣지 않고 지금 판 모습만 돌려줌 → 화면이 다시 맞춤
    if (turn != null && (turn !== B.turn || (spec.mode === 'swap3' && act && act.kind === 'send' && B.need !== 'me'))) return { resync: true, view: viewOf(B), over: B.over };
    const step = botStep(B, spec.mode, act);
    acts.push(act);
    q.putActs.run(JSON.stringify(acts), now, b.id);
    const out = { turn: step.turn || null, send: step.send || null, view: viewOf(B), over: B.over };
    if (B.over) Object.assign(out, finishBattle(uid, b, spec, acts, B, now));
    return out;
  }
  function battleForfeit(uid, id, now) {
    const b = q.battle.get(String(id || ''), uid);
    if (!b || b.done) fail('끝났거나 없는 판이에요');
    return forfeitRow(uid, b, now, 'flag');
  }

  // ── 친구 대결 결과(rooms.mjs 가 부름) ──
  function pvpResult(uid, { win, short, forfeit }, now) {
    const { s } = load(uid), before = econ(s);
    const reward = forfeit ? L.battleForfeit(s, 'pvp') : L.battleReward(s, { mode: 'pvp', win, rng: newRng(), now, short });
    save(uid, s, now);
    log(uid, 'pvp.result', { win, short, forfeit: !!forfeit, capped: reward.capped, d: diff(before, econ(s)), L: s.user.level }, now);
    return { reward, state: s };
  }
  // 대결에 나갈 식물(스마트팜에 있는 것) — 방에서 고른 그 순간의 값으로
  function plantOf(uid, plantUid) {
    const { s } = load(uid);
    const p = (plantUid && s.plants.find(x => x.uid === plantUid)) || s.plants[s.active] || s.plants[0];
    return p ? { plant: clone(p), profile: { ...s.profile }, level: s.user.level } : null;
  }
  // 3:3 친구 대결에 나갈 셋 — 고른 셋 → 없거나 틀리면 저장된 3:3 팀 → 스마트팜 앞에서부터 셋, 셋이 안 되면 null
  function teamOf(uid, uids) {
    const { s } = load(uid);
    let list = Array.isArray(uids) ? uids.map(u => s.plants.find(p => p.uid === u)).filter(Boolean) : [];
    if (list.length !== 3 || new Set(list).size !== 3) list = teamPlants(s);
    if (list.length !== 3) list = s.plants.slice(0, 3);
    return list.length === 3 ? { plants: list.map(clone), profile: { ...s.profile }, level: s.user.level } : null;
  }
  return { create, state, act, coupon, battleStart, battleTurn, battleForfeit, pvpResult, plantOf, teamOf, load };
}

// 고른 수 세기(1:1 = 기술 id, 3:3 = skill:id · switch · rest · send)
function countPicks(acts) {
  const c = {};
  for (const a of acts) { const k = typeof a === 'string' ? a : a.kind === 'skill' ? a.id : a.kind; c[k] = (c[k] || 0) + 1; }
  return c;
}
