// 전투 글자 연출 비교판 — 검토용 짧은 판(?demo=text)을 연출마다(지금 · ㉠~㉣) 같은 시각에 찍어 한 장으로(열 = 연출, 줄 = 순간)
//   node tools/shots/tfxsheet.mjs --keys now,a,b,c,d --at 2450,5650,12600 --crop 0,40,270,300 --scale 2 --out tfx_sheet
//   (시각 = 장면 시작부터 ms — 짧은 판은 0.6초에 시작, 기술 이름 → 숫자 · 효과 굉장 → 화상 → 치명 → 회복 → 화상 피해 → 결정타 치명 → 쓰러짐 → 승리)
//   --label 1 = 열 위에 연출 이름(지금 · ㉠ …)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const argv = process.argv.slice(2), get = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
//   줄마다 다른 자리: --rows "2450:90,24|5700:0,140" --size 180,130 (ms:왼쪽,위 — 칸 크기는 --size 하나)
const rowsArg = get('rows'), keys = (get('keys') || 'now,a,b,c,d').split(',');
const at = rowsArg ? rowsArg.split('|').map(r => +r.split(':')[0]) : (get('at') || '2450').split(',').map(Number);
const origins = rowsArg ? rowsArg.split('|').map(r => r.split(':')[1].split(',').map(Number)) : null;
const [CX, CY, CW, CH] = rowsArg ? [0, 0, ...(get('size') || '180,130').split(',').map(Number)] : (get('crop') || '0,24,270,348').split(',').map(Number), K = +(get('scale') || 2), out = get('out') || 'tfx_sheet', label = get('label') === '1';
const venue = get('venue') || 'colosseum', me = get('me'), foe = get('foe');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const png = await p.evaluate((keys, at, crop, K, label, base, cols, origins) => {
    window.__pause && window.__pause(true);
    const a = window.__app, [CX, CY, CW, CH] = crop, GAP = 6 * K, TOP = label ? 22 * K : 0;
    const V = document.createElement('canvas'); V.width = 270 * K; V.height = 600 * K;
    const ctx = V.getContext('2d'); ctx.setTransform(K, 0, 0, K, 0, 0); ctx.imageSmoothingEnabled = false;
    a.g.ctx = ctx; a.W = 270; a.H = 600; a.pxScale = K;
    // 칸 자리: 연출이 여럿이면 열 = 연출 · 줄 = 순간, 하나면 순간들을 cols 개씩 줄 바꿈
    const one = keys.length === 1, NC = one ? Math.min(cols || at.length, at.length) : keys.length, NR = one ? Math.ceil(at.length / NC) : at.length;
    const cell = (col, row) => [GAP + col * (CW * K + GAP), TOP + GAP + row * (CH * K + GAP)];
    const S = document.createElement('canvas'); S.width = NC * CW * K + (NC + 1) * GAP; S.height = TOP + NR * CH * K + (NR + 1) * GAP;
    const sc = S.getContext('2d'); sc.fillStyle = '#05070d'; sc.fillRect(0, 0, S.width, S.height);
    const NAME = { now: '지금', a: '㉠ 통통', b: '㉡ 쾅', c: '㉢ 컷인', d: '㉣ 굴림' };
    keys.forEach((key, col) => {
      a.router.set('battle', { ...base, tfx: key });
      const last = Math.max(...at);
      for (let ms = 0; ms <= last; ms += 33) {
        a.t = 1000 + ms; a.input.begin(); a.router.draw(a);
        at.forEach((m, i) => { if (ms <= m && m < ms + 33) { const [x, y] = one ? cell(i % NC, Math.floor(i / NC)) : cell(col, i), [ox, oy] = origins ? origins[i] : [CX, CY]; sc.drawImage(V, ox * K, oy * K, CW * K, CH * K, x, y, CW * K, CH * K); } });
      }
      if (label) { sc.font = `800 ${13 * K}px Pretendard, sans-serif`; sc.fillStyle = '#e6f3ff'; sc.textAlign = 'center'; sc.fillText(NAME[key] || key, GAP + col * (CW * K + GAP) + (CW * K) / 2, TOP - 6 * K); }
    });
    return S.toDataURL('image/png');
  }, keys, at, [CX, CY, CW, CH], K, label, { phase: 'pick', venue, demo: get('demo') || 'text', ...(me ? { me } : {}), ...(foe ? { foe } : {}) }, +(get('cols') || 0), origins);
  writeFileSync(resolve(outDir, out + '.png'), Buffer.from(png.split(',')[1], 'base64'));
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
  console.log('저장:', resolve(outDir, out + '.png'));
} finally { await b.close(); srv.close(); }
