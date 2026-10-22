import { plainBg } from '../art/bg.js';
import { button, holoTab, rrect } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, plate, holo } from '../art/theme.js';
import { ELEMENT } from '../art/palette.js';
import { hexMix } from '../art/statusLook.js';
import { header, miniStars, cardBox, glowArt, drawSeed, drawItemArt } from './common.js';
import { SPECIES, SKILLS, JONG, ELEM, TIER_NAME, ITEMS, canGraft, FORMS } from '../game/catalog.js';
import { seedPrice, freeSlots, MUT_MAX, SKILL_STORE, slotLayout, SEED_MAX, potOf, specialSeed } from '../game/logic.js';
import { drawPortrait } from '../art/sprites.js';
import { Gfx } from '../core/gfx.js';
import { ask } from './popups.js';
import { CARDS, PASS_STORE, cardFits, cardFace, isSkillCard, baseOf, CARD_UP, cardPrice } from '../game/cards.js';
import { cardTiny, packTiny } from '../art/skillcard.js';
import { eul } from '../core/josa.js';
import { openDraft } from './draft.js';
import { sfx } from '../core/sound.js';

// 이 카드를 끼운 식물 수(스마트팜 · 보관고 — 가방 줄에 '끼움 n', 2026-10-22). 끼운 카드는 그 식물에 귀속(다른 식물 · 가방으로 못 감)
const onPlants = (s, id) => [...s.plants, ...(s.storage || [])].reduce((a, p) => a + [...(p.cards || []), ...(p.pstore || []), ...((p.skills && p.skills.battle) || []), ...((p.skills && p.skills.store) || [])].filter(x => x === id).length, 0);

// 가방: 종자(심기 · 팔기) · 접목 가지(맞는 식물에 접목) · 물건(물 · 비료 · 회귀 주사 · 연료)
const TABS = [['seed', '종자'], ['scion', '접목 가지'], ['card', '카드'], ['item', '물건']];   // 카드 탭(2026-10-17)
const cardList = s => Object.keys(s.cards || {}).filter(id => s.cards[id] > 0 && CARDS[id]).sort((a, b) => (CARDS[a].form || '').localeCompare(CARDS[b].form || '') || CARDS[b].rar - CARDS[a].rar);
const ROW = 60, TOP = 64;
// 종자 = 카드 한 장(2026-10-23 사용자 "종자 가방의 ui도 종자가 카드형태로 나오게 해줘. 정렬기능도 넣고"): 상점 카드와 같은 결(common.js cardBox · glowArt), 셋씩 줄.
//  같은 날 사용자 "종자에서 전설이나 색변종이나 이런게 식물의 아이콘을 가리지 않게 적용하는 법을 고안해봐 · 심기랑 판매칸은 식물을 선택해야 뜨는걸로.
//  식물을 누르면 확대되어서 상세 정보를 볼 수 있게 · 얘도 꾹눌러 선택모드로 바껴서 판매할 수 있게해줘":
//   카드 = 그림 칸(속성 빛 + 종자 그림(코덱스 도트 — 종마다 다름) · 별 효과 · 구석 = 속성 · 즐겨찾기 · 잠금) + 아래 띠(이름 · 별 · 종 · 희귀) — 단추 없음
//   특별(전설 · 변이 · 색 변종)은 그림을 가리지 않게: ① 테 색 ② 테 위 가운데 보석 ③ 아래 띠 셋째 줄 = 그 이름(그 색) ④ 색 변종은 종자 껍질 색 자체가 바뀜
//   누름 = 카드가 커지며 펼쳐지는 상세 창(큰 종자 · 속성 · 종 · 희귀 · 별 · 자라면 무엇 · 심기 · 팔기 · 즐겨찾기 · 잠금 — 밖을 누르면 접힘)
//   꾹 = 고르기 모드(누름 = 고름/풀기 · 끌면 지나가는 카드를 고름 · 목록 위아래 끝에선 저절로 넘김 · 전체) → 아래 '팔기 n' → 확인(특별 종자가 섞이면 알리고 '특별 빼고')
//  정렬 = 최신 · 희귀 · 별 · 속성 · 이름(즐겨찾기는 늘 앞 · 고른 정렬은 이 기기에 기억)
const SORTS = [['new', '최신'], ['rare', '희귀'], ['pot', '별'], ['el', '속성'], ['name', '이름']], SORT_KEY = 'pullo.seedSort', EL_ORDER = Object.keys(ELEM);
const CW = 80, CH = 108, CG = 6, AH = 56, SEED_TOP = TOP + 22, HOLD_MS = 320;
const specialOf = sd => (sd.legend ? 4 : sd.form ? 3 : sd.shiny ? 2 : 0);
const specialTag = sd => (sd.legend ? { label: '전설', col: '#ff8a3a' } : sd.form && FORMS[sd.form] ? { label: FORMS[sd.form].name + ' 변이', col: FORMS[sd.form].col } : sd.shiny ? { label: '색 변종', col: '#ff9ad8' } : null);
const frameCol = (sd, sp) => (specialTag(sd) || {}).col || (sp.rarity === 'rare' ? '#e0b040' : '#7a9cc0');
const seedT = (id, t) => t + ([...String(id)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % 2000);   // 카드마다 반짝임 때를 엇갈리게
const lerp = (a, b, k) => a + (b - a) * k;
export function sortSeeds(s, how) {
  const at = new Map(s.seeds.map((sd, i) => [sd.id, i])), nm = sd => (s.discovered.includes(sd.key) ? SPECIES[sd.key].name : null), rare = sd => (SPECIES[sd.key].rarity === 'rare' ? 1 : 0), newer = (a, b) => at.get(b.id) - at.get(a.id);
  const byName = (a, b) => (nm(a) == null) - (nm(b) == null) || (nm(a) || '').localeCompare(nm(b) || '', 'ko');   // 처음 보는 식물 = 뒤로
  const by = { new: newer,
    rare: (a, b) => specialOf(b) - specialOf(a) || rare(b) - rare(a) || potOf(b) - potOf(a) || newer(a, b),
    pot: (a, b) => potOf(b) - potOf(a) || specialOf(b) - specialOf(a) || newer(a, b),
    el: (a, b) => EL_ORDER.indexOf(SPECIES[a.key].el) - EL_ORDER.indexOf(SPECIES[b.key].el) || byName(a, b) || potOf(b) - potOf(a) || newer(a, b),
    name: (a, b) => byName(a, b) || potOf(b) - potOf(a) || newer(a, b) }[how] || newer;
  const l = [...s.seeds].sort(by);
  return [...l.filter(x => x.fav), ...l.filter(x => !x.fav)];
}
const loadSort = () => { try { const v = localStorage.getItem(SORT_KEY); return SORTS.some(([k]) => k === v) ? v : 'new'; } catch { return 'new'; } };
const saveSort = v => { try { localStorage.setItem(SORT_KEY, v); } catch {} };
// 테 위 가운데 보석(특별 종자 — 기술 카드 보석과 같은 결): 먹선 마름모 + 그 색 + 위 반 밝게 + 흰 점
function gem(g, cx, cy, col, r = 4) {
  for (let d = -r; d <= r; d++) { const hw = r - Math.abs(d); g.rect(cx - hw, cy + d, hw * 2 + 1, 1, '#0b1322'); }
  for (let d = -(r - 1); d <= r - 1; d++) { const hw = r - 1 - Math.abs(d); g.rect(cx - hw, cy + d, hw * 2 + 1, 1, d < 0 ? hexMix(col, '#ffffff', 0.45) : col); }
  g.px(cx - 1, cy - Math.max(1, r - 2), '#ffffff');
}
// 모르는 식물(자라면 칸) = 짙은 그림자
let shCv = null;
function shadowPortrait(g, key, x, y, s) {
  if (!shCv) shCv = document.createElement('canvas');
  shCv.width = s; shCv.height = s; const c = shCv.getContext('2d'); c.clearRect(0, 0, s, s);
  if (!drawPortrait(new Gfx(c), key, 0, 0, s, false)) return false;
  c.globalCompositeOperation = 'source-in'; c.fillStyle = '#26364e'; c.fillRect(0, 0, s, s); c.globalCompositeOperation = 'source-over';
  g.c.drawImage(shCv, x, y); return true;
}
export const bag = {
  theme: 'ship',
  enter(p = {}) {
    this.tab = p.tab || 'seed'; this.scroll = 0; this.pickFor = null; this.sort = p.sort || this.sort || loadSort();
    this.mode = p.select ? 'select' : 'view'; this.sel = new Set(); this.selN = +p.select || 0; this.sellAsk = !!p.sellAsk;   // select · sellAsk · info = 촬영
    this.zoom = p.info ? { id: '*', from: [0, 0, CW, CH], t0: -1e9, out: null } : null;
  },
  onDrag(dy, dx, ev) {
    if (this.zoom || this.sellAsk || (this.tab === 'seed' && this.mode === 'select')) return;   // 고르기 모드의 끌기 = 고르기(draw 에서)
    if (ev.y0 < (this.top || TOP)) return;
    this.scroll = Math.max(0, Math.min(this.max || 0, this.scroll - dy));
  },
  draw(app) {
    const { g, W, H, t, state: s } = app;
    plainBg(g, W, H, t);
    const free = freeSlots(s), seedTab = this.tab === 'seed', selMode = seedTab && this.mode === 'select';
    header(app, '가방', { right: seedTab ? `종자 ${s.seeds.length}/${SEED_MAX} · 빈 자리 ${Math.max(0, free)}` : '' });   // 종자 가방 한도(2026-10-18)
    let x = 10;
    for (const [id, label] of TABS) { const w = g.textW(label, 'label') + 22; holoTab(app, 'tab_' + id, x, 37, w, 21, label, this.tab === id, () => { this.tab = id; this.scroll = 0; this.pickFor = null; this.zoom = null; this.exitSelect(); }); x += w + 5; }
    const top = this.top = seedTab ? SEED_TOP : TOP;
    const list = seedTab ? sortSeeds(s, this.sort) : this.tab === 'scion' ? s.scions : this.tab === 'card' ? cardList(s) : Object.keys(ITEMS);
    if (seedTab) {
      if (this.zoom && this.zoom.id === '*') { if (list[0]) this.zoom.id = list[0].id; else this.zoom = null; }   // 촬영: 맨 앞 종자 펼침
      if (this.selN) { list.filter(sd => !sd.lock).slice(0, this.selN).forEach(sd => this.sel.add(sd.id)); this.selN = 0; }
      if (selMode) this.selectBar(app, list); else this.sortRow(app);
    }
    const bottom = H - 58, viewH = bottom - top, x0 = Math.round((W - 3 * CW - 2 * CG) / 2);
    this.max = Math.max(0, seedTab ? Math.ceil(list.length / 3) * (CH + CG) + 2 - viewH : list.length * ROW - viewH);
    // 고르기 모드: 끄는 손가락이 지나는 카드를 고름 · 목록 위아래 끝에선 저절로 넘김
    const dn = app.input.down;
    if (selMode && !this.sellAsk && dn && dn.moved && dn.y0 >= top && dn.y0 < bottom) {
      if (dn.y < top + 20) this.scroll -= 5; else if (dn.y > bottom - 20) this.scroll += 5;
      const r = (this.rects || []).find(q => dn.x >= q.x && dn.x < q.x + CW && dn.y >= q.y && dn.y < q.y + CH && dn.y >= top && dn.y < bottom);
      if (r) this.pick(app, r.id, true);
    }
    this.scroll = Math.max(0, Math.min(this.max, this.scroll || 0));
    const hits = []; this.rects = [];
    g.clip(0, top, W, viewH, () => {
      list.forEach((it, i) => {
        if (seedTab) {
          const cx = x0 + (i % 3) * (CW + CG), cy = top + 2 + Math.floor(i / 3) * (CH + CG) - Math.round(this.scroll);
          if (cy + CH >= top && cy <= bottom) this.seedCard(app, it, cx, cy, hits, selMode);
          return;
        }
        const y = top + i * ROW - Math.round(this.scroll);
        if (y + ROW < top || y > bottom) return;
        if (this.tab === 'scion') this.scionRow(app, it, y, hits);
        else if (this.tab === 'card') this.cardRow(app, it, y, hits);
        else this.itemRow(app, it, y);
      });
      if (!list.length) g.text(seedTab ? '종자가 없어요' : this.tab === 'card' ? '카드가 없어요' : '접목 가지가 없어요', W / 2, top + 30, { color: T.text.sub, align: 'center' });
    });
    for (const h of hits) if (h.y >= top && h.y + h.h <= bottom) app.input.hit(h.id, h.x, h.y, h.w, h.h, h.fn, 2);
    if (seedTab && this.max > 0) { const bh = Math.max(16, Math.round(viewH * viewH / (viewH + this.max))), bby = top + Math.round((viewH - bh) * this.scroll / this.max); g.rect(W - 4, bby, 2, bh, '#4f84bf'); }   // 넘김 막대
    // 꾹 = 고르기 모드(누른 카드부터 고름)
    if (seedTab && !selMode && !this.zoom && !this.sellAsk && dn && !dn.moved && dn.id && dn.id.startsWith('sd_') && app.input.holdMs() >= HOLD_MS) {
      app.input.claimHold(); this.mode = 'select'; this.sel = new Set();
      const id = dn.id.slice(3), sd = s.seeds.find(q => q.id === id);
      if (sd && sd.lock) app.toast('잠긴 종자는 팔 수 없어요'); else this.pick(app, id, true);
      sfx('select');
    }
    // 아래 단추 · 위에 뜨는 창
    if (selMode) {
      const n = this.sel.size, bw = Math.floor((W - 36) / 2);
      button(app, 'bs_done', 12, H - 48, bw, 34, '선택 끝', { style: 'night', font: 'head', onTap: () => this.exitSelect() });
      button(app, 'bs_sell', 24 + bw, H - 48, bw, 34, n ? `팔기 ${n}` : '팔기', { style: 'gold', font: 'head', icon: 'coin', disabled: !n, onTap: () => { this.sellAsk = true; } });
    } else if (!this.pickFor) button(app, 'bag_explore', 25, H - 46, W - 50, 30, '우주 지도에서 종자 찾기', { style: 'night', icon: 'navExplore', onTap: () => app.go('explore') });
    if (this.zoom) this.zoomDraw(app, free);
    else if (this.sellAsk) this.sellBox(app);
    else if (this.pickFor && this.pickFor.card) this.cardSheet(app);
    else if (this.pickFor) this.graftSheet(app);
  },
  // 버튼은 그리고, 누르는 자리는 목록 밖으로 나가지 않을 때만(끌어 넘기는 목록)
  btn(app, hits, id, x, y, w, h, label, opt, fn) { button(app, id, x, y, w, h, label, { ...opt, onTap: null }); if (!opt.disabled) hits.push({ id, x, y, w, h, fn }); },
  // 정렬 줄(탭 아래 — 다섯 칸 같은 너비, 고른 칸 = 금빛)
  sortRow(app) {
    const { W } = app, n = SORTS.length, gap = 4, w = Math.floor((W - 20 - gap * (n - 1)) / n);
    SORTS.forEach(([k, label], i) => button(app, 'srt_' + k, 10 + i * (w + gap), TOP - 2, w, 18, label, { style: this.sort === k ? 'gold' : 'night', font: 'label', onTap: () => { if (this.sort !== k) { this.sort = k; saveSort(k); this.scroll = 0; } } }));
  },
  // 고르기 줄(정렬 줄 자리): 고른 수 · 판 값 합 · 전체(잠긴 종자 빼고)
  selectBar(app, list) {
    const { g, W, state: s } = app, picked = s.seeds.filter(sd => this.sel.has(sd.id)), y = TOP - 2, lab = `${picked.length}개 고름`;
    g.text(lab, 12, y + 1, { font: 'bold', color: '#ffd890' });
    if (picked.length) { const tx = 12 + g.textW(lab, 'bold') + 8, ci = icon('coin'); g.img(ci, tx, y + 5); g.text(String(picked.reduce((a, sd) => a + seedPrice(sd), 0)), tx + ci.width + 3, y + 2, { font: 'label', color: '#e6f3ff' }); }
    const can = list.filter(sd => !sd.lock), all = can.length > 0 && can.every(sd => this.sel.has(sd.id)), cbx = W - 64;
    rrect(g, cbx, y + 2, 14, 14, 3, all ? '#ffd890' : '#3f6a88'); if (!all) rrect(g, cbx + 1, y + 3, 12, 12, 2, '#0d1f30'); else g.text('✓', cbx + 2, y + 1, { font: 'bold', color: '#1a1206' });
    g.text('전체', cbx + 19, y + 3, { font: 'label', color: '#e6f3ff' });
    app.input.hit('bs_all', cbx - 6, y - 3, 64, 24, () => { if (all) this.sel.clear(); else can.forEach(sd => this.sel.add(sd.id)); sfx('select'); });
  },
  pick(app, id, addOnly = false) {   // 고르기 모드: 고름 · 풀기(끌기 = 고르기만)
    const sd = app.state.seeds.find(q => q.id === id); if (!sd) return;
    if (sd.lock) { if (!addOnly) app.toast('잠긴 종자는 팔 수 없어요'); return; }
    if (this.sel.has(id)) { if (!addOnly) { this.sel.delete(id); sfx('select'); } return; }
    this.sel.add(id); sfx('select');
  },
  exitSelect() { this.mode = 'view'; this.sel = new Set(); this.sellAsk = false; },
  // 종자 카드(80×108): 위 = 그림 칸(속성 빛 + 종자 · 별 효과 · 구석 = 속성 · 즐겨찾기 · 잠금) · 테 위 보석 = 특별 · 아래 띠 = 이름 · 별 · 종 · 희귀(특별이면 그 이름)
  seedCard(app, sd, x, y, hits, selMode) {
    const { g, t, state: s } = app, P = T.ptext, sp = SPECIES[sd.key], known = s.discovered.includes(sd.key), E = ELEMENT[sp.el] || ELEMENT.grass, tag = specialTag(sd), col = frameCol(sd, sp), c = g.c, on = this.sel.has(sd.id);
    rrect(g, x + 1, y + 3, CW, CH, 5, 'rgba(0,0,0,0.32)');   // 그림자
    cardBox(g, x, y, CW, CH, col);
    const ax = x + 4, ay = y + 4, aw = CW - 8;
    c.imageSmoothingEnabled = false; c.drawImage(glowArt(E.main, aw, AH), ax, ay);
    g.clip(ax, ay, aw, AH, () => drawSeed(g, x + CW / 2, ay + AH / 2 + 2, sd.key, { pot: potOf(sd), shiny: sd.shiny, t: seedT(sd.id, t) }));
    g.img(icon(sp.el), ax + 3, ay + 3);
    if (sd.fav) g.img(icon('heart'), ax + aw - 12, ay + 3);
    if (sd.lock) g.img(icon('lockS'), ax + aw - 11, ay + (sd.fav ? 14 : 3));
    if (tag) gem(g, x + CW / 2, y + 2, tag.col);
    const by = ay + AH;   // 이름 띠
    g.rect(ax, by, aw, CH - 8 - AH, '#0c1526'); g.rect(ax, by, aw, 1, hexMix(col, '#0c1526', 0.4));
    const name = known ? sp.name : '처음 보는 식물';
    g.text(name, x + CW / 2, by + 3, { font: g.textW(name, 'bold') <= aw - 4 ? 'bold' : 'label', color: sd.legend ? '#ffb04a' : sd.shiny ? '#ffe8a8' : P.main, align: 'center' });
    miniStars(g, Math.round(x + (CW - 39) / 2), by + 19, potOf(sd));   // 잠재력 = 심으면 그 별(2026-10-18)
    const ln = tag ? tag.label : `${JONG[sp.type]} · ${sp.rarity === 'rare' ? '희귀' : '흔함'}`, lw = 10 + g.textW(ln, 'label'), lx = Math.round(x + (CW - lw) / 2);
    g.img(icon(sp.type), lx, by + 31); g.text(ln, lx + 10, by + 29, { font: 'label', color: tag ? hexMix(tag.col, '#ffffff', 0.45) : sp.rarity === 'rare' ? '#ffd890' : P.sub });
    if (selMode) {
      if (sd.lock) { c.fillStyle = 'rgba(3,6,12,0.55)'; c.fillRect(x, y, CW, CH); }
      else if (on) {
        c.fillStyle = 'rgba(255,216,144,0.16)'; c.fillRect(x, y, CW, CH);
        for (const [rx, ry, rw, rh] of [[x - 1, y - 1, CW + 2, 2], [x - 1, y + CH - 1, CW + 2, 2], [x - 1, y - 1, 2, CH + 2], [x + CW - 1, y - 1, 2, CH + 2]]) g.rect(rx, ry, rw, rh, '#ffd890');
        rrect(g, x + CW - 17, y + AH - 10, 13, 13, 3, '#ffd890'); g.text('✓', x + CW - 15, y + AH - 11, { font: 'bold', color: '#1a1206' });
      }
    }
    hits.push({ id: 'sd_' + sd.id, x, y, w: CW, h: CH, fn: () => (selMode ? this.pick(app, sd.id) : this.openZoom(app, sd.id, x, y)) });
    this.rects.push({ id: sd.id, x, y });
  },
  openZoom(app, id, x, y) { this.zoom = { id, from: [x, y, CW, CH], t0: app.t, out: null }; sfx('flip'); },
  closeZoom(app) { if (this.zoom && this.zoom.out == null) this.zoom.out = app.t; },
  // 펼친 상세 창(214×324): 카드 자리에서 가운데로 커지며 펼쳐짐(0.2초) → 큰 종자(3배) · 이름 · 특별 · 속성 · 종 · 희귀 · 별 · 자라면 · 심기 · 팔기 · 즐겨찾기 · 잠금
  zoomDraw(app, free) {
    const { g, W, H, t, state: s } = app, P = T.ptext, Z = this.zoom, sd = s.seeds.find(q => q.id === Z.id);
    if (!sd) { this.zoom = null; return; }
    const kin = Math.min(1, (t - Z.t0) / 200), kout = Z.out == null ? 0 : Math.min(1, (t - Z.out) / 150), k = Math.max(0, kin - kout), e = 1 - (1 - k) ** 3;
    if (Z.out != null && kout >= 1) { this.zoom = null; return; }
    const sp = SPECIES[sd.key], known = s.discovered.includes(sd.key), E = ELEMENT[sp.el] || ELEMENT.grass, tag = specialTag(sd), col = frameCol(sd, sp), pot = potOf(sd), c = g.c;
    c.fillStyle = `rgba(6,10,18,${(0.78 * e).toFixed(3)})`; c.fillRect(0, 0, W, H);
    app.input.hit('zm_block', 0, 0, W, H, () => this.closeZoom(app));
    const BW = 214, BH = 324, BA = 124, bx = Math.round((W - BW) / 2), byy = Math.max(16, Math.round((H - BH) / 2) - 8);
    const [fx, fy, fw, fh] = Z.from, rx = Math.round(lerp(fx, bx, e)), ry = Math.round(lerp(fy, byy, e)), rw = Math.round(lerp(fw, BW, e)), rh = Math.round(lerp(fh, BH, e)), aH = Math.round(lerp(AH, BA, e)), kk = e > 0.66 ? 3 : e > 0.33 ? 2 : 1;
    cardBox(g, rx, ry, rw, rh, col);
    c.imageSmoothingEnabled = false; c.drawImage(glowArt(E.main, rw - 8, aH), rx + 4, ry + 4);
    g.clip(rx + 4, ry + 4, rw - 8, aH, () => drawSeed(g, rx + rw / 2, ry + 4 + aH / 2 + 2 * kk, sd.key, { k: kk, pot, shiny: sd.shiny, t: seedT(sd.id, t) }));
    if (tag) gem(g, rx + rw / 2, ry + 2, tag.col, e > 0.5 ? 6 : 4);
    if (e < 0.999) return;
    app.input.hit('zm_in', bx, byy, BW, BH, () => {});
    const ax = bx + 4, ay = byy + 4, aw = BW - 8;
    g.img(icon(sp.el), ax + 5, ay + 5, 2);
    let iy = ay + 5; if (sd.fav) { g.img(icon('heart'), ax + aw - 24, iy, 2); iy += 22; } if (sd.lock) g.img(icon('lockS'), ax + aw - 22, iy, 2);
    const by = ay + BA;   // 아래 띠
    g.rect(ax, by, aw, BH - 8 - BA, '#0c1526'); g.rect(ax, by, aw, 1, hexMix(col, '#0c1526', 0.4));
    const cx = bx + BW / 2; let yy = by + 6;
    g.text(`${sd.legend ? '전설의 ' : ''}${known ? sp.name : '처음 보는 식물'} 종자`, cx, yy, { font: 'head', color: sd.legend ? '#ffb04a' : sd.shiny ? '#ffe8a8' : P.main, align: 'center' }); yy += 23;
    if (tag) { g.text(tag.label, cx, yy, { font: 'label', color: hexMix(tag.col, '#ffffff', 0.45), align: 'center' }); yy += 14; }
    g.text(`${E.name} 속성 · ${JONG[sp.type]} · ${sp.rarity === 'rare' ? '희귀' : '흔함'}`, cx, yy, { font: 'label', color: E.light || P.sub, align: 'center' }); yy += 17;
    c.save(); c.translate(Math.round(cx - 39), yy); c.scale(2, 2); miniStars(g, 0, 0, pot); c.restore(); yy += 19;   // 별(2배)
    g.text(`심으면 별 ${pot}개 식물`, cx, yy, { font: 'label', color: '#ffd890', align: 'center' }); yy += 17;
    // 자라면: 다 자란 식물 얼굴(모르는 식물 = 짙은 그림자 · 이름 ?)
    const ps = 30, lab = '자라면', nm = known ? sp.name : '???', gw = ps + 8 + Math.max(g.textW(lab, 'label'), g.textW(nm, 'bold')), gx = Math.round(cx - gw / 2);
    rrect(g, gx, yy, ps, ps, 4, '#06111c');
    g.clip(gx + 1, yy + 1, ps - 2, ps - 2, () => { if (known) drawPortrait(g, sd.key, gx + 1, yy + 1, ps - 2, false); else shadowPortrait(g, sd.key, gx + 1, yy + 1, ps - 2); });
    g.text(lab, gx + ps + 8, yy + 2, { font: 'label', color: P.sub }); g.text(nm, gx + ps + 8, yy + 15, { font: 'bold', color: known ? P.main : P.dim });
    const b1 = byy + BH - 64, b2 = byy + BH - 32, hw = Math.floor((BW - 26) / 2), price = seedPrice(sd), name = (known ? sp.name : '처음 보는 식물') + ' 종자';
    button(app, 'zm_plant', bx + 10, b1, hw, 28, '심기', { style: 'teal', font: 'bold', disabled: free <= 0, onTap: () => app.act('plantSeed', { seed: sd.id }).then(r => { if (r) { this.zoom = null; const i = app.state.plants.findIndex(p => p.uid === r.plant); if (i >= 0) { app.state.active = i; app.act('setActive', { id: r.plant }); } app.go('nursery', { planted: r.plant }); } }) });   // 심으면 스마트팜으로 — 그 자리로 굴러가 씨앗이 떨어져 싹이 남
    button(app, 'zm_sell', bx + 16 + hw, b1, hw, 28, sd.lock ? '잠김' : String(price), { style: 'night', font: 'bold', icon: sd.lock ? 'lockS' : 'coin', disabled: !!sd.lock, onTap: () => ask(app, `${eul(name)} 팔까요?`, `돈 ${price} 받기`, () => app.act('sellSeed', { seed: sd.id }).then(r => { if (r) { app.toast(`돈 +${r.credits}`); this.zoom = null; } }), '팔기') });
    button(app, 'zm_fav', bx + 10, b2, hw, 24, sd.fav ? '♥ 즐겨찾기 풀기' : '♡ 즐겨찾기', { style: sd.fav ? 'gold' : 'night', font: 'label', onTap: () => app.act('seedMark', { seed: sd.id, fav: !sd.fav }) });
    button(app, 'zm_lock', bx + 16 + hw, b2, hw, 24, sd.lock ? '잠금 풀기' : '잠그기', { style: sd.lock ? 'gold' : 'night', font: 'label', icon: 'lockS', iconTint: true, onTap: () => app.act('seedMark', { seed: sd.id, lock: !sd.lock }) });
  },
  // 여러 종자 팔기 확인: 수 · 받을 돈 · 특별 종자가 섞이면 알림 + '특별 빼고'
  sellBox(app) {
    const { g, W, H, state: s } = app, P = T.ptext, picked = s.seeds.filter(sd => this.sel.has(sd.id) && !sd.lock), spc = picked.filter(specialSeed), plain = picked.filter(sd => !specialSeed(sd)), sum = l => l.reduce((a, sd) => a + seedPrice(sd), 0);
    if (!picked.length) { this.sellAsk = false; return; }
    g.c.fillStyle = 'rgba(3,6,12,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('sb_block', 0, 0, W, H, () => { this.sellAsk = false; });
    const x = 16, w = W - 32, h = 112 + (spc.length ? 20 : 0), y = H - h - 62;
    holo(g, x, y, w, h, T.card || T.panel, 16);
    app.input.hit('sb_in', x, y, w, h, () => {});
    g.text(`종자 ${picked.length}개를 팔까요?`, x + 12, y + 12, { font: 'value', color: P.main });
    const ci = icon('coin'); g.img(ci, x + 12, y + 41); g.text(`+${sum(picked)}`, x + 15 + ci.width, y + 38, { font: 'bold', color: '#ffd890' });
    if (spc.length) g.text(`⚠ 전설 · 색 변종 · 변이 종자가 ${spc.length}개 있어요`, x + 12, y + 62, { font: 'label', color: '#ffb0a0' });
    const go = ids => app.act('sellSeeds', { seeds: ids }).then(r => { if (!r) return; sfx('coin'); app.toast(`종자 ${r.n}개 · 돈 +${r.credits}`); this.exitSelect(); });
    const by = y + h - 42;
    if (spc.length) {
      const bw = Math.floor((w - 36) / 3);
      button(app, 'sb_back', x + 10, by, bw, 32, '뒤로', { style: 'night', font: 'bold', onTap: () => { this.sellAsk = false; } });
      button(app, 'sb_plain', x + 18 + bw, by, bw, 32, '특별 빼고', { style: 'teal', font: 'bold', disabled: !plain.length, onTap: () => go(plain.map(sd => sd.id)) });
      button(app, 'sb_all', x + 26 + bw * 2, by, bw, 32, '모두 팔기', { style: 'gold', font: 'bold', onTap: () => go(picked.map(sd => sd.id)) });
    } else {
      const bw = Math.floor((w - 30) / 2);
      button(app, 'sb_back', x + 10, by, bw, 32, '뒤로', { style: 'night', font: 'bold', onTap: () => { this.sellAsk = false; } });
      button(app, 'sb_go', x + 20 + bw, by, bw, 32, '팔기', { style: 'gold', font: 'bold', icon: 'coin', onTap: () => go(picked.map(sd => sd.id)) });
    }
  },
  scionRow(app, sc, y, hits) {
    const { g, W, state: s } = app, P = T.ptext, sk = SKILLS[sc.skill];
    plate(g, 8, y, W - 16, 54);
    plate(g, 13, y + 7, 32, 40, 'deep');
    g.img(icon('vine'), 29 - 5, y + 21);
    g.text(sk.name, 52, y + 6, { font: 'bold', color: sk.tier === 'c3' || sk.tier === 's' ? '#c48cff' : P.main });
    const who = sk.tier === 's' ? '누구나' : sk.tier === 'g' ? '같은 가지 식물' : [sk.el && ELEM[sk.el] + ' 속성', sk.jong && JONG[sk.jong] + ' 종'].filter(Boolean).join(' · ');
    g.text(`${TIER_NAME[sk.tier]} · 위력 ${sk.power || '–'} · 비용 ${sk.cost}`, 52, y + 22, { color: P.sub });
    g.text(`배울 수 있는 식물: ${who}`, 52, y + 37, { color: P.dim });
    const ok = s.plants.some(p => !canGraft(p, sc.skill));
    this.btn(app, hits, 'gr_' + sc.id, W - 66, y + 14, 50, 26, '접목', { style: 'gold', disabled: !ok }, () => { this.pickFor = sc; });
  },
  // 카드 한 줄: 작은 카드 · 이름 · 일반/변이 · 효과 한 줄 · 장 수(가방 · 끼운 수) · 위 단추 = 강화(같은 카드 두 장 — 일반 패시브) 또는 팔기 · 아래 = 끼우기(맞는 식물 고르기)
  cardRow(app, id, y, hits) {
    const { g, W, state: s } = app, P = T.ptext, c = CARDS[id], f = cardFace(id), F = c.form && FORMS[c.form], n = s.cards[id], on = onPlants(s, id);
    plate(g, 8, y, W - 16, 54);
    plate(g, 13, y + 7, 32, 40, 'deep');
    cardTiny(g, 19, y + 13, f);
    g.text(c.name, 52, y + 6, { font: 'bold', color: F ? F.light : c.lv >= 3 ? '#ffe8a8' : '#d8f2ff' });
    g.text(`${F ? F.name + ' 변이' : '일반'} · ${c.kind === 'skill' ? '기술' : '패시브'}${on ? ` · 끼움 ${on}` : ''}`, 52, y + 22, { color: P.sub });
    const sk = c.kind === 'skill' && SKILLS[c.skill], line = c.kind === 'skill' ? `위력 ${sk.power || '–'} · 판마다 ${sk.uses}번` : (c.desc || [])[0] || '';
    let ln = line; const maxW = W - 124; while (g.textW(ln) > maxW && ln.length > 2) ln = ln.slice(0, -1); if (ln !== line) ln = ln.slice(0, -1) + '…';   // 끼우기 단추 앞에서 자름(뒷면 = 식물 관리에서)
    g.text(ln, 52, y + 37, { color: P.dim });
    g.text('×' + n, W - 72, y + 8, { font: 'bold', color: '#ffd890', align: 'right' });
    // 중복 카드(2026-10-22): 일반 패시브 = 두 장 → 한 단계 위(+1 · +2) · 강화할 수 없거나 한 장뿐 = 팔기
    if (c.next && n >= CARD_UP.need) {
      const cost = CARD_UP.credits[c.lv || 1], nx = CARDS[c.next];
      this.btn(app, hits, 'cu_' + id, W - 66, y + 3, 50, 20, '강화', { style: 'teal' }, () => ask(app, `${c.name} ${CARD_UP.need}장 → ${nx.name} 한 장`, `${nx.desc[0]} · 돈 ${cost}`, () => app.act('cardUp', { card: id }).then(r => r && (sfx('levelup'), app.toast(`${nx.name}!`))), '강화'));
    } else {
      const price = cardPrice(id);
      this.btn(app, hits, 'cs_' + id, W - 66, y + 3, 50, 20, String(price), { style: 'night', icon: 'coin' }, () => ask(app, `${eul(c.name)} 한 장 팔까요?`, `돈 ${price} 받기`, () => app.act('sellCard', { card: id }).then(r => r && app.toast(`돈 +${r.credits}`)), '팔기'));
    }
    const ok = s.plants.some(p => !cardFits(p, id));
    this.btn(app, hits, 'cd_' + id, W - 66, y + 27, 50, 22, '끼우기', { style: 'gold', disabled: !ok }, () => { this.pickFor = { card: id }; });
  },
  // 카드를 끼울 식물 고르기(스마트팜 식물 중 맞는 것): 패시브 = 빈 카드 칸에 · 변이 기술 카드 = 전투 칸(빈 칸 → 회피 · 방어 · 평타 자리, 그 변이 식물만 MUT_MAX 장까지 — 2026-10-17)
  cardSheet(app) {
    const { g, W, H, state: s } = app, id = this.pickFor.card, c = CARDS[id], P = T.ptext;
    g.c.fillStyle = 'rgba(6,10,18,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('cs_block', 0, 0, W, H, () => { this.pickFor = null; });
    const rows = s.plants.length, h = 70 + rows * 40, y = Math.max(40, H - h - 20);
    plate(g, 10, y, W - 20, h);
    app.input.hit('cs_in', 10, y, W - 20, h, () => {});
    g.text(`${eul(c.name)} 누구에게?`, 22, y + 10, { font: 'head', color: P.main });
    s.plants.forEach((p, i) => {
      // 넣을 곳(2026-10-18 칸 개편): 기술 카드 = 빈 장착 칸(MUT_MAX 장 안) → 스킬 보관 빈 칸 · 패시브 = 빈 장착 칸 → (그 변이 패시브) 패시브 보관 빈 칸
      const ry = y + 36 + i * 40, why = cardFits(p, id), L = slotLayout(p), sk = isSkillCard(id), has = [...L.battle, ...L.store, ...L.cards, ...L.pstore].some(x => x && baseOf(x) === baseOf(id));   // 강화 카드(+1 · +2)도 같은 카드
      const bi = L.battle.indexOf(null), ci = L.cards.indexOf(null);
      const where = sk ? (bi >= 0 && L.battle.filter(isSkillCard).length < MUT_MAX ? 'b' : L.store.length < SKILL_STORE ? 's' : null) : (ci >= 0 ? 'c' : L.pstore.length < PASS_STORE ? 'p' : null);   // 패시브 보관 = 모든 식물(2026-10-22)
      const no = why || (has ? '이미 끼웠어요' : !where ? (sk ? '스킬 칸이 차 있어요' : '패시브 칸이 차 있어요') : null);
      g.text(p.name, 22, ry + 6, { font: 'bold', color: no ? T.text.dim : P.main });
      g.text(no || (where === 'b' || where === 'c' ? '장착에 끼워요' : '보관에 넣어요'), 22, ry + 22, { color: no ? '#ffb0a0' : '#9ff0b0' });
      const done = r => { if (r) { this.pickFor = null; app.toast(`${p.name}에게 넣었어요`); } };
      button(app, 'cp_' + i, W - 84, ry + 6, 60, 26, '끼우기', { style: 'gold', disabled: !!no, onTap: () => ask(app, `${eul(c.name)} ${p.name}에게 끼울까요?`, '끼운 카드는 이 식물에 귀속돼요 — 다른 식물로 옮기거나 가방에 되돌릴 수 없어요', () => {   // 귀속(2026-10-22) = 되돌릴 수 없어 한 번 묻기
        if (where === 'b') L.battle[bi] = id; else if (where === 's') L.store.push(id); else if (where === 'c') L.cards[ci] = id; else L.pstore.push(id);
        app.act('setSlots', { id: p.uid, ...L }).then(done);
      }, '끼우기') });
    });
    button(app, 'cs_close', W / 2 - 50, y + h - 34, 100, 28, '닫기', { style: 'night', onTap: () => { this.pickFor = null; } });
  },
  itemRow(app, k, y) {
    const { g, W, state: s } = app, P = T.ptext, it = ITEMS[k], ic = { water: 'can', fert: 'fert', regress: 'potion', fuel: 'energy', parts: 'gear' }[k];
    plate(g, 8, y, W - 16, 54);
    plate(g, 13, y + 7, 32, 40, 'deep');
    if (drawItemArt(g, k, 29, y + 27, true)) {}   // 코덱스 물건 그림(28칸 — 상점과 같은 그림, 2026-10-23)
    else if (k === 'pack_n' || k === 'pack_m') packTiny(g, 18, y + 13, k === 'pack_m');   // 카드 꾸러미(2026-10-22 — 식물 관리에서 열기)
    else { const im = icon(ic || it.icon); g.img(im, 29 - im.width, y + 27 - im.height, 2); }
    g.text(it.name, 52, y + 8, { font: 'bold', color: P.main });
    g.text(it.desc, 52, y + 27, { color: P.sub });
    g.text(String(s.items[k] || 0), W - 22, y + 16, { font: 'head', color: '#ffd890', align: 'right' });
  },
  // 접목할 식물 고르기(스마트팜 식물 중 맞는 것)
  graftSheet(app) {
    const { g, W, H, state: s } = app, sc = this.pickFor, sk = SKILLS[sc.skill], P = T.ptext;
    g.c.fillStyle = 'rgba(6,10,18,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('gs_block', 0, 0, W, H, () => { this.pickFor = null; });
    const rows = s.plants.length, h = 70 + rows * 40, y = Math.max(40, H - h - 20);
    plate(g, 10, y, W - 20, h);
    app.input.hit('gs_in', 10, y, W - 20, h, () => {});
    g.text(`${eul(sk.name)} 누구에게?`, 22, y + 10, { font: 'head', color: P.main });
    s.plants.forEach((p, i) => {
      const ry = y + 36 + i * 40, why = canGraft(p, sc.skill), known = [...p.skills.battle, ...(p.skills.store || []), ...p.skills.forgot, ...(p.drafts || []).filter(d => d.kind === 'one').flatMap(d => d.cands)].includes(sc.skill);
      g.text(p.name, 22, ry + 6, { font: 'bold', color: why || known ? T.text.dim : P.main });
      g.text(known ? '이미 알아요' : why || '배울 수 있어요', 22, ry + 22, { color: why || known ? '#ffb0a0' : '#9ff0b0' });
      button(app, 'gp_' + i, W - 84, ry + 6, 60, 26, '접목', { style: 'gold', disabled: !!(why || known), onTap: () => app.act('graft', { id: p.uid, scion: sc.id }).then(r => { if (r) { this.pickFor = null; if (r.to === 'draft') openDraft(app, p); else app.toast(`${p.name}: ${eul(sk.name)} 배웠어요`); } }) });
    });
    button(app, 'gs_close', W / 2 - 50, y + h - 34, 100, 28, '닫기', { style: 'night', onTap: () => { this.pickFor = null; } });
  },
};
