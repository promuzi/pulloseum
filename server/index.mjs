// 풀로세움 v2 서버 — 설치할 것 없이 Node 하나로(내장 http · sqlite · crypto).
//   실행: node server/index.mjs            → http://localhost:8790 (같은 PC)
//         node server/index.mjs --host 0.0.0.0   → 같은 와이파이의 친구도 접속(방화벽 허용 필요)
//   저장 = server/data/pulloseum.db(깃에 안 올림). 플레이 기록 보기 = node server/report.mjs
//  주소별 할 일은 server/api.mjs(Cloudflare 판 cf/src/worker.js 와 같이 씀) — 여기서는 Node http ↔ api 꼴 맞추기 · 정적 파일 · 같은 PC용 흐름 알림(/api/room/events)
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openDb } from './db.mjs';
import { makeGame } from './game.mjs';
import { makeRooms } from './rooms.mjs';
import { makeLog } from './log.mjs';
import { makeStatic } from './static.mjs';
import { makeApi, HttpErr } from './api.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : process.env['PULLO_' + k.toUpperCase()] || d; };
const PORT = +arg('port', 8790), HOST = arg('host', '127.0.0.1'), DB = arg('db', join(HERE, 'data', 'pulloseum.db'));
const BODY_MAX = 64 * 1024;

const { q } = openDb(DB);
const log = makeLog(q);
const game = makeGame({ q, log });
const rooms = makeRooms({ game, log });
const api = makeApi({ q, game, rooms, log });
const serveStatic = makeStatic(ROOT);

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
const apiReq = (req, path, body) => ({ method: req.method, path, query: new URL(req.url, 'http://x').searchParams, header: n => req.headers[n.toLowerCase()], ip: ipOf(req), body, onClose: f => req.on('close', f) });

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  let path = '/';
  try { path = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  try {
    if (path === '/api/room/events' && req.method === 'GET') {   // 실시간 알림 흐름(같은 PC용 — 터널 너머는 /api/room/poll)
      const u = api.authed(apiReq(req, path, {}), t0);
      return rooms.subscribe(u.id, req, res);
    }
    if (path.startsWith('/api/')) {
      const out = await api.handle(apiReq(req, path, req.method === 'POST' ? await readBody(req) : {}));
      if (res.destroyed || res.writableEnded) return;
      return json(res, out.status, out.body);
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && await serveStatic(req, res, path)) return;
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('없는 파일');
  } catch (e) {
    if (e instanceof HttpErr) return json(res, e.code, { error: e.message });
    console.error(new Date().toISOString(), req.method, path, e);
    if (!res.headersSent) json(res, 500, { error: '서버에 문제가 생겼어요' });
  } finally {
    if (path.startsWith('/api/') && path !== '/api/room/events' && path !== '/api/room/poll') { const ms = Date.now() - t0; if (ms > 300) console.log('느림', req.method, path, ms + 'ms'); }
  }
});
server.keepAliveTimeout = 65000;
server.listen(PORT, HOST, () => console.log(`풀로세움 서버 — http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/v2/  (저장: ${DB})`));
