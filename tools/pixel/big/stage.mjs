// 전투 무대 — v2 전투 화면 배치를 1배 도트로(논리 270 × 무대 348): 나 = 왼쪽 아래(가까움), 상대 = 오른쪽 위(멂·좌우 뒤집힘)가 비스듬히 마주 본다.
// 바닥은 화분(pot3d)과 같은 26° 내려다본 정사영 — 바닥 위 원은 세로 = 가로 × k 인 타원이고, 화면에서 위로 갈수록 멀다.
// 화분은 굽이 바닥에 닿는 원의 가운데(BASE_GEO)를 받침 가운데에 맞춰 세운다. 바닥을 타는 효과는 이 평면 위 좌표로 그린다(attack.mjs).
import { Img, rng } from './engine.mjs';
import { BASE_GEO as B } from './pot3d.mjs';

export const SW = 270, SH = 348, K = B.k;
// 받침 가운데 = 화분 굽이 닿는 점(v2 battle.js 의 받침 자리를 2배 → 1배로)
export const SPOTS = { near: { base: [76, 302], pad: [42, 1] }, far: { base: [194, 142], pad: [40, 0] } };
// 화분 그림(96×112) 왼쪽 위 — 굽 가운데가 받침 가운데에 오게
export const spriteAt = base => [Math.round(base[0] - B.cx), Math.round(base[1] - B.cy)];
// 바닥 원 위 점: 가운데 c, 반지름 r(가로 칸), 각 phi(0 = 오른쪽, π/2 = 보는 쪽)
export const onRing = (c, r, phi) => [c[0] + Math.cos(phi) * r, c[1] + Math.sin(phi) * r * K];
// a 화분 굽에서 b 쪽을 보는 바닥 각 — 화분 뒤 반쪽(안 보임)이면 옆(오른쪽·왼쪽)으로 당겨 출발·도착이 보이게
export function sideAngle(a, b) {
  const phi = Math.atan2((b[1] - a[1]) / K, b[0] - a[0]);
  return Math.sin(phi) < 0 ? (Math.cos(phi) >= 0 ? 0 : Math.PI) : phi;
}

function px(im, x, y, col) { im.set(Math.floor(x), Math.floor(y), col); }
function rect(im, x, y, w, h, col) { im.fill(x, y, w, h, col); }
function ellipse(im, cx, cy, rx, ry, col) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) px(im, x, y, col);
}
function ellipseRing(im, cx, cy, rx, ry, col, t = 1) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const o = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2, i = ((x + 0.5 - cx) / (rx - t)) ** 2 + ((y + 0.5 - cy) / Math.max(0.5, ry - t * ry / rx)) ** 2;
    if (o <= 1 && i > 1) px(im, x, y, col);
  }
}
function line(im, x0, y0, x1, y1, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) px(im, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), col);
}

// 무대 바탕: 하늘·관중석·벽·돌판 바닥(원근 줄·가운데 큰 원)·받침 둘 — v2 bg.js arena 를 1배로 옮김
export function stageBg() {
  const im = new Img(SW, SH, '#2e222f');
  const sky = ['#1f1828', '#2e222f', '#3a2a48'];
  for (let y = 0; y < 92; y++) for (let x = 0; x < SW; x++) { const b = Math.min(2, Math.floor((y + ((x + y) % 2) * 2) / 30)); px(im, x, y, sky[b]); }
  const R = rng(31);
  for (let i = 0; i < 70; i++) { const x = Math.floor(R() * SW), y = Math.floor(R() * 50), k = R(); px(im, x, y, k < 0.15 ? '#fbff86' : k < 0.5 ? '#c7dcd0' : '#7f708a'); }
  for (const lx of [20, SW - 26]) { rect(im, lx, 12, 6, 40, '#2e222f'); rect(im, lx - 4, 8, 14, 6, '#625565'); rect(im, lx - 2, 10, 10, 2, '#fbff86'); }
  const sy = 52;
  for (let row = 0; row < 4; row++) {
    const yy = sy + row * 10, R2 = rng(40 + row);
    rect(im, 0, yy, SW, 10, row % 2 ? '#3a2f45' : '#45293f');
    rect(im, 0, yy, SW, 1, '#2e222f');
    for (let x = 2; x < SW; x += 5) { if (R2() < 0.55) { const col = ['#625565', '#7f708a', '#a24b6f', '#4d65b4', '#0b8a8f'][Math.floor(R2() * 5)]; rect(im, x, yy + 3, 2, 2, col); rect(im, x, yy + 5, 2, 1, '#2e222f'); } }
  }
  const wy = 92;
  rect(im, 0, wy, SW, 12, '#625565'); rect(im, 0, wy, SW, 1, '#9babb2'); rect(im, 0, wy + 11, SW, 1, '#2e222f');
  for (let x = 8; x < SW; x += 24) rect(im, x, wy + 4, 12, 4, '#7f708a');
  const fy = wy + 12;
  rect(im, 0, fy, SW, SH - fy, '#4a3d58');
  for (let k = 0; k < 12; k++) { const yy = fy + Math.round(2 * (k * k * 1.15 + k * 2)); if (yy < SH) rect(im, 0, yy, SW, 1, '#3e3546'); }
  const cx = SW / 2;
  for (let i = -8; i <= 8; i++) line(im, Math.round(cx + i * 18), fy, Math.round(cx + i * 60), SH, '#3e3546');
  ellipseRing(im, cx, fy + (SH - fy) * 0.5, 108, 108 * K, '#625565', 2);
  for (const [name, s] of Object.entries(SPOTS)) {
    const [bx, by] = s.base, rx = s.pad[0], ry = rx * K;
    ellipse(im, bx, by + 2, rx + 1, ry + 1, '#2e222f');
    ellipse(im, bx, by, rx, ry, '#625565');
    ellipse(im, bx, by, rx - 2, ry - 2, '#7f708a');
    if (name === 'near') ellipseRing(im, bx, by, rx - 2, ry - 2, '#30e1b9');
  }
  return im;
}
