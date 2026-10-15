// 풀로세움 v2 게임 규칙(서버·화면 공용, 순수 함수 — 시각 now·난수 rng를 밖에서 받음). 서버가 이 규칙으로만 진행을 바꿈(치트 방지 — 2026-06-26 서버 권위 설계).
// 표 = catalog.js. 모든 함수는 state를 그 자리에서 바꾸고 화면에 보여 줄 결과를 돌려줌. 안 되는 일은 Err(사용자에게 보일 한국어 문구)를 던짐.
import {
  SPECIES, SKILLS, STAGES, LV_MAX, growNeed, FEED, PTS_PER_LV, IV_KEYS, IV_MAX, UP_GAIN, STAGE_MUL, upCost, resetCost, starsOf,
  uniqueOf, bloomPool, canGraft, userNeed, XP, farmSlots, levelReward, HARVEST, harvestMax, HARVEST_TABLE, PLANETS, ORBIT_LV, FUEL,
  SHINY_P, LEGEND_P, TRAIT_P, SHOP, SELL_BASE, STARTERS, ITEMS,
} from './catalog.js';

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
    items: { water: 6, fert: 2, regress: 0, fuel: FUEL.max }, fuelT: now,
    scions: [], seeds: [], plants: [], storage: [], active: 0, team: [], mode: 'tournament',
    tournament: { tier: '브론즈', name: '새싹 브론즈', round: '예선', wins: 0, losses: 0, bestOf: 5, pts: 0 },
    swap3: { wins: 0, losses: 0 }, pvp: { wins: 0, losses: 0 },
    discovered: [], pending: [],
  };
  s.plants.push(makePlant(s, { key: starter }, rng, now));
  for (let i = 0; i < 2; i++) s.seeds.push(seedOf(s, rollSpecies(rng, 'common'), rng));
  return s;
}

// ── 식물 ──
export function makePlant(s, seed, rng, now) {
  const sp = SPECIES[seed.key];
  need(sp, '모르는 식물');
  const ivs = Object.fromEntries(IV_KEYS.map(k => [k, Math.floor(rng() * (IV_MAX + 1))]));
  if (seed.legend) for (const k of IV_KEYS) ivs[k] = Math.max(ivs[k], 7);
  const p = {
    uid: uid(s), key: seed.key, name: (seed.legend ? '전설의 ' : '') + sp.name, stage: 0, lv: 1, gxp: 0, ivs,
    shiny: !!seed.shiny, legend: !!seed.legend, trait: seed.trait || null,
    pts: 0, up: {}, spent: 0, invest: 0, pot: 'pot_terra', born: now,
    skills: { battle: [null, null, null], joker: null, forgot: [], learned: [] }, pend: [],
    hv: { t0: now, have: 0 },
  };
  // 처음 기술 = 어린 개성 기술 + 하급 공통 하나(속성 · 종 중)
  learnNow(p, uniqueOf(p.key, 0));
  const c1 = bloomPool(p.key, 0).filter(x => x.id !== uniqueOf(p.key, 0));
  if (c1.length) learnNow(p, pickW(rng, c1).id);
  if (!s.discovered.includes(p.key)) s.discovered.push(p.key);
  return p;
}
const known = p => new Set([...p.skills.battle.filter(Boolean), p.skills.joker, ...p.skills.forgot, ...p.pend].filter(Boolean));
// 새 기술 놓기: 빈 전투 칸 → 빈 조커 칸 → 다 차면 '고르기 대기'(pend — 화면이 무엇을 지울지 물음)
function learnNow(p, id) {
  const b = p.skills.battle, i = b.indexOf(null);
  if (!p.skills.learned.includes(id)) p.skills.learned.push(id);
  if (i >= 0) { b[i] = id; return 'battle'; }
  if (!p.skills.joker) { p.skills.joker = id; return 'joker'; }
  p.pend.push(id); return 'pend';
}
export const findPlant = (s, id) => s.plants.find(p => p.uid === id) || null;
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
  need((s.items[kind] || 0) >= n && n >= 1, `${ITEMS[kind].name}이 모자라요`);
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
  const xp = addXp(s, XP.evolve);
  return { stage: p.stage, got, xp };
}
// 꽉 찬 칸 정리: 기다리는 새 기술을 전투 칸(b0~b2)·조커에 놓고 원래 기술은 '지운 기술'로, 또는 새 기술을 안 배움(skip — 지운 기술로)
export function placePending(s, id, skill, target) {
  const p = getPlant(s, id), i = p.pend.indexOf(skill);
  need(i >= 0, '기다리는 기술이 아니에요');
  p.pend.splice(i, 1);
  if (target === 'skip') { p.skills.forgot.push(skill); return { forgot: skill }; }
  const slot = target === 'joker' ? 'joker' : +String(target).replace('b', '');
  need(slot === 'joker' || (slot >= 0 && slot < 3), '놓을 칸을 골라 주세요');
  const old = slot === 'joker' ? p.skills.joker : p.skills.battle[slot];
  if (slot === 'joker') p.skills.joker = skill; else p.skills.battle[slot] = skill;
  if (old) p.skills.forgot.push(old);
  return { forgot: old };
}
// 전투 칸 ↔ 조커 자리 바꾸기
export function swapJoker(s, id, slot) {
  const p = getPlant(s, id), b = p.skills.battle;
  need(slot >= 0 && slot < 3, '칸을 골라 주세요');
  [b[slot], p.skills.joker] = [p.skills.joker, b[slot]];
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
  const b = p.skills.battle;
  need(b.includes(null) || !p.skills.joker, '칸이 다 찼어요 — 하나를 비우고 되돌려요');
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
  const xp = addXp(s, XP.plant);
  return { plant: p.uid, xp };
}
export function toStorage(s, id) {
  const p = getPlant(s, id);
  need(s.plants.length > 1, '스마트팜에 하나는 남겨 둬요');
  s.plants.splice(s.plants.indexOf(p), 1); s.storage.push(p); fixActive(s);
  return {};
}
export function fromStorage(s, id, now) {
  const i = s.storage.findIndex(x => x.uid === id);
  need(i >= 0, '보관고에 없어요');
  need(freeSlots(s) > 0, '스마트팜 자리가 없어요');
  const p = s.storage.splice(i, 1)[0]; p.hv = { t0: now, have: 0 }; s.plants.push(p);
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
  const xp = addXp(s, XP.harvest * got.length);
  return { got, xp };
}
export function harvestAll(s, rng, now) {
  const got = [];
  for (const p of s.plants) { harvestSync(p, now); for (let i = 0; i < p.hv.have; i++) got.push(rollFruit(s, p, rng)); if (p.hv.have) { p.hv.have = 0; p.hv.t0 = now; } }
  need(got.length, '아직 맺힌 열매가 없어요');
  for (const r of got) grant(s, r);
  const xp = addXp(s, XP.harvest * got.length);
  return { got, xp };
}

// ── 보상 주기 ──
function give(s, r) {
  for (const k of ['credits', 'gems']) if (r[k]) s.wallet[k] += r[k];
  for (const k of ['water', 'fert', 'regress', 'fuel']) if (r[k]) s.items[k] = (s.items[k] || 0) + r[k];
}
function grant(s, r) {
  if (r.kind === 'credits' || r.kind === 'gems') s.wallet[r.kind] += r.n;
  else if (r.kind === 'water' || r.kind === 'fert' || r.kind === 'regress' || r.kind === 'fuel') s.items[r.kind] = (s.items[r.kind] || 0) + r.n;
  else if (r.kind === 'seed') s.seeds.push(r.seed);
  else if (r.kind === 'scion') s.scions.push({ id: uid(s), skill: r.skill });
}
export function rollSpecies(rng, rarity, pool) {
  const keys = (pool || Object.keys(SPECIES)).filter(k => !rarity || SPECIES[k].rarity === rarity);
  return pick(rng, keys.length ? keys : Object.keys(SPECIES));
}
export function seedOf(s, key, rng, o = {}) {
  const shiny = o.shiny ?? rng() < SHINY_P, legend = !!o.legend, t = rng();
  return { id: uid(s), key, shiny, legend, trait: t < TRAIT_P / 2 ? 'fruity' : t < TRAIT_P ? 'ornamental' : null };
}
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
  if (i >= 0) { need(s.plants.length > 1, '스마트팜에 하나는 남겨 둬요'); const p = s.plants.splice(i, 1)[0]; fixActive(s); return p; }
  i = s.storage.findIndex(x => x.uid === id); need(i >= 0, '그 식물이 없어요');
  return s.storage.splice(i, 1)[0];
};
export function sell(s, id) {
  const p = takePlant(s, id), n = sellPrice(p);
  s.wallet.credits += n;
  return { credits: n, name: p.name };
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
  for (const r of got) grant(s, r);
  return { got, name: p.name };
}

// ── 탐사(연료 1 — 12분에 1씩 참, 최대 5) ──
export function fuelSync(s, now) {
  const per = FUEL.regenMin * MIN;
  if (s.items.fuel >= FUEL.max) { s.fuelT = now; return s.items.fuel; }
  const k = Math.floor((now - s.fuelT) / per);
  if (k > 0) { s.items.fuel = Math.min(FUEL.max, s.items.fuel + k); s.fuelT = s.items.fuel >= FUEL.max ? now : s.fuelT + k * per; }
  return s.items.fuel;
}
export const planetOpen = (s, pl) => s.user.level >= ORBIT_LV[pl.orbit];
export function explore(s, planetId, rng, now) {
  const pl = PLANETS.find(x => x.id === planetId);
  need(pl, '모르는 행성');
  need(planetOpen(s, pl), `재배사 Lv${ORBIT_LV[pl.orbit]}부터 갈 수 있어요`);
  fuelSync(s, now);
  need(s.items.fuel >= 1, '탐사 연료가 없어요 — 조금 기다리면 차요');
  s.items.fuel--;
  const got = [], rich = 1 + (pl.orbit - 1) * 0.35;
  // 종자 하나는 거의 늘(희귀 식물은 드물게), 그 밖에 돈·물·비료, 드물게 접목 가지·회귀 주사, 아주 드물게 색 변종·전설
  if (rng() < 0.85) {
    const pool = pl.pool.filter(k => SPECIES[k].rarity === 'common'), rare = pl.pool.filter(k => SPECIES[k].rarity === 'rare');
    const key = rare.length && rng() < 0.18 ? pick(rng, rare) : pick(rng, pool.length ? pool : pl.pool);
    const legend = !!pl.legend && rng() < LEGEND_P;
    got.push({ kind: 'seed', seed: seedOf(s, key, rng, { legend }), rar: legend ? 4 : SPECIES[key].rarity === 'rare' ? 2 : 1 });
  }
  got.push({ kind: 'credits', n: Math.round((40 + rng() * 60) * rich), rar: 0 });
  if (rng() < 0.55) got.push({ kind: rng() < 0.65 ? 'water' : 'fert', n: 1 + Math.floor(rng() * 2), rar: 1 });
  if (rng() < 0.08 * rich) got.push({ kind: 'scion', skill: rollScion(rng, { key: pick(rng, pl.pool) }, 0.3 * rich - 0.3), rar: 3 });
  if (rng() < 0.03) got.push({ kind: 'regress', n: 1, rar: 4 });
  for (const r of got) grant(s, r);
  for (const r of got) if (r.kind === 'seed' && !s.discovered.includes(r.seed.key)) s.discovered.push(r.seed.key);
  const xp = addXp(s, XP.explore);
  return { planet: pl.name, got, xp };
}

// ── 상점 ──
export function buy(s, itemId, rng) {
  const it = SHOP.find(x => x.id === itemId);
  need(it, '없는 물건');
  for (const [k, v] of Object.entries(it.cost)) need(s.wallet[k] >= v, k === 'gems' ? '보석이 모자라요' : '돈이 모자라요');
  for (const [k, v] of Object.entries(it.cost)) s.wallet[k] -= v;
  const g = it.give;
  if (g.seed) { const sd = seedOf(s, rollSpecies(rng, g.seed), rng); s.seeds.push(sd); return { seed: sd }; }
  give(s, g);
  return { give: g };
}

// ── 재배사 경험치 · 레벨업 보상(클래시로얄처럼 상자 — 화면이 pending을 열어 보여 줌) ──
export function addXp(s, n) {
  const u = s.user, ups = [];
  u.xp += n;
  while (u.xp >= userNeed(u.level)) {
    u.xp -= userNeed(u.level); u.level++;
    const r = levelReward(u.level), box = { ...r };
    give(s, r);
    if (r.seed) { const sd = seedOf(s, rollSpecies(Math.random, r.seed), Math.random); s.seeds.push(sd); box.seed = sd; }
    s.pending.push({ kind: 'level', level: u.level, box, slots: farmSlots(u.level) });
    ups.push(u.level);
  }
  return { gained: n, ups };
}
export function ackPending(s, n) { s.pending.splice(0, Math.max(1, n | 0)); return {}; }

// ── 전투 보상(서버가 결과를 확인한 뒤에만) ──
const ROUNDS = ['예선', '16강', '8강', '4강', '결승'];
const TIERS = ['브론즈', '실버', '골드', '플래티넘', '다이아', '마스터', '풀로세움'];
export function battleReward(s, { mode, win, rng }) {
  const r = { credits: 0, water: 0, fert: 0 };
  if (mode === 'pvp') { r.credits = win ? 80 : 30; s.pvp[win ? 'wins' : 'losses']++; }
  else {
    const tier = TIERS.indexOf(s.tournament.tier);
    r.credits = win ? 60 + 15 * tier : 15;
    if (win && rng() < 0.5) r.water = 1 + (rng() < 0.3 ? 1 : 0);
    if (win && rng() < 0.2) r.fert = 1;
    if (mode === 'swap3') s.swap3[win ? 'wins' : 'losses']++;
    else {
      const T = s.tournament; T[win ? 'wins' : 'losses']++;
      if (T.wins >= 3) {   // 이번 라운드 통과 → 다음 라운드(결승 통과 = 다음 단계 대회)
        const i = ROUNDS.indexOf(T.round);
        if (i >= ROUNDS.length - 1) { T.tier = TIERS[Math.min(TIERS.length - 1, tier + 1)]; T.name = `새싹 ${T.tier}`; T.round = ROUNDS[0]; r.credits += 300; }
        else T.round = ROUNDS[i + 1];
        T.wins = 0; T.losses = 0; r.round = T.round;
      } else if (T.losses >= 3) { T.wins = 0; T.losses = 0; T.round = ROUNDS[0]; r.reset = true; }
    }
  }
  give(s, r);
  r.xp = addXp(s, mode === 'pvp' ? (win ? XP.pvpWin : XP.pvpLose) : (win ? XP.botWin : XP.botLose));
  return r;
}
