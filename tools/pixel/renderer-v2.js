/* 렌더러 v2 — 형태 레시피는 그대로, 렌더 규칙만 교체.
   1) Resurrect 64 마스터 팔레트로 양자화 + 램프/단 매핑
   2) 광원 좌상단 림 셰이딩 (램프 단 ±1)
   3) selout 3분법: 밑면 검정 / 광원 쪽 색 외곽선(램프 -2) / 그 외 위쪽 램프 0 / 접지면 선 없음
   4) 정리: 고아 픽셀 병합, 외곽선 L자 더블 제거
   전부 48×56 캔버스 위에서 동작. 의존: sprites-data.js (W,H,S,P,R,L,POT,SPR) */
'use strict';

/* ---------- 마스터 팔레트: Resurrect 64 (Kerrie Lake, lospec.com/palette-list/resurrect-64) ---------- */
const RAMPS = {
  fire:   ['#ae2334','#e83b3b','#fb6b1d','#f79617','#f9c22b'],
  water:  ['#323353','#484a77','#4d65b4','#4d9be6','#8fd3ff'],
  grass:  ['#165a4c','#239063','#1ebc73','#91db69','#cddf6c'],
  earth:  ['#7a3045','#9e4539','#cd683d','#e6904e','#fbb954'],
  wind:   ['#45293f','#6b3e75','#905ea9','#a884f3','#eaaded'],
  bolt:   ['#4c3e24','#676633','#a2a947','#d5e04b','#fbff86'],
  ice:    ['#0b5e65','#0b8a8f','#0eaf9b','#30e1b9','#8ff8e2'],
  rock:   ['#313638','#374e4a','#547e64','#92a984','#b2ba90'],
  gray:   ['#2e222f','#3e3546','#625565','#7f708a','#9babb2'],
  light:  ['#625565','#7f708a','#9babb2','#c7dcd0','#ffffff'],
  warm:   ['#3e3546','#694f62','#966c6c','#ab947a','#c7dcd0'],
  red:    ['#6e2727','#b33831','#ea4f36','#f57d4a','#fca790'],
  rose:   ['#753c54','#a24b6f','#cf657f','#ed8099','#fdcbb0'],
  pink:   ['#831c5d','#c32454','#f04f78','#f68181','#fca790']
};
const BLACK = '#2e222f';

/* ---------- 색 공간: sRGB → OKLab (Björn Ottosson) ---------- */
const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
const rgb2hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');
function lin(c){ c /= 255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
function oklab(rgb){
  const r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
  const l = Math.cbrt(0.4122214708*r + 0.5363325363*g + 0.0514459929*b);
  const m = Math.cbrt(0.2119034982*r + 0.6806995451*g + 0.1073969566*b);
  const s = Math.cbrt(0.0883024619*r + 0.2817188376*g + 0.6299787005*b);
  return [0.2104542553*l + 0.7936177850*m - 0.0040720468*s, 1.9779984951*l - 2.4285922050*m + 0.4505937099*s, 0.0259040371*l + 0.7827717662*m - 0.8086757660*s];
}
const PAL = []; // {hex, rgb, lab, ramp, lvl}
for (const [ramp, arr] of Object.entries(RAMPS)) arr.forEach((hex, lvl) => { const rgb = hex2rgb(hex); PAL.push({ hex, rgb, lab: oklab(rgb), ramp, lvl }); });
const PAL_BLACK = { hex: BLACK, rgb: hex2rgb(BLACK), lab: oklab(hex2rgb(BLACK)), ramp: 'gray', lvl: 0 };
function nearest(rgb, hint){
  const lab = oklab(rgb); let best = null, bd = 1e9;
  for (const p of PAL) {
    let d = (p.lab[0]-lab[0])**2 + (p.lab[1]-lab[1])**2 + (p.lab[2]-lab[2])**2;
    if (hint && p.ramp === hint) d *= 0.6;          // 종의 속성 램프를 살짝 우대
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
const rampColor = (ramp, lvl) => { const arr = RAMPS[ramp]; return arr[Math.max(0, Math.min(arr.length-1, lvl))]; };

/* ---------- 1) 팔레트 양자화: 캔버스 → 셀 배열 {ramp,lvl} ---------- */
function quantize(canvas, hint, map){
  const x = canvas.getContext('2d'), d = x.getImageData(0, 0, W, H).data;
  const cells = new Array(W*H).fill(null); const cache = new Map();
  for (let i = 0; i < W*H; i++) {
    const o = i*4; if (d[o+3] < 128) continue;
    const key = (d[o]<<16)|(d[o+1]<<8)|d[o+2];
    let p = cache.get(key);
    if (!p) {
      const hex = rgb2hex([d[o], d[o+1], d[o+2]]);
      const ov = map && map[hex];                                   // 종별 재질 오버라이드(보조 램프): hex → [ramp, lvl]
      p = ov ? { ramp: ov[0], lvl: ov[1] } : nearest([d[o], d[o+1], d[o+2]], hint);
      cache.set(key, p);
    }
    cells[i] = { ramp: p.ramp, lvl: p.lvl };
  }
  return cells;
}
const at = (cells, X, Y) => (X < 0 || Y < 0 || X >= W || Y >= H) ? null : cells[Y*W + X];

/* ---------- 4a) 고아 픽셀 병합 (1픽셀 클러스터 → 다수 이웃색) ---------- */
function mergeOrphans(cells){
  const out = cells.slice();
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const c = at(cells, X, Y); if (!c) continue;
    const nb = [at(cells,X-1,Y), at(cells,X+1,Y), at(cells,X,Y-1), at(cells,X,Y+1)].filter(Boolean);
    if (nb.length < 3) continue;                                   // 가장자리·가는 부위는 건드리지 않음
    const same = nb.some(n => n.ramp === c.ramp && n.lvl === c.lvl); if (same) continue;
    const cnt = new Map(); for (const n of nb) { const k = n.ramp + n.lvl; cnt.set(k, (cnt.get(k)||0) + 1); }
    let bk = null, bc = 0; for (const [k, v] of cnt) if (v > bc) { bc = v; bk = k; }
    if (bc >= 3) out[Y*W + X] = nb.find(n => n.ramp + n.lvl === bk);   // 3면 이상이 같은 색일 때만 (눈·하이라이트 2×2는 무사)
  }
  return out;
}

/* ---------- 2) 광원 좌상단 림 셰이딩 (램프 단 ±1, 외곽선 그리기 전) ---------- */
function rimShade(cells, groundY){
  const out = cells.map(c => c && { ...c });
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const c = at(cells, X, Y); if (!c) continue;
    const up = at(cells, X, Y-1), left = at(cells, X-1, Y), down = at(cells, X, Y+1), right = at(cells, X+1, Y);
    const litEdge = (!up || !left), shadowEdge = (!down && Y < groundY) || !right;
    if (litEdge && !shadowEdge && down && right) out[Y*W+X].lvl = Math.min(4, c.lvl + 1);
    else if (shadowEdge && !litEdge && up && left) out[Y*W+X].lvl = Math.max(0, c.lvl - 1);
  }
  return out;
}

/* ---------- 3) selout 3분법 외곽선 (별도 레이어) ---------- */
function outlineLayer(cells, groundY){
  const ol = new Array(W*H).fill(null);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const c = at(cells, X, Y); if (!c) continue;
    const up = at(cells, X, Y-1), left = at(cells, X-1, Y), down = at(cells, X, Y+1), right = at(cells, X+1, Y);
    const edge = !up || !left || !down || !right; if (!edge) continue;
    if (Y >= groundY && !down) continue;                         // 접지면: 선 없음
    if (!down) { ol[Y*W+X] = BLACK; continue; }                  // 밑면 = 검정
    if (!up || !left) { ol[Y*W+X] = rampColor(c.ramp, c.lvl - 2); continue; } // 광원 쪽 = 같은 계열 두 단 아래
    ol[Y*W+X] = rampColor(c.ramp, 0);                            // 오른쪽(그늘 쪽) = 램프 최암
  }
  return ol;
}

/* ---------- 4b) 외곽선 L자 더블 제거 (pixel-perfect) ---------- */
function removeDoubles(ol){
  const out = ol.slice();
  const has = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && !!ol[Y*W+X];
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    if (!ol[Y*W+X]) continue;
    const l = has(X-1,Y), r = has(X+1,Y), u = has(X,Y-1), d = has(X,Y+1);
    // 가로 이웃 하나 + 세로 이웃 하나만 있고 그 둘이 대각으로 이어지면(ㄱ자 모서리) 이 픽셀은 더블 → 제거
    if ((l ^ r) && (u ^ d)) { const dx = l ? -1 : 1, dy = u ? -1 : 1; if (has(X+dx, Y+dy)) out[Y*W+X] = null; }
  }
  return out;
}

/* ---------- 합성 ---------- */
function compose(cells, ol){
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const img = x.createImageData(W, H), p = img.data;
  for (let i = 0; i < W*H; i++) {
    const hex = ol[i] || (cells[i] && rampColor(cells[i].ramp, cells[i].lvl)); if (!hex) continue;
    const rgb = hex2rgb(hex); p[i*4] = rgb[0]; p[i*4+1] = rgb[1]; p[i*4+2] = rgb[2]; p[i*4+3] = 255;
  }
  x.putImageData(img, 0, 0); return c;
}

/* 파이프라인: 래스터 캔버스 → v2 캔버스. opts: {hint, groundY, rim, outline, clean} */
function renderV2(canvas, opts){
  opts = Object.assign({ hint: null, map: null, groundY: 37, rim: true, outline: true, clean: true }, opts || {});
  let cells = quantize(canvas, opts.hint, opts.map);
  if (opts.clean) cells = mergeOrphans(cells);
  if (opts.rim) cells = rimShade(cells, opts.groundY);
  let ol = opts.outline ? outlineLayer(cells, opts.groundY) : new Array(W*H).fill(null);
  if (opts.clean) ol = removeDoubles(ol);
  return compose(cells, ol);
}
/* 사용된 램프 목록 (팔레트 스트립 표시용) */
function usedRamps(canvas, hint, map){
  const cells = quantize(canvas, hint, map); const m = new Map();
  for (const c of cells) if (c) m.set(c.ramp, (m.get(c.ramp)||0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
}
