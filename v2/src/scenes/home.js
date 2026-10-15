import { ELEMENT, TYPE } from '../art/palette.js';
import { room1, stand1 } from '../art/bg.js';
import { hud, navBar, button, chip, fmt } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig, BGIMG } from '../art/sprites.js';
import { T, plate, btnBody, tbar } from '../art/theme.js';
import { gradeBadge, STAT_DEF } from './common.js';
import { STAGE_NAME } from '../data/mock.js';

// 홈 그림마다 받침 윗면 가운데 = 화분 굽이 닿는 점(그림을 바꾸면 다시 잼)
//  cell = 흰 쿠션 타일 독방(2026-10-15 사용자가 말한 대기 화면 — 둥근 통창 앞 흰 타일 받침, 천장 주황 원뿔 빛, tools/pixel/big/cell_bg.mjs)
//  ship = 우주선 식물 방(코덱스, 그 전 시안)
export const HOME_PEDESTAL = { room: [135, 262], cell: [135, 262], ship: [135, 244] };

export const home = {
  theme(app) { return this.look || 'room'; },   // 대기 화면 = 원기둥 방(?look=cell 독방 · ?look=ship 옛 우주선 방)
  enter(p) { this.empty = !!p.empty; this.look = p.look || null; },
  draw(app) {
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
    const sp = { flower_grass: ['flower', 'grass'], cactus_fire: ['cactus', 'fire'], vine_water: ['vine', 'water'] }[p.key] || ['flower', 'grass'];
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
    button(app, 'home_cta', 25, H - 96, W - 50, 34, '토너먼트 출전', { style: 'gold', font: 'head', icon: 'sword', onTap: () => app.go('battle') });
    // 식물 누르면 관리
    app.input.hit('home_plant', mid - 50, topY - 150, 100, 150, () => app.go('plant'));
    navBar(app, 'home', { badge: { nursery: true } });
  },
};
