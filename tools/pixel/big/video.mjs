// 휴대폰에서도 재생되는 MP4(H.264·yuv420p) — GIF와 같은 장·장별 길이를 50fps 고정으로 펼쳐 블렌더 내장 FFmpeg로 굽는다
// (이 기기엔 ffmpeg 실행 파일이 없어 블렌더 배경 실행으로 대신 — 다른 블렌더는 환경변수 BLENDER로 지정)
// 휴대폰 재생기는 GIF처럼 저절로 되풀이하지 않으므로 loops 바퀴를 이어 붙인다. 가로·세로는 짝수여야 한다(yuv420p).
import { mkdtempSync, writeFileSync, existsSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Img } from './engine.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export function findBlender() {
  if (process.env.BLENDER && existsSync(process.env.BLENDER)) return process.env.BLENDER;
  const base = 'C:\\Program Files\\Blender Foundation';
  if (existsSync(base)) for (const d of readdirSync(base).sort().reverse()) { const p = join(base, d, 'blender.exe'); if (existsSync(p)) return p; }
  return null;
}

// frames = 같은 크기 불투명 Img, delay = 1/100초(숫자 하나 또는 장마다 배열), zoom = 장마다 정수배로 키워 쓰기(큰 장을 한꺼번에 메모리에 두지 않게)
export function writeMP4(out, frames, { delay = 10, loops = 1, fps = 50, zoom = 1 } = {}) {
  const blender = findBlender(), w = frames[0].w * zoom, h = frames[0].h * zoom;
  if (!blender) { console.log('MP4 건너뜀 — 블렌더를 찾지 못함'); return false; }
  if (w % 2 || h % 2) throw new Error(`MP4는 가로·세로가 짝수여야 함 (${w}×${h})`);
  const dir = mkdtempSync(join(tmpdir(), 'pullo-mp4-')), seq = [];
  const big = f => { if (zoom === 1) return f; const o = new Img(w, h); o.blit(f, 0, 0, zoom); return o; };
  const files = frames.map((f, i) => { const n = `f${String(i).padStart(4, '0')}.png`; writeFileSync(join(dir, n), big(f).png()); return n; });
  for (let l = 0; l < loops; l++) files.forEach((n, i) => { const d = Array.isArray(delay) ? delay[i] : delay; for (let k = 0; k < Math.max(1, Math.round(d * fps / 100)); k++) seq.push(n); });
  const job = join(dir, 'job.json'), dst = resolve(out);
  writeFileSync(job, JSON.stringify({ dir, seq, fps, w, h, out: dst }));
  rmSync(dst, { force: true });
  const r = spawnSync(blender, ['-b', '--factory-startup', '--python-exit-code', '1', '-P', join(here, 'mp4_blender.py'), '--', job], { encoding: 'utf8', maxBuffer: 64 << 20 });
  rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0 || !existsSync(dst)) { console.log('MP4 실패:', (r.stdout || '').slice(-2000), (r.stderr || '').slice(-2000)); return false; }
  const prof = avcProfile(readFileSync(dst));
  console.log(`MP4 → ${dst} · ${w}×${h} · ${(seq.length / fps).toFixed(1)}초 · ${prof}`);
  return true;
}

// 이미 PNG 로 써 둔 장들(dir 안 files, 한 장 = 한 영상 장) + 소리(WAV, 선택) → MP4(H.264 + AAC). 긴 영상은 장을 메모리에 두지 않게 이 길로
//  crf = 블렌더 화질 이름(PERC_LOSSLESS · HIGH · MEDIUM …) — 용량을 맞출 때
export function writeMP4Files(out, dir, files, { fps = 30, w, h, audio = null, crf = 'PERC_LOSSLESS' } = {}) {
  const blender = findBlender();
  if (!blender) { console.log('MP4 건너뜀 — 블렌더를 찾지 못함'); return false; }
  if (w % 2 || h % 2) throw new Error(`MP4는 가로·세로가 짝수여야 함 (${w}×${h})`);
  const job = join(dir, 'job.json'), dst = resolve(out);
  writeFileSync(job, JSON.stringify({ dir, seq: files, fps, w, h, out: dst, audio: audio ? resolve(audio) : null, crf }));
  rmSync(dst, { force: true });
  const r = spawnSync(blender, ['-b', '--factory-startup', '--python-exit-code', '1', '-P', join(here, 'mp4_blender.py'), '--', job], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0 || !existsSync(dst)) { console.log('MP4 실패:', (r.stdout || '').slice(-2000), (r.stderr || '').slice(-2000)); return false; }
  const buf = readFileSync(dst);
  console.log(`MP4 → ${dst} · ${w}×${h} · ${(files.length / fps).toFixed(1)}초 · ${avcProfile(buf)}${audio ? ' · 소리 ' + (buf.indexOf('mp4a') >= 0 ? 'AAC' : '없음?') : ''} · ${(buf.length / 1048576).toFixed(1)}MB`);
  return true;
}

// avcC 상자에서 H.264 프로필 읽기 — High(100)·Main(77)·Baseline(66)은 휴대폰 재생 가능, High 4:4:4(244)는 안 됨
function avcProfile(buf) {
  const i = buf.indexOf('avcC');
  if (i < 0) return 'H.264 아님';
  const p = buf[i + 5], name = { 66: 'Baseline', 77: 'Main', 100: 'High', 244: 'High 4:4:4' }[p] || String(p);
  return `H.264 ${name} 레벨 ${(buf[i + 7] / 10).toFixed(1)}`;
}
