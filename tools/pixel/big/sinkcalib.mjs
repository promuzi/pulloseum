// 흙에 앉히기 표 재기(2026-10-17 사용자 "화단에 박힌 불꽃 선인장이 중앙이 아닌 좀 뒤쪽" · "식물과 흙의 경계가 너무 일자가 되지 않게"):
//   게임 묶음 대기 첫 장(under 층)에서 줄기(밑동) 덩어리 폭을 재(stemcheck.mjs stemOf — 흙 가운데 줄 위로 6칸 넘게 이어진 열들 중 몸 무게중심에 가장 가까운 덩어리)
//   25° 내려다보기에서 굵은 밑동이 흙에 닿는 둘레의 앞쪽 = 흙 가운데 + 반폭 × 흙 타원 납작함(P.b / P.a) → 그만큼(× 0.75, 최대 5칸) 아래로 앉힘
//   node tools/pixel/big/sinkcalib.mjs [키…] → 'SINK = {…}' 한 줄(convert.mjs SINK에 옮김 — 0칸은 뺌)
//   ⚠ SINK를 넣고 다시 묶은 뒤에 재면 이미 앉힌 몸 폭을 재니, 잴 때는 SINK_TEST='{}'가 아니라 SINK를 비운 상태의 묶음으로
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, decodePNG } from './engine.mjs';
import { POT_GEO as P } from './pot3d.mjs';
import { stemOf } from './stemcheck.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..', '..');
const { ROSTER } = await import('file:///' + resolve(repo, 'v2/src/art/sprites.js').replace(/\\/g, '/'));
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const keys = (args.length ? args : ROSTER).flatMap(k => (/_young$|_teen$/.test(k) ? [k] : [k + '_young', k + '_teen', k])).filter(k => existsSync(resolve(repo, 'assets/v2/plants', k + '.json')));
const kk = P.b / P.a, out = {};
for (const k of keys) {
  const m = JSON.parse(readFileSync(resolve(repo, 'assets/v2/plants', k + '.json'), 'utf8')), sh = decodePNG(readFileSync(resolve(repo, 'assets/v2/plants', k + '.png')));
  const under = new Img(m.w, m.h);
  for (let y = 0; y < m.h; y++) under.data.set(sh.data.subarray((y * sh.w) * 4, (y * sh.w + m.w) * 4), y * m.w * 4);
  const st = stemOf(under, m);
  if (st.x == null) { console.log(`${k.padEnd(20)} 줄기 못 잼`); continue; }
  const w = st.w, sink = Math.max(0, Math.min(5, Math.round(0.75 * kk * w / 2)));
  console.log(`${k.padEnd(20)} 밑동 폭 ${String(w).padStart(2)} → 앉히기 ${sink}칸`);
  if (sink) out[k] = sink;
}
console.log('SINK = ' + JSON.stringify(out).replace(/"/g, '').replace(/,/g, ', ').replace(/:/g, ': '));
