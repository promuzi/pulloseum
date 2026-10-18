// v2 상태 효과(버프·디버프) — 순수 계산(화면·시각과 무관, 씨앗 난수만). 설계·결정 = docs/superpowers/specs/2026-10-15-v2-status-effects-design.md
// 사용자 결정(2026-10-15):
//  · 디버프 = 화상 · 독 · 젖음 · 빙결 · 감전 · 기절 · 덩굴 + 기생 씨앗 · 그늘 · 강풍(처음 이름 꽃가루) · 도발 · 뿌리 묶기 · 약화 · 부식
//  · 겹침은 독만(5겹까지). 독은 2턴 넘게 새로 안 걸리면 턴마다 1겹씩 줄어듦. 빙결·감전은 3이 되면 한 턴 쉬고 0으로
//    (빙결·감전 쌓인 수가 자연히 줄어드는 것도 독과 같은 규칙 — 내 추천).
//  · 턴 수는 효과마다 같음(기술마다 다르지 않음) · 빗나가면 안 걸림, 방어 자세여도 걸림, 치명이라고 더 걸리지 않음 · 같은 속성은 안 걸림
//  · 3:3 교체하면 독·화상만 따라감 · 연계 = 젖은 상대는 감전·빙결이 하나 더 쌓임, 물에 맞으면 화상이 꺼짐, 불에 맞으면 젖음·빙결·얼음이 녹음
//  · 쉬는 시점 = 다음 행동 한 번 취소(아직 안 움직였으면 이번 행동, 이미 움직였으면 다음 턴 — 쓴 에너지는 돌려줌)
//  · 쉬고 난 다음 턴은 '버팀'(기절·빙결·감전이 안 걸림) — 연속으로 쉬기 막기(다른 게임 조사 뒤 추천 → 사용자 "쉬는 거 다음 턴 방어 좋다").
//  · 같은 날 사용자 "기동성 떨어지면 회피도 당연히 어려워져야 함" → 기동성 하나가 선공 확률과 회피 자세 효과에 같이 들어감(mobK).
//    "젖음을 연계용으로만 너무 강하게 하지 말자 — 기동성 ↓ · 적중 ↓ · 방어 조금 ↓, 종합 디버프 느낌" → 젖음 = 셋 다, 연계는 두 배 → 하나 더.
//  · 같은 날 사용자: 쉬는 차례는 문구만 띄우고 자동으로 넘김(화면) · 3:3에서 쉬는 중엔 교체도 안 됨 · 버섯 디버프는 '포자'로 ·
//    기생 씨앗 · 뿌리 묶기(+ 그늘 · 부식)는 속성·종·생장에 묶이지 않는 변이·특수 기술용(식물 기술표에서 뺌, 규칙은 남겨 둠).
// 턴 세는 법: exp = 마지막으로 영향을 주는 턴 번호(턴 끝에 exp ≤ 지금 턴이면 사라짐) · left = 남은 턴 끝 횟수(지속 피해·빨아들이기).

export const FX = {
  burn:    { el: 'fire', left: 3, dot: 0.04, keep: true },   // 턴 끝 3번 최대 체력 4% · 그동안 받는 회복 절반
  poison:  { stack: 5, dot: 0.02, keep: true },              // 겹마다 턴 끝 최대 체력 2%
  wet:     { el: 'water', turns: 2, mob: 0.8, missAdd: 8, defK: 0.85 },   // 종합: 기동성 −20% · 적중 ↓(빗나감 칸 +8) · 방어 −15%
  chill:   { el: 'ice', stack: 3, skip: 'frozen', mob: 0.8 }, // 쌓여 있는 동안 기동성 −20% · 3 = 얼음(한 번 쉼, 그동안 받는 피해 −25%)
  shock:   { el: 'bolt', turns: 2, p: 0.25, wetP: 0.5 },     // 2026-10-18 확률형(사용자 "3겹 없애고 화상처럼"): 걸린 턴 + 2턴 · 자기 차례마다 25%(젖으면 50%) 마비 → 풀림 · 다시 걸면 새로
  stun:    { skip: 'stun' },                                  // 바로 한 번 쉼
  bind:    { turns: 1 },                                      // 다음 턴 기술 하나가 묶임
  leech:   { left: 3, drain: 0.025 },                         // 턴 끝 3번 최대 체력 2.5%를 빨아 건너편 앞 식물이 회복
  shade:   { turns: 0 },                                      // 이번 턴 끝 에너지 +1이 안 들어옴
  gale:    { turns: 2, missAdd: 12 },                         // 강풍(바람 속성): 적중 ↓(내 공격 빗나감 칸 +12) — 사용자 "강풍이라고 바꾸자"
  taunt:   { turns: 1 },                                      // 다음 턴 방어·회피 자세 못 씀
  root:    { turns: 2 },                                      // 교체 못 함(3:3)
  weak:    { turns: 2, atkK: 0.8 },                           // 공격 −20%
  corrode: { turns: 2, defK: 0.6 },                           // 방어 −40%
  spore:   { jong: 'mushroom', stack: 3, bloom: 0.08 },      // 버섯 종 전용: 붙은 다음 턴부터 턴 끝마다 1씩 자라 3이면 피어남(최대 체력 8% 피해 + 그 턴 에너지 안 참) → 0 · 불에 맞으면 탐
  choke:   { turns: 0 },
  // 버프(2026-10-16 — 기술 체계 문서 §3 짝: 불 분노 · 물 정화 · 풀 재생 · 대지 철벽 · 바람 가속 · 번개 집중 · 빙결 보호막 · 선인장 반사). 겹치지 않고 다시 걸면 새로
  rage:    { buff: true, turns: 3, atkK: 1.25 },             // 분노: 공격 +25%
  wall:    { buff: true, turns: 2, dmgK: 0.8 },              // 철벽: 받는 피해 −20%
  haste:   { buff: true, turns: 2, mob: 1.3 },               // 가속: 기동성 +30%(선공 · 회피)
  regen:   { buff: true, left: 3, heal: 0.05 },              // 재생: 턴 끝 3번 최대 체력 5% 회복(화상이면 절반, 그늘이면 멈춤)
  thorns:  { buff: true, turns: 2, reflect: 0.3 },           // 반사: 붙어서 때린 상대에게 받은 피해 30%(멀리서 · 범위는 안 됨)
  shield:  { buff: true, turns: 3, hp: 0.15 },               // 보호막: 최대 체력 15%만큼 먼저 막음
  purified:{ buff: true, turns: 1 },                         // 정화: 나쁜 효과를 다 지우고 다음 턴까지 안 걸림
  focus:   { buff: true },                                   // 집중: 다음 공격 치명 +25(u.st.nextCrit — 회피 성공 보상 '치명 준비'와 같은 칸)                                      // (포자가 피어 숨이 막힘 — 그 턴 끝 에너지 +1 없음, 창에는 안 보임)
};
// evadeLo/Hi·evadePow = 회피 자세 효과 = (내 기동 ÷ 상대 기동)^0.5, 0.7~1.3배(상대보다 빠르면 잘 피하고 느리면 덜 피함)
export const RULES_FX = { frozenDmgK: 0.75, burnHealK: 0.5, decayAfter: 2, wetStackAdd: 1, brace: true, evadePow: 0.5, evadeLo: 0.7, evadeHi: 1.3 };
const SKIP_IDS = ['stun', 'chill'];
const TIMED = ['shock', 'wet', 'bind', 'shade', 'gale', 'taunt', 'root', 'weak', 'corrode', 'brace', 'choke', 'rage', 'wall', 'haste', 'thorns', 'shield', 'purified'];
const BUFFS = ['rage', 'wall', 'haste', 'regen', 'thorns', 'shield', 'purified'];
const DEBUFFS = ['burn', 'poison', 'wet', 'chill', 'shock', 'spore', 'bind', 'leech', 'shade', 'gale', 'taunt', 'root', 'weak', 'corrode', 'choke'];
const ORDER = ['burn', 'poison', 'wet', 'chill', 'shock', 'spore', 'bind', 'leech', 'shade', 'gale', 'taunt', 'root', 'weak', 'corrode'];

const E = u => (u.eff ||= {});
export const has = (u, id) => !!(u && u.eff && u.eff[id]);

// ── 다른 계산이 읽는 값 ──
// 기동성 배율: 기동을 바꾸는 효과는 모두 여기로(젖음 · 빙결 · 얼음, 나중에 가속 버프) → 선공 확률과 회피 자세에 같이 들어감
export function mobK(u) {
  let k = 1;
  if (has(u, 'wet')) k *= FX.wet.mob;
  if (has(u, 'chill') || has(u, 'frozen')) k *= FX.chill.mob;
  if (has(u, 'haste')) k *= FX.haste.mob;
  return k;
}
export const effSpd = u => (u.spd || 1) * mobK(u);
// 회피 자세 효과: 상대보다 빠르면 잘 피하고, 느리면(원래 느린 식물이든 젖음·빙결로 느려졌든) 덜 피함
export function evadeK(def, att) {
  const r = effSpd(def) / Math.max(1, att ? effSpd(att) : effSpd(def));
  return Math.max(RULES_FX.evadeLo, Math.min(RULES_FX.evadeHi, r ** RULES_FX.evadePow));
}
export const atkK = u => (has(u, 'weak') ? FX.weak.atkK : 1) * (has(u, 'rage') ? FX.rage.atkK : 1);
export const defK = u => (has(u, 'corrode') ? FX.corrode.defK : 1) * (has(u, 'wet') ? FX.wet.defK : 1);
export const dmgTakenK = u => (has(u, 'frozen') ? RULES_FX.frozenDmgK : 1) * (has(u, 'wall') ? FX.wall.dmgK : 1);
export const missAddOf = u => (has(u, 'gale') ? FX.gale.missAdd : 0) + (has(u, 'wet') ? FX.wet.missAdd : 0);
export const healK = u => (has(u, 'burn') ? RULES_FX.burnHealK : 1);
// 카드 패시브(2026-10-17 — game/cards.js, 전투 유닛 u.pas): 공격 배율(용의 분노 = 내 체력 절반 아래 · 공생 균사 = 상대 나쁜 효과 수) · 피해 배율(소화액 = 상대 체력 30% 아래 · 강산 = 독 걸린 상대 · 강철 비늘 = 받는 피해 ↓)
export const debuffCount = u => { const e = (u && u.eff) || {}; return DEBUFFS.filter(k => e[k]).length + (e.skip || e.frozen ? 1 : 0); };
export function pasAtkK(u, foe) {
  const p = u && u.pas; if (!p) return 1;
  let k = 1;
  if (p.wrath && u.hp < u.max * 0.5) k *= 1 + p.wrath;
  if (p.mycel && foe) k *= 1 + p.mycel * Math.min(4, debuffCount(foe));
  return k;
}
export function pasDmgK(att, def) {
  let k = 1;
  const a = att && att.pas, d = def && def.pas;
  if (a && a.exec && def.hp < def.max * 0.3) k *= 1 + a.exec;
  if (a && a.acid && has(def, 'poison')) k *= 1 + a.acid;
  if (d && d.guard) k *= 1 - d.guard;
  return k;
}
export const mustSkip = u => has(u, 'skip');
export const noEnergy = u => has(u, 'shade') || has(u, 'choke');
export const canSwitch = u => !has(u, 'root') && !has(u, 'skip');   // 뿌리 묶기 · 쉬는 차례(얼음·마비·기절)면 교체 못 함
// 고를 수 있는 기술: 에너지 · 덩굴로 묶인 칸 · 도발(자세 금지)
// 변이 기술 = 판마다 정해진 횟수(2026-10-17 사용자 "변이는 충전이 아닌 고정된 횟수를 갖고 있어. 다 쓰면 못씀 그 판은"): u.used[기술 id] = 이번 판에 쓴 횟수
//  (3:3도 그 식물의 판 — 교체해 들어갔다 나와도 그대로) · 횟수 없는 기술 = 끝없음
export const usesLeft = (u, s) => (s && s.uses ? Math.max(0, s.uses - ((u && u.used && u.used[s.id]) || 0)) : Infinity);
export function useCount(u, s) { if (u && s && s.uses) { u.used = u.used || {}; u.used[s.id] = (u.used[s.id] || 0) + 1; } }
export function canUse(u, s, energy = u.energy) {
  if (!s || (s.cost || 0) > energy) return false;
  if (usesLeft(u, s) <= 0) return false;
  const e = u.eff || {};
  if (e.bind && e.bind.skill === s.id) return false;
  if (e.taunt && (s.act === 'guard' || s.act === 'evade')) return false;
  return true;
}
export const lockOf = (u, s) => { const e = (u && u.eff) || {}; return e.bind && e.bind.skill === s.id ? 'bind' : e.taunt && (s.act === 'guard' || s.act === 'evade') ? 'taunt' : null; };

// 창에 보일 목록(이로운 것 먼저 · 숫자 = 쌓인 수만)
export function listOf(u) {
  const e = (u && u.eff) || {}, out = [];
  if (e.brace) out.push({ id: 'brace' });
  for (const k of BUFFS) if (e[k]) out.push({ id: k });
  if (u && u.st && u.st.nextCrit) out.push({ id: 'focus' });
  if (e.skip) out.push({ id: e.skip.src });
  else if (e.frozen) out.push({ id: 'frozen' });
  for (const k of ORDER) if (e[k]) out.push(e[k].n ? { id: k, n: e[k].n } : { id: k });
  return out;
}

// ── 쉬기 ──
function setSkip(tgt, src, ctx) {
  const e = E(tgt);
  e.skip = { src };
  if (src === 'frozen') e.frozen = {};
  ctx.ev.push({ t: 'fx', who: ctx.by.id, to: tgt.id, name: tgt.name, id: src, list: listOf(tgt) });
}
// 쉬는 차례가 오면: 고른 행동 취소(쓴 에너지는 부르는 쪽이 refund 만큼 돌려줌) → 다음 턴까지 버팀
export function consumeSkip(u, turn, ev, refund = 0) {
  const e = E(u), src = e.skip.src;
  delete e.skip; e.skipDone = turn;
  if (RULES_FX.brace) e.brace = { exp: turn + 1 };
  ev.push({ t: 'skip', who: u.id, name: u.name, src, refund, list: listOf(u) });
}

// ── 걸기 ──
// ctx = { turn, rng, ev, by(건 쪽 유닛) }
export function apply(tgt, id, n, ctx) {
  const D = FX[id], e = E(tgt), T = ctx.turn, ev = ctx.ev, base = { who: ctx.by.id, to: tgt.id, name: tgt.name, id };
  if (!D || tgt.hp <= 0) return;
  if ((D.el && tgt.el === D.el) || (D.jong && tgt.jong === D.jong)) { ev.push({ t: 'immune', ...base }); return; }   // 같은 속성(포자는 같은 종)은 안 걸림
  if (!D.buff && e.purified) { ev.push({ t: 'resist', ...base, why: 'purify' }); return; }   // 정화 중엔 나쁜 효과가 안 걸림
  if (tgt.pas && tgt.pas.immune && tgt.pas.immune.includes(id)) { ev.push({ t: 'immune', ...base, card: true }); return; }   // 카드(해독 체질)
  const by = ctx.by && ctx.by.pas;
  if (by && id === 'poison' && by.poisonAdd) n += by.poisonAdd;   // 카드(맹독 농축)
  if (by && id === 'spore' && by.sporeAdd) n += by.sporeAdd;      // 카드(포자 번식)
  if (SKIP_IDS.includes(id) && (e.brace || e.skip)) { ev.push({ t: 'resist', ...base, why: e.brace ? 'brace' : 'skip' }); return; }
  if (id === 'poison') {
    const p = e.poison ||= { n: 0, last: T };
    p.n = Math.min(D.stack, p.n + n); p.last = T;
    ev.push({ t: 'fx', ...base, n: p.n, list: listOf(tgt) });
  } else if (id === 'chill') {
    const wet = !!e.wet, add = n + (wet ? RULES_FX.wetStackAdd : 0), s = e[id] ||= { n: 0, last: T };
    s.n = Math.min(D.stack, s.n + add); s.last = T;
    ev.push({ t: 'fx', ...base, n: s.n, wet, list: listOf(tgt) });
    if (s.n >= D.stack) { delete e[id]; setSkip(tgt, D.skip, ctx); }   // 3이 되면 한 번 쉬고 0으로
  } else if (id === 'spore') {
    const sp = e.spore ||= { n: 0, last: T };
    sp.n = Math.min(D.stack, sp.n + n); sp.last = T;
    ev.push({ t: 'fx', ...base, n: sp.n, list: listOf(tgt) });
    if (sp.n >= D.stack) bloom(tgt, T, ev);
  } else if (id === 'stun') {
    setSkip(tgt, 'stun', ctx);
  } else if (id === 'burn' || id === 'leech') {
    e[id] = { left: D.left };
    ev.push({ t: 'fx', ...base, list: listOf(tgt) });
  } else if (id === 'bind') {   // 다음 턴에 쓸 수 있을 종 기술 중 하나(못 쓰는 칸·기본기가 묶이면 효과가 거의 없으니까 — 없으면 쓸 수 있는 아무 기술)
    const en = Math.min(tgt.energyMax || 8, (tgt.energy || 0) + 1), ok = tgt.kit.filter(s => (s.cost || 0) <= en), own = ok.filter(s => s.id[0] === 's'), cands = own.length ? own : ok;
    const pick = cands[Math.floor(ctx.rng() * cands.length)] || tgt.kit[0];
    e.bind = { exp: T + D.turns, skill: pick.id, skillName: pick.name };
    ev.push({ t: 'fx', ...base, skill: pick.name, list: listOf(tgt) });
  } else {
    e[id] = { exp: T + D.turns };
    ev.push({ t: 'fx', ...base, list: listOf(tgt) });
  }
}
// 감전 굴림(자기 행동 차례 — rules.resolveTurn): 마비면 감전이 풀리고 이번 행동 취소(쉬기 · 햇빛 돌려줌) · 쉰 다음 턴(버팀)엔 안 굴림
export function shockRoll(u, ctx) {
  const e = u.eff;
  if (!e || !e.shock || e.skip || e.brace || u.hp <= 0) return false;
  if (ctx.rng() >= (e.wet ? FX.shock.wetP : FX.shock.p)) return false;
  delete e.shock;
  setSkip(u, 'paral', { ...ctx, by: u });
  return true;
}
// 포자가 피어남: 최대 체력 10% 피해 + 그 턴 끝 에너지 +1 없음(숨 막힘) → 0으로
function bloom(u, turn, ev) {
  const e = E(u), d = Math.max(1, Math.round(u.max * FX.spore.bloom));
  u.hp = Math.max(0, u.hp - d);
  delete e.spore; e.choke = { exp: turn };
  ev.push({ t: 'bloom', who: u.id, name: u.name, dmg: d, list: listOf(u) });
}
// 나에게 버프 걸기(버프 기술 또는 공격 기술의 덤)
export function selfBuff(u, id, ctx) {
  const e = E(u), T = ctx.turn, base = { who: u.id, to: u.id, name: u.name, id };
  if (id === 'focus') { u.st = u.st || { miss: {}, init: 0, critTaken: false, nextInit: 0, nextCrit: 0, lastStance: null }; u.st.nextCrit = Math.max(u.st.nextCrit || 0, 25); ctx.ev.push({ t: 'fx', ...base, list: listOf(u) }); return; }
  if (id === 'purify') {
    const gone = DEBUFFS.filter(k => e[k]);
    for (const k of gone) delete e[k];
    e.purified = { exp: T + FX.purified.turns };
    ctx.ev.push({ t: 'fx', ...base, id: 'purified', ids: gone, list: listOf(u) }); return;
  }
  const D = FX[id]; if (!D) return;
  if (id === 'regen') e.regen = { left: D.left };
  else if (id === 'shield') e.shield = { exp: T + D.turns, hp: Math.max(1, Math.round(u.max * D.hp)) };
  else e[id] = { exp: T + D.turns };
  ctx.ev.push({ t: 'fx', ...base, list: listOf(u) });
}
// 맞았을 때(빗나감이 아니면): ① 공격 속성 연계 ② 기술 효과
export function onHit(att, tgt, skill, ctx) {
  if (tgt.hp <= 0) return;
  const e = E(tgt), ev = ctx.ev;
  if (skill.el === 'water' && e.burn) { delete e.burn; ev.push({ t: 'cure', to: tgt.id, name: tgt.name, id: 'burn', why: 'water', list: listOf(tgt) }); }
  if (skill.el === 'fire') {
    const own = skill.inflict && skill.inflict.id;   // 그 기술이 거는 효과는 태우지 않음(불씨 포자 = 불 속성인데 포자를 거는 기술 — 2026-10-17 카드 밸런스 시험에서 발견: 제 포자를 태워 1겹을 못 넘었음)
    const gone = ['frozen', 'chill', 'wet', 'spore', 'bind', 'leech', 'root'].filter(k => e[k] && k !== own);   // 불이 얼음·냉기·물기·포자 + 덩굴·기생 씨앗·뿌리(식물로 묶은 것)를 태움
    if (e.skip && e.skip.src === 'frozen') { delete e.skip; if (!gone.includes('frozen')) gone.unshift('frozen'); }   // 얼음이 녹으면 쉬기도 풀림
    for (const k of gone) delete e[k];
    if (gone.length) ev.push({ t: 'cure', to: tgt.id, name: tgt.name, id: gone[0], ids: gone, why: 'fire', list: listOf(tgt) });
  }
  if (skill.inflict) apply(tgt, skill.inflict.id, skill.inflict.n || 1, { ...ctx, by: att });
}

// 쓰러짐 사건(2026-10-16 — 판정 순서 점검 tools/test/edgecases.mjs): 체력이 0이 된 그 자리에서 한 번만. 먼저 쓰러진 쪽이 진다(model·team이 첫 쓰러짐으로 승패)
export function noteFall(u, ev) { if (u && u.hp <= 0 && !ev.some(e => e.t === 'faint' && e.who === u.id)) ev.push({ t: 'faint', who: u.id, name: u.name, key: u.key }); }

// ── 턴 끝 ──
// pairs = [[유닛, 건너편 앞 식물], …]: 화상·독 피해, 기생 씨앗(빨아서 건너편 회복), 빙결·감전·독 줄어듦
//  순서 = 이번 턴 선공 쪽 먼저(누가 늘 먼저가 아니게) · stop() 이 참이 되면 거기서 멈춤(1:1 = 누가 쓰러지면, 3:3 = 한쪽 식물이 다 쓰러지면 판이 끝나서)
export function endTurn(pairs, turn, ev, stop = null) {
  for (const [u, opp] of pairs) {
    if (stop && stop()) break;
    const e = u.eff;
    if (!e || u.hp <= 0) continue;
    if (e.burn) {
      const d = Math.max(1, Math.round(u.max * FX.burn.dot));
      u.hp = Math.max(0, u.hp - d);
      if (--e.burn.left <= 0) delete e.burn;
      ev.push({ t: 'tick', who: u.id, name: u.name, id: 'burn', dmg: d, list: listOf(u) });
    }
    if (e.poison && u.hp > 0) {
      const d = Math.max(1, Math.round(u.max * FX.poison.dot * e.poison.n));
      u.hp = Math.max(0, u.hp - d);
      const n = e.poison.n;
      if (turn - e.poison.last >= RULES_FX.decayAfter && --e.poison.n <= 0) delete e.poison;   // 2턴 넘게 안 걸리면 1겹씩
      ev.push({ t: 'tick', who: u.id, name: u.name, id: 'poison', n, dmg: d, list: listOf(u) });
    }
    if (e.leech && u.hp > 0) {
      const take = Math.min(u.hp, Math.max(1, Math.round(u.max * FX.leech.drain)));
      u.hp -= take;
      let heal = 0;
      if (opp && opp.hp > 0) { const before = opp.hp; opp.hp = Math.min(opp.max, opp.hp + Math.round(take * healK(opp))); heal = opp.hp - before; }
      if (--e.leech.left <= 0) delete e.leech;
      ev.push({ t: 'drain', who: u.id, name: u.name, to: opp ? opp.id : null, toName: opp ? opp.name : '', dmg: take, heal, list: listOf(u), list2: opp ? listOf(opp) : null });
    }
    if (e.regen && u.hp > 0) {   // 재생: 그늘이면 멈춤(햇빛이 없음), 화상이면 절반
      if (!e.shade) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * FX.regen.heal * healK(u))); ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }
      if (--e.regen.left <= 0) { delete e.regen; ev.push({ t: 'expire', who: u.id, ids: ['regen'], list: listOf(u) }); }
    }
    if (u.pas && u.hp > 0 && u.hp < u.max && (u.pas.regen || (u.pas.rot && opp))) {   // 카드: 재생 비늘(최대 체력 %) · 부생 회복(상대 나쁜 효과 하나당 %) — 화상이면 절반
      const r = (u.pas.regen || 0) + (u.pas.rot && opp ? u.pas.rot * debuffCount(opp) : 0);
      if (r > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.max(1, Math.round(u.max * r * healK(u)))); if (u.hp > before) ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, card: true, list: listOf(u) }); }
    }
    if (e.spore && u.hp > 0 && e.spore.last < turn) {   // 포자는 붙은 다음 턴부터 턴 끝마다 스스로 자람(자리 잡는 데 한 턴)
      e.spore.n += 1;
      if (e.spore.n >= FX.spore.stack) bloom(u, turn, ev);
      else ev.push({ t: 'grow', who: u.id, name: u.name, n: e.spore.n, list: listOf(u) });
    }
    let dec = false;
    for (const k of ['chill']) if (e[k] && turn - e[k].last >= RULES_FX.decayAfter) { dec = true; if (--e[k].n <= 0) delete e[k]; }
    if (dec && u.hp > 0) ev.push({ t: 'expire', who: u.id, ids: [], list: listOf(u) });
    noteFall(u, ev);
  }
}
// 턴 끝 마지막(에너지 회복 뒤): 정한 턴이 지난 효과 · 쉰 턴이 끝난 얼음 · 버팀
export function expire(u, turn, ev) {
  const e = u.eff;
  if (!e) return;
  const gone = [];
  for (const k of TIMED) if (e[k] && e[k].exp <= turn) { delete e[k]; gone.push(k); }
  if (e.frozen && !e.skip && e.skipDone === turn) { delete e.frozen; gone.push('frozen'); }
  if (gone.length) ev.push({ t: 'expire', who: u.id, ids: gone, list: listOf(u) });
}
// 3:3 교체로 나갈 때: 독·화상만 남음
export function clearOnSwitch(u) {
  const e = u.eff;
  if (!e) return;
  for (const k of Object.keys(e)) if (!(FX[k] && FX[k].keep)) delete e[k];
}
