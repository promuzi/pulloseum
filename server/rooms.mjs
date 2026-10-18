// 친구 대결 방(사용자 2026-10-16 "임의로 방만들기와 초대코드 등 넣어봐 · pvp는 임시로 mvp삼아"):
//  방 만들기 → 초대 코드 6자 → 친구가 코드로 들어옴 → 저마다 식물 고르고 준비 → 1:1 대결(서버가 두 사람 수를 받아 한 턴씩 풂) → 결과 · 같은 방에서 다시.
//  방은 서버 메모리 + 저장소 표 rooms(바뀔 때마다 적음 — 서버 본체가 다시 켜져도 대결이 이어짐, 아래 '저장'). 실시간 알림 = 기다리는 요청(poll).
//  턴 시간 40초: 안 고르면 넘어감(쉬기 — 2026-10-16 사용자 "안 하면 넘어가는 걸로", 전엔 평타로 대신), 두 번 연속이면 진 판. 대결 중 연결이 60초 넘게 끊기면 진 판.
//  3:3 교체전(같은 날 "남은 거 다해줘" — 설계 docs/superpowers/specs/2026-10-16-v2-pvp-3v3.md): 방장이 방식을 고름, 팀 = 저장된 3:3 팀.
//   앞 식물이 쓰러지면 그쪽 사람이 다음 식물을 고름(둘 다면 둘 다, 서로 모르게 — 20초 넘으면 살아 있는 첫 식물). 상대 대기석은 나온 식물만 보냄.
import { randomInt } from 'node:crypto';
import { setupPvp, pvpTurn, setupPvp3, pvpTurn3, viewFor, turnFor, mirrorEvents, makeRng } from '../v2/src/game/fight.js';
import { sendIn, aliveOf, makeTeamBattle } from '../v2/src/battle/team.js';
import { STAGES, RULES_VER } from '../v2/src/game/catalog.js';
import { fail } from './game.mjs';
import { plantLite } from './log.mjs';

const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 헷갈리는 0·O·1·I 뺌
const TURN_MS = 40000, SEND_MS = 20000, GRACE_MS = 60000, IDLE_MS = 30 * 60000, MAX_ROOMS = 300, EMOTE_MS = 1500, RESUME_MS = 15000;
const OTHER = { a: 'b', b: 'a' }, BASIC = new Set(['basic', 'guard', 'evade']);
const SIDE = { a: 'me', b: 'foe' };   // 판 안에서 A(방의 첫 사람) = me, B = foe
const needSides = B => ({ me: ['a'], foe: ['b'], both: ['a', 'b'] })[B.need] || [];

export function makeRooms({ game, log, q: db = null }) {
  const rooms = new Map(), byUser = new Map(), subs = new Map();

  // ── 저장(2026-10-18 사용자 "PVP 중인데 갑자기 '대결 중이 아니에요' 하면서 연결 끊기고 멈춤"): 방이 메모리에만 있어 서버 본체가 다시 켜지면
  //  (올린 뒤 4~5분 · Cloudflare 사정) 하던 대결이 통째로 사라졌음 → 방이 바뀌면 표(rooms)에 지금 모습을 적고(부른 일이 끝날 때 · 시계마다), 켜질 때 다시 읽음.
  //  판은 유닛을 그대로 적었다가 되살림(체력 · 햇빛 · 효과 · 쓴 횟수 …) — 난수만 새로(앞일만 달라짐). 소식 번호는 켜진 때부터 새로 세어 화면이 지금 모습을 통째로 다시 받음(poll)
  const dirty = new Set();
  const save = r => { if (db && r) dirty.add(r.code); };
  const json = o => JSON.parse(JSON.stringify(o));
  function packB(B) {
    if (!B) return null;
    if (B.mode === 'swap3') return { mode: 'swap3', rv: RULES_VER, turn: B.turn, over: B.over, need: B.need, act: { ...B.act }, pool: { ...B.pool }, cdLen: B.cdLen || 0, swOrder: !!B.swOrder, swapCd: { ...(B.swapCd || { me: 0, foe: 0 }) }, team: { me: B.team.me.map(json), foe: B.team.foe.map(json) } };
    return { mode: '1v1', rv: RULES_VER, turn: B.turn, over: B.over, me: json(B.me), foe: json(B.foe) };
  }
  function unpackB(o) {
    if (!o) return null;
    const seed = randomInt(1, 2 ** 31 - 1);
    if (o.mode === 'swap3') {
      const B = makeTeamBattle({ me: o.team.me, foe: o.team.foe, seed, swapCd: o.cdLen || 0, swOrder: !!o.swOrder });   // 햇빛 = 팀 풀(유닛 energy 는 B.pool 을 읽음)
      B.turn = o.turn; B.over = o.over; B.need = o.need; B.act = { ...o.act }; B.pool = { ...o.pool }; B.swapCd = { ...o.swapCd };
      B.me = B.team.me[B.act.me]; B.foe = B.team.foe[B.act.foe];
      return B;
    }
    return { me: o.me, foe: o.foe, rng: makeRng(seed), turn: o.turn, over: o.over, log: [] };   // battle/model.js makeBattle 과 같은 꼴
  }
  // 상대에게 보인 기술 · 식물(Set) = 배열로(1:1 = 기술 id 묶음 하나씩, 3:3 = 식물마다)
  function pack(r) {
    const o = { ...r, B: packB(r.B) }, arr = s => [...s];
    if (r.revealed) o.revealed = Array.isArray(r.revealed.a) ? { t: 3, a: r.revealed.a.map(arr), b: r.revealed.b.map(arr) } : { t: 1, a: arr(r.revealed.a), b: arr(r.revealed.b) };
    if (r.shown) o.shown = { a: arr(r.shown.a), b: arr(r.shown.b) };
    return o;
  }
  function unpack(o) {
    const r = { ...o, B: unpackB(o.B) }, set = a => new Set(a);
    if (o.revealed) r.revealed = o.revealed.t === 3 ? { a: o.revealed.a.map(set), b: o.revealed.b.map(set) } : { a: set(o.revealed.a), b: set(o.revealed.b) };
    if (o.shown) r.shown = { a: set(o.shown.a), b: set(o.shown.b) };
    return r;
  }
  function flush() {
    if (!db || !dirty.size) return;
    for (const c of dirty) {
      const r = rooms.get(c);
      try { if (r) db.putRoom.run(c, JSON.stringify(pack(r)), r.touched || 0); else db.delRoom.run(c); } catch (e) { console.error('방 저장 실패', c, e && e.message); }
    }
    dirty.clear();
  }

  // ── 알림 ──
  //  기본 = 기다리는 요청(롱 폴링): 화면이 "after 다음 소식"을 묻고, 없으면 서버가 25초까지 붙잡았다가 소식이 생기는 즉시 답함.
  //  (2026-10-16 실측: 클라우드플레어 무료 터널이 열어 둔 흐름(text/event-stream)을 쌓아 둬 알림이 안 옴 → 응답마다 끝이 있는 방식으로)
  //  흐름(SSE)도 남겨 둠(같은 PC·같은 와이파이에선 됨). 사람마다 최근 소식 60개를 번호(seq)와 함께 보관.
  const queues = new Map(), seen = new Map();   // uid → { seq, list, waiters } · uid → 마지막으로 소식을 받아 간 시각
  //  번호는 소식함을 만든 때(ms)부터 — 다시 켜진 서버의 번호가 옛 번호와 겹치지 않아, 옛 번호로 물으면(base 보다 작음) 지금 모습을 통째로 줌
  const qOf = uid => { let q = queues.get(uid); if (!q) { const base = Date.now(); queues.set(uid, q = { seq: base, base, list: [], waiters: new Set() }); } return q; };
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
    if (!(after >= q.base) || (q.list.length && after < q.list[0].seq - 1) || after > q.seq) return { seq: q.seq, events: snapshot(uid) };
    let evs = q.list.filter(e => e.seq > after);
    if (!evs.length) {
      await new Promise(res => {
        let tm = null;
        const done = () => { clearTimeout(tm); q.waiters.delete(done); res(); };
        tm = setTimeout(done, 25000);
        q.waiters.add(done);
        if (req && req.onClose) req.onClose(done);   // 끊기면 바로 놓아줌(Node = 소켓 닫힘, Cloudflare = 요청 취소)
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
    const m = { uid, ...prof(got), plant: got.plant.uid, card: card(got.plant), team: null, teamCards: [], ready: false, joined: now, gone: null, lastEmote: 0 };
    teamTo(m, null);
    return m;
  }
  // 3:3 팀(식물 uid 셋 + 카드) — 고른 셋이 사라졌으면 저장된 팀 → 앞에서부터 셋, 셋이 안 되면 없음
  const teamTo = (m, uids) => { const t = game.teamOf(m.uid, uids); m.team = t ? t.plants.map(p => p.uid) : null; m.teamCards = t ? t.plants.map(card) : []; };
  // 프로필 · 레벨 · 고른 식물 · 팀을 지금 세이브로 다시 읽음(판이 끝나 레벨이 오르거나 식물을 보관·판매했을 때)
  function refresh(m) { try { const got = game.plantOf(m.uid, m.plant); if (got) { Object.assign(m, prof(got)); m.plant = got.plant.uid; m.card = card(got.plant); } teamTo(m, m.team); } catch {} }
  const card = p => ({ uid: p.uid, key: p.key, name: p.name, stage: p.stage, stageName: STAGES[p.stage], lv: p.lv, shiny: !!p.shiny, legend: !!p.legend });
  const movedOf = (r, side) => !!side && (r.sends ? r.sends[side] != null : !!r.moves[side]);   // 이번 차례 수를 냈는지(고르기 = 기술 · 교체, 채우기 = 다음 식물)
  function roomView(r, uid) {
    const sd = sideOf(r, uid), b = r.phase === 'battle' ? { turn: r.B.turn, deadline: r.deadline, step: r.sends ? 'send' : 'pick', moved: movedOf(r, sd), foeMoved: movedOf(r, OTHER[sd]) } : null;
    return { code: r.code, host: r.host === uid, phase: r.phase, mode: r.mode, battle: b, last: r.last || null,
      members: r.members.map(m => ({ me: m.uid === uid, host: m.uid === r.host, name: m.name, title: m.title, avatar: m.avatar, color: m.color, level: m.level, card: m.uid === uid ? m.card : null, team: m.uid === uid ? m.teamCards : null, team3: !!m.team, ready: m.ready, online: online(m.uid) })) };   // 고른 식물(card) · 팀은 나에게만, 팀이 되는지(team3)는 둘 다
  }
  function broadcastRoom(r) { save(r); for (const m of r.members) send(m.uid, 'room', roomView(r, m.uid)); }
  const touch = (r, now) => { r.touched = now; save(r); };

  function create(uid, now) {
    if (rooms.size >= MAX_ROOMS) fail('방이 너무 많아요 — 잠시 뒤에 다시 해 주세요');
    leave(uid, now);
    const r = { code: code(), host: uid, created: now, touched: now, members: [member(uid, now)], phase: 'lobby', mode: '1v1', B: null, moves: {}, sends: null, last: null, games: 0 };
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
    if (!r.members.length) { rooms.delete(r.code); save(r); return { left: true }; }   // 저장된 방도 지움
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
  // 방식(1:1 · 3:3 교체전) — 방장만, 대기 중에만. 바뀌면 둘 다 준비가 풀림
  function setMode(uid, mode, now) {
    const r = roomOf(uid); if (!r) fail('방에 있지 않아요');
    if (r.host !== uid) fail('방장만 바꿀 수 있어요');
    if (r.phase === 'battle') fail('대결 중엔 못 바꿔요');
    if (mode !== '1v1' && mode !== 'swap3') fail('모르는 방식이에요');
    if (r.mode !== mode) { r.mode = mode; for (const m of r.members) { m.ready = false; refresh(m); } }
    touch(r, now); broadcastRoom(r);
    return roomView(r, uid);
  }
  // 3:3 팀 바꾸기(셋 — 순서 = 나설 순서). 화면은 같은 셋을 setTeam 으로 저장도 함(팀 정의는 하나)
  function setTeam(uid, uids, now) {
    const r = roomOf(uid); if (!r) fail('방에 있지 않아요');
    if (r.phase === 'battle') fail('대결 중엔 못 바꿔요');
    const want = Array.isArray(uids) ? uids.map(String) : [];
    if (want.length !== 3 || new Set(want).size !== 3) fail('식물 셋을 골라 주세요');
    const t = game.teamOf(uid, want);
    if (!t || t.plants.some((p, i) => p.uid !== want[i])) fail('스마트팜에 있는 식물만 나갈 수 있어요');
    const m = r.members.find(x => x.uid === uid);
    m.team = want; m.teamCards = t.plants.map(card); m.ready = false;
    touch(r, now); broadcastRoom(r);
    return roomView(r, uid);
  }
  function ready(uid, on, now) {
    const r = roomOf(uid); if (!r) fail('방에 있지 않아요');
    if (r.phase === 'battle') return roomView(r, uid);
    const m = r.members.find(x => x.uid === uid);
    if (on && r.mode === 'swap3' && !m.team) fail('3:3은 스마트팜에 식물이 셋 있어야 해요');
    m.ready = !!on; touch(r, now);
    if (r.members.length === 2 && r.members.every(x => x.ready)) start(r, now);
    else broadcastRoom(r);
    return roomView(r, uid);
  }

  // ── 대결 ──
  function start(r, now) {
    const [ma, mb] = r.members, seed = randomInt(1, 2 ** 31 - 1), stop = () => { for (const m of r.members) m.ready = false; broadcastRoom(r); };
    if (r.mode === 'swap3') {
      const ta = game.teamOf(ma.uid, ma.team), tb = game.teamOf(mb.uid, mb.team);
      if (!ta || !tb) return stop();
      r.B = setupPvp3({ seed, a: ta.plants, b: tb.plants, aName: ta.profile.name, bName: tb.profile.name });
      for (const [units, lv] of [[r.B.team.me, ta.level], [r.B.team.foe, tb.level]]) for (const u of units) { u.rank = `재배사 Lv${lv}`; u.tlv = lv; }
      r.revealed = { a: [0, 1, 2].map(() => new Set()), b: [0, 1, 2].map(() => new Set()) };   // 식물마다 상대에게 보인 기술(쓴 것만)
      r.shown = { a: new Set([0]), b: new Set([0]) };   // 상대에게 보인 식물(앞에 나온 적 있는 것)
      r.plants = { a: ta.plants.map(plantLite), b: tb.plants.map(plantLite) };
    } else {
      const ga = game.plantOf(ma.uid, ma.plant), gb = game.plantOf(mb.uid, mb.plant);
      if (!ga || !gb) return stop();
      r.B = setupPvp({ seed, a: ga.plant, b: gb.plant, aName: ga.profile.name, bName: gb.profile.name });
      r.B.me.rank = `재배사 Lv${ga.level}`; r.B.foe.rank = `재배사 Lv${gb.level}`; r.B.me.tlv = ga.level; r.B.foe.tlv = gb.level;   // 체력판 위 '이름 · Lv'(상대 판에만 보임)
      r.revealed = { a: new Set(), b: new Set() };   // 상대에게 보인 기술(쓴 것만)
      r.plants = { a: plantLite(ga.plant), b: plantLite(gb.plant) };
    }
    r.phase = 'battle'; r.sides = { a: ma.uid, b: mb.uid }; r.moves = {}; r.sends = null; r.timeouts = { a: 0, b: 0 }; r.picks = { a: {}, b: {} };
    r.deadline = now + TURN_MS; r.games++;
    for (const m of r.members) m.ready = false;
    for (const side of ['a', 'b']) send(r.sides[side], 'start', { ...battleMsg(r, r.sides[side]), code: r.code });
    broadcastRoom(r);
  }
  function battleMsg(r, uid) { const side = sideOf(r, uid); return { view: viewOf(r, side), deadline: r.deadline, now: Date.now(), turn: r.B.turn, step: r.sends ? 'send' : 'pick', moved: movedOf(r, side) }; }
  // 내 화면에 보낼 판: 상대 = 기본기 + 이미 쓴 기술만, 능력치·속 사정(빗나감 연속 등) 없이 — 체력 · 에너지 · 효과 · 이름 · 그림만
  //  3:3: 상대 대기석 중 아직 안 나온 식물은 자리만(살았는지) — 누가 있는지는 나올 때 처음 보임
  const hideFoe = (f, seen) => ({ ...f, used: null, pas: null, cards: null, kit: f.kit.filter(k => BASIC.has(k.id) || seen.has(k.id)), atk: null, def: null, spd: null, acc: null, eva: null, crit: null, st: f.st ? { nextInit: f.st.nextInit || 0, nextCrit: f.st.nextCrit || 0 } : null });
  function viewOf(r, side) {
    const v = viewFor(r.B, side), O = OTHER[side];
    if (v.mode === 'swap3') return { ...v, team: { me: v.team.me, foe: v.team.foe.map((u, i) => (r.shown[O].has(i) ? hideFoe(u, r.revealed[O][i]) : { id: 'foe', hidden: true, name: '?', key: null, el: null, jong: null, hp: u.hp > 0 ? 1 : 0, max: 1, energy: u.energy, energyMax: u.energyMax, kit: [], eff: {}, st: null })) } };
    return { ...v, foe: hideFoe(v.foe, r.revealed[O]) };
  }
  const turnOf = (turn, side) => { const t = turnFor(turn, side); return { ...t, events: t.events.map(e => (e.t === 'hit' ? { ...e, table: undefined, forced: undefined } : e)) }; };   // 적중 표(능력치로 계산한 칸)는 안 보냄
  function move(uid, act, now, turn) {
    const r = roomOf(uid); if (!r || r.phase !== 'battle') fail('대결 중이 아니에요');
    const side = sideOf(r, uid); if (!side) fail('대결 중이 아니에요');
    if (turn != null && turn !== r.B.turn) fail('이미 지난 턴이에요');   // 시간이 넘어 대신 둔 턴에 늦게 온 수가 다음 턴으로 넘어가지 않게
    if (r.mode === 'swap3') return move3(r, side, act, now);
    if (r.moves[side]) fail('이번 턴은 이미 골랐어요');
    const u = side === 'a' ? r.B.me : r.B.foe;
    if (typeof act !== 'string' || (act !== 'rest' && !u.kit.some(k => k.id === act))) fail('모르는 기술');
    r.moves[side] = act; r.timeouts[side] = 0; touch(r, now);
    send(r.sides[OTHER[side]], 'foeReady', { turn: r.B.turn });
    if (r.moves.a && r.moves.b) resolve(r, now);
    return { ok: true };
  }
  // 3:3 수: 고르는 차례 = { kind:'skill', id } · { kind:'switch', to } · { kind:'rest' }, 쓰러진 자리 채우는 차례 = { kind:'send', to }
  function move3(r, side, act, now) {
    const B = r.B, me = SIDE[side];
    if (!act || typeof act !== 'object') fail('잘못된 수');
    if (r.sends) {
      if (!needSides(B).includes(side)) fail('상대가 다음 식물을 고르는 중이에요');
      if (act.kind !== 'send') fail('다음 식물을 먼저 골라 주세요');
      if (r.sends[side] != null) fail('이미 골랐어요');
      const u = B.team[me][act.to];
      if (!Number.isInteger(act.to) || !u || u.hp <= 0) fail('그 식물은 나갈 수 없어요');
      r.sends[side] = act.to; touch(r, now);
      if (needSides(B).every(s => r.sends[s] != null)) applySends(r, now);
      else send(r.sides[OTHER[side]], 'foeReady', { turn: B.turn });
      return { ok: true };
    }
    if (r.moves[side]) fail('이번 턴은 이미 골랐어요');
    if (act.kind === 'skill') { if (!B[me].kit.some(k => k.id === act.id)) fail('모르는 기술'); }
    else if (act.kind === 'switch') { if (!Number.isInteger(act.to) || !B.team[me][act.to]) fail('잘못된 교체'); }
    else if (act.kind !== 'rest') fail('잘못된 수');
    r.moves[side] = act.kind === 'skill' ? { kind: 'skill', id: act.id } : act.kind === 'switch' ? { kind: 'switch', to: act.to } : { kind: 'rest' };
    r.timeouts[side] = 0; touch(r, now);
    send(r.sides[OTHER[side]], 'foeReady', { turn: B.turn });
    if (r.moves.a && r.moves.b) resolve(r, now);
    return { ok: true };
  }
  function resolve(r, now) {
    const { a, b } = r.moves, B = r.B;
    save(r);
    for (const [side, mv] of [['a', a], ['b', b]]) { const k = typeof mv === 'string' ? mv : mv.kind === 'skill' ? mv.id : mv.kind; r.picks[side][k] = (r.picks[side][k] || 0) + 1; }
    let turn;
    if (r.mode === 'swap3') {
      turn = pvpTurn3(B, a, b);
      r.shown.a.add(B.act.me); r.shown.b.add(B.act.foe);   // 교체로 나온 식물 공개
      if (turn.mySwitch != null) r.shown.a.add(turn.mySwitch); if (turn.foeSwitch != null) r.shown.b.add(turn.foeSwitch);   // 고른 교체 식물도(턴 시작 공개 카드에 얼굴이 나감 — 늦은 교체가 맞고 쓰러져 못 나와도), 기술은 쓴 식물에(같은 턴에 쓰러져도 판이 자리를 안 바꿈)
      if (turn.mySkill && turn.mySkill.id) r.revealed.a[B.act.me].add(turn.mySkill.id);
      if (turn.foeSkill && turn.foeSkill.id) r.revealed.b[B.act.foe].add(turn.foeSkill.id);
    } else {
      turn = pvpTurn(B, a, b);
      if (turn.mySkill && turn.mySkill.id) r.revealed.a.add(turn.mySkill.id);
      if (turn.foeSkill && turn.foeSkill.id) r.revealed.b.add(turn.foeSkill.id);
    }
    const fill = r.mode === 'swap3' && !B.over && needSides(B).length > 0;
    r.moves = {}; r.sends = fill ? {} : null; r.deadline = now + (fill ? SEND_MS : TURN_MS);
    for (const side of ['a', 'b']) send(r.sides[side], 'turn', { turn: turnOf(turn, side), view: viewOf(r, side), deadline: r.deadline, step: fill ? 'send' : 'pick', now });
    if (B.over) end(r, B.over === 'win' ? 'a' : 'b', 'ko', now);
  }
  // 쓰러진 자리 채우기(필요한 쪽이 다 골랐거나 시간이 넘음): A 다음 B 순서로 내보내고 둘에게 함께 알림
  function applySends(r, now) {
    const B = r.B, evs = [];
    save(r);
    for (const side of ['a', 'b']) if (r.sends[side] != null) evs.push(sendIn(B, r.sends[side], SIDE[side]));
    r.sends = null; r.shown.a.add(B.act.me); r.shown.b.add(B.act.foe);
    r.deadline = now + TURN_MS;
    for (const side of ['a', 'b']) send(r.sides[side], 'send', { sends: side === 'b' ? mirrorEvents(evs) : evs, view: viewOf(r, side), deadline: r.deadline, turn: B.turn, now });
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
    log(r.sides[winSide], 'pvp', { mode: r.mode, why, turns, short, loser: r.sides[loseSide], win: r.plants[winSide], lose: r.plants[loseSide], picksWin: r.picks[winSide], picksLose: r.picks[loseSide], game: r.games }, now);
    r.last = { winner: (r.members.find(m => m.uid === r.sides[winSide]) || {}).name || '', why, turns, mode: r.mode };
    r.B = null; r.sides = null; r.moves = {}; r.sends = null;
    for (const m of r.members) { m.ready = false; refresh(m); }
    touch(r, now); broadcastRoom(r);
  }
  function emote(uid, i, now) {
    const r = roomOf(uid); if (!r) fail('방에 있지 않아요');
    const m = r.members.find(x => x.uid === uid);
    if (now - m.lastEmote < EMOTE_MS) return { ok: false };
    m.lastEmote = now;
    const n = Math.max(0, Math.min(13, i | 0));   // 0~5 대사 · 6~13 이모지(v2/src/art/emotes.js)
    for (const o of r.members) send(o.uid, 'emote', { i: n, me: o.uid === uid, name: m.name });
    return { ok: true };
  }
  function view(uid) { const r = roomOf(uid); return r ? { room: roomView(r, uid), battle: r.phase === 'battle' ? battleMsg(r, uid) : null } : { room: null }; }

  // ── 시계(1초마다): 턴 시간 넘김 · 끊긴 사람 · 오래 빈 방 ──
  const clock = setInterval(() => {
    const now = Date.now();
    for (const r of [...rooms.values()]) {
      // 있음/없음: 소식을 35초 넘게 안 받아 가면 끊긴 것(바뀌면 방 사람들에게 알림)
      let changed = false;
      for (const m of r.members) { const on = online(m.uid); if (m.on !== on) { m.on = on; changed = true; } if (on) m.gone = null; else if (!m.gone) m.gone = now; }
      if (changed) broadcastRoom(r);
      if (r.phase === 'battle') {
        for (const side of ['a', 'b']) { const m = r.members.find(x => x.uid === r.sides[side]); if (m && m.gone && now - m.gone > GRACE_MS) { end(r, OTHER[side], 'left', now); break; } }
        if (r.phase === 'battle' && now > r.deadline) {
          if (r.sends) {   // 쓰러진 자리: 시간이 넘으면 살아 있는 첫 식물(시간 초과로 세지 않음)
            for (const sd of needSides(r.B)) if (r.sends[sd] == null) r.sends[sd] = aliveOf(r.B, SIDE[sd])[0];
            applySends(r, now);
          } else {
            const late = ['a', 'b'].filter(sd => !r.moves[sd]);
            for (const sd of late) { r.timeouts[sd]++; r.moves[sd] = r.mode === 'swap3' ? { kind: 'rest' } : 'rest'; }   // 시간 초과 = 넘어감
            const quit = late.find(sd => r.timeouts[sd] >= 2);
            if (quit) end(r, OTHER[quit], 'timeout', now); else resolve(r, now);
          }
        }
      } else if (now - r.touched > IDLE_MS) { for (const m of r.members) { byUser.delete(m.uid); send(m.uid, 'room', null); } rooms.delete(r.code); save(r); }
    }
    flush();
    for (const [uid, q] of queues) if (!q.waiters.size && !byUser.has(uid) && now - (seen.get(uid) || 0) > 3600e3) { queues.delete(uid); seen.delete(uid); }   // 한 시간 넘게 조용한 사람 소식함 정리
  }, 1000);
  if (clock.unref) clock.unref();   // Node: 이 시계 때문에 꺼지지 않는 일 없게(Cloudflare 엔 없음)

  // 켜질 때: 저장된 방을 다시 세움 — 오래 빈 방은 지우고, 대결 중이면 다시 켜지는 동안 흐른 시간은 셈하지 않음(턴 시간 · 끊김 여유를 새로)
  function load(now) {
    let rows = [];
    try { rows = db.allRooms.all(); } catch (e) { console.error('방 읽기 실패', e && e.message); return; }
    for (const row of rows) {
      let r = null, oldRules = false;
      try { const o = JSON.parse(row.data); oldRules = !!(o.B && (o.B.rv || 1) !== RULES_VER); r = unpack(o); } catch (e) { console.error('방 되살리기 실패', row.code, e && e.message); }
      if (!r || !r.members || !r.members.length || now - (r.touched || 0) > IDLE_MS) { try { db.delRoom.run(row.code); } catch {} continue; }
      // 대결 중이던 방: 판이 깨졌거나 전투 계산이 바뀌어 올라왔으면(RULES_VER) 승패 없이 대기실로(2026-10-18 업데이트 안전)
      if (r.phase === 'battle' && (!r.B || !r.sides || oldRules)) Object.assign(r, { phase: 'lobby', B: null, sides: null, moves: {}, sends: null });
      if (r.phase === 'battle') r.deadline = Math.max(r.deadline || 0, now + RESUME_MS);
      for (const m of r.members) { m.gone = null; seen.set(m.uid, now); byUser.set(m.uid, r.code); }
      rooms.set(r.code, r);
    }
  }
  if (db) load(Date.now());

  // 방을 바꾸는 일은 끝날 때 바로 적음(시계도 1초마다 남은 것을 적음)
  const done = fn => (...a) => { try { return fn(...a); } finally { flush(); } };
  return { subscribe, poll, create: done(create), join: done(join), leave: done(leave), pick: done(pick), setMode: done(setMode), setTeam: done(setTeam), ready: done(ready), move: done(move), forfeit: done(forfeit), emote, view, count: () => rooms.size, stop: () => clearInterval(clock) };   // stop = 시험(다시 켜기 흉내)
}
