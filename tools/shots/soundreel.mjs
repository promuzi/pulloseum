// 게임 소리를 들어 볼 수 있게 파일로 굽기(브라우저 Web Audio 를 오프라인으로 돌려 WAV) — core/sound.js renderOffline
//   node tools/shots/soundreel.mjs --out sound_reel [--sfx a,b,c] [--music home:10,battle:10,title:8] [--gap 0.7]
//   기본 = 효과음 전부(0.7초 간격) → 음악 셋 조금씩. 결과 = tools/shots/out/<out>.wav
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const argv = process.argv.slice(2), get = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const out = get('out') || 'sound_reel', gap = +(get('gap') || 0.7);
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(here, 'out'); mkdirSync(outDir, { recursive: true });
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?scene=title', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready && window.__sound, { timeout: 15000 });
  const names = get('sfx') ? get('sfx').split(',') : await p.evaluate(() => window.__sound.list());
  const tracks = (get('music') ?? 'home:10,battle:10,title:8').split(',').filter(Boolean).map(s => { const [n, d] = s.split(':'); return { n, d: +d || 8 }; });
  const plan = []; let t = 0.2;
  for (const n of names) { plan.push({ t, sfx: n }); t += n === 'win' || n === 'lose' ? 1.6 : n === 'ignite' || n === 'gale' || n === 'shade' ? 1.2 : gap; }
  t += 0.5;
  for (const { n, d } of tracks) { plan.push({ t, music: n, dur: d }); t += d + 0.8; }
  const data = await p.evaluate(async (plan, sec) => window.__sound.renderOffline(plan, sec), plan, t + 0.5);
  // 16비트 모노 WAV
  const N = data.length, buf = Buffer.alloc(44 + N * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(44100, 24); buf.writeUInt32LE(88200, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(data[i]));
  const k = peak > 0 ? 0.9 / peak : 1;   // 들어 보기용 = 최고 0.9로 맞춤(게임 안 크기는 sound.js SOUND)
  for (let i = 0; i < N; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(data[i] * k * 32767))), 44 + i * 2);
  writeFileSync(resolve(outDir, out + '.wav'), buf);
  console.log(`저장: ${resolve(outDir, out + '.wav')} · ${(N / 44100).toFixed(1)}초 · 최고 ${peak.toFixed(2)}${errs.length ? ' · 페이지 오류 ' + errs.join(' | ') : ''}`);
  console.log('차례:', plan.map(x => (x.sfx || x.music) + '@' + x.t.toFixed(1)).join(' '));
} finally { await b.close(); srv.close(); }
