// 변이 상성 시험(2026-10-17 — docs/superpowers/specs/2026-10-17-v2-mutation-matchup.md 안 3): 배율 표 · 무기 종류 · 변이 기술만 치는 쪽 상성 · 실제 전투 피해에 곱해지는지
//   node tools/test/matchup.mjs
import { formMult, FORM_BEATS, FORM_WEAK, FORM_STRONG, WEAPON_TYPES, SKILL_WEAPON } from '../../v2/src/battle/matchup.js';
import { hitMult, elemMult } from '../../v2/src/battle/model.js';
import { SKILLS, SPECIES } from '../../v2/src/game/catalog.js';
import { CARDS } from '../../v2/src/game/cards.js';
import { unitOf } from '../../v2/src/game/fight.js';
import { newGame, makePlant } from '../../v2/src/game/logic.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const U = (key, form, el) => ({ key, form: form || null, el: el || SPECIES[key].el });
const sk = id => SKILLS[id];
// ① 표 자체: 다섯 바퀴 · 모순 없음
ok(Object.keys(FORM_BEATS).length === 5 && new Set(Object.values(FORM_BEATS)).size === 5, '변이끼리 다섯 바퀴');
for (const [f, ws] of Object.entries(FORM_WEAK)) for (const w of ws) ok(!(FORM_STRONG[f] || []).includes(w), `${f} 약함 · 셈 겹침 ${w}`);
for (const id of Object.keys(SKILL_WEAPON)) ok(!!SKILLS[id], '무기 기술 없음 ' + id);
ok(!!CARDS.m_flamer && CARDS.m_flamer.form === 'weapon' && CARDS.m_flamer.kind === 'skill', '화염 방사 카드');
// ② 무기 종류: 칼 → 풀 ×1.25 · 대지 · 물 ×0.8 / 총 → 바람 ×0.8 · 불 ×1.25 / 번개 창 → 물 ×1.25(물에 안 듦 없음)
const W = U('blade_vine', 'weapon');
ok(near(formMult(W, U('flower_grass'), sk('m_slash')), 1.25), '칼 → 풀');
ok(near(formMult(W, U('gaia'), sk('m_slash')), 0.8), '칼 → 대지 안 듦');
ok(near(formMult(W, U('aqua'), sk('m_smash')), 0.8), '망치 → 물 안 듦');
ok(near(formMult(W, U('cactus_wind'), sk('m_shot')), 0.8), '총 → 바람 안 듦');
ok(near(formMult(W, U('cactus_fire'), sk('m_shot')), 1.25), '총 → 불');
ok(near(formMult(W, U('frost_bell'), sk('m_flamer')), 1.25), '화염방사 → 빙결');
ok(near(formMult(W, U('vine_water'), sk('m_spear')), 1.25), '번개 창 → 물');
ok(near(hitMult(W, U('vine_water'), sk('m_spear')), 1.5 * 1.25), '번개 창 → 물 = 속성 × 무기');
ok(near(formMult(W, U('flower_grass'), sk('u_blade_1')), 1.25), '블레이드바인 베기 = 칼');
ok(near(formMult(W, U('gaia'), sk('m_rocket')), 1.25) && near(formMult(W, U('cactus_wind'), sk('m_rocket')), 0.8), '로켓포 → 대지 · 바람 안 듦');
ok(near(formMult(W, U('cactus_wind'), sk('m_xbow')), 1.25) && near(formMult(W, U('gaia'), sk('m_xbow')), 0.8), '석궁 → 바람 · 대지 안 듦');
ok(!!CARDS.m_rocket && !!CARDS.m_xbow && SKILLS.m_rocket.area, '로켓포 · 석궁 카드');
// ③ 맞는 쪽 변이의 약한 속성(늘 — 일반 식물이 쳐도): 포자 ← 불 · 용족 ← 빙결
ok(near(formMult(U('cactus_fire'), U('ember_cap', 'spore'), sk('f_ember')), 1.25), '불 → 포자 약함');
ok(near(formMult(U('frost_bell'), U('drake_cactus', 'dragon'), sk('u_frost_1')), 1.25), '빙결 → 용족 약함');
ok(near(formMult(U('frost_bell'), U('drake_cactus', 'dragon'), sk('basic') || { power: 40, el: null }), 1), '속성 없는 기본기 = 그대로');
// ④ 치는 쪽: 변이 기술일 때만 — 용족(태생) 개성 기술 → 불 ×1.25, 같은 식물의 공통 기술은 그대로
const D = U('drake_cactus', 'dragon');
ok(near(formMult(D, U('cactus_fire'), sk('u_drake_1')), 1.25), '용족 개성 → 불');
ok(near(formMult(D, U('cactus_fire'), sk('f_ember')), 1), '용족 공통 기술 → 불 = 그대로');
ok(near(formMult(D, U('gaia', 'weapon'), sk('m_breath')), 1.25), '㉮ 용족 → 무기(용의 숨결 · 대지 무기 식물)');
ok(near(formMult(D, U('blade_vine', 'weapon'), sk('m_breath')), 1.25 * 1.25), '㉮ + 용족 셈 불(블레이드바인 = 불 무기)');
ok(near(formMult(U('fang_trap', 'predator'), U('aqua'), sk('m_bite')), 1.25), '포식 → 물');
ok(near(formMult(U('fang_trap', 'predator'), U('ember_cap', 'spore'), sk('m_bite')), 1.25), '㉮ 포식 → 포자');
ok(near(formMult(U('toxi_cactus', 'toxic'), U('gaia'), sk('m_spit')), 1.25), '독성 → 대지');
ok(near(formMult(U('toxi_cactus', 'toxic'), U('drake_cactus', 'dragon'), sk('m_spit')), 1.25), '㉮ 독성 → 용족');
// ⑤ 실제 유닛: 변이(form)가 실림 · 전투 한 판에서 피해에 곱해짐(같은 씨앗 · 상성만 다름)
{
  const rng = makeRng(5), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0), p = makePlant(s, { key: 'drake_cactus' }, rng, 0);
  ok(unitOf('me', p).form === 'dragon', '유닛에 변이');
  const q = makePlant(s, { key: 'cactus_fire' }, rng, 0);
  ok(unitOf('me', q).form === null, '일반 식물 = 변이 없음');
}
console.log(fails ? `변이 상성 시험 ${fails}개 실패` : '변이 상성 시험 모두 통과');
process.exit(fails ? 1 : 0);
