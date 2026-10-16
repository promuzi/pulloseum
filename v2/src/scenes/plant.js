import { ELEMENT } from '../art/palette.js';
import { button, fmt, rbox, rrect, holoTab, tagBox } from '../art/ui.js';
import { cardFront, cardSlot, renderFaces, drawFlip } from '../art/skillcard.js';
import { sfx } from '../core/sound.js';
import { icon, tinted } from '../art/icons.js';
import { bigKey } from '../art/sprites.js';
import { T, btnBody, tbar, holo } from '../art/theme.js';
import { STAT_DEF, miniStars, ivRing } from './common.js';
import { CAT_ICON, CAT_NAME } from '../data/mock.js';
import { basicsOf } from '../battle/model.js';
import { fxChip, BUFF_LOOK } from '../art/statusLook.js';
import { LOFT_STOOL, loftView, loftPlant, loftZoom, loftPlantCy } from '../art/loft.js';
import { FOCUS, focusOf, plantSheetY } from './home.js';
import { SPECIES, SKILLS, JONG, STAT_KEYS, STAT_NAME, UP_GAIN, IV_KEYS, IV_MAX, TIER_NAME, upCost, resetCost, canGraft, starsOf } from '../game/catalog.js';
import { plantStats, sellPrice, BASIC_IDS } from '../game/logic.js';
import { stageKey, stageName, stars, growInfo, ivSum, IV_TOTAL } from '../game/view.js';
import { openForm } from '../core/form.js';
import { ask, showGot, sellAsk, cutAsk } from './popups.js';
import { eul, ga, eun } from '../core/josa.js';

// 식물 관리(2026-10-15 사용자 "가운데 식물을 누르면 … 암실 … 식물의 강화와 각종 식물 스킬과 세팅"):
//  홈이 불을 끄고 다가간 그 카메라 그대로 — 위 = 돌아가기·이름·별·정체성 · 생장(물·비료·진화), 아래 판 = 기술 · 강화 · 개체값 · 설정.
//  기술(2026-10-16 사용자 "기억 = 전투 칸만큼 + 조커 하나 보관"): 기본기 · 전투 3칸 · 조커 1칸 · 새로 핀 기술(칸이 차면 놓을 칸 고르기) · 지운 기술(회귀 주사) · 접목.
//  강화 = 레벨업 포인트 + 돈(상한 없음, 초기화 = 돈) · 개체값 = 원형 게이지 + 거름(같은 식물) · 설정 = 이름 · 보관 · 암시장(판매·해체).
const SHEET_Y = 258, IN_MS = 320, OUT_MS = 220;
const PCARD = { w: 61, h: 90, gx: 3 }, HOLD_MS = 320;   // 기술 카드(전투 손패와 같은 앞면 — 판 오른쪽 스크롤 막대를 피해 1칸 좁게)
const TABS = [{ id: 'skill', label: '기술' }, { id: 'up', label: '강화' }, { id: 'iv', label: '개체값' }, { id: 'set', label: '설정' }];
const IV_COL = { hp: '#7cf0a0', atk: '#ff8a6a', def: '#6fb8ff', spd: '#ffd84a' };
const ease = k => k * k * (3 - 2 * k);
const skillOf = id => (id ? { act: 'attack', cats: ['attack'], ...SKILLS[id] } : null);
// 기본기도 카드로(전투 칸에 넣고 뺌 — 2026-10-16 사용자 "기본스킬 3개도 바꿀 수 있게")
const skOf = (p, id) => (!id ? null : BASIC_IDS.includes(id) ? { ...basicsOf(p.key).find(b => b.id === id), basic: true } : skillOf(id));
const fxOf = sk => (sk.inflict ? { id: sk.inflict.id } : sk.self ? { buff: BUFF_LOOK[sk.self] || sk.self } : null);

// 기술 카드: 이름 · 속성 / 분류 · 효과 칩 · 비용. 조커 칸 = 금빛 테, 고른 칸 = 청록 테, 새 기술 = 주황 테
function skillCard(app, id, x, y, w, h, sk, sel, onTap, frame = null, emptyLabel = '빈 칸') {
  const { g, input } = app, down = !!onTap && input.isPressed(id);
  if (!sk) {
    holo(g, x, y, w, h, T.deep, 16);
    g.text(emptyLabel, x + w / 2, y + Math.round(h / 2) - 7, { font: 'label', color: T.text.dim, align: 'center' });
  } else {
    const S = T.btn.second, { yy } = btnBody(g, x, y, w, h, S, down);
    g.text(sk.name, x + 8, yy + 3, { font: 'label', color: S.text });
    const tier = sk.basic ? '기본기' : TIER_NAME[sk.tier];
    if (tier) { const tw = g.textW(tier); g.text(tier, x + w - (sk.el ? 24 : 8) - tw, yy + 4, { color: sk.basic ? '#9fd0ff' : sk.tier === 'u' ? '#ffd890' : sk.tier === 'c3' ? '#c48cff' : S.sub || S.text }); }
    if (sk.el) g.img(icon(sk.el), x + w - 18, yy + 4);
    const cat = sk.cats[0];
    g.img(icon(CAT_ICON[cat] || 'sword'), x + 8, yy + 19);
    g.text(sk.power ? `${CAT_NAME[cat]} ${sk.power}` : CAT_NAME[cat], x + 22, yy + 18, { color: S.text });
    let cx = x + 22 + g.textW(sk.power ? `${CAT_NAME[cat]} ${sk.power}` : CAT_NAME[cat]) + 6;
    const f = fxOf(sk);
    if (f) cx += fxChip(g, cx, yy + 17, f.id || null, f.buff) + 3;
    if (sk.also && BUFF_LOOK[sk.also]) fxChip(g, cx, yy + 17, null, BUFF_LOOK[sk.also]);
    if (sk.cost) { g.img(icon('energy'), x + w - 23, yy + 19); g.text(String(sk.cost), x + w - 8, yy + 18, { font: 'label', color: S.text, align: 'right' }); }
    else g.text('무료', x + w - 8, yy + 18, { color: S.text, align: 'right' });
  }
  const fc = frame || (sel ? '#8ccfff' : null);
  if (fc) { g.rect(x - 1, y - 1, w + 2, 1, fc); g.rect(x - 1, y + h, w + 2, 1, fc); g.rect(x - 1, y, 1, h, fc); g.rect(x + w, y, 1, h, fc); }
  if (onTap) input.hit(id, x, y, w, h, onTap, 2);
}

export const plant = {
  theme: 'loft',
  enter(p) {
    this.sel = p.sel == null ? null : p.sel === 'j' ? 'j' : 'b' + p.sel;   // ?sel = 검토 촬영(고른 칸)
    this.tab = p.tab || 'skill'; this.sub = p.sub || null; this.ivStat = null; this.scrollY = 0; this.maxY = 0;
    this.t0 = p.focus ? null : -1e9; this.out = null; this.gone = false;   // 홈 암실 연출에서 왔을 때만 판이 올라옴
  },
  onDrag(dy, dx, ev) {
    // 꾹 눌러 집은 기술 카드 = 손가락을 따라옴(놓은 칸과 바꿈 · 교체), 그 밖은 판 위아래 굴리기
    if (this.cardDrag) { this.cardDrag.x += dx; this.cardDrag.y += dy; this.cardDrag.moved = true; return; }
    if (ev.y0 < (this.app ? plantSheetY(this.app) : SHEET_Y) + 40) return; this.scrollY = Math.max(0, Math.min(this.maxY, this.scrollY - dy));
  },
  onRelease(ev) {
    const D = this.cardDrag; if (!D) return;
    this.cardDrag = null;
    const to = this.cardKeyAt(D.x, D.y), app = this.app, p = app && app.state && (app.state.plants[app.state.active] || app.state.plants[0]);
    if (!to || to === D.key || !p) return;
    if (D.key === 'pend') { this.sel = null; return this.pickSlot(app, p, to); }   // 새로 핀 기술 → 놓은 칸에(확인)
    if (p.pend && p.pend.length) return app.toast('새로 핀 기술부터 놓아 주세요');
    this.sel = D.key; this.pickSlot(app, p, to);   // 끈 카드 → 놓은 칸(자리 바꿈 규칙)
  },
  leave(app) { if (this.out == null) this.out = app.t; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const p = s.plants[s.active] || s.plants[0];
    if (!p) { app.go('home'); return; }
    const key = bigKey(p.key, stageKey(p)), [mx, my] = LOFT_STOOL, pc = loftPlantCy(key), F = focusOf(app), SY = plantSheetY(app);
    this.app = app;
    if (this.t0 == null) this.t0 = t;
    loftView(app, { dark: 1, z: loftZoom(app, F.want), px: mx, py: pc, sx: F.sx, sy: F.sy, plant: () => loftPlant(app, key, p.pot, mx, my) });
    // 들어옴 = 위 글자가 나타나고 아래 판이 올라옴, 나감 = 거꾸로 → 홈(불 켜짐)
    let k = ease(Math.min(1, (t - this.t0) / IN_MS));
    if (this.out != null) { const o = Math.min(1, (t - this.out) / OUT_MS); k = Math.min(k, 1 - ease(o)); if (o >= 1 && !this.gone) { this.gone = true; app.go('home', { from: 'plant' }, 'cut'); } }
    const live = k >= 1 && this.out == null && !app.popup && !app.confirm;
    g.alpha(k, () => { this.top(app, p, live); this.growStrip(app, p, live, SY - 30); });
    const sy = Math.round(SY + (1 - k) * (H - SY + 4));
    g.c.save(); g.c.translate(0, sy - SY);
    this.sheet(app, p, live, SY);
    g.c.restore();
    // 기술 카드: 끄는 카드(손가락 따라 · 떠 있음) · 꾹 눌러 꺼내 보기
    if (this.cardDrag && this.cardRects) { const D = this.cardDrag, r = this.cardRects[D.key]; if (r && r.sk) { const x = Math.round(D.x - D.ox), y = Math.round(D.y - D.oy) - 6; rrect(g, x + 2, y + 8, PCARD.w, PCARD.h, 5, 'rgba(0,0,0,0.45)'); cardFront(g, x, y, PCARD.w, PCARD.h, r.sk, { can: true, lit: true }); } }
    const d = app.input.down;
    if (live && this.tab === 'skill' && !this.sub && !this.peek && !this.cardDrag && d && !d.moved && d.id && d.id.startsWith('skc_') && app.input.holdMs() >= HOLD_MS) {   // 꾹 = 집기(들려 올라옴)
      const k = d.id.slice(4), r = this.cardRects && this.cardRects[k];
      if (r && r.sk) { app.input.claimHold(); sfx('select'); this.cardDrag = { key: k, x: d.x0, y: d.y0, ox: d.x0 - r.x, oy: d.y0 - r.y, moved: false }; }
    }
    if (this.cardDrag && !app.input.down && !this.cardDrag.moved) this.cardDrag = null;   // 집었다 그냥 놓음 = 제자리
    if (this.peek) this.drawPeek(app);
  },
  // 위: 돌아가기 · 이름 + 별 + 이름 바꾸기 · 정체성 꼬리표 · 오른쪽 위 생장(물 · 비료 · 진화)
  top(app, p, live) {
    const { g, W, state: s } = app, P = T.ptext, pr = app.input.isPressed('pl_back');
    const { yy } = btnBody(g, 6, 6, 30, 26, T.btn.second, pr);
    g.img(tinted('back', T.btn.second.text), 17, yy + 8);
    if (live) app.input.hit('pl_back', 6, 6, 30, 26, () => this.leave(app), 8);
    g.text(p.name, 44, 9, { font: 'name', color: p.shiny ? '#ffe8a8' : '#f4fbff', outline: '#05070f', outlineW: 3 });
    const nw = g.textW(p.name, 'name');
    miniStars(g, 44 + nw + 6, 14, stars(p));
    g.img(icon('pencil'), 44 + nw + 50, 12);
    if (live) app.input.hit('pl_name', 44, 6, nw + 62, 26, () => this.rename(app, p), 2);
    const sp = SPECIES[p.key], el = ELEMENT[sp.el];
    const list = [{ ic: sp.type, label: JONG[sp.type] }, { ic: sp.el, label: el.name, col: el.light }, { ic: 'seed', label: `${stageName(p)} Lv${p.lv}` }];
    let x = 8;
    for (const r of list) { const w = 22 + g.textW(r.label, 'label'); tagBox(g, x, 40, w, 18); g.img(icon(r.ic), x + 5, 44); g.text(r.label, x + 18, 43, { font: 'label', color: r.col || '#e6f3ff' }); x += w + 4; }
    if (p.legend || p.trait) { const tag = p.legend ? '전설' : p.trait === 'fruity' ? '열매용' : '관상용', w = 12 + g.textW(tag, 'label'); rbox(g, x, 40, w, 18, 5, '#3a2a18', '#f0be7d'); g.text(tag, x + 6, 43, { font: 'label', color: '#ffd890' }); }
  },
  // 생장 줄(식물 아래 · 판 바로 위 — 2026-10-16 사용자 "비료와 물 주기 등을 다른 곳에 잘 배치해줘", 전엔 오른쪽 위 판이 식물 잎을 가렸음):
  //  왼쪽 = Lv · 생장 막대 · 숫자, 오른쪽 = 물 · 비료(또는 진화하기)
  growStrip(app, p, live, y) {
    const { g, W, state: s } = app, P = T.ptext, gi = growInfo(p), st = T.card || T.panel, h = 26, x = 8, w = W - 16;
    holo(g, x, y, w, h, st, 16);
    this.growR = [x, y, w, h];   // 처음 안내가 가리킬 자리
    const bw = gi.ready ? 96 : gi.done ? 0 : 92, lx = x + 8, rx = x + w - bw - 6;
    g.text(gi.ready ? '진화 가능' : gi.done ? '다 자랐어요' : `Lv${p.lv}`, lx, y + 6, { font: 'label', color: gi.ready ? '#ffd890' : P.sub });
    if (!gi.done && !gi.ready) {
      const tx = lx + g.textW(`Lv${p.lv}`, 'label') + 6, num = `${gi.cur}/${gi.need}`, nw = g.textW(num);
      tbar(g, tx, y + 11, Math.max(20, rx - 8 - nw - 6 - tx), 4, gi.pct, 'exp');
      g.text(num, rx - 8, y + 7, { color: P.main, align: 'right' });
    }
    if (gi.ready) button(app, 'pl_evo', rx, y + 3, bw, 20, '진화하기', { style: 'gold', font: 'bold', icon: 'up', iconTint: true, onTap: live ? () => this.evolve(app, p) : null });
    else if (!gi.done) {
      button(app, 'pl_w', rx, y + 3, 44, 20, String(s.items.water || 0), { style: 'teal', icon: 'can', disabled: !s.items.water, onTap: live ? () => this.feed(app, p, 'water') : null });
      button(app, 'pl_f', rx + 48, y + 3, 44, 20, String(s.items.fert || 0), { style: 'teal', icon: 'fert', disabled: !s.items.fert, onTap: live ? () => this.feed(app, p, 'fert') : null });
    }
  },
  // 아래 판: 탭 + 내용(끌어서 위아래로)
  sheet(app, p, live, SHEET_Y = 258) {
    const { g, W, H } = app, st = T.card || T.panel;
    holo(g, 4, SHEET_Y, W - 8, H - SHEET_Y + 6, st, 16);
    const tw = Math.floor((W - 24) / TABS.length);
    TABS.forEach((tb, i) => {
      holoTab(app, 'pt_' + tb.id, 12 + i * tw, SHEET_Y + 8, tw - 4, 27, tb.label, tb.id === this.tab, live ? () => { this.tab = tb.id; this.sub = null; this.scrollY = 0; } : null, 'value');
      const dot = (tb.id === 'up' && p.pts > 0) || (tb.id === 'skill' && p.pend && p.pend.length);   // 쓸 포인트 · 놓을 새 기술
      if (dot) { const dx = 12 + i * tw + tw - 10; g.disc(dx, SHEET_Y + 11, 4, '#05070f'); g.disc(dx, SHEET_Y + 11, 3, '#ff7a5a'); }
    });
    const y0 = SHEET_Y + 44, top = y0 - 4, h = H - top;
    this.clipTop = top; this.clipBot = H;
    let bottom = y0;
    g.clip(0, top, W, h, () => {
      g.c.save(); g.c.translate(0, -this.scrollY);
      const lv = live && !app.input.dragging;
      if (this.sub === 'forgot') bottom = this.drawForgot(app, p, y0, lv);
      else if (this.sub === 'graft') bottom = this.drawGraft(app, p, y0, lv);
      else if (this.tab === 'up') bottom = this.drawUp(app, p, y0, lv);
      else if (this.tab === 'iv') bottom = this.drawIv(app, p, y0, lv);
      else if (this.tab === 'set') bottom = this.drawSet(app, p, y0, lv);
      else bottom = this.drawSkill(app, p, y0, lv);
      g.c.restore();
    });
    this.maxY = Math.max(0, bottom - H + 12);
    if (this.scrollY > this.maxY) this.scrollY = this.maxY;
    if (this.maxY > 0) { const bh = Math.max(16, Math.round(h * h / (h + this.maxY))), by = top + Math.round((h - bh) * this.scrollY / this.maxY); g.rect(W - 7, by, 2, bh, '#4f84bf'); }
  },
  // 판 안 누르기: 끌어 올린 만큼 자리를 옮겨 등록(그린 자리와 누르는 자리를 맞춤)
  hitY(y) { return y - this.scrollY; },
  hit(app, live, id, x, y, w, h, fn) { const yy = this.hitY(y); if (!live || !fn || yy < this.clipTop || yy + h > this.clipBot) return; app.input.hit(id, x, yy, w, h, fn, 2); },
  btn(app, live, id, x, y, w, h, label, opt, fn) { button(app, id, x, y, w, h, label, { ...opt, onTap: null }); if (!opt.disabled) this.hit(app, live, id, x, y, w, h, fn); },

  // ── 기술 ──
  // 전투 칸 넷(배운 기술 · 기본기) → 보관(전투 칸에 없는 기본기 · 조커 한 칸)(2026-10-16 사용자 "총 전투에 들고가는 스킬은 4개 · 기본 스킬은 조커처럼 항상 빼고 넣고 가능(버릴 수 없음)")
  //  전투와 같은 카드(사용자 "식물 스킬 설정할 때 거기도 카드형식으로 — 같은 ui로. 꾹 누르면 상세, 스킬 순서 배치도 바꿀 수 있게"):
  //  누름 = 고르기(두 장 = 자리 바꿈) · 끌어서 다른 칸에 놓기 · 꾹 = 뒷면(자세히)
  drawSkill(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, S = p.skills, B4 = S.battle.length >= 4 ? S.battle : [...S.battle, null, null, null, null].slice(0, 4);
    this.cardRects = {};
    let y = y0;
    const pend = p.pend && p.pend[0], x0 = Math.round((W - 4 * PCARD.w - 3 * PCARD.gx) / 2), cx = i => x0 + i * (PCARD.w + PCARD.gx);
    // 누름 = 뒷면 크게 · 꾹 = 집어서 끌어 다른 칸에(바꿈 · 교체) — 안내 문구는 빼고 나중에 도움말(사용자 2026-10-16)
    if (pend) {   // 새로 핀 기술: 꾹 눌러 전투 칸이나 보관 칸으로 끌어 놓음 · 안 배우기
      g.text('새로 핀 기술', 14, y, { font: 'value', color: '#ffb46a' });
      if (p.pend.length > 1) g.text(`${p.pend.length}개 기다림`, W - 14, y + 2, { color: '#ffd8a8', align: 'right' });
      y += 18;
      this.card(app, p, live, 'pend', cx(0), y, skillOf(pend), false, '#ffb46a');
      this.btn(app, live, 'sk_skip', cx(1) + 6, y + PCARD.h - 22, 84, 20, '안 배우기', { style: 'night' }, () => ask(app, `${eul(SKILLS[pend].name)} 안 배울까요?`, '지운 기술로 가요', () => app.act('place', { id: p.uid, skill: pend, target: 'skip' })));
      y += PCARD.h + 10;
    }
    g.text('전투에 들고 가는 기술', 14, y, { font: 'value', color: P.main });
    g.text(`${B4.filter(Boolean).length}/4`, W - 14, y + 1, { font: 'label', color: P.sub, align: 'right' });
    y += 18;
    for (let i = 0; i < 4; i++) this.card(app, p, live, 'b' + i, cx(i), y, skOf(p, B4[i]), false, null, '빈 칸');
    y += PCARD.h + 10;
    // 보관: 전투 칸에 없는 기본기(늘 앎 — 빼도 안 사라짐) + 조커 한 칸(배운 기술 하나)
    g.text('보관', 14, y, { font: 'value', color: '#ffd890' });
    y += 18;
    const stored = [...BASIC_IDS.filter(id => !B4.includes(id)).map(id => 'x:' + id), 'j'];
    stored.forEach((k, i) => this.card(app, p, live, k, cx(i), y, k === 'j' ? skillOf(S.joker) : skOf(p, k.slice(2)), false, k === 'j' ? '#ffd890' : '#7fa8d8', '빈 보관'));
    y += PCARD.h + 14;
    const bw = Math.floor((W - 34) / 2);
    this.btn(app, live, 'sk_forgot', 14, y, bw, 30, `지운 기술 ${S.forgot.length}`, { style: 'night', icon: 'potion' }, () => { this.sub = 'forgot'; this.scrollY = 0; });
    this.btn(app, live, 'sk_graft', 20 + bw, y, bw, 30, `접목 가지 ${s.scions.length}`, { style: 'night', icon: 'vine' }, () => { this.sub = 'graft'; this.scrollY = 0; });
    return y + 40;
  },
  // 카드 한 장(전투와 같은 앞면): 고른 칸 = 금빛으로 떠오름 · 끌거나 꺼내 보는 중 = 빈 자리 · 테 색 = 보관(기본기 파랑 · 조커 금빛)
  card(app, p, live, k, x, y, sk, sel, frame = null, empty = '') {
    const { g, input } = app, id = 'skc_' + k, away = (this.cardDrag && this.cardDrag.key === k) || (this.peek && this.peek.key === k);
    if (away) cardSlot(g, x, y, PCARD.w, PCARD.h);
    else if (!sk) cardSlot(g, x, y, PCARD.w, PCARD.h, empty);
    else {
      const down = live && input.isPressed(id);
      rrect(g, x + 1, y + 3, PCARD.w, PCARD.h, 5, sel ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.32)');
      cardFront(g, x, y + (sel ? -5 : down ? 1 : 0), PCARD.w, PCARD.h, sk, { can: true, lit: sel });
      if (frame && !sel) { g.rect(x + 2, y + PCARD.h + 2, PCARD.w - 4, 2, frame); }   // 보관 카드 아래 색 띠
    }
    this.cardRects[k] = { x, y: this.hitY(y), w: PCARD.w, h: PCARD.h, sk };
    this.hit(app, live, id, x, y, PCARD.w, PCARD.h, () => { if (sk) this.openPeek(app, k); });   // 누름 = 뒷면 크게(다시 누르면 닫힘)
  },
  cardKeyAt(x, y) { for (const [k, r] of Object.entries(this.cardRects || {})) if (k !== 'pend' && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return k; return null; },
  // 누름 = 그 카드를 앞으로 가져와 뒤집어 뒷면(전투 손패의 꾹과 같은 움직임 — art/skillcard.js) · 아무 데나 누르면 다시 뒤집혀 제자리로
  openPeek(app, k) {
    const r = this.cardRects && this.cardRects[k]; if (!r || !r.sk) return;
    sfx('flip');
    const kk = app.g.c.getTransform().a || 1, BW = Math.min(app.W - 100, 160), BH = Math.round(BW * 90 / 66);
    this.peek = { key: k, from: r, BW, BH, faces: renderFaces(r.sk, 66, 90, BW, BH, kk, { can: true }), p: 0, last: app.t, closing: false };
  },
  drawPeek(app) {
    const { g, W, H, input, t } = app, P = this.peek, c = g.c, dt = Math.min(50, Math.max(0, t - P.last));
    P.last = t;
    P.p = !P.closing ? Math.min(1, P.p + dt / 380) : Math.max(0, P.p - dt / 280);
    if (P.closing && P.p <= 0) { this.peek = null; return; }
    const q = P.p, pos = 1 - (1 - q) ** 3, th = Math.PI * (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);
    c.fillStyle = `rgba(6,10,18,${(0.62 * pos).toFixed(3)})`; c.fillRect(0, 0, W, H);
    input.hit('peek_block', 0, 0, W, H, () => { if (P.p > 0.3) { P.closing = true; sfx('flip'); } });
    const F = P.from, fx = F.x + F.w / 2, fy = F.y + F.h / 2, cx = fx + (W / 2 - fx) * pos, cy = fy + (H * 0.42 - fy) * pos - Math.sin(pos * Math.PI) * 14;
    const w = F.w + (P.BW - F.w) * pos, h = F.h + (P.BH - F.h) * pos;
    drawFlip(c, P.faces.front, P.faces.back, cx, cy, w, h, th);
  },
  // 칸 누르기(k = 'b0'~'b3' 전투 칸 · 'j' 조커 · 'x:기본기 id' 보관한 기본기): 새 기술이 기다리면 그 칸에 놓기(확인),
  //  아니면 두 칸을 차례로 눌러 바꿈 — 전투 칸끼리 = 순서(손패 순서), 전투 칸 ↔ 보관 = 넣고 빼기. 빠진 배운 기술은 조커 칸으로(조커가 차 있으면 막음)
  pickSlot(app, p, k) {
    const pend = p.pend && p.pend[0], S = p.skills, B4 = S.battle.length >= 4 ? [...S.battle] : [...S.battle, null, null, null, null].slice(0, 4);
    if (pend) {
      if (k[0] !== 'b' && k !== 'j') return app.toast('새 기술은 전투 칸이나 조커 칸에 놓아요');
      const old = k === 'j' ? S.joker : B4[+k.slice(1)], nm = SKILLS[pend].name;
      const go = () => app.act('place', { id: p.uid, skill: pend, target: k === 'j' ? 'joker' : k }).then(r => r && app.toast(`${eul(nm)} 놓았어요`));
      if (!old) return go();
      if (BASIC_IDS.includes(old)) return ask(app, `${eul(nm)} 이 칸에 놓을까요?`, `기본기 ${eun(skOf(p, old).name)} 보관으로 가요`, go, '놓기');
      return ask(app, `${eul(nm)} 이 칸에 놓을까요?`, `원래 기술 ${eun(SKILLS[old].name)} 지운 기술로 가요`, go, '놓기');
    }
    if (this.sel == null) { this.sel = k; return; }
    if (this.sel === k) { this.sel = null; return; }
    let a = this.sel, b = k;
    if (a[0] !== 'b' && b[0] !== 'b') { this.sel = k; return; }   // 보관끼리는 고르기만 옮김
    if (a[0] !== 'b') [a, b] = [b, a];   // a = 전투 칸
    const i = +a.slice(1);
    if (b[0] === 'b') { const j = +b.slice(1); [B4[i], B4[j]] = [B4[j], B4[i]]; }
    else if (b === 'j') B4[i] = S.joker || null;   // 조커 ↔ 전투 칸(전투 칸에 있던 배운 기술은 조커로, 기본기면 보관으로)
    else B4[i] = b.slice(2);                       // 보관한 기본기를 전투 칸에(있던 배운 기술은 조커로)
    const learned = [...S.battle, S.joker].filter(x => x && !BASIC_IDS.includes(x)), left = learned.filter(x => !B4.includes(x));
    this.sel = null;
    if (left.length > 1) return app.toast('보관 칸은 하나예요 — 조커 칸의 기술을 먼저 전투 칸으로 옮겨요');
    if (!B4.some(Boolean)) return app.toast('전투 칸에 기술이 하나는 있어야 해요');
    app.act('setLoadout', { id: p.uid, battle: B4 }).then(r => r && app.toast(b[0] === 'b' ? '순서를 바꿨어요' : '전투 칸을 바꿨어요'));
  },
  drawForgot(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, S = p.skills, n = s.items.regress || 0, free = S.battle.includes(null) || S.battle.some(x => BASIC_IDS.includes(x)) || !S.joker;
    this.btn(app, live, 'fg_back', 12, y0 - 2, 52, 22, '‹ 기술', { style: 'night' }, () => { this.sub = null; this.scrollY = 0; });
    g.text('지운 기술', 72, y0 + 1, { font: 'value', color: P.main });
    g.img(icon('potion'), W - 100, y0 + 2); g.text(`회귀 주사 ${n}`, W - 14, y0 + 2, { font: 'label', color: '#d0e8ff', align: 'right' });
    let y = y0 + 28;
    if (!free) { g.text('칸이 다 찼어요', 14, y, { color: '#ffb0a0' }); y += 20; }
    if (!S.forgot.length) { g.text('지운 기술이 없어요', W / 2, y + 10, { color: P.dim, align: 'center' }); return y + 40; }
    S.forgot.forEach((id, i) => {
      const sk = skillOf(id);
      skillCard(app, 'fg_' + i, 14, y, W - 100, 34, sk, false, null);
      this.btn(app, live, 'fg_go_' + i, W - 80, y + 4, 66, 26, '되돌리기', { style: 'gold', font: 'label', disabled: !n || !free }, () => ask(app, `${eul(sk.name)} 되돌릴까요?`, '유전자 회귀 주사 1개를 써요', () => app.act('regress', { id: p.uid, skill: id }).then(r => r && app.toast(`${sk.name} — 되돌렸어요`)), '되돌리기'));
      y += 40;
    });
    return y;
  },
  drawGraft(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext;
    this.btn(app, live, 'gf_back', 12, y0 - 2, 52, 22, '‹ 기술', { style: 'night' }, () => { this.sub = null; this.scrollY = 0; });
    g.text('접목 가지', 72, y0 + 1, { font: 'value', color: P.main });
    let y = y0 + 28;
    if (!s.scions.length) { g.text('가진 접목 가지가 없어요', W / 2, y + 10, { color: P.dim, align: 'center' }); return y + 40; }
    const known = new Set([...p.skills.battle, p.skills.joker, ...p.skills.forgot, ...p.pend].filter(Boolean));
    s.scions.forEach((sc, i) => {
      const sk = skillOf(sc.skill), why = known.has(sc.skill) ? '이미 아는 기술' : canGraft(p, sc.skill);
      skillCard(app, 'gs_' + i, 14, y, W - 100, 34, sk, false, null);
      if (why) g.text(why, W - 47, y + 12, { color: '#ffb0a0', align: 'center' });
      else {
        this.btn(app, live, 'gs_go_' + i, W - 80, y + 4, 66, 26, '접목', { style: 'gold', font: 'label' }, () => app.act('graft', { id: p.uid, scion: sc.id }).then(r => r && app.toast(r.to === 'pend' ? `${sk.name} — 놓을 칸을 골라요` : `${eul(sk.name)} 배웠어요`)));
      }
      y += 40;
    });
    return y;
  },

  // ── 강화: 포인트 + 돈(상한 없음) · 초기화 = 돈 ──
  drawUp(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, ps = plantStats(p), cost = upCost(p.spent), spent = Object.values(p.up || {}).reduce((a, b) => a + b, 0);
    g.text('강화 포인트', 14, y0 + 1, { font: 'label', color: P.sub });
    g.text(String(p.pts), 14 + g.textW('강화 포인트', 'label') + 6, y0, { font: 'value', color: p.pts ? '#ffd890' : P.dim });
    g.text(`1포인트 = 돈 ${cost}`, 14, y0 + 18, { color: P.sub });
    const rc = resetCost(p);
    this.btn(app, live, 'up_reset', W - 98, y0 - 1, 84, 26, `초기화 ${rc}`, { style: 'night', icon: 'coin', disabled: !spent }, () => ask(app, '강화를 처음으로 되돌릴까요?', `쓴 포인트 ${spent}개가 돌아와요 · 돈 ${rc}`, () => app.act('resetPoints', { id: p.uid })));
    let y = y0 + 40;
    STAT_KEYS.forEach((k, i) => {
      const d = STAT_DEF.find(x => x.k === k) || { icon: 'sparkle', name: STAT_NAME[k] };
      if (i) g.rect(14, y - 3, W - 28, 1, '#244e7e');
      // 줄 = [아이콘 · 이름 / 포인트당 얼마 · 몇 번 강화] · 값(오른쪽 맞춤) · +1 단추
      const n = (p.up || {})[k] || 0;
      g.img(icon(d.icon), 16, y + 8);
      g.text(STAT_NAME[k], 32, y + 2, { font: 'label', color: P.main });
      g.text(`+${UP_GAIN[k]}${k === 'crit' ? '%' : ''}씩` + (n ? ` · ${n}강` : ''), 32, y + 17, { color: n ? '#8ccfff' : P.dim });
      g.text(k === 'crit' ? `${ps[k]}%` : k === 'acc' ? `+${ps[k]}` : fmt(ps[k]), W - 106, y + 6, { font: 'value', color: P.main, align: 'right' });
      this.btn(app, live, 'up_' + k, W - 98, y + 1, 84, 26, `+1 · ${cost}`, { style: 'gold', font: 'label', disabled: !p.pts || s.wallet.credits < cost }, () => app.act('upgrade', { id: p.uid, stat: k, n: 1 }));
      y += 33;
    });
    return y + 22;
  },

  // ── 개체값: 원형 게이지 넷 + 거름(같은 식물) ──
  drawIv(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, ivs = p.ivs || {};
    miniStars(g, 14, y0 + 3, stars(p));
    g.text(`개체값 합 ${ivSum(p)}/${IV_TOTAL}`, 60, y0, { color: P.sub });
    const foods = [...s.plants, ...s.storage].filter(x => x.key === p.key && x.uid !== p.uid);
    const pick = this.ivStat && IV_KEYS.includes(this.ivStat) ? this.ivStat : IV_KEYS.reduce((a, k) => ((ivs[k] || 0) < (ivs[a] || 0) ? k : a), IV_KEYS[0]);
    const cw = Math.floor((W - 28) / 4), cy = y0 + 46;
    IV_KEYS.forEach((k, i) => {
      const cx = 14 + cw * i + Math.floor(cw / 2), on = foods.length && k === pick;
      if (on) g.ellipseRing(cx, cy, 22, 22, '#ffd890', 0);
      ivRing(g, cx, cy, 18, ivs[k] || 0, IV_MAX, IV_COL[k]);
      g.text(STAT_NAME[k], cx, cy + 24, { font: 'label', color: on ? '#ffd890' : P.main, align: 'center' });
      g.text(`+${ivs[k] || 0}%`, cx, cy + 40, { color: P.sub, align: 'center' });
      if (foods.length) this.hit(app, live, 'iv_' + k, cx - 24, cy - 24, 48, 74, () => { this.ivStat = k; });
    });
    let y = cy + 64;
    g.rect(14, y - 6, W - 28, 1, '#244e7e');
    g.text('거름 주기', 14, y, { font: 'value', color: P.main });
    y += 22;
    if (!foods.length) { g.text('거름이 될 같은 식물이 없어요', W / 2, y + 4, { color: P.dim, align: 'center' }); return y + 30; }
    g.text(`올릴 개체값: ${STAT_NAME[pick]}`, 14, y, { color: '#ffd890' }); y += 20;
    foods.forEach((f, i) => {
      const add = Math.min(IV_MAX - (ivs[pick] || 0), 1 + Math.floor(starsOf(f.ivs) / 2)), where = s.plants.includes(f) ? '스마트팜' : '보관고';
      holo(g, 12, y, W - 24, 34, T.deep, 16);
      g.text(f.name, 20, y + 4, { font: 'label', color: P.main });
      miniStars(g, 22 + g.textW(f.name, 'label'), y + 7, starsOf(f.ivs));
      g.text(`${stageName(f)} Lv${f.lv} · ${where}`, 20, y + 20, { color: P.dim });
      const full = (ivs[pick] || 0) >= IV_MAX;
      this.btn(app, live, 'mg_' + i, W - 92, y + 5, 76, 24, full ? '이미 최대' : `${STAT_NAME[pick]} +${add}`, { style: 'gold', font: 'label', disabled: full }, () => ask(app, `${eul(f.name)} 거름으로 줄까요?`, `${STAT_NAME[pick]} 개체값 +${add} · ${ga(f.name)} 사라져요`, () => app.act('merge', { id: p.uid, food: f.uid, stat: pick }).then(r => r && app.toast(`${STAT_NAME[pick]} ${r.from} → ${r.to}`)), '거름 주기'));
      y += 38;
    });
    return y;
  },

  // ── 설정: 이름 · 보관 · 암시장(판매 · 해체) ──
  drawSet(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, price = sellPrice(p), last = s.plants.length < 2;
    const rows = [
      { id: 'name', ic: 'pencil', label: '이름 바꾸기', sub: p.name, act: '바꾸기', fn: () => this.rename(app, p) },
      { id: 'store', ic: 'box', label: '동면 보관고로', sub: last ? '스마트팜에 하나는 남겨 둬요' : '', act: '보내기', off: last, fn: () => app.act('toStorage', { id: p.uid }).then(r => { if (r) { app.toast(`${eul(p.name)} 보관고로 옮겼어요`); this.leave(app); } }) },
      { id: 'sell', ic: 'coin', label: '팔기', sub: `돈 ${price}`, act: '팔기', off: last, fn: () => sellAsk(app, p, () => this.leave(app)) },
      { id: 'cut', ic: 'vine', label: '해체하기', sub: '', act: '해체', off: last, fn: () => cutAsk(app, p, () => this.leave(app)) },
    ];
    let y = y0;
    for (const r of rows) {
      holo(g, 12, y, W - 24, 46, T.deep, 16);
      g.img(icon(r.ic), 20, r.sub ? y + 9 : y + 17);
      g.text(r.label, 36, r.sub ? y + 7 : y + 15, { font: 'value', color: P.main });   // 덧말 없으면 이름을 줄 가운데에
      if (r.sub) g.text(r.sub, 36, y + 26, { color: r.off ? '#ffb0a0' : P.sub });
      this.btn(app, live, 'set_' + r.id, W - 84, y + 10, 64, 26, r.act, { style: r.id === 'sell' || r.id === 'cut' ? 'red' : 'night', font: 'label', disabled: !!r.off }, r.fn);
      y += 52;
    }
    return y;
  },

  rename(app, p) {
    openForm(app, { title: '이름 바꾸기', fields: [{ id: 'name', label: '식물 이름', value: p.name, max: 10 }], ok: '바꾸기',
      onSubmit: async v => (v.name.trim() ? ((await app.act('rename', { id: p.uid, name: v.name.trim() })) ? null : '바꾸지 못했어요') : '이름을 써 주세요') });
  },
  async feed(app, p, kind) {
    const r = await app.act('feed', { id: p.uid, kind, n: 1 });
    if (!r) return;
    const up = r.ups[r.ups.length - 1];
    if (up) { app.toast(`Lv${up.lv}! 강화 포인트 +${up.pts}`); const box = r.ups.find(u => u.box); if (box) showGot(app, 'Lv6 달성 선물', Object.entries(box.box).map(([k, n]) => ({ kind: k, n, rar: k === 'credits' ? 0 : 1 })), '이제 진화할 수 있어요'); }
  },
  async evolve(app, p) {
    const r = await app.act('evolve', { id: p.uid });
    if (!r) return;
    const TO = { battle: '전투 칸에', joker: '조커 칸에', pend: '놓을 칸 고르기' };
    this.tab = 'skill'; this.sub = null; this.scrollY = 0;
    showGot(app, `진화! ${['어린', '자라는', '다 자란'][r.stage]} 단계`, r.got.map(x => ({ kind: 'skill', skill: x.id, to: TO[x.to], rar: SKILLS[x.id] && SKILLS[x.id].tier === 'c3' ? 4 : 3 })), r.got.some(x => x.to === 'pend') ? '칸이 꽉 찼어요 — 아래에서 놓을 칸을 골라요' : '새 기술이 피었어요');
  },
};
