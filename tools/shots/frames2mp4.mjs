// 장 그림 폴더(f00000.png …) → MP4(블렌더 — tools/pixel/big/video.mjs) · 휴대폰에서 보기(원격 — GIF 대신 MP4)
//  node tools/shots/frames2mp4.mjs <장 폴더> <out.mp4> [fps=20] [되풀이=2]
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodePNG } from '../pixel/big/engine.mjs';
import { readFileSync } from 'node:fs';
const { writeMP4Files } = await import('../pixel/big/video.mjs');
const [dir, out, fps = '20', loops = '2'] = process.argv.slice(2);
if (!dir || !out) { console.log('node tools/shots/frames2mp4.mjs <장 폴더> <out.mp4> [fps] [되풀이]'); process.exit(1); }
const one = readdirSync(dir).filter(f => /\.png$/i.test(f)).sort();
const files = Array.from({ length: +loops }, () => one).flat(), im = decodePNG(readFileSync(resolve(dir, one[0])));
writeMP4Files(resolve(out), resolve(dir), files, { fps: +fps, w: im.w, h: im.h, crf: 'HIGH' });
