import { plainBg, awning } from '../art/bg.js';
import { hud, navBar, button, rrect } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { T } from '../art/theme.js';
import { hexMix } from '../art/statusLook.js';
import { seedArt, cardBox, glowArt, drawItemArt } from './common.js';
import { SHOP, SPECIES } from '../game/catalog.js';
import { showGot } from './popups.js';
import { CARDS } from '../game/cards.js';
import { packTiny } from '../art/skillcard.js';
import { glyphH } from '../core/text.js';

// 상점(2026-10-16 사용자 "물 비료는 전투 탐사 수확에서 얻고 상점에서는 유료 재화로 구매"):
//  종자 꾸러미 = 돈, 보급품(물 · 비료 · 회귀 주사 · 연료) = 보석. 식물 팔기 · 해체 = 고른 식물 아래 단추(스마트팜 · 보관고 · 식물 관리 설정).
//  2026-10-22 사용자 "상점 ui도 카드형태로 이쁘게 다듬어봐" — 물건 하나 = 카드 한 장(전투 카드와 같은 결: 먹선 · 금속 테(위 · 왼 빛, 아래 · 오른 그늘) ·
//  그림 칸(갈래 색 빛이 가운데서 번짐) · 이름 띠 · 값 단추). 갈래 = 종자(초록) · 카드 꾸러미(일반 하늘 · 변이 보라) · 보급품(청록) — 테 색으로 갈림. 넘치면 끌어 넘김
const SECTIONS = [
  { title: '종자 꾸러미', ids: ['seed_common', 'seed_rare'] },
  { title: '카드 꾸러미', ids: ['card_basic', 'card_mut'] },
  { title: '보급품', ids: ['water10', 'fert5', 'regress1', 'nutr1', 'fuel3', 'parts5'] },
];
const COL = { seed_common: '#3fae5a', seed_rare: '#e0b040', card_basic: '#5fb3d9', card_mut: '#9a6ae0', water10: '#2fa3a8', fert5: '#2fa3a8', regress1: '#2fa3a8', nutr1: '#2fa3a8', fuel3: '#2fa3a8', parts5: '#2fa3a8' };
const ART = { seed_common: { seed: 'grass' }, seed_rare: { seed: 'bolt', rare: true }, card_basic: { pack: 'n' }, card_mut: { pack: 'm' }, water10: { ic: 'can' }, fert5: { ic: 'fert' }, regress1: { ic: 'potion' }, nutr1: { ic: 'potion' }, fuel3: { ic: 'energy' }, parts5: { ic: 'gear' } };
const DESC = { seed_common: '흔한 식물', seed_rare: '희귀 식물', card_basic: '일반 식물용', card_mut: '변이 식물용', water10: '생장 +10씩', fert5: '생장 +25씩', regress1: '기술 되돌리기', nutr1: '개체값 +1', fuel3: '탐사 3번', parts5: '탐사선 강화' };
const SHORT = { seed_common: '일반 종자', seed_rare: '희귀 종자', card_basic: '일반 카드', card_mut: '변이 카드', water10: '물 10', fert5: '비료 5', regress1: '회귀 주사', nutr1: '영양제', fuel3: '연료 3', parts5: '부품 5' };
const TOP = 44;   // 카드 테 · 그림 칸 바탕 = common.js cardBox · glowArt(종자 가방과 같이 씀)

// 그림 칸 가운데 물건(2배)
function art(g, cx, cy, A, id) {
  if (drawItemArt(g, id, cx, cy)) return;   // 코덱스 물건 그림(44칸 도트 — art/items.js, 2026-10-22 사용자 "상점의 아이템 디자인도 받아서") · 그림이 오기 전엔 옛 아이콘
  const c = g.c;
  c.save(); c.translate(cx, cy); c.scale(2, 2);
  if (A.seed) { seedArt(g, 0, 0, A.seed); if (A.rare) g.img(icon('star'), 4, -11); }
  else if (A.pack) packTiny(g, -11, -14, A.pack === 'm');
  else { const ic = icon(A.ic || 'box'); g.img(ic, -Math.round(ic.width / 2), -Math.round(ic.height / 2)); }
  c.restore();
}

export const shop = {
  theme: 'ship',   // 함선 장터(장소 테마 — 2026-10-15)
  enter() { this.scroll = 0; },
  onDrag(dy, dx, ev) { if (ev.y0 < TOP) return; this.scroll = Math.max(0, Math.min(this.max || 0, (this.scroll || 0) - dy)); },
  draw(app) {
    const { g, W, H, t, state: s } = app, P = T.ptext;
    plainBg(g, W, H, t, 'shop_ship');
    awning(g, 28, W);
    hud(app, s);
    const gap = 6, cw = Math.floor((W - 16 - gap * 2) / 3), CH = 118, AH = 60, bottom = H - 50, viewH = bottom - TOP, hits = [];
    let y = TOP + 4 - Math.round(this.scroll || 0);
    g.clip(0, TOP, W, viewH, () => {
      for (const S of SECTIONS) {
        g.text(S.title, 12, y + 2, { font: 'head', color: T.text.main, shadow: T.ink });
        y += 24;
        S.ids.forEach((id, i) => {
          const it = SHOP.find(x => x.id === id); if (!it) return;
          const inRow = Math.min(3, S.ids.length - Math.floor(i / 3) * 3), x0 = Math.round((W - inRow * cw - (inRow - 1) * gap) / 2), x = x0 + (i % 3) * (cw + gap), yy = y + Math.floor(i / 3) * (CH + gap), col = COL[id] || '#2fa3a8';
          rrect(g, x + 1, yy + 3, cw, CH, 5, 'rgba(0,0,0,0.32)');   // 그림자
          cardBox(g, x, yy, cw, CH, col);
          const ax = x + 4, ay = yy + 4, aw = cw - 8;
          g.c.imageSmoothingEnabled = false; g.c.drawImage(glowArt(col, aw, AH), ax, ay);
          art(g, Math.round(x + cw / 2), ay + Math.round(AH / 2) + 1, ART[id] || {}, id);
          const by = ay + AH;   // 이름 띠
          g.rect(ax, by, aw, CH - 8 - AH, '#0c1526'); g.rect(ax, by, aw, 1, hexMix(col, '#0c1526', 0.4));
          g.text(SHORT[id] || it.name, x + cw / 2, by + 4, { font: 'bold', color: P.main, align: 'center' });
          g.text(DESC[id] || '', x + cw / 2, by + 4 + glyphH('bold') + 3, { font: 'label', color: P.sub, align: 'center' });
          const [cur, n] = Object.entries(it.cost)[0], can = s.wallet[cur] >= n, bid = 'buy_' + id, bx = x + 6, bty = yy + CH - 25, bw = cw - 12;
          button(app, bid, bx, bty, bw, 19, String(n), { style: can ? 'gold' : 'off', icon: cur === 'gems' ? 'gem' : 'coin', disabled: !can, onTap: null });
          hits.push({ id: bid, x: bx, y: bty, w: bw, h: 19, fn: can ? () => this.buy(app, it) : null });
        });
        y += Math.ceil(S.ids.length / 3) * (CH + gap) + 6;
      }
    });
    this.max = Math.max(0, y + Math.round(this.scroll || 0) - bottom + 4);
    for (const h of hits) if (h.fn && h.y >= TOP && h.y + h.h <= bottom) app.input.hit(h.id, h.x, h.y, h.w, h.h, h.fn, 2);   // 보이는 단추만 누름(끌어 넘기는 판)
    if (this.max > 0) { const bh = Math.max(16, Math.round(viewH * viewH / (viewH + this.max))), bby = TOP + Math.round((viewH - bh) * (this.scroll || 0) / this.max); g.rect(W - 4, bby, 2, bh, '#4f84bf'); }   // 넘김 막대
    navBar(app, 'shop');
  },
  async buy(app, it) {
    const r = await app.act('buy', { item: it.id });
    if (!r) return;
    if (r.seed) { const sp = SPECIES[r.seed.key]; showGot(app, it.name, [{ kind: 'seed', seed: r.seed, rar: sp.rarity === 'rare' ? 3 : 1 }], '가방에 넣었어요'); }
    else if (r.card) showGot(app, it.name, [{ kind: 'card', card: r.card, rar: (CARDS[r.card] || {}).rar || 1 }], '가방에 넣었어요');
    else if (r.give && (r.give.pack_n || r.give.pack_m)) { const k = r.give.pack_m ? 'pack_m' : 'pack_n'; showGot(app, it.name, [{ kind: k, n: r.give[k], rar: k === 'pack_m' ? 3 : 2 }], k === 'pack_m' ? '변이 식물 관리에서 열어요' : '일반 식물 관리에서 열어요'); }   // 꾸러미째 가방에(2026-10-22)
    else app.toast(Object.entries(r.give).map(([k, n]) => `${{ water: '물', fert: '비료', regress: '회귀 주사', nutr: '영양제', fuel: '연료', parts: '부품' }[k] || k} +${n}`).join(' · '));
  },
};
