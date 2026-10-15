// v2 전투 판 만들기 — 식물(종·스탯) → 전투 유닛, 기술 목록(기본기 셋 + 종 기술), 속성 상성, 상대 고르기.
// 계산은 rules.js(순수 함수·씨앗 난수 하나)에 맡기고 여기선 판을 차리고 한 턴을 돌린다. 화면 무관(헤드리스 시험 가능).
import { makeRng, resolveTurn } from './rules.js';
import { canUse, mustSkip, noEnergy, endTurn, expire, has, FX } from './status.js';

// 상성: WEAK[맞는 쪽 속성] = 그 속성이 약한 공격 속성(기획서 약점표 — 불←물·대지 / 물←풀·빙결·번개 / 풀←불·바람·번개 / 번개←대지·빙결 / 대지←풀·물 / 빙결←불·대지 / 바람←대지·불)
const WEAK = { fire: ['water', 'earth'], water: ['grass', 'ice', 'bolt'], grass: ['fire', 'wind', 'bolt'], bolt: ['earth', 'ice'], earth: ['grass', 'water'], ice: ['fire', 'earth'], wind: ['earth', 'fire'] };
export const elemMult = (atkEl, defEl) => (atkEl && (WEAK[defEl] || []).includes(atkEl) ? 1.5 : 1);

// 기본기(누구나·무료): 평타 · 방어 자세(후공일 때만 성립 — 받는 피해 40%) · 회피 자세(선공·후공 모두 — 빗나감 +22·스침 +14칸)
export const BASICS = [
  { id: 'basic', name: '평타', act: 'attack', power: 40, cost: 0, cats: ['attack'], el: null },
  { id: 'guard', name: '방어 자세', act: 'guard', cost: 0, cats: ['guard'], guardMult: 0.4 },
  { id: 'evade', name: '회피 자세', act: 'evade', cost: 0, cats: ['evade'], shift: { miss: 22, graze: 14 } },
];
// 쉬는 차례(얼음·마비·기절)에 고르는 대신 넘기는 행동
export const REST = { id: 'rest', name: '쉬기', act: 'skip', cost: 0, cats: ['other'] };
// 종 기술(시제품 값): 1 = 가벼운 속성기(1 에너지), 2 = 대표 기술(3 에너지·영상 굽기의 종별 공격 연출)
// 상태 효과(inflict, 2026-10-15 사용자 "효과 있는 건 위력 감소 — 다만 센 컨셉이면 비용을 올리자"):
//  위력을 깎는 폭 = 효과 값만큼: 지속 피해·쌓여서 쉬게 하는 것 −10~15, 젖음·덩굴·부식·도발처럼 약한 것 −5~10. 센 컨셉(낙뢰·불덩이·대지 내려치기)은 위력 그대로 비용 3 → 4.
//  (12종 1:1 봇 대결 tools/test/status.mjs 로 효과 있음/없음 승률 차이를 보며 맞춤 — 젖음은 혼자선 득실이 거의 없어(느려진 쪽이 후공 방어가 더 잘 통함) −5, 연계용)
//  쌓는 수: 가벼운 기술 1 · 대표 기술 2(독·빙결·감전·포자). 어느 식물에 무엇을 붙일지는 시제품 — 기술 체계(공통·가지·개성)로 다시 짤 때 갈아엎음.
//  도발은 봇을 상대로는 거의 쓸모가 없어(봇이 자세를 드물게 씀) 위력을 깎지 않음 — 사람끼리 심리전용.
//  효과 짝(2026-10-15 사용자 "효과 짝표 좋아"): 디버프는 그 식물의 속성(불 화상 · 물 젖음 · 풀 독 · 대지 기절 · 바람 꽃가루 · 번개 감전 · 빙결 빙결)
//  또는 종(꽃 약화 · 덩굴 덩굴 · 선인장 도발 · 버섯 포자)에서만. 기생 씨앗 · 뿌리 묶기 · 그늘 · 부식은 변이·특수 기술용이라 여기엔 없음.
const SKILLS = {
  flower_grass: [{ id: 's1', name: '꽃잎 향기', power: 65, cost: 1, el: 'grass', ranged: true, inflict: { id: 'weak' } }, { id: 's2', name: '꽃잎 칼날', power: 115, cost: 3, el: 'grass' }],
  thorn: [{ id: 's1', name: '가시 채찍', power: 60, cost: 1, el: 'grass', inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '가시 덤불', power: 110, cost: 3, el: 'grass', inflict: { id: 'bind' } }],
  aqua: [{ id: 's1', name: '물방울', power: 60, cost: 1, el: 'water', ranged: true, inflict: { id: 'wet' } }, { id: 's2', name: '물방울 세례', power: 100, cost: 3, el: 'water', ranged: true, inflict: { id: 'wet' } }],
  flower_wind: [{ id: 's1', name: '꽃잎 바람', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'pollen' } }, { id: 's2', name: '꽃잎 돌풍', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'weak' } }],
  spark: [{ id: 's1', name: '전기 불꽃', power: 60, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '낙뢰', power: 120, cost: 4, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 2 } }],
  vine_water: [{ id: 's1', name: '물살 새순', power: 65, cost: 1, el: 'water', inflict: { id: 'bind' } }, { id: 's2', name: '파도 덮치기', power: 105, cost: 3, el: 'water', area: true, inflict: { id: 'wet' } }],
  cactus_fire: [{ id: 's1', name: '불씨', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불덩이', power: 120, cost: 4, el: 'fire', ranged: true, inflict: { id: 'burn' } }],
  gaia: [{ id: 's1', name: '돌 주먹', power: 75, cost: 1, el: 'earth', inflict: { id: 'taunt' } }, { id: 's2', name: '대지 내려치기', power: 120, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  flower_fire: [{ id: 's1', name: '불꽃 꽃잎', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불꽃 만개', power: 105, cost: 3, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  cactus_wind: [{ id: 's1', name: '바람 고리', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'pollen' } }, { id: 's2', name: '돌개바람', power: 110, cost: 3, el: 'wind', ranged: true, inflict: { id: 'taunt' } }],
  vine_wind: [{ id: 's1', name: '휘감는 바람', power: 65, cost: 1, el: 'wind', ranged: true, inflict: { id: 'bind' } }, { id: 's2', name: '칼바람', power: 105, cost: 3, el: 'wind', ranged: true, inflict: { id: 'pollen' } }],
  spore_cap: [{ id: 's1', name: '포자', power: 50, cost: 1, el: 'grass', ranged: true, inflict: { id: 'spore', n: 1 } }, { id: 's2', name: '포자 구름', power: 90, cost: 3, el: 'grass', ranged: true, area: true, inflict: { id: 'spore', n: 2 } }],
};
export function kitOf(key) {
  const own = (SKILLS[key] || SKILLS.flower_grass).map(s => ({ act: 'attack', cats: ['attack'], ...s, fx: key }));
  return [...BASICS.map(b => ({ ...b, fx: b.act === 'attack' ? key : null })), ...own];
}

// 유닛: id·이름·속성·스탯(rules.js 가 읽는 hp·atk·def·spd·acc·eva·crit) + 에너지·기술 + 상태 효과(eff)
export function makeUnit(id, sp, o) {
  return {
    id, key: o.key, name: o.name || sp.name, el: sp.el, jong: sp.type, pot: o.pot || 'pot_terra', trainer: o.trainer, rank: o.rank,
    hp: o.hp, max: o.hp, atk: o.atk, def: o.def, spd: o.spd, acc: 0, eva: 0, crit: o.crit ?? 5,
    energy: 2, energyMax: 8, kit: kitOf(o.key), eff: {},
  };
}

// 상대 고르기(봇 — 사람과 같은 정보만 씀): 쓸 수 있는 기술 중 가중 추첨. 위력·상성이 좋으면 자주, 체력이 낮으면 방어·회피를 조금 더,
//  상대에게 아직 없는 효과(같은 속성 면역이 아니면)를 거는 기술은 조금 더.
const newFx = (s, foe) => { const f = s.inflict; if (!f) return false; const D = FX[f.id]; return !(D.el && D.el === foe.el) && !(D.jong && D.jong === foe.jong) && (D.stack ? true : !has(foe, f.id)); };
export function aiPick(u, foe, rng) {
  const ok = u.kit.filter(s => canUse(u, s));
  const low = u.hp < u.max * 0.4;
  const w = ok.map(s => (s.act === 'attack' ? 1 + (s.power || 0) / 45 + (elemMult(s.el, foe.el) > 1 ? 1.2 : 0) + (newFx(s, foe) ? 0.6 : 0) : s.act === 'guard' ? (low ? 1.3 : 0.45) : (low ? 1.1 : 0.55)));
  let r = rng() * w.reduce((a, b) => a + b, 0), i = 0;
  for (; i < w.length - 1; i++) { r -= w[i]; if (r <= 0) break; }
  return ok[i];
}

// 판 차리기: 씨앗 하나로 난수 고정(결정론 — 같은 씨앗·같은 선택이면 같은 결과)
export function makeBattle({ me, foe, seed = 20261015 }) {
  return { me, foe, rng: makeRng(seed), turn: 1, over: null, log: [] };
}
// 턴 끝 공통(1:1·3:3): 화상·독·기생 씨앗 → 에너지 +1(그늘이면 안 참, gain 으로 넘김) → 정한 턴이 지난 효과 사라짐
export function closeTurn(pair, turn, ev, gain) {
  const [a, b] = pair;
  endTurn([[a, b], [b, a]], turn, ev);
  for (const u of pair) { if (noEnergy(u)) ev.push({ t: 'noEnergy', who: u.id, name: u.name, why: has(u, 'choke') ? 'spore' : 'shade' }); else gain(u); }
  for (const u of pair) expire(u, turn, ev);
}
// 한 턴: 내 기술 → 상대 고르기 → 에너지 쓰기 → rules.resolveTurn → 턴 끝 효과 → 사건 목록. 쉬는 차례면 고른 기술 대신 '쉬기'.
export function playTurn(B, mySkill) {
  const T = B.turn;
  const me = mustSkip(B.me) ? REST : canUse(B.me, mySkill) ? mySkill : B.me.kit[0];
  const foeSkill = mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, B.rng);
  const before = { me: B.me.hp, foe: B.foe.hp };
  B.me.energy -= me.cost || 0; B.foe.energy -= foeSkill.cost || 0;
  B.me.curEl = me.el; B.foe.curEl = foeSkill.el;
  const res = resolveTurn(B.me, B.foe, me, foeSkill, B.rng, { elemMult: (u, d) => elemMult(u.curEl, d.el), turn: T });
  const events = res.events.filter(e => !(e.t === 'first' && (me === REST || foeSkill === REST)));   // 한쪽이 쉬면 선공 판정은 보여 주지 않음
  for (const e of events) if (e.t === 'skip' && e.refund) B[e.who].energy += e.refund;   // 취소된 행동의 에너지 돌려줌
  closeTurn([B.me, B.foe], T, events, u => { u.energy = Math.min(u.energyMax, u.energy + 1); });
  if (B.me.hp <= 0 || B.foe.hp <= 0) B.over = B.foe.hp <= 0 ? 'win' : 'lose';
  const turn = { n: B.turn, mySkill: me, foeSkill, before, events, first: res.first };
  B.log.push(turn); B.turn++;
  return turn;
}
