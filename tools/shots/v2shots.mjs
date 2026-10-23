// 새 도트판(v2) 화면 촬영: 장면마다 270×600을 ×3으로 → tools/shots/out/<label>/v2_<장면>.png
// 사용: node tools/shots/v2shots.mjs --label v2a [--scale 3] [--only home,battle]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, 'package.json'));
const puppeteer = require('puppeteer-core');
const repo = resolve(here, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : []).filter(Boolean));
const label = args.label || 'v2';
const scale = +(args.scale || 3);
const only = args.only ? String(args.only).split(',') : null;
// --size 270x480 = 그 논리 크기로(기기마다 화면 높이 480~660 · 폭 256~300 — 겹침 확인)
const SIZE = args.size ? String(args.size).split('x').map(Number) : null;
const out = resolve(here, 'out', label); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));

// 종자 가방 촬영용 종자 일곱(여러 종 · 희귀 · 전설 · 색 변종 · 변이 · 즐겨찾기 · 잠금 — 2026-10-22)
const SEEDS_MIX = [{ key: 'spark', pot: 4, fav: true }, { key: 'gaia', pot: 2 }, { key: 'aqua', pot: 3, shiny: true }, { key: 'cactus_fire', pot: 5, legend: true }, { key: 'vine_wind', pot: 3, form: 'predator' }, { key: 'flower_grass', pot: 1, lock: true }, { key: 'spore_cap', pot: 2 }];
export const SHOTS = [
  ['01_title', 'title', { at: '12' }],                     // 처음 화면(전등 켜진 뒤 — at = 처음 화면 곡 초)
  ['01_title_dark', 'title', { at: '5.75' }],              // 전등 점화 중(전등이 켜질 때만 의자 · 식물이 보임)
  ['01_title_boot', 'title', { at: '12', bootu: '0.5' }],  // 디스플레이 켜짐 중간
  ['01_starter', 'starter', {}],
  ['02_home_chest', 'home', {}, { level: 6, chestAge: 1000 }],
  ['02_home_chest_open', 'home', {}, { level: 6, chestOpen: 4000 }],
  ['02_home_chest_mid', 'home', {}, { level: 6, chestOpen: 110 }],   // 뚜껑이 들리는 중간(코덱스 상자 — 2026-10-22)
  ['02_home_settings', 'home', {}, { sheet: 'settings' }],
  ['02_home', 'home', {}],
  ['02_home_vine_wind_1000', 'home', {}, { plants: [{ key: 'vine_wind', stage: 2 }], t: 1000 }],   // 바람 · 번개 무늬 흐름 · 도는 바람(2026-10-22)
  ['02_home_vine_wind_1600', 'home', {}, { plants: [{ key: 'vine_wind', stage: 2 }], t: 1600 }],   // 바람 · 번개 무늬 흐름 · 도는 바람(2026-10-22)
  ['02_home_cactus_wind_1000', 'home', {}, { plants: [{ key: 'cactus_wind', stage: 2 }], t: 1000 }],   // 바람 · 번개 무늬 흐름 · 도는 바람(2026-10-22)
  ['02_home_cactus_wind_1600', 'home', {}, { plants: [{ key: 'cactus_wind', stage: 2 }], t: 1600 }],   // 바람 · 번개 무늬 흐름 · 도는 바람(2026-10-22)
  ['03_home_empty', 'home', { empty: true }],
  ['03_home_profile', 'home', { profile: true }],
  // 배너 열둘 = 프로필 창 디자인(2026-10-22 사용자 "홀로그램창의 디자인을 배너라고 말한거야") — 번호 = s.profile.color
  ...['sky', 'sunset', 'sprout', 'lavender', 'stars', 'leaf', 'wave', 'circuit', 'aurora', 'nebula', 'gold', 'arena'].map((k, i) => ['03_home_banner_' + k, 'home', {}, { profile: { color: i, avatar: ['flower_grass', 'cactus_fire', 'vine_water', 'flower_wind', 'spark', 'vine_water', 'aqua', 'cactus_fire', 'flower_wind', 'spore_cap', 'gaia', 'flower_grass'][i] }, level2: 30, t: 700 }]),
  ['03_home_profile_lv30', 'home', { profile: true }, { level2: 30, profile: { color: 4 } }],   // 배너 열둘 다 열림(작은 창 미리보기 칸)
  ['03_home_profile_lv5', 'home', { profile: true }, { level2: 5, profile: { color: 1 } }],   // 잠긴 배너
  ['03_home_modes', 'home', { modes: true }],
  ['03_home_rank', 'home', {}, { tour: { tier: '플래티넘', name: '무제한 플래티넘', pts: 245, round: '4강', wins: 2, losses: 1, bestOf: 7 } }],   // 배너 = 단계 · 칸 · 다음 칸까지 막대(2026-10-23)
  ['03_home_modes_rank', 'home', { modes: true }, { tour: { tier: '플래티넘', name: '무제한 플래티넘', pts: 245, round: '4강', wins: 2, losses: 1, bestOf: 7 } }],
  ['03_home_rank_long', 'home', {}, { tour: { tier: '플래티넘', name: '무제한 플래티넘', pts: 30, round: '4강', wins: 3, losses: 3, bestOf: 7 } }],   // 가장 긴 리그 · 단계 이름 + 7판 칸 가득
  ['03_home_swap3', 'home', { modes: true, mode: 'swap3' }],
  ['03_home_swap3_card', 'home', { mode: 'swap3' }],
  ['03_home_focus', 'home', { focus: true }],
  ['04_bag', 'bag', {}, { seedsAdd: SEEDS_MIX }],   // 종자 = 카드 셋씩 줄 · 정렬 줄(2026-10-22)
  ['04_bag_sort_rare', 'bag', { sort: 'rare' }, { seedsAdd: SEEDS_MIX }],
  ['04_bag_sort_pot', 'bag', { sort: 'pot' }, { seedsAdd: SEEDS_MIX }],
  ['04_bag_info', 'bag', { info: true }, { seedsAdd: SEEDS_MIX }],   // 카드를 누름 = 커지며 펼쳐진 상세 창(심기 · 팔기 · 즐겨찾기 · 잠금 — 2026-10-22)
  ['04_bag_select', 'bag', { select: 4 }, { seedsAdd: SEEDS_MIX }],   // 꾹 = 고르기 모드(고른 카드 금빛 · 팔기 n)
  ['04_bag_sellask', 'bag', { select: 6, sellAsk: true, sort: 'rare' }, { seedsAdd: SEEDS_MIX }],   // 여러 개 팔기 확인(특별 종자 섞임 → 특별 빼고)
  ['04_bag_got', 'shop', {}, { popup: { title: '받았어요', t0: -5000, got: [{ kind: 'seed', seed: { key: 'gumiho_bloom', pot: 5 }, rar: 3 }, { kind: 'seed', seed: { key: 'aqua', pot: 3, shiny: true }, rar: 2 }, { kind: 'water', n: 10, rar: 1 }, { kind: 'fert', n: 5, rar: 1 }, { kind: 'regress', n: 1, rar: 4 }, { kind: 'pack_m', n: 1, rar: 3 }] } }],   // 받은 것 칸 = 종자(종마다 · 별 빛무리) · 물건 그림
  ['04_bag_short', 'bag', {}, { seedsAdd: SEEDS_MIX, W: 270, H: 480 }],
  ['04_bag_card', 'bag', { tab: 'card' }],   // 카드 가방(2026-10-22 — 강화 · 팔기 · 끼움 수)
  ['04_bag_item', 'bag', { tab: 'item' }],   // 물건(카드 꾸러미)
  ['05_plant_skill', 'plant', { tab: 'skill' }],
  ['05_plant_zoom_150', 'plant', { tab: 'skill', zoomAt: '150' }], ['05_plant_zoom_350', 'plant', { tab: 'skill', zoomAt: '350' }], ['05_plant_zoom_550', 'plant', { tab: 'skill', zoomAt: '550' }],   // 홈에서 다가가며 들어오는 중(판이 같이 올라옴 — 2026-10-17)
  ['05_plant_skill_sel', 'plant', { tab: 'skill', sel: '1' }],
  ['05_plant_skill_mut', 'plant', { tab: 'skill', act: '1' }],   // 변이 종자 식물(무기 — 전투 칸 여섯 중 기술 카드 · 카드 칸 = 패시브, 2026-10-17)
  ['05_plant_skill_drake', 'plant', { tab: 'skill', act: '6' }],   // 태생 변이(드레이크캑터)
  ['05_plant_passive', 'plant', { tab: 'passive' }],   // 패시브 탭(일반 식물 — 장착 셋 + 가방, 2026-10-18)
  ['05_plant_passive_mut', 'plant', { tab: 'passive', act: '1' }],   // 패시브 탭(변이 식물 — 장착 셋 · 보관 셋 · 가방)
  ['05_plant_passive_low', 'plant', { tab: 'passive', sy: '200' }, { plants: [null, null, { cards: ['n_wall_2', 'n_tropism', null] }] }],   // 패시브 탭 아래(가방 · 꾸러미 · 다른 식물 카드 — 2026-10-22)
  ['05_plant_skill_mut_low', 'plant', { tab: 'skill', act: '1', sy: '420' }],   // 변이 식물 스킬 탭 아래(변이 기술 카드 가방 · 꾸러미 · 다른 식물)
  ['06_plant_up', 'plant', { tab: 'up' }],
  ['06_plant_up_sun', 'plant', { tab: 'up' }, { plants: [{ up: { hp: 2, sunMax: 6, sunRegen: 4 }, pts: 9 }] }],   // 햇빛 그릇 2단 · 회복 1단(2026-10-18)
  ['06_plant_set', 'plant', { tab: 'set' }],
  ['06_plant_iv', 'plant', { tab: 'iv' }],
  ['06_plant_iv_seeds', 'plant', { tab: 'iv' }, { seedsLike: 7, plants: [{ ivp: { fruit: 2 } }] }],
  ['06_seedpick', 'plant', { tab: 'iv' }, { seedsLike: 14, seedpick: { special: 2 } }],   // 종자 거름 고르기(2026-10-18) — 목록
  ['06_seedpick_info', 'plant', { tab: 'iv' }, { seedsLike: 14, seedpick: { special: 2, info: 2 } }],   // 한 번 누름 = 정보
  ['06_seedpick_mark', 'plant', { tab: 'iv' }, { seedsLike: 14, seedpick: { special: 2, fav: [5, 9], lock: [2, 9], mode: 'select', sel: [0, 1] } }],   // 즐겨찾기(앞으로 · ★) · 잠금(자물쇠 · 못 고름)
  ['06_seedpick_markinfo', 'plant', { tab: 'iv' }, { seedsLike: 14, seedpick: { fav: [5], lock: [5], info: 5 } }],   // 정보 창 = 즐겨찾기 · 잠금 단추
  ['06_seedpick_sel', 'plant', { tab: 'iv' }, { seedsLike: 14, seedpick: { special: 2, mode: 'select', sel: [0, 1, 2, 5, 6] } }],   // 꾹 = 선택 모드
  ['06_seedpick_stat', 'plant', { tab: 'iv' }, { seedsLike: 14, plants: [{ ivp: { hp: 2 } }], seedpick: { special: 2, mode: 'select', sel: [0, 1, 2, 5, 6], stage: 'stat', stat: 'hp' } }],   // 능력치 고르기 + 특별 종자 주의   // 종자 거름(같은 종 종자 일곱 · 열매 게이지 2/3 — 2026-10-18)
  ['06_plant_forgot', 'plant', { tab: 'skill', sub: 'forgot' }],
  ['06_plant_graft', 'plant', { tab: 'skill', sub: 'graft' }],
  ['06_draft_evo_0500', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 500 } }], ['06_draft_evo_1150', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 1150 } }], ['06_draft_evo_1600', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 1600 } }],   // 진화 연출(scenes/draft.js — 2026-10-18)
  ['06_draft_evo', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 2800 } }],   // 새 고르기 화면(2026-10-18): 위 = 얻은 카드 · 아래 = 장착 · 보관
  ['06_draft_graft', 'plant', { tab: 'skill' }, { draft: { kind: 'graft', n: 1, pick: 1, at: 2800 } }],   // 접목 = 카드 한 장 고르기(2026-10-22 — 보류하면 가지가 돌아감)
  // 대기실 오른쪽 단추 넷(가방 · 도감 · 순위 · 공지 — 새 공지 빨간 점) · 공지 창 · 순위표(2026-10-22)
  ['03_home_side4', 'home', {}, { online: true }],
  ['15_notice', 'home', {}, { online: true, notices: [{ id: 2, title: '식물 빛이 생겼어요', body: '불 · 번개 · 수정처럼 스스로 빛나는 식물이 제 빛을 비춰요.\n스마트팜은 이제 아침 · 낮 · 노을 · 밤이 바뀌어요.', created: 1792670000000 }, { id: 1, title: '3:3 햇빛이 식물마다 따로', body: '대기석에 있는 동안은 햇빛이 차지 않아요.', created: 1792600000000 }] }],
  ['15_ranks', 'ranks', { mock: { league: 'sprout', season: 3, total: 6, top: [{ rank: 1, name: '코스모싹', avatar: 'gaia', level: 12, tier: 6, pts: 0, round: 0, stars: 2 }, { rank: 2, name: '밤하늘', avatar: 'cactus_fire', level: 9, tier: 3, pts: 255, round: 3 }, { rank: 3, name: null, avatar: 'spark', level: 8, tier: 2, pts: 330, round: 4 }, { rank: 4, me: true, name: '재배사', avatar: 'flower_grass', level: 7, tier: 2, pts: 140, round: 1 }, { rank: 5, name: '초록손', avatar: 'aqua', level: 5, tier: 1, pts: 75, round: 2 }, { rank: 6, name: '선인장왕', avatar: 'drake_cactus', level: 4, tier: 0, pts: 20, round: 3 }], mine: { rank: 4, tier: 2, pts: 140, round: 1, stars: 0 } } }, {}],
  ['06_draft_evo_sel', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 2800, sel: 1 } }],   // 카드 고름 = [장착]
  ['06_draft_evo_arm', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 2800, sel: 1, arm: 1 } }],   // [장착] = 놓을 칸이 숨 쉼
  ['06_draft_evo_placed', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 2800, moves: [[1, 'b0']] } }],   // 바꿈 = 원래 것은 위 줄 · 둘 다 빛남
  ['06_draft_evo_done', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 2800, moves: [[1, 'b0'], [0, 's0']] } }],   // 다 놓음 = 확정 켜짐
  ['06_draft_evo_scroll', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 2800, moves: [[0, 's0']], sy: 999 } }],   // 아래 칸 끝까지 넘김
  ['06_draft_peek', 'plant', { tab: 'skill' }, { draft: { evo: 1, at: 2800, peek: 't0' } }],   // 꾹 = 뒷면
  ['06_draft_passive', 'plant', { tab: 'skill' }, { draft: { part: 'passive', at: 900 } }],   // 패시브 고르기(일반 식물)
  ['06_draft_passive_mut', 'plant', { tab: 'skill', act: '1' }, { draft: { part: 'passive', at: 900 } }],   // 패시브 고르기(변이 식물 — 장착 셋 · 보관 셋)
  ['06_draft_lv', 'plant', { tab: 'skill' }, { draft: { n: 3, pick: 1, at: 900 } }],   // 레벨업 = 셋 중 하나
  ['07_battle_colosseum', 'battle', { phase: 'pick', venue: 'colosseum' }],
  ['08_battle_hit_colosseum', 'battle', { phase: 'hit', venue: 'colosseum' }],
  ['08_fx_area_fire', 'battle', { phase: 'hit', venue: 'colosseum', use: 'f_pillar', hitAt: '200' }],   // 기술 속성 · 모양 연출(2026-10-22)
  ['08_fx_area_fire0', 'battle', { phase: 'hit', venue: 'colosseum', use: 'f_pillar', hitAt: '0' }],   // 기술 속성 · 모양 연출(2026-10-22)
  ['08_fx_area_ice', 'battle', { phase: 'hit', venue: 'colosseum', use: 'i_blizzard', hitAt: '220' }],   // 기술 속성 · 모양 연출(2026-10-22)
  ['08_fx_single_fire', 'battle', { phase: 'hit', venue: 'colosseum', use: 'f_ember', hitAt: '0' }],   // 기술 속성 · 모양 연출(2026-10-22)
  ['08_fx_single_bolt', 'battle', { phase: 'hit', venue: 'colosseum', use: 'b_bolt', hitAt: '0' }],   // 기술 속성 · 모양 연출(2026-10-22)
  ['08_fx_area_bolt', 'battle', { phase: 'hit', venue: 'colosseum', use: 'b_thunder', hitAt: '260' }],   // 기술 속성 · 모양 연출(2026-10-22)
  ['08_fx_melee_earth', 'battle', { phase: 'hit', venue: 'colosseum', use: 'e_quake', hitAt: '0' }],   // 기술 속성 · 모양 연출(2026-10-22)
  ['08_battle_reveal_0150', 'battle', { venue: 'colosseum', reveal: '150' }],
  ['08_battle_reveal_0480', 'battle', { venue: 'colosseum', reveal: '480' }],
  ['08_battle_reveal_0640', 'battle', { venue: 'colosseum', reveal: '640' }],
  ['08_battle_reveal_1000', 'battle', { venue: 'colosseum', reveal: '1000' }],
  ['08_battle_reveal_1300', 'battle', { venue: 'colosseum', reveal: '1300' }],
  ['08_battle_reveal_swap_0480', 'battle', { mode: 'swap3', venue: 'colosseum', seed: '7', reveal: '480', swap: 'me', first: 'foe' }],   // 교체 카드(2026-10-18) — 내 쪽 교체 · 상대 기술 뒤집힘
  ['08_battle_reveal_swap_1300', 'battle', { mode: 'swap3', venue: 'colosseum', seed: '7', reveal: '1300', swap: 'both', first: 'me' }],
  ['08_battle_reveal_1900', 'battle', { venue: 'colosseum', reveal: '1900' }],   // 턴 시작 공개(2026-10-17 — 카드 나옴 · 상대 카드 뒤집힘 · 선공 · 후공 · 들어감)
  ['08_battle_reveal_me_first', 'battle', { venue: 'colosseum', reveal: '1300', first: 'me' }],
  ['08_battle_cards_mut', 'battle', { phase: 'pick', venue: 'colosseum', energy: '3', mut: 'weapon', mk: 'm_flamer,m_rocket' }],   // 변이 카드 각진 테 · 해 비용 · 햇빛 에너지 칸(2026-10-17)
  ['08_battle_reveal_mut', 'battle', { venue: 'colosseum', reveal: '1400', mut: 'weapon', mk: 'm_xbow,m_rocket' }],
  ['08_battle_cards_mut2', 'battle', { phase: 'pick', venue: 'colosseum', energy: '2', me: 'flower_fire', mut: 'predator' }],
  ['07_battle_status', 'battle', { phase: 'pick', venue: 'colosseum', status: '1' }],
  ['07_battle_peek', 'battle', { phase: 'pick', venue: 'colosseum', peek: 's1' }],
  ['07_battle_emote', 'battle', { phase: 'pick', venue: 'colosseum', emote: '1' }],
  ['07_battle_cards_ember', 'battle', { phase: 'pick', venue: 'colosseum', me: 'cactus_fire', foe: 'flower_grass', energy: '4' }],
  ['07_battle_peek_art', 'battle', { phase: 'pick', venue: 'colosseum', energy: '4', peek: 's2' }],
  ['07_battle_peek_mid', 'battle', { phase: 'pick', venue: 'colosseum', peek: 's2', peekP: '0.45' }],
  ['07_battle_peek_guard', 'battle', { phase: 'pick', venue: 'colosseum', peek: 'guard' }],
  ['07_battle_info', 'battle', { phase: 'pick', venue: 'colosseum', status: '1', info: '1' }],
  ['07_battle_fx', 'battle', { phase: 'pick', venue: 'colosseum', me: 'flower_fire', foe: 'gaia', pre: 'foe:burn,poison3,wet,chill2,shock1,leech;me:shade,gale' }],
  ['07_battle_skip', 'battle', { phase: 'pick', venue: 'colosseum', pre: 'me:stun;foe:weak,corrode' }],
  ['07_battle_bind', 'battle', { phase: 'pick', venue: 'colosseum', energy: '4', pre: 'me:bind,taunt' }],
  ['07_battle_root3', 'battle', { mode: 'swap3', venue: 'colosseum', seed: '7', pre: 'me:root,poison2;foe:chill2' }],
  ['07_battle_swap3', 'battle', { mode: 'swap3', venue: 'colosseum', seed: '7' }],
  ['07_battle_swap3_sheet', 'battle', { mode: 'swap3', venue: 'colosseum', seed: '7', sheet: '1' }],
  ['07_battle_swap3_dead', 'battle', { mode: 'swap3', venue: 'colosseum', seed: '7', dead: 'me2,foe1' }],
  ['07_battle_garden', 'battle', { phase: 'pick', venue: 'garden' }],
  ['07_battle_ship', 'battle', { phase: 'pick', venue: 'ship' }],
  ['07_battle_night', 'battle', { phase: 'pick', venue: 'night' }],
  ['07_battle_retro', 'battle', { phase: 'pick', venue: 'retro' }],
  ['08_battle_hit', 'battle', { phase: 'hit', venue: 'garden' }],
  ['08_battle_hit_retro', 'battle', { phase: 'hit', venue: 'retro' }],
  ['07_battle_cell', 'battle', { phase: 'pick', venue: 'cell' }],
  ['08_battle_hit_cell', 'battle', { phase: 'hit', venue: 'cell' }],
  ['09_result', 'result', { win: true }],
  ['09_result_full', 'result', { win: true, full: '1' }],   // 보상 칸 여섯(두 줄 — 연료 · 부품, 2026-10-17)
  ['09_result_champ', 'result', {}, { tour: { tier: '골드', name: '새싹 골드', pts: 310, round: '예선', wins: 0, losses: 0 }, result: { reward: { credits: 405, parts: 7, xp: { gained: 30 }, champ: true, round: '예선', rankPts: 45, divUp: '골드 1' }, info: { round: '결승', bestOf: 5 } } }],   // 우승 +45 · 칸 오름(2026-10-23)
  ['09_result_round', 'result', {}, { tour: { tier: '골드', name: '새싹 골드', pts: 175, round: '4강', wins: 0, losses: 0 }, result: { reward: { credits: 90, parts: 2, water: 1, xp: { gained: 30 }, round: '4강', rankPts: 25 }, info: { round: '8강', bestOf: 5 } } }],   // 8강 통과 +25
  ['09_result_cupend', 'result', {}, { tour: { tier: '실버', name: '새싹 실버', pts: 95, round: '예선', wins: 0, losses: 0 }, result: { win: false, reward: { credits: 15, xp: { gained: 10 }, reset: 'cup', rankPts: -10, divDown: '실버 4' }, info: { round: '예선', bestOf: 5 } } }],   // 예선 탈락 −10 · 칸 내려감
  ['07_battle_title_long', 'battle', { phase: 'pick', venue: 'colosseum', title: '무제한 플래티넘 III · 4강', nB: '7', w: '3', l: '2' }],   // 가장 긴 대회 제목(로마 숫자 칸) + 7판 칸(3승 2패)
  ['10_explore', 'explore', {}],
  ['10_explore_zoom1', 'explore', { map: '1', mapAt: '250' }],   // 행성을 눌러 지도로 다가가는 중간(코덱스 행성 그림 → 지도, 2026-10-22)
  ['10_explore_zoom2', 'explore', { map: '1', mapAt: '450' }],
  ['10_explore_zoom3', 'explore', { map: '1', mapAt: '650' }],
  ['10_explore_map', 'explore', { map: '1' }],   // 지역 판(연료 n/3 · 탐사 보내기 · 연료 1 · 돈 — 2026-10-17)
  ['10_hangar', 'hangar', { model: '1' }],
  ['10_hangar_m2', 'hangar', { model: '2' }],
  ['10_hangar_m3', 'hangar', { model: '3', part: 'harvester' }],
  ['10_hangar_m4', 'hangar', { model: '4', part: 'harvester' }],
  ['10_hangar_choose', 'hangar', {}],
  ['10_hangar_hull', 'hangar', { model: '1', part: 'hull' }],   // 내구성(글이 가장 긴 부위) — 강화 단추가 글 아래(2026-10-17)
  ['11_shop', 'shop', {}],
  ['14_room_lobby', 'room', { demo: 'lobby' }],
  ['14_room_in', 'room', { demo: 'in' }],
  ['14_room_in3', 'room', { demo: 'in3' }],   // 3:3 교체전 방(내 팀 셋)
  ['14_teampick', 'home', { modes: true, mode: 'swap3' }, { teampick: { sel: [0, 2] } }],   // 3:3 팀 고르기 창(2026-10-18 — 홈 · 친구 방 공용)
  ['14_teampick_full', 'room', { demo: 'in3' }, { teampick: { sel: [1, 0, 3] } }],
  ['14_teampick_lift', 'home', { modes: true, mode: 'swap3' }, { teampick: { sel: [1, 0, 3], lift: 1 } }],   // 위 칸 들어 올림 = 자리 바꾸기(2026-10-22)
  ['12_nursery_got', 'nursery', {}, { popup: { title: '열매 수확', sub: '경험치 +6', t0: -5000, got: [{ kind: 'credits', n: 31, rar: 0 }, { kind: 'water', n: 2, rar: 1 }, { kind: 'fert', n: 1, rar: 1 }, { kind: 'scion', skill: 'f_ball', rar: 3 }] } }],
  ['12_nursery_got_many', 'nursery', {}, { popup: { title: '열매 수확', sub: '경험치 +90', t0: -9000, sy: 0, got: Array.from({ length: 22 }, (_, i) => i % 2 ? { kind: 'scion', skill: 'f_ball', rar: 3 } : { kind: 'seed', seed: { key: 'flower_grass' }, rar: 2 }) } }],   // 칸이 화면보다 많음 = 칸 줄만 끌어 넘김 · '확인'은 늘 보임(2026-10-18)
  ['12_nursery_got_many_end', 'nursery', {}, { popup: { title: '열매 수확', sub: '경험치 +90', t0: -9000, sy: 9999, got: Array.from({ length: 22 }, (_, i) => i % 2 ? { kind: 'scion', skill: 'f_ball', rar: 3 } : { kind: 'seed', seed: { key: 'flower_grass' }, rar: 2 }) } }],
  ['12_nursery', 'nursery', {}],
  ['12_nursery_names', 'nursery', {}, { plants: [{ name: '로즈' }, { name: '번쩍번쩍스파크번' }, { name: '타이드바인' }, { name: '가시돋친쏜위드왕' }, { name: '아쿠아벌브' }, { name: '불꽃' }] }],   // 서랍 이름표 가운데 · 긴 이름 줄여 넣기(2026-10-18)
  ['12_nursery_names3', 'nursery', { cols: '3' }, { plants: [{ name: '로즈' }, { name: '번쩍번쩍스파크번' }, { name: '타이드바인' }, { name: '가시돋친쏜위드왕' }, { name: '아쿠아벌브' }, { name: '불꽃' }] }],
  ['12_nursery_new6', 'nursery', {}, { plants: [{ key: 'pirate_cactus', name: '파이렛캑터', stage: 2 }, { key: 'ranger_vine', name: '레인저바인', stage: 2 }, { key: 'miner_cap', name: '마이너캡', stage: 2 }, { key: 'snow_ballet', name: '스노우발레', stage: 2 }, { key: 'volcano_cap', name: '볼케이노캡', stage: 2 }, { key: 'dandel_aero', name: '단델에어로', stage: 2 }] }],   // 새 여섯(2026-10-18) 실제 크기 확인
  ['12_nursery_new9', 'nursery', {}, { plants: [{ key: 'gladi_cactus', stage: 2 }, { key: 'hyunmu_cap', stage: 2 }, { key: 'gumiho_bloom', stage: 2 }, { key: 'wizard_bell', stage: 2 }, { key: 'ninja_vine', stage: 2 }, { key: 'diver_vine', stage: 2 }, { key: 'viking_cap', stage: 2 }] }],   // 셋째 아홉(2026-10-17)
  ['12_nursery_new9b', 'nursery', {}, { plants: [{ key: 'jangseung_cactus', stage: 2 }, { key: 'astro_cap', stage: 2 }, { key: 'gladi_cactus', stage: 0 }, { key: 'hyunmu_cap', stage: 1 }, { key: 'gumiho_bloom', stage: 0 }, { key: 'wizard_bell', stage: 1 }, { key: 'ninja_vine', stage: 0 }] }],
  ['07_battle_new9', 'battle', { phase: 'pick', venue: 'colosseum', me: 'gladi_cactus', foe: 'astro_cap' }],
  ['07_battle_new9b', 'battle', { phase: 'pick', venue: 'colosseum', me: 'diver_vine', foe: 'viking_cap' }],
  ['07_battle_astro', 'battle', { phase: 'pick', venue: 'colosseum', me: 'astro_cap', foe: 'wizard_bell' }],   // 화분 풀 · 흙 자리 검토(아스트로캡 흰 밑동 · 마법사 성체 덩치 — 2026-10-17)
  ['02_home_astro', 'home', {}, { plants: [{ key: 'astro_cap', stage: 2 }] }],
  ['02_home_wizard', 'home', {}, { plants: [{ key: 'wizard_bell', stage: 2 }] }],
  ['12_nursery_gaia', 'nursery', {}, { plants: [{ key: 'gaia', stage: 2 }, { key: 'gaia', stage: 1 }, { key: 'gaia', stage: 0 }] }],   // 화분 앞 부위(주먹) — 잔디에 심은 세 단계
  ['02_home_gaia', 'home', {}, { plants: [{ key: 'gaia', stage: 2 }] }],
  ['05_plant_gaia', 'plant', { tab: 'skill' }, { plants: [{ key: 'gaia', stage: 2 }] }],
  ['12_storage', 'storage', {}],
  ['13_dex', 'dex', {}],
  ['15_matching', 'matching', {}],
  // 처음 안내(튜토리얼) — 장마다
  ['20_guide_home_0', 'home', {}, { guide: 0 }],
  ['20_guide_home_1', 'home', {}, { guide: 1 }],
  ['20_guide_home_2', 'home', {}, { guide: 2 }],
  ['20_guide_home_3', 'home', {}, { guide: 3 }],
  ['20_guide_home_4', 'home', {}, { guide: 4 }],
  ['20_guide_home_5', 'home', {}, { guide: 5 }],
  ['20_guide_battle_0', 'battle', {'phase':'pick','venue':'colosseum'}, { guide: 0 }],
  ['20_guide_battle_1', 'battle', {'phase':'pick','venue':'colosseum'}, { guide: 1 }],
  ['20_guide_battle_2', 'battle', {'phase':'pick','venue':'colosseum'}, { guide: 2 }],
  ['20_guide_battle_3', 'battle', {'phase':'pick','venue':'colosseum'}, { guide: 3 }],
  ['20_guide_battle_4', 'battle', {'phase':'pick','venue':'colosseum'}, { guide: 4 }],
  ['20_guide_battle3_0', 'battle', {'mode':'swap3','venue':'colosseum','seed':'7'}, { guide: 0 }],
  ['20_guide_battle3_1', 'battle', {'mode':'swap3','venue':'colosseum','seed':'7'}, { guide: 1 }],
  ['20_guide_battle3_2', 'battle', {'mode':'swap3','venue':'colosseum','seed':'7'}, { guide: 2 }],
  ['20_guide_battle3_3', 'battle', {'mode':'swap3','venue':'colosseum','seed':'7'}, { guide: 3 }],
  ['20_guide_battle3_4', 'battle', {'mode':'swap3','venue':'colosseum','seed':'7'}, { guide: 4 }],
  ['20_guide_battle3_5', 'battle', {'mode':'swap3','venue':'colosseum','seed':'7'}, { guide: 5 }],
  ['20_guide_battle3_6', 'battle', {'mode':'swap3','venue':'colosseum','seed':'7'}, { guide: 6 }],
  ['20_guide_plant_0', 'plant', {'tab':'skill'}, { guide: 0 }],
  ['20_guide_plant_1', 'plant', {'tab':'skill'}, { guide: 1 }],
  ['20_guide_plant_2', 'plant', {'tab':'skill'}, { guide: 2 }],
  ['20_guide_plant_3', 'plant', {'tab':'skill'}, { guide: 3 }],
  ['20_guide_plant_4', 'plant', {'tab':'skill'}, { guide: 4 }],
  ['20_guide_plant_up_0', 'plant', {'tab':'up'}, { guide: 0 }],
  ['20_guide_plant_up_1', 'plant', {'tab':'up'}, { guide: 1 }],
  ['20_guide_plant_iv_0', 'plant', {'tab':'iv'}, { guide: 0 }],
  ['20_guide_plant_iv_1', 'plant', {'tab':'iv'}, { guide: 1 }],
  ['20_guide_nursery_0', 'nursery', {}, { guide: 0 }],
  ['20_guide_nursery_1', 'nursery', {}, { guide: 1 }],
  ['20_guide_nursery_2', 'nursery', {}, { guide: 2 }],
  ['20_guide_nursery_3', 'nursery', {}, { guide: 3 }],
  ['20_guide_storage_0', 'storage', {}, { guide: 0 }],
  ['20_guide_bag_0', 'bag', {}, { guide: 0 }],
  ['20_guide_bag_1', 'bag', {}, { guide: 1 }],
  ['20_guide_bag_2', 'bag', {}, { guide: 2 }],
  ['20_guide_bag_3', 'bag', {}, { guide: 3 }],
  ['20_guide_explore_0', 'explore', {}, { guide: 0 }],
  ['20_guide_explore_1', 'explore', {}, { guide: 1 }],
  ['20_guide_explore_2', 'explore', {}, { guide: 2 }],
  ['20_guide_explore_3', 'explore', {}, { guide: 3 }],
  ['20_guide_hangar_0', 'hangar', {'model':'1'}, { guide: 0 }],
  ['20_guide_hangar_1', 'hangar', {'model':'1'}, { guide: 1 }],
  ['20_guide_hangar_2', 'hangar', {'model':'1'}, { guide: 2 }],
  ['20_guide_shop_0', 'shop', {}, { guide: 0 }],
  ['20_guide_shop_1', 'shop', {}, { guide: 1 }],
  ['20_guide_room_0', 'room', {'demo':'lobby'}, { guide: 0 }],
  ['20_guide_room_1', 'room', {'demo':'lobby'}, { guide: 1 }],
  ['20_guide_room_2', 'room', {'demo':'lobby'}, { guide: 2 }],
  ['20_guide_dex_0', 'dex', {}, { guide: 0 }],
  ['98_cardlab', 'cardlab', {}],   // 카드 추가 표시 검토판
  ['99_icons', 'icons', {}],
  ['99_fxlab', 'fxlab', {}, { H: 790 }],
  // 색 변종(2026-10-22 — 지금 고른 후보 · 원래 첫째 식물을 색 변종으로)
  ['02_home_shiny', 'home', {}, { plants: [{ shiny: true }] }],
  ['07_battle_shiny', 'battle', { phase: 'pick', venue: 'colosseum', shiny: '1' }],
  ['12_nursery_shiny', 'nursery', {}, { plants: [{ shiny: true }, { shiny: true }, { shiny: true }, { shiny: true }] }],
  ['05_plant_shiny', 'plant', { tab: 'skill' }, { plants: [{ shiny: true }] }],   // 효과 아이콘 검토판(엑셀 v10 효과 이름 — 2026-10-22)
];

const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });   // 404 가 어느 파일인지(콘솔 글엔 주소가 없음)
  await p.goto(url + '/v2/index.html' + (args.q ? '?' + args.q : ''), { waitUntil: 'load' });   // --q light=0 = 식물 빛 끔(전후 비교)
  await p.waitForFunction(() => window.__ready, { timeout: 15000 });
  const ready = await p.evaluate(() => window.__ready);
  if (ready.missing.length || ready.bad.length) console.log('경고', JSON.stringify(ready));
  for (const [id, scene, params, opt] of SHOTS) {
    if (only && !only.includes(id) && !only.includes(scene)) continue;
    const data = await p.evaluate((scene, params, scale, opt) => window.__shot(scene, params, { scale: scene === 'icons' ? 6 : scale, ...(opt || {}) }), scene, params, scale, { ...(opt || {}), ...(args.ui ? { ui: args.ui } : {}), ...(SIZE ? { W: SIZE[0], H: SIZE[1] } : {}) });
    writeFileSync(resolve(out, `v2_${id}.png`), Buffer.from(data.split(',')[1], 'base64'));
    console.log('saved', `v2_${id}.png`);
  }
  if (errs.length) console.log('페이지 오류:\n' + errs.join('\n'));
} finally { await b.close(); srv.close(); }
