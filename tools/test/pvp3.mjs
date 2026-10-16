// 3:3 친구 대결(사람 대 사람) 계산 시험(화면 없이): 무작위 수 · 교체 · 쓰러진 자리 양쪽 채우기로 많이 돌려
//  끝남 · need 일관(쓰러진 쪽만 · 끝나면 없음) · 앞 식물 · 기력 범위 · 쓰러짐 사건 한 번씩 · 같은 씨앗 → 같은 판 · B 쪽 뒤집기
//   node tools/test/pvp3.mjs [판 수 1500]
import { makeUnit } from '../../v2/src/battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats } from '../../v2/src/battle/team.js';
import { canUse, canSwitch } from '../../v2/src/battle/status.js';
import { viewFor, viewOf } from '../../v2/src/game/fight.js';
import { makeRng } from '../../v2/src/battle/rules.js';
const SP = { flower_grass: { name: '페탈로즈', type: 'flower', el: 'grass' }, cactus_fire: { name: '엠버캑터', type: 'cactus', el: 'fire' }, vine_water: { name: '타이드바인', type: 'vine', el: 'water' }, gaia: { name: '가이아록', type: 'cactus', el: 'earth' }, flower_wind: { name: '윈드페탈', type: 'flower', el: 'wind' }, spark: { name: '스파크번', type: 'flower', el: 'bolt' }, spore_cap: { name: '스포어캡', type: 'mushroom', el: 'grass' } };
const KEYS = Object.keys(SP), N = +(process.argv[2] || 1500);
const mk = (id, k, hpK) => { const u = makeUnit(id, SP[k], { key: k, ...protoStats(SP[k]) }); u.hp = u.max = Math.round(u.max * hpK); return u; };
let fails = 0; const bad = [];
const ok = (c, m) => { if (!c) { fails++; if (bad.length < 12) bad.push(m); } };
// 한 사람의 수(무작위): 가끔 교체 · 가끔 넘어감(시간 초과) · 나머지는 쓸 수 있는 기술
function pick(B, side, r) {
  const u = B[side], bench = aliveOf(B, side).filter(i => i !== B.act[side]);
  const x = r();
  if (x < 0.14 && bench.length && canSwitch(u)) return { kind: 'switch', to: bench[Math.floor(r() * bench.length)] };
  if (x < 0.19) return { kind: 'rest' };
  const ks = u.kit.filter(s => canUse(u, s));
  return { kind: 'skill', skill: ks[Math.floor(r() * ks.length)] || u.kit[0] };
}
function run(seed) {
  const r = makeRng(seed * 7 + 1), hpK = 0.45 + r() * 0.6;
  const team = side => [0, 1, 2].map(() => mk(side, KEYS[Math.floor(r() * KEYS.length)], hpK));
  const B = makeTeamBattle({ me: team('me'), foe: team('foe'), seed });
  const trace = [], fainted = { me: new Set(), foe: new Set() };
  let n = 0;
  for (; n < 200 && !B.over; n++) {
    if (B.need) {
      const sides = B.need === 'both' ? (r() < 0.5 ? ['me', 'foe'] : ['foe', 'me']) : [B.need];
      for (const s of sides) {
        ok(B[s].hp <= 0, `need ${s}인데 앞 식물이 살아 있음 (씨앗 ${seed})`);
        const al = aliveOf(B, s);
        ok(al.length > 0, `need ${s}인데 남은 식물 없음 (씨앗 ${seed})`);
        const e = sendIn(B, al[Math.floor(r() * al.length)], s);
        trace.push('send' + s + e.to);
      }
      ok(!B.need, `채운 뒤에도 need 남음 (씨앗 ${seed})`);
      continue;
    }
    const t = playTurn3(B, pick(B, 'me', r), pick(B, 'foe', r));
    trace.push(t.events.map(e => e.t + (e.t === 'hit' ? ':' + e.dmg : e.t === 'switch' ? ':' + e.who + e.to : e.t === 'faint' ? ':' + e.who + e.idx : '')).join(','));
    for (const e of t.events) if (e.t === 'faint') { ok(!fainted[e.who].has(e.idx), `같은 식물이 두 번 쓰러짐 (씨앗 ${seed})`); fainted[e.who].add(e.idx); }
    ok(B.pool.me >= 0 && B.pool.me <= 8 && B.pool.foe >= 0 && B.pool.foe <= 8, `기력 범위 (씨앗 ${seed})`);
    ok(B.me === B.team.me[B.act.me] && B.foe === B.team.foe[B.act.foe], `앞에 선 식물 (씨앗 ${seed})`);
    if (B.over) { ok(!B.need, `끝났는데 need (씨앗 ${seed})`); ok(!aliveOf(B, B.over === 'win' ? 'foe' : 'me').length, `진 쪽에 산 식물 (씨앗 ${seed})`); }
    else {
      const m = B.me.hp <= 0, f = B.foe.hp <= 0, want = m && f ? 'both' : m ? 'me' : f ? 'foe' : null;
      ok(B.need === want, `need 불일치 ${B.need} ≠ ${want} (씨앗 ${seed})`);
    }
    for (const s of ['me', 'foe']) for (const [i, u] of B.team[s].entries()) if (u.hp <= 0) ok(fainted[s].has(i), `쓰러졌는데 사건 없음 ${s}${i} (씨앗 ${seed})`);
  }
  // B 쪽 뒤집기: 팀 · 앞 번호 · 기력 · need · 승패
  const a = viewOf(B), b = viewFor(B, 'b'), SW = { me: 'foe', foe: 'me' };
  ok(b.team.me.length === 3 && b.team.me.every((u, i) => u.id === 'me' && u.hp === a.team.foe[i].hp && u.key === a.team.foe[i].key), `뒤집기 팀 (씨앗 ${seed})`);
  ok(b.act.me === a.act.foe && b.pool.me === a.pool.foe && b.need === (SW[a.need] || a.need), `뒤집기 앞 번호 · 기력 · need (씨앗 ${seed})`);
  ok(!a.over || b.over === (a.over === 'win' ? 'lose' : 'win'), `뒤집기 승패 (씨앗 ${seed})`);
  return { over: B.over, turns: B.turn - 1, steps: n, trace };
}
const x = run(42), y = run(42);
ok(JSON.stringify(x) === JSON.stringify(y), '같은 씨앗 → 같은 판');
let done = 0, long = 0, both = 0, win = 0, turns = 0;
for (let s = 1; s <= N; s++) {
  const r = run(s);
  if (r.over) done++; else long++;
  if (r.over === 'win') win++;
  if (r.trace.some((t, i) => t.startsWith('send') && r.trace[i + 1] && r.trace[i + 1].startsWith('send') && t.slice(4, 6) !== r.trace[i + 1].slice(4, 6))) both++;
  turns += r.turns;
}
console.log(`${N}판: 끝남 ${done} · 200수 넘김 ${long} · 'me' 승 ${(100 * win / Math.max(1, done)).toFixed(1)}% · 평균 ${(turns / N).toFixed(1)}턴 · 둘 다 채운 판 ${both}`);
if (bad.length) console.log(bad.join('\n'));
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
