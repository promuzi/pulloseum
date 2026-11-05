// 만약 실험용 사본만 고침(status.js — 2026-11-06 사용자 '도발도 그렇게 하는게 좋을까?'):
//  도발에 면역 — 도발이 풀린 바로 다음 턴엔 도발이 다시 안 걸림(공포 · 기절의 '다음 턴 면역'과 같은 결) · 기록 docs/superpowers/specs/2026-11-05-weak-skills-review.md 8번
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_taunt.mjs <사본>
//   → <사본> 에서 node tools/test/weaklab.mjs --key draco_fruit --id u_draco_2b --stage 1 --conds now,never,always
import { readFileSync, writeFileSync } from 'node:fs';
const root = process.argv[2];
const sp = root + '/v2/src/battle/status.js';
let s = readFileSync(sp, 'utf8');
const a = "    e[id] = at;\n    if (id === 'root') e.rooted = true;";
const a2 = a.replace(/\n/g, '\r\n');
const b = [
  "    if (id === 'taunt' && e.tauntImm != null && e.tauntImm >= at.from) { ev.push({ t: 'resist', ...base, why: 'once', list: listOf(tgt) }); return; }",
  "    if (id === 'taunt') e.tauntImm = at.from + 1;",
  a,
].join('\n');
if (s.includes(a)) s = s.replace(a, b);
else if (s.includes(a2)) s = s.replace(a2, b.replace(/\n/g, '\r\n'));
else throw new Error('못 찾음: 제한 셋 걸기 줄');
writeFileSync(sp, s);
console.log('사본 고침 끝 — 도발 면역');
