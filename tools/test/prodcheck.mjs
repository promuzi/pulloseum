// 올리기 전 실제 저장으로 미리 돌려 보기(2026-10-22 사용자 "친구서버에 올릴 때 버그나 데이터 손실이 없도록 할 수 있어?"):
//  친구 서버 저장 내보내기(관리 열쇠 — server/report.mjs 와 같은 주소, 파일은 server/data/backup/ · 깃 밖)를 임시 메모리 DB에 넣고
//  지금 코드의 서버(server/game.mjs)로 계정마다: 불러오기(판 번호 옮기기 + 원본 보관) → 식물 · 카드 · 돈 · 종자 수 그대로인지 →
//  모든 식물 전투 유닛 · 손패 → 지금 배치 그대로 setSlots(카드 귀속 규칙이 기존 배치를 받는지) → 봇 판 시작 → 끝날 때까지 두기(또는 기권) → 다시 불러오기.
//  계정 이름 · 저장 내용은 찍지 않고 번호 · 개수 · 오류 문구만.
//   node tools/test/prodcheck.mjs --file server/data/backup/<내보내기>.json
//   node tools/test/prodcheck.mjs --url https://pulloseum.getchat.workers.dev   (내려받아 server/data/backup/ 에 저장한 뒤 그 파일로)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../../server/db.mjs';
import { makeGame } from '../../server/game.mjs';
import * as L from '../../v2/src/game/logic.js';
import { unitOf, kitOfPlant } from '../../v2/src/game/fight.js';
import { CARDS } from '../../v2/src/game/cards.js';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..', '..');
const arg = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
let file = arg('file');
const url = arg('url');
if (url) {
  const key = readFileSync(resolve(ROOT, 'cf', '.admin-key'), 'utf8').trim();
  const r = await fetch(url.replace(/\/$/, '') + '/api/admin/export', { headers: { 'x-admin-key': key } });
  if (!r.ok) { console.log('내려받기 실패', r.status); process.exit(1); }
  const body = await r.text(), d = new Date(), pad = n => String(n).padStart(2, '0');
  const dir = resolve(ROOT, 'server', 'data', 'backup'); mkdirSync(dir, { recursive: true });
  file = resolve(dir, `prod-export-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`);
  writeFileSync(file, body);
  console.log('친구 서버 저장 내려받음 →', file, `(${(body.length / 1024).toFixed(0)}KB)`);
}
if (!file || !existsSync(file)) { console.log('내보내기 파일이 없어요(--file 또는 --url)'); process.exit(1); }
const ex = JSON.parse(readFileSync(file, 'utf8'));
const saves = ex.saves || [], users = ex.users || [];

const { q, db } = openDb(':memory:');
const addUser = db.prepare('INSERT INTO users (id, login, pass, nickname, created, last_seen) VALUES (?, ?, ?, ?, ?, ?)');
const addSave = db.prepare('INSERT INTO saves (user_id, state, version, updated) VALUES (?, ?, 1, ?)');
const uids = new Set(saves.map(r => r.user_id));
for (const u of users) if (uids.has(u.id)) addUser.run(u.id, 'u' + u.id, 'x', 'n' + u.id, u.created || 0, u.last_seen || 0);
for (const r of saves) { if (!users.some(u => u.id === r.user_id)) addUser.run(r.user_id, 'u' + r.user_id, 'x', 'n' + r.user_id, 0, 0); addSave.run(r.user_id, r.state, Date.now()); }
const game = makeGame({ q, log: () => {} });

// 저장 한 판의 개수들(카드 = 가방 + 모든 식물에 끼운 것)
const cardsOn = p => [...(p.cards || []), ...(p.pstore || []), ...((p.skills && p.skills.battle) || []), ...((p.skills && p.skills.store) || [])].filter(id => id && CARDS[id]).length;
const tally = s => ({
  plants: (s.plants || []).length, storage: (s.storage || []).length, seeds: (s.seeds || []).length, scions: (s.scions || []).length,
  cards: Object.values(s.cards || {}).reduce((a, n) => a + (n > 0 ? n : 0), 0) + [...(s.plants || []), ...(s.storage || [])].reduce((a, p) => a + cardsOn(p), 0),
  credits: (s.wallet || {}).credits, gems: (s.wallet || {}).gems, level: (s.user || {}).level,
});
const errs = new Map(), notes = new Map(), put = (M, uid, what, e) => { const k = `${what}: ${e && e.message ? e.message : e}`; if (!M.has(k)) M.set(k, []); M.get(k).push(uid); };
const bad = (uid, what, e) => put(errs, uid, what, e), note = (uid, what, e) => put(notes, uid, what, e);   // note = 원래 있던 정상 동작(옛 계정 카드 한 장 선물 · 리그 조건 막힘)
let n = 0, battles = 0, finished = 0, backups = 0;
const NOW = Date.now();
for (const r of saves) {
  const uid = r.user_id; n++;
  let before, gift = 0;
  try { const s0 = JSON.parse(r.state); before = tally(s0); gift = s0.cardsV ? 0 : 1; } catch (e) { bad(uid, '원본 읽기', e); continue; }   // 카드가 생기기 전 계정 = 처음 불러올 때 일반 카드 한 장(normCards — 원래 동작)
  let s;
  try { s = game.state(uid, NOW).state; } catch (e) { bad(uid, '불러오기', e); continue; }
  if (q.backups.all(uid).length) backups++;
  const after = tally(s);
  for (const k of ['plants', 'storage', 'seeds', 'scions', 'cards', 'credits', 'gems', 'level']) {
    if (k === 'cards' && after.cards === before.cards + gift && gift) { note(uid, '옛 계정 일반 카드 한 장 선물', `${before.cards} → ${after.cards}`); continue; }
    if (before[k] !== after[k]) bad(uid, `개수 바뀜(${k})`, `${before[k]} → ${after[k]}`);
  }
  if (s.ver !== L.SAVE_VER) bad(uid, '판 번호', s.ver);
  for (const v of [s.wallet.credits, s.wallet.gems, ...Object.values(s.items || {})]) if (!Number.isFinite(v) || v < 0) { bad(uid, '돈 · 물건 값', v); break; }
  for (const p of [...s.plants, ...(s.storage || [])]) {
    try { const u = unitOf('me', p); if (!(u.hp > 0 && u.atk > 0) || !kitOfPlant(p).length) bad(uid, '전투 유닛', 'hp · atk · 손패'); } catch (e) { bad(uid, '전투 유닛', e); }
  }
  for (const p of s.plants) {
    try { game.act(uid, 'setSlots', { id: p.uid, ...L.slotLayout(p) }, NOW); } catch (e) { bad(uid, '지금 배치 그대로 setSlots', e); }
  }
  try {
    const st = game.battleStart(uid, NOW + 1000);
    battles++;
    let over = false;
    const tries = st.mode === 'swap3' ? [{ kind: 'skill', id: 'basic' }, { kind: 'rest' }, { kind: 'send', to: 0 }, { kind: 'send', to: 1 }, { kind: 'send', to: 2 }] : ['basic', 'rest'];   // 평타 → 쉬기 → (3:3) 다음 식물 내보내기
    for (let t = 0; t < 60 && !over; t++) {
      let done = false, last = null;
      for (const a of tries) { try { over = game.battleTurn(uid, st.id, a, NOW + 2000 + t).over; done = true; break; } catch (e) { last = e; } }
      if (!done) { bad(uid, '봇 판 수', last); break; }
    }
    if (over) finished++; else game.battleForfeit(uid, st.id, NOW + 9000);
  } catch (e) { if (/리그는/.test(e.message)) note(uid, '봇 판 리그 조건(원래 막힘 — 리그를 바꾸라는 안내)', e); else bad(uid, '봇 판', e); }
  try { const s2 = game.state(uid, NOW + 10000).state; const a2 = tally(s2); if (a2.plants !== after.plants || a2.cards !== after.cards) bad(uid, '판 뒤 개수', JSON.stringify([after.plants, a2.plants, after.cards, a2.cards])); } catch (e) { bad(uid, '판 뒤 불러오기', e); }
}
console.log(`계정 ${n}개 · 원본 보관 ${backups}개 · 봇 판 ${battles}개(끝까지 ${finished})`);
for (const [k, list] of notes) console.log(`  (정상) ${k} — 계정 ${list.length}개`);
if (!errs.size) console.log('실제 저장 미리 돌려 보기: 문제 없음');
else { console.log(`문제 ${errs.size}가지:`); for (const [k, list] of errs) console.log(`  ${k} — 계정 ${list.length}개(번호 ${list.slice(0, 8).join(', ')}${list.length > 8 ? ' …' : ''})`); }
process.exit(errs.size ? 1 : 0);
