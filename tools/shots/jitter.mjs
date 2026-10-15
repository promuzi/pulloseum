// 지글거림 재기(2026-10-15 "픽셀이 너무 지글거려서 어지럽다는 평가" — 해결책 분석용):
//  한 장면을 1배(논리 칸)로 30fps N장 그려, 장마다 바뀐 칸과 '깜빡임'(A → B → A, 두 장 안에 되돌아옴 = 끓는 칸)을 구역별로 센다.
//   node tools/shots/jitter.mjs --scene home [--sec 3] [--params '{...}'] [--calm]   (--calm = window.__calm 켜고 같은 측정)
//  구역 = 화면 좌표 상자(장면마다 아래 ZONES), 나머지 = 전체에서 상자들을 뺀 곳.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const argv = process.argv.slice(2), get = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const scene = get('scene') || 'home', sec = +(get('sec') || 3), params = JSON.parse(get('params') || '{}'), calm = argv.includes('--calm');
const ZONES = {
  home: { '식물(의자 위)': [90, 250, 90, 110], '창밖 우주': [46, 120, 178, 178], '전등 빛기둥': [100, 30, 70, 90] },
  battle: { '상대 식물': [138, 60, 96, 120], '내 식물': [32, 180, 96, 120], '경기장 하늘·관중': [0, 24, 270, 110] },
  nursery: { '재배대': [0, 50, 270, 330] },
  hangar: { '탐사선 홀로그램': [60, 150, 150, 150] },
};
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..');
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const res = await p.evaluate(async (scene, params, sec, calm, zones) => {
    window.__pause(true); window.__calm = calm;
    const a = window.__app, W = 270, H = 600, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false; a.g.ctx = ctx; a.W = W; a.H = H; a.pxScale = 1;
    a.router.set(scene, params);
    const N = Math.round(sec * 30), frames = [];
    for (let i = 0; i < N + 30; i++) { a.t = 1000 + i * 33; a.input.begin(); a.router.draw(a); if (i >= 30) frames.push(new Uint32Array(ctx.getImageData(0, 0, W, H).data.buffer.slice(0))); }   // 앞 1초는 버림(나타나기 연출)
    const zoneOf = new Uint8Array(W * H), names = Object.keys(zones);
    names.forEach((n, k) => { const [x, y, w, h] = zones[n]; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) zoneOf[yy * W + xx] = k + 1; });
    const tot = new Array(names.length + 1).fill(0), chg = new Array(names.length + 1).fill(0), flk = new Array(names.length + 1).fill(0);
    const cnt = new Uint16Array(W * H); for (let f = 0; f + 1 < frames.length; f++) { const A = frames[f], B = frames[f + 1]; for (let i = 0; i < W * H; i++) if (A[i] !== B[i]) cnt[i]++; }   // 칸마다 바뀐 횟수
    const secs = (frames.length - 1) / 30, hot3 = new Array(names.length + 1).fill(0), hot6 = new Array(names.length + 1).fill(0);
    for (let i = 0; i < W * H; i++) { const r = cnt[i] / secs; if (r >= 3) hot3[zoneOf[i]]++; if (r >= 6) hot6[zoneOf[i]]++; }
    for (let i = 0; i < W * H; i++) tot[zoneOf[i]]++;
    for (let f = 0; f + 2 < frames.length; f++) { const A = frames[f], B = frames[f + 1], C = frames[f + 2]; for (let i = 0; i < W * H; i++) { if (A[i] !== B[i]) { chg[zoneOf[i]]++; if (A[i] === C[i]) flk[zoneOf[i]]++; } } }
    const F = frames.length - 2, out = {};
    ['나머지', ...names].forEach((n, k) => { out[n] = { 칸: tot[k], '장마다 바뀐 칸 %': +(chg[k] / F / tot[k] * 100).toFixed(2), '초당 3번↑ 바뀌는 칸 %': +(hot3[k] / tot[k] * 100).toFixed(1), '초당 6번↑ %': +(hot6[k] / tot[k] * 100).toFixed(1) }; });
    let all = 0, allF = 0; for (let k = 0; k <= names.length; k++) { all += chg[k]; allF += flk[k]; }
    let h3 = 0, h6 = 0; for (let k = 0; k <= names.length; k++) { h3 += hot3[k]; h6 += hot6[k]; }
    out['전체'] = { 칸: W * H, '장마다 바뀐 칸 %': +(all / F / (W * H) * 100).toFixed(2), '초당 3번↑ 바뀌는 칸 %': +(h3 / (W * H) * 100).toFixed(1), '초당 6번↑ %': +(h6 / (W * H) * 100).toFixed(1) };
    return out;
  }, scene, params, sec, calm, ZONES[scene] || {});
  console.log(`${scene}${calm ? ' (차분하게)' : ''} — 30fps ${sec}초`);
  console.table(res);
} finally { await b.close(); srv.close(); }
