// 카드 테 · 공개 카드 효과 아이콘 전후 촬영(2026-11-04 사용자 '카드 테두리 바깥에 검은색은 뭐야?' · '선택한 카드 … 아이콘을 카드 밖 아래로'):
//  테두리 검토판(framelab) · 전투 손패 · 공개 카드(효과 아이콘이 있는 기술)를 270×600 ×3으로 → tools/shots/out/<label>/fs_<이름>.png
//  사용: node tools/shots/framesnap.mjs --label before   (전후 비교 = 고치기 전 before · 고친 뒤 after)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './static-server.mjs';
const here = dirname(fileURLToPath(import.meta.url)), repo = resolve(here, '..', '..');
const require = createRequire(resolve(here, 'package.json')), puppeteer = require('puppeteer-core');
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const label = arg('label') || 'framesnap', scale = +(arg('scale') || 3), size = arg('size') ? arg('size').split('x').map(Number) : null;   // --size 270x480 = 짧은 기기
const out = resolve(here, 'out', label); mkdirSync(out, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const SHOTS = [
  ['framelab', 'framelab', {}],
  ['framelab_light', 'framelab', { bg: '8a94a6' }],
  ['cardlab', 'cardlab', {}],
  ['hand', 'battle', { venue: 'colosseum', seed: '7' }],
  ['hand_lit', 'battle', { venue: 'colosseum', seed: '7', use: 's1' }],
  ['reveal_1300', 'battle', { venue: 'colosseum', seed: '7', reveal: '1300', first: 'me' }],
  ['reveal_fx', 'battle', { venue: 'colosseum', seed: '7', reveal: '1500', first: 'foe', me: 'cactus_fire', foe: 'spore_cap' }],
  ['reveal_fx2', 'battle', { venue: 'colosseum', seed: '7', reveal: '1500', first: 'me', me: 'vine_wind', foe: 'flower_grass' }],
  ['reveal_foefx', 'battle', { venue: 'colosseum', seed: '7', reveal: '1500', first: 'me', me: 'spore_cap', foe: 'cactus_fire' }],
  ['reveal_bothfx', 'battle', { venue: 'colosseum', seed: '7', reveal: '1500', first: 'foe', me: 'cactus_fire', foe: 'cactus_fire' }],
  ['peek_front', 'battle', { phase: 'pick', venue: 'colosseum', seed: '7', peek: 's2', peekP: '0' }],
  ['peek_mid', 'battle', { phase: 'pick', venue: 'colosseum', seed: '7', peek: 's2', peekP: '0.45' }],
  ['peek_back', 'battle', { phase: 'pick', venue: 'colosseum', seed: '7', peek: 's2' }],
  ['peek_uniq_back', 'battle', { phase: 'pick', venue: 'colosseum', me: 'cactus_wind', foe: 'aqua', energy: '8', hand: 'u_gale_3', peek: 'u_gale_3' }],
  ['pasview', 'battle', { phase: 'pick', venue: 'colosseum', pcards: 'n_fiber_2,n_wall,n_chloro', pview: '1' }],
  ['pasview_peek', 'battle', { phase: 'pick', venue: 'colosseum', pcards: 'n_fiber_2,n_wall,n_chloro', pview: '1', pvpeek: '1' }],
  ['swap_reveal', 'battle', { mode: 'swap3', venue: 'colosseum', seed: '7', reveal: '1300', swap: 'both', first: 'me' }],
  ['faces_a', 'faces', ['f_ember', 'j_wrap', 'j_spines']],   // 꾹 눌러 보는 큰 카드(앞 · 뒤 — renderFaces 160칸)
  ['faces_b', 'faces', ['u_blade_3b', 'm_bite', 'basic']],
  ['faces_c', 'faces', ['u_emcap_2', 'j_spore', 'n_wall']],
];
// 큰 카드 앞 · 뒤를 나란히(둘레 여백이 있으면 그만큼 넓혀 — 고치기 전 판은 여백 없음)
const facesSheet = async (p, ids) => p.evaluate(async (ids, k) => {
  const S = await import('/v2/src/art/skillcard.js'), Cat = await import('/v2/src/game/catalog.js'), M = await import('/v2/src/battle/model.js'), Cd = await import('/v2/src/game/cards.js');
  const BW = 160, BH = Math.round(BW * 90 / 66), pad = 16, cv = document.createElement('canvas');
  cv.width = (ids.length * 2 * (BW + pad) + pad) * k; cv.height = (BH + 2 * pad) * k;
  const c = cv.getContext('2d'); c.fillStyle = '#8a94a6'; c.fillRect(0, 0, cv.width, cv.height); c.imageSmoothingEnabled = false;
  ids.forEach((id, i) => {
    const sk = Cat.SKILLS[id] || M.BASICS.find(b => b.id === id) || (Cd.CARDS[id] ? Cd.cardFace(id) : null); if (!sk) return;
    const f = S.renderFaces(sk, 66, 90, BW, BH, k, { can: true });
    [f.front, f.back].forEach((im, j) => { const x = (pad + (2 * i + j) * (BW + pad)) * k, y = pad * k, px = (im.padX || 0) * BW * k, py = (im.padY || 0) * BH * k; c.drawImage(im, x - px, y - py, BW * k + 2 * px, BH * k + 2 * py); });
  });
  return cv.toDataURL('image/png');
}, ids, 2);
const only = arg('only') ? arg('only').split(',') : null;
const { srv, url } = await serve(arg('root') ? resolve(arg('root')) : repo);   // --root = 다른 폴더의 판(예: git archive HEAD v2 assets로 꺼낸 고치기 전 판)
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + '/v2/index.html?mute=1', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__ready, { timeout: 20000 });
  for (const [id, scene, params] of SHOTS) {
    if (only && !only.includes(id)) continue;
    const data = scene === 'faces' ? await facesSheet(p, params) : await p.evaluate((scene, params, o) => window.__shot(scene, params, o), scene, params, { scale, ...(size ? { W: size[0], H: size[1] } : {}) });
    const name = `fs_${id}${size ? '_' + size.join('x') : ''}.png`;
    writeFileSync(resolve(out, name), Buffer.from(data.split(',')[1], 'base64'));
    console.log('saved', `${label}/${name}`);
  }
  if (errs.length) console.log('페이지 오류:\n' + errs.join('\n'));
} finally { await b.close(); srv.close(); }
