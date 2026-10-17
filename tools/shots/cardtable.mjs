// 기술 · 변이 표 이미지(2026-10-18 사용자 "스킬과 변이에 관한 표를 이미지 파일로"): tools/shots/cardtable.html 이 게임 표(catalog · cards · matchup)를 읽어 장마다 그림 → out/cardtable/NN.png
//   node tools/shots/cardtable.mjs [--page plantsheet]   (표를 고치면 다시 돌림 — 그림은 저장소에 안 넣음) · plantsheet = 식물 그림 + 컨셉 한 줄(2026-10-18)
import { createRequire } from 'node:module';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const ai = process.argv.indexOf('--page'), page = ai > 0 ? process.argv[ai + 1] : 'cardtable';
const out = resolve(here, 'out', page); rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const br = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const p = await br.newPage();
  await p.setViewport({ width: 800, height: 1200, deviceScaleFactor: 1.35 });
  p.on('pageerror', e => console.log('페이지 오류:', e.message));
  await p.goto(url + `/tools/shots/${page}.html`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready > 0, { timeout: 30000 });
  const els = await p.$$('.sheet');
  for (let i = 0; i < els.length; i++) { await els[i].screenshot({ path: resolve(out, `${String(i + 1).padStart(2, '0')}.png`) }); console.log(String(i + 1).padStart(2, '0'), await els[i].$eval('h1', h => h.textContent)); }
  console.log(`장 ${els.length} → ${out}`);
} finally { await br.close(); srv.close(); }
