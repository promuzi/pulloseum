// 터치: 매 프레임 화면이 "누를 수 있는 영역"을 등록하고, 손을 뗀 위치의 맨 위 영역을 실행한다.
// 끌기: 4칸 넘게 움직이면 누르기 대신 끌기(drag: 이번 움직임 dx·dy + 시작점) → 손을 떼면 release(전체 dx·dy + 마지막 속도 vx·vy 칸/초)
import { unlock, tapSound } from './sound.js';
// 휴대폰 브라우저 전체 화면(2026-10-17 사용자 "모바일 위의 바와 아래의 홈 버튼이 남아 있어" → "여전히 웹에서 전체화면이 안 되는데"):
//  브라우저는 사람이 누른 순간에만 허락하는데, 손가락 터치는 '뗄 때'(pointerup)만 그 순간으로 침 — 전엔 누를 때(pointerdown) 처음 한 번만 요청해서 늘 거절됐음.
//  → 뗄 때마다(전체 화면이 아니면 · 2.5초에 한 번) 요청 · 사용자가 전체 화면을 두 번 빠져나오면 그만. 앱(웹뷰)은 MainActivity가 바를 숨김 · 손가락 화면(터치)만 ·
//  아이폰 사파리는 웹페이지 전체 화면이 없음(홈 화면에 추가 = index.html 앱 정보로 주소창 없이)
let fullT = -1e9, fullExit = 0, wasFull = false;
try { document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; if (wasFull && !on) fullExit++; wasFull = on; }); } catch {}
function goFull() {
  try {
    const inApp = /PulloseumApp/.test(navigator.userAgent) || !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    if (inApp || !matchMedia('(pointer: coarse)').matches || document.fullscreenElement || document.webkitFullscreenElement || fullExit >= 2) return;
    if (matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) return;   // 홈 화면 앱으로 열림 = 이미 주소창 없음
    const now = performance.now(); if (now - fullT < 2500) return; fullT = now;
    const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    const r = rq && rq.call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {});
  } catch {}
}
// 꾹: 움직이지 않고 누르고 있는 시간 = holdMs(). 장면이 claimHold()로 가져가면 손을 떼도 누르기(tap)가 안 나감(전투 기술 카드 뒷면 보기)
export class Input {
  constructor(screen) {
    this.screen = screen;
    this.regions = [];       // 이번 프레임에 등록된 영역(뒤에 등록된 것이 위)
    this.down = null;        // {x,y,id}
    this.pressedId = null;   // 눌린 버튼 표시용
    this.queue = [];
    this.act = -1e9;          // 마지막으로 만진 시각(main.js 장 수 — 만지는 중 · 막 뗀 뒤 = 1초 60장)
    const el = screen.display;
    const now = () => performance.now();
    el.addEventListener('pointerdown', e => {
      this.act = now();
      unlock();   // 브라우저는 사람이 한 번 눌러야 소리를 냄
      const p = screen.toLogical(e.clientX, e.clientY); const r = this.hitAt(p.x, p.y);
      this.down = { ...p, id: r && r.id, x0: p.x, y0: p.y, moved: false, held: false, t0: now(), hist: [{ t: now(), x: p.x, y: p.y }] }; this.pressedId = r && r.id;
      try { el.setPointerCapture(e.pointerId); } catch {}
    });
    el.addEventListener('pointermove', e => {
      if (!this.down) return; this.act = now(); const p = screen.toLogical(e.clientX, e.clientY), d = this.down;
      if (Math.abs(p.y - d.y0) > 4 || Math.abs(p.x - d.x0) > 4) { d.moved = true; this.pressedId = null; }
      d.hist.push({ t: now(), x: p.x, y: p.y }); if (d.hist.length > 6) d.hist.shift();
      if (d.moved) { this.queue.push({ type: 'drag', dx: p.x - d.x, dy: p.y - d.y, x0: d.x0, y0: d.y0 }); d.x = p.x; d.y = p.y; }
    });
    const up = e => {
      this.act = now();
      unlock();   // 뗄 때만 소리를 허락하는 브라우저(iOS)도 있어 한 번 더
      goFull();   // 휴대폰 브라우저 전체 화면(뗄 때 = 터치가 허락받는 순간)
      if (!this.down) return; const p = screen.toLogical(e.clientX, e.clientY), d = this.down;
      const r = this.hitAt(p.x, p.y);
      // now 영역(구글 로그인 창 등)은 다음 그림 장까지 미루지 않고 이 뗀 순간에 바로 — 아이폰 사파리는 사람이 누른 그 순간(이벤트 안)에 연 창만 허락함(2026-10-22, 전엔 다음 장에서 열어 막혔음)
      if (!d.moved && !d.held && r && r.id === d.id) { if (r.now && r.fn) { tapSound(r.id); r.fn(); } else this.queue.push({ type: 'tap', region: r }); this.flash = { id: r.id, t: now() }; }
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
  hit(id, x, y, w, h, fn, pad = 0, now = false) { this.regions.push({ id, x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, fn, now }); }
  hitAt(x, y) { for (let i = this.regions.length - 1; i >= 0; i--) { const r = this.regions[i]; if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r; } return null; }
  isPressed(id) { return this.pressedId === id || (!!this.flash && this.flash.id === id && performance.now() - this.flash.t < 160); }   // 누른 뒤 0.16초는 눌린 모양(2026-10-17)
  holdMs() { const d = this.down; return d && !d.moved && !d.held ? performance.now() - d.t0 : 0; }
  claimHold() { if (this.down) this.down.held = true; this.pressedId = null; }
  get holding() { return !!(this.down && this.down.held); }
  get dragging() { return !!(this.down && this.down.moved); }
  // 누르고 있거나 막 만진 뒤(1.2초 — 끌기를 놓은 뒤 미끄러지는 동안까지)
  busy(ms = 1200) { return !!this.down || performance.now() - this.act < ms; }
  flush(scene) {
    const q = this.queue; this.queue = [];
    for (const ev of q) {
      if (ev.type === 'tap' && ev.region.fn) { tapSound(ev.region.id); ev.region.fn(); }
      else if (ev.type === 'drag' && scene && scene.onDrag) scene.onDrag(ev.dy, ev.dx, ev);
      else if (ev.type === 'release' && scene && scene.onRelease) scene.onRelease(ev);
    }
  }
}
