// 만약 실험용 사본만 고침(2026-11-07 — 434 공명 공격 위력 70 · 정타 뒤 게일캑터 성장기 · 성체 78 · 74%, 사용자 'ㄱㄱ'):
//  방식 = a<새싹>-<성장기>-<성체>(공명이 터지는 수를 단계마다 — 볼트바인 구슬 칸 1 · 3 · 5처럼) ·
//         e<새싹>-<성장기>-<성체>(강풍 · 폭풍이 부는 턴 끝 +1 주기: 1 = 매 턴 · 2 = 2턴마다 · 0 = 없음) ·
//         p<위력>(공명 공격 위력) · n<수>(모든 단계 같은 터지는 수 — 같은 날 사용자 '이상한거 하지말고 수치만 바꿔 / 새싹이든 뭐든 다 똑같이 해')
//         — 여럿은 _ 로 이음(예: a3-5-5 · e1-0-0 · p90_n5)
//  쓰는 법: git archive HEAD v2 tools/test | tar -x -C <사본> → node tools/test/whatif_reso2.mjs <사본> <방식>
//   (434 뒤 HEAD 용 — 그 전 사본은 whatif_reso.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
const [root, MODE = 'a3-5-5'] = process.argv.slice(2);
let A = null, E = null, P = null, N = null;
for (const part of MODE.split('_')) {
  let m;
  if ((m = /^a(\d+)-(\d+)-(\d+)$/.exec(part))) A = [+m[1], +m[2], +m[3]];
  else if ((m = /^e(\d+)-(\d+)-(\d+)$/.exec(part))) E = [+m[1], +m[2], +m[3]];
  else if ((m = /^p(\d+)$/.exec(part))) P = +m[1];
  else if ((m = /^n(\d+)$/.exec(part))) N = +m[1];
  else throw new Error('방식 = a<새싹>-<성장기>-<성체> · e<새싹>-<성장기>-<성체> · p<위력> · n<수>(_ 로 이음)');
}
function patch(rel, a, b) {
  const p = root + '/' + rel;
  const s = readFileSync(p, 'utf8');
  if (s.split(a).length !== 2) throw new Error(`${rel}: '${a.slice(0, 40)}…'를 한 곳에서 못 찾음`);
  writeFileSync(p, s.replace(a, () => b));
}
const DV = 'v2/src/battle/devices.js', CT = 'v2/src/game/catalog.js';
if (A || E) {
  // 단계 번호(전투 유닛 stage = 'sprout' · 'growing' · 'mature' 글자 — resOf 의 배열 최대치가 글자를 못 읽던 것도 같이 고침)
  patch(DV, 'u.resMax[k] = Array.isArray(m) ? m[Math.min(m.length - 1, u.stage || 0)] : m;', 'u.resMax[k] = Array.isArray(m) ? m[Math.min(m.length - 1, __si(u))] : m;');
  writeFileSync(root + '/' + DV, readFileSync(root + '/' + DV, 'utf8') + "\nfunction __si(u) { return typeof u.stage === 'number' ? u.stage : Math.max(0, STAGE_KEY.indexOf(u.stage)); }\n");
}
if (A) {
  patch(CT, "res: { reso: [0, 3, '공명'] }", `res: { reso: [0, [${A}], '공명'] }`);
  patch(DV, 'if (r[R.k] < R.at) {', 'if (r[R.k] < ((u.resMax && u.resMax[R.k]) || R.at)) {');
}
if (E) patch(DV, '  if (SP(u).reso) resoAdd(u, opp, turn, ev);', `  if (SP(u).reso) { const k = [${E}][__si(u)]; if (k && turn % k === 0) resoAdd(u, opp, turn, ev); }`);
if (N && !A) { patch(CT, "res: { reso: [0, 3, '공명'] }", `res: { reso: [0, ${N}, '공명'] }`); patch(CT, "reso: { k: 'reso', at: 3,", `reso: { k: 'reso', at: ${N},`); }
if (P) patch(CT, "power: 70, count: ['gale'", `power: ${P}, count: ['gale'`);
console.log(`사본 고침 끝 — 게일캑터 공명${P ? ` 위력 ${P}` : ''}${N ? ` · 모든 단계 ${N}이면 터짐` : ''}${A ? ` · 터지는 수 ${A.join(' · ')}` : ''}${E ? ` · 강풍 턴 끝 +1 주기 ${E.join(' · ')}(0 = 없음)` : ''}`);
