// 종자 · 상점 물건: 코덱스 원화(concept/items/<이름>.png, 회색 배경) → 누끼(concept/items/cut/) → 작은 도트(assets/v2/items/) + 검토판(out/items/sheet.png)
//   node tools/pixel/big/items.mjs [이름…]   (이름 없으면 있는 원화 전부)
//   종자 seed_<속성> = 28×32 아래 맞춤 · 물건 item_<물건> = 44×44(상점) + item_<물건>_s = 28×28(가방 줄 · 받은 것 칸)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { decodePNG, encodePNG } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const SEEDS = ['fire', 'water', 'grass', 'earth', 'wind', 'bolt', 'ice'].map(e => 'seed_' + e);
const ITEMS = ['seed_common', 'seed_rare', 'card_basic', 'card_mut', 'water', 'fert', 'regress', 'fuel', 'parts'].map(k => 'item_' + k);
// 종마다 다른 종자(2026-10-23 사용자 "종자도 식물별로 다 다르게해줘"): 코덱스가 한 장에 넷씩(2×2 — 왼위 · 오른위 · 왼아래 · 오른아래) 그린 seeds_NN.png 를 칸마다 잘라 seed_<종>.png 로
//  (요청서 concept/items/SEEDS_PROMPT.md 와 같은 차례 — 마지막 seeds_12 는 한 장에 하나)
const SHEETS = [['flower_grass', 'thorn', 'aqua', 'flower_wind'], ['spark', 'vine_water', 'cactus_fire', 'gaia'], ['flower_fire', 'cactus_wind', 'vine_wind', 'spore_cap'], ['frost_bell', 'volt_vine', 'stone_cap', 'jelly_cap'],
  ['fang_trap', 'blade_vine', 'toxi_cactus', 'draco_fruit'], ['ember_cap', 'drake_cactus', 'frost_drake', 'gat_cap'], ['mask_vine', 'drum_cactus', 'lantern_vine', 'jar_cactus'], ['goblin_cap', 'crown_cap', 'gladi_cactus', 'jangseung_cactus'],
  ['astro_cap', 'viking_cap', 'hyunmu_cap', 'gumiho_bloom'], ['wizard_bell', 'ninja_vine', 'diver_vine', 'pirate_cactus'], ['ranger_vine', 'miner_cap', 'snow_ballet', 'volcano_cap'], ['dandel_aero']];
const SPECIES_SEEDS = SHEETS.flat().map(k => 'seed_' + k);
function splitSheets() {   // seeds_NN.png → concept/items/split/seed_<종>.png(칸 하나 = 원화 한 장처럼)
  mkdirSync(resolve(here, 'concept', 'items', 'split'), { recursive: true });
  SHEETS.forEach((keys, si) => {
    const f = resolve(here, 'concept', 'items', 'seeds_' + String(si + 1).padStart(2, '0') + '.png'); if (!existsSync(f)) return;
    const im = decodePNG(readFileSync(f)), one = keys.length === 1, hw = one ? im.w : im.w >> 1, hh = one ? im.h : im.h >> 1;
    keys.forEach((k, q) => {
      const ox = one ? 0 : (q % 2) * hw, oy = one ? 0 : (q >> 1) * hh, d = new Uint8Array(hw * hh * 4);
      for (let y = 0; y < hh; y++) d.set(im.data.subarray(((oy + y) * im.w + ox) * 4, ((oy + y) * im.w + ox + hw) * 4), y * hw * 4);
      writeFileSync(resolve(here, 'concept', 'items', 'split', 'seed_' + k + '.png'), encodePNG(hw, hh, d));
    });
  });
}
const only = process.argv.slice(2), list = [...SEEDS, ...SPECIES_SEEDS, ...ITEMS].filter(n => !only.length || only.includes(n));
splitSheets();
const src = n => (SPECIES_SEEDS.includes(n) ? resolve(here, 'concept', 'items', 'split', n + '.png') : resolve(here, 'concept', 'items', n + '.png')), cut = n => resolve(here, 'concept', 'items', 'cut', n + '.png'), dst = n => resolve(repo, 'assets', 'v2', 'items', n + '.png');
mkdirSync(resolve(here, 'concept', 'items', 'cut'), { recursive: true }); mkdirSync(resolve(repo, 'assets', 'v2', 'items'), { recursive: true }); mkdirSync(resolve(here, 'out', 'items'), { recursive: true });
const run = (script, args) => execFileSync(process.execPath, [resolve(here, script), ...args], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const made = [];
for (const n of list) {
  if (!existsSync(src(n))) continue;
  run('greycut.mjs', [src(n), cut(n), '--main']);
  if (n.startsWith('seed_')) {   // 큰 40×46(가방 카드 · 펼친 창 — 2026-10-23 사용자 "아이콘 배경에 비해 종자 크기가 작아 키워줘") + 작은 28×32(종자 거름 칸 · 받은 것 칸)
    console.log(run('itemconv.mjs', [cut(n), dst(n), '--w=40', '--h=46', '--align=bottom'])); console.log(run('itemconv.mjs', [cut(n), dst(n + '_s'), '--w=28', '--h=32', '--align=bottom'])); made.push(n, n + '_s');
  }
  else { console.log(run('itemconv.mjs', [cut(n), dst(n), '--w=44', '--h=44'])); console.log(run('itemconv.mjs', [cut(n), dst(n + '_s'), '--w=28', '--h=28'])); made.push(n, n + '_s'); }
}
// 검토판: 4배 · 어두운 카드 바탕 위에(게임 칸과 비슷하게)
const Z = 4, cell = 48 * Z, cols = 6, rows = Math.ceil(made.length / cols), W = cols * cell, H = Math.max(1, rows) * cell, out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { out[i * 4] = 12; out[i * 4 + 1] = 21; out[i * 4 + 2] = 38; out[i * 4 + 3] = 255; }
made.forEach((n, q) => {
  const im = decodePNG(readFileSync(dst(n))), ox = (q % cols) * cell + Math.floor((cell - im.w * Z) / 2), oy = Math.floor(q / cols) * cell + Math.floor((cell - im.h * Z) / 2);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const s = (y * im.w + x) * 4; if (im.data[s + 3] < 128) continue; for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) { const o = ((oy + y * Z + dy) * W + ox + x * Z + dx) * 4; out[o] = im.data[s]; out[o + 1] = im.data[s + 1]; out[o + 2] = im.data[s + 2]; } }
});
writeFileSync(resolve(here, 'out', 'items', 'sheet.png'), encodePNG(W, H, out));
console.log(`도트 ${made.length}장 → assets/v2/items/ · 검토판 tools/pixel/big/out/items/sheet.png`);
