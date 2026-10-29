// 전투 글자 연출 — 머리 위 숫자 · 한두 낱말 · 기술 이름 리본 · 승패 제목을 그리는 방식
// 2026-10-16 사용자 "글자 연출 예시로 몇개 보여줘봐 대충 만들지 말고 조사하고 해봐" → 고를 수 있는 넷(㉠~㉣) + 지금(now, battle.js 안 그대로)
//  고르기 = 주소 ?tfx=a|b|c|d · 검토 도구 window.__tfx = 'a' · 장면 값 { tfx } (기본 now)
//  ㉠ a 통통: 숫자가 1.85배까지 튀었다 0.92로 되튀며 자리 잡고(Factorio 'Damage Indicator' 1.0.2~3 — 1.85배 넘침 + 되튐) 곧게 오르지 않고 포물선(Valheim 'DamageSplash' — 호, 크기 = 그 한 방이 깎은 체력 몫),
//            치명 = 별 터짐 + 금빛 · 결정타 = 한 번 더 부풂(Factorio 'emphasis pulse'), 금빛 낱말 = 글자마다 차례로 튀고 빛이 한 번 훑음, 승리 = 글자가 하나씩 떨어져 튄 뒤 살랑(Febucci 'wave')
//  ㉡ b 쾅:   크게 날아와 빨라지며 찍힘 → 흰 번쩍 · 찌그러졌다 펴짐 · 흔들림 · 충격파 고리 · 파편, 치명 = 찍히기 전 모여드는 빛살(스매시 브라더스 결정타 줌 — 번쩍 · 빛살 · 느려짐),
//            낱말 = 도장 쾅, 리본 = 옆에서 휙(잔상 줄), 승리 = 화면 번쩍 + 고리 + 불꽃 · 패배 = 위에서 쿵
//  ㉢ c 컷인: 굵은 기울임 흰 글자 + 검은 테 + 빨강 어긋난 그림자, 낱말 = 글자마다 다른 상자 · 기울기(페르소나 5 — 흑백 바탕에 강한 빨강, 흔들리는 글자 기준선),
//            리본 = 기운 띠가 화면 끝에서 미끄러져 들어옴, 승리 = 검은 띠가 화면을 가로지르고 큰 글자 상자
//  ㉣ d 굴림: 숫자가 슬롯 릴처럼 굴러 멈춤(Balatro 분석 — 자리마다 50ms 차례 · cubic-bezier(.34,1.56,.64,1)), 멈추면 한 번 부풂, 흔들림 세기 = 깎은 몫(작음 1~2 · 중간 3~4 · 큼 8까지 + 기울기),
//            낱말 = 타자기처럼 한 글자씩 커지며(Febucci 'size') 살랑, 리본 = 가운데서 펼쳐지는 띠 + 주사선, 승리 = 글자마다 릴이 돌다 멈춤 + 칩 터짐
import { measure, glyphH, drawText } from '../core/text.js';
import { ELEMENT } from './palette.js';
import { rrect } from './ui.js';
import { hexMix } from './statusLook.js';

export const TFX_KEYS = ['now', 'a', 'b', 'c', 'd'];
export const TFX = { key: 'd' };   // 2026-10-16 사용자 "연출은 d가 좋다" → ㉣ 굴림이 기본(나머지는 ?tfx= 로 비교용)
export const setTfx = k => { if (TFX_KEYS.includes(k)) TFX.key = k; };
try {
  setTfx(new URLSearchParams(location.search).get('tfx'));
  Object.defineProperty(window, '__tfx', { get: () => TFX.key, set: setTfx, configurable: true });
} catch {}

// ── 곡선 · 도움 ──
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const mix = (a, b, k) => a + (b - a) * k;
const oQ = x => 1 - (1 - x) * (1 - x);
const oC = x => 1 - (1 - x) ** 3;
const iQ = x => x * x;
const ioQ = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const oB = s => x => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;   // 넘쳤다 돌아옴
function bezier(x1, y1, x2, y2) {   // CSS cubic-bezier(x1,y1,x2,y2)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s, dX = s => (3 * ax * s + 2 * bx) * s + cx;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let s = x; for (let i = 0; i < 8; i++) { const e = X(s) - x, d = dX(s); if (Math.abs(e) < 1e-5 || !d) break; s = cl(s - e / d); } return Y(s); };
}
const roll = bezier(0.34, 1.56, 0.64, 1);
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 0x9e37, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// 열쇠 장면 [[ms, 값, 곡선], …] 사이를 이음
function kf(ms, L) {
  if (ms <= L[0][0]) return L[0][1];
  for (let i = 1; i < L.length; i++) { const [t1, v1, e] = L[i]; if (ms <= t1) { const [t0, v0] = L[i - 1], k = (ms - t0) / (t1 - t0); return v0 + (v1 - v0) * (e ? e(k) : k); } }
  return L[L.length - 1][1];
}
const rgba = (hex, a) => { const n = parseInt(hex.slice(1, 7), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${cl(a).toFixed(3)})`; };
const vgrad = stops => (c, top, h) => { const gr = c.createLinearGradient(0, top, 0, top + h); for (const [k, col] of stops) gr.addColorStop(k, col); return gr; };
const GOLD = vgrad([[0, '#fff7c2'], [0.45, '#ffd84a'], [1, '#f29a2a']]);
const GOLDT = vgrad([[0, '#fff6c8'], [0.42, '#ffd84a'], [1, '#f0a020']]);
const litCache = new Map();
const lit = col => { let f = litCache.get(col); if (!f) litCache.set(col, f = vgrad([[0, hexMix(col, '#ffffff', 0.5)], [0.55, col], [1, hexMix(col, '#000000', 0.15)]])); return f; };
const INK = '#0b1322', RED = '#e8203a', DEF_E = { main: '#7f97b8', light: '#cfe0f4', dark: '#3c5474' };
const kindOf = p => (p.size === 'crit' ? 'crit' : p.big || /^[+-]\d+$/.test(p.text) ? 'num' : 'word');
const colOf = p => p.col || { bad: '#ff6a6a', gold: '#ffd84a', dim: '#c8c8d0', sub: '#e8e0b0', main: '#ffffff' }[p.tone] || '#ffffff';
const lineOf = col => hexMix(col, '#0b0d1a', 0.84);
const dirOf = p => (p.who === 'me' ? -1 : 1);   // 숫자가 날아갈 쪽 = 화면 바깥(내 식물 왼쪽 · 상대 오른쪽)
const sizeOf = p => mix(0.85, 1.3, cl((p.share || 0.1) / 0.3));   // 그 한 방이 깎은 체력 몫(30% 이상이면 가장 크게)
// 낱말이 화면 밖 · 상대 체력판(왼쪽 위, x 146까지)에 걸치지 않게 가로 자리를 당김(half = 낱말 반폭)
const fit = (p, px, half) => Math.min(266 - half, Math.max(p.who === 'foe' ? 150 + half : 4 + half, px));
// 낱말 자리: 새 연출은 글자가 커서 위로 쌓으면 겹침 → '치명!'은 숫자 바깥쪽 옆 꼬리표(안쪽은 상대 체력판과 겹침), '효과 굉장!'은 숫자 위(치명과 같이면 큰 숫자만큼 더 위 — battle.js 가 그때 dy −52)
const placeOf0 = p => { const y0 = p.y - (p.dy || 0); return p.text === '치명!' ? [p.x + dirOf(p) * 48, y0 - 14] : p.text === '효과 굉장!' ? [p.x, y0 - ((p.dy || 0) <= -50 ? 40 : 30)] : [p.x, p.y]; };
// slot = 같은 식물 위에 아직 떠 있는 낱말과 겹치면 한 칸(17)씩 위로(2026-10-16 사용자 "치명타나 효과가 굉장했다 … 동시에 나와서 겹쳐져서 안 보인 적이 있어" — 여러 번 때리는 기술 · 연달아 온 사건)
const placeOf = p => { const [x, y] = placeOf0(p); return [x, y - (p.slot || 0) * 17]; };
export function wordSlot(pops, np, t) {
  if (kindOf(np) !== 'word') return 0;
  const box = p => { const [x, y] = placeOf(p), w = measure(p.text, 'value') / 2 + 4; return [x - w, y - 9, x + w, y + 9]; };
  for (let s = 0; s < 5; s++) {
    np.slot = s; const a = box(np);
    if (!pops.some(q => q !== np && q.who === np.who && kindOf(q) === 'word' && t - q.t0 < popLife(q) && (b => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3])(box(q)))) return s;
  }
  return 5;
}

// 가운데(x, y) 기준 글자 한 덩이 — o = {font, s|sx|sy, rot, skew, alpha, fill(색 · 함수), line, lw, under{dx,dy,col}, glow{col,blur(기기 화소)}}
function word(c, str, x, y, o) {
  const f = o.font || 'name', h = glyphH(f), top = -h / 2;
  const sx = o.sx != null ? o.sx : o.s != null ? o.s : 1, sy = o.sy != null ? o.sy : o.s != null ? o.s : 1;
  if (sx <= 0.001 || sy <= 0.001) return;
  c.save(); c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  if (o.skew) c.transform(1, 0, o.skew, 1, 0, 0);
  c.scale(sx, sy);
  if (o.alpha != null) c.globalAlpha *= cl(o.alpha);
  if (o.under) drawText(c, str, o.under.dx || 0, top + (o.under.dy || 0), { font: f, color: o.under.col, align: 'center', outline: o.under.col, outlineW: o.lw || 3 });
  if (o.glow) { c.shadowColor = o.glow.col; c.shadowBlur = o.glow.blur; }
  drawText(c, str, 0, top, { font: f, color: (typeof o.fill === 'function' ? o.fill(c, top, h) : o.fill) || '#ffffff', align: 'center', outline: o.line, outlineW: o.lw || 3 });
  c.restore();
}
// 글자마다 자리(가운데 기준)
function spell(str, f, k = 1) { const L = []; let x = 0; for (const ch of str) { const w = measure(ch, f) * k; L.push({ ch, cx: x + w / 2, w }); x += w; } for (const l of L) l.cx -= x / 2; return { L, w: x }; }
function ring(c, x, y, r, lw, col) { if (r <= 0 || lw <= 0.05) return; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.lineWidth = lw; c.strokeStyle = col; c.stroke(); }
function seg(c, x1, y1, x2, y2, lw, col) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineWidth = lw; c.lineCap = 'round'; c.strokeStyle = col; c.stroke(); }
function star(c, x, y, r1, r2, n, rot, fill, line, lw) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, r = i % 2 ? r2 : r1; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
  if (line) { c.lineJoin = 'round'; c.lineWidth = lw || 2; c.strokeStyle = line; c.stroke(); }
  c.fillStyle = fill; c.fill();
}
function twinkle(c, x, y, s, col) {   // 네 갈래 반짝
  if (s <= 0.3) return;
  const q = s * 0.26; c.fillStyle = col; c.beginPath();
  c.moveTo(x, y - s); c.lineTo(x + q, y - q); c.lineTo(x + s, y); c.lineTo(x + q, y + q); c.lineTo(x, y + s); c.lineTo(x - q, y + q); c.lineTo(x - s, y); c.lineTo(x - q, y - q); c.closePath(); c.fill();
}
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
// 지금 리본 모양(어두운 둥근 띠 + 속성 색 몸 + 위 밝은 줄)
function band(g, x, y, w, h, E) {
  rrect(g, x, y, w, h, 7, INK); rrect(g, x + 1, y + 1, w - 2, h - 2, 6, hexMix(E.dark, INK, 0.2));
  g.rect(x + 6, y + 1, w - 12, 1, E.light); g.rect(x + 6, y + h - 2, w - 12, 1, hexMix(E.dark, '#000000', 0.3));
}
const shake = (id, age, amp, ampY = amp * 0.6) => { const f = Math.floor(age / 33); return [(hash(id, f) - 0.5) * 2 * amp, (hash(id, f + 101) - 0.5) * 2 * ampY]; };

// ── ㉠ 통통 ──
const A = {
  life: p => ({ crit: 1250, num: 950, word: 1000 })[kindOf(p)] + (p.kill ? 350 : 0),
  pop(c, p, age, K) {
    const kd = kindOf(p), k = age / A.life(p), fade = k < 0.7 ? 1 : cl(1 - (k - 0.7) / 0.3);
    if (kd === 'word') return A.word(c, p, age, fade);
    const crit = kd === 'crit', s0 = crit ? 0.8 : sizeOf(p), col = colOf(p);
    const pop = kf(age, [[0, 0.3], [70, crit ? 2.1 : 1.85, oQ], [140, 0.92, ioQ], [210, 1, oQ]]);
    const pulse = p.kill ? 1 + 0.24 * Math.sin(Math.PI * cl((age - 260) / 220)) : 1;
    // 포물선: 위로 튀었다 내려오며(중력) 바깥쪽으로 — 움직임은 튐이 끝나 갈 때(60ms)부터
    const tau = Math.max(0, age - 60) / 1000, vx = dirOf(p) * (crit ? 10 : 15 + 12 * hash(p.id, 1)), vy = -(crit ? 58 : 80 + 18 * hash(p.id, 2));
    let x = p.x + vx * tau, y = p.y + 6 + vy * tau + 100 * tau * tau;
    if (crit && age < 300) { const [dx, dy] = shake(p.id, age, 3 * (1 - age / 300)); x += dx; y += dy; }
    c.save(); c.globalAlpha *= fade;
    if (crit) { const r = 17 * pop * pulse, rot = age * 0.0007; star(c, x, y, r * 1.35, r * 0.8, 10, rot, '#ff7a2a', '#3a1806', 2.5); star(c, x, y, r, r * 0.62, 10, rot + 0.31, '#ffb347'); }
    if (p.kill && age > 240 && age < 700) { const q = (age - 240) / 460; ring(c, x, y, mix(10, 36, oC(q)), mix(3, 0.5, q), rgba('#ffffff', (1 - q) * 0.85)); }
    word(c, p.text, x, y, { font: crit ? 'big' : 'name', s: s0 * pop * pulse, fill: crit ? GOLD : lit(col), line: crit ? '#3a1806' : lineOf(col), lw: crit ? 4 : 3.5, under: { dy: crit ? 2.5 : 2, col: 'rgba(0,0,0,0.42)' } });
    c.restore();
  },
  word(c, p, age, fade) {
    const col = colOf(p), dim = p.tone === 'dim', crit = p.text === '치명!', [px0, py] = placeOf(p), px = fit(p, px0, measure(p.text, p.tone === 'gold' ? 'name' : 'value') / 2 + 4);
    if (p.tone === 'gold' && !crit) {   // 금빛 낱말 = 글자마다 35ms 차례로 튀고, 다 서면 빛이 왼쪽 → 오른쪽으로 한 번
      const { L } = spell(p.text, 'name'), n = L.length, y0 = py - 6 * oQ(cl(age / 1000));
      c.save(); c.globalAlpha *= fade;
      L.forEach((l, i) => {
        const a = age - i * 35; if (a < 0 || l.ch === ' ') return;
        const s = kf(a, [[0, 0], [90, 1.45, oQ], [170, 1, oQ]]), dy = -7 * (1 - oQ(cl(a / 170)));
        const u = ((age - 380) / 300) * (n + 3) - 1.5, sh = cl(1 - Math.abs(u - i) / 1.2);
        word(c, l.ch, px + l.cx, y0 + dy, { font: 'name', s, fill: sh > 0 ? hexMix('#ffd84a', '#ffffff', 0.8 * sh) : GOLD, line: '#3a2006', lw: 3.5, under: { dy: 2, col: 'rgba(0,0,0,0.4)' } });
      });
      c.restore(); return;
    }
    const s = kf(age, [[0, 0.4], [80, dim ? 1.12 : crit ? 1.5 : 1.3, oQ], [160, 1, oQ]]);
    const y = py + (dim ? 5 : -10) * oQ(cl(age / 1000));
    word(c, p.text, px, y, { font: crit ? 'name' : 'value', s, rot: crit ? -0.14 : 0, alpha: fade, fill: crit ? GOLD : col, line: dim ? '#1a1d26' : crit ? '#3a2006' : lineOf(col), lw: 3, under: { dy: 1.5, col: 'rgba(0,0,0,0.4)' } });
  },
  ribbon(g, R, age, cx, cy) {
    const c = g.c, E = ELEMENT[R.el] || DEF_E, w = measure(R.text, 'bold') + 18, h = 17, out = age > R.ms - 160 ? cl((R.ms - age) / 160) : 1;
    const dy = -9 * (1 - oB(2.2)(cl(age / 220))), sx = kf(age, [[0, 0.55], [130, 1.07, oQ], [210, 1, oQ]]) * mix(0.92, 1, out);
    c.save(); c.globalAlpha *= cl(age / 80) * out; c.translate(cx, cy + h / 2 + dy); c.scale(sx, 1);
    const x = -Math.round(w / 2), y = -Math.round(h / 2);
    band(g, x, y, w, h, E);
    const u = (age - 160) / 380;   // 빛 한 번 훑기
    if (u > 0 && u < 1) {
      c.save(); c.beginPath(); c.rect(x + 1, y + 1, w - 2, h - 2); c.clip();
      const bx = x - 12 + (w + 24) * oC(u); c.fillStyle = 'rgba(255,255,255,0.38)';
      c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + 9, y); c.lineTo(bx + 3, y + h); c.lineTo(bx - 6, y + h); c.closePath(); c.fill(); c.restore();
    }
    drawText(c, R.text, 0, y + (h - glyphH('bold')) / 2, { font: 'bold', color: '#ffffff', align: 'center', outline: INK, outlineW: 2 });
    c.restore();
  },
  title(g, T0, age, cx, cy, K) {
    const c = g.c, win = T0.win, { L } = spell(win ? '승리!' : '패배', 'huge'), n = L.length, step = win ? 80 : 110;
    L.forEach((l, i) => {
      const a = age - i * step; if (a < 0) return;
      let dy, s = 1, rot = 0;
      if (win) { dy = -34 * (1 - oB(2)(cl(a / 240))); s = kf(a, [[0, 1.7], [240, 1, oC]]); if (a > 280) dy += Math.sin(((age / 1000) * Math.PI * 2) / 1.4 + i * 0.6) * 1.5; }
      else { const q = oC(cl((a - 300) / 700)); dy = -22 * (1 - oC(cl(a / 260))) + 3 * q; rot = (i % 2 ? 1 : -1) * 0.09 * q; }
      const ph = age > 700 ? (((age - 700) % 2200) / 2200) * (n + 4) - 2 : -9, sh = win ? cl(1 - Math.abs(ph - i) / 1.3) : 0;
      word(c, l.ch, cx + l.cx, cy + dy, { font: 'huge', s, rot, alpha: cl(a / 90), fill: win ? (sh > 0 ? hexMix('#ffd84a', '#ffffff', 0.75 * sh) : GOLDT) : '#b4c8e2', line: win ? '#3a2006' : '#0e1626', lw: 5, glow: { col: win ? 'rgba(255,196,70,0.75)' : 'rgba(110,150,210,0.55)', blur: 16 * K } });
    });
    const landed = (n - 1) * step + 260;
    if (win && age > landed) for (let i = 0; i < 6; i++) {   // 둘레 반짝임
      const q = ((age - landed + i * 330) % 1300) / 1300, sx = cx + (hash(i, 3) - 0.5) * 150, sy = cy + (hash(i, 4) - 0.5) * 56;
      twinkle(c, sx, sy, Math.sin(q * Math.PI) * 5, rgba('#fff3b0', Math.sin(q * Math.PI)));
    }
    const sa = age - landed;
    if (T0.sub && sa > 0) word(c, T0.sub, cx, cy + 37 + 6 * (1 - oC(cl(sa / 260))), { font: 'bold', alpha: cl(sa / 200), fill: '#eef4ff', line: INK, lw: 3 });
  },
};

// ── ㉡ 쾅 ──
const B = {
  life: p => ({ crit: 1300, num: 1000, word: 1000 })[kindOf(p)] + (p.kill ? 350 : 0),
  pop(c, p, age, K) {
    const kd = kindOf(p); if (kd === 'word') return B.word(c, p, age);
    const crit = kd === 'crit', life = B.life(p), T = crit ? 110 : 90, col = colOf(p), s0 = crit ? 0.85 : sizeOf(p);
    const k2 = cl((age - 560) / (life - 560));
    let x = p.x, y = p.y + 2 - 8 * oQ(k2), s = 1, sx = 1, sy = 1;
    if (age < T) s = mix(crit ? 3.4 : 2.6, 1, iQ(age / T));   // 빨라지며 날아와 찍힘
    else {
      const a = age - T;   // 찍힌 순간: 납작 → 살짝 길쭉 → 제 모양, 흔들림
      sx = kf(a, [[0, 1.2], [70, 0.96, oQ], [130, 1, oQ]]); sy = kf(a, [[0, 0.8], [70, 1.04, oQ], [130, 1, oQ]]);
      if (a > 40 && a < 290) { const [dx, dy] = shake(p.id, age, (crit ? 3.5 : 2.5) * (1 - (a - 40) / 250)); x += dx; y += dy; }
    }
    if (p.kill && age > T + 200) s *= 1 + 0.2 * Math.sin(Math.PI * cl((age - T - 200) / 200));
    c.save(); c.globalAlpha *= 1 - k2;
    if (crit && age < T) {   // 찍히기 전: 숫자 쪽으로 모여드는 빛살
      const q = age / T;
      for (let i = 0; i < 14; i++) { const an = (i / 14) * Math.PI * 2 + hash(p.id, i) * 0.3, r1 = mix(58, 14, oQ(q)), r2 = r1 + mix(22, 8, q); seg(c, x + Math.cos(an) * r1, y + Math.sin(an) * r1 * 0.8, x + Math.cos(an) * r2, y + Math.sin(an) * r2 * 0.8, 1.6, rgba('#fff0be', 0.35 + 0.55 * q)); }
    }
    if (age >= T) {
      const a = age - T, ox = p.x, oy = p.y + 2;
      if (a < 280) { const q = a / 280; ring(c, ox, oy, mix(6, crit ? 36 : 24, oC(q)), mix(crit ? 4 : 3, 0.6, q), rgba(crit ? '#ffe9a0' : hexMix(col, '#ffffff', 0.55), 1 - q)); }
      if (crit && a < 160) { const q = a / 160; c.fillStyle = rgba('#ffffff', 0.55 * (1 - q)); c.beginPath(); c.arc(ox, oy, mix(10, 30, oC(q)), 0, Math.PI * 2); c.fill(); }
      if (a < 460) {   // 파편
        const n = crit ? 10 : 6, tau = a / 1000;
        for (let i = 0; i < n; i++) {
          const an = (i / n) * Math.PI * 2 + hash(p.id, i + 7) * 0.6, v = 70 + 55 * hash(p.id, i + 19), px = ox + Math.cos(an) * v * tau, py = oy + Math.sin(an) * v * tau * 0.7 + 160 * tau * tau, z = crit ? 2.5 : 2;
          c.fillStyle = rgba(crit ? '#ffd84a' : hexMix(col, '#ffffff', 0.3), 1 - a / 460); c.fillRect(px - z / 2, py - z / 2, z, z);
        }
      }
    }
    const flash = age >= T && age < T + 60;
    word(c, p.text, x, y, { font: crit ? 'big' : 'name', sx: s * s0 * sx, sy: s * s0 * sy, alpha: cl(age / 40), fill: flash ? '#ffffff' : crit ? GOLD : lit(col), line: crit ? '#3a1806' : '#200808', lw: crit ? 4.5 : 4, under: { dy: 2, col: 'rgba(0,0,0,0.5)' } });
    c.restore();
  },
  word(c, p, age) {   // 도장 쾅: 크게 기울어 내려와 찍히고(납작 → 펴짐) 사라질 때 살짝 커지며
    const col = colOf(p), dim = p.tone === 'dim', gold = p.tone === 'gold', T = 80, life = B.life(p), end = cl((age - (life - 220)) / 220);
    const sign = hash(p.id, 3) > 0.5 ? 1 : -1, rot = sign * (age < T ? mix(0.22, 0.07, iQ(age / T)) : 0.07) * (dim ? 0.5 : 1);
    let s = (age < T ? mix(1.9, 1, iQ(age / T)) : 1) * (1 + 0.06 * end), sx = 1, sy = 1;
    if (age >= T) { const a = age - T; sx = kf(a, [[0, 1.12], [60, 0.98], [110, 1]]); sy = kf(a, [[0, 0.88], [60, 1.02], [110, 1]]); }
    const [jx, jy] = age >= T && age < T + 120 ? shake(p.id, age, 1.2) : [0, 0], font = gold || p.text === '치명!' ? 'name' : 'value', flash = age >= T && age < T + 50;
    const w = measure(p.text, font) + 12, h = glyphH(font) + 9, [px0, py0] = placeOf(p), px = fit(p, px0, w * 0.56), py = py0 - (gold && p.text !== '치명!' ? 5 : 0);
    c.save(); c.globalAlpha *= (1 - end) * cl(age / 40); c.translate(px + jx, py + jy); c.rotate(rot); c.scale(s * sx, s * sy);
    if (gold) {   // 터진 판(가로로 긴 별 — 숫자를 가리지 않게 낱말 크기만큼만)
      const ky = (h / w) * 1.55; c.save(); c.scale(1, ky); star(c, 0, 0, w * 0.56, w * 0.45, 9, hash(p.id, 5), flash ? '#ffffff' : p.text === '치명!' ? '#ffb020' : '#e8503a', '#2a0a06', 2.4 / ky); c.restore();
    } else if (!dim) {   // 도장 테두리 두 겹
      c.fillStyle = 'rgba(11,19,34,0.6)'; c.fillRect(-w / 2, -h / 2, w, h);
      c.lineWidth = 2; c.strokeStyle = flash ? '#ffffff' : col; c.strokeRect(-w / 2, -h / 2, w, h);
      c.lineWidth = 1; c.strokeStyle = rgba(flash ? '#ffffff' : col, 0.6); c.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    }
    word(c, p.text, 0, 0, { font, fill: flash ? '#ffffff' : gold ? '#ffffff' : col, line: gold ? '#2a0a06' : dim ? '#1a1d26' : lineOf(col), lw: 3 });
    c.restore();
  },
  ribbon(g, R, age, cx, cy, side) {   // 옆에서 휙 → 살짝 되튐 → 나갈 때 반대로 휙(잔상 줄)
    const c = g.c, E = ELEMENT[R.el] || DEF_E, w = measure(R.text, 'bold') + 18, h = 17, out = R.ms - age;
    let dx = age < 110 ? side * 70 * (1 - oC(age / 110)) : age < 240 ? -side * 3 * Math.sin((Math.PI * (age - 110)) / 130) : 0;
    if (out < 130) dx = -side * 80 * iQ(1 - out / 130);
    const streak = age < 200 ? 1 - age / 200 : out < 130 ? 1 - out / 130 : 0;
    c.save(); c.globalAlpha *= cl(age / 50) * (out < 130 ? cl((out / 130) * 1.5) : 1); c.translate(cx + dx, cy + h / 2);
    const x = -Math.round(w / 2), y = -Math.round(h / 2);
    if (streak > 0) for (let i = 0; i < 3; i++) { const len = (18 + 16 * hash(i, 7)) * streak; c.fillStyle = rgba('#e6f3ff', 0.75 * streak); c.fillRect(side > 0 ? x + w + 2 : x - 2 - len, y + 3 + i * 5, len, 1.5); }
    band(g, x, y, w, h, E);
    g.rect(side > 0 ? x + 2 : x + w - 4, y + 4, 2, h - 8, E.light);
    drawText(c, R.text, 0, y + (h - glyphH('bold')) / 2, { font: 'bold', color: '#ffffff', align: 'center', outline: INK, outlineW: 2 });
    c.restore();
  },
  title(g, T0, age, cx, cy, K) {
    const c = g.c, win = T0.win, T = win ? 160 : 260;
    let s = win && age < T ? mix(3.6, 1, iQ(age / T)) : 1, dy = !win && age < T ? -90 * (1 - iQ(age / T)) : 0, sx = 1, sy = 1, amp = 0;
    if (age >= T) { const a = age - T; sx = kf(a, [[0, win ? 1.14 : 1.1], [90, 0.97], [160, 1]]); sy = kf(a, [[0, win ? 0.86 : 0.88], [90, 1.03], [160, 1]]); if (a < 320) amp = (1 - a / 320) * (win ? 5 : 3); }
    const [jx, jy] = shake(7, age, amp);
    if (age >= T) {
      const a = age - T;
      if (win && a < 170) { c.fillStyle = rgba('#fffae6', 0.5 * (1 - a / 170)); c.fillRect(-80, -80, 440, 560); }
      if (a < 420) ring(c, cx, cy, mix(24, win ? 150 : 90, oC(a / 420)), mix(win ? 6 : 4, 1, a / 420), rgba(win ? '#ffd84a' : '#8aa0c0', 1 - a / 420));
      if (win && a < 650) for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2 + hash(i, 2) * 0.3, d = mix(26, 110 + 20 * hash(i, 8), oC(a / 650)); c.save(); c.translate(cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.6); c.rotate(an); c.globalAlpha *= 1 - a / 650; star(c, 0, 0, 4, 1.4, 2, 0, '#ffe27a'); c.restore(); }
      if (!win && a < 500) for (const sd of [-1, 1]) { const q = a / 500; c.fillStyle = rgba('#9aa8c0', 0.5 * (1 - q)); c.beginPath(); c.arc(cx + sd * mix(30, 70, oC(q)), cy + 22, mix(4, 12, q), 0, Math.PI * 2); c.fill(); }
    }
    word(c, win ? '승리!' : '패배', cx + jx, cy + dy + jy, { font: 'huge', sx: s * sx, sy: s * sy, alpha: cl(age / 60), fill: win ? GOLDT : '#b4c8e2', line: win ? '#3a2006' : '#0e1626', lw: 5, glow: { col: win ? 'rgba(255,196,70,0.75)' : 'rgba(110,150,210,0.55)', blur: 16 * K } });
    const sa = age - T - 300;
    if (T0.sub && sa > 0) word(c, T0.sub, cx, cy + 37 + 12 * (1 - oB(1.8)(cl(sa / 240))), { font: 'bold', alpha: cl(sa / 160), fill: '#eef4ff', line: INK, lw: 3 });
  },
};

// ── ㉢ 컷인 ──
const C = {
  life: p => ({ crit: 1150, num: 900, word: 1050 })[kindOf(p)] + (p.kill ? 300 : 0),
  pop(c, p, age, K) {
    const kd = kindOf(p); if (kd === 'word') return C.word(c, p, age);
    const crit = kd === 'crit', life = C.life(p), font = crit ? 'big' : 'name', s0 = crit ? 0.85 : sizeOf(p);
    const sh = crit ? '#000000' : p.col || (p.tone === 'bad' ? RED : colOf(p));   // 어긋난 그림자 색 = 뜻(피해 빨강 · 회복 초록 · 효과 그 색)
    const w = measure(p.text, font) * s0 + 14, h = glyphH(font) * s0 + 8;
    const inK = oC(cl(age / 90)), outK = cl((age - (life - 110)) / 110), pulse = p.kill ? 1 + 0.18 * Math.sin(Math.PI * cl((age - 200) / 220)) : 1;
    c.save(); c.translate(p.x - dirOf(p) * 10 * (1 - oC(cl(age / 130))), p.y - 4 * oQ(cl(age / life))); c.rotate(-0.1);
    const Lx = -w / 2 - 14, Rx = w / 2 + 14;   // 들어올 땐 왼쪽부터 드러나고, 나갈 땐 왼쪽부터 잘려 나감
    c.beginPath(); c.rect(Lx + (Rx - Lx) * outK, -h * 1.5, (Rx - Lx) * (inK - outK), h * 3); c.clip();
    c.scale(pulse, pulse);
    if (crit) {   // 빨간 조각(날 선 평행사변형)
      const hw = w / 2 + 6, hh = h / 2 + 2;
      c.beginPath(); c.moveTo(-hw - 6, -hh + 2); c.lineTo(-hw * 0.2, -hh - 3); c.lineTo(hw + 10, -hh - 4); c.lineTo(hw + 2, hh + 3); c.lineTo(hw * 0.3, hh + 6); c.lineTo(-hw - 10, hh + 1); c.closePath();
      c.lineJoin = 'miter'; c.lineWidth = 2.5; c.strokeStyle = '#000000'; c.stroke(); c.fillStyle = RED; c.fill();
      // 조각 왼쪽 위 모서리에 검은 '치명' 꼬리표(따로 뜨는 '치명!' 낱말 대신 — 조각에 가려지지 않게)
      const tw = measure('치명', 'body') + 8; c.save(); c.translate(-hw - 2, -hh - 6); c.rotate(-0.06);
      c.fillStyle = '#000000'; c.fillRect(-2, -8, tw + 4, 16); c.fillStyle = '#ffffff'; c.fillRect(0, -6, tw, 12);
      c.fillStyle = '#000000'; c.fillRect(1, -5, tw - 2, 10);
      drawText(c, '치명', tw / 2, -glyphH('body') / 2, { font: 'body', color: '#ffffff', align: 'center' });
      c.restore();
    }
    word(c, p.text, 0, 0, { font, s: s0, skew: -0.22, fill: '#ffffff', line: '#000000', lw: 4, under: { dx: 3, dy: 3, col: sh } });
    c.restore();
  },
  word(c, p, age) {   // 글자마다 다른 상자 · 기울기 · 크기(예고장 활자)
    if (p.text === '치명!') return;   // 치명은 숫자 조각의 꼬리표로
    const life = C.life(p), dim = p.tone === 'dim', gold = p.tone === 'gold', col = colOf(p);
    const pal = dim ? [['#2a2e38', '#c8c8d0'], ['#c8c8d0', '#1a1d26']] : gold ? [[RED, '#ffffff'], ['#000000', '#ffffff'], ['#ffffff', '#000000']] : [['#000000', '#ffffff'], ['#ffffff', '#000000'], [col, '#000000']];
    const chars = [...p.text], items = chars.map((ch, i) => { const big = gold || hash(p.id, i) > 0.45, f = big ? 'name' : 'value', k = big ? 0.92 : 1; return { ch, f, k, w: ch === ' ' ? 4 : measure(ch, f) * k + 6, h: glyphH(f) * k + 5 }; });
    const total = items.reduce((a, it) => a + it.w + 1, -1), [px0, py] = placeOf(p), px = fit(p, px0, total / 2 + 3);
    let x = px - total / 2;
    items.forEach((it, i) => {
      const cx = x + it.w / 2; x += it.w + 1;
      if (it.ch === ' ') return;
      const a = age - i * 30; if (a < 0) return;
      const end = cl((age - (life - 160) - i * 15) / 120), s = kf(a, [[0, 1.6], [70, 1, oQ]]), rot = (i % 2 ? 1 : -1) * (0.07 + 0.05 * hash(p.id, i + 40)), dy = (hash(p.id, i + 60) - 0.5) * 3 + 6 * end;
      const [bg, fg] = pal[Math.floor(hash(p.id, i + 80) * pal.length)];
      c.save(); c.globalAlpha *= cl(a / 50) * (1 - end); c.translate(cx, py + dy); c.rotate(rot); c.scale(s, s);
      c.fillStyle = '#000000'; c.fillRect(-it.w / 2 - 1, -it.h / 2 - 1, it.w + 2, it.h + 2);
      c.fillStyle = bg; c.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
      word(c, it.ch, 0, 0, { font: it.f, s: it.k, fill: fg });
      c.restore();
    });
  },
  ribbon(g, R, age, cx, cy, side) {   // 기운 띠가 화면 끝에서 미끄러져 들어오고, 흰 빗금이 한 번 긋고 지나감
    const c = g.c, E = ELEMENT[R.el] || DEF_E, w = measure(R.text, 'bold') + 26, h = 18, out = R.ms - age, sk = 0.45;
    let dx = side * 90 * (1 - oC(cl(age / 120))); if (out < 110) dx = -side * 90 * iQ(1 - out / 110);
    const para = (ox, oy, ww, hh) => { c.beginPath(); c.moveTo(-ww / 2 + ox + (hh * sk) / 2, -hh / 2 + oy); c.lineTo(ww / 2 + ox + (hh * sk) / 2, -hh / 2 + oy); c.lineTo(ww / 2 + ox - (hh * sk) / 2, hh / 2 + oy); c.lineTo(-ww / 2 + ox - (hh * sk) / 2, hh / 2 + oy); c.closePath(); };
    c.save(); c.globalAlpha *= out < 110 ? cl((out / 110) * 1.4) : 1; c.translate(cx + dx, cy + h / 2);
    para(4, 3, w, h); c.fillStyle = '#000000'; c.fill();
    para(0, 0, w, h); const gr = c.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, E.light); gr.addColorStop(0.18, E.main); gr.addColorStop(1, E.dark); c.fillStyle = gr; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = '#000000'; c.stroke();
    const u = (age - 40) / 180;
    if (u > 0 && u < 1) { c.save(); para(0, 0, w, h); c.clip(); const bx = -w / 2 - 10 + (w + 20) * oC(u); seg(c, bx + 6, -h / 2 - 2, bx - 6, h / 2 + 2, 2.5, 'rgba(255,255,255,0.85)'); c.restore(); }
    word(c, R.text, 0, 0, { font: 'bold', skew: -0.2, fill: '#ffffff', line: '#000000', lw: 3 });
    c.restore();
  },
  title(g, T0, age, cx, cy) {
    const c = g.c, win = T0.win, bk = oC(cl(age / 200)), bh = 66;
    c.save(); c.translate(cx, cy); c.rotate(-0.08);   // 검은 띠가 왼쪽 → 오른쪽으로 가로지름, 위아래 빨강(진 판 = 회청) 줄
    const left = -220, x1 = left + 440 * bk;
    c.fillStyle = win ? '#0a0a0e' : '#141a26'; c.fillRect(left, -bh / 2, x1 - left, bh);
    c.fillStyle = win ? RED : '#4a5a78'; c.fillRect(left, -bh / 2 - 5, x1 - left, 3); c.fillRect(left, bh / 2 + 2, x1 - left, 3);
    c.restore();
    const chars = [...(win ? '승리!' : '패배')], pal = win ? [[RED, '#ffffff'], ['#ffffff', '#000000'], ['#000000', '#ffd84a']] : [['#2a3446', '#b4c8e2'], ['#b4c8e2', '#141a26']];
    const items = chars.map(ch => ({ ch, w: measure(ch, 'huge') * 0.8 + 12, h: glyphH('huge') * 0.8 + 10 })), total = items.reduce((a, it) => a + it.w + 3, -3);
    let x = cx - total / 2;
    items.forEach((it, i) => {
      const bx = x + it.w / 2; x += it.w + 3;
      const a = age - 180 - i * 70; if (a < 0) return;
      const s = kf(a, [[0, 1.8], [90, 1, oQ]]), sag = win ? 0 : oC(cl((a - 300) / 700)), rot = (i % 2 ? 1 : -1) * (0.12 + 0.1 * sag) + (win ? 0 : 0.05 * sag), [bg, fg] = pal[i % pal.length];
      c.save(); c.globalAlpha *= cl(a / 60); c.translate(bx, cy + (i % 2 ? 3 : -3) + 6 * sag); c.rotate(rot); c.scale(s, s);
      c.fillStyle = '#000000'; c.fillRect(-it.w / 2 - 2, -it.h / 2 - 2, it.w + 4, it.h + 4);
      c.fillStyle = bg; c.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
      word(c, it.ch, 0, 0, { font: 'huge', s: 0.8, fill: fg });
      c.restore();
    });
    const sa = age - 180 - items.length * 70 - 120;
    if (T0.sub && sa > 0) {
      const w = measure(T0.sub, 'bold') + 20, wk = oC(cl(sa / 160));
      c.save(); c.translate(cx, cy + 44); c.rotate(-0.05);
      c.beginPath(); c.rect(-w / 2 - 6, -12, (w + 12) * wk, 24); c.clip();
      c.fillStyle = '#000000'; c.beginPath(); c.moveTo(-w / 2, -10); c.lineTo(w / 2 + 6, -10); c.lineTo(w / 2, 10); c.lineTo(-w / 2 - 6, 10); c.closePath(); c.fill();
      word(c, T0.sub, 0, 0, { font: 'bold', skew: -0.15, fill: '#ffffff' });
      c.restore();
    }
  },
};

// ── ㉣ 굴림 ──
const POOL = '풀꽃잎씨빛별싹물불돌숲달';
const CHIPS = ['#009dff', '#fe5f55', '#f0c040'];   // Balatro 점수 색(칩 파랑 · 배수 빨강 · 돈 금빛)
const D = {
  life: p => ({ crit: 1450, num: 1150, word: 1100 })[kindOf(p)] + (p.kill ? 300 : 0),
  pop(c, p, age, K) {
    const kd = kindOf(p); if (kd === 'word') return D.word(c, p, age, K);
    const crit = kd === 'crit', life = D.life(p), col = crit ? '#f0c040' : p.col || (p.tone === 'bad' ? '#fe5f55' : colOf(p));
    const font = crit ? 'big' : 'name', s0 = crit ? 0.8 : sizeOf(p), chars = [...p.text], digits = chars.map((ch, i) => (/\d/.test(ch) ? i : -1)).filter(i => i >= 0);
    const ROLL = 380, STAG = 50, land = (digits.length - 1) * STAG + ROLL, sa = age - land;
    const pulse = kf(sa, [[0, 1], [60, crit ? 1.38 : 1.26, oQ], [170, 1, oQ]]) * (p.kill ? 1 + 0.16 * Math.sin(Math.PI * cl((sa - 200) / 220)) : 1);
    // 흔들림 세기 = 깎은 몫(작음 · 중간 · 큼 — 큼은 기울기까지)
    const share = p.share || 0.08, [amp, dur, ra] = crit || share > 0.25 ? [4, 500, 0.035] : share > 0.1 ? [2.5, 300, 0] : [1.2, 200, 0];
    let jx = 0, jy = 0, jr = 0;
    if (sa > 0 && sa < dur) { const d = 1 - sa / dur; [jx, jy] = shake(p.id, age, amp * d); jr = (hash(p.id, Math.floor(age / 33) + 63) - 0.5) * 2 * ra * d; }
    const k = age / life, fade = k < 0.75 ? 1 : cl(1 - (k - 0.75) / 0.25), rise = -8 * oQ(cl((sa - 150) / 600));
    const ws = chars.map(ch => measure(ch, font)), W = ws.reduce((a, b) => a + b, 0), gh = glyphH(font), stepY = gh * 1.15, fill = sa > 0 && sa < 90 ? '#ffffff' : col;
    if (crit && sa > 0 && sa < 600) for (let i = 0; i < 10; i++) {   // 멈춘 순간 칩 터짐
      const an = (i / 10) * Math.PI * 2 + hash(p.id, i + 3) * 0.5, d = mix(8, 40 + 14 * hash(p.id, i + 9), oC(sa / 600)), q = sa / 600;
      c.save(); c.globalAlpha *= 1 - q; c.fillStyle = CHIPS[i % 3]; c.beginPath(); c.arc(p.x + Math.cos(an) * d, p.y + rise + Math.sin(an) * d * 0.75 + 30 * q * q, 2.6, 0, Math.PI * 2); c.fill(); c.restore();
    }
    c.save(); c.globalAlpha *= fade * cl(age / 60); c.translate(p.x + jx, p.y + rise + jy); c.rotate(jr); c.scale(s0 * pulse, s0 * pulse);
    c.shadowColor = rgba(col, 0.6); c.shadowBlur = 8 * K;
    let x = -W / 2;
    chars.forEach((ch, i) => {
      const cx = x + ws[i] / 2; x += ws[i];
      const j = digits.indexOf(i), o = { font, color: fill, align: 'center', outline: '#14080a', outlineW: 3.5 };
      if (j < 0) { drawText(c, ch, cx, -gh / 2, o); return; }
      const turns = 13 + j * 2, v = +ch - turns * (1 - roll(cl((age - j * STAG) / ROLL))), base = Math.floor(v);   // 릴: 위로 굴러 올라가다 넘쳤다 멈춤
      c.save(); c.beginPath(); c.rect(cx - ws[i], -gh / 2 - 1, ws[i] * 2, gh + 2); c.clip();   // 창 = 숫자 한 칸, 들고 나는 숫자는 창 끝에서 흐려짐
      for (let d = base - 1; d <= base + 1; d++) { const a = cl(1 - Math.abs(d - v) * 1.25); if (a <= 0) continue; c.save(); c.globalAlpha *= a; drawText(c, String(((d % 10) + 10) % 10), cx, -gh / 2 + (d - v) * stepY, o); c.restore(); }
      c.restore();
    });
    c.restore();
  },
  word(c, p, age, K) {   // 타자기: 한 글자씩 커지며 나타나고(40ms 차례) 살랑, 사라질 땐 앞 글자부터
    const life = D.life(p), col = colOf(p), dim = p.tone === 'dim', f = p.tone === 'gold' ? 'name' : 'value', { L, w } = spell(p.text, f), [px0, py] = placeOf(p), px = fit(p, px0, w / 2 + 4), y0 = py - 6 * oQ(cl(age / life));
    c.save(); c.shadowColor = rgba(col, 0.55); c.shadowBlur = 6 * K;
    L.forEach((l, i) => {
      const a = age - i * 40; if (a < 0 || l.ch === ' ') return;
      const s = kf(a, [[0, 0], [90, 1.25, oQ], [160, 1, oQ]]), wave = dim ? 0 : Math.sin(((age / 1000) * Math.PI * 2) / 0.9 + i * 0.7) * cl((a - 160) / 200), end = cl((age - (life - 260) - i * 25) / 120);
      word(c, l.ch, px + l.cx, y0 + wave + end * 4, { font: f, s, alpha: 1 - end, fill: col, line: lineOf(col), lw: 3 });
    });
    c.restore();
  },
  ribbon(g, R, age, cx, cy, side, K) {   // 가운데서 펼쳐지는 띠(주사선 · 속성 빛) + 글자가 한 자씩
    //  R.face = 기술 · 상태 구분 시안 ㉠(battle.js ?skillfx=card): 띠 왼쪽 끝에 그 기술 카드(손패와 같은 앞면) · 띠 = 속성 색으로 밝게 · 글자 한 칸 크게 — 어두운 효과 조각과 모양 · 색 · 크기가 다르게
    const c = g.c, E = ELEMENT[R.el] || DEF_E, F = R.face, font = F ? 'value' : 'bold', CW = F ? 22 : 0, w = measure(R.text, font) + 18 + (F ? CW - 6 : 0), h = F ? 20 : 17, out = R.ms - age;
    const open = out < 140 ? oC(cl(out / 140)) : oC(cl(age / 140)); if (open <= 0.01) return;
    //  카드 = 바깥쪽 끝(내 식물 = 왼쪽 · 상대 = 오른쪽 — 상대 띠 왼쪽은 상대 체력판에 가려짐) · 띠 + 카드가 체력판(R.minX)과 경기장 밖으로 안 나가게
    if (F) cx = Math.max((R.minX ?? 6) + w / 2 + (side < 0 ? CW / 2 - 4 : 0), Math.min(264 - w / 2 - (side > 0 ? CW / 2 - 4 : 0), cx));
    const ww = Math.max(2, w * open), x = -ww / 2, y = -h / 2;
    c.save(); c.translate(cx, cy + h / 2);
    c.shadowColor = E.main; c.shadowBlur = 8 * K; rr(c, x, y, ww, h, 6); c.fillStyle = INK; c.fill(); c.shadowBlur = 0;
    rr(c, x + 1, y + 1, ww - 2, h - 2, 5); c.fillStyle = F ? hexMix(E.main, INK, 0.38) : hexMix(E.dark, INK, 0.2); c.fill();
    c.save(); c.clip(); c.fillStyle = F ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)'; for (let yy = y + 1; yy < y + h - 1; yy += 2) c.fillRect(x, yy, ww, 1); c.restore();
    c.fillStyle = E.light; c.fillRect(x + 6, y + 1, Math.max(0, ww - 12), 1);
    const { L } = spell(R.text, font), tx = F ? (side > 0 ? -1 : 1) * (CW - 6) / 2 : 0;
    c.save(); c.beginPath(); c.rect(x, y, ww, h); c.clip();
    L.forEach((l, i) => { const a = age - 120 - i * 28; if (a < 0) return; drawText(c, l.ch, l.cx + tx, y + (h - glyphH(font)) / 2 + 4 * (1 - oQ(cl(a / 120))), { font, color: rgba('#ffffff', cl(a / 80)), align: 'center', outline: rgba(INK, cl(a / 80)), outlineW: F ? 2.5 : 2 }); });
    c.restore();
    if (F) {   // 카드: 띠 왼쪽 끝에 조금 기울여 · 띠보다 위아래로 삐져나옴 · 띠가 펼쳐질 때 톡(1.18배까지) · 띠와 함께 접힘
      const ch = Math.round(CW * F.height / F.width), s = kf(age, [[0, 0], [90, 1.18, oQ], [170, 1, oQ]]) * (out < 140 ? oC(cl(out / 140)) : 1);
      if (s > 0.01) {
        c.save(); c.translate(side > 0 ? x + ww - 4 : x + 4, 0); c.rotate(side > 0 ? 0.12 : -0.12); c.scale(s, s);
        rr(c, -CW / 2 - 1, -ch / 2 - 1, CW + 2, ch + 2, 3); c.fillStyle = INK; c.fill();
        c.imageSmoothingEnabled = true; c.drawImage(F, -CW / 2, -ch / 2, CW, ch);
        c.restore();
      }
    }
    c.restore();
  },
  title(g, T0, age, cx, cy, K) {   // 글자마다 릴이 돌다 멈춤(뒤 글자일수록 오래) → 다 멈추면 칩 터짐 · 살랑
    const c = g.c, win = T0.win, { L } = spell(win ? '승리!' : '패배', 'huge'), gh = glyphH('huge'), stepY = gh * 1.1, col = win ? '#ffd84a' : '#b4c8e2';
    const durOf = i => 520 + i * 160, hang = L.filter(l => /[가-힣]/.test(l.ch)).length, allLand = durOf(hang - 1);
    L.forEach((l, i) => {
      const o = { font: 'huge', align: 'center', outline: win ? '#3a2006' : '#0e1626', outlineW: 5 };
      const glow = { col: win ? 'rgba(255,196,70,0.75)' : 'rgba(110,150,210,0.55)', blur: 16 * K };
      if (!/[가-힣]/.test(l.ch)) {   // 느낌표 같은 건 릴 없이 다 멈춘 뒤 톡
        const a = age - allLand; if (a < 0) return;
        word(c, l.ch, cx + l.cx, cy, { font: 'huge', s: kf(a, [[0, 0], [90, 1.5, oQ], [180, 1, oQ]]), fill: win ? GOLDT : col, line: o.outline, lw: 5, glow });
        return;
      }
      const dur = durOf(i), turns = 7 + i * 2, v = turns * roll(cl(age / dur)), base = Math.floor(v), sa = age - dur;
      const sym = k => (k === turns ? l.ch : POOL[Math.floor(hash(i * 31 + k, 17) * POOL.length)]);
      const s = sa > 0 ? kf(sa, [[0, 1], [60, 1.2, oQ], [160, 1, oQ]]) : 1, wave = win && age > allLand + 200 ? Math.sin(((age / 1000) * Math.PI * 2) / 1.4 + i * 0.6) * 1.5 : 0, sink = !win ? 4 * oC(cl((age - allLand - 200) / 600)) : 0;
      c.save(); c.translate(cx + l.cx, cy + wave + sink); c.scale(s, s);
      c.beginPath(); c.rect(-l.w * 0.75, -gh / 2 - 6, l.w * 1.5, gh + 12); c.clip();
      c.shadowColor = glow.col; c.shadowBlur = glow.blur;
      const dull = !win ? cl((age - allLand - 200) / 600) : 0;
      for (let k = base - 1; k <= base + 1; k++) {   // 들고 나는 글자는 창 끝에서 흐려짐
        const a = cl(1 - Math.abs(k - v) * 1.25); if (k < 0 || a <= 0) continue;
        c.save(); c.globalAlpha *= a; drawText(c, sym(k), 0, -gh / 2 + (k - v) * stepY, { ...o, color: win ? (k === turns && sa > 0 && sa < 80 ? '#ffffff' : '#ffd84a') : hexMix(col, '#6a7488', dull) }); c.restore();
      }
      c.restore();
    });
    if (win && age > allLand) {
      const a = age - allLand;
      if (a < 900) for (let i = 0; i < 18; i++) {   // 칩 터짐(위로 튀었다 떨어짐)
        const an = -Math.PI / 2 + (hash(i, 11) - 0.5) * 2.6, v0 = 120 + 80 * hash(i, 12), tau = a / 1000, px = cx + Math.cos(an) * v0 * tau, py = cy + Math.sin(an) * v0 * tau + 260 * tau * tau;
        c.save(); c.globalAlpha *= 1 - a / 900; c.translate(px, py); c.rotate(a * 0.01 + i); c.fillStyle = CHIPS[i % 3]; c.fillRect(-2.5, -1.6, 5, 3.2); c.restore();
      }
    }
    const sa = age - allLand - 220;
    if (T0.sub && sa > 0) { const { L: S } = spell(T0.sub, 'bold'); S.forEach((l, i) => { const a = sa - i * 22; if (a < 0) return; word(c, l.ch, cx + l.cx, cy + 37 + 3 * (1 - oQ(cl(a / 100))), { font: 'bold', alpha: cl(a / 70), fill: '#eef4ff', line: INK, lw: 3 }); }); }
  },
};

const STY = { a: A, b: B, c: C, d: D };
export const popLife = p => (STY[TFX.key] ? STY[TFX.key].life(p) : 1100);
// 그리기(경기장 좌표 — battle.js 가 경기장 옮김을 건 채로 부름). side = 리본 쪽(-1 = 내 식물 왼쪽, 1 = 상대 오른쪽)
export function drawPop(g, p, t) { const S = STY[TFX.key], age = t - p.t0; if (S && age >= 0) S.pop(g.c, p, age, g.c.getTransform().a || 1); }
// 떠오르는 글자 전부: 낱말 먼저, 숫자는 맨 위(낱말 판이 숫자를 가리지 않게).
//  같은 식물 위에 기술 이름 리본이 새로 뜨면 그 전 낱말('먼저!' 등)은 0.12초 만에 비켜 줌(새 연출은 글자 판이 커서 리본과 겹침)
export function drawPops(g, pops, t, R) {
  const c = g.c, one = p => { const yield_ = R && R.who === p.who && p.t0 < R.t0 && t >= R.t0 ? 1 - cl((t - R.t0) / 120) : 1; if (yield_ <= 0) return; c.save(); c.globalAlpha *= yield_; drawPop(g, p, t); c.restore(); };
  for (const p of pops) if (kindOf(p) === 'word') one(p);
  for (const p of pops) if (kindOf(p) !== 'word') drawPop(g, p, t);
}
export function drawRibbon(g, R, t, cx, cy, side) { const S = STY[TFX.key]; if (!S || !R) return; const age = t - R.t0; if (age < 0 || age > R.ms) return; S.ribbon(g, R, age, cx, cy, side, g.c.getTransform().a || 1); }
export function drawTitle(g, T0, t, cx, cy) { const S = STY[TFX.key]; if (!S || !T0) return; S.title(g, T0, t - T0.t0, cx, cy, g.c.getTransform().a || 1); }
