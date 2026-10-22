// 도트 그리기 도구. 좌표는 전부 정수로 내린다 — 반 칸 위치가 생기면 도트가 어긋난다.
import { BAYER4 } from '../art/palette.js';
import { drawText, measure, wrap, lineH } from './text.js';

const VGRAD = new Map();
function vgradRaw(g, x, y, w, h, cols) {
  const n = cols.length, band = h / n, Z = Math.max(2, Math.min(10, Math.floor(band / 2)));
  for (let k = 0; k < n; k++) g.rect(x, Math.round(y + k * band), w, Math.ceil(band) + 1, cols[k]);
  const c = g.c;
  for (let k = 1; k < n; k++) {
    const yy = Math.round(y + k * band);
    c.fillStyle = cols[k];
    for (let j = -Z; j < 0; j++) { // 위 띠 안으로 다음 색이 번져 들어감
      const lvl = Math.round(((j + Z + 1) / (Z + 1)) * 8);
      const Y = yy + j; for (let i = 0; i < w; i++) { const X = x + i; if (BAYER4[Y & 3][X & 3] < lvl) c.fillRect(X, Y, 1, 1); }
    }
    c.fillStyle = cols[k - 1];
    for (let j = 0; j < Z; j++) {
      const lvl = Math.round(((Z - j) / (Z + 1)) * 8);
      const Y = yy + j; for (let i = 0; i < w; i++) { const X = x + i; if (BAYER4[Y & 3][X & 3] < lvl) c.fillRect(X, Y, 1, 1); }
    }
  }
}

export class Gfx {
  constructor(ctx) { this.c = ctx; this.c.imageSmoothingEnabled = false; }
  set ctx(v) { this.c = v; this.c.imageSmoothingEnabled = false; }

  rect(x, y, w, h, col) { if (w <= 0 || h <= 0) return; this.c.fillStyle = col; this.c.fillRect(x | 0, y | 0, w | 0, h | 0); }
  px(x, y, col) { this.c.fillStyle = col; this.c.fillRect(x | 0, y | 0, 1, 1); }
  hline(x, y, w, col) { this.rect(x, y, w, 1, col); }
  vline(x, y, h, col) { this.rect(x, y, 1, h, col); }
  frame(x, y, w, h, col) { this.hline(x, y, w, col); this.hline(x, y + h - 1, w, col); this.vline(x, y, h, col); this.vline(x + w - 1, y, h, col); }

  // 베이어 디더: level 0~16 만큼 colB 점을 colA 위에 섞는다
  dither(x, y, w, h, colB, level) {
    if (level <= 0) return;
    this.c.fillStyle = colB;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = (x | 0) + i, Y = (y | 0) + j;
      if (BAYER4[Y & 3][X & 3] < level) this.c.fillRect(X, Y, 1, 1);
    }
  }
  // 세로 그라데이션: 색 띠 사이를 8칸에 걸쳐 점 밀도를 서서히 바꿔 잇는다(줄무늬가 안 보이게)
  //  발열(2026-10-17 사용자 "게임 발열이 심하다는데"): 장마다 점 수천 개를 찍던 것을 한 번 그려 둔 판으로 — 크기 · 색 · 점무늬 자리(x·y 끝 두 비트)가 같으면 다시 씀
  vgrad(x, y, w, h, cols) {
    const n = cols.length; if (n === 1) return this.rect(x, y, w, h, cols[0]);
    if (typeof document === 'undefined' || !Number.isInteger(x) || !Number.isInteger(y) || w * h > 400000) return vgradRaw(this, x, y, w, h, cols);
    const px = x & 3, py = y & 3, key = w + ',' + h + ',' + px + ',' + py + ',' + cols.join(',');
    let cv = VGRAD.get(key);
    if (!cv) {
      if (VGRAD.size > 48) VGRAD.clear();
      cv = document.createElement('canvas'); cv.width = w + 4; cv.height = h + 8;
      vgradRaw(new Gfx(cv.getContext('2d')), px, py, w, h, cols);
      VGRAD.set(key, cv);
    }
    this.c.drawImage(cv, x - px, y - py);
  }
  // 다각형 채움(정수 주사선 — 가장자리 번짐 없음). pts = [[x,y],...]
  poly(pts, col) {
    const c = this.c; c.fillStyle = col;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let Y = Math.floor(minY); Y <= Math.ceil(maxY); Y++) {
      const yc = Y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) { const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]); if (x1 > x0) c.fillRect(x0, Y, x1 - x0, 1); }
    }
  }
  // 채운 원(도트 원)
  disc(cx, cy, r, col) {
    this.c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
      this.c.fillRect((cx - half) | 0, (cy + dy) | 0, half * 2 + 1, 1);
    }
  }
  ellipse(cx, cy, rx, ry, col) {
    this.c.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) {
      const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.5);
      this.c.fillRect((cx - half) | 0, (cy + dy) | 0, half * 2 + 1, 1);
    }
  }
  ellipseRing(cx, cy, rx, ry, col, dashed = 0) {
    this.c.fillStyle = col;
    const steps = Math.max(24, Math.round((rx + ry) * 3));
    let prev = null, k = 0;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const X = Math.round(cx + Math.cos(a) * rx), Y = Math.round(cy + Math.sin(a) * ry);
      const key = X + ',' + Y; if (key === prev) continue; prev = key; k++;
      if (dashed && (Math.floor(k / dashed) % 2)) continue;
      this.c.fillRect(X, Y, 1, 1);
    }
  }
  line(x0, y0, x1, y1, col) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy; this.c.fillStyle = col;
    for (;;) { this.c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  // 그림 붙이기(정수배 확대만). flip=true면 좌우 반전
  img(im, x, y, scale = 1, flip = false) {
    if (!im) return;
    if (scale === 2 && im.big) { im = im.big; scale = 1; }   // 두 배 자리 = 더 선명한 두 배 그림(코덱스 아이콘 — art/icons.js, 2026-10-22)
    const w = (im.naturalWidth || im.width), h = (im.naturalHeight || im.height);
    const c = this.c; c.imageSmoothingEnabled = false;
    if (flip) { c.save(); c.translate((x | 0) + w * scale, y | 0); c.scale(-1, 1); c.drawImage(im, 0, 0, w * scale, h * scale); c.restore(); }
    else c.drawImage(im, x | 0, y | 0, w * scale, h * scale);
  }
  // 그림을 단색 실루엣으로(도감 미발견용)
  silhouette(im, x, y, col, scale = 1) {
    const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tx = t.getContext('2d'); tx.drawImage(im, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, w, h);
    this.img(t, x, y, scale);
  }
  text(str, x, y, opt) { return drawText(this.c, str, x, y, opt); }
  textW(str, font) { return measure(String(str), font); }
  lineH(font) { return lineH(font); }
  // 여러 줄 글자. 반환 = 쓴 높이
  para(str, x, y, maxW, opt = {}) {
    const f = opt.font || 'body';
    const lh = opt.lh || (lineH(f) + 3);
    const lines = wrap(str, f, maxW);
    lines.forEach((ln, i) => drawText(this.c, ln, opt.align === 'center' ? x + maxW / 2 : x, y + i * lh, opt));
    return lines.length * lh;
  }
  clip(x, y, w, h, fn) { const c = this.c; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); fn(); c.restore(); }
  alpha(a, fn) { const c = this.c; const p = c.globalAlpha; c.globalAlpha = a; fn(); c.globalAlpha = p; }
}

// 오프스크린 캔버스에 그린 뒤 정수배로 확대해 쓰는 "무대 층"(식물이 서 있는 장면은 2배 도트)
export function layer(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = new Gfx(cv.getContext('2d'));
  return { cv, g, w, h };
}
