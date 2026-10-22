// 종자 · 상점 물건 그림(2026-10-23 사용자 "코덱스로 종자디자인과 상점의 아이템 디자인도 받아서 만들어줘 … 코덱스는 디자인만"):
//  코덱스 원화(tools/pixel/big/concept/items/ — 회색 배경) → tools/pixel/big/items.mjs(누끼 · 작은 도트) → assets/v2/items/
//  seed_<종>.png 28×32(아래 맞춤 — 같은 날 사용자 "종자도 식물별로 다 다르게해줘", 종마다 다른 종자) · seed_<속성>.png(종자 그림이 아직 없는 종의 대신 그림)
//  item_<물건>.png 44×44(상점 카드) · item_<물건>_s.png 28×28(가방 줄 · 받은 것 칸)
import { SPECIES } from '../game/catalog.js';
export const ITEMART = {};
export const seedEl = key => (SPECIES[key] ? SPECIES[key].el : key);   // 종 → 속성(속성 이름을 바로 줘도 됨)
export const SEED_ELS = ['fire', 'water', 'grass', 'earth', 'wind', 'bolt', 'ice'];
export const ITEM_KEYS = ['seed_common', 'seed_rare', 'card_basic', 'card_mut', 'water', 'fert', 'regress', 'fuel', 'parts'];
// 상점 물건 · 가방 물건 → 그림 이름
export const ITEM_OF = { seed_common: 'seed_common', seed_rare: 'seed_rare', card_basic: 'card_basic', card_mut: 'card_mut', water10: 'water', fert5: 'fert', regress1: 'regress', fuel3: 'fuel', parts5: 'parts',
  water: 'water', fert: 'fert', regress: 'regress', fuel: 'fuel', parts: 'parts', pack_n: 'card_basic', pack_m: 'card_mut' };
const NAMES = [...SEED_ELS.map(e => 'seed_' + e), ...Object.keys(SPECIES).map(k => 'seed_' + k), ...ITEM_KEYS.flatMap(k => ['item_' + k, 'item_' + k + '_s'])];
const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
export async function loadItemArt(base = '../assets/v2/items/') {
  const got = await Promise.all(NAMES.map(n => load(base + n + '.png')));
  NAMES.forEach((n, i) => { if (got[i]) ITEMART[n] = got[i]; });
  shinyMemo.clear();
  return NAMES.filter(n => !ITEMART[n]);
}
// 물건 그림(small = 28칸) — 없으면 null
export const itemArt = (key, small = false) => { const n = ITEM_OF[key] || key; return ITEMART['item_' + n + (small ? '_s' : '')] || null; };

// 색 변종 = 종자 껍질 색이 바뀜(속성마다 정한 색상환 돌리기 — 먹선 · 아주 어두운 칸은 그대로, 한 번 굽고 재사용).
//  2026-10-23 사용자 "전설이나 색변종이나 이런게 식물의 아이콘을 가리지 않게" — 글자 띠를 그림 위에 얹지 않고 그림 자체가 다른 색
const SHINY_HUE = { fire: 35, water: -40, grass: -70, earth: 170, wind: 60, bolt: 180, ice: 80 };   // 불 = 금빛 불꽃 · 물 = 청록 · 풀 = 단풍 금빛 · 대지 = 달빛 돌 · 바람 = 벚꽃 분홍 · 번개 = 금빛 껍질에 푸른 번개 · 빙결 = 보랏빛 얼음(속성 색과 헷갈리지 않게)
const shinyMemo = new Map();
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hsl2rgb(h, s, l) { h = ((h % 360) + 360) % 360 / 360; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255)); }
export function seedSprite(key, shiny = false) {   // key = 종(없으면 그 속성 종자) 또는 속성
  const el = seedEl(key), im = ITEMART['seed_' + key] || ITEMART['seed_' + el] || ITEMART.seed_grass; if (!im) return null;
  if (!shiny) return im;
  let cv = shinyMemo.get(key); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
  const c = cv.getContext('2d'); c.drawImage(im, 0, 0);
  const id = c.getImageData(0, 0, cv.width, cv.height), d = id.data, dh = SHINY_HUE[el] ?? 120;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 10) continue;
    const [h, s, l] = rgb2hsl(d[i], d[i + 1], d[i + 2]); if (l < 0.16) continue;
    const [r, g, b] = hsl2rgb(h + dh, Math.min(1, s * 1.08), Math.min(0.96, l * 1.04)); d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  c.putImageData(id, 0, 0); shinyMemo.set(key, cv); return cv;   // 그림이 나중에 오면(대신 그림 → 종 그림) 새로 구워야 해서 loadItemArt 가 비움
}
