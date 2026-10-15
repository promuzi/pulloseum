// 전투 공격 효과를 게임 안에서 장마다 그린다 — 영상 굽기 도구(tools/pixel/big/attack.mjs)를 그대로 불러 같은 그림·같은 순서.
// 무대 = 전투 화면 위 270×348(1배): 나 = 가까운 받침(왼쪽 아래), 상대 = 먼 받침(오른쪽 위·좌우 뒤집힘).
// 좌표·깊이 규칙은 tools/pixel/big/stage.mjs·pot3d.mjs·convert.mjs --attack 과 같다(값을 바꾸면 함께).
// 그리는 순서: 무대 → 바닥 층(f) → 먼 화분 뒤 효과 → 먼 식물 → 사이 효과 → 가까운 식물 → 앞 효과 → 공중(o 테두리·p 입자) → 화면 흔들림(장 전체)
import { FRA, impactAt, attackerPose, targetPose, cameraShake, skillFx, statusFx } from '../../../tools/pixel/big/attack.mjs';
import { BIG } from '../art/sprites.js';

export const SW = 270, SH = 348, K = 0.4384, FRAME_MS = 50;
export const SPOTS = { near: [80, 282], far: [186, 156] };   // 받침 가운데 = 화분 굽이 바닥에 닿는 점(무대 좌표)
const BASE = { cx: 48, cy: 96.548, rf: 16.2 }, SOIL_Y = 75.696, INK = '#1a1424';
export { FRA, impactAt };
const onRing = (c, r, phi) => [c[0] + Math.cos(phi) * r, c[1] + Math.sin(phi) * r * K];
function sideAngle(a, b) { const phi = Math.atan2((b[1] - a[1]) / K, b[0] - a[0]); return Math.sin(phi) < 0 ? (Math.cos(phi) >= 0 ? 0 : Math.PI) : phi; }
const spriteAt = b => [Math.round(b[0] - BASE.cx), Math.round(b[1] - BASE.cy)];

// 대상 윗머리 점 셋(그림 좌표): 머리 가운데 ±8칸 세로줄에서 처음 칠해진 칸 — 대기 첫 장(under 층)에서 한 번 재 둔다
const topCache = new Map();
function headTops(key) {
  if (topCache.has(key)) return topCache.get(key);
  const P = BIG[key]; if (!P) return [[40, 20], [48, 20], [56, 20]];
  const m = P.meta, c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
  const x = c.getContext('2d'); x.drawImage(P.sheet, 0, 0, m.w, m.h, 0, 0, m.w, m.h);
  const d = x.getImageData(0, 0, m.w, m.h).data;
  const tops = [-8, 0, 8].map(dx => { const cx = Math.max(0, Math.min(m.w - 1, Math.round(m.head[0] + dx))); let y = 0; while (y < m.h && d[(y * m.w + cx) * 4 + 3] < 128) y++; return [cx, Math.min(y, m.h - 1)]; });
  topCache.set(key, tops); return tops;
}

// 효과 층 그릇: f = 바닥(색 또는 어둡게 곱할 값), u = 바닥에 선 것(깊이 → 화분 앞뒤, 테두리), s = 바닥에 선 부드러운 것, o = 공중 큰 모양(테두리), p = 입자
function newLayers() {
  const f = new Map(), u = [new Map(), new Map(), new Map()], s = [new Map(), new Map(), new Map()], o = new Map(), p = new Map();
  const farY = SPOTS.far[1], nearY = SPOTS.near[1], dep = d => (d < farY ? 0 : d < nearY ? 1 : 2), inS = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH;
  const P = {
    o: (x, y, c) => { if (inS(x, y)) o.set(y * SW + x, c); }, p: (x, y, c) => { if (inS(x, y)) p.set(y * SW + x, c); },
    f: (x, y, c) => { if (inS(x, y)) f.set(y * SW + x, c); },
    u: (x, y, c, d) => { if (inS(x, y)) u[dep(d)].set(y * SW + x, c); }, s: (x, y, c, d) => { if (inS(x, y)) s[dep(d)].set(y * SW + x, c); },
  };
  return { P, f, u, s, o, p };
}

// 공격 한 번: A = 기술 연출(attack.mjs ATTACKS·VARIANTS·WEAPONS 항목), atkKey·tgtKey = 종 키, rev = 상대 → 나
export function makeAttack(A, atkKey, tgtKey, rev, seed = 7) {
  const atk = rev ? SPOTS.far : SPOTS.near, tgt = rev ? SPOTS.near : SPOTS.far, aM = rev, tM = !rev;
  const ma = BIG[atkKey]?.meta, mt = BIG[tgtKey]?.meta;
  const ra = { hx: ma ? ma.head[0] : 48, hy: ma ? ma.head[1] : 30, Rh: ma ? ma.headR : 15 }, rt = { hx: mt ? mt.head[0] : 48, hy: mt ? mt.head[1] : 30 };
  const [AXs, AYs] = spriteAt(atk), [TXs, TYs] = spriteAt(tgt), dirY = Math.sign(tgt[1] - atk[1]);
  const hxOf = (r, M) => (M ? 96 - 1 - r.hx : r.hx);
  const rf = BASE.rf + 3, phiS = sideAngle(atk, tgt), phiE = sideAngle(tgt, atk), S0 = onRing(atk, rf, phiS), E0 = onRing(tgt, rf, phiE);
  const tops = headTops(tgtKey).map(([x, y]) => [TXs + (tM ? 96 - 1 - x : x), TYs + y]);
  const I = impactAt(A), lean = p => (A.move === 'lunge' && p.qx > 0 ? { ...p, qy: p.qy + Math.round(dirY * p.qx * 0.35) } : p);
  const cache = new Map();
  return {
    A, I, frames: FRA, rev,
    frame(f) {
      if (cache.has(f)) return cache.get(f);
      const fz = f === I + 1 ? I : f, pose = lean(attackerPose(fz, A)), tp = targetPose(f, I, A), tqy = Math.round(dirY * tp.kb * 0.35);
      const L = [AXs + hxOf(ra, aM) + (aM ? -pose.qx : pose.qx), AYs + ra.hy + pose.qy];
      const T = [TXs + hxOf(rt, tM) + (tM ? tp.kb : -tp.kb), TYs + rt.hy + tqy - tp.hop], G = TYs + SOIL_Y - tp.hop;
      const dl = Math.hypot(T[0] - L[0], T[1] - L[1]) || 1;
      const S = { D: [(T[0] - L[0]) / dl, (T[1] - L[1]) / dl], fx: Math.sign(T[0] - L[0]) || 1, K, A0: atk, B0: tgt, S0, E0, phiS, phiE, rf, Rh: ra.Rh, soilA: AYs + SOIL_Y };
      const lay = newLayers();
      skillFx(lay.P, A, fz, L, T, G, seed, S);
      statusFx(lay.P, A, f, T, G, tops.map(([x, y]) => [x + (tM ? tp.kb : -tp.kb), y + tqy - tp.hop]), L, seed + 2);
      const out = { lay, atkPose: { qx: pose.qx, qy: pose.qy, sq: pose.sq }, tgtPose: { qx: -tp.kb, qy: tqy, sq: tp.kb ? 0.6 : 0 }, flash: tp.flash, shake: tp.shake, hop: tp.hop, cam: cameraShake(f, A, I) };
      cache.set(f, out);
      return out;
    },
  };
}

// 칸 지도 → 그림판(ImageData 한 번에) → 무대 위치에 붙임. 그림판은 층마다 따로 두고 장이 바뀔 때만 다시 칠한다.
const C32 = new Map();
const c32 = hex => { let v = C32.get(hex); if (v === undefined) { const n = parseInt(hex.slice(1, 7), 16); v = ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; C32.set(hex, v); } return v; };
const boards = new Map();
function board(name) {
  let b = boards.get(name);
  if (!b) { const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; const cx = cv.getContext('2d'); const img = cx.createImageData(SW, SH); b = { cv, cx, img, buf: new Uint32Array(img.data.buffer), key: null }; boards.set(name, b); }
  return b;
}
// 한 장의 효과 층 다섯 판(바닥 · 먼 뒤 · 사이 · 앞 · 공중)을 칠해 둔다(같은 tag면 다시 안 칠함)
//  u·o = 테두리(어두운 1칸) 두른 큰 모양, s·p = 테두리 없는 먼지·입자 — 영상 굽기(convert.mjs --attack)와 같은 순서로 겹침
export function prepareBoards(fr, tag) {
  const L = fr.lay;
  const set = [['floor', [L.f], false, null], ['back', [L.u[0]], true, L.s[0]], ['mid', [L.u[1]], true, L.s[1]], ['front', [L.u[2]], true, L.s[2]], ['air', [L.o], true, L.p]];
  for (const [name, outl, ol, soft] of set) {
    const b = board(name); if (b.key === tag) continue;
    b.buf.fill(0);
    fillInto(b, outl, ol); if (soft) fillInto(b, [soft], false);
    b.cx.putImageData(b.img, 0, 0); b.key = tag;
  }
}
function fillInto(b, maps, outline) {
  for (const m of maps) {
    if (outline) for (const i of m.keys()) { const x = i % SW, y = (i - x) / SW; for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (nx >= 0 && ny >= 0 && nx < SW && ny < SH && !m.has(ny * SW + nx)) b.buf[ny * SW + nx] = c32(INK); }
    for (const [i, c] of m) b.buf[i] = typeof c === 'number' ? ((Math.round((1 - c) * 255) << 24) >>> 0) : c32(c);
  }
}
export const boardCanvas = name => board(name).cv;
