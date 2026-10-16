import { hud, navBar, button, holoTab } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { BGIMG, BGMETA, drawBigPlanted, drawBigPotted, bigKey, bigBox, BIG } from '../art/sprites.js';
import { T, holo, tbar, btnBody } from '../art/theme.js';
import { plainBg } from '../art/bg.js';
import { miniStars } from './common.js';
import { farmSlots, FARM_MAX, SKILLS, STORE_MAX } from '../game/catalog.js';
import { stageKey, stageName, stars, growInfo, fruitOf, slotLv } from '../game/view.js';
import { showGot, sellAsk, cutAsk } from './popups.js';
import { eul } from '../core/josa.js';
import { sfx } from '../core/sound.js';

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
const SORTS = [['plant', '심은 순'], ['star', '별 순'], ['fruit', '열매 순'], ['name', '이름 순']];
const hnum = str => { let h = 7; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h >>> 0; };
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
  enter(p = {}) {
    this.scroll = 0; this.vel = 0; this.dragging = false; this.sel = null; this.selT = -1e9; this.prevSel = null; this.prevT = -1e9; this.mods = new Map(); this.lastT = null; this.cols = +p.cols || this.cols || 2; this.sortI = this.sortI || 0; this.order = null;   // ?cols=3 = 3열로 열기(검토용)
    // 종자를 심고 오면(가방 → 심기): 그 자리로 굴려 고르고 화분이 솟은 뒤 씨앗이 떨어져 싹이 자라 나옴(2026-10-16 사용자 "심으면 식물 팜 원래 창으로 나와서 심긴 거 확인" · "종자 심을 때 연출")
    this.plantFx = p.planted ? { id: 'p' + p.planted, t0: null, seen: false } : null;
  },
  // 칸 목록: 식물 + 빈 자리 + 잠긴 자리(정렬은 식물만, 빈 자리·잠긴 자리는 뒤)
  items(s) {
    const open = farmSlots(s.user.level), it = s.plants.map((p, i) => ({ kind: 'plant', p, i, id: 'p' + p.uid, seed: hnum(p.uid) % 99991 }));
    for (let i = s.plants.length; i < open; i++) it.push({ kind: 'empty', id: 'e' + i, seed: i * 17 + 3 });
    for (let i = Math.max(open, s.plants.length); i < FARM_MAX; i++) it.push({ kind: 'lock', id: 'l' + i, lv: slotLv(i), seed: i * 13 });
    return it;
  },
  sorted(s) {
    const it = this.items(s), mode = SORTS[this.sortI][0];
    const plants = it.filter(x => x.kind === 'plant'), rest = it.filter(x => x.kind !== 'plant');
    const now = this.app ? this.app.now() : Date.now(), fr = x => { const f = fruitOf(x.p, now); return f.max ? f.have / f.max : 0; };
    if (mode === 'star') plants.sort((a, b) => stars(b.p) - stars(a.p) || a.i - b.i);
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
    const M = BGMETA.nursery_lift, off = this.app ? Math.min(0, this.app.H - 600) : 0; if (!M || ev.y0 < M.clip.top - 20 || ev.y0 > M.clip.bottom + off + 6) return;
    this.dragging = true; this.vel = 0;
    const mx = this.maxScroll(this.app.state), out = this.scroll < 0 || this.scroll > mx;
    this.scroll += dy / PITCH * (out ? 0.35 : 1);   // 아래로 끌면 뒷줄이 앞으로(끝에선 고무줄처럼)
  },
  onRelease(ev) { if (!this.dragging) return; this.dragging = false; this.vel = clamp(ev.vy / PITCH, -14, 14); },

  draw(app) {
    this.app = app;
    const { g, W, H, t, state: s } = app;
    const M = BGMETA.nursery_lift, bg = BGIMG.nursery_lift;
    // 짧은 화면(480~599): 계단 그림 · 상자를 같이 올림(뒷줄은 위 줄 뒤로 — 끌어서 봄) · 아래 판도 같은 만큼 올라감
    const dy = Math.min(0, H - 600);
    if (bg) g.img(bg, 0, dy); else plainBg(g, W, H, t);
    if (!M) { hud(app, s); navBar(app, 'nursery'); return; }
    const dt = this.lastT == null ? 0 : clamp((t - this.lastT) / 1000, 0, 0.05); this.lastT = t;   // 시간이 거꾸로 가도(촬영 도구 등) 0
    const C = this.cols, mx = this.maxScroll(s);
    if (!Number.isFinite(this.scroll)) { this.scroll = 0; this.vel = 0; }   // 안전장치(굴림 값이 망가지면 처음으로)
    // 칸 목록: 서버가 새 상태를 주면 같은 자리(id)는 새 식물 값으로 바꿔 끼우고, 칸이 늘거나 줄면(심기·보관·판매·레벨업) 다시 정렬
    const fresh = this.items(s), byId = new Map(fresh.map(x => [x.id, x]));
    if (!this.order || this.order.length !== fresh.length || this.order.some(x => !byId.has(x.id))) this.order = this.sorted(s);
    else this.order = this.order.map(x => byId.get(x.id));
    if (this.plantFx && !this.plantFx.seen) {   // 심고 온 식물: 그 줄로 굴리고 고름 → 화분이 솟고(LIFT_MS) 나서 자라기 시작
      const i = this.order.findIndex(x => x.id === this.plantFx.id);
      if (i >= 0) { this.plantFx.seen = true; this.scroll = clamp(Math.floor(i / C), 0, mx); this.sel = this.plantFx.id; this.selT = t; this.plantFx.t0 = t + LIFT_MS + 120; } else this.plantFx = null;
    }
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
    // 상자 자리: 계단에 딱 붙어 함께 움직임(늦게 따라가게 했더니 앞 계단 챌면에 가려 앞면이 사라지고 깜빡였음 — 2026-10-15 사용자 지적).
    //  차라락 = 끄는 속도만큼 서랍이 살짝 앞으로 빠지며 들썩 — 열마다 45ms·홀짝 줄 20ms씩 늦춘 속도를 읽어 줄줄이
    this.hist = this.hist || [];
    const sv = dt > 0 ? (this.scroll - (this.prevScroll ?? this.scroll)) / dt : 0; this.prevScroll = this.scroll;
    this.hist.push([t, sv]); while (this.hist.length > 48 || (this.hist.length && t - this.hist[0][0] > 700)) this.hist.shift();
    const vAt = tt => { let v = 0; for (const [ht, hv] of this.hist) { if (ht <= tt) v = hv; else break; } return v; };
    const list = this.order.map((it, i) => {
      const col = i % C, row = Math.floor(i / C), Xt = (col - (C - 1) / 2) * BOX[C].gap;
      let m = this.mods.get(it.id); if (!m) { m = { X: Xt, u: row - this.scroll, pull: 0, tw: null }; this.mods.set(it.id, m); }
      let hop = 0, fly = false;
      if (m.tw) {   // 정렬·열 바꾸기: 들려서 새 자리로
        const k = clamp((t - m.tw.t0) / m.tw.dur, 0, 1), e = ease2(k);
        m.X = m.tw.X0 + (Xt - m.tw.X0) * e; m.u = m.tw.r0 + (row - m.tw.r0) * e - this.scroll; hop = Math.sin(Math.PI * k) * 1.25; fly = k > 0 && k < 1;
        if (k >= 1) m.tw = null;
      } else { m.X = Xt; m.u = row - this.scroll; }
      const v = Math.abs(vAt(t - 25 - col * 45 - (row % 2) * 20)), tg = clamp(v * 0.09, 0, 0.55);
      m.pull += (tg - m.pull) * (dt > 0 ? 1 - Math.exp(-dt / (tg > m.pull ? 0.04 : 0.11)) : 0);
      return { it, m, hop: hop + m.pull * 0.5, pull: m.pull, fly };
    });
    // 그리기: 깊이 순(먼 것 먼저). 같은 깊이 = 계단 먼저, 상자는 바깥 열 먼저 — 순서를 늘 같게(바뀌면 깜빡임). 정렬로 건너가는 상자는 공중이라 맨 위.
    const draws = [];
    for (let k = Math.floor(this.scroll) - 2; k <= Math.floor(this.scroll) + 4; k++) draws.push({ d: k - this.scroll, step: true, o: k });
    list.forEach((L, i) => { if (L.m.u > -1.6 && L.m.u < 3.6) draws.push({ d: L.m.u, L, o: i }); });
    const rank = x => (x.step ? 0 : x.L.fly ? 2 : 1);
    draws.sort((a, b) => ((rank(a) === 2) !== (rank(b) === 2) ? rank(a) - rank(b) : 0)
      || (b.d - a.d > 1e-6 ? 1 : a.d - b.d > 1e-6 ? -1 : 0)
      || rank(a) - rank(b)
      || (a.L && b.L ? Math.abs(b.L.m.X) - Math.abs(a.L.m.X) || a.o - b.o : a.o - b.o));
    const hits = [];
    g.c.save(); g.c.translate(0, dy);
    g.clip(0, M.clip.top - dy, W, M.clip.bottom - M.clip.top + dy, () => {
      for (const d of draws) {
        if (d.step) { this.step(g, P, zAt, yAt, st, TW, d.d); continue; }
        const r = this.box(app, P, zAt, yAt, d.L, C);
        if (r) hits.push(r);
      }
    });
    g.c.restore();
    for (const h of hits) { const y0 = Math.max(M.clip.top, h.y + dy), y1 = Math.min(M.clip.bottom + dy, h.y + dy + h.h); if (y1 > y0) app.input.hit(h.id, h.x, y0, h.w, y1 - y0, h.fn); }   // 앞 상자가 나중(위) · 보이는 칸만
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
    const zc = zAt(u) - (L.pull || 0), yb = yAt(u) + hop, zf = zc - BD / 2, zb = zc + BD / 2, ytop = yb + BH;   // pull = 서랍처럼 앞으로 빠진 만큼(디딤판 안)
    const [fxl, fyt] = P(X - w / 2, ytop, zf), [fxr] = P(X + w / 2, ytop, zf), [, fyb] = P(X - w / 2, yb, zf);
    const [bxl, byt] = P(X - w / 2, ytop, zb), [bxr] = P(X + w / 2, ytop, zb), [bxl2, byb2] = P(X - w / 2, yb, zb), [bxr2] = P(X + w / 2, yb, zb);
    const Fx0 = Math.round(fxl), Fx1 = Math.round(fxr), Fy0 = Math.round(fyt), Fy1 = Math.round(fyb), By = Math.round(byt);
    // 옆면(가운데 쪽을 향한 면만 보임) — 앞면 모서리(반올림한 칸)에서 바로 이어 그림. 옆면이 보이는 모서리엔 앞면 검은 테를 안 그음
    //  (2026-10-16 사용자 "화분식 서랍의 앞면이 떨어져서 이격이 보여" — 앞면 테 한 줄이 옆면과의 틈처럼 보였음)
    const sideL = X - w / 2 > 0.05, sideR = X + w / 2 < -0.05;
    if (sideL) g.poly([[Fx0, fyt], [bxl, byt], [bxl2, byb2], [Fx0, fyb]], CER.side);
    if (sideR) g.poly([[Fx1, fyt], [bxr, byt], [bxr2, byb2], [Fx1, fyb]], CER.side);
    // 앞면: 흰 세라믹(위 둥근 턱 밝게 · 아래 그늘 · 양옆 테)
    g.rect(Fx0, Fy0, Fx1 - Fx0, Fy1 - Fy0, CER.mid);
    g.rect(Fx0, Fy0, Fx1 - Fx0, 1, CER.top); g.rect(Fx0, Fy1 - 1, Fx1 - Fx0, 1, CER.lo);
    g.rect(Fx0, Fy0, 1, Fy1 - Fy0, sideL ? CER.lo : CER.ink); g.rect(Fx1 - 1, Fy0, 1, Fy1 - Fy0, sideR ? CER.lo : CER.ink); g.rect(Fx0, Fy1, Fx1 - Fx0, 1, CER.ink);
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
    const f = it.kind === 'plant' ? fruitOf(it.p, app.now()) : null;
    const led = !f ? '#5a6478' : f.have >= f.max ? '#7cf0a0' : f.have > 0 ? '#ffd27a' : '#f0a050';
    g.rect(Fx1 - 5, Fy0 + Math.max(2, Math.floor(fh / 2) - 1), 2, 2, led);
    const isSel = this.sel === it.id, isPrev = !isSel && this.prevSel === it.id && t - this.prevT < LIFT_MS;
    if (it.kind === 'plant') {
      const band = Math.max(2, Fy0 - By);
      if (isSel) this.lifted(g, it, sx, sy, band, Math.round(LIFT * ease(clamp((t - this.selT) / LIFT_MS, 0, 1))), t);
      else if (isPrev) this.lifted(g, it, sx, sy, band, Math.round(LIFT * (1 - ease(clamp((t - this.prevT) / LIFT_MS, 0, 1)))), t);   // 다른 식물을 고르면 원래 화분은 구멍 속으로 내려감(사용자 "기존의 식물은 화분이 내려가는 모션")
      else this.planted(g, it, sx, sy, band, t);
      if (f.have > 0 && !isSel) {   // 열매 표시 = 식물 꼭대기 바로 위(작은 식물이면 낮게 — 2026-10-16 사용자 "식물이 작으면 열매 표식도 높이에 맞게 좀 낮춰줘")
        const ic = icon('fruit'), bk = bigKey(it.p.key, stageKey(it.p)), Bm = BIG[bk], bx = bigBox(bk);
        const top = Bm && bx ? sy - Math.round(Bm.meta.soil[1]) + bx[0] - ic.height - 3 : sy - 86;
        g.img(ic, sx - Math.floor(ic.width / 2), Math.max(sy - 86, top) + (Math.floor(t / 500 + it.i) % 2));
      }
    } else if (isSel) { g.ellipseRing(sx, sy, Math.round((Fx1 - Fx0) * 0.3), Math.max(1, Math.round((Fy0 - By) * 0.3)), '#8ccfff', 0); }
    if (u < -0.4 || u > 2.7) return null;
    return { id: 'nur_' + it.id, x: Fx0, y: sy - 78, w: Fx1 - Fx0, h: Fy1 - sy + 80, fn: () => { if (this.sel !== it.id) { this.prevSel = this.sel; this.prevT = app.t; this.sel = it.id; this.selT = app.t; } } };
  },
  // 잔디에 심긴 식물(큰 판 그림 — 2026-10-15 "식물이 너무 멀어 좀 땡겨와줘", 숨쉬기·깜빡임 그대로): 흙 줄 위만, 밑동은 잔디 덤불이 덮음
  planted(g, it, sx, sy, band, t) {
    const ry = Math.max(2, Math.min(7, Math.round(band * 0.24)));
    if (!drawBigPlanted(g, bigKey(it.p.key, stageKey(it.p)), sx, sy, { t, phase: it.i * 700, between: () => grassOval(g, sx, sy, 17, ry, it.seed) })) grassOval(g, sx, sy, 17, ry, it.seed);
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
    for (const dx of [-9, -3, 3, 9]) g.px(sx + dx, sy - Math.max(1, ry - 1) + 1, '#4a8edc');
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
    // 심기 연출(심고 온 식물): 씨앗이 잔디 마개에 떨어짐(0.3초) → 흙먼지 → 싹이 흙에서 위로 자라 나옴(0.75초) · 반짝임
    const F = this.plantFx && this.plantFx.id === it.id && this.plantFx.t0 != null ? this.plantFx : null, fa = F ? t - F.t0 : 1e9, GROW = 750;
    const reveal = F ? clamp((fa - 300) / GROW, 0, 1) : 1;
    if (F && fa > 300 && !F.bloom) { F.bloom = true; sfx('bloom'); }
    drawBigPotted(g, bigKey(it.p.key, stageKey(it.p)), it.p.pot, sx, soilY, { t, phase: it.i * 700, capUnder: true, reveal: ease(reveal), between: () => grassOval(g, sx, soilY - 2, 17, 4, it.seed) });   // 화분 위 잔디 마개(상자 잔디와 같은 색·같은 풀잎 점) — 식물 뒤
    c.restore();
    if (F) {
      if (fa < 300) { const k = Math.max(0, fa) / 300, yy = Math.round(soilY - 46 + 44 * k * k); g.rect(sx - 2, yy - 2, 4, 5, '#6b4a2a'); g.rect(sx - 1, yy - 3, 2, 1, '#a07848'); g.px(sx + 1, yy - 1, '#c8a070'); }   // 떨어지는 씨앗
      if (fa >= 300 && fa < 820) for (let i = 0; i < 12; i++) {   // 흙먼지 · 풀잎 조각
        const k = (fa - 300) / 520, a = (i / 12) * Math.PI * 2 + 0.3, d = 6 + 18 * k * (0.6 + (i % 3) * 0.2);
        g.alpha(1 - k, () => g.rect(Math.round(sx + Math.cos(a) * d), Math.round(soilY - 3 + Math.sin(a) * d * 0.35 - 8 * k * (1 - k) * 4), 2, 1, i % 3 ? '#8a6a44' : '#7cc060'));
      }
      if (fa >= 400 && fa < 400 + GROW + 600) for (let i = 0; i < 6; i++) {   // 반짝임(별 모양 십자)
        const k = ((fa - 400) / 500 + i / 6) % 1, px = Math.round(sx + Math.sin(i * 2.4) * 22), py = Math.round(soilY - 14 - 60 * reveal * ((i * 37) % 10) / 10 - 6 * k);
        g.alpha(Math.sin(Math.PI * k), () => { g.rect(px - 1, py, 3, 1, '#fff6c8'); g.rect(px, py - 1, 1, 3, '#fff6c8'); });
      }
      if (fa > 400 + GROW + 600) this.plantFx = null;
    }
  },

  // 위 줄(제목·자리 수·열·정렬) · 고른 식물 정보와 할 일(물 · 비료 · 수확 · 진화 · 보관) · 아래 단추
  ui(app) {
    const { g, W, H, state: s } = app, P = T.ptext, st = T.card || T.panel, now = app.now();
    hud(app, s);
    g.text('양육', 12, 34, { font: 'head', color: '#ffffff', outline: '#14324e' });
    const cap = `${s.plants.length}/${farmSlots(s.user.level)}`;
    g.text(cap, 52, 37, { color: '#eef7ff', outline: '#14324e' });
    // 열 바꾸기(2열 · 3열) — 누르면 상자가 새 자리로 건너감
    [2, 3].forEach((n, i) => {
      const x = W - 132 + i * 27, on = this.cols === n, id = 'nur_col' + n;
      holoTab(app, id, x, 31, 25, 21, n + '열', on, null);
      app.input.hit(id, x, 31, 25, 21, () => { if (this.cols !== n) this.relayout(app, () => { this.cols = n; this.scroll = clamp(Math.round(this.scroll * (n === 3 ? 2 / 3 : 1.5)), 0, this.maxScroll(s)); }); }, 3);
    });
    const sid = 'nur_sort', sw = 72;
    holoTab(app, sid, W - 76, 31, sw, 21, '정렬 · ' + SORTS[this.sortI][1], false, null, 'body');
    app.input.hit(sid, W - 76, 31, sw, 21, () => this.relayout(app, () => { this.sortI = (this.sortI + 1) % SORTS.length; }), 3);
    // 고른 식물 정보(앞 턱 위에 뜬 홀로그램): 왼쪽 = 이름·별 · 단계·Lv · 생장 막대 · 열매, 오른쪽 = 할 일 2×2
    const it = this.order && this.order.find(x => x.id === this.sel), PY = 398 + Math.min(0, H - 600), PH = 102;
    if (it) holo(g, 10, PY, W - 20, PH, st, 13);   // 아무것도 안 골랐으면 판 없음(설명 글은 ? 안내로)
    if (it && it.kind === 'plant') {
      const p = it.p, f = fruitOf(p, now), gi = growInfo(p), nw = g.textW(p.name, 'bold');
      g.text(p.name, 20, PY + 8, { font: 'bold', color: p.shiny ? '#ffe8a8' : P.main });
      miniStars(g, 25 + nw, PY + 10, stars(p));
      const colR = W - 136;   // 왼쪽 칸 오른 끝(오른쪽 = 할 일 단추)
      g.text(`${stageName(p)} · Lv${p.lv}`, 20, PY + 25, { color: P.sub });
      if (gi.ready) g.text('진화할 수 있어요!', 20, PY + 41, { font: 'bold', color: '#ffd890' });
      else if (gi.done) g.text('다 자랐어요', 20, PY + 41, { color: P.sub });
      else { g.text(`생장 ${gi.cur}/${gi.need}`, 20, PY + 41, { color: P.sub }); tbar(g, 20, PY + 56, colR - 20, 4, gi.pct, 'exp'); }
      g.img(icon('fruit'), 20, PY + 64); g.text(`열매 ${f.have}/${f.max}`, 34, PY + 63, { color: f.have ? P.gold : P.sub });
      if (f.have < f.max) tbar(g, 34 + g.textW(`열매 ${f.have}/${f.max}`) + 6, PY + 68, Math.max(10, colR - (40 + g.textW(`열매 ${f.have}/${f.max}`))), 4, f.gauge, 'exp');
      const bx = W - 128, bw = 56, bh = 26, gap = 4, r1 = PY + 8, r2 = r1 + bh + gap, r3 = r2 + bh + gap, last = s.plants.length < 2;
      if (gi.ready) button(app, 'nur_evo', bx, r1, bw * 2 + gap, bh, '진화하기', { style: 'gold', font: 'bold', icon: 'up', iconTint: true, onTap: () => this.evolve(app, p) });
      else {
        button(app, 'nur_water', bx, r1, bw, bh, `물 ${s.items.water || 0}`, { style: 'teal', icon: 'can', disabled: gi.done || !s.items.water, onTap: () => this.feed(app, p, 'water') });
        button(app, 'nur_fert', bx + bw + gap, r1, bw, bh, `비료 ${s.items.fert || 0}`, { style: 'teal', icon: 'fert', disabled: gi.done || !s.items.fert, onTap: () => this.feed(app, p, 'fert') });
      }
      button(app, 'nur_one', bx, r2, bw, bh, '수확', { style: 'gold', icon: 'fruit', iconTint: true, disabled: !f.have, onTap: () => this.harvest(app, p) });
      button(app, 'nur_keep', bx + bw + gap, r2, bw, bh, '보관', { style: 'night', icon: 'box', disabled: last, onTap: () => app.act('toStorage', { id: p.uid }).then(r => r && app.toast(`${eul(p.name)} 동면 보관고로 옮겼어요`)) });
      button(app, 'nur_sell', bx, r3, bw, bh, '팔기', { style: 'night', icon: 'coin', disabled: last, onTap: () => sellAsk(app, p) });
      button(app, 'nur_cut', bx + bw + gap, r3, bw, bh, '해체', { style: 'night', icon: 'vine', disabled: last, onTap: () => cutAsk(app, p) });
      button(app, 'nur_care', 20, PY + 80, colR - 24, 18, '식물 관리 ›', { style: 'night', onTap: () => { const i = s.plants.indexOf(p); if (i >= 0 && i !== s.active) { s.active = i; app.act('setActive', { id: p.uid }); } app.go('plant', {}); } });
    } else if (it && it.kind === 'empty') {
      g.text('빈 자리', 20, PY + 10, { font: 'bold', color: P.main });
      button(app, 'nur_sow', 20, PY + 36, 110, 30, '종자 심기', { style: 'gold', icon: 'seed', iconTint: true, onTap: () => app.go('bag', { tab: 'seed' }) });
      button(app, 'nur_wake', 138, PY + 36, 110, 30, '보관고 보기', { style: 'night', icon: 'box', onTap: () => app.go('storage') });
    } else if (it && it.kind === 'lock') {
      g.text('잠긴 자리', 20, PY + 10, { font: 'bold', color: P.main });
      g.text(`재배사 Lv${it.lv}에 열림 · 지금 Lv${s.user.level}`, 20, PY + 30, { color: P.sub });
    }
    const n = (s.storage || []).length, ready = s.plants.reduce((a, p) => a + fruitOf(p, now).have, 0);
    button(app, 'nur_store', 10, H - 90, 118, 38, '동면 보관고', { style: 'night', icon: 'box', sub: `${n}/${STORE_MAX}`, onTap: () => app.go('storage') });
    button(app, 'har_all', 134, H - 90, W - 144, 38, ready ? `전체 수확 ${ready}` : '전체 수확', { style: 'gold', font: 'head', icon: 'fruit', iconTint: true, disabled: !ready, onTap: () => app.act('harvestAll', {}).then(r => r && showGot(app, '열매 수확', r.got, `경험치 +${r.xp.gained}`)) });
    navBar(app, 'nursery');
  },
  async feed(app, p, kind) {
    const r = await app.act('feed', { id: p.uid, kind, n: 1 });
    if (!r) return;
    const up = r.ups[r.ups.length - 1];
    if (up) {
      app.toast(`${p.name} Lv${up.lv}! 강화 포인트 +${up.pts}` + (up.harvest ? ' · 열매 칸 +1' : ''));
      const box = r.ups.find(u => u.box);
      if (box) showGot(app, 'Lv6 달성 선물', Object.entries(box.box).map(([k, n]) => ({ kind: k, n, rar: k === 'credits' ? 0 : 1 })), '이제 진화할 수 있어요');
    }
  },
  async evolve(app, p) {
    const r = await app.act('evolve', { id: p.uid });
    if (!r) return;
    const TO = { battle: '전투 칸에', joker: '조커 칸에', pend: '놓을 칸 고르기' };
    showGot(app, `진화! ${['어린', '자라는', '다 자란'][r.stage]} 단계`, r.got.map(x => ({ kind: 'skill', skill: x.id, to: TO[x.to], rar: SKILLS[x.id] && SKILLS[x.id].tier === 'c3' ? 4 : 3 })), r.got.some(x => x.to === 'pend') ? '칸이 꽉 찼어요 — 식물 관리에서 놓을 칸을 골라요' : '새 기술이 피었어요');
  },
  async harvest(app, p) {
    const r = await app.act('harvest', { id: p.uid });
    if (r) showGot(app, `${p.name} 열매 수확`, r.got, `경험치 +${r.xp.gained}`);
  },
};
