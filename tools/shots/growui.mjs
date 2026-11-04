// 물 · 접목 · 지운 기술 화면 확인(2026-11-04 사용자 '물주기만 주고 꾹 누르면 연속으로' · '지금 가지 접목 등 ui가 별로임 다듬자'):
//  오프라인 판에서 ① 식물 관리 물 단추를 꾹 = 이어 주기(물이 줄고 생장이 오름 · 고르기 창 · 진화 때가 되면 멈춤) ② 접목 가지 = 카드 → 누름 = 뒷면 + [접목] → 고르기 창
//  ③ 지운 기술 = 카드 → 뒷면 + [되돌리기] · 촬영 = tools/shots/out/growui/*.png
//   node tools/shots/growui.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const repo = resolve(here, '..', '..'), out = resolve(here, 'out', 'growui'); mkdirSync(out, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('실패:', m); } };
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setViewport({ width: 270, height: 600, deviceScaleFactor: 3 });
  await p.goto(url + '/v2/index.html?offline=1&noguide', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__app && window.__app.state, { timeout: 15000 });
  const E = (fn, ...a) => p.evaluate(fn, ...a);
  const adv = ms => E(ms => window.__advance(ms), ms);
  const press = id => E(id => { const A = window.__app; const rg = A.input.regions.filter(x => x.id === id).pop(); if (!rg || !rg.fn) return false; rg.fn(); return true; }, id);
  const shot = async name => { await adv(60); writeFileSync(resolve(out, name + '.png'), await p.screenshot()); };
  // ① 물 꾹: 새싹 Lv1 · 물 40 → 단추를 누른 채(손가락 내려 둠) 2초
  const uid = await E(() => { const A = window.__app, s = A.state, pl = s.plants[s.active || 0]; pl.stage = 0; pl.lv = 1; pl.gxp = 0; pl.drafts = []; s.items.water = 30; A.router.set('plant', { tab: 'skill' }); return pl.uid; });
  await adv(900);
  const st = () => E(uid => { const A = window.__app, pl = A.state.plants.find(x => x.uid === uid); return { w: A.state.items.water, lv: pl.lv, gxp: pl.gxp, draft: !!A.draft }; }, uid);
  const s0 = await st();
  // 막 누른 때(꾹 시각은 진짜 시계라 페이지의 실제 그림 장이 그사이 돌아도 꾹이 되지 않게 미래로 — __advance 는 화면 시각만 넘김)
  const down = () => E(() => { const A = window.__app, r = A.input.regions.filter(x => x.id === 'pl_w').pop(); if (!r) return false; A.input.down = { x: r.x + r.w / 2, y: r.y + r.h / 2, id: 'pl_w', x0: r.x + r.w / 2, y0: r.y + r.h / 2, moved: false, held: false, t0: performance.now() + 60000, hist: [] }; A.input.pressedId = 'pl_w'; return true; });
  ok(await down(), '물 단추가 있음(pl_w)');
  await adv(300);
  const s1 = await st();
  ok(s1.w === s0.w, `막 누른 때 = 아직 이어 주지 않음(물 ${s0.w} → ${s1.w})`);
  await E(() => { window.__app.input.down.t0 = performance.now() - 400; });   // 꾹 시작(0.35초 넘김)
  await adv(1000);
  const s2 = await st();
  ok(s2.w < s0.w - 3, `꾹 1초 = 물이 이어서 줄어듦(${s0.w} → ${s2.w})`);
  ok(s2.lv > s0.lv || s2.gxp > s0.gxp, `생장이 오름(Lv${s0.lv} ${s0.gxp} → Lv${s2.lv} ${s2.gxp})`);
  await shot('01_pour_hold');
  await adv(4000);
  const s3 = await st();
  ok(s3.draft || s3.lv >= 6 || s3.w === 0, `계속 누르면 고르기 창 · 진화 때 · 물 다 씀에서 멈춤(물 ${s3.w} · Lv${s3.lv} · 고르기 ${s3.draft})`);
  const w3 = s3.w; await adv(600);
  ok((await st()).w === w3, '멈춘 뒤엔 더 안 줌');
  await E(() => { window.__app.input.down = null; window.__app.input.pressedId = null; window.__app.draft = null; });
  await adv(200);
  // ② 접목 가지 = 카드 · 같은 기술 가지 둘 = '×2' · 누름 = 뒷면 + [접목]
  const sc = await E(uid => {
    const A = window.__app, s = A.state, pl = s.plants.find(x => x.uid === uid);
    return { key: pl.key, scions: s.scions.length };
  }, uid);
  await E(() => { const A = window.__app; A.router.set('plant', { tab: 'skill', sub: 'graft' }); });
  await adv(900);
  const cards = await E(() => window.__app.input.regions.filter(r => r.id.startsWith('skc_gf:')).map(r => r.id));
  ok(cards.length >= 1, `접목 가지 카드 ${cards.length}장(가진 가지 ${sc.scions})`);
  await shot('02_graft_cards');
  if (cards.length) {
    ok(await press(cards[0]), '접목 카드 누름'); await adv(700);
    const act = await E(() => { const r = window.__app.input.regions.filter(x => x.id === 'peek_act').pop(); return !!r; });
    ok(act, '뒷면 아래 [접목] 단추');
    await shot('03_graft_peek');
    const n0 = await E(() => window.__app.state.scions.length), want = cards[0].slice('skc_gf:'.length);
    ok(await press('peek_act'), '[접목] 누름'); await adv(900);
    const got = await E((uid, sk) => { const A = window.__app, pl = A.state.plants.find(x => x.uid === uid); return { draft: !!A.draft, on: [...pl.skills.battle, ...pl.skills.store].includes(sk), toast: A.toastMsg }; }, uid, want);
    ok(!got.draft && got.on, `접목 = 바로 배움(고르기 창 없음 · ${got.toast})`);   // 2026-11-04 사용자 '접목하면 바로 작동'
    ok((await E(() => window.__app.state.scions.length)) === n0 - 1, '가지 하나를 씀');
    await shot('04_graft_done');
  }
  // ③ 지운 기술 = 카드 · 누름 = 뒷면 + [되돌리기](회귀 주사 · 빈 칸 있음)
  await E(uid => { const A = window.__app, s = A.state, pl = s.plants.find(x => x.uid === uid); s.items.regress = 2; if (!pl.skills.forgot.length) pl.skills.forgot.push('f_ball', 'w_gun'); pl.skills.store = pl.skills.store.slice(0, 4); A.router.set('plant', { tab: 'skill', sub: 'forgot' }); }, uid);
  await adv(900);
  const fcards = await E(() => window.__app.input.regions.filter(r => r.id.startsWith('skc_fg:')).map(r => r.id));
  ok(fcards.length >= 1, `지운 기술 카드 ${fcards.length}장`);
  await shot('05_forgot_cards');
  if (fcards.length) {
    ok(await press(fcards[0]), '지운 기술 카드 누름'); await adv(700);
    ok(await E(() => window.__app.input.regions.some(x => x.id === 'peek_act')), '뒷면 아래 [되돌리기] 단추');
    await shot('06_forgot_peek');
    ok(await press('peek_act'), '[되돌리기] 누름'); await adv(200);
    ok(await E(() => !!window.__app.confirm), '되돌리기 확인 창');
    await E(() => { window.__app.confirm = null; });
  }
  // ④ 가방 · 접목 가지 = 카드(같은 기술 둘 = ×2) → 누름 = 누구에게?(배울 수 있는 식물만 — 가방에서만 식물을 고름) → [접목] = 바로 배움
  await E(() => { const A = window.__app, s = A.state; if (s.scions[0]) s.scions.push({ id: 'dup_test', skill: s.scions[0].skill }); A.router.set('bag', { tab: 'scion' }); });
  await adv(900);
  const gcards = await E(() => window.__app.input.regions.filter(r => r.id.startsWith('gr_')).map(r => r.id));
  ok(gcards.length >= 1, `가방 접목 가지 카드 ${gcards.length}장`);
  await shot('07_bag_scions');
  if (gcards.length) {
    ok(await press(gcards[0]), '가방 접목 카드 누름'); await adv(300);
    const rows = await E(() => window.__app.input.regions.filter(r => r.id.startsWith('gp_')).length);
    ok(rows >= 1, `누구에게? = 배울 수 있는 식물 ${rows}`);
    await shot('08_bag_who');
    if (rows) {
      const n1 = await E(() => window.__app.state.scions.length);
      ok(await press('gp_0'), '[접목] 누름'); await adv(900);
      ok(await E(() => !window.__app.draft && !window.__app.router.cur.pickFor), '가방에서 접목 = 바로 배움(고르기 창 없음 · 누구에게? 닫힘)');
      ok((await E(() => window.__app.state.scions.length)) === n1 - 1, '가방 가지 하나를 씀');
    }
  }
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
} finally { await b.close(); srv.close(); }
console.log(`물 · 접목 · 지운 기술 화면 시험 ${pass}/${pass + fail} 통과 · 장면 = ${out}`);
process.exitCode = fail ? 1 : 0;
