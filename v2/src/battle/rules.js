// v2 전투 규칙(순수 계산) — 화면·DOM·시각과 무관, 같은 씨앗이면 같은 결과(서버 재검증 #8). 설계 = docs/superpowers/specs/2026-10-15-v2-battle-rules-design.md
// 사용자 결정(2026-10-15): 선공은 기동이 빠른 쪽이 '확률로' · 방어는 후공일 때만(선공 방어는 판정이 먼저라 헛됨) · 회피는 선공·후공 모두(같은 날 정정 "회피는 후공도 가능하게") ·
//  회피는 무조건 피하기가 아니라 빗나감/스침/정타/치명 비율을 바꾸는 것 · 확률 p가 ceil(1/p)-1번 연속 실패하면 다음은 확정(불운 보정) ·
//  범위 공격은 회피가 어렵다(대신 비용·위력 대가) · 평타·방어 자세·회피 자세는 기본기, 특수 기술은 그 변주.

import { effSpd, evadeK, atkK, defK, dmgTakenK, missAddOf, mustSkip, consumeSkip, onHit, selfBuff, healK, has, listOf, noteFall, pasAtkK, pasDmgK, FX } from './status.js';

// ── 씨앗 난수(mulberry32) — 전투 계산은 이것만 쓴다 ──
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const RULES = {
  initK: 3, initMin: 0.08, initMax: 0.92,      // 선공 확률 = a^k/(a^k+b^k), 8~92%로 자름(Darkest Dungeon 속도+주사위처럼 빠른 쪽이 대개, 늘 그렇진 않게)
  initPitySlack: 1,                             // 선공 불운 보정은 한 번 더 여유 — 없으면 같은 기동(50%)끼리 '1번 밀리면 확정'이라 선공이 번갈아 고정돼 다음 선공이 읽힘
  baseMiss: 6, baseGraze: 12, missMax: 70, critMax: 50,
  tierMult: { miss: 0, graze: 0.5, hit: 1, crit: 1.5 },
  areaEvadeK: 0.5,                              // 범위 공격은 회피 자세가 옮기는 칸을 절반만
  repeatStanceK: 0.5,                           // 같은 자세를 연달아 쓰면 효과 절반(포켓몬 방어 연속 사용 감쇠에서 — 버티기만 하는 판 막기, 제안값)
  critAfterCritK: 0.5,                          // 치명을 맞은 다음 공격은 치명 칸 절반(연속 치명 불운 줄이기, 제안값)
};

// ── 불운 보정 ──
// 확률 p(0~1)인 일이 ceil(1/p)-1번 연속 실패하면 다음은 확정(메카 core4 pityLimit와 같은 규칙). p가 0이면 보정 없음.
export function pityLimit(p) {
  if (!(p > 0)) return Infinity;
  if (p >= 1) return 0;
  return Math.max(1, Math.ceil(1 / p - 1e-9) - 1);
}
// 한 번 굴림: streak = 지금까지 연속 실패 수 → { ok, forced, streak(다음 값) }
export function rollPity(p, streak, rng) {
  if (streak >= pityLimit(p)) return { ok: true, forced: true, streak: 0 };
  const ok = rng() < p;
  return { ok, forced: false, streak: ok ? 0 : streak + 1 };
}
// 보정이 실제 평균을 얼마나 올리는지(설계 표용): 기대 시도 수 = (1-(1-p)^N)/p, N = 상한+1
export function pityRate(p) {
  const N = pityLimit(p) + 1;
  if (!isFinite(N)) return p;
  return p / (1 - (1 - p) ** N);
}

// ── 선공 ──
export function initiativeChance(spdA, spdB, bonusA = 0) {
  const a = Math.max(1, spdA) ** RULES.initK, b = Math.max(1, spdB) ** RULES.initK;
  return Math.min(RULES.initMax, Math.max(RULES.initMin, a / (a + b) + bonusA));
}

// ── 명중 네 단 표(한 번 굴림 — WoW 공격표·메카 판정 막대) ──
// 순서 [빗나감 | 스침 | 정타 | 치명], 합 100. 회피 자세가 옮기는 칸은 치명에서 먼저, 모자라면 정타에서 가져온다.
export function hitTable(att, def, o = {}) {
  let miss = RULES.baseMiss + (def.eva || 0) - (att.acc || 0) + (o.missAdd || 0);
  let graze = RULES.baseGraze + (o.grazeAdd || 0);
  let crit = (att.crit || 0) + (o.critAdd || 0);
  if (o.critK != null) crit = Math.floor(crit * o.critK);
  miss = Math.max(0, Math.min(RULES.missMax, miss)); crit = Math.max(0, Math.min(RULES.critMax, crit));
  const sh = o.shift;   // 회피 자세: { miss, graze, critToGraze } — 범위 공격이면 areaEvadeK배
  if (sh) {
    const k = (o.area ? RULES.areaEvadeK : 1) * (o.shiftK ?? 1);
    const dm = Math.round((sh.miss || 0) * k), dg = Math.round((sh.graze || 0) * k);
    if (sh.critToGraze) { const c = Math.round(crit * sh.critToGraze * k); crit -= c; graze += c; }
    crit -= Math.min(crit, dm + dg);   // 옮긴 만큼 치명부터 줄고, 모자란 몫은 정타가 줄어든다(정타 = 나머지)
    miss = Math.min(RULES.missMax, miss + dm); graze += dg;
  }
  const total = miss + graze + crit;
  if (total > 100) { const over = total - 100; const g = Math.min(graze, over); graze -= g; crit -= Math.min(crit, over - g); }
  const hit = 100 - miss - graze - crit;
  return { miss, graze, hit, crit };
}
export function tierOf(t, r100) { return r100 < t.miss ? 'miss' : r100 < t.miss + t.graze ? 'graze' : r100 < t.miss + t.graze + t.hit ? 'hit' : 'crit'; }
// 판정 + 불운 보정(연속 빗나감 → 정타 확정)
export function judgeHit(t, missStreak, rng) {
  const p = (100 - t.miss) / 100;
  if (missStreak >= pityLimit(p)) return { tier: 'hit', forced: true, missStreak: 0 };
  const tier = tierOf(t, Math.floor(rng() * 100));
  return { tier, forced: false, missStreak: tier === 'miss' ? missStreak + 1 : 0 };
}

// ── 피해(간단판 — 위력·공격·방어·상성, 방어는 고정 차감 + 하한 25%) ──
export function baseDamage(att, def, skill, elemMult = 1) {
  const raw = (skill.power || 0) * (att.atk || 10) / 50 * elemMult;
  return Math.max(1, Math.max(raw * 0.25, raw - (def.def || 0) * 0.5));
}

// ── 한 턴 해소 ──
// u = { id, spd, atk, def, acc, eva, crit, hp, st: { miss:{적id:연속}, init:연속, lastStance, critTaken, nextInit, nextCrit }, eff: 상태 효과(status.js) }
// a = 행동(기술): { act:'attack'|'guard'|'evade'|'skip'|'other', power, area, ranged, contact, guardMult, blockCrit, shift, counter, inflict, ... }
// o = { elemMult, turn } — turn = 턴 번호(상태 효과의 '몇 턴'을 셈)
// 반환 = { first, events:[…] } — 화면 연출은 events를 순서대로 읽기만 한다
export function resolveTurn(A, B, actA, actB, rng, o = {}) {
  const ev = [], st = u => (u.st ||= { miss: {}, init: 0, critTaken: false, nextInit: 0, nextCrit: 0, lastStance: null });
  st(A); st(B);
  const T = o.turn || 0, skipped = new Set();
  // ① 선공: 기동 비율 확률 + 불운 보정(유리한 쪽이든 불리한 쪽이든 '먼저 가기'가 계속 실패하면 확정). 기동 = 젖음·빙결이면 줄어듦
  const pA = initiativeChance(effSpd(A), effSpd(B), (A.st.nextInit || 0) - (B.st.nextInit || 0));
  let first;
  if (A.st.init >= pityLimit(pA) + RULES.initPitySlack) first = A;
  else if (B.st.init >= pityLimit(1 - pA) + RULES.initPitySlack) first = B;
  else first = rng() < pA ? A : B;
  const second = first === A ? B : A;
  first.st.init = 0; second.st.init += 1;
  A.st.nextInit = 0; B.st.nextInit = 0;
  ev.push({ t: 'first', who: first.id, chance: first === A ? pA : 1 - pA });
  const actOf = u => (u === A ? actA : actB);
  // 자세 성립: 방어 = 후공일 때만(먼저 하면 판정이 끝나 헛됨), 회피 = 순서와 상관없이(선공·후공 모두)
  const stanceOk = (u, kind) => (kind === 'guard' ? u === second : kind === 'evade');
  // 누가 쓰러지면 그 턴의 남은 행동은 없음(쓰러진 식물을 때리거나 쓰러진 식물이 움직이지 않게 — 2026-10-16 판정 순서 점검)
  for (const [u, foe] of [[first, second], [second, first]]) {
    const a = actOf(u), d = actOf(foe);
    if (u.hp <= 0 || foe.hp <= 0) break;
    // 쉬는 차례(얼음·마비·기절): 고른 행동이 취소되고 쓴 에너지는 돌려받음 — 이번 턴 앞에서 걸렸어도 아직 안 움직였으면 여기서 취소
    if (mustSkip(u)) { consumeSkip(u, T, ev, a.act === 'skip' ? 0 : a.cost || 0); skipped.add(u); continue; }
    if (a.act === 'skip') { skipped.add(u); continue; }
    if (a.act === 'guard' || a.act === 'evade') {
      const ok = stanceOk(u, a.act), rep = u.st.lastStance === a.act;
      ev.push({ t: 'stance', who: u.id, kind: a.act, id: a.id, active: ok, repeat: rep });
      continue;
    }
    const selfAll = () => { for (const b of [a.self, a.also]) if (b) selfBuff(u, b, { turn: T, ev }); };   // 나에게 거는 버프(버프 기술 · 공격 기술 덤)
    if (a.act === 'buff') { ev.push({ t: 'cast', who: u.id, id: a.id }); selfAll(); continue; }
    if (a.act !== 'attack') { ev.push({ t: 'act', who: u.id, id: a.id }); continue; }
    // 공격: 상대 자세가 이 공격에 걸리는지(쉬는 중이면 자세도 못 잡음)
    const still = !mustSkip(foe) && !skipped.has(foe);
    const guardOn = still && d.act === 'guard' && stanceOk(foe, 'guard');
    const evadeOn = still && d.act === 'evade' && stanceOk(foe, 'evade');
    const rep = d.act === foe.st.lastStance ? RULES.repeatStanceK : 1;
    const t = hitTable(u, foe, { area: !!a.area, shift: evadeOn ? d.shift : null, shiftK: rep * evadeK(foe, u), critK: foe.st.critTaken ? RULES.critAfterCritK : null, critAdd: u.st.nextCrit || 0, missAdd: missAddOf(u) });
    u.st.nextCrit = 0;
    const key = foe.id, j = judgeHit(t, u.st.miss[key] || 0, rng);
    u.st.miss[key] = j.missStreak;
    let tier = j.tier;
    if (guardOn && tier === 'crit' && d.blockCrit !== false) tier = 'hit';
    // 피해: 약화(공격 ↓) · 부식(방어 ↓) · 얼음(받는 피해 ↓)
    //  카드 패시브(2026-10-17): 공격 배율 pasAtkK · 피해 배율 pasDmgK · 치명 피해 critDmg(예리한 날)
    const hitDmg = (x, y, sk, el) => baseDamage({ atk: x.atk * atkK(x) * pasAtkK(x, y) }, { def: y.def * defK(y) }, sk, el) * dmgTakenK(y) * pasDmgK(x, y);
    const critK = tier === 'crit' && u.pas && u.pas.critDmg ? 1 + u.pas.critDmg : 1;
    let dmg = Math.round(hitDmg(u, foe, a, o.elemMult ? o.elemMult(u, foe) : 1) * RULES.tierMult[tier] * critK * (guardOn ? 1 - (1 - (d.guardMult ?? 0.5)) * rep : 1));
    if (evadeOn && d.punishOnHit && (tier === 'hit' || tier === 'crit')) dmg = Math.round(dmg * (1 + d.punishOnHit));
    let absorb = 0;   // 보호막이 먼저 막음
    if (dmg > 0 && foe.eff && foe.eff.shield) { const sh = foe.eff.shield; absorb = Math.min(sh.hp, dmg); sh.hp -= absorb; dmg -= absorb; if (sh.hp <= 0) delete foe.eff.shield; }
    foe.hp = Math.max(0, foe.hp - dmg);
    foe.st.critTaken = tier === 'crit';
    ev.push({ t: 'hit', who: u.id, to: foe.id, id: a.id, tier, dmg, absorb, forced: j.forced, table: t, guard: guardOn, evade: evadeOn, area: !!a.area, list: absorb ? listOf(foe) : undefined });
    const drain = (a.drain || 0) + ((u.pas && u.pas.drain) || 0);   // 흡수(기술) + 진액 흡수(카드)
    if (tier !== 'miss' && dmg > 0 && drain && u.hp > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(dmg * drain * healK(u))); if (u.hp > before) ev.push({ t: 'heal', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }   // 흡수
    const refl = (has(foe, 'thorns') ? FX.thorns.reflect : 0) + ((foe.pas && foe.pas.reflect) || 0);   // 반사 버프 + 가시 줄기(카드)
    if (tier !== 'miss' && dmg > 0 && refl > 0 && a.contact !== false && !a.ranged && !a.area && u.hp > 0 && foe.hp > 0) { const rd = Math.max(1, Math.round(dmg * refl)); u.hp = Math.max(0, u.hp - rd); ev.push({ t: 'reflect', who: foe.id, to: u.id, dmg: rd }); }   // 반사(가시) — 쓰러진 식물의 가시는 찌르지 않음(같이 쓰러짐 막기)
    // 상태 효과: 빗나감이면 안 걸림(방어 자세로 막아도 걸림, 치명이라고 더 걸리지 않음 — 2026-10-15 사용자)
    if (tier !== 'miss') onHit(u, foe, a, { turn: T, rng, ev });
    if (u.hp > 0) selfAll();   // 덤 버프(맞히든 빗나가든 쓴 순간)
    // 회피·방어 성공 보상(Yomi: 막으면 이득, 피하면 한 번 되받아침)
    const avoided = evadeOn && (tier === 'miss' || tier === 'graze');
    if (avoided && d.counter && a.contact !== false && !a.area && !a.ranged && foe.hp > 0) {
      const cd = Math.max(1, Math.round(hitDmg(foe, u, { power: d.counter }, 1)));
      u.hp = Math.max(0, u.hp - cd);
      ev.push({ t: 'counter', who: foe.id, to: u.id, dmg: cd, from: d.id });
    }
    if (avoided && d.nextCrit) foe.st.nextCrit = d.nextCrit;
    if (avoided && d.nextInit) foe.st.nextInit = d.nextInit;
    if (avoided && d.onAvoid) ev.push({ t: 'status', who: foe.id, to: u.id, status: d.onAvoid, from: d.id });
    if (guardOn && d.counterPct && foe.hp > 0) { const cd = Math.max(1, Math.round(dmg * d.counterPct)); u.hp = Math.max(0, u.hp - cd); ev.push({ t: 'counter', who: foe.id, to: u.id, dmg: cd, from: d.id }); }
    if (guardOn && d.energyOnBlock) ev.push({ t: 'energy', who: foe.id, gain: d.energyOnBlock });
    noteFall(foe, ev); noteFall(u, ev);   // 맞은 쪽 먼저(되받아치기 · 반사는 그 뒤에 일어남)
    if (foe.hp <= 0 || u.hp <= 0) {
      // 후공이 잡은 자세(회피 되받아치기로 선공이 쓰러진 경우 등)는 자기 차례가 안 와도 화면에 보이게
      if (u === first && foe.hp > 0 && (d.act === 'guard' || d.act === 'evade')) ev.push({ t: 'stance', who: foe.id, kind: d.act, id: d.id, active: stanceOk(foe, d.act), repeat: foe.st.lastStance === d.act });
      break;
    }
  }
  for (const u of [A, B]) { const a = actOf(u); u.st.lastStance = !skipped.has(u) && (a.act === 'guard' || a.act === 'evade') ? a.act : null; }
  return { first: first.id, events: ev };
}
