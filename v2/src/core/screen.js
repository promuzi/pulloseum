// 화면 = 논리 크기(가로 256~300 칸) 기준으로 그리되, 캔버스는 기기 해상도로 둔다.
// 그림(도트)은 정수 칸 위치에만 그려서 정확히 s배 정사각형이 되고, 글자는 기기 해상도로 매끈하게 그려진다.
//  폭 하한 270 = 장면이 늘 270칸으로 그려짐(main.js 화면 틀 — 더 넓으면 가운데 + 양옆 이어 그림). 높이 480~599는 장면마다 아래를 바닥에 붙여 맞춤
// 안전 여백(2026-10-17 사용자 "맨 위의 바는 핸드폰의 카메라가 있어 특히 중앙에 — 다른 게임은 여기를 비워 놓아 · 상단 왼쪽 오른쪽은 둥글어서 여기도 피해"):
//  기기가 알려 주는 여백(CSS env(safe-area-inset-*) — 아이폰 노치 · 다이내믹 아일랜드 · 홈 막대, 전체 화면 크롬의 카메라 구멍) +
//  앱(전체 화면 · 카메라 구멍 자리까지 그림 — MainActivity SHORT_EDGES)은 웹뷰가 여백을 안 알려 줄 수 있어 위 26px은 늘 비움.
//  oy · ob = 위 · 아래 여백(논리 칸) — 장면은 그 사이(H)에만 그리고, 위 띠는 어둡게 비움 · 아래는 끝 줄을 늘여 이음(main.js 화면 틀)
export const MIN_W = 270, MAX_W = 300, MIN_H = 480, MAX_H = 660, APP_TOP = 26;

export function pickLayout(devW, devH) {
  for (let s = 10; s >= 1; s--) {
    const W = Math.floor(devW / s), H = Math.floor(devH / s);
    if (W >= MIN_W && H >= MIN_H) return { s, W: Math.min(W, MAX_W), H: Math.min(H, MAX_H) };
  }
  return { s: 1, W: Math.min(devW, MAX_W), H: Math.min(devH, MAX_H) };
}
// 기기가 알려 주는 여백(CSS px) — 숨긴 재기 칸의 안쪽 여백으로 읽음
let probe = null;
function safeInsets() {
  try {
    if (!probe) { probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)'; document.body.appendChild(probe); }
    const cs = getComputedStyle(probe);
    return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  } catch { return { top: 0, bottom: 0 }; }
}
const inApp = () => /PulloseumApp/.test(navigator.userAgent) || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

export class Screen {
  constructor(displayCanvas) {
    this.display = displayCanvas;
    this.ctx = displayCanvas.getContext('2d');
    this.W = 270; this.H = 600; this.s = 1; this.oy = 0; this.ob = 0;
    this.fixed = null;
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const devW = Math.round(window.innerWidth * dpr), devH = Math.round(window.innerHeight * dpr);
    if (!this.fixed) {
      const sa = safeInsets(), topCss = Math.max(sa.top, inApp() ? APP_TOP : 0), topDev = Math.round(topCss * dpr), botDev = Math.round(sa.bottom * dpr);
      const L = pickLayout(devW, devH - topDev - botDev);
      this.W = L.W; this.H = L.H; this.s = L.s;
      this.oy = topDev ? Math.ceil(topDev / L.s) : 0; this.ob = botDev ? Math.ceil(botDev / L.s) : 0;
    } else { this.W = this.fixed.W; this.H = this.fixed.H; this.s = this.fixed.s; }
    const TH = this.H + this.oy + this.ob;   // 캔버스 전체 높이(논리 칸)
    this.display.width = this.W * this.s; this.display.height = TH * this.s;
    this.display.style.width = (this.W * this.s / dpr) + 'px';
    this.display.style.height = (TH * this.s / dpr) + 'px';
    this.begin();
  }
  // 매 프레임 시작: 논리 좌표 → 기기 화소 배율 고정, 그림은 번짐 없이
  begin() {
    this.ctx.setTransform(this.s, 0, 0, this.s, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }
  present() {}
  toLogical(clientX, clientY) {
    const r = this.display.getBoundingClientRect(), TH = this.H + (this.oy || 0) + (this.ob || 0);
    return { x: Math.floor((clientX - r.left) / r.width * this.W) - (this.ox || 0), y: Math.floor((clientY - r.top) / r.height * TH) - (this.oy || 0) };   // ox = 가운데 맞춘 장면의 왼쪽 여백 · oy = 위 안전 여백
  }
}
