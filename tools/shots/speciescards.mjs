// 한 종 고유 기술 카드 판(2026-11-05 사용자 '젤리캡 스킬 다 보여줘봐 내가 보고 아예 바꾸거나 해볼게'):
//  게임 카드 그리기(art/skillcard.js renderFaces)로 그 종 고유 기술을 생장 줄마다 [앞면 | 뒷면] 짝으로 한 장에 그리고,
//  그 종이 배울 수 있는 공통 기술(기본기 · 속성 · 종 · 가지 · 누구나)의 뒷면 글을 모아 json 으로 냄
//   node tools/shots/speciescards.mjs --key jelly_cap [--k 2]   → tools/shots/out/speciescards/<키>.png · <키>.json
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(resolve(repo, 'tools/shots/package.json')), puppeteer = require('puppeteer-core');
const { serve } = await import(pathToFileURL(resolve(repo, 'tools/shots/static-server.mjs')).href);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const argv = process.argv, arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const KEY = arg('--key'), K = +arg('--k', 2);
if (!KEY) { console.log('--key <종> 이 필요해요'); process.exit(1); }
const out = resolve(repo, 'tools/shots/out/speciescards'); mkdirSync(out, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const d = await p.evaluate(async (KEY, K) => {
    const SC = await import('/v2/src/art/skillcard.js'), CAT = await import('/v2/src/game/catalog.js'), { BASICS } = await import('/v2/src/battle/model.js'), { Gfx } = await import('/v2/src/core/gfx.js');
    await SC.loadSkillArt('/assets/v2/skills/');
    const { SKILLS, SPECIES, uniquesOf } = CAT, sp = SPECIES[KEY], W = 66, H = 90, BW = 160, BH = 218;
    // 뒷면 글 모으기(뒷면을 그리며 Gfx.text 를 엿봄)
    const orig = Gfx.prototype.text, rec = [];
    const backText = sk => { rec.length = 0; Gfx.prototype.text = function (s, x, y, o) { rec.push({ s: String(s), y }); return orig.call(this, s, x, y, o); }; SC.backHeight(sk, BW, {}); Gfx.prototype.text = orig; return rec.sort((a, c) => a.y - c.y).map(r => r.s.trim()).filter(Boolean); };
    const stages = [0, 1, 2].map(st => uniquesOf(KEY, st).filter(id => SKILLS[id]));
    const faces = stages.map(ids => ids.map(id => ({ id, ...SC.renderFaces(SKILLS[id], W, H, BW, BH, K, { can: true }) })));
    const f0 = faces.flat()[0].front, cw = f0.width, ch = f0.height, gap = Math.round(10 * K), pairGap = Math.round(26 * K), lab = Math.round(30 * K);
    const cols = Math.max(...faces.map(r => r.length)), Wd = gap + cols * (2 * cw + gap + pairGap) - pairGap + gap, Ht = faces.length * (lab + ch + gap) + gap;
    const cv = document.createElement('canvas'); cv.width = Wd; cv.height = Ht;
    const c = cv.getContext('2d'); c.fillStyle = '#151a24'; c.fillRect(0, 0, Wd, Ht); c.imageSmoothingEnabled = false;
    const NAMES = ['새싹', '성장기', '성체'];
    faces.forEach((row, ri) => {
      const y0 = gap + ri * (lab + ch + gap);
      c.fillStyle = '#cfe8ff'; c.font = `bold ${Math.round(16 * K)}px Pretendard, sans-serif`; c.textBaseline = 'top'; c.fillText(NAMES[ri], gap + Math.round(4 * K), y0 + Math.round(6 * K));
      row.forEach((f, ci) => { const x = gap + ci * (2 * cw + gap + pairGap); c.drawImage(f.front, x, y0 + lab); c.drawImage(f.back, x + cw + gap, y0 + lab); });
    });
    // 배울 수 있는 공통 기술(logic.js 배울 기술 거르기와 같은 조건) + 기본기
    const fit = Object.values(SKILLS).filter(x => x.tier !== 'u' && (x.tier === 's' || x.el === sp.el || x.jong === sp.type || (x.tier === 'g' && x.branch === sp.branch)));
    const info = sk => ({ id: sk.id, name: sk.name, tier: sk.tier, el: sk.el || null, jong: sk.jong || null, power: sk.power || 0, cost: sk.cost || 0, back: backText(sk) });
    return { png: cv.toDataURL('image/png'), sp: { name: sp.name, type: sp.type, el: sp.el, branch: sp.branch, role: sp.role }, uniques: stages.map(ids => ids.map(id => info(SKILLS[id]))), basics: BASICS.map(info), commons: fit.map(info) };
  }, KEY, K);
  writeFileSync(resolve(out, `${KEY}.png`), Buffer.from(d.png.split(',')[1], 'base64'));
  delete d.png;
  writeFileSync(resolve(out, `${KEY}.json`), JSON.stringify(d, null, 1));
  console.log('썼어요:', resolve(out, `${KEY}.png`), '·', resolve(out, `${KEY}.json`), errs.length ? `페이지 오류 ${errs.join(' / ')}` : '');
} finally { await b.close(); srv.close(); }
