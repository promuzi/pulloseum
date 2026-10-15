import { ELEMENT, TYPE } from '../art/palette.js';
import { room1, stand1 } from '../art/bg.js';
import { hud, navBar, button, chip, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig, BGIMG } from '../art/sprites.js';
import { T, plate, btnBody, tbar, holo } from '../art/theme.js';
import { gradeBadge, STAT_DEF } from './common.js';
import { STAGE_NAME } from '../data/mock.js';
import { LOFT_STOOL, loftBack, loftPlant, loftFront, enterLoft } from '../art/loft.js';

// 홈 그림마다 받침 윗면 가운데 = 화분 굽이 닿는 점(그림을 바꾸면 다시 잼)
//  loft = 코덱스 원형 방(2026-10-15 사용자 "코덱스 판이 마음에 들어" — 기본), cell = 흰 쿠션 타일 독방, room = 클로드 원기둥 방, ship = 옛 우주선 방
export const HOME_PEDESTAL = { room: [135, 262], cell: [135, 262], ship: [135, 244], loft: LOFT_STOOL };
const SPK = { flower_grass: ['flower', 'grass'], cactus_fire: ['cactus', 'fire'], vine_water: ['vine', 'water'] };   // 임시 데이터 종 → 타입·속성
// 왼쪽 스펙 창(2026-10-15 사용자 "좌측에 카드처럼 스팩별로 각자의 창으로 띄워. 우측에는 가방이나 이것저것. 배치는 처음 UI를 보고 참고해"
//  — 옛 게임 메인 화면의 왼쪽 타입·속성·변이 칸 + 오른쪽 가방·도감 큰 단추 배치): 스펙 하나 = 작은 푸른 홀로그램 창 하나, 묶음(정체 · 능력치 · 자람) 사이는 조금 띄움
const SPEC = { x: 6, y: 114, w: 78, h: 20, gap: 3 };
const SHOW_MS = 320;                              // 식물이 의자 투영기에서 나타나는 시간(바꿀 때마다), 스펙 창은 한 장씩 펼쳐짐

export const home = {
  theme(app) { return this.look || 'loft'; },   // 대기 화면 = 코덱스 원형 방(?look=room·cell·ship 옛 시안)
  enter(p) { this.empty = !!p.empty; this.look = p.look || null; this.showT = -1e9; this.swipe = 0; enterLoft(); },   // 나타나기 연출은 식물을 바꿀 때만
  onDrag(dy, dx) { this.swipe += dx; },
  onRelease(ev) {   // 식물 위에서 옆으로 밀면 다음·이전 식물
    const s = this.app && this.app.state; this.swipe = 0;
    if (!s || T.key !== 'loft' || Math.abs(ev.dx) < 32 || Math.abs(ev.dx) < Math.abs(ev.dy) * 1.2 || ev.y0 < 220 || ev.y0 > 430) return;
    this.flip(ev.dx < 0 ? 1 : -1);
  },
  flip(d) { const s = this.app.state; if (s.plants.length < 2) return; s.active = (s.active + d + s.plants.length) % s.plants.length; this.showT = this.app.t; },
  draw(app) {
    this.app = app;
    if (T.key === 'loft') return this.drawLoft(app);
    return this.drawClassic(app);
  },

  // ── 코덱스 원형 방 ──
  drawLoft(app) {
    const { g, W, H, t, state: s } = app;
    if (this.showT == null) this.showT = t;
    const p = this.empty ? null : s.plants[s.active];
    loftBack(app);
    const [mx, my] = LOFT_STOOL, show = Math.min(1, (t - this.showT) / SHOW_MS);
    // 식물: 의자 속 투영기에서 아래부터 위로 나타남(바꿀 때마다) — 드러나는 줄에 푸른 빛 한 줄
    const top = my - 100, reveal = Math.round(top + (1 - show) * 104);
    g.clip(0, reveal, W, 120, () => loftPlant(app, p ? p.key : null, p ? p.pot : 'pot_terra', mx, my));
    if (show < 1) { g.rect(mx - 26, reveal, 52, 1, '#97e8f7'); g.rect(mx - 18, reveal - 1, 36, 1, '#e4fbff'); }
    loftFront(app);
    hud(app, s);
    // 오른쪽 단추 줄: 가방 · 도감 · 관리(옛 메인 화면의 오른쪽 큰 단추 자리)
    const sideBtn = (id, ic, label, y, go) => {
      const pressed = app.input.isPressed(id), st = T.btn.second;
      const { yy } = btnBody(g, W - 40, y, 35, 37, st, pressed);
      g.img(icon(ic), W - 40 + Math.floor((35 - icon(ic).width) / 2), yy + 4);
      g.text(label, W - 22.5, yy + 21, { color: st.text, align: 'center' });
      app.input.hit(id, W - 40, y, 35, 37, go, 3);
    };
    sideBtn('home_bag', 'navBag', '가방', 114, () => app.go('bag'));
    sideBtn('home_dex', 'navBook', '도감', 157, () => app.go('dex'));
    sideBtn('home_care', 'up', '관리', 200, () => app.go('plant'));
    // 이름 + 등급(의자 아래, 홀로그램 글자)
    const nm = p ? p.name : '빈 화분', nw = g.textW(nm, 'bold') + (p ? 19 : 0), nx = Math.round(mx - nw / 2);
    holo(g, nx - 7, 413, nw + 14, 19, T.card || T.panel, 14);
    g.text(nm, nx, 416, { font: 'bold', color: T.ptext.main });
    if (p) gradeBadge(g, nx + nw - 15, 415, p.grade);
    if (!p) {
      button(app, 'home_cta', 60, 470, 150, 44, '첫 종자 심기', { style: 'gold', font: 'head', icon: 'seed', iconTint: true, onTap: () => app.go('bag') });
      navBar(app, 'home');
      return;
    }
    this.specs(app, p);
    // 식물 넘기기: 이름 아래 점 + 양옆 화살표(밀어도 됨)
    const n = s.plants.length, py = 444, dx0 = Math.round(mx - (n - 1) * 4.5);
    for (let i = 0; i < n; i++) { const x = dx0 + i * 9; g.rect(x - 2, py - 2, 5, 5, '#2b374b'); g.rect(x - 1, py - 1, 3, 3, i === s.active ? '#f0be7d' : '#87acc7'); }
    if (n > 1) for (const [id, d, x] of [['home_prev', -1, dx0 - 16], ['home_next', 1, dx0 + (n - 1) * 9 + 12]]) {
      const pr = app.input.isPressed(id), c = pr ? '#121a26' : '#2b374b';
      for (let j = 0; j < 4; j++) g.rect(d < 0 ? x - j : x + j, py - 3 + j, 1, 7 - j * 2, c);   // 큰 쪽 = 뒤, 뾰족한 쪽 = 가리키는 쪽
      app.input.hit(id, x - 10, py - 12, 20, 24, () => this.flip(d), 2);
    }
    const TR = s.tournament;
    button(app, 'home_cta', 60, 470, 150, 44, '토너먼트 출전', { style: 'gold', font: 'head', icon: 'sword', iconTint: true, sub: `${TR.round} · ${TR.wins}승 ${TR.losses}패`, onTap: () => app.go('matching', {}, 'shutterClose') });   // 출전 = 철 셔터가 닫히고 상대 찾기 → 열리며 전투장
    app.input.hit('home_plant', mx - 40, my - 100, 80, 104, () => app.go('plant'));
    navBar(app, 'home', { badge: { nursery: true } });
  },
  // 왼쪽 스펙 창: 타입 · 속성 · 단계 / 체력 · 공격 · 방어 · 기동 / 새잎까지(막대). 식물을 바꾸면 위에서부터 한 장씩 왼쪽에서 펼쳐짐
  specs(app, p) {
    const { g, t } = app, st = T.card || T.panel, P = T.ptext, ps = p.stats || {};
    const sp = SPK[p.key] || ['flower', 'grass'], el = ELEMENT[sp[1]];
    const rows = [
      { ic: sp[0], label: '타입', val: TYPE[sp[0]] },
      { ic: sp[1], label: '속성', val: el.name, col: el.light },
      { ic: 'seed', label: '단계', val: STAGE_NAME[sp[0]][p.stage] },
      null,
      ...STAT_DEF.slice(0, 4).map(d => ({ ic: d.icon, label: d.name, val: ps[d.k] != null ? fmt(ps[d.k]) : '–' })),
      null,
      { ic: 'sun', label: '새잎', val: p.exp != null ? `${p.exp}/${p.expNext}` : '–', bar: p.exp != null ? p.exp / p.expNext : null },
    ];
    let y = SPEC.y, n = 0;
    for (const r of rows) {
      if (!r) { y += 6; continue; }
      const k = Math.min(1, Math.max(0, (t - this.showT - 90 - n * 40) / 160)); n++;
      if (k > 0) {
        const w = Math.max(3, Math.round(SPEC.w * k)), x = SPEC.x;
        holo(g, x, y, w, SPEC.h, st, 13);   // 밝은 벽 위에서도 글자가 읽히게 조금 짙게
        if (k < 1) g.rect(x + w - 1, y, 1, SPEC.h, '#e4fbff');
        else {
          const ic = icon(r.ic), ty = r.bar != null ? y + 2 : y + 4, vw = g.textW(r.val, 'bold'), lw = g.textW(r.label);
          g.img(ic, x + 4, ty + 1 + Math.max(0, Math.floor((11 - ic.height) / 2)));
          if (lw + 4 + vw <= SPEC.w - 22) g.text(r.label, x + 18, ty, { color: P.sub });   // 값이 길면 이름표는 빼고 값만
          g.text(r.val, x + SPEC.w - 5, ty, { font: 'bold', color: r.col || P.main, align: 'right' });
          if (r.bar != null) tbar(g, x + 18, y + 15, SPEC.w - 23, 3, r.bar, 'exp');
        }
      }
      y += SPEC.h + SPEC.gap;
    }
  },

  // ── 옛 시안(원기둥 방·독방·우주선 방) ──
  drawClassic(app) {
    const { g, W, H, t, state: s } = app;
    const p = this.empty ? null : s.plants[s.active];
    const bg = BGIMG['home_' + T.key];
    const SY = 28, SH = 300;
    let mid = Math.floor(W / 2), topY = SY + 226;
    if (bg) { g.img(bg, 0, 0); [mid, topY] = HOME_PEDESTAL[T.key] || HOME_PEDESTAL.ship; }
    else {   // 그림이 없을 때: 코드로 그린 온실 함교 + 둥근 탁자
      g.rect(0, 0, W, H, T.bg);
      room1(g, 0, SY, W, SH, t);
      stand1(g, mid, topY);
    }
    drawBig(g, p ? p.key : null, p ? p.pot : 'pot_terra', mid, topY, { t });
    hud(app, s);
    // 오른쪽 둥근 버튼: 가방·도감
    const sideBtn = (id, ic, label, y, scene) => {
      const pressed = app.input.isPressed(id), st = T.btn.second;
      const { yy } = btnBody(g, W - 37, y, 32, 36, st, pressed);
      g.img(icon(ic), W - 37 + 8, yy + 4);
      g.text(label, W - 21, yy + 20, { color: st.text, align: 'center' });
      app.input.hit(id, W - 37, y, 32, 36, () => app.go(scene), 4);
    };
    sideBtn('home_bag', 'navBag', '가방', 38, 'bag');
    sideBtn('home_dex', 'navBook', '도감', 80, 'dex');
    // 식물 넘기기
    if (p) {
      for (const [id, ic, x] of [['home_prev', 'left', 8], ['home_next', 'right', W - 18]]) {
        const pr = app.input.isPressed(id);
        btnBody(g, x - 2, 188, 14, 20, T.btn.second, pr);
        g.img(icon(ic), x + 1, 194 + (pr ? 1 : 0));
        app.input.hit(id, x - 6, 182, 22, 32, () => { s.active = (s.active + (id === 'home_next' ? 1 : s.plants.length - 1)) % s.plants.length; }, 4);
      }
    }
    // 아래 정보 판(장면 위에 뜬 판)
    const PY = SY + SH + 2;
    plate(g, 6, PY, W - 12, H - 44 - PY - 6);
    const PT = T.ptext;
    if (p) {   // 화분 점(몇 번째 식물인지)
      const n = s.plants.length, dx = Math.round(W / 2 - (n - 1) * 4);
      for (let i = 0; i < n; i++) { g.rect(dx + i * 8 - 2, PY - 9, 5, 5, T.ink); g.rect(dx + i * 8 - 1, PY - 8, 3, 3, i === s.active ? T.text.accent : T.deep.frame); }
    }
    let y = PY + 9;
    if (!p) {
      g.text('빈 화분', W / 2, y, { font: 'head', color: PT.main, align: 'center' });
      g.text('종자를 심으면 여기서 자라요', W / 2, y + 22, { color: PT.sub, align: 'center' });
      button(app, 'home_cta', 25, H - 96, W - 50, 34, '첫 종자 심기', { style: 'gold', font: 'head', icon: 'seed', onTap: () => app.go('bag') });
      navBar(app, 'home');
      return;
    }
    // 이름 + 등급
    const nameW = g.textW(p.name, 'head');
    g.text(p.name, W / 2 - 9, y, { font: 'head', color: PT.main, align: 'center' });
    gradeBadge(g, Math.round(W / 2 - 9 + nameW / 2 + 4), y, p.grade);
    // 칩: 타입 · 속성 · 단계
    y += 21;
    const sp = SPK[p.key] || ['flower', 'grass'];
    const chips = [
      { label: TYPE[sp[0]], icon: sp[0] },
      { label: ELEMENT[sp[1]].name, icon: sp[1], color: ELEMENT[sp[1]].light },
      { label: STAGE_NAME[sp[0]][p.stage], icon: 'seed' },
    ];
    let total = 0; chips.forEach(c => { total += g.textW(c.label) + 22 + 4; }); total -= 4;
    let cx = Math.round((W - total) / 2);
    chips.forEach(c => { cx += chip(g, cx, y, c.label, { icon: c.icon, color: c.color }) + 4; });
    // 핵심 스탯 4칸
    y += 21;
    const cw = Math.floor((W - 28) / 4);
    STAT_DEF.slice(0, 4).forEach((d, i) => {
      const x = 14 + i * cw;
      plate(g, x, y, cw - 3, 34, 'deep');
      g.img(icon(d.icon), x + 6, y + 5);
      g.text(d.name, x + 20, y + 5, { color: T.text.sub });
      g.text(fmt(p.stats[d.k]), x + (cw - 3) / 2, y + 18, { font: 'bold', color: T.text.main, align: 'center' });
    });
    // 성장
    y += 41;
    g.text('새잎까지', 16, y, { color: PT.sub });
    tbar(g, 66, y + 3, W - 128, 8, p.exp / p.expNext, 'exp');
    g.text(`${p.exp}/${p.expNext}`, W - 16, y, { color: PT.accent, align: 'right' });
    // 토너먼트 줄 + 출전 버튼
    const TR = s.tournament;
    y += 19;
    plate(g, 14, y, W - 28, 24, 'deep');
    g.img(icon('trophy'), 21, y + 6);
    g.text(`${TR.name} · ${TR.round}`, 36, y + 6, { color: T.text.gold });
    g.text(`${TR.wins}승 ${TR.losses}패 / ${TR.bestOf}판`, W - 21, y + 6, { color: T.text.main, align: 'right' });
    button(app, 'home_cta', 25, H - 96, W - 50, 34, '토너먼트 출전', { style: 'gold', font: 'head', icon: 'sword', onTap: () => app.go('matching', {}, 'shutterClose') });   // 출전 = 철 셔터가 닫히고 상대 찾기 → 열리며 전투장
    // 식물 누르면 관리
    app.input.hit('home_plant', mid - 50, topY - 150, 100, 150, () => app.go('plant'));
    navBar(app, 'home', { badge: { nursery: true } });
  },
};
