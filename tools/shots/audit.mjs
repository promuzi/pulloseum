// 가독성·히트 영역 실측 도구 (헤드리스 크롬 375×812)
// 사용: node tools/shots/audit.mjs --label before  → tools/shots/out/<label>/audit.json + 콘솔 표
// 장면 순서는 shoot.mjs와 같다(앞 장면 상태를 이어받음). 측정 항목:
//   text<12 : 보이는 텍스트 노드 중 computed font-size < 12px 인 것(개수/전체)
//   tap<44 / tap<48 : 보이는 클릭 가능 요소(button·a·[onclick]·cursor:pointer·data-*) 중 한 변이 44/48 미만
//   pixelFont : Galmuri11 이 실제 로드됐는지(document.fonts.check)
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const label = args.label || 'audit';
const url = args.url || pathToFileURL(resolve(repo, 'index.html')).href;
const out = resolve(here, 'out', label); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clickText = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === t && e.offsetParent); if (b) { b.click(); return true; } return false; }, text);
const nav = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll('button, [class*=nav] *')].find(e => e.textContent.trim() === t); if (b) { b.click(); return true; } return false; }, text);

const SCENES = [
  { id: '02_main_empty', run: async p => { await p.click('#btnStart'); await sleep(1200); } },
  { id: '03_seedbag', run: async p => { await p.click('#centerPlant'); await sleep(900); } },
  { id: '06_main_plant', run: async p => { await clickText(p, '심기'); await sleep(1500); await clickText(p, '심기 확정'); await sleep(1200); await p.evaluate(() => { const x = document.querySelector('#upgradeModal .pm-close, #upgradeModal [class*=close]'); if (x && x.offsetParent) x.click(); }); await sleep(500); } },
  { id: '07_upgrade', run: async p => { await p.click('#centerPlant'); await sleep(900); } },
  { id: '08_shop', run: async p => { await p.evaluate(() => { const x = document.querySelector('#upgradeModal .pm-close, #upgradeModal [class*=close]'); if (x && x.offsetParent) x.click(); }); await nav(p, '상점'); await sleep(1000); } },
  { id: '09_explore', run: async p => { await nav(p, '탐사'); await sleep(1000); } },
  { id: '10_nursery', run: async p => { await nav(p, '식물양육'); await sleep(1000); } },
  { id: '11_ship', run: async p => { await nav(p, '함선'); await sleep(1000); } },
  { id: '12_battle', run: async p => { await nav(p, '식물·전투'); await sleep(600); await p.evaluate(() => { try { startBattle(); } catch (e) {} }); await sleep(4200); } },
];

const MEASURE = () => {
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  // 최상위 보이는 레이어: 열린 모달이 있으면 그 안만, 아니면 문서 전체(가려진 배경은 제외)
  const topAt = el => { const r = el.getBoundingClientRect(); const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)); const t = document.elementFromPoint(x, y); return t && (t === el || el.contains(t) || t.contains(el)); };
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = walker.nextNode())) { const s = n.textContent.replace(/\s+/g, ' ').trim(); if (!s) continue; const el = n.parentElement; if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue; if (!vis(el) || !topAt(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); texts.push({ s: s.slice(0, 24), fs: +fs.toFixed(1), sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') }); }
  const cand = [...document.querySelectorAll('button, a[href], [onclick], [role=button], input, select, [data-plant-seed], [data-matches], [data-mission], [data-league-team], .chip, .navbtn, .skillcard, .slot, .dcard')];
  const taps = [];
  for (const el of cand) { if (!vis(el) || !topAt(el)) continue; if (cand.some(o => o !== el && o.contains(el) && vis(o))) { /* 부모도 후보면 자식은 제외하지 않음: 실제 탭 대상은 자식 */ } const r = el.getBoundingClientRect(); taps.push({ w: Math.round(r.width), h: Math.round(r.height), sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), t: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 14) }); }
  const small = texts.filter(t => t.fs < 12), tiny = texts.filter(t => t.fs < 10);
  const t44 = taps.filter(t => t.w < 44 || t.h < 44), t48 = taps.filter(t => t.w < 48 || t.h < 48);
  const hist = {}; texts.forEach(t => { const k = Math.floor(t.fs); hist[k] = (hist[k] || 0) + 1; });
  return { texts: texts.length, textLt12: small.length, textLt10: tiny.length, taps: taps.length, tapLt44: t44.length, tapLt48: t48.length, pixelFont: [...document.fonts].some(f => /Galmuri11/i.test(f.family) && f.status === 'loaded'), hist, smallSamples: small.slice(0, 12), tapSamples: t44.slice(0, 12) };
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files', '--disable-web-security', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'load' }); await sleep(1500);
const result = {};
for (const s of SCENES) {
  try { await s.run(page); } catch (e) { console.error(`[${s.id}]`, e.message); }
  result[s.id] = await page.evaluate(MEASURE);
}
await browser.close();
writeFileSync(resolve(out, 'audit.json'), JSON.stringify(result, null, 1));
console.log('scene            texts  <12  <10 | taps  <44  <48 | pixelFont');
for (const [id, r] of Object.entries(result)) console.log(id.padEnd(16), String(r.texts).padStart(5), String(r.textLt12).padStart(4), String(r.textLt10).padStart(4), '|', String(r.taps).padStart(4), String(r.tapLt44).padStart(4), String(r.tapLt48).padStart(4), '|', r.pixelFont);
console.log('saved', resolve(out, 'audit.json'));
