// 식물에 입히는 상태 효과 연출 — 걸릴 때 · 턴 끝 피해 때 · 쉬는 차례(2026-10-16 사용자 "디버프에 관한 연출도 식물에게 넣어줘. 독이나 화상 데미지 등
//  추후에 데미지나 효과 입을 때. 화상의 경우 잠깐 타들어가는 효과 준다거나 등. 소스 조사하고 샘플 보여줘봐")
// 조사:
//  · 타들어감 = '녹아 사라짐(dissolve) + 타는 띠' 기법 — 잡음 값이 문턱보다 낮은 칸을 태우고, 문턱 바로 위 좁은 띠를 불꽃으로(띠는 그림 테두리가 아니라 타는 앞쪽을 따라감)
//    — godotshaders '2D dissolve with burn edge' · gamedev.net shaderlab 'sprite dissolve' · Mirza Beig 'Dissolve Shader'. 여기선 아래 → 위로 번지게 높이를 섞고, 사라지지 않고 그을림만 남겼다 돌아옴.
//  · 불 색 = 가운데 흰빛 → 노랑 → 주황 → 짙은 빨강(가장자리 갈색 금지 — 연기·흙처럼 읽힘), 밑동은 흔들리지 않게, 둘레를 데우는 빛(sprite-ai.art 불 도트)
//  · 효과마다 색 하나 — 화상 주황 · 독 보라 · 빙결 하늘 · 감전 노랑(포켓몬 5세대: 마비면 노랗게 빛남, 2세대부터 화상 · 독 피해 연출이 따로)
//  · 도트 그림에 맞게 그림 1화소 = 1칸으로만 그림(매끈한 흐림 없이, 색 몇 개) — GodotCon 2026 '도트 그림 절차 효과'(잡음 · 색 줄이기)
import { plantLayer } from './sprites.js';

export const SFX_LIFE = { ignite: 1400, burn: 1150, poison: 900, shock: 700, paral: 800, chill: 900, frozen: 1050, wet: 900, stun: 1150, spore: 800, bloom: 1000, steam: 800,
  bind: 1000, root: 1000, leech: 900, drain: 800, weak: 800, taunt: 800, corrode: 950, shade: 1200, gale: 1000,
  rage: 900, wall: 800, haste: 750, regen: 900, heal: 700, thorns: 850, thornsHit: 450, shield: 950, shieldHit: 400, purified: 900, focus: 800 };
// 사건 → 연출: 걸릴 때(fx) · 턴 끝 피해(tick) · 피어남(bloom) · 쉬는 차례(skip: 얼음 · 마비 · 기절) · 풀림(cure = 김)
//  화상: 걸릴 때 = ignite(불이 확 붙어 일렁이다 잦아듦 + 타닥), 턴 끝 피해 = burn(불꽃이 잠깐 다시 솟음 + 타닥)
// 2026-10-23 엑셀 v10 이름 → 있던 연출(활력 = 분노 불꽃 · 억셈 = 철벽 · 가속 · 쇠약 = 약화 · 시듦 = 부식 · 봉인 = 덩굴 · 암실 · 그늘 = 그늘 · 조준 = 집중 · 출혈 = 약화 붉은 빛)
export const SFX_OF_FX = { burn: 'ignite', poison: 'poison', shock: 'shock', paral: 'paral', chill: 'chill', frozen: 'frozen', wet: 'wet', stun: 'stun', spore: 'spore',
  seal: 'bind', root: 'root', leech: 'leech', taunt: 'taunt', dark: 'shade', shade: 'shade', gale: 'gale', bleed: 'weak',
  atkDown: 'weak', defDown: 'corrode', spdDown: 'weak', critDown: 'weak', accDown: 'weak',
  atkUp: 'rage', defUp: 'wall', spdUp: 'haste', critUp: 'focus', accUp: 'focus', flourish: 'haste', regen: 'regen', will: 'purified', shield: 'shield', purified: 'purified', aim: 'focus',
  // 종 고유 v2 새 효과(2026-10-29 ㉢ — 전엔 머리 위 낱말뿐): 가까운 연출을 빌려 씀 — 지옥 = 불붙음 · 독안개 = 독 · 빙결열매 = 서리 · 부활 = 회복 빛 · 튕김 = 막 · 매혹 = 기절 별 · 덫 = 가시 · 봉인 구슬 = 묶임 · 동굴 · 갑주 = 돌판 · 폭풍 = 바람 · 은신 · 밤 = 그늘 · 아침 · 면역 = 정화 빛
  inferno: 'ignite', miasma: 'poison', fruit: 'chill', revive: 'regen', bounce: 'shield', charm: 'stun', thornTrap: 'thorns', orbTrap: 'bind', cave: 'wall', armor: 'wall', storm: 'gale',
  stealth: 'shade', night: 'shade', morning: 'purified', immune: 'purified' };
export function sfxAdd(list, who, kind, t, o = null) { if (!SFX_LIFE[kind]) return null; const e = { who, kind, t0: t, id: (list.n = (list.n || 0) + 1), ...(o || {}) }; list.push(e); return e; }
// 화상 타닥 시각(ms, 불똥이 터지는 때) — 소리를 같은 때에 내려고
export const popTimes = e => (POPS[e.kind === 'ignite' ? 'ignite' : 'burn'] || []).map((ms, k) => ms + Math.round((hash(e.id, k + 40) - 0.5) * 40));
export const sfxAlive = (list, t) => list.filter(e => t - e.t0 < SFX_LIFE[e.kind]);

// ── 도움 ──
const cl = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const oQ = x => 1 - (1 - x) * (1 - x);
const ioQ = x => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
function kf(ms, L) { if (ms <= L[0][0]) return L[0][1]; for (let i = 1; i < L.length; i++) { const [t1, v1, e] = L[i]; if (ms <= t1) { const [t0, v0] = L[i - 1], k = (ms - t0) / (t1 - t0); return v0 + (v1 - v0) * (e ? e(k) : k); } } return L[L.length - 1][1]; }
const hash = (a, b = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 0x9e37, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const RGB = new Map(), rgb = hex => { let v = RGB.get(hex); if (!v) { const n = parseInt(hex.slice(1, 7), 16); RGB.set(hex, v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]); } return v; };
const keyHash = s => { let h = 7; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
// 값 잡음(칸 6 + 칸 3) — 식물마다 같은 무늬(같은 식물은 늘 같은 자리부터 탐)
const NOISE = new Map();
function noiseOf(key, w, h) {
  const id = key + ':' + w + 'x' + h; let N = NOISE.get(id); if (N) return N;
  const s = keyHash(key) & 0xffff, vn = (x, y, o) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), H = (a, b) => hash(a + o * 131 + s, b + o * 71); return (H(xi, yi) * (1 - u) + H(xi + 1, yi) * u) * (1 - v) + (H(xi, yi + 1) * (1 - u) + H(xi + 1, yi + 1) * u) * v; };
  N = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) N[y * w + x] = 0.65 * vn(x / 6, y / 6, 1) + 0.35 * vn(x / 3, y / 3, 2);
  NOISE.set(id, N); return N;
}
// 겹쳐 그릴 판(식물 그림과 같은 크기) — 한 장을 돌려 씀
let ovCv = null, ovCx = null, ovImg = null;
function overlay(w, h) {
  if (!ovCv) { ovCv = document.createElement('canvas'); ovCx = ovCv.getContext('2d'); }
  if (ovCv.width !== w || ovCv.height !== h || !ovImg) { ovCv.width = w; ovCv.height = h; ovImg = ovCx.createImageData(w, h); }
  ovImg.data.fill(0); return ovImg;
}
function put(ov, i, hex, a) { if (a <= 0) return; const [r, g, b] = rgb(hex), d = ov.data, k = i * 4; d[k] = r; d[k + 1] = g; d[k + 2] = b; d[k + 3] = Math.round(cl(a) * 255); }
function blit(g, L, ov) {
  ovCx.putImageData(ov, 0, 0);
  const c = g.c; c.save(); c.imageSmoothingEnabled = false;
  if (L.flip) { c.translate(L.x + L.w, L.y); c.scale(-1, 1); c.drawImage(ovCv, 0, 0); } else c.drawImage(ovCv, L.x, L.y);
  c.restore();
}
// 그림 좌표 → 화면 칸(뒤집기 반영)
const scr = (L, px, py) => [L.flip ? L.x + (L.w - 1 - px) : L.x + px, L.y + py];
function dot(g, x, y, hex, a = 1, s = 1) { if (a <= 0) return; const c = g.c, p = c.globalAlpha; c.globalAlpha = p * cl(a); g.rect(Math.round(x), Math.round(y), s, s, hex); c.globalAlpha = p; }
// 보이는 식물 칸 정보: 불투명 칸 목록 · 위아래 끝 · 높이 비율(아래 0 → 위 1) · 테두리 칸
function scan(L) {
  const { w, h } = L, a = L.img.data, op = [], H = new Float32Array(w * h);
  let y0 = h, y1 = -1, x0 = w, x1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 40) { op.push(y * w + x); if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const span = Math.max(1, y1 - y0);
  for (const i of op) H[i] = (y1 - Math.floor(i / w)) / span;
  const alpha = i => a[i * 4 + 3] > 40;
  return { op, H, y0, y1, x0, x1, alpha, cx: (x0 + x1) / 2 };
}
const edgeOf = (L, S, i) => { const { w, h } = L, x = i % w, y = Math.floor(i / w); return x === 0 || y === 0 || x === w - 1 || y === h - 1 || !S.alpha(i - 1) || !S.alpha(i + 1) || !S.alpha(i - w) || !S.alpha(i + w); };
// 미리 뽑아 둔 칸(효과 하나가 처음 그려질 때 — 같은 효과 동안 같은 자리에서 나오게)
function picks(e, S, n, filter, salt) {
  const key = 'p' + salt; if (e[key]) return e[key];
  const pool = S.op.filter(filter), out = [];
  for (let k = 0; k < n && pool.length; k++) out.push(pool[Math.floor(hash(e.id * 97 + k, salt) * pool.length)]);
  return (e[key] = out);
}

// ── 화상: 불이 붙어 일렁이는 불꽃 + 타닥타닥(2026-10-16 사용자 "화상만 그냥 타닥타닥 거리는 걸로" → "타닥 효과가 작거나 연해, 불이 붙은 연출도 넣어줘") ──
//  걸릴 때(ignite) = 식물 윗면 여러 자리에서 불꽃이 확 솟아(0.15초) 일렁이다 잦아듦 · 턴 끝 피해(burn) = 불꽃이 잠깐 다시 솟음(작게)
//  타닥 = 불똥이 짝지어 터짐(흰 가운데 + 세 칸 갈래 번쩍 · 둘레 빛 → 불티 여덟이 위 · 옆으로 튀었다 떨어짐) · 그동안 식물이 주황 불빛으로 일렁
const FIRE = ['#fff3c4', '#ffc23a', '#ff6a1a', '#c8281e'];
const POPS = { ignite: [40, 110, 300, 370, 540, 610, 790, 850, 1020], burn: [0, 75, 300, 380, 560, 625, 770] };   // 타닥 · 타닥 …(짝지어 불규칙하게)
// 불꽃 한 줄기(도트): 밑이 넓고 끝이 가는 모양 · 위로 갈수록 흔들림 · 속 흰빛/노랑 → 주황 → 가장자리 · 끝 빨강
function flame(g, x, y, W, H, ph, a) {
  for (let d = 0; d < H; d++) {
    const r = d / H, w = Math.max(1, Math.round(W * (1 - r ** 1.35))), x0 = x - Math.floor(w / 2) + Math.round(Math.sin(ph + d * 0.55) * r * 1.8);
    for (let c = 0; c < w; c++) {
      const edge = c === 0 || c === w - 1, col = r > 0.78 ? '#c8281e' : edge ? (r > 0.5 ? '#c8281e' : '#ff6a1a') : r < 0.22 ? '#fff3c4' : r < 0.5 ? '#ffe08a' : '#ffc23a';
      dot(g, x0 + c, y - d, col, a);
    }
  }
}
// 불꽃 자리: 그림 가로를 n칸으로 나눠 칸마다 가장 위쪽 '윗면이 빈' 칸(머리 · 잎 끝) — 식물 전체에 고르게 붙음
function flameSpots(e, L, S, n) {
  if (e.fs) return e.fs;
  const best = new Array(n).fill(-1), span = Math.max(1, S.x1 - S.x0 + 1);
  for (const i of S.op) {
    if (S.H[i] < 0.18 || S.alpha(i - L.w)) continue;
    const x = i % L.w, b = Math.min(n - 1, Math.floor(((x - S.x0) / span) * n));
    if (best[b] < 0 || Math.floor(i / L.w) < Math.floor(best[b] / L.w)) best[b] = i;
  }
  return (e.fs = best.filter(i => i >= 0));
}
function burn(g, L, S, e, age, ignite) {
  const P = ignite ? POPS.ignite : POPS.burn, life = ignite ? SFX_LIFE.ignite : SFX_LIFE.burn, at = k => P[k] + Math.round((hash(e.id, k + 40) - 0.5) * 40);
  const up = ignite ? cl(age / 150) * cl((life - 260 - age) / 380) : cl(age / 120) * cl((780 - age) / 300);   // 불꽃 세기(솟음 → 일렁 → 잦아듦)
  // 식물이 주황 불빛으로 일렁(불꽃이 있는 동안 + 터질 때마다 더 밝게)
  let flick = 0;
  for (let k = 0; k < P.length; k++) { const a = age - at(k); if (a >= 0 && a < 180) flick = Math.max(flick, 1 - a / 180); }
  const tint = Math.max(0.22 * up * (0.8 + 0.2 * Math.sin(age / 45)), 0.32 * flick);
  if (tint > 0.02) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#ff6a1a', tint); blit(g, L, ov); }
  // 불꽃: 칸마다 높이 · 흔들림이 70ms마다 바뀜, 가끔 끝에서 불 조각이 떨어져 올라감
  if (up > 0.04) {
    const fs = flameSpots(e, L, S, ignite ? 8 : 5), fb = Math.floor(age / 70);
    fs.forEach((i, k) => {
      const [x, y] = scr(L, i % L.w, Math.floor(i / L.w)), big = k % 3 !== 1;
      const H = Math.round((ignite ? (big ? 11 : 8) : big ? 7 : 5) * up * (0.75 + 0.5 * hash(k, fb))), W = ignite ? (big ? 5 : 4) : big ? 4 : 3;
      if (H < 2) return;
      flame(g, x, y + 1, W, H, age / 160 + k * 1.7, 1);
      if (hash(k + 5, fb) < 0.35) dot(g, x + Math.round(Math.sin(age / 90 + k) * 2), y - H - 1 - ((age / 30) % 4), FIRE[2], 0.85);   // 떨어져 오르는 불 조각
    });
  }
  // 타닥: 번쩍(흰 가운데 + 세 칸 갈래 + 대각 한 칸) + 둘레 빛 + 불티 여덟(앞 2칸 · 꼬리 두 칸)
  const spots = picks(e, S, P.length, i => S.H[i] > 0.15, 1), c = g.c;
  spots.forEach((i, k) => {
    const a = age - at(k); if (a < 0 || a > 520) return;
    const [x, y] = scr(L, i % L.w, Math.floor(i / L.w));
    if (a < 190) { const R = 17, gr = c.createRadialGradient(x + 0.5, y + 0.5, 0, x + 0.5, y + 0.5, R), al = 0.6 * (1 - a / 190); gr.addColorStop(0, `rgba(255,205,110,${al.toFixed(3)})`); gr.addColorStop(1, 'rgba(255,205,110,0)'); c.save(); c.fillStyle = gr; c.fillRect(x - R, y - R, R * 2 + 1, R * 2 + 1); c.restore(); }
    if (a < 70) {
      dot(g, x, y, '#ffffff', 1);
      for (let d = 1; d <= 3; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) dot(g, x + dx, y + dy, d === 1 ? '#ffffff' : d === 2 ? '#fff3c4' : '#ffc23a', 1);
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) dot(g, x + dx, y + dy, '#ffe08a', 1);
    } else if (a < 150) { const f = 1 - (a - 70) / 80; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) dot(g, x + dx, y + dy, dx || dy ? '#ff6a1a' : '#ffc23a', f); }
    for (let j = 0; j < 8; j++) {
      const lf = 360 + 130 * hash(k * 9 + j, 5), q = a / lf; if (q >= 1) continue;
      const an = -Math.PI / 2 + (hash(k * 7 + j, e.id) - 0.5) * 3.1, v = 75 + 70 * hash(k * 5 + j, 3), G = 260;
      const pos = s => [x + Math.cos(an) * v * s, y + Math.sin(an) * v * s + 0.5 * G * s * s], tau = a / 1000;
      const [px, py] = pos(tau), [t1x, t1y] = pos(Math.max(0, tau - 0.016)), [t2x, t2y] = pos(Math.max(0, tau - 0.032)), ci = q < 0.3 ? 0 : q < 0.6 ? 1 : q < 0.85 ? 2 : 3;
      dot(g, t2x, t2y, FIRE[Math.min(3, ci + 2)], 0.5 * (1 - q));   // 꼬리
      dot(g, t1x, t1y, FIRE[Math.min(3, ci + 1)], 0.8 * (1 - q));
      dot(g, px, py, FIRE[ci], 1 - q * q, q < 0.55 ? 2 : 1);
    }
  });
}
// 둥근 덩이(연기 · 김 · 포자 구름): r 1 = 3칸 더하기 모양, 2 = 5칸 둥근 덩이
function puff(g, x, y, hex, a, r = 1) {
  x = Math.round(x); y = Math.round(y);
  if (r === 1) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) dot(g, x + dx, y + dy, hex, a); return; }
  for (let dy = -2; dy <= 2; dy++) { const w = Math.abs(dy) === 2 ? 1 : 2; for (let dx = -w; dx <= w; dx++) dot(g, x + dx, y + dy, hex, a); }
}

// ── 독: 보라로 두 번 물들고(얼룩) · 거품이 올라와 톡 터짐 ──
function poison(g, L, S, e, age, N) {
  const ov = overlay(L.w, L.h), p1 = Math.sin(Math.PI * cl(age / 260)), p2 = Math.sin(Math.PI * cl((age - 330) / 270)) * 0.7, a = 0.42 * Math.max(p1, p2);
  if (a > 0.01) { for (const i of S.op) put(ov, i, N[i] > 0.6 ? '#6a1fb0' : '#9a46e8', a + (N[i] > 0.6 ? 0.18 : 0)); blit(g, L, ov); }
  const sp = picks(e, S, 11, i => S.H[i] > 0.25, 2);
  sp.forEach((i, k) => {
    const ts = k * 50, b = age - ts, life = 520; if (b < 0 || b > life + 110) return;
    const [x0, y0] = scr(L, i % L.w, Math.floor(i / L.w)), q = Math.min(1, b / life), x = Math.round(x0 + Math.sin(b / 110 + k) * 1.2), y = Math.round(y0 - q * (12 + 8 * hash(k, 4)));
    if (b <= life) {   // 거품: 큰 것 = 5칸 고리(속 반투명 · 빛 한 점), 작은 것 = 3칸 고리
      if (k % 3 !== 0) {
        for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]]) dot(g, x + dx, y + dy, '#e0b8ff', 0.95);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) dot(g, x + dx, y + dy, '#8a3fd0', 0.45);
        dot(g, x - 1, y - 1, '#ffffff', 0.95);
      } else { for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) dot(g, x + dx, y + dy, '#e0b8ff', 0.95); dot(g, x, y, '#8a3fd0', 0.5); }
    } else { const r = (b - life) / 110; for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -3], [0, 3]]) dot(g, x + dx * (0.7 + r), y + dy * (0.7 + r), '#e0b8ff', 1 - r); }   // 톡
  });
}

// 칸 선(브레즌햄) — 번개 줄기
function pixLine(g, x0, y0, x1, y1, hex, a) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
  for (let n = 0; n < 200; n++) { dot(g, x0, y0, hex, a); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
// ── 감전 · 마비: 노랗게 번쩍번쩍 · 그림 위를 가로지르는 번개(70ms마다 새로) · 불똥 ──
function shock(g, L, S, e, age, strong) {
  const f = Math.floor(age / 60), on = age < (strong ? 520 : 360) && f % 2 === 0;
  if (on) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#fff27a', strong ? 0.62 : 0.5); blit(g, L, ov); }
  const b = Math.floor(age / 70); if (age > (strong ? 640 : 500) || b % 3 === 2) return;
  const n = strong ? 4 : 3;
  for (let k = 0; k < n; k++) {
    const pa = S.op[Math.floor(hash(e.id * 13 + k, b) * S.op.length)], pb = S.op[Math.floor(hash(e.id * 17 + k, b + 99) * S.op.length)];
    if (pa == null || pb == null) continue;
    let [x, y] = scr(L, pa % L.w, Math.floor(pa / L.w)); const [x2, y2] = scr(L, pb % L.w, Math.floor(pb / L.w));
    for (let s = 1; s <= 4; s++) {
      const t = s / 4, nx = s === 4 ? x2 : x + (x2 - x) / (5 - s) + (hash(k * 7 + s, b) - 0.5) * 8, ny = s === 4 ? y2 : y + (y2 - y) / (5 - s) + (hash(k * 5 + s, b + 7) - 0.5) * 8;
      pixLine(g, x + 1, y, nx + 1, ny, '#ffd84a', 0.55); pixLine(g, x, y, nx, ny, '#fffbd0', 1);
      x = nx; y = ny;
    }
    for (let j = 0; j < 2; j++) { const q = (age % 210) / 210, an = hash(k, j + b) * 6.28; dot(g, x2 + Math.cos(an) * q * 6, y2 + Math.sin(an) * q * 6, '#ffe680', 1 - q); }
  }
}

// ── 빙결 · 얼음: 서리가 아래에서 위로 덮였다 걷힘(얼음 = 끝까지 덮고 테두리 흰 얼음) · 얼음 결정 반짝 ──
function frost(g, L, S, e, age, N, full) {
  const ov = overlay(L.w, L.h), life = full ? SFX_LIFE.frozen : SFX_LIFE.chill, top = full ? 1.12 : 0.55;
  const th = kf(age, [[0, -0.05], [full ? 380 : 320, top, oQ], [full ? 720 : 600, top], [life, -0.05, ioQ]]), band = 0.07, keep = age < life * 0.7 ? 1 : 1 - (age - life * 0.7) / (life * 0.3);
  for (const i of S.op) {
    const s = 0.62 * S.H[i] + 0.38 * N[i];
    if (s < th - band) put(ov, i, full && edgeOf(L, S, i) ? '#ffffff' : '#d8f6ff', (full && edgeOf(L, S, i) ? 0.85 : 0.5) * keep);
    else if (s < th) put(ov, i, '#ffffff', 0.9 * keep);
    else if (s < th + 0.05) put(ov, i, '#8fd8ff', 0.3 * keep);
  }
  blit(g, L, ov);
  const sp = picks(e, S, full ? 8 : 6, i => edgeOf(L, S, i), 3);
  sp.forEach((i, k) => {
    const ts = 150 + k * 70, a = age - ts, life2 = full ? 700 : 520; if (a < 0 || a > life2) return;
    const [x, y] = scr(L, i % L.w, Math.floor(i / L.w)), z = Math.sin(Math.PI * a / life2), r = Math.round(z * (full ? 3 : 2));
    dot(g, x, y, '#ffffff', z);
    for (let d = 1; d <= r; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) dot(g, x + dx, y + dy, d === r ? '#8fd8ff' : '#e8f8ff', z);
  });
}

// ── 젖음: 잠깐 짙게 젖은 빛 · 윗부분 물기 반짝 · 물방울이 떨어져 흙에서 튐 ──
function wet(g, L, S, e, age, N) {
  const ov = overlay(L.w, L.h), a = 0.32 * Math.sin(Math.PI * cl(age / 600));
  if (a > 0.01) { for (const i of S.op) { const sheen = S.H[i] > 0.4 && N[i] > 0.66; put(ov, i, sheen ? '#e6f7ff' : '#2f6fb8', sheen ? a * 1.8 : a); } blit(g, L, ov); }   // 짙게 젖은 빛 + 윗부분 물기 반짝
  const sp = picks(e, S, 12, i => S.H[i] > 0.3 && !S.alpha(i + L.w), 4);
  sp.forEach((i, k) => {   // 물방울(1×3칸: 밝은 꼭대기 · 물빛 · 짙은 아래) → 흙에 닿으면 양옆으로 튐
    const ts = k * 55, b = age - ts; if (b < 0) return;
    const [x, y0] = scr(L, i % L.w, Math.floor(i / L.w)), floor = L.y + S.y1, tau = b / 1000, y = y0 + 0.5 * 320 * tau * tau;
    if (y < floor - 2) { dot(g, x, y, '#ffffff', 1); dot(g, x, y + 1, '#8fd3ff', 1); dot(g, x, y + 2, '#4f9dff', 1); }
    else { const land = Math.sqrt((2 * (floor - 2 - y0)) / 320) * 1000, r = (b - land) / 180; if (r < 1) for (const s of [-1, 1]) { dot(g, x + s * (1 + r * 3), floor - 1 - r * 3 + r * r * 3, '#8fd3ff', 1 - r); dot(g, x + s * (2 + r * 4), floor - r * 2, '#e6f7ff', 0.8 * (1 - r)); } }
  });
}

// ── 기절: 머리 위를 도는 별 셋(뒤로 갈 땐 흐리게) ──
function stun(g, L, S, e, age) {
  const life = SFX_LIFE.stun, a = Math.min(1, age / 120, (life - age) / 200), [cx, top] = scr(L, Math.round(S.cx), S.y0);
  // 별(5×5 도트: 꼭짓점 다섯 · 흰 가운데 · 주황 테두리 칸) 셋이 머리 위 타원을 돎
  const STAR = ['...o...', '..oyo..', 'ooyyyoo', '.oywyo.', '..yyy..', '.oy.yo.', '.o...o.'], C = { o: '#d07a10', y: '#ffe27a', w: '#ffffff' };
  for (let k = 0; k < 3; k++) {
    const an = age * 0.006 + (k * Math.PI * 2) / 3, x = Math.round(cx + Math.cos(an) * 18) - 3, y = Math.round(top - 9 + Math.sin(an) * 5) - 3, al = a * (Math.sin(an) < 0 ? 0.45 : 1);
    STAR.forEach((row, dy) => [...row].forEach((ch, dx) => { if (C[ch]) dot(g, x + dx, y + dy, C[ch], al); }));
  }
}

// ── 포자 · 피어남: 위에서 포자 알갱이가 퍼짐(피어남 = 크게 퍼지고 연둣빛으로 물듦) ──
function spores(g, L, S, e, age, big) {
  const life = big ? SFX_LIFE.bloom : SFX_LIFE.spore;
  if (big) { const ov = overlay(L.w, L.h), a = 0.35 * Math.sin(Math.PI * cl(age / 600)); if (a > 0.01) { for (const i of S.op) put(ov, i, '#a8d060', a); blit(g, L, ov); } }
  const sp = picks(e, S, big ? 26 : 16, i => S.H[i] > (big ? 0.35 : 0.5), big ? 5 : 6);
  sp.forEach((i, k) => {   // 포자 알갱이(2칸 · 가끔 더하기 모양) — 바깥으로 퍼지며 살짝 떠오름
    const ts = k * (big ? 18 : 30), b = age - ts, life2 = life - ts; if (b < 0 || b > life2) return;
    const [x0, y0] = scr(L, i % L.w, Math.floor(i / L.w)), q = b / life2, an = hash(e.id + k, 7) * Math.PI * 2, d = oQ(q) * (big ? 24 : 14), x = x0 + Math.cos(an) * d, y = y0 + Math.sin(an) * d * 0.7 - q * 10;
    if (k % 4 === 0) puff(g, x, y, '#f4ffc0', 1 - q); else dot(g, x, y, k % 2 ? '#f4ffc0' : '#c8e888', 1 - q, 2);
  });
  if (big && age < 600) for (let k = 0; k < 3; k++) {   // 포자 구름 덩이
    const q = cl((age - k * 90) / 450); if (q <= 0 || q >= 1) continue;
    const [x, y] = scr(L, Math.round(S.cx + (k - 1) * 10), S.y0 + Math.round((S.y1 - S.y0) * 0.3)), r = 4 + q * 10, c = g.c;
    c.save(); c.globalAlpha *= 0.35 * (1 - q); c.fillStyle = '#cfe89a'; c.beginPath(); c.arc(x, y - q * 6, r, 0, Math.PI * 2); c.fill(); c.restore();
  }
}

// ── 김(물에 화상이 꺼짐 · 불에 얼음이 녹음): 하얀 김이 위로 ──
function steam(g, L, S, e, age) {
  for (let k = 0; k < 12; k++) {   // 하얀 김 덩이(아래 한 줄 회색 — 밝은 바탕에서도 보이게)가 흔들리며 올라가 커지고 흐려짐
    const a = age - k * 40, q = a / 560; if (a < 0 || q > 1) continue;
    const [x0, y0] = scr(L, Math.round(S.x0 + hash(e.id, k) * (S.x1 - S.x0)), S.y0 + Math.round((S.y1 - S.y0) * (0.15 + 0.45 * hash(k, e.id)))), x = x0 + Math.sin(a / 120 + k) * 2, y = y0 - q * 22;
    puff(g, x, y + 1, '#9aa6b4', 0.5 * (1 - q), 2); puff(g, x, y, '#f2f6fa', 0.9 * (1 - q), 2);
  }
}

// 네 갈래 반짝(도트): 흰 가운데 + s칸 팔
function twinkle(g, x, y, s, hex) { if (s < 1) return; dot(g, x, y, '#ffffff', 1); for (let d = 1; d <= s; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) dot(g, x + dx, y + dy, hex, 1 - (d - 1) / (s + 1)); }
// ── 나머지 해로운 효과(2026-10-16 사용자 "남은 거 다해줘") ──
const fadeIO = (age, life, a = 140, b = 220) => Math.min(cl(age / a), cl((life - age) / b));
const rowSpan = (L, S, y) => { let l = -1, r = -1; for (let x = 0; x < L.w; x++) if (S.alpha(y * L.w + x)) { if (l < 0) l = x; r = x; } return [l, r]; };
// 덩굴: 덩굴 세 줄이 몸을 휘감으며 자라고(앞은 밝게 · 뒤는 몸에 가려짐) 한 번 조였다 풀림
function bind(g, L, S, e, age) {
  const life = SFX_LIFE.bind, grow = cl(age / 320), f = fadeIO(age, life, 1, 260), sq = age > 320 && age < 560 ? Math.sin((Math.PI * (age - 320)) / 240) : 0;
  [0.2, 0.44, 0.68].forEach((lv, k) => {
    const yr = Math.round(S.y1 - (S.y1 - S.y0) * lv); let [xl, xr] = rowSpan(L, S, yr); if (xl < 0) return;
    xl -= 2; xr += 2; const n = Math.round((xr - xl) * grow);
    for (let s = 0; s <= n; s++) {
      const x = xl + s, ph = s / 4.5 + k * 1.3, y = yr + Math.round(Math.sin(ph) * (2.2 - sq * 1.2)), front = Math.cos(ph) > 0;
      if (!front && S.alpha(y * L.w + x)) continue;   // 뒤로 돌아간 덩굴은 몸에 가려짐
      const [sx, sy] = scr(L, x, y);
      dot(g, sx, sy, front ? '#7fe06a' : '#2e5a26', f); dot(g, sx, sy + 1, front ? '#3f8a34' : '#1e3a1a', f);
      if (front && s % 8 === 4) { dot(g, sx, sy - 1, '#a8ec8a', f); dot(g, sx + 1, sy - 2, '#a8ec8a', f); dot(g, sx + 1, sy - 1, '#6fd25c', f); }   // 작은 잎
    }
  });
}
// 뿌리 묶기: 흙에서 뿌리 넷이 줄기를 감으며 솟음
function root(g, L, S, e, age) {
  const life = SFX_LIFE.root, grow = oQ(cl(age / 380)), f = fadeIO(age, life, 1, 260);
  [-11, -5, 5, 11].forEach((dx, k) => {   // 굵은 뿌리(2칸: 밝은 줄 + 짙은 줄, 끝은 가늘고 밝게)가 흙에서 솟아 줄기 쪽으로 휘어 감김
    const H = Math.round((20 + 6 * hash(e.id, k)) * grow);
    for (let d = 0; d < H; d++) {
      const [sx, sy] = scr(L, Math.round(S.cx + dx * (1 - d / 30) + Math.sin(d * 0.4 + k) * 2), S.y1 + 1 - d), tip = d >= H - 3;
      dot(g, sx, sy, tip ? '#e8c090' : '#c08a5a', f); if (!tip) { dot(g, sx + 1, sy, '#6a3e1e', f); dot(g, sx - 1, sy, '#3a2210', f * 0.8); }
    }
  });
}
// 기생 씨앗: 씨앗이 머리에 떨어져 박히고 덩굴손이 퍼짐
function leech(g, L, S, e, age) {
  const life = SFX_LIFE.leech, f = fadeIO(age, life, 1, 240), [sx, top] = scr(L, Math.round(S.cx), S.y0 + 6), fall = cl(age / 160), y = Math.round(top - 26 * (1 - fall * fall));
  const SEED = ['.ss.', 'sSSs', 'sSSs', '.sd.'], C = { s: '#7a5028', S: '#c89048', d: '#4a2e14' };   // 씨앗(4×4 도트)
  SEED.forEach((row, dy) => [...row].forEach((ch, dx) => { if (C[ch]) dot(g, sx - 2 + dx, y - 2 + dy, C[ch], f); }));
  if (age > 160) for (let k = 0; k < 5; k++) {   // 덩굴손 다섯이 몸을 타고 퍼짐(2칸 → 끝 1칸)
    const an = (k / 5) * Math.PI * 2 + 0.4, len = Math.round(13 * oQ(cl((age - 160) / 380)));
    for (let d = 2; d <= len; d++) { const x = sx + Math.round(Math.cos(an) * d + Math.sin(d * 0.7 + k) * 1.5), yy = y + 1 + Math.round(Math.sin(an) * d * 0.75); dot(g, x, yy, d >= len - 1 ? '#e6ff9a' : '#6fd25c', f); if (d < len - 3) dot(g, x, yy + 1, '#2e7a2a', f); }
  }
}
// 약화: 빨간 아래 꺾쇠 셋이 몸을 타고 내려가며 사라짐 + 잿빛으로 한 번 물듦
function weak(g, L, S, e, age) {
  const life = SFX_LIFE.weak, a = 0.3 * Math.sin(Math.PI * cl(age / 500));
  if (a > 0.02) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#6a6474', a); blit(g, L, ov); }
  for (let k = 0; k < 3; k++) {   // 아래 꺾쇠(9칸 폭 · 2칸 두께 · 짙은 테)
    const b = age - k * 110, q = cl(b / 520); if (b < 0 || q >= 1) continue;
    const [cx, cy] = scr(L, Math.round(S.cx + (k - 1) * 11), S.y0 + 2 + Math.round(q * 22)), al = Math.sin(Math.PI * q);
    for (let d = -4; d <= 4; d++) { const y = cy - (4 - Math.abs(d)); dot(g, cx + d, y - 1, '#5a1010', al); dot(g, cx + d, y, '#ff5a5a', al); dot(g, cx + d, y + 1, '#ff8a8a', al); dot(g, cx + d, y + 2, '#5a1010', al * 0.9); }
  }
}
// 도발: 머리 옆에 화난 표시가 톡 튀어나와 떨리고 몸이 빨갛게 두 번 번쩍
function taunt(g, L, S, e, age) {
  const life = SFX_LIFE.taunt, fl = (age < 120 || (age > 220 && age < 340)) ? 0.32 : 0;
  if (fl) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#ff3a3a', fl); blit(g, L, ov); }
  // 화난 표시(💢, 11×11 도트 — 네 귀퉁이에서 가운데로 굽은 핏줄 넷, 빨강 + 짙은 테)가 머리 옆에서 톡 커졌다 떨림
  const [hx, hy] = scr(L, Math.round(S.cx + (S.x1 - S.x0) * 0.34), S.y0 + 1), j = age > 90 && age < 420 ? Math.round(Math.sin(age / 22)) : 0, f = fadeIO(age, life, 60, 200);
  const MARK = ['.oo.....oo.', 'orro...orro', 'or.ro.or.ro', '.o.ro.or.o.', '...o...o...', '...........', '...o...o...', '.o.ro.or.o.', 'or.ro.or.ro', 'orro...orro', '.oo.....oo.'], C = { o: '#5a0e0e', r: '#ff4a4a' };
  const big = age > 60 && age < 140 ? 1 : 0;
  MARK.forEach((row, dy) => [...row].forEach((ch, dx) => { if (!C[ch]) return; const x = hx + j - 5 + dx + (big ? Math.sign(dx - 5) : 0), y = hy - 5 + dy + (big ? Math.sign(dy - 5) : 0); dot(g, x, y, C[ch], f); }));
}
// 부식: 올리브빛으로 물들고 몸 위에서 산 거품이 톡톡 · 산 방울이 떨어짐
function corrode(g, L, S, e, age, N) {
  const life = SFX_LIFE.corrode, a = 0.3 * fadeIO(age, life, 120, 300) * (0.8 + 0.2 * Math.sin(age / 60));
  if (a > 0.02) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, N[i] > 0.6 ? '#6a7a1a' : '#9aa83a', a + (N[i] > 0.6 ? 0.15 : 0)); blit(g, L, ov); }
  const sp = picks(e, S, 9, i => S.H[i] > 0.15, 9);
  sp.forEach((i, k) => {
    const b = age - k * 70, q = b / 260; if (b < 0 || q > 1.3) return;
    const [x, y] = scr(L, i % L.w, Math.floor(i / L.w));
    if (q <= 1) { dot(g, x, y, '#e6f08a', 1); dot(g, x + 1, y, '#a8c040', 0.9); dot(g, x, y - 1, '#a8c040', 0.9); }
    else for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dot(g, x + dx * 2, y + dy * 2, '#e6f08a', 1.3 - q);
  });
}
// 그늘(식물 쪽): 구름 그늘 아래로 들어가 어두워짐 — 구름 · 땅 그림자는 drawSfxMap
function shadeOn(g, L, S, e, age) {
  const a = 0.42 * fadeIO(age, SFX_LIFE.shade, 260, 320);
  if (a > 0.02) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#141433', a); blit(g, L, ov); }
}
// 강풍(식물 쪽): 잎 몇 장이 바람에 뜯겨 날아감 — 몸 흔들림은 swayOf, 화면을 가로지르는 바람은 drawSfxMap
function galeOn(g, L, S, e, age) {
  const dir = e.dir || 1, sp = picks(e, S, 7, i => S.H[i] > 0.35 && !S.alpha(i - L.w), 10);
  sp.forEach((i, k) => {
    const b = age - 80 - k * 70, q = cl(b / 600); if (b < 0 || q >= 1) return;
    const [x0, y0] = scr(L, i % L.w, Math.floor(i / L.w)), x = x0 + dir * q * (60 + 30 * hash(k, 3)), y = y0 - Math.sin(q * Math.PI) * 8 + Math.sin(b / 50 + k) * 2;
    dot(g, x, y, k % 2 ? '#7fe06a' : '#c8e888', 1 - q * q, 2); dot(g, x + dir, y + 1, '#3f8a34', 1 - q * q);
  });
}

// ── 이로운 효과(버프) ──
// 분노: 몸 둘레에서 붉은 기운이 일렁이며 오르고 몸이 붉게 달아오름
function rage(g, L, S, e, age, N) {
  const life = SFX_LIFE.rage, f = fadeIO(age, life, 120, 300), ov = overlay(L.w, L.h), fb = Math.floor(age / 60);
  for (const i of S.op) put(ov, i, '#ff3a2a', 0.22 * f * (0.8 + 0.2 * Math.sin(age / 50)));
  for (const i of S.op) { if (!edgeOf(L, S, i) || hash(i, fb) > 0.35) continue; const x = i % L.w, y = Math.floor(i / L.w); if (y > 0 && !S.alpha(i - L.w)) put(ov, i - L.w, hash(i, fb + 3) < 0.5 ? '#ff6a1a' : '#c8281e', 0.9 * f); }
  blit(g, L, ov);
  const sp = picks(e, S, 10, i => S.H[i] > 0.1, 11);
  sp.forEach((i, k) => { const b = age - k * 50, q = cl(b / 500); if (b < 0 || q >= 1) return; const [x, y] = scr(L, i % L.w, Math.floor(i / L.w)); dot(g, x + Math.sin(b / 70 + k) * 1.2, y - q * 18, q < 0.5 ? '#ff8a5a' : '#c8281e', (1 - q) * f, q < 0.4 ? 2 : 1); });
}
// 철벽: 몸에 돌판 무늬가 번쩍 덮였다 스며듦 + 테두리 흰빛(쨍)
function wall(g, L, S, e, age) {
  const life = SFX_LIFE.wall, f = fadeIO(age, life, 80, 360), ov = overlay(L.w, L.h);
  for (const i of S.op) { const x = i % L.w, y = Math.floor(i / L.w), line = y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 3) % 6 === 0; put(ov, i, edgeOf(L, S, i) && age < 160 ? '#ffffff' : line ? '#5a6a82' : '#9ab0c8', (edgeOf(L, S, i) && age < 160 ? 0.9 : line ? 0.55 : 0.32) * f); }
  blit(g, L, ov);
}
// 가속: 바깥쪽으로 잔상 둘(하늘빛) + 속도 줄
let ghostCv = null, ghostCx = null;
function haste(g, L, S, e, age) {
  const life = SFX_LIFE.haste, f = fadeIO(age, life, 60, 260), back = -(e.dir || 1);
  if (!ghostCv) { ghostCv = document.createElement('canvas'); ghostCx = ghostCv.getContext('2d'); }
  if (ghostCv.width !== L.w || ghostCv.height !== L.h) { ghostCv.width = L.w; ghostCv.height = L.h; }
  ghostCx.putImageData(L.img, 0, 0); ghostCx.globalCompositeOperation = 'source-in'; ghostCx.fillStyle = '#8fe6ff'; ghostCx.fillRect(0, 0, L.w, L.h); ghostCx.globalCompositeOperation = 'source-over';
  const c = g.c;
  [[4, 0.4], [8, 0.2]].forEach(([d, a]) => {
    const off = Math.round(back * d * (0.6 + 0.4 * Math.sin(age / 90)));
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= a * f;
    if (L.flip) { c.translate(L.x + off + L.w, L.y); c.scale(-1, 1); c.drawImage(ghostCv, 0, 0); } else c.drawImage(ghostCv, L.x + off, L.y);
    c.restore();
  });
  for (let k = 0; k < 5; k++) { const [x, y] = scr(L, back > 0 ? S.x1 + 3 : S.x0 - 3, Math.round(S.y0 + (S.y1 - S.y0) * (0.2 + k * 0.15))), len = 6 + Math.round(hash(k, Math.floor(age / 80)) * 8); for (let d = 0; d < len; d++) dot(g, x + back * d, y, '#e6f7ff', f * (1 - d / len)); }
}
// 재생 · 회복: 초록으로 한 번 물들고 더하기 표시가 떠오름(회복은 작게)
function regen(g, L, S, e, age, small) {
  const life = SFX_LIFE[small ? 'heal' : 'regen'], a = 0.24 * Math.sin(Math.PI * cl(age / (life * 0.7)));
  if (a > 0.02) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#5fe08a', a); blit(g, L, ov); }
  const sp = picks(e, S, small ? 3 : 6, i => S.H[i] > 0.2, 12);
  sp.forEach((i, k) => {
    const b = age - k * 90, q = cl(b / 560); if (b < 0 || q >= 1) return;
    const [x, y0] = scr(L, i % L.w, Math.floor(i / L.w)), y = Math.round(y0 - q * 16), al = Math.sin(Math.PI * q);
    dot(g, x, y, '#ffffff', al); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) dot(g, x + dx, y + dy, Math.abs(dx) + Math.abs(dy) === 2 ? '#2fb86a' : '#7ef0a0', al);
  });
}
// 반사(가시): 몸 테두리에서 가시가 바깥으로 쑥 돋았다 들어감(반사 순간 = 짧게 번쩍)
function thorns(g, L, S, e, age, hit) {
  const life = SFX_LIFE[hit ? 'thornsHit' : 'thorns'], out = hit ? Math.sin(Math.PI * cl(age / life)) : Math.min(oQ(cl(age / 160)), cl((life - age) / 260)), len = Math.round(5 * out);
  if (len < 1) return;
  const cx = (S.x0 + S.x1) / 2, cy = (S.y0 + S.y1) / 2;
  let n = 0;
  for (const i of S.op) {   // 테두리 칸 셋에 하나꼴로 바깥으로 가시(밑 갈색 2칸 · 끝 밝게)
    if (!edgeOf(L, S, i) || n++ % 3) continue;
    const x = i % L.w, y = Math.floor(i / L.w), dx = x - cx, dy = y - cy, m = Math.hypot(dx, dy) || 1;
    for (let d = 1; d <= len; d++) { const [sx, sy] = scr(L, Math.round(x + (dx / m) * d), Math.round(y + (dy / m) * d)); dot(g, sx, sy, d === len ? (hit ? '#ffffff' : '#fff0b0') : d >= len - 1 ? '#ffd27a' : '#a8743a', 1); }
  }
}
// 보호막(· 튕김)이 걸리는 순간 · 막는 순간의 막 = auras.js 둘레 원(2026-10-29 — 늘 보이는 원이 톡 커지며 생기고 막을 때 번쩍) · 여기선 소리 자리만(SFX_LIFE)
// 정화: 흰빛으로 한 번 씻기고 반짝이 고리가 발밑에서 머리로 오름
function purify(g, L, S, e, age) {
  const life = SFX_LIFE.purified, a = 0.45 * cl(1 - age / 260);
  if (a > 0.02) { const ov = overlay(L.w, L.h); for (const i of S.op) put(ov, i, '#ffffff', a); blit(g, L, ov); }
  const q = cl(age / (life * 0.85)), [cx, by] = scr(L, Math.round((S.x0 + S.x1) / 2), S.y1), y = by - q * (S.y1 - S.y0 + 6), rx = (S.x1 - S.x0) / 2 + 3;
  for (let k = 0; k < 10; k++) { const an = (k / 10) * Math.PI * 2 + age / 200, x = cx + Math.cos(an) * rx, yy = y + Math.sin(an) * 3, s = Math.sin(an) > 0 ? 2 : 1; twinkle(g, Math.round(x), Math.round(yy), s + 1, Math.sin(an) > 0 ? '#ffffff' : '#bfe8ff'); }
}
// 집중: 머리 둘레에 조준 꺾쇠 넷이 좁혀 들어오고 금빛 반짝
function focus(g, L, S, e, age) {
  // 자리 = 식물 한가운데(2026-10-16 사용자 "집중의 표식을 식물의 중앙쯤으로 — 지금은 머리에 있어")
  const life = SFX_LIFE.focus, q = oQ(cl(age / 380)), f = fadeIO(age, life, 60, 220), [cx, cy] = scr(L, Math.round(S.cx), Math.round((S.y0 + S.y1) / 2)), r = Math.round(18 - 9 * q);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let d = 0; d < 4; d++) { dot(g, cx + sx * r - sx * d, cy + sy * r, '#ffd84a', f); dot(g, cx + sx * r, cy + sy * r - sy * d, '#ffd84a', f); }
  if (age > 380) twinkle(g, cx, cy, 2 + Math.round(2 * Math.sin(Math.PI * cl((age - 380) / 300))), '#ffffff');
}

// 식물 하나 위에 그 식물의 효과를 모두(식물을 그린 바로 뒤에 부름). p = { key, pot, bx, by, flip, view, t, phase }
export function drawSfx(g, list, who, t, p) {
  let L = null, S = null, N = null;
  // 화상 둘(불 붙음 · 턴 끝 피해)이 겹치면 새것만 — 주황 불빛이 두 겹으로 짙어지지 않게
  const fire = list.filter(e => e.who === who && (e.kind === 'burn' || e.kind === 'ignite') && t - e.t0 >= 0 && t - e.t0 < SFX_LIFE[e.kind]).pop();
  for (const e of list) {
    if (e.who !== who) continue;
    if ((e.kind === 'burn' || e.kind === 'ignite') && e !== fire) continue;
    const age = t - e.t0; if (age < 0 || age >= SFX_LIFE[e.kind]) continue;
    if (e.kind === 'shield' || e.kind === 'shieldHit') continue;   // 막 = auras.js 둘레 원
    if (!L) { L = plantLayer(p.key, p.pot, p.bx, p.by, { t: p.t, phase: p.phase, flip: p.flip, view: p.view }); if (!L) return; S = scan(L); if (!S.op.length) return; N = noiseOf(p.key, L.w, L.h); }
    if (e.kind === 'burn' || e.kind === 'ignite') burn(g, L, S, e, age, e.kind === 'ignite');
    else if (e.kind === 'poison') poison(g, L, S, e, age, N);
    else if (e.kind === 'shock' || e.kind === 'paral') shock(g, L, S, e, age, e.kind === 'paral');
    else if (e.kind === 'chill' || e.kind === 'frozen') frost(g, L, S, e, age, N, e.kind === 'frozen');
    else if (e.kind === 'wet') wet(g, L, S, e, age, N);
    else if (e.kind === 'stun') stun(g, L, S, e, age);
    else if (e.kind === 'spore' || e.kind === 'bloom') spores(g, L, S, e, age, e.kind === 'bloom');
    else if (e.kind === 'steam') steam(g, L, S, e, age);
    else if (e.kind === 'bind') bind(g, L, S, e, age);
    else if (e.kind === 'root') root(g, L, S, e, age);
    else if (e.kind === 'leech') leech(g, L, S, e, age);
    else if (e.kind === 'weak') weak(g, L, S, e, age);
    else if (e.kind === 'taunt') taunt(g, L, S, e, age);
    else if (e.kind === 'corrode') corrode(g, L, S, e, age, N);
    else if (e.kind === 'shade') shadeOn(g, L, S, e, age);
    else if (e.kind === 'gale') galeOn(g, L, S, e, age);
    else if (e.kind === 'rage') rage(g, L, S, e, age, N);
    else if (e.kind === 'wall') wall(g, L, S, e, age);
    else if (e.kind === 'haste') haste(g, L, S, e, age);
    else if (e.kind === 'regen' || e.kind === 'heal') regen(g, L, S, e, age, e.kind === 'heal');
    else if (e.kind === 'thorns' || e.kind === 'thornsHit') thorns(g, L, S, e, age, e.kind === 'thornsHit');
    else if (e.kind === 'purified') purify(g, L, S, e, age);
    else if (e.kind === 'focus') focus(g, L, S, e, age);
  }
}

// ── 경기장 전체에 그리는 것(두 식물을 다 그린 뒤 한 번): 강풍 = 화면을 가로지르는 바람 · 그늘 = 구름과 땅 그림자 · 기생 씨앗 빨아들이기 = 기운 알갱이가 건너감 ──
//  (2026-10-16 사용자 "맵에 영향을 주는 강풍 등은 다른 방식으로 연출해봐") — 강풍이 걸려 있는 동안엔 그 식물 둘레에 옅은 바람이 계속 지나감
//  P = { me: [x, 받침 y], foe: [...] }, area = [x0, y0, w, h](경기장), active = { me: [효과 id…], foe: […] }
export function drawSfxMap(g, list, t, P, area, active) {
  const [ax, ay, aw, ah] = area, c = g.c;
  for (const e of list) {
    const age = t - e.t0; if (age < 0 || age >= SFX_LIFE[e.kind]) continue;
    const [px, py] = P[e.who] || [0, 0];
    if (e.kind === 'gale') {   // 큰 바람: 줄 스물둘이 화면을 가로질러 휙(밝은 줄 + 아래 그늘 줄 — 밝은 모래 위에서도 보이게, 끝은 말림) · 잎이 굴러가며 날아감 · 흙먼지
      const dir = e.dir || 1, life = SFX_LIFE.gale, al = 0.9 * fadeIO(age, life, 80, 260);
      for (let k = 0; k < 22; k++) {
        const b = age - k * 28; if (b < 0) continue;
        const sp = 0.55 + 0.3 * hash(k, e.id), x = dir > 0 ? ax - 70 + b * sp : ax + aw + 70 - b * sp, y = Math.round(ay + 26 + hash(k + 7, e.id) * (ah - 60)), len = 30 + Math.round(hash(k, 5) * 40);
        if (x < ax - 110 || x > ax + aw + 110) continue;
        for (let d = 0; d < len; d++) {
          const xx = x - dir * d, yy = y + Math.round(Math.sin(xx / 18 + k) * 1.5), a = al * (1 - d / len);
          dot(g, xx, yy + 1, '#6a5a88', a * 0.35); dot(g, xx, yy, k % 4 ? '#f4f8ff' : '#c0a8ff', a);
        }
        if (k % 3 === 0) for (let s = 0; s < 6; s++) { const an = (s / 6) * Math.PI * 1.6; dot(g, x + dir * Math.round(2 + Math.cos(an) * 3), y - 3 + Math.round(Math.sin(an) * 3), '#f4f8ff', al); }   // 앞끝 말림
      }
      for (let k = 0; k < 8; k++) {   // 잎(2×2 + 그늘 한 칸)이 화면을 가로질러 굴러감
        const b = age - 60 - k * 70; if (b < 0) continue;
        const x = dir > 0 ? ax - 10 + b * 0.42 : ax + aw + 10 - b * 0.42, y = ay + 40 + hash(k + 3, e.id) * (ah - 90) + Math.sin(b / 60 + k) * 5;
        if (x < ax - 20 || x > ax + aw + 20) continue;
        dot(g, x, y, k % 2 ? '#7fe06a' : '#c8e888', al, 2); dot(g, x + (Math.floor(b / 80) % 2 ? 2 : -1), y + 1, '#3f8a34', al);
      }
      for (let k = 0; k < 6; k++) { const b = age - 120 - k * 60, q = cl(b / 500); if (b < 0 || q >= 1) continue; const x = px - dir * 20 + dir * q * 70, y = py - 2 - Math.sin(q * Math.PI) * 6; puff(g, x, y, '#cdb48a', 0.55 * (1 - q), q < 0.5 ? 1 : 2); }
    } else if (e.kind === 'shade') {   // 구름이 옆에서 흘러와 그 식물 위에 멈춤 · 땅에 그림자
      const life = SFX_LIFE.shade, f = fadeIO(age, life, 260, 320), cx = px + 14 + (1 - oQ(cl(age / 420))) * -60 * (e.dir || 1), cy = py - 146;
      c.save(); c.globalAlpha *= 0.32 * f; c.fillStyle = '#0e0e24'; c.beginPath(); c.ellipse(cx, py - 2, 46, 12, 0, 0, Math.PI * 2); c.fill(); c.restore();
      const CLOUD = ['....xxxx......', '..xxxxxxxxx...', '.xxxxxxxxxxxx.', 'xxxxxxxxxxxxxx', '.xxxxxxxxxxxx.'];
      CLOUD.forEach((row, dy) => [...row].forEach((ch, dx) => { if (ch === 'x') for (let s = 0; s < 3; s++) for (let u = 0; u < 3; u++) dot(g, Math.round(cx - 21 + dx * 3 + s), Math.round(cy + dy * 3 + u), dy === 0 || (dy === 1 && dx < 4) ? '#7a7a9a' : '#4a4a68', 0.9 * f); }));
    } else if (e.kind === 'drain' && e.to && P[e.to]) {   // 기생 씨앗이 빨아들인 기운: 알갱이 다섯이 둥글게 건너감
      const [tx, ty] = P[e.to], sy = py - 40, ey = ty - 40;
      for (let k = 0; k < 5; k++) {
        const q = cl((age - k * 70) / 520); if (q <= 0 || q >= 1) continue;
        const mx = (px + tx) / 2, my = Math.min(sy, ey) - 40, x = (1 - q) ** 2 * px + 2 * (1 - q) * q * mx + q * q * tx, y = (1 - q) ** 2 * sy + 2 * (1 - q) * q * my + q * q * ey;
        dot(g, x - 1, y - 1, '#6fd25c', 0.6, 4); dot(g, x, y, '#e6ff9a', 1, 2);
      }
    }
  }
  // 강풍이 걸려 있는 동안: 그 식물 둘레에 옅은 바람 줄이 가끔 지나감
  for (const side of ['me', 'foe']) {
    if (!(active[side] || []).includes('gale') || !P[side]) continue;
    const [px, py] = P[side];
    for (let k = 0; k < 3; k++) {
      const per = 1100 + k * 230, b = (t + k * 400) % per, q = b / 700; if (q >= 1) continue;
      const x = px - 50 + q * 100, y = py - 30 - k * 24 - Math.sin(q * Math.PI) * 3, len = 16;
      for (let d = 0; d < len; d++) dot(g, x - d, y, '#e6f3ff', 0.35 * Math.sin(Math.PI * q) * (1 - d / len));
    }
  }
}
// 강풍에 흔들림(식물 그림 줄을 위로 갈수록 옆으로 — drawBigPose qx): 큰 바람이 불 땐 크게, 걸려 있는 동안은 살랑
export function swayOf(list, active, who, t) {
  let q = 0;
  for (const e of list) { if (e.who !== who || e.kind !== 'gale') continue; const age = t - e.t0; if (age >= 0 && age < SFX_LIFE.gale) q = Math.max(q, Math.sin(Math.PI * cl(age / SFX_LIFE.gale)) * (2.5 + Math.sin(age / 70))); }
  if ((active[who] || []).includes('gale')) q = Math.max(q, 1 + Math.sin(t / 260) * 0.8);
  return Math.round(q);
}
