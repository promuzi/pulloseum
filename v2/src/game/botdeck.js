// 봇 손패 짜기(2026-11-04 사용자: '햇빛 소모가 큰 것과 작은것, 각자에게 어울리는 방어패, 고유 스킬의 연계도가 높은 카드, 속성이 다른 특이 카드 등 배합해서 가져가고,
//  이 조합은 같은 식물이어도 조금씩 다른 컨셉으로 가져가게' · '공격만 들지 않고, 조합도 신경쓰고, 방어와 회복기도 2개 이상 지니지 않게. 고유 스킬에 대체가 있다면 비용을 고려해서 적절히 들고 가게끔' ·
//  '3:3에서는 식물 조합까지 고려해서' — 설계 docs/superpowers/specs/2026-11-04-bot-system-design.md):
//  ① 카드 성격(cardInfo): 햇빛 · 위력 · 역할(공격 · 방어 · 회복 · 버프 · 방해 · 햇빛) · 연계(무엇을 남기고 무엇이 있어야 하나)
//  ② 컨셉(CONCEPTS): 연계 · 공격 · 버티기 · 방해 · 속성 — 종 역할 · 능력치로 무게를 두고 판마다 하나를 뽑음(같은 종도 손패가 다름)
//  ③ 여섯 장 = 어울리는 방어패 하나 → 연계 묶음(쓰는 기술 + 쌓는 기술) → 나머지를 값 · 햇빛 곡선 · 컨셉으로 채움(방어 · 회복 각 한 장까지 · 큰 비용 둘까지 · 작은 비용 둘 이상)
//  ④ 시뮬레이션으로 잰 카드 값(botdeck_w.js — node tools/test/botsys.mjs learn)이 있으면 더함
//  ⑤ 3:3 팀 = 서로 약점이 겹치지 않고 · 공격 속성이 여러 상대를 치고 · 역할이 섞이게(teamScore)
import { SKILLS, SPECIES, uniquesOf, bloomPool } from './catalog.js';
import { CARDS, formCards, isSkillCard } from './cards.js';
import { WEAK } from '../battle/elem.js';
import { CARD_W } from './botdeck_w.js';

const BASIC = { basic: { id: 'basic', act: 'attack', power: 30, cost: 0, el: null }, guard: { id: 'guard', act: 'guard', cost: 0 }, evade: { id: 'evade', act: 'evade', cost: 0 }, sun: { id: 'sun', act: 'sun', cost: 0 } };
const skillOf = id => BASIC[id] || SKILLS[id];

// ① 카드 성격 — 위력 몫(같은 잣대: 위력 1 = 1) · 효과 몫(위력으로 친 값) · 역할 · 연계 꼬리표
const FXP = { stun: 45, chill: 12, burn: 22, poison: 9, shock: 16, seal: 10, defDown: 14, atkDown: 14, wet: 12, spore: 20, taunt: 4, root: 4, gale: 10, bleed: 16, accDown: 8, spdDown: 8, critDown: 5, leech: 18, dark: 12 };
const SELFP = { atkUp: 30, defUp: 20, spdUp: 14, aim: 18, critUp: 10, shield: 20, armor: 26, regen: 22, purify: 8, stealth: 30, flourish: 22, will: 10 };
const SPECIALP = { bell: 55, inferno: 55, summon: 55, volley: 35, grow: 25, burst: 35, trapSet: 35, miasma: 45, galeAdd: 45, caveAdd: 40, moss: 30, taste: 30, harvest: 35, cycle: 25, harmony: 15, settle: 40, toggle: 25, dragonTry: 40, heartArmor: 40, heartCleanse: 20, fruitCondense: 35, revive: 40, bounce: 25, inject: 50, infuse: 30, orbGuard: 30, orbRefill: 30, orbTrap: 35, orbAbsorb: 30, fakeDeath: 30, bare: 30, cleanseHeal: 45, healPct: 40 };
const fxList = s => [s.inflict, ...(s.inflicts || []), s.perHitInflict && { ...s.perHitInflict, n: (s.perHitInflict.n || 1) * (s.hits || 1) }, s.critInflict && { ...s.critInflict, p: 0.3 }, ...(s.act === 'hex' ? s.hex || [] : [])].filter(Boolean);
const fxPow = s => fxList(s).reduce((t, f) => t + (FXP[f.id] || 6) * (['chill', 'poison', 'spore'].includes(f.id) ? f.n || 1 : 1) * (f.p ?? 1), 0);
const branchAvg = (s, fn) => (s.onFirst || s.onSecond ? (fn({ ...s, ...(s.onFirst || {}) }) + fn({ ...s, ...(s.onSecond || {}) })) / 2 : fn(s));
function atkPow(s) {   // 한 번 쓸 때 위력 몫(개수 · 상태로 바뀌는 기술은 가운데 값)
  if (s.ifDragon) return (atkPow({ ...s, ifDragon: null }) + atkPow({ ...s, ...s.ifDragon, ifDragon: null })) / 2;
  let p = (s.power || 0) * (s.strikes ? s.strikes.length : s.hits || 1) * (s.area ? 0.85 : 1);
  if (s.scale) p *= 1 + s.scale.dmg[Math.min(2, s.scale.dmg.length - 1)];
  if (s.powTbl) p = s.powTbl.tbl[Math.min(3, s.powTbl.tbl.length - 1)];
  if (s.orbDump) p = (s.power || 30) * 3;
  if (s.orbBlast) p = 25 * 3 * (s.area ? 0.85 : 1);
  if (s.lostHp) p += 30;
  if (s.spdGap) p *= 1.2;
  if (s.bonusIf) p *= 1 + 0.3 * (s.bonusIf.k - 1);
  if (s.execute) p += 40;
  if (s.trapBoom) p += s.trapBoom * 1.5;
  if (s.fruitUse === 'throw') p = 35 * 2;
  if (s.sumVolley) p += 40;
  if (s.critHeal) p += 15;
  if (s.link) p += (s.link.power || 0) * (s.link.hits || 1) * (s.link.ambush ? 1.2 : 0.8) * 0.7;
  if (s.ifRes && s.ifRes.then && s.ifRes.then.power) p = (p * 2 + s.ifRes.then.power) / 3;
  return p;
}
const isDefS = s => s.act === 'guard' || s.act === 'evade' || (s.cats || []).includes('guard') || (s.cats || []).includes('evade') || s.fakeDeath || s.orbGuard || s.heartArmor || s.fruitCondense || s.revive || s.bounce
  || (!(s.power > 0) && !s.link && ['shield', 'armor', 'defUp', 'stealth'].includes(s.self)) || (!(s.power > 0) && s.reflect && !s.self);
const isHealS = s => (s.cats || []).includes('heal_hp') || s.healPct || s.cleanseHeal || s.harvest || s.moss || s.fruitUse === 'eat' || s.orbAbsorb || s.galeAdd === 'heal' || (!(s.power > 0) && (s.self === 'regen' || s.also === 'regen'));
const CI = new Map();
export function cardInfo(id, key) {
  const ck = id + '|' + key;
  if (CI.has(ck)) return CI.get(ck);
  const s = skillOf(id), sp = SPECIES[key] || {};
  if (!s) return null;
  const dmg = s.act === 'attack' || (s.power || 0) > 0 || !!s.link || !!(s.onFirst && s.onFirst.power) || !!(s.onSecond && s.onSecond.power);
  const isDef = isDefS(s) || !!(s.onFirst && isDefS({ ...s, ...s.onFirst }) && !dmg), isHeal = isHealS(s);
  const pow = dmg ? branchAvg(s, atkPow) : 0, fx = branchAvg(s, fxPow);
  const selfs = [s.self, s.also, s.onFirst && s.onFirst.self, s.onSecond && s.onSecond.self].filter(Boolean);
  const util = selfs.reduce((t, b) => t + (SELFP[b] || 8), 0) * (dmg ? 0.7 : 1) + Object.keys(SPECIALP).reduce((t, k) => t + (s[k] ? SPECIALP[k] : 0), 0) + (s.drain ? (s.drain * pow * 0.5) : 0) + (s.reflect && dmg ? 12 : 0);
  const el = s.elOwn ? sp.el : s.el;
  // 연계 꼬리표: gives = 이 카드가 남기는 것 · needs = 없으면 못 쓰는 것 · likes = 있으면 더 좋은 것
  const gives = new Set(), needs = new Set(), likes = new Set();
  const g = s.gain || (s.onFirst && s.onFirst.gain);
  if (g && g.k) gives.add('res:' + g.k);
  for (const f of fxList(s)) gives.add('fx:' + f.id);
  for (const b of [s.onFirst, s.onSecond]) if (b) for (const f of fxList(b)) gives.add('fx:' + f.id);
  if (s.mealMark) gives.add('meal');
  if (s.fruitCondense || (sp.fruits && [...gives].includes('fx:chill'))) gives.add('fruit');   // 프로스트드레이크 = 빙결을 거는 기술도 열매
  if (s.trapSet) gives.add('trap');
  if (s.summon) gives.add('summon');
  if (s.tag) gives.add('tag:' + s.tag);
  if (s.act === 'evade' || s.self === 'stealth' || (s.onFirst && s.onFirst.act === 'evade') || s.evadeWith || (s.onFirst && s.onFirst.evadeWith)) gives.add('dodge');
  if (s.inferno) gives.add('inferno');
  if (dmg) gives.add('dmg');
  if (s.taste) needs.add('meal');
  if (s.fruitUse) needs.add('fruit');
  if (s.trapBoom) needs.add('trap');
  if (s.volley || s.grow || s.burst) needs.add('summon');
  if (s.galeAdd) needs.add('fx:gale');
  if (s.infuse) needs.add('tag:' + s.infuse.tag);
  if (s.spend && !s.spend.zeroOk) needs.add('res:' + s.spend.k);
  if (s.dragonTry) needs.add('res:dragon');
  if (s.consume) likes.add('fx:' + s.consume.id);
  if (s.bonusIf) likes.add(s.bonusIf.id === 'frozen' ? 'fx:chill' : 'fx:' + s.bonusIf.id);
  if (s.ifFoe) likes.add('fx:' + s.ifFoe.has);
  if (s.scale) likes.add('res:' + s.scale.k);
  if (s.ifRes) likes.add('res:' + s.ifRes.k);
  if (s.bare || s.critIfDodged) likes.add('dodge');
  if (s.sumVolley) likes.add('summon');
  if (s.harvest) likes.add('fx:spore');
  if (s.settle) likes.add('fx:any');
  if (s.formBoost) likes.add('mut');
  const info = { id, s, key, cost: s.cost || 0, el, pow, fx, util, dmg, isDef, isHeal, isSun: s.act === 'sun', isBasic: !!BASIC[id], uniq: s.tier === 'u', mut: s.tier === 'm', uses: s.uses || 0, gives, needs, likes, off: dmg && !!el && el !== sp.el };
  CI.set(ck, info);
  return info;
}

// ② 컨셉 — 연계(고유 묶음) · 공격(피해 · 큰 한 방) · 버티기(회복 · 방어 · 지속 피해) · 방해(상태이상 · 능력치 내림) · 속성(다른 속성 공격)
export const CONCEPTS = { combo: '연계', aggro: '공격', sustain: '버티기', control: '방해', cover: '속성' };
const ROLE_CON = { tank: { sustain: 3, control: 1.5, combo: 2, aggro: 1, cover: 1 }, ltank: { sustain: 2.5, control: 1.5, combo: 2, aggro: 1.2, cover: 1 }, atk: { aggro: 3, combo: 2, cover: 1.5, control: 1, sustain: 0.6 }, fast: { aggro: 2.5, combo: 2, control: 1.5, cover: 1.2, sustain: 0.6 }, sup: { sustain: 2.5, combo: 2, control: 1.5, aggro: 1, cover: 1 }, dis: { control: 3, combo: 2, aggro: 1.2, cover: 1, sustain: 1 }, ctr: { control: 2, sustain: 2, combo: 2, aggro: 1.2, cover: 1 }, dot: { control: 2.5, sustain: 2, combo: 2, aggro: 1, cover: 1 }, drain: { combo: 3, aggro: 2, sustain: 1.5, control: 1, cover: 1 } };
const CTRL = new Set(['stun', 'seal', 'chill', 'shock', 'atkDown', 'defDown', 'accDown', 'spdDown', 'critDown', 'taunt', 'gale', 'wet', 'root', 'dark']);
const DOT = new Set(['burn', 'poison', 'bleed', 'spore', 'leech', 'shock']);
function pickConcept(rng, key, pool) {
  const sp = SPECIES[key] || {}, W = { ...(ROLE_CON[sp.role] || { combo: 2, aggro: 2, control: 1, sustain: 1, cover: 1 }) };
  const has = f => pool.some(id => { const c = cardInfo(id, key); return c && f(c); });
  if (!has(c => c.isHeal)) W.sustain *= 0.4;
  if (!has(c => c.off)) W.cover = 0;
  if (!has(c => c.needs.size || c.likes.size || [...c.gives].some(g => g.startsWith('res:') || g === 'meal' || g === 'fruit' || g === 'trap' || g === 'summon'))) W.combo *= 0.3;
  if (!has(c => [...c.gives].some(g => CTRL.has(g.slice(3))))) W.control *= 0.4;
  const keys = Object.keys(W).filter(k => W[k] > 0), tot = keys.reduce((a, k) => a + W[k], 0);
  let r = rng() * tot;
  for (const k of keys) { r -= W[k]; if (r <= 0) return k; }
  return keys[keys.length - 1];
}

// 배울 수 있는 카드(그 단계까지 핀 고유 기술 · 속성 · 종 공통 · 가지 + 기본기 넷 + 변이면 그 변이 기술 카드)
export function poolOf(key, stage, form) {
  const out = new Set(['basic', 'guard', 'evade', 'sun']);
  for (let st = 0; st <= stage; st++) for (const x of bloomPool(key, st)) if (SKILLS[x.id]) out.add(x.id);
  for (let st = 0; st <= stage; st++) for (const id of uniquesOf(key, st)) if (SKILLS[id]) out.add(id);
  if (form) for (const id of formCards(form)) if (isSkillCard(id) && SKILLS[id]) out.add(id);
  return [...out];
}

// ③ 손패 값 — 카드 값의 합 + 연계 + 햇빛 곡선 + 컨셉
const TURNS = 7;
function cardVal(c, con, stats) {
  const w = CARD_W[c.key] && CARD_W[c.key][c.id];
  let v = c.dmg ? c.pow + c.fx : c.fx * 1.2 + c.util;
  if (c.dmg) v += c.util * 0.5;
  if (c.uniq) v += 30;   // 고유 기술 = 그 종다운 손패의 가운데(사용자 '고유 스킬의 연계도가 높은 카드')
  if (c.mut) v += 25 * Math.max(1, c.uses);   // 변이 기술 = 햇빛 없이 정해진 횟수
  if (con === 'aggro' && c.dmg) v *= 1.25;
  if (con === 'aggro' && !c.dmg) v *= 0.8;
  if (con === 'sustain' && (c.isHeal || c.isDef)) v *= 1.4;
  if (con === 'sustain' && [...c.gives].some(g => DOT.has(g.slice(3)))) v *= 1.25;
  if (con === 'control') v += [...c.gives].filter(g => CTRL.has(g.slice(3))).length * 18;
  if (con === 'combo' && c.uniq) v *= 1.2;
  if (c.isDef) v = defFit(c, stats) * (con === 'sustain' ? 1.3 : 1);
  if (w != null) v += w * 400;   // 시뮬레이션으로 잰 몫(승률 1%p = 4)
  return v;
}
// 어울리는 방어패: 방어가 높으면 방어태세 · 빠르면 회피 자세 · 그 종 방어 기술(반사 · 보호막 · 갑주 · 열매 …)은 연계 몫을 더해
function defFit(c, st) {
  const s = c.s, D = Math.max(1, st.def), red = 1 - (100 + D) / (100 + D * 4), spdK = Math.max(0.7, Math.min(1.3, Math.sqrt(st.spd / Math.max(1, st.avgSpd))));
  if (c.id === 'guard') return 120 * red;
  if (c.id === 'evade') return 120 * 0.2 * spdK * 1.6;
  let v = 30 + c.util + c.fx * 0.8 + (c.uniq ? 15 : 0);
  if (s.act === 'guard') v += 120 * red * 0.8;
  if (s.act === 'evade') v += 120 * 0.2 * spdK * 1.4;
  return v - c.cost * 6;
}
function synergy(deck) {
  const gives = new Set(deck.flatMap(c => [...c.gives]));
  if (deck.some(c => c.mut)) gives.add('mut');
  let v = 0, broken = 0;
  for (const c of deck) {
    for (const n of c.needs) if (!gives.has(n)) broken++;
    for (const l of c.likes) if (l === 'fx:any' ? [...gives].some(g => g.startsWith('fx:')) : gives.has(l)) v += 20;
    for (const g of c.gives) if (g.startsWith('res:') && deck.some(o => o !== c && (o.likes.has(g) || o.needs.has(g)))) v += 15;   // 쌓는 기술 ↔ 쓰는 기술
  }
  return { v, broken };
}
// 햇빛 곡선: 7턴 동안 시작 2 · 턴마다 regen · 광합성(+2)으로 공격 몫을 가장 크게 쓰는 길(동적 계획) — 큰 비용만 들면 못 쓰고 작은 비용만 들면 햇빛이 남음
function curve(deck, regen, sunMax) {
  const atk = deck.filter(c => c.dmg && !c.mut).map(c => ({ v: c.pow + c.fx, cost: c.cost })), sun = deck.some(c => c.isSun);
  const util = deck.filter(c => !c.dmg && !c.isSun && !c.isDef && !c.mut);
  const turns = Math.max(2, TURNS - util.length - 1), e0 = Math.max(0, Math.round(2 - util.reduce((t, c) => t + c.cost, 0) * 0.5));   // 보조 · 방어 카드가 한 턴씩 · 그 햇빛 반쯤을 씀
  const top = sunMax;
  let cur = new Array(top + 1).fill(-1e9);
  cur[Math.min(top, e0)] = 0;
  for (let t = 0; t < turns; t++) {
    const nx = new Array(top + 1).fill(-1e9);
    for (let e = 0; e <= top; e++) {
      if (cur[e] < -1e8) continue;
      const step = (v, e2) => { const k = Math.max(0, Math.min(top, Math.floor(e2))); if (cur[e] + v > nx[k]) nx[k] = cur[e] + v; };
      step(0, e + regen);
      for (const a of atk) if (a.cost <= e) step(a.v, e - a.cost + regen);
      if (sun) step(0, e + 2 + regen);
    }
    cur = nx;
  }
  return Math.max(0, ...cur);
}
function deckScore(deck, con, stats) {
  let v = deck.reduce((t, c) => t + (c.dmg && !c.mut ? 0 : cardVal(c, con, stats)), 0);
  v += curve(deck, stats.regen, stats.sunMax) * (con === 'aggro' ? 1.15 : 1) + deck.filter(c => c.dmg && !c.mut).reduce((t, c) => t + (cardVal(c, con, stats) - (c.pow + c.fx)) * 0.5, 0);
  const sy = synergy(deck);
  v += sy.v * (con === 'combo' ? 2 : 1) - sy.broken * 200;
  const offs = deck.filter(c => c.off).length;
  if (offs) v += con === 'cover' ? 60 : 25;
  if (offs > 2) v -= 30 * (offs - 2);
  // 같은 역할 몰림: 같은 효과 · 같은 개수를 주는 기술이 셋 넘게면 덜
  const roles = {};
  for (const c of deck) for (const g of c.gives) if (g !== 'dmg') roles[g] = (roles[g] || 0) + 1;
  for (const n of Object.values(roles)) if (n > 2) v -= 20 * (n - 2);
  return v;
}
// 제약(사용자): 방어 한 장(어울리는 것) · 회복 한 장까지 · 공격만 들지 않기(공격 아닌 카드 하나 이상) · 큰 비용(3 이상) 둘까지 · 작은 비용(1 이하) 둘 이상 · 변이 기술 카드 둘까지
const MUT_MAX = 2, BIG = 3;
function legal(deck, full) {
  const def = deck.filter(c => c.isDef).length, heal = deck.filter(c => c.isHeal && !c.isDef).length, big = deck.filter(c => c.cost >= BIG).length, mut = deck.filter(c => c.mut).length;
  if (def > 1 || heal > 1 || big > 2 || mut > MUT_MAX) return false;
  if (full) { const cheap = deck.filter(c => c.cost <= 1 && (c.dmg || c.isSun)).length, atk = deck.filter(c => c.dmg).length; if (def < 1 || cheap < 2 || atk < 2 || atk === deck.length) return false; }
  return true;
}
const statsOf = (key, stage, p) => {
  const sp = SPECIES[key] || {}, b = sp.base || { hp: 220, atk: 30, def: 25, spd: 25 }, up = (p && p.up) || {};
  return { def: b.def + (up.def || 0), spd: b.spd + (up.spd || 0), atk: b.atk + (up.atk || 0), hp: b.hp + 5 * (up.hp || 0), avgSpd: 26, regen: 1 + 0.5 * Math.floor((up.sunRegen || 0) / 4), sunMax: 8 + Math.floor((up.sunMax || 0) / 3) };
};
// 손패 하나 짜기: q = 손패 솜씨(0~1 — 대회 단계가 낮으면 일부를 아무렇게나) · con = 컨셉(없으면 뽑음) · mutN = 변이 기술 카드 장 수(변이 봇)
export function buildDeck(rng, { key, stage, form = null, p = null, q = 1, con = null, mutN = null }) {
  const pool = poolOf(key, stage, form).filter(id => cardInfo(id, key)), stats = statsOf(key, stage, p);
  con = con || pickConcept(rng, key, pool);
  const noise = new Map(pool.map(id => [id, 1 + (rng() - 0.5) * 0.3]));   // 같은 컨셉도 판마다 조금씩
  const all = pool.map(id => cardInfo(id, key));
  const val = deck => deckScore(deck, con, stats) + deck.reduce((t, c) => t + (noise.get(c.id) - 1) * 60, 0);
  // 변이 기술 카드: 변이 봇은 한두 장(사람과 같은 칸 — 전투 칸 여섯 중)
  const muts = all.filter(c => c.mut).sort((a, b) => cardVal(b, con, stats) * noise.get(b.id) - cardVal(a, con, stats) * noise.get(a.id));
  const nMut = form ? Math.min(MUT_MAX, muts.length, mutN ?? (stage >= 2 && rng() < 0.5 ? 2 : 1)) : 0;
  let deck = muts.slice(0, nMut);
  // 방어패 한 장(어울리는 것)
  const defs = all.filter(c => c.isDef && !c.mut).sort((a, b) => defFit(b, stats) * noise.get(b.id) - defFit(a, stats) * noise.get(a.id));
  if (defs.length) deck.push(defs[0]);
  // 나머지: 한 장씩 손패 값이 가장 크게 느는 카드(제약 안에서)
  const rest = all.filter(c => !c.mut && !c.isDef);
  while (deck.length < 6) {
    let best = null, bv = -Infinity;
    for (const c of rest) {
      if (deck.includes(c)) continue;
      const d2 = [...deck, c];
      if (!legal(d2, false)) continue;
      const v = val(d2);
      if (v > bv) { bv = v; best = c; }
    }
    if (!best) break;
    deck.push(best);
  }
  // 고쳐 보기: 한 장씩 바꿔 값이 오르고 제약을 다 지키면 바꿈(두 바퀴)
  for (let round = 0; round < 2; round++) for (let i = 0; i < deck.length; i++) {
    if (deck[i].mut) continue;
    let cur = legal(deck, true) ? val(deck) : -Infinity;
    for (const c of all) {
      if (deck.includes(c) || c.mut) continue;
      const d2 = deck.slice(); d2[i] = c;
      if (!legal(d2, true)) continue;
      const v = val(d2);
      if (v > cur + 1e-9) { cur = v; deck = d2; }
    }
  }
  // 서툰 봇(대회 단계가 낮음): 몇 장을 배울 수 있는 아무 카드로(방어패 한 장 · 변이 카드는 그대로)
  if (q < 1) for (let i = 0; i < deck.length; i++) {
    if (deck[i].isDef || deck[i].mut || rng() < q) continue;
    const alt = rest.filter(c => !deck.includes(c));
    for (let k = 0; k < 6 && alt.length; k++) { const c = alt[Math.floor(rng() * alt.length)], d2 = deck.slice(); d2[i] = c; if (legal(d2, true)) { deck = d2; break; } }
  }
  return { ids: deck.map(c => c.id), con };
}

// 아무렇게나 짠 손패(제약은 지킴 — 카드 값 재기용 · tools/test/botsys.mjs learn)
export function sampleDeck(rng, { key, stage, form = null, mutN = 0 }) {
  const all = poolOf(key, stage, form).map(id => cardInfo(id, key)).filter(Boolean);
  for (let tries = 0; tries < 200; tries++) {
    const muts = all.filter(c => c.mut), defs = all.filter(c => c.isDef && !c.mut), rest = all.filter(c => !c.mut && !c.isDef);
    const deck = [];
    for (let i = 0; i < Math.min(mutN, muts.length); i++) deck.push(muts.splice(Math.floor(rng() * muts.length), 1)[0]);
    if (defs.length) deck.push(defs[Math.floor(rng() * defs.length)]);
    while (deck.length < 6 && rest.length) deck.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
    if (legal(deck, true)) return deck.map(c => c.id);
  }
  return buildDeck(rng, { key, stage, form, mutN }).ids;
}

// ⑤ 3:3 팀 값: 약점이 겹치지 않음 · 공격 속성이 여러 속성을 침 · 역할(탱커 · 공격 · 방해 · 지원)이 섞임
const ROLE_GROUP = { tank: 'wall', ltank: 'wall', atk: 'hit', fast: 'hit', drain: 'hit', sup: 'help', dis: 'help', ctr: 'wall', dot: 'help' };
export const TEAM_W = { weak: 1.2, hits: 0.5, roles: 0.4, sameEl: 1.5, sameType: 0.3 };   // 팀 값 무게(시뮬레이션으로 고름 — tools/test/botsys.mjs team --set)
export function teamScore(keys) {
  const sps = keys.map(k => SPECIES[k]).filter(Boolean);
  let v = 0;
  const weak = {};   // 그 공격 속성에 약한 팀원 수
  for (const sp of sps) for (const a of WEAK[sp.el] || []) weak[a] = (weak[a] || 0) + 1;
  for (const n of Object.values(weak)) if (n > 1) v -= TEAM_W.weak * (n - 1);
  const hits = new Set();   // 팀 공격 속성이 약점을 찌르는 상대 속성
  for (const sp of sps) for (const [d, L] of Object.entries(WEAK)) if (L.includes(sp.el)) hits.add(d);
  v += TEAM_W.hits * hits.size;
  const groups = new Set(sps.map(sp => ROLE_GROUP[sp.role] || 'hit'));
  v += TEAM_W.roles * groups.size;
  if (new Set(sps.map(sp => sp.el)).size < sps.length) v -= TEAM_W.sameEl;
  if (new Set(sps.map(sp => sp.type)).size < sps.length) v -= TEAM_W.sameType;
  return v;
}
