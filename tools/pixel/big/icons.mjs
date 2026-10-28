// 아이콘 · 레벨업 상자 · 탐사 행성(2026-10-22 사용자 "전부해봐"): 코덱스 원화(concept/icons2/ — 한 장에 넷 · 상자는 둘) → 칸 자르기 → 누끼(greycut) → 작은 도트(itemconv)
//   node tools/pixel/big/icons.mjs [이름…]   → assets/v2/icons/ + 검토판 out/icons/sheet.png
//   아이콘 = 손그림과 같은 크기(<이름>.png — 11칸 · 하단 탭 15칸) + 두 배(<이름>_b.png — 그림을 2배로 그리던 자리에 저절로) · 하단 탭은 띠용 22칸(<이름>_n.png)
//   물건 그림에서 뽑는 아이콘(물뿌리개 can · 비료 fert · 회귀 주사 potion · 연료 fuel · 부품 parts) = concept/items/cut/item_*.png
//   효과 아이콘(fx_* · env_* · trap_* · summon_*) = concept/icons3/ — 효과 · 스킬 분류 엑셀 기준(짝 표 docs/superpowers/specs/2026-10-22-v2-effect-icons.md)
//   효과 창 · 효과 칩 아이콘 = 18칸(<이름>_m.png — 2026-10-23 사용자 "상태이상 아이콘이 픽셀화 하면서 너무 작아져서 알아보기 힘들어": 11칸은 원화가 뭉개짐) — 효과 · 상태 · 능력치 바탕(검 · 방패 · 신발 · 치명 · 과녁)만
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { decodePNG, encodePNG } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..'), CON = resolve(here, 'concept', 'icons2');
// 판 → 칸 이름(왼위 · 오른위 · 왼아래 · 오른아래 / 둘이면 왼 · 오른) — 요청서 ICONS_PROMPT.md 와 같은 차례
const SHEETS = {
  icons_01: ['navShop', 'navExplore', 'navHome', 'navNursery'], icons_02: ['navShip', 'navBag', 'navBook', 'gear'], icons_03: ['coin', 'gem', 'energy', 'lock'],
  icons_04: ['fire', 'water', 'grass', 'earth'], icons_05: ['wind', 'bolt', 'ice', 'flower'], icons_06: ['cactus', 'vine', 'mushroom', 'heart'],
  // 08~12 의 비운 칸(null) = 엑셀 효과 아이콘(fx_*)으로 바뀐 옛 상태 그림(화상 · 독 · 젖음 · 빙결 · 감전 · 덩굴 · 강풍 · 그늘 · 도발 · 약화 · 부식 · 공격↑ — 2026-10-22, 원화는 기록으로 둠)
  icons_07: ['sword', 'shield', 'speed', 'target'], icons_08: ['sparkle', 'crit', null, null], icons_09: [null, null, null, 'st_stun'],
  icons_10: [null, 'st_spore', null, null], icons_11: [null, null, null, 'st_frozen'], icons_12: ['st_paral', 'st_leech', 'st_root', null],
  // 효과 · 스킬 분류 엑셀 v10 기준 효과 아이콘(concept/icons3/FX_PROMPT.md — 2026-10-22 사용자 "아이콘은 엑셀 … 기준으로")
  fx_01: ['fx_burn', 'fx_poison', 'fx_bleed', 'fx_shock'], fx_02: ['fx_chill', 'fx_wet', 'fx_shade', 'fx_seal'], fx_03: ['fx_taunt', 'fx_regen', 'fx_will', 'fx_immune'],
  fx_04: ['fx_aim', 'fx_stealth', 'fx_barrier', 'fx_evade'], fx_05: ['fx_reflect', 'fx_armor', 'env_gale', 'env_inferno'],
  fx_06: ['env_fortress', 'env_sandcastle', 'env_sandstorm', 'env_healcastle'], fx_07: ['env_hellfort', 'env_walkcastle', 'trap_thorn', 'summon_guard'],
  fx_08: ['env_storm', 'res_reso', 'res_evstack', 'fx_counter'],
  fx_10: ['env_morning', 'env_night', 'env_miasma', 'fx_fruit'], fx_11: ['fx_revive', 'fx_bounce', 'fx_charm', 'fx_execute'], fx_12: ['fx_settle', 'fx_inject', 'res_prep', null],   // 2026-10-29 아홉 종(concept/icons3/FX10_PROMPT.md)
  fx_09: ['env_cave', 'sum_sleep', 'sum_baby', 'sum_adult'],   // 둘째 묶음(2026-10-24 — concept/icons3/FX9_PROMPT.md): 동굴 · 잠든 포자 · 새끼 · 성체 버섯   // 종 고유 v2 첫 묶음(2026-10-24 — concept/icons3/FX8_PROMPT.md): 폭풍 · 공명 셈 · 피한 스택 · 반격
  icons_13: ['chest_body', null], icons_17: ['chest_closed', null],   // 상자: 열린 몸통(13 왼쪽) · 닫힌 상자(17 — 13 오른쪽 뚜껑은 몸통과 각도가 달라 안 씀)
  planets_14: ['planet_ex_ermias', 'planet_ex_calisto', 'planet_ex_seraphin', 'planet_ex_kairen'], planets_15: ['planet_ex_mirdin', 'planet_ex_volkar', 'planet_ex_veloc', 'planet_ex_aztel'], planets_16: ['planet_ex_octavis', 'planet_ex_nereidon', 'planet_ex_tiamen', null],
};
// 조각이 떨어져 있는 그림 = 누끼에서 가장 큰 덩어리만 남기지 않음(--main 빼기): 조준 틀 넷 + 점 · 회피 잔상 줄 · 출혈 자국 + 방울 · 감전 고리 안 잎 · 젖음 방울 · 독 거품
const PARTS = new Set(['fx_aim', 'fx_evade', 'fx_bleed', 'fx_shock', 'fx_wet', 'fx_poison', 'env_gale', 'trap_thorn', 'env_storm', 'res_reso', 'res_evstack', 'fx_counter', 'sum_sleep', 'env_night', 'env_miasma', 'fx_bounce', 'res_prep']);
const FROM_ITEM = { can: 'item_water', fert: 'item_fert', potion: 'item_regress', fuel: 'item_fuel', parts: 'item_parts' };
const NAV = new Set(['navShop', 'navExplore', 'navHome', 'navNursery', 'navShip', 'navBag', 'navBook']);
const PLANET_D = { ex_ermias: 15, ex_calisto: 15, ex_seraphin: 15, ex_kairen: 15, ex_mirdin: 15, ex_volkar: 15, ex_veloc: 17, ex_aztel: 17, ex_octavis: 17, ex_nereidon: 19, ex_tiamen: 19 };   // 궤도 반지름 RAD(7 · 7 · 8 · 9) × 2 + 1
// 이름 → 만들 그림들 [파일 이름, 가로, 세로, 정렬]
function outs(n) {
  if (n.startsWith('chest_')) return [];   // 상자는 아래 1-2)에서 같은 틀로
  if (n.startsWith('planet_')) { const d = PLANET_D[n.slice(7)] || 15; return n === 'planet_ex_nereidon' ? [[n, 35, d, 'center']] : [[n, d, d, 'center']]; }
  if (NAV.has(n)) return [[n, 15, 15, 'center'], [n + '_b', 30, 30, 'center'], [n + '_n', 22, 22, 'center']];
  return [[n, 11, 11, 'center'], [n + '_b', 22, 22, 'center'], ...(MID(n) ? [[n + '_m', 18, 18, 'center']] : [])];
}
// 18칸 효과 창 아이콘을 만드는 그림(art/icons.js MID 와 같은 목록)
function MID(n) { return /^(fx_|st_|env_|trap_|summon_)/.test(n) || ['sword', 'shield', 'speed', 'crit', 'target'].includes(n); }
const only = process.argv.slice(2);
const dirOf = sheet => sheet.startsWith('fx_') ? resolve(here, 'concept', 'icons3') : CON;   // 판이 있는 폴더(엑셀 효과 아이콘 = icons3)
for (const D of [CON, dirOf('fx_')]) { mkdirSync(resolve(D, 'split'), { recursive: true }); mkdirSync(resolve(D, 'cut'), { recursive: true }); }
mkdirSync(resolve(repo, 'assets', 'v2', 'icons'), { recursive: true }); mkdirSync(resolve(here, 'out', 'icons'), { recursive: true });
const run = (script, args) => execFileSync(process.execPath, [resolve(here, script), ...args], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const want = n => !only.length || only.includes(n);
const made = [];
// 1) 판 자르기
for (const [sheet, names] of Object.entries(SHEETS)) {
  const DIR = dirOf(sheet), f = resolve(DIR, sheet + '.png'); if (!existsSync(f)) continue;
  const im = decodePNG(readFileSync(f)), two = names.length === 2, cw = im.w >> 1, ch = two ? im.h : im.h >> 1;
  names.forEach((n, q) => {
    if (!n || !want(n)) return;
    const ox = (q % 2) * cw, oy = two ? 0 : (q >> 1) * ch, d = new Uint8Array(cw * ch * 4);
    for (let y = 0; y < ch; y++) d.set(im.data.subarray(((oy + y) * im.w + ox) * 4, ((oy + y) * im.w + ox + cw) * 4), y * cw * 4);
    const sp = resolve(DIR, 'split', n + '.png'), cp = resolve(DIR, 'cut', n + '.png');
    writeFileSync(sp, encodePNG(cw, ch, d));
    run('greycut.mjs', [sp, cp, ...(PARTS.has(n) ? [] : ['--main'])]);
    for (const [fn, w, h, al] of outs(n)) { console.log(run('itemconv.mjs', [cp, resolve(repo, 'assets', 'v2', 'icons', fn + '.png'), '--w=' + w, '--h=' + h, '--align=' + al, ...(w <= 15 ? ['--colors=10'] : [])])); made.push(fn); }
  });
}
// 1-2) 레벨업 상자: 닫힌 상자(17) · 열린 몸통(13)을 같은 틀(CW×CH)에 줄임 — 몸통은 아래 40%(줄무늬 · 범퍼)를 견줘 닫힌 상자 자리에 맞춤
//   뚜껑 = 줄인 닫힌 상자에서 이음매 선(SEAM — 틀 칸 [x, y] 꺾은선) 위쪽 · 뚜껑 아래 끝 줄 = 먹선(들렸을 때 따로 된 판으로 보이게)
const CW = 64, CH = 54, SEAM = [[0, 18], [8, 20], [23, 30], [55, 21], [63, 21]];
if (['chest_closed', 'chest_body', 'chest_lid'].some(want)) {
  const cf = resolve(CON, 'cut', 'chest_closed.png'), bf = resolve(CON, 'cut', 'chest_body.png');
  if (existsSync(cf) && existsSync(bf)) {
    const A = decodePNG(readFileSync(cf)), B = decodePNG(readFileSync(bf));
    const op = (I, x, y) => x >= 0 && y >= 0 && x < I.w && y < I.h && I.data[(y * I.w + x) * 4 + 3] >= 128;
    let ay0 = A.h, ay1 = -1; for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) if (op(A, x, y)) { if (y < ay0) ay0 = y; if (y > ay1) ay1 = y; }
    const ys = Math.round(ay0 + (ay1 - ay0) * 0.6);
    let best = [0, 0], bs = Infinity;
    for (let dy = -24; dy <= 24; dy++) for (let dx = -24; dx <= 24; dx++) {
      let sc = 0;
      for (let y = ys; y <= ay1; y += 3) for (let x = 0; x < A.w; x += 3) {
        const a = op(A, x, y), b = op(B, x - dx, y - dy);
        if (!a && !b) continue;
        if (a !== b) { sc += 765; continue; }
        const i = (y * A.w + x) * 4, j = ((y - dy) * B.w + x - dx) * 4;
        sc += Math.abs(A.data[i] - B.data[j]) + Math.abs(A.data[i + 1] - B.data[j + 1]) + Math.abs(A.data[i + 2] - B.data[j + 2]);
      }
      if (sc < bs) { bs = sc; best = [dx, dy]; }
    }
    const [dx, dy] = best, B2 = new Uint8Array(A.w * A.h * 4);
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) if (op(B, x - dx, y - dy)) B2.set(B.data.subarray(((y - dy) * B.w + x - dx) * 4, ((y - dy) * B.w + x - dx) * 4 + 4), (y * A.w + x) * 4);
    const bal = resolve(CON, 'cut', 'chest_body_al.png'); writeFileSync(bal, encodePNG(A.w, A.h, B2));
    let x0 = A.w, y0 = A.h, x1 = -1, y1 = -1;
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) if (A.data[(y * A.w + x) * 4 + 3] >= 128 || B2[(y * A.w + x) * 4 + 3] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    console.log(`상자 몸통 어긋남 (${dx}, ${dy}) · 틀 ${x0},${y0}–${x1},${y1}`);
    const box = '--box=' + [x0, y0, x1, y1].join(','), oc = resolve(here, 'out', 'icons', 'chest_closed.png');   // 닫힌 상자 = 뚜껑을 떼어 낼 바탕(게임은 몸통 + 뚜껑만 씀)
    console.log(run('itemconv.mjs', [cf, oc, '--w=' + CW, '--h=' + CH, '--align=bottom', box]));
    console.log(run('itemconv.mjs', [bal, resolve(repo, 'assets', 'v2', 'icons', 'chest_body.png'), '--w=' + CW, '--h=' + CH, '--align=bottom', box])); made.push('chest_body');
    if (SEAM) {
      const C = decodePNG(readFileSync(oc)), L = new Uint8Array(CW * CH * 4);
      const seam = x => { for (let k = 1; k < SEAM.length; k++) { const [xa, ya] = SEAM[k - 1], [xb, yb] = SEAM[k]; if (x <= xb || k === SEAM.length - 1) return ya + (yb - ya) * Math.max(0, Math.min(1, (x - xa) / ((xb - xa) || 1))); } return SEAM[0][1]; };
      for (let x = 0; x < CW; x++) {
        const sy = Math.round(seam(x)); let last = -1;
        for (let y = 0; y <= Math.min(CH - 1, sy); y++) { const i = (y * CW + x) * 4; if (C.data[i + 3] < 128) continue; L.set(C.data.subarray(i, i + 4), i); last = y; }
        if (last >= 0) { const i = (last * CW + x) * 4; L[i] = 46; L[i + 1] = 34; L[i + 2] = 47; }
      }
      writeFileSync(resolve(repo, 'assets', 'v2', 'icons', 'chest_lid.png'), encodePNG(CW, CH, L)); made.push('chest_lid');
    }
  }
}
// 2) 물건 그림에서 뽑는 아이콘
for (const [n, item] of Object.entries(FROM_ITEM)) {
  if (!want(n)) continue;
  const cp = resolve(here, 'concept', 'items', 'cut', item + '.png'); if (!existsSync(cp)) continue;
  for (const [fn, w, h, al] of outs(n)) { console.log(run('itemconv.mjs', [cp, resolve(repo, 'assets', 'v2', 'icons', fn + '.png'), '--w=' + w, '--h=' + h, '--align=' + al, ...(w <= 15 ? ['--colors=10'] : [])])); made.push(fn); }
}
// 3) 검토판: 4배 · 어두운 바탕
const Z = 4, cell = 72 * Z, cols = 8, rows = Math.max(1, Math.ceil(made.length / cols)), W = cols * cell, H = rows * cell, out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { out[i * 4] = 12; out[i * 4 + 1] = 21; out[i * 4 + 2] = 38; out[i * 4 + 3] = 255; }
made.forEach((fn, q) => {
  const im = decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'icons', fn + '.png'))), ox = (q % cols) * cell + Math.floor((cell - im.w * Z) / 2), oy = Math.floor(q / cols) * cell + Math.floor((cell - im.h * Z) / 2);
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const s = (y * im.w + x) * 4; if (im.data[s + 3] < 128) continue; for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) { const o = ((oy + y * Z + dy) * W + ox + x * Z + dx) * 4; out[o] = im.data[s]; out[o + 1] = im.data[s + 1]; out[o + 2] = im.data[s + 2]; } }
});
writeFileSync(resolve(here, 'out', 'icons', 'sheet.png'), encodePNG(W, H, out));
console.log(`도트 ${made.length}장 → assets/v2/icons/ · 검토판 tools/pixel/big/out/icons/sheet.png`);
