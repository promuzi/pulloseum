// 풀로세움 v2 서버 — 설치할 것 없이 Node 하나로(내장 http · sqlite · crypto).
//   실행: node server/index.mjs            → http://localhost:8790 (같은 PC)
//         node server/index.mjs --host 0.0.0.0   → 같은 와이파이의 친구도 접속(방화벽 허용 필요)
//   저장 = server/data/pulloseum.db(깃에 안 올림). 플레이 기록 보기 = node server/report.mjs
//  하는 일: 계정(아이디·비밀번호 → 로그인 열쇠) · 자동 저장(일 하나마다) · 봇 판(서버가 한 턴씩) · 친구 대결 방(초대 코드) · 게임 파일 내보내기
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openDb } from './db.mjs';
import { hashPass, checkPass, newSession, userOfToken, endSession, allowTry, LOGIN_RE } from './auth.mjs';
import { makeGame } from './game.mjs';
import { makeRooms } from './rooms.mjs';
import { makeLog } from './log.mjs';
import { makeStatic } from './static.mjs';
import { Err } from '../v2/src/game/logic.js';
import { STARTERS } from '../v2/src/game/catalog.js';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : process.env['PULLO_' + k.toUpperCase()] || d; };
const PORT = +arg('port', 8790), HOST = arg('host', '127.0.0.1'), DB = arg('db', join(HERE, 'data', 'pulloseum.db'));
const BODY_MAX = 64 * 1024;

const { q } = openDb(DB);
const log = makeLog(q);
const game = makeGame({ q, log });
const rooms = makeRooms({ game, log });
const serveStatic = makeStatic(ROOT);

// ── 도움 ──
class HttpErr extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const json = (res, code, obj) => { const b = Buffer.from(JSON.stringify(obj)); res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': b.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(b); };
function readBody(req) {
  return new Promise((ok, no) => {
    let n = 0; const parts = [];
    req.on('data', c => { n += c.length; if (n > BODY_MAX) { no(new HttpErr(413, '요청이 너무 커요')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { if (!n) return ok({}); try { ok(JSON.parse(Buffer.concat(parts).toString('utf8'))); } catch { no(new HttpErr(400, '잘못된 요청이에요')); } });
    req.on('error', no);
  });
}
// 터널(클라우드플레어) 뒤에서는 접속한 사람 주소가 머리글에 옴 — 같은 PC에서 온 요청일 때만 그 머리글을 믿음
const ipOf = req => { const ra = req.socket.remoteAddress || ''; const local = ra === '127.0.0.1' || ra === '::1' || ra === '::ffff:127.0.0.1'; return (local && (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || ra; };
const tokenOf = req => { const h = req.headers.authorization || ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : null; };
// 너무 잦은 요청 막기(계정마다 10초에 80번)
const hits = new Map();
function rate(key, now, max = 80, win = 10000) {
  const r = hits.get(key) || { n: 0, t0: now };
  if (now - r.t0 > win) { r.n = 0; r.t0 = now; }
  r.n++; hits.set(key, r);
  if (r.n > max) throw new HttpErr(429, '너무 빨라요 — 잠시 뒤에 다시 해 주세요');
}
setInterval(() => { const now = Date.now(); for (const [k, r] of hits) if (now - r.t0 > 60000) hits.delete(k); q.purgeSessions.run(now); q.purgeBattles.run(now - 7 * 864e5); }, 60000).unref();
const regs = new Map();   // 가입 제한(IP마다 하루 10개)

function cleanNick(v) { const s = String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 12); return s; }
function authed(req, now) {
  const u = userOfToken(q, tokenOf(req), now);
  if (!u) throw new HttpErr(401, '다시 로그인해 주세요');
  rate('u' + u.id, now);
  q.seen.run(now, u.id);
  return u;
}

// ── 길(주소 → 할 일) ──
const API = {
  'GET /api/health': () => ({ ok: true, rooms: rooms.count() }),
  'POST /api/register': (req, b, now) => {
    const ip = ipOf(req), day = Math.floor(now / 864e5), k = ip + ':' + day, n = regs.get(k) || 0;
    if (n >= 10) throw new HttpErr(429, '오늘은 더 만들 수 없어요');
    const login = String(b.login || '').trim().toLowerCase(), pw = String(b.password || ''), nick = cleanNick(b.nickname), starter = String(b.starter || '');
    if (!LOGIN_RE.test(login)) throw new Err('아이디는 영어 소문자·숫자·밑줄 3~20자예요');
    if (pw.length < 6 || pw.length > 72) throw new Err('비밀번호는 6~72자예요');
    if (!nick) throw new Err('별명을 써 주세요');
    if (!STARTERS.includes(starter)) throw new Err('처음 식물을 골라 주세요');
    if (q.userByLogin.get(login)) throw new Err('이미 있는 아이디예요');
    const r = q.addUser.run(login, hashPass(pw), nick, now), uid = Number(r.lastInsertRowid);
    regs.set(k, n + 1);
    const s = game.create(uid, { nickname: nick, starter }, now), token = newSession(q, uid, now);
    log(uid, 'register', { starter }, now);
    return { token, user: { id: uid, login, nickname: nick }, state: s, ver: 1 };
  },
  'POST /api/check': (req, b, now) => {   // 가입 전 아이디 쓸 수 있는지(식물 고르기 전에 알려 주려고)
    if (!allowTry('c' + ipOf(req), now)) throw new HttpErr(429, '잠시 뒤에 다시 해 주세요');
    const login = String(b.login || '').trim().toLowerCase();
    if (!LOGIN_RE.test(login)) throw new Err('아이디는 영어 소문자·숫자·밑줄 3~20자예요');
    if (q.userByLogin.get(login)) throw new Err('이미 있는 아이디예요');
    return { ok: true };
  },
  'POST /api/login': (req, b, now) => {
    if (!allowTry(ipOf(req), now)) throw new HttpErr(429, '시도가 너무 많아요 — 10분 뒤에 다시 해 주세요');
    const login = String(b.login || '').trim().toLowerCase(), pw = String(b.password || '');
    const u = q.userByLogin.get(login);
    if (!u || !checkPass(pw, u.pass)) throw new Err('아이디나 비밀번호가 맞지 않아요');
    const token = newSession(q, u.id, now), st = game.state(u.id, now);
    log(u.id, 'login', {}, now);
    return { token, user: { id: u.id, login: u.login, nickname: u.nickname }, ...st };
  },
  'POST /api/logout': (req) => { endSession(q, tokenOf(req)); return { ok: true }; },
  'GET /api/me': (req, b, now) => { const u = authed(req, now); return { user: { id: u.id, login: u.login, nickname: u.nickname }, ...game.state(u.id, now) }; },
  'POST /api/act': (req, b, now) => { const u = authed(req, now); return game.act(u.id, String(b.op || ''), b.args || {}, now); },
  'POST /api/battle/start': (req, b, now) => { const u = authed(req, now); return game.battleStart(u.id, now); },
  'POST /api/battle/turn': (req, b, now) => { const u = authed(req, now); return game.battleTurn(u.id, b.id, b.act, now, b.turn == null ? null : +b.turn); },
  'POST /api/battle/forfeit': (req, b, now) => { const u = authed(req, now); return game.battleForfeit(u.id, b.id, now); },
  'GET /api/room': (req, b, now) => rooms.view(authed(req, now).id),
  'POST /api/room/create': (req, b, now) => rooms.create(authed(req, now).id, now),
  'POST /api/room/join': (req, b, now) => rooms.join(authed(req, now).id, b.code, now),
  'POST /api/room/leave': (req, b, now) => rooms.leave(authed(req, now).id, now),
  'POST /api/room/pick': (req, b, now) => rooms.pick(authed(req, now).id, b.plant, now),
  'POST /api/room/ready': (req, b, now) => rooms.ready(authed(req, now).id, !!b.on, now),
  'POST /api/room/move': (req, b, now) => rooms.move(authed(req, now).id, b.act, now, b.turn == null ? null : +b.turn),
  'POST /api/room/forfeit': (req, b, now) => rooms.forfeit(authed(req, now).id, now),
  'POST /api/room/emote': (req, b, now) => rooms.emote(authed(req, now).id, b.i, now),
};

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  let path = '/';
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  try {
    if (path === '/api/room/events' && req.method === 'GET') {   // 실시간 알림(대결 방)
      const u = authed(req, t0);
      return rooms.subscribe(u.id, req, res);
    }
    if (path === '/api/room/poll' && req.method === 'GET') {   // 대결 방 소식(기다리는 요청 — 터널을 거쳐도 막히지 않음)
      const u = authed(req, t0), after = Number(new URL(req.url, 'http://x').searchParams.get('after'));
      const out = await rooms.poll(u.id, Number.isFinite(after) ? after : -1, req);
      if (res.destroyed || res.writableEnded) return;
      return json(res, 200, { ...out, now: Date.now() });
    }
    const h = API[req.method + ' ' + path];
    if (h) {
      const body = req.method === 'POST' ? await readBody(req) : {};
      const out = h(req, body, Date.now());
      return json(res, 200, { ...out, now: Date.now() });
    }
    if (path.startsWith('/api/')) throw new HttpErr(404, '없는 주소예요');
    if ((req.method === 'GET' || req.method === 'HEAD') && await serveStatic(req, res, path)) return;
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('없는 파일');
  } catch (e) {
    if (e instanceof Err) return json(res, 400, { error: e.message });
    if (e instanceof HttpErr) return json(res, e.code, { error: e.message });
    console.error(new Date().toISOString(), req.method, path, e);
    if (!res.headersSent) json(res, 500, { error: '서버에 문제가 생겼어요' });
  } finally {
    if (path.startsWith('/api/') && path !== '/api/room/events' && path !== '/api/room/poll') { const ms = Date.now() - t0; if (ms > 300) console.log('느림', req.method, path, ms + 'ms'); }
  }
});
server.keepAliveTimeout = 65000;
server.listen(PORT, HOST, () => console.log(`풀로세움 서버 — http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/v2/  (저장: ${DB})`));
