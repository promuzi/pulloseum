// 쿠폰 시험(2026-10-17): 관리 열쇠가 없으면 길 없음 · 틀린 열쇠 거절 · 만들기 · 받기(보상 들어감 · 받은 것 목록) · 계정마다 한 번 · 다 쓰인 · 기간 지난 · 없는 번호 ·
//  번호 꼴(띄어쓰기 · 붙임표 · 소문자 무시) · 마구 넣기 막기 · 보상 다듬기(모르는 칸 버림 · 한도) · 계정 지우기 때 받은 기록도
//   node tools/test/coupon.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../../server/db.mjs';
import { makeGame } from '../../server/game.mjs';
import { makeRooms } from '../../server/rooms.mjs';
import { makeLog } from '../../server/log.mjs';
import { makeApi } from '../../server/api.mjs';
import { STARTERS } from '../../v2/src/game/catalog.js';
import { cleanCoupon } from '../../v2/src/game/logic.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const dir = mkdtempSync(join(tmpdir(), 'pullo-c-')), { q, db } = openDb(join(dir, 't.db')), log = makeLog(q), game = makeGame({ q, log }), rooms = makeRooms({ game, log });
const KEY = 'test-admin-key';
const call = async (api, method, path, body = {}, { tok = null, key = null, ip = '1.2.3.4' } = {}) => {
  const header = h => (h === 'authorization' && tok ? 'Bearer ' + tok : h === 'x-admin-key' ? key : null);
  const r = await api.handle({ method, path, query: new URLSearchParams(), header, ip, body, onClose: () => {} });
  return { status: r.status, ...r.body };
};
try {
  const off = makeApi({ q, game, rooms, log });
  ok((await call(off, 'POST', '/api/admin/coupon', { code: 'TEST1', reward: { credits: 1 } }, { key: KEY })).status === 404, '관리 열쇠 없는 서버 = 길 없음');
  const api = makeApi({ q, game, rooms, log, adminKey: KEY });
  ok((await call(api, 'POST', '/api/admin/coupon', { code: 'TEST1', reward: { credits: 1 } }, { key: 'wrong' })).status === 404, '틀린 열쇠 = 없는 주소처럼');
  ok((await call(api, 'POST', '/api/admin/coupon', { code: 'AB', reward: { credits: 1 } }, { key: KEY })).status === 400, '너무 짧은 번호 거절');
  ok((await call(api, 'POST', '/api/admin/coupon', { code: 'EMPTY1', reward: { nope: 5 } }, { key: KEY })).status === 400, '빈 보상 거절');
  const mk = await call(api, 'POST', '/api/admin/coupon', { code: 'friend-2026', reward: { credits: 5000, gems: 300, water: 30, fert: 15, fuel: 10, seeds: ['rare', 'common'], cards: ['normal', 'mut'], junk: 9 }, max: 2, days: 30, note: '시험' }, { key: KEY });
  ok(mk.ok && mk.coupon.code === 'FRIEND2026' && !('junk' in mk.coupon.reward), '만들기(붙임표 · 소문자 다듬음 · 모르는 칸 버림)');
  const list = await call(api, 'GET', '/api/admin/coupons', {}, { key: KEY });
  ok(list.coupons.length === 1 && list.coupons[0].used === 0 && list.coupons[0].max_uses === 2, '보기');
  // 계정 셋
  const reg = async (login, ip) => (await call(api, 'POST', '/api/register', { age14: true, login, password: 'secret12', nickname: login, starter: STARTERS[0] }, { ip })).token;
  const ta = await reg('coupa', '5.5.5.1'), tb = await reg('coupb', '5.5.5.2'), tc = await reg('coupc', '5.5.5.3');
  ok(ta && tb && tc, '계정 셋');
  ok((await call(api, 'POST', '/api/coupon', { code: 'FRIEND2026' })).status === 401, '로그인 안 하면 못 받음');
  const before = (await call(api, 'GET', '/api/me', {}, { tok: ta })).state;
  const ra = await call(api, 'POST', '/api/coupon', { code: ' friend 2026 ' }, { tok: ta, ip: '5.5.5.1' });
  ok(ra.status === 200 && ra.code === 'FRIEND2026', '받기(띄어쓰기 · 소문자 무시)');
  const S = ra.state;
  ok(S && S.wallet.credits === before.wallet.credits + 5000 && S.wallet.gems === before.wallet.gems + 300, '돈 · 보석 들어감');
  ok(S.items.water === (before.items.water || 0) + 30 && S.items.fert === (before.items.fert || 0) + 15 && S.items.fuel === (before.items.fuel || 0) + 10, '물 · 비료 · 연료 들어감');
  ok(S.seeds.length === before.seeds.length + 2, '종자 둘');
  const cardsN = o => Object.values(o.cards || {}).reduce((a, b) => a + b, 0);
  ok(cardsN(S) === cardsN(before) && (S.items.pack_n || 0) === (before.items.pack_n || 0) + 1 && (S.items.pack_m || 0) === (before.items.pack_m || 0) + 1, '카드 꾸러미 둘(가방 물건 — 2026-10-22 식물에서 열기)');
  ok(Array.isArray(ra.got) && ra.got.length === 9 && ra.got.some(x => x.kind === 'seed' && x.seed) && ra.got.some(x => x.kind === 'pack_n') && ra.got.some(x => x.kind === 'pack_m'), '받은 것 목록(아홉 칸)');
  const me = await call(api, 'GET', '/api/me', {}, { tok: ta });
  ok(me.state.wallet.credits === S.wallet.credits, '저장됨(다시 불러도 그대로)');
  ok(/이미 받은/.test((await call(api, 'POST', '/api/coupon', { code: 'FRIEND2026' }, { tok: ta, ip: '5.5.5.1' })).error || ''), '같은 계정 두 번 = 안 됨');
  ok((await call(api, 'POST', '/api/coupon', { code: 'FRIEND2026' }, { tok: tb, ip: '5.5.5.2' })).status === 200, '다른 계정은 받음');
  ok(/다 쓰인/.test((await call(api, 'POST', '/api/coupon', { code: 'FRIEND2026' }, { tok: tc, ip: '5.5.5.3' })).error || ''), '정한 수(2)를 다 쓰면 안 됨');
  ok((await call(api, 'GET', '/api/admin/coupons', {}, { key: KEY })).coupons[0].used === 2, '쓴 수 = 2');
  ok(/없는 쿠폰/.test((await call(api, 'POST', '/api/coupon', { code: 'NOPE1234' }, { tok: tc, ip: '5.5.5.3' })).error || ''), '없는 번호');
  ok(/확인해 주세요/.test((await call(api, 'POST', '/api/coupon', { code: '!!' }, { tok: tc, ip: '5.5.5.3' })).error || ''), '번호 꼴이 틀림');
  // 기간 지난 쿠폰(저장소에 바로 — 관리 길은 앞으로의 날만 받음)
  q.putCoupon.run('OLD2025', JSON.stringify({ credits: 10 }), 0, Date.now() - 1000, '', Date.now());
  ok(/기간이 끝난/.test((await call(api, 'POST', '/api/coupon', { code: 'OLD2025' }, { tok: tc, ip: '5.5.5.3' })).error || ''), '기간 지난 쿠폰');
  // 고치기(같은 번호 add = 보상 · 수 · 기간만 — 쓴 수는 그대로)
  await call(api, 'POST', '/api/admin/coupon', { code: 'FRIEND2026', reward: { credits: 1 }, max: 5 }, { key: KEY });
  const c2 = (await call(api, 'GET', '/api/admin/coupons', {}, { key: KEY })).coupons.find(c => c.code === 'FRIEND2026');
  ok(c2.used === 2 && c2.max_uses === 5 && c2.reward.credits === 1 && c2.expires === 0, '고치기(쓴 수 그대로)');
  ok((await call(api, 'POST', '/api/coupon', { code: 'FRIEND2026' }, { tok: tc, ip: '5.5.5.3' })).status === 200, '수를 늘리면 다시 받을 수 있음');
  // 마구 넣기 막기(계정마다 10분에 12번)
  let blocked = false;
  for (let i = 0; i < 14; i++) { const r = await call(api, 'POST', '/api/coupon', { code: 'GUESS' + i + 'X' }, { tok: tb, ip: '5.5.5.9' }); if (r.status === 429) { blocked = true; break; } }
  ok(blocked, '마구 넣기 = 429');
  // 계정 지우기 = 받은 기록도
  const uidA = q.userByLogin.get('coupa').id;
  ok(!!q.couponUsed.get('FRIEND2026', uidA), '받은 기록 있음');
  ok((await call(api, 'POST', '/api/account/delete', { password: 'secret12' }, { tok: ta, ip: '5.5.5.1' })).ok, '계정 지우기');
  ok(!q.couponUsed.get('FRIEND2026', uidA), '지우면 받은 기록도 없어짐');
  // 지우기
  ok((await call(api, 'POST', '/api/admin/coupon', { code: 'FRIEND2026', delete: true }, { key: KEY })).deleted === 'FRIEND2026', '쿠폰 지우기');
  ok(/없는 쿠폰/.test((await call(api, 'POST', '/api/coupon', { code: 'FRIEND2026' }, { tok: tc, ip: '5.5.5.3' })).error || ''), '지운 쿠폰은 없음');
  // 보상 다듬기
  const cc = cleanCoupon({ credits: 1e9, gems: -5, water: '7', seeds: ['legend', 'rare', 'rare', 'rare', 'rare', 'rare', 'rare', 'rare', 'rare', 'rare', 'rare', 'rare'], cards: ['bogus', 'mut'], x: 1 });
  ok(cc.credits === 1e6 && !('gems' in cc) && cc.water === 7 && cc.seeds.length === 10 && cc.cards.length === 1 && !('x' in cc), '보상 다듬기(한도 · 모르는 칸 · 꼴)');
} finally { try { db.close(); } catch {} rmSync(dir, { recursive: true, force: true }); }
console.log(fails ? `쿠폰 시험 ${n}개 중 실패 ${fails}` : `쿠폰 시험 ${n}개 모두 통과`);
process.exit(fails ? 1 : 0);
