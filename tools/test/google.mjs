// 구글 로그인 시험(가짜 구글 응답 — 진짜 구글에 묻지 않음): 클라이언트 ID가 없으면 길이 없음 · 남의 앱 토큰 거절 · 처음 = 식물 고르기 요청 → 계정 생성 · 다시 = 로그인
//   node tools/test/google.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../server/db.mjs';
import { makeGame } from '../../server/game.mjs';
import { makeRooms } from '../../server/rooms.mjs';
import { makeLog } from '../../server/log.mjs';
import { makeApi } from '../../server/api.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const dir = mkdtempSync(join(tmpdir(), 'pullo-g-')), { q, db } = openDb(join(dir, 't.db')), log = makeLog(q), game = makeGame({ q, log }), rooms = makeRooms({ game, log });
const CID = 'test-client.apps.googleusercontent.com';
// 가짜 구글: 토큰 'good' = 우리 앱 · 'other' = 남의 앱 · 그 밖 = 무효
const fakeFetch = async (url, opt = {}) => {
  const tok = url.includes('tokeninfo') ? new URL(url).searchParams.get('access_token') : String((opt.headers || {}).authorization || '').replace('Bearer ', '');
  if (url.includes('tokeninfo')) {
    if (tok === 'good' || tok === 'good2') return { ok: true, json: async () => ({ aud: CID, azp: CID, sub: tok === 'good' ? '1001' : '1002', expires_in: '3500' }) };
    if (tok === 'other') return { ok: true, json: async () => ({ aud: 'someone-else', azp: 'someone-else', sub: '9', expires_in: '3500' }) };
    return { ok: false, json: async () => ({}) };
  }
  return { ok: true, json: async () => ({ sub: '1001', given_name: '구글이' }) };
};
const call = async (api, method, path, body = {}) => {
  const r = await api.handle({ method, path, query: new URLSearchParams(), header: () => null, ip: '1.2.3.4', body, onClose: () => {} });
  return { status: r.status, ...r.body };
};
try {
  const off = makeApi({ q, game, rooms, log });
  ok((await call(off, 'GET', '/api/config')).google === null, '클라이언트 ID 없음 = 구글 단추 없음');
  ok((await call(off, 'POST', '/api/google', { token: 'good' })).status === 404, '클라이언트 ID 없음 = 길 없음(404)');
  const api = makeApi({ q, game, rooms, log, googleClientId: CID, fetchFn: fakeFetch });
  ok((await call(api, 'GET', '/api/config')).google === CID, '설정 = 클라이언트 ID');
  const other = await call(api, 'POST', '/api/google', { token: 'other' });
  ok(other.status === 400 && /확인하지 못했어요/.test(other.error), '남의 앱 토큰 거절');
  ok((await call(api, 'POST', '/api/google', { token: 'bad' })).status === 400, '무효 토큰 거절');
  const first = await call(api, 'POST', '/api/google', { token: 'good' });
  ok(first.status === 200 && first.need === 'register' && first.name === '구글이' && !first.token, '처음 = 식물 고르기 요청(이름 제안)');
  const reg = await call(api, 'POST', '/api/google', { token: 'good', starter: 'aqua', nickname: '물방울' });
  ok(reg.status === 200 && reg.token && reg.user.login === '구글 계정' && reg.user.nickname === '물방울' && reg.state.plants[0].key === 'aqua', '계정 만들기(구글 sub는 안 보냄)');
  const row = q.userByLogin.get('g:1001');
  ok(row && row.provider === 'google' && row.pass === '!google', '저장: login g:<sub> · provider google · 비밀번호 없음');
  const again = await call(api, 'POST', '/api/google', { token: 'good' });
  ok(again.status === 200 && again.token && again.token !== reg.token && again.state.plants[0].key === 'aqua', '다시 = 같은 계정으로 로그인');
  const me = await api.handle({ method: 'GET', path: '/api/me', query: new URLSearchParams(), header: k => (k === 'authorization' ? 'Bearer ' + again.token : null), ip: '1.2.3.4', body: {}, onClose: () => {} });
  ok(me.status === 200 && me.body.user.login === '구글 계정', '구글 열쇠로 내 정보');
  const pw = await call(api, 'POST', '/api/login', { login: 'g:1001', password: '!google' });
  ok(pw.status === 400, '구글 계정은 아이디 · 비밀번호로 못 들어감');
  const bad = await call(api, 'POST', '/api/google', { token: 'good2', starter: 'nope' });
  ok(bad.status === 400, '처음 식물이 이상하면 막힘');
} catch (e) { fails++; console.log('오류', e); }
finally { try { db.close(); } catch {} try { rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
