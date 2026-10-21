// 서버 길(주소 → 할 일) — Node(server/index.mjs)와 Cloudflare(cf/src/worker.js)가 같이 씀. 들어오고 나가는 꼴만 플랫폼이 맞춰 줌.
//  req = { method, path, query: URLSearchParams, header(이름), ip, body(객체), onClose(fn) } → { status, body } (기다리는 요청은 Promise) · API 주소가 아니면 null
//  하는 일: 계정(아이디·비밀번호 → 로그인 열쇠) · 자동 저장(일 하나마다) · 봇 판(서버가 한 턴씩) · 친구 대결 방(초대 코드 · 기다리는 요청)
import { hashPass, checkPass, newSession, userOfToken, endSession, allowTry, LOGIN_RE } from './auth.mjs';
import { timingSafeEqual } from 'node:crypto';
import { Err, cleanCoupon } from '../v2/src/game/logic.js';
import { STARTERS } from '../v2/src/game/catalog.js';

export class HttpErr extends Error { constructor(code, msg) { super(msg); this.code = code; } }

// adminKey = 관리 열쇠(Cloudflare 비밀값 ADMIN_KEY · PC 환경변수 PULLO_ADMIN_KEY) — 없으면 관리 주소는 아예 없음(404)
// googleClientId = 구글 로그인 클라이언트 ID(공개값 — Cloudflare 변수 GOOGLE_CLIENT_ID · PC PULLO_GOOGLE_CLIENT_ID) — 없으면 구글 단추를 안 보임
//  구글 계정 = login 'g:<구글 sub>'(아이디 규칙과 겹치지 않음) · 비밀번호 없음 · provider 'google'(2026-10-16 사용자 "남은 거 다해줘" — 구글 로그인)
export function makeApi({ q, game, rooms, log, adminKey = null, googleClientId = null, fetchFn = globalThis.fetch }) {
  const GID = googleClientId ? String(googleClientId).trim() : '';
  const pub = u => ({ id: u.id, login: u.provider === 'google' ? '구글 계정' : u.login, nickname: u.nickname, provider: u.provider || 'local' });   // 화면에 보일 계정(구글 sub는 안 보냄)
  // 구글 접근 토큰 확인: tokeninfo의 받는 쪽(aud/azp)이 우리 클라이언트 ID인지 → userinfo로 이름. 남의 앱에서 받은 토큰은 거절
  //  idToken = 안드로이드 앱(네이티브 구글 로그인 — 웹뷰 팝업은 구글이 막음)이 주는 ID 토큰: 받는 쪽 = 우리 웹 클라이언트 ID · 발급 = 구글 · 안 지남
  async function googleWho(token, idToken, now) {
    if (!GID) throw new HttpErr(404, '없는 주소예요');
    const t = String(idToken || token || '');
    if (!t || t.length > 4096) throw new Err('구글 로그인이 끊겼어요 — 다시 해 주세요');
    if (idToken) {
      const it = await fetchFn('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(t)).then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (!it || it.aud !== GID || !/^(https:\/\/)?accounts\.google\.com$/.test(String(it.iss || '')) || !it.sub || !(Number(it.exp) * 1000 > now)) throw new Err('구글 로그인을 확인하지 못했어요 — 다시 해 주세요');
      return { sub: String(it.sub), name: it.given_name || it.name || '' };
    }
    const ti = await fetchFn('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(t)).then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (!ti || (ti.aud !== GID && ti.azp !== GID) || !ti.sub || !(Number(ti.expires_in) > 0)) throw new Err('구글 로그인을 확인하지 못했어요 — 다시 해 주세요');
    const ui = await fetchFn('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: 'Bearer ' + t } }).then(r => (r.ok ? r.json() : null)).catch(() => null);
    return { sub: String(ti.sub), name: (ui && (ui.given_name || ui.name)) || '' };
  }
  const AK = adminKey ? String(adminKey).trim() : '';   // 비밀값을 파이프로 넣으면 끝에 줄바꿈이 붙을 수 있어 양쪽 다 다듬음
  const isAdmin = req => { const k = Buffer.from(String(req.header('x-admin-key') || '').trim()), a = Buffer.from(AK); return !!AK && k.length === a.length && timingSafeEqual(k, a); };   // 길이는 바이트로(한글이 섞이면 글자 수만 같아도 비교가 터짐)
  const hits = new Map(), regs = new Map();   // 너무 잦은 요청(계정마다 10초에 80번) · 가입 제한(IP마다 하루 10개)
  let lastPurge = 0;
  function rate(key, now, max = 80, win = 10000) {
    const r = hits.get(key) || { n: 0, t0: now };
    if (now - r.t0 > win) { r.n = 0; r.t0 = now; }
    r.n++; hits.set(key, r);
    if (r.n > max) throw new HttpErr(429, '너무 빨라요 — 잠시 뒤에 다시 해 주세요');
  }
  function maintain(now) {   // 1분마다: 오래된 요청 세기 · 지난 로그인 열쇠 · 일주일 지난 끝난 봇 판 정리
    if (now - lastPurge < 60000) return;
    lastPurge = now;
    for (const [k, r] of hits) if (now - r.t0 > 60000) hits.delete(k);
    q.purgeSessions.run(now); q.purgeBattles.run(now - 7 * 864e5);
  }
  const tokenOf = req => { const h = req.header('authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : null; };
  const cleanNick = v => String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 12);
  const couponCode = v => { const c = String(v || '').toUpperCase().replace(/[\s-]/g, ''); return /^[A-Z0-9]{4,24}$/.test(c) ? c : ''; };   // 쿠폰 번호 = 영문 · 숫자 4~24자(띄어쓰기 · 붙임표 · 대소문자 무시)
  function authed(req, now) {
    const u = userOfToken(q, tokenOf(req), now);
    if (!u) throw new HttpErr(401, '다시 로그인해 주세요');
    rate('u' + u.id, now);
    q.seen.run(now, u.id);
    return u;
  }

  const API = {
    'GET /api/health': () => ({ ok: true, rooms: rooms.count() }),
    'GET /api/config': () => ({ google: GID || null }),
    // 구글: 있는 계정이면 로그인, 처음이면 { need: 'register' } → 화면이 처음 식물을 고르게 한 뒤 starter와 함께 다시
    'POST /api/google': async (req, b, now) => {
      if (!allowTry('g' + req.ip, now)) throw new HttpErr(429, '시도가 너무 많아요 — 10분 뒤에 다시 해 주세요');
      const who = await googleWho(b.token, b.idToken, now), login = 'g:' + who.sub, u = q.userByLogin.get(login);
      if (u) { const token = newSession(q, u.id, now), st = game.state(u.id, now); log(u.id, 'login', { provider: 'google' }, now); return { token, user: pub(u), ...st }; }
      const starter = String(b.starter || ''), nick = cleanNick(b.nickname || who.name) || '재배사';
      if (!starter) return { need: 'register', name: cleanNick(who.name) };
      if (!STARTERS.includes(starter)) throw new Err('처음 식물을 골라 주세요');
      const day = Math.floor(now / 864e5), k = req.ip + ':' + day, n = regs.get(k) || 0;
      if (n >= 10) throw new HttpErr(429, '오늘은 더 만들 수 없어요');
      const r = q.addUser.run(login, '!google', nick, now), uid = Number(r.lastInsertRowid);
      q.setProvider.run('google', uid); regs.set(k, n + 1);
      const s = game.create(uid, { nickname: nick, starter }, now), token = newSession(q, uid, now);
      log(uid, 'register', { starter, provider: 'google' }, now);
      return { token, user: { id: uid, login: '구글 계정', nickname: nick, provider: 'google' }, state: s, ver: 1 };
    },
    'POST /api/register': (req, b, now) => {
      const day = Math.floor(now / 864e5), k = req.ip + ':' + day, n = regs.get(k) || 0;
      if (n >= 10) throw new HttpErr(429, '오늘은 더 만들 수 없어요');
      const login = String(b.login || '').trim().toLowerCase(), pw = String(b.password || ''), nick = cleanNick(b.nickname), starter = String(b.starter || '');
      if (!LOGIN_RE.test(login)) throw new Err('아이디는 영어 소문자·숫자·밑줄 3~20자예요');
      if (pw.length < 6 || pw.length > 72) throw new Err('비밀번호는 6~72자예요');
      if (!nick) throw new Err('별명을 써 주세요');
      if (!STARTERS.includes(starter)) throw new Err('처음 식물을 골라 주세요');
      if (q.userByLogin.get(login)) throw new Err('이미 있는 아이디예요');
      const r = q.addUser.run(login, hashPass(pw), nick, now), uid = Number(r.lastInsertRowid);
      regs.set(k, n + 1);
      const s = game.create(uid, { nickname: nick, starter }, now), token = newSession(q, uid, now);
      log(uid, 'register', { starter }, now);
      return { token, user: { id: uid, login, nickname: nick, provider: 'local' }, state: s, ver: 1 };
    },
    'POST /api/check': (req, b, now) => {   // 가입 전 아이디 쓸 수 있는지(식물 고르기 전에 알려 주려고)
      if (!allowTry('c' + req.ip, now)) throw new HttpErr(429, '잠시 뒤에 다시 해 주세요');
      const login = String(b.login || '').trim().toLowerCase();
      if (!LOGIN_RE.test(login)) throw new Err('아이디는 영어 소문자·숫자·밑줄 3~20자예요');
      if (q.userByLogin.get(login)) throw new Err('이미 있는 아이디예요');
      return { ok: true };
    },
    'POST /api/login': (req, b, now) => {
      if (!allowTry(req.ip, now)) throw new HttpErr(429, '시도가 너무 많아요 — 10분 뒤에 다시 해 주세요');
      const login = String(b.login || '').trim().toLowerCase(), pw = String(b.password || '');
      const u = q.userByLogin.get(login);
      if (!u || !checkPass(pw, u.pass)) throw new Err('아이디나 비밀번호가 맞지 않아요');
      const token = newSession(q, u.id, now), st = game.state(u.id, now);
      log(u.id, 'login', {}, now);
      return { token, user: pub(u), ...st };
    },
    'POST /api/logout': (req) => { endSession(q, tokenOf(req)); return { ok: true }; },
    // 계정 지우기(구글 플레이 정책 — 앱 안에서 지울 수 있어야 함): 아이디 계정 = 비밀번호 다시 · 구글 계정 = 확인 글자 '지우기'. 되돌릴 수 없음
    'POST /api/account/delete': (req, b, now) => {
      const u = authed(req, now);
      if (!allowTry('d' + req.ip, now)) throw new HttpErr(429, '시도가 너무 많아요 — 10분 뒤에 다시 해 주세요');
      if (u.provider === 'google') { if (String(b.confirm || '').trim() !== '지우기') throw new Err("확인 칸에 '지우기'라고 써 주세요"); }
      else { const row = q.userByLogin.get(u.login); if (!row || !checkPass(String(b.password || ''), row.pass)) throw new Err('비밀번호가 맞지 않아요'); }
      rooms.leave(u.id, now);
      q.delUserSessions.run(u.id); q.delSave.run(u.id); q.delBattles.run(u.id); q.delEvents.run(u.id); q.delCouponUses.run(u.id); q.delBackups.run(u.id); q.delUser.run(u.id);
      return { ok: true };
    },
    'GET /api/me': (req, b, now) => { const u = authed(req, now); return { user: pub(u), ...game.state(u.id, now) }; },
    // 쿠폰 받기(2026-10-17 사용자 "쿠폰코드 입력해서 상품 주는거"): 계정마다 한 번 · 다 쓰인 · 기간 지난 쿠폰은 안 됨 · 틀린 번호를 마구 넣지 못하게 10분에 12번까지
    'POST /api/coupon': (req, b, now) => {
      const u = authed(req, now);
      if (!allowTry('k' + u.id, now) || !allowTry('k' + req.ip, now)) throw new HttpErr(429, '시도가 너무 많아요 — 10분 뒤에 다시 해 주세요');
      const code = couponCode(b.code);
      if (!code) throw new Err('쿠폰 번호를 확인해 주세요(영문 · 숫자 4~24자)');
      const c = q.coupon.get(code);
      if (!c) throw new Err('없는 쿠폰이에요');
      if (c.expires && now > c.expires) throw new Err('기간이 끝난 쿠폰이에요');
      if (q.couponUsed.get(code, u.id)) throw new Err('이미 받은 쿠폰이에요');
      if (c.max_uses && c.used >= c.max_uses) throw new Err('다 쓰인 쿠폰이에요');
      let rw = {}; try { rw = JSON.parse(c.reward); } catch {}
      const out = game.coupon(u.id, rw, code, now);
      q.useCoupon.run(code, u.id, now); q.bumpCoupon.run(code);
      return { ...out, code };
    },
    'POST /api/act': (req, b, now) => { const u = authed(req, now); return game.act(u.id, String(b.op || ''), b.args || {}, now); },
    'POST /api/battle/start': (req, b, now) => { const u = authed(req, now); return game.battleStart(u.id, now); },
    'POST /api/battle/turn': (req, b, now) => { const u = authed(req, now); return game.battleTurn(u.id, b.id, b.act, now, b.turn == null ? null : +b.turn); },
    'POST /api/battle/cancel': (req, b, now) => { const u = authed(req, now); return game.battleCancel(u.id, b.id, now); },   // 매칭 취소 — 수를 안 둔 판만(2026-10-22)
    'POST /api/battle/forfeit': (req, b, now) => { const u = authed(req, now); return game.battleForfeit(u.id, b.id, now); },
    'GET /api/room': (req, b, now) => rooms.view(authed(req, now).id),
    'POST /api/room/create': (req, b, now) => rooms.create(authed(req, now).id, now),
    'POST /api/room/join': (req, b, now) => rooms.join(authed(req, now).id, b.code, now),
    'POST /api/room/leave': (req, b, now) => rooms.leave(authed(req, now).id, now),
    'POST /api/room/pick': (req, b, now) => rooms.pick(authed(req, now).id, b.plant, now),
    'POST /api/room/mode': (req, b, now) => rooms.setMode(authed(req, now).id, String(b.mode || ''), now),
    'POST /api/room/team': (req, b, now) => rooms.setTeam(authed(req, now).id, b.plants, now),
    'POST /api/room/ready': (req, b, now) => rooms.ready(authed(req, now).id, !!b.on, now),
    'POST /api/room/move': (req, b, now) => rooms.move(authed(req, now).id, b.act, now, b.turn == null ? null : +b.turn),
    'POST /api/room/forfeit': (req, b, now) => rooms.forfeit(authed(req, now).id, now),
    'POST /api/room/emote': (req, b, now) => rooms.emote(authed(req, now).id, b.i, now),
    // 플레이 기록 보고서용 내보내기(server/report.mjs --url) — 관리 열쇠가 맞을 때만, 아니면 없는 주소처럼
    'GET /api/admin/export': (req) => { if (!isAdmin(req)) throw new HttpErr(404, '없는 주소예요'); return { users: q.exportUsers.all(), events: q.exportEvents.all(), saves: q.exportSaves.all() }; },
    // 저장 판 옮기기 직전 원본(2026-10-18 업데이트 안전 — game.mjs load): 계정 번호로 목록 · 하나를 골라 그 계정 저장으로 되돌리기(다음 불러오기 때 다시 옮겨짐)
    'POST /api/admin/backups': (req, b) => { if (!isAdmin(req)) throw new HttpErr(404, '없는 주소예요'); return { backups: q.backups.all(+b.uid) }; },
    'POST /api/admin/restore': (req, b, now) => {
      if (!isAdmin(req)) throw new HttpErr(404, '없는 주소예요');
      const r = q.backup.get(+b.id, +b.uid);
      if (!r) throw new HttpErr(404, '그 보관본이 없어요');
      q.putSave.run(+b.uid, r.state, now);
      log(+b.uid, 'restore', { id: r.id, ver: r.ver }, now);
      return { ok: true, ver: r.ver };
    },
    // 쿠폰 만들기 · 고치기 · 지우기 · 보기(관리 열쇠 — server/coupon.mjs). max = 쓸 수 있는 계정 수(0 = 끝없이) · days = 며칠 동안(0 = 끝없이)
    'POST /api/admin/coupon': (req, b, now) => {
      if (!isAdmin(req)) throw new HttpErr(404, '없는 주소예요');
      const code = couponCode(b.code);
      if (!code) throw new Err('쿠폰 번호는 영문 · 숫자 4~24자예요');
      if (b.delete) { q.delCoupon.run(code); return { ok: true, deleted: code }; }
      const reward = cleanCoupon(b.reward || {});
      if (!Object.keys(reward).length) throw new Err('보상이 비었어요');
      const max = Math.max(0, Math.floor(+b.max || 0)), expires = +b.days > 0 ? now + Math.round(+b.days * 864e5) : 0;
      q.putCoupon.run(code, JSON.stringify(reward), max, expires, String(b.note || '').slice(0, 60), now);
      return { ok: true, coupon: { code, reward, max, expires } };
    },
    'GET /api/admin/coupons': (req) => {
      if (!isAdmin(req)) throw new HttpErr(404, '없는 주소예요');
      return { coupons: q.coupons.all().map(c => { let reward = {}; try { reward = JSON.parse(c.reward); } catch {} return { ...c, reward }; }) };
    },
  };

  async function handle(req) {
    const now = Date.now();
    if (!req.path.startsWith('/api/')) return null;
    try {
      maintain(now);
      if (req.path === '/api/room/poll' && req.method === 'GET') {   // 대결 방 소식(기다리는 요청 — 터널·Cloudflare를 거쳐도 막히지 않음)
        const u = authed(req, now), after = Number(req.query.get('after'));
        const out = await rooms.poll(u.id, Number.isFinite(after) ? after : -1, req);
        return { status: 200, body: { ...out, now: Date.now() } };
      }
      const h = API[req.method + ' ' + req.path];
      if (!h) throw new HttpErr(404, '없는 주소예요');
      const out = await h(req, req.body || {}, now);   // 구글 확인처럼 밖에 묻는 길은 기다림
      return { status: 200, body: { ...out, now: Date.now() } };
    } catch (e) {
      if (e instanceof Err) return { status: 400, body: { error: e.message } };
      if (e instanceof HttpErr) return { status: e.code, body: { error: e.message } };
      console.error(new Date().toISOString(), req.method, req.path, e);
      return { status: 500, body: { error: '서버에 문제가 생겼어요' } };
    }
  }
  return { handle, authed };
}
