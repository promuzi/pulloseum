// 만약 실험용 사본만 고침(rules.js · status.js — 2026-11-05 젤리캡 말랑잉 · 너꺼잉 다시 짜기, 기록 docs/superpowers/specs/2026-11-05-weak-skills-review.md):
//  ① 기술마다 반사 몫(reflectK) · 방어 없이 맞았을 피해로 되돌림(reflectRaw) · 첫 타 피해 0(nullFirst — 그 피해를 되돌림)
//  ② 버섯 포자 면역 뺌(사용자 '종끼리의 그건 없음') · 튕김 판정을 면역 판정 뒤로
//  쓰는 법: git archive HEAD v2 | tar -x -C <사본> → tools/test/weaklab.mjs 를 <사본>/tools/test/ 에 복사 → node tools/test/whatif_reflect.mjs <사본>
//   → <사본> 에서 weaklab --set guardWith=1,reflectK=1(말랑잉 방어 + 반사) · --set reflect=1,nullFirst=1,reflectK=1,bounceNow=1,bounce=0(너꺼잉 무적 + 완전 반사)
import { readFileSync, writeFileSync } from 'node:fs';
const root = process.argv[2];
const edit = (f, fn) => { const p = root + f, s = readFileSync(p, 'utf8'), L = s.split(/\r?\n/); fn(L); writeFileSync(p, L.join('\n')); };
const at = (L, frag) => { const i = L.findIndex(l => l.includes(frag)); if (i < 0) throw new Error('못 찾음: ' + frag); return i; };

edit('/v2/src/battle/rules.js', L => {
  const i = at(L, 'dmg = Math.round(dmg * takenK(foe) * (bare || 1));');
  L.splice(i + 1, 0,
    '      const dmgRaw = guardOn ? Math.round(hitDmg(u, foe, ah, em, 1) * RULES.tierMult[tier] * critK * (ambush ? FX.stealth.ambush : 1) * takenK(foe) * (bare || 1)) : dmg;',
    '      let nulled = 0; if (d.nullFirst && still && reflects.has(foe) && tier !== \'miss\' && dmg > 0) { nulled = dmgRaw; dmg = 0; }');
  const j = at(L, "if (tier !== 'miss' && still && reflects.has(foe) && dmg + absorb > 0 && u.hp > 0 && foe.hp > 0) {");
  L[j] = "      const rbase = nulled || (d.reflectRaw ? dmgRaw : dmg + absorb);\n      if (tier !== 'miss' && still && reflects.has(foe) && rbase > 0 && u.hp > 0 && foe.hp > 0) {";
  const k = at(L, 'const rd = Math.max(1, Math.round((dmg + absorb) * FX.reflect.k));');
  L[k] = L[k].replace('const rd = Math.max(1, Math.round((dmg + absorb) * FX.reflect.k));', 'const rd = Math.max(1, Math.round(rbase * (d.reflectK ?? FX.reflect.k)));');
});
edit('/v2/src/battle/status.js', L => {
  const s = at(L, "spore:   { jong: 'mushroom',");
  L[s] = L[s].replace("jong: 'mushroom', ", '');
  const i = at(L, 'if (e.bounce && ctx.by'), j = at(L, "ev.push({ t: 'immune', ...base, card: true }); return; }");
  if (j !== i + 5) throw new Error('튕김 · 면역 줄 자리가 예상과 다름');
  const bounce = L.slice(i, i + 4), imm = L.slice(i + 4, i + 6);
  L.splice(i, 6, ...imm, ...bounce);
});
console.log('사본 고침 끝');
