// 친구 대결 방(사용자 2026-10-16 "임의로 방만들기와 초대코드 등 넣어봐 · pvp는 임시로 mvp삼아"):
//  방 만들기 → 초대 코드 6자 → 친구가 코드로 들어옴 → 저마다 식물 고르고 준비 → 1:1 대결(서버가 두 사람 수를 받아 한 턴씩 풂) → 결과 · 같은 방에서 다시.
//  방은 서버 메모리에만(서버를 다시 켜면 사라짐 — MVP). 실시간 알림 = 서버 → 화면 한 줄 흐름(text/event-stream).
//  턴 시간 40초: 안 고르면 평타로 대신 두고, 두 번 연속이면 진 판. 대결 중 연결이 60초 넘게 끊기면 진 판.
import { randomInt } from 'node:crypto';
import { setupPvp, pvpTurn, viewFor, turnFor } from '../v2/src/game/fight.js';
import { STAGES } from '../v2/src/game/catalog.js';
import { fail } from './game.mjs';
import { plantLite } from './log.mjs';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 헷갈리는 0·O·1·I 뺌
const TURN_MS = 40000, GRACE_MS = 60000, IDLE_MS = 30 * 60000, MAX_ROOMS = 300, EMOTE_MS = 1500;
const OTHER = { a: 'b', b: 'a' }, BASIC = new Set(['basic', 'guard', 'evade']);

export function makeRooms({ game, log }) {
  const rooms = new Map(), byUser = new Map(), subs = new Map();

  // ── 알림 ──
  //  기본 = 기다리는 요청(롱 폴링): 화면이 "after 다음 소식"을 묻고, 없으면 서버가 25초까지 붙잡았다가 소식이 생기는 즉시 답함.
  //  (2026-10-16 실측: 클라우드플레어 무료 터널이 열어 둔 흐름(text/event-stream)을 쌓아 둬 알림이 안 옴 → 응답마다 끝이 있는 방식으로)
  //  흐름(SSE)도 남겨 둠(같은 PC·같은 와이파이에선 됨). 사람마다 최근 소식 60개를 번호(seq)와 함께 보관.
  const queues = new Map(), seen = new Map();   // uid → { seq, list, waiters } · uid → 마지막으로 소식을 받아 간 시각
  const qOf = uid => { let q = queues.get(uid); if (!q) queues.set(uid, q = { seq: 0, list: [], waiters: new Set() }); return q; };
  function send(uid, type, data) {
    const q = qOf(uid), ev = { seq: ++q.seq, type, data };
    q.list.push(ev); if (q.list.length > 60) q.list.shift();
    for (const w of [...q.waiters]) w();
    const set = subs.get(uid); if (!set) return;
    const line = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) { try { res.write(line); } catch {} }
  }
  const online = uid => (subs.get(uid) || new Set()).size > 0 || Date.now() - (seen.get(uid) || 0) < 35000;
  // 지금 모습 통째로(처음 묻거나 너무 오래 안 물어 소식을 놓쳤을 때)
  function snapshot(uid) {
    const r = roomOf(uid), out = [{ type: 'room', data: r ? roomView(r, uid) : null }];
    if (r && r.phase === 'battle' && sideOf(r, uid)) out.push({ type: 'battle', data: battleMsg(r, uid) });
    return out;
  }
  function markSeen(uid) {
    const was = online(uid); seen.set(uid, Date.now());
    if (!was) { const r = roomOf(uid); if (r) { const m = r.members.find(x => x.uid === uid); if (m) m.gone = null; broadcastRoom(r); } }
  }
  async function poll(uid, after, req) {
    const q = qOf(uid);
    markSeen(uid);
    if (!(after >= 0) || (q.list.length && after < q.list[0].seq - 1) || after > q.seq) return { seq: q.seq, events: snapshot(uid) };
    let evs = q.list.filter(e => e.seq > after);
    if (!evs.length) {
      await new Promise(res => {
        let tm = null;
        const done = () => { clearTimeout(tm); q.waiters.delete(done); res(); };
        tm = setTimeout(done, 25000);
        q.waiters.add(done);
        req.on('close', done);
      });
      seen.set(uid, Date.now());
      evs = q.list.filter(e => e.seq > after);
    }
    return { seq: q.seq, events: evs };
  }
  function subscribe(uid, req, res) {
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write(': 연결\n\n');
    let set = subs.get(uid); if (!set) subs.set(uid, set = new Set());
    set.add(res);
    const r = roomOf(uid);
    if (r) { const m = r.members.find(x => x.uid === uid); if (m) m.gone = null; broadcastRoom(r); if (r.phase === 'battle') send(uid, 'battle', battleMsg(r, uid)); }
    else send(uid, 'room', null);
    const ping = setInterval(() => { try { res.write(': 숨\n\n'); } catch {} }, 15000);
    req.on('close', () => { clearInterval(ping); set.delete(res); if (!set.size) subs.delete(uid); });   // 끊김 판정은 시계(아래)가 함
  }

  // ── 방 ──
  const roomOf = uid => { const c = byUser.get(uid); return c ? rooms.get(c) : null; };
  const sideOf = (r, uid) => (r.sides ? (r.sides.a === uid ? 'a' : r.sides.b === uid ? 'b' : null) : null);
  function code() { for (let k = 0; k < 50; k++) { let c = ''; for (let i = 0; i < 6; i++) c += ABC[randomInt(ABC.length)]; if (!rooms.has(c)) return c; } fail('잠시 뒤에 다시 해 주세요'); }
  const prof = got => ({ name: got.profile.name, title: got.profile.title, avatar: got.profile.avatar, color: got.profile.color, level: got.level });
  function member(uid, now) {
    const got = game.plantOf(uid, null);
    if (!got) fail('대결할 식물이 없어요');
    return { uid, ...prof(got), plant: got.plant.uid, card: card(got.plant), ready: false, joined: now, gone: null, lastEmote: 0 };
  }
  // 프로필 · 레벨 · 고른 식물을 지금 세이브로 다시 읽음(판이 끝나 레벨이 오르거나 식물을 보관·판매했을 때)
  function refresh(m) { try { const got = game.plantOf(m.uid, m.plant); if (got) { Object.assign(m, prof(got)); m.plant = got.plant.uid; m.card = card(got.plant); } } catch {} }
  const card = p => ({ uid: p.uid, key: p.key, name: p.name, stage: p.stage, stageName: STAGES[p.stage], lv: p.lv, shiny: !!p.shiny, legend: !!p.legend });
  function roomView(r, uid) {
    const b = r.phase === 'battle' ? { turn: r.B.turn, deadline: r.deadline, moved: !!r.moves[sideOf(r, uid)], foeMoved: !!r.moves[OTHER[sideOf(r, uid)]] } : null;
    return { code: r.code, host: r.host === uid, phase: r.phase, battle: b, last: r.last || null,
      members: r.members.map(m => ({ me: m.uid === uid, host: m.uid === r.host, name: m.name, title: m.title, avatar: m.avatar, color: m.color, level: m.level, card: m.uid === uid ? m.card : null, ready: m.ready, online: online(m.uid) })) };   // 고른 식물(card)은 나에게만
  }
  function broadcastRoom(r) { for (const m of r.members) send(m.uid, 'room', roomView(r, m.uid)); }
  const touch = (r, now) => { r.touched = now; };

  function create(uid, now) {
    if (rooms.size >= MAX_ROOMS) fail('방이 너무 많아요 — 잠시 뒤에 다시 해 주세요');
    leave(uid, now);
    const r = { code: code(), host: uid, created: now, touched: now, members: [member(uid, now)], phase: 'lobby', B: null, moves: {}, last: null, games: 0 };
    rooms.set(r.code, r); byUser.set(uid, r.code);
    log(uid, 'room', { op: 'create' }, now);
    broadcastRoom(r);
    return roomView(r, uid);
  }
  function join(uid, codeIn, now) {
    const c = String(codeIn || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const r = rooms.get(c);
    if (!r) fail('방을 찾을 수 없어요 — 코드를 확인해 주세요');
    if (r.members.some(m => m.uid === uid)) return roomView(r, uid);
    if (r.members.length >= 2) fail('방이 꽉 찼어요');
    if (r.phase === 'battle') fail('이미 대결 중인 방이에요');
    leave(uid, now);
    r.members.push(member(uid, now)); byUser.set(uid, r.code); touch(r, now);
    for (const m of r.members) { m.ready = false; refresh(m); }
    log(uid, 'room', { op: 'join' }, now);
    broadcastRoom(r);
    return roomView(r, uid);
  }
  function leave(uid, now) {
    const r = roomOf(uid); if (!r) return { left: false };
    if (r.phase === 'battle' && sideOf(r, uid)) end(r, OTHER[sideOf(r, uid)], 'left', now);
    r.members = r.members.filter(m => m.uid !== uid); byUser.delete(uid);
    if (!r.members.length) { rooms.delete(r.code); return { left: true }; }
    if (r.host === uid) r.host = r.members[0].uid;
    for (const m of r.members) m.ready = false;
    touch(r, now); broadcastRoom(r);
    return { left: true };
  }
  function pick(uid, plantUid, now) {
    const r = roomOf(uid); if (!r) fail('방에 있지 않아요');
    if (r.phase === 'battle') fail('대결 중엔 못 바꿔요');
    const got = game.plantOf(uid, String(plantUid || ''));
    if (!got || got.plant.uid !== plantUid) fail('스마트팜에 있는 식물만 나갈 수 있어요');
    const m = r.members.find(x => x.uid === uid);
    m.plant = got.plant.uid; m.card = card(got.plant); m.ready = false;
    touch(r, now); broadcastRoom(r);
    return roomView(r, uid);
  }
  function ready(uid, on, now) {
    const r = roomOf(uid); if (!r) fail('방에 있지 않아요');
    if (r.phase === 'battle') return roomView(r, uid);
    const m = r.members.find(x => x.uid === uid); m.ready = !!on; touch(r, now);
    if (r.members.length === 2 && r.members.every(x => x.ready)) start(r, now);
    else broadcastRoom(r);
    return roomView(r, uid);
  }

  // ── 대결 ──
  function start(r, now) {
    const [ma, mb] = r.members, ga = game.plantOf(ma.uid, ma.plant), gb = game.plantOf(mb.uid, mb.plant);
    if (!ga || !gb) { for (const m of r.members) m.ready = false; broadcastRoom(r); return; }
    r.B = setupPvp({ seed: randomInt(1, 2 ** 31 - 1), a: ga.plant, b: gb.plant, aName: ga.profile.name, bName: gb.profile.name });
    r.B.me.rank = `재배사 Lv${ga.level}`; r.B.foe.rank = `재배사 Lv${gb.level}`;   // 체력판 위 '재배사 · 레벨'(상대 판에만 보임)
    r.revealed = { a: new Set(), b: new Set() };   // 상대에게 보인 기술(쓴 것만)
    r.phase = 'battle'; r.sides = { a: ma.uid, b: mb.uid }; r.moves = {}; r.timeouts = { a: 0, b: 0 }; r.picks = { a: {}, b: {} };
    r.plants = { a: plantLite(ga.plant), b: plantLite(gb.plant) }; r.deadline = now + TURN_MS; r.games++;
    for (const m of r.members) m.ready = false;
    for (const side of ['a', 'b']) send(r.sides[side], 'start', { ...battleMsg(r, r.sides[side]), code: r.code });
    broadcastRoom(r);
  }
  function battleMsg(r, uid) { const side = sideOf(r, uid); return { view: viewOf(r, side), deadline: r.deadline, now: Date.now(), turn: r.B.turn, moved: !!r.moves[side] }; }
  // 내 화면에 보낼 판: 상대 = 기본기 + 이미 쓴 기술만, 능력치·속 사정(빗나감 연속 등) 없이 — 체력 · 에너지 · 효과 · 이름 · 그림만
  function viewOf(r, side) {
    const v = viewFor(r.B, side), f = v.foe, seen = r.revealed[OTHER[side]];
    return { ...v, foe: { ...f, kit: f.kit.filter(k => BASIC.has(k.id) || seen.has(k.id)), atk: null, def: null, spd: null, acc: null, eva: null, crit: null, st: f.st ? { nextInit: f.st.nextInit || 0, nextCrit: f.st.nextCrit || 0 } : null } };
  }
  const turnOf = (turn, side) => { const t = turnFor(turn, side); return { ...t, events: t.events.map(e => (e.t === 'hit' ? { ...e, table: undefined, forced: undefined } : e)) }; };   // 적중 표(능력치로 계산한 칸)는 안 보냄
  function move(uid, act, now, turn) {
    const r = roomOf(uid); if (!r || r.phase !== 'battle') fail('대결 중이 아니에요');
    const side = sideOf(r, uid); if (!side) fail('대결 중이 아니에요');
    if (turn != null && turn !== r.B.turn) fail('이미 지난 턴이에요');   // 시간이 넘어 대신 둔 턴에 늦게 온 수가 다음 턴으로 넘어가지 않게
    if (r.moves[side]) fail('이번 턴은 이미 골랐어요');
    const u = side === 'a' ? r.B.me : r.B.foe;
    if (typeof act !== 'string' || (act !== 'rest' && !u.kit.some(k => k.id === act))) fail('모르는 기술');
    r.moves[side] = act; r.timeouts[side] = 0; touch(r, now);
    send(r.sides[OTHER[side]], 'foeReady', { turn: r.B.turn });
    if (r.moves.a && r.moves.b) resolve(r, now);
    return { ok: true };
  }
  function resolve(r, now) {
    const { a, b } = r.moves;
    for (const [side, mv] of [['a', a], ['b', b]]) r.picks[side][mv] = (r.picks[side][mv] || 0) + 1;
    const turn = pvpTurn(r.B, a, b);
    if (turn.mySkill && turn.mySkill.id) r.revealed.a.add(turn.mySkill.id);
    if (turn.foeSkill && turn.foeSkill.id) r.revealed.b.add(turn.foeSkill.id);
    r.moves = {}; r.deadline = now + TURN_MS;
    for (const side of ['a', 'b']) send(r.sides[side], 'turn', { turn: turnOf(turn, side), view: viewOf(r, side), deadline: r.deadline, now });
    if (r.B.over) end(r, r.B.over === 'win' ? 'a' : 'b', 'ko', now);
  }
  function forfeit(uid, now) {
    const r = roomOf(uid); if (!r || r.phase !== 'battle') fail('대결 중이 아니에요');
    const side = sideOf(r, uid); if (!side) fail('대결 중이 아니에요');
    end(r, OTHER[side], 'forfeit', now);
    return { ok: true };
  }
  function end(r, winSide, why, now) {
    if (r.phase !== 'battle') return;
    const turns = r.B.turn - 1, short = turns < 3, loseSide = OTHER[winSide];
    r.phase = 'lobby';
    for (const side of ['a', 'b']) {
      const uid = r.sides[side], win = side === winSide;
      let out = null;
      try { out = game.pvpResult(uid, { win, short, forfeit: !win && (why === 'forfeit' || why === 'left' || why === 'timeout') }, now); } catch (e) { out = { reward: null, state: null }; }
      send(uid, 'end', { win, why, turns, reward: out.reward, state: out.state, view: viewOf(r, side) });
    }
    log(r.sides[winSide], 'pvp', { why, turns, short, loser: r.sides[loseSide], win: r.plants[winSide], lose: r.plants[loseSide], picksWin: r.picks[winSide], picksLose: r.picks[loseSide], game: r.games }, now);
    r.last = { winner: (r.members.find(m => m.uid === r.sides[winSide]) || {}).name || '', why, turns };
    r.B = null; r.sides = null; r.moves = {};
    for (const m of r.members) { m.ready = false; refresh(m); }
    touch(r, now); broadcastRoom(r);
  }
  function emote(uid, i, now) {
    const r = roomOf(uid); if (!r) fail('방에 있지 않아요');
    const m = r.members.find(x => x.uid === uid);
    if (now - m.lastEmote < EMOTE_MS) return { ok: false };
    m.lastEmote = now;
    const n = Math.max(0, Math.min(7, i | 0));
    for (const o of r.members) send(o.uid, 'emote', { i: n, me: o.uid === uid, name: m.name });
    return { ok: true };
  }
  function view(uid) { const r = roomOf(uid); return r ? { room: roomView(r, uid), battle: r.phase === 'battle' ? battleMsg(r, uid) : null } : { room: null }; }

  // ── 시계(1초마다): 턴 시간 넘김 · 끊긴 사람 · 오래 빈 방 ──
  setInterval(() => {
    const now = Date.now();
    for (const r of [...rooms.values()]) {
      // 있음/없음: 소식을 35초 넘게 안 받아 가면 끊긴 것(바뀌면 방 사람들에게 알림)
      let changed = false;
      for (const m of r.members) { const on = online(m.uid); if (m.on !== on) { m.on = on; changed = true; } if (on) m.gone = null; else if (!m.gone) m.gone = now; }
      if (changed) broadcastRoom(r);
      if (r.phase === 'battle') {
        for (const side of ['a', 'b']) { const m = r.members.find(x => x.uid === r.sides[side]); if (m && m.gone && now - m.gone > GRACE_MS) { end(r, OTHER[side], 'left', now); break; } }
        if (r.phase === 'battle' && now > r.deadline) {
          const late = ['a', 'b'].filter(sd => !r.moves[sd]);
          for (const sd of late) { r.timeouts[sd]++; r.moves[sd] = 'basic'; }
          const quit = late.find(sd => r.timeouts[sd] >= 2);
          if (quit) end(r, OTHER[quit], 'timeout', now); else resolve(r, now);
        }
      } else if (now - r.touched > IDLE_MS) { for (const m of r.members) { byUser.delete(m.uid); send(m.uid, 'room', null); } rooms.delete(r.code); }
    }
    for (const [uid, q] of queues) if (!q.waiters.size && !byUser.has(uid) && now - (seen.get(uid) || 0) > 3600e3) { queues.delete(uid); seen.delete(uid); }   // 한 시간 넘게 조용한 사람 소식함 정리
  }, 1000).unref();

  return { subscribe, poll, create, join, leave, pick, ready, move, forfeit, emote, view, count: () => rooms.size };
}
