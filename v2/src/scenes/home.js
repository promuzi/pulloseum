import { ELEMENT } from '../art/palette.js';
import { room1, stand1 } from '../art/bg.js';
import { hud, navBar, button, chip, fmt, rbox, tagBox } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig, drawPortrait, bigKey, BGIMG } from '../art/sprites.js';
import { T, plate, btnBody, tbar, holo } from '../art/theme.js';
import { STAT_DEF, miniStars } from './common.js';
import { SPECIES, JONG } from '../game/catalog.js';
import { plantStats } from '../game/logic.js';
import { stageKey, stageName, stars, growInfo, fruitOf } from '../game/view.js';
import { openForm } from '../core/form.js';
import { LOFT_STOOL, loftView, loftPlant, loftZoom, loftPlantCy, enterLoft } from '../art/loft.js';

// 홈 그림마다 받침 윗면 가운데 = 화분 굽이 닿는 점(그림을 바꾸면 다시 잼)
//  loft = 코덱스 원형 방(2026-10-15 사용자 "코덱스 판이 마음에 들어" — 기본), cell = 흰 쿠션 타일 독방, room = 클로드 원기둥 방, ship = 옛 우주선 방
export const HOME_PEDESTAL = { room: [135, 262], cell: [135, 262], ship: [135, 244], loft: LOFT_STOOL };
// 배치(2026-10-15 사용자 "식물 스팩, 가방 등 우측 버튼이 위에 쏠려 있어. 식물의 중앙과 디스플레이 전체 중앙을 정렬시켜 항상" · "글자나 홀로그램 창도 조금만 더 키워봐" ·
//  "버튼 크기도 너무 작아" · "타입 생장 속성같은 정체성은 같은 UI 형식으로 하지 말고 적당한 곳에" · "전투 종류 바꾸는 것과 현재 토너먼트 종류나 승패 상황 등 띄울 곳"):
//  왼쪽 = 능력치 창 넷 + 새잎 막대 창, 오른쪽 = 큰 단추 셋(가방·도감·관리) — 두 줄 모두 세로 가운데를 식물(화분 포함) 가운데에 맞춤(식물마다 다시 재고 부드럽게 따라감).
//  정체성(타입·속성·단계)은 이름 아래 작은 꼬리표, 전투 종류·대회 현황은 출전 단추 왼쪽 카드(누르면 종류 고르기).
const CARD = { x: 6, w: 92, h: 25, gap: 4, grp: 8, growH: 31 };
const SIDE = { w: 50, h: 50, gap: 7 };
const NAME_Y = 404, TAG_Y = 433, DOT_Y = 458, BATTLE_Y = 467, BATTLE_H = 54;
const SHOW_MS = 320;                              // 식물이 의자 투영기에서 나타나는 시간(바꿀 때마다), 스펙 창은 한 장씩 펼쳐짐
// 식물 누르기(2026-10-15 사용자 "가운데 식물을 누르면 주변 전등이 꺼지면서 암실이 되는 연출과 함께 위 주황전등만 남아서 집중시키고,
//  동시에 식물이 조금 확대되는 줌. 이렇게 집중시키면서 식물의 강화와 각종 식물 스킬과 세팅을 할 수 있는 기능으로"):
//  ① 옆 창·글자가 사라지며 방 불이 꺼짐(위 전등·빛기둥만 남음) ② 그 사이 카메라가 식물로 다가감(1.35배 — 기기 배율에 맞춰 칸 크기 고르게) ③ 식물 관리(plant.js)가 같은 카메라로 이어 받음
export const FOCUS = { want: 1.35, sx: 135, sy: 150, ms: 1150, back: 850 };
const MODES = [
  { id: 'tournament', icon: 'sword', name: '1:1 토너먼트', desc: '개체 랭크 대회 · 예선은 5판 3선승' },
  { id: 'swap3', icon: 'shield', name: '3:3 교체전', desc: '내 식물 셋 · 포켓몬처럼 바꿔 가며 싸움' },   // 2026-10-15 사용자 "3:3은 내가 식물 3개 들고 싸우는 거임, 이름도 팀리그라고는 하지 말자"
  { id: 'pvp', icon: 'target', name: '친구 대결', desc: '초대 코드로 친구와 1:1 · 방 만들기' },   // 2026-10-16 사용자 "서버도 열어서 몇몇 친구랑 할 수 있게"
  { id: 'mission', icon: 'flag', name: '미션 캠페인', desc: '정해진 상대·보스를 차례로 넘는 길', lock: '미션 캠페인은 첫 출시 뒤에 열려요' },
];
const BANNER = { x: 4, y: 27, w: 262, h: 60 };   // 위 상태 바(x 4~266)와 같은 가장자리 · 높이 2배(2026-10-15 사용자 "배너 높이 2배로 · 배너랑 위의 바 정렬이 안 맞아")
const BANNER_COL = ['#97e8f7', '#f0be7d', '#9ff0b0', '#c8a8f0'];   // 배너 색(왼쪽 띠·이름 밑줄)
const TIER_COL = { 브론즈: '#d89a62', 실버: '#c8d2e0', 골드: '#f0c858', 플래티넘: '#9ff0e0', 다이아: '#a8d0ff', 마스터: '#e0a8ff', 풀로세움: '#ffd890' };
const ease = k => k * k * (3 - 2 * k);
// 3:3 내 팀(식물 번호 셋) — 정한 적 없으면 앞에서부터 셋
const teamIdx = s => (s.team && s.team.length === 3 && s.team.every(i => i < s.plants.length) ? s.team : s.plants.slice(0, 3).map((_, i) => i));
const modeOf = app => (app.ui && app.ui.mode === 'pvp' ? 'pvp' : app.state.mode || 'tournament');
const teamOf = s => teamIdx(s).map(i => s.plants[i]);

export const home = {
  theme(app) { return this.look || 'loft'; },   // 대기 화면 = 코덱스 원형 방(?look=room·cell·ship 옛 시안)
  enter(p) {
    this.empty = !!p.empty; this.look = p.look || null; this.showT = -1e9; this.swipe = 0; this.editing = !!p.profile; this.modeSheet = !!p.modes; this.forceMode = p.mode || null;   // ?mode=swap3 = 그 전투 종류로(촬영용)
    this.focus = p.focus ? { t0: 0, hold: true } : null;   // ?focus=1 = 다 어두워진 장(촬영용)
    this.unfocus = p.from === 'plant' ? { t0: null } : null;   // 식물 관리에서 돌아오면 거꾸로(카메라가 물러나고 불이 켜짐)
    this.colCy = null;
    if (p.from !== 'plant') enterLoft();   // 창 밖 풍경은 홈에 새로 들어올 때만 다음 것으로(식물 관리 갔다 오면 그대로)
  },
  onDrag(dy, dx) { this.swipe += dx; },
  onRelease(ev) {   // 식물 위에서 옆으로 밀면 다음·이전 식물
    const s = this.app && this.app.state; this.swipe = 0;
    if (!s || T.key !== 'loft' || this.focus || Math.abs(ev.dx) < 32 || Math.abs(ev.dx) < Math.abs(ev.dy) * 1.2 || ev.y0 < 220 || ev.y0 > 430) return;
    this.flip(ev.dx < 0 ? 1 : -1);
  },
  flip(d) { const s = this.app.state; if (s.plants.length < 2) return; s.active = (s.active + d + s.plants.length) % s.plants.length; this.showT = this.app.t; this.app.act('setActive', { id: s.plants[s.active].uid }); },
  startFocus(app) { if (!this.focus && !this.empty) this.focus = { t0: app.t }; },
  draw(app) {
    this.app = app;
    return this.drawLoft(app);
  },

  // ── 코덱스 원형 방 ──
  // 카메라·암실·글자 세기: f = 0(홈) → 1(식물 관리 자리). 누름 = 글자가 사라지고(앞 25%) 불이 꺼져 위 전등만 남은 방을 잠깐 보인 뒤(40%까지) 식물로 다가감, 돌아옴 = 거꾸로
  camera(app, pc) {
    const t = app.t, Z = loftZoom(app, FOCUS.want);
    let f = 0;
    if (this.focus) f = this.focus.hold ? 1 : Math.min(1, (t - this.focus.t0) / FOCUS.ms);
    else if (this.unfocus) { if (this.unfocus.t0 == null) this.unfocus.t0 = t; f = 1 - Math.min(1, (t - this.unfocus.t0) / FOCUS.back); if (f <= 0) this.unfocus = null; }
    if (this.focus && !this.focus.hold && f >= 1 && !this.focus.gone) { this.focus.gone = true; app.go('plant', { focus: true }, 'cut'); }
    const mv = ease(Math.max(0, Math.min(1, (f - 0.38) / 0.62)));
    return { f, dark: ease(Math.min(1, f / 0.4)), ui: 1 - Math.min(1, f / 0.25), z: 1 + (Z - 1) * mv, sx: LOFT_STOOL[0] + (FOCUS.sx - LOFT_STOOL[0]) * mv, sy: pc + (FOCUS.sy - pc) * mv };
  },
  drawLoft(app) {
    const { g, W, t, state: s } = app;
    if (this.showT == null) this.showT = t;
    if (this.forceMode) { s.mode = this.forceMode; this.forceMode = null; }
    const p = this.empty ? null : s.plants[s.active], key = p ? bigKey(p.key, stageKey(p)) : null;
    const [mx, my] = LOFT_STOOL, pc = loftPlantCy(key), cam = this.camera(app, pc);
    // 식물: 의자 속 투영기에서 아래부터 위로 나타남(바꿀 때마다) — 드러나는 줄에 푸른 빛 한 줄
    const show = Math.min(1, (t - this.showT) / SHOW_MS), reveal = Math.round(my - 100 + (1 - show) * 104);
    loftView(app, { dark: cam.dark, z: cam.z, px: mx, py: pc, sx: cam.sx, sy: cam.sy, plant: () => {
      g.clip(0, reveal, W, 120, () => loftPlant(app, key, p ? p.pot : 'pot_terra', mx, my));   // 단계 그림(어린·자람·성체)
      if (show < 1) { g.rect(mx - 26, reveal, 52, 1, '#97e8f7'); g.rect(mx - 18, reveal - 1, 36, 1, '#e4fbff'); }
    } });
    if (cam.ui <= 0) return;
    const live = cam.ui >= 1 && !this.focus;   // 연출 중엔 누르기 막음
    this.colCy = this.colCy == null ? pc : this.colCy + (pc - this.colCy) * 0.22;   // 옆 창 줄 가운데가 식물 가운데를 부드럽게 따라감
    g.alpha(cam.ui, () => this.drawUI(app, p, live));
  },
  drawUI(app, p, live) {
    const { g, state: s } = app, [mx, my] = LOFT_STOOL;
    hud(app, s);
    this.banner(app, BANNER.x, BANNER.y, live);
    if (!p) {
      this.namePlate(app, null, mx);
      button(app, 'home_cta', 60, BATTLE_Y, 150, 44, '첫 종자 심기', { style: 'gold', font: 'head', icon: 'seed', iconTint: true, onTap: () => app.go('bag') });
      navBar(app, 'home');
      return;
    }
    // 옆 창 두 줄: 세로 가운데 = 식물 가운데(이름표 위·배너 아래로 넘지 않게)
    const LH = 4 * CARD.h + 3 * CARD.gap + CARD.grp + CARD.growH, RH = 3 * SIDE.h + 2 * SIDE.gap;
    const fit = h0 => Math.max(BANNER.y + BANNER.h + 8, Math.min(NAME_Y - 6 - h0, this.colCy - h0 / 2));
    this.specs(app, p, fit(LH));
    this.sideButtons(app, fit(RH), live);
    // 이름표 + 넘기기 화살표 · 정체성 꼬리표 · 몇 번째 식물 점
    const [nx, nw] = this.namePlate(app, p, mx), n = s.plants.length;
    if (n > 1) for (const [id, d, x] of [['home_prev', -1, nx - 9], ['home_next', 1, nx + nw + 8]]) {
      const pr = app.input.isPressed(id), c = pr ? '#e4fbff' : '#97e8f7', cy = NAME_Y + 12;
      for (let j = 0; j < 5; j++) g.rect(d < 0 ? x - j : x + j, cy - 4 + j, 1, 9 - j * 2, c);   // 큰 쪽 = 뒤, 뾰족한 쪽 = 가리키는 쪽
      if (live) app.input.hit(id, x - 14, cy - 14, 28, 28, () => this.flip(d), 2);
    }
    this.tags(app, p, mx);
    const dx0 = Math.round(mx - (n - 1) * 4.5);
    for (let i = 0; i < n; i++) { const x = dx0 + i * 9; g.rect(x - 2, DOT_Y - 2, 5, 5, '#2b374b'); g.rect(x - 1, DOT_Y - 1, 3, 3, i === s.active ? '#f0be7d' : '#87acc7'); }
    this.battleBlock(app, live);
    if (live) app.input.hit('home_plant', mx - 40, my - 100, 80, 104, () => this.startFocus(app));
    navBar(app, 'home', { badge: { nursery: s.plants.some(q => fruitOf(q, app.now()).have > 0 || growInfo(q).ready) } });
    if (this.editing) this.profileSheet(app);
    if (this.modeSheet) this.modeSheetDraw(app);
  },
  // 왼쪽 능력치 창: 체력 · 공격 · 방어 · 기동 / 새잎까지(막대). 식물을 바꾸면 위에서부터 한 장씩 왼쪽에서 펼쳐짐
  specs(app, p, y0) {
    const { g, t } = app, st = T.card || T.panel, P = T.ptext, ps = plantStats(p), gi = growInfo(p);
    const rows = [...STAT_DEF.slice(0, 4).map(d => ({ ic: d.icon, label: d.name, val: ps[d.k] != null ? fmt(ps[d.k]) : '–' })), null,
      gi.ready ? { ic: 'up', label: '진화!', val: 'Lv6', bar: 1, gold: true } : gi.done ? { ic: 'sun', label: '다 자람', val: 'Lv6', bar: 1 } : { ic: 'sun', label: `Lv${gi.lv}`, val: `${gi.cur}/${gi.need}`, bar: gi.pct }];
    let y = Math.round(y0), n = 0;
    for (const r of rows) {
      if (!r) { y += CARD.grp - CARD.gap; continue; }
      const h = r.bar != null ? CARD.growH : CARD.h, k = Math.min(1, Math.max(0, (t - this.showT - 90 - n * 40) / 160)); n++;
      if (k > 0) {
        const w = Math.max(3, Math.round(CARD.w * k)), x = CARD.x;
        holo(g, x, y, w, h, st, 15);
        if (k < 1) g.rect(x + w - 1, y, 1, h, '#e4fbff');
        else {
          const ic = icon(r.ic), lh = g.lineH('value'), ty = r.bar != null ? y + 4 : y + Math.round((h - lh) / 2);
          g.img(ic, x + 6, ty + Math.round((lh - ic.height) / 2));
          // 이름과 값이 안 겹치게: 값이 길면(생장 54/120 등) 작은 글자로
          const vf = g.textW(r.label, 'label') + g.textW(r.val, 'value') + 6 > CARD.w - 27 ? 'label' : 'value';
          g.text(r.label, x + 21, ty + 1, { font: 'label', color: r.gold ? '#ffd890' : P.sub });
          g.text(r.val, x + CARD.w - 6, ty + (vf === 'label' ? 1 : 0), { font: vf, color: P.main, align: 'right' });
          if (r.bar != null) tbar(g, x + 6, y + h - 9, CARD.w - 12, 4, r.bar, 'exp');
        }
      }
      y += h + CARD.gap;
    }
  },
  // 오른쪽 큰 단추: 가방 · 도감 · 관리(관리 = 식물 누른 것과 같은 암실 연출로 식물 관리)
  sideButtons(app, y0, live) {
    const { g, W } = app, x = W - 6 - SIDE.w, st = T.btn.second;
    [['home_bag', 'navBag', '가방', () => app.go('bag')], ['home_dex', 'navBook', '도감', () => app.go('dex')], ['home_care', 'up', '관리', () => this.startFocus(app)]].forEach(([id, ic, label, go], i) => {
      const y = Math.round(y0) + i * (SIDE.h + SIDE.gap), { yy, inner } = btnBody(g, x, y, SIDE.w, SIDE.h, st, app.input.isPressed(id)), im = icon(ic);
      g.img(im, x + Math.floor((SIDE.w - im.width * 2) / 2), yy + 3 + Math.floor((30 - im.height * 2) / 2), 2);   // 2배 도트 아이콘
      g.text(label, x + SIDE.w / 2, yy + inner - 15, { font: 'label', color: st.text, align: 'center' });
      const p = app.state.plants[app.state.active];
      if (id === 'home_care' && p && (p.pts > 0 || (p.pend && p.pend.length))) { g.disc(x + SIDE.w - 6, yy + 5, 4, '#05070f'); g.disc(x + SIDE.w - 6, yy + 5, 3, '#ff7a5a'); }   // 쓸 강화 포인트 · 놓을 새 기술이 있음
      if (live) app.input.hit(id, x, y, SIDE.w, SIDE.h, go, 3);
    });
  },
  // 이름표(꽉 찬 판 — 반투명 점무늬 위 글자가 깨져 보였음) → [x, 폭]
  namePlate(app, p, mx) {
    const { g } = app, nm = p ? p.name : '빈 화분', nw = g.textW(nm, 'name'), w = nw + 20 + (p ? 45 : 0), x = Math.round(mx - w / 2);
    holo(g, x, NAME_Y, w, 24, T.card || T.panel, 16);
    g.text(nm, x + 10, NAME_Y + 3, { font: 'name', color: p && p.shiny ? '#ffe8a8' : T.ptext.main });
    if (p) miniStars(g, x + 10 + nw + 6, NAME_Y + 8, stars(p));   // 별 = 개체값 합(등급 대신)
    return [x, w];
  },
  // 정체성 꼬리표: 타입 · 속성 · 생장 단계 — 능력치 창과 다른 꼴(둥근 작은 꼬리표, 아이콘 + 글자)
  tags(app, p, mx) {
    const { g } = app, sp = SPECIES[p.key], el = ELEMENT[sp.el];
    const list = [{ ic: sp.type, label: JONG[sp.type] }, { ic: sp.el, label: el.name, col: el.light }, { ic: 'seed', label: `${stageName(p)} Lv${p.lv}` }];
    const ws = list.map(r => 22 + g.textW(r.label, 'label')), gap = 4, total = ws.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
    let x = Math.round(mx - total / 2);
    list.forEach((r, i) => {
      tagBox(g, x, TAG_Y, ws[i], 18);
      g.img(icon(r.ic), x + 5, TAG_Y + 4);
      g.text(r.label, x + 18, TAG_Y + 3, { font: 'label', color: r.col || '#e4fbff' });
      x += ws[i] + gap;
    });
  },
  // 전투: 왼쪽 카드 = 지금 고른 전투 종류 + 대회 현황(대회 이름·라운드·5판 점·승패, 누르면 종류 고르기) · 오른쪽 = 출전
  battleBlock(app, live) {
    const { g, W, state: s } = app, TR = s.tournament, P = T.ptext, mode = MODES.find(m => m.id === modeOf(app)) || MODES[0];
    const x = 8, w = 116, h = BATTLE_H, pr = app.input.isPressed('home_mode'), y = BATTLE_Y + (pr ? 1 : 0);
    holo(g, x, y, w, h, T.card || T.panel, 15);
    g.img(icon(mode.icon), x + 7, y + 6);
    g.text(mode.name, x + 21, y + 5, { font: 'label', color: P.main });
    for (let j = 0; j < 3; j++) g.rect(x + w - 13 + j, y + 9 + j, 7 - j * 2, 1, P.sub);   // ▾ = 바꿀 수 있음
    const swap = mode.id === 'swap3', pvp = mode.id === 'pvp', SW = s.swap3 || { wins: 0, losses: 0 }, PV = s.pvp || { wins: 0, losses: 0 };
    if (pvp) {   // 친구 대결 = 방 · 초대 코드 + 대결 승패
      g.text('방 만들기 · 코드 넣기', x + 7, y + 21, { color: P.sub });
      g.text(`${PV.wins}승 ${PV.losses}패`, x + w - 7, y + 36, { font: 'label', color: P.main, align: 'right' });
    } else if (swap) {   // 3:3 = 내 팀 셋 얼굴 + 교체전 승패
      teamOf(s).forEach((pl, i) => { if (!pl) return; const fx = x + 7 + i * 21; g.rect(fx, y + 20, 19, 19, '#0a1e2c'); g.clip(fx + 1, y + 21, 17, 17, () => drawPortrait(g, pl.key, fx + 1, y + 21, 17, false)); });
      g.text(`${SW.wins}승 ${SW.losses}패`, x + w - 7, y + 39, { font: 'label', color: P.main, align: 'right' });
    } else {
      g.text(`${TR.name} · ${TR.round}`, x + 7, y + 21, { color: P.sub });
      for (let i = 0; i < TR.bestOf; i++) { const c = i < TR.wins ? '#ffd890' : i < TR.wins + TR.losses ? '#ff8a8a' : '#24425a'; g.rect(x + 7 + i * 10, y + 40, 8, 6, '#0a1e2c'); g.rect(x + 8 + i * 10, y + 41, 6, 4, c); }
      g.text(`${TR.wins}승 ${TR.losses}패`, x + w - 7, y + 36, { font: 'label', color: P.main, align: 'right' });
    }
    if (live) app.input.hit('home_mode', x, BATTLE_Y, w, h, () => { this.modeSheet = true; }, 2);
    const bx = x + w + 6;
    const go = () => {
      if (pvp) return app.go('room', {}, 'shutterClose');
      if (swap && s.plants.length < 3) return app.toast('3:3 교체전은 스마트팜에 식물이 셋 있어야 해요');
      app.go('matching', { mode: mode.id }, 'shutterClose');
    };
    button(app, 'home_cta', bx, BATTLE_Y, W - 8 - bx, h, pvp ? '대결 방' : '출전', { style: 'gold', font: 'name', icon: pvp ? 'target' : 'sword', iconTint: true, sub: pvp ? '친구와 1:1' : swap ? '식물 셋 · 교체 가능' : `${TR.round} ${TR.wins + TR.losses + 1}경기째`, onTap: live ? go : null });   // 출전 = 철 셔터가 닫히고 상대 찾기 → 열리며 전투장
  },
  // 전투 종류 고르기: 1:1 토너먼트 · 3:3 교체전(내 팀 셋은 아래 칸을 눌러 바꿈) · 미션(첫 출시 뒤 — 잠금 표시)
  modeSheetDraw(app) {
    const { g, W, H, state: s } = app, P = T.ptext;
    g.c.fillStyle = 'rgba(6,10,18,0.72)'; g.c.fillRect(0, 0, W, H);
    const close = () => { this.modeSheet = false; if (this.teamDirty) { this.teamDirty = false; app.act('setTeam', { team: teamIdx(s).map(i => s.plants[i].uid) }); } };
    app.input.hit('ms_block', 0, 0, W, H, close);
    const cur = modeOf(app), swapOn = cur === 'swap3', x = 12, w = W - 24, h = 50 + MODES.length * 60 + (swapOn ? 100 : 0), y = Math.max(28, BATTLE_Y + BATTLE_H - h);
    holo(g, x, y, w, h, T.card || T.panel, 16);
    g.text('전투 종류', x + 12, y + 10, { font: 'head', color: P.main });
    MODES.forEach((m, i) => {
      const by = y + 34 + i * 60, on = cur === m.id, lock = !!m.lock, pr = app.input.isPressed('ms_' + m.id), yy = by + (pr ? 1 : 0);
      holo(g, x + 8, yy, w - 16, 54, on ? { fill: '#3a2a18', fill2: '#4a3420', frame: '#f0be7d', frameHi: '#ffe8c8', frameLo: '#a8743a' } : T.deep, 16);
      g.img(icon(m.icon), x + 17, yy + 15, 2);
      g.text(m.name, x + 48, yy + 9, { font: 'value', color: lock ? P.dim : P.main });
      g.text(m.desc, x + 48, yy + 30, { color: lock ? P.dim : P.sub });
      if (lock) g.img(icon('lock'), x + w - 30, yy + 21);
      else if (on) g.text('선택됨', x + w - 18, yy + 10, { font: 'label', color: '#f0be7d', align: 'right' });
      app.input.hit('ms_' + m.id, x + 8, by, w - 16, 54, () => {
        if (lock) return app.toast(m.lock);
        if (m.id === 'pvp') { app.ui = { ...(app.ui || {}), mode: 'pvp' }; this.modeSheet = false; return; }
        if (m.id === 'swap3' && s.plants.length < 3) return app.toast('식물이 셋 있어야 해요 — 종자를 심어 보세요');
        app.ui = { ...(app.ui || {}), mode: null };
        if (s.mode !== m.id) { s.mode = m.id; if (m.id === 'swap3') { s.team = teamIdx(s); this.teamDirty = true; } app.act('setMode', { mode: m.id }); }
        if (m.id !== 'swap3') this.modeSheet = false;
      });
    });
    if (swapOn) {   // 내 팀 셋: 칸을 누르면 팀에 없는 다음 식물로 바뀜
      const ty = y + 34 + MODES.length * 60;
      g.text('내 팀', x + 14, ty + 4, { font: 'label', color: P.sub });
      const team = teamIdx(s);
      team.forEach((pi, k) => {
        const tx = x + 60 + k * 60, pl = s.plants[pi], id = 'ms_team' + k, pr = app.input.isPressed(id), yy = ty + (pr ? 1 : 0);
        holo(g, tx, yy, 56, 54, T.deep, 16);
        g.clip(tx + 3, yy + 3, 50, 34, () => drawPortrait(g, pl.key, tx + 8, yy + 2, 40, false));
        g.text(pl.name, tx + 28, yy + 38, { color: P.main, align: 'center' });
        app.input.hit(id, tx, ty, 56, 54, () => { const used = new Set(team), n = s.plants.length; let j = pi; for (let q = 0; q < n; q++) { j = (j + 1) % n; if (!used.has(j)) break; } if (used.has(j)) return; const nt = [...team]; nt[k] = j; s.team = nt; this.teamDirty = true; });
      });
      button(app, 'ms_done', x + w / 2 - 40, ty + 60, 80, 30, '확인', { style: 'gold', font: 'label', onTap: close });
    }
  },
  // 프로필 배너(높이 60): 배너 색 띠 · 대표 식물 얼굴(50칸) · 이름(16)·칭호 · 오른쪽 랭크(색)·점수·막대 · 연필
  banner(app, x, y, tappable, bw = BANNER.w) {
    const { g, state: s } = app, pf = s.profile || {}, st = T.card || T.panel, P = T.ptext, { h } = BANNER, w = bw, col = BANNER_COL[pf.color || 0];
    holo(g, x, y, w, h, st, 16);   // 꽉 채움(뒤 원뿔 빛이 구멍으로 점점이 비치지 않게)
    g.rect(x + 1, y + 2, 3, h - 4, col);
    g.rect(x + 8, y + 4, 52, 52, '#0a1e2c'); g.rect(x + 8, y + 4, 52, 1, col); g.rect(x + 8, y + 55, 52, 1, col);
    g.clip(x + 9, y + 5, 50, 50, () => drawPortrait(g, pf.avatar || 'flower_grass', x + 9, y + 5, 50, false));
    const rx = x + w - 80, nx = x + 68;   // 오른쪽 랭크 칸(80) — 왼쪽 이름·칭호 칸이 좁은 배너(설정 창)에서도 잘리지 않게
    g.clip(nx, y + 4, rx - nx - 4, 48, () => {
      g.text(pf.name || '재배사', nx, y + 10, { font: 'name', color: P.main });
      g.text(pf.title || '', nx, y + 34, { font: 'label', color: P.sub });
    });
    const TT = s.tournament || { tier: '브론즈', round: '예선', wins: 0, losses: 0 }, tier = TT.tier;   // 오른쪽 = 대회 단계 · 이번 라운드(3승이면 통과)
    g.text(tier, rx, y + 9, { font: 'value', color: TIER_COL[tier] || P.main });
    g.img(icon('pencil'), x + w - 19, y + 9);
    g.text(`${TT.round} ${TT.wins}승 ${TT.losses}패`, rx, y + 27, { font: 'label', color: P.sub });
    tbar(g, rx, y + 45, w - (rx - x) - 9, 5, Math.min(1, TT.wins / 3), 'exp');
    if (tappable) app.input.hit('home_profile', x, y, w, h, () => { this.editing = true; }, 2);
  },
  // 프로필 설정 창: 미리보기 배너 · 이름 바꾸기 · 대표 식물 · 칭호 · 배너 색 · 완료
  profileSheet(app) {
    const { g, W, H, state: s } = app, pf = s.profile, st = T.card || T.panel, P = T.ptext;
    g.c.fillStyle = 'rgba(6,10,18,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('pf_block', 0, 0, W, H, () => {});
    const x = 14, y = 80, w = W - 28, h = 404;
    holo(g, x, y, w, h, st, 15);
    g.text('프로필 설정', x + 12, y + 10, { font: 'head', color: P.main });
    this.banner(app, x + 6, y + 32, false, w - 12);
    let yy = y + 104;
    g.text('이름', x + 12, yy + 5, { color: P.sub });
    g.text(pf.name, x + 60, yy + 5, { font: 'bold', color: P.main });
    button(app, 'pf_name', x + w - 72, yy, 60, 22, '바꾸기', { style: 'night', icon: 'pencil', onTap: () => openForm(app, { title: '이름 바꾸기', fields: [{ id: 'name', label: '재배사 이름', value: pf.name, max: 12 }], ok: '바꾸기', onSubmit: async v => (v.name.trim() ? ((await app.act('setProfile', { name: v.name.trim() })) ? null : '바꾸지 못했어요') : '이름을 써 주세요') }) });
    yy += 34; g.text('대표 식물', x + 12, yy, { color: P.sub }); yy += 16;
    s.plants.slice(0, 6).forEach((p, i) => {
      const px = x + 12 + i * 37, on = pf.avatar === p.key;
      g.rect(px, yy, 32, 32, on ? BANNER_COL[pf.color || 0] : '#3f6a88'); g.rect(px + 1, yy + 1, 30, 30, '#0a1e2c');
      g.clip(px + 2, yy + 2, 28, 28, () => drawPortrait(g, p.key, px + 2, yy + 2, 28, false));
      app.input.hit('pf_av' + i, px, yy, 32, 32, () => { if (pf.avatar !== p.key) { pf.avatar = p.key; app.act('setProfile', { avatar: p.key }); } });
    });
    yy += 44; g.text('칭호', x + 12, yy, { color: P.sub }); yy += 16;
    (s.titles || []).forEach((tt, i) => {
      const bx = x + 12 + (i % 2) * ((w - 30) / 2 + 6), by = yy + Math.floor(i / 2) * 28, bw = (w - 30) / 2, on = pf.title === tt;
      button(app, 'pf_t' + i, Math.round(bx), by, Math.round(bw), 22, tt, { style: on ? 'teal' : 'night', onTap: () => { if (pf.title !== tt) { pf.title = tt; app.act('setProfile', { title: tt }); } } });
    });
    yy += 64; g.text('배너 색', x + 12, yy, { color: P.sub }); yy += 16;
    BANNER_COL.forEach((c, i) => { const bx = x + 12 + i * 30, on = (pf.color || 0) === i; g.rect(bx, yy, 24, 18, on ? '#ffffff' : '#0a1e2c'); g.rect(bx + 2, yy + 2, 20, 14, c); app.input.hit('pf_c' + i, bx, yy, 24, 18, () => { if ((pf.color || 0) !== i) { pf.color = i; app.act('setProfile', { color: i }); } }, 2); });
    button(app, 'pf_done', x + w / 2 - 50, y + h - 40, 100, 30, '완료', { style: 'gold', font: 'head', onTap: () => { this.editing = false; } });
  }
};
