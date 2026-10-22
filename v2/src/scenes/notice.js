// 공지(2026-10-22 — 로드맵 '공지 · 업데이트 팝업'): 서버 공지(관리 열쇠로 올림 — server/notice.mjs)를 게임을 열 때 새것이 있으면 한 번 · 대기실 '공지' 단추로 다시
//  본 공지 번호는 이 브라우저에 기억(pullo.notice) — 닫으면 맨 새 공지까지 봤음
import { net } from '../net/api.js';
import { holo, T } from '../art/theme.js';
import { button } from '../art/ui.js';
import { wrap, lineH } from '../core/text.js';

const SEEN = 'pullo.notice';
const seenId = () => { try { return +localStorage.getItem(SEEN) || 0; } catch { return 0; } };
const markSeen = list => { try { if (list && list.length) localStorage.setItem(SEEN, String(list[0].id)); } catch {} };
export async function loadNotices(app) {
  try { const r = await net.req('/api/notices'); app.notices = r.notices || []; } catch { app.notices = app.notices || []; }
  return app.notices;
}
// 대기실에 처음 들어올 때 한 번: 본 적 없는 공지가 있으면 열기(다른 겹창이 열려 있으면 그 뒤에)
export function checkNotices(app) {
  if (app.noticeChecked || net.offline) return;
  app.noticeChecked = true;
  loadNotices(app).then(list => { if (list.length && list[0].id > seenId() && !app.sheet) app.sheet = 'notice'; });
}
export function openNotices(app) { app.sheet = 'notice'; app.noticeY = 0; loadNotices(app); }
export const hasNewNotice = app => !!(app.notices && app.notices.length && app.notices[0].id > seenId());
const day = t => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
// 공지 창: 새것부터 제목 · 날짜 · 본문(줄 나눔) — 넘치면 아래는 잘림(끌어 올리기 = app.noticeY)
export function noticeSheet(app) {
  const { g, W, H, input } = app, list = app.notices, x = 14, w = W - 28, PT = T.ptext, h = Math.min(H - 120, 420), y = Math.round((H - h) / 2);
  const close = () => { markSeen(list); app.sheet = null; };
  g.c.fillStyle = 'rgba(4,7,14,0.72)'; g.c.fillRect(0, 0, W, H);
  input.hit('nt_block', 0, 0, W, H, () => {});
  holo(g, x, y, w, h, T.card || T.panel, 16);
  g.text('공지', x + 14, y + 12, { font: 'head', color: PT.main });
  const top = y + 40, bottom = y + h - 50, lh = lineH('body') + 3;
  if (!list) g.text('불러오는 중…', W / 2, top + 20, { color: PT.dim, align: 'center' });
  else if (!list.length) g.text('아직 공지가 없어요', W / 2, top + 20, { color: PT.dim, align: 'center' });
  else g.clip(x + 8, top, w - 16, bottom - top, () => {
    let yy = top - (app.noticeY || 0);
    for (const n of list) {
      g.text(n.title, x + 14, yy, { font: 'bold', color: '#ffd890' });
      g.text(day(n.created), x + w - 14, yy + 2, { color: PT.dim, align: 'right' });
      yy += lineH('bold') + 6;
      for (const ln of wrap(n.body, 'body', w - 28)) { g.text(ln, x + 14, yy, { color: PT.main }); yy += lh; }
      yy += 12;
    }
    app.noticeMax = Math.max(0, yy + (app.noticeY || 0) - bottom);
  });
  if (app.noticeMax > 0) { input.hit('nt_up', x, top, w, (bottom - top) / 2, () => { app.noticeY = Math.max(0, (app.noticeY || 0) - 60); }); input.hit('nt_dn', x, top + (bottom - top) / 2, w, (bottom - top) / 2, () => { app.noticeY = Math.min(app.noticeMax + (app.noticeY || 0), (app.noticeY || 0) + 60); }); }
  button(app, 'nt_close', x + 14, y + h - 42, w - 28, 30, '닫기', { style: 'gold', font: 'bold', onTap: close });
}
