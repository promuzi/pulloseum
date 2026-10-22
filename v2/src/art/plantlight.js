// 게임에서 식물에 빛 입히기(계산 = art/light.js) — 2026-10-22 사용자 "상태이상, 각 스킬의 공격, 게임 시작과 대기실의 윗 조명, 스마트팜 등 다양하게 …
//  어디까지 할 수 있을지 알아보고 게임용량과 성능에 문제 없는 선에서 준비해봐"
//  파일을 더 받지 않음: 장마다 면 방향을 그림에서 바로 계산해 모아 둠(식물 하나 장 68개 Int8 ≈ 2.2MB) · 계산은 한 화면(16ms)에 LIGHT.budget ms 까지만 —
//   넘으면 가까운 장(±4)의 면 방향을 빌려 씀(대기 동작은 장끼리 거의 같은 자세)
//  빛 결과는 그린 자리(종 · 뒤집기 · id)마다 한 장씩 두고 장 · 빛이 바뀔 때만 다시 칠함 — 빛도 스스로 빛도 없는 식물은 계산 0(원래 판 그대로)
//  opt.light = { amb(어둠 — 1 = 그대로 · 숫자 또는 [r, g, b]), lights([{ x, y, z, r, c: [r, g, b], I }] 그 식물을 그리는 캔버스 좌표), self(스스로 빛 보이는 정도 — 기본 낮 0.35),
//   id(같은 종을 두 자리에 그릴 때 나눔) } · false = 빛 안 씀(얼굴 사진 등)
import { normalsOf, emitOf, steadyOf, spotsOf, selfLights, shadeInto } from './light.js';
import { LIGHT_RULES } from './lightRules.js';
import { shinyKey } from './shiny.js';

export const LIGHT = { on: true, budget: 5, spent: 0, win: 0, made: 0, lit: 0 };
try { if (new URLSearchParams(location.search).get('light') === '0' || localStorage.getItem('pullo.light') === '0') LIGHT.on = false; } catch {}   // ?light=0 = 끔(성능 비교 · 문제 생길 때)
try { globalThis.__light = LIGHT; } catch {}   // 촬영 · 성능 도구가 예산을 바꾸거나 셈을 읽음(tools/shots/lightclip.mjs)
const W = 96, H = 112, N = W * H;
const speciesOf = k => k.replace(/~.*$/, '').replace(/_(young|teen)$/, '');
export const hasSelfLight = key => !!LIGHT_RULES[speciesOf(key)];

// 판 한 장의 under · over 칸(96×224 를 한 번에 읽음)
let rcv = null, rcx = null;
const scratch = () => { if (!rcv) { rcv = document.createElement('canvas'); rcv.width = W; rcv.height = H * 2; rcx = rcv.getContext('2d', { willReadFrequently: true }); } };
function pixels(sheet, m, f) {
  scratch();
  const sx = (f % m.cols) * m.w, sy = Math.floor(f / m.cols) * m.h;
  rcx.clearRect(0, 0, W, H * 2);
  rcx.drawImage(sheet, sx, sy, W, H, 0, 0, W, H);
  rcx.drawImage(sheet, sx, sy + m.rows * m.h, W, H, 0, H, W, H);
  const d = rcx.getImageData(0, 0, W, H * 2).data;
  return [d.subarray(0, N * 4), d.subarray(N * 4)];
}
// 앞 층이 위로 오게 합침
function merge(u, o) {
  const a = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N * 4; i += 4) { const s = o[i + 3] >= 128 ? o : u; if (s[i + 3] >= 128) { a[i] = s[i]; a[i + 1] = s[i + 1]; a[i + 2] = s[i + 2]; a[i + 3] = 255; } }
  return a;
}

// 그림 키마다 장별 { nm(Int8 면 방향), emit(빛나는 칸 — 스스로 빛 종만), spots(빛 자리) }
const DATA = new Map();
function frameData(key, P, f, baseP) {
  const m = P.meta;
  if (m.blinkIndex != null && f >= m.blinkIndex) f = m.blinkAt + (f - m.blinkIndex);   // 깜빡임 장 = 같은 자세 대기 장의 면 방향
  let D = DATA.get(key);
  if (!D) { const R = LIGHT_RULES[speciesOf(key)]; DATA.set(key, (D = { rules: R ? R.emit : null, fr: [] })); }
  if (D.fr[f]) return D.fr[f];
  const now = performance.now(); if (now - LIGHT.win > 16) { LIGHT.win = now; LIGHT.spent = 0; }
  if (LIGHT.spent > LIGHT.budget) { for (let d = 1; d <= 4; d++) { const a = D.fr[(f - d + m.frames) % m.frames] || D.fr[(f + d) % m.frames]; if (a) return a; } return null; }
  const [u, o] = pixels(P.sheet, m, f), all = merge(u, o), nf = normalsOf(all, W, H), nm = new Int8Array(N * 3);
  for (let i = 0; i < N * 3; i += 3) { if (!nf[i + 2]) continue; nm[i] = Math.round(nf[i] * 127); nm[i + 1] = Math.round(nf[i + 1] * 127); nm[i + 2] = Math.max(1, Math.round(nf[i + 2] * 127)); }
  let emit = null, spots = [];
  if (D.rules) {
    // 색 변종은 원래 그림에서 빛나는 칸을 찾음(같은 자리) — 빛 색만 색 변종 그림에서(파란 불 → 파란 빛)
    const ref = baseP ? baseP.sheet : P.sheet;
    // 번개 · 마법(tr) = 늘 밝은 무늬를 빼고 새로 나온 칸만: 대기 장 8개로 한 번 잼
    if (D.steady === undefined) D.steady = D.rules.some(r => r.tr) ? steadyOf(Array.from({ length: 8 }, (_, k) => merge(...pixels(ref, m, k * 8))), W, H, D.rules) : null;
    emit = emitOf(baseP ? merge(...pixels(ref, m, f)) : all, W, H, D.rules, null, D.steady);
    spots = spotsOf(all, emit, W, H, D.rules);
  }
  LIGHT.spent += performance.now() - now; LIGHT.made++;
  return (D.fr[f] = { nm, emit, spots });
}

// 그린 자리마다 빛 결과 한 장(96×224: 위 under · 아래 over)
const INST = new Map(), SRC = new WeakMap();
let srcN = 0;
const srcId = s => { let v = SRC.get(s); if (!v) SRC.set(s, (v = ++srcN)); return v; };
// key = 그림 키 · P = 큰 판(bigOf) · src = 실제로 그리는 판(흙 덮기를 걷은 판 등) · f = 장 · (x, y) = 판 왼쪽 위(그리는 캔버스 좌표) · flip = 좌우 뒤집기
//  → null(빛 없음 = 원래 판) 또는 { cv } (under = 0 줄 · over = 112 줄)
export function litPlant(key, P, src, f, x, y, flip, light, baseP = null) {
  if (!LIGHT.on || light === false || typeof document === 'undefined') return null;
  const L = light || {}, amb = L.amb ?? 1, self = L.self ?? 0.35, m = P.meta;
  const sk = shinyKey(key), rules = LIGHT_RULES[speciesOf(key)];
  // 캔버스 좌표 빛 → 판 좌표(뒤집기 반영) · 멀어서 안 닿는 빛은 뺌
  const sl = [];
  for (const q of L.lights || []) {
    if (!(q.I > 0.01)) continue;
    const lx = flip ? x + m.w - 1 - q.x : q.x - x, ly = q.y - y, rr = (q.r || 30) * 2.5;
    if (lx < -rr || lx > m.w + rr || ly < -rr || ly > m.h + rr) continue;
    sl.push({ x: lx, y: ly, z: q.z, r: q.r, c: q.c, I: q.I });
  }
  const dark = isDark(amb);
  if (!sl.length && !dark && !(rules && self > 0)) return null;
  const id = key + '|' + (flip ? 1 : 0) + '|' + (L.id || ''), F = frameData(key, P, f, sk ? baseP : null);
  if (!F) { const old = INST.get(id); return old && old.h ? old : null; }   // 이번 화면 계산이 넘침 = 직전 결과(밝기가 깜빡이지 않게)
  const lights = rules && self > 0 ? sl.concat(selfLights(F.spots, f, self)) : sl;
  if (!lights.length && !dark) return null;
  let I = INST.get(id);
  if (!I) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H * 2;
    I = { cv, cx: cv.getContext('2d'), img: null, h: '' };
    INST.set(id, I);
    if (INST.size > 24) INST.delete(INST.keys().next().value);
  }
  const hash = f + '|' + srcId(src) + '|' + amb + '|' + lights.map(q => `${q.x | 0},${q.y | 0},${q.z | 0},${q.r | 0},${Math.round(q.I * 40)},${q.c}`).join(';');
  if (I.h === hash) return I;
  // 다시 칠하기도 이번 화면 몫(budget) 안에서만 — 넘치면 직전 결과를 한 장 더 씀(느린 폰에서 식물 여럿이 한꺼번에 장을 바꿀 때 한 화면에 몰리지 않게)
  const now = performance.now(); if (now - LIGHT.win > 16) { LIGHT.win = now; LIGHT.spent = 0; }
  if (I.h && LIGHT.spent > LIGHT.budget) return I;
  const [u, o] = pixels(src, m, f), img = I.img || (I.img = I.cx.createImageData(W, H * 2));
  shadeInto([u, o], [img.data.subarray(0, N * 4), img.data.subarray(N * 4)], F.nm, F.emit, lights, amb, W, H);
  I.cx.putImageData(img, 0, 0); I.h = hash; LIGHT.lit++; LIGHT.spent += performance.now() - now;
  return I;
}
const isDark = amb => (typeof amb === 'number' ? amb !== 1 : amb[0] !== 1 || amb[1] !== 1 || amb[2] !== 1);
// 화분 · 풀 마개처럼 움직이지 않는 판 여럿(96×112, 그리는 순서대로)에 같은 빛 — 어둡거나 장면 빛이 있을 때만(스스로 빛만 있는 낮엔 안 씀)
//  면 방향은 여럿을 합친 모양으로 한 번만 · 반환 = 판마다 빛 입힌 캔버스(null = 원래 그대로)
const STATIC = new Map();
export function litStatic(id, ims, x, y, flip, light) {
  if (!LIGHT.on || !light || typeof document === 'undefined') return null;
  const amb = light.amb ?? 1, sl = [];
  for (const q of light.lights || []) {
    if (!(q.I > 0.01)) continue;
    const lx = flip ? x + W - 1 - q.x : q.x - x, ly = q.y - y, rr = (q.r || 30) * 2.5;
    if (lx < -rr || lx > W + rr || ly < -rr || ly > H + rr) continue;
    sl.push({ x: lx, y: ly, z: q.z, r: q.r, c: q.c, I: q.I });
  }
  if (!sl.length && !isDark(amb)) return null;
  let S = STATIC.get(id);
  if (!S) {
    scratch();
    const px = ims.map(im => { rcx.clearRect(0, 0, W, H * 2); rcx.drawImage(im, 0, 0, W, H, 0, 0, W, H); return rcx.getImageData(0, 0, W, H).data; });
    const all = new Uint8ClampedArray(N * 4);
    for (const p of px) for (let i = 0; i < N * 4; i += 4) if (p[i + 3] >= 128) { all[i] = p[i]; all[i + 1] = p[i + 1]; all[i + 2] = p[i + 2]; all[i + 3] = 255; }
    S = { px, nm: normalsOf(all, W, H, { detail: 1 }), cvs: ims.map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }), h: '' };
    STATIC.set(id, S); if (STATIC.size > 16) STATIC.delete(STATIC.keys().next().value);
  }
  const hash = amb + '|' + sl.map(q => `${q.x | 0},${q.y | 0},${q.z | 0},${q.r | 0},${Math.round(q.I * 40)},${q.c}`).join(';');
  if (S.h !== hash) {
    S.px.forEach((p, k) => { const cx = S.cvs[k].getContext('2d'), img = cx.createImageData(W, H); shadeInto([p], [img.data], S.nm, null, sl, amb, W, H); cx.putImageData(img, 0, 0); });
    S.h = hash;
  }
  return S.cvs;
}
// 검토 · 시험: 모아 둔 면 방향 크기(바이트)
export const lightMemory = () => { let b = 0; for (const D of DATA.values()) for (const F of D.fr) if (F) b += F.nm.length + (F.emit ? F.emit.length : 0); return b; };
