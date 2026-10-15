import { plainBg } from '../art/bg.js';
import { button, chip, holoTab } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, plate } from '../art/theme.js';
import { header, seedArt } from './common.js';
import { SPECIES, SKILLS, JONG, ELEM, TIER_NAME, ITEMS, canGraft } from '../game/catalog.js';
import { seedPrice, freeSlots } from '../game/logic.js';
import { ask } from './popups.js';
import { eul } from '../core/josa.js';

// 가방: 종자(심기 · 팔기) · 접목 가지(맞는 식물에 접목) · 물건(물 · 비료 · 회귀 주사 · 연료)
const TABS = [['seed', '종자'], ['scion', '접목 가지'], ['item', '물건']];
const ROW = 60, TOP = 64;
export const bag = {
  theme: 'ship',
  enter(p = {}) { this.tab = p.tab || 'seed'; this.scroll = 0; this.pickFor = null; },
  onDrag(dy, dx, ev) { if (ev.y0 < TOP) return; this.scroll = Math.max(0, Math.min(this.max || 0, this.scroll - dy)); },
  draw(app) {
    const { g, W, H, t, state: s } = app, P = T.ptext;
    plainBg(g, W, H, t);
    const free = freeSlots(s);
    header(app, '가방', { right: this.tab === 'seed' ? `스마트팜 빈 자리 ${Math.max(0, free)}` : '' });
    let x = 10;
    for (const [id, label] of TABS) { const w = g.textW(label, 'label') + 22; holoTab(app, 'tab_' + id, x, 37, w, 21, label, this.tab === id, () => { this.tab = id; this.scroll = 0; this.pickFor = null; }); x += w + 5; }
    const list = this.tab === 'seed' ? s.seeds : this.tab === 'scion' ? s.scions : Object.keys(ITEMS);
    const bottom = H - 58, viewH = bottom - TOP;
    this.max = Math.max(0, list.length * ROW - viewH);
    if (this.scroll > this.max) this.scroll = this.max;
    const hits = [];
    g.clip(0, TOP, W, viewH, () => {
      list.forEach((it, i) => {
        const y = TOP + i * ROW - Math.round(this.scroll);
        if (y + ROW < TOP || y > bottom) return;
        if (this.tab === 'seed') this.seedRow(app, it, y, free, hits);
        else if (this.tab === 'scion') this.scionRow(app, it, y, hits);
        else this.itemRow(app, it, y);
      });
      if (!list.length) g.text(this.tab === 'seed' ? '종자가 없어요 — 탐사 · 수확 · 상점에서 얻어요' : '접목 가지가 없어요 — 해체 · 탐사 · 수확에서 나와요', W / 2, TOP + 30, { color: T.text.sub, align: 'center' });
    });
    for (const h of hits) if (h.y >= TOP && h.y + h.h <= bottom) app.input.hit(h.id, h.x, h.y, h.w, h.h, h.fn, 2);
    if (this.pickFor) this.graftSheet(app);
    else button(app, 'bag_explore', 25, H - 46, W - 50, 30, '우주 지도에서 종자 찾기', { style: 'night', icon: 'navExplore', onTap: () => app.go('explore') });
  },
  // 버튼은 그리고, 누르는 자리는 목록 밖으로 나가지 않을 때만(끌어 넘기는 목록)
  btn(app, hits, id, x, y, w, h, label, opt, fn) { button(app, id, x, y, w, h, label, { ...opt, onTap: null }); if (!opt.disabled) hits.push({ id, x, y, w, h, fn }); },
  seedRow(app, sd, y, free, hits) {
    const { g, W, state: s } = app, P = T.ptext, sp = SPECIES[sd.key], known = s.discovered.includes(sd.key);
    plate(g, 8, y, W - 16, 54);
    plate(g, 13, y + 7, 32, 40, 'deep');
    seedArt(g, 29, y + 27, sp.el);
    const name = (sd.legend ? '전설의 ' : '') + (known ? sp.name : '처음 보는 식물') + ' 종자';
    g.text(name, 52, y + 6, { font: 'bold', color: sd.legend ? '#ffb04a' : sd.shiny ? '#ffe8a8' : P.main });
    const n = sp.rarity === 'rare' ? 3 : 1;
    for (let i = 0; i < 3; i++) g.img(icon(i < n ? 'star' : 'starOff'), 52 + i * 12, y + 21);
    let cx = 92;
    cx += chip(g, cx, y + 19, JONG[sp.type], { icon: sp.type }) + 4;
    g.img(icon(sp.el), cx, y + 21);
    const tags = [sd.shiny && '색 변종', sd.trait === 'fruity' && '열매용', sd.trait === 'ornamental' && '관상용'].filter(Boolean);
    g.text(tags.length ? tags.join(' · ') : ELEM[sp.el] + ' 속성', 52, y + 37, { color: tags.length ? '#ffd890' : P.dim });
    const price = seedPrice(sd);
    this.btn(app, hits, 'plant_' + sd.id, W - 66, y + 6, 50, 22, '심기', { style: 'teal', disabled: free <= 0 }, () => app.act('plantSeed', { seed: sd.id }).then(r => { if (r) { app.toast(`${sp.name} 심었어요!`); const i = app.state.plants.findIndex(p => p.uid === r.plant); if (i >= 0) { app.state.active = i; app.act('setActive', { id: r.plant }); } } }));
    this.btn(app, hits, 'sell_' + sd.id, W - 66, y + 31, 50, 18, String(price), { style: 'night', icon: 'coin' }, () => ask(app, `${eul(sp.name + ' 종자')} 팔까요?`, `돈 ${price} 받기`, () => app.act('sellSeed', { seed: sd.id }).then(r => r && app.toast(`돈 +${r.credits}`)), '팔기'));
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
  itemRow(app, k, y) {
    const { g, W, state: s } = app, P = T.ptext, it = ITEMS[k], ic = { water: 'water', fert: 'fert', regress: 'potion', fuel: 'energy' }[k];
    plate(g, 8, y, W - 16, 54);
    plate(g, 13, y + 7, 32, 40, 'deep');
    const im = icon(ic); g.img(im, 29 - im.width, y + 27 - im.height, 2);
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
      const ry = y + 36 + i * 40, why = canGraft(p, sc.skill), known = [...p.skills.battle, p.skills.joker, ...p.skills.forgot, ...p.pend].includes(sc.skill);
      g.text(p.name, 22, ry + 6, { font: 'bold', color: why || known ? T.text.dim : P.main });
      g.text(known ? '이미 알아요' : why || '배울 수 있어요', 22, ry + 22, { color: why || known ? '#ffb0a0' : '#9ff0b0' });
      button(app, 'gp_' + i, W - 84, ry + 6, 60, 26, '접목', { style: 'gold', disabled: !!(why || known), onTap: () => app.act('graft', { id: p.uid, scion: sc.id }).then(r => { if (r) { this.pickFor = null; app.toast(r.to === 'pend' ? `${p.name} — 식물 관리에서 놓을 칸을 골라요` : `${p.name}: ${eul(sk.name)} 배웠어요`); } }) });
    });
    button(app, 'gs_close', W / 2 - 40, y + h - 32, 80, 24, '닫기', { style: 'night', onTap: () => { this.pickFor = null; } });
  },
};
