// 식물 빛 검토판(게임 모듈 v2/src/art/light.js 를 그대로 씀 — 2026-10-22 사용자 "식물들에게 자기 자신 광원 있는지 확인하고(가이아룩 등의 수정 처럼), 기본 이펙트(번개식물의 번개효과)도 확인해서")
//   node tools/pixel/big/lightlab.mjs --glow [키…] [--auto]   빛나는 칸: 원본 | 64장 동안 한 번이라도 빛난 칸(빨강) | 가장 밝은 장 | 밤 + 자기 빛 | 낮 + 자기 빛
//    키~sA 처럼 색 변종도(빛나는 칸은 원래 그림에서 찾고 빛 색은 색 변종 그림에서)
//  → out/light/*.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, encodePNG, Img } from './engine.mjs';
import { writeMP4 } from './video.mjs';
import { normalsOf, emitOf, steadyOf, spotsOf, selfLights, shade, labOf } from '../../../v2/src/art/light.js';
import { LIGHT_RULES } from '../../../v2/src/art/lightRules.js';
import { recolorData, eyeKeep } from '../../../v2/src/art/shinyColor.js';
import { soilish } from '../../../v2/src/art/potgrass.js';
import { SHINY_RULES } from '../../../v2/src/art/shinyRules.js';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..'), OUT = resolve(here, 'out', 'light');
mkdirSync(OUT, { recursive: true });
const W = 96, H = 112, N = W * H, args = process.argv.slice(2), keysArg = args.filter(a => !a.startsWith('--'));
export const speciesOf = k => k.replace(/~.*$/, '').replace(/_(young|teen)$/, '');
const ROSTER = (readFileSync(resolve(repo, 'v2', 'src', 'art', 'sprites.js'), 'utf8').match(/export const ROSTER = \[([^\]]+)\]/)[1].match(/'([a-z_]+)'/g) || []).map(s => s.slice(1, -1));
export function sheet(key, shinyV = null) {
  const base = key.replace(/~.*$/, ''), im = decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'plants', base + '.png'))), m = JSON.parse(readFileSync(resolve(repo, 'assets', 'v2', 'plants', base + '.json'), 'utf8'));
  let data = im.data;
  if (shinyV) { data = new Uint8ClampedArray(im.data); recolorData(data, SHINY_RULES[speciesOf(base)][shinyV], eyeKeep(im.data, im.w, m), soilish, { W: im.w, w: m.w, h: m.h, cols: m.cols, rows: m.rows }); }
  return { key, base, im, m, data, orig: im.data };
}
// 한 장 → { all(앞 층이 위), under, over } RGBA W×H
export function frameOf(S, f, data = S.data) {
  const { im, m } = S, ox = (f % m.cols) * W, oy = Math.floor(f / m.cols) * H, all = new Uint8ClampedArray(N * 4), under = new Uint8ClampedArray(N * 4), over = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (const L of [0, 1]) {
    const s = ((oy + L * m.rows * H + y) * im.w + ox + x) * 4; if (data[s + 3] < 128) continue;
    const d = (y * W + x) * 4, px = [data[s], data[s + 1], data[s + 2], 255];
    all.set(px, d); (L ? over : under).set(px, d);
  }
  return { all, under, over };
}
// 판 여러 장을 격자로(Z배)
export function board(rows, Z, name, bg = '#121622') {
  const cols = Math.max(...rows.map(r => r.length)), PAD = 4, o = new Img(cols * (W * Z + PAD) + PAD, rows.length * (H * Z + PAD) + PAD, bg);
  rows.forEach((row, ry) => row.forEach((px, j) => {
    if (!px) return;
    const x0 = PAD + j * (W * Z + PAD), y0 = PAD + ry * (H * Z + PAD);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + x) * 4; if (!px[s + 3]) continue; for (let v = 0; v < Z; v++) for (let u = 0; u < Z; u++) { const d = ((y0 + y * Z + v) * o.w + x0 + x * Z + u) * 4; o.data[d] = px[s]; o.data[d + 1] = px[s + 1]; o.data[d + 2] = px[s + 2]; o.data[d + 3] = 255; } }
  }));
  writeFileSync(resolve(OUT, name), encodePNG(o.w, o.h, o.data)); console.log('→', resolve(OUT, name), o.w + '×' + o.h);
}

if (args.includes('--probe')) {
  // 그림에 그려 둔 빛 방향: 둘레보다 밝은 칸의 면 방향(실루엣 모양만으로 잰 면) 평균 — art/light.js BAKED 의 근거
  let sx = 0, sy = 0, sw = 0;
  for (const k of keysArg.length ? keysArg : ROSTER) {
    const { all } = frameOf(sheet(k), 0), lab = labOf(all, N), nm = normalsOf(all, W, H, { detail: 0 });
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      const i = y * W + x; if (!nm[i * 3 + 2]) continue;
      let s = 0, n = 0; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) { const j = (y + v) * W + x + u; if (nm[j * 3 + 2]) { s += lab[j * 3]; n++; } }
      const dL = lab[i * 3] - s / n; sx += dL * nm[i * 3]; sy += dL * nm[i * 3 + 1]; sw += Math.abs(dL);
    }
  }
  console.log('그려 둔 빛 쪽(밝은 칸의 면 방향 평균)', 'x', (sx / sw).toFixed(3), 'y', (sy / sw).toFixed(3), '(− = 왼쪽 · 위)');
}

if (args.includes('--mp4')) {
  // 스스로 빛나는 종을 밤(어둠 0.42)에 대기 동작 그대로 — 4줄 격자 · 64장 두 바퀴(1초 20장) → out/light/self_night.mp4
  const keys = keysArg.length ? keysArg : ['cactus_fire', 'cactus_fire~sA', 'flower_fire', 'blade_vine', 'drake_cactus', 'ember_cap', 'gumiho_bloom', 'volcano_cap', 'spark', 'volt_vine', 'goblin_cap', 'drum_cactus', 'wizard_bell', 'gaia', 'stone_cap', 'lantern_vine'];
  const S = keys.map(k => { const [kk, sv] = k.split('~s'), s = sheet(kk, sv || null), rules = (LIGHT_RULES[speciesOf(kk)] || {}).emit || []; return { s, rules, steady: rules.some(r => r.tr) ? steadyOf(Array.from({ length: 8 }, (_, q) => frameOf(s, q * 8, s.orig).all), W, H, rules) : null }; });
  const cols = 4, Z = 2, PAD = 4, OW = cols * (W * Z + PAD) + PAD, OH = Math.ceil(keys.length / cols) * (H * Z + PAD) + PAD, frames = [];
  for (let f = 0; f < 64; f++) {
    const o = new Img(OW + (OW % 2), OH + (OH % 2), '#0b0e18');
    S.forEach(({ s, rules, steady }, j) => {
      const fr = frameOf(s, f).all, e = emitOf(frameOf(s, f, s.orig).all, W, H, rules, null, steady), px = shade(fr, normalsOf(fr, W, H), e, selfLights(spotsOf(fr, e, W, H, rules), f, 1), 0.42, W, H);
      const x0 = PAD + (j % cols) * (W * Z + PAD), y0 = PAD + Math.floor(j / cols) * (H * Z + PAD);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = (y * W + x) * 4; if (!px[q + 3]) continue; for (let v = 0; v < Z; v++) for (let u = 0; u < Z; u++) { const d = ((y0 + y * Z + v) * o.w + x0 + x * Z + u) * 4; o.data[d] = px[q]; o.data[d + 1] = px[q + 1]; o.data[d + 2] = px[q + 2]; o.data[d + 3] = 255; } }
    });
    frames.push(o);
  }
  writeMP4(resolve(OUT, 'self_night.mp4'), frames, { delay: 5, loops: 2 });
  writeFileSync(resolve(OUT, 'self_night_still.png'), encodePNG(frames[14].w, frames[14].h, frames[14].data)); console.log('→', resolve(OUT, 'self_night.mp4'));
}

if (args.includes('--glow')) {
  const auto = args.includes('--auto'), keys = keysArg.length ? keysArg : Object.keys(LIGHT_RULES), per = 4;
  for (let g = 0; g * per < keys.length; g++) {
    const rows = [];
    for (const k of keys.slice(g * per, g * per + per)) {
      const [kk, sv] = k.split('~s'), S = sheet(kk, sv || null), rules = auto ? [{ k: 'fire', l: 0.8, c: 0.12 }, { k: 'bolt', l: 0.93 }] : (LIGHT_RULES[speciesOf(kk)] || {}).emit || [];
      const steady = rules.some(r => r.tr) ? steadyOf(Array.from({ length: 8 }, (_, q) => frameOf(S, q * 8, S.orig).all), W, H, rules) : null;   // 게임(art/plantlight.js)과 같이
      const ever = new Uint8Array(N); let best = -1, bestN = -1;
      for (let f = 0; f < S.m.frames; f++) {
        const o = frameOf(S, f, S.orig).all, e = emitOf(o, W, H, rules, null, steady); let n = 0;
        for (let i = 0; i < N; i++) if (e[i]) { ever[i] = 1; n++; }
        if (n > bestN) { bestN = n; best = f; }
      }
      const F = frameOf(S, 0).all, ov = new Uint8ClampedArray(F); for (let i = 0; i < N; i++) if (ever[i]) { ov[i * 4] = 255; ov[i * 4 + 1] = 40; ov[i * 4 + 2] = 60; ov[i * 4 + 3] = 255; }
      // 밤 + 자기 빛: 빛나는 칸은 원래 그림에서 찾고(색 변종이어도) 빛 색은 지금 그림에서
      const fr = frameOf(S, best), e = emitOf(frameOf(S, best, S.orig).all, W, H, rules, null, steady), nm = normalsOf(fr.all, W, H), sp = spotsOf(fr.all, e, W, H, rules);
      rows.push([F, ov, fr.all, shade(fr.all, nm, e, selfLights(sp, best), 0.42, W, H), shade(fr.all, nm, e, selfLights(sp, best, 0.45), 1, W, H)]);
      console.log(k.padEnd(20), '빛 칸(가장 많은 장)', bestN, '장', best, '빛 자리', sp.map(s => `${s.k}(${s.n}) [${s.c.map(v => v.toFixed(2))}]`).join(' '));
    }
    board(rows, 2, `glow_${auto ? 'auto_' : ''}${g + 1}.png`);
  }
}
