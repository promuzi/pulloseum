// 카드 테 시안 비교판(2026-10-29 밤샘 — 설계 = docs/superpowers/specs/2026-10-29-v2-card-frame-design.md): 하는 일 다섯 묶음마다 견본 카드를 실제 앞면 그림(renderFront)으로
//  시안마다 한 판(줄 = 묶음 · 칸 = 견본) + 손패 여섯 장 비교 한 줄 → <출력 폴더>/frames_<시안>.png · hand_compare.png
// node tools/shots/cardframes.mjs <출력 폴더> [시안들 = 0,a,b]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), U = p => pathToFileURL(resolve(repo, p)).href;
const require = createRequire(resolve(repo, 'tools/shots/package.json'));
const puppeteer = require('puppeteer-core');
const { serve } = await import(U('tools/shots/static-server.mjs'));
const out = process.argv[2], styles = (process.argv[3] || '0,a,b').split(',');
mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
// 묶음마다 견본(속성 · 등급이 섞이게)
const ROWS = [
  ['atk', ['basic', 'f_ball', 'u_blade_2', 'u_toxi_2', 'u_frost_2', 'm_bite']],
  ['stance', ['guard', 'evade', 'u_blade_2b', 'u_jelly_1', 'u_volt_1', 'u_thorn_3']],
  ['self', ['sun', 'f_rage', 'u_aqua_1', 'u_spore_1', 'u_draco_2b', 'u_petal_3c']],
  ['hex', ['u_blade_3', 'u_fang_2', 'u_volt_3', 'u_aqua_3', 'u_gale_1', 'u_fang_3b']],
  ['field', ['u_blade_1', 'u_frost_1', 'u_toxi_2b', 'u_thorn_1', 'u_stone_2', 'u_gale_3']],
];
const HAND = ['basic', 'guard', 'sun', 'u_blade_3', 'u_blade_1', 'u_blade_2'];
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const res = await p.evaluate(async (styles, ROWS, HAND) => {
    const SC = await import('/v2/src/art/skillcard.js'), { SKILLS } = await import('/v2/src/game/catalog.js'), { BASICS } = await import('/v2/src/battle/model.js');
    await SC.loadSkillArt('/assets/v2/skills/');
    const skOf = id => SKILLS[id] || BASICS.find(x => x.id === id) || null, K = 2, CW = 66, CH = 90, GAP = 8, LW = 76;
    const sheet = (style, rows) => {
      SC.setFrameStyle(style);
      const cols = Math.max(...rows.map(r => r[1].length)), cv = document.createElement('canvas');
      cv.width = (LW + cols * (CW + GAP)) * K; cv.height = (rows.length * (CH + GAP + 4) + 26) * K;
      const c = cv.getContext('2d'); c.fillStyle = '#0e1220'; c.fillRect(0, 0, cv.width, cv.height);
      c.fillStyle = '#e6eeff'; c.font = `bold ${13 * K}px sans-serif`; c.fillText(style === '0' ? '지금' : `시안 ${style === 'a' ? '㉠' : style === 'b' ? '㉡' : '㉢'}`, 6 * K, 17 * K);
      rows.forEach(([kind, ids], r) => {
        const y = 26 + r * (CH + GAP + 4);
        if (kind) { c.fillStyle = '#a9cdf0'; c.font = `bold ${12 * K}px sans-serif`; c.fillText(SC.KIND_NAME[kind], 6 * K, (y + CH / 2) * K); }
        ids.forEach((id, i) => { const sk = skOf(id); if (!sk) return; const fc = SC.renderFront(sk, CW, CH, K, { can: true }); c.drawImage(fc, (LW + i * (CW + GAP)) * K, y * K); });
      });
      return cv.toDataURL('image/png');
    };
    const out = {};
    for (const s of styles) out['frames_' + s] = sheet(s, ROWS);
    // 손패 비교: 시안마다 한 줄
    const cv = document.createElement('canvas'), CWh = 66, rowsN = styles.length; cv.width = (LW + HAND.length * (CWh + 4)) * K; cv.height = (rowsN * (CH + 10) + 8) * K;
    const c = cv.getContext('2d'); c.fillStyle = '#0e1220'; c.fillRect(0, 0, cv.width, cv.height);
    styles.forEach((s, r) => { SC.setFrameStyle(s); const y = 8 + r * (CH + 10); c.fillStyle = '#e6eeff'; c.font = `bold ${13 * K}px sans-serif`; c.fillText(s === '0' ? '지금' : s === 'a' ? '㉠' : s === 'b' ? '㉡' : '㉢', 8 * K, (y + CH / 2) * K);
      HAND.forEach((id, i) => { const sk = skOf(id); if (sk) c.drawImage(SC.renderFront(sk, CWh, CH, K, { can: true }), (LW + i * (CWh + 4)) * K, y * K); }); });
    out.hand_compare = cv.toDataURL('image/png');
    SC.setFrameStyle('0');
    const kinds = {}; for (const s of Object.values(SKILLS)) { const k = SC.frameKind(s); if (k) kinds[k] = (kinds[k] || 0) + 1; }
    out.__kinds = JSON.stringify(kinds);
    return out;
  }, styles, ROWS, HAND);
  for (const [k, v] of Object.entries(res)) { if (k.startsWith('__')) { console.log(k, v); continue; } writeFileSync(resolve(out, k + '.png'), Buffer.from(v.split(',')[1], 'base64')); console.log('→', k + '.png'); }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
} finally { await b.close(); srv.close(); }
