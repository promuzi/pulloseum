// 카드 고르기 흐름 점검(2026-10-18): 오프라인 판에서 실제 화면 함수로 — 비료로 레벨업 → 고르기 창 → 카드 누르기 → 확정(기술이 들어감) →
//  Lv6 → 진화 → 연출 창 → 기술 고르기 → 패시브 고르기 → 보류 · 오래된 고르기 · 스킬 · 패시브 탭. 누르기 = 그 장에 등록된 영역 함수를 직접 실행(좌표 대신 — 같은 영역 · 같은 함수)
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
  // 새 고르기 화면(2026-10-18): 위 줄 카드 누름 → [장착] → 아래 칸 누름(빈 칸 = 채움 · 찬 칸 = 바꿈, 원래 것은 위 줄로) · [되돌리기] · 버릴 것이 있으면 확인 창
  const press = id => E(id => { const A = window.__app; const rg = A.input.regions.filter(x => x.id === id).pop(); if (!rg || !rg.fn) return false; rg.fn(); return true; }, id);
  const D = () => E(() => { const d = window.__app.draft; return d && { top: [...(d.top || [])], lay: JSON.parse(JSON.stringify(d.lay || {})), sel: d.sel, arm: d.arm, glow: d.glow, dk: d.dk, hist: (d.hist || []).length }; });
  const place = async (ti, key) => { ok(await press('dr_t' + ti), `위 줄 ${ti} 누름`); await adv(60); ok(await press('draft_arm'), '[장착] 누름'); await adv(60); ok(await press('dr_' + key), `${key} 칸 누름`); await adv(120); };
  let d0 = await D();
  ok(d0 && d0.dk && d0.dk.startsWith('skill') && d0.top.length >= 1, '기술 고르기 = 위 줄에 후보: ' + JSON.stringify(d0 && d0.top));
  const cand0 = d0.top[0];
  await place(0, 's0');
  let d1 = await D();
  ok(d1.lay.store.includes(cand0) && !d1.top.includes(cand0), '빈 보관 칸 = 채움');
  ok(await press('draft_undo'), '[되돌리기] 누름'); await adv(100);
  d1 = await D();
  ok(d1.top.includes(cand0) && !d1.lay.store.includes(cand0) && d1.hist === 0, '되돌리기 = 처음대로');
  const old0 = d1.lay.battle[0];
  await place(0, 'b0');
  d1 = await D();
  ok(d1.lay.battle[0] === cand0 && d1.top.includes(old0) && d1.glow && d1.glow.key === 'b0' && d1.glow.id === old0, `찬 칸 = 바꿈 · 원래 것(${old0})은 위 줄 · 둘 다 빛남`);
  ok(await press('draft_ok'), '확정 누름'); await adv(700);
  ok(await E(() => !!window.__app.confirm), '버릴 것이 있으면 확인 창');
  ok(await press('cf_yes'), '확인 창 [확정]'); await adv(900);
  st = await plant();
  const sk1 = await E(uid => window.__app.state.plants.find(x => x.uid === uid).skills, uid);
  ok(sk1.battle[0] === cand0 && sk1.forgot.includes(old0) && st.drafts === 0, '확정 = 고른 기술이 그 칸 · 원래 것은 지운 기술');
  await adv(600);
  ok(await E(() => !window.__app.draft), '고르기 창 닫힘');
  // ② Lv6까지 → 진화 → 연출 → 기술 고르기 → 확정 → 패시브 고르기가 이어서
  for (let i = 0; i < 80 && (await plant()).lv < 6; i++) { await E(() => { const A = window.__app; return A.router.cur.feed(A, A.state.plants[A.state.active || 0], 'fert'); }); await adv(200); await E(() => { window.__app.popup = null; window.__app.draft = null; }); }
  await E(uid => { window.__app.state.plants.find(x => x.uid === uid).drafts = []; }, uid);   // 단계 안 레벨업 고르기는 비우고 진화만 봄
  st = await plant(); ok(st.lv === 6, `Lv6 도달(단계 안 ${st.lv})`);
  await E(() => { const A = window.__app; return A.router.cur.doEvolve(A, A.state.plants[A.state.active || 0]); });
  await adv(200);
  ok(await E(() => !!(window.__app.draft && window.__app.draft.evo)), '진화 → 연출 창');
  await adv(2600);
  st = await plant(); ok(st.stage === 1 && st.drafts === 2, `진화 뒤 단계 1 · 고르기 둘(기술 + 패시브) (${st.drafts})`);
  d0 = await D();
  ok(d0 && d0.dk.startsWith('skill'), '진화 고르기 = 기술 먼저');
  const want = await E(uid => { const d = window.__app.state.plants.find(x => x.uid === uid).drafts[0]; return Math.min(d.pick, d.cands.length); }, uid);
  ok(await E(() => window.__app.draft.maxSy > 0), '장착 · 보관이 화면보다 길면 아래 칸 끌어 넘김');
  for (let i = 0; i < want; i++) await place(0, 's' + i);
  ok(await press('draft_ok'), '확정 누름'); await adv(900);
  d1 = await D();
  ok(d1 && d1.dk.startsWith('passive') && Array.isArray(d1.lay.cards), '이어서 패시브 고르기 창');
  ok(await press('draft_later'), '보류 누름'); await adv(400);
  ok(await E(() => !window.__app.draft), '보류 뒤 창 닫힘');
  // 맨 위 '보류 N' 단추(2026-10-18 사용자 "보류를 누르면 상단에 보류 버튼이 생김") — 식물 관리 · 홈에서 누르면 고르기 다시
  ok(await E(() => window.__app.input.regions.some(r => r.id === 'hold_btn')), "식물 관리에 '보류' 단추");
  await E(() => { window.__app.router.set('home', {}); }); await adv(1500);
  ok(await E(() => window.__app.input.regions.some(r => r.id === 'hold_btn')), "홈에 '보류' 단추");
  ok(await press('hold_btn'), "'보류' 단추 누름"); await adv(400);
  ok(await E(() => !!(window.__app.draft && window.__app.draft.dk && window.__app.draft.dk.startsWith('passive'))), '보류한 고르기 다시(패시브)');
  ok(await press('draft_later'), '다시 보류'); await adv(300);
  await E(() => { window.__app.router.set('plant', { tab: 'skill' }); }); await adv(900);
  // ③ 오래된 고르기(다른 데서 먼저 확정됨) → 창이 조용히 닫힘
  await E(async uid => { const m = await import('/v2/src/scenes/draft.js'), A = window.__app, pl = A.state.plants.find(x => x.uid === uid); m.openDraft(A, pl); }, uid);
  await adv(300);
  ok(await E(() => !!window.__app.draft), '다시 열림');
  await E(uid => { window.__app.state.plants.find(x => x.uid === uid).drafts = []; }, uid);
  await adv(300);
  ok(await E(() => !window.__app.draft), '고르기가 없어지면 창 닫힘');
  // ④ 식물 관리 스킬 · 패시브 탭(2026-10-18): 장착 기본기 [해제] → 보관 · 보관이 차면 막힘 · 패시브 탭 칸 셋
  await E(() => { const A = window.__app; A.draft = null; A.popup = null; A.router.set('plant', { tab: 'skill' }); });
  await adv(900);
  const lay = () => E(uid => { const s = window.__app.state, pl = s.plants.find(x => x.uid === uid); return { b: [...pl.skills.battle], s: [...pl.skills.store] }; }, uid);
  const slotOf = async id => (await lay()).b.indexOf(id);
  const offBasic = async id => { const i = await slotOf(id); ok(await press('skc_b' + i), `${id} 카드 누름(b${i})`); await adv(600); ok(await press('peek_act'), '[해제] 누름'); await adv(700); };
  const L0 = await lay(), basicOn = ['sun', 'evade', 'guard', 'basic'].find(x => L0.b.includes(x));
  await offBasic(basicOn);
  ok((await lay()).s.includes(basicOn) && !(await lay()).b.includes(basicOn), `장착 기본기 ${basicOn} [해제] = 보관으로`);
  const filler = await E(async uid => {   // 보관을 진짜 기술로 여섯까지(시험용)
    const { SKILLS } = await import('/v2/src/game/catalog.js'), s = window.__app.state, pl = s.plants.find(x => x.uid === uid);
    const have = new Set([...pl.skills.battle, ...pl.skills.store, ...pl.skills.forgot]);
    for (const id of Object.keys(SKILLS)) { if (pl.skills.store.length >= 6) break; if (!have.has(id) && SKILLS[id].tier === 'c1') pl.skills.store.push(id); }
    return pl.skills.store.length;
  }, uid);
  if (filler >= 6) {
    const other = (await lay()).b.find(x => x && x !== basicOn);
    const i = (await lay()).b.indexOf(other);
    ok(await press('skc_b' + i), '다른 장착 카드 누름'); await adv(600); await press('peek_act'); await adv(700);
    ok((await lay()).b.includes(other), '보관이 차면 [해제] 막힘(장착 그대로)');
  } else ok(true, '(보관 채울 지운 기술이 모자라 건너뜀)');
  await E(() => { window.__app.router.set('plant', { tab: 'passive' }); });
  await adv(700);
  ok(await E(() => ['skc_c0', 'skc_c1', 'skc_c2'].every(id => window.__app.input.regions.some(r => r.id === id))), '패시브 탭 = 장착 칸 셋');
  // ⑤ 최종 검토(2026-10-18): 지운 기본기 이름 · 보관고로 간 식물의 고르기 창 · 화면 안 창 위의 '보류' 단추
  await E(uid => { const A = window.__app, s = A.state, pl = s.plants.find(x => x.uid === uid); s.items.regress = 3; const i = pl.skills.battle.indexOf('guard'); if (i >= 0) pl.skills.battle[i] = null; pl.skills.store = pl.skills.store.filter(x => x !== 'guard').slice(0, 5); if (!pl.skills.forgot.includes('guard')) pl.skills.forgot.unshift('guard'); A.router.set('plant', { tab: 'skill', sub: 'forgot' }); }, uid);
  await adv(900);
  const gi = await E(uid => window.__app.state.plants.find(x => x.uid === uid).skills.forgot.indexOf('guard'), uid);
  ok(await press('fg_go_' + gi), '지운 기본기 [되돌리기] 누름'); await adv(200);
  const cmsg = await E(() => window.__app.confirm && window.__app.confirm.msg);
  ok(cmsg && !cmsg.includes('undefined'), '지운 기본기 이름이 보임: ' + cmsg);
  await E(() => { window.__app.confirm = null; });
  await E(async uid => { const m = await import('/v2/src/scenes/draft.js'), A = window.__app, s = A.state, pl = s.plants.find(x => x.uid === uid); pl.drafts = [{ kind: 'one', part: 'skill', st: pl.stage, lv: pl.lv, pick: 1, cands: ['f_ball'] }]; m.openDraft(A, pl); }, uid);
  await adv(400);
  ok(await E(() => !!window.__app.draft), '고르기 창 열림(보관고 시험)');
  await E(uid => { const s = window.__app.state, i = s.plants.findIndex(x => x.uid === uid); s.storage.push(s.plants.splice(i, 1)[0]); s.active = 0; }, uid);
  await adv(300);
  ok(await E(() => !window.__app.draft), '식물이 보관고로 가면 고르기 창 닫힘');
  await E(() => { const A = window.__app, s = A.state; s.plants[0].drafts = [{ kind: 'one', part: 'skill', st: 0, lv: 1, pick: 1, cands: ['f_ball'] }]; s.pending = []; A.router.set('home', {}); });   // 레벨업 상자 창(모달)은 비움
  await adv(1500);
  ok(await E(() => window.__app.input.regions.some(r => r.id === 'hold_btn')), "홈 '보류' 단추(창 없을 때)");
  await E(() => { window.__app.router.cur.pickSheet = true; }); await adv(300);
  ok(await E(() => !window.__app.input.regions.some(r => r.id === 'hold_btn')), "출전 식물 고르기 창이 열리면 '보류' 단추 숨김");
  await E(() => { window.__app.router.cur.pickSheet = false; });
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  const le = await E(() => window.__lastError || null); ok(!le, '화면 오류 없음 ' + (le || ''));
} finally { await b.close(); srv.close(); }
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
