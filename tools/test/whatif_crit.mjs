// 만약 실험용 사본만 고침(2026-11-06 사용자 '치명은 기본이 2배 데미지인거야'):
//  지금 규칙 = 치명 피해 1.5배(rules.js RULES.tierMult — 2026-10-15 설계 초안의 클로드 값)
//  이 사본 = 치명 피해 M배(모든 종 · 모든 기술) · 봇 계산(model.js 기대 피해 · 예리 · 무딤 값)도 같은 배수로
//  쓰는 법: git archive HEAD v2 tools/test | tar -x -C <사본> → node tools/test/whatif_crit.mjs <사본> <M>
//   지옥의 여왕 만약(whatif_hellbuff.mjs)과 같이 쓰면 이것을 먼저 — hellbuff 의 봇 점수가 사본의 치명 배수를 읽음
import { readFileSync, writeFileSync } from 'node:fs';
const [root, M0 = '2'] = process.argv.slice(2);
const M = +M0;
if (!(M >= 1)) throw new Error('M = 1 이상 숫자');
function patch(rel, pairs) {
  const p = root + '/' + rel;
  let s = readFileSync(p, 'utf8');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${rel}: '${a.slice(0, 40)}…' ${n}곳(1곳이어야 함)`);
    s = s.replace(a, () => b);
  }
  writeFileSync(p, s);
}
patch('v2/src/battle/rules.js', [
  ['tierMult: { miss: 0, graze: 0.5, hit: 1, crit: 1.5 },', `tierMult: { miss: 0, graze: 0.5, hit: 1, crit: ${M} },`],
]);
patch('v2/src/battle/model.js', [
  ['let p = (t.hit + 1.5 * t.crit + 0.5 * t.graze) / 100;', `let p = (t.hit + ${M} * t.crit + 0.5 * t.graze) / 100;`],
  ["case 'critDown': v = 2.5 * thr * D.v / 200", `case 'critDown': v = 2.5 * thr * D.v * ${M - 1} / 100`],
  ["else if (b === 'critUp') v += R * FX.critUp.v / 200", `else if (b === 'critUp') v += R * FX.critUp.v * ${M - 1} / 100`],
]);
console.log(`사본 고침 끝 — 치명 피해 ${M}배(봇 계산 같이)`);
