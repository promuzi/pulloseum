// 프로필 배너 시험(2026-10-22 여덟 → 2026-10-23 열둘 = 프로필 창 디자인): 넷은 처음부터 · 나머지는 재배사 레벨(오로라 3 · 별빛 5 · 성운 8 · 잎맥 10 · 물결 15 · 회로 20 · 황금 25 · 풀로세움 30) · 없는 배너는 막힘
//   node tools/test/profile.mjs
import { newGame, setProfile, Err } from '../../v2/src/game/logic.js';
import { BANNER_LV } from '../../v2/src/game/catalog.js';
import { runOp } from '../../v2/src/game/ops.js';
import { makeRng } from '../../v2/src/battle/rules.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('실패:', m); } };
const throws = (f, m, want) => { try { f(); ok(false, m + ' — 막혀야 함'); } catch (e) { ok(e instanceof Err && (!want || e.message.includes(want)), m + ' — ' + e.message); } };
const s = newGame({ nickname: '시험', starter: 'flower_grass' }, makeRng(1), 0);
ok(BANNER_LV.length === 12 && BANNER_LV.slice(0, 4).every(x => x === 1), '배너 열둘 · 넷은 처음부터');
ok(BANNER_LV.slice(4, 8).join() === '5,10,15,20', '옛 무늬 넷 번호 · 레벨 그대로(저장값 유지)');
for (let i = 0; i < 4; i++) { setProfile(s, { color: i }); ok(s.profile.color === i, '처음 배너 ' + i); }
throws(() => setProfile(s, { color: 8 }), 'Lv1에 오로라', 'Lv3');
throws(() => setProfile(s, { color: 4 }), 'Lv1에 별빛', 'Lv5');
s.user.level = 3; setProfile(s, { color: 8 }); ok(s.profile.color === 8, 'Lv3 = 오로라');
s.user.level = 5; setProfile(s, { color: 4 }); ok(s.profile.color === 4, 'Lv5 = 별빛');
throws(() => setProfile(s, { color: 9 }), 'Lv5에 성운', 'Lv8');
throws(() => setProfile(s, { color: 7 }), 'Lv5에 회로', 'Lv20');
s.user.level = 20; setProfile(s, { color: 7 }); ok(s.profile.color === 7, 'Lv20 = 회로');
throws(() => setProfile(s, { color: 10 }), 'Lv20에 황금', 'Lv25');
s.user.level = 30; setProfile(s, { color: 11 }); ok(s.profile.color === 11, 'Lv30 = 풀로세움');
throws(() => setProfile(s, { color: 12 }), '없는 배너', '없는 배너');
try { runOp(s, 'setProfile', { color: 12 }, { rng: makeRng(1), now: 0 }); ok(false, 'ops 12 막혀야 함'); } catch (e) { ok(e instanceof Err, 'ops: 0~11만'); }
ok(runOp(s, 'setProfile', { color: 6 }, { rng: makeRng(1), now: 0 }) && s.profile.color === 6, 'ops: 물결');
console.log(fails ? `프로필 시험 실패 ${fails}/${n}` : `프로필 시험 ${n}개 통과`);
process.exit(fails ? 1 : 0);
