// 게임 화면이 그 주소에서 실제로 뜨는지(헤드리스 크롬): /v2/ 열기 → 그림·모듈 다 받고 window.__ready → 오류 · 빠진 파일 · 모듈 MIME 확인
//  실행: node cf/pagecheck.mjs <주소>   예) node cf/pagecheck.mjs https://pulloseum.getchat.workers.dev
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, '..', 'tools', 'shots', 'package.json'));
const puppeteer = require('puppeteer-core');
const BASE = (process.argv[2] || 'http://127.0.0.1:8799').replace(/\/$/, '');
const KNOWN = /favicon\.ico$|vine_wind_young\.(json|png)$|\/api\/me$/;   // 원래 없는 것(브라우저 기본 아이콘 · 게일바인 어린 단계 그림) · 처음 화면의 로그인 확인(로그인 안 한 새 브라우저 = 401 — 2026-10-24 로그인 유지 쿠키부터 늘 물어봄) — 넘어감
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
let code = 1;
try {
  const p = await b.newPage();
  const errs = [], bad = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('response', r => { const u = r.url(); if (KNOWN.test(u)) return; if (r.status() >= 400) bad.push(`${r.status()} ${u.replace(BASE, '')}`); else if (/\.m?js$/.test(u) && !/javascript/.test(r.headers()['content-type'] || '')) bad.push(`MIME ${r.headers()['content-type']} ${u.replace(BASE, '')}`); });
  await p.setViewport({ width: 400, height: 860 });
  await p.goto(BASE + '/v2/', { waitUntil: 'load', timeout: 60000 });
  const ready = await p.waitForFunction(() => window.__ready, { timeout: 30000 }).then(h => h.jsonValue()).catch(() => null);
  console.log(`${BASE}/v2/ — 준비 ${ready ? '됨' : '안 됨'} · 빠진 그림 ${ready ? ready.missing.length : '?'} · 오류 ${errs.length} · 실패 요청 ${bad.length}`);
  for (const x of [...bad, ...errs].slice(0, 12)) console.log('  ', x);
  code = ready && !ready.missing.length && !errs.length && !bad.length ? 0 : 1;
} finally { await b.close(); }
process.exit(code);
