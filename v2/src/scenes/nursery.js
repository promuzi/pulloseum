import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { BGIMG, BGMETA, drawBigPlanted, drawBigPotted } from '../art/sprites.js';
import { T, holo, tbar, btnBody } from '../art/theme.js';
import { plainBg } from '../art/bg.js';
import { STAGE_NAME, SPECIES } from '../data/mock.js';
import { gradeBadge } from './common.js';

// 양육 = 스마트팜 2판(2026-10-15 사용자):
//  "계단식으로 만들면 멀리 있는 게 안 보여 — 위아래 드래그하면 멀리 있는 게 앞으로 말려오는 느낌",
//  "세라믹 서랍은 한 화분당 개인용으로 붙어 있어 자유롭게 움직이는 느낌, 배열은 2열 혹은 3열(설정으로 바꿈)",
//  "드래그하면 서랍처럼 차라락, 정렬을 누르면 서랍이 정렬에 맞게 배치되는 연출", 꺼내는 구멍은 "어두운 기계 느낌", 화분 잔디 = 바닥 잔디.
// → 어두운 기계 계단(에스컬레이터처럼 디딤판이 비탈을 오르내림) 위에 화분마다 흰 세라믹 상자 하나(윗면 잔디에 식물이 심김).
//   끌면 계단이 굴러 뒷줄이 앞으로 오고 앞줄은 앞 턱 아래로 말려 들어감. 상자는 저마다 용수철로 반 박자씩 늦게 따라와 차라락.
//   정렬·열 바꾸기 = 상자가 하나씩 들려 새 자리로 건너감. 고르면 잔디 마개를 인 화분이 기계 구멍(금속 테·피스톤)에서 솟음.
//   방 그림·시점 = tools/pixel/big/farm_lift_bg.mjs → assets/v2/bg/nursery_lift.png + .json(같은 원근으로 매 장면 그림)
const LIFT = 36, LIFT_MS = 480, PITCH = 110;                       // 솟는 높이(칸, 화분 밑 피스톤이 보이게) · 시간 · 끌기 한 줄 = 110칸
const BOX = { 2: { w: 5.2, gap: 6.4 }, 3: { w: 3.7, gap: 4.25 } };  // 상자 가로·열 간격(세계 단위)
const BD = 2.7, BH = 0.95;                                          // 상자 깊이 · 높이
const GR = ['#10261a', '#183a22', '#21502b', '#2c6834', '#3a823e', '#4c9a48', '#62b254', '#86cc66', '#a8e084'];   // 잔디 한 벌(상자 윗면 · 심은 자리 덤불 · 화분 마개)
const CER = { ink: '#252d3c', lo: '#8f99ad', mid: '#d6dce5', hi: '#eef2f6', top: '#fbfcfd', side: '#aeb8c8', lid: '#bcc5d2', lidLo: '#9aa4b6' };
const MET = { tread: '#222a36', groove: '#191f29', noseHi: '#8794aa', riser: '#12171f', cleat: '#1b212b', led: '#2a6f94' };
const SORTS = [['plant', '심은 순'], ['grade', '등급 순'], ['fruit', '열매 순'], ['name', '이름 순']];
const GORDER = { S: 0, A: 1, B: 2, C: 3, D: 4 };
const ease = k => 1 - (1 - k) ** 3;
const ease2 = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hsh = (a, b, c) => { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// 잔디 한 줄(왼쪽 x0 ~ 오른쪽 x1, 위 → 아래 k 0~1): 앞쪽일수록 밝고, 상자 자리에 붙은 풀잎 점(움직여도 무늬가 상자를 따라감)
function grassRow(g, x0, x1, y, k, seed, ox, oy) {
  if (x1 < x0) return;
  g.rect(x0, y, x1 - x0 + 1, 1, k > 0.7 ? GR[6] : k > 0.3 ? GR[5] : GR[4]);
  for (let x = x0; x <= x1; x++) { const v = hsh(seed, x - ox, y - oy); if (v > 0.88) g.px(x, y, v > 0.975 ? GR[8] : GR[7]); else if (v < 0.035) g.px(x, y, GR[3]); }   // 풀잎 점은 드문드문(빽빽하면 자글자글)
}
// 타원 잔디(덤불·화분 마개): 같은 색 한 벌·같은 풀잎 점
function grassOval(g, cx, cy, rx, ry, seed) {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.5);
    grassRow(g, cx - half, cx + half, cy + dy, (dy + ry) / (2 * ry || 1), seed, cx, cy);
  }
  for (let i = -rx + 1; i < rx; i += 2) if (hsh(seed, i, 7) > 0.35) g.rect(cx + i, cy - ry - 1 - (hsh(seed, i, 9) > 0.6 ? 1 : 0), 1, 2, GR[7]);   // 위로 삐죽 풀잎
}

export const nursery = {
  theme: 'loft',
  enter(p = {}) { this.scroll = 0; this.vel = 0; this.dragging = false; this.sel = null; this.selT = -1e9; this.mods = new Map(); this.lastT = null; this.cols = +p.cols || this.cols || 2; this.sortI = this.sortI || 0; this.order = null; },   // ?cols=3 = 3열로 열기(검토용)
  // 칸 목록: 식물 + 빈 자리 + 잠긴 자리(정렬은 식물만, 빈 자리·잠긴 자리는 뒤)
  items(s) {
    const it = s.plants.map((p, i) => ({ kind: 'plant', p, i, id: 'p' + p.id, seed: p.id * 31 + 7 }));
    for (let i = s.plants.length; i < s.slots; i++) it.push({ kind: 'empty', id: 'e' + i, seed: i * 17 + 3 });
    for (let i = s.slots; i < s.slotsMax; i++) it.push({ kind: 'lock', id: 'l' + i, lv: 4 + (i - s.slots) * 3, seed: i * 13 });
    return it;
  },
  sorted(s) {
    const it = this.items(s), mode = SORTS[this.sortI][0];
    const plants = it.filter(x => x.kind === 'plant'), rest = it.filter(x => x.kind !== 'plant');
    const fr = x => (x.p.fruit ? x.p.fruit.have / x.p.fruit.max : 0);
    if (mode === 'grade') plants.sort((a, b) => GORDER[a.p.grade] - GORDER[b.p.grade] || a.i - b.i);
    if (mode === 'fruit') plants.sort((a, b) => fr(b) - fr(a) || a.i - b.i);
    if (mode === 'name') plants.sort((a, b) => a.p.name.localeCompare(b.p.name, 'ko'));
    return [...plants, ...rest];
  },
  // 정렬·열 바꾸기: 상자마다 지금 자리 → 새 자리로 하나씩 들려 건너감
  relayout(app, fn) {
    const t = app.t, was = new Map();
    for (const [id, m] of this.mods) was.set(id, { X: m.X, u: m.u });
    fn();   // 열 수·정렬 바꿈(굴림 위치도 바뀔 수 있음 → 출발점은 바꾼 뒤 기준으로 잡아 순간이동 없게)
    const order = this.sorted(app.state);
    order.forEach((it, i) => { const m = this.mods.get(it.id), o = was.get(it.id); if (m && o) m.tw = { X0: o.X, r0: o.u + this.scroll, t0: t + i * 38, dur: 560 }; });
    this.order = order;
  },
  maxScroll(s) { const n = this.items(s).length; return Math.max(0, Math.ceil(n / this.cols) - 1); },
  onDrag(dy, dx, ev) {
    const M = BGMETA.nursery_lift; if (!M || ev.y0 < M.clip.top - 20 || ev.y0 > M.clip.bottom + 6) return;
    this.dragging = true; this.vel = 0;
    const mx = this.maxScroll(this.app.state), out = this.scroll < 0 || this.scroll > mx;
    this.scroll += dy / PITCH * (out ? 0.35 : 1);   // 아래로 끌면 뒷줄이 앞으로(끝에선 고무줄처럼)
  },
  onRelease(ev) { if (!this.dragging) return; this.dragging = false; this.vel = clamp(ev.vy / PITCH, -14, 14); },

  draw(app) {
    this.app = app;
    const { g, W, H, t, state: s } = app;
    const M = BGMETA.nursery_lift, bg = BGIMG.nursery_lift;
    if (bg) g.img(bg, 0, 0); else plainBg(g, W, H, t);
    if (!M) { hud(app, s); navBar(app, 'nursery'); return; }
    const dt = this.lastT == null ? 0 : clamp((t - this.lastT) / 1000, 0, 0.05); this.lastT = t;   // 시간이 거꾸로 가도(촬영 도구 등) 0
    const C = this.cols, mx = this.maxScroll(s);
    if (!Number.isFinite(this.scroll)) { this.scroll = 0; this.vel = 0; }   // 안전장치(굴림 값이 망가지면 처음으로)
    if (!this.order) this.order = this.sorted(s);
    if (this.sel == null) { const f = this.order.find(x => x.kind === 'plant'); if (f) this.sel = f.id; }   // 처음엔 맨 앞 식물이 이미 솟아 있음
    // 영상·검토용 자동 끌기(sc.auto = { t0, dur, v 줄/초 }) — 손가락으로 끄는 것과 같게 굴린 뒤 그 속도로 놓음
    if (this.auto) { const a = this.auto; if (t < a.t0 + a.dur) { this.dragging = true; this.scroll += a.v * dt; } else { this.dragging = false; this.vel = a.v; this.auto = null; } }
    // 굴림: 관성 → 가까운 줄에 딱 맞춤, 끝을 넘으면 되돌아옴
    if (!this.dragging) {
      if (Math.abs(this.vel) > 0.35) { this.scroll += this.vel * dt; this.vel *= Math.exp(-dt / 0.3); }
      else { this.vel = 0; const tg = Math.round(clamp(this.scroll, 0, mx)); this.scroll += (tg - this.scroll) * (1 - Math.exp(-dt / 0.09)); }
      if (this.scroll < -0.001 || this.scroll > mx + 0.001) { const tg = clamp(this.scroll, 0, mx); this.scroll += (tg - this.scroll) * (1 - Math.exp(-dt / 0.07)); this.vel *= 0.85; }
    }
    const cam = M.cam, st = M.step, TW = st.tw;
    const P = (X, Y, Z) => { const zz = Z - cam.CZ; return [cam.CX + cam.F * X / zz, cam.CY - cam.F * (Y - cam.E) / zz]; };
    const zAt = u => st.z0 + u * st.dz, yAt = u => st.y0 + u * st.dy;
    // 상자 자리(용수철로 따라감 — 열이 오른쪽일수록 조금 늦게, 살짝 넘쳤다 돌아옴)
    const list = this.order.map((it, i) => {
      const col = i % C, row = Math.floor(i / C), Xt = (col - (C - 1) / 2) * BOX[C].gap, ut = row - this.scroll;
      let m = this.mods.get(it.id); if (!m) { m = { X: Xt, u: ut, vu: 0, tw: null }; this.mods.set(it.id, m); }
      let hop = 0;
      if (m.tw) {
        const k = clamp((t - m.tw.t0) / m.tw.dur, 0, 1), e = ease2(k);
        m.X = m.tw.X0 + (Xt - m.tw.X0) * e; m.u = m.tw.r0 + (row - m.tw.r0) * e - this.scroll; hop = Math.sin(Math.PI * k) * 1.25;
        if (k >= 1) { m.tw = null; m.vu = 0; }
      } else if (dt > 0) {
        const w = 2 * Math.PI * (2.7 - col * 0.5), z = 0.6;
        m.vu += (w * w * (ut - m.u) - 2 * z * w * m.vu) * dt; m.u += m.vu * dt; m.X = Xt;
      } else { m.u = ut; m.X = Xt; }
      return { it, m, hop };
    });
    // 그리기: 계단과 상자를 깊이 순(먼 것 먼저)
    const draws = [];
    for (let k = Math.floor(this.scroll) - 2; k <= Math.floor(this.scroll) + 4; k++) draws.push({ d: k - this.scroll + 0.001, step: true });
    for (const L of list) if (L.m.u > -1.6 && L.m.u < 3.6) draws.push({ d: L.m.u, L });
    draws.sort((a, b) => b.d - a.d || (a.step ? -1 : 1) || Math.abs(b.L ? b.L.m.X : 0) - Math.abs(a.L ? a.L.m.X : 0));
    const hits = [];
    g.clip(0, M.clip.top, W, M.clip.bottom - M.clip.top, () => {
      for (const d of draws) {
        if (d.step) { this.step(g, P, zAt, yAt, st, TW, d.d); continue; }
        const r = this.box(app, P, zAt, yAt, d.L, C);
        if (r) hits.push(r);
      }
    });
    for (const h of hits) app.input.hit(h.id, h.x, h.y, h.w, h.h, h.fn);   // 앞 상자가 나중(위)
    this.ui(app);
  },

  // 계단 한 칸: 디딤판(가로 홈) + 앞 모서리(밝은 금속) + 챌면(세로 골 + 숨은 빛줄)
  step(g, P, zAt, yAt, st, TW, u) {
    const zc = zAt(u), yt = yAt(u), zf = zc - st.dz / 2, zb = zc + st.dz / 2;
    const [xl0, yF] = P(-TW, yt, zf), [xr0] = P(TW, yt, zf), [xl1, yB] = P(-TW, yt, zb), [xr1] = P(TW, yt, zb), [, yR] = P(0, yt - st.dy, zf);
    g.poly([[xl1, yB], [xr1, yB], [xr0, yF], [xl0, yF]], MET.tread);
    let py = yB;
    for (let j = 1; j < 10; j++) { const z = zb - j * st.dz / 10, [a, y] = P(-TW, yt, z), [b] = P(TW, yt, z); if (y - py >= 2.6) { g.rect(Math.round(a) + 1, Math.round(y), Math.round(b - a) - 1, 1, MET.groove); py = y; } }
    const X0 = Math.round(xl0), X1 = Math.round(xr0), Y0 = Math.round(yF), Y1 = Math.round(yR);
    g.rect(X0, Y0 - 1, X1 - X0, 1, MET.noseHi);
    if (Y1 > Y0) {
      g.rect(X0, Y0, X1 - X0, Y1 - Y0, MET.riser);
      for (let x = -TW + 0.8; x < TW; x += 0.8) { const [cx] = P(x, yt, zf); g.rect(Math.round(cx), Y0 + 2, 1, Y1 - Y0 - 2, MET.cleat); }
      g.rect(X0 + 2, Y0 + 1, X1 - X0 - 4, 1, MET.led);
    }
  },

  // 세라믹 상자 하나(+ 식물). 반환 = 누를 자리
  box(app, P, zAt, yAt, L, C) {
    const { g, t } = app, { it, m, hop } = L, w = BOX[C].w, X = m.X, u = m.u;
    const zc = zAt(u), yb = yAt(u) + hop, zf = zc - BD / 2, zb = zc + BD / 2, ytop = yb + BH;
    const [fxl, fyt] = P(X - w / 2, ytop, zf), [fxr] = P(X + w / 2, ytop, zf), [, fyb] = P(X - w / 2, yb, zf);
    const [bxl, byt] = P(X - w / 2, ytop, zb), [bxr] = P(X + w / 2, ytop, zb), [bxl2, byb2] = P(X - w / 2, yb, zb), [bxr2] = P(X + w / 2, yb, zb);
    const Fx0 = Math.round(fxl), Fx1 = Math.round(fxr), Fy0 = Math.round(fyt), Fy1 = Math.round(fyb), By = Math.round(byt);
    // 옆면(가운데 쪽을 향한 면만 보임)
    if (X - w / 2 > 0.05) g.poly([[fxl, fyt], [bxl, byt], [bxl2, byb2], [fxl, fyb]], CER.side);
    if (X + w / 2 < -0.05) g.poly([[fxr, fyt], [bxr, byt], [bxr2, byb2], [fxr, fyb]], CER.side);
    // 앞면: 흰 세라믹(위 둥근 턱 밝게 · 아래 그늘 · 양옆 테)
    g.rect(Fx0, Fy0, Fx1 - Fx0, Fy1 - Fy0, CER.mid);
    g.rect(Fx0, Fy0, Fx1 - Fx0, 1, CER.top); g.rect(Fx0, Fy1 - 1, Fx1 - Fx0, 1, CER.lo);
    g.rect(Fx0, Fy0, 1, Fy1 - Fy0, CER.ink); g.rect(Fx1 - 1, Fy0, 1, Fy1 - Fy0, CER.ink); g.rect(Fx0, Fy1, Fx1 - Fx0, 1, CER.ink);
    // 윗면
    const rows = Math.max(1, Fy0 - By);
    for (let y = By; y < Fy0; y++) {
      const k = (y - By) / rows, xl = Math.round(bxl + (fxl - bxl) * k), xr = Math.round(bxr + (fxr - bxr) * k);
      if (it.kind === 'lock') { g.rect(xl, y, xr - xl, 1, k < 0.5 ? CER.lidLo : CER.lid); continue; }
      g.px(xl, y, CER.hi); g.px(xr - 1, y, CER.lo);
      if (y === By) { g.rect(xl, y, xr - xl, 1, CER.hi); continue; }
      grassRow(g, xl + 1, xr - 2, y, k, it.seed, Fx0, By);
    }
    g.rect(Math.round(bxl), By - 1, Math.round(bxr - bxl), 1, CER.ink);
    const sx = Math.round((fxl + fxr) / 2), sy = Math.round((By + Fy0) / 2), fh = Fy1 - Fy0;
    // 앞면 표시: 잠김 = 자물쇠, 식물 = 상태 불빛(열매 다 참 초록 · 자라는 중 주황), 빈 자리 = 꺼짐
    if (it.kind === 'lock') { const ic = icon('lockS'); if (ic && fh >= ic.height + 2) g.img(ic, sx - Math.floor(ic.width / 2), Fy0 + Math.floor((fh - ic.height) / 2)); return null; }
    const f = it.kind === 'plant' ? (it.p.fruit || { have: 0, max: 1 }) : null;
    const led = !f ? '#5a6478' : f.have >= f.max ? '#7cf0a0' : f.have > 0 ? '#ffd27a' : '#f0a050';
    g.rect(Fx1 - 5, Fy0 + Math.max(2, Math.floor(fh / 2) - 1), 2, 2, led);
    const isSel = this.sel === it.id;
    if (it.kind === 'plant') {
      const band = Math.max(2, Fy0 - By);
      if (isSel) this.lifted(g, it, sx, sy, band, Math.round(LIFT * ease(clamp((t - this.selT) / LIFT_MS, 0, 1))), t);
      else this.planted(g, it, sx, sy, band, t);
      if (f.have > 0 && !isSel) { const ic = icon('fruit'), by2 = sy - 86 + (Math.floor(t / 500 + it.i) % 2); g.img(ic, sx - Math.floor(ic.width / 2), by2); }
    } else if (isSel) { g.ellipseRing(sx, sy, Math.round((Fx1 - Fx0) * 0.3), Math.max(1, Math.round((Fy0 - By) * 0.3)), '#97e8f7', 0); }
    if (u < -0.4 || u > 2.7) return null;
    return { id: 'nur_' + it.id, x: Fx0, y: sy - 78, w: Fx1 - Fx0, h: Fy1 - sy + 80, fn: () => { if (this.sel !== it.id) { this.sel = it.id; this.selT = app.t; } } };
  },
  // 잔디에 심긴 식물(큰 판 그림 — 2026-10-15 "식물이 너무 멀어 좀 땡겨와줘", 숨쉬기·깜빡임 그대로): 흙 줄 위만, 밑동은 잔디 덤불이 덮음
  planted(g, it, sx, sy, band, t) {
    const ry = Math.max(2, Math.min(7, Math.round(band * 0.24)));
    if (!drawBigPlanted(g, it.p.key, sx, sy, { t, phase: it.i * 700, between: () => grassOval(g, sx, sy, 17, ry, it.seed) })) grassOval(g, sx, sy, 17, ry, it.seed);
  },
  // 고른 식물: 잔디 마개를 인 화분이 기계 구멍에서 솟음(구멍 = 금속 테 · 어두운 통로 속 고리 · 푸른 불빛, 화분 아래 피스톤과 받침)
  lifted(g, it, sx, sy, band, L, t) {
    const rx = 21, ry = Math.max(3, Math.min(9, Math.round(band * 0.3))), c = g.c;
    // 구멍(금속 테 → 안쪽 벽 → 깊은 바닥) + 안쪽 고리 두 겹 · 테 볼트 · 안쪽 푸른 불빛
    g.ellipse(sx, sy, rx + 2, ry + 1, '#4a5568');
    g.ellipse(sx, sy, rx + 1, ry + 1, '#7a879e');
    g.ellipse(sx, sy, rx, ry, '#2e3646');
    g.ellipse(sx, sy + 1, rx - 1, Math.max(1, ry - 1), '#141a24');
    g.ellipseRing(sx, sy + 1, rx - 3, Math.max(1, ry - 1), '#2a3342', 0);
    g.ellipse(sx, sy + 1, Math.max(2, rx - 6), Math.max(1, ry - 2), '#080b10');
    for (const [dx, dy] of [[-rx - 1, 0], [rx + 1, 0], [-Math.round(rx * 0.6), ry], [Math.round(rx * 0.6), ry]]) g.px(sx + dx, sy + dy, '#c2cad8');
    for (const dx of [-9, -3, 3, 9]) g.px(sx + dx, sy - Math.max(1, ry - 1) + 1, '#3f9fd0');
    const soilY = sy - L, potFoot = soilY + 21;   // 화분 흙 줄 · 굽(큰 판: 흙 75.7 → 굽 96.55)
    if (potFoot < sy) {   // 피스톤: 굵은 금속 막대(마디 하나) + 화분 받침 원판(테 밝게)
      g.rect(sx - 3, potFoot, 7, sy - potFoot + 2, '#4a5568'); g.rect(sx - 2, potFoot, 1, sy - potFoot + 2, '#8a97ae'); g.rect(sx + 3, potFoot, 1, sy - potFoot + 2, '#2e3646');
      const mid = Math.round((potFoot + sy) / 2); g.rect(sx - 4, mid, 9, 1, '#2e3646'); g.rect(sx - 4, mid - 1, 9, 1, '#7a879e');
      g.ellipse(sx, potFoot, 13, 3, '#3a4458'); g.ellipse(sx, potFoot - 1, 12, 2, '#8a97ae');
    }
    // 화분(아직 구멍 속인 아래쪽은 앞 잔디에 가려짐: 구멍 가운데 줄 위 + 구멍 안만 보임)
    c.save(); c.beginPath(); c.rect(0, 0, 400, sy);
    for (let dy = 0; dy <= ry; dy++) { const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.5); c.rect(sx - half, sy + dy, half * 2 + 1, 1); }
    c.clip();
    drawBigPotted(g, it.p.key, it.p.pot, sx, soilY, { t, phase: it.i * 700, between: () => grassOval(g, sx, soilY - 2, 17, 4, it.seed) });   // 화분 위 잔디 마개(상자 잔디와 같은 색·같은 풀잎 점)
    c.restore();
  },

  // 위 줄(제목·자리 수·열·정렬) · 고른 식물 정보 · 아래 단추
  ui(app) {
    const { g, W, H, state: s } = app, P = T.ptext, st = T.card || T.panel;
    hud(app, s);
    g.text('양육', 12, 34, { font: 'head', color: '#ffffff', outline: '#14324e' });
    const cap = `${s.plants.length}/${s.slots}`;
    g.text(cap, 52, 37, { color: '#eef7ff', outline: '#14324e' });
    // 열 바꾸기(2열 · 3열) — 누르면 상자가 새 자리로 건너감
    [2, 3].forEach((n, i) => {
      const x = W - 132 + i * 27, on = this.cols === n, id = 'nur_col' + n, pr = app.input.isPressed(id);
      btnBody(g, x, 32, 25, 19, on ? T.btn.primary : T.btn.second, pr);
      g.text(n + '열', x + 12.5, 35 + (pr ? 1 : 0), { font: on ? 'bold' : 'body', color: on ? '#ffffff' : T.btn.second.text, align: 'center' });
      app.input.hit(id, x, 32, 25, 19, () => { if (this.cols !== n) this.relayout(app, () => { this.cols = n; this.scroll = clamp(Math.round(this.scroll * (n === 3 ? 2 / 3 : 1.5)), 0, this.maxScroll(s)); }); }, 3);
    });
    const sid = 'nur_sort', spr = app.input.isPressed(sid), sw = 72;
    btnBody(g, W - 76, 32, sw, 19, T.btn.second, spr);
    g.text('정렬 · ' + SORTS[this.sortI][1], W - 76 + sw / 2, 35 + (spr ? 1 : 0), { color: T.btn.second.text, align: 'center' });
    app.input.hit(sid, W - 76, 32, sw, 19, () => this.relayout(app, () => { this.sortI = (this.sortI + 1) % SORTS.length; }), 3);
    // 고른 식물 정보(앞 턱 위에 뜬 홀로그램)
    const it = this.order && this.order.find(x => x.id === this.sel), PY = 400;
    holo(g, 10, PY, W - 20, 70, st, 13);
    if (it && it.kind === 'plant') {
      const p = it.p, sp = SPECIES[p.key] || { type: 'flower' }, f = p.fruit || { have: 0, max: 1, gauge: 0 };
      g.text(p.name, 20, PY + 8, { font: 'bold', color: P.main });
      gradeBadge(g, 22 + g.textW(p.name, 'bold'), PY + 6, p.grade);
      g.text(STAGE_NAME[sp.type][p.stage], 44 + g.textW(p.name, 'bold'), PY + 8, { color: P.sub });
      g.img(icon('fruit'), 20, PY + 28); g.text(`열매 ${f.have}/${f.max}`, 34, PY + 27, { color: f.have ? P.gold : P.sub });
      g.text('다음 열매', 20, PY + 45, { color: P.sub }); tbar(g, 70, PY + 49, 96, 5, f.gauge, 'exp');
      button(app, 'nur_one', W - 90, PY + 9, 70, 24, '수확', { style: 'teal', icon: 'fruit', disabled: !f.have, onTap: () => app.toast('수확') });
      button(app, 'nur_keep', W - 90, PY + 38, 70, 24, '보관', { style: 'night', icon: 'box', onTap: () => app.toast('동면 보관고로 옮겨요') });
    } else if (it && it.kind === 'empty') {
      g.text('빈 자리', 20, PY + 10, { font: 'bold', color: P.main });
      g.text('종자를 심거나 보관고에서 깨워 오세요', 20, PY + 30, { color: P.sub });
    } else {
      g.text('화분을 눌러 고르세요', 20, PY + 10, { font: 'bold', color: P.main });
      g.text('위아래로 끌면 계단이 굴러가요', 20, PY + 30, { color: P.sub });
    }
    const n = (s.storage || []).length;
    button(app, 'nur_store', 10, H - 92, 118, 40, '동면 보관고', { style: 'night', icon: 'box', sub: `${n}/${s.storageMax || 120}`, onTap: () => app.go('storage') });
    button(app, 'har_all', 134, H - 92, W - 144, 40, '전체 수확', { style: 'gold', font: 'head', icon: 'fruit', iconTint: true, onTap: () => app.toast('전체 수확') });
    navBar(app, 'nursery');
  },
};
