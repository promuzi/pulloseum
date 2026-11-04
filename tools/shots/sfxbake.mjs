// 고른 녹음 효과음 → 게임 소리 파일(2026-11-04 사용자 '카드 누름 ① · 고름 ① · 카드 넘김 ① … 싱크만 잘 맞춰줘' — v2/sfxpick.html)
//  후보 OGG(assets/v2/sfx_cand)를 헤드리스 크롬으로 풀어(게임과 같은 해독기) → 앞 빈틈을 잘라 소리가 누르는 순간 바로 나게 · 꼬리 정리 → assets/v2/sfx/<이름>.wav(모노 16비트 44.1kHz)
//  WAV = 모든 브라우저가 풀고(아이폰 사파리는 OGG를 못 푸는 판이 있음) 앞에 숨은 빈 칸이 없음(MP3 · AAC는 앞에 빈 칸이 붙어 소리가 늦게 남)
//  크기는 그대로(고르는 판에서 들은 크기 = 게임이 1/MASTER로 맞춤 — core/sound.js SAMPLE_K)
// 사용: node tools/shots/sfxbake.mjs [--dry]   (--dry = 재기만)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
// 고른 것(게임 소리 이름 → 후보) · 원본 = Kenney CC0(Interface Sounds click_001 · select_001 / Casino Audio card-place-1)
const PICK = { tap: 'tap_1', select: 'select_1', flip: 'flip_1' };
const dry = process.argv.includes('--dry');
const SR = 44100, ON_DB = -40, END_DB = -60, LEAD = 0.001, FADE_IN = 0.001, FADE_OUT = 0.012;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), outDir = resolve(repo, 'assets', 'v2', 'sfx');
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
let got;
try {
  const p = await b.newPage();
  await p.goto(url + '/assets/v2/sfx_cand/LICENSE-Kenney-CC0.txt');
  got = await p.evaluate(async (files, SR) => {
    const out = {};
    for (const f of files) {
      const ab = await (await fetch('/assets/v2/sfx_cand/' + f + '.ogg')).arrayBuffer();
      const buf = await new OfflineAudioContext(1, 1, SR).decodeAudioData(ab);
      const n = buf.length, mono = new Float32Array(n);
      for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels; }
      out[f] = { ch: buf.numberOfChannels, x: Array.from(mono) };
    }
    return out;
  }, Object.values(PICK), SR);
} finally { await b.close(); srv.close(); }

const db = v => (v > 0 ? 20 * Math.log10(v) : -120);
const ms = i => Math.round((i / SR) * 1000);
if (!dry) mkdirSync(outDir, { recursive: true });
for (const [name, cand] of Object.entries(PICK)) {
  const { ch, x } = got[cand];
  let peak = 0, pi = 0;
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > peak) { peak = Math.abs(x[i]); pi = i; }
  const onT = peak * 10 ** (ON_DB / 20), endT = peak * 10 ** (END_DB / 20);
  let on = 0; while (on < x.length && Math.abs(x[on]) < onT) on++;
  let end = x.length - 1; while (end > on && Math.abs(x[end]) < endT) end--;
  const s0 = Math.max(0, on - Math.round(LEAD * SR)), s1 = Math.min(x.length, end + Math.round(FADE_OUT * SR));
  const y = x.slice(s0, s1), fi = Math.round(FADE_IN * SR), fo = Math.round(FADE_OUT * SR);
  for (let i = 0; i < fi && i < y.length; i++) y[i] *= i / fi;
  for (let i = 0; i < fo && i < y.length; i++) y[y.length - 1 - i] *= i / fo;
  // 10ms 칸마다 세기(꼭대기 기준 dB) — 소리의 몸통이 어디 있나(싱크를 맞출 자리)
  const env = [];
  for (let w = 0; w * 441 < y.length && w < 40; w++) { let sq = 0, m = 0; for (let i = w * 441; i < Math.min(y.length, (w + 1) * 441); i++) { sq += y[i] * y[i]; m++; } env.push(Math.round(db(Math.sqrt(sq / m) / peak))); }
  let sq = 0; for (const v of y) sq += v * v;
  console.log(`${name} ← ${cand}.ogg(${ch === 1 ? '모노' : ch + '채널'}) · 원래 ${ms(x.length)}ms · 앞 빈틈 ${ms(on)}ms 자름 → ${ms(y.length)}ms · 꼭대기 ${ms(pi - s0)}ms 자리 ${db(peak).toFixed(1)}dBFS · RMS ${db(Math.sqrt(sq / y.length)).toFixed(1)}dBFS`);
  console.log('  10ms 칸 세기(dB):', env.join(' '));
  if (dry) continue;
  const N = y.length, wav = Buffer.alloc(44 + N * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) wav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(y[i] * 32767))), 44 + i * 2);
  writeFileSync(resolve(outDir, name + '.wav'), wav);
  console.log('  →', resolve(outDir, name + '.wav'), (wav.length / 1024).toFixed(1) + 'KB');
}
