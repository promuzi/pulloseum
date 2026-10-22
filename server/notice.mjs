// 공지 관리(2026-10-22 — 로드맵 '공지 · 업데이트 팝업': 게임을 열 때 새 공지가 있으면 한 번, 다시 보기 = 대기실 '공지' 단추) — 관리 열쇠가 있어야 함
//   올리기: node server/notice.mjs --url https://pulloseum.getchat.workers.dev add --title "업데이트" --body "식물 빛이 생겼어요"
//   보기:   node server/notice.mjs --url … list          지우기: node server/notice.mjs --url … del 3
//   본문 줄바꿈 = \n 두 글자(화면이 줄을 나눔) · 제목 40자 · 본문 1200자까지
//   열쇠 = --key-file(기본 cf/.admin-key, 깃 밖) 또는 환경변수 PULLO_ADMIN_KEY · --url 없으면 PC 서버(http://127.0.0.1:8790)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [cmd, id] = pos, base = (opt('url') || 'http://127.0.0.1:8790').replace(/\/$/, '');
const keyFile = opt('key-file') || join(HERE, '..', 'cf', '.admin-key');
const key = (process.env.PULLO_ADMIN_KEY || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8') : '')).trim();
const call = async (method, path, body, admin = true) => {
  if (admin && !key) { console.error('관리 열쇠가 없어요 — cf/.admin-key 또는 PULLO_ADMIN_KEY'); process.exit(1); }
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(admin ? { 'x-admin-key': key } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`실패(${r.status}): ${j.error || ''}`); process.exit(1); }
  return j;
};
if (cmd === 'add') {
  const r = await call('POST', '/api/admin/notice', { title: opt('title') || '', body: String(opt('body') || '').split('\\n').join('\n') });
  console.log('올림: 공지', r.id);
} else if (cmd === 'del') {
  await call('POST', '/api/admin/notice', { delete: +id });
  console.log('지움: 공지', id);
} else if (cmd === 'list') {
  const r = await call('GET', '/api/notices', null, false);
  if (!r.notices.length) console.log('공지 없음');
  for (const n of r.notices) console.log(`${n.id} · ${new Date(n.created).toISOString().slice(0, 16)} · ${n.title} — ${n.body.replace(/\n/g, ' / ').slice(0, 60)}`);
} else {
  console.log('쓰는 법: add --title … --body … | list | del <번호>  (--url 주소)');
}
