import { arena1 } from '../art/bg.js';
import { arenaLife } from '../art/arenaLife.js';
import { icon, tinted } from '../art/icons.js';
import { drawBig, drawBigPose, drawPortrait, BGIMG } from '../art/sprites.js';
import { T, plate, btnBody, tbar, tpips, padV, venueOf, holo } from '../art/theme.js';
import { CAT_ICON, CAT_NAME, SPECIES } from '../data/mock.js';
import { makeUnit, makeBattle, playTurn, elemMult, REST } from '../battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats } from '../battle/team.js';
import { listOf, mustSkip, canUse, canSwitch, lockOf, apply as applyFx } from '../battle/status.js';
import { STATUS, STATUS_DESC, SW_ON, swStyle } from '../art/statusLook.js';
import { button } from '../art/ui.js';
import { cardFront, cardSlot, renderFaces, drawFlip } from '../art/skillcard.js';
import { makeAttack, prepareBoards, boardCanvas, FRAME_MS, FRA } from '../battle/fx.js';
import { ATTACKS } from '../../../tools/pixel/big/attack.mjs';
import { ledBoard, LED } from '../art/led.js';
import { glyphH, wrap } from '../core/text.js';
import { battleFromView, applyView } from '../game/fight.js';
import { bot, net, room as R } from '../net/api.js';
import { ask } from './popups.js';
import { EMOTES } from './room.js';
import { ga, eun, eul } from '../core/josa.js';

// v2 전투: 기술 고르기 → (봇 판 = 서버가 상대를 고르고 한 턴을 풂 · 친구 대결 = 두 사람 수가 모이면 서버가 풂 · 시험판 = 이 브라우저 rules.js) → 사건을 차례로 보여 줌
//   선공 판정 → (자세) → 공격 연출(attack.mjs 장마다) → 맞는 장에 판정·피해 → 되받아치기 → 턴 끝 효과·기력 +1 → 다음 턴 / 승패
// 화면(2026-10-16 사용자): 안내 문구 = 따로 창 없이 두 식물 사이 가운데 전광판(LED)으로 팍 · 기술 칸 = 옛 대사 상자 자리로 올림 · 빈 아래 줄 = 기타 단추(교체 · 효과 · 감정 · 기권)
//  체력판 = 'HP'·'MP' 이름 왼쪽, 막대·칸 왼쪽 맞춤, 숫자만 오른쪽 · 효과 창 = 글자·아이콘 같은 줄, 위아래 같은 간격.
const PANEL_H = 228, AY = 24;
// 손패(2026-10-16 사용자 "스킬도 세로로 긴 카드 — 꾹 누르면 뒷면으로 가까이 앞으로 가져오는 느낌" → "카드가 너무 커, 기본 평타·방어·회피도 그렇게 하지 마"):
//  여섯 장 모두 같은 카드(위 줄 = 기본기 셋 · 아래 줄 = 배운 기술 셋), 66×88(3:4)
const CARD_W = 66, CARD_H = 88, CARD_Y = 7, CARD_GX = 10, CARD_GY = 5, HOLD_MS = 320, PEEK_OPEN = 380, PEEK_CLOSE = 280;
const EX = 186, EY = AY + 156, PX = 80, PY = AY + 282, FAR_K = 0.31;
const LED_CY = Math.round((EY + PY - 100) / 2);   // 전광판 가운데 = 상대 받침과 내 식물 머리 사이
const FOE3 = ['vine_water', 'gaia', 'flower_wind'];   // 시험판 3:3 상대
function teamPips(g, x, y, team, active) {
  team.forEach((u, i) => {
    const X = x + i * 12, dead = u.hp <= 0, on = u === active;
    g.rect(X, y, 10, 8, on ? '#e6f3ff' : '#0a1c32');
    g.rect(X + 1, y + 1, 8, 6, dead ? '#1a2230' : '#3fb8e0');
    if (dead) { for (let k = 0; k < 4; k++) { g.px(X + 3 + k, y + 2 + k, '#5a6a82'); g.px(X + 6 - k, y + 2 + k, '#5a6a82'); } }
    else g.rect(X + 2, y + 2, 4, 1, '#d0e8ff');
  });
}
// 경기장 그림 둘레 색(맨 윗줄 · 왼쪽 줄의 가운데 칸) — 넓거나 긴 화면에서 그림 밖을 같은 색으로
const edgeCache = new Map();
function edgeCols(img) {
  if (!img) return ['#0b0d1a', '#0b0d1a'];
  let r = edgeCache.get(img); if (r) return r;
  try {
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d'); c.drawImage(img, 0, 0);
    const px = (x, y) => { const d = c.getImageData(x, y, 1, 1).data; return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''); };
    r = [px(Math.floor(img.width / 2), 0), px(0, Math.floor(img.height * 0.6))];
  } catch { r = ['#0b0d1a', '#0b0d1a']; }
  edgeCache.set(img, r); return r;
}
const TIER = { miss: ['빗나감', 'dim', '빗나갔다!'], graze: ['스침', 'sub', '살짝 스쳤다'], hit: ['정타', 'main', ''], crit: ['치명!', 'gold', '급소에 맞았다!'] };

// 체력판: (상대만) 재배사 · 랭크 / 이름 + 속성 / HP 막대 + 숫자 / MP 칸 + 숫자 — 'HP'·'MP' 이름은 왼쪽, 막대·칸은 같은 x에서 시작, 숫자만 오른쪽
const BOX_W = 140, LBL_W = 19;
const boxH = mine => (mine ? 46 : 59);
function infoBox(app, x0, y0, u, bar, en, mine) {
  const { g, t } = app, w = BOX_W, h = boxH(mine), P = T.ptext, fx = bar.fx, S = fx && HURT[fx.kind], age = fx ? t - fx.t0 : 1e9;
  let x = x0, y = y0;
  if (S && S.shake && age < S.shakeMs) { const a = Math.max(1, Math.round(S.shake * (1 - age / S.shakeMs))); x += (Math.floor(age / 40) % 2 ? 1 : -1) * a; y += Math.floor(age / 60) % 2 ? Math.ceil(a / 2) : 0; }
  plate(g, x, y, w, h);
  if (S && S.frame && age < S.flash) { g.rect(x - 1, y - 1, w + 2, 1, '#ffffff'); g.rect(x - 1, y + h, w + 2, 1, '#ffffff'); g.rect(x - 1, y, 1, h, '#ffffff'); g.rect(x + w, y, 1, h, '#ffffff'); }
  let yy = y + 5;
  const tx = x + 8, bx = tx + LBL_W, right = x + w - 8, numW = g.textW(`${u.max}/${u.max}`, 'bold');
  if (!mine) { g.text(`${u.trainer || '상대'} · ${u.rank || ''}`, tx, yy, { color: P.sub }); yy += 13; }
  g.text(u.name, tx, yy, { font: 'bold', color: u.shiny ? '#ffe8a8' : P.main });
  g.img(icon(u.el), tx + g.textW(u.name, 'bold') + 5, yy + 1);
  yy += 16;
  g.text('HP', tx, yy, { font: 'bold', color: P.sub });
  hpBar(g, bx, yy + 3, right - numW - 5 - bx, 7, bar, u.max, t);
  g.text(`${Math.ceil(bar.main)}/${u.max}`, right, yy, { font: 'bold', color: S && age < S.hold ? '#ffd090' : P.main, align: 'right' });
  yy += 13;
  g.text('MP', tx, yy, { font: 'bold', color: P.sub });
  tpips(g, bx, yy + 2, en, u.energyMax, 7);
  g.text(`${en}/${u.energyMax}`, right, yy, { font: 'bold', color: P.main, align: 'right' });
  return h;
}
// 효과 창(한 줄에 셋 · 두 줄까지, 넘치면 +n): [아이콘][이름][겹침 수]를 가운데 — 글자는 위아래 같은 간격(실제 글자 높이로), 아이콘은 글자 줄 가운데에
const SW_W = 45, SW_H = 16, SW_GAP = 2;
function statusWins(g, x, y, list) {
  const shown = list.length > 6 ? [...list.slice(0, 5), { more: list.length - 5 }] : list, gh = glyphH('body'), ty = (SW_H - gh) / 2;
  shown.forEach((st, i) => {
    const c = i % 3, X = x + c * (SW_W + SW_GAP), w = c === 2 ? BOX_W - 2 * (SW_W + SW_GAP) : SW_W, Y = y + Math.floor(i / 3) * (SW_H + 2);
    if (st.more) { holo(g, X, Y, w, SW_H, SW_ON, 16); g.text(`+${st.more}`, X + (w >> 1), Y + ty, { font: 'bold', color: SW_ON.text, align: 'center' }); return; }
    const D = STATUS[st.id] || { name: st.name || st.id, icon: 'sparkle', buff: !!st.buff }, S = D.buff ? SW_ON : swStyle(D.col || '#ff6a6a');
    holo(g, X, Y, w, SW_H, S, 16);
    const nw = g.textW(D.name), num = D.stack && st.n ? String(Math.min(st.n, D.stack)) : null, rest = nw + (num ? 2 + g.textW(num) : 0);
    const ic = D.icon && rest + 11 <= w - 4 ? icon(D.icon) : null, gap = ic && rest + 12 > w - 4 ? 11 : 12;
    const cw = (ic ? gap : 0) + rest;
    let cx = X + Math.max(2, (w - cw) >> 1);
    if (ic) { g.img(ic, cx, Y + Math.round((SW_H - ic.height) / 2)); cx += gap; }
    g.text(D.name, cx, Y + ty, { color: S.text }); cx += nw + 2;
    if (num) g.text(num, cx, Y + ty, { color: S.num });
  });
}
// 전투 사건 문구(이름 = 그 사건 때의 식물)
const FX_MSG = {
  burn: x => `${ga(x)} 화상을 입었다!`, poison: (x, e) => (e.n > 1 ? `${x}에게 독이 ${e.n}겹 쌓였다!` : `${ga(x)} 독에 걸렸다!`), wet: x => `${ga(x)} 흠뻑 젖었다! 둔해지고 적중·방어가 떨어진다`,
  chill: (x, e) => `${ga(x)} 얼어 간다!` + (e.wet ? ' 젖어 있어서 더 쌓였다!' : ''), shock: (x, e) => `${ga(x)} 감전됐다!` + (e.wet ? ' 젖어 있어서 더 쌓였다!' : ''),
  frozen: x => `${ga(x)} 꽁꽁 얼어붙었다!`, paral: x => `${ga(x)} 감전되어 몸이 굳었다!`, stun: x => `${ga(x)} 기절했다!`,
  spore: (x, e) => `${x}에게 포자가 붙었다!` + (e.n > 1 ? ` (포자 ${e.n})` : ''),
  bind: (x, e) => `덩굴이 ${x}의 ${eul(e.skill)} 묶었다!`, leech: x => `${x}에게 기생 씨앗이 심어졌다!`, shade: x => `${x}에게 그늘이 드리웠다! 에너지가 안 찬다`,
  gale: x => `${x}에게 강풍이 몰아쳤다! 적중이 떨어진다`, taunt: x => `${ga(x)} 도발에 넘어갔다! 자세를 못 잡는다`, root: x => `${x}의 뿌리가 묶였다! 교체할 수 없다`,
  weak: x => `${ga(x)} 약해졌다! 공격이 떨어진다`, corrode: x => `${x}의 껍질이 부식됐다! 방어가 떨어진다`,
  // 버프
  rage: x => `${x}의 공격이 불타오른다!`, wall: x => `${ga(x)} 단단해졌다! 받는 피해가 준다`, haste: x => `${x}의 몸이 가벼워졌다!`, regen: x => `${x}에게 재생이 깃들었다!`,
  thorns: x => `${x}에게 가시가 돋았다!`, shield: x => `${x}에게 보호막이 생겼다!`, purified: (x, e) => (e.ids && e.ids.length ? `${x}의 나쁜 효과가 씻겨 나갔다!` : `${x}의 몸이 맑아졌다!`), focus: x => `${ga(x)} 정신을 집중한다! 다음 공격 치명 ↑`,
};
const CURE_FIRE = { frozen: '얼음이 녹았다', chill: '냉기가 녹았다', wet: '몸이 말랐다', spore: '포자가 탔다', bind: '덩굴이 탔다', leech: '기생 씨앗이 탔다', root: '뿌리가 풀렸다' };
const SKIP_WHY = { frozen: '얼어서', paral: '몸이 굳어서', stun: '기절해서' };
const SKIP_STATE = { frozen: '얼어 있어서', paral: '몸이 굳어서', stun: '기절해 있어서' }, SKIP_AUTO_MS = 1100;
// 전광판 글자색(사건 종류별)
const TONE = { turn: LED.teal, hit: LED.amber, big: LED.gold, miss: '#c8c8d0', fx: LED.violet, buff: LED.teal, heal: LED.green, skip: LED.violet, wait: LED.teal, win: LED.gold, lose: LED.red, note: LED.amber };

const HURT = {
  graze: { hold: 260, drain: 380, main: 200, shake: 0, shakeMs: 0, flash: 0, col: '#f6cf8a', hi: '#fff0d0' },
  hit: { hold: 420, drain: 460, main: 120, shake: 1, shakeMs: 140, flash: 0, col: '#f39a3c', hi: '#ffd090' },
  big: { hold: 600, drain: 520, main: 90, shake: 2, shakeMs: 260, flash: 90, col: '#ff8a2a', hi: '#ffc080', blink: true },
  crit: { hold: 720, drain: 560, main: 70, shake: 3, shakeMs: 340, flash: 120, col: '#ff7a1a', hi: '#ffb070', blink: true, frame: true },
};
const easeOut = k => 1 - (1 - k) ** 2;
function hpBar(g, x, y, w, h, bar, max, t) {
  const B = T.bar, rm = Math.max(0, Math.min(1, bar.main / max)), rt = Math.max(0, Math.min(1, bar.trail / max)), c = rm <= 0.2 ? B.low : rm <= 0.5 ? B.mid : B.hp;
  g.rect(x, y, w, h, T.ink); g.rect(x + 1, y + 1, w - 2, h - 2, B.back);
  const fw = Math.round((w - 2) * rm), tw = Math.round((w - 2) * rt), fx = bar.fx, S = fx ? HURT[fx.kind] : HURT.hit, age = fx ? t - fx.t0 : 1e9;
  if (tw > fw) {
    const white = S.flash && age < S.flash, alt = S.blink && age < S.hold && Math.floor(age / 90) % 2;
    g.rect(x + 1 + fw, y + 1, tw - fw, h - 2, white ? '#ffffff' : alt ? S.hi : S.col);
    g.rect(x + 1 + fw, y + 1, tw - fw, 1, white ? '#ffffff' : S.hi);
  }
  if (fw > 0) { g.rect(x + 1, y + 1, fw, h - 2, c[0]); g.rect(x + 1, y + 1, fw, 1, c[1]); if (h > 4) g.rect(x + 1, y + h - 2, fw, 1, c[2]); }
}

export const battle = {
  theme(app) { return this.venue || venueOf(app.state && app.state.tournament ? app.state.tournament.tier : '브론즈'); },
  enter(p) { this.p = p; this.venue = p.venue || null; this.B = null; this.sheet = null; this.info = null; this.net = null; this.end = null; this.result = null; this.shot = null; this.info2 = !!p.info; this.emoteOpen = false; this.peek = null; this.peekShot = false; this.cards = {}; },
  // 판 차리기(첫 그림 때): 서버 판(봇 · 친구) = 받은 판 모습으로, 시험판 = 이 브라우저에서
  setup(app) {
    const p = this.p, boot = p.net ? app.battleBoot : null;
    if (boot) {
      this.net = boot.kind; this.id = boot.id || null; this.info = boot.info || null; this.code = boot.code || null;
      this.B = battleFromView(boot.view); this.mode = boot.view.mode === 'swap3' ? 'swap3' : '1v1'; this.seed = 7919;
      this.deadline = boot.deadline || null;
      app.battleBoot = null;
    } else this.setupLocal(app);
    const B = this.B;
    this.v = { hp: { me: B.me.hp, foe: B.foe.hp }, bar: { me: { main: B.me.hp, trail: B.me.hp, fx: null }, foe: { main: B.foe.hp, trail: B.foe.hp, fx: null } }, en: { me: B.me.energy, foe: B.foe.energy }, view: { me: B.me, foe: B.foe }, gone: {}, led: null, phase: 'pick', steps: [], si: 0, t0: null, pops: [], stance: {}, turn: B.turn, picked: null, uid: 0, eff: { me: listOf(B.me), foe: listOf(B.foe) }, foeReady: false };
    if (B.over) { this.v.phase = 'over'; this.v.overT0 = app.t; }
    else if (this.mode === 'swap3' && B.need === 'me') { this.v.phase = 'need'; this.sheet = { forced: true }; this.say(app, '다음에 내보낼 식물을 골라 줘!', 'turn', true); }
    else this.prompt(app);
    if (boot && boot.moved) { this.v.phase = 'wait'; this.say(app, '상대를 기다리는 중…', 'wait', true); }
    if (this.shot) this.pick(null, B.me.kit[3]);
  },
  setupLocal(app) {
    const p = this.p, s = app.state;
    const seed = p.seed ? +p.seed : p.phase ? 20261015 : (Date.now() & 0x7fffffff);
    this.mode = p.mode === 'swap3' ? 'swap3' : '1v1'; this.seed = seed;
    const mk = (id, k, extra = {}) => { const sp = SPECIES[k]; return makeUnit(id, sp, { key: k, name: sp.name, ...protoStats(sp), ...extra }); };
    if (this.mode === 'swap3') {
      const keys = s && s.plants && s.plants.length >= 3 ? s.plants.slice(0, 3).map(x => x.key) : ['flower_grass', 'cactus_fire', 'vine_water'];
      this.B = makeTeamBattle({ me: keys.map(k => mk('me', k)), foe: FOE3.map(k => mk('foe', k, { trainer: '코스모싹', rank: '브론즈 2' })), seed });
    } else {
      const me = p.me && SPECIES[p.me] ? mk('me', p.me) : makeUnit('me', SPECIES.flower_grass, { key: 'flower_grass', name: '페탈로즈', hp: 220, atk: 35, def: 24, spd: 30, crit: 5 });
      const foe = p.foe && SPECIES[p.foe] ? mk('foe', p.foe, { trainer: '코스모싹', rank: '브론즈 2' }) : makeUnit('foe', SPECIES.vine_water, { key: 'vine_water', name: '타이드바인', hp: 240, atk: 32, def: 22, spd: 26, crit: 5, trainer: '코스모싹', rank: '브론즈 2' });
      this.B = makeBattle({ me, foe, seed });
    }
    const B = this.B;
    if (p.pre) for (const part of String(p.pre).split(';')) {   // 효과 미리 걸기(검토·영상용)
      const [who, ids] = part.split(':'), u = B[who], by = B[who === 'me' ? 'foe' : 'me'];
      if (u && ids) for (const tok of ids.split(',')) { const m = tok.match(/^([a-z]+)(\d*)$/); if (m) applyFx(u, m[1], +(m[2] || 1), { turn: 1, rng: () => 0.5, ev: [], by }); }
    }
    if (p.energy) { B.me.energy = +p.energy; B.foe.energy = +p.energy; }
    this.shot = p.phase === 'hit' ? 'hit' : null;
    this.sheet = p.sheet ? { forced: false } : null;   // ?sheet=1 = 교체 창이 열린 채(촬영)
  },
  // 전광판: 새 글이면 팍 펼쳐짐. keep = 다음 글까지 계속, 아니면 ms 뒤 사라짐
  say(app, text, tone = 'note', keep = false, ms = 1600) { this.v.led = { text, col: TONE[tone] || tone, t0: app ? app.t : 0, keep, ms }; },
  prompt(app) {
    const B = this.B;
    if (mustSkip(B.me)) { const u = B.me; this.say(app, `${ga(u.name)} ${SKIP_STATE[u.eff.skip.src] || ''} 움직일 수 없다!`, 'skip', true); return; }
    this.say(app, `${eun(B.me.name)} 무엇을 할까?`, 'turn', false, 1500);
  },
  // 기술 고르기 — 쉬는 차례면 '쉬기', 덩굴·도발로 막힌 칸은 못 고름
  pick(app, sk) {
    const B = this.B, v = this.v;
    if (v.phase !== 'pick') return;
    const rest = mustSkip(B.me);
    if (rest) sk = REST; else if (!sk || !canUse(B.me, sk)) return;
    v.picked = sk.id; v.autoSkipAt = null;
    v.eff = { me: listOf(B.me), foe: listOf(B.foe) };   // 이번 턴 시작 모습(계산이 끝나면 B의 효과는 이미 턴 끝 상태)
    if (this.net) return this.send(app, this.mode === 'swap3' ? (rest ? { kind: 'rest' } : { kind: 'skill', id: sk.id }) : (rest ? 'rest' : sk.id), sk.cost || 0);
    v.en.me -= sk.cost || 0;
    const turn = this.mode === 'swap3' ? playTurn3(B, rest ? { kind: 'rest' } : { kind: 'skill', skill: sk }) : playTurn(B, sk);
    this.play(app, this.buildSteps(turn));
  },
  // 서버로 수 보내기 — 봇 판 = 바로 결과, 친구 대결 = 상대 수를 기다림(알림으로 결과)
  send(app, act, cost) {
    const v = this.v, B = this.B, turn = B.turn;
    v.phase = 'wait'; v.en.me -= cost;
    const back = e => { if (e) app.toast(e.message); if (v.phase === 'wait') { v.phase = 'pick'; v.picked = null; v.en.me = B.me.energy; this.prompt(app); } };
    if (this.net === 'pvp') {
      this.say(app, '상대를 기다리는 중…', 'wait', true);
      R.move(act, turn).catch(back);
      return;
    }
    bot.turn(app, this.id, act, turn).then(r => this.onResult(app, r)).catch(back);
  },
  // 서버가 푼 한 턴(또는 쓰러진 자리 채우기) → 판을 고치고 사건을 보여 줌
  onResult(app, r) {
    const B = this.B, v = this.v;
    if (r.resync) { applyView(B, r.view); this.finishTurn(app); app.toast('판을 다시 맞췄어요'); return; }
    if (r.over) this.result = { reward: r.reward };
    applyView(B, r.view);
    if (r.turn) { B.log.push(r.turn); this.play(app, this.buildSteps(r.turn)); }
    else if (r.send) this.play(app, [this.switchStep(r.send), { kind: 'end', ms: 300 }]);
  },
  // 친구 대결 알림(room.js 가 넘겨줌)
  onNet(app, type, data) {
    if (!this.B || this.net !== 'pvp') return;
    const v = this.v;
    if (type === 'foeReady') { v.foeReady = true; return; }
    if (type === 'turn') { this.deadline = data.deadline; v.foeReady = false; this.onResult(app, { turn: data.turn, view: data.view }); return; }
    if (type === 'battle') { this.deadline = data.deadline; applyView(this.B, data.view); if (v.phase !== 'play') { this.finishTurn(app); if (data.moved && v.phase === 'pick') { v.phase = 'wait'; this.say(app, '상대를 기다리는 중…', 'wait', true); } } return; }
    if (type === 'end') {
      this.end = data; this.result = { reward: data.reward };
      if (data.state) app.state = data.state;
      if (!this.B.over) {   // 기권 · 시간 넘김 · 나감 = 쓰러뜨리지 않고 끝남
        this.B.over = data.win ? 'win' : 'lose';
        if (v.phase !== 'play') { v.phase = 'over'; v.overT0 = app.t; this.say(app, data.win ? ({ forfeit: '상대가 기권했다!', timeout: '상대가 시간을 넘겼다!', left: '상대가 나갔다!' }[data.why] || '이겼다!') : ({ forfeit: '기권했다…', timeout: '시간을 넘겨 졌다…', left: '연결이 끊겨 졌다…' }[data.why] || '졌다…'), data.win ? 'win' : 'lose', true); }
      }
    }
  },
  // 교체(3:3): 내 차례에 고르면 턴을 쓰고, 쓰러진 자리면 공짜(sendIn). 뿌리 묶기면 못 바꿈
  pickSwitch(app, to) {
    const B = this.B, v = this.v;
    if (this.sheet && this.sheet.forced) {
      this.sheet = null;
      if (this.net) { v.phase = 'wait'; bot.turn(app, this.id, { kind: 'send', to }, B.turn).then(r => this.onResult(app, r)).catch(e => { app.toast(e.message); v.phase = 'need'; this.sheet = { forced: true }; }); return; }
      const e = sendIn(B, to); this.play(app, [this.switchStep(e), { kind: 'end', ms: 300 }]); return;
    }
    if (v.phase !== 'pick' || !canSwitch(B.me)) return;
    this.sheet = null; v.picked = 'swap';
    v.eff = { me: listOf(B.me), foe: listOf(B.foe) };
    if (this.net) return this.send(app, { kind: 'switch', to }, 0);
    this.play(app, this.buildSteps(playTurn3(B, { kind: 'switch', to })));
  },
  forfeit(app) {
    ask(app, '기권할까요?', this.net === 'pvp' ? '이 판은 진 것으로 남아요' : '진 판으로 남고 보상이 없어요', () => {
      if (this.net === 'pvp') { R.forfeit().catch(e => app.toast(e.message)); return; }
      if (this.net === 'bot') { bot.forfeit(app, this.id).then(r => { this.result = { reward: r.reward }; this.B.over = 'lose'; this.v.phase = 'over'; this.v.overT0 = app.t - 900; this.say(app, '기권했다…', 'lose', true); }).catch(e => app.toast(e.message)); return; }
      app.go('home', {}, 'shutter');
    }, '기권');
  },
  play(app, steps) { const v = this.v; v.steps = steps; v.si = 0; v.t0 = app ? app.t : null; v.phase = 'play'; if (app) this.startStep(v.steps[0], app.t, app); },
  switchStep(e) {
    const B = this.B, from = B.team[e.who][e.from], to = B.team[e.who][e.to];
    const msg = e.who === 'me' ? (e.forced ? `가라, ${to.name}!` : `${from.name}, 돌아와! 가라, ${to.name}!`) : `${ga(to.trainer || '상대')} ${eul(to.name)} 내보냈다!`;
    return { kind: 'switch', ms: 1000, who: e.who, fromU: e.forced ? null : from, toU: to, hp: e.hp, list: e.list, msg, tone: 'note' };
  },
  buildSteps(turn) {
    const B = this.B, nm = id => B[id].name, sk = id => (id === 'me' ? turn.mySkill : turn.foeSkill) || { name: '기술' }, out = [];
    const evs = [...turn.events];
    for (let i = 0; i < evs.length; i++) if (evs[i].t === 'hit') { const j = evs.findIndex((e, k) => k > i && e.t === 'stance' && e.who === evs[i].to && e.active); if (j > i) { evs.splice(i, 0, evs.splice(j, 1)[0]); i++; } }
    for (const e of evs) {
      if (e.t === 'switch') out.push(this.switchStep(e));
      else if (e.t === 'faint') out.push({ kind: 'faint', ms: 900, who: e.who, msg: `${ga(e.name)} 쓰러졌다!`, tone: e.who === 'me' ? 'lose' : 'win' });
      else if (e.t === 'first') out.push({ kind: 'first', ms: 750, who: e.who, msg: `${ga(nm(e.who))} 먼저 움직인다!`, tone: 'note' });
      else if (e.t === 'stance') out.push({ kind: 'stance', ms: 950, who: e.who, stance: e.kind, active: e.active, msg: `${nm(e.who)}의 ${sk(e.who).name}!` + (e.active ? '' : ' 하지만 먼저라 막을 게 없다'), tone: 'note' });
      else if (e.t === 'hit') { const s = sk(e.who), ak = e.atkKey || B[e.who].key, tk = e.tgtKey || B[e.to].key, A = ATTACKS[s.fx || ak] || ATTACKS.flower_grass; out.push({ kind: 'attack', ms: FRA * FRAME_MS, who: e.who, to: e.to, ev: e, skill: s, uid: ++this.v.uid, anim: makeAttack(A, ak, tk, e.who === 'foe', this.seed % 97 + out.length), msg: `${nm(e.who)}의 ${s.name}!`, tone: 'hit' }); }
      else if (e.t === 'cast') out.push({ kind: 'cast', ms: 650, who: e.who, msg: `${nm(e.who)}의 ${sk(e.who).name}!`, tone: 'buff' });
      else if (e.t === 'counter') out.push({ kind: 'counter', ms: 900, who: e.who, to: e.to, ev: e, msg: `${nm(e.who)}의 되받아치기!`, tone: 'hit' });
      else if (e.t === 'fx') { const D = STATUS[e.id], buff = D && D.buff; out.push({ kind: 'fx', ms: 850, ev: e, side: e.to, msg: (FX_MSG[e.id] || (x => x))(e.name, e), tone: buff ? 'buff' : D && D.col ? D.col : 'fx' }); }
      else if (e.t === 'immune') out.push({ kind: 'fxnote', ms: 700, ev: e, side: e.to, msg: `${e.name}에게는 ${ga((STATUS[e.id] || { name: e.id }).name)} 통하지 않는다`, tone: 'note' });
      else if (e.t === 'resist') out.push({ kind: 'fxnote', ms: 700, ev: e, side: e.to, msg: e.why === 'purify' ? `${ga(e.name)} 정화 덕분에 버텼다!` : `${ga(e.name)} 버텼다! 방금 쉬어서 다시 쉬지 않는다`, tone: 'buff' });
      else if (e.t === 'cure') out.push({ kind: 'cure', ms: 750, ev: e, side: e.to, msg: e.why === 'water' ? `물에 ${e.name}의 화상이 꺼졌다!` : `불에 ${e.name}의 ${e.ids.slice(0, 2).map(k => CURE_FIRE[k] || k).join(' · ')}!`, tone: 'note' });
      else if (e.t === 'bloom') out.push({ kind: 'bloom', ms: 900, ev: e, side: e.who, msg: `${e.name}의 포자가 피어났다! 숨이 막힌다`, tone: STATUS.spore.col });
      else if (e.t === 'grow') out.push({ kind: 'expire', ms: 0, ev: e, side: e.who });
      else if (e.t === 'skip') out.push({ kind: 'skipT', ms: 900, ev: e, side: e.who, msg: `${ga(e.name)} ${SKIP_WHY[e.src] || ''} 움직일 수 없다!`, tone: 'skip' });
      else if (e.t === 'tick') out.push({ kind: 'tick', ms: 750, ev: e, side: e.who, msg: `${ga(e.name)} ${e.id === 'burn' ? '화상' : '독'}으로 아파한다!`, tone: STATUS[e.id].col });
      else if (e.t === 'drain') out.push({ kind: 'drain', ms: 950, ev: e, side: e.who, msg: `기생 씨앗이 ${e.name}의 체력을 빨아들인다!`, tone: STATUS.leech.col });
      else if (e.t === 'heal') out.push({ kind: 'heal', ms: 650, ev: e, side: e.who, msg: `${ga(e.name)} 체력을 빨아들였다!`, tone: 'heal' });
      else if (e.t === 'regen') out.push({ kind: 'heal', ms: 650, ev: e, side: e.who, msg: `${e.name}의 체력이 재생된다`, tone: 'heal' });
      else if (e.t === 'reflect') out.push({ kind: 'reflect', ms: 750, ev: e, side: e.to, msg: `가시에 찔렸다! ${nm(e.to)}도 아프다`, tone: 'hit' });
      else if (e.t === 'noEnergy') out.push({ kind: 'note', ms: 700, msg: e.why === 'spore' ? `포자 때문에 숨이 막혀 ${e.name}의 에너지가 차지 않았다` : `그늘 때문에 ${e.name}의 에너지가 차지 않았다`, tone: 'note' });
      else if (e.t === 'expire') out.push({ kind: 'expire', ms: 0, ev: e, side: e.who });
    }
    out.push({ kind: 'end', ms: 450 });
    return out;
  },
  startStep(st, t, app) {
    const v = this.v, B = this.B;
    if (!st) return;
    if (st.msg) v.led = { text: st.msg, col: TONE[st.tone] || st.tone || LED.amber, t0: t, keep: true };
    const last = B.log[B.log.length - 1];
    if ((st.kind === 'stance' || st.kind === 'attack' || st.kind === 'cast') && st.who === 'foe' && !v.foePaid && last && last.foeSkill) { v.en.foe -= last.foeSkill.cost || 0; v.foePaid = true; }
    if (st.kind === 'stance') v.stance[st.who] = { kind: st.stance, active: st.active };
    if (st.kind === 'counter') { this.hurt(st.to, st.ev.dmg, 'hit', t); this.pop(st.to, `-${st.ev.dmg}`, 'bad', t); }
    if (st.ev && st.ev.list && st.side) v.eff[st.side] = st.ev.list;
    if (st.kind === 'fx') { const S = STATUS[st.ev.id]; if (S) this.pop(st.side, S.name + (S.stack && st.ev.n ? ' ' + st.ev.n : '') + '!', null, t, false, -16, S.buff ? '#8ccfff' : S.col || '#8ccfff'); }
    if (st.kind === 'skipT' && st.side === 'me' && st.ev.refund) v.en.me += st.ev.refund;
    if (st.kind === 'skipT' && st.side === 'foe' && st.ev.refund) v.en.foe += st.ev.refund;
    if (st.kind === 'tick') { this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS[st.ev.id].col); }
    if (st.kind === 'bloom') { this.hurt(st.side, st.ev.dmg, 'hit', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS.spore.col); this.pop(st.side, '포자!', null, t, false, -16, STATUS.spore.col); }
    if (st.kind === 'drain') {
      this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS.leech.col);
      if (st.ev.to && st.ev.heal > 0) { this.heal(st.ev.to, st.ev.heal); this.pop(st.ev.to, `+${st.ev.heal}`, null, t, true, 0, '#7ef0a0'); }
      if (st.ev.to && st.ev.list2) v.eff[st.ev.to] = st.ev.list2;
    }
    if (st.kind === 'heal') { this.heal(st.side, st.ev.heal); this.pop(st.side, `+${st.ev.heal}`, null, t, true, 0, '#7ef0a0'); }
    if (st.kind === 'reflect') { this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, 'bad', t, true); this.pop(st.ev.who, '반사!', null, t, false, -16, '#8ccfff'); }
    if (st.kind === 'end') v.en = { me: B.me.energy, foe: B.foe.energy };
  },
  heal(side, amt) { const v = this.v, u = v.view[side]; v.hp[side] = Math.min(u ? u.max : 9999, v.hp[side] + amt); v.bar[side] = { main: v.hp[side], trail: v.hp[side], fx: null }; },
  swapView(st) { const v = this.v; st.swapped = true; v.view[st.who] = st.toU; v.gone[st.who] = false; v.hp[st.who] = st.hp; v.bar[st.who] = { main: st.hp, trail: st.hp, fx: null }; v.stance[st.who] = null; if (st.list) v.eff[st.who] = st.list; },
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
      if (e.dmg > 0) { this.hurt(st.to, e.dmg, kind, t); this.pop(st.to, `-${e.dmg}`, e.tier === 'crit' ? 'gold' : 'bad', t, true); }
    }
    this.pop(st.to, label, tone, t, false, -16);
    if (e.absorb) { this.pop(st.to, `보호막 -${e.absorb}`, null, t, false, -30, '#8ccfff'); if (e.list) v.eff[st.to] = e.list; }
    const extra = [e.evade && e.tier !== 'miss' ? '피하려 했지만 맞았다' : '', line, great ? '효과가 굉장하다!' : '', e.guard ? '방어 자세로 막았다' : '', e.absorb && !e.dmg ? '보호막이 다 막았다' : ''].filter(Boolean).join(' · ');
    if (extra) v.led = { text: `${A.name}의 ${st.skill.name}! ${extra}`, col: e.tier === 'crit' || great ? LED.gold : e.tier === 'miss' ? TONE.miss : LED.amber, t0: t, keep: true };
  },
  pop(who, text, tone, t, big = false, dy = 0, col = null) { const [x, y] = who === 'me' ? [PX, PY - 92] : [EX, EY - 92]; this.v.pops.push({ text, tone, t0: t, x, y: y + dy, big, col }); },
  tick(app) {
    const v = this.v, t = app.t;
    if (v.phase === 'pick' && !this.shot && !(this.p && this.p.phase) && mustSkip(this.B.me)) {
      if (v.autoSkipAt == null) v.autoSkipAt = t + SKIP_AUTO_MS;
      else if (t >= v.autoSkipAt) { v.autoSkipAt = null; this.pick(app, REST); }
    }
    if (v.phase === 'play') {
      if (v.t0 == null) { v.t0 = t; this.startStep(v.steps[v.si], t, app); }
      let st = v.steps[v.si];
      if (this.shot) {
        const ai = v.steps.findIndex(s => s.kind === 'attack');
        if (ai >= 0 && v.si !== ai) { for (let i = v.si + 1; i <= ai; i++) this.startStep(v.steps[i], t, app); v.si = ai; v.t0 = t - (v.steps[ai].anim.I + 1) * FRAME_MS; }
        return;
      }
      while (st && t - v.t0 >= st.ms) {
        if (st.kind === 'attack' && !st.applied) this.applyHit(st, t);
        if (st.kind === 'switch' && !st.swapped) this.swapView(st);
        if (st.kind === 'faint') v.gone[st.who] = true;
        v.t0 += st.ms; v.si++; st = v.steps[v.si];
        if (st) this.startStep(st, t, app);
      }
      if (st && st.kind === 'switch' && !st.swapped && t - v.t0 >= st.ms * 0.45) this.swapView(st);
      if (!st) this.finishTurn(app);
    } else if (v.phase === 'over' && !v.leaving && t - v.overT0 > 1700) {
      v.leaving = true;
      const me = (this.B.team ? this.B.team.me[0] : this.B.me) || this.B.me, foe = this.B.foe;
      app.lastResult = { win: this.B.over === 'win', mode: this.net === 'pvp' ? 'pvp' : this.mode === 'swap3' ? 'swap3' : 'tournament', reward: this.result ? this.result.reward : null, info: this.info, me: { key: me.key, pot: me.pot, stage: me.stage, el: me.el }, foe: { el: foe.el }, why: this.end ? this.end.why : 'ko' };
      app.go('result', { win: this.B.over === 'win', venue: T.key }, 'shutter');
    }
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
    v.hp = { me: B.me.hp, foe: B.foe.hp }; v.en = { me: B.me.energy, foe: B.foe.energy }; v.stance = {}; v.foePaid = false; v.turn = B.turn; v.foeReady = false;
    if (!B.need) { v.view = { me: B.me, foe: B.foe }; v.gone = {}; v.eff = { me: listOf(B.me), foe: listOf(B.foe) }; }
    if (B.over) {
      v.phase = 'over'; v.overT0 = app.t;
      const win = B.over === 'win', why = this.end && this.end.why && this.end.why !== 'ko';
      this.say(app, why ? (win ? '상대가 기권했다!' : '졌다…') : win ? (this.mode === 'swap3' ? '상대 식물을 모두 쓰러뜨렸다!' : `${ga(B.foe.name)} 쓰러졌다! 승리!`) : (this.mode === 'swap3' ? '내 식물이 모두 쓰러졌다…' : `${ga(B.me.name)} 쓰러졌다…`), win ? 'win' : 'lose', true);
    } else if (B.need === 'me') { v.phase = 'need'; v.picked = null; this.say(app, '다음에 내보낼 식물을 골라 줘!', 'turn', true); this.sheet = { forced: true }; }
    else { v.phase = 'pick'; v.picked = null; this.prompt(app); }
  },
  draw(app) {
    const { g, W, H, t } = app;
    if (!this.B) this.setup(app);
    this.tick(app);
    const B = this.B, v = this.v, AH = H - PANEL_H - AY;
    g.rect(0, 0, W, H, T.ink);
    const st = v.phase === 'play' ? v.steps[v.si] : null;
    let fr = null;
    if (st && st.kind === 'attack') {
      const f = Math.max(0, Math.min(FRA - 1, Math.floor((t - v.t0) / FRAME_MS)));
      fr = st.anim.frame(f); prepareBoards(fr, st.uid + ':' + f);
      if (f >= st.anim.I && !st.applied) this.applyHit(st, t);
    }
    const unit = (who, x, y, flip, phase) => {
      const view = who === 'foe' ? 'far' : null;
      if (st && st.kind === 'switch' && st.who === who) {
        const k = (t - v.t0) / st.ms;
        if (k < 0.45) { if (st.fromU) { const q = k / 0.45; g.alpha(1 - q, () => drawBig(g, st.fromU.key, st.fromU.pot, x, y + Math.round(q * 8), { t, flip, view })); } return; }
        const q = Math.min(1, (k - 0.45) / 0.4), top = y - 112, rv = Math.round(top + (1 - q) * 116);
        g.clip(0, rv, W, 140, () => drawBig(g, st.toU.key, st.toU.pot, x, y, { t, flip, view }));
        if (q < 1) { g.rect(x - 26, rv, 52, 1, '#8ccfff'); g.rect(x - 18, rv - 1, 36, 1, '#e6f3ff'); }
        return;
      }
      const u = v.view[who];
      if (v.gone[who]) return;
      if (st && st.kind === 'faint' && st.who === who) { const k = Math.min(1, (t - v.t0) / 700); g.alpha(1 - k, () => drawBig(g, u.key, u.pot, x, y + Math.round(k * 10), { t: 0, flip, view })); return; }
      let pose = null, flash = false, dx = 0, dy = 0;
      if (fr) { if (who === st.who) pose = fr.atkPose; else if (st.ev.tier !== 'miss') { pose = fr.tgtPose; flash = fr.flash; dx = fr.shake; dy = -fr.hop; } }
      if (st && (st.kind === 'counter' || st.kind === 'reflect') && who === (st.to || st.side) && t - v.t0 < 160) flash = true;
      if (v.phase === 'over' && v.hp[who] <= 0) { const k = Math.min(1, (t - v.overT0) / 900); g.alpha(1 - k * 0.85, () => drawBig(g, u.key, u.pot, x, y + Math.round(k * 10), { t: 0, flip, view })); return; }
      drawBigPose(g, u.key, u.pot, x + dx, y + dy, { t, phase, flip, flash, view, ...(pose || {}) });
    };
    // 무대(1배 도트): 경기장 그림 → 받침 → 효과 층 → 상대 → 나 → 자세 표시 · 숫자 · 전광판
    //  그림은 270×348 — 화면이 넓거나 길면 가운데로 · 아래(기술 판)에 붙이고, 남는 둘레는 그림 가장자리 색으로
    const bg = BGIMG['arena_' + T.key], ox = Math.floor((W - 270) / 2), oy = Math.max(0, AH - 348);
    g.clip(0, AY, W, AH, () => {
      const c = g.c;
      if ((ox || oy) && bg) {   // 그림 가장자리 한 줄을 늘여 둘레를 이음(관중석 줄은 관중석 색, 바닥 줄은 바닥 색)
        c.imageSmoothingEnabled = false;
        const [top] = edgeCols(bg); g.rect(0, AY, W, AH, top);
        if (ox) { c.drawImage(bg, 0, 0, 1, bg.height, 0, AY + oy, ox, bg.height); c.drawImage(bg, bg.width - 1, 0, 1, bg.height, ox + 270, AY + oy, W - ox - 270, bg.height); }
        if (oy) c.drawImage(bg, 0, 0, bg.width, 1, 0, AY, W, oy);
      } else if (ox || oy) g.rect(0, AY, W, AH, '#0b0d1a');
      c.save(); c.imageSmoothingEnabled = false; c.translate(ox, oy);
      c.save();
      if (fr) c.translate(fr.cam[0], fr.cam[1]);
      if (bg) g.img(bg, 0, AY); else arena1(g, 0, AY, 270, 348, t);
      if (bg && T.key === 'colosseum') arenaLife(g, bg, 0, AY, t);
      padV(g, EX, EY, 36, false, FAR_K);
      padV(g, PX, PY, 42, true);
      if (fr) { c.drawImage(boardCanvas('floor'), 0, AY); c.drawImage(boardCanvas('back'), 0, AY); }
      unit('foe', EX, EY, true, 1600);
      if (fr) c.drawImage(boardCanvas('mid'), 0, AY);
      unit('me', PX, PY, false, 0);
      if (fr) { c.drawImage(boardCanvas('front'), 0, AY); c.drawImage(boardCanvas('air'), 0, AY); }
      for (const who of ['me', 'foe']) {
        const s = v.stance[who]; if (!s) continue;
        const [x, y] = who === 'me' ? [PX, PY - 118] : [EX, EY - 118];
        btnBody(g, x - 12, y, 24, 20, s.active ? T.btn.gold : T.btn.off, true);
        const ic = s.kind === 'guard' ? 'shield' : 'speed';
        g.img(s.active ? icon(ic) : tinted(ic, T.btn.off.text), x - 5, y + 5);
      }
      c.restore();
      for (const p of v.pops) {
        const k = (t - p.t0) / 1100, y = Math.round(p.y - k * 16), col = p.col || { bad: '#ff6a6a', gold: '#ffd84a', dim: '#c8c8d0', sub: '#e8e0b0', main: '#ffffff' }[p.tone] || '#ffffff';
        g.alpha(Math.min(1, (1 - k) * 2.2), () => g.text(p.text, p.x, y, { font: p.big ? 'head' : 'bold', color: col, align: 'center', outline: T.ink, outlineW: 3 }));
      }
      this.drawLed(app, 270);
      this.drawEmotes(app);
      c.restore();
    });
    this.topBar(app);
    // 체력판(+ 3:3 팀 셋 표시)
    const fh = infoBox(app, 6, AY + 4, v.view.foe, v.bar.foe, v.en.foe, false);
    statusWins(g, 6, AY + 4 + fh + 3, this.statuses('foe'));
    if (this.net === 'pvp' && v.foeReady && v.phase !== 'play') { const x = 6 + BOX_W + 4, y = AY + 8; holo(g, x, y, 34, 16, { fill: '#13385e', fill2: '#17446e', frame: '#9ff0b0', frameHi: '#e6f3ff', frameLo: '#2a6a44' }, 16); g.text('고름', x + 17, y + (16 - glyphH('body')) / 2, { color: '#d8ffe4', align: 'center' }); }
    const MY = AY + AH - boxH(true) - 40;
    infoBox(app, W - 146, MY, v.view.me, v.bar.me, v.en.me, true);
    statusWins(g, W - 146, MY + boxH(true) + 3, this.statuses('me'));
    if (this.mode === 'swap3') { teamPips(g, 150 + (this.net === 'pvp' ? 40 : 0), AY + 8, B.team.foe, v.view.foe); teamPips(g, W - 146, MY - 11, B.team.me, v.view.me); }
    // 아래 판: 기술 6칸(위 = 옛 대사 상자 자리) → 기타 단추 줄
    const PY0 = H - PANEL_H;
    g.rect(0, PY0, W, PANEL_H, T.bg2);
    for (let y = PY0 + 6; y < H; y += 6) g.rect(0, y, W, 1, T.bg);
    g.rect(0, PY0, W, 1, T.ink); g.rect(0, PY0 + 1, W, 1, T.panel.frame); g.rect(0, PY0 + 2, W, 1, T.panel.frameLo);
    const skipNow = v.phase === 'pick' && mustSkip(B.me), live = !app.confirm && !this.sheet && !this.info2 && !this.emoteOpen && !this.peek;
    this.hand(app, PY0, live, skipNow);
    this.miscRow(app, PY0 + CARD_Y + CARD_H * 2 + CARD_GY + 6, live);
    if (this.peek) this.drawPeek(app);
    if (this.sheet) this.swapSheet(app);
    if (this.info2) this.infoSheet(app);
    if (this.emoteOpen) this.emoteSheet(app);
  },
  // 손패: 여섯 장(위 줄 = 기본기 · 아래 줄 = 배운 기술, 모자라면 빈 칸). 꾹(0.32초) 누르면 그 카드를 앞으로 가져와 뒷면(상세)을 봄
  hand(app, PY0, live, skipNow) {
    const { g, W, input } = app, B = this.B, v = this.v, kit = B.me.kit;
    this.cards = {};
    const x0 = Math.round((W - CARD_W * 3 - CARD_GX * 2) / 2);
    for (let i = 0; i < 6; i++) {
      const sk = kit[i], x = x0 + (i % 3) * (CARD_W + CARD_GX), y = PY0 + CARD_Y + Math.floor(i / 3) * (CARD_H + CARD_GY);
      if (!sk) { cardSlot(g, x, y, CARD_W, CARD_H, '빈 칸'); continue; }
      const id = 'sk_' + sk.id, lock = v.phase === 'pick' ? lockOf(B.me, sk) : null, can = live && v.phase === 'pick' && !skipNow && canUse(B.me, sk), lit = v.picked === sk.id;
      if (this.peek && this.peek.id === id) cardSlot(g, x, y, CARD_W, CARD_H);   // 들어 올린 카드의 자리
      else {
        const hold = input.down && input.down.id === id ? input.holdMs() : 0, rise = hold > 120 ? Math.min(3, Math.round((hold - 120) / 60)) : 0;   // 꾹 누르는 동안 살짝 들림
        const down = can && input.isPressed(id) && !rise;
        cardFront(g, x, y + (lit ? -2 : down ? 1 : 0) - rise, CARD_W, CARD_H, sk, { can, lit, lock });
      }
      if (live) input.hit(id, x, y, CARD_W, CARD_H, can ? () => this.pick(app, sk) : null, 2);
      this.cards[id] = { sk, x, y, w: CARD_W, h: CARD_H, can, lock };
    }
    const d = input.down;
    if (live && d && !d.moved && this.cards[d.id] && input.holdMs() >= HOLD_MS) this.openPeek(app, d.id);
    const pk = this.p && this.p.peek;   // 검토 촬영(?peek=기술 id&peekP=0~1): 그 카드를 꺼내 본 채로 멈춤
    if (pk && !this.peek && !this.peekShot && this.cards['sk_' + pk]) { this.peekShot = true; this.openPeek(app, 'sk_' + pk); this.peek.pin = true; this.peek.p = this.p.peekP != null ? +this.p.peekP : 1; }
  },
  // 꺼내 보기 시작: 앞·뒤 큰 그림을 기기 화소로 한 번 그려 둠(기본기는 단추 자리에서 작은 카드로 생겨남)
  openPeek(app, id) {
    const { input, W } = app, ref = this.cards[id], k = app.g.c.getTransform().a || 1, foe = this.v.view.foe, sk = ref.sk;
    input.claimHold();
    const BW = Math.min(W - 100, 160), BH = Math.round(BW * CARD_H / CARD_W);
    const o = { can: ref.can, lock: ref.lock, energy: this.v.en.me, foe: foe ? { name: foe.name, el: foe.el } : null, mult: sk.act === 'attack' && sk.el && foe ? elemMult(sk.el, foe.el) : 1 };
    this.peek = { id, sk, from: { x: ref.x, y: ref.y, w: ref.w, h: ref.h }, BW, BH, faces: renderFaces(sk, CARD_W, CARD_H, BW, BH, k, o), p: 0, last: app.t };
    app.g.rect(ref.x - 1, ref.y - 4, ref.w + 2, ref.h + 6, T.bg2); cardSlot(app.g, ref.x, ref.y, ref.w, ref.h);   // 이번 그림부터 손패 자리는 빈 자리
  },
  // 꺼내 본 카드: 잡고 있으면 화면 가운데로 다가오며(살짝 떠오름 · 그림자) 원근 있게 뒤집혀 뒷면, 손을 떼면 다시 뒤집혀 제자리로
  drawPeek(app) {
    const { g, W, H, input, t } = app, P = this.peek, c = g.c, k = c.getTransform().a || 1, dt = Math.min(50, Math.max(0, t - P.last));
    P.last = t;
    const holding = P.pin || input.holding;
    if (!P.pin) P.p = holding ? Math.min(1, P.p + dt / PEEK_OPEN) : Math.max(0, P.p - dt / PEEK_CLOSE);
    if (!holding && P.p <= 0) { this.peek = null; return; }
    const q = P.p, pos = 1 - (1 - q) ** 3, th = Math.PI * (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);
    c.fillStyle = `rgba(6,10,18,${(0.62 * pos).toFixed(3)})`; c.fillRect(0, 0, W, H);
    input.hit('peek_block', 0, 0, W, H, null);
    const F = P.from, fx = F.x + F.w / 2, fy = F.y + F.h / 2, tx = W / 2, ty = Math.round((AY + H - PANEL_H) / 2) + 4;
    const cx = fx + (tx - fx) * pos, cy = fy + (ty - fy) * pos - Math.sin(pos * Math.PI) * 14, w = F.w + (P.BW - F.w) * pos, h = F.h + (P.BH - F.h) * pos;
    const pw = Math.max(2, w * Math.abs(Math.cos(th)));   // 그림자 = 지금 보이는 폭만큼, 다가올수록 크게 번짐
    c.save(); c.shadowColor = `rgba(0,0,0,${(0.6 * pos).toFixed(3)})`; c.shadowBlur = 18 * k * pos; c.shadowOffsetY = 10 * k * pos;
    c.fillStyle = `rgba(0,0,0,${(0.25 * pos).toFixed(3)})`; c.fillRect(cx - pw / 2, cy - h / 2 + 3, pw, h - 6); c.restore();
    drawFlip(c, P.faces.front, P.faces.back, cx, cy, w, h, th);
  },
  // 위 띠: 턴 · 대회 이름(또는 3:3 · 친구 대결) · 판 점 · (친구 대결) 남은 시간
  topBar(app) {
    const { g, W, t } = app, v = this.v, I = this.info;
    g.rect(0, 0, W, AY, T.bg2); g.rect(0, AY - 2, W, 1, T.panel.frameLo); g.rect(0, AY - 1, W, 1, T.ink);
    btnBody(g, 5, 3, 38, 18, T.btn.second, true);
    g.text(`${v.turn}턴`, 24, 6, { font: 'bold', color: T.btn.second.text, align: 'center' });
    if (this.net === 'pvp') {
      g.text('친구 대결' + (this.code ? ` · ${this.code}` : ''), W / 2, 6, { color: T.text.main, align: 'center' });
      if (this.deadline && v.phase !== 'over') {
        const sec = Math.max(0, Math.ceil((this.deadline - net.now()) / 1000)), low = sec <= 10;
        btnBody(g, W - 43, 3, 38, 18, low && Math.floor(t / 300) % 2 ? T.btn.danger : T.btn.second, true);
        g.text(`${sec}초`, W - 24, 6, { font: 'bold', color: (low ? T.btn.danger : T.btn.second).text, align: 'center' });
      }
    } else if (this.mode === 'swap3') g.text('3:3 교체전', W / 2, 6, { color: T.text.main, align: 'center' });
    else {
      const title = I ? I.title : '새싹 브론즈 · 예선', wins = I ? I.wins : 1, losses = I ? I.losses : 0;
      g.text(title, W / 2 - 18, 6, { color: T.text.main, align: 'center' });
      const x0 = W / 2 - 18 + Math.ceil(g.textW(title) / 2) + 6;
      for (let i = 0; i < 5; i++) { const x = x0 + i * 7; g.rect(x, 8, 6, 6, T.ink); g.rect(x + 1, 9, 4, 4, i < wins ? T.text.gold : i < wins + losses ? '#ff8a8a' : T.bar.back); }
    }
  },
  // 기타 단추 줄(2026-10-16 사용자 "빈 아래 칸에 각종 기타 버튼"): 교체(3:3) · 효과 설명 · 감정(친구 대결) · 기권
  miscRow(app, y, live) {
    const { W } = app, B = this.B, v = this.v, list = [];
    if (this.mode === 'swap3') { const can = v.phase === 'pick' && aliveOf(B, 'me').length > 1 && canSwitch(B.me); list.push({ id: 'bt_swap', label: canSwitch(B.me) ? '교체' : '교체 못 함', icon: 'ff', can, fn: () => { this.sheet = { forced: false }; } }); }
    list.push({ id: 'bt_info', label: '효과', icon: 'sparkle', can: true, fn: () => { this.info2 = true; } });
    if (this.net === 'pvp') list.push({ id: 'bt_emote', label: '감정', icon: 'heart', can: true, fn: () => { this.emoteOpen = true; } });
    list.push({ id: 'bt_flag', label: '기권', icon: 'flag', can: v.phase !== 'over', red: true, fn: () => this.forfeit(app) });
    const gap = 6, w = Math.floor((W - 16 - gap * (list.length - 1)) / list.length);
    list.forEach((b, i) => button(app, b.id, 8 + i * (w + gap), y, i === list.length - 1 ? W - 16 - (w + gap) * (list.length - 1) : w, 32, b.label, { style: 'night', icon: b.icon, iconTint: true, disabled: !b.can, onTap: live && b.can ? b.fn : null }));
  },
  // 전광판: 두 식물 사이 가운데 — 새 글이면 가운데 줄에서 위아래로 팍 펼쳐지고 테가 번쩍, 고르는 차례 안내는 잠깐 뒤 사라짐
  drawLed(app, W = app.W) {
    const L = this.v.led; if (!L) return;
    const { g, t } = app, age = app.pxScale ? 400 : Math.max(0, t - L.t0);   // 촬영(한 장)은 다 펼친 모습
    if (!L.keep && age > L.ms) return;
    const k = Math.min(1, age / 90), flash = age < 150 ? 1 - age / 150 : 0, fade = L.keep ? 1 : Math.min(1, (L.ms - age) / 220);
    const lines = wrap(L.text, 'bold', W - 44).slice(0, 2);
    const blink = age < 200 && Math.floor(age / 50) % 2 === 1;   // 켜질 때 두 번 깜빡
    g.alpha(fade * (blink ? 0.55 : 1), () => ledBoard(g, lines.map(text => ({ text, color: L.col })), W / 2, LED_CY, { font: 'bold', k: easeOut(k), flash, maxW: W - 16 }));
  },
  // 친구 대결 감정 표현: 보낸 쪽 식물 위에 작은 전광판(2.6초)
  drawEmotes(app) {
    if (this.net !== 'pvp' || !app.room) return;
    const { g } = app, now = performance.now();
    for (const e of app.room.emotes.filter(x => now - x.t < 2600)) {
      const [x, y] = e.me ? [PX, PY - 140] : [EX, EY - 128];
      ledBoard(g, [{ text: EMOTES[e.i] || '!', color: LED.gold }], x, y, { font: 'bold' });
    }
  },
  statuses(side) {
    const v = this.v, u = v.view[side], out = [], sv = v.stance[side];
    if (sv && sv.active) out.push({ id: sv.kind === 'guard' ? 'guard' : 'evade' });
    if (u && u.st && u.st.nextInit) out.push({ id: 'initReady' });
    for (const x of (v.eff && v.eff[side]) || []) out.push(x);
    if (this.p && this.p.status) out.push(...(side === 'me' ? [{ id: 'guard' }, { id: 'focus' }, { id: 'rage' }, { id: 'stun' }] : [{ id: 'burn' }, { id: 'poison', n: 2 }, { id: 'wet' }, { id: 'chill', n: 2 }, { id: 'shock', n: 1 }, { id: 'bind' }]));
    return out.sort((a, b) => ((STATUS[b.id] || {}).buff ? 1 : 0) - ((STATUS[a.id] || {}).buff ? 1 : 0));
  },
  // 교체 창: 내 식물 셋 — 앞에 선 식물·쓰러진 식물은 못 고름, 쓰러진 자리를 채울 땐 닫기 없음
  swapSheet(app) {
    const { g, W, H, input } = app, B = this.B, forced = this.sheet.forced, P = T.ptext;
    const x = 8, w = W - 16, h = 3 * 50 + (forced ? 44 : 76), y = H - h - 8;
    g.c.fillStyle = 'rgba(6,10,18,0.6)'; g.c.fillRect(0, 0, W, H);
    input.hit('sw_block', 0, 0, W, H, () => {});
    plate(g, x, y, w, h);
    g.text(forced ? '다음에 내보낼 식물' : '교체할 식물', x + 12, y + 10, { font: 'head', color: P.main });
    B.team.me.forEach((u, i) => {
      const ry = y + 34 + i * 50, on = i === B.act.me, dead = u.hp <= 0, can = !on && !dead && this.v.phase !== 'wait', id = 'sw_' + i, down = can && input.isPressed(id);
      const S = can ? T.btn.second : T.btn.off, { yy } = btnBody(g, x + 8, ry, w - 16, 44, S, down);
      plate(g, x + 13, yy + 4, 34, 34, 'deep');
      g.clip(x + 15, yy + 6, 30, 30, () => drawPortrait(g, u.key, x + 14, yy + 5, 32, false));
      g.text(u.name, x + 54, yy + 5, { font: 'bold', color: S.text });
      g.img(icon(u.el), x + 54 + g.textW(u.name, 'bold') + 5, yy + 6);
      tbar(g, x + 54, yy + 24, 110, 6, u.hp / u.max, 'hp');
      g.text(`${Math.ceil(u.hp)}/${u.max}`, x + 170, yy + 21, { color: S.text });
      if (on || dead) g.text(on ? '싸우는 중' : '쓰러짐', x + w - 18, yy + 5, { color: on ? '#8ccfff' : T.text.dim, align: 'right' });
      if (can) input.hit(id, x + 8, ry, w - 16, 44, () => this.pickSwitch(app, i));
    });
    if (!forced) button(app, 'sw_close', x + w / 2 - 40, y + h - 36, 80, 26, '닫기', { style: 'night', onTap: () => { this.sheet = null; } });
  },
  // 효과 설명 창: 양쪽 식물에 걸린 효과(이름 · 겹침 · 한 줄 설명)
  infoSheet(app) {
    const { g, W, H, input } = app, P = T.ptext, rows = [];
    for (const side of ['foe', 'me']) for (const st of this.statuses(side)) rows.push({ side, st });
    const h = Math.min(H - 60, 74 + Math.max(1, rows.length) * 30), y = Math.round((H - h) / 2), x = 10, w = W - 20;
    g.c.fillStyle = 'rgba(6,10,18,0.7)'; g.c.fillRect(0, 0, W, H);
    input.hit('in_block', 0, 0, W, H, () => { this.info2 = false; });
    holo(g, x, y, w, h, T.card || T.panel, 16);
    g.text('걸린 효과', x + 12, y + 10, { font: 'head', color: P.main });
    let yy = y + 36;
    if (!rows.length) g.text('지금은 걸린 효과가 없어요', W / 2, yy + 6, { color: P.sub, align: 'center' });
    for (const { side, st } of rows) {
      if (yy > y + h - 60) break;
      const D = STATUS[st.id] || { name: st.id }, who = this.v.view[side];
      statusWins(g, x + 10, yy, [st]);
      g.text(`${who ? who.name : ''}${side === 'me' ? '(나)' : ''}`, x + 60, yy + 1, { color: P.sub });
      g.text(STATUS_DESC[st.id] || '', x + 10, yy + 17, { color: P.main });
      yy += 30;
    }
    button(app, 'in_close', W / 2 - 40, y + h - 34, 80, 26, '닫기', { style: 'night', onTap: () => { this.info2 = false; } });
  },
  emoteSheet(app) {
    const { g, W, H, input } = app, h = 130, y = H - h - 50, x = 10, w = W - 20;
    g.c.fillStyle = 'rgba(6,10,18,0.5)'; g.c.fillRect(0, 0, W, H);
    input.hit('em_block', 0, 0, W, H, () => { this.emoteOpen = false; });
    holo(g, x, y, w, h, T.card || T.panel, 16);
    const bw = Math.floor((w - 24 - 8) / 2);
    EMOTES.forEach((e, i) => button(app, 'em_' + i, x + 12 + (i % 2) * (bw + 8), y + 12 + Math.floor(i / 2) * 36, bw, 30, e, { style: 'night', onTap: () => { this.emoteOpen = false; R.emote(i).catch(() => {}); } }));
  },
};
