// v2 전투 판 만들기 — 식물(종·스탯) → 전투 유닛, 기술 목록(기본기 셋 + 종 기술), 속성 상성, 상대 고르기.
// 계산은 rules.js(순수 함수·씨앗 난수 하나)에 맡기고 여기선 판을 차리고 한 턴을 돌린다. 화면 무관(헤드리스 시험 가능).
import { makeRng, resolveTurn } from './rules.js';
import { canUse, mustSkip, noEnergy, endTurn, expire, has, FX, useCount } from './status.js';

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
//  효과 짝(2026-10-15 사용자 "효과 짝표 좋아"): 디버프는 그 식물의 속성(불 화상 · 물 젖음 · 풀 독 · 대지 기절 · 바람 강풍 · 번개 감전 · 빙결 빙결)
//  또는 종(꽃 약화 · 덩굴 덩굴 · 선인장 도발 · 버섯 포자)에서만. 기생 씨앗 · 뿌리 묶기 · 그늘 · 부식은 변이·특수 기술용이라 여기엔 없음.
const SKILLS = {
  flower_grass: [{ id: 's1', name: '꽃잎 향기', power: 65, cost: 1, el: 'grass', ranged: true, inflict: { id: 'weak' } }, { id: 's2', name: '꽃잎 칼날', power: 115, cost: 3, el: 'grass' }],
  thorn: [{ id: 's1', name: '가시 채찍', power: 60, cost: 1, el: 'grass', inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '가시 덤불', power: 110, cost: 3, el: 'grass', inflict: { id: 'bind' } }],
  aqua: [{ id: 's1', name: '물방울', power: 60, cost: 1, el: 'water', ranged: true, inflict: { id: 'wet' } }, { id: 's2', name: '물방울 세례', power: 100, cost: 3, el: 'water', ranged: true, inflict: { id: 'wet' } }],
  flower_wind: [{ id: 's1', name: '꽃잎 바람', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '꽃잎 돌풍', power: 100, cost: 3, el: 'wind', ranged: true, area: true, inflict: { id: 'weak' } }],
  spark: [{ id: 's1', name: '전기 불꽃', power: 60, cost: 1, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 1 } }, { id: 's2', name: '낙뢰', power: 120, cost: 4, el: 'bolt', ranged: true, inflict: { id: 'shock', n: 2 } }],
  vine_water: [{ id: 's1', name: '물살 새순', power: 65, cost: 1, el: 'water', inflict: { id: 'bind' } }, { id: 's2', name: '파도 덮치기', power: 105, cost: 3, el: 'water', area: true, inflict: { id: 'wet' } }],
  cactus_fire: [{ id: 's1', name: '불씨', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불덩이', power: 120, cost: 4, el: 'fire', ranged: true, inflict: { id: 'burn' } }],
  gaia: [{ id: 's1', name: '돌 주먹', power: 75, cost: 1, el: 'earth', inflict: { id: 'taunt' } }, { id: 's2', name: '대지 내려치기', power: 120, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  flower_fire: [{ id: 's1', name: '불꽃 꽃잎', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '불꽃 만개', power: 105, cost: 3, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
  cactus_wind: [{ id: 's1', name: '바람 고리', power: 55, cost: 1, el: 'wind', ranged: true, inflict: { id: 'gale' } }, { id: 's2', name: '돌개바람', power: 110, cost: 3, el: 'wind', ranged: true, inflict: { id: 'taunt' } }],
  vine_wind: [{ id: 's1', name: '휘감는 바람', power: 65, cost: 1, el: 'wind', ranged: true, inflict: { id: 'bind' } }, { id: 's2', name: '칼바람', power: 105, cost: 3, el: 'wind', ranged: true, inflict: { id: 'gale' } }],
  spore_cap: [{ id: 's1', name: '포자', power: 50, cost: 1, el: 'grass', ranged: true, inflict: { id: 'spore', n: 1 } }, { id: 's2', name: '포자 구름', power: 90, cost: 3, el: 'grass', ranged: true, area: true, inflict: { id: 'spore', n: 2 } }],
  frost_bell: [{ id: 's1', name: '서리 종소리', power: 60, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙결의 종', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill', n: 2 } }],
  volt_vine: [{ id: 's1', name: '전깃줄 감기', power: 60, cost: 1, el: 'bolt', inflict: { id: 'bind' } }, { id: 's2', name: '고압 채찍', power: 120, cost: 4, el: 'bolt', inflict: { id: 'shock', n: 2 } }],
  stone_cap: [{ id: 's1', name: '돌가루 포자', power: 55, cost: 1, el: 'earth', ranged: true, inflict: { id: 'spore', n: 1 } }, { id: 's2', name: '갓 내려찍기', power: 120, cost: 4, el: 'earth', area: true, inflict: { id: 'stun' } }],
  jelly_cap: [{ id: 's1', name: '젤리 방울', power: 60, cost: 1, el: 'water', ranged: true, inflict: { id: 'wet' } }, { id: 's2', name: '해파리 비', power: 105, cost: 3, el: 'water', ranged: true, area: true, inflict: { id: 'wet' } }],
  fang_trap: [{ id: 's1', name: '덫 물기', power: 65, cost: 1, el: 'earth', inflict: { id: 'weak' } }, { id: 's2', name: '대지 집어삼키기', power: 115, cost: 4, el: 'earth', inflict: { id: 'stun' } }],
  blade_vine: [{ id: 's1', name: '불꽃 베기', power: 60, cost: 1, el: 'fire', inflict: { id: 'burn' } }, { id: 's2', name: '용광로 일섬', power: 115, cost: 3, el: 'fire', inflict: { id: 'burn' } }],
  toxi_cactus: [{ id: 's1', name: '독가시 쏘기', power: 55, cost: 1, el: 'grass', ranged: true, inflict: { id: 'poison', n: 1 } }, { id: 's2', name: '맹독 터뜨리기', power: 105, cost: 3, el: 'grass', area: true, inflict: { id: 'poison', n: 2 } }],
  draco_fruit: [{ id: 's1', name: '서리 비늘', power: 60, cost: 1, el: 'ice', ranged: true, inflict: { id: 'chill', n: 1 } }, { id: 's2', name: '빙룡의 숨', power: 110, cost: 4, el: 'ice', ranged: true, area: true, inflict: { id: 'chill', n: 2 } }],
  ember_cap: [{ id: 's1', name: '불씨 포자', power: 55, cost: 1, el: 'fire', ranged: true, inflict: { id: 'spore', n: 1 } }, { id: 's2', name: '불꽃 포자 구름', power: 100, cost: 3, el: 'fire', ranged: true, area: true, inflict: { id: 'spore', n: 2 } }],
  drake_cactus: [{ id: 's1', name: '용불 가시', power: 60, cost: 1, el: 'fire', ranged: true, inflict: { id: 'burn' } }, { id: 's2', name: '화룡의 숨결', power: 115, cost: 4, el: 'fire', ranged: true, area: true, inflict: { id: 'burn' } }],
};
// 기본기 이름(2026-10-16 사용자 "평타도 내가 임의로 만든 거지 스킬 이름이 있어야 해. 스킬 같아야 하고 식물마다 다른") — 규칙(위력 40 공격 · 방어 자세 · 회피 자세)은
//  BASICS 그대로, 이름만 식물마다 [공격, 방어, 회피]. 이름은 임시(사용자가 고칠 수 있음) — 기술 id(basic · guard · evade)는 그대로라 서버·기록·친구 대결과 맞음
export const BASIC_NAMES = {
  flower_grass: ['잎사귀 치기', '꽃잎 오므리기', '꽃잎 흩날리기'],
  thorn: ['덩굴 후리기', '가시 세우기', '덩굴 숨기'],
  aqua: ['알뿌리 박치기', '물막 두르기', '물결 피하기'],
  flower_wind: ['꽃대 휘두르기', '잎 겹치기', '바람 타기'],
  spark: ['꽃머리 박치기', '전기막 치기', '번쩍 피하기'],
  vine_water: ['덩굴 낚아채기', '덩굴 똬리', '물살 타기'],
  cactus_fire: ['가시 박치기', '몸 웅크리기', '아지랑이'],
  gaia: ['바위 박치기', '바위 되기', '모래 숨기'],
  flower_fire: ['꽃잎 할퀴기', '꽃잎 방패', '불꽃 흔들기'],
  cactus_wind: ['가시팔 휘두르기', '가시 갑옷', '회오리 피하기'],
  vine_wind: ['덩굴 감아치기', '덩굴 감싸기', '덩굴 그네'],
  spore_cap: ['갓 박치기', '갓 덮기', '포자 연막'],
  frost_bell: ['종 흔들기', '서리 덮기', '눈발 숨기'],
  volt_vine: ['덩굴 후려치기', '절연 감기', '번쩍 비키기'],
  stone_cap: ['돌갓 박치기', '바위처럼 버티기', '돌가루 숨기'],
  jelly_cap: ['촉수 치기', '말랑 막기', '물살 미끄럼'],
  fang_trap: ['덫 박치기', '덫 닫기', '흙먼지 숨기'],
  blade_vine: ['칼잎 휘두르기', '칼잎 막기', '불티 비키기'],
  toxi_cactus: ['가시 박치기', '가시 웅크리기', '독안개 숨기'],
  draco_fruit: ['비늘 박치기', '비늘 웅크리기', '서리 날갯짓'],
  ember_cap: ['갓 박치기', '갓 덮기', '불티 연막'],
  drake_cactus: ['가시 박치기', '비늘 웅크리기', '날개 비키기'],
};
export const basicsOf = key => { const n = BASIC_NAMES[key]; return BASICS.map((b, i) => ({ ...b, name: (n && n[i]) || b.name, fx: b.act === 'attack' ? key : null })); };
export function kitOf(key) {
  const own = (SKILLS[key] || SKILLS.flower_grass).map(s => ({ act: 'attack', cats: ['attack'], ...s, fx: key }));
  return [...basicsOf(key), ...own];
}

// 유닛: id·이름·속성·스탯(rules.js 가 읽는 hp·atk·def·spd·acc·eva·crit) + 에너지·기술 + 상태 효과(eff)
export function makeUnit(id, sp, o) {
  return {
    id, key: o.key, name: o.name || sp.name, el: sp.el, jong: sp.type, pot: o.pot || 'pot_terra', trainer: o.trainer, rank: o.rank, tlv: o.tlv,
    hp: o.hp, max: o.hp, atk: o.atk, def: o.def, spd: o.spd, acc: 0, eva: 0, crit: o.crit ?? 5,
    energy: 2, energyMax: 8, kit: kitOf(o.key), eff: {},
  };
}

// 상대 고르기(봇 — 사람과 같은 정보만 씀): 쓸 수 있는 기술 중 가중 추첨. 위력·상성이 좋으면 자주, 체력이 낮으면 방어·회피를 조금 더,
//  상대에게 아직 없는 효과(같은 속성 면역이 아니면)를 거는 기술은 조금 더.
const newFx = (s, foe) => { const f = s.inflict; if (!f) return false; const D = FX[f.id]; return !(D.el && D.el === foe.el) && !(D.jong && D.jong === foe.jong) && (D.stack ? true : !has(foe, f.id)); };
// 못 쓰는 기술을 골랐을 때 대신 = 손패에서 쓸 수 있는 첫 기술, 없으면 넘어감(손패 넷에 기본기가 없으면 기력이 모자랄 수 있음)
export const firstOk = u => u.kit.find(s => canUse(u, s)) || REST;
export function aiPick(u, foe, rng) {
  const ok = u.kit.filter(s => canUse(u, s));
  if (!ok.length) return REST;
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
//  pair = [선공, 후공](턴 끝 피해도 선공 쪽 먼저 — 늘 'me'가 먼저면 같이 쓰러질 때 한쪽만 늘 짐) · stop() 이 참이면 거기서 끝(판이 끝남)
export function closeTurn(pair, turn, ev, gain, stop = () => false) {
  const [a, b] = pair;
  endTurn([[a, b], [b, a]], turn, ev, stop);
  if (stop()) return;
  for (const u of pair) { if (u.hp <= 0) continue; if (noEnergy(u)) ev.push({ t: 'noEnergy', who: u.id, name: u.name, why: has(u, 'choke') ? 'spore' : 'shade' }); else gain(u); }
  for (const u of pair) expire(u, turn, ev);
}
// 한 턴: 내 기술 → 상대 고르기 → 에너지 쓰기 → rules.resolveTurn → 턴 끝 효과 → 사건 목록. 쉬는 차례면 고른 기술 대신 '쉬기'.
export function playTurn(B, mySkill) {
  const me = mustSkip(B.me) ? REST : canUse(B.me, mySkill) ? mySkill : firstOk(B.me);
  const foeSkill = mustSkip(B.foe) ? REST : aiPick(B.foe, B.me, B.rng);
  return playTurnVs(B, me, foeSkill);
}
// 두 쪽이 다 고른 한 턴(PvP — 서버가 두 사람 선택으로 풂, 봇 판도 이걸 씀). 기술은 id 또는 기술 객체
export function playTurnVs(B, mySkill, foeSkill) {
  const T = B.turn, pickOf = (u, s) => { if (s === 'rest' || s === REST) return REST; const k = typeof s === 'string' ? u.kit.find(x => x.id === s) : s; return mustSkip(u) ? REST : k && canUse(u, k) ? k : firstOk(u); };   // 'rest' = 넘어감(시간 초과)
  const me = pickOf(B.me, mySkill);
  foeSkill = pickOf(B.foe, foeSkill);
  const before = { me: B.me.hp, foe: B.foe.hp };
  B.me.energy -= me.cost || 0; B.foe.energy -= foeSkill.cost || 0;
  useCount(B.me, me); useCount(B.foe, foeSkill);   // 변이 기술 횟수
  B.me.curEl = me.el; B.foe.curEl = foeSkill.el;
  const res = resolveTurn(B.me, B.foe, me, foeSkill, B.rng, { elemMult: (u, d) => elemMult(u.curEl, d.el), turn: T });
  const events = res.events.filter(e => !(e.t === 'first' && (me === REST || foeSkill === REST)));   // 한쪽이 쉬면 선공 판정은 보여 주지 않음
  for (const e of events) if (e.t === 'skip' && e.refund) B[e.who].energy += e.refund;   // 취소된 행동의 에너지 돌려줌
  // 누가 쓰러지면 그 자리에서 판이 끝남(턴 끝 피해 없음) · 같이 쓰러지는 일 없이 먼저 쓰러진 쪽이 짐(2026-10-16 — 전엔 둘 다 쓰러지면 늘 'me' 승리)
  const down = () => B.me.hp <= 0 || B.foe.hp <= 0;
  if (!down()) closeTurn(res.first === B.foe.id ? [B.foe, B.me] : [B.me, B.foe], T, events, u => { u.energy = Math.min(u.energyMax, u.energy + 1); }, down);
  const fell = events.find(e => e.t === 'faint');
  if (fell) B.over = fell.who === B.foe.id ? 'win' : 'lose';
  const turn = { n: B.turn, mySkill: me, foeSkill, before, events, first: res.first };
  B.log.push(turn); B.turn++;
  return turn;
}
