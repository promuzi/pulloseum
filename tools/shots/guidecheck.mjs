// 처음 안내(튜토리얼) 확인: 오프라인 시험 세이브로 화면을 열어 안내가 저절로 뜨는지 · '건너뛰기'면 봤음이 남는지 · 다시 안 뜨는지 · 전투 시간 막대가 멈추는지
// 사용: node tools/shots/guidecheck.mjs
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '통과 ' : '실패 ') + m); };
try {
  const p = await b.newPage();
  await p.setViewport({ width: 270, height: 600, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const open = async scene => {
    await p.goto(url + `/v2/index.html?scene=${scene}&offline=1&mute=1&guide=1`, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__ready, { timeout: 15000 });
    await p.evaluate(() => window.__pause(true));
  };
  // 시간 넘기기(장마다 그리기 · 누르기 처리)
  const run = ms => p.evaluate(ms => { const app = window.__app; let t = app.t; for (let k = 0; k < ms / 33; k++) { t += 33; window.__frame(t); } return app.t; }, ms);
  const tap = id => p.evaluate(id => { const app = window.__app, r = app.input.regions.slice().reverse().find(x => x.id === id); if (!r) return false; app.input.queue.push({ type: 'tap', region: r }); return true; }, id);
  const st = () => p.evaluate(() => { const a = window.__app; return { open: !!a.guide, i: a.guide ? a.guide.i : -1, n: a.guide ? a.guide.steps.length : 0, ids: a.guide ? a.guide.ids : [], seen: a.state && a.state.guide || {} }; });

  // ① 홈: 저절로 뜸 → 다음 → 건너뛰기 → 봤음 · 다시 안 뜸 · ? 로 다시 봄
  await open('home');
  await run(300);
  ok(!(await st()).open, '홈: 들어오자마자는 아직 안 뜸(연출 기다림)');
  await run(1200);
  let s = await st();
  ok(s.open && s.ids.includes('home'), '홈: 조금 뒤 저절로 뜸');
  await tap('gd_next'); await run(66);
  ok((await st()).i === 1, '홈: 다음 → 둘째 장');
  await tap('gd_block'); await run(66);
  ok((await st()).i === 2, '홈: 아무 데나 눌러도 다음');
  await tap('gd_skip'); await run(66);
  s = await st();
  ok(!s.open && s.seen.home === 1, '홈: 건너뛰기 = 닫힘 + 봤음');
  await run(2000);
  ok(!(await st()).open, '홈: 봤으면 다시 안 뜸');
  ok(await tap('gd_help'), '홈: ? 단추 있음');
  await run(66);
  s = await st();
  ok(s.open && s.i === 0, '홈: ? = 처음부터 다시 봄');

  // ② 전투(봇 판): 안내가 열린 동안 시간 막대가 안 줄어듦
  await open('battle&phase=pick&venue=colosseum');
  await run(1500);
  s = await st();
  ok(s.open && s.ids.includes('battle'), '전투: 저절로 뜸');
  const left0 = await p.evaluate(() => { const sc = window.__app.router.cur; return window.__app.t - sc.v.pickT0; });
  await run(3000);
  const left1 = await p.evaluate(() => { const sc = window.__app.router.cur; return window.__app.t - sc.v.pickT0; });
  ok(Math.abs(left1 - left0) < 120, `전투: 안내 동안 시간 멈춤(흐른 시간 ${Math.round(left1 - left0)}ms)`);

  // ③ 다른 화면들: 저절로 뜨고 장 수가 맞음
  for (const [scene, id] of [['plant', 'plant3'], ['nursery', 'nursery'], ['explore', 'explore'], ['shop', 'shop'], ['bag', 'bag'], ['storage', 'storage'], ['dex', 'dex']]) {
    await open(scene); await run(2200);
    s = await st();
    ok(s.open && s.ids.includes(id) && s.n > 0, `${scene}: 저절로 뜸(${s.n}장)`);
  }
  ok(!errs.length, '페이지 오류 없음' + (errs.length ? ': ' + errs.join(' | ') : ''));
} finally { await b.close(); srv.close(); }
console.log(fails.length ? `실패 ${fails.length}` : '모두 통과');
process.exit(fails.length ? 1 : 0);
