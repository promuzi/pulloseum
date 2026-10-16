// 혼자 친구 대결 시험: 시험용 계정으로 방에 들어와 준비하고, 턴마다 알아서 기술을 고르는 '가짜 친구'
//   node tools/test/pvpfriend.mjs --code ABC123 [--base http://localhost:8788] [--login pvpbot] [--games 1]
//   (계정이 없으면 만들고, 있으면 로그인 — 비밀번호는 --pw 로 바꿀 수 있음. 내 PC 시험 서버에서만 쓸 것)
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:8788'), CODE = arg('code', ''), LOGIN = arg('login', 'pvpbot'), PW = arg('pw', 'pvpbot-pass'), GAMES = +arg('games', 1);
if (!CODE) { console.log('--code 방코드 를 넣어 주세요'); process.exit(1); }
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE) && process.argv.indexOf('--pw') < 0) { console.log('내 PC 시험 서버가 아니면 --pw 로 비밀번호를 정해 주세요(기본 비밀번호는 시험 서버 전용)'); process.exit(1); }
let token = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function call(path, body) {
  const r = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}
try { token = (await call('/api/login', { login: LOGIN, password: PW })).token; }
catch { token = (await call('/api/register', { login: LOGIN, password: PW, nickname: '가짜 친구', starter: 'cactus_fire' })).token; }
console.log('들어감', LOGIN);
{ const me = await call('/api/me'); for (const sd of me.state.seeds.slice(0, Math.max(0, 3 - me.state.plants.length))) await call('/api/act', { op: 'plantSeed', args: { seed: sd.id } }); }   // 3:3이면 식물 셋(처음 종자 둘을 심음)
await call('/api/room/join', { code: CODE });
let view = null, games = 0, turn = 0, after = -1;
await call('/api/room/ready', { on: true });
const pick = v => { const k = [...v.me.kit].reverse().find(x => x.act === 'attack' && (x.cost || 0) <= v.me.energy) || v.me.kit[0]; return k.id; };
// 3:3(교체전): 내 쪽이 쓰러졌으면 다음 식물(살아 있는 첫 식물), 상대 쪽만이면 기다림, 아니면 기술(가끔 교체)
const SW_K = +arg('switch', 0.12);
function act3(v) {
  const alive = v.team.me.map((u, i) => (u.hp > 0 && i !== v.act.me ? i : -1)).filter(i => i >= 0);
  if (v.need === 'me' || v.need === 'both') return { kind: 'send', to: alive[0] };
  if (v.need) return null;
  if (alive.length && Math.random() < SW_K) return { kind: 'switch', to: alive[Math.floor(Math.random() * alive.length)] };
  const u = v.team.me[v.act.me], k = [...u.kit].reverse().find(x => x.act === 'attack' && (x.cost || 0) <= v.pool.me) || u.kit[0];
  return { kind: 'skill', id: k.id };
}
async function moveSoon(v) {
  const a = v.mode === 'swap3' ? act3(v) : pick(v);
  if (!a) return;
  await sleep(600 + Math.random() * 900);
  try { await call('/api/room/move', { act: a, turn: v.turn }); } catch (e) { console.log('수 실패', e.message); }
}
for (;;) {   // 기다리는 요청으로 소식 받기(화면과 같은 길)
  const j = await call('/api/room/poll?after=' + after);
  after = j.seq;
  for (const { type, data } of j.events || []) {
    if (type === 'start') { view = data.view; turn = 0; console.log('대결 시작 —', view.mode === 'swap3' ? '3:3' : '상대 ' + view.foe.name); moveSoon(view); }
    else if (type === 'turn') { view = data.view; turn++; if (!view.over) moveSoon(view); }
    else if (type === 'send') { view = data.view; moveSoon(view); }
    else if (type === 'end') {
      games++; console.log(`끝: ${data.win ? '가짜 친구 승' : '가짜 친구 패'} (${data.why}, ${data.turns}턴)`);
      if (games >= GAMES) { await call('/api/room/leave', {}); process.exit(0); }
      await sleep(1500); await call('/api/room/ready', { on: true });
    } else if (type === 'emote') { if (!data.me) { await sleep(500); await call('/api/room/emote', { i: 4 }); } }
  }
}
