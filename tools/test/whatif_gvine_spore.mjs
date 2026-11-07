// 만약 실험용 사본만 고침(2026-11-07 — 새싹 게일바인 · 스포어캡 86%, 사용자 'ㄱㄱ'):
//  수치만 · 모든 단계 같게(같은 날 사용자 '이상한거 하지말고 수치만 바꿔 / 새싹이든 뭐든 다 똑같이 해')
//  게일바인 = gc<햇빛>(그건 내 잔상인데?) · gl<위력>(잔상 이어 공격) · gp<위력>(스택 하나당 반격) · gm<수>(스택 최대) ·
//            gb<수>(출혈 거는 스택 수) · gs<기동 × 100>(종 기동 기울기) · gf0(선공 활력 끔 — 몫 재기용)
//  스포어캡 = sc<햇빛>(포자 배양) · sp<% >(잠든 포자 · 새끼 = 주인 능력치 %) · sa<%>(성체 버섯 %) · sw<위력>(소환수 평타) ·
//            sx<수>(소환수 최대) · ss<기동 × 100>(종 기동 기울기) ·
//            sz<턴>(잠든 기간 — 설계 기록 사용자 '너무 사기면, 한 턴 더 잠든 상태라도 좋고')  — sp · sa · sw · sx · sz 는 엠버캡 불씨도 같이 씀
//  base = 고치지 않음(봇만 다시 배운 견줌용) · 여럿은 _ 로 이음(예: gp5_gc3)
//  쓰는 법: git archive HEAD v2 tools/test | tar -x -C <사본> → node tools/test/whatif_gvine_spore.mjs <사본> <방식>
import { readFileSync, writeFileSync } from 'node:fs';
const [root, MODE = 'base'] = process.argv.slice(2);
const CT = 'v2/src/game/catalog.js', ST = 'v2/src/battle/status.js', DV = 'v2/src/battle/devices.js';
const WAKE = "for (const s of liveSums(u)) if (s.stage === 'sleep' && s.born < T) {";
function patch(rel, a, b) {
  const p = root + '/' + rel;
  const s = readFileSync(p, 'utf8');
  if (s.split(a).length !== 2) throw new Error(`${rel}: '${a.slice(0, 40)}…'를 한 곳에서 못 찾음`);
  writeFileSync(p, s.replace(a, () => b));
}
const SPG = "sp: { res: { evs: [0, 5, '스택'] }, evStack: { k: 'evs', per: 10, bleedAt: 3 }, firstUp: 'atkUp' },";
const G1 = "S('u_gvine_1', '그건 내 잔상인데?', 'wind', 'u', 0, 2, { self: 'stealth', early: true, link: { power: 20, ambush: true, el: 'wind' } }),";
const S1 = "S('u_spore_1', '포자 배양', 'grass', 'u', 0, 2, { cats: ['buff'], summon: true }),";
const SUM = 'export const SUMMON = { max: 3, pct: 0.4, adultPct: 0.5, power: 30, burst: { sleep: 1, baby: 2, adult: 3 } };';
const TG = "vine_wind: { name: '게일바인', type: 'vine', el: 'wind', rarity: 'common', branch: 'shade', role: 'fast', tilt: { spd: 1.2 } }";
const TS = "spore_cap: { name: '스포어캡', type: 'mushroom', el: 'grass', rarity: 'rare', branch: 'shade', role: 'dis', tilt: { spd: 1.08 } }";
const g = { cost: 2, link: 20, per: 10, max: 5, bleed: 3, first: "'atkUp'" }, s = { cost: 2, pct: 0.4, adult: 0.5, power: 30, max: 3 };
let gSpd = null, sSpd = null, sleep = 1;
const said = [];
for (const part of MODE.split('_')) {
  const m = /^([a-z]{2})(\d+)$/.exec(part);
  if (part === 'base') continue;
  if (!m) throw new Error(`모르는 방식: ${part}`);
  const [, k, v] = m, n = +v;
  if (k === 'gc') { g.cost = n; said.push(`잔상 햇빛 ${n}`); }
  else if (k === 'gl') { g.link = n; said.push(`잔상 이어 공격 위력 ${n}`); }
  else if (k === 'gp') { g.per = n; said.push(`스택 하나당 반격 위력 ${n}`); }
  else if (k === 'gm') { g.max = n; said.push(`스택 최대 ${n}`); }
  else if (k === 'gb') { g.bleed = n; said.push(`출혈 스택 ${n}`); }
  else if (k === 'gf' && n === 0) { g.first = 'null'; said.push('선공 활력 끔'); }
  else if (k === 'gs') { gSpd = n / 100; said.push(`게일바인 기동 ×${gSpd}`); }
  else if (k === 'sc') { s.cost = n; said.push(`포자 배양 햇빛 ${n}`); }
  else if (k === 'sp') { s.pct = n / 100; said.push(`잠든 포자 · 새끼 ${n}%`); }
  else if (k === 'sa') { s.adult = n / 100; said.push(`성체 버섯 ${n}%`); }
  else if (k === 'sw') { s.power = n; said.push(`소환수 평타 위력 ${n}`); }
  else if (k === 'sx') { s.max = n; said.push(`소환수 최대 ${n}`); }
  else if (k === 'ss') { sSpd = n / 100; said.push(`스포어캡 기동 ×${sSpd}`); }
  else if (k === 'sz') { sleep = n; said.push(`잠든 기간 ${n}턴`); }
  else throw new Error(`모르는 방식: ${part}`);
}
patch(CT, SPG, `sp: { res: { evs: [0, ${g.max}, '스택'] }, evStack: { k: 'evs', per: ${g.per}, bleedAt: ${g.bleed} }, firstUp: ${g.first} },`);
patch(CT, G1, `S('u_gvine_1', '그건 내 잔상인데?', 'wind', 'u', 0, ${g.cost}, { self: 'stealth', early: true, link: { power: ${g.link}, ambush: true, el: 'wind' } }),`);
patch(CT, S1, `S('u_spore_1', '포자 배양', 'grass', 'u', 0, ${s.cost}, { cats: ['buff'], summon: true }),`);
patch(ST, SUM, `export const SUMMON = { max: ${s.max}, pct: ${s.pct}, adultPct: ${s.adult}, power: ${s.power}, burst: { sleep: 1, baby: 2, adult: 3 } };`);
if (gSpd) patch(CT, TG, TG.replace('spd: 1.2', `spd: ${gSpd}`));
if (sSpd) patch(CT, TS, TS.replace('spd: 1.08', `spd: ${sSpd}`));
if (sleep !== 1) patch(DV, WAKE, WAKE.replace('s.born < T', `s.born < T - ${sleep - 1}`));
console.log(`사본 고침 끝 — ${said.join(' · ') || '그대로(봇만 다시 배움)'}`);
