import { plainBg } from '../art/bg.js';
import { icon } from '../art/icons.js';
import { smallCanvas, ROSTER } from '../art/sprites.js';
import { T, plate } from '../art/theme.js';
import { header } from './common.js';
import { SPECIES } from '../data/mock.js';

// 끌어서 내리기(2026-10-17 사용자 "도감 드래그가 안 돼" — 39종 13줄인데 화면엔 다섯 줄만, 끌기가 없었음): 보관고(storage.js)와 같은 식 —
//  끄는 동안 따라감(끝을 넘으면 0.35배로 늘어남) · 놓으면 그 빠르기로 미끄러지다 멈춤 · 끝을 넘었으면 되돌아옴
const TOP = 38, COLS = 3, CH = 96, GAP = 6;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dex = {
  theme: 'ship',
  tall: true,   // 긴 화면 = 목록이 아래까지(600칸에서 멈추고 끝 줄을 늘이면 빈 판이 늘어져 보임)
  enter() { this.scroll = 0; this.vel = 0; this.dragging = false; this.lastT = null; },
  maxScroll(app) { const rows = Math.ceil(ROSTER.length / COLS); return Math.max(0, rows * (CH + GAP) + 4 - (app.H - TOP)); },
  onDrag(dy, dx, ev) { if (!this.app || ev.y0 < TOP - 10) return; this.dragging = true; this.vel = 0; const mx = this.maxScroll(this.app), out = this.scroll < 0 || this.scroll > mx; this.scroll -= dy * (out ? 0.35 : 1); },
  onRelease(ev) { if (!this.dragging) return; this.dragging = false; this.vel = clamp(-ev.vy, -2400, 2400); },
  draw(app) {
    this.app = app;
    const { g, W, H, t, state: s } = app;
    if (this.scroll == null) this.enter();
    const dt = this.lastT == null ? 0 : clamp((t - this.lastT) / 1000, 0, 0.05); this.lastT = t;
    const mx = this.maxScroll(app);
    if (!this.dragging) {
      if (Math.abs(this.vel) > 8) { this.scroll += this.vel * dt; this.vel *= Math.exp(-dt / 0.35); } else this.vel = 0;
      if (this.scroll < 0 || this.scroll > mx) { const tg = clamp(this.scroll, 0, mx); this.scroll += (tg - this.scroll) * (1 - Math.exp(-dt / 0.08)); this.vel *= 0.8; }
    }
    plainBg(g, W, H, t);
    const found = new Set(s.discovered), sc = Math.round(this.scroll);
    const cw = Math.floor((W - 16 - 12) / COLS), P = T.ptext;
    g.clip(0, TOP - 2, W, H - TOP + 2, () => {
      ROSTER.forEach((k, i) => {
        const x = 8 + (i % COLS) * (cw + GAP), y = TOP + Math.floor(i / COLS) * (CH + GAP) - sc;
        if (y > H || y + CH < TOP - 2) return;   // 화면 밖 줄은 안 그림
        const sp = SPECIES[k], got = found.has(k);
        plate(g, x, y, cw, CH, got ? 'panel' : 'deep');
        g.text(String(i + 1).padStart(3, '0'), x + 7, y + 6, { color: got ? P.sub : T.text.dim });
        if (got) g.img(icon(sp.el), x + cw - 17, y + 6);
        const im = smallCanvas(k), px = Math.round(x + cw / 2 - 24), py = y + 18;
        g.ellipse(x + cw / 2, py + 33, 14, 2, T.deep.fill);
        if (im) { if (got) g.img(im, px, py - 4); else g.silhouette(im, px, py - 4, T.deep.frame); }
        g.text(got ? sp.name : '???', x + cw / 2, y + CH - 21, { font: got ? 'bold' : 'body', color: got ? P.main : T.text.dim, align: 'center' });
      });
    });
    header(app, '도감', { right: `${found.size}/${ROSTER.length}` });   // 머리 띠는 목록 위에(끌어 올린 칸이 띠를 덮지 않게)
  },
};
