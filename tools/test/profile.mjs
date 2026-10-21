// 프로필 배너 여덟 시험(2026-10-22): 색 넷은 처음부터 · 무늬 넷은 재배사 Lv5 · 10 · 15 · 20에 열림 · 없는 배너는 막힘
//   node tools/test/profile.mjs
import { newGame, setProfile, Err } from '../../v2/src/game/logic.js';
import { BANNER_LV } from '../../v2/src/game/catalog.js';
import { runOp } from '../../v2/src/game/ops.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const throws = (f, m, want) => { try { f(); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err && (!want || e.message.includes(want)), m + ' — ' + e.message); } };
const s = newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(1), 0);
ok(BANNER_LV.length === 8 && BANNER_LV.slice(0, 4).every(x => x === 1), '배너 여덟 · 색 넷은 처음부터');
for (let i = 0; i < 4; i++) { setProfile(s, { color: i }); ok(s.profile.color === i, '색 배너 ' + i); }
throws(() => setProfile(s, { color: 4 }), 'Lv1에 별빛', 'Lv5');
s.user.level = 5; setProfile(s, { color: 4 }); ok(s.profile.color === 4, 'Lv5 = 별빛');
throws(() => setProfile(s, { color: 7 }), 'Lv5에 회로', 'Lv20');
s.user.level = 20; setProfile(s, { color: 7 }); ok(s.profile.color === 7, 'Lv20 = 회로');
throws(() => setProfile(s, { color: 8 }), '없는 배너', '없는 배너');
try { runOp(s, 'setProfile', { color: 8 }, { rng: makeRng(1), now: 0 }); ok(false, 'ops 8 막혀야 함'); } catch (e) { ok(e instanceof Err, 'ops: 0~7만'); }
ok(runOp(s, 'setProfile', { color: 6 }, { rng: makeRng(1), now: 0 }) && s.profile.color === 6, 'ops: 물결');
console.log(fails ? `프로필 시험 실패 ${fails}/${n}` : `프로필 시험 ${n}개 통과`);
process.exit(fails ? 1 : 0);
