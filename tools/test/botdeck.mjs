// 봇 손패 짜기 시험(2026-11-04 봇 시스템 — v2/src/game/botdeck.js): 모든 종 · 단계 · 변이 · 대회 단계로 봇을 많이 만들어
//  ① 손패가 배울 수 있는 카드만 ② 겹치는 카드 없음 ③ 방어패 한 장(어울리는 것) · 회복 한 장까지 · 큰 비용(3 이상) 둘까지 · 변이 기술 카드 둘까지 · 공격 둘 이상 · 공격만은 아님
//  ④ 같은 종도 컨셉 · 손패가 여러 가지 ⑤ 같은 씨앗이면 같은 봇 ⑥ 성체 봇이 성체 고유 기술을 들고 감 ⑦ 3:3 팀 = 속성 · 종이 겹치지 않음
//   node tools/test/botdeck.mjs
import { botPlant, botTeam, makeRng } from '../../v2/src/game/fight.js';
import { cardInfo, poolOf, CONCEPTS } from '../../v2/src/game/botdeck.js';
import { SPECIES, SKILLS, uniquesOf } from '../../v2/src/game/catalog.js';
import { isSkillCard, CARDS } from '../../v2/src/game/cards.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; if (fails < 15) console.log('실패:', m); } };
const KEYS = Object.keys(SPECIES);
const cons = {}, decks = {}, matureUniq = { yes: 0, all: 0 };
for (let tier = 0; tier <= 6; tier++) for (let stage = 0; stage <= 2; stage++) for (const key of KEYS) for (let g = 0; g < 4; g++) {
  const p = botPlant(makeRng(1 + tier * 100003 + stage * 7919 + KEYS.indexOf(key) * 131 + g), stage, 3, tier, { tier, concept: true, ivFloor: true, lvExact: true, key });
  const ids = p.skills.battle.filter(Boolean), pool = new Set(poolOf(key, stage, p.form)), tag = `${SPECIES[key].name} 단계 ${stage} 대회 ${tier} #${g}`;
  ok(ids.every(id => pool.has(id)), `${tag}: 배울 수 없는 카드 ${ids.filter(id => !pool.has(id))}`);
  ok(new Set(ids).size === ids.length, `${tag}: 겹치는 카드 ${ids}`);
  const C = ids.map(id => cardInfo(id, key));
  const def = C.filter(c => c.isDef).length, heal = C.filter(c => c.isHeal && !c.isDef).length, big = C.filter(c => c.cost >= 3).length, mut = C.filter(c => c.mut).length, atk = C.filter(c => c.dmg).length;
  ok(def <= 1 && heal <= 1, `${tag}: 방어 ${def} · 회복 ${heal} — ${ids}`);
  ok(big <= 2, `${tag}: 큰 비용 ${big} — ${ids}`);
  ok(mut <= 2 && (!mut || p.form), `${tag}: 변이 카드 ${mut}(변이 ${p.form})`);
  ok(ids.every(id => !isSkillCard(id) || CARDS[id].form === p.form), `${tag}: 다른 변이 카드`);
  if (tier >= 4) { ok(def === 1, `${tag}: 방어패 ${def}장 — ${ids}`); ok(atk >= 2 && atk < ids.length, `${tag}: 공격 ${atk}/${ids.length} — ${ids}`); }   // 서툰 봇(낮은 단계)은 몇 장이 아무렇게나라 방어패가 빠질 수 있음
  if (stage === 2 && tier >= 4) { matureUniq.all++; if (ids.some(id => uniquesOf(key, 2).includes(id))) matureUniq.yes++; }
  if (stage === 2 && tier === 6) { (cons[key] ||= new Set()).add(p.con); (decks[key] ||= new Set()).add(ids.slice().sort().join(',')); }
}
// 같은 씨앗 → 같은 봇
const a = botPlant(makeRng(77), 2, 6, 6, { tier: 6, concept: true, key: 'fang_trap' }), b = botPlant(makeRng(77), 2, 6, 6, { tier: 6, concept: true, key: 'fang_trap' });
ok(JSON.stringify(a) === JSON.stringify(b), '같은 씨앗인데 다른 봇');
// 같은 종도 여러 가지(대회 단계 6 · 성체 · 네 번 중)
const varied = KEYS.filter(k => decks[k] && decks[k].size >= 2).length;
ok(varied >= KEYS.length * 0.6, `손패가 여러 가지인 종 ${varied}/${KEYS.length}`);
ok(matureUniq.yes >= matureUniq.all * 0.7,   // 나머지는 시뮬레이션 카드 값(botdeck_w.js)이 그 종 성체 기술을 손해로 잰 경우 — 문제 기술 목록
   `성체 봇이 성체 고유 기술을 든 비율 ${matureUniq.yes}/${matureUniq.all}`);
// 3:3 팀: 속성 · 종 겹침 없음(고를 종이 남는 한)
let dupEl = 0;
for (let g = 0; g < 200; g++) { const t = botTeam(makeRng(900 + g), [{}, {}, {}], () => ({ stage: 2, lv: 6 }), { tierBoost: 6, tier: 6, concept: true }); if (new Set(t.map(x => SPECIES[x.key].el)).size < 3 || new Set(t.map(x => x.key)).size < 3) dupEl++; }
ok(dupEl === 0, `3:3 팀 속성 · 종 겹침 ${dupEl}/200`);
const conCount = {}; for (const k of KEYS) for (const c of cons[k] || []) conCount[c] = (conCount[c] || 0) + 1;
console.log(`봇 손패 ${n}가지 확인 · 성체 봇이 성체 고유 기술을 든 비율 ${(100 * matureUniq.yes / matureUniq.all).toFixed(0)}% · 손패가 여러 가지인 종 ${varied}/${KEYS.length} · 컨셉이 나온 종 수 ` + Object.entries(conCount).map(([c, v]) => `${CONCEPTS[c]} ${v}`).join(' · '));
console.log(fails ? `실패 ${fails}` : '모두 통과');
process.exit(fails ? 1 : 0);
