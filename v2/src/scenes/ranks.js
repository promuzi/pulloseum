// 순위표(2026-10-22 — 로드맵 '시즌 · 리그별 순위(단계 · 풀로세움 별 수) + 이름 공개 여부'): 서버가 계정마다 리그 기록으로 줄 세움(api.mjs GET /api/ranks — 1분마다 다시 셈)
//  리그 셋(새싹 · 자람 · 열린) 탭 · 위 50명 · 내 줄 강조(50등 밖이면 맨 아래에 내 자리) · 이름 숨긴 계정 = '익명 재배사' · 이번 시즌 기록만
import { plainBg } from '../art/bg.js';
import { T, plate, btnBody } from '../art/theme.js';
import { header } from './common.js';
import { drawPortrait } from '../art/sprites.js';
import { LEAGUES, LEAGUE_KEYS, TIERS, DIV_PTS, divOf } from '../game/catalog.js';
import { ROUNDS } from '../game/logic.js';
import { net } from '../net/api.js';

const TOP = 38, TAB_H = 26, ROW = 36, GAP = 4;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MEDAL = ['#ffd24a', '#d8e2ee', '#e09a5a'];
//  오른쪽 두 줄 = 단계 · 칸(맨 위 = 풀로세움 ★별) / 그 칸 점수 · 지금 라운드
const top = r => r.tier >= TIERS.length - 1;
const standing = r => (top(r) ? `${TIERS[TIERS.length - 1]}${r.stars ? ` ★${r.stars}` : ''}` : `${TIERS[r.tier] || TIERS[0]} ${divOf(r)}`);
const standing2 = r => (top(r) ? ROUNDS[r.round] || ROUNDS[0] : `${(r.pts || 0) % DIV_PTS}점 · ${ROUNDS[r.round] || ROUNDS[0]}`);
export const ranks = {
  theme: 'ship',
  tall: true,
  enter(p = {}) { this.lg = LEAGUES[p.league] ? p.league : (this.lg || 'sprout'); this.data = null; this.err = null; this.scroll = 0; this.vel = 0; this.dragging = false; this.lastT = null; if (p.mock) { this.data = p.mock; return; } this.load(); },   // mock = 촬영용 표
  load() {
    if (net.offline) { this.err = '온라인에서만 볼 수 있어요'; return; }
    const lg = this.lg; this.data = null; this.err = null;
    net.req('/api/ranks?league=' + lg).then(r => { if (this.lg === lg) this.data = r; }).catch(e => { if (this.lg === lg) this.err = e.message; });
  },
  maxScroll(app) { const n = this.data ? this.data.top.length : 0; return Math.max(0, n * (ROW + GAP) + 50 - (app.H - TOP - TAB_H - 8)); },
  onDrag(dy, dx, ev) { if (!this.app || ev.y0 < TOP + TAB_H) return; this.dragging = true; this.vel = 0; const mx = this.maxScroll(this.app), out = this.scroll < 0 || this.scroll > mx; this.scroll -= dy * (out ? 0.35 : 1); },
  onRelease(ev) { if (!this.dragging) return; this.dragging = false; this.vel = clamp(-ev.vy, -2400, 2400); },
  draw(app) {
    this.app = app;
    const { g, W, H, t } = app, P = T.ptext;
    if (!this.lg) this.enter();
    const dt = this.lastT == null ? 0 : clamp((t - this.lastT) / 1000, 0, 0.05); this.lastT = t;
    const mx = this.maxScroll(app);
    if (!this.dragging) {
      if (Math.abs(this.vel) > 8) { this.scroll += this.vel * dt; this.vel *= Math.exp(-dt / 0.35); } else this.vel = 0;
      if (this.scroll < 0 || this.scroll > mx) { const tg = clamp(this.scroll, 0, mx); this.scroll += (tg - this.scroll) * (1 - Math.exp(-dt / 0.08)); this.vel *= 0.8; }
    }
    plainBg(g, W, H, t);
    // 리그 탭(같은 크기 · 가장자리)
    const tw = Math.floor((W - 16 - 8) / LEAGUE_KEYS.length);
    LEAGUE_KEYS.forEach((k, i) => {
      const x = 8 + i * (tw + 4), on = k === this.lg, id = 'rk_' + k, S = on ? T.btn.gold : T.btn.second, { yy } = btnBody(g, x, TOP, tw, TAB_H, S, app.input.isPressed(id));
      g.text(LEAGUES[k].name, x + tw / 2, yy + 6, { font: 'bold', color: S.text, align: 'center' });
      if (!on) app.input.hit(id, x, TOP, tw, TAB_H, () => { this.lg = k; this.scroll = 0; this.load(); }, 3);
    });
    const y0 = TOP + TAB_H + 8, D = this.data;
    if (this.err || !D) g.text(this.err || '불러오는 중…', W / 2, y0 + 30, { color: P.dim, align: 'center' });
    else if (!D.top.length) g.text('이번 시즌에 이 리그 기록이 아직 없어요', W / 2, y0 + 30, { color: P.dim, align: 'center' });
    else g.clip(0, y0 - 2, W, H - y0 + 2, () => {
      const sc = Math.round(this.scroll);
      D.top.forEach((r, i) => {
        const y = y0 + i * (ROW + GAP) - sc; if (y > H || y + ROW < y0 - 2) return;
        this.row(app, r, 8, y, W - 16);
      });
      // 내 자리가 50등 밖이면 맨 아래에
      if (D.mine && !D.top.some(r => r.me)) { const y = y0 + D.top.length * (ROW + GAP) - sc + 10; g.text('내 자리', 12, y, { color: P.sub }); this.row(app, { ...D.mine, me: true, name: app.state && app.state.profile ? app.state.profile.name : '', avatar: app.state && app.state.profile ? app.state.profile.avatar : null, level: app.state && app.state.user ? app.state.user.level : 1 }, 8, y + 16, W - 16); }
    });
    header(app, '순위표', { right: D ? `시즌 ${D.season} · ${D.total}명` : '' });
  },
  row(app, r, x, y, w) {
    const { g } = app, P = T.ptext;
    plate(g, x, y, w, ROW, r.me ? 'panel' : 'deep');
    if (r.me) { g.rect(x, y, 3, ROW, '#ffd890'); }
    const rc = r.rank <= 3 ? MEDAL[r.rank - 1] : P.sub;
    g.text(String(r.rank), x + 22, y + 10, { font: 'head', color: rc, align: 'center' });
    if (r.avatar) g.clip(x + 40, y + 3, 30, 30, () => drawPortrait(g, r.avatar, x + 40, y + 3, 30, false));
    g.text(r.name || '익명 재배사', x + 76, y + 5, { font: 'bold', color: r.name ? P.main : P.dim });
    g.text(`Lv${r.level || 1}`, x + 76, y + 20, { color: P.sub });
    g.text(standing(r), x + w - 10, y + 5, { font: 'bold', color: top(r) ? '#ffd890' : P.main, align: 'right' });
    g.text(standing2(r), x + w - 10, y + 20, { color: P.sub, align: 'right' });
  },
};
