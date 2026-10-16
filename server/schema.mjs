// 저장소 표·문장 — Node 내장 SQLite(server/db.mjs)와 Cloudflare Durable Object SQLite(cf/src/dodb.js)가 같이 씀. 문장 이름 = q.이름(get · all · run)
//  users(계정) · sessions(로그인 열쇠 해시) · saves(게임 상태 JSON, 할 때마다 저장 = 자동 저장) · battles(봇 판: 씨앗·상대·둔 수) · events(플레이 기록 — 밸런스·패턴 분석용)
export const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, nickname TEXT NOT NULL, created INTEGER NOT NULL, provider TEXT NOT NULL DEFAULT 'local', last_seen INTEGER NOT NULL DEFAULT 0)",
  'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS saves (user_id INTEGER PRIMARY KEY, state TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL)',
  "CREATE TABLE IF NOT EXISTS battles (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, mode TEXT NOT NULL, spec TEXT NOT NULL, acts TEXT NOT NULL DEFAULT '[]', created INTEGER NOT NULL, updated INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0)",
  'CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, t INTEGER NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)',
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
  addSession: 'INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)',
  session: 'SELECT * FROM sessions WHERE token = ?',
  delSession: 'DELETE FROM sessions WHERE token = ?',
  purgeSessions: 'DELETE FROM sessions WHERE expires < ?',
  save: 'SELECT * FROM saves WHERE user_id = ?',
  putSave: 'INSERT INTO saves (user_id, state, version, updated) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, version = saves.version + 1, updated = excluded.updated',
  addBattle: 'INSERT INTO battles (id, user_id, mode, spec, acts, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)',
  battle: 'SELECT * FROM battles WHERE id = ? AND user_id = ?',
  openBattle: 'SELECT * FROM battles WHERE user_id = ? AND done = 0 ORDER BY created DESC LIMIT 1',
  putActs: 'UPDATE battles SET acts = ?, updated = ? WHERE id = ?',
  doneBattle: 'UPDATE battles SET done = ?, updated = ? WHERE id = ?',
  purgeBattles: 'DELETE FROM battles WHERE done != 0 AND updated < ?',
  addEvent: 'INSERT INTO events (user_id, t, kind, data) VALUES (?, ?, ?, ?)',
  // 보고서용 내보내기(관리 열쇠가 있을 때만 — api.mjs GET /api/admin/export): 계정은 번호 · 만든 때 · 마지막 접속만(아이디 · 비밀번호 · IP 없음)
  exportUsers: 'SELECT id, created, last_seen FROM users',
  exportEvents: 'SELECT user_id, t, kind, data FROM events',
  exportSaves: 'SELECT user_id, state FROM saves',
};
