// 만약 실험용 사본만 고침(status.js — 2026-11-05 사용자 '버프 디버프는 1겹이 주는 양을 늘릴까? 그러면 1겹으로도 충분한 성능이 주어질 거 같은데 고려해봐'):
//  능력치 겹(활력 · 억셈 · 가속 · 예리 · 집중 / 쇠약 · 시듦 · 둔화 · 무딤 · 교란)의 한 겹 값을 환경 변수 배수로 — STATK(둘 다) · STATK_UP(버프만) · STATK_DOWN(디버프만)
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs · specbalance.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_statk.mjs <사본>
//   → <사본> 에서 STATK=2 node tools/test/weaklab.mjs … · STATK=2 node tools/test/specbalance.mjs --stage 2 --deck --games 24
import { readFileSync, writeFileSync } from 'node:fs';
const root = process.argv[2];
const p = root + '/v2/src/battle/status.js', L = readFileSync(p, 'utf8').split(/\r?\n/);
const i = L.findIndex(l => l.startsWith('const STATS = Object.keys(FX).filter(k => FX[k].stat);'));
if (i < 0) throw new Error('못 찾음: STATS 줄');
L.splice(i + 1, 0,
  "{ const E = typeof process !== 'undefined' ? process.env : {}, all = +(E.STATK || 1); for (const k of STATS) FX[k].v *= all * (FX[k].sign > 0 ? +(E.STATK_UP || 1) : +(E.STATK_DOWN || 1)); }");
writeFileSync(p, L.join('\n'));
console.log('사본 고침 끝');
