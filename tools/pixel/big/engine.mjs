// 큰 판(96×112) 식물 도트 엔진 — 메카 괴수 생성기
// (C:\dev\mecha-haran\proto\cockpit\shared\tools\make_sprites_big.py 의 Sprite·Layer)를 그대로 옮긴 것.
// 순서: 층마다 모양 높이 → 법선 → 왼쪽 위 앞 빛 → 명암 4단(+베이어 점무늬) → 앞 층이 오른쪽 아래로 드리우는 그림자
//       → 무늬 → 외곽선 → 직접 찍는 점. 색은 층마다 램프 5색 [0 외곽선, 1 그늘, 2 중간, 3 밝음, 4 가장 밝음].
// 외곽선은 풀로세움 렌더러 v2 규칙(selout 3분법): 밑면 = 잉크, 빛 쪽 = 같은 램프 두 단 아래, 그 외 = 램프 0, 땅에 닿는 면 = 선 없음.
// 난수를 쓰지 않으므로 다시 돌리면 같은 그림이 나온다.
import { deflateSync, inflateSync } from 'node:zlib';

const norm = v => { const n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; };
export const LIGHT = norm([-0.6, -0.8, 0.75]);              // 왼쪽 위 앞에서 오는 빛
export const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
export const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const CAST = [[-1, -1], [-1, -2], [-2, -2], [-2, -3], [-3, -3]];  // 앞 층이 오른쪽 아래로 드리우는 그림자 거리
export const INK = '#2e222f';                               // 밑면 외곽선(팔레트 가장 어두운 색)

// ── 모양: f(px, py) → 높이(안) 또는 null(밖). bb = [x0, y0, x1, y1] (경계 상자 — 빠르게)
function prim(f, bb) {
  const g = (px, py) => (px < bb[0] || px > bb[2] || py < bb[1] || py > bb[3]) ? null : f(px, py);
  g.bb = bb;
  return g;
}

export function ellipse(cx, cy, rx, ry, { rot = 0, hz = Math.min(rx, ry) } = {}) {
  const c = Math.cos(rot), s = Math.sin(rot), r = Math.max(rx, ry);
  return prim((px, py) => {
    const dx = px - cx, dy = py - cy;
    const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, r2 = u * u + v * v;
    return r2 > 1 ? null : hz * Math.sqrt(1 - r2);
  }, [cx - r, cy - r, cx + r, cy + r]);
}

// 굵기가 변하는 관(점들 + 반지름들)
export function limb(pts, radii, { hz = 1 } = {}) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], radii[i], radii[i + 1]]);
  const m = Math.max(...radii), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return prim((px, py) => {
    let best = null;
    for (const [ax, ay, bx, by, ra, rb] of segs) {
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
      const d = Math.hypot(px - (ax + vx * t), py - (ay + vy * t)), r = ra + (rb - ra) * t;
      if (d <= r) { const h = Math.sqrt(Math.max(0, r * r - d * d)) * hz; if (best === null || h > best) best = h; }
    }
    return best;
  }, [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m]);
}

function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
function insidePoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < xi + (py - yi) * (xj - xi) / (yj - yi)) inside = !inside;
  }
  return inside;
}
// 다각형 판(가장자리만 둥글게 깎임)
export function poly(pts, { hz = 3, bev = 2 } = {}) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return prim((px, py) => {
    if (!insidePoly(px, py, pts)) return null;
    let d = Infinity;
    for (let i = 0; i < pts.length; i++) { const a = pts[(i + pts.length - 1) % pts.length], b = pts[i]; d = Math.min(d, segDist(px, py, a[0], a[1], b[0], b[1])); }
    return hz * Math.sqrt(Math.min(1, d / bev));
  }, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
}

// 평면 조각(결정 면처럼 한 면이 한 방향만 보게): h = h0 + g·(p − ref)
export function plane(pts, { h0 = 4, g = [0, 0], ref = pts[0] } = {}) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return prim((px, py) => insidePoly(px, py, pts) ? Math.max(0.05, h0 + g[0] * (px - ref[0]) + g[1] * (py - ref[1])) : null,
    [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
}

// 직사각형(같은 높이) — 주로 도려내기용
export function box(x0, y0, x1, y1, h = 1) { return prim(() => h, [x0, y0, x1, y1]); }

// 골 진 기둥(선인장): limb 와 같은 관인데, 둘레 각도에 따라 높이가 오르내려 세로 골·등성이가 생긴다.
// ribs = 앞에서 보이는 등성이 수, amp = 골 깊이(0~1). 돌려주는 모양의 ridges(n) = 등성이 각도(라디안) 목록
export function ribbed(pts, radii, { ribs = 5, amp = 0.25, hz = 1 } = {}) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], radii[i], radii[i + 1]]);
  const m = Math.max(...radii), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const f = prim((px, py) => {
    let best = null;
    for (const [ax, ay, bx, by, ra, rb] of segs) {
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
      const qx = ax + vx * t, qy = ay + vy * t, d = Math.hypot(px - qx, py - qy), r = ra + (rb - ra) * t;
      if (d > r) continue;
      const side = vx * (py - ay) - vy * (px - ax) >= 0 ? 1 : -1, th = Math.asin(Math.min(1, d / r)) * side;
      const h = Math.sqrt(Math.max(0, r * r - d * d)) * hz * (1 - amp * 0.5 * (1 - Math.cos(2 * ribs * th)));
      if (best === null || h > best) best = h;
    }
    return best;
  }, [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m]);
  f.ribs = ribs;
  return f;
}

// 골 진 공·통(통 선인장): 타원체에 세로 골. 등성이는 둘레 각도로 정해져 몸 윤곽을 따라 휜다.
export function ribBall(cx, cy, rx, ry, { ribs = 6, amp = 0.3, hz = rx } = {}) {
  return prim((px, py) => {
    const u = (px - cx) / rx, v = (py - cy) / ry, q = 1 - v * v, r2 = u * u + v * v;
    if (r2 > 1 || q <= 0) return null;
    const th = Math.asin(Math.max(-1, Math.min(1, u / Math.sqrt(q))));
    return hz * Math.sqrt(1 - r2) * (1 - amp * 0.5 * (1 - Math.cos(2 * ribs * th)));
  }, [cx - rx, cy - ry, cx + rx, cy + ry]);
}

// 세로 원통(위아래 반폭이 다른 화분 몸통 등)
export function taper(cx, y0, y1, w0, w1, { hz = 10 } = {}) {
  const r = Math.max(w0, w1);
  return prim((px, py) => {
    if (py < y0 || py > y1) return null;
    const w = w0 + (w1 - w0) * (py - y0) / (y1 - y0), u = (px - cx) / w;
    return Math.abs(u) > 1 ? null : hz * Math.sqrt(1 - u * u);
  }, [cx - r, y0, cx + r, y1]);
}

// 2차 베지어 곡선 위의 점들(a 시작, c 당기는 점, b 끝)
export function bez(a, c, b, n = 20) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

// 잎몸: 가운데 선(밑 → 끝 점들) + 반폭 함수 wfn(t), t = 0(밑)~1(끝).
// fold = 가운데 잎맥에서 접힌 정도(0 둥근 등, 1 지붕처럼 꺾임 — 한쪽은 빛, 한쪽은 그늘), teeth·serr = 톱니 수·깊이(끝 쪽을 향함)
// 돌려주는 모양에 uv(px, py) → [t, 옆 거리(부호)], width(t) 가 붙어 있어 잎맥 무늬가 같은 좌표를 쓴다.
export function blade(pts, wfn, { hz = 3, fold = 0.6, teeth = 0, serr = 0, toff = 0 } = {}) {
  const segs = [];
  let L = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay);
    segs.push([ax, ay, bx, by, len, L]);
    L += len;
  }
  const uv = (px, py) => {
    let best = Infinity, bt = 0, bd = 0;
    for (const [ax, ay, bx, by, len, l0] of segs) {
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
      const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
      const d = Math.hypot(px - (ax + vx * u), py - (ay + vy * u));
      if (d < best) { best = d; bt = (l0 + u * len) / L; bd = (vx * (py - ay) - vy * (px - ax) >= 0 ? 1 : -1) * d; }
    }
    return [bt, bd];
  };
  const width = t => {
    let w = wfn(t);
    if (teeth && t > 0.06 && t < 0.94) w *= 1 - serr * (1 - (((t * teeth - toff) % 1) + 1) % 1);   // toff 를 시간에 따라 올리면 톱니(불 혀)가 끝 쪽으로 기어오른다
    return w;
  };
  let wm = 0;
  for (let i = 0; i <= 40; i++) wm = Math.max(wm, wfn(i / 40));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const f = prim((px, py) => {
    const [t, d] = uv(px, py), w = width(t);
    if (w < 0.35 || Math.abs(d) > w) return null;
    const s = Math.abs(d) / w;
    return Math.max(0.001, hz * ((1 - fold) * Math.sqrt(1 - s * s) + fold * (1 - s)));
  }, [Math.min(...xs) - wm, Math.min(...ys) - wm, Math.max(...xs) + wm, Math.max(...ys) + wm]);
  // 잎 좌표 → 판 좌표: t 자리에서 옆으로 s(−1~1, 부호는 uv 와 같음) × 반폭만큼
  const at = (t, s = 0) => {
    const l = Math.max(0, Math.min(1, t)) * L;
    let seg = segs[segs.length - 1];
    for (const sg of segs) if (l <= sg[5] + sg[4]) { seg = sg; break; }
    const [ax, ay, bx, by, len, l0] = seg, u = len ? (l - l0) / len : 0, w = s ? width(t) * s : 0;
    return [ax + (bx - ax) * u - (by - ay) / len * w, ay + (by - ay) * u + (bx - ax) / len * w];
  };
  f.uv = uv;
  f.at = at;
  f.width = width;
  f.L = L;
  return f;
}

// a → b 한 칸 굵기 선이 지나는 칸들
export function linePx(a, b) {
  let x0 = Math.round(a[0]), y0 = Math.round(a[1]);
  const x1 = Math.round(b[0]), y1 = Math.round(b[1]);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, out = [];
  let err = dx + dy;
  for (;;) {
    out.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ── 층
export class Layer {
  constructor(name, z, o = {}) {
    Object.assign(this, {
      name, z, group: name, ramp: null,
      amb: 0.30, dif: 0.78, th: [0.38, 0.58, 0.82], spec: null, dither: 0, bias: 0,
      outlineIn: true, outlineOut: true, casts: true, vgrad: 0, relief: 1, smooth: 1, rim: 0,
      emissive: null, thin: 0, thick: 10,
      lip: 0,   // 0이 아니면: 뒤 층과 맞닿은 위·왼쪽 가장자리를 이 명암 단으로(말린 꽃잎 끝처럼 밝게)
    }, o);
    this.prims = [];
    this.cuts = [];
  }
  add(p) { if (p) this.prims.push(p); return this; }
  cut(p) { if (p) this.cuts.push(p); return this; }
}

export class Sprite {
  constructor(w, h, { ground = h } = {}) {
    this.w = w; this.h = h; this.ground = ground;
    this.layers = [];
    this.patterns = [];   // (x, y, 층이름, tone) → tone — 외곽선 전에 명암을 바꾼다
    this.paints = [];     // [x, y, 색(hex) 또는 null=지움] — 맨 마지막에 직접 찍는다
  }
  layer(name, o = {}) {
    const old = this.layers.find(l => l.name === name);
    if (old) return old;
    const l = new Layer(name, this.layers.length, o);
    this.layers.push(l);
    return l;
  }
  // 직접 찍기. mask(층 번호)를 주면 그 층 위나 빈칸에만 찍는다(앞의 다른 층은 덮지 않음)
  paint(pts, color, mask) { for (const [x, y] of pts) this.paints.push([Math.round(x), Math.round(y), color, mask]); }
  rect(x, y, w, h, color, mask) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.paints.push([x + i, y + j, color, mask]); }
  line(a, b, color, mask) { for (const [x, y] of linePx(a, b)) this.paints.push([x, y, color, mask]); }

  // → { lid: 층 번호(-1 빈칸), tone: 명암 1~4, ok: 외곽선 종류 }
  // ok: 0 없음, 1 안쪽 경계(램프 0), 2 밑면(잉크), 3 빛 쪽 실루엣, 4 그늘 쪽 실루엣, 5 말린 끝(층 lip 단)
  render() {
    const W = this.w, H = this.h, N = W * H, layers = this.layers;
    const lid = new Int16Array(N).fill(-1), tone = new Int8Array(N).fill(-1);
    for (const lay of layers) {
      if (!lay.prims.length) continue;
      const x0 = Math.max(0, Math.floor(Math.min(...lay.prims.map(p => p.bb[0]))));
      const y0 = Math.max(0, Math.floor(Math.min(...lay.prims.map(p => p.bb[1]))));
      const x1 = Math.min(W - 1, Math.ceil(Math.max(...lay.prims.map(p => p.bb[2]))));
      const y1 = Math.min(H - 1, Math.ceil(Math.max(...lay.prims.map(p => p.bb[3]))));
      const hm = new Map(), k = lay.smooth;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        if (lay.cuts.length && lay.cuts.some(c => c(px, py) !== null)) continue;
        if (lay.skip && lay.skip.has(y * W + x)) continue;   // 점무늬로 비우는 칸(안개 등) — 뒤 층이 비친다
        let m = -Infinity, n = 0;
        const hs = [];
        for (const p of lay.prims) { const v = p(px, py); if (v !== null) { hs.push(v); if (v > m) m = v; n++; } }
        if (!n) continue;
        let sum = 0;
        for (const v of hs) sum += Math.exp((v - m) / k);
        hm.set(y * W + x, m + k * Math.log(sum));   // 겹친 모양은 부드럽게 합친다
      }
      const g = (x, y) => hm.get(y * W + x) ?? 0;
      for (const [i, hv] of hm) {
        const x = i % W, y = (i - x) / W;
        let t;
        if (lay.emissive) t = lay.emissive(x, y);
        else {
          const gx = (g(x + 1, y) - g(x - 1, y)) * 0.5 * lay.relief, gy = (g(x, y + 1) - g(x, y - 1)) * 0.5 * lay.relief;
          const n = norm([-gx, -gy, 1]);
          const lam = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
          let s = lay.amb + lay.dif * Math.max(0, lam) + lay.bias - lay.vgrad * (y / H);
          if (lay.rim) s += lay.rim * Math.max(0, n[0] * 0.6 + n[1] * 0.8);
          if (lay.thin) s += lay.thin * (1 - Math.min(1, hv / lay.thick));
          if (lay.dither) s += (BAYER4[y % 4][x % 4] / 16 - 0.47) * lay.dither;
          t = 1;
          for (const th of lay.th) if (s > th) t++;
          if (lay.spec) {
            const sp = Math.max(0, n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2]) ** lay.spec[0];
            if (sp > lay.spec[1]) t = 4;
          }
        }
        lid[i] = lay.z;
        tone[i] = t;
      }
    }
    // 그림자: 왼쪽 위의 앞 층(다른 무리)이 오른쪽 아래로 드리운다
    const sh = tone.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, j = lid[i];
      if (j < 0 || layers[j].emissive) continue;
      for (const [ox, oy] of CAST) {
        const qx = x + ox, qy = y + oy;
        if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue;
        const q = lid[qy * W + qx];
        if (q > j && layers[q].casts && layers[q].group !== layers[j].group) { sh[i] = Math.max(1, tone[i] - 1); break; }
      }
    }
    tone.set(sh);
    // 무늬
    for (const fn of this.patterns) for (let i = 0; i < N; i++) if (lid[i] >= 0) tone[i] = fn(i % W, (i - i % W) / W, layers[lid[i]].name, tone[i]);
    // 외곽선
    const ok = new Uint8Array(N);
    const empty = (x, y) => x < 0 || y < 0 || x >= W || y >= H || lid[y * W + x] < 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, j = lid[i];
      if (j < 0) continue;
      const L = layers[j];
      const eU = empty(x, y - 1), eL = empty(x - 1, y), eD = empty(x, y + 1), eR = empty(x + 1, y);
      if (eU || eL || eD || eR) {
        if (L.emissive || !L.outlineOut) continue;
        if (eD && y >= this.ground) continue;                 // 땅에 닿는 면 = 선 없음
        ok[i] = eD ? 2 : (eU || eL) ? 3 : 4;
        continue;
      }
      if (!L.outlineIn) continue;
      for (const [ox, oy, lit] of [[0, -1, true], [-1, 0, true], [0, 1, false], [1, 0, false]]) {
        const q = lid[(y + oy) * W + x + ox];
        if (q < j && layers[q].group !== L.group) { ok[i] = L.lip && lit ? 5 : 1; break; }
      }
    }
    // 실루엣 외곽선의 ㄱ자 겹침(2×2 덩어리) 한 칸 빼기
    const sil = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ok[y * W + x] >= 2 && ok[y * W + x] <= 4;
    const drop = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!sil(x, y)) continue;
      const l = sil(x - 1, y), r = sil(x + 1, y), u = sil(x, y - 1), d = sil(x, y + 1);
      if ((l !== r) && (u !== d) && sil(x + (l ? -1 : 1), y + (u ? -1 : 1))) drop.push(y * W + x);
    }
    for (const i of drop) ok[i] = 0;
    return { lid, tone, ok };
  }
}

// ── 색 공간: sRGB ↔ OKLab(Björn Ottosson) — 파스텔 변환용
const toLin = c => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toByte = c => Math.round(255 * Math.max(0, Math.min(1, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));
export function oklab(hex) {
  const [r, g, b] = [1, 3, 5].map(i => toLin(parseInt(hex.slice(i, i + 2), 16)));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export function fromOklab(L, A, B) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return '#' + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map(c => toByte(c).toString(16).padStart(2, '0')).join('');
}
const labToLin = (L, A, B) => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
// OKLCH(밝기 L, 채도 C, 색상 h도) → hex. 화면에 못 내는 색이면 채도를 줄여 맞춘다
export function oklch(L, C, h) {
  const r = h * Math.PI / 180;
  for (let k = 0; k < 40; k++, C *= 0.93) {
    const lin = labToLin(L, C * Math.cos(r), C * Math.sin(r));
    if (lin.every(v => v >= -0.0005 && v <= 1.0005) || k === 39) return '#' + lin.map(c => toByte(c).toString(16).padStart(2, '0')).join('');
  }
}
// 색조를 돌리며 만드는 램프(인디 도트식 hue shifting) — [외곽선, 그늘, 중간, 밝음, 가장 밝음]
// 어두운 단은 차가운 쪽(cool, 파랑·보라)으로, 밝은 단은 따뜻한 쪽(warm, 노랑)으로 색상이 돌고,
// 그늘은 채도를 살짝 올려 탁해지지 않게, 가장 밝은 단은 채도를 내려 따뜻한 흰빛으로. h = 바탕 색상(도), c = 채도(0.05~0.2)
export function hueRamp(h, c, { L = [0.31, 0.46, 0.61, 0.75, 0.88], cool = 270, warm = 88, shift = [30, 17, 0, 11, 22], cs = [0.8, 1.1, 1, 0.82, 0.55] } = {}) {
  const toward = (a, b, d) => { const df = ((b - a + 540) % 360) - 180; return a + Math.sign(df) * Math.min(Math.abs(df), d); };
  return L.map((l, i) => oklch(l, c * cs[i], i < 2 ? toward(h, cool, shift[i]) : i > 2 ? toward(h, warm, shift[i]) : h));
}
// 씨앗 난수(같은 씨앗 = 같은 수열) — 프레임마다 다른 번개 모양 등
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 고리 시간 흔들림: 한 바퀴(t 0→1)에 k번, 위상 ph
export const sway = (t, amp, ph = 0, k = 1) => amp * Math.sin(2 * Math.PI * (k * t + ph));

// 파스텔: 밝기를 위로 모으고(lift + keep × L) 채도를 줄인다(sat, 상한 cmax). 색상(hue)은 그대로.
export function pastelizer({ lift = 0.36, keep = 0.64, sat = 0.62, cmax = 0.11 } = {}) {
  const cache = new Map();
  return hex => {
    if (!hex) return hex;
    if (!cache.has(hex)) {
      const [L, A, B] = oklab(hex), C = Math.hypot(A, B), h = Math.atan2(B, A), C2 = Math.min(C * sat, cmax);
      cache.set(hex, fromOklab(lift + keep * L, C2 * Math.cos(h), C2 * Math.sin(h)));
    }
    return cache.get(hex);
  };
}
// 이미 그린 그림판의 색을 통째로 바꾼다(화분 등)
export function mapImg(im, fn) {
  const out = new Img(im.w, im.h);
  for (let i = 0; i < im.w * im.h; i++) {
    const k = i * 4;
    if (im.data[k + 3] < 128) continue;
    out.set(i % im.w, (i - i % im.w) / im.w, fn('#' + [0, 1, 2].map(j => im.data[k + j].toString(16).padStart(2, '0')).join('')));
  }
  return out;
}

// 렌더 결과 → 칸마다 색(hex) 또는 null. selout=false 면 실루엣도 전부 램프 0(메카식 진한 외곽선).
// map = 색 바꾸기(파스텔 등), keepMap = sp.keep 칸(눈)에 쓸 바꾸기
export function colorize(sp, r, { selout = true, map = null, keepMap = null } = {}) {
  const W = sp.w, H = sp.h, out = new Array(W * H).fill(null);
  for (let i = 0; i < W * H; i++) {
    const j = r.lid[i];
    if (j < 0) continue;
    const L = sp.layers[j], ramp = L.ramp, t = r.tone[i];
    let c;
    switch (r.ok[i]) {
      case 0: c = ramp[t]; break;
      case 1: c = ramp[0]; break;
      case 2: c = selout ? INK : ramp[0]; break;
      case 3: c = selout ? ramp[Math.max(0, t - 2)] : ramp[0]; break;
      case 4: c = ramp[0]; break;
      case 5: c = ramp[L.lip]; break;
    }
    out[i] = c;
  }
  for (const [x, y, c, m] of sp.paints) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x;
    if (m !== undefined && r.lid[i] >= 0 && r.lid[i] !== m) continue;
    out[i] = c;
  }
  if (map) for (let i = 0; i < out.length; i++) if (out[i]) out[i] = (sp.keep && sp.keep.has(i) ? keepMap || map : map)(out[i]);
  return out;
}

// ── 그림판(RGBA) — PNG 읽기·쓰기, 정수배 붙이기
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export class Img {
  constructor(w, h, bg = null) {
    this.w = w; this.h = h; this.data = new Uint8Array(w * h * 4);
    if (bg) this.fill(0, 0, w, h, bg);
  }
  static fromColors(w, h, cols) {
    const im = new Img(w, h);
    cols.forEach((c, i) => { if (c) im.set(i % w, (i - i % w) / w, c); });
    return im;
  }
  set(x, y, hex, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hexRgb(hex), k = (y * this.w + x) * 4;
    this.data[k] = r; this.data[k + 1] = g; this.data[k + 2] = b; this.data[k + 3] = a;
  }
  fill(x, y, w, h, hex) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex); }
  // 불투명 칸만 s배로 붙인다(tint 를 주면 그 색 한 가지로 — 실루엣)
  blit(src, x, y, s = 1, tint = null) {
    const t = tint && hexRgb(tint);
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const k = (j * src.w + i) * 4;
      if (src.data[k + 3] < 128) continue;
      for (let v = 0; v < s; v++) for (let u = 0; u < s; u++) {
        const X = x + i * s + u, Y = y + j * s + v;
        if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
        const o = (Y * this.w + X) * 4;
        this.data[o] = t ? t[0] : src.data[k]; this.data[o + 1] = t ? t[1] : src.data[k + 1]; this.data[o + 2] = t ? t[2] : src.data[k + 2]; this.data[o + 3] = 255;
      }
    }
  }
  png() { return encodePNG(this.w, this.h, this.data); }
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h), src = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < h; y++) src.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// 8비트 RGB·RGBA·팔레트, 비인터레이스 PNG만 읽는다(옛 48×56 비교용)
export function decodePNG(buf) {
  let p = 8, w = 0, h = 0, ct = 0, plte = null, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12]) throw new Error('8비트 비인터레이스 PNG만 읽음'); }
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = { 6: 4, 2: 3, 3: 1 }[ct];
  if (!bpp) throw new Error('지원 안 하는 PNG 색 형식 ' + ct);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, im = new Img(w, h);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (ct === 3) { const k = cur[x]; im.data[o] = plte[k * 3]; im.data[o + 1] = plte[k * 3 + 1]; im.data[o + 2] = plte[k * 3 + 2]; im.data[o + 3] = trns && k < trns.length ? trns[k] : 255; }
      else { im.data[o] = cur[x * bpp]; im.data[o + 1] = cur[x * bpp + 1]; im.data[o + 2] = cur[x * bpp + 2]; im.data[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    }
    prev = cur;
  }
  return im;
}
