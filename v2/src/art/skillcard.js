// 전투 기술 카드(2026-10-16 사용자 "전투시 스킬도 뭔가 세로로 긴 카드 느낌을 내고 싶어. 꾹 누르면 뒷면으로 가까이 앞으로 가져오는 느낌이 나면서 뒷면에 상세 내용이 적힌 느낌?")
//  앞면 = 비용 보석(왼쪽 위) · 속성(오른쪽 위) · 그림 창(속성 색 · 효과/분류 큰 아이콘 · 창과 같은 연한 세로 결) · 이름 · 위력
//  뒷면 = 같은 테 + 상세(등급 · 분류 · 사거리 · 위력 · 비용 · 걸리는 효과와 설명 · 지금 상대에게의 상성 · 못 쓰는 까닭)
//  꾹 누르기(battle.js) = 카드가 화면 가운데로 다가오며 커지고 원근 있게 뒤집힘 — 2D 캔버스라 세로 조각마다 깊이만큼 높이·간격을 줄여 3D 뒤집기를 흉내(drawFlip)
import { Gfx } from '../core/gfx.js';
import { wrap, glyphH } from '../core/text.js';
import { icon, tinted } from './icons.js';
import { ELEMENT } from './palette.js';
import { rrect } from './ui.js';
import { STATUS, STATUS_DESC, BUFF_LOOK, fxChip, hexMix } from './statusLook.js';
import { CAT_ICON, CAT_NAME } from '../data/mock.js';
import { TIER_NAME } from '../game/catalog.js';

const C = { ink: '#0b1322', body: '#12294a', body2: '#183a62', plate: '#0c1e36', text: '#e6f3ff', sub: '#a9cdf0', dim: '#7396bb', line: '#8ccfff', gold: '#ffd890', good: '#ffd890', gem: '#24180a', gemRing: '#f0be7d', gemText: '#ffe9b8' };
const NONE = { name: '무속성', main: '#7f97b8', light: '#cfe0f4', dark: '#3c5474' };
export const elOf = sk => (sk && ELEMENT[sk.el]) || NONE;
const BUFF_KEY = { purify: 'purified' };   // 기술의 self 이름 → 효과 표 이름
// 기본기 설명(battle/model.js BASICS 규칙 그대로)
const BASIC_DESC = {
  basic: ['누구나 쓰는 공짜 공격'],
  guard: ['상대보다 늦게 움직이면', '받는 피해가 40%로 줄어듦', '먼저 움직이면 헛자세'],
  evade: ['먼저든 늦게든 성립', '상대 공격이 빗나갈 확률 +22', '스칠 확률 +14'],
};
export const LOCK_TEXT = { bind: '덩굴에 묶여 이번 턴 못 씀', taunt: '도발에 넘어가 자세를 못 씀' };
const LOCK_SHORT = { bind: '묶임', taunt: '도발' };   // 카드 앞면(그림 창 위)

// 그림 창의 큰 아이콘: 거는 효과 > 내 버프 > (공격 아닌) 분류 > 속성 > 칼
function artIcon(sk) {
  const f = sk.inflict && STATUS[sk.inflict.id];
  if (f && f.icon) return f.icon;
  const b = sk.self && STATUS[BUFF_KEY[sk.self] || sk.self];
  if (b && b.icon) return b.icon;
  const cat = (sk.cats && sk.cats[0]) || 'attack';
  if (cat !== 'attack') return CAT_ICON[cat] || 'sword';
  return sk.el && icon(sk.el) ? sk.el : 'sword';
}

// 테와 몸(앞·뒤 같음): 겉 먹선 → 속성 색 테(고르면 금빛) → 먹선 → 남색 몸(위가 한 단 밝게). R = 모서리
function cardFrame(g, x, y, w, h, sk, lit, R = 4) {
  const E = elOf(sk);
  rrect(g, x, y, w, h, R, C.ink);
  rrect(g, x + 1, y + 1, w - 2, h - 2, R - 1, lit ? C.gold : hexMix(E.main, C.line, 0.45));
  rrect(g, x + 2, y + 2, w - 4, h - 4, Math.max(1, R - 2), C.ink);
  rrect(g, x + 3, y + 3, w - 6, h - 6, Math.max(1, R - 3), C.body);
  g.vgrad(x + 4, y + 4, w - 8, h - 8, [C.body2, C.body, C.body]);   // 위가 한 단 밝은 몸(점 섞어 이음)
  g.rect(x + 4, y + 3, w - 8, 1, hexMix(C.body2, C.line, 0.35));
}

// 앞면(손패 크기 w×h, 논리 칸 — 지금 66×88). o = { can, lit, lock }
//  위 줄 = 비용 보석 · 속성 표, 그림 창 = 속성 색 세로 그라데이션 + 연한 세로 결 + 큰 아이콘(그림자), 이름(두 줄까지), 아래 = 위력 또는 분류
export function cardFront(g, x, y, w, h, sk, o = {}) {
  x |= 0; y |= 0;
  const E = elOf(sk), c = g.c, gr = 7, top = gr * 2 + 3;
  cardFrame(g, x, y, w, h, sk, o.lit);
  const ax = x + 5, ay = y + top + 1, aw = w - 10, ah = Math.round(h * 0.31);
  g.rect(ax - 1, ay - 1, aw + 2, ah + 2, C.ink);
  g.vgrad(ax, ay, aw, ah, [E.dark, hexMix(E.dark, E.main, 0.55), E.main]);
  c.fillStyle = 'rgba(230,243,255,0.10)';
  for (let xx = ax + 1; xx < ax + aw; xx += 3) c.fillRect(xx, ay, 1, ah);
  g.rect(ax, ay + ah - 1, aw, 1, hexMix(E.light, '#ffffff', 0.3));
  const name = artIcon(sk), ic = icon(name);
  if (ic) {
    const s = Math.max(1, Math.min(4, Math.floor(Math.min(aw - 6, ah - 4) / ic.width))), iw = ic.width * s, ih = ic.height * s, ix = Math.round(ax + (aw - iw) / 2), iy = Math.round(ay + (ah - ih) / 2);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 0.4; c.drawImage(tinted(name, C.ink), ix + s, iy + s, iw, ih); c.globalAlpha = 1;
    c.drawImage(ic, ix, iy, iw, ih);
  }
  const gx = x + gr + 2, gy = y + gr + 2;   // 비용 보석(왼쪽 위)
  g.disc(gx, gy, gr, C.ink); g.disc(gx, gy, gr - 1, C.gemRing); g.disc(gx, gy, gr - 3, C.gem);
  g.text(String(sk.cost || 0), gx + 0.5, gy - Math.round(glyphH('bold') / 2), { font: 'bold', color: C.gemText, align: 'center' });
  const ei = sk.el && icon(sk.el);   // 속성 표(오른쪽 위)
  if (ei) { const ex = x + w - gr - 2; g.disc(ex, gy, gr, C.ink); g.disc(ex, gy, gr - 1, E.dark); g.img(ei, ex - 5, gy - 5); }
  const foot = !!sk.power, z0 = ay + ah + 2, z1 = foot ? y + h - 16 : y + h - 5, lines = wrap(sk.name, 'bold', w - 8).slice(0, 2), lh = 12, gh = glyphH('bold');   // 위력 없는 카드(자세 · 버프)는 아래 줄 없이 이름만(분류는 그림 아이콘)
  const ny = Math.round(z0 + (z1 - z0 - (lines.length - 1) * lh - gh) / 2);
  lines.forEach((ln, i) => g.text(ln, x + w / 2, ny + i * lh, { font: 'bold', color: C.text, align: 'center' }));
  if (foot) { g.rect(x + 7, z1, w - 14, 1, hexMix(E.main, C.ink, 0.55)); g.text(`위력 ${sk.power}`, x + w / 2, z1 + 3, { font: 'bold', color: C.sub, align: 'center' }); }
  if (o.can === false) {   // 못 씀: 어둡게(묶임 · 도발은 까닭 글자)
    rrect(g, x + 1, y + 1, w - 2, h - 2, 3, 'rgba(6,10,20,0.58)');
    if (o.lock) {   // 그림 창 가운데에 짧게(자세한 까닭은 뒷면)
      const L = STATUS[o.lock] || {}, li = L.icon && icon(L.icon), txt = LOCK_SHORT[o.lock] || '', tw = g.textW(txt, 'bold') + (li ? 14 : 0), lx = Math.round(x + (w - tw) / 2), ly = Math.round(ay + (ah - 15) / 2);
      rrect(g, lx - 4, ly, tw + 8, 15, 3, 'rgba(6,10,20,0.85)');
      if (li) g.img(li, lx, ly + 2);
      g.text(txt, lx + (li ? 14 : 0), ly + Math.round((15 - glyphH('bold')) / 2), { font: 'bold', color: L.col || '#ff8a8a' });
    }
  }
}

// 빈 칸(배운 기술이 셋보다 적을 때 · 꾹 눌러 들어 올린 카드의 자리)
export function cardSlot(g, x, y, w, h, label = '') {
  rrect(g, x, y, w, h, 4, 'rgba(140,207,255,0.16)');
  rrect(g, x + 1, y + 1, w - 2, h - 2, 3, 'rgba(8,14,26,0.55)');
  if (label) g.text(label, x + w / 2, y + Math.round(h / 2) - 6, { color: C.dim, align: 'center' });
}

// 뒷면 내용(큰 카드 크기 w×h, 1배 글자). o = { can, lock, energy, foe: { name, el }, mult }
function cardBack(g, w, h, sk, o) {
  const E = elOf(sk), P = 14, cw = w - P * 2, cat = (sk.cats && sk.cats[0]) || 'attack';
  const wm = icon(artIcon(sk));   // 아래쪽 옅은 문양(앞면 그림 창의 아이콘)
  if (wm) { const s = Math.floor(Math.min(cw * 0.55, h * 0.3) / wm.width), iw = wm.width * s; g.c.imageSmoothingEnabled = false; g.alpha(0.09, () => g.c.drawImage(tinted(artIcon(sk), E.light), Math.round((w - iw) / 2), h - iw - 18, iw, iw)); }
  let y = 16;
  const ei = sk.el && icon(sk.el);
  g.text(sk.name, P, y, { font: 'head', color: C.text });
  if (ei) { g.disc(w - P - 7, y + 7, 9, C.ink); g.disc(w - P - 7, y + 7, 8, E.dark); g.img(ei, w - P - 12, y + 2); }
  y += 22;
  const tags = [TIER_NAME[sk.tier], CAT_NAME[cat], sk.act === 'attack' ? (sk.ranged ? '원거리' : '근접') : null, sk.area ? '광역' : null, sk.el ? `${E.name} 속성` : null].filter(Boolean);
  for (const ln of wrap(tags.join(' · '), 'body', cw)) { g.text(ln, P, y, { color: C.sub }); y += 14; }
  y += 4; g.rect(P, y, cw, 1, hexMix(E.main, C.ink, 0.35)); y += 9;
  // 큰 수: 위력 · 비용
  const bw = Math.floor((cw - 8) / 2), box = (bx, label, val, ic) => {
    rrect(g, bx, y, bw, 34, 4, C.ink); rrect(g, bx + 1, y + 1, bw - 2, 32, 3, C.plate);
    g.text(label, bx + 8, y + 5, { color: C.dim });
    if (ic) g.img(icon(ic), bx + 8, y + 18);
    g.text(val, bx + (ic ? 22 : 8), y + 15, { font: 'name', color: C.text });
  };
  box(P, '위력', sk.power ? String(sk.power) : '—', null);
  box(P + bw + 8, '비용', String(sk.cost || 0), 'energy');
  y += 44;
  // 설명 줄: 기본기 → 규칙 문장, 효과 → 칩 + 누구에게 + 한 줄 설명
  const line = (txt, col = C.text, font = 'body') => { for (const ln of wrap(txt, font, cw)) { g.text(ln, P, y, { font, color: col }); y += 15; } };
  if (BASIC_DESC[sk.id]) for (const ln of BASIC_DESC[sk.id]) line(ln);
  const fx = [];
  if (sk.inflict) fx.push({ id: sk.inflict.id, n: sk.inflict.n || 1, to: '상대에게' });
  if (sk.self) fx.push({ id: BUFF_KEY[sk.self] || sk.self, buff: BUFF_LOOK[sk.self], to: '나에게' });
  if (sk.also) fx.push({ id: BUFF_KEY[sk.also] || sk.also, buff: BUFF_LOOK[sk.also], to: '나에게' });
  for (const f of fx) {
    y += 2;
    const cwid = fxChip(g, P, y, f.buff ? null : f.id, f.buff);
    g.text(f.to + (f.n > 1 ? ` ${f.n}겹` : ''), P + cwid + 6, y + 2, { color: C.sub });
    y += 19;
    if (STATUS_DESC[f.id]) line(STATUS_DESC[f.id]);
  }
  // 지금 상대에게의 상성(공격 기술)
  if (o.foe && sk.act === 'attack') {
    y += 4; g.rect(P, y, cw, 1, hexMix(C.line, C.ink, 0.6)); y += 8;
    const fe = ELEMENT[o.foe.el];
    if (o.mult > 1) line(`상대 ${o.foe.name}${fe ? `(${fe.name})` : ''}에게 효과가 굉장하다 · 피해 ×1.5`, C.good, 'bold');
    else line(`상대 ${o.foe.name}${fe ? `(${fe.name})` : ''}에게 보통`, C.dim);
  }
  // 못 쓰는 까닭
  if (o.can === false) {
    y += 4;
    if (o.lock) line(LOCK_TEXT[o.lock] || '지금은 못 씀', (STATUS[o.lock] || {}).col || '#ff8a8a', 'bold');
    else if ((sk.cost || 0) > (o.energy ?? 99)) line(`에너지가 모자람 — 지금 ${o.energy} · 필요 ${sk.cost}`, '#ff9a9a', 'bold');
    else line('지금은 못 씀', '#ff9a9a', 'bold');
  }
}

// 꾹 눌러 볼 큰 카드 두 장(앞 · 뒤)을 기기 화소로 미리 그림: 앞면 = 손패 그림 그대로 S배(테·도트·글자가 함께 커짐), 뒷면 = 같은 테를 S배 + 상세는 1배 글자
export function renderFaces(sk, w, h, BW, BH, k, o = {}) {
  const S = BW / w, mk = () => { const cv = document.createElement('canvas'); cv.width = Math.round(BW * k); cv.height = Math.round(BH * k); return cv; };
  const front = mk(), fc = front.getContext('2d'), G1 = new Gfx(fc);
  fc.setTransform(k * S, 0, 0, k * S, 0, 0);
  cardFront(G1, 0, 0, w, h, sk, { can: o.can, lock: o.lock });
  const back = mk(), bc = back.getContext('2d'), G2 = new Gfx(bc);
  bc.setTransform(k * S, 0, 0, k * S, 0, 0);
  cardFrame(G2, 0, 0, w, h, sk, false);
  bc.setTransform(k, 0, 0, k, 0, 0);
  cardBack(G2, BW, BH, sk, o);
  return { front, back };
}

// 원근 뒤집기: (cx, cy) = 카드 가운데, w·h = 지금 크기(논리 칸), th = 0(앞) → π(뒤). 세로 조각마다 깊이 z = x·sinθ, 원근 s = f / (f + z)
export function drawFlip(c, front, back, cx, cy, w, h, th) {
  const cos = Math.cos(th), sin = Math.sin(th), face = cos >= 0 ? front : back, f = 2.6 * w, N = Math.max(12, Math.round(w / 2)), fw = face.width, fh = face.height;
  c.save();
  c.imageSmoothingEnabled = true;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, x0 = (u0 - 0.5) * w, x1 = (u1 - 0.5) * w;
    const s0 = f / (f + x0 * sin), s1 = f / (f + x1 * sin), X0 = cx + x0 * cos * s0, X1 = cx + x1 * cos * s1;
    const L = Math.min(X0, X1), Wd = Math.abs(X1 - X0);
    if (Wd < 0.05) continue;
    const su = cos >= 0 ? u0 : 1 - u1, hh = h * (s0 + s1) / 2;   // 뒷면은 좌우가 뒤집혀 보이므로 그림을 거꾸로 읽음
    c.drawImage(face, su * fw, 0, fw / N, fh, L, cy - hh / 2, Wd + 0.35, hh);
  }
  c.restore();
}
