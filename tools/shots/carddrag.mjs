// 식물 관리 카드 옮김 확인(2026-11-04 사용자 '카드 교환, 꾹 누르기, 옮기기 등 할 때 카드 전체가 화면에 안 나오면 안 되는 일이 있어 · 카드 선택과 교환의 효과?가 부드럽지 않고 자연스럽지 않아'):
//  실제 마우스(= 손가락)로 ① 장착 칸 카드를 꾹 → 다른 장착 칸에 놓기(바꿈) ② 판을 내려 반쯤 가려진 보관 칸을 꾹 → 장착 칸에 놓기 → 장면을 시간 순서로 찍어 한 장(띠)으로
//  node tools/shots/carddrag.mjs [--label carddrag]  → tools/shots/out/<label>/strip_swap.png · strip_hidden.png + 프레임들
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const label = arg('label') || 'carddrag', out = resolve(here, 'out', label); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { srv, url } = await serve(repo);
const br = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const p = await br.newPage(), errs = [];
  await p.setViewport({ width: 270, height: 600, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/?scene=plant&tab=skill&mute=1', { waitUntil: 'load' });
  await sleep(2500);
  const region = id => p.evaluate(id => { const r = window.__app.input.regions.find(q => q.id === id); return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2, top: r.y, h: r.h } : null; }, id);
  const scene = () => p.evaluate(() => { const s = window.__app.router.cur; return { drag: !!s.cardDrag, anims: Object.keys(s.anims || {}).length, scroll: s.scrollY, maxY: s.maxY, clipBot: s.clipBot }; });
  const shots = async (tag, n, gap) => { const files = []; for (let i = 0; i < n; i++) { const f = resolve(out, `${tag}_${String(i).padStart(2, '0')}.png`); await p.screenshot({ path: f }); files.push(f); await sleep(gap); } return files; };
  const drag = async (from, to, tag) => {
    await p.mouse.move(from.x, from.y); await p.mouse.down();
    await sleep(160); const a = await shots(tag + '_hold', 1, 0);
    await sleep(240); const b = await shots(tag + '_lift', 3, 40);   // 꾹(320ms) 넘김 → 떠오름
    for (let i = 1; i <= 8; i++) { await p.mouse.move(from.x + (to.x - from.x) * i / 8, from.y + (to.y - from.y) * i / 8); await sleep(30); }
    const c = await shots(tag + '_move', 1, 0);
    await p.mouse.up();
    const d = await shots(tag + '_drop', 7, 25);   // 놓은 뒤 미끄러짐
    await sleep(400); const e = await shots(tag + '_end', 1, 0);
    return [...a, ...b, ...c, ...d, ...e];
  };
  // ① 장착 칸끼리 바꿈(b0 ↔ b4)
  const b0 = await region('skc_b0'), b4 = await region('skc_b4');
  console.log('b0', b0, 'b4', b4);
  const f1 = b0 && b4 ? await drag(b0, b4, 'swap') : [];
  console.log('①', await scene());
  // ② 판을 내려 장착 둘째 줄이 판 위 끝(탭 아래)에 반쯤 가려지게 → 그 카드의 보이는 부분을 꾹 → 보관 빈칸에 놓기(해제)
  await p.evaluate(() => { window.__app.router.cur.scrollY = 150; }); await sleep(300);
  const hb = await region('skc_b4'), st = await region('skc_s1');
  console.log('가려진 장착 칸(보이는 만큼만 누름 자리)', hb, '보관 칸', st);
  const f2 = hb && st ? await drag({ x: hb.x, y: hb.top + hb.h / 2 }, st, 'hidden') : [];
  console.log('②', await scene());
  writeFileSync(resolve(out, 'frames.json'), JSON.stringify({ swap: f1, hidden: f2 }, null, 1));
  if (errs.length) console.log('페이지 오류:\n' + errs.join('\n'));
} finally { await br.close(); srv.close(); }
