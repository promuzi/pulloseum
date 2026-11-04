// 우리 기술 효과 ↔ PVFX Foundry(CC0 · 2026-11-04 받음 — tools/pixel/fx_ref/pvfx, 저장소 밖 · 이 기기에만) 비교판
//  사용자 '픽셀 효과 소스나 관련 플러그인 등 … 스킬이나 여러 타격 등 참고할만한 효과 적용할만한 게 있는지' → 'PVFX 비교해봐'
//  줄마다: 왼쪽 = 우리 효과(전투를 맞는 순간에 멈춰 0 · 100 · 200 · 350ms) · 오른쪽 = PVFX 도트 엄격판(strict)을 같은 장면 맞는 식물 몸 가운데에 1배로 얹은 네 순간
//  node tools/shots/fxref.mjs → tools/shots/out/fxref/fxref.png (+ 줄마다 조각)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const out = resolve(here, 'out', 'fxref'); mkdirSync(out, { recursive: true });
const PV = resolve(repo, 'tools/pixel/fx_ref/pvfx/unz/effects');
if (!existsSync(PV)) { console.log('PVFX 없음 — tools/pixel/fx_ref/pvfx/unz 에 풀어 둘 것'); process.exit(1); }
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const K = 3;
export const PAIRS = [   // [이름, 우리 기술 id, PVFX 효과]
  ['불', 'f_ember', 'fire/fireball-impact'], ['번개', 'b_bolt', 'lightning/lightning-strike'], ['서리', 'i_frost', 'ice/frost-nova'], ['덩굴', 'j_wrap', 'nature/vine-snare'],
  ['포자', 'j_spore', 'nature/spore-burst'], ['물', 'w_gun', 'water/water-splash'], ['바람', 'a_breeze', 'wind/wind-blade'], ['평타 · 치명타', 'basic', 'impacts/crit-hit'],
];
const AT = process.argv.includes('--video') ? Array.from({ length: 17 }, (_, i) => i * 50) : [0, 100, 200, 350];   // --video = 맞는 순간부터 0.8초를 50ms마다(영상용 — fxref_sheet.py --video)
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 20000 });
  const rows = [];
  for (const [name, skill, fx] of PAIRS) {
    const ours = [];
    for (const ms of AT) ours.push(await p.evaluate((skill, ms, k) => window.__shot('battle', { phase: 'hit', venue: 'colosseum', use: skill, hitAt: String(ms), seed: '7' }, { scale: k }), skill, String(ms), K));
    const base = await p.evaluate((skill, k) => window.__shot('battle', { phase: 'hit', venue: 'colosseum', use: skill, hitAt: '1600', seed: '7' }, { scale: k }), skill, K);   // 효과가 다 끝난 같은 장면(PVFX를 얹을 바탕)
    const tgt = await p.evaluate(() => { const s = window.__app.router.cur, [ex, ey] = s.at('foe'), W = window.__app.W; return { x: ex + Math.floor((W - 270) / 2), y: ey - 56 }; });   // 맞는 식물 몸 가운데(drawReveal plant와 같은 셈)
    const dir = resolve(PV, fx, 'strict/grid'), man = JSON.parse(readFileSync(resolve(dir, 'manifest.json'), 'utf8'));
    const base2 = (await p.evaluate(() => { const s = window.__app.router.cur, [ex, ey] = s.at('foe'), W = window.__app.W; return { x: ex + Math.floor((W - 270) / 2), y: ey }; }));   // 맞는 식물 화분 밑(땅에서 솟는 효과의 기준점)
    rows.push({ name, skill, fx, ours, base, tgt, ground: base2, at: AT, sheet: resolve(dir, 'sprite-sheet.png'), size: man.source_size, pivot: man.pivot, n: man.frames.length, dur: man.frames.map(f => f.duration ? f.duration.numerator_ms / (f.duration.denominator || 1) : 50) });
    console.log(name, skill, fx, 'PVFX', man.source_size, man.frames.length + '장');
  }
  writeFileSync(resolve(out, 'rows.json'), JSON.stringify(rows.map(r => ({ ...r, ours: r.ours.map((d, i) => { const f = resolve(out, `${r.skill}_${String(AT[i]).padStart(3, '0')}.png`); writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); return f; }), base: (() => { const f = resolve(out, `${r.skill}_base.png`); writeFileSync(f, Buffer.from(r.base.split(',')[1], 'base64')); return f; })() })), null, 1));
  if (errs.length) console.log('페이지 오류:\n' + errs.join('\n'));
} finally { await b.close(); srv.close(); }
