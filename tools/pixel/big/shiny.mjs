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
// 손 규칙 — 그 후보만 덮어씀. 2026-10-22 사용자 "페탈로즈 c의 풀색이 너무 징그러워 · 아무색이나 넣은 거 같은데 자연스러운 부분에 자연스럽게 ·
//  쨍하게 전체색이 바뀐게 어색해" → 원칙: ① 잎 · 줄기는 자연에 있는 색만(단풍 금빛 · 호박색 · 붉은 덩굴 · 짙은 초록 · 서리 낀 은빛 — 청록 · 보라 잎 금지)
//  ② 바꾸는 곳은 꽃 · 갓 · 불꽃 · 옷 · 도자기 · 바위처럼 색이 달라도 자연스러운 부분 ③ 몸 전체를 바꾸면 채도를 낮춤(ck ≤ 1, 쨍한 색 금지)
const b = (h0, h1, to, o = {}) => ({ h: [h0, h1], to, ...o });
const leaf = (to, o = {}) => ({ h: [70, 175], to, hs: 0.4, l: [0.24, 0.9], ...o });   // 잎 · 줄기 전체(누른 잎 ~ 청록 잎)를 한 색 가까이로
const tintW = (h, c = 0.055) => ({ tint: [h, c], l: [0.5, 0.97], c: 0.045 }), hatT = h => ({ tint: [h, 0.12], l: [0.24, 0.52], c: 0.05 });
const HAND = {
  flower_grass: { C: [b(0, 40, 92, { dl: 0.1, ck: 0.9 })] },   // 노란 장미(A 파란 · B 연보라 장미는 자동) — 옛 C = 청록 잎(징그러움)
  thorn: { A: [leaf(25, { ck: 0.85, dl: -0.04 })], B: [leaf(92, { dl: 0.06, ck: 0.9 })], C: [leaf(122, { hs: 1, ck: 0.35, dl: 0.08 })] },   // 붉은 덩굴 · 볏짚 금빛 · 서리 낀 은빛
  aqua: { A: [b(75, 115, 255, { ck: 0.45, l: [0.75, 1.01] })], B: [b(75, 115, 350, { ck: 0.9, l: [0.75, 1.01] })], C: [b(75, 115, 300, { ck: 0.8, l: [0.75, 1.01] })] },   // 흰 · 분홍 · 보라 연꽃(잎 · 물방울은 그대로)
  flower_wind: { A: [b(275, 340, 235)], B: [b(275, 340, 350, { ck: 0.55, dl: 0.08 })], C: [b(275, 340, 90, { dl: 0.17 })] },   // 파랑 · 벚꽃 분홍 · 금빛 꽃잎
  spark: { A: [b(75, 115, 255, { ck: 0.45, l: [0.6, 1.01] })], B: [b(75, 115, 350, { ck: 0.9, l: [0.6, 1.01] })], C: [b(75, 115, 48, { l: [0.6, 1.01] })] },   // 은빛 · 분홍 · 노을 주황 별꽃
  vine_water: { A: [b(95, 182, 88, { hs: 0.3, dl: 0.04 })], B: [b(95, 182, 40, { hs: 0.3 })], C: [b(195, 265, 250, { ck: 0.2, dl: 0.15 })] },   // 단풍 금빛 · 호박색 잎 · 진주빛 물방울
  cactus_fire: { A: [b(30, 110, 250, { l: [0.55, 1.01], c: 0.08, hs: 0.4, box: [0.22, 0.32, 0.78, 1], out: true, ck: 0.8 })], B: [b(30, 110, 85, { l: [0.55, 1.01], c: 0.08, hs: 0.4, box: [0.22, 0.32, 0.78, 1], out: true, ck: 0.3, dl: 0.08 })], C: [b(30, 110, 300, { l: [0.55, 1.01], c: 0.08, hs: 0.4, box: [0.22, 0.32, 0.78, 1], out: true, ck: 0.8 })] },   // 머리 · 팔 끝 불꽃만(몸 · 가운데 빛은 그대로 — 가운데까지 바꾸면 얼룩처럼 보였음) — 파란 · 하얗게 단 · 보라 불꽃
  gaia: { A: [b(160, 220, 300, { c: 0.04 })], B: [b(160, 220, 355, { c: 0.04 })], C: [b(160, 220, 88, { c: 0.04, dl: 0.12 })] },   // 머리 위 결정만 — 자수정 · 루비 · 황수정(바위 · 이끼는 그대로)
  flower_fire: { A: [b(5, 45, 262)], B: [b(5, 45, 305)], C: [b(5, 45, 92, { dl: 0.17 })] },   // 파란 · 보라 · 금빛 불꽃 백합
  cactus_wind: { A: [leaf(168, { ck: 0.7 })], B: [leaf(88, { dl: 0.06 })], C: [leaf(330, { ck: 0.55 })] },   // 푸른빛 · 금빛 · 자줏빛 선인장(흐리게)
  vine_wind: { B: [b(275, 335, 250, { ck: 0.2, dl: 0.08 })] },   // 은빛 바람(A 금빛 · C 분홍은 자동)
  spore_cap: { B: [b(5, 115, 240, { ck: 0.85 })], C: [b(5, 115, 20)] },   // 남빛 갓 · 붉은 갓(A 자수정 보라는 자동)
  volt_vine: { A: [b(145, 192, 48, { hs: 0.5 })], B: [b(85, 140, 205, { l: [0.68, 1.01] })], C: [b(145, 192, 20)] },   // 호박색 덩굴 · 푸른 번개 · 붉은 덩굴
  stone_cap: { C: [b(35, 115, 30)] },   // 붉은 진흙(A 은빛 · B 분홍은 자동)
  fang_trap: { A: [b(0, 45, 330, { l: [0.25, 0.85], c: 0.08, dl: -0.04 })], B: [b(0, 45, 125, { l: [0.25, 0.85], c: 0.08 })], C: [b(0, 45, 60, { l: [0.25, 0.85], c: 0.08, dl: 0.05 })] },   // 입 안만 — 자줏빛 · 초록 · 주황(몸은 그대로)
  blade_vine: { A: [b(10, 120, 250, { ck: 0.8 })], B: [b(10, 120, 250, { ck: 0.15, dl: 0.08 })], C: [b(10, 120, 300, { ck: 0.8 })] },   // 푸른 불꽃 · 강철 은빛 · 보라
  toxi_cactus: { A: [b(300, 345, 92, { dl: 0.08 })], B: [b(300, 345, 0, { ck: 0.2, dl: 0.15 })], C: [b(80, 160, 168, { hs: 0.5, ck: 0.7 })] },   // 노란 꽃 · 흰 꽃 · 푸른빛 몸
  draco_fruit: { B: [b(170, 240, 290), tintW(290)], C: [b(170, 240, 150), tintW(150, 0.05)] },   // (A 분홍은 자동)
  drake_cactus: { A: [b(35, 75, 70, { l: [0.5, 1.01], c: 0.08, ck: 0.2, dl: 0.12 })], B: [b(35, 75, 230, { l: [0.5, 1.01], c: 0.08, ck: 0.4, dl: 0.1 })], C: [b(35, 75, 180, { l: [0.5, 1.01], c: 0.08, ck: 0.7 })] },   // 배 줄무늬만 — 상아 · 얼음빛 · 청록(붉은 몸은 그대로)
  gat_cap: { A: [hatT(25)], B: [hatT(258)], C: [hatT(305)] },   // 검은 갓 → 붉은 갓(주립) · 남색 · 보라
  mask_vine: { A: [b(40, 95, 67, { l: [0.6, 1.01], c: 0.03, ck: 0.15, dl: 0.12 })], B: [b(40, 95, 20, { l: [0.6, 1.01], c: 0.03, ck: 0.9 })], C: [b(40, 95, 67, { l: [0.6, 1.01], c: 0.03, ck: 0.3, dl: -0.22 })] },   // 탈만 — 흰 탈 · 붉은 탈 · 검게 옻칠한 탈(덩굴은 그대로)
  drum_cactus: { A: [b(55, 115, 25, { l: [0.55, 1.01] })], B: [b(55, 115, 250, { ck: 0.2, dl: 0.1, l: [0.55, 1.01] })], C: [b(55, 115, 205, { ck: 0.8, l: [0.55, 1.01] })] },   // 붉은 · 흰 · 푸른 북
  jar_cactus: { A: [b(150, 230, 25, { ck: 1.4 })], B: [b(150, 230, 220, { ck: 0.25, dl: 0.25 })], C: [b(150, 230, 300, { ck: 1.3 })] },   // 청자 단지 → 진사 · 백자 · 자색 유약
  goblin_cap: { B: [b(25, 105, 25)], C: [b(25, 105, 65, { ck: 0.25, dl: 0.08 })] },   // 붉은 갓(광대버섯) · 흰 갓(A 보라는 자동)
  gladi_cactus: { A: [b(0, 45, 255, { l: [0.25, 0.62], c: 0.07, box: [0, 0, 1, 0.4] })], B: [b(0, 45, 22, { l: [0.25, 0.62], c: 0.07, box: [0, 0, 1, 0.4], ck: 0.12, dl: 0.25 })], C: [b(45, 85, 65, { l: [0.35, 0.8], c: 0.05, ck: 0.15, dl: 0.06 })] },   // 투구 깃 파랑 · 흰 깃 · 강철 갑옷(몸은 그대로)
  jangseung_cactus: { A: [b(35, 95, 65, { ck: 0.25, dl: -0.08 })], B: [b(35, 95, 25)], C: [b(35, 95, 65, { ck: 0.25, dl: 0.12 })] },   // 흑단 · 붉게 칠한 · 흰 자작나무 장승
  hyunmu_cap: { A: [b(205, 245, 155, { ck: 1.4 })], B: [b(205, 245, 300, { ck: 1.4 })], C: [b(205, 245, 25, { ck: 1.4 })] },   // 비취 · 보라 · 청동
  gumiho_bloom: { A: [b(15, 95, 55, { ck: 0.12, dl: 0.15 })], B: [b(15, 95, 85, { dl: 0.05, ck: 0.9 })], C: [b(15, 95, 300, { ck: 0.8 })] },   // 흰 여우 · 금빛 여우 · 보랏빛
  wizard_bell: { A: [b(272, 335, 192)], B: [b(272, 335, 352)], C: [b(272, 335, 245)] },   // 보라 옷 → 청록 · 장미 · 파랑
  ninja_vine: { C: [b(5, 45, 25, { ck: 0.1, dl: -0.12 })] },   // 검은 천(A 파란 · B 보라 천은 자동)
  diver_vine: { A: [b(152, 198, 350, { ck: 1.2 })], B: [b(152, 198, 255, { ck: 1.1 })], C: [b(152, 198, 300, { ck: 1.1 })] },   // 잠수복 분홍 · 파랑 · 보라
  pirate_cactus: { A: [b(222, 262, 25, { ck: 1.2 })], B: [b(222, 262, 300)], C: [b(222, 262, 242, { ck: 0.15, dl: -0.08 })] },   // 빨강 · 보라 · 검은 외투
  frost_drake: { B: [b(165, 260, 300)] },
  ranger_vine: { A: [leaf(88, { dl: 0.04 })], B: [leaf(35)], C: [leaf(150, { dl: -0.06, ck: 0.9 })] },   // 단풍 금빛 · 붉은 갈색 · 짙은 숲 초록
  volcano_cap: { A: [b(15, 80, 47, { l: [0.27, 0.52], c: 0.02, cx: 0.12, box: [0, 0, 1, 0.62], ck: 0.2, dl: 0.12 })], B: [b(0, 45, 85, { l: [0.45, 0.8], c: 0.14, ck: 0.7, dl: 0.1 })], C: [b(15, 80, 47, { l: [0.27, 0.52], c: 0.02, cx: 0.12, box: [0, 0, 1, 0.62], ck: 0.3, dl: -0.1 })] },   // 잿빛 갓 바위 · 하얗게 단 용암 줄 · 흑요석 갓(몸은 그대로)
  lantern_vine: { A: [{ tint: [85, 0.05], l: [0.68, 0.98], c: 0.07 }], B: [{ tint: [305, 0.045], l: [0.68, 0.98], c: 0.07 }], C: [b(45, 100, 72, { ck: 0.15, dl: 0.06, l: [0.35, 0.9], c: 0.06 })] },   // 덩굴 서리만 옅게(등불 천 = 태극 색은 그대로) — 따뜻한 상아 · 연보라 · 금테 → 은테
  viking_cap: { A: [{ tint: [65, 0.09], l: [0.3, 0.8], c: 0.05 }], B: [{ tint: [88, 0.12], l: [0.3, 0.8], c: 0.05, dl: 0.07 }], C: [{ tint: [250, 0.035], l: [0.3, 0.8], c: 0.05, dl: -0.05 }] },   // 투구 · 갑옷(회색 돌판)만 — 청동 · 금 · 무쇠(연한 몸 · 뿔은 그대로)
  miner_cap: { A: [b(20, 100, 25, { c: 0.04, box: [0, 0, 1, 0.47], ck: 1.1, dl: -0.06 })], B: [b(20, 100, 60, { c: 0.04, box: [0, 0, 1, 0.47], ck: 0.2, dl: 0.08 })], C: [b(20, 100, 45, { c: 0.04, box: [0, 0, 1, 0.47], ck: 0.6, dl: -0.12 })] },   // 갓만(위 47% — 몸통과 색이 같아 위치로 가름) — 붉은 · 흰 · 짙은 밤색 갓
  dandel_aero: { A: [b(75, 100, 25, { l: [0.65, 0.97], c: 0.1, dl: -0.15 })], B: [b(75, 100, 235, { l: [0.65, 0.97], c: 0.1 })], C: [b(75, 100, 305, { l: [0.65, 0.97], c: 0.1, ck: 0.8, dl: -0.08 })] },   // 목도리만 — 빨강 · 하늘 · 보라(솜털 · 줄기는 그대로)
};
// 클로드 추천(없으면 A): 사용자가 고르면 여기만 바꾸고 auto --force
const PICK = { aqua: 'B', cactus_wind: 'B', volt_vine: 'B', jar_cactus: 'B', goblin_cap: 'B', jangseung_cactus: 'B', ninja_vine: 'C' };
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
