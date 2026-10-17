// 발열 점검(2026-10-17 사용자 "게임 발열이 심하다는데 확인해봐"): 휴대폰 크기 화면으로 장면마다 몇 초씩 돌리며
//  ① 1초에 그린 장 수 ② 한 장 그리는 데 든 JS 시간 ③ 브라우저 · 그래픽 프로세스 CPU 사용률(코어 하나 = 100%) ④ 음악 합성 부담(오프라인으로 20초를 굽는 데 든 시간)
//   node tools/shots/perfcheck.mjs [--dpr 2.625] [--cpu 4] [--sec 4] [--only home,battle,music]
//   --cpu = 느린 휴대폰 흉내(CPU 늦춤 배수). 헤드리스 크롬의 rAF 는 1초 60번 — 120Hz 폰은 장 수 제한이 없으면 두 배로 그림
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const argv = process.argv.slice(2), get = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const DPR = +(get('dpr') || 2.625), CPU = +(get('cpu') || 1), SEC = +(get('sec') || 4);
const SCENES = [
  ['title', 'scene=title&at=12'],
  ['home', 'scene=home'],
  ['plant', 'scene=plant&tab=skill'],
  ['nursery', 'scene=nursery'],
  ['battle', 'scene=battle&phase=pick&venue=colosseum'],
  ['explore', 'scene=explore'],
].filter(([n]) => !get('only') || get('only').split(',').includes(n));
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..');
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
const cpuOf = async cdp => { const { processInfo } = await cdp.send('SystemInfo.getProcessInfo'); const o = {}; for (const p of processInfo) o[p.type] = (o[p.type] || 0) + p.cpuTime; return o; };
try {
  const bcdp = await b.target().createCDPSession();
  const p = await b.newPage();
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  const cdp = await p.createCDPSession();
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  // rAF 감싸기: 부른 장 수 · 장마다 걸린 시간(그리는 함수만 — 실제로 그린 장은 __drawn)
  await p.evaluateOnNewDocument(() => {
    const raf = window.requestAnimationFrame.bind(window), P = window.__perf = { n: 0, ms: 0, max: 0, drawn: 0, on: false };
    window.requestAnimationFrame = cb => raf(ts => {
      const at = window.__app && window.__app.t, t0 = performance.now(); cb(ts); const d = performance.now() - t0;
      if (P.on) { P.n++; P.ms += d; P.max = Math.max(P.max, d); if (window.__app && window.__app.t !== at) P.drawn++; }
    });
  });
  console.log(`화면 ${Math.round(412 * DPR)}×${Math.round(915 * DPR)} · CPU 늦춤 ×${CPU} · 장면마다 ${SEC}초`);
  for (const [name, q] of SCENES) {
    await p.goto(url + '/v2/index.html?' + q + '&mute&noguide', { waitUntil: 'load' });
    await p.waitForFunction(() => window.__ready, { timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));
    const info = await p.evaluate(() => { const c = document.getElementById('screen'); return { cw: c.width, ch: c.height, W: window.__app.screen.W, H: window.__app.screen.H, s: window.__app.screen.s }; });
    await p.evaluate(() => { Object.assign(window.__perf, { n: 0, ms: 0, max: 0, on: true }); });
    const c0 = await cpuOf(bcdp), t0 = Date.now();
    await new Promise(r => setTimeout(r, SEC * 1000));
    const c1 = await cpuOf(bcdp), dt = (Date.now() - t0) / 1000;
    const pf = await p.evaluate(() => { window.__perf.on = false; return window.__perf; });
    const pct = k => (((c1[k] || 0) - (c0[k] || 0)) / dt * 100).toFixed(0);
    console.log(`${name.padEnd(8)} 캔버스 ${info.cw}×${info.ch}(${info.W}×${info.H} ×${info.s}) · 그린 장 ${(pf.drawn / dt).toFixed(0)}/초(부름 ${(pf.n / dt).toFixed(0)}) · 그린 장당 ${(pf.ms / Math.max(1, pf.drawn)).toFixed(2)}ms(최대 ${pf.max.toFixed(1)}) · CPU 화면 ${pct('renderer')}% · 그래픽 ${pct('gpu')}% · 브라우저 ${pct('browser')}%`);
  }
  // 음악 합성 부담: 대기실 곡 20초를 오프라인으로 굽는 시간(실시간이면 이만큼이 소리 스레드 몫 — 휴대폰은 몇 배)
  if (!get('only') || get('only').includes('music')) {
    await p.goto(url + '/v2/index.html?scene=title&mute', { waitUntil: 'load' });
    await p.waitForFunction(() => window.__ready && window.__sound, { timeout: 30000 });
    for (const st of ['home', 'battle']) {
      const r = await p.evaluate(async st => { const t0 = performance.now(); await window.__sound.reel([{ t: 0, state: st }], 20, {}); return performance.now() - t0; }, st);
      console.log(`음악 ${st.padEnd(6)} 20초 굽기 ${(r / 1000).toFixed(2)}초 → 실시간이면 소리 스레드 ${(r / 20000 * 100).toFixed(1)}%(이 PC 코어 하나 기준 · WAV 만들기 포함)`);
    }
  }
} finally { await b.close(); srv.close(); }
