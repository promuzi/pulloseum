// 만약 실험용 사본만 고침(catalog.js · devices.js — 2026-11-06 싹둑마마 지옥전개 · 약한 기술 10번):
//  지금 = 피해 없이(햇빛 2) 상대 쪽 지옥 3턴(화상 없어도 턴 끝 화상 피해 4% · 정화 못 함) · 지옥 동안 지옥의 여왕(기동 +15% · 치명 +15) · 꺼진 뒤 2턴 재사용 대기
//   atk<N>  = 불 공격 위력 N(햇빛 그대로) + 맞히면 지옥을 엶(이미 지옥이면 그냥 공격) — 예: atk40 · atk55
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_inferno.mjs <사본> <방식>
//   → <사본> 에서 node tools/test/weaklab.mjs --key blade_vine --id u_blade_1 --stage 0 (햇빛을 바꾸려면 --cost N)
import { readFileSync, writeFileSync } from 'node:fs';
const [root, MODE = 'atk40'] = process.argv.slice(2);
//   queen<k> = 공격으로 바꾸지 않고 지옥의 여왕(기동 +15% · 치명 +15)만 k배 — 예: queen2 = 기동 +30% · 치명 +30
const q = /^queen(\d+(?:\.\d+)?)$/.exec(MODE);
if (q) {
  const k = +q[1], cp0 = root + '/v2/src/game/catalog.js';
  let c0 = readFileSync(cp0, 'utf8');
  const a0 = "sp: { queen: { spd: 0.15, crit: 15 } }";
  if (!c0.includes(a0)) throw new Error('못 찾음: 지옥의 여왕 값');
  c0 = c0.replace(a0, `sp: { queen: { spd: ${+(0.15 * k).toFixed(3)}, crit: ${Math.round(15 * k)} } }`);
  writeFileSync(cp0, c0);
  console.log('사본 고침 끝 — 지옥의 여왕 ×' + k);
  process.exit(0);
}
const m = /^atk(\d+)(?:c(\d+))?$/.exec(MODE);   // atk55c1 = 위력 55 · 햇빛 1
if (!m) throw new Error('방식 = atk<위력>[c<햇빛>] · queen<배수>');
const P = +m[1], CST = m[2] != null ? +m[2] : 2;
const cp = root + '/v2/src/game/catalog.js';
let c = readFileSync(cp, 'utf8');
const a = "S('u_blade_1', '지옥전개', 'fire', 'u', 0, 2, { act: 'hex', cats: ['debuff'], inferno: { turns: 3, cd: 2 } })";
if (!c.includes(a)) throw new Error('못 찾음: 지옥전개 칸');
c = c.replace(a, `S('u_blade_1', '지옥전개', 'fire', 'u', ${P}, ${CST}, { inferno: { turns: 3, cd: 2 } })`);
writeFileSync(cp, c);
const dp = root + '/v2/src/battle/devices.js';
let s = readFileSync(dp, 'utf8');
const hook = [
  "  if (!a) return;",
  "  if (a.inferno && a.act !== 'hex' && x.landed && foe && foe.hp > 0 && !(foe.eff && foe.eff.inferno)) {   // 만약 실험: 공격판 지옥전개 = 맞히면 지옥",
  "    const exp = T + a.inferno.turns - 1;",
  "    (foe.eff ||= {}).inferno = { env: true, exp, by: u.id, T0: T };",
  "    if (a.inferno.cd) (u.st ||= {}).infernoLock = { until: exp + a.inferno.cd };",
  "    ev.push({ t: 'fx', who: u.id, to: foe.id, name: foe.name, id: 'inferno', list: listOf(foe) });",
  "  }",
].join('\n');
const head = 'export function afterAct(u, a, foe, T, ev, x = {}) {\n  if (!a) return;', head2 = head.replace(/\n/g, '\r\n');
if (s.includes(head)) s = s.replace(head, 'export function afterAct(u, a, foe, T, ev, x = {}) {\n' + hook);
else if (s.includes(head2)) s = s.replace(head2, ('export function afterAct(u, a, foe, T, ev, x = {}) {\n' + hook).replace(/\n/g, '\r\n'));
else throw new Error('못 찾음: afterAct 머리');
writeFileSync(dp, s);
console.log('사본 고침 끝 — 지옥전개 = 불 공격 위력', P, '+ 지옥');
