// 색 변종(이로치) 색 바꾸기 — 게임(art/sprites.js)과 검토 도구(tools/pixel/big/shiny.mjs)가 같이 쓰는 순수 함수(2026-10-22 사용자 "색 변종 그림부터 해줘",
//  결정 2026-10-18 "그림 색을 진짜로 바꿈 — 자연스럽고 이쁘게 · 포켓몬 이로치 참고" · 주된 몸 색만 바꾸고 눈 · 화분은 그대로 · 종마다 보여 드리고 고름)
//  색은 OKLCH(사람 눈에 고른 밝기 · 채도 · 색상)로 다룸: 규칙의 색 무리(색상 범위)에 드는 칸만 색상을 돌리고 밝기 · 명암 차이는 그대로 → 그림 결이 안 깨짐
//  규칙 = 띠 목록 [{ h: [h0, h1], to: 목표 색상(띠 가운데가 여기로), ck: 채도 배수, dl: 밝기 더하기, l: [최소, 최대], c: 최소 채도 }
//                  | { tint: [색상, 채도], l: [최소, 최대], c: 최대 채도 } (흰 · 회색 몸에 색을 입힘)]
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = v => { const u = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(u * 255))); };
export function toLch(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, Bb), (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360];
}
const linOf = (L, C, H) => {
  const h = H * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
// 화면에 못 내는 색(채도가 너무 큼)이면 색상 · 밝기는 두고 채도만 줄여 맞춤
export function fromLch(L, C, H) {
  L = Math.max(0, Math.min(1, L));
  let c = C, v = linOf(L, c, H);
  for (let i = 0; i < 12 && v.some(x => x < -0.001 || x > 1.001); i++) { c *= 0.88; v = linOf(L, c, H); }
  return v.map(gam);
}
export const inHue = (h, [h0, h1]) => (h0 <= h1 ? h >= h0 && h <= h1 : h >= h0 || h <= h1);
const midOf = ([h0, h1]) => (h0 + ((h1 - h0 + 360) % 360) / 2) % 360;
// 한 색 바꾸기(바뀌지 않으면 null) — 아주 어두운 칸(테두리 · 눈동자)은 그대로
export function shinyColor(r, g, b, rule) {
  const [L, C, H] = toLch(r, g, b);
  if (L < 0.24) return null;
  for (const t of rule) {
    const [l0, l1] = t.l || [0.24, 1.01];
    if (L < l0 || L > l1) continue;
    if (t.tint) {
      if (C > (t.c ?? 0.05)) continue;
      const k = Math.min(1, (L - l0) / 0.15) * Math.min(1, (l1 - L) / 0.06 + 0.35);   // 띠 끝은 살살(흰 반짝임은 덜 물듦)
      return fromLch(L + (t.dl || 0), Math.max(C, t.tint[1] * k), t.tint[0]);
    }
    if (C < (t.c ?? 0.04) || !inHue(H, t.h)) continue;
    const dh = t.to - midOf(t.h);
    return fromLch(L + (t.dl || 0), C * (t.ck ?? 1), (H + dh + 360) % 360);
  }
  return null;
}
// 그림 칸 바꾸기(제자리) — keep = 그대로 둘 색(눈) · skip(r, g, b) = 그대로 둘 색인지(흙 덮기 무늬 — 화분 · 잔디 처리가 흙 색으로 찾음) · 같은 색은 한 번만 계산
export function recolorData(data, rule, keep = null, skip = null) {
  const memo = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    if (keep && keep.has(key)) continue;
    let v = memo.get(key);
    if (v === undefined) { v = skip && skip(data[i], data[i + 1], data[i + 2]) ? null : shinyColor(data[i], data[i + 1], data[i + 2], rule); memo.set(key, v); }
    if (v) { data[i] = v[0]; data[i + 1] = v[1]; data[i + 2] = v[2]; }
  }
}
// 눈 색: 깜빡임 장(blinkIndex~+3)과 같은 자세 대기 장(blinkAt~+3)에서 달라지는 칸 = 눈 — 그 색들 중 눈에서 주로 쓰이는 것(눈 밖보다 눈 안에 더 많음)
export function eyeKeep(data, sheetW, m) {
  const keep = new Set();
  if (m.blinkIndex == null) return keep;
  const inEye = new Map(), all = new Map(), at = (f, layer, x, y) => ((Math.floor(f / m.cols) * m.h + layer * m.rows * m.h + y) * sheetW + (f % m.cols) * m.w + x) * 4;
  for (let k = 0; k < 4; k++) for (const layer of [0, 1]) for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const a = at(m.blinkAt + k, layer, x, y), b = at(m.blinkIndex + k, layer, x, y);
    if (data[a + 3] < 128) continue;
    const key = (data[a] << 16) | (data[a + 1] << 8) | data[a + 2];
    all.set(key, (all.get(key) || 0) + 1);
    if (data[a] !== data[b] || data[a + 1] !== data[b + 1] || data[a + 2] !== data[b + 2] || data[a + 3] !== data[b + 3]) inEye.set(key, (inEye.get(key) || 0) + 1);
  }
  for (const [key, n] of inEye) if (n * 2 >= all.get(key)) keep.add(key);
  return keep;
}
