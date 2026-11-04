// 카드 앞면 이름 점검(2026-11-04 379 — 속성 테로 테 있는 카드가 늘며 이름 칸이 6칸 좁아짐 · 383부터 패시브 카드도): 모든 기술 · 패시브 카드 앞면을 손패 크기(66 · 한 줄 넷 62)로 그리며
//  이름 줄을 모아 잘림(두 줄에 다 안 들어가 글자가 빠짐) · 낱말 가운데 끊김(띄어쓰기 아닌 곳에서 줄바꿈)을 셈
// node tools/shots/nameaudit.mjs [--list]   — 카드 테 · 이름 칸(art/skillcard.js nameLines · frames.js)을 바꾼 뒤 돌림(잘림 = 0이 기준)
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
    const SC = await import('/v2/src/art/skillcard.js'), { SKILLS } = await import('/v2/src/game/catalog.js'), { BASICS } = await import('/v2/src/battle/model.js'), { Gfx } = await import('/v2/src/core/gfx.js'), FR = await import('/v2/src/art/frames.js');
    const CD = await import('/v2/src/game/cards.js'), PAS = Object.keys(CD.CARDS).map(id => CD.cardFace(id)).filter(s => s && s.passive);   // 패시브 카드(일반 · 변이 — 383 세포 테부터 테 있음)
    const rec = [], orig = Gfx.prototype.text;
    Gfx.prototype.text = function (s, x, y, o) { rec.push({ s: String(s), y, o: o || {} }); return orig.call(this, s, x, y, o); };
    const cv = document.createElement('canvas'); cv.width = 80; cv.height = 100;
    const G = new Gfx(cv.getContext('2d')), out = { n: 0, framed: 0, cut: [], mid: [] };
    for (const sk of [...BASICS, ...Object.values(SKILLS), ...PAS]) {
      if (!sk || !sk.name) continue;
      out.n++;
      if (FR.hasFrame(sk)) out.framed++;
      for (const w of [66, 62]) {
        rec.length = 0;
        SC.cardFront(G, 0, 0, w, 90, sk, { can: true });
        const lines = rec.filter(r => r.y > 40 && r.o.align === 'center' && !/^\+\d$/.test(r.s)).map(r => r.s), name = SC.faceName(sk).trim();   // 앞면 이름(강화 패시브는 '+1' 뺀 이름) · 아래 테 '+1' 표식 글자는 이름 줄이 아님
        const tag = `${sk.name}(${sk.id} · ${w}칸${FR.hasFrame(sk) ? ' · 테' : ''}) = ${lines.join(' / ')}`;
        if (lines.join('').replace(/\s/g, '') !== name.replace(/\s/g, '')) out.cut.push(tag);
        else if (lines.length > 1 && lines.join(' ') !== name) out.mid.push(tag);
      }
    }
    Gfx.prototype.text = orig;
    return out;
  });
  console.log(`카드 ${d.n}장(테 ${d.framed}) · 손패 66칸 · 한 줄 넷 62칸 · 잘림 ${d.cut.length} · 낱말 가운데 끊김 ${d.mid.length}`);
  if (process.argv.includes('--list') || d.cut.length) for (const s of d.cut) console.log('  잘림', s);
  if (process.argv.includes('--list')) for (const s of d.mid) console.log('  끊김', s);
  bad = d.cut.length + errs.length;
  for (const e of errs) console.log('  오류', e);
} finally {
  await b.close(); srv.close();
}
process.exit(bad ? 1 : 0);
