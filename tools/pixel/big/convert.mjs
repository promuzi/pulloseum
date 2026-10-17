// 컨셉 아트 → 도트 변환: 그림 자체를 도트로 만든다(따라 그리기가 아니라 같은 그림).
//   node tools/pixel/big/convert.mjs <키…>             변환 → out/conv/<키>_96x112.png
//   node tools/pixel/big/convert.mjs --measure <키…>   컨셉마다 흙 타원·식물 키 재기
//   node tools/pixel/big/convert.mjs --anim <키…>      변환 + 움직임 64장(숨쉬기·깜빡임·불·전기, motion.mjs) → out/conv/<키…>.gif + <키>_idle.gif (--mp4면 휴대폰용 MP4도)
//   node tools/pixel/big/convert.mjs --stages <키>     생장 3단계(어린·자람·성체) 검토판
// 입력: concept/cut/<키>.png(코덱스가 화분·배경을 지운 투명 누끼)가 있으면 그것, 없으면 concept/<키>.png 에서 배경·화분을 직접 지운다.
// 도트답게 만드는 순서(평균 축소는 경계가 뭉개지고 붓 질감이 남아 도트 느낌이 없어진다):
//   ① 재질 나누기 — 색상·채도 위주 k-평균으로 꽃잎·잎·얼굴·불 같은 재질 K개
//   ② 재질마다 밝기를 4단 띠로(그 재질 픽셀의 밝기 분위수) → 재질×단 = 팔레트
//   ③ 줄이기 — 도트 칸마다 원본 블록의 '다수 재질' 하나만 고르고, 그 재질 픽셀의 평균 단 → 섞인 색·흐린 경계 없음
//   ④ 정리 — 외딴 재질 칸·외딴 단 칸을 이웃에 맞춤(눈·반짝임처럼 아주 어둡거나 밝은 재질은 남김)
//   ⑤ 외곽선 — 실루엣은 selout(밑면 잉크·그늘 쪽 진하게·빛 쪽 옅게), 밝기 차 큰 재질 경계는 어두운 쪽 칸을 그 재질의 외곽선 색으로
//   ⑥ 밑동을 흙 속으로 몇 칸 늘려(화분 앞 테가 가림) 심긴 것처럼
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePNG, Img, oklab, fromOklab, INK, BAYER4, rng } from './engine.mjs';
import { W, H, EYE } from './parts.mjs';
import { EYES } from './eyes.mjs';
import { POT_GEO, POT3, renderPot } from './pot3d.mjs';
import { plantInPot } from './potblend.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), measure = args.includes('--measure'), anim = args.includes('--anim'), keys = args.filter(a => !a.startsWith('--'));
const EYES_ON = args.includes('--eyes');   // 눈 덧그리기(EYE 틀) — 사용자 판단으로 끔(2026-10-15 "눈 인식을 못하는 것 같으니 그냥 둬"). 켜려면 --eyes
const BLINK = args.includes('--blink');    // 그려진 눈은 그대로 두고, 깜빡일 때만 실제 눈 칸을 눈꺼풀로 덮는다(2026-10-15 사용자 "그림 바꾸지 말고 실제 눈을 인식해서")
const MP4 = args.includes('--mp4');        // 움직임을 GIF와 함께 휴대폰에서도 재생되는 MP4로(사용자가 원격 휴대폰으로 확인 — video.mjs)
const hueOf = (A, B) => (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
// 종별 변환 조정: fill = 도트 칸을 채우는 원본 비율 문턱(기본 0.5) — 1칸보다 가는 줄기·깃털 꽃잎이 끊기는 종은 낮춘다
//  eyeVivid = 눈 칸을 눈 안에서 15% 넘게 차지하는 재질 중 가장 채도 높은 것으로 — 노란 눈동자가 크림빛 얼굴과 같은 무리로 묶여 선만 남는 종(볼트바인, 2026-10-16)
//  eyeDark = 눈 칸을 그 재질의 어두운 단(값 이하)으로 — 몸과 눈이 같은 색 계열이라 줄이면 눈이 몸 색에 묻히는 종(프로스트벨: 얼음빛 종에 푸른 눈, 2026-10-16)
//  soft = 원화를 줄이기 전에 몸 칸끼리 살짝 흐림(원화 칸 반지름) — 한 칸보다 잘게 갈라진 질감이 점으로 튀는 종(softBlur)
const TUNE = { flower_wind: { fill: 0.3 }, gaia: { youngArea: 0.34, teenArea: 0.58 }, thorn: { youngArea: 0.3, teenMinArea: 0.7, teenCapAdd: 6 }, vine_water: { potClean: true }, frost_bell: { eyeDark: 0.6 }, pirate_cactus: { eyeDark: 0.5 }, ranger_vine: { soft: 5, fill: 0.4 }, snow_ballet: { eyeDark: 0.5, fill: 0.4 }, dandel_aero: { eyeDark: 0.4 }, volt_vine: { km: 11, eyeVivid: true }, jelly_cap: { eyeDark: 1.4 }, fang_trap: { eyeDark: 0.8 }, blade_vine: { eyeDark: 0.8, fit: 1.2 }, toxi_cactus: { eyeDark: 0.9 }, draco_fruit: { eyeDark: 0.8 }, frost_drake: { eyeDark: 0.8 }, title_hero: { eyeVivid: true }, drake_cactus: { eyeVivid: true, eyeHold: true, fit: 1.05, accent: { lmin: 0.76, hue: [60, 105], cmin: 0.05, ctx: 0.62, min: 0.16, shape: 'needle' } }, ember_cap: { eyeDark: 0.9 }, viking_cap: { soft: 7 }, gumiho_bloom: { soft: 5, eyeDark: 0.5, km: 11 }, astro_cap: { eyeDark: 0.8 }, wizard_bell: { fit: 1.06, teenArea: 0.55, youngArea: 0.32 } };   // 셋째 아홉(2026-10-17): 서리 털 질감 흐리기 · 가는 여우 눈 · 흰 얼굴의 푸른 눈 · 마법사(사용자 "덩치 커지면 좋을 듯 — 중간체보다 머리나 몸통이 작은 느낌": 자람의 큰 종 머리가 성체 얼굴보다 커 보임 → 성체 ×1.06, 자람 55% · 어린 32%)   // 변이 고정 새 다섯(2026-10-17): 눈이 가늘어 줄이면 살결에 묻힘 → 눈 칸을 어둡게
// 줄기 시작점 = 화분 가운데(2026-10-15 사용자 "식물의 줄기 시작점이 화분의 중앙에 오게 해줘. 애매한 것은 임시로 중앙에 선을 그어서 중앙에 배치"):
//  흙 타원 가운데로 놓으면 컨셉 그림에서 줄기가 화분 가운데서 비껴 그려진 만큼 그대로 비껴 남는다(타이드바인 +5칸 — 대기실 12° 화분은 흙 띠가 얇아 밑동이 가려져 더 쏠려 보임).
//  판 칸 단위로 통째로 옮긴다(그림은 한 칸도 안 바뀜) — 값 = 옮길 칸(− 왼쪽). 정한 법: node tools/pixel/big/stemcheck.mjs 가운데 선 판에서 흙 바로 위 줄기(여러 줄기·밑동이 가려진 종은 밑동 덩어리 가운데)를 선에 맞춤.
//  표에 없는 그림은 변환 때 줄기를 재서 1.5칸 넘게 비끼면 경고한다(아래 convert)
// 흙에 앉히기(판 칸, + = 아래 · 앞으로) — 밑동이 넓은 몸(아래 SINK 설명 · 2026-10-17)
const SINK = {snow_ballet_young: 1, snow_ballet: 1, pirate_cactus_young: 3, pirate_cactus_teen: 2, pirate_cactus: 2, ranger_vine_young: 1, ranger_vine_teen: 1, ranger_vine: 1, miner_cap_young: 3, miner_cap_teen: 3, miner_cap: 2, volcano_cap_young: 2, volcano_cap_teen: 2, volcano_cap: 2, dandel_aero_young: 1, dandel_aero_teen: 1, dandel_aero: 1, flower_grass_young: 1, flower_grass_teen: 1, flower_grass: 1, thorn_young: 2, thorn_teen: 1, thorn: 1, aqua_young: 1, aqua_teen: 1, spark: 1, vine_water_young: 1, vine_water_teen: 1, cactus_fire_young: 2, cactus_fire_teen: 3, cactus_fire: 4, gaia_young: 3, gaia_teen: 4, gaia: 8, flower_fire_young: 1, flower_fire_teen: 1, flower_fire: 2, cactus_wind_young: 2, cactus_wind_teen: 3, cactus_wind: 5, vine_wind_teen: 1, spore_cap_young: 4, spore_cap_teen: 4, spore_cap: 5, frost_bell_young: 1, frost_bell_teen: 1, frost_bell: 1, volt_vine_young: 1, volt_vine_teen: 2, volt_vine: 2, stone_cap_young: 4, stone_cap_teen: 5, stone_cap: 3, jelly_cap_young: 3, jelly_cap_teen: 4, jelly_cap: 4, fang_trap_young: 2, fang_trap_teen: 2, fang_trap: 1, blade_vine_young: 2, blade_vine_teen: 3, blade_vine: 2, toxi_cactus_young: 4, toxi_cactus_teen: 3, toxi_cactus: 3, draco_fruit_young: 3, draco_fruit_teen: 3, draco_fruit: 3, ember_cap_young: 2, ember_cap_teen: 2, ember_cap: 2, drake_cactus_young: 3, drake_cactus_teen: 3, drake_cactus: 3, gat_cap_young: 1, gat_cap_teen: 1, gat_cap: 1, mask_vine_young: 1, mask_vine_teen: 2, mask_vine: 3, drum_cactus_young: 2, drum_cactus_teen: 2, drum_cactus: 3, lantern_vine_young: 1, lantern_vine_teen: 1, lantern_vine: 2, jar_cactus_young: 3, jar_cactus_teen: 3, jar_cactus: 3, goblin_cap_young: 2, goblin_cap_teen: 3, goblin_cap: 3, crown_cap_young: 1, crown_cap_teen: 3, crown_cap: 3, frost_drake_young: 5, frost_drake_teen: 4, frost_drake: 4, gladi_cactus_young: 2, gladi_cactus_teen: 2, gladi_cactus: 3, jangseung_cactus_young: 2, jangseung_cactus_teen: 3, jangseung_cactus: 3, astro_cap_young: 2, astro_cap_teen: 2, astro_cap: 1, viking_cap_young: 3, viking_cap_teen: 4, viking_cap: 5, hyunmu_cap_young: 2, hyunmu_cap_teen: 3, hyunmu_cap: 3, gumiho_bloom_young: 1, gumiho_bloom_teen: 1, gumiho_bloom: 1, wizard_bell_young: 1, wizard_bell_teen: 1, wizard_bell: 1, ninja_vine_young: 1, ninja_vine_teen: 2, ninja_vine: 2, diver_vine_young: 1, diver_vine_teen: 1, diver_vine: 2 };   // 드레이크 · 프로스트드레이크는 말린 꼬리가 테에 걸쳐 덜 앉힘(드레이크 성체 꼬리는 2026-10-17 사용자 "꼬리만 위로" — 원화에서 190칸 올림 = python tools/pixel/big/partmove.py 원화 결과 290 900 435 0 -190) · sinkcalib.mjs 로 잰 값(밑동 반폭 × 흙 타원 납작함 × 0.75, 최대 5)
// 손으로 더 돌리기(도, + = 시계 반대 방향) — 2026-10-17 사용자 "바위 선인장 반시계 방향으로 각도를 조금만"
// 시험: SINK_TEST='{"gaia":8}' — 표를 고치지 않고 앉힘 깊이만 바꿔 보기
const SINK_TEST = process.env.SINK_TEST ? JSON.parse(process.env.SINK_TEST) : {};
const sinkOf = k => SINK_TEST[k] ?? SINK[k] ?? 0;
// 화분 앞에 둘 부위(2026-10-17 사용자 "바위 선인장의 손은 어색하게 화분에 붙어 있어 — 신체별로 화분 밖에 손을 꺼내 놓는 느낌으로, 화분과 신체 중 어디를 나오게 할지 구분" ·
//  "나중에 크고 멋있는 식물은 다양하게 연출"): 출력 키 → 원화(누끼) 좌표 다각형들. 그 부위는 도트 판에서도 늘 화분 앞판보다 앞(potblend over) · 흙으로 안 덮음.
//  몸통은 화분 속(뒤)에 두고 손 · 꼬리 · 날개 끝처럼 화분 밖으로 내놓을 부위만 적는다. 적지 않은 종 = 예전 자동 규칙(테 밖으로 1.5칸 넘게 뻗은 덩어리만 앞)
const FRONT = {
  gaia: [[[318, 590], [606, 572], [622, 900], [306, 900]], [[732, 596], [1080, 590], [1084, 900], [726, 900]]],   // 가이아록 두 돌주먹(몸은 SINK 로 더 앉혀 주먹이 테 너머로 걸쳐 내려오게)
  gaia_teen: [[[220, 760], [480, 730], [588, 860], [588, 990], [460, 1085], [220, 1085]], [[808, 935], [900, 840], [1030, 826], [1108, 890], [1108, 1115], [808, 1115]]],
  gaia_young: [[[278, 770], [345, 728], [500, 735], [538, 800], [536, 905], [480, 960], [400, 992], [320, 980], [278, 900]], [[826, 830], [870, 800], [985, 795], [1025, 830], [1025, 960], [960, 998], [870, 990], [826, 940]]],
};
const ROT = { gaia: 4, drake_cactus: -3.3 };   // 드레이크캑터 = 날개 키우기 전 자동 보정(몸 축 −3.3° → 돌려 세움)과 같게 — 날개가 넓어져 잰 축이 −2.0°로 바뀌어 자동 보정이 꺼졌음(2026-10-17)
const STEM = {
  flower_grass_young: 1, flower_grass: -3, thorn_teen: -1, thorn: -3, aqua: -1, flower_wind_young: -1, flower_wind_teen: -1,
  spark_young: 1, spark: -1, vine_water_young: -3, vine_water: -5, cactus_fire: -2, flower_fire_young: -1, cactus_wind_teen: -2, cactus_wind: -5,
  vine_wind_teen: -1, vine_wind: -4,
  blade_vine: 2,   // 2026-10-17 변환 경고 −2.0칸
  stone_cap: -2,   // 2026-10-17 사용자 "돌로 된 버섯은 좀 더 좌측으로"
  drake_cactus_young: 2,   // 2026-10-17 진화 다시(뱀) — stemcheck −2.5칸
  gaia: 0,   // 가운데 몸통(+3칸)이 두 돌주먹에 가려 애매 — 주먹 사이 가운데·무게중심이 이미 가운데라 그대로
  astro_cap: -2, hyunmu_cap_young: -2, ranger_vine_teen: 3,   // 2026-10-17 셋째 아홉 변환 경고 +2.0칸
};   // 쏜위드: 자람이 덩굴손만 넓게 뻗고 몸통은 어린 단계만 해 작아 보임(사용자 "중간 생장체가 초기보다 작은 느낌") → 어린 줄이고 자람 키움, 성체가 납작한 덤불이라 자람 키 상한을 성체 + 4칸까지   // 가이아록: 바위 덩치가 비슷해 단계 차이가 적어 보임(2026-10-15 사용자 "최종 생장이랑 큰 차이가 없어") → 단계 크기 더 벌림
// 눈 자리(eyes.mjs): 컨셉·누끼는 종 키로, 생장 단계 그림(concept/stages/<키>_<단계>.png)은 그 파일 이름 키로 따로 잰다 — 단계마다 얼굴 자리가 달라서
const eyeSpec = (key, file) => (file ? EYES[file.replace(/^.*[\\/]/, '').replace(/\.png$/, '')] : EYES[key]) || null;

// 눈 찾기: 아주 어두운 덩어리(눈동자) 중 둘레가 훨씬 밝은 것(홍채·흰자·반짝임) → 크기·높이가 비슷하고 옆으로 나란한 한 쌍
function findEyes(im, lab, isBg, top, bot) {
  const n = im.w * im.h, seen = new Uint8Array(n), blobs = [], ymax = top + (bot - top) * 0.75, dark = j => !isBg[j] && lab[j * 3] < 0.33;
  for (let i = 0; i < n; i++) {
    if (seen[i] || !dark(i) || Math.floor(i / im.w) > ymax) continue;
    const st = [i], px = [];
    seen[i] = 1;
    while (st.length && px.length <= 8000) {
      const j = st.pop(), x = j % im.w;
      px.push(j);
      for (const k of [x > 0 ? j - 1 : -1, x < im.w - 1 ? j + 1 : -1, j - im.w, j + im.w]) if (k >= 0 && k < n && !seen[k] && dark(k)) { seen[k] = 1; st.push(k); }
    }
    if (px.length < 120 || px.length > 8000) continue;
    let x0 = im.w, x1 = 0, y0 = im.h, y1 = 0, L = 0, A = 0, B = 0;
    for (const j of px) { const x = j % im.w, y = (j - x) / im.w; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); L += lab[j * 3]; A += lab[j * 3 + 1]; B += lab[j * 3 + 2]; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, m = px.length;
    if (w / h > 3 || h / w > 3) continue;
    const pad = Math.max(3, Math.round(Math.max(w, h) * 0.5));
    let rl = 0, rc = 0, iris = null, bestC = 0, hiL = 0;
    for (let y = y0 - pad; y <= y1 + pad; y++) for (let x = x0 - pad; x <= x1 + pad; x++) {
      if (x < 0 || y < 0 || x >= im.w || y >= im.h) continue;
      const j = y * im.w + x;
      if (isBg[j]) continue;
      const l = lab[j * 3], c = Math.hypot(lab[j * 3 + 1], lab[j * 3 + 2]);
      if (!(x >= x0 && x <= x1 && y >= y0 && y <= y1)) { rl += l; rc++; if (c > bestC && l > 0.4 && l < 0.9) { bestC = c; iris = [l, lab[j * 3 + 1], lab[j * 3 + 2]]; } }
      hiL = Math.max(hiL, l);
    }
    if (!rc || rl / rc - L / m < 0.22) continue;
    blobs.push({ w, h, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, area: m, pupil: [L / m, A / m, B / m], iris, hi: hiL > 0.88 });
  }
  let pair = [], best = Infinity;
  for (let a = 0; a < blobs.length; a++) for (let b = a + 1; b < blobs.length; b++) {
    const p = blobs[a], q = blobs[b], hh = Math.max(p.h, q.h), ww = Math.max(p.w, q.w), dx = Math.abs(p.cx - q.cx), dy = Math.abs(p.cy - q.cy);
    if (dy > hh * 0.7 || dx < ww * 1.2 || dx > ww * 9) continue;
    const sc = dy / hh + Math.abs(Math.log(p.area / q.area)) + (p.cy / im.h) * 0.5 - (p.hi && q.hi ? 0.5 : 0) - (p.iris && q.iris ? 0.3 : 0);
    if (sc < best) { best = sc; pair = p.cx < q.cx ? [p, q] : [q, p]; }
  }
  return pair;
}

// 원화 살짝 흐리기(TUNE[키].soft = 원화 칸 반지름): 몸 칸(불투명)끼리만 상자 평균 — 서리 털 · 잔 결처럼 한 칸보다 잘게 갈라진 질감이
//  줄이면 밝고 어두운 점으로 튀는 종(바이킹캡 서리 수염 · 이끼 망토, 2026-10-17). 바탕(투명)은 안 섞여 가장자리가 번지지 않음
function softBlur(im, r) {
  const { w, h, data } = im, n = w * h, op = new Float32Array(n), acc = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let i = 0; i < n; i++) op[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  const pass = (src, wsrc, horiz) => {   // 한 방향 상자 합(무게 = 불투명)
    const out = src.map(() => new Float32Array(n)), wout = new Float32Array(n), L = horiz ? w : h, M = horiz ? h : w;
    for (let q = 0; q < M; q++) {
      let sw = 0; const sc = [0, 0, 0];
      const idx = t => (horiz ? q * w + t : t * w + q);
      for (let t = -r; t < L + r; t++) {
        const ta = t + r, tb = t - r - 1;
        if (ta >= 0 && ta < L) { const j = idx(ta); sw += wsrc[j]; for (let c = 0; c < 3; c++) sc[c] += src[c][j]; }
        if (tb >= 0 && tb < L) { const j = idx(tb); sw -= wsrc[j]; for (let c = 0; c < 3; c++) sc[c] -= src[c][j]; }
        if (t >= 0 && t < L) { const j = idx(t); wout[j] = sw; for (let c = 0; c < 3; c++) out[c][j] = sc[c]; }
      }
    }
    return [out, wout];
  };
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) acc[c][i] = data[i * 4 + c] * op[i];
  const [a1, w1] = pass(acc, op, true), [a2, w2] = pass(a1, w1, false);
  for (let i = 0; i < n; i++) if (op[i] && w2[i] > 0) for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.round(a2[c][i] / w2[i]);
}
function labOf(im) {
  const n = im.w * im.h, lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = i * 4, c = oklab('#' + [0, 1, 2].map(j => im.data[k + j].toString(16).padStart(2, '0')).join(''));
    lab[i * 3] = c[0]; lab[i * 3 + 1] = c[1]; lab[i * 3 + 2] = c[2];
  }
  return lab;
}
// 컨셉 그림(화분 있음)의 흙 타원: 아래쪽 어두운 갈색 칸 → 가장 긴 줄 묶음 → 타원(가운데·반폭·반높이)
function soilOf(im, lab, isBg) {
  const rows = [];
  for (let y = Math.floor(im.h * 0.45); y < im.h; y++) {
    let c = 0;
    for (let x = 0; x < im.w; x++) { const i = y * im.w + x; if (isBg[i]) continue; const L = lab[i * 3], C = Math.hypot(lab[i * 3 + 1], lab[i * 3 + 2]), h = hueOf(lab[i * 3 + 1], lab[i * 3 + 2]); if (L > 0.17 && L < 0.46 && C > 0.012 && C < 0.1 && h > 18 && h < 90) c++; }
    if (c > im.w * 0.05) rows.push(y);
  }
  let best = [0, -1], s0 = rows[0];
  for (let k = 1; k <= rows.length; k++) if (k === rows.length || rows[k] !== rows[k - 1] + 1) { if (rows[k - 1] - s0 > best[1] - best[0]) best = [s0, rows[k - 1]]; s0 = rows[k]; }
  const xs = [];
  for (let y = best[0]; y <= best[1]; y++) for (let x = 0; x < im.w; x++) { const i = y * im.w + x; if (isBg[i]) continue; const L = lab[i * 3], C = Math.hypot(lab[i * 3 + 1], lab[i * 3 + 2]); if (L < 0.46 && C < 0.1) xs.push(x); }
  xs.sort((a, b) => a - b);
  const xL = xs[Math.floor(xs.length * 0.03)], xR = xs[Math.floor(xs.length * 0.97)];
  const S = { cx: (xL + xR) / 2, cy: (best[0] + best[1]) / 2, a: (xR - xL) / 2, b: (best[1] - best[0]) / 2 };
  // 화분 축(가로 가운데)은 흙이 아니라 화분 몸통 윤곽의 왼·오른 끝 가운데로 잰다 — 조명과 상관없게(2026-10-15 실측):
  //  흙으로 재면 식물이 가린 만큼 보이는 흙만 세어 쏠리고(엠버캑터스 697 vs 실제 ~627), 테라코타 색으로 재면 밝은 왼쪽이 빠져 12종 모두 오른쪽으로 쏠림.
  //  바닥 그림자를 피하려고 몸통 윗부분 줄(흙 아래 2~5 반높이)만, 줄마다 이어진 덩어리(테두리~테두리)만 센다.
  const mids = [];
  for (let y = Math.round(S.cy + S.b * 2); y < Math.min(im.h - 1, S.cy + S.b * 5); y += 2) {
    let l = 0, r = im.w - 1;
    while (l < im.w && isBg[y * im.w + l]) l++;
    while (r > 0 && isBg[y * im.w + r]) r--;
    if (r - l < S.a) continue;
    let gap = 0;
    for (let x = l; x <= r; x++) if (isBg[y * im.w + x]) gap++;
    if (gap < (r - l) * 0.05) mids.push((l + r) / 2);
  }
  if (mids.length >= 5) { mids.sort((a, b) => a - b); S.cx = mids[Math.floor(mids.length / 2)]; }
  return S;
}
// 배경(화분 있는 컨셉): 모서리 색과 비슷한 칸을 가장자리부터 채우고, 식물에 갇힌 넓은 배경 구멍(잎·꽃 사이)도 배경으로
function bgOf(im, lab) {
  const n = im.w * im.h, isBg = new Uint8Array(n);
  {
    const bg = [0, 1, 2].map(c => ([0, im.w - 1, n - im.w, n - 1].reduce((s, i) => s + lab[i * 3 + c], 0) / 4));
    const dist = i => Math.hypot(lab[i * 3] - bg[0], (lab[i * 3 + 1] - bg[1]) * 1.5, (lab[i * 3 + 2] - bg[2]) * 1.5);
    const st = [];
    for (let x = 0; x < im.w; x++) st.push(x, n - im.w + x);
    for (let y = 0; y < im.h; y++) st.push(y * im.w, y * im.w + im.w - 1);
    const fill = (seed, tol, mark) => {
      const s = [...seed], got = [];
      while (s.length) {
        const i = s.pop();
        if (mark[i] || dist(i) >= tol) continue;
        mark[i] = 1; got.push(i);
        const x = i % im.w;
        if (x > 0) s.push(i - 1); if (x < im.w - 1) s.push(i + 1); if (i >= im.w) s.push(i - im.w); if (i < n - im.w) s.push(i + im.w);
      }
      return got;
    };
    fill(st, 0.055, isBg);
    const seen = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (!isBg[i] && !seen[i] && dist(i) < 0.032) {
      const reg = fill([i], 0.032, seen);
      if (reg.length >= 140) for (const j of reg) isBg[j] = 1;
    }
  }
  return isBg;
}

// 판에 놓는 기준(가상 3D, 2026-10-15 사용자 "기준축을 세워 정밀하게 — 화분 가운데, 기울지 않게"):
//   식물이 흙에 닿는 중심 = 컨셉 그림 속 화분의 흙 타원 가운데 → 우리 3D 화분 흙 가운데(POT_GEO)에 맞춘다.
//   누끼 그림도 같은 자리의 원래 컨셉(화분 있음)에서 흙 타원을 재어 쓴다(그림 폭 가운데·맨 아래 점을 쓰면 꽃잎 날림·앞쪽 돌주먹 때문에 옆·뒤로 밀림).
//   화분 없는 그림(생장 단계)만 밑동(맨 아래 3%) 가운데를 쓴다.
function load(key, file = null) {
  const cutP = resolve(here, 'concept', 'cut', key + '.png'), origP = resolve(here, 'concept', key + '.png'), cut = !!file || existsSync(cutP);
  const im = decodePNG(readFileSync(file || (cut ? cutP : origP))), n = im.w * im.h, soft = (TUNE[key] || {}).soft;
  if (soft) softBlur(im, soft);
  const lab = labOf(im);
  let isBg = new Uint8Array(n);
  if (cut) for (let i = 0; i < n; i++) isBg[i] = im.data[i * 4 + 3] < 128 ? 1 : 0;
  else isBg = bgOf(im, lab);
  let S = null;
  if (cut && !file && existsSync(origP)) {   // 누끼: 원래 컨셉의 흙 타원 가운데
    const o = decodePNG(readFileSync(origP)), ol = labOf(o), so = soilOf(o, ol, bgOf(o, ol));
    S = { cx: so.cx, cy: so.cy, a: so.a, b: 0, ref: 'soil' };
  }
  if (!cut) {
    S = soilOf(im, lab, isBg);
    // 화분 빼기: 앞 테 아래(화분 몸통)는 화분 폭 안 전부, 입구(뒤 테 ~ 앞 테)에서는 흙·테라코타·테 하이라이트 색만
    const rimTop = S.cy - S.b * 1.4, rimFront = S.cy + S.b * 1.15, rimL = S.cx - S.a * 1.32, rimR = S.cx + S.a * 1.32;
    for (let y = Math.floor(rimTop); y < im.h; y++) for (let x = 0; x < im.w; x++) {
      const i = y * im.w + x;
      if (isBg[i]) continue;
      const L = lab[i * 3], A = lab[i * 3 + 1], B = lab[i * 3 + 2], C = Math.hypot(A, B), h = hueOf(A, B), inPot = x > rimL && x < rimR;
      const terra = h > 35 && h < 70 && C > 0.05 && C < 0.14 && L > 0.36 && L < 0.86, dirt = L < 0.47 && C < 0.075 && h > 33 && h < 95, shine = L > 0.7 && C < 0.1 && h > 35 && h < 105;
      // 흙 입구 안의 어둡고 탁한 칸(흙 그늘·자갈 틈)은 색상과 상관없이 흙 — 남기면 우리 흙 위에 검은 점으로 흩어짐(2026-10-15 밑동 검수)
      const opening = ((x - S.cx) / (S.a * 1.1)) ** 2 + ((y - S.cy) / (S.b * 1.4)) ** 2 <= 1, soilDark = opening && L < 0.35 && C < 0.1;
      // potClean(종별 TUNE): 테 둘레(입구 밖 ~ 바깥 테 + 30%)의 테라코타 빛 칸은 밝기와 상관없이 화분 — 테 그늘(짙은 적갈)·테 반짝임(밝은 주황)이 남아
      //  몸을 돌려 세울 때 같이 기울어 우리 화분 테 위에 붉은 금으로 튀어나옴(타이드바인 2026-10-15). 주황·빨강 몸인 종(불꽃·엠버)에는 켜지 말 것
      const rimJunk = (TUNE[key] || {}).potClean && y < rimFront + S.b * 2 && x > rimL - S.a * 0.3 && x < rimR + S.a * 0.3 && (!opening || y < S.cy - S.b * 0.6) && h > 20 && h < 75 && C > 0.05;
      if ((inPot && (terra || dirt || shine)) || soilDark || rimJunk || (y > rimFront && x > rimL - S.a * 0.15 && x < rimR + S.a * 0.15) || y > rimFront + S.b * 3) isBg[i] = 1;
    }
  }
  // 식물 범위
  let top = im.h, bot = 0, left = im.w, right = 0;
  for (let i = 0; i < n; i++) if (!isBg[i]) { const x = i % im.w, y = (i - x) / im.w; top = Math.min(top, y); bot = Math.max(bot, y); left = Math.min(left, x); right = Math.max(right, x); }
  if (cut && !S) {   // 화분 없는 그림(생장 단계): 밑동 = 아래 8% 띠에서 '몸 가운데에 가장 가까운 덩어리'(줄기)의 가운데·맨 아래 —
    //  띠 전체 평균을 쓰면 줄기보다 아래로 처진 바위 주먹·잎이 섞여 밑동이 옆으로 밀리고, 그만큼 몸이 기울었다고 보고 돌려 세워 오히려 기움
    //  (2026-10-15 사용자 "바위선인장 축이 기울어져 있어" — 가이아록 자람 단계가 오른쪽 주먹 끝을 밑동으로 잡아 17.6° 돌아감)
    let gx = 0, gn = 0;
    for (let i = 0; i < n; i++) if (!isBg[i]) { gx += i % im.w; gn++; }
    const cxAll = gn ? gx / gn : (left + right) / 2, yb0 = Math.floor(bot - (bot - top) * 0.08);
    const col = new Uint8Array(im.w);
    for (let y = yb0; y <= bot; y++) for (let x = 0; x < im.w; x++) if (!isBg[y * im.w + x]) col[x] = 1;
    const segs = [];   // 띠에 칠이 있는 열들의 이어진 범위(2칸 이하 틈은 이어 봄)
    for (let x = 0; x < im.w; x++) if (col[x]) { const last = segs[segs.length - 1]; if (last && x - last[1] <= 3) last[1] = x; else segs.push([x, x]); }
    const seg = segs.reduce((b, s2) => (!b || Math.abs((s2[0] + s2[1]) / 2 - cxAll) < Math.abs((b[0] + b[1]) / 2 - cxAll) ? s2 : b), null) || [left, right];
    let bx = 0, bn = 0, by = yb0;
    for (let y = yb0; y <= bot; y++) for (let x = seg[0]; x <= seg[1]; x++) if (!isBg[y * im.w + x]) by = Math.max(by, y);
    for (let y = Math.floor(by - (bot - top) * 0.03); y <= by; y++) for (let x = seg[0]; x <= seg[1]; x++) if (!isBg[y * im.w + x]) { bx += x; bn++; }
    S = { cx: bn ? bx / bn : (seg[0] + seg[1]) / 2, cy: by, a: (right - left) / 6, b: 0, ref: 'base' };
  }
  // 밑동 기울기(재기만): 흙 가운데 위 줄기 칸들의 가운데를 줄마다 잇는 선의 기울기 — 크면 바로 세우기를 검토
  {
    const pts = [], y0 = Math.round(S.cy - (S.cy - top) * 0.22), y1 = Math.round(S.cy - (S.cy - top) * 0.04);
    for (let y = y0; y <= y1; y++) {
      let l = Math.round(S.cx), r = l;
      if (isBg[y * im.w + l]) continue;
      while (l > 0 && !isBg[y * im.w + l - 1]) l--;
      while (r < im.w - 1 && !isBg[y * im.w + r + 1]) r++;
      if (r - l < (S.cy - top) * 0.35) pts.push([y, (l + r) / 2]);
    }
    if (pts.length > 4) { const my = pts.reduce((a, p) => a + p[0], 0) / pts.length, mx = pts.reduce((a, p) => a + p[1], 0) / pts.length, sxy = pts.reduce((a, p) => a + (p[0] - my) * (p[1] - mx), 0), syy = pts.reduce((a, p) => a + (p[0] - my) ** 2, 0); S.tilt = Math.atan(sxy / syy) * 180 / Math.PI; }
  }
  // 몸 축 바로 세우기: 흙 가운데 → 위쪽 60% 무게중심을 잇는 선이 수직에서 3~20° 기울면 흙 가운데를 축으로 반대로 돌려 무게중심을 밑동 위에 둔다
  // (사용자 2026-10-15 "중심축을 세우고 기울지 않게". 20°를 넘으면 원래 그런 모양(덩굴 몸통 등)으로 보고 그대로)
  {
    let gx = 0, gy = 0, gn = 0;
    const yCut = S.cy - (S.cy - top) * 0.4;
    for (let i = 0; i < n; i++) { if (isBg[i]) continue; const x = i % im.w, y = (i - x) / im.w; if (y < yCut) { gx += x; gy += y; gn++; } }
    S.axis = gn ? Math.atan2(gx / gn - S.cx, S.cy - gy / gn) * 180 / Math.PI : 0;
    S.rot = Math.abs(S.axis) >= 3 && Math.abs(S.axis) <= 20 ? -S.axis * Math.PI / 180 : 0;
  }
  // 눈: 지정(eyes.mjs)한 대략 자리 근처(반지름 40)에서 가장 어두운 칸들의 무게중심으로 맞춘다
  const spec = eyeSpec(key, file), eyes = [];   // 눈 자리·영역은 늘 잰다(줄일 때 눈 칸을 따로 다루므로 정지 그림과 움직임이 같게)
  if (spec && spec.box) for (const [ex, ey] of spec.box) eyes.push([ex, ey]);   // 직접 잰 눈 타원 가운데
  else if (spec && spec.src) for (const [ex, ey] of spec.src) {
    const R0 = 40, cand = [];
    for (let y = Math.max(0, ey - R0); y < Math.min(im.h, ey + R0); y++) for (let x = Math.max(0, ex - R0); x < Math.min(im.w, ex + R0); x++) {
      const i = y * im.w + x;
      if (!isBg[i] && (x - ex) ** 2 + (y - ey) ** 2 < R0 * R0) cand.push([lab[i * 3], x, y]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    const k = cand.slice(0, Math.max(20, Math.floor(cand.length * 0.04)));
    eyes.push([k.reduce((s, c) => s + c[1], 0) / k.length, k.reduce((s, c) => s + c[2], 0) / k.length]);
  }
  // 눈 영역(원본 해상도) — 다시 칠하기·깜빡임용. 반지름 = 두 눈 사이 거리 × 0.42(22~55칸), 살결 = 두 눈 사이(콧등)와 눈 둘레에서 가장 흔한 색
  const dist = eyes.length === 2 ? Math.hypot(eyes[1][0] - eyes[0][0], eyes[1][1] - eyes[0][1]) : 100;
  const bridge = eyes.length === 2 ? [(eyes[0][0] + eyes[1][0]) / 2, (eyes[0][1] + eyes[1][1]) / 2, dist * 0.22] : null;
  const ellipse = ([cx, cy, rx, ry]) => { const mask = new Set(); for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { if (x < 0 || y < 0 || x >= im.w || y >= im.h) continue; const i = y * im.w + x; if (!isBg[i] && ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) mask.add(i); } return { mask, skin: null }; };
  const eyeMasks = !spec || spec.closed ? [] : spec.box ? spec.box.map(ellipse) : eyes.map(([cx, cy]) => eyeMaskSrc(im, lab, isBg, cx, cy, Math.max(22, Math.min(55, dist * 0.42)), bridge));
  if (args.includes('--eyedebug') && eyeMasks.some(Boolean)) {   // 검토용: 눈 둘레 원본에 눈 영역을 자홍으로 칠해 저장
    const ex = eyes.reduce((s, e) => s + e[0], 0) / eyes.length, ey = eyes.reduce((s, e) => s + e[1], 0) / eyes.length, CW = 320, CH = 200;
    const o = new Img(CW, CH, '#000000'), X0 = Math.round(ex - CW / 2), Y0 = Math.round(ey - CH / 2), all = new Set();
    eyeMasks.forEach(m => { if (m) m.mask.forEach(i => all.add(i)); });
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const sx = X0 + x, sy = Y0 + y;
      if (sx < 0 || sy < 0 || sx >= im.w || sy >= im.h) continue;
      const i = sy * im.w + sx, k = i * 4, a = all.has(i);
      o.data.set([a ? (im.data[k] + 255) >> 1 : im.data[k], a ? im.data[k + 1] >> 1 : im.data[k + 1], a ? (im.data[k + 2] + 255) >> 1 : im.data[k + 2], 255], (y * CW + x) * 4);
    }
    mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
    writeFileSync(resolve(here, 'out', 'conv', key + '_eyes_src.png'), o.png());
  }
  return { im, lab, isBg, S, top, bot, left, right, cut, eyes, eyeMasks };
}

// 눈 영역(원본 해상도): 눈 아래 볼에서 살결 색을 재고, 눈동자 둘레 타원(가로 R·세로 0.8R) 안에서 살결과 뚜렷이 다른 칸 중
// 눈동자(가장 어두운 칸)에 이어진 덩어리 + 그 덩어리가 둘러싼 구멍(흰자·반짝임). 96칸 판에서 찾으면 꽃잎·외곽선으로 번져서(2026-10-15 실측) 원본에서 찾는다.
function eyeMaskSrc(im, lab, isBg, cx, cy, R, bridge = null) {
  const w = im.w, h = im.h, bins = new Map();
  // 살결: 눈 둘레 고리(1.15R~1.5R)와 두 눈 사이(콧등 원)의 색을 묶음(밝기 0.05·색 0.04 칸)으로 세어 가장 많은 묶음의 평균 — 콧등은 두 배로 센다
  const add = (i, wt) => { const L = lab[i * 3], A = lab[i * 3 + 1], B = lab[i * 3 + 2], k = `${Math.round(L / 0.05)},${Math.round(A / 0.04)},${Math.round(B / 0.04)}`, b = bins.get(k) || [0, 0, 0, 0]; b[0] += L * wt; b[1] += A * wt; b[2] += B * wt; b[3] += wt; bins.set(k, b); };
  for (let y = Math.round(cy - R * 1.5); y <= cy + R * 1.5; y++) for (let x = Math.round(cx - R * 1.5); x <= cx + R * 1.5; x++) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const d = Math.hypot((x - cx) / R, (y - cy) / R), i = y * w + x;
    if (!isBg[i] && d >= 1.15 && d <= 1.5) add(i, 1);
  }
  if (bridge) for (let y = Math.round(bridge[1] - bridge[2]); y <= bridge[1] + bridge[2]; y++) for (let x = Math.round(bridge[0] - bridge[2]); x <= bridge[0] + bridge[2]; x++) {
    if (x < 0 || y < 0 || x >= w || y >= h || Math.hypot(x - bridge[0], y - bridge[1]) > bridge[2]) continue;
    const i = y * w + x;
    if (!isBg[i]) add(i, 2);
  }
  const top = [...bins.values()].sort((a, b) => b[3] - a[3])[0];
  if (!top) return null;
  const skin = [top[0] / top[3], top[1] / top[3], top[2] / top[3]];
  const inE = (x, y) => ((x - cx) / R) ** 2 + ((y - cy) / (R * 0.75)) ** 2 <= 1;
  const diff = i => Math.hypot(lab[i * 3] - skin[0], lab[i * 3 + 1] - skin[1], lab[i * 3 + 2] - skin[2]);
  let dark = -1, dl = 9;
  for (let y = Math.round(cy - R * 0.5); y <= cy + R * 0.5; y++) for (let x = Math.round(cx - R * 0.5); x <= cx + R * 0.5; x++) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = y * w + x;
    if (!isBg[i] && lab[i * 3] < dl) { dl = lab[i * 3]; dark = i; }
  }
  if (dark < 0) return null;
  const mask = new Set([dark]), st = [dark];
  while (st.length) {
    const i = st.pop(), x = i % w, y = (i - x) / w;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const j = ny * w + nx;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && !mask.has(j) && !isBg[j] && inE(nx, ny) && diff(j) > 0.12) { mask.add(j); st.push(j); }
    }
  }
  // 구멍 메우기: 덩어리를 감싼 상자 테두리에서 덩어리 밖으로 채워 닿지 않는 칸 = 흰자·반짝임
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (const i of mask) { const x = i % w, y = (i - x) / w; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 3, bh = y1 - y0 + 3, out = new Uint8Array(bw * bh), q = [];
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (x === 0 || y === 0 || x === bw - 1 || y === bh - 1) { out[y * bw + x] = 1; q.push(y * bw + x); }
  while (q.length) {
    const k = q.pop(), x = k % bw, y = (k - x) / bw;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
      const kk = ny * bw + nx;
      if (out[kk] || mask.has((y0 - 1 + ny) * w + (x0 - 1 + nx))) continue;
      out[kk] = 1; q.push(kk);
    }
  }
  for (let y = 1; y < bh - 1; y++) for (let x = 1; x < bw - 1; x++) if (!out[y * bw + x]) mask.add((y0 - 1 + y) * w + (x0 - 1 + x));
  return { mask, skin };
}

if (measure) {
  for (const k of keys) {
    const { S, top, left, right, im, cut } = load(k);
    console.log(`${k.padEnd(13)} ${cut ? '누끼' : '원본'} 흙 가운데 (${S.cx.toFixed(0)}, ${S.cy.toFixed(0)}) 반폭 ${S.a.toFixed(0)} · 식물 키/흙반폭 ${((S.cy - top) / S.a).toFixed(2)} · 좌 ${((S.cx - left) / S.a).toFixed(2)} 우 ${((right - S.cx) / S.a).toFixed(2)} (${im.w}×${im.h})`);
  }
  process.exit(0);
}

const P = POT_GEO, TOP = 3, HALFW = 46.5, KM = 8, LV = 4;
// 결정적 k-평균(가장 먼 점부터 고르는 시작점)
function kmeans(pts, K, wt, iters = 18) {
  const d2 = (p, c) => wt.reduce((s, w, j) => s + w * (p[j] - c[j]) ** 2, 0);
  const mean = [0, 1, 2].map(j => pts.reduce((s, p) => s + p[j], 0) / pts.length);
  let cent = [pts.reduce((b, p) => d2(p, mean) > d2(b, mean) ? p : b, pts[0]).slice()];
  while (cent.length < K) cent.push(pts.reduce((b, p) => { const dp = Math.min(...cent.map(c => d2(p, c))), db = Math.min(...cent.map(c => d2(b, c))); return dp > db ? p : b; }, pts[0]).slice());
  let lab = new Int16Array(pts.length);
  for (let it = 0; it < iters; it++) {
    const sum = cent.map(() => [0, 0, 0, 0]);
    pts.forEach((p, i) => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; b = j; } }); lab[i] = b; sum[b][0] += p[0]; sum[b][1] += p[1]; sum[b][2] += p[2]; sum[b][3]++; });
    cent = cent.map((c, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c);
  }
  return { cent, assign: p => { let b = 0, bd = Infinity; cent.forEach((c, j) => { const d = d2(p, c); if (d < bd) { bd = d; b = j; } }); return b; } };
}

// 식물 칸의 Lab 평균·표준편차 — 생장 단계 그림 색을 성체 그림 색 분포에 맞출 때 기준
export function labStats(key, file = null) {
  const { lab, isBg } = load(key, file), m = [0, 0, 0], v = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < isBg.length; i++) if (!isBg[i]) { n++; for (let c = 0; c < 3; c++) m[c] += lab[i * 3 + c]; }
  for (let c = 0; c < 3; c++) m[c] /= n;
  for (let i = 0; i < isBg.length; i++) if (!isBg[i]) for (let c = 0; c < 3; c++) v[c] += (lab[i * 3 + c] - m[c]) ** 2;
  return { mean: m, std: v.map(x => Math.sqrt(x / n) || 1) };
}

// match = 기준 색 분포(labStats) — 주면 이 그림의 식물 칸 Lab을 같은 평균·표준편차로 옮긴다(Reinhard 색 옮기기, 세기 matchK)
//  코덱스가 그린 생장 단계는 성체보다 노란 테두리 빛·짙은 그늘이 세서 줄이면 노랑·검정 얼룩이 됨(2026-10-15 쏜위드)
export function convert(key, { file = null, scale = null, fit = (TUNE[key] || {}).fit || 1, match = null, matchK = 1 } = {}) {   // fit = 종별 크기 배수(TUNE — 판 칸에 맞춘 크기보다 크게)
  const { im, lab, isBg, S, top, left, right, eyes: eyeSrc, eyeMasks } = load(key, file), n = im.w * im.h;
  if (match) {   // 눈(eyes.mjs 타원 안)은 옮기지 않는다 — 노란 흰자가 몸 색 쪽으로 끌려가 눈이 묻힘
    const own = { mean: [0, 0, 0], std: [0, 0, 0] }, eye = new Uint8Array(n), body = i => !isBg[i] && !eye[i];
    for (const m of eyeMasks || []) if (m) for (const i of m.mask) eye[i] = 1;
    let cnt = 0;
    for (let i = 0; i < n; i++) if (body(i)) { cnt++; for (let c = 0; c < 3; c++) own.mean[c] += lab[i * 3 + c]; }
    for (let c = 0; c < 3; c++) own.mean[c] /= cnt;
    for (let i = 0; i < n; i++) if (body(i)) for (let c = 0; c < 3; c++) own.std[c] += (lab[i * 3 + c] - own.mean[c]) ** 2;
    for (let c = 0; c < 3; c++) own.std[c] = Math.sqrt(own.std[c] / cnt) || 1;
    for (let i = 0; i < n; i++) if (body(i)) for (let c = 0; c < 3; c++) { const v = lab[i * 3 + c], t = (v - own.mean[c]) / own.std[c] * match.std[c] + match.mean[c]; lab[i * 3 + c] = v + (t - v) * matchK; }
  }
  const s = scale || fit * Math.min((P.cy - TOP) / (S.cy - top), HALFW / Math.max(S.cx - left, right - S.cx), S.b ? P.a * 1.15 / S.a : 9);
  if (S.ref === 'base') S.cy -= 3 / s;   // 화분 없는 그림: 밑동 끝이 흙 가운데보다 3칸 아래(흙 속)에 오게(흙 기준 그림은 흙 가운데가 곧 기준)
  const okey = file ? file.replace(/\\/g, '/').split('/').pop().replace(/\.png$/, '') : key, sh = STEM[okey] || 0;
  if (ROT[okey]) S.rot = (S.rot || 0) - ROT[okey] * Math.PI / 180;   // 손으로 더 돌리기(ROT — + = 시계 반대 방향, 흙 가운데 축)
  const rc = Math.cos(S.rot || 0), rs = Math.sin(S.rot || 0);
  // 줄기 가운데 맞추기(STEM): 기준점을 몸 축 돌림까지 되돌려 옮겨 판 위에서 정확히 sh칸 가로로만 밀리게(모든 장·눈·깜빡임이 같은 S를 씀)
  if (sh) { S.cx -= sh * rc / s; S.cy += sh * rs / s; }
  // 흙에 앉히기(SINK — 2026-10-17 사용자 "화단에 박힌 불꽃 선인장이 여전히 중앙이 아닌 좀 뒤쪽"): 밑동이 넓은 몸은 아래 끝이 흙 가운데 줄에 걸치면
  //  앞쪽 흙이 다 드러나 뒤에 박힌 것처럼 보임(25° 내려다보기에서 굵은 밑동의 흙 닿는 둘레 앞쪽 = 흙 가운데 + 반폭 × 0.42) → 판에서 k칸 아래(앞)로
  const sk = sinkOf(okey);
  if (sk) { S.cx -= sk * rs / s; S.cy -= sk * rc / s; }
  const toOut = (x, y) => { const u = (x - S.cx) * s, v = (y - S.cy) * s; return [P.cx + u * rc - v * rs, P.cy + u * rs + v * rc]; };   // 원본 자리 → 판 자리(몸 축 바로 세우기 포함)
  // 눈: 원본 자리 → 도트 좌표, 그 자리를 가운데로 EYE 틀 크기의 상자
  const spec = EYES_ON ? EYES[key] : null, grid = spec ? EYE[spec.style].g : null;
  const eyes = spec ? eyeSrc.map(([ex, ey], n2) => {
    const w = grid[0].length, h = grid.length, [X, Y] = toOut(ex, ey);
    return { x: Math.round(X - w / 2), y: Math.round(Y - h / 2), w, h, mirror: n2 % 2 === 1 && !!EYE[spec.style].mirror };
  }) : [];
  // ① 재질: 표본(성기게) → 색상·채도 위주 k-평균
  const sample = [];
  for (let i = 0; i < n; i += 7) if (!isBg[i]) sample.push([lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]);
  const K = (TUNE[key] || {}).km || KM;   // 재질 수(종별 — 눈 색이 얼굴색과 같은 무리로 묶이는 종은 늘림)
  const mat = kmeans(sample, K, [0.35, 4, 4]);
  // ② 재질마다 밝기 분위수 → 4단 문턱
  const Ls = Array.from({ length: K }, () => []);
  for (const p of sample) Ls[mat.assign(p)].push(p[0]);
  const cuts = Ls.map(a => { a.sort((x, y) => x - y); return [0.25, 0.5, 0.75].map(q => a[Math.floor(q * (a.length - 1))] ?? 0.5); });
  const level = (m, L) => cuts[m].filter(c => L > c).length;
  // 원본 칸마다 (재질, 단)
  const pm = new Int8Array(n).fill(-1), pl = new Int8Array(n), acc = Array.from({ length: K * LV }, () => [0, 0, 0, 0]);
  for (let i = 0; i < n; i++) if (!isBg[i]) {
    const p = [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]], m = mat.assign(p), l = level(m, p[0]);
    pm[i] = m; pl[i] = l;
    const a = acc[m * LV + l]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++;
  }
  const palLab = acc.map((a, k) => a[3] ? [a[0] / a[3], a[1] / a[3] * 1.12, a[2] / a[3] * 1.12] : [mat.cent[Math.floor(k / LV)][0], 0, 0]);
  const matL = mat.cent.map(c => c[0]);
  // 눈 영역 표시(원본 칸마다 눈 번호) — 줄일 때 눈 칸은 눈 색으로만, 둘레는 살결로만 정해 속눈썹 그림자가 번져 엉뚱한 입처럼 보이지 않게
  const eyeId = new Int8Array(n).fill(-1);
  (eyeMasks || []).forEach((mk, k) => { if (mk) for (const i of mk.mask) eyeId[i] = k; });
  // 눈 둘레 보호(작은 조각 정리에서 눈동자·홍채를 지우지 않게): 눈 타원보다 1.5칸 넓게
  const protect = new Uint8Array(W * H), spx = eyeSpec(key, file);
  if (spx && spx.box) for (const [ex, ey, rx, ry] of spx.box) {
    const [X, Y] = toOut(ex, ey), RX = rx * s + 1.5, RY = ry * s + 1.5;
    for (let y = Math.floor(Y - RY); y <= Y + RY; y++) for (let x = Math.floor(X - RX); x <= X + RX; x++) if (x >= 0 && y >= 0 && x < W && y < H && ((x + 0.5 - X) / RX) ** 2 + ((y + 0.5 - Y) / RY) ** 2 <= 1) protect[y * W + x] = 1;
  }
  // 작은 밝은 무늬(TUNE accent): 밝기 · 채도 · 색상 조건에 맞고 둘레(판 칸 2.5개 폭) 평균 밝기가 ctx 아래인 원본 점
  const AC = (TUNE[key] || {}).accent;
  let accPx = null;
  if (AC) {
    const iw = im.w, ih = im.h, sum = new Float64Array((iw + 1) * (ih + 1)), r = Math.max(4, Math.round(1.25 / s));
    for (let y = 0; y < ih; y++) { let row = 0; for (let x = 0; x < iw; x++) { const i = y * iw + x; row += isBg[i] ? 1 : lab[i * 3]; sum[(y + 1) * (iw + 1) + x + 1] = sum[y * (iw + 1) + x + 1] + row; } }
    const box = (x0, y0, x1, y1) => sum[y1 * (iw + 1) + x1] - sum[y0 * (iw + 1) + x1] - sum[y1 * (iw + 1) + x0] + sum[y0 * (iw + 1) + x0];
    accPx = new Uint8Array(n);
    let nA = 0;
    for (let i = 0; i < n; i++) {
      if (isBg[i]) continue;
      const L = lab[i * 3], A = lab[i * 3 + 1], B = lab[i * 3 + 2], C = Math.hypot(A, B), h = hueOf(A, B);
      if (L < (AC.lmin ?? 0.76) || C < (AC.cmin ?? 0) || C > (AC.cmax ?? 9) || (AC.hue && !(h >= AC.hue[0] && h <= AC.hue[1]))) continue;
      const x = i % iw, y = (i - x) / iw, x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(iw, x + r + 1), y1 = Math.min(ih, y + r + 1);
      // 눈 둘레(눈 타원 + 판 칸 1.5)는 무늬에서 뺌 — 금빛 눈동자가 가시로 잡혀 움직임 장마다 눈 옆 노란 점이 켜졌다 꺼짐(2026-10-17 사용자 "눈 쪽의 노란 점 깜빡거려")
      if (spx && spx.box) { const [X, Y] = toOut(x + 0.5, y + 0.5).map(Math.floor); if (X >= 0 && Y >= 0 && X < W && Y < H && protect[Y * W + X]) continue; }
      if (box(x0, y0, x1, y1) / ((x1 - x0) * (y1 - y0)) < (AC.ctx ?? 0.62)) { accPx[i] = 1; nA++; }
    }
    if (process.env.ACCENT_LOG) console.log(`${key} 밝은 무늬 원본 점 ${nA}`);
  }
  const src = { pm, pl, w: im.w, h: im.h, S: { ...S }, s, matL, eyeId, protect, km: K, acc: accPx, accMin: AC ? AC.min ?? 0.18 : 0, accShape: AC ? AC.shape || null : null, eyeHold: !!(TUNE[key] || {}).eyeHold, matC: mat.cent.map(c => Math.hypot(c[1], c[2])), eyeVivid: !!(TUNE[key] || {}).eyeVivid, fill: (TUNE[key] || {}).fill ?? 0.5, eyeDark: (TUNE[key] || {}).eyeDark ?? null };
  const { cm, ct, am } = rasterize(src);
  // 줄기 재기(재발 방지): 흙 가운데 줄 바로 위에서 위로 6칸 넘게 이어진 열 덩어리 중 몸 무게중심에 가장 가까운 것 — STEM 에 없는데 1.5칸 넘게 비끼면 경고
  if (STEM[okey] == null) {
    const sy = Math.floor(P.cy) - 1, run = x => { let n = 0; for (let y = sy; y >= 0 && cm[y * W + x] >= 0; y--) n++; return n; };
    let gx = 0, gn = 0;
    for (let i = 0; i < sy * W; i++) if (cm[i] >= 0) { gx += i % W + 0.5; gn++; }
    const cg = gn ? gx / gn : P.cx, segs = [];
    for (let x = 0; x < W; x++) if (run(x) >= 6) { const l = segs[segs.length - 1]; if (l && x - l[1] <= 1) l[1] = x; else segs.push([x, x]); }
    const b = segs.reduce((q, s2) => (!q || Math.abs((s2[0] + s2[1] + 1) / 2 - cg) < Math.abs((q[0] + q[1] + 1) / 2 - cg) ? s2 : q), null);
    const off = b ? (b[0] + b[1] + 1) / 2 - P.cx : null;
    if (off != null && Math.abs(off) > 1.5) console.log(`⚠ ${okey}: 줄기 가운데가 화분 가운데서 ${off > 0 ? '+' : ''}${off.toFixed(1)}칸 — node tools/pixel/big/stemcheck.mjs ${okey} 로 가운데 선을 보고 convert.mjs STEM 에 옮길 칸 수를 적을 것`);
  }
  // 깜빡임용: 원본에서 찾은 실제 눈동자 자리 → 도트 좌표(가운데 점만) + 눈 영역 → 판 칸(원본 블록의 30% 이상이 눈이면 눈 칸)
  //  --export 도 — 빠져 있어 게임 묶음의 깜빡임 4장이 뜬 눈 그대로였음(모든 종, 2026-10-17 드레이크캑터 눈 검수 중 발견)
  const eyeC = BLINK || anim || args.includes('--export') ? eyeSrc.map(([ex, ey]) => toOut(ex, ey)) : [];
  const eyeGrid = (eyeMasks || []).map(m => {
    if (!m) return null;
    const cnt = new Map();
    for (const i of m.mask) { const x = i % im.w, y = (i - x) / im.w, [X, Y] = toOut(x + 0.5, y + 0.5), k = Math.floor(Y) * W + Math.floor(X); cnt.set(k, (cnt.get(k) || 0) + 1); }
    const pts = [...cnt].filter(([k, c]) => c >= 0.35 / (s * s) && cm[k] >= 0).map(([k]) => k);
    return pts.length ? { pts, skin: m.skin } : null;
  });
  if (process.env.EYE_LOG) console.log(key, '눈 칸', eyeGrid.map(g => g ? g.pts.map(k => (k % W) + ',' + Math.floor(k / W)).join(' ') : '-').join(' / '));
  const sp = eyeSpec(key, file);
  const eyeCheek = sp && sp.cheek ? toOut(sp.cheek[0], sp.cheek[1]).map(Math.floor) : null;   // 볼(살결 색을 뜰 판 칸)
  // 눈 반짝임 살리기: 원본 눈 타원 안 가장 밝은 점(L > 0.88, 15칸 이상)의 무게중심 칸이 밝지 않으면, 그 점들의 재질 가장 밝은 단으로 한 칸 찍는다
  // — 작은 눈이 줄면서 반짝임이 빠지면 속눈썹 선만 남아 입·초승달처럼 읽힘(윈드페탈, 2026-10-15)
  if (sp && sp.box && !sp.closed) for (const [ex, ey, rx, ry] of sp.box) {
    let sx = 0, sy = 0, n2 = 0;
    const mc = new Float32Array(K);
    for (let y = Math.floor(ey - ry); y <= ey + ry; y++) for (let x = Math.floor(ex - rx); x <= ex + rx; x++) {
      if (x < 0 || y < 0 || x >= im.w || y >= im.h || ((x + 0.5 - ex) / rx) ** 2 + ((y + 0.5 - ey) / ry) ** 2 > 1) continue;
      const i = y * im.w + x;
      if (pm[i] >= 0 && lab[i * 3] > 0.88) { sx += x; sy += y; n2++; mc[pm[i]]++; }
    }
    if (n2 < 15) continue;
    const [X, Y] = toOut(sx / n2 + 0.5, sy / n2 + 0.5).map(Math.floor), k = Y * W + X;
    if (X < 0 || Y < 0 || X >= W || Y >= H || cm[k] < 0) continue;
    let m = 0;
    for (let q = 1; q < K; q++) if (mc[q] > mc[m]) m = q;
    if (matL[cm[k]] < 0.75 || ct[k] < LV - 1) { cm[k] = m; ct[k] = LV - 1; }
  }
  // 화분 앞 부위(FRONT): 원화 다각형 꼭짓점을 판 좌표로 옮겨 칸 가운데 기준으로 채움 → 한 칸 넓힘(움직임 장에서 1~2칸 흔들려도 안에 들게)
  let front = null;
  if (FRONT[okey]) {
    front = new Uint8Array(W * H);
    for (const poly of FRONT[okey]) {
      const q = poly.map(([x, y]) => toOut(x, y));
      for (let y = 0; y < H; y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < q.length; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % q.length]; if ((y1 <= yc) !== (y2 <= yc)) xs.push(x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1)); }
        xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x <= Math.min(W - 1, Math.floor(xs[i + 1] - 0.5)); x++) front[y * W + x] = 1;
      }
    }
    const f2 = front.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (f2[y * W + x]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H) front[Y * W + X] = 1; }
  }
  return { cm, ct, am, palLab, matL, key, eyes, eyeC, eyeGrid, eyeCheek, s, src, front };
}

// ③ 다수 재질로 줄이기 + ④ 정리 — 원본(재질·단이 정해진 큰 그림)을 판 칸으로.
// warp(X, Y) → [dx, dy](소수 칸): 판 칸 (X, Y)에 원래 판 자리 (X − dx, Y − dy)의 원본을 가져온다.
// 움직임 장마다 큰 원본에서 다시 줄이므로 정수 칸 밀기에서 생기는 줄 이음매(움직이는 가로선)가 없다(Vapor Trails·데드셀 방식: 크게 움직이고 매 장 도트로).
// prev = 바로 앞 장 {cm, ct, warp}: 같은 원본 자리가 앞 장에 놓였던 칸과 비교해, 차이가 작으면 앞 장 값을 그대로 둔다(이력 유지)
//   — 매 장 다시 줄일 때 생기는 '끓음'(테두리·명암 칸이 장마다 뒤바뀌며 자글거림)을 막고, 확실히 움직인 칸만 바뀌게
export function rasterize(src, warp = null, prev = null) {
  const { pm, pl, w: iw, h: ih, S, s, matL, eyeId, fill: F0 = 0.5, eyeDark = null, eyeVivid = false, matC = null, acc = null, accMin = 0 } = src, K = src.km || KM, rc = Math.cos(S.rot || 0), rs = Math.sin(S.rot || 0);
  const cm = new Int8Array(W * H).fill(-1), cl = new Float32Array(W * H), cnt = new Float32Array(K), lv = new Float32Array(K), cnE = new Float32Array(K), lvE = new Float32Array(K);
  const cnA = new Float32Array(K), lvA = new Float32Array(K), accMark = acc ? new Uint8Array(W * H) : null;   // 작은 밝은 무늬(TUNE accent) 칸
  const baseM = acc ? new Int8Array(W * H).fill(-1) : null, baseL = acc ? new Float32Array(W * H) : null, accL = acc ? new Float32Array(W * H) : null;   // 무늬로 바꾸기 전 칸 값(가시 모양 그릴 때 덩어리를 되돌림)
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const [dx, dy] = warp ? warp(X, Y) : [0, 0], u = X - dx - P.cx, v = Y - dy - P.cy;
    const x0 = S.cx + (u * rc + v * rs) / s, y0 = S.cy + (-u * rs + v * rc) / s, x1 = x0 + 1 / s, y1 = y0 + 1 / s;   // 몸 축 바로 세우기(S.rot) 되돌려 원본 자리
    cnt.fill(0); lv.fill(0); cnE.fill(0); lvE.fill(0);
    if (acc) { cnA.fill(0); lvA.fill(0); }
    let tot = 0, fg = 0, fgE = 0, fgA = 0;
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(ih, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(iw, Math.ceil(x1)); x++) {
      const i = y * iw + x;
      tot++;
      if (pm[i] < 0) continue;
      fg++;
      if (eyeId && eyeId[i] >= 0) { fgE++; cnE[pm[i]]++; lvE[pm[i]] += pl[i]; } else { cnt[pm[i]]++; lv[pm[i]] += pl[i]; }
      if (acc && acc[i]) { fgA++; cnA[pm[i]]++; lvA[pm[i]] += pl[i]; }
    }
    // 눈 칸(블록의 30% 이상이 눈 타원): 눈 색끼리만 다수결, 아니면 눈 아닌 칸끼리만 — 속눈썹 그늘이 살결로, 살결이 눈으로 번지지 않게.
    // (반짝임은 convert의 '가장 밝은 점' 한 칸으로만 살린다 — 밝은 재질을 고르는 규칙은 밝은 주황 눈동자를 지워 없앰, 블레이즈블룸 2026-10-15)
    const eyeCell = fgE >= 0.3 * fg && fgE > 0;
    if (eyeCell) { cnt.set(cnE); lv.set(lvE); }
    else if (fgE > 0 && fg - fgE === 0) { cnt.set(cnE); lv.set(lvE); }
    let pi = -1;   // 앞 장에서 같은 원본 자리였던 칸
    if (prev) {
      const [qx, qy] = prev.warp ? prev.warp(X, Y) : [0, 0], X2 = Math.round(X - dx + qx), Y2 = Math.round(Y - dy + qy);
      if (X2 >= 0 && Y2 >= 0 && X2 < W && Y2 < H) pi = Y2 * W + X2;
    }
    const fill = !tot ? 0 : fg / tot, was = pi >= 0 && prev.cm[pi] >= 0;
    if (!tot || fill < (pi < 0 ? F0 : was ? F0 - 0.12 : F0 + 0.12)) continue;
    let m = 0;
    for (let k = 1; k < K; k++) if (cnt[k] > cnt[m]) m = k;
    if (was && cnt[prev.cm[pi]] >= cnt[m] * 0.75) m = prev.cm[pi];
    let l = lv[m] / cnt[m];
    if (was && prev.cm[pi] === m && Math.abs(l - prev.ct[pi]) <= 0.85) l = prev.ct[pi];
    if (eyeCell && eyeVivid && matC) {
      let vm = -1;
      for (let k = 0; k < K; k++) if (cnE[k] >= 0.15 * fgE && (vm < 0 || matC[k] > matC[vm])) vm = k;
      if (vm >= 0) { m = vm; l = lvE[vm] / cnE[vm]; }
    }
    if (eyeCell && eyeDark != null) {   // 눈 칸 = 눈 안에서 15% 넘게 차지하는 재질 중 가장 어두운 것의 어두운 단(흰자·반짝임이 넓어 다수결로는 눈동자가 사라지는 종)
      let dm = -1;
      for (let k = 0; k < K; k++) if (cnE[k] >= 0.15 * fgE && (dm < 0 || matL[k] < matL[dm])) dm = k;
      if (dm >= 0) { m = dm; l = Math.min(lvE[dm] / cnE[dm], eyeDark); } else l = Math.min(l, eyeDark);
    }
    if (baseM) { baseM[Y * W + X] = m; baseL[Y * W + X] = l; }
    if (acc && !eyeCell && fgA > 0 && fgA >= accMin * fg) {   // 작은 밝은 무늬가 칸의 accMin 넘게 = 그 무늬 재질(밝은 단)
      let am = 0;
      for (let k = 1; k < K; k++) if (cnA[k] > cnA[am]) am = k;
      m = am; l = Math.max(lvA[am] / cnA[am], LV - 2); accMark[Y * W + X] = 1; accL[Y * W + X] = fgA / fg;
    }
    cm[Y * W + X] = m; cl[Y * W + X] = l;
  }
  // 가시 모양(src.accShape — TUNE accent.shape): 무늬 덩어리(8이웃으로 이어진 칸)마다 칸 값을 되돌리고, 무늬가 가장 짙은 칸에 도트 가시 — 가운데 = 가장 밝은 단, 팔 = 두 단 아래
  if (accMark && src.accShape) {
    const seen = new Uint8Array(W * H), at2 = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x), stars = [];
    for (let i = 0; i < W * H; i++) {
      if (!accMark[i] || seen[i]) continue;
      const st = [i], comp = []; seen[i] = 1;
      while (st.length) { const j = st.pop(); comp.push(j); const x = j % W, y = (j - x) / W; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const k = at2(x + ox, y + oy); if (k >= 0 && accMark[k] && !seen[k]) { seen[k] = 1; st.push(k); } } }
      let best = comp[0]; for (const j of comp) if (accL[j] > accL[best]) best = j;
      stars.push({ c: best, m: cm[best], n: comp.length });
      for (const j of comp) { cm[j] = baseM[j]; cl[j] = baseL[j]; accMark[j] = 0; }
    }
    // 모양(2026-10-17 사용자 "용 가시를 더 얇게"): plus = 십자 · x = 대각 팔 넷 · v = 위 대각 둘 · needle = 바깥 위로 비스듬히 한 칸(두 칸 바늘) · dot = 가운데만
    //  대각 칸은 모서리로만 닿아 같은 칸 수라도 십자보다 가늘게 읽힘
    const SH = { plus: [[1, 0], [-1, 0], [0, 1], [0, -1]], x: [[1, -1], [-1, -1], [1, 1], [-1, 1]], v: [[1, -1], [-1, -1]], dot: [] };
    for (const sr of stars) {
      const x = sr.c % W, y = (sr.c - x) / W, put = (k, lv) => { if (k >= 0 && cm[k] >= 0) { cm[k] = sr.m; cl[k] = lv; accMark[k] = 1; } };
      put(sr.c, LV - 1);
      const arms = src.accShape === 'needle' ? [[x < P.cx ? -1 : 1, -1]] : SH[src.accShape] || SH.plus;
      for (const [ax, ay] of arms) put(at2(x + ax, y + ay), LV - 3);   // 팔 = 두 단 아래(가운데만 밝게 — 가는 가시)
      if (src.accShape === 'plus' && sr.n >= 5) { put(at2(x, y - 2), LV - 2); put(at2(x, y + 2), LV - 3); }   // 큰 가시 = 세로 팔 한 칸 더(위 밝게 · 아래 어둡게)
    }
  }
  // ④ 정리: 외딴 재질 칸(8이웃 중 같은 재질 ≤ 1)은 이웃 다수로 — 단, 아주 어둡거나 밝은 재질(눈·반짝임)은 남김
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : y * W + x;
  for (let pass = 0; pass < 2; pass++) {
    const nm = cm.slice(), nl = cl.slice();
    for (let i = 0; i < W * H; i++) {
      if (cm[i] < 0 || matL[cm[i]] < 0.3 || matL[cm[i]] > 0.9 || (accMark && accMark[i])) continue;
      const x = i % W, y = (i - x) / W, nb = [];
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (ox || oy) { const j = at(x + ox, y + oy); if (j >= 0 && cm[j] >= 0) nb.push(j); }
      if (nb.filter(j => cm[j] === cm[i]).length > 1 || nb.length < 3) continue;
      const votes = new Map();
      for (const j of nb) votes.set(cm[j], (votes.get(cm[j]) || 0) + 1);
      const m = [...votes].sort((a, b) => b[1] - a[1])[0][0], same = nb.filter(j => cm[j] === m);
      nm[i] = m; nl[i] = same.reduce((s2, j) => s2 + cl[j], 0) / same.length;
    }
    cm.set(nm); cl.set(nl);
  }
  // 단 정하기 + 외딴 단(같은 재질 4이웃이 모두 같은 다른 단) 맞추기
  const ct = new Int8Array(W * H);
  for (let i = 0; i < W * H; i++) ct[i] = Math.max(0, Math.min(LV - 1, Math.round(cl[i])));
  // 단 덩어리 정리(두 번): 같은 재질 8이웃 중 내 단이 1칸 이하이고 다른 한 단이 4칸 이상이면 그 단으로 — 점점이 튄 붓 질감 제거
  let ct2 = ct;
  for (let pass = 0; pass < 2; pass++) {
    const nx = ct2.slice();
    for (let i = 0; i < W * H; i++) {
      if (cm[i] < 0 || matL[cm[i]] < 0.3 || (accMark && accMark[i])) continue;
      const x = i % W, y = (i - x) / W, cnt = new Int8Array(LV);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (ox || oy) { const j = at(x + ox, y + oy); if (j >= 0 && cm[j] === cm[i]) cnt[ct2[j]]++; }
      if (cnt[ct2[i]] > 1) continue;
      let b = 0;
      for (let l = 1; l < LV; l++) if (cnt[l] > cnt[b]) b = l;
      if (cnt[b] >= 4) nx[i] = b;
    }
    ct2 = nx;
  }
  // 경계에 낀 작은 조각 정리: 같은 재질 3칸 이하 덩어리가 서로 다른 두 재질 이상 사이에 끼어 있으면(배경 제외) 둘레에서 가장 많은 재질로 —
  // 꽃잎·잎 경계의 주황 그늘 조각이 경계선 규칙으로 빨간 점이 되던 것(아쿠아벌브 2026-10-15). 줄기 하나에 붙은 가시(둘레 재질 1개)·눈 둘레(src.protect)는 남김
  {
    const seen = new Uint8Array(W * H), prot = src.protect;
    for (let i = 0; i < W * H; i++) {
      if (cm[i] < 0 || seen[i] || matL[cm[i]] < 0.3 || matL[cm[i]] > 0.9) continue;
      const st = [i], comp = [], m = cm[i];
      seen[i] = 1;
      while (st.length && comp.length <= 4) { const j = st.pop(), x = j % W; comp.push(j); for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && k < W * H && !seen[k] && cm[k] === m) { seen[k] = 1; st.push(k); } }
      if (comp.length > 4 || (prot && comp.some(j => prot[j])) || (accMark && comp.some(j => accMark[j]))) continue;
      const nbm = new Map();
      let edge = false;   // 배경에 닿음(실루엣 가장자리 — 가시 같은 작은 돌기는 남김)
      for (const j of comp) { const x = j % W; for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) { if (k < 0 || k >= W * H || cm[k] < 0) { edge = true; continue; } if (cm[k] !== m) nbm.set(cm[k], (nbm.get(cm[k]) || 0) + 1); } }
      // 바꾸는 경우: 서로 다른 두 재질 이상 사이에 낌(3칸 이하) 또는 몸 안쪽(배경에 안 닿음)에 떨어져 있는 4칸 이하 조각(그 재질 본체는 따로 있음)
      if (!nbm.size || (!(comp.length <= 3 && nbm.size >= 2) && edge)) continue;
      const to = [...nbm].sort((a, b) => b[1] - a[1])[0][0];
      for (const j of comp) { cm[j] = to; const x = j % W, near = [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W].find(k => k >= 0 && k < W * H && cm[k] === to); if (near != null) ct2[j] = ct2[near]; }
    }
  }
  despeck(cm);
  return { cm, ct: ct2, am: accMark };
}
// 움직임 장마다 지도 만들기(fields = 장마다 {field}) — 두 가지를 섞는다:
//  ① 반올림한 이동이 둘레와 같은 칸 = 쉬는 그림을 정수 칸만큼 통째로 옮긴 값(무늬가 한 덩어리로 움직여 자글거리지 않음 — 도트 작가가 부위를 1칸씩 옮기는 방식)
//  ② 반올림 값이 바뀌는 이음매 둘레 = 큰 원본에서 다시 줄인 값(정수 밀기의 줄 이음매 = 움직이는 가로선을 매끈하게 이음), 불 재질(isF)도 늘 ②(일렁임)
// ②는 앞 장과 비교(이력 유지)하려고 차례대로 두 바퀴 돌려 두 번째 바퀴 값을 쓴다(끝 장 → 첫 장도 이어지게)
export function mixedMaps(cv, fields, isF = null) {
  const out = [], FRn = fields.length;
  let prev = null;
  for (let pass = 0; pass < 2; pass++) for (let f = 0; f < FRn; f++) {
    const { field } = fields[f], hr = rasterize(cv.src, field, prev);
    prev = { ...hr, warp: field };
    if (!pass) continue;
    const R = new Int8Array(W * H * 2), cm = new Int8Array(W * H).fill(-1), ct = new Int8Array(W * H), am = cv.am ? new Uint8Array(W * H) : null;
    for (let i = 0; i < W * H; i++) { const [dx, dy] = field(i % W, Math.floor(i / W)); R[i * 2] = Math.round(dx); R[i * 2 + 1] = Math.round(dy); }
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const i = Y * W + X, rx = R[i * 2], ry = R[i * 2 + 1];
      let seam = false;
      for (let oy = -1; oy <= 1 && !seam; oy++) for (let ox = -1; ox <= 1; ox++) {
        const x2 = X + ox, y2 = Y + oy;
        if (x2 >= 0 && y2 >= 0 && x2 < W && y2 < H && (R[(y2 * W + x2) * 2] !== rx || R[(y2 * W + x2) * 2 + 1] !== ry)) { seam = true; break; }
      }
      const sx = X - rx, sy = Y - ry, si = sx >= 0 && sy >= 0 && sx < W && sy < H ? sy * W + sx : -1;
      const fire = isF && ((si >= 0 && cv.cm[si] >= 0 && isF[cv.cm[si]]) || (hr.cm[i] >= 0 && isF[hr.cm[i]]));
      if (seam || fire || si < 0) { cm[i] = hr.cm[i]; ct[i] = hr.ct[i]; if (am && hr.am) am[i] = hr.am[i]; } else { cm[i] = cv.cm[si]; ct[i] = cv.ct[si]; if (am) am[i] = cv.am[si]; }
    }
    // TUNE eyeHold: 눈 둘레(눈 타원 + 1.5칸 = src.protect)는 늘 쉬는 그림을 얼굴 이동(head)만큼 통째로 옮김 — 불 재질 · 이음매 칸이라 장마다 다시 줄이면
    //  눈 반짝임 칸(convert의 '가장 밝은 점')이 빠졌다 생기며 깜빡거림(드레이크캑터 금빛 눈, 2026-10-17 사용자 "눈 쪽의 노란 점 깜빡거려 계속")
    const keep = cv.src.eyeHold && cv.src.protect && fields[f].head ? new Uint8Array(W * H) : null;
    if (keep) {
      const [hx, hy] = fields[f].head.map(Math.round);
      for (let j = 0; j < W * H; j++) {
        if (!cv.src.protect[j] || cv.cm[j] < 0) continue;
        const x = j % W + hx, y = (j - (j % W)) / W + hy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        cm[i] = cv.cm[j]; ct[i] = cv.ct[j]; if (am) am[i] = 0; keep[i] = 1;
      }
    }
    out[f] = { cm, ct, am, keep };
  }
  return out;
}

// 흙 둘레의 떨어진 작은 점 없애기: 몸(가장 큰 덩어리)과 이어지지 않은 6칸 이하 덩어리가 흙 높이 띠(흙 가운데 − 1.6 반높이 아래)에 있으면
// 컨셉 흙의 자갈·그늘이 남은 것 — 지운다(2026-10-15 밑동 검수: 아쿠아벌브·스파크번·게일캑터스·포자버섯 흙 위 검은 점)
function despeck(cm) {
  const comp = new Int32Array(W * H).fill(-1), sizes = [], cells = [];
  for (let i = 0; i < W * H; i++) {
    if (cm[i] < 0 || comp[i] >= 0) continue;
    const id = sizes.length, st = [i], list = [];
    comp[i] = id;
    while (st.length) {
      const j = st.pop(), x = j % W, y = (j - x) / W;
      list.push(j);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const X = x + ox, Y = y + oy, k = Y * W + X; if ((ox || oy) && X >= 0 && Y >= 0 && X < W && Y < H && cm[k] >= 0 && comp[k] < 0) { comp[k] = id; st.push(k); } }
    }
    sizes.push(list.length); cells.push(list);
  }
  if (!sizes.length) return;
  const main = sizes.indexOf(Math.max(...sizes)), band = P.cy - P.b * 1.6;
  cells.forEach((list, id) => { if (id !== main && list.length <= 6 && list.every(j => Math.floor(j / W) >= band)) for (const j of list) cm[j] = -1; });
}

// 실제 그려진 눈 칸 찾기: 눈동자 가운데에서 반지름 4.5 안, 둘레(4.5~6.5) 살결 색과 뚜렷이 다른 칸 → 가장 어두운 칸에 이어진 덩어리
function eyeMask(out, cx, cy) {
  const px = (x, y) => { const k = (y * W + x) * 4; return out.data[k + 3] < 128 ? null : '#' + [0, 1, 2].map(j => out.data[k + j].toString(16).padStart(2, '0')).join(''); };
  const ring = new Map();
  for (let y = Math.floor(cy - 7); y <= cy + 7; y++) for (let x = Math.floor(cx - 7); x <= cx + 7; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), c = x >= 0 && y >= 0 && x < W && y < H ? px(x, y) : null;
    if (c && d > 4.5 && d < 6.5) ring.set(c, (ring.get(c) || 0) + 1);
  }
  const skin = [...ring].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!skin) return null;
  const sk = oklab(skin), cand = new Map();
  let dark = null, dl = 9;
  for (let y = Math.floor(cy - 5); y <= cy + 5; y++) for (let x = Math.floor(cx - 5); x <= cx + 5; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > 4.5) continue;
    const c = px(x, y);
    if (!c) continue;
    const o = oklab(c);
    if (Math.hypot(o[0] - sk[0], o[1] - sk[1], o[2] - sk[2]) > 0.07) { cand.set(y * W + x, o[0]); if (o[0] < dl) { dl = o[0]; dark = y * W + x; } }
  }
  if (dark === null) return null;
  const mask = new Set([dark]), st = [dark];
  while (st.length) { const i = st.pop(), x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (cand.has(j) && !mask.has(j)) { mask.add(j); st.push(j); } }
  const lidCol = (() => { const [L, A, B] = oklab(px(dark % W, Math.floor(dark / W))); return fromOklab(Math.max(0.15, L), A, B); })();
  return { mask, skin, lidCol };
}
// 깜빡임 — 실제 그려진 눈을 재서 방향에 맞게 감는다(사용자 2026-10-15: "얼굴이 정면이 아니라 기울었고 먼 눈은 작다, 감은 눈은 자연스러운 곡선").
// 기준: ① 얼굴 기울기 θ = 두 눈 칸 무게중심을 잇는 선의 각도 ② 눈마다 θ 축으로 돌린 좌표(u 가로, v 세로)에서 폭·높이를 따로 잼
//       → 원근으로 작게 그려진 먼 눈은 작은 그대로 ③ 감은 눈 = θ 축을 따라 아래로 처지는 곡선(∪), 처짐 = 폭 × 0.22(최소 0.7칸), 높이는 눈 가운데보다 살짝 아래
//       ④ 반쯤 = 같은 축에서 눈 가운데 위쪽만 살결로 덮고 거의 평평한(살짝 ∩) 눈꺼풀 선. 뜬 눈(open)은 그림 그대로.
export function eyeGeometry(out, cv, dx = 0, dy = 0) {
  const ms = cv.eyeC.map(([cx, cy]) => eyeMask(out, cx + dx, cy + dy)).filter(Boolean);
  if (!ms.length) return [];
  const cen = ms.map(m => { let sx = 0, sy = 0; for (const i of m.mask) { sx += i % W + 0.5; sy += Math.floor(i / W) + 0.5; } return [sx / m.mask.size, sy / m.mask.size]; });
  const th = ms.length === 2 ? Math.atan2(cen[1][1] - cen[0][1], cen[1][0] - cen[0][0]) : 0, c = Math.cos(th), s = Math.sin(th);
  return ms.map((m, k) => {
    const [ox, oy] = cen[k], uv = [...m.mask].map(i => { const x = i % W + 0.5 - ox, y = Math.floor(i / W) + 0.5 - oy; return [x * c + y * s, -x * s + y * c]; });
    const us = uv.map(p => p[0]), vs = uv.map(p => p[1]);
    return { m, ox, oy, th, c, s, u0: Math.min(...us) - 0.5, u1: Math.max(...us) + 0.5, v0: Math.min(...vs) - 0.5, v1: Math.max(...vs) + 0.5, uv };
  });
}
function blinkEyes(out, cv, state, dx = 0, dy = 0) {
  if (state === 'open') return;
  for (const g of eyeGeometry(out, cv, dx, dy)) {
    const { m, ox, oy, c, s, u0, u1, v0, v1 } = g, w = u1 - u0, h = v1 - v0, um = (u0 + u1) / 2;
    const toXY = (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
    const curve = state === 'closed'
      ? u => (v0 + v1) / 2 + h * 0.12 + Math.max(0.7, w * 0.22) * (1 - ((u - um) / (w / 2)) ** 2)    // 아래로 처지는 ∪
      : u => (v0 + v1) / 2 - Math.max(0.3, w * 0.08) * (1 - ((u - um) / (w / 2)) ** 2);              // 거의 평평한 ∩
    // 덮기: closed = 눈 칸 전부, half = 곡선 위쪽만
    [...m.mask].forEach((i, k) => { const [u, v] = g.uv[k]; if (state === 'closed' || v < curve(u)) out.set(i % W, Math.floor(i / W), m.skin); });
    // 곡선 그리기: 촘촘히 짚어 칸으로 반올림, 같은 칸은 한 번
    const seen = new Set();
    for (let u = u0 + 0.25; u <= u1 - 0.25; u += 0.25) {
      const [x, y] = toXY(u, curve(u)), X = Math.floor(x), Y = Math.floor(y), key = Y * W + X;
      if (!seen.has(key)) { seen.add(key); out.set(X, Y, m.lidCol); }
    }
  }
}

// 깜빡임(눈 영역 판 칸 cv.eyeGrid 사용) — 기준은 blinkEyes와 같다(θ = 두 눈 무게중심 각도, 눈마다 폭·높이 따로, 감음 = ∪ 곡선, 반쯤 = 위쪽만 덮고 평평한 선).
// 살결 = 눈 칸을 둘러싼 고리 중 눈 가운데보다 아래(볼)에서 가장 흔한 밝은 색 — 위쪽은 꽃잎·이마일 수 있어서. 눈꺼풀 선 = 눈 칸 중 가장 어두운 색.
function blinkGrid(out, cv, state, dx = 0, dy = 0) {
  const px = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return null; const k = (y * W + x) * 4; return out.data[k + 3] < 128 ? null : '#' + [0, 1, 2].map(j => out.data[k + j].toString(16).padStart(2, '0')).join(''); };
  const grids = cv.eyeGrid.filter(Boolean), eyes = grids.map(g => g.pts.map(k => [k % W + dx, Math.floor(k / W) + dy]));
  if (!eyes.length) return;
  const cen = eyes.map(e => [e.reduce((s, p) => s + p[0] + 0.5, 0) / e.length, e.reduce((s, p) => s + p[1] + 0.5, 0) / e.length]);
  const th = cen.length === 2 ? Math.atan2(cen[1][1] - cen[0][1], cen[1][0] - cen[0][0]) : 0, c = Math.cos(th), s = Math.sin(th);
  eyes.forEach((e, k) => {
    const set = new Set(e.map(([x, y]) => y * W + x)), ring = new Map(), [ox, oy] = cen[k];
    let lidC = null, lidL = 9;
    for (const [x, y] of e) {
      const col = px(x, y);
      if (col) { const L = oklab(col)[0]; if (L < lidL) { lidL = L; lidC = col; } }
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1], [x - 1, y + 1], [x + 1, y + 1]]) {
        if (set.has(ny * W + nx) || ny + 0.5 < oy) continue;
        const cc = px(nx, ny);
        if (cc && oklab(cc)[0] > 0.35) ring.set(cc, (ring.get(cc) || 0) + 1);
      }
    }
    // 살결: 직접 찍은 볼(eyes.mjs cheek) 둘레 3×3에서 가장 흔한 밝은 색 → 없으면 원본에서 잰 살결에 가장 가까운 고리 색 → 아래 고리에서 가장 흔한 밝은 색
    let skin = null;
    if (cv.eyeCheek) {
      const cc = new Map();
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const c2 = px(cv.eyeCheek[0] + dx + ox, cv.eyeCheek[1] + dy + oy); if (c2 && oklab(c2)[0] > 0.35) cc.set(c2, (cc.get(c2) || 0) + 1); }
      skin = [...cc].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    }
    if (!skin && grids[k].skin) {
      const sk = grids[k].skin, near = [...ring.keys()].map(cc => { const o = oklab(cc); return [cc, Math.hypot(o[0] - sk[0], o[1] - sk[1], o[2] - sk[2])]; }).sort((a, b) => a[1] - b[1])[0];
      if (near && near[1] <= 0.15) skin = near[0];
    }
    if (!skin) skin = [...ring].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!skin || !lidC) return;
    const uv = e.map(([x, y]) => { const X = x + 0.5 - ox, Y = y + 0.5 - oy; return [X * c + Y * s, -X * s + Y * c]; });
    const us = uv.map(p => p[0]), vs = uv.map(p => p[1]), u0 = Math.min(...us) - 0.5, u1 = Math.max(...us) + 0.5, v0 = Math.min(...vs) - 0.5, v1 = Math.max(...vs) + 0.5;
    const w = u1 - u0, h = v1 - v0, um = (u0 + u1) / 2;
    const curve = state === 'closed'
      ? u => (v0 + v1) / 2 + h * 0.12 + Math.max(0.7, w * 0.22) * (1 - ((u - um) / (w / 2)) ** 2)
      : u => (v0 + v1) / 2 - Math.max(0.3, w * 0.08) * (1 - ((u - um) / (w / 2)) ** 2);
    e.forEach(([x, y], i) => { const [u, v] = uv[i]; if (state === 'closed' || v < curve(u)) out.set(x, y, skin); });
    const [L, A, B] = oklab(lidC), lc = fromOklab(Math.max(0.15, L), A, B), seen = new Set();
    for (let u = u0 + 0.25; u <= u1 - 0.25; u += 0.25) {
      const v = curve(u), X = Math.floor(ox + u * c - v * s), Y = Math.floor(oy + u * s + v * c), key = Y * W + X;
      if (!seen.has(key)) { seen.add(key); out.set(X, Y, lc); }
    }
  });
}

// 눈 그리기: open = 종별 EYE 틀 그대로 / half = 위 절반을 눈꺼풀(둘레 살결 색)로 / closed = 눈꺼풀 + 가운데 한 줄
function drawEyes(out, cv, state, dx = 0) {
  const spec = EYES_ON ? EYES[cv.key] : null;
  if (!spec) return;
  const grid = EYE[spec.style].g, col = { k: spec.k || '#2e222f', w: spec.w || '#ffffff', g: spec.g || '#f9c22b', c: spec.c || '#fbff86', i: spec.i || '#fb6b1d', l: spec.l || '#3e3546' };
  for (const e of cv.eyes) {
    const x0 = e.x + dx, y0 = e.y, cnt = new Map();
    for (let y = y0 - 1; y <= y0 + e.h; y++) for (let x = x0 - 1; x <= x0 + e.w; x++) {   // 눈 둘레 1칸 = 살결 색
      if (y >= y0 && y < y0 + e.h && x >= x0 && x < x0 + e.w) continue;
      const k = (y * W + x) * 4;
      if (x < 0 || y < 0 || x >= W || y >= H || out.data[k + 3] < 128) continue;
      const c = '#' + [0, 1, 2].map(j => out.data[k + j].toString(16).padStart(2, '0')).join('');
      cnt.set(c, (cnt.get(c) || 0) + 1);
    }
    const skin = [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0] || col.l;
    const lidRow = Math.max(0, Math.ceil(e.h / 2) - 1), lidCol = col.k;
    grid.forEach((row, y) => [...(e.mirror ? [...row].reverse().join('') : row)].forEach((ch, x) => {
      if (!col[ch]) return;
      let c = col[ch];
      if (state === 'closed') c = y === lidRow ? lidCol : skin;
      else if (state === 'half') c = y < lidRow ? skin : y === lidRow ? lidCol : c;
      out.set(x0 + x, y0 + y, c);
    }));
  }
}

// 색 입히기(+ ⑤ 외곽선). 같은 함수를 움직임 프레임에도 쓴다.
// warp(x, y) → [dx, dy] = 그 칸에 올 그림이 원래 자리에서 움직인 양(정수) — 재질·단 지도를 옮긴 뒤 외곽선을 새로 그려 선이 끊기지 않는다.
// out.src[i] = 출력 칸 i가 가져온 원래 칸(없으면 -1) — 떠 있는 조각 깜빡임 등에 쓴다.
// maps = 장마다 큰 원본에서 다시 줄인 {cm, ct}(rasterize), eyeOff = 그 장의 얼굴 이동(정수), srcOf(x, y) = 그 칸이 온 원래 판 칸
export function paint(cv, { warp = null, maps = null, tone = null, eye = 'open', eyeOff = null, srcOf = null } = {}) {
  const out = paintBody(cv, { warp, maps, tone, srcOf });
  const off = (x, y) => eyeOff || (warp ? warp(Math.round(x), Math.round(y)) : [0, 0]);
  if (cv.eyes.length) drawEyes(out, cv, eye, off(cv.eyes[0].x, cv.eyes[0].y)[0]);
  if (cv.eyeC.length && eye !== 'open') {
    const ex = cv.eyeC.reduce((s, e) => s + e[0], 0) / cv.eyeC.length, ey = cv.eyeC.reduce((s, e) => s + e[1], 0) / cv.eyeC.length;
    if (cv.eyeGrid && cv.eyeGrid.some(Boolean)) blinkGrid(out, cv, eye, ...off(ex, ey)); else blinkEyes(out, cv, eye, ...off(ex, ey));
  }
  return out;
}
function paintBody(cv, { warp = null, maps = null, tone = null, srcOf = null } = {}) {
  const { palLab, matL } = cv, out = new Img(W, H);
  const cm = new Int8Array(W * H).fill(-1), ct = new Int8Array(W * H), src = new Int32Array(W * H).fill(-1), am = (maps ? maps.am : cv.am) ? new Uint8Array(W * H) : null;   // am = 밝은 무늬 칸(TUNE accent)
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i - x) / W;
    if (maps) {
      cm[i] = maps.cm[i];
      if (am && maps.am) am[i] = maps.am[i];
      if (cm[i] < 0) continue;
      ct[i] = tone && !(maps.keep && maps.keep[i]) ? tone(cm[i], maps.ct[i], x, y) : maps.ct[i];   // 눈 둘레(eyeHold)는 불 일렁임 단 바꿈도 안 함
      src[i] = srcOf ? srcOf(x, y) : i;
      continue;
    }
    const [dx, dy] = warp ? warp(x, y) : [0, 0], sx = x - dx, sy = y - dy;
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
    const j = sy * W + sx;
    cm[i] = cv.cm[j]; ct[i] = tone ? tone(cv.cm[j], cv.ct[j], sx, sy) : cv.ct[j]; src[i] = cv.cm[j] >= 0 ? j : -1;
    if (am && cv.am) am[i] = cv.am[j];
  }
  out.src = src;
  const col = (m, l) => { const [L, A, B] = palLab[m * LV + l]; return fromOklab(L, A, B); };
  // 외곽선 색 = 재질의 가장 어두운 단을 더 어둡게. 단, 아주 밝은 재질(흰·크림 꽃잎, 밝기 0.8 넘음)은 그 칸 자신의 단 색을 어둡게 —
  // 가장 어두운 단이 원본의 주황 그늘이라 테두리가 빨간 점처럼 튀었음(아쿠아벌브 수련, 2026-10-15 검수)
  const dark = (m, d, l = null) => { const [L, A, B] = palLab[m * LV + (l != null && matL[m] > 0.8 ? Math.max(0, Math.min(LV - 1, l)) : 0)]; const k = l != null && matL[m] > 0.8 ? 1.05 : 1.3; return fromOklab(Math.max(0.1, L - d), A * k, B * k); };
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : y * W + x;
  for (let i = 0; i < W * H; i++) {
    const m = cm[i];
    if (m < 0) continue;
    const x = i % W, y = (i - x) / W, nb = [at(x, y - 1), at(x - 1, y), at(x, y + 1), at(x + 1, y)];
    const empty = nb.map(j => j < 0 || cm[j] < 0);
    let c = col(m, Math.max(0, Math.min(LV - 1, ct[i])));
    if (empty.some(Boolean)) c = empty[2] && y < P.cy ? INK : (empty[2] || empty[3]) ? dark(m, 0.16, ct[i]) : dark(m, 0.06, ct[i]);
    else if (nb.some(j => cm[j] !== m && matL[cm[j]] - matL[m] > 0.15 && !(am && am[j]))) c = dark(m, 0.08, ct[i]);   // 더 밝은 재질과 맞닿은 어두운 쪽 = 경계선(밝은 무늬 칸 둘레는 빼서 가시가 검은 테 없이 박힘)
    out.set(x, y, c);
  }
  return out;
}

// 생장 단계 그림 한 장(concept/stages/<키>_<단계>.png) → 판 칸 cv. 크기 = 성체와 같은 축척에서 시작해 몸집 규칙으로 맞춤(--stages 검토판·--stage= 게임 묶음 공용):
//  어린 = 성체 면적의 42%(TUNE youngArea) · 자람 = 72%(teenArea)보다 크면 줄이고, 자람이 teenMinArea 보다 작으면 키움,
//  키 상한 = 어린 성체 키의 82% · 자람 성체 키 − 2칸(+ teenCapAdd, 최대 73) — 잘린 키는 작게 재지므로 몇 번 되풀이
function stageCv(key, st, mature, ref, mk = 1) {
  const f = resolve(here, 'concept', 'stages', `${key}_${st}.png`);
  if (!existsSync(f)) return null;
  const area = c => { let n = 0; for (let i = 0; i < W * H; i++) if (c.cm[i] >= 0) n++; return n; };
  const aM = area(mature), T2 = TUNE[key] || {};
  const YA = +(args.find(a => a.startsWith('--young-area='))?.slice(13) ?? T2.youngArea ?? 0.42), TA = +(args.find(a => a.startsWith('--teen-area='))?.slice(12) ?? T2.teenArea ?? 0.72);
  const conv = sc => convert(key, { file: f, scale: sc, match: mk ? ref : null, matchK: mk });
  let sc = mature.s, cv = conv(sc);
  const r = area(cv) / aM, lim = st === 'young' ? YA : TA, minA = st === 'teen' ? T2.teenMinArea : null;
  if (lim > 0 && r > lim) { const k = Math.sqrt(lim / r); sc *= k; cv = conv(sc); console.log(`${st.padEnd(7)} 몸 면적 성체의 ${(r * 100).toFixed(0)}% → 축척 ×${k.toFixed(2)} → ${(area(cv) / aM * 100).toFixed(0)}%`); }
  else if (minA && r < minA) { const k = Math.sqrt(minA / r); sc *= k; cv = conv(sc); console.log(`${st.padEnd(7)} 몸 면적 성체의 ${(r * 100).toFixed(0)}% → 키움 ×${k.toFixed(2)} → ${(area(cv) / aM * 100).toFixed(0)}%`); }
  else console.log(`${st.padEnd(7)} 몸 면적 성체의 ${(r * 100).toFixed(0)}% (그대로)`);
  const top = c => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (c.cm[y * W + x] >= 0) return y; return H; };
  const hM = P.cy - top(mature), cap = st === 'young' ? Math.floor(hM * 0.82) : Math.min(Math.floor(hM - 2 + (T2.teenCapAdd || 0)), 73), sc0 = sc;
  for (let it = 0; it < 6 && P.cy - top(cv) > cap; it++) { sc *= Math.min(0.95, cap / (P.cy - top(cv))); cv = conv(sc); }
  if (sc < sc0 - 1e-9) console.log(`${st.padEnd(7)} 키 상한 ${cap}칸 → 축척 ${(sc / mature.s).toFixed(2)}배`);
  return cv;
}

mkdirSync(resolve(here, 'out', 'conv'), { recursive: true });
const stages = args.includes('--stages');
// --stage=young|teen(+ --export·--anim): 성체 대신 그 단계 그림으로 묶음·영상을 만든다 → 파일 이름 <키>_<단계>
const ONE_STAGE = args.find(a => a.startsWith('--stage='))?.slice(8) || null;
const cvs = stages ? [] : ONE_STAGE ? keys.map(k => { const m = convert(k), cv = stageCv(k, ONE_STAGE, m, labStats(k), 1); if (cv) cv.outKey = `${k}_${ONE_STAGE}`; return cv; }).filter(Boolean) : keys.map(k => {
  const cv = convert(k);
  writeFileSync(resolve(here, 'out', 'conv', k + '_96x112.png'), paint(cv).png());
  const probe = args.find(a => a.startsWith('--probe='));   // 검토용: 판 칸의 재질·단·색 찍기 --probe=x,y;x,y
  if (probe) for (const pt of probe.slice(8).split(';')) { const [x, y] = pt.split(',').map(Number), i = y * W + x, m = cv.cm[i]; if (m < 0) { console.log(`  (${x},${y}) 빈칸`); continue; } const [L, A, B] = cv.palLab[m * LV + cv.ct[i]]; console.log(`  (${x},${y}) 재질 ${m}(밝기 ${cv.matL[m].toFixed(2)}) 단 ${cv.ct[i]} · L ${L.toFixed(2)} C ${Math.hypot(A, B).toFixed(3)} h ${hueOf(A, B).toFixed(0)} · 그린 색 ${(() => { const im = paint(cv), k = i * 4; return '#' + [0, 1, 2].map(j => im.data[k + j].toString(16).padStart(2, '0')).join(''); })()}`); }
  const S0 = cv.src.S;
  console.log(`${k.padEnd(13)} 변환 완료 · 축척 ${cv.s.toFixed(4)} · 기준 ${S0.ref === 'soil' ? '누끼+원래 흙' : S0.ref === 'base' ? '밑동' : '흙'} (${S0.cx.toFixed(0)}, ${S0.cy.toFixed(0)}) · 몸 축 ${(S0.axis || 0).toFixed(1)}°${S0.rot ? ` → ${(-S0.rot * 180 / Math.PI).toFixed(1)}° 돌려 세움` : ''}${EYES_ON ? ' · 눈 ' + (cv.eyes.length ? cv.eyes.map(e => `${e.x},${e.y} ${e.w}×${e.h}`).join(' / ') : '지정 없음') : ''}`);
  return cv;
});

// --stages <키>: 생장 3단계 — 어린(young) → 자람(teen) → 성체(mature = 원래 컨셉). 어린·자람은 코덱스가 단계마다 따로 디자인해 그린 누끼(concept/stages/<키>_<단계>.png)
// 크기도 코덱스가 그린 그대로 — 성체와 같은 축척(원본 한 칸당 판 칸 수)으로 줄이고 단계별로 키우거나 줄이지 않는다
// (2026-10-15 사용자 "생장단계 임의로 너가 그리지 말고 코덱스로 각각", "3개로 줄이자" — 게임의 6단계와 잇는 법은 CHANGELOG)
const STAGES = ['young', 'teen', 'mature'];
if (stages) {
  const key = keys[0], pot = renderPot(POT3.pot_terra), mature = convert(key), list = [], srcs = [], opts = [], ref = labStats(key);
  const mk = +(args.find(a => a.startsWith('--match='))?.slice(8) ?? 1);   // 단계 그림 색을 성체 색 분포에 맞추는 세기(0 = 그대로)
  // 어린 단계 몸집(2026-10-15 사용자 "외형 차이가 적어 아쉬움 — 1단계는 더 줄여도, 무조건 말고 몸체 크기 기준으로(버섯은 덩치가 비슷해 구분 어려움)"):
  //  도트 칸 수(몸 면적)가 성체의 YA배보다 크면 그 비율이 되게 축척을 줄이고, 이미 작으면 그대로
  for (const st of STAGES) {
    const f = st === 'mature' ? (existsSync(resolve(here, 'concept', key + '.png')) ? resolve(here, 'concept', key + '.png') : resolve(here, 'concept', 'cut', key + '.png')) : resolve(here, 'concept', 'stages', `${key}_${st}.png`);   // 성체 원본 = 컨셉, 없으면 누끼(2026-10-16~ 새 종)
    const cv = st === 'mature' ? mature : stageCv(key, st, mature, ref, mk);
    if (!cv) continue;
    if (st !== 'mature') { const S2 = cv.src.S; console.log(`${st.padEnd(7)} 기준 (${S2.cx.toFixed(0)}, ${S2.cy.toFixed(0)}) ${S2.ref} · 몸 축 ${(S2.axis || 0).toFixed(1)}°${S2.rot ? ' → 돌려 세움' : ''}`); }
    const im = paint(cv);
    writeFileSync(resolve(here, 'out', 'conv', `${key}_${st}_96x112.png`), im.png());
    list.push(im); srcs.push(decodePNG(readFileSync(f))); opts.push({ sink: sinkOf(st === 'mature' ? key : `${key}_${st}`), frontMask: cv.front });
    let t = H, l = W, r = 0, out = 0, fo = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (im.data[(y * W + x) * 4 + 3] > 127) { t = Math.min(t, y); l = Math.min(l, x); r = Math.max(r, x); if (y > P.cy - P.b * 1.5 && y < P.cy && Math.abs(x + 0.5 - P.cx) > P.a + 1) { if (cv.front && cv.front[y * W + x]) fo++; else out++; } }
    console.log(`${st.padEnd(7)} 키 ${(P.cy - t).toFixed(0)}칸 · 폭 ${l}~${r} · 화분 밖 아래 ${out}칸${fo ? ` (화분 앞 부위 ${fo}칸은 따로)` : ''}`);
  }
  // 위: 코덱스 그림(성체는 원래 컨셉) / 아래: 도트 변환 + 3D 화분
  const Z = 3, PW = W * Z, sheet = new Img(8 + list.length * (PW + 8), 8 + PW + 8 + H * Z + 8, '#2e222f');
  const BG = [0x32, 0x33, 0x53];   // 줄인 그림을 판 바탕색 위에 반투명 가장자리까지 섞어 얹는다
  const shrink = (src, w, h) => { const o = new Img(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const x0 = Math.floor(x * src.w / w), x1 = Math.max(x0 + 1, Math.floor((x + 1) * src.w / w)), y0 = Math.floor(y * src.h / h), y1 = Math.max(y0 + 1, Math.floor((y + 1) * src.h / h)), s3 = [0, 0, 0]; let a = 0; for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) { const q = (j * src.w + i) * 4, al = src.data[q + 3]; for (let c = 0; c < 3; c++) s3[c] += src.data[q + c] * al; a += al; } const full = 255 * (x1 - x0) * (y1 - y0); for (let c = 0; c < 3; c++) o.data[(y * w + x) * 4 + c] = Math.round((s3[c] + BG[c] * (full - a)) / full); o.data[(y * w + x) * 4 + 3] = 255; } return o; };
  list.forEach((im, k) => {
    const X = 8 + k * (PW + 8), p = plantInPot(im, pot, null, opts[k]);
    sheet.fill(X, 8, PW, PW, '#323353'); sheet.blit(shrink(srcs[k], PW, PW), X, 8);
    sheet.fill(X, 16 + PW, PW, H * Z, '#323353'); sheet.blit(p, X, 16 + PW, Z);
  });
  writeFileSync(resolve(here, 'out', 'conv', `${key}_stages.png`), sheet.png());
  console.log('생장 단계 →', resolve(here, 'out', 'conv', `${key}_stages.png`), '· 축척', mature.s.toFixed(4));
}

// 움직임(--anim): 숨쉬기(motion.mjs idleField — 날숨에 내려앉으며 옆으로 넓어지고, 꽃잎·잎은 생긴 방향대로 펄럭이고, 얼굴은 늦게) + 깜빡임 + 종별 효과
//   불 = 불 혀가 오르내리고 옆으로 일렁이는 물결이 위로 흐르며(fireField), 밝은 단이 밑에서 올라가고, 불티가 혀 끝에서 떨어져 나감
//   전기 = saint11 방식 벼락·호·불똥 + 떠 있는 번개 문양 깜빡임
// 장마다 큰 원본을 움직여 다시 줄인다(rasterize) — 정수 칸 밀기의 줄 이음매(움직이는 가로선)가 없다.
// 64장 × 0.05초 = 3.2초 한 바퀴: 몸은 두 장마다(0.1초) 바뀌고 불·전기는 장마다. 숨은 한 바퀴에 두 번, 좌우 기울기는 한 번.
// 대기 동작 재료(--anim·--export 공용): 종별 특성표 FX·뼈대·효과 계획·장마다 움직임 → partsOf(k, f, 눈) = { im(식물), fxPaint(효과 칸) }, frameOf = 화분에 심은 장
async function animKit() {
  const { idleRig, idleField, fireRig, fireField, emberFrame, findTips, electricPlan, electricFrame } = await import('./motion.mjs');
  const pot = renderPot(POT3.pot_terra), FR = 64, DT = 5;
  // 종별 특성(사용자 2026-10-15 "식물 특성을 살려 — 단단한 금속은 반짝임·유광, 미끄덩한지 덩굴인지"): 몸놀림 세기 + amb(fx.mjs 효과)
  //  blinkAt = 깜빡이는 장(eyes.mjs에 눈 타원을 잰 종만, 종마다 다른 때) · 무거운 종은 숨이 작고, 말랑한 종은 눌림이 크고, 덩굴·리본은 펄럭임이 크다
  const LEAF = { hue: [85, 160], cmin: 0.04 };
  const FX = {
    flower_grass: { bob: 2, sway: 1, open: 1, petal: 0.6, leaf: 1.2, blinkAt: 22, amb: { shine: { mat: LEAF, box: [10, 0, 38, 44], at: 6, len: 6 }, petals: { from: 'head', color: '#f08aa0', edge: '#d8607a', dim: '#b04a62', vx: 0.12, vy: 0.32, every: 64, at: 34, life: 40 } } },
    thorn: { bob: 1.5, sway: 0.8, open: 1, petal: 1.1, leaf: 2.2, blinkAt: 40 },
    aqua: { bob: 2, squash: 1.5, sway: 0.8, open: 0.6, petal: 0.6, leaf: 1.0, amb: { bubbles: { mat: { hue: [170, 250], lmin: 0.62, cmin: 0.03 }, n: 3 }, drips: { n: 2, every: 40 }, twinkle: { mat: { hue: [170, 250], lmin: 0.7 }, n: 1, every: 28 } } },
    flower_wind: { bob: 1.5, sway: 1.3, open: 1, petal: 1.5, leaf: 1.4, blinkAt: 14, amb: { wind: { n: 2, y0: 6, y1: 52 }, petals: { from: 'right', color: '#c9a8f0', edge: '#a888e0', dim: '#8a70c0', vx: 0.95, vy: 0.06, sway: 1, every: 32, life: 26, n: 2 } } },
    spark: { bob: 2, sway: 1, open: 1, petal: 0.8, leaf: 1.2, electric: true, blinkAt: 50 },
    vine_water: { bob: 1.5, sway: 1.2, open: 0.6, petal: 1.6, leaf: 1.6, flutter: 1, blinkAt: 30, amb: { drips: { n: 2, every: 36 } } },
    cactus_fire: { bob: 1, sway: 0.5, open: 0, petal: 0, leaf: 0.6, fire: { up: 2.5, side: 0.9 }, blinkAt: 58 },
    gaia: { bob: 1, squash: 0.6, sway: 0.4, open: 0, petal: 0, leaf: 0.3, blinkAt: 46, amb: { gems: { mat: { hue: [150, 235], cmin: 0.06 }, at: 20 }, twinkle: { mat: { hue: [150, 235], cmin: 0.06 }, n: 2, every: 20 }, dust: { n: 5, pebble: { from: [70, 40], at: 44, floor: 75 } } } },
    flower_fire: { bob: 2, sway: 1, open: 1, petal: 0.8, leaf: 1.2, fire: { up: 2, side: 0.8 }, blinkAt: 26 },
    cactus_wind: { bob: 1, sway: 0.6, open: 0, petal: 0.3, leaf: 0.6, blinkAt: 10, amb: { wind: { n: 2, y0: 8, y1: 50 }, swirl: { at: 'holes', every: 24 } } },
    vine_wind: { bob: 1.5, sway: 1.3, open: 1, petal: 1.6, leaf: 1.9, blinkAt: 36, amb: { shine: { mat: { cmax: 0.05, lmin: 0.62 }, at: 18, len: 6 }, wind: { n: 1, y0: 10, y1: 60 } } },
    spore_cap: { bob: 2, squash: 1.5, sway: 0.7, open: 0.6, petal: 0.5, leaf: 0.8, blinkAt: 18, amb: { spores: { from: 'cap', n: 7 } } },
    // 새 종 넷(2026-10-16): 얼음 종꽃 = 서리 반짝 · 매끈한 빛 / 전깃줄 덩굴 = 전기 / 바위 버섯 = 수정 · 먼지 · 숨 작게 / 해파리 버섯 = 말랑 · 물방울 · 거품
    frost_bell: { bob: 1.5, sway: 1, open: 0.8, petal: 1, leaf: 1.2, blinkAt: 28, amb: { twinkle: { mat: { hue: [190, 260], lmin: 0.75 }, n: 2, every: 24 }, shine: { mat: { cmax: 0.05, lmin: 0.8 }, at: 12, len: 6 } } },
    volt_vine: { bob: 1.5, sway: 1.1, open: 1, petal: 1.4, leaf: 1.8, electric: true, blinkAt: 42 },
    stone_cap: { bob: 1, squash: 0.6, sway: 0.3, open: 0, petal: 0, leaf: 0.3, blinkAt: 34, amb: { gems: { mat: { hue: [150, 235], cmin: 0.06 }, at: 16 }, twinkle: { mat: { hue: [150, 235], cmin: 0.06 }, n: 1, every: 26 }, dust: { n: 4 } } },
    jelly_cap: { bob: 2, squash: 2.2, sway: 0.8, open: 0.6, petal: 1.2, leaf: 0.8, blinkAt: 20, amb: { drips: { n: 2, every: 34 }, bubbles: { mat: { hue: [190, 260], lmin: 0.6, cmin: 0.03 }, n: 3 } } },
    // 변이 고정 새 다섯(2026-10-17): 덫 꽃 = 덫이 크게 벌름 · 칼날 덩굴 = 불 + 칼날 번뜩 · 독 선인장 = 독 방울 · 용 과일 선인장 = 서리 반짝 · 불씨 버섯 = 불 + 불씨 포자
    fang_trap: { bob: 1.5, squash: 1, sway: 0.9, open: 1.2, petal: 0.8, leaf: 1.6, blinkAt: 38 },
    blade_vine: { bob: 1.5, sway: 1.1, open: 0.6, petal: 1, leaf: 1.6, fire: { up: 1.6, side: 0.7 }, blinkAt: 24, amb: { shine: { mat: { cmax: 0.05, lmin: 0.55 }, at: 10, len: 6 } } },
    toxi_cactus: { bob: 1, sway: 0.5, open: 0, petal: 0.4, leaf: 0.6, blinkAt: 48, amb: { drips: { n: 2, every: 30 } } },
    draco_fruit: { bob: 1, sway: 0.5, open: 0, petal: 0.3, leaf: 0.6, blinkAt: 32, amb: { twinkle: { mat: { hue: [170, 250], lmin: 0.72 }, n: 2, every: 22 }, shine: { mat: { cmax: 0.06, lmin: 0.8 }, at: 14, len: 6 } } },
    frost_drake: { bob: 1, sway: 0.5, open: 0, petal: 0.3, leaf: 0.6, flutter: 0.6, blinkAt: 40, amb: { twinkle: { mat: { hue: [170, 250], lmin: 0.72 }, n: 2, every: 22 }, shine: { mat: { cmax: 0.06, lmin: 0.8 }, at: 14, len: 6 } } },   // 2026-10-17 새 태생 용족(파란 얼음 용 — 날개 살짝 · 서리 반짝)
    gat_cap: { bob: 1.5, squash: 0.8, sway: 0.9, open: 0.4, petal: 1.2, leaf: 1.4, flutter: 1, blinkAt: 22, amb: { wind: { n: 2, y0: 20, y1: 70 } } },   // 갓끈 · 부채 바람
    mask_vine: { bob: 1.5, sway: 1.2, open: 0.6, petal: 1.4, leaf: 1.8, flutter: 1, blinkAt: 999 },   // 탈춤 소매 덩굴(탈 = 감은 눈 — 깜빡임 없음)
    lantern_vine: { bob: 1.5, sway: 1.2, open: 0.6, petal: 1.4, leaf: 1.6, flutter: 0.8, blinkAt: 26 },   // 청사초롱 흔들림
    jar_cactus: { bob: 1, squash: 0.8, sway: 0.5, open: 0, petal: 0.3, leaf: 0.6, blinkAt: 30, amb: { drips: { n: 2, every: 36 } } },   // 물동이 물방울
    goblin_cap: { bob: 2, squash: 1.4, sway: 0.7, open: 0.6, petal: 0.5, leaf: 0.8, electric: true, blinkAt: 34 },   // 방망이 번개
    crown_cap: { bob: 1.5, squash: 1.2, sway: 0.6, open: 0.4, petal: 0.5, leaf: 0.8, blinkAt: 44 },
    drum_cactus: { bob: 1.5, squash: 0.8, sway: 0.6, open: 0, petal: 0.4, leaf: 0.6, electric: true, blinkAt: 36 },   // 북 · 북채 번개
    drake_cactus: { bob: 1, sway: 0.5, open: 0, petal: 0.4, leaf: 0.8, flutter: 0.6, fire: { up: 1.8, side: 0.7 }, blinkAt: 52 },   // 태생 용족 불 선인장: 가시 끝 불 · 날개 살짝
    title_hero: { bob: 1, sway: 0.5, open: 0, petal: 0.3, leaf: 0.6, fire: { up: 1.8, side: 0.7 }, blinkAt: 44 },   // 처음 화면 대표 캐릭터 = 불꽃 용 선인장(가시 끝 불)
    ember_cap: { bob: 2, squash: 1.4, sway: 0.6, open: 0.6, petal: 0.5, leaf: 0.8, fire: { up: 1.8, side: 0.8 }, blinkAt: 16, amb: { spores: { from: 'cap', n: 6 } } },
    // 셋째 아홉(2026-10-17)
    gladi_cactus: { bob: 1, sway: 0.5, open: 0, petal: 0.3, leaf: 0.6, blinkAt: 30, amb: { shine: { mat: { cmax: 0.06, lmin: 0.55 }, at: 12, len: 6 } } },   // 청동 투구 · 방패 번뜩
    jangseung_cactus: { bob: 1, sway: 0.4, open: 0, petal: 0.3, leaf: 0.8, blinkAt: 44 },   // 장승 = 무거운 몸 · 숨 작게
    astro_cap: { bob: 2, squash: 1.2, sway: 0.7, open: 0.4, petal: 0.5, leaf: 0.8, blinkAt: 20, amb: { shine: { mat: { cmax: 0.05, lmin: 0.8 }, at: 10, len: 6 }, wind: { n: 1, y0: 40, y1: 80 } } },   // 유리 헬멧 빛 · 공기 분사
    viking_cap: { bob: 1.5, squash: 1, sway: 0.5, open: 0.4, petal: 0.5, leaf: 0.8, blinkAt: 38, amb: { twinkle: { mat: { hue: [170, 250], lmin: 0.72 }, n: 2, every: 24 } } },   // 얼음 뿔 · 서리 반짝
    hyunmu_cap: { bob: 1, squash: 0.8, sway: 0.5, open: 0.4, petal: 0.5, leaf: 0.8, flutter: 0.6, blinkAt: 48, amb: { drips: { n: 2, every: 34 }, shine: { mat: { cmax: 0.08, lmin: 0.7 }, at: 16, len: 6 } } },   // 젖은 등껍질 빛 · 물방울
    gumiho_bloom: { bob: 1.5, sway: 1.1, open: 1, petal: 1.2, leaf: 1.2, flutter: 0.8, fire: { up: 1.6, side: 0.7 }, blinkAt: 24 },   // 꼬리 꽃잎 펄럭 · 여우불
    wizard_bell: { bob: 1.5, sway: 1, open: 0.8, petal: 1, leaf: 1.2, electric: true, blinkAt: 32 },   // 별 지팡이 불똥
    ninja_vine: { bob: 1.5, sway: 1.3, open: 0.6, petal: 1.4, leaf: 1.8, flutter: 1.2, blinkAt: 40, amb: { wind: { n: 1, y0: 10, y1: 60 } } },   // 목도리 펄럭
    pirate_cactus: { bob: 1.2, squash: 0.9, sway: 0.6, open: 0.3, petal: 0.8, leaf: 0.8, flutter: 0.8, blinkAt: 26, amb: { shine: { mat: { cmax: 0.05, lmin: 0.8 }, at: 14, len: 6 }, drips: { n: 1, every: 40 } } },   // 2026-10-18 해적 · 가시 칼 반짝 · 물방울
    ranger_vine: { bob: 1.4, sway: 1.2, open: 0.5, petal: 1.2, leaf: 1.6, flutter: 1, blinkAt: 34, amb: { wind: { n: 1, y0: 12, y1: 60 } } },   // 숲 궁수 · 잎 망토
    miner_cap: { bob: 1, squash: 0.7, sway: 0.3, open: 0, petal: 0, leaf: 0.3, blinkAt: 22, amb: { gems: { mat: { hue: [25, 55], cmin: 0.25, lmin: 0.55 }, at: 18 }, dust: { n: 4 } } },   // 광부 · 호박 광석 반짝 · 흙먼지
    snow_ballet: { bob: 1.6, sway: 1.1, open: 0.9, petal: 1.2, leaf: 1.2, blinkAt: 30, amb: { twinkle: { mat: { hue: [190, 280], lmin: 0.75 }, n: 2, every: 22 }, shine: { mat: { cmax: 0.05, lmin: 0.82 }, at: 10, len: 6 } } },   // 얼음 발레리나
    volcano_cap: { bob: 1.6, squash: 1.2, sway: 0.5, open: 0.4, petal: 0.4, leaf: 0.6, blinkAt: 18, amb: { spores: { from: [[54, 11], [52, 12]], n: 5, spread: 4, color: '#c8c0b8', dim: '#8a8480' }, lava: { from: [[53, 12], [56, 13]], n: 2, every: 26 } } },   // 화산 갓 · 분화구 연기(회색) · 마그마 방울이 가끔 튐(2026-10-18 사용자)   // 화산 갓 · 분화구 불
    dandel_aero: { bob: 1.8, sway: 1.4, open: 1, petal: 1.6, leaf: 1.6, flutter: 1.3, blinkAt: 12, amb: { petals: { from: [[62, 24], [64, 34], [58, 16]], color: '#ffffff', edge: '#efe8d0', dim: '#cfc6a8', vx: 0.7, vy: -0.22, sway: 1.2, every: 22, life: 34, n: 3 } } },   // 민들레 비행사 · 홀씨가 하나씩 바람에 날아감(2026-10-18 사용자)   // 민들레 비행사 · 리본 목도리
    diver_vine: { bob: 1.5, sway: 1.2, open: 0.6, petal: 1.4, leaf: 1.6, flutter: 1, blinkAt: 28, amb: { drips: { n: 2, every: 36 }, shine: { mat: { cmax: 0.05, lmin: 0.8 }, at: 20, len: 6 } } },   // 젖은 잎 · 물안경 빛
  };
  const rigs = cvs.map(cv => idleRig(cv));
  const eplans = cvs.map((cv, k) => (FX[cv.key] || {}).electric ? electricPlan(rigs[k], findTips(cv, rigs[k]), { frames: FR }) : null);
  // 특성 효과 자리: 'head' = 머리 오른쪽 위, 'cap' = 갓 아래 가장자리, 'right' = 가장 오른쪽 끝 두 곳, 'holes' = 가장 높은 끝 두 곳 옆
  const { ambientPlan, ambientFrame } = await import('./fx.mjs');
  const resolveFrom = (k, v) => {
    const r = rigs[k];
    if (Array.isArray(v)) return v;
    if (v === 'head') return [[r.hx + r.Rh * 0.5, r.hy - r.Rh * 0.3]];
    if (v === 'cap') return [[r.hx - r.Rh, r.hy - 2], [r.hx, r.hy - 8], [r.hx + r.Rh, r.hy - 2]];
    const tips = findTips(cvs[k], r);
    if (v === 'right') return [...tips].sort((a, b) => b.x - a.x).slice(0, 2).map(t => [t.x, t.y]);
    if (v === 'holes') return [...tips].sort((a, b) => a.y - b.y).slice(0, 2).map(t => [t.x + (t.x < r.hx ? -3 : 3), t.y + 4]);
    return [[r.hx, r.hy]];
  };
  const ambs = cvs.map((cv, k) => {
    const a = (FX[cv.key] || {}).amb;
    if (!a) return null;
    const A = JSON.parse(JSON.stringify(a));
    if (A.petals) A.petals.from = resolveFrom(k, A.petals.from);
    if (A.spores) A.spores.from = resolveFrom(k, A.spores.from);
    if (A.swirl) A.swirl.at = resolveFrom(k, A.swirl.at);
    const pl = ambientPlan(cv, rigs[k], A, FR, 11 + k);
    console.log(`${cv.key.padEnd(13)} 특성 효과 · ${Object.keys(A).join('·')}${pl.shine ? ' · 광택 칸 ' + pl.shine.map(s => s.set.size).join('/') : ''}${pl.gems ? ` · 수정 면 ${pl.gems.facets.length}` : ''}${pl.bubbles ? ` · 거품 칸 ${pl.bubbles.cells.length}` : ''}${pl.drips ? ` · 물방울 ${pl.drips.tips.length}곳` : ''}${pl.twinkle ? ` · 반짝 칸 ${pl.twinkle.cells.length}` : ''}`);
    return pl;
  });
  // 불 재질 = 가장 밝은 단이 밝고 선명한 주황·노랑인 재질
  const fireMat = cv => cv.matL.map((_, m) => { const c = cv.palLab[m * LV + LV - 1]; return hueOf(c[1], c[2]) > 20 && hueOf(c[1], c[2]) < 100 && Math.hypot(c[1], c[2]) > 0.12 && c[0] > 0.68; });
  const fires = cvs.map(cv => (FX[cv.key] || {}).fire ? fireRig(cv, fireMat(cv)) : null);
  // 장마다 움직임 장(field) — 몸은 두 장마다, 불은 장마다
  const fieldOf = (k, f) => {
    const fx = FX[cvs[k].key] || {}, { field: body, head } = idleField(rigs[k], Math.floor(f / 2) * 2 / FR, fx), ff = fires[k] ? fireField(fires[k], f / FR, fx.fire) : null;
    const field = ff ? (X, Y) => { const a = body(X, Y), b = ff(Math.max(0, Math.min(W - 1, Math.round(X - a[0]))), Math.max(0, Math.min(H - 1, Math.round(Y - a[1])))); return [a[0] + b[0], a[1] + b[1]]; } : body;
    return { field, head };
  };
  const fieldsAll = cvs.map((_, k) => Array.from({ length: FR }, (_, f) => fieldOf(k, f)));
  const mapsAll = cvs.map((cv, k) => mixedMaps(cv, fieldsAll[k], fires[k] ? fireMat(cv) : null));
  // 깜빡임: blinkAt 장부터 반쯤 → 감음 → 감음 → 반쯤
  const eyeAt = (k, f) => { const b = (FX[cvs[k].key] || {}).blinkAt; return b == null ? 'open' : f === b + 1 || f === b + 2 ? 'closed' : f === b || f === b + 3 ? 'half' : 'open'; };
  // k번째 종의 f번째 장 재료(96×112): 식물 그림 + 효과 칸
  const partsOf = (k, f, eye = eyeAt(k, f)) => {
    const cv = cvs[k], rig = rigs[k], fx = FX[cv.key] || {}, sec = f * DT / 100, { field, head } = fieldsAll[k][f];
    const isF = fires[k] ? fireMat(cv) : null;
    const tone = isF ? (m, l, x, y) => isF[m] ? Math.max(0, Math.min(LV - 1, l + [1, 0, -1, 0][Math.floor(((y / 5 + sec * 5) % 4 + 4) % 4)])) : l : null;
    const maps = mapsAll[k][f];
    const srcOf = (x, y) => { const [dx, dy] = field(x, y), sx = Math.round(x - dx), sy = Math.round(y - dy); return sx >= 0 && sy >= 0 && sx < W && sy < H ? sy * W + sx : -1; };
    const im = paint(cv, { maps, tone, eye, eyeOff: head, srcOf });
    const at = p => { const [dx, dy] = field(Math.max(0, Math.min(W - 1, Math.floor(p[0]))), Math.max(0, Math.min(H - 1, Math.floor(p[1])))); return [p[0] + dx, p[1] + dy]; };
    const fxPaint = [], put = (x, y, c) => fxPaint.push([x, y, c]);
    if (eplans[k]) {
      const { flash, bitState } = electricFrame(f, eplans[k], at, put);
      for (let i = 0; i < W * H; i++) {   // 떠 있는 번개 문양: 가끔 숨고 가끔 하얗게
        const j = im.src[i];
        if (j < 0) continue;
        const st = bitState[rig.comp[j]];
        if (st === 1) im.data[i * 4 + 3] = 0;
        else if (st === 2) im.set(i % W, Math.floor(i / W), '#ffffff');
      }
      for (const fl of flash) for (let y = Math.floor(fl.y - fl.r); y <= fl.y + fl.r; y++) for (let x = Math.floor(fl.x - fl.r); x <= fl.x + fl.r; x++) {   // 대비 장: 번쩍임 둘레 식물을 밝게
        if (x < 0 || y < 0 || x >= W || y >= H || Math.hypot(x + 0.5 - fl.x, y + 0.5 - fl.y) > fl.r) continue;
        const q = (y * W + x) * 4;
        if (im.data[q + 3] < 128) continue;
        for (let c = 0; c < 3; c++) im.data[q + c] = Math.round(im.data[q + c] + (255 - im.data[q + c]) * 0.45);
      }
    }
    if (fires[k]) emberFrame(f, fires[k], at, put, { seed: 3 + k });
    if (ambs[k]) ambientFrame(f, ambs[k], im, at, put, (1 - Math.cos(2 * Math.PI * (fx.breaths || 2) * Math.floor(f / 2) * 2 / FR)) / 2);
    return { im, fxPaint };
  };
  // 화분 뒤 → 식물 → 화분 앞 → 효과
  const frameOf = (k, f, bg = null) => {
    const { im, fxPaint } = partsOf(k, f), out = plantInPot(im, pot, bg, { sink: sinkOf(cvs[k].outKey || cvs[k].key), frontMask: cvs[k].front });
    for (const [x, y, c] of fxPaint) out.set(x, y, c);
    return out;
  };
  return { FX, FR, DT, pot, rigs, eplans, fires, findTips, eyeAt, partsOf, frameOf };
}

if (anim) {
  const { encodeGIF } = await import('./gif.mjs');
  const { FR, DT, rigs, eplans, fires, findTips, frameOf } = await animKit(), Z = 3, BG = '#2f3150';
  const zoom = (list, z, bg) => list.map(c => { const o = new Img(c.w * z, c.h * z, bg); o.blit(c, 0, 0, z); return o; });
  // 여러 종 격자: 4종까지 2열 3배, 7종 이상은 4열 2배(휴대폰에서 한 화면에 — 12종 = 768×672)
  const cols = cvs.length > 6 ? 4 : cvs.length > 2 ? 2 : cvs.length, ZG = cvs.length > 6 ? 2 : Z, rows = Math.ceil(cvs.length / cols), frames = [];
  for (let f = 0; f < FR; f++) {
    const fr = new Img(cols * W * ZG, rows * H * ZG, BG);
    cvs.forEach((cv, k) => fr.blit(frameOf(k, f), (k % cols) * W * ZG, Math.floor(k / cols) * H * ZG, ZG));
    frames.push(fr);
  }
  const base = resolve(here, 'out', 'conv', keys.join('+'));
  writeFileSync(base + '.gif', encodeGIF(frames, { delay: DT }));
  console.log('움직임 →', base + '.gif');
  if (MP4) (await import('./video.mjs')).writeMP4(base + '.mp4', frames, { delay: DT, loops: 4, fps: 20 });
  // --frames=a,b,c: 종마다 그 장들을 나란히(검토용 정지 그림)
  const fl = args.find(a => a.startsWith('--frames='));
  if (fl) for (let k = 0; k < cvs.length; k++) {
    const list = fl.slice(9).split(',').map(Number), st = new Img(4 + list.length * (W * Z + 4), H * Z + 8, '#2e222f');
    list.forEach((f, i) => st.blit(frameOf(k, f, BG), 4 + i * (W * Z + 4), 4, Z));
    writeFileSync(resolve(here, 'out', 'conv', (cvs[k].outKey || cvs[k].key) + '_frames.png'), st.png());
  }
  // 종마다 크게: GIF 4배 + MP4 8배
  for (let k = 0; k < cvs.length; k++) {
    const one = Array.from({ length: FR }, (_, f) => frameOf(k, f, BG)), p = resolve(here, 'out', 'conv', (cvs[k].outKey || cvs[k].key) + '_idle'), r = rigs[k];
    writeFileSync(p + '.gif', encodeGIF(zoom(one, 4, BG), { delay: DT }));
    if (MP4) (await import('./video.mjs')).writeMP4(p + '.mp4', zoom(one, 8, BG), { delay: DT, loops: 4, fps: 20 });
    // 떨림 재기: 장마다 바뀐 칸 수(평균) — 매 장 다시 줄이는 방식의 위험(테두리 칸이 자글자글 끓음) 확인용
    let ch = 0;
    for (let f = 0; f < FR; f++) { const a = one[f].data, c = one[(f + 1) % FR].data; for (let i = 0; i < a.length; i += 4) if (a[i] !== c[i] || a[i + 1] !== c[i + 1] || a[i + 2] !== c[i + 2]) ch++; }
    console.log(`${cvs[k].key.padEnd(13)} 얼굴 (${r.hx.toFixed(1)}, ${r.hy.toFixed(1)}) 머리 반지름 ${r.Rh.toFixed(1)} · 떠 있는 조각 ${r.bits.filter(Boolean).length}개${eplans[k] ? ' · 전기 끝점 ' + findTips(cvs[k], r).length + '개' : ''}${fires[k] ? ` · 불 칸 ${fires[k].n}개·혀 끝 ${fires[k].tips.length}개` : ''} · 장마다 바뀐 칸 평균 ${(ch / FR).toFixed(0)}`);
  }
}

// v2 게임 묶음(--export <키…>): 종마다 대기 64장(눈 뜸) + 깜빡임 4장(blinkAt부터 반쯤·감음·감음·반쯤) × 두 층
//   under = 화분 뒤와 화분 앞 사이(식물 + 흙 덮기), over = 화분 앞보다 앞(테 밖으로 나온 덩어리 + 특성 효과) — 게임은 화분 뒤 → under → 화분 앞 → over
//   → assets/v2/plants/<키>.png(17열 격자, 위 = under 줄들, 아래 = over 줄들) + <키>.json(장 크기·시간·깜빡임·굽·흙·얼굴), 화분 다섯 → assets/v2/pots/<화분>_back.png·_front.png
if (args.includes('--export') && cvs.length) {
  const { FX, FR, DT, rigs, partsOf } = await animKit(), { plantLayers } = await import('./potblend.mjs'), { BASE_GEO } = await import('./pot3d.mjs');
  const dir = resolve(here, '..', '..', '..', 'assets', 'v2'), COLS = 17, pot = renderPot(POT3.pot_terra);
  mkdirSync(resolve(dir, 'plants'), { recursive: true }); mkdirSync(resolve(dir, 'pots'), { recursive: true });
  for (const [name, style] of Object.entries(POT3)) { const p = renderPot(style); writeFileSync(resolve(dir, 'pots', name + '_back.png'), p.back.png()); writeFileSync(resolve(dir, 'pots', name + '_front.png'), p.front.png()); }
  cvs.forEach((cv, k) => {
    const b = (FX[cv.key] || {}).blinkAt, list = Array.from({ length: FR }, (_, f) => [f, 'open']);
    if (b != null) ['half', 'closed', 'closed', 'half'].forEach((e, i) => list.push([(b + i) % FR, e]));
    const N = list.length, rows = Math.ceil(N / COLS), sheet = new Img(COLS * W, rows * 2 * H);
    list.forEach(([f, eye], i) => {
      const { im, fxPaint } = partsOf(k, f, eye), { under, over } = plantLayers(im, pot, { sink: sinkOf(cv.outKey || cv.key), frontMask: cv.front });
      for (const [x, y, c] of fxPaint) over.set(x, y, c);
      const cx = (i % COLS) * W, cy = Math.floor(i / COLS) * H;
      sheet.blit(under, cx, cy); sheet.blit(over, cx, cy + rows * H);
    });
    const okey = cv.outKey || cv.key;   // 단계 묶음은 <키>_<단계>
    writeFileSync(resolve(dir, 'plants', okey + '.png'), sheet.png());
    const r = rigs[k];
    writeFileSync(resolve(dir, 'plants', okey + '.json'), JSON.stringify({ w: W, h: H, cols: COLS, rows, frames: FR, frameMs: DT * 10, blinkAt: b ?? null, blinkIndex: b != null ? FR : null, base: [BASE_GEO.cx, +BASE_GEO.cy.toFixed(2)], soil: [POT_GEO.cx, +POT_GEO.cy.toFixed(2)], head: [+r.hx.toFixed(1), +r.hy.toFixed(1)], headR: +r.Rh.toFixed(1), sink: sinkOf(okey) }));   // sink = 흙에 앉힌 칸(스마트팜은 화분 없이 잔디에 심어 그만큼 다시 올림)
    console.log(`${okey.padEnd(13)} 묶음 → ${resolve(dir, 'plants', okey + '.png')} · ${N}장${b != null ? '(깜빡임 4장 포함)' : ''}`);
  });
}

// 공격(--attack <키…>): 종마다 다음 종을 상대로 대표 기술 한 번(attack.mjs) — v2 전투 배치 무대(stage.mjs, 270×348 1배), 48장 × 0.05초.
//   나(왼쪽 아래) → 상대(오른쪽 위·좌우 뒤집힘). 바닥을 타는 기술(GROUND)은 거꾸로(상대 → 나)도 굽는다(<키>_rev). --both 면 모든 기술을 양쪽으로.
//   그리는 순서(가상 3D 깊이): 무대 → 바닥 층(갈라짐·물자국) → 먼 화분보다 뒤에 선 효과 → 먼 화분 → 사이 효과 → 가까운 화분 → 앞 효과 → 공중 효과(o 테두리·p 입자) → 화면 흔들림
//   → out/conv/<이름>_attack.gif(2배), attacks_all.mp4(--mp4, 3배·이어 붙임 — 없으면 attacks_all.gif), attacks_sheet.png(핵심 장면)
// 변이 스킬(--variants <공격 키> <대상 키>): 같은 식물에 5변이형 기본 변이 스킬을 차례로(공격 쪽 = 변이 후광·문장) → variants_all.mp4·variants_sheet.png
// 무기 변이(--weapons <공격 키> <대상 키>): 무기 공격 13가지(검 베기·찌르기, 도끼, 총 셋, 망치, 창, 단검, 채찍, 낫, 방패)를 차례로 → weapons_all.mp4·weapons_sheet.png
if (args.includes('--attack') || args.includes('--variants') || args.includes('--weapons')) {
  const { encodeGIF } = await import('./gif.mjs');
  const { idleRig, attackField } = await import('./motion.mjs');
  const { ATTACKS, VARIANTS, WEAPONS, GROUND, FRA, impactAt, attackerPose, targetPose, cameraShake, skillFx, statusFx } = await import('./attack.mjs');
  const { rimTint, emblem } = await import('./forms.mjs');
  const ST = await import('./stage.mjs'), { BASE_GEO } = await import('./pot3d.mjs');
  const pot = renderPot(POT3.pot_terra), SW = ST.SW, SH = ST.SH, BGIM = ST.stageBg(), BG = '#2e222f';
  const rigs = cvs.map(cv => idleRig(cv));
  const mirror = im => { const o = new Img(im.w, im.h); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const s = (y * im.w + x) * 4, d = (y * im.w + im.w - 1 - x) * 4; o.data.set(im.data.subarray(s, s + 4), d); } return o; };
  const flash = im => { const o = new Img(W, H); for (let i = 0; i < W * H; i++) if (im.data[i * 4 + 3] >= 128) o.data.set([255, 255, 255, 255], i * 4); return o; };
  const plantAt = (k, pose) => paint(cvs[k], { maps: rasterize(cvs[k].src, attackField(rigs[k], pose)), eyeOff: [pose.qx || 0, pose.qy || 0] });
  const zoom = (list, z) => list.map(c => { const o = new Img(c.w * z, c.h * z, BG); o.blit(c, 0, 0, z); return o; });
  // 화면 흔들림: 장 전체를 옮기고 비는 가장자리는 끝 줄을 늘인다
  const shift = (im, dx, dy) => { const o = new Img(im.w, im.h); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const sx = Math.max(0, Math.min(im.w - 1, x - dx)), sy = Math.max(0, Math.min(im.h - 1, y - dy)); o.data.set(im.data.subarray((sy * im.w + sx) * 4, (sy * im.w + sx) * 4 + 4), (y * im.w + x) * 4); } return o; };
  const variants = args.includes('--variants'), weapons = args.includes('--weapons'), both = args.includes('--both'), all = [], sheetRows = [];
  const only = (args.find(x => x.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
  let jobs = weapons ? Object.keys(WEAPONS).filter(wk => !only.length || only.includes(wk)).map(wk => ({ a: 0, t: cvs.length > 1 ? 1 : 0, A: WEAPONS[wk], form: 'weapon', name: wk }))
    : variants ? Object.keys(VARIANTS).map(form => ({ a: 0, t: cvs.length > 1 ? 1 : 0, A: VARIANTS[form], form, name: form })) : cvs.map((cv, a) => ({ a, t: (a + 1) % cvs.length, A: ATTACKS[cv.key], form: null, name: cv.key }));
  const revOnly = (args.find(x => x.startsWith('--rev=')) || '').slice(6).split(',').filter(Boolean);   // 이 이름들만 거꾸로(상대 → 나)도
  jobs = jobs.flatMap(j => j.A && (both || GROUND.has(j.A.kind) || revOnly.includes(j.name)) ? [{ ...j, rev: false }, { ...j, rev: true, name: j.name + '_rev' }] : [{ ...j, rev: false }]);
  const farY = ST.SPOTS.far.base[1], nearY = ST.SPOTS.near.base[1], inS = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH;
  for (const { a, t, A, form, name, rev } of jobs) {
    if (!A || (!variants && !weapons && cvs.length < 2)) continue;
    const I = impactAt(A), ra = rigs[a], rt = rigs[t], frames = [];
    // 자리: 기본 = 나(가까움) → 상대(멂). 먼 쪽은 좌우 뒤집어 상대를 본다
    const atk = rev ? ST.SPOTS.far : ST.SPOTS.near, tgt = rev ? ST.SPOTS.near : ST.SPOTS.far, aM = rev, tM = !rev;
    const [AXs, AYs] = ST.spriteAt(atk.base), [TXs, TYs] = ST.spriteAt(tgt.base), dirY = Math.sign(tgt.base[1] - atk.base[1]);
    const hxOf = (rig, M) => M ? W - 1 - rig.hx : rig.hx;
    // 바닥 길: 공격 쪽 굽 가장자리(상대 쪽) → 대상 굽 가장자리(공격 쪽) — 화분 뒤 반쪽이면 옆으로 당김
    const rf = BASE_GEO.rf + 3, phiS = ST.sideAngle(atk.base, tgt.base), phiE = ST.sideAngle(tgt.base, atk.base);
    const S0 = ST.onRing(atk.base, rf, phiS), E0 = ST.onRing(tgt.base, rf, phiE);
    // 대상 윗머리 점 셋(무대 좌표)
    const pts = [-8, 0, 8].map(dx => { const x = Math.round(rt.hx + dx); let y = 0; while (y < H && cvs[t].cm[y * W + x] < 0) y++; return [TXs + (tM ? W - 1 - x : x), TYs + Math.min(y, H - 1)]; });
    // 앞으로 내미는 몸놀림은 상대가 있는 위·아래로도 조금(마주 보는 각도)
    const lean = p => A.move === 'lunge' && p.qx > 0 ? { ...p, qy: p.qy + Math.round(dirY * p.qx * 0.35) } : p;
    for (let f = 0; f < FRA; f++) {
      const fz = f === I + 1 ? I : f, pose = lean(attackerPose(fz, A)), prev = lean(attackerPose(Math.max(0, fz - 1), A)), tp = targetPose(f, I, A);
      const aim = plantAt(a, { ...pose, px: prev.qx, py: prev.qy });
      if (form) rimTint(aim, form, 0.45, 0.4 + 0.25 * Math.sin(f / FRA * 4 * Math.PI), Math.floor(P.cy) - 3);
      const tqy = Math.round(dirY * tp.kb * 0.35);   // 넉백도 공격 반대쪽 위·아래로
      let tim = plantAt(t, { qx: -tp.kb, qy: tqy, sq: tp.kb ? 0.6 : 0, px: -Math.max(0, tp.kb - 1), py: tqy });
      if (tp.flash) tim = flash(tim);
      const aSpr = aM ? mirror(plantInPot(aim, pot)) : plantInPot(aim, pot), tSpr = tM ? mirror(plantInPot(tim, pot)) : plantInPot(tim, pot);
      const L = [AXs + hxOf(ra, aM) + (aM ? -pose.qx : pose.qx), AYs + ra.hy + pose.qy];
      const T = [TXs + hxOf(rt, tM) + (tM ? tp.kb : -tp.kb), TYs + rt.hy + tqy - tp.hop], G = TYs + POT_GEO.cy - tp.hop;
      const dl = Math.hypot(T[0] - L[0], T[1] - L[1]) || 1;
      const S = { D: [(T[0] - L[0]) / dl, (T[1] - L[1]) / dl], fx: Math.sign(T[0] - L[0]) || 1, K: ST.K, A0: atk.base, B0: tgt.base, S0, E0, phiS, phiE, rf, Rh: ra.Rh, soilA: AYs + POT_GEO.cy };
      // 효과 층: f = 바닥(색 또는 어둡게 곱), u = 바닥에 선 것(깊이 = 바닥 닿는 줄 → 화분 앞뒤, 테두리), s = 바닥에 선 부드러운 것(먼지, 테두리 없음), o = 공중 큰 모양(테두리), p = 입자
      const lf = new Map(), lu = [new Map(), new Map(), new Map()], ls = [new Map(), new Map(), new Map()], lo = new Map(), lp = new Map(), dep = d => d < farY ? 0 : d < nearY ? 1 : 2;
      const P2 = { o: (x, y, c) => { if (inS(x, y)) lo.set(y * SW + x, c); }, p: (x, y, c) => { if (inS(x, y)) lp.set(y * SW + x, c); }, f: (x, y, c) => { if (inS(x, y)) lf.set(y * SW + x, c); }, u: (x, y, c, d) => { if (inS(x, y)) lu[dep(d)].set(y * SW + x, c); }, s: (x, y, c, d) => { if (inS(x, y)) ls[dep(d)].set(y * SW + x, c); } };
      skillFx(P2, A, fz, L, T, G, 7 + a, S);
      statusFx(P2, A, f, T, G, pts.map(([x, y]) => [x + (tM ? tp.kb : -tp.kb), y + tqy - tp.hop]), L, 9 + a);
      const stage = new Img(SW, SH); stage.data.set(BGIM.data);
      for (const [i, c] of lf) { if (typeof c === 'number') for (let q = 0; q < 3; q++) stage.data[i * 4 + q] = Math.round(stage.data[i * 4 + q] * c); else stage.set(i % SW, Math.floor(i / SW), c); }
      const outlined = m => { for (const i of m.keys()) { const x = i % SW, y = (i - x) / SW; for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (inS(nx, ny) && !m.has(ny * SW + nx)) stage.set(nx, ny, '#1a1424'); } for (const [i, c] of m) stage.set(i % SW, Math.floor(i / SW), c); };
      const sprites = [[aSpr, AXs, AYs, atk === ST.SPOTS.far], [tSpr, TXs + tp.shake, TYs - tp.hop, tgt === ST.SPOTS.far]].sort((p, q) => q[3] - p[3]);   // 먼 쪽 먼저
      const soft = m => { for (const [i, c] of m) stage.set(i % SW, Math.floor(i / SW), c); };
      outlined(lu[0]); soft(ls[0]); stage.blit(sprites[0][0], sprites[0][1], sprites[0][2]);
      outlined(lu[1]); soft(ls[1]); stage.blit(sprites[1][0], sprites[1][1], sprites[1][2]);
      outlined(lu[2]); soft(ls[2]); outlined(lo);
      for (const [i, c] of lp) stage.set(i % SW, Math.floor(i / SW), c);
      if (form) emblem((x, y, c) => stage.set(x, y, c), 4, SH - 22, form, 2);   // 변이 문장: 공격 쪽(왼쪽 아래) 구석
      const [sx, sy] = cameraShake(f, A, I);
      frames.push(sx || sy ? shift(stage, sx, sy) : stage);
    }
    writeFileSync(resolve(here, 'out', 'conv', name + (variants ? '_variant.gif' : weapons ? '_weapon.gif' : '_attack.gif')), encodeGIF(zoom(frames, 2), { delay: 5 }));
    const fl = args.find(x => x.startsWith('--frames='));   // 검토용: 지정 장을 나란히(1배)
    if (fl) { const list = fl.slice(9).split(',').map(Number), st = new Img(4 + list.length * (SW + 4), SH + 8, '#2e222f'); list.forEach((ff, i) => st.blit(frames[Math.min(FRA - 1, ff)], 4 + i * (SW + 4), 4)); writeFileSync(resolve(here, 'out', 'conv', name + '_attack_frames.png'), st.png()); }
    all.push(...frames);
    sheetRows.push((GROUND.has(A.kind) ? [13, 15, 17, I, I + 3] : [10, 13, I, I + 2, I + 6]).map(f => frames[Math.min(FRA - 1, f)]));
    console.log(`${name.padEnd(17)} ${cvs[a].key} → ${cvs[t].key} · ${A.kind}/${A.move} · 맞는 장 ${I} · 성질 ${A.status}${rev ? ' · 상대 → 나' : ''}`);
  }
  if (all.length) {
    const tag = (args.find(x => x.startsWith('--tag=')) || '').slice(6) || (variants ? 'variants' : weapons ? 'weapons' : 'attacks');
    if (MP4) (await import('./video.mjs')).writeMP4(resolve(here, 'out', 'conv', tag + '_all.mp4'), all, { delay: 5, loops: 1, fps: 20, zoom: 3 });
    else writeFileSync(resolve(here, 'out', 'conv', tag + '_all.gif'), encodeGIF(zoom(all, 2), { delay: 5 }));
    const sheet = new Img(4 + 5 * (SW + 4), 4 + sheetRows.length * (SH + 4), '#2e222f');
    sheetRows.forEach((row, r) => row.forEach((im, c) => sheet.blit(im, 4 + c * (SW + 4), 4 + r * (SH + 4))));
    writeFileSync(resolve(here, 'out', 'conv', tag + '_sheet.png'), sheet.png());
    console.log('모아보기 →', resolve(here, 'out', 'conv', tag + '_sheet.png'));
  }
}

// 무대 도트 크기 비교(--scales <가까운 키> <먼 키>): v2 전투 배치에 ① 1배 무대 + 1배 식물 ② 지금 2배 무대 + 1배 식물(칸 크기 섞임) ③ 2배 무대 + 2배 식물
//   → out/conv/stage_scales.png(위 = 무대 셋 2배, 아래 = 가까운 식물 둘레 3배 확대)
if (args.includes('--scales') && cvs.length >= 2) {
  const ST = await import('./stage.mjs'), { BASE_GEO: B } = await import('./pot3d.mjs');
  const pot = renderPot(POT3.pot_terra), SW = ST.SW, SH = ST.SH;
  const mirror = im => { const o = new Img(im.w, im.h); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const s = (y * im.w + x) * 4, d = (y * im.w + im.w - 1 - x) * 4; o.data.set(im.data.subarray(s, s + 4), d); } return o; };
  const near = plantInPot(paint(cvs[0]), pot), far = mirror(plantInPot(paint(cvs[1]), pot));
  const place = (bg, nearB, farB, z) => { const im = new Img(SW, SH); im.data.set(bg.data); for (const [spr, b] of [[far, farB], [near, nearB]]) im.blit(spr, Math.round(b[0] - B.cx * z), Math.round(b[1] - B.cy * z), z); return im; };
  const bg2 = ST.stageBg2x(), n2 = [ST.SPOTS2.near[0], ST.SPOTS2.near[1] - 1], f2 = [ST.SPOTS2.far[0], ST.SPOTS2.far[1] - 1];
  const opts = [place(ST.stageBg(), ST.SPOTS.near.base, ST.SPOTS.far.base, 1), place(bg2, n2, f2, 1), place(bg2, n2, f2, 2)];
  const G = 12, Zt = 2, Zc = 3, CX = 16, CY = 196, CW = 124, CH = 130, colW = SW * Zt;
  const sheet = new Img(G + 3 * (colW + G), G + SH * Zt + G + CH * Zc + G, '#16121c');
  opts.forEach((im, i) => {
    const x0 = G + i * (colW + G);
    sheet.blit(im, x0, G, Zt);
    const crop = new Img(CW, CH); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const s = ((CY + y) * SW + CX + x) * 4; crop.data.set(im.data.subarray(s, s + 4), (y * CW + x) * 4); }
    sheet.blit(crop, x0 + Math.round((colW - CW * Zc) / 2), G + SH * Zt + G, Zc);
  });
  writeFileSync(resolve(here, 'out', 'conv', 'stage_scales.png'), sheet.png());
  console.log('무대 도트 크기 비교 →', resolve(here, 'out', 'conv', 'stage_scales.png'));
}

// 변이 연출 시제품(--forms <키>): 무변이 + 5변이형(테두리 빛·문장·기운)을 3×2로 → <키>_forms.png·.gif(·mp4), 발견 공개 5변이형 이어 붙임 → <키>_reveal.gif(·mp4)
if (args.includes('--forms') && cvs.length) {
  const { encodeGIF } = await import('./gif.mjs');
  const { idleRig, idleField } = await import('./motion.mjs');
  const { FORMS, emblem, rimTint, auraFrame, revealFrame } = await import('./forms.mjs');
  const pot = renderPot(POT3.pot_terra), FR = 64, BG = '#2f3150', cv = cvs[0], rig = idleRig(cv), forms = [null, ...Object.keys(FORMS)];
  const fields = Array.from({ length: FR }, (_, f) => idleField(rig, Math.floor(f / 2) * 2 / FR, {})), maps = mixedMaps(cv, fields);
  const plantFrame = (f, form) => {
    const { field, head } = fields[f], im = paint(cv, { maps: maps[f], eyeOff: head }), parts = [];
    const at = p => { const [dx, dy] = field(Math.max(0, Math.min(W - 1, Math.floor(p[0]))), Math.max(0, Math.min(H - 1, Math.floor(p[1])))); return [p[0] + dx, p[1] + dy]; };
    if (form) { auraFrame(f, form, rig, cv.eyeC, at, (x, y, c) => parts.push([x, y, c]), im, FR); rimTint(im, form, 0.45, 0.4 + 0.25 * Math.sin(f / FR * 4 * Math.PI), Math.floor(P.cy) - 3); }
    const out = plantInPot(im, pot, BG);
    for (const [x, y, c] of parts) if (x >= 0 && y >= 0 && x < W && y < H) out.set(x, y, c);
    if (form) emblem((x, y, c) => out.set(x, y, c), 2, 2, form, 2);
    return out;
  };
  const zoom = (list, z) => list.map(c => { const o = new Img(c.w * z, c.h * z, BG); o.blit(c, 0, 0, z); return o; });
  const grid = [];
  for (let f = 0; f < FR; f++) { const g = new Img(3 * W * 2, 2 * H * 2, BG); forms.forEach((fm, i) => g.blit(plantFrame(f, fm), (i % 3) * W * 2, Math.floor(i / 3) * H * 2, 2)); grid.push(g); }
  const base = resolve(here, 'out', 'conv', cv.key);
  writeFileSync(base + '_forms.png', grid[20].png());
  writeFileSync(base + '_forms.gif', encodeGIF(grid, { delay: 5 }));
  const rev = [];
  for (const fm of forms.slice(1)) for (let k = 0; k < 40; k++) { const st = new Img(W, H, BG); revealFrame(st, k, fm, P.cx, P.cy - 14, () => st.blit(plantFrame((k * 2) % FR, fm), 0, 0)); rev.push(st); }
  writeFileSync(base + '_reveal.gif', encodeGIF(zoom(rev, 3), { delay: 5 }));
  { const pick = [2, 7, 10, 12, 14, 17, 30], st = new Img(4 + pick.length * (W * 2 + 4), H * 2 + 8, '#2e222f'); pick.forEach((k, i) => st.blit(rev[160 + k], 4 + i * (W * 2 + 4), 4, 2)); writeFileSync(base + '_reveal_frames.png', st.png()); }   // 검토: 용족 공개 핵심 장
  if (MP4) { const { writeMP4 } = await import('./video.mjs'); writeMP4(base + '_forms.mp4', grid, { delay: 5, loops: 3, fps: 20 }); writeMP4(base + '_reveal.mp4', zoom(rev, 4), { delay: 5, loops: 1, fps: 20 }); }
  console.log('변이 연출 →', base + '_forms.png · _forms.gif · _reveal.gif');
}

// 깜빡임 확인(--blink, 움직임 없이도 됨): 종마다 뜬 눈 · 반쯤 · 감음 4배 + 얼굴 10배, 여러 종이면 얼굴을 한 장(blink_all.png)으로
if (BLINK) {
  const { encodeGIF } = await import('./gif.mjs');
  const pot = renderPot(POT3.pot_terra), allFaces = [];
  const zoom = (list, z, bg) => list.map(c => { const o = new Img(c.w * z, c.h * z, bg); o.blit(c, 0, 0, z); return o; });
  for (const cv of cvs) {
    if (!cv.eyeC.length || (EYES[cv.key] || {}).closed) continue;
    const Z4 = 4, sh = new Img(8 + 3 * (W * Z4 + 8), H * Z4 + 16, '#2e222f');
    ['open', 'half', 'closed'].forEach((st, k) => { const p = plantInPot(paint(cv, { eye: st }), pot); sh.fill(8 + k * (W * Z4 + 8), 8, W * Z4, H * Z4, '#323353'); sh.blit(p, 8 + k * (W * Z4 + 8), 8, Z4); });
    writeFileSync(resolve(here, 'out', 'conv', cv.key + '_blink.png'), sh.png());
    // 얼굴 확대(10배, 두 눈 둘레 30×18칸): 뜬 눈 · 반쯤 · 감음 + 잰 값
    const ex = cv.eyeC.reduce((a, e) => a + e[0], 0) / cv.eyeC.length, ey = cv.eyeC.reduce((a, e) => a + e[1], 0) / cv.eyeC.length;
    const CW = 30, CHh = 18, Z10 = 10, X0 = Math.round(ex - CW / 2), Y0 = Math.round(ey - CHh / 2), face = new Img(8 + 3 * (CW * Z10 + 8), CHh * Z10 + 16, '#2e222f');
    ['open', 'half', 'closed'].forEach((st, k) => {
      const im = paint(cv, { eye: st }), crop = new Img(CW, CHh, '#323353');
      for (let y = 0; y < CHh; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 0 && sy >= 0 && sx < W && sy < H) { const s4 = (sy * W + sx) * 4; if (im.data[s4 + 3] > 127) crop.data.set(im.data.subarray(s4, s4 + 4), (y * CW + x) * 4); } }
      face.blit(crop, 8 + k * (CW * Z10 + 8), 8, Z10);
    });
    writeFileSync(resolve(here, 'out', 'conv', cv.key + '_blink_face.png'), face.png());
    allFaces.push(face);
    // 얼굴 영상: 흔들림 없이 깜빡임만(뜬 눈 1.6초 → 반쯤 0.06 → 감음 0.12 → 반쯤 0.06). GIF 10배 + --mp4면 MP4 20배. 화분 전체는 --anim의 <키>_idle
    const seq = [['open', 160], ['half', 6], ['closed', 12], ['half', 6]];
    const faces = seq.map(([st]) => { const im = paint(cv, { eye: st }), c1 = new Img(CW, CHh, '#323353'); for (let y = 0; y < CHh; y++) for (let x = 0; x < CW; x++) { const sx = X0 + x, sy = Y0 + y; if (sx >= 0 && sy >= 0 && sx < W && sy < H) { const s4 = (sy * W + sx) * 4; if (im.data[s4 + 3] > 127) c1.data.set(im.data.subarray(s4, s4 + 4), (y * CW + x) * 4); } } return c1; });
    writeFileSync(resolve(here, 'out', 'conv', cv.key + '_blink_face.gif'), encodeGIF(zoom(faces, Z10, '#323353'), { delay: seq.map(s => s[1]) }));
    if (MP4) (await import('./video.mjs')).writeMP4(resolve(here, 'out', 'conv', cv.key + '_blink_face.mp4'), zoom(faces, 20, '#323353'), { delay: seq.map(s => s[1]), loops: 6 });
    const geo = eyeGeometry(paint(cv), cv);
    console.log(`깜빡임 확인 → ${cv.key}_blink.png · _blink_face.png · 얼굴 기울기 ${geo.length ? (geo[0].th * 180 / Math.PI).toFixed(1) : '-'}° · 눈 칸 ${(cv.eyeGrid || []).map(g => g ? g.pts.length : 0).join('·')}`);
  }
  if (allFaces.length > 1) {
    const sheet = new Img(allFaces[0].w, allFaces.reduce((s, f) => s + f.h, 0), '#2e222f');
    let y = 0;
    for (const f of allFaces) { sheet.blit(f, 0, y); y += f.h; }
    writeFileSync(resolve(here, 'out', 'conv', 'blink_all.png'), sheet.png());
    console.log('깜빡임 모아보기 →', resolve(here, 'out', 'conv', 'blink_all.png'));
  }
}
