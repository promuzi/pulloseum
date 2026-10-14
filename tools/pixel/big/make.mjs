// 큰 판 식물 굽기: node tools/pixel/big/make.mjs [키 ...]   (키를 빼면 species/ 의 전부)
// 결과 = tools/pixel/big/out/
//   <키>_96x112.png                          식물만(투명) — 게임 반입 후보
//   pot_<종류>_back.png · pot_<종류>_front.png  화분 다섯(3D, pot3d.mjs) — 화면은 back → 식물 → front 순서로 겹친다
//   roster_sheet.png  검토판: 종 전부(테라코타 화분에 심은 모습, 2배) · roster_sil.png 실루엣 · pots_sheet.png 화분 다섯
//   --z=N 이면 검토판 배율 N(키를 주고 --sheet 를 붙이면 그 종만 검토판)
//   --pastel 이면 같은 그림을 파스텔 색으로 바꿔 out/pastel/ 에 쓴다(눈은 약하게만 바꿈)
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Img, colorize, pastelizer, mapImg } from './engine.mjs';
import { W, H } from './parts.mjs';
import { POT3, renderPot } from './pot3d.mjs';

const here = dirname(fileURLToPath(import.meta.url)), pastel = process.argv.includes('--pastel');
const outDir = resolve(here, 'out', pastel ? 'pastel' : '');
mkdirSync(outDir, { recursive: true });
const PASTEL = pastel ? pastelizer() : null, PASTEL_EYE = pastel ? pastelizer({ lift: 0.12, keep: 0.88, sat: 0.85, cmax: 0.16 }) : null;
const ORDER = ['flower_grass', 'thorn', 'aqua', 'flower_wind', 'spark', 'vine_water', 'cactus_fire', 'gaia', 'flower_fire', 'cactus_wind', 'vine_wind', 'spore_cap'];
const all = readdirSync(resolve(here, 'species')).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4));
const keys = process.argv.slice(2).filter(a => !a.startsWith('--'));
const todo = keys.length ? keys : [...ORDER.filter(k => all.includes(k)), ...all.filter(k => !ORDER.includes(k))];

const pots = {};
for (const [k, st] of Object.entries(POT3)) {
  pots[k] = renderPot(st);
  if (PASTEL) pots[k] = { back: mapImg(pots[k].back, PASTEL), front: mapImg(pots[k].front, PASTEL) };
  writeFileSync(resolve(outDir, `${k}_back.png`), pots[k].back.png());
  writeFileSync(resolve(outDir, `${k}_front.png`), pots[k].front.png());
}

const plants = {};
for (const key of todo) {
  const t0 = Date.now(), sp = (await import(pathToFileURL(resolve(here, 'species', key + '.mjs')).href)).default();
  const cols = colorize(sp, sp.render(), { map: PASTEL, keepMap: PASTEL_EYE }), im = Img.fromColors(W, H, cols);
  plants[key] = im;
  writeFileSync(resolve(outDir, `${key}_96x112.png`), im.png());
  // 화분 밖 아래: 흙 높이 근처(y ≥ 66)에서 화분 테두리 폭(x 25~71) 밖에 있는 칸 = 허공에 놓인 것처럼 보이는 부분
  const out = cols.reduce((n, c, i) => n + (c && Math.floor(i / W) >= 66 && (i % W < 25 || i % W > 71) ? 1 : 0), 0);
  console.log(`${key.padEnd(13)} 칸 ${cols.filter(Boolean).length} · 색 ${new Set(cols.filter(Boolean)).size} · 층 ${sp.layers.length} · 화분 밖 아래 ${out} · ${Date.now() - t0}ms`);
}

// 검토판: 칸마다 이미지 여러 장을 겹쳐 Z배, COLS열
function sheet(items, Z, COLS, bg, tint = null) {
  const PAD = 8, rows = Math.ceil(items.length / COLS);
  const S = new Img(PAD + COLS * (W * Z + PAD), PAD + rows * (H * Z + PAD), '#2e222f');
  items.forEach((layers, i) => {
    const x = PAD + (i % COLS) * (W * Z + PAD), y = PAD + Math.floor(i / COLS) * (H * Z + PAD), p = new Img(W, H);
    for (const im of layers) p.blit(im, 0, 0, 1, tint);
    S.fill(x, y, W * Z, H * Z, bg);
    S.blit(p, x, y, Z);
  });
  return S;
}
// --anim: 한 바퀴 FR장을 그려 out/anim/<키들>.gif(화분에 심은 모습 나란히, 3배, 0.1초 간격) + _strip.png(프레임 띠)
if (process.argv.includes('--anim')) {
  const { encodeGIF } = await import('./gif.mjs');
  const FR = 8, Z = 3, T = pots.pot_terra, aDir = resolve(outDir, 'anim'), mods = [];
  mkdirSync(aDir, { recursive: true });
  for (const key of todo) mods.push((await import(pathToFileURL(resolve(here, 'species', key + '.mjs')).href)).default);
  const frames = [];
  for (let i = 0; i < FR; i++) {
    const fr = new Img(mods.length * W * Z, H * Z, '#2f3150');
    mods.forEach((fn, m) => {
      const sp = fn({ t: i / FR, i }), p = new Img(W, H);
      p.blit(T.back, 0, 0); p.blit(Img.fromColors(W, H, colorize(sp, sp.render(), { map: PASTEL, keepMap: PASTEL_EYE })), 0, 0); p.blit(T.front, 0, 0);
      fr.blit(p, m * W * Z, 0, Z);
    });
    frames.push(fr);
  }
  const name = todo.join('+');
  writeFileSync(resolve(aDir, name + '.gif'), encodeGIF(frames, { delay: 10 }));
  const strip = new Img(FR * mods.length * W, H, '#2f3150');
  frames.forEach((fr, i) => { const small = new Img(mods.length * W, H); for (let y = 0; y < H; y++) for (let x = 0; x < mods.length * W; x++) { const k = ((y * Z) * fr.w + x * Z) * 4; small.data.set(fr.data.subarray(k, k + 4), (y * small.w + x) * 4); } strip.blit(small, i * mods.length * W, 0); });
  writeFileSync(resolve(aDir, name + '_strip.png'), strip.png());
  console.log('움직임 →', resolve(aDir, name + '.gif'));
}

if (!keys.length || process.argv.includes('--sheet')) {
  const T = pots.pot_terra, list = Object.keys(plants).map(k => [T.back, plants[k], T.front]);
  const z = +(process.argv.find(a => a.startsWith('--z=')) || '--z=2').slice(4);
  writeFileSync(resolve(outDir, 'roster_sheet.png'), sheet(list, z, Math.max(1, Math.min(4, Math.floor(1600 / (W * z)))), '#323353').png());
  writeFileSync(resolve(outDir, 'roster_sil.png'), sheet(list, 1, 6, '#c7dcd0', '#2e222f').png());
  writeFileSync(resolve(outDir, 'pots_sheet.png'), sheet(Object.values(pots).map(p => [p.back, p.front]), 2, 5, '#323353').png());
  console.log('검토판 →', resolve(outDir, 'roster_sheet.png'));
}
