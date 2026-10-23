// 3:3 교체전(2026-10-15 사용자 "3:3은 내가 식물 3개 들고 싸우는 거임 포켓몬처럼 교체 가능하고 — 이름도 팀리그라고는 하지 말자")
//  양쪽 식물 셋, 한 번에 앞에 선 하나만 싸운다. 내 차례 = 기술 또는 교체 — 옛 판 = 교체가 먼저 일어나고 들어온 식물이 상대 기술을 맞음(포켓몬처럼),
//  swOrder 판(2026-10-18~ 새 판) = 교체도 선공 · 후공을 따름: 먼저면 바꾼 뒤 들어온 식물이 맞고, 늦으면 지금 식물이 맞은 뒤 바뀜.
//  쓰러지면 턴 끝에 다음 식물(나 = 직접 고름·턴을 안 씀, 봇 = 상성을 보고 고름) · 셋 다 쓰러지면 끝. 햇빛(기력)은 식물마다 따로 — 나와 있는 식물만 참(ownSun · 2026-10-22~ 새 판, 옛 판은 팀이 함께 씀 · 시작 2 · 턴마다 +1 · 최대 8).
//  계산은 1:1과 같은 rules.resolveTurn(같은 씨앗·같은 선택 → 같은 결과, 화면 무관). 화면은 B.me·B.foe(앞에 선 식물)를 읽으면 된다.
//  상태 효과(status.js): 교체로 나가면 독·화상만 따라감 · 뿌리 묶기면 교체 못 함 · 쉬는 차례(얼음·마비·기절)엔 교체도 못 함(사용자 2026-10-15) · 에너지 회복은 앞 식물이 그늘이면 안 참.
import { makeRng, resolveTurn, rollFirst } from './rules.js';
import { elemMult, aiPick, REST, closeTurn, firstOk, expDamage, threatOf, seenOf, lastOf } from './model.js';
import { formMult } from './matchup.js';
import { canUse, canSwitch, mustSkip, clearOnSwitch, moveEnv, listOf, useCount } from './status.js';

// swapCd = 스스로 교체한 뒤 다시 교체 못 하는 턴 수(2026-10-18 사용자 "2턴" — 0 = 제한 없음: 이 규칙 전에 시작한 판)
// swOrder = 교체도 선공 · 후공 순서를 따름(2026-10-18 사용자 "선공후공에 따라 맞고 바뀔지 바뀌고 맞을지" — false = 이 규칙 전에 시작한 판)
// ownSun = 햇빛을 식물마다 따로 — 앞에 나와 있는 식물만 턴 끝에 참, 대기석에선 그대로(2026-10-18 사용자 결정 "추천대로", 2026-10-22 넣음).
//  false = 이 규칙 전에 시작한 판(팀이 햇빛 하나를 같이 씀 — 이어 하는 옛 판은 그대로라 RULES_VER 는 안 올림)
export function makeTeamBattle({ me, foe, seed = 20261015, swapCd = 0, swOrder = false, ownSun = false }) {
  const start = T => Math.max(2, ...T.map(u => (typeof u.energy === 'number' ? u.energy : 2)));   // 시작 에너지 = 팀에서 가장 큰 값(카드 '엽록체 증식' — 2026-10-17)
  const B = { mode: 'swap3', team: { me, foe }, act: { me: 0, foe: 0 }, pool: { me: start(me), foe: start(foe) }, rng: makeRng(seed), turn: 1, over: null, log: [], need: null };
  if (ownSun) for (const side of ['me', 'foe']) for (const u of B.team[side]) { if (typeof u.energy !== 'number') u.energy = 2; }   // 식물마다 제 햇빛(새 판 = 유닛을 만들 때 정한 시작 값 — 카드 '엽록체 증식'도 그 식물만 · 이어 하는 판 = 저장된 값 그대로)
  else for (const side of ['me', 'foe']) for (const u of B.team[side]) Object.defineProperty(u, 'energy', { get: () => B.pool[side], set: v => { B.pool[side] = v; }, configurable: true, enumerable: true });
  me.forEach((u, i) => { u.slot = 'me' + i; }); foe.forEach((u, i) => { u.slot = 'foe' + i; });   // 유닛 이름표(기생을 건 식물 찾기 — 같은 편 셋의 id는 모두 'me' · 'foe')
  B.me = me[0]; B.foe = foe[0];
  B.cdLen = swapCd; B.swapCd = { me: 0, foe: 0 };   // 남은 턴(0 = 바꿀 수 있음)
  B.swOrder = !!swOrder; B.ownSun = !!ownSun;
  return B;
}
export const aliveOf = (B, side) => B.team[side].map((u, i) => (u.hp > 0 ? i : -1)).filter(i => i >= 0);

// 봇이 앞에 둘 식물 점수(사람과 같은 정보 — 내 앞 식물의 속성 · 체력 · 이번 판에 쓴 기술): 상대 기술이 잘 들면 −, 내가 잘 들면 +, 체력이 많을수록 +
//  2026-10-22 사용자 "봇 지능 향상. 교환 등 전투를 전략적으로 하도록": 받을 피해(상대가 쓴 기술 · 햇빛으로 짐작)와 줄 피해까지 봄
const matchVal = (B, u) => {
  const m = B.me, give = Math.max(0, ...u.kit.filter(s => s.act === 'attack').map(s => expDamage(u, m, s))) / Math.max(1, m.hp), take = threatOf(m, u, seenOf(B)) / Math.max(1, u.hp);
  return (elemMult(u.el, m.el) > 1 ? 0.8 : 0) - (elemMult(m.el, u.el) > 1 ? 1.2 : 0) + 0.6 * u.hp / u.max + 0.8 * Math.min(1, give) - 0.8 * Math.min(1.5, take);
};
const benchScore = (B, i) => matchVal(B, B.team.foe[i]);
function aiSwitch(B, rng) {
  const bench = aliveOf(B, 'foe').filter(i => i !== B.act.foe);
  if (!bench.length || !canSwitch(B.foe, B.turn) || (B.swapCd && B.swapCd.foe > 0)) return null;
  const f = B.foe, iq = f.ai ?? 0.5;
  if (f.kit.some(s => canUse(f, s) && expDamage(f, B.me, s) >= B.me.hp * 0.95)) return null;   // 지금 식물로 이번 턴에 끝낼 수 있으면 그대로
  const best = bench.reduce((a, b) => (benchScore(B, b) > benchScore(B, a) ? b : a)), gain = benchScore(B, best) - matchVal(B, f);
  const doomed = threatOf(B.me, f, seenOf(B)) >= f.hp;   // 이번 턴 쓰러질 만함 — 들어올 식물이 버틸 만할 때만 바꿈(교체도 한 턴을 씀)
  const want = gain > 0.9 ? 0.25 + 0.6 * iq : doomed && gain > 0.35 ? 0.15 + 0.45 * iq : 0;
  return want && rng() < want ? best : null;
}
const aiNext = B => aliveOf(B, 'foe').reduce((a, b) => (benchScore(B, b) > benchScore(B, a) ? b : a));
function swapIn(B, side, to, ev, forced = false) {
  const from = B.act[side], prev = B.team[side][from];
  moveEnv(prev, B.team[side][to]);   // 환경(강풍 등)은 그 쪽 진영 것 — 새 앞 식물에게
  clearOnSwitch(prev);
  B.act[side] = to; B[side] = B.team[side][to];
  const e = { t: 'switch', who: side, from, to, hp: B[side].hp, forced, list: listOf(B[side]) };
  ev.push(e);
  return e;
}

// 사람의 수 → 이번 턴 기술: 쉬는 차례 = 쉬기, rest = 넘어감(시간 초과 — 2026-10-16 사용자 "안 하면 넘어가는 걸로", 전엔 3:3만 평타로 바꿨음), 못 쓰는 기술 = 평타
const okSwitch = (B, side, a) => a.kind === 'switch' && canSwitch(B[side], B.turn) && !(B.swapCd && B.swapCd[side] > 0) && B.team[side][a.to] && B.team[side][a.to].hp > 0 && a.to !== B.act[side];
export const swapWait = (B, side) => (B.swapCd && B.swapCd[side]) || 0;   // 화면: 교체까지 남은 턴
const skillOf = (u, a) => (mustSkip(u) || a.kind === 'rest' ? REST : a.kind === 'skill' && canUse(u, a.skill) ? a.skill : firstOk(u));

// 한 턴: myAct = { kind: 'skill', skill } | { kind: 'switch', to } | { kind: 'rest' }(쉬는 차례 · 시간 초과)
//  foeAct = 친구 대결(사람)의 수 — 없으면 봇이 고름. 친구 대결은 쓰러진 자리를 저마다 직접 채움(턴 끝 B.need = 'me' | 'foe' | 'both')
export function playTurn3(B, myAct, foeAct = null) {
  const T = B.turn, ev = [], human = !!foeAct;
  const foeSw = human ? (okSwitch(B, 'foe', foeAct) ? foeAct.to : null) : aiSwitch(B, B.rng);
  const foeSkill = foeSw != null ? null : human ? skillOf(B.foe, foeAct) : mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, B.rng, { seen: seenOf(B), last: lastOf(B) });
  const meSwitch = okSwitch(B, 'me', myAct), sw = { me: meSwitch ? myAct.to : null, foe: foeSw };
  const doSwap = side => { swapIn(B, side, sw[side], ev); if (B.cdLen) B.swapCd[side] = B.cdLen + 1; };   // +1 = 이번 턴 끝에 하나 줄어 다음 두 턴이 막힘
  // 교체 순서: swOrder 판은 지금 앞에 선 두 식물로 선공을 굴려(기술 턴과 같은 규칙 · 불운 보정) 먼저인 쪽부터 — 교체한 쪽이 늦으면 late(맞은 뒤 바꿈)
  let order = null, late = null;
  if (B.swOrder && (sw.me != null || sw.foe != null)) {
    const r = rollFirst(B.me, B.foe, B.rng);
    order = r.first === B.me ? 'me' : 'foe';
    ev.push({ t: 'first', who: order, chance: r.chance, swap: true });
    const other = order === 'me' ? 'foe' : 'me';
    if (sw[order] != null) doSwap(order);
    if (sw[other] != null) { if (sw[order] != null) doSwap(other); else late = other; }   // 둘 다 바꾸면 순서대로 바로, 한쪽만이면 늦은 쪽은 맞은 뒤
  } else { if (sw.me != null) doSwap('me'); if (sw.foe != null) doSwap('foe'); }
  const mySkill = meSwitch ? null : skillOf(B.me, myAct);
  const before = { me: B.me.hp, foe: B.foe.hp };
  if (mySkill) { B.me.energy -= mySkill.cost || 0; useCount(B.me, mySkill); }
  if (foeSkill) { B.foe.energy -= foeSkill.cost || 0; useCount(B.foe, foeSkill); }
  let res = null;
  if (mySkill || foeSkill) {
    const idle = { id: 'switch', act: 'other', idle: true };   // 바꾼 쪽(이번 턴 행동 = 교체) — 들어온 식물의 면역은 끝내지 않음
    B.me.curEl = mySkill ? mySkill.el : null; B.foe.curEl = foeSkill ? foeSkill.el : null;
    res = resolveTurn(B.me, B.foe, mySkill || idle, foeSkill || idle, B.rng, { elemMult: (u, d, a) => elemMult(u.curEl, d.el) * formMult(u, d, a), turn: T, field: B.field || (B.field = {}), first: order ? B[order] : null });
    for (const e of res.events) {
      if (e.t === 'act' && e.id === 'switch') continue;
      if (e.t === 'first' && (!mySkill || !foeSkill || mySkill.act === 'skip' || foeSkill.act === 'skip')) continue;   // 한쪽이 바꾸거나 쉬면 선공 판정은 보여 주지 않음
      if (e.t === 'hit' || e.t === 'counter') { e.atkKey = B[e.who].key; e.tgtKey = B[e.to].key; e.tgtEl = B[e.to].el; }   // 같은 턴에 쓰러져 바뀌어도 맞은 식물을 알게
      if (e.t === 'skip' && e.refund) B[e.who].energy += e.refund;   // 취소된 행동의 에너지 돌려줌(팀 에너지)
      ev.push(e);
    }
  }
  // 늦은 교체: 맞고도 서 있으면 바꿈 — 그 사이 쓰러졌으면 그대로(쓰러진 자리 채우기로), 쉬는 차례 · 뿌리 묶기가 걸렸으면 못 바꿈(교체 제한도 안 걸림)
  if (late && aliveOf(B, 'me').length && aliveOf(B, 'foe').length && B[late].hp > 0) {
    const skipped = res && res.events.some(e => e.t === 'skip' && e.who === late);
    if (!skipped && canSwitch(B[late], B.turn)) doSwap(late);   // 이번 턴에 걸린 속박 · 도발은 다음 턴부터라 이미 고른 교체는 됨
    else ev.push({ t: 'swapFail', who: late, name: B[late].name, why: skipped ? 'skip' : 'root' });
  }
  // 쓰러짐 사건은 쓰러진 그 자리에서(rules · 턴 끝) — 한쪽 식물이 다 쓰러지면 그 자리에서 판이 끝나 같이 끝나는 일이 없음(먼저 다 쓰러진 쪽이 짐)
  //  앞 식물 하나만 쓰러졌으면 턴 끝 효과는 남은 식물에 그대로(포켓몬처럼), 턴 끝 피해도 선공 쪽 먼저
  const out = () => !aliveOf(B, 'me').length || !aliveOf(B, 'foe').length;
  //  햇빛은 나와 있는 식물만 참: 식물마다 따로(ownSun)면 그 식물의 햇빛 · 옛 판은 팀 햇빛
  const firstSide = (res ? res.first === B.foe.id : order === 'foe') ? 'foe' : 'me', bench = [firstSide, firstSide === 'me' ? 'foe' : 'me'].flatMap(side => B.team[side].map((u, idx) => ({ u, idx })).filter(x => x.idx !== B.act[side] && x.u.hp > 0));
  if (!out()) closeTurn(firstSide === 'foe' ? [B.foe, B.me] : [B.me, B.foe], T, ev, u => { if (B.ownSun) { u.energy = Math.min(u.energyMax || 8, u.energy + (u.sunPer || 1)); return; } const side = u === B.me ? 'me' : 'foe'; B.pool[side] = Math.min(u.energyMax || 8, B.pool[side] + (u.sunPer || 1)); }, out, bench, [...B.team.me, ...B.team.foe]);   // 나와 있는 식물의 햇빛 그릇 · 회복(반칸씩) · 대기석도 턴 끝 진행
  for (const e of ev) if (e.t === 'faint' && e.idx == null) e.idx = B.act[e.who];
  for (const e of ev) if (e.t === 'drain' && e.toSlot && B[e.to] && B[e.to].slot !== e.toSlot) e.toBench = true;   // 기생 회복이 대기석의 건 식물에게(화면은 앞 식물 체력을 건드리지 않음)
  if (!aliveOf(B, 'foe').length) B.over = 'win';
  else if (!aliveOf(B, 'me').length) B.over = 'lose';
  else if (human) { const m = B.me.hp <= 0, f = B.foe.hp <= 0; B.need = m && f ? 'both' : m ? 'me' : f ? 'foe' : null; }
  else {
    if (B.foe.hp <= 0) swapIn(B, 'foe', aiNext(B), ev, true);
    if (B.me.hp <= 0) B.need = 'me';
  }
  if (B.swapCd) for (const k of ['me', 'foe']) if (B.swapCd[k] > 0) B.swapCd[k]--;
  const turn = { n: B.turn, mySkill, foeSkill, mySwitch: sw.me, foeSwitch: foeSw, before, events: ev };
  B.log.push(turn); B.turn++;
  return turn;
}
// 쓰러진 자리에 다음 식물(공짜 — 턴을 쓰지 않음). 친구 대결은 side = 'foe'도 — 둘 다 비었으면(both) 남은 쪽이 need로 남음
export function sendIn(B, to, side = 'me') { const ev = []; swapIn(B, side, to, ev, true); B.need = B.need === 'both' ? (side === 'me' ? 'foe' : 'me') : null; return ev[0]; }

// 시제품 능력치(타입·속성으로 — 게임 규칙 상태로 옮길 때 실제 값으로 바꿈)
const TYPE_BASE = { flower: [210, 34, 22, 30], vine: [232, 32, 24, 26], cactus: [252, 31, 28, 22], mushroom: [224, 30, 26, 24] };
const EL_ADD = { fire: [0, 3, 0, 1], water: [12, 0, 1, 0], wind: [0, 1, 0, 4], bolt: [0, 2, 0, 4], earth: [8, 0, 4, -2], grass: [6, 1, 1, 0], ice: [4, 1, 2, 0] };
export function protoStats(sp) {
  const b = TYPE_BASE[sp.type] || TYPE_BASE.flower, e = EL_ADD[sp.el] || [0, 0, 0, 0];
  return { hp: b[0] + e[0], atk: b[1] + e[1], def: b[2] + e[2], spd: b[3] + e[3], crit: 5 };
}
