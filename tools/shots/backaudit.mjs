// 기술 카드 뒷면 점검(2026-10-29 CHANGELOG 352): 모든 기술 카드 뒷면(전투 꾹 누름 크기 160×218)을 그리며 글 줄을 모아
//  줄 머리 금칙(· ) % × 로 시작) · 줄 끝 여는 괄호 · 외톨이 끝줄(4글자 이하 한 줄) · 넘침(가장 작은 글자로도) · 단계별 장 수를 셈
// node tools/shots/backaudit.mjs [--list]   — 뒷면 글 · 칩 · 줄 나누기(art/skillcard.js wrapBack)를 바꾼 뒤 돌림(넘침 · 금칙 · 외톨이 = 0이 기준)
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(resolve(repo, 'tools/shots/package.json')), puppeteer = require('puppeteer-core');
const { serve } = await import(pathToFileURL(resolve(repo, 'tools/shots/static-server.mjs')).href);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
let bad = 0;
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const d = await p.evaluate(async () => {
    const SC = await import('/v2/src/art/skillcard.js'), { SKILLS } = await import('/v2/src/game/catalog.js'), { Gfx } = await import('/v2/src/core/gfx.js');
    const BW = 160, BH = 218, rec = [], orig = Gfx.prototype.text, TIERS = [{}, { small: true }, { small: true, tight: true }, { small: true, tiny: true }];
    Gfx.prototype.text = function (s, x, y, o) { rec.push({ s: String(s), x, y, f: (o && o.font) || 'body' }); return orig.call(this, s, x, y, o); };
    const out = { n: 0, tier: [0, 0, 0, 0], over: [], bad: [], orphan: [] };
    for (const id of Object.keys(SKILLS)) {
      const sk = SKILLS[id]; if (!sk || sk.passive || !sk.name) continue;
      out.n++;
      let ti = TIERS.findIndex(o => { rec.length = 0; return SC.backHeight(sk, BW, o) <= BH; });
      if (ti < 0) { ti = 3; out.over.push(`${sk.name}(${id})`); rec.length = 0; SC.backHeight(sk, BW, TIERS[3]); }
      out.tier[ti]++;
      const body = rec.filter(l => l.y >= 88 && /^body/.test(l.f));   // 설명 줄 = 큰 수 칸 아래 본문 글
      for (let i = 0; i < body.length; i++) {
        const L = body[i], s = L.s.trim(), prev = body[i - 1], next = body[i + 1];
        if (/^[·)%×,.\]]/.test(s) || /[(\[]$/.test(s)) out.bad.push(`${sk.name}: "${s}"`);
        if (prev && L.y - prev.y > 0 && L.y - prev.y <= 16 && L.x === prev.x && s.length <= 4 && (!next || next.y - L.y > 16 || next.x !== L.x)) out.orphan.push(`${sk.name}: "${prev.s}" / "${s}"`);
      }
    }
    Gfx.prototype.text = orig;
    return out;
  });
  console.log(`카드 ${d.n}장 · 보통 ${d.tier[0]} · 작은 글자 ${d.tier[1]} · 좁힘 ${d.tier[2]} · 아주 작은 글자 ${d.tier[3]} · 넘침 ${d.over.length} · 줄 머리/끝 금칙 ${d.bad.length} · 외톨이 끝줄 ${d.orphan.length}`);
  if (process.argv.includes('--list')) for (const [k, L] of [['넘침', d.over], ['금칙', d.bad], ['외톨이', d.orphan]]) if (L.length) console.log(`\n[${k}]\n` + L.join('\n'));
  bad = d.over.length + d.bad.length + d.orphan.length;
  if (errs.length) { console.log('페이지 오류', errs); bad++; }
} finally { await b.close(); srv.close(); }
process.exit(bad ? 1 : 0);
