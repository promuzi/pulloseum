// 대회 봇 몸 · 수 읽기 · 스마트팜 물 · 비료 하루 상한 시험(2026-10-23 사용자 "실력자체를 올릴 수 없나? 스펙도 각 컨셉에 맞게 … 티어별로 레벨을 조정하고 … 레벨업을 어렵게")
//   node tools/test/botbody.mjs
import { botBody, botPlant, BOT_LV, searchOfTier, setupBot, makeRng } from '../../v2/src/game/fight.js';
import { searchPick, playTurn } from '../../v2/src/battle/model.js';
import { newGame, harvestAll } from '../../v2/src/game/logic.js';
import { LEAGUES, FARM_DAY, SUN_UP } from '../../v2/src/game/catalog.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };

// 1) 봇 몸 = 리그 가장 높은 성장 단계 · 단계별 레벨
for (const [lg, L] of Object.entries(LEAGUES)) for (let t = 0; t < 7; t++) for (let i = 0; i < 20; i++) {
  const b = botBody(makeRng(t * 100 + i + 1), L.cap, t);
  if (b.stage !== L.cap || b.lv < BOT_LV[t][0] || b.lv > BOT_LV[t][1]) { ok(false, `${lg} 단계 ${t}: ${JSON.stringify(b)}`); break; }
}
ok(searchOfTier(0) === 0 && searchOfTier(6) === 24 && searchOfTier(6, true) === 0 && searchOfTier(3) === 12, '수 읽기 = 브론즈 안 함 · 풀로세움 24 · 첫 판(튜토리얼) 안 함');
// 2) 컨셉 스펙: 포인트를 다 씀(햇빛은 단 단위) · 개체값 바닥
for (let t = 0; t < 7; t++) for (let i = 0; i < 30; i++) {
  const r = makeRng(t * 999 + i), b = botBody(r, 2, t), p = botPlant(r, b.stage, b.lv, t, { tier: t, concept: true, ivFloor: true, lvExact: true });
  const pts = (p.stage * 5 + p.lv - 1) * 2, used = Object.values(p.up).reduce((a, v) => a + v, 0);
  if (used !== pts || p.lv !== b.lv || (p.up.sunMax || 0) % SUN_UP.sunMax.pts || (p.up.sunRegen || 0) % SUN_UP.sunRegen.pts) { ok(false, `단계 ${t} 포인트 ${used}/${pts} · ${JSON.stringify(p.up)}`); break; }
  if (t >= 5 && Math.min(p.ivs.hp, p.ivs.atk, p.ivs.def, p.ivs.spd) < 7) { ok(false, `마스터부터 개체값 7 이상: ${JSON.stringify(p.ivs)}`); break; }
}
// 3) 수 읽기: 같은 판이면 같은 답 · 판 난수(B.rng)를 건드리지 않음
{
  const r = makeRng(42), a = botPlant(r, 2, 6, 5, { tier: 5, concept: true }), b = botPlant(r, 2, 6, 5, { tier: 5, concept: true });
  const mk = () => setupBot({ seed: 777, mode: 'tournament', mine: [a], foes: [b], trainer: 't', rank: 'r', ai: 0.9, search: 8 });
  const B1 = mk(), B2 = mk();
  playTurn(B1, B1.me.kit[0]); playTurn(B2, B2.me.kit[0]);
  const c1 = searchPick(B1, 8), c2 = searchPick(B1, 8);
  ok(c1 && c1.id === c2.id, '같은 판 · 같은 턴 = 같은 수: ' + (c1 && c1.id) + ' / ' + (c2 && c2.id));
  ok(B1.rng() === B2.rng(), '수 읽기는 판 난수를 쓰지 않음(다시 세운 판과 같음)');
  const B3 = mk(), B4 = mk();
  for (let i = 0; i < 6 && !B3.over; i++) { playTurn(B3, B3.me.kit[i % 3]); playTurn(B4, B4.me.kit[i % 3]); }
  ok(JSON.stringify([B3.me.hp, B3.foe.hp, B3.turn]) === JSON.stringify([B4.me.hp, B4.foe.hp, B4.turn]), '수 읽기 봇 판도 같은 수면 같은 결과(서버가 다시 세워도 같음)');
}
// 4) 스마트팜 물 · 비료 하루 상한: 열매를 아무리 많이 따도 하루 FARM_DAY 까지 · 다음 날 다시
{
  const t0 = Date.UTC(2026, 9, 23, 3), s = newGame({ nickname: '팜', starter: 'flower_grass' }, makeRng(3), t0), rng = makeRng(9);
  for (let i = 0; i < 11; i++) s.plants.push({ ...JSON.parse(JSON.stringify(s.plants[0])), uid: 'x' + i });
  let now = t0, water = 0, fert = 0, fruits = 0;   // 열매에서 나온 것만 셈(재배사 레벨업 상자의 물 · 비료는 따로)
  for (let k = 0; k < 40; k++) {
    now += 3 * 3600e3 / 40; for (const p of s.plants) p.hv = { have: 4, t0: now };
    const r = harvestAll(s, rng, now); fruits += r.got.length;
    for (const g of r.got) { if (g.kind === 'water') water += g.n; if (g.kind === 'fert') fert += g.n; }
  }
  const day = Math.floor((now + 9 * 3600e3) / 864e5);
  ok(s.farmDay && s.farmDay.day === day && s.farmDay.water === FARM_DAY.water && s.farmDay.fert === FARM_DAY.fert, '하루 상한 기록: ' + JSON.stringify(s.farmDay));
  ok(water === FARM_DAY.water && fert === FARM_DAY.fert, `식물 열둘 · 열매 ${fruits}개여도 열매 물 ${water} · 비료 ${fert}(상한 ${FARM_DAY.water} · ${FARM_DAY.fert}) — 넘은 건 돈`);
  const next = now + 864e5; for (const p of s.plants) p.hv = { have: 4, t0: next };
  harvestAll(s, rng, next);
  ok(s.farmDay.day === day + 1 && s.farmDay.water > 0, '다음 날 = 상한 새로: ' + JSON.stringify(s.farmDay));
}
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
