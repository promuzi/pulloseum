// 서버 통째 시험(화면 없이): 임시 저장소로 서버를 켜고 → 가입 둘 · 양육 · 봇 판 끝까지 · 이어 하기 · 기권 · 친구 대결 방(실시간 알림) · 잘못된 요청
//   node tools/test/server.mjs            (Node 서버를 임시 저장소로 켜서)
//   node tools/test/server.mjs --base URL (이미 떠 있는 서버 — Cloudflare 판 시험 cf/test_cf.mjs 가 씀, 보고서 시험은 건너뜀)
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EXT = (i => (i > 0 ? process.argv[i + 1] : null))(process.argv.indexOf('--base'));
const PORT = 18000 + Math.floor(Math.random() * 1000), BASE = EXT || `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'pullo-'));
const srv = EXT ? null : spawn(process.execPath, ['--no-warnings', 'server/index.mjs', '--port', String(PORT), '--db', join(dir, 't.db')], { stdio: ['ignore', 'pipe', 'pipe'] });
let out = ''; if (srv) { srv.stdout.on('data', d => { out += d; }); srv.stderr.on('data', d => { out += d; }); }
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(path, body, token, method) {
  for (let k = 0; ; k++) {
    const r = await fetch(BASE + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 && k < 8 && path !== '/api/login' && path !== '/api/register') { await sleep(1500); continue; }   // 사람보다 빠른 시험이 요청 한도(계정마다 10초 80번)에 걸리면 잠깐 쉬고 다시
    return { status: r.status, ...j };
  }
}
// 실시간 알림 읽기(기다리는 요청 — 화면과 같은 길 /api/room/poll)
function listen(token) {
  const ev = [], ctrl = new AbortController();
  let stopped = false, after = -1;
  (async () => {
    while (!stopped) {
      try {
        const r = await fetch(BASE + '/api/room/poll?after=' + after, { headers: { authorization: 'Bearer ' + token }, signal: ctrl.signal });
        if (!r.ok) { await sleep(r.status === 429 ? 1000 : 100); continue; }   // 너무 잦음(계정마다 10초 80번) — 화면처럼 같은 번호로 다시 물음
        const j = await r.json();
        for (const e of j.events || []) ev.push({ type: e.type, data: e.data });
        after = j.seq;
      } catch { if (stopped) break; await sleep(100); }
    }
  })();
  return { ev, stop: () => { stopped = true; ctrl.abort(); }, wait: async (type, from = 0, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const i = ev.findIndex((e, k) => k >= from && e.type === type); if (i >= 0) return { ...ev[i], i }; await sleep(30); } return null; } };
}

try {
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {} await sleep(100); }
  // ── 가입 · 로그인 ──
  const bad = await call('/api/register', { login: 'A', password: '123', nickname: '', starter: 'x' });
  ok(bad.status === 400 && /아이디/.test(bad.error), '잘못된 가입은 막힘: ' + bad.error);
  const A = await call('/api/register', { login: 'alice', password: 'secret1', nickname: '앨리스', starter: 'flower_grass' });
  ok(A.status === 200 && A.token && A.state.plants.length === 1, '가입 → 열쇠 + 처음 식물');
  const dup = await call('/api/register', { login: 'alice', password: 'secret1', nickname: 'x', starter: 'aqua' });
  ok(dup.status === 400 && /이미/.test(dup.error), '같은 아이디 막힘');
  const B = await call('/api/register', { login: 'bob', password: 'secret2', nickname: '밥', starter: 'cactus_fire' });
  ok(B.status === 200, '두 번째 가입');
  const wrong = await call('/api/login', { login: 'alice', password: 'nope' });
  ok(wrong.status === 400, '틀린 비밀번호 막힘');
  const L1 = await call('/api/login', { login: 'alice', password: 'secret1' });
  ok(L1.status === 200 && L1.state.profile.name === '앨리스', '로그인 → 같은 세이브');
  const me = await call('/api/me', null, A.token);
  ok(me.status === 200 && me.user.login === 'alice', '열쇠로 내 정보');
  ok((await call('/api/me', null, 'nope')).status === 401, '잘못된 열쇠 = 401');
  // ── 양육(자동 저장) ──
  const pid = A.state.plants[0].uid;
  const f = await call('/api/act', { op: 'feed', args: { id: pid, kind: 'water', n: 5 } }, A.token);   // 새싹 Lv1 → 2 = 생장 45(2026-10-22 ×1.5)
  ok(f.status === 200 && f.state.plants[0].lv === 2 && f.state.items.water === 1, '물 5번 → Lv2 · 물 1 남음');
  const again = await call('/api/me', null, L1.token);
  ok(again.state.plants[0].lv === 2, '다른 열쇠(다른 기기)로 봐도 저장돼 있음');
  const ev = await call('/api/act', { op: 'evolve', args: { id: pid } }, A.token);
  ok(ev.status === 400 && /Lv6/.test(ev.error), 'Lv6 전 진화 막힘: ' + ev.error);
  const buy = await call('/api/act', { op: 'buy', args: { item: 'water10' } }, A.token);
  ok(buy.status === 200 && buy.state.items.water === 11 && buy.state.wallet.gems === 14, '보석으로 물 10');
  const unk = await call('/api/act', { op: 'addXp', args: { n: 99999 } }, A.token);
  ok(unk.status === 400, '목록에 없는 일(경험치 직접 주기) 막힘');
  const ex = await call('/api/act', { op: 'explore', args: { planet: 'ex_ermias' } }, A.token);
  ok(ex.status === 200 && ex.res.got.length >= 1 && ex.state.items.fuel === 2 && ex.state.wallet.credits < buy.state.wallet.credits && ex.state.probe && ex.res.area, '탐사 → 보상 · 연료 캡슐 1 · 탐사비 · 지역');
  const far = await call('/api/act', { op: 'explore', args: { planet: 'ex_tiamen' } }, A.token);
  ok(far.status === 400 && /Lv13/.test(far.error), '먼 궤도는 레벨 문턱');
  // ── 봇 판(서버가 한 턴씩) ──
  const st = await call('/api/battle/start', {}, A.token);
  ok(st.status === 200 && st.id && st.view.me && st.view.foe && !st.view.seed, '판 시작 → 판 모습(씨앗은 안 옴)');
  const st2 = await call('/api/battle/start', {}, A.token);
  ok(st2.id === st.id && st2.resume, '안 끝난 판은 이어서');
  const badMove = await call('/api/battle/turn', { id: st.id, act: 'nope' }, A.token);
  ok(badMove.status === 400, '모르는 기술 막힘');
  let r = null, turns = 0;
  while (turns < 90) {
    const v = (r && r.view) || st.view, kit = v.me.kit, en = v.me.energy;
    const sk = [...kit].reverse().find(k => k.act === 'attack' && (k.cost || 0) <= en) || kit[0];
    r = await call('/api/battle/turn', { id: st.id, act: sk.id }, A.token); turns++;
    if (r.status !== 200) { ok(false, '턴 실패 ' + r.error); break; }
    if (r.over) break;
  }
  ok(r && r.over && r.reward && r.state, `판 끝(${turns}턴, ${r && r.over}) → 보상 ${r && r.reward && r.reward.credits}`);
  ok(r.state.tournament.wins + r.state.tournament.losses === 1, '대회 기록 1판');
  const after = await call('/api/battle/turn', { id: st.id, act: 'basic' }, A.token);
  ok(after.status === 400, '끝난 판엔 수를 못 둠');
  const st3 = await call('/api/battle/start', {}, A.token);
  ok(st3.id !== st.id && !st3.resume, '새 판');
  const ff = await call('/api/battle/forfeit', { id: st3.id }, A.token);
  ok(ff.status === 200 && ff.reward.forfeit && ff.state.tournament.losses >= 1, '기권 = 진 판(보상 없음)');
  // ── 친구 대결 방 ──
  const la = listen(A.token), lb = listen(B.token);
  await sleep(200);
  const room = await call('/api/room/create', {}, A.token);
  ok(room.status === 200 && /^[A-Z2-9]{6}$/.test(room.code), '방 만들기 → 코드 ' + room.code);
  const nf = await call('/api/room/join', { code: 'ZZZZZZ' }, B.token);
  ok(nf.status === 400, '없는 코드 막힘');
  const jn = await call('/api/room/join', { code: room.code.toLowerCase() }, B.token);
  ok(jn.status === 200 && jn.members.length === 2, '코드로 들어감(소문자도)');
  const otherA = jn.members.find(m => !m.me), meB = jn.members.find(m => m.me);
  ok(otherA && otherA.card === null && typeof otherA.level === 'number' && otherA.name === '앨리스' && meB.card && meB.card.key === 'cactus_fire', '방: 상대는 프로필·이름·레벨만(고른 식물 안 보임), 내 식물은 보임');
  ok(await la.wait('room'), 'A에게 방 알림');
  await call('/api/room/ready', { on: true }, A.token);
  await call('/api/room/ready', { on: true }, B.token);
  const sa = await la.wait('start'), sb = await lb.wait('start');
  ok(sa && sb && sa.data.view.me.name !== sb.data.view.me.name && sa.data.view.me.key === sb.data.view.foe.key, '둘 다 준비 → 대결 시작(서로 나·상대가 뒤바뀐 모습)');
  const BASIC = ['basic', 'guard', 'evade'];
  ok(sa.data.view.foe.kit.every(k => BASIC.includes(k.id)) && sa.data.view.foe.atk === null && sa.data.view.me.kit.length > 3 && /Lv\d/.test(sa.data.view.foe.rank), '대결: 상대 기술(쓰기 전)·능력치는 안 옴, 내 기술은 다 옴, 상대 = 재배사 레벨');
  let firstB = null;
  let endA = null, endB = null, k = 0, fromA = 0, fromB = 0;
  while (k < 60) {
    const va = (la.ev.slice(fromA).reverse().find(e => e.type === 'turn' || e.type === 'start') || sa).data.view;
    const vb = (lb.ev.slice(fromB).reverse().find(e => e.type === 'turn' || e.type === 'start') || sb).data.view;
    const pickOf = v => ([...v.me.kit].reverse().find(x => x.act === 'attack' && (x.cost || 0) <= v.me.energy) || v.me.kit[0]).id;
    const ia = la.ev.length, ib = lb.ev.length;
    await call('/api/room/move', { act: pickOf(va) }, A.token);
    const mvB = pickOf(vb); if (firstB == null) firstB = mvB;
    await call('/api/room/move', { act: mvB }, B.token);
    const ta = await la.wait('turn', ia), tb = await lb.wait('turn', ib);
    if (!ta || !tb) { ok(false, '턴 알림 안 옴'); break; }
    fromA = ta.i; fromB = tb.i; k++;
    if (k === 1) ok(BASIC.includes(firstB) || ta.data.view.foe.kit.some(x => x.id === firstB), '상대가 쓴 기술은 그다음부터 보임');
    if (k === 1) ok(ta.data.turn.events.every(e => e.t !== 'hit' || e.table === undefined), '적중 표(능력치로 계산한 칸)는 안 옴');
    endA = la.ev.find(e => e.type === 'end'); endB = lb.ev.find(e => e.type === 'end');
    if (ta.data.view.over) { endA = await la.wait('end', ia); endB = await lb.wait('end', ib); break; }
  }
  ok(endA && endB && endA.data.win !== endB.data.win, `대결 끝(${k}턴) → 한 명만 이김`);
  ok(endA && endA.data.state && endA.data.reward, '결과에 보상·상태');
  const ra = await call('/api/room', null, A.token);
  ok(ra.room && ra.room.phase === 'lobby' && ra.room.last, '끝나면 같은 방(다시 하기)');
  const em = await call('/api/room/emote', { i: 2 }, B.token);
  ok(em.ok && await la.wait('emote'), '감정 표현 전달');
  await call('/api/room/leave', {}, B.token);
  const rb = await call('/api/room', null, B.token);
  ok(!rb.room, '나가기');
  la.stop(); lb.stop();
  // ── 3:3 친구 대결(교체전): 방식 · 팀 · 상대 대기석 숨김 · 쓰러진 자리 채우기 · 끝까지 ──
  for (const T of [A, B]) { const s3 = (await call('/api/me', null, T.token)).state; for (const sd of s3.seeds.slice(0, 2)) await call('/api/act', { op: 'plantSeed', args: { seed: sd.id } }, T.token); }
  const la3 = listen(A.token), lb3 = listen(B.token);
  await sleep(200);
  ok((await call('/api/room/join', { code: room.code }, B.token)).status === 200, '같은 방에 다시 들어옴');
  ok((await call('/api/room/mode', { mode: 'swap3' }, B.token)).status === 400, '방장만 방식을 바꿈');
  const md = await call('/api/room/mode', { mode: 'swap3' }, A.token), mineA = md.members && md.members.find(m => m.me);
  ok(md.status === 200 && md.mode === 'swap3' && mineA.team.length === 3 && md.members.every(m => m.team3) && md.members.find(m => !m.me).team === null, '3:3 방식 → 내 팀 셋은 보이고 상대 팀은 안 보임');
  const order = mineA.team.map(c => c.uid).reverse();
  const tm = await call('/api/room/team', { plants: order }, A.token);
  ok(tm.status === 200 && tm.members.find(m => m.me).team[0].uid === order[0], '팀 순서 바꾸기(앞 = 먼저 나감)');
  ok((await call('/api/room/team', { plants: [order[0], order[0], order[1]] }, A.token)).status === 400, '같은 식물 둘은 막힘');
  await call('/api/room/ready', { on: true }, A.token);
  await call('/api/room/ready', { on: true }, B.token);
  const s3a = await la3.wait('start'), s3b = await lb3.wait('start');
  ok(s3a && s3b && s3a.data.view.mode === 'swap3' && s3a.data.view.team.me.every(u => u.key && u.atk != null), '3:3 대결 시작(내 셋은 다 보임)');
  ok(s3a && s3a.data.view.team.foe.filter(u => u.hidden).length === 2 && !s3a.data.view.team.foe[0].hidden && s3a.data.view.team.foe[1].key === null && s3a.data.view.team.foe[0].atk === null, '상대 대기석 둘은 자리만 · 앞 식물은 능력치 없이');
  {
    const L = { a: la3, b: lb3 }, TK = { a: A.token, b: B.token }, V = { a: s3a.data.view, b: s3b.data.view }, from = { a: 0, b: 0 };
    let turns3 = 0, sends3 = 0, sw3 = 0, wrongSide = null, deadSend = null, over3 = false, end3 = {};
    const alive = (v, skip) => v.team.me.map((u, i) => (u.hp > 0 && i !== skip ? i : -1)).filter(i => i >= 0);
    for (let g = 0; g < 160 && !over3; g++) {
      await sleep(450);   // 사람보다 훨씬 빠르면 요청 한도(계정마다 10초 80번)에 걸림
      const need = { a: ['me', 'both'].includes(V.a.need), b: ['me', 'both'].includes(V.b.need) };
      if (need.a || need.b) {   // 쓰러진 자리 채우기
        const idle = need.a ? (need.b ? null : 'b') : 'a';
        if (idle && wrongSide == null) wrongSide = (await call('/api/room/move', { act: { kind: 'basic' }, turn: V[idle].turn }, TK[idle])).status;
        const at = { a: L.a.ev.length, b: L.b.ev.length };
        for (const s of ['a', 'b']) if (need[s]) {
          if (deadSend == null) deadSend = (await call('/api/room/move', { act: { kind: 'send', to: V[s].act.me }, turn: V[s].turn }, TK[s])).status;
          const r3 = await call('/api/room/move', { act: { kind: 'send', to: alive(V[s], V[s].act.me)[0] }, turn: V[s].turn }, TK[s]);
          if (r3.status !== 200) { ok(false, '채우기 실패 ' + r3.error); g = 999; }
        }
        const ea = await L.a.wait('send', at.a), eb = await L.b.wait('send', at.b);
        if (!ea || !eb) { ok(false, '채우기 알림 안 옴'); break; }
        V.a = ea.data.view; V.b = eb.data.view; from.a = ea.i; from.b = eb.i; sends3++;
        continue;
      }
      const at = { a: L.a.ev.length, b: L.b.ev.length };
      for (const s of ['a', 'b']) {
        const v = V[s], bench = alive(v, v.act.me), me3 = v.team.me[v.act.me];
        const act = (g % 5 === 2 && bench.length) ? (sw3++, { kind: 'switch', to: bench[0] }) : { kind: 'skill', id: ([...me3.kit].reverse().find(x => x.act === 'attack' && (x.cost || 0) <= v.pool.me) || me3.kit[0]).id };
        const r3 = await call('/api/room/move', { act, turn: v.turn }, TK[s]);
        if (r3.status !== 200) { ok(false, '3:3 수 실패 ' + r3.error); g = 999; }
      }
      const ta = await L.a.wait('turn', at.a), tb = await L.b.wait('turn', at.b);
      if (!ta || !tb) { ok(false, '3:3 턴 알림 안 옴'); break; }
      V.a = ta.data.view; V.b = tb.data.view; turns3++;
      if (V.a.over) { end3.a = await L.a.wait('end', at.a); end3.b = await L.b.wait('end', at.b); over3 = true; }
    }
    ok(over3 && end3.a && end3.b && end3.a.data.win !== end3.b.data.win, `3:3 끝까지(${turns3}턴 · 채우기 ${sends3}번 · 교체 ${sw3}번) → 한 명만 이김`);
    ok(sends3 > 0 && deadSend === 400 && (wrongSide == null || wrongSide === 400), '쓰러진 식물은 못 내보냄 · 채울 쪽이 아니면 못 둠');
    ok(V.a.team.foe.every(u => u.hidden || u.key) && V.b.team.me.every((u, i) => u.key === V.a.team.foe[i].key || V.a.team.foe[i].hidden), '나온 식물만 공개(끝까지 숨은 식물은 자리만)');
  }
  const r3 = await call('/api/room', null, A.token);
  ok(r3.room && r3.room.phase === 'lobby' && r3.room.mode === 'swap3' && r3.room.last && r3.room.last.mode === 'swap3', '3:3 끝 → 같은 방 · 방식 그대로');
  await call('/api/room/leave', {}, B.token); await call('/api/room/leave', {}, A.token);
  la3.stop(); lb3.stop();
  // ── 로그아웃 ──
  await call('/api/logout', {}, L1.token);
  ok((await call('/api/me', null, L1.token)).status === 401, '로그아웃한 열쇠는 못 씀');
  ok((await fetch(BASE + '/v2/')).status === 200 && (await fetch(BASE + '/server/data/t.db')).status === 404 && (await fetch(BASE + '/v2/../server/db.mjs')).status === 404, '게임 파일만 내보냄(저장소·서버 코드는 못 받음)');
  // ── 플레이 기록 보고서 ──
  const rep = EXT ? null : spawnSync(process.execPath, ['--no-warnings', 'server/report.mjs', '--db', join(dir, 't.db')], { encoding: 'utf8' });
  if (rep) ok(rep.status === 0 && /봇 판/.test(rep.stdout) && /대결 2판\(1:1 1 · 3:3 1\)/.test(rep.stdout), '플레이 기록 보고서' + (rep.status ? '\n' + rep.stderr : ''));
  if (rep && process.argv.includes('--report')) console.log(rep.stdout);
} catch (e) { fails++; console.log('오류', e); }
if (srv) srv.kill();
await sleep(200);
try { rmSync(dir, { recursive: true, force: true }); } catch {}
if (fails) console.log('--- 서버 출력 ---\n' + out);
console.log(`서버 시험 ${n}개 중 ${n - fails}개 통과`);
process.exit(fails ? 1 : 0);
