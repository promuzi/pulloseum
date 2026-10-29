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
// 크기만 바꾼 글꼴(같은 굵기) — 좁은 칸에 글자를 줄여 다 넣을 때(2026-10-18 스마트팜 서랍 이름표). 처음 부를 때 FONT 에 '<이름>@<크기>'로 더함
export function sized(base, size) { const k = `${base}@${size}`; if (!FONT[k]) FONT[k] = { weight: FONT[base].weight, size }; return k; }
const FAMILY = 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const css = f => `${f.weight} ${f.size}px ${FAMILY}`;
const meas = document.createElement('canvas').getContext('2d');

// 글꼴이 늦게 오면(처음 화면은 글꼴을 기다리지 않음) 대신 글꼴로 잰 높이를 버리고 다시 잼
export function resetMetrics() { for (const f of Object.values(FONT)) delete f.m; INKMID.clear(); }
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
// 한 글자의 실제 잉크 높이(기준선 위 · 아래) + 그 글꼴 글자 윗선(drawText y)에서 기준선까지 — 기호 하나를 원 · 칸 가운데에 놓을 때
export function inkOf(str, fontKey = 'body') {
  const f = FONT[fontKey], m0 = metrics(f); meas.font = css(f);
  const m = meas.measureText(String(str));
  return { asc: m.actualBoundingBoxAscent || f.size * 0.72, desc: m.actualBoundingBoxDescent || 0, dx: ((m.actualBoundingBoxRight || m.width) - (m.actualBoundingBoxLeft || 0)) / 2 - m.width / 2, top: m0.asc };   // dx = 잉크 가운데가 글자 폭 가운데보다 오른쪽으로 얼마나
}
// 그 글자의 잉크 가운데가 cy 에 오도록 drawText 의 y(글자 윗선)를 돌려줌 — 상자 속 한 줄 글자(단추 · 탭 · 알약 · 배지)
//  2026-10-25 사용자 "글자랑 아이콘이 상자안에서 중앙보다 조금 더 위에 있는 느낌 · 항상 이런 문제" — 줄 높이(lineH)는 '한글가힣'의 ㅎ · ㄹ 받침까지 재서
//  받침이 얕은 글자('닫기' · '종자')는 잉크가 줄 상자 위쪽에 붙어 1칸 높아 보였음(tools/shots/centercheck.mjs 실측) → 글자마다 실제 잉크로 가운데
const INKMID = new Map();
export function inkMidY(str, fontKey, cy) {
  str = String(str); const k = fontKey + '|' + str;
  let off = INKMID.get(k);
  if (off == null) {
    const f = FONT[fontKey] || FONT.body, m0 = metrics(f); meas.font = css(f);
    const m = meas.measureText(str), a = m.actualBoundingBoxAscent, d = m.actualBoundingBoxDescent;
    off = a == null || d == null || a + d <= 0 ? -m0.h / 2 : (a - d) / 2 - m0.asc;   // 기준선 = cy + (잉크 위 − 잉크 아래)/2 → 윗선 = 기준선 − asc
    if (INKMID.size > 4000) INKMID.clear();
    INKMID.set(k, off);
  }
  return Math.round(cy + off);
}
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
// 줄 맨 앞에 오면 안 되는 닫는 부호 · 줄 맨 끝에 오면 안 되는 여는 부호(2026-10-29 사용자 '검방술의 경우 )가 아랫줄로 밀림')
const CLOSE = new Set([...')]}」』.,!?~…·:;%']), OPEN = new Set([...'([{「『']);
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
      for (const ch of word) {
        if (measure(line + ch, fontKey) <= maxW) { line += ch; continue; }
        if (CLOSE.has(ch) && line.length > 1) { out.push(line.slice(0, -1)); line = line.slice(-1) + ch; }   // 닫는 부호는 앞 글자와 함께 내려감
        else { out.push(line); line = ch; }
      }
    }
    out.push(line);
  }
  return out;
}
// 짧은 이름(카드 이름 등) 두 줄 나누기 — 줄 끝 마침표 · 물음표 · 닫는 괄호는 hang칸까지 넘쳐도 그 줄에 둠(매달린 부호):
//  ① 띄어쓰기에서 두 줄이 되면 지금까지처럼 앞 줄을 채움 ② 아니면 여는 괄호 앞 > 글자 사이에서 두 줄을 고르게 — 닫는 부호가 줄 맨 앞 · 여는 부호가 줄 맨 끝에 오지 않게
//  ('검방술(기본' + ')' → '검방술' + '(기본)' · '깨트려드리' + '죠.' → '깨트려' + '드리죠.'). 돌려준 줄 묶음의 split = 띄어쓰기가 있는 이름을 단어 가운데서 끊음(부르는 쪽이 글자를 줄여 다시)
export function wrapName(str, fontKey, maxW, hang = 4) {
  const s = String(str), fits = t => { const m = measure(t, fontKey); return m <= maxW || (CLOSE.has(t[t.length - 1]) && m <= maxW + hang); };
  if (fits(s)) return [s];
  const words = s.split(' ');
  for (let k = words.length - 1; k >= 1; k--) { const a = words.slice(0, k).join(' '); if (!fits(a)) continue; const b = words.slice(k).join(' '); if (fits(b)) return [a, b]; break; }
  const ch = Array.from(s); let best = null;
  for (let i = 1; i < ch.length; i++) {
    const a = ch.slice(0, i).join('').trimEnd(), b = ch.slice(i).join('').trimStart();
    if (!a || !b || CLOSE.has(b[0]) || OPEN.has(a[a.length - 1]) || !fits(a) || !fits(b)) continue;
    const cls = ch[i] === '(' ? 0 : 1, sc = cls * 1000 + Math.max(measure(a, fontKey), measure(b, fontKey));
    if (!best || sc < best[0]) best = [sc, a, b, cls];
  }
  const L = best ? [best[1], best[2]] : wrap(s, fontKey, maxW);
  L.split = !best || (best[3] === 1 && s.includes(' '));
  return L;
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
