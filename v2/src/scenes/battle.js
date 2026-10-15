import { C, ELEMENT } from '../art/palette.js';
import { arena1, pad1 } from '../art/bg.js';
import { panel, rbox, rrect, bar, chip, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig } from '../art/sprites.js';
import { energyPips, dimIcon, bigTitle } from './common.js';
import { mockBattle, CAT_ICON, CAT_NAME } from '../data/mock.js';

function infoBox(app, x, y, u, mine) {
  const { g } = app;
  panel(g, x, y, 132, mine ? 46 : 60, 'night');
  let yy = y + 5;
  if (!mine) { g.text(`${u.trainer} · ${u.rank}`, x + 7, yy, { color: C.mute }); yy += 14; }   // 봇·사람 구분 없이 같은 정보만(성향·다음 수 경고 없음 — 2026-10-15 사용자)
  g.text(u.name, x + 7, yy, { font: 'bold', color: C.white });
  g.img(icon(u.el), x + 132 - 18, yy);
  yy += 15;
  bar(g, x + 7, yy, 118, 6, u.hp / u.max, 'hp');
  yy += 9;
  for (let i = 0; i < u.energyMax; i++) { const on = i < u.energy; g.rect(x + 7 + i * 6, yy + 3, 4, 5, C.ink); g.rect(x + 8 + i * 6, yy + 4, 2, 3, on ? C.gold : C.night2); }
  g.text(`${u.hp}/${u.max}`, x + 132 - 7, yy, { color: C.mist, align: 'right' });
}

function skillButton(app, x, y, w, h, sk, st) {
  const { g, input } = app;
  if (!sk) {
    rrect(g, x, y, w, h, 4, C.shade);
    rrect(g, x + 1, y + 1, w - 2, h - 2, 3, '#2b2238');
    g.text('빈 칸', x + w / 2, y + h / 2 - 6, { color: C.slate, align: 'center' });
    return;
  }
  const id = 'sk_' + sk.id;
  const down = input.isPressed(id);
  const yy = y + (down ? 1 : 0);
  const lit = st.picked === sk.id;
  const poor = sk.cost > st.energy;
  const cat = sk.cats[0];
  const tone = poor ? { fill: C.shade, hi: C.slate, lip: C.ink, name: C.slate2 } : { fill: C.night2, hi: '#4d65b4', lip: C.night, name: C.white };
  rrect(g, x, yy, w, h - (down ? 1 : 0), 4, lit ? C.teal3 : C.ink);
  rrect(g, x + 1, yy + 1, w - 2, h - 2 - (down ? 1 : 0), 3, tone.lip);
  rrect(g, x + 1, yy + 1, w - 2, h - 4, 3, tone.fill);
  g.rect(x + 4, yy + 1, w - 8, 1, tone.hi);
  // 속성 띠(왼쪽)
  const ec = sk.el ? ELEMENT[sk.el].main : C.mute;
  g.rect(x + 2, yy + 5, 2, h - 12, poor ? C.slate : ec);
  g.text(sk.name, x + 9, yy + 6, { font: 'bold', color: tone.name });
  // 분류 아이콘 + 이름
  g.img(poor ? dimIcon(CAT_ICON[cat]) : icon(CAT_ICON[cat]), x + 9, yy + 24);
  g.text(CAT_NAME[cat], x + 23, yy + 24, { color: poor ? C.slate : C.mute });
  // 비용
  if (sk.cost === 0) g.text('무료', x + w - 8, yy + 24, { color: poor ? C.slate : C.teal4, align: 'right' });
  else { g.text(String(sk.cost), x + w - 8, yy + 24, { font: 'bold', color: poor ? C.slate : C.gold, align: 'right' }); g.img(poor ? dimIcon('energy') : icon('energy'), x + w - 22, yy + 24); }
  if (!poor && st.phase === 'pick') input.hit(id, x, y, w, h, () => { st.picked = sk.id; app.toast(sk.name); }, 2);
}

export const battle = {
  enter(p) { this.st = mockBattle(p.phase || 'pick'); },
  draw(app) {
    const { g, W, H, t } = app;
    const st = this.st;
    const PANEL_H = 228, AY = 24, AH = H - PANEL_H - AY;
    g.rect(0, 0, W, H, C.ink);
    const hit = st.hit;
    // 무대(1배 도트 — 배경·받침·식물이 같은 칸 크기, 2026-10-15 사용자 결정 ①안): 나 = 왼쪽 아래, 상대 = 오른쪽 위(좌우 뒤집힘)가 비스듬히 마주 봄
    //  식물 = 큰 판 96×112(대기 숨쉬기·깜빡임·특성 효과가 시트에 들어 있음), 받침 가운데 = 화분 굽이 바닥에 닿는 점
    g.clip(0, AY, W, AH, () => {
      arena1(g, 0, AY, W, AH, t);
      const ex = W - 76, ey = AY + 142, px = 76, py = AY + AH - 46, shake = hit ? 2 : 0;
      pad1(g, ex, ey, 40, null);
      pad1(g, px, py, 42, C.teal3);
      drawBig(g, st.foe.key, st.foe.pot, ex + shake, ey, { t, phase: 1600, flip: true, flash: !!hit });
      drawBig(g, st.me.key, st.me.pot, px + (hit ? 4 : 0), py, { t });
      if (hit) { // 타격 불꽃: 상대 몸 가운데
        const cx = ex, cy = ey - 60;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r1 = 12, r2 = i % 2 ? 26 : 34, c1 = i % 2 ? C.gold3 : C.white; for (const o of [0, 1]) g.line(Math.round(cx + Math.cos(a) * r1) + o, Math.round(cy + Math.sin(a) * r1), Math.round(cx + Math.cos(a) * r2) + o, Math.round(cy + Math.sin(a) * r2), c1); }
        g.disc(cx, cy, 8, C.white);
      }
    });
    // 위 띠: 턴 · 대회 · 항복
    g.rect(0, 0, W, AY, C.ink); g.rect(0, AY - 1, W, 1, C.shade);
    rbox(g, 6, 4, 36, 16, 4, C.night); g.text(`${st.turn}턴`, 24, 6, { font: 'bold', color: C.teal3, align: 'center' });
    g.text(`새싹 브론즈 · ${st.round}`, W / 2 - 18, 6, { color: C.mist, align: 'center' });
    for (let i = 0; i < st.bestOf; i++) { const x = W / 2 + 34 + i * 7; g.rect(x, 9, 5, 5, C.ink); g.rect(x + 1, 10, 3, 3, i < st.wins ? C.gold : (i === st.wins ? C.mist : C.slate)); }
    const fp = app.input.isPressed('bt_flag');
    rbox(g, W - 30, 4 + (fp ? 1 : 0), 24, 16, 4, C.shade); g.img(icon('flag'), W - 24, 6 + (fp ? 1 : 0));
    app.input.hit('bt_flag', W - 30, 4, 24, 16, () => app.go('home'), 6);
    // 상태판
    infoBox(app, 6, AY + 6, st.foe, false);
    infoBox(app, W - 138, AY + AH - 58, st.me, true);
    // 판정 띠(행동 중)
    if (hit) {
      const my = st.kit.find(k => k.id === st.picked);
      const cy = AY + Math.round(AH * 0.47);
      // 내 카드
      rbox(g, 10, cy, 104, 34, 5, C.night, C.teal3); g.rect(13, cy + 1, 98, 1, C.teal4);
      g.text('나', 18, cy + 5, { color: C.teal3 });
      g.img(icon(CAT_ICON[my.cats[0]]), 32, cy + 5);
      g.text(my.name, 18, cy + 19, { font: 'bold', color: C.white });
      // 선공 화살표
      g.text('선공', W / 2, cy + 4, { color: C.gold, align: 'center' });
      g.img(icon('left'), W / 2 - 4, cy + 19);
      // 상대 카드(다음 차례 — 동시에 공개, 아직 행동 전이라 흐리게)
      rbox(g, W - 114, cy, 104, 34, 5, C.shade); g.rect(W - 111, cy + 1, 98, 1, C.slate);
      g.text('상대', W - 106, cy + 5, { color: C.slate2 }); g.img(icon('sword'), W - 82, cy + 5);
      g.text(st.foeSkill || '물살 새순', W - 106, cy + 19, { font: 'bold', color: C.mute });
      // 피해 숫자(굉장 = 큰 숫자) — 상대 왼쪽 위
      const nx = 124, ny = AY + 70;
      bigTitle(g, `-${hit.dmg}`, nx, ny, { top: '#fca790', mid: C.red, low: '#ae2334', shadow: '#6e2727' });
      rbox(g, nx - 31, ny + 36, 62, 15, 4, C.gold); g.text('효과 굉장!', nx, ny + 38, { font: 'bold', color: C.ink, align: 'center' });
    }
    // 아래 판
    const PY = H - PANEL_H;
    g.rect(0, PY, W, PANEL_H, '#2b2238'); g.rect(0, PY, W, 1, C.slate); g.rect(0, PY + 1, W, 1, C.ink);
    // 대사 상자(밝은 종이)
    panel(g, 8, PY + 8, W - 16, 36, 'paper');
    const msg = hit ? '효과가 굉장하다!' : `${st.me.name}는 무엇을 할까?`;
    g.text(msg, 18, PY + 20, { font: 'bold', color: C.ink });
    if (!hit && Math.floor(t / 450) % 2) g.rect(W - 22, PY + 30, 5, 3, C.ink);
    // 에너지 줄 + 배속
    const ey = PY + 52;
    g.text('에너지', 12, ey + 1, { color: C.gold });
    energyPips(g, 52, ey, st.me.energy, st.me.energyMax, 12);
    button(app, 'bt_speed', W - 46, ey - 3, 38, 18, '1×', { style: 'night', icon: 'play', onTap: () => app.toast('2배속') });
    // 기술 6칸
    const gx = 8, gy = PY + 76, cw = Math.floor((W - 16 - 6) / 2), ch = 44;
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      skillButton(app, gx + col * (cw + 6), gy + row * (ch + 6), cw, ch, st.kit[i], { ...st, energy: st.me.energy });
    }
  },
};
