// 풀로세움 v2 게임 규칙(서버·화면 공용, 순수 함수 — 시각 now·난수 rng를 밖에서 받음). 서버가 이 규칙으로만 진행을 바꿈(치트 방지 — 2026-06-26 서버 권위 설계).
// 표 = catalog.js. 모든 함수는 state를 그 자리에서 바꾸고 화면에 보여 줄 결과를 돌려줌. 안 되는 일은 Err(사용자에게 보일 한국어 문구)를 던짐.
import {
  SPECIES, SKILLS, STAGES, LV_MAX, growNeed, FEED, PTS_PER_LV, IV_KEYS, IV_MAX, NUTR_CAP, UP_GAIN, STAGE_MUL, upCost, resetCost, starsOf,
  uniqueOf, uniquesOf, bloomPool, canGraft, userNeed, XP, farmSlots, levelReward, HARVEST, harvestMax, harvestK, HARVEST_TABLE, FARM_DAY, PLANETS, ORBIT_LV, FUEL,
  SHINY_P, LEGEND_P, SHOP, SELL_BASE, STARTERS, ITEMS, STORE_MAX, PROBE, probeUpCost, EXPLORE_COST,
  LEAGUES, LEAGUE_KEYS, TIERS, roundBest, BANNER_LV, seasonOf, seasonReward, FORM_KEYS, MUT_P, SUN_UP, SUN_REGEN, sunSteps, RENAMED,
  ROUND_PTS, LOSE_PTS, DIV_PTS, DIVS, DIV_REWARD, TIER_PTS, GUARD_CUPS, SEASON_FLOOR, isTopTier, rankOf } from './catalog.js';
import { CARDS, CARD_SLOTS, PASS_STORE, cardFits, rollCard, rollFrom, formCards, isSkillCard, NORMAL_CARDS, baseOf, CARD_UP, cardPrice } from './cards.js';

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
    items: { water: 10, fert: 2, regress: 0, fuel: FUEL.max, parts: 6 }, fuelT: now,   // 부품 6 = 첫 강화 두 번(2026-10-17) · 물 6 → 10(2026-10-23 생장치 두 배 — 처음엔 물만 줘도 한 번 레벨업: 물 9번 = Lv2)
    scions: [], seeds: [], plants: [], storage: [], active: 0, team: [], mode: 'tournament',
    tournament: { tier: '브론즈', name: '새싹 브론즈', round: '예선', wins: 0, losses: 0, bestOf: 5, pts: 0 },
    swap3: { wins: 0, losses: 0 }, pvp: { wins: 0, losses: 0 },
    discovered: [], pending: [], ship: { model: null }, cards: {}, cardsV: 1,
  };
  s.plants.push(makePlant(s, { key: starter }, rng, now));
  for (let i = 0; i < 2; i++) s.seeds.push(seedOf(s, rollSpecies(rng, 'common'), rng));
  s.plants[0].cards[0] = rollCard(rng, 'normal');   // 처음 식물 = 일반 카드 한 장(카드 칸이 있다는 걸 바로 보게 — 2026-10-17)
  s.league = 'sprout'; leaguesOf(s); seasonSync(s, now);
  s.ver = SAVE_VER;
  return s;
}
// ── 저장 판 번호 · 옮기기(2026-10-18 업데이트 안전 — species-identity 설계 §7) ──
//  서버가 불러올 때 s.ver < SAVE_VER 이면 원본을 보관한 뒤(server/game.mjs load) 단계를 번호 순서대로 한 번씩. 기능마다 붙은 p.skills.v4~v8 표시는 그대로
//  (이어 하는 옛 판 다시 계산이 읽음). 앞으로 저장 모양을 바꾸면 MIGRATIONS 에 단계를 더하고 SAVE_VER +1 · id를 바꾸면 catalog.js RENAMED 에 적고 +1.
export const SAVE_VER = 5;
const MIGRATIONS = [
  () => {},   // 0 → 1: 판 번호 시작(모양은 그대로)
  () => {},   // 1 → 2(2026-10-22 밤샘 묶음 — 카드 귀속 · 꾸러미 · 랭크 7판): 모양은 그대로(새 칸은 쓸 때 생김) · 판 번호만 올려 서버가 올린 뒤 처음 불러올 때 계정마다 원본을 보관(server/game.mjs load · POST /api/admin/restore)
  () => {},   // 2 → 3(2026-10-22 낮 묶음 — 종자 값 별 배수 · 종자 여러 개 팔기 · 배너 열둘 · 그림): 모양은 그대로 · 올린 뒤 처음 불러올 때 원본 보관용
  // 3 → 4(2026-10-23 묶음 — 대회 점수 · 칸 · 강등 · 엠블럼 · 색 변종 1/1000 · 3:3 햇빛 · 접목 카드 · 공지 · 순위표 · 영양제): 대회 점수 T.pts 는 원래 있던 칸(모두 IV칸 0점부터) ·
  //  풀로세움 별(전엔 우승 수) → 점수(별 하나 = 100점 — 이제 별은 점수에서 셈) · 원본 보관용
  s => { for (const T of [s.tournament, ...Object.values(s.leagues || {})]) if (T && isTopTier(T.tier) && T.stars > 0 && !T.pts) T.pts = T.stars * DIV_PTS; },
  () => {},   // 4 → 5(2026-10-23 묶음 — 엑셀 v10 공통 효과 · RULES_VER 9 · 효과 창 · 환경 띠 · 땅 · 꼬리표): 모양은 그대로(기술 · 카드 id 그대로) · 올린 뒤 처음 불러올 때 원본 보관용
];
export function migrate(s) {
  const from = s.ver || 0;
  for (let v = from; v < SAVE_VER; v++) MIGRATIONS[v](s);
  if (from < SAVE_VER) remapIds(s);
  s.ver = SAVE_VER;
  return from;
}
// 이름을 바꾼 기술 · 카드를 새 id로(전투 칸 · 보관 · 지운 기술 · 배운 기술 · 패시브 칸 · 패시브 보관 · 가방) — 바꾼 [옛, 새] 목록
export function remapIds(s) {
  const out = [], to = (map, id) => (id && map[id] ? (out.push([id, map[id]]), map[id]) : id);
  const any = id => (RENAMED.card[id] ? to(RENAMED.card, id) : to(RENAMED.skill, id));   // 전투 칸엔 기술 · 기술 카드가 섞임
  for (const p of [...(s.plants || []), ...(s.storage || [])]) {
    const S = p.skills;
    if (S) for (const k of ['battle', 'store', 'forgot', 'learned']) if (Array.isArray(S[k])) S[k] = S[k].map(any);
    for (const k of ['cards', 'pstore']) if (Array.isArray(p[k])) p[k] = p[k].map(id => to(RENAMED.card, id));
  }
  for (const id of Object.keys(s.cards || {})) if (RENAMED.card[id]) { const n = s.cards[id], nid = to(RENAMED.card, id); delete s.cards[id]; s.cards[nid] = (s.cards[nid] || 0) + n; }
  return out;
}

// ── 식물 ──
export function makePlant(s, seed, rng, now) {
  const sp = SPECIES[seed.key];
  need(sp, '모르는 식물');
  // 개체값: 탐사 종자는 ivk번 더 굴려 가장 좋은 값(행성 생기 + 종자 보관함 — 2026-10-16 사용자 "얻어온 종자의 개체값이 좋을 확률이 증가"), 그 밖은 한 번
  const [lo, hi] = POT_SUM[potOf(seed) - 1], T = lo + Math.floor(rng() * (hi - lo + 1)), ivs = Object.fromEntries(IV_KEYS.map(k => [k, 0]));   // 잠재력 별 구간 안의 합 → 칸마다 무작위로 나눔
  for (let n = 0; n < T; n++) { const room = IV_KEYS.filter(k => ivs[k] < IV_MAX); ivs[room[Math.floor(rng() * room.length)]]++; }
  if (seed.legend) for (const k of IV_KEYS) ivs[k] = Math.max(ivs[k], 7);
  if (seed.trait === 'fruity') ivs.fruit = Math.max(ivs.fruit, 8);   // 옛 열매용 종자
  const p = {
    uid: uid(s), key: seed.key, name: (seed.legend ? '전설의 ' : '') + sp.name, stage: 0, lv: 1, gxp: 0, ivs, ivFix: 1,
    shiny: !!seed.shiny, legend: !!seed.legend, form: seed.form || sp.form || null,
    pts: 0, up: {}, spent: 0, invest: 0, pot: 'pot_terra', born: now,
    skills: { battle: [null, null, null, null, null, null], store: [], forgot: [], learned: [], v4: 1, v6: 1, v7: 1, v8: 1 }, pend: [], pstore: [],
    hv: { t0: now, have: 0 },
  };
  // 처음 기술 = 어린 개성 기술 + 하급 공통 하나(속성 · 종 중), 남은 전투 칸 = 기본기 셋(여섯째 칸은 비어 있음 — 변이 식물은 그 변이 기술 카드)
  learnNow(p, uniqueOf(p.key, 0));
  const c1 = bloomPool(p.key, 0).filter(x => !uniquesOf(p.key, 0).includes(x.id));
  if (c1.length) learnNow(p, pickW(rng, c1).id);
  fillBasics(p);
  // 패시브 칸 셋(2026-10-18 — 전엔 둘): 변이 식물은 처음 필 때 그 변이 카드 둘 — 기술 카드 하나는 장착(빈 칸 → 회피 자리, 회피는 보관으로)에, 패시브 하나는 패시브 칸에
  p.cards = [null, null, null];
  if (p.form) {
    const fc = formCards(p.form), sk = pick(rng, fc.filter(isSkillCard)), b = p.skills.battle;
    p.cards = [pick(rng, fc.filter(id => !isSkillCard(id))), null, null];
    const i = b.indexOf(null) >= 0 ? b.indexOf(null) : b.lastIndexOf('evade');
    if (i >= 0) { const old = b[i]; b[i] = sk; if (old) stashPlain(p, old); }
  }
  if (!s.discovered.includes(p.key)) s.discovered.push(p.key);
  return p;
}
// 기술 칸(2026-10-16 사용자 "총 전투에 들고가는 스킬은 4개이며, 기본 스킬은 조커처럼 항상 빼고 넣고 가능(버릴 수 없음)" · "기본스킬 3개도 바꿀 수 있게"
//  → 2026-10-17 "스킬 4개인 거 재미없어 — 6개 들고 갈 수 있게 · 변이는 6개 중 2개를 변이 스킬 카드로"):
//  battle = 전투에 들고 가는 여섯(배운 기술 · 기본기 · 변이 식물은 그 변이 기술 카드 MUT_MAX 장까지) · joker = 배운 기술 하나 보관 · 기본기 셋은 늘 앎(지울 수 없음 — 전투 칸에 없으면 보관에 있는 셈)
export const BASIC_IDS = ['basic', 'guard', 'evade', 'sun'], LOADOUT = 6, MUT_MAX = 2, SKILL_STORE = 6;   // SKILL_STORE = 스킬 보관 칸(2026-10-18 한 칸 → 여섯)   // sun = 광합성(햇빛 +2 — 2026-10-18 사용자 "기본으로 주는 것 중에 햇빛 채우는 카드도")
const isBasic = id => BASIC_IDS.includes(id);
// 기본기도 칸을 차지(2026-10-18 사용자 "기본기 스킬도 6개 스킬 칸에 포함 · 꽉 차면 버려야 함"): 칸 밖으로 밀린 기본 기술(배운 기술 · 기본기) = 보관 빈 칸 → 없으면 지운 기술(유전자 회귀 주사로 되찾음)
function stashPlain(p, id) { const S = p.skills; if (S.store.length < SKILL_STORE) S.store.push(id); else if (!S.forgot.includes(id)) S.forgot.push(id); }
const oneDraft = (p, id) => ({ kind: 'one', part: 'skill', st: p.stage, lv: p.lv, pick: 1, cands: [id] });   // 칸이 없어 놓을 데를 고르는 기술 하나(접목 · 회귀 · 옛 '놓을 칸 기다림')
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
  if (!S.v7) {   // 보관 한 칸(조커) → 여섯 칸(2026-10-18): 조커 · 놓을 칸을 기다리던 새 기술을 보관으로(넘치면 기다림 그대로)
    S.store = [S.joker, ...(Array.isArray(S.store) ? S.store : [])].filter(Boolean).slice(0, SKILL_STORE);
    delete S.joker; S.v7 = 1;
    if (Array.isArray(p.pend)) while (p.pend.length && S.store.length < SKILL_STORE) S.store.push(p.pend.shift());
  }
  if (!Array.isArray(S.store)) S.store = [];
  if (!Array.isArray(S.forgot)) S.forgot = [];
  if (!S.v8) {   // 기본기도 칸 안으로(2026-10-18): 장착에 없는 기본기 → 보관 빈 칸(평타 · 방어 · 회피 · 광합성 순) → 못 들어가면 지운 기술 · 놓을 칸 기다림 → 하나 고르기
    for (const id of ['basic', 'guard', 'evade', 'sun']) if (!S.battle.includes(id) && !S.store.includes(id) && !S.forgot.includes(id)) stashPlain(p, id);
    if (Array.isArray(p.pend) && p.pend.length) { p.drafts = p.drafts || []; for (const id of p.pend) p.drafts.push(oneDraft(p, id)); p.pend = []; }
    S.v8 = 1;
  }
  return p;
}
const known = p => new Set([...p.skills.battle.filter(x => x && !isBasic(x)), ...(p.skills.store || []), ...p.skills.forgot, ...p.pend].filter(Boolean));
// 새 기술 놓기(첫 식물 · 접목 · 회귀): 빈 장착 칸 → 스킬 보관 빈 칸 → 다 차면 하나 고르기(고르기 화면에서 놓을 칸 · 버릴 것을 정함 — 2026-10-18, 전엔 기본기 자리를 바꿔치기 · '놓을 칸 기다림')
function learnNow(p, id) {
  normSkills(p);
  const b = p.skills.battle, i = b.indexOf(null);
  if (!isBasic(id) && !p.skills.learned.includes(id)) p.skills.learned.push(id);
  if (i >= 0) { b[i] = id; return 'battle'; }
  if (p.skills.store.length < SKILL_STORE) { p.skills.store.push(id); return 'store'; }
  (p.drafts = p.drafts || []).push(oneDraft(p, id)); return 'draft';
}
export const findPlant = (s, id) => s.plants.find(p => p.uid === id) || null;

// ── 카드(2026-10-17 — 표 = cards.js): 가방 s.cards = { id: 장 수 } · 식물 p.cards = 카드 칸 둘 · 태생 변이는 전투 칸에도 그 변이의 기술 카드 ──
const addCard = (s, id, n = 1) => { s.cards[id] = (s.cards[id] || 0) + n; };
const tally = list => { const o = {}; for (const x of list) if (x) o[x] = (o[x] || 0) + 1; return o; };
const cardsOn = p => [...(p.cards || []), ...(p.pstore || []), ...((p.skills && p.skills.battle) || []).filter(isSkillCard), ...((p.skills && p.skills.store) || []).filter(isSkillCard)].filter(Boolean);
// 식물이 떠날 때(팔기 · 해체): 끼운 카드는 그 식물에 귀속(2026-10-22 사용자 '다른 식물에 끼운 카드는 못 바꿔 고정인걸로하자 패시브나 스킬 전부 식물 귀속') →
//  가방으로 돌아가지 않고 카드마다 팔 값(cards.js cardPrice)만큼 돈으로 — 전엔 가방으로 돌아감
const releaseCards = (s, p) => { let n = 0; for (const id of cardsOn(p)) if (CARDS[id]) n += cardPrice(id); s.wallet.credits += n; return n; };
export const formsOwned = s => [...new Set([...s.plants, ...(s.storage || [])].map(p => p.form).filter(Boolean))];
const OLD_MUT = { predator: ['m_bite', 'm_devour', 'm_hunt'], weapon: ['m_slash', 'm_shot', 'm_smash'], toxic: ['m_spit', 'm_acid', 'm_miasma'], spore: ['m_puff', 'm_sleep', 'm_bloom'], dragon: ['m_breath', 'm_scale', 'm_roar'] };
// 옛 세이브 맞추기: 카드 칸 · 가방 · 옛 변이 칸 둘(p.skills.mut — 2026-10-16) → 카드 칸(끼워 둔 기술은 그대로, 그 변이의 나머지 옛 기술은 카드로 가방에 — 잃는 것 없게)
export function normCards(s) {
  if (!s.cards || typeof s.cards !== 'object' || Array.isArray(s.cards)) s.cards = {};
  for (const p of [...(s.plants || []), ...(s.storage || [])]) {
    if (!Array.isArray(p.cards)) p.cards = [null, null];
    while (p.cards.length < CARD_SLOTS) p.cards.push(null);
    if (!Array.isArray(p.pstore)) p.pstore = [];
    if (p.pstore.some(id => !CARDS[id] || isSkillCard(id) || cardFits(p, id))) p.pstore = p.pstore.filter(id => { if (CARDS[id] && !isSkillCard(id) && !cardFits(p, id)) return true; if (CARDS[id]) addCard(s, id); return false; });   // 패시브 보관 = 모든 식물(2026-10-22) — 이 식물에 안 맞는 카드만 가방으로
    if (p.skills && !p.skills.v8) normSkills(p);
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
        addCard(s, id); S.battle[i] = null;   // 기본기는 이제 칸 안(v8)에 있어 빈 칸으로
      });
      p.cards.forEach((id, i) => {
        if (!isSkillCard(id)) return;
        p.cards[i] = null;
        const at = S.battle.indexOf(null) >= 0 ? S.battle.indexOf(null) : ['sun', 'evade', 'guard', 'basic'].map(x => S.battle.indexOf(x)).find(k => k >= 0) ?? -1;   // 햇빛 모으기(2026-10-18 새 기본기) 자리부터 — 옛 세이브 칸 배치가 그대로
        if (CARDS[id].form === p.form && n < MUT_MAX && at >= 0 && !S.battle.includes(id)) { const old = S.battle[at]; S.battle[at] = id; n++; if (old) stashPlain(p, old); }
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
// 지금 배치 복사본(화면 · 고르기 화면이 고쳐서 setSlots · draftApply 로 보냄): 스킬 장착 6 · 보관 ≤6 · 패시브 장착 3 · 패시브 보관 ≤3(변이 식물만)
export function slotLayout(p) {
  normSkills(p);
  return { battle: [...p.skills.battle], store: [...p.skills.store], cards: [...(p.cards || []), null, null, null].slice(0, CARD_SLOTS), pstore: [...(p.pstore || [])] };
}
const cellOf = x => (x == null || x === '' ? null : String(x));
// 새 배치 검사 + 넣기(setSlots · draftApply 공용 — 2026-10-18 스킬 · 패시브 칸 개편):
//  스킬 칸(장착 · 보관) = 기본 기술(배운 기술 · 기본기) · 그 변이 기술 카드(장착엔 MUT_MAX 장까지) / 패시브 칸 = 맞는 패시브(cardFits) · 패시브 보관 = 변이 식물의 그 변이 패시브만 ·
//  한 식물에 같은 것 두 칸 없이 · 장착에 하나는. 카드 = 물건(새로 들어오면 가방에서 빠지고 빠지면 가방으로). 기본 기술이 빠지면 X.drop 일 때만(고르기 화면 — 지운 기술로)
//  X = { plain: 새로 들어와도 되는 기술(고르기 후보), fresh: 가방을 거치지 않고 새로 생기는 카드(패시브 고르기 후보), drop, sell }
//  카드 귀속(2026-10-22): 가방 → 식물은 됨 · 식물에서 빠지는 카드는 막음(이 식물 안 장착 ↔ 보관만) — X.sell(고르기 확정에서 위 줄에 남긴 카드)이면 팔 값만큼 돈
function applyLayout(s, p, L, X = {}) {
  const B = L.battle, St = L.store.filter(Boolean), C = L.cards, Ps = L.pstore.filter(Boolean);
  need(B.length === LOADOUT && C.length === CARD_SLOTS, '칸 수가 맞지 않아요');
  need(St.length <= SKILL_STORE, `스킬 보관은 ${SKILL_STORE}칸이에요 — 보관이 꽉 찼어요`);
  need(Ps.length <= PASS_STORE, `패시브 보관은 ${PASS_STORE}칸이에요`);
  const all = [...B, ...St, ...C, ...Ps].filter(Boolean);
  need(new Set(all).size === all.length, '같은 것을 두 칸에 둘 수 없어요');
  const bases = all.filter(x => CARDS[x]).map(baseOf);
  need(new Set(bases).size === bases.length, '같은 카드는 한 식물에 한 장만 끼워요');   // 강화 카드(+1 · +2)와 처음 카드를 함께 끼우지 못함(2026-10-22)
  need(B.some(Boolean), '장착에 기술이 하나는 있어야 해요');
  for (const x of [...B, ...St]) if (x && CARDS[x]) { need(isSkillCard(x), '패시브 카드는 패시브 칸에 놓아요'); const why = cardFits(p, x); need(!why, why); }
  for (const x of [...C, ...Ps]) if (x) { need(CARDS[x] && !isSkillCard(x), '기술은 스킬 칸에 놓아요'); const why = cardFits(p, x); need(!why, why); }
  need(B.filter(isSkillCard).length <= MUT_MAX, `변이 기술 카드는 장착에 ${MUT_MAX}장까지예요`);
  const before = new Set([...p.skills.battle, ...p.skills.store].filter(x => x && !CARDS[x])), after = [...B, ...St].filter(x => x && !CARDS[x]), may = new Set(X.plain || []);
  for (const x of after) need(before.has(x) || may.has(x), '모르는 기술이에요');
  const dropped = [...before].filter(x => !after.includes(x));
  need(X.drop || !dropped.length, '기술은 버릴 수 없어요 — 보관 칸이 모자라면 고르기 화면에서 정해요');
  const cB = tally(cardsOn(p)), cA = tally(all.filter(x => CARDS[x])), fresh = tally(X.fresh || []);
  const need2 = k => (cA[k] || 0) - (cB[k] || 0) - (fresh[k] || 0);
  for (const k of Object.keys(cA)) if (need2(k) > 0) need((s.cards[k] || 0) >= need2(k), `${CARDS[k].name} 카드가 가방에 없어요`);
  for (const k of Object.keys(cA)) { const n = need2(k); if (n > 0) { s.cards[k] -= n; if (s.cards[k] <= 0) delete s.cards[k]; } }
  const back = [];
  for (const [k, n] of Object.entries(cB)) { const b = n - (cA[k] || 0); if (b > 0) for (let q = 0; q < b; q++) back.push(k); }
  need(!back.length || X.sell, '끼운 카드는 이 식물에 귀속돼요 — 보관으로 옮기거나 보관에서 버려요');
  let sold = 0;
  for (const k of back) sold += cardPrice(k);
  s.wallet.credits += sold;
  for (const x of dropped) if (!p.skills.forgot.includes(x)) p.skills.forgot.push(x);
  for (const x of after) if (!isBasic(x) && !p.skills.learned.includes(x)) p.skills.learned.push(x);
  p.skills.battle = B.map(cellOf); p.skills.store = St; p.cards = C.map(cellOf); p.pstore = Ps;
  return { dropped, back, sold };
}
// 탭에서 옮기기(화면이 네 칸 전부를 보냄 — 끼우기 · 빼기 · 자리 바꾸기 · 가방 ↔ 칸). 기본 기술은 버리지 못함(고르기 화면에서만).
//  옛 꼴 setSlots(s, id, battle, cards) — 옛 화면용: 보관 = 원래 보관에서 새 장착에 든 것을 빼고 장착에서 빠진 기술 · 기술 카드를 뒤에 · 빠진 패시브는 패시브 보관 끝(귀속 — 2026-10-22) · 카드 칸 둘이면 셋째 칸 그대로
export function setSlots(s, id, a, b) {
  const p = getPlant(s, id); normSkills(p); normCards(s);
  let L;
  if (Array.isArray(a)) {
    need(a.length === LOADOUT, '장착 칸은 여섯이에요');
    need(Array.isArray(b) && (b.length === 2 || b.length === CARD_SLOTS), '패시브 칸 수가 맞지 않아요');
    const B = a.map(cellOf), C = [...b.map(cellOf), ...slotLayout(p).cards.slice(b.length)];
    const St = [...p.skills.store.filter(x => !B.includes(x)), ...p.skills.battle.filter(x => x && !B.includes(x) && !p.skills.store.includes(x))];   // 빠진 기술 카드도 스킬 보관(귀속 — 2026-10-22)
    const Ps = [...(p.pstore || []).filter(x => !C.includes(x)), ...(p.cards || []).filter(x => x && !C.includes(x) && !(p.pstore || []).includes(x))];   // 빠진 패시브 = 패시브 보관
    L = { battle: B, store: St, cards: C, pstore: Ps };
  } else {
    need(a && typeof a === 'object' && [a.battle, a.store, a.cards].every(Array.isArray), '잘못된 요청이에요');
    L = { battle: a.battle.map(cellOf), store: a.store.map(cellOf), cards: a.cards.map(cellOf), pstore: (Array.isArray(a.pstore) ? a.pstore : []).map(cellOf) };
  }
  applyLayout(s, p, L);
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
    sunMax: 8 + sunSteps(p, 'sunMax'), sunRegen: SUN_REGEN[sunSteps(p, 'sunRegen')],   // 햇빛 그릇 · 회복(턴마다 칸 — 2026-10-18)
  };
}
export const stars = p => starsOf(p.ivs);
export const growPct = p => (p.lv >= LV_MAX ? 1 : p.gxp / growNeed(p.stage, p.lv));

// 물·비료 주기(사용자 "생장은 물과 비료로만") — 레벨업마다 강화 포인트 2, Lv6이면 진화 단추
export function feed(s, id, kind, n = 1) {
  const p = getPlant(s, id);
  need(kind === 'water' || kind === 'fert', '물이나 비료만 줄 수 있어요');
  need((s.items[kind] || 0) >= n && n >= 1, kind === 'water' ? '물이 모자라요' : '비료가 모자라요');
  need(p.lv < LV_MAX, p.stage < 2 ? `Lv${p.stage * (LV_MAX - 1) + LV_MAX}이에요 — 진화하면 더 자라요` : '다 자랐어요');
  const ups = [];
  let used = 0;
  for (; used < n && p.lv < LV_MAX; used++) {
    p.gxp += FEED[kind]; p.invest += kind === 'fert' ? 6 : 2;
    while (p.lv < LV_MAX && p.gxp >= growNeed(p.stage, p.lv)) {
      p.gxp -= growNeed(p.stage, p.lv); p.lv++; p.pts += PTS_PER_LV;
      const r = { lv: p.lv, pts: PTS_PER_LV };
      // 새 기술 후보(고르기 — 아래 addDraft)는 단계마다 Lv3 · Lv6에서만(2026-10-22 사용자 "레벨업시 스킬을 주는데 이게 레벨업이 쉽고 카드 얻을 기회나 선택권이 많아서 너무 피로해" — 전엔 레벨업마다)
      if ((p.lv === 3 || p.lv === LV_MAX) && addDraft(p, 'lv')) r.draft = 1;
      if (p.stage === 2 && p.lv === LV_MAX && addDraft(p, 'lv', 'passive')) r.draft = 1;   // Lv16 = 패시브 고르기(셋째)
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
// 리그 따라가기(2026-10-17 사용자 "식물 성장하면 자동으로 그에 맞는 리그로 바꿔줘 · 진화시 이미 진행중인게 있으면 한 번 안내해줘 초기화된다고"):
//  고른 식물(s.active)이 진화해 지금 리그 단계 상한을 넘으면 그 단계를 받는 리그로 — 떠나는 리그의 이번 판(라운드 · 승패)은 처음부터(단계 · 점수는 그대로).
//  evolveLeague = 진화 전에 화면이 물어볼지 정할 때(바뀌는지 · 진행 중이었는지)
export function evolveLeague(s, p) {
  if (!p || s.plants[s.active] !== p || p.stage >= 2) return null;
  leaguesOf(s);
  const st = p.stage + 1;
  if (LEAGUES[s.league].cap >= st) return null;
  const T = s.tournament;
  return { from: s.league, to: LEAGUE_KEYS.find(k => LEAGUES[k].cap >= st), had: T.round !== ROUNDS[0] || T.wins > 0 || T.losses > 0, T: { ...T } };
}
export function evolve(s, id, rng) {
  const p = getPlant(s, id);
  need(p.lv >= LV_MAX && p.stage < 2, p.stage >= 2 ? '이미 다 자랐어요' : `Lv${p.stage * (LV_MAX - 1) + LV_MAX}이 되어야 진화해요`);
  const lg = evolveLeague(s, p);
  p.stage++; p.lv = 1; p.gxp = 0;
  let league = null;
  if (lg) { setLeague(s, lg.to); league = { from: lg.from, to: lg.to, kept: lg.had }; }   // 떠나는 리그 기록은 그대로 보관(2026-10-18 사용자 "추천대로" — 전엔 예선부터)
  const ivUp = {};   // 진화 = 개체값이 무작위로 0~2 오름(최대 아닌 칸에 하나씩 — 2026-10-18 사용자 "진화 시 개체값이 범위 내에서 랜덤하게 오르는 것도", 2026-10-22 1~3 → 0~2 "너무 쉬움")
  for (let n = Math.floor(rng() * 3); n > 0; n--) { const room = IV_KEYS.filter(k => (p.ivs[k] || 0) < IV_MAX); if (!room.length) break; const k = room[Math.floor(rng() * room.length)]; p.ivs[k] = (p.ivs[k] || 0) + 1; ivUp[k] = (ivUp[k] || 0) + 1; }
  const d1 = addDraft(p, 'evo'), d2 = addDraft(p, 'evo', 'passive'), got = [], draft = !!(d1 || d2);   // 진화 = 새 기술 후보에서 고르기 → 패시브 고르기(전엔 한두 개를 바로 배움 — 2026-10-18)
  const xp = addXp(s, XP.evolve, rng);
  return { stage: p.stage, got, draft, xp, league, ivUp };
}
// ── 카드 고르기(2026-10-18 사용자 "레벨업할 때마다 후보 여러 장 · 골라서 보관 · 진화 = 2장쯤 · 특정 레벨 · 마지막 진화 = 더" · "보류 가능 · '스킬 정하기'로 다시"):
//  p.drafts = [{ kind: 'lv' | 'evo', st, lv, pick, cands }] — 후보 = 그 단계에 피는 기술(bloomPool) 중 아직 모르는 것 · 다른 고르기에 이미 나온 것 빼고.
//  레벨업 = 셋 중 하나 · 단계 끝 레벨(Lv6 · 11 · 16) = 넷 중 둘 · 진화 = 넷 중 둘 · 마지막 진화 = 다섯 중 셋. 후보는 식물 · 단계 · 레벨로 정한 씨앗(화면이 먼저 해도 서버와 같게 — 물 주기는 빨리 반응 일).
//  안 고르면(보류) 그대로 남아 맨 위 '보류' 단추로 다시. 확정 = draftApply(고르기 화면이 놓은 배치 그대로 — 2026-10-18).
//  기술 후보(사용자 "(나) — 예전 것도 배울 기회, 우선은 최신 것"): 이번 단계 것 무게 그대로 + 앞 단계 것 무게 OLD_W.
//  패시브 고르기(part 'passive' — 2026-10-18 "스킬과 패시브 획득 시 각각 순서대로 창"): 첫 진화 · 둘째 진화 · Lv16 = 셋 중 하나(장착 칸 셋과 같은 수), 그 식물이 끼울 수 있고 칸에 없는 패시브
const DRAFT = { lv: { pick: 1, n: 3 }, top: { pick: 2, n: 4 }, evo: { pick: 2, n: 4 }, last: { pick: 3, n: 5 } }, PASS_DRAFT = { pick: 1, n: 3 }, OLD_W = 0.25;
const seeded = t => { let h = 2166136261; for (const c of t) h = Math.imul(h ^ c.charCodeAt(0), 16777619); let a = h >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
function addDraft(p, kind, part = 'skill') {
  if (!p.skills) return null;
  normSkills(p);
  const taken = new Set((p.drafts || []).flatMap(d => d.cands)), cands = [];
  let D, pool;
  if (part === 'passive') {
    const on = new Set([...(p.cards || []), ...(p.pstore || [])].filter(Boolean).map(baseOf));
    D = PASS_DRAFT; pool = Object.keys(CARDS).filter(id => !isSkillCard(id) && !CARDS[id].base && !cardFits(p, id) && !on.has(id) && !taken.has(id)).map(id => ({ id, w: 1 }));   // 강화 카드(+1 · +2)는 후보에 안 나옴
  } else {
    const have = known(p), seen = new Set(), fresh = x => !have.has(x.id) && !taken.has(x.id) && !isBasic(x.id) && !seen.has(x.id) && !!seen.add(x.id);
    D = kind === 'evo' ? (p.stage >= 2 ? DRAFT.last : DRAFT.evo) : p.lv >= LV_MAX ? DRAFT.top : DRAFT.lv;
    pool = bloomPool(p.key, p.stage).filter(fresh);
    for (let st = p.stage - 1; st >= 0; st--) pool.push(...bloomPool(p.key, st).filter(fresh).map(x => ({ ...x, w: x.w * OLD_W })));
  }
  const rng = seeded(`${p.uid}:${kind}:${part === 'passive' ? 'pas:' : ''}${p.stage}:${p.lv}`);
  while (cands.length < D.n && pool.length) { const x = pickW(rng, pool); pool.splice(pool.indexOf(x), 1); cands.push(x.id); }
  if (!cands.length) return null;
  const d = { kind, part, st: p.stage, lv: p.lv, pick: Math.min(D.pick, cands.length), cands };
  (p.drafts = p.drafts || []).push(d);
  return d;
}
// 고르기 확정(2026-10-18 새 고르기 화면): layout = 기술 고르기면 { battle, store } · 패시브 고르기면 { cards, pstore } — 화면이 놓은 배치 그대로.
//  후보는 정확히 pick 장(후보가 적으면 그 수) · 칸 규칙은 applyLayout · 밀려나 안 놓인 기본 기술 = 지운 기술 · 카드 = 가방 · 고른 패시브 = 새 카드
export function draftApply(s, id, n, layout) {
  const p = getPlant(s, id); normSkills(p); normCards(s);
  const d = (p.drafts || [])[n]; need(d, '고를 카드가 없어요');
  need(layout && typeof layout === 'object', '잘못된 요청이에요');
  const arr = v => { need(Array.isArray(v), '잘못된 요청이에요'); return v.map(cellOf); };
  const cur = slotLayout(p), pas = d.part === 'passive';
  const L = pas ? { ...cur, cards: arr(layout.cards), pstore: arr(layout.pstore || []) } : { ...cur, battle: arr(layout.battle), store: arr(layout.store) };
  const placed = (pas ? [...L.cards, ...L.pstore] : [...L.battle, ...L.store]).filter(x => x && d.cands.includes(x)), want = Math.min(d.pick, d.cands.length);
  need(placed.length === want, `${want}장을 골라 놓아요`);
  const r = applyLayout(s, p, L, pas ? { fresh: placed, sell: true } : { plain: placed, drop: true, sell: true });
  p.drafts.splice(n, 1);
  return { got: placed, dropped: [...r.dropped, ...r.back], sold: r.sold };
}
// 옛 화면용(고른 기술만 보냄): 빈 장착 → 보관 순으로 — 칸이 모자라면 막음(새 화면에서 놓을 칸 · 버릴 것을 정함)
export function draftPick(s, id, n, picks) {   // n = 몇째 고르기(0 = 맨 앞) · picks = 고른 기술(정확히 pick 장)
  const p = getPlant(s, id); normSkills(p);
  const d = (p.drafts || [])[n]; need(d, '고를 카드가 없어요');
  need(d.part !== 'passive', '새 고르기 화면에서 골라요');
  const P = [...new Set((Array.isArray(picks) ? picks : []).map(String))];
  need(P.length === d.pick && P.every(x => d.cands.includes(x)), `${d.pick}장을 골라 주세요`);
  need(p.skills.battle.filter(x => !x).length + SKILL_STORE - p.skills.store.length >= P.length, '칸이 다 찼어요 — 새 고르기 화면에서 골라요');
  p.drafts.splice(n, 1);
  return { got: P.map(x => ({ id: x, to: learnNow(p, x) })) };
}
// 꽉 찬 칸 정리: 기다리는 새 기술을 전투 칸(b0~b5)이나 스킬 보관(store — 빈 칸이 있을 때)에 놓고 원래 기술은 '지운 기술'로(기본기 자리였으면 기본기는 그냥 보관), 또는 새 기술을 안 배움(skip — 지운 기술로)
export function placePending(s, id, skill, target) {
  const p = getPlant(s, id), i = p.pend.indexOf(skill);
  normSkills(p);
  need(i >= 0, '기다리는 기술이 아니에요');
  const slot = target === 'joker' || target === 'store' ? 'store' : target === 'skip' ? 'skip' : +String(target).replace('b', '');   // joker = 옛 화면 이름
  need(slot === 'store' || slot === 'skip' || (slot >= 0 && slot < LOADOUT), '놓을 칸을 골라 주세요');
  need(slot !== 'store' || p.skills.store.length < SKILL_STORE, '스킬 보관이 다 찼어요');
  p.pend.splice(i, 1);
  if (slot === 'skip') { p.skills.forgot.push(skill); return { forgot: skill }; }
  if (slot === 'store') { p.skills.store.push(skill); return { forgot: null }; }
  const old = p.skills.battle[slot];
  p.skills.battle[slot] = skill;
  if (isSkillCard(old)) {   // 전투 칸의 카드 = 이 식물 스킬 보관(귀속 — 2026-10-22, 전엔 가방), 보관이 차면 팔 값만큼 돈
    if (p.skills.store.length < SKILL_STORE) { p.skills.store.push(old); return { forgot: null, card: old, to: 'store' }; }
    const n = cardPrice(old); s.wallet.credits += n; return { forgot: null, card: old, to: 'sold', credits: n };
  }
  if (old && isBasic(old)) { stashPlain(p, old); return { forgot: p.skills.forgot.includes(old) ? old : null }; }   // 기본기도 칸 안(v8) — 보관 → 없으면 지운 기술
  if (old) { p.skills.forgot.push(old); return { forgot: old }; }
  return { forgot: null };
}
// 전투 칸 정하기(화면이 새 배열을 보냄): 배운 기술 · 기본기 중에서, 같은 것 두 번 없이 · 전투 칸에서 뺀 배운 기술은 스킬 보관(여섯 칸)으로 — 기본기는 빼도 늘 앎
export function setLoadout(s, id, list) {
  const p = getPlant(s, id); normCards(s);
  return setSlots(s, id, list, p.cards);   // 카드 칸은 그대로(태생 변이의 전투 칸 카드도 이 규칙으로 — 2026-10-17)
}
// 전투 칸 ↔ 스킬 보관 첫 칸 바꾸기(옛 화면용 — 기본기 자리면 기본기는 보관으로)
export function swapJoker(s, id, slot) {
  const p = getPlant(s, id); normSkills(p);
  const b = p.skills.battle;
  need(slot >= 0 && slot < LOADOUT, '칸을 골라 주세요');
  const out = b[slot]; b[slot] = p.skills.store.shift() || null; if (out) p.skills.store.unshift(out);   // 기본기 · 카드도 보관으로(카드 = 귀속 — 2026-10-22, 전엔 가방)
  return {};
}
// 강화: 레벨업 포인트 + 돈(상한 없음 — 몰빵 가능), 리셋 = 돈
export function upgrade(s, id, stat, n = 1) {
  const p = getPlant(s, id);
  if (SUN_UP[stat]) {   // 햇빛 그릇 · 회복: n = 단 수(한 단 = 포인트 여럿)
    const U = SUN_UP[stat], st0 = sunSteps(p, stat), pts = U.pts * n;
    need(st0 + n <= U.max, `${U.name}은 ${U.max}단까지예요`);
    need(p.pts >= pts, `강화 포인트가 ${pts}개 필요해요 — 물·비료로 레벨을 올려요`);
    let cost = 0;
    for (let i = 0; i < pts; i++) cost += upCost(p.spent + i);
    need(s.wallet.credits >= cost, `돈이 모자라요(${cost})`);
    s.wallet.credits -= cost; p.pts -= pts; p.spent += pts; p.up[stat] = (p.up[stat] || 0) + pts; p.invest += cost;
    return { cost, steps: st0 + n };
  }
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
// 종자 거름(2026-10-18 사용자 "같은 식물 종자는 거름으로 · 개체값 상승은 소량" → "무조건 오르는 것보다 확률이면 · 거의 만렙일수록 조금씩 어려워지게"):
//  고른 개체값에 같은 종 종자를 하나씩 — 종자마다 확률(지금 값 0~4 = 40% · 5~7 = 25% · 8~9 = 12%), 실패가 쌓이면(p.ivp = 연속 실패 수) 4 · 6 · 9번째엔 반드시(운 나쁜 줄 막기) ·
//  최대면 멈추고 남은 종자는 가방. 난수라 화면이 먼저 하지 않음(서버 결과 그대로)
// 종자 거름 한 알이 개체값 +1 될 확률 · 연달아 실패하면 확정(2026-10-22 "너무 쉬움" — 40·25·12% / 4·6·9번 → 30·15·7% / 5·9·15번)
// 영양제(2026-10-22 사용자 "개체값 올리는 영양제 아직 없는 건가"): 고른 개체값을 반드시 +1 · NUTR_CAP(8)까지 — 9 · 10은 종자 거름(확률)으로만. 난수 없음
export function nutrient(s, id, stat) {
  const p = getPlant(s, id); normIvs(p);
  need(IV_KEYS.includes(stat), '올릴 개체값을 골라 주세요');
  need((s.items.nutr || 0) >= 1, '영양제가 없어요 — 상점에서 사요');
  const from = p.ivs[stat] || 0;
  need(from < NUTR_CAP, from >= IV_MAX ? '이미 최대예요' : `영양제로는 ${NUTR_CAP}까지예요 — 그 위는 종자 거름으로`);
  s.items.nutr--; p.ivs[stat] = from + 1;
  return { stat, from, to: from + 1, left: s.items.nutr };
}
export const ivpChance = v => (v <= 4 ? 0.3 : v <= 7 ? 0.15 : 0.07);
export const ivpPity = v => (v <= 4 ? 5 : v <= 7 ? 9 : 15);
export function seedFeed(s, id, stat, seedIds, rng) {
  const p = getPlant(s, id); normIvs(p);
  need(IV_KEYS.includes(stat), '올릴 개체값을 골라 주세요');
  need((p.ivs[stat] || 0) < IV_MAX, '이미 최대예요');
  need(typeof rng === 'function', '잘못된 요청이에요');
  const ids = [...new Set((Array.isArray(seedIds) ? seedIds : []).map(String))], list = ids.map(x => s.seeds.find(sd => sd.id === x));
  need(ids.length && list.every(Boolean), '그 종자가 없어요');
  need(list.every(sd => sd.key === p.key), '같은 식물 종자만 거름이 돼요');
  need(list.every(sd => !sd.lock), '잠긴 종자는 거름으로 못 써요');
  p.ivp = p.ivp && typeof p.ivp === 'object' ? p.ivp : {};
  const from = p.ivs[stat] || 0, tries = [];
  for (const sd of list) {
    const v = p.ivs[stat] || 0;
    if (v >= IV_MAX) break;
    s.seeds.splice(s.seeds.indexOf(sd), 1);
    const hit = (p.ivp[stat] || 0) + 1 >= ivpPity(v) || rng() < ivpChance(v);
    if (hit) { p.ivs[stat] = v + 1; p.ivp[stat] = 0; } else p.ivp[stat] = (p.ivp[stat] || 0) + 1;
    tries.push(hit ? 1 : 0);
  }
  const to = p.ivs[stat], okN = tries.filter(Boolean).length;
  if (to >= IV_MAX) p.ivp[stat] = 0;
  return { stat, from, to, used: tries.length, ok: okN, fail: tries.length - okN, tries, fails: p.ivp[stat] || 0, chance: to >= IV_MAX ? 0 : ivpChance(to), pity: to >= IV_MAX ? 0 : ivpPity(to) };
}
// 접목(완제품 접목 가지 — 속성·종이 맞아야, 상급은 다 자란 식물만)
//  카드 고르기로(2026-10-18 사용자 "접목하기 할 때 스킬 배워서 교체할 때처럼 · 보류하면 다시 접목 가지로", 2026-10-22 넣음):
//   접목 = 그 기술 카드 한 장짜리 고르기를 맨 앞에(어두운 화면에서 놓을 칸 고르기 · 바꾸기) — 가지는 고르기에 맡겨 둠(목록에서 빠짐)
//   확정(draftApply) = 가지를 씀 · 보류(graftHold) = 가지가 접목 가지 목록으로 돌아감(안 씀)
export function graft(s, id, scionId) {
  const p = getPlant(s, id), i = s.scions.findIndex(x => x.id === scionId);
  need(i >= 0, '그 접목 가지가 없어요');
  const sk = s.scions[i].skill, why = canGraft(p, sk);
  need(!why, why);
  need(!known(p).has(sk) && !(p.drafts || []).some(d => d.cands.includes(sk)), '이미 아는 기술이에요');   // 고르기로 기다리는 기술도(가지를 헛되이 쓰지 않게)
  normSkills(p);
  const [sc] = s.scions.splice(i, 1);
  (p.drafts = p.drafts || []).unshift({ kind: 'graft', part: 'skill', st: p.stage, lv: p.lv, pick: 1, cands: [sk], scion: sc });
  return { skill: sk, to: 'draft' };
}
// 접목 보류: 그 식물의 접목 고르기를 닫고 가지를 목록으로 돌려놓음
export function graftHold(s, id) {
  const p = getPlant(s, id), n = (p.drafts || []).findIndex(d => d.kind === 'graft');
  need(n >= 0, '보류할 접목이 없어요');
  const [d] = p.drafts.splice(n, 1);
  if (d.scion) s.scions.push(d.scion);
  return { scion: d.scion ? d.scion.id : null };
}
// 유전자 회귀 주사(완제품): 지운 기술 하나를 되돌림
export function regress(s, id, skill) {
  const p = getPlant(s, id), i = p.skills.forgot.indexOf(skill);
  need(i >= 0, '지운 기술이 아니에요');
  need((s.items.regress || 0) >= 1, '유전자 회귀 주사가 없어요');
  normSkills(p);
  const b = p.skills.battle;
  need(b.includes(null) || p.skills.store.length < SKILL_STORE, '칸이 다 찼어요 — 하나를 비우고 되돌려요');
  s.items.regress--; p.skills.forgot.splice(i, 1);
  return { skill, to: learnNow(p, skill) };
}
// 이름 · 화분 · 대표 식물 · 팀 · 전투 종류
export function rename(s, id, name) { const p = getPlant(s, id); const v = String(name || '').trim().slice(0, 10); need(v, '이름을 써 주세요'); p.name = v; return {}; }
export function setActive(s, i) { need(i >= 0 && i < s.plants.length, '없는 식물'); s.active = i; return {}; }
// 즐겨찾기(2026-10-17 사용자 "출전시킬 수 있는 식물 딱 나열해줘 · 즐겨찾기 기능도"): 대기실 고르기 목록 · 넘기기 화살표에서 앞에 옴
export function setFav(s, id, on) { const p = getPlant(s, id); if (on) p.fav = true; else delete p.fav; return { fav: !!p.fav }; }
export function setTeam(s, team) { need(Array.isArray(team) && team.length === 3 && new Set(team).size === 3 && team.every(i => i >= 0 && i < s.plants.length), '서로 다른 식물 셋을 골라 주세요'); s.team = team; return {}; }
export function setMode(s, mode) { need(['tournament', 'swap3'].includes(mode), '모르는 전투 종류'); s.mode = mode; return {}; }
export function setProfile(s, o) {
  const pf = s.profile;
  if (o.name != null) { const v = String(o.name).trim().slice(0, 12); need(v, '이름을 써 주세요'); pf.name = v; }
  if (o.title != null) { need(s.titles.includes(o.title), '없는 칭호'); pf.title = o.title; }
  if (o.avatar != null) { need(s.discovered.includes(o.avatar), '만난 식물만 대표로'); pf.avatar = o.avatar; }
  if (o.color != null) { const i = o.color | 0; need(i >= 0 && i < BANNER_LV.length, '없는 배너'); need((s.user.level || 1) >= BANNER_LV[i], `재배사 Lv${BANNER_LV[i]}에 열려요`); pf.color = i; }   // 배너 여덟(2026-10-22)
  if (o.rankHide != null) pf.rankHide = !!o.rankHide;   // 순위표에 이름 숨김(2026-10-22 — 기본 = 보임)
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
  const per = HARVEST.periodMin[p.stage] * MIN * harvestK(p), max = harvestMax(p);
  if (p.hv.have >= max) { p.hv.t0 = now; return p.hv; }
  const k = Math.floor((now - p.hv.t0) / per);
  if (k > 0) { p.hv.have = Math.min(max, p.hv.have + k); p.hv.t0 = p.hv.have >= max ? now : p.hv.t0 + k * per; }
  return p.hv;
}
export const harvestGauge = (p, now) => { harvestSync(p, now); return p.hv.have >= harvestMax(p) ? 1 : (now - p.hv.t0) / (HARVEST.periodMin[p.stage] * MIN * harvestK(p)); };
function rollFruit(s, p, rng) {
  const e = pickW(rng, HARVEST_TABLE), lvK = 1 + 0.15 * p.stage + 0.03 * p.lv;
  if (e.kind === 'credits') return { kind: 'credits', n: Math.round((e.big ? 90 : 25) * lvK), rar: e.rar };
  if (e.kind === 'water') return { kind: 'water', n: 1 + (rng() < 0.3 ? 1 : 0), rar: e.rar };
  if (e.kind === 'fert') return { kind: 'fert', n: 1, rar: e.rar };
  if (e.kind === 'seed') return { kind: 'seed', seed: seedOf(s, p.key, rng), rar: e.rar };
  if (e.kind === 'scion') return { kind: 'scion', skill: rollScion(rng, p, 0.2), rar: e.rar };
  if (e.kind === 'regress') return { kind: 'regress', n: 1, rar: e.rar };
  if (e.kind === 'parts') return { kind: 'parts', n: 1 + (rng() < 0.3 ? 1 : 0), rar: e.rar };
  return { kind: 'gems', n: 3, rar: e.rar };
}
// 스마트팜 물 · 비료 하루 상한(2026-10-23 사용자 "식물을 많이 키우면 애들 레벨업이 쉬움 레벨업을 어렵게"): 열매에서 나오는 물 · 비료는 하루(한국 날짜)
//  catalog.js FARM_DAY 까지 · 넘은 열매는 돈 30 — 식물이 많아도 성장 재료는 일정(전투 · 탐사 · 상점 보상은 그대로)
function farmCap(s, got, now) {
  const day = Math.floor((now + 9 * 3600e3) / 864e5);
  if (!s.farmDay || s.farmDay.day !== day) s.farmDay = { day, water: 0, fert: 0 };
  for (let i = 0; i < got.length; i++) {
    const r = got[i]; if (r.kind !== 'water' && r.kind !== 'fert') continue;
    const room = FARM_DAY[r.kind] - s.farmDay[r.kind];
    if (room <= 0) { got[i] = { kind: 'credits', n: 30, rar: 0 }; continue; }
    const n = Math.min(r.n, room); s.farmDay[r.kind] += n; if (n < r.n) got[i] = { ...r, n };
  }
}
export function harvest(s, id, rng, now) {
  const p = getPlant(s, id);
  harvestSync(p, now);
  need(p.hv.have > 0, '아직 맺힌 열매가 없어요');
  const got = [];
  for (let i = 0; i < p.hv.have; i++) got.push(rollFruit(s, p, rng));
  p.hv.have = 0; p.hv.t0 = now;
  farmCap(s, got, now);
  for (const r of got) grant(s, r);
  const xp = addXp(s, XP.harvest * got.length, rng);
  return { got, xp };
}
export function harvestAll(s, rng, now) {
  const got = [];
  for (const p of s.plants) { harvestSync(p, now); for (let i = 0; i < p.hv.have; i++) got.push(rollFruit(s, p, rng)); if (p.hv.have) { p.hv.have = 0; p.hv.t0 = now; } }
  need(got.length, '아직 맺힌 열매가 없어요');
  farmCap(s, got, now);
  for (const r of got) grant(s, r);
  const xp = addXp(s, XP.harvest * got.length, rng);
  return { got, xp };
}

// ── 보상 주기 ──
const ITEM_KEYS = ['water', 'fert', 'regress', 'fuel', 'parts', 'pack_n', 'pack_m', 'nutr'];   // nutr = 영양제(2026-10-22)   // 카드 꾸러미(일반 · 변이 — 2026-10-22, 식물 관리에서 열면 그 식물에 맞는 카드)
function give(s, r) {
  for (const k of ['credits', 'gems']) if (r[k]) s.wallet[k] += r[k];
  for (const k of ITEM_KEYS) if (r[k]) s.items[k] = (s.items[k] || 0) + r[k];
}
// 쿠폰 보상(2026-10-17 사용자 "쿠폰코드 입력해서 상품 주는거 가능? 테스트용으로 나나 친구나 좀 줘보게"):
//  보상 = { credits, gems, water, fert, regress, fuel, parts(수), seeds: ['common' | 'rare' …], cards: ['normal' | 'mut' | 카드 id …] }
//  cleanCoupon = 관리 도구가 보낸 값을 아는 칸 · 한도 안으로만(모르는 칸은 버림) · couponGive = 넣고 '받은 것' 판 목록(explore 의 got 과 같은 꼴)
const COUPON_N = { credits: 1e6, gems: 1e5, water: 1e4, fert: 1e4, regress: 1e3, fuel: 1e4, parts: 1e4 };
const COUPON_RAR = { credits: 0, gems: 4, water: 1, fert: 1, regress: 4, fuel: 1, parts: 1 };
export function cleanCoupon(raw = {}) {
  const r = {};
  for (const [k, cap] of Object.entries(COUPON_N)) { const n = Math.floor(+raw[k] || 0); if (n > 0) r[k] = Math.min(cap, n); }
  const seeds = [].concat(raw.seeds || []).filter(x => x === 'common' || x === 'rare').slice(0, 10);
  const cards = [].concat(raw.cards || []).filter(x => x === 'normal' || x === 'mut' || CARDS[x]).slice(0, 10);
  if (seeds.length) r.seeds = seeds;
  if (cards.length) r.cards = cards;
  return r;
}
export function couponGive(s, raw, rng) {
  const rw = cleanCoupon(raw), got = [], box = {};
  for (const k of Object.keys(COUPON_N)) if (rw[k]) { box[k] = rw[k]; got.push({ kind: k, n: rw[k], rar: COUPON_RAR[k] }); }
  give(s, box);
  for (const r of rw.seeds || []) { const sd = seedOf(s, rollSpecies(rng, r), rng), x = addSeed(s, sd); got.push({ kind: 'seed', seed: sd, rar: 3, ...(x || {}) }); }
  for (const c of rw.cards || []) {   // 'normal' · 'mut' = 꾸러미(식물에서 열기 — 2026-10-22) · 카드 id = 그 카드
    if (CARDS[c]) { grant(s, { kind: 'card', card: c }); got.push({ kind: 'card', card: c, rar: CARDS[c].rar }); continue; }
    const r = { kind: c === 'mut' ? 'pack_m' : 'pack_n', n: 1, rar: c === 'mut' ? 3 : 2 }; grant(s, r); got.push(r);
  }
  return got;
}
function grant(s, r) {
  if (r.kind === 'credits' || r.kind === 'gems') s.wallet[r.kind] += r.n;
  else if (ITEM_KEYS.includes(r.kind)) s.items[r.kind] = (s.items[r.kind] || 0) + r.n;
  else if (r.kind === 'seed') { const x = addSeed(s, r.seed); if (x) r.sold = x.sold; }   // 가방이 차서 팔렸으면 받은 것 판에 sold
  else if (r.kind === 'scion') s.scions.push({ id: uid(s), skill: r.skill });
  else if (r.kind === 'card') { normCards(s); addCard(s, r.card); }
}
export function rollSpecies(rng, rarity, pool) {
  const keys = (pool || Object.keys(SPECIES)).filter(k => !rarity || SPECIES[k].rarity === rarity);
  return pick(rng, keys.length ? keys : Object.keys(SPECIES));
}
// 종자 가방 한도(2026-10-18 사용자 "가방 한도도 만들되 넉넉히 · 꽉 찼을 때 종자 얻는 거 막을 방법"): 꽉 차면 보통 종자는 그 자리에서 종자 값에 팔림(받은 것 판에 sold) ·
//  전설 · 색 변종 · 변이 종자는 아까우니 넘어도 들어옴. 상점 종자 꾸러미는 꽉 차면 못 삼 · 탐사는 떠나기 전에 화면이 한 번 물음
export const SEED_MAX = 50;
// 종자 잠금 · 즐겨찾기(2026-10-18 사용자 "종자를 잠그거나 즐겨찾기하는 기능도" — 조사: 잠금 = 팔기 · 강화 재료 · 전체 선택에서 빠짐):
//  잠금(sd.lock) = 팔기 · 거름 막힘(심기는 됨) · 즐겨찾기(sd.fav) = 별 표시 · 목록 앞으로(보호는 잠금이 맡음)
export function markSeed(s, seedId, o = {}) {
  const sd = s.seeds.find(x => x.id === seedId);
  need(sd, '그 종자가 없어요');
  for (const k of ['lock', 'fav']) if (typeof o[k] === 'boolean') { if (o[k]) sd[k] = true; else delete sd[k]; }
  return { seed: sd.id, lock: !!sd.lock, fav: !!sd.fav };
}
export const specialSeed = sd => !!(sd && (sd.legend || sd.shiny || sd.form));
export function addSeed(s, sd) {
  if (s.seeds.length >= SEED_MAX && !specialSeed(sd)) { const n = seedPrice(sd); s.wallet.credits += n; return { sold: n }; }
  s.seeds.push(sd); return null;
}
// 잠재력(2026-10-18 사용자 "종자 별 1~3 → 식물처럼 별 5성까지 · 잠재력이라 부르자 · 종자가 4성이면 심을 때도 4성 · 그 안의 구성은 랜덤"):
//  종자 잠재력 1~5(무게 30 · 35 · 22 · 10 · 3, 좋은 굴림 ivk 번 더 굴려 큰 값 · 전설 = 5) → 심으면 개체값 합이 그 별 구간(11 · 21 · 31 · 41 문턱 — starsOf) 안에서 무작위, 칸 나눔도 무작위.
//  옛 종자(잠재력 없음) = 번호 · 좋은 굴림으로 정한 값(늘 같음)
//  2026-10-22 "너무 쉬움": 새 종자는 무게 42 · 34 · 17 · 6 · 1(4성 이상 13% → 7%), 좋은 굴림도 두 번에 한 번만 더 굴림(ivk 2 = 한 번 더). 옛 종자의 정해진 값은 옛 무게 그대로(바뀌지 않게)
const POT_W_OLD = [30, 35, 22, 10, 3], POT_W = [42, 34, 17, 6, 1], POT_SUM = [[5, 10], [11, 20], [21, 30], [31, 40], [41, 50]];
function rollPot(rng, ivk, W = POT_W, extra = Math.ceil(ivk / 2)) { let best = 1; for (let i = 0; i <= extra; i++) { let r = rng() * 100, k = 0; while (k < 4 && r >= W[k]) { r -= W[k]; k++; } best = Math.max(best, k + 1); } return best; }
export const potOf = sd => { if (!sd) return 1; if (sd.legend) return 5; if (sd.pot >= 1 && sd.pot <= 5) return sd.pot; let h = 0; for (const c of String(sd.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; let a = h; return rollPot(() => { a = (a * 1103515245 + 12345) >>> 0; return a / 4294967296; }, sd.ivk || 0, POT_W_OLD, sd.ivk || 0); };
export function seedOf(s, key, rng, o = {}) {
  const shiny = o.shiny ?? rng() < SHINY_P, legend = !!o.legend;
  const sd = { id: uid(s), key, shiny, legend };
  if (o.ivk > 0) sd.ivk = o.ivk;   // 좋은 굴림(탐사 종자) — 잠재력을 이만큼 더 굴려 큰 값
  sd.pot = legend ? 5 : rollPot(rng, o.ivk || 0);   // 잠재력 = 심으면 그 별(2026-10-18)
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
  const b = SELL_BASE[SPECIES[p.key].rarity] || 40, k = (1 + 0.5 * p.stage) * (p.legend ? 5 : p.shiny ? 3 : 1);
  return Math.round(b * k + 0.5 * p.invest);   // 들인 것(물 · 비료 · 강화 돈)의 50%(2026-10-18 — 식물 거름을 없애며 25% → 50%)
}
const takePlant = (s, id) => {
  let i = s.plants.findIndex(x => x.uid === id);
  normCards(s);
  if (i >= 0) { need(s.plants.length > 1, '스마트팜에 하나는 남겨 둬요'); const p = s.plants.splice(i, 1)[0]; fixActive(s); p.cardCredits = releaseCards(s, p); return p; }
  i = s.storage.findIndex(x => x.uid === id); need(i >= 0, '그 식물이 없어요');
  const p = s.storage.splice(i, 1)[0]; p.cardCredits = releaseCards(s, p); return p;
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
  return { credits: n + (p.cardCredits || 0), cards: p.cardCredits || 0, name: p.name };   // 끼운 카드 팔 값은 takePlant 에서 이미 더함
}
// 종자 팔기(돈 출처 — 사용자 2026-10-16 "판매-씨앗, 키운 식물, 주운 물건")
// 종자 값: 별(잠재력)이 높을수록 비싸게(2026-10-22 사용자 "종자의 경우 별 수에 따라서 효과나 차이점?을 넣으면 좋겠는데 이건 너가 고민해서" — 별 하나마다 +25%,
//  별 다섯 = 두 배 · 전설은 늘 별 다섯이라 따로 곱하지 않음)
export const seedStarMul = sd => (sd.legend ? 1 : 1 + 0.25 * (potOf(sd) - 1));
export const seedPrice = sd => Math.round((SELL_BASE[SPECIES[sd.key].rarity] || 40) * 0.5 * (sd.legend ? 8 : sd.shiny ? 4 : 1) * seedStarMul(sd));
export function sellSeed(s, seedId) {
  const i = s.seeds.findIndex(x => x.id === seedId);
  need(i >= 0, '그 종자가 없어요');
  need(!s.seeds[i].lock, '잠긴 종자예요 — 잠금을 풀고 팔아요');
  const sd = s.seeds.splice(i, 1)[0], n = seedPrice(sd);
  s.wallet.credits += n;
  return { credits: n, key: sd.key };
}
// 여러 종자 한 번에 팔기(2026-10-22 가방 꾹 = 고르기 모드): 잠긴 종자 · 없는 종자는 건너뜀, 하나도 못 팔면 막힘
export function sellSeeds(s, ids) {
  need(Array.isArray(ids) && ids.length > 0, '팔 종자를 골라 주세요');
  let credits = 0, n = 0;
  for (const id of new Set(ids)) {
    const i = s.seeds.findIndex(x => x.id === id);
    if (i < 0 || s.seeds[i].lock) continue;
    credits += seedPrice(s.seeds.splice(i, 1)[0]); n++;
  }
  need(n > 0, '팔 수 있는 종자가 없어요');
  s.wallet.credits += credits;
  return { credits, n };
}
export function dismantle(s, id, rng) {
  const p = takePlant(s, id), q = Math.min(1, p.invest / 1500 + 0.25 * p.stage + (p.lv - 1) * 0.03), got = [];
  const n = 1 + p.stage + (p.lv >= 4 ? 1 : 0) + Math.min(3, Math.floor(p.invest / 600));   // 들인 만큼 더(2026-10-18 — 600마다 한 칸, 셋까지)
  for (let i = 0; i < n; i++) {
    const r = rng();
    if (r < 0.7) got.push({ kind: 'scion', skill: rollScion(rng, p, q), rar: 3 });
    else if (r < 0.8 + 0.05 * q) got.push({ kind: 'regress', n: 1, rar: 4 });
    else got.push({ kind: rng() < 0.5 ? 'water' : 'fert', n: 2, rar: 1 });
  }
  if (rng() < (p.form ? 0.5 : 0.25) + 0.25 * q) { const c = rollCard(rng, p.form || 'normal'); got.push({ kind: 'card', card: c, rar: CARDS[c].rar }); }   // 카드(2026-10-17)
  got.push({ kind: 'parts', n: 1 + p.stage + (p.lv >= 4 ? 1 : 0), rar: 1 });   // 부품(2026-10-17) — 해체하면 늘 조금
  for (const r of got) grant(s, r);
  if (p.cardCredits) got.push({ kind: 'credits', n: p.cardCredits, rar: 0 });   // 끼웠던 카드 = 팔 값(돈은 takePlant 에서 이미 더함)
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
// 개체값 다섯째 '열매'가 없는 옛 식물: 식물 번호로 정한 값(화면 · 서버가 같게) · 옛 열매용 = 8 이상 · 전설 = 7 이상, 옛 딱지(trait)는 지움
// 별 되돌리기(2026-10-18 사용자 "이미 유저가 갖고 있던 5성 4성이 된 거 다시 5성으로"): 별 기준이 다섯 칸 합(41 · 31 · 21 · 11)으로 바뀌며 넷일 때 별(33 · 25 · 17 · 9)보다 줄어든 옛 식물 →
//  열매 값을 그때 별이 되는 만큼만 올림(한 번 — ivFix). 옛 식물 = 다섯째가 들어오기 전에 핀 것(born) · 또는 열매 값이 옮길 때 정한 값 그대로인 것(올리기 전 서버에서 핀 것)
const IV5_AT = Date.parse('2026-10-18T01:06:00+09:00');
const stars4 = ivs => { const t = ['hp', 'atk', 'def', 'spd'].reduce((a, k) => a + (ivs[k] || 0), 0); return t >= 33 ? 5 : t >= 25 ? 4 : t >= 17 ? 3 : t >= 9 ? 2 : 1; };
function fruitOfUid(p) {
  let h = 0; for (const c of String(p.uid)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let v = h % (IV_MAX + 1);
  if (p.trait === 'fruity') v = Math.max(v, 8);
  if (p.legend) v = Math.max(v, 7);
  return v;
}
export function normIvs(p) {
  if (!p.ivs) return p;
  const moved = p.ivs.fruit == null;
  if (moved) { p.ivs.fruit = fruitOfUid(p); delete p.trait; }
  if (!p.ivFix) {
    if (moved || !(p.born >= IV5_AT) || p.ivs.fruit === fruitOfUid(p)) {
      const want = stars4(p.ivs);
      while (starsOf(p.ivs) < want && p.ivs.fruit < IV_MAX) p.ivs.fruit++;
    }
    p.ivFix = 1;
  }
  return p;
}
export function syncTimers(s, now) { fuelSync(s, now); for (const p of s.plants) { normIvs(p); harvestSync(p, now); normSkills(p); } for (const p of s.storage || []) { normIvs(p); normSkills(p); } normCards(s); seasonSync(s, now); return s; }
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
  if (x === 'card') return rng() < Math.min(0.6, 0.2 * (pl.mut || 1)) ? { kind: 'pack_m', n: 1, rar: 3 } : { kind: 'pack_n', n: 1, rar: 2 };   // 카드 = 꾸러미(식물에서 열면 그 식물에 맞는 카드 — 2026-10-22, 전엔 바로 카드 한 장)
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
  need(!it.give.seed || s.seeds.length < SEED_MAX, `종자 가방이 꽉 찼어요(${SEED_MAX}) — 심거나 팔아요`);
  for (const [k, v] of Object.entries(it.cost)) s.wallet[k] -= v;
  const g = it.give;
  if (g.seed) { const sd = seedOf(s, rollSpecies(rng, g.seed), rng); s.seeds.push(sd); return { seed: sd }; }
  give(s, g);   // 카드 꾸러미(pack_n · pack_m)도 물건으로 가방에 — 식물 관리에서 열면 그 식물에 맞는 카드(openPack)
  return { give: g };
}

// ── 카드 꾸러미 · 강화 · 팔기(2026-10-22 사용자 "상점에서 산 것등은 식물 설정에 들어가서 활성화하면 그 식물에 해당하는게 나오는 걸로" · "중복된 카드는 어떻게 처리할지" · "패시브 카드의 경우 강화 기능") ──
//  꾸러미 열기 = 고른 식물에 맞는 카드 한 장이 가방에: 일반 식물 = 일반 꾸러미 → 일반 카드 · 변이 식물 = 변이 꾸러미 → 그 변이 카드(part 'skill' = 기술 카드 · 'passive' = 패시브 카드 — 연 탭대로)
export function openPack(s, id, part, rng) {
  const p = getPlant(s, id), k = p.form ? 'pack_m' : 'pack_n', skill = part === 'skill';
  need(!skill || p.form, '일반 식물은 패시브 카드만 받아요');
  need((s.items[k] || 0) >= 1, `${ITEMS[k].name}가 없어요 — 상점에서 사요`);
  normCards(s);
  const ids = p.form ? formCards(p.form).filter(c => isSkillCard(c) === skill) : NORMAL_CARDS;
  need(ids.length, '이 식물에 맞는 카드가 없어요');
  s.items[k] -= 1;
  const card = rollFrom(rng, ids);
  addCard(s, card);
  return { card, pack: k, left: s.items[k] };
}
// 강화 = 가방의 같은 카드 두 장 + 돈 → 한 단계 위 카드 한 장(끼운 카드는 빼고 가방에 있는 것만)
export function cardUp(s, id) {
  normCards(s);
  const c = CARDS[id];
  need(c && c.next, c && c.form ? '변이 카드는 강화하지 않아요' : '더 강화할 수 없는 카드예요');
  const n = CARD_UP.need, cost = CARD_UP.credits[c.lv || 1];
  need((s.cards[id] || 0) >= n, `같은 카드가 가방에 ${n}장 있어야 해요`);
  need(s.wallet.credits >= cost, '돈이 모자라요');
  s.wallet.credits -= cost;
  s.cards[id] -= n; if (s.cards[id] <= 0) delete s.cards[id];
  addCard(s, c.next);
  return { from: id, to: c.next, cost };
}
// 버리기 = 식물 보관(스킬 보관 · 패시브 보관)의 카드 한 장 → 팔 값만큼 돈(귀속이라 가방으로는 못 감 — 2026-10-22)
export function discardCard(s, id, card) {
  const p = getPlant(s, id); normSkills(p); normCards(s);
  need(CARDS[card], '카드가 아니에요');
  const st = p.skills.store.indexOf(card), ps = (p.pstore || []).indexOf(card);
  need(st >= 0 || ps >= 0, '보관에 있는 카드만 버려요 — 장착한 카드는 먼저 해제해요');
  if (st >= 0) p.skills.store.splice(st, 1); else p.pstore.splice(ps, 1);
  const n = cardPrice(card);
  s.wallet.credits += n;
  return { credits: n, card };
}
// 팔기 = 가방의 카드 한 장 → 돈(남는 카드 · 강화할 수 없는 카드)
export function sellCard(s, id) {
  normCards(s);
  need(CARDS[id] && (s.cards[id] || 0) >= 1, '가방에 그 카드가 없어요');
  const n = cardPrice(id);
  s.cards[id] -= 1; if (s.cards[id] <= 0) delete s.cards[id];
  s.wallet.credits += n;
  return { credits: n, card: id };
}

// ── 재배사 경험치 · 레벨업 보상(클래시로얄처럼 상자 — 화면이 pending을 열어 보여 줌) ──
export function addXp(s, n, rng) {
  const u = s.user, ups = [];
  u.xp += n;
  while (u.xp >= userNeed(u.level)) {
    u.xp -= userNeed(u.level); u.level++;
    const r = levelReward(u.level), box = { ...r };
    give(s, r);
    if (r.seed) { const sd = seedOf(s, rollSpecies(rng, r.seed), rng), x = addSeed(s, sd); box.seed = sd; if (x) box.seedSold = x.sold; }
    s.pending.push({ kind: 'level', level: u.level, box, slots: farmSlots(u.level) });
    ups.push(u.level);
  }
  return { gained: n, ups };
}
export function ackPending(s, n) { s.pending.splice(0, Math.max(1, n | 0)); return {}; }

// ── 전투 보상(서버가 결과를 확인한 뒤에만) ──
export const ROUNDS = ['예선', '16강', '8강', '4강', '결승'];
// ── 리그 · 시즌 ── s.tournament = 지금 고른 리그의 기록(다른 화면 · 서버가 그대로 읽음), s.leagues = 리그마다 기록 보관, s.league = 고른 리그
const freshT = (lg, tier = '브론즈') => ({ tier, name: `${LEAGUES[lg].short} ${tier}`, round: '예선', wins: 0, losses: 0, bestOf: roundBest(TIERS.indexOf(tier)), pts: 0 });
export const winsNeed = T => Math.ceil((T.bestOf || 5) / 2);   // 라운드 통과(그만큼 지면 라운드 실패)
export function leaguesOf(s) {
  if (!s.league || !LEAGUES[s.league]) s.league = 'sprout';
  if (!s.leagues) s.leagues = {};
  for (const k of LEAGUE_KEYS) if (!s.leagues[k]) s.leagues[k] = k === s.league && s.tournament ? { ...s.tournament } : freshT(k);
  if (!s.tournament) s.tournament = { ...s.leagues[s.league] };
  for (const T of [s.tournament, ...Object.values(s.leagues)]) T.bestOf = roundBest(Math.max(0, TIERS.indexOf(T.tier)));   // 옛 기록(모두 5판) → 단계대로(2026-10-22)
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
// 시즌 넘김 자리(2026-10-23 사용자 추천안 승인 — 예전 클래시 로얄식): 골드 IV 0점(SEASON_FLOOR) 위로 올라간 점수의 절반만 남김 · 그 아래는 칸 · 점수까지 그대로 · 높을수록 많이 내려가도 순서는 그대로
export function seasonCarry(T) {
  const top = TIERS.length - 1, t = Math.max(0, TIERS.indexOf(T.tier)), v = t * TIER_PTS + Math.max(0, T.pts || 0);
  const nv = v > SEASON_FLOOR ? SEASON_FLOOR + Math.floor((v - SEASON_FLOOR) / 2) : v, nt = Math.min(top, Math.floor(nv / TIER_PTS));
  return { tier: TIERS[nt], pts: nv - nt * TIER_PTS };
}
// 시즌 넘김(상태를 맞출 때마다): 지난 시즌 최고 단계로 상자 · 칭호 → 리그마다 seasonCarry 자리에서 예선부터(전엔 모두 두 단계 내려감)
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
  for (const k of LEAGUE_KEYS) { const c = seasonCarry(s.leagues[k]); s.leagues[k] = { ...freshT(k, c.tier), pts: c.pts, stars: isTopTier(c.tier) ? Math.floor(c.pts / DIV_PTS) : 0 }; }
  s.tournament = { ...s.leagues[s.league] };
  s.season = { n, best: Object.fromEntries(LEAGUE_KEYS.map(k => [k, TIERS.indexOf(s.leagues[k].tier)])) };
}
// 이긴 판 덤 = 돈 말고 하나까지(2026-10-22 사용자 "승리시 보상이 너무 다양해 … 한 번에 나오는 보상수는 적절히 조율하자" — 전엔 물 · 비료 · 연료 · 부품을 따로 굴려 넷까지)
function winBonus(r, rng, table) {
  if (rng() >= 0.75) return;
  let x = rng() * table.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of table) { x -= w; if (x <= 0) { r[k] = k === 'water' ? 1 + (rng() < 0.3 ? 1 : 0) : 1; return; } }
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
    if (win) winBonus(r, rng, [['fuel', 55], ['parts', 45]]);
  } else {
    const tier = TIERS.indexOf(s.tournament.tier);
    r.credits = win ? 60 + 15 * tier : 15;
    if (win) winBonus(r, rng, [['water', 40], ['parts', 30], ['fuel', 18], ['fert', 12]]);   // 부품(2026-10-17)
    if (mode === 'swap3') s.swap3[win ? 'wins' : 'losses']++;
    else {
      const T = s.tournament, from = rankNow(T); T.bestOf = roundBest(tier); const nW = winsNeed(T); T[win ? 'wins' : 'losses']++;
      if (T.wins >= nW) {   // 이번 라운드 통과 → 다음 라운드 · 결승 통과 = 우승(그 대회 끝 → 다음 대회 예선부터)
        const i = Math.max(0, ROUNDS.indexOf(T.round));
        if (i >= ROUNDS.length - 1) { r.champ = true; T.round = ROUNDS[0]; if (T.guard > 0) T.guard--; }   // 우승 = 그 대회 끝(승급 보호 한 번 씀 — 단계를 올린 대회는 addRankPts 가 다시 채움)
        else T.round = ROUNDS[i + 1];
        T.wins = 0; T.losses = 0; r.round = T.round; r.parts = (r.parts || 0) + 2;   // 라운드 통과 = 부품 2
        addRankPts(s, T, ROUND_PTS[i], r);
      } else if (T.losses >= nW) r.reset = loseRound(s, T, r);
      r.rank = { from, to: rankNow(T) };   // 결과 화면 점수 막대 연출(scenes/rankfx.js)
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
  const T = s.tournament, from = rankNow(T); T.bestOf = roundBest(Math.max(0, TIERS.indexOf(T.tier))); T.losses++;
  const r = { forfeit: true };
  if (T.losses >= winsNeed(T)) r.reset = loseRound(s, T, r);
  r.rank = { from, to: rankNow(T) };
  return r;
}
const rankNow = T => ({ tier: T.tier, pts: T.pts || 0, stars: T.stars || 0, guard: T.guard || 0 });   // 판 앞뒤 대회 자리(점수 막대 연출)
const linOf = T => Math.max(0, TIERS.indexOf(T.tier)) * TIER_PTS + (T.pts || 0);   // 브론즈 IV 0점 = 0부터 이어 센 자리(풀로세움 = 2400 + 점수)
// 대회 점수 더하기(라운드 통과 · 우승 — catalog.js ROUND_PTS): 100점을 넘을 때마다 보상(칸 · 맨 위는 별) · 칸 넷(400점)이면 다음 단계, 남는 점수는 넘어가고 대회는 이어서
//  (다음 라운드부터 새 단계 상대 · 판 수) · 단계가 오르면 승급 보호 GUARD_CUPS번(대회 중에 올랐으면 그 대회는 빼고 셈) · 풀로세움은 위가 없고 별 = 100점마다 하나
//  r.rankPts = 얻은 점수 · r.divUp = 오른 칸('브론즈 III' · 맨 위 = '풀로세움') · r.tierUp = 오른 단계 · r.starUp = 별 수(맨 위)
function addRankPts(s, T, n, r) {
  if (!n) return;
  const p0 = T.pts || 0, ups = Math.floor((p0 + n) / DIV_PTS) - Math.floor(p0 / DIV_PTS);
  T.pts = p0 + n; r.rankPts = (r.rankPts || 0) + n;
  if (ups > 0) { r.credits += DIV_REWARD.credits * ups; r.parts = (r.parts || 0) + DIV_REWARD.parts * ups; }
  while (T.pts >= TIER_PTS && !isTopTier(T.tier)) {
    T.pts -= TIER_PTS; T.tier = TIERS[TIERS.indexOf(T.tier) + 1]; T.name = `${LEAGUES[s.league || 'sprout'].short} ${T.tier}`; T.bestOf = roundBest(TIERS.indexOf(T.tier)); r.tierUp = T.tier;
    T.guard = GUARD_CUPS + (T.round !== ROUNDS[0] ? 1 : 0);
    leaguesOf(s); if (s.season) s.season.best[s.league] = Math.max(s.season.best[s.league] || 0, TIERS.indexOf(T.tier));   // 시즌 최고 기록
  }
  if (isTopTier(T.tier)) { T.stars = Math.floor(T.pts / DIV_PTS); if (ups > 0) r.starUp = T.stars; }
  if (ups > 0) r.divUp = rankOf(T);
}
// 라운드 실패(그 라운드에서 질 만큼 짐) = 그 대회 끝 → 다음 대회는 예선부터 = 'cup'(2026-10-23 사용자 안 C — 전엔 브론즈 그 라운드 처음부터 · 실버 ~ 다이아 한 라운드 전 ·
//  마스터 이상 예선부터). 예선 탈락 −10 · 16강 탈락 −5 · 8강부터 감점 없음(풀로세움도 같음). 0점 아래로 가면 아래 단계 I칸(단계 강등 · 풀로세움 → 마스터 I) —
//  단, 브론즈 IV 0점이 바닥 · 승급 보호가 남아 있으면 그 단계 0점에서 멈춤(보호는 대회가 끝날 때마다 하나씩 씀). r.divDown = 내려간 칸 · r.tierDown = 내려간 단계
function loseRound(s, T, r) {
  const i = Math.max(0, ROUNDS.indexOf(T.round)), lose = LOSE_PTS[i] || 0, guarded = (T.guard || 0) > 0, v0 = linOf(T);
  T.wins = 0; T.losses = 0; T.round = ROUNDS[0];
  if (guarded) T.guard--;
  if (!lose) return 'cup';
  let t = Math.max(0, TIERS.indexOf(T.tier)), p = (T.pts || 0) - lose;
  if (p < 0 && (t === 0 || guarded)) p = 0;
  if (p < 0) { t--; p += TIER_PTS; T.tier = TIERS[t]; T.name = `${LEAGUES[s.league || 'sprout'].short} ${T.tier}`; T.bestOf = roundBest(t); T.guard = 0; r.tierDown = T.tier; }
  T.pts = p; T.stars = isTopTier(T.tier) ? Math.floor(p / DIV_PTS) : 0;
  const v1 = linOf(T);
  if (v1 !== v0) { r.rankPts = v1 - v0; if (Math.floor(v1 / DIV_PTS) < Math.floor(v0 / DIV_PTS)) r.divDown = rankOf(T); }
  return 'cup';
}
