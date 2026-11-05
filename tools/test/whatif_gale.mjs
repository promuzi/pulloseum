// 만약 실험용 사본만 고침(devices.js — 2026-11-05 치유 공명, 사용자 '강풍 턴 수가 좀 늘어나는거 어때? 이 스킬 쓰면 턴이 초기화 되거나 등'):
//  공명을 붙일 때 강풍 기간을 초기화(galeRenew = 이번 턴 포함 N턴) · 늘림(galeExt = +N턴) — 기록 docs/superpowers/specs/2026-11-05-weak-skills-review.md 4번
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_gale.mjs <사본>
//   → <사본> 에서 weaklab --key cactus_wind --id u_gale_3b --set galeRenew=3(초기화 3턴) · --set galeExt=2(+2턴)
import { readFileSync, writeFileSync } from 'node:fs';
const root = process.argv[2];
const p = root + '/v2/src/battle/devices.js', L = readFileSync(p, 'utf8').split(/\r?\n/);
const i = L.findIndex(l => l.includes("const g = foe.eff.gale; g.add = [...(g.add || []), a.galeAdd];"));
if (i < 0) throw new Error('못 찾음: 공명 붙이는 줄');
L.splice(i + 1, 0,
  '    if (a.galeRenew) g.exp = Math.max(g.exp, ctx.turn + a.galeRenew - 1);',
  '    if (a.galeExt) g.exp += a.galeExt;');
writeFileSync(p, L.join('\n'));
console.log('사본 고침 끝');
