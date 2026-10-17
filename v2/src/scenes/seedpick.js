import { button, rrect } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { holo, T } from '../art/theme.js';
import { ELEMENT } from '../art/palette.js';
import { seedArt, miniStars } from './common.js';
import { SPECIES, IV_KEYS, IV_MAX, STAT_NAME } from '../game/catalog.js';
import { specialSeed, ivpChance, ivpPity, potOf } from '../game/logic.js';
import { sfx } from '../core/sound.js';

// 종자 거름 고르기(2026-10-18 사용자 "종자가 아이템 창처럼 쭉 나열 · 한 번 누르면 정보 · 꾹 누르면 선택 모드(그땐 한 번만 누르면 선택) · 전체 선택 체크 상자 ·
//  끌어서 여러 개 선택 · 거름으로 쓰기 단추 → 어떤 능력치에 넣을지 → 진행 · 특수한 건 주의 문구 + 그걸 빼고 하는 단추 · 종자 그림 · 별 · 속성 · 이름으로 최소 정보"):
//  app.seedpick = { uid, sel: Set, mode: 'view' | 'select', sy, info, stage: null | 'stat', stat }
//  칸 = 같은 종 종자만(거름은 같은 종만) · 칸 그림 = 종자 그림 + 속성 아이콘 + 특별 표시(전설 · 색 변종 · 변이) + ★ = 좋은 개체값 굴림(ivk)
const COLS = 4, TW = 58, TH = 70, GX = 6, GY = 6, HOLD_MS = 320;
const plantOf = (s, uid) => (s ? s.plants.find(x => x.uid === uid) : null);
const SPECIAL = sd => (sd.legend ? '전설' : sd.shiny ? '색 변종' : sd.form ? '변이' : null);

export function openSeedPick(app, p) { app.seedpick = { uid: p.uid, sel: new Set(), mode: 'view', sy: 0, info: null, stage: null, stat: null }; sfx('select'); }

// 끌기(main.js): 선택 모드 = 손가락이 지나는 칸을 고름 · 보기 모드 = 칸 줄 위아래로 넘김
export const seedPickDrag = app => ({ onDrag(dy) {
  const D = app.seedpick, d = app.input.down; if (!D || D.stage) return;
  if (D.mode === 'select' && d) { const id = tileAt(D, d.x, d.y), sd = id && app.state.seeds.find(x => x.id === id); if (sd && !sd.lock && !D.sel.has(id)) { D.sel.add(id); sfx('select'); } return; }
  D.sy = Math.max(0, Math.min(D.maxY || 0, (D.sy || 0) - dy));
} });
function tileAt(D, x, y) { for (const r of D.rects || []) if (x >= r.x && x < r.x + TW && y >= r.y && y < r.y + TH) return r.id; return null; }

export function seedPickScreen(app, D) {
  const { g, W, H, input, state: s } = app, p = plantOf(s, D.uid);
  if (!p) { app.seedpick = null; return; }
  const sp = SPECIES[p.key], el = ELEMENT[sp.el] || {}, mine = s.seeds.filter(sd => sd.key === p.key), list = [...mine.filter(sd => sd.fav), ...mine.filter(sd => !sd.fav)], free = list.filter(sd => !sd.lock);   // 즐겨찾기 = 앞으로 · 잠금 = 고를 수 없음
  for (const id of [...D.sel]) if (!list.some(sd => sd.id === id)) D.sel.delete(id);   // 쓴 종자는 고른 것에서 빠짐
  g.c.fillStyle = '#03060c'; g.c.fillRect(0, 0, W, H);   // 불투명(뒤 화면 글자가 비치지 않게)
  input.hit('sp_block', 0, 0, W, H, () => {});
  // 위: 제목 · 수 · 전체 선택
  g.text('종자 거름', 14, 12, { font: 'head', color: '#e6f3ff' });
  g.text(`${sp.name} 종자 ${list.length} · 고름 ${D.sel.size}`, 14, 34, { font: 'label', color: '#8cb6de' });
  const all = free.length > 0 && D.sel.size === free.length, cbx = W - 72;
  rrect(g, cbx, 30, 14, 14, 3, all ? '#ffd890' : '#0d1f30'); if (!all) rrect(g, cbx + 1, 31, 12, 12, 2, '#0d1f30');
  if (all) g.text('✓', cbx + 2, 30, { font: 'bold', color: '#1a1206' });
  g.text('전체', cbx + 19, 31, { font: 'label', color: '#e6f3ff' });
  if (!D.stage) input.hit('sp_all', cbx - 4, 26, 64, 22, () => { if (all) D.sel.clear(); else { free.forEach(sd => D.sel.add(sd.id)); D.mode = 'select'; } sfx('select'); });   // 전체 = 잠긴 종자는 빼고
  // 가운데: 종자 칸(넷씩 줄) — 화면보다 길면 위아래로
  const GY0 = 56, GY1 = H - 60, x0 = Math.round((W - COLS * TW - (COLS - 1) * GX) / 2), rows = Math.ceil(list.length / COLS);
  D.maxY = Math.max(0, rows * (TH + GY) - GY - (GY1 - GY0));
  D.sy = Math.min(D.sy || 0, D.maxY); D.rects = [];
  g.clip(0, GY0 - 2, W, GY1 - GY0 + 2, () => list.forEach((sd, i) => {
    const x = x0 + (i % COLS) * (TW + GX), y = GY0 + Math.floor(i / COLS) * (TH + GY) - Math.round(D.sy), on = D.sel.has(sd.id), spc = SPECIAL(sd);
    if (y + TH < GY0 || y > GY1) return;
    holo(g, x, y, TW, TH, T.card || T.panel, 12);
    seedArt(g, x + TW / 2, y + 26, sp.el);
    const ei = icon(sp.el); if (ei) g.img(ei, x + 4, y + 4);
    if (sd.fav) g.text('♥', x + 18, y + 2, { font: 'bold', color: '#ff9ab0' });   // 즐겨찾기(★는 잠재력)
    if (sd.lock) { g.c.fillStyle = 'rgba(3,6,12,0.35)'; g.c.fillRect(x, y, TW, TH); const li = icon('lockS'); if (li) g.img(li, x + 4, y + TH - 15); }   // 잠금 = 조금 어둡게 + 자물쇠
    if (spc) { const w = g.textW(spc, 'label') + 6; rrect(g, x + TW - w - 2, y + 2, w, 14, 3, spc === '전설' ? '#5a3a10' : spc === '변이' ? '#3a1a48' : '#183a4a'); g.text(spc, x + TW - w + 1, y + 2, { font: 'label', color: spc === '전설' ? '#ffd890' : spc === '변이' ? '#e0b8ff' : '#b8f0ff' }); }
    miniStars(g, x + Math.round((TW - 39) / 2), y + 45, potOf(sd));   // 잠재력 = 심으면 그 별(2026-10-18)
    g.text(sp.rarity === 'rare' ? '희귀' : '일반', x + TW / 2, y + 56, { font: 'label', color: el.light || '#cfe8f8', align: 'center' });
    if (on) { g.c.fillStyle = 'rgba(255,216,144,0.18)'; g.c.fillRect(x, y, TW, TH); for (const [rx, ry, rw, rh] of [[x - 1, y - 1, TW + 2, 2], [x - 1, y + TH - 1, TW + 2, 2], [x - 1, y - 1, 2, TH + 2], [x + TW - 1, y - 1, 2, TH + 2]]) g.rect(rx, ry, rw, rh, '#ffd890'); rrect(g, x + TW - 15, y + TH - 15, 12, 12, 3, '#ffd890'); g.text('✓', x + TW - 13, y + TH - 16, { font: 'bold', color: '#1a1206' }); }
    D.rects.push({ id: sd.id, x, y });
    const hy = Math.max(y, GY0), hh = Math.min(y + TH, GY1) - hy;
    if (!D.stage && hh > 6) input.hit('sp_t' + i, x, hy, TW, hh, () => {
      if (D.mode === 'select') { if (sd.lock) return app.toast('잠긴 종자예요 — 누르고 잠금을 풀어요'); if (on) D.sel.delete(sd.id); else D.sel.add(sd.id); sfx('select'); }
      else { D.info = D.info === sd.id ? null : sd.id; sfx('flip'); }
    });
  }));
  if (!list.length) g.text('같은 식물 종자가 없어요', W / 2, GY0 + 30, { color: '#8cb6de', align: 'center' });
  if (D.maxY > 0) { const vh = GY1 - GY0, bh = Math.max(16, Math.round(vh * vh / (vh + D.maxY))), by = GY0 + Math.round((vh - bh) * D.sy / D.maxY); g.rect(W - 5, by, 2, bh, '#4f84bf'); }
  // 꾹 = 선택 모드(그 칸도 고름)
  const dn = input.down;
  if (!D.stage && D.mode === 'view' && dn && !dn.moved && dn.id && dn.id.startsWith('sp_t') && input.holdMs() >= HOLD_MS) {
    const sd = list[+dn.id.slice(4)]; if (sd) { input.claimHold(); D.mode = 'select'; if (!sd.lock) D.sel.add(sd.id); D.info = null; sfx('select'); }
  }
  // 아래 단추: 닫기 · (선택 모드) 선택 풀기 · 거름으로 쓰기
  const by = H - 48, bw = Math.floor((W - 36) / 2);
  if (!D.stage) {
    if (D.mode === 'select') button(app, 'sp_done', 12, by, bw, 34, '선택 끝', { style: 'night', font: 'head', onTap: () => { D.mode = 'view'; D.sel.clear(); } });
    else button(app, 'sp_close', 12, by, bw, 34, '닫기', { style: 'night', font: 'head', onTap: () => { app.seedpick = null; } });
    button(app, 'sp_use', 24 + bw, by, bw, 34, D.sel.size ? `거름으로 쓰기 ${D.sel.size}` : '거름으로 쓰기', { style: 'gold', font: 'head', disabled: !D.sel.size, onTap: () => { D.stage = 'stat'; D.stat = D.stat || IV_KEYS.find(k => (p.ivs[k] || 0) < IV_MAX) || null; sfx('select'); } });
  }
  if (D.info && !D.stage) infoBox(app, D, list.find(sd => sd.id === D.info), sp);
  if (D.stage === 'stat') statBox(app, D, p, list);
}

// 한 번 누름 = 그 종자 정보(이름 · 속성 · 희귀 · 특별 · 좋은 개체값 굴림)
function infoBox(app, D, sd, sp) {
  if (!sd) { D.info = null; return; }
  const { g, W, H } = app, x = 16, w = W - 32, h = 132, y = H - 60 - h - 6, el = ELEMENT[sp.el] || {};
  holo(g, x, y, w, h, T.deep || T.panel, 14);
  g.text(`${SPECIAL(sd) ? SPECIAL(sd) + ' ' : ''}${sp.name} 종자`, x + 12, y + 10, { font: 'value', color: '#e6f3ff' });
  g.text(`${el.name || ''} 속성 · ${sp.rarity === 'rare' ? '희귀' : '일반'}`, x + 12, y + 32, { font: 'label', color: el.light || '#8cb6de' });
  g.text('잠재력', x + 12, y + 50, { font: 'label', color: '#8cb6de' }); miniStars(g, x + 56, y + 53, potOf(sd)); g.text(`심으면 별 ${potOf(sd)}개`, x + 102, y + 50, { font: 'label', color: '#ffd890' });
  if (SPECIAL(sd)) g.text('심으면 특별한 식물이 나와요', x + 12, y + 68, { font: 'label', color: '#ffb0a0' });
  app.input.hit('sp_info', x, y, w, h, () => { D.info = null; });
  const bw = Math.floor((w - 34) / 2), by = y + h - 40;   // 즐겨찾기 · 잠금(2026-10-18)
  button(app, 'sp_fav', x + 12, by, bw, 30, sd.fav ? '♥ 즐겨찾기 풀기' : '♡ 즐겨찾기', { style: sd.fav ? 'gold' : 'night', font: 'bold', onTap: () => app.act('seedMark', { seed: sd.id, fav: !sd.fav }) });
  button(app, 'sp_lock', x + 22 + bw, by, bw, 30, sd.lock ? '잠금 풀기' : '잠그기', { style: sd.lock ? 'gold' : 'night', font: 'bold', icon: 'lockS', iconTint: true, onTap: () => { if (!sd.lock) D.sel.delete(sd.id); app.act('seedMark', { seed: sd.id, lock: !sd.lock }); } });
}

// 거름으로 쓰기 → 능력치 고르기 → 진행(특별 종자가 섞이면 주의 문구 + 빼고 진행)
function statBox(app, D, p, list) {
  const { g, W, H, input } = app, picked = list.filter(sd => D.sel.has(sd.id)), spc = picked.filter(specialSeed), x = 12, w = W - 24, h = 70 + IV_KEYS.length * 34 + (spc.length ? 24 : 0) + 46, y = Math.max(20, H - h - 16);
  g.c.fillStyle = 'rgba(3,6,12,0.7)'; g.c.fillRect(0, 0, W, H);
  input.hit('sp_stat_block', 0, 0, W, H, () => {});
  holo(g, x, y, w, h, T.card || T.panel, 16);
  g.text('어떤 개체값에 넣을까요?', x + 12, y + 10, { font: 'value', color: '#e6f3ff' });
  g.text(`종자 ${picked.length}개 · 하나씩 확률 · 실패가 쌓이면 반드시`, x + 12, y + 30, { font: 'label', color: '#8cb6de' });
  IV_KEYS.forEach((k, i) => {
    const ry = y + 52 + i * 34, v = p.ivs[k] || 0, full = v >= IV_MAX, on = D.stat === k, fails = (p.ivp && p.ivp[k]) || 0;
    rrect(g, x + 10, ry, w - 20, 30, 5, on ? '#3a2c10' : '#0d1f30');
    if (on) for (const [rx, rw] of [[x + 10, w - 20]]) { g.rect(rx, ry, rw, 2, '#ffd890'); g.rect(rx, ry + 28, rw, 2, '#ffd890'); }
    g.text(STAT_NAME[k], x + 20, ry + 8, { font: 'bold', color: full ? '#4f6f90' : on ? '#ffd890' : '#e6f3ff' });
    g.text(`${v}/${IV_MAX}`, x + 80, ry + 8, { font: 'label', color: '#cfe8f8' });
    g.text(full ? '최대' : `${Math.round(ivpChance(v) * 100)}% · 반드시 ${fails}/${ivpPity(v)}`, x + w - 20, ry + 8, { font: 'label', color: full ? '#4f6f90' : '#9ff0b0', align: 'right' });
    if (!full) input.hit('sp_s_' + k, x + 10, ry, w - 20, 30, () => { D.stat = k; sfx('select'); });
  });
  let yy = y + 52 + IV_KEYS.length * 34 + 4;
  if (spc.length) { g.text(`⚠ 전설 · 색 변종 · 변이 종자가 ${spc.length}개 있어요`, x + 12, yy, { font: 'label', color: '#ffb0a0' }); yy += 24; }
  const go = ids => { const seeds = ids; app.act('seedFeed', { id: p.uid, stat: D.stat, seeds }).then(r => { if (!r) return; sfx(r.to > r.from ? 'levelup' : 'coin'); app.toast(`${STAT_NAME[r.stat]} ${r.from} → ${r.to} · 종자 ${r.used}개(성공 ${r.ok} · 실패 ${r.fail})`); D.stage = null; D.sel.clear(); D.mode = 'view'; }); };
  const bw = spc.length ? Math.floor((w - 36) / 3) : Math.floor((w - 30) / 2), ok = !!D.stat;
  button(app, 'sp_back', x + 10, yy, bw, 32, '뒤로', { style: 'night', font: 'bold', onTap: () => { D.stage = null; } });
  if (spc.length) {
    button(app, 'sp_go_plain', x + 18 + bw, yy, bw, 32, '특별 빼고', { style: 'teal', font: 'bold', disabled: !ok || spc.length === picked.length, onTap: () => go(picked.filter(sd => !specialSeed(sd)).map(sd => sd.id)) });
    button(app, 'sp_go', x + 26 + bw * 2, yy, bw, 32, '모두 진행', { style: 'gold', font: 'bold', disabled: !ok, onTap: () => go(picked.map(sd => sd.id)) });
  } else button(app, 'sp_go', x + 20 + bw, yy, bw, 32, '진행', { style: 'gold', font: 'bold', disabled: !ok, onTap: () => go(picked.map(sd => sd.id)) });
}
