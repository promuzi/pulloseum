// 탐사선(위에서 본 모습, 앞 = 위) — 탐사 지도(진짜 배, 작게)와 정비 화면(홀로그램, 크게)이 같은 그림을 쓴다.
//  네 가지(2026-10-15 사용자 "4개를 다 만들자. 초반에 선택할 수 있는 걸로, 기능의 차이는 없고 나중에 탐사선 꾸미기에 반영"):
//  코덱스 후보 그림 → tools/pixel/big/shipconv.mjs → assets/v2/ships/ship<n>.png(세로 130칸) · ship<n>_s.png(지도용 32칸).
//  홀로그램 = 그림의 밝기를 청록 네 단으로(고른 부위는 주황), 바깥 테는 밝은 선, 홀수 줄은 듬성듬성(주사선) — 배·부위마다 한 번 만들어 둠.
//  탐사 → 정비 연출: 밝은 줄이 위에서 아래로 훑으며 지나간 줄부터 홀로그램(오버랩), 그동안 지도용 작은 배 → 큰 그림으로 커짐.
export const SHIP_SC = 1;   // 정비 화면 크기(그림 1배)
export const SHIPS = [
  { n: 1, name: '캡슐 짐배', desc: '양옆 식물 캡슐 · 접이식 팔' },
  { n: 2, name: '돔 정찰선', desc: '긴 감지 코 · 등 유리 돔' },
  { n: 3, name: '원반 온실선', desc: '가운데 돔 · 둘레 캡슐' },
  { n: 4, name: '채집 팔 작업선', desc: '큰 채집 팔 · 캡슐 선반' },
];
// 부위 자리(그림 가운데 기준, 1배 칸)와 둘레 반지름 — 정비 화면 이름표 점선·고른 부위 주황·강화 고리
const PARTS = {
  1: { scanner: [0, -47, 12], harvester: [31, -38, 14], durability: [-44, 2, 18], fuel_tank: [16, 39, 13] },
  2: { scanner: [0, -43, 12], harvester: [0, 17, 14], durability: [-40, 15, 18], fuel_tank: [17, 46, 12] },
  3: { scanner: [0, -48, 11], harvester: [0, -4, 17], durability: [-46, 22, 18], fuel_tank: [1, 52, 13] },
  4: { scanner: [-13, -45, 12], harvester: [34, -35, 15], durability: [-53, -5, 16], fuel_tank: [-13, 52, 13] },
};
export const partAt = (model, id) => (PARTS[model] || PARTS[1])[id] || [0, 0, 12];
export const HOLO = { line: '#97e8f7', hi: '#e4fbff', fill: '#1e4a6a', fill2: '#2f7aa0', seam: '#4c88a9', sel: '#f0be7d', selFill: '#8a5a2a', selFill2: '#c48a48' };
const CYAN = ['#123048', '#1e4a6a', '#2f7aa0', '#62c4ec', '#c8f4ff'], ORANGE = ['#3a2410', '#6a4420', '#a8743a', '#f0be7d', '#ffe8c8'];
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const SHIPIMG = {};
function load(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
export async function loadShips(base = '../assets/v2/ships/') {
  await Promise.all(SHIPS.map(async ({ n }) => { const [big, s] = await Promise.all([load(`${base}ship${n}.png`), load(`${base}ship${n}_s.png`)]); if (big && s) SHIPIMG[n] = { big, s }; }));
  return SHIPS.filter(({ n }) => !SHIPIMG[n]).map(({ n }) => 'ship' + n);
}
const cache = new Map();
function pixels(im) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; }
// 홀로그램 판(배 model, 고른 부위 sel — 없으면 null, white = 강화 순간 번쩍)
function holoCanvas(model, sel = null, white = false) {
  const key = model + '|' + sel + '|' + white; if (cache.has(key)) return cache.get(key);
  const im = SHIPIMG[model].big, w = im.width, h = im.height, d = pixels(im);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'), out = c.createImageData(w, h), o = out.data;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  const lum = (x, y) => { const k = (y * w + x) * 4; return (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255; };
  const reg = sel ? partAt(model, sel) : null, cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!op(x, y)) continue;
    const edge = !op(x + 1, y) || !op(x - 1, y) || !op(x, y + 1) || !op(x, y - 1);
    const inSel = reg && (x - cx - reg[0]) ** 2 + (y - cy - reg[1]) ** 2 <= reg[2] ** 2, ramp = inSel ? ORANGE : CYAN;
    let col;
    if (white) col = '#ffffff';
    else if (edge) col = ramp[3];
    else if ((y & 1) && B4[y & 3][x & 3] > (inSel ? 13 : 10)) continue;   // 홀수 줄 = 주사선(듬성듬성 비침)
    else { const L = lum(x, y); let lv = L < 0.22 ? 0 : L < 0.42 ? 1 : L < 0.62 ? 2 : 3; if (x + 1 < w && op(x + 1, y) && Math.abs(L - lum(x + 1, y)) > 0.22) lv = Math.min(4, lv + 1); col = ramp[lv]; }
    const n = parseInt(col.slice(1), 16), k = (y * w + x) * 4; o[k] = n >> 16; o[k + 1] = (n >> 8) & 255; o[k + 2] = n & 255; o[k + 3] = 255;
  }
  c.putImageData(out, 0, 0);
  cache.set(key, cv); return cv;
}
// 그리기: (cx, cy) = 배 가운데, sc = 배율(1 = 정비 크기), mix = 홀로그램으로 바뀐 정도(0 = 진짜 배, 1 = 홀로그램)
//  opt: model(1~4), sel = 고른 부위, flash = 강화 번쩍 부위, glitch = {y, dx}, small = 지도용 작은 그림, dir = -1 이면 아래 → 위로 훑음
export function drawShip(g, cx, cy, sc, mix, opt = {}) {
  const model = SHIPIMG[opt.model] ? opt.model : 1, P = SHIPIMG[model]; if (!P) return;
  const c = g.c; c.imageSmoothingEnabled = false;
  if (opt.small) { const im = P.s; c.drawImage(im, Math.round(cx - im.width / 2), Math.round(cy - im.height / 2)); return; }
  const im = P.big, w = im.width * sc, h = im.height * sc, x = cx - w / 2, y = cy - h / 2;
  const holo = mix > 0 ? holoCanvas(model, opt.sel || null) : null;
  const put = (src, sy0, sy1) => { if (sy1 <= sy0) return; c.drawImage(src, 0, sy0, im.width, sy1 - sy0, x, y + sy0 * sc, w, (sy1 - sy0) * sc); };
  if (mix <= 0) put(im, 0, im.height);
  else if (mix >= 1) {
    if (opt.glitch) { const gy = Math.max(0, Math.min(im.height - 4, Math.floor(im.height / 2 + opt.glitch.y))); put(holo, 0, gy); c.drawImage(holo, 0, gy, im.width, 4, x + opt.glitch.dx * sc, y + gy * sc, w, 4 * sc); put(holo, gy + 4, im.height); }
    else put(holo, 0, im.height);
    if (opt.flash) { const f = holoCanvas(model, opt.flash, true), r = partAt(model, opt.flash); c.save(); c.beginPath(); c.arc(cx + r[0] * sc, cy + r[1] * sc, r[2] * sc, 0, Math.PI * 2); c.clip(); c.drawImage(f, x, y, w, h); c.restore(); }
  } else {   // 훑는 줄: 지나간 줄 = 홀로그램, 아직 = 진짜 배
    const sy = Math.round((opt.dir === -1 ? 1 - mix : mix) * im.height);
    if (opt.dir === -1) { put(im, 0, sy); put(holo, sy, im.height); } else { put(holo, 0, sy); put(im, sy, im.height); }
    const ly = Math.round(y + sy * sc);
    c.fillStyle = '#e4fbff'; c.fillRect(Math.round(x - 6), ly, Math.round(w + 12), 1);
    c.fillStyle = 'rgba(151,232,247,0.6)'; c.fillRect(Math.round(x - 4), ly + (opt.dir === -1 ? 1 : -1), Math.round(w + 8), 1);
  }
}
