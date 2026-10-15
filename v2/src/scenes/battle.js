import { arena1 } from '../art/bg.js';
import { arenaLife } from '../art/arenaLife.js';
import { icon, tinted } from '../art/icons.js';
import { drawBig, drawBigPose, drawPortrait, BGIMG } from '../art/sprites.js';
import { T, plate, msgBox, btnBody, tbar, tpips, padV, venueOf } from '../art/theme.js';
import { CAT_ICON, CAT_NAME, SPECIES } from '../data/mock.js';
import { makeUnit, makeBattle, playTurn, elemMult } from '../battle/model.js';
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
const ga = s => s + (hasB(s) ? '이' : '가'), eun = s => s + (hasB(s) ? '은' : '는');
const TIER = { miss: ['빗나감', 'dim', '빗나갔다!'], graze: ['스침', 'sub', '살짝 스쳤다'], hit: ['정타', 'main', ''], crit: ['치명!', 'gold', '급소에 맞았다!'] };

// 체력판: 얼굴 초상 + (상대만) 닉네임·랭크 + 이름·속성 + 체력 막대 + 에너지 칸 + 체력 숫자. 봇·사람 구분 없이 같은 정보만(2026-10-15 사용자)
function infoBox(app, x, y, u, hp, en, mine) {
  const { g } = app, w = 140, h = mine ? 56 : 64, P = T.ptext;
  plate(g, x, y, w, h);
  plate(g, x + 5, y + 5, 30, 30, 'deep');
  g.clip(x + 9, y + 9, 22, 22, () => drawPortrait(g, u.key, x + 8, y + 8, 24, !mine));
  let yy = y + 6;
  const tx = x + 40;
  if (!mine) { g.text(`${u.trainer} · ${u.rank}`, tx, yy, { color: P.sub }); yy += 13; }
  g.text(u.name, tx, yy, { font: 'bold', color: P.main });
  g.img(icon(u.el), x + w - 20, yy);
  yy += 15;
  tbar(g, tx, yy, w - 46, 6, hp / u.max, 'hp');
  yy += 9;
  tpips(g, tx - 1, yy + 1, en, u.energyMax, 7);
  g.text(`${Math.ceil(hp)}/${u.max}`, x + w - 7, mine ? y + h - 17 : yy + 8, { color: P.sub, align: 'right' });
}

function skillButton(app, x, y, w, h, sk, can, lit, onTap) {
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
  if (!sk.cost) g.text('무료', x + w - 9, yy + 23, { color: S.text, align: 'right' });
  else { g.text(String(sk.cost), x + w - 9, yy + 23, { font: 'bold', color: S.text, align: 'right' }); g.img(can ? icon('energy') : tinted('energy', S.text), x + w - 23, yy + 23); }
  if (can) input.hit(id, x, y, w, h, onTap, 2);
}

export const battle = {
  // 경기장 = 랭크 단계로(브론즈·실버 온실 → 골드·플래티넘 우주선 → 다이아 이상 밤 정원), 촬영·시험은 ?venue= 로 고름
  theme(app) { return this.venue || venueOf(app.state.tournament?.tier); },
  enter(p) {
    this.venue = p.venue || null;
    const seed = p.seed ? +p.seed : p.phase ? 20261015 : (Date.now() & 0x7fffffff);   // 판 씨앗은 판을 열 때 한 번(계산 경로 밖 — 서버 권위 때는 서버가 줌), 촬영은 고정
    const me = makeUnit('me', SPECIES.flower_grass, { key: 'flower_grass', name: '페탈로즈', hp: 220, atk: 35, def: 24, spd: 30, crit: 5 });
    const foe = makeUnit('foe', SPECIES.vine_water, { key: 'vine_water', name: '타이드바인', hp: 240, atk: 32, def: 22, spd: 26, crit: 5, trainer: '코스모싹', rank: '브론즈 2' });
    this.B = makeBattle({ me, foe, seed });
    this.seed = seed;
    this.v = { hp: { me: me.hp, foe: foe.hp }, show: { me: me.hp, foe: foe.hp }, en: { me: me.energy, foe: foe.energy }, msg: `${eun(me.name)} 무엇을 할까?`, phase: 'pick', steps: [], si: 0, t0: null, pops: [], stance: {}, turn: 1, picked: null, uid: 0 };
    this.shot = p.phase === 'hit' ? 'hit' : null;   // 촬영용: 첫 턴 공격이 맞는 장에서 멈춘 그림
    if (this.shot) this.pick(null, me.kit[3]);
  },
  pick(app, sk) {
    const B = this.B, v = this.v;
    if (v.phase !== 'pick' || (sk.cost || 0) > B.me.energy) return;
    v.picked = sk.id; v.en.me -= sk.cost || 0;
    const turn = playTurn(B, sk);
    v.steps = this.buildSteps(turn); v.si = 0; v.t0 = app ? app.t : null; v.phase = 'play';
    if (app) this.startStep(v.steps[0], app.t);
  },
  buildSteps(turn) {
    const B = this.B, nm = id => B[id].name, sk = id => (id === 'me' ? turn.mySkill : turn.foeSkill), out = [];
    // 성립하는 자세(회피 = 늘, 방어 = 후공)는 맞기 전에 보여 준다 — 계산 순서(후공 차례)대로면 공격 뒤에 자세가 나와 어색함
    const evs = [...turn.events];
    for (let i = 0; i < evs.length; i++) if (evs[i].t === 'hit') { const j = evs.findIndex((e, k) => k > i && e.t === 'stance' && e.who === evs[i].to && e.active); if (j > i) { evs.splice(i, 0, evs.splice(j, 1)[0]); i++; } }
    for (const e of evs) {
      if (e.t === 'first') out.push({ kind: 'first', ms: 750, who: e.who, msg: `${ga(nm(e.who))} 먼저 움직인다!` });
      else if (e.t === 'stance') out.push({ kind: 'stance', ms: 950, who: e.who, stance: e.kind, active: e.active, msg: `${nm(e.who)}의 ${sk(e.who).name}!` + (e.active ? '' : ' 하지만 먼저라 막을 게 없다') });
      else if (e.t === 'hit') { const s = sk(e.who), A = ATTACKS[s.fx || B[e.who].key] || ATTACKS.flower_grass; out.push({ kind: 'attack', ms: FRA * FRAME_MS, who: e.who, to: e.to, ev: e, skill: s, uid: ++this.v.uid, anim: makeAttack(A, B[e.who].key, B[e.to].key, e.who === 'foe', this.seed % 97 + out.length), msg: `${nm(e.who)}의 ${s.name}!` }); }
      else if (e.t === 'counter') out.push({ kind: 'counter', ms: 900, who: e.who, to: e.to, ev: e, msg: `${nm(e.who)}의 되받아치기!` });
      else if (e.t === 'energy') out.push({ kind: 'note', ms: 650, msg: `${nm(e.who)} 기력 +${e.gain}` });
      else if (e.t === 'status') out.push({ kind: 'note', ms: 650, msg: `${nm(e.to)}에게 ${e.status}` });
    }
    out.push({ kind: 'end', ms: 450 });
    return out;
  },
  startStep(st, t) {
    const v = this.v, B = this.B;
    if (!st) return;
    if (st.msg) v.msg = st.msg;
    if ((st.kind === 'stance' || st.kind === 'attack') && st.who === 'foe' && !v.foePaid) { v.en.foe -= this.B.log[this.B.log.length - 1].foeSkill.cost || 0; v.foePaid = true; }
    if (st.kind === 'stance') v.stance[st.who] = { kind: st.stance, active: st.active };
    if (st.kind === 'counter') { v.hp[st.to] = Math.max(0, v.hp[st.to] - st.ev.dmg); this.pop(st.to, `-${st.ev.dmg}`, 'bad', t); }
    if (st.kind === 'end') { v.en = { me: B.me.energy, foe: B.foe.energy }; }
  },
  applyHit(st, t) {
    const v = this.v, e = st.ev, A = this.B[st.who], D = this.B[st.to];
    st.applied = true;
    const [label, tone, line] = TIER[e.tier];
    if (e.tier !== 'miss') { v.hp[st.to] = Math.max(0, v.hp[st.to] - e.dmg); this.pop(st.to, `-${e.dmg}`, e.tier === 'crit' ? 'gold' : 'bad', t, true); }
    this.pop(st.to, label, tone, t, false, -16);
    const great = e.tier !== 'miss' && elemMult(st.skill.el, D.el) > 1;
    const extra = [line, great ? '효과가 굉장하다!' : '', e.guard ? '방어 자세로 막았다' : '', e.evade && e.tier !== 'miss' ? '피하려 했지만' : ''].filter(Boolean).join(' · ');
    if (extra) v.msg = `${A.name}의 ${st.skill.name}! ${extra}`;
  },
  pop(who, text, tone, t, big = false, dy = 0) { const [x, y] = who === 'me' ? [PX, PY - 92] : [EX, EY - 92]; this.v.pops.push({ text, tone, t0: t, x, y: y + dy, big }); },
  tick(app) {
    const v = this.v, t = app.t;
    if (v.phase === 'play') {
      if (v.t0 == null) { v.t0 = t; if (this.shot) v.t0 = t - (v.steps[v.si].kind === 'attack' ? 0 : 0); this.startStep(v.steps[v.si], t); }
      let st = v.steps[v.si];
      if (this.shot) {   // 촬영: 첫 공격 단계의 맞은 직후 장에 멈춤
        const ai = v.steps.findIndex(s => s.kind === 'attack');
        if (ai >= 0 && v.si !== ai) { for (let i = v.si + 1; i <= ai; i++) this.startStep(v.steps[i], t); v.si = ai; v.t0 = t - (v.steps[ai].anim.I + 1) * FRAME_MS; }
        return;
      }
      while (st && t - v.t0 >= st.ms) {
        if (st.kind === 'attack' && !st.applied) this.applyHit(st, t);
        v.t0 += st.ms; v.si++; st = v.steps[v.si];
        if (st) this.startStep(st, t);
      }
      if (!st) this.finishTurn(app);
    } else if (v.phase === 'over' && !v.leaving && t - v.overT0 > 1700) { v.leaving = true; app.go('result', { win: this.B.over === 'win', venue: T.key }, 'shutter'); }   // 한 번만(매 장 부르면 전환이 계속 처음부터)
    for (const k of ['me', 'foe']) { const d = v.hp[k] - v.show[k]; v.show[k] += Math.abs(d) < 0.6 ? d : d * 0.18; }
    v.pops = v.pops.filter(p => t - p.t0 < 1100);
  },
  finishTurn(app) {
    const B = this.B, v = this.v;
    v.hp = { me: B.me.hp, foe: B.foe.hp }; v.en = { me: B.me.energy, foe: B.foe.energy }; v.stance = {}; v.foePaid = false; v.turn = B.turn;
    if (B.over) { v.phase = 'over'; v.overT0 = app.t; v.msg = B.over === 'win' ? `${ga(B.foe.name)} 쓰러졌다!` : `${ga(B.me.name)} 쓰러졌다…`; }
    else { v.phase = 'pick'; v.picked = null; v.msg = `${eun(B.me.name)} 무엇을 할까?`; }
  },
  draw(app) {
    const { g, W, H, t } = app;
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
      const u = B[who]; let pose = null, flash = false, dx = 0, dy = 0;
      if (fr) { if (who === st.who) pose = fr.atkPose; else if (st.ev.tier !== 'miss') { pose = fr.tgtPose; flash = fr.flash; dx = fr.shake; dy = -fr.hop; } }
      if (st && st.kind === 'counter' && who === st.to && t - v.t0 < 160) flash = true;
      const view = who === 'foe' ? 'far' : null;   // 먼 쪽 화분 = 18°(덜 내려다봄, 사용자 "상대의 화분 각도도 조정해줘")
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
        const k = (t - p.t0) / 1100, y = Math.round(p.y - k * 16), col = { bad: '#ff6a6a', gold: '#ffd84a', dim: '#c8c8d0', sub: '#e8e0b0', main: '#ffffff' }[p.tone];
        g.alpha(Math.min(1, (1 - k) * 2.2), () => g.text(p.text, p.x, y, { font: p.big ? 'head' : 'bold', color: col, align: 'center', outline: T.ink, outlineW: 3 }));
      }
    });
    // 위 띠: 턴 · 대회 · 판 수 · 항복
    g.rect(0, 0, W, AY, T.bg2); g.rect(0, AY - 2, W, 1, T.panel.frameLo); g.rect(0, AY - 1, W, 1, T.ink);
    btnBody(g, 5, 3, 38, 18, T.btn.second, true);
    g.text(`${v.turn}턴`, 24, 6, { font: 'bold', color: T.btn.second.text, align: 'center' });
    g.text('새싹 브론즈 · 예선', W / 2 - 14, 6, { color: T.text.main, align: 'center' });
    for (let i = 0; i < 5; i++) { const x = W / 2 + 40 + i * 7; g.rect(x, 8, 6, 6, T.ink); g.rect(x + 1, 9, 4, 4, i < 1 ? T.text.gold : (i === 1 ? T.text.main : T.bar.back)); }
    const fp = app.input.isPressed('bt_flag');
    btnBody(g, W - 31, 3, 26, 18, T.btn.second, fp);
    g.img(icon('flag'), W - 24, 5 + (fp ? 1 : 0));
    app.input.hit('bt_flag', W - 31, 3, 26, 18, () => app.go('home', {}, 'shutter'), 6);
    // 체력판
    infoBox(app, 6, AY + 4, B.foe, v.show.foe, v.en.foe, false);   // 상대 판 = 위 띠 바로 아래 왼쪽(2026-10-15 사용자 "상대의 체력바를 위로 올려서 붙여")
    infoBox(app, W - 146, AY + AH - 62, B.me, v.show.me, v.en.me, true);
    // 아래 판: 대사 상자 → 에너지 → 기술 6칸
    const PY0 = H - PANEL_H;
    g.rect(0, PY0, W, PANEL_H, T.bg2);
    for (let y = PY0 + 6; y < H; y += 6) g.rect(0, y, W, 1, T.bg);
    g.rect(0, PY0, W, 1, T.ink); g.rect(0, PY0 + 1, W, 1, T.panel.frame); g.rect(0, PY0 + 2, W, 1, T.panel.frameLo);
    msgBox(g, 8, PY0 + 9, W - 16, 36);
    g.para ? g.para(v.msg, 18, PY0 + 15, W - 40, { font: 'bold', color: T.mtext.main }) : g.text(v.msg, 18, PY0 + 20, { font: 'bold', color: T.mtext.main });
    if (v.phase === 'pick' && Math.floor(t / 450) % 2) g.rect(W - 22, PY0 + 31, 5, 3, T.mtext.sub);
    const ey = PY0 + 53;
    g.text('에너지', 12, ey, { font: 'bold', color: T.text.gold });
    tpips(g, 54, ey + 2, v.en.me, B.me.energyMax, 9);
    g.text(`${v.en.me}/${B.me.energyMax}`, W - 12, ey, { color: T.text.sub, align: 'right' });
    const gx = 8, gy = PY0 + 72, cw = Math.floor((W - 16 - 6) / 2), ch = 44;
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2), sk = B.me.kit[i];
      const can = !!sk && v.phase === 'pick' && (sk.cost || 0) <= B.me.energy;
      skillButton(app, gx + col * (cw + 6), gy + row * (ch + 6), cw, ch, sk, can, v.picked === sk?.id, () => this.pick(app, sk));
    }
  },
};
