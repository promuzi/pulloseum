// 3:3 친구 대결 화면 확인(실제 서버 · 두 계정): 임시 저장소로 서버를 켜고 A = 크롬 화면(수는 API로 둠) · B = tools/test/pvpfriend.mjs(가짜 친구)
//  → 방 3:3 · 시작(상대 대기석은 자리만) · 내가 쓰러진 자리 고르기 창(남은 초) · 상대가 고르는 중 · 판 끝 · 결과를 찍음
//   node tools/shots/pvp3shots.mjs [--label pvp3]   → tools/shots/out/<label>/
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = resolve(here, 'out', arg('label', 'pvp3')); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const PORT = 18500 + Math.floor(Math.random() * 400), BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'pullo-p3-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const srv = spawn(process.execPath, ['--no-warnings', 'server/index.mjs', '--port', String(PORT), '--db', join(dir, 't.db')], { cwd: repo, stdio: 'ignore' });
let bot = null, browser = null;
async function call(path, body, token) {
  for (let k = 0; ; k++) {
    const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 && k < 8) { await sleep(1500); continue; }
    return { status: r.status, ...j };
  }
}
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await sleep(100); }
  const A = await call('/api/register', { login: 'shot_a3', password: 'shot-a3-pw', nickname: '앨리스', starter: 'flower_grass' });
  for (const sd of A.state.seeds.slice(0, 2)) await call('/api/act', { op: 'plantSeed', args: { seed: sd.id } }, A.token);
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await browser.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: 270, height: 600, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument(t => { try { localStorage.setItem('pullo.token', t); } catch {} }, A.token);
  await p.goto(BASE + '/v2/', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready && window.__app, { timeout: 15000 });
  await p.evaluate(async () => { const me = await fetch('/api/me', { headers: { authorization: 'Bearer ' + localStorage.getItem('pullo.token') } }).then(r => r.json()); __app.user = me.user; __app.state = me.state; __app.go('room'); });
  const shot = async name => { await p.screenshot({ path: join(out, name + '.png') }); console.log('찍음', name); };
  await sleep(1200);
  const room = await call('/api/room/create', {}, A.token);
  await call('/api/room/mode', { mode: 'swap3' }, A.token);
  await sleep(1500); await shot('01_room3_alone');
  bot = spawn(process.execPath, ['--no-warnings', 'tools/test/pvpfriend.mjs', '--code', room.code, '--base', BASE.replace('127.0.0.1', 'localhost'), '--login', 'shot_b3', '--games', '1', '--switch', '0.1'], { cwd: repo, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { const v = await call('/api/room', null, A.token); if (v.room && v.room.members.length === 2 && v.room.members.every(m => m.me || m.ready)) break; await sleep(250); }
  await sleep(800); await shot('02_room3_both');
  await call('/api/room/ready', { on: true }, A.token);
  await p.waitForFunction(() => __app.router.name === 'battle' && __app.router.cur.v && __app.router.cur.v.phase === 'pick', { timeout: 15000 });
  await sleep(500); await shot('03_battle3_start');
  const done = { need: false, wait: false, mid: false }; let moved = -1, sent = -1, overAt = 0;
  for (let k = 0; k < 900; k++) {
    const st = await p.evaluate(() => { const a = __app, c = a.router.cur, B = c && c.B; return { name: a.router.name, phase: c && c.v && c.v.phase, waitSend: !!(c && c.v && c.v.waitSend), turn: B && B.turn, need: B && B.need, pool: B && B.pool && B.pool.me, act: B && B.act && B.act.me, alive: B && B.team ? B.team.me.map(u => u.hp > 0) : null, kit: B && B.me ? B.me.kit.map(x => ({ id: x.id, act: x.act, cost: x.cost || 0 })) : null, shown: B && B.team ? B.team.foe.filter(u => !u.hidden).length : 0 }; });
    if (st.name !== 'battle') break;
    if (st.phase === 'pick' && moved !== st.turn) {
      if (!done.mid && st.shown >= 2) { done.mid = true; await shot('04_battle3_revealed'); }
      moved = st.turn;
      const k2 = [...st.kit].reverse().find(x => x.act === 'attack' && x.cost <= st.pool) || st.kit[0];
      await call('/api/room/move', { act: { kind: 'skill', id: k2.id }, turn: st.turn }, A.token);
    } else if (st.phase === 'need' && sent !== st.turn) {
      if (!done.need) { done.need = true; await sleep(400); await shot('05_need_sheet'); }
      sent = st.turn;
      const to = st.alive.findIndex((on, i) => on && i !== st.act);
      await call('/api/room/move', { act: { kind: 'send', to }, turn: st.turn }, A.token);
    } else if (st.phase === 'wait' && st.waitSend && !done.wait) { done.wait = true; await sleep(300); await shot('06_wait_foe_send'); }
    else if (st.phase === 'over' && !overAt) { overAt = Date.now(); await sleep(900); await shot('07_over'); }
    await sleep(250);
  }
  await p.waitForFunction(() => __app.router.name === 'result', { timeout: 20000 }).catch(() => {});
  await sleep(1200); await shot('08_result');
  console.log('본 것:', JSON.stringify(done), '· 오류', errs.length ? errs.slice(0, 5).join(' | ') : 0);
} catch (e) { console.log('실패', e); }
finally {
  try { if (browser) await browser.close(); } catch {}
  try { if (bot) bot.kill(); } catch {}
  srv.kill(); await sleep(300);
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}
