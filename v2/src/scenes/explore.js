import { C } from '../art/palette.js';
import { space, planet } from '../art/bg.js';
import { hud, navBar, button } from '../art/ui.js';
import { icon, tinted } from '../art/icons.js';
import { BGIMG, drawPortrait } from '../art/sprites.js';
import { T, plate } from '../art/theme.js';
import { drawShip, drawMother, drawShipMini, SHIP_SC } from '../art/ship.js';
import { hangarBack, shipAt } from './hangar.js';
import { sfx } from '../core/sound.js';
import { PLANETS as CAT_PLANETS, ORBIT_LV, FUEL, SPECIES } from '../game/catalog.js';
import { fuelSync, probeOf, exploreOdds, regionOf } from '../game/logic.js';
import { left } from '../game/view.js';
import { showGot, tell } from './popups.js';
import { planetMap } from '../art/planetmap.js';

// 우주 지도(궤도·각도·색 = 옛 게임 지도). 2026-10-16 사용자 개편: 가운데 = 모선(내 집)에 탐사선이 붙은 그림, 탐사선이 행성에 다녀옴(늘 제자리로).
//  고리 = 연료 탱크가 닿는 범위(탱크를 올리면 고리가 부드럽게 넓어짐) · 행성마다 위험 · 풍요 · 생기 · 나오는 속성이 다름(먼 궤도라고 무조건 어렵지 않음)
//  탐사 = 연료 캡슐 1 + 탐사비(돈) · 성공 확률 = 위험 · 짐(탐사 장치 + 채집기) · 내구성 · 지금 내구도. 열림 = 재배사 레벨(여유 있게) + 연료 탱크
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
// 모선 = 지도 가운데(폭 56칸), 탐사선 = 아래 도킹 집게에 작게(MINI.sc). 누르면 탐사선으로 확대 · 본채는 검게 배경으로 → 정비(2026-10-15 "홀로그램처럼 변하며 확대")
const MOTHER_W = 56, MINI = { sc: 0.105 }, MORPH_MS = 950, BACK_MS = 800, REACH_MS = 700;
// 탐사 출발(2026-10-16 사용자 "탐사 가는 모션과 애니메이션도 따로"): 집게에서 떨어짐 → 고른 행성으로 곡선 비행(꼬리 자취) → 행성에 닿아 빛 고리 → 결과
const UNDOCK = 380, FLY = 950, LAND = 420;
// 아래 판 높이(내용 끝까지) — 짧은 화면은 판을 아래(탭 줄 위)에 붙이고 지도 가운데를 그 위 빈 곳 한가운데로
// 2026-10-16 사용자 "행성 누르면 보이는 곳에 정보가 너무 많고 지저분해" + "숫자로 복잡하게 말고 전부 레벨로 · 권장 레벨" →
//  "행성을 누르면 종합 정보가 간단하게 나오고, 조사하기를 누르면 행성 확대하면서 그 창이 나오는 거야":
//  궤도 화면 = 행성 요약(96 — 이름 · 연료 캡슐 · 사는 식물 · 종자/자원 · 전설 · 필수 연료 탱크 · 지역 수 · 조사하기) →
//  조사하기 = 확대 · 대륙 지도 + 아래에서 올라오는 지역 판(136 — 지역 · 사는 식물 · 필수/권장 단계 · 보내기)
const PANEL_H = 136, SUM_H = 96;
// 행성 지도 열기 · 닫기(2026-10-16 사용자 "행성이 확대되며 지도로 이어지는 느낌"): 카메라가 행성으로 다가감(궤도 그림이 행성을 중심으로 커지며 밀려남 · 별 줄기) →
//  행성 표면이 화면을 채우며 궤도 모습 → 대륙 지도 · 대기에 들어가며 구름이 짙어졌다 걷힘 → 핀이 하나씩 떨어짐 · 닫기 = 거꾸로(빠르게)
const MAP_IN = 950, MAP_OUT = 480;
const ease = k => k * k * (3 - 2 * k);
const easeIO = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const band = (a, b, k) => ease(Math.max(0, Math.min(1, (k - a) / (b - a))));
const reachR = (o, k = 1.12) => { const lo = ORB[Math.max(1, Math.floor(o))], hi = ORB[Math.min(4, Math.ceil(o))], f = o - Math.floor(o); return [(lo[0] + (hi[0] - lo[0]) * f) * k, (lo[1] + (hi[1] - lo[1]) * f) * k]; };

export const explore = {
  theme: 'night',   // 밤 정원(장소 테마 — 2026-10-15)
  enter(p = {}) { this.sel = p.sel || this.sel || 'ex_ermias'; this.reg = this.reg || {}; this.map = p.map ? { id: this.sel, t0: -1e9 } : null; this.morph = null; this.unmorph = p.from === 'hangar' ? { t0: null } : null; this.warp = null; },
  draw(app) {
    const { g, W, H, t, state: s } = app, now = app.now(), P = probeOf(s);
    fuelSync(s, now);
    if (BGIMG.explore_night) g.img(BGIMG.explore_night, 0, 0); else space(g, 0, 0, W, H, t, 71);
    const sheetY = this.sheetY = Math.max(210, H - 44 - 6 - PANEL_H);
    const py = this.py = Math.max(250, H - 44 - 6 - SUM_H), cx = Math.round(W / 2), cy = this.cy = Math.round((26 + py) / 2), lvOpen = o => s.user.level >= ORBIT_LV[o], reach = o => o <= P.lv.tank;
    this.pp = this.pp || {};
    // 닿는 범위 고리: 연료 탱크 단계가 바뀌면 부드럽게 커짐(정비에서 강화하고 돌아온 때)
    if (!this.reach || this.reach.to !== P.lv.tank) this.reach = { from: this.reach ? this.reachNow(t) : P.lv.tank, to: P.lv.tank, t0: t };
    const rn = this.reachNow(t);
    for (const o of [4, 3, 2, 1]) g.ellipseRing(cx, cy, ORB[o][0], ORB[o][1], reach(o) && lvOpen(o) ? T.text.accent : T.deep.frame, reach(o) ? 2 : 1);
    { const [rx, ry] = reachR(rn), n = 72, ph = t / 2400;   // 점선 고리(천천히 돎)
      for (let i = 0; i < n; i++) { if (i % 3 === 2) continue; const a = (i / n + ph) * Math.PI * 2; g.px(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), '#ffd890'); } }
    // 모선 + 도킹한 탐사선
    const model = (s.ship && s.ship.model) || 1, bob = Math.round(Math.sin(t / 900));
    let dock = [cx, cy + 10];
    if (!this.morph && !this.unmorph) {
      dock = drawMother(g, cx, cy + bob, MOTHER_W);
      if (!this.warp) drawShipMini(g, Math.round(dock[0]), Math.round(dock[1]) - 2, model);   // 1배 도트(모선과 같은 칸)
    }
    this.dock = dock;
    if (!this.morph && !this.unmorph && !this.warp) app.input.hit('ex_ship', cx - MOTHER_W / 2, cy - 20, MOTHER_W, 44, () => { this.morph = { t0: app.t }; });
    const sorted = [...PLANETS].sort((a, b) => Math.sin(a.angle * Math.PI / 180) - Math.sin(b.angle * Math.PI / 180));
    const labA = 1 - band(0, 0.18, this.mapK(t));   // 지도로 다가갈 때 행성 이름 · 고름 표시는 먼저 사라짐(확대되며 큰 글자로 남지 않게)
    for (const p of sorted) {
      const a = p.angle * Math.PI / 180, [rx, ry] = ORB[p.orbit], locked = !lvOpen(p.orbit), far = !reach(p.orbit);
      const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry), r = RAD[p.orbit];
      this.pp[p.id] = [x, y, r];
      g.disc(x, y, r + 1, C.ink);
      planet(g, x, y, r, p.ramp, { ring: p.ring, ringCol: C.mute });
      if (locked || far) { g.dither(x - r - 1, y - r - 1, r * 2 + 3, r * 2 + 3, C.ink, far && !locked ? 7 : 9); g.img(icon('lockS'), x - 3, y - 3); }
      const above = y < cy, ly = above ? y - r - 16 : y + r + 5;
      if (labA > 0) g.alpha(labA, () => {
        if (p.id === this.sel) {
          const k = r + 4 + (Math.floor(t / 400) % 2);
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.rect(x + sx * k - (sx > 0 ? 2 : 0), y + sy * k, 3, 1, T.text.gold); g.rect(x + sx * k, y + sy * k - (sy > 0 ? 2 : 0), 1, 3, T.text.gold); }
          g.text(p.name, x, ly, { color: T.text.gold, align: 'center', outline: T.ink });
        } else if (!locked) g.text(p.name, x, ly, { color: far ? T.text.sub : T.text.main, align: 'center', outline: T.ink });
      });
      if (!this.warp && !this.map) app.input.hit('pl_' + p.id, x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8, () => { if (this.sel === p.id) this.openMap(app); else { this.sel = p.id; sfx('select'); } }, 4);   // 고른 행성을 한 번 더 = 조사하기
    }
    if (this.map) this.mapDraw(app, s, P);
    hud(app, s);
    { const mk = this.mapK(t), ko = band(0, 0.42, mk), ki = band(0.5, 1, mk);   // 요약이 먼저 내려가고 → 지역 판이 올라옴(겹쳐 비치지 않게)
      if (ko < 1) this.summary(app, s, P, py + Math.round(ko * (SUM_H + 14))); if (ki > 0) this.panel(app, s, now, P, sheetY + Math.round((1 - ki) * (PANEL_H + 14))); }
    navBar(app, 'explore');
    this.morphDraw(app);
    this.warpDraw(app);
  },
  openMap(app) { if (!this.warp && !this.morph) { this.map = { id: this.sel, t0: app.t }; sfx('select'); } },
  mapU(t) { const M0 = this.map; if (!M0) return 0; const u = Math.min(1, (t - M0.t0) / MAP_IN); return M0.close != null ? Math.max(0, M0.u0 * (1 - Math.min(1, (t - M0.close) / MAP_OUT))) : u; },   // 지도 열린 정도(시간) 0 → 1
  mapK(t) { return easeIO(this.mapU(t)); },
  // 행성 지도(2026-10-16 사용자 "지역도 지도가 아니라 그냥 버튼이야"): 행성이 제자리에서 커지며 지도 → 지역 핀을 눌러 고름(잠긴 곳 = 구역이 어둡고 자물쇠) · '‹ 궤도' = 닫기
  mapDraw(app, s, P) {
    const { g, W, t } = app, M0 = this.map, pl = PLANETS.find(p => p.id === M0.id);
    if (!pl) { this.map = null; return; }
    const u = this.mapU(t);   // 열린 정도 0 → 1(시간)
    if (M0.close != null && u <= 0) { this.map = null; return; }
    const k = easeIO(u), c = g.c, open = u >= 1 && M0.close == null;
    const top = 30, bot = (this.sheetY || this.py || 300) - 4, cx = Math.round(W / 2), cy = Math.round((top + bot) / 2) + 6, R = Math.max(40, Math.min(92, Math.floor((bot - top) / 2) - 14));
    const [ox, oy, orr] = (this.pp && this.pp[pl.id]) || [cx, cy, 8];
    // 카메라: 행성 자리(ox, oy)가 화면 가운데로 오며 배율 z(지수 — 일정한 빠르기로 다가가는 느낌), 행성 반지름 = orr × z
    const z = Math.pow(R / orr, k), x = ox + (cx - ox) * k, y = oy + (cy - oy) * k, rr = orr * z;
    const SH = bot + 4;
    if (k < 1) {   // 지금까지 그린 궤도 그림(배경 · 고리 · 행성 · 모선)을 행성을 중심으로 키워 다시 그림 → 다른 것들이 화면 밖으로 밀려남
      const m = c.getTransform(), sw = Math.max(1, Math.round(W * m.a)), sh = Math.max(1, Math.round(SH * m.d));
      const snap = this.snap || (this.snap = document.createElement('canvas'));
      if (snap.width !== sw || snap.height !== sh) { snap.width = sw; snap.height = sh; }
      const sc = snap.getContext('2d'); sc.clearRect(0, 0, sw, sh); sc.drawImage(c.canvas, m.e, m.f, sw, sh, 0, 0, sw, sh);
      g.rect(0, 0, W, SH, '#05070f');
      g.clip(0, 0, W, SH, () => g.alpha(1 - band(0.3, 0.85, k), () => { c.imageSmoothingEnabled = false; c.drawImage(snap, x - ox * z, y - oy * z, W * z, SH * z); }));
    } else g.rect(0, 0, W, SH, '#05070f');
    // 먼 별(지도 뒤 — 다 열리면 은은히) · 다가가는 동안 별 줄기(행성 둘레에서 바깥으로)
    g.alpha(band(0.6, 1, k) * 0.8, () => { for (let i = 0; i < 46; i++) g.px((i * 97 + 13) % W, top - 6 + ((i * 61 + 7) % (SH - top + 4)), i % 5 ? '#4f5b7a' : '#b8dcfa'); });
    const st = Math.sin(Math.PI * band(0.04, 0.8, k));
    if (st > 0.03) g.alpha(0.6 * st, () => {
      for (let i = 0; i < 30; i++) {
        const a = i * 2.39996 + 0.7, d = (rr + 6 + ((i * 53) % 90)) * (1 + k * 1.6), len = 3 + k * (10 + (i % 3) * 8), ux = Math.cos(a), uy = Math.sin(a);
        for (let j = 0; j < len; j++) g.px(x + ux * (d + j), y + uy * (d + j), j > len * 0.55 ? '#e6f3ff' : '#8ccfff');
      }
    });
    app.input.hit('map_block', 0, 0, W, bot, () => {});
    // 행성 원판(작은 판에 모아 그림 — 구름 · 밤 그늘이 원판 밖으로 안 나가게): 궤도 모습 → 지도 · 잠김 · 고른 대륙 해안선 · 구름 · 밤 그늘
    const M = planetMap(pl, pl.ramp, R), S = M.cv.width, regs = pl.regions || [], Z = regionOf(pl, this.reg[pl.id]), zi = regs.findIndex(Rg => Rg.id === Z.id);
    const comp = this.comp || (this.comp = document.createElement('canvas'));
    if (comp.width !== S) { comp.width = S; comp.height = S; }
    const q = comp.getContext('2d'), fm = band(0.22, 0.68, k);
    q.imageSmoothingEnabled = false; q.globalCompositeOperation = 'source-over'; q.globalAlpha = 1; q.clearRect(0, 0, S, S);
    if (fm < 1) q.drawImage(M.plain, 0, 0);
    if (fm > 0) { q.globalAlpha = fm; q.drawImage(M.cv, 0, 0); }
    regs.forEach((Rg, i) => { if (P.lv.scanner < Rg.need) { q.globalAlpha = 0.55 * fm; q.drawImage(M.masks[i], 0, 0); } });   // 잠긴 대륙 = 어둡게
    if (zi >= 0 && fm > 0.5) { q.globalAlpha = fm * (Math.floor(t / 420) % 2 ? 1 : 0.55); q.drawImage(M.edges[zi], 0, 0); }   // 고른 대륙 = 해안선 금빛(깜빡)
    const ca = k < 0.45 ? 0.95 * band(0.05, 0.45, k) : 0.32 + 0.63 * (1 - band(0.45, 0.92, k));   // 대기에 들어가며 짙어졌다 걷힘
    q.globalCompositeOperation = 'source-atop';
    q.globalAlpha = ca; q.drawImage(M.clouds, Math.floor(t / 150) % S, 0, S, S, 0, 0, S, S);   // 구름 = 천천히 흐름
    q.globalAlpha = 1; q.drawImage(M.night, 0, 0);
    q.globalCompositeOperation = 'source-over';
    const dx = Math.round(x - rr), dy = Math.round(y - rr), ds = Math.round(rr * 2 + 1);
    c.imageSmoothingEnabled = false;
    c.drawImage(comp, dx, dy, ds, ds);
    // 대기 빛 테(두 겹)
    const ga = band(0.1, 0.55, k);
    if (ga > 0) { g.alpha(0.5 * ga, () => g.ellipseRing(x, y, rr + 1, rr + 1, M.glow)); g.alpha(0.2 * ga, () => g.ellipseRing(x, y, rr + 2, rr + 2, M.glow)); }
    if (u < 0.8) return;
    const a = band(0.8, 1, u), ms = (t - M0.t0) - MAP_IN * 0.8;
    g.alpha(a, () => {
      g.text(pl.name, W / 2, top + 2, { font: 'head', color: '#ffffff', align: 'center', outline: T.ink, outlineW: 3 });
      button(app, 'map_back', 8, top, 56, 20, '‹ 궤도', { style: 'night', onTap: () => { if (this.map && this.map.close == null) { this.map.close = app.t; this.map.u0 = Math.min(1, (app.t - this.map.t0) / MAP_IN); } } });
    });
    // 대륙 = 누르는 곳(대륙 어디를 눌러도 그 지역) — 다 열렸을 때만
    const pick = Rg => { if (this.reg[pl.id] !== Rg.id) { this.reg[pl.id] = Rg.id; sfx('select'); } };
    if (open) for (const rn of M.runs) app.input.hit('rg_' + regs[rn.z].id, dx + rn.x, dy + rn.y, rn.w, rn.h, () => pick(regs[rn.z]));
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    // 이름표 자리: 핀 아래 — 서로 겹치면 아래로 비킴
    const lab = regs.map((Rg, i) => { const px = Math.round(x + M.spots[i][0] * rr), py = Math.round(y + M.spots[i][1] * rr), text = P.lv.scanner < Rg.need ? `장치 ${Rg.need}` : Rg.name, lw = g.textW(text); return { i, px, py, text, lw, lx: Math.max(6 + lw / 2, Math.min(W - 6 - lw / 2, px)), ly: py + 3 }; });
    [...lab].sort((p, q) => p.ly - q.ly).forEach((L, n, arr) => { for (let j = 0; j < n; j++) { const O = arr[j]; if (Math.abs(L.lx - O.lx) < (L.lw + O.lw) / 2 + 4 && Math.abs(L.ly - O.ly) < 14) L.ly = O.ly + 14; } });
    regs.forEach((Rg, i) => {
      // 핀이 하나씩 위에서 떨어져 꽂힘(살짝 튐)
      const pt = M0.close == null ? Math.max(0, Math.min(1, (ms - i * 70) / 260)) : a, drop = pt < 1 ? Math.round(-16 * (1 - pt) * (1 - pt) + Math.sin(pt * Math.PI) * -2) : 0;
      if (pt <= 0) return;
      const { px, py } = lab[i], lock = P.lv.scanner < Rg.need, on = Rg.id === Z.id;
      g.alpha(Math.min(a, pt * 1.5), () => {
        if (on && pt >= 1) { const pr = 7 + (Math.floor(t / 380) % 2); g.ellipseRing(px, py + 2, pr + 2, Math.round((pr + 2) * 0.55), '#ffd890', 0); }
        // 핀: 둥근 머리 + 뾰족한 끝(바닥 점 = 지역 자리)
        const col = on ? '#ffd890' : lock ? '#5b616e' : '#e6f3ff', dark = on ? '#a8743a' : lock ? '#2c3038' : '#4f84bf', Y = py + drop;
        g.disc(px, Y - 9, 5, '#05070f'); g.disc(px, Y - 9, 4, col); g.disc(px, Y - 9, 2, dark);
        for (let j = 0; j < 5; j++) g.rect(px - Math.max(0, 2 - Math.floor(j / 2)), Y - 5 + j, Math.max(1, 5 - Math.floor(j / 2) * 2), 1, j === 4 ? '#05070f' : col);
        if (lock) g.img(icon('lockS'), px - 3, Y - 12);
        g.text(lab[i].text, lab[i].lx, lab[i].ly, { color: on ? '#ffd890' : lock ? '#9babb2' : '#ffffff', align: 'center', outline: T.ink, outlineW: 2 });
      });
      if (open) app.input.hit('rg_' + Rg.id, px - 16, py - 18, 32, 34, () => pick(Rg), 2);
      bx0 = Math.min(bx0, px - 16); by0 = Math.min(by0, py - 18); bx1 = Math.max(bx1, px + 16); by1 = Math.max(by1, py + 16);
    });
    if (regs.length && bx1 > bx0) this.regR = [bx0, by0, bx1 - bx0, by1 - by0];   // 처음 안내가 가리킬 자리(지도의 지역 핀)
  },
  reachNow(t) { const R = this.reach; if (!R) return 1; const k = Math.min(1, (t - R.t0) / REACH_MS); return R.from + (R.to - R.from) * ease(k); },
  // 아래 판: 고른 행성 → 지역 칸(탐사 장치 단계로 하나씩 열림) → 그 지역의 나오는 속성 · 위험 · 생기 · 종자형/자원형 · 사는 식물 · 귀한 보상
  //  → 탐사비 · 연료 캡슐 · 성공 확률 · 내구도 → 탐사 보내기(고른 지역으로)
  // 아래 판(2026-10-16 정리): ① 행성 이름 · 고른 지역(누르면 지도) · 연료 캡슐 ② 사는 식물(주인공) ③ 필수 단계(모자라면 못 감) · 권장 단계(모자라면 실패할 수 있음) · 종자/자원 · 전설 ④ 보내기
  //  수치(성공 % · 귀한 보상 % · 위험 · 생기 · 내구도)는 화면에 두지 않음 — 위험은 권장 내구성 단계에 들어 있음
  panel(app, s, now, P, py) {
    const { g, W } = app, pl = PLANETS.find(p => p.id === this.sel), PT = T.ptext, needLv = ORBIT_LV[pl.orbit], lvLock = s.user.level < needLv;
    const Z = regionOf(pl, this.reg[pl.id]), O = exploreOdds(s, pl, Z), V = P.lv, far = V.tank < O.req.tank, rLock = V.scanner < O.req.scanner, weak = V.hull < O.rec.hull;
    const fuel = s.items.fuel || 0, live = !this.warp && !this.morph && !!this.map && this.map.close == null && this.mapU(app.t) >= 1;
    plate(g, 8, py, W - 16, PANEL_H);
    // ① 이름 · 지역 · 연료 캡슐
    g.text(pl.name, 18, py + 8, { font: 'head', color: PT.main });
    const nx = 18 + g.textW(pl.name, 'head') + 6;
    g.text(Z.name, nx, py + 11, { font: 'bold', color: rLock ? PT.dim : '#ffd890' });
    this.fuelBar(app, s, py, live);
    // ② 사는 식물(그 지역) — 모르는 것은 '?'
    const sp0 = [...new Set(Z.pool)], ty = py + 32, kind = { seed: '종자 많음', mixed: '종자 · 자원', resource: '자원 많음' }[Z.kind] || '';
    const fitN = Math.max(1, Math.floor((W - 18 - g.textW(kind) - 8 - 18 + 4) / 36)), sp = sp0.length > fitN ? sp0.slice(0, fitN - 1) : sp0;   // '종자 많음' 앞까지만(겹침 막기)
    if (sp.length < sp0.length) g.text(`+${sp0.length - sp.length}`, 18 + sp.length * 36 + 4, ty + 10, { font: 'bold', color: PT.sub });
    sp.forEach((k, i) => {
      const x = 18 + i * 36, known = s.discovered.includes(k);
      g.rect(x, ty, 32, 32, '#0a1c32'); g.rect(x, ty, 32, 1, SPECIES[k].rarity === 'rare' ? '#6fb8ff' : '#2f5c8a');
      if (known) g.clip(x + 1, ty + 1, 30, 30, () => drawPortrait(g, k, x + 1, ty + 1, 30, false));
      else g.text('?', x + 16, ty + 9, { font: 'head', color: '#3f6a88', align: 'center' });
    });
    // 종자/자원 · 전설(오른쪽 위아래)
    g.text(kind, W - 18, ty + 4, { color: Z.kind === 'resource' ? '#f0be7d' : PT.sub, align: 'right' });
    if (pl.legend) g.text('전설', W - 18, ty + 19, { font: 'bold', color: '#ffb04a', align: 'right' });
    // ③ 필수 · 권장 단계(레벨만): 채움 = 밝게 · 필수 모자람 = 빨강 + 자물쇠 · 권장 모자람 = 주황 + !
    const row = (y, head, items) => {
      g.text(head, 18, y, { color: PT.dim });
      let x = 18 + g.textW(head) + 8;
      items.forEach(([name, lv, ok, must], i) => {
        if (i) { g.text('·', x, y, { color: PT.dim }); x += g.textW('·') + 5; }
        const col = ok ? '#e6f3ff' : must ? '#ff9a8a' : '#ffb04a', ic = ok ? 'check' : must ? 'lockS' : 'warn';
        g.img(tinted(ic, col), x, y + 2); x += 12;
        const tx = `${name} Lv.${lv}`; g.text(tx, x, y, { font: ok ? 'body' : 'bold', color: col }); x += g.textW(tx, ok ? 'body' : 'bold') + 6;
      });
    };
    const y3 = py + 72;
    row(y3, '필수', [['연료 탱크', O.req.tank, !far, true], ['탐사 장치', O.req.scanner, !rLock, true]]);
    row(y3 + 16, '권장', [['내구성', O.rec.hull, !weak, false]]);
    this.oddsR = [12, y3 - 3, W - 24, 32];
    // ④ 보내기(필수만 채우면 갈 수 있음 — 권장이 모자라도) · 필수가 모자라면 정비실
    const go = live && !lvLock && !far && !rLock && fuel > 0 && s.wallet.credits >= O.cost;
    const label = lvLock ? `재배사 Lv${needLv}에 열려요` : far ? `연료 탱크 Lv.${O.req.tank} 필요` : rLock ? `탐사 장치 Lv.${O.req.scanner} 필요` : fuel <= 0 ? `연료 캡슐 · ${left(s.fuelT + FUEL.regenMin * 60000 - now)}` : s.wallet.credits < O.cost ? `돈이 모자라요 · 돈 ${O.cost} 필요` : `탐사 보내기 · 연료 1 · 돈 ${O.cost}`;   // 2026-10-17 사용자 "탐사하는 비용 40 이렇게만 써 있어서 이게 돈이 드는 건지 모르겠음"
    const fixTo = far ? 'tank' : rLock ? 'scanner' : weak ? 'hull' : null, bw = fixTo && !lvLock ? W - 36 - 70 : W - 36;
    button(app, 'ex_go', 18, py + 104, bw, 26, label, { style: 'gold', font: 'bold', icon: go ? 'navShip' : 'lockS', iconTint: true, disabled: !go, onTap: () => this.go(app, pl, Z.id) });   // 보내기 = 로켓(사용자 "탐사하기 버튼 왼쪽에 검은색 아이콘 같은 거 뭐임?" — 옛 탐사 탭 아이콘이 덩어리로 보였음)
    if (fixTo && !lvLock) button(app, 'ex_fix', W - 18 - 64, py + 104, 64, 26, '정비실', { style: 'night', disabled: !live, onTap: () => { this.map = null; this.morph = { t0: app.t, part: fixTo }; } });
  },
  // 연료 캡슐(판 오른쪽 위): '연료 n/3' + 칸 — 누르면 무엇인지 · 언제 차나(2026-10-17 사용자 "탐사 연료에 관한 내 보유량이 안 뜨고 그거에 관한 안내가 없어서 뭔지 모르겠음")
  fuelBar(app, s, y, live) {
    const { g, W, input } = app, fuel = s.items.fuel || 0, n = Math.max(FUEL.max, Math.min(5, fuel)), fx0 = W - 18 - n * 10, txt = `연료 ${fuel}/${FUEL.max}`, tw = g.textW(txt, 'bold');
    g.text(txt, fx0 - 16, y + 9, { font: 'bold', color: fuel ? '#ffe9a0' : '#ff9a8a', align: 'right' });
    g.img(icon('energy'), fx0 - 13, y + 10);
    for (let i = 0; i < n; i++) { const x = fx0 + i * 10; g.rect(x, y + 11, 8, 8, '#0a1c32'); if (i < fuel) { g.rect(x + 1, y + 12, 6, 6, '#ffd84a'); g.rect(x + 1, y + 12, 6, 1, '#fff6c8'); } }
    this.fuelR = [fx0 - 20 - tw, y + 4, W - 18 - fx0 + 24 + tw, 20];
    if (live) input.hit('ex_fuel', ...this.fuelR, () => {
      const full = fuel >= FUEL.max, nx = full ? '' : ` · 다음 1개까지 ${left(s.fuelT + FUEL.regenMin * 60000 - Date.now())}`;
      tell(app, `연료 캡슐 ${fuel}/${FUEL.max}${nx}`, `탐사를 한 번 보낼 때 1개를 써요. ${FUEL.regenMin / 60}시간마다 1개씩 다시 차요(최대 ${FUEL.max}개). 레벨업 상자 · 대결 승리로도 받아요.`);
    }, 3);
  },
  // 행성 요약(궤도 화면): ① 이름 · 연료 캡슐 ② 그 행성에 사는 식물(모르는 건 '?') · 종자/자원 · 전설 ③ 필수 연료 탱크(또는 재배사 레벨) · 지역 수 · 조사하기
  summary(app, s, P, y) {
    const { g, W } = app, pl = PLANETS.find(p => p.id === this.sel), PT = T.ptext, needLv = ORBIT_LV[pl.orbit], lvLock = s.user.level < needLv, far = P.lv.tank < pl.orbit;
    const fuel = s.items.fuel || 0, live = !this.warp && !this.morph && !this.map;
    plate(g, 8, y, W - 16, SUM_H);
    g.text(pl.name, 18, y + 8, { font: 'head', color: PT.main });
    this.fuelBar(app, s, y, live);
    const sp0 = [...new Set(pl.pool)], ty = y + 30, kind = { seed: '종자 많음', mixed: '종자 · 자원', resource: '자원 많음' }[pl.kind] || '';
    const fitN = Math.max(1, Math.floor((W - 18 - g.textW(kind) - 8 - 18 + 4) / 32)), sp = sp0.length > fitN ? sp0.slice(0, fitN - 1) : sp0;   // '종자 많음' 앞까지만(겹침 막기)
    if (sp.length < sp0.length) g.text(`+${sp0.length - sp.length}`, 18 + sp.length * 32 + 4, ty + 8, { font: 'bold', color: PT.sub });
    sp.forEach((k, i) => {
      const x = 18 + i * 32, known = s.discovered.includes(k);
      g.rect(x, ty, 28, 28, '#0a1c32'); g.rect(x, ty, 28, 1, SPECIES[k].rarity === 'rare' ? '#6fb8ff' : '#2f5c8a');
      if (known) g.clip(x + 1, ty + 1, 26, 26, () => drawPortrait(g, k, x + 1, ty + 1, 26, false));
      else g.text('?', x + 14, ty + 7, { font: 'head', color: '#3f6a88', align: 'center' });
    });
    g.text(kind, W - 18, ty + 2, { color: pl.kind === 'resource' ? '#f0be7d' : PT.sub, align: 'right' });
    if (pl.legend) g.text('전설', W - 18, ty + 16, { font: 'bold', color: '#ffb04a', align: 'right' });
    const by = y + 66;
    if (lvLock) { g.img(tinted('lockS', '#ff9a8a'), 18, by + 2); g.text(`재배사 Lv${needLv}`, 30, by, { font: 'bold', color: '#ff9a8a' }); }
    else { const col = far ? '#ff9a8a' : '#e6f3ff'; g.img(tinted(far ? 'lockS' : 'check', col), 18, by + 2); g.text(`연료 탱크 Lv.${pl.orbit}`, 30, by, { font: far ? 'bold' : 'body', color: col }); }
    const regsN = (pl.regions || []).length, lx = 30 + g.textW(lvLock ? `재배사 Lv${needLv}` : `연료 탱크 Lv.${pl.orbit}`, 'bold') + 10;
    if (regsN > 1) g.text(`지역 ${regsN}곳`, lx, by, { color: PT.dim });
    button(app, 'ex_scan', W - 18 - 88, y + 62, 88, 26, '조사하기', { style: 'gold', font: 'bold', icon: 'navExplore', iconTint: true, disabled: !live, onTap: () => this.openMap(app) });
  },
  async go(app, P, region) {
    this.map = null;   // 지도에서 보내면 궤도로 돌아와 출발 연출
    this.warp = { t0: app.t, res: null, P };
    sfx('whoosh');
    const r = await app.act('explore', { planet: P.id, region });
    if (!r) { this.warp = null; return; }
    this.warp.res = r;
  },
  // 탐사 출발: 집게에서 내려와 엔진 불꽃(UNDOCK) → 고른 행성으로 휘는 길을 따라 날아가며 작아짐 · 꼬리 자취(FLY) → 행성에 닿으면 번쩍 + 빛 고리(LAND)
  //  → 결과가 오면 결과 창(아직이면 '탐사 중' · 고리가 계속 퍼짐). 다녀온 탐사선은 다시 집게에
  warpDraw(app) {
    const w = this.warp; if (!w) return;
    const { g, W, H, t, state: s } = app, a = t - w.t0, model = (s.ship && s.ship.model) || 1;
    app.input.hit('warp_block', 0, 0, W, H, () => {});
    const [dx, dy] = this.dock || [W / 2, (this.cy || 196) + 10], pp = (this.pp && this.pp[w.P.id]) || [W / 2, (this.cy || 196) - 60, 8];
    const flame = (x, y, rot, n) => { for (let i = 0; i < n; i++) { const d = 7 + i * 2 + (Math.floor(t / 60 + i) % 2); g.px(Math.round(x - Math.sin(rot) * d), Math.round(y + Math.cos(rot) * d), i < 2 ? '#fff6c8' : i < 4 ? '#ffb04a' : '#ff6a3a'); } };
    if (a < UNDOCK) {
      const k = ease(a / UNDOCK), y = dy - 2 + Math.round(k * 9);
      flame(dx, y, 0, 2 + Math.round(k * 3));
      drawShipMini(g, dx, y, model);
    } else if (a < UNDOCK + FLY) {
      if (!w.flew) { w.flew = true; sfx('swing'); }
      const k = ease((a - UNDOCK) / FLY), sx = dx, sy = dy + 7, ex = pp[0], ey = pp[1];
      const mx = (sx + ex) / 2 + (ey - sy) * 0.3, my = (sy + ey) / 2 - (ex - sx) * 0.3 - 16;   // 휘는 길(가운데 조절점)
      const bz = u => [(1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * ex, (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ey];
      for (let i = 1; i < 18; i++) { const u = k - i * 0.022; if (u < 0) break; const [x, y] = bz(u); g.alpha(1 - i / 18, () => g.px(Math.round(x), Math.round(y), i < 4 ? '#ffe8a8' : '#8ccfff')); }   // 꼬리 자취
      const [x, y] = bz(k), [x2, y2] = bz(Math.min(1, k + 0.02)), rot = Math.atan2(y2 - y, x2 - x) + Math.PI / 2, hh = Math.max(6, Math.round(14 * (1 - k * 0.5)));
      flame(x, y, rot, 4);
      drawShipMini(g, x, y, model, rot, hh);
    } else {
      const a2 = a - UNDOCK - FLY;
      if (!w.landed) { w.landed = true; sfx('land'); }
      if (a2 < LAND) g.alpha(1 - a2 / LAND, () => g.disc(pp[0], pp[1], pp[2] + 3, '#fff6c8'));   // 닿는 순간 번쩍
      for (let i = 0; i < 2; i++) { const k = ((a2 / 650) + i * 0.5) % 1, r = Math.round(pp[2] + 4 + k * 18); g.alpha(1 - k, () => g.ellipseRing(pp[0], pp[1], r, Math.round(r * 0.7), '#ffd890', 0)); }
      if (a2 >= LAND && !w.res) g.text('탐사 중' + '.'.repeat(1 + Math.floor(a2 / 300) % 3), pp[0], pp[1] + pp[2] + 7, { color: '#ffd890', align: 'center', outline: T.ink });
      if (a2 >= LAND && w.res) {
        const r = w.res; this.warp = null;
        const sub = `경험치 +${r.xp.gained}`, where = `${r.planet} · ${r.area || ''}`;
        if (r.ok) showGot(app, where, r.got, sub);
        else showGot(app, `${where} 탐사 실패`, r.got, sub);
      }
    }
  },
  // 모선 → 정비: 탐사선 쪽으로 확대 · 본채는 검게 물러나 배경으로, 탐사선은 홀로그램으로(지도 위에 겹쳐 그림): f = 0(지도) → 1(정비 화면의 큰 홀로그램)
  morphDraw(app) {
    const { g, t, state: s } = app;
    let f = null, dir = 1;
    if (this.morph) { f = Math.min(1, (t - this.morph.t0) / MORPH_MS); if (f >= 1 && !this.morph.gone) { this.morph.gone = true; app.go('hangar', { from: 'explore', part: this.morph.part || null }, 'cut'); } }
    else if (this.unmorph) { if (this.unmorph.t0 == null) this.unmorph.t0 = t; f = 1 - Math.min(1, (t - this.unmorph.t0) / BACK_MS); dir = -1; if (f <= 0) { this.unmorph = null; return; } }
    if (f == null) return;
    const zoom = ease(Math.max(0, Math.min(1, (f - 0.12) / 0.88))), scan = Math.max(0, Math.min(1, f / 0.8));
    hangarBack(app, ease(Math.min(1, f * 1.4)));
    hud(app, s);
    const SHIP = shipAt(app), [d0x, d0y] = this.dock || [135, 206], px = Math.round(d0x + (SHIP.cx - d0x) * zoom), py = Math.round(d0y - 2 + (SHIP.cy - d0y + 2) * zoom), sc = MINI.sc + (SHIP_SC - MINI.sc) * zoom;
    // 본채: 집게가 탐사선을 따라가게 같이 커지며(카메라가 다가감) 검게 → 사라짐
    { const mw = MOTHER_W * (sc / MINI.sc), black = ease(Math.min(1, f * 1.8)), al = 1 - ease(Math.max(0, Math.min(1, (f - 0.55) / 0.4)));
      if (al > 0.01) { const [ox, oy] = [px - mw * 0.006, py + 2 - mw * 0.3 * (36 / 56)]; drawMother(g, Math.round(ox), Math.round(oy), Math.round(mw), black, al); } }
    const model = (s.ship && s.ship.model) || 1;
    if (zoom < 0.04) drawShipMini(g, px, py, model);   // 시작 = 집게에 붙은 1배 도트 그대로
    else drawShip(g, px, py, sc, dir === 1 ? scan : Math.min(1, f * 1.25), { t, dir, model, smooth: sc < 0.5 });
    navBar(app, 'explore');
  },
};
