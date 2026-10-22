// 스마트팜 하루 보기(2026-10-22 사용자 "스마트팜은 현실 시간에 따라 아침 낮 노을 밤"): 시각마다 스마트팜을 찍어
//   node tools/shots/farmday.mjs  → tools/shots/out/farmday/day4.png(아침 · 낮 · 노을 · 밤) + day.mp4(하루 0시 → 24시)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
import { decodePNG, encodePNG, Img } from '../pixel/big/engine.mjs';
import { writeMP4 } from '../pixel/big/video.mjs';
const here = dirname(fileURLToPath(import.meta.url)), require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..'), OUT = resolve(here, 'out', 'farmday'); mkdirSync(OUT, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const PLANTS = [['cactus_fire', '엠버캑터'], ['spark', '스파크번'], ['lantern_vine', '초롱바인'], ['gaia', '가이아록'], ['flower_grass', '페탈로즈'], ['wizard_bell', '위저드벨']].map(([key, name]) => ({ key, name, stage: 4 }));   // 스스로 빛나는 종을 섞어 심음
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
  await p.goto(url + '/v2/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate(() => { if (window.__light) window.__light.budget = 1e9; });
  const shot = async (hour, t) => decodePNG(Buffer.from((await p.evaluate((hour, t, plants) => window.__shot('nursery', { hour: String(hour) }, { scale: 2, t, plants }), hour, t, PLANTS)).split(',')[1], 'base64'));
  // 네 시각 한 장(위 경기장 · 아래 판 빼고 방만)
  const CY = [0, 410].map(v => v * 2), four = [];
  for (const h of [6.6, 12, 17.9, 22]) four.push(await shot(h, 1000));
  const w = four[0].w, ch = CY[1] - CY[0], o = new Img(w * 4 + 18, ch, '#000000');
  four.forEach((im, j) => { for (let y = 0; y < ch; y++) for (let x = 0; x < w; x++) { const s = ((CY[0] + y) * im.w + x) * 4, d = (y * o.w + j * (w + 6) + x) * 4; o.data[d] = im.data[s]; o.data[d + 1] = im.data[s + 1]; o.data[d + 2] = im.data[s + 2]; o.data[d + 3] = 255; } });
  writeFileSync(resolve(OUT, 'day4.png'), encodePNG(o.w, o.h, o.data)); console.log('→', resolve(OUT, 'day4.png'));
  // 하루 영상: 0시 → 24시를 240장(장마다 6분 · 1초 20장 = 12초), 식물 숨쉬기는 그대로
  const frames = [];
  for (let k = 0; k < 240; k++) {
    const im = await shot((k * 0.1) % 24, 1000 + k * 50), f = new Img(w, ch, '#000000');
    for (let y = 0; y < ch; y++) for (let x = 0; x < w; x++) { const s = ((CY[0] + y) * im.w + x) * 4, d = (y * w + x) * 4; f.data[d] = im.data[s]; f.data[d + 1] = im.data[s + 1]; f.data[d + 2] = im.data[s + 2]; f.data[d + 3] = 255; }
    frames.push(f);
  }
  writeMP4(resolve(OUT, 'day.mp4'), frames, { delay: 5 });
} finally { await b.close(); srv.close(); }
