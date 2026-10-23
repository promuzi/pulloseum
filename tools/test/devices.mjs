// 바닥 규칙 2단계 장치 시험(2026-10-18 — docs/superpowers/specs/2026-10-18-v2-species-identity-design.md §1)
//  방어구 · 관통 · 연타 · 은신 · 분신 · 순서 손잡이 — node tools/test/devices.mjs
import { resolveTurn, rollFirst, baseDamage } from '../../v2/src/battle/rules.js';
import { selfBuff, listOf, has, FX, canUse, endTurn, atkK } from '../../v2/src/battle/status.js';
import { resOf, resLine } from '../../v2/src/battle/devices.js';
import { SKILLS, SPECIES } from '../../v2/src/game/catalog.js';

let pass = 0;
const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const unit = (id, o = {}) => ({ id, name: id, hp: 300, max: 300, atk: 40, def: 30, spd: 30, acc: 0, eva: 0, crit: 0, energy: 5, energyMax: 8, eff: {}, ...o });
const seq = arr => { let i = 0; return () => arr[Math.min(i++, arr.length - 1)]; };   // 정해진 굴림
const atk = (o = {}) => ({ id: 'x', act: 'attack', power: 60, cost: 0, ...o });
const rest = { id: 'rest', act: 'skip', cost: 0 };
const hits = ev => ev.filter(e => e.t === 'hit');

// ── 방어구 ──
{
  const u = unit('a');
  selfBuff(u, 'armor', { turn: 1, ev: [] }); selfBuff(u, 'armor', { turn: 1, ev: [] });
  ok(u.eff.armor.hp === 90, `방어구 두 번 = 최대 체력 15% × 2 (${u.eff.armor.hp})`);
  for (let i = 0; i < 5; i++) selfBuff(u, 'armor', { turn: 1, ev: [] });
  ok(u.eff.armor.hp === 150, `방어구 상한 = 최대 체력 50% (${u.eff.armor.hp})`);
  ok(listOf(u).some(x => x.id === 'armor' && x.hp === 150), '효과 목록에 방어구 남은 양');
  const A = unit('a'), D = unit('d', { eff: { armor: { hp: 20 } } });
  const r = resolveTurn(A, D, atk(), rest, seq([0, 0.5, 0.5]), { turn: 1 });
  const h = hits(r.events)[0];
  ok(h && h.absorb === 20 && h.ab === 'armor' && !D.eff.armor && r.events.some(e => e.t === 'armorBreak'), '방어구가 먼저 막고 부서짐');
  const D2 = unit('d', { eff: { armor: { hp: 30 } } });
  resolveTurn(unit('a'), D2, atk({ id: 'm_smash', power: 10 }), rest, seq([0, 0.5, 0.5]), { turn: 1 });
  ok(D2.eff.armor && D2.eff.armor.hp < 30 - 6, `망치는 방어구를 더 깎음(남은 ${D2.eff.armor && D2.eff.armor.hp})`);
}
// ── 관통 ──
{
  const a = { atk: 50 }, d = { def: 100 };
  const n = baseDamage(a, d, { power: 100 }), p = baseDamage(a, { def: 70 }, { power: 100 });   // 관통은 한 턴 계산(hitDmg)이 방어를 줄여 넘김
  ok(Math.abs(n - 50) < 0.01, `방어 100 = 절반(${n})`);
  const A = unit('a'), D = unit('d', { def: 100 }), D2 = unit('d', { def: 100 });
  resolveTurn(A, D, atk({ power: 100 }), rest, seq([0, 0.5]), { turn: 1 });
  resolveTurn(unit('a'), D2, atk({ power: 100, pierce: 0.3 }), rest, seq([0, 0.5]), { turn: 1 });
  ok(D2.hp < D.hp, `관통 30% = 더 아픔(${300 - D.hp} → ${300 - D2.hp})`);
  ok(p > n, '관통 계산');
}
// ── 연타 ──
{
  const A = unit('a'), D = unit('d');
  const r = resolveTurn(A, D, atk({ power: 20, hits: 3, inflict: { id: 'weak' } }), rest, seq([0, 0.5]), { turn: 1 });
  const hs = hits(r.events);
  ok(hs.length === 3 && hs[2].n === 3 && hs[2].of === 3, `연타 = 타마다 사건(${hs.length})`);
  ok(r.events.filter(e => e.t === 'fx' && e.id === 'atkDown').length === 1, '효과는 첫 적중 한 번');
  // 연타는 불운 보정 없음: 계속 빗나감 굴림이면 끝까지 빗나감
  const B2 = unit('d'), r2 = resolveTurn(unit('a'), B2, atk({ power: 20, hits: 4 }), { id: 'evade', act: 'evade', cost: 0, shift: { miss: 15, graze: 10 } }, seq([0, 0.01]), { turn: 1 });
  ok(hits(r2.events).every(h => h.tier === 'miss') && B2.hp === 300, '연타 = 불운 보정 없음(넷 다 빗나갈 수 있음)');
  // 방어태세 1타만 막음
  const G = unit('d'), r3 = resolveTurn(unit('a'), G, atk({ power: 20, hits: 3 }), { id: 'guard', act: 'guard', cost: 0 }, seq([0, 0.5]), { turn: 1 });
  const g3 = hits(r3.events);
  ok(g3.length === 3 && g3.every(h => h.guard), '방어태세는 그 턴 모든 타를 막음(엑셀 v10 — 연타 = 회피에 강한 안정형)');
}
// ── 은신(엑셀 v10 — 분신은 연출만) · 순서 손잡이 ──
{
  const S = unit('s', { spd: 50 }), F = unit('f', { spd: 10 });
  const hide = { id: 'h', name: '그림자 숨기', act: 'buff', cost: 0, self: 'stealth', early: true, link: { power: 70, ambush: true } };
  const r = resolveTurn(S, F, hide, atk({ power: 60 }), seq([0.5, 0.5, 0.5, 0.5]), { turn: 1 });
  ok(r.first === 's', '은신 기술 = 선공형(먼저)');
  const fh = hits(r.events);
  ok(fh[0].who === 'f' && fh[0].tier === 'miss' && fh[0].veil, '은신 = 광역 아닌 공격 빗나감(95%)');
  ok(fh[1] && fh[1].who === 's' && fh[1].ambush && fh[1].link, '피하면 바로 이어 공격 = 기습(×1.5 · 자세 무시)');
  const ar = resolveTurn(unit('s'), unit('f'), hide, atk({ power: 60, area: true }), seq([0.5, 0.5, 0.5]), { turn: 1 });
  ok(ar.events.some(e => e.t === 'reveal' && e.id === 'stealth') && hits(ar.events).every(h => !h.link), '광역에 맞으면 은신이 풀리고 이어 공격 없음');
  ok(rollFirst(unit('a', { spd: 80 }), unit('b', { spd: 10 }), () => 0.5, [-1, -1]).first.id === 'b', '둘 다 나중 = 빠른 쪽이 나중일 확률 높음');
  ok(rollFirst(unit('a', { spd: 1 }), unit('b', { spd: 99 }), () => 0.99, [1, 0]).first.id === 'a', '먼저(early) = 무조건 선공');
  const C = unit('c'); selfBuff(C, 'clone', { turn: 1, ev: [] });
  ok(has(C, 'stealth') && C.eff.stealth.look === 'clone' && !C.eff.clone, '분신 = 은신(연출만 분신)');
  const c2 = resolveTurn(unit('a'), C, atk(), rest, seq([0, 0.97, 0.5]), { turn: 1 });
  ok(hits(c2.events)[0].tier !== 'miss' && !has(C, 'stealth'), '맞히면 은신(분신) 풀림');
  ok(FX.stealth.miss === 0.95 && !FX.clone, '수치(공통 은신 95%)');
}
// ── 기술 연결 ──
ok(SKILLS.u_ninja_3.hits === 3 && SKILLS.u_ninja_3b.stealth && SKILLS.u_ninja_2.self === 'clone' && SKILLS.u_hyunmu_2.self === 'armor' && SKILLS.u_gladi_1.pierce === 0.3 && SKILLS.u_astro_3.early, '기술 연결');

// ── 공통 장치(devices.js — 2026-10-18 로드맵 1번) ──
{
  SPECIES.__t = { name: '시험', res: { kunai: [5, 5], prep: [0, 3], fed: [0, 3], head: [2, 3], tail: [1, [3, 6, 9]] }, resTurn: { tail: 1 }, endure: 'head', modes: { naked: { atk: 1.5 } } };
  const T = o => unit('t', { key: '__t', stage: 2, ...o });
  const go = (a, b, aa, bb, r = seq([0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), turn = 1) => resolveTurn(a, b, aa, bb, r, { turn });
  // 개수 칸 · 연타 수 · 내기
  const u = T(); ok(resOf(u).kunai === 5 && u.resMax.tail === 9, '개수 칸 처음 값 · 단계별 최대');
  const throwK = atk({ id: 'k1', power: 30, spend: { k: 'kunai', n: 1 } });
  go(u, unit('d'), throwK, rest); ok(u.res.kunai === 4, '내기 = 하나 줄어듦');
  u.res.kunai = 3; const r1 = go(u, unit('d'), atk({ id: 'k2', power: 20, hitsBy: 'kunai', spend: { k: 'kunai', all: true } }), rest);
  ok(hits(r1.events).length === 3 && u.res.kunai === 0 && !canUse(u, throwK, 9), '개수만큼 연타 · 전부 냄 · 0이면 못 씀');
  // 표식 배율 + 낸 수를 다른 칸에(식사시간 → 식후)
  const m = T(); resOf(m).prep = 3;
  const meal = atk({ id: 'meal', power: 90, scale: { k: 'prep', dmg: [0, 0.2, 0.45, 0.8], drain: [0.2, 0.35, 0.5, 0.7] }, spend: { k: 'prep', all: true }, gain: { k: 'fed', n: 'spent', set: true } });
  const d1 = unit('d'); m.hp = 100; go(m, d1, meal, rest);
  ok(m.res.prep === 0 && m.res.fed === 3 && m.hp > 100, `표식 셋 = 위력 · 흡수 ↑ → 준비 0 · 식후 3 (체력 ${m.hp})`);
  // 버티기: 맞은 피해로 쓰러지면 체력 1 · 머리 하나 / 지속 피해로는 못 버팀
  const h = T({ hp: 5 }); const r2 = go(unit('a', { atk: 200 }), h, atk({ power: 200 }), rest);
  ok(h.hp === 1 && h.res.head === 1 && r2.events.some(e => e.t === 'endure'), '버티기 = 체력 1 · 머리 −1');
  // 상태 소비 · 그 상태면 배율
  const p = unit('d', { eff: { poison: { n: 4, last: 1 } } }); go(unit('a'), p, atk({ power: 10, consume: { id: 'poison', per: 0.05, cap: 0.25 } }), rest);
  ok(!p.eff.poison && p.hp < 300 - 60 + 5, `독 터뜨리기 = 겹 × 5% 즉시 · 독 지움(체력 ${p.hp})`);
  const fz = unit('d', { eff: { frozen: {}, skip: { src: 'frozen' } } }), plain = unit('d');
  go(unit('a'), fz, atk({ power: 60, bonusIf: { id: 'frozen', k: 2, clear: true } }), rest); go(unit('a'), plain, atk({ power: 60, bonusIf: { id: 'frozen', k: 2, clear: true } }), rest);
  ok(300 - fz.hp > (300 - plain.hp) * 1.4 && !fz.eff.frozen, `얼음이면 ×2(얼음은 받는 피해 −25%라 약 1.5배) · 얼음 깸 (${300 - fz.hp} 대 ${300 - plain.hp})`);
  // 상대 조작: 햇빛 · 버프 빼앗기 · 버프 날리기 · 봉인
  const s1 = unit('a', { energy: 1 }), s2 = unit('d', { energy: 3 }); go(s1, s2, atk({ power: 10, steal: 'sun' }), rest);
  ok(s1.energy === 2 && s2.energy === 2, '햇빛 빼앗기');
  const b1 = unit('a'), b2 = unit('d', { eff: { rage: { exp: 9 }, wall: { exp: 9 } } }); go(b1, b2, atk({ power: 10, steal: 'buff' }), rest);
  ok(b1.eff.rage && !b2.eff.rage && b2.eff.wall, '버프 하나 빼앗기');
  const c2 = unit('d', { eff: { rage: { exp: 9 }, wall: { exp: 9 } } }); go(unit('a'), c2, atk({ power: 10, dispel: 'all' }), rest);
  ok(!c2.eff.rage && !c2.eff.wall, '버프 전부 날리기');
  const z = unit('d', { kit: [{ id: 'big', name: '큰 기술' }], st: { lastAct: 'big', lastName: '큰 기술', miss: {}, init: 0 } }); go(unit('a'), z, atk({ power: 10, seal: true }), rest);
  ok(z.eff.seal && z.eff.seal.skill === 'big' && z.eff.seal.exp === 2, '봉인 장치 = 엑셀 v10 봉인(무작위 기술 하나 · 다음 1턴 — 옛 직전 기술 2턴 폐기)');
  // 운: 0배가 나오면 다음은 가장 큰 배율 확정
  const L = unit('a'), luck = atk({ power: 100, luck: [[0.3, 1.6], [0.55, 1], [0.15, 0]] }), L1 = unit('d'), L2 = unit('d');
  resolveTurn(L, L1, luck, rest, seq([0, 0.99, 0.5]), { turn: 1 }); resolveTurn(L, L2, luck, rest, seq([0, 0.99, 0.5]), { turn: 2 });
  ok(L1.hp >= 299 && 300 - L2.hp > 90, `헛방망이(최소 피해 1) 다음 = 금 ×1.6 확정(${L1.hp} → ${L2.hp})`);
  // 비용: 체력 · 남은 햇빛 전부
  const hc = unit('a'); go(hc, unit('d'), atk({ power: 90, hpCost: 0.1 }), rest); ok(hc.hp === 270, '체력 10% 냄');
  const sa = unit('a', { energy: 4 }), sd = unit('d'), sd0 = unit('d'); go(sa, sd, atk({ power: 50, allSun: 30 }), rest); go(unit('a', { energy: 0 }), sd0, atk({ power: 50, allSun: 30 }), rest);
  ok(sa.energy === 0 && 300 - sd.hp > (300 - sd0.hp) * 2, '남은 햇빛 전부 = 위력 ↑');
  // 시한 · 메아리(턴 끝 · 교체하면 사라짐)
  const bomb = unit('d'), bo = unit('a'); go(bo, bomb, { id: 'dyn', act: 'buff', cost: 0, delay: { turns: 2, power: 90, area: true } }, rest, seq([0, 0.5]), 1);
  const evs = []; endTurn([[bomb, bo]], 2, evs); const hp2 = bomb.hp; endTurn([[bomb, bo]], 3, evs);
  ok(hp2 === 300 && bomb.hp < 300 && evs.some(e => e.t === 'boom'), '시한 = 2턴 뒤 턴 끝 폭발');
  const ec = unit('d'); go(unit('a'), ec, atk({ power: 60, echo: 0.5, inflict: { id: 'weak' } }), rest); const ec1 = ec.hp, ee = []; endTurn([[ec, unit('a')]], 2, ee);
  ok(ec.hp < ec1 && ee.some(e => e.t === 'boom'), '메아리 = 다음 턴 끝 한 번 더');
  // 모드 · 개수 칸 턴마다
  const md = T(); go(md, unit('d'), { id: 'brk', act: 'buff', cost: 0, setMode: 'naked' }, rest);
  ok(md.mode === 'naked' && atkK(md) === 1.5 && !canUse(md, { id: 'x', cost: 0, lockMode: 'naked' }, 9) && canUse(md, { id: 'y', cost: 0, needMode: 'naked' }, 9), '모드 = 능력치 배율 · 잠김 / 그 모드만');
  const tl = T(); const tev = []; endTurn([[tl, unit('d')]], 1, tev); ok(tl.res.tail === 2, '턴 끝 꼬리 +1');
  delete SPECIES.__t;
}
// ── 공통 장치 2묶음: 반응 · 받는 피해 배율 · 개수만큼 반사 · 경기장 · 2턴 · 개수 글 ──
{
  SPECIES.__r = { name: '반응', res: { thorn: [0, 5, '가시'], water: [0, 999, '물'] }, react: [{ on: 'contact', gain: { k: 'thorn', n: 1 } }, { on: 'hit', store: { k: 'water', pct: 0.3 } }, { on: 'contact', inflict: 'shock' }, { on: 'half', self: 'rage' }, { on: 'crit', nextCrit: 50 }], takenK: [{ when: 'full', k: 0.5 }], thornRes: { k: 'thorn', per: 0.1 } };
  const R = o => unit('r', { key: '__r', ...o });
  const r1 = R(), a1 = unit('a'); resolveTurn(a1, r1, atk({ power: 60 }), rest, seq([0, 0.5]), { turn: 1 });
  ok(r1.res.thorn === 1 && r1.res.water > 0 && a1.eff.shock, `붙어서 맞음 = 가시 +1 · 물 저장 · 때린 쪽 감전 (물 ${r1.res.water})`);
  const full = R(), part = R({ hp: 299 }); resolveTurn(unit('a'), full, atk({ power: 60, ranged: true }), rest, seq([0, 0.5]), { turn: 1 }); resolveTurn(unit('a'), part, atk({ power: 60, ranged: true }), rest, seq([0, 0.5]), { turn: 1 });
  ok(300 - full.hp < (299 - part.hp) * 0.6, `체력 가득이면 받는 피해 절반(${300 - full.hp} 대 ${299 - part.hp})`);
  const th = R(); resolveTurn(unit('a'), th, atk({ power: 10 }), rest, seq([0, 0.5]), { turn: 1 }); th.res.thorn = 5;
  const at = unit('a'); resolveTurn(at, th, atk({ power: 60 }), rest, seq([0, 0.5]), { turn: 2 });
  ok(at.hp < 300, `가시 5 = 반사 50%(때린 쪽 체력 ${at.hp})`);
  const hf = R({ hp: 160 }); resolveTurn(unit('a'), hf, atk({ power: 60, ranged: true }), rest, seq([0, 0.5]), { turn: 1 });
  ok(hf.eff.atkUp, '처음 절반 아래 = 분노(활력 한 겹)');
  ok(resLine(R({ res: { thorn: 2, water: 7 } })) === '가시 2 · 물 7', '개수 글');
  delete SPECIES.__r;
  // 경기장: 비 = 물 +25% · 불 −25% · 화상 꺼짐 / 바람길 = 바람 연타 +1타 / 끝나면 걷힘
  const F = {}, w1 = unit('d'), w0 = unit('d');
  resolveTurn(unit('a'), unit('d'), { id: 'rain', act: 'buff', cost: 0, field: { id: 'rain', turns: 2 } }, rest, seq([0, 0.5]), { turn: 1, field: F });
  ok(F.id === 'rain' && F.exp === 2, '비 = 2턴');
  resolveTurn(unit('a'), w1, atk({ power: 60, el: 'water' }), rest, seq([0, 0.5]), { turn: 2, field: F }); resolveTurn(unit('a'), w0, atk({ power: 60, el: 'water' }), rest, seq([0, 0.5]), { turn: 2 });
  ok(300 - w1.hp > (300 - w0.hp) * 1.15, `비에 물 기술 ↑(${300 - w1.hp} 대 ${300 - w0.hp})`);
  const bu = unit('d', { eff: { burn: { left: 3 } } }), fe = resolveTurn(unit('a'), bu, rest, rest, seq([0.5]), { turn: 2, field: F });
  ok(!bu.eff.burn && fe.events.some(e => e.t === 'cure'), '비 = 화상 꺼짐');
  const gone = resolveTurn(unit('a'), unit('d'), rest, rest, seq([0.5]), { turn: 3, field: F });
  ok(!F.id && gone.events.some(e => e.t === 'field' && e.id === null), '끝나면 걷힘');
  const W = { id: 'wind', exp: 9 }, wr = resolveTurn(unit('a'), unit('d'), atk({ power: 20, hits: 3, el: 'wind' }), rest, seq([0, 0.5]), { turn: 1, field: W });
  ok(hits(wr.events).length === 4, '바람길 = 바람 연타 +1타');
  // 2턴: 모으는 턴 은신 → 다음 차례 고른 기술 대신 나감 · 고른 기술 햇빛 돌려받음
  const dv = unit('a', { energy: 3 }), dd = unit('d');
  const c1 = resolveTurn(dv, dd, { id: 'dive', name: '자맥질', act: 'buff', cost: 0, charge: { veil: true, release: { power: 80, name: '솟구치기' } } }, atk({ power: 60 }), seq([0, 0.5, 0.5, 0.5]), { turn: 1 });
  ok(dv.st.charge && c1.events.some(e => e.t === 'charge'), '모으기 = 다음 차례 예약');
  dv.energy = 1; const c2 = resolveTurn(dv, dd, atk({ id: 'other', power: 10, cost: 2 }), rest, seq([0, 0.5]), { turn: 2 });
  ok(!dv.st.charge && hits(c2.events)[0].id === 'dive' && dv.energy === 3, '다음 차례 = 모은 기술이 나감 · 고른 기술 햇빛 돌려받음');
}

// ── 페탈로즈 장미 기사(2026-10-18 사용자 설계) — 순서 분기 · 공격하며 막기 · 막으면 기절 · 상대 상태로 공격 바꾸기 · 속성 바꾸기 · 만개 ──
{
  // 설계안을 여기 그대로(2026-10-18 사용자 "되돌려줘 — 새 스킬은 한 번에 적용 · 다듬고 · 밸런스 뒤 올리자" → 게임 표엔 아직 안 넣음, 장치만 시험)
  const SW = { tag: 'sword', contact: true }, A = (id, power, cost, o) => ({ id, el: 'grass', power, cost, act: power > 0 ? 'attack' : 'buff', ...o });
  const P = {
    u_petal_1: A('u_petal_1', 50, 1, { ...SW, onFirst: { pierce: 0.3, guardWith: true, guardHits: 1, guardDefMult: 2 }, onSecond: { power: 40, guardWith: true, guardHits: 1, guardDefMult: 3, counterPct: 0.3 } }),
    u_petal_2: A('u_petal_2', 22, 2, { ...SW, hits: 3, onFirst: { evadeWith: true, shift: { miss: 10, graze: 6 } }, onSecond: { evadeWith: true, shift: { miss: 15, graze: 10 }, nextCrit: 50 } }),
    u_petal_2b: A('u_petal_2b', 0, 1, { onFirst: { self: 'wall' }, onSecond: { self: 'haste' } }),
    u_petal_3: A('u_petal_3', 28, 4, { ...SW, strikes: [{}, {}, { pierce: 0.3 }, { pierce: 0.3 }], onFirst: { self: 'thorns' }, onSecond: { guardWith: true, guardHits: 1, guardDefMult: 2, onBlock: { stun: 0.4 }, ifFoe: { has: 'stun', then: { power: 120, strikes: null, hits: 1, pierce: 0.5 } } } }),
    u_petal_3b: A('u_petal_3b', 0, 1, { infuse: { el: 'fire', n: 2, tag: 'sword' } }),
    u_petal_3c: A('u_petal_3c', 0, 2, { self: 'flourish' }),
  };
  const knight = o => unit('k', { key: 'flower_grass', ...o }), foeAtk = atk({ id: 'f', power: 60 });
  // 기본: 먼저 = 찌르기 + 그 턴 방어(상대 공격이 막힘) / 나중 = 막고 반격 + 베기
  const r1 = resolveTurn(knight({ spd: 99 }), unit('d'), P.u_petal_1, foeAtk, seq([0, 0.5, 0.5]), { turn: 1 });
  const h1 = hits(r1.events), mine1 = h1.find(h => h.who === 'k'), theirs1 = h1.find(h => h.who === 'd');
  ok(r1.first === 'k' && mine1 && theirs1 && theirs1.guard, '검방술(기본) 먼저 = 찌르고 상대 공격을 막음');
  const r2 = resolveTurn(knight({ spd: 1 }), unit('d', { spd: 99 }), P.u_petal_1, foeAtk, seq([0.99, 0.5, 0.5]), { turn: 1 });
  ok(r2.first === 'd' && hits(r2.events)[0].guard && r2.events.some(e => e.t === 'counter') && hits(r2.events).some(h => h.who === 'k'), '검방술(기본) 나중 = 막고 반격 + 베기');
  // 공세: 3연타 + 회피
  const r3 = resolveTurn(knight({ spd: 99 }), unit('d'), P.u_petal_2, foeAtk, seq([0, 0.5]), { turn: 1 });
  ok(hits(r3.events).filter(h => h.who === 'k').length === 3 && hits(r3.events).find(h => h.who === 'd').evade, '검방술(공세) = 3연타 + 그 턴 회피');
  // 기합: 먼저 = 철벽 · 나중 = 가속
  const k1 = knight({ spd: 99 }), k2 = knight({ spd: 1 });
  resolveTurn(k1, unit('d'), P.u_petal_2b, rest, seq([0, 0.5]), { turn: 1 }); resolveTurn(k2, unit('d', { spd: 99 }), P.u_petal_2b, rest, seq([0.99, 0.5]), { turn: 1 });
  ok(has(k1, 'wall') && !has(k1, 'haste') && has(k2, 'haste'), '기합 = 먼저 철벽 · 나중 가속');
  // 오의 나중: 막으면 기절(굴림 0.1 < 40%) → 기절이면 찌르기 한 방(120)
  const r4 = resolveTurn(knight({ spd: 1 }), unit('d', { spd: 99 }), P.u_petal_3, foeAtk, seq([0.99, 0.5, 0.1, 0.5]), { turn: 1 });
  const k4 = hits(r4.events).filter(h => h.who === 'k');
  ok(r4.events.some(e => e.t === 'fx' && e.id === 'stun') && k4.length === 1 && k4[0].dmg > 80, `검방술(오의) 나중 = 막아 기절 → 찌르기 한 방(${k4.map(h => h.dmg)})`);
  const r5 = resolveTurn(knight({ spd: 99 }), unit('d'), P.u_petal_3, foeAtk, seq([0, 0.5]), { turn: 1 });
  ok(hits(r5.events).filter(h => h.who === 'k').length === 4, '검방술(오의) 먼저 = 베기 2 · 찌르기 2');
  // 불타는 의지: 다음 검방술 2번 = 불
  const kf = knight({ spd: 99 });
  resolveTurn(kf, unit('d'), P.u_petal_3b, rest, seq([0, 0.5]), { turn: 1 });
  const fires = [2, 3, 4].map(t => { const d = unit('d', { el: 'grass' }); resolveTurn(kf, d, P.u_petal_1, rest, seq([0, 0.5]), { turn: t }); return kf.curEl; });
  ok(fires[0] === 'fire' && fires[1] === 'fire' && !kf.st.infuse, `불타는 의지 = 다음 검방술 두 번 불(${fires})`);
  // 만개(2026-10-23 엑셀 v10 — 독립 상태 없이 공통 강화로): 쓸 때마다 활력 · 억셈 · 가속 +5% 한 겹씩(상한 없음 · 겹마다 지금 5턴)
  const kb = knight();
  for (let t = 1; t <= 6; t++) resolveTurn(kb, unit('d'), P.u_petal_3c, rest, seq([0, 0.5]), { turn: t });
  ok(kb.eff.atkUp.n === 6 && kb.eff.defUp.n === 6 && kb.eff.spdUp.n === 6 && Math.abs(atkK(kb) - 1.3) < 1e-9 && !kb.eff.flourish, '만개 = 활력 · 억셈 · 가속 +5% 한 겹씩');
}

console.log(`장치 시험 ${pass}/${pass + fails.length}`);
if (fails.length) { for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
