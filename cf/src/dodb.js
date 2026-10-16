// Durable Object SQLite(ctx.storage.sql) 위에 Node 판과 같은 q.이름.get/all/run 을 얹음 — 표·문장 = server/schema.mjs
//  DO SQLite 는 Node 내장 SQLite 처럼 바로 답하는 방식이라 게임·계정·방 코드를 그대로 씀
import { SCHEMA, STMTS } from '../../server/schema.mjs';

export function doDb(sql) {
  for (const s of SCHEMA) sql.exec(s);
  const prep = text => ({
    get: (...a) => sql.exec(text, ...a).toArray()[0],
    all: (...a) => sql.exec(text, ...a).toArray(),
    run: (...a) => {
      const c = sql.exec(text, ...a);
      c.toArray();
      const out = { changes: c.rowsWritten };
      if (/^\s*INSERT/i.test(text)) out.lastInsertRowid = sql.exec('SELECT last_insert_rowid() AS id').one().id;
      return out;
    },
  });
  return { q: Object.fromEntries(Object.entries(STMTS).map(([k, t]) => [k, prep(t)])) };
}
