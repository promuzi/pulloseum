// 만약 실험용 사본만 고침(2026-11-06 사용자 '지옥전개가 3턴간 유지되는 강력한 버프로 작용했음 좋겠어' — 약한 기술 10번):
//  지옥전개는 그대로(피해 없이 상대 쪽 지옥 3턴 · 꺼진 뒤 2턴 재사용 대기) · 지옥의 여왕(지옥 동안 버프)만 세게
//  방식 = s<기동 %>c<치명 칸>a<공격 %>d<치명 피해 %>[e<햇빛>] — 예: s15c15a40d0 = 기동 +15% · 치명 +15 · 공격 +40% (지금 = s15c15a0d0)
//   공격 = 피해 배율에 곱함(활력 한 겹 = +20%) · 치명 피해 = 치명 1.5배에 곱함(d50 = 1.5 × 1.5 = 2.25배) · 봇 점수(model.js 지옥전개 값)도 공격 · 치명 피해만큼 키움
//  쓰는 법: git archive HEAD v2 tools/test | tar -x -C <사본> → node tools/test/whatif_hellbuff.mjs <사본> <방식>
//   → <사본> 에서 node tools/test/weaklab.mjs --key blade_vine --id u_blade_1 --stage 0
import { readFileSync, writeFileSync } from 'node:fs';
const [root, MODE = 's15c15a40d0'] = process.argv.slice(2);
//   끝에 f = 봇 광합성 값 고침(모자란 햇빛을 셀 때 지금 못 쓰는 기술 — 지옥이 켜졌거나 재사용 대기인 지옥전개 등 — 은 빼고 셈 · 안 고치면 지옥전개 비용 2 때문에 지옥 동안 광합성을 고름)
const m = /^s(\d+)c(\d+)a(\d+)d(\d+)(?:e(\d+))?(f)?$/.exec(MODE);
if (!m) throw new Error('방식 = s<기동 %>c<치명>a<공격 %>d<치명 피해 %>[e<햇빛>][f]');
const [S, C, A, D] = [+m[1], +m[2], +m[3], +m[4]], E = m[5] != null ? +m[5] : 2;
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
patch('v2/src/game/catalog.js', [
  ["sp: { queen: { spd: 0.15, crit: 15 } }", `sp: { queen: { spd: ${S / 100}, crit: ${C}, atk: ${A / 100}, critDmg: ${D / 100} } }`],
  ["S('u_blade_1', '지옥전개', 'fire', 'u', 0, 2,", `S('u_blade_1', '지옥전개', 'fire', 'u', 0, ${E},`],
]);
patch('v2/src/battle/status.js', [
  ["(u && u.res && u.res.heart ? 1 + HEART.atk * u.res.heart : 1);", "(u && u.res && u.res.heart ? 1 + HEART.atk * u.res.heart : 1) * (u && u.st && u.st.queen && u.st.queen.atk ? 1 + u.st.queen.atk : 1);"],
]);
patch('v2/src/battle/rules.js', [
  ["const critK = tier === 'crit' && u.pas && u.pas.critDmg ? 1 + u.pas.critDmg : 1;", "const critK = tier === 'crit' ? (1 + ((u.pas && u.pas.critDmg) || 0)) * (1 + ((u.st && u.st.queen && u.st.queen.critDmg) || 0)) : 1;"],
]);
patch('v2/src/battle/model.js', [
  ["return 0.1 + dot + (q ? R * 0.3 * after(3) : 0);", "return 0.1 + dot + (q ? R * (0.3 + (q.atk || 0) + 0.5 * (q.critDmg || 0)) * after(3) : 0);"],
  ...(m[6] ? [["const need = Math.max(0, ...u.kit.map(k => k.cost || 0));", "const need = Math.max(0, ...u.kit.filter(k => canUse(u, k, 99, foe)).map(k => k.cost || 0));"]] : []),
]);
console.log(`사본 고침 끝 — 지옥의 여왕 = 기동 +${S}% · 치명 +${C} · 공격 +${A}% · 치명 피해 +${D}% · 지옥전개 햇빛 ${E}${m[6] ? ' · 봇 광합성 값 고침' : ''}`);
