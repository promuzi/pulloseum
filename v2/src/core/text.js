// 글자 = 프리텐다드(OFL)를 기기 해상도로 매끈하게. 크기는 논리 칸 단위(1칸 = 기기 화소 s개).
// 그림은 도트, 글자는 고해상도 — 도트 글자가 깨져 보인다는 피드백(2026-10-14)으로 바꿈.
export const FONT = {
  body: { weight: 600, size: 11 },
  bold: { weight: 800, size: 11 },
  head: { weight: 800, size: 14 },
  // 2026-10-15 사용자 "UI의 글자가 작거나 깨지는 거 같아. 특히 식물 아래 이름은 많이 깨짐" — 홈·식물 관리용 한 단계 큰 글자
  label: { weight: 700, size: 12 },
  value: { weight: 800, size: 13 },
  name: { weight: 800, size: 16 },
  big:  { weight: 900, size: 30 },
  huge: { weight: 900, size: 46 },
};
const FAMILY = 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const css = f => `${f.weight} ${f.size}px ${FAMILY}`;
const meas = document.createElement('canvas').getContext('2d');

// 글자 윗선(한글 기준)까지의 높이를 한 번만 잰다
function metrics(f) {
  if (f.m) return f.m;
  meas.font = css(f);
  const m = meas.measureText('한글가힣');
  const asc = m.actualBoundingBoxAscent || f.size * 0.86, desc = m.actualBoundingBoxDescent || f.size * 0.1;
  f.m = { asc, h: Math.ceil(asc + desc) };
  return f.m;
}
export function measure(str, fontKey = 'body') {
  const f = FONT[fontKey]; meas.font = css(f);
  return Math.ceil(meas.measureText(String(str)).width);
}
export function lineH(fontKey = 'body') { return metrics(FONT[fontKey]).h; }
// 글자 상자(올림 없는 실제 높이) — 작은 창 속 글자를 위아래 같은 간격으로 놓을 때
export function glyphH(fontKey = 'body') { const f = FONT[fontKey]; metrics(f); meas.font = css(f); const m = meas.measureText('한글가힣'); return (m.actualBoundingBoxAscent || f.size * 0.86) + (m.actualBoundingBoxDescent || f.size * 0.1); }

// 글자 그리기. y = 글자 윗선. opt: {color, align, shadow, outline}
export function drawText(ctx, str, x, y, opt = {}) {
  str = String(str);
  const f = FONT[opt.font || 'body'], m = metrics(f);
  ctx.font = css(f);
  ctx.textAlign = opt.align === 'center' ? 'center' : (opt.align === 'right' ? 'right' : 'left');
  ctx.textBaseline = 'alphabetic';
  const by = y + m.asc;
  if (opt.outline) { ctx.lineJoin = 'round'; ctx.lineWidth = opt.outlineW || 2; ctx.strokeStyle = opt.outline; ctx.strokeText(str, x, by); }
  if (opt.shadow) { ctx.fillStyle = opt.shadow; ctx.fillText(str, x, by + (opt.shadowY || 1)); }
  ctx.fillStyle = opt.color || '#ffffff';
  ctx.fillText(str, x, by);
  ctx.textAlign = 'left';
  return Math.ceil(ctx.measureText(str).width);
}

// 줄바꿈: 띄어쓰기에서 먼저 끊고, 한 단어가 너무 길면 글자 단위로
export function wrap(str, fontKey, maxW) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (measure(t, fontKey) <= maxW) { line = t; continue; }
      if (line) out.push(line);
      if (measure(word, fontKey) <= maxW) { line = word; continue; }
      line = '';
      for (const ch of word) { if (measure(line + ch, fontKey) > maxW) { out.push(line); line = ch; } else line += ch; }
    }
    out.push(line);
  }
  return out;
}

// 큰 제목: 위·가운데·아래 3단 색 띠 그라데이션 + 외곽선 + 아래 그림자
export function drawTitle(ctx, str, cx, y, o = {}) {
  const f = FONT[o.font || 'big'], m = metrics(f);
  ctx.font = css(f); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const by = y + m.asc, top = y, h = m.h;
  const k = o.font === 'huge' ? 3 : 2;
  ctx.lineJoin = 'round';
  ctx.fillStyle = o.shadow; ctx.fillText(str, cx, by + k);
  ctx.lineWidth = k + 1; ctx.strokeStyle = o.line; ctx.strokeText(str, cx, by + k);
  ctx.lineWidth = k + 1; ctx.strokeStyle = o.line; ctx.strokeText(str, cx, by);
  const gr = ctx.createLinearGradient(0, top, 0, top + h);
  gr.addColorStop(0, o.top); gr.addColorStop(0.42, o.top); gr.addColorStop(0.42, o.mid); gr.addColorStop(0.74, o.mid); gr.addColorStop(0.74, o.low); gr.addColorStop(1, o.low);
  ctx.fillStyle = gr; ctx.fillText(str, cx, by);
  ctx.textAlign = 'left';
  return measure(str, o.font || 'big');
}

export async function loadFonts() {
  await Promise.all(Object.values(FONT).map(f => document.fonts.load(css(f), '한글Ag1')));
  await document.fonts.ready;
}
