// 공통 장치(2026-10-18 — docs/superpowers/specs/2026-10-18-v2-species-identity-design.md §2 · 사용자 "다음 로드맵도 1번까지만"):
//  종 개성 기술이 쓰는 칸들. 기술 · 종 표에 칸이 없으면 아무 일도 하지 않음(지금 기술은 그대로 — 46종 기술은 사용자 검토 뒤에 연결).
//  D2 개수 칸 u.res — 종 SPECIES[키].res = { 이름: [처음, 최대 | [어린, 자라는, 다 자란]] } · resTurn = { 이름: 턴 끝마다 + }
//     기술 gain{k, n | 'spent', set} · spend{k, n | all} · need{k, n} · hitsBy(타 수 = 그 개수) · powBy{k, per}(개수 하나당 위력 +)
//  D5 표식 배율 scale{k, dmg[], drain[]} · D7 버티기 SPECIES.endure = 개수 칸 이름(맞은 피해만 — 지속 피해로는 못 버팀)
//  D12 상태 소비 consume{id, per, cap}(겹 × 최대 체력 몫 즉시 피해 · 지움) · bonusIf{id, k, clear}(그 상태면 위력 ×k)
//  D14 상대 조작 steal('sun' | 'buff') · dispel(n | 'all') · seal(봉인 걸기 — 무작위 기술 하나 · 다음 1턴) · reveal(은신 · 분신 걷기 — rules.js)
//  D15 운 luck = [[확률, 배율] …](0배가 나오면 다음은 가장 큰 배율 확정) · D16 비용 hpCost(최대 체력 몫) · allSun(남은 햇빛 하나당 위력 +)
//  D6 시한 delay{turns, power, area}(상대에게 심음 — n턴 뒤 턴 끝 확정 피해) · echo(맞히면 다음 턴 끝 한 번 더, 위력 몫 · 효과 포함) — 교체하면 사라짐
//  D9 모드 setMode · needMode · lockMode(SPECIES.modes[이름] = { atk, def, spd } 배율)
//  2묶음(아래): D13 반응 · 받는 피해 배율 · 개수만큼 반사 / D10 경기장 효과 / D11 2턴 기술 / 개수 칸 화면 글
import { SPECIES, STAGE_KEY } from '../game/catalog.js';
import { has, listOf, apply, defK, atkK, healK, selfBuff, noteFall, FX, CAVE, SUMMON, ORB, HARM_IDS, GOOD_IDS, WIPE_ALL, wipeEff } from './status.js';
import { baseDamage, RULES, hitTable, tierOf } from './rules.js';

const SP = u => (u && SPECIES[u.key]) || {};
const BUFF_IDS = ['regen', 'will'];   // 빼앗기 · 날리기(엑셀 v10 회수) = 이로운 상태이상만 — 능력치 겹 · 준비 효과 · 환경 · 면역은 대상 아님
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
  if (s.spend && !s.spend.zeroOk && (r[s.spend.k] || 0) < (s.spend.all ? 1 : s.spend.n || 1)) return false;   // zeroOk = 0개여도 씀(식사시간 0~3)
  if (s.need && (r[s.need.k] || 0) < (s.need.n || 1)) return false;
  if (s.needMode && u.mode !== s.needMode) return false;
  if (s.lockMode && u.mode === s.lockMode) return false;
  if (s.hpCost && u.hp <= Math.round(u.max * s.hpCost)) return false;
  return true;
}
const foeHas = (f, id) => has(f, id) || !!(f.eff && f.eff.skip && f.eff.skip.src === id);   // 쉬는 차례(얼음 · 마비 · 기절)도 그 이름으로
const DYN = ['hitsBy', 'powBy', 'scale', 'allSun', 'luck', 'bonusIf', 'ifFoe', 'tag', 'orbDump', 'orbBlast', 'lostHp', 'trapBoom', 'ifRes'];
// 자기 차례에 기술 값을 정함(개수 · 운 · 상대 상태) — 바뀌는 칸이 없으면 그 기술 그대로(복사도 안 함)
export function dynAct(u, a0, foe, rng) {
  const boost = a0 && a0.tier === 'm' && u.st && u.st.formBoost ? u.st.formBoost.k : 0;   // 팽트랩 입맛 다시기 = 내 변이 기술 +20%(2턴)
  if (!a0 || (!DYN.some(k => a0[k]) && !boost)) return a0;
  const a1 = a0.ifRes && (resOf(u)[a0.ifRes.k] || 0) >= a0.ifRes.at ? { ...a0, ...a0.ifRes.then, ifResHit: true } : a0;   // 내 개수에 따라 기술 바꾸기(팽트랩 깨물기 → 준비 3이면 한입)
  const a = a1.ifFoe && foe && foeHas(foe, a1.ifFoe.has) ? { ...a1, ...a1.ifFoe.then, ifFoeHit: true } : a1;   // 상대 상태에 따라 공격 바꾸기(기절이면 찌르기 한 방)
  const r = resOf(u), o = { ...a };
  if (boost) o.power = Math.round((a.power || 0) * (1 + boost));
  if (!DYN.some(k => a0[k])) return o;
  const inf = u.st && u.st.infuse;
  if (a.tag && inf && inf.tag === a.tag && inf.n > 0) { o.el = inf.el; o.infused = true; }   // 속성 바꾸기(다음 n번)
  let pw = (a.power || 0) * (1 + boost);
  if (a.hitsBy) o.hits = Math.max(1, r[a.hitsBy] || 0);
  if (a.orbDump && u.orb) o.hits = Math.max(1, u.orb.n);   // 전격 구슬 = 남은 구슬만큼 연타
  if (a.orbBlast && u.orb) pw = ORB.blast * Math.max(1, u.orb.n);   // 뇌격구 = 구슬 하나당 위력
  if (a.powBy) pw += (r[a.powBy.k] || 0) * a.powBy.per;
  if (a.allSun) pw += (u.energy || 0) * a.allSun;
  if (a.lostHp) pw += Math.max(0, 1 - u.hp / u.max) * 100 * a.lostHp;   // 잃은 체력 1%당 위력 +(윈드페탈 피의 춤)
  if (a.trapBoom) pw += ((u.eff && u.eff.thornTrap && u.eff.thornTrap.n) || 0) * a.trapBoom;   // 폭발은 예술이지 = 팀에 깔린 덫 하나당 위력 +
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
  if ((a.orbDump || a.orbBlast || a.orbAbsorb || a.orbTrap) && u.orb) { u.st.orbSpent = u.orb.n; u.st.orbFull = u.orb.n === u.orb.max; if (a.orbTrap && u.orb.n) { u.orb.trap += u.orb.n; const t = ((u.eff ||= {}).orbTrap ||= { env: true, n: 0, back: 0, by: u.id, atk: u.atk }); t.n += u.orb.n; } u.orb.n = 0; ev.push({ t: 'res', who: u.id, k: 'orb', n: 0 }); }   // 구슬 전부 쓰기(속박 = 덫으로)
  if (a.infused && u.st.infuse && --u.st.infuse.n <= 0) delete u.st.infuse;
  if (a.trapBoom && u.eff && u.eff.thornTrap) { delete u.eff.thornTrap; ev.push({ t: 'expire', who: u.id, ids: ['thornTrap'], list: listOf(u) }); }   // 덫 전부 터뜨림
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
  if (a.bell) { (u.st ||= {}).bell = { kind: a.bell, exp: T + 2 }; ev.push({ t: 'bell', who: u.id, name: u.name, kind: a.bell, turns: 3 }); }   // 프로스트벨 아침 · 밤 = 지금 3턴(켠 턴 포함) — 필드 표시는 rules 가 bellSync 로
  if (a.formBoost) { (u.st ||= {}).formBoost = { k: a.formBoost, exp: T + 1 }; ev.push({ t: 'fx', who: u.id, to: u.id, name: u.name, id: 'formBoost', list: listOf(u) }); }   // 입맛 다시기: 이번 · 다음 턴 변이 기술 +
  if (a.mealMark) (u.st ||= {}).meal = { n: x.spent || 0, T, ready: false };   // 식사시간: 먹은 준비 수 → 바로 다음 턴 맛평가
  if (a.revive) { (u.eff ||= {}).revive = { cost: a.revive }; ev.push({ t: 'fx', who: u.id, to: u.id, name: u.name, id: 'revive', list: listOf(u) }); }   // 부활잉 걸어 두기
  if (a.bounce) { (u.eff ||= {}).bounce = { exp: T + 1 }; ev.push({ t: 'fx', who: u.id, to: u.id, name: u.name, id: 'bounce', list: listOf(u) }); }   // 너꺼잉: 걸자마자 · 안 쓰이면 다음 턴 끝까지
  if (a.trapSet) {   // 덫 설치(쏜위드): 우리 편 지형(설치형 — 교체해도 남음 · 팀 합계 상한) · 덫을 깐 식물의 공격력으로 터짐
    const t = ((u.eff ||= {}).thornTrap ||= { env: true, n: 0, by: u.id, atk: u.atk });
    if (t.n < a.trapSet.max) { t.n += 1; t.atk = Math.max(t.atk || 0, u.atk); }
    ev.push({ t: 'fx', who: u.id, to: u.id, name: u.name, id: 'thornTrap', n: t.n, list: listOf(u) });
  }
  if (a.cleanseHeal && u.hp > 0) {   // 치유의 물(아쿠아벌브): 내 해로운 상태이상을 모두 지우고 기본 + 지운 종류 하나당 회복(능력치 약화는 못 지움 — 2026-10-28 '상태이상만')
    const gone = wipeEff(u, HARM_IDS), before = u.hp;
    if (gone.length) ev.push({ t: 'fx', who: u.id, to: u.id, name: u.name, id: 'purified', ids: gone, list: listOf(u) });
    u.hp = Math.min(u.max, u.hp + Math.round(u.max * (a.cleanseHeal.base + a.cleanseHeal.per * gone.length) * (x.healK ?? 1) * healK(u)));
    ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) });
  }
  if (a.healPct && u.hp > 0) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * a.healPct * (x.healK ?? 1) * healK(u))); ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }   // 바로 회복(최대 체력 몫 — 청아함의 물결 · 메아리면 그 몫만큼 더)
  if (a.moss) mossAct(u, foe, ev);   // 이끼덮기
  if (a.orbRefill && u.orb) u.orb.n = u.orb.max - u.orb.trap;   // 구슬 회수
  if (a.orbAbsorb && u.hp > 0) { const n = u.st.orbSpent || 0, before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * ORB.absorb * n * healK(u))); ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); if (u.st.orbFull) selfBuff(u, 'purify', { turn: T, ev }); }   // 구슬흡수(가득이면 전부 정화)
  if (a.summon) summonAdd(u, T, ev);   // 포자 배양
  if (a.sporeWall && u.eff && u.eff.shield) u.eff.shield.spore = true;   // 포자벽
  if (a.volley) for (const s of liveSums(u).filter(x => x.stage !== 'sleep')) summonHit(u, s, foe, ev, x.rng || (() => 0.5));   // 일제 포자
  if (a.grow) growSums(u, ev);   // 커져라!
  if (a.infuse) { (u.st ||= {}).infuse = { ...a.infuse }; ev.push({ t: 'infuse', who: u.id, name: u.name, el: a.infuse.el, n: a.infuse.n }); }   // 속성 바꾸기 예약
  if (a.setMode) { u.mode = a.setMode; u.modeK = (SP(u).modes || {})[a.setMode] || null; ev.push({ t: 'mode', who: u.id, mode: a.setMode }); }
  if (!foe || foe.hp <= 0) return;
  const fe = (foe.eff ||= {});
  if (a.delay) (fe.timers ||= []).push({ at: T + a.delay.turns, raw: a.delay.power * (u.atk || 10) / 50, area: !!a.delay.area, by: u.id, name: a.name });
  if (!x.landed) return;
  if (a.execute && foe.hp > 0 && foe.hp < foe.max * a.execute) {   // 처형(윈드페탈 처형의 춤): 맞혔을 때 상대 체력이 기준 미만이면 쓰러뜨림 · 그 턴 버티기(죽은 줄 알았나?)엔 막힘
    if (foe.st && foe.st.endureT === T) ev.push({ t: 'resist', who: u.id, to: foe.id, name: foe.name, id: 'execute', why: 'endure', list: listOf(foe) });
    else { foe.hp = 0; ev.push({ t: 'execute', who: u.id, to: foe.id, name: foe.name }); }
  }
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
  if (a.seal && foe.hp > 0) apply(foe, 'seal', 1, { turn: T, rng: x.rng, ev, by: u });   // 봉인 = 엑셀 v10 봉인(무작위 기술 하나 · 다음 1턴 — 옛 '직전 기술 2턴'은 폐기)
}
// 버티기(D7): 맞은 피해로 쓰러질 때 그 개수가 남아 있으면 체력 1 · 하나 잃음
export function endureHp(u, hp, ev, T) {
  if (hp > 0) return hp;
  if (T != null && u.st && u.st.endureT === T && !u.st.endureDone) {   // 죽은 줄 알았나?(쏜위드): 이번 턴 쓰러질 공격을 받으면 최대 체력 몫으로 일어남 → 다음 턴 이 기술 잠김(봉인처럼 · 발동 안 하면 안 잠김 — 2026-10-28 사용자)
    u.st.endureDone = true; u.st.fakeLock = T + 1;
    ev.push({ t: 'endure', who: u.id, name: u.name, fake: true });
    return Math.max(1, Math.round(u.max * (u.st.endureHp || 0.15)));
  }
  if (T != null && u.eff && u.eff.revive) {   // 부활잉(젤리캡): 미리 걸어 둔 준비 효과 — 쓰러질 공격을 받으면 체력 가득으로 · 대가 = 공격 · 방어 1턴째 크게 → 2턴째 중간 → 3턴째 회복
    const R = u.eff.revive; delete u.eff.revive;
    for (const [id, v, turns] of R.cost || []) apply(u, id, 1, { turn: T, rng: () => 0.5, ev, by: u }, { v, turns });
    ev.push({ t: 'endure', who: u.id, name: u.name, revive: true });
    return u.max;
  }
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
//  할 일: gain{k, n} · store{k, pct}(받은 피해 몫을 개수로) · inflict(때린 쪽에 효과 id) · self(나에게 버프 id) · nextCrit(조준 — 다음 공격 기술 치명 +)
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
    if (r.nextCrit) { const e = (u.eff ||= {}); e.aim = { k: Math.max((e.aim && e.aim.k) || 0, r.nextCrit) }; }   // 치명 준비 = 조준
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
// 개수 칸 아이콘(2026-10-24 코덱스 — 있으면 글 대신 아이콘 + 수)
export const RES_ICON = { reso: 'res_reso', evs: 'res_evstack' };
// 개수 칸 화면 글(체력판 이름 줄 오른쪽) — 이름은 SPECIES.res[k][2]
export function resLine(u) {
  const D = SP(u).res, r = u && u.res;
  if (!D || !r) return '';
  return Object.keys(D).filter(k => D[k][2]).map(k => `${D[k][2]} ${r[k] || 0}`).join(' · ');
}

// ── 종 고유 기술 v2(2026-10-23 — 사용자 설계 docs/superpowers/specs/2026-10-18-v2-species-skills.md) ──
export const STORM = { dot: 0.06 };   // 폭풍 턴 끝 피해(최대 체력 몫 — 밸런스 전)
const frontSum = f => (f.summons || []).find(s => s.hp > 0) || null;
// 피해 없이 상대에게 거는 기술(hex): 상태 · 디버프는 앞 소환수가 대신 받음(소환수 공통 규칙) · 강풍(환경)은 그 쪽 앞 식물 · galeAdd = 상대 쪽 강풍에 덧붙임
export function hexAct(u, foe, a, ctx) {
  if (!foe || foe.hp <= 0) return;
  const sum = frontSum(foe);
  for (const h of a.hex || []) apply(h.id === 'gale' || !sum ? foe : sum, h.id, h.n || 1, { ...ctx, by: u }, h);
  if (a.caveAdd) caveAddAct(u, foe, a, ctx.ev);
  if (a.burst) burstAct(u, foe, ctx);
  if (a.taste && u.st && u.st.meal) {   // 맛평가(팽트랩): 식사시간 바로 다음 턴 — 먹은 준비 1 = 쇠약 · 2 = + 시듦 · 3 = + 봉인
    const n = u.st.meal.n, tgt = frontSum(foe) || foe; delete u.st.meal;
    for (const [i, id] of [[1, 'atkDown'], [2, 'defDown'], [3, 'seal']]) if (n >= i) apply(tgt, id, 1, { ...ctx, by: u });
  }
  if (a.settle) {   // 청산(아쿠아벌브): 상대 해로운 상태이상을 종류째 지우고 종류 하나당 최대 체력 몫 확정 피해(상한 종류 수 — 독 5겹 = 하나)
    const gone = wipeEff(foe, HARM_IDS), k = Math.min(a.settle.cap, gone.length);
    if (gone.length) ctx.ev.push({ t: 'expire', who: foe.id, ids: gone, list: listOf(foe) });
    if (k) { const d = Math.max(1, Math.round(foe.max * a.settle.per * k)); foe.hp = Math.max(0, foe.hp - d); ctx.ev.push({ t: 'tick', who: foe.id, name: foe.name, id: 'settle', n: k, dmg: d, burst: true, list: listOf(foe) }); noteFall(foe, ctx.ev); }
  }
  if (a.cycle) for (const z of [u, foe]) { const gone = wipeEff(z, WIPE_ALL); if (gone.length) ctx.ev.push({ t: 'expire', who: z.id, ids: gone, list: listOf(z) }); }   // 윤회: 양쪽 버프 · 디버프 전부(능력치 겹 포함 — 예외 기술)
  if (a.harmony) {   // 조화: 먼저 = 상대 상태를 내 것과 똑같이 · 나중 = 내 상태를 상대 것과 똑같이(덮어쓰기 · 이로운 · 해로운 상태이상만 · 같은 속성 면역은 그대로)
    const [src, dst] = a.harmony === 'toFoe' ? [u, foe] : [foe, u], keys = [...HARM_IDS, ...GOOD_IDS];
    wipeEff(dst, keys);
    for (const k of keys) { const D = FX[k] || {}; if (src.eff && src.eff[k] && !((D.el && dst.el === D.el) || (D.jong && dst.jong === D.jong))) (dst.eff ||= {})[k] = structuredClone(src.eff[k]); }
    ctx.ev.push({ t: 'fx', who: u.id, to: dst.id, name: dst.name, id: 'harmony', list: listOf(dst) });
  }
  if (a.galeAdd && has(foe, 'gale')) {
    const g = foe.eff.gale; g.add = [...(g.add || []), a.galeAdd];
    ctx.ev.push({ t: 'fx', who: u.id, to: foe.id, name: foe.name, id: a.galeAdd === 'storm' ? 'storm' : 'gale', add: a.galeAdd, list: listOf(foe) });
  }
}
// 게일캑터 공명(SPECIES.reso): 방해 디버프(count)가 들어간 기술 한 번 = +1(둘이 들어가도 1) · 상대 쪽 강풍 · 폭풍이 부는 턴 끝 = +1 ·
//  at 이 되면 무속성 확정 치명 추가 공격(위력 power — 약하게) 뒤 0부터. 치명 확률 감소는 안 통하고 치명 방어(그 턴 방어태세)엔 막혀 정타
export function resoAfter(u, foe, ev, n0, T, guarded) {
  const R = SP(u).reso;
  if (!R || u.hp <= 0 || !foe || foe.hp <= 0) return;
  for (let i = n0; i < ev.length; i++) { const e = ev[i]; if (e.t === 'fx' && e.who === u.id && e.to !== u.id && !e.add && R.count.includes(e.id)) return resoAdd(u, foe, T, ev, guarded); }
}
function resoAdd(u, foe, T, ev, guarded) {
  const R = SP(u).reso, r = resOf(u);
  r[R.k] = (r[R.k] || 0) + 1;
  if (r[R.k] < R.at) { ev.push({ t: 'res', who: u.id, k: R.k, n: r[R.k] }); return; }
  r[R.k] = 0; ev.push({ t: 'res', who: u.id, k: R.k, n: 0 });
  sideHit(u, foe, R.power, guarded ? 'hit' : 'crit', ev, { from: 'reso', label: '공명' });
}
// 패시브 추가 공격(무속성 · 결과표 없음): 앞 소환수부터 · 보호막이 먼저 막음 → 맞은 대상
function sideHit(u, foe, power, tier, ev, tag) {
  const tgt = frontSum(foe) || foe;
  let dmg = Math.max(1, Math.round(baseDamage({ atk: u.atk * atkK(u) }, { def: tgt.def * defK(tgt) }, { power }, 1) * RULES.tierMult[tier])), absorb = 0;
  if (foe.eff && foe.eff.shield) { const sh = foe.eff.shield; absorb = Math.min(sh.hp, dmg); sh.hp -= absorb; dmg -= absorb; if (sh.hp <= 0) delete foe.eff.shield; }   // 보호막은 소환수보다 먼저
  tgt.hp = Math.max(0, tgt.hp - dmg);
  const k = tgt === foe ? undefined : foe.summons.indexOf(tgt);
  ev.push({ t: 'counter', who: u.id, to: foe.id, sum: k, dmg, absorb, tier, ...tag, list: listOf(foe) });
  if (k !== undefined && tgt.hp <= 0) { foe.summons.splice(k, 1); ev.push({ t: 'summonBreak', who: foe.id, i: k, name: tgt.name }); }
  noteFall(foe, ev);   // 쓰러짐 사건(먼저 쓰러진 쪽이 짐)
  return tgt;
}
// 게일바인 스택(SPECIES.evStack): 상대 공격이 나를 빗나간 타마다 +1(상한 = res 최대) · 맞으면(정타 · 치명 — 자세 무관) 그 공격이 끝난 뒤
//  전부 써서 반격(스택 하나당 위력 per · bleedAt 이상이면 출혈) · 스침은 쌓이지도 터지지도 않음 · 선공하면 firstUp 한 겹
export function evStackAdd(u, ev) {
  const D = SP(u).evStack;
  if (!D || u.hp <= 0) return;
  const before = resOf(u)[D.k] || 0;
  if (addRes(u, D.k, 1) !== before) ev.push({ t: 'res', who: u.id, k: D.k, n: u.res[D.k] });
}
export function evCounter(u, foe, T, ev, rng) {
  const D = SP(u).evStack;
  if (!D || u.hp <= 0 || !foe || foe.hp <= 0) return;
  const r = resOf(u), n = r[D.k] || 0;
  if (!n) return;
  r[D.k] = 0; ev.push({ t: 'res', who: u.id, k: D.k, n: 0 });
  const tgt = sideHit(u, foe, D.per * n, 'hit', ev, { from: 'stack', label: '반격', n });
  if (n >= D.bleedAt && tgt.hp > 0) apply(tgt, 'bleed', 1, { turn: T, rng, ev, by: u });
}
export function firstUp(u, T, ev) { const b = SP(u).firstUp; if (b && u.hp > 0) selfBuff(u, b, { turn: T, ev }); }
// 턴 끝(status.endTurn — [나, 건너편 앞 식물]): 내 쪽 강풍의 폭풍 피해 · 감전 / 건너편 강풍의 치유(우리 편 회복) · 공명 셈
export function galeTurn(u, opp, turn, ev) {
  if (!u || u.hp <= 0) return;
  const g = u.eff && u.eff.gale, add = (g && g.add) || [];
  if (add.includes('storm')) { const d = Math.max(1, Math.round(u.max * STORM.dot)); u.hp = Math.max(0, u.hp - d); ev.push({ t: 'tick', who: u.id, name: u.name, id: 'storm', dmg: d, list: listOf(u) }); }
  if (add.includes('shock') && u.hp > 0) apply(u, 'shock', 1, { turn, rng: () => 0.5, ev, by: { id: g.by } });
  if (u.orb && u.orb.n > 0 && turn % 2 === 0 && opp && opp.hp > 0) { const n = u.orb.n; u.orb.n = 0; sideHit(u, opp, ORB.fire * n, 'hit', ev, { from: 'orb', label: '구슬 발사', n }); }   // 볼트바인: 짝수 턴 끝에 남은 구슬 발사
  const cv = u.eff && u.eff.cave;
  if (cv && (cv.add || []).includes('lava') && u.hp > 0) apply(u, 'burn', 1, { turn, rng: () => 0.5, ev, by: { id: cv.by } });   // 용암지대 = 턴 끝마다 화상(유지)
  const og = opp && opp.hp > 0 && opp.eff && opp.eff.gale;
  if (!og || u.hp <= 0) return;
  if ((og.add || []).includes('heal') && u.hp < u.max) { const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * FX.regen.heal * healK(u))); ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) }); }
  if (SP(u).reso) resoAdd(u, opp, turn, ev, !!(opp.st && opp.st.guardT === turn));
}

// 스톤캡 동굴(SPECIES.cave): 앞에 나와 있는 동안 상대 쪽 앞 식물에 동굴(환경 — 상대가 교체해도 새로 나온 식물에게) · 스톤캡이 나가거나 쓰러지면 설치물째 걷힘
export function caveSync(A, B, ev) {
  for (const [x, y] of [[A, B], [B, A]]) {
    if (!y || y.hp <= 0) continue;
    const want = !!(x && SP(x).cave && x.hp > 0), c = y.eff && y.eff.cave;
    if (want && !(c && c.by === x.id)) { (y.eff ||= {}).cave = { env: true, by: x.id, add: [] }; ev.push({ t: 'fx', who: x.id, to: y.id, name: y.name, id: 'cave', list: listOf(y) }); }
    else if (!want && c) { delete y.eff.cave; ev.push({ t: 'expire', who: y.id, ids: ['cave'], list: listOf(y) }); }
  }
}
// 동굴에 설치(자갈밭 · 용암지대 · 지반붕괴 — 같은 것은 한 번) · 이끼덮기 = 설치물을 모두 걷고 하나당 최대 체력 몫 회복(동굴은 남음)
export function caveAddAct(u, foe, a, ev) {
  const c = foe && foe.eff && foe.eff.cave;
  if (!c || foe.hp <= 0 || c.add.includes(a.caveAdd)) return;
  c.add.push(a.caveAdd);
  ev.push({ t: 'fx', who: u.id, to: foe.id, name: foe.name, id: 'cave', add: a.caveAdd, list: listOf(foe) });
}
export function mossAct(u, foe, ev) {
  const c = foe && foe.eff && foe.eff.cave, n = c ? c.add.length : 0;
  if (!n) return;
  c.add = [];
  ev.push({ t: 'expire', who: foe.id, ids: ['cave'], list: listOf(foe) });
  const before = u.hp; u.hp = Math.min(u.max, u.hp + Math.round(u.max * CAVE.mossHeal * n * healK(u)));
  ev.push({ t: 'regen', who: u.id, name: u.name, heal: u.hp - before, list: listOf(u) });
}

// 스포어캡 소환수(SPECIES.summon · 수치 status.js SUMMON): 포자 배양 = 잠든 포자(주인 능력치 %) → 소환한 다음 턴 시작에 살아 있으면 새끼 → 깨어난 턴부터 턴 시작마다 평타(무속성)
//  커져라! = 새끼가 성체 버섯(더 큰 %) · 체력은 남은 비율 그대로 · 포자회귀 = 모두 터뜨려 상대에게 포자 · 주인이 교체되면 사라짐(status.clearOnSwitch)
const liveSums = u => (u.summons || []).filter(s => s.hp > 0);
const SUM_NAME = { sleep: '잠든 포자', baby: '새끼', adult: '성체 버섯' };
function sumStats(u, stage) { const k = stage === 'adult' ? SUMMON.adultPct : SUMMON.pct; return { max: Math.max(1, Math.round(u.max * k)), atk: Math.max(1, Math.round(u.atk * k)), def: Math.max(1, Math.round(u.def * k)) }; }
export function summonAdd(u, T, ev) {
  if (liveSums(u).length >= SUMMON.max) return;
  const st = sumStats(u, 'sleep');
  (u.summons ||= []).push({ id: `${u.id}_s${(u.sumN = (u.sumN || 0) + 1)}`, name: SUM_NAME.sleep, stage: 'sleep', born: T, key: u.key, el: u.el, jong: u.jong, hp: st.max, ...st, spd: u.spd, acc: 0, eva: 0, crit: 0, eff: {} });
  ev.push({ t: 'summon', who: u.id, name: SUM_NAME.sleep, n: liveSums(u).length });
}
function summonHit(u, s, foe, ev, rng) {
  if (!foe || foe.hp <= 0 || s.hp <= 0) return;
  const tgt = frontSum(foe) || foe, veil = tgt === foe && has(foe, 'stealth');
  const tier = veil && rng() < FX.stealth.miss ? 'miss' : tierOf(hitTable(s, tgt, {}), Math.floor(rng() * 100));
  if (tier === 'miss') return;
  if (veil) { delete foe.eff.stealth; ev.push({ t: 'reveal', who: foe.id, id: 'stealth', list: listOf(foe) }); }
  sideHit(s, foe, SUMMON.power, tier, ev, { who: u.id, from: 'summon', label: s.name });
}
export function summonStart(u, foe, T, ev, rng) {
  if (!u || u.hp <= 0 || !u.summons) return;
  for (const s of liveSums(u)) if (s.stage === 'sleep' && s.born < T) { s.stage = 'baby'; s.name = SUM_NAME.baby; ev.push({ t: 'summonWake', who: u.id, name: s.name }); }
  for (const s of liveSums(u)) if (s.stage !== 'sleep') summonHit(u, s, foe, ev, rng);
}
function growSums(u, ev) {
  for (const s of liveSums(u)) {
    if (s.stage !== 'baby') continue;
    const r = s.hp / s.max, st = sumStats(u, 'adult');
    Object.assign(s, st, { stage: 'adult', name: SUM_NAME.adult, hp: Math.max(1, Math.round(st.max * r)) });
  }
  ev.push({ t: 'summonGrow', who: u.id });
}
function burstAct(u, foe, ctx) {
  const L = liveSums(u), n = L.reduce((t, s) => t + (SUMMON.burst[s.stage] || 1), 0);
  L.forEach(() => ctx.ev.push({ t: 'summonBreak', who: u.id, i: 0, name: SUM_NAME.sleep }));
  u.summons = [];
  if (!foe || foe.hp <= 0) return;
  const tgt = frontSum(foe) || foe;
  for (let i = 0; i < n; i++) apply(tgt, 'spore', 1, { ...ctx, by: u });
}

// 프로스트벨 아침 · 밤(SPECIES.bell = { 아침: 메아리 몫, 밤: 메아리 몫 } · 2026-10-23 설계 · 10-28 교체 · 필드 확정):
//  켜 둔 프로스트벨이 앞에 있고 3턴 안이면 양쪽 앞 식물에 그 환경(필드 — 교체로 들어온 식물도) · 프로스트벨이 나가거나 끝나면 걷음
export function bellSync(A, B, T, ev) {
  const owner = {};
  for (const x of [A, B]) if (x && x.hp > 0 && SP(x).bell && x.st && x.st.bell && x.st.bell.exp >= T && !owner[x.st.bell.kind]) owner[x.st.bell.kind] = x;
  for (const z of [A, B]) {
    if (!z || z.hp <= 0) continue;
    for (const k of ['morning', 'night']) {
      const c = z.eff && z.eff[k], x = owner[k];
      if (x && !(c && c.by === x.id)) { (z.eff ||= {})[k] = { env: true, by: x.id, exp: x.st.bell.exp }; ev.push({ t: 'fx', who: x.id, to: z.id, name: z.name, id: k, list: listOf(z) }); }
      else if (!x && c) { delete z.eff[k]; ev.push({ t: 'expire', who: z.id, ids: [k], list: listOf(z) }); }
    }
  }
}
// 메아리 몫(아침 · 밤이 켜진 동안 · 0 = 없음)
export const echoK = (u, T) => { const b = SP(u).bell, s = u && u.st && u.st.bell; return b && s && s.exp >= T ? b[s.kind] || 0 : 0; };
// 메아리 한 번의 기술 값: 위력 · 능력치 겹 값 · 회복은 몫만큼 · 빙결 · 독은 한 겹 그대로 · 봉인은 다른 기술 하나 더 · 기간만 있는 효과는 그대로(긴 쪽)
export function echoAct(a, k) {
  const inf = a.inflict, D = inf && FX[inf.id];
  const inflict = !inf ? inf : inf.id === 'chill' || inf.id === 'poison' ? { ...inf, n: 1 } : D && D.stat ? { ...inf, v: (inf.v ?? D.v) * k } : inf.id === 'seal' ? { ...inf, extra: true } : inf;
  return { ...a, power: a.power ? Math.max(1, Math.round(a.power * k)) : a.power, inflict, echoK: k, bell: undefined };
}

// 쏜위드 덫(2026-10-18 설계 · 10-28 설치형 확정): 우리 편 공격이 빗나가거나 스치면 한 행동에 하나 터짐 = 확정으로 맞는 피해(위력 THORN.power) + 독 1
export const THORN = { power: 90 };   // 45 → 90(2026-10-29 리그전 29% → 맞춤, 임시)
export function thornBurst(u, foe, T, ev, rng) {
  const t = u.eff && u.eff.thornTrap;
  if (!t || t.n <= 0 || !foe || foe.hp <= 0) return;
  t.n -= 1;
  const tgt = sideHit({ id: u.id, atk: t.atk || u.atk, eff: {} }, foe, THORN.power, 'hit', ev, { from: 'trap', label: '덫' });
  if (tgt.hp > 0) apply(tgt, 'poison', 1, { turn: T, rng, ev, by: u });
  if (t.n <= 0) { delete u.eff.thornTrap; ev.push({ t: 'expire', who: u.id, ids: ['thornTrap'], list: listOf(u) }); }
}

// 볼트바인 구슬(SPECIES.orbs · 수치 status.js ORB): 처음 보면 칸을 만들고 기본 햇빛 칸을 줄임 · 홀수 턴 시작에 가득(덫에 나간 것 빼고)
export function orbInit(u, T) {
  if (!u || !SP(u).orbs) return;
  if (!u.orb) { const si = typeof u.stage === 'number' ? u.stage : Math.max(0, STAGE_KEY.indexOf(u.stage)), m = ORB.slots[Math.min(2, si)]; u.orb = { max: m, n: m, trap: 0 }; u.energyMax = Math.max(2, (u.energyMax || 8) - ORB.baseCut); u.energy = Math.min(u.energy || 0, u.energyMax); }
}
export function orbStart(u, T) {
  if (!u || u.hp <= 0 || !SP(u).orbs) return;
  orbInit(u, T); (u.st ||= {});
  const t = u.eff && u.eff.orbTrap;
  if (t && t.by === u.id) { u.orb.n = Math.min(u.orb.max, u.orb.n + t.back); t.back = 0; u.orb.trap = t.n; if (!t.n) delete u.eff.orbTrap; }   // 돌아오면 대기석에 있는 동안 터진 만큼 구슬을 받음
  if (T % 2 === 1) u.orb.n = u.orb.max - u.orb.trap;
}
// 봉인 구슬 덫(내 쪽 지형 — 2026-10-24 사용자 '덫은 원래 지형에 남는거잖아 … 덫은 식물이 죽어도 유지'): 내 쪽 앞 식물(u)이 맞을 때마다 하나 터짐 = 낮은 피해 + 봉인(다음 1턴)
//  터진 구슬은 볼트바인에게 — 앞에 있으면 바로, 대기석이면 돌아올 때(orbStart) · 위력은 덫을 깐 볼트바인의 공격으로
export function orbTrapBurst(u, foe, T, ev, rng) {
  const t = u.eff.orbTrap;
  t.n -= 1;
  if (t.by === u.id && u.orb) { u.orb.n = Math.min(u.orb.max, u.orb.n + 1); u.orb.trap = t.n; } else t.back += 1;
  sideHit({ id: u.id, atk: t.atk || u.atk, eff: {} }, foe, ORB.trap, 'hit', ev, { from: 'trap', label: '봉인 구슬' });
  if (foe.hp > 0) apply(foe, 'seal', 1, { turn: T, rng, ev, by: u });
  if (t.n <= 0 && !t.back) delete u.eff.orbTrap;
}
