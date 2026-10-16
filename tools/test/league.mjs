// 리그 · 시즌 시험(2026-10-16): 단계별 리그 셋(새싹 · 자람 · 무제한) 기록이 따로 · 리그 바꾸기 · 승급 때 시즌 최고 기록 · 시즌 넘김(상자 · 칭호 · 두 단계 내려감)
//   node tools/test/league.mjs
import { newGame, setLeague, leaguesOf, leagueCap, seasonSync, battleReward, ackPending } from '../../v2/src/game/logic.js';
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
console.log(`시즌 ${n0} 끝 ${new Date(seasonEnd(n0)).toISOString().slice(0, 10)} · 리그 ${Object.values(LEAGUES).map(l => l.name).join(' · ')} · 단계 ${TIERS.length}`);
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
