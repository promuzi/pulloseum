// 줄기 시작점 검수판(2026-10-15 사용자 "식물의 줄기 시작점이 화분의 중앙에 오게 해줘. 애매한 것은 임시로 중앙에 선을 그어서 중앙에 배치하고"):
//   게임 묶음(assets/v2/plants/<키>[_young|_teen])의 대기 첫 장을 화분에 심어(뒤 → under → 앞 → over) 밑동 둘레를 크게 키우고,
//   화분 가운데 세로선(자홍, 47|48 칸 사이 = 화분 좌우 가운데)·흙 가운데 가로선(하늘)·잰 줄기 가운데(노랑 눈금)를 긋는다.
//   줄기 재기 = 흙 가운데 줄 바로 위에서 위로 끊김 없이 6칸 넘게 이어진 열들의 덩어리 중 몸 무게중심에 가장 가까운 것(굵은 줄기·덩굴 몸통).
//   node tools/pixel/big/stemcheck.mjs [키…] [--plain] → out/stem/stemcheck.png (--plain = 선 없이 같은 판, 전후 비교용)
//   검사 결과 줄(키 · 줄기 가운데 · 화분 가운데와 차이)은 convert.mjs STEM 표를 정할 때 쓴다 — 차이 ±1칸 안이면 그대로.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, decodePNG } from './engine.mjs';

const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..'), args = process.argv.slice(2);
const ROSTER = ['flower_grass', 'thorn', 'aqua', 'flower_wind', 'spark', 'vine_water', 'cactus_fire', 'gaia', 'flower_fire', 'cactus_wind', 'vine_wind', 'spore_cap'];
const keys = args.filter(a => !a.startsWith('--')), plain = args.includes('--plain');
const list = (keys.length ? keys : ROSTER).flatMap(k => (/_young$|_teen$/.test(k) ? [k] : [k + '_young', k + '_teen', k])).filter(k => existsSync(resolve(repo, 'assets', 'v2', 'plants', k + '.json')));
const potOf = n => decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'pots', n + '.png')));
const potB = potOf('pot_terra_back'), potF = potOf('pot_terra_front');
const crop = (im, sx, sy, w, h) => { const o = new Img(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = ((sy + y) * im.w + sx + x) * 4; o.data.set(im.data.subarray(k, k + 4), (y * w + x) * 4); } return o; };

// 줄기 가운데(연속 x): under 층에서 흙 가운데 줄(sy) 바로 위부터 위로 끊김 없이 이어진 칸 수가 6 이상인 열들의 덩어리 → 몸 무게중심에 가장 가까운 덩어리
export function stemOf(under, m) {
  const W = m.w, sy = Math.floor(m.soil[1]) - 1, op = (x, y) => under.data[(y * W + x) * 4 + 3] >= 128;
  const run = x => { let n = 0; for (let y = sy; y >= 0 && op(x, y); y--) n++; return n; };
  let gx = 0, gn = 0;
  for (let y = 0; y < sy; y++) for (let x = 0; x < W; x++) if (op(x, y)) { gx += x + 0.5; gn++; }
  const cg = gn ? gx / gn : W / 2, cols = [];
  for (let x = 0; x < W; x++) cols.push(run(x));
  const segs = [];
  for (let x = 0; x < W; x++) if (cols[x] >= 6) { const l = segs[segs.length - 1]; if (l && x - l[1] <= 1) l[1] = x; else segs.push([x, x]); }
  if (!segs.length) return { x: null, cg, segs };
  const best = segs.reduce((b, s) => (Math.abs((s[0] + s[1] + 1) / 2 - cg) < Math.abs((b[0] + b[1] + 1) / 2 - cg) ? s : b));
  return { x: (best[0] + best[1] + 1) / 2, w: best[1] - best[0] + 1, cg, segs };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('stemcheck.mjs')) {
  const Z = 6, X0 = 14, Y0 = 34, CW = 68, CH = 52, COLS = 3, PAD = 8, LAB = 0;
  const rowsN = Math.ceil(list.length / COLS), sheet = new Img(PAD + COLS * (CW * Z + PAD), PAD + rowsN * (CH * Z + PAD + LAB), '#2e222f');
  const lines = [];
  list.forEach((k, i) => {
    const m = JSON.parse(readFileSync(resolve(repo, 'assets', 'v2', 'plants', k + '.json'), 'utf8')), sh = decodePNG(readFileSync(resolve(repo, 'assets', 'v2', 'plants', k + '.png')));
    const under = crop(sh, 0, 0, m.w, m.h), over = crop(sh, 0, m.rows * m.h, m.w, m.h);
    const comp = new Img(m.w, m.h, '#323353');
    comp.blit(potB, 0, 0); comp.blit(under, 0, 0); comp.blit(potF, 0, 0); comp.blit(over, 0, 0);
    const st = stemOf(under, m), off = st.x == null ? null : st.x - m.soil[0];
    lines.push(`${k.padEnd(18)} 줄기 ${st.x == null ? '못 찾음' : st.x.toFixed(1) + ` (폭 ${st.w})`} · 화분 가운데와 ${off == null ? '-' : (off > 0 ? '+' : '') + off.toFixed(1)}칸 · 무게중심 ${st.cg.toFixed(1)} · 덩어리 ${st.segs.map(s => s[0] + '-' + s[1]).join(',')}`);
    const g = crop(comp, X0, Y0, CW, CH), big = new Img(CW * Z, CH * Z);
    big.blit(g, 0, 0, Z);
    if (!plain) {
      const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < big.w && y < big.h) big.data.set(c, (y * big.w + x) * 4); };
      for (let y = 0; y < big.h; y++) { put((m.soil[0] - X0) * Z - 1, y, [255, 40, 200, 255]); put((m.soil[0] - X0) * Z, y, [255, 40, 200, 255]); }   // 화분 가운데
      const sy = Math.round((m.soil[1] - Y0) * Z);
      for (let x = 0; x < big.w; x += 3) put(x, sy, [120, 220, 255, 255]);   // 흙 가운데 줄
      if (st.x != null) for (let d = -Z * 3; d <= 0; d++) for (const ox of [-1, 0]) put(Math.round((st.x - X0) * Z) + ox, sy + d, [255, 230, 60, 255]);   // 잰 줄기 가운데
    }
    sheet.blit(big, PAD + (i % COLS) * (CW * Z + PAD), PAD + Math.floor(i / COLS) * (CH * Z + PAD + LAB));
  });
  mkdirSync(resolve(here, 'out', 'stem'), { recursive: true });
  const out = resolve(here, 'out', 'stem', plain ? 'stemcheck_plain.png' : 'stemcheck.png');
  writeFileSync(out, sheet.png());
  console.log(lines.join('\n'));
  console.log('검수판(3열: 어린 · 자람 · 성체) →', out);
}
