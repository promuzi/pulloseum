// 꾹 = 물 이어 주기(2026-11-04 사용자 '물주기만 주고 꾹 누르면 연속으로 주는게 가능'): 화면은 한 번씩 바로 주고 서버엔 모아서(n개) 보냄 —
//  진짜 PC 서버(임시 DB)에 가입한 판으로 식물 관리 물 단추를 꾹 눌렀다 뗀 뒤, 서버에 남은 물 · 식물 레벨 · 생장치가 화면과 같은지 · 요청 수가 준 물보다 훨씬 적은지
//   node tools/test/pour.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(repo, 'tools/shots/package.json'));
const puppeteer = require('puppeteer-core');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const PORT = 19000 + Math.floor(Math.random() * 900), BASE = `http://127.0.0.1:${PORT}`, dir = mkdtempSync(join(tmpdir(), 'pullo-pour-'));
const srv = spawn(process.execPath, ['--no-warnings', 'server/index.mjs', '--port', String(PORT), '--db', join(dir, 't.db')], { cwd: repo, stdio: 'ignore' });
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const call = async (path, body, token) => { const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return r.json(); };
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/api/config'); break; } catch { await sleep(200); } }
  const reg = await call('/api/register', { age14: true, login: 'pour' + Math.floor(Math.random() * 1e6), password: 'pw123456', nickname: '물주기', starter: 'flower_grass' });
  ok(reg.token, '가입');
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let acts = 0; p.on('request', r => { if (r.url().endsWith('/api/act')) acts++; });
  await p.evaluateOnNewDocument(t => { try { localStorage.setItem('pullo.token', t); } catch {} }, reg.token);
  await p.setViewport({ width: 270, height: 600 });
  await p.goto(BASE + '/v2/index.html?noguide', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__app && window.__app.state && window.__app.user, { timeout: 20000 });
  const E = (fn, ...a) => p.evaluate(fn, ...a);
  const adv = ms => E(ms => window.__advance(ms), ms);
  await E(() => window.__app.router.set('plant', { tab: 'skill' }));
  await adv(900);
  const w0 = await E(() => window.__app.state.items.water);
  ok(w0 >= 10, `처음 물 ${w0}`);
  // 꾹: 손가락을 물 단추에 내려 둔 채(0.35초 넘김) — 화면 시각은 __advance, 모아 보내기(0.5초)는 진짜 시계라 진짜로도 기다림
  ok(await E(() => { const A = window.__app, r = A.input.regions.filter(x => x.id === 'pl_w').pop(); if (!r) return false; A.input.down = { x: r.x + 5, y: r.y + 5, id: 'pl_w', x0: r.x + 5, y0: r.y + 5, moved: false, held: false, t0: performance.now() - 400, hist: [] }; return true; }), '물 단추(pl_w)');
  for (let k = 0; k < 10; k++) { await adv(300); await sleep(150); }
  await E(() => { window.__app.input.down = null; window.__app.input.pressedId = null; });
  await adv(100);
  await E(() => window.__app.settle());
  await sleep(300);
  const loc = await E(() => { const s = window.__app.state, pl = s.plants[s.active || 0]; return { w: s.items.water, lv: pl.lv, gxp: pl.gxp, uid: pl.uid }; });
  ok(loc.w < w0, `화면에서 물이 줄어듦(${w0} → ${loc.w})`);
  const me = await call('/api/me', null, reg.token), sp = me.state.plants.find(x => x.uid === loc.uid);
  ok(me.state.items.water === loc.w && sp.lv === loc.lv && sp.gxp === loc.gxp, `서버 = 화면(물 ${me.state.items.water}/${loc.w} · Lv ${sp.lv}/${loc.lv} · 생장 ${sp.gxp}/${loc.gxp})`);
  ok(acts > 0 && acts < (w0 - loc.w), `서버 요청 ${acts}번 < 준 물 ${w0 - loc.w}개(모아 보냄)`);
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
} catch (e) { fails++; console.log('오류', e); }
finally { await b.close(); srv.kill(); try { rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(fails ? `물 꾹 시험 ${n - fails}/${n} 통과` : `물 꾹 시험 ${n}개 통과`);
process.exitCode = fails ? 1 : 0;
