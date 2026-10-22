// 색 변종 검토판 촬영(2026-10-22): 게임을 띄워 window.__shinyBoard 로 종마다 원본 · 후보 A · B · C 를 그림 → tools/pixel/big/out/shiny/board_<n>.png
//  (사용자가 고르는 판이라 저장소에 넣음 — 다른 기기에서도 봄)
// 사용: node tools/shots/shinyboard.mjs [--per 9] [--scale 2] [--stage young|teen] [키…]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..');
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const per = +(opt('per') || 9), scale = +(opt('scale') || 2), stage = opt('stage') || '';
const roster = eval(readFileSync(resolve(repo, 'v2', 'src', 'art', 'sprites.js'), 'utf8').match(/export const ROSTER = (\[[^\]]*\])/)[1]);
const picked = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--'))), keys = picked.length ? picked : roster;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const out = resolve(repo, 'tools', 'pixel', 'big', 'out', 'shiny'); mkdirSync(out, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 30000 });
  for (let i = 0; i * per < keys.length; i++) {
    const part = keys.slice(i * per, (i + 1) * per), data = await p.evaluate((ks, s, st) => window.__shinyBoard(ks, s, st), part, scale, stage);
    const f = resolve(out, `board${stage ? '_' + stage : ''}_${i + 1}.png`);
    writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
    console.log(f, part.join(' '));
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
} finally { await b.close(); srv.close(); }
