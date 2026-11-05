// 만약 실험용 사본만 고침(rules.js — 2026-11-05 냉기 응축, 사용자 '아니면 상대가 공격시 상대 빙결 스택은?'):
//  내 몸에 냉기(eff.frostAura = { exp, n })가 있는 동안 나를 때린 공격(한 타라도 맞음)마다 때린 쪽에 빙결 n겹 — 기록 docs/superpowers/specs/2026-11-05-weak-skills-review.md 7번
//  냉기를 거는 쪽 = weaklab --aura 턴,겹(그 기술을 쓰는 턴 시작에 걸어 선후공과 상관없이 그 턴부터)
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_frost.mjs <사본>
//   → <사본> 에서 weaklab --key frost_drake --id u_fdrake_1 --aura 3,1
import { readFileSync, writeFileSync } from 'node:fs';
const root = process.argv[2];
const p = root + '/v2/src/battle/rules.js', L = readFileSync(p, 'utf8').split(/\r?\n/);
const i = L.findIndex(l => l.includes('if (warmBroke && u.hp > 0)'));
if (i < 0) throw new Error('못 찾음: 따끈 이불 줄');
L.splice(i + 1, 0,
  '    const fa = foe.eff && foe.eff.frostAura;',
  '    if (fa && fa.exp >= T && hitSet.has(foe) && u.hp > 0 && foe.hp > 0) apply(u, \'chill\', fa.n, { turn: T, rng, ev, by: foe });');
writeFileSync(p, L.join('\n'));
console.log('사본 고침 끝');
