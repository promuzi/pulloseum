// v2 전투 규칙(순수 계산) — 화면·DOM·시각과 무관, 같은 씨앗이면 같은 결과(서버 재검증 #8). 설계 = docs/superpowers/specs/2026-10-15-v2-battle-rules-design.md
// 사용자 결정: 선공은 기동이 빠른 쪽이 '확률로' · 방어태세는 순서 무관 방어 ×4, 맞으면 해제(2026-10-18) · 회피는 선공·후공 모두 ·
//  회피는 무조건 피하기가 아니라 빗나감/스침/정타/치명 비율을 바꾸는 것 · 확률 p가 ceil(1/p)-1번 연속 실패하면 다음은 확정(불운 보정) ·
//  범위 공격은 회피가 어렵다(대신 비용·위력 대가) · 평타·방어 자세·회피 자세는 기본기, 특수 기술은 그 변주.

import { SKILL_WEAPON } from './matchup.js';
import { dynAct, payAct, afterAct, endureHp, react, takenK, reflectAdd, fieldEl, fieldHits, fieldStart, setField, setCharge, takeCharge } from './devices.js';
import { effSpd, evadeK, atkK, defK, dmgTakenK, missAddOf, mustSkip, consumeSkip, shockRoll, onHit, selfBuff, healK, has, listOf, noteFall, pasAtkK, pasDmgK, FX } from './status.js';

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
  // 2026-10-18 바닥 규칙 1단계(사용자 "추천대로" — docs/superpowers/specs/2026-10-18-v2-species-identity-design.md §1):
  //  방어 = 비율(받는 몫 = defScale ÷ (defScale + 방어), 막는 몫 상한 defCap — 100%에 닿지 않게) · 광역 = 확정 명중(빗나감 · 스침 없음, 치명은 있음) · 위력 areaK배
  defScale: 100, defCap: 0.75, areaK: 0.85,
  guardDefMult: 4,
};

// 반복 자세는 추가 방어만 절반. 카드 표시도 같은 배율을 읽는다.
export const guardDefMult = (skill, repeated = false) => 1 + ((skill.guardDefMult ?? RULES.guardDefMult) - 1) * (repeated ? RULES.repeatStanceK : 1);

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
  if (o.area) return { miss: 0, graze: 0, hit: 100 - crit, crit };   // 광역 = 확정 명중(회피 자세 · 적중 ↓도 안 먹음)
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
  if (t.miss > 0 && missStreak >= pityLimit(p)) return { tier: 'hit', forced: true, missStreak: 0 };   // 빗나감 칸이 없으면(광역) 보정 없이 굴림 — 치명이 살아 있게
  const tier = tierOf(t, Math.floor(rng() * 100));
  return { tier, forced: false, missStreak: tier === 'miss' ? missStreak + 1 : 0 };
}

// ── 피해(위력·공격·방어·상성) — 방어 = 비율(2026-10-18, 전엔 고정 차감 + 하한 25%라 작은 타 · 연타가 크게 깎였음) ──
export function baseDamage(att, def, skill, elemMult = 1) {
  const raw = (skill.power || 0) * (att.atk || 10) / 50 * elemMult;
  const take = Math.max(1 - RULES.defCap, RULES.defScale / (RULES.defScale + Math.max(0, def.def || 0)));
  return Math.max(1, raw * take * (skill.area ? RULES.areaK : 1));
}

// ── 한 턴 해소 ──
// u = { id, spd, atk, def, acc, eva, crit, hp, st: { miss:{적id:연속}, init:연속, lastStance, critTaken, nextInit, nextCrit }, eff: 상태 효과(status.js) }
// a = 행동(기술): { act:'attack'|'guard'|'evade'|'skip'|'other', power, area, ranged, contact, guardDefMult, guardHits, blockCrit, shift, counter, inflict, ... }
// o = { elemMult, turn } — turn = 턴 번호(상태 효과의 '몇 턴'을 셈)
// 반환 = { first, events:[…] } — 화면 연출은 events를 순서대로 읽기만 한다
const stOf = u => (u.st ||= { miss: {}, init: 0, critTaken: false, nextInit: 0, nextCrit: 0, lastStance: null });
// ① 선공: 기동 비율 확률 + 불운 보정(유리한 쪽이든 불리한 쪽이든 '먼저 가기'가 계속 실패하면 확정). 기동 = 젖음·빙결이면 줄어듦
//  3:3 교체도 이걸로 순서를 정함(team.js — 2026-10-18 사용자 "선공후공에 따라 맞고 바뀔지 바뀌고 맞을지")
//  순서 손잡이 pr = [A, B](2026-10-18 — 기술 early = 먼저 +1 · late = 나중 −1): 다르면 높은 쪽이 먼저(굴림 없음) · 둘 다 '나중'이면 두 식물 기동을 바꿔 넣어 빠른 쪽이 나중일 확률이 높게
export function rollFirst(A, B, rng, pr = [0, 0]) {
  stOf(A); stOf(B);
  if (pr[0] !== pr[1]) return { first: pr[0] > pr[1] ? A : B, chance: 1, prio: true };
  const pA = pr[0] < 0 ? initiativeChance(effSpd(B), effSpd(A), (A.st.nextInit || 0) - (B.st.nextInit || 0)) : initiativeChance(effSpd(A), effSpd(B), (A.st.nextInit || 0) - (B.st.nextInit || 0));
  let first;
  if (A.st.init >= pityLimit(pA) + RULES.initPitySlack) first = A;
  else if (B.st.init >= pityLimit(1 - pA) + RULES.initPitySlack) first = B;
  else first = rng() < pA ? A : B;
  const second = first === A ? B : A;
  first.st.init = 0; second.st.init += 1;
  A.st.nextInit = 0; B.st.nextInit = 0;
  return { first, chance: first === A ? pA : 1 - pA };
}
// o.first = 이미 정한 선공 유닛(교체 턴 — 다시 굴리지 않고 'first' 사건도 안 냄)
export function resolveTurn(A, B, actA, actB, rng, o = {}) {
  const ev = [];
  stOf(A); stOf(B);
  const T = o.turn || 0, skipped = new Set();
  fieldStart(o.field, T, [A, B], ev);   // 경기장 효과(공통 장치 D10): 끝난 효과 걷기 · 비 = 화상 꺼짐
  let first;
  if (o.first) first = o.first;
  else { const pr = a => (a && a.early ? 1 : 0) - (a && a.late ? 1 : 0), r = rollFirst(A, B, rng, [pr(actA), pr(actB)]); first = r.first; ev.push({ t: 'first', who: first.id, chance: r.chance, prio: r.prio || undefined }); }
  const second = first === A ? B : A;
  const actOf = u => (u === A ? actA : actB);
  for (const u of [first, second]) { const a = actOf(u); if (a && a.stealth && u.hp > 0 && !mustSkip(u)) selfBuff(u, 'stealth', { turn: T, ev }); }   // 은신은 턴 처음에(나중에 움직여도 먼저 오는 공격을 피함)
  // 태세는 이 턴 안에서만 보유. 후공의 태세도 피격 전에 한 번만 알리고, 자기 차례에 다시 켜지 않는다.
  const guards = new Map([A, B].map(u => [u, actOf(u).act === 'guard' ? (actOf(u).guardHits ?? 1) : 0]));
  const shown = new Set();
  const stanceOk = (u, kind) => kind === 'guard' ? guards.get(u) > 0 : kind === 'evade';
  const showStance = u => {
    if (shown.has(u)) return;
    const a = actOf(u);
    ev.push({ t: 'stance', who: u.id, kind: a.act, id: a.id, active: stanceOk(u, a.act), repeat: u.st.lastStance === a.act });
    shown.add(u);
  };
  // 누가 쓰러지면 그 턴의 남은 행동은 없음(쓰러진 식물을 때리거나 쓰러진 식물이 움직이지 않게 — 2026-10-16 판정 순서 점검)
  for (const [u, foe] of [[first, second], [second, first]]) {
    const ch = u.hp > 0 && foe.hp > 0 ? takeCharge(u) : null;   // 2턴 기술(D11): 모은 기술이 고른 기술 대신 나감(고른 기술 햇빛은 돌려받음)
    if (ch) u.energy = Math.min(u.energyMax || 8, (u.energy || 0) + (actOf(u).cost || 0));
    const a = dynAct(u, ch || actOf(u), foe, rng), d = actOf(foe);   // 공통 장치: 개수 · 운 · 상대 상태로 정한 그 차례 기술 값(devices.js — 칸이 없으면 그대로)
    if (u.hp <= 0 || foe.hp <= 0) break;
    // 쉬는 차례(얼음·마비·기절): 고른 행동이 취소되고 쓴 에너지는 돌려받음 — 이번 턴 앞에서 걸렸어도 아직 안 움직였으면 여기서 취소
    if (a.act !== 'skip') shockRoll(u, { turn: T, rng, ev });   // 감전 = 자기 차례마다 확률로 마비(걸리면 아래에서 행동 취소)
    if (mustSkip(u)) { consumeSkip(u, T, ev, a.act === 'skip' ? 0 : a.cost || 0); skipped.add(u); continue; }
    if (a.act === 'skip') { skipped.add(u); continue; }
    const spent = payAct(u, a, T, ev);   // 개수 · 체력 · 햇빛 내기
    if (a.act === 'guard' || a.act === 'evade') {
      showStance(u);
      continue;
    }
    if (a.act === 'sun') { const e0 = u.energy || 0; u.energy = Math.min(u.energyMax || 8, e0 + (a.gain || 2)); ev.push({ t: 'sun', who: u.id, id: a.id, gain: u.energy - e0 }); continue; }   // 광합성(기본기 — 햇빛 +2)
    const selfAll = () => { for (const b of [a.self, a.also]) if (b) selfBuff(u, b, { turn: T, ev }); };   // 나에게 거는 버프(버프 기술 · 공격 기술 덤)
    if (a.act === 'buff') { ev.push({ t: 'cast', who: u.id, id: a.id }); selfAll(); afterAct(u, a, foe, T, ev, { spent }); setField(o.field, a, T, ev); setCharge(u, a, T, ev); continue; }
    if (a.act !== 'attack') { ev.push({ t: 'act', who: u.id, id: a.id }); continue; }
    // 공격: 상대 자세가 이 공격에 걸리는지(쉬는 중이면 자세도 못 잡음)
    //  2026-10-18 바닥 규칙 2단계(species-identity §1): 연타 a.hits = 타마다 따로 판정(불운 보정 없음 · 효과는 첫 적중 한 번 · 방어태세는 막은 타만큼 줄어듦 · 흡수 · 반사는 타마다)
    //   은신 = 광역 아닌 공격 95% 빗나감 · 분신 = 90%(진짜가 맞거나 광역이면 풀림) · 기습 = 은신한 쪽 공격 ×1.5 + 상대 자세 무시 · 관통 a.pierce = 상대 방어를 그만큼 무시 · 방어구는 보호막 다음에 막음(망치 ×1.5로 깎임)
    const still = !mustSkip(foe) && !skipped.has(foe);
    const ambush = has(u, 'stealth') && !a.area;
    const evadeOn = !ambush && still && d.act === 'evade' && stanceOk(foe, 'evade');
    const rep = d.act === foe.st.lastStance ? RULES.repeatStanceK : 1;
    // 피해: 약화(공격 ↓) · 부식(방어 ↓) · 얼음(받는 피해 ↓) · 카드 패시브(2026-10-17): 공격 배율 pasAtkK · 피해 배율 pasDmgK · 치명 피해 critDmg(예리한 날)
    const hitDmg = (x, y, sk, el, defenseK = 1) => baseDamage({ atk: x.atk * atkK(x) * pasAtkK(x, y) }, { def: y.def * defK(y) * defenseK * (1 - (sk.pierce || 0)) }, sk, el) * dmgTakenK(y) * pasDmgK(x, y);
    const em = (o.elemMult ? o.elemMult(u, foe, a) : 1) * fieldEl(o.field, a.el);   // × 경기장 효과(D10)
    //  속성 × 변이 상성(battle/matchup.js — 기술 a를 같이 넘김)
    const N = Math.max(1, (a.hits || 1) + fieldHits(o.field, a)), hammer = SKILL_WEAPON[a.id] === 'hammer';
    let landed = false, avoided = evadeOn, blocked = false, dmg = 0;
    if (a.area || a.reveal) for (const k of ['stealth', 'clone']) if (has(foe, k)) { delete foe.eff[k]; ev.push({ t: 'reveal', who: foe.id, id: k, list: listOf(foe) }); }   // 광역에 들킴
    for (let i = 0; i < N && foe.hp > 0 && u.hp > 0; i++) {
      const guardOn = !ambush && still && d.act === 'guard' && stanceOk(foe, 'guard');
      if (guardOn) showStance(foe);
      const veil = a.area || has(u, 'stealth') ? 0 : has(foe, 'stealth') ? FX.stealth.miss : has(foe, 'clone') ? FX.clone.miss : 0;   // 은신끼리는 서로 보임
      const t = hitTable(u, foe, { area: !!a.area, shift: evadeOn ? d.shift : null, shiftK: rep * evadeK(foe, u), critK: foe.st.critTaken ? RULES.critAfterCritK : null, critAdd: u.st.nextCrit || 0, missAdd: missAddOf(u) });
      u.st.nextCrit = 0;
      let tier, forced = false;
      if (veil && rng() < veil) tier = 'miss';   // 은신 · 분신에 빗나감(판정표 빗나감 상한 70% 밖에서 따로)
      else if (N > 1) tier = tierOf(t, Math.floor(rng() * 100));   // 연타 = 불운 보정 없음(사용자 "연타에서는 보정을 하지 말자")
      else { const j = judgeHit(t, u.st.miss[foe.id] || 0, rng); u.st.miss[foe.id] = j.missStreak; tier = j.tier; forced = j.forced; }
      if (veil && tier !== 'miss' && has(foe, 'clone')) { delete foe.eff.clone; ev.push({ t: 'reveal', who: foe.id, id: 'clone', list: listOf(foe) }); }   // 진짜를 맞힘
      if (guardOn && tier === 'crit' && d.blockCrit !== false) tier = 'hit';
      const critK = tier === 'crit' && u.pas && u.pas.critDmg ? 1 + u.pas.critDmg : 1;
      dmg = Math.round(hitDmg(u, foe, a, em, guardOn ? guardDefMult(d, rep !== 1) : 1) * RULES.tierMult[tier] * critK * (ambush ? FX.stealth.ambush : 1));
      if (evadeOn && d.punishOnHit && (tier === 'hit' || tier === 'crit')) dmg = Math.round(dmg * (1 + d.punishOnHit));
      dmg = Math.round(dmg * takenK(foe));   // 받는 피해 배율(D13 — 체력 가득이면 위엄 등)
      let absorb = 0, ab = null;   // 보호막 → 방어구 순서로 먼저 막음
      if (dmg > 0 && foe.eff && foe.eff.shield) { const sh = foe.eff.shield; absorb = Math.min(sh.hp, dmg); sh.hp -= absorb; dmg -= absorb; ab = 'shield'; if (sh.hp <= 0) delete foe.eff.shield; }
      if (dmg > 0 && foe.eff && foe.eff.armor) {
        const ar = foe.eff.armor, k = hammer ? FX.armor.hammerK : 1, use = Math.min(ar.hp, dmg * k), took = Math.min(dmg, Math.round(use / k));
        ar.hp -= use; absorb += took; dmg -= took; ab = 'armor';
        if (ar.hp <= 0.5) { delete foe.eff.armor; ev.push({ t: 'armorBreak', who: foe.id, list: listOf(foe) }); }
      }
      foe.hp = endureHp(foe, foe.hp - dmg, ev);   // 버티기(공통 장치 D7) — 없으면 0에서 멈춤
      foe.st.critTaken = tier === 'crit';
      ev.push({ t: 'hit', who: u.id, to: foe.id, id: a.id, tier, dmg, mult: em, absorb, ab: ab || undefined, forced, table: t, guard: guardOn, evade: evadeOn, area: !!a.area, n: N > 1 ? i + 1 : undefined, of: N > 1 ? N : undefined, veil: veil ? true : undefined, ambush: ambush || undefined, list: absorb ? listOf(foe) : undefined });
      if (tier !== 'miss') { const rc = { foe: u, dmg: dmg + absorb, T, ev }; react(foe, 'hit', rc); if (a.contact !== false && !a.ranged && !a.area) react(foe, 'contact', rc); if (tier === 'crit') { react(foe, 'crit', rc); react(u, 'dealCrit', { foe, T, ev }); } if (foe.hp > 0 && foe.hp <= foe.max / 2) react(foe, 'half', rc); }   // 반응(D13)
      blocked = guardOn && tier !== 'miss';
      if (blocked) {
        guards.set(foe, guards.get(foe) - 1);
        if (guards.get(foe) === 0) ev.push({ t: 'guardBreak', who: foe.id });
      }
      if (tier === 'hit' || tier === 'crit') avoided = false;
      const drain = (a.drain || 0) + ((u.pas && u.pas.drain) || 0);   // 흡수(기술) + 진액 흡수(카드)
      if (tier !== 'miss' && dmg > 0 && drain && u.hp > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(dmg * drain * healK(u))); if (u.hp > before) ev.push({ t: 'heal', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }   // 흡수
      const refl = (has(foe, 'thorns') ? FX.thorns.reflect : 0) + ((foe.pas && foe.pas.reflect) || 0) + reflectAdd(foe);   // 반사 버프 + 가시 줄기(카드) + 쌓인 가시(D13)
      if (tier !== 'miss' && dmg > 0 && refl > 0 && a.contact !== false && !a.ranged && !a.area && u.hp > 0 && foe.hp > 0) { const rd = Math.max(1, Math.round(dmg * refl)); u.hp = Math.max(0, u.hp - rd); ev.push({ t: 'reflect', who: foe.id, to: u.id, dmg: rd }); }   // 반사(가시) — 쓰러진 식물의 가시는 찌르지 않음(같이 쓰러짐 막기)
      // 상태 효과: 빗나감이면 안 걸림(방어 자세로 막아도 걸림, 치명이라고 더 걸리지 않음 — 2026-10-15 사용자) · 연타는 첫 적중 한 번
      if (tier !== 'miss' && !landed) { landed = true; onHit(u, foe, a, { turn: T, rng, ev }); }
    }
    if (u.hp > 0) selfAll();   // 덤 버프(맞히든 빗나가든 쓴 순간)
    if (u.hp > 0) { afterAct(u, a, foe, T, ev, { spent, landed, bonusHit: a.bonusHit }); setField(o.field, a, T, ev); setCharge(u, a, T, ev); }   // 공통 장치: 얻기 · 모드 · 시한 · 메아리 · 소비 · 조작
    // 회피·방어 성공 보상(Yomi: 막으면 이득, 피하면 한 번 되받아침) — 연타는 모든 타를 빗나감 · 스침으로 넘겼을 때만 되받아침
    if (avoided && d.counter && a.contact !== false && !a.area && !a.ranged && foe.hp > 0) {
      const cd = Math.max(1, Math.round(hitDmg(foe, u, { power: d.counter }, 1)));
      u.hp = Math.max(0, u.hp - cd);
      ev.push({ t: 'counter', who: foe.id, to: u.id, dmg: cd, from: d.id });
    }
    if (avoided) react(foe, 'avoid', { foe: u, T, ev });
    if (avoided && d.nextCrit) foe.st.nextCrit = d.nextCrit;
    if (avoided && d.nextInit) foe.st.nextInit = d.nextInit;
    if (avoided && d.onAvoid) ev.push({ t: 'status', who: foe.id, to: u.id, status: d.onAvoid, from: d.id });
    if (blocked && dmg > 0 && d.counterPct && foe.hp > 0) { const cd = Math.max(1, Math.round(dmg * d.counterPct)); u.hp = Math.max(0, u.hp - cd); ev.push({ t: 'counter', who: foe.id, to: u.id, dmg: cd, from: d.id }); }
    if (blocked && d.energyOnBlock && foe.hp > 0) ev.push({ t: 'energy', who: foe.id, gain: d.energyOnBlock });
    noteFall(foe, ev); noteFall(u, ev);   // 맞은 쪽 먼저(되받아치기 · 반사는 그 뒤에 일어남)
    if (foe.hp <= 0 || u.hp <= 0) {
      // 후공이 잡은 자세(회피 되받아치기로 선공이 쓰러진 경우 등)는 자기 차례가 안 와도 화면에 보이게
      if (u === first && foe.hp > 0 && (d.act === 'guard' || d.act === 'evade')) showStance(foe);
      break;
    }
  }
  for (const u of [A, B]) { const a = actOf(u); u.st.lastStance = !skipped.has(u) && (a.act === 'guard' || a.act === 'evade') ? a.act : null; }
  return { first: first.id, events: ev };
}
