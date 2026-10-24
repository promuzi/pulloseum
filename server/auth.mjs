// 계정(아이디 + 비밀번호) — 비밀번호는 scrypt(소금 섞은 해시)로만 저장, 로그인 열쇠 = 무작위 토큰(30일).
// 나중에 구글 등 다른 로그인은 users.provider + 같은 세션 꼴로 붙임(사용자 2026-10-16 "나중에 구글이랑 여러 로그인 방법 연결할 거야").
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const DAY = 86400000, SESSION_DAYS = 30;
export const LOGIN_RE = /^[a-z0-9_]{3,20}$/;

export function hashPass(pw) {
  const salt = randomBytes(16), h = scryptSync(pw, salt, 32);
  return `scrypt:${salt.toString('hex')}:${h.toString('hex')}`;
}
export function checkPass(pw, stored) {
  const [kind, saltHex, hHex] = String(stored).split(':');
  if (kind !== 'scrypt') return false;
  const h = scryptSync(pw, Buffer.from(saltHex, 'hex'), 32), want = Buffer.from(hHex, 'hex');
  return want.length === h.length && timingSafeEqual(h, want);
}
// 토큰은 DB에 해시로만(유출돼도 바로 쓸 수 없게)
const tokHash = t => createHash('sha256').update(t).digest('hex');
export function newSession(q, userId, now) {
  const token = randomBytes(24).toString('base64url');
  q.addSession.run(tokHash(token), userId, now + SESSION_DAYS * DAY);
  return token;
}
export function userOfToken(q, token, now) {
  if (!token || token.length > 100) return null;
  const s = q.session.get(tokHash(token));
  if (!s || s.expires < now) return null;
  return q.userById.get(s.user_id) || null;
}
export const endSession = (q, token) => { if (token) q.delSession.run(tokHash(token)); };
// 쓸 때마다 30일 늘림(2026-10-24 — 자주 들어오는 사람이 30일마다 다시 로그인하지 않게)
export const touchSession = (q, token, now) => { if (token) q.touchSession.run(now + SESSION_DAYS * DAY, tokHash(token)); };
// 로그인 유지 쿠키(2026-10-24 사용자 '아이폰에서 게임들어가면 매번 로그인해야한다는데'): 아이폰 사파리는 스크립트가 쓴 저장(localStorage)을 7일 안 쓰면 지우고
//  개인 정보 보호 · 일부 앱 안 브라우저에선 아예 못 씀 → 서버가 내려 주는 HttpOnly 쿠키(30일)로도 알아봄. v = 열쇠(빈 글 = 지우기)
export const sessionCookie = v => v ? `pullo_t=${encodeURIComponent(v)}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly; Secure; SameSite=Lax` : 'pullo_t=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';

// 로그인 시도 제한(IP마다 10분에 12번)
const tries = new Map();
export function allowTry(ip, now) {
  const r = tries.get(ip) || { n: 0, t0: now };
  if (now - r.t0 > 600000) { r.n = 0; r.t0 = now; }
  r.n++; tries.set(ip, r);
  return r.n <= 12;
}
