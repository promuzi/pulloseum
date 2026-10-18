// node tools/shots/guardflow.mjs — 실제 카드 표시와 전투 사건 재생을 브라우저에서 검증.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from './static-server.mjs';
const require = createRequire(import.meta.url), puppeteer = require('puppeteer-core');
const repo = resolve(import.meta.dirname, '../..'), out = resolve(import.meta.dirname, 'out/guard-stance');
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
const { srv, url } = await serve(repo);
let browser;
try {
  browser = await puppeteer.launch({ executablePath: chrome, headless: 'new' });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 400, height: 860 });
  await page.goto(url + '/v2/index.html?offline=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready, { timeout: 20000 });
  const result = await page.evaluate(async () => {
    const { BASICS } = await import('./src/battle/model.js');
    const { statOf } = await import('./src/art/skillcard.js');
    const guard = BASICS.find(s => s.id === 'guard');
    window.__shot('battle', { phase: 'pick', venue: 'colosseum' }, { scale: 2 });
    const app = window.__app, scene = app.router.cur;
    const { resolveTurn } = await import('./src/battle/rules.js');
    const unit = id => ({ id, spd: 30, atk: 50, def: 25, acc: 0, eva: 0, crit: 0, hp: 1000 });
    const attack = { id: 'basic', name: '공격', act: 'attack', power: 50 };
    let n = 0;
    const { events } = resolveTurn(unit('me'), unit('foe'), attack, guard, () => n++ === 0 ? 0 : 0.5);
    const steps = scene.buildSteps({ mySkill: attack, foeSkill: guard, events });
    scene.startStep(steps.find(s => s.kind === 'stance'), app.t, app);
    const active = scene.v.stance.foe?.active;
    scene.startStep(steps.find(s => s.kind === 'guardBreak'), app.t + 1000, app);
    return { normal: statOf(guard), repeat: statOf(guard, { halved: true }), active, cleared: scene.v.stance.foe === null, kinds: steps.filter(s => ['stance', 'attack', 'guardBreak'].includes(s.kind)).map(s => s.kind) };
  });
  assert.equal(result.normal.txt, '×4'); assert.equal(result.normal.label, '방어력');
  assert.equal(result.repeat.txt, '×2.5');
  assert.deepEqual(result.kinds, ['stance', 'attack', 'guardBreak']);
  assert.equal(result.active, true); assert.equal(result.cleared, true);
  mkdirSync(out, { recursive: true });
  for (const [name, params] of [['front', {}], ['back', { peek: 'guard', peekP: '1' }]]) {
    const data = await page.evaluate(params => window.__shot('battle', { phase: 'pick', venue: 'colosseum', ...params }, { scale: 3 }), params);
    writeFileSync(resolve(out, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  }
  assert.deepEqual(errors, []);
  console.log('방어 카드 배율 · 반복 배율 · 화면 사건 순서 · 페이지 오류 검증 통과');
  console.log(out);
} finally { if (browser) await browser.close(); srv.close(); }
