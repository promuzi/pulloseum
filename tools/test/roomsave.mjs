// 친구 대결 방 저장 시험(2026-10-18 사용자 "PVP 중인데 갑자기 '대결 중이 아니에요' 하면서 연결 끊기고 멈춤" — 서버 본체가 다시 켜지며 메모리의 방이 사라졌음):
//  1:1 · 3:3 대결 도중 서버를 다시 켠 것처럼(같은 저장소로 방 모듈을 새로) → 옛 소식 번호로 물으면 지금 모습 통째로 · 같은 턴 · 같은 체력 · 수를 이어 둠 · 끝나면 대기 · 다 나가면 표에서 지움
//   node tools/test/roomsave.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../server/db.mjs';
import { makeGame } from '../../server/game.mjs';
import { makeRooms } from '../../server/rooms.mjs';
import { makeLog } from '../../server/log.mjs';
import { makeApi } from '../../server/api.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const dir = mkdtempSync(join(tmpdir(), 'pullo-r-')), { q } = openDb(join(dir, 't.db')), log = makeLog(q), game = makeGame({ q, log });
let rooms = makeRooms({ game, log, q }), api = makeApi({ q, game, rooms, log });
const call = async (method, path, body = {}, tok = null, ip = '9.9.9.9') => {
  const header = h => (h === 'authorization' && tok ? 'Bearer ' + tok : null);
  const query = new URLSearchParams(method === 'GET' && body ? body : {});
  const r = await api.handle({ method, path, query, header, ip, body, onClose: () => {} });
  return { status: r.status, ...r.body };
};
const restart = () => { rooms.stop(); rooms = makeRooms({ game, log, q }); api = makeApi({ q, game, rooms, log }); };   // 서버 본체가 다시 켜짐(메모리 = 비움, 저장소 = 그대로)
const poll = (tok, after) => call('GET', '/api/room/poll', { after: String(after) }, tok);
const lastOf = (evs, type) => [...evs].reverse().find(e => e.type === type);
try {
  const reg = async (login, starter, ip) => (await call('POST', '/api/register', { age14: true, login, password: 'secret12', nickname: login, starter }, null, ip)).token;
  const A = await reg('rsa', 'flower_grass', '7.7.7.1'), B = await reg('rsb', 'cactus_fire', '7.7.7.2');
  ok(A && B, '계정 둘');
  // ── 1:1 ──
  const room = await call('POST', '/api/room/create', {}, A);
  await call('POST', '/api/room/join', { code: room.code }, B);
  await call('POST', '/api/room/ready', { on: true }, A);
  await call('POST', '/api/room/ready', { on: true }, B);
  let pa = await poll(A, -1);
  const v0 = lastOf(pa.events, 'battle').data.view;
  ok(v0 && v0.turn === 1, '1:1 시작');
  const atk = v => ([...v.me.kit].reverse().find(x => x.act === 'attack' && (x.cost || 0) <= v.me.energy) || v.me.kit[0]).id;
  const vb0 = lastOf((await poll(B, -1)).events, 'battle').data.view;
  ok((await call('POST', '/api/room/move', { act: atk(v0), turn: 1 }, A)).ok, 'A 수');
  ok((await call('POST', '/api/room/move', { act: atk(vb0), turn: 1 }, B)).ok, 'B 수 → 턴 풂');
  pa = await poll(A, pa.seq);
  const t1 = lastOf(pa.events, 'turn');
  ok(t1 && t1.data.view.turn === 2, '2턴으로');
  const before = t1.data.view;
  ok((await call('POST', '/api/room/move', { act: 'rest', turn: 2 }, A)).ok, '2턴: A만 고른 채로');
  restart();
  const pr = await poll(A, pa.seq);
  const rb = lastOf(pr.events, 'battle'), rr = lastOf(pr.events, 'room');
  ok(rr && rr.data && rr.data.phase === 'battle' && rb, '다시 켠 뒤 옛 번호로 물음 → 방 · 판 모습 통째로');
  ok(rb && rb.data.view.turn === 2 && rb.data.view.me.hp === before.me.hp && rb.data.view.foe.hp === before.foe.hp && rb.data.moved === true, '같은 턴 · 같은 체력 · A가 이미 골랐음도 그대로');
  ok(rb && rb.data.view.me.kit.length === before.me.kit.length && rb.data.view.me.energy === before.me.energy, '기술 · 햇빛 그대로');
  ok(rb && rb.data.deadline > Date.now() + 10000, '다시 켜는 동안 흐른 시간은 셈하지 않음(턴 시간 새로)');
  ok((await call('POST', '/api/room/move', { act: 'rest', turn: 2 }, A)).status === 400, '이미 고른 수는 그대로(두 번 못 냄)');
  const pb = await poll(B, -1);
  ok((await call('POST', '/api/room/move', { act: 'rest', turn: 2 }, B)).ok, 'B 수 → 이어서 턴 풂');
  const pa2 = await poll(A, pr.seq), t2 = lastOf(pa2.events, 'turn');
  ok(t2 && t2.data.view.turn === 3, '3턴으로 이어짐');
  void pb;
  ok((await call('POST', '/api/room/forfeit', {}, B)).ok, '기권');
  const pa3 = await poll(A, pa2.seq), end = lastOf(pa3.events, 'end');
  ok(end && end.data.win === true && end.data.why === 'forfeit', '끝 → A 이김');
  restart();
  const row = q.allRooms.all().find(x => x.code === room.code), saved = row && JSON.parse(row.data);
  ok(saved && saved.phase === 'lobby' && !saved.B && saved.last && saved.last.why === 'forfeit', '끝난 방 = 대기(지난 판 결과)로 저장');
  ok((await call('GET', '/api/room', null, A)).room.phase === 'lobby', '다시 켠 뒤에도 같은 방(대기)');
  // ── 3:3 ──
  for (const T of [A, B]) { const s3 = (await call('GET', '/api/me', null, T)).state; for (const sd of s3.seeds.slice(0, 2)) await call('POST', '/api/act', { op: 'plantSeed', args: { seed: sd.id } }, T); }
  ok((await call('POST', '/api/room/mode', { mode: 'swap3' }, A)).mode === 'swap3', '3:3 방식');
  await call('POST', '/api/room/ready', { on: true }, A);
  await call('POST', '/api/room/ready', { on: true }, B);
  let qa = await poll(A, -1);
  const w0 = lastOf(qa.events, 'battle').data.view;
  ok(w0 && w0.mode === 'swap3' && w0.team.me.length === 3, '3:3 시작');
  const bench = w0.team.me.findIndex((u, i) => i !== w0.act.me && u.hp > 0);
  ok((await call('POST', '/api/room/move', { act: { kind: 'switch', to: bench }, turn: 1 }, A)).ok, 'A 교체');
  ok((await call('POST', '/api/room/move', { act: { kind: 'rest' }, turn: 1 }, B)).ok, 'B 쉼 → 턴 풂');
  qa = await poll(A, qa.seq);
  const u1 = lastOf(qa.events, 'turn').data.view;
  ok(u1.act.me === bench && u1.cd && u1.cd.me === 2, '교체됨 · 교체 제한 2턴');
  restart();
  const qr = await poll(A, qa.seq), w2 = lastOf(qr.events, 'battle');
  ok(w2 && w2.data.view.mode === 'swap3' && w2.data.view.act.me === bench && w2.data.view.cd.me === 2 && w2.data.view.pool.me === u1.pool.me, '3:3 다시 켠 뒤: 앞 식물 · 교체 제한 · 햇빛(팀 풀) 그대로');
  ok(w2 && w2.data.view.team.foe.filter(u => u.hidden).length === u1.team.foe.filter(u => u.hidden).length, '상대 대기석 숨김도 그대로');
  ok((await call('POST', '/api/room/move', { act: { kind: 'switch', to: w0.act.me }, turn: 2 }, A)).ok, 'A 수(교체 — 제한이라 안 바뀜)');
  ok((await call('POST', '/api/room/move', { act: { kind: 'rest' }, turn: 2 }, B)).ok, 'B 수 → 이어서 풂');
  const qa2 = await poll(A, qr.seq), u2 = lastOf(qa2.events, 'turn').data.view;
  ok(u2.turn === 3 && u2.act.me === bench && u2.cd.me === 1, '3:3 이어짐(교체 제한 다시 켜도 지킴)');
  await call('POST', '/api/room/forfeit', {}, A);
  await call('POST', '/api/room/leave', {}, A); await call('POST', '/api/room/leave', {}, B);
  ok(!q.allRooms.all().some(x => x.code === room.code), '다 나가면 표에서도 지움');
} catch (e) { fails++; console.log('오류:', e.stack || e); }
rooms.stop();
try { rmSync(dir, { recursive: true, force: true }); } catch {}
console.log(fails ? `실패 ${fails}/${n}` : `모두 통과 ${n}`);
process.exit(fails ? 1 : 0);
