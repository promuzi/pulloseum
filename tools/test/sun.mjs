// 햇빛 시험(2026-10-18 사용자 "햇빛 — 스탯 강화로 최대 용량과 회복량 · 기본으로 햇빛 채우는 카드"):
//  광합성(기본기) = 그 턴 대신 +2(그릇까지) · 햇빛 그릇 = 단마다 최대 +1(3포인트 · 4단까지) · 햇빛 회복 = 단마다 턴당 반칸 더(4포인트 · 3단 — 1 → 1.5 → 2 → 2.5) · 초기화하면 포인트가 돌아옴
//   node tools/test/sun.mjs
import { newGame, upgrade, resetPoints, plantStats, BASIC_IDS } from '../../v2/src/game/logic.js';
import { unitOf } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, BASICS } from '../../v2/src/battle/model.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const rng = makeRng(3), s = newGame({ nickname: '햇빛', starter: 'flower_grass' }, rng, 0), p = s.plants[0];
ok(BASIC_IDS.includes('sun') && BASICS.some(b => b.id === 'sun' && b.name === '광합성' && b.act === 'sun' && b.cost === 0), '기본기 넷째 = 광합성(햇빛 0)');
ok(p.skills.battle.includes('sun'), '새 식물 전투 칸에 광합성');
// 강화: 포인트 · 상한
s.wallet.credits = 99999; p.pts = 40;
ok(plantStats(p).sunMax === 8 && plantStats(p).sunRegen === 1, '기본 = 최대 8 · 턴마다 1칸');
upgrade(s, p.uid, 'sunMax', 1);
ok(plantStats(p).sunMax === 9 && p.pts === 37 && p.up.sunMax === 3, '햇빛 그릇 1단 = 9칸 · 3포인트');
upgrade(s, p.uid, 'sunMax', 3);
let threw = false; try { upgrade(s, p.uid, 'sunMax', 1); } catch { threw = true; }
ok(plantStats(p).sunMax === 12 && threw, '햇빛 그릇 4단 = 12칸까지');
upgrade(s, p.uid, 'sunRegen', 2);
ok(plantStats(p).sunRegen === 2 && p.up.sunRegen === 8, '햇빛 회복 2단 = 턴마다 2칸 · 4포인트씩');
upgrade(s, p.uid, 'sunRegen', 1);
const u = unitOf('me', p);
ok(u.energyMax === 12 && u.sunPer === 2.5, '전투 유닛 = 그릇 12 · 턴마다 2.5칸');
// 전투: 햇빛 모으기 +2 · 턴 끝 +1 · 3턴째 +1 더
const foe = unitOf('foe', newGame({ nickname: '상대', starter: 'aqua' }, rng, 0).plants[0]);
const B = makeBattle({ me: u, foe, seed: 7 });
const e0 = B.me.energy;
const t1 = playTurnVs(B, 'sun', 'guard');
ok(t1.events.some(e => e.t === 'sun' && e.gain === 2) && B.me.energy === e0 + 2 + 2.5, `광합성 +2 + 턴 끝 +2.5(${e0} → ${B.me.energy})`);
B.me.energy = 1; playTurnVs(B, 'guard', 'guard');
ok(B.me.energy === 3.5, `반칸 = 1 → 3.5(${B.me.energy})`);
B.me.energy = 11; playTurnVs(B, 'sun', 'guard');
ok(B.me.energy === 12, '그릇(12)을 넘지 않음');
// 초기화 = 쓴 포인트 전부 돌아옴(햇빛 포함)
const before = p.pts; resetPoints(s, p.uid);
ok(p.pts === before + 12 + 12 && plantStats(p).sunMax === 8 && plantStats(p).sunRegen === 1, '초기화 = 햇빛 포인트도 돌아옴');
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
