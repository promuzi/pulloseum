// 화면 전환: 어두운 점이 차오르며 사라지고(110ms) 새 화면이 점이 빠지며 나타난다(110ms) — 도트식 페이드.
import { C, BAYER4 } from '../art/palette.js';

export class Router {
  constructor(scenes) { this.scenes = scenes; this.cur = null; this.name = null; this.pending = null; this.t0 = 0; this.phase = 0; }
  set(name, params) {
    const sc = this.scenes[name]; if (!sc) throw new Error('scene ' + name);
    this.cur = sc; this.name = name; if (sc.enter) sc.enter(params || {});
    this.pending = null; this.phase = 0;
  }
  go(name, params, now = performance.now()) {
    if (!this.cur) return this.set(name, params);
    this.pending = { name, params }; this.t0 = now; this.phase = 1;
  }
  draw(app) {
    const T = 110;
    if (this.phase === 1 && app.t - this.t0 >= T) { const p = this.pending; this.set(p.name, p.params); this.phase = 2; this.t0 = app.t; }
    if (this.phase === 2 && app.t - this.t0 >= T) this.phase = 0;
    this.cur.draw(app);
    if (this.phase) {
      const k = Math.min(1, (app.t - this.t0) / T);
      const level = Math.round((this.phase === 1 ? k : 1 - k) * 16);
      fadeDither(app.g, app.W, app.H, level);
    }
  }
}

function fadeDither(g, W, H, level) {
  if (level >= 16) return g.rect(0, 0, W, H, C.ink);
  if (level <= 0) return;
  g.c.fillStyle = C.ink;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BAYER4[y & 3][x & 3] < level) g.c.fillRect(x, y, 1, 1);
}
