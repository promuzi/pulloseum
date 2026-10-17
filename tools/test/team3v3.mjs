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
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
