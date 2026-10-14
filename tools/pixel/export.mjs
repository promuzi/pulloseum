// 도트 스프라이트 내보내기: sprites-data.js 레시피 → 렌더러 v2 → assets/sprites/<key>.png + tools/pixel/out/
// 사용: node tools/pixel/export.mjs            (전부 내보내고 검토용 sheet.png 생성)
//       node tools/pixel/export.mjs --check    (파일은 안 쓰고 기존 PNG와 바이트 비교만)
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../shots/static-server.mjs';
const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../shots/package.json'));
const puppeteer = require('puppeteer-core');

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const check = process.argv.includes('--check');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));

const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  p.on('pageerror', e => console.error('[pageerror]', e.message));
  await p.goto(url + '/tools/pixel/export.html', { waitUntil: 'load' });
  const all = await p.evaluate(() => window.__export());
  mkdirSync(resolve(here, 'out'), { recursive: true });
  const report = [];
  for (const [k, dataUrl] of Object.entries(all)) {
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    const dst = resolve(repo, 'assets', 'sprites', k + '.png');
    const same = existsSync(dst) && Buffer.compare(readFileSync(dst), buf) === 0;
    report.push(`${k.padEnd(14)} ${existsSync(dst) ? (same ? '같음' : '바뀜') : '새로'}`);
    if (!check) { writeFileSync(dst, buf); writeFileSync(resolve(here, 'out', `v2_${k}_48x56.png`), buf); }
  }
  console.log(report.join('\n'));
  if (!check) {
    const keys = Object.keys(all).filter(k => !k.startsWith('pot_'));
    const sheet = await p.evaluate((keys) => window.__sheet(keys, 3), keys);
    writeFileSync(resolve(here, 'out', 'sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
    console.log('sheet →', resolve(here, 'out', 'sheet.png'));
  }
} finally { await b.close(); srv.close(); }
