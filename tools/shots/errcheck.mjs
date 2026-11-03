// 화면 오류 찾기(2026-11-04 밤샘 — v2shots 가 '페이지 오류:'만 찍고 내용이 비어 무엇인지 몰랐음): 장면 하나를 띄워 오류 · 콘솔 오류를 스택까지 출력
//   node tools/shots/errcheck.mjs [scene=framelab] [ms=2500]
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const scene = process.argv[2] || 'framelab', wait = +(process.argv[3] || 2500);
const { srv, url } = await serve(repo);
const br = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const p = await br.newPage();
  await p.setViewport({ width: 270, height: 600, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('페이지 오류:', JSON.stringify(e && (e.message || String(e))), e && e.stack ? '\n' + e.stack.split('\n').slice(0, 6).join('\n') : ''));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.log('콘솔 오류:', m.text()); });
  await p.goto(url + `/v2/?scene=${scene}&mute=1${process.argv[4] ? '&' + process.argv[4] : ''}`, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, wait));
  console.log('끝');
} finally { await br.close(); srv.close(); }
