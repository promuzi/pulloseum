// 3:3 교체전(2026-10-15 사용자 "3:3은 내가 식물 3개 들고 싸우는 거임 포켓몬처럼 교체 가능하고 — 이름도 팀리그라고는 하지 말자")
//  양쪽 식물 셋, 한 번에 앞에 선 하나만 싸운다. 내 차례 = 기술 또는 교체 — 교체가 먼저 일어나고 들어온 식물이 상대 기술을 맞는다(포켓몬처럼).
//  쓰러지면 턴 끝에 다음 식물(나 = 직접 고름·턴을 안 씀, 봇 = 상성을 보고 고름) · 셋 다 쓰러지면 끝. 기력은 팀이 함께 쓴다(시작 2 · 턴마다 +1 · 최대 8).
//  계산은 1:1과 같은 rules.resolveTurn(같은 씨앗·같은 선택 → 같은 결과, 화면 무관). 화면은 B.me·B.foe(앞에 선 식물)를 읽으면 된다.
//  상태 효과(status.js): 교체로 나가면 독·화상만 따라감 · 뿌리 묶기면 교체 못 함 · 쉬는 차례에도 교체는 됨(재배사가 하는 일) · 에너지 회복은 앞 식물이 그늘이면 안 참.
import { makeRng, resolveTurn } from './rules.js';
import { elemMult, aiPick, REST, closeTurn } from './model.js';
import { canUse, canSwitch, mustSkip, clearOnSwitch, listOf } from './status.js';

export function makeTeamBattle({ me, foe, seed = 20261015 }) {
  const B = { mode: 'swap3', team: { me, foe }, act: { me: 0, foe: 0 }, pool: { me: 2, foe: 2 }, rng: makeRng(seed), turn: 1, over: null, log: [], need: null };
  for (const side of ['me', 'foe']) for (const u of B.team[side]) Object.defineProperty(u, 'energy', { get: () => B.pool[side], set: v => { B.pool[side] = v; }, configurable: true, enumerable: true });
  B.me = me[0]; B.foe = foe[0];
  return B;
}
export const aliveOf = (B, side) => B.team[side].map((u, i) => (u.hp > 0 ? i : -1)).filter(i => i >= 0);

// 봇이 앞에 둘 식물 점수(사람과 같은 정보 — 내 앞 식물의 속성·체력만): 상성이 나쁘면 −, 좋으면 +, 체력이 많을수록 +
const benchScore = (B, i) => { const u = B.team.foe[i], m = B.me; return (elemMult(m.el, u.el) > 1 ? -2 : 0) + (elemMult(u.el, m.el) > 1 ? 1.6 : 0) + u.hp / u.max; };
function aiSwitch(B, rng) {
  const bench = aliveOf(B, 'foe').filter(i => i !== B.act.foe);
  if (!bench.length || !canSwitch(B.foe)) return null;
  const f = B.foe, best = bench.reduce((a, b) => (benchScore(B, b) > benchScore(B, a) ? b : a));
  if (mustSkip(f) && benchScore(B, best) > 0.6 && rng() < 0.5) return best;                   // 쉬는 차례면 바꿔서 풀기도
  if (elemMult(B.me.el, f.el) > 1 && benchScore(B, best) > 1.1 && rng() < 0.45) return best;   // 상성이 나쁘면 가끔 바꿈
  if (f.hp < f.max * 0.25 && benchScore(B, best) > 0.9 && rng() < 0.25) return best;           // 거의 쓰러질 때도 가끔
  return null;
}
const aiNext = B => aliveOf(B, 'foe').reduce((a, b) => (benchScore(B, b) > benchScore(B, a) ? b : a));
function swapIn(B, side, to, ev, forced = false) {
  const from = B.act[side];
  clearOnSwitch(B.team[side][from]);
  B.act[side] = to; B[side] = B.team[side][to];
  const e = { t: 'switch', who: side, from, to, hp: B[side].hp, forced, list: listOf(B[side]) };
  ev.push(e);
  return e;
}

// 한 턴: myAct = { kind: 'skill', skill } | { kind: 'switch', to } | { kind: 'rest' }(쉬는 차례)
export function playTurn3(B, myAct) {
  const T = B.turn, ev = [], foeSw = aiSwitch(B, B.rng);
  const foeSkill = foeSw == null ? (mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, B.rng)) : null;
  const meSwitch = myAct.kind === 'switch' && canSwitch(B.me) && B.team.me[myAct.to] && B.team.me[myAct.to].hp > 0 && myAct.to !== B.act.me;
  if (meSwitch) swapIn(B, 'me', myAct.to, ev);
  if (foeSw != null) swapIn(B, 'foe', foeSw, ev);
  let mySkill = meSwitch ? null : mustSkip(B.me) || myAct.kind === 'rest' ? REST : myAct.kind === 'skill' && canUse(B.me, myAct.skill) ? myAct.skill : B.me.kit[0];
  if (mySkill === REST && !mustSkip(B.me)) mySkill = B.me.kit[0];   // 쉴 차례가 아니면 평타
  const before = { me: B.me.hp, foe: B.foe.hp };
  if (mySkill) B.me.energy -= mySkill.cost || 0;
  if (foeSkill) B.foe.energy -= foeSkill.cost || 0;
  if (mySkill || foeSkill) {
    const idle = { id: 'switch', act: 'other' };
    B.me.curEl = mySkill ? mySkill.el : null; B.foe.curEl = foeSkill ? foeSkill.el : null;
    const res = resolveTurn(B.me, B.foe, mySkill || idle, foeSkill || idle, B.rng, { elemMult: (u, d) => elemMult(u.curEl, d.el), turn: T });
    for (const e of res.events) {
      if (e.t === 'act' && e.id === 'switch') continue;
      if (e.t === 'first' && (!mySkill || !foeSkill || mySkill === REST || foeSkill === REST)) continue;   // 한쪽이 바꾸거나 쉬면 선공 판정은 보여 주지 않음
      if (e.t === 'hit' || e.t === 'counter') { e.atkKey = B[e.who].key; e.tgtKey = B[e.to].key; e.tgtEl = B[e.to].el; }   // 같은 턴에 쓰러져 바뀌어도 맞은 식물을 알게
      if (e.t === 'skip' && e.refund) B[e.who].energy += e.refund;   // 취소된 행동의 에너지 돌려줌(팀 에너지)
      ev.push(e);
    }
  }
  closeTurn([B.me, B.foe], T, ev, u => { const side = u === B.me ? 'me' : 'foe'; B.pool[side] = Math.min(8, B.pool[side] + 1); });
  for (const side of ['foe', 'me']) if (B[side].hp <= 0) {
    ev.push({ t: 'faint', who: side, idx: B.act[side], key: B[side].key, name: B[side].name });
    if (!aliveOf(B, side).length) { B.over = side === 'foe' ? 'win' : 'lose'; break; }
    if (side === 'foe') swapIn(B, 'foe', aiNext(B), ev, true);
    else B.need = 'me';
  }
  const turn = { n: B.turn, mySkill, foeSkill, mySwitch: myAct.kind === 'switch' ? myAct.to : null, foeSwitch: foeSw, before, events: ev };
  B.log.push(turn); B.turn++;
  return turn;
}
// 내 식물이 쓰러진 자리에 다음 식물(공짜 — 턴을 쓰지 않음)
export function sendIn(B, to) { const ev = []; swapIn(B, 'me', to, ev, true); B.need = null; return ev[0]; }

// 시제품 능력치(타입·속성으로 — 게임 규칙 상태로 옮길 때 실제 값으로 바꿈)
const TYPE_BASE = { flower: [210, 34, 22, 30], vine: [232, 32, 24, 26], cactus: [252, 31, 28, 22], mushroom: [224, 30, 26, 24] };
const EL_ADD = { fire: [0, 3, 0, 1], water: [12, 0, 1, 0], wind: [0, 1, 0, 4], bolt: [0, 2, 0, 4], earth: [8, 0, 4, -2], grass: [6, 1, 1, 0], ice: [4, 1, 2, 0] };
export function protoStats(sp) {
  const b = TYPE_BASE[sp.type] || TYPE_BASE.flower, e = EL_ADD[sp.el] || [0, 0, 0, 0];
  return { hp: b[0] + e[0], atk: b[1] + e[1], def: b[2] + e[2], spd: b[3] + e[3], crit: 5 };
}
