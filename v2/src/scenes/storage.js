import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { smallCanvas, smallReady } from '../art/sprites.js';
import { T, holo, btnBody } from '../art/theme.js';
import { miniStars } from './common.js';
import { STORE_MAX } from '../game/catalog.js';
import { freeSlots } from '../game/logic.js';
import { stageName, stars, lvOf } from '../game/view.js';
import { eul } from '../core/josa.js';
import { sellAsk, cutAsk } from './popups.js';

// 동면 보관고(2026-10-15 사용자 "스마트팜에 들어가는 수는 한계가 있지만, 그냥 심고 동면 보관의 느낌으로 보관해 둘 수 있는 양은 100개 정도 이상으로.
//  디자인은 동면 캡슐 느낌으로, 쭉 있고, 어두운 방 느낌에 캡슐 내부만 은은하게 빛나는 느낌으로"):
//  어두운 방 · 선반 위 캡슐이 네 줄로 쭉(120칸) · 캡슐 속 아래에서 올라오는 푸른 빛이 저마다 다른 박자로 숨 쉬듯 밝아졌다 어두워짐 ·
//  안의 식물은 차갑게 물든 채 잠들어 있고 서리 알갱이가 천천히 떠오름 · 빈 캡슐은 꺼진 유리. 위아래로 끌어 넘김(관성).
const COLS = 4, CW = 54, PH = 78, ROW = 104, TOP = 66, BOT0 = 468, X0 = 12, GAP = 10;   // 캡슐 목록은 TOP ~ BOT 사이
// 짧은 화면(480~599): 목록 아래 끝 · 아래 판을 같이 올림(아래 판이 탭 줄에 가리지 않게)
const botOf = app => BOT0 + Math.min(0, ((app && app.H) || 600) - 600);
const GLOW = ['#0b1e2a', '#0f2d3c', '#15404f', '#1d5868', '#287486', '#3a92a4', '#5ab4c4'];   // 캡슐 속 빛(어두움 → 밝음)
const SORTS = [['in', '보관 순'], ['star', '별 순'], ['name', '이름 순']];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// 잠든 식물 그림(종마다 한 번): 화분 + 식물 → 차가운 푸른빛으로 물들이고 조금 어둡게
const coldCache = new Map();
function coldPlant(key, pot) {
  const id = key + '|' + pot; let cv = coldCache.get(id); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = 48; cv.height = 56;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(smallCanvas(key, pot), 0, 0);
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(70,170,210,0.42)'; c.fillRect(0, 0, 48, 56);
  c.fillStyle = 'rgba(4,12,24,0.28)'; c.fillRect(0, 0, 48, 56);
  if (smallReady(key)) coldCache.set(id, cv); return cv;
}

export const storage = {
  theme: 'loft',
  enter() { this.scroll = 0; this.vel = 0; this.dragging = false; this.sel = null; this.sortI = this.sortI || 0; this.lastT = null; },
  list(s) {
    const it = (s.storage || []).map((p, i) => ({ p, i }));
    const mode = SORTS[this.sortI][0];
    if (mode === 'star') it.sort((a, b) => stars(b.p) - stars(a.p) || a.i - b.i);
    if (mode === 'name') it.sort((a, b) => a.p.name.localeCompare(b.p.name, 'ko'));
    return it;
  },
  maxScroll(s) { const rows = Math.ceil(STORE_MAX / COLS); return Math.max(0, rows * ROW - (botOf(this.app) - TOP)); },
  onDrag(dy, dx, ev) { if (ev.y0 < TOP - 10 || ev.y0 > botOf(this.app)) return; this.dragging = true; this.vel = 0; const mx = this.maxScroll(this.app.state), out = this.scroll < 0 || this.scroll > mx; this.scroll -= dy * (out ? 0.35 : 1); },
  onRelease(ev) { if (!this.dragging) return; this.dragging = false; this.vel = clamp(-ev.vy, -2400, 2400); },

  draw(app) {
    this.app = app;
    const { g, W, H, t, state: s } = app;
    const dt = this.lastT == null ? 0 : clamp((t - this.lastT) / 1000, 0, 0.05); this.lastT = t;   // 시간이 거꾸로 가도(촬영 도구 등) 0
    const mx = this.maxScroll(s);
    if (!this.dragging) {
      if (Math.abs(this.vel) > 8) { this.scroll += this.vel * dt; this.vel *= Math.exp(-dt / 0.35); } else this.vel = 0;
      if (this.scroll < 0 || this.scroll > mx) { const tg = clamp(this.scroll, 0, mx); this.scroll += (tg - this.scroll) * (1 - Math.exp(-dt / 0.08)); this.vel *= 0.8; }
    }
    // 어두운 방(위 → 아래 아주 옅게 밝아짐)
    g.vgrad(0, 0, W, H, ['#04060a', '#060912', '#080c16']);
    const list = this.list(s), total = STORE_MAX, sc = Math.round(this.scroll);
    const BOT = botOf(app);
    g.clip(0, TOP - 6, W, BOT - TOP + 6, () => {
      const r0 = Math.max(0, Math.floor((sc - 20) / ROW)), r1 = Math.min(Math.ceil(total / COLS) - 1, Math.floor((sc + BOT) / ROW));
      for (let r = r0; r <= r1; r++) {
        const y = TOP + r * ROW - sc;
        // 선반(캡슐이 선 금속 띠) + 캡슐 빛이 선반에 은은하게 비침
        g.rect(0, y + PH + 1, W, 3, '#0e131c'); g.rect(0, y + PH + 1, W, 1, '#1a2230');
        for (let c = 0; c < COLS; c++) {
          const idx = r * COLS + c; if (idx >= total) break;
          this.capsule(app, X0 + c * (CW + GAP), y, list[idx], idx);
        }
      }
    });
    this.ui(app, list, total);
  },
  // 캡슐 하나: 둥근 머리 금속 틀 · 유리 속 빛(아래가 밝음, 숨 쉬듯) · 잠든 식물 · 서리 알갱이 · 받침(불빛·번호) · 이름
  capsule(app, x, y, item, idx) {
    const { g, t } = app, on = !!item, sel = on && this.sel === item.p.uid;
    const ph = (idx * 0.618) % 1, br = on ? 0.5 + 0.5 * Math.sin(t / 2600 * 6.283 + ph * 6.283) : 0;   // 숨 박자(캡슐마다 엇갈림)
    // 틀: 바깥 어두운 금속 + 왼쪽 빛 받는 테
    const frame = sel ? '#8ccfff' : '#2a3242', fr2 = sel ? '#e6f3ff' : '#3e485a';
    for (let j = 0; j < PH; j++) { const ins = j < 8 ? Math.ceil(8 - Math.sqrt(64 - (8 - j - 0.5) ** 2)) : 0; g.rect(x + ins, y + j, CW - ins * 2, 1, j === 0 ? frame : '#161b25'); g.px(x + ins, y + j, frame); g.px(x + CW - 1 - ins, y + j, '#10141c'); if (j > 6) g.px(x + ins + 1, y + j, fr2); }
    // 유리 속(안쪽 4칸): 아래에서 올라오는 빛 — 띠 사이를 디더로
    const gx = x + 5, gy = y + 6, gw = CW - 10, gh = PH - 22;
    for (let j = 0; j < gh; j++) {
      const ins = j < 7 ? Math.ceil(7 - Math.sqrt(49 - (7 - j - 0.5) ** 2)) : 0;
      if (!on) { g.rect(gx + ins, gy + j, gw - ins * 2, 1, j % 9 === 4 ? '#0d121a' : '#080b11'); continue; }
      const v = (j / gh) * 3.4 + br * 1.1 - 0.9, base = Math.floor(v), f = v - base;   // 은은하게: 위는 거의 어둡고 아래 받침 쪽만 밝음
      for (let i = ins; i < gw - ins; i++) { const X = gx + i, Y = gy + j, k = clamp(f > (B4[Y & 3][X & 3] + 0.5) / 16 ? base + 1 : base, 0, GLOW.length - 1); g.px(X, Y, GLOW[k]); }
    }
    if (on) {
      const cv = coldPlant(item.p.key + (item.p.shiny ? '~s' : ''), item.p.pot || 'pot_terra');
      g.c.imageSmoothingEnabled = false; g.c.drawImage(cv, 0, 0, 48, 56, gx + Math.floor((gw - 48) / 2), gy + gh - 52, 48, 56);
      // 서리 알갱이: 아래에서 천천히 떠올라 위에서 사라짐
      for (let k = 0; k < 4; k++) { const s2 = (idx * 7 + k * 13) % 23, per = 3600 + s2 * 120, a = ((t + s2 * 397) % per) / per, px2 = gx + 3 + ((s2 * 5 + k * 9) % (gw - 6)), py2 = Math.round(gy + gh - 4 - a * (gh - 8)); if (py2 > gy + 2) g.px(px2, py2, a < 0.75 ? '#bff4ff' : '#5ab4c4'); }
    }
    // 유리 반사(왼쪽 세로 줄 · 위 둥근 머리 빛)
    g.rect(gx + 2, gy + 9, 1, gh - 16, on ? 'rgba(200,245,255,0.35)' : 'rgba(150,180,210,0.12)');
    g.rect(gx + 6, gy + 2, Math.max(1, gw - 16), 1, on ? 'rgba(220,250,255,0.4)' : 'rgba(150,180,210,0.12)');
    // 받침: 금속 띠 + 불빛 + 번호
    const by = y + PH - 15;
    g.rect(x + 2, by, CW - 4, 13, '#1c222e'); g.rect(x + 2, by, CW - 4, 1, '#3a4458'); g.rect(x + 2, by + 12, CW - 4, 1, '#0b0e14');
    g.rect(x + 6, by + 5, 3, 3, on ? (br > 0.5 ? '#7fe8ff' : '#4a8edc') : '#2a3240');
    g.text(String(idx + 1).padStart(3, '0'), x + CW - 6, by + 1, { color: on ? '#8eaed2' : '#3a4458', align: 'right' });
    // 바닥에 비친 캡슐 빛
    if (on) { g.c.fillStyle = `rgba(90,200,230,${(0.07 + br * 0.06).toFixed(3)})`; g.c.fillRect(x + 8, y + PH + 1, CW - 16, 2); }
    // 이름
    if (on) { let nm = item.p.name; while (g.textW(nm) > CW + 6 && nm.length > 2) nm = nm.slice(0, -1); g.text(nm, x + CW / 2, y + PH + 6, { color: sel ? '#e6f3ff' : '#a8bcd2', align: 'center' }); }
    app.input.hit('cap_' + idx, x, y, CW, PH + 18, () => { if (on) this.sel = item.p.uid; else this.sel = null; });
  },
  ui(app, list, total) {
    const { g, W, H, state: s } = app, P = T.ptext, st = T.card || T.panel;
    hud(app, s);
    // 뒤로(양육) · 제목 · 정렬
    const bid = 'sto_back', bpr = app.input.isPressed(bid);
    btnBody(g, 8, 32, 46, 19, T.btn.second, bpr);
    g.text('‹ 양육', 31, 35 + (bpr ? 1 : 0), { color: T.btn.second.text, align: 'center' });
    app.input.hit(bid, 8, 32, 46, 19, () => app.go('nursery'), 3);
    g.text('동면 보관고', 62, 33, { font: 'head', color: '#eef7ff' });
    const cnt = `${(s.storage || []).length}/${total}`;
    g.text(cnt, 62 + g.textW('동면 보관고', 'head') + 6, 36, { color: '#8eaed2' });
    this.capX = 62 + g.textW('동면 보관고', 'head') + 6 + g.textW(cnt) + 5;   // 처음 안내 '?' 자리
    const sid = 'sto_sort', spr = app.input.isPressed(sid);
    btnBody(g, W - 74, 32, 66, 19, T.btn.second, spr);
    g.text('정렬 · ' + SORTS[this.sortI][1], W - 41, 35 + (spr ? 1 : 0), { color: T.btn.second.text, align: 'center' });
    app.input.hit(sid, W - 74, 32, 66, 19, () => { this.sortI = (this.sortI + 1) % SORTS.length; }, 3);
    // 고른 캡슐 정보
    const it = list.find(x => x.p.uid === this.sel), PY = botOf(app) + 8;
    if (it) {
      // 고른 캡슐 판(없으면 판 없음 — 설명 글은 ? 안내로): 위 = 이름 · 별 / 단계 · 동면 날, 아래 = 같은 폭 단추 셋(깨우기 · 팔기 · 해체)
      holo(g, 10, PY, W - 20, 72, st, 13);
      const p = it.p, days = p.slept ? Math.max(1, Math.ceil((app.now() - p.slept) / 864e5)) : 0, room = freeSlots(s) > 0;
      g.text(p.name, 20, PY + 7, { font: 'bold', color: p.shiny ? '#ffe8a8' : P.main });
      miniStars(g, 25 + g.textW(p.name, 'bold'), PY + 9, stars(p));
      g.text(`${stageName(p)} Lv${lvOf(p)}` + (days ? ` · 동면 ${days}일째` : ''), 20, PY + 24, { color: P.sub });
      if (!room) g.text('스마트팜 자리가 없어요', W - 20, PY + 8, { color: '#ffb0a0', align: 'right' });
      const bw = Math.floor((W - 40 - 8) / 3), by = PY + 42, bx = i => (i === 2 ? W - 20 - bw : 20 + i * (bw + 4));
      button(app, 'sto_wake', bx(0), by, bw, 24, '깨우기', { style: 'teal', icon: 'sun', disabled: !room, onTap: () => app.act('fromStorage', { id: p.uid }).then(r => { if (r) { this.sel = null; app.toast(`${eul(p.name)} 스마트팜으로 깨웠어요`); } }) });
      button(app, 'sto_sell', bx(1), by, bw, 24, '팔기', { style: 'night', icon: 'coin', onTap: () => sellAsk(app, p, () => { this.sel = null; }) });
      button(app, 'sto_cut', bx(2), by, bw, 24, '해체', { style: 'night', icon: 'vine', onTap: () => cutAsk(app, p, () => { this.sel = null; }) });
    }
    navBar(app, 'nursery');
  },
};
