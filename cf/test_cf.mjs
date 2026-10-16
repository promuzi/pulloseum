// Cloudflare 판 로컬 시험(배포 없음) — 이 컴퓨터 안에서 Cloudflare 실행기(wrangler dev = 진짜 Workers 런타임 workerd)를 임시 저장소로 띄우고
//  Node 판과 같은 서버 시험(tools/test/server.mjs — 가입 · 자동 저장 · 봇 판 · 이어 하기 · 기권 · 친구 대결 방 · 기다리는 요청 · 잘못된 요청 · 파일 노출)을 그 주소로 그대로 돌림
//  wrangler 는 새로 설치하지 않고 이미 있는 것(C:/dev/homocarbo/node_modules/wrangler 4.126 — 메카와 같음, 다른 곳이면 WRANGLER_JS)
//  실행: node cf/test_cf.mjs
import { spawn, spawnSync, execSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), CF = join(ROOT, 'cf');
const WRANGLER = process.env.WRANGLER_JS || 'C:/dev/homocarbo/node_modules/wrangler/bin/wrangler.js';
const PORT = 8799, BASE = `http://127.0.0.1:${PORT}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!existsSync(WRANGLER)) { console.error('wrangler 없음:', WRANGLER); process.exit(1); }

const b = spawnSync(process.execPath, [join(CF, 'build.mjs')], { encoding: 'utf8' });
process.stdout.write(b.stdout); if (b.status) { process.stderr.write(b.stderr); process.exit(1); }
const persist = mkdtempSync(join(tmpdir(), 'pullo-cf-'));
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1' };
delete env.CLOUDFLARE_API_TOKEN;   // 이 기기 환경변수 토큰은 다른 프로젝트용 — 로컬 시험엔 필요 없음
const child = spawn(process.execPath, [WRANGLER, 'dev', '--config', join(CF, 'wrangler.jsonc'), '--local', '--ip', '127.0.0.1', '--port', String(PORT), '--inspector-port', String(PORT + 1000), '--persist-to', persist, '--show-interactive-dev-session', 'false', '--log-level', 'warn'], { cwd: CF, env, windowsHide: true });
let log = '';
child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
let code = 1;
try {
  const t0 = Date.now();
  for (;;) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {}
    if (child.exitCode != null) throw new Error('wrangler 가 꺼짐:\n' + log);
    if (Date.now() - t0 > 90000) throw new Error('wrangler 가 90초 안에 안 뜸:\n' + log);
    await sleep(500);
  }
  console.log(`Cloudflare 실행기 뜸(${((Date.now() - t0) / 1000).toFixed(1)}초) — ${BASE}`);
  const page = await fetch(BASE + '/v2/'), root = await fetch(BASE + '/', { redirect: 'manual' });
  console.log(`정적 파일: /v2/ ${page.status} · / → ${root.status} ${root.headers.get('location') || ''}`);
  const t = spawnSync(process.execPath, [join(ROOT, 'tools', 'test', 'server.mjs'), '--base', BASE], { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write(t.stdout); if (t.stderr) process.stdout.write(t.stderr);
  code = t.status === 0 && page.status === 200 && root.status === 302 ? 0 : 1;
} catch (e) { console.error(e.message); }
finally {
  try { execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }); } catch { child.kill(); }
  await sleep(300);
  try { rmSync(persist, { recursive: true, force: true }); } catch {}
  if (code) console.log('--- wrangler 출력 ---\n' + log.slice(-4000));
}
process.exit(code);
