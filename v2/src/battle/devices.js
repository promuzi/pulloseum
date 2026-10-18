// 공통 장치(2026-10-18 — docs/superpowers/specs/2026-10-18-v2-species-identity-design.md §2 · 사용자 "다음 로드맵도 1번까지만"):
//  종 개성 기술이 쓰는 칸들. 기술 · 종 표에 칸이 없으면 아무 일도 하지 않음(지금 기술은 그대로 — 46종 기술은 사용자 검토 뒤에 연결).
//  D2 개수 칸 u.res — 종 SPECIES[키].res = { 이름: [처음, 최대 | [어린, 자라는, 다 자란]] } · resTurn = { 이름: 턴 끝마다 + }
//     기술 gain{k, n | 'spent', set} · spend{k, n | all} · need{k, n} · hitsBy(타 수 = 그 개수) · powBy{k, per}(개수 하나당 위력 +)
//  D5 표식 배율 scale{k, dmg[], drain[]} · D7 버티기 SPECIES.endure = 개수 칸 이름(맞은 피해만 — 지속 피해로는 못 버팀)
//  D12 상태 소비 consume{id, per, cap}(겹 × 최대 체력 몫 즉시 피해 · 지움) · bonusIf{id, k, clear}(그 상태면 위력 ×k)
//  D14 상대 조작 steal('sun' | 'buff') · dispel(n | 'all') · seal(상대가 지난번 쓴 기술 2턴 묶음) · reveal(은신 · 분신 걷기 — rules.js)
//  D15 운 luck = [[확률, 배율] …](0배가 나오면 다음은 가장 큰 배율 확정) · D16 비용 hpCost(최대 체력 몫) · allSun(남은 햇빛 하나당 위력 +)
//  D6 시한 delay{turns, power, area}(상대에게 심음 — n턴 뒤 턴 끝 확정 피해) · echo(맞히면 다음 턴 끝 한 번 더, 위력 몫 · 효과 포함) — 교체하면 사라짐
//  D9 모드 setMode · needMode · lockMode(SPECIES.modes[이름] = { atk, def, spd } 배율)
//  2묶음(아래): D13 반응 · 받는 피해 배율 · 개수만큼 반사 / D10 경기장 효과 / D11 2턴 기술 / 개수 칸 화면 글
import { SPECIES } from '../game/catalog.js';
import { has, listOf, apply, defK, selfBuff } from './status.js';

const SP = u => (u && SPECIES[u.key]) || {};
const BUFF_IDS = ['stealth', 'clone', 'armor', 'rage', 'wall', 'haste', 'regen', 'thorns', 'shield', 'purified'];
export function resOf(u) {
  if (!u.res) {
    u.res = {}; u.resMax = {};
    for (const [k, [s, m]] of Object.entries(SP(u).res || {})) { u.res[k] = s; u.resMax[k] = Array.isArray(m) ? m[Math.min(m.length - 1, u.stage || 0)] : m; }
  }
  return u.res;
}
const capOf = (u, k) => (u.resMax && u.resMax[k] != null ? u.resMax[k] : 99);
function addRes(u, k, n) { const r = resOf(u); r[k] = Math.max(0, Math.min(capOf(u, k), (r[k] || 0) + n)); return r[k]; }
// 쓸 수 있나(개수 · 모드 · 체력 비용) — status.js canUse 가 부름
export function canUseRes(u, s) {
  if (!s) return true;
  const r = s.spend || s.need ? resOf(u) : null;
  if (s.spend && (r[s.spend.k] || 0) < (s.spend.all ? 1 : s.spend.n || 1)) return false;
  if (s.need && (r[s.need.k] || 0) < (s.need.n || 1)) return false;
  if (s.needMode && u.mode !== s.needMode) return false;
  if (s.lockMode && u.mode === s.lockMode) return false;
  if (s.hpCost && u.hp <= Math.round(u.max * s.hpCost)) return false;
  return true;
}
const foeHas = (f, id) => has(f, id) || !!(f.eff && f.eff.skip && f.eff.skip.src === id);   // 쉬는 차례(얼음 · 마비 · 기절)도 그 이름으로
const DYN = ['hitsBy', 'powBy', 'scale', 'allSun', 'luck', 'bonusIf', 'ifFoe', 'tag'];
// 자기 차례에 기술 값을 정함(개수 · 운 · 상대 상태) — 바뀌는 칸이 없으면 그 기술 그대로(복사도 안 함)
export function dynAct(u, a0, foe, rng) {
  if (!a0 || !DYN.some(k => a0[k])) return a0;
  const a = a0.ifFoe && foe && foeHas(foe, a0.ifFoe.has) ? { ...a0, ...a0.ifFoe.then, ifFoeHit: true } : a0;   // 상대 상태에 따라 공격 바꾸기(기절이면 찌르기 한 방)
  const r = resOf(u), o = { ...a };
  const inf = u.st && u.st.infuse;
  if (a.tag && inf && inf.tag === a.tag && inf.n > 0) { o.el = inf.el; o.infused = true; }   // 속성 바꾸기(다음 n번)
  let pw = a.power || 0;
  if (a.hitsBy) o.hits = Math.max(1, r[a.hitsBy] || 0);
  if (a.powBy) pw += (r[a.powBy.k] || 0) * a.powBy.per;
  if (a.allSun) pw += (u.energy || 0) * a.allSun;
  if (a.scale) { const c = Math.min(a.scale.dmg.length - 1, r[a.scale.k] || 0); pw *= 1 + a.scale.dmg[c]; if (a.scale.drain) o.drain = (a.drain || 0) + a.scale.drain[c]; o.scaleN = c; }
  if (a.bonusIf && foe && foeHas(foe, a.bonusIf.id)) { pw *= a.bonusIf.k; o.bonusHit = true; }
  if (a.luck) {
    const st = u.st || (u.st = {}), top = Math.max(...a.luck.map(x => x[1]));
    let k;
    if (st.luckZero) { k = top; st.luckZero = false; }
    else { let x = rng(); k = a.luck[a.luck.length - 1][1]; for (const [p, m] of a.luck) { if (x < p) { k = m; break; } x -= p; } st.luckZero = k === 0; }
    pw *= k; o.luckK = k;
  }
  o.power = Math.round(pw);
  return o;
}
// 행동이 실제로 나갈 때(쉬기에 걸리지 않음): 개수 · 체력 · 햇빛 내기 · 지난 기술 기록 → 낸 개수
export function payAct(u, a, T, ev) {
  if (!a) return 0;
  u.st = u.st || {}; u.st.lastAct = a.id; u.st.lastName = a.name;
  let spent = 0;
  if (a.spend) { const r = resOf(u); spent = a.spend.all ? r[a.spend.k] || 0 : a.spend.n || 1; r[a.spend.k] = Math.max(0, (r[a.spend.k] || 0) - spent); ev.push({ t: 'res', who: u.id, k: a.spend.k, n: r[a.spend.k] }); }
  if (a.allSun) u.energy = 0;
  if (a.infused && u.st.infuse && --u.st.infuse.n <= 0) delete u.st.infuse;
  if (a.hpCost) { const c = Math.round(u.max * a.hpCost); u.hp = Math.max(1, u.hp - c); ev.push({ t: 'selfCost', who: u.id, name: u.name, dmg: c }); }
  return spent;
}
// 행동이 끝난 뒤: 얻기 · 모드 · 시한(맞히든 아니든) / 메아리 · 소비 · 조작(맞혔을 때만 — x.landed)
export function afterAct(u, a, foe, T, ev, x = {}) {
  if (!a) return;
  if (a.gain) {
    const n = a.gain.n === 'spent' ? x.spent || 0 : a.gain.n || 1;
    if (a.gain.set) resOf(u)[a.gain.k] = Math.min(capOf(u, a.gain.k), n); else addRes(u, a.gain.k, n);
    ev.push({ t: 'res', who: u.id, k: a.gain.k, n: resOf(u)[a.gain.k] });
  }
  if (a.infuse) { (u.st ||= {}).infuse = { ...a.infuse }; ev.push({ t: 'infuse', who: u.id, name: u.name, el: a.infuse.el, n: a.infuse.n }); }   // 속성 바꾸기 예약
  if (a.setMode) { u.mode = a.setMode; u.modeK = (SP(u).modes || {})[a.setMode] || null; ev.push({ t: 'mode', who: u.id, mode: a.setMode }); }
  if (!foe || foe.hp <= 0) return;
  const fe = (foe.eff ||= {});
  if (a.delay) (fe.timers ||= []).push({ at: T + a.delay.turns, raw: a.delay.power * (u.atk || 10) / 50, area: !!a.delay.area, by: u.id, name: a.name });
  if (!x.landed) return;
  if (a.echo) (fe.timers ||= []).push({ at: T + 1, raw: (a.power || 0) * (u.atk || 10) / 50 * a.echo, area: !!a.area, by: u.id, name: a.name, inflict: a.inflict || null });
  if (a.consume && fe[a.consume.id]) {
    const n = fe[a.consume.id].n || 1, d = Math.max(1, Math.round(foe.max * Math.min(a.consume.cap || 1, a.consume.per * n)));
    foe.hp = Math.max(0, foe.hp - d); delete fe[a.consume.id];
    ev.push({ t: 'tick', who: foe.id, name: foe.name, id: a.consume.id, n, dmg: d, burst: true, list: listOf(foe) });
  }
  if (a.bonusIf && a.bonusIf.clear && x.bonusHit && foe.hp > 0) {
    if (a.bonusIf.id === 'frozen') { delete fe.frozen; if (fe.skip && fe.skip.src === 'frozen') delete fe.skip; } else delete fe[a.bonusIf.id];
    ev.push({ t: 'expire', who: foe.id, ids: [a.bonusIf.id], list: listOf(foe) });
  }
  if (a.steal === 'sun' && (foe.energy || 0) > 0) { foe.energy -= 1; u.energy = Math.min(u.energyMax || 8, (u.energy || 0) + 1); ev.push({ t: 'steal', who: u.id, to: foe.id, what: 'sun' }); }
  if (a.steal === 'buff' || a.dispel) {
    const have = BUFF_IDS.filter(k => fe[k]), take = a.steal === 'buff' ? have.slice(0, 1) : a.dispel === 'all' ? have : have.slice(0, a.dispel);
    for (const k of take) { if (a.steal === 'buff') (u.eff ||= {})[k] = { ...fe[k], ...(fe[k].exp != null ? { exp: Math.max(T + 1, fe[k].exp) } : {}) }; delete fe[k]; }
    if (take.length) { ev.push({ t: 'expire', who: foe.id, ids: take, list: listOf(foe) }); if (a.steal === 'buff') ev.push({ t: 'fx', who: u.id, to: u.id, id: take[0], name: u.name, list: listOf(u) }); }
  }
  if (a.seal && foe.hp > 0 && foe.st && foe.st.lastAct && (foe.kit || []).some(s => s.id === foe.st.lastAct)) {
    fe.bind = { exp: T + 2, skill: foe.st.lastAct, skillName: foe.st.lastName || '' };
    ev.push({ t: 'fx', who: u.id, to: foe.id, id: 'bind', name: foe.name, skill: foe.st.lastName || '', list: listOf(foe) });
  }
}
// 버티기(D7): 맞은 피해로 쓰러질 때 그 개수가 남아 있으면 체력 1 · 하나 잃음
export function endureHp(u, hp, ev) {
  if (hp > 0) return hp;
  const k = SP(u).endure, r = k ? resOf(u) : null;
  if (!k || !(r[k] > 0)) return 0;
  r[k] -= 1;
  ev.push({ t: 'endure', who: u.id, name: u.name, k, n: r[k] });
  return 1;
}
// 턴 끝(status.js endTurn): 시한 · 메아리 터짐 → 개수 칸 턴마다 +
export function turnDevices(u, turn, ev) {
  const e = u.eff;
  if (e && e.timers && u.hp > 0) {
    const now = e.timers.filter(t => t.at <= turn);
    e.timers = e.timers.filter(t => t.at > turn);
    if (!e.timers.length) delete e.timers;
    for (const t of now) {
      if (u.hp <= 0) break;
      const take = Math.max(0.25, 100 / (100 + Math.max(0, (u.def || 0) * defK(u)))), d = Math.max(1, Math.round(t.raw * take * (t.area ? 0.85 : 1)));
      u.hp = Math.max(0, u.hp - d);
      ev.push({ t: 'boom', who: u.id, name: u.name, dmg: d, from: t.name, list: listOf(u) });
      if (t.inflict && u.hp > 0) apply(u, t.inflict.id, t.inflict.n || 1, { turn, rng: () => 0.5, ev, by: { id: t.by } });
    }
  }
  if (u.hp > 0) for (const [k, n] of Object.entries(SP(u).resTurn || {})) { const before = resOf(u)[k] || 0; if (addRes(u, k, n) !== before) ev.push({ t: 'res', who: u.id, k, n: u.res[k] }); }
}

// ── 공통 장치 2묶음(2026-10-18 같은 날) ──
// D13 반응 SPECIES.react = [{ on, … }] — on: 'hit' 맞음 · 'contact' 붙어서 맞음 · 'crit' 치명 맞음 · 'half' 처음 절반 아래 · 'avoid' 내가 피함 · 'dealCrit' 내가 치명
//  할 일: gain{k, n} · store{k, pct}(받은 피해 몫을 개수로) · inflict(때린 쪽에 효과 id) · self(나에게 버프 id) · nextCrit(다음 공격 치명 +)
export function react(u, on, ctx) {
  const list = SP(u).react;
  if (!list || u.hp <= 0) return;
  for (const r of list) {
    if (r.on !== on) continue;
    if (on === 'half') { u.st = u.st || {}; if (u.st.halfDone) continue; u.st.halfDone = true; }
    if (r.gain) addRes(u, r.gain.k, r.gain.n || 1);
    if (r.store && ctx.dmg > 0) addRes(u, r.store.k, Math.round(ctx.dmg * r.store.pct));
    if (r.inflict && ctx.foe && ctx.foe.hp > 0) apply(ctx.foe, r.inflict, 1, { turn: ctx.T, rng: () => 0.5, ev: ctx.ev, by: u });
    if (r.self) selfBuff(u, r.self, { turn: ctx.T, ev: ctx.ev });
    if (r.nextCrit) { u.st = u.st || {}; u.st.nextCrit = Math.max(u.st.nextCrit || 0, r.nextCrit); }
    ctx.ev.push({ t: 'react', who: u.id, name: u.name, on, res: u.res ? { ...u.res } : undefined, list: listOf(u) });
  }
}
// 받는 피해 배율 SPECIES.takenK = [{ when: 'full', k }](체력이 가득이면 — 위엄) · 개수만큼 반사 SPECIES.thornRes = { k, per }(가시 쌓기)
export function takenK(u) { let k = 1; for (const x of SP(u).takenK || []) if (x.when === 'full' && u.hp >= u.max) k *= x.k; return k; }
export function reflectAdd(u) { const t = SP(u).thornRes; return t ? (resOf(u)[t.k] || 0) * t.per : 0; }
// D10 경기장 효과(양쪽 모두) — 기술 field{id, turns} · 판 B.field = { id, exp } 를 resolveTurn o.field 로 받음(model · team · rooms 가 넘기고 저장)
export const FIELD = {
  rain: { name: '비', el: { water: 1.25, fire: 0.75 }, cure: 'burn' },   // 젤리캡
  wind: { name: '바람길', el: { wind: 1.2 }, hits: 'wind' },           // 단델에어로 — 바람 연타 +1타
  snow: { name: '눈보라', el: { ice: 1.25, fire: 0.75 } },              // 프로스트드레이크
};
export const fieldEl = (F, el) => (F && F.id && FIELD[F.id] && FIELD[F.id].el[el]) || 1;
export const fieldHits = (F, a) => (F && F.id && FIELD[F.id] && FIELD[F.id].hits === a.el && (a.hits || 1) > 1 ? 1 : 0);
export function fieldStart(F, T, units, ev) {   // 턴 처음: 끝난 효과 걷기 · 비 = 화상 꺼짐
  if (!F || !F.id) return;
  if (F.exp < T) { ev.push({ t: 'field', id: null, was: F.id }); F.id = null; return; }
  const D = FIELD[F.id];
  if (D && D.cure) for (const u of units) if (u.hp > 0 && u.eff && u.eff[D.cure]) { delete u.eff[D.cure]; ev.push({ t: 'cure', to: u.id, name: u.name, id: D.cure, why: 'water', list: listOf(u) }); }
}
export function setField(F, a, T, ev) { if (!a || !a.field || !F) return; const n = a.field.turns || 3; F.id = a.field.id; F.exp = T + n - 1; ev.push({ t: 'field', id: F.id, turns: n }); }
// D11 2턴 기술 charge{veil, release{…}}: 이번 턴 모으고(veil이면 은신처럼 거의 안 맞음 — 잠수 · 영창) 다음 차례에 고른 기술 대신 release 가 나감(고른 기술 햇빛은 돌려받음)
export function setCharge(u, a, T, ev) {
  if (!a || !a.charge) return;
  (u.st ||= {}).charge = { act: 'attack', cats: ['attack'], el: a.el, ...(a.charge.release || {}), id: a.id, name: (a.charge.release && a.charge.release.name) || a.name, cost: 0, charged: true };
  if (a.charge.veil) selfBuff(u, 'stealth', { turn: T, ev });
  ev.push({ t: 'charge', who: u.id, name: u.name });
}
export function takeCharge(u) { const c = u.st && u.st.charge; if (c) delete u.st.charge; return c || null; }
// 개수 칸 화면 글(체력판 이름 줄 오른쪽) — 이름은 SPECIES.res[k][2]
export function resLine(u) {
  const D = SP(u).res, r = u && u.res;
  if (!D || !r) return '';
  return Object.keys(D).filter(k => D[k][2]).map(k => `${D[k][2]} ${r[k] || 0}`).join(' · ');
}
