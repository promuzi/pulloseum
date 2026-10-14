// 큰 판 식물 굽기: node tools/pixel/big/make.mjs [키 ...]   (키를 빼면 species/ 의 전부)
// 결과 = tools/pixel/big/out/
//   <키>_96x112.png      식물만(투명, selout 외곽선) — 게임 반입 후보
//   <키>_sheet.png       검토판(3배): 옛 48×56(×2) | 새 그림 | 실루엣 — 전부 테라코타 화분 포함
//   pot_terra_96x112.png 같은 엔진으로 그린 화분
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Img, colorize, decodePNG } from './engine.mjs';
import { W, H, potTerra } from './parts.mjs';

const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..'), outDir = resolve(here, 'out');
mkdirSync(outDir, { recursive: true });
const keys = process.argv.slice(2).filter(a => !a.startsWith('--'));
const todo = keys.length ? keys : readdirSync(resolve(here, 'species')).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4));

const pot = potTerra(), potImg = Img.fromColors(W, H, colorize(pot, pot.render()));
writeFileSync(resolve(outDir, 'pot_terra_96x112.png'), potImg.png());

const Z = 3, PAD = 12, BG = '#323353', EDGE = '#2e222f', LIGHTBG = '#c7dcd0';
for (const key of todo) {
  const build = (await import(pathToFileURL(resolve(here, 'species', key + '.mjs')).href)).default;
  const t0 = Date.now(), sp = build(), r = sp.render();
  const softC = colorize(sp, r), soft = Img.fromColors(W, H, softC);
  writeFileSync(resolve(outDir, `${key}_96x112.png`), soft.png());
  const panels = [];
  const oldP = resolve(repo, 'assets', 'sprites', key + '.png'), oldPot = resolve(repo, 'assets', 'sprites', 'pot_terra.png');
  if (existsSync(oldP)) {
    const p = new Img(W, H);
    if (existsSync(oldPot)) p.blit(decodePNG(readFileSync(oldPot)), 0, 0, 2);
    p.blit(decodePNG(readFileSync(oldP)), 0, 0, 2);
    panels.push(p);
  }
  const p = new Img(W, H);
  p.blit(potImg, 0, 0); p.blit(soft, 0, 0);
  panels.push(p);
  const sil = new Img(W, H);
  sil.blit(potImg, 0, 0, 1, EDGE); sil.blit(soft, 0, 0, 1, EDGE);
  panels.push(sil);
  const sheet = new Img(PAD + panels.length * (W * Z + PAD), H * Z + PAD * 2, EDGE);
  panels.forEach((p, i) => {
    const x = PAD + i * (W * Z + PAD);
    sheet.fill(x, PAD, W * Z, H * Z, i === panels.length - 1 ? LIGHTBG : BG);
    sheet.blit(p, x, PAD, Z);
  });
  writeFileSync(resolve(outDir, `${key}_sheet.png`), sheet.png());
  const cols = new Set(softC.filter(Boolean)), filled = softC.filter(Boolean).length;
  console.log(`${key}: ${W}×${H} 칸 ${filled} · 색 ${cols.size} · 층 ${sp.layers.length} · ${Date.now() - t0}ms → ${resolve(outDir, key + '_sheet.png')}`);
}
