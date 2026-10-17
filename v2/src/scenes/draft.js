import { cardFront, renderFaces, backHeight } from '../art/skillcard.js';
import { button } from '../art/ui.js';
import { drawBig } from '../art/sprites.js';
import { SKILLS } from '../game/catalog.js';
import { lvOf } from '../game/view.js';
import { sfx } from '../core/sound.js';

// 카드 고르기 화면(2026-10-18 사용자 "진화 시 카드 배우고 교체는 기존 창이 아니라 진화 시 바로 진화 모션 보여 주면서 다음에 반드시 정하고 가야 함 ·
//  보류 가능하고, 따로 스킬 정하기 하면 다시 그 창이 뜨는 걸로 · 어두운 화면에 카드가 나열"): app.draft = { uid, t0, evo: { from, to, pot } | null, sel: [], focus }
//  진화면 먼저 연출(옛 모습이 하얗게 깜빡이며 빨라짐 → 번쩍 → 새 모습 + 빛살) → 어두운 화면에 후보 카드 · 고를 수만큼 누르고 [확정] · [보류] = 식물 관리 '스킬 정하기'로 다시.
//  고르기 규칙 = game/logic.js addDraft · draftPick(레벨업 · 진화 · 마지막 진화)
const CW = 66, CH = 90, GX = 10, GY = 12, BS = 3, EVO_MS = 1900, IN_MS = 320;   // BS = 설명 판 테 배율(정수 — 테 도트가 고르게)
const skillOf = id => ({ act: 'attack', cats: ['attack'], ...SKILLS[id] });
const ease = k => k * k * (3 - 2 * k);
const plantOf = (s, uid) => (s ? [...s.plants, ...(s.storage || [])].find(x => x.uid === uid) : null);

export function openDraft(app, p0, evo = null) {
  const p = p0 && (plantOf(app.state, p0.uid) || p0);
  if (!p || (!evo && !(p.drafts && p.drafts.length))) return;
  if (app.draft && app.draft.uid === p.uid && !evo) return;   // 이미 열려 있음(물을 여러 번 줘 고르기가 쌓여도 한 창에서 차례로)
  app.draft = { uid: p.uid, t0: app.t, evo, sel: [], focus: null, faces: null };
  if (evo) sfx('whoosh');
}

// 설명 판이 길면 끌어 넘김(main.js — 카드 고르기가 열린 동안 끌기는 여기로만)
export const draftScroll = app => ({ onDrag(dy) { const D = app.draft; if (D && D.maxY > 0) D.sy = Math.max(0, Math.min(D.maxY, (D.sy || 0) - dy)); } });

export function draftScreen(app, D) {
  const { g, W, H, t, input } = app, s = app.state, p = plantOf(s, D.uid), c = g.c;
  const drafts = (p && p.drafts) || [], k = t - D.t0;
  if (!p || (!drafts.length && (!D.evo || k > EVO_MS + 600))) { app.draft = null; return; }
  const kk = Math.max(0, Math.min(1, (H - 480) / 120)), L = (a, b) => Math.round(a + (b - a) * kk);   // 짧은 기기(480~599) = 위 간격을 좁혀 제목까지 다 보이게(아래로 붙이면 제목이 잘림)
  c.fillStyle = 'rgba(3,5,10,0.93)'; c.fillRect(0, 0, W, H);
  input.hit('draft_block', 0, 0, W, H, () => { if (D.evo && k < EVO_MS && k > 400) D.t0 = t - EVO_MS; });   // 진화 연출은 눌러서 넘김
  if (D.evo && k < EVO_MS + 300) evoMotion(app, D, k);
  if (D.evo && k < EVO_MS) return;
  const d = drafts[0]; if (!d) return;
  const k2 = D.evo ? k - EVO_MS : k, a = ease(Math.min(1, k2 / IN_MS));
  // 제목 · 고를 수
  const title = d.kind === 'evo' ? '진화' : `Lv${lvOf({ stage: d.st, lv: d.lv })}`;
  g.alpha(a, () => {
    g.text(title, W / 2, L(10, 40), { font: 'big', color: '#ffd890', align: 'center', outline: '#05070b', outlineW: 3 });
    g.text(`새 기술 ${d.pick}장 고르기 · ${D.sel.length}/${d.pick}`, W / 2, L(42, 80), { font: 'label', color: '#d8ecff', align: 'center' });
    if (drafts.length > 1) g.text(`고르기 ${drafts.length}개 기다림`, W / 2, L(56, 96), { color: '#8cb6de', align: 'center' });
    if (!(s.guide && s.guide.draft)) g.text('누르면 고르고, 다시 누르면 빼요', W / 2, L(68, 112), { color: '#8cb6de', align: 'center' });   // 보류 뒤 다시 고르는 곳은 보류할 때 알림 띠로
  });
  // 후보 카드(셋씩 줄 · 가운데) — 고른 카드 = 떠오름 + 금빛 테
  const n = d.cands.length, y0 = L(84, 132), gy = L(6, GY);
  d.cands.forEach((id, i) => {
    const row = Math.floor(i / 3), inRow = Math.min(3, n - row * 3), col = i % 3;
    const x = Math.round(W / 2 - (inRow * CW + (inRow - 1) * GX) / 2 + col * (CW + GX)), y = y0 + row * (CH + gy);
    const ki = ease(Math.max(0, Math.min(1, (k2 - i * 70) / IN_MS))), on = D.sel.includes(id), lift = on ? 6 : 0;
    g.alpha(ki, () => {
      cardFront(g, x, y + Math.round((1 - ki) * 24) - lift, CW, CH, skillOf(id), { can: true, lit: on });
      if (on) { const X = x - 2, Y = y - lift - 2, w = CW + 4, h = CH + 4, gc = '#ffd890'; g.rect(X, Y, w, 2, gc); g.rect(X, Y + h - 2, w, 2, gc); g.rect(X, Y, 2, h, gc); g.rect(X + w - 2, Y, 2, h, gc); }
    });
    if (k2 > IN_MS) input.hit('draft_c' + i, x, y - lift, CW, CH, () => {
      sfx('select'); D.focus = id; D.faces = null; D.sy = 0;
      if (on) D.sel = D.sel.filter(x2 => x2 !== id);
      else { D.sel.push(id); if (D.sel.length > d.pick) D.sel.shift(); }
    });
  });
  // 고른(누른) 카드 뒷면 = 자세한 설명
  const rows = Math.ceil(n / 3), fy = y0 + rows * (CH + gy) + 4, focus = D.focus && d.cands.includes(D.focus) ? D.focus : null;
  if (focus) {   // 넓은 설명 판(카드 비율이면 짧은 기기에서 글이 잘림) — 높이 = 글에 맞춤, 남은 자리보다 길면 판 안에서 끌어 넘김(main.js 가 끌기를 draftScroll 로)
    const BW = CW * BS, avail = Math.max(90, H - 72 - fy - 8), bx = Math.round(W / 2 - BW / 2), ins = 4 * BS;
    if (!D.faces || D.faces.id !== focus || D.faces.avail !== avail) {
      const sk = skillOf(focus), need = backHeight(sk, BW, { can: true }), BH = Math.min(avail, Math.max(90, need)), bodyH = Math.max(BH, need);
      D.faces = { id: focus, avail, BH, bodyH, f: renderFaces(sk, CW, CH, BW, BH, c.getTransform().a || 1, { can: true, free: true, bodyH }) };
    }
    const F = D.faces; D.maxY = F.bodyH - F.BH; D.sy = Math.max(0, Math.min(D.maxY, D.sy || 0));
    c.drawImage(F.f.back, bx, fy, BW, F.BH);
    g.clip(bx + ins, fy + ins, BW - ins * 2, F.BH - ins * 2, () => c.drawImage(F.f.body, bx, fy - Math.round(D.sy), BW, F.bodyH));
    if (D.maxY > 0) { const vh = F.BH - ins * 2, bh = Math.max(14, Math.round(vh * F.BH / F.bodyH)), by = fy + ins + Math.round((vh - bh) * D.sy / D.maxY); g.rect(bx + BW - ins + 1, by, 2, bh, '#6fb0ff'); }   // 넘길 수 있다는 막대 = 테 안쪽 어두운 줄 위(속성 아이콘 · 글을 안 가림)
  } else D.maxY = 0;
  // 아래 단추: 보류 · 확정
  const by = H - 62, bw = 116;
  button(app, 'draft_later', W / 2 - bw - 5, by, bw, 34, '보류', { style: 'night', font: 'head', onTap: () => { seen(app); app.draft = null; app.toast('식물 관리 \'스킬 정하기\'에서 다시 골라요'); } });
  const ready = D.sel.length === d.pick;
  button(app, 'draft_ok', W / 2 + 5, by, bw, 34, ready ? '확정' : `${D.sel.length}/${d.pick}`, { style: 'gold', font: 'head', disabled: !ready || D.busy, onTap: () => {
    D.busy = true; seen(app);
    const picks = [...D.sel];
    app.act('draftPick', { id: p.uid, n: 0, picks }).then(r => {
      D.busy = false; if (!r) return;
      sfx('coin');
      const TO = { battle: '스킬 칸에', store: '스킬 보관에', pend: '놓을 칸 고르기' };
      app.toast(r.got.map(x => `${SKILLS[x.id].name} → ${TO[x.to] || ''}`).join(' · '));
      D.sel = []; D.focus = null; D.faces = null; D.evo = null; D.t0 = app.t;   // 다음 고르기(있으면)가 다시 들어옴
    });
  } });
}
// 처음 한 번만 보이는 짧은 안내(이 겹창 위에선 처음 안내 판이 안 뜸) — 확정 · 보류하면 봤음
function seen(app) { const s = app.state; if (s && !(s.guide && s.guide.draft)) app.act('guide', { id: 'draft' }); }

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
