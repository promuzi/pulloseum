// 로그인 · 가입 흐름 확인(휴대폰 흉내 = 안드로이드 크롬 · 터치 · 팝업 차단 켬) — 2026-11-05 사용자 '구글 로그인 눌러도 그 다음으로 안 넘어가고 … 로딩만 되고'
//  먼저 로컬 서버(구글 단추가 보이게 클라이언트 ID = cf/wrangler.jsonc vars.GOOGLE_CLIENT_ID):
//    PULLO_GOOGLE_CLIENT_ID=<그 값> node server/index.mjs --port 8798 --db <임시 폴더>/login.db
//  node tools/shots/loginflow.mjs [주소=http://localhost:8798/v2/?mute=1] [시험 …]   (시험을 안 적으면 전부)
//   google = 전체 화면이 아닐 때 '구글로 계속하기' → 구글 창이 열림(전엔 전체 화면 요청이 누른 순간 허락을 써 버려 막혔음)
//   inapp  = 앱 안 브라우저(인스타그램 웹뷰) → 구글 단추 = 안내 창
//   block  = 구글 창이 막힘 → '구글 창이 막혔어요' 알림
//   hang   = 가입 확인(/api/check) 답이 안 옴 → 20초 뒤 '서버 답이 늦어요'
//   freeze = 가입 뒤 음악 시계가 멈춤 → 그래도 대기 화면으로
//   signup = 아이디 가입 끝까지
//  가입하는 시험(hang · freeze · signup)은 로컬 주소에서만 — 올린 서버에 계정을 만들지 않는다.
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), 'package.json'));
const puppeteer = require('puppeteer-core');
const args = process.argv.slice(2), URL = args.find(a => /^https?:/.test(a)) || 'http://localhost:8798/v2/?mute=1';
const ALL = ['google', 'inapp', 'block', 'hang', 'freeze', 'signup'], TESTS = args.filter(a => ALL.includes(a));
const local = /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(URL);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA_CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_INAPP = 'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android';

async function run(test) {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', ignoreDefaultArgs: ['--disable-popup-blocking'] });
  try {
    const page = await b.newPage();
    await page.setUserAgent(test === 'inapp' ? UA_INAPP : UA_CHROME);
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    if (test === 'hang') { await page.setRequestInterception(true); page.on('request', rq => { if (!rq.url().includes('/api/check')) rq.continue(); }); }
    await page.goto(URL, { waitUntil: 'load' });
    for (let i = 0; i < 160; i++) { if (await page.evaluate(() => !!(window.__ready && window.__app && window.__app.router.cur && window.__app.router.cur.mode === 'out'))) break; await sleep(250); }
    const center = id => page.evaluate(id => {
      const A = window.__app, S = A.screen, r = S.display.getBoundingClientRect(), TH = S.H + (S.oy || 0) + (S.ob || 0);
      const g = A.input.regions.find(x => x.id === id); if (!g || !g.fn) return null;
      return { x: r.left + (g.x + g.w / 2 + (S.ox || 0)) / S.W * r.width, y: r.top + (g.y + g.h / 2 + (S.oy || 0)) / TH * r.height };
    }, id);
    const waitRegion = async (id, ms = 20000) => { for (let t = 0; t < ms; t += 250) { const c = await center(id); if (c) return c; await sleep(250); } return null; };
    const state = () => page.evaluate(() => { const A = window.__app; return { scene: A.router.name, phase: A.router.phase || 0, form: document.querySelector('.pf-wrap') ? (document.querySelector('.pf-box h2') || {}).textContent : null, formErr: (document.querySelector('.pf-err') || {}).textContent || '', toast: A.toastMsg }; });
    await page.evaluate(() => { window.__toasts = []; const A = window.__app, t0 = A.toast.bind(A); A.toast = m => { window.__toasts.push(m); return t0(m); }; });
    await page.touchscreen.tap(200, 300); await sleep(300);   // 첫 누름 = 소리 풀기 · 전체 화면
    if (test === 'google' || test === 'inapp' || test === 'block') {
      const c = await waitRegion('title_google');
      if (!c) return [false, '구글 단추 없음(서버에 클라이언트 ID가 있나?)'];
      await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await sleep(400);   // 전체 화면이 아닌 채로 누름(뒤로 가기 · 창을 다녀온 뒤와 같음)
      await page.evaluate(block => { window.__opened = []; const wo = window.open; window.open = function (...a) { const w = block ? null : wo.apply(this, a); window.__opened.push(!!w); return w; }; }, test === 'block');
      await page.touchscreen.tap(c.x, c.y); await sleep(1500);
      const o = await page.evaluate(() => ({ opened: window.__opened, toasts: window.__toasts })), s = await state();
      if (test === 'google') return [o.opened.includes(true), '창 열림 ' + JSON.stringify(o.opened)];
      if (test === 'inapp') return [s.form === '구글 로그인' && !o.opened.length, '안내 창 ' + s.form];
      return [o.toasts.some(m => /막혔어요/.test(m)), '알림 ' + JSON.stringify(o.toasts)];
    }
    if (!local) return [false, '가입 시험은 로컬 주소에서만'];
    const c = await waitRegion('title_new');
    await page.touchscreen.tap(c.x, c.y); await sleep(800);
    const login = 'tst' + Date.now().toString(36);
    for (const [id, v] of [['login', login], ['pw', 'test1234'], ['pw2', 'test1234'], ['nick', '시험']]) { await page.tap('#pf-' + id); await page.type('#pf-' + id, v); }
    await page.tap('#pf-age');
    const t0 = Date.now();
    await page.tap('.pf-ok');
    for (let i = 0; i < 120; i++) { const s = await state(); if ((s.scene === 'starter' && !s.phase) || s.formErr) break; await sleep(250); }
    if (test === 'hang') { const s = await state(); return [/늦어요/.test(s.formErr), ((Date.now() - t0) / 1000).toFixed(1) + '초 · ' + s.formErr]; }
    const g = await waitRegion('st_go', 15000);
    if (!g) return [false, '처음 식물 고르기에 못 감 ' + JSON.stringify(await state())];
    if (test === 'freeze') await page.evaluate(async () => { const S = await import('/v2/src/core/sound.js'); const v = S.conductor.clock(); S.conductor.clock = () => v; });
    const t1 = Date.now();
    await page.touchscreen.tap(g.x, g.y);
    for (let i = 0; i < 80; i++) { const s = await state(); if (s.scene === 'home' && !s.phase) return [!errs.length, '대기 화면까지 ' + ((Date.now() - t1) / 1000).toFixed(1) + '초' + (errs.length ? ' · 오류 ' + errs[0] : '')]; await sleep(250); }
    return [false, '대기 화면에 못 감 ' + JSON.stringify(await state())];
  } finally { await b.close(); }
}

let bad = 0;
for (const t of TESTS.length ? TESTS : ALL) {
  if (!local && ['hang', 'freeze', 'signup'].includes(t)) { console.log(`- ${t}: 건너뜀(로컬 주소에서만)`); continue; }
  const [ok, why] = await run(t);
  if (!ok) bad++;
  console.log(`${ok ? '통과' : '실패'} ${t}: ${why}`);
}
console.log(bad ? `실패 ${bad}` : '모두 통과');
process.exit(bad ? 1 : 0);
