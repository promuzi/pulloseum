import { C } from '../art/palette.js';
import { space, planet } from '../art/bg.js';
import { hud, navBar, panel, rbox, button, chip } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { seedArt } from './common.js';

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

export const explore = {
  enter() { this.sel = 'ex_ermias'; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    space(g, 0, 0, W, H, t, 71);
    const cx = Math.round(W / 2), cy = 196;
    // 궤도(점선) — 열린 궤도는 밝게
    for (const o of [4, 3, 2, 1]) g.ellipseRing(cx, cy, ORB[o][0], ORB[o][1], o === 1 ? C.teal1 : C.slate, 2);
    // 가운데 모선
    g.disc(cx, cy, 6, C.ink); g.disc(cx, cy, 5, '#625565'); g.disc(cx - 1, cy - 1, 3, '#9babb2'); g.rect(cx - 9, cy, 18, 1, C.mute); g.px(cx, cy - 7 + (Math.floor(t / 500) % 2), C.teal4);
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
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.rect(x + sx * k - (sx > 0 ? 2 : 0), y + sy * k - (sy > 0 ? 0 : 0), 3, 1, C.gold); g.rect(x + sx * k - (sx > 0 ? 0 : 0), y + sy * k - (sy > 0 ? 2 : 0), 1, 3, C.gold); }
        g.text(p.name, x, ly, { color: C.gold, align: 'center', outline: C.ink });
      } else if (!p.locked) g.text(p.name, x, ly, { color: C.mist, align: 'center', outline: C.ink });
      if (!p.locked) app.input.hit('pl_' + p.id, x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 8, () => { this.sel = p.id; }, 4);
    }
    hud(app, s);
    // 아래: 고른 행성 정보
    const P = PLANETS.find(p => p.id === this.sel);
    const py = 318;
    panel(g, 8, py, W - 16, H - py - 52, 'night');
    g.text(P.name, 18, py + 8, { font: 'head', color: C.white });
    rbox(g, W - 70, py + 8, 54, 15, 4, C.teal1); g.text('1궤도', W - 43, py + 10, { color: C.white, align: 'center' });
    g.text(P.note || '', 18, py + 28, { color: C.mute });
    const regions = P.regions || [['고원 지대', 'C', 150, ['wind']], ['능선', 'C', 140, ['wind', 'grass']]];
    let y = py + 48;
    regions.forEach(([name, grade, cost, els], i) => {
      rbox(g, 16, y, W - 32, 36, 4, C.shade); g.rect(19, y + 1, W - 38, 1, C.slate);
      g.text(name, 24, y + 5, { font: 'bold', color: C.mist });
      els.forEach((e, k) => g.img(icon(e), 24 + k * 13, y + 20));
      g.text(`등급 ${grade}`, 104, y + 20, { color: C.mute });
      button(app, 'go_' + i, W - 88, y + 6, 64, 24, String(cost), { style: 'gold', icon: 'coin', onTap: () => app.toast(name + ' 탐사') });
      y += 42;
    });
    navBar(app, 'explore');
  },
};
