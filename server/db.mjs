// 저장소 = Node 내장 SQLite(설치 없음). 파일 = server/data/pulloseum.db(깃에 안 올림 — .gitignore)
//  users(계정) · sessions(로그인 열쇠 해시) · saves(게임 상태 JSON, 할 때마다 저장 = 자동 저장) · battles(봇 판: 씨앗·상대·둔 수) · events(플레이 기록 — 밸런스·패턴 분석용)
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDb(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT UNIQUE NOT NULL, pass TEXT NOT NULL, nickname TEXT NOT NULL, created INTEGER NOT NULL, provider TEXT NOT NULL DEFAULT 'local', last_seen INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS saves (user_id INTEGER PRIMARY KEY, state TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS battles (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, mode TEXT NOT NULL, spec TEXT NOT NULL, acts TEXT NOT NULL DEFAULT '[]', created INTEGER NOT NULL, updated INTEGER NOT NULL, done INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, t INTEGER NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS battles_open ON battles(user_id, done);
    CREATE INDEX IF NOT EXISTS events_kind ON events(kind, t);
    CREATE INDEX IF NOT EXISTS events_user ON events(user_id, t);
  `);
  const q = {
    userByLogin: db.prepare('SELECT * FROM users WHERE login = ?'),
    userById: db.prepare('SELECT id, login, nickname, created, provider FROM users WHERE id = ?'),
    addUser: db.prepare('INSERT INTO users (login, pass, nickname, created) VALUES (?, ?, ?, ?)'),
    seen: db.prepare('UPDATE users SET last_seen = ? WHERE id = ?'),
    setNick: db.prepare('UPDATE users SET nickname = ? WHERE id = ?'),
    addSession: db.prepare('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)'),
    session: db.prepare('SELECT * FROM sessions WHERE token = ?'),
    delSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
    purgeSessions: db.prepare('DELETE FROM sessions WHERE expires < ?'),
    save: db.prepare('SELECT * FROM saves WHERE user_id = ?'),
    putSave: db.prepare('INSERT INTO saves (user_id, state, version, updated) VALUES (?, ?, 1, ?) ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, version = saves.version + 1, updated = excluded.updated'),
    addBattle: db.prepare('INSERT INTO battles (id, user_id, mode, spec, acts, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    battle: db.prepare('SELECT * FROM battles WHERE id = ? AND user_id = ?'),
    openBattle: db.prepare('SELECT * FROM battles WHERE user_id = ? AND done = 0 ORDER BY created DESC LIMIT 1'),
    putActs: db.prepare('UPDATE battles SET acts = ?, updated = ? WHERE id = ?'),
    doneBattle: db.prepare('UPDATE battles SET done = ?, updated = ? WHERE id = ?'),
    purgeBattles: db.prepare('DELETE FROM battles WHERE done != 0 AND updated < ?'),
    addEvent: db.prepare('INSERT INTO events (user_id, t, kind, data) VALUES (?, ?, ?, ?)'),
  };
  return { db, q };
}
