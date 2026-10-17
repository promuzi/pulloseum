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
import { cardSkillOf } from '../game/fight.js';
import { fxChip, BUFF_LOOK } from '../art/statusLook.js';
import { LOFT_STOOL, loftView, loftPlant, loftZoom, loftPlantCy } from '../art/loft.js';
import { FOCUS, focusOf, plantSheetY, homeDy, ZOOM_MS } from './home.js';
import { SPECIES, SKILLS, JONG, STAT_KEYS, STAT_NAME, UP_GAIN, IV_KEYS, IV_MAX, TIER_NAME, upCost, resetCost, canGraft, starsOf, FORMS, SUN_UP, SUN_REGEN, sunSteps } from '../game/catalog.js';
import { CARDS, CARD_SLOTS, PASS_STORE, NORMAL_LOOK, cardFits, cardFace, isSkillCard } from '../game/cards.js';
import { plantStats, sellPrice, BASIC_IDS, LOADOUT, MUT_MAX, SKILL_STORE, evolveLeague, slotLayout } from '../game/logic.js';
import { LEAGUES } from '../game/catalog.js';
import { stageKey, stageName, stars, growInfo, ivSum, IV_TOTAL, lvOf } from '../game/view.js';
import { openForm } from '../core/form.js';
import { ask, showGot, sellAsk, cutAsk } from './popups.js';
import { eul, ga, eun } from '../core/josa.js';
import { openDraft } from './draft.js';

// 식물 관리(2026-10-15 사용자 "가운데 식물을 누르면 … 암실 … 식물의 강화와 각종 식물 스킬과 세팅"):
//  홈이 불을 끄고 다가간 그 카메라 그대로 — 위 = 돌아가기·이름·별·정체성 · 생장(물·비료·진화), 아래 판 = 기술 · 강화 · 개체값 · 설정.
//  기술(2026-10-16 사용자 "기억 = 전투 칸만큼 + 조커 하나 보관" → 2026-10-17 전투 칸 여섯 · 셋씩 두 줄): 전투 칸 · 보관(기본기 · 조커 1칸) · 카드 칸 둘 · 새로 핀 기술(칸이 차면 놓을 칸 고르기) · 지운 기술(회귀 주사) · 접목.
//  강화 = 레벨업 포인트 + 돈(상한 없음, 초기화 = 돈) · 개체값 = 원형 게이지 + 거름(같은 식물) · 설정 = 이름 · 보관 · 암시장(판매·해체).
const SHEET_Y = 258, IN_MS = 320, OUT_MS = 220;
const PCARD = { w: 66, h: 90, gx: 10, gy: 8, cols: 3 }, HOLD_MS = 320;   // 기술 카드(전투 손패와 같은 앞면 · 같은 셋씩 줄 — 2026-10-17)
const slotsOf = p => [...p.skills.battle, null, null, null, null, null, null].slice(0, LOADOUT);   // 전투 칸 여섯(옛 판은 normSkills 가 늘림)
const TABS = [{ id: 'skill', label: '스킬' }, { id: 'passive', label: '패시브' }, { id: 'up', label: '강화' }, { id: 'iv', label: '개체값' }, { id: 'set', label: '설정' }];   // 스킬 · 패시브 아예 나눔(2026-10-18 사용자 "다른 항목에서 선택하게 분리해 줘 아예")
const IV_COL = { hp: '#7cf0a0', atk: '#ff8a6a', def: '#6fb8ff', spd: '#ffd84a', fruit: '#ff9ad0' };
const ease = k => k * k * (3 - 2 * k);
const skillOf = id => (id ? { act: 'attack', cats: ['attack'], ...SKILLS[id] } : null);
// 기본기도 카드로(전투 칸에 넣고 뺌 — 2026-10-16 사용자 "기본스킬 3개도 바꿀 수 있게")
const skOf = (p, id) => (!id ? null : BASIC_IDS.includes(id) ? { ...basicsOf(p.key).find(b => b.id === id), basic: true } : isSkillCard(id) ? cardSkillOf(p, id) : skillOf(id));   // 기술 카드 = 전투에서 쓰는 모습(숨결 속성 · 단조 위력)
const cardGrid = W => { const C3 = PCARD.cols, x0 = Math.round((W - C3 * PCARD.w - (C3 - 1) * PCARD.gx) / 2); return { x0, RW: C3 * PCARD.w + (C3 - 1) * PCARD.gx, cx: i => x0 + (i % C3) * (PCARD.w + PCARD.gx), ry: i => Math.floor(i / C3) * (PCARD.h + PCARD.gy), rowsH: n => Math.ceil(Math.max(1, n) / C3) * (PCARD.h + PCARD.gy) - PCARD.gy }; };   // 카드 셋씩 줄(가운데)
const faceOn = (p, id) => (isSkillCard(id) ? cardSkillOf(p, id) : cardFace(id));   // 카드 칸에 끼운 카드
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
    this.t0 = p.focus || p.zoomAt != null ? null : -1e9; this.out = null; this.gone = false;   // 홈 암실 연출에서 왔을 때만 판이 올라옴
    this.zoomIn = !!p.zoom || p.zoomAt != null; this.zoomAt = p.zoomAt != null ? +p.zoomAt : 0;   // ?zoomAt=ms = 다가감 그 순간 촬영   // 홈이 다가가기 시작한 순간 넘어옴 = 남은 다가감을 여기서(판 올라옴과 같이)
    this.forceAct = p.act != null ? +p.act : null;   // 검토 촬영: 그 번째 식물로
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
    this.dropCard(app, p, D.key, to);   // 끈 카드 → 놓은 칸(바꿈 · 끼움 · 해제)
  },
  leave(app) { if (this.out == null) this.out = app.t; },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    if (this.forceAct != null) { if (s.plants[this.forceAct]) s.active = this.forceAct; this.forceAct = null; }
    const p = s.plants[s.active] || s.plants[0];
    if (!p) { app.go('home'); return; }
    const key = bigKey(p.key, stageKey(p)), [mx, my] = LOFT_STOOL, pc = loftPlantCy(key), F = focusOf(app), SY = plantSheetY(app);
    this.app = app;
    if (this.t0 == null) this.t0 = t - (this.zoomAt || 0);
    const zk = this.zoomIn ? ease(Math.min(1, (t - this.t0) / ZOOM_MS)) : 1, Zw = loftZoom(app, F.want), sy0 = pc + homeDy(app);   // 다가감(홈 camera 와 같은 길)
    loftView(app, { dark: 1, z: 1 + (Zw - 1) * zk, px: mx, py: pc, sx: mx + (F.sx - mx) * zk, sy: sy0 + (F.sy - sy0) * zk, plant: () => loftPlant(app, key, p.pot, mx, my) });
    // 들어옴 = 위 글자가 나타나고 아래 판이 올라옴(다가가며 들어오면 다가감과 같이 — 판이 조금 앞서 아래 검은 칸을 가림), 나감 = 거꾸로 → 홈(불 켜짐)
    let k = ease(Math.min(1, (t - this.t0) / (this.zoomIn ? ZOOM_MS * 0.8 : IN_MS)));
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
    if (live && (this.tab === 'skill' || this.tab === 'passive') && !this.sub && !this.peek && !this.cardDrag && d && !d.moved && d.id && d.id.startsWith('skc_') && app.input.holdMs() >= HOLD_MS) {   // 꾹 = 집기(들려 올라옴)
      const k = d.id.slice(4), r = this.cardRects && this.cardRects[k];
      if (r && r.sk) { app.input.claimHold(); sfx('select'); this.cardDrag = { key: k, x: d.x0, y: d.y0, ox: d.x0 - r.x, oy: d.y0 - r.y, moved: false }; }
    }
    if (this.cardDrag && !app.input.down && !this.cardDrag.moved) this.cardDrag = null;   // 집었다 그냥 놓음 = 제자리
    if (this.cardDrag && this.cardDrag.moved && this.clipTop != null) {   // 끄는 카드가 판 위 · 아래 끝에 닿으면 판을 굴림(전투 칸 여섯 · 가방 줄이 한 화면에 다 안 들어옴 — 2026-10-17)
      const D = this.cardDrag;
      if (D.y < this.clipTop + 28) this.scrollY = Math.max(0, this.scrollY - 5);
      else if (D.y > this.clipBot - 28) this.scrollY = Math.min(this.maxY, this.scrollY + 5);
    }
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
    const list = [{ ic: sp.type, label: JONG[sp.type] }, { ic: sp.el, label: el.name, col: el.light }, { ic: 'seed', label: `${stageName(p)} Lv${lvOf(p)}` }];
    let x = 8;
    for (const r of list) { const w = 22 + g.textW(r.label, 'label'); tagBox(g, x, 40, w, 18); g.img(icon(r.ic), x + 5, 44); g.text(r.label, x + 18, 43, { font: 'label', color: r.col || '#e6f3ff' }); x += w + 4; }
    if (p.form && FORMS[p.form]) { const F = FORMS[p.form], tag = F.name + ' 변이', w = 12 + g.textW(tag, 'label'); rbox(g, x, 40, w, 18, 5, '#160f20', F.col); g.text(tag, x + 6, 43, { font: 'label', color: F.light }); x += w + 4; }   // 변이 = 변이 색 꼬리표
    if (p.legend) { const tag = '전설', w = 12 + g.textW(tag, 'label'); rbox(g, x, 40, w, 18, 5, '#3a2a18', '#f0be7d'); g.text(tag, x + 6, 43, { font: 'label', color: '#ffd890' }); }
  },
  // 생장 줄(식물 아래 · 판 바로 위 — 2026-10-16 사용자 "비료와 물 주기 등을 다른 곳에 잘 배치해줘", 전엔 오른쪽 위 판이 식물 잎을 가렸음):
  //  왼쪽 = Lv · 생장 막대 · 숫자, 오른쪽 = 물 · 비료(또는 진화하기)
  growStrip(app, p, live, y) {
    const { g, W, state: s } = app, P = T.ptext, gi = growInfo(p), st = T.card || T.panel, h = 26, x = 8, w = W - 16;
    holo(g, x, y, w, h, st, 16);
    this.growR = [x, y, w, h];   // 처음 안내가 가리킬 자리
    const bw = gi.ready ? 96 : gi.done ? 0 : 92, lx = x + 8, rx = x + w - bw - 6;
    g.text(gi.ready ? '진화 가능' : gi.done ? '다 자랐어요' : `Lv${lvOf(p)}`, lx, y + 6, { font: 'label', color: gi.ready ? '#ffd890' : P.sub });
    if (!gi.done && !gi.ready) {
      const tx = lx + g.textW(`Lv${lvOf(p)}`, 'label') + 6, num = `${gi.cur}/${gi.need}`, nw = g.textW(num);
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
      const dr = p.drafts || [], dot = (tb.id === 'up' && p.pts > 0) || (tb.id === 'skill' && dr.some(d => d.part !== 'passive')) || (tb.id === 'passive' && dr.some(d => d.part === 'passive'));   // 쓸 포인트 · 고를 기술 · 고를 패시브
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
      else if (this.tab === 'passive') bottom = this.drawPassive(app, p, y0, lv);
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

  // ── 스킬 · 패시브(2026-10-18 사용자 "스킬: 장착 6칸 · 보관 6칸(변이가 있다면 변이랑 6칸 모두 공유) · 패시브: 장착 3칸 · 보관(변이 패시브만) 3칸 · 다른 항목에서 선택하게 분리 아예"):
  //  스킬 탭 = 장착 b0~b5 → 보관 s0~s5(배운 기술 · 기본기 · 그 변이 기술 카드 — 기본기도 칸을 차지) → (변이 식물) 가방의 그 변이 기술 카드 mk: 줄
  //  패시브 탭 = 장착 c0~c2 → (변이 식물) 보관 p0~p2(그 변이 패시브만) → 가방의 맞는 패시브 cl: 줄
  //  누름 = 뒷면 크게 + [장착] · [해제](보관의 카드는 [가방으로]도) · 꾹 = 집어서 끌어 놓기 · 들어간 칸 = 위에서 톡 떨어지며 금빛 테 · 옮기기 = 배치 전부(slotLayout)를 고쳐 setSlots
  drawSkill(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, S = p.skills, B6 = slotsOf(p), ST = [...(S.store || [])], { x0, RW, cx, ry, rowsH } = cardGrid(W);
    this.cardRects = {};
    if (this.placing && live && this.clipTop != null) app.input.hit('place_off', 0, this.clipTop, W, this.clipBot - this.clipTop, () => { this.placing = null; });   // 놓을 칸 고르는 중 빈 데를 누르면 그만(카드 칸이 먼저 맞음)
    let y = y0;
    const head = (t, c, right) => { g.text(t, 14, y, { font: 'value', color: c }); if (right) g.text(right, W - 14, y + 1, { font: 'label', color: P.sub, align: 'right' }); y += 18; };
    const nOn = B6.filter(Boolean).length, nMut = B6.filter(isSkillCard).length;
    head('장착', P.main, p.form && FORMS[p.form] ? `변이 ${nMut}/${MUT_MAX} · ${nOn}/${LOADOUT}` : `${nOn}/${LOADOUT}`);
    for (let i = 0; i < LOADOUT; i++) this.card(app, p, live, 'b' + i, cx(i), y + ry(i), skOf(p, B6[i]), '빈 칸', 'skill');
    y += rowsH(LOADOUT) + 12;
    head('보관', '#ffd890', `${ST.length}/${SKILL_STORE}`);
    const sy0 = y;
    for (let i = 0; i < SKILL_STORE; i++) this.card(app, p, live, 's' + i, cx(i), y + ry(i), skOf(p, ST[i]), '빈 칸', 'store');
    y += rowsH(SKILL_STORE) + 8;
    this.cardRects['S:'] = { x: x0, y: this.hitY(sy0), w: RW, h: y - sy0, sk: null };   // 보관 쪽 아무 데나 놓아도 해제(카드가 먼저 맞음)
    const mk = p.form ? Object.keys(s.cards || {}).filter(id => s.cards[id] > 0 && isSkillCard(id) && !cardFits(p, id) && !B6.includes(id) && !ST.includes(id)) : [];
    if (mk.length) {   // 변이 식물 = 가방의 그 변이 기술 카드(장착 · 보관에 넣으면 가방에서 빠짐)
      g.text('가방 · 변이 기술 카드', 14, y, { font: 'label', color: '#9fd0ff' }); y += 16;
      const my0 = y;
      mk.forEach((id, i) => { this.card(app, p, live, 'mk:' + id, cx(i), y + ry(i), skOf(p, id), '', null); if (s.cards[id] > 1) this.countTag(app, cx(i), y + ry(i), s.cards[id]); });
      y += rowsH(mk.length) + 8;
      this.cardRects['mk:'] = { x: x0, y: this.hitY(my0), w: RW, h: y - my0, sk: null };
    }
    y += 6;
    const bw = Math.floor((W - 34) / 2);
    this.btn(app, live, 'sk_forgot', 14, y, bw, 30, `지운 기술 ${S.forgot.length}`, { style: 'night', icon: 'potion' }, () => { this.sub = 'forgot'; this.scrollY = 0; });
    this.btn(app, live, 'sk_graft', 20 + bw, y, bw, 30, `접목 가지 ${s.scions.length}`, { style: 'night', icon: 'vine' }, () => { this.sub = 'graft'; this.scrollY = 0; });
    return y + 40;
  },
  drawPassive(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, L = slotLayout(p), mut = !!(p.form && FORMS[p.form]), look = mut ? FORMS[p.form] : NORMAL_LOOK, { x0, RW, cx, ry, rowsH } = cardGrid(W);
    this.cardRects = {};
    if (this.placing && live && this.clipTop != null) app.input.hit('place_off', 0, this.clipTop, W, this.clipBot - this.clipTop, () => { this.placing = null; });
    let y = y0;
    const head = (t, c, right) => { g.text(t, 14, y, { font: 'value', color: c }); if (right) g.text(right, W - 14, y + 1, { font: 'label', color: P.sub, align: 'right' }); y += 18; };
    head(mut ? `장착 · ${look.name} 변이` : '장착', look.light, `${L.cards.filter(Boolean).length}/${CARD_SLOTS}`);
    L.cards.forEach((id, i) => this.card(app, p, live, 'c' + i, cx(i), y, id ? faceOn(p, id) : null, '빈 칸', 'passive'));
    y += PCARD.h + 12;
    if (mut) {   // 패시브 보관 = 변이 식물만 · 그 변이 패시브만
      head('보관', look.light, `${L.pstore.length}/${PASS_STORE}`);
      const py0 = y;
      for (let i = 0; i < PASS_STORE; i++) this.card(app, p, live, 'p' + i, cx(i), y, L.pstore[i] ? cardFace(L.pstore[i]) : null, '빈 칸', 'pstore');
      y += PCARD.h + 8;
      this.cardRects['P:'] = { x: x0, y: this.hitY(py0), w: RW, h: y - py0, sk: null };
    }
    const on = [...L.cards, ...L.pstore], bag = Object.keys(s.cards || {}).filter(id => s.cards[id] > 0 && CARDS[id] && !isSkillCard(id) && !cardFits(p, id) && !on.includes(id));
    head('가방', look.light, `${bag.reduce((a, id) => a + s.cards[id], 0)}장`);
    const by0 = y;
    if (!bag.length) { cardSlot(g, cx(0), y, PCARD.w, PCARD.h, '빈 칸'); y += PCARD.h; }
    else { bag.forEach((id, i) => { this.card(app, p, live, 'cl:' + id, cx(i), y + ry(i), cardFace(id), '', null); if (s.cards[id] > 1) this.countTag(app, cx(i), y + ry(i), s.cards[id]); }); y += rowsH(bag.length); }
    this.cardRects['cl:'] = { x: x0, y: this.hitY(by0), w: RW, h: y - by0, sk: null };   // 가방 쪽(빈 곳에 놓아도 가방으로)
    return y + 14;
  },
  // 카드 한 장(전투와 같은 앞면): 끌거나 꺼내 보는 중 = 빈 자리 · 막 들어온 칸 = 위에서 톡 떨어지며 금빛 테가 사라짐 · [장착] 뒤 놓을 수 있는 칸 = 금빛 테가 숨 쉼
  //  target = 그 칸이 무엇인지('skill' = 스킬 장착 · 'passive' = 패시브 장착 · 'store' · 'pstore' = 보관 · null = 가방)
  card(app, p, live, k, x, y, sk, empty = '', target = null) {
    const { g, input, t } = app, id = 'skc_' + k, away = (this.cardDrag && this.cardDrag.key === k) || (this.peek && this.peek.key === k);
    const L = this.land && this.land.key === k ? Math.min(1, (t - this.land.t0) / 450) : 1, PL = this.placing, aim = !!(PL && target && PL.want === target);
    const edge = (c, a) => g.alpha(a, () => { const X = x - 2, Y = y - 2, w = PCARD.w + 4, h = PCARD.h + 4; g.rect(X, Y, w, 2, c); g.rect(X, Y + h - 2, w, 2, c); g.rect(X, Y, 2, h, c); g.rect(X + w - 2, Y, 2, h, c); });
    if (away) cardSlot(g, x, y, PCARD.w, PCARD.h);
    else if (!sk) cardSlot(g, x, y, PCARD.w, PCARD.h, empty);
    else {
      const down = live && input.isPressed(id), dy = L < 1 ? -Math.round(12 * (1 - ease(L))) : 0, me = PL && PL.key === k;
      rrect(g, x + 1, y + 3, PCARD.w, PCARD.h, 5, 'rgba(0,0,0,0.32)');
      cardFront(g, x, y + dy + (down ? 1 : 0) - (me ? 4 : 0), PCARD.w, PCARD.h, sk, { can: true, lit: L < 1 || me });
    }
    if (L < 1) edge('#ffd890', 1 - L);
    if (aim) edge('#ffd890', 0.45 + 0.4 * Math.sin(t / 150));
    this.cardRects[k] = { x, y: this.hitY(y), w: PCARD.w, h: PCARD.h, sk };
    this.hit(app, live, id, x, y, PCARD.w, PCARD.h, () => {
      if (PL) { this.placing = null; if (aim) this.dropCard(app, p, PL.key, k); return; }   // 놓을 칸 고르는 중: 맞는 칸 = 놓기 · 다른 카드 = 그만
      if (sk) this.openPeek(app, k);   // 누름 = 뒷면 크게(다시 누르면 닫힘)
    });
  },
  // 가방 카드 장 수(2장 넘으면 오른쪽 아래 '×n')
  countTag(app, x, y, n) {
    const { g } = app, txt = '×' + n, tw = g.textW(txt, 'label') + 6, tx = x + PCARD.w - tw - 4, ty = y + 4 + 52 - 15;   // 그림 칸 오른쪽 아래(이름 띠를 가리지 않게)
    rrect(g, tx, ty, tw, 13, 3, 'rgba(6,10,20,0.88)');
    g.text(txt, tx + 3, ty, { font: 'label', color: '#ffd890' });
  },
  // 칸 이름 → 그 칸의 카드 · 기술 id
  idAt(p, k) {
    if (!k) return null;
    if (/^b\d$/.test(k)) return p.skills.battle[+k.slice(1)] || null;
    if (/^s\d$/.test(k)) return (p.skills.store || [])[+k.slice(1)] || null;
    if (/^c\d$/.test(k)) return (p.cards || [])[+k.slice(1)] || null;
    if (/^p\d$/.test(k)) return (p.pstore || [])[+k.slice(1)] || null;
    const i = k.indexOf(':'); return i > 0 ? k.slice(i + 1) || null : null;   // mk: 가방 기술 카드 · cl: 가방 패시브
  },
  // 카드 옮기기(끌어 놓기 · [장착] 뒤 칸 누르기 · [해제] · [가방으로]) → 배치 전부를 고쳐 setSlots(규칙이 다시 검사):
  //  장착 칸에 = 보관에서 왔으면 있던 것이 그 보관 자리로 · 가방에서 왔으면 있던 것은 보관 끝(스킬 보관이 차면 막음 · 패시브는 변이 패시브만 보관, 일반은 가방) · 장착끼리 = 바꿈
  //  보관에 = 해제 · 가방에서 넣기(꽉 차면 막음 · 패시브 보관 = 그 변이 패시브만) / 가방 쪽에 = 카드만 가방으로(기본 기술은 버리지 못함)
  dropCard(app, p, a, b) {
    if (!b || a === b) return;
    const L = slotLayout(p), id = this.idAt(p, a);
    const kind = k => (/^b\d$/.test(k) ? 'b' : /^s\d$/.test(k) || k === 'S:' ? 's' : k.startsWith('mk:') ? 'mk' : /^c\d$/.test(k) ? 'c' : /^p\d$/.test(k) || k === 'P:' ? 'p' : k.startsWith('cl:') ? 'cl' : null);
    const A = kind(a), Tk = kind(b); if (!A || !Tk || !id) return;
    const passive = !!(CARDS[id] && !isSkillCard(id)), nameOf = x => (CARDS[x] && !isSkillCard(x) ? cardFace(x) : skOf(p, x)).name, nm = nameOf(id);
    if (passive !== ['c', 'p', 'cl'].includes(Tk)) return app.toast(passive ? '패시브는 패시브 칸에 놓아요' : '스킬은 스킬 칸에 놓아요');
    if (A === 'mk' || A === 'cl') { const why = cardFits(p, id); if (why) return app.toast(why); }
    const at = k => +k.slice(1), take = () => { if (A === 'b') L.battle[at(a)] = null; else if (A === 'c') L.cards[at(a)] = null; else if (A === 's') L.store.splice(L.store.indexOf(id), 1); else if (A === 'p') L.pstore.splice(L.pstore.indexOf(id), 1); };
    let msg, land = null;
    if (Tk === 'b' || Tk === 'c') {
      const row = Tk === 'b' ? L.battle : L.cards, j = at(b), old = row[j];
      if (A === Tk) { const i = at(a); [row[i], row[j]] = [row[j], row[i]]; msg = '자리를 바꿨어요'; }
      else {
        const src = A === 's' ? L.store : A === 'p' ? L.pstore : null, si = src ? src.indexOf(id) : -1;
        row[j] = id;
        if (src) { if (old) src[si] = old; else src.splice(si, 1); }
        else if (old) {
          if (Tk === 'b') { if (L.store.length >= SKILL_STORE) return app.toast('보관이 꽉 찼어요 — 빈 장착 칸에 넣거나 보관을 비워요'); L.store.push(old); }
          else if (p.form && CARDS[old].form === p.form && L.pstore.length < PASS_STORE) L.pstore.push(old);
        }
        msg = old ? `${eul(nm)} 넣고 ${eun(nameOf(old))} 뺐어요` : `${eul(nm)} 넣었어요`;
      }
      land = b;
    } else if (Tk === 's' || Tk === 'p') {
      const st = Tk === 's' ? L.store : L.pstore, cap = Tk === 's' ? SKILL_STORE : PASS_STORE;
      if (A === Tk) return;   // 보관끼리는 그대로
      if (Tk === 'p' && !(p.form && CARDS[id].form === p.form)) return app.toast(p.form ? '패시브 보관엔 그 변이 패시브만 넣어요' : '패시브 보관은 변이 식물만 써요');
      if (st.length >= cap) return app.toast('보관이 꽉 찼어요');
      take(); st.push(id); msg = A === 'b' || A === 'c' ? `${eul(nm)} 뺐어요` : `${eul(nm)} 보관했어요`;
      land = Tk + (st.length - 1);
    } else {
      if (!CARDS[id]) return app.toast('기술은 가방에 넣을 수 없어요');
      if (A === 'mk' || A === 'cl') return;
      take(); msg = `${eul(nm)} 가방에 넣었어요`;
    }
    if (!L.battle.some(Boolean)) return app.toast('장착에 기술이 하나는 있어야 해요');
    if (L.battle.filter(isSkillCard).length > MUT_MAX) return app.toast(`변이 기술 카드는 장착에 ${MUT_MAX}장까지예요`);
    app.act('setSlots', { id: p.uid, ...L }).then(r => { if (!r) return; if (land) { this.land = { key: land, t0: app.t }; sfx('select'); } app.toast(msg); });
  },
  cardKeyAt(x, y) { for (const [k, r] of Object.entries(this.cardRects || {})) if (!k.endsWith(':') && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return k; for (const k of ['S:', 'mk:', 'P:', 'cl:']) { const r = this.cardRects && this.cardRects[k]; if (r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return k; } return null; },
  // 누름 = 그 카드를 앞으로 가져와 뒤집어 뒷면(전투 손패의 꾹과 같은 움직임 — art/skillcard.js) · 아래 [장착](보관 카드) · [해제](장착된 카드) · 아무 데나 누르면 다시 뒤집혀 제자리로
  openPeek(app, k) {
    const r = this.cardRects && this.cardRects[k]; if (!r || !r.sk) return;
    sfx('flip'); this.placing = null;
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
    if (P.p >= 1 && !P.closing && (this.tab === 'skill' || this.tab === 'passive') && !this.sub) {   // [장착] · [해제] · 보관의 카드 = [가방으로]도
      const s = app.state, p = s.plants[s.active] || s.plants[0], id = p && this.idAt(p, P.key), on = /^[bc]\d$/.test(P.key), toBag = /^[sp]\d$/.test(P.key) && !!CARDS[id];
      const bw = toBag ? 100 : 108, bh = 32, by = Math.min(H - bh - 8, Math.round(cy + h / 2 + 14)), x1 = toBag ? Math.round(W / 2 - bw - 4) : Math.round(W / 2 - bw / 2);
      button(app, 'peek_act', x1, by, bw, bh, on ? '해제' : '장착', { style: on ? 'night' : 'gold', font: 'head', onTap: () => this.peekAct(app, P.key, on ? 'off' : 'on') });
      if (toBag) button(app, 'peek_bag', Math.round(W / 2 + 4), by, bw, bh, '가방으로', { style: 'night', font: 'head', onTap: () => this.peekAct(app, P.key, 'bag') });
    }
  },
  // 뒷면 단추: on = [장착](놓을 장착 칸을 고름) · off = [해제](스킬 → 보관 · 변이 패시브 → 패시브 보관 · 일반 패시브 → 가방) · bag = [가방으로](보관의 카드)
  peekAct(app, k, what) {
    const s = app.state, p = s.plants[s.active] || s.plants[0], id = p && this.idAt(p, k); if (!id) return;
    this.peek.closing = true; sfx('flip');
    const passive = !!(CARDS[id] && !isSkillCard(id));
    if (what === 'bag') return this.dropCard(app, p, k, passive ? 'cl:' : 'mk:');
    if (what === 'off') return this.dropCard(app, p, k, !passive ? 'S:' : p.form && CARDS[id].form === p.form ? 'P:' : 'cl:');
    this.placing = { key: k, want: passive ? 'passive' : 'skill' };
    app.toast(passive ? '넣을 패시브 칸을 눌러요' : '넣을 장착 칸을 눌러요');
  },
  drawForgot(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, S = p.skills, n = s.items.regress || 0, free = S.battle.includes(null) || (S.store || []).length < SKILL_STORE;
    this.btn(app, live, 'fg_back', 12, y0 - 2, 52, 22, '‹ 스킬', { style: 'night' }, () => { this.sub = null; this.scrollY = 0; });
    g.text('지운 기술', 72, y0 + 1, { font: 'value', color: P.main });
    g.img(icon('potion'), W - 100, y0 + 2); g.text(`회귀 주사 ${n}`, W - 14, y0 + 2, { font: 'label', color: '#d0e8ff', align: 'right' });
    let y = y0 + 28;
    if (!free) { g.text('칸이 다 찼어요', 14, y, { color: '#ffb0a0' }); y += 20; }
    if (!S.forgot.length) { g.text('지운 기술이 없어요', W / 2, y + 10, { color: P.dim, align: 'center' }); return y + 40; }
    S.forgot.forEach((id, i) => {
      const sk = skillOf(id);
      skillCard(app, 'fg_' + i, 14, y, W - 100, 34, sk, false, null);
      this.btn(app, live, 'fg_go_' + i, W - 80, y + 4, 66, 26, '되돌리기', { style: 'gold', font: 'label', disabled: !n || !free }, () => ask(app, `${eul(sk.name)} 되돌릴까요?`, '유전자 회귀 주사 1개를 써요', () => app.act('regress', { id: p.uid, skill: id }).then(r => { if (!r) return; if (r.to === 'draft') return openDraft(app, p); app.toast(`${sk.name} — 되돌렸어요`); }), '되돌리기'));
      y += 40;
    });
    return y;
  },
  drawGraft(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext;
    this.btn(app, live, 'gf_back', 12, y0 - 2, 52, 22, '‹ 스킬', { style: 'night' }, () => { this.sub = null; this.scrollY = 0; });
    g.text('접목 가지', 72, y0 + 1, { font: 'value', color: P.main });
    let y = y0 + 28;
    if (!s.scions.length) { g.text('가진 접목 가지가 없어요', W / 2, y + 10, { color: P.dim, align: 'center' }); return y + 40; }
    const known = new Set([...p.skills.battle, ...(p.skills.store || []), ...p.skills.forgot].filter(Boolean));
    s.scions.forEach((sc, i) => {
      const sk = skillOf(sc.skill), why = known.has(sc.skill) ? '이미 아는 기술' : canGraft(p, sc.skill);
      skillCard(app, 'gs_' + i, 14, y, W - 100, 34, sk, false, null);
      if (why) g.text(why, W - 47, y + 12, { color: '#ffb0a0', align: 'center' });
      else {
        this.btn(app, live, 'gs_go_' + i, W - 80, y + 4, 66, 26, '접목', { style: 'gold', font: 'label' }, () => app.act('graft', { id: p.uid, scion: sc.id }).then(r => { if (!r) return; if (r.to === 'draft') return openDraft(app, p); app.toast(`${eul(sk.name)} 배웠어요`); }));
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
    // 햇빛 그릇 · 회복(2026-10-18): 한 단 = 포인트 여럿 · 단추 = 한 단 올림(포인트 · 돈)
    for (const k of ['sunMax', 'sunRegen']) {
      const U = SUN_UP[k], st0 = sunSteps(p, k), full = st0 >= U.max;
      let c = 0; for (let i = 0; i < U.pts; i++) c += upCost(p.spent + i);
      g.rect(14, y - 3, W - 28, 1, '#244e7e');
      g.img(icon('sun'), 16, y + 8);
      g.text(U.name, 32, y + 2, { font: 'label', color: P.main });
      g.text(`${U.pts}포인트씩` + (st0 ? ` · ${st0}단` : ''), 32, y + 17, { color: st0 ? '#8ccfff' : P.dim });
      const val = k === 'sunMax' ? `${8 + st0}칸` : `턴마다 ${SUN_REGEN[st0]}칸`;
      g.text(val, W - 106, y + 6, { font: k === 'sunMax' ? 'value' : 'label', color: P.main, align: 'right' });
      this.btn(app, live, 'up_' + k, W - 98, y + 1, 84, 26, full ? '최대' : `+1단 · ${c}`, { style: 'gold', font: 'label', disabled: full || p.pts < U.pts || s.wallet.credits < c }, () => app.act('upgrade', { id: p.uid, stat: k, n: 1 }));
      y += 33;
    }
    return y + 22;
  },

  // ── 개체값: 원형 게이지 다섯(넷 = 능력치 · 열매 = 맺는 속도) + 거름(같은 식물) ──
  drawIv(app, p, y0, live) {
    const { g, W, state: s } = app, P = T.ptext, ivs = p.ivs || {};
    miniStars(g, 14, y0 + 3, stars(p));
    g.text(`개체값 합 ${ivSum(p)}/${IV_TOTAL}`, 60, y0, { color: P.sub });
    const foods = [...s.plants, ...s.storage].filter(x => x.key === p.key && x.uid !== p.uid);
    const pick = this.ivStat && IV_KEYS.includes(this.ivStat) ? this.ivStat : IV_KEYS.reduce((a, k) => ((ivs[k] || 0) < (ivs[a] || 0) ? k : a), IV_KEYS[0]);
    const cw = Math.floor((W - 28) / IV_KEYS.length), cy = y0 + 46;
    IV_KEYS.forEach((k, i) => {
      const cx = 14 + cw * i + Math.floor(cw / 2), on = foods.length && k === pick;
      if (on) g.ellipseRing(cx, cy, 22, 22, '#ffd890', 0);
      ivRing(g, cx, cy, 18, ivs[k] || 0, IV_MAX, IV_COL[k]);
      g.text(STAT_NAME[k], cx, cy + 24, { font: 'label', color: on ? '#ffd890' : P.main, align: 'center' });
      g.text(`+${(ivs[k] || 0) * (k === 'fruit' ? 3 : 1)}%`, cx, cy + 40, { color: P.sub, align: 'center' });   // 열매 = 맺는 속도
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
      g.text(`${stageName(f)} Lv${lvOf(f)} · ${where}`, 20, y + 20, { color: P.dim });
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
    if (up) { app.toast(`Lv${lvOf({ stage: p.stage, lv: up.lv })}! 강화 포인트 +${up.pts}`); const box = r.ups.find(u => u.box); if (box) showGot(app, `Lv${lvOf({ stage: p.stage, lv: 6 })} 달성 선물`, Object.entries(box.box).map(([k, n]) => ({ kind: k, n, rar: k === 'credits' ? 0 : 1 })), '이제 진화할 수 있어요'); }
    if (r.ups.some(u => u.draft)) openDraft(app, p);   // 레벨업 = 카드 고르기(받은 것 판이 있으면 그 뒤에)
  },
  // 진화 전: 고른 식물이 지금 리그 단계를 넘게 되면 그 단계 리그로 바뀜 — 지금 리그에 진행 중인 판이 있으면 한 번 묻기(처음부터 다시라서)
  evolve(app, p) {
    const lg = evolveLeague(app.state, p);
    if (lg && lg.had) return ask(app, `진화하면 ${LEAGUES[lg.to].name}로 바뀌어요`, `${LEAGUES[lg.from].short} 리그 ${lg.T.tier} ${lg.T.round}(${lg.T.wins}승 ${lg.T.losses}패)는 처음부터 다시 해요`, () => this.doEvolve(app, p), '진화');
    return this.doEvolve(app, p);
  },
  // 진화 = 어두운 화면에서 옛 모습이 깜빡이다 번쩍 → 새 모습 → 바로 카드 고르기(scenes/draft.js — 2026-10-18 사용자 "진화 시 바로 진화 모션 보여 주면서 다음에 반드시 정하고 가야 함")
  async doEvolve(app, p) {
    const from = bigKey(p.key, stageKey(p)), pot = p.pot;
    const r = await app.act('evolve', { id: p.uid });
    if (!r) return;
    if (r.league) app.toast(`${LEAGUES[r.league.to].name}로 바꿨어요`);
    this.tab = 'skill'; this.sub = null; this.scrollY = 0;
    openDraft(app, p, { from, to: bigKey(p.key, stageKey({ stage: r.stage })), pot });
  },
};
