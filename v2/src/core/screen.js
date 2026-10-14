// 화면 = 논리 크기(가로 256~300 칸) 기준으로 그리되, 캔버스는 기기 해상도로 둔다.
// 그림(도트)은 정수 칸 위치에만 그려서 정확히 s배 정사각형이 되고, 글자는 기기 해상도로 매끈하게 그려진다.
export const MIN_W = 256, MAX_W = 300, MIN_H = 480, MAX_H = 660;

export function pickLayout(devW, devH) {
  for (let s = 10; s >= 1; s--) {
    const W = Math.floor(devW / s), H = Math.floor(devH / s);
    if (W >= MIN_W && H >= MIN_H) return { s, W: Math.min(W, MAX_W), H: Math.min(H, MAX_H) };
  }
  return { s: 1, W: Math.min(devW, MAX_W), H: Math.min(devH, MAX_H) };
}

export class Screen {
  constructor(displayCanvas) {
    this.display = displayCanvas;
    this.ctx = displayCanvas.getContext('2d');
    this.W = 270; this.H = 600; this.s = 1;
    this.fixed = null;
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const devW = Math.round(window.innerWidth * dpr), devH = Math.round(window.innerHeight * dpr);
    const L = this.fixed || pickLayout(devW, devH);
    this.W = L.W; this.H = L.H; this.s = L.s;
    this.display.width = L.W * L.s; this.display.height = L.H * L.s;
    this.display.style.width = (L.W * L.s / dpr) + 'px';
    this.display.style.height = (L.H * L.s / dpr) + 'px';
    this.begin();
  }
  // 매 프레임 시작: 논리 좌표 → 기기 화소 배율 고정, 그림은 번짐 없이
  begin() {
    this.ctx.setTransform(this.s, 0, 0, this.s, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }
  present() {}
  toLogical(clientX, clientY) {
    const r = this.display.getBoundingClientRect();
    return { x: Math.floor((clientX - r.left) / r.width * this.W), y: Math.floor((clientY - r.top) / r.height * this.H) };
  }
}
