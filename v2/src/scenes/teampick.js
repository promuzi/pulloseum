// 3:3 팀 고르기 창(2026-10-18 사용자 "3:3 매칭 이상해 · 덱을 구성하는 ui가 불편해" — 홈은 칸을 누르면 팀에 없는 다음 식물로 하나씩 넘어가기만 했고,
//  친구 방 목록은 식물이 많으면 화면 밖으로 넘쳐 '이 팀으로' 단추가 안 보였음). 홈 · 친구 방이 같이 씀 — 팀 정의는 하나(setTeam).
//  위 = 고른 셋(1 = 먼저 나감 · 칸을 누르면 빠짐) · 가운데 = 내 식물 두 줄 칸(얼굴 · 이름 · 별 · 단계 Lv · 속성 — 즐겨찾기 먼저, 끌어 넘김)
//  누르면 빈 순서로 들어가고 다시 누르면 빠짐 · 아래 = 닫기 · '이 팀으로'(셋일 때)
//  app.teampick = { sel: [uid…], sy, maxY, onOk(uids) }
import { button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawPortrait, bigKey } from '../art/sprites.js';
import { T, holo } from '../art/theme.js';
import { miniStars } from './common.js';
import { SPECIES } from '../game/catalog.js';
import { stageKey, stageName, stars, lvOf } from '../game/view.js';
import { sfx } from '../core/sound.js';
import { glyphH, sized } from '../core/text.js';
import { ELEMENT } from '../art/palette.js';
import { hexMix } from '../art/statusLook.js';

const ring = (g, x, y, w, h, c) => { g.rect(x, y, w, 2, c); g.rect(x, y + h - 2, w, 2, c); g.rect(x, y, 2, h, c); g.rect(x + w - 2, y, 2, h, c); };

// 폭 room 안에 들어가는 가장 큰 글꼴(같은 굵기 · base 크기 → min 칸까지 한 칸씩)
const fitFont = (g, str, base, room, min) => { if (g.textW(str, base) <= room) return base; let k = base; for (let z = FONT_SIZE[base] - 1; z >= min; z--) { k = sized(base, z); if (g.textW(str, k) <= room) return k; } return k; };
const FONT_SIZE = { body: 11, bold: 11 };

const ON = { fill: '#3a2a18', fill2: '#4a3420', frame: '#f0be7d', frameHi: '#ffe8c8', frameLo: '#a8743a' }, NUM = ['#f0be7d', '#7cf0a0', '#7cf0a0'];
export function openTeamPick(app, team, onOk) {
  const have = new Set(app.state.plants.map(p => p.uid));
  app.teampick = { sel: (team || []).filter(u => have.has(u)).slice(0, 3), sy: 0, maxY: 0, onOk, lift: null };   // lift = 들어 올린 위 칸(자리 바꾸기)
}
export const teamPickDrag = app => ({ onDrag(dy) { const D = app.teampick; if (D) D.sy = Math.max(0, Math.min(D.maxY || 0, (D.sy || 0) - dy)); } });

export function teamPickScreen(app, D) {
  const { g, W, H, input, state: s } = app, P = T.ptext, byUid = u => s.plants.find(p => p.uid === u);
  D.sel = D.sel.filter(byUid);
  g.c.fillStyle = 'rgba(4,7,14,0.82)'; g.c.fillRect(0, 0, W, H);
  input.hit('tk_block', 0, 0, W, H, () => {});
  const x = 10, w = W - 20, y = 14, h = H - 28;
  holo(g, x, y, w, h, T.card || T.panel, 16);
  g.text('3:3 팀', x + 12, y + 10, { font: 'head', color: P.main });
  g.text(`${D.sel.length}/3`, x + w - 12, y + 13, { font: 'label', color: D.sel.length === 3 ? '#ffe8c8' : P.sub, align: 'right' });
  // 고른 셋(2026-10-22 사용자 "3:3 전투의 경우 애들 배치하는 ui 좀 다듬기"): 1 = 먼저 나감(금빛 · '선봉' 띠) · 칸을 누르면 들어 올림 → 다른 칸을 누르면 자리 바꿈(같은 칸 = 내려놓음) ·
  //  오른쪽 위 × = 팀에서 뺌 · 얼굴 칸 = 속성 색 바탕 + 이름 · 속성 · 단계 Lv
  const sw = Math.floor((w - 16 - 12) / 3), sy0 = y + 32, shh = 92, t = app.t;
  if (D.lift != null && !D.sel[D.lift]) D.lift = null;
  for (let k = 0; k < 3; k++) {
    const sx = x + 8 + k * (sw + 6), p = byUid(D.sel[k]), id = 'tk_s' + k, pr = p && input.isPressed(id), up = D.lift === k, yy = sy0 + (pr ? 1 : 0) - (up ? 3 : 0);
    holo(g, sx, yy, sw, shh, p && k === 0 ? ON : T.deep, 16);
    if (D.lift != null && !up) g.alpha(0.35 + 0.3 * Math.sin(t / 160), () => ring(g, sx - 1, yy - 1, sw + 2, shh + 2, '#ffd890'));   // 놓을 수 있는 칸
    if (up) ring(g, sx - 2, yy - 2, sw + 4, shh + 4, '#ffd890');
    if (p) {
      const sp = SPECIES[p.key], ec = (ELEMENT[sp && sp.el] || {}).main || '#3a5a7a', ps = 48, px = sx + Math.floor((sw - ps) / 2), py = yy + 17;
      g.rect(px, py, ps, ps, hexMix(ec, '#0a1c32', 0.72)); g.rect(px, py + ps - 10, ps, 10, hexMix(ec, '#0a1c32', 0.55));   // 속성 색 바탕(아래 띠 = 바닥)
      g.clip(px, py, ps, ps, () => drawPortrait(g, bigKey(p.key, stageKey(p)), px, py, ps, false, 80));   // 아래 목록과 같은 틀(식물 전체가 보이게)
      const fk = fitFont(g, p.name, 'bold', sw - 8, 8);
      g.text(p.name, sx + sw / 2, yy + 68 + Math.round((glyphH('bold') - glyphH(fk)) / 2), { font: fk, color: p.shiny ? '#ffe8a8' : P.main, align: 'center' });
      const lv = `Lv${lvOf(p)}`, ic = sp && icon(sp.el), lw = g.textW(lv, 'label') + (ic ? 12 : 0), lx = Math.round(sx + (sw - lw) / 2);
      if (ic) g.img(ic, lx, yy + 81); g.text(lv, lx + (ic ? 12 : 0), yy + 80, { font: 'label', color: P.sub });
      input.hit(id, sx, sy0 - 3, sw, shh + 3, () => {
        if (D.lift == null) D.lift = k; else if (D.lift === k) D.lift = null; else { [D.sel[D.lift], D.sel[k]] = [D.sel[k], D.sel[D.lift]]; D.lift = null; }
        sfx('select');
      });
      const xb = sx + sw - 16, yb = yy + 3, xid = 'tk_x' + k;   // 빼기
      g.disc(xb + 6, yb + 6, 7, '#05070b'); g.disc(xb + 6, yb + 6, 6, input.isPressed(xid) ? '#8a3a3a' : '#5a2a30');
      g.text('×', xb + 6.5, yb - 1, { font: 'bold', color: '#ffd0d0', align: 'center' });
      input.hit(xid, xb - 3, yb - 3, 18, 18, () => { D.sel.splice(k, 1); D.lift = null; sfx('select'); }, 4);
    } else {
      g.alpha(D.lift != null ? 1 : 0.6 + 0.4 * Math.sin(t / 300), () => g.text('+', sx + sw / 2, yy + 34, { font: 'name', color: '#3a5a7a', align: 'center' }));
      if (D.lift != null) input.hit(id, sx, sy0, sw, shh, () => { D.sel.push(D.sel.splice(D.lift, 1)[0]); D.lift = null; sfx('select'); });   // 빈 칸 = 맨 뒤로
    }
    g.rect(sx + 3, yy + 3, 14, 14, '#05070b'); g.rect(sx + 4, yy + 4, 12, 12, p ? NUM[k] : '#2a3a4e');
    g.text(String(k + 1), sx + 10, yy + 4, { font: 'bold', color: p ? '#05070b' : '#6a7a90', align: 'center' });
    if (k === 0) g.text('선봉', sx + 20, yy + 4, { font: 'label', color: p ? '#ffe8c8' : '#6a7a90' });   // 먼저 나가는 식물(나머지는 쓰러지면 골라서)
  }
  // 내 식물(즐겨찾기 먼저) — 칸 밖으로 넘치면 끌어 넘김
  const ord = s.plants.map((p, i) => i).sort((a, b) => (s.plants[b].fav ? 1 : 0) - (s.plants[a].fav ? 1 : 0) || a - b);
  const gx = x + 8, gy = sy0 + shh + 10, gw = w - 16, gh = y + h - 48 - gy, cols = 2, gap = 6, cw = Math.floor((gw - gap) / cols), chh = 50;
  const rows = Math.ceil(ord.length / cols), full = rows * (chh + gap) - gap;
  D.maxY = Math.max(0, full - gh); D.sy = Math.min(D.sy || 0, D.maxY);
  g.clip(gx - 2, gy, gw + 4, gh, () => ord.forEach((pi, i) => {
    const q = s.plants[pi], k = D.sel.indexOf(q.uid), cx = gx + (i % cols) * (cw + gap), cy0 = gy + Math.floor(i / cols) * (chh + gap) - D.sy;
    if (cy0 + chh < gy || cy0 > gy + gh) return;
    const id = 'tk_' + q.uid, pr = input.isPressed(id), cy = cy0 + (pr ? 1 : 0);
    holo(g, cx, cy, cw, chh, k >= 0 ? ON : T.deep, 16);
    g.rect(cx + 5, cy + 5, 40, 40, '#0a1c32');
    g.clip(cx + 5, cy + 5, 40, 40, () => drawPortrait(g, bigKey(q.key, stageKey(q)), cx + 5, cy + 5, 40, false));
    const nx = cx + 50, room = cw - 50 - 20;
    const fk = fitFont(g, q.name, 'bold', room, 8);   // 긴 이름 = 글자를 줄여 다 넣음(서랍 이름표와 같이 — 8칸에도 넘치면 끝을 줄임)
    let nm = q.name; while (nm.length > 1 && g.textW(nm + '…', fk) > room && g.textW(q.name, fk) > room) nm = nm.slice(0, -1);
    g.text(nm === q.name ? nm : nm + '…', nx, cy + 7 + Math.round((glyphH('bold') - glyphH(fk)) / 2), { font: fk, color: q.shiny ? '#ffe8a8' : P.main });
    miniStars(g, nx, cy + 25, stars(q));
    g.text(`${stageName(q)} Lv${lvOf(q)}`, nx, cy + 34, { font: 'label', color: P.sub });
    if (k >= 0) { g.rect(cx + cw - 19, cy + 4, 15, 15, '#05070b'); g.rect(cx + cw - 18, cy + 5, 13, 13, NUM[k]); g.text(String(k + 1), cx + cw - 11.5, cy + 5, { font: 'bold', color: '#05070b', align: 'center' }); }
    else { const ic = SPECIES[q.key] && icon(SPECIES[q.key].el); if (ic) g.img(ic, cx + cw - 16, cy + 6); }
    const top = Math.max(gy, cy0), bot = Math.min(gy + gh, cy0 + chh);   // 보이는 부분만 누를 수 있게
    if (bot - top > 8) input.hit(id, cx, top, cw, bot - top, () => {
      if (D.lift != null && k < 0) { D.sel[D.lift] = q.uid; D.lift = null; sfx('select'); return; }   // 들어 올린 칸에 이 식물(바꿔 넣기)
      if (k >= 0) D.sel.splice(k, 1); else if (D.sel.length < 3) D.sel.push(q.uid); else return app.toast('셋까지 골라요 — 위 칸을 누르고 바꿀 식물을 눌러요');
      D.lift = null; sfx('select');
    });
  }));
  if (D.maxY > 0) { const bh = Math.max(16, Math.round(gh * gh / full)), by = gy + Math.round((gh - bh) * D.sy / D.maxY); g.rect(x + w - 5, by, 2, bh, '#8ccfff'); }   // 넘김 막대
  const bw = Math.floor((w - 16 - 8) / 2), by = y + h - 40;
  button(app, 'tk_close', x + 8, by, bw, 30, '닫기', { style: 'night', font: 'bold', onTap: () => { app.teampick = null; } });
  button(app, 'tk_ok', x + 8 + bw + 8, by, bw, 30, '이 팀으로', { style: 'gold', font: 'bold', disabled: D.sel.length !== 3, onTap: () => { const u = [...D.sel], f = D.onOk; app.teampick = null; if (f) f(u); } });
}
