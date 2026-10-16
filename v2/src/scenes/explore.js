import { C } from '../art/palette.js';
import { space, planet } from '../art/bg.js';
import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { BGIMG, drawPortrait } from '../art/sprites.js';
import { T, plate, btnBody, tbar } from '../art/theme.js';
import { drawShip, drawMother, drawShipMini, SHIP_SC } from '../art/ship.js';
import { hangarBack, shipAt } from './hangar.js';
import { sfx } from '../core/sound.js';
import { PLANETS as CAT_PLANETS, ORBIT_LV, FUEL, SPECIES, KIND_NAME, RARITY_COL, probeMaxDur } from '../game/catalog.js';
import { fuelSync, probeOf, exploreOdds, regionOf } from '../game/logic.js';
import { left } from '../game/view.js';
import { showGot } from './popups.js';

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
const PANEL_H = 196;
const ease = k => k * k * (3 - 2 * k);
const reachR = (o, k = 1.12) => { const lo = ORB[Math.max(1, Math.floor(o))], hi = ORB[Math.min(4, Math.ceil(o))], f = o - Math.floor(o); return [(lo[0] + (hi[0] - lo[0]) * f) * k, (lo[1] + (hi[1] - lo[1]) * f) * k]; };

export const explore = {
  theme: 'night',   // 밤 정원(장소 테마 — 2026-10-15)
  enter(p = {}) { this.sel = this.sel || 'ex_ermias'; this.reg = this.reg || {}; this.morph = null; this.unmorph = p.from === 'hangar' ? { t0: null } : null; this.warp = null; },
  draw(app) {
    const { g, W, H, t, state: s } = app, now = app.now(), P = probeOf(s);
    fuelSync(s, now);
    if (BGIMG.explore_night) g.img(BGIMG.explore_night, 0, 0); else space(g, 0, 0, W, H, t, 71);
    const py = this.py = Math.max(210, H - 44 - 6 - PANEL_H), cx = Math.round(W / 2), cy = this.cy = Math.round((26 + py) / 2), lvOpen = o => s.user.level >= ORBIT_LV[o], reach = o => o <= P.lv.tank;
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
    for (const p of sorted) {
      const a = p.angle * Math.PI / 180, [rx, ry] = ORB[p.orbit], locked = !lvOpen(p.orbit), far = !reach(p.orbit);
      const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry), r = RAD[p.orbit];
      this.pp[p.id] = [x, y, r];
      g.disc(x, y, r + 1, C.ink);
      planet(g, x, y, r, p.ramp, { ring: p.ring, ringCol: C.mute });
      if (locked || far) { g.dither(x - r - 1, y - r - 1, r * 2 + 3, r * 2 + 3, C.ink, far && !locked ? 7 : 9); g.img(icon('lockS'), x - 3, y - 3); }
      const above = y < cy, ly = above ? y - r - 16 : y + r + 5;
      if (p.id === this.sel) {
        const k = r + 4 + (Math.floor(t / 400) % 2);
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.rect(x + sx * k - (sx > 0 ? 2 : 0), y + sy * k, 3, 1, T.text.gold); g.rect(x + sx * k, y + sy * k - (sy > 0 ? 2 : 0), 1, 3, T.text.gold); }
        g.text(p.name, x, ly, { color: T.text.gold, align: 'center', outline: T.ink });
      } else if (!locked) g.text(p.name, x, ly, { color: far ? T.text.sub : T.text.main, align: 'center', outline: T.ink });
      if (!this.warp) app.input.hit('pl_' + p.id, x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8, () => { this.sel = p.id; }, 4);
    }
    hud(app, s);
    this.panel(app, s, now, P);
    navBar(app, 'explore');
    this.morphDraw(app);
    this.warpDraw(app);
  },
  reachNow(t) { const R = this.reach; if (!R) return 1; const k = Math.min(1, (t - R.t0) / REACH_MS); return R.from + (R.to - R.from) * ease(k); },
  // 아래 판: 고른 행성 → 지역 칸(탐사 장치 단계로 하나씩 열림) → 그 지역의 나오는 속성 · 위험 · 생기 · 종자형/자원형 · 사는 식물 · 귀한 보상
  //  → 탐사비 · 연료 캡슐 · 성공 확률 · 내구도 → 탐사 보내기(고른 지역으로)
  panel(app, s, now, P) {
    const { g, W, H } = app, pl = PLANETS.find(p => p.id === this.sel), PT = T.ptext, needLv = ORBIT_LV[pl.orbit], lvLock = s.user.level < needLv, far = pl.orbit > P.lv.tank;
    const Z = regionOf(pl, this.reg[pl.id]), rLock = P.lv.scanner < Z.need;
    const py = this.py || 300, O = exploreOdds(s, pl, Z), max = probeMaxDur(P.lv.hull);
    plate(g, 8, py, W - 16, H - py - 50);
    g.text(pl.name, 18, py + 8, { font: 'head', color: PT.main });
    btnBody(g, W - 72, py + 7, 56, 18, lvLock || far ? T.btn.off : T.btn.primary, true); g.text(`${pl.orbit}궤도`, W - 44, py + 10, { color: (lvLock || far ? T.btn.off : T.btn.primary).text, align: 'center', font: 'bold' });
    // 지역 칸: 한 줄 같은 폭 · 같은 높이 · 양 끝 = 아래 큰 단추 양 끝 · 고른 곳 = 밝게 · 잠긴 곳 = 자물쇠 + '장치 N'(눌러 미리 보기는 됨 → 정비실 단추)
    const regs = pl.regions || [Z], RG = 6, rw = Math.floor((W - 36 - RG * (regs.length - 1)) / regs.length), rx = Math.round((W - rw * regs.length - RG * (regs.length - 1)) / 2), ry = py + 29;
    this.regR = [rx - 3, ry - 3, W - 2 * rx + 6, 24];   // 처음 안내가 가리킬 자리
    regs.forEach((R, i) => {
      const lock = P.lv.scanner < R.need;
      button(app, 'rg_' + R.id, rx + i * (rw + RG), ry, rw, 18, lock ? `장치 ${R.need}` : R.name, { style: R.id === Z.id ? 'teal' : lock ? 'off' : 'night', icon: lock ? 'lockS' : null, iconTint: true, onTap: () => { this.reg[pl.id] = R.id; } });
    });
    // 나오는 속성(아이콘) · 위험(점 셋) · 생기(개체값 ★) · 종자형/자원형 — 고른 지역 값
    const sp = [...new Set(Z.pool)], els = [...new Set(sp.map(k => SPECIES[k].el))], iy = py + 51;
    els.forEach((el, i) => g.img(icon(el), 18 + i * 13, iy + 1));
    let x2 = 18 + els.length * 13 + 6;
    g.text('위험', x2, iy, { color: PT.dim }); x2 += g.textW('위험') + 3;
    for (let i = 0; i < 3; i++) g.rect(x2 + i * 7, iy + 3, 5, 5, i < Z.hazard ? '#ff7a5c' : '#1e3046');
    x2 += 26;
    g.text('생기', x2, iy, { color: PT.dim }); x2 += g.textW('생기') + 3;
    for (let i = 0; i < 2; i++) g.rect(x2 + i * 7, iy + 3, 5, 5, i < Z.vital ? '#7cf0a0' : '#1e3046');
    g.text(KIND_NAME[Z.kind] || '', W - 18, iy, { color: Z.kind === 'resource' ? '#f0be7d' : PT.sub, align: 'right' });
    // 사는 식물(그 지역) · 오른쪽 = 귀한 보상(보상 칸 하나가 접목 가지 · 회귀 주사 · 보석일 확률 — 정비실 탐사 장치와 같은 말) · 전설
    const ty = py + 66, tp = sp.length >= 5 ? 32 : 34;   // 다섯 칸이면 사이를 좁혀 오른쪽 글자 자리
    sp.forEach((k, i) => {
      const x = 18 + i * tp, known = s.discovered.includes(k);
      g.rect(x, ty, 30, 30, '#0a1c32'); g.rect(x, ty, 30, 1, SPECIES[k].rarity === 'rare' ? '#6fb8ff' : '#2f5c8a');
      if (known) g.clip(x + 1, ty + 1, 28, 28, () => drawPortrait(g, k, x + 1, ty + 1, 28, false));
      else g.text('?', x + 15, ty + 8, { font: 'head', color: '#3f6a88', align: 'center' });
    });
    const gy = pl.legend ? ty + 2 : ty + 9, gv = `${Math.round(O.gem * 100)}%`;
    g.text(gv, W - 18, gy, { font: 'bold', color: RARITY_COL[3], align: 'right' });
    g.text('귀한 보상', W - 18 - g.textW(gv, 'bold') - 4, gy, { color: PT.dim, align: 'right' });
    if (pl.legend) g.text('전설이 아주 드물게', W - 18, ty + 16, { color: '#ffb04a', align: 'right' });
    // 탐사비 · 성공 확률 · 닳는 양 · 내구도
    const y3 = py + 104, okP = Math.round(O.ok * 100);
    this.oddsR = [12, y3 - 3, W - 24, 32]; this.fuelR = [12, y3 + 33, W - 24, 15];   // 처음 안내가 가리킬 자리
    g.text(`탐사비 ${O.cost}`, 18, y3, { font: 'bold', color: s.wallet.credits >= O.cost ? PT.main : '#ff9a8a' });
    g.text(`성공 ${okP}%`, 92, y3, { font: 'bold', color: okP >= 85 ? '#9ff0b0' : okP >= 65 ? '#ffd890' : '#ff9a8a' });
    g.text(`내구 -${O.wear}쯤`, 160, y3, { color: PT.sub });
    g.text('내구도', 18, y3 + 17, { color: PT.dim });
    tbar(g, 56, y3 + 20, 120, 6, P.dur / max, 'hp');
    g.text(`${P.dur}/${max}`, 182, y3 + 17, { color: P.dur / max < 0.3 ? '#ff9a8a' : PT.sub });
    // 연료 캡슐(무료로는 하루 3 — 그 밖에 레벨업 · 대결 승리 · 상점)
    const fy = y3 + 36, fuel = s.items.fuel || 0;
    g.img(icon('energy'), 18, fy);
    for (let i = 0; i < Math.max(FUEL.max, Math.min(6, fuel)); i++) { const x = 34 + i * 12; g.rect(x, fy + 1, 9, 9, '#0a1c32'); if (i < fuel) { g.rect(x + 1, fy + 2, 7, 7, '#ffd84a'); g.rect(x + 1, fy + 2, 7, 1, '#fff6c8'); } }
    const nx = 34 + Math.max(FUEL.max, Math.min(6, fuel)) * 12 + 4;
    g.text((fuel > 6 ? `+${fuel - 6} · ` : '') + (fuel >= FUEL.max ? '연료 캡슐' : `다음 캡슐 ${left(s.fuelT + FUEL.regenMin * 60000 - now)}`), nx, fy, { color: PT.sub });
    const broken = P.dur <= 0, go = !lvLock && !far && !rLock && !broken && fuel > 0 && s.wallet.credits >= O.cost && !this.warp;
    const label = lvLock ? `재배사 Lv${needLv}에 열려요` : far ? `연료 탱크 ${pl.orbit}단계가 필요해요` : rLock ? `탐사 장치 ${Z.need}단계가 필요해요` : broken ? '탐사선을 고쳐야 해요' : fuel <= 0 ? '연료 캡슐이 없어요' : s.wallet.credits < O.cost ? '탐사비가 모자라요' : `탐사 보내기 · 캡슐 1 · ${O.cost}`;
    button(app, 'ex_go', 18, fy + 18, W - 36, 30, label, { style: 'gold', font: 'bold', icon: go ? 'navExplore' : 'lockS', iconTint: true, disabled: !go, onTap: () => this.go(app, pl, Z.id) });
    if ((far || broken || rLock) && !this.warp && !this.morph) button(app, 'ex_fix', W - 150, py + 7, 72, 18, '정비실', { style: 'night', onTap: () => { this.morph = { t0: app.t, part: broken ? 'hull' : far ? 'tank' : 'scanner' }; } });
  },
  async go(app, P, region) {
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
        const sub = `경험치 +${r.xp.gained} · 내구도 -${r.wear}(${r.dur}/${r.max})`;
        if (r.ok) showGot(app, `${r.planet} 탐사`, r.got, sub);
        else showGot(app, `${r.planet} 탐사 실패 — 탐사선이 크게 흔들렸어요`, r.got, sub);
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
