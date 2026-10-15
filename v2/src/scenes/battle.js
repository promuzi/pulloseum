import { arena1 } from '../art/bg.js';
import { arenaLife } from '../art/arenaLife.js';
import { icon, tinted } from '../art/icons.js';
import { drawBig, drawBigPose, drawPortrait, BGIMG } from '../art/sprites.js';
import { T, plate, msgBox, btnBody, tbar, tpips, padV, venueOf, holo } from '../art/theme.js';
import { CAT_ICON, CAT_NAME, SPECIES } from '../data/mock.js';
import { makeUnit, makeBattle, playTurn, elemMult, REST } from '../battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats } from '../battle/team.js';
import { listOf, mustSkip, canUse, canSwitch, lockOf, apply as applyFx } from '../battle/status.js';
import { button } from '../art/ui.js';
import { makeAttack, prepareBoards, boardCanvas, FRAME_MS, FRA } from '../battle/fx.js';
import { ATTACKS } from '../../../tools/pixel/big/attack.mjs';

// v2 전투(실제로 진행): 기술 고르기 → 상대 고르기(봇, 사람과 같은 정보만) → rules.js 한 턴 계산 → 사건을 차례로 보여 줌
//   선공 판정 → (자세) → 공격 연출(영상 굽기와 같은 attack.mjs 를 장마다) → 맞는 장에 판정·피해 → 되받아치기 → 턴 끝 기력 +1 → 다음 턴 / 승패
// 무대 = 1배 도트 270×348(배경 = 장소 경기장 그림, 받침·식물은 화분 굽 자리), 경기장 = 랭크로(venueOf).
const PANEL_H = 228, AY = 24;
// 먼(상대)·가까운(나) 받침 가운데(fx.js SPOTS · stage.mjs SPOTS 와 같음). 2026-10-15 사용자 "화분 아래 반석이 땅을 넘어 관중석까지 올라가 있어 · 두 식물이 좀 가까워도 돼":
//  콜로세움 그림의 관중석 벽 밑단 = 무대 y 133 → 상대 받침(18° 납작, 세로 11칸)은 그 아래 흙에, 둘 사이는 가로 118 → 106 · 세로 160 → 126칸(내 받침 오른 끝이 내 체력판에 안 닿게)
const EX = 186, EY = AY + 156, PX = 80, PY = AY + 282, FAR_K = 0.31;
const hasB = s => { const c = s.charCodeAt(s.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };
const ga = s => s + (hasB(s) ? '이' : '가'), eun = s => s + (hasB(s) ? '은' : '는'), eul = s => s + (hasB(s) ? '을' : '를');
// 3:3 교체전 상대 팀(시제품 — 서버가 붙여 줄 자리): 물 · 대지 · 바람(내 기본 팀 풀·불·물과 상성이 엇갈리게)
const FOE3 = ['vine_water', 'gaia', 'flower_wind'];
// 팀 셋 표시: 밝은 칸 = 남은 식물, 흰 테 = 앞에 선 식물, 어두운 × = 쓰러짐
function teamPips(g, x, y, team, active) {
  team.forEach((u, i) => {
    const X = x + i * 12, dead = u.hp <= 0, on = u === active;
    g.rect(X, y, 10, 8, on ? '#e4fbff' : '#0a1e2c');
    g.rect(X + 1, y + 1, 8, 6, dead ? '#1a2230' : '#3fb8e0');
    if (dead) { for (let k = 0; k < 4; k++) { g.px(X + 3 + k, y + 2 + k, '#5a6a82'); g.px(X + 6 - k, y + 2 + k, '#5a6a82'); } }
    else g.rect(X + 2, y + 2, 4, 1, '#c8f4ff');
  });
}
const TIER = { miss: ['빗나감', 'dim', '빗나갔다!'], graze: ['스침', 'sub', '살짝 스쳤다'], hit: ['정타', 'main', ''], crit: ['치명!', 'gold', '급소에 맞았다!'] };

// 체력판(2026-10-15 사용자 "체력이 얼마나 남았는지가 창 아래에 있어 — 체력바 바로 옆에", "행동력도 이런 식으로 얼마나 남았는지", "식물 아이콘은 창에 넣을 필요 없어"):
//  (상대만) 재배사 · 랭크 / 이름 + 속성 / 체력 막대 + 바로 옆 체력 숫자 / 에너지 칸 + 바로 옆 에너지 숫자. 봇·사람 구분 없이 같은 정보만.
//  아래 = 효과별 작은 창(statusWins). 판 높이를 돌려줌(효과 창을 바로 아래 붙이려고)
const BOX_W = 140;
const boxH = mine => (mine ? 46 : 58);
function infoBox(app, x0, y0, u, bar, en, mine) {
  const { g, t } = app, w = BOX_W, h = boxH(mine), P = T.ptext, fx = bar.fx, S = fx && HURT[fx.kind], age = fx ? t - fx.t0 : 1e9;
  let x = x0, y = y0;
  if (S && S.shake && age < S.shakeMs) { const a = Math.max(1, Math.round(S.shake * (1 - age / S.shakeMs))); x += (Math.floor(age / 40) % 2 ? 1 : -1) * a; y += Math.floor(age / 60) % 2 ? Math.ceil(a / 2) : 0; }   // 판째 흔들림(도트 칸 단위, 점점 작게)
  plate(g, x, y, w, h);
  if (S && S.frame && age < S.flash) { g.rect(x - 1, y - 1, w + 2, 1, '#ffffff'); g.rect(x - 1, y + h, w + 2, 1, '#ffffff'); g.rect(x - 1, y, 1, h, '#ffffff'); g.rect(x + w, y, 1, h, '#ffffff'); }   // 치명 = 판 테두리 번쩍
  let yy = y + 5;
  const tx = x + 8;
  if (!mine) { g.text(`${u.trainer} · ${u.rank}`, tx, yy, { color: P.sub }); yy += 13; }
  g.text(u.name, tx, yy, { font: 'bold', color: P.main });
  g.img(icon(u.el), tx + g.textW(u.name, 'bold') + 5, yy + 1);
  yy += 16;
  // 숫자 = 초록 막대(지금 체력)와 같이 내려감, 깎인 주황 칸이 머무는 동안만 주황빛. 막대 폭은 가장 긴 숫자(최대/최대) 기준으로 고정(숫자 자릿수가 줄어도 막대가 안 늘어나게)
  const hpTxt = `${Math.ceil(bar.main)}/${u.max}`, bw = w - 16 - g.textW(`${u.max}/${u.max}`, 'bold') - 5;
  hpBar(g, tx, yy + 3, bw, 7, bar, u.max, t);
  g.text(hpTxt, x + w - 8, yy, { font: 'bold', color: S && age < S.hold ? '#ffd090' : P.main, align: 'right' });
  yy += 13;
  tpips(g, tx - 1, yy + 1, en, u.energyMax, 7);
  g.text(`에너지 ${en}/${u.energyMax}`, x + w - 8, yy - 1, { color: P.sub, align: 'right' });
  return h;
}
// 버프·디버프 창(메카 게임 적 상태처럼 — 효과마다 작은 반투명 창: 아이콘 · 이름 · 겹침 수, 풀리면 사라짐).
//  2026-10-15 사용자 "불필요하게 넓어, 한 줄에 3개씩", "디버프 별로 색을 다르게, 독·화상 등 추가" →
//  체력판 바로 아래 한 줄에 셋(45·45·46칸) · 두 줄까지(넘치면 마지막 칸 = +n). 이로운 효과 = 청록 홀로그램 하나로, 해로운 효과 = 효과마다 제 색.
//  같은 날 사용자 "창에 숫자는 중첩수만, 빙결과 감전도 마찬가지로" → 숫자는 겹침 수가 있는 효과(stack = 최대 겹침)만: 독(5) · 빙결·감전(3 — 다 차면 한 턴 쉬고 0).
//  남은 턴은 숫자로 안 보임(턴 수는 논의 중). 이름은 두 글자까지(창 폭).
const STATUS = {
  guard: { name: '방어', icon: 'shield', buff: true }, evade: { name: '회피', icon: 'speed', buff: true },
  critReady: { name: '치명', icon: 'crit', buff: true }, initReady: { name: '선공', icon: 'ff', buff: true },
  atkUp: { name: '공격↑', buff: true }, defDown: { name: '방어↓', col: '#ff6a6a' },
  burn: { name: '화상', icon: 'fire', col: '#ff7a3a' }, poison: { name: '독', icon: 'poison', col: '#b866ff', stack: 5 },
  wet: { name: '젖음', icon: 'water', col: '#4f9dff' }, chill: { name: '빙결', icon: 'ice', col: '#c4ecff', stack: 3 },
  shock: { name: '감전', icon: 'bolt', col: '#ffd84a', stack: 3 }, stun: { name: '기절', icon: 'star', col: '#ff86c8' },
  bind: { name: '덩굴', icon: 'vine', col: '#6fd25c' }, spore: { name: '포자', icon: 'mushroom', col: '#8fe0b8', stack: 3 },
  // 쉬는 차례(빙결 3 = 얼음 · 감전 3 = 마비) · 추가 디버프(2026-10-15 사용자 "기생 씨앗·그늘·꽃가루 좋아보임, 나머지도 다 넣고") · 버팀(쉬고 난 다음 턴)
  frozen: { name: '얼음', icon: 'ice', col: '#e8f8ff' }, paral: { name: '마비', icon: 'bolt', col: '#ffe680' },
  leech: { name: '기생', icon: 'seed', col: '#c8e04a' }, shade: { name: '그늘', icon: 'shade', col: '#a0a3c8' },
  pollen: { name: '꽃가루', icon: 'flower', col: '#f5c46a' }, taunt: { name: '도발', icon: 'target', col: '#ff5a5a' },
  root: { name: '뿌리', icon: 'tree', col: '#c08a5a' }, weak: { name: '약화', icon: 'down', col: '#ff8a8a' },
  corrode: { name: '부식', icon: 'potion', col: '#b9a04a' }, brace: { name: '버팀', icon: 'lock', buff: true },
};
// 전투 사건 문구(이름 = 그 사건 때의 식물)
const FX_MSG = {
  burn: x => `${ga(x)} 화상을 입었다!`, poison: (x, e) => (e.n > 1 ? `${x}에게 독이 ${e.n}겹 쌓였다!` : `${ga(x)} 독에 걸렸다!`), wet: x => `${ga(x)} 흠뻑 젖었다! 둔해지고 적중·방어가 떨어진다`,
  chill: (x, e) => `${ga(x)} 얼어 간다!` + (e.wet ? ' 젖어 있어서 더 쌓였다!' : ''), shock: (x, e) => `${ga(x)} 감전됐다!` + (e.wet ? ' 젖어 있어서 더 쌓였다!' : ''),
  frozen: x => `${ga(x)} 꽁꽁 얼어붙었다!`, paral: x => `${ga(x)} 감전되어 몸이 굳었다!`, stun: x => `${ga(x)} 기절했다!`,
  spore: (x, e) => `${x}에게 포자가 붙었다!` + (e.n > 1 ? ` (포자 ${e.n})` : ''),
  bind: (x, e) => `덩굴이 ${x}의 ${eul(e.skill)} 묶었다!`, leech: x => `${x}에게 기생 씨앗이 심어졌다!`, shade: x => `${x}에게 그늘이 드리웠다! 에너지가 안 찬다`,
  pollen: x => `${x}에게 꽃가루가 날렸다! 적중이 떨어진다`, taunt: x => `${ga(x)} 도발에 넘어갔다! 자세를 못 잡는다`, root: x => `${x}의 뿌리가 묶였다! 교체할 수 없다`,
  weak: x => `${ga(x)} 약해졌다! 공격이 떨어진다`, corrode: x => `${x}의 껍질이 부식됐다! 방어가 떨어진다`,
};
const CURE_FIRE = { frozen: '얼음이 녹았다', chill: '냉기가 녹았다', wet: '몸이 말랐다', spore: '포자가 탔다' };
const SKIP_WHY = { frozen: '얼어서', paral: '몸이 굳어서', stun: '기절해서' };
// 내가 쉬는 차례일 때 대사(넘기기 단추를 누르게)
// 2026-10-15 사용자 "넘기기 말고 문구만 뜨고 자동으로 넘기게" — 이 문구가 잠깐 뜬 뒤 턴이 저절로 진행됨(SKIP_AUTO_MS)
const SKIP_STATE = { frozen: '얼어 있어서', paral: '몸이 굳어서', stun: '기절해 있어서' }, SKIP_AUTO_MS = 1100;
function skipMsg(sc) { const u = sc.B.me; sc.v.msg = `${ga(u.name)} ${SKIP_STATE[u.eff.skip.src] || ''} 움직일 수 없다!`; }
const SW_ON = { fill: '#123a52', fill2: '#16465f', frame: '#97e8f7', frameHi: '#e4fbff', frameLo: '#4c88a9', text: '#d8faff', num: '#97e8f7' };
const hexMix = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const swCache = new Map();
const swStyle = col => { let s = swCache.get(col); if (!s) swCache.set(col, s = { fill: hexMix(col, '#0a0c18', 0.8), fill2: hexMix(col, '#0a0c18', 0.72), frame: col, frameHi: hexMix(col, '#ffffff', 0.55), frameLo: hexMix(col, '#000000', 0.45), text: hexMix(col, '#ffffff', 0.72), num: hexMix(col, '#ffffff', 0.35) }); return s; };
const SW_W = 45, SW_H = 16, SW_GAP = 2;
function statusWins(g, x, y, list) {
  const shown = list.length > 6 ? [...list.slice(0, 5), { more: list.length - 5 }] : list;
  shown.forEach((st, i) => {
    const c = i % 3, X = x + c * (SW_W + SW_GAP), w = c === 2 ? BOX_W - 2 * (SW_W + SW_GAP) : SW_W, Y = y + Math.floor(i / 3) * (SW_H + 2);
    if (st.more) { holo(g, X, Y, w, SW_H, SW_ON, 16); g.text(`+${st.more}`, X + (w >> 1), Y + 2, { font: 'bold', color: SW_ON.text, align: 'center' }); return; }
    const D = STATUS[st.id] || { name: st.name || st.id, icon: 'sparkle', buff: !!st.buff }, S = D.buff ? SW_ON : swStyle(D.col || '#ff6a6a');
    holo(g, X, Y, w, SW_H, S, 16);
    // 가운데 정렬: [아이콘][이름][겹침 수] — 세 글자 이름(꽃가루)은 아이콘 틈을 줄이고, 그래도 넘치면 아이콘을 뺌
    const nw = g.textW(D.name), num = D.stack && st.n ? String(Math.min(st.n, D.stack)) : null, rest = nw + (num ? 2 + g.textW(num) : 0);
    const ic = D.icon && rest + 11 <= w - 4 ? icon(D.icon) : null, gap = ic && rest + 12 > w - 4 ? 11 : 12;
    const cw = (ic ? gap : 0) + rest;
    let cx = X + Math.max(2, (w - cw) >> 1);
    if (ic) { g.img(ic, cx, Y + 3 + ((11 - ic.height) >> 1)); cx += gap; }
    g.text(D.name, cx, Y + 2, { color: S.text }); cx += nw + 2;
    if (num) g.text(num, cx, Y + 2, { color: S.num });
  });
}

// 체력바 연출(2026-10-15 사용자 "체력바에서 줄어든 만큼 먼저 주황색으로 뜨고, 이게 나중에 쭉 줄어들게. 치명타나 피해가 크면 흔들림과 번쩍임,
//  효과가 안 좋거나 중간일 때도 다르게" — 근거: 격투 게임의 늦게 줄어드는 막대(스트리트 파이터 4 흰 체력은 약 1초 머문 뒤 변함, 철권 회복 가능 체력),
//  소울 시리즈의 새로 깎인 칸 따로 칠하기, 포켓몬은 막대가 일정 속도로 줄고 효과는 문구·소리로, 타격감 연구의 번쩍임 50~100ms):
//  본 막대는 맞자마자 새 값으로 빠르게, 그 사이 '깎인 칸'이 주황으로 머물다가(hold) 본 막대까지 쭉 줄어듦(drain). 연달아 맞으면 깎인 칸이 쌓인다.
const HURT = {
  graze: { hold: 260, drain: 380, main: 200, shake: 0, shakeMs: 0, flash: 0, col: '#f6cf8a', hi: '#fff0d0' },                  // 스침·방어로 막음 = 옅은 주황, 짧게
  hit: { hold: 420, drain: 460, main: 120, shake: 1, shakeMs: 140, flash: 0, col: '#f39a3c', hi: '#ffd090' },                    // 정타
  big: { hold: 600, drain: 520, main: 90, shake: 2, shakeMs: 260, flash: 90, col: '#ff8a2a', hi: '#ffc080', blink: true },       // 효과 굉장·체력 25% 넘게
  crit: { hold: 720, drain: 560, main: 70, shake: 3, shakeMs: 340, flash: 120, col: '#ff7a1a', hi: '#ffb070', blink: true, frame: true },   // 치명
};
const easeOut = k => 1 - (1 - k) ** 2;
function hpBar(g, x, y, w, h, bar, max, t) {
  const B = T.bar, rm = Math.max(0, Math.min(1, bar.main / max)), rt = Math.max(0, Math.min(1, bar.trail / max)), c = rm <= 0.2 ? B.low : rm <= 0.5 ? B.mid : B.hp;
  g.rect(x, y, w, h, T.ink); g.rect(x + 1, y + 1, w - 2, h - 2, B.back);
  const fw = Math.round((w - 2) * rm), tw = Math.round((w - 2) * rt), fx = bar.fx, S = fx ? HURT[fx.kind] : HURT.hit, age = fx ? t - fx.t0 : 1e9;
  if (tw > fw) {   // 깎인 칸: 큰 피해·치명은 처음에 하얗게 번쩍, 머무는 동안 두 주황이 번갈아 깜빡
    const white = S.flash && age < S.flash, alt = S.blink && age < S.hold && Math.floor(age / 90) % 2;
    g.rect(x + 1 + fw, y + 1, tw - fw, h - 2, white ? '#ffffff' : alt ? S.hi : S.col);
    g.rect(x + 1 + fw, y + 1, tw - fw, 1, white ? '#ffffff' : S.hi);
  }
  if (fw > 0) { g.rect(x + 1, y + 1, fw, h - 2, c[0]); g.rect(x + 1, y + 1, fw, 1, c[1]); if (h > 4) g.rect(x + 1, y + h - 2, fw, 1, c[2]); }
}

// lock = 'bind'(덩굴로 묶임) | 'taunt'(도발 — 자세 못 씀) | null
function skillButton(app, x, y, w, h, sk, can, lit, onTap, lock = null) {
  const { g, input } = app;
  if (!sk) { btnBody(g, x, y, w, h, T.btn.off, true); g.text('빈 칸', x + w / 2, y + h / 2 - 6, { color: T.btn.off.text, align: 'center' }); return; }
  const id = 'sk_' + sk.id, down = can && input.isPressed(id), S = can ? T.btn.primary : T.btn.off;
  const { yy } = btnBody(g, x, y, w, h, S, down);
  if (lit) { g.rect(x - 1, yy - 1, w + 2, 1, T.text.gold); g.rect(x - 1, yy + h - 1 - (down ? 1 : 0), w + 2, 1, T.text.gold); g.rect(x - 1, yy, 1, h - 1, T.text.gold); g.rect(x + w, yy, 1, h - 1, T.text.gold); }
  const cat = sk.cats[0];
  g.text(sk.name, x + 8, yy + 5, { font: 'bold', color: S.text });
  if (sk.el) g.img(can ? icon(sk.el) : tinted(sk.el, S.text), x + w - 19, yy + 5);
  g.img(can ? icon(CAT_ICON[cat]) : tinted(CAT_ICON[cat], S.text), x + 8, yy + 23);
  g.text(CAT_NAME[cat], x + 22, yy + 23, { color: S.text });
  if (lock) {   // 묶인 칸: 덩굴 두 줄이 가로지르고 오른쪽 아래에 까닭
    const L = STATUS[lock === 'bind' ? 'bind' : 'taunt'];
    if (lock === 'bind') for (let k = 0; k < w - 4; k++) { const wv = Math.round(Math.sin(k / 5) * 2); g.px(x + 2 + k, yy + 15 + wv, '#2f7a2a'); g.px(x + 2 + k, yy + 16 + wv, L.col); g.px(x + 2 + k, yy + 29 - wv, '#2f7a2a'); }
    g.text(lock === 'bind' ? '덩굴에 묶임' : '도발 — 못 씀', x + w - 9, yy + 23, { font: 'bold', color: L.col, align: 'right' });
  } else if (!sk.cost) g.text('무료', x + w - 9, yy + 23, { color: S.text, align: 'right' });
  else { g.text(String(sk.cost), x + w - 9, yy + 23, { font: 'bold', color: S.text, align: 'right' }); g.img(can ? icon('energy') : tinted('energy', S.text), x + w - 23, yy + 23); }
  if (can) input.hit(id, x, y, w, h, onTap, 2);
}

export const battle = {
  // 경기장 = 랭크 단계로(브론즈·실버 온실 → 골드·플래티넘 우주선 → 다이아 이상 밤 정원), 촬영·시험은 ?venue= 로 고름
  theme(app) { return this.venue || venueOf(app.state.tournament?.tier); },
  enter(p) { this.p = p; this.venue = p.venue || null; this.B = null; },
  // 판 차리기(첫 그림 때 — 3:3은 내 식물 셋을 상태에서 읽음)
  setup(app) {
    const p = this.p, s = app.state;
    const seed = p.seed ? +p.seed : p.phase ? 20261015 : (Date.now() & 0x7fffffff);   // 판 씨앗은 판을 열 때 한 번(계산 경로 밖 — 서버 권위 때는 서버가 줌), 촬영은 고정
    this.mode = p.mode === 'swap3' ? 'swap3' : '1v1';
    if (this.mode === 'swap3') {
      const team = (s.team && s.team.length === 3 ? s.team : [s.active, ...s.plants.map((_, i) => i).filter(i => i !== s.active)].slice(0, 3)).map(i => s.plants[i]).filter(Boolean);
      const me = team.map(pl => { const sp = SPECIES[pl.key]; return makeUnit('me', sp, { key: pl.key, name: pl.name, pot: pl.pot, ...protoStats(sp) }); });
      const foe = FOE3.map(k => { const sp = SPECIES[k]; return makeUnit('foe', sp, { key: k, ...protoStats(sp), trainer: '코스모싹', rank: '브론즈 2' }); });
      this.B = makeTeamBattle({ me, foe, seed });
    } else {
      // 검토·영상용: ?me=종&foe=종 으로 1:1 식물을 바꿈(시제품 능력치), ?pre=foe:wet,poison3;me:burn 으로 효과를 미리 걸어 둠
      const mk = (id, k, extra = {}) => { const sp = SPECIES[k]; return makeUnit(id, sp, { key: k, name: sp.name, ...protoStats(sp), ...extra }); };
      const me = p.me && SPECIES[p.me] ? mk('me', p.me) : makeUnit('me', SPECIES.flower_grass, { key: 'flower_grass', name: '페탈로즈', hp: 220, atk: 35, def: 24, spd: 30, crit: 5 });
      const foe = p.foe && SPECIES[p.foe] ? mk('foe', p.foe, { trainer: '코스모싹', rank: '브론즈 2' }) : makeUnit('foe', SPECIES.vine_water, { key: 'vine_water', name: '타이드바인', hp: 240, atk: 32, def: 22, spd: 26, crit: 5, trainer: '코스모싹', rank: '브론즈 2' });
      this.B = makeBattle({ me, foe, seed });
    }
    const B = this.B;
    if (p.pre) for (const part of String(p.pre).split(';')) {   // 효과 미리 걸기(검토·영상용, 1:1·3:3 앞 식물)
      const [who, ids] = part.split(':'), u = B[who], by = B[who === 'me' ? 'foe' : 'me'];
      if (u && ids) for (const tok of ids.split(',')) { const m = tok.match(/^([a-z]+)(\d*)$/); if (m) applyFx(u, m[1], +(m[2] || 1), { turn: 1, rng: () => 0.5, ev: [], by }); }
    }
    if (p.energy) { B.me.energy = +p.energy; B.foe.energy = +p.energy; }
    this.seed = seed;
    this.v = { hp: { me: B.me.hp, foe: B.foe.hp }, bar: { me: { main: B.me.hp, trail: B.me.hp, fx: null }, foe: { main: B.foe.hp, trail: B.foe.hp, fx: null } }, en: { me: B.me.energy, foe: B.foe.energy }, view: { me: B.me, foe: B.foe }, gone: {}, msg: `${eun(B.me.name)} 무엇을 할까?`, phase: 'pick', steps: [], si: 0, t0: null, pops: [], stance: {}, turn: 1, picked: null, uid: 0, eff: { me: listOf(B.me), foe: listOf(B.foe) } };
    if (mustSkip(B.me)) skipMsg(this);
    this.sheet = p.sheet ? { forced: false } : null;   // 교체 창(?sheet=1 = 열린 채 촬영)
    this.shot = p.phase === 'hit' ? 'hit' : null;   // 촬영용: 첫 턴 공격이 맞는 장에서 멈춘 그림
    if (this.shot) this.pick(null, B.me.kit[3]);
  },
  // 기술 고르기 — 쉬는 차례(얼음·마비·기절)면 무엇을 눌러도 '쉬기'(넘기기 단추), 덩굴·도발로 막힌 칸은 못 고름
  pick(app, sk) {
    const B = this.B, v = this.v;
    if (v.phase !== 'pick') return;
    const rest = mustSkip(B.me);
    if (rest) sk = REST; else if (!sk || !canUse(B.me, sk)) return;
    v.picked = sk.id; v.en.me -= sk.cost || 0; v.autoSkipAt = null;
    v.eff = { me: listOf(B.me), foe: listOf(B.foe) };   // 이번 턴 시작 모습(계산이 끝나면 B의 효과는 이미 턴 끝 상태)
    const turn = this.mode === 'swap3' ? playTurn3(B, rest ? { kind: 'rest' } : { kind: 'skill', skill: sk }) : playTurn(B, sk);
    this.play(app, this.buildSteps(turn));
  },
  // 교체(3:3): 내 차례에 고르면 턴을 쓰고, 쓰러진 자리면 공짜(sendIn). 뿌리 묶기면 못 바꿈(쓰러진 자리 채우기는 됨)
  pickSwitch(app, to) {
    const B = this.B, v = this.v;
    if (this.sheet && this.sheet.forced) { this.sheet = null; const e = sendIn(B, to); this.play(app, [this.switchStep(e), { kind: 'end', ms: 300 }]); return; }
    if (v.phase !== 'pick' || !canSwitch(B.me)) return;
    this.sheet = null; v.picked = 'swap';
    v.eff = { me: listOf(B.me), foe: listOf(B.foe) };
    this.play(app, this.buildSteps(playTurn3(B, { kind: 'switch', to })));
  },
  play(app, steps) { const v = this.v; v.steps = steps; v.si = 0; v.t0 = app ? app.t : null; v.phase = 'play'; if (app) this.startStep(v.steps[0], app.t); },
  switchStep(e) {
    const B = this.B, from = B.team[e.who][e.from], to = B.team[e.who][e.to];
    const msg = e.who === 'me' ? (e.forced ? `가라, ${to.name}!` : `${from.name}, 돌아와! 가라, ${to.name}!`) : `${ga(to.trainer || '상대')} ${eul(to.name)} 내보냈다!`;
    return { kind: 'switch', ms: 1000, who: e.who, fromU: e.forced ? null : from, toU: to, hp: e.hp, list: e.list, msg };
  },
  buildSteps(turn) {
    const B = this.B, nm = id => B[id].name, sk = id => (id === 'me' ? turn.mySkill : turn.foeSkill), out = [];
    // 성립하는 자세(회피 = 늘, 방어 = 후공)는 맞기 전에 보여 준다 — 계산 순서(후공 차례)대로면 공격 뒤에 자세가 나와 어색함
    const evs = [...turn.events];
    for (let i = 0; i < evs.length; i++) if (evs[i].t === 'hit') { const j = evs.findIndex((e, k) => k > i && e.t === 'stance' && e.who === evs[i].to && e.active); if (j > i) { evs.splice(i, 0, evs.splice(j, 1)[0]); i++; } }
    for (const e of evs) {
      if (e.t === 'switch') out.push(this.switchStep(e));
      else if (e.t === 'faint') out.push({ kind: 'faint', ms: 900, who: e.who, msg: `${ga(e.name)} 쓰러졌다!` });
      else if (e.t === 'first') out.push({ kind: 'first', ms: 750, who: e.who, msg: `${ga(nm(e.who))} 먼저 움직인다!` });
      else if (e.t === 'stance') out.push({ kind: 'stance', ms: 950, who: e.who, stance: e.kind, active: e.active, msg: `${nm(e.who)}의 ${sk(e.who).name}!` + (e.active ? '' : ' 하지만 먼저라 막을 게 없다') });
      else if (e.t === 'hit') { const s = sk(e.who), ak = e.atkKey || B[e.who].key, tk = e.tgtKey || B[e.to].key, A = ATTACKS[s.fx || ak] || ATTACKS.flower_grass; out.push({ kind: 'attack', ms: FRA * FRAME_MS, who: e.who, to: e.to, ev: e, skill: s, uid: ++this.v.uid, anim: makeAttack(A, ak, tk, e.who === 'foe', this.seed % 97 + out.length), msg: `${nm(e.who)}의 ${s.name}!` }); }
      else if (e.t === 'counter') out.push({ kind: 'counter', ms: 900, who: e.who, to: e.to, ev: e, msg: `${nm(e.who)}의 되받아치기!` });
      else if (e.t === 'energy') out.push({ kind: 'note', ms: 650, msg: `${nm(e.who)} 에너지 +${e.gain}` });
      else if (e.t === 'status') out.push({ kind: 'note', ms: 650, msg: `${nm(e.to)}에게 ${e.status}` });
      // 상태 효과(status.js 사건 — list = 그 순간 창 목록)
      else if (e.t === 'fx') out.push({ kind: 'fx', ms: 850, ev: e, side: e.to, msg: (FX_MSG[e.id] || (x => x))(e.name, e) });
      else if (e.t === 'immune') out.push({ kind: 'fxnote', ms: 700, ev: e, side: e.to, msg: `${e.name}에게는 ${ga(STATUS[e.id].name)} 통하지 않는다` });
      else if (e.t === 'resist') out.push({ kind: 'fxnote', ms: 700, ev: e, side: e.to, msg: `${ga(e.name)} 버텼다! 방금 쉬어서 다시 쉬지 않는다` });
      else if (e.t === 'cure') out.push({ kind: 'cure', ms: 750, ev: e, side: e.to, msg: e.why === 'water' ? `물에 ${e.name}의 화상이 꺼졌다!` : `불에 ${e.name}의 ${e.ids.slice(0, 2).map(k => CURE_FIRE[k]).join(' · ')}!` });
      else if (e.t === 'bloom') out.push({ kind: 'bloom', ms: 900, ev: e, side: e.who, msg: `${e.name}의 포자가 피어났다! 숨이 막힌다` });
      else if (e.t === 'grow') out.push({ kind: 'expire', ms: 0, ev: e, side: e.who });
      else if (e.t === 'skip') out.push({ kind: 'skipT', ms: 900, ev: e, side: e.who, msg: `${ga(e.name)} ${SKIP_WHY[e.src] || ''} 움직일 수 없다!` });
      else if (e.t === 'tick') out.push({ kind: 'tick', ms: 750, ev: e, side: e.who, msg: `${ga(e.name)} ${e.id === 'burn' ? '화상' : '독'}으로 아파한다!` });
      else if (e.t === 'drain') out.push({ kind: 'drain', ms: 950, ev: e, side: e.who, msg: `기생 씨앗이 ${e.name}의 체력을 빨아들인다!` });
      else if (e.t === 'noEnergy') out.push({ kind: 'note', ms: 700, msg: e.why === 'spore' ? `포자 때문에 숨이 막혀 ${e.name}의 에너지가 차지 않았다` : `그늘 때문에 ${e.name}의 에너지가 차지 않았다` });
      else if (e.t === 'expire') out.push({ kind: 'expire', ms: 0, ev: e, side: e.who });
    }
    out.push({ kind: 'end', ms: 450 });
    return out;
  },
  startStep(st, t) {
    const v = this.v, B = this.B;
    if (!st) return;
    if (st.msg) v.msg = st.msg;
    const last = B.log[B.log.length - 1];
    if ((st.kind === 'stance' || st.kind === 'attack') && st.who === 'foe' && !v.foePaid && last && last.foeSkill) { v.en.foe -= last.foeSkill.cost || 0; v.foePaid = true; }
    if (st.kind === 'stance') v.stance[st.who] = { kind: st.stance, active: st.active };
    if (st.kind === 'counter') { this.hurt(st.to, st.ev.dmg, 'hit', t); this.pop(st.to, `-${st.ev.dmg}`, 'bad', t); }
    // 상태 효과: 창 목록을 그 순간 것으로 · 걸리면 효과 이름이 식물 위로 · 지속 피해·빨아들이기는 체력바도
    if (st.ev && st.ev.list && st.side) v.eff[st.side] = st.ev.list;
    if (st.kind === 'fx') { const S = STATUS[st.ev.id]; if (S) this.pop(st.side, S.name + (S.stack && st.ev.n ? ' ' + st.ev.n : '') + '!', null, t, false, -16, S.col || '#97e8f7'); }
    if (st.kind === 'skipT' && st.side === 'me' && st.ev.refund) v.en.me += st.ev.refund;
    if (st.kind === 'tick') { this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS[st.ev.id].col); }
    if (st.kind === 'bloom') { this.hurt(st.side, st.ev.dmg, 'hit', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS.spore.col); this.pop(st.side, '포자!', null, t, false, -16, STATUS.spore.col); }
    if (st.kind === 'drain') {
      this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS.leech.col);
      if (st.ev.to && st.ev.heal > 0) { this.heal(st.ev.to, st.ev.heal); this.pop(st.ev.to, `+${st.ev.heal}`, null, t, true, 0, '#7ef0a0'); }
      if (st.ev.to && st.ev.list2) v.eff[st.ev.to] = st.ev.list2;
    }
    if (st.kind === 'end') { v.en = { me: B.me.energy, foe: B.foe.energy }; }
  },
  heal(side, amt) { const v = this.v, u = v.view[side]; v.hp[side] = Math.min(u ? u.max : 9999, v.hp[side] + amt); v.bar[side] = { main: v.hp[side], trail: v.hp[side], fx: null }; },
  // 교체 단계 가운데쯤: 보이는 식물·체력판을 들어온 식물로(체력 = 들어올 때 값)
  swapView(st) { const v = this.v; st.swapped = true; v.view[st.who] = st.toU; v.gone[st.who] = false; v.hp[st.who] = st.hp; v.bar[st.who] = { main: st.hp, trail: st.hp, fx: null }; v.stance[st.who] = null; if (st.list) v.eff[st.who] = st.list; },
  // 맞기: 본 막대 목표를 내리고 깎인 칸은 지금 보이는 높이(연달아 맞으면 남은 깎인 칸 위에서)부터
  hurt(side, dmg, kind, t) {
    const v = this.v, b = v.bar[side], before = v.hp[side];
    v.hp[side] = Math.max(0, before - dmg);
    b.fx = { kind, t0: t, from: Math.max(b.trail, b.main), mainFrom: b.main };
  },
  applyHit(st, t) {
    const v = this.v, e = st.ev, A = this.B[st.who], dEl = e.tgtEl || this.B[st.to].el;
    st.applied = true;
    const [label, tone, line] = TIER[e.tier];
    const great = e.tier !== 'miss' && elemMult(st.skill.el, dEl) > 1, maxHp = (v.view[st.to] || this.B[st.to]).max;
    if (e.tier !== 'miss') {
      const kind = e.tier === 'crit' ? 'crit' : (great || e.dmg >= maxHp * 0.25) ? 'big' : (e.tier === 'graze' || e.guard) ? 'graze' : 'hit';
      this.hurt(st.to, e.dmg, kind, t); this.pop(st.to, `-${e.dmg}`, e.tier === 'crit' ? 'gold' : 'bad', t, true);
    }
    this.pop(st.to, label, tone, t, false, -16);
    const extra = [line, great ? '효과가 굉장하다!' : '', e.guard ? '방어 자세로 막았다' : '', e.evade && e.tier !== 'miss' ? '피하려 했지만' : ''].filter(Boolean).join(' · ');
    if (extra) v.msg = `${A.name}의 ${st.skill.name}! ${extra}`;
  },
  pop(who, text, tone, t, big = false, dy = 0, col = null) { const [x, y] = who === 'me' ? [PX, PY - 92] : [EX, EY - 92]; this.v.pops.push({ text, tone, t0: t, x, y: y + dy, big, col }); },
  tick(app) {
    const v = this.v, t = app.t;
    // 내가 쉬는 차례: 문구만 잠깐 보이고 턴이 저절로 진행(3:3도 교체 못 함)
    if (v.phase === 'pick' && !this.shot && !(this.p && this.p.phase) && mustSkip(this.B.me)) {   // 촬영(?phase=)은 멈춘 그림 그대로
      if (v.autoSkipAt == null) v.autoSkipAt = t + SKIP_AUTO_MS;
      else if (t >= v.autoSkipAt) { v.autoSkipAt = null; this.pick(app, REST); }
    }
    if (v.phase === 'play') {
      if (v.t0 == null) { v.t0 = t; this.startStep(v.steps[v.si], t); }
      let st = v.steps[v.si];
      if (this.shot) {   // 촬영: 첫 공격 단계의 맞은 직후 장에 멈춤
        const ai = v.steps.findIndex(s => s.kind === 'attack');
        if (ai >= 0 && v.si !== ai) { for (let i = v.si + 1; i <= ai; i++) this.startStep(v.steps[i], t); v.si = ai; v.t0 = t - (v.steps[ai].anim.I + 1) * FRAME_MS; }
        return;
      }
      while (st && t - v.t0 >= st.ms) {
        if (st.kind === 'attack' && !st.applied) this.applyHit(st, t);
        if (st.kind === 'switch' && !st.swapped) this.swapView(st);
        if (st.kind === 'faint') v.gone[st.who] = true;
        v.t0 += st.ms; v.si++; st = v.steps[v.si];
        if (st) this.startStep(st, t);
      }
      if (st && st.kind === 'switch' && !st.swapped && t - v.t0 >= st.ms * 0.45) this.swapView(st);
      if (!st) this.finishTurn(app);
    } else if (v.phase === 'over' && !v.leaving && t - v.overT0 > 1700) { v.leaving = true; app.go('result', { win: this.B.over === 'win', venue: T.key }, 'shutter'); }   // 한 번만(매 장 부르면 전환이 계속 처음부터)
    for (const k of ['me', 'foe']) {
      const b = v.bar[k], to = v.hp[k], fx = b.fx;
      if (!fx) { b.main = b.trail = to; continue; }
      const S = HURT[fx.kind], age = t - fx.t0;
      b.main = fx.mainFrom + (to - fx.mainFrom) * Math.min(1, age / S.main);
      b.trail = age < S.hold ? fx.from : fx.from + (to - fx.from) * easeOut(Math.min(1, (age - S.hold) / S.drain));
      if (age >= S.hold + S.drain && age >= S.shakeMs) { b.fx = null; b.main = b.trail = to; }
    }
    v.pops = v.pops.filter(p => t - p.t0 < 1100);
  },
  finishTurn(app) {
    const B = this.B, v = this.v;
    v.hp = { me: B.me.hp, foe: B.foe.hp }; v.en = { me: B.me.energy, foe: B.foe.energy }; v.stance = {}; v.foePaid = false; v.turn = B.turn;
    if (!B.need) { v.view = { me: B.me, foe: B.foe }; v.gone = {}; v.eff = { me: listOf(B.me), foe: listOf(B.foe) }; }
    if (B.over) { v.phase = 'over'; v.overT0 = app.t; v.msg = B.over === 'win' ? (this.mode === 'swap3' ? '상대 식물을 모두 쓰러뜨렸다!' : `${ga(B.foe.name)} 쓰러졌다!`) : (this.mode === 'swap3' ? '내 식물이 모두 쓰러졌다…' : `${ga(B.me.name)} 쓰러졌다…`); }
    else if (B.need === 'me') { v.phase = 'need'; v.picked = null; v.msg = '다음에 내보낼 식물을 골라 줘!'; this.sheet = { forced: true }; }
    else { v.phase = 'pick'; v.picked = null; v.msg = `${eun(B.me.name)} 무엇을 할까?`; if (mustSkip(B.me)) skipMsg(this); }
  },
  draw(app) {
    const { g, W, H, t } = app;
    if (!this.B) this.setup(app);
    this.tick(app);
    const B = this.B, v = this.v, AH = H - PANEL_H - AY;
    g.rect(0, 0, W, H, T.ink);
    // 지금 공격 단계면 그 장의 효과 층·몸놀림
    const st = v.phase === 'play' ? v.steps[v.si] : null;
    let fr = null;
    if (st && st.kind === 'attack') {
      const f = Math.max(0, Math.min(FRA - 1, Math.floor((t - v.t0) / FRAME_MS)));
      fr = st.anim.frame(f); prepareBoards(fr, st.uid + ':' + f);
      if (f >= st.anim.I && !st.applied) this.applyHit(st, t);
    }
    const unit = (who, x, y, flip, phase) => {
      const view = who === 'foe' ? 'far' : null;   // 먼 쪽 화분 = 18°(덜 내려다봄, 사용자 "상대의 화분 각도도 조정해줘")
      // 교체: 앞 절반 = 나가는 식물이 받침 속으로 가라앉으며 흐려짐, 뒤 절반 = 들어오는 식물이 받침에서 아래부터 솟음(홈 의자 투영기와 같은 꼴)
      if (st && st.kind === 'switch' && st.who === who) {
        const k = (t - v.t0) / st.ms;
        if (k < 0.45) { if (st.fromU) { const q = k / 0.45; g.alpha(1 - q, () => drawBig(g, st.fromU.key, st.fromU.pot, x, y + Math.round(q * 8), { t, flip, view })); } return; }
        const q = Math.min(1, (k - 0.45) / 0.4), top = y - 112, rv = Math.round(top + (1 - q) * 116);
        g.clip(0, rv, W, 140, () => drawBig(g, st.toU.key, st.toU.pot, x, y, { t, flip, view }));
        if (q < 1) { g.rect(x - 26, rv, 52, 1, '#97e8f7'); g.rect(x - 18, rv - 1, 36, 1, '#e4fbff'); }
        return;
      }
      const u = v.view[who];
      if (v.gone[who]) return;
      if (st && st.kind === 'faint' && st.who === who) { const k = Math.min(1, (t - v.t0) / 700); g.alpha(1 - k, () => drawBig(g, u.key, u.pot, x, y + Math.round(k * 10), { t: 0, flip, view })); return; }
      let pose = null, flash = false, dx = 0, dy = 0;
      if (fr) { if (who === st.who) pose = fr.atkPose; else if (st.ev.tier !== 'miss') { pose = fr.tgtPose; flash = fr.flash; dx = fr.shake; dy = -fr.hop; } }
      if (st && st.kind === 'counter' && who === st.to && t - v.t0 < 160) flash = true;
      if (v.phase === 'over' && v.hp[who] <= 0) { const k = Math.min(1, (t - v.overT0) / 900); g.alpha(1 - k * 0.85, () => drawBig(g, u.key, u.pot, x, y + Math.round(k * 10), { t: 0, flip, view })); return; }
      drawBigPose(g, u.key, u.pot, x + dx, y + dy, { t, phase, flip, flash, view, ...(pose || {}) });
    };
    // 무대(1배 도트): 경기장 그림 → 받침 → 바닥 효과 → 먼 뒤 효과 → 상대 → 사이 효과 → 나 → 앞·공중 효과 → 자세 표시·숫자, 화면 흔들림은 무대 통째로
    g.clip(0, AY, W, AH, () => {
      const c = g.c; c.save(); c.imageSmoothingEnabled = false;
      if (fr) c.translate(fr.cam[0], fr.cam[1]);
      const bg = BGIMG['arena_' + T.key];
      if (bg) g.img(bg, 0, AY); else arena1(g, 0, AY, W, AH, t);
      if (bg && T.key === 'colosseum') arenaLife(g, bg, 0, AY, t);   // 돔 너머 비행체·별·관중 불빛
      padV(g, EX, EY, 36, false, FAR_K);
      padV(g, PX, PY, 42, true);
      if (fr) { c.drawImage(boardCanvas('floor'), 0, AY); c.drawImage(boardCanvas('back'), 0, AY); }
      unit('foe', EX, EY, true, 1600);
      if (fr) c.drawImage(boardCanvas('mid'), 0, AY);
      unit('me', PX, PY, false, 0);
      if (fr) { c.drawImage(boardCanvas('front'), 0, AY); c.drawImage(boardCanvas('air'), 0, AY); }
      for (const who of ['me', 'foe']) {   // 자세 표시(방어 = 방패, 회피 = 바람) — 성립 못 하면 흐리게
        const s = v.stance[who]; if (!s) continue;
        const [x, y] = who === 'me' ? [PX, PY - 118] : [EX, EY - 118];
        btnBody(g, x - 12, y, 24, 20, s.active ? T.btn.gold : T.btn.off, true);
        const ic = s.kind === 'guard' ? 'shield' : 'speed';
        g.img(s.active ? icon(ic) : tinted(ic, T.btn.off.text), x - 5, y + 5);
      }
      c.restore();
      for (const p of v.pops) {   // 판정·피해 숫자: 위로 떠오르며 사라짐
        const k = (t - p.t0) / 1100, y = Math.round(p.y - k * 16), col = p.col || { bad: '#ff6a6a', gold: '#ffd84a', dim: '#c8c8d0', sub: '#e8e0b0', main: '#ffffff' }[p.tone] || '#ffffff';
        g.alpha(Math.min(1, (1 - k) * 2.2), () => g.text(p.text, p.x, y, { font: p.big ? 'head' : 'bold', color: col, align: 'center', outline: T.ink, outlineW: 3 }));
      }
    });
    // 위 띠: 턴 · 대회(3:3은 교체전) · 판 수 · 항복
    g.rect(0, 0, W, AY, T.bg2); g.rect(0, AY - 2, W, 1, T.panel.frameLo); g.rect(0, AY - 1, W, 1, T.ink);
    btnBody(g, 5, 3, 38, 18, T.btn.second, true);
    g.text(`${v.turn}턴`, 24, 6, { font: 'bold', color: T.btn.second.text, align: 'center' });
    if (this.mode === 'swap3') g.text('3:3 교체전', W / 2, 6, { color: T.text.main, align: 'center' });
    else {
      g.text('새싹 브론즈 · 예선', W / 2 - 14, 6, { color: T.text.main, align: 'center' });
      for (let i = 0; i < 5; i++) { const x = W / 2 + 40 + i * 7; g.rect(x, 8, 6, 6, T.ink); g.rect(x + 1, 9, 4, 4, i < 1 ? T.text.gold : (i === 1 ? T.text.main : T.bar.back)); }
    }
    const fp = app.input.isPressed('bt_flag');
    btnBody(g, W - 31, 3, 26, 18, T.btn.second, fp);
    g.img(icon('flag'), W - 24, 5 + (fp ? 1 : 0));
    app.input.hit('bt_flag', W - 31, 3, 26, 18, () => app.go('home', {}, 'shutter'), 6);
    // 체력판(+ 3:3은 팀 셋 표시: 밝은 칸 = 남은 식물, 테 = 앞에 선 식물, 어두운 × = 쓰러짐)
    const fh = infoBox(app, 6, AY + 4, v.view.foe, v.bar.foe, v.en.foe, false);   // 상대 판 = 위 띠 바로 아래 왼쪽(2026-10-15 사용자 "상대의 체력바를 위로 올려서 붙여")
    statusWins(g, 6, AY + 4 + fh + 3, this.statuses('foe'));
    const MY = AY + AH - boxH(true) - 40;   // 내 판: 아래 효과 창 두 줄(36칸) 자리를 남김
    infoBox(app, W - 146, MY, v.view.me, v.bar.me, v.en.me, true);
    statusWins(g, W - 146, MY + boxH(true) + 3, this.statuses('me'));
    if (this.mode === 'swap3') { teamPips(g, 150, AY + 8, B.team.foe, v.view.foe); teamPips(g, W - 146, MY - 11, B.team.me, v.view.me); }
    // 아래 판: 대사 상자 → 에너지 → 기술 6칸(3:3은 마지막 칸 = 교체)
    const PY0 = H - PANEL_H;
    g.rect(0, PY0, W, PANEL_H, T.bg2);
    for (let y = PY0 + 6; y < H; y += 6) g.rect(0, y, W, 1, T.bg);
    g.rect(0, PY0, W, 1, T.ink); g.rect(0, PY0 + 1, W, 1, T.panel.frame); g.rect(0, PY0 + 2, W, 1, T.panel.frameLo);
    msgBox(g, 8, PY0 + 9, W - 16, 36);
    const skipNow = v.phase === 'pick' && mustSkip(B.me);
    g.para ? g.para(v.msg, 18, PY0 + 15, W - 40, { font: 'bold', color: T.mtext.main }) : g.text(v.msg, 18, PY0 + 20, { font: 'bold', color: T.mtext.main });
    if (v.phase === 'pick' && !skipNow && Math.floor(t / 450) % 2) g.rect(W - 22, PY0 + 31, 5, 3, T.mtext.sub);
    const ey = PY0 + 53;
    g.text(this.mode === 'swap3' ? '팀 에너지' : '에너지', 12, ey, { font: 'bold', color: T.text.gold });
    tpips(g, 62, ey + 2, v.en.me, B.me.energyMax, 9);
    g.text(`${v.en.me}/${B.me.energyMax}`, W - 12, ey, { color: T.text.sub, align: 'right' });
    const gx = 8, gy = PY0 + 72, cw = Math.floor((W - 16 - 6) / 2), ch = 44;
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2), x = gx + col * (cw + 6), y = gy + row * (ch + 6);
      if (this.mode === 'swap3' && i === 5) { this.swapButton(app, x, y, cw, ch, v.phase === 'pick' && aliveOf(B, 'me').length > 1 && canSwitch(B.me), !canSwitch(B.me)); continue; }
      const sk = B.me.kit[i], lock = sk && v.phase === 'pick' ? lockOf(B.me, sk) : null, can = !!sk && v.phase === 'pick' && !skipNow && canUse(B.me, sk);
      skillButton(app, x, y, cw, ch, sk, can, v.picked === sk?.id, () => this.pick(app, sk), lock);
    }
    if (this.sheet) this.swapSheet(app);
  },
  // 한쪽 식물의 효과 목록(창 순서 = 이로운 것 먼저)
  statuses(side) {
    const v = this.v, u = v.view[side], out = [], sv = v.stance[side];
    if (sv && sv.active) out.push({ id: sv.kind === 'guard' ? 'guard' : 'evade' });
    if (u && u.st && u.st.nextCrit) out.push({ id: 'critReady' });
    if (u && u.st && u.st.nextInit) out.push({ id: 'initReady' });
    for (const x of (v.eff && v.eff[side]) || []) out.push(x);
    // 검토용 예시(?status=1): 나 = 이로운 셋 + 기절, 상대 = 해로운 여섯(화상 · 독 2겹 · 젖음 · 빙결 2겹 · 감전 1겹 · 덩굴)
    if (this.p && this.p.status) out.push(...(side === 'me' ? [{ id: 'guard' }, { id: 'critReady' }, { id: 'initReady' }, { id: 'stun' }] : [{ id: 'burn' }, { id: 'poison', n: 2 }, { id: 'wet' }, { id: 'chill', n: 2 }, { id: 'shock', n: 1 }, { id: 'bind' }]));
    return out.sort((a, b) => ((STATUS[b.id] || {}).buff ? 1 : 0) - ((STATUS[a.id] || {}).buff ? 1 : 0));
  },
  // 교체 단추(3:3 — 기술 6칸의 마지막 칸)
  swapButton(app, x, y, w, h, can, rooted = false) {
    const { g, input } = app, id = 'bt_swap', S = can ? T.btn.second : T.btn.off, down = can && input.isPressed(id);
    const { yy } = btnBody(g, x, y, w, h, S, down);
    g.text('교체', x + 8, yy + 5, { font: 'bold', color: S.text });
    const ax = x + w - 30, ay = yy + 8;   // ⇄ 두 화살표(도트)
    for (let k = 0; k < 14; k++) { g.px(ax + k, ay, S.text); g.px(ax + k, ay + 7, S.text); }
    for (let k = 1; k <= 3; k++) { g.px(ax + 13 - k, ay - k, S.text); g.px(ax + 13 - k, ay + k, S.text); g.px(ax + k, ay + 7 - k, S.text); g.px(ax + k, ay + 7 + k, S.text); }
    g.text(rooted ? '뿌리가 묶여 못 바꿈' : '턴을 써서 바꿈', x + 8, yy + 23, { color: rooted ? STATUS.root.col : S.text });
    if (can) input.hit(id, x, y, w, h, () => { this.sheet = { forced: false }; }, 2);
  },
  // 교체 창: 내 식물 셋(얼굴 · 이름 · 속성 · 체력) — 앞에 선 식물·쓰러진 식물은 못 고름, 쓰러진 자리를 채울 땐 닫기 없음
  swapSheet(app) {
    const { g, W, H, input } = app, B = this.B, forced = this.sheet.forced, st = T.card || T.panel, P = T.ptext;
    const x = 8, w = W - 16, h = 3 * 50 + (forced ? 44 : 76), y = H - h - 8;
    g.c.fillStyle = 'rgba(6,10,18,0.6)'; g.c.fillRect(0, 0, W, H);
    input.hit('sw_block', 0, 0, W, H, () => {});
    plate(g, x, y, w, h);
    g.text(forced ? '다음에 내보낼 식물' : '교체할 식물', x + 12, y + 10, { font: 'head', color: P.main });
    B.team.me.forEach((u, i) => {
      const ry = y + 34 + i * 50, on = i === B.act.me, dead = u.hp <= 0, can = !on && !dead, id = 'sw_' + i, down = can && input.isPressed(id);
      const S = can ? T.btn.second : T.btn.off, { yy } = btnBody(g, x + 8, ry, w - 16, 44, S, down);
      plate(g, x + 13, yy + 4, 34, 34, 'deep');
      g.clip(x + 15, yy + 6, 30, 30, () => drawPortrait(g, u.key, x + 14, yy + 5, 32, false));
      g.text(u.name, x + 54, yy + 5, { font: 'bold', color: S.text });
      g.img(icon(u.el), x + 54 + g.textW(u.name, 'bold') + 5, yy + 6);
      tbar(g, x + 54, yy + 24, 110, 6, u.hp / u.max, 'hp');
      g.text(`${Math.ceil(u.hp)}/${u.max}`, x + 170, yy + 21, { color: S.text });
      if (on || dead) g.text(on ? '싸우는 중' : '쓰러짐', x + w - 18, yy + 5, { color: on ? '#97e8f7' : T.text.dim, align: 'right' });
      if (can) input.hit(id, x + 8, ry, w - 16, 44, () => this.pickSwitch(app, i));
    });
    if (!forced) button(app, 'sw_close', x + w / 2 - 40, y + h - 36, 80, 26, '닫기', { style: 'night', onTap: () => { this.sheet = null; } });
  },
};
