// 카드 시험(2026-10-17 — 화면 없이 규칙만): 모든 식물 = 전투 칸 여섯 + 카드 칸 둘(패시브) · 일반 식물 = 일반 카드 · 변이 식물 = 그 변이 패시브 + 전투 칸에 그 변이 기술 카드 둘까지
//  ① 표(카드 수 · 기술 카드 = 변이 기술 · 패시브 수치 · 설명) ② 새 계정(처음 식물에 일반 카드 한 장) ③ 옛 세이브(변이 칸 둘 → 카드 칸 · 가방 · 한 번만)
//  ④ 끼우기 · 빼기 · 자리 바꾸기(가방 장부) · 막는 것 ⑤ 태생 변이 전투 칸 ⑥ 식물이 떠나면 카드는 가방으로(팔기 · 해체 · 거름) · 새 기술 · 조커와 바꿀 때
//  ⑦ 패시브가 전투에 닿는지(능력치 · 흡수 · 반사 · 독 겹 · 면역 · 비늘 · 재생 · 위력 · 횟수 · 분노 · 소화액 · 균사 · 부생 · 치명 피해 · 3:3 시작 에너지)
//  ⑧ 얻는 곳(탐사 · 해체 · 상점 꾸러미 · 레벨업) ⑨ 봇 카드 · 다시 돌리기 같은 결과 ⑩ 서버 일 목록(setCards · setSlots)
//   node tools/test/cards.mjs
import { newGame, makePlant, syncTimers, normIvs, stars, setCards, setSlots, setLoadout, placePending, swapJoker, sell, dismantle, merge, explore, buy, addXp, probeOf, Err, BASIC_IDS, MUT_MAX } from '../../v2/src/game/logic.js';
import { kitOfPlant, unitOf, botPlant, setupBot, replayBot } from '../../v2/src/game/fight.js';
import { CARDS, CARD_SLOTS, NORMAL_CARDS, formCards, isSkillCard, cardFits, passivesOf, rollCard, cardFace } from '../../v2/src/game/cards.js';
import { SKILLS, SPECIES, FORM_KEYS, PLANETS, SHOP, levelReward } from '../../v2/src/game/catalog.js';
import { runOp } from '../../v2/src/game/ops.js';
import { makeRng, resolveTurn } from '../../v2/src/battle/rules.js';
import { makeBattle, playTurnVs } from '../../v2/src/battle/model.js';
import { makeTeamBattle } from '../../v2/src/battle/team.js';
import { apply, endTurn, pasAtkK, pasDmgK } from '../../v2/src/battle/status.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const throws = (f, m) => { try { f(); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err, m + ' — 다른 오류: ' + e.message); } };
const game = (seed = 3) => newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(seed), 0);
const plant = (s, key, o = {}) => { const p = makePlant(s, { key, ...o }, makeRng(77), 0); s.plants.push(p); return p; };
const bag = s => JSON.stringify(Object.fromEntries(Object.entries(s.cards).sort()));

// ① 표
{
  const ids = Object.keys(CARDS), skills = Object.values(SKILLS).filter(x => x.tier === 'm');
  ok(ids.length >= 40, '카드 40장 넘게: ' + ids.length);
  ok(skills.every(x => CARDS[x.id] && CARDS[x.id].kind === 'skill' && CARDS[x.id].form === x.form), '변이 기술마다 기술 카드');
  ok(NORMAL_CARDS.length >= 6 && NORMAL_CARDS.every(id => !CARDS[id].form && CARDS[id].kind === 'passive'), '일반 카드 = 패시브 · 변이 없음');
  for (const f of FORM_KEYS) { const fc = formCards(f); ok(fc.filter(isSkillCard).length >= 4 && fc.filter(id => !isSkillCard(id)).length >= 3, `${f} 변이 카드 = 기술 넷 이상 + 패시브 셋: ${fc}`); }
  ok(Object.values(CARDS).filter(c => c.kind === 'passive').every(c => c.name && c.badge && c.desc && c.desc.length && c.icon && Object.keys(c.pas).length), '패시브 = 이름 · 수치 · 설명 · 아이콘');
  // 깡스탯은 일반 카드가 큼(사용자 "변이 애들은 단순 스펙을 올리는 수치는 높지 않아서")
  const stat = (c, k) => (c.pas[k] || 0);
  for (const k of ['hp', 'atk', 'def', 'spd']) {
    const nMax = Math.max(...NORMAL_CARDS.map(id => stat(CARDS[id], k))), vMax = Math.max(...Object.values(CARDS).filter(c => c.form && c.kind === 'passive').map(c => stat(c, k)));
    ok(nMax >= vMax * 2, `${k}: 일반 카드 최대 ${nMax} ≥ 변이 카드 최대 ${vMax} × 2`);
  }
  ok(cardFace('n_wall').passive && cardFace('m_bite').act === 'attack' && cardFace('m_scale').act === 'buff', '화면 모습(패시브 · 기술)');
  ok(Object.values(SKILLS).filter(x => x.tier === 'm' && x.el).length >= 8, '속성 변이 기술(불 · 물 · …) 여럿');
}
// ② 새 계정
{
  const s = game(), p = s.plants[0];
  ok(s.cardsV === 1 && JSON.stringify(s.cards) === '{}', '새 계정 가방 빔 · 옮김 표시');
  ok(p.cards.length === CARD_SLOTS && NORMAL_CARDS.includes(p.cards[0]) && p.cards[1] === null, '처음 식물 = 일반 카드 한 장: ' + p.cards);
  const m = plant(s, 'thorn', { form: 'toxic' });
  const msk = m.skills.battle.filter(isSkillCard);
  ok(CARDS[m.cards[0]].form === 'toxic' && !isSkillCard(m.cards[0]) && m.cards[1] === null && msk.length === 1 && CARDS[msk[0]].form === 'toxic', '변이 식물 = 그 변이 패시브(카드 칸) + 기술 카드(전투 칸): ' + m.cards + ' / ' + m.skills.battle);
  const d = plant(s, 'drake_cactus');
  ok(d.form === 'dragon' && CARDS[d.cards[0]].form === 'dragon' && d.skills.battle.some(id => isSkillCard(id) && CARDS[id].form === 'dragon'), '태생 변이 = 그 변이 카드 둘(패시브 + 기술)');
}
// ③ 옛 세이브: 옛 변이 칸 둘(전투 칸 넷 시절) → 전투 칸 여섯의 기술 카드 · 카드 칸 둘에 기술 카드가 있던 판(v4) → 전투 칸으로
{
  const s = game(), p = plant(s, 'thorn', { form: 'predator' }), L0 = p.skills.battle[0];
  delete s.cardsV; s.cards = undefined; p.cards = undefined;
  p.skills = { battle: [L0, 'basic', 'guard', 'evade'], joker: null, forgot: [], learned: [L0], v4: 1, mut: ['m_bite', 'm_hunt'] };
  const st = s.storage; const q = makePlant(s, { key: 'aqua', form: 'weapon' }, makeRng(5), 0), Q0 = q.skills.battle[0]; q.cards = undefined;
  q.skills = { battle: [Q0, 'basic', 'guard', 'evade'], joker: null, forgot: [], learned: [Q0], v4: 1, mut: ['m_shot', null] }; st.push(q);
  syncTimers(s, 0);
  ok(JSON.stringify(p.skills.battle.slice(0, 4)) === JSON.stringify([L0, 'basic', 'guard', 'evade']) && [...p.skills.battle.slice(4)].sort().join() === 'm_bite,m_hunt' && JSON.stringify(p.cards) === '[null,null]' && !('mut' in p.skills), '옛 변이 칸 → 전투 칸 여섯: ' + JSON.stringify(p.skills.battle) + JSON.stringify(p.cards));
  ok(q.skills.battle.includes('m_shot') && JSON.stringify(q.cards) === '[null,null]', '보관고 식물도: ' + q.skills.battle);
  ok(s.cards.m_devour === 1 && s.cards.m_slash === 1 && s.cards.m_smash === 1 && s.cards.n_wall === 1, '나머지 옛 변이 기술 = 가방 카드 · 하던 사람 일반 카드 한 장: ' + bag(s));
  const once = bag(s) + JSON.stringify(p.skills.battle) + JSON.stringify(p.cards); syncTimers(s, 0); syncTimers(s, 5);
  ok(bag(s) + JSON.stringify(p.skills.battle) + JSON.stringify(p.cards) === once, '두 번 옮겨도 그대로');
  // v4: 카드 칸에 기술 카드 둘 + 패시브 없음 → 늘어난 두 칸에 그대로(손패 여섯 = 전과 같은 기술)
  const s2 = game(), r = plant(s2, 'thorn', { form: 'weapon' }), R0 = r.skills.battle[0];
  r.skills = { battle: [R0, 'basic', 'guard', 'evade'], joker: 'j_spikes', forgot: [], learned: [R0, 'j_spikes'], v4: 1 }; r.cards = ['m_slash', 'm_shot'];
  syncTimers(s2, 0);
  ok(JSON.stringify(r.skills.battle) === JSON.stringify([R0, 'basic', 'guard', 'evade', 'm_slash', 'm_shot']) && JSON.stringify(r.skills.store) === '["j_spikes"]' && JSON.stringify(r.cards) === '[null,null]', 'v4 카드 칸 기술 카드 → 늘어난 두 칸(조커는 스킬 보관으로): ' + r.skills.battle + ' / ' + r.cards);
  // 기술 카드가 넘침(전투 칸 셋 · 다른 변이) → 가방
  const s3 = game(), w = plant(s3, 'thorn', { form: 'weapon' });
  w.skills.battle = ['m_slash', 'm_shot', 'm_smash', 'basic', 'm_bite', null]; w.cards = [null, null]; s3.cards = {};
  syncTimers(s3, 0);
  ok(w.skills.battle.filter(isSkillCard).length === 2 && s3.cards.m_smash === 1 && s3.cards.m_bite === 1, '넘친 기술 카드 · 다른 변이 카드 → 가방: ' + w.skills.battle + ' / ' + bag(s3));
}
// ④ 끼우기 · 빼기 · 자리 바꾸기
{
  const s = game(), p = s.plants[0];
  if (['n_wall', 'n_fiber', 'n_balance'].includes(p.cards[0])) p.cards[0] = 'n_target';   // 처음 카드는 무작위 — 아래에서 가방의 n_wall · n_fiber 와 겹치지 않게
  const first = p.cards[0];
  s.cards = { n_wall: 2, n_fiber: 1, v_sap: 1, m_bite: 1 };
  setCards(s, p.uid, [first, 'n_wall']);
  ok(p.cards[1] === 'n_wall' && s.cards.n_wall === 1, '가방에서 끼움 → 가방 하나 줄어듦');
  setCards(s, p.uid, ['n_wall', first]);
  ok(p.cards[0] === 'n_wall' && p.cards[1] === first && s.cards.n_wall === 1, '자리 바꿈 = 가방 그대로');
  setCards(s, p.uid, ['n_wall', null]);
  ok(p.cards[1] === null && (s.cards[first] || 0) >= 1, '빼면 가방으로: ' + bag(s));
  throws(() => setCards(s, p.uid, ['v_sap', null]), '일반 식물에 변이 카드');
  throws(() => setCards(s, p.uid, ['m_bite', null]), '일반 식물에 변이 기술 카드');
  throws(() => setCards(s, p.uid, ['n_wall', 'n_wall']), '같은 카드 두 칸');
  throws(() => setCards(s, p.uid, ['n_wall', 'n_balance']), '가방에 없는 카드');
  throws(() => setCards(s, p.uid, ['n_wall']), '칸은 둘');
  throws(() => setCards(s, p.uid, ['nope', null]), '없는 카드');
  const m = plant(s, 'thorn', { form: 'predator' }); s.cards.n_vacuole = 1;
  throws(() => setCards(s, m.uid, ['n_vacuole', null]), '변이 식물에 일반 카드');
  throws(() => setCards(s, m.uid, ['m_bite', null]), '변이 기술 카드는 카드 칸에 못 넣음(전투 칸으로)');
  const before = { ...s.cards }, m0 = [...m.cards];
  setCards(s, m.uid, ['v_sap', m0[1]]);
  ok(m.cards[0] === 'v_sap' && s.cards[m0[0]] === (before[m0[0]] || 0) + 1 && !s.cards.v_sap, '변이 패시브 바꿔 끼움(있던 건 가방으로)');
  ok(cardFits(p, 'n_wall') === null && cardFits(m, 'n_wall') && cardFits(m, 'm_bite') === null && cardFits(m, 'm_slash'), 'cardFits');
}
// ⑤ 변이 식물 전투 칸(태생이든 변이 종자든 — 2026-10-17 "변이는 6개 중 2개를 변이 스킬 카드로")
{
  const s = game(), d = plant(s, 'drake_cactus'), n = plant(s, 'thorn', { form: 'dragon' }); d.cards = [null, null]; n.cards = [null, null];
  for (const x of [d, n]) x.skills.battle = x.skills.battle.map(id => (isSkillCard(id) ? null : id));   // 처음 핀 기술 카드는 비우고(무작위 — 시험 카드와 겹치지 않게)
  s.cards = { m_frostclaw: 1, m_voltclaw: 2, m_bite: 1, v_scale: 1 };
  const b0 = [...d.skills.battle], bi = b0.findIndex(x => BASIC_IDS.includes(x));
  const nb = [...b0]; nb[bi] = 'm_frostclaw';
  setSlots(s, d.uid, nb, d.cards);
  ok(d.skills.battle[bi] === 'm_frostclaw' && !s.cards.m_frostclaw, '태생 변이 = 전투 칸에 기술 카드(가방에서)');
  const k = kitOfPlant(d), fc = k.find(x => x.id === 'm_frostclaw');
  ok(fc && fc.extra === false && k.indexOf(fc) === bi, '전투 칸 카드 = 그 자리 손패(아래 줄 아님)');
  s.cards.m_breath = 1; s.cards.m_roar = 1; s.cards.m_scale = 1;
  const put = (x, id) => { const bb = [...x.skills.battle], i = bb.indexOf(null) >= 0 ? bb.indexOf(null) : bb.findIndex(v => BASIC_IDS.includes(v)); bb[i] = id; return bb; };
  setSlots(s, n.uid, put(n, 'm_breath'), n.cards); setSlots(s, n.uid, put(n, 'm_roar'), n.cards);
  ok(['m_breath', 'm_roar'].every(id => n.skills.battle.includes(id)) && n.skills.battle.filter(isSkillCard).length === 2, '변이 종자 식물도 전투 칸에 기술 카드 둘: ' + n.skills.battle);
  throws(() => setSlots(s, n.uid, put(n, 'm_scale'), n.cards), `기술 카드는 ${MUT_MAX}장까지`);
  throws(() => setSlots(s, d.uid, (() => { const x = [...d.skills.battle]; x[x.findIndex(v => BASIC_IDS.includes(v))] = 'm_bite'; return x; })(), d.cards), '다른 변이 카드는 전투 칸에도 안 됨');
  throws(() => setSlots(s, d.uid, (() => { const x = [...d.skills.battle]; x[x.findIndex(v => BASIC_IDS.includes(v))] = 'v_scale'; return x; })(), d.cards), '패시브 카드는 전투 칸에 못 넣음');
  // 전투 칸 카드를 빼면 가방으로(자리는 기본기)
  const back = [...d.skills.battle]; back[bi] = BASIC_IDS.find(x => !back.includes(x));
  setLoadout(s, d.uid, back);
  ok(s.cards.m_frostclaw === 1 && !d.skills.battle.includes('m_frostclaw'), '전투 칸 카드 빼기 → 가방');
  // 배운 기술 자리에 카드 → 배운 기술은 보관(조커) 칸
  const li = d.skills.battle.findIndex(x => x && !BASIC_IDS.includes(x) && !isSkillCard(x)), learned = d.skills.battle[li];
  const nb2 = [...d.skills.battle]; nb2[li] = 'm_voltclaw';
  setSlots(s, d.uid, nb2, d.cards);
  ok(d.skills.store.includes(learned) && d.skills.battle[li] === 'm_voltclaw', '배운 기술 → 스킬 보관');
  // 새로 핀 기술을 카드 자리에 놓으면 카드는 가방으로(지운 기술로 가지 않게)
  d.pend.push('f_rage'); const before = s.cards.m_voltclaw || 0;
  const r = placePending(s, d.uid, 'f_rage', 'b' + li);
  ok(r.card === 'm_voltclaw' && s.cards.m_voltclaw === before + 1 && !d.skills.forgot.includes('m_voltclaw'), '새 기술 → 카드는 가방으로');
  // 조커와 바꿀 때 카드는 가방으로
  const ci = d.skills.battle.findIndex(x => BASIC_IDS.includes(x)); const nb3 = [...d.skills.battle]; nb3[ci] = 'm_voltclaw';
  setSlots(s, d.uid, nb3, d.cards); const v0 = s.cards.m_voltclaw || 0;
  swapJoker(s, d.uid, ci);
  ok((s.cards.m_voltclaw || 0) === v0 + 1 && !d.skills.store.includes('m_voltclaw'), '보관과 바꾸면 카드는 가방(보관 칸 아님)');
}
// ⑥ 식물이 떠나면 카드는 가방으로
{
  const s = game(), a = plant(s, 'thorn'), b = plant(s, 'thorn'), c = plant(s, 'aqua');
  s.cards = { n_wall: 1, n_fiber: 1, n_spine: 1 };
  setCards(s, a.uid, ['n_wall', null]); setCards(s, b.uid, ['n_fiber', null]); setCards(s, c.uid, ['n_spine', null]);
  sell(s, a.uid);
  ok(s.cards.n_wall === 1, '팔면 카드는 가방');
  dismantle(s, c.uid, makeRng(4));
  ok(s.cards.n_spine >= 1, '해체해도 카드는 가방');
  const t = plant(s, 'thorn'), nf = s.cards.n_fiber || 0; merge(s, t.uid, b.uid, 'hp');   // 해체가 카드를 줄 수도 있어 전후로 셈
  ok(s.cards.n_fiber === nf + 1, '거름이 된 식물 카드도 가방');
}
// ⑦ 패시브가 전투에 닿는지
{
  const s = game(), P = key => { const p = plant(s, key); p.cards = [null, null]; return p; }, U = (p, ...cards) => { p.cards = [cards[0] || null, cards[1] || null]; return unitOf('me', p); };
  const p = P('gaia'), base = U(p), fib = U(p, 'n_fiber', 'n_vacuole'), chl = U(p, 'n_chloro');
  ok(fib.atk === Math.round(base.atk * (1 + CARDS.n_fiber.pas.atk)) && fib.max === Math.round(base.max * (1 + CARDS.n_vacuole.pas.hp)) && fib.def === base.def, '근섬유 · 액포 = 공격 · 체력 % ' + [base.atk, fib.atk, base.max, fib.max]);
  ok(chl.energy === 3 && base.energy === 2, '엽록체 = 시작 에너지 +1');
  ok(U(p, 'n_target').crit === base.crit + CARDS.n_target.pas.crit && U(p, 'n_balance').spd === Math.round(base.spd * (1 + CARDS.n_balance.pas.spd)), '표적 · 항상성');
  const T3 = makeTeamBattle({ me: [U(P('aqua'), 'n_chloro'), U(P('thorn')), U(P('gaia'))], foe: [U(P('aqua')), U(P('thorn')), U(P('gaia'))], seed: 2 });
  ok(T3.pool.me === 3 && T3.pool.foe === 2, '3:3 팀 에너지 시작 = 가장 큰 값');
  // 한 턴 돌려 사건 보기: 나 = 공격, 상대 = 쉼
  const turn = (me, foe, sk, seed = 7) => { const B = makeBattle({ me, foe, seed }); const k = typeof sk === 'string' ? me.kit.find(x => x.id === sk) : sk; return { B, t: playTurnVs(B, k, 'rest') }; };
  const atk = { id: 'x_hit', name: '시험 공격', act: 'attack', cats: ['attack'], power: 80, cost: 0, el: null };
  const tough = u => { u.hp = u.max = 99999; return u; };
  // 흡수(진액 흡수 — 변이 포식)
  const pr = plant(s, 'thorn', { form: 'predator' }); pr.cards = ['v_sap', null]; const prU = unitOf('me', pr); prU.hp = 50;
  let r = turn(prU, tough(unitOf('foe', P('aqua'))), atk);
  ok(r.t.events.some(e => e.t === 'heal' && e.who === 'me'), '진액 흡수 = 때린 만큼 회복');
  // 반사(가시 줄기)
  const sp = U(P('gaia'), 'n_spine'); sp.id = 'foe'; tough(sp);
  r = turn(tough(U(P('thorn'))), sp, atk);
  ok(r.t.events.some(e => e.t === 'reflect' && e.who === 'foe'), '가시 줄기 = 붙어서 때리면 되돌림');
  r = turn(tough(U(P('thorn'))), sp, { ...atk, ranged: true });
  ok(!r.t.events.some(e => e.t === 'reflect'), '멀리서 때리면 반사 없음');
  // 독 겹(맹독 농축) · 면역(해독 체질)
  const tx = plant(s, 'thorn', { form: 'toxic' }); tx.cards = ['v_venom', null];
  const vic = { id: 'foe', name: 't', hp: 100, max: 100, eff: {}, el: 'water', jong: 'flower' }, ev = [];
  apply(vic, 'poison', 1, { turn: 1, rng: () => 0.5, ev, by: unitOf('me', tx) });
  ok(vic.eff.poison && vic.eff.poison.n === 2, '맹독 농축 = 독 1겹 더');
  const ad = plant(s, 'thorn', { form: 'toxic' }); ad.cards = ['v_antidote', null]; const adU = unitOf('foe', ad);
  apply(adU, 'poison', 2, { turn: 1, rng: () => 0.5, ev, by: unitOf('me', tx) });
  ok(!adU.eff.poison && ev.some(e => e.t === 'immune' && e.card), '해독 체질 = 독 안 걸림');
  const spo = plant(s, 'spore_cap', { form: 'spore' }); spo.cards = ['v_spread', null];
  const vic2 = { id: 'foe', name: 't', hp: 100, max: 100, eff: {}, el: 'water', jong: 'flower' };
  apply(vic2, 'spore', 1, { turn: 1, rng: () => 0.5, ev, by: unitOf('me', spo) });
  ok(vic2.eff.spore && vic2.eff.spore.n === 2, '포자 번식 = 포자 1겹 더');
  // 강철 비늘 = 받는 피해 ↓(같은 씨앗 · 같은 공격)
  const dr = plant(s, 'thorn', { form: 'dragon' }); dr.cards = [null, null]; const plainD = tough(unitOf('foe', dr)); dr.cards = ['v_scale', null]; const scaleD = tough(unitOf('foe', dr));
  const dm = u => turn(tough(U(P('gaia'))), u, atk, 11).t.events.filter(e => e.t === 'hit').reduce((a, e) => a + e.dmg, 0);
  ok(dm(scaleD) < dm(plainD), `강철 비늘 = 덜 맞음 ${dm(scaleD)} < ${dm(plainD)}`);
  // 재생 비늘 · 부생 회복 = 턴 끝 회복
  dr.cards = ['v_regen', null]; const rg = unitOf('me', dr); rg.hp = 100;
  const ev2 = []; endTurn([[rg, null]], 1, ev2);
  ok(ev2.some(e => e.t === 'regen' && e.card) && rg.hp > 100, '재생 비늘 = 턴 끝 회복');
  spo.cards = ['v_rot', null]; const rt = unitOf('me', spo); rt.hp = 100; const foeD = { id: 'foe', hp: 100, max: 100, eff: { wet: { exp: 9 }, weak: { exp: 9 } } };
  const ev3 = []; endTurn([[rt, foeD]], 1, ev3);
  ok(rt.hp > 100, '부생 회복 = 상대 나쁜 효과만큼 회복');
  // 단조(위력) · 탄약 보급(횟수)
  const wp = plant(s, 'thorn', { form: 'weapon' }); wp.skills.battle[5] = 'm_slash'; wp.cards = ['v_forge', null];
  ok(kitOfPlant(wp).find(x => x.id === 'm_slash').power === Math.round(SKILLS.m_slash.power * 1.2), '단조 = 변이 기술 위력 +20%');
  wp.cards = ['v_ammo', null];
  ok(kitOfPlant(wp).find(x => x.id === 'm_slash').uses === SKILLS.m_slash.uses + 1, '탄약 보급 = 횟수 +1');
  // 분노 · 소화액 · 균사 · 치명 피해
  const wr = { hp: 40, max: 100, pas: { wrath: 0.25 } }; ok(pasAtkK(wr, null) === 1.25 && pasAtkK({ ...wr, hp: 60 }, null) === 1, '용의 분노 = 체력 절반 아래만');
  ok(pasDmgK({ pas: { exec: 0.3 } }, { hp: 20, max: 100 }) === 1.3 && pasDmgK({ pas: { exec: 0.3 } }, { hp: 50, max: 100 }) === 1, '소화액 = 30% 아래 상대만');
  ok(Math.abs(pasAtkK({ hp: 1, max: 1, pas: { mycel: 0.06 } }, { eff: { wet: {}, weak: {}, poison: { n: 2 } } }) - 1.18) < 1e-9, '공생 균사 = 상대 나쁜 효과 셋 → +18%');
  ok(Math.abs(pasDmgK({ pas: { acid: 0.15 } }, { hp: 9, max: 10, eff: { poison: { n: 1 } } }) - 1.15) < 1e-9, '강산 분비 = 독 걸린 상대 +15%');
  const crit = (pas, seed) => { const me = tough(U(P('gaia'))); me.crit = 50; me.pas = pas; const foe = tough(unitOf('foe', P('aqua'))); const B = makeBattle({ me, foe, seed }); const t = playTurnVs(B, atk, 'rest'); return t.events.find(e => e.t === 'hit'); };
  let hits = 0; for (let sd = 1; sd < 60 && !hits; sd++) { const a = crit({}, sd), b = crit({ critDmg: 0.25 }, sd); if (a.tier === 'crit' && b.tier === 'crit') { hits++; ok(b.dmg > a.dmg, `예리한 날 = 치명 피해 ↑ ${b.dmg} > ${a.dmg}`); } }
  ok(hits === 1, '치명 나온 판 찾음');
}
// ⑧ 얻는 곳
{
  const s = game(9), rng = makeRng(31); s.user.level = 30; s.wallet.credits = 1e7; s.wallet.gems = 1e5; probeOf(s);
  for (const k of Object.keys(s.probe.lv)) s.probe.lv[k] = 4;
  let got = 0, mut = 0;
  for (let i = 0; i < 500; i++) { s.items.fuel = 9; const pl = PLANETS[i % PLANETS.length]; if (pl.orbit > 4) continue; const r = explore(s, pl.id, rng, i * 1e6); for (const g of r.got) if (g.kind === 'card') { got++; if (CARDS[g.card].form) mut++; } }
  ok(got > 20 && mut > 0 && mut < got, `탐사 카드 ${got}장(변이 ${mut})`);
  let dc = 0; for (let i = 0; i < 80; i++) { const p = plant(s, 'thorn'); const r = dismantle(s, p.uid, makeRng(100 + i)); dc += r.got.filter(g => g.kind === 'card').length; }
  ok(dc > 5 && dc < 50, '해체 카드(일반 4분의 1쯤) ' + dc + '/80');
  const before = Object.values(s.cards).reduce((a, b) => a + b, 0);
  const rb = buy(s, 'card_basic', makeRng(2)); ok(rb.card && !CARDS[rb.card].form, '일반 카드 꾸러미 = 일반 카드');
  plant(s, 'thorn', { form: 'weapon' });
  let wpn = 0; for (let i = 0; i < 60; i++) { const r = buy(s, 'card_mut', makeRng(500 + i)); ok(CARDS[r.card].form, '변이 카드 꾸러미 = 변이 카드'); if (CARDS[r.card].form === 'weapon') wpn++; }
  ok(wpn > 20, '가진 변이(무기) 쪽이 자주: ' + wpn + '/60');
  ok(Object.values(s.cards).reduce((a, b) => a + b, 0) === before + 61, '산 카드는 가방에');
  ok(SHOP.some(x => x.id === 'card_basic') && SHOP.some(x => x.id === 'card_mut'), '상점 꾸러미 둘');
  ok([2, 5, 8].every(L => levelReward(L).card === 'normal') && !levelReward(3).card, '세 레벨마다 일반 카드');
  const s2 = game(); const c0 = Object.values(s2.cards).reduce((a, b) => a + b, 0); addXp(s2, 100, makeRng(1));   // Lv1 → 2
  ok(Object.values(s2.cards).reduce((a, b) => a + b, 0) === c0 + 1 && s2.pending.some(x => x.box && x.box.card), '레벨업 상자에 카드');
}
// ⑨ 봇 카드 · 다시 돌리기
{
  let withCard = 0, bad = 0;
  for (let i = 0; i < 300; i++) { const b = botPlant(makeRng(i), i % 3, 3, 0); if (b.cards.some(Boolean)) withCard++; for (const c of b.cards) if (c && (cardFits(b, c) || isSkillCard(c))) bad++; for (const c of b.skills.battle) if (isSkillCard(c) && cardFits(b, c)) bad++; if (new Set(b.cards.filter(Boolean)).size !== b.cards.filter(Boolean).length) bad++; }
  ok(withCard > 150 && !bad, `봇 카드 ${withCard}/300 · 맞지 않음 ${bad}`);
  const s = game(), me = s.plants[0];
  const spec = { seed: 99, mode: '1v1', mine: [me], foes: [botPlant(makeRng(5), 1, 3, 1)], trainer: 'b', rank: 'r', tlv: 3 };
  const acts = Array.from({ length: 30 }, (_, i) => me.skills.battle[i % 4] || 'basic');
  const A = replayBot(spec, acts), B = replayBot(spec, acts);
  ok(A.over === B.over && A.me.hp === B.me.hp && A.foe.hp === B.foe.hp && A.turn === B.turn, '카드 있는 판 다시 돌려도 같은 결과');
  ok(A.me.pas && A.foe.pas && Array.isArray(A.foe.cards), '유닛에 패시브 · 카드');
}
// ⑩ 서버 일 목록
{
  const s = game(); s.cards = { n_wall: 1 };
  const p = s.plants[0];
  if (p.cards[0] === 'n_wall') p.cards[0] = 'n_balance';   // 처음 카드는 무작위 — 끼울 n_wall 과 겹치지 않게
  runOp(s, 'setCards', { id: p.uid, cards: [p.cards[0], 'n_wall'] }, { rng: makeRng(1), now: 0 });
  ok(p.cards[1] === 'n_wall', 'setCards');
  throws(() => runOp(s, 'setCards', { id: p.uid, cards: ['n_wall'] }, { rng: makeRng(1), now: 0 }), 'setCards 칸 수');
  runOp(s, 'setSlots', { id: p.uid, battle: [...p.skills.battle], cards: [null, 'n_wall'] }, { rng: makeRng(1), now: 0 });
  ok(p.cards[0] === null && p.cards[1] === 'n_wall', 'setSlots');
  throws(() => runOp(s, 'setMut', { id: p.uid, mut: [null, null] }, { rng: makeRng(1), now: 0 }), '옛 setMut 없음');
}
// ⑪ 별 되돌리기(2026-10-18): 개체값 넷일 때 별이 다섯 칸 기준으로 줄어든 옛 식물 → 열매 값을 올려 그때 별 · 새 식물은 그대로 · 한 번만
{
  const T0 = Date.parse('2026-10-17T12:00:00+09:00'), T1 = Date.parse('2026-10-18T12:00:00+09:00');
  const old5 = { uid: 'p7', born: T0, ivs: { hp: 9, atk: 8, def: 8, spd: 9 } };   // 넷 합 34 = 옛 5성
  normIvs(old5); ok(stars(old5) === 5 && old5.ivFix === 1, '옛 5성(열매 칸 없음) → 5성: ' + JSON.stringify(old5.ivs));
  const old4 = { uid: 'p9', born: T0, ivs: { hp: 7, atk: 6, def: 6, spd: 7, fruit: 0 } };   // 이미 옮겨져 4성 아래로 떨어진 옛 4성(넷 합 26)
  normIvs(old4); ok(stars(old4) === 4 && old4.ivs.fruit === 5, '옛 4성(옮겨진 뒤) → 4성 · 열매 5: ' + old4.ivs.fruit);
  const noBorn = { uid: 'p3', ivs: { hp: 10, atk: 10, def: 10, spd: 3, fruit: 1 } };   // 핀 때 기록 없는 옛 세이브
  normIvs(noBorn); ok(stars(noBorn) === 5, '핀 때 없는 옛 식물도 되돌림');
  const fresh = { uid: 'p5', born: T1, ivs: { hp: 9, atk: 8, def: 8, spd: 9, fruit: 0 } };   // 새 규칙으로 핀 식물(열매 0 ≠ 옮길 때 값)
  if (fresh.ivs.fruit === normIvs({ uid: 'p5', ivs: { hp: 0, atk: 0, def: 0, spd: 0 } }).ivs.fruit) fresh.ivs.fruit = 1;
  normIvs(fresh); ok(fresh.ivs.fruit <= 1 && stars(fresh) === 4, '새 식물은 그대로');
  const again = { ...old4, ivs: { ...old4.ivs, fruit: 0 } }; normIvs(again); ok(again.ivs.fruit === 0, '한 번만(ivFix)');
  const s = game(); ok(s.plants[0].ivFix === 1, '새로 핀 식물 = 표시 있음');
}
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
