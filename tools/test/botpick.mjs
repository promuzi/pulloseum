// 봇 상대 고르기(2026-10-22 사용자):
//  "첫 계정 생성 후 튜토리얼식 전투는 상성이 좋은 애로 배치" · "식물의 종류는 완전랜덤이 아닌 어려워질 수록 멀리 있는 행성?의 식물이 등장하도록"
//   node tools/test/botpick.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { botPlant, orbitOf, favorable, ORBIT_CAP } from '../../v2/src/game/fight.js';
import { makeRng } from '../../v2/src/battle/rules.js';
import { SPECIES } from '../../v2/src/game/catalog.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };

// 1) 대회 단계마다 나오는 궤도
for (let tier = 0; tier < ORBIT_CAP.length; tier++) {
  const cnt = {};
  for (let i = 0; i < 1500; i++) { const b = botPlant(makeRng(1000 * tier + i), 1, 3, tier, { tier }); const o = orbitOf(b.key); cnt[o] = (cnt[o] || 0) + 1; }
  const cap = ORBIT_CAP[tier], over = Object.keys(cnt).filter(o => +o > cap);
  ok(!over.length, `단계 ${tier}: 궤도 ${cap}보다 먼 식물이 나옴 ${JSON.stringify(cnt)}`);
  ok((cnt[cap] || 0) > 0, `단계 ${tier}: 가장 먼 궤도(${cap}) 식물이 한 번도 안 나옴 ${JSON.stringify(cnt)}`);
  if (tier === ORBIT_CAP.length - 1) ok((cnt[4] || 0) > (cnt[1] || 0), `맨 위 단계: 먼 궤도가 가까운 궤도보다 많이 ${JSON.stringify(cnt)}`);
  console.log(`단계 ${tier}(궤도 ${cap}까지):`, JSON.stringify(cnt));
}
// 2) 튜토리얼식 = 상성이 좋은 상대만
for (const el of ['grass', 'fire', 'water']) {
  for (let i = 0; i < 300; i++) {
    const b = botPlant(makeRng(77 + i), 0, 1, 0, { tier: 0, favorEl: el });
    if (!favorable(el, b.key) || SPECIES[b.key].form) { ok(false, `${el} 튜토리얼 상대가 불리하지 않음: ${b.key}(${SPECIES[b.key].el})`); break; }
  }
}
ok(true, '튜토리얼 상대 = 내 속성이 잘 듣는 종');

// 3) 서버: 새 계정 첫 두 판은 상성 좋은 상대 · 그 뒤는 보통
const PORT = 19900 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'pullo-bp-'));
const srv = spawn(process.execPath, ['--no-warnings', 'server/index.mjs', '--port', String(PORT), '--db', join(dir, 't.db')], { stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(path, body, token) {
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
}
try {
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {} await sleep(100); }
  for (const [login, starter] of [['dana', 'cactus_fire'], ['erin', 'aqua'], ['finn', 'flower_grass']]) {
    const A = await call('/api/register', { age14: true, login, password: 'secret1', nickname: login, starter });
    ok(A.status === 200, '가입 ' + login);
    const el = SPECIES[starter].el;
    for (let k = 0; k < 2; k++) {
      const r = await call('/api/battle/start', {}, A.token);
      ok(r.status === 200 && favorable(el, r.view.foe.key), `${starter} ${k + 1}번째 판 상대가 상성상 유리: ${r.view && r.view.foe.key}`);
      const f = await call('/api/battle/forfeit', { id: r.id }, A.token);   // 진 판 하나 = 다음 판으로
      ok(f.status === 200, '기권');
    }
  }
} catch (e) { fails++; console.log('오류:', e); }
finally { srv.kill(); await sleep(200); try { rmSync(dir, { recursive: true, force: true }); } catch {} }
console.log(fails ? `실패 ${fails} / ${n}` : `통과 ${n}개`);
if (fails) process.exit(1);
