// 터치: 매 프레임 화면이 "누를 수 있는 영역"을 등록하고, 손을 뗀 위치의 맨 위 영역을 실행한다.
export class Input {
  constructor(screen) {
    this.screen = screen;
    this.regions = [];       // 이번 프레임에 등록된 영역(뒤에 등록된 것이 위)
    this.down = null;        // {x,y,id}
    this.pressedId = null;   // 눌린 버튼 표시용
    this.queue = [];
    this.drag = null;        // 세로 끌기(목록 스크롤)
    const el = screen.display;
    el.addEventListener('pointerdown', e => { const p = screen.toLogical(e.clientX, e.clientY); const r = this.hitAt(p.x, p.y); this.down = { ...p, id: r && r.id, y0: p.y, moved: false }; this.pressedId = r && r.id; });
    el.addEventListener('pointermove', e => {
      if (!this.down) return; const p = screen.toLogical(e.clientX, e.clientY);
      if (Math.abs(p.y - this.down.y0) > 4) { this.down.moved = true; this.pressedId = null; }
      if (this.down.moved) { this.queue.push({ type: 'drag', dy: p.y - this.down.y }); this.down.y = p.y; }
    });
    const up = e => {
      if (!this.down) return; const p = screen.toLogical(e.clientX, e.clientY);
      const r = this.hitAt(p.x, p.y);
      if (!this.down.moved && r && r.id === this.down.id) this.queue.push({ type: 'tap', region: r });
      this.down = null; this.pressedId = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { this.down = null; this.pressedId = null; });
  }
  begin() { this.regions = []; }
  // 영역 등록. pad = 보이는 크기보다 넓은 투명 터치 여유
  hit(id, x, y, w, h, fn, pad = 0) { this.regions.push({ id, x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, fn }); }
  hitAt(x, y) { for (let i = this.regions.length - 1; i >= 0; i--) { const r = this.regions[i]; if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r; } return null; }
  isPressed(id) { return this.pressedId === id; }
  flush(scene) {
    const q = this.queue; this.queue = [];
    for (const ev of q) {
      if (ev.type === 'tap' && ev.region.fn) ev.region.fn();
      else if (ev.type === 'drag' && scene && scene.onDrag) scene.onDrag(ev.dy);
    }
  }
}
