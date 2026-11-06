// 만약 실험용 사본만 고침(model.js — 2026-11-06 포자수확 리그전): 봇이 포자수확을 고를 때 '지금 터뜨릴 피해'도 값에 넣음
//  값 = 공격 점수와 같은 몫(hpPart) × (배수 − 0.5)배 피해(어차피 필 포자의 몫 절반은 빼고 — 앞당긴 몫만) + 지금 회복 값
//  쓰는 법: (whatif_harvest.mjs <사본> <pop 방식> 다음) node tools/test/whatif_harvest_ai.mjs <사본> <배수>
import { readFileSync, writeFileSync } from 'node:fs';
const [root, multS] = process.argv.slice(2), MULT = +multS;
const p = root + '/v2/src/battle/model.js';
let s = readFileSync(p, 'utf8');
const a = "    if (s.harvest) { const n = (foe.eff && foe.eff.spore && foe.eff.spore.n) || 0; return n ? healScore(u, s.harvest.per * n) + 0.15 * n + (u.mode === 'rage' ? 0.2 * R : 0.25) : 0.1; }";
const b = "    if (s.harvest) { const sp = foe.eff && foe.eff.spore, n = sp ? sp.n : 0; let D = 0; for (let i = 0; i < n; i++) D += sporeDmg(foe, (sp.p && sp.p[i]) || 35, (sp.a && sp.a[i]) || 50, sp.el ? sp.el[i] : null); return n ? hpPart(D * " + (MULT - 0.5) + ", foe.hp) + healScore(u, s.harvest.per * n) + (u.mode === 'rage' ? 0.2 * R : 0.25) : 0.1; }";
if (!s.includes(a)) throw new Error('못 찾음: 포자수확 봇 값');
s = s.replace(a, b);
// sporeDmg 가져오기(devices.js)
const imp = s.match(/import \{([^}]*)\} from '\.\/devices\.js';/);
if (!imp) throw new Error('못 찾음: devices 가져오기');
if (!/\bsporeDmg\b/.test(imp[1])) s = s.replace(imp[0], imp[0].replace('{', '{ sporeDmg,'));
writeFileSync(p, s);
console.log('사본 봇 값 고침 — 배수', MULT);
