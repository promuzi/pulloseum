// 카드 고르기 흐름 점검(2026-10-18): 오프라인 판에서 실제 화면 함수로 — 비료로 레벨업 → 고르기 창 → 카드 누르기 → 확정(기술이 들어감) →
//  Lv6 → 진화 → 연출 창 → 고르기 → 보류 → 기술 탭 '스킬 정하기'로 다시. 누르기 = 그 장에 등록된 영역 함수를 직접 실행(좌표 대신 — 같은 영역 · 같은 함수)
//   node tools/shots/draftflow.mjs
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '../..');
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
try {
  const p = await b.newPage();
  await p.setViewport({ width: 270, height: 600 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?offline=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const E = (fn, ...a) => p.evaluate(fn, ...a);
  const adv = ms => E(ms => window.__advance(ms), ms);
  // 식물 관리로 · 첫 식물을 어린 단계 Lv1로
  const uid = await E(() => {
    const A = window.__app, s = A.state, pl = s.plants[s.active || 0];
    pl.stage = 0; pl.lv = 1; pl.gxp = 0; pl.drafts = []; s.items.water = 99; s.items.fert = 99;
    A.router.set('plant', { tab: 'skill' }); return pl.uid;
  });
  await adv(800);
  const plant = () => E(uid => { const s = window.__app.state; const pl = [...s.plants, ...(s.storage || [])].find(x => x.uid === uid); return { stage: pl.stage, lv: pl.lv, drafts: (pl.drafts || []).length, known: JSON.stringify(pl.skills) }; }, uid);
  // ① 물 주기(레벨업까지)
  for (let i = 0; i < 40; i++) {
    const r = await E(() => { const A = window.__app; return A.router.cur.feed(A, A.state.plants[A.state.active || 0], 'fert'); });
    await adv(300);
    if (await E(() => !!window.__app.draft)) break;
  }
  await adv(1500);   // 받은 것 판 · 알림이 있으면 지나감
  await E(() => { window.__app.popup = null; });
  await adv(600);
  let st = await plant();
  ok(await E(() => !!window.__app.draft), `레벨업 뒤 고르기 창이 열림(lv ${st.lv} · 고르기 ${st.drafts})`);
  const before = st.known;
  // 후보 카드 누르기 → 확정
  const pickN = await E(uid => { const s = window.__app.state; const pl = s.plants.find(x => x.uid === uid); return pl.drafts[0].pick; }, uid);
  // 누르기 = 영역 함수 직접 실행(화면 좌표 바꾸기 대신 — 같은 영역 · 같은 함수)
  const press = id => E(id => { const A = window.__app; const rg = A.input.regions.filter(x => x.id === id).pop(); if (!rg || !rg.fn) return false; rg.fn(); return true; }, id);
  for (let i = 0; i < pickN; i++) { ok(await press('draft_c' + i), `카드 ${i} 누름`); await adv(100); }
  ok(await press('draft_ok'), '확정 누름'); await adv(800);
  st = await plant();
  ok(st.known !== before && st.drafts === 0, `확정 뒤 기술이 들어가고 고르기 0 (남은 ${st.drafts})`);
  await adv(600);
  ok(await E(() => !window.__app.draft), '고르기 창 닫힘');
  // ② Lv6까지 → 진화
  for (let i = 0; i < 80 && (await plant()).lv < 6; i++) { await E(() => { const A = window.__app; return A.router.cur.feed(A, A.state.plants[A.state.active || 0], 'fert'); }); await adv(200); await E(() => { window.__app.popup = null; window.__app.draft = null; }); }
  st = await plant(); ok(st.lv === 6, `Lv6 도달(단계 안 ${st.lv} · 쌓인 고르기 ${st.drafts})`);
  const piled = st.drafts;
  await E(() => { const A = window.__app; return A.router.cur.doEvolve(A, A.state.plants[A.state.active || 0]); });
  await adv(200);
  ok(await E(() => !!(window.__app.draft && window.__app.draft.evo)), '진화 → 연출 창');
  await adv(2600);
  st = await plant(); ok(st.stage === 1 && st.drafts === piled + 1, `진화 뒤 단계 1 · 고르기 +1 (${st.drafts})`);
  // 보류 → '스킬 정하기'
  ok(await press('draft_later'), '보류 누름'); await adv(400);
  ok(await E(() => !window.__app.draft), '보류 뒤 창 닫힘');
  await adv(400);
  ok(await press('sk_draft'), "'스킬 정하기' 단추 있음 · 누름"); await adv(600);
  ok(await E(() => !!window.__app.draft), "'스킬 정하기' → 고르기 창 다시");
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  const le = await E(() => window.__lastError || null); ok(!le, '화면 오류 없음 ' + (le || ''));
} finally { await b.close(); srv.close(); }
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
