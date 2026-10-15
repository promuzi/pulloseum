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
await call('/api/room/join', { code: CODE });
let view = null, games = 0, turn = 0;
const r = await fetch(BASE + '/api/room/events', { headers: { authorization: 'Bearer ' + token } });
const rd = r.body.getReader(), dec = new TextDecoder();
let buf = '';
await call('/api/room/ready', { on: true });
const pick = v => { const k = [...v.me.kit].reverse().find(x => x.act === 'attack' && (x.cost || 0) <= v.me.energy) || v.me.kit[0]; return k.id; };
async function moveSoon(v) { await sleep(600 + Math.random() * 900); try { await call('/api/room/move', { act: pick(v), turn: v.turn }); } catch (e) { console.log('수 실패', e.message); } }
for (;;) {
  const { value, done } = await rd.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let i;
  while ((i = buf.indexOf('\n\n')) >= 0) {
    const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
    let type = null, data = null;
    for (const line of chunk.split('\n')) { if (line.startsWith('event: ')) type = line.slice(7); else if (line.startsWith('data: ')) data = JSON.parse(line.slice(6)); }
    if (type === 'start') { view = data.view; turn = 0; console.log('대결 시작 — 상대', view.foe.name); moveSoon(view); }
    else if (type === 'turn') { view = data.view; turn++; if (!view.over) moveSoon(view); }
    else if (type === 'end') {
      games++; console.log(`끝: ${data.win ? '가짜 친구 승' : '가짜 친구 패'} (${data.why}, ${data.turns}턴)`);
      if (games >= GAMES) { await call('/api/room/leave', {}); process.exit(0); }
      await sleep(1500); await call('/api/room/ready', { on: true });
    } else if (type === 'emote') { if (!data.me) { await sleep(500); await call('/api/room/emote', { i: 4 }); } }
  }
}
