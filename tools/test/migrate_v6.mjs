// 저장 판 6(2026-10-24 — 종 고유 기술 v2를 친구 서버에 올릴 때): 이미 가진 v2 종 식물에게 그 단계까지의 고유 기술을 모두 넣음
//  (사용자 '스킬 보류칸에 신 스킬을 다 올리고 그 중 4개를 적용할 수 있게') — 빈 장착 칸 → 스킬 보관 → 다 차면 놓을 칸 고르기
//   node tools/test/migrate_v6.mjs
import { newGame, makePlant, migrate, normSkills } from '../../v2/src/game/logic.js';
import { makeRng } from '../../v2/src/battle/rules.js';
import { uniquesOf, SPECIES_V2 } from '../../v2/src/game/catalog.js';

let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const rng = makeRng(3), s = newGame({ nickname: 'x', starter: 'flower_grass' }, rng, 0);
const add = (key, stage) => { const p = makePlant(s, { key }, rng, 0); p.stage = stage; normSkills(p); s.plants.push(p); return p; };
const g = add('cactus_wind', 2), v = add('volt_vine', 1), o = add('ranger_vine', 2);   // v2가 아닌 종(페탈로즈는 2026-10-29부터 v2)
const before = JSON.stringify(o.skills);
s.ver = 5; migrate(s);
const has = p => new Set([...p.skills.battle, ...p.skills.store, ...(p.drafts || []).flatMap(d => d.cands)]);
const want = (key, st) => [...Array(st + 1).keys()].flatMap(i => uniquesOf(key, i));
ok(want('cactus_wind', 2).every(id => has(g).has(id)), `다 자란 게일캑터 = 고유 기술 여섯 모두(장착 · 보관 · 고르기)`);
ok(want('volt_vine', 1).every(id => has(v).has(id)) && !has(v).has('u_volt_3'), '자라는 볼트바인 = 그 단계까지만');
ok(g.skills.store.length <= 6, '보관 칸은 여섯을 넘지 않음(넘치면 놓을 칸 고르기)');
ok(JSON.stringify(o.skills) === before, 'v2가 아닌 종은 그대로');
ok(SPECIES_V2.size >= 5, 'v2 종 다섯 이상(2026-10-29 밤샘 — 열넷)');
s.ver = 6; const again = JSON.stringify(g.skills); migrate(s);
ok(JSON.stringify(g.skills) === again, '한 번만(판 6에선 다시 안 넣음)');
console.log(fails ? `실패 ${fails} / ${n}` : `모두 통과 (${n})`);
process.exit(fails ? 1 : 0);
