import { ELEMENT, TYPE } from '../art/palette.js';
import { button, fmt, rbox, holoTab } from '../art/ui.js';
import { icon, tinted } from '../art/icons.js';
import { bigKey } from '../art/sprites.js';
import { T, btnBody, tbar, holo } from '../art/theme.js';
import { gradeBadge, STAT_DEF } from './common.js';
import { STAGE_NAME, CAT_ICON, CAT_NAME, SPECIES } from '../data/mock.js';
import { kitOf, BASICS } from '../battle/model.js';
import { fxChip } from '../art/statusLook.js';
import { LOFT_STOOL, loftView, loftPlant, loftZoom, loftPlantCy } from '../art/loft.js';
import { FOCUS, SPK } from './home.js';

// 식물 관리(2026-10-15 사용자 "가운데 식물을 누르면 주변 전등이 꺼지면서 암실이 되는 연출과 함께 위 주황전등만 남아서 집중시키고, 동시에 식물이
//  조금 확대되는 줌. 이렇게 집중시키면서 식물의 강화와, 각종 식물 스킬과 세팅을 할 수 있는 기능으로 넘어가게 해줘"):
//  홈이 불을 끄고 다가간 그 카메라 그대로(암실 · 전등 빛기둥 · 의자 위 식물 1.35배) — 위 = 돌아가기·이름·정체성 꼬리표, 아래 = 판이 올라오며 기술 · 강화 · 설정.
//  돌아가기 = 판이 내려가고 홈이 카메라를 물리며 불을 켬(home.js unfocus).
const SHEET_Y = 258, IN_MS = 320, OUT_MS = 220;
// 기술 탭 시안 데이터(규칙 상태로 옮기기 전): 전투 기술 3(식물 기술 둘 + 속성 공통 버프 기술) · 조커 · 지운 기술 · 회귀 주사 수
const BUFF_SKILL = { fire: ['불타오르기', '분노'], water: ['맑은 물', '정화'], grass: ['광합성', '재생'], earth: ['단단해지기', '철벽'], wind: ['순풍', '가속'], bolt: ['정전기 충전', '집중'], ice: ['얼음 껍질', '보호막'] };
const JOKER_MOCK = { flower_grass: { id: 'u1', name: '가시 장미', power: 90, cost: 2, el: 'grass', cats: ['attack'], inflict: { id: 'poison', n: 2 } } };
const FORGOT_MOCK = { flower_grass: [{ id: 'old1', name: '덩굴 새순', power: 60, cost: 1, el: 'grass', cats: ['attack'], inflict: { id: 'bind' } }] };
function skillSet(p) {
  if (p._sk) return p._sk;
  const el = (SPECIES[p.key] || {}).el || 'grass', [bn, bf] = BUFF_SKILL[el] || BUFF_SKILL.grass, own = kitOf(p.key).filter(s => s.id[0] === 's');
  return (p._sk = { battle: [own[0], own[1], { id: 'b1', name: bn, cost: 1, el, cats: ['buff'], buff: bf }], joker: JOKER_MOCK[p.key] || null, forgot: FORGOT_MOCK[p.key] || [], regress: 2 });
}
// 기술 카드: 이름 · 속성 / 분류 · 효과 칩 · 비용. 조커 칸은 금빛 테, 고른 칸은 청록 테
function skillCard(app, id, x, y, w, h, sk, sel, onTap, joker = false) {
  const { g, input } = app, down = !!onTap && input.isPressed(id);
  if (!sk) {
    holo(g, x, y, w, h, T.deep, 16);
    g.text(joker ? '빈 조커 칸' : '빈 칸', x + w / 2, y + 11, { font: 'label', color: T.text.dim, align: 'center' });
  } else {
    const S = T.btn.second, { yy } = btnBody(g, x, y, w, h, S, down);
    g.text(sk.name, x + 8, yy + 3, { font: 'label', color: S.text });
    if (sk.el) g.img(icon(sk.el), x + w - 18, yy + 4);
    const cat = sk.cats[0];
    g.img(icon(CAT_ICON[cat]), x + 8, yy + 19);
    g.text(CAT_NAME[cat], x + 22, yy + 18, { color: S.text });
    const cx = x + 22 + g.textW(CAT_NAME[cat]) + 8;
    if (sk.inflict) fxChip(g, cx, yy + 17, sk.inflict.id); else if (sk.buff) fxChip(g, cx, yy + 17, null, sk.buff);
    if (sk.cost) { g.img(icon('energy'), x + w - 23, yy + 19); g.text(String(sk.cost), x + w - 8, yy + 18, { font: 'label', color: S.text, align: 'right' }); }
    else g.text('무료', x + w - 8, yy + 18, { color: S.text, align: 'right' });
  }
  const fc = sel ? '#97e8f7' : joker ? '#ffd890' : null;
  if (fc) { g.rect(x - 1, y - 1, w + 2, 1, fc); g.rect(x - 1, y + h, w + 2, 1, fc); g.rect(x - 1, y, 1, h, fc); g.rect(x + w, y, 1, h, fc); }
  if (onTap) input.hit(id, x, y, w, h, onTap, 2);
}
const TABS = [{ id: 'skill', label: '기술' }, { id: 'up', label: '강화' }, { id: 'set', label: '설정' }];
const ease = k => k * k * (3 - 2 * k);

export const plant = {
  theme: 'loft',
  enter(p) { this.sel = p.sel == null ? null : p.sel === 'j' ? 'j' : +p.sel; this.tab = p.tab || 'skill';   // ?sel = 검토 촬영(고른 칸)
 this.t0 = p.focus ? null : -1e9; this.out = null; this.gone = false; },   // 홈 암실 연출에서 왔을 때만 판이 올라옴
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const p = s.plants[s.active], key = bigKey(p.key, p.stage), [mx, my] = LOFT_STOOL, pc = loftPlantCy(key);
    if (this.t0 == null) this.t0 = t;
    loftView(app, { dark: 1, z: loftZoom(app, FOCUS.want), px: mx, py: pc, sx: FOCUS.sx, sy: FOCUS.sy, plant: () => loftPlant(app, key, p.pot, mx, my) });
    // 들어옴 = 위 글자가 나타나고 아래 판이 올라옴, 나감 = 거꾸로 → 홈(불 켜짐)
    let k = ease(Math.min(1, (t - this.t0) / IN_MS));
    if (this.out != null) { const o = Math.min(1, (t - this.out) / OUT_MS); k = Math.min(k, 1 - ease(o)); if (o >= 1 && !this.gone) { this.gone = true; app.go('home', { from: 'plant' }, 'cut'); } }
    const live = k >= 1 && this.out == null;
    g.alpha(k, () => this.top(app, p, live));
    const sy = Math.round(SHEET_Y + (1 - k) * (H - SHEET_Y + 4));
    g.c.save(); g.c.translate(0, sy - SHEET_Y);
    this.sheet(app, p, live);
    g.c.restore();
  },
  // 위: 돌아가기 · 이름 + 등급 + 이름 바꾸기 · 정체성 꼬리표 · 새잎까지 막대(오른쪽 위)
  top(app, p, live) {
    const { g, W } = app, P = T.ptext, pr = app.input.isPressed('pl_back');
    const { yy } = btnBody(g, 6, 6, 30, 26, T.btn.second, pr);
    g.img(tinted('back', T.btn.second.text), 17, yy + 8);
    if (live) app.input.hit('pl_back', 6, 6, 30, 26, () => { this.out = app.t; }, 8);
    g.text(p.name, 44, 9, { font: 'name', color: '#f4fbff', outline: '#05070f', outlineW: 3 });
    const nw = g.textW(p.name, 'name');
    gradeBadge(g, 44 + nw + 6, 10, p.grade);
    g.img(icon('pencil'), 44 + nw + 26, 12);
    if (live) app.input.hit('pl_name', 44, 6, nw + 40, 26, () => { const v = typeof prompt === 'function' ? prompt('이름(10자까지)', p.name) : null; if (v && v.trim()) p.name = v.trim().slice(0, 10); }, 2);
    // 정체성 꼬리표(홈과 같은 꼴)
    const sp = SPK[p.key] || ['flower', 'grass'], el = ELEMENT[sp[1]], ty = sp[0];
    const list = [{ ic: ty, label: TYPE[ty] }, { ic: sp[1], label: el.name, col: el.light }, { ic: 'seed', label: (STAGE_NAME[ty] || STAGE_NAME.flower)[p.stage] }];
    let x = 8;
    for (const r of list) { const w = 22 + g.textW(r.label, 'label'); rbox(g, x, 40, w, 18, 5, '#10283c', '#4c88a9'); g.img(icon(r.ic), x + 5, 44); g.text(r.label, x + 18, 43, { font: 'label', color: r.col || '#e4fbff' }); x += w + 4; }
    // 새잎까지 + 랭크(오른쪽 위, 꽉 찬 작은 판)
    const bx = W - 98, st = T.card || T.panel;
    holo(g, bx, 6, 92, 52, st, 16);
    g.text('새잎까지', bx + 7, 10, { font: 'label', color: P.sub });
    g.text(p.exp != null ? `${p.exp}/${p.expNext}` : '–', bx + 85, 10, { font: 'label', color: P.main, align: 'right' });
    tbar(g, bx + 7, 27, 78, 4, p.exp != null ? p.exp / p.expNext : 0, 'exp');
    const rk = p.rank || { tier: '브론즈', pts: 0, next: 300 };
    g.text(rk.tier, bx + 7, 38, { font: 'label', color: '#ffd890' });
    g.text(`${rk.pts}/${rk.next}`, bx + 85, 38, { color: P.sub, align: 'right' });
  },
  // 아래 판: 탭(기술 · 강화 · 설정) + 내용
  sheet(app, p, live) {
    const { g, W, H } = app, st = T.card || T.panel;
    holo(g, 4, SHEET_Y, W - 8, H - SHEET_Y + 6, st, 16);
    const tw = Math.floor((W - 24) / TABS.length);
    TABS.forEach((tb, i) => holoTab(app, 'pt_' + tb.id, 12 + i * tw, SHEET_Y + 8, tw - 4, 27, tb.label, tb.id === this.tab, live ? () => { this.tab = tb.id; } : null, 'value'));
    const y0 = SHEET_Y + 44;
    if (this.tab === 'up') this.drawUp(app, p, y0, live);
    else if (this.tab === 'set') this.drawSet(app, p, y0, live);
    else this.drawSkill(app, p, y0, live);
  },
  drawUp(app, p, y0, live) {
    const { g, W } = app, P = T.ptext, ps = p.stats || {}, lv = p.lv || {};
    let y = y0;
    STAT_DEF.forEach((d, i) => {
      if (i) g.rect(14, y - 3, W - 28, 1, '#24506e');
      g.img(icon(d.icon), 16, y + 9);
      g.text(d.name, 32, y + 7, { font: 'label', color: P.sub });
      g.text(ps[d.k] != null ? fmt(ps[d.k]) + (d.suf || '') : '–', 112, y + 6, { font: 'value', color: P.main, align: 'right' });
      g.text(`Lv${lv[d.k] || 1}`, 124, y + 7, { font: 'label', color: '#97e8f7' });
      button(app, 'up_' + d.k, W - 96, y + 2, 82, 26, '40', { style: 'gold', font: 'value', icon: 'coin', onTap: live ? () => app.toast(d.name + ' 강화') : null });
      y += 34;
    });
  },
  // 기술 탭(2026-10-16 사용자 "기억하는 기술은 전투 칸만큼 — 조커로 하나 보관만 할 수 있게, UI 고민"):
  //  기본기 셋(늘 있음, 작은 칩) · 전투 기술 3칸(전투에 나감) · 조커 1칸(보관만 — 전투 칸과 자리 바꾸기) ·
  //  지운 기술(진화 때 새 기술에 밀려 지운 것 → 유전자 회귀 주사(완제품 아이템)로 되돌림). 지금은 시안 데이터(skillSet).
  drawSkill(app, p, y0, live) {
    const { g, W } = app, P = T.ptext, S = skillSet(p);
    // 기본기
    g.text('기본기', 14, y0 + 1, { font: 'label', color: P.sub });
    let x = 14 + g.textW('기본기', 'label') + 8;
    for (const b of BASICS) { const w = 20 + g.textW(b.name); rbox(g, x, y0, w, 16, 4, '#10283c', '#2f5a78'); g.img(icon(CAT_ICON[b.cats[0]]), x + 4, y0 + 2); g.text(b.name, x + 16, y0 + 2, { color: '#cfefff' }); x += w + 4; }
    // 전투 기술 3칸
    let y = y0 + 24;
    g.text('전투 기술', 14, y, { font: 'value', color: P.main });
    g.text(`${S.battle.filter(Boolean).length}/3`, W - 14, y + 1, { font: 'label', color: P.sub, align: 'right' });
    y += 18;
    const tap = i => (live ? () => this.pickSlot(app, S, i) : null);
    for (let i = 0; i < 3; i++) { skillCard(app, 'sk_b' + i, 14, y, W - 28, 34, S.battle[i], this.sel === i, tap(i)); y += 38; }
    // 조커 1칸
    y += 4;
    g.text('조커', 14, y, { font: 'value', color: '#ffd890' });
    g.text('보관만 — 전투엔 안 나가요', 14 + g.textW('조커', 'value') + 8, y + 2, { color: P.sub });
    y += 18;
    skillCard(app, 'sk_j', 14, y, W - 28, 34, S.joker, this.sel === 'j', tap('j'), true);
    y += 40;
    if (this.sel != null) g.text(this.sel === 'j' ? '바꿀 전투 칸을 눌러요' : '조커 칸을 누르면 자리를 바꿔요', W / 2, y - 3, { color: '#97e8f7', align: 'center' });
    // 지운 기술 + 회귀 주사
    y += 12;
    g.text('지운 기술', 14, y, { font: 'value', color: P.main });
    g.img(icon('potion'), W - 92, y + 1);
    g.text(`회귀 주사 ${S.regress}`, W - 14, y + 1, { font: 'label', color: '#c8f4ff', align: 'right' });
    y += 18;
    for (const sk of S.forgot) {
      if (y > app.H - 28) break;
      holo(g, 12, y, W - 24, 26, T.deep, 16);
      g.text(sk.name, 20, y + 6, { font: 'label', color: T.text.dim });
      if (sk.inflict) fxChip(g, 24 + g.textW(sk.name, 'label'), y + 5, sk.inflict.id);
      button(app, 'sk_back_' + sk.id, W - 84, y + 3, 66, 20, '되돌리기', { style: 'night', font: 'label', disabled: !S.regress, onTap: live ? () => this.regress(app, S, sk) : null });
      y += 30;
    }
  },
  // 칸 고르기: 전투 칸 ↔ 조커 자리 바꾸기(같은 칸을 다시 누르면 취소)
  pickSlot(app, S, i) {
    if (this.sel == null) { this.sel = i; return; }
    if (this.sel === i) { this.sel = null; return; }
    const a = this.sel, b = i;
    if (a !== 'j' && b !== 'j') { this.sel = i; return; }   // 전투 칸끼리는 고르기만 옮김
    const bi = a === 'j' ? b : a;
    [S.battle[bi], S.joker] = [S.joker, S.battle[bi]];
    this.sel = null;
    app.toast('조커와 자리를 바꿨어요');
  },
  // 되돌리기: 빈 전투 칸 → 빈 조커 칸 순서로, 다 차 있으면 안내
  regress(app, S, sk) {
    if (!S.regress) return;
    const hole = S.battle.findIndex(x => !x);
    if (hole >= 0) S.battle[hole] = sk; else if (!S.joker) S.joker = sk; else { app.toast('칸이 다 찼어요 — 하나를 비우고 되돌려요'); return; }
    S.forgot = S.forgot.filter(x => x !== sk); S.regress--;
    app.toast(`${sk.name} — 유전자 회귀 주사로 되돌렸어요`);
  },
  // 설정: 이름 · 화분 · 동면 보관(첫 판 = 자리만, 실제 동작은 게임 규칙 상태로 옮길 때)
  drawSet(app, p, y0, live) {
    const { g, W } = app, P = T.ptext;
    const rows = [
      { id: 'name', ic: 'pencil', label: '이름 바꾸기', sub: p.name, act: '바꾸기', fn: () => { const v = typeof prompt === 'function' ? prompt('이름(10자까지)', p.name) : null; if (v && v.trim()) p.name = v.trim().slice(0, 10); } },
      { id: 'pot', ic: 'seed', label: '화분 바꾸기', sub: { pot_terra: '테라코타', pot_ceramic: '도자기', pot_glass: '유리', pot_crystal: '크리스탈', pot_gold: '황금' }[p.pot] || '테라코타', act: '고르기', fn: () => app.toast('화분 고르기') },
      { id: 'store', ic: 'lock', label: '동면 보관고로', sub: '스마트팜 자리를 비워요', act: '보내기', fn: () => app.toast('동면 보관고로 보냄') },
    ];
    let y = y0;
    for (const r of rows) {
      holo(g, 12, y, W - 24, 46, T.deep, 16);
      g.img(icon(r.ic), 20, y + 9);
      g.text(r.label, 36, y + 7, { font: 'value', color: P.main });
      g.text(r.sub, 36, y + 26, { color: P.sub });
      button(app, 'set_' + r.id, W - 84, y + 10, 64, 26, r.act, { style: 'night', font: 'label', onTap: live ? r.fn : null });
      y += 52;
    }
  },
};
