import { ELEMENT } from '../art/palette.js';
import { button, fmt, rbox, holoTab, tagBox } from '../art/ui.js';
import { icon, tinted } from '../art/icons.js';
import { bigKey } from '../art/sprites.js';
import { T, btnBody, tbar, holo } from '../art/theme.js';
import { STAT_DEF, miniStars, ivRing } from './common.js';
import { CAT_ICON, CAT_NAME } from '../data/mock.js';
import { basicsOf } from '../battle/model.js';
import { fxChip, BUFF_LOOK } from '../art/statusLook.js';
import { LOFT_STOOL, loftView, loftPlant, loftZoom, loftPlantCy } from '../art/loft.js';
import { FOCUS } from './home.js';
import { SPECIES, SKILLS, JONG, STAT_KEYS, STAT_NAME, UP_GAIN, IV_KEYS, IV_MAX, TIER_NAME, upCost, resetCost, canGraft, starsOf } from '../game/catalog.js';
import { plantStats, sellPrice } from '../game/logic.js';
import { stageKey, stageName, stars, growInfo, ivSum, IV_TOTAL } from '../game/view.js';
import { openForm } from '../core/form.js';
import { ask, showGot } from './popups.js';
import { eul, ga } from '../core/josa.js';

// 식물 관리(2026-10-15 사용자 "가운데 식물을 누르면 … 암실 … 식물의 강화와 각종 식물 스킬과 세팅"):
//  홈이 불을 끄고 다가간 그 카메라 그대로 — 위 = 돌아가기·이름·별·정체성 · 생장(물·비료·진화), 아래 판 = 기술 · 강화 · 개체값 · 설정.
//  기술(2026-10-16 사용자 "기억 = 전투 칸만큼 + 조커 하나 보관"): 기본기 · 전투 3칸 · 조커 1칸 · 새로 핀 기술(칸이 차면 놓을 칸 고르기) · 지운 기술(회귀 주사) · 접목.
//  강화 = 레벨업 포인트 + 돈(상한 없음, 초기화 = 돈) · 개체값 = 원형 게이지 + 거름(같은 식물) · 설정 = 이름 · 보관 · 암시장(판매·해체).
const SHEET_Y = 258, IN_MS = 320, OUT_MS = 220;
const TABS = [{ id: 'skill', label: '기술' }, { id: 'up', label: '강화' }, { id: 'iv', label: '개체값' }, { id: 'set', label: '설정' }];
const IV_COL = { hp: '#7cf0a0', atk: '#ff8a6a', def: '#6fb8ff', spd: '#ffd84a' };
const ease = k => k * k * (3 - 2 * k);
const skillOf = id => (id ? { act: 'attack', cats: ['attack'], ...SKILLS[id] } : null);
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
    const tier = TIER_NAME[sk.tier];
    if (tier) { const tw = g.textW(tier); g.text(tier, x + w - (sk.el ? 24 : 8) - tw, yy + 4, { color: sk.tier === 'u' ? '#ffd890' : sk.tier === 'c3' ? '#c48cff' : S.sub || S.text }); }
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
    this.sel = p.sel == null ? null : p.sel === 'j' ? 'j' : +p.sel;   // ?sel = 검토 촬영(고른 칸)
    this.tab = p.tab || 'skill'; this.sub = p.sub || null; this.ivStat = null; this.scrollY = 0; this.maxY = 0;
    this.t0 = p.focus ? null : -1e9; this.out = null; this.gone = false;   // 홈 암실 연출에서 왔을 때만 판이 올라옴
  },
  onDrag(dy, dx, ev) { if (ev.y0 < SHEET_Y + 40) return; this.scrollY = Math.max(0, Math.min(this.maxY, this.scrollY - dy)); },
  leave(app) { if (this.out == null) this.out = app.t; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const p = s.plants[s.active] || s.plants[0];
    if (!p) { app.go('home'); return; }
    const key = bigKey(p.key, stageKey(p)), [mx, my] = LOFT_STOOL, pc = loftPlantCy(key);
    if (this.t0 == null) this.t0 = t;
    loftView(app, { dark: 1, z: loftZoom(app, FOCUS.want), px: mx, py: pc, sx: FOCUS.sx, sy: FOCUS.sy, plant: () => loftPlant(app, key, p.pot, mx, my) });
    // 들어옴 = 위 글자가 나타나고 아래 판이 올라옴, 나감 = 거꾸로 → 홈(불 켜짐)
    let k = ease(Math.min(1, (t - this.t0) / IN_MS));
    if (this.out != null) { const o = Math.min(1, (t - this.out) / OUT_MS); k = Math.min(k, 1 - ease(o)); if (o >= 1 && !this.gone) { this.gone = true; app.go('home', { from: 'plant' }, 'cut'); } }
    const live = k >= 1 && this.out == null && !app.popup && !app.confirm;
    g.alpha(k, () => this.top(app, p, live));
    const sy = Math.round(SHEET_Y + (1 - k) * (H - SHEET_Y + 4));
    g.c.save(); g.c.translate(0, sy - SHEET_Y);
    this.sheet(app, p, live);
    g.c.restore();
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
    // 생장 판(오른쪽 위): Lv · 생장 막대 · 물/비료(또는 진화)
    const gi = growInfo(p), bx = W - 98, st = T.card || T.panel;
    holo(g, bx, 64, 92, 56, st, 16);
    g.text(gi.ready ? '진화 가능' : gi.done ? '다 자람' : `Lv${p.lv}`, bx + 7, 68, { font: 'label', color: gi.ready ? '#ffd890' : P.sub });
    if (!gi.ready && !gi.done) g.text(`${gi.cur}/${gi.need}`, bx + 85, 69, { color: P.main, align: 'right' });
    tbar(g, bx + 7, 85, 78, 4, gi.pct, 'exp');
    if (gi.ready) button(app, 'pl_evo', bx + 6, 94, 80, 22, '진화하기', { style: 'gold', font: 'bold', icon: 'up', iconTint: true, onTap: live ? () => this.evolve(app, p) : null });
    else if (!gi.done) {
      button(app, 'pl_w', bx + 6, 94, 39, 22, String(s.items.water || 0), { style: 'teal', icon: 'water', disabled: !s.items.water, onTap: live ? () => this.feed(app, p, 'water') : null });
      button(app, 'pl_f', bx + 47, 94, 39, 22, String(s.items.fert || 0), { style: 'teal', icon: 'fert', disabled: !s.items.fert, onTap: live ? () => this.feed(app, p, 'fert') : null });
    }
  },
  // 아래 판: 탭 + 내용(끌어서 위아래로)
  sheet(app, p, live) {
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
  drawSkill(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, S = p.skills;
    g.text('기본기', 14, y0 + 1, { font: 'label', color: P.sub });
    const bx0 = 14 + g.textW('기본기', 'label') + 8;   // 기본기 이름이 식물마다라 길면 다음 줄로
    let x = bx0, by = y0;
    for (const b of basicsOf(p.key)) { const w = 20 + g.textW(b.name); if (x + w > W - 14 && x > bx0) { x = bx0; by += 20; } tagBox(g, x, by, w, 16); g.img(icon(CAT_ICON[b.cats[0]]), x + 4, by + 2); g.text(b.name, x + 16, by + 2, { color: '#d4e9ff' }); x += w + 4; }
    let y = by + 24;
    const pend = p.pend && p.pend[0];
    const hit = (id, xx, yy, w, h, fn) => this.hit(app, live, id, xx, yy, w, h, fn);
    if (pend) {   // 새로 핀 기술: 칸이 꽉 차서 놓을 칸을 골라야 함
      g.text('새로 핀 기술', 14, y, { font: 'value', color: '#ffb46a' });
      g.text(p.pend.length > 1 ? `${p.pend.length}개 기다림` : '놓을 칸을 눌러요', W - 14, y + 2, { color: '#ffd8a8', align: 'right' });
      y += 18;
      skillCard(app, 'sk_pend', 14, y, W - 28, 34, skillOf(pend), false, null, '#ffb46a');
      y += 40;
      this.btn(app, live, 'sk_skip', W - 98, y - 2, 84, 20, '안 배우기', { style: 'night' }, () => ask(app, `${eul(SKILLS[pend].name)} 안 배울까요?`, '지운 기술로 가요 — 회귀 주사로 되돌릴 수 있어요', () => app.act('place', { id: p.uid, skill: pend, target: 'skip' })));
      g.text('원래 기술은 지운 기술로 가요', 14, y + 1, { color: P.sub });
      y += 24;
    }
    g.text('전투 기술', 14, y, { font: 'value', color: P.main });
    g.text(`${S.battle.filter(Boolean).length}/3`, W - 14, y + 1, { font: 'label', color: P.sub, align: 'right' });
    y += 18;
    for (let i = 0; i < 3; i++) {
      skillCard(app, 'sk_b' + i, 14, y, W - 28, 34, skillOf(S.battle[i]), this.sel === i, null);
      hit('sk_b' + i, 14, y, W - 28, 34, () => this.pickSlot(app, p, i));
      y += 38;
    }
    y += 4;
    g.text('조커', 14, y, { font: 'value', color: '#ffd890' });
    g.text('보관만 — 전투엔 안 나가요', 14 + g.textW('조커', 'value') + 8, y + 2, { color: P.sub });
    y += 18;
    skillCard(app, 'sk_j', 14, y, W - 28, 34, skillOf(S.joker), this.sel === 'j', null, '#ffd890', '빈 조커 칸');
    hit('sk_j', 14, y, W - 28, 34, () => this.pickSlot(app, p, 'j'));
    y += 40;
    if (this.sel != null && !pend) { g.text(this.sel === 'j' ? '바꿀 전투 칸을 눌러요' : '조커 칸을 누르면 자리를 바꿔요', W / 2, y - 3, { color: '#8ccfff', align: 'center' }); y += 10; }
    y += 4;
    const bw = Math.floor((W - 34) / 2);
    this.btn(app, live, 'sk_forgot', 14, y, bw, 30, `지운 기술 ${S.forgot.length}`, { style: 'night', icon: 'potion' }, () => { this.sub = 'forgot'; this.scrollY = 0; });
    this.btn(app, live, 'sk_graft', 20 + bw, y, bw, 30, `접목 가지 ${s.scions.length}`, { style: 'night', icon: 'vine' }, () => { this.sub = 'graft'; this.scrollY = 0; });
    return y + 40;
  },
  // 칸 누르기: 새 기술이 기다리면 그 칸에 놓기(확인), 아니면 전투 칸 ↔ 조커 자리 바꾸기
  pickSlot(app, p, i) {
    const pend = p.pend && p.pend[0];
    if (pend) {
      const old = i === 'j' ? p.skills.joker : p.skills.battle[i], nm = SKILLS[pend].name;
      const go = () => app.act('place', { id: p.uid, skill: pend, target: i === 'j' ? 'joker' : 'b' + i }).then(r => r && app.toast(`${eul(nm)} 놓았어요`));
      if (!old) return go();
      return ask(app, `${eul(nm)} 이 칸에 놓을까요?`, `원래 기술 ${SKILLS[old].name}은(는) 지운 기술로 가요`, go, '놓기');
    }
    if (this.sel == null) { this.sel = i; return; }
    if (this.sel === i) { this.sel = null; return; }
    const a = this.sel, b = i;
    if (a !== 'j' && b !== 'j') { this.sel = i; return; }   // 전투 칸끼리는 고르기만 옮김
    const slot = a === 'j' ? b : a;
    this.sel = null;
    app.act('swapJoker', { id: p.uid, slot }).then(r => r && app.toast('조커와 자리를 바꿨어요'));
  },
  drawForgot(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, S = p.skills, n = s.items.regress || 0, free = S.battle.includes(null) || !S.joker;
    this.btn(app, live, 'fg_back', 12, y0 - 2, 52, 22, '‹ 기술', { style: 'night' }, () => { this.sub = null; this.scrollY = 0; });
    g.text('지운 기술', 72, y0 + 1, { font: 'value', color: P.main });
    g.img(icon('potion'), W - 100, y0 + 2); g.text(`회귀 주사 ${n}`, W - 14, y0 + 2, { font: 'label', color: '#d0e8ff', align: 'right' });
    let y = y0 + 28;
    g.text(free ? '되돌리면 빈 전투 칸(없으면 조커 칸)으로 가요' : '칸이 다 찼어요 — 하나를 비워야 되돌릴 수 있어요', 14, y, { color: free ? P.sub : '#ffb0a0' });
    y += 20;
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
    g.text('속성이나 종이 맞는 기술을 바로 배워요(완제품)', 14, y, { color: P.sub });
    y += 20;
    if (!s.scions.length) { g.text('가진 접목 가지가 없어요 — 해체 · 탐사 · 수확에서 나와요', W / 2, y + 10, { color: P.dim, align: 'center' }); return y + 40; }
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
    this.btn(app, live, 'up_reset', W - 104, y0 - 2, 90, 30, `초기화 ${rc}`, { style: 'night', icon: 'coin', disabled: !spent }, () => ask(app, '강화를 처음으로 되돌릴까요?', `쓴 포인트 ${spent}개가 돌아와요 · 돈 ${rc}`, () => app.act('resetPoints', { id: p.uid })));
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
    if (!p.pts) g.text('물·비료로 레벨을 올리면 포인트 2개씩', W / 2, y + 2, { color: P.dim, align: 'center' });
    return y + 22;
  },

  // ── 개체값: 원형 게이지 넷 + 거름(같은 식물) ──
  drawIv(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, ivs = p.ivs || {};
    miniStars(g, 14, y0 + 3, stars(p));
    g.text(`개체값 합 ${ivSum(p)}/${IV_TOTAL} · 1당 능력치 +1%`, 60, y0, { color: P.sub });
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
    g.text(`같은 ${SPECIES[p.key].name}를 먹여 고른 개체값을 올려요`, 14, y + 18, { color: P.sub });
    y += 38;
    if (!foods.length) { g.text('거름이 될 같은 식물이 없어요 — 탐사·종자로 모아요', W / 2, y + 4, { color: P.dim, align: 'center' }); return y + 30; }
    g.text(`올릴 개체값: ${STAT_NAME[pick]} — 위 게이지를 눌러 바꿔요`, 14, y, { color: '#ffd890' }); y += 20;
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
      { id: 'store', ic: 'box', label: '동면 보관고로', sub: last ? '스마트팜에 하나는 남겨 둬요' : '스마트팜 자리를 비워요', act: '보내기', off: last, fn: () => app.act('toStorage', { id: p.uid }).then(r => { if (r) { app.toast(`${eul(p.name)} 보관고로 옮겼어요`); this.leave(app); } }) },
      { id: 'sell', ic: 'coin', label: '암시장에 팔기', sub: `돈 ${price}(싸게)`, act: '팔기', off: last, fn: () => ask(app, `${eul(p.name)} 팔까요?`, `돈 ${price} 받기 · 되돌릴 수 없어요`, () => app.act('sell', { id: p.uid }).then(r => { if (r) { app.toast(`돈 +${r.credits}`); this.leave(app); } }), '팔기') },
      { id: 'cut', ic: 'vine', label: '해체하기', sub: '접목 가지 등이 나와요', act: '해체', off: last, fn: () => ask(app, `${eul(p.name)} 해체할까요?`, '식물은 사라지고 접목 가지 · 주사 · 물건이 나와요', () => app.act('dismantle', { id: p.uid }).then(r => { if (r) { showGot(app, `${p.name} 해체`, r.got); this.leave(app); } }), '해체') },
    ];
    let y = y0;
    for (const r of rows) {
      holo(g, 12, y, W - 24, 46, T.deep, 16);
      g.img(icon(r.ic), 20, y + 9);
      g.text(r.label, 36, y + 7, { font: 'value', color: P.main });
      g.text(r.sub, 36, y + 26, { color: r.off ? '#ffb0a0' : P.sub });
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
