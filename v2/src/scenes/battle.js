import { arena1 } from '../art/bg.js';
import { icon, tinted } from '../art/icons.js';
import { drawBig, drawPortrait, BGIMG } from '../art/sprites.js';
import { T, plate, msgBox, btnBody, tbar, tpips, padV, venueOf } from '../art/theme.js';
import { bigTitle } from './common.js';
import { mockBattle, CAT_ICON, CAT_NAME } from '../data/mock.js';

// 체력판: 얼굴 초상 + (상대만) 닉네임·랭크 + 이름·속성 + 체력 막대 + 에너지 칸 + 체력 숫자
//  봇·사람 구분 없이 같은 정보만(성향·다음 수 경고 없음 — 2026-10-15 사용자)
function infoBox(app, x, y, u, mine) {
  const { g } = app, w = 140, h = mine ? 56 : 64, P = T.ptext;
  plate(g, x, y, w, h);
  plate(g, x + 5, y + 5, 30, 30, 'deep');
  g.clip(x + 9, y + 9, 22, 22, () => drawPortrait(g, u.key, x + 8, y + 8, 24, !mine));
  let yy = y + 6;
  const tx = x + 40;
  if (!mine) { g.text(`${u.trainer} · ${u.rank}`, tx, yy, { color: P.sub }); yy += 13; }
  g.text(u.name, tx, yy, { font: 'bold', color: P.main });
  g.img(icon(u.el), x + w - 20, yy);
  yy += 15;
  tbar(g, tx, yy, w - 46, 6, u.hp / u.max, 'hp');
  yy += 9;
  tpips(g, tx - 1, yy + 1, u.energy, Math.min(u.energyMax, 8), 7);
  g.text(`${u.hp}/${u.max}`, x + w - 7, mine ? y + h - 17 : yy + 8, { color: P.sub, align: 'right' });
}

function skillButton(app, x, y, w, h, sk, st) {
  const { g, input } = app;
  if (!sk) {
    btnBody(g, x, y, w, h, T.btn.off, true);
    g.text('빈 칸', x + w / 2, y + h / 2 - 6, { color: T.btn.off.text, align: 'center' });
    return;
  }
  const id = 'sk_' + sk.id, down = input.isPressed(id), lit = st.picked === sk.id, poor = sk.cost > st.energy;
  const S = poor ? T.btn.off : T.btn.primary;
  const { yy } = btnBody(g, x, y, w, h, S, down);
  if (lit) { g.rect(x - 1, yy - 1, w + 2, 1, T.text.gold); g.rect(x - 1, yy + h - 1 - (down ? 1 : 0), w + 2, 1, T.text.gold); g.rect(x - 1, yy, 1, h - 1, T.text.gold); g.rect(x + w, yy, 1, h - 1, T.text.gold); }
  const cat = sk.cats[0];
  // 이름 + 속성 아이콘(오른쪽 위)
  g.text(sk.name, x + 8, yy + 5, { font: 'bold', color: S.text });
  if (sk.el) g.img(poor ? tinted(sk.el, S.text) : icon(sk.el), x + w - 19, yy + 5);
  // 분류 아이콘 + 이름 · 비용
  g.img(poor ? tinted(CAT_ICON[cat], S.text) : icon(CAT_ICON[cat]), x + 8, yy + 23);
  g.text(CAT_NAME[cat], x + 22, yy + 23, { color: S.text });
  if (sk.cost === 0) g.text('무료', x + w - 9, yy + 23, { color: S.text, align: 'right' });
  else { g.text(String(sk.cost), x + w - 9, yy + 23, { font: 'bold', color: S.text, align: 'right' }); g.img(poor ? tinted('energy', S.text) : icon('energy'), x + w - 23, yy + 23); }
  if (!poor && st.phase === 'pick') input.hit(id, x, y, w, h, () => { st.picked = sk.id; app.toast(sk.name); }, 2);
}

export const battle = {
  // 경기장 = 랭크 단계로(브론즈·실버 온실 → 골드·플래티넘 우주선 → 다이아 이상 밤 정원), 촬영·시험은 ?venue= 로 고름
  theme(app) { return this.st?.venue || venueOf(app.state.tournament?.tier); },
  enter(p) { this.st = mockBattle(p.phase || 'pick'); if (p.venue) this.st.venue = p.venue; },
  draw(app) {
    const { g, W, H, t } = app;
    const st = this.st;
    const PANEL_H = 228, AY = 24, AH = H - PANEL_H - AY;
    g.rect(0, 0, W, H, T.ink);
    const hit = st.hit;
    // 무대(1배 도트 — 배경·받침·식물이 같은 칸 크기, 2026-10-15 사용자 결정 ①안): 나 = 왼쪽 아래, 상대 = 오른쪽 위(좌우 뒤집힘)가 비스듬히 마주 봄
    //  배경 = 장소별 경기장 그림(관중석 포함, assets/v2/bg/arena_<장소>.png), 받침·식물은 화분 굽이 바닥에 닿는 점에 맞춰 그린다
    g.clip(0, AY, W, AH, () => {
      const bg = BGIMG['arena_' + T.key];
      if (bg) g.img(bg, 0, AY); else arena1(g, 0, AY, W, AH, t);
      const ex = W - 76, ey = AY + 142, px = 76, py = AY + AH - 46, shake = hit ? 2 : 0;
      padV(g, ex, ey, 40, false);
      padV(g, px, py, 42, true);
      drawBig(g, st.foe.key, st.foe.pot, ex + shake, ey, { t, phase: 1600, flip: true, flash: !!hit });
      drawBig(g, st.me.key, st.me.pot, px + (hit ? 4 : 0), py, { t });
      if (hit) { // 타격 불꽃: 상대 몸 가운데
        const cx = ex, cy = ey - 60;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r1 = 12, r2 = i % 2 ? 26 : 34, c1 = i % 2 ? T.text.gold : '#ffffff'; for (const o of [0, 1]) g.line(Math.round(cx + Math.cos(a) * r1) + o, Math.round(cy + Math.sin(a) * r1), Math.round(cx + Math.cos(a) * r2) + o, Math.round(cy + Math.sin(a) * r2), c1); }
        g.disc(cx, cy, 8, '#ffffff');
      }
    });
    // 위 띠: 턴 · 대회 · 판 수 · 항복
    g.rect(0, 0, W, AY, T.bg2); g.rect(0, AY - 2, W, 1, T.panel.frameLo); g.rect(0, AY - 1, W, 1, T.ink);
    btnBody(g, 5, 3, 38, 18, T.btn.second, true);
    g.text(`${st.turn}턴`, 24, 6, { font: 'bold', color: T.btn.second.text, align: 'center' });
    g.text(`${st.tierName || '새싹 브론즈'} · ${st.round}`, W / 2 - 14, 6, { color: T.text.main, align: 'center' });
    for (let i = 0; i < st.bestOf; i++) { const x = W / 2 + 40 + i * 7; g.rect(x, 8, 6, 6, T.ink); g.rect(x + 1, 9, 4, 4, i < st.wins ? T.text.gold : (i === st.wins ? T.text.main : T.bar.back)); }
    const fp = app.input.isPressed('bt_flag');
    btnBody(g, W - 31, 3, 26, 18, T.btn.second, fp);
    g.img(icon('flag'), W - 24, 5 + (fp ? 1 : 0));
    app.input.hit('bt_flag', W - 31, 3, 26, 18, () => app.go('home'), 6);
    // 체력판
    infoBox(app, 6, AY + 6, st.foe, false);
    infoBox(app, W - 146, AY + AH - 62, st.me, true);
    // 판정 띠(행동 중)
    if (hit) {
      const my = st.kit.find(k => k.id === st.picked), P = T.ptext;
      const cy = AY + Math.round(AH * 0.47);
      plate(g, 8, cy, 108, 38);
      g.text('나', 14, cy + 6, { color: P.accent });
      g.img(icon(CAT_ICON[my.cats[0]]), 28, cy + 6);
      g.text(my.name, 14, cy + 20, { font: 'bold', color: P.main });
      g.text('선공', W / 2, cy + 4, { font: 'bold', color: T.text.gold, align: 'center', shadow: T.ink });
      g.img(icon('left'), W / 2 - 4, cy + 20);
      // 상대 카드(다음 차례 — 동시에 공개, 아직 행동 전이라 어두운 판)
      plate(g, W - 116, cy, 108, 38, 'deep');
      g.text('상대', W - 110, cy + 6, { color: T.text.dim }); g.img(icon('sword'), W - 86, cy + 6);
      g.text(st.foeSkill || '물살 새순', W - 110, cy + 20, { font: 'bold', color: T.text.sub });
      // 피해 숫자(굉장 = 큰 숫자) — 상대 왼쪽 위
      const nx = 124, ny = AY + 70;
      bigTitle(g, `-${hit.dmg}`, nx, ny, { top: '#fca790', mid: '#e83b3b', low: '#ae2334', shadow: '#6e2727' });
      btnBody(g, nx - 33, ny + 35, 66, 17, T.btn.gold, true);
      g.text('효과 굉장!', nx, ny + 38, { font: 'bold', color: T.btn.gold.text, align: 'center' });
    }
    // 아래 판: 대사 상자 → 에너지 → 기술 6칸
    const PY = H - PANEL_H;
    g.rect(0, PY, W, PANEL_H, T.bg2);
    for (let y = PY + 6; y < H; y += 6) g.rect(0, y, W, 1, T.bg);   // 은은한 가로결
    g.rect(0, PY, W, 1, T.ink); g.rect(0, PY + 1, W, 1, T.panel.frame); g.rect(0, PY + 2, W, 1, T.panel.frameLo);
    msgBox(g, 8, PY + 9, W - 16, 36);
    const msg = hit ? '효과가 굉장하다!' : `${st.me.name}는 무엇을 할까?`;
    g.text(msg, 18, PY + 20, { font: 'bold', color: T.mtext.main });
    if (!hit && Math.floor(t / 450) % 2) g.rect(W - 22, PY + 31, 5, 3, T.mtext.sub);
    // 에너지 줄(빨리 감기 단추 없음 — 2026-10-15 사용자 "필요 없는 기능")
    const ey = PY + 53;
    g.text('에너지', 12, ey, { font: 'bold', color: T.text.gold });
    tpips(g, 54, ey + 2, st.me.energy, st.me.energyMax, 9);
    g.text(`${st.me.energy}/${st.me.energyMax}`, W - 12, ey, { color: T.text.sub, align: 'right' });
    // 기술 6칸
    const gx = 8, gy = PY + 72, cw = Math.floor((W - 16 - 6) / 2), ch = 44;
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      skillButton(app, gx + col * (cw + 6), gy + row * (ch + 6), cw, ch, st.kit[i], { ...st, energy: st.me.energy });
    }
  },
};
