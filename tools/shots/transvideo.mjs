// 화면 전환 후보를 차례로 찍어 MP4 한 편으로(홈 → 전투, 후보마다 잠깐 멈춤). 헤드리스 크롬에서 시간(app.t)을 직접 넘기며 그린다.
//   node tools/shots/transvideo.mjs [--styles shutter,doors,iris,pixel,blinds] [--from home] [--to battle] → tools/shots/out/transitions.mp4(2배)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const { decodePNG } = await import('../pixel/big/engine.mjs');
const { writeMP4 } = await import('../pixel/big/video.mjs');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const styles = String(args.styles || 'shutter,doors,iris,pixel,blinds').split(','), from = args.from || 'home', to = args.to || 'battle';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const frames = [];
try {
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate(() => { const a = window.__app; window.__vid = { cv: document.createElement('canvas') }; const V = window.__vid; V.cv.width = 270; V.cv.height = 600; V.ctx = V.cv.getContext('2d'); V.ctx.imageSmoothingEnabled = false; a.g.ctx = V.ctx; a.W = 270; a.H = 600; });
  let t = 1000;
  const grab = async () => { const u = await p.evaluate(tt => { const a = window.__app; a.t = tt; a.input.begin(); a.router.draw(a); return window.__vid.cv.toDataURL('image/png'); }, t); frames.push(decodePNG(Buffer.from(u.split(',')[1], 'base64'))); t += 33; };
  for (const st of styles) {
    await p.evaluate((from) => { window.__app.router.set(from, { venue: 'garden', seed: '11', phase: from === 'battle' ? 'pick' : undefined }); }, from);
    for (let i = 0; i < 14; i++) await grab();                                   // 잠깐 홈
    await p.evaluate((to, st, tt) => { window.__app.router.go(to, { venue: 'garden', seed: '11', phase: 'pick' }, tt, st); }, to, st, t);
    for (let i = 0; i < 30; i++) await grab();                                   // 전환 + 새 화면 조금
  }
  if (errs.length) console.log('페이지 오류:', errs.join(' | '));
} finally { await b.close(); srv.close(); }
writeMP4(resolve(outDir, 'transitions.mp4'), frames, { delay: 3.3, loops: 1, fps: 30, zoom: 2 });
console.log('장', frames.length, '· 차례', styles.join(' → '));
// 검토판: 후보마다 닫히는 중·다 닫힘·열리는 중 세 장(1배)
{
  const { Img } = await import('../pixel/big/engine.mjs');
  const { writeFileSync } = await import('node:fs');
  const per = 44, pick = [18, 21, 27], sheet = new Img(4 + pick.length * 274, 4 + styles.length * 604, '#101018');
  styles.forEach((s, r) => pick.forEach((k, c) => { const f = frames[r * per + k]; if (f) sheet.blit(f, 4 + c * 274, 4 + r * 604); }));
  writeFileSync(resolve(outDir, 'transitions_sheet.png'), sheet.png());
}
