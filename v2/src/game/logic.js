// 풀로세움 v2 게임 규칙(서버·화면 공용, 순수 함수 — 시각 now·난수 rng를 밖에서 받음). 서버가 이 규칙으로만 진행을 바꿈(치트 방지 — 2026-06-26 서버 권위 설계).
// 표 = catalog.js. 모든 함수는 state를 그 자리에서 바꾸고 화면에 보여 줄 결과를 돌려줌. 안 되는 일은 Err(사용자에게 보일 한국어 문구)를 던짐.
import {
  SPECIES, SKILLS, STAGES, LV_MAX, growNeed, FEED, PTS_PER_LV, IV_KEYS, IV_MAX, UP_GAIN, STAGE_MUL, upCost, resetCost, starsOf,
  uniqueOf, uniquesOf, bloomPool, canGraft, userNeed, XP, farmSlots, levelReward, HARVEST, harvestMax, HARVEST_TABLE, PLANETS, ORBIT_LV, FUEL,
  SHINY_P, LEGEND_P, TRAIT_P, SHOP, SELL_BASE, STARTERS, ITEMS, STORE_MAX, PROBE, probeUpCost, EXPLORE_COST,
  LEAGUES, LEAGUE_KEYS, TIERS, seasonOf, seasonReward, FORM_KEYS, MUT_P } from './catalog.js';
import { CARDS, CARD_SLOTS, cardFits, rollCard, formCards, isSkillCard } from './cards.js';

export class Err extends Error {}
const need = (c, msg) => { if (!c) throw new Err(msg); };
const pickW = (rng, list) => { const tot = list.reduce((a, x) => a + x.w, 0); let r = rng() * tot; for (const x of list) { r -= x.w; if (r <= 0) return x; } return list[list.length - 1]; };
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const uid = s => 'u' + (s.uidN = (s.uidN || 0) + 1).toString(36);
const MIN = 60000;

// ── 새 계정 ──
export function newGame({ nickname, starter }, rng, now) {
  need(STARTERS.includes(starter), '처음 식물을 골라 주세요');
  const s = {
    v: 1, uidN: 0, created: now,
    user: { level: 1, xp: 0 },
    profile: { name: nickname, title: '초보 재배사', avatar: starter, color: 0 },
    titles: ['초보 재배사'],
    wallet: { credits: 200, gems: 20 },
    items: { water: 6, fert: 2, regress: 0, fuel: FUEL.max, parts: 0 }, fuelT: now,
    scions: [], seeds: [], plants: [], storage: [], active: 0, team: [], mode: 'tournament',
    tournament: { tier: '브론즈', name: '새싹 브론즈', round: '예선', wins: 0, losses: 0, bestOf: 5, pts: 0 },
    swap3: { wins: 0, losses: 0 }, pvp: { wins: 0, losses: 0 },
    discovered: [], pending: [], ship: { model: null }, cards: {}, cardsV: 1,
  };
  s.plants.push(makePlant(s, { key: starter }, rng, now));
  for (let i = 0; i < 2; i++) s.seeds.push(seedOf(s, rollSpecies(rng, 'common'), rng));
  s.plants[0].cards[0] = rollCard(rng, 'normal');   // 처음 식물 = 일반 카드 한 장(카드 칸이 있다는 걸 바로 보게 — 2026-10-17)
  s.league = 'sprout'; leaguesOf(s); seasonSync(s, now);
  return s;
}

// ── 식물 ──
export function makePlant(s, seed, rng, now) {
  const sp = SPECIES[seed.key];
  need(sp, '모르는 식물');
  // 개체값: 탐사 종자는 ivk번 더 굴려 가장 좋은 값(행성 생기 + 종자 보관함 — 2026-10-16 사용자 "얻어온 종자의 개체값이 좋을 확률이 증가"), 그 밖은 한 번
  const roll = () => { let b = 0; for (let i = 0; i <= (seed.ivk || 0); i++) b = Math.max(b, Math.floor(rng() * (IV_MAX + 1))); return b; };
  const ivs = Object.fromEntries(IV_KEYS.map(k => [k, roll()]));
  if (seed.legend) for (const k of IV_KEYS) ivs[k] = Math.max(ivs[k], 7);
  const p = {
    uid: uid(s), key: seed.key, name: (seed.legend ? '전설의 ' : '') + sp.name, stage: 0, lv: 1, gxp: 0, ivs,
    shiny: !!seed.shiny, legend: !!seed.legend, trait: seed.trait || null, form: seed.form || sp.form || null,
    pts: 0, up: {}, spent: 0, invest: 0, pot: 'pot_terra', born: now,
    skills: { battle: [null, null, null, null, null, null], joker: null, forgot: [], learned: [], v4: 1, v6: 1 }, pend: [],
    hv: { t0: now, have: 0 },
  };
  // 처음 기술 = 어린 개성 기술 + 하급 공통 하나(속성 · 종 중), 남은 전투 칸 = 기본기 셋(여섯째 칸은 비어 있음 — 변이 식물은 그 변이 기술 카드)
  learnNow(p, uniqueOf(p.key, 0));
  const c1 = bloomPool(p.key, 0).filter(x => !uniquesOf(p.key, 0).includes(x.id));
  if (c1.length) learnNow(p, pickW(rng, c1).id);
  fillBasics(p);
  // 카드 칸 둘(2026-10-17): 변이 식물은 처음 필 때 그 변이 카드 둘 — 기술 카드 하나는 전투 칸(빈 칸)에, 패시브 하나는 카드 칸에
  p.cards = [null, null];
  if (p.form) {
    const fc = formCards(p.form), sk = pick(rng, fc.filter(isSkillCard)), b = p.skills.battle;
    p.cards = [pick(rng, fc.filter(id => !isSkillCard(id))), null];
    const i = b.indexOf(null) >= 0 ? b.indexOf(null) : b.lastIndexOf('evade');
    if (i >= 0) b[i] = sk;
  }
  if (!s.discovered.includes(p.key)) s.discovered.push(p.key);
  return p;
}
// 기술 칸(2026-10-16 사용자 "총 전투에 들고가는 스킬은 4개이며, 기본 스킬은 조커처럼 항상 빼고 넣고 가능(버릴 수 없음)" · "기본스킬 3개도 바꿀 수 있게"
//  → 2026-10-17 "스킬 4개인 거 재미없어 — 6개 들고 갈 수 있게 · 변이는 6개 중 2개를 변이 스킬 카드로"):
//  battle = 전투에 들고 가는 여섯(배운 기술 · 기본기 · 변이 식물은 그 변이 기술 카드 MUT_MAX 장까지) · joker = 배운 기술 하나 보관 · 기본기 셋은 늘 앎(지울 수 없음 — 전투 칸에 없으면 보관에 있는 셈)
export const BASIC_IDS = ['basic', 'guard', 'evade'], LOADOUT = 6, MUT_MAX = 2;
const isBasic = id => BASIC_IDS.includes(id);
function fillBasics(p) { const b = p.skills.battle, left = BASIC_IDS.filter(id => !b.includes(id)); for (let i = 0; i < b.length; i++) if (!b[i] && left.length) b[i] = left.shift(); }
// 옛 세이브 맞추기(한 번씩 — 그 뒤 비운 칸은 그대로):
//  가장 옛 판(전투 3칸 + 기본기 셋은 늘 손패) → 넷(빈 칸 · 넷째 칸 = 기본기) →
//  v4(전투 넷) → v6(여섯): 늘어난 두 칸 = 카드 칸의 그 변이 기술 카드(전엔 손패 뒤에 붙던 것) → 보관 칸의 배운 기술 → 빠진 기본기 순.
//  전투 칸 기술 카드가 MUT_MAX 장을 넘거나 카드 칸에 남은 기술 카드는 normCards 가 가방으로
export function normSkills(p) {
  const S = p && p.skills; if (!S) return p;
  if (!S.v4) {
    const b = (Array.isArray(S.battle) ? S.battle : []).slice(0, 4);
    while (b.length < 4) b.push(null);
    S.battle = b; fillBasics(p); S.v4 = 1;
  }
  if (!S.v6) {
    const b = S.battle.slice(0, 4), add = [];
    while (b.length < 4) b.push(null);
    let room = MUT_MAX - b.filter(isSkillCard).length;
    if (p.form && Array.isArray(p.cards)) p.cards.forEach((id, i) => {
      if (room > 0 && add.length < 2 && isSkillCard(id) && CARDS[id].form === p.form && !b.includes(id) && !add.includes(id)) { add.push(id); p.cards[i] = null; room--; }
    });
    if (add.length < 2 && S.joker) { add.push(S.joker); S.joker = null; }
    for (const id of BASIC_IDS) if (add.length < 2 && !b.includes(id)) add.push(id);
    while (add.length < 2) add.push(null);
    S.battle = [...b, ...add]; S.v6 = 1;
  }
  return p;
}
const known = p => new Set([...p.skills.battle.filter(x => x && !isBasic(x)), p.skills.joker, ...p.skills.forgot, ...p.pend].filter(Boolean));
// 새 기술 놓기: 빈 전투 칸 → 전투 칸의 기본기 자리(기본기는 보관으로 — 회피 · 방어 · 평타 순) → 빈 조커 칸 → 다 차면 '고르기 대기'(pend — 화면이 무엇을 지울지 물음)
function learnNow(p, id) {
  normSkills(p);
  const b = p.skills.battle, i = b.indexOf(null);
  if (!p.skills.learned.includes(id)) p.skills.learned.push(id);
  if (i >= 0) { b[i] = id; return 'battle'; }
  const bi = ['evade', 'guard', 'basic'].map(x => b.indexOf(x)).find(k => k >= 0);
  if (bi != null && b.filter(x => x && !isBasic(x)).length < LOADOUT - 1) { b[bi] = id; return 'battle'; }   // 기본기를 하나는 남김(배운 기술만 넷이면 보관으로)
  if (!p.skills.joker) { p.skills.joker = id; return 'joker'; }
  p.pend.push(id); return 'pend';
}
export const findPlant = (s, id) => s.plants.find(p => p.uid === id) || null;

// ── 카드(2026-10-17 — 표 = cards.js): 가방 s.cards = { id: 장 수 } · 식물 p.cards = 카드 칸 둘 · 태생 변이는 전투 칸에도 그 변이의 기술 카드 ──
const addCard = (s, id, n = 1) => { s.cards[id] = (s.cards[id] || 0) + n; };
const tally = list => { const o = {}; for (const x of list) if (x) o[x] = (o[x] || 0) + 1; return o; };
const cardsOn = p => [...(p.cards || []), ...((p.skills && p.skills.battle) || []).filter(isSkillCard)].filter(Boolean);
// 식물이 떠날 때(팔기 · 해체 · 거름) 끼운 카드는 가방으로
const releaseCards = (s, p) => { for (const id of cardsOn(p)) if (CARDS[id]) addCard(s, id); };
export const formsOwned = s => [...new Set([...s.plants, ...(s.storage || [])].map(p => p.form).filter(Boolean))];
const OLD_MUT = { predator: ['m_bite', 'm_devour', 'm_hunt'], weapon: ['m_slash', 'm_shot', 'm_smash'], toxic: ['m_spit', 'm_acid', 'm_miasma'], spore: ['m_puff', 'm_sleep', 'm_bloom'], dragon: ['m_breath', 'm_scale', 'm_roar'] };
// 옛 세이브 맞추기: 카드 칸 · 가방 · 옛 변이 칸 둘(p.skills.mut — 2026-10-16) → 카드 칸(끼워 둔 기술은 그대로, 그 변이의 나머지 옛 기술은 카드로 가방에 — 잃는 것 없게)
export function normCards(s) {
  if (!s.cards || typeof s.cards !== 'object' || Array.isArray(s.cards)) s.cards = {};
  for (const p of [...(s.plants || []), ...(s.storage || [])]) {
    if (!Array.isArray(p.cards)) p.cards = [null, null];
    while (p.cards.length < CARD_SLOTS) p.cards.push(null);
    const S = p.skills;
    if (S && Array.isArray(S.mut)) {
      const m = S.mut.filter(id => id && SKILLS[id] && SKILLS[id].form === p.form).slice(0, CARD_SLOTS);
      m.forEach((id, i) => { if (!p.cards[i]) p.cards[i] = id; else addCard(s, id); });
      for (const id of OLD_MUT[p.form] || []) if (!m.includes(id)) addCard(s, id);
      delete S.mut;
    }
    // 전투 칸 여섯(2026-10-17): 카드 칸 = 패시브만 — 카드 칸에 남은 그 변이 기술 카드는 전투 칸(빈 칸 → 기본기 자리)으로, 못 들어가거나 안 맞으면 가방 ·
    //  전투 칸 기술 카드는 그 변이 것 MUT_MAX 장까지(넘거나 안 맞으면 가방, 그 자리는 빠진 기본기)
    if (S && S.v6) {
      let n = 0;
      S.battle.forEach((id, i) => {
        if (!isSkillCard(id)) return;
        if (CARDS[id].form === p.form && n < MUT_MAX && S.battle.indexOf(id) === i) { n++; return; }
        addCard(s, id); S.battle[i] = BASIC_IDS.find(x => !S.battle.includes(x)) || null;
      });
      p.cards.forEach((id, i) => {
        if (!isSkillCard(id)) return;
        p.cards[i] = null;
        const at = S.battle.indexOf(null) >= 0 ? S.battle.indexOf(null) : ['evade', 'guard', 'basic'].map(x => S.battle.indexOf(x)).find(k => k >= 0) ?? -1;
        if (CARDS[id].form === p.form && n < MUT_MAX && at >= 0 && !S.battle.includes(id)) { S.battle[at] = id; n++; }
        else addCard(s, id);
      });
    }
  }
  if (!s.cardsV) { s.cardsV = 1; addCard(s, 'n_wall'); }   // 카드가 생기기 전부터 하던 사람 = 일반 카드 한 장(새 계정은 처음 식물에 한 장)
  return s;
}
// 전투 칸 여섯 + 카드 칸 둘을 한 번에 정하기(화면이 새 배열을 보냄 — 끼우기 · 빼기 · 자리 바꾸기 모두):
//  카드 칸 = 맞는 패시브 카드(일반 식물 = 일반 카드 · 변이 식물 = 그 변이 패시브) · 전투 칸의 카드 = 변이 식물의 그 변이 기술 카드 MUT_MAX 장까지 · 한 식물에 같은 것 두 번 없이 ·
//  새로 끼운 카드는 가방에서 빠지고 뺀 카드는 가방으로 · 배운 기술 · 기본기 규칙은 전과 같음(뺀 배운 기술은 보관 한 칸에만)
export function setSlots(s, id, battle, cards) {
  const p = getPlant(s, id); normSkills(p); normCards(s);
  need(Array.isArray(battle) && battle.length === LOADOUT, '전투 칸은 여섯이에요');
  need(Array.isArray(cards) && cards.length === CARD_SLOTS, '카드 칸은 둘이에요');
  const B = battle.map(x => (x == null || x === '' ? null : String(x))), C = cards.map(x => (x == null || x === '' ? null : String(x)));
  for (const x of C) if (x) { need(!isSkillCard(x), '기술 카드는 전투 칸에 넣어요'); const why = cardFits(p, x); need(!why, why); }
  for (const x of B) if (isSkillCard(x)) { need(!!p.form, '기술 카드는 변이 식물만 넣어요'); const why = cardFits(p, x); need(!why, why); }
  need(B.filter(isSkillCard).length <= MUT_MAX, `변이 기술 카드는 전투 칸에 ${MUT_MAX}장까지예요`);
  const all = [...B, ...C].filter(Boolean);
  need(new Set(all).size === all.length, '같은 것을 두 칸에 둘 수 없어요');
  const learned = new Set([...p.skills.battle, p.skills.joker].filter(x => x && !isBasic(x) && !isSkillCard(x))), plain = B.filter(x => x && !isSkillCard(x));
  for (const x of plain) need(isBasic(x) || learned.has(x), '모르는 기술이에요');
  const left = [...learned].filter(x => !plain.includes(x));
  need(left.length <= 1, '보관 칸은 하나예요 — 배운 기술은 하나만 뺄 수 있어요');
  need(B.some(Boolean), '전투 칸에 기술이 하나는 있어야 해요');
  const before = tally(cardsOn(p)), after = tally([...B.filter(isSkillCard), ...C]);
  for (const [k, n] of Object.entries(after)) { const add = n - (before[k] || 0); if (add > 0) need((s.cards[k] || 0) >= add, `${CARDS[k].name} 카드가 가방에 없어요`); }
  for (const [k, n] of Object.entries(after)) { const add = n - (before[k] || 0); if (add > 0) { s.cards[k] -= add; if (s.cards[k] <= 0) delete s.cards[k]; } }
  for (const [k, n] of Object.entries(before)) { const back = n - (after[k] || 0); if (back > 0) addCard(s, k, back); }
  p.skills.battle = B; p.skills.joker = left[0] || null; p.cards = C;
  return {};
}
export function setCards(s, id, cards) { const p = getPlant(s, id); normSkills(p); return setSlots(s, id, p.skills.battle, cards); }
const getPlant = (s, id) => { const p = findPlant(s, id); need(p, '그 식물이 스마트팜에 없어요'); return p; };

// 능력치(전투에 들어가는 값): 기본 × 단계 × (1 + 개체값%) + 강화
export function plantStats(p) {
  const b = SPECIES[p.key].base, m = STAGE_MUL[p.stage], iv = k => 1 + (p.ivs[k] || 0) / 100, up = k => (p.up[k] || 0) * UP_GAIN[k];
  return {
    hp: Math.round(b.hp * m * iv('hp')) + up('hp'), atk: Math.round(b.atk * m * iv('atk')) + up('atk'), def: Math.round(b.def * m * iv('def')) + up('def'),
    spd: Math.round(b.spd * iv('spd')) + up('spd'), acc: b.acc + up('acc'), crit: b.crit + up('crit'),
  };
}
export const stars = p => starsOf(p.ivs);
export const growPct = p => (p.lv >= LV_MAX ? 1 : p.gxp / growNeed(p.stage, p.lv));

// 물·비료 주기(사용자 "생장은 물과 비료로만") — 레벨업마다 강화 포인트 2, Lv6이면 진화 단추
export function feed(s, id, kind, n = 1) {
  const p = getPlant(s, id);
  need(kind === 'water' || kind === 'fert', '물이나 비료만 줄 수 있어요');
  need((s.items[kind] || 0) >= n && n >= 1, kind === 'water' ? '물이 모자라요' : '비료가 모자라요');
  need(p.lv < LV_MAX, p.stage < 2 ? 'Lv6이에요 — 진화하면 더 자라요' : '다 자랐어요');
  const ups = [];
  let used = 0;
  for (; used < n && p.lv < LV_MAX; used++) {
    p.gxp += FEED[kind]; p.invest += kind === 'fert' ? 6 : 2;
    while (p.lv < LV_MAX && p.gxp >= growNeed(p.stage, p.lv)) {
      p.gxp -= growNeed(p.stage, p.lv); p.lv++; p.pts += PTS_PER_LV;
      const r = { lv: p.lv, pts: PTS_PER_LV };
      if (p.lv === 3) r.harvest = 1;
      if (p.lv === LV_MAX) { r.box = { water: 2, fert: 1, credits: 40 + 30 * p.stage }; give(s, r.box); }
      ups.push(r);
    }
    if (p.lv >= LV_MAX) p.gxp = 0;
  }
  s.items[kind] -= used;
  return { used, ups };
}
// 진화(Lv6에서 단추) — 다음 단계 Lv1, 기술 1~2개가 핌(상급은 미리 안 보임 — 무작위)
export function evolve(s, id, rng) {
  const p = getPlant(s, id);
  need(p.lv >= LV_MAX && p.stage < 2, p.stage >= 2 ? '이미 다 자랐어요' : 'Lv6이 되어야 진화해요');
  p.stage++; p.lv = 1; p.gxp = 0;
  const have = known(p), pool = bloomPool(p.key, p.stage).filter(x => !have.has(x.id)), n = rng() < 0.4 ? 2 : 1, got = [];
  for (let i = 0; i < n && pool.length; i++) { const x = pickW(rng, pool); pool.splice(pool.indexOf(x), 1); got.push({ id: x.id, to: learnNow(p, x.id) }); }
  const xp = addXp(s, XP.evolve, rng);
  return { stage: p.stage, got, xp };
}
// 꽉 찬 칸 정리: 기다리는 새 기술을 전투 칸(b0~b3)·조커에 놓고 원래 기술은 '지운 기술'로(기본기 자리였으면 기본기는 그냥 보관), 또는 새 기술을 안 배움(skip — 지운 기술로)
export function placePending(s, id, skill, target) {
  const p = getPlant(s, id), i = p.pend.indexOf(skill);
  normSkills(p);
  need(i >= 0, '기다리는 기술이 아니에요');
  const slot = target === 'joker' ? 'joker' : target === 'skip' ? 'skip' : +String(target).replace('b', '');
  need(slot === 'joker' || slot === 'skip' || (slot >= 0 && slot < LOADOUT), '놓을 칸을 골라 주세요');
  p.pend.splice(i, 1);
  if (slot === 'skip') { p.skills.forgot.push(skill); return { forgot: skill }; }
  const old = slot === 'joker' ? p.skills.joker : p.skills.battle[slot];
  if (slot === 'joker') p.skills.joker = skill; else p.skills.battle[slot] = skill;
  if (isSkillCard(old)) { normCards(s); addCard(s, old); return { forgot: null, card: old }; }   // 태생 변이 전투 칸의 카드 = 가방으로
  if (old && !isBasic(old)) { p.skills.forgot.push(old); return { forgot: old }; }
  return { forgot: null };
}
// 전투 칸 넷 정하기(화면이 새 배열을 보냄): 배운 기술 · 기본기 셋 중에서, 같은 것 두 번 없이 · 전투 칸에서 뺀 배운 기술은 조커(보관) 한 칸에만 — 기본기는 빼도 늘 앎
export function setLoadout(s, id, list) {
  const p = getPlant(s, id); normCards(s);
  return setSlots(s, id, list, p.cards);   // 카드 칸은 그대로(태생 변이의 전투 칸 카드도 이 규칙으로 — 2026-10-17)
}
// 전투 칸 ↔ 조커 자리 바꾸기(옛 화면용 — 기본기 자리면 기본기는 보관으로)
export function swapJoker(s, id, slot) {
  const p = getPlant(s, id); normSkills(p);
  const b = p.skills.battle;
  need(slot >= 0 && slot < LOADOUT, '칸을 골라 주세요');
  const out = b[slot]; b[slot] = p.skills.joker; p.skills.joker = out && !isBasic(out) && !isSkillCard(out) ? out : null;
  if (isSkillCard(out)) { normCards(s); addCard(s, out); }   // 카드는 보관 칸이 아니라 가방으로
  return {};
}
// 강화: 레벨업 포인트 + 돈(상한 없음 — 몰빵 가능), 리셋 = 돈
export function upgrade(s, id, stat, n = 1) {
  const p = getPlant(s, id);
  need(UP_GAIN[stat], '모르는 능력치');
  need(p.pts >= n && n >= 1, '강화 포인트가 모자라요 — 물·비료로 레벨을 올려요');
  let cost = 0;
  for (let i = 0; i < n; i++) cost += upCost(p.spent + i);
  need(s.wallet.credits >= cost, `돈이 모자라요(${cost})`);
  s.wallet.credits -= cost; p.pts -= n; p.spent += n; p.up[stat] = (p.up[stat] || 0) + n; p.invest += cost;
  return { cost };
}
export function resetPoints(s, id) {
  const p = getPlant(s, id), back = Object.values(p.up).reduce((a, b) => a + b, 0), cost = resetCost(p);
  need(back > 0, '되돌릴 강화가 없어요');
  need(s.wallet.credits >= cost, `돈이 모자라요(${cost})`);
  s.wallet.credits -= cost; p.pts += back; p.up = {}; p.spent = 0;
  return { cost, back };
}
// 거름(같은 식물을 먹여 고른 개체값 ↑ — 먹인 개체 별이 높을수록 많이)
export function merge(s, id, foodId, stat) {
  const p = getPlant(s, id);
  need(IV_KEYS.includes(stat), '올릴 개체값을 골라 주세요');
  need(id !== foodId, '자기 자신은 거름이 될 수 없어요');
  let food = s.plants.find(x => x.uid === foodId), from = s.plants;
  if (!food) { food = s.storage.find(x => x.uid === foodId); from = s.storage; }
  need(food && food.key === p.key, '같은 식물만 거름이 돼요');
  need((p.ivs[stat] || 0) < IV_MAX, '이미 최대예요');
  const add = 1 + Math.floor(starsOf(food.ivs) / 2), before = p.ivs[stat] || 0;
  p.ivs[stat] = Math.min(IV_MAX, before + add);
  from.splice(from.indexOf(food), 1);
  normCards(s); releaseCards(s, food);
  fixActive(s);
  return { stat, from: before, to: p.ivs[stat] };
}
// 접목(완제품 접목 가지 — 속성·종이 맞아야, 상급은 다 자란 식물만)
export function graft(s, id, scionId) {
  const p = getPlant(s, id), i = s.scions.findIndex(x => x.id === scionId);
  need(i >= 0, '그 접목 가지가 없어요');
  const sk = s.scions[i].skill, why = canGraft(p, sk);
  need(!why, why);
  need(!known(p).has(sk), '이미 아는 기술이에요');
  s.scions.splice(i, 1);
  return { skill: sk, to: learnNow(p, sk) };
}
// 유전자 회귀 주사(완제품): 지운 기술 하나를 되돌림
export function regress(s, id, skill) {
  const p = getPlant(s, id), i = p.skills.forgot.indexOf(skill);
  need(i >= 0, '지운 기술이 아니에요');
  need((s.items.regress || 0) >= 1, '유전자 회귀 주사가 없어요');
  normSkills(p);
  const b = p.skills.battle;
  need(b.includes(null) || b.some(isBasic) || !p.skills.joker, '칸이 다 찼어요 — 하나를 비우고 되돌려요');
  s.items.regress--; p.skills.forgot.splice(i, 1);
  return { skill, to: learnNow(p, skill) };
}
// 이름 · 화분 · 대표 식물 · 팀 · 전투 종류
export function rename(s, id, name) { const p = getPlant(s, id); const v = String(name || '').trim().slice(0, 10); need(v, '이름을 써 주세요'); p.name = v; return {}; }
export function setActive(s, i) { need(i >= 0 && i < s.plants.length, '없는 식물'); s.active = i; return {}; }
export function setTeam(s, team) { need(Array.isArray(team) && team.length === 3 && new Set(team).size === 3 && team.every(i => i >= 0 && i < s.plants.length), '서로 다른 식물 셋을 골라 주세요'); s.team = team; return {}; }
export function setMode(s, mode) { need(['tournament', 'swap3'].includes(mode), '모르는 전투 종류'); s.mode = mode; return {}; }
export function setProfile(s, o) {
  const pf = s.profile;
  if (o.name != null) { const v = String(o.name).trim().slice(0, 12); need(v, '이름을 써 주세요'); pf.name = v; }
  if (o.title != null) { need(s.titles.includes(o.title), '없는 칭호'); pf.title = o.title; }
  if (o.avatar != null) { need(s.discovered.includes(o.avatar), '만난 식물만 대표로'); pf.avatar = o.avatar; }
  if (o.color != null) pf.color = Math.max(0, Math.min(3, o.color | 0));
  return {};
}
const fixActive = s => { s.active = Math.max(0, Math.min(s.active, s.plants.length - 1)); s.team = (s.team || []).filter(i => i < s.plants.length); };

// ── 스마트팜 칸 · 동면 보관고 · 종자 심기 ──
export const freeSlots = s => farmSlots(s.user.level) - s.plants.length;
export function plantSeed(s, seedId, rng, now) {
  const i = s.seeds.findIndex(x => x.id === seedId);
  need(i >= 0, '그 종자가 없어요');
  need(freeSlots(s) > 0, '스마트팜 자리가 없어요 — 보관고로 옮기거나 재배사 레벨을 올려요');
  const seed = s.seeds.splice(i, 1)[0], p = makePlant(s, seed, rng, now);
  s.plants.push(p);
  const xp = addXp(s, XP.plant, rng);
  return { plant: p.uid, xp };
}
export function toStorage(s, id, now = 0) {
  const p = getPlant(s, id);
  need(s.plants.length > 1, '스마트팜에 하나는 남겨 둬요');
  need(s.storage.length < STORE_MAX, `보관고가 꽉 찼어요(${STORE_MAX})`);
  s.plants.splice(s.plants.indexOf(p), 1); p.slept = now; s.storage.push(p); fixActive(s);
  return {};
}
// 탐사선 모양(꾸미기 — 성능 차이 없음)
export function setShip(s, model) { need(Number.isInteger(model) && model >= 1 && model <= 9, '없는 모양'); s.ship = { ...(s.ship || {}), model }; return {}; }
export function fromStorage(s, id, now) {
  const i = s.storage.findIndex(x => x.uid === id);
  need(i >= 0, '보관고에 없어요');
  need(freeSlots(s) > 0, '스마트팜 자리가 없어요');
  const p = s.storage.splice(i, 1)[0]; p.hv = { t0: now, have: 0 }; delete p.slept; s.plants.push(p);
  return {};
}

// ── 수확(시간이 지나면 열매가 맺힘 — 돈·물·비료가 주로, 나머지는 드물게) ──
export function harvestSync(p, now) {
  const per = HARVEST.periodMin[p.stage] * MIN, max = harvestMax(p);
  if (p.hv.have >= max) { p.hv.t0 = now; return p.hv; }
  const k = Math.floor((now - p.hv.t0) / per);
  if (k > 0) { p.hv.have = Math.min(max, p.hv.have + k); p.hv.t0 = p.hv.have >= max ? now : p.hv.t0 + k * per; }
  return p.hv;
}
export const harvestGauge = (p, now) => { harvestSync(p, now); return p.hv.have >= harvestMax(p) ? 1 : (now - p.hv.t0) / (HARVEST.periodMin[p.stage] * MIN); };
function rollFruit(s, p, rng) {
  const e = pickW(rng, HARVEST_TABLE), lvK = 1 + 0.15 * p.stage + 0.03 * p.lv;
  if (e.kind === 'credits') return { kind: 'credits', n: Math.round((e.big ? 90 : 25) * lvK), rar: e.rar };
  if (e.kind === 'water') return { kind: 'water', n: 1 + (rng() < 0.3 ? 1 : 0), rar: e.rar };
  if (e.kind === 'fert') return { kind: 'fert', n: 1, rar: e.rar };
  if (e.kind === 'seed') return { kind: 'seed', seed: seedOf(s, p.key, rng), rar: e.rar };
  if (e.kind === 'scion') return { kind: 'scion', skill: rollScion(rng, p, 0.2), rar: e.rar };
  if (e.kind === 'regress') return { kind: 'regress', n: 1, rar: e.rar };
  return { kind: 'gems', n: 3, rar: e.rar };
}
export function harvest(s, id, rng, now) {
  const p = getPlant(s, id);
  harvestSync(p, now);
  need(p.hv.have > 0, '아직 맺힌 열매가 없어요');
  const got = [];
  for (let i = 0; i < p.hv.have; i++) got.push(rollFruit(s, p, rng));
  p.hv.have = 0; p.hv.t0 = now;
  for (const r of got) grant(s, r);
  const xp = addXp(s, XP.harvest * got.length, rng);
  return { got, xp };
}
export function harvestAll(s, rng, now) {
  const got = [];
  for (const p of s.plants) { harvestSync(p, now); for (let i = 0; i < p.hv.have; i++) got.push(rollFruit(s, p, rng)); if (p.hv.have) { p.hv.have = 0; p.hv.t0 = now; } }
  need(got.length, '아직 맺힌 열매가 없어요');
  for (const r of got) grant(s, r);
  const xp = addXp(s, XP.harvest * got.length, rng);
  return { got, xp };
}

// ── 보상 주기 ──
function give(s, r) {
  for (const k of ['credits', 'gems']) if (r[k]) s.wallet[k] += r[k];
  for (const k of ['water', 'fert', 'regress', 'fuel', 'parts']) if (r[k]) s.items[k] = (s.items[k] || 0) + r[k];
}
function grant(s, r) {
  if (r.kind === 'credits' || r.kind === 'gems') s.wallet[r.kind] += r.n;
  else if (r.kind === 'water' || r.kind === 'fert' || r.kind === 'regress' || r.kind === 'fuel' || r.kind === 'parts') s.items[r.kind] = (s.items[r.kind] || 0) + r.n;
  else if (r.kind === 'seed') s.seeds.push(r.seed);
  else if (r.kind === 'scion') s.scions.push({ id: uid(s), skill: r.skill });
  else if (r.kind === 'card') { normCards(s); addCard(s, r.card); }
}
export function rollSpecies(rng, rarity, pool) {
  const keys = (pool || Object.keys(SPECIES)).filter(k => !rarity || SPECIES[k].rarity === rarity);
  return pick(rng, keys.length ? keys : Object.keys(SPECIES));
}
export function seedOf(s, key, rng, o = {}) {
  const shiny = o.shiny ?? rng() < SHINY_P, legend = !!o.legend, t = rng();
  const sd = { id: uid(s), key, shiny, legend, trait: t < TRAIT_P / 2 ? 'fruity' : t < TRAIT_P ? 'ornamental' : null };
  if (o.ivk > 0) sd.ivk = o.ivk;   // 심을 때 개체값을 이만큼 더 굴림(탐사 종자)
  // 변이: 변이 고정 종은 늘 그 변이, 탐사 종자(o.mut = 지역 배율)는 가끔 — 버섯 = 포자, 그 밖 = 포식 · 무기 · 독성 · 용족
  if (SPECIES[key].form) sd.form = SPECIES[key].form;
  else if (o.mut > 0 && rng() < MUT_P * o.mut) { const fs = formsFor(key); sd.form = fs[Math.floor(rng() * fs.length)]; }
  return sd;
}
export const formsFor = key => (SPECIES[key] && SPECIES[key].type === 'mushroom' ? ['spore'] : FORM_KEYS.filter(k => k !== 'spore'));
// 접목 가지 굴리기 — q(0~1) = 투자·단계가 높을수록 상급·특수 확률 ↑
export function rollScion(rng, p, q) {
  const sp = SPECIES[p.key], fit = Object.values(SKILLS).filter(x => x.tier !== 'u' && (x.tier === 's' || x.el === sp.el || x.jong === sp.type || (x.tier === 'g' && x.branch === sp.branch)));
  const w = x => ({ c1: 6 - 3 * q, c2: 3 + q, c3: 0.6 + 3 * q, g: 1 + q, s: 0.2 + 1.2 * q })[x.tier] || 0;
  return pickW(rng, fit.map(x => ({ id: x.id, w: w(x) }))).id;
}

// ── 암시장(컨셉) = 판매(무조건 돈, 적게) · 해체(무작위 접목 가지 등 — 많이 키울수록 좋은 것 확률 ↑) ──
export function sellPrice(p) {
  const b = SELL_BASE[SPECIES[p.key].rarity] || 40, k = (1 + 0.5 * p.stage) * (p.legend ? 5 : p.shiny || p.trait === 'ornamental' ? 3 : 1);
  return Math.round(b * k + 0.25 * p.invest);
}
const takePlant = (s, id) => {
  let i = s.plants.findIndex(x => x.uid === id);
  normCards(s);
  if (i >= 0) { need(s.plants.length > 1, '스마트팜에 하나는 남겨 둬요'); const p = s.plants.splice(i, 1)[0]; fixActive(s); releaseCards(s, p); return p; }
  i = s.storage.findIndex(x => x.uid === id); need(i >= 0, '그 식물이 없어요');
  const p = s.storage.splice(i, 1)[0]; releaseCards(s, p); return p;
};
// 처음 안내 봤음(화면 이름 — 화면이 처음 열릴 때 한 번만 뜨게, 기기를 바꿔도). 이름 모양 · 개수 제한
export function seeGuide(s, id) {
  need(/^[a-z0-9_]{1,16}$/.test(id), '잘못된 요청이에요');
  s.guide = s.guide && typeof s.guide === 'object' ? s.guide : {};
  need(s.guide[id] || Object.keys(s.guide).length < 40, '잘못된 요청이에요');
  s.guide[id] = 1;
  return { id };
}
export function sell(s, id) {
  const p = takePlant(s, id), n = sellPrice(p);
  s.wallet.credits += n;
  return { credits: n, name: p.name };
}
// 종자 팔기(돈 출처 — 사용자 2026-10-16 "판매-씨앗, 키운 식물, 주운 물건")
export const seedPrice = sd => Math.round((SELL_BASE[SPECIES[sd.key].rarity] || 40) * 0.5 * (sd.legend ? 8 : sd.shiny ? 4 : 1) * (sd.trait ? 1.5 : 1));
export function sellSeed(s, seedId) {
  const i = s.seeds.findIndex(x => x.id === seedId);
  need(i >= 0, '그 종자가 없어요');
  const sd = s.seeds.splice(i, 1)[0], n = seedPrice(sd);
  s.wallet.credits += n;
  return { credits: n, key: sd.key };
}
export function dismantle(s, id, rng) {
  const p = takePlant(s, id), q = Math.min(1, p.invest / 1500 + 0.25 * p.stage + (p.lv - 1) * 0.03), got = [];
  const n = 1 + p.stage + (p.lv >= 4 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const r = rng();
    if (r < 0.7) got.push({ kind: 'scion', skill: rollScion(rng, p, q), rar: 3 });
    else if (r < 0.8 + 0.05 * q) got.push({ kind: 'regress', n: 1, rar: 4 });
    else got.push({ kind: rng() < 0.5 ? 'water' : 'fert', n: 2, rar: 1 });
  }
  if (rng() < (p.form ? 0.5 : 0.25)) { const c = rollCard(rng, p.form || 'normal'); got.push({ kind: 'card', card: c, rar: CARDS[c].rar }); }   // 카드(2026-10-17)
  for (const r of got) grant(s, r);
  return { got, name: p.name };
}

// ── 탐사(모선에서 탐사선이 다녀옴 — 연료 캡슐 1 + 탐사비, 2026-10-16 개편) ──
export function fuelSync(s, now) {
  const per = FUEL.regenMin * MIN;
  if (s.items.fuel >= FUEL.max) { s.fuelT = now; return s.items.fuel; }
  const k = Math.floor((now - s.fuelT) / per);
  if (k > 0) { s.items.fuel = Math.min(FUEL.max, s.items.fuel + k); s.fuelT = s.items.fuel >= FUEL.max ? now : s.fuelT + k * per; }
  return s.items.fuel;
}
export const planetOpen = (s, pl) => s.user.level >= ORBIT_LV[pl.orbit];
// 시간으로 차는 것(연료 · 열매)을 지금 시각으로 맞춤 — 서버가 상태를 돌려주기 전에
export function syncTimers(s, now) { fuelSync(s, now); for (const p of s.plants) { harvestSync(p, now); normSkills(p); } for (const p of s.storage || []) normSkills(p); normCards(s); seasonSync(s, now); return s; }
// 탐사선(옛 세이브엔 없음 → 처음 부를 때 1단계로) — 옛 세이브의 내구도(dur)는 이제 안 씀(2026-10-16 없앰)
export function probeOf(s) {
  if (!s.probe) s.probe = { lv: Object.fromEntries(Object.keys(PROBE).map(k => [k, 1])) };
  for (const k of Object.keys(PROBE)) if (!s.probe.lv[k]) s.probe.lv[k] = 1;
  if (s.items.parts == null) s.items.parts = 0;
  return s.probe;
}
// 이번 탐사의 필수 · 권장 단계와 성공 확률(화면이 미리 보여 줌 — 같은 계산)
//  2026-10-16 사용자 "탐사선 스펙 = 딱 여행 갈 수 있는 기준선과 그에 준하는 확률 높이기 스펙 · 숫자로 복잡하게 말고 전부 레벨로 · 권장 레벨 쓰고 · 다른 게 미달이어도 필수 스펙만 갖추면 갈 수 있게":
//  필수(모자라면 못 감) = 연료 탱크 ≥ 궤도 · 탐사 장치 ≥ 지역 단계 / 권장 = 내구성 — 지역 위험 + 먼 궤도 + 위험한 곳에선 짐(탐사 장치 + 채집기)이 무거우면 +1(사용자 "실패 리스크는 보상 관련 스펙과도 연결, 특히 내구성에")
//  성공 = 권장을 채우면 95% · 한 단계 모자랄 때마다 −20%p(가장 낮아도 30%). 내구도(닳고 고치기)는 없앰
//  region = 지역 id(또는 regionOf 결과) · gem = 보상 칸 하나가 귀한 것(접목 가지 · 회귀 주사 · 보석 · 카드)일 확률
export function exploreOdds(s, pl, region) {
  const P = probeOf(s), V = P.lv, load = (V.scanner - 1) + (V.cargo - 1), Z = regionOf(pl, region && typeof region === 'object' ? region.id : region), hz = Z.hazard;
  const hull = Math.max(1, Math.min(PROBE.hull.max, 1 + hz + Math.floor((pl.orbit - 1) / 2) + (hz >= 1 && load >= 5 ? 1 : 0))), short = Math.max(0, hull - V.hull);
  const W = lootW(Z, (V.scanner - 1) / 4), gem = W.slice(4).reduce((a, x) => a + x.w, 0) / W.reduce((a, x) => a + x.w, 0);
  return { ok: Math.max(0.3, 0.95 - 0.2 * short), req: { tank: pl.orbit, scanner: Z.need }, rec: { hull }, short, load, cost: EXPLORE_COST[pl.orbit], gem };
}
// 지역(catalog REGIONS — 탐사 장치 단계로 하나씩 열림): 행성 값에 지역 값을 얹어 돌려줌(위험 0~3 · 생기 0~2 안으로)
//  id가 없거나 모르면 첫 지역 = 행성 값 그대로(옛 화면 · 옛 요청도 같은 확률 · 보상)
export function regionOf(pl, id) {
  const rs = pl.regions || [], R = (id && rs.find(r => r.id === id)) || rs[0] || { id: 'base', name: pl.name, need: 1 };
  return { ...pl, ...R, planet: pl.id, need: R.need || 1, hazard: Math.max(0, Math.min(3, (pl.hazard || 0) + (R.dh || 0))), vital: Math.max(0, Math.min(2, (pl.vital || 0) + (R.dv || 0))), kind: R.kind || pl.kind, pool: R.pool || pl.pool, rare: R.rare || 1, mut: R.mut || 1 };
}
export function explore(s, planetId, rng, now, regionId) {
  const pl = PLANETS.find(x => x.id === planetId);
  need(pl, '모르는 행성');
  need(planetOpen(s, pl), `재배사 Lv${ORBIT_LV[pl.orbit]}부터 갈 수 있어요`);
  const P = probeOf(s), Z = regionOf(pl, regionId), O = exploreOdds(s, pl, Z);   // Z = 고른 지역(없으면 첫 지역)
  need(pl.orbit <= P.lv.tank, `연료 탱크 ${pl.orbit}단계가 있어야 ${pl.orbit}궤도까지 가요`);
  need(P.lv.scanner >= Z.need, `탐사 장치 ${Z.need}단계가 필요해요`);
  fuelSync(s, now);
  need(s.items.fuel >= 1, '연료 캡슐이 없어요 — 시간이 지나면 차요');
  need(s.wallet.credits >= O.cost, `탐사비 ${O.cost}이 모자라요`);
  s.items.fuel--; s.wallet.credits -= O.cost;
  const ok = rng() < O.ok, got = [];
  if (ok) {
    if (rng() < ({ seed: 0.92, mixed: 0.7, resource: 0.35 }[Z.kind] ?? 0.85)) {   // 종자: 그 지역 식물 중(드문 것 18% × 지역 귀한 보상 배수)
      const pool = Z.pool.filter(k => SPECIES[k].rarity === 'common'), rare = Z.pool.filter(k => SPECIES[k].rarity === 'rare');
      const key = rare.length && rng() < 0.18 * Z.rare ? pick(rng, rare) : pick(rng, pool.length ? pool : Z.pool), legend = !!pl.legend && rng() < LEGEND_P;
      got.push({ kind: 'seed', seed: seedOf(s, key, rng, { legend, ivk: Z.vital + Math.floor((P.lv.vault - 1) / 2), mut: Z.mut || 1 }), rar: legend ? 4 : SPECIES[key].rarity === 'rare' ? 2 : 1 });
    }
    const n = 1 + Math.floor((P.lv.cargo - 1) * 0.75 + rng() * 0.5), q = (P.lv.scanner - 1) / 4;   // 채집기 = 개수, 탐사 장치 = 등급(0~1)
    const owned = formsOwned(s);
    for (let i = 0; i < n; i++) got.push(rollLoot(Z, q, O.cost, rng, owned));
  } else got.push({ kind: 'credits', n: Math.round(O.cost * 0.15), rar: 0 });   // 실패: 건진 것 조금
  for (const r of got) grant(s, r);
  for (const r of got) if (r.kind === 'seed' && !s.discovered.includes(r.seed.key)) s.discovered.push(r.seed.key);
  const xp = addXp(s, ok ? XP.explore : Math.round(XP.explore / 3), rng);
  return { planet: pl.name, region: Z.id, area: Z.name, ok, got, xp, cost: O.cost };
}
// 종자 말고 보상 한 칸: 자원형 행성 = 부품 많이 · 풍요 = 양 · 탐사 장치(q) = 접목 가지 · 회귀 주사 · 보석 쪽으로. 돈은 작게(탐사비보다 적게 — 탐사로 돈을 불리지 못하게)
//  pl = 지역(regionOf — 종류 · 귀한 보상 배수 rare · 식물은 그 지역 것)
function lootW(pl, q) {
  const res = pl.kind === 'resource' ? 2 : pl.kind === 'mixed' ? 1.3 : 1, rr = pl.rare || 1;
  return [{ k: 'credits', w: 30 }, { k: 'water', w: 22 }, { k: 'fert', w: 14 }, { k: 'parts', w: 18 * res }, { k: 'scion', w: (4 + 10 * q) * rr }, { k: 'regress', w: (1 + 4 * q) * rr }, { k: 'gems', w: (0.5 + 3 * q) * rr }, { k: 'card', w: (2 + 4 * q) * rr }];
}
function rollLoot(pl, q, cost, rng, owned = []) {
  const res = pl.kind === 'resource' ? 2 : pl.kind === 'mixed' ? 1.3 : 1, rich = pl.rich || 1;
  const x = pickW(rng, lootW(pl, q)).k;
  if (x === 'credits') return { kind: 'credits', n: Math.round(cost * (0.15 + 0.25 * rng()) * rich), rar: 0 };
  if (x === 'water' || x === 'fert') return { kind: x, n: Math.max(1, Math.round((1 + rng()) * rich)), rar: 1 };
  if (x === 'parts') return { kind: 'parts', n: Math.max(1, Math.round((1 + 2 * rng()) * res * rich)), rar: 1 };
  if (x === 'scion') return { kind: 'scion', skill: rollScion(rng, { key: pick(rng, pl.pool) }, Math.min(1, 0.2 + 0.6 * q + 0.1 * (pl.orbit - 1))), rar: 3 };
  if (x === 'regress') return { kind: 'regress', n: 1, rar: 4 };
  if (x === 'card') { const c = rollCard(rng, rng() < Math.min(0.6, 0.2 * (pl.mut || 1)) ? 'mut' : 'normal', owned); return { kind: 'card', card: c, rar: CARDS[c].rar }; }
  return { kind: 'gems', n: 1 + Math.floor(rng() * 2 + q), rar: 4 };
}
// 탐사선 강화: 돈 + 부품(자원형 행성에서 많이)
export function upgradeProbe(s, part) {
  need(PROBE[part], '없는 부위');
  const P = probeOf(s), lv = P.lv[part];
  need(lv < PROBE[part].max, '이미 끝까지 올렸어요');
  const c = probeUpCost(lv);
  need(s.wallet.credits >= c.credits, '돈이 모자라요');
  need((s.items.parts || 0) >= c.parts, `부품이 ${c.parts}개 필요해요`);
  s.wallet.credits -= c.credits; s.items.parts -= c.parts; P.lv[part] = lv + 1;
  return { part, lv: lv + 1, cost: c };
}

// ── 상점 ──
export function buy(s, itemId, rng) {
  const it = SHOP.find(x => x.id === itemId);
  need(it, '없는 물건');
  for (const [k, v] of Object.entries(it.cost)) need(s.wallet[k] >= v, k === 'gems' ? '보석이 모자라요' : '돈이 모자라요');
  for (const [k, v] of Object.entries(it.cost)) s.wallet[k] -= v;
  const g = it.give;
  if (g.seed) { const sd = seedOf(s, rollSpecies(rng, g.seed), rng); s.seeds.push(sd); return { seed: sd }; }
  if (g.card) { const c = rollCard(rng, g.card, formsOwned(s)); grant(s, { kind: 'card', card: c }); return { card: c }; }
  give(s, g);
  return { give: g };
}

// ── 재배사 경험치 · 레벨업 보상(클래시로얄처럼 상자 — 화면이 pending을 열어 보여 줌) ──
export function addXp(s, n, rng) {
  const u = s.user, ups = [];
  u.xp += n;
  while (u.xp >= userNeed(u.level)) {
    u.xp -= userNeed(u.level); u.level++;
    const r = levelReward(u.level), box = { ...r };
    give(s, r);
    if (r.seed) { const sd = seedOf(s, rollSpecies(rng, r.seed), rng); s.seeds.push(sd); box.seed = sd; }
    if (r.card) { const c = rollCard(rng, r.card); grant(s, { kind: 'card', card: c }); box.card = c; }
    s.pending.push({ kind: 'level', level: u.level, box, slots: farmSlots(u.level) });
    ups.push(u.level);
  }
  return { gained: n, ups };
}
export function ackPending(s, n) { s.pending.splice(0, Math.max(1, n | 0)); return {}; }

// ── 전투 보상(서버가 결과를 확인한 뒤에만) ──
const ROUNDS = ['예선', '16강', '8강', '4강', '결승'];
// ── 리그 · 시즌 ── s.tournament = 지금 고른 리그의 기록(다른 화면 · 서버가 그대로 읽음), s.leagues = 리그마다 기록 보관, s.league = 고른 리그
const freshT = (lg, tier = '브론즈') => ({ tier, name: `${LEAGUES[lg].short} ${tier}`, round: '예선', wins: 0, losses: 0, bestOf: 5, pts: 0 });
export function leaguesOf(s) {
  if (!s.league || !LEAGUES[s.league]) s.league = 'sprout';
  if (!s.leagues) s.leagues = {};
  for (const k of LEAGUE_KEYS) if (!s.leagues[k]) s.leagues[k] = k === s.league && s.tournament ? { ...s.tournament } : freshT(k);
  if (!s.tournament) s.tournament = { ...s.leagues[s.league] };
  return s.leagues;
}
export const leagueCap = s => LEAGUES[s.league || 'sprout'].cap;
export function setLeague(s, lg) {
  need(LEAGUES[lg], '모르는 리그');
  leaguesOf(s);
  s.leagues[s.league] = { ...s.tournament };   // 지금 리그 기록을 넣어 두고
  s.league = lg; s.tournament = { ...s.leagues[lg] };
  return { league: lg };
}
// 시즌 넘김(상태를 맞출 때마다): 지난 시즌 최고 단계로 상자 · 칭호 → 모든 리그 두 단계 내려가 예선부터
export function seasonSync(s, now) {
  leaguesOf(s);
  const n = seasonOf(now);
  if (!s.season) { s.season = { n, best: Object.fromEntries(LEAGUE_KEYS.map(k => [k, TIERS.indexOf((k === s.league ? s.tournament : s.leagues[k]).tier)])) }; return; }
  if (n <= s.season.n) return;
  s.leagues[s.league] = { ...s.tournament };
  const best = s.season.best, top = Math.max(0, ...LEAGUE_KEYS.map(k => best[k] || 0)), box = { credits: 0, gems: 0, fuel: 0 };
  for (const k of LEAGUE_KEYS) { const r = seasonReward(best[k] || 0); box.credits += r.credits; box.gems += r.gems; box.fuel += r.fuel; }
  give(s, box);
  const title = top >= 2 ? `${TIERS[top]} 재배사` : null;
  if (title && !s.titles.includes(title)) s.titles.push(title);
  s.pending.push({ kind: 'season', n: s.season.n, best: { ...best }, box, title });
  for (const k of LEAGUE_KEYS) { const t0 = Math.max(0, TIERS.indexOf(s.leagues[k].tier) - 2); s.leagues[k] = freshT(k, TIERS[t0]); }
  s.tournament = { ...s.leagues[s.league] };
  s.season = { n, best: Object.fromEntries(LEAGUE_KEYS.map(k => [k, TIERS.indexOf(s.leagues[k].tier)])) };
}
export const PVP_DAILY = 15;   // 친구 대결 보상은 하루 15판까지(친구끼리 일부러 져 주며 돈·경험치를 쌓지 않게) — 승패 기록은 늘 남음
export function battleReward(s, { mode, win, rng, now = 0, short = false }) {
  const r = { credits: 0, water: 0, fert: 0 };
  if (mode === 'pvp') {
    s.pvp[win ? 'wins' : 'losses']++;
    const day = Math.floor(now / 864e5);
    if (s.pvp.day !== day) { s.pvp.day = day; s.pvp.n = 0; }
    if (short || s.pvp.n >= PVP_DAILY) { r.capped = short ? 'short' : 'daily'; r.xp = { gained: 0, ups: [] }; return r; }   // 너무 짧은 판(3턴 미만) · 하루 한도 = 보상 없음
    s.pvp.n++;
    r.credits = win ? 80 : 30;
    if (win && rng() < 0.5) r.fuel = 1;
  } else {
    const tier = TIERS.indexOf(s.tournament.tier);
    r.credits = win ? 60 + 15 * tier : 15;
    if (win && rng() < 0.5) r.water = 1 + (rng() < 0.3 ? 1 : 0);
    if (win && rng() < 0.2) r.fert = 1;
    if (win && rng() < 0.25) r.fuel = 1;
    if (mode === 'swap3') s.swap3[win ? 'wins' : 'losses']++;
    else {
      const T = s.tournament; T[win ? 'wins' : 'losses']++;
      if (T.wins >= 3) {   // 이번 라운드 통과 → 다음 라운드(결승 통과 = 다음 단계 대회)
        const i = ROUNDS.indexOf(T.round);
        if (i >= ROUNDS.length - 1) {
          T.tier = TIERS[Math.min(TIERS.length - 1, tier + 1)]; T.name = `${LEAGUES[s.league || 'sprout'].short} ${T.tier}`; T.round = ROUNDS[0]; r.credits += 300; r.tierUp = T.tier;
          leaguesOf(s); if (s.season) s.season.best[s.league] = Math.max(s.season.best[s.league] || 0, TIERS.indexOf(T.tier));   // 시즌 최고 기록
        }
        else T.round = ROUNDS[i + 1];
        T.wins = 0; T.losses = 0; r.round = T.round;
      } else if (T.losses >= 3) { T.wins = 0; T.losses = 0; T.round = ROUNDS[0]; r.reset = true; }
    }
  }
  give(s, r);
  r.xp = addXp(s, mode === 'pvp' ? (win ? XP.pvpWin : XP.pvpLose) : (win ? XP.botWin : XP.botLose), rng);
  return r;
}
// 기권·도중에 떠남 = 진 판으로만 남김(보상 없음 — 판을 열었다 버리며 상대를 고르거나 경험치를 쌓지 못하게)
export function battleForfeit(s, mode) {
  if (mode === 'pvp') { s.pvp.losses++; return { forfeit: true }; }
  if (mode === 'swap3') { s.swap3.losses++; return { forfeit: true }; }
  const T = s.tournament; T.losses++;
  const r = { forfeit: true };
  if (T.losses >= 3) { T.wins = 0; T.losses = 0; T.round = ROUNDS[0]; r.reset = true; }
  return r;
}
