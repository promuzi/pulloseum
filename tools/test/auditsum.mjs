// 지는 기술 살피기 결과 묶기(2026-11-05 밤샘 — 아침 보고용): tools/test/out/audit_stage<0~2>.json → 단계마다 잘못 씀(봇 고침) · 약함(사용자가 볼 목록)
//  기술마다 위력 · 비용 · 거는 효과 · 뒷면 설명 첫 줄을 붙임(사용자 '기술 이름만 쓰지 말고 무엇을 하는지')
//   node tools/test/auditsum.mjs
import { readFileSync, existsSync } from 'node:fs';
import { SKILLS, SPECIES } from '../../v2/src/game/catalog.js';
const STG = ['새싹', '성장기', '성체'], p1 = x => (100 * x).toFixed(1);
const info = id => {
  const s = SKILLS[id] || {}, bits = [];
  if (s.power) bits.push(`위력 ${s.power}${s.hits > 1 ? `×${s.hits}` : ''}`); else bits.push('피해 없음');
  bits.push(s.uses ? `판마다 ${s.uses}번` : `햇빛 ${s.cost || 0}`);
  const fx = [s.inflict && s.inflict.id, ...(s.inflicts || []).map(f => f.id), ...(s.hex || []).map(h => h.id), s.self, s.also].filter(Boolean);
  if (fx.length) bits.push(fx.join('·'));
  if (s.desc && s.desc.length) bits.push(s.desc[0]);
  return bits.join(' · ');
};
for (const st of [0, 1, 2]) {
  const f = `tools/test/out/audit_stage${st}.json`;
  if (!existsSync(f)) continue;
  const rows = JSON.parse(readFileSync(f, 'utf8'));
  const fixed = rows.filter(r => r.misuse), weak = rows.filter(r => !r.misuse && (r.weak || r.harm)), fine = rows.filter(r => !r.misuse && !r.weak && !r.harm);
  console.log(`\n### ${STG[st]} — 살핀 기술 ${rows.length} · 봇이 잘못 씀(고침) ${fixed.length} · 약함 ${weak.length} · 괜찮음 ${fine.length}`);
  for (const r of fixed) console.log(`- 고침 ${SPECIES[r.k].name} · ${SKILLS[r.id].name}(${info(r.id)}): 지금 ${p1(r.wNow)}% → ${r.best.only ? '그때만' : '늘'} ${p1(r.best.w)}% (${JSON.stringify(r.best.when)})`);
  for (const r of weak.sort((a, b) => (a.best.w - a.wRepl) - (b.best.w - b.wRepl))) console.log(`- 약함 ${SPECIES[r.k].name} · ${SKILLS[r.id].name}(${info(r.id)}): 지금 ${p1(r.wNow)}% · 안 씀 ${p1(r.wNever)}% · 다른 카드로 ${p1(r.wRepl)}% · 쓸 수 있을 때 ${p1(r.useRate)}% 씀${r.harm ? ' · 쓰면 손해' : ''}`);
}
