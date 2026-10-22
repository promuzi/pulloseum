// 색 변종(이로치) 후보 규칙 뽑기(2026-10-22 사용자 "색 변종 그림부터 해줘" — 결정 2026-10-18: 주된 몸 색만 바꾸고 눈 · 화분은 그대로, 종마다 보여 드리고 고름)
//   node tools/pixel/big/shiny.mjs auto [--force] [키…]   → v2/src/art/shinyRules.js (종마다 후보 A · B · C + 고른 것 pick — 이미 있는 종은 --force 때만 다시)
//   검토판 = 게임의 개발용 장면 ?scene=shinylab&page=0~4 (촬영 99_shiny_0~4) — 게임과 같은 색 바꾸기(v2/src/art/shinyColor.js)로 그림
// 뽑는 법: 성체 대기 첫 장(앞뒤 두 층)에서 눈(깜빡임 장과 다른 칸)을 뺀 칸의 색상 분포(OKLCH 10° 칸) → 덩어리 둘까지
//   잎 · 줄기(색상 90~170° · 어두운 편) 덩어리와 특징 덩어리(꽃 · 갓 · 불꽃 · 몸통)를 가르고, 특징이 있으면 A · B = 특징 색 바꿈 · C = 잎 색 바꿈, 없으면 A · B · C = 잎(몸) 색 셋
//   흰 · 회색이 30% 넘는 몸은 같은 목표 색을 옅게 입힘(tint). 목표 색은 아래 TARGET 표(원래 색상 → 후보 셋)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG } from './engine.mjs';
import { toLch, eyeKeep } from '../../../v2/src/art/shinyColor.js';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..'), OUT = resolve(repo, 'v2', 'src', 'art', 'shinyRules.js');
const roster = eval(readFileSync(resolve(repo, 'v2', 'src', 'art', 'sprites.js'), 'utf8').match(/export const ROSTER = (\[[^\]]*\])/)[1]);
// 원래 색상(덩어리 가운데) → 후보 목표 [색상, 채도 배수] 셋 — 포켓몬 이로치처럼 '같은 그림 다른 물감'(보색 · 금빛 · 은빛 계열 위주)
const TARGET = [
  [0, 40, [[262, 1], [305, 1], [88, 1]]],        // 빨강 → 파랑 · 보라 · 금빛
  [40, 75, [[300, 0.9], [235, 0.9], [355, 1]]],   // 주황 · 갈색 → 보라 · 파랑 · 분홍
  [75, 100, [[255, 0.45], [350, 0.9], [205, 0.9]]], // 노랑(밝은 꽃) → 은빛 파랑 · 분홍 · 하늘
  [100, 170, [[205, 0.9], [40, 1], [300, 0.85]]], // 초록(잎 · 선인장) → 청록 파랑 · 단풍 · 보라
  [170, 215, [[345, 1], [88, 1], [295, 1]]],      // 청록 → 분홍 · 금빛 · 보라
  [215, 270, [[345, 1], [88, 1], [150, 1]]],      // 파랑 → 분홍 · 금빛 · 초록
  [270, 330, [[88, 1], [190, 1], [355, 1]]],      // 보라 → 금빛 · 청록 · 장미
  [330, 360, [[250, 1], [88, 1], [165, 1]]],      // 분홍 → 파랑 · 금빛 · 민트
];
const FOLIAGE = [[205, 0.9], [40, 1], [300, 0.85]];
// 손 규칙(2026-10-22 첫 검토판에서 자동 후보가 거의 안 바뀌었거나 금빛이 탁한 올리브가 된 종) — 그 후보만 덮어씀
const tintW = (h, c = 0.055) => ({ tint: [h, c], l: [0.5, 0.97], c: 0.045 }), hatT = h => ({ tint: [h, 0.12], l: [0.24, 0.52], c: 0.05 });
const HAND = {
  aqua: { C: [{ h: [165, 255], to: 300, ck: 1.1 }] },   // 물방울 몸통 → 보라(연꽃은 그대로)
  flower_wind: { A: [{ h: [275, 340], to: 235 }] },   // 보라 꽃잎 → 파랑
  vine_water: { A: [{ h: [140, 182], to: 300, ck: 1.4 }, { h: [195, 265], to: 340 }], B: [{ h: [140, 182], to: 45, ck: 1.6 }], C: [{ h: [140, 182], to: 205, ck: 1.6 }] },   // 청록 잎 → 보라(+ 물방울 분홍) · 호박색 · 짙은 바다색
  volt_vine: { A: [{ h: [145, 192], to: 295 }], B: [{ h: [85, 140], to: 205, l: [0.68, 1.01] }], C: [{ h: [145, 192], to: 20, ck: 1.3 }] },   // 덩굴 보라 · 번개 하늘 · 덩굴 진홍
  draco_fruit: { B: [{ h: [170, 240], to: 290 }, tintW(290)], C: [{ h: [170, 240], to: 150 }, tintW(150, 0.05)] },
  cactus_fire: { C: [{ h: [0, 50], to: 195 }] }, flower_fire: { C: [{ h: [0, 60], to: 195 }] }, drake_cactus: { C: [{ h: [5, 60], to: 160 }] },   // 탁한 금빛 대신 청록 · 비취
  gat_cap: { A: [hatT(25)], B: [hatT(258)], C: [hatT(305)] },   // 검은 갓 → 붉은 갓(주립) · 남색 · 보라
  jar_cactus: { A: [{ h: [150, 230], to: 25, ck: 1.7 }], B: [{ h: [150, 230], to: 220, ck: 0.25, dl: 0.25 }], C: [{ h: [150, 230], to: 300, ck: 1.6 }] },   // 청자 단지 → 진사 · 백자 · 보라
  hyunmu_cap: { A: [{ h: [205, 245], to: 155, ck: 1.7 }], B: [{ h: [205, 245], to: 300, ck: 1.7 }], C: [{ h: [205, 245], to: 25, ck: 1.7 }] },
  wizard_bell: { A: [{ h: [272, 335], to: 192 }], B: [{ h: [272, 335], to: 352 }], C: [{ h: [272, 335], to: 245 }] },   // 보라 옷 → 청록 · 장미 · 파랑
  diver_vine: { A: [{ h: [152, 198], to: 350, ck: 1.5 }], B: [{ h: [152, 198], to: 255, ck: 1.3 }], C: [{ h: [152, 198], to: 300, ck: 1.3 }] },
  pirate_cactus: { A: [{ h: [222, 262], to: 25, ck: 1.3 }], B: [{ h: [222, 262], to: 300 }] },   // 파란 외투 → 빨강 · 보라
  frost_drake: { B: [{ h: [165, 260], to: 300 }] },
};
// 클로드 추천(2026-10-22 검토판 — 없으면 A): 사용자가 고르면 여기만 바꾸고 auto --force
const PICK = { aqua: 'B', vine_wind: 'B', jar_cactus: 'B', viking_cap: 'B' };
const targetsOf = c => (TARGET.find(([a, b]) => c >= a && c < b) || TARGET[0])[2];
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
function analyse(key) {
  const im = decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'plants', key + '.png'))), m = JSON.parse(readFileSync(resolve(repo, 'assets', 'v2', 'plants', key + '.json'), 'utf8'));
  const keep = eyeKeep(im.data, im.w, m), hist = new Array(36).fill(0), lsum = new Array(36).fill(0);
  let tot = 0, grey = 0;
  for (const layer of [0, m.rows]) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const s = ((layer * m.h + y) * im.w + x) * 4; if (im.data[s + 3] < 128) continue;
    if (keep.has((im.data[s] << 16) | (im.data[s + 1] << 8) | im.data[s + 2])) continue;
    const [L, C, H] = toLch(im.data[s], im.data[s + 1], im.data[s + 2]); if (L < 0.3) continue;
    tot++;
    if (C < 0.045) { if (L > 0.5) grey++; continue; }
    const b = Math.floor(H / 10) % 36; hist[b]++; lsum[b] += L;
  }
  // 덩어리: 가장 큰 칸에서 이웃 칸(가장 큰 칸의 12% 넘는)으로 넓힘 · 폭 최대 100°
  const used = new Array(36).fill(false), chroma = hist.reduce((a, b) => a + b, 0), cl = [];
  for (let n = 0; n < 2; n++) {
    let pk = -1; for (let i = 0; i < 36; i++) if (!used[i] && (pk < 0 || hist[i] > hist[pk])) pk = i;
    if (pk < 0 || hist[pk] < chroma * 0.08) break;
    let lo = pk, hi = pk, mass = hist[pk], ls = lsum[pk]; used[pk] = true;
    for (let grew = true; grew;) {
      grew = false;
      const a = (lo + 35) % 36, b = (hi + 1) % 36;
      if (!used[a] && hist[a] >= hist[pk] * 0.12 && (hi - a + 36) % 36 < 10) { lo = a; used[a] = true; mass += hist[a]; ls += lsum[a]; grew = true; }
      if (!used[b] && hist[b] >= hist[pk] * 0.12 && (b - lo + 36) % 36 < 10) { hi = b; used[b] = true; mass += hist[b]; ls += lsum[b]; grew = true; }
    }
    const h0 = (lo * 10 + 355) % 360, h1 = (hi * 10 + 15) % 360, center = (lo * 10 + ((hi - lo + 36) % 36 + 1) * 5) % 360, meanL = ls / mass;
    cl.push({ h: [h0, h1], center, mass: mass / Math.max(1, chroma), share: mass / Math.max(1, tot), foliage: center >= 90 && center < 170 && meanL < 0.7, meanL });
  }
  return { cl, greyShare: grey / Math.max(1, tot) };
}
function candidates(key) {
  const { cl, greyShare } = analyse(key), [a, b] = cl;
  // 잎 · 줄기 띠는 올리브(누른 잎)부터 청록 잎까지 넓혀 잡음(잎 일부만 바뀌던 것 — 페탈로즈 왼쪽 큰 잎) · 밝은 노란 꽃잎은 밝기로 뺌
  const band = (c, [to, ck]) => (c.foliage ? { h: [Math.min(c.h[0], 72), Math.max(c.h[1], 172)], to: (to + (Math.min(c.h[0], 72) + Math.max(c.h[1], 172)) / 2 - (c.h[0] + (c.h[1] - c.h[0]) / 2) + 360) % 360, ck, l: [0.24, 0.86] } : { h: c.h, to, ck });
  const tint = to => (greyShare >= 0.3 ? [{ tint: [to, 0.055], l: [0.5, 0.97], c: 0.045 }] : []);
  let A, B, C;
  if (!a) { A = tint(350); B = tint(88); C = tint(205); }
  else {
    const feat = !a.foliage ? a : b && !b.foliage && b.mass >= 0.18 ? b : null, leaf = a.foliage ? a : b && b.foliage ? b : null;
    if (feat) { const T = targetsOf(feat.center); A = [band(feat, T[0]), ...tint(T[0][0])]; B = [band(feat, T[1]), ...tint(T[1][0])]; C = leaf ? [band(leaf, FOLIAGE[0]), ...tint(T[2][0])] : [band(feat, T[2]), ...tint(T[2][0])]; }
    else { A = [band(leaf, FOLIAGE[0])]; B = [band(leaf, FOLIAGE[1])]; C = [band(leaf, FOLIAGE[2])]; }
  }
  const info = cl.map(c => `${c.foliage ? '잎' : '특징'} ${c.h.map(Math.round).join('~')}° ${Math.round(c.share * 100)}%`).join(' · ') + (greyShare >= 0.3 ? ` · 흰 몸 ${Math.round(greyShare * 100)}%` : ''), H = HAND[key] || {};
  return { A: H.A || A, B: H.B || B, C: H.C || C, info: info + (HAND[key] ? ' · 손 규칙 ' + Object.keys(H).join('') : '') };
}
const fmtBand = t => '{ ' + Object.entries(t).map(([k, v]) => k + ': ' + JSON.stringify(Array.isArray(v) ? v.map(x => (typeof x === 'number' ? r2(x) : x)) : typeof v === 'number' ? r2(v) : v)).join(', ') + ' }';
const args = process.argv.slice(2), cmd = args[0], force = args.includes('--force'), pick = args.filter(a => !a.startsWith('--')).slice(1);
if (cmd !== 'auto') { console.log('node tools/pixel/big/shiny.mjs auto [--force] [키…]'); process.exit(1); }
let old = {};
if (existsSync(OUT)) { const t = readFileSync(OUT, 'utf8').match(/export const SHINY_RULES = (\{[\s\S]*?\n\});/); if (t) old = eval('(' + t[1] + ')'); }
const lines = [];
for (const key of roster) {
  if (old[key] && !(force && (!pick.length || pick.includes(key)))) { const o = old[key]; lines.push(`  ${key}: { pick: '${o.pick}', A: [${o.A.map(fmtBand).join(', ')}], B: [${o.B.map(fmtBand).join(', ')}], C: [${o.C.map(fmtBand).join(', ')}] },` + (o.note ? '' : '')); continue; }
  if (!existsSync(resolve(repo, 'assets', 'v2', 'plants', key + '.png'))) continue;
  const c = candidates(key);
  lines.push(`  ${key}: { pick: '${PICK[key] || 'A'}', A: [${c.A.map(fmtBand).join(', ')}], B: [${c.B.map(fmtBand).join(', ')}], C: [${c.C.map(fmtBand).join(', ')}] },   // ${c.info}`);
  console.log(key.padEnd(18), c.info);
}
const head = `// 색 변종(이로치) 규칙 — 종마다 후보 A · B · C 와 고른 것(pick). 처음 후보는 tools/pixel/big/shiny.mjs auto 가 뽑고, 사용자가 고르면 pick 만 바꿈(2026-10-22)
//  띠 = { h: [색상 범위°], to: 띠 가운데가 갈 색상°, ck: 채도 배수 } · 흰 몸 = { tint: [색상°, 채도], l: [밝기 범위], c: 최대 채도 } — 뜻은 v2/src/art/shinyColor.js
//  검토판 = ?scene=shinylab&page=0~4(촬영 99_shiny_0~4) · 생장 단계(어린 · 자람)도 같은 규칙
`;
writeFileSync(OUT, head + 'export const SHINY_RULES = {\n' + lines.join('\n') + '\n};\n');
console.log('→', OUT, lines.length + '종');
