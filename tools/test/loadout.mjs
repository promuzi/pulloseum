// 기술 칸 넷 · 기본기 빼고 넣기 · 처음 안내 봤음 시험(2026-10-16 — 화면 없이 규칙만)
//  ① 옛 세이브(전투 3칸 + 기본기 늘)를 한 번만 넷으로 ② 손패 = 옛 판은 옛 손패 · 새 판은 전투 칸 넷 그대로
//  ③ setLoadout 막는 것(길이 · 같은 기술 두 번 · 모르는 기술 · 배운 기술 둘을 빼기 · 다 비우기) ④ 새 기술을 기본기 자리에 놓으면 기본기는 안 사라짐
//  ⑤ 처음 안내 봤음(이름 모양 · 개수 제한 · 서버 일 목록으로)
//   node tools/test/loadout.mjs
import { newGame, normSkills, setLoadout, placePending, seeGuide, Err, BASIC_IDS } from '../../v2/src/game/logic.js';
import { kitOfPlant } from '../../v2/src/game/fight.js';
import { runOp } from '../../v2/src/game/ops.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const throws = (f, m) => { try { f(); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err, m + ' — 다른 오류: ' + e.message); } };
const game = () => newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(3), 0);

// ① 옛 세이브 옮기기
{
  const s = game(), p = s.plants[0];
  p.skills = { battle: ['u_petal_1', null, null], joker: null, forgot: [], learned: ['u_petal_1'] };
  const oldKit = kitOfPlant(p).map(k => k.id);
  ok(oldKit.length === 4 && oldKit.slice(0, 3).every(id => BASIC_IDS.includes(id)) && oldKit[3] === 'u_petal_1', '옛 판 손패 = 기본기 셋 + 배운 기술: ' + oldKit);
  normSkills(p);
  ok(p.skills.v4 === 1 && p.skills.battle.length === 4, '옮기면 전투 칸 넷 · v4');
  ok(p.skills.battle[0] === 'u_petal_1' && BASIC_IDS.every(id => p.skills.battle.includes(id)), '빈 칸은 기본기로: ' + p.skills.battle);
  const once = JSON.stringify(p.skills); normSkills(p);
  ok(JSON.stringify(p.skills) === once, '두 번 옮겨도 그대로');
  const kit = kitOfPlant(p).map(k => k.id);
  ok(JSON.stringify(kit) === JSON.stringify(p.skills.battle), '새 판 손패 = 전투 칸 넷 그대로: ' + kit);
}
// ② 처음 식물 = 넷 · 기본기 셋은 늘 앎
{
  const p = game().plants[0];
  ok(p.skills.v4 === 1 && p.skills.battle.length === 4, '새 식물 = 전투 칸 넷');
  const inBattle = p.skills.battle.filter(Boolean);
  ok(inBattle.length === 4, '새 식물 전투 칸이 다 참: ' + p.skills.battle);
}
// ③ setLoadout
{
  const s = game(), p = s.plants[0], id = p.uid;
  p.skills.battle = ['u_petal_1', 'basic', 'guard', 'evade']; p.skills.joker = 'j_scent'; p.skills.v4 = 1;
  throws(() => setLoadout(s, id, ['basic', 'guard', 'evade']), '칸이 셋');
  throws(() => setLoadout(s, id, ['basic', 'basic', 'guard', 'evade']), '같은 기술 두 칸');
  throws(() => setLoadout(s, id, ['basic', 'guard', 'evade', 'f_ball']), '모르는 기술');
  throws(() => setLoadout(s, id, ['basic', 'guard', 'evade', null]), '배운 기술 둘을 다 뺌(보관은 하나)');
  throws(() => setLoadout(s, id, [null, null, null, null]), '다 비움');
  setLoadout(s, id, ['j_scent', 'basic', null, 'evade']);
  ok(p.skills.joker === 'u_petal_1' && p.skills.battle[0] === 'j_scent' && p.skills.battle[2] === null, '조커 ↔ 전투 칸 · 빈 칸 허용: ' + JSON.stringify(p.skills));
  setLoadout(s, id, ['j_scent', 'u_petal_1', 'guard', 'basic']);
  ok(p.skills.joker === null && !p.skills.battle.includes('evade'), '기본기를 빼도 됨(보관에 늘 있음)');
  ok(JSON.stringify(kitOfPlant(p).map(k => k.id)) === JSON.stringify(['j_scent', 'u_petal_1', 'guard', 'basic']), '손패 = 바꾼 순서');
}
// ④ 새 기술을 기본기 자리에
{
  const s = game(), p = s.plants[0], id = p.uid;
  p.skills.battle = ['u_petal_1', 'basic', 'guard', 'evade']; p.skills.joker = 'j_scent'; p.skills.v4 = 1; p.skills.forgot = [];
  p.pend = ['j_petals'];
  placePending(s, id, 'j_petals', 'b2');
  ok(p.skills.battle[2] === 'j_petals' && !p.skills.forgot.includes('guard'), '기본기 자리에 놓으면 기본기는 지운 기술로 안 감');
  p.pend = ['j_wrap'];
  placePending(s, id, 'j_wrap', 'b0');
  ok(p.skills.battle[0] === 'j_wrap' && p.skills.forgot.includes('u_petal_1'), '배운 기술 자리에 놓으면 원래 기술은 지운 기술로');
}
// ⑤ 처음 안내 봤음
{
  const s = game();
  seeGuide(s, 'home');
  ok(s.guide && s.guide.home === 1, '봤음 남음');
  throws(() => seeGuide(s, 'Home'), '이름 모양(대문자)');
  throws(() => seeGuide(s, '../x'), '이름 모양(기호)');
  throws(() => seeGuide(s, 'a'.repeat(17)), '이름 길이');
  for (let i = 0; i < 39; i++) seeGuide(s, 'g' + i);
  throws(() => seeGuide(s, 'more'), '개수 제한(40)');
  seeGuide(s, 'home');   // 이미 본 것은 다시 해도 됨
  const s2 = game();
  runOp(s2, 'guide', { id: 'battle' }, { rng: makeRng(1), now: 0 });
  ok(s2.guide.battle === 1, '서버 일 목록(ops guide)으로');
}
// ⑥ 변이 칸 둘(변이 식물 = 여섯) · 충전 · 변이 종자
{
  const { setMut, makePlant, seedOf, formsFor } = await import('../../v2/src/game/logic.js');
  const { unitOf, botPlant } = await import('../../v2/src/game/fight.js');
  const { makeBattle, playTurnVs } = await import('../../v2/src/battle/model.js');
  const { canUse, chargeLeft } = await import('../../v2/src/battle/status.js');
  const { formSkills, SKILLS } = await import('../../v2/src/game/catalog.js');
  const s = game(), rng = makeRng(9);
  const p = makePlant(s, { key: 'cactus_fire', form: 'weapon' }, rng, 0); s.plants.push(p);
  ok(p.form === 'weapon' && JSON.stringify(p.skills.mut) === JSON.stringify(formSkills('weapon').slice(0, 2)), '변이 종자 → 변이 식물 · 변이 칸 둘: ' + JSON.stringify(p.skills.mut));
  const kit = kitOfPlant(p);
  ok(kit.length === 6 && kit.filter(k => k.mut).length === 2, '변이 식물 손패 = 여섯(넷 + 변이 둘): ' + kit.map(k => k.id));
  throws(() => setMut(s, p.uid, ['m_bite', null]), '다른 변이 기술');
  throws(() => setMut(s, p.uid, ['m_slash', 'm_slash']), '같은 변이 기술 두 칸');
  throws(() => setMut(s, s.plants[0].uid, ['m_slash', null]), '변이 아닌 식물');
  setMut(s, p.uid, ['m_smash', 'm_slash']);
  ok(JSON.stringify(p.skills.mut) === '["m_smash","m_slash"]', '변이 칸 바꾸기(목록 안에서 언제든)');
  // 충전: 칼날 베기(충전 2) — 1턴 씀 → 2 · 3턴 못 씀 → 4턴 다시
  const me = unitOf('me', p), foe = unitOf('foe', makePlant(s, { key: 'gaia' }, rng, 0)); foe.hp = foe.max = 99999;
  const B = makeBattle({ me, foe, seed: 3 }), slash = me.kit.find(k => k.id === 'm_slash');
  const okAt = [];
  for (let t = 1; t <= 4; t++) { okAt.push(canUse(B.me, slash)); playTurnVs(B, canUse(B.me, slash) ? slash : 'rest', 'rest'); }
  ok(JSON.stringify(okAt) === '[true,false,false,true]', '충전 2 = 쓰고 두 턴 기다림: ' + JSON.stringify(okAt));
  ok(slash.cost === 0 && chargeLeft(B.me, slash) === 2, '에너지 안 씀 · 쓴 턴 끝 = 남은 충전 2');
  // 숨결 = 그 식물 속성
  const d = makePlant(s, { key: 'aqua', form: 'dragon' }, rng, 0);
  ok(kitOfPlant(d).find(k => k.id === 'm_breath').el === 'water', '용의 숨결 = 식물 속성');
  // 변이 종자: 탐사 배율이 있을 때만 · 버섯 = 포자만
  let n = 0, bad = 0;
  for (let i = 0; i < 4000; i++) { const sd = seedOf(s, i % 2 ? 'spore_cap' : 'thorn', rng, { mut: 2 }); if (sd.form) { n++; if (!formsFor(sd.key).includes(sd.form)) bad++; } }
  ok(n > 200 && n < 450 && !bad, `변이 종자 비율(배율 2) ${(n / 40).toFixed(1)}% · 맞지 않는 변이 ${bad}`);
  ok(!seedOf(s, 'thorn', rng).form, '배율 없는 종자는 변이 없음');
  ok(Object.values(SKILLS).filter(x => x.tier === 'm').every(x => (x.cost || 0) === 0 && x.charge > 0), '변이 기술 = 에너지 0 · 충전 있음');
  // 봇: 자라는 단계부터 가끔 변이
  let bf = 0; for (let i = 0; i < 400; i++) { const b = botPlant(makeRng(i), 1, 3, 0); if (b.form) { bf++; ok(kitOfPlant(b).length === 6, '변이 봇 손패 여섯'); } }
  ok(bf > 10 && bf < 70, '변이 봇 ' + bf + '/400');
}
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
