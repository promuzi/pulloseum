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
t('3패 = 그 라운드 처음부터 · 마스터 이상은 예선부터', () => {
  const s = fresh();
  Object.assign(s.tournament, { tier: '실버', round: '8강', wins: 1, losses: 2 });
  const a = L.battleReward(s, { mode: 'tournament', win: false, rng: makeRng(3), now: NOW });
  eq([a.reset, s.tournament.round, s.tournament.wins, s.tournament.losses], ['round', '8강', 0, 0], '실버');
  Object.assign(s.tournament, { tier: '마스터', round: '4강', wins: 0, losses: 2 });
  const b = L.battleForfeit(s, 'tournament');
  eq([b.reset, s.tournament.round], ['qual', '예선'], '마스터 기권');
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
