// 로그인 유지 쿠키(2026-10-24 사용자 '아이폰에서 게임들어가면 매번 로그인해야한다는데'): 아이폰 사파리는 스크립트가 쓴 저장(localStorage)을
//  7일 안 쓰면 지우고, 개인 정보 보호 · 앱 안 브라우저에선 아예 못 쓰기도 함 → 서버가 로그인 열쇠를 HttpOnly 쿠키(30일)로도 내려 주고,
//  열쇠가 없는 화면이 /api/me 를 부르면 쿠키로 알아보고 열쇠를 다시 돌려줌 · 쓸 때마다 30일 늘림 · 로그아웃이면 쿠키를 지움
//   node tools/test/cookie_login.mjs [--base URL]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXT = (i => (i > 0 ? process.argv[i + 1] : null))(process.argv.indexOf('--base'));
const PORT = 19000 + Math.floor(Math.random() * 900), BASE = EXT || `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'pullo-ck-'));
const srv = EXT ? null : spawn(process.execPath, ['--no-warnings', 'server/index.mjs', '--port', String(PORT), '--db', join(dir, 't.db')], { stdio: 'ignore' });
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(path, body, headers = {}) {
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, cookie: r.headers.get('set-cookie') || '', body: await r.json().catch(() => ({})) };
}
try {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/api/config'); break; } catch { await sleep(200); } }
  const login = 'ck' + Math.floor(Math.random() * 1e6);
  const reg = await call('/api/register', { age14: true, login, password: 'pw123456', nickname: '쿠키', starter: 'flower_grass' });
  ok(reg.status === 200 && reg.body.token, '가입');
  ok(/pullo_t=[^;]+/.test(reg.cookie) && /HttpOnly/i.test(reg.cookie) && /Max-Age=2592000/.test(reg.cookie) && /SameSite=Lax/i.test(reg.cookie), `가입하면 로그인 쿠키(30일 · HttpOnly) — ${reg.cookie}`);
  const ck = (reg.cookie.match(/pullo_t=[^;]+/) || [''])[0];
  const me = await call('/api/me', null, { cookie: ck });
  ok(me.status === 200 && me.body.user && me.body.token, '열쇠 없이 쿠키만으로 /api/me — 열쇠를 다시 돌려줌');
  ok(/pullo_t=/.test(me.cookie), '쓸 때마다 쿠키를 다시 내려 줌(30일 늘림)');
  const me2 = await call('/api/me', null, { authorization: 'Bearer ' + me.body.token });
  ok(me2.status === 200, '돌려받은 열쇠로도 됨');
  const none = await call('/api/me');
  ok(none.status === 401, '열쇠 · 쿠키 둘 다 없으면 401');
  const out = await call('/api/logout', {}, { authorization: 'Bearer ' + me.body.token, cookie: ck });
  ok(out.status === 200 && /pullo_t=;/.test(out.cookie) && /Max-Age=0/.test(out.cookie), '로그아웃 = 쿠키 지움');
  const after = await call('/api/me', null, { cookie: ck });
  ok(after.status === 401, '로그아웃한 쿠키는 더 안 통함');
} catch (e) { fails++; console.log('오류', e); }
finally { if (srv) srv.kill(); try { rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(fails ? `실패 ${fails} / ${n}` : `로그인 쿠키 시험 ${n}개 통과`);
process.exit(fails ? 1 : 0);
