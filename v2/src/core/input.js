// 터치: 매 프레임 화면이 "누를 수 있는 영역"을 등록하고, 손을 뗀 위치의 맨 위 영역을 실행한다.
// 끌기: 4칸 넘게 움직이면 누르기 대신 끌기(drag: 이번 움직임 dx·dy + 시작점) → 손을 떼면 release(전체 dx·dy + 마지막 속도 vx·vy 칸/초)
import { unlock, tapSound } from './sound.js';
// 꾹: 움직이지 않고 누르고 있는 시간 = holdMs(). 장면이 claimHold()로 가져가면 손을 떼도 누르기(tap)가 안 나감(전투 기술 카드 뒷면 보기)
export class Input {
  constructor(screen) {
    this.screen = screen;
    this.regions = [];       // 이번 프레임에 등록된 영역(뒤에 등록된 것이 위)
    this.down = null;        // {x,y,id}
    this.pressedId = null;   // 눌린 버튼 표시용
    this.queue = [];
    const el = screen.display;
    const now = () => performance.now();
    el.addEventListener('pointerdown', e => {
      unlock();   // 브라우저는 사람이 한 번 눌러야 소리를 냄
      const p = screen.toLogical(e.clientX, e.clientY); const r = this.hitAt(p.x, p.y);
      this.down = { ...p, id: r && r.id, x0: p.x, y0: p.y, moved: false, held: false, t0: now(), hist: [{ t: now(), x: p.x, y: p.y }] }; this.pressedId = r && r.id;
      try { el.setPointerCapture(e.pointerId); } catch {}
    });
    el.addEventListener('pointermove', e => {
      if (!this.down) return; const p = screen.toLogical(e.clientX, e.clientY), d = this.down;
      if (Math.abs(p.y - d.y0) > 4 || Math.abs(p.x - d.x0) > 4) { d.moved = true; this.pressedId = null; }
      d.hist.push({ t: now(), x: p.x, y: p.y }); if (d.hist.length > 6) d.hist.shift();
      if (d.moved) { this.queue.push({ type: 'drag', dx: p.x - d.x, dy: p.y - d.y, x0: d.x0, y0: d.y0 }); d.x = p.x; d.y = p.y; }
    });
    const up = e => {
      unlock();   // 뗄 때만 소리를 허락하는 브라우저(iOS)도 있어 한 번 더
      if (!this.down) return; const p = screen.toLogical(e.clientX, e.clientY), d = this.down;
      const r = this.hitAt(p.x, p.y);
      if (!d.moved && !d.held && r && r.id === d.id) this.queue.push({ type: 'tap', region: r });
      if (d.moved) {
        const a = d.hist[0], b = d.hist[d.hist.length - 1], dt = Math.max(16, b.t - a.t);
        this.queue.push({ type: 'release', dx: p.x - d.x0, dy: p.y - d.y0, x0: d.x0, y0: d.y0, vx: (b.x - a.x) / dt * 1000, vy: (b.y - a.y) / dt * 1000 });
      }
      this.down = null; this.pressedId = null;
    };
    el.addEventListener('pointerup', up);
    // 브라우저가 터치를 가져가면(스크롤 등) 끌던 것도 놓은 것으로 — 안 그러면 장면이 끄는 중인 채로 멈춤(스마트팜 서랍 · 카드 끌기, 2026-10-17)
    el.addEventListener('pointercancel', () => {
      const d = this.down;
      if (d && d.moved) { const a = d.hist[0], b = d.hist[d.hist.length - 1], dt = Math.max(16, b.t - a.t); this.queue.push({ type: 'release', dx: d.x - d.x0, dy: d.y - d.y0, x0: d.x0, y0: d.y0, vx: (b.x - a.x) / dt * 1000, vy: (b.y - a.y) / dt * 1000 }); }
      this.down = null; this.pressedId = null;
    });
  }
  begin() { this.regions = []; this.marks = []; }
  // 그린 자리(꺼진 단추도) — 처음 안내가 가리킬 곳을 찾을 때(누르는 자리는 꺼진 단추엔 없음)
  mark(id, x, y, w, h) { this.marks.push({ id, x, y, w, h }); }
  // 영역 등록. pad = 보이는 크기보다 넓은 투명 터치 여유
  hit(id, x, y, w, h, fn, pad = 0) { this.regions.push({ id, x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, fn }); }
  hitAt(x, y) { for (let i = this.regions.length - 1; i >= 0; i--) { const r = this.regions[i]; if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r; } return null; }
  isPressed(id) { return this.pressedId === id; }
  holdMs() { const d = this.down; return d && !d.moved && !d.held ? performance.now() - d.t0 : 0; }
  claimHold() { if (this.down) this.down.held = true; this.pressedId = null; }
  get holding() { return !!(this.down && this.down.held); }
  get dragging() { return !!(this.down && this.down.moved); }
  flush(scene) {
    const q = this.queue; this.queue = [];
    for (const ev of q) {
      if (ev.type === 'tap' && ev.region.fn) { tapSound(ev.region.id); ev.region.fn(); }
      else if (ev.type === 'drag' && scene && scene.onDrag) scene.onDrag(ev.dy, ev.dx, ev);
      else if (ev.type === 'release' && scene && scene.onRelease) scene.onRelease(ev);
    }
  }
}
