// 업데이트 안전 · 리그 기록 보관 · 3패 시험(2026-10-18 — docs/superpowers/specs/2026-10-18-v2-species-identity-design.md §5 · §6 · §7)
//  node tools/test/savesafety.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as L from '../../v2/src/game/logic.js';
import { RENAMED, RULES_VER, LV_MAX } from '../../v2/src/game/catalog.js';
import { makeRng } from '../../v2/src/battle/rules.js';
import { openDb } from '../../server/db.mjs';
import { makeGame } from '../../server/game.mjs';
import { makeLog } from '../../server/log.mjs';

let pass = 0;
const fails = [];
const t = (name, fn) => { try { fn(); pass++; } catch (e) { fails.push(`${name}: ${e.message}`); } };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
const NOW = Date.UTC(2026, 9, 18, 3);
const fresh = () => L.newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(7), NOW);

t('새 게임 = 지금 저장 판 번호', () => eq(fresh().ver, L.SAVE_VER, 'ver'));
t('옛 저장 옮기기 · 두 번째는 그대로', () => {
  const s = fresh(); delete s.ver;
  eq(L.migrate(s), 0, '처음 판 번호'); eq(s.ver, L.SAVE_VER, '옮긴 뒤');
  eq(L.migrate(s), L.SAVE_VER, '다시 옮기면 그대로');
});
t('이름 바꾼 기술 · 카드 옮기기(가방은 합침)', () => {
  const s = fresh(), p = s.plants[0];
  RENAMED.skill.zz_old = 'zz_new'; RENAMED.card.cc_old = 'cc_new';
  try {
    p.skills.battle[0] = 'zz_old'; p.cards[1] = 'cc_old'; s.cards.cc_old = 2; s.cards.cc_new = 1;
    const out = L.remapIds(s);
    eq(p.skills.battle[0], 'zz_new', '전투 칸'); eq(p.cards[1], 'cc_new', '패시브 칸');
    eq([s.cards.cc_new, s.cards.cc_old], [3, undefined], '가방'); eq(out.length >= 3, true, '바꾼 목록');
  } finally { delete RENAMED.skill.zz_old; delete RENAMED.card.cc_old; }
});
t('진화로 리그가 바뀌어도 떠나는 리그 기록 보관', () => {
  const s = fresh(), p = s.plants[s.active];
  p.stage = 1; p.lv = LV_MAX;
  L.setLeague(s, 'growing'); Object.assign(s.tournament, { round: '결승', wins: 2, losses: 1 });
  const r = L.evolve(s, p.uid, makeRng(1));
  eq(s.league, 'open', '새 리그'); eq([s.leagues.growing.round, s.leagues.growing.wins, s.leagues.growing.losses], ['결승', 2, 1], '자람 기록');
  eq(r.league && r.league.kept, true, '보관 알림');
});
t('라운드 실패 = 그 대회 끝(예선부터) · 예선 탈락 −10 · 16강 탈락 −5 · 8강부터 감점 없음 · 점수는 단계 바닥 아래로 안 내려감 · 플래티넘부터 7판 4선승(2026-10-23)', () => {
  const s = fresh(), lose = () => L.battleReward(s, { mode: 'tournament', win: false, rng: makeRng(3), now: NOW }), win = () => L.battleReward(s, { mode: 'tournament', win: true, rng: makeRng(3), now: NOW }), T = () => s.tournament;
  Object.assign(T(), { tier: '브론즈', round: '8강', wins: 1, losses: 2, pts: 30 });
  let a = lose(); eq([a.reset, T().round, T().wins, T().losses, T().bestOf, T().pts, a.rankPts], ['cup', '예선', 0, 0, 5, 30, undefined], '브론즈 8강 탈락 = 대회 끝 · 감점 없음');
  Object.assign(T(), { tier: '실버', round: '예선', wins: 0, losses: 2, pts: 105 });
  a = lose(); eq([a.reset, T().pts, a.rankPts, a.divDown], ['cup', 95, -10, '실버 IV'], '예선 탈락 −10 · 칸 내려감(실버 III → IV)');
  Object.assign(T(), { tier: '실버', round: '16강', wins: 1, losses: 2, pts: 3 });
  a = lose(); eq([T().tier, T().pts, a.rankPts], ['실버', 0, -3], '16강 탈락 −5 · 바닥 0(단계는 그대로)');
  Object.assign(T(), { tier: '브론즈', round: '16강', wins: 1, losses: 2, pts: 102 });
  a = lose(); eq([T().tier, T().pts, a.divDown], ['브론즈', 97, '브론즈 IV'], '브론즈도 같은 단계 안에선 칸 내려감(브론즈 III → IV, 2026-10-23 사용자 확인)');
  Object.assign(T(), { tier: '실버', round: '예선', wins: 0, losses: 2, pts: 0 });
  a = lose(); eq([T().tier, T().pts, a.rankPts], ['실버', 0, undefined], '0점에서 예선 탈락 = 그대로');
  Object.assign(T(), { tier: '플래티넘', round: '4강', wins: 2, losses: 2, pts: 0 });
  a = lose(); eq([a.reset, T().losses, T().bestOf], [undefined, 3, 7], '플래티넘 3패 = 아직(7판 4선승)');
  a = lose(); eq([a.reset, T().round], ['cup', '예선'], '플래티넘 4패 = 대회 끝');
  Object.assign(T(), { tier: '골드', round: '8강', wins: 2, losses: 0, pts: 390 });
  a = win(); eq([a.rankPts, a.tierUp, a.divUp, T().tier, T().pts, T().round, T().bestOf], [25, '플래티넘', '플래티넘 IV', '플래티넘', 15, '4강', 7], '8강 통과로 단계가 오르면 대회는 이어서(4강 · 새 단계 판 수)');
  Object.assign(T(), { tier: '플래티넘', round: '결승', wins: 3, losses: 0, pts: 390 });
  a = win(); eq([a.champ, a.rankPts, a.tierUp, a.divUp, T().tier, T().pts, T().round, T().bestOf, a.credits], [true, 45, '다이아', '다이아 IV', '다이아', 35, '예선', 7, 105 + 300], '우승 +45 = 400점 넘어 다음 단계(남는 35점 넘어감) · 칸 보상 크레딧 300');
  Object.assign(T(), { tier: '마스터', round: '4강', wins: 0, losses: 3, pts: 50 });
  const b = L.battleForfeit(s, 'tournament');
  eq([b.reset, T().round, T().pts], ['cup', '예선', 50], '마스터 4강 기권(4패) = 대회 끝 · 감점 없음');
  Object.assign(T(), { tier: '마스터', round: '예선', wins: 0, losses: 3, pts: 50 });
  const c = L.battleForfeit(s, 'tournament');
  eq([c.reset, T().pts, c.rankPts], ['cup', 40, -10], '마스터 예선 기권 = −10');
  Object.assign(T(), { tier: '풀로세움', round: '결승', wins: 3, losses: 0, pts: 0, stars: 0 });
  a = win(); eq([a.champ, T().stars, T().pts, a.rankPts, T().tier], [true, 1, 0, undefined, '풀로세움'], '풀로세움 우승 = 별 하나(점수 없음)');
  Object.assign(T(), { tier: '풀로세움', round: '예선', wins: 0, losses: 3 });
  a = lose(); eq([a.reset, T().pts, a.rankPts], ['cup', 0, undefined], '풀로세움 예선 탈락 = 감점 없음');
});

// ── 서버: 옮기기 직전 원본 보관 · 옛 규칙 판 = 승패 없이 닫힘 ──
const dir = mkdtempSync(join(tmpdir(), 'pullo-safe-'));
try {
  const { db, q } = openDb(join(dir, 't.db'));
  const game = makeGame({ q, log: makeLog(q) });
  game.create(1, { nickname: '시험', starter: 'flower_grass' }, NOW);
  t('옛 저장을 불러오면 원본 하나 보관 후 옮김(두 번째는 보관 안 함)', () => {
    const s = JSON.parse(q.save.get(1).state); delete s.ver; q.putSave.run(1, JSON.stringify(s), NOW);
    eq(game.state(1, NOW).state.ver, L.SAVE_VER, '옮김');
    game.state(1, NOW + 1);
    const list = q.backups.all(1);
    eq(list.length, 1, '보관 수'); eq(list[0].ver, 0, '보관본 판 번호');
    eq(JSON.parse(q.backup.get(list[0].id, 1).state).ver, undefined, '보관본 = 옮기기 전');
  });
  t('보관은 계정마다 최근 3개', () => {
    for (let i = 0; i < 4; i++) { const s = JSON.parse(q.save.get(1).state); delete s.ver; q.putSave.run(1, JSON.stringify(s), NOW); game.state(1, NOW); }
    eq(q.backups.all(1).length, 3, '보관 수');
  });
  t('규칙 판 번호가 다른 판 = 승패 없이 닫고 새 판', () => {
    const st = game.battleStart(1, NOW);
    const b = q.battle.get(st.id, 1), sp = JSON.parse(b.spec);
    eq(sp.rv, RULES_VER, '새 판 번호');
    sp.rv = RULES_VER + 1; db.prepare('UPDATE battles SET spec = ? WHERE id = ?').run(JSON.stringify(sp), st.id);
    const before = { ...JSON.parse(q.save.get(1).state).tournament };
    let msg = '';
    try { game.battleTurn(1, st.id, { kind: 'skill', id: 'basic' }, NOW + 1000); } catch (e) { msg = e.message; }
    eq(msg.includes('업데이트'), true, '안내 문구');
    eq(q.battle.get(st.id, 1).done, 4, '무효로 닫힘');
    const after = JSON.parse(q.save.get(1).state).tournament;
    eq([after.wins, after.losses], [before.wins, before.losses], '승패 그대로');
    const again = game.battleStart(1, NOW + 2000);
    eq([again.resume || false, again.forfeited], [false, null], '새 판(진 판 처리 없음)');
  });
  t('옛 규칙 판이 열린 채 새 판을 시작하면 = 무효 알림', () => {
    const open = q.openBattle.get(1), sp = JSON.parse(open.spec);
    sp.rv = RULES_VER + 1; db.prepare('UPDATE battles SET spec = ? WHERE id = ?').run(JSON.stringify(sp), open.id);
    const r = game.battleStart(1, NOW + 3000);
    eq(r.forfeited, 'void', '무효'); eq(q.battle.get(open.id, 1).done, 4, '닫힘');
  });
  db.close();
} finally { rmSync(dir, { recursive: true, force: true }); }

console.log(`저장 안전 시험 ${pass}/${pass + fails.length}`);
if (fails.length) { for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
