// 리그 · 시즌 시험(2026-10-16): 단계별 리그 셋(새싹 · 자람 · 무제한) 기록이 따로 · 리그 바꾸기 · 승급 때 시즌 최고 기록 · 시즌 넘김(상자 · 칭호 · 두 단계 내려감)
//   node tools/test/league.mjs
import { newGame, setLeague, leaguesOf, leagueCap, seasonSync, battleReward, ackPending, evolve, evolveLeague, setActive } from '../../v2/src/game/logic.js';
import { LEAGUES, TIERS, SEASON, seasonOf, seasonEnd } from '../../v2/src/game/catalog.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('실패:', m); } };
const t0 = SEASON.epoch + 2 * 864e5, rng = makeRng(5);
const s = newGame({ nickname: '시험', starter: 'flower_grass' }, rng, t0);
ok(s.league === 'sprout' && s.tournament.name === '새싹 브론즈' && s.season && s.season.n === seasonOf(t0), '새 계정 = 새싹 리그 · 이번 시즌');
ok(leagueCap(s) === 0, '새싹 = 어린 식물만');
// 새싹에서 결승까지 3승씩 → 실버 승급
for (let i = 0; i < 15; i++) battleReward(s, { mode: 'tournament', win: true, rng, now: t0 });
ok(s.tournament.tier === '실버' && s.tournament.name === '새싹 실버', '새싹 리그 결승 통과 → 새싹 실버: ' + s.tournament.name);
ok(s.season.best.sprout === 1, '시즌 최고 기록(새싹 = 실버)');
// 리그 바꾸기: 자람은 따로 브론즈부터, 돌아오면 새싹 실버 그대로
setLeague(s, 'growing');
ok(s.league === 'growing' && s.tournament.tier === '브론즈' && s.tournament.name === '자람 브론즈' && leagueCap(s) === 1, '자람 리그 = 따로 브론즈');
for (let i = 0; i < 2; i++) battleReward(s, { mode: 'tournament', win: true, rng, now: t0 });
setLeague(s, 'sprout');
ok(s.tournament.tier === '실버' && leaguesOf(s).growing.wins === 2, '새싹으로 돌아옴 = 실버 그대로 · 자람 2승은 보관');
// 시즌 넘김: 상자(리그마다 최고 단계) · 두 단계 내려감
const credits0 = s.wallet.credits, n0 = s.season.n, t1 = seasonEnd(n0) + 3600e3;
s.leagues.open = { ...s.leagues.open, tier: '골드', name: '무제한 골드' }; s.season.best.open = 2;
seasonSync(s, t1);
const box = s.pending.find(x => x.kind === 'season');
ok(box && box.n === n0 && box.best.sprout === 1 && box.best.open === 2 && s.wallet.credits > credits0, '시즌 마감 상자(지난 시즌 · 리그마다 최고)');
ok(box && box.title === '골드 재배사' && s.titles.includes('골드 재배사'), '골드부터 칭호');
ok(s.season.n === n0 + 1 && s.tournament.tier === '브론즈' && s.leagues.open.tier === '브론즈' && s.tournament.round === '예선', '새 시즌 = 두 단계 내려가 예선부터(실버 → 브론즈 · 골드 → 브론즈)');
seasonSync(s, t1 + 60e3);
ok(s.pending.filter(x => x.kind === 'season').length === 1, '같은 시즌엔 상자 한 번만');
ackPending(s, 9);
// 옛 세이브(리그 없음)도 그대로 이어짐
const old = newGame({ nickname: '옛', starter: 'aqua' }, rng, t0); delete old.leagues; delete old.league; delete old.season; old.tournament = { tier: '골드', name: '새싹 골드', round: '8강', wins: 1, losses: 0, bestOf: 5, pts: 0 };
seasonSync(old, t0);
ok(old.league === 'sprout' && old.tournament.tier === '골드' && old.leagues.sprout.tier === '골드' && old.season.best.sprout === 2, '옛 세이브 = 새싹 리그로 이어받음');
// 진화하면 리그 따라가기(2026-10-17): 고른 식물이 상한을 넘으면 그 단계 리그 · 떠나는 리그의 이번 판은 처음부터 · 진행 중이었는지 알려 줌
{
  const e = newGame({ nickname: '진화', starter: 'flower_grass' }, rng, t0), p = e.plants[0];
  leaguesOf(e); battleReward(e, { mode: 'tournament', win: true, rng, now: t0 }); battleReward(e, { mode: 'tournament', win: false, rng, now: t0 });
  p.lv = 6; const q2 = evolveLeague(e, p);
  ok(q2 && q2.from === 'sprout' && q2.to === 'growing' && q2.had, '진화 전 = 새싹 → 자람 · 진행 중(1승 1패) 알림');
  const r = evolve(e, p.uid, rng);
  ok(r.league && r.league.to === 'growing' && r.league.kept && e.league === 'growing', '진화 = 자람 리그로');
  ok(e.leagues.sprout.round === '예선' && e.leagues.sprout.wins === 1 && e.leagues.sprout.losses === 1 && e.leagues.sprout.tier === '브론즈', '떠난 새싹 리그 = 기록 그대로 보관(2026-10-18 — 전엔 처음부터)');
  p.lv = 6; const r2 = evolve(e, p.uid, rng);
  ok(r2.league && r2.league.to === 'open' && !r2.league.reset && e.league === 'open', '다 자람 = 무제한 · 진행 없음이면 reset false');
  // 고른 식물이 아니면 리그 그대로
  const f = newGame({ nickname: '둘', starter: 'aqua' }, rng, t0);
  f.plants.push({ ...JSON.parse(JSON.stringify(f.plants[0])), uid: 'x2', lv: 6, stage: 0 }); setActive(f, 0); leaguesOf(f);
  ok(evolveLeague(f, f.plants[1]) === null && !evolve(f, 'x2', rng).league && f.league === 'sprout', '고른 식물이 아니면 리그 그대로');
}
console.log(`시즌 ${n0} 끝 ${new Date(seasonEnd(n0)).toISOString().slice(0, 10)} · 리그 ${Object.values(LEAGUES).map(l => l.name).join(' · ')} · 단계 ${TIERS.length}`);
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
