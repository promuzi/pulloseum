// 전투 엔진 속도·안정성 측정(2026-10-21 조사용 — docs/superpowers/specs/2026-10-21-battle-sim-testing-research.md): 1:1 무작위 대전 · 3:3 무작위 대전 · 매 턴 불변식 · 상태 복사 비용
const R = new URL('../../../v2/src/', import.meta.url).href;
const { newGame, makePlant, evolve, upgrade } = await import(R + 'game/logic.js');
const { unitOf, makeRng } = await import(R + 'game/fight.js');
const { makeBattle, playTurnVs, aiPick } = await import(R + 'battle/model.js');
const { makeTeamBattle, playTurn3, sendIn, aliveOf } = await import(R + 'battle/team.js');
const { mustSkip } = await import(R + 'battle/status.js');
const { SPECIES } = await import(R + 'game/catalog.js');

const N1 = +(process.argv[2] || 2000), N3 = +(process.argv[3] || 500);
const keys = Object.keys(SPECIES);
function plantOf(key, seed, stage = 2, lv = 4) {
  const rng = makeRng(seed), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0);
  s.wallet.credits = 1e7;
  const p = makePlant(s, { key }, rng, 0); s.plants.push(p);
  for (const k of Object.keys(p.ivs)) p.ivs[k] = 5;
  while (p.stage < stage) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = lv; p.pts = (stage * 5 + lv - 1) * 2;
  const order = ['hp', 'atk', 'def', 'spd']; let i = 0; while (p.pts > 0) upgrade(s, p.uid, order[i++ % 4], 1);
  p.cards = [null, null];
  return p;
}
const t0 = Date.now();
const plants = Object.fromEntries(keys.map((k, i) => [k, plantOf(k, 100 + i)]));
const tPlants = Date.now() - t0;
const bad = [];
const inv = (u, where) => {
  const e = [];
  if (!Number.isFinite(u.hp) || u.hp < 0 || u.hp > u.max) e.push(`hp ${u.hp}/${u.max}`);
  if (u.energy !== undefined && (!Number.isFinite(u.energy) || u.energy < 0 || u.energy > (u.energyMax || 8))) e.push(`energy ${u.energy}`);
  if (e.length) bad.push(`${where}: ${u.name} ${e.join(' ')}`);
};
// 1:1
let turns1 = 0, draws1 = 0, errs1 = [], firstWin = 0;
const s1 = Date.now();
for (let g = 0; g < N1; g++) {
  const rng = makeRng(777 + g), a = keys[Math.floor(rng() * keys.length)], b = keys[Math.floor(rng() * keys.length)];
  try {
    const B = makeBattle({ me: unitOf('me', plants[a]), foe: unitOf('foe', plants[b]), seed: 31 + g }), ra = makeRng(g * 3 + 1), rb = makeRng(g * 5 + 2);
    while (!B.over && B.turn <= 80) {
      const t = playTurnVs(B, mustSkip(B.me) ? 'rest' : aiPick(B.me, B.foe, ra), mustSkip(B.foe) ? 'rest' : aiPick(B.foe, B.me, rb));
      inv(B.me, `1v1 g${g} t${t.n}`); inv(B.foe, `1v1 g${g} t${t.n}`);
      if (t.n === 1 && t.first === B.me.id && B.over === 'win') firstWin++;
    }
    turns1 += B.turn - 1; if (!B.over) draws1++;
  } catch (err) { errs1.push(`g${g} ${a} vs ${b}: ${err.message}`); }
}
const ms1 = Date.now() - s1;
// 3:3
let turns3 = 0, draws3 = 0, errs3 = [];
const s3 = Date.now();
for (let g = 0; g < N3; g++) {
  const rng = makeRng(9000 + g), pick = () => keys[Math.floor(rng() * keys.length)];
  const me = [pick(), pick(), pick()], foe = [pick(), pick(), pick()];
  try {
    const B = makeTeamBattle({ me: me.map(k => unitOf('me', plants[k])), foe: foe.map(k => unitOf('foe', plants[k])), seed: 55 + g, swapCd: 2 }), ra = makeRng(g * 7 + 3);
    let n = 0;
    while (!B.over && n++ < 160) {
      if (B.need === 'me') { sendIn(B, aliveOf(B, 'me')[0]); continue; }
      const sk = mustSkip(B.me) ? null : aiPick(B.me, B.foe, ra);
      playTurn3(B, sk ? { kind: 'skill', skill: sk } : { kind: 'skill', skill: B.me.kit[0] });
      if (B.pool && (B.pool.me < 0 || B.pool.me > 8 || B.pool.foe < 0 || B.pool.foe > 8)) bad.push(`3v3 g${g}: pool ${JSON.stringify(B.pool)}`);
      for (const u of [...B.team.me, ...B.team.foe]) if (!Number.isFinite(u.hp) || u.hp < 0 || u.hp > u.max) bad.push(`3v3 g${g}: ${u.name} hp ${u.hp}`);
    }
    turns3 += B.turn - 1; if (!B.over) draws3++;
  } catch (err) { errs3.push(`g${g} ${me}/${foe}: ${err.message}`); }
}
const ms3 = Date.now() - s3;
// 상태 복사 비용(미리 읽는 봇의 바탕): 유닛 둘을 JSON으로 왕복
const B0 = makeBattle({ me: unitOf('me', plants[keys[0]]), foe: unitOf('foe', plants[keys[1]]), seed: 1 });
const sc = Date.now(); let size = 0;
for (let i = 0; i < 20000; i++) { const s = JSON.stringify({ me: B0.me, foe: B0.foe, turn: B0.turn, field: B0.field }); size = s.length; JSON.parse(s); }
const msClone = Date.now() - sc;
console.log(JSON.stringify({
  species: keys.length, plantsMs: tPlants,
  oneVsOne: { games: N1, ms: ms1, perGameMs: +(ms1 / N1).toFixed(3), gamesPerSec: Math.round(N1 / (ms1 / 1000)), avgTurns: +(turns1 / N1).toFixed(1), turnCapDraws: draws1, errors: errs1.length, firstErrors: errs1.slice(0, 5) },
  threeVsThree: { games: N3, ms: ms3, perGameMs: +(ms3 / N3).toFixed(3), gamesPerSec: Math.round(N3 / (ms3 / 1000)), avgTurns: +(turns3 / N3).toFixed(1), capped: draws3, errors: errs3.length, firstErrors: errs3.slice(0, 5) },
  invariantViolations: bad.length, firstViolations: bad.slice(0, 8),
  cloneJsonRoundTripUs: +(msClone * 1000 / 20000).toFixed(1), stateBytes: size,
}, null, 1));
