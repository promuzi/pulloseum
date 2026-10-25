// 상자 속 가운데 점검(2026-10-25 사용자 "글자랑 아이콘이 상자안에서 중앙보다 조금 더 위에 있는 느낌 · 항상 이런 문제" → "ㅇㅇ해줘"):
//  촬영 목록(v2shots.mjs SHOTS)의 화면을 그리며 상자(유리판 holo · 둥근 상자 rrect · 꺾인 상자 cham)와 그 안 글자 · 아이콘의 '실제 잉크' 위치를 기록 →
//  한 줄짜리 상자마다 위 틈 · 아래 틈을 재서 1칸 이상 어긋난 곳을 그린 코드 줄과 함께 보고. 글자 잉크 = 그 글자의 measureText, 아이콘 잉크 = 투명하지 않은 줄.
// 사용: node tools/shots/centercheck.mjs [--only home,battle] [--min 2] [--json out.json]
//  --min = 위 틈 − 아래 틈(논리 칸)이 이만큼 이상이면 보고(기본 2 = 1칸 어긋남). 양수 = 내용이 아래로 · 음수 = 위로.
import { createRequire } from 'node:module';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
import { SHOTS } from './v2shots.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const only = args.only ? String(args.only).split(',') : null;
const MIN = +(args.min || 2), K = 2;
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));

// 페이지 쪽 기록기(게임 스크립트보다 먼저)
function recorder() {
  const A = window.__aud = { on: false, ev: [] };
  const P = CanvasRenderingContext2D.prototype, fillText0 = P.fillText, drawImage0 = P.drawImage;
  const at = () => { for (const ln of new Error().stack.split('\n').slice(2)) { const m = ln.match(/\/v2\/src\/([^:]+):(\d+):\d+/); if (m && !/^core\/(text|gfx)\.js$/.test(m[1])) return m[1] + ':' + m[2]; } return '?'; };
  const dev = (ctx, x, y, w, h) => { const t = ctx.getTransform(); return { x: t.a * x + t.e, y: t.d * y + t.f, w: t.a * w, h: t.d * h }; };
  const key = ctx => ctx.canvas.width + 'x' + ctx.canvas.height;
  globalThis.__boxAudit = (ctx, x, y, w, h, kind) => { if (A.on) A.ev.push(kind === 'bar' ? { k: 'r', c: key(ctx), s: '막대', ...dev(ctx, x, y, w, h), at: at() } : { k: 'b', c: key(ctx), ...dev(ctx, x, y, w, h) }); };
  P.fillText = function (s, x, y, ...r) {
    if (A.on && this.globalAlpha > 0.05) {
      const m = this.measureText(s), L = x - m.actualBoundingBoxLeft, R = x + m.actualBoundingBoxRight, T = y - m.actualBoundingBoxAscent, B = y + m.actualBoundingBoxDescent;
      A.ev.push({ k: 't', c: key(this), s: String(s), ...dev(this, L, T, R - L, B - T), at: at() });
    }
    return fillText0.call(this, s, x, y, ...r);
  };
  const inkCache = new WeakMap();
  function inkRows(src, sx, sy, sw, sh) {   // 소스 사각형 안에서 투명하지 않은 첫 줄 · 끝 줄(없으면 null)
    let d = inkCache.get(src);
    if (d === undefined) {
      const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
      if (!w || !h || w * h > 300 * 300) d = null;
      else { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); drawImage0.call(c, src, 0, 0); try { d = { w, h, a: c.getImageData(0, 0, w, h).data }; } catch (e) { d = null; } }
      inkCache.set(src, d);
    }
    if (!d) return null;
    let top = -1, bot = -1, left = 1e9, right = -1;
    for (let y = Math.max(0, sy | 0); y < Math.min(d.h, (sy + sh) | 0); y++) for (let x = Math.max(0, sx | 0); x < Math.min(d.w, (sx + sw) | 0); x++) if (d.a[(y * d.w + x) * 4 + 3] > 40) { if (top < 0) top = y; bot = y; if (x < left) left = x; if (x > right) right = x; }
    return top < 0 ? null : { top: top - sy, bot: bot - sy + 1, left: left - sx, right: right - sx + 1 };
  }
  P.drawImage = function (src, ...a) {
    if (A.on && this.globalAlpha > 0.05 && src) {
      const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
      let sx = 0, sy = 0, sw = w0, sh = h0, dx, dy, dw = w0, dh = h0;
      if (a.length === 2) [dx, dy] = a; else if (a.length === 4) [dx, dy, dw, dh] = a; else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
      if (src.__holo) A.ev.push({ k: 'b', c: key(this), ...dev(this, dx, dy, dw, dh) });
      else if (dw <= 80 && dh <= 80) {
        const ink = inkRows(src, sx, sy, sw, sh), kx = dw / sw, ky = dh / sh;
        if (ink) A.ev.push({ k: 'i', c: key(this), ...dev(this, dx + ink.left * kx, dy + ink.top * ky, (ink.right - ink.left) * kx, (ink.bot - ink.top) * ky), at: at(), s: `그림 ${sw}×${sh}` });
      }
    }
    return drawImage0.call(this, src, ...a);
  };
}

// 화면 하나의 기록 → 어긋난 한 줄 상자
function analyse(ev, canvasKey, id) {
  const E = ev.filter(e => e.c === canvasKey).map((e, i) => ({ ...e, i }));
  // 글자 그림자(같은 글자 · 같은 x · 1~2칸 아래 · 바로 앞)는 하나로
  const items = [];
  for (const e of E) {
    if (e.k === 'b') continue;
    const prev = items[items.length - 1];
    if (prev && e.k === 't' && prev.k === 't' && prev.s === e.s && Math.abs(prev.x - e.x) < 1 && Math.abs(prev.y - e.y) <= 2 * K + 0.5) { items[items.length - 1] = e; continue; }
    items.push(e);
  }
  const boxes = E.filter(e => e.k === 'b' && e.w >= 8 * K && e.h >= 8 * K);
  const tol = 0.6 * K, byBox = new Map();
  for (const it of items) {
    let best = null;
    for (const b of boxes) {
      if (b.i > it.i) break;
      if (it.x >= b.x - tol && it.x + it.w <= b.x + b.w + tol && it.y >= b.y - tol && it.y + it.h <= b.y + b.h + tol) best = b;   // 담는 상자 = 내용 바로 전에 그려진(맨 위에 놓인) 것
    }
    if (best) { if (!byBox.has(best)) byBox.set(best, []); byBox.get(best).push(it); }
  }
  const out = [];
  for (const [b, list] of byBox) {
    const top = Math.min(...list.map(e => e.y)), bot = Math.max(...list.map(e => e.y + e.h));
    if (Math.max(...list.map(e => e.y)) >= Math.min(...list.map(e => e.y + e.h))) continue;   // 한 줄이 아님(여러 줄 · 그림 + 글자 위아래)
    const band = (bot - top) / K, bh = b.h / K;
    if (bh > 60 || bh > band + 30) continue;   // 큰 판(제목만 위에 있는 창 등)
    const gTop = (top - b.y) / K, gBot = (b.y + b.h - bot) / K, d = gTop - gBot;
    if (Math.abs(d) >= MIN) out.push({ id, box: [b.x / K, b.y / K, b.w / K, b.h / K].map(v => Math.round(v * 10) / 10), gTop: Math.round(gTop * 10) / 10, gBot: Math.round(gBot * 10) / 10, d: Math.round(d * 10) / 10, what: list.map(e => e.s).join(' | ').slice(0, 60), at: [...new Set(list.map(e => e.at))].join(' ') });
  }
  return out;
}

const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const all = [];
try {
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(recorder);
  await p.goto(url + '/v2/index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  for (const [id, scene, params, opt] of SHOTS) {
    if (only && !only.includes(id) && !only.includes(scene)) continue;
    if (scene === 'icons' || scene === 'cardlab' || scene === 'fxlab') continue;   // 검토판
    const o = opt || {}, key = `${(o.W || 270) * K}x${(o.H || 600) * K}`;
    const ev = await p.evaluate((scene, params, o) => { window.__aud.ev = []; window.__aud.on = true; try { window.__shot(scene, params, o); } finally { window.__aud.on = false; } return window.__aud.ev; }, scene, params, { ...o, scale: K });
    all.push(...analyse(ev, key, id));
  }
} finally { await b.close(); srv.close(); }

// 코드 줄마다 묶어 보고(같은 줄이 여러 화면에서 같은 만큼 어긋나면 한 번)
const byAt = new Map();
for (const r of all) { const k = r.at; if (!byAt.has(k)) byAt.set(k, []); byAt.get(k).push(r); }
const rows = [...byAt.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`어긋난 한 줄 상자 ${all.length}곳 · 코드 줄 ${rows.length}곳 (d = 위 틈 − 아래 틈 · 음수 = 내용이 위로 · 양수 = 아래로)`);
for (const [at, list] of rows) {
  const ds = [...new Set(list.map(r => r.d))].sort((a, b) => a - b);
  console.log(`\n${at}  ×${list.length}  d = ${ds.join(', ')}`);
  for (const r of list.slice(0, 3)) console.log(`   ${r.id}  상자 ${r.box.join(',')}  위 ${r.gTop} · 아래 ${r.gBot}  「${r.what}」`);
}
if (args.json) writeFileSync(resolve(String(args.json)), JSON.stringify(all, null, 1));
