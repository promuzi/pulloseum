import { button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawPortrait, ROSTER } from '../art/sprites.js';
import { T } from '../art/theme.js';
import { ELEMENT } from '../art/palette.js';
import { drawShutterClosed, GUN } from '../core/router.js';

// 매칭 대기(2026-10-15 사용자 "셔터 닫히고 매칭하는 대기시간 연출도"):
//  출전 → 철 셔터가 쾅 닫힘(shutterClose) → 닫힌 셔터에 박힌 작은 화면이 켜져 상대를 찾음 — 여러 종족 얼굴이 슬롯처럼 넘어가다 점점 느려져 멈춤,
//  셔터 양옆 주황 등 깜빡임 · 걸린 시간 → "상대 발견!" + 상대 재배사·랭크·식물(초록 등) → 셔터가 열리며 콜로세움(shutterOpen).
//  찾는 동안 '취소' = 셔터가 열리며 홈으로.
const SEARCH = 2700, FOUND = 1400;   // 찾기 · 발견 보여 주기(ms)
const FOE = { key: 'vine_water', name: '타이드바인', trainer: '코스모싹', rank: '브론즈 2', el: 'water' };   // 전투 화면의 상대와 같게(서버가 붙여 줄 자리)
const SCR = { x: 45, y: 168, w: 180, h: 200 };   // 셔터에 박힌 화면

export const matching = {
  theme: 'colosseum',
  enter(p = {}) { this.t0 = null; this.left = false; this.params = p; },
  draw(app) {
    const { g, W, H, t } = app;
    if (this.t0 == null) this.t0 = t;
    const a = t - this.t0, found = a >= SEARCH, half = drawShutterClosed(g, W, H);
    // 셔터 양옆 등(이음매 위아래): 찾는 중 = 주황 깜빡임, 찾음 = 초록 켜짐
    const on = found || Math.floor(a / 300) % 2 === 0, lamp = found ? ['#7cf0a0', '#d8ffe4'] : ['#f0a050', '#ffe0b0'];
    for (const x of [14, W - 22]) for (const y of [half - 26, half + 18]) { g.rect(x, y, 8, 8, GUN.edge); g.rect(x + 1, y + 1, 6, 6, on ? lamp[0] : '#3a2a18'); if (on) g.rect(x + 2, y + 2, 2, 2, lamp[1]); }
    // 화면 테(두꺼운 쇠 테 + 볼트) → 안쪽 어두운 화면(주사선)
    const { x, y, w, h } = SCR;
    g.rect(x - 6, y - 6, w + 12, h + 12, GUN.edge); g.rect(x - 5, y - 5, w + 10, h + 10, GUN.d); g.rect(x - 5, y - 5, w + 10, 1, GUN.lipHi);
    for (const [bx, by] of [[x - 3, y - 3], [x + w, y - 3], [x - 3, y + h], [x + w, y + h]]) { g.rect(bx, by, 3, 3, GUN.bolt); g.px(bx + 2, by + 2, GUN.boltLo); }
    g.rect(x, y, w, h, '#06121c');
    for (let yy = y + 1; yy < y + h; yy += 2) g.rect(x, yy, w, 1, '#0a1a28');
    const sweep = y + ((a / 9) % (h + 20)) - 10; if (sweep > y && sweep < y + h) g.rect(x, Math.round(sweep), w, 1, '#14324a');   // 훑는 줄
    const P = { main: '#d8faff', sub: '#7fd0e8', dim: '#3f7f9a', gold: '#ffd890', good: '#9ff0b0' };
    // 얼굴 슬롯: 찾는 동안 여러 종족이 넘어가다 끝에 갈수록 느려짐 → 찾으면 상대 얼굴
    const fx = x + w / 2 - 22, fy = y + 46
    let key = FOE.key;
    if (!found) { let tt = 0, i = 0; while (tt < a && i < 400) { tt += 60 + 340 * (tt / SEARCH) ** 3; i++; } key = ROSTER[(i * 5 + 3) % ROSTER.length]; }
    g.rect(fx - 2, fy - 2, 48, 48, found ? '#9ff0b0' : '#3f9fd0'); g.rect(fx - 1, fy - 1, 46, 46, '#0a1e2c');
    g.clip(fx, fy, 44, 44, () => drawPortrait(g, key, fx + 2, fy + 2, 40, true));
    if (!found) for (let yy = fy; yy < fy + 44; yy += 3) g.rect(fx, yy, 44, 1, 'rgba(6,18,28,0.45)');   // 넘어가는 동안 흐린 주사선
    if (!found) {
      const dots = '.'.repeat(1 + Math.floor(a / 350) % 3);
      g.text('상대를 찾는 중' + dots, x + w / 2 - 44, y + 14, { font: 'bold', color: P.main });
      const sec = Math.floor(a / 1000);
      g.text(`00:${String(sec).padStart(2, '0')}`, x + w / 2, y + 102, { color: P.sub, align: 'center' });
      // 찾는 막대(왕복)
      const bx = x + 24, bw = w - 48, pos = (Math.sin(a / 260) + 1) / 2;
      g.rect(bx, y + 122, bw, 4, '#0e2a3c'); g.rect(Math.round(bx + pos * (bw - 30)), y + 122, 30, 4, '#3f9fd0'); g.rect(Math.round(bx + pos * (bw - 30)) + 4, y + 122, 22, 1, '#97e8f7');
      g.text('같은 랭크 재배사를 찾고 있어요', x + w / 2, y + 136, { color: P.dim, align: 'center' });
      button(app, 'mt_cancel', x + w / 2 - 36, y + h - 32, 72, 24, '취소', { style: 'night', onTap: () => { if (!this.left) { this.left = true; app.go('home', {}, 'shutterOpen'); } } });
    } else {
      const fk = Math.min(1, (a - SEARCH) / 160);
      if (fk < 1) g.c.save(), g.c.globalAlpha = 1 - fk, g.rect(x, y, w, h, '#d8faff'), g.c.restore();   // 찾은 순간 화면이 한 번 번쩍
      g.text('상대 발견!', x + w / 2, y + 14, { font: 'head', color: P.gold, align: 'center' });
      g.text(`${FOE.trainer} · ${FOE.rank}`, x + w / 2, y + 102, { color: P.sub, align: 'center' });
      const el = ELEMENT[FOE.el], nw = g.textW(FOE.name, 'bold');
      g.text(FOE.name, x + w / 2 - 7, y + 120, { font: 'bold', color: P.main, align: 'center' });
      g.img(icon(FOE.el), Math.round(x + w / 2 + nw / 2 - 3), y + 121);
      g.text('곧 경기가 시작돼요', x + w / 2, y + 146, { color: el ? el.light || P.dim : P.dim, align: 'center' });
      if (a >= SEARCH + FOUND && !this.left) { this.left = true; app.go('battle', this.params.venue ? { venue: this.params.venue } : {}, 'shutterOpen'); }
    }
  },
};
