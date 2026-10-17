// 화면 촬영·오프라인 시험용 상태 — 진짜 게임 규칙(logic.js)으로 만든 새 모양 세이브(Lv5 재배사 · 식물 여섯 · 보관고 37 · 종자 넷 · 접목 가지 둘).
//  같은 씨앗이라 늘 같은 세이브. 촬영 도구(tools/shots/v2shots.mjs)·?offline=1 이 씀.
import { SPECIES as CAT_SPECIES } from '../game/catalog.js';
import { newGame, makePlant, seedOf, evolve, syncTimers, rollScion } from '../game/logic.js';
import { makeRng } from '../battle/rules.js';

export const SPECIES = CAT_SPECIES;
// 단계 이름(종마다 — 그림 단계 키 sprout · growing · mature)
// 성장 단계 이름(2026-10-18 사용자 결정 — 대기열 16번): 꽃 · 덩굴 · 선인장 = 새싹 → 성장기 → 성체, 버섯만 균사 → 성장기 → 성체(전엔 종류마다 꽃봉오리 · 개화 · 성숙버섯 …)
const STAGE3 = { sprout: '새싹', juvenile: '새싹', growing: '성장기', mature: '성체', evolved: '성체' };
export const STAGE_NAME = { flower: STAGE3, vine: STAGE3, cactus: STAGE3, tree: STAGE3, mushroom: { ...STAGE3, sprout: '균사', juvenile: '균사' } };
export const CAT_ICON = { attack: 'sword', guard: 'shield', evade: 'speed', buff: 'up', debuff: 'down', heal_hp: 'heal', heal_energy: 'energy', other: 'clock', passive: 'star' };
export const CAT_NAME = { attack: '공격', guard: '방어', evade: '회피', buff: '버프', debuff: '디버프', heal_hp: '회복', heal_energy: '햇빛', other: '기타', passive: '패시브' };

const KEYS = Object.keys(CAT_SPECIES);
function grow(s, p, stage, lv, rng) {   // 진짜 규칙으로 진화시켜 기술을 피움(촬영용 — 경험치·물건은 뒤에서 덮어씀)
  while (p.stage < stage) { p.lv = 6; evolve(s, p.uid, rng); }
  p.lv = lv; p.gxp = Math.floor((20 + 10 * lv + 30 * stage) * 0.45); p.pts = (lv - 1) * 2;
  return p;
}
export function mockState(now = Date.now()) {
  const rng = makeRng(20261016);
  const s = newGame({ nickname: '재배사', starter: 'flower_grass' }, rng, now - 6 * 3600e3);
  const p0 = s.plants[0];
  grow(s, p0, 2, 4, rng);
  p0.ivs = { hp: 7, atk: 9, def: 5, spd: 6 }; p0.up = { atk: 4, hp: 2 }; p0.spent = 6; p0.pts = 3; p0.invest = 420;
  p0.skills.forgot.push('j_scent');
  const add = (key, stage, lv, o = {}) => { const p = makePlant(s, { key, ...o }, rng, now - 3 * 3600e3); s.plants.push(p); return grow(s, p, stage, lv, rng); };
  add('cactus_fire', 1, 3, { form: 'weapon' }); add('vine_water', 0, 2); add('thorn', 0, 1); add('aqua', 1, 6); add('spark', 2, 2, { shiny: true });
  const drake = add('drake_cactus', 1, 2);   // 태생 변이(카드 검토 — 전투 칸 넷째에 기술 카드)
  drake.skills.battle[3] = ['m_breath', 'm_frostclaw'].find(id => !drake.cards.includes(id));
  // 열매: 식물마다 다르게(다 참 · 하나 · 없음)
  s.plants.forEach((p, i) => { p.hv = { t0: now - [0, 3, 1, 4, 2, 0, 1][i] * 60000, have: [3, 1, 0, 2, 0, 4, 1][i] }; });
  for (let i = 0; i < 37; i++) {
    const p = makePlant(s, { key: KEYS[(i * 5 + 3) % KEYS.length] }, rng, now - (1 + (i * 13) % 40) * 864e5);
    p.stage = (i * 7) % 3; p.lv = 1 + (i * 3) % 6; p.slept = now - (1 + (i * 13) % 40) * 864e5; s.storage.push(p);
  }
  s.seeds = [seedOf(s, 'flower_wind', rng, { shiny: false }), seedOf(s, 'spark', rng, { shiny: true }), seedOf(s, 'gaia', rng, { shiny: false }), seedOf(s, 'spore_cap', rng, { legend: true, shiny: false })];
  s.seeds.push({ ...seedOf(s, 'flower_fire', rng, { shiny: false }), form: 'predator' });   // 변이 종자(검토)
  s.scions = [{ id: 'sc1', skill: rollScion(rng, p0, 0.4) }, { id: 'sc2', skill: 'sp_leech' }];
  s.cards = { n_fiber: 1, n_vacuole: 2, n_target: 1, n_spine: 1, v_ammo: 1, v_forge: 1, m_flame: 1, m_spear: 1, v_wrath: 1, m_frostclaw: 1, v_sap: 1 };   // 카드 가방(검토)
  s.user = { level: 7, xp: 120 };
  s.wallet = { credits: 1240, gems: 32 };
  s.items = { water: 9, fert: 3, regress: 1, fuel: 3 }; s.fuelT = now - 5 * 60000;
  s.team = [0, 1, 2]; s.active = 0;
  s.profile = { name: '재배사', title: '꿈꾸는 원예가', avatar: 'flower_grass', color: 0 };
  s.titles = ['초보 재배사', '꿈꾸는 원예가', '콜로세움 신인', '별빛 수집가'];
  s.tournament = { tier: '브론즈', name: '새싹 브론즈', round: '예선', wins: 1, losses: 0, bestOf: 5, pts: 0 };
  s.discovered = ['flower_grass', 'cactus_fire', 'vine_water', 'thorn', 'aqua', 'gaia', 'spark'];
  s.pending = [];
  syncTimers(s, now);
  return s;
}
