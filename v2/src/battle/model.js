// v2 전투 판 만들기 — 식물(종·스탯) → 전투 유닛, 기술 목록(기본기 셋 + 종 기술), 속성 상성, 상대 고르기.
// 계산은 rules.js(순수 함수·씨앗 난수 하나)에 맡기고 여기선 판을 차리고 한 턴을 돌린다. 화면 무관(헤드리스 시험 가능).
import { makeRng, resolveTurn } from './rules.js';

// 상성: WEAK[맞는 쪽 속성] = 그 속성이 약한 공격 속성(기획서 약점표 — 불←물·대지 / 물←풀·빙결·번개 / 풀←불·바람·번개 / 번개←대지·빙결 / 대지←풀·물 / 빙결←불·대지 / 바람←대지·불)
const WEAK = { fire: ['water', 'earth'], water: ['grass', 'ice', 'bolt'], grass: ['fire', 'wind', 'bolt'], bolt: ['earth', 'ice'], earth: ['grass', 'water'], ice: ['fire', 'earth'], wind: ['earth', 'fire'] };
export const elemMult = (atkEl, defEl) => (atkEl && (WEAK[defEl] || []).includes(atkEl) ? 1.5 : 1);

// 기본기(누구나·무료): 평타 · 방어 자세(후공일 때만 성립 — 받는 피해 40%) · 회피 자세(선공·후공 모두 — 빗나감 +22·스침 +14칸)
export const BASICS = [
  { id: 'basic', name: '평타', act: 'attack', power: 40, cost: 0, cats: ['attack'], el: null },
  { id: 'guard', name: '방어 자세', act: 'guard', cost: 0, cats: ['guard'], guardMult: 0.4 },
  { id: 'evade', name: '회피 자세', act: 'evade', cost: 0, cats: ['evade'], shift: { miss: 22, graze: 14 } },
];
// 종 기술(시제품 값): 1 = 가벼운 속성기(1 기력), 2 = 대표 기술(3 기력·영상 굽기의 종별 공격 연출)
const SKILLS = {
  flower_grass: [{ id: 's1', name: '덩굴 새순', power: 70, cost: 1, el: 'grass' }, { id: 's2', name: '꽃잎 칼날', power: 115, cost: 3, el: 'grass' }],
  thorn: [{ id: 's1', name: '가시 채찍', power: 70, cost: 1, el: 'grass' }, { id: 's2', name: '가시 덤불', power: 115, cost: 3, el: 'grass' }],
  aqua: [{ id: 's1', name: '물방울', power: 65, cost: 1, el: 'water', ranged: true }, { id: 's2', name: '물방울 세례', power: 110, cost: 3, el: 'water', ranged: true }],
  flower_wind: [{ id: 's1', name: '꽃잎 바람', power: 65, cost: 1, el: 'wind', ranged: true }, { id: 's2', name: '꽃잎 돌풍', power: 110, cost: 3, el: 'wind', ranged: true, area: true }],
  spark: [{ id: 's1', name: '전기 불꽃', power: 70, cost: 1, el: 'bolt', ranged: true }, { id: 's2', name: '낙뢰', power: 120, cost: 3, el: 'bolt', ranged: true }],
  vine_water: [{ id: 's1', name: '물살 새순', power: 70, cost: 1, el: 'water' }, { id: 's2', name: '파도 덮치기', power: 115, cost: 3, el: 'water', area: true }],
  cactus_fire: [{ id: 's1', name: '불씨', power: 65, cost: 1, el: 'fire', ranged: true }, { id: 's2', name: '불덩이', power: 120, cost: 3, el: 'fire', ranged: true }],
  gaia: [{ id: 's1', name: '돌 주먹', power: 75, cost: 1, el: 'earth' }, { id: 's2', name: '대지 내려치기', power: 120, cost: 3, el: 'earth', area: true }],
  flower_fire: [{ id: 's1', name: '불꽃 꽃잎', power: 65, cost: 1, el: 'fire', ranged: true }, { id: 's2', name: '불꽃 만개', power: 120, cost: 3, el: 'fire', ranged: true, area: true }],
  cactus_wind: [{ id: 's1', name: '바람 고리', power: 65, cost: 1, el: 'wind', ranged: true }, { id: 's2', name: '돌개바람', power: 110, cost: 3, el: 'wind', ranged: true }],
  vine_wind: [{ id: 's1', name: '바람 칼날', power: 70, cost: 1, el: 'wind', ranged: true }, { id: 's2', name: '칼바람', power: 115, cost: 3, el: 'wind', ranged: true }],
  spore_cap: [{ id: 's1', name: '포자', power: 60, cost: 1, el: 'grass', ranged: true }, { id: 's2', name: '포자 구름', power: 105, cost: 3, el: 'grass', ranged: true, area: true }],
};
export function kitOf(key) {
  const own = (SKILLS[key] || SKILLS.flower_grass).map(s => ({ act: 'attack', cats: ['attack'], ...s, fx: key }));
  return [...BASICS.map(b => ({ ...b, fx: b.act === 'attack' ? key : null })), ...own];
}

// 유닛: id·이름·속성·스탯(rules.js 가 읽는 hp·atk·def·spd·acc·eva·crit) + 기력·기술
export function makeUnit(id, sp, o) {
  return {
    id, key: o.key, name: o.name || sp.name, el: sp.el, pot: o.pot || 'pot_terra', trainer: o.trainer, rank: o.rank,
    hp: o.hp, max: o.hp, atk: o.atk, def: o.def, spd: o.spd, acc: 0, eva: 0, crit: o.crit ?? 5,
    energy: 2, energyMax: 8, kit: kitOf(o.key),
  };
}

// 상대 고르기(봇 — 사람과 같은 정보만 씀): 쓸 수 있는 기술 중 가중 추첨. 위력·상성이 좋으면 자주, 체력이 낮으면 방어·회피를 조금 더.
export function aiPick(u, foe, rng) {
  const ok = u.kit.filter(s => (s.cost || 0) <= u.energy);
  const low = u.hp < u.max * 0.4;
  const w = ok.map(s => (s.act === 'attack' ? 1 + (s.power || 0) / 45 + (elemMult(s.el, foe.el) > 1 ? 1.2 : 0) : s.act === 'guard' ? (low ? 1.3 : 0.45) : (low ? 1.1 : 0.55)));
  let r = rng() * w.reduce((a, b) => a + b, 0), i = 0;
  for (; i < w.length - 1; i++) { r -= w[i]; if (r <= 0) break; }
  return ok[i];
}

// 판 차리기: 씨앗 하나로 난수 고정(결정론 — 같은 씨앗·같은 선택이면 같은 결과)
export function makeBattle({ me, foe, seed = 20261015 }) {
  return { me, foe, rng: makeRng(seed), turn: 1, over: null, log: [] };
}
// 한 턴: 내 기술 → 상대 고르기 → 기력 쓰기 → rules.resolveTurn → 사건 목록. 턴 끝에 둘 다 기력 +1(최대 8).
export function playTurn(B, mySkill) {
  const foeSkill = aiPick(B.foe, B.me, B.rng);
  const before = { me: B.me.hp, foe: B.foe.hp };
  B.me.energy -= mySkill.cost || 0; B.foe.energy -= foeSkill.cost || 0;
  B.me.curEl = mySkill.el; B.foe.curEl = foeSkill.el;
  const res = resolveTurn(B.me, B.foe, mySkill, foeSkill, B.rng, { elemMult: (u, d) => elemMult(u.curEl, d.el) });
  for (const u of [B.me, B.foe]) u.energy = Math.min(u.energyMax, u.energy + 1);
  if (B.me.hp <= 0 || B.foe.hp <= 0) B.over = B.foe.hp <= 0 ? 'win' : 'lose';
  const turn = { n: B.turn, mySkill, foeSkill, before, events: res.events, first: res.first };
  B.log.push(turn); B.turn++;
  return turn;
}
