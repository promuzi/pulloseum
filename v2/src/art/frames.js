// 기술 카드 테두리(2026-11-04 사용자 '스킬 테두리 고안해보자 / 속성/종/속성+종/고유스킬 로 분류 … 색깔만 바꾸기보단 덩쿨이면 테두리를 덩쿨이 꼬인것처럼 …
//  불속성+덩쿨이면 불 덩쿨로. 고유스킬이면 따로 표식을 해주자. 불속성 식물에 번개타입이라고 번개테두리를 주면 헷갈림' → '코덱스한테 테두리 그림 받아서 카드에 적용해볼래?'
//  → 같은 날 아침 '테두리는 종만 담는걸로 할까?'(370 = 종 테만) → '없는 6개를 어떤 기준으로 묶어서 … 일단 속성은 필요해지긴하네 보니깐 / 기본기도 전용으로 필요해보이고'
//  → '반대로 하자. 테두리는 속성이 우선. 그다음에 속성이 없는 걸 종 테두리고 … 기본테는 코덱스에게'(379):
//  테두리 = 그 기술의 속성(el_* 일곱 — 속성 공통 · 가지 · 속성 있는 고유) → 속성이 없으면 종(ty_* 넷 — 종 공통 · 속성 없는 고유는 그 식물의 종)
//   → 속성도 종도 없으면 기본 테(basic — 기본기 넷 · 특수 넷 · 쇠 띠, 못 자국은 '별로임'으로 빼고 다시 그림 v3) · 아래 가운데 표식 = 고유 별 · 특수 보석(drawMark)
//   변이 · 패시브 카드 = 지금 테 그대로(skillcard.js — 변이 = 각진 테 · 패시브 = 점선 테)
//   바람 · 빙결 모서리는 게임 속성 색(보라 · 청록)으로 다시 칠함(코덱스 그림은 민트 · 하늘이라 바람이 빙결처럼 보임)
//   버린 안 = 밤샘 365(고유 = 종 모서리를 그 식물 속성 색으로 다시 칠함 — 4종 × 7속성) · 370(종만 · 속성 공통은 둥근 테)
//  그림 = 코덱스 모서리 원화(tools/pixel/big/concept/frame/v1 — 요청서 FRAME_PROMPT.md · 기본 테와 보석은 v2 — FRAME_BASIC_PROMPT.md) → greycut 누끼 → itemconv 30칸 10색 → assets/v2/frames/<이름>.png(왼쪽 위 모서리 하나)
//   (같은 날 '테두리가 픽셀이 작아서 자글자글하고 그래. 입체감을 줘서 좀 튀어나와도 되고, 픽셀을 좀 올리거나 크기를 키워줘' → 24칸 14색에서 키움 · 빛 · 그늘 · 그림자)
//   그리기 = 모서리를 네 귀퉁이에 뒤집어 놓고 사이 변은 팔 끝 조각을 이어 붙임(이음매가 덜 보이는 길이를 고름) → 카드 크기마다 한 장으로 합쳐 둠(composed)
//   입체감 = 왼쪽 위에서 오는 빛: 먹선 안쪽 한 칸을 왼쪽 위 면은 밝게 · 오른쪽 아래 면은 어둡게 + 테 모양 그림자를 오른쪽 · 아래로 2칸 밀어 카드 그림 위에 깖
//   모서리 원본 = itemconv 30칸 10색 → 외톨이 한 칸 지움(tools/pixel/big/frameclean.py) · 15칸을 두 배로 키운 안은 꽃 · 덩굴 모양이 뭉개져 버림
//   (카드 밖으로 튀어나오게는 안 함 — 꾹 눌러 보는 큰 카드 · 더미 펼침은 카드 크기 캔버스에 그려 바깥이 잘림)
import { ELEMENT } from './palette.js';
import { SPECIES, uniqueOf } from '../game/catalog.js';

export const FRAME_NAMES = ['el_fire', 'el_water', 'el_grass', 'el_earth', 'el_wind', 'el_bolt', 'el_ice', 'ty_flower', 'ty_vine', 'ty_cactus', 'ty_mushroom', 'basic'];
const RAW = {}, BUILT = new Map();
const RECOLOR_EL = { el_wind: 'wind', el_ice: 'ice' };   // 코덱스 색(민트 · 하늘)이 게임 속성 색(바람 보라 · 빙결 청록)과 달라 다시 칠함
const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
export async function loadFrames(base = '../assets/v2/frames/') {
  const got = await Promise.all(FRAME_NAMES.map(n => load(base + n + '.png')));
  FRAME_NAMES.forEach((n, i) => { if (got[i]) RAW[n] = got[i]; });
  BUILT.clear();
  return FRAME_NAMES.filter(n => !RAW[n]);
}
// 고유 기술 → 그 식물 키(기술 id 'u_<줄임>_…'의 줄임 → 종)
const OWNER = (() => { const m = {}; for (const k of Object.keys(SPECIES)) { const c = uniqueOf(k, 0).split('_')[1]; if (c && !m[c]) m[c] = k; } return m; })();
const ownerOf = sk => (sk.fx && SPECIES[sk.fx] ? sk.fx : OWNER[String(sk.id || '').split('_')[1]]) || null;
// 그 기술의 테 이름(없으면 지금 테): 'el_속성' → 'ty_종' → 'basic'(기본기 · 특수 · 쉬기)
export function frameKey(sk) {
  if (!sk || sk.passive || sk.form) return null;
  if (sk.el) return ELEMENT[sk.el] ? `el_${sk.el}` : null;
  if (sk.tier === 'u') { const sp = SPECIES[ownerOf(sk)]; return sp && sp.type ? `ty_${sp.type}` : 'basic'; }
  return sk.jong ? `ty_${sk.jong}` : 'basic';
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const flip = (src, fx, fy) => { const c = canvas(src.width, src.height), x = c.getContext('2d'); x.translate(fx ? src.width : 0, fy ? src.height : 0); x.scale(fx ? -1 : 1, fy ? -1 : 1); x.drawImage(src, 0, 0); return c; };
const hexRgb = h => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
// 밝기대로 속성 색 계단에 옮겨 칠함(먹선 = 아주 어두운 칸은 그대로)
function recolor(img, el) {
  const E = ELEMENT[el], c = canvas(img.width, img.height), x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  if (!E) return c;
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data, ink = 0.16;
  const [dk, mn, lt] = [hexRgb(E.dark), hexRgb(E.main), hexRgb(E.light)], ramp = [mix(dk, [11, 19, 34], 0.35), dk, mix(dk, mn, 0.5), mn, mix(mn, lt, 0.5), lt, mix(lt, [255, 255, 255], 0.55)];
  let lo = 1, hi = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { const L = lum(d[i], d[i + 1], d[i + 2]); if (L >= ink) { lo = Math.min(lo, L); hi = Math.max(hi, L); } }
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const L = lum(d[i], d[i + 1], d[i + 2]);
    if (L < ink) continue;
    const t = hi > lo ? (L - lo) / (hi - lo) : 0.5, c3 = ramp[Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1)))];
    d[i] = c3[0]; d[i + 1] = c3[1]; d[i + 2] = c3[2];
  }
  x.putImageData(id, 0, 0);
  return c;
}
// 이어 붙일 팔 조각 길이 = 모서리 장식이 끝난 뒤 곧은 팔 부분 전체(팔 두께보다 불투명 칸이 많은 줄 = 장식) — 이어 붙일 때 하나 걸러 뒤집어(거울) 이음매가 안 보이게
const CAP = 3;   // 모서리 그림 팔 끝의 마감(먹선 · 끝 그늘 · 가늘어지는 끝) 칸 수
function straight(d, T, along, span) {
  let n = 0;
  for (let i = T - 1; i >= 0; i--) {
    let deep = 0;   // 팔 두께 밖(안쪽)으로 나온 불투명 칸
    for (let q = span + 1; q < T; q++) { const k = along ? ((q * T) + i) * 4 : ((i * T) + q) * 4; if (d[k + 3] > 0) deep++; }
    if (deep > 0) break;
    n++;
  }
  return Math.max(4, Math.min(T - 2, n));
}
function build(key) {
  if (BUILT.has(key)) return BUILT.get(key);
  const img = RAW[key];
  if (!img) { BUILT.set(key, null); return null; }
  const base = RECOLOR_EL[key] ? recolor(img, RECOLOR_EL[key]) : canvas(img.width, img.height);
  if (!RECOLOR_EL[key]) base.getContext('2d').drawImage(img, 0, 0);
  const T = base.width, d = base.getContext('2d').getImageData(0, 0, T, T).data;
  // 팔 두께 = 끝 8칸 안에서 위 팔의 가장 아래 불투명 줄 · 왼 팔의 가장 오른쪽 불투명 칸(전엔 맨 끝 한 줄만 봐서 끝이 가늘어지는 덩굴 위 팔을 1칸으로 잼)
  let ay = 0, ax = 0;
  for (let x = T - 8; x < T; x++) for (let y = 0; y < T / 2; y++) if (d[((y * T) + x) * 4 + 3] > 0 && y > ay) ay = y;
  for (let y = T - 8; y < T; y++) for (let x = 0; x < T / 2; x++) if (d[((y * T) + x) * 4 + 3] > 0 && x > ax) ax = x;
  // 이어 붙일 조각 = 곧은 팔에서 끝 마감 CAP칸(먹선 · 끝 그늘)을 뺀 부분 — 넣으면 조각마다 먹선이 끼어 테가 일정한 간격으로 끊겨 보임(2026-11-04 사용자 '테두리가 가로로 끊긴듯한 건 뭐때문이야?')
  const P = straight(d, T, true, ay), Q = straight(d, T, false, ax), pw = Math.max(2, P - CAP), qh = Math.max(2, Q - CAP);
  const top0 = canvas(pw, ay + 1); top0.getContext('2d').drawImage(base, T - P, 0, pw, ay + 1, 0, 0, pw, ay + 1);
  const left0 = canvas(ax + 1, qh); left0.getContext('2d').drawImage(base, 0, T - Q, ax + 1, qh, 0, 0, ax + 1, qh);
  const pair = (a, horiz) => { const b = flip(a, horiz, !horiz), c = canvas(horiz ? a.width * 2 : a.width, horiz ? a.height : a.height * 2), x = c.getContext('2d'); x.drawImage(a, 0, 0); x.drawImage(b, horiz ? a.width : 0, horiz ? 0 : a.height); return c; };   // 조각 + 거울 조각 = 이음매 없는 한 마디
  const top = pair(top0, true), left = pair(left0, false);
  const F = { T, ay, ax, tl: base, tr: flip(base, true, false), bl: flip(base, false, true), br: flip(base, true, true), top, bottom: flip(top, false, true), left, right: flip(left, true, false) };
  BUILT.set(key, F);
  return F;
}
export const hasFrame = sk => { const k = frameKey(sk); return !!(k && RAW[k]); };
// 빛 · 그늘: 먹선(바깥 둘레) 안쪽 한 칸 — 왼쪽 위 대각선 이웃이 둘레면 빛 면, 오른쪽 아래가 둘레면 그늘 면(아주 어두운 칸은 그대로)
const INK = [11, 19, 34];
function bevel(x, w, h) {
  const id = x.getImageData(0, 0, w, h), d = id.data, A = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[((j * w) + i) * 4 + 3] > 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = ((j * w) + i) * 4;
    if (!d[k + 3] || (0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2]) / 255 < 0.16) continue;
    if (A(i - 1, j - 1) && !A(i - 2, j - 2)) for (let c = 0; c < 3; c++) d[k + c] = Math.round(d[k + c] + (255 - d[k + c]) * 0.45);
    else if (A(i + 1, j + 1) && !A(i + 2, j + 2)) for (let c = 0; c < 3; c++) d[k + c] = Math.round(d[k + c] + (INK[c] - d[k + c]) * 0.5);
  }
  x.putImageData(id, 0, 0);
}
// 카드 크기(w×h)마다 테 한 장: 사이 변 → 네 모서리 → 빛 · 그늘 → 그림자 깔고 그 위에 테
const COMPOSED = new Map();
function composed(key, w, h) {
  const ck = `${key}|${w}x${h}`;
  if (COMPOSED.has(ck)) return COMPOSED.get(ck);
  const F = build(key);
  if (!F) { COMPOSED.set(ck, null); return null; }
  const fr = canvas(w, h), x = fr.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(F.tl, 0, 0); x.drawImage(F.tr, w - F.T, 0); x.drawImage(F.bl, 0, h - F.T); x.drawImage(F.br, w - F.T, h - F.T);
  edges(x, 0, 0, w, h, F, CAP);   // 모서리 다음에 사이 변 — 모서리 팔 끝 마감(CAP칸)을 덮어 이음매가 안 보이게
  bevel(x, w, h);
  const sh = canvas(w, h), s = sh.getContext('2d');
  s.drawImage(fr, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = 'rgba(4,8,18,0.7)'; s.fillRect(0, 0, w, h);
  const out = canvas(w, h), o = out.getContext('2d');
  o.drawImage(sh, 2, 2); o.drawImage(fr, 0, 0);
  COMPOSED.set(ck, out);
  return out;
}
// 사이 변(모서리 사이를 팔 조각으로) — 그림 · 이름 띠 위에 그림(안쪽 1~2칸을 덮음)
function edges(c, x, y, w, h, F, cap = 0) {
  const T = F.T - cap;   // cap = 모서리 팔 끝 마감을 덮을 만큼 안쪽에서 시작
  const run = (im, x0, y0, len, horiz) => { const step = horiz ? im.width : im.height; for (let o = 0; o < len; o += step) { const n = Math.min(step, len - o); if (horiz) c.drawImage(im, 0, 0, n, im.height, x0 + o, y0, n, im.height); else c.drawImage(im, 0, 0, im.width, n, x0, y0 + o, im.width, n); } };
  run(F.top, x + T, y, w - 2 * T, true);
  run(F.bottom, x + T, y + h - F.bottom.height, w - 2 * T, true);
  run(F.left, x, y + T, h - 2 * T, false);
  run(F.right, x + w - F.right.width, y + T, h - 2 * T, false);
}
// 고유 · 특수 표식(2026-11-04 사용자 '별이랑 보석 아이콘이 위에 있으니 숫자와 겹치네 아래로 옮기고 테두리랑 이어지게. 그리고 좀 더 잘보이게 바꿔줘. 멀리서 보면 구분티 안 돼'):
//  아래 테 가운데에 박힌 짙은 판(밝은 속 테 — 테 장식처럼) + 큰 별(고유 · 금빛 13×12) · 보석(특수 · 분홍 13×10) — 직접 찍은 도트
//  높이 12칸(아래 끝 = 카드 아래 끝) = 이름 둘째 줄 아래 끝(카드 위에서 77칸)에 안 닿음
//  전 = 위 가운데 코덱스 표식 12칸(crest_unique · crest_special — 오른쪽 위 수치와 겹치고 별 · 잎 · 리본이 뭉개져 멀리서 안 보였음)
const MARK_COL = { o: '#0b1322', w: '#ffffff', Y: '#fff1a6', y: '#ffc93c', O: '#e2830f', P: '#ff9ccb', p: '#ff3d8e', q: '#b3175f' };
const MARKS = {
  u: { rim: '#ffc93c', rows: [
    '.....ooo.....', '....ooYoo....', '....owYyo....', 'oooooYyyooooo', 'oYYYYYyyyyyOo', 'ooYYyyyyyyOoo',
    '.ooYyyyyyOoo.', '.ooyyyyyOOoo.', '.oyyyyoyyOOo.', '.oyyyoooyOOo.', '.oyyoo.ooOOo.', '.oooo...oooo.'] },
  s: { rim: '#ff5fa2', rows: [
    '..ooooooooo..', '.oowwPPPPPoo.', 'ooPPPPPPPppoo', 'opppppppppppo', 'oopppppqqqqoo',
    '.oopppqqqqoo.', '..ooppqqqoo..', '...oopqqoo...', '....ooqoo....', '.....ooo.....'] },
};
function drawMark(g, cx, yb, M) {
  const pw = 19, ph = 9, px0 = cx - (pw >> 1), py0 = yb - ph + 1;   // 판 = 표식보다 양쪽 3칸 넓게(27칸은 표식 옆 빈 칸이 빈 상자처럼 보였음)
  const plate = (inset, col) => { for (let j = inset; j < ph - inset; j++) { const e = Math.max(0, 2 - Math.min(j, ph - 1 - j)) + inset; g.rect(px0 + e, py0 + j, pw - 2 * e, 1, col); } };   // 모서리 둥근 판(바깥 2칸 깎음)
  plate(0, MARK_COL.o); plate(1, M.rim); plate(2, '#1a2236');
  const rows = M.rows, x0 = cx - (rows[0].length >> 1), y0 = yb - rows.length + 1;
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') g.px(x0 + i, y0 + j, MARK_COL[row[i]]); });
}
// 테 그리기(cardFront가 그림 · 이름 띠를 깐 뒤 부름): 합친 테 한 장 → lit(고른 카드) = 바깥 금빛 줄 → 아래 가운데 표식(고유 = 별 · 특수 = 보석)
export function drawFrameArt(g, x, y, w, h, sk, lit) {
  const key = frameKey(sk), im = key && composed(key, Math.round(w), Math.round(h));
  if (!im) return false;
  const c = g.c, sm = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = false;
  c.drawImage(im, x, y);
  if (lit) { g.rect(x + 3, y, w - 6, 1, '#ffd890'); g.rect(x + 3, y + h - 1, w - 6, 1, '#ffd890'); g.rect(x, y + 3, 1, h - 6, '#ffd890'); g.rect(x + w - 1, y + 3, 1, h - 6, '#ffd890'); }
  if (MARKS[sk.tier]) drawMark(g, Math.round(x + w / 2), Math.round(y + h - 1), MARKS[sk.tier]);
  c.imageSmoothingEnabled = sm;
  return true;
}
