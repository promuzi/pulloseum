import { cardFront, cardSlot, renderFaces, backHeight } from '../art/skillcard.js';
import { button } from '../art/ui.js';
import { drawBig } from '../art/sprites.js';
import { SKILLS } from '../game/catalog.js';
import { CARDS, CARD_SLOTS, PASS_STORE, cardFace, isSkillCard, cardPrice } from '../game/cards.js';
import { slotLayout, LOADOUT, SKILL_STORE, MUT_MAX, BASIC_IDS } from '../game/logic.js';
import { cardSkillOf } from '../game/fight.js';
import { basicsOf } from '../battle/model.js';
import { lvOf } from '../game/view.js';
import { sfx } from '../core/sound.js';
import { eul } from '../core/josa.js';
import { ask } from './popups.js';

// 카드 고르기 화면(2026-10-18 사용자 "진화 시 바로 진화 모션 보여 주면서 다음에 반드시 정하고 가야 함 · 보류 가능" →
//  다시 짬 "상단에는 얻은 거, 그 위에 몇 개 선택인지 · 아래에는 장착한 것과 보관이 다 있어서(기존 UI대로) · 드래그 말고 장착 누른 후에 기존 거 눌러서 교환 ·
//  바뀐 기존 거는 위에 올라가고 서로 빛나서 확인 · 확정 전까지는 되돌릴 수 있게 · 꾹 누르면 뒷면"):
//  app.draft = { uid, t0, evo, dk, t1, top: 위 줄(후보 + 밀려 올라온 기존 카드), lay: 놓인 배치({ battle, store } | { cards, pstore }), hist, sel, arm, glow, sy, tx, peek }
//  진화면 먼저 연출 → 그 식물의 맨 앞 고르기(p.drafts[0])부터 차례로(기술 고르기 → 패시브 고르기). 확정 = 규칙 draftApply(놓은 배치 그대로) · [보류] = 맨 위 '보류' 단추로 다시.
const CW = 66, CH = 90, GX = 10, GY = 8, EVO_MS = 1900, IN_MS = 320, HOLD_MS = 320;
const ease = k => k * k * (3 - 2 * k), clamp01 = v => Math.max(0, Math.min(1, v));
const plantOf = (s, uid) => (s ? s.plants.find(x => x.uid === uid) : null);   // 스마트팜 식물만(보관고로 가면 창이 닫힘 — 규칙도 스마트팜 식물만 확정)
const faceOf = (p, id) => (!id ? null : BASIC_IDS.includes(id) ? { ...basicsOf(p.key).find(b => b.id === id), basic: true } : CARDS[id] ? (isSkillCard(id) ? cardSkillOf(p, id) : cardFace(id)) : { act: 'attack', cats: ['attack'], ...SKILLS[id] });
const want = d => Math.min(d.pick, d.cands.length);
const placed = (D, d) => Object.values(D.lay).flat().filter(x => x && d.cands.includes(x)).length;
// 칸 묶음: 기술 고르기 = 장착 b0~b5 · 보관 s0~s5 / 패시브 고르기 = 장착 c0~c2 · (변이 식물) 보관 p0~p2
const groupsOf = (d, p) => (d.part === 'passive' ? [['c', CARD_SLOTS, '장착'], ['p', PASS_STORE, '보관']] : [['b', LOADOUT, '장착'], ['s', SKILL_STORE, '보관']]);   // 패시브 보관 = 모든 식물(2026-10-22 귀속)
const rowOf = (D, r) => (r === 'b' ? D.lay.battle : r === 's' ? D.lay.store : r === 'c' ? D.lay.cards : D.lay.pstore);
const idIn = (D, key) => rowOf(D, key[0])[+key.slice(1)] || null;
const nameOf = (p, id) => (faceOf(p, id) || {}).name || id;

export function openDraft(app, p0, evo = null) {
  const p = p0 && (plantOf(app.state, p0.uid) || p0);
  if (!p || (!evo && !(p.drafts && p.drafts.length))) return;
  if (app.draft && app.draft.uid === p.uid && !evo) return;   // 이미 열려 있음(물을 여러 번 줘 고르기가 쌓여도 한 창에서 차례로)
  app.draft = { uid: p.uid, t0: app.t, evo, dk: null };
  if (evo) sfx('whoosh');
}
// 지금 고르기(맨 앞)가 바뀌었으면 화면 상태를 처음부터(다음 고르기 · 다른 데서 먼저 확정됨)
function sync(app, D, p) {
  const d = p.drafts && p.drafts[0];
  if (!d) return null;
  const dk = `${d.part || 'skill'}:${d.kind}:${d.st}:${d.lv}:${d.cands.join()}`;
  if (D.dk === dk) return d;
  const L = slotLayout(p);
  Object.assign(D, { dk, t1: app.t, top: [...d.cands], lay: d.part === 'passive' ? { cards: L.cards, pstore: L.pstore } : { battle: L.battle, store: L.store }, hist: [], sel: null, arm: false, glow: null, sy: 0, tx: 0, peek: null, pf: null, busy: false });
  return d;
}
// 위 줄 ti 째 카드를 칸 key 에 놓기(빈 칸 = 채움 · 찬 칸 = 바꿈 — 원래 것은 위 줄 끝으로). 안 되면 알림 문구를 돌려줌
export function placeCard(app, D, ti, key) {
  const p = plantOf(app.state, D.uid), d = p && p.drafts && p.drafts[0], id = D.top[ti];
  if (!d || !id) return null;
  const r = key[0], i = +key.slice(1), row = rowOf(D, r), compact = r === 's' || r === 'p', old = row[i] || null;
  if (d.cands.includes(id) && placed(D, d) >= want(d)) return `${want(d)}장까지예요`;
  if (r === 'p' && !(CARDS[id] && !isSkillCard(id))) return '패시브 보관엔 패시브 카드만 넣어요';
  if (r === 'b' && isSkillCard(id) && !isSkillCard(old) && D.lay.battle.filter(isSkillCard).length >= MUT_MAX) return `변이 기술 카드는 장착에 ${MUT_MAX}장까지예요`;
  D.hist.push(JSON.stringify({ top: D.top, lay: D.lay }));
  D.top.splice(ti, 1);
  if (compact && !old) row.push(id); else row[i] = id;
  if (old) { D.top.push(old); D.tx = 1e9; }   // 올라간 카드가 보이게 위 줄을 끝으로(그릴 때 끝 값으로 줄임)
  D.glow = { key: r + row.indexOf(id), id: old, t: app.t };
  D.sel = null; D.arm = false;
  return null;
}
function undo(D) { const h = D.hist.pop(); if (!h) return; const o = JSON.parse(h); D.top = o.top; D.lay = o.lay; D.glow = null; D.sel = null; D.arm = false; }
// 끌기(main.js — 고르기가 열린 동안 끌기는 여기로만): 위 줄에서 시작 = 옆으로(카드가 많을 때) · 아래 칸에서 = 위아래
export const draftScroll = app => ({ onDrag(dy, dx, ev) {
  const D = app.draft; if (!D) return;
  if (D.topY != null && ev.y0 >= D.topY - 8 && ev.y0 < D.topY + CH + 8) D.tx = Math.max(0, Math.min(D.maxTx || 0, (D.tx || 0) - dx));
  else if (D.slotTop != null && ev.y0 >= D.slotTop) D.sy = Math.max(0, Math.min(D.maxSy || 0, (D.sy || 0) - dy));
} });

const edge = (g, x, y, c, a, w = CW, h = CH) => g.alpha(a, () => { const X = x - 2, Y = y - 2, W2 = w + 4, H2 = h + 4; g.rect(X, Y, W2, 2, c); g.rect(X, Y + H2 - 2, W2, 2, c); g.rect(X, Y, 2, H2, c); g.rect(X + W2 - 2, Y, 2, H2, c); });

export function draftScreen(app, D) {
  const { g, W, H, t, input } = app, s = app.state, p = plantOf(s, D.uid), c = g.c, k = t - D.t0;
  if (!p || (!(p.drafts && p.drafts.length) && (!D.evo || k > EVO_MS + 600))) { app.draft = null; return; }
  c.fillStyle = '#03050a'; c.fillRect(0, 0, W, H);   // 불투명(빈 칸 사이로 뒤 화면 카드가 비치지 않게)
  input.hit('draft_block', 0, 0, W, H, () => { if (D.evo && k < EVO_MS && k > 400) D.t0 = t - EVO_MS; else if (D.arm || D.sel != null) { D.arm = false; D.sel = null; } });   // 진화 연출은 눌러서 넘김 · 빈 데 = 고른 것 그만
  if (D.evo && k < EVO_MS + 300) evoMotion(app, D, k);
  if (D.evo && k < EVO_MS) return;
  const d = sync(app, D, p); if (!d) return;
  if (D.evo && D.t1 < D.t0 + EVO_MS) D.t1 = D.t0 + EVO_MS;
  const k2 = t - D.t1, a = ease(clamp01(k2 / IN_MS)), live = k2 > IN_MS && !D.busy && !app.confirm;
  const kk = clamp01((H - 480) / 120), L = (lo, hi) => Math.round(lo + (hi - lo) * kk);   // 짧은 기기(480~599) = 위 간격을 좁힘
  const pas = d.part === 'passive', N = want(d), got = placed(D, d);
  // 제목 · 몇 장 고르기
  const title = d.kind === 'evo' ? '진화' : d.kind === 'one' ? '새 기술' : `Lv${lvOf({ stage: d.st, lv: d.lv })}`;
  g.alpha(a, () => {
    g.text(title, W / 2, L(6, 14), { font: 'big', color: '#ffd890', align: 'center', outline: '#05070b', outlineW: 3 });
    g.text(`${pas ? '새 패시브' : '새 기술'} ${N}장 고르기 · ${got}/${N}`, W / 2, L(36, 48), { font: 'label', color: got === N ? '#ffd890' : '#d8ecff', align: 'center' });
  });
  // 위 줄 = 얻은 카드(후보 · 밀려 올라온 기존 카드는 흐리게 — 확정하면 버려짐) · 넘치면 옆으로 끌기
  const TY = L(56, 72), n = D.top.length, stride = CW + GX, rowW = n * stride - GX, fit = rowW <= W - 16;
  D.maxTx = fit ? 0 : rowW - (W - 16); D.tx = Math.min(D.tx || 0, D.maxTx); D.topY = TY;
  const x0 = fit ? Math.round((W - rowW) / 2) : 8 - Math.round(D.tx);
  g.clip(0, TY - 10, W, CH + 16, () => D.top.forEach((id, i) => {
    const x = x0 + i * stride, on = D.sel === i, lift = on ? 6 : 0, ki = ease(clamp01((k2 - i * 70) / IN_MS)), cand = d.cands.includes(id), y = TY + Math.round((1 - ki) * 20) - lift;
    g.alpha(ki, () => {
      cardFront(g, x, y, CW, CH, faceOf(p, id), { can: cand, lit: on });
      if (on) edge(g, x, y, '#ffd890', 1);
      else if (D.glow && D.glow.id === id) edge(g, x, y, '#ffd890', 0.5 + 0.4 * Math.sin(t / 140));
    });
    if (live && x + CW > 0 && x < W) input.hit('dr_t' + i, Math.max(0, x), TY - lift, Math.min(CW, W - x), CH, () => { sfx('select'); D.sel = on ? null : i; D.arm = false; });
  }));
  if (!fit) { const bw = Math.round((W - 16) * (W - 16) / rowW), bx = 8 + Math.round((W - 16 - bw) * D.tx / D.maxTx); g.rect(bx, TY + CH + 4, bw, 2, '#4f84bf'); }   // 옆으로 넘길 수 있다는 막대
  // [장착] · [취소](고른 카드가 있을 때) — 처음엔 짧은 안내 한 줄
  const AY = TY + CH + 10;
  if (D.sel != null && D.top[D.sel]) button(app, 'draft_arm', W / 2 - 52, AY, 104, 26, D.arm ? '취소' : '장착', { style: D.arm ? 'night' : 'gold', font: 'head', onTap: live ? () => { D.arm = !D.arm; sfx('select'); } : null });
  else if (!(s.guide && s.guide.draft2)) g.alpha(a, () => g.text('카드를 누르고 [장착] → 놓을 칸 · 꾹 = 설명', W / 2, AY + 7, { color: '#8cb6de', align: 'center' }));
  // 아래 = 장착 · 보관(식물 관리와 같은 배치) — 화면보다 길면 위아래로 끌기
  const SY0 = AY + 34, SY1 = H - 58, C3 = 3, gx0 = Math.round((W - C3 * CW - (C3 - 1) * GX) / 2);
  D.slotTop = SY0;
  let y = SY0 - Math.round(D.sy || 0);
  g.clip(0, SY0 - 4, W, SY1 - SY0 + 4, () => {
    for (const [r, cnt, name] of groupsOf(d, p)) {
      const row = rowOf(D, r), aimRow = D.arm && D.top[D.sel] && (r !== 'p' || (CARDS[D.top[D.sel]] && !isSkillCard(D.top[D.sel])));
      g.text(name, 14, y, { font: 'value', color: r === 'b' || r === 'c' ? '#e6f3ff' : '#ffd890' });
      g.text(`${row.filter(Boolean).length}/${cnt}`, W - 14, y + 1, { font: 'label', color: '#8cb6de', align: 'right' });
      y += 18;
      for (let i = 0; i < cnt; i++) {
        const key = r + i, x = gx0 + (i % C3) * (CW + GX), yy = y + Math.floor(i / C3) * (CH + GY), id = row[i] || null;
        if (id) cardFront(g, x, yy, CW, CH, faceOf(p, id), { can: true, lit: !!(D.glow && D.glow.key === key) });
        else cardSlot(g, x, yy, CW, CH, '빈 칸');
        if (id && d.cands.includes(id)) edge(g, x, yy, '#ffd890', 0.85);   // 새로 놓은 카드
        if (D.glow && D.glow.key === key && D.glow.id) edge(g, x, yy, '#fff3c8', 0.5 + 0.4 * Math.sin(t / 140));
        if (aimRow) edge(g, x, yy, '#ffd890', 0.35 + 0.35 * Math.sin(t / 150));
        const hy = Math.max(yy, SY0), hh = Math.min(yy + CH, SY1) - hy;
        if (live && hh > 8) input.hit('dr_' + key, x, hy, CW, hh, () => {
          if (!D.arm) return;
          const e = placeCard(app, D, D.sel, key);
          if (e) app.toast(e); else sfx('select');
        });
      }
      y += Math.ceil(cnt / C3) * (CH + GY) - GY + 14;
    }
  });
  D.maxSy = Math.max(0, y + Math.round(D.sy || 0) - SY1 + 4);
  if (D.maxSy > 0) { const vh = SY1 - SY0, bh = Math.max(16, Math.round(vh * vh / (vh + D.maxSy))), by = SY0 + Math.round((vh - bh) * (D.sy || 0) / D.maxSy); g.rect(W - 6, by, 2, bh, '#4f84bf'); }
  // 단추 줄: 되돌리기 · 보류 · 확정
  const by = H - 50, bw = Math.floor((W - 24 - 12) / 3);
  button(app, 'draft_undo', 12, by, bw, 34, '되돌리기', { style: 'night', font: 'head', disabled: !D.hist.length, onTap: live ? () => { undo(D); sfx('select'); } : null });
  button(app, 'draft_later', 18 + bw, by, bw, 34, '보류', { style: 'night', font: 'head', onTap: live ? () => { seen(app); app.draft = null; app.toast('맨 위 보류 단추로 다시 골라요'); } : null });
  button(app, 'draft_ok', 24 + bw * 2, by, bw, 34, '확정', { style: 'gold', font: 'head', disabled: got !== N || D.busy, onTap: live ? () => confirm(app, D, p, d) : null });
  // 꾹 = 그 카드 뒷면(떼면 닫힘)
  const dn = input.down;
  if (live && !D.peek && dn && !dn.moved && dn.id && /^dr_/.test(dn.id) && input.holdMs() >= HOLD_MS) {
    const id = dn.id.startsWith('dr_t') ? D.top[+dn.id.slice(4)] : idIn(D, dn.id.slice(3));
    if (id) { input.claimHold(); D.peek = { id }; sfx('flip'); }
  }
  if (D.peek && !D.peek.keep && !input.down) D.peek = null;
  if (D.peek) drawPeek(app, D, p);
}
// 확정: 위 줄에 기존 카드가 남았으면 버린다고 먼저 묻기(기술 = 지운 기술 · 끼웠던 카드 = 귀속이라 팔 값만큼 돈 — 2026-10-22)
function confirm(app, D, p, d) {
  const drop = D.top.filter(x => !d.cands.includes(x)), cards = drop.filter(x => CARDS[x]), plain = drop.filter(x => !CARDS[x]);
  const go = () => {
    D.busy = true; seen(app);
    app.act('draftApply', { id: p.uid, n: 0, layout: D.lay }).then(r => {
      D.busy = false;
      if (!r) { D.dk = null; return; }   // 안 됨(다른 데서 먼저 확정 등) = 지금 상태로 다시
      sfx('coin');
      app.toast(r.got.length ? `${r.got.map(x => nameOf(p, x)).join(' · ')} 넣었어요` : '정했어요');
      D.evo = null; D.dk = null;   // 다음 고르기(있으면)가 다시 들어옴
    });
  };
  if (!drop.length) return go();
  const names = drop.map(x => nameOf(p, x)), msg = `${names.slice(0, -1).map(x => x + ' · ').join('')}${eul(names[names.length - 1])} 버릴까요?`;
  const sub = [plain.length ? '기술은 지운 기술로 가요(회귀 주사로 되찾음)' : '', cards.length ? `끼웠던 카드는 팔려요(돈 +${cards.reduce((a, x) => a + cardPrice(x), 0)})` : ''].filter(Boolean).join(' · ');
  ask(app, msg, sub, go, '확정');
}
// 처음 한 번만 보이는 짧은 안내(이 겹창 위에선 처음 안내 판이 안 뜸) — 확정 · 보류하면 봤음
function seen(app) { const s = app.state; if (s && !(s.guide && s.guide.draft2)) app.act('guide', { id: 'draft2' }); }
// 꾹 = 넓은 뒷면 판(글에 맞춘 높이 — 길면 화면 높이까지)
function drawPeek(app, D, p) {
  const { g, W, H } = app, c = g.c, id = D.peek.id;
  if (!D.pf || D.pf.id !== id) {
    const sk = faceOf(p, id), BW = CW * 3, need = backHeight(sk, BW, { can: true }), BH = Math.min(H - 60, Math.max(120, need));
    D.pf = { id, BW, BH, bodyH: Math.max(BH, need), f: renderFaces(sk, CW, CH, BW, BH, c.getTransform().a || 1, { can: true, free: true, bodyH: Math.max(BH, need) }) };
  }
  const P = D.pf, x = Math.round(W / 2 - P.BW / 2), y = Math.round(H / 2 - P.BH / 2), ins = 12;
  c.fillStyle = 'rgba(3,5,10,0.62)'; c.fillRect(0, 0, W, H);
  c.drawImage(P.f.back, x, y, P.BW, P.BH);
  g.clip(x + ins, y + ins, P.BW - ins * 2, P.BH - ins * 2, () => c.drawImage(P.f.body, x, y, P.BW, P.bodyH));
}
// 촬영(main.js __shot): 지금 고르기로 맞추고 놓기 · 고름 · [장착] · 꾹을 그대로 재현
export function draftShot(app, o) {
  const D = app.draft, p = D && plantOf(app.state, D.uid); if (!p) return;
  if (!sync(app, D, p)) return;
  D.t1 = app.t - 1000;
  for (const [ti, key] of o.moves || []) placeCard(app, D, ti, key);
  if (o.sel != null) { D.sel = o.sel; D.arm = !!o.arm; }
  if (o.peek != null) { const id = String(o.peek).startsWith('t') ? D.top[+String(o.peek).slice(1)] : idIn(D, String(o.peek)); if (id) D.peek = { id, keep: true }; }
  if (o.sy != null) D.sy = o.sy;
}

// 진화 연출: 0~1s 옛 모습이 하얗게 깜빡(점점 빨리) · 1.0~1.2s 번쩍 · 그 뒤 새 모습 + 빛살 · '진화!'
function evoMotion(app, D, k) {
  const { g, W, H, t } = app, c = g.c, E = D.evo, cx = W / 2, by = Math.round(H * 0.5) + Math.min(0, H - 600) / 2;
  const SW = 1000, FL = 1150;
  if (k < SW) {
    const per = Math.max(55, 220 - k * 0.17), flash = Math.floor(k / per) % 2 === 1;
    drawBig(g, E.from, E.pot, cx, by, { t, flash });
  } else {
    const kk = Math.min(1, (k - SW) / 700);
    c.save(); c.globalAlpha = 0.5 * (1 - kk * 0.6);
    for (let i = 0; i < 12; i++) {   // 빛살
      const an = i * Math.PI / 6 + t / 1400, r0 = 18, r1 = 70 + 50 * kk;
      c.strokeStyle = i % 2 ? '#ffe8a8' : '#bfe8ff'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cx + Math.cos(an) * r0, by - 40 + Math.sin(an) * r0); c.lineTo(cx + Math.cos(an) * r1, by - 40 + Math.sin(an) * r1); c.stroke();
    }
    c.restore();
    drawBig(g, E.to, E.pot, cx, by, { t, flash: k < FL + 80 });
    if (k > 1250) g.alpha(Math.min(1, (k - 1250) / 300), () => g.text('진화!', cx, by + 34, { font: 'big', color: '#ffd890', align: 'center', outline: '#05070b', outlineW: 3 }));
  }
  if (k > 850 && k < 1350) { const f = 1 - Math.abs(k - FL) / 220; if (f > 0) { c.fillStyle = `rgba(255,255,255,${(0.9 * f).toFixed(3)})`; c.fillRect(0, 0, W, H); } }
  if (!D.boom && k >= FL) { D.boom = true; sfx('levelup'); }
}
