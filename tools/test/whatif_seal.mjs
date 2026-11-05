// 만약 실험용 사본만 고침(status.js · catalog.js — 2026-11-06 프로스트벨 정적을 유지하세요.):
//  봉인이 고르는 법을 바꿔 봄 — 기록 docs/superpowers/specs/2026-11-05-weak-skills-review.md 8번
//   best    = 상대 손패에서 가장 센 공격 하나(메아리 봉인은 그다음 센 공격)
//   three   = 무작위 셋(서로 다른 칸)
//   fear    = 공포(사용자 2026-11-06 '도발의 반대인거임? … 공포 라는 상태이상으로') — 다음 1턴 공격 기술 전부(평타 포함)
//   fearnb  = 공포인데 평타는 됨
//   fearimm · fearnbimm = 공포 + 버팀(공포가 풀린 바로 다음 턴엔 다시 안 걸림 — 매 턴 다시 걸어 계속 못 때리게 묶는 것을 막음)
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_seal.mjs <사본> <방식>
//   → <사본> 에서 node tools/test/weaklab.mjs --key frost_bell --id u_frost_2b --stage 1
import { readFileSync, writeFileSync } from 'node:fs';
const [root, MODE = 'best'] = process.argv.slice(2);
const sp = root + '/v2/src/battle/status.js';
let s = readFileSync(sp, 'utf8');
const helper = [
  "const strong = (kit, skip) => kit.filter(k => k.act === 'attack' && k.power && !skip(k)).sort((a, b) => b.power - a.power)[0];",
  "const sealPick = (kit, o, rng) => {",
  "  if (o.mode === 'three') { const L = kit.slice(), out = []; while (L.length && out.length < 3) out.push(L.splice(Math.floor(rng() * L.length), 1)[0]); return out; }",
  "  if (/^fear/.test(o.mode || '')) return kit.filter(k => k.act === 'attack' && (!/nb/.test(o.mode) || k.id !== 'basic'));",
  "  return null;",
  "};",
].join('\n');
const a1 = 'const left = (tgt.kit || []).filter(k => !sealed(e, k.id)), pick = left[Math.floor((ctx.rng ? ctx.rng() : 0) * left.length)];';
const b1 = 'const left = (tgt.kit || []).filter(k => !sealed(e, k.id)), pick = (o.mode === \'best\' && strong(tgt.kit || [], k => sealed(e, k.id))) || left[Math.floor((ctx.rng ? ctx.rng() : 0) * left.length)];';
const a2 = 'const kit = tgt.kit || [], pick = kit[Math.floor((ctx.rng ? ctx.rng() : 0) * kit.length)];';
const b2 = [
  'const kit = tgt.kit || [], many = sealPick(kit, o, () => (ctx.rng ? ctx.rng() : 0));',
  '      if (many) {',
  '        if (/imm$/.test(o.mode) && e.fearImm != null && e.fearImm >= at.from) { ev.push({ t: \'resist\', ...base, why: \'once\', list: listOf(tgt) }); return; }',
  '        if (/imm$/.test(o.mode)) e.fearImm = at.from + 1;',
  '        if (!many.length) return;',
  '        e.seal = { ...at, skill: many[0].id, skillName: many[0].name, more: many.slice(1).map(k => k.id) };',
  '        ev.push({ t: \'fx\', ...base, skill: many.map(k => k.name).join(\' · \'), list: listOf(tgt) });',
  '        return;',
  '      }',
  '      const pick = (o.mode === \'best\' && strong(kit, () => false)) || kit[Math.floor((ctx.rng ? ctx.rng() : 0) * kit.length)];',
].join('\n');
if (!s.includes(a1) || !s.includes(a2)) throw new Error('못 찾음: 봉인 고르는 줄');
s = s.replace(a1, b1).replace(a2, b2).replace('function sealed(e, id) {', helper + '\nfunction sealed(e, id) {');
writeFileSync(sp, s);
const cp = root + '/v2/src/game/catalog.js';
let c = readFileSync(cp, 'utf8');
const a3 = "S('u_frost_2b', '정적을 유지하세요.', 'wind', 'u', 60, 2, { inflict: { id: 'seal' } })";
if (!c.includes(a3)) throw new Error('못 찾음: 정적을 유지하세요. 줄');
c = c.replace(a3, a3.replace("{ id: 'seal' }", `{ id: 'seal', mode: '${MODE}' }`));
writeFileSync(cp, c);
console.log('사본 고침 끝 — ' + MODE);
