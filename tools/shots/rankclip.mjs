// 결과 화면 대회 점수 막대 연출 영상(2026-10-23 사용자 "클로얄의 경우 승리후 트로피가 게이지바에 들어가면서 늘어나는 연출"):
//   node tools/shots/rankclip.mjs  → tools/shots/out/rankclip/rank_fx.mp4 + 장면마다 칸이 바뀐 직후 정지 장(still_<n>.png)
//  장면 = 8강 통과 +25 칸 오름 · 우승 +45 단계 오름 · 예선 탈락 −10 칸 내려감 · 4강 통과 +30(칸 그대로) · 풀로세움 우승 별 +1
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
import { decodePNG, encodePNG, Img } from '../pixel/big/engine.mjs';
import { writeMP4 } from '../pixel/big/video.mjs';
const here = dirname(fileURLToPath(import.meta.url)), require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..'), OUT = resolve(here, 'out', 'rankclip'); mkdirSync(OUT, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const T = (tier, pts, round, extra = {}) => ({ tier, name: `새싹 ${tier}`, pts, round, wins: 0, losses: 0, bestOf: ['플래티넘', '다이아', '마스터', '풀로세움'].includes(tier) ? 7 : 5, ...extra });
const CLIPS = [
  { ms: 3600, still: 1950, tour: T('골드', 115, '4강'), result: { reward: { credits: 390, parts: 7, xp: { gained: 30 }, round: '4강', rankPts: 25, rank: { from: { tier: '골드', pts: 90 }, to: { tier: '골드', pts: 115 } } }, info: { round: '8강', bestOf: 5 } } },
  { ms: 5900, still: 3300, tour: T('플래티넘', 25, '예선'), result: { reward: { credits: 405, parts: 7, xp: { gained: 30 }, champ: true, round: '예선', rankPts: 45, rank: { from: { tier: '골드', pts: 380 }, to: { tier: '플래티넘', pts: 25 } } }, info: { round: '결승', bestOf: 5 } } },
  { ms: 3000, still: 1300, tour: T('실버', 95, '예선'), result: { win: false, reward: { credits: 15, xp: { gained: 10 }, reset: 'cup', rankPts: -10, rank: { from: { tier: '실버', pts: 105 }, to: { tier: '실버', pts: 95 } } }, info: { round: '예선', bestOf: 5 } } },
  { ms: 5200, still: 3200, tour: T('풀로세움', 0, '예선', { stars: 0 }), result: { reward: { credits: 525, parts: 7, xp: { gained: 30 }, champ: true, round: '예선', rankPts: 45, rank: { from: { tier: '마스터', pts: 390 }, to: { tier: '풀로세움', pts: 0, stars: 0 } } }, info: { round: '결승', bestOf: 7 } } },
  { ms: 2600, still: 1500, tour: T('풀로세움', 0, '예선', { stars: 3 }), result: { reward: { credits: 150, parts: 2, xp: { gained: 30 }, champ: true, round: '예선', rank: { from: { tier: '풀로세움', pts: 0, stars: 2 }, to: { tier: '풀로세움', pts: 0, stars: 3 } } }, info: { round: '결승', bestOf: 7 } } },
];
const S = 2, STEP = 40, CROP = [0, 0, 270, 490];   // 논리 칸(제목 ~ 점수 판 — 아래 단추는 뺌 · 단계 승급 모션이 화면 가운데라 위까지)
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
  await p.goto(url + '/v2/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const [cx, cy, cw, ch] = CROP.map(v => v * S), frames = [];
  const crop = im => { const o = new Img(cw, ch, '#000000'); for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const s = ((cy + y) * im.w + cx + x) * 4, d = (y * cw + x) * 4; o.data[d] = im.data[s]; o.data[d + 1] = im.data[s + 1]; o.data[d + 2] = im.data[s + 2]; o.data[d + 3] = 255; } return o; };
  for (const [j, C] of CLIPS.entries()) {
    for (let at = 0; at <= C.ms; at += STEP) {
      const data = await p.evaluate((params, opt) => window.__shot('result', params, opt), { at: String(at) }, { scale: S, t: 1000 + at, tour: C.tour, result: C.result });
      const im = crop(decodePNG(Buffer.from(data.split(',')[1], 'base64')));
      frames.push(im);
      if (at <= C.still && C.still < at + STEP) writeFileSync(resolve(OUT, `still_${j + 1}.png`), encodePNG(im.w, im.h, im.data));
      if (at % 200 === 0) { mkdirSync(resolve(OUT, 'frames'), { recursive: true }); writeFileSync(resolve(OUT, 'frames', `c${j + 1}_${String(at).padStart(4, '0')}.png`), encodePNG(im.w, im.h, im.data)); }   // 검수용 200ms 간격 장
    }
    for (let k = 0; k < 12; k++) frames.push(frames[frames.length - 1]);   // 장면 끝 잠깐 멈춤
  }
  writeMP4(resolve(OUT, 'rank_fx.mp4'), frames, { delay: 4, fps: 25 });
  console.log('→', resolve(OUT, 'rank_fx.mp4'), frames.length + '장');
} finally { await b.close(); srv.close(); }
