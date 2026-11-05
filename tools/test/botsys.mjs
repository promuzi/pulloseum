// 봇 시스템 재기(2026-11-04 사용자 '이건 너가 스스로 시뮬이나 시스템을 돌려서 뭐가 좋은지 계산해볼 수 있나?' · '다양한 관점에서 정리해서 하나의 시스템을 구축해봐'):
//  설계 = docs/superpowers/specs/2026-11-04-bot-system-design.md
//   node tools/test/botsys.mjs brain --old <옛 v2 폴더의 부모>   새 머리 대 옛 머리(같은 식물 · 같은 손패 · 자리 바꿔 둘씩)
//   (옛 폴더 만들기: git archive <커밋> v2/src | tar -x -C <폴더>)
import { newGame, makePlant, evolve, upgrade } from '../../v2/src/game/logic.js';
import { unitOf, makeRng, botPlant } from '../../v2/src/game/fight.js';
import { makeBattle, playTurnVs, aiPick, REST, BRAIN } from '../../v2/src/battle/model.js';
import { mustSkip, FX as FXS, canUse } from '../../v2/src/battle/status.js';
const canUseX = (u, t, foe) => canUse(u, t, u.energy, foe);
import { SPECIES, SKILLS, uniquesOf, uniqueOf, bloomPool } from '../../v2/src/game/catalog.js';
import { formCards, isSkillCard } from '../../v2/src/game/cards.js';
import { CONCEPTS } from '../../v2/src/game/botdeck.js';

const argv = process.argv, cmd = argv[2], arg = (k, d) => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : d; };
const KEYS = Object.keys(SPECIES), STAGE = +arg('--stage', 2), GAMES = +arg('--games', 2);
const pct = x => `${(100 * x).toFixed(1)}%`;

// 도구가 쓰는 표 둘(생장마다 따로 — 2026-11-05 사용자 '봇의 성향도 생장에 따라 나눠'): 단계 하나를 다시 재면 그 칸만 바꾸고 다른 단계 칸은 그대로 다시 씀
//  playbook.js = PLAYBOOK_BY[단계] · botdeck_w.js = CARD_W_BY[단계](카드 몫) · CON_W_BY[단계](컨셉 무게 — 봇 성향)
const STG = ['새싹', '성장기', '성체'];
async function loadGen() {
  const B = await import('../../v2/src/battle/playbook.js'), Wm = await import('../../v2/src/game/botdeck_w.js');
  return { book: B.PLAYBOOK_BY ? structuredClone(B.PLAYBOOK_BY) : { 2: structuredClone(B.PLAYBOOK) }, bookMeta: structuredClone(B.PLAYBOOK_META || { 2: 'Lv6 대회 단계 6 몸 · 모든 종과 12판씩' }),
    cardW: Wm.CARD_W_BY ? structuredClone(Wm.CARD_W_BY) : { 2: structuredClone(Wm.CARD_W) }, conW: structuredClone(Wm.CON_W_BY || {}), wMeta: structuredClone(Wm.W_META || { 2: { card: 'Lv6 대회 단계 6 몸 · 종마다 손패 60개 × 모든 종' } }) };
}
async function writeBook(by, meta, out = 'v2/src/battle/playbook.js') {
  const { writeFileSync } = await import('node:fs');
  const stages = Object.keys(by).map(Number).sort();
  const block = st => `  ${st}: {   // ${STG[st]} — ${meta[st] || ''}\n` + Object.entries(by[st]).map(([k, L]) => `    ${k}: [\n${L.map(r => `      ${JSON.stringify(r)},   // ${nameOf(r.id)} — ${whenText(r.when)}`).join('\n')}\n    ],`).join('\n') + '\n  },';
  const src = `// 종마다 쓰는 패턴(2026-11-04 봇 시스템 — 사용자 '운용에 관해 컨셉을 기준으로 들고가는 스킬과 패턴을 각각 식물별로 따로 적용해보자') · 생장마다 따로(2026-11-05 사용자 '봇의 성향도 생장에 따라 나눠'):\n//  PLAYBOOK_BY[단계 0 새싹 · 1 성장기 · 2 성체][종] = [{ id: 기술, when: 조건, b: 점수 더하기, d: 시뮬레이션에서 오른 승률(%p) }] — 조건이 맞으면 봇 머리(model.js aiPick)가 그 기술 점수에 b를 더함(봇 식물 단계의 칸 · 없으면 성체 칸).\n//  node tools/test/botsys.mjs playbook --stage N 이 그 단계 칸을 다시 씀(그 종 그 단계까지 고유 기술 전부 손패 · 모든 종과) · 손으로 고치지 않음.\n//  조건: res 개수 칸 ≥ n · meal 먹은 준비 ≥ n · fxn 상대 겹 ≥ n · fx 상대 상태 있음 · nofx 상대 상태 없음 · harm 상대 상태이상 종류 ≥ n · fruit 열매 ≥ n · trap 덫 ≥ n ·\n//   foelow 상대 체력 몫 < x · melow 내 체력 몫 < x · nobell 아침 · 밤이 꺼짐 · sum 소환수 < n · foebig 상대가 위력 n 넘는 공격을 쓸 햇빛이 있음 · always 쓸 수 있으면\nexport const PLAYBOOK_BY = {\n${stages.map(block).join('\n')}\n};\nexport const PLAYBOOK_META = ${JSON.stringify(meta)};\nexport const PLAYBOOK = PLAYBOOK_BY[2] || {};\n`;
  writeFileSync(out, src);
  console.log('썼어요:', out);
}
async function writeW(cardBy, conBy, meta, out = 'v2/src/game/botdeck_w.js') {
  const { writeFileSync } = await import('node:fs');
  const table = (by, what) => Object.keys(by).map(Number).sort().map(st => `  ${st}: {   // ${STG[st]} — ${(meta[st] && meta[st][what]) || ''}\n` + Object.entries(by[st]).map(([k, o]) => `    ${k}: ${JSON.stringify(o)},`).join('\n') + '\n  },').join('\n');
  const src = `// 봇 손패 카드 값(2026-11-04 봇 시스템) — 시뮬레이션으로 잰 몫: 그 카드를 손패에 넣으면 승률이 몇 바뀌나(종마다 · 0.01 = 1%p) · 생장마다 따로(2026-11-05 사용자 '봇의 성향도 생장에 따라 나눠').\n//  CARD_W_BY[단계 0 새싹 · 1 성장기 · 2 성체][종][카드] = node tools/test/botsys.mjs learn --stage N · CON_W_BY[단계][종][컨셉] = 컨셉(봇 성향 — 연계 · 공격 · 버티기 · 방해 · 속성) 무게 배수 = botsys.mjs concept --stage N.\n//  손으로 고치지 않음. 칸이 비어 있으면 손패 짜기는 카드 성격(botdeck.js cardInfo) · 종 역할 무게만으로 짬(카드 몫은 성체 칸을 빌려 씀).\nexport const CARD_W_BY = {\n${table(cardBy, 'card')}\n};\nexport const CON_W_BY = {\n${table(conBy, 'con')}\n};\nexport const W_META = ${JSON.stringify(meta)};\nexport const CARD_W = CARD_W_BY[2] || {};\n`;
  writeFileSync(out, src);
  console.log('썼어요:', out);
}

// 성체 손패(종 리그전과 같음 — 그 종 개성 기술 전부 + 평타 · 광합성)
function plantOf(key, seed) {
  const rng = makeRng(seed), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0);
  s.wallet.credits = 1e7;
  const p = makePlant(s, { key }, rng, 0); s.plants.push(p);
  for (const k of Object.keys(p.ivs)) p.ivs[k] = 5;
  while (p.stage < STAGE) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = 4; p.pts = (STAGE * 5 + 4 - 1) * 2;
  const order = ['hp', 'atk', 'def', 'spd']; let i = 0; while (p.pts > 0) upgrade(s, p.uid, order[i++ % 4], 1);
  p.cards = [null, null]; p.drafts = [];
  const u = []; for (let st = 0; st <= STAGE; st++) u.push(...uniquesOf(key, st).filter(id => SKILLS[id]));
  p.skills.battle = [...new Set(u), 'basic', 'sun'];
  return p;
}
// 한 판: 'me' 쪽 머리 pa · 'foe' 쪽 머리 pb(같은 ctx 규칙 — 본 기술 · 지난 자세)
function duel(a, b, seed, pa, pb) {
  const B = makeBattle({ me: unitOf('me', a), foe: unitOf('foe', b), seed }), r = makeRng(seed * 13 + 5);
  const last = { me: null, foe: null }, seen = { me: [], foe: [] };
  while (!B.over && B.turn <= 80) {
    const sm = mustSkip(B.me) ? REST : pa(B.me, B.foe, r, { seen: seen.me, last: last.me, iq: 0.9 });
    const sf = mustSkip(B.foe) ? REST : pb(B.foe, B.me, r, { seen: seen.foe, last: last.foe, iq: 0.9 });
    const t = playTurnVs(B, sm, sf);
    last.me = t.mySkill && t.mySkill.act; last.foe = t.foeSkill && t.foeSkill.act;
    if (t.mySkill && t.mySkill.act === 'attack') seen.foe.push(t.mySkill);
    if (t.foeSkill && t.foeSkill.act === 'attack') seen.me.push(t.foeSkill);
  }
  return B.over === 'win' ? 1 : B.over === 'lose' ? 0 : 0.5;
}

// 옛 봇 손패(2026-11-04 전 fight.js botPlant): 새싹 고유 + 단계마다 하나(셋까지) + 평타 · 방어 · 회피 · 변이 봇은 회피 · 방어 자리에 변이 기술 카드
function oldDeck(rng, key, stage, form) {
  const battle = [uniqueOf(key, 0)];
  for (let st = 0; st <= stage && battle.length < 3; st++) {
    const pool = bloomPool(key, st).filter(x => !battle.includes(x.id)), us = uniquesOf(key, st).filter(id => !battle.includes(id));
    if (st > 0 && us.length && rng() < 0.7) battle.push(us[Math.floor(rng() * us.length)]); else if (pool.length) battle.push(pool[Math.floor(rng() * pool.length)].id);
  }
  const six = [...battle, 'basic', 'guard', 'evade'];
  if (form) { const sk = formCards(form).filter(isSkillCard), n = stage >= 2 && rng() < 0.5 ? 2 : 1; for (let i = 0; i < n && sk.length; i++) { const c = sk.splice(Math.floor(rng() * sk.length), 1)[0]; six[six.lastIndexOf(i ? 'guard' : 'evade')] = c; } }
  return six;
}
// 대회 봇 몸(단계 TIER) 그대로 종만 정해 — [새 손패 식물, 같은 몸에 옛 손패]
const TIER = +arg('--tier', 6);
function botPair(k, g) {
  const r = makeRng(7000 + KEYS.indexOf(k) * 131 + g), p = botPlant(r, STAGE, 6, TIER, { tier: TIER, concept: true, ivFloor: true, lvExact: true, key: k });
  const o = structuredClone(p); o.skills.battle = oldDeck(makeRng(99 + g * 7 + KEYS.indexOf(k)), k, STAGE, p.form);
  return [p, o];
}
const nameOf = id => ({ basic: '평타', guard: '방어태세', evade: '회피 자세', sun: '광합성' }[id] || (SKILLS[id] && SKILLS[id].name) || id);

if (cmd === 'deck') {
  const bots = Object.fromEntries(KEYS.map(k => [k, Array.from({ length: GAMES }, (_, g) => botPair(k, g))]));
  const win = Object.fromEntries(KEYS.map(k => [k, [0, 0, 0]]));
  let W = 0, W0 = 0, N = 0;
  const t0 = Date.now();
  for (let i = 0; i < KEYS.length; i++) for (let j = 0; j < KEYS.length; j++) {
    if (i === j) continue;
    for (let g = 0; g < GAMES; g++) {
      const seed = 50000 + i * 1009 + j * 31 + g;
      const w = duel(bots[KEYS[i]][g][0], bots[KEYS[j]][g][1], seed, aiPick, aiPick);   // 새 손패(종 i) 대 옛 손패(종 j) — 머리는 둘 다 새 머리
      const w0 = duel(bots[KEYS[i]][g][1], bots[KEYS[j]][g][1], seed, aiPick, aiPick);   // 같은 판을 옛 손패끼리(기준)
      win[KEYS[i]][0] += w; win[KEYS[i]][1] += w0; win[KEYS[i]][2]++; W += w; W0 += w0; N++;
    }
  }
  console.log(`새 손패 대 옛 손패 — 단계 ${STAGE} · 대회 단계 ${TIER} 몸 · ${N}판(${((Date.now() - t0) / 1000).toFixed(0)}초): 새 손패 승률 ${pct(W / N)} (같은 판 옛 손패끼리 ${pct(W0 / N)})`);
  const rows = KEYS.map(k => ({ k, d: (win[k][0] - win[k][1]) / win[k][2] })).sort((a, b) => a.d - b.d);
  console.log('종마다 새 손패로 바뀐 승률(%p): ' + rows.map(({ k, d }) => `${SPECIES[k].name} ${d >= 0 ? '+' : ''}${(100 * d).toFixed(0)}`).join(' · '));
  if (argv.includes('--show')) for (const k of KEYS) console.log(`${SPECIES[k].name}: ` + bots[k].slice(0, 3).map(([p]) => `[${CONCEPTS[p.con]}] ${p.skills.battle.filter(Boolean).map(nameOf).join(' · ')}`).join(' / '));
}

// 카드 값 재기(learn): 종마다 손패를 여럿(짠 것 반 · 아무렇게나 반) 만들어 모든 종(짠 손패)과 붙이고, 카드마다 '손패에 있으면 승률이 몇 바뀌나'를
//  능선 회귀(같이 들어간 카드끼리 몫을 나눔)로 구해 v2/src/game/botdeck_w.js 에 씀 → 손패 짜기가 그 몫을 더함
function ridge(rows, cards, lam = 2) {
  const n = cards.length, X = rows.map(r => cards.map(c => (r.ids.includes(c) ? 1 : 0))), ym = rows.reduce((t, r) => t + r.y, 0) / rows.length;
  const xm = cards.map((_, j) => X.reduce((t, x) => t + x[j], 0) / rows.length), Xc = X.map(x => x.map((v, j) => v - xm[j]));
  const A = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => Xc.reduce((t, x) => t + x[a] * x[b], 0) + (a === b ? lam : 0))), bv = Array.from({ length: n }, (_, a) => Xc.reduce((t, x, i) => t + x[a] * (rows[i].y - ym), 0));
  for (let i = 0; i < n; i++) {   // 가우스 소거
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [bv[i], bv[p]] = [bv[p], bv[i]];
    for (let r = 0; r < n; r++) { if (r === i || !A[i][i]) continue; const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; bv[r] -= f * bv[i]; }
  }
  return cards.map((_, i) => (A[i][i] ? bv[i] / A[i][i] : 0));
}
if (cmd === 'learn') {
  const { buildDeck, sampleDeck } = await import('../../v2/src/game/botdeck.js');
  const { writeFileSync } = await import('node:fs');
  const M = +arg('--decks', 60), only = arg('--key', null), out = arg('--out', 'v2/src/game/botdeck_w.js');
  const mk = (k, seed) => botPlant(makeRng(seed), STAGE, 6, TIER, { tier: TIER, concept: true, ivFloor: true, lvExact: true, key: k });
  const field = KEYS.map((k, i) => mk(k, 4000 + i * 17));   // 맞상대 = 종마다 짠 손패 봇 하나
  const W = {}, t0 = Date.now();
  for (const k of only ? [only] : KEYS) {
    const i0 = KEYS.indexOf(k), body = mk(k, 8000 + i0), rows = [];
    for (let d = 0; d < M; d++) {
      const r = makeRng(10000 + i0 * 997 + d), mutN = body.form ? 1 + (d % 4 > 1 ? 1 : 0) : 0;
      const ids = d % 2 ? sampleDeck(r, { key: k, stage: STAGE, form: body.form, mutN }) : buildDeck(r, { key: k, stage: STAGE, form: body.form, mutN }).ids;
      const p = structuredClone(body); p.skills.battle = [...ids]; while (p.skills.battle.length < 6) p.skills.battle.push(null);
      let w = 0;
      field.forEach((f, j) => { if (j !== i0) w += duel(p, f, 60000 + i0 * 1009 + j * 31 + d, aiPick, aiPick); });
      rows.push({ ids, y: w / (field.length - 1) });
    }
    const cards = [...new Set(rows.flatMap(r => r.ids))].filter(id => rows.filter(r => r.ids.includes(id)).length >= 4 && rows.filter(r => !r.ids.includes(id)).length >= 4);
    const beta = ridge(rows, cards);
    W[k] = Object.fromEntries(cards.map((c, i) => [c, +beta[i].toFixed(3)]).filter(([, v]) => Math.abs(v) >= 0.005).sort((a, b) => b[1] - a[1]));
    console.log(`${SPECIES[k].name}: 손패 ${M}개 · 평균 승률 ${pct(rows.reduce((t, r) => t + r.y, 0) / M)} · ` + Object.entries(W[k]).map(([c, v]) => `${nameOf(c)} ${v >= 0 ? '+' : ''}${(100 * v).toFixed(1)}`).join(' · ') + ` (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
  }
  if (!only) {   // 이 단계 칸만 바꿔 씀(다른 단계 · 컨셉 무게는 그대로)
    const G = await loadGen();
    G.cardW[STAGE] = W; G.wMeta[STAGE] = { ...(G.wMeta[STAGE] || {}), card: `Lv6 대회 단계 ${TIER} 몸 · 종마다 손패 ${M}개 × 모든 종` };
    await writeW(G.cardW, G.conW, G.wMeta, out);
  } else if (argv.includes('--merge')) {   // --key 한 종만 다시 잼 → 그 단계 그 종 칸만 바꿔 씀(2026-11-05)
    const G = await loadGen();
    (G.cardW[STAGE] ||= {})[only] = W[only];
    await writeW(G.cardW, G.conW, G.wMeta, out);
  }
}

// 패턴 찾기(playbook): 종마다 켜 볼 패턴(쌓기 → 쓰기 · 이어 쓰기 · 상태 소모 · 켜기 · 회복 때)을 하나씩 켜 그 종 승률이 오르면 남기고(같은 판 · 같은 씨앗으로 견줌),
//  남은 것을 차례로 더해 부딪치지 않는 묶음만 v2/src/battle/playbook.js 에 씀. 그 종 손패 = 성체까지 고유 기술 전부 + 평타 · 광합성 · 상대 = 모든 종(짠 손패)
const resCap = (k, r) => { const m = ((SPECIES[k].res || {})[r] || [])[1]; return Array.isArray(m) ? m[Math.min(m.length - 1, STAGE)] : m ?? 3; };
const uniqIds = k => { const u = []; for (let st = 0; st <= STAGE; st++) u.push(...uniquesOf(k, st).filter(id => SKILLS[id])); return [...new Set(u)]; };
function candidates(k) {
  const out = [], seen = new Set(), add = (id, when) => { const key = id + JSON.stringify(when); if (!seen.has(key)) { seen.add(key); out.push({ id, when }); } };
  for (const id of uniqIds(k)) {
    const s = SKILLS[id], cap = r => resCap(k, r);
    for (const r of [s.spend && s.spend.k, s.scale && s.scale.k, s.powTbl && s.powTbl.k].filter(Boolean)) { add(id, { k: 'res', r, n: cap(r) }); if (cap(r) > 2) add(id, { k: 'res', r, n: cap(r) - 1 }); }
    if (s.ifRes) add(id, { k: 'res', r: s.ifRes.k, n: s.ifRes.at });
    for (const x of [s.critBy, s.accBy, s.spdBy].filter(Boolean)) add(id, { k: 'res', r: x.k, n: 3 });
    if (s.dragonTry) { add(id, { k: 'res', r: 'dragon', n: 3 }); add(id, { k: 'res', r: 'dragon', n: 4 }); }
    if (s.bare) add(id, { k: 'res', r: 'evs', n: 3 });
    if (s.taste) { add(id, { k: 'meal', n: 2 }); add(id, { k: 'meal', n: 3 }); }
    if (s.consume) { add(id, { k: 'fxn', r: s.consume.id, n: 3 }); add(id, { k: 'fxn', r: s.consume.id, n: 4 }); }
    if (s.bonusIf) add(id, { k: 'fx', r: s.bonusIf.id });
    if (s.settle) { add(id, { k: 'harm', n: 2 }); add(id, { k: 'harm', n: 3 }); }
    if (s.fruitUse) { add(id, { k: 'fruit', n: 2 }); add(id, { k: 'fruit', n: 3 }); }
    if (s.trapBoom) add(id, { k: 'trap', n: 2 });
    if (s.execute) add(id, { k: 'foelow', x: 0.3 });
    if (s.bell) add(id, { k: 'nobell' });
    if (s.inferno) add(id, { k: 'nofx', r: 'inferno' });
    if (s.miasma) add(id, { k: 'nofx', r: 'miasma' });
    if (s.summon) add(id, { k: 'sum', n: 2 });
    if (s.healPct || s.cleanseHeal || s.self === 'regen' || s.also === 'regen' || s.fruitUse === 'eat' || s.orbAbsorb || s.moss) add(id, { k: 'melow', x: 0.5 });
    if (s.reflect && s.act !== 'attack') { add(id, { k: 'foebig', n: 70 }); add(id, { k: 'foebig', n: 90 }); }   // 반사 자세 = 상대가 크게 칠 햇빛이 있을 때(2026-11-05 weaklab — 말랑잉 · 너꺼잉)
    const f = s.inflict || (s.hex && s.hex[0]);
    if (f && FXS[f.id] && !FXS[f.id].stack && !FXS[f.id].stat) add(id, { k: 'nofx', r: f.id });
    add(id, { k: 'always' });
  }
  return out;
}
const whenText = w => ({ res: `${w.r} ≥ ${w.n}`, meal: `먹은 준비 ≥ ${w.n}`, fxn: `상대 ${w.r} ≥ ${w.n}겹`, fx: `상대 ${w.r}`, nofx: `상대 ${w.r} 없음`, harm: `상대 상태이상 ≥ ${w.n}`, fruit: `열매 ≥ ${w.n}`, trap: `덫 ≥ ${w.n}`, foelow: `상대 체력 < ${w.x * 100}%`, melow: `내 체력 < ${w.x * 100}%`, nobell: '아침 · 밤 꺼짐', sum: `소환수 < ${w.n}`, foebig: `상대가 위력 ${w.n} 넘게 칠 햇빛`, always: '쓸 수 있으면' }[w.k] || w.k);
if (cmd === 'playbook') {
  const { writeFileSync } = await import('node:fs');
  const N = +arg('--games', 12), only = arg('--key', null), MIN = +arg('--min', 0.015), Bv = +arg('--b', 0.6), out = arg('--out', 'v2/src/battle/playbook.js');
  const mk = (k, seed) => botPlant(makeRng(seed), STAGE, 6, TIER, { tier: TIER, concept: true, ivFloor: true, lvExact: true, key: k });
  const field = KEYS.map((k, i) => mk(k, 4000 + i * 17));
  const handOf = k => {
    const p = mk(k, 8800 + KEYS.indexOf(k));
    if (STAGE >= 2) { p.skills.battle = [...uniqIds(k), 'basic', 'sun']; return p; }
    const ids = uniqIds(k);   // 새싹 · 성장기 = 고유 기술 전부 + 짠 손패로 여섯(고유 하나 · 셋 + 평타 · 광합성만이면 손패가 실제보다 너무 작음 — 2026-11-05 새싹 쏜위드 0%)
    for (const id of p.skills.battle) if (id && ids.length < 6 && !ids.includes(id)) ids.push(id);
    p.skills.battle = ids;
    return p;
  };
  const evalBook = (k, book) => {
    const p = handOf(k), i0 = KEYS.indexOf(k);
    let w = 0, n = 0;
    for (let g = 0; g < N; g++) field.forEach((f, j) => { if (j === i0) return; w += duel(p, f, 70000 + i0 * 1009 + j * 31 + g * 7, (u, foe, r, c) => aiPick(u, foe, r, { ...c, book }), aiPick); n++; });
    return w / n;
  };
  const OUT = {}, t0 = Date.now();
  for (const k of only ? [only] : KEYS) {
    const base = evalBook(k, {}), good = [];
    for (const c of candidates(k)) { const r = { ...c, b: Bv }, v = evalBook(k, { [k]: [r] }); if (v - base >= MIN) good.push({ ...r, d: v - base }); }
    good.sort((a, b) => b.d - a.d);
    const cur = []; let curV = base;
    for (const r of good) { const L = [...cur.map(({ d, ...x }) => x), { id: r.id, when: r.when, b: r.b }], v = evalBook(k, { [k]: L }); if (v > curV + 0.005) { cur.push({ id: r.id, when: r.when, b: r.b, d: +(100 * (v - curV)).toFixed(1) }); curV = v; } }
    if (cur.length) OUT[k] = cur;
    console.log(`${SPECIES[k].name}: 기준 ${pct(base)} → ${pct(curV)} · ` + (cur.length ? cur.map(r => `${nameOf(r.id)}(${whenText(r.when)}) +${r.d}`).join(' · ') : '바꿀 패턴 없음') + ` (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
  }
  if (!only) {   // 이 단계 칸만 바꿔 씀
    const G = await loadGen();
    G.book[STAGE] = OUT; G.bookMeta[STAGE] = `Lv6 대회 단계 ${TIER} 몸 · 모든 종과 ${N}판씩`;
    await writeBook(G.book, G.bookMeta, out);
  } else if (argv.includes('--merge')) {   // --key 한 종만 다시 잼 → 그 단계 그 종 칸만 바꿔 씀(2026-11-05 젤리캡 기술 다시 짬)
    const G = await loadGen(), bk = (G.book[STAGE] ||= {});
    if (OUT[only]) bk[only] = OUT[only]; else delete bk[only];
    await writeBook(G.book, G.bookMeta, out);
  }
}

// 3:3 팀 조합(team): 새 팀 고르기(fight.js botTeam — 팀 값) 대 옛 팀 고르기(차례로 속성 · 역할만 피함) — 자리를 바꿔 두 판씩 · 머리는 둘 다 새 머리
if (cmd === 'team') {
  const { botTeam } = await import('../../v2/src/game/fight.js');
  const { makeTeamBattle, playTurn3, sendIn, aliveOf } = await import('../../v2/src/battle/team.js');
  const { teamScore, TEAM_W } = await import('../../v2/src/game/botdeck.js');
  for (const kv of (arg('--set', '') || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); TEAM_W[k] = +v; }
  const N = +arg('--games', 150), opt = { tierBoost: TIER, tier: TIER, concept: true, ivFloor: true, lvExact: true }, stub = [{}, {}, {}], body = () => ({ stage: STAGE, lv: 6 });
  const oldTeam = rng => { const out = []; for (let i = 0; i < 3; i++) out.push(botPlant(rng, STAGE, 6, TIER, { ...opt, avoidEl: out.map(x => SPECIES[x.key].el), avoidRole: out.map(x => SPECIES[x.key].role), avoidKey: out.map(x => x.key) })); return out; };
  const play = (A, Bt, seed) => {   // A = 'me'(머리 aiPick · 스스로 교체 안 함 · 쓰러지면 남은 식물 중 상성 좋은 것) · Bt = 'foe'(봇 그대로 — 교체 판단 포함)
    const B = makeTeamBattle({ me: A.map(p => unitOf('me', p)), foe: Bt.map(p => unitOf('foe', p, { ai: 0.9 })), seed, swapCd: 2, swOrder: true, ownSun: true }), r = makeRng(seed * 3 + 1);
    for (let n = 0; n < 200 && !B.over; n++) {
      if (B.need === 'me') { sendIn(B, aliveOf(B, 'me')[0]); continue; }
      playTurn3(B, mustSkip(B.me) ? { kind: 'rest' } : { kind: 'skill', skill: aiPick(B.me, B.foe, r, { iq: 0.9 }) });
    }
    return B.over;
  };
  let w = 0, n = 0, sNew = 0, sOld = 0;
  for (let g = 0; g < N; g++) {
    const tn = botTeam(makeRng(31000 + g), stub, body, opt), to = oldTeam(makeRng(41000 + g));
    sNew += teamScore(tn.map(x => x.key)); sOld += teamScore(to.map(x => x.key));
    if (play(to, tn, 5000 + g) === 'lose') w++; n++;   // 'me' = 옛 팀이 지면 새 팀이 이김
    if (play(tn, to, 5000 + g) === 'win') w++; n++;
  }
  console.log(`3:3 새 팀 대 옛 팀 — ${n}판: 새 팀 승률 ${pct(w / n)} · 팀 값 평균 새 ${(sNew / N).toFixed(2)} · 옛 ${(sOld / N).toFixed(2)}`);
}

// 머리 손잡이 바꾸기: 'fx=0,look=0.3' → BRAIN(model.js)
const DEF = { ...BRAIN };
const setBrain = str => { Object.assign(BRAIN, DEF); for (const kv of (str || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); if (!(k in BRAIN)) throw new Error('없는 손잡이 ' + k); BRAIN[k] = +v; } };

if (cmd === 'brain') {
  const old = arg('--old', null);
  if (!old) throw new Error('--old <옛 v2 폴더의 부모> 가 필요해요');
  const O = await import('file:///' + old.replace(/\\/g, '/') + '/v2/src/battle/model.js');
  const plants = Object.fromEntries(KEYS.map((k, i) => [k, Array.from({ length: GAMES }, (_, g) => plantOf(k, 3000 + i * 131 + g))]));
  const pairs = []; for (let i = 0; i < KEYS.length; i++) for (let j = 0; j < KEYS.length; j++) if (i !== j) for (let g = 0; g < GAMES; g++) pairs.push([i, j, g]);
  const base = {}; let W0 = 0;
  for (const [i, j, g] of pairs) { const w0 = duel(plants[KEYS[i]][g], plants[KEYS[j]][g], 90000 + i * 1009 + j * 31 + g, O.aiPick, O.aiPick); base[i + ':' + j + ':' + g] = w0; W0 += w0; }   // 같은 판을 옛 머리끼리(기준)
  const sets = (arg('--sets', null) || arg('--set', '')).split(';');
  for (const str of sets) {
    setBrain(str);
    const win = Object.fromEntries(KEYS.map(k => [k, [0, 0, 0]]));   // [새 머리로 이긴 수, 옛 머리끼리 이긴 수, 판 수]
    let W = 0;
    const t0 = Date.now();
    for (const [i, j, g] of pairs) {
      const w = duel(plants[KEYS[i]][g], plants[KEYS[j]][g], 90000 + i * 1009 + j * 31 + g, aiPick, O.aiPick);   // 'me' = 새 머리(종 i) 대 옛 머리(종 j)
      win[KEYS[i]][0] += w; win[KEYS[i]][1] += base[i + ':' + j + ':' + g]; win[KEYS[i]][2]++; W += w;
    }
    const N = pairs.length;
    console.log(`[${str || '기본'}] 새 머리 대 옛 머리 — 단계 ${STAGE} · ${N}판(${((Date.now() - t0) / 1000).toFixed(0)}초): 새 머리 승률 ${pct(W / N)} (같은 판 옛 머리끼리 ${pct(W0 / N)})`);
    if (argv.includes('--each')) {
      const rows = KEYS.map(k => ({ k, d: (win[k][0] - win[k][1]) / win[k][2] })).sort((a, b) => a.d - b.d);
      console.log('  종마다 새 머리로 바뀐 승률(%p): ' + rows.map(({ k, d }) => `${SPECIES[k].name} ${d >= 0 ? '+' : ''}${(100 * d).toFixed(0)}`).join(' · '));
    }
  }
}

// 컨셉 무게(concept — 봇 성향, 2026-11-05 사용자 '봇의 성향도 생장에 따라 나눠'): 그 단계에서 종마다 컨셉 다섯(연계 · 공격 · 버티기 · 방해 · 속성)으로 손패를 짜
//  모든 종(짠 손패)과 붙여 컨셉마다 승률 → 무게 배수 = 1 + K × (그 컨셉 승률 − 컨셉 평균)(0.2 ~ 2.5 — 한 컨셉만 남기지 않음: 사용자 '같은 식물이어도 조금씩 다른 컨셉으로')
//  → botdeck_w.js CON_W_BY[단계](손패 짜기가 종 역할 무게에 곱함)
if (cmd === 'concept') {
  const { buildDeck } = await import('../../v2/src/game/botdeck.js');
  const M = +arg('--decks', 8), K = +arg('--k', 8), only = arg('--key', null);
  const mk = (k, seed) => botPlant(makeRng(seed), STAGE, 6, TIER, { tier: TIER, concept: true, ivFloor: true, lvExact: true, key: k });
  const field = KEYS.map((k, i) => mk(k, 4000 + i * 17)), CW = {}, t0 = Date.now();
  for (const k of only ? [only] : KEYS) {
    const i0 = KEYS.indexOf(k), body = mk(k, 8000 + i0), res = {};
    for (const con of Object.keys(CONCEPTS)) {
      let w = 0, n = 0;
      const seen = new Set();
      for (let d = 0; d < M; d++) {
        const r = makeRng(20000 + i0 * 997 + d * 13), mutN = body.form ? 1 + (d % 4 > 1 ? 1 : 0) : 0;
        const ids = buildDeck(r, { key: k, stage: STAGE, form: body.form, con, mutN }).ids;
        seen.add(ids.slice().sort().join(','));
        const p = structuredClone(body); p.skills.battle = [...ids]; while (p.skills.battle.length < 6) p.skills.battle.push(null);
        field.forEach((f, j) => { if (j !== i0) { w += duel(p, f, 61000 + i0 * 1009 + j * 31 + d, aiPick, aiPick); n++; } });
      }
      res[con] = { wr: w / n, decks: seen.size };
    }
    const cons = Object.keys(res), mean = cons.reduce((t, c) => t + res[c].wr, 0) / cons.length;
    CW[k] = Object.fromEntries(cons.map(c => [c, +Math.max(0.2, Math.min(2.5, 1 + K * (res[c].wr - mean))).toFixed(2)]));
    console.log(`${SPECIES[k].name}: ` + cons.map(c => `${CONCEPTS[c]} ${pct(res[c].wr)}(${res[c].decks}) ×${CW[k][c]}`).join(' · ') + ` (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
  }
  if (!only) {
    const G = await loadGen();
    G.conW[STAGE] = CW; G.wMeta[STAGE] = { ...(G.wMeta[STAGE] || {}), con: `Lv6 대회 단계 ${TIER} 몸 · 컨셉마다 손패 ${M}개 × 모든 종 · 배수 = 1 + ${K} × (승률 − 평균)` };
    await writeW(G.cardW, G.conW, G.wMeta);
  }
}

if (cmd === 'rewrite') {   // 표 모양만 새로(값 그대로) — 옛 한 단계 모양 → 생장마다 모양
  const G = await loadGen();
  await writeBook(G.book, G.bookMeta); await writeW(G.cardW, G.conW, G.wMeta);
}

// 지는 기술 살피기(audit — 2026-11-05 사용자 '승률이 떨어지는 것도 사용을 잘 못한게 아닐지 분석하고 그래도 너무 별로인 스킬은 따로 정리'):
//  그 단계 카드 몫이 --th(기본 −3%p) 아래인 고유 기술마다, 그 기술을 넣은 손패로 같은 판 · 같은 씨앗을 여러 쓰는 법으로 돌려 견줌 —
//   지금 봇 · 안 씀(죽은 칸) · 쓸 수 있으면 늘 · 조건마다 '그때만'(패턴 후보) · 그 기술 대신 다른 카드로 짠 손패(바꿈)
//  가장 좋은 쓰는 법이 지금보다 1.5%p 넘게 높으면 = 봇이 잘못 썼음(--apply 면 그 단계 패턴에 더함) · 가장 좋은 쓰는 법도 바꿈보다 2%p 넘게 낮으면 = 기술이 약함(아침 목록)
if (cmd === 'audit') {
  const { buildDeck } = await import('../../v2/src/game/botdeck.js');
  const G = await loadGen();
  const N = +arg('--games', 6), TH = +arg('--th', -0.03), only = (arg('--ids', '') || '').split(',').filter(Boolean), apply = argv.includes('--apply');
  const mk = (k, seed) => botPlant(makeRng(seed), STAGE, 6, TIER, { tier: TIER, concept: true, ivFloor: true, lvExact: true, key: k });
  const field = KEYS.map((k, i) => mk(k, 4000 + i * 17));
  const Wt = G.cardW[STAGE] || {}, base = G.book[STAGE] || G.book[2] || {}, targets = [];
  for (const k of KEYS) for (const [id, v] of Object.entries(Wt[k] || {})) if ((only.length ? only.includes(id) : v < TH) && uniqIds(k).includes(id)) targets.push({ k, id, v });
  const rows = [], t0 = Date.now();
  for (const { k, id, v } of targets) {
    const i0 = KEYS.indexOf(k), body = mk(k, 8000 + i0), mutN = body.form ? 1 : 0;
    // 그 기술을 꼭 넣고 짠 손패 ↔ 빼고 짠 손패(같은 컨셉 · 같은 씨앗 — 전엔 짠 손패 맨 끝 카드를 밀어내 엠버캡 손패가 공격 없이 망가졌음)
    const con0 = buildDeck(makeRng(900 + i0), { key: k, stage: STAGE, form: body.form, mutN }).con;
    const handX = buildDeck(makeRng(901 + i0), { key: k, stage: STAGE, form: body.form, mutN, con: con0, must: [id] }).ids;
    const handR = buildDeck(makeRng(901 + i0), { key: k, stage: STAGE, form: body.form, mutN, con: con0, ban: [id] }).ids;
    let used = 0, could = 0;
    const baseK = (base[k] || []).filter(x => !(x.audit && x.id === id));   // 앞서 audit 가 더한 그 기술 규칙은 빼고 견줌(다시 잴 때)
    const evalHand = (ids, extra, count = false) => {
      const p = structuredClone(body); p.skills.battle = [...ids]; while (p.skills.battle.length < 6) p.skills.battle.push(null);
      const book = { [k]: [...baseK, ...extra] };
      const pa = (u, foe, r, c) => { const s = aiPick(u, foe, r, { ...c, book }); if (count) { if (u.kit.some(t => t.id === id && canUseX(u, t, foe))) { could++; if (s && s.id === id) used++; } } return s; };
      let w = 0, n = 0;
      for (let g = 0; g < N; g++) field.forEach((f, j) => { if (j === i0) return; w += duel(p, f, 71000 + i0 * 1009 + j * 31 + g * 7, pa, aiPick); n++; });
      return w / n;
    };
    const wNow = evalHand(handX, [], true), wNever = evalHand(handX, [{ id, when: { k: 'always' }, b: -50 }]), wAlways = evalHand(handX, [{ id, when: { k: 'always' }, b: 3 }]);
    let best = { w: Math.max(wNow, wAlways), when: wAlways > wNow ? { k: 'always' } : null, b: 3 };
    for (const c of candidates(k).filter(c => c.id === id && c.when.k !== 'always')) {
      const w = evalHand(handX, [{ id, when: { k: 'always' }, b: -50 }, { id, when: c.when, b: 53 }]);
      if (w > best.w) best = { w, when: c.when, only: true };
    }
    const wRepl = evalHand(handR, []);
    const misuse = best.w > wNow + 0.015, weak = best.w < wRepl - 0.02, harm = wNever > Math.max(best.w, wNow) + 0.015;   // harm = 어떻게 써도 안 쓰느니만 못함
    rows.push({ k, id, v, wNow, wNever, wAlways, best, wRepl, useRate: could ? used / could : 0, misuse, weak, harm, games: N });
    const tags = [misuse && '잘못 씀', harm && '쓰면 손해', weak && '약함'].filter(Boolean);
    console.log(`${SPECIES[k].name} · ${nameOf(id)}(카드 몫 ${(100 * v).toFixed(1)}): 지금 ${pct(wNow)}(쓸 수 있을 때 ${pct(could ? used / could : 0)} 씀) · 안 씀 ${pct(wNever)} · 늘 ${pct(wAlways)} · 가장 좋은 ${pct(best.w)}${best.when ? `(${whenText(best.when)}${best.only ? '에만' : ''})` : '(지금대로)'} · 바꿈 ${pct(wRepl)} → ${tags.length ? tags.join(' · ') : '그대로'} (${((Date.now() - t0) / 1000).toFixed(0)}초)`);
  }
  const { writeFileSync } = await import('node:fs');
  writeFileSync(arg('--json', `tools/test/out/audit_stage${STAGE}.json`), JSON.stringify(rows, null, 1));
  if (apply) {   // 살핀 기술마다 앞서 더한 audit 규칙을 지우고, 잘못 쓴 것만 다시 더함(그때만 · 아니면 안 씀 / 늘)
    const book = G.book[STAGE] || (G.book[STAGE] = {});
    for (const r of rows) if (book[r.k]) book[r.k] = book[r.k].filter(x => x.id !== r.id || x.audit !== 1);
    for (const r of rows.filter(r => r.misuse && r.best.when)) {
      const L = (book[r.k] ||= []);
      if (r.best.only) L.push({ id: r.id, when: { k: 'always' }, b: -50, d: 0, audit: 1 }, { id: r.id, when: r.best.when, b: 53, d: +(100 * (r.best.w - r.wNow)).toFixed(1), audit: 1 });
      else L.push({ id: r.id, when: r.best.when, b: 3, d: +(100 * (r.best.w - r.wNow)).toFixed(1), audit: 1 });
      book[r.k] = L;
    }
    await writeBook(G.book, G.bookMeta);
  }
}
