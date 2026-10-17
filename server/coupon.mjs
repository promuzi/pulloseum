// 쿠폰 관리(2026-10-17 사용자 "쿠폰코드 입력해서 상품 주는거 가능? 테스트용으로 나나 친구나 좀 줘보게") — 관리 열쇠가 있어야 함(열쇠는 화면에 찍지 않음)
//   만들기 · 고치기: node server/coupon.mjs --url https://pulloseum.getchat.workers.dev add FRIEND2026 --credits 5000 --gems 300 --water 30 --fert 15 --fuel 10 --seeds rare,rare,common --cards normal,mut --max 30 --days 30 --note 친구시험
//   보기: node server/coupon.mjs --url … list          지우기: node server/coupon.mjs --url … del FRIEND2026
//   --max = 받을 수 있는 계정 수(0 = 끝없이 · 계정마다 한 번) · --days = 며칠 동안(0 = 끝없이) · 같은 번호로 add = 보상 · 수 · 기간을 고침(쓴 수는 그대로)
//   열쇠 = --key-file(기본 cf/.admin-key, 깃 밖) 또는 환경변수 PULLO_ADMIN_KEY · --url 없으면 PC 서버(http://127.0.0.1:8790)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const [cmd, code] = pos, base = (opt('url') || 'http://127.0.0.1:8790').replace(/\/$/, '');
const keyFile = opt('key-file') || join(HERE, '..', 'cf', '.admin-key');
const key = (process.env.PULLO_ADMIN_KEY || (existsSync(keyFile) ? readFileSync(keyFile, 'utf8') : '')).trim();
if (!key) { console.error('관리 열쇠가 없어요 — cf/.admin-key 또는 PULLO_ADMIN_KEY'); process.exit(1); }
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-admin-key': key }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`실패(${r.status}): ${j.error || ''}`); process.exit(1); }
  return j;
};
const day = t => (t ? new Date(t).toISOString().slice(0, 10) : '끝없이');
const show = c => { const rw = c.reward || {}, parts = Object.entries(rw).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('+') : v}`); return `${c.code} · ${parts.join(' · ')} · 받은 계정 ${c.used ?? 0}/${c.max_uses || c.max || '끝없이'} · ~${day(c.expires)}${c.note ? ' · ' + c.note : ''}`; };

if (cmd === 'add') {
  const reward = {};
  for (const k of ['credits', 'gems', 'water', 'fert', 'regress', 'fuel', 'parts']) if (opt(k)) reward[k] = +opt(k);
  if (opt('seeds')) reward.seeds = opt('seeds').split(',');
  if (opt('cards')) reward.cards = opt('cards').split(',');
  const r = await call('POST', '/api/admin/coupon', { code, reward, max: +(opt('max') || 0), days: +(opt('days') || 0), note: opt('note') || '' });
  console.log('만듦:', show({ ...r.coupon, used: 0 }));
} else if (cmd === 'del') {
  await call('POST', '/api/admin/coupon', { code, delete: true });
  console.log('지움:', code);
} else if (cmd === 'list') {
  const r = await call('GET', '/api/admin/coupons');
  if (!r.coupons.length) console.log('쿠폰 없음');
  for (const c of r.coupons) console.log(show(c));
} else {
  console.log('사용: node server/coupon.mjs [--url 주소] add <번호> --credits N … | list | del <번호>');
}
