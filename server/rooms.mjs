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
const OTHER = { a: 'b', b: 'a' };

export function makeRooms({ game, log }) {
  const rooms = new Map(), byUser = new Map(), subs = new Map();

  // ── 알림 흐름 ──
  function send(uid, type, data) {
    const set = subs.get(uid); if (!set) return;
    const line = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) { try { res.write(line); } catch {} }
  }
  const online = uid => (subs.get(uid) || new Set()).size > 0;
  function subscribe(uid, req, res) {
    res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write(': 연결\n\n');
    let set = subs.get(uid); if (!set) subs.set(uid, set = new Set());
    set.add(res);
    const r = roomOf(uid);
    if (r) { const m = r.members.find(x => x.uid === uid); if (m) m.gone = null; broadcastRoom(r); if (r.phase === 'battle') send(uid, 'battle', battleMsg(r, uid)); }
    else send(uid, 'room', null);
    const ping = setInterval(() => { try { res.write(': 숨\n\n'); } catch {} }, 15000);
    req.on('close', () => {
      clearInterval(ping); set.delete(res);
      if (!set.size) { subs.delete(uid); const rr = roomOf(uid); if (rr) { const m = rr.members.find(x => x.uid === uid); if (m) m.gone = Date.now(); broadcastRoom(rr); } }
    });
  }

  // ── 방 ──
  const roomOf = uid => { const c = byUser.get(uid); return c ? rooms.get(c) : null; };
  const sideOf = (r, uid) => (r.sides ? (r.sides.a === uid ? 'a' : r.sides.b === uid ? 'b' : null) : null);
  function code() { for (let k = 0; k < 50; k++) { let c = ''; for (let i = 0; i < 6; i++) c += ABC[randomInt(ABC.length)]; if (!rooms.has(c)) return c; } fail('잠시 뒤에 다시 해 주세요'); }
  function member(uid, now) {
    const got = game.plantOf(uid, null);
    if (!got) fail('대결할 식물이 없어요');
    return { uid, name: got.profile.name, title: got.profile.title, avatar: got.profile.avatar, color: got.profile.color, plant: got.plant.uid, card: card(got.plant), ready: false, joined: now, gone: null, lastEmote: 0 };
  }
  const card = p => ({ uid: p.uid, key: p.key, name: p.name, stage: p.stage, stageName: STAGES[p.stage], lv: p.lv, shiny: !!p.shiny, legend: !!p.legend });
  function roomView(r, uid) {
    const b = r.phase === 'battle' ? { turn: r.B.turn, deadline: r.deadline, moved: !!r.moves[sideOf(r, uid)], foeMoved: !!r.moves[OTHER[sideOf(r, uid)]] } : null;
    return { code: r.code, host: r.host === uid, phase: r.phase, battle: b, last: r.last || null,
      members: r.members.map(m => ({ me: m.uid === uid, host: m.uid === r.host, name: m.name, title: m.title, avatar: m.avatar, color: m.color, card: m.card, ready: m.ready, online: online(m.uid) })) };
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
    for (const m of r.members) m.ready = false;
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
    r.B.me.rank = r.B.foe.rank = '친구 대결';   // 체력판 위 '재배사 · 랭크' 자리(상대 판에만 보임)
    r.phase = 'battle'; r.sides = { a: ma.uid, b: mb.uid }; r.moves = {}; r.timeouts = { a: 0, b: 0 }; r.picks = { a: {}, b: {} };
    r.plants = { a: plantLite(ga.plant), b: plantLite(gb.plant) }; r.deadline = now + TURN_MS; r.games++;
    for (const m of r.members) m.ready = false;
    for (const side of ['a', 'b']) send(r.sides[side], 'start', { ...battleMsg(r, r.sides[side]), code: r.code });
    broadcastRoom(r);
  }
  function battleMsg(r, uid) { const side = sideOf(r, uid); return { view: viewFor(r.B, side), deadline: r.deadline, now: Date.now(), turn: r.B.turn, moved: !!r.moves[side] }; }
  function move(uid, act, now) {
    const r = roomOf(uid); if (!r || r.phase !== 'battle') fail('대결 중이 아니에요');
    const side = sideOf(r, uid); if (!side) fail('대결 중이 아니에요');
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
    r.moves = {}; r.deadline = now + TURN_MS;
    for (const side of ['a', 'b']) send(r.sides[side], 'turn', { turn: turnFor(turn, side), view: viewFor(r.B, side), deadline: r.deadline, now });
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
      send(uid, 'end', { win, why, turns, reward: out.reward, state: out.state, view: viewFor(r.B, side) });
    }
    log(r.sides[winSide], 'pvp', { why, turns, short, loser: r.sides[loseSide], win: r.plants[winSide], lose: r.plants[loseSide], picksWin: r.picks[winSide], picksLose: r.picks[loseSide], game: r.games }, now);
    r.last = { winner: (r.members.find(m => m.uid === r.sides[winSide]) || {}).name || '', why, turns };
    r.B = null; r.sides = null; r.moves = {};
    for (const m of r.members) m.ready = false;
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
  }, 1000).unref();

  return { subscribe, create, join, leave, pick, ready, move, forfeit, emote, view, count: () => rooms.size };
}
