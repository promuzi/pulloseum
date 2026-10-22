// 3:3 교체전 계산 시험(화면 없이): 같은 씨앗 → 같은 결과 · 교체·쓰러짐·다음 식물·끝 · 기력 공유 · 승률 대략
//   node tools/test/team3v3.mjs
import { makeUnit } from '../../v2/src/battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats, swapWait } from '../../v2/src/battle/team.js';
const SP = { flower_grass: { name: '페탈로즈', type: 'flower', el: 'grass' }, cactus_fire: { name: '엠버캑터', type: 'cactus', el: 'fire' }, vine_water: { name: '타이드바인', type: 'vine', el: 'water' }, gaia: { name: '가이아록', type: 'cactus', el: 'earth' }, flower_wind: { name: '윈드페탈', type: 'flower', el: 'wind' } };
const mk = (id, k) => makeUnit(id, SP[k], { key: k, ...protoStats(SP[k]) });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
function run(seed, policy) {
  const B = makeTeamBattle({ me: ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe: ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)), seed });
  const trace = [];
  for (let n = 0; n < 80 && !B.over; n++) {
    if (B.need === 'me') { const nx = aliveOf(B, 'me')[0]; trace.push('send' + nx); sendIn(B, nx); continue; }
    const t = playTurn3(B, policy(B, n));
    trace.push(t.events.map(e => e.t + (e.t === 'hit' ? ':' + e.dmg : e.t === 'switch' ? ':' + e.who + e.to : '')).join(','));
    ok(B.pool.me >= 0 && B.pool.me <= 8 && B.pool.foe >= 0 && B.pool.foe <= 8, '기력 범위');
    ok(B.me === B.team.me[B.act.me] && B.foe === B.team.foe[B.act.foe], '앞에 선 식물');
  }
  return { over: B.over, turns: B.turn - 1, alive: { me: aliveOf(B, 'me').length, foe: aliveOf(B, 'foe').length }, trace };
}
const pol = (B, n) => (n === 2 && aliveOf(B, 'me').length > 1
  ? { kind: 'switch', to: aliveOf(B, 'me').find(i => i !== B.act.me) }
  : { kind: 'skill', skill: B.me.kit.filter(s => (s.cost || 0) <= B.me.energy && s.act === 'attack').pop() });
const a = run(7, pol), b = run(7, pol);
ok(JSON.stringify(a) === JSON.stringify(b), '같은 씨앗 → 같은 결과');
ok(a.over === 'win' || a.over === 'lose', '판이 끝남');
ok(a.trace[2].startsWith('switch:me'), '내 교체가 그 턴 맨 앞');
ok(a.alive.me === 0 || a.alive.foe === 0, '한쪽 셋 다 쓰러짐');
let w = 0, sw = 0, turns = 0;
for (let s = 1; s <= 200; s++) { const r = run(s, pol); if (r.over === 'win') w++; turns += r.turns; if (r.trace.some(x => x.includes('switch:foe'))) sw++; }
console.log(`씨앗 7: ${a.over} · ${a.turns}턴 · 남은 ${JSON.stringify(a.alive)}`);
console.log(a.trace.slice(0, 5).join('\n'));
console.log(`200판: 내 승률 ${w / 2}% · 평균 ${(turns / 200).toFixed(1)}턴 · 봇이 교체한 판 ${sw / 2}%`);
// 교체 제한(2026-10-18 사용자 "스스로 교체하면 2턴 동안 다시 교체 못 함"): 바꾼 다음 두 턴은 교체가 막혀 기술로 · 셋째 턴엔 다시 · 쓰러져 채우기는 상관없음 · 옛 판(제한 0)은 그대로
{
  const C = makeTeamBattle({ me: ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe: ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)), seed: 11, swapCd: 2 });
  for (const u of [...C.team.me, ...C.team.foe]) { u.hp = u.max = 9999; }   // 쓰러지지 않게(교체만 봄)
  const guard = C.me.kit.find(k => k.id === 'guard') || C.me.kit[0];
  playTurn3(C, { kind: 'switch', to: 1 });
  ok(C.act.me === 1 && swapWait(C, 'me') === 2, '1턴: 교체 → 남은 2턴: ' + swapWait(C, 'me'));
  playTurn3(C, { kind: 'switch', to: 2 });
  ok(C.act.me === 1 && swapWait(C, 'me') === 1, '2턴: 교체 막힘(그대로 1번) · 남은 1턴');
  playTurn3(C, { kind: 'switch', to: 2 });
  ok(C.act.me === 1 && swapWait(C, 'me') === 0, '3턴: 아직 막힘 · 이제 0');
  playTurn3(C, { kind: 'switch', to: 2 });
  ok(C.act.me === 2, '4턴: 다시 교체됨');
  const D = makeTeamBattle({ me: ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe: ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)), seed: 11 });
  playTurn3(D, { kind: 'switch', to: 1 }); playTurn3(D, { kind: 'switch', to: 2 });
  ok(D.act.me === 2, '제한 없는 옛 판 = 바로 다시 교체(이어 하는 판 그대로)');
  const E = makeTeamBattle({ me: ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe: ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)), seed: 11, swapCd: 2 });
  E.me.hp = 0; E.need = 'me'; sendIn(E, 1);
  ok(E.act.me === 1 && swapWait(E, 'me') === 0, '쓰러져 채우기 = 제한 없음');
  void guard;
}
// 교체 순서(2026-10-18 사용자 "선공후공에 따라 맞고 바뀔지 바뀌고 맞을지"): swOrder 판 = 먼저면 바꾼 뒤 들어온 식물이 맞음 · 늦으면 지금 식물이 맞고 바뀜 · 늦다가 쓰러지면 교체 없음(제한도 없음)
{
  const team = side => (side === 'me' ? ['flower_grass', 'cactus_fire', 'vine_water'] : ['vine_water', 'gaia', 'flower_wind']).map(k => mk(side, k));
  let early = 0, lateN = 0, lateKo = 0, both = 0, bad = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const B = makeTeamBattle({ me: team('me'), foe: team('foe'), seed, swapCd: 2, swOrder: true }), old = B.me, nu = B.team.me[1];
    if (seed % 5 === 0) old.hp = 3;   // 늦으면 맞고 쓰러지는 경우도
    const t = playTurn3(B, { kind: 'switch', to: 1 }), ev = t.events;
    const fe = ev.find(e => e.t === 'first'), si = ev.findIndex(e => e.t === 'switch' && e.who === 'me' && !e.forced), hi = ev.findIndex(e => e.t === 'hit' && e.who === 'foe' && e.to === 'me');
    if (!fe || !fe.swap) { bad++; continue; }
    if (t.foeSwitch != null) { both++; if (si < 0 || hi >= 0) bad++; continue; }   // 둘 다 바꾸면 맞는 일 없음
    if (fe.who === 'me') { early++; if (si < 0 || (hi >= 0 && (hi < si || ev[hi].tgtKey !== nu.key))) bad++; if (old.hp !== (seed % 5 === 0 ? 3 : old.max)) bad++; }
    else if (old.hp <= 0) { lateKo++; if (si >= 0 || B.act.me !== 0 || swapWait(B, 'me') !== 0 || B.need !== 'me') bad++; }
    else { lateN++; if (hi >= 0 && (si < hi || ev[hi].tgtKey !== old.key)) bad++; if (si < 0 && !ev.some(e => e.t === 'swapFail')) bad++; if (si >= 0 && nu.hp !== nu.max) bad++; }
  }
  ok(!bad, `교체 순서 어긋남 ${bad}번`);
  ok(early > 20 && lateN > 20 && lateKo > 0, `먼저 바꿈 ${early} · 늦게 바꿈 ${lateN} · 늦다가 쓰러짐 ${lateKo} · 둘 다 ${both} — 경우가 다 나와야 함`);
  const r1 = JSON.stringify(playTurn3(makeTeamBattle({ me: team('me'), foe: team('foe'), seed: 77, swOrder: true }), { kind: 'switch', to: 2 }).events);
  const r2 = JSON.stringify(playTurn3(makeTeamBattle({ me: team('me'), foe: team('foe'), seed: 77, swOrder: true }), { kind: 'switch', to: 2 }).events);
  ok(r1 === r2, '같은 씨앗 → 같은 교체 턴');
  let firstOld = 0;
  for (let seed = 1; seed <= 100; seed++) { const B = makeTeamBattle({ me: team('me'), foe: team('foe'), seed }), ev = playTurn3(B, { kind: 'switch', to: 1 }).events, si = ev.findIndex(e => e.t === 'switch' && e.who === 'me'), hi = ev.findIndex(e => e.t === 'hit' && e.to === 'me'); if (si >= 0 && (hi < 0 || si < hi)) firstOld++; }
  ok(firstOld === 100, `옛 판(swOrder 없음) = 교체가 늘 먼저 (${firstOld}/100)`);
}

// 햇빛 식물마다 따로(ownSun — 2026-10-22, 사용자 결정 2026-10-18 "추천대로"): 나와 있는 식물만 턴 끝에 참 · 대기석은 그대로 · 쓴 만큼 그 식물만 줄어듦 · 옛 판(ownSun 없음)은 팀 햇빛 그대로
{
  const B = makeTeamBattle({ me: ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe: ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)), seed: 11, ownSun: true });
  ok(B.ownSun && B.team.me.every(u => u.energy === 2), '식물마다 시작 햇빛 2');
  playTurn3(B, { kind: 'rest' });
  ok(B.team.me[0].energy === 3 && B.team.me[1].energy === 2 && B.team.me[2].energy === 2, '나와 있는 식물만 참(대기석 그대로)');
  if (!B.over && B.need !== 'me') playTurn3(B, { kind: 'switch', to: 1 });
  ok(B.act.me === 1 || B.need === 'me', '교체');
  if (B.act.me === 1) ok(B.team.me[0].energy === 3 && B.team.me[1].energy === 3, '들어간 식물은 그대로 · 들어온 식물이 참');
  const B0 = makeTeamBattle({ me: ['flower_grass', 'cactus_fire', 'vine_water'].map(k => mk('me', k)), foe: ['vine_water', 'gaia', 'flower_wind'].map(k => mk('foe', k)), seed: 11 });
  playTurn3(B0, { kind: 'rest' });
  ok(!B0.ownSun && B0.team.me.every(u => u.energy === B0.pool.me), '옛 판 = 팀 햇빛 하나');
  console.log(`햇빛 식물마다 따로: 쉰 뒤 ${B.team.me.map(u => u.energy).join('·')} (옛 판 팀 햇빛 ${B0.pool.me})`);
}
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
