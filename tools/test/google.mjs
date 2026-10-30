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
  const idt = url.includes('tokeninfo') ? new URL(url).searchParams.get('id_token') : null;
  if (idt) {   // 앱(네이티브 구글 로그인)의 ID 토큰: 'idgood' = 우리 앱 · 'idother' = 남의 앱 · 'idold' = 지남 · 'idfake' = 구글이 아닌 발급자
    const base = { iss: 'https://accounts.google.com', aud: CID, azp: 'android-client', sub: '1001', exp: String(Math.floor(Date.now() / 1000) + 3000), given_name: '구글이' };
    if (idt === 'idgood') return { ok: true, json: async () => base };
    if (idt === 'idother') return { ok: true, json: async () => ({ ...base, aud: 'someone-else' }) };
    if (idt === 'idold') return { ok: true, json: async () => ({ ...base, exp: '1000' }) };
    if (idt === 'idfake') return { ok: true, json: async () => ({ ...base, iss: 'evil.example.com' }) };
    return { ok: false, json: async () => ({}) };
  }
  const tok = url.includes('tokeninfo') ? new URL(url).searchParams.get('access_token') : String((opt.headers || {}).authorization || '').replace('Bearer ', '');
  if (url.includes('tokeninfo')) {
    if (tok === 'good' || tok === 'good2') return { ok: true, json: async () => ({ aud: CID, azp: CID, sub: tok === 'good' ? '1001' : '1002', expires_in: '3500' }) };
    if (tok === 'other') return { ok: true, json: async () => ({ aud: 'someone-else', azp: 'someone-else', sub: '9', expires_in: '3500' }) };
    return { ok: false, json: async () => ({}) };
  }
  return { ok: true, json: async () => ({ sub: '1001', given_name: '구글이' }) };
};
const call = async (api, method, path, body = {}, ip = '1.2.3.4') => {
  const r = await api.handle({ method, path, query: new URLSearchParams(), header: () => null, ip, body, onClose: () => {} });
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
  const noAge = await call(api, 'POST', '/api/google', { token: 'good', starter: 'aqua', nickname: '물방울' });
  ok(noAge.status === 400 && /14세/.test(noAge.error) && !q.userByLogin.get('g:1001'), '만 14세 확인 없으면 계정 안 만듦');
  const reg = await call(api, 'POST', '/api/google', { token: 'good', starter: 'aqua', nickname: '물방울', age14: true });
  ok(reg.status === 200 && reg.token && reg.user.login === '구글 계정' && reg.user.nickname === '물방울' && reg.state.plants[0].key === 'aqua', '계정 만들기(구글 sub는 안 보냄)');
  const row = q.userByLogin.get('g:1001');
  ok(row && row.provider === 'google' && row.pass === '!google', '저장: login g:<sub> · provider google · 비밀번호 없음');
  const again = await call(api, 'POST', '/api/google', { token: 'good' });
  ok(again.status === 200 && again.token && again.token !== reg.token && again.state.plants[0].key === 'aqua', '다시 = 같은 계정으로 로그인');
  const viaId = await call(api, 'POST', '/api/google', { idToken: 'idgood' }, '5.6.7.8');
  ok(viaId.status === 200 && viaId.token && viaId.user.login === '구글 계정' && viaId.state.plants[0].key === 'aqua', '앱(ID 토큰) = 같은 구글 계정으로 로그인');
  for (const [t, m] of [['idother', '남의 앱 ID 토큰'], ['idold', '지난 ID 토큰'], ['idfake', '구글이 아닌 발급자'], ['idnope', '무효 ID 토큰']]) ok((await call(api, 'POST', '/api/google', { idToken: t }, '5.6.7.8')).status === 400, m + ' 거절');
  const me = await api.handle({ method: 'GET', path: '/api/me', query: new URLSearchParams(), header: k => (k === 'authorization' ? 'Bearer ' + again.token : null), ip: '1.2.3.4', body: {}, onClose: () => {} });
  ok(me.status === 200 && me.body.user.login === '구글 계정', '구글 열쇠로 내 정보');
  const pw = await call(api, 'POST', '/api/login', { login: 'g:1001', password: '!google' });
  ok(pw.status === 400, '구글 계정은 아이디 · 비밀번호로 못 들어감');
  const bad = await call(api, 'POST', '/api/google', { token: 'good2', starter: 'nope' });
  ok(bad.status === 400, '처음 식물이 이상하면 막힘');

  // 계정 지우기(구글 플레이 정책): 아이디 계정 = 비밀번호 · 구글 계정 = '지우기' → 계정 · 열쇠 · 저장 · 기록 전부
  const callT = async (path, body, token) => {
    const r = await api.handle({ method: 'POST', path, query: new URLSearchParams(), header: k => (k === 'authorization' ? 'Bearer ' + token : null), ip: '9.9.9.9', body, onClose: () => {} });
    return { status: r.status, ...r.body };
  };
  const loc = await call(api, 'POST', '/api/register', { age14: true, login: 'leafy', password: 'secret1', nickname: '잎새', starter: 'aqua' }, '9.9.9.9');
  ok(loc.status === 200 && loc.user.provider === 'local', '아이디 계정 만들기(provider local)');
  ok((await callT('/api/account/delete', { password: 'wrong!!' }, loc.token)).status === 400, '비밀번호가 틀리면 안 지움');
  ok(!!q.userByLogin.get('leafy'), '틀린 뒤 계정 그대로');
  ok((await callT('/api/account/delete', { password: 'secret1' }, loc.token)).status === 200, '비밀번호 맞으면 지움');
  const uid = loc.user.id;
  ok(!q.userByLogin.get('leafy') && !q.save.get(uid) && !db.prepare('SELECT 1 FROM events WHERE user_id = ?').get(uid) && !db.prepare('SELECT 1 FROM sessions WHERE user_id = ?').get(uid), '계정 · 저장 · 기록 · 열쇠 모두 사라짐');
  ok((await callT('/api/act', { op: 'nothing' }, loc.token)).status === 401, '지운 계정의 열쇠는 못 씀');
  ok((await call(api, 'POST', '/api/login', { login: 'leafy', password: 'secret1' }, '9.9.9.9')).status === 400, '지운 계정으로 로그인 못 함');
  ok((await callT('/api/account/delete', { confirm: '지울래' }, again.token)).status === 400, "구글 계정은 '지우기'가 아니면 안 지움");
  ok((await callT('/api/account/delete', { confirm: '지우기' }, again.token)).status === 200 && !q.userByLogin.get('g:1001'), "구글 계정 '지우기' = 지움");
  const fresh = await call(api, 'POST', '/api/google', { token: 'good' }, '9.9.9.9');
  ok(fresh.status === 200 && fresh.need === 'register', '지운 뒤 같은 구글로 오면 처음부터');
} catch (e) { fails++; console.log('오류', e); }
finally { try { db.close(); } catch {} try { rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
