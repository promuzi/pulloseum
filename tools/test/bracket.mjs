// 생장 칸 시험(2026-11-05 사용자 'pvp도 새싹/성장체/성체로 나누고 / 이걸 각각 1:1, 3:3 각각 으로 또 분류해'):
//  리그 이름(새싹 · 성장기 · 성체) · 저장 옮기기 9 → 10(옛 이름 · 3:3 칸마다 승패) · 3:3 봇 판도 생장 칸까지 · 3:3 승패가 칸마다 ·
//  친구 대결 방 = 방장이 생장 칸을 고름(만들 때 · 바꿀 때) · 칸을 넘는 식물 · 팀은 못 고름 · 넘으면 맞는 식물로 · 준비 막힘
//   node tools/test/bracket.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../server/db.mjs';
import { makeGame } from '../../server/game.mjs';
import { makeRooms } from '../../server/rooms.mjs';
import { makeLog } from '../../server/log.mjs';
import { makeApi } from '../../server/api.mjs';
import { migrate, bracketWhy, battleReward, setLeague, newGame, SAVE_VER } from '../../v2/src/game/logic.js';
import { LEAGUES } from '../../v2/src/game/catalog.js';
import { makeRng } from '../../v2/src/game/fight.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
// ① 이름 · 저장 옮기기
ok(LEAGUES.sprout.name === '새싹 리그' && LEAGUES.growing.name === '성장기 리그' && LEAGUES.open.name === '성체 리그', '리그 이름 = 새싹 · 성장기 · 성체');
{
  const s = newGame({ nickname: 'x', starter: 'flower_grass' }, makeRng(5), 0);   // 옛 판(9) 흉내: 옛 이름 · 3:3 칸 없음
  Object.assign(s, { ver: 9, league: 'growing', tournament: { tier: '실버', name: '자람 실버', round: '예선', wins: 1, losses: 0, bestOf: 5, pts: 10 }, leagues: { sprout: { tier: '골드', name: '새싹 골드', round: '8강', wins: 0, losses: 0, bestOf: 5, pts: 0 }, growing: { tier: '실버', name: '자람 실버', round: '예선', wins: 0, losses: 0, bestOf: 5, pts: 0 }, open: { tier: '브론즈', name: '무제한 브론즈', round: '예선', wins: 0, losses: 0, bestOf: 5, pts: 0 } }, swap3: { wins: 4, losses: 2 } });
  delete s.swap3by;
  migrate(s);
  ok(s.ver === SAVE_VER && SAVE_VER >= 10, '저장 판 번호 ' + s.ver);
  ok(s.tournament.name === '성장기 실버' && s.tournament.wins === 1 && s.leagues.open.name === '성체 브론즈' && s.leagues.sprout.name === '새싹 골드', `옛 이름 → 새 이름(지금 ${s.tournament.name} · 성체 ${s.leagues.open.name})`);
  ok(s.leagues.growing.wins === 1, '지금 리그 기록은 보관 칸에도 같게');
  ok(s.swap3by && s.swap3by.sprout.wins === 0 && s.swap3by.open.losses === 0 && s.swap3.wins === 4, '3:3 칸마다 승패 = 새로 · 전체 승패는 그대로');
  // 3:3 판 = 전체 + 그 칸
  setLeague(s, 'sprout');
  battleReward(s, { mode: 'swap3', win: true, rng: makeRng(3), now: 0 });
  ok(s.swap3.wins === 5 && s.swap3by.sprout.wins === 1 && s.swap3by.open.wins === 0, '3:3 이김 = 전체 + 새싹 칸');
}
ok(bracketWhy('growing', [{ name: 'a', stage: 1 }, { name: 'b', stage: 0 }]) === null && /성장기 리그/.test(bracketWhy('growing', [{ name: '페탈로즈', stage: 2 }]) || ''), '칸 검사 = 성장기 리그에 성체는 막힘');

// ② 서버(같은 저장소 · 요청 처리기 그대로)
const dir = mkdtempSync(join(tmpdir(), 'pullo-br-')), { q } = openDb(join(dir, 't.db')), log = makeLog(q), game = makeGame({ q, log });
const rooms = makeRooms({ game, log, q }), api = makeApi({ q, game, rooms, log });
const call = async (method, path, body = {}, tok = null, ip = '9.9.9.9') => {
  const header = h => (h === 'authorization' && tok ? 'Bearer ' + tok : null);
  const r = await api.handle({ method, path, query: new URLSearchParams(), header, ip, body, onClose: () => {} });
  return { status: r.status, ...r.body };
};
const uidOf = async tok => (await call('GET', '/api/me', null, tok)).user;
// 저장 고치기(시험용): 식물 셋 · 단계 지정
const setPlants = (uid, stages) => {
  const { s } = game.load(uid);
  while (s.plants.length < stages.length) s.plants.push({ ...JSON.parse(JSON.stringify(s.plants[0])), uid: 'p' + s.plants.length + 'x' + Math.random().toString(36).slice(2, 6), name: '식물' + s.plants.length });
  stages.forEach((st, i) => { s.plants[i].stage = st; });
  s.team = [0, 1, 2]; s.active = 0;
  q.putSave.run(uid, JSON.stringify(s), Date.now());
  return s.plants.map(p => p.uid);
};
try {
  const reg = async (login, starter, ip) => (await call('POST', '/api/register', { age14: true, login, password: 'secret12', nickname: login, starter }, null, ip)).token;
  const A = await reg('bra', 'flower_grass', '7.7.8.1'), B = await reg('brb', 'cactus_fire', '7.7.8.2');
  const ua = await uidOf(A), ub = await uidOf(B);
  ok(ua && ub, '계정 둘');
  const pa = setPlants(ua.id, [2, 1, 0]), pb = setPlants(ub.id, [0, 0, 0]);
  // 3:3 봇 판: 새싹 칸에 성체 · 성장기가 낀 팀 = 막힘 · 성체 칸 = 됨
  await call('POST', '/api/act', { op: 'setMode', args: { mode: 'swap3' } }, A);
  await call('POST', '/api/act', { op: 'setLeague', args: { league: 'sprout' } }, A);
  const b1 = await call('POST', '/api/battle/start', {}, A);
  ok(b1.status === 400 && /새싹 리그/.test(b1.error || ''), '3:3 새싹 칸 + 성체 팀 = 막힘: ' + b1.error);
  await call('POST', '/api/act', { op: 'setLeague', args: { league: 'open' } }, A);
  const b2 = await call('POST', '/api/battle/start', {}, A);
  ok(b2.status === 200 && b2.mode === 'swap3' && /성체/.test(b2.info.title), '3:3 성체 칸 = 시작 · 제목 ' + (b2.info && b2.info.title));
  const foeStages = (b2.view.team ? b2.view.team.foe : []).map(u => u.stage);
  ok(foeStages.length === 3, '봇 팀 셋');
  await call('POST', '/api/battle/cancel', { id: b2.id }, A);
  // 친구 대결: 만들 때 형식 · 칸 · 방 보기에 칸
  const r0 = await call('POST', '/api/room/create', { mode: 'swap3', league: 'growing' }, A);
  ok(r0.status === 200 && r0.mode === 'swap3' && r0.league === 'growing', `방 만들기 = 3:3 · 성장기(${r0.mode} · ${r0.league})`);
  const meA = r0.members.find(m => m.me);
  ok(meA && meA.team && meA.team.every(c => c.stage <= 1), '성장기 방 = 내 팀이 성장기까지로 맞춰짐 ' + JSON.stringify((meA && meA.team || []).map(c => c.stage)));
  await call('POST', '/api/room/join', { code: r0.code }, B);
  // 1:1로 바꾸고 성체 식물 고르기 = 막힘
  await call('POST', '/api/room/mode', { mode: '1v1' }, A);
  const pk = await call('POST', '/api/room/pick', { plant: pa[0] }, A);
  ok(pk.status === 400 && /성장기 리그/.test(pk.error || ''), '성장기 방에 성체 고르기 = 막힘: ' + pk.error);
  const pk2 = await call('POST', '/api/room/pick', { plant: pa[1] }, A);
  ok(pk2.status === 200 && pk2.members.find(m => m.me).card.stage === 1, '성장기 식물 = 됨');
  // 친구는 방장이 아님 = 칸 못 바꿈
  const lg0 = await call('POST', '/api/room/league', { league: 'sprout' }, B);
  ok(lg0.status === 400, '방장만 칸을 바꿈');
  // 방장이 새싹으로 = 둘 다 준비 풀림 · 넘는 식물은 맞는 것으로
  await call('POST', '/api/room/ready', { on: true }, B);
  const lg1 = await call('POST', '/api/room/league', { league: 'sprout' }, A);
  const mA = lg1.members.find(m => m.me), mB = lg1.members.find(m => !m.me);
  ok(lg1.league === 'sprout' && mA.card && mA.card.stage === 0 && !mB.ready, `새싹으로 = 내 식물이 새싹으로 바뀜(${mA.card && mA.card.stage}) · 준비 풀림`);
  // 3:3 새싹 방: A는 새싹 식물이 하나뿐 → 팀 없음 → 준비 막힘
  await call('POST', '/api/room/mode', { mode: 'swap3' }, A);
  const rd = await call('POST', '/api/room/ready', { on: true }, A);
  ok(rd.status === 400 && /새싹 리그/.test(rd.error || ''), '새싹 3:3 = 새싹 식물이 셋 아니면 준비 막힘: ' + rd.error);
  // 성체 방이면 둘 다 준비 → 대결 시작
  await call('POST', '/api/room/league', { league: 'open' }, A);
  await call('POST', '/api/room/ready', { on: true }, A);
  const rb = await call('POST', '/api/room/ready', { on: true }, B);
  ok(rb.phase === 'battle', '성체 3:3 = 둘 다 준비 → 대결');
} catch (e) { fails++; console.log('오류', e); }
finally { rooms.stop(); try { rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(fails ? `생장 칸 시험 ${n - fails}/${n} 통과` : `생장 칸 시험 ${n}개 통과`);
process.exitCode = fails ? 1 : 0;
