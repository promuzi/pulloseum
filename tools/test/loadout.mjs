// 기술 칸 여섯 · 기본기 빼고 넣기 · 처음 안내 봤음 시험(2026-10-16 — 화면 없이 규칙만 · 2026-10-17 전투 칸 넷 → 여섯)
//  ① 옛 세이브(전투 3칸 + 기본기 늘 · 전투 칸 넷)를 한 번만 여섯으로 ② 손패 = 옛 판은 옛 손패 · 새 판은 전투 칸 그대로
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
  ok(p.skills.v4 === 1 && p.skills.v6 === 1 && p.skills.battle.length === 6, '옮기면 전투 칸 여섯 · v6');
  ok(p.skills.battle[0] === 'u_petal_1' && BASIC_IDS.every(id => p.skills.battle.includes(id)), '빈 칸은 기본기로: ' + p.skills.battle);
  const once = JSON.stringify(p.skills); normSkills(p);
  ok(JSON.stringify(p.skills) === once, '두 번 옮겨도 그대로');
  const kit = kitOfPlant(p).map(k => k.id);
  ok(JSON.stringify(kit) === JSON.stringify(p.skills.battle.filter(Boolean)), '새 판 손패 = 전투 칸 그대로: ' + kit);
  // 전투 칸 넷(v4) → 여섯: 늘어난 두 칸 = 보관 칸의 배운 기술 → 빠진 기본기
  const q = game().plants[0];
  q.skills = { battle: ['u_petal_1', 'j_scent', 'basic', 'guard'], joker: 'j_petals', forgot: [], learned: ['u_petal_1', 'j_scent', 'j_petals'], v4: 1 };
  normSkills(q);
  ok(JSON.stringify(q.skills.battle) === '["u_petal_1","j_scent","basic","guard","j_petals","evade"]' && JSON.stringify(q.skills.store) === '["sun"]' && !('joker' in q.skills), 'v4 → v6 = 조커 · 빠진 기본기(v8 — 남은 기본기 광합성은 보관 칸에): ' + q.skills.battle);
  // v6 → v7(2026-10-18 보관 여섯): 조커 → 보관 첫 칸 · 놓을 칸을 기다리던 새 기술도 보관으로
  const w = game().plants[0];
  w.skills = { battle: ['u_petal_1', 'basic', 'guard', 'evade', 'sun', null], joker: 'j_scent', forgot: [], learned: ['u_petal_1', 'j_scent', 'j_petals'], v4: 1, v6: 1 }; w.pend = ['j_petals'];
  normSkills(w);
  ok(w.skills.v7 === 1 && JSON.stringify(w.skills.store) === '["j_scent","j_petals"]' && !w.pend.length && !('joker' in w.skills), 'v7 = 조커 · 기다리던 기술 → 스킬 보관: ' + JSON.stringify(w.skills));
  const kq = kitOfPlant({ ...q, skills: { ...q.skills, battle: ['u_petal_1', 'basic', 'guard', 'evade'], v6: undefined } }).map(k => k.id);
  ok(kq.length === 4, '이어 하는 옛 판(v4 그대로 저장된 식물) = 손패 넷 그대로: ' + kq);
}
// ② 처음 식물 = 넷 · 기본기 셋은 늘 앎
{
  const p = game().plants[0];
  ok(p.skills.v6 === 1 && p.skills.battle.length === 6, '새 식물 = 전투 칸 여섯');
  const inBattle = p.skills.battle.filter(Boolean);
  ok(inBattle.length === 6 && BASIC_IDS.every(id => p.skills.battle.includes(id)), '새 식물 = 배운 기술 둘 + 기본기 넷(햇빛 모으기 포함 — 2026-10-18): ' + p.skills.battle);
}
// ③ setLoadout
{
  const s = game(), p = s.plants[0], id = p.uid;
  p.skills.battle = ['u_petal_1', 'basic', 'guard', 'evade', null, null]; p.skills.store = ['j_scent']; p.skills.v4 = 1; p.skills.v6 = 1;
  throws(() => setLoadout(s, id, ['basic', 'guard', 'evade', 'u_petal_1']), '칸이 넷(여섯이어야)');
  throws(() => setLoadout(s, id, ['basic', 'basic', 'guard', 'evade', 'u_petal_1', null]), '같은 기술 두 칸');
  throws(() => setLoadout(s, id, ['basic', 'guard', 'evade', 'f_ball', 'u_petal_1', null]), '모르는 기술');
  setLoadout(s, id, ['basic', 'guard', 'evade', null, null, null]);
  ok(JSON.stringify(p.skills.store) === '["j_scent","u_petal_1"]', '배운 기술 둘 다 보관으로(여섯 칸 — 2026-10-18 · 새로 뺀 것은 뒤에)');
  p.skills.store = ['j_scent']; p.skills.battle = ['u_petal_1', 'basic', 'guard', 'evade', null, null];
  throws(() => setLoadout(s, id, [null, null, null, null, null, null]), '다 비움');
  setLoadout(s, id, ['j_scent', 'basic', null, 'evade', null, null]);
  ok(JSON.stringify(p.skills.store) === '["u_petal_1","guard"]' && p.skills.battle[0] === 'j_scent' && p.skills.battle[2] === null, '보관 ↔ 전투 칸 · 빈 칸 허용(v8 — 뺀 기본기도 보관으로): ' + JSON.stringify(p.skills));
  setLoadout(s, id, ['j_scent', 'u_petal_1', 'guard', 'basic', null, null]);
  ok(JSON.stringify(p.skills.store) === '["evade"]' && !p.skills.battle.includes('evade'), '기본기를 빼면 보관 칸으로(v8 — 칸을 차지)');
  ok(JSON.stringify(kitOfPlant(p).map(k => k.id)) === JSON.stringify(['j_scent', 'u_petal_1', 'guard', 'basic']), '손패 = 바꾼 순서');
  setLoadout(s, id, ['guard', 'j_scent', 'basic', 'u_petal_1', null, 'evade']);
  ok(JSON.stringify(kitOfPlant(p).map(k => k.id)) === JSON.stringify(['guard', 'j_scent', 'basic', 'u_petal_1', 'evade']), '여섯째 칸까지 · 빈 칸은 손패에서 빠짐');
  throws(() => runOp(s, 'setLoadout', { id, battle: ['basic', 'guard', 'evade', 'u_petal_1'] }, { rng: makeRng(1), now: 0 }), '서버 일 목록도 칸 여섯');
}
// ④ 새 기술을 기본기 자리에
{
  const s = game(), p = s.plants[0], id = p.uid;
  p.skills.battle = ['u_petal_1', 'basic', 'guard', 'evade', null, null]; p.skills.store = ['j_scent']; p.skills.v4 = 1; p.skills.v6 = 1; p.skills.forgot = [];
  p.pend = ['j_petals'];
  placePending(s, id, 'j_petals', 'b2');
  ok(p.skills.battle[2] === 'j_petals' && !p.skills.forgot.includes('guard'), '기본기 자리에 놓으면 기본기는 지운 기술로 안 감');
  p.pend = ['j_wrap'];
  placePending(s, id, 'j_wrap', 'b0');
  ok(p.skills.battle[0] === 'j_wrap' && p.skills.forgot.includes('u_petal_1'), '배운 기술 자리에 놓으면 원래 기술은 지운 기술로');
  p.pend = ['j_bloom'];
  placePending(s, id, 'j_bloom', 'b5');
  ok(p.skills.battle[5] === 'j_bloom', '여섯째 칸(b5)에도 놓음');
  p.pend = ['j_vine'];
  placePending(s, id, 'j_vine', 'store');
  ok(p.skills.store.includes('j_vine') && !p.pend.length, '스킬 보관에 놓기');
  p.skills.store = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']; p.pend = ['j_ivy'];
  throws(() => placePending(s, id, 'j_ivy', 'store'), '스킬 보관이 다 참');
  ok(p.pend.includes('j_ivy'), '막히면 기다림 그대로');
}
// ⑤-1 카드 고르기(2026-10-18): 레벨업 = 셋 중 하나 · 단계 끝 레벨 = 넷 중 둘 · 진화 = 넷 중 둘 · 마지막 진화 = 다섯 중 셋 · 후보는 화면 · 서버가 같게(정한 씨앗) · 보류 = 그대로
{
  const { feed, evolve, draftPick } = await import('../../v2/src/game/logic.js');
  const s = game(), p = s.plants[0], id = p.uid;
  s.items.water = 999; s.items.fert = 999;
  const s2 = JSON.parse(JSON.stringify(s));
  feed(s, id, 'fert', 2); feed(s2, id, 'fert', 2);   // 비료 둘(+50) = Lv2 — 고르기는 단계마다 Lv3 · Lv6에서만(2026-10-22)
  ok(p.lv === 2 && !(p.drafts || []).length, 'Lv2 레벨업엔 고르기 없음(Lv3 · Lv6만): ' + JSON.stringify(p.drafts));
  feed(s, id, 'fert', 3); feed(s2, id, 'fert', 3);   // 비료 셋 더 = Lv3
  ok(p.lv === 3 && p.drafts && p.drafts.length === 1 && p.drafts[0].kind === 'lv' && p.drafts[0].pick === 1 && p.drafts[0].cands.length >= 1, 'Lv3 레벨업 → 고르기 하나(셋 중 하나): ' + JSON.stringify(p.drafts));
  ok(JSON.stringify(p.drafts) === JSON.stringify(s2.plants[0].drafts), '같은 상태면 같은 후보(화면 먼저 · 서버 같게)');
  throws(() => draftPick(s, id, 0, []), '안 고르면 막힘');
  throws(() => draftPick(s, id, 0, ['f_ball']), '후보 아닌 기술');
  const c0 = p.drafts[0].cands[0], r = draftPick(s, id, 0, [c0]);
  ok(!p.drafts.length && r.got[0].id === c0 && [...p.skills.battle, ...p.skills.store].includes(c0), '고른 기술 = 스킬 칸 · 보관으로: ' + JSON.stringify(r.got));
  while (p.lv < 6) feed(s, id, 'fert', 1);
  const top = p.drafts.find(d => d.lv === 6);   // 그 단계 기술이 바닥나면 고르기가 안 생김(어린 단계는 기술이 적음)
  ok(!top || top.pick === Math.min(2, top.cands.length), '단계 끝 레벨 = 넷 중 둘(후보가 있으면): ' + JSON.stringify(p.drafts));
  const all = p.drafts.flatMap(d => d.cands);
  ok(new Set(all).size === all.length, '고르기마다 후보가 겹치지 않음');
  const nDraft = p.drafts.length;
  evolve(s, id, makeRng(5));
  const skillOnly = () => p.drafts.filter(d => d.part !== 'passive'), ev = skillOnly().pop();   // 진화 = 기술 고르기 + 패시브 고르기(2026-10-18)
  ok(p.drafts.length === nDraft + 2 && ev.kind === 'evo' && ev.pick === Math.min(2, ev.cands.length), '진화 = 넷 중 둘(보류한 고르기도 남음): ' + JSON.stringify(ev));
  p.lv = 6; evolve(s, id, makeRng(6));
  const last = skillOnly().pop();
  ok(last.kind === 'evo' && last.st === 2 && last.pick === Math.min(3, last.cands.length), '마지막 진화 = 다섯 중 셋: ' + JSON.stringify(last));
  const n0 = p.drafts.length;
  runOp(s, 'draftPick', { id, n: p.drafts.indexOf(last), picks: last.cands.slice(0, last.pick) }, { rng: makeRng(1), now: 0 });
  ok(p.drafts.length === n0 - 1, '서버 일 목록(ops draftPick)');
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
// ⑥ 변이 식물 = 전투 칸 여섯 중 둘까지 그 변이 기술 카드(2026-10-17) · 판마다 횟수 · 변이 종자
{
  const { setCards, makePlant, seedOf, formsFor } = await import('../../v2/src/game/logic.js');
  const { isSkillCard } = await import('../../v2/src/game/cards.js');
  const { unitOf, botPlant } = await import('../../v2/src/game/fight.js');
  const { makeBattle, playTurnVs } = await import('../../v2/src/battle/model.js');
  const { canUse, usesLeft } = await import('../../v2/src/battle/status.js');
  const { formSkills, SKILLS } = await import('../../v2/src/game/catalog.js');
  const s = game(), rng = makeRng(9);
  const p = makePlant(s, { key: 'cactus_fire', form: 'weapon' }, rng, 0); s.plants.push(p);
  const sk0 = p.skills.battle.find(isSkillCard);
  ok(p.form === 'weapon' && p.cards[0] && !isSkillCard(p.cards[0]) && p.cards[1] === null && sk0 && p.skills.battle.includes(sk0), '변이 종자 → 변이 식물 · 전투 칸에 그 변이 기술 카드 · 카드 칸 = 패시브: ' + JSON.stringify(p.skills.battle) + JSON.stringify(p.cards));
  const kit = kitOfPlant(p);
  ok(kit.length === 6 && kit.filter(k => k.mut).length === 1 && kit.every(k => !k.extra), '변이 식물 손패 = 여섯(기술 카드도 그 자리): ' + kit.map(k => k.id));
  s.cards = { m_bite: 1, m_slash: 2, m_smash: 1 };
  const { setSlots } = await import('../../v2/src/game/logic.js');
  throws(() => setCards(s, p.uid, ['m_slash', null]), '기술 카드는 카드 칸에 못 넣음');
  throws(() => setSlots(s, p.uid, (() => { const b = [...p.skills.battle]; b[4] = 'm_bite'; return b; })(), p.cards), '다른 변이 기술 카드');
  throws(() => setSlots(s, s.plants[0].uid, (() => { const b = [...s.plants[0].skills.battle]; b[5] = 'm_slash'; return b; })(), s.plants[0].cards), '변이 아닌 식물에 기술 카드');
  setSlots(s, p.uid, (() => { const b = [...p.skills.battle]; b[4] = 'm_smash'; b[5] = 'm_slash'; return b; })(), p.cards);
  ok(p.skills.battle[4] === 'm_smash' && p.skills.battle[5] === 'm_slash' && s.cards[sk0] >= 1, '전투 칸에 기술 카드 둘(있던 건 가방으로)');
  throws(() => setSlots(s, p.uid, (() => { const b = [...p.skills.battle]; b[3] = 'm_slash'; return b; })(), p.cards), '같은 카드 두 칸');
  s.cards.m_shot = 1;
  throws(() => setSlots(s, p.uid, (() => { const b = [...p.skills.battle]; b[3] = 'm_shot'; return b; })(), p.cards), '기술 카드는 둘까지');
  // 횟수: 칼날 베기(판마다 SKILLS.m_slash.uses번 — 2026-10-17 밸런스로 2) — 그만큼 쓰고 나면 그 판엔 못 씀 · 쇠망치(1번) — 한 번
  p.cards = [null, null, null];   // 횟수를 늘리는 패시브가 무작위로 끼면 횟수 시험이 흔들림(2026-10-18 잠재력으로 굴림 차례가 바뀌며 드러남)
  const me = unitOf('me', p), foe = unitOf('foe', makePlant(s, { key: 'gaia' }, rng, 0)); foe.hp = foe.max = 99999;
  const B = makeBattle({ me, foe, seed: 3 }), slash = me.kit.find(k => k.id === 'm_slash'), smash = me.kit.find(k => k.id === 'm_smash');
  const okAt = [];
  for (let t = 1; t <= 5; t++) { okAt.push(canUse(B.me, slash)); playTurnVs(B, canUse(B.me, slash) ? slash : 'rest', 'rest'); }
  const want = Array.from({ length: 5 }, (_, i) => i < SKILLS.m_slash.uses);
  ok(JSON.stringify(okAt) === JSON.stringify(want), '판마다 정해진 횟수만큼 쓰고 끝: ' + JSON.stringify(okAt));
  ok(slash.cost === 0 && slash.uses === SKILLS.m_slash.uses && usesLeft(B.me, slash) === 0, '에너지 안 씀 · 남은 횟수 0');
  ok(smash.uses === 1 && canUse(B.me, smash), '쇠망치 = 한 번(아직 안 씀)');
  playTurnVs(B, smash, 'rest'); ok(!canUse(B.me, smash) && usesLeft(B.me, smash) === 0, '쇠망치 한 번 쓰면 끝');
  const B2 = makeBattle({ me: unitOf('me', p), foe: unitOf('foe', makePlant(s, { key: 'gaia' }, rng, 0)), seed: 4 });
  ok(canUse(B2.me, B2.me.kit.find(k => k.id === 'm_slash')), '새 판 = 횟수 다시 가득');
  // 숨결 = 그 식물 속성
  const d = makePlant(s, { key: 'aqua', form: 'dragon' }, rng, 0); d.skills.battle[5] = 'm_breath';
  ok(kitOfPlant(d).find(k => k.id === 'm_breath').el === 'water', '용의 숨결 = 식물 속성');
  // 변이 종자: 탐사 배율이 있을 때만 · 버섯 = 포자만
  let n = 0, bad = 0;
  for (let i = 0; i < 4000; i++) { const sd = seedOf(s, i % 2 ? 'spore_cap' : 'thorn', rng, { mut: 2 }); if (sd.form) { n++; if (!formsFor(sd.key).includes(sd.form)) bad++; } }
  ok(n > 200 && n < 450 && !bad, `변이 종자 비율(배율 2) ${(n / 40).toFixed(1)}% · 맞지 않는 변이 ${bad}`);
  ok(!seedOf(s, 'thorn', rng).form, '배율 없는 종자는 변이 없음');
  ok(Object.values(SKILLS).filter(x => x.tier === 'm').every(x => (x.cost || 0) === 0 && x.uses >= 1 && !x.charge), '변이 기술 = 에너지 0 · 판마다 횟수');
  // 봇: 자라는 단계부터 가끔 변이(전투 칸 여섯 중 기술 카드 한두 장 + 그 변이 패시브)
  let bf = 0; for (let i = 0; i < 400; i++) { const b = botPlant(makeRng(i), 1, 3, 0); const k = kitOfPlant(b); ok(k.length <= 6 && b.skills.battle.length === 6, '봇 손패 = 여섯 칸'); if (b.form) { bf++; const n = b.skills.battle.filter(isSkillCard).length; ok(n >= 1 && n <= 2 && !b.cards.some(isSkillCard) && k.filter(x => x.mut).length === n, '변이 봇 = 전투 칸에 기술 카드 한두 장 · 카드 칸 = 패시브'); } }
  ok(bf > 10 && bf < 70, '변이 봇 ' + bf + '/400');
}
// ⑥ v8 — 기본기도 칸을 차지(2026-10-18 사용자 "기본기 스킬도 6개 스킬 칸에 포함 · 꽉 차면 버려야 함"): 장착에 없는 기본기 → 보관 빈 칸(평타 · 방어 · 회피 · 광합성 순) → 못 들어가면 지운 기술 · 놓을 칸 기다림 → 하나 고르기
{
  const { slotLayout } = await import('../../v2/src/game/logic.js');
  const s = game(), p = s.plants[0];
  p.skills = { battle: ['u_petal_1', 'j_scent', null, null, null, null], store: ['a1', 'a2', 'a3', 'a4', 'a5'], forgot: [], learned: [], v4: 1, v6: 1, v7: 1 };
  normSkills(p);
  ok(p.skills.v8 === 1, 'v8 표시');
  ok(p.skills.store.length === 6 && p.skills.store[5] === 'basic', '빈 보관 한 칸 = 평타 먼저: ' + p.skills.store);
  ok(['guard', 'evade', 'sun'].every(x => p.skills.forgot.includes(x)), '못 들어간 기본기 = 지운 기술: ' + p.skills.forgot);
  const once = JSON.stringify(p.skills); normSkills(p);
  ok(JSON.stringify(p.skills) === once, 'v8 두 번 = 그대로');
  p.pend = ['j_petals']; delete p.skills.v8; normSkills(p);
  ok(!p.pend.length && (p.drafts || []).some(d => d.kind === 'one' && d.part === 'skill' && d.pick === 1 && d.cands[0] === 'j_petals'), '놓을 칸 기다림 → 하나 고르기: ' + JSON.stringify(p.drafts));
  const q = game().plants[0];
  ok(q.skills.v8 === 1 && [...q.skills.battle, ...q.skills.store].filter(x => BASIC_IDS.includes(x)).length === 4, '새 식물 = 기본기 넷이 칸 안에: ' + JSON.stringify(slotLayout(q)));
}
// ⑦ setSlots 새 꼴 — { battle, store, cards, pstore } 전부 · 기본 기술(배운 기술 + 기본기)은 빠짐없이 · 옛 꼴(battle, cards 둘)도 받음
{
  const { slotLayout, setSlots } = await import('../../v2/src/game/logic.js');
  const s = game(), p = s.plants[0], L0 = slotLayout(p);
  const L1 = { ...L0, battle: [...L0.battle], store: [...L0.store] }, out = L1.battle.indexOf('evade');
  L1.battle[out] = null; L1.store.push('evade');
  setSlots(s, p.uid, L1);
  ok(p.skills.store.includes('evade') && !p.skills.battle.includes('evade'), '기본기 해제 = 보관으로');
  const L2 = slotLayout(p);
  throws(() => setSlots(s, p.uid, { ...L2, store: L2.store.filter(x => x !== 'evade') }), '기본 기술을 빼 버림 = 막힘');
  throws(() => setSlots(s, p.uid, { ...L2, store: [...L2.store, 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7'] }), '보관 일곱 = 막힘');
  throws(() => setSlots(s, p.uid, { ...L2, battle: [null, null, null, null, null, null], store: [...L2.store, ...L2.battle.filter(Boolean)] }), '장착 비움 = 막힘');
  const old = slotLayout(p), third = p.cards[2];
  setSlots(s, p.uid, old.battle, old.cards.slice(0, 2));
  ok(p.cards.length === 3 && p.cards[2] === third, '옛 꼴(카드 둘) = 셋째 칸 그대로');
  const ob = [...old.battle], j = ob.findIndex(Boolean), moved = ob[j]; ob[j] = null;
  setSlots(s, p.uid, ob, old.cards);
  ok(p.skills.store.includes(moved), '옛 꼴로 장착에서 뺀 기술 = 보관 뒤에');
  runOp(s, 'setSlots', { id: p.uid, ...slotLayout(p) }, { rng: makeRng(1), now: 0 });
  ok(true, '서버 일 목록(ops setSlots 새 꼴)');
}
// ⑧ 패시브 고르기(첫 진화 · 둘째 진화 · Lv16, 셋 중 하나) · 후보 섞기(사용자 "(나) — 예전 것도 배울 기회, 우선은 최신 것") · draftApply(놓은 배치 그대로 확정)
{
  const { feed, evolve, draftApply, slotLayout } = await import('../../v2/src/game/logic.js');
  const { bloomPool } = await import('../../v2/src/game/catalog.js');
  const s = game(), p = s.plants[0]; s.items.fert = 999; p.drafts = [];
  while (p.lv < 6) feed(s, p.uid, 'fert', 1);
  ok(!p.drafts.some(d => d.part === 'passive'), 'Lv6(단계 끝)엔 패시브 고르기 없음');
  evolve(s, p.uid, makeRng(1));
  const ev = p.drafts.filter(d => d.st === 1);
  ok(ev.length === 2 && ev[0].part === 'skill' && ev[1].part === 'passive' && ev[1].pick === 1 && ev[1].cands.length >= 1 && ev[1].cands.length <= 3, '진화 = 기술 다음 패시브(셋 중 하나): ' + JSON.stringify(ev));
  ok(ev[1].cands.every(id => !p.cards.includes(id)), '패시브 후보 = 그 식물에 없는 것');
  const n = p.drafts.findIndex(d => d.part === 'skill'), d = p.drafts[n], L0 = slotLayout(p);
  throws(() => draftApply(s, p.uid, n, { battle: L0.battle, store: L0.store }), '후보를 하나도 안 놓음 = 막힘');
  throws(() => draftApply(s, p.uid, n, { battle: L0.battle, store: [...L0.store, 'f_ball'] }), '후보 아닌 기술 = 막힘');
  const pick = d.cands.slice(0, d.pick), L1 = { battle: [...L0.battle], store: [...L0.store] }, out = L1.battle[0];
  L1.battle[0] = pick[0]; for (const x of pick.slice(1)) L1.store.push(x);
  const before = JSON.stringify(s), r = draftApply(s, p.uid, n, L1);
  ok(r.dropped.includes(out) && p.skills.forgot.includes(out), '밀려나 남은 기존 기술 = 지운 기술: ' + JSON.stringify(r));
  ok(!p.drafts.includes(d) && pick.every(x => [...p.skills.battle, ...p.skills.store].includes(x)), '확정 = 고른 기술이 칸에 · 고르기 빠짐');
  const s2 = JSON.parse(before); draftApply(s2, p.uid, n, L1);
  ok(JSON.stringify(s2.plants[0].skills) === JSON.stringify(p.skills), '같은 입력 = 같은 결과(화면 먼저 · 서버 같게)');
  throws(() => draftApply(s, p.uid, 9, L1), '없는 고르기 번호 = 막힘');
  const pn = p.drafts.findIndex(x => x.part === 'passive'), pd = p.drafts[pn], PL = slotLayout(p), nc = [...PL.cards];
  nc[nc.indexOf(null)] = pd.cands[0];
  if (pd.cands[1]) { const two = [...nc]; two[two.indexOf(null)] = pd.cands[1]; throws(() => draftApply(s, p.uid, pn, { cards: two, pstore: PL.pstore }), '패시브 둘 = 막힘(하나만)'); }
  const bag0 = JSON.stringify(s.cards);
  runOp(s, 'draftApply', { id: p.uid, n: pn, layout: { cards: nc, pstore: PL.pstore } }, { rng: makeRng(1), now: 0 });   // 서버 일 목록으로
  ok(p.cards.includes(pd.cands[0]) && JSON.stringify(s.cards) === bag0, '고른 패시브 = 새 카드(가방 그대로)');
  // Lv16 = 패시브 고르기
  p.lv = 6; evolve(s, p.uid, makeRng(2)); p.drafts = [];
  while (p.lv < 6) feed(s, p.uid, 'fert', 1);
  ok(p.drafts.some(x => x.part === 'passive' && x.st === 2 && x.lv === 6), 'Lv16 = 패시브 고르기: ' + JSON.stringify(p.drafts.map(x => x.part + x.lv)));
  // 후보 섞기: 이번 단계 기술을 다 알면 앞 단계 기술이 나옴 · 여럿 보면 이번 단계가 대부분
  const q = game().plants[0], s3 = game(); s3.plants[0] = q; s3.items.fert = 999;
  q.stage = 1; q.lv = 1; q.gxp = 0; q.drafts = [];
  q.skills.forgot.push(...bloomPool(q.key, 1).map(x => x.id));
  while (q.lv < 3) feed(s3, q.uid, 'fert', 1);   // 고르기는 Lv3 · Lv6에서만(2026-10-22)
  const p0 = new Set(bloomPool(q.key, 0).map(x => x.id)), dq = q.drafts.find(x => x.part === 'skill');
  ok(dq && dq.cands.length >= 1 && dq.cands.every(id => p0.has(id)), '이번 단계를 다 알면 앞 단계 기술: ' + JSON.stringify(dq));
  let cur = 0, all = 0;
  for (let i = 0; i < 40; i++) {
    const t = game(), w = t.plants[0]; t.items.fert = 999; w.uid = 'mix' + i; w.stage = 1; w.lv = 1; w.gxp = 0; w.drafts = [];
    while (w.lv < 3) feed(t, w.uid, 'fert', 1);
    const p1 = new Set(bloomPool(w.key, 1).map(x => x.id));
    for (const id of (w.drafts.find(x => x.part === 'skill') || { cands: [] }).cands) { all++; if (p1.has(id)) cur++; }
  }
  ok(all > 0 && cur / all > 0.6 && cur < all, `이번 단계가 대부분 · 앞 단계도 가끔: ${cur}/${all}`);
}
// ⑨ 칸이 다 찬 식물에 같은 기술 접목 가지 둘 — 첫 가지가 '하나 고르기'로 기다리는 동안 둘째는 막힘(가지를 헛되이 쓰지 않게 — 최종 검토 2026-10-18)
{
  const { graft } = await import('../../v2/src/game/logic.js');
  const { bloomPool, canGraft, SKILLS } = await import('../../v2/src/game/catalog.js');
  const s = game(), p = s.plants[0];
  const known0 = new Set([...p.skills.battle, ...p.skills.store, ...p.skills.forgot]);
  const sk = bloomPool(p.key, 0).map(x => x.id).find(id => !known0.has(id) && !canGraft(p, id));
  const filler = Object.keys(SKILLS).filter(id => id !== sk && !known0.has(id)).slice(0, 6 - p.skills.store.length);
  p.skills.store.push(...filler);
  ok(sk && p.skills.store.length === 6 && !p.skills.battle.includes(null), '준비: 칸 다 참 · 접목할 기술 ' + sk);
  s.scions = [{ id: 'sc1', skill: sk }, { id: 'sc2', skill: sk }];
  const r1 = graft(s, p.uid, 'sc1');
  ok(r1.to === 'draft' && p.drafts.some(d => d.kind === 'one' && d.cands[0] === sk), '첫 가지 = 하나 고르기');
  throws(() => graft(s, p.uid, 'sc2'), '같은 기술 둘째 가지 = 막힘(고르기에서 기다리는 중)');
  ok(s.scions.length === 1 && s.scions[0].id === 'sc2', '둘째 가지는 남음');
}
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
