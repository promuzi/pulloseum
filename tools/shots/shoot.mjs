// 풀로세움 화면 스크린샷 도구 (헤드리스 크롬, 375×812)
// 사용: node tools/shots/shoot.mjs --label before   → tools/shots/out/before/NN_scene.png
//       --url 로 서버 주소 지정 가능(기본 file://index.html). --scale 2 로 2배 캡처.
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const label = args.label || 'shot';
const url = args.url || pathToFileURL(resolve(repo, 'index.html')).href;
const scale = +(args.scale || 1);
const only = args.only ? String(args.only).split(',') : null;
const out = resolve(here, 'out', label);
mkdirSync(out, { recursive: true });

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
if (!CHROME) throw new Error('chrome.exe not found');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clickText = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === t && e.offsetParent); if (b) { b.click(); return true; } return false; }, text);
const nav = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll('button, [class*=nav] *')].find(e => e.textContent.trim() === t); if (b) { b.click(); return true; } return false; }, text);

/* 장면 정의: 앞 장면의 상태를 이어받는다 */
const SCENES = [
  { id: '01_title', run: async p => {} },
  { id: '02_main_empty', run: async p => { await p.click('#btnStart'); await sleep(1200); } },
  { id: '03_seedbag', run: async p => { await p.click('#centerPlant'); await sleep(900); } },
  { id: '04_plant_confirm', run: async p => { await clickText(p, '심기'); await sleep(900); } },
  { id: '05_after_plant', run: async p => { await clickText(p, '심기 확정'); await sleep(1800); } },
  { id: '06_main_plant', run: async p => { await p.evaluate(() => { const x = document.querySelector('#upgradeModal .pm-close, #upgradeModal [class*=close]'); if (x && x.offsetParent) x.click(); window.scrollTo(0, 0); }); await sleep(700); } },
  { id: '07_upgrade', run: async p => { await p.click('#centerPlant'); await sleep(900); } },
  { id: '08_shop', run: async p => { await p.evaluate(() => { const x = document.querySelector('#upgradeModal .pm-close, #upgradeModal [class*=close]'); if (x && x.offsetParent) x.click(); }); await nav(p, '상점'); await sleep(1200); await p.evaluate(() => window.scrollTo(0, 0)); } },
  { id: '09_explore', run: async p => { await nav(p, '탐사'); await sleep(1200); } },
  { id: '10_nursery', run: async p => { await nav(p, '식물양육'); await sleep(1200); } },
  { id: '11_ship', run: async p => { await nav(p, '함선'); await sleep(1200); } },
  { id: '12_battle_start', run: async p => { await nav(p, '식물·전투'); await sleep(800); await p.evaluate(() => { try { startBattle(); } catch (e) {} }); await sleep(4200); } },
  { id: '13_battle_judge', run: async p => { await p.evaluate(() => { const c = [...document.querySelectorAll('.skillcard')].filter(e => e.offsetParent)[0]; if (c) c.click(); }); await sleep(2600); } },
  { id: '14_battle_after', run: async p => { await sleep(2500); } },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files', '--disable-web-security', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: scale, isMobile: true, hasTouch: true });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'load' });
await sleep(1500);

for (const s of SCENES) {
  try { await s.run(page); } catch (e) { console.error(`[${s.id}] step error:`, e.message); }
  if (only && !only.includes(s.id)) continue;
  const file = resolve(out, `${s.id}.png`);
  await page.screenshot({ path: file });
  console.log('saved', file);
}
await browser.close();
