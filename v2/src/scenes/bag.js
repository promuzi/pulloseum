import { plainBg } from '../art/bg.js';
import { button, chip, holoTab } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T, plate } from '../art/theme.js';
import { header, seedArt, miniStars } from './common.js';
import { SPECIES, SKILLS, JONG, ELEM, TIER_NAME, ITEMS, canGraft, FORMS } from '../game/catalog.js';
import { seedPrice, freeSlots, MUT_MAX, SKILL_STORE, slotLayout, SEED_MAX, potOf } from '../game/logic.js';
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
export const bag = {
  theme: 'ship',
  enter(p = {}) { this.tab = p.tab || 'seed'; this.scroll = 0; this.pickFor = null; },
  onDrag(dy, dx, ev) { if (ev.y0 < TOP) return; this.scroll = Math.max(0, Math.min(this.max || 0, this.scroll - dy)); },
  draw(app) {
    const { g, W, H, t, state: s } = app, P = T.ptext;
    plainBg(g, W, H, t);
    const free = freeSlots(s);
    header(app, '가방', { right: this.tab === 'seed' ? `종자 ${s.seeds.length}/${SEED_MAX} · 빈 자리 ${Math.max(0, free)}` : '' });   // 종자 가방 한도(2026-10-18)
    let x = 10;
    for (const [id, label] of TABS) { const w = g.textW(label, 'label') + 22; holoTab(app, 'tab_' + id, x, 37, w, 21, label, this.tab === id, () => { this.tab = id; this.scroll = 0; this.pickFor = null; }); x += w + 5; }
    const list = this.tab === 'seed' ? [...s.seeds.filter(x => x.fav), ...s.seeds.filter(x => !x.fav)] : this.tab === 'scion' ? s.scions : this.tab === 'card' ? cardList(s) : Object.keys(ITEMS);
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
        else if (this.tab === 'card') this.cardRow(app, it, y, hits);
        else this.itemRow(app, it, y);
      });
      if (!list.length) g.text(this.tab === 'seed' ? '종자가 없어요' : this.tab === 'card' ? '카드가 없어요' : '접목 가지가 없어요', W / 2, TOP + 30, { color: T.text.sub, align: 'center' });
    });
    for (const h of hits) if (h.y >= TOP && h.y + h.h <= bottom) app.input.hit(h.id, h.x, h.y, h.w, h.h, h.fn, 2);
    if (this.pickFor && this.pickFor.card) this.cardSheet(app);
    else if (this.pickFor) this.graftSheet(app);
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
    { let mx = 52 + g.textW(name, 'bold') + 4; if (sd.fav) { g.text('♥', mx, y + 6, { font: 'bold', color: '#ff9ab0' }); mx += 14; } if (sd.lock) g.img(icon('lockS'), mx, y + 8); }   // 즐겨찾기 · 잠금(2026-10-18)
    // 희귀도 = 글자 꼬리표(전엔 별 1·3개 — 심은 식물의 별(개체값)과 헷갈림, 2026-10-16 사용자 "종자에 적힌 별 수는 뭐야? 심으면 별 수가 바뀌는데")
    //  개체값은 심을 때 정해짐 → 종자엔 '좋은 개체값 ↑'(탐사 종자 보관함 · 행성 생기)만
    let cx = 52;
    cx += chip(g, cx, y + 19, sp.rarity === 'rare' ? '희귀' : '흔함', { color: sp.rarity === 'rare' ? '#9fd0ff' : '#b8c4d4' }) + 4;
    cx += chip(g, cx, y + 19, JONG[sp.type], { icon: sp.type }) + 4;
    g.img(icon(sp.el), cx, y + 21);
    const tags = [sd.form && FORMS[sd.form] && FORMS[sd.form].name + ' 변이', sd.shiny && '색 변종'].filter(Boolean);   // 잠재력 = 별(심으면 그 별 — 2026-10-18, 전엔 '좋은 개체값 확률 ↑')
    const sw = miniStars(g, 52, y + 40, potOf(sd));
    g.text(tags.length ? tags.join(' · ') : ELEM[sp.el] + ' 속성', 52 + sw + 6, y + 37, { color: tags.length ? '#ffd890' : P.dim });
    const price = seedPrice(sd);
    this.btn(app, hits, 'plant_' + sd.id, W - 66, y + 6, 50, 20, '심기', { style: 'teal', disabled: free <= 0 }, () => app.act('plantSeed', { seed: sd.id }).then(r => { if (r) { const i = app.state.plants.findIndex(p => p.uid === r.plant); if (i >= 0) { app.state.active = i; app.act('setActive', { id: r.plant }); } app.go('nursery', { planted: r.plant }); } }));   // 심으면 스마트팜으로 — 그 자리로 굴러가 씨앗이 떨어져 싹이 남
    this.btn(app, hits, 'sell_' + sd.id, W - 66, y + 29, 50, 20, sd.lock ? '잠김' : String(price), { style: 'night', icon: sd.lock ? 'lockS' : 'coin', disabled: !!sd.lock }, () => ask(app, `${eul(sp.name + ' 종자')} 팔까요?`, `돈 ${price} 받기`, () => app.act('sellSeed', { seed: sd.id }).then(r => r && app.toast(`돈 +${r.credits}`)), '팔기'));
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
    if (k === 'pack_n' || k === 'pack_m') packTiny(g, 18, y + 13, k === 'pack_m');   // 카드 꾸러미(2026-10-22 — 식물 관리에서 열기)
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
