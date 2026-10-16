// 전광판(2026-10-16 사용자 "안내 문구는 따로 창을 만들지 않고 나와 적 식물 사이 가운데에 전광판 효과처럼 팍 나오는 느낌"):
//  검은 판 + 얇은 쇠 테 + 빛나는 글자 위에 1칸 격자(점 무늬) → 글자가 점(LED)으로 보임. 나타날 땐 가운데 줄에서 위아래로 팍 펼쳐지고 테가 한 번 번쩍.
//  대결 방 초대 코드도 같은 판.
export const LED = { amber: '#ffcf4a', teal: '#9ad2ff', red: '#ff7a5a', gold: '#ffe27a', white: '#f4fbff', green: '#9ff0b0', violet: '#d8b8ff' };
const glowOf = col => { const n = parseInt(col.slice(1), 16), f = v => Math.round(v * 0.38).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };

// 판: (x, y, w, h), k = 펼쳐진 정도(0~1), flash = 테 번쩍(0~1)
export function ledPanel(g, x, y, w, h, k = 1, flash = 0) {
  const hh = Math.max(2, Math.round(h * k)), yy = Math.round(y + (h - hh) / 2);
  g.rect(x - 2, yy - 2, w + 4, hh + 4, '#05070b');
  g.rect(x - 1, yy - 1, w + 2, hh + 2, flash > 0 ? mix('#3a4250', '#ffffff', flash) : '#3a4250');
  g.rect(x, yy, w, hh, '#07090d');
  g.rect(x, yy, w, 1, '#141922');
  return { y: yy, h: hh };
}
const mix = (a, b, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join(''); };
// 글자(가운데 정렬) + 점 무늬. 글자 칸 = (x, y, w, h) 안에서만 격자를 덮음
export function ledText(g, str, cx, y, opt = {}) {
  const font = opt.font || 'bold', col = opt.color || LED.amber, w = g.textW(str, font), h = g.lineH(font) + 2, x = Math.round(cx - w / 2) - 1;
  g.text(str, cx, y, { font, color: glowOf(col), align: 'center', outline: glowOf(col), outlineW: 3 });
  g.text(str, cx, y, { font, color: col, align: 'center' });
  // 점 무늬: 기기 화소 1칸 두께의 어두운 격자를 논리 1칸마다(배율 2 이상일 때만 — 글자는 기기 해상도라 칸마다 점이 됨)
  //  (배율 2 = 가로 줄만 · 3 이상 = 가로 + 옅은 세로 — 너무 촘촘하면 글자가 어두워져 안 읽힘)
  const sc = (g.c.getTransform && g.c.getTransform().a) || 1;
  if (opt.dots !== false && sc >= 2) {
    const lw = 1 / sc;
    g.c.fillStyle = 'rgba(7,9,13,0.42)';
    for (let yy = y - 1; yy < y + h; yy += 1) g.c.fillRect(x - 3, yy + 1 - lw, w + 7, lw);
    if (sc >= 3) { g.c.fillStyle = 'rgba(7,9,13,0.28)'; for (let xx = x - 3; xx < x + w + 4; xx += 1) g.c.fillRect(xx + 1 - lw, y - 1, lw, h + 1); }
  }
  return w;
}
// 판 + 여러 줄 글자(줄마다 가운데) — 줄 높이 lh
export function ledBoard(g, lines, cx, cy, opt = {}) {
  const font = opt.font || 'bold', lh = g.lineH(font) + 5, pad = opt.pad ?? 10, minW = opt.minW || 0;
  const w = Math.min(opt.maxW || 999, Math.max(minW, ...lines.map(l => g.textW(l.text || l, font))) + pad * 2), h = lines.length * lh + 8;
  const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
  const P = ledPanel(g, x, y, w, h, opt.k ?? 1, opt.flash || 0);
  if ((opt.k ?? 1) >= 0.85) lines.forEach((l, i) => ledText(g, l.text || l, cx, y + 5 + i * lh, { font, color: l.color || opt.color }));
  return { x, y: P.y, w, h: P.h };
}
