// 기술 카드 테두리(2026-11-04 사용자 '스킬 테두리 고안해보자 / 속성/종/속성+종/고유스킬 로 분류 … 색깔만 바꾸기보단 덩쿨이면 테두리를 덩쿨이 꼬인것처럼 …
//  불속성+덩쿨이면 불 덩쿨로. 고유스킬이면 따로 표식을 해주자. 불속성 식물에 번개타입이라고 번개테두리를 주면 헷갈림' → '코덱스한테 테두리 그림 받아서 카드에 적용해볼래?'
//  → 같은 날 아침 '테두리는 속성정보까지 담으니깐 종류가 너무 많아진 느낌이야 / 테두리는 종만 담는걸로 할까? 속성은 속성 마크랑 아이콘 색으로도 알 수 있으니깐'):
//  테두리 = 그 기술을 배우는 종(꽃 · 덩굴 · 선인장 · 버섯) — 기술의 공격 속성이 아님(싹둑마마 ..력일섬! = 번개 공격이어도 싹둑마마 종 테)
//   종 공통 = 종 모서리(ty_* · 제 색) · 고유 = 그 식물의 종 모서리(제 색) + 고유 표식(별)
//   속성 공통 · 가지 · 특수 · 기본기 · 변이 · 패시브 카드 = 지금 테 그대로(skillcard.js 둥근 테) · 속성은 그림 왼쪽 아래 속성 배지로
//   버린 안(밤샘 365) = 속성 공통 = 속성 모서리(el_* 일곱) · 고유 = 종 모서리를 그 식물 속성 색으로 다시 칠함 — 그림 파일은 assets/v2/frames에 남김
//  그림 = 코덱스 모서리 원화(tools/pixel/big/concept/frame/v1 — 요청서 FRAME_PROMPT.md) → greycut 누끼 → itemconv 24칸 → assets/v2/frames/<이름>.png(왼쪽 위 모서리 하나)
//   그리기 = 모서리를 네 귀퉁이에 뒤집어 놓고 사이 변은 팔 끝 조각을 이어 붙임(이음매가 덜 보이는 길이를 고름)
import { SPECIES, uniqueOf } from '../game/catalog.js';

export const FRAME_NAMES = ['ty_flower', 'ty_vine', 'ty_cactus', 'ty_mushroom', 'crest_unique'];
const RAW = {}, BUILT = new Map();
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
// 그 기술의 테 이름(없으면 지금 테): 'ty_종'
export function frameKey(sk) {
  if (!sk || sk.passive || sk.form || !sk.tier) return null;
  if (sk.tier === 'u') { const sp = SPECIES[ownerOf(sk)]; return sp && sp.type ? `ty_${sp.type}` : null; }
  if (sk.tier === 'c1' || sk.tier === 'c2' || sk.tier === 'c3') return sk.jong ? `ty_${sk.jong}` : null;
  return null;
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const flip = (src, fx, fy) => { const c = canvas(src.width, src.height), x = c.getContext('2d'); x.translate(fx ? src.width : 0, fy ? src.height : 0); x.scale(fx ? -1 : 1, fy ? -1 : 1); x.drawImage(src, 0, 0); return c; };
// 이어 붙일 팔 조각 길이 = 모서리 장식이 끝난 뒤 곧은 팔 부분 전체(팔 두께보다 불투명 칸이 많은 줄 = 장식) — 이어 붙일 때 하나 걸러 뒤집어(거울) 이음매가 안 보이게
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
  const base = canvas(img.width, img.height); base.getContext('2d').drawImage(img, 0, 0);
  const T = base.width, d = base.getContext('2d').getImageData(0, 0, T, T).data;
  let ay = 0, ax = 0;   // 팔 두께(위 팔 = 오른쪽 끝 세로줄의 마지막 불투명 줄 · 왼 팔 = 아래 끝 가로줄의 마지막 불투명 칸)
  for (let y = 0; y < T; y++) if (d[((y * T) + T - 1) * 4 + 3] > 0) ay = y;
  for (let x = 0; x < T; x++) if (d[(((T - 1) * T) + x) * 4 + 3] > 0) ax = x;
  const P = straight(d, T, true, ay), Q = straight(d, T, false, ax);
  const top0 = canvas(P, ay + 1); top0.getContext('2d').drawImage(base, T - P, 0, P, ay + 1, 0, 0, P, ay + 1);
  const left0 = canvas(ax + 1, Q); left0.getContext('2d').drawImage(base, 0, T - Q, ax + 1, Q, 0, 0, ax + 1, Q);
  const pair = (a, horiz) => { const b = flip(a, horiz, !horiz), c = canvas(horiz ? a.width * 2 : a.width, horiz ? a.height : a.height * 2), x = c.getContext('2d'); x.drawImage(a, 0, 0); x.drawImage(b, horiz ? a.width : 0, horiz ? 0 : a.height); return c; };   // 조각 + 거울 조각 = 이음매 없는 한 마디
  const top = pair(top0, true), left = pair(left0, false);
  const F = { T, ay, ax, tl: base, tr: flip(base, true, false), bl: flip(base, false, true), br: flip(base, true, true), top, bottom: flip(top, false, true), left, right: flip(left, true, false) };
  BUILT.set(key, F);
  return F;
}
export const hasFrame = sk => { const k = frameKey(sk); return !!(k && RAW[k]); };
// 사이 변(모서리 사이를 팔 조각으로) — 그림 · 이름 띠 위에 그림(안쪽 1~2칸을 덮음)
function edges(c, x, y, w, h, F) {
  const { T } = F;
  const run = (im, x0, y0, len, horiz) => { const step = horiz ? im.width : im.height; for (let o = 0; o < len; o += step) { const n = Math.min(step, len - o); if (horiz) c.drawImage(im, 0, 0, n, im.height, x0 + o, y0, n, im.height); else c.drawImage(im, 0, 0, im.width, n, x0, y0 + o, im.width, n); } };
  run(F.top, x + T, y, w - 2 * T, true);
  run(F.bottom, x + T, y + h - F.bottom.height, w - 2 * T, true);
  run(F.left, x, y + T, h - 2 * T, false);
  run(F.right, x + w - F.right.width, y + T, h - 2 * T, false);
}
// 테 그리기(cardFront가 그림 · 이름 띠를 깐 뒤 부름): 사이 변 → 네 모서리 → 고유 표식 · lit(고른 카드) = 바깥 금빛 줄
export function drawFrameArt(g, x, y, w, h, sk, lit) {
  const key = frameKey(sk), F = key && build(key);
  if (!F) return false;
  const c = g.c, sm = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = false;
  edges(c, x, y, w, h, F);
  c.drawImage(F.tl, x, y); c.drawImage(F.tr, x + w - F.T, y); c.drawImage(F.bl, x, y + h - F.T); c.drawImage(F.br, x + w - F.T, y + h - F.T);
  if (sk.tier === 'u' && RAW.crest_unique) { const cr = RAW.crest_unique; c.drawImage(cr, Math.round(x + (w - cr.width) / 2), y - 2); }   // 고유 표식 = 위 가운데 별(테에 걸쳐 — 비용 해 · 수치 사이 빈 곳)
  if (lit) { g.rect(x + 3, y, w - 6, 1, '#ffd890'); g.rect(x + 3, y + h - 1, w - 6, 1, '#ffd890'); g.rect(x, y + 3, 1, h - 6, '#ffd890'); g.rect(x + w - 1, y + 3, 1, h - 6, '#ffd890'); }
  c.imageSmoothingEnabled = sm;
  return true;
}
