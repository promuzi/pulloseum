// 풀로세움 v2 — Cloudflare 판(2026-10-16 사용자: 메카 멀티처럼 PC 없이 고정 주소 → "ㅇㅇ 올려").
//  앞단(Worker): 게임 화면 파일은 Cloudflare 정적 파일(assets, cf/build.mjs 가 cf/public 에 모음)이 바로 내주고, /api/* 만 본체로 넘김. / → /v2/
//  본체(Durable Object 'Hub' 하나): 저장소 = 이 객체의 SQLite(cf/src/dodb.js), 할 일 = Node 판과 같은 server/api.mjs · game.mjs · rooms.mjs · log.mjs
//   — 메카(proto/net/cf)는 방마다 객체 하나였지만, 여기는 계정·저장이 있어 객체 하나에 다 둠(친구 몇 명 규모). 친구 대결 소식 = 기다리는 요청(/api/room/poll)
//  무료 요금제: 앞단 하루 10만 요청 · 요청당 계산 10ms(넘기기만 함), 본체 요청당 계산 30초 · SQLite 5GB
import { DurableObject } from 'cloudflare:workers';
import { doDb } from './dodb.js';
import { makeLog } from '../../server/log.mjs';
import { makeGame } from '../../server/game.mjs';
import { makeRooms } from '../../server/rooms.mjs';
import { makeApi } from '../../server/api.mjs';

const BODY_MAX = 64 * 1024;
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const { q } = doDb(ctx.storage.sql);
    const log = makeLog(q), game = makeGame({ q, log }), rooms = makeRooms({ game, log, q });   // 방도 이 SQLite 에(본체가 다시 켜져도 대결이 이어짐 — 2026-10-18)
    this.api = makeApi({ q, game, rooms, log, adminKey: env.ADMIN_KEY || null, googleClientId: env.GOOGLE_CLIENT_ID || null });
  }
  async fetch(request) {
    const url = new URL(request.url);
    let body = {};
    if (request.method === 'POST') {
      const text = await request.text();
      if (text.length > BODY_MAX) return json(413, { error: '요청이 너무 커요' });
      if (text) { try { body = JSON.parse(text); } catch { return json(400, { error: '잘못된 요청이에요' }); } }
    }
    const closers = [];
    if (request.signal && request.signal.addEventListener) request.signal.addEventListener('abort', () => { for (const f of closers) f(); });
    let path = url.pathname;
    try { path = decodeURIComponent(path); } catch {}
    const out = await this.api.handle({ method: request.method, path, query: url.searchParams, header: n => request.headers.get(n), ip: request.headers.get('cf-connecting-ip') || 'cf', body, onClose: f => closers.push(f) });
    if (out && out.cookie) { const r = json(out.status, out.body); r.headers.append('set-cookie', out.cookie); return r; }   // 로그인 유지 쿠키
    return out ? json(out.status, out.body) : json(404, { error: '없는 주소예요' });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/room/events') return json(404, { error: '이 서버는 /api/room/poll 을 써요' });
      return env.HUB.get(env.HUB.idFromName('hub')).fetch(request);
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return Response.redirect(url.origin + '/v2/', 302);
    return env.ASSETS.fetch(request);
  },
};
