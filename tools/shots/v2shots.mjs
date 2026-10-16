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
const out = resolve(here, 'out', label); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));

export const SHOTS = [
  ['01_title', 'title', {}],
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
  ['05_plant_skill_sel', 'plant', { tab: 'skill', sel: '1' }],
  ['06_plant_up', 'plant', { tab: 'up' }],
  ['06_plant_set', 'plant', { tab: 'set' }],
  ['06_plant_iv', 'plant', { tab: 'iv' }],
  ['06_plant_forgot', 'plant', { tab: 'skill', sub: 'forgot' }],
  ['06_plant_graft', 'plant', { tab: 'skill', sub: 'graft' }],
  ['07_battle_colosseum', 'battle', { phase: 'pick', venue: 'colosseum' }],
  ['08_battle_hit_colosseum', 'battle', { phase: 'hit', venue: 'colosseum' }],
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
  ['10_hangar', 'hangar', { model: '1' }],
  ['10_hangar_m2', 'hangar', { model: '2' }],
  ['10_hangar_m3', 'hangar', { model: '3', part: 'harvester' }],
  ['10_hangar_m4', 'hangar', { model: '4', part: 'harvester' }],
  ['10_hangar_choose', 'hangar', {}],
  ['11_shop', 'shop', {}],
  ['11_market', 'market', {}],
  ['14_room_lobby', 'room', { demo: 'lobby' }],
  ['14_room_in', 'room', { demo: 'in' }],
  ['12_nursery_got', 'nursery', {}, { popup: { title: '열매 수확', sub: '재배사 경험치 +6', t0: -5000, got: [{ kind: 'credits', n: 31, rar: 0 }, { kind: 'water', n: 2, rar: 1 }, { kind: 'fert', n: 1, rar: 1 }, { kind: 'scion', skill: 'f_ball', rar: 3 }] } }],
  ['12_nursery', 'nursery', {}],
  ['12_storage', 'storage', {}],
  ['13_dex', 'dex', {}],
  ['15_matching', 'matching', {}],
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
    const data = await p.evaluate((scene, params, scale, opt) => window.__shot(scene, params, { scale: scene === 'icons' ? 6 : scale, ...(opt || {}) }), scene, params, scale, { ...(opt || {}), ...(args.ui ? { ui: args.ui } : {}) });
    writeFileSync(resolve(out, `v2_${id}.png`), Buffer.from(data.split(',')[1], 'base64'));
    console.log('saved', `v2_${id}.png`);
  }
  if (errs.length) console.log('페이지 오류:\n' + errs.join('\n'));
} finally { await b.close(); srv.close(); }
