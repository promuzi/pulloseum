// 만약 실험용 사본만 고침(devices.js — 2026-11-06 엠버캡 포자수확 · 약한 기술 9번):
//  지금 = 바로 앞 상대의 포자를 전부 거둬(안 핌) 하나당 회복 7% + 화상(포악이면 억셈) — 거둔 포자의 피해(하나당 위력 35)와 타고남 회복이 같이 사라짐
//   pop       = 거둔 포자를 지금 바로 터뜨림(피해 · 내 포자면 타고남 회복도) + 하나당 회복 7% + 화상
//   popnoheal = 바로 터뜨림 + 화상(하나당 회복 7%는 뺌 — 타고남 회복만)
//   keep      = 거두지 않음(포자는 그대로 나중에 핌) + 하나당 회복 7% + 화상
//   heal15    = 지금처럼 거두되 하나당 회복 15%
//   base15    = 지금처럼 거두되 회복 = 기본 15% + 하나당 7%(포자가 없어도 회복)
//   atk55     = 불 공격 위력 55로 바꾸고, 맞히면 지금처럼 거둬 하나당 회복 7% + 화상(포악이면 억셈)
//   atk55pop  = 불 공격 위력 55 + 맞히면 거둔 포자를 바로 터뜨림 + 하나당 회복 7% + 화상
//   pop2x     = 바로 터뜨리되 피해 두 배 + 하나당 회복 7% + 화상
//   pop3x     = 바로 터뜨리되 피해 세 배 + 하나당 회복 7% + 화상
//   pop3x2    = 세 배로 터뜨리되 많아야 둘(남는 포자는 그대로) + 터뜨린 하나당 회복 7% + 화상
//   popsun    = 바로 터뜨림 + 포자 하나당 햇빛 +1 + 하나당 회복 7% + 화상
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_harvest.mjs <사본> <방식>
//   → <사본> 에서 node tools/test/weaklab.mjs --key ember_cap --id u_emcap_2b --stage 1
import { readFileSync, writeFileSync } from 'node:fs';
const [root, MODE = 'pop'] = process.argv.slice(2);
const p = root + '/v2/src/battle/devices.js';
let s = readFileSync(p, 'utf8');
const a = [
  "    const sp = foe.eff && foe.eff.spore, n = sp ? sp.n : 0;",
  "    if (n) { delete foe.eff.spore; ctx.ev.push({ t: 'expire', who: foe.id, ids: ['spore'], list: listOf(foe) }); }",
  "    if (n && u.hp > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * a.harvest.per * n * healK(u))); ctx.ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }",
].join('\n');
const b = [
  "    let sp = foe.eff && foe.eff.spore, n = sp ? sp.n : 0; const MODE = '" + MODE + "';",
  "    if (MODE === 'pop3x2' && n > 2) { const rest = {}; for (const q of ['left', 'who', 'p', 'a', 'el']) if (sp[q]) { rest[q] = sp[q].slice(2); sp = { ...sp, [q]: sp[q].slice(0, 2) }; } foe.eff.spore = { ...foe.eff.spore, ...rest, n: n - 2 }; n = 2; sp = { ...sp, n: 2, _keep: true }; }",
  "    if (n && MODE !== 'keep') {",
  "      if (MODE === 'pop' || MODE === 'popnoheal' || MODE === 'pop2x' || MODE === 'pop3x' || MODE === 'pop3x2' || MODE === 'popsun') {",
  "        let d = 0; for (let i = 0; i < n; i++) d += sporeDmg(foe, (sp.p && sp.p[i]) || FX.spore.power, (sp.a && sp.a[i]) || 50, sp.el ? sp.el[i] : null);",
  "        if (MODE === 'pop2x') d *= 2; if (MODE === 'pop3x' || MODE === 'pop3x2') d *= 3;",
  "        if (MODE === 'popsun') { const e0 = u.energy; u.energy = Math.min(u.energyMax || 8, e0 + n); ctx.ev.push({ t: 'sun', who: u.id, id: a.id, gain: u.energy - e0 }); }",
  "        foe.hp = Math.max(0, foe.hp - d); ctx.ev.push({ t: 'bloom', who: foe.id, name: foe.name, dmg: d, k: n, list: listOf(foe) }); noteFall(foe, ctx.ev);",
  "        const mine = (sp.who || []).filter(w => w === u.id).length; if (mine) sporeBloomed(u, mine, ctx.turn, ctx.ev);",
  "      }",
  "      if (!sp._keep) { delete foe.eff.spore; ctx.ev.push({ t: 'expire', who: foe.id, ids: ['spore'], list: listOf(foe) }); }",
  "    }",
  "    const per = MODE === 'heal15' ? 0.15 : a.harvest.per, base = MODE === 'base15' ? 0.15 : 0;",
  "    if ((n || base) && u.hp > 0 && MODE !== 'popnoheal') { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * (base + per * n) * healK(u))); ctx.ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }",
].join('\n');
// 공격판(atk55 · atk55pop): 기술 칸을 공격으로 · 맞힌 뒤(afterAct) 거두기
if (/^atk55/.test(MODE)) {
  const pop = MODE === 'atk55pop';
  const hook = [
    "  if (!a) return;",
    "  if (a.harvest && a.act !== 'hex' && x.landed && foe && foe.hp > 0) {",
    "    const sp = foe.eff && foe.eff.spore, n = sp ? sp.n : 0;",
    pop ? "    if (n) { let d = 0; for (let i = 0; i < n; i++) d += sporeDmg(foe, (sp.p && sp.p[i]) || FX.spore.power, (sp.a && sp.a[i]) || 50, sp.el ? sp.el[i] : null); foe.hp = Math.max(0, foe.hp - d); ev.push({ t: 'bloom', who: foe.id, name: foe.name, dmg: d, k: n, list: listOf(foe) }); noteFall(foe, ev); const mine = (sp.who || []).filter(w => w === u.id).length; if (mine) sporeBloomed(u, mine, T, ev); }" : "",
    "    if (n) { delete foe.eff.spore; ev.push({ t: 'expire', who: foe.id, ids: ['spore'], list: listOf(foe) }); }",
    "    if (n && u.hp > 0) { const b0 = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * a.harvest.per * n * healK(u))); ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - b0, list: listOf(u) }); }",
    "    if (u.mode === 'rage') selfBuff(u, 'defUp', { turn: T, ev }); else if (foe.hp > 0) apply(foe, 'burn', 1, { turn: T, rng: x.rng, ev, by: u });",
    "  }",
  ].filter(Boolean).join('\n');
  const head = 'export function afterAct(u, a, foe, T, ev, x = {}) {\n  if (!a) return;', head2 = head.replace(/\n/g, '\r\n');
  if (s.includes(head)) s = s.replace(head, 'export function afterAct(u, a, foe, T, ev, x = {}) {\n' + hook);
  else if (s.includes(head2)) s = s.replace(head2, ('export function afterAct(u, a, foe, T, ev, x = {}) {\n' + hook).replace(/\n/g, '\r\n'));
  else throw new Error('못 찾음: afterAct 머리');
  const cp = root + '/v2/src/game/catalog.js';
  let c = readFileSync(cp, 'utf8');
  const a3 = "S('u_emcap_2b', '포자수확', 'fire', 'u', 0, 2, { act: 'hex', cats: ['heal_hp'], harvest: { per: 0.07 } })";
  if (!c.includes(a3)) throw new Error('못 찾음: 포자수확 칸');
  c = c.replace(a3, "S('u_emcap_2b', '포자수확', 'fire', 'u', 55, 2, { harvest: { per: 0.07 } })");
  writeFileSync(cp, c);
}
const a2 = a.replace(/\n/g, '\r\n');
if (s.includes(a)) s = s.replace(a, b);
else if (s.includes(a2)) s = s.replace(a2, b.replace(/\n/g, '\r\n'));
else throw new Error('못 찾음: 포자수확 줄');
writeFileSync(p, s);
console.log('사본 고침 끝 — ' + MODE);
