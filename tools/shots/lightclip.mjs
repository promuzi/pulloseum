// 식물 빛 전후 영상(2026-10-22 사용자 "전투중에는 어때? 티가나?"): 같은 순간을 빛 끔 | 켬 으로 나란히 → MP4
//   node tools/shots/lightclip.mjs  → tools/shots/out/lightclip/battle_light.mp4 + 맞는 순간 정지 장(clip_<n>.png)
//  장면 = 낮 경기장 불덩이(엠버캑터) · 낮 번개(스파크번) · 밤 경기장 불덩이 — 공격 한 번(시작 전 → 맞음 → 끝)을 50ms 간격으로 찍음
//  촬영 땐 계산 예산을 풀어(장마다 제대로 다시 칠함) 게임에서 느린 폰이 직전 결과를 빌려 쓰는 경우는 영상에 안 나옴
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
import { decodePNG, encodePNG, Img } from '../pixel/big/engine.mjs';
import { writeMP4 } from '../pixel/big/video.mjs';
const here = dirname(fileURLToPath(import.meta.url)), require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..'), OUT = resolve(here, 'out', 'lightclip'); mkdirSync(OUT, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const CLIPS = [
  { phase: 'hit', venue: 'colosseum', me: 'cactus_fire', use: 'f_ember' },
  { phase: 'hit', venue: 'colosseum', me: 'spark', use: 'b_bolt' },
  { phase: 'hit', venue: 'night', me: 'cactus_fire', use: 'f_ember' },
];
const STEPS = 56, S = 2, CROP = [0, 30, 270, 320];   // 논리 칸(경기장만 — 아래 카드 줄은 뺌)
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
async function shoot(q) {
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
  await p.goto(url + '/v2/index.html' + q, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  await p.evaluate(() => { if (window.__light) window.__light.budget = 1e9; });
  const out = [];
  for (const C of CLIPS) {
    const row = [];
    for (let k = 0; k < STEPS; k++) {
      const data = await p.evaluate((params, opt) => window.__shot('battle', params, opt), { ...C, hitAt: String(-1500 + k * 50) }, { scale: S, t: 1000 + k * 50 });
      row.push(decodePNG(Buffer.from(data.split(',')[1], 'base64')));
    }
    out.push(row);
  }
  await p.close();
  return out;
}
try {
  const off = await shoot('?light=0'), on = await shoot('');
  const [cx, cy, cw, ch] = CROP.map(v => v * S), GAP = 8, OW = cw * 2 + GAP, OH = ch, frames = [];
  const put = (o, im, x0) => { for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const s = ((cy + y) * im.w + cx + x) * 4, d = (y * OW + x0 + x) * 4; o.data[d] = im.data[s]; o.data[d + 1] = im.data[s + 1]; o.data[d + 2] = im.data[s + 2]; o.data[d + 3] = 255; } };
  // 얼마나 티 나나: 장마다 끔 · 켬에서 밝기(0~255)가 4 넘게 다른 칸 수와 그 칸들의 평균 밝기 차
  const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  CLIPS.forEach((C, j) => {
    const st = [];
    for (let k = 0; k < STEPS; k++) {
      const A = off[j][k], B = on[j][k]; let n = 0, s = 0;
      for (let y = cy; y < cy + ch; y++) for (let x = cx; x < cx + cw; x++) { const i = (y * A.w + x) * 4, d = lum(B.data, i) - lum(A.data, i); if (Math.abs(d) > 4) { n++; s += d; } }
      st.push([n, n ? s / n : 0]);
    }
    const peak = st.reduce((a, q, k) => (q[0] > st[a][0] ? k : a), 0), avgN = st.reduce((a, q) => a + q[0], 0) / STEPS;
    console.log(`${C.venue} ${C.me} ${C.use}: 달라진 칸 평균 ${avgN.toFixed(0)}칸(화면 ${((avgN / (cw * ch)) * 100).toFixed(1)}%) · 가장 많은 장 ${peak} = ${st[peak][0]}칸 · 그 칸들 밝기 차 평균 ${st[peak][1].toFixed(1)}/255`);
  });
  CLIPS.forEach((C, j) => {
    for (let k = 0; k < STEPS; k++) { const o = new Img(OW, OH, '#000000'); put(o, off[j][k], 0); put(o, on[j][k], cw + GAP); frames.push(o); }
    const mid = frames[frames.length - STEPS + 33];   // 맞는 순간 언저리
    writeFileSync(resolve(OUT, `clip_${j + 1}.png`), encodePNG(mid.w, mid.h, mid.data));
  });
  writeMP4(resolve(OUT, 'battle_light.mp4'), frames, { delay: 5 });
  console.log('→', resolve(OUT, 'battle_light.mp4'));
} finally { await b.close(); srv.close(); }
