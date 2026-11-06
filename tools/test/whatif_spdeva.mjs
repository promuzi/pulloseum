// 만약 실험용 사본만 고침(2026-11-06 사용자 '기동성 오르면 회피 안해도 빗나감 확률 증가하는 거 아님?'):
//  지금 규칙 = 기동은 선공 확률과 회피 자세 효과(0.7 ~ 1.3배)에만 들어가고, 회피 자세 없이 맞는 빗나감은 기동과 상관없이 6
//  이 사본 = 맞는 쪽 기동 배율이 오른 만큼 상대 공격 빗나감 +(배율 − 1) × K · 내린 만큼 −(가속 · 둔화 · 젖음 · 빙결 · 동굴 · 지옥의 여왕 같은 기동 변화만 — 종 기본 기동 차이는 그대로 선공에만)
//   예: K 30 = 가속 한 겹(+20%) 빗나감 +6 · 기동 +100% +30 · 젖음(−20%) −6 · 빗나감 0 ~ 70 상한 그대로 · 봇 계산(model.js 결과표)도 같은 표를 읽음
//  쓰는 법: git archive HEAD v2 tools/test | tar -x -C <사본> → node tools/test/whatif_spdeva.mjs <사본> <K>
import { readFileSync, writeFileSync } from 'node:fs';
const [root, K0 = '30'] = process.argv.slice(2);
const K = +K0;
if (!(K >= 0)) throw new Error('K = 0 이상 숫자');
const p = root + '/v2/src/battle/rules.js';
const a = 'let miss = RULES.baseMiss + (def.eva || 0) - (att.acc || 0) + (o.missAdd || 0);';
let s = readFileSync(p, 'utf8');
if (s.split(a).length !== 2) throw new Error('rules.js 빗나감 줄을 한 곳에서 못 찾음');
s = s.replace(a, () => a.slice(0, -1) + ' + __spdEva(def);');
s += `
function __spdEva(u) { const b = Math.max(1, (u && u.spd) || 1); return u ? Math.round(${K} * (effSpd(u) / b - 1)) : 0; }
`;
writeFileSync(p, s);
console.log(`사본 고침 끝 — 기동 배율 오른 만큼 상대 빗나감 +(배율 − 1) × ${K}`);
