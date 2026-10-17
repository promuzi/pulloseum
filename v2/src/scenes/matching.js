import { button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawPortrait, ROSTER, bigKey } from '../art/sprites.js';
import { T } from '../art/theme.js';
import { ELEMENT } from '../art/palette.js';
import { drawShutterClosed, GUN } from '../core/router.js';
import { bot } from '../net/api.js';
import { ro } from '../core/josa.js';

// 매칭 대기(2026-10-15 사용자 "셔터 닫히고 매칭하는 대기시간 연출도"):
//  출전 → 철 셔터가 쾅 닫힘(shutterClose) → 닫힌 셔터에 박힌 작은 화면이 켜져 상대를 찾음 — 여러 종족 얼굴이 슬롯처럼 넘어가다 점점 느려져 멈춤,
//  셔터 양옆 주황 등 깜빡임 · 걸린 시간 → "상대 발견!" + 상대 재배사·랭크·식물(초록 등) → 셔터가 열리며 콜로세움(shutterOpen).
//  찾는 동안 '취소' = 셔터가 열리며 홈으로.
const SEARCH = 2700, FOUND = 1400;   // 찾기 · 발견 보여 주기(ms)
const SCR = { x: 45, y: 168, w: 180, h: 200 };   // 셔터에 박힌 화면

export const matching = {
  theme: 'colosseum',
  enter(p = {}) { this.t0 = null; this.left = false; this.params = p; this.res = null; this.asked = false; this.foundT = null; },
  // 서버에 판을 열어 달라고 함(상대·씨앗은 서버가 정함 — 안 끝난 판이 있으면 그 판을 이어서)
  ask(app) {
    this.asked = true;
    (app.settle ? app.settle() : Promise.resolve()).then(() => bot.start(app)).then(r => { this.res = r; if (r && r.forfeited) app.toast('식물이 바뀌어서 하던 판은 진 것으로 정리했어요'); }).catch(e => { app.toast(e.message); if (!this.left) { this.left = true; app.go('home', {}, 'shutterOpen'); } });
  },
  draw(app) {
    const { g, W, H, t } = app;
    if (this.t0 == null) this.t0 = t;
    if (!this.asked) this.ask(app);
    const a = t - this.t0, ready = !!this.res && a >= (this.res && this.res.resume ? 600 : SEARCH);
    if (ready && this.foundT == null) this.foundT = t;
    const found = this.foundT != null, half = drawShutterClosed(g, W, H);
    const v = this.res && this.res.view, F = v ? (v.mode === 'swap3' ? v.team.foe[0] : v.foe) : null;
    const FOE = F ? { key: F.key, stage: F.stage, name: v.mode === 'swap3' ? F.name + ' 외 둘' : F.name, trainer: F.trainer || '상대', rank: F.rank || '', el: F.el } : { key: 'vine_water', name: '', trainer: '', rank: '', el: 'water' };
    // 셔터 양옆 등(이음매 위아래): 찾는 중 = 주황 깜빡임, 찾음 = 초록 켜짐
    const on = found || Math.floor(a / 300) % 2 === 0, lamp = found ? ['#7cf0a0', '#d8ffe4'] : ['#f0a050', '#ffe0b0'];
    for (const x of [14, W - 22]) for (const y of [half - 26, half + 18]) { g.rect(x, y, 8, 8, GUN.edge); g.rect(x + 1, y + 1, 6, 6, on ? lamp[0] : '#3a2a18'); if (on) g.rect(x + 2, y + 2, 2, 2, lamp[1]); }
    // 화면 테(두꺼운 쇠 테 + 볼트) → 안쪽 어두운 화면(주사선)
    const { x, w, h } = SCR, y = Math.round(half - h / 2);   // 화면 = 셔터 이음매 한가운데(화면 높이가 달라도)
    g.rect(x - 6, y - 6, w + 12, h + 12, GUN.edge); g.rect(x - 5, y - 5, w + 10, h + 10, GUN.d); g.rect(x - 5, y - 5, w + 10, 1, GUN.lipHi);
    for (const [bx, by] of [[x - 3, y - 3], [x + w, y - 3], [x - 3, y + h], [x + w, y + h]]) { g.rect(bx, by, 3, 3, GUN.bolt); g.px(bx + 2, by + 2, GUN.boltLo); }
    g.rect(x, y, w, h, '#06111f');
    for (let yy = y + 1; yy < y + h; yy += 2) g.rect(x, yy, w, 1, '#0a182c');
    const sweep = y + ((a / 9) % (h + 20)) - 10; if (sweep > y && sweep < y + h) g.rect(x, Math.round(sweep), w, 1, '#14304f');   // 훑는 줄
    const P = { main: '#e0f0ff', sub: '#8cc4ee', dim: '#3f7f9a', gold: '#ffd890', good: '#9ff0b0' };
    // 얼굴 슬롯: 찾는 동안 여러 종족이 넘어가다 끝에 갈수록 느려짐 → 찾으면 상대 얼굴
    const fx = x + w / 2 - 22, fy = y + 46
    let key = bigKey(FOE.key, FOE.stage);   // 상대 식물 단계 그림(2026-10-17)
    if (!found) { let tt = 0, i = 0; const aa = Math.min(a, SEARCH - 1); while (tt < aa && i < 400) { tt += 60 + 340 * (tt / SEARCH) ** 3; i++; } key = ROSTER[(i * 5 + 3 + (a >= SEARCH ? Math.floor(a / 300) : 0)) % ROSTER.length]; }
    g.rect(fx - 2, fy - 2, 48, 48, found ? '#9ff0b0' : '#4a8edc'); g.rect(fx - 1, fy - 1, 46, 46, '#0a1c32');
    g.clip(fx, fy, 44, 44, () => drawPortrait(g, key, fx + 2, fy + 2, 40, true));
    if (!found) for (let yy = fy; yy < fy + 44; yy += 3) g.rect(fx, yy, 44, 1, 'rgba(6,18,28,0.45)');   // 넘어가는 동안 흐린 주사선
    if (!found) {
      const dots = '.'.repeat(1 + Math.floor(a / 350) % 3);
      g.text('상대를 찾는 중' + dots, Math.round(x + w / 2 - g.textW('상대를 찾는 중...', 'bold') / 2), y + 14, { font: 'bold', color: P.main });   // 점이 늘어도 안 흔들리게 점 셋 기준 가운데
      const sec = Math.floor(a / 1000);
      g.text(`00:${String(sec).padStart(2, '0')}`, x + w / 2, y + 102, { color: P.sub, align: 'center' });
      // 찾는 막대(왕복)
      const bx = x + 24, bw = w - 48, pos = (Math.sin(a / 260) + 1) / 2;
      g.rect(bx, y + 122, bw, 4, '#0e2844'); g.rect(Math.round(bx + pos * (bw - 30)), y + 122, 30, 4, '#4a8edc'); g.rect(Math.round(bx + pos * (bw - 30)) + 4, y + 122, 22, 1, '#8ccfff');
      button(app, 'mt_cancel', x + w / 2 - 36, y + h - 32, 72, 24, '취소', { style: 'night', onTap: () => { if (!this.left) { this.left = true; app.go('home', {}, 'shutterOpen'); } } });
    } else {
      const fa = t - this.foundT, fk = Math.min(1, fa / 160);
      if (fk < 1) g.c.save(), g.c.globalAlpha = 1 - fk, g.rect(x, y, w, h, '#e0f0ff'), g.c.restore();   // 찾은 순간 화면이 한 번 번쩍
      g.text(this.res.resume ? '하던 판이 있어요!' : '상대 발견!', x + w / 2, y + 14, { font: 'head', color: P.gold, align: 'center' });
      g.text(`${FOE.trainer} · ${FOE.rank}`, x + w / 2, y + 102, { color: P.sub, align: 'center' });
      const el = ELEMENT[FOE.el], nw = g.textW(FOE.name, 'bold');
      g.text(FOE.name, x + w / 2 - 7, y + 120, { font: 'bold', color: P.main, align: 'center' });
      g.img(icon(FOE.el), Math.round(x + w / 2 + nw / 2 - 3), y + 121);
      // 하던 판 = 그 판에 나간 내 식물로 이어짐(홈에서 고른 식물과 다를 수 있어 이름을 보여 줌)
      const mine = v ? (v.mode === 'swap3' ? v.team.me[0] : v.me) : null;
      if (this.res.resume) g.text(mine ? `${ro(mine.name)} 이어서 싸워요` : '이어서 싸워요', x + w / 2, y + 146, { color: P.gold, align: 'center' });
      if (fa >= FOUND && !this.left) { this.left = true; app.battleBoot = { kind: 'bot', ...this.res }; app.go('battle', { net: 'bot', ...(this.params.venue ? { venue: this.params.venue } : {}) }, 'shutterOpen'); }
    }
  },
};
