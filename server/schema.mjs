// 저장소 표·문장 — Node 내장 SQLite(server/db.mjs)와 Cloudflare Durable Object SQLite(cf/src/dodb.js)가 같이 씀. 문장 이름 = q.이름(get · all · run)
//  users(계정) · sessions(로그인 열쇠 해시) · saves(게임 상태 JSON, 할 때마다 저장 = 자동 저장) · battles(봇 판: 씨앗·상대·둔 수) · events(플레이 기록 — 밸런스·패턴 분석용)
//  coupons(쿠폰 번호 · 보상 JSON · 쓸 수 있는 수(0 = 끝없이) · 쓴 수 · 끝나는 때(0 = 없음)) · coupon_uses(누가 어떤 쿠폰을 받았나 — 계정마다 한 번)
//  rooms(친구 대결 방 — 방 번호 · 지금 모습 JSON · 마지막으로 바뀐 때)
export const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, nickname TEXT NOT NULL, created INTEGER NOT NULL, provider TEXT NOT NULL DEFAULT 'local', last_seen INTEGER NOT NULL DEFAULT 0)",
  'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS saves (user_id INTEGER PRIMARY KEY, state TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL)',
  "CREATE TABLE IF NOT EXISTS battles (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, mode TEXT NOT NULL, spec TEXT NOT NULL, acts TEXT NOT NULL DEFAULT '[]', created INTEGER NOT NULL, updated INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0)",
  'CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, t INTEGER NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL)',
  "CREATE TABLE IF NOT EXISTS coupons (code TEXT PRIMARY KEY, reward TEXT NOT NULL, max_uses INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL)",
  'CREATE TABLE IF NOT EXISTS coupon_uses (code TEXT NOT NULL, user_id INTEGER NOT NULL, t INTEGER NOT NULL, PRIMARY KEY (code, user_id))',
  'CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL, touched INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS save_backups (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, ver INTEGER NOT NULL, t INTEGER NOT NULL, state TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS notices (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL)',   // 공지(2026-10-22 — 관리 열쇠로 올림 · 화면은 새 공지가 있으면 열 때 한 번)
  'CREATE INDEX IF NOT EXISTS save_backups_user ON save_backups(user_id, id)',
  'CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)',
  'CREATE INDEX IF NOT EXISTS coupon_uses_user ON coupon_uses(user_id)',
  'CREATE INDEX IF NOT EXISTS battles_open ON battles(user_id, done)',
  'CREATE INDEX IF NOT EXISTS events_kind ON events(kind, t)',
  'CREATE INDEX IF NOT EXISTS events_user ON events(user_id, t)',
];
export const STMTS = {
  userByLogin: 'SELECT * FROM users WHERE login = ?',
  userById: 'SELECT id, login, nickname, created, provider FROM users WHERE id = ?',
  addUser: 'INSERT INTO users (login, pass, nickname, created) VALUES (?, ?, ?, ?)',
  seen: 'UPDATE users SET last_seen = ? WHERE id = ?',
  setNick: 'UPDATE users SET nickname = ? WHERE id = ?',
  setProvider: 'UPDATE users SET provider = ? WHERE id = ?',
  // 계정 지우기(계정 · 로그인 열쇠 · 저장 · 봇 판 · 플레이 기록 전부)
  delUserSessions: 'DELETE FROM sessions WHERE user_id = ?',
  delSave: 'DELETE FROM saves WHERE user_id = ?',
  delBattles: 'DELETE FROM battles WHERE user_id = ?',
  delEvents: 'DELETE FROM events WHERE user_id = ?',
  delCouponUses: 'DELETE FROM coupon_uses WHERE user_id = ?',
  delBackups: 'DELETE FROM save_backups WHERE user_id = ?',
  delUser: 'DELETE FROM users WHERE id = ?',
  addSession: 'INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)',
  session: 'SELECT * FROM sessions WHERE token = ?',
  delSession: 'DELETE FROM sessions WHERE token = ?',
  purgeSessions: 'DELETE FROM sessions WHERE expires < ?',
  save: 'SELECT * FROM saves WHERE user_id = ?',
  // 저장 판 옮기기 직전 원본(2026-10-18 업데이트 안전 — game.mjs load): 계정마다 최근 3개 · 되돌리기 = 관리 열쇠(api.mjs POST /api/admin/restore)
  addBackup: 'INSERT INTO save_backups (user_id, ver, t, state) VALUES (?, ?, ?, ?)',
  trimBackups: 'DELETE FROM save_backups WHERE user_id = ? AND id NOT IN (SELECT id FROM save_backups WHERE user_id = ? ORDER BY id DESC LIMIT 3)',
  backups: 'SELECT id, ver, t, length(state) AS size FROM save_backups WHERE user_id = ? ORDER BY id DESC',
  backup: 'SELECT * FROM save_backups WHERE id = ? AND user_id = ?',
  putSave: 'INSERT INTO saves (user_id, state, version, updated) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, version = saves.version + 1, updated = excluded.updated',
  addBattle: 'INSERT INTO battles (id, user_id, mode, spec, acts, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)',
  battle: 'SELECT * FROM battles WHERE id = ? AND user_id = ?',
  openBattle: 'SELECT * FROM battles WHERE user_id = ? AND done = 0 ORDER BY created DESC LIMIT 1',
  putActs: 'UPDATE battles SET acts = ?, updated = ? WHERE id = ?',
  doneBattle: 'UPDATE battles SET done = ?, updated = ? WHERE id = ?',
  purgeBattles: 'DELETE FROM battles WHERE done != 0 AND updated < ?',
  addEvent: 'INSERT INTO events (user_id, t, kind, data) VALUES (?, ?, ?, ?)',
  // 쿠폰(2026-10-17): 만들기 · 고치기 = 관리 열쇠(api.mjs POST /api/admin/coupon — server/coupon.mjs), 받기 = 로그인한 계정마다 한 번
  coupon: 'SELECT * FROM coupons WHERE code = ?',
  putCoupon: 'INSERT INTO coupons (code, reward, max_uses, expires, note, created) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(code) DO UPDATE SET reward = excluded.reward, max_uses = excluded.max_uses, expires = excluded.expires, note = excluded.note',
  coupons: 'SELECT code, reward, max_uses, used, expires, note, created FROM coupons ORDER BY created DESC',
  delCoupon: 'DELETE FROM coupons WHERE code = ?',
  couponUsed: 'SELECT t FROM coupon_uses WHERE code = ? AND user_id = ?',
  useCoupon: 'INSERT INTO coupon_uses (code, user_id, t) VALUES (?, ?, ?)',
  bumpCoupon: 'UPDATE coupons SET used = used + 1 WHERE code = ?',
  // 친구 대결 방(2026-10-18): 방마다 지금 모습 JSON(server/rooms.mjs pack) — 서버 본체가 다시 켜져도 대결이 이어지게
  putRoom: 'INSERT INTO rooms (code, data, touched) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET data = excluded.data, touched = excluded.touched',
  delRoom: 'DELETE FROM rooms WHERE code = ?',
  allRooms: 'SELECT code, data FROM rooms',
  // 공지(2026-10-22): 올리기 · 지우기 = 관리 열쇠(api.mjs POST /api/admin/notice — server/notice.mjs), 보기 = 누구나 최근 열 개
  addNotice: 'INSERT INTO notices (title, body, created) VALUES (?, ?, ?)',
  notices: 'SELECT id, title, body, created FROM notices ORDER BY id DESC LIMIT 10',
  delNotice: 'DELETE FROM notices WHERE id = ?',
  // 순위표(2026-10-22): 계정 별명 + 저장(리그 기록 · 대표 식물 · 이름 숨김) — api.mjs 가 1분마다 다시 셈
  rankSaves: 'SELECT u.id AS id, u.nickname AS nickname, s.state AS state FROM users u JOIN saves s ON s.user_id = u.id',
  // 보고서용 내보내기(관리 열쇠가 있을 때만 — api.mjs GET /api/admin/export): 계정은 번호 · 만든 때 · 마지막 접속만(아이디 · 비밀번호 · IP 없음)
  exportUsers: 'SELECT id, created, last_seen FROM users',
  exportEvents: 'SELECT user_id, t, kind, data FROM events',
  exportSaves: 'SELECT user_id, state FROM saves',
};
