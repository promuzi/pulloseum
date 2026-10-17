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

export const SHOTS = [
  ['01_title', 'title', { at: '12' }],                     // 처음 화면(전등 켜진 뒤 — at = 처음 화면 곡 초)
  ['01_title_dark', 'title', { at: '5.75' }],              // 전등 점화 중(전등이 켜질 때만 의자 · 식물이 보임)
  ['01_title_boot', 'title', { at: '12', bootu: '0.5' }],  // 디스플레이 켜짐 중간
  ['01_starter', 'starter', {}],
  ['02_home_chest', 'home', {}, { level: 6 }],
  ['02_home_chest_open', 'home', {}, { level: 6, chestOpen: 4000 }],
  ['02_home_settings', 'home', {}, { sheet: 'settings' }],
  ['02_home', 'home', {}],
  ['03_home_empty', 'home', { empty: true }],
  ['03_home_profile', 'home', { profile: true }],
  ['03_home_modes', 'home', { modes: true }],
  ['03_home_swap3', 'home', { modes: true, mode: 'swap3' }],
  ['03_home_swap3_card', 'home', { mode: 'swap3' }],
  ['03_home_focus', 'home', { focus: true }],
  ['04_bag', 'bag', {}],
  ['05_plant_skill', 'plant', { tab: 'skill' }],
  ['05_plant_zoom_150', 'plant', { tab: 'skill', zoomAt: '150' }], ['05_plant_zoom_350', 'plant', { tab: 'skill', zoomAt: '350' }], ['05_plant_zoom_550', 'plant', { tab: 'skill', zoomAt: '550' }],   // 홈에서 다가가며 들어오는 중(판이 같이 올라옴 — 2026-10-17)
  ['05_plant_skill_sel', 'plant', { tab: 'skill', sel: '1' }],
  ['05_plant_skill_mut', 'plant', { tab: 'skill', act: '1' }],   // 변이 종자 식물(무기 — 전투 칸 여섯 중 기술 카드 · 카드 칸 = 패시브, 2026-10-17)
  ['05_plant_skill_drake', 'plant', { tab: 'skill', act: '6' }],   // 태생 변이(드레이크캑터)
  ['06_plant_up', 'plant', { tab: 'up' }],
  ['06_plant_set', 'plant', { tab: 'set' }],
  ['06_plant_iv', 'plant', { tab: 'iv' }],
  ['06_plant_forgot', 'plant', { tab: 'skill', sub: 'forgot' }],
  ['06_plant_graft', 'plant', { tab: 'skill', sub: 'graft' }],
  ['07_battle_colosseum', 'battle', { phase: 'pick', venue: 'colosseum' }],
  ['08_battle_hit_colosseum', 'battle', { phase: 'hit', venue: 'colosseum' }],
  ['08_battle_reveal_0150', 'battle', { venue: 'colosseum', reveal: '150' }],
  ['08_battle_reveal_0480', 'battle', { venue: 'colosseum', reveal: '480' }],
  ['08_battle_reveal_0640', 'battle', { venue: 'colosseum', reveal: '640' }],
  ['08_battle_reveal_1000', 'battle', { venue: 'colosseum', reveal: '1000' }],
  ['08_battle_reveal_1300', 'battle', { venue: 'colosseum', reveal: '1300' }],
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
  ['10_explore', 'explore', {}],
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
  ['12_nursery_got', 'nursery', {}, { popup: { title: '열매 수확', sub: '경험치 +6', t0: -5000, got: [{ kind: 'credits', n: 31, rar: 0 }, { kind: 'water', n: 2, rar: 1 }, { kind: 'fert', n: 1, rar: 1 }, { kind: 'scion', skill: 'f_ball', rar: 3 }] } }],
  ['12_nursery', 'nursery', {}],
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
];

const { srv, url } = await serve(repo);
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 860, deviceScaleFactor: 1 });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
  await p.goto(url + '/v2/index.html', { waitUntil: 'load' });
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
