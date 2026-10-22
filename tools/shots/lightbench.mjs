// 노멀맵 조명 비용 재기(2026-10-22 조사 — 사용자 "이거 하면 사양이 많이 필요한지도 알아봐봐"): 브라우저에서 식물 한 장(96×112 · 앞뒤 층)에
//  ① 칸 읽기(getImageData) ② 빛 계산(빛 n개) ③ 칸 쓰기(putImageData) ④ 화면에 붙이기(drawImage) 를 되풀이해 한 식물 한 장 평균 시간(ms)
//   node tools/shots/lightbench.mjs [--cpu 1,4,6] [--lights 1,4] [--n 300]   — --cpu = 느린 휴대폰 흉내(CPU 늦춤 배수)
//  노멀맵은 그 장 그림에서 한 번 만들어 둠(실루엣 거리 둥글림 — tools/pixel/big/normallab.mjs 와 같은 셈) — 만드는 시간도 따로 잼
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const argv = process.argv.slice(2), get = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const CPUS = (get('cpu') || '1,4,6').split(',').map(Number), LIGHTS = (get('lights') || '1,4').split(',').map(Number), REPS = +(get('n') || 300);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..');
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.goto(url + '/v2/index.html', { waitUntil: 'domcontentloaded' });
  const cdp = await p.target().createCDPSession();
  for (const cpu of CPUS) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    const r = await p.evaluate(async (LIGHTS, REPS) => {
      const im = new Image(); im.src = '/assets/v2/plants/cactus_fire.png'; await im.decode();
      const W = 96, H = 112, N = W * H, src = document.createElement('canvas'); src.width = W; src.height = H;
      const sc = src.getContext('2d', { willReadFrequently: true }); sc.drawImage(im, 0, 0, W, H, 0, 0, W, H); sc.drawImage(im, 0, 4 * H, W, H, 0, 0, W, H);
      const scr = document.createElement('canvas'); scr.width = 270; scr.height = 480; const g = scr.getContext('2d');
      const out = document.createElement('canvas'); out.width = W; out.height = H; const oc = out.getContext('2d');
      // 노멀맵(한 번)
      let t0 = performance.now();
      const a = sc.getImageData(0, 0, W, H).data, d = new Float32Array(N);
      for (let i = 0; i < N; i++) d[i] = a[i * 4 + 3] >= 128 ? 1e9 : 0;
      const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[y * W + x]);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (d[i]) d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (d[i]) d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
      const bev = (dd, R) => { const t = Math.min(1, dd / R); return Math.sqrt(1 - (1 - t) * (1 - t)); }, h = new Float32Array(N);
      for (let i = 0; i < N; i++) if (d[i]) h[i] = 2.5 * bev(d[i] / 3, 3) + 9 * bev(d[i] / 3, 16);
      const nm = new Float32Array(N * 3), gh = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : h[y * W + x]);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, dx = (gh(x + 1, y) - gh(x - 1, y)) / 2, dy = (gh(x, y + 1) - gh(x, y - 1)) / 2, l = Math.hypot(dx, dy, 1); nm[i * 3] = -dx / l; nm[i * 3 + 1] = -dy / l; nm[i * 3 + 2] = 1 / l; }
      const tNorm = performance.now() - t0, res = { tNorm };
      for (const nl of LIGHTS) {
        const lights = Array.from({ length: nl }, (_, k) => ({ x: 20 + k * 20, y: 10 + k * 7, z: 14, r: 40, c: [1, 0.6, 0.3], I: 1 }));
        const ts = { read: 0, light: 0, write: 0, blit: 0 };
        for (let rep = 0; rep < REPS; rep++) {
          lights[0].x = 48 + Math.sin(rep / 10) * 30;
          let t = performance.now(); const id = sc.getImageData(0, 0, W, H), px = id.data; ts.read += performance.now() - t;
          t = performance.now();
          for (let i = 0; i < N; i++) {
            if (px[i * 4 + 3] < 128) continue;
            const x = i % W, y = (i / W) | 0, nx = nm[i * 3], ny = nm[i * 3 + 1], nz = nm[i * 3 + 2]; let lr = 0, lg = 0, lb = 0;
            for (const L of lights) { const vx = L.x - x, vy = L.y - y, vz = L.z, dl = Math.hypot(vx, vy, vz), k = L.I * Math.max(0, (nx * vx + ny * vy + nz * vz) / dl) / (1 + (dl / L.r) ** 2); lr += L.c[0] * k; lg += L.c[1] * k; lb += L.c[2] * k; }
            px[i * 4] = px[i * 4] * (0.8 + 1.2 * lr); px[i * 4 + 1] = px[i * 4 + 1] * (0.8 + 1.2 * lg); px[i * 4 + 2] = px[i * 4 + 2] * (0.8 + 1.2 * lb);
          }
          ts.light += performance.now() - t;
          t = performance.now(); oc.putImageData(id, 0, 0); ts.write += performance.now() - t;
          t = performance.now(); g.drawImage(out, 80, 200); ts.blit += performance.now() - t;
        }
        for (const k in ts) ts[k] = +(ts[k] / REPS).toFixed(3);
        res['빛' + nl] = { ...ts, 합: +(ts.read + ts.light + ts.write + ts.blit).toFixed(3) };
      }
      return res;
    }, LIGHTS, REPS);
    console.log(`CPU ×${cpu}: 노멀맵 한 장 ${r.tNorm.toFixed(2)}ms`, JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'tNorm'))));
  }
} finally { await b.close(); srv.close(); }
