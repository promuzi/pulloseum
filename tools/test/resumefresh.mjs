// 이어 하는 판이 옛 식물로 열리지 않는지(2026-10-22 사용자 "여전히 식물 진화 및 스킬 편집후 전투하면 적용 안 되는 경우가 있음"):
//  매칭 화면은 들어가자마자 서버에 판을 열고(battle/start), 찾는 동안 '취소'를 누르면 화면만 홈으로 감 → 서버엔 판이 남아
//  기술을 고친 뒤 다시 출전하면 같은 식물 · 같은 단계라 옛 판(옛 기술)을 이어서 열었음.
//   node tools/test/resumefresh.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 19000 + Math.floor(Math.random() * 900), BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'pullo-rf-'));
const srv = spawn(process.execPath, ['--no-warnings', 'server/index.mjs', '--port', String(PORT), '--db', join(dir, 't.db')], { stdio: ['ignore', 'pipe', 'pipe'] });
let out = ''; srv.stdout.on('data', d => { out += d; }); srv.stderr.on('data', d => { out += d; });
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(path, body, token) {
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
const kitIds = v => (v.me || v.team.me[0]).kit.map(k => k.id);

try {
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {} await sleep(100); }
  const A = await call('/api/register', { login: 'carol', password: 'secret1', nickname: '캐럴', starter: 'flower_grass' });
  ok(A.status === 200, '가입');
  const tok = A.token, pid = A.state.plants[0].uid;
  const losses = async () => (await call('/api/me', null, tok)).state.tournament.losses;
  const L0 = await losses();

  // 1) 판을 열고(매칭 화면이 연 것과 같음) 아무 수도 안 둔 채 기술 순서를 바꾸면 → 다음 출전은 새 판(바꾼 기술) · 진 판 아님
  const r1 = await call('/api/battle/start', {}, tok);
  ok(r1.status === 200 && r1.id && !r1.resume, '첫 판 열림');
  const before = A.state.plants[0].skills.battle.slice();
  const filled = before.map((v, i) => [v, i]).filter(([v]) => v);
  ok(filled.length >= 2, '기술 칸이 둘 이상: ' + JSON.stringify(before));
  const moved = before.slice(); const [i0, i1] = [filled[0][1], filled[1][1]]; [moved[i0], moved[i1]] = [moved[i1], moved[i0]];
  const e1 = await call('/api/act', { op: 'setLoadout', args: { id: pid, battle: moved } }, tok);
  ok(e1.status === 200, '기술 순서 바꿈: ' + (e1.error || ''));
  const r2 = await call('/api/battle/start', {}, tok);
  ok(r2.status === 200 && r2.id !== r1.id && !r2.resume, '바꾼 뒤 출전 = 새 판(옛 판 이어 하지 않음)');
  ok(JSON.stringify(kitIds(r2.view)) === JSON.stringify(moved.filter(Boolean)), '새 판 손패 = 바꾼 기술 순서: ' + kitIds(r2.view).join(',') + ' / ' + moved.filter(Boolean).join(','));
  ok((await losses()) === L0, '수를 안 둔 판은 진 판으로 치지 않음');

  // 2) 아무것도 안 바꾸면 → 같은 판 이어 하기
  const r3 = await call('/api/battle/start', {}, tok);
  ok(r3.status === 200 && r3.id === r2.id && r3.resume, '안 바꾸면 하던 판 이어 하기');

  // 3) 한 수라도 둔 판에서 기술을 바꾸면 → 진 판으로 정리하고 새 판(지금 설계 그대로)
  const t1 = await call('/api/battle/turn', { id: r3.id, act: kitIds(r3.view)[0], turn: r3.view.turn }, tok);
  ok(t1.status === 200, '한 수 둠: ' + (t1.error || ''));
  if (!t1.over) {
    const e2 = await call('/api/act', { op: 'setLoadout', args: { id: pid, battle: before } }, tok);
    ok(e2.status === 200, '기술 순서 되돌림');
    const r4 = await call('/api/battle/start', {}, tok);
    ok(r4.status === 200 && r4.id !== r3.id && r4.forfeited === 'changed', '수를 둔 판 + 기술 바꿈 = 진 판 정리 후 새 판: ' + r4.forfeited);
    ok(JSON.stringify(kitIds(r4.view)) === JSON.stringify(before.filter(Boolean)), '새 판 손패 = 되돌린 기술');
    ok((await losses()) === L0 + 1, '진 판 하나 늘어남');

    // 4) 매칭 '취소' = 수를 안 둔 판은 승패 없이 닫음 → 다음 출전은 새 판
    const c1 = await call('/api/battle/cancel', { id: r4.id }, tok);
    ok(c1.status === 200 && c1.cancelled, '매칭 취소로 판 닫힘: ' + (c1.error || JSON.stringify(c1)));
    const r5 = await call('/api/battle/start', {}, tok);
    ok(r5.status === 200 && r5.id !== r4.id && !r5.resume, '취소 뒤 출전 = 새 판');
    ok((await losses()) === L0 + 1, '취소한 판은 진 판 아님');

    // 5) 수를 둔 판은 취소로 못 닫음(기권으로만)
    const t2 = await call('/api/battle/turn', { id: r5.id, act: kitIds(r5.view)[0], turn: r5.view.turn }, tok);
    if (t2.status === 200 && !t2.over) {
      const c2 = await call('/api/battle/cancel', { id: r5.id }, tok);
      ok(c2.status === 400, '수를 둔 판은 취소 안 됨');
    }
  }
} catch (e) { fails++; console.log('오류:', e); }
finally {
  srv.kill();
  await sleep(200);
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(fails ? `실패 ${fails} / ${n}` : `통과 ${n}개`);
if (fails) { console.log(out.slice(-2000)); process.exit(1); }
