// 카드 꾸러미 · 강화 · 팔기 · 다른 식물과 나눠 쓰기 시험(2026-10-22 사용자 "상점에서 산 것등은 식물 설정에 들어가서 활성화하면 그 식물에 해당하는게 나오는 걸로" ·
//  "중복된 카드는 어떻게 처리할지 고민" · "패시브 카드의 경우 강화 기능을 고려해보자 밸런스 고려해서")
//  ① 표(강화 카드 +1 · +2 — 일반 패시브만, 엽록체 · 변이 카드 없음) ② 꾸러미 열기(그 식물에 맞는 카드) ③ 강화 ④ 팔기
//  ⑤ 한 식물에 같은 카드 한 장(강화 카드 포함) ⑥ 전투에 닿는지 ⑦ 패시브 고르기 후보 ⑧ 쿠폰 · 서버 일 목록
//   node tools/test/cardup.mjs
import { newGame, makePlant, setSlots, slotLayout, openPack, cardUp, sellCard, couponGive, evolve, Err } from '../../v2/src/game/logic.js';
import { CARDS, NORMAL_CARDS, formCards, isSkillCard, baseOf, cardPrice, CARD_UP, rollCard, cardFace } from '../../v2/src/game/cards.js';
import { LV_MAX } from '../../v2/src/game/catalog.js';
import { unitOf } from '../../v2/src/game/fight.js';
import { runOp } from '../../v2/src/game/ops.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const throws = (f, m, want) => { try { f(); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err && (!want || e.message.includes(want)), m + ' — ' + e.message); } };
const game = (seed = 3) => newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(seed), 0);
const plant = (s, key, o = {}) => { const p = makePlant(s, { key, ...o }, makeRng(77), 0); s.plants.push(p); return p; };

// ① 표
{
  const UP = ['n_fiber', 'n_wall', 'n_vacuole', 'n_tropism', 'n_target', 'n_spine', 'n_balance'];
  for (const id of UP) {
    const a = CARDS[id], b = CARDS[id + '_2'], c = CARDS[id + '_3'], k = Object.keys(a.pas)[0];
    ok(b && c && a.next === b.id && b.next === c.id && c.next === null, `${id}: 처음 → +1 → +2`);
    ok(b.pas[k] > a.pas[k] && c.pas[k] > b.pas[k], `${id}: 수치가 오름 ${a.pas[k]} → ${b.pas[k]} → ${c.pas[k]}`);
    ok(c.pas[k] <= a.pas[k] * 1.7 + 1e-9, `${id}: +2도 처음의 1.7배 안 ${c.pas[k]}`);
    ok(b.name === a.name + ' +1' && c.name === a.name + ' +2' && b.lv === 2 && c.lv === 3 && baseOf(c.id) === id, `${id}: 이름 · 단계`);
    ok(b.badge[0] !== a.badge[0] && b.desc[0] !== a.desc[0] && b.badge[1] === a.badge[1], `${id}: 앞면 수치 · 설명이 바뀜 ${b.badge[0]} · ${b.desc[0]}`);
    ok(cardFace(c.id).lv === 3 && cardFace(c.id).artId === id && !cardFace(c.id).canUp && cardFace(id).canUp, `${id}: 화면 모습(단계 · 그림 · 강화 가능)`);
  }
  ok(!CARDS.n_chloro.next && !CARDS.n_chloro_2, '엽록체 증식(햇빛 +1)은 강화 없음');
  ok(Object.values(CARDS).filter(x => x.form).every(x => !x.next && !x.base), '변이 카드는 강화 없음(2026-10-17 사용자 결정)');
  ok(NORMAL_CARDS.every(id => !CARDS[id].base), '뽑히는 일반 카드 = 처음 카드만');
  const rng = makeRng(9); let bad = 0; for (let i = 0; i < 2000; i++) if (CARDS[rollCard(rng, i % 2 ? 'normal' : 'mut')].base) bad++;
  ok(!bad, '뽑기에서 강화 카드 안 나옴');
  ok(cardPrice('n_fiber') < cardPrice('n_fiber_2') && cardPrice('n_fiber_2') < cardPrice('n_fiber_3') && cardPrice('v_sap') === 100, '팔 값: 강화할수록 비쌈 · 변이 100');
  ok(cardPrice('n_fiber_2') < 2 * cardPrice('n_fiber') + CARD_UP.credits[1], '+1 팔 값 < 든 것(두 장 + 강화 돈)');
}
// ② 꾸러미 열기
{
  const s = game(), p = s.plants[0], m = plant(s, 'thorn', { form: 'weapon' });
  throws(() => openPack(s, p.uid, 'passive', makeRng(1)), '꾸러미 없음', '꾸러미가 없어요');
  s.items.pack_n = 30; s.items.pack_m = 40;
  for (let i = 0; i < 30; i++) { const r = openPack(s, p.uid, 'passive', makeRng(10 + i)); ok(!CARDS[r.card].form && !CARDS[r.card].base && s.cards[r.card] >= 1, '일반 식물 = 일반 카드 ' + r.card); }
  ok(s.items.pack_n === 0 && s.items.pack_m === 40, '일반 식물은 일반 꾸러미만 씀');
  throws(() => openPack(s, p.uid, 'skill', makeRng(1)), '일반 식물 기술 카드', '패시브 카드만');
  for (let i = 0; i < 20; i++) { const r = openPack(s, m.uid, 'skill', makeRng(50 + i)); ok(CARDS[r.card].form === 'weapon' && isSkillCard(r.card), '변이 식물 스킬 탭 = 그 변이 기술 카드 ' + r.card); }
  for (let i = 0; i < 20; i++) { const r = openPack(s, m.uid, 'passive', makeRng(90 + i)); ok(CARDS[r.card].form === 'weapon' && !isSkillCard(r.card), '변이 식물 패시브 탭 = 그 변이 패시브 ' + r.card); }
  ok(s.items.pack_m === 0, '변이 꾸러미 마흔 개 다 씀');
  throws(() => openPack(s, m.uid, 'passive', makeRng(1)), '변이 꾸러미 없음(일반 꾸러미만 있어도)', '변이 카드 꾸러미가 없어요');
  const seen = new Set(); s.items.pack_n = 400; for (let i = 0; i < 400; i++) seen.add(openPack(s, p.uid, 'passive', makeRng(1000 + i)).card);
  ok(NORMAL_CARDS.every(id => seen.has(id)), '일반 꾸러미에서 일반 카드가 다 나옴: ' + [...seen]);
}
// ③ 강화
{
  const s = game(); s.cards = { n_fiber: 3, n_chloro: 2, v_sap: 2, n_wall_3: 2 }; s.wallet.credits = 1000;
  const r = cardUp(s, 'n_fiber');
  ok(r.to === 'n_fiber_2' && s.cards.n_fiber === 1 && s.cards.n_fiber_2 === 1 && s.wallet.credits === 1000 - CARD_UP.credits[1], '두 장 + 돈 → +1 한 장');
  throws(() => cardUp(s, 'n_fiber'), '한 장뿐', '2장');
  throws(() => cardUp(s, 'n_chloro'), '엽록체', '더 강화할 수 없는');
  throws(() => cardUp(s, 'v_sap'), '변이 카드', '변이 카드는 강화하지 않아요');
  throws(() => cardUp(s, 'n_wall_3'), '+2', '더 강화할 수 없는');
  s.cards.n_fiber_2 = 2; s.wallet.credits = 10; throws(() => cardUp(s, 'n_fiber_2'), '돈 모자람', '돈이 모자라요');
  ok(s.cards.n_fiber_2 === 2 && s.wallet.credits === 10, '막히면 아무것도 안 바뀜');
  s.wallet.credits = 600; cardUp(s, 'n_fiber_2');
  ok(s.cards.n_fiber_3 === 1 && !s.cards.n_fiber_2 && s.wallet.credits === 100, '+1 두 장 → +2(다 쓰면 가방에서 사라짐)');
  // 끼운 카드는 재료가 아님
  const t = game(), q = t.plants[0]; t.cards = { n_wall: 1 }; t.wallet.credits = 1000; const L = slotLayout(q); L.cards = ['n_wall', null, null];
  if (q.cards[0] && q.cards[0] !== 'n_wall') t.cards[q.cards[0]] = (t.cards[q.cards[0]] || 0);
  setSlots(t, q.uid, L);
  throws(() => cardUp(t, 'n_wall'), '끼운 카드 + 가방 0장', '2장');
}
// ④ 팔기
{
  const s = game(); s.cards = { n_fiber_2: 1, v_sap: 1 }; const c0 = s.wallet.credits;
  const r = sellCard(s, 'n_fiber_2');
  ok(r.credits === cardPrice('n_fiber_2') && s.wallet.credits === c0 + r.credits && !s.cards.n_fiber_2, '팔면 돈 · 가방에서 빠짐');
  throws(() => sellCard(s, 'n_fiber_2'), '없는 카드 팔기', '가방에 그 카드가 없어요');
  sellCard(s, 'v_sap'); ok(s.wallet.credits === c0 + r.credits + 100, '변이 카드 100');
}
// ⑤ 한 식물에 같은 카드 한 장(강화 카드도 같은 카드)
{
  const s = game(), p = s.plants[0]; s.cards = { n_fiber: 1, n_fiber_2: 1, n_wall_2: 1 };
  const L = slotLayout(p), first = L.cards[0]; L.cards = ['n_fiber', 'n_fiber_2', null];
  throws(() => setSlots(s, p.uid, L), '처음 카드 + 강화 카드 함께', '한 장만');
  const L2 = slotLayout(p); L2.cards = ['n_fiber_2', 'n_wall_2', null];
  setSlots(s, p.uid, L2);
  ok(p.cards[0] === 'n_fiber_2' && p.cards[1] === 'n_wall_2' && s.cards.n_fiber === 1 && (!first || s.cards[first] >= 1), '다른 카드끼리는 강화 카드도 끼움 · 뺀 카드는 가방으로');
  const L3 = slotLayout(p); L3.cards = ['n_fiber', 'n_wall_2', null]; setSlots(s, p.uid, L3);
  ok(p.cards[0] === 'n_fiber' && s.cards.n_fiber_2 === 1, '+1 → 처음 카드로 바꿔 끼우기(바꾼 칸)');
}
// ⑥ 전투에 닿는지
{
  const s = game(), p = s.plants[0]; p.stage = 2; p.lv = LV_MAX; p.up = { ...(p.up || {}), atk: 40 };   // 공격이 커야 % 차이가 반올림에 묻히지 않음
  p.cards = ['n_fiber', null, null]; const a = unitOf('me', p).atk;
  p.cards = ['n_fiber_2', null, null]; const b = unitOf('me', p).atk;
  p.cards = ['n_fiber_3', null, null]; const c = unitOf('me', p).atk;
  ok(a < b && b < c, `공격 +6% → +8% → +10%: ${a} < ${b} < ${c}`);
  p.cards = ['n_target_3', null, null]; const u = unitOf('me', p); p.cards = [null, null, null];
  ok(u.crit === unitOf('me', p).crit + 18, '치명 +18');
}
// ⑦ 패시브 고르기 후보: 강화 카드는 안 나옴 · 끼운 카드(강화 카드 포함)는 그 처음 카드도 빠짐
{
  let bad = 0;
  for (let i = 0; i < 40; i++) {
    const s = game(20 + i), p = s.plants[0]; p.cards = ['n_fiber_2', 'n_wall_3', null]; p.lv = LV_MAX;
    evolve(s, p.uid, makeRng(i));
    for (const d of p.drafts || []) if (d.part === 'passive') for (const id of d.cands) if (CARDS[id].base || ['n_fiber', 'n_wall'].includes(id)) bad++;
  }
  ok(!bad, '패시브 고르기 후보에 강화 카드 · 끼운 카드의 처음 카드 없음: ' + bad);
}
// ⑧ 쿠폰 · 서버 일 목록
{
  const s = game(), p = s.plants[0]; s.items.pack_n = 0;
  const got = couponGive(s, { cards: ['normal', 'mut', 'n_balance_2'] }, makeRng(1));
  ok(s.items.pack_n === 1 && s.items.pack_m === 1 && s.cards.n_balance_2 === 1 && got.some(g => g.kind === 'pack_m') && got.some(g => g.kind === 'card' && g.card === 'n_balance_2'), '쿠폰: normal · mut = 꾸러미 · 카드 id = 그 카드');
  const ctx = { rng: makeRng(4), now: 0 };
  const r = runOp(s, 'openPack', { id: p.uid, part: 'passive' }, ctx);
  ok(r.card && s.items.pack_n === 0, '서버 일: openPack');
  s.cards.n_vacuole = 2; s.wallet.credits = 500;
  ok(runOp(s, 'cardUp', { card: 'n_vacuole' }, ctx).to === 'n_vacuole_2', '서버 일: cardUp');
  ok(runOp(s, 'sellCard', { card: 'n_vacuole_2' }, ctx).credits === cardPrice('n_vacuole_2'), '서버 일: sellCard');
  try { runOp(s, 'openPack', { id: p.uid, part: 'skill' }, ctx); ok(false, 'openPack 일반 식물 skill 막혀야 함'); } catch (e) { ok(e instanceof Err, 'ops openPack skill 막힘'); }
}
console.log(fails ? `카드 꾸러미 · 강화 시험 실패 ${fails}/${n}` : `카드 꾸러미 · 강화 시험 ${n}개 통과`);
process.exit(fails ? 1 : 0);
