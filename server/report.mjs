// 플레이 기록 보고서(사용자 2026-10-16 "패턴 데이터를 모아서 유의미한 자료로 활용하자") — 밸런스·재미 판단용 숫자 모음.
//   node server/report.mjs                 → 최근 7일, 화면에 출력
//   node server/report.mjs --days 30 --out docs/play-report.md   (저장소에 남길 땐 계정 번호가 없는 이 요약만)
//   node server/report.mjs --db 다른.db
//   node server/report.mjs --url https://pulloseum.getchat.workers.dev   (올린 서버 — 관리 열쇠 = cf/.admin-key, 깃 밖)
//  계정마다의 원본 기록은 server/data/ 안에만 있음(깃에 안 올림). 보고서는 모두 합계·비율이라 누가 무엇을 했는지는 안 드러남.
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SPECIES, SKILLS, PLANETS, STAGES, STAT_NAME } from '../v2/src/game/catalog.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DAYS = +arg('days', 7), DB = arg('db', join(HERE, 'data', 'pulloseum.db')), OUT = arg('out', null);
const URL_ = arg('url', null);
let data;
if (URL_) {
  const key = readFileSync(arg('key-file', join(HERE, '..', 'cf', '.admin-key')), 'utf8').trim();
  const r = await fetch(URL_.replace(/\/$/, '') + '/api/admin/export', { headers: { 'x-admin-key': key } });
  if (!r.ok) throw new Error('내보내기 실패 ' + r.status);
  data = await r.json();
} else {
  const db = new DatabaseSync(DB);
  data = { users: db.prepare('SELECT id, created, last_seen FROM users').all(), events: db.prepare('SELECT user_id, t, kind, data FROM events').all(), saves: db.prepare('SELECT user_id, state FROM saves').all() };
}
const EVENTS = data.events.map(e => ({ ...e, d: JSON.parse(e.data) })).sort((a, b) => a.t - b.t);
const now = Date.now(), from = now - DAYS * 864e5, DAY = 864e5;
const day = t => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 시간 날짜
const pct = (a, b) => (b ? (100 * a / b).toFixed(0) + '%' : '–');
const avg = (a, b) => (b ? (a / b).toFixed(1) : '–');
const nm = k => (SPECIES[k] ? SPECIES[k].name : k);
const skn = k => (SKILLS[k] ? SKILLS[k].name : { basic: '기본 공격', guard: '기본 방어', evade: '기본 회피', rest: '쉬기', switch: '교체', send: '내보내기' }[k] || k);
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; return o; };
const top = (o, n = 12) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

const users = data.users;
const ev = EVENTS.filter(e => e.t >= from);
const allEv = EVENTS;
const saves = data.saves.map(r => ({ uid: r.user_id, s: JSON.parse(r.state) }));
const L = [];
const w = s => L.push(s);
const table = (head, rows) => { w('| ' + head.join(' | ') + ' |'); w('|' + head.map(() => '---').join('|') + '|'); for (const r of rows) w('| ' + r.join(' | ') + ' |'); w(''); };

w(`# 풀로세움 플레이 기록 보고서`);
w(`기간: ${day(from)} ~ ${day(now)} (${DAYS}일) · 만든 때: ${new Date(now + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')}`);
w('');

// ── 1. 사람 ──
const active = new Set(ev.map(e => e.user_id).filter(Boolean));
const newU = users.filter(u => u.created >= from).length;
w('## 1. 사람');
w(`- 가입 전체 ${users.length}명 · 기간 안 새로 ${newU}명 · 기간 안 활동 ${active.size}명`);
const byDay = {};
for (const e of ev) if (e.user_id) (byDay[day(e.t)] = byDay[day(e.t)] || new Set()).add(e.user_id);
const dayAct = {};
for (const e of allEv) if (e.user_id) (dayAct[e.user_id] = dayAct[e.user_id] || new Set()).add(Math.floor((e.t + 9 * 3600e3) / DAY));
let d1n = 0, d1 = 0;
for (const u of users) { const s = dayAct[u.id]; if (!s) continue; const d0 = Math.floor((u.created + 9 * 3600e3) / DAY); if (d0 + 1 <= Math.floor((now + 9 * 3600e3) / DAY)) { d1n++; if (s.has(d0 + 1)) d1++; } }
w(`- 가입 다음 날 다시 온 비율: ${pct(d1, d1n)} (${d1}/${d1n})`);
// 하루 플레이 시간 어림(같은 날 기록 사이가 10분 안이면 이어서 논 것으로)
const sess = {};
for (const e of ev) { if (!e.user_id) continue; const s = sess[e.user_id] || (sess[e.user_id] = { last: 0, ms: 0, n: 0 }); if (e.t - s.last > 600000) s.n++; else s.ms += e.t - s.last; s.last = e.t; }
const ss = Object.values(sess), msSum = ss.reduce((a, s) => a + s.ms, 0), nSum = ss.reduce((a, s) => a + s.n, 0);
w(`- 한 번 접속에 노는 시간(어림): 평균 ${avg(msSum / 60000, nSum)}분 · 접속 ${nSum}번`);
table(['날짜', '활동한 사람'], Object.keys(byDay).sort().map(k => [k, byDay[k].size]));

// ── 2. 진행 ──
w('## 2. 진행(지금 세이브 기준)');
const lv = {}, stg = { 0: 0, 1: 0, 2: 0 }, farm = [], keys = {};
for (const { s } of saves) { inc(lv, s.user.level); for (const p of [...s.plants, ...s.storage]) { stg[p.stage]++; inc(keys, p.key); } farm.push(s.plants.length + s.storage.length); }
table(['재배사 레벨', '사람'], Object.keys(lv).sort((a, b) => a - b).map(k => ['Lv' + k, lv[k]]));
w(`- 식물(스마트팜 + 보관고) 평균 ${avg(farm.reduce((a, b) => a + b, 0), farm.length)}그루 · 단계: ${STAGES.map((n, i) => `${n} ${stg[i]}`).join(' · ')}`);
w(`- 많이 키우는 식물: ${top(keys, 6).map(([k, n]) => `${nm(k)} ${n}`).join(' · ') || '–'}`);
const firsts = { feed: '물·비료 주기', explore: '탐사', evolve: '진화', battle: '봇 판', pvp: '친구 대결', upgrade: '강화', plantSeed: '종자 심기', harvest: '수확' };
const did = Object.fromEntries(Object.keys(firsts).map(k => [k, new Set()]));
for (const e of allEvFull()) { const k = e.kind === 'act' ? (e.d.op === 'harvestAll' ? 'harvest' : e.d.op) : e.kind === 'pvp.result' ? 'pvp' : e.kind; if (did[k]) did[k].add(e.user_id); }
w(`- 한 번이라도 해 본 사람(가입 ${users.length}명 중): ${Object.entries(firsts).map(([k, n]) => `${n} ${pct(did[k].size, users.length)}`).join(' · ')}`);
w('');
function allEvFull() { return EVENTS.filter(e => e.kind === 'act' || e.kind === 'battle' || e.kind === 'pvp.result'); }

// ── 3. 봇 판 ──
w('## 3. 봇 판');
const bt = ev.filter(e => e.kind === 'battle');
const byMode = {};
for (const e of bt) { const m = byMode[e.d.mode] || (byMode[e.d.mode] = { n: 0, w: 0, t: 0, ff: 0 }); m.n++; if (e.d.win) m.w++; if (e.d.forfeit) m.ff++; else m.t += e.d.turns; }
table(['종류', '판', '승률', '평균 턴', '기권·버림'], Object.entries(byMode).map(([k, m]) => [k === 'swap3' ? '3:3 교체전' : '1:1 토너먼트', m.n, pct(m.w, m.n), avg(m.t, m.n - m.ff), m.ff]));
const sp = {}, vs = {}, sk = {}, skW = {};
for (const e of bt) {
  if (e.d.forfeit) continue;
  for (const p of e.d.mine || []) { const r = sp[p.key] || (sp[p.key] = { n: 0, w: 0 }); r.n++; if (e.d.win) r.w++; }
  for (const p of e.d.foes || []) { const r = vs[p.key] || (vs[p.key] = { n: 0, w: 0 }); r.n++; if (e.d.win) r.w++; }
  for (const [k, c] of Object.entries(e.d.picks || {})) { inc(sk, k, c); const r = skW[k] || (skW[k] = { n: 0, w: 0 }); r.n++; if (e.d.win) r.w++; }
}
w('내 식물 종별(판 · 승률) — 승률이 유난히 높거나 낮은 종 = 밸런스 확인');
table(['식물', '판', '승률'], Object.entries(sp).sort((a, b) => b[1].n - a[1].n).map(([k, r]) => [nm(k), r.n, pct(r.w, r.n)]));
w('상대 종별 내 승률(낮을수록 그 상대가 셈)');
table(['상대', '판', '내 승률'], Object.entries(vs).sort((a, b) => a[1].w / a[1].n - b[1].w / b[1].n).map(([k, r]) => [nm(k), r.n, pct(r.w, r.n)]));
w('많이 고른 수(그 수를 쓴 판의 승률)');
table(['수', '고른 횟수', '쓴 판', '그 판 승률'], top(sk, 15).map(([k, n]) => [skn(k), n, skW[k].n, pct(skW[k].w, skW[k].n)]));

// ── 4. 친구 대결 ──
w('## 4. 친구 대결');
const pv = ev.filter(e => e.kind === 'pvp'), why = {}, pw = {};
let pt = 0;
for (const e of pv) { inc(why, e.d.why); pt += e.d.turns; for (const p of [].concat(e.d.win || [])) inc(pw, p.key); }   // 3:3은 이긴 쪽 식물 셋
const n3 = pv.filter(e => e.d.mode === 'swap3').length;
w(`- 대결 ${pv.length}판(1:1 ${pv.length - n3} · 3:3 ${n3}) · 평균 ${avg(pt, pv.length)}턴 · 끝난 이유: ${Object.entries(why).map(([k, n]) => `${{ ko: '쓰러뜨림', forfeit: '기권', timeout: '시간 넘김', left: '나감' }[k] || k} ${n}`).join(' · ') || '–'}`);
w(`- 이긴 식물: ${top(pw, 8).map(([k, n]) => `${nm(k)} ${n}`).join(' · ') || '–'}`);
const capped = ev.filter(e => e.kind === 'pvp.result' && e.d.capped).length;
w(`- 보상 없이 끝난 판(3턴 미만·하루 한도): ${capped}`);
w('');

// ── 5. 양육 ──
w('## 5. 양육');
const acts = ev.filter(e => e.kind === 'act'), ops = {};
for (const e of acts) inc(ops, e.d.op);
w(`- 한 일: ${top(ops, 20).map(([k, n]) => `${k} ${n}`).join(' · ') || '–'}`);
let water = 0, fert = 0, ups = 0;
for (const e of acts.filter(e => e.d.op === 'feed')) { if (e.d.a.kind === 'fert') fert += e.d.r.used; else water += e.d.r.used; ups += (e.d.r.ups || []).length; }
w(`- 물 ${water} · 비료 ${fert} 줌 → 레벨업 ${ups}번`);
const learned = {};
for (const e of acts.filter(e => e.d.op === 'evolve')) for (const g of e.d.r.got || []) inc(learned, g.id);
w(`- 진화 ${ops.evolve || 0}번 · 진화 때 핀 기술: ${top(learned, 10).map(([k, n]) => `${skn(k)} ${n}`).join(' · ') || '–'}`);
// 강화: 지금 세이브의 식물마다 능력치별 포인트 → 몰빵(한 능력치에 70% 넘게) 비율
const upSum = {}; let plantsUp = 0, focused = 0;
for (const { s } of saves) for (const p of [...s.plants, ...s.storage]) {
  const tot = Object.values(p.up || {}).reduce((a, b) => a + b, 0); if (!tot) continue;
  plantsUp++; for (const [k, v] of Object.entries(p.up)) inc(upSum, k, v);
  if (Math.max(...Object.values(p.up)) / tot > 0.7) focused++;
}
const upAll = Object.values(upSum).reduce((a, b) => a + b, 0);
w(`- 강화 포인트 쓴 곳: ${Object.entries(upSum).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${STAT_NAME[k] || k} ${pct(n, upAll)}`).join(' · ') || '–'} · 한 능력치 몰빵 식물 ${pct(focused, plantsUp)} (${focused}/${plantsUp})`);
w(`- 포인트 초기화 ${ops.resetPoints || 0} · 거름 ${ops.merge || 0} · 접목 ${ops.graft || 0} · 회귀 주사 ${ops.regress || 0} · 판매 ${ops.sell || 0} · 해체 ${ops.dismantle || 0} · 종자 판매 ${(ops.sellSeed || 0) + (ops.sellSeeds || 0)}`);
w('');

// ── 6. 경제(돈·보석·물·비료가 어디서 들고 어디로 나갔나) ──
w('## 6. 경제');
const flow = {};
const add = (src, d) => { for (const [k, v] of Object.entries(d || {})) if (['credits', 'gems', 'water', 'fert', 'regress', 'fuel'].includes(k)) { const f = flow[k] || (flow[k] = { in: {}, out: {} }); if (v > 0) inc(f.in, src, v); else if (v < 0) inc(f.out, src, -v); } };
for (const e of ev) { if (e.kind === 'act') add(e.d.op, e.d.d); else if (e.kind === 'battle') add('봇 판', e.d.d); else if (e.kind === 'pvp.result') add('친구 대결', e.d.d); }
const KN = { credits: '돈', gems: '보석', water: '물', fert: '비료', regress: '회귀 주사', fuel: '연료' };
for (const [k, f] of Object.entries(flow)) {
  const i = Object.values(f.in).reduce((a, b) => a + b, 0), o = Object.values(f.out).reduce((a, b) => a + b, 0);
  w(`- **${KN[k]}** 들어옴 ${i} (${top(f.in, 6).map(([s, n]) => `${s} ${n}`).join(', ')}) · 나감 ${o} (${top(f.out, 6).map(([s, n]) => `${s} ${n}`).join(', ') || '–'})`);
}
w('');

// ── 7. 탐사 ──
w('## 7. 탐사');
const ex = acts.filter(e => e.d.op === 'explore'), pl = {}; let rare = 0, legend = 0, shiny = 0, seeds = 0;
for (const e of ex) { inc(pl, e.d.a.planet); for (const g of e.d.r.got || []) if (g.kind === 'seed') { seeds++; if (g.seed.legend) legend++; if (g.seed.shiny) shiny++; if (SPECIES[g.seed.key] && SPECIES[g.seed.key].rarity === 'rare') rare++; } }
w(`- 탐사 ${ex.length}번 · 종자 ${seeds} (희귀 ${rare} · 전설 ${legend} · 색 변종 ${shiny})`);
w(`- 행성별: ${top(pl, 11).map(([k, n]) => `${(PLANETS.find(p => p.id === k) || {}).name || k} ${n}`).join(' · ') || '–'}`);

const text = L.join('\n') + '\n';
if (OUT) { writeFileSync(OUT, text); console.log('저장: ' + OUT); } else process.stdout.write(text);
