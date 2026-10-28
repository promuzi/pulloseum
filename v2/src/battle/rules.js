// v2 전투 규칙(순수 계산) — 화면·DOM·시각과 무관, 같은 씨앗이면 같은 결과(서버 재검증 #8). 설계 = docs/superpowers/specs/2026-10-15-v2-battle-rules-design.md
// 사용자 결정: 선공은 기동이 빠른 쪽이 '확률로' · 방어태세는 순서 무관 방어 ×4, 맞으면 해제(2026-10-18) · 회피는 선공·후공 모두 ·
//  회피는 무조건 피하기가 아니라 빗나감/스침/정타/치명 비율을 바꾸는 것 · 확률 p가 ceil(1/p)-1번 연속 실패하면 다음은 확정(불운 보정) ·
//  범위 공격은 회피가 어렵다(대신 비용·위력 대가) · 평타·방어 자세·회피 자세는 기본기, 특수 기술은 그 변주.

import { SKILL_WEAPON } from './matchup.js';
import { dynAct, payAct, afterAct, endureHp, react, takenK, reflectAdd, fieldEl, fieldHits, fieldStart, setField, setCharge, takeCharge, hexAct, resoAfter, evStackAdd, evCounter, firstUp, caveSync, caveAddAct, summonStart, orbStart, orbTrapBurst, bellSync, echoK, echoAct, thornBurst, miasmaStart, fruitOnUse, queenSync } from './devices.js';
import { ORB, effSpd, evadeK, atkK, defK, missAddOf, critAddOf, mustSkip, consumeSkip, blockedRest, endAct, shockRoll, onHit, apply, selfBuff, healK, has, listOf, noteFall, pasAtkK, pasDmgK, FX } from './status.js';

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
  areaMissK: 0.5,                               // 범위 공격 = 빗나감 · 스침을 이만큼으로 줄이고 준 만큼 정타(치명 그대로 — 2026-10-23 사용자 · 줄이는 양은 임시)
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
  let crit = (att.crit || 0) + (o.critAdd || 0) + (o.aim || 0);
  if (o.critK != null) crit = Math.floor(crit * o.critK);
  miss = Math.max(0, Math.min(RULES.missMax, miss)); crit = Math.max(0, Math.min(RULES.critMax, crit));
  if (o.aim) miss = 0;   // 조준(2026-10-23 재정의) = 빗나감 칸 없음 · 치명 칸 증가 · 회피가 옮기는 칸은 스침으로(아래)
  const sh = o.shift;   // 회피 자세: { miss, graze, critToGraze }
  if (sh) {
    const k = o.shiftK ?? 1;
    const dm = Math.round((sh.miss || 0) * k), dg = Math.round((sh.graze || 0) * k);
    if (sh.critToGraze) { const c = Math.round(crit * sh.critToGraze * k); crit -= c; graze += c; }
    crit -= Math.min(crit, dm + dg);   // 옮긴 만큼 치명부터 줄고, 모자란 몫은 정타가 줄어든다(정타 = 나머지)
    if (o.aim) graze += dm + dg;   // 조준 vs 회피 = 중간에서 만나기(사용자 확정 — 빗나감 대신 스침)
    else { miss = Math.min(RULES.missMax, miss + dm); graze += dg; }
  }
  const total = miss + graze + crit;
  if (total > 100) { const over = total - 100; const g = Math.min(graze, over); graze -= g; crit -= Math.min(crit, over - g); }
  if (o.sure) { miss = 0; graze = 0; }   // 반드시 맞음(피해? · 방심하기 — 빗나감 · 스침 없음)
  if (o.noCrit) crit = 0;   // 치명 없이(휙- 푹찍이 먼저 움직였을 때)
  if (o.area) { miss = Math.round(miss * RULES.areaMissK); graze = Math.round(graze * RULES.areaMissK); }   // 범위(2026-10-23 사용자 '빗나감과 스침을 줄이고 정타만 높이는 — 치명타도 그대로'): 확정 명중 없이 잘 맞음
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
// 2026-10-23 엑셀 v10(계획 Task 6): 방어 = 그 턴 모든 타 · 반사 = 그 턴 처음 맞는 한 타(멀리 · 광역도) · 보호막 = 상대 공격 기술 한 번 뒤 잔량 제거 ·
//  조준 = 다음 공격 기술 한 번의 모든 타 · 은신 = 기술을 실제로 쓸 때 시작(광역 아닌 공격 95% 빗나감) → 맞거나 · 내가 공격하거나 · 쉬면 풀림 · 다 피하면 바로 이어 공격 ·
//  범위 = 확정 명중 없음(회피 자세 효과 절반 · 은신은 못 가림)
const isReflect = a => !!(a && a.reflect);   // 반사 자세(기술의 reflect 표시)
export function resolveTurn(A, B, actA, actB, rng, o = {}) {
  const ev = [];
  stOf(A); stOf(B);
  const T = o.turn || 0, skipped = new Set();
  caveSync(A, B, ev);   // 스톤캡 동굴: 앞에 나와 있으면 상대 쪽에 깔고, 나가면 걷음
  miasmaStart(A, B, T, ev);   // 톡시캑터 독안개: 켠 다음 턴부터 턴 시작에 독
  queenSync(A, B);   // 블레이드바인 지옥의 여왕: 맞은편에 지옥이 있으면 기동 · 치명 ↑
  bellSync(A, B, T, ev);   // 프로스트벨 아침 · 밤(필드): 켠 프로스트벨이 앞에 있으면 양쪽 앞 식물에, 나갔거나 끝났으면 걷음
  summonStart(A, B, T, ev, rng); summonStart(B, A, T, ev, rng);
  orbStart(A, T); orbStart(B, T);   // 볼트바인 구슬: 홀수 턴 시작에 가득(덫에 나간 것 빼고)   // 스포어캡 소환수: 잠든 포자가 깨어나고 깨어난 것은 평타
  fieldStart(o.field, T, [A, B], ev);   // 경기장 효과(공통 장치 D10): 끝난 효과 걷기 · 비 = 화상 꺼짐
  let first;
  if (o.first) first = o.first;
  else { const pr = a => (a && a.early ? 1 : 0) - (a && a.late ? 1 : 0), r = rollFirst(A, B, rng, [pr(actA), pr(actB)]); first = r.first; ev.push({ t: 'first', who: first.id, chance: r.chance, prio: r.prio || undefined }); }
  const second = first === A ? B : A;
  // 순서 분기(공통 장치 — 2026-10-18 페탈로즈 검방술): 기술의 onFirst · onSecond 를 이번 턴 순서로 고름
  const br = (u, a) => (a && (a.onFirst || a.onSecond) ? { ...a, ...(u === first ? a.onFirst : a.onSecond), branch: u === first ? 'first' : 'second' } : a);
  actA = br(A, actA); actB = br(B, actB);
  const actOf = u => (u === A ? actA : actB);
  // 자세는 이 턴 안에서만(순서 무관 — 후공의 자세도 먼저 오는 공격에 걸림): 방어(guard · guardWith) = 모든 타 · 반사 = 처음 맞는 한 타 · 회피 = 모든 타(타마다 판정)
  const guards = new Set([A, B].filter(u => actOf(u).act === 'guard' || actOf(u).guardWith));
  for (const u of [A, B]) if (actOf(u).fakeDeath) { stOf(u).endureT = T; u.st.endureDone = false; u.st.endureHp = actOf(u).fakeDeath; }   // 죽은 줄 알았나?(쏜위드) = 그 턴 버티기(순서 무관 — 후공이어도 먼저 오는 공격에)
  for (const g of guards) stOf(g).guardT = T;   // 이 턴 방어태세(치명 방어 — 턴 끝에 터지는 확정 치명도 막음)
  const reflects = new Set([A, B].filter(u => isReflect(actOf(u))));
  const shown = new Set();
  const stanceOk = (u, kind) => kind === 'guard' ? guards.has(u) : kind === 'evade' || kind === 'reflect';
  const showStance = (u, kind = actOf(u).act) => {
    if (shown.has(u.id + kind)) return;
    ev.push({ t: 'stance', who: u.id, kind, id: actOf(u).id, active: stanceOk(u, kind), repeat: u.st.lastStance === kind });
    shown.add(u.id + kind);
  };
  // 누가 쓰러지면 그 턴의 남은 행동은 없음(쓰러진 식물을 때리거나 쓰러진 식물이 움직이지 않게 — 2026-10-16 판정 순서 점검)
  //  한 식물의 차례 = act(u, foe) → 'rest'(쉰 차례 · 다 막혀 쉼 — 면역이 생김) · 'end'(누가 쓰러져 그 턴 끝) · 그 밖 = 제 행동을 마침 → 면역 끝(엑셀 v10)
  for (const [u, foe] of [[first, second], [second, first]]) {
    const n0 = ev.length, r = act(u, foe);
    queenSync(A, B);   // 지옥전개를 막 켰으면 다음 행동부터 여왕 버프
    if (foe.eff && foe.eff.bounce && foe.eff.bounce.used) { delete foe.eff.bounce; ev.push({ t: 'expire', who: foe.id, ids: ['bounce'], list: listOf(foe) }); }   // 너꺼잉 = 상대 기술 한 번에 쓰임
    if (r === 'acted' || r === 'end') resoAfter(u, foe, ev, n0, T, guards.has(foe));   // 게일캑터: 방해 디버프가 들어간 기술이면 공명 +1
    if (r !== 'rest' && r !== 'gone' && !actOf(u).idle) endAct(u, ev);
    if (r === 'end' || r === 'gone' || foe.hp <= 0 || u.hp <= 0) break;   // 공명 추가 공격으로 쓰러져도 그 턴 끝
  }
  function act(u, foe) {
    const ch = u.hp > 0 && foe.hp > 0 ? takeCharge(u) : null;   // 2턴 기술(D11): 모은 기술이 고른 기술 대신 나감(고른 기술 햇빛은 돌려받음)
    if (ch) u.energy = Math.min(u.energyMax || 8, (u.energy || 0) + (actOf(u).cost || 0));
    const a = dynAct(u, ch || actOf(u), foe, rng), d = actOf(foe);   // 공통 장치: 개수 · 운 · 상대 상태로 정한 그 차례 기술 값(devices.js — 칸이 없으면 그대로)
    if (u.hp <= 0 || foe.hp <= 0) return 'gone';
    // 쉬는 차례(얼음·마비·기절): 고른 행동이 취소되고 쓴 에너지는 돌려받음 — 이번 턴 앞에서 걸렸어도 아직 안 움직였으면 여기서 취소
    if (a.act !== 'skip') shockRoll(u, { turn: T, rng, ev });   // 감전 = 자기 차례마다 확률로 마비(걸리면 아래에서 행동 취소)
    if (mustSkip(u)) { consumeSkip(u, T, ev, a.act === 'skip' ? 0 : a.cost || 0); skipped.add(u); return 'rest'; }
    if (a.act === 'skip') { skipped.add(u); if (a.blocked) { blockedRest(u, T, ev); return 'rest'; } return 'pass'; }   // 다 막혀 쉼 = 다음 턴 면역 · 시간 초과로 넘어감 = 그냥 지나감
    const spent = payAct(u, a, T, ev);   // 개수 · 체력 · 햇빛 내기
    const ek = echoK(u, T);   // 프로스트벨 메아리 몫(아침 · 밤이 켜진 동안 — 이번 기술이 켜는 것이면 0)
    fruitOnUse(u, a, ev);   // 드라코프루트: 빙결 효과 기술을 쓰면 비용을 낸 뒤 남은 햇빛 하나가 열매로(연타 · 적중과 무관)
    if (u === first) firstUp(u, T, ev);   // 게일바인: 선공하면 활력 한 겹
    if (a.act === 'guard' || a.act === 'evade') {
      showStance(u);
      if (a.self) selfBuff(u, a.self, { turn: T, ev }, a);   // 자세 + 덤 버프(블레이드바인 치명적 무희 = 회피 자세 + 예리)
      return 'acted';
    }
    if (a.act === 'sun') {   // 광합성(기본기 — 햇빛 +2) · 메아리면 그 몫만큼 더(아침 = +0.5)
      const e0 = u.energy || 0; u.energy = Math.min(u.energyMax || 8, e0 + (a.gain || 2)); ev.push({ t: 'sun', who: u.id, id: a.id, gain: u.energy - e0 });
      if (ek) { const e1 = u.energy; u.energy = Math.min(u.energyMax || 8, e1 + (a.gain || 2) * ek); ev.push({ t: 'echo', who: u.id, id: a.id, k: ek }); ev.push({ t: 'sun', who: u.id, id: a.id, gain: u.energy - e1, echo: true }); }
      return 'acted';
    }
    const selfAll = () => { for (const b of [a.self, a.also, ...(a.selfMore || [])]) if (b) selfBuff(u, b, { turn: T, ev }, a); };   // 나에게 거는 효과(버프 기술 · 공격 기술 덤) — 그 기술 값(은신 이어 공격 등)을 같이 넘김
    // 메아리 덤(나에게): 능력치 겹은 그 몫의 값 · 보호막은 그 몫만큼 더 · 정화는 한 번 더 · 기간만 있는 효과는 그대로(긴 쪽이라 바뀌지 않음)
    const selfEcho = ea => { for (const b of [ea.self, ea.also]) { if (!b) continue; if (FX[b] && FX[b].stat) selfBuff(u, b, { turn: T, ev }, { v: FX[b].v * ea.echoK }); else if (b === 'shield' && u.eff && u.eff.shield) u.eff.shield.hp += Math.max(1, Math.round(u.max * FX.shield.hp * ea.echoK)); else if (b === 'purify') selfBuff(u, b, { turn: T, ev }, ea); } };
    if (a.act === 'buff') {
      ev.push({ t: 'cast', who: u.id, id: a.id }); if (isReflect(a)) showStance(u, 'reflect'); selfAll(); afterAct(u, a, foe, T, ev, { spent, rng }); setField(o.field, a, T, ev); setCharge(u, a, T, ev);
      if (a.bell) bellSync(A, B, T, ev);   // 아침 · 밤을 켬 → 바로 필드에
      if (ek && !isReflect(a)) { const ea = echoAct(a, ek); ev.push({ t: 'echo', who: u.id, id: a.id, k: ek }); selfEcho(ea); afterAct(u, ea, foe, T, ev, { spent: 0, rng, healK: ek }); }
      return 'acted';
    }
    if (a.act === 'hex') {   // 피해 없이 상대에게 거는 기술(종 고유 v2)
      ev.push({ t: 'cast', who: u.id, id: a.id }); hexAct(u, foe, a, { turn: T, rng, ev }); afterAct(u, a, foe, T, ev, { spent, rng });
      if (ek && foe.hp > 0) { ev.push({ t: 'echo', who: u.id, id: a.id, k: ek }); hexAct(u, foe, { ...a, hex: (a.hex || []).map(h => echoAct({ inflict: h }, ek).inflict), caveAdd: null, burst: false, galeAdd: null }, { turn: T, rng, ev }); }
      return 'acted';
    }
    if (a.act !== 'attack') { ev.push({ t: 'act', who: u.id, id: a.id }); return 'acted'; }
    const r = strike(u, foe, a);
    if (r.hard) evCounter(foe, u, T, ev, rng);
    if (r.mg && u.hp > 0 && u.eff && u.eff.thornTrap && u.eff.thornTrap.n > 0) thornBurst(u, foe, T, ev, rng);   // 쏜위드 덫(우리 편 지형): 빗나가거나 스치면 한 행동에 하나
    if (a.caveAdd && u.hp > 0) caveAddAct(u, foe, a, ev);
    if (r.landed && u.hp > 0 && foe.eff && foe.eff.orbTrap && foe.eff.orbTrap.n > 0) orbTrapBurst(foe, u, T, ev, rng);   // 봉인 구슬 덫(내 쪽 지형) = 맞히면 하나가 터짐   // 지반붕괴 = 공격 + 동굴에 설치   // 게일바인: 맞으면 그 공격이 끝난 뒤 스택을 다 써서 반격
    if (u.hp > 0) selfAll();   // 덤 버프(맞히든 빗나가든 쓴 순간)
    if (u.hp > 0) { afterAct(u, a, foe, T, ev, { spent, landed: r.landed, bonusHit: a.bonusHit, rng }); setField(o.field, a, T, ev); setCharge(u, a, T, ev); }   // 공통 장치: 얻기 · 모드 · 시한 · 메아리 · 소비 · 조작
    // 회피·방어 성공 보상(Yomi: 막으면 이득, 피하면 한 번 되받아침) — 연타는 모든 타를 빗나감 · 스침으로 넘겼을 때만 되받아침
    if (r.avoided && d.counter && (d.counterAll || (a.contact !== false && !a.ranged)) && !a.area && foe.hp > 0) {   // counterAll = 멀리서 온 공격도(윈드페탈 환희의 춤 — 원거리 구분 폐지)
      const cd = Math.max(1, Math.round(r.hitDmg(foe, u, { power: d.counter }, 1)));
      u.hp = Math.max(0, u.hp - cd);
      ev.push({ t: 'counter', who: foe.id, to: u.id, dmg: cd, from: d.id });
    }
    if (r.avoided) react(foe, 'avoid', { foe: u, T, ev });
    if (r.avoided && d.nextCrit) { const fe = (foe.eff ||= {}); fe.aim = { k: Math.max((fe.aim && fe.aim.k) || 0, d.nextCrit) }; }   // 피하면 조준(치명 준비)
    if (r.avoided && d.nextInit) foe.st.nextInit = d.nextInit;
    if (r.avoided && d.onAvoid) ev.push({ t: 'status', who: foe.id, to: u.id, status: d.onAvoid, from: d.id });
    if (r.blocked && r.dmg > 0 && d.counterPct && foe.hp > 0) { const cd = Math.max(1, Math.round(r.dmg * d.counterPct)); u.hp = Math.max(0, u.hp - cd); ev.push({ t: 'counter', who: foe.id, to: u.id, dmg: cd, from: d.id }); }
    if (r.blocked && d.energyOnBlock && foe.hp > 0) ev.push({ t: 'energy', who: foe.id, gain: d.energyOnBlock });
    // 은신한 채 이 공격을 다 피함(맞으면 은신이 풀렸으니 남아 있으면 다 피한 것) → 바로 이어 공격 — 은신 · 이어 공격을 먼저 지우고 쏨(그 공격이 은신 해제에 걸리지 않게)
    if (r.hid && has(foe, 'stealth') && foe.eff.stealth.link && foe.hp > 0 && u.hp > 0) {
      const L = foe.eff.stealth.link, el0 = foe.curEl;
      delete foe.eff.stealth;
      foe.curEl = L.el;
      strike(foe, u, { act: 'attack', cats: ['attack'], contact: true, ...L, id: L.id, name: L.name, el: L.el }, { link: true });
      foe.curEl = el0;
    }
    // 메아리(프로스트벨 — 2026-10-22 사용자 '선공에 공격하면 바로 그다음에 또 들어가는 거야'): 같은 차례에 기술 전체를 한 번 더(연타면 다 끝난 뒤) ·
    //  위력 = 몫만큼 · 따로 맞히기 판정 · 그 순간 상대 상태로 다시 정함(깨트려드리죠 = 첫 타로 얼었으면 메아리 타가 깨기)
    if (ek && foe.hp > 0 && u.hp > 0) {
      ev.push({ t: 'echo', who: u.id, id: a.id, k: ek });
      const ea = dynAct(u, echoAct(ch || actOf(u), ek), foe, rng), r2 = strike(u, foe, ea);
      if (r2.hard) evCounter(foe, u, T, ev, rng);
      if (r2.landed && u.hp > 0 && foe.eff && foe.eff.orbTrap && foe.eff.orbTrap.n > 0) orbTrapBurst(foe, u, T, ev, rng);
      if (u.hp > 0) { selfEcho(ea); afterAct(u, ea, foe, T, ev, { spent: 0, landed: r2.landed, bonusHit: ea.bonusHit, rng, healK: ek }); }
    }
    noteFall(foe, ev); noteFall(u, ev);   // 맞은 쪽 먼저(되받아치기 · 반사는 그 뒤에 일어남)
    if (foe.hp <= 0 || u.hp <= 0) {
      // 후공이 잡은 자세(회피 되받아치기로 선공이 쓰러진 경우 등)는 자기 차례가 안 와도 화면에 보이게
      if (u === first && foe.hp > 0 && (d.act === 'guard' || d.act === 'evade')) showStance(foe);
      return 'end';
    }
    return 'acted';
  }
  // 공격 기술 한 번(이어 공격도 같음 — L.link): 연타 a.hits = 타마다 따로 판정(불운 보정 없음 · 효과는 첫 적중 한 번)
  //  관통 a.pierce = 상대 방어를 그만큼 무시 · 보호막 → 방어구 순서로 먼저 막음(방어구는 망치 ×1.5로 깎임) · 기습(ambush) = 은신에서 이어진 공격만 ×1.5 + 상대 자세 무시
  function strike(u, foe, a, L = {}) {
    const d = actOf(foe), still = !mustSkip(foe) && !skipped.has(foe);
    const ambush = !!(L.link && a.ambush), sure = !!a.sure, bare = still && d.bare ? d.bare : 0;   // 피해? = 반드시 맞음 · 자세 무시 / 방심하기 = 그 턴 다 맞고 피해 −40%
    const evadeOn = !ambush && !sure && !bare && still && (d.act === 'evade' || !!d.evadeWith) && stanceOk(foe, 'evade');   // evadeWith = 공격하면서 피하기
    const rep = d.act === foe.st.lastStance ? RULES.repeatStanceK : 1;
    // 피해: 능력치 겹(활력 · 쇠약 · 억셈 · 시듦 등) · 카드 패시브(2026-10-17): 공격 배율 pasAtkK · 피해 배율 pasDmgK · 치명 피해 critDmg(예리한 날)
    const hitDmg = (x, y, sk, el, defenseK = 1) => baseDamage({ atk: x.atk * atkK(x) * pasAtkK(x, y) }, { def: y.def * defK(y) * defenseK * (1 - (sk.pierce || 0)) }, sk, el) * pasDmgK(x, y);
    if (a.infused) u.curEl = a.el;   // 속성 바꾸기(불타는 의지) — 상성도 그 속성으로
    const em = (o.elemMult ? o.elemMult(u, foe, a) : 1) * fieldEl(o.field, a.el);   // × 경기장 효과(D10) · 속성 × 변이 상성(battle/matchup.js — 기술 a를 같이 넘김)
    const N = Math.max(1, (a.strikes ? a.strikes.length : a.hits || 1) + fieldHits(o.field, a)), hammer = SKILL_WEAPON[a.id] === 'hammer';
    const og = still && d.orbGuard && foe.orb && foe.orb.n > 0 && foe.st.orbGuardT !== T ? { cap: foe.orb.n * Math.round(foe.max * ORB.guard), used: 0 } : null;   // 수호 구슬 = 이 공격 기술 한 번의 모든 타를 구슬이 막음
    const hid = has(foe, 'stealth'), spw = !!(foe.eff && foe.eff.shield && foe.eff.shield.spore);   // 포자벽 = 막으면 때린 상대에게 포자   // 이 공격 앞에서 숨어 있었나(은신끼리도 서로 안 보임 — 2026-10-23 사용자)
    const aimK = (u.eff && u.eff.aim && u.eff.aim.k) || 0;
    let landed = false, avoided = evadeOn, blocked = false, dmg = 0, shieldHit = false, hard = false, allMiss = true, tries = 0;
    const evN = ev.length;
    const hitSet = new Set();   // 효과는 맞은 대상마다 첫 적중 한 번
    // 소환수(엑셀 v10 50행 + 2026-10-21~22): 주인을 노린 공격은 앞 소환수부터 대신 맞음(피해 · 디버프 · 상태이상) · 연타는 깨진 뒤 남은 타를 주인이 · 광역은 모두 ·
    //  한 타로 깨질 때 남는 피해는 안 넘어감 · 보호막(주인)이 소환수보다 먼저 막음 · 소환수에겐 자세 · 은신이 없음
    const sums = () => (foe.summons || []).filter(s => s.hp > 0);
    const hitSum = (s, ah, i) => {
      const k = foe.summons.indexOf(s), t = hitTable(u, s, { area: !!a.area, aim: aimK, critAdd: critAddOf(u), missAdd: missAddOf(u) }), tier = tierOf(t, Math.floor(rng() * 100));
      let dm = Math.round(hitDmg(u, s, ah, em) * RULES.tierMult[tier] * (ambush ? FX.stealth.ambush : 1)), absorb = 0;
      if (dm > 0 && foe.eff && foe.eff.shield && !a.noShield) { const sh = foe.eff.shield; absorb = Math.min(sh.hp, dm); sh.hp -= absorb; dm -= absorb; shieldHit = true; }
      dm = Math.min(dm, s.hp); s.hp -= dm;
      ev.push({ t: 'hit', who: u.id, to: foe.id, sum: k, id: a.id, tier, dmg: dm, mult: em, absorb, ab: absorb ? 'shield' : undefined, table: t, area: !!a.area, n: N > 1 ? i + 1 : undefined, of: N > 1 ? N : undefined, link: L.link ? { id: a.id, name: a.name } : undefined });
      if (tier === 'hit' || tier === 'crit') avoided = false;
      if (tier !== 'miss' && !hitSet.has(s)) { hitSet.add(s); landed = true; onHit(u, s, a, { turn: T, rng, ev }); }
      if (s.hp <= 0) { foe.summons.splice(k, 1); ev.push({ t: 'summonBreak', who: foe.id, i: k, name: s.name }); }
    };
    if ((a.reveal || sure) && has(foe, 'stealth')) { delete foe.eff.stealth; ev.push({ t: 'reveal', who: foe.id, id: 'stealth', list: listOf(foe) }); }   // 드러내기(장치 D14)
    for (let i = 0; i < N && foe.hp > 0 && u.hp > 0; i++) {
      const ah = a.strikes ? { ...a, ...a.strikes[i % a.strikes.length] } : a;   // 타마다 다른 성질(베기 · 찌르기)
      const ss = sums();
      if (ss.length && !a.area) { hitSum(ss[0], ah, i); continue; }   // 단일 = 앞 소환수가 대신 맞음
      if (ss.length) for (const s of ss) hitSum(s, ah, i);           // 광역 = 소환수도 모두 맞고 주인도 맞음
      tries++;
      const guardOn = !ambush && !sure && still && guards.has(foe);
      if (guardOn) showStance(foe, 'guard');
      const veil = a.area || bare ? 0 : has(foe, 'stealth') ? FX.stealth.miss : 0;   // 은신 = 광역 아닌 공격 95% 빗나감(내가 숨어 있어도)
      const t = hitTable(u, foe, { area: !!a.area, shift: evadeOn ? d.shift : null, shiftK: rep * evadeK(foe, u), critK: foe.st.critTaken ? RULES.critAfterCritK : null, sure: sure || !!bare, noCrit: a.critIfDodged && u === first, aim: aimK, critAdd: critAddOf(u) + (a.critPlus || 0), missAdd: missAddOf(u) });   // critPlus = 치명 칸이 높은 기술(블레이드바인 칼날 잎)
      let tier, forced = false;
      if (veil && rng() < veil) tier = aimK ? 'graze' : 'miss';   // 은신에 빗나감(판정표 빗나감 상한 70% 밖에서 따로) · 조준이면 스침으로 맞아 드러남
      else if (N > 1) tier = tierOf(t, Math.floor(rng() * 100));   // 연타 = 불운 보정 없음(사용자 "연타에서는 보정을 하지 말자")
      else { const j = judgeHit(t, u.st.miss[foe.id] || 0, rng); u.st.miss[foe.id] = j.missStreak; tier = j.tier; forced = j.forced; }
      if ((a.critIfDodged && u !== first && u.st.dodgedT === T) || (sure && u === first)) tier = 'crit';   // 확정 치명(휙- 푹찍 = 먼저 친 상대가 빗나간 뒤 · 피해? = 선공) — 치명 방어엔 막힘
      if ((guardOn || (sure && !ambush && still && guards.has(foe))) && tier === 'crit' && d.blockCrit !== false) tier = 'hit';   // 치명 방어 · 피해?도 방어태세엔 치명이 막힘(2026-10-24 사용자 — 막는 힘 ×4는 그대로 무시)
      const critK = tier === 'crit' && u.pas && u.pas.critDmg ? 1 + u.pas.critDmg : 1;
      dmg = Math.round(hitDmg(u, foe, ah, em, guardOn ? guardDefMult(d, rep !== 1) : 1) * RULES.tierMult[tier] * critK * (ambush ? FX.stealth.ambush : 1));
      if (evadeOn && d.punishOnHit && (tier === 'hit' || tier === 'crit')) dmg = Math.round(dmg * (1 + d.punishOnHit));
      dmg = Math.round(dmg * takenK(foe) * (bare || 1));   // 받는 피해 배율(D13 — 체력 가득이면 위엄 등)
      let absorb = 0, ab = null;
      if (og && dmg > 0 && og.cap > 0) { const k = Math.min(og.cap, dmg); og.cap -= k; og.used += k; dmg -= k; absorb += k; ab = 'orb'; }   // 보호막 → 방어구 순서로 먼저 막음
      if (dmg > 0 && foe.eff && foe.eff.shield && !a.noShield) { const sh = foe.eff.shield; absorb = Math.min(sh.hp, dmg); sh.hp -= absorb; dmg -= absorb; ab = 'shield'; shieldHit = true; }
      if (dmg > 0 && foe.eff && foe.eff.armor) {
        const ar = foe.eff.armor, k = hammer ? FX.armor.hammerK : 1, use = Math.min(ar.hp, dmg * k), took = Math.min(dmg, Math.round(use / k));
        ar.hp -= use; absorb += took; dmg -= took; ab = 'armor';
        if (ar.hp <= 0.5) { delete foe.eff.armor; ev.push({ t: 'armorBreak', who: foe.id, list: listOf(foe) }); }
      }
      foe.hp = endureHp(foe, foe.hp - dmg, ev, T);   // 버티기(공통 장치 D7 · 죽은 줄 알았나?) — 없으면 0에서 멈춤
      foe.st.critTaken = tier === 'crit';
      ev.push({ t: 'hit', who: u.id, to: foe.id, id: a.id, tier, dmg, mult: em, absorb, ab: ab || undefined, forced, table: t, guard: guardOn, evade: evadeOn, area: !!a.area, n: N > 1 ? i + 1 : undefined, of: N > 1 ? N : undefined, veil: veil ? true : undefined, ambush: ambush || undefined, link: L.link ? { id: a.id, name: a.name } : undefined, list: absorb ? listOf(foe) : undefined });
      if (foe.st && foe.st.pendEv) { for (const x of foe.st.pendEv) ev.push({ ...x, hp: foe.hp, list: listOf(foe) }); delete foe.st.pendEv; }   // 버티기 · 죽은 줄 알았나? · 부활잉 = 맞은 사건 뒤에 '일어남'(그 뒤 체력 hp — 화면 · 점검이 체력을 맞춤)
      if (tier !== 'miss' && has(foe, 'stealth')) {
        const pr = foe.eff.stealth.reflect; delete foe.eff.stealth; ev.push({ t: 'reveal', who: foe.id, id: 'stealth', list: listOf(foe) });
        if (pr && dmg + absorb > 0 && u.hp > 0 && foe.hp > 0) { const rd = Math.max(1, Math.round((dmg + absorb) * (pr === true ? FX.reflect.k : pr))); u.hp = Math.max(0, u.hp - rd); ev.push({ t: 'reflect', who: foe.id, to: u.id, dmg: rd }); }   // 환각의 주파수 · 은시잉: 뚫리면 처음 맞은 한 타 반사(은시잉 = 크게)
      }   // 맞으면 은신이 풀림(회피 실패 — 스침 포함)
      if (tier !== 'miss') { const rc = { foe: u, dmg: dmg + absorb, T, ev }; react(foe, 'hit', rc); if (a.contact !== false && !a.ranged && !a.area) react(foe, 'contact', rc); if (tier === 'crit') { react(foe, 'crit', rc); react(u, 'dealCrit', { foe, T, ev }); } if (foe.hp > 0 && foe.hp <= foe.max / 2) react(foe, 'half', rc); }   // 반응(D13)
      blocked = guardOn && tier !== 'miss';
      if (blocked && d.onBlock && d.onBlock.stun && u.hp > 0 && rng() < d.onBlock.stun) apply(u, 'stun', 1, { turn: T, rng, ev, by: foe });   // 막으면 확률로 기절(방패 때리기)
      if (tier === 'hit' || tier === 'crit') { avoided = false; hard = true; }
      if (tier === 'miss') evStackAdd(foe, ev); else allMiss = false;   // 게일바인: 빗나간 타마다 스택 +1
      const drain = (a.drain || 0) + ((u.pas && u.pas.drain) || 0);   // 흡수(기술) + 진액 흡수(카드)
      if (tier !== 'miss' && dmg > 0 && drain && u.hp > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(dmg * drain * healK(u))); if (u.hp > before) ev.push({ t: 'heal', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }   // 흡수
      // 반사 자세(엑셀 v10 방어 스킬): 그 턴 처음 맞은 한 타의 피해 몫을 되돌림(멀리 · 광역도) — 빗나감은 소모하지 않음
      if (tier !== 'miss' && still && reflects.has(foe) && dmg + absorb > 0 && u.hp > 0 && foe.hp > 0) {
        reflects.delete(foe); showStance(foe, 'reflect'); const rd = Math.max(1, Math.round((dmg + absorb) * FX.reflect.k)); u.hp = Math.max(0, u.hp - rd); ev.push({ t: 'reflect', who: foe.id, to: u.id, dmg: rd });
        if (d.reflectInflict && u.hp > 0) apply(u, d.reflectInflict.id, d.reflectInflict.n || 1, { turn: T, rng, ev, by: foe }, d.reflectInflict);   // 젤리캡: 반사가 터지면 그 상대에게(말랑잉 = 감전 · 톡씽 = 독)
      }
      if (tier === 'miss' && evadeOn && a.dodgeSeal && foe.hp > 0) apply(foe, 'seal', 1, { turn: T, rng, ev, by: u }, { extra: !!(foe.eff && foe.eff.seal && foe.eff.seal.from === T + 1) });   // 미역잉: 상대가 회피로 피한 타마다 봉인 하나(다른 기술로)
      const refl = ((foe.pas && foe.pas.reflect) || 0) + reflectAdd(foe);   // 가시 줄기(카드) + 쌓인 가시(D13) = 붙어서 맞을 때마다(패시브 — 분류 밖 규칙)
      if (tier !== 'miss' && dmg > 0 && refl > 0 && a.contact !== false && !a.ranged && !a.area && u.hp > 0 && foe.hp > 0) { const rd = Math.max(1, Math.round(dmg * refl)); u.hp = Math.max(0, u.hp - rd); ev.push({ t: 'reflect', who: foe.id, to: u.id, dmg: rd }); }   // 쓰러진 식물의 가시는 찌르지 않음(같이 쓰러짐 막기)
      // 상태 효과: 빗나감이면 안 걸림(방어 자세로 막아도 걸림, 치명이라고 더 걸리지 않음 — 2026-10-15 사용자) · 연타는 첫 적중 한 번
      if (tier !== 'miss' && !hitSet.has(foe)) { hitSet.add(foe); landed = true; onHit(u, foe, a, { turn: T, rng, ev }); }
      if (tier !== 'miss' && a.perHit && u.hp > 0) selfBuff(u, a.perHit.id, { turn: T, ev }, a.perHit);   // 맞힌 타마다 나에게(칼춤 = 활력 +5% · 같은 기술 겹 상한)
      if (tier !== 'miss' && a.perHitInflict && foe.hp > 0) {   // 맞힌 타마다 상대에게(톡시캑터 만천화우 · 독점사 연타 = 타마다 독) · 독이 bleedAt 겹이면 그 타에 출혈(그 타의 독까지 반영)
        apply(foe, a.perHitInflict.id, a.perHitInflict.n || 1, { turn: T, rng, ev, by: u }, a.perHitInflict);
        if (a.bleedAt && foe.eff && foe.eff.poison && foe.eff.poison.n >= a.bleedAt) apply(foe, 'bleed', 1, { turn: T, rng, ev, by: u });
      }
      if (tier === 'crit' && a.critInflict && foe.hp > 0) apply(foe, a.critInflict.id, a.critInflict.n || 1, { turn: T, rng, ev, by: u }, a.critInflict);   // 치명이 터진 타마다 상대에게(블레이드바인 칼날 잎 = 출혈)
      if (tier === 'crit' && a.critHeal && u.hp > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * a.critHeal * healK(u))); if (u.hp > before) ev.push({ t: 'heal', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }   // 치명이 터진 대상마다 내 회복(피의 축제)
    }
    if (og) { foe.orb.n = Math.max(0, foe.orb.n - Math.ceil(og.used / Math.max(1, Math.round(foe.max * ORB.guard)))); foe.st.orbGuardT = T; }   // 막은 만큼만 구슬이 깎임
    if (spw && shieldHit && u.hp > 0) apply(u, 'spore', 1, { turn: T, rng, ev, by: foe });
    if (shieldHit && foe.eff && foe.eff.shield) { delete foe.eff.shield; ev.push({ t: 'expire', who: foe.id, ids: ['shield'], list: listOf(foe) }); }   // 보호막 = 막은 공격 기술이 끝나면 잔량 제거
    if (tries && allMiss) foe.st.dodgedT = T;   // 이 공격을 다 피함(스침은 빗나감 아님) — 휙- 푹찍
    const mg = ev.slice(evN).some(e => e.t === 'hit' && e.who === u.id && (e.tier === 'miss' || e.tier === 'graze'));   // 쏜위드 덫: 이 공격에 빗나가거나 스친 타가 있었나
    if (u.eff && u.eff.aim) delete u.eff.aim;   // 조준 = 공격 기술 한 번에 소비(맞든 빗나가든)
    if (!L.link && has(u, 'stealth')) { delete u.eff.stealth; ev.push({ t: 'reveal', who: u.id, id: 'stealth', mine: true, list: listOf(u) }); }   // 내가 공격하면 은신이 풀림(이어 공격 없음)
    return { landed, avoided, blocked, dmg, hid, hitDmg, hard, mg };
  }
  for (const u of [A, B]) { const a = actOf(u); u.st.lastStance = !skipped.has(u) && (a.act === 'guard' || a.act === 'evade') ? a.act : null; }
  return { first: first.id, events: ev };
}
