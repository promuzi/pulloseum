// 만약 실험용 사본만 고침(status.js · catalog.js — 2026-11-06 프로스트벨 정적을 유지하세요.):
//  봉인이 상대 손패에서 무작위 하나 대신 '가장 센 공격'(위력 순)을 막음 · 메아리 봉인(아침 · 밤)은 그다음 센 공격 — 기록 docs/superpowers/specs/2026-11-05-weak-skills-review.md 8번
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_seal.mjs <사본>
//   → <사본> 에서 node tools/test/weaklab.mjs --key frost_bell --id u_frost_2b --stage 1
import { readFileSync, writeFileSync } from 'node:fs';
const root = process.argv[2];
const sp = root + '/v2/src/battle/status.js';
let s = readFileSync(sp, 'utf8');
const strong = 'const strong = (kit, skip) => kit.filter(k => k.act === \'attack\' && k.power && !skip(k)).sort((a, b) => b.power - a.power)[0];';
const a1 = 'const left = (tgt.kit || []).filter(k => !sealed(e, k.id)), pick = left[Math.floor((ctx.rng ? ctx.rng() : 0) * left.length)];';
const b1 = 'const left = (tgt.kit || []).filter(k => !sealed(e, k.id)), pick = (o.best && strong(tgt.kit || [], k => sealed(e, k.id))) || left[Math.floor((ctx.rng ? ctx.rng() : 0) * left.length)];';
const a2 = 'const kit = tgt.kit || [], pick = kit[Math.floor((ctx.rng ? ctx.rng() : 0) * kit.length)];';
const b2 = 'const kit = tgt.kit || [], pick = (o.best && strong(kit, () => false)) || kit[Math.floor((ctx.rng ? ctx.rng() : 0) * kit.length)];';
if (!s.includes(a1) || !s.includes(a2)) throw new Error('못 찾음: 봉인 고르는 줄');
s = s.replace(a1, b1).replace(a2, b2).replace('function sealed(e, id) {', strong + '\nfunction sealed(e, id) {');
writeFileSync(sp, s);
const cp = root + '/v2/src/game/catalog.js';
let c = readFileSync(cp, 'utf8');
const a3 = "S('u_frost_2b', '정적을 유지하세요.', 'wind', 'u', 60, 2, { inflict: { id: 'seal' } })";
if (!c.includes(a3)) throw new Error('못 찾음: 정적을 유지하세요. 줄');
c = c.replace(a3, a3.replace("{ id: 'seal' }", "{ id: 'seal', best: true }"));
writeFileSync(cp, c);
console.log('사본 고침 끝');
