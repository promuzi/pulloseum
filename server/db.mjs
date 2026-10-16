// 저장소 = Node 내장 SQLite(설치 없음). 파일 = server/data/pulloseum.db(깃에 안 올림 — .gitignore)
//  표·문장은 server/schema.mjs(Cloudflare 판 cf/src/dodb.js 와 같이 씀)
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA, STMTS } from './schema.mjs';

export function openDb(file) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000; PRAGMA foreign_keys = ON;');
  for (const s of SCHEMA) db.exec(s);
  const q = Object.fromEntries(Object.entries(STMTS).map(([k, t]) => [k, db.prepare(t)]));
  return { db, q };
}
