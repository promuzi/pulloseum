import { C } from '../art/palette.js';
import { space, planet } from '../art/bg.js';
import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { BGIMG } from '../art/sprites.js';
import { T, plate, btnBody } from '../art/theme.js';
import { drawShip, SHIP_SC } from '../art/ship.js';
import { hangarBack, SHIP } from './hangar.js';

// 옛 게임 우주 지도 데이터(궤도·각도) — 1궤도만 열림
const PLANETS = [
  { id: 'ex_ermias', name: '에르미아스', orbit: 1, angle: 30, ramp: 'ice', note: '여러 문명이 시료를 공유한 우림', seeds: ['grass', 'water', 'wind', 'bolt'],
    regions: [['아르키아', 'C', 140, ['grass']], ['토르시단', 'C', 150, ['water', 'bolt']], ['루미안', 'D', 100, ['water', 'grass']]] },
  { id: 'ex_calisto', name: '칼리스토', orbit: 1, angle: 270, ramp: 'earth', note: '버려진 채굴 잔해의 건조 지대' },
  { id: 'ex_seraphin', name: '세라핀', orbit: 1, angle: 150, ramp: 'wind', note: '상승기류가 흐르는 부유 고원' },
  { id: 'ex_kairen', name: '카이렌', orbit: 2, angle: 210, ramp: 'pink', locked: true },
  { id: 'ex_mirdin', name: '미르딘', orbit: 2, angle: 330, ramp: 'grass', locked: true },
  { id: 'ex_volkar', name: '볼카르', orbit: 2, angle: 90, ramp: 'bolt', locked: true },
  { id: 'ex_veloc', name: '벨로크', orbit: 3, angle: 30, ramp: 'fire', locked: true },
  { id: 'ex_aztel', name: '아즈텔', orbit: 3, angle: 150, ramp: 'rose', locked: true },
  { id: 'ex_octavis', name: '옥타비스', orbit: 3, angle: 270, ramp: 'water', locked: true },
  { id: 'ex_nereidon', name: '네레이돈', orbit: 4, angle: 90, ramp: 'water', locked: true, ring: true },
  { id: 'ex_tiamen', name: '티아멘', orbit: 4, angle: 300, ramp: 'ice', locked: true },
];
const ORB = { 1: [46, 26], 2: [74, 42], 3: [100, 57], 4: [124, 71] };
const RAD = { 1: 7, 2: 7, 3: 8, 4: 9 };
// 탐사선(2026-10-15 사용자 "탐사선 누르면 탐사선 모양이 홀로그램처럼 변하는 오버랩 효과와 함께 확대되며 탐사선 강화와 셋팅 UI로"):
//  지도 가운데 = 내 탐사선(진짜 배 색, 작게). 누르면 ① 밝은 줄이 위에서 아래로 훑으며 지나간 칸부터 홀로그램(오버랩) ② 동시에 커지며 정비 화면 자리로
//  ③ 바탕은 정비실(짙은 디스플레이·투영기)로 겹쳐 바뀜 → 정비 화면이 이어 받음. 돌아오면 거꾸로(아래에서 위로 훑으며 진짜 배로, 작아지며 지도로).
const MINI = { sc: 0.246, cy: 194 }, MORPH_MS = 950, BACK_MS = 800;   // 큰 그림 130칸 × 0.246 = 지도용 작은 그림 32칸
const ease = k => k * k * (3 - 2 * k);

export const explore = {
  theme: 'night',   // 밤 정원(장소 테마 — 2026-10-15)
  enter(p = {}) { this.sel = 'ex_ermias'; this.morph = null; this.unmorph = p.from === 'hangar' ? { t0: null } : null; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    if (BGIMG.explore_night) g.img(BGIMG.explore_night, 0, 0); else space(g, 0, 0, W, H, t, 71);
    const cx = Math.round(W / 2), cy = 196;
    // 궤도(점선) — 열린 궤도는 밝게
    for (const o of [4, 3, 2, 1]) g.ellipseRing(cx, cy, ORB[o][0], ORB[o][1], o === 1 ? T.text.accent : T.deep.frame, 2);
    // 가운데 = 내 탐사선(누르면 정비) — 아래 옅은 빛 고리가 숨 쉬듯 퍼짐(누를 수 있다는 표시)
    const pulse = (t % 1800) / 1800;
    g.ellipseRing(cx, MINI.cy + 16, Math.round(9 + pulse * 7), Math.round(3 + pulse * 2), pulse < 0.6 ? T.text.accent : T.deep.frame, 2);
    const model = (s.ship && s.ship.model) || 1;
    if (!this.morph && !this.unmorph) drawShip(g, cx, MINI.cy + Math.round(Math.sin(t / 700)), 1, 0, { t, model, small: true });
    g.text('탐사선', cx, MINI.cy + 22, { color: T.text.sub, align: 'center', outline: T.ink });
    if (!this.morph && !this.unmorph) app.input.hit('ex_ship', cx - 22, MINI.cy - 18, 44, 40, () => { this.morph = { t0: app.t }; });
    // 행성
    const sorted = [...PLANETS].sort((a, b) => Math.sin(a.angle * Math.PI / 180) - Math.sin(b.angle * Math.PI / 180));
    for (const p of sorted) {
      const a = p.angle * Math.PI / 180, [rx, ry] = ORB[p.orbit];
      const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry), r = RAD[p.orbit];
      g.disc(x, y, r + 1, C.ink);
      planet(g, x, y, r, p.ramp, { ring: p.ring, ringCol: C.mute });
      if (p.locked) { g.dither(x - r - 1, y - r - 1, r * 2 + 3, r * 2 + 3, C.ink, 9); g.img(icon('lockS'), x - 3, y - 3); }
      const above = y < cy, ly = above ? y - r - 16 : y + r + 5;
      if (p.id === this.sel) { // 커서 괄호
        const k = r + 4 + (Math.floor(t / 400) % 2);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.rect(x + sx * k - (sx > 0 ? 2 : 0), y + sy * k - (sy > 0 ? 0 : 0), 3, 1, T.text.gold); g.rect(x + sx * k - (sx > 0 ? 0 : 0), y + sy * k - (sy > 0 ? 2 : 0), 1, 3, T.text.gold); }
        g.text(p.name, x, ly, { color: T.text.gold, align: 'center', outline: T.ink });
      } else if (!p.locked) g.text(p.name, x, ly, { color: T.text.main, align: 'center', outline: T.ink });
      if (!p.locked) app.input.hit('pl_' + p.id, x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8, () => { this.sel = p.id; }, 4);
    }
    hud(app, s);
    // 아래: 고른 행성 정보
    const P = PLANETS.find(p => p.id === this.sel);
    const py = 318;
    plate(g, 8, py, W - 16, H - py - 52);
    g.text(P.name, 18, py + 9, { font: 'head', color: T.ptext.main });
    btnBody(g, W - 72, py + 8, 56, 18, T.btn.primary, true); g.text('1궤도', W - 44, py + 11, { color: T.btn.primary.text, align: 'center', font: 'bold' });
    g.text(P.note || '', 18, py + 29, { color: T.ptext.sub });
    const regions = P.regions || [['고원 지대', 'C', 150, ['wind']], ['능선', 'C', 140, ['wind', 'grass']]];
    let y = py + 48;
    regions.forEach(([name, grade, cost, els], i) => {
      plate(g, 15, y, W - 30, 38, 'deep');
      g.text(name, 24, y + 6, { font: 'bold', color: T.text.main });
      els.forEach((e, k) => g.img(icon(e), 24 + k * 13, y + 21));
      g.text(`등급 ${grade}`, 104, y + 21, { color: T.text.sub });
      button(app, 'go_' + i, W - 88, y + 6, 64, 24, String(cost), { style: 'gold', icon: 'coin', onTap: () => app.toast(name + ' 탐사') });
      y += 42;
    });
    navBar(app, 'explore');
    this.morphDraw(app);
  },
  // 탐사선 ↔ 정비 홀로그램 연출(지도 위에 겹쳐 그림): f = 0(지도의 작은 진짜 배) → 1(정비 화면의 큰 홀로그램)
  morphDraw(app) {
    const { g, t, state: s } = app;
    let f = null, dir = 1;
    if (this.morph) { f = Math.min(1, (t - this.morph.t0) / MORPH_MS); if (f >= 1 && !this.morph.gone) { this.morph.gone = true; app.go('hangar', { from: 'explore' }, 'cut'); } }
    else if (this.unmorph) { if (this.unmorph.t0 == null) this.unmorph.t0 = t; f = 1 - Math.min(1, (t - this.unmorph.t0) / BACK_MS); dir = -1; if (f <= 0) { this.unmorph = null; return; } }
    if (f == null) return;
    const zoom = ease(Math.max(0, Math.min(1, (f - 0.12) / 0.88))), scan = Math.max(0, Math.min(1, f / 0.8));
    hangarBack(app, ease(Math.min(1, f * 1.4)));   // 바탕이 정비실로 겹쳐 바뀜
    hud(app, s);
    const cx = Math.round(135 + (SHIP.cx - 135) * zoom), cy = Math.round(MINI.cy + (SHIP.cy - MINI.cy) * zoom), sc = MINI.sc + (SHIP_SC - MINI.sc) * zoom;
    const model = (s.ship && s.ship.model) || 1;
    if (zoom < 0.04) drawShip(g, cx, cy, 1, 0, { t, model, small: true });   // 막 누른 순간·돌아온 끝 = 지도용 작은 그림
    else drawShip(g, cx, cy, sc, dir === 1 ? scan : Math.min(1, f * 1.25), { t, dir, model });
    navBar(app, 'explore');
  },
};
