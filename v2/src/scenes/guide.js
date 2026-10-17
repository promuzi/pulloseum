// 처음 안내(튜토리얼, 2026-10-16 사용자 "게임 계정 만들고 처음 들어가는 창과 화면에서는 튜토리얼 설명처럼 · skip 가능하고 작게 원형 버튼의 ?를 누르면
//  다시 볼 수 있게 · 다른 게임에서 어떻게 하는지 참고"):
//  클래시 로얄 · 브롤스타즈 · 원신 · 스타레일 같은 게임의 공통 문법을 따름 — 화면을 어둡게 덮고 가리키는 곳만 밝게(구멍 + 깜빡이는 주황 테) ·
//  한두 줄 말풍선(가리키는 곳 쪽 꼭지) · 몇 번째인지 점 · '다음'(아무 데나 눌러도) · '건너뛰기', 시스템 화면 구석의 작은 동그라미 '?' = 다시 보기.
//  화면마다 처음 들어올 때 한 번(서버 state.guide에 '봤음' — 다른 기기에서도 다시 안 뜸). 화면에 늘 떠 있던 설명 글은 빼고 여기로 모음(같은 날 사용자 "부가 설명은 빼줘").
//  가리키는 곳 = 누르는 자리 id(끝이 * 면 그 이름으로 시작하는 것 모두 · 배열이면 합침 — 꺼진 단추도 input.mark로 찾음) 또는 함수(app, 장면) → [x, y, w, h] · 없으면 가운데 말풍선.
//  장마다 prep(app, 장면) = 그 장을 열 때 화면을 맞춤(끌어 넘기는 판을 그 자리로) · side 'above' = 말풍선을 위에 먼저.
import { T, holo } from '../art/theme.js';
import { button } from '../art/ui.js';
import { wrap, lineH, inkOf } from '../core/text.js';

const ACC = '#f0be7d', ACC_HI = '#ffe8c8', DIM = 'rgba(3,6,12,0.74)', ENTER_MS = 200, WAIT_MS = 550;
const ease = k => 1 - (1 - k) ** 3;
const sc0 = sc => sc || {};
// 헤더(뒤로 · 제목 · 오른쪽 글자) 화면의 '?' = 오른쪽 글자 왼쪽
const hdrBtn = app => [Math.round((app.hdrRightX || app.W - 4) - 22), 7];
// 식물 관리 판 끌어 넘기기: 맨 위 · 맨 아래
const top = (app, sc) => { sc.scrollY = 0; }, bottom = (app, sc) => { sc.scrollY = sc.maxY || 0; };
const mutOf = app => { const s = app.state, p = s && (s.plants[s.active] || s.plants[0]); return !!(p && p.form); };   // 변이 식물(그 변이 기술 카드를 전투 칸에 — 2026-10-17 전투 칸 여섯)

// ── 화면별 안내 ──
export const GUIDES = [
  { id: 'home', scene: 'home', btn: app => [app.W - 24, 93],
    ready: (app, sc) => !sc.focus && !sc.unfocus && !sc.bootIn && !sc.modeSheet && !sc.editing && !sc.empty,
    steps: [
      { at: 'home_plant', text: '내 식물이에요. 누르면 기술 · 강화 · 개체값을 보는 식물 관리로 가요. 옆으로 밀면 다른 식물로 바뀌어요.' },
      { at: (app, sc) => sc.specsR, text: '능력치예요. 맨 아래 막대는 다음 레벨까지 남은 생장이에요. 물 · 비료로 채워요.' },
      { at: ['home_mode', 'home_cta'], text: '전투는 여기서 시작해요. 왼쪽 칸을 누르면 전투 종류(토너먼트 · 3:3 교체전 · 친구 대결)를 바꿔요.' },
      { at: ['home_bag', 'home_dex'], text: '가방엔 종자 · 접목 가지 · 물건이, 도감엔 만난 식물이 모여요.' },
      { at: 'nav_*', text: '아래 탭으로 상점 · 탐사 · 양육에 가요.' },
      { at: 'gd_help', text: '처음 보는 화면엔 이렇게 안내가 떠요. 다시 보려면 이 ? 를 누르세요.' },
    ] },
  { id: 'battle', scene: 'battle', btn: app => [app.W - 21, 4],
    ready: (app, sc) => sc.v && sc.v.phase === 'pick' && !sc.sheet && !sc.info2 && !sc.emoteOpen && !sc.peek && !app.confirm,
    auto: (app, sc) => sc.net !== 'pvp',   // 친구 대결은 시간이 서버에서 흐름 — 저절로는 봇 판에서만(? 는 언제나)
    pause: (app, sc, dt) => { if (sc.v && sc.v.pickT0 != null && sc.net !== 'pvp') sc.v.pickT0 += dt; },   // 안내를 보는 동안 시간 막대 멈춤
    steps: [
      { at: 'sk_*', text: '카드를 누르면 그 기술을 써요. 꾹 누르고 있으면 뒷면에 자세한 설명이 나와요.' },
      { at: 'fx_me', text: '내 체력과 햇빛이에요. 햇빛은 턴마다 1씩 차고, 카드 왼쪽 위 숫자만큼 써요.' },
      { at: (app, sc) => sc.timerR, side: 'above', text: '이 막대가 다 줄기 전에 골라요. 시간을 넘기면 이번 턴은 쉬어요.' },
      { at: 'fx_foe', text: '상대 체력판이에요. 체력판을 누르면 양쪽에 걸린 효과를 볼 수 있어요.' },
      { at: 'bt_flag', text: '깃발은 기권이에요. 기권한 판은 진 판으로 남아요.' },
    ] },
  { id: 'battle3', scene: 'battle', when: (app, sc) => sc.mode === 'swap3', btn: app => [app.W - 21, 4],
    ready: (app, sc) => sc.v && sc.v.phase === 'pick' && !sc.sheet && !sc.info2 && !sc.emoteOpen && !sc.peek && !app.confirm,
    auto: (app, sc) => sc.net !== 'pvp',
    pause: (app, sc, dt) => { if (sc.v && sc.v.pickT0 != null && sc.net !== 'pvp') sc.v.pickT0 += dt; },
    steps: [
      { at: 'bt_swap', text: '내 팀 셋이에요. 누르면 다른 식물로 바꿔요. 앞 식물이 쓰러지면 다음에 내보낼 식물을 골라요.' },
      { at: 'fx_foe', text: '상대 이름 옆 칸은 상대에게 남은 식물이에요.' },
    ] },
  { id: 'battle_mut', scene: 'battle', when: (app, sc) => !!(sc.B && sc.B.me && sc.B.me.kit && sc.B.me.kit.some(k => k.mut)), btn: app => [app.W - 21, 4],
    ready: (app, sc) => sc.v && sc.v.phase === 'pick' && !sc.sheet && !sc.info2 && !sc.emoteOpen && !sc.peek && !app.confirm,
    auto: (app, sc) => sc.net !== 'pvp',
    pause: (app, sc, dt) => { if (sc.v && sc.v.pickT0 != null && sc.net !== 'pvp') sc.v.pickT0 += dt; },
    steps: [{ at: 'sk_m_*', text: '변이 기술이에요. 햇빛을 쓰지 않고, 판마다 쓸 수 있는 횟수가 정해져 있어요(왼쪽 위 숫자). 다 쓰면 그 판엔 못 써요.' }] },
  { id: 'plant2', scene: 'plant', when: (app, sc) => sc.tab === 'skill' && !sc.sub, btn: app => [app.W - 24, 9],
    ready: (app, sc) => sc.t0 != null && app.t - sc.t0 > 700 && !sc.out && !sc.peek && !sc.cardDrag,
    steps: [
      { at: 'pt_*', prep: top, text: '기술 · 강화 · 개체값 · 설정을 여기서 골라요.' },
      { at: 'skc_b*', prep: top, text: '스킬 카드 — 전투에 들고 가는 기술 여섯이에요. 누르면 설명과 [해제]가 나오고, 꾹 눌러 끌면 자리를 바꿔요.' },
      { at: 'skc_s*', prep: top, text: '스킬 보관 — 배운 기술을 여섯까지 맡겨 둬요. 누르면 [장착] → 넣을 스킬 칸을 눌러요(빈 칸이면 그냥 들어가요). 끌어 놓아도 돼요.' },
      { at: (app, sc) => sc.growR, prep: top, text: '물 · 비료를 주면 레벨이 올라요. 오를 때마다 강화 포인트가 생기고, 다 자라면 진화해요.' },
      { at: ['sk_forgot', 'sk_graft'], prep: bottom, text: '지운 기술은 회귀 주사로 되돌리고, 접목 가지로는 맞는 기술을 바로 배워요.' },
    ] },
  { id: 'plant_card2', scene: 'plant', when: (app, sc) => sc.tab === 'skill' && !sc.sub, btn: app => [app.W - 24, 9],
    ready: (app, sc) => sc.t0 != null && app.t - sc.t0 > 700 && !sc.out && !sc.peek && !sc.cardDrag,
    steps: [
      { at: ['skc_c0', 'skc_c1'], prep: bottom, text: '패시브 카드 칸 둘이에요. 일반 식물은 능력치를 올리는 일반 카드를, 변이 식물은 그 변이 패시브 카드를 넣어요.' },
      { at: 'skc_cl*', prep: bottom, text: '패시브 보관 — 가방에 있는 맞는 카드예요. 누르면 [장착], 장착된 카드를 누르면 [해제]예요.' },
    ] },
  { id: 'plant_mutcard', scene: 'plant', when: (app, sc) => sc.tab === 'skill' && !sc.sub && mutOf(app), btn: app => [app.W - 24, 9],
    ready: (app, sc) => sc.t0 != null && app.t - sc.t0 > 700 && !sc.out && !sc.peek && !sc.cardDrag,
    steps: [{ at: 'skc_b*', prep: top, text: '변이 식물은 스킬 칸 여섯 중 둘까지 그 변이의 기술 카드를 넣어요. 스킬 보관 아래 변이 기술 카드를 누르고 [장착]해요.' }] },
  { id: 'plant_up', scene: 'plant', when: (app, sc) => sc.tab === 'up', btn: app => [app.W - 24, 9],
    ready: (app, sc) => sc.t0 != null && !sc.out,
    steps: [
      { at: 'up_*', text: '강화 포인트는 레벨이 오를 때마다 2개씩 생겨요. 포인트 하나와 돈으로 능력치 하나를 올려요.' },
      { at: 'up_reset', text: '초기화하면 쓴 포인트가 돌아와요. 돈이 들어요.' },
    ] },
  { id: 'plant_iv', scene: 'plant', when: (app, sc) => sc.tab === 'iv', btn: app => [app.W - 24, 9],
    ready: (app, sc) => sc.t0 != null && !sc.out,
    steps: [
      { text: '개체값은 심을 때 정해지는 타고난 힘이에요. 1마다 그 능력치가 1%씩 올라요.' },
      { at: 'mg_*', text: '같은 종 식물을 거름으로 주면 고른 개체값이 올라요. 위 게이지를 눌러 올릴 능력치를 골라요.' },
    ] },
  { id: 'plant_forgot', scene: 'plant', when: (app, sc) => sc.sub === 'forgot', btn: app => [app.W - 24, 9],
    ready: (app, sc) => sc.t0 != null && !sc.out,
    steps: [{ at: 'fg_go_*', text: '지운 기술은 회귀 주사 하나로 되돌려요. 빈 전투 칸이나 보관 칸으로 가요.' }] },
  { id: 'plant_graft', scene: 'plant', when: (app, sc) => sc.sub === 'graft', btn: app => [app.W - 24, 9],
    ready: (app, sc) => sc.t0 != null && !sc.out,
    steps: [{ at: 'gs_go_*', text: '접목 가지로 속성이나 종이 맞는 기술을 바로 배워요. 접목 가지는 해체 · 탐사 · 수확에서 나와요.' }] },
  { id: 'nursery', scene: 'nursery', btn: (app, sc) => [Math.round(sc.capX || 80), 33],
    ready: (app, sc) => !sc.plantFx && !sc.dragging,
    steps: [
      { at: 'nur_p*', text: '화분을 눌러 고르고, 위아래로 끌어 계단을 돌려요.' },
      { at: ['nur_water', 'nur_fert', 'nur_evo', 'nur_one', 'nur_keep', 'nur_toss', 'nur_iv', 'nur_sell', 'nur_cut'], text: '고른 식물에 물 · 비료를 주고 익은 열매를 거둬요. 보관 · 거름주기(개체값) · 버리기(팔기 · 해체)도 여기서 해요.' },
      { at: 'har_all', text: '익은 열매는 한 번에 거둘 수 있어요. 열매에선 돈 · 물 · 비료 · 접목 가지가 나와요.' },
      { at: 'nur_store', text: '자리가 모자라면 동면 보관고에 맡겨요. 잠든 식물은 자라지 않고 열매도 맺지 않아요.' },
    ] },
  { id: 'storage', scene: 'storage', btn: (app, sc) => [Math.round(sc.capX || 180), 34],
    ready: (app, sc) => !sc.dragging,
    steps: [{ at: 'cap_0', text: '잠든 식물들이에요. 캡슐을 누르면 깨우기 · 팔기 · 해체를 할 수 있어요.' }] },
  { id: 'bag', scene: 'bag', when: (app, sc) => sc.tab === 'seed', btn: hdrBtn,
    ready: (app, sc) => !sc.pickFor,
    steps: [
      { at: 'tab_*', text: '종자 · 접목 가지 · 카드 · 물건을 나눠서 봐요.' },
      { at: 'plant_*', text: '종자를 심으면 스마트팜에서 자라요. 개체값은 심을 때 정해져요.' },
      { at: 'bag_explore', text: '종자는 탐사에서 가장 많이 얻어요.' },
    ] },
  { id: 'bag_card', scene: 'bag', when: (app, sc) => sc.tab === 'card', btn: hdrBtn,
    ready: (app, sc) => !sc.pickFor,
    steps: [{ at: 'cd_*', text: '카드는 식물의 카드 칸에 끼워요. 일반 카드는 일반 식물에, 변이 카드는 그 변이 식물에만 맞아요. 탐사 · 해체 · 상점에서 얻어요.' }] },
  { id: 'bag_scion', scene: 'bag', when: (app, sc) => sc.tab === 'scion', btn: hdrBtn,
    ready: (app, sc) => !sc.pickFor,
    steps: [{ at: 'gr_*', text: '접목 가지는 속성이나 종이 맞는 식물에게 기술을 바로 가르쳐요. 해체 · 탐사 · 수확에서 나와요.' }] },
  { id: 'explore', scene: 'explore', when: (app, sc) => !sc.map, btn: app => [app.W - 24, 30],
    ready: (app, sc) => !sc.morph && !sc.unmorph && !sc.warp,
    steps: [
      { at: 'pl_*', text: '행성을 누르면 간단한 정보가 나와요. 먼 궤도는 연료 탱크를 키우고 재배사 레벨이 올라야 열려요.' },
      { at: 'ex_scan', text: '조사하기를 누르면 행성으로 다가가 지도가 열려요. 대륙 하나가 지역 하나예요. 지역마다 나오는 식물 · 위험 · 귀한 보상이 다르고, 탐사 장치를 키우면 하나씩 열려요. 위험한 곳일수록 변이 종자가 잘 나와요.' },
      { at: (app, sc) => sc.fuelR, text: '탐사 한 번에 연료 캡슐 하나를 써요. 캡슐은 시간이 지나면 다시 차요.' },
      { at: 'ex_ship', text: '탐사선을 누르면 정비실로 가요.' },
    ] },
  { id: 'explore_map', scene: 'explore', when: (app, sc) => !!sc.map, btn: app => [app.W - 24, 30],
    ready: (app, sc) => sc.map && sc.map.close == null && sc.mapU(app.t) >= 1 && !sc.warp && !sc.morph,
    steps: [
      { at: (app, sc) => sc.regR, text: '대륙을 눌러 지역을 골라요.' },
      { at: (app, sc) => sc.oddsR, text: '필수 단계가 모자라면 못 가요. 권장 단계가 모자라도 갈 수는 있지만 실패할 수 있어요. 둘 다 정비실에서 올려요.' },
      { at: 'ex_go', text: '준비되면 보내요. 탐사비와 연료 캡슐 하나를 써요.' },
    ] },
  { id: 'hangar', scene: 'hangar', btn: app => [Math.round(12 + app.g.textW('탐사선 정비', 'head') + 8), 33],
    ready: (app, sc) => !sc.choose && !sc.out && sc.inT != null && app.t - sc.inT > 700,
    steps: [
      { at: ['hg_tank', 'hg_hull', 'hg_scanner', 'hg_cargo', 'hg_vault'], text: '탐사선 부품 다섯이에요. 눌러 고르고 아래에서 강화해요. 강화에 쓰는 부품은 탐사에서 모여요.' },
      { at: 'hg_model', text: '탐사선 겉모습은 여기서 바꿔요. 성능은 같아요.' },
    ] },
  { id: 'shop', scene: 'shop', btn: app => [app.W - 24, 48],
    steps: [
      { at: ['buy_seed_common', 'buy_seed_rare'], text: '종자 꾸러미는 돈으로 사요. 어떤 식물이 나올지는 열어 봐야 알아요.' },
      { at: ['buy_water10', 'buy_fert5', 'buy_regress1', 'buy_fuel3'], text: '보급품은 보석으로 사요. 물 · 비료는 대결 · 탐사 · 수확에서도 얻어요.' },
    ] },
  { id: 'room', scene: 'room', btn: app => [Math.round(app.W / 2 + app.g.textW('친구 대결', 'head') / 2 + 6), 10],
    ready: (app, sc) => !sc.picker && !sc.teamPick,
    steps: [
      { at: 'rm_make', text: '방을 만들면 초대 코드가 나와요. 코드나 링크를 친구에게 보내요.' },
      { at: 'rm_join', text: '친구가 만든 방엔 코드로 들어가요.' },
      { text: '둘 다 준비하면 바로 시작해요. 한 턴은 40초, 보상은 하루 15판까지예요.' },
    ] },
  { id: 'dex', scene: 'dex', btn: hdrBtn,
    steps: [{ text: '만난 식물이 여기 모여요. 아직 못 만난 식물은 그림자로 보여요.' }] },
];

// ── 봤음 ──
const seenLocal = new Set();   // 서버 답이 오기 전에 같은 안내가 다시 뜨지 않게
export const guideSeen = (app, id) => seenLocal.has(id) || !!(app.state && app.state.guide && app.state.guide[id]);
function markSeen(app, ids) {
  for (const id of ids) { if (guideSeen(app, id)) continue; seenLocal.add(id); app.act('guide', { id }); }
}

// 가리키는 곳 → [x, y, w, h](화면 안으로 자름) · 못 찾으면 null
function findRect(app, at, sc) {
  if (!at) return null;
  if (typeof at === 'function') { const r = at(app, sc0(sc)); return r && r[2] > 0 && r[3] > 0 ? r.map(Math.round) : null; }
  const ids = Array.isArray(at) ? at : [at], inp = app.input, seen = new Set();
  const match = id => ids.some(k => (k.endsWith('*') ? String(id).startsWith(k.slice(0, -1)) : id === k));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  const take = (r, p) => { x0 = Math.min(x0, r.x - p); y0 = Math.min(y0, r.y - p); x1 = Math.max(x1, r.x + r.w + p); y1 = Math.max(y1, r.y + r.h + p); n++; };
  for (const r of inp.marks || []) if (r.id && match(r.id)) { take(r, 2); seen.add(r.id); }
  for (const r of inp.regions) if (r.id && !seen.has(r.id) && match(r.id)) take(r, 0);
  if (!n) return null;
  x0 = Math.max(2, x0); y0 = Math.max(2, y0); x1 = Math.min(app.W - 2, x1); y1 = Math.min(app.H - 2, y1);
  return x1 > x0 && y1 > y0 ? [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)] : null;
}

// 지금 화면에 맞는 안내들
function guidesHere(app) {
  const sc = sc0(app.router.cur), name = app.router.name;
  return GUIDES.filter(D => D.scene === name && (!D.when || D.when(app, sc)));
}
// 촬영(?scene= 검토 · v2shots): 이 화면 안내를 step 번째 장에서 다 펼친 채로
export function shotGuide(app, step) { const list = guidesHere(app); if (!list.length) return false; openGuide(app, list, true, step); app.guide.t0 = -1e9; return true; }
export function openGuide(app, list, replay, step = 0) {
  const steps = list.flatMap(D => D.steps);
  if (!steps.length) return;
  app.guide = { ids: list.map(D => D.id), defs: list, steps, i: Math.min(step, steps.length - 1), t0: app.t, lastT: app.t, from: null, cur: null, replay, scene: app.router.name };
  app.guideWait = null;
  prepStep(app);
}
function prepStep(app) { const G = app.guide, st = G && G.steps[G.i]; if (st && st.prep) st.prep(app, sc0(app.router.cur)); }
function closeGuide(app, done) {
  const G = app.guide; app.guide = null;
  if (G && done && !G.replay) markSeen(app, G.ids);
}

// 작은 동그라미 '?'(16칸): 누르면 이 화면 안내를 다시(fn 없음 = 그리기만 — 안내가 열린 동안 구멍 속에 보이게)
function helpBtn(app, x, y, fn) {
  const { g, input } = app, pr = input.isPressed('gd_help'), yy = y + (pr ? 1 : 0), cx = x + 8, cy = yy + 8;
  if (!pr) g.disc(cx, cy + 1, 8, '#05070f');   // 아래 턱(눌리면 사라짐)
  g.disc(cx, cy, 8, '#05070f'); g.disc(cx, cy, 7, '#4f84bf'); g.disc(cx, cy, 6, '#16406a');
  g.rect(cx - 3, cy - 5, 6, 1, '#2a6aa0');
  // '?' = 실제 획(잉크) 가운데를 원 가운데에(2026-10-17 사용자 "? 도움말 표시가 원 가운데에 있지 않고 좀 위로" → "여전히 위에 있는 느낌"):
  //  원 칸은 (cx − 6 … cx + 6) 13칸이라 가운데 = cx + 0.5 · cy + 0.5, 위가 큰 모양 · 아래 턱이라 0.3칸 더 아래(6배 촬영으로 잰 값 — 글자 잉크 잼보다 실제 획이 0.3칸 위에 그려짐)
  const ink = inkOf('?', 'bold'), by = cy + (ink.asc - ink.desc) / 2 + 1.1, tx = cx + 0.5 - ink.dx;
  g.text('?', tx, by - ink.top, { font: 'bold', color: '#e6f3ff', align: 'center' });
  input.mark('gd_help', x, y, 16, 16);
  if (fn) input.hit('gd_help', x, y, 16, 16, fn, 8);
}

// 장면 위(받은 것 · 상자 · 예/아니오가 없을 때) — popups.js drawOverlays 끝에서
export function drawGuide(app) {
  const sc = sc0(app.router.cur);
  if (app.guide) {
    if (app.guide.scene !== app.router.name) { app.guide = null; return; }   // 화면이 바뀌면 닫음
    return drawOpen(app, sc);
  }
  if (!app.state || app.router.phase) return;
  const list = guidesHere(app);
  if (!list.length) return;
  if (!list.every(D => !D.ready || D.ready(app, sc))) { app.guideWait = null; return; }   // 들어오는 연출 · 화면 안 창이 열린 동안엔 '?'도 숨김
  const B = list[0].btn && list[0].btn(app, sc);
  if (B) helpBtn(app, B[0], B[1], () => openGuide(app, list, true));
  if (app.noGuide) return;
  const fresh = list.filter(D => !guideSeen(app, D.id) && (!D.auto || D.auto(app, sc)));
  if (!fresh.length) { app.guideWait = null; return; }
  const key = app.router.name + ':' + fresh.map(D => D.id).join(',');
  if (!app.guideWait || app.guideWait.key !== key) app.guideWait = { key, t0: app.t };
  else if (app.t - app.guideWait.t0 >= WAIT_MS) openGuide(app, fresh, false);
}

function ringRect(g, x, y, w, h, col) { g.rect(x, y, w, 1, col); g.rect(x, y + h - 1, w, 1, col); g.rect(x, y, 1, h, col); g.rect(x + w - 1, y, 1, h, col); }
function drawOpen(app, sc) {
  const { g, W, H, input, t } = app, G = app.guide, c = g.c, n = G.steps.length, st = G.steps[G.i];
  const dt = Math.max(0, Math.min(100, t - G.lastT)); G.lastT = t;
  for (const D of G.defs) if (D.pause) D.pause(app, sc, dt);
  const B = G.defs[0].btn && G.defs[0].btn(app, sc);
  if (B) helpBtn(app, B[0], B[1], null);
  // 구멍: 앞 칸에서 새 칸으로 부드럽게
  const want = findRect(app, st.at, sc), k = ease(Math.min(1, (t - G.t0) / ENTER_MS));
  let hole = want;
  if (want && G.from) hole = want.map((v, j) => Math.round(G.from[j] + (v - G.from[j]) * k));
  G.cur = hole;
  c.fillStyle = DIM;
  if (hole) {
    const [x, y, w, h] = hole;
    c.fillRect(0, 0, W, y); c.fillRect(0, y + h, W, H - y - h); c.fillRect(0, y, x, h); c.fillRect(x + w, y, W - x - w, h);
    g.alpha(0.55 + 0.45 * Math.sin(t / 240), () => ringRect(g, x - 2, y - 2, w + 4, h + 4, ACC));
    ringRect(g, x - 1, y - 1, w + 2, h + 2, ACC_HI);
  } else c.fillRect(0, 0, W, H);
  const next = () => { if (G.i < n - 1) { G.from = G.cur; G.i++; G.t0 = app.t; prepStep(app); } else closeGuide(app, true); };
  input.hit('gd_block', 0, 0, W, H, next);   // 아무 데나 눌러도 다음(가린 화면은 안 눌림)
  // 말풍선: 가리키는 곳 아래(모자라면 위) · 꼭지는 그쪽을 향함
  const bx = 12, bw = W - 24, pad = 10, lh = lineH('body') + 3, lines = wrap(st.text, 'body', bw - pad * 2), bh = pad + lines.length * lh + 8 + 22 + 8;
  let by, up = null;
  if (hole) {
    const [, y, , h] = hole;
    const below = y + h + 12 + bh <= H - 6, above = y - 12 - bh >= 6;
    if (st.side === 'above' && above) { by = y - 12 - bh; up = false; }
    else if (below) { by = y + h + 12; up = true; }
    else if (above) { by = y - 12 - bh; up = false; }
    else by = Math.round(H / 2 - bh / 2);
  } else by = Math.round(H * 0.42 - bh / 2);
  const ka = k, slide = Math.round((1 - ka) * 6) * (up === false ? -1 : 1);
  by += slide;
  g.alpha(ka, () => {
    const S = T.card || T.panel;
    if (hole && up != null) {   // 꼭지(작은 세모)
      const tx = Math.max(bx + 14, Math.min(bx + bw - 14, hole[0] + hole[2] / 2));
      for (let j = 0; j < 6; j++) { const yy = up ? by - 6 + j : by + bh + 5 - j; g.rect(Math.round(tx - j), yy, j * 2 + 1, 1, S.frame); }
    }
    holo(g, bx, by, bw, bh, S, 16);
    lines.forEach((ln, j) => g.text(ln, bx + pad, by + pad + j * lh, { color: T.ptext.main }));
    // 몇 번째(점) · 건너뛰기 · 다음
    const ry = by + bh - 8 - 22;
    if (n > 1) for (let j = 0; j < n; j++) { const dx = bx + pad + j * 8; g.rect(dx, ry + 9, 5, 5, '#05070f'); g.rect(dx + 1, ry + 10, 3, 3, j === G.i ? ACC : '#4f84bf'); }
    const last = G.i === n - 1;
    button(app, 'gd_next', bx + bw - pad - 62, ry, 62, 22, last ? '확인' : '다음 ›', { style: 'gold', font: 'bold', onTap: next });
    if (!last) button(app, 'gd_skip', bx + bw - pad - 62 - 6 - 62, ry, 62, 22, G.replay ? '닫기' : '건너뛰기', { style: 'night', onTap: () => closeGuide(app, true) });
  });
}
