// 맞는 순간 멈춤 끔 | 켬 나란히 영상(2026-11-04 사용자 '3번은 보여줘 보고 결정할게' — battle.js HOLD_F · ?hitstop=1)
//  같은 전투를 맞기 0.3초 전 ~ 0.7초 뒤까지 25ms마다 찍어(끔 · 켬) 경기장만 잘라 나란히 → 보통 빠르기 한 번 + 절반 빠르기 한 번 → MP4
//  node tools/shots/hitstopclip.mjs → tools/shots/out/hitstop/hitstop_compare.mp4
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const out = resolve(here, 'out', 'hitstop'), raw = resolve(out, 'raw'); rmSync(raw, { recursive: true, force: true }); mkdirSync(raw, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const SKILLS = [['basic', '평타'], ['f_ember', '불씨 튕기기']], MS = Array.from({ length: 41 }, (_, i) => -300 + i * 25);
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 20000 });
  for (const [sk] of SKILLS) for (const on of [0, 1]) for (const ms of MS) {
    const d = await p.evaluate((sk, ms, on) => window.__shot('battle', { phase: 'hit', venue: 'colosseum', use: sk, hitAt: String(ms), seed: '7', ...(on ? { hitstop: '1' } : {}) }, { scale: 2 }), sk, ms, on);
    writeFileSync(resolve(raw, `${sk}_${on}_${String(ms + 1000).padStart(4, '0')}.png`), Buffer.from(d.split(',')[1], 'base64'));
  }
  if (errs.length) console.log('페이지 오류:\n' + errs.join('\n'));
} finally { await b.close(); srv.close(); }
const py = 'C:/Users/soosa/AppData/Local/Programs/Python/Python312/python.exe';
const r = spawnSync(py, [resolve(here, 'hitstopclip.py'), raw, resolve(out, 'frames'), JSON.stringify(SKILLS), JSON.stringify(MS)], { encoding: 'utf8' });
console.log(r.stdout, r.stderr);
spawnSync('node', [resolve(here, 'frames2mp4.mjs'), resolve(out, 'frames'), resolve(out, 'hitstop_compare.mp4'), '20', '2'], { stdio: 'inherit' });
