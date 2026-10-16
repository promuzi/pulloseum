// 전투 끝 · 순서 점검(화면 없이) — 1:1 · 3:3 판을 많이 돌려 이상한 경우를 셈(2026-10-16 사용자 "동시에 죽거나 판정의 순서 등 오류가 있는지 봐줘")
//  규칙: 누가 쓰러지면 그 턴의 남은 행동은 없음 · 1:1은 그 자리에서 판이 끝남(턴 끝 피해도 없음) · 먼저 쓰러진 쪽이 진다 · 쓰러진 식물의 가시는 반사하지 않음
//  ① 둘 다 쓰러짐(1:1) · 양쪽 마지막 식물이 같이 쓰러짐(3:3) ② 쓰러진 식물이 그 뒤에 움직이거나 · 맞거나 · 턴 끝 피해를 받음
//  ③ 승패가 '먼저 쓰러진 쪽이 진다'와 다름 ④ 쓰러짐 사건이 쓰러진 수와 다름(빠짐 · 겹침) ⑤ 체력 · 에너지 범위 밖
//  ⑥ 3:3: 쓰러진 식물이 앞에 남은 채 다음 턴 · 들어온 식물이 쓰러진 식물 · 끝났는데 살아 있는 식물이 남음
//   node tools/test/edgecases.mjs [--games 600]
import { makeUnit, makeBattle, playTurn, REST } from '../../v2/src/battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats } from '../../v2/src/battle/team.js';
import { makeRng } from '../../v2/src/battle/rules.js';
import { apply, canUse, canSwitch, mustSkip } from '../../v2/src/battle/status.js';
import { SPECIES } from '../../v2/src/data/mock.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? +process.argv[i + 1] : d; };
const GAMES = arg('games', 600);
const KEYS = Object.keys(SPECIES).filter(k => SPECIES[k] && SPECIES[k].el);
const bad = {}, seen = {}, sample = {};
const flag = (k, msg) => { bad[k] = (bad[k] || 0) + 1; if (!sample[k]) sample[k] = msg; };
const count = k => { seen[k] = (seen[k] || 0) + 1; };
const mk = (id, k, hpK) => { const s = protoStats(SPECIES[k]); return makeUnit(id, SPECIES[k], { key: k, ...s, hp: Math.max(8, Math.round(s.hp * hpK)) }); };
// 판을 짧게 끝내려고 체력을 줄이고, 지속 피해(화상 · 독 · 포자)를 미리 걸어 '턴 끝에 같이 쓰러짐'이 자주 나오게
const DOTS = [['burn', 1], ['poison', 2], ['poison', 4], ['spore', 2]];
function preDots(u, by, r) { for (const [id, n] of DOTS) if (r() < 0.3) apply(u, id, n, { turn: 0, rng: r, ev: [], by }); }

// 사건을 따라 체력을 다시 세며 '쓰러진 뒤의 일'을 찾음(side → 지금 앞 식물의 체력)
const DMG = { hit: 'to', counter: 'to', reflect: 'to', tick: 'who', bloom: 'who', drain: 'who' };
const HEAL = { heal: 'who', regen: 'who' };
function trace(evs, hp, tag) {
  const down = [];   // 쓰러진 차례(side)
  const isDown = s => hp[s] != null && hp[s] <= 0;
  for (const e of evs) {
    if (e.t === 'switch') { hp[e.who] = e.hp; continue; }
    if (e.t === 'faint') { if (!isDown(e.who)) flag('faint_alive', `${tag} 살아 있는데 쓰러짐 사건 ${e.who}`); continue; }
    const actor = e.t === 'hit' || e.t === 'stance' || e.t === 'cast' || e.t === 'act' ? e.who : null;
    if (actor && isDown(actor)) flag('dead_acts', `${tag} 쓰러진 ${actor} 가 ${e.t}`);
    if (e.t === 'hit' && isDown(e.to)) flag('hit_dead', `${tag} 쓰러진 ${e.to} 를 때림`);
    if ((e.t === 'tick' || e.t === 'bloom' || e.t === 'drain' || e.t === 'regen') && isDown(e.who)) flag('dead_ticks', `${tag} 쓰러진 ${e.who} 에 ${e.t}`);
    if ((e.t === 'fx' || e.t === 'cure') && e.to && isDown(e.to)) flag('fx_dead', `${tag} 쓰러진 ${e.to} 에 효과 ${e.id}`);
    const ds = DMG[e.t], hs = HEAL[e.t];
    if (ds && e[ds] in hp) { const s = e[ds], was = hp[s]; hp[s] = Math.max(0, hp[s] - (e.dmg || 0)); if (was > 0 && hp[s] <= 0) down.push(s); }
    if (e.t === 'drain' && e.to && e.heal) hp[e.to] += e.heal;
    if (hs && e[hs] in hp) hp[e[hs]] += e.heal || 0;
  }
  return down;
}

// ── 1:1 ──
for (let g = 0; g < GAMES; g++) {
  const r = makeRng(9000 + g), pick = a => a[Math.floor(r() * a.length)];
  const ka = pick(KEYS), kb = pick(KEYS), me = mk('me', ka, 0.35 + r() * 0.4), foe = mk('foe', kb, 0.35 + r() * 0.4);
  preDots(me, foe, r); preDots(foe, me, r);
  const B = makeBattle({ me, foe, seed: 777 + g });
  for (let n = 0; n < 80 && !B.over; n++) {
    const ok = B.me.kit.filter(s => canUse(B.me, s)), sk = mustSkip(B.me) ? REST : pick(ok);
    const hp = { me: B.me.hp, foe: B.foe.hp }, tag = `1:1 #${g} ${ka}↔${kb} 턴${B.turn}`;
    const turn = playTurn(B, sk);
    const down = trace(turn.events, hp, tag);
    for (const s of ['me', 'foe']) if (Math.abs(hp[s] - B[s].hp) > 0) flag('hp_mismatch', `${tag} 사건으로 센 체력 ${s} ${hp[s]} ≠ 실제 ${B[s].hp}`);
    const faints = turn.events.filter(e => e.t === 'faint').map(e => e.who), dead = ['me', 'foe'].filter(s => B[s].hp <= 0);
    if (dead.length === 2) { flag('double_ko', `${tag} 둘 다 쓰러짐 → ${B.over}`); count('double_' + B.over); }
    if (dead.length) {
      count('ko');
      if (!B.over) flag('no_over', `${tag} 쓰러졌는데 판이 안 끝남`);
      const first = down[0] || dead[0];
      if (B.over !== (first === 'foe' ? 'win' : 'lose')) flag('order_win', `${tag} 먼저 쓰러진 ${first} 인데 ${B.over}`);
      if (faints.length !== dead.length || faints.some(s => !dead.includes(s))) flag('faint_events', `${tag} 쓰러짐 사건 [${faints}] · 실제 [${dead}]`);
    } else if (B.over) flag('over_alive', `${tag} 둘 다 살았는데 ${B.over}`);
    for (const s of ['me', 'foe']) { const u = B[s]; if (u.hp < 0 || u.hp > u.max) flag('hp_range', `${tag} ${s} 체력 ${u.hp}/${u.max}`); if (u.energy < 0 || u.energy > u.energyMax) flag('energy_range', `${tag} ${s} 에너지 ${u.energy}`); }
  }
}

// ── 3:3 ──
for (let g = 0; g < GAMES; g++) {
  const r = makeRng(5000 + g), pick = a => a[Math.floor(r() * a.length)];
  const team = id => [0, 1, 2].map(() => mk(id, pick(KEYS), 0.3 + r() * 0.4));
  const me = team('me'), foe = team('foe');
  for (const u of me) preDots(u, foe[0], r); for (const u of foe) preDots(u, me[0], r);
  const B = makeTeamBattle({ me, foe, seed: 333 + g });
  const fainted = new Set(), faintEv = [];
  for (let n = 0; n < 120 && !B.over; n++) {
    const tag = `3:3 #${g} 턴${B.turn}`;
    if (B.need === 'me') {
      if (B.me.hp > 0) flag('need_alive', `${tag} 앞 식물이 살았는데 교체 요구`);
      const to = pick(aliveOf(B, 'me'));
      const e = sendIn(B, to); if (B.me.hp <= 0) flag('send_dead', `${tag} 쓰러진 식물을 내보냄`);
      continue;
    }
    if (B.me.hp <= 0) flag('dead_front', `${tag} 내 앞 식물이 쓰러진 채 턴(need 없음)`);
    if (B.foe.hp <= 0) flag('dead_front', `${tag} 상대 앞 식물이 쓰러진 채 턴`);
    const bench = aliveOf(B, 'me').filter(i => i !== B.act.me), ok = B.me.kit.filter(s => canUse(B.me, s));
    const act = mustSkip(B.me) ? { kind: 'rest' } : bench.length && canSwitch(B.me) && r() < 0.15 ? { kind: 'switch', to: pick(bench) } : { kind: 'skill', skill: pick(ok) };
    const hp = { me: B.me.hp, foe: B.foe.hp };
    const units = { me: B.team.me.map(u => u.hp), foe: B.team.foe.map(u => u.hp) };
    const turn = playTurn3(B, act);
    trace(turn.events, hp, tag);
    for (const e of turn.events) if (e.t === 'faint') faintEv.push(e.who + ':' + (e.idx ?? '?'));
    // 이번 턴에 0이 된 식물(팀 단위)
    for (const s of ['me', 'foe']) B.team[s].forEach((u, i) => { if (units[s][i] > 0 && u.hp <= 0) fainted.add(s + ':' + i); });
    const outMe = !aliveOf(B, 'me').length, outFoe = !aliveOf(B, 'foe').length;
    if (outMe && outFoe) { flag('double_out', `${tag} 양쪽 마지막 식물이 같이 쓰러짐 → ${B.over}`); count('double3_' + B.over); }
    if ((outMe || outFoe) && !B.over) flag('no_over', `${tag} 한쪽이 다 쓰러졌는데 판이 안 끝남`);
    if (B.over && !outMe && !outFoe) flag('over_alive', `${tag} 둘 다 남았는데 ${B.over}`);
    if (B.foe.hp <= 0 && !B.over) flag('dead_front', `${tag} 상대 앞 식물이 쓰러진 채 턴 끝`);
    if (B.me.hp <= 0 && !B.over && B.need !== 'me') flag('need_missing', `${tag} 내 앞 식물이 쓰러졌는데 교체 요구 없음`);
    for (const s of ['me', 'foe']) { if (B.pool[s] < 0 || B.pool[s] > 8) flag('energy_range', `${tag} ${s} 팀 에너지 ${B.pool[s]}`); for (const u of B.team[s]) if (u.hp < 0 || u.hp > u.max) flag('hp_range', `${tag} ${s} 체력 ${u.hp}`); }
  }
  // 쓰러진 식물마다 쓰러짐 사건이 하나씩(팀 번호까지는 사건에 없을 수 있어 수만 비교)
  const nEv = faintEv.length, nDead = fainted.size;
  if (nEv !== nDead) flag('faint_count3', `3:3 #${g} 쓰러짐 사건 ${nEv} · 실제 쓰러진 식물 ${nDead}`);
  if (B.over) count('over3');
}

const keys = Object.keys(bad);
console.log(`1:1·3:3 각 ${GAMES}판 — 1:1 쓰러짐 ${seen.ko || 0}번, 3:3 끝난 판 ${seen.over3 || 0}`);
for (const k of ['double_win', 'double_lose', 'double3_win', 'double3_lose']) if (seen[k]) console.log(`  ${k}: ${seen[k]}`);
if (!keys.length) console.log('이상 없음');
for (const k of keys) console.log(`이상 ${k}: ${bad[k]}번 — 예) ${sample[k]}`);
process.exit(keys.length ? 1 : 0);
