// 공격 효과 맞는 순간 줄(2026-11-05 밤샘 '우리 공격 효과 다듬기'): 기술마다 맞기 전 · 맞는 순간 · 뒤를 몇 장 찍어 한 줄로 이음 → 기술 줄을 세로로 쌓은 판 하나
//  node tools/shots/fxhit.mjs <출력 png> <종:기술,…> [--root <다른 작업 트리>] [--at -250,-100,0,50,150,300]
//  --root = 고치기 전 판(git archive HEAD v2 assets tools/pixel/big | tar -x)과 견줄 때 · 기술은 손패에 없어도 됨(?use) · 1배 그림을 2배로
//  영상: --vs <고치기 전 작업 트리> --video <out.mp4> = 기술마다 맞기 0.65초 앞 ~ 0.65초 뒤를 50ms마다 [전 | 지금] 나란히 → MP4(휴대폰용)
import { createRequire } from 'node:module';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const { serve } = await import(pathToFileURL(resolve(here, 'static-server.mjs')).href);
const argv = process.argv, opt = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const out = argv[2], list = argv[3].split(',').map(s => s.split(':')), root = opt('--root') || repo, vs = opt('--vs'), video = opt('--video');
const AT = video ? Array.from({ length: 27 }, (_, i) => -650 + i * 50) : (opt('--at') || '-250,-100,0,50,150,300').split(',').map(Number), K = 2;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const servers = [];
async function pageOf(dir) {
  const s = await serve(dir); servers.push(s.srv);
  const p = await b.newPage(); p.on('pageerror', e => console.log('페이지 오류:', e.message));
  await p.goto(s.url + '/v2/index.html?mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 20000 });
  return p;
}
const shot = (p, me, skill, ms) => p.evaluate((me, skill, ms, k) => window.__shot('battle', { phase: 'hit', venue: 'colosseum', me, foe: 'aqua', use: skill, hitAt: String(ms), seed: '7' }, { scale: k }), me, skill, String(ms), K);
try {
  const cur = await pageOf(root);
  if (video) {
    if (!vs) throw new Error('--video 는 --vs <고치기 전 작업 트리> 와 같이');
    const old = await pageOf(vs), dir = resolve(dirname(resolve(video)), '_fxhit_frames');
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    let n = 0;
    for (const [me, skill] of list) {
      for (const ms of AT) {
        const a = await shot(old, me, skill, ms), c = await shot(cur, me, skill, ms);
        const png = await cur.evaluate(async (a, c, label) => {   // [전 | 지금] — 위 무대 62%만
          const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
          const A = await load(a), C = await load(c), cw = A.width, ch = Math.round(A.height * 0.62), lab = 30;
          const cv = document.createElement('canvas'); cv.width = cw * 2 + 8; cv.height = ch + lab;
          const x = cv.getContext('2d'); x.fillStyle = '#10141c'; x.fillRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
          x.drawImage(A, 0, 0, cw, ch, 0, lab, cw, ch); x.drawImage(C, 0, 0, cw, ch, cw + 8, lab, cw, ch);
          x.fillStyle = '#e0f0ff'; x.font = 'bold 20px sans-serif'; x.fillText('전  ' + label, 10, 22); x.fillText('지금  ' + label, cw + 18, 22);
          return cv.toDataURL('image/png');
        }, a, c, `${me} · ${skill}`);
        writeFileSync(resolve(dir, `f${String(n++).padStart(5, '0')}.png`), Buffer.from(png.split(',')[1], 'base64'));
      }
      console.log(me, skill, AT.length + '장');
    }
    const { writeMP4Files } = await import(pathToFileURL(resolve(repo, 'tools/pixel/big/video.mjs')).href);
    const { decodePNG } = await import(pathToFileURL(resolve(repo, 'tools/pixel/big/engine.mjs')).href);
    const { readFileSync, readdirSync } = await import('node:fs');
    const files = readdirSync(dir).filter(f => f.endsWith('.png')).sort(), im = decodePNG(readFileSync(resolve(dir, files[0])));
    writeMP4Files(resolve(video), dir, [...files, ...files], { fps: 10, w: im.w, h: im.h, crf: 'HIGH' });   // 절반 빠르기(10장/초) · 두 바퀴
    console.log('영상 →', video);
  } else {
    const rows = [];
    for (const [me, skill] of list) {
      const shots = [];
      for (const ms of AT) shots.push(await shot(cur, me, skill, ms));
      rows.push({ me, skill, shots });
      console.log(me, skill, AT.length + '장');
    }
    const png = await cur.evaluate(async (rows, AT) => {   // 한 판으로(각 장의 위 무대 62%)
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const first = await load(rows[0].shots[0]), cw = first.width, ch = Math.round(first.height * 0.62), lab = 26;
      const cv = document.createElement('canvas'); cv.width = cw * AT.length; cv.height = rows.length * (ch + lab);
      const x = cv.getContext('2d'); x.fillStyle = '#10141c'; x.fillRect(0, 0, cv.width, cv.height); x.imageSmoothingEnabled = false;
      for (let r = 0; r < rows.length; r++) {
        x.fillStyle = '#e0f0ff'; x.font = 'bold 18px sans-serif'; x.fillText(`${rows[r].me} · ${rows[r].skill}`, 8, r * (ch + lab) + 19);
        for (let i = 0; i < AT.length; i++) {
          const im = await load(rows[r].shots[i]);
          x.drawImage(im, 0, 0, cw, ch, i * cw, r * (ch + lab) + lab, cw, ch);
          x.fillStyle = '#ffd890'; x.font = '15px sans-serif'; x.fillText(`${AT[i]}ms`, i * cw + 6, r * (ch + lab) + lab + 16);
        }
      }
      return cv.toDataURL('image/png');
    }, rows, AT);
    writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
    console.log('판 →', out);
  }
} finally { await b.close(); for (const s of servers) s.close(); }
