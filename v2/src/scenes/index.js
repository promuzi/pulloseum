import { C } from '../art/palette.js';
import { ICON_SRC, icon, iconMid } from '../art/icons.js';
import { holo } from '../art/theme.js';
import { SW_ON, swStyle } from '../art/statusLook.js';
import { glyphH } from '../core/text.js';
import { title, starter } from './title.js';
import { home } from './home.js';
import { battle } from './battle.js';
import { result } from './result.js';
import { bag } from './bag.js';
import { plant } from './plant.js';
import { explore } from './explore.js';
import { shop } from './shop.js';
import { nursery } from './nursery.js';
import { dex } from './dex.js';
import { storage } from './storage.js';
import { matching } from './matching.js';
import { hangar } from './hangar.js';
import { room } from './room.js';
import { ranks } from './ranks.js';
import { cardFront } from '../art/skillcard.js';
import { drawPortrait, BIG } from '../art/sprites.js';
import { SPECIES } from '../game/catalog.js';
import { SKILLS } from '../game/catalog.js';
import { BASICS } from '../battle/model.js';

// 아이콘 검토판(개발용)
const icons = {
  draw(app) {
    const { g, W, H } = app;
    g.rect(0, 0, W, H, '#2b2238');
    let x = 8, y = 8;
    for (const name of Object.keys(ICON_SRC)) {
      const ic = icon(name);
      if (x + 40 > W) { x = 8; y += 34; }
      g.rect(x, y, 38, 30, C.shade);
      g.img(ic, x + Math.round(19 - ic.width / 2), y + 3);
      g.text(name.slice(0, 6), x + 19, y + 17, { color: C.mute, align: 'center' });
      x += 42;
    }
  },
};

// 카드 덧표시 검토판(개발용 · ?scene=cardlab): 왼쪽 = 보통, 오른쪽 = 그 상황(같은 자세 두 번째 · 변이 횟수 등)
const LAB = [['w_whirl', {}, {}, '흡수 = 회복 아이콘'], ['u_wind_3', {}, {}, '광역 = 폭탄'], ['guard', {}, { halved: true }, '같은 자세 두 번째'],
  ['u_thorn_3', {}, {}, '효과 겹 수'], ['m_bite', {}, { left: 1 }, '변이 · 1번 남음'], ['m_scale', {}, { can: false, left: 0 }, '변이 · 다 씀']];
const cardlab = {
  draw(app) {
    const { g, W } = app;
    g.rect(0, 0, W, app.H, '#141a26');
    LAB.forEach(([id, a, b, label], i) => {
      const sk = SKILLS[id] || BASICS.find(x => x.id === id), col = i % 2, row = Math.floor(i / 2), x0 = 6 + col * 132, y0 = 6 + row * 112;
      cardFront(g, x0, y0, 62, 90, sk, { can: true, ...a });
      cardFront(g, x0 + 66, y0, 62, 90, sk, { can: true, ...b });
      g.text(label, x0 + 64, y0 + 93, { font: 'bold', color: '#e6f3ff', align: 'center' });
    });
  },
};

// 얼굴 칸 검토판(개발용 · ?scene=portraitlab): 종마다 [지금 28 · 고친 28 · 고친 40 · 고친 54]
const portraitlab = {
  draw(app) {
    const { g, W } = app;
    g.rect(0, 0, W, app.H, '#141a26');
    Object.keys(SPECIES).filter(k => BIG[k]).forEach((k, i) => {
      const col = i % 2, row = Math.floor(i / 2), x0 = 4 + col * 134, y0 = 4 + row * 58;
      const box = (x, y, sz, fn) => { g.rect(x - 1, y - 1, sz + 2, sz + 2, '#4a8edc'); g.rect(x, y, sz, sz, '#0a1c32'); g.clip(x, y, sz, sz, fn); };
      box(x0, y0, 28, () => drawPortrait(g, k, x0, y0, 28, false, 28));
      box(x0 + 31, y0, 28, () => drawPortrait(g, k, x0 + 31, y0, 28));
      box(x0 + 62, y0, 40, () => drawPortrait(g, k, x0 + 62, y0, 40));
      g.text(SPECIES[k].name, x0, y0 + 42, { color: '#e6f3ff' });
    });
  },
};

// 효과 아이콘 검토판(개발용 · ?scene=fxlab — 2026-10-22 사용자 "아이콘은 엑셀로 작업중인 변경될 예정인걸 기준으로"): 효과 · 스킬 분류 엑셀 v10의 효과 이름 그대로,
//  전투 효과 창과 같은 칩(1배) + 두 배 그림. 짝 표 = docs/superpowers/specs/2026-10-22-v2-effect-icons.md
const FXLAB = [
  ['능력치 강화', [['활력', 'fx_atk_up'], ['억셈', 'fx_def_up'], ['가속', 'fx_spd_up'], ['예리', 'fx_crit_up'], ['집중', 'fx_acc_up']], true],
  ['능력치 약화', [['쇠약', 'fx_atk_down'], ['시듦', 'fx_def_down'], ['둔화', 'fx_spd_down'], ['무딤', 'fx_crit_down'], ['교란', 'fx_acc_down']], '#ff8a8a'],
  ['해로운 상태이상', [['화상', 'fx_burn', '#ff7a3a'], ['독', 'fx_poison', '#b866ff'], ['출혈', 'fx_bleed', '#ff5a6e'], ['감전', 'fx_shock', '#ffd84a'], ['빙결', 'fx_chill', '#c4ecff'], ['젖음', 'fx_wet', '#4f9dff'],
    ['암실', 'fx_shade', '#a0a3c8'], ['기절', 'st_stun', '#ff86c8'], ['마비', 'st_paral', '#ffe680'], ['얼음', 'st_frozen', '#e8f8ff'], ['봉인', 'fx_seal', '#6fd25c'], ['속박', 'st_root', '#c08a5a'],
    ['도발', 'fx_taunt', '#ff5a5a'], ['포자', 'st_spore', '#8fe0b8'], ['기생', 'st_leech', '#c8e04a']]],
  ['이로운 상태이상', [['재생', 'fx_regen'], ['의지', 'fx_will'], ['면역', 'fx_immune']], true],
  ['준비 효과', [['조준', 'fx_aim'], ['은신', 'fx_stealth'], ['보호막', 'fx_barrier']], true],
  ['자세 · 갑주', [['방어', 'shield'], ['회피', 'fx_evade'], ['반사', 'fx_reflect'], ['갑주', 'fx_armor']], true],
  ['전장 환경', [['강풍', 'env_gale'], ['지옥', 'env_inferno']], '#c0a8ff'],
  ['개인 환경 · 설치 · 소환', [['철벽의 요새', 'env_fortress'], ['모래성', 'env_sandcastle'], ['모래바람', 'env_sandstorm'], ['회복의 성체', 'env_healcastle'], ['지옥의 요새', 'env_hellfort'], ['움직이는 성', 'env_walkcastle'],
    ['쏜위드 덫', 'trap_thorn'], ['희생의 성체', 'summon_guard']], '#e0b070'],
  ['지금 게임에만', [['만개', 'fx_all_up'], ['선공', 'ff']], true],
];
const fxlab = {
  tall: true,
  draw(app) {
    const { g, W, H } = app, gh = glyphH('body');
    g.rect(0, 0, W, H, '#0c1526');
    let y = 6;
    for (const [head, list, kind] of FXLAB) {
      g.text(head, 8, y, { font: 'bold', color: '#8ccfff' }); y += 15;
      list.forEach(([name, ic, col], i) => {
        const c = i % 2, X = 8 + c * 131, S = kind === true ? SW_ON : swStyle(col || kind), im = icon(ic), sm = iconMid(ic) || im, iw = sm ? sm.width + 2 : 0, w = Math.max(48, g.textW(name) + iw + 8);   // 효과 창과 같은 20칸 창 · 18칸 아이콘 왼쪽 끝 · 글자는 아이콘을 뺀 자리의 가운데
        holo(g, X, y, w, 20, S, 16);
        if (sm) g.img(sm, X + 2, y + Math.round((20 - sm.height) / 2));
        g.text(name, ((sm ? X + 3 + sm.width : X) + X + w - 2) / 2, y + Math.round((20 - gh) / 2), { color: S.text, align: 'center' });
        if (im) g.img(im, X + w + 6, y - 1, 2);
        if (c === 1 || i === list.length - 1) y += 26;
      });
      y += 4;
    }
  },
};

export const SCENES = { title, starter, room, home, battle, result, bag, plant, explore, shop, nursery, storage, matching, hangar, dex, ranks, icons, cardlab, portraitlab, fxlab };
