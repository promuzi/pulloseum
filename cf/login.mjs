// Cloudflare 로그인(wrangler login 과 같은 OAuth — 2026-10-18 새 기기(D:\dev)에서 wrangler login 이 2분 만에 끊겨 승인 뒤 'localhost 거절'만 뜸):
//  기다림 제한 없이 localhost:8976 에서 승인 결과를 받고, 받은 열쇠를 wrangler 가 읽는 자리(config/default.toml)에 씀 → 그다음부턴 wrangler deploy 가 묻지 않음(열쇠 자동 갱신).
//   node cf/login.mjs                      승인 주소를 열고(기본 브라우저) 결과를 기다림 — 이 PC 브라우저에서 승인하면 저절로 끝
//   node cf/login.mjs --finish "<주소>"    다른 기기(휴대폰)에서 승인해 'localhost 연결 거부' 화면이 나왔으면 그 주소창 주소를 붙여 마무리(기다리던 창이 꺼졌어도 됨)
//  wrangler 와 같은 공개 클라이언트 ID · 범위 · 돌아올 주소. 승인 대기 값(PKCE 검증값 · state)은 이 PC 임시 폴더에만(깃 · 문서에 안 남김).
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { spawn } from 'node:child_process';

const CLIENT = '54d11594-84e4-41aa-b438-e81b8fa78ee7', CALLBACK = 'http://localhost:8976/oauth/callback';
const SCOPES = ['account:read', 'user:read', 'workers:write', 'workers_kv:write', 'workers_routes:write', 'workers_scripts:write', 'workers_tail:read', 'd1:write', 'pages:write', 'zone:read', 'ssl_certs:write', 'ai:write', 'queues:write', 'pipelines:write'];
const PENDING = join(tmpdir(), 'pulloseum-cf-login.json');
// wrangler 설정 폴더: 옛 ~/.wrangler 가 있으면 그것, 없으면 xdg 자리(윈도 = %APPDATA%\xdg.config\.wrangler)
const legacy = join(homedir(), '.wrangler'), CONF_DIR = existsSync(legacy) ? legacy : join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'xdg.config', '.wrangler');
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function finish(code, state) {
  const P = JSON.parse(readFileSync(PENDING, 'utf8'));
  if (state !== P.state) throw new Error('state 가 달라요 — 다시 node cf/login.mjs 부터');
  const res = await fetch('https://dash.cloudflare.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: CALLBACK, client_id: CLIENT, code_verifier: P.verifier }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error || !j.access_token) throw new Error('열쇠 받기 실패: ' + (j.error || res.status));
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const toml = [`oauth_token = "${esc(j.access_token)}"`, `expiration_time = "${new Date(Date.now() + j.expires_in * 1000).toISOString()}"`, j.refresh_token ? `refresh_token = "${esc(j.refresh_token)}"` : null, `scopes = [ ${(j.scope ? j.scope.split(' ') : SCOPES).map(s => `"${esc(s)}"`).join(', ')} ]`].filter(Boolean).join('\n') + '\n';
  mkdirSync(join(CONF_DIR, 'config'), { recursive: true });
  writeFileSync(join(CONF_DIR, 'config', 'default.toml'), toml, 'utf8');
  writeFileSync(PENDING, '{}');
  console.log('로그인 완료 —', join(CONF_DIR, 'config', 'default.toml'));
}

const fi = process.argv.indexOf('--finish');
if (fi > 0) {
  const u = new URL(process.argv[fi + 1]);
  await finish(u.searchParams.get('code'), u.searchParams.get('state'));
  process.exit(0);
}
const verifier = b64u(randomBytes(48)), state = b64u(randomBytes(24)), challenge = b64u(createHash('sha256').update(verifier).digest());
writeFileSync(PENDING, JSON.stringify({ verifier, state }));
const url = `https://dash.cloudflare.com/oauth2/auth?response_type=code&client_id=${CLIENT}&redirect_uri=${encodeURIComponent(CALLBACK)}&scope=${encodeURIComponent([...SCOPES, 'offline_access'].join(' '))}&state=${state}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;
const srv = createServer(async (req, res) => {
  const u = new URL(req.url, CALLBACK);
  if (u.pathname !== '/oauth/callback') { res.writeHead(404); return res.end(); }
  try {
    if (u.searchParams.get('error')) throw new Error('승인 거절: ' + u.searchParams.get('error'));
    await finish(u.searchParams.get('code'), u.searchParams.get('state'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<h2>풀로세움 — Cloudflare 로그인 완료. 이 창은 닫아도 돼요.</h2>');
    srv.close(); setTimeout(() => process.exit(0), 200);
  } catch (e) { console.error(e.message); res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<h2>실패: ' + e.message + '</h2>'); }
});
srv.listen(8976, 'localhost', () => {
  console.log('승인 주소(이 PC 브라우저로 열었음 — 다른 기기면 이 주소를 열고, 끝난 뒤 주소창 주소로 --finish):\n' + url);
  if (!process.argv.includes('--no-open')) spawn('rundll32', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' }).unref();
});
