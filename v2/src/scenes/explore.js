import { C } from '../art/palette.js';
import { space, planet } from '../art/bg.js';
import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { BGIMG, drawPortrait } from '../art/sprites.js';
import { T, plate, btnBody } from '../art/theme.js';
import { drawShip, SHIP_SC } from '../art/ship.js';
import { hangarBack, SHIP } from './hangar.js';
import { PLANETS as CAT_PLANETS, ORBIT_LV, FUEL, SPECIES } from '../game/catalog.js';
import { fuelSync } from '../game/logic.js';
import { left } from '../game/view.js';
import { showGot } from './popups.js';

// 우주 지도(궤도·각도·색 = 옛 게임 지도) — 열림 = 재배사 레벨(1궤도 Lv1 · 2궤도 Lv4 · 3궤도 Lv8 · 4궤도 Lv13 — 사용자 2026-10-16 "병목 없이 여유 있게, 너무 앞서가는 사람만 잠깐 기다리게")
const LOOK = {
  ex_ermias: { angle: 30, ramp: 'ice', note: '여러 문명이 시료를 공유한 우림' },
  ex_calisto: { angle: 270, ramp: 'earth', note: '버려진 채굴 잔해의 건조 지대' },
  ex_seraphin: { angle: 150, ramp: 'wind', note: '상승기류가 흐르는 부유 고원' },
  ex_kairen: { angle: 210, ramp: 'pink', note: '붉은 꽃이 피는 따뜻한 들판' },
  ex_mirdin: { angle: 330, ramp: 'grass', note: '안개 낀 숲그늘 습지' },
  ex_volkar: { angle: 90, ramp: 'bolt', note: '번개가 잦은 화산 지대' },
  ex_veloc: { angle: 30, ramp: 'fire', note: '용암이 흐르는 바위 사막' },
  ex_aztel: { angle: 150, ramp: 'rose', note: '바람이 꽃잎을 나르는 고원' },
  ex_octavis: { angle: 270, ramp: 'water', note: '물이 넘치는 해저 동굴' },
  ex_nereidon: { angle: 90, ramp: 'water', note: '고리를 두른 바다 행성', ring: true },
  ex_tiamen: { angle: 300, ramp: 'ice', note: '얼음 바람이 부는 먼 궤도' },
};
const PLANETS = CAT_PLANETS.map(p => ({ ...p, ...LOOK[p.id] }));
const ORB = { 1: [46, 26], 2: [74, 42], 3: [100, 57], 4: [124, 71] };
const RAD = { 1: 7, 2: 7, 3: 8, 4: 9 };
// 탐사선(2026-10-15 사용자 "탐사선 누르면 홀로그램처럼 변하는 오버랩 효과와 함께 확대되며 탐사선 강화와 셋팅 UI로")
const MINI = { sc: 0.246, cy: 194 }, MORPH_MS = 950, BACK_MS = 800, WARP_MS = 900;
const ease = k => k * k * (3 - 2 * k);

export const explore = {
  theme: 'night',   // 밤 정원(장소 테마 — 2026-10-15)
  enter(p = {}) { this.sel = this.sel || 'ex_ermias'; this.morph = null; this.unmorph = p.from === 'hangar' ? { t0: null } : null; this.warp = null; },
  draw(app) {
    const { g, W, H, t, state: s } = app, now = app.now();
    fuelSync(s, now);
    if (BGIMG.explore_night) g.img(BGIMG.explore_night, 0, 0); else space(g, 0, 0, W, H, t, 71);
    const cx = Math.round(W / 2), cy = 196, open = o => s.user.level >= ORBIT_LV[o];
    for (const o of [4, 3, 2, 1]) g.ellipseRing(cx, cy, ORB[o][0], ORB[o][1], open(o) ? T.text.accent : T.deep.frame, 2);
    const pulse = (t % 1800) / 1800;
    g.ellipseRing(cx, MINI.cy + 16, Math.round(9 + pulse * 7), Math.round(3 + pulse * 2), pulse < 0.6 ? T.text.accent : T.deep.frame, 2);
    const model = (s.ship && s.ship.model) || 1;
    if (!this.morph && !this.unmorph) drawShip(g, cx, MINI.cy + Math.round(Math.sin(t / 700)), 1, 0, { t, model, small: true });
    g.text('탐사선', cx, MINI.cy + 22, { color: T.text.sub, align: 'center', outline: T.ink });
    if (!this.morph && !this.unmorph && !this.warp) app.input.hit('ex_ship', cx - 22, MINI.cy - 18, 44, 40, () => { this.morph = { t0: app.t }; });
    const sorted = [...PLANETS].sort((a, b) => Math.sin(a.angle * Math.PI / 180) - Math.sin(b.angle * Math.PI / 180));
    for (const p of sorted) {
      const a = p.angle * Math.PI / 180, [rx, ry] = ORB[p.orbit], locked = !open(p.orbit);
      const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry), r = RAD[p.orbit];
      g.disc(x, y, r + 1, C.ink);
      planet(g, x, y, r, p.ramp, { ring: p.ring, ringCol: C.mute });
      if (locked) { g.dither(x - r - 1, y - r - 1, r * 2 + 3, r * 2 + 3, C.ink, 9); g.img(icon('lockS'), x - 3, y - 3); }
      const above = y < cy, ly = above ? y - r - 16 : y + r + 5;
      if (p.id === this.sel) {
        const k = r + 4 + (Math.floor(t / 400) % 2);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.rect(x + sx * k - (sx > 0 ? 2 : 0), y + sy * k, 3, 1, T.text.gold); g.rect(x + sx * k, y + sy * k - (sy > 0 ? 2 : 0), 1, 3, T.text.gold); }
        g.text(p.name, x, ly, { color: T.text.gold, align: 'center', outline: T.ink });
      } else if (!locked) g.text(p.name, x, ly, { color: T.text.main, align: 'center', outline: T.ink });
      if (!this.warp) app.input.hit('pl_' + p.id, x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8, () => { this.sel = p.id; }, 4);
    }
    hud(app, s);
    this.panel(app, s, now);
    navBar(app, 'explore');
    this.morphDraw(app);
    this.warpDraw(app);
  },
  // 아래 판: 고른 행성 · 사는 식물 · 연료 · 탐사하기
  panel(app, s, now) {
    const { g, W, H } = app, P = PLANETS.find(p => p.id === this.sel), PT = T.ptext, need = ORBIT_LV[P.orbit], locked = s.user.level < need;
    const py = 314;
    plate(g, 8, py, W - 16, H - py - 50);
    g.text(P.name, 18, py + 9, { font: 'head', color: PT.main });
    btnBody(g, W - 72, py + 8, 56, 18, locked ? T.btn.off : T.btn.primary, true); g.text(`${P.orbit}궤도`, W - 44, py + 11, { color: (locked ? T.btn.off : T.btn.primary).text, align: 'center', font: 'bold' });
    g.text(P.note || '', 18, py + 29, { color: PT.sub });
    g.text('사는 식물', 18, py + 48, { color: PT.dim });
    P.pool.forEach((k, i) => {
      const x = 18 + i * 44, y = py + 64, known = s.discovered.includes(k);
      g.rect(x, y, 38, 38, '#0a1e2c'); g.rect(x, y, 38, 1, SPECIES[k].rarity === 'rare' ? '#6fb8ff' : '#2f5f7a');
      if (known) g.clip(x + 1, y + 1, 36, 36, () => drawPortrait(g, k, x + 1, y + 1, 36, false));
      else g.text('?', x + 19, y + 11, { font: 'head', color: '#3f6a88', align: 'center' });
    });
    if (P.legend) g.text('전설 식물이 아주 드물게', W - 18, py + 48, { color: '#ffb04a', align: 'right' });
    // 연료 칸 + 다음 연료까지
    const fy = py + 110, fuel = s.items.fuel || 0;
    g.img(icon('energy'), 18, fy);
    for (let i = 0; i < FUEL.max; i++) { const x = 34 + i * 12; g.rect(x, fy + 1, 9, 9, '#0a1e2c'); if (i < fuel) { g.rect(x + 1, fy + 2, 7, 7, '#ffd84a'); g.rect(x + 1, fy + 2, 7, 1, '#fff6c8'); } }
    g.text(fuel >= FUEL.max ? '연료 가득' : `다음 연료 ${left(s.fuelT + FUEL.regenMin * 60000 - now)}`, 34 + FUEL.max * 12 + 4, fy, { color: PT.sub });
    const go = !locked && fuel > 0 && !this.warp;
    button(app, 'ex_go', 18, fy + 18, W - 36, 30, locked ? `재배사 Lv${need}에 열려요` : fuel > 0 ? '탐사하기 · 연료 1' : '연료가 차면 갈 수 있어요', { style: 'gold', font: 'bold', icon: locked ? 'lockS' : 'navExplore', iconTint: true, disabled: !go, onTap: () => this.go(app, P) });
  },
  async go(app, P) {
    this.warp = { t0: app.t, res: null, P };
    const r = await app.act('explore', { planet: P.id });
    if (!r) { this.warp = null; return; }
    this.warp.res = r;
  },
  // 접힘(시공간 폴드) 연출: 별이 가운데로 빨려 들며 하얗게 → 결과
  warpDraw(app) {
    const w = this.warp; if (!w) return;
    const { g, W, H, t } = app, k = Math.min(1, (t - w.t0) / WARP_MS);
    app.input.hit('warp_block', 0, 0, W, H, () => {});
    const cx = W / 2, cy = 196;
    g.c.fillStyle = `rgba(4,6,16,${(0.5 * k).toFixed(3)})`; g.c.fillRect(0, 0, W, H);
    for (let i = 0; i < 46; i++) {
      const a = i * 2.399 + 0.3, d0 = 30 + (i * 37) % 170, d = d0 * (1 - k * 0.9), len = 4 + k * 26;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.8;
      for (let j = 0; j < len; j += 2) g.px(Math.round(x + Math.cos(a) * j), Math.round(y + Math.sin(a) * j * 0.8), j < 4 ? '#ffffff' : '#97e8f7');
    }
    if (k > 0.75) g.alpha((k - 0.75) / 0.25, () => g.rect(0, 0, W, H, '#e8faff'));
    if (k >= 1 && w.res) {
      const r = w.res; this.warp = null;
      showGot(app, `${r.planet} 탐사`, r.got, `재배사 경험치 +${r.xp.gained}`);
    }
  },
  // 탐사선 ↔ 정비 홀로그램 연출(지도 위에 겹쳐 그림): f = 0(지도의 작은 진짜 배) → 1(정비 화면의 큰 홀로그램)
  morphDraw(app) {
    const { g, t, state: s } = app;
    let f = null, dir = 1;
    if (this.morph) { f = Math.min(1, (t - this.morph.t0) / MORPH_MS); if (f >= 1 && !this.morph.gone) { this.morph.gone = true; app.go('hangar', { from: 'explore' }, 'cut'); } }
    else if (this.unmorph) { if (this.unmorph.t0 == null) this.unmorph.t0 = t; f = 1 - Math.min(1, (t - this.unmorph.t0) / BACK_MS); dir = -1; if (f <= 0) { this.unmorph = null; return; } }
    if (f == null) return;
    const zoom = ease(Math.max(0, Math.min(1, (f - 0.12) / 0.88))), scan = Math.max(0, Math.min(1, f / 0.8));
    hangarBack(app, ease(Math.min(1, f * 1.4)));
    hud(app, s);
    const cx = Math.round(135 + (SHIP.cx - 135) * zoom), cy = Math.round(MINI.cy + (SHIP.cy - MINI.cy) * zoom), sc = MINI.sc + (SHIP_SC - MINI.sc) * zoom;
    const model = (s.ship && s.ship.model) || 1;
    if (zoom < 0.04) drawShip(g, cx, cy, 1, 0, { t, model, small: true });
    else drawShip(g, cx, cy, sc, dir === 1 ? scan : Math.min(1, f * 1.25), { t, dir, model });
    navBar(app, 'explore');
  },
};
