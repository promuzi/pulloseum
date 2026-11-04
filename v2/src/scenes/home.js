import { ELEMENT } from '../art/palette.js';
import { room1, stand1 } from '../art/bg.js';
import { hud, navBar, button, chip, fmt, rbox, tagBox } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig, drawPortrait, drawWhole, bigKey, BGIMG, heroRemember } from '../art/sprites.js';
import { T, plate, btnBody, tbar, holo } from '../art/theme.js';
import { STAT_DEF, miniStars } from './common.js';
import { SPECIES, JONG, LEAGUES, LEAGUE_KEYS, seasonOf, seasonEnd, rankOf, tourName, isTopTier, starOf, DIV_PTS } from '../game/catalog.js';
import { plantStats, leaguesOf, setLeague, bracketWhy } from '../game/logic.js';
import { stageKey, stageName, stars, growInfo, fruitOf, lvOf } from '../game/view.js';
import { openForm } from '../core/form.js';
import { openTeamPick } from './teampick.js';
import { inkOf, sized } from '../core/text.js';
import { LOFT_STOOL, loftView, loftPlant, loftZoom, loftPlantCy, enterLoft } from '../art/loft.js';
import { BANNERS, BANNER_ORDER, bannerOf, bannerInk, bannerPanel, avatarFrame, drawAvatar } from '../art/profile.js';
import { net } from '../net/api.js';
import { checkNotices, openNotices, hasNewNotice } from './notice.js';
import { TIER_COL } from './rankfx.js';

// 홈 그림마다 받침 윗면 가운데 = 화분 굽이 닿는 점(그림을 바꾸면 다시 잼)
//  loft = 코덱스 원형 방(2026-10-15 사용자 "코덱스 판이 마음에 들어" — 기본), cell = 흰 쿠션 타일 독방, room = 클로드 원기둥 방, ship = 옛 우주선 방
export const HOME_PEDESTAL = { room: [135, 262], cell: [135, 262], ship: [135, 244], loft: LOFT_STOOL };
// 배치(2026-10-15 사용자 "식물 스팩, 가방 등 우측 버튼이 위에 쏠려 있어. 식물의 중앙과 디스플레이 전체 중앙을 정렬시켜 항상" · "글자나 홀로그램 창도 조금만 더 키워봐" ·
//  "버튼 크기도 너무 작아" · "타입 생장 속성같은 정체성은 같은 UI 형식으로 하지 말고 적당한 곳에" · "전투 종류 바꾸는 것과 현재 토너먼트 종류나 승패 상황 등 띄울 곳"):
//  왼쪽 = 능력치 창 넷 + 새잎 막대 창, 오른쪽 = 큰 단추 셋(가방·도감·관리) — 두 줄 모두 세로 가운데를 식물(화분 포함) 가운데에 맞춤(식물마다 다시 재고 부드럽게 따라감).
//  정체성(타입·속성·단계)은 이름 아래 작은 꼬리표, 전투 종류·대회 현황은 출전 단추 왼쪽 카드(누르면 종류 고르기).
const CARD = { x: 6, w: 92, h: 25, gap: 4, grp: 8, growH: 31 };
// 오른쪽 기둥(2026-10-25 사용자 "식물 우측 버튼들(가방 랭크 도감 등)의 크기가 너무 커 적절히 줄여주고 왼쪽 스펙패널과 정렬 … 가방 버튼의 경우 중요한 버튼이니깐 적당히 차별점을"):
//  왼쪽 능력치 판과 같은 줄 — 가방 = 위 두 줄 높이 · 큰 아이콘 · 강조색 테 / 도감 · 순위 = 셋째 · 넷째 줄 / 공지 = 새잎 막대 줄. 작은 단추 = 아이콘 + 글자 한 줄(왼쪽 판과 같은 꼴)
const SIDE = { w: 56 };
//  (같은 날 사용자 "공지 버튼만 높이가 큰 거 같아" → 공지도 25칸, 윗변 = 새잎 막대 판 윗변 · "가방은 배경색은 동일하게 하고 테두리만 조금 더 진하게" → 판은 다른 단추와 같고 테만 진한 주황)
const sideRows = () => { const s = CARD.h + CARD.gap; return [[0, CARD.h * 2 + CARD.gap], [2 * s, CARD.h], [3 * s, CARD.h], [4 * s - CARD.gap + CARD.grp, CARD.h]]; };
const BAG_RIM = { edge: '#ee9440', hi: '#ffd49a' };   // 가방 테(가장자리 1칸) · 오른쪽 위 꺾쇠
// 오른쪽 기둥 단추 [id, 아이콘, 글자, 누르면, 빨간 점] — 순위 · 공지는 온라인에서만(2026-10-22)
const SIDE_BTNS = app => [['home_bag', 'navBag', '가방', () => app.go('bag')], ['home_dex', 'navBook', '도감', () => app.go('dex')],
  ...(net.offline && !app.shotOnline ? [] : [['home_rank', 'navRank', '순위', () => app.go('ranks')], ['home_notice', 'navNotice', '공지', () => openNotices(app), hasNewNotice(app)]])];   // shotOnline = 촬영
const NAME_Y = 404, TAG_Y = 433, DOT_Y = 458, BATTLE_Y = 467, BATTLE_H = 54;
// 짧은 화면(높이 480~599 — 휴대폰 브라우저는 주소 줄 때문에 거의 다 이쪽): 배너 아래 전부(방 그림 · 식물 · 옆 창 · 이름표 · 전투 줄)를 같이 올려 아래 줄이 탭 줄 위에 붙게. 방 그림 윗부분(천장)이 배너 뒤로 잘림
export const homeDy = app => Math.min(0, app.H - 600);
const BATTLE_Y0 = BATTLE_Y;
const SHOW_MS = 320;                              // 식물이 의자 투영기에서 나타나는 시간(바꿀 때마다), 스펙 창은 한 장씩 펼쳐짐
// 식물 누르기(2026-10-15 사용자 "가운데 식물을 누르면 주변 전등이 꺼지면서 암실이 되는 연출과 함께 위 주황전등만 남아서 집중시키고,
//  동시에 식물이 조금 확대되는 줌. 이렇게 집중시키면서 식물의 강화와 각종 식물 스킬과 세팅을 할 수 있는 기능으로"):
//  ① 옆 창·글자가 사라지며 방 불이 꺼짐(위 전등·빛기둥만 남음) ② 그 사이 카메라가 식물로 다가감(1.35배 — 기기 배율에 맞춰 칸 크기 고르게) ③ 식물 관리(plant.js)가 같은 카메라로 이어 받음
export const FOCUS = { want: 1.35, sx: 135, sy: 150, ms: 1150, back: 850 };
export const ZOOM_AT = 0.38, ZOOM_MS = Math.round(FOCUS.ms * (1 - ZOOM_AT));   // 다가가기 시작(f) · 남은 다가감 시간 — 식물 관리가 이어 받음
// 식물 관리 판 윗변(짧은 화면은 판이 조금 올라옴) · 카메라 자리 = 식물 가운데가 위 이름·꼬리표(끝 62)와 생장 줄(판 위 34칸) 사이 가운데, 그 높이에 맞춰 덜 키움
//  (2026-10-16 사용자 "식물 선택시에 줌할때 식물이 중앙에 있었으면" — plant.js 와 같은 값)
export const plantSheetY = app => (app.H >= 540 ? 258 : Math.round(258 + (app.H - 540) * 0.6));
export function focusOf(app) {
  const top = 62, bot = plantSheetY(app) - 34;
  return { want: Math.max(1, Math.min(FOCUS.want, (bot - top) / 120)), sx: Math.round(app.W / 2), sy: Math.round((top + bot) / 2) };
}
// 전투 종류 = 형식 × 생장 리그 × 상대를 따로 고름(2026-11-05 사용자 'pvp도 새싹/성장체/성체로 나누고 / 이걸 각각 1:1, 3:3 각각 으로 또 분류해 ui를 이거에 맞게 잘 다듬어봐'):
//  형식(1:1 · 3:3 — s.mode) · 생장 리그(새싹 · 성장기 · 성체 — 그 단계까지 나감, s.league) · 상대(대회 = 봇 · 친구 대결 = app.ui.mode 'pvp') · 미션은 첫 출시 뒤(잠금)
const FORMATS = [
  { id: 'tournament', icon: 'sword', name: '1:1', sub: '식물 하나' },
  { id: 'swap3', icon: 'shield', name: '3:3', sub: '식물 셋 · 교체' },   // 2026-10-15 사용자 "3:3은 내가 식물 3개 들고 싸우는 거임, 이름도 팀리그라고는 하지 말자"
];
const FOES = [
  { id: 'bot', icon: 'trophy', name: '대회', sub: { tournament: '토너먼트 · 랭크', swap3: '교체전 · 리그 승패' } },   // 1:1 = 5판 3선승 · 플래티넘부터 7판 4선승(2026-10-22)
  { id: 'pvp', icon: 'target', name: '친구 대결', sub: { tournament: '초대 코드 · 방', swap3: '초대 코드 · 방' } },   // 2026-10-16 사용자 "서버도 열어서 몇몇 친구랑 할 수 있게"
];
const MISSION = { icon: 'flag', name: '미션 캠페인', lock: '미션 캠페인은 첫 출시 뒤에 열려요' };
const GOLD = { fill: '#3a2a18', fill2: '#4a3420', frame: '#f0be7d', frameHi: '#ffe8c8', frameLo: '#a8743a' };
const BANNER = { x: 4, y: 27, w: 262, h: 60 };   // 위 상태 바(x 4~266)와 같은 가장자리 · 높이 2배(2026-10-15 사용자 "배너 높이 2배로 · 배너랑 위의 바 정렬이 안 맞아")
const ease = k => k * k * (3 - 2 * k);
// 3:3 내 팀(식물 번호 셋) — 정한 적 없으면 앞에서부터 셋
const teamIdx = s => (s.team && s.team.length === 3 && s.team.every(i => i < s.plants.length) ? s.team : s.plants.slice(0, 3).map((_, i) => i));
// 지금 고른 전투: fmt = 'tournament'(1:1) | 'swap3'(3:3) · pvp = 친구 대결 · lg = 생장 리그
const kindOf = app => { const s = app.state, fmt = s.mode === 'swap3' ? 'swap3' : 'tournament'; return { fmt, swap: fmt === 'swap3', pvp: !!(app.ui && app.ui.mode === 'pvp'), lg: LEAGUES[s.league] ? s.league : 'sprout' }; };
const teamOf = s => teamIdx(s).map(i => s.plants[i]);
// 고른 리그에 못 나가는 식물(1:1 = 출전 식물 · 3:3 = 팀) — 리그 칸 · 출전 단추가 같이 씀
const overOf = (s, K, lg = K.lg) => { const cap = LEAGUES[lg].cap; return (K.swap ? teamOf(s) : [s.plants[s.active] || s.plants[0]]).filter(p => p && p.stage > cap); };

export const home = {
  theme(app) { return this.look || 'loft'; },   // 대기 화면 = 코덱스 원형 방(?look=room·cell·ship 옛 시안)
  enter(p) {
    this.empty = !!p.empty; this.look = p.look || null; this.showT = -1e9; this.swipe = 0; this.editing = !!p.profile; this.modeSheet = !!p.modes; this.pickSheet = !!p.pick; this.forceMode = p.mode || null; this.forceLg = p.lg || null;   // ?mode=swap3 · pvp · ?lg=growing = 그 전투 종류로(촬영용)
    this.focus = p.focus ? { t0: 0, hold: true } : null;   // ?focus=1 = 다 어두워진 장(촬영용)
    this.unfocus = p.from === 'plant' ? { t0: null, skip: p.camDone ? 1 - ZOOM_AT : 0 } : null;   // 식물 관리에서 돌아오면 거꾸로(카메라가 물러나고 불이 켜짐) · camDone = 식물 관리가 판과 함께 카메라를 이미 물렸음 → 불 켜짐 · 창만(2026-10-29)
    this.bootIn = p.from === 'boot' ? { t0: null } : null;     // 처음 화면에서 디스플레이가 켜지며 들어옴 = 식물은 이미 의자 위(투영 다시 안 함) · 옆 창 · 글자만 서서히
    this.noReveal = !!this.bootIn;
    this.colCy = null;
    if (p.from !== 'plant' && p.from !== 'boot') enterLoft();   // 창 밖 풍경은 홈에 새로 들어올 때만 다음 것으로(식물 관리 갔다 오면 · 처음 화면이 고른 풍경이면 그대로)
  },
  onDrag(dy, dx) { this.swipe += dx; },
  onRelease(ev) {   // 식물 위에서 옆으로 밀면 다음·이전 식물
    const s = this.app && this.app.state; this.swipe = 0;
    const dy = homeDy(this.app);
    if (!s || T.key !== 'loft' || this.focus || Math.abs(ev.dx) < 32 || Math.abs(ev.dx) < Math.abs(ev.dy) * 1.2 || ev.y0 < 220 + dy || ev.y0 > 430 + dy) return;
    this.flip(ev.dx < 0 ? 1 : -1);
  },
  // 넘기는 차례 = 즐겨찾기 먼저(스마트팜 차례 그대로), 나머지 — 고르기 창 · 화살표 · 점이 같이 씀
  order(s) { return s.plants.map((p, i) => i).sort((a, b) => (s.plants[b].fav ? 1 : 0) - (s.plants[a].fav ? 1 : 0) || a - b); },
  pick(i) { const s = this.app.state; if (i === s.active || !s.plants[i]) return; s.active = i; this.showT = this.app.t; this.noReveal = false; this.app.act('setActive', { id: s.plants[i].uid }); },
  flip(d) { const s = this.app.state; if (s.plants.length < 2) return; const ord = this.order(s), at = Math.max(0, ord.indexOf(s.active)); this.pick(ord[(at + d + ord.length) % ord.length]); },
  startFocus(app) { if (!this.focus && !this.empty) this.focus = { t0: app.t }; },
  draw(app) {
    this.app = app;
    if (!app.state) return loftView(app, {});   // 로그아웃 직후(처음 화면으로 넘어가는 짧은 동안) — 방만
    return this.drawLoft(app);
  },

  // ── 코덱스 원형 방 ──
  // 카메라·암실·글자 세기: f = 0(홈) → 1(식물 관리 자리). 누름 = 글자가 사라지고(앞 25%) 불이 꺼져 위 전등만 남은 방을 잠깐 보인 뒤(40%까지) 식물로 다가감, 돌아옴 = 거꾸로
  camera(app, pc0) {
    const t = app.t, F = focusOf(app), Z = loftZoom(app, F.want), pc = pc0 + homeDy(app);   // pc = 화면에서 식물 가운데(짧은 화면은 올라감)
    let f = 0;
    if (this.focus) f = this.focus.hold ? 1 : Math.min(1, (t - this.focus.t0) / FOCUS.ms);
    else if (this.unfocus) { if (this.unfocus.t0 == null) this.unfocus.t0 = t - (this.unfocus.skip || 0) * FOCUS.back; f = 1 - Math.min(1, (t - this.unfocus.t0) / FOCUS.back); if (f <= 0) this.unfocus = null; }
    // 카메라가 다가가기 시작하는 순간(f 0.38 — 글자는 이미 사라지고 방은 어두움) 식물 관리로 넘김: 남은 다가감과 아래 판 올라옴을 같이(2026-10-17 사용자 "아래 창 올라오는 게 느려서 화면 아래의 검은 게 보여 — 동시에 올라올 수 있게")
    if (this.focus && !this.focus.hold && f >= ZOOM_AT && !this.focus.gone) { this.focus.gone = true; app.go('plant', { focus: true, zoom: true }, 'cut'); }
    const mv = ease(Math.max(0, Math.min(1, (f - 0.38) / 0.62)));
    return { f, dark: ease(Math.min(1, f / 0.4)), ui: 1 - Math.min(1, f / 0.25), z: 1 + (Z - 1) * mv, sx: LOFT_STOOL[0] + (F.sx - LOFT_STOOL[0]) * mv, sy: pc + (F.sy - pc) * mv };
  },
  drawLoft(app) {
    const { g, W, t, state: s } = app;
    if (this.showT == null) this.showT = t;
    if (this.forceMode) { if (this.forceMode === 'pvp') app.ui = { ...(app.ui || {}), mode: 'pvp' }; else s.mode = this.forceMode; this.forceMode = null; }
    if (this.forceLg) { if (LEAGUES[this.forceLg]) setLeague(s, this.forceLg); this.forceLg = null; }
    const p = this.empty ? null : s.plants[s.active], key = p ? bigKey(p.key, stageKey(p), p.shiny) : null;
    if (key) heroRemember(key, p.pot);   // 처음 화면에 올릴 내 식물(바뀔 때만 저장)
    const [mx, my] = LOFT_STOOL, pc = loftPlantCy(key), cam = this.camera(app, pc);
    // 식물: 의자 속 투영기에서 아래부터 위로 나타남(바꿀 때마다) — 드러나는 줄에 푸른 빛 한 줄
    const show = this.noReveal ? 1 : Math.min(1, (t - this.showT) / SHOW_MS), reveal = Math.round(my - 100 + (1 - show) * 104);
    loftView(app, { dark: cam.dark, z: cam.z, px: mx, py: pc, sx: cam.sx, sy: cam.sy, plant: () => {
      g.clip(0, reveal, W, 120, () => loftPlant(app, key, p ? p.pot : 'pot_terra', mx, my));   // 단계 그림(어린·자람·성체)
      if (show < 1) { g.rect(mx - 26, reveal, 52, 1, '#8ccfff'); g.rect(mx - 18, reveal - 1, 36, 1, '#e6f3ff'); }
    } });
    if (this.bootIn && this.bootIn.t0 == null) this.bootIn.t0 = t;
    const bk = this.bootIn ? Math.min(1, (t - this.bootIn.t0) / 600) : 1, ui = cam.ui * bk;
    if (this.bootIn && bk >= 1) this.bootIn = null;
    if (ui <= 0) return;
    const live = ui >= 1 && !this.focus;   // 연출 중엔 누르기 막음
    const pcs = pc + homeDy(app);
    this.colCy = this.colCy == null ? pcs : this.colCy + (pcs - this.colCy) * 0.22;   // 옆 창 줄 가운데가 식물 가운데를 부드럽게 따라감
    g.alpha(ui, () => this.drawUI(app, p, live));
  },
  drawUI(app, p, live) {
    const { g, state: s } = app, [mx, my0] = LOFT_STOOL, dy = homeDy(app), my = my0 + dy, NY = NAME_Y + dy;
    hud(app, s);
    this.banner(app, BANNER.x, BANNER.y, live);
    if (!p) {
      this.namePlate(app, null, mx);
      button(app, 'home_cta', 60, BATTLE_Y + dy, 150, 44, '첫 종자 심기', { style: 'gold', font: 'head', icon: 'seed', iconTint: true, onTap: () => app.go('bag') });
      navBar(app, 'home');
      return;
    }
    // 옆 창 두 줄: 세로 가운데 = 식물 가운데(이름표 위·배너 아래로 넘지 않게) · 오른쪽 = 가방 · 도감(관리 단추는 뺌 — 식물을 누르면 식물 관리, 2026-10-16 사용자)
    const LH = 4 * CARD.h + 3 * CARD.gap + CARD.grp + CARD.growH;
    if (live) checkNotices(app);   // 새 공지가 있으면 처음 한 번(scenes/notice.js)
    const fit = h0 => Math.max(BANNER.y + BANNER.h + 8, Math.min(NY - 6 - h0, this.colCy - h0 / 2)), colY = fit(LH);   // 오른쪽 기둥도 같은 윗줄(줄마다 맞춤)
    this.specs(app, p, colY);
    this.sideButtons(app, colY, live);
    // 이름표 + 넘기기 화살표 · 정체성 꼬리표 · 몇 번째 식물 점
    const [nx, nw] = this.namePlate(app, p, mx), n = s.plants.length;
    if (live && n > 1) app.input.hit('home_name', nx, NY, nw, 24, () => { this.pickSheet = true; }, 3);   // 이름표 = 출전 식물 고르기 창
    if (p.pts > 0 || (p.drafts && p.drafts.length)) { g.disc(nx + nw - 3, NY + 3, 4, '#05070f'); g.disc(nx + nw - 3, NY + 3, 3, '#ff7a5a'); }   // 쓸 강화 포인트 · 놓을 새 기술(식물을 눌러 식물 관리로)
    if (n > 1) for (const [id, d, x] of [['home_prev', -1, nx - 9], ['home_next', 1, nx + nw + 8]]) {
      const pr = app.input.isPressed(id), c = pr ? '#e6f3ff' : '#8ccfff', cy = NY + 12;
      for (let j = 0; j < 5; j++) g.rect(d < 0 ? x - j : x + j, cy - 4 + j, 1, 9 - j * 2, c);   // 큰 쪽 = 뒤, 뾰족한 쪽 = 가리키는 쪽
      if (live) app.input.hit(id, x - 14, cy - 14, 28, 28, () => this.flip(d), 2);
    }
    this.tags(app, p, mx);
    const dx0 = Math.round(mx - (n - 1) * 4.5), DY = DOT_Y + dy;
    this.order(s).forEach((pi, i) => { const x = dx0 + i * 9; g.rect(x - 2, DY - 2, 5, 5, '#2b374b'); g.rect(x - 1, DY - 1, 3, 3, pi === s.active ? '#f0be7d' : s.plants[pi].fav ? '#ff9fb4' : '#8eaed2'); });   // 즐겨찾기 = 분홍 점
    this.battleBlock(app, live);
    // 식물 관리로 가는 누르는 자리(2026-10-17 사용자 "판정 구간을 좀 키우자 — 스텟 부분이랑 의자까지, 아래 버튼과 겹치지 않게"): 식물 + 의자(이름표 3칸 위까지) · 왼쪽 능력치 창
    if (live) {
      app.input.hit('home_plant', mx - 44, my - 100, 88, NY - 3 - (my - 100), () => this.startFocus(app));
      if (this.specsR) { const [sx, sy, sw, sh] = this.specsR; app.input.hit('home_stats', sx, sy, sw, sh, () => this.startFocus(app), 2); }
    }
    navBar(app, 'home', { badge: { nursery: s.plants.some(q => fruitOf(q, app.now()).have > 0 || growInfo(q).ready) } });
    if (this.editing) this.profileSheet(app);
    if (this.modeSheet) this.modeSheetDraw(app);
    if (this.pickSheet) this.pickSheetDraw(app);
  },
  // 왼쪽 능력치 창: 체력 · 공격 · 방어 · 기동 / 새잎까지(막대). 식물을 바꾸면 위에서부터 한 장씩 왼쪽에서 펼쳐짐
  specs(app, p, y0) {
    const { g, t } = app, st = T.card || T.panel, P = T.ptext, ps = plantStats(p), gi = growInfo(p);
    const rows = [...STAT_DEF.slice(0, 4).map(d => ({ ic: d.icon, label: d.name, val: ps[d.k] != null ? fmt(ps[d.k]) : '–' })), null,
      gi.ready ? { ic: 'up', label: '진화!', val: `Lv${gi.shown}`, bar: 1, gold: true } : gi.done ? { ic: 'sun', label: stageName(p), val: `Lv${gi.shown}`, bar: 1 } : { ic: 'sun', label: `Lv${gi.shown}`, val: `${gi.cur}/${gi.need}`, alt: `${Math.floor(gi.pct * 100)}%`, bar: gi.pct }];   // alt = 둘째 자리 레벨 등으로 안 들어가면 %(2026-10-18 'Lv1454/120' 붙음)
    let y = Math.round(y0), n = 0;
    for (const r of rows) {
      if (!r) { y += CARD.grp - CARD.gap; continue; }
      const h = r.bar != null ? CARD.growH : CARD.h, k = Math.min(1, Math.max(0, (t - this.showT - 90 - n * 40) / 160)); n++;
      if (k > 0) {
        const w = Math.max(3, Math.round(CARD.w * k)), x = CARD.x;
        holo(g, x, y, w, h, st, 15);
        if (k < 1) g.rect(x + w - 1, y, 1, h, '#e6f3ff');
        else {
          const ic = icon(r.ic), lh = g.lineH('value'), ty = r.bar != null ? y + 4 : y + Math.round((h - lh) / 2);
          g.img(ic, x + 6, ty + Math.round((lh - ic.height) / 2));
          // 이름과 값이 안 겹치게: 값이 길면(생장 54/120 등) 작은 글자로
          const room = CARD.w - 27, lw = g.textW(r.label, 'label'), vf = lw + g.textW(r.val, 'value') + 6 > room ? 'label' : 'value', val = r.alt && lw + g.textW(r.val, 'label') + 6 > room ? r.alt : r.val;
          g.text(r.label, x + 21, ty + 1, { font: 'label', color: r.gold ? '#ffd890' : P.sub });
          g.text(val, x + CARD.w - 6, ty + (vf === 'label' ? 1 : 0), { font: vf, color: P.main, align: 'right' });
          if (r.bar != null) tbar(g, x + 6, y + h - 9, CARD.w - 12, 4, r.bar, 'exp');
        }
      }
      y += h + CARD.gap;
    }
    this.specsR = [CARD.x, Math.round(y0), CARD.w, y - CARD.gap - Math.round(y0)];   // 처음 안내가 가리킬 자리
  },
  // 오른쪽 단추: 가방 · 도감 · 순위 · 공지(식물 관리 = 식물을 누르면 — 쓸 포인트 · 새 기술 점은 이름표에) · 새 공지가 있으면 공지 단추에 빨간 점
  //  줄 자리 = sideRows(왼쪽 능력치 판과 같은 높이) · 누르는 자리는 줄 사이 틈과 왼쪽으로 조금 더(보이는 크기는 그대로)
  sideButtons(app, y0, live) {
    const { g, W } = app, x = W - 6 - SIDE.w, rows = sideRows(), st = T.btn.second, s = st;
    SIDE_BTNS(app).forEach(([id, ic, label, go, dot], i) => {
      const [ry, h] = rows[i], y = Math.round(y0) + ry, big = i === 0, down = app.input.isPressed(id);
      const { yy, top, inner } = btnBody(g, x, y, SIDE.w, h, s, down), im = icon(ic);
      if (big) {   // 가방: 테만 진한 주황(판 색 그대로 — 모서리 한 칸은 비움) · 2배 아이콘 위 · 글자 아래
        const hh = h - (down ? 1 : 0), w = SIDE.w, L = Math.max(3, Math.min(8, Math.round(w / 7)));
        g.rect(x + 1, yy, w - 2, 1, BAG_RIM.edge); g.rect(x + 1, yy + hh - 1, w - 2, 1, BAG_RIM.edge);
        g.rect(x, yy + 1, 1, hh - 2, BAG_RIM.edge); g.rect(x + w - 1, yy + 1, 1, hh - 2, BAG_RIM.edge);
        g.rect(x + w - L, yy, L, 1, BAG_RIM.hi); g.rect(x + w - 1, yy, 1, 3, BAG_RIM.hi);
        g.img(im, x + Math.floor((SIDE.w - im.width * 2) / 2), yy + 4 + Math.floor((30 - im.height * 2) / 2), 2);
        g.text(label, x + SIDE.w / 2, yy + inner - 15, { font: 'label', color: s.text, align: 'center' });
      } else {   // 아이콘 + 글자 한 줄(가운데)
        const lw = g.textW(label, 'label'), cw = im.width + 4 + lw, cx = x + Math.round((SIDE.w - cw) / 2);
        g.imgMid(im, cx, top + inner / 2 + (ic === 'navNotice' ? 1 : 0));   // 가운데 = 판 윗변(top) 기준 · 공지 말풍선은 꼬리가 아래로 나와 몸통이 위로 보여 1칸 내림(2026-10-25 사용자 '공지 아이콘은 좀 더 내려줘')
        g.textMid(label, cx + im.width + 4, top + inner / 2, { font: 'label', color: s.text });
      }
      if (dot) { g.rect(x + SIDE.w - 8, y + 2, 6, 6, '#2e222f'); g.rect(x + SIDE.w - 7, y + 3, 4, 4, '#ff5a5a'); }
      if (live) app.input.hit(id, x - 6, y - 2, SIDE.w + 6, h + 4, go, 3);
    });
  },
  // 이름표(꽉 찬 판 — 반투명 점무늬 위 글자가 깨져 보였음) → [x, 폭]
  namePlate(app, p, mx) {
    const { g } = app, NY = NAME_Y + homeDy(app), nm = p ? p.name : '빈 화분', nw = g.textW(nm, 'name'), w = nw + 20 + (p ? 45 : 0), x = Math.round(mx - w / 2);
    holo(g, x, NY, w, 24, T.card || T.panel, 16);
    // 글자 세로 가운데 = 판 가운데(잉크 기준 — 2026-10-17 사용자 "대기실 식물 이름 중앙정렬 — 살짝 위에 있어", 전엔 윗선 + 3칸)
    const ik = inkOf('가힣', 'name'), ty = Math.round(NY + 12 + (ik.asc - ik.desc) / 2 - ik.top);
    g.text(nm, x + 10, ty, { font: 'name', color: p && p.shiny ? '#ffe8a8' : T.ptext.main });
    if (p) miniStars(g, x + 10 + nw + 6, NY + 8, stars(p));   // 별 = 개체값 합(등급 대신)
    return [x, w];
  },
  // 정체성 꼬리표: 타입 · 속성 · 생장 단계 — 능력치 창과 다른 꼴(둥근 작은 꼬리표, 아이콘 + 글자)
  tags(app, p, mx) {
    const { g } = app, sp = SPECIES[p.key], el = ELEMENT[sp.el], TY = TAG_Y + homeDy(app);
    const list = [{ ic: sp.type, label: JONG[sp.type] }, { ic: sp.el, label: el.name, col: el.light }, { ic: 'seed', label: `${stageName(p)} Lv${lvOf(p)}` }];
    const ws = list.map(r => 22 + g.textW(r.label, 'label')), gap = 4, total = ws.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
    let x = Math.round(mx - total / 2);
    list.forEach((r, i) => {
      tagBox(g, x, TY, ws[i], 18);
      g.img(icon(r.ic), x + 5, TY + 4);
      g.text(r.label, x + 18, TY + 3, { font: 'label', color: r.col || '#e6f3ff' });
      x += ws[i] + gap;
    });
  },
  // 전투: 왼쪽 카드 = 지금 고른 전투(형식 · 상대) + 현황 — 1:1 대회 = 대회 이름(리그 · 단계) · 라운드 · 판 점 · 승패 / 3:3 대회 = 팀 얼굴 · 그 리그 승패 / 친구 = 리그 · 대결 승패
  //  (누르면 종류 고르기) · 오른쪽 = 출전
  battleBlock(app, live) {
    const { g, W, state: s } = app, TR = s.tournament, P = T.ptext, K = kindOf(app), L = LEAGUES[K.lg], BATTLE_Y = BATTLE_Y0 + homeDy(app);
    const x = 8, w = 116, h = BATTLE_H, pr = app.input.isPressed('home_mode'), y = BATTLE_Y + (pr ? 1 : 0), fmt = K.swap ? '3:3' : '1:1';
    holo(g, x, y, w, h, T.card || T.panel, 15);
    g.img(icon(K.pvp ? 'target' : K.swap ? 'shield' : 'sword'), x + 7, y + 6);
    g.text(K.pvp ? `친구 대결 ${fmt}` : K.swap ? '3:3 교체전' : '1:1 토너먼트', x + 21, y + 5, { font: 'label', color: P.main });
    for (let j = 0; j < 3; j++) g.rect(x + w - 13 + j, y + 9 + j, 7 - j * 2, 1, P.sub);   // ▾ = 바꿀 수 있음
    const SW = (s.swap3by && s.swap3by[K.lg]) || { wins: 0, losses: 0 }, PV = s.pvp || { wins: 0, losses: 0 };
    if (K.pvp) {   // 친구 대결 = 생장 리그(방을 만들 때 그대로 — 방장이 방에서 바꿀 수도) + 대결 승패
      g.text(L.name, x + 7, y + 21, { color: P.sub });
      g.text(`${PV.wins}승 ${PV.losses}패`, x + w - 7, y + 36, { font: 'label', color: P.main, align: 'right' });
    } else if (K.swap) {   // 3:3 = 내 팀 셋 얼굴 + 그 리그 승패(리그마다 따로 — 2026-11-05)
      teamOf(s).forEach((pl, i) => { if (!pl) return; const fx = x + 7 + i * 21; g.rect(fx, y + 20, 19, 19, '#0a1c32'); g.clip(fx + 1, y + 21, 17, 17, () => drawPortrait(g, pl.key + (pl.shiny ? '~s' : ''), fx + 1, y + 21, 17, false)); });
      g.text(L.short, x + w - 7, y + 21, { color: P.sub, align: 'right' });
      g.text(`${SW.wins}승 ${SW.losses}패`, x + w - 7, y + 37, { font: 'label', color: P.main, align: 'right' });
    } else {
      g.text(`${tourName(TR)} · ${TR.round}`, x + 7, y + 21, { color: P.sub });
      const st = TR.bestOf > 5 ? 9 : 10;   // 7판 라운드는 칸을 좁혀 오른쪽 승패 글자와 안 겹치게(2026-10-23)
      for (let i = 0; i < TR.bestOf; i++) { const c = i < TR.wins ? '#ffd890' : i < TR.wins + TR.losses ? '#ff8a8a' : '#244066'; g.rect(x + 7 + i * st, y + 40, st - 2, 6, '#0a1c32'); g.rect(x + 8 + i * st, y + 41, st - 4, 4, c); }
      g.text(`${TR.wins}승 ${TR.losses}패`, x + w - 7, y + 36, { font: 'label', color: P.main, align: 'right' });
    }
    if (live) app.input.hit('home_mode', x, BATTLE_Y, w, h, () => { this.modeSheet = true; }, 2);
    const bx = x + w + 6;
    const go = () => {
      if (K.pvp) return app.go('room', {}, 'shutterClose');   // 방 = 고른 형식 · 리그로 만듦(scenes/room.js) · 넘는 식물은 방이 맞는 것으로 바꿈
      leaguesOf(s);
      if (K.swap && s.plants.length < 3) return app.toast('3:3 교체전은 스마트팜에 식물이 셋 있어야 해요');
      const why = bracketWhy(K.lg, K.swap ? teamOf(s) : [s.plants[s.active] || s.plants[0]]);
      if (why) return app.toast(why);   // 1:1 · 3:3 모두 리그 단계까지(서버와 같은 말)
      app.go('matching', { mode: K.fmt }, 'shutterClose');
    };
    button(app, 'home_cta', bx, BATTLE_Y, W - 8 - bx, h, K.pvp ? '대결 방' : '출전', { style: 'gold', font: 'name', icon: K.pvp ? 'target' : 'sword', iconTint: true, sub: K.pvp ? `친구와 ${fmt} · ${L.short}` : K.swap ? `식물 셋 · ${L.short} 리그` : `${TR.round} ${TR.wins + TR.losses + 1}경기째`, onTap: live ? go : null });   // 출전 = 철 셔터가 닫히고 상대 찾기 → 열리며 전투장
  },
  // 전투 종류 고르기: 1:1 토너먼트 · 3:3 교체전(내 팀 셋은 아래 칸을 눌러 바꿈) · 미션(첫 출시 뒤 — 잠금 표시)
  // 출전 식물 고르기(2026-10-17 사용자 "이거 누르면 출전시킬 수 있는 식물 딱 나열해줘 거기서 고를 수 있게 — 지금은 일일이 화살표 · 즐겨찾기 기능도"):
  //  스마트팜 식물 두 줄 칸(얼굴 · 이름 · 별 · 단계 Lv) — 누름 = 그 식물로 · 오른쪽 위 하트 = 즐겨찾기(앞으로 옴, 창은 안 닫힘)
  pickSheetDraw(app) {
    const { g, W, H, state: s } = app, P = T.ptext, ord = this.order(s), cols = 2, gap = 6, x = 12, w = W - 24, cw = Math.floor((w - 16 - gap) / cols), chh = 50;
    const rows = Math.ceil(ord.length / cols), h = 44 + rows * (chh + gap) - gap + 50, y = Math.max(30, Math.min(Math.round((H - h) / 2), H - h - 10));
    g.c.fillStyle = 'rgba(6,10,18,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('pk_block', 0, 0, W, H, () => { this.pickSheet = false; });
    app.input.hit('pk_in', x, y, w, h, () => {});
    holo(g, x, y, w, h, T.card || T.panel, 16);
    g.text('출전 식물', x + 12, y + 11, { font: 'head', color: P.main });
    g.text(`${ord.length}`, x + w - 12, y + 14, { font: 'label', color: P.sub, align: 'right' });
    ord.forEach((pi, i) => {
      const q = s.plants[pi], on = pi === s.active, cx = x + 8 + (i % cols) * (cw + gap), id = 'pk_' + q.uid, pr = app.input.isPressed(id), cy = y + 40 + Math.floor(i / cols) * (chh + gap) + (pr ? 1 : 0);
      holo(g, cx, cy, cw, chh, on ? { fill: '#3a2a18', fill2: '#4a3420', frame: '#f0be7d', frameHi: '#ffe8c8', frameLo: '#a8743a' } : T.deep, 16);
      g.rect(cx + 5, cy + 5, 40, 40, '#0a1c32');
      g.clip(cx + 5, cy + 5, 40, 40, () => drawPortrait(g, bigKey(q.key, stageKey(q), q.shiny), cx + 5, cy + 5, 40, false));
      const nx = cx + 50, room = cw - 50 - 22;
      let nm = q.name; while (nm.length > 1 && g.textW(nm, 'bold') > room) nm = nm.slice(0, -1);
      g.text(nm === q.name ? nm : nm.slice(0, -1) + '…', nx, cy + 7, { font: 'bold', color: q.shiny ? '#ffe8a8' : P.main });
      miniStars(g, nx, cy + 25, stars(q));
      g.text(`${stageName(q)} Lv${lvOf(q)}`, nx, cy + 34, { font: 'label', color: P.sub });
      app.input.hit(id, cx, cy, cw, chh, () => { this.pick(pi); this.pickSheet = false; });
      // 즐겨찾기 하트(오른쪽 위 — 누르면 켜고 끔)
      const hid = 'pkf_' + q.uid, hx = cx + cw - 19, hy = cy + 5, hi = icon('heart');
      if (q.fav) g.img(hi, hx + 3, hy + 3); else g.silhouette(hi, hx + 3, hy + 3, '#4a5a72');
      app.input.hit(hid, hx - 4, hy - 4, 24, 24, () => { const on2 = !q.fav; if (on2) q.fav = true; else delete q.fav; app.act('setFav', { id: q.uid, on: on2 }); });
    });
    button(app, 'pk_close', x + w / 2 - 50, y + h - 40, 100, 30, '닫기', { style: 'gold', font: 'bold', onTap: () => { this.pickSheet = false; } });
  },
  // 전투 종류 고르기(2026-11-05 다시 짬 — 형식 × 생장 리그 × 상대): ① 형식 1:1 · 3:3 ② 생장 리그 셋(1:1 대회 = 그 리그 랭크 · 3:3 대회 = 그 리그 승패 · 친구 = 나가는 단계)
  //  ③ 상대 대회 · 친구 대결 + 미션(잠금) ④ 3:3이면 내 팀 셋(칸을 누르면 팀 고르기) — 누르는 대로 바로 바뀌고 '확인' · 바깥 누름으로 닫음
  //  지금 식물 · 팀이 넘는 리그 = 그 칸 설명 글자가 빨강 · 고른 리그면 아래에 넘는 식물 이름(출전 단추와 같은 검사)
  modeSheetDraw(app) {
    const { g, W, H, state: s } = app, P = T.ptext, K = kindOf(app), lgs = leaguesOf(s);
    g.c.fillStyle = 'rgba(6,10,18,0.72)'; g.c.fillRect(0, 0, W, H);
    const close = () => { this.modeSheet = false; if (this.teamDirty) { this.teamDirty = false; app.act('setTeam', { team: teamIdx(s).map(i => s.plants[i].uid) }); } };
    app.input.hit('ms_block', 0, 0, W, H, close);
    const over = K.pvp ? [] : overOf(s, K), x = 12, w = W - 24, ix = x + 8, iw = w - 16;
    const FH = 36, LH = 50, WH = over.length ? 16 : 0, OH = 40, MH = 24, TH = K.swap ? 62 : 0;
    const h = 30 + FH + 22 + LH + WH + 22 + OH + 6 + MH + 8 + TH + 40;
    const y = Math.max(28, Math.min(BATTLE_Y + homeDy(app) + BATTLE_H - h, H - h - 8));
    app.input.hit('ms_in', x, y, w, h, () => {});
    holo(g, x, y, w, h, T.card || T.panel, 16);
    g.text('전투 종류', x + 12, y + 10, { font: 'head', color: P.main });
    const tab = (id, bx, by, bw, bh, on, draw, onTap) => {   // 고르는 칸 하나(고른 것 = 금빛)
      const pr = app.input.isPressed(id), yy = by + (pr ? 1 : 0);
      holo(g, bx, yy, bw, bh, on ? GOLD : T.deep, 16); draw(yy, on);
      app.input.hit(id, bx, by, bw, bh, onTap);
    };
    // ① 형식
    let yy = y + 30;
    const fw = Math.floor((iw - 6) / 2);
    FORMATS.forEach((f, i) => tab('ms_f_' + f.id, ix + i * (fw + 6), yy, fw, FH, K.fmt === f.id, (by, on) => {
      const fx = ix + i * (fw + 6);
      g.img(icon(f.icon), fx + 9, by + 11);
      g.text(f.name, fx + 26, by + 4, { font: 'value', color: on ? '#ffe8c8' : P.main });
      g.text(f.sub, fx + 26, by + 20, { color: on ? '#f0be7d' : P.sub });
    }, () => {
      if (K.fmt === f.id) return;
      if (f.id === 'swap3' && s.plants.length < 3) return app.toast('3:3은 스마트팜에 식물이 셋 있어야 해요');
      s.mode = f.id; if (f.id === 'swap3') { s.team = teamIdx(s); this.teamDirty = true; }
      app.act('setMode', { mode: f.id });
    }));
    // ② 생장 리그(시즌은 1:1 대회 랭크에만)
    yy += FH + 6;
    const n = seasonOf(app.now()), days = Math.max(0, Math.ceil((seasonEnd(n) - app.now()) / 864e5));
    g.text(!K.pvp && !K.swap ? `생장 리그 · 시즌 ${n} · ${days}일 남음` : '생장 리그', ix + 6, yy + 1, { font: 'label', color: P.sub });
    yy += 16;
    const lw = Math.floor((iw - 8) / 3);
    LEAGUE_KEYS.forEach((k, i) => tab('ms_lg_' + k, ix + i * (lw + 4), yy, lw, LH, K.lg === k, (by, on) => {
      const lx = ix + i * (lw + 4), L = LEAGUES[k], no = !K.pvp && overOf(s, K, k).length > 0, cx = lx + lw / 2;
      g.text(L.short, cx, by + 5, { font: 'label', color: on ? '#ffe8c8' : P.main, align: 'center' });
      if (K.pvp) g.text(L.desc, cx, by + 25, { font: 'bold', color: on ? '#f0be7d' : P.sub, align: 'center' });   // 친구 대결 = 그 단계까지 나감(승패는 하나)
      else {
        if (K.swap) { const r = s.swap3by[k]; g.text(`${r.wins}승 ${r.losses}패`, cx, by + 20, { font: 'bold', color: P.main, align: 'center' }); }
        else { const rec = k === s.league ? s.tournament : lgs[k]; g.text(rankOf(rec), cx, by + 20, { font: 'bold', color: TIER_COL[rec.tier] || P.main, align: 'center' }); }
        g.text(L.desc, cx, by + 34, { color: no ? '#ff9a8a' : P.dim, align: 'center' });
      }
    }, () => { if (s.league !== k) { setLeague(s, k); app.act('setLeague', { league: k }); } }));
    yy += LH + 4;
    if (over.length) {
      let t = `${over.map(p => p.name).join(' · ')} — ${LEAGUES[K.lg].short} 리그엔 못 나가요`;
      while (g.textW(t) > iw - 12 && over.length > 1) { over.pop(); t = `${over.map(p => p.name).join(' · ')} 외 — ${LEAGUES[K.lg].short} 리그엔 못 나가요`; }
      g.text(t, ix + 6, yy, { color: '#ff9a8a' });
      yy += WH;
    }
    // ③ 상대
    g.text('상대', ix + 6, yy + 1, { font: 'label', color: P.sub });
    yy += 16;
    const ow = Math.floor((iw - 6) / 2);
    FOES.forEach((o, i) => tab('ms_o_' + o.id, ix + i * (ow + 6), yy, ow, OH, (o.id === 'pvp') === K.pvp, (by, on) => {
      const ox = ix + i * (ow + 6);
      g.img(icon(o.icon), ox + 9, by + 7);
      g.text(o.name, ox + 25, by + 5, { font: 'bold', color: on ? '#ffe8c8' : P.main });
      g.text(o.sub[K.fmt], ox + 9, by + 22, { color: on ? '#f0be7d' : P.sub });
    }, () => { app.ui = { ...(app.ui || {}), mode: o.id === 'pvp' ? 'pvp' : null }; }));
    yy += OH + 6;
    tab('ms_mission', ix, yy, iw, MH, false, by => {   // 미션(첫 출시 뒤 — 잠금, 얇은 줄)
      g.img(icon(MISSION.icon), ix + 9, by + 6);
      g.text(MISSION.name, ix + 25, by + 5, { color: P.dim });
      g.img(icon('lock'), ix + iw - 20, by + 6);
    }, () => app.toast(MISSION.lock));
    yy += MH + 8;
    if (K.swap) {   // ④ 내 팀 셋: 칸을 누르면 팀 고르기 창(scenes/teampick.js — 고른 리그를 넘는 식물은 흐리게 · 못 넣음)
      g.text('내 팀', x + 14, yy + 4, { font: 'label', color: P.sub });
      const team = teamIdx(s), cap = LEAGUES[K.lg].cap;
      team.forEach((pi, k) => {
        const tx = x + 60 + k * 60, pl = s.plants[pi], bad = !K.pvp && pl.stage > cap;   // 친구 방은 넘는 식물을 맞는 것으로 바꿔 줌(rooms.mjs)
        tab('ms_team' + k, tx, yy, 56, 54, false, by => {
          g.clip(tx + 3, by + 3, 50, 34, () => drawPortrait(g, pl.key + (pl.shiny ? '~s' : ''), tx + 8, by + 2, 40, false));
          g.text(pl.name, tx + 28, by + 38, { color: bad ? '#ff9a8a' : P.main, align: 'center' });
        }, () => openTeamPick(app, team.map(i => s.plants[i].uid), uids => { s.team = uids.map(u => s.plants.findIndex(q => q.uid === u)); this.teamDirty = false; app.act('setTeam', { team: uids }); }, { lg: K.lg }));
      });
      yy += TH;
    }
    button(app, 'ms_done', x + w / 2 - 50, y + h - 38, 100, 30, '확인', { style: 'gold', font: 'label', onTap: close });
  },
  // 프로필 배너(높이 60): 배너 = 이 창 자체의 디자인(바탕 · 무늬 · 테 · 움직임 · 글자 색 — art/profile.js, 2026-10-22 사용자 "홀로그램창의 디자인을 배너라고 말한거야") ·
  //  대표 식물 아이콘(50칸, 배너 테 · 빛) · 이름(16)·칭호 · 오른쪽 랭크(색)·점수·막대 · 연필
  banner(app, x, y, tappable, bw = BANNER.w) {
    const { g, t, state: s } = app, pf = s.profile || {}, bi = pf.color || 0, P = bannerInk(bi) || T.ptext, { h } = BANNER, w = bw;
    bannerPanel(g, x, y, w, h, bi, t);
    avatarFrame(g, x + 9, y + 5, 50, bi);
    const av = pf.avatar || 'flower_grass', mine = (s.plants || []).find(p => p.key === av), avk = av + (mine && mine.shiny ? '~s' : '');   // 대표 식물이 색 변종이면 그 그림(2026-10-22)
    if (!drawAvatar(g, avk, x + 9, y + 5, 50, bi, (mine && mine.pot) || 'pot_terra')) g.clip(x + 9, y + 5, 50, 50, () => drawWhole(g, avk, x + 9, y + 5, 50));   // 대표 식물 = 화분째 + 배너 빛 방(그림이 오기 전엔 옛 그림)
    const rx = x + w - 80, nx = x + 68;   // 오른쪽 랭크 칸(80) — 왼쪽 이름·칭호 칸이 좁은 배너(설정 창)에서도 잘리지 않게
    g.clip(nx, y + 4, rx - nx - 4, 48, () => {
      g.text(pf.name || '재배사', nx, y + 10, { font: 'name', color: P.main });
      g.text(pf.title || '', nx, y + 34, { font: 'label', color: P.sub });
    });
    const TT = s.tournament || { tier: '브론즈', round: '예선', wins: 0, losses: 0, pts: 0 }, tier = TT.tier;   // 오른쪽 = 대회 단계 · 칸 / 리그 · 칸 점수 / 막대 = 다음 칸까지(맨 위 단계 = 별 · 이번 라운드 승)
    const rk = rankOf(TT);   // '플래티넘 III'처럼 길면 한 단계 작은 글자(연필과 안 겹치게 — 로마 숫자 칸, 2026-10-23)
    g.text(rk, rx, y + 9, { font: g.textW(rk, 'value') > 58 ? sized('value', 12) : 'value', color: TIER_COL[tier] || P.main });
    g.img(icon('pencil'), x + w - 19, y + 9);
    //  둘째 줄 = 고른 리그 · 칸 점수(2026-10-23 사용자 "새싹 리그면 프로필도 새싹으로 해줘" — 라운드 승패는 아래 대회 카드에 그대로)
    g.text(`${(LEAGUES[s.league] || LEAGUES.sprout).short} · ${isTopTier(tier) ? `★${starOf(TT)}` : `${(TT.pts || 0) % DIV_PTS}점`}`, rx, y + 27, { font: 'label', color: P.sub });
    tbar(g, rx, y + 45, w - (rx - x) - 9, 5, ((TT.pts || 0) % DIV_PTS) / DIV_PTS, 'exp');   // 다음 칸(맨 위 = 다음 별)까지
    if (tappable) app.input.hit('home_profile', x, y, w, h, () => { this.editing = true; }, 2);
  },
  // 프로필 설정 창: 미리보기 배너 · 이름 바꾸기 · 대표 식물 · 칭호 · 배너 색 · 완료
  profileSheet(app) {
    const { g, W, H, state: s } = app, pf = s.profile, st = T.card || T.panel, P = T.ptext;
    g.c.fillStyle = 'rgba(6,10,18,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('pf_block', 0, 0, W, H, () => {});
    const x = 14, w = W - 28, h = 404, y = Math.max(24, Math.min(80, Math.round((H - h) / 2)));   // 짧은 화면은 가운데로
    holo(g, x, y, w, h, st, 15);
    g.text('프로필 설정', x + 12, y + 10, { font: 'head', color: P.main });
    this.banner(app, x + 6, y + 32, false, w - 12);
    let yy = y + 104;
    g.text('이름', x + 12, yy + 5, { color: P.sub });
    g.text(pf.name, x + 60, yy + 5, { font: 'bold', color: P.main });
    button(app, 'pf_name', x + w - 72, yy, 60, 22, '바꾸기', { style: 'night', icon: 'pencil', onTap: () => openForm(app, { title: '이름 바꾸기', fields: [{ id: 'name', label: '재배사 이름', value: pf.name, max: 12 }], ok: '바꾸기', onSubmit: async v => (v.name.trim() ? ((await app.act('setProfile', { name: v.name.trim() })) ? null : '바꾸지 못했어요') : '이름을 써 주세요') }) });
    yy += 34; g.text('대표 식물', x + 12, yy, { color: P.sub }); yy += 16;
    const bi = pf.color || 0;
    s.plants.slice(0, 6).forEach((p, i) => {
      const px = x + 12 + i * 37, on = pf.avatar === p.key;
      g.rect(px, yy, 32, 32, on ? bannerOf(bi).col : '#3f6a88'); g.rect(px + 1, yy + 1, 30, 30, bannerOf(bi).dark);
      if (!drawAvatar(g, p.key + (p.shiny ? '~s' : ''), px + 2, yy + 2, 28, bi, p.pot || 'pot_terra')) g.clip(px + 2, yy + 2, 28, 28, () => drawWhole(g, bigKey(p.key, stageKey(p), p.shiny), px + 2, yy + 2, 28));   // 고를 식물 = 아이콘 그대로(화분째)
      app.input.hit('pf_av' + i, px, yy, 32, 32, () => { if (pf.avatar !== p.key) { pf.avatar = p.key; app.act('setProfile', { avatar: p.key }); } });
    });
    yy += 44; g.text('칭호', x + 12, yy, { color: P.sub }); yy += 16;
    (s.titles || []).forEach((tt, i) => {
      const bx = x + 12 + (i % 2) * ((w - 30) / 2 + 6), by = yy + Math.floor(i / 2) * 28, bw = (w - 30) / 2, on = pf.title === tt;
      button(app, 'pf_t' + i, Math.round(bx), by, Math.round(bw), 22, tt, { style: on ? 'teal' : 'night', onTap: () => { if (pf.title !== tt) { pf.title = tt; app.act('setProfile', { title: tt }); } } });
    });
    yy += 64; g.text(`배너 · ${bannerOf(bi).name}`, x + 12, yy, { color: P.sub }); yy += 16;
    // 배너 열둘 = 작은 창 미리보기(여섯씩 두 줄, 열리는 레벨 순 · 잠김 = 어둡게 + 자물쇠, 누르면 열리는 레벨) — 고르면 위 미리보기 창이 바로 바뀜
    const tw = Math.floor((w - 24 - 5 * 4) / 6), th = 22;
    BANNER_ORDER.forEach((i, k) => {
      const B = BANNERS[i], bx = x + 12 + (k % 6) * (tw + 4), by = yy + Math.floor(k / 6) * (th + 4), on = bi === i, lock = ((s.user && s.user.level) || 1) < B.lv;
      if (on) { g.rect(bx - 2, by - 2, tw + 4, th + 4, '#ffffff'); g.rect(bx - 1, by - 1, tw + 2, th + 2, '#0a1220'); }
      bannerPanel(g, bx, by, tw, th, i, app.t);
      if (lock) { g.c.fillStyle = 'rgba(6,10,18,0.62)'; g.c.fillRect(bx, by, tw, th); const li = icon('lockS'); g.img(li, bx + Math.round((tw - li.width) / 2), by + Math.round((th - li.height) / 2)); }
      app.input.hit('pf_c' + i, bx - 2, by - 2, tw + 4, th + 4, () => { if (lock) return app.toast(`${B.name} 배너는 재배사 Lv${B.lv}에 열려요`); if (bi !== i) { pf.color = i; app.act('setProfile', { color: i }); } }, 2);
    });
    button(app, 'pf_done', x + w / 2 - 50, y + h - 40, 100, 30, '완료', { style: 'gold', font: 'head', onTap: () => { this.editing = false; } });
  }
};
