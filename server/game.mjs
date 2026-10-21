// 게임 진행(서버 권위 — 2026-06-26 설계): 상태 불러오기·저장(일 하나마다 저장 = 자동 저장) · 일 하기(ops) · 봇 판(서버가 한 턴씩 풂) · 플레이 기록
//  봇 판: 서버가 씨앗·상대를 정해 저장하고, 화면은 고른 수만 보냄 → 서버가 저장된 수를 다시 돌려 판을 세운 뒤 새 수를 넣고 결과·판 모습을 돌려줌.
//  화면은 씨앗을 모름(미리 계산해 이기는 수 찾기 불가) · 서버를 다시 켜도 판이 이어짐(저장된 수로 다시 세움).
import { randomBytes, randomInt } from 'node:crypto';
import * as L from '../v2/src/game/logic.js';
import { runOp } from '../v2/src/game/ops.js';
import { setupBot, replayBot, botStep, botPlant, botTrainer, viewOf, makeRng, unitOf, aiOfTier } from '../v2/src/game/fight.js';
import { econ, diff, plantLite, plantRef, slimArgs } from './log.mjs';
import { LEAGUES, RULES_VER, SPECIES } from '../v2/src/game/catalog.js';

export const newRng = () => makeRng(randomInt(1, 2 ** 31 - 1));
const TIERS = ['브론즈', '실버', '골드', '플래티넘', '다이아', '마스터', '풀로세움'];
const RESUME_MS = 2 * 3600e3;   // 2시간 안의 안 끝난 판은 이어서(새로고침 · 앱 닫았다 열기), 그보다 오래되면 진 판으로 정리
const clone = o => JSON.parse(JSON.stringify(o));
export const fail = msg => { throw new L.Err(msg); };

export function makeGame({ q, log }) {
  const load = uid => {
    const r = q.save.get(uid);
    if (!r) fail('저장된 게임이 없어요');
    const s = JSON.parse(r.state);
    let ver = r.version;
    if ((s.ver || 0) < L.SAVE_VER) {   // 저장 판 옮기기(2026-10-18 업데이트 안전): 옮기기 직전 원본을 계정마다 최근 3개 보관 → 옮긴 것을 바로 저장(한 번만 보관되게)
      const t = Date.now();
      q.addBackup.run(uid, s.ver || 0, t, r.state); q.trimBackups.run(uid, uid);
      const from = L.migrate(s);
      q.putSave.run(uid, JSON.stringify(s), t); ver++;
      log(uid, 'migrate', { from, to: L.SAVE_VER }, t);
    }
    return { s, ver };
  };
  // 규칙 판 번호가 다른 판(전투 계산을 바꿔 올림) = 승패 없이 닫음(진 판 아님 — 2026-10-18 업데이트 안전)
  const oldRules = spec => (spec.rv || 1) !== RULES_VER;
  function voidRow(uid, b, now, why = 'rules') {
    q.doneBattle.run(4, now, b.id);
    log(uid, 'battle.void', { mode: JSON.parse(b.spec).mode, why }, now);
  }
  // 전투에 들어가는 모습(능력치 · 손패 · 카드 · 변이 · 단계) — 이름 · 화분 · 색 같은 겉모습은 빼고 견줌.
  //  2026-10-22 사용자 "여전히 식물 진화 및 스킬 편집후 전투하면 적용 안 되는 경우가 있음": 이어 하기를 식물 번호 · 단계로만 견줘서
  //  매칭 '취소' 뒤(서버엔 판이 남음) 기술을 고치고 다시 나가면 옛 손패 판이 열렸음 → 전투 유닛 전체로 견줌
  const buildSig = p => { const u = unitOf('me', p); delete u.name; delete u.pot; delete u.shiny; delete u.legend; return JSON.stringify(u); };
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
  // 지금 고른 판 종류 · 내 식물(1:1 = 고른 식물 · 3:3 = 저장된 팀)
  const mineOf = s => { const mode = s.mode === 'swap3' ? 'swap3' : 'tournament'; return { mode, mine: mode === 'swap3' ? teamPlants(s) : [s.plants[s.active] || s.plants[0]].filter(Boolean) }; };
  function battleStart(uid, now) {
    const open = q.openBattle.get(uid);
    let forfeited = null;
    if (open && oldRules(JSON.parse(open.spec))) { voidRow(uid, open, now); forfeited = 'void'; }
    else if (open && now - open.created < RESUME_MS) {
      // 안 끝난 판 = 이어서 — 단, 그사이 고른 식물이 바뀌었으면(진화 · 다른 식물 · 3:3 팀 · 판 종류) 이어 하지 않고 진 판으로 정리한 뒤 새 판
      //  (2026-10-17 사용자 "진화 막 시킨 후 다음 전투에는 진화전 모습이네" — 판을 시작할 때 저장한 식물 그대로 이어서 열었음)
      const spec = JSON.parse(open.spec), now0 = mineOf(load(uid).s), acts0 = JSON.parse(open.acts);
      const same = now0.mode === spec.mode && now0.mine.length === spec.mine.length && spec.mine.every((p, i) => now0.mine[i].uid === p.uid && buildSig(now0.mine[i]) === buildSig(p));
      if (same) { const B = replayBot(spec, acts0); return { id: open.id, mode: spec.mode, view: viewOf(B), info: spec.info, resume: true }; }
      if (!acts0.length) voidRow(uid, open, now, 'changed0');   // 수를 하나도 안 둔 판(매칭 취소 · 바로 나감) = 승패 없이 닫음, 알림도 없음
      else { forfeitRow(uid, open, now, 'changed'); forfeited = 'changed'; }
    } else if (open) forfeitRow(uid, open, now, 'stale');
    const { s } = load(uid);
    const { mode, mine } = mineOf(s);
    if (!mine[0]) fail('싸울 식물이 없어요');
    if (mode === 'tournament') { L.leaguesOf(s); const cap = L.leagueCap(s); if (mine[0].stage > cap) fail(`${LEAGUES[s.league].name}는 ${LEAGUES[s.league].desc} — 리그를 바꾸거나 다른 식물을 내보내 주세요`); }
    if (mode === 'swap3' && mine.length < 3) fail('3:3 교체전은 식물 셋이 필요해요 — 팀을 골라 주세요');
    const seed = randomInt(1, 2 ** 31 - 1), rng = makeRng(randomInt(1, 2 ** 31 - 1)), tier = Math.max(0, TIERS.indexOf(s.tournament.tier)), T = s.tournament;
    // 처음 두 판(새 계정 · 브론즈 예선 · 재배사 Lv2까지) = 튜토리얼식 — 내 속성이 잘 듣는 상대(2026-10-22 사용자 "첫 계정 생성 후 튜토리얼식 전투는 상성이 좋은 애로 배치")
    const tut = mode === 'tournament' && tier === 0 && T.round === '예선' && (T.wins || 0) + (T.losses || 0) < 2 && (s.user.level || 1) <= 2;
    const foes = mine.map(p => botPlant(rng, p.stage, p.lv, tier, { tier, favorEl: tut && SPECIES[p.key] ? SPECIES[p.key].el : null }));   // 대회 단계가 오를수록 먼 궤도 식물(fight.js ORBIT_CAP)
    const trainer = botTrainer(rng), rank = `${T.tier} ${1 + Math.floor(rng() * 3)}`, tlv = Math.max(1, (s.user.level || 1) - 1 + Math.floor(rng() * 4));   // 봇 재배사 레벨 = 내 레벨 -1~+2
    const info = mode === 'swap3' ? { mode, title: '3:3 교체전', swap3: { ...s.swap3 } } : { mode, title: `${T.name} · ${T.round}`, tier: T.tier, round: T.round, wins: T.wins, losses: T.losses, bestOf: T.bestOf };
    const spec = { seed, rv: RULES_VER, mode, mine: mine.map(clone), foes, trainer, rank, tlv, info, ai: aiOfTier(tier, tut), ...(mode === 'swap3' ? { swapCd: 2, swOrder: true } : {}) };   // 3:3 교체 제한 2턴 · 교체도 선공 · 후공 순서(2026-10-18 — 새 판만, 옛 판은 저장된 spec 그대로)
    const B = setupBot(spec), id = randomBytes(9).toString('base64url');
    q.addBattle.run(id, uid, mode, JSON.stringify(spec), '[]', now, now);
    log(uid, 'battle.start', { mode, mine: mine.map(plantLite), foes: foes.map(plantLite), tier: T.tier, round: T.round }, now);
    return { id, mode, view: viewOf(B), info, forfeited };
  }
  function battleTurn(uid, id, act, now, turn = null) {
    const b = q.battle.get(String(id || ''), uid);
    if (!b || b.done) fail('끝났거나 없는 판이에요');
    if (oldRules(JSON.parse(b.spec))) { voidRow(uid, b, now); fail('게임이 업데이트되어 이 판은 승패 없이 끝났어요 — 다시 시작해 주세요'); }
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
  // 매칭 '취소'(2026-10-22): 수를 하나도 안 둔 판만 승패 없이 닫음 — 둔 판은 기권으로만
  function battleCancel(uid, id, now) {
    const b = q.battle.get(String(id || ''), uid);
    if (!b || b.done) return { cancelled: false };
    if (JSON.parse(b.acts).length) fail('이미 시작한 판은 기권으로만 끝낼 수 있어요');
    voidRow(uid, b, now, 'cancel');
    return { cancelled: true };
  }
  function battleForfeit(uid, id, now) {
    const b = q.battle.get(String(id || ''), uid);
    if (!b || b.done) fail('끝났거나 없는 판이에요');
    if (oldRules(JSON.parse(b.spec))) { voidRow(uid, b, now); return { reward: { void: true }, state: load(uid).s }; }   // 옛 규칙 판에서 기권 = 진 판 아님
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
  return { create, state, act, coupon, battleStart, battleTurn, battleCancel, battleForfeit, pvpResult, plantOf, teamOf, load };
}

// 고른 수 세기(1:1 = 기술 id, 3:3 = skill:id · switch · rest · send)
function countPicks(acts) {
  const c = {};
  for (const a of acts) { const k = typeof a === 'string' ? a : a.kind === 'skill' ? a.id : a.kind; c[k] = (c[k] || 0) + 1; }
  return c;
}
