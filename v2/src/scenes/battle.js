import { arena1 } from '../art/bg.js';
import { arenaLife } from '../art/arenaLife.js';
import { colosseumFloor } from '../art/arenaFloor.js';
import { icon, iconMid, tinted } from '../art/icons.js';
import { drawBig, drawBigPose, drawPortrait, BGIMG, bigKey } from '../art/sprites.js';
// 그림 키 = 그 식물 단계 그림(어린 · 자람 · 다 자람) — 2026-10-17 전엔 종 키로만 그려 늘 다 자란 모습이었음
const artOf = u => (u ? bigKey(u.key, u.stage, u.shiny) : u);
import { T, plate, btnBody, tbar, tpips, padV, venueOf, holo, UI, UI_ACCENT } from '../art/theme.js';
import { CAT_ICON, CAT_NAME, SPECIES } from '../data/mock.js';
import { makeUnit, makeBattle, playTurn, elemMult, REST, randomOk } from '../battle/model.js';
import { makeTeamBattle, playTurn3, sendIn, aliveOf, protoStats, swapWait } from '../battle/team.js';
import { listOf, mustSkip, canUse, canSwitch, lockOf, apply as applyFx, usesLeft } from '../battle/status.js';
import { resLine, FIELD, RES_ICON, summonAdd } from '../battle/devices.js';
import { STATUS, STATUS_DESC, SW_ON, swStyle, hexMix } from '../art/statusLook.js';
import { ELEMENT } from '../art/palette.js';
import { FORMS, formSkills, SKILLS } from '../game/catalog.js';
import { button, rrect } from '../art/ui.js';
import { cardFront, cardSlot, renderFaces, renderFront, renderDown, renderSwapFront, drawFlip, cardTiny, sunDisc, SUN } from '../art/skillcard.js';
import { CARDS, cardFace } from '../game/cards.js';
import { makeAttack, prepareBoards, boardCanvas, FRAME_MS, FRA } from '../battle/fx.js';
import { ATTACKS } from '../../../tools/pixel/big/attack.mjs';

// 공격 연출 고르기(2026-10-22 사용자 "게임 이팩트도 다양성을 높이자 지금은 너무 평범해" · "광역이나 단일 등도 차이점을 주거나 하면 좋을 거 같아(나중에 스킬 개편 시 영향을 덜 받는 것 위주로)"):
//  ① 제 연출이 있는 기술(개성 · 변이 · 무기 — attack.mjs ATTACKS[기술 id]) 그대로 ② 속성 공통 기술(하급 · 중급 · 상급 · 가지 · 특수) = 그 속성 색 + 기술 모양
//  ③ 제 연출 없는 개성 · 무속성 = 종 연출, 단 광역 · 연타면 종 색으로 모양만 바꿈. 모양은 기술 id가 아니라 성질(광역 area · 연타 hits · 원거리 ranged)만 봄 — 기술을 고쳐도 따라감
//  (전엔 속성 공통 기술도 그 식물 종 연출 — 장미가 불씨를 써도 잎 베기)
const EL_SP = { fire: 'cactus_fire', water: 'aqua', grass: 'flower_grass', bolt: 'spark', earth: 'gaia', wind: 'flower_wind', ice: 'frost_bell' };
const SHAPE = {
  area: { fire: 'bloom', water: 'wave', grass: 'gale', bolt: 'rings', earth: 'slam', wind: 'gale', ice: 'rings', '-': 'rings' },          // 퍼지는 것 · 바닥을 타는 것
  multi: { fire: 'blades', water: 'bubbles', grass: 'blades', bolt: 'bolt', earth: 'bubbles', wind: 'blades', ice: 'blades', '-': 'blades' },   // 여러 개
  ranged: { fire: 'fireball', water: 'bubbles', grass: 'blades', bolt: 'bolt', earth: 'fireball', wind: 'gale', ice: 'fireball', '-': 'fireball' },   // 날아가는 것
  melee: { fire: 'slash', water: 'whip', grass: 'whip', bolt: 'slash', earth: 'slam', wind: 'slash', ice: 'slash', '-': 'slash' },          // 베기 · 채찍 · 내려치기
};
const MOVE_OF = { whip: 'lunge', blades: 'lunge', slash: 'lunge', slam: 'slam', bite: 'lunge' };
// 광역 기술 = 맞는 자리 바닥에 넓게 퍼지는 충격파(납작한 고리 둘 · 그 속성 빛 · 점점 옅게) + 맞는 순간 무대가 그 색으로 잠깐 번쩍 — 단일 기술(한 점에 터짐)과 갈림
function areaWave(g, st, age, [x, y], AY, AH) {
  const k0 = (age - (st.anim.I + 1) * FRAME_MS) / 560; if (k0 < 0 || k0 > 1.15) return;
  const E = ELEMENT[st.skill.el] || { light: '#ffffff', main: '#c8d4e4' };
  if (k0 < 0.12) g.alpha(0.2 * (1 - k0 / 0.12), () => g.rect(0, AY, 270, AH, E.light));
  for (const [lag, col, w] of [[0, E.light, 2], [0.18, E.main, 1]]) {
    const k = k0 - lag; if (k < 0 || k > 1) continue;
    const rx = 14 + 74 * (1 - (1 - k) ** 2), ry = rx * 0.3, n = Math.round(rx * 1.6);
    g.alpha(1 - k, () => { for (let i = 0; i < n; i++) { if ((i + Math.floor(k * 10)) % 5 === 4) continue; const a = (i / n) * Math.PI * 2; g.rect(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), w, 1, col); } });   // 끊긴 고리(도트)
  }
}
const fxMemo = new Map();
// 상태이상 빛(식물 노멀맵 조명 — 2026-10-22): (x, y) = 화분 굽 · 화상 = 흙 언저리에서 일렁이는 불빛 · 감전 · 마비 = 가끔 몸 둘레가 번쩍 ·
//  빙결 · 얼음 = 위에서 내리는 찬 빛 · 독 = 밑에서 보랏빛. 걸린 순간(효과 연출)엔 더 셈. 깜빡임은 80ms 마디로만 바뀜(장마다 다시 칠하는 일을 줄임)
const NIGHT_AMB = [0.82, 0.82, 0.94];   // 밤 경기장(바닥 · 관중석이 보랏빛으로 밝은 편이라 식물만 너무 어두우면 떠 보임)
const hash1 = n => { let h = Math.imul(n | 0, 374761393); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function statusLights(v, who, x, y, t) {
  const ids = new Set((v.eff[who] || []).map(s => s.id)), out = [], ph = who === 'me' ? 0 : 1.7, tq = Math.floor(t / 80) * 80;
  const burst = (...kinds) => { let a = 0; for (const e of v.sfx) if (e.who === who && kinds.includes(e.kind)) a = Math.max(a, 1 - (t - e.t0) / 900); return Math.max(0, a); };
  const fl = 0.8 + 0.15 * Math.sin(tq / 70 + ph) + 0.1 * Math.sin(tq / 37 + ph * 2);
  const burn = (ids.has('burn') ? 0.45 : 0) + 1.1 * burst('ignite', 'burn');
  if (burn > 0) out.push({ x, y: y - 26, z: 10, r: 38, c: [1, 0.55, 0.2], I: burn * fl });
  const zap = Math.max(ids.has('shock') || ids.has('paral') ? 0.3 : 0, burst('shock', 'paral')), s = Math.floor(t / 120);
  if (zap > 0 && hash1(s * 2 + (who === 'me' ? 0 : 7)) > 1 - zap) out.push({ x: x + (hash1(s * 3 + 1) - 0.5) * 30, y: y - 40 - hash1(s * 7) * 30, z: 16, r: 44, c: [1, 0.95, 0.62], I: 1.2 });
  const cold = (ids.has('chill') || ids.has('frozen') ? 0.4 : 0) + 0.8 * burst('chill', 'frozen');
  if (cold > 0) out.push({ x, y: y - 70, z: 30, r: 60, c: [0.62, 0.86, 1], I: cold });
  const tox = (ids.has('poison') ? 0.32 : 0) + 0.6 * burst('poison');
  if (tox > 0) out.push({ x, y: y - 14, z: 6, r: 30, c: [0.78, 0.45, 1], I: tox * (0.85 + 0.15 * Math.sin(tq / 300 + ph)) });
  return out;
}
function attackFx(s, ak) {
  if (ATTACKS[s.id]) return ATTACKS[s.id];
  const shape = s.area ? 'area' : (s.hits || 1) > 1 ? 'multi' : s.ranged ? 'ranged' : 'melee';
  const sp = ATTACKS[s.fx || ak] || ATTACKS.flower_grass, own = !s.el || s.tier === 'u' || s.basic;   // 개성 · 기본기 · 무속성 = 종 색
  if (own && shape !== 'area' && shape !== 'multi') return sp;
  const B = own ? sp : ATTACKS[EL_SP[s.el]] || sp, kind = SHAPE[shape][s.el || '-'], key = kind + '|' + (own ? s.fx || ak : s.el);
  let A = fxMemo.get(key);
  if (!A) { A = { kind, move: MOVE_OF[kind] || 'cast', c: B.c, status: B.status, petal: B.petal || [B.c[1], B.c[2]], gem: B.gem || B.c[0], ...(B.fizz ? { fizz: B.fizz } : {}) }; fxMemo.set(key, A); }
  return A;
}
import { glyphH, wrap, sized, measure } from '../core/text.js';
import { battleFromView, applyView } from '../game/fight.js';
import { bot, net, room as R } from '../net/api.js';
import { ask } from './popups.js';
import { PHRASES, EMOJI, EMOJI_NAME, EMOTE_LIFE, BOT_REPLY, drawEmoji, emoteBubble } from '../art/emotes.js';
import { ga, eul, eun, ro } from '../core/josa.js';
import { SFX_OF_FX, sfxAdd, sfxAlive, drawSfx, drawSfxMap, swayOf, popTimes } from '../art/statusfx.js';
import { fieldGround, fieldAir, ARRIVE_MS } from '../art/fieldfx.js';   // 환경을 경기장에(2026-10-29 ㉠)
import { CAST_MS, castKind, castColor, castPose, castShake, targetKick, drawCast, CAST_SFX, fxIdsOf } from '../art/castfx.js';   // 보조 기술 시전 동작(2026-10-29 ㉡) · 공개 카드 효과 아이콘(㉥ 시안)
import { sfx, music } from '../core/sound.js';
// 상태 효과 → 효과음 이름(core/sound.js SFX)
const FX_SOUND = { burn: 'ignite', poison: 'poison', bleed: 'weak', shock: 'shock', paral: 'shock', chill: 'chill', frozen: 'frozen', wet: 'wet', stun: 'stun', spore: 'spore', seal: 'bind', root: 'root', leech: 'leech', taunt: 'taunt', dark: 'shade', shade: 'shade', gale: 'gale',
  atkDown: 'weak', defDown: 'corrode', spdDown: 'weak', critDown: 'weak', accDown: 'weak', atkUp: 'rage', defUp: 'wall', spdUp: 'haste', critUp: 'focus', accUp: 'focus', flourish: 'haste',
  regen: 'regen', will: 'purify', shield: 'shield', purified: 'purify', aim: 'focus' };   // 2026-10-23 엑셀 v10 이름(소리는 있던 것)
const crackles = e => { if (e) for (const ms of popTimes(e)) sfx('crackle', { at: ms / 1000 }); };
import { TFX, setTfx, popLife, wordSlot, drawPops as tfxPops, drawRibbon as tfxRibbon, drawTitle as tfxTitle } from '../art/textfx.js';

// v2 전투: 기술 고르기 → (봇 판 = 서버가 상대를 고르고 한 턴을 풂 · 친구 대결 = 두 사람 수가 모이면 서버가 풂 · 시험판 = 이 브라우저 rules.js) → 사건을 차례로 보여 줌
//   선공 판정 → (자세) → 공격 연출(attack.mjs 장마다) → 맞는 장에 판정·피해 → 되받아치기 → 턴 끝 효과·기력 +1 → 다음 턴 / 승패
// 화면(2026-10-16 사용자): 안내 문구 = 가운데 전광판 없이 식물 머리 위 짧은 글자·리본(아래 '전투 글자 연출') · 기술 = 카드 여섯 장 · 아래 줄 = 기타 단추(교체 · 효과 · 감정), 기권 = 위 띠 왼쪽 작은 깃발
//  체력판 = 'HP'·'MP' 이름 왼쪽, 막대·칸 왼쪽 맞춤, 숫자만 오른쪽 · 효과 창 = 글자·아이콘 같은 줄, 위아래 같은 간격.
const PANEL_H = 228, AY = 24;
// 라운드 판 네모(위 띠 — 2026-10-23): 이긴 판 = 금색 바탕 + 굵은 ✓ · 진 판 = 빨강 바탕 + 흰 ✕ · 남은 판 = 어두운 칸 + 밝은 테. s = 한 변(8 · 9)
const CHECK = { 7: [[5, 1], [4, 2], [5, 2], [1, 3], [3, 3], [4, 3], [1, 4], [2, 4], [3, 4], [2, 5]], 6: [[4, 1], [1, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [2, 4]] };
function roundPip(g, x, y, s, kind) {
  const i = s - 2, ix = x + 1, iy = y + 1;
  g.rect(x, y, s, s, '#06090f');
  if (kind === 'none') { g.rect(ix, iy, i, i, '#3a5478'); g.rect(ix + 1, iy + 1, i - 2, i - 2, '#162238'); return; }
  const win = kind === 'win';
  g.rect(ix, iy, i, i, win ? '#ffd24a' : '#e2483e'); g.rect(ix, iy, i, 1, win ? '#fff2a8' : '#ff8a80'); g.rect(ix, iy + i - 1, i, 1, win ? '#c8901e' : '#a02a26');
  if (win) for (const [cx, cy] of CHECK[i] || CHECK[7]) g.rect(ix + cx, iy + cy, 1, 1, '#4a2c06');
  else for (let k = 1; k < i - 1; k++) { g.rect(ix + k, iy + k, 1, 1, '#fff4f0'); g.rect(ix + i - 1 - k, iy + k, 1, 1, '#fff4f0'); }
}
// 손패(2026-10-16 사용자 "스킬도 세로로 긴 카드 — 꾹 누르면 뒷면으로 가까이 앞으로 가져오는 느낌" → "카드가 너무 커, 기본 평타·방어·회피도 그렇게 하지 마"):
//  여섯 장 모두 같은 카드(위 줄 = 기본기 셋 · 아래 줄 = 배운 기술 셋), 66×88(3:4)
//  (같은 날 "카드 디자인이 너무 별로 — 자료 참고해서" → art/skillcard.js 다시: 그림이 주인공 · 속성 금속 테 · 파란 비용 마름모 · 주황 위력 알약 · 그림자 · 고르면 금빛으로 떠오름)
const EMOTE_CD = 3000;   // 감정 보낸 뒤 3초는 못 보냄(도배 막기)
const CARD_W = 66, CARD_H = 90, CARD_Y = 6, CARD_GX = 10, CARD_GY = 4, HOLD_MS = 320, PEEK_OPEN = 380, PEEK_CLOSE = 280, SHINE_MS = 520;
const EX = 186, EY = AY + 156, PX = 80, PY = AY + 282, FAR_K = 0.31;
// 손패 여섯 = 셋씩 두 줄(2026-10-17 사용자 "스킬 4개인 거 재미없어 — 6개 · 배치도 3개 3개로 두 줄") · 화면 아래부터 쌓음(짧은 화면 — 휴대폰 브라우저 높이 480~560):
//  기타 줄(교체 · 감정) → 손패 → 내 체력판 → 경기장(layOf — 내 식물은 손패 바로 위, 그림 위는 화면 위에 붙이고 길면 벽 밑 땅을 늘임)
//  옛 판(손패 넷 = 한 줄 · 변이 카드 칸 둘 = 아래 줄)은 이어 하는 판 그대로
const HAND_W = 62, HAND_GX = 4, MISC_H = 32, BOT_PAD = 10;
// 카드 칸의 기술 카드 = 아래 줄(2026-10-17 카드 칸 — 태생 변이가 전투 칸에 넣은 기술 카드는 extra: false 라 위 줄 제자리). 옛 판(extra 없음)의 변이 기술도 아래 줄
const isExtra = s => !!s && (s.extra ?? !!s.mut);
const mutHand = kit => !!(kit && kit.some(isExtra));   // 변이 칸 둘(2026-10-16 사용자 "변이식물의 장점은 변이스킬로 6칸")
const handRows = kit => (kit && kit.length > 4 ? 2 : 1);
// 손패 칸 자리(카드 폭 CW · 사이 GX · 한 줄 per장 · 왼쪽 끝 x0 · 전체 폭 w): 셋씩 두 줄(여섯) · 넷 한 줄(옛 판) · 넷 + 아래 줄 둘(옛 변이 판)
function handGeo(W, kit) {
  const one = handRows(kit) === 1 || mutHand(kit), CW = one ? HAND_W : CARD_W, GX = one ? HAND_GX : CARD_GX, per = one ? 4 : 3, w = CW * per + GX * (per - 1);
  return { one, CW, GX, per, w, x0: Math.round((W - w) / 2) };
}
// 경기장 자리(2026-10-17 사용자 "하늘쪽 우주가 잘려 있어 — 폰 길이와 상관없이" · "폰이 길어지면 하늘이 아니라 경기장 땅이 넓어지게 — 그래야 적 식물과 적의 상태창이 따로 놀지 않으니"):
//  내 식물 밑동 = 손패 위 38칸 → 그림 땅(받침 둘 · 바닥 원)을 거기 맞춰 fy만큼 옮김. fy > 0(긴 화면) = 그림 위(하늘 · 관중석 · 벽)는 화면 위 그대로 + 벽 밑 땅을 fy줄 늘임(gap),
//  fy < 0(짧은 화면) = 그림 위를 잘라 올림(lift). 상대 밑동은 위 띠 밑 FOE_MIN까지만 — 더 짧으면 내 식물만 손패를 따라 더 올라감(myDy · 연출 판도 그만큼 눌러 맞춤)
const FOE_MIN = 114, ARENA_SPLIT = { colosseum: 150, ship: 156, garden: 156, night: 150, retro: 146, cell: 140 };   // 벽 밑 늘일 줄(그림 줄 — 그 위 = 하늘 · 관중석 · 벽 · 벽 그늘)
function layOf(H, rows, merged = false) {
  const miscY = merged ? null : H - BOT_PAD - MISC_H, HY = (merged ? H - BOT_PAD : miscY - 8) - rows * CARD_H - (rows - 1) * CARD_GY, AH = HY - AY + 28;
  const want = HY - 38 - PY, fy = Math.max(FOE_MIN - EY, want), myDy = want - fy;
  // 2026-10-23 사용자 "상대 식물은 위로 정렬해야할 거 같아. 환경도 위에 정렬": 긴 화면에서도 상대 식물 · 상대 체력판은 위에 그대로(foeDy = 0) — 늘인 땅(gap)은 상대와 나 사이로 · 내 식물은 늘 손패 위(meDy)
  const foeDy = Math.min(0, fy), meDy = want;
  return { miscY, HY, AH, fy, gap: Math.max(0, fy), lift: Math.min(0, fy), myDy, foeDy, meDy, led: Math.round((EY + foeDy + PY + meDy - 100) / 2), MY: HY - 12 - boxH(true) };
}
// 경기장 그림 + 늘인 땅(gap줄, 한 번 만든 판은 다시 씀) — 2026-10-23 사용자 "높이가 높아지면 땅의 연장이 이상해져" · "가운데 원은 중간에 있어야해":
//  ① 가운데 원(바닥 무늬)이 늘 두 식물 가운데 = 늘일 줄을 원 바로 위 · 바로 아래에 반씩(ARENA_RING = 그림의 원 맨 위 · 맨 아래 줄, 잰 값) · 원이 없는 경기장(감방)은 벽 밑에 한 번에
//  ② 이어 붙이는 땅 = 넣는 자리 옆 EXT_P줄 띠를 거울처럼 접어(접힌 자리 같은 줄 두 번 없이) — 한 줄씩 아무거나 고르던 것은 줄무늬가 생겼음
//  콜로세움(흙바닥)은 원근째 다시 그림 — art/arenaFloor.js colosseumFloor(같은 날 사용자 "흙바닥의 경우 직선 가로줄이 보이는데 원형의 소점?에 맞게 … 다른 맵은 냅둬")
const EXT_P = 14, ARENA_RING = { ship: [167, 265], garden: [177, 275], night: [160, 266], retro: [174, 276] };
const artCache = new WeakMap();
function arenaArt(bg, key, gap) {
  let m = artCache.get(bg); if (!m) artCache.set(bg, (m = new Map()));
  let cv = m.get(gap); if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = bg.width; cv.height = bg.height + gap;
  const c = cv.getContext('2d'), W0 = bg.width, split = ARENA_SPLIT[key] || 150, ring = ARENA_RING[key], per = 2 * EXT_P - 2;
  c.imageSmoothingEnabled = false;
  // 넣을 자리 [그림 줄, 줄 수, 띠 방향(-1 = 위쪽 띠 · 1 = 아래쪽 띠)]
  const ins = ring && gap ? [[Math.max(split + EXT_P, ring[0] - 2), Math.ceil(gap / 2), -1], [ring[1] + 2, Math.floor(gap / 2), 1]] : [[split, gap, 1]];
  let sy = 0, dy = 0;
  for (const [at, n, dir] of ins) {
    c.drawImage(bg, 0, sy, W0, at - sy, 0, dy, W0, at - sy); dy += at - sy; sy = at;
    for (let j = 0; j < n; j++) {
      const q = (j + 1) % per, o = q < EXT_P ? q : per - q, r = dir < 0 ? at - 1 - o : at + o;
      c.drawImage(bg, 0, r, W0, 1, 0, dy + j, W0, 1);
    }
    dy += n;
  }
  c.drawImage(bg, 0, sy, W0, bg.height - sy, 0, dy, W0, bg.height - sy);
  if (m.size > 6) m.clear();
  m.set(gap, cv); return cv;
}
const LED_CY = Math.round((EY + PY - 100) / 2);   // 전광판 가운데 = 상대 받침과 내 식물 머리 사이(실제 자리 = layOf led)
// 턴 시작 공개(drawReveal): 카드 나옴 → 상대 카드 뒤집힘 → 선공 · 후공 표 → 머묾 → 각자 식물로 들어감(ms)
const RV_W = 92, RV_IN = 400, RV_FLIP0 = 400, RV_FLIP = 420, RV_BADGE = 900, RV_LAG = 170, RV_OUT = 380, REVEAL_MS = 2300, REVEAL1_MS = 1400;
const backOut = q => { const a = 1.70158; return 1 + (a + 1) * (q - 1) ** 3 + a * (q - 1) ** 2; };
const easeInOut = q => (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);
const FOE3 = ['vine_water', 'gaia', 'flower_wind'];   // 시험판 3:3 상대
const TIER = { miss: ['빗나감', 'dim', '빗나갔다!'], graze: ['스침', 'sub', '살짝 스쳤다'], hit: ['정타', 'main', ''], crit: ['치명!', 'gold', '급소에 맞았다!'] };

// 체력판: (상대만) 재배사 · 랭크 / 이름 + 속성 / HP 막대 + 숫자 / MP 칸 + 숫자 — 'HP'·'MP' 이름은 왼쪽, 막대·칸은 같은 x에서 시작, 숫자만 오른쪽
const BOX_W = 140, LBL_W = 19;
// 정체 꼬리표(2026-10-23 사용자 "속성과 식물 종+변이까지 아이콘을 단순 나열하지 않고 잘 정리해줘"): 한 묶음 [속성 | 종 | 변이] —
//  속성 칸 = 속성 색 바탕 + 속성 아이콘 · 종 칸 = 종 아이콘 · 변이 칸(변이 식물만) = 변이 색 바탕 + 변이 이름(포식 · 무기 · 독성 · 포자 · 용족)
//  x = 오른쪽 끝(right) 또는 왼쪽 끝 · 그린 폭을 돌려줌(w만 재려면 g = null)
const TAG_H = 13;
function idTag(g, x, y, u, right = true) {
  const E = ELEMENT[u.el], F = u.form && FORMS[u.form], fw = F ? measure(F.name, sized('bold', 9)) + 6 : 0, w = 13 + 1 + 13 + (F ? 1 + fw : 0) + 2;
  if (!g) return w;
  const x0 = right ? x - w : x, ei = icon(u.el), ji = u.jong && icon(u.jong);
  rrect(g, x0, y, w, TAG_H, 3, '#2c4466');
  rrect(g, x0 + 1, y + 1, w - 2, TAG_H - 2, 2, '#0d1828');
  if (E) rrect(g, x0 + 1, y + 1, 13, TAG_H - 2, 2, hexMix(E.dark || E.main, '#0d1828', 0.55));   // 속성 칸 = 속성 색
  if (ei) g.img(ei, x0 + 2, y + 1);
  g.rect(x0 + 14, y + 2, 1, TAG_H - 4, '#2c4466');
  if (ji) g.img(ji, x0 + 16, y + 1);
  if (F) {
    g.rect(x0 + 28, y + 2, 1, TAG_H - 4, '#2c4466');
    rrect(g, x0 + 29, y + 1, fw, TAG_H - 2, 2, hexMix(F.col, '#0d1828', 0.45));   // 변이 칸 = 변이 색
    g.text(F.name, x0 + 29 + fw / 2, y + (TAG_H - glyphH(sized('bold', 9))) / 2, { font: sized('bold', 9), color: F.light, align: 'center' });
  }
  return w;
}
const PLANT_TOP = 94, POT_BOTTOM = 14;   // 식물 그림 맨 위 = 밑동 − 94칸쯤(96×112 판) · 상대 화분 · 받침 아래 끝 = 밑동 + 14
const boxH = mine => (mine ? 49 : 62);   // 2026-10-17 사용자 "해 아이콘이 상태창 아래로 삐져나옴 — 상태창 크기를 키워볼까?" → 아래 3칸 늘림
function infoBox(app, x0, y0, u, bar, en, mine, team = null, compact = false) {   // compact = 상대 체력판 맨 윗줄(재배사)을 접음(짧은 화면 — 3:3 남은 식물 칸은 이름 줄 오른쪽으로)
  const { g, t } = app, w = BOX_W, h = boxH(mine || compact), P = T.ptext, fx = bar.fx, S = fx && HURT[fx.kind], age = fx ? t - fx.t0 : 1e9;
  let x = x0, y = y0;
  if (S && S.shake && age < S.shakeMs) { const a = Math.max(1, Math.round(S.shake * (1 - age / S.shakeMs))); x += (Math.floor(age / 40) % 2 ? 1 : -1) * a; y += Math.floor(age / 60) % 2 ? Math.ceil(a / 2) : 0; }
  plate(g, x, y, w, h);
  if (S && S.frame && age < S.flash) { g.rect(x - 1, y - 1, w + 2, 1, '#ffffff'); g.rect(x - 1, y + h, w + 2, 1, '#ffffff'); g.rect(x - 1, y, 1, h, '#ffffff'); g.rect(x + w, y, 1, h, '#ffffff'); }
  let yy = y + 5;
  const tx = x + 8, bx = tx + LBL_W, right = x + w - 8, numW = g.textW(`${u.max}/${u.max}`, 'bold');
  // 상대 줄 = 재배사 이름 · 재배사 레벨만(2026-10-16 사용자 "상대 상태창 위 글자 대신 적의 이름과 레벨만 — 맨 위에 리그가 나와 있으니 중복")
  if (!mine) {
    const lv = u.tlv ? `Lv ${u.tlv}` : (u.rank || '').replace(/^재배사\s*/, '');
    if (!compact) g.text(lv ? `${u.trainer || '상대'} · ${lv}` : u.trainer || '상대', tx, yy, { color: P.sub });
    if (team) team.forEach((m, i) => {   // 3:3 상대 남은 식물 칸(오른쪽 끝): 남음 = 주황 · 지금 선 식물 = 밝은 테 · 쓰러짐 = 어둡게 + ✕
      const px = right - (team.length - i) * 9 + 2, py = yy + 2;
      g.rect(px, py, 7, 7, m.on && !m.dead ? '#ffd2c4' : '#08111e');
      g.rect(px + 1, py + 1, 5, 5, m.dead ? '#1a2230' : '#ff7a5c');
      if (m.dead) for (const [dx, dy] of [[2, 2], [4, 4], [4, 2], [2, 4], [3, 3]]) g.px(px + dx, py + dy, '#5a6a82');
      else g.rect(px + 2, py + 2, 2, 1, '#ffd2c4');
    });
    if (!compact) yy += 13;
  }
  // 이름 줄 = 이름(왼쪽) · 정체 꼬리표 [속성 | 종 | 변이](오른쪽 끝 — idTag) · 개수 칸(공통 장치 — 수리검 · 꼬리 …)은 꼬리표 왼쪽 · 넘치면 이름을 작게
  const rk = u.res ? Object.keys(RES_ICON).find(k => k in u.res) : null, ri = rk ? icon(RES_ICON[rk]) : null;   // 공명 · 스택 = 아이콘 + 수(2026-10-24 코덱스)
  const tw = idTag(null, 0, 0, u), rl = ri ? String(u.res[rk] || 0) : resLine(u), rw = rl ? g.textW(rl) + 4 + (ri ? 13 : 0) : 0, room = right - tx - tw - rw - 4, nf = g.textW(u.name, 'bold') <= room ? 'bold' : sized('bold', 10);
  g.text(u.name, tx, yy, { font: nf, color: u.shiny ? '#ffe8a8' : P.main });
  idTag(g, right + 2, yy, u);
  if (rl) g.text(rl, right + 2 - tw - 4, yy, { color: P.sub, align: 'right' });
  if (rl && ri) g.img(ri, right + 2 - tw - 4 - g.textW(rl) - 13, yy + 1);
  yy += 16;
  g.text('HP', tx, yy, { font: 'bold', color: P.sub });
  hpBar(g, bx, yy + 3, right - numW - 5 - bx, 7, bar, u.max, t);
  g.text(`${Math.ceil(bar.main)}/${u.max}`, right, yy, { font: 'bold', color: S && age < S.hold ? '#ffd090' : P.main, align: 'right' });
  yy += 13;
  sunDisc(g, tx + 6, yy + 5, 3, SUN.ok);   // MP = 햇빛 에너지(2026-10-17 사용자 "상태바의 mp 부분을 해 색으로 해주고 햇빛 에너지 같은 디자인") — 이름 대신 해
  const om = u.orb ? u.orb.max : 0, tot = u.energyMax + om, step = Math.max(4, Math.min(7, Math.floor((right - g.textW(`${tot}/${tot}`, 'bold') - 5 - bx) / Math.max(1, tot))));
  sunPips(g, bx, yy + 2, en, u.energyMax, step, t);   // 칸 사이 = 그릇이 커져도 한 줄에(최대 12칸)
  for (let i = 0; i < om; i++) { const px = bx + (u.energyMax + i) * step, on = i < u.orb.n, tr = i >= om - u.orb.trap; g.rect(px, yy + 2, step - 1, 7, '#120a26'); g.rect(px + 1, yy + 3, step - 3, 5, on ? '#b48cff' : tr ? '#5f8f3a' : '#2e2350'); if (on) g.rect(px + 1, yy + 3, step - 3, 2, '#e6d4ff'); }   // 볼트바인 구슬 칸(보라 = 남은 구슬 · 초록 = 덫)
  g.text(`${Math.round(en * 2) / 2}${om ? `+${u.orb.n}` : ''}/${u.energyMax}`, right, yy, { font: 'bold', color: '#ffd25a', align: 'right' });
  return h;
}
// 햇빛 에너지 칸: 찬 칸 = 금빛(위 밝게 · 아래 주황) + 빛 한 줄기가 찬 칸을 따라 흐름(2.4초마다), 빈 칸 = 짙은 호박색
function sunPips(g, x, y, cur, max, gap, t) {
  const sweep = ((t || 0) % 2400) / 2400 * (cur + 5) - 2;
  for (let i = 0; i < max; i++) {
    const on = i + 1 <= cur, half = !on && i + 0.5 <= cur, px = x + i * gap, cw = gap - 1;   // 반칸(햇빛 회복 강화 — 2026-10-18) = 칸 왼쪽 반만 금빛
    g.rect(px, y, cw, 7, '#2a1806');
    if (!on) { g.rect(px + 1, y + 1, cw - 2, 5, '#4a3412'); if (half) { const hw = Math.max(1, Math.floor((cw - 2) / 2)); g.rect(px + 1, y + 1, hw, 5, '#f0901c'); g.rect(px + 1, y + 1, hw, 3, '#ffc83c'); } continue; }
    g.rect(px + 1, y + 1, cw - 2, 5, '#f0901c'); g.rect(px + 1, y + 1, cw - 2, 3, '#ffc83c'); g.rect(px + 1, y + 1, cw - 2, 1, '#ffe98a'); g.px(px + 1, y + 1, '#fffbe0');
    const d = Math.abs(i - sweep); if (d < 1.3) g.alpha(0.8 * (1 - d / 1.3), () => g.rect(px + 1, y + 1, cw - 2, 5, '#fffbe6'));
  }
}
// 효과 창(한 줄에 셋 · 두 줄까지, 넘치면 +n): 아이콘 = 왼쪽 끝 · 글자([이름][겹침 수]) = 아이콘을 뺀 자리의 가운데 — 글자는 위아래 같은 간격(실제 글자 높이로), 아이콘은 창 위아래 가운데
//  아이콘 18칸 · 창 20칸(2026-10-23 사용자 "상태이상 아이콘이 픽셀화 하면서 너무 작아져서 알아보기 힘들어" — 11칸 · 16칸이던 것): 겹 수는 아이콘 오른쪽 위, 이름이 길어 안 들어가면 11칸 · 그래도 안 되면 글자만 가운데
//  포자 = 이름 + 개수(아이콘 오른쪽 위) + 가장 빨리 피기까지 남은 턴(아이콘 오른쪽 아래) — 같은 날 사용자 "포자도 이름 붙여줘"
//  정렬 = 같은 날 사용자 "아이콘은 왼쪽 정렬. 글자는 우측정렬해줘. 독같은 경우 너무 가운데에 몰린 느낌" → "글자를 우측 정렬말고, 아이콘을 제외한 영역 내에서 중앙 정렬로하자"
const SW_W = 45, SW_H = 20, SW_GAP = 2;
// 효과 설명 창(infoSheet) 색 = 카드 뒷면과 같은 남색 판 · 분류 머리글 색(2026-10-29)
const INFO_C = { ink: '#0b1322', body: '#12294a', band: '#0c1526', plate: '#0c1e36', text: '#eef4ff', sub: '#a9cdf0', dim: '#7396bb', line: '#8ccfff', gold: '#ffd890' };
const STAT_DOWN = new Set(['atkDown', 'defDown', 'spdDown', 'critDown', 'accDown']);   // 능력치 약화(statusLook DOWN)
const INFO_CATS = [{ id: 'ail', name: '상태이상', col: '#ffb070' }, { id: 'down', name: '약화', col: '#ff8a8a' }, { id: 'buff', name: '강화', col: '#8ccfff' }, { id: 'env', name: '환경', col: '#c0a8ff' }];
function statusWins(g, x, y, list, rows = 2, up = false) {   // rows = 보일 줄 수(넘치면 마지막 칸 = +n) · up = 줄이 위로 쌓임(y = 첫 줄 — 내 효과 창: 체력판 바로 위 줄부터, 2026-10-23 사용자 "내 체력바에 가까운 쪽이 먼저차고 한 줄 벗어나면 바깥으로")
  const cap = rows * 3, shown = list.length > cap ? [...list.slice(0, cap - 1), { more: list.length - (cap - 1) }] : list, gh = glyphH('body'), ty = (SW_H - gh) / 2, bf = sized('bold', 9);
  shown.forEach((st, i) => {
    const c = i % 3, X = x + c * (SW_W + SW_GAP), w = c === 2 ? BOX_W - 2 * (SW_W + SW_GAP) : SW_W, Y = y + (up ? -1 : 1) * Math.floor(i / 3) * (SW_H + 2);
    if (st.more) { holo(g, X, Y, w, SW_H, SW_ON, 16); g.text(`+${st.more}`, X + (w >> 1), Y + ty, { font: 'bold', color: SW_ON.text, align: 'center' }); return; }
    const D = STATUS[st.id] || { name: st.name || st.id, icon: 'sparkle', buff: !!st.buff }, S = D.buff ? SW_ON : swStyle(D.col || '#ff6a6a');
    holo(g, X, Y, w, SW_H, S, 16);
    const nw = g.textW(D.name), num = D.stack && st.n ? String(Math.min(st.n, D.stack)) : null, tt = st.t != null ? String(st.t) : null;   // tt = 포자의 가장 빨리 피기까지 남은 턴
    const big = D.icon ? iconMid(D.icon) : null, badge = !!big && big.width + 2 + nw <= w - 4;   // 18칸 아이콘이 들어가면 숫자는 아이콘 위에
    const tail = badge || !num ? '' : num + (tt ? '·' + tt : ''), rest = nw + (tail ? 2 + g.textW(tail) : 0);   // 18칸이 안 들어가면 숫자는 이름 뒤
    const ic = badge ? big : D.icon && rest + 11 <= w - 4 ? icon(D.icon) : null;
    if (ic) {
      const ix = X + 2, iy = Y + Math.round((SW_H - ic.height) / 2), num0 = { font: bf, align: 'right', outline: '#0b1220', outlineW: 2 };
      g.img(ic, ix, iy);
      if (badge && num) g.text(num, ix + ic.width + 1, iy, { ...num0, color: S.num });   // 오른쪽 위(오른쪽 아래 = 능력치 화살표 자리)
      if (badge && tt) g.text(tt, ix + ic.width + 1, iy + ic.height - glyphH(bf) - 1, { ...num0, color: '#ffe08a' });   // 포자: 오른쪽 아래 = 남은 턴
    }
    const tl = ic ? X + 3 + ic.width : X, tr = ic ? X + w - 2 : X + w;   // 글자 자리 = 아이콘을 뺀 나머지(아이콘이 없으면 창 전체)
    let cx = tl + Math.max(ic ? 0 : 2, (tr - tl - rest) >> 1);
    g.text(D.name, cx, Y + ty, { color: S.text }); cx += nw + 2;
    if (tail) g.text(tail, cx, Y + ty, { color: S.num });
  });
}
// 환경 띠(2026-10-23 사용자 "환경 상태는 다른 UI로 다른 위치에" → "ㄷ으로 하자. 다만 상대환경은 위에. 내 환경은 스킬창과 체력바 사이 거기에" · "쉽게 위는 적. 아래는 나"):
//  효과 창과 다른 모양 = 어두운 띠 + 윗줄만 환경 색 · [아이콘 18칸][이름][남은 N턴]을 왼쪽부터 · w = 0이면 글자 폭만큼(효과 설명 창) · 그린 폭을 돌려줌
const ENV_H = 20;
// 효과 조각(2026-10-29 ㉢ — 사용자 "이게 뭐가 어떻게 되는지 파악되기 전에 슥슥 지나가"): 걸린 식물 머리 위(환경 = 그 땅)에 [아이콘 이름] 조각이 톡 → 잠깐 머묾 → 효과 창 칸(환경 = 띠)으로 날아가 꽂힘(그때 칸이 생기며 반짝)
//  효과 걸림 단계 0.85초 → 1초(환경 1.15초 — 땅이 먼저 바뀐 뒤 띠로) · 같은 식물에 잇따라 걸리면 둘째부터 0.7초(앞 조각이 날아가는 동안 다음 조각이 톡 — 무릎 꿇어라 셋이 3초 → 2.4초)
const FX_MS = 1000, FX2_MS = 700, ENVFX_MS = 1150, TOK_POP = 140, TOK_FLY = [320, 680], FLASH_MS = 480, FOE_HIST = 40;   // FOE_HIST = 상대가 쓴 카드 기록 장 수(판 전체 — 넉넉히 마흔)
// 상대 카드 더미(오른쪽 위) · 펼쳐 보기: 새 카드가 날아와 앉는 시간 · 펼칠 때 한 장이 자리 잡는 시간 · 장 사이 시차 · 다시 모일 때 · 더미 카드 크기(손패 카드를 줄인 그림) · 밑 카드 비낌
const PILE_IN = 440, SPREAD_IN = 300, SPREAD_STAG = 28, SPREAD_OUT = 220, PILE_W = 28, PILE_H = 38, PILE_OFF = [[0, 0], [-2, 3], [2, 5], [-1, 7]];
const pileTilt = turn => (((turn * 37) % 9) - 4) * 0.03;   // 밑 카드 기울기(카드마다 정해짐 — 새 카드가 앉아도 밑 카드는 안 돌아감)
// 쓸 수 있는 손패 카드 둘레 빛(손맛 — 2026-10-29): 카드 밖 3칸에 하늘빛을 계단처럼(도트) — 바깥 칸부터 겹쳐 칠해 안쪽 칸일수록 진함(카드 바로 밖 ≈ 0.75 · 둘째 ≈ 0.42 ·셋째 ≈ 0.18) ·
//  안쪽은 카드가 덮음 · a = 세기 0~1(숨 쉬듯 오르내림 · 누르면 1) — 그림자 번짐(shadowBlur)은 1칸 줄 그리기라 거의 안 보였음
function cardGlow(g, x, y, w, h, a, col = '#8fe0ff') {
  for (const [d, k] of [[3, 0.18], [2, 0.29], [1, 0.57]]) g.alpha(a * k, () => rrect(g, x - d, y - d, w + d * 2, h + d * 2, 5 + d, col));
}
function envBand(g, x, y, w, list, turn) {
  const ty = y + (ENV_H - glyphH('body')) / 2, items = list.map(st => {
    const D = STATUS[st.id] || { name: st.id }, ic = D.icon ? iconMid(D.icon) || icon(D.icon) : null, left = st.exp != null ? `${Math.max(1, st.exp - turn + 1)}턴` : '';
    return { D, ic, left, w: (ic ? ic.width + 3 : 0) + g.textW(D.name) + (left ? 4 + g.textW(left, 'bold') : 0) };
  });
  const bw = w || items.reduce((s, it) => s + it.w, 0) + 10 * (items.length - 1) + 8;
  rrect(g, x, y, bw, ENV_H, 3, 'rgba(8,13,26,0.84)');
  g.rect(x + 3, y, bw - 6, 1, items[0].D.col || '#c0a8ff');
  let cx = x + 4;
  for (const it of items) {
    if (it.ic) { g.img(it.ic, cx, y + Math.round((ENV_H - it.ic.height) / 2)); cx += it.ic.width + 3; }
    g.text(it.D.name, cx, ty, { color: '#eef4ff' }); cx += g.textW(it.D.name) + 4;
    if (it.left) { g.text(it.left, cx, ty, { font: 'bold', color: it.D.col || '#c0a8ff' }); cx += g.textW(it.left, 'bold'); }
    cx += 10;
  }
  return bw;
}
// 전투 사건 문구(이름 = 그 사건 때의 식물)
const FX_MSG = {
  burn: x => `${ga(x)} 화상을 입었다!`, poison: (x, e) => (e.n > 1 ? `${x}에게 독이 ${e.n}겹 쌓였다!` : `${ga(x)} 독에 걸렸다!`), wet: x => `${ga(x)} 흠뻑 젖었다! 둔해지고 적중·방어가 떨어진다`,
  chill: (x, e) => `${ga(x)} 얼어 간다!` + (e.wet ? ' 젖어 있어서 더 쌓였다!' : ''), shock: (x, e) => `${ga(x)} 감전됐다!` + (e.wet ? ' 젖어 있어서 더 쌓였다!' : ''),
  flourish: (x, e) => `${ga(x)} 만개했다!` + (e.list && (e.list.find(s => s.id === 'flourish') || {}).n > 1 ? ` (${e.list.find(s => s.id === 'flourish').n}겹)` : ''),
  armor: x => `${x}에게 갑주가 둘러졌다!`, stealth: x => `${ga(x)} 그림자 속으로 숨었다!`, clone: x => `${ga(x)} 분신을 만들었다!`,
  frozen: x => `${ga(x)} 꽁꽁 얼어붙었다!`, paral: x => `${ga(x)} 감전되어 몸이 굳었다!`, stun: x => `${ga(x)} 기절했다!`, charm: x => `${ga(x)} 춤에 매혹됐다!`,
  spore: (x, e) => `${x}에게 포자가 붙었다!` + (e.n > 1 ? ` (포자 ${e.n})` : ''),
  seal: (x, e) => `${x}의 ${eul(e.skill)} 봉인했다!`, leech: x => `${x}에게 기생 씨앗이 심어졌다!`, shade: x => `${x}에게 그늘이 드리웠다! 햇빛이 안 찬다`, dark: x => `${x}의 햇빛이 가려졌다!`,
  gale: x => `${x} 쪽에 강풍이 몰아친다! 적중이 떨어진다`, taunt: x => `${ga(x)} 도발에 넘어갔다! 다음 턴엔 공격만 한다`, root: x => `${x}의 발이 묶였다! 다음 턴 교체할 수 없다`,
  bleed: x => `${x}에게 상처가 났다! 피가 흐른다`,
  // 능력치 겹(겹 수가 둘 이상이면 함께)
  ...Object.fromEntries([['atkDown', '공격이 떨어진다'], ['defDown', '방어가 떨어진다'], ['spdDown', '몸이 둔해졌다'], ['critDown', '날이 무뎌졌다'], ['accDown', '눈앞이 흐려졌다'],
    ['atkUp', '힘이 솟는다'], ['defUp', '몸이 단단해졌다'], ['spdUp', '몸이 가벼워졌다'], ['critUp', '날이 예리해졌다'], ['accUp', '정신을 집중한다']].map(([k, m]) => [k, (x, e) => `${x}의 ${m}!` + (e.n > 1 ? ` (${e.n}겹)` : '')])),
  regen: x => `${x}에게 재생이 깃들었다!`, will: x => `${ga(x)} 의지를 다진다!`,
  shield: x => `${x}에게 보호막이 생겼다!`, purified: (x, e) => (e.ids && e.ids.length ? `${x}의 나쁜 효과가 씻겨 나갔다!` : `${x}의 몸이 맑아졌다!`), aim: x => `${ga(x)} 겨눈다! 다음 공격 치명 ↑`,
};
const CURE_FIRE = { chill: '냉기가 녹았다', wet: '몸이 말랐다', spore: '포자가 탔다', leech: '기생 씨앗이 탔다' };
const SKIP_WHY = { frozen: '얼어서', paral: '몸이 굳어서', stun: '기절해서', charm: '매혹되어', blocked: '쓸 기술이 없어' };
const SKIP_STATE = { frozen: '얼어 있어서', paral: '몸이 굳어서', stun: '기절해 있어서', charm: '매혹되어서', blocked: '쓸 기술이 없어서' }, SKIP_AUTO_MS = 1100;
// 막힘 사건(resist)의 까닭 → 머리 위 한 마디 · 문장(2026-10-23 엑셀 v10: 면역 · 의지 · 속박 한 번 · 강풍 켜져 있음 · 정화 보호 · 이미 쉬는 중)
const RESIST_POP = { immune: '면역!', will: '의지!', once: '안 묶임', env: '이미 강풍', purify: '버팀!', skip: '버팀!', none: '헛것', endure: '버팀!' };
const RESIST_MSG = { immune: x => `${ga(x)} 방금 쉬어서 기절하지 않는다`, will: x => `${ga(x)} 의지로 버텼다!`, once: x => `${eun(x)} 이미 한 번 묶였다`, env: () => '이미 강풍이 불고 있다', purify: x => `${ga(x)} 정화 덕분에 버텼다!`, skip: x => `${eun(x)} 이미 쉬는 중이다` };
// 전투 글자 연출(2026-10-16 사용자 "가운데 문구가 이상해. 네모난 배경색에 무엇을 할까? 이것도 어색해. 일일이 이런 문구 넣지 마" → "출력 문구 목록 정리 — 효과·폰트·연출"):
//  가운데 네모 전광판을 없애고 글자는 식물 머리 위에서만 짧게 — 기술 이름 = 리본, 피해 = 큰 숫자(치명 = 더 크게 · 흔들림), 판정·효과 = 한두 낱말, 승패 = 가운데 큰 글자(네모 없이).
//  목록·글꼴·움직임 = docs/superpowers/specs/2026-10-16-v2-battle-text-direction.md
const SKIP_POP = { frozen: '얼어서 쉼', paral: '굳어서 쉼', stun: '기절해서 쉼', charm: '매혹되어 쉼', blocked: '막혀서 쉼' };
// 3:3 쓰러진 자리: 봇 판 = 늘 'me', 친구 대결 = 'me' · 'foe' · 'both'(둘 다 고름 — 서버 rooms.mjs)
const needMe = B => B.need === 'me' || B.need === 'both';
// 시간 막대(같은 날 사용자 "타이머 역할하는 바도 넣어주고. 안 하면 넘어가는 걸로"): 고르는 차례마다 봇 판 30초 · 친구 대결 = 서버 40초, 다 되면 넘어감(쉬기)
const PICK_MS = 30000, PVP_MS = 40000, SEND_MS = 20000;   // 친구 3:3 쓰러진 자리 고르기 = 20초(서버 rooms.mjs)
const GONE = /대결 중이 아니/;   // 서버에 그 대결이 없음(rooms.mjs move · forfeit)
// 전광판 글자색(사건 종류별)

const HURT = {
  graze: { hold: 260, drain: 380, main: 200, shake: 0, shakeMs: 0, flash: 0, col: '#f6cf8a', hi: '#fff0d0' },
  hit: { hold: 420, drain: 460, main: 120, shake: 1, shakeMs: 140, flash: 0, col: '#f39a3c', hi: '#ffd090' },
  big: { hold: 600, drain: 520, main: 90, shake: 2, shakeMs: 260, flash: 90, col: '#ff8a2a', hi: '#ffc080', blink: true },
  crit: { hold: 720, drain: 560, main: 70, shake: 3, shakeMs: 340, flash: 120, col: '#ff7a1a', hi: '#ffb070', blink: true, frame: true },
};
const easeOut = k => 1 - (1 - k) ** 2;
function hpBar(g, x, y, w, h, bar, max, t) {
  const B = T.bar, rm = Math.max(0, Math.min(1, bar.main / max)), rt = Math.max(0, Math.min(1, bar.trail / max)), c = rm <= 0.2 ? B.low : rm <= 0.5 ? B.mid : B.hp;
  g.rect(x, y, w, h, T.ink); g.rect(x + 1, y + 1, w - 2, h - 2, B.back);
  const fw = Math.round((w - 2) * rm), tw = Math.round((w - 2) * rt), fx = bar.fx, S = fx ? HURT[fx.kind] : HURT.hit, age = fx ? t - fx.t0 : 1e9;
  if (tw > fw) {
    const white = S.flash && age < S.flash, alt = S.blink && age < S.hold && Math.floor(age / 90) % 2;
    g.rect(x + 1 + fw, y + 1, tw - fw, h - 2, white ? '#ffffff' : alt ? S.hi : S.col);
    g.rect(x + 1 + fw, y + 1, tw - fw, 1, white ? '#ffffff' : S.hi);
  }
  if (fw > 0) { g.rect(x + 1, y + 1, fw, h - 2, c[0]); g.rect(x + 1, y + 1, fw, 1, c[1]); if (h > 4) g.rect(x + 1, y + h - 2, fw, 1, c[2]); }
  if (bar.armor > 0) { const aw = Math.max(2, Math.round((w - 2) * Math.min(1, bar.armor / max))), ax = Math.min(x + 1 + fw, x + w - 1 - aw); g.rect(ax, y + 1, aw, h - 2, '#a9b3c3'); g.rect(ax, y + 1, aw, 1, '#eef2f8'); if (h > 4) g.rect(ax, y + h - 2, aw, 1, '#6b7587'); }   // 방어구(2026-10-18) = 금속 칸
  // 칸 선(2026-10-17 사용자 "체력바에도 얇은 칸 선을 그어줄 수 있나?"): 10%마다 가는 세로줄 — 찬 쪽(깎이는 띠 포함) = 짙게, 빈 쪽 = 옅게
  const lit = x + 1 + Math.max(fw, tw);
  for (let i = 1; i < 10; i++) { const sx = x + 1 + Math.round((w - 2) * i / 10), on = sx < lit; g.alpha(on ? 0.45 : 0.12, () => g.rect(sx, y + 1, 1, h - 2, on ? '#06140e' : '#ffffff')); }
}

export const battle = {
  tall: true,   // 600칸보다 긴 화면도 장면 높이 그대로(main.js 화면 틀 — 긴 만큼 경기장 땅이 늘어남, 2026-10-17)
  theme(app) { return this.venue || venueOf(app.state && app.state.tournament ? app.state.tournament.tier : '브론즈'); },
  // 1초 60장이 필요한 때(main.js 장 수 — 그 밖엔 30장): 기술이 오가는 동안 · 승패가 갈린 뒤 2.5초
  fast(app) { const v = this.v; return !!v && (v.phase === 'play' || (v.phase === 'over' && app.t - v.overT0 < 2500)); },
  enter(p) { if (p.tfx) setTfx(p.tfx); this.p = p; this.venue = p.venue || null; this.B = null; this.sheet = null; this.info = null; this.net = null; this.end = null; this.result = null; this.shot = null; this.info2 = !!p.info; this.emoteOpen = !!p.emote; this.peek = null; this.peekShot = false; this.spread = null; this.lift = {}; this.denyAt = null; this.cards = {}; this.useWas = {}; this.shineAt = {}; this.localEmotes = []; this.emoteT = -1e9; this.muteFoe = false; this.queue = []; this.goneAt = null; },
  // 판 차리기(첫 그림 때): 서버 판(봇 · 친구) = 받은 판 모습으로, 시험판 = 이 브라우저에서
  setup(app) {
    const p = this.p, boot = p.net ? app.battleBoot : null;
    if (boot) {
      this.net = boot.kind; this.id = boot.id || null; this.info = boot.info || null; this.code = boot.code || null;
      this.B = battleFromView(boot.view); this.mode = boot.view.mode === 'swap3' ? 'swap3' : '1v1'; this.seed = 7919;
      this.deadline = boot.deadline || null; this.stepMs = boot.step === 'send' ? SEND_MS : PVP_MS;
      app.battleBoot = null;
    } else this.setupLocal(app);
    const B = this.B;
    this.v = { hp: { me: B.me.hp, foe: B.foe.hp }, bar: { me: { main: B.me.hp, trail: B.me.hp, fx: null }, foe: { main: B.foe.hp, trail: B.foe.hp, fx: null } }, en: { me: B.me.energy, foe: B.foe.energy }, view: { me: B.me, foe: B.foe }, gone: {}, led: null, phase: 'pick', steps: [], si: 0, t0: null, pops: [], stance: {}, turn: B.turn, picked: null, uid: 0, eff: { me: listOf(B.me), foe: listOf(B.foe) }, foeReady: false, sfx: [], arrive: [], tok: [], flash: [], effSeq: {}, cast: null, envSlide: {} };   // arrive = 환경이 깔리는 중 · tok = 날아가 꽂히는 효과 조각 · flash = 꽂힌 칩 반짝 · cast = 보조 기술 시전(2026-10-29 ㉠~㉢)
    if (B.over) { this.v.phase = 'over'; this.v.overT0 = app.t; }
    else if (this.mode === 'swap3' && needMe(B)) { this.v.phase = 'need'; this.sheet = { forced: true }; }
    else if (this.mode === 'swap3' && B.need === 'foe') { this.v.phase = 'wait'; this.v.waitSend = true; }   // 친구 대결: 상대가 다음 식물을 고르는 중
    else this.prompt(app);
    if (boot && boot.moved) { this.v.phase = 'wait'; this.sheet = null; }
    if (this.shot) { const U = this.p.use, inKit = U && B.me.kit.find(s => s.id === U); this.pick(null, inKit || (U && SKILLS[U] ? { act: 'attack', cats: ['attack'], ...SKILLS[U], fx: B.me.key, cost: 0 } : null) || B.me.kit.find(s => s.id === 's1') || B.me.kit[0]); }   // ?use = 그 기술로 찍기(연출 검토 — 2026-10-22)
    if (!boot && this.p.reveal != null) {   // 검토 촬영(?reveal=ms[&first=me|foe]): 턴 시작 공개의 그 순간에 멈춤
      const atk = u => u.kit.find(s => s.power > 0 && s.cost > 0) || u.kit[0], st = { kind: 'reveal', ms: REVEAL_MS, mine: atk(B.me), theirs: atk(B.foe), first: this.p.first || 'foe' };
      const sw = this.p.swap, swc = who => { const u = B.team[who][1]; return { swap: true, id: 'swap_' + who, name: u.name, unit: u }; };   // 교체 카드 검토(?swap=me|foe|both — 3:3)
      if (sw && B.team) { if (sw !== 'foe') st.mine = swc('me'); if (sw !== 'me') st.theirs = swc('foe'); }
      Object.assign(this.v, { steps: [st], si: 0, phase: 'play', t0: app.t - +this.p.reveal, picked: st.mine.id }); this.shot = 'reveal';
    }
  },
  setupLocal(app) {
    const p = this.p, s = app.state;
    const seed = p.seed ? +p.seed : p.phase ? 20261015 : (Date.now() & 0x7fffffff);
    this.mode = p.mode === 'swap3' ? 'swap3' : '1v1'; this.seed = seed;
    const mk = (id, k, extra = {}) => { const sp = SPECIES[k]; return makeUnit(id, sp, { key: k, name: sp.name, stage: p.stage || 'mature', ...protoStats(sp), ...extra }); };   // ?stage=sprout|growing = 검토용 단계 그림
    if (this.mode === 'swap3') {
      const keys = s && s.plants && s.plants.length >= 3 ? s.plants.slice(0, 3).map(x => x.key) : ['flower_grass', 'cactus_fire', 'vine_water'];
      this.B = makeTeamBattle({ me: keys.map(k => mk('me', k)), foe: FOE3.map(k => mk('foe', k, { trainer: '코스모싹', rank: '브론즈 2', tlv: 6 })), seed, swapCd: 2, swOrder: true, ownSun: true });
    } else {
      const me = p.me && SPECIES[p.me] ? mk('me', p.me) : makeUnit('me', SPECIES.flower_grass, { key: 'flower_grass', name: '페탈로즈', hp: 220, atk: 35, def: 24, spd: 30, crit: 5 });
      const foe = p.foe && SPECIES[p.foe] ? mk('foe', p.foe, { trainer: '코스모싹', rank: '브론즈 2', tlv: 6 }) : makeUnit('foe', SPECIES.vine_water, { key: 'vine_water', name: '타이드바인', hp: 240, atk: 32, def: 22, spd: 26, crit: 5, trainer: '코스모싹', rank: '브론즈 2', tlv: 6 });
      if (p.hand) { const ids = String(p.hand).split(","); me.kit.sort((a, b) => (ids.includes(b.id) ? 1 : 0) - (ids.includes(a.id) ? 1 : 0)); }   // 검토 촬영(?hand=기술 id,…): 그 기술을 손패 앞으로
      if (p.shiny) me.shiny = true;   // 검토 촬영: 내 식물을 색 변종으로(2026-10-22 — 실제 판은 서버 유닛에 shiny 가 실려 옴)
      this.B = makeBattle({ me, foe, seed });
    }
    const B = this.B;
    // 시험판 손패도 진짜와 같은 여섯(배운 기술 + 기본기 — 2026-10-17 "6개 들고 갈 수 있게")
    const six = u => { u.kit = [...u.kit.filter(s => s.id[0] === 's'), ...u.kit.filter(s => s.id[0] !== 's')].slice(0, 6); };
    for (const u of B.team ? [...B.team.me, ...B.team.foe] : [B.me, B.foe]) six(u);
    if (p.mut && FORMS[p.mut]) {   // 검토: 변이 손패(?mut=predator 등 · &used=1 = 첫 변이 기술을 한 번 씀) — 변이 기술 카드 = 손패 여섯 중 끝 칸(기본기 자리)
      const ms = (p.mk ? String(p.mk).split(',').filter(id => SKILLS[id]) : formSkills(p.mut).slice(0, 2)).slice(0, 2).map(id => ({ ...SKILLS[id], mut: true, extra: false, ...(SKILLS[id].elOwn ? { el: B.me.el } : {}) }));   // &mk=기술,기술 = 그 변이 기술로(연출 검토)
      B.me.kit.splice(Math.max(0, B.me.kit.length - ms.length), ms.length, ...ms);
      B.me.form = p.mut;   // 정체 꼬리표의 변이 칸도 보이게
      if (p.used) B.me.used = { [ms[0].id]: +p.used };
    }
    if (p.pre) for (const part of String(p.pre).split(';')) {   // 효과 미리 걸기(검토·영상용)
      const [who, ids] = part.split(':'), u = B[who], by = B[who === 'me' ? 'foe' : 'me'];
      if (u && ids) for (const tok of ids.split(',')) {
        const m = tok.match(/^([a-zA-Z]+)(\d*)$/), c = { turn: 1, rng: () => 0.5, ev: [], by };
        if (!m) continue;
        if (m[1] === 'storm') { applyFx(u, 'gale', 1, c); if (u.eff.gale) (u.eff.gale.add ||= []).push('storm'); }   // 폭풍(강풍 + 폭풍 공명)
        else if (m[1] === 'reso' || m[1] === 'evs' || m[1] === 'prep') (u.res ||= {})[m[1]] = +(m[2] || 0);   // 개수 칸(공명 · 스택 · 팽트랩 준비)
        else if (m[1] === 'fruit') (u.eff ||= {}).fruit = { n: +(m[2] || 1) };   // 드라코프루트 빙결열매(2026-10-29 촬영)
        else if (m[1] === 'thornTrap') (u.eff ||= {}).thornTrap = { env: true, n: +(m[2] || 1), by: by.id, atk: by.atk };   // 덫(기간 없음 — 게임과 같게)
        else if (m[1] === 'cdlock') (u.st ||= {}).infernoLock = { until: +(m[2] || 3) };   // 지옥전개 재사용 대기(촬영 — 끝나는 턴)
        else if (['miasma', 'morning', 'night', 'inferno'].includes(m[1])) (u.eff ||= {})[m[1]] = { env: true, by: by.id, exp: +(m[2] || 3) };   // 필드 환경(m[2] = 끝나는 턴 — applyFx 로 걸면 기간이 비어 'NaN턴')
        else if (m[1] === 'sum' || m[1] === 'kid') for (let i = 0; i < +(m[2] || 1); i++) { summonAdd(u, 0, []); if (m[1] === 'kid') { const s = u.summons[u.summons.length - 1]; s.stage = 'baby'; s.name = '새끼'; } }   // 소환수(스포어캡 — 잠든 포자 · 새끼)
        else applyFx(u, m[1], +(m[2] || 1), c);
      }
    }
    if (p.energy) { B.me.energy = +p.energy; B.foe.energy = +p.energy; }
    if (p.dead && B.team) for (const tok of String(p.dead).split(',')) { const m = tok.match(/^(me|foe)(\d)$/), u = m && B.team[m[1]][+m[2]]; if (u) u.hp = 0; }   // 쓰러진 팀원 미리(검토·촬영 — 예 dead=me2,foe1)
    this.shot = p.phase === 'hit' ? 'hit' : null;
    this.sheet = p.sheet ? { forced: false } : null;   // ?sheet=1 = 교체 창이 열린 채(촬영)
  },
  // 전광판: 새 글이면 팍 펼쳐짐. keep = 다음 글까지 계속, 아니면 ms 뒤 사라짐
  // 고르는 차례 시작: 안내 글자 없이 시간 막대만 새로. 쉬는 차례면 내 식물 위에 까닭 한 마디
  prompt(app) {
    const B = this.B, t = app ? app.t : 0;
    this.v.pickT0 = t;
    if (mustSkip(B.me)) this.pop('me', SKIP_POP[B.me.eff.skip.src] || '쉼', null, t, false, -16, (STATUS[B.me.eff.skip.src] || {}).col || '#c0a8ff');
  },
  // 기술 고르기 — 쉬는 차례면 '쉬기', 덩굴·도발로 막힌 칸은 못 고름
  pick(app, sk) {
    const B = this.B, v = this.v;
    if (v.phase !== 'pick') return;
    const rest = mustSkip(B.me) || sk === REST;   // REST = 쉬는 차례 · 다 막혀 쉼(시간 초과는 쓸 수 있는 기술 중 무작위 — tick)
    if (rest) sk = REST; else if (!sk || !canUse(B.me, sk, B.me.energy, B.foe)) return;
    v.picked = sk.id; v.autoSkipAt = null;
    v.eff = { me: listOf(B.me), foe: listOf(B.foe) };   // 이번 턴 시작 모습(계산이 끝나면 B의 효과는 이미 턴 끝 상태)
    if (this.net) return this.send(app, this.mode === 'swap3' ? (rest ? { kind: 'rest' } : { kind: 'skill', id: sk.id }) : (rest ? 'rest' : sk.id), sk.cost || 0);
    v.en.me -= sk.cost || 0;
    const turn = this.mode === 'swap3' ? playTurn3(B, rest ? { kind: 'rest' } : { kind: 'skill', skill: sk }) : playTurn(B, sk);
    this.play(app, this.buildSteps(turn));
  },
  // 서버로 수 보내기 — 봇 판 = 바로 결과, 친구 대결 = 상대 수를 기다림(알림으로 결과)
  send(app, act, cost) {
    const v = this.v, B = this.B, turn = B.turn;
    v.phase = 'wait'; v.en.me -= cost;
    const back = e => { if (e && GONE.test(e.message)) return this.gone(app, null); if (e) app.toast(e.message); if (v.phase === 'wait') { v.phase = 'pick'; v.picked = null; v.en.me = B.me.energy; this.prompt(app); } };
    if (this.net === 'pvp') {
      R.move(act, turn).catch(back);
      return;
    }
    bot.turn(app, this.id, act, turn).then(r => this.onResult(app, r)).catch(back);
  },
  // 서버가 푼 한 턴(또는 쓰러진 자리 채우기) → 판을 고치고 사건을 보여 줌
  onResult(app, r) {
    const B = this.B, v = this.v;
    if (r.resync) { applyView(B, r.view); this.finishTurn(app); app.toast('판을 다시 맞췄어요'); return; }
    if (r.over) this.result = { reward: r.reward };
    applyView(B, r.view);
    if (r.turn) { B.log.push(r.turn); this.play(app, this.buildSteps(r.turn)); }
    else if (r.send) this.play(app, [this.switchStep(r.send), { kind: 'end', ms: 300 }]);
  },
  // 친구 대결 알림(room.js 가 넘겨줌). 연출 중에 온 판 소식(상대가 먼저 다음 식물을 골라 'send'가 빨리 오는 등)은 줄 세웠다가 연출이 끝나면
  onNet(app, type, data) {
    if (!this.B || this.net !== 'pvp') return;
    const v = this.v;
    if (type === 'room') { if (!this.B.over && (!data || data.phase !== 'battle')) this.gone(app, data); return; }   // 끝난 소식(end)을 못 받았는데 방은 대기 · 방이 없어짐
    if (v.phase === 'play' && (type === 'turn' || type === 'send' || type === 'battle')) { (this.queue = this.queue || []).push({ type, data }); return; }
    if (type === 'foeReady') { v.foeReady = data.turn; return; }   // 이 턴(번호)에 상대가 골랐음 — 연출이 끝나도 남음
    if (type === 'turn') { this.deadline = data.deadline; this.stepMs = data.step === 'send' ? SEND_MS : PVP_MS; v.foeReady = null; this.onResult(app, { turn: data.turn, view: data.view }); return; }
    if (type === 'send') {   // 3:3 쓰러진 자리를 채움(양쪽 함께 공개) → 교체 연출 → 다음 턴
      this.deadline = data.deadline; this.stepMs = PVP_MS; v.foeReady = null; v.waitSend = false; this.sheet = null;
      applyView(this.B, data.view);
      this.play(app, [...data.sends.map(e => this.switchStep(e)), { kind: 'end', ms: 300 }]);
      return;
    }
    if (type === 'battle') { this.deadline = data.deadline; this.stepMs = data.step === 'send' ? SEND_MS : PVP_MS; applyView(this.B, data.view); if (v.phase !== 'play') { this.finishTurn(app); if (data.moved && (v.phase === 'pick' || v.phase === 'need')) { v.phase = 'wait'; this.sheet = null; } } return; }
    if (type === 'end') {
      this.end = data; this.result = { reward: data.reward };
      if (data.state) app.state = data.state;
      if (!this.B.over) {   // 기권 · 시간 넘김 · 나감 = 쓰러뜨리지 않고 끝남
        this.B.over = data.win ? 'win' : 'lose'; this.sheet = null;
        if (v.phase !== 'play') { v.phase = 'over'; v.overT0 = app.t; this.title(app, data.win, data.win ? ({ forfeit: '상대가 기권했다', timeout: '상대가 시간을 넘겼다', left: '상대가 나갔다' }[data.why] || '') : ({ forfeit: '기권했다', timeout: '시간을 넘겼다', left: '연결이 끊겼다' }[data.why] || '')); }
      }
    }
  },
  // 친구 대결이 서버에 없음(서버가 방을 잃음 · 끝난 소식을 놓침 — 2026-10-18 사용자 "'대결 중이 아니에요' 하면서 멈춤"): 멈춘 판에 두지 않고 방으로
  gone(app, data) {
    if (this.goneAt != null || (this.B && this.B.over && this.v.phase === 'over')) return;
    this.goneAt = app.t; this.sheet = null;
    app.toast(data && data.last ? '대결이 끝났어요 — 방으로 돌아가요' : '대결이 끊겼어요 — 방으로 돌아가요');
    app.go('room', {}, 'shutter');
  },
  // 교체(3:3): 내 차례에 고르면 턴을 쓰고, 쓰러진 자리면 공짜(sendIn). 뿌리 묶기면 못 바꿈
  pickSwitch(app, to) {
    const B = this.B, v = this.v;
    if (this.sheet && this.sheet.forced) {
      this.sheet = null;
      if (this.net === 'pvp') { v.phase = 'wait'; R.move({ kind: 'send', to }, B.turn).catch(e => { if (GONE.test(e.message)) return this.gone(app, null); app.toast(e.message); if (v.phase === 'wait') { v.phase = 'need'; this.sheet = { forced: true }; } }); return; }   // 상대도 고르면 'send' 알림
      if (this.net) { v.phase = 'wait'; bot.turn(app, this.id, { kind: 'send', to }, B.turn).then(r => this.onResult(app, r)).catch(e => { app.toast(e.message); v.phase = 'need'; this.sheet = { forced: true }; }); return; }
      const e = sendIn(B, to); this.play(app, [this.switchStep(e), { kind: 'end', ms: 300 }]); return;
    }
    if (v.phase !== 'pick' || !canSwitch(B.me)) return;
    this.sheet = null; v.picked = 'swap';
    v.eff = { me: listOf(B.me), foe: listOf(B.foe) };
    if (this.net) return this.send(app, { kind: 'switch', to }, 0);
    this.play(app, this.buildSteps(playTurn3(B, { kind: 'switch', to })));
  },
  forfeit(app) {
    ask(app, '기권할까요?', this.net === 'pvp' ? '이 판은 진 것으로 남아요' : '진 판으로 남고 보상이 없어요', () => {
      if (this.net === 'pvp') { R.forfeit().catch(e => (GONE.test(e.message) ? this.gone(app, null) : app.toast(e.message))); return; }
      if (this.net === 'bot') { bot.forfeit(app, this.id).then(r => { this.result = { reward: r.reward }; this.B.over = 'lose'; this.v.phase = 'over'; this.v.overT0 = app.t - 900; this.title(app, false, '기권했다'); }).catch(e => app.toast(e.message)); return; }
      app.go('home', {}, 'shutter');
    }, '기권');
  },
  play(app, steps) { const v = this.v; v.steps = steps; v.si = 0; v.t0 = app ? app.t : null; v.phase = 'play'; if (app) this.startStep(v.steps[0], app.t, app); },
  switchStep(e) {
    const B = this.B, from = B.team[e.who][e.from], to = B.team[e.who][e.to];
    const msg = e.who === 'me' ? (e.forced ? `가라, ${to.name}!` : `${from.name}, 돌아와! 가라, ${to.name}!`) : `${ga(to.trainer || '상대')} ${eul(to.name)} 내보냈다!`;
    return { kind: 'switch', ms: 1000, who: e.who, fromU: e.forced ? null : from, toU: to, hp: e.hp, list: e.list, msg, tone: 'note' };
  },
  buildSteps(turn) {
    const B = this.B, nm = id => B[id].name, sk = id => (id === 'me' ? turn.mySkill : turn.foeSkill) || { name: '기술' }, out = [];
    const evs0 = [...turn.events];
    for (let i = 0; i < evs0.length; i++) if (evs0[i].t === 'hit') { const j = evs0.findIndex((e, k) => k > i && e.t === 'stance' && e.who === evs0[i].to && e.active); if (j > i) { evs0.splice(i, 0, evs0.splice(j, 1)[0]); i++; } }
    // 연타 사이의 효과 알림은 그 공격의 마지막 타 뒤로 모음(2026-10-29 ㉢ — 칼날 잎 1타 → '출혈' 알림 → 2타 · 3타로 연타가 끊겨 보였음) · 상대가 쓰러지는 등 연타가 끊기면 그 자리에서 내보냄
    const evs = [], held = [];
    let open = false;
    for (const e of evs0) {
      if (e.t === 'hit' && e.of > 1) { evs.push(e); open = e.n < e.of; if (!open) evs.push(...held.splice(0)); continue; }
      if (open && (e.t === 'fx' || e.t === 'immune' || e.t === 'resist')) { held.push(e); continue; }
      evs.push(...held.splice(0)); open = false; evs.push(e);
    }
    evs.push(...held.splice(0));
    // 턴 시작 공개(2026-10-17 사용자 "스킬 카드가 나와 상대 거가 회전하듯 등장해서 보여주고 그다음 진행" · "선공 후공도 빠르고 작게 넘어가서 가독성 떨어지는데 확실히 연출"):
    //  두 사람이 고른 카드 + 선공 · 후공 표 → 그다음 사건. 카드가 둘일 때만 선공 · 후공 표(옛 '먼저!' 한 마디는 공개가 대신함)
    //  교체한 쪽 = 교체 카드(들어올 식물 얼굴 · 이름 — 2026-10-18 사용자 "교체할 때도 스킬 카드처럼 교체 카드가 뜨면서 뭐로 바뀔지 안내", 전엔 카드 없음)
    const swapCard = (who, to) => { const u = B.team[who][to]; return { swap: true, id: `swap_${who}${to}`, name: u && !u.hidden ? u.name : '교체', unit: u && !u.hidden ? u : null }; };
    const fe = evs.find(e => e.t === 'first'), card = s => (s && s.name && s.name !== '기술' ? s : null);
    const mine = turn.mySwitch != null ? swapCard('me', turn.mySwitch) : card(turn.mySkill), theirs = turn.foeSwitch != null ? swapCard('foe', turn.foeSwitch) : card(turn.foeSkill);
    const reveal = mine || theirs ? { kind: 'reveal', ms: mine && theirs ? REVEAL_MS : REVEAL1_MS, mine, theirs, first: mine && theirs && fe ? fe.who : null } : null;
    if (reveal) out.push(reveal);
    for (const e of evs) {
      // 대기석 식물(엑셀 v10 — 대기 중에도 턴 끝 진행) · 소환수 사건: 앞 식물 연출 없이(대기석 아이콘 · 체력은 턴 끝 모습으로), 쓰러짐만 글로
      if (e.bench || e.sum != null || e.t === 'summonBreak') { if (e.t === 'faint' && e.bench) out.push({ kind: 'note', ms: 700, msg: `대기석의 ${ga(e.name)} 쓰러졌다`, tone: 'note' }); continue; }
      if (e.t === 'switch') out.push(this.switchStep(e));
      else if (e.t === 'faint') out.push({ kind: 'faint', ms: 900, who: e.who, msg: `${ga(e.name)} 쓰러졌다!`, tone: e.who === 'me' ? 'lose' : 'win' });
      else if (e.t === 'first') { if (!(reveal && reveal.first)) out.push({ kind: 'first', ms: 750, who: e.who, msg: `${ga(nm(e.who))} 먼저 움직인다!`, tone: 'note' }); }
      else if (e.t === 'stance') out.push({ kind: 'stance', ms: 950, who: e.who, skill: sk(e.who), stance: e.kind, active: e.active, msg: `${nm(e.who)}의 ${sk(e.who).name}!`, tone: 'note' });
      else if (e.t === 'guardBreak') out.push({ kind: 'guardBreak', ms: 250, who: e.who });
      // 공통 장치(devices.js — 2026-10-18): 시한 · 메아리 터짐 · 체력 내기 = 지속 피해처럼 · 버티기 · 햇빛 빼앗기 = 알림
      else if (e.t === 'boom' || e.t === 'selfCost') out.push({ kind: 'tick', ms: 750, ev: { ...e, id: 'burn' }, side: e.who, msg: e.t === 'boom' ? `${e.from || ''} 터졌다! ${nm(e.who)}도 휘말렸다` : `${ga(e.name)} 체력을 바쳤다!`, tone: 'hit' });
      else if (e.t === 'field') out.push({ kind: 'note', ms: 800, side: 'me', msg: e.id ? `${ga((FIELD[e.id] || { name: e.id }).name)} 경기장을 덮었다!` : `${ga((FIELD[e.was] || { name: '경기장 효과' }).name)} 걷혔다`, tone: 'note' });
      else if (e.t === 'infuse') out.push({ kind: 'note', ms: 750, side: e.who, msg: `${e.name}의 검에 ${e.el === 'fire' ? '불꽃' : '힘'}이 깃들었다!`, tone: 'buff' });
      else if (e.t === 'charge') out.push({ kind: 'note', ms: 750, side: e.who, msg: `${ga(e.name)} 힘을 모은다!`, tone: 'note' });
      else if (e.t === 'endure' && e.hp != null) out.push({ kind: 'heal', ms: 750, ev: { ...e, heal: e.hp }, side: e.who, msg: e.revive ? `${ga(e.name)} 되살아났다!` : `${ga(e.name)} 버텼다!`, tone: 'heal' });   // 맞아 0이 된 뒤 일어남(그 체력만큼 채움)
      else if (e.t === 'endure' || e.t === 'steal') out.push({ kind: 'note', ms: 700, side: e.who, msg: e.t === 'endure' ? `${ga(e.name)} 버텼다!` : `${ga(nm(e.who))} 햇빛을 빼앗았다!`, tone: 'note' });
      else if (e.t === 'reveal' || e.t === 'armorBreak') out.push({ kind: 'note', ms: 700, ev: e, side: e.who, popText: e.t === 'armorBreak' ? '갑주 깨짐' : '은신 풀림', msg: e.t === 'armorBreak' ? `${nm(e.who)}의 갑주가 부서졌다!` : e.mine ? `${nm(e.who)}의 은신이 풀렸다` : `${ga(nm(e.who))} 드러났다!`, tone: 'note' });   // 효과 목록은 ev.list로 바뀜
      else if (e.t === 'hit') { const s = e.link ? { ...sk(e.who), id: e.link.id, name: e.link.name, area: false, hits: e.of || 1 } : sk(e.who), ak = e.atkKey || B[e.who].key, tk = e.tgtKey || B[e.to].key, A = attackFx(s, ak); out.push({ kind: 'attack', ms: (e.n > 1 ? 0.6 : 1) * FRA * FRAME_MS, who: e.who, to: e.to, ev: e, skill: s, uid: ++this.v.uid, anim: makeAttack(A, ak, tk, e.who === 'foe', this.seed % 97 + out.length), msg: `${nm(e.who)}의 ${s.name}!`, tone: 'hit' }); }
      else if (e.t === 'cast') out.push({ kind: 'cast', ms: CAST_MS, who: e.who, skill: sk(e.who), msg: `${nm(e.who)}의 ${sk(e.who).name}!`, tone: 'buff' });   // 0.65초 → 1.3초(모으기 → 터뜨림 → 결과 — castfx.js)
      else if (e.t === 'execute') out.push({ kind: 'echo', ms: 700, side: e.to, pop: '처형', msg: `${ga(e.name)} 처형됐다!`, tone: 'hit' });   // 윈드페탈 처형의 춤
      else if (e.t === 'echo') out.push({ kind: 'echo', ms: 450, side: e.who, msg: `메아리가 울린다!`, tone: 'buff' });   // 프로스트벨 메아리(같은 차례에 한 번 더)
      else if (e.t === 'sun') out.push({ kind: 'sun', ms: 800, who: e.who, ev: e, skill: sk(e.who), msg: `${nm(e.who)}의 ${sk(e.who).name}!`, tone: 'buff' });
      else if (e.t === 'counter') out.push({ kind: 'counter', ms: 900, who: e.who, to: e.to, ev: e, msg: `${nm(e.who)}의 ${e.label || '되받아치기'}!`, tone: 'hit' });
      else if (e.t === 'fx') { const D = STATUS[e.id], buff = D && D.buff, pv = out[out.length - 1], follow = pv && pv.kind === 'fx' && pv.side === e.to && !(STATUS[pv.ev.id] || {}).env; out.push({ kind: 'fx', ms: D && D.env ? ENVFX_MS : follow ? FX2_MS : FX_MS, ev: e, side: e.to, msg: (FX_MSG[e.id] || (x => x))(e.name, e), tone: buff ? 'buff' : D && D.col ? D.col : 'fx' }); }   // 효과 조각이 머리 위에서 칩 자리로 날아가 꽂힘(㉢) · 환경 = 땅이 바뀐 뒤 띠로
      else if (e.t === 'immune') out.push({ kind: 'fxnote', ms: 700, ev: e, side: e.to, msg: `${e.name}에게는 ${ga((STATUS[e.id] || { name: e.id }).name)} 통하지 않는다`, tone: 'note' });
      else if (e.t === 'resist') out.push({ kind: 'fxnote', ms: 700, ev: e, side: e.to, msg: (RESIST_MSG[e.why] || RESIST_MSG.skip)(e.name), tone: 'buff' });
      else if (e.t === 'cure') out.push({ kind: 'cure', ms: 750, ev: e, side: e.to, msg: e.why === 'water' ? `물에 ${e.name}의 화상이 꺼졌다!` : `불에 ${e.name}의 ${e.ids.slice(0, 2).map(k => CURE_FIRE[k] || k).join(' · ')}!`, tone: 'note' });
      else if (e.t === 'bloom') out.push({ kind: 'bloom', ms: 900, ev: e, side: e.who, msg: e.k > 1 ? `${e.name}의 포자 ${e.k}개가 피어났다!` : `${e.name}의 포자가 피어났다!`, tone: STATUS.spore.col });
      else if (e.t === 'grow') out.push({ kind: 'expire', ms: 0, ev: e, side: e.who });
      else if (e.t === 'skip') out.push({ kind: 'skipT', ms: 900, ev: e, side: e.who, msg: `${ga(e.name)} ${SKIP_WHY[e.src] || ''} 움직일 수 없다!`, tone: 'skip' });
      else if (e.t === 'tick') { const D = (e.hell && STATUS[e.blue ? 'blueBurn' : 'inferno']) || STATUS[e.id] || { name: e.id }; out.push({ kind: 'tick', ms: 750, ev: e, side: e.who, msg: `${ga(e.name)} ${ro(D.name)} 아파한다!`, tone: D.col || '#ff8a8a' }); }   // 지옥 화상(e.hell) = '지옥' · 불 속성은 푸른 화상(파란 글자)
      else if (e.t === 'drain') out.push({ kind: 'drain', ms: 950, ev: e, side: e.who, msg: `기생 씨앗이 ${e.name}의 체력을 빨아들인다!`, tone: STATUS.leech.col });
      else if (e.t === 'heal') out.push({ kind: 'heal', ms: 650, ev: e, side: e.who, msg: `${ga(e.name)} 체력을 빨아들였다!`, tone: 'heal' });
      else if (e.t === 'regen') out.push({ kind: 'heal', ms: 650, ev: e, side: e.who, msg: `${e.name}의 체력이 재생된다`, tone: 'heal' });
      else if (e.t === 'reflect') out.push({ kind: 'reflect', ms: 750, ev: e, side: e.to, msg: `가시에 찔렸다! ${nm(e.to)}도 아프다`, tone: 'hit' });
      else if (e.t === 'swapFail') out.push({ kind: 'swapFail', ms: 800, side: e.who, msg: `${ga(e.name)} 바꾸지 못했다!`, tone: 'note' });   // 늦은 교체가 쉬는 차례 · 뿌리 묶기에 막힘
      else if (e.t === 'noEnergy') out.push({ kind: 'note', ms: 700, side: e.who, msg: `${(STATUS[e.why] || STATUS.dark).name} 때문에 ${e.name}의 햇빛이 차지 않았다`, tone: 'note' });
      else if (e.t === 'expire') out.push({ kind: 'expire', ms: 0, ev: e, side: e.who });
    }
    out.push({ kind: 'end', ms: 450 });
    return out;
  },
  startStep(st, t, app) {
    const v = this.v, B = this.B;
    if (!st) return;
    // 글자(가운데 전광판 없음): 기술 이름 = 쓰는 식물 위 리본, 나머지 = 머리 위 한두 낱말(st.msg 문장은 목록·기록용으로만 남김)
    if ((st.kind === 'attack' || st.kind === 'cast' || st.kind === 'stance' || st.kind === 'sun') && st.skill) { this.ribbon(st.who, st.skill.name, st.skill.el, t, st.ms); sfx(st.kind === 'stance' ? 'stance' : st.kind === 'sun' ? 'select' : 'swing'); }
    if (st.kind === 'cast' && st.skill) {   // 보조 기술 시전(㉡ castfx.js): 종류마다 다른 모양 · 터뜨리는 순간 소리
      const kind = castKind(st.skill);
      v.cast = { who: st.who, other: st.who === 'me' ? 'foe' : 'me', kind, col: castColor(st.skill, kind), t0: t };
      sfx(CAST_SFX[kind] || 'release', { at: 0.46 });
    }
    if (st.kind === 'sun') { v.en[st.who] = Math.min(v.view[st.who].energyMax || 8, (v.en[st.who] || 0) + (st.ev.gain || 0)); if (st.ev.gain) this.pop(st.who, `햇빛 +${st.ev.gain}`, null, t, false, -16, '#ffd25a'); }
    if (st.kind === 'first') sfx('first');
    if (st.kind === 'reveal') { sfx('select'); if (st.theirs) sfx('flip', { at: RV_FLIP0 / 1000 }); if (st.first) sfx('first', { at: RV_BADGE / 1000 }); }
    if (st.kind === 'fxnote') sfx('resist');
    if (st.kind === 'cure') sfx('steam');
    if (st.kind === 'skipT') sfx({ frozen: 'frozen', paral: 'shock', stun: 'stun' }[st.ev.src] || 'stun');
    if (st.kind === 'note' && st.side) sfx('fizzle');
    if (st.kind === 'faint') sfx('faint');
    if (st.kind === 'counter') sfx('hit');
    if (st.kind === 'counter') this.ribbon(st.who, st.ev.label || '되받아치기', null, t, st.ms);
    if (st.kind === 'switch') this.ribbon(st.who, st.toU.name, st.toU.el, t, st.ms);
    if (st.kind === 'first') this.pop(st.who, '먼저!', null, t, false, -16, '#8ccfff');
    if (st.kind === 'stance' && !st.active) this.pop(st.who, '헛자세', 'dim', t, false, -16);
    if (st.kind === 'fxnote') this.pop(st.side, st.ev.t === 'immune' ? '안 통함' : RESIST_POP[st.ev.why] || '버팀!', st.ev.t === 'immune' ? 'dim' : null, t, false, -16, st.ev.t === 'immune' ? null : '#8ccfff');   // immune 사건 = 같은 속성 · 카드라 안 걸림(면역 상태와 다름)
    if (st.kind === 'cure') this.pop(st.side, st.ev.why === 'water' ? '화상 꺼짐' : CURE_FIRE[st.ev.ids[0]] || '풀림', null, t, false, -16, '#8ccfff');
    if (st.kind === 'skipT') this.pop(st.side, SKIP_POP[st.ev.src] || '쉼', null, t, false, -16, (STATUS[st.ev.src] || {}).col || '#c0a8ff');
    if (st.kind === 'note' && st.side) this.pop(st.side, st.popText || '햇빛 막힘', 'dim', t, false, -16);
    if (st.kind === 'swapFail') { sfx('fizzle'); this.pop(st.side, '교체 실패', 'dim', t, false, -16); }
    if (st.kind === 'echo') { sfx('select'); this.pop(st.side, st.pop || '메아리', null, t, false, -16, st.pop ? '#ff8a8a' : '#c4ecff'); }
    if (st.kind === 'faint') this.pop(st.who, '쓰러짐', 'dim', t, false, -16);
    const last = B.log[B.log.length - 1];
    if ((st.kind === 'stance' || st.kind === 'attack' || st.kind === 'cast') && st.who === 'foe' && !v.foePaid && last && last.foeSkill) { v.en.foe -= last.foeSkill.cost || 0; v.foePaid = true; }
    if (st.kind === 'stance') v.stance[st.who] = { kind: st.stance, active: st.active };
    if (st.kind === 'guardBreak') v.stance[st.who] = null;
    if (st.kind === 'counter') { this.hurt(st.to, st.ev.dmg, 'hit', t); this.pop(st.to, `-${st.ev.dmg}`, 'bad', t, false, 0, null, null, { ...this.amt(st.to, st.ev.dmg), kill: v.hp[st.to] <= 0 }); }
    if (st.ev && st.ev.list && st.side && st.kind !== 'fx') { v.eff[st.side] = st.ev.list; v.effSeq[st.side] = v.si; }   // 효과 걸림은 조각이 꽂힐 때 바뀜(landTokens)
    if (st.kind === 'fx') {   // ㉢ 효과 조각(전엔 머리 위 낱말 '쇠약 1!' 0.85초) · ㉠ 환경 = 그 땅이 먼저 바뀜(fieldfx 깔림) → 조각이 땅에서 띠로
      const S = STATUS[st.ev.id] || {}, env = !!S.env;
      // 아침의 다른 쪽(켠 프로스트벨이 아닌 편) = 하는 일이 없음 → 연출 · 시간 없이 목록만(전엔 이 쪽에도 금빛 번쩍 · 정화 반짝이가 한 번 더 나와 1.15초 늘어짐 — 2026-10-29 녹화)
      if (st.ev.id === 'morning' && st.ev.who && v.view[st.side] && st.ev.who !== v.view[st.side].id) { st.ms = 0; st.quiet = true; }
      if (env && !st.quiet) v.arrive.push({ who: st.side, id: st.ev.id, n: st.ev.n, t0: t });
      if (S.name && !st.quiet) v.tok.push({ side: st.side, id: st.ev.id, n: st.ev.n, env, t0: t + (env ? 260 : 0), list: st.ev.list, seq: v.si });
      else if (st.ev.list) { v.eff[st.side] = st.ev.list; v.effSeq[st.side] = v.si; }
    }
    if (st.kind === 'skipT' && st.side === 'me' && st.ev.refund) v.en.me += st.ev.refund;
    if (st.kind === 'skipT' && st.side === 'foe' && st.ev.refund) v.en.foe += st.ev.refund;
    if (st.kind === 'tick') { this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS[st.ev.id].col, null, { ...this.amt(st.side, st.ev.dmg), kill: v.hp[st.side] <= 0 }); }
    if (st.kind === 'bloom') { this.hurt(st.side, st.ev.dmg, 'hit', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS.spore.col, null, { ...this.amt(st.side, st.ev.dmg), kill: v.hp[st.side] <= 0 }); this.pop(st.side, '포자!', null, t, false, -16, STATUS.spore.col); }
    if (st.kind === 'drain') {
      this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, null, t, true, 0, STATUS.leech.col, null, { ...this.amt(st.side, st.ev.dmg), kill: v.hp[st.side] <= 0 });
      if (st.ev.to && st.ev.heal > 0 && !st.ev.toBench) { this.heal(st.ev.to, st.ev.heal); this.pop(st.ev.to, `+${st.ev.heal}`, null, t, true, 0, '#7ef0a0', null, this.amt(st.ev.to, st.ev.heal)); }   // 건 식물이 대기석이면 앞 식물 체력은 그대로
      if (st.ev.to && st.ev.list2 && !st.ev.toBench) v.eff[st.ev.to] = st.ev.list2;
    }
    if (st.kind === 'heal') { this.heal(st.side, st.ev.heal); this.pop(st.side, `+${st.ev.heal}`, null, t, true, 0, '#7ef0a0', null, this.amt(st.side, st.ev.heal)); }
    if (st.kind === 'reflect') { this.hurt(st.side, st.ev.dmg, 'graze', t); this.pop(st.side, `-${st.ev.dmg}`, 'bad', t, true, 0, null, null, { ...this.amt(st.side, st.ev.dmg), kill: v.hp[st.side] <= 0 }); this.pop(st.ev.who, '반사!', null, t, false, -16, '#8ccfff'); }
    if (st.kind === 'tick') { const se = sfxAdd(v.sfx, st.side, st.ev.id, t); if (st.ev.id === 'burn') crackles(se); else sfx('poison'); }
    if (st.kind === 'fx' && !st.quiet && SFX_OF_FX[st.ev.id]) { const se = sfxAdd(v.sfx, st.side, SFX_OF_FX[st.ev.id], t, { dir: SFX_OF_FX[st.ev.id] === 'haste' ? (st.side === 'me' ? 1 : -1) : st.side === 'foe' ? 1 : -1 }); if (FX_SOUND[st.ev.id]) sfx(FX_SOUND[st.ev.id]); if (st.ev.id === 'burn') crackles(se); }
    if (st.kind === 'drain') { sfxAdd(v.sfx, st.side, 'drain', t, { to: st.ev.to }); sfx('drain'); }
    if (st.kind === 'heal') { sfxAdd(v.sfx, st.side, st.ev.t === 'regen' ? 'regen' : 'heal', t); sfx(st.ev.t === 'regen' ? 'regen' : 'heal'); }
    if (st.kind === 'reflect') { sfxAdd(v.sfx, st.ev.who, 'thornsHit', t); sfx('thorns'); }
    if (st.kind === 'bloom') { sfxAdd(v.sfx, st.side, 'bloom', t); sfx('bloom'); }
    if (st.kind === 'skipT' && st.ev.src !== 'blocked') sfxAdd(v.sfx, st.side, { frozen: 'frozen', paral: 'paral', stun: 'stun' }[st.ev.src], t);
    if (st.kind === 'cure') sfxAdd(v.sfx, st.side, 'steam', t);
    if (st.kind === 'end') v.en = { me: B.me.energy, foe: B.foe.energy };
  },
  demoStatus(app) {
    this.v.demoAt = Infinity;   // 한 번만
    const B = this.B, me = B.me, foe = B.foe, bt = Math.round(foe.max * 0.04), pt = Math.round(me.max * 0.04), bl = Math.round(foe.max * 0.08);
    const events = [
      { t: 'fx', to: 'foe', id: 'burn', name: foe.name },
      { t: 'tick', who: 'foe', id: 'burn', dmg: bt, name: foe.name },
      { t: 'fx', to: 'me', id: 'poison', n: 2, name: me.name },
      { t: 'tick', who: 'me', id: 'poison', n: 2, dmg: pt, name: me.name },
      { t: 'fx', to: 'foe', id: 'shock', n: 2, name: foe.name },
      { t: 'fx', to: 'me', id: 'chill', n: 2, name: me.name },
      { t: 'fx', to: 'foe', id: 'wet', name: foe.name },
      { t: 'fx', to: 'me', id: 'stun', name: me.name },
      { t: 'fx', to: 'foe', id: 'spore', n: 2, name: foe.name },
      { t: 'bloom', who: 'foe', dmg: bl, k: 1, name: foe.name },
      { t: 'skip', who: 'me', src: 'frozen', name: me.name },
      { t: 'cure', to: 'foe', name: foe.name, id: 'burn', why: 'water' },
    ];
    foe.hp -= bt + bl; me.hp -= pt;
    B.log.push({ mySkill: me.kit[0], foeSkill: foe.kit[0] });
    this.play(app, this.buildSteps({ mySkill: me.kit[0], foeSkill: foe.kit[0], events }));
  },
  // 검토 판 ?demo=status2: 나머지 효과(봉인 · 속박 · 기생 씨앗 · 빨아들이기 · 쇠약 · 도발 · 시듦 · 그늘 · 강풍 · 출혈) + 이로운 효과(활력 · 억셈 · 가속 · 재생 · 반사 · 보호막 · 정화 · 조준 · 의지)
  // 검토 판 ?demo=status3(2026-10-18 바닥 규칙 2단계): 갑주(체력 막대 금속 칸) · 분신(은신 연출 — 양옆 반투명) · 연타 셋이 갑주를 깎음 · 분신 사라짐 · 은신(흐리게)
  demoStatus3(app) {
    this.v.demoAt = Infinity;
    const B = this.B, me = B.me, foe = B.foe, ar = Math.round(me.max * 0.3);
    const events = [
      { t: 'fx', who: 'me', to: 'me', id: 'armor', name: me.name, list: [{ id: 'armor', hp: ar }] },
      { t: 'fx', who: 'foe', to: 'foe', id: 'clone', name: foe.name, list: [{ id: 'clone' }] },
      ...[1, 2, 3].map(n => ({ t: 'hit', who: 'foe', to: 'me', id: foe.kit[0].id, tier: 'hit', dmg: 0, absorb: 12, ab: 'armor', mult: 1, n, of: 3, list: [{ id: 'armor', hp: ar - 12 * n }] })),
      { t: 'reveal', who: 'foe', id: 'stealth', list: [] },
      { t: 'fx', who: 'me', to: 'me', id: 'stealth', name: me.name, list: [{ id: 'stealth' }, { id: 'armor', hp: ar - 36 }] },
    ];
    B.log.push({ mySkill: me.kit[0], foeSkill: foe.kit[0] });
    this.play(app, this.buildSteps({ mySkill: me.kit[0], foeSkill: foe.kit[0], events }));
  },
  demoStatus2(app) {
    this.v.demoAt = Infinity;
    const B = this.B, me = B.me, foe = B.foe, F = (to, id, o = {}) => ({ t: 'fx', to, id, name: B[to].name, ...o });
    const events = [
      F('foe', 'seal', { skill: '파도 덮치기' }), F('foe', 'root'), F('foe', 'leech'),
      { t: 'drain', who: 'foe', name: foe.name, to: 'me', toName: me.name, dmg: 6, heal: 6 },
      F('me', 'atkDown'), F('me', 'taunt'), F('foe', 'defDown'), F('foe', 'shade'), F('foe', 'gale'), F('foe', 'bleed'),
      F('me', 'atkUp'), F('me', 'defUp'), F('me', 'spdUp'), F('me', 'regen'), { t: 'regen', who: 'me', name: me.name, heal: 9 },
      { t: 'reflect', who: 'me', to: 'foe', dmg: 5 }, F('me', 'shield'), F('me', 'purified'), F('me', 'aim'), F('me', 'will'),
    ];
    foe.hp -= 11;
    B.log.push({ mySkill: me.kit[0], foeSkill: foe.kit[0] });
    this.play(app, this.buildSteps({ mySkill: me.kit[0], foeSkill: foe.kit[0], events }));
  },
  demoText(app) {
    this.v.demoAt = Infinity;
    const B = this.B, me = B.me, foe = B.foe, mine = me.kit.find(s => s.power && s.cost >= 3) || me.kit[0], theirs = foe.kit.find(s => s.power && s.cost >= 2) || foe.kit[0];
    const a1 = Math.round(foe.max * 0.36), tick = Math.round(foe.max * 0.06), a2 = foe.hp - a1 - tick, hit = Math.round(me.max * 0.28), regen = Math.round(me.max * 0.08);
    const events = [
      { t: 'first', who: 'me' },
      { t: 'hit', who: 'me', to: 'foe', tier: 'hit', dmg: a1 },
      { t: 'fx', to: 'foe', id: 'burn', name: foe.name, n: 1 },
      { t: 'hit', who: 'foe', to: 'me', tier: 'crit', dmg: hit },
      { t: 'heal', who: 'me', heal: regen, name: me.name },
      { t: 'tick', who: 'foe', id: 'burn', dmg: tick, name: foe.name },
      { t: 'hit', who: 'me', to: 'foe', tier: 'crit', dmg: a2 },
      { t: 'faint', who: 'foe', name: foe.name },
    ];
    me.hp = me.hp - hit + regen; foe.hp = 0; B.over = 'win';
    this.v.en.foe = Math.max(this.v.en.foe, theirs.cost || 0);   // 검토 판: 상대 기술값만큼은 있게(에너지 칸이 −로 안 보이게)
    B.log.push({ mySkill: mine, foeSkill: theirs });
    this.play(app, this.buildSteps({ mySkill: mine, foeSkill: theirs, events }));
  },
  heal(side, amt) { const v = this.v, u = v.view[side]; v.hp[side] = Math.min(u ? u.max : 9999, v.hp[side] + amt); v.bar[side] = { main: v.hp[side], trail: v.hp[side], fx: null }; },
  swapView(st) { const v = this.v; st.swapped = true; v.view[st.who] = st.toU; v.gone[st.who] = false; v.hp[st.who] = st.hp; v.bar[st.who] = { main: st.hp, trail: st.hp, fx: null }; v.stance[st.who] = null; if (st.list) v.eff[st.who] = st.list; },
  hurt(side, dmg, kind, t) {
    const v = this.v, b = v.bar[side], before = v.hp[side];
    v.hp[side] = Math.max(0, before - dmg);
    b.fx = { kind, t0: t, from: Math.max(b.trail, b.main), mainFrom: b.main };
  },
  applyHit(st, t) {
    const v = this.v, e = st.ev, A = this.B[st.who], dEl = e.tgtEl || this.B[st.to].el;
    st.applied = true;
    const [label, tone, line] = TIER[e.tier];
    const great = e.tier !== 'miss' && elemMult(st.skill.el, dEl) > 1, maxHp = (v.view[st.to] || this.B[st.to]).max;
    sfx(e.tier === 'miss' ? 'miss' : e.tier === 'graze' ? 'graze' : e.tier === 'crit' ? 'crit' : e.dmg >= maxHp * 0.25 ? 'hitBig' : 'hit');
    if (great) sfx('great');
    if (e.guard) sfx('block');
    if (e.tier !== 'miss') {
      const kind = e.tier === 'crit' ? 'crit' : (great || e.dmg >= maxHp * 0.25) ? 'big' : (e.tier === 'graze' || e.guard) ? 'graze' : 'hit';
      if (e.dmg > 0) { this.hurt(st.to, e.dmg, kind, t); this.pop(st.to, `-${e.dmg}`, e.tier === 'crit' ? 'gold' : 'bad', t, true, 0, null, e.tier === 'crit' ? 'crit' : null, { share: e.dmg / maxHp, kill: v.hp[st.to] <= 0 }); }
    }
    if (e.tier !== 'hit') this.pop(st.to, label, tone, t, false, e.tier === 'crit' ? -36 : -16);   // 보통 맞힘(정타)은 글자 없이 숫자만
    if (great) this.pop(st.to, '효과 굉장!', 'gold', t, false, e.tier === 'crit' ? -52 : -32);
    else if (e.tier !== 'miss' && e.mult > 1.01) this.pop(st.to, '상성!', 'gold', t, false, e.tier === 'crit' ? -52 : -32);   // 변이 상성(2026-10-17)
    else if (e.tier !== 'miss' && e.mult && e.mult < 0.99) this.pop(st.to, '효과가 미미', 'sub', t, false, e.tier === 'crit' ? -52 : -32);   // 무기 상성 ×0.8(2026-10-18 사용자 "'안 듦' 대신 '효과가 미미'") — 다 곱한 값이 1보다 작을 때만('효과 굉장!'과 같이 뜨지 않게 · 2026-10-17)
    if (e.guard) this.pop(st.to, '막음', null, t, false, great ? -48 : -32, '#8ccfff');
    if (e.absorb) { this.pop(st.to, `${e.ab === 'armor' ? '방어구' : '보호막'} -${e.absorb}`, null, t, false, -30, '#8ccfff'); if (e.list) v.eff[st.to] = e.list; sfxAdd(v.sfx, st.to, 'shieldHit', t); sfx('shieldHit'); }
  },
  // 식물 밑동 자리(장면 270칸 안): 상대 = 그림 땅을 따라(fy) · 나 = 손패 바로 위(fy + myDy) — 머리 위 글자 · 표는 위 띠 밑까지만
  at(who) { const L = this.lay; return who === 'me' ? [PX, PY + (L ? L.meDy : 0)] : [EX, EY + (L ? L.foeDy : 0)]; },
  above(who, d) { const [x, y] = this.at(who); return [x, Math.max(AY + 2, y - d)]; },
  // ex = { share: 그 한 방이 깎은(채운) 체력 몫, kill: 결정타 } — 글자 연출 ㉠~㉣이 크기·강조에 씀(지금 연출은 안 씀)
  pop(who, text, tone, t, big = false, dy = 0, col = null, size = null, ex = null) {
    let [x, y] = this.above(who, 92);
    const v = this.v, num = big || /^[+-]\d+$/.test(text);
    if (num) { const near = v.pops.filter(q => q.who === who && (q.big || /^[+-]\d+$/.test(q.text)) && t - q.t0 < 520).length; if (near) { x += (near % 2 ? 1 : -1) * 16; y -= 12 * near; } }   // 연달아 맞은 숫자는 비켜서
    const p = { text, tone, t0: t, x, y: y + dy, dy, big, col, size, who, id: (v.pid = (v.pid || 0) + 1), share: ex ? ex.share : null, kill: !!(ex && ex.kill) };
    if (!num) p.slot = wordSlot(v.pops, p, t);
    v.pops.push(p);
    // ㉣ 굴림: 숫자가 릴처럼 도는 동안 따닥따닥 → 멈출 때 딸깍(textfx.js D — 자리마다 50ms · 한 자리 380ms)
    if (TFX.key === 'd' && /^[+-]\d+$/.test(text)) { const land = ((text.match(/\d/g) || []).length - 1) * 50 + 380; for (let ms = 0; ms < land - 30; ms += 45) sfx('roll', { at: ms / 1000 }); sfx('land', { at: land / 1000 }); }
  },
  amt(side, n) { const u = this.v.view[side] || this.B[side]; return { share: n / ((u && u.max) || 200) }; },
  // 기술 이름 리본: 쓰는 식물 머리 위 속성 색 둥근 띠 + 흰 굵은 글자, 옆에서 미끄러져 들어와 그 단계 끝에 사라짐
  ribbon(who, text, el, t, ms) { this.v.ribbon = { who, text, el, t0: t, ms: Math.max(500, ms || 0) }; },
  drawRibbon(app) {
    const R = this.v.ribbon; if (!R) return;
    const { g, t } = app, age = t - R.t0; if (age > R.ms) return;
    const E = ELEMENT[R.el] || { main: '#7f97b8', light: '#cfe0f4', dark: '#3c5474' }, w = g.textW(R.text, 'bold') + 18, h = 17;
    const [cx, cy] = this.above(R.who, R.who === 'me' ? 126 : 118), slide = Math.max(0, 1 - age / 120), a = Math.min(1, age / 90) * (age > R.ms - 160 ? Math.max(0, (R.ms - age) / 160) : 1);
    const x = Math.round(cx - w / 2 + (R.who === 'me' ? -10 : 10) * slide);
    g.alpha(a, () => {
      rrect(g, x, cy, w, h, 7, '#0b1322'); rrect(g, x + 1, cy + 1, w - 2, h - 2, 6, hexMix(E.dark, '#0b1322', 0.2));
      g.rect(x + 6, cy + 1, w - 12, 1, E.light); g.rect(x + 6, cy + h - 2, w - 12, 1, hexMix(E.dark, '#000000', 0.3));
      g.text(R.text, x + w / 2, cy + Math.round((h - glyphH('bold')) / 2), { font: 'bold', color: '#ffffff', align: 'center', outline: '#0b1322', outlineW: 2 });
    });
  },
  // 승패: 가운데 큰 글자(네모 없이) — 승리 = 금빛, 패배 = 회청, 아래 한 줄 까닭(있으면)
  title(app, win, sub) { this.v.title = { win, sub, t0: app.t }; music(win ? 'win' : 'lose'); sfx(win ? 'win' : 'lose'); },
  drawTitle(app) {
    const T0 = this.v.title; if (!T0) return;
    const { g, t } = app, c = g.c, k = Math.min(1, (t - T0.t0) / 220), y = Math.round((this.lay ? this.lay.led : LED_CY) - 30 + (1 - k) * 12), sc = c.getTransform().a || 1;
    c.save(); c.shadowColor = T0.win ? 'rgba(255,196,70,0.75)' : 'rgba(110,150,210,0.55)'; c.shadowBlur = 16 * sc;
    g.alpha(k, () => g.text(T0.win ? '승리!' : '패배', 135, y, { font: 'huge', color: T0.win ? '#ffd84a' : '#b4c8e2', align: 'center', outline: T0.win ? '#3a2006' : '#0e1626', outlineW: 5 }));
    c.restore();
    if (T0.sub) g.alpha(k, () => g.text(T0.sub, 135, y + 54, { font: 'bold', color: '#eef4ff', align: 'center', outline: '#0b1322', outlineW: 3 }));
  },
  // 시간 막대: 아래 판 윗선을 따라 줄어듦(하늘 → 주황 → 빨강 깜빡), 10초 남으면 오른쪽 끝에 초
  drawTimer(app, x, y, w) {
    const { g, t } = app, v = this.v;
    this.timerR = [x, y - 2, w, 8];   // 처음 안내가 가리킬 자리
    if (v.phase === 'over' || v.phase === 'play' || v.phase === 'need') return;
    const pvp = this.net === 'pvp' && this.deadline, left = pvp ? this.deadline - net.now() : v.pickT0 != null ? PICK_MS - (t - v.pickT0) : null;
    if (left == null) return;
    const r = Math.max(0, Math.min(1, left / (pvp ? this.stepMs || PVP_MS : PICK_MS))), fw = Math.round((w - 2) * r), sec = Math.ceil(left / 1000);
    if (sec <= 10 && sec > 0 && v.tickSec !== sec && !this.shot) { v.tickSec = sec; sfx(sec <= 3 ? 'tickLast' : 'tick'); }
    rrect(g, x, y, w, 4, 2, '#0b1322'); g.rect(x + 1, y + 1, w - 2, 2, '#1c2a40');
    const col = r > 0.5 ? '#8ccfff' : r > 0.2 ? '#f0be7d' : Math.floor(t / 250) % 2 ? '#ff6a5a' : '#ffb4a6';
    if (fw > 0) { g.rect(x + 1, y + 1, fw, 2, col); g.rect(x + 1, y + 1, fw, 1, hexMix(col, '#ffffff', 0.45)); }
    if (left <= 10000) g.text(String(Math.max(0, Math.ceil(left / 1000))), x + w, y - 13, { font: 'bold', color: col, align: 'right', outline: '#0b1322', outlineW: 3 });
  },
  tick(app) {
    const v = this.v, t = app.t;
    if (v.phase === 'pick' && this.net !== 'pvp' && !this.shot && !(this.p && this.p.phase) && v.pickT0 != null && t - v.pickT0 >= PICK_MS && !mustSkip(this.B.me)) { this.pop('me', '시간 초과', null, t, false, -16, '#f0be7d'); const s = randomOk(this.B.me, Math.random); this.pick(app, s.blocked ? REST : s); }   // 2026-10-23 사용자 '시간초과 하면 랜덤으로 스킬써짐'
    if (v.phase === 'pick' && !this.shot && !(this.p && this.p.phase) && mustSkip(this.B.me)) {
      if (v.autoSkipAt == null) v.autoSkipAt = t + SKIP_AUTO_MS;
      else if (t >= v.autoSkipAt) { v.autoSkipAt = null; this.pick(app, REST); }
    }
    if (this.p && ['text', 'status', 'status2', 'status3'].includes(this.p.demo) && v.phase === 'pick') { if (v.demoAt == null) v.demoAt = t + 600; else if (t >= v.demoAt) ({ text: () => this.demoText(app), status: () => this.demoStatus(app), status2: () => this.demoStatus2(app), status3: () => this.demoStatus3(app) })[this.p.demo](); }
    if (v.phase === 'play') {
      if (v.t0 == null) { v.t0 = t; this.startStep(v.steps[v.si], t, app); }
      let st = v.steps[v.si];
      if (this.shot) {
        const ai = v.steps.findIndex(s => s.kind === 'attack');
        if (ai >= 0 && v.si !== ai) { for (let i = v.si + 1; i <= ai; i++) this.startStep(v.steps[i], t, app); v.si = ai; v.t0 = t - (v.steps[ai].anim.I + 1) * FRAME_MS - (+(this.p && this.p.hitAt) || 0); }   // ?hitAt = 맞은 뒤 ms
        return;
      }
      while (st && t - v.t0 >= st.ms) {
        if (st.kind === 'attack' && !st.applied) this.applyHit(st, t);
        if (st.kind === 'switch' && !st.swapped) this.swapView(st);
        if (st.kind === 'faint') v.gone[st.who] = true;
        v.t0 += st.ms; v.si++; st = v.steps[v.si];
        if (st) this.startStep(st, t, app);
      }
      if (st && st.kind === 'switch' && !st.swapped && t - v.t0 >= st.ms * 0.45) this.swapView(st);
      if (!st) this.finishTurn(app);
    } else if (v.phase === 'over' && !v.leaving && !(this.p && this.p.demo) && t - v.overT0 > 1700) {
      v.leaving = true;
      const me = (this.B.team ? this.B.team.me[0] : this.B.me) || this.B.me, foe = this.B.foe;
      app.lastResult = { win: this.B.over === 'win', mode: this.net === 'pvp' ? 'pvp' : this.mode === 'swap3' ? 'swap3' : 'tournament', reward: this.result ? this.result.reward : null, info: this.info, me: { key: me.key, pot: me.pot, stage: me.stage, el: me.el, shiny: !!me.shiny }, foe: { el: foe.el }, why: this.end ? this.end.why : 'ko' };
      app.go('result', { win: this.B.over === 'win', venue: T.key }, 'shutter');
    }
    for (const k of ['me', 'foe']) {
      const b = v.bar[k], to = v.hp[k], fx = b.fx;
      b.armor = ((v.eff[k] || []).find(s => s.id === 'armor') || {}).hp || 0;   // 방어구 남은 양(효과 목록에서)
      if (!fx) { b.main = b.trail = to; continue; }
      const S = HURT[fx.kind], age = t - fx.t0;
      b.main = fx.mainFrom + (to - fx.mainFrom) * Math.min(1, age / S.main);
      b.trail = age < S.hold ? fx.from : fx.from + (to - fx.from) * easeOut(Math.min(1, (age - S.hold) / S.drain));
      if (age >= S.hold + S.drain && age >= S.shakeMs) { b.fx = null; b.main = b.trail = to; }
    }
    v.pops = v.pops.filter(p => t - p.t0 < popLife(p));
    v.sfx = sfxAlive(v.sfx, t);
  },
  finishTurn(app) {
    const B = this.B, v = this.v;
    v.hp = { me: B.me.hp, foe: B.foe.hp }; v.en = { me: B.me.energy, foe: B.foe.energy }; v.stance = {}; v.foePaid = false; v.turn = B.turn;
    for (const k of v.tok || []) k.done = true; v.cast = null; v.effSeq = {};   // 턴 끝 = 판의 효과 목록을 그대로(아래) — 날아가던 조각은 끝냄
    const lt = B.log && B.log[B.log.length - 1];   // 상대가 이번 턴에 쓴 카드(쉼 · 교체한 턴은 더미에 안 쌓임)
    if (lt && lt.foeSkill && lt.foeSkill.act !== 'skip' && lt.foeSkill.name && lt.foeSkill.name !== '기술' && lt.foeSwitch == null) {
      v.foeLast = lt.foeSkill;
      (v.foeHist ||= []).unshift({ sk: lt.foeSkill, turn: B.turn - 1, t0: app.t, u: B.foe }); v.foeHist.length = Math.min(v.foeHist.length, FOE_HIST);   // 상대 카드 더미(맨 앞 = 방금 · u = 쓴 식물 — 3:3에서 누가 썼는지)
    }
    // 판이 끝나면 쓰러짐 연출로 이미 사라진 식물은 그대로 둠(2026-10-16 사용자 "승리 문구 뜨면서 사라졌던 식물이 다시 나와서 사라지는 효과")
    if (!B.need) { v.view = { me: B.me, foe: B.foe }; v.gone = B.over ? Object.fromEntries(['me', 'foe'].filter(s => v.gone[s] && B[s].hp <= 0).map(s => [s, true])) : {}; v.eff = { me: listOf(B.me), foe: listOf(B.foe) }; }
    if (B.over) {
      v.phase = 'over'; v.overT0 = app.t;
      const win = B.over === 'win', why = this.end && this.end.why && this.end.why !== 'ko';
      this.title(app, win, why ? (win ? '상대가 기권했다' : '기권했다') : win ? (this.mode === 'swap3' ? '상대 식물을 모두 쓰러뜨렸다' : `${ga(B.foe.name)} 쓰러졌다`) : (this.mode === 'swap3' ? '내 식물이 모두 쓰러졌다' : `${ga(B.me.name)} 쓰러졌다`));
    } else if (needMe(B)) { v.phase = 'need'; v.picked = null; this.sheet = { forced: true }; }
    else if (B.need === 'foe') { v.phase = 'wait'; v.picked = null; v.waitSend = true; }   // 친구 대결: 상대가 다음 식물을 고르는 중
    else { v.phase = 'pick'; v.picked = null; v.waitSend = false; this.prompt(app); }
    if (this.queue && this.queue.length) { const q = this.queue.shift(); this.onNet(app, q.type, q.data); }   // 연출 중에 온 소식
  },
  draw(app) {
    const { g, W, H, t } = app;
    if (!this.B) this.setup(app);
    this.tick(app);
    this.landTokens(t);   // 효과 조각이 칸에 닿은 때 목록 바꿈(㉢)
    const B = this.B, v = this.v, Lay = this.lay = layOf(H, handRows(B.me.kit), mutHand(B.me.kit)), AH = Lay.AH;
    g.rect(0, 0, W, H, T.ink);
    const st = v.phase === 'play' ? v.steps[v.si] : null;
    let fr = null;
    if (st && st.kind === 'attack') {
      const f = Math.max(0, Math.min(FRA - 1, Math.floor((t - v.t0) / FRAME_MS)));
      fr = st.anim.frame(f); prepareBoards(fr, st.uid + ':' + f);
      if (f >= st.anim.I && !st.applied) this.applyHit(st, t);
    }
    // 식물 빛(노멀맵 조명 — art/plantlight.js, 2026-10-22 사용자 "상태이상, 각 스킬의 공격 … 다양하게"): 밤 경기장 어둠 · 공격 효과 빛(연출 판 좌표 → 화면) · 상태이상 빛
    const night = T.key === 'night', ftop = AY + Lay.foeDy, fcut = EY - AY, fdd = Lay.meDy - Lay.foeDy, fk = fdd ? (PY - EY + fdd) / (PY - EY) : 1;   // 연출 판: 상대 받침까지는 그대로 · 그 아래는 내 받침에 맞춰 늘이거나 누름
    const glow = fr ? fr.glow.map(q => ({ ...q, y: ftop + (fdd && q.y > fcut ? fcut + (q.y - fcut) * fk : q.y) })) : [];
    const lightOf = (who, x, y) => ({ amb: night ? NIGHT_AMB : 1, self: night ? 1 : 0.35, id: who, lights: glow.concat(statusLights(v, who, x, y, t)) });
    const unit = (who, x, y, flip, phase) => {
      const view = who === 'foe' ? 'far' : null, light = lightOf(who, x, y);
      if (st && st.kind === 'switch' && st.who === who) {
        const k = (t - v.t0) / st.ms;
        if (k < 0.45) { if (st.fromU) { const q = k / 0.45; g.alpha(1 - q, () => drawBig(g, artOf(st.fromU), st.fromU.pot, x, y + Math.round(q * 8), { t, flip, view, light })); } return; }
        const q = Math.min(1, (k - 0.45) / 0.4), top = y - 112, rv = Math.round(top + (1 - q) * 116);
        g.clip(0, rv, W, 140, () => drawBig(g, artOf(st.toU), st.toU.pot, x, y, { t, flip, view, light }));
        if (q < 1) { g.rect(x - 26, rv, 52, 1, '#8ccfff'); g.rect(x - 18, rv - 1, 36, 1, '#e6f3ff'); }
        return;
      }
      const u = v.view[who];
      if (v.gone[who]) return;
      if (st && st.kind === 'faint' && st.who === who) { const k = Math.min(1, (t - v.t0) / 700); g.alpha(1 - k, () => drawBig(g, artOf(u), u.pot, x, y + Math.round(k * 10), { t: 0, flip, view, light })); return; }
      let pose = null, flash = false, dx = 0, dy = 0;
      if (fr) { if (who === st.who) pose = fr.atkPose; else if (st.ev.tier !== 'miss') { pose = fr.tgtPose; flash = fr.flash; dx = fr.shake; dy = -fr.hop; } }
      if (st && st.kind === 'cast' && v.cast) { if (who === v.cast.who) { const cp = castPose(v.cast, t); pose = { qx: cp.qx, qy: cp.qy, sq: cp.sq }; flash = flash || cp.flash; } else if (who === v.cast.other) dx += targetKick(v.cast, t); }   // 시전 몸놀림(모으며 웅크림 → 터뜨림) · 거는 것이 닿으면 움찔
      if (st && (st.kind === 'counter' || st.kind === 'reflect') && who === (st.to || st.side) && t - v.t0 < 160) flash = true;
      if (v.phase === 'over' && v.hp[who] <= 0) { const k = Math.min(1, (t - v.overT0) / 900); g.alpha(1 - k * 0.85, () => drawBig(g, artOf(u), u.pot, x, y + Math.round(k * 10), { t: 0, flip, view, light })); return; }
      const sw = v.sfx.length || (v.eff[who] || []).some(s => s.id === 'gale') ? swayOf(v.sfx, { [who]: (v.eff[who] || []).map(s => s.id) }, who, t) : 0;
      if (sw) pose = { ...(pose || {}), qx: ((pose && pose.qx) || 0) - sw };
      const fxs = v.eff[who] || [], hidden = fxs.some(s => s.id === 'stealth');
      if (fxs.some(s => s.id === 'clone')) for (const ox of [-20, 20]) g.alpha(0.4, () => drawBigPose(g, artOf(u), u.pot, x + dx + ox, y + dy + 2, { t: t + ox * 37, phase, flip, view, ...(pose || {}), light: { ...light, id: who + ox } }));   // 분신(2026-10-18)
      g.alpha(hidden ? 0.35 : 1, () => drawBigPose(g, artOf(u), u.pot, x + dx, y + dy, { t, phase, flip, flash, view, ...(pose || {}), light }));   // 은신 = 흐리게
      if (v.sfx.length) drawSfx(g, v.sfx, who, t, { key: artOf(u), pot: u.pot, bx: x + dx, by: y + dy, flip, view, t, phase });
    };
    // 무대(1배 도트): 경기장 그림 → 받침 → 효과 층 → 상대 → 나 → 자세 표시 · 숫자 · 전광판
    //  그림 270×348 = 위(하늘 · 관중석 · 벽)는 화면 위에 붙이고 길면 벽 밑 땅을 늘임 · 짧으면 위를 잘라 올림(layOf) · 넓은 화면 = 가운데 + 양옆을 그림 가장자리 한 줄로 이음
    const bg = BGIMG['arena_' + T.key], ox = Math.floor((W - 270) / 2), [ex, ey] = this.at('foe'), [px, py] = this.at('me');
    const art = bg ? (T.key === 'colosseum' ? colosseumFloor(bg, Lay.gap) : arenaArt(bg, T.key, Lay.gap)) : null, ay = AY + Lay.lift;   // ay = 그림 맨 윗줄 자리
    g.clip(0, AY, W, AH, () => {
      const c = g.c;
      c.imageSmoothingEnabled = false;
      if (!art) g.rect(0, AY, W, AH, '#0b0d1a');
      else if (ox) { c.drawImage(art, 0, 0, 1, art.height, 0, ay, ox, art.height); c.drawImage(art, art.width - 1, 0, 1, art.height, ox + 270, ay, W - ox - 270, art.height); }
      c.save(); c.translate(ox, 0);
      c.save();
      if (fr) c.translate(fr.cam[0], fr.cam[1]);
      else if (st && st.kind === 'cast' && v.cast) { const [sx, sy] = castShake(v.cast, t); if (sx || sy) c.translate(sx, sy); }   // 땅을 치는 환경 · 설치 기술만 1칸
      if (art) { c.drawImage(art, 0, ay); if (T.key === 'colosseum') arenaLife(g, bg, 0, ay, t); }
      else arena1(g, 0, AY, 270, 348, t);
      const FP = { me: [px, py], foe: [ex, ey] }, fenv = this.fieldEnvs(t);
      fieldGround(g, fenv, v.arrive, t, FP);   // ㉠ 환경이 깔린 쪽 땅(지옥 = 그을린 땅 · 갈라진 틈 · 불꽃, 독안개 = 보라 안개 …) — 받침 아래
      padV(g, ex, ey, 36, false, FAR_K);
      padV(g, px, py, 42, true);
      // 연출 판(공격 장마다 그린 270×348 — 받침 자리 기준): 땅을 따라 fy, 아주 짧은 화면은 상대 줄 아래를 눌러 내 식물 자리에 맞춤
      const board = n => {
        const b = boardCanvas(n), top = AY + Lay.foeDy, dd = Lay.meDy - Lay.foeDy;
        if (!dd) return c.drawImage(b, 0, top);
        const cut = EY - AY, k = (PY - EY + dd) / (PY - EY);
        c.drawImage(b, 0, 0, b.width, cut, 0, top, b.width, cut);
        c.drawImage(b, 0, cut, b.width, b.height - cut, 0, top + cut, b.width, Math.round((b.height - cut) * k));
      };
      if (fr) { board('floor'); board('back'); }
      unit('foe', ex, ey, true, 1600);
      if (fr) board('mid');
      unit('me', px, py, false, 0);
      for (const [who, x0, y0, dir] of [['foe', ex + 36, ey, 1], ['me', px - 47, py, -1]]) ((this.B[who] && this.B[who].summons) || []).filter(s => s.hp > 0).forEach((s, i) => {   // 소환수(스포어캡): 식물 옆 작은 버섯 + 체력 줄
        const ic = icon('sum_' + s.stage), x = x0 + dir * i * 14, y = y0 - 14;
        if (ic) g.img(ic, x, y);
        g.rect(x - 1, y + 13, 14, 2, '#1a1a1a'); g.rect(x - 1, y + 13, Math.max(1, Math.round(14 * s.hp / s.max)), 2, s.stage === 'sleep' ? '#9fb0c8' : '#7be08a');
      });
      if (fr) { board('front'); board('air'); }
      if (fr && st.skill && st.skill.area && st.ev.tier !== 'miss') areaWave(g, st, t - v.t0, st.to === 'foe' ? [ex, ey] : [px, py], AY, AH);   // 광역 = 바닥 충격파(2026-10-22)
      if (v.sfx.length || (v.eff.me || []).some(s => s.id === 'gale') || (v.eff.foe || []).some(s => s.id === 'gale')) drawSfxMap(g, v.sfx, t, { me: [px, py], foe: [ex, ey] }, [0, AY, 270, AH], { me: (v.eff.me || []).map(s => s.id), foe: (v.eff.foe || []).map(s => s.id) });
      fieldAir(g, fenv, v.arrive, t, FP, [-ox, AY, W, AH], 64);   // ㉠ 식물 위에 겹치는 환경(불티 · 안개 결 · 먹구름 · 아침 빛 · 밤 어둠) + 깔리는 순간
      if (st && st.kind === 'cast' && v.cast) drawCast(g, v.cast, t, FP);   // ㉡ 시전(빛기둥 · 문양 구슬 · 땅 물결 · 종소리 · 설치 · 소환)
      for (const who of ['me', 'foe']) {
        const s = v.stance[who]; if (!s) continue;
        const [x, y] = this.above(who, 118);
        btnBody(g, x - 12, y, 24, 20, s.active ? T.btn.gold : T.btn.off, true);
        const ic = s.kind === 'guard' ? 'shield' : s.kind === 'reflect' ? 'fx_reflect' : 'speed';   // 반사 = 그 턴 처음 맞는 한 타(엑셀 v10)
        g.img(s.active ? icon(ic) : tinted(ic, T.btn.off.text), x - 5, y + 5);
      }
      c.restore();
      if (TFX.key !== 'now') {   // 글자 연출 ㉠~㉣(?tfx=a|b|c|d) — art/textfx.js
        tfxPops(g, v.pops, t, v.ribbon);
        if (v.ribbon) tfxRibbon(g, v.ribbon, t, ...this.above(v.ribbon.who, v.ribbon.who === 'me' ? 126 : 118), v.ribbon.who === 'me' ? -1 : 1);
        tfxTitle(g, v.title, t, 135, Lay.led - 30 + Math.round(glyphH('huge') / 2));
      } else for (const p of v.pops) {   // 떠오르는 글자: 처음 0.14초 톡 튀어 오르고 1.1초 동안 올라가며 사라짐 · 치명 = 큰 금빛 숫자 + 흔들림
        const age = t - p.t0, k = age / 1100, y = Math.round(p.y - Math.min(1, age / 140) * 5 - k * 12), col = p.col || { bad: '#ff6a6a', gold: '#ffd84a', dim: '#c8c8d0', sub: '#e8e0b0', main: '#ffffff' }[p.tone] || '#ffffff';
        const crit = p.size === 'crit', sx = crit && age < 280 ? (Math.floor(age / 40) % 2 ? 2 : -2) : 0;
        g.alpha(Math.min(1, (1 - k) * 2.2), () => g.text(p.text, p.x + sx, y - (crit ? 12 : 0), { font: crit ? 'big' : p.big ? 'name' : 'value', color: col, align: 'center', outline: crit ? '#3a1806' : T.ink, outlineW: crit ? 4 : 3 }));
      }
      if (TFX.key === 'now') { this.drawRibbon(app); this.drawTitle(app); }
      this.drawEmotes(app);
      c.restore();
    });
    // 아래(2026-10-16 사용자 "아래 스킬바의 배경이 별로야. 배경을 없애고 카드만 나열되는 느낌" + "스킬바와 식물/상태바의 거리가 너무 멀어 땡겨줘"):
    //  판 배경 없이 경기장 바닥 끝 줄을 아래로 늘여 잇고, 손패 자리부터 아래로 갈수록 어둡게 → 카드는 내 체력판 바로 아래부터
    const MY = Lay.MY, HY = Lay.HY, hrows = handRows(B.me.kit);   // HY = 손패 맨 위 · 상대 체력판은 늘 맨 위(2026-10-23 사용자 '상대 식물은 위로 정렬')
    if (art) { g.c.imageSmoothingEnabled = false; g.c.drawImage(art, 0, Math.max(0, Math.min(art.height - 1, AY + AH - ay - 1)), art.width, 1, 0, AY + AH, W, H - AY - AH); }
    else g.rect(0, AY + AH, W, H - AY - AH, '#0b0d1a');
    const shade = g.c.createLinearGradient(0, HY - 16, 0, H);
    shade.addColorStop(0, 'rgba(8,12,22,0)'); shade.addColorStop(0.22, 'rgba(8,12,22,0.62)'); shade.addColorStop(1, 'rgba(8,12,22,0.9)');
    g.c.fillStyle = shade; g.c.fillRect(0, HY - 16, W, H - HY + 16);
    this.topBar(app);
    // 체력판(3:3 남은 식물은 아래 교체 칸에)
    // 3:3 상대 남은 식물 = 상대 체력판 윗줄 끝 작은 칸 셋(2026-10-16 사용자 "상대의 교체 카드는 상대의 상태창 이름 옆에 간단한 아이콘으로") — 누군지는 안 보임
    const foeTeam = this.mode === 'swap3' && B.team ? B.team.foe.map(u => ({ dead: (u === v.view.foe ? v.hp.foe : u.hp) <= 0, on: u === v.view.foe })) : null;
    // 환경 띠(위 = 상대 쪽 · 아래 = 내 쪽 — 체력판과 같은 폭이라 식물을 안 가림): 상대 띠 = 맨 위(그 밑에 상대 체력판) · 내 띠 = 내 체력판과 손패 사이(체력판을 띠만큼 올림)
    // 효과 창 줄 수(2026-10-23 사용자 "폭이 넓은 폰은 과하게 효과와 창 때문에 식물이 다 가려지고 서로겹치는데"): 상대 효과 창은 내 식물 머리 위까지 · 내 효과 창은 상대 화분 아래부터 —
    //  들어가는 만큼만(1~2줄, 넘치면 +n · 눌러서 다 봄) · 상대 쪽이 한 줄도 안 들어가면 상대 체력판 맨 윗줄(재배사)을 접음
    // 띠가 생기거나 걷힐 때 체력판이 0.28초에 걸쳐 밀림(2026-10-29 — 전엔 한 장에 툭 바뀌어 '어느새 체력바 아래에 올라와 있고')
    const fEnv = this.envs('foe'), mEnv = this.envs('me'), fOff = this.slide('foe', fEnv.length ? ENV_H + 2 : 0, t), mOff = this.slide('me', mEnv.length ? ENV_H + 2 : 0, t);
    const foeY = AY + 4 + Math.round(fOff), myY = MY - Math.round(mOff);
    const headY = this.at('me')[1] - PLANT_TOP, potY = this.at('foe')[1] + POT_BOTTOM, theirs = this.statuses('foe');
    const rowsFit = top => Math.min(2, Math.floor((headY - top + 2) / (SW_H + 2)));
    let foeCompact = false, foeRows = rowsFit(foeY + boxH(false) + 3);
    if (foeRows < 1 && theirs.length) { foeCompact = true; foeRows = Math.max(1, rowsFit(foeY + boxH(true) + 3)); }
    if (fEnv.length && fOff > 1) g.alpha(Math.min(1, fOff / (ENV_H + 2)), () => envBand(g, 6, foeY - ENV_H - 2, BOX_W, fEnv, v.turn));
    const fh = infoBox(app, 6, foeY, v.view.foe, v.bar.foe, v.en.foe, false, foeTeam, foeCompact);
    statusWins(g, 6, foeY + fh + 3, theirs, Math.max(1, foeRows));
    const fRows = Math.min(Math.max(1, foeRows), Math.ceil(Math.min(6, theirs.length) / 3));
    // 효과 표시 = 체력바 밑 효과 칸(2026-10-29 사용자 '상태이상은 우측상단에 따로 누르는게 아니고 체력바 하단에 있는 표시를 누르는거였어') — 누르는 동안 살짝 밝아짐 · 처음 안내가 가리킬 자리(fxTarget)
    if (app.input.isPressed('fx_foe')) g.alpha(0.13, () => rrect(g, 6, foeY, BOX_W, fh + (fRows ? 3 + fRows * (SW_H + 2) - 2 : 0), 4, '#ffffff'));
    this.fxR = { foe: fRows ? [6, foeY + fh + 3, BOX_W, fRows * (SW_H + 2) - 2] : null, envFoe: fEnv.length ? [6, foeY - ENV_H - 2, BOX_W, ENV_H] : null };
    this.pileR = (v.foeHist || []).length ? this.drawPile(app, v.foeHist, t) : null;   // 상대 카드 더미(오른쪽 위)
    this.geo = { foe: { x: 6, y: foeY + fh + 3, up: false, band: [6, AY + 4], bandNow: [6, foeY - ENV_H - 2], list: theirs }, me: null };   // 효과 조각이 꽂힐 자리(drawTokens · 반짝)
    if (this.net === 'pvp' && v.foeReady === B.turn && v.phase !== 'play' && !v.waitSend) { const x = 6 + BOX_W + 4, y = foeY + 4; holo(g, x, y, 34, 16, { fill: '#13385e', fill2: '#17446e', frame: '#9ff0b0', frameHi: '#e6f3ff', frameLo: '#2a6a44' }, 16); g.text('고름', x + 17, y + (16 - glyphH('body')) / 2, { color: '#d8ffe4', align: 'center' }); }
    if (this.net === 'pvp' && v.waitSend && v.phase === 'wait') {   // 3:3: 상대 식물이 쓰러져 상대가 다음 식물을 고르는 중(남은 초)
      const sec = this.deadline ? Math.max(0, Math.ceil((this.deadline - net.now()) / 1000)) : null, label = '상대가 다음 식물을 고르는 중' + (sec != null ? ` · ${sec}` : ''), w = g.textW(label) + 16, x = Math.round((W - w) / 2), y = Lay.led - 8;
      holo(g, x, y, w, 18, { fill: '#13385e', fill2: '#17446e', frame: '#8ccfff', frameHi: '#e6f3ff', frameLo: '#18385e' }, 16);
      g.text(label, W / 2, y + (18 - glyphH('body')) / 2, { color: '#e0f0ff', align: 'center' });
    }
    infoBox(app, W - 146, myY, v.view.me, v.bar.me, v.en.me, true);
    if (mEnv.length && mOff > 1) g.alpha(Math.min(1, mOff / (ENV_H + 2)), () => envBand(g, W - 146, myY + boxH(true) + 2, BOX_W, mEnv, v.turn));
    const mine = this.statuses('me'), myRows = Math.max(1, Math.min(2, Math.floor((myY + 1 - potY) / (SW_H + 2)))), rows = Math.min(myRows, Math.ceil(Math.min(6, mine.length) / 3));
    if (rows) statusWins(g, W - 146, myY - 3 - SW_H, mine, myRows, true);   // 첫 줄 = 체력판 바로 위 · 넘치면 그 위 줄(상대는 체력판 아래로 내려감 — 반대)
    const myTop = rows ? myY - 3 - rows * (SW_H + 2) + 2 : myY;
    if (app.input.isPressed('fx_me')) g.alpha(0.13, () => rrect(g, W - 146, myTop, BOX_W, myY + boxH(true) - myTop, 4, '#ffffff'));
    this.fxR.me = rows ? [W - 146, myTop, BOX_W, myY - 3 - myTop] : null; this.fxR.envMe = mEnv.length ? [W - 146, myY + boxH(true) + 2, BOX_W, ENV_H] : null;
    this.geo.me = { x: W - 146, y: myY - 3 - SW_H, up: true, band: [W - 146, MY + boxH(true) - ENV_H], bandNow: [W - 146, myY + boxH(true) + 2], list: mine };
    this.drawFlash(app);   // 꽂힌 칸 · 띠 반짝(㉢)
    // 손패: 카드 여섯 장(판 배경 없음) → 기타 단추 줄. 시간 막대 = 카드 묶음 바로 위, 카드 폭만큼
    const skipNow = v.phase === 'pick' && mustSkip(B.me), live = !app.confirm && !this.sheet && !this.info2 && !this.emoteOpen && !this.peek && !this.spread;
    // 효과 설명 = 체력판 · 효과 창을 누르면(2026-10-16 사용자 "맨 아래 효과 버튼은 뭐야? 이거 필요한 거야?" → 아래 단추를 빼고 효과가 보이는 그 자리에서)
    if (live) {
      const open = side => () => { this.info2 = side; this.infoScroll = 0; this.infoT0 = app.t; };   // 누른 쪽 식물 것만(2026-10-29 사용자 '내걸 누르면 내거만. 상대걸 누르면 상대것만')
      if (this.pileR && v.phase === 'pick') app.input.hit('foe_pile', ...this.pileR, () => this.openSpread(app), 3);   // 상대 카드 더미 → 펼쳐 보기(고르는 동안)
      app.input.hit('fx_foe', 6, foeY, BOX_W, fh + (fRows ? 3 + fRows * (SW_H + 2) : 0), open('foe'), 2);
      app.input.hit('fx_me', W - 146, myTop, BOX_W, myY + boxH(true) - myTop, open('me'), 2);
      if (fEnv.length) app.input.hit('env_foe', 6, foeY - ENV_H - 2, BOX_W, ENV_H, open('foe'), 2);   // 환경 띠를 눌러도 그 쪽 설명 창
      if (mEnv.length) app.input.hit('env_me', W - 146, myY + boxH(true) + 2, BOX_W, ENV_H, open('me'), 2);
    }
    const HG = handGeo(W, B.me.kit), hw = HG.w, hx = HG.x0;
    this.drawTimer(app, hx, HY - 8, hw);
    this.hand(app, HY - CARD_Y, live, skipNow);
    if (mutHand(B.me.kit)) this.miscRow(app, HY - CARD_Y + CARD_Y + CARD_H + CARD_GY, live, hx + 2 * (HAND_W + HAND_GX));   // 아래 줄 오른쪽
    else this.miscRow(app, HY + hrows * CARD_H + (hrows - 1) * CARD_GY + 8, live);
    this.drawTokens(app);   // 효과 조각(㉢) — 손패 위로도 날아가니 맨 위에
    if (st && st.kind === 'reveal') this.drawReveal(app, st);
    if (this.spread) this.drawSpread(app);   // 펼친 상대 카드 — 그 위에 누른 카드가 크게 뒤집힘(drawPeek)
    if (this.peek) this.drawPeek(app);
    if (this.sheet) this.swapSheet(app);
    if (this.info2) this.infoSheet(app);
    if (this.emoteOpen) this.emoteSheet(app);
  },
  // 손패: 여섯 장(위 줄 = 기본기 · 아래 줄 = 배운 기술, 모자라면 빈 칸). 꾹(0.32초) 누르면 그 카드를 앞으로 가져와 뒷면(상세)을 봄
  hand(app, PY0, live, skipNow) {
    const { g, W, input } = app, B = this.B, v = this.v, mh = mutHand(B.me.kit), one = handRows(B.me.kit) === 1 || mh;
    const kit = mh ? [...B.me.kit.filter(s => !isExtra(s)), null, null, null, null].slice(0, 4).concat(B.me.kit.filter(isExtra)) : B.me.kit;   // 카드 칸 기술 = 아래 줄 왼쪽 둘
    this.cards = {}; this.useWas = this.useWas || {}; this.shineAt = this.shineAt || {}; this.lift = this.lift || {};
    const hdt = Math.min(50, Math.max(0, app.t - (this.handT ?? app.t))); this.handT = app.t;   // 들림 부드럽게(장 사이 시간)
    const { CW, GX, per, x0 } = handGeo(W, B.me.kit), n = mh ? kit.length : one ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const sk = kit[i], x = x0 + (i % per) * (CW + GX), y = PY0 + CARD_Y + Math.floor(i / per) * (CARD_H + CARD_GY), CARD_W = CW;   // 한 줄 넷 = 좁은 카드(그림은 가운데를 잘라 1배 그대로)
      if (!sk) { cardSlot(g, x, y, CARD_W, CARD_H, '빈 칸'); continue; }
      const id = 'sk_' + sk.id, pickNow = v.phase === 'pick', lock = pickNow ? lockOf(B.me, sk) : null, usable = !skipNow && canUse(B.me, sk, B.me.energy, B.foe), can = live && pickNow && usable, lit = v.picked === sk.id;
      const show = pickNow ? usable : true, short = (sk.cost || 0) > B.me.energy;   // 어둡게 = 고르는 차례에 규칙상 못 쓸 때만(넘어가는 연출 중엔 그대로)
      if (pickNow) { if (usable && this.useWas[id] === false) this.shineAt[id] = app.t; this.useWas[id] = usable; }   // 쓸 수 있게 된 순간 = 빛 띠
      if ((this.peek && this.peek.id === id) || (lit && v.phase === 'play')) cardSlot(g, x, y, CARD_W, CARD_H);   // 들어 올린 카드의 자리 · 낸 카드(턴 연출 중 — 공개 때 이 자리에서 나감)
      else {
        // 손맛(2026-10-29 사용자 '3번은 좋아보인다' — 쓸 수 있는 카드는 테두리가 은은하게 빛나고, 누를 때 카드가 들리며 소리가 나요):
        //  쓸 수 있는 카드 = 둘레 하늘빛이 천천히 숨 쉼(카드마다 조금씩 어긋나 물결) · 누르는 순간 0.1초 남짓에 5칸 들림 + 들림 소리(그림자는 자리에 남아 높이가 보임) · 떼면 '고름' 소리
        //  못 쓰는 카드 = 들리지 않고 1칸 눌림 · 떼면 좌우로 짧게 떨림 + 막힘 소리 · 꾹(0.32초) 누르면 어느 카드든 뒷면
        const pressed = !!(input.down && input.down.id === id && !input.down.moved), lv0 = this.lift[id] || 0, lv = this.lift[id] = lv0 + ((pressed && can ? 1 : 0) - lv0) * (1 - Math.exp(-hdt / 40));
        if (pressed && can && this.liftT !== input.down.t0) { this.liftT = input.down.t0; sfx('lift'); }
        const da = this.denyAt && this.denyAt.id === id ? app.t - this.denyAt.t : 1e9, shake = da < 240 ? Math.round(Math.sin(da / 240 * Math.PI * 4) * 2 * (1 - da / 240)) : 0;
        const cy = y - (lit ? 5 : Math.round(lv * 5)) + (pressed && !can ? 1 : 0), sh = this.shineAt[id] != null ? (app.t - this.shineAt[id]) / SHINE_MS : null;
        rrect(g, x + 1, y + 3, CARD_W, CARD_H, 5, `rgba(0,0,0,${(lit ? 0.45 : 0.32 + 0.14 * lv).toFixed(3)})`);   // 그림자(카드가 떠오르면 자리에 남아 높이가 보임)
        if (can) cardGlow(g, x, cy, CARD_W, CARD_H, Math.min(1, 0.5 + 0.22 * Math.sin((app.t / 1800 + i * 0.13) * Math.PI * 2) + 0.5 * lv));
        const left = sk.uses ? usesLeft(B.me, sk) : null, halved = !!(B.me.st && B.me.st.lastStance && B.me.st.lastStance === sk.act);
        const cd = sk.inferno && B.me.st && B.me.st.infernoLock ? Math.max(1, B.me.st.infernoLock.until - (B.turn || 1) + 1) : null;   // 지옥전개 재사용 대기 = 다시 쓸 수 있을 때까지 남은 턴(지옥이 켜진 동안 포함)
        cardFront(g, x + shake, cy, CARD_W, CARD_H, sk, { can: show, short, lit, lock, left, halved, cd, shine: sh != null && sh < 1 ? sh : null });
      }
      if (live) input.hit(id, x, y, CARD_W, CARD_H, can ? () => { sfx('select'); this.pick(app, sk); } : () => { sfx('deny'); this.denyAt = { id, t: app.t }; }, 2, false, true);   // quiet = 누름 소리 대신 카드 제 소리
      this.cards[id] = { sk, x, y, w: CARD_W, h: CARD_H, can: show, short, lock, left: sk.uses ? usesLeft(B.me, sk) : null, halved: !!(B.me.st && B.me.st.lastStance === sk.act) };
    }
    const d = input.down;
    if (live && d && !d.moved && this.cards[d.id] && input.holdMs() >= HOLD_MS) this.openPeek(app, d.id);
    const pk = this.p && this.p.peek;   // 검토 촬영(?peek=기술 id&peekP=0~1): 그 카드를 꺼내 본 채로 멈춤
    if (pk && !this.peek && !this.peekShot && this.cards['sk_' + pk]) { this.peekShot = true; this.openPeek(app, 'sk_' + pk); this.peek.pin = true; this.peek.p = this.p.peekP != null ? +this.p.peekP : 1; }
  },
  // 꺼내 보기 시작: 앞·뒤 큰 그림을 기기 화소로 한 번 그려 둠(기본기는 단추 자리에서 작은 카드로 생겨남)
  openPeek(app, id) {
    sfx('flip');
    const { input, W } = app, ref = this.cards[id], k = app.g.c.getTransform().a || 1, foe = this.v.view.foe, sk = ref.sk;
    input.claimHold();
    const BW = Math.min(W - 100, 160), BH = Math.round(BW * CARD_H / CARD_W);
    const o = { can: ref.can, short: ref.short, lock: ref.lock, left: ref.left, halved: ref.halved, energy: this.v.en.me, foe: foe ? { name: foe.name, el: foe.el } : null, mult: sk.act === 'attack' && sk.el && foe ? elemMult(sk.el, foe.el) : 1 };
    this.peek = { id, sk, from: { x: ref.x, y: ref.y, w: ref.w, h: ref.h }, BW, BH, faces: renderFaces(sk, CARD_W, CARD_H, BW, BH, k, o), p: 0, last: app.t };
    app.g.rect(ref.x - 1, ref.y - 4, ref.w + 2, ref.h + 6, T.bg2); cardSlot(app.g, ref.x, ref.y, ref.w, ref.h);   // 이번 그림부터 손패 자리는 빈 자리
  },
  // 펼친 상대 카드(drawSpread) i번째를 누르면 가운데로 와서 뒤집혀 뒷면(설명) · 위에 '상대 · N턴'(3:3 = 쓴 식물 이름도) · 아무 데나 누르면 펼친 자리로
  openFoeCard(app, i, R) {
    const H0 = (this.v.foeHist || [])[i]; if (!H0 || !R) return;
    sfx('flip');
    const { W } = app, sk = H0.sk, k = app.g.c.getTransform().a || 1, me = this.v.view.me, BW = Math.min(W - 100, 160), BH = Math.round(BW * CARD_H / CARD_W);
    const o = { can: true, foe: me ? { name: me.name, el: me.el } : null, mult: sk.act === 'attack' && sk.el && me ? elemMult(sk.el, me.el) : 1 };   // 상대 카드의 '상대' = 나
    this.peek = { id: 'foe_card', hi: i, sk, from: { x: R[0], y: R[1], w: R[2], h: R[3] }, BW, BH, faces: renderFaces(sk, CARD_W, CARD_H, BW, BH, k, o), p: 0, last: app.t, tap: true, turn: H0.turn, who: this.mode === 'swap3' && H0.u ? H0.u.name : null };
  },
  // 상대 카드 더미(2026-10-29 사용자 '이전에 쓴 카드를 우측 상단에 겹친 카드더미처럼 싸이게 하고 누르면 쭉 볼 수 있게 하자'): 오른쪽 위 —
  //  맨 위 = 방금 쓴 카드(손패 카드를 줄인 그림 · 상대 색 테 · 반듯) · 그 밑에 전에 쓴 카드가 셋까지 저마다 조금씩 기울어 비껴 쌓임 · 왼쪽 아래 = 장 수
  //  새 카드 = 상대 식물에서 크게 돌며 날아와 더미 위에 톡 앉음(앞 카드는 한 칸 밑으로 내려앉으며 제 기울기로) → 돌려주는 값 = 누를 자리 [x, y, w, h]
  drawPile(app, hist, t) {
    const { g, W } = app, c = g.c, k = c.getTransform().a || 1, x = W - 8 - PILE_W, y = AY + 5, top = hist[0], n = hist.length, age = t - top.t0, q = Math.min(1, Math.max(0, age / PILE_IN)), e = 1 - (1 - q) ** 3, fly = q < 1;
    const card = (h, cx, cy, ang, s, dark, rim) => {   // 줄인 카드 한 장: 가운데 (cx, cy) · 기울기 · 크기 배수 · 그늘 · 테 색
      c.save(); c.translate(cx, cy); if (ang) c.rotate(ang); if (s !== 1) c.scale(s, s);
      rrect(g, -PILE_W / 2 + 1, -PILE_H / 2 + 2, PILE_W, PILE_H, 4, 'rgba(0,0,0,0.38)');
      if (rim) rrect(g, -PILE_W / 2 - 1, -PILE_H / 2 - 1, PILE_W + 2, PILE_H + 2, 5, rim);
      c.imageSmoothingEnabled = true; c.drawImage(this.spreadFace(h, k), -PILE_W / 2, -PILE_H / 2, PILE_W, PILE_H);
      if (dark) g.alpha(dark, () => rrect(g, -PILE_W / 2, -PILE_H / 2, PILE_W, PILE_H, 3, '#060a14'));
      c.restore();
    };
    const mx = x + PILE_W / 2, my = y + PILE_H / 2;
    for (let d = Math.min(3, n - 1); d >= 1; d--) {   // 밑 카드(깊은 것부터 · 날아오는 동안엔 한 칸 깊이로 내려앉는 중 — 바로 밑 카드는 반듯 → 제 기울기)
      const a = PILE_OFF[d], b = PILE_OFF[d - 1], s = fly ? e : 1, ang = pileTilt(hist[d].turn) * (d === 1 && fly ? e : 1);
      card(hist[d], mx + b[0] + (a[0] - b[0]) * s, my + b[1] + (a[1] - b[1]) * s, ang, 1, 0.12 + 0.12 * d, null);
    }
    if (fly) {   // 상대 식물 → 더미: 크게 시작해 돌며 줄어듦 · 살짝 위로 휨
      const [ex, ey] = this.at('foe'), fx = ex + Math.floor((W - 270) / 2), fy = ey - 56;
      c.save(); c.globalAlpha = Math.min(1, age / 90);
      card(top, fx + (mx - fx) * e, fy + (my - fy) * e - Math.sin(e * Math.PI) * 16, (1 - e) * -0.6, 2 - e, 0, '#ff9aa8');
      c.restore();
    } else {
      if (!top.landed) { top.landed = true; sfx('pileIn'); }
      const la = age - PILE_IN, bob = la < 140 ? Math.sin(la / 140 * Math.PI) : 0;   // 앉을 때 1칸 톡
      card(top, mx, my - bob, 0, 1, 0, '#ff9aa8');
      if (la < 300) g.alpha(0.85 * (1 - la / 300), () => { const X = x - 2, Y = Math.round(y - bob) - 2; g.rect(X, Y, PILE_W + 4, 1, '#fff0f3'); g.rect(X, Y + PILE_H + 3, PILE_W + 4, 1, '#fff0f3'); g.rect(X, Y, 1, PILE_H + 4, '#fff0f3'); g.rect(X + PILE_W + 3, Y, 1, PILE_H + 4, '#fff0f3'); });   // 앉은 순간 테가 반짝
    }
    const cnt = fly ? n - 1 : n;
    if (cnt > 0) {   // 장 수(왼쪽 아래 작은 알약)
      const bf = sized('bold', 9), num = String(cnt), bw = Math.max(11, g.textW(num, bf) + 6), bx = x - 5, by = y + PILE_H - 9;
      rrect(g, bx - 1, by - 1, bw + 2, 13, 4, INFO_C.ink); rrect(g, bx, by, bw, 11, 3, '#3a1a26');
      g.text(num, bx + bw / 2, by + Math.round((11 - glyphH(bf)) / 2), { font: bf, color: '#ffc2cc', align: 'center' });
    }
    return [x - 6, y - 3, PILE_W + 12, PILE_H + 12];
  },
  // 펼쳐 보기: 더미를 누르면 카드가 더미에서 한 장씩 튀어나와 세 칸씩 펼쳐짐(최근 = 왼쪽 위 · 카드 밑 = 쓴 턴) → 누르면 크게 뒤집어 설명(openFoeCard) ·
  //  닫기 · 빈 곳 = 더미로 다시 모임 · 넘치면 끌어서 넘김(onDrag) · 고르는 차례가 끝나면(시간 초과) 저절로 접힘
  openSpread(app) {
    if (this.spread || !(this.v.foeHist || []).length) return;
    sfx('spread'); this.spread = { t0: app.t, scroll: 0, max: 0 };
  },
  closeSpread(app) {
    const S = this.spread; if (!S || S.closing) return;
    sfx('gather'); S.closing = true; S.tc = app.t;
  },
  spreadFace(h, k) { if (!h.face || h.faceK !== k) { h.face = renderFront(h.sk, CARD_W, CARD_H, k, { can: true }); h.faceK = k; } return h.face; },   // 펼친 카드 앞면(기기 화소로 한 번)
  drawSpread(app) {
    const { g, W, H, input, t } = app, c = g.c, S = this.spread, v = this.v, hist = v.foeHist || [], n = hist.length, k = c.getTransform().a || 1, C = INFO_C, PINK = '#ff9aa8';
    if (!S.closing && (v.phase !== 'pick' || !n)) this.closeSpread(app);
    const COLS = 3, GX = 10, RH = CARD_H + 26, x0 = Math.round((W - (COLS * CARD_W + (COLS - 1) * GX)) / 2), headY = AY + 8, viewY = headY + 32, FOOT = 50, viewH = H - viewY - FOOT;
    S.max = Math.max(0, Math.ceil(n / COLS) * RH - 8 - viewH); S.scroll = Math.max(0, Math.min(S.max, S.scroll || 0));
    const op = S.closing ? 1 - Math.min(1, (t - S.tc) / SPREAD_OUT) : Math.min(1, (t - S.t0) / 160);
    if (S.closing && op <= 0) { this.spread = null; return; }
    c.fillStyle = `rgba(6,10,18,${(0.8 * op).toFixed(3)})`; c.fillRect(0, 0, W, H);
    input.hit('sp_block', 0, 0, W, H, () => this.closeSpread(app));
    g.alpha(op, () => {   // 머리: 분홍 알약 '상대가 쓴 카드 n장'
      const label = `상대가 쓴 카드 ${n}장`, lw = g.textW(label, 'bold') + 22, lx = Math.round((W - lw) / 2);
      rrect(g, lx - 1, headY - 1, lw + 2, 22, 7, C.ink); rrect(g, lx, headY, lw, 20, 6, '#3a1a26'); g.rect(lx + 6, headY, lw - 12, 1, PINK);
      g.text(label, W / 2, headY + Math.round((20 - glyphH('bold')) / 2), { font: 'bold', color: '#ffd6dc', align: 'center' });
    });
    const P = this.pileR ? [this.pileR[0] + 6 + PILE_W / 2, this.pileR[1] + 3 + PILE_H / 2] : [W - 8 - PILE_W / 2, AY + 5 + PILE_H / 2], s0 = PILE_W / CARD_W, bh = glyphH('bold');
    const cards = [];
    for (let i = 0; i < n; i++) {
      const sx = x0 + (i % COLS) * (CARD_W + GX), sy = viewY + Math.floor(i / COLS) * RH - S.scroll;
      if (sy + CARD_H + 22 < viewY - 6 || sy > viewY + viewH + 6) continue;   // 넘겨서 안 보이는 줄
      const q = S.closing ? Math.min(1, Math.max(0, (t - S.tc - Math.min(i, 8) * 8) / (SPREAD_OUT - 70))) : Math.min(1, Math.max(0, (t - S.t0 - Math.min(i, 11) * SPREAD_STAG) / SPREAD_IN));
      cards.push({ i, h: hist[i], sx, sy, q, e: S.closing ? 1 - q * q : backOut(q), still: !S.closing && q >= 1 });
    }
    const one = ({ i, h, sx, sy, q, e, still }) => {
      if (this.peek && this.peek.hi === i) { cardSlot(g, sx, sy, CARD_W, CARD_H); return; }   // 크게 꺼낸 카드의 자리
      const cx = P[0] + (sx + CARD_W / 2 - P[0]) * e, cy = P[1] + (sy + CARD_H / 2 - P[1]) * e, s = s0 + (1 - s0) * e, w = CARD_W * s, hh = CARD_H * s, x = Math.round(cx - w / 2), y = Math.round(cy - hh / 2);
      const tagA = (S.closing ? 1 - q : Math.min(1, Math.max(0, (q - 0.7) / 0.3))) * op;
      if (!i && tagA > 0) g.alpha(tagA, () => { rrect(g, x - 3, y - 3, Math.round(w) + 6, Math.round(hh) + 6, 8, 'rgba(255,154,168,0.28)'); rrect(g, x - 2, y - 2, Math.round(w) + 4, Math.round(hh) + 4, 7, 'rgba(255,154,168,0.7)'); });   // 방금 쓴 카드 = 분홍 테
      rrect(g, x + 2, y + 4, Math.round(w), Math.round(hh), 6, `rgba(0,0,0,${(0.42 * op).toFixed(3)})`);
      c.drawImage(this.spreadFace(h, k), x, y, w, hh);
      if (tagA > 0) g.alpha(tagA, () => {   // 쓴 턴(카드 밑) · 3:3 = 쓴 식물 얼굴도
        const label = i ? `${h.turn}턴` : `방금 · ${h.turn}턴`, face = this.mode === 'swap3' && h.u ? 15 : 0, lw = g.textW(label, 'bold') + 12 + face, lx = Math.round(sx + (CARD_W - lw) / 2), ly = sy + CARD_H + 6;
        rrect(g, lx - 1, ly - 1, lw + 2, 17, 6, C.ink); rrect(g, lx, ly, lw, 15, 5, i ? C.band : '#3a1a26');
        if (face) { c.save(); c.beginPath(); c.rect(lx + 2, ly + 1, 13, 13); c.clip(); drawPortrait(g, artOf(h.u), lx + 2, ly + 1, 13, true); c.restore(); }
        g.text(label, lx + face + (lw - face) / 2, ly + Math.round((15 - bh) / 2), { font: 'bold', color: i ? C.sub : PINK, align: 'center' });
      });
      if (still) { const y0 = Math.max(sy, viewY - 6), y1 = Math.min(sy + CARD_H, viewY + viewH + 6); if (y1 > y0) input.hit('sp_' + i, sx, y0, CARD_W, y1 - y0, () => this.openFoeCard(app, i, [sx, sy, CARD_W, CARD_H]), 2); }
    };
    c.save(); c.beginPath(); c.rect(0, viewY - 6, W, viewH + 12); c.clip();   // 자리 잡은 카드 = 보는 칸 안만
    for (const k2 of cards) if (k2.still) one(k2);
    c.restore();
    for (const k2 of cards) if (!k2.still) one(k2);   // 날아가는 카드 = 칸 밖으로도(더미 ↔ 자리)
    if (S.max > 0 && !S.closing) { const bar = Math.max(16, viewH * viewH / (viewH + S.max)), by = viewY + (viewH - bar) * (S.scroll / S.max); g.alpha(op, () => rrect(g, W - 6, Math.round(by), 3, Math.round(bar), 1, hexMix(C.line, C.ink, 0.4))); }
    c.save(); c.globalAlpha = op;
    button(app, 'sp_close', W / 2 - 50, H - FOOT + 12, 100, 28, '닫기', { style: 'night', onTap: () => this.closeSpread(app) });
    c.restore();
  },
  // 꺼내 본 카드: 잡고 있으면 화면 가운데로 다가오며(살짝 떠오름 · 그림자) 원근 있게 뒤집혀 뒷면, 손을 떼면 다시 뒤집혀 제자리로
  drawPeek(app) {
    const { g, W, H, input, t } = app, P = this.peek, c = g.c, k = c.getTransform().a || 1, dt = Math.min(50, Math.max(0, t - P.last));
    P.last = t;
    const holding = P.tap ? !P.closing : P.pin || input.holding;   // P.tap = 눌러서 연 카드(상대가 방금 쓴 카드 — 아무 데나 다시 누르면 닫힘)
    if (!P.pin) P.p = holding ? Math.min(1, P.p + dt / PEEK_OPEN) : Math.max(0, P.p - dt / PEEK_CLOSE);
    if (!holding && P.p <= 0) { this.peek = null; return; }
    const q = P.p, pos = 1 - (1 - q) ** 3, th = Math.PI * (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);
    c.fillStyle = `rgba(6,10,18,${(0.62 * pos).toFixed(3)})`; c.fillRect(0, 0, W, H);
    input.hit('peek_block', 0, 0, W, H, P.tap && P.p > 0.6 ? () => { P.closing = true; } : null);
    const F = P.from, fx = F.x + F.w / 2, fy = F.y + F.h / 2, tx = W / 2, ty = Math.round((AY + (this.lay ? this.lay.HY : H - PANEL_H)) / 2) + 4;
    const cx = fx + (tx - fx) * pos, cy = fy + (ty - fy) * pos - Math.sin(pos * Math.PI) * 14, w = F.w + (P.BW - F.w) * pos, h = F.h + (P.BH - F.h) * pos;
    const pw = Math.max(2, w * Math.abs(Math.cos(th)));   // 그림자 = 지금 보이는 폭만큼, 다가올수록 크게 번짐
    c.save(); c.shadowColor = `rgba(0,0,0,${(0.6 * pos).toFixed(3)})`; c.shadowBlur = 18 * k * pos; c.shadowOffsetY = 10 * k * pos;
    c.fillStyle = `rgba(0,0,0,${(0.25 * pos).toFixed(3)})`; c.fillRect(cx - pw / 2, cy - h / 2 + 3, pw, h - 6); c.restore();
    drawFlip(c, P.faces.front, P.faces.back, cx, cy, w, h, th);
    if (P.turn != null && pos > 0.6) {   // 상대 카드 기록: 언제 쓴 카드인지(카드 위 작은 표)
      const label = P.who ? `상대 ${P.who} · ${P.turn}턴` : `상대 · ${P.turn}턴`, lw = g.textW(label, 'bold') + 14, ly = Math.round(cy - h / 2 - 22);
      g.alpha(Math.min(1, (pos - 0.6) / 0.3), () => { rrect(g, Math.round(cx - lw / 2) - 1, ly - 1, lw + 2, 18, 6, '#0b1322'); rrect(g, Math.round(cx - lw / 2), ly, lw, 16, 5, '#3a1a26'); g.text(label, cx, ly + Math.round((16 - glyphH('bold')) / 2), { font: 'bold', color: '#ff9aa8', align: 'center' }); });
    }
  },
  // 턴 시작 공개(buildSteps 'reveal'): 내 카드 = 손패 자리(없으면 내 식물)에서, 상대 카드 = 상대 식물에서 엎어진 채 가운데로 → 상대 카드가 원근 있게 뒤집힘
  //  → 선공 = 금빛 테 + 큰 '선공' 표(튀어나옴) · 후공 = 작은 표 → 머묾 → 둘 다 각자 식물로 줄어들며 사라짐(그 식물이 기술을 씀)
  drawReveal(app, st) {
    const { g, W, t } = app, c = g.c, k = c.getTransform().a || 1, L = this.lay, v = this.v, age = Math.max(0, t - v.t0), ms = st.ms;
    if (!st.faces || st.faces.k !== k) {
      const BW = RV_W, BH = Math.round(RV_W * CARD_H / CARD_W), face = s => (s.swap ? renderSwapFront(s.unit, CARD_W, CARD_H, BW, BH, k, (g2, x, y, w) => drawPortrait(g2, artOf(s.unit), x, y, w, false)) : renderFaces(s, CARD_W, CARD_H, BW, BH, k, { can: true }).front);
      st.faces = { k, BW, BH, me: st.mine ? face(st.mine) : null, foe: st.theirs ? face(st.theirs) : null, down: st.theirs ? renderDown(CARD_W, CARD_H, BW, BH, k) : null };
      const ref = st.mine && this.cards && this.cards['sk_' + st.mine.id];
      st.from = ref ? [ref.x + ref.w / 2, ref.y + ref.h / 2, ref.w / BW] : null;
    }
    const F = st.faces, ox = Math.floor((W - 270) / 2), both = !!(st.mine && st.theirs), cy = Math.round(L.led + 8);
    const OUT0 = ms - RV_OUT, out = age > OUT0 ? Math.min(1, (age - OUT0) / RV_OUT) ** 2 : 0, bt = age - RV_BADGE;
    c.fillStyle = `rgba(6,10,18,${(0.55 * Math.min(1, age / 220) * (1 - out)).toFixed(3)})`; c.fillRect(0, AY, W, app.H - AY);   // 경기장 아래 끝까지만 덮으면 손패 카드 윗부분에 회색 경계선이 생김(2026-10-29 사용자 '카드 선택 후 선공판정시 이 부분에 회색 선') → 손패까지
    for (const who of ['foe', 'me']) {
      const sk = who === 'me' ? st.mine : st.theirs; if (!sk) continue;
      const [bx, by] = this.at(who), plant = [bx + ox, by - (who === 'me' ? 64 : 56)];   // 식물 몸 가운데쯤
      const start = who === 'me' && st.from ? st.from : [...plant, 0.3], tx = both ? Math.round(W / 2 + (who === 'me' ? -1 : 1) * (F.BW / 2 + 9)) : Math.round(W / 2);
      const qi = backOut(Math.min(1, age / RV_IN)), lead = st.first === who, up = lead && bt > 0 ? Math.round(5 * Math.min(1, bt / 160)) : 0;
      let cx = start[0] + (tx - start[0]) * qi, ccy = start[1] + (cy - start[1]) * qi - up, sc = start[2] + (1 - start[2]) * qi;
      if (out) { cx += (plant[0] - cx) * out; ccy += (plant[1] - ccy) * out; sc *= 1 - 0.7 * out; }
      const w = F.BW * sc, h = F.BH * sc, x = Math.round(cx - w / 2), y = Math.round(ccy - h / 2), al = Math.min(1, age / 110) * (1 - out);
      c.save(); c.globalAlpha = al;
      if (lead && bt > 0) { const gl = Math.min(1, bt / 200); rrect(g, x - 3, y - 3, Math.round(w) + 6, Math.round(h) + 6, 8, `rgba(255,200,60,${(0.5 * gl).toFixed(3)})`); rrect(g, x - 1, y - 1, Math.round(w) + 2, Math.round(h) + 2, 6, `rgba(255,236,170,${(0.95 * gl).toFixed(3)})`); }
      else rrect(g, x + 2, y + 4, Math.round(w), Math.round(h), 6, 'rgba(0,0,0,0.4)');
      if (who === 'foe' && age < RV_FLIP0 + RV_FLIP) drawFlip(c, F.foe, F.down, cx, ccy, w, h, Math.PI * (1 - easeInOut(Math.max(0, (age - RV_FLIP0) / RV_FLIP))));
      else c.drawImage(who === 'me' ? F.me : F.foe, x, y, w, h);
      if (!(who === 'foe' && age < RV_FLIP0 + RV_FLIP)) this.revealFx(g, sk, x, y, w, h);   // ㉥ 시안: 거는 효과 아이콘(앞면일 때)
      const u = v.view[who];
      if (u && !out && age > RV_IN) g.text(u.name, Math.round(cx), y + Math.round(h) + 5, { font: 'bold', color: '#e6f3ff', align: 'center', outline: T.ink, outlineW: 2 });   // 누구 카드인지(카드 아래 식물 이름)
      c.restore();
      if (st.first && bt > (lead ? 0 : RV_LAG)) { const q = Math.min(1, (bt - (lead ? 0 : RV_LAG)) / 200); this.orderBadge(g, Math.round(cx), y - 15, lead, lead ? 1 + 0.7 * (1 - backOut(q)) : 0.82 + 0.18 * backOut(q), Math.min(1, q * 2) * (1 - out)); }
    }
  },
  // ㉥ 시안(2026-10-29 사용자 '상대카드도 설명이 많아지면 읽을 시간이 부족할 거 같은데'): 공개 카드 그림 칸 아래쪽에 그 기술이 거는 효과 아이콘(최대 셋) — 글 대신 한눈에
  //  손패 카드의 위력 칸은 그대로(2026-10-16 사용자 '버프·디버프는 비워') · 공개 카드에만
  revealFx(g, sk, x, y, w, h) {
    const ics = fxIdsOf(sk).map(id => iconMid(STATUS[id].icon) || icon(STATUS[id].icon)).filter(Boolean);
    if (!ics.length) return;
    const s = w / RV_W, iw = 18, gap = 2, pw = ics.length * iw + (ics.length - 1) * gap + 8, ph = iw + 6, c = g.c;
    c.save(); c.translate(x + w / 2, y + h * 0.62); c.scale(s, s);
    rrect(g, Math.round(-pw / 2) - 1, Math.round(-ph / 2) - 1, pw + 2, ph + 2, 6, T.ink); rrect(g, Math.round(-pw / 2), Math.round(-ph / 2), pw, ph, 5, 'rgba(14,22,40,0.92)');
    ics.forEach((ic, i) => g.img(ic, Math.round(-pw / 2 + 4 + i * (iw + gap) + (iw - ic.width) / 2), Math.round(-ic.height / 2)));
    c.restore();
  },
  // 선공 · 후공 표: 선공 = 금빛 큰 표 · 후공 = 남색 작은 표, (cx, cy) 가운데 · s = 크기 배수(튀어나옴)
  orderBadge(g, cx, cy, first, s, al) {
    const c = g.c, txt = first ? '선공' : '후공', font = first ? 'name' : 'value', gh = glyphH(font), w = g.textW(txt, font) + (first ? 24 : 16), h = gh + (first ? 12 : 9);
    const P = first ? { ring: '#3a2408', fill: '#ffc83c', hi: '#fff4c8', lo: '#b8781c', text: '#3a2408' } : { ring: '#0b1322', fill: '#2a4961', hi: '#6c90a0', lo: '#10243a', text: '#e3e9ef' };
    c.save(); c.globalAlpha = al; c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
    const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
    rrect(g, x - 1, y - 1, w + 2, h + 2, 6, P.ring); rrect(g, x, y, w, h, 5, P.fill);
    g.rect(x + 4, y + 1, w - 8, 1, P.hi); g.rect(x + 4, y + h - 2, w - 8, 1, P.lo);
    g.text(txt, cx, y + Math.round((h - gh) / 2), { font, color: P.text, align: 'center' });
    c.restore();
  },
  // 위 띠: 턴 · 대회 이름(또는 3:3 · 친구 대결) · 판 점 · (친구 대결) 남은 시간
  topBar(app) {
    const { g, W, t } = app, v = this.v, I = this.info;
    g.rect(0, 0, W, AY, T.bg2); g.rect(0, AY - 2, W, 1, T.panel.frameLo); g.rect(0, AY - 1, W, 1, T.ink);
    // 기권 = 왼쪽 위 작은 깃발(2026-10-16 사용자 "기권은 상단 좌측에 작게 — 실수로 누를 수 없게"): 흐린 작은 단추 · 터치 여유 없음 · 누르면 확인 창
    const live = !app.confirm && !this.sheet && !this.info2 && !this.emoteOpen && !this.peek, canFlag = v.phase !== 'over', fdown = canFlag && app.input.isPressed('bt_flag');
    const fb = btnBody(g, 4, 3, 20, 18, T.btn.off, fdown);
    g.imgMid(tinted('flag', canFlag ? '#c9d6e8' : '#5a6a80'), 9, fb.top + fb.inner / 2);   // 판 가운데(2026-10-25 상자 속 가운데 — 눌림은 btnBody 가 내림)
    if (live && canFlag) app.input.hit('bt_flag', 4, 3, 20, 18, () => this.forfeit(app), 0);
    const tb = btnBody(g, 28, 3, 38, 18, T.btn.second, true);
    g.textMid(`${v.turn}턴`, 47, tb.top + tb.inner / 2, { font: 'bold', color: T.btn.second.text, align: 'center' });
    if (this.net === 'pvp') {
      g.text((this.mode === 'swap3' ? '친구 3:3' : '친구 대결') + (this.code ? ` · ${this.code}` : ''), W / 2, 6, { color: T.text.main, align: 'center' });
    } else if (this.mode === 'swap3') g.text('3:3 교체전', W / 2, 6, { color: T.text.main, align: 'center' });
    else {
      const title = I ? I.title : (this.p.title || '새싹 브론즈 IV · 예선'), wins = I ? I.wins : this.p.w != null ? +this.p.w : 1, losses = I ? I.losses : this.p.l != null ? +this.p.l : 0, nB = (I && I.bestOf) || +this.p.nB || 5;   // 7판(플래티넘부터 — 2026-10-22) · 촬영 = p.title · p.nB · p.w · p.l
      //  제목 = 턴 상자(28~66) 바로 옆에 왼쪽 정렬(2026-10-23 사용자 "1턴 옆의 글자를 왼쪽 정렬로 리그를 당겨") · 판 네모 = 크게 · 이긴 판 금색 ✓ · 진 판 빨강 ✕
      //  (같은 날 "네모박스의 승/패 기록은 좀더 키우고 확실하게") · 오른쪽 물음표 단추까지 안 들어가면 제목 글자를 한 단계씩 줄임
      const PS = nB > 5 ? 8 : 9, dots = nB * (PS + 2) - 2, L0 = 72, R0 = W - 26;
      let f = 'body', tw = g.textW(title, f);
      for (let z = 10; L0 + tw + 6 + dots > R0 && z >= 8; z--) { f = sized('body', z); tw = g.textW(title, f); }
      g.text(title, L0, f === 'body' ? 6 : 7, { font: f, color: T.text.main });
      const x0 = L0 + Math.ceil(tw) + 6, py = Math.floor((AY - 2 - PS) / 2);
      for (let i = 0; i < nB; i++) roundPip(g, x0 + i * (PS + 2), py, PS, i < wins ? 'win' : i < wins + losses ? 'lose' : 'none');
    }
  },
  // 기타 단추 줄(2026-10-16 사용자 "빈 아래 칸에 각종 기타 버튼"): 교체(3:3) · 감정 — 손패 카드 칸에 맞춤(2026-10-17 사용자 "감정 버튼을 식물 카드의 폭에 맞추고 우측선이 맞게 ·
  //  3:3 교체 버튼도 — 아래 버튼이 전투 카드 3장의 폭과 맞게"): 감정 = 맨 오른쪽 카드 한 장 폭 · 3:3 교체 칸 = 그 왼쪽 카드들 폭(왼쪽 끝선 = 손패 왼쪽 끝선)
  miscRow(app, y, live, rx0 = null) {
    const { W } = app, B = this.B, v = this.v, side = rx0 != null, sw = side ? W - 8 - rx0 : 0, G = handGeo(W, B.me.kit), ex = G.x0 + (G.per - 1) * (G.CW + G.GX);
    if (this.mode === 'swap3') {
      const wait = swapWait(B, 'me'), can = v.phase === 'pick' && aliveOf(B, 'me').length > 1 && canSwitch(B.me) && !wait;   // 교체 제한(스스로 바꾸면 2턴 — 2026-10-18)
      this.teamTile(app, 'bt_swap', side ? rx0 : G.x0, side ? y + 8 : y, side ? sw : ex - G.GX - G.x0, 32, can, !canSwitch(B.me), live && can ? () => { this.sheet = { forced: false }; } : null);
    }
    if (side) {   // 아래 줄 오른쪽: (3:3 팀 칸) · 감정 — 같은 폭
      const ey = this.mode === 'swap3' ? y + 48 : y + 29;
      button(app, 'bt_emote', rx0, ey, sw, 32, '감정', { style: 'night', icon: 'heart', iconTint: true, onTap: live ? () => { this.emoteOpen = true; } : null });
      return;
    }
    // 감정 = 맨 오른쪽 카드 밑(3:3이든 1:1이든 같은 자리) — '효과' 단추는 뺌(체력판 · 효과 창을 누르면 설명)
    button(app, 'bt_emote', ex, y, G.CW, 32, '감정', { style: 'night', icon: 'heart', iconTint: true, onTap: live ? () => { this.emoteOpen = true; } : null });
  },
  // 3:3 팀 칸 = 교체 단추(2026-10-16 사용자 "3:3에서 남은 수를 표시하는 네모 박스 등은 아래의 교체 칸에 적절한 방식으로 새로 UI 만들어서 붙여놔"):
  //  ⇄(뿌리 묶이면 자물쇠) · 내 식물 셋 얼굴(앞에 선 식물 = 주황 테, 아래 체력 실선, 쓰러짐 = 흐리게 + ✕) | '상대' + 남은 칸 셋(누군지는 안 보임) — 누르면 교체 창
  //  앞에 선 두 식물의 체력·쓰러짐은 연출 중 숫자(v.hp)를 따라감(판정이 끝나기 전에 미리 알리지 않게)
  teamTile(app, id, x, y, w, h, can, bound, fn) {
    const { g, input } = app, B = this.B, v = this.v, st = T.btn[can ? 'second' : 'off'], down = !!fn && input.isPressed(id);
    const { yy } = btnBody(g, x, y, w, h, st, down), cy = yy + Math.floor((h - 2) / 2), acc = UI_ACCENT[UI] || '#f0be7d';
    const hpOf = (side, u) => (u === v.view[side] ? v.hp[side] : u.hp), hpCol = r => (r > 0.5 ? '#5fe08a' : r > 0.2 ? '#f0be7d' : '#ff6a5a');
    let cx = x + Math.max(7, Math.round((w - 100) / 2));   // 속 = 교체 칸 22 + 얼굴 셋(100칸) — 넓은 칸(카드 두 장 폭)이면 가운데로
    const wait = swapWait(B, 'me'), ic = tinted(bound ? 'lock' : wait ? 'clock' : 'ff', st.text), lab = bound ? '묶임' : wait ? `${wait}턴` : '교체';   // 왼쪽 칸 = 아이콘 위 · 이름 아래(교체 제한 = 시계 · 남은 턴)
    g.img(ic, cx + 11 - Math.floor(ic.width / 2), cy - 12); g.text(lab, cx + 11, cy + 1, { color: st.text, align: 'center' }); cx += 22 + 6;
    B.team.me.forEach((u, i) => {
      const sx = cx + i * 25, sy = cy - 13, on = u === v.view.me, hp = hpOf('me', u), dead = hp <= 0, r = Math.max(0, hp / u.max);
      rrect(g, sx, sy, 22, 22, 3, on && !dead ? acc : '#08111e');
      rrect(g, sx + 1, sy + 1, 20, 20, 2, dead ? '#121a26' : '#1a2c46');
      g.alpha(dead ? 0.3 : 1, () => g.clip(sx + 1, sy + 1, 20, 20, () => drawPortrait(g, artOf(u), sx + 1, sy + 1, 20, false, 40)));   // 얼굴 전체(40칸 → 20칸)
      if (dead) for (let k = 0; k < 9; k++) { g.rect(sx + 6 + k, sy + 6 + k, 2, 1, '#ff6a5a'); g.rect(sx + 14 - k, sy + 6 + k, 2, 1, '#ff6a5a'); }
      g.rect(sx + 1, sy + 23, 20, 2, '#08111e');
      if (!dead) g.rect(sx + 1, sy + 23, Math.max(1, Math.round(20 * r)), 2, hpCol(r));
    });
    // 상대 남은 칸은 상대 체력판 윗줄로 옮김(2026-10-16 사용자)
    if (fn) input.hit(id, x, y, w, h, fn, 4);
  },
  // 친구 대결 감정 표현: 보낸 쪽 식물 위에 작은 전광판(2.6초)
  // 감정 표현: 보낸 쪽 식물 머리 위 말풍선(친구 대결 = 서버 알림, 봇 판 = 이 화면에서 + 봇이 가끔 대답) · 상대 끄기면 상대 것은 안 그림
  drawEmotes(app) {
    const { g } = app, now = performance.now(), list = [...(this.net === 'pvp' && app.room ? app.room.emotes : []), ...this.localEmotes];
    for (const side of [false, true]) {   // 사람마다 가장 최근 하나만
      if (!side && this.muteFoe) continue;
      const e = list.filter(x => !!x.me === side && now >= x.t && now - x.t < EMOTE_LIFE).pop();
      if (e) emoteBubble(g, e.i, ...this.above(side ? 'me' : 'foe', side ? 104 : 98), now - e.t);
    }
  },
  sendEmote(app, i) {
    sfx('emote');
    this.emoteOpen = false;
    const now = performance.now();
    if (now - this.emoteT < EMOTE_CD) return;
    this.emoteT = now;
    if (this.net === 'pvp') { R.emote(i).catch(() => {}); return; }
    this.localEmotes.push({ i, me: true, t: now });
    if (Math.random() < 0.45 && BOT_REPLY[i] != null) this.localEmotes.push({ i: BOT_REPLY[i], me: false, t: now + 900 + Math.random() * 700 });   // 봇이 가끔 대답
    this.localEmotes = this.localEmotes.filter(x => now - x.t < EMOTE_LIFE * 2);
  },
  fxTarget() { const R = this.fxR || {}; return R.foe || R.me || R.envFoe || R.envMe || null; },   // 처음 안내가 가리킬 효과 표시(상대 체력바 밑 칸 먼저)
  statuses(side) {
    const v = this.v, u = v.view[side], out = [], sv = v.stance[side];
    if (sv && sv.active) out.push({ id: sv.kind === 'guard' ? 'guard' : sv.kind === 'reflect' ? 'reflect' : 'evade' });
    if (u && u.st && u.st.nextInit) out.push({ id: 'initReady' });
    for (const x of (v.eff && v.eff[side]) || []) if (!(STATUS[x.id] || {}).env) out.push(x);   // 환경은 환경 띠로(envs)
    if (this.p && this.p.status) out.push(...(side === 'me' ? [{ id: 'guard' }, { id: 'aim' }, { id: 'atkUp', n: 2 }, { id: 'stun' }] : [{ id: 'burn' }, { id: 'poison', n: 2 }, { id: 'wet' }, { id: 'chill', n: 2 }, { id: 'spore', n: 3, t: 1 }, { id: 'seal' }]));
    return out.sort((a, b) => ((STATUS[b.id] || {}).buff ? 1 : 0) - ((STATUS[a.id] || {}).buff ? 1 : 0));
  },
  // 그 편에 켜진 환경(강풍 등 — 환경 띠 · 효과 설명 창) · 검토 촬영(?status=1)은 양쪽 강풍
  envs(side) {
    const v = this.v, me = v.view[side], out = ((v.eff && v.eff[side]) || []).filter(x => (STATUS[x.id] || {}).env && !(x.id === 'morning' && x.by && me && x.by !== me.id));   // 아침 띠 = 켠 프로스트벨 쪽만(2026-10-29 — 다른 쪽엔 하는 일이 없는데 띠가 생겨 내게 걸린 것처럼 보였음)
    if (this.p && this.p.status) out.push({ id: 'gale', exp: v.turn + 1 });
    return out;
  },
  // 경기장에 그릴 환경(㉠ fieldfx): 띠와 달리 아침도 양쪽 · 지금 깔리는 중인 것(조각이 아직 안 꽂힘)도
  fieldEnvs(t) {
    const v = this.v, out = {};
    for (const side of ['me', 'foe']) {
      const list = ((v.eff && v.eff[side]) || []).filter(x => (STATUS[x.id] || {}).env);
      for (const a of v.arrive) if ((a.who === side || a.id === 'morning' || a.id === 'night') && t - a.t0 >= 0 && t - a.t0 < 2600 && !list.some(x => x.id === a.id)) list.push({ id: a.id, n: a.n });
      out[side] = list;
    }
    v.arrive = v.arrive.filter(a => t - a.t0 < 4000);
    return out;
  },
  // 환경 띠가 생기거나 걷힐 때 체력판이 미끄러지는 값(0 ↔ ENV_H + 2)
  slide(side, to, t) {
    const S = this.v.envSlide || (this.v.envSlide = {}), at = s => s.from + (s.to - s.from) * (1 - (1 - Math.min(1, (t - s.t0) / 280)) ** 3);
    let s = S[side];
    if (!s) s = S[side] = { from: to, to, t0: t };
    if (s.to !== to) { s.from = at(s); s.to = to; s.t0 = t; }
    return at(s);
  },
  // 효과 창 칸 자리(statusWins 와 같은 배치) — i번째 칸 [x, y, 폭]
  chipRect(side, i) {
    const G = this.geo && this.geo[side]; if (!G) return null;
    const c = i % 3, w = c === 2 ? BOX_W - 2 * (SW_W + SW_GAP) : SW_W;
    return [G.x + c * (SW_W + SW_GAP), G.y + (G.up ? -1 : 1) * Math.floor(i / 3) * (SW_H + 2), w];
  },
  // 조각이 꽂히는 때: 그 편 효과 목록을 그 사건 때 것으로(더 뒤 단계가 이미 바꿨으면 그대로) · 칸 반짝 · 딸깍
  landTokens(t) {
    const v = this.v;
    for (const k of v.tok) {
      if (k.done || t - k.t0 < TOK_FLY[1]) continue;
      k.done = true;
      if (k.list && k.seq > (v.effSeq[k.side] ?? -1)) { v.eff[k.side] = k.list; v.effSeq[k.side] = k.seq; }
      v.flash.push({ side: k.side, id: k.id, env: k.env, t0: t });
      sfx('land');
    }
    v.tok = v.tok.filter(k => !k.done || t - k.t0 < 2000);
    v.flash = v.flash.filter(f => t - f.t0 < FLASH_MS);
  },
  // 효과 조각: [아이콘 이름](환경 = 띠 모양) — 머리 위(환경 = 그 땅)에서 톡 → 머묾 → 칸 · 띠 자리로 휘어 날아감
  drawTokens(app) {
    const { g, t, W } = app, v = this.v, ox = Math.floor((W - 270) / 2);
    for (const k of v.tok) {
      const age = t - k.t0; if (k.done || age < 0) continue;
      const G = this.geo && this.geo[k.side]; if (!G) continue;
      if (!k.from) { const [x, y] = k.env ? this.at(k.side) : this.above(k.side, 92); k.from = [ox + x - (k.env ? 30 : SW_W >> 1), y - (k.env ? 12 : 4)]; }
      let to;
      if (k.env) to = G.band;
      else { const i = Math.min(5, ((x => (x < 0 ? G.list.length : x))(G.list.findIndex(s => s.id === k.id)))), r = this.chipRect(k.side, i); to = r ? [r[0], r[1]] : k.from; }
      const pop = Math.min(1, age / TOK_POP), u = Math.max(0, Math.min(1, (age - TOK_FLY[0]) / (TOK_FLY[1] - TOK_FLY[0]))), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      const y0 = k.from[1] - 6 * pop, x = Math.round(k.from[0] + (to[0] - k.from[0]) * e), y = Math.round(y0 + (to[1] - y0) * e - Math.sin(Math.PI * e) * 16);   // 톡 6칸 솟음 → 위로 휘며 칸 자리로
      g.alpha(Math.min(1, age / 90), () => (k.env ? envBand(g, x, y, 0, [{ id: k.id, exp: null }], v.turn) : statusWins(g, x, y, [{ id: k.id, n: k.n }], 1)));
    }
  },
  // 꽂힌 칸 · 띠가 흰 테로 한 번 반짝(0.48초)
  drawFlash(app) {
    const { g, t } = app, v = this.v;
    for (const f of v.flash) {
      const k = (t - f.t0) / FLASH_MS, G = this.geo && this.geo[f.side]; if (!G || k >= 1) continue;
      let r;
      if (f.env) r = [G.bandNow[0], G.bandNow[1], BOX_W, ENV_H];   // 띠가 미끄러져 들어오는 동안 그 자리를 따라감
      else { const i = G.list.findIndex(s => s.id === f.id); if (i < 0 || i > 5) continue; const c = this.chipRect(f.side, i); r = [c[0], c[1], c[2], SW_H]; }
      const grow = Math.round(k * 3);
      g.alpha((1 - k) * 0.95, () => { g.frame(r[0] - 1 - grow, r[1] - 1 - grow, r[2] + 2 + grow * 2, r[3] + 2 + grow * 2, '#ffffff'); });
      g.alpha((1 - k) * 0.35, () => g.rect(r[0], r[1], r[2], r[3], '#ffffff'));
    }
  },
  // 교체 창: 내 식물 셋 — 앞에 선 식물·쓰러진 식물은 못 고름, 쓰러진 자리를 채울 땐 닫기 없음
  swapSheet(app) {
    const { g, W, H, input } = app, B = this.B, forced = this.sheet.forced, P = T.ptext;
    const x = 8, w = W - 16, h = 3 * 50 + (forced ? 44 : 76), y = H - h - 8;
    g.c.fillStyle = 'rgba(6,10,18,0.6)'; g.c.fillRect(0, 0, W, H);
    input.hit('sw_block', 0, 0, W, H, () => {});
    plate(g, x, y, w, h);
    g.text(forced ? '다음에 내보낼 식물' : '교체할 식물', x + 12, y + 10, { font: 'head', color: P.main });
    if (forced && this.net === 'pvp' && this.deadline) { const sec = Math.max(0, Math.ceil((this.deadline - net.now()) / 1000)); g.text(`${sec}초`, x + w - 12, y + 12, { font: 'bold', color: sec <= 5 ? '#ff8a7a' : P.sub, align: 'right' }); }   // 넘기면 서버가 살아 있는 첫 식물로
    B.team.me.forEach((u, i) => {
      const ry = y + 34 + i * 50, on = i === B.act.me, dead = u.hp <= 0, can = !on && !dead && this.v.phase !== 'wait', id = 'sw_' + i, down = can && input.isPressed(id);
      const S = can ? T.btn.second : T.btn.off, { yy } = btnBody(g, x + 8, ry, w - 16, 44, S, down);
      plate(g, x + 13, yy + 4, 34, 34, 'deep');
      g.clip(x + 15, yy + 6, 30, 30, () => drawPortrait(g, artOf(u), x + 14, yy + 5, 32, false));
      g.text(u.name, x + 54, yy + 5, { font: 'bold', color: S.text });
      idTag(g, x + 54 + g.textW(u.name, 'bold') + 5, yy + 4, u, false);   // 정체 꼬리표(속성 | 종 | 변이)
      tbar(g, x + 54, yy + 24, 110, 6, u.hp / u.max, 'hp');
      g.text(`${Math.ceil(u.hp)}/${u.max}`, x + 170, yy + 21, { color: S.text });
      if (on || dead) g.text(dead ? '쓰러짐' : '싸우는 중', x + w - 18, yy + 5, { color: dead ? T.text.dim : '#8ccfff', align: 'right' });   // 쓰러진 자리를 채울 땐 앞 식물도 '쓰러짐'
      if (B.ownSun && !dead) sunPips(g, x + w - 18 - (u.energyMax || 8) * 5, yy + 24, u.energy, u.energyMax || 8, 5, 0);   // 햇빛 식물마다 따로(2026-10-22) — 대기석 식물은 그대로라 누가 햇빛을 모았는지 보임
      if (can) input.hit(id, x + 8, ry, w - 16, 44, () => this.pickSwitch(app, i));
    });
    if (!forced) button(app, 'sw_close', x + w / 2 - 50, y + h - 36, 100, 28, '닫기', { style: 'night', onTap: () => { this.sheet = null; } });
  },
  // 효과 설명 창(2026-10-29 사용자 '설명창은 묶되 ui가 너무 별로임 예쁘게 다듬어봐' → '내걸 누르면 내거만. 상대걸 누르면 상대것만'): 누른 쪽 식물 하나만
  //  머리 = 그 식물 얼굴 · 이름 · '상대 식물/내 식물 · 걸린 효과 n개' → 분류(상태이상 · 약화 · 강화 · 환경)마다 머리글 → 효과 줄 [아이콘 칸][이름 · 겹](환경 = 오른쪽에 남은 턴) / 설명(줄바꿈)
  //  카드 뒷면과 같은 남색 판 · 열 때 0.16초에 떠오름 · 넘치면 끌어서 넘김(onDrag)
  infoSheet(app) {
    const { g, W, H, input } = app, C = INFO_C, rows = [], turn = this.v.turn, side = this.info2 === 'me' ? 'me' : 'foe', u = this.v.view[side];
    for (const st of this.statuses(side)) rows.push({ side, st });
    for (const st of this.envs(side)) rows.push({ side, st, env: true });
    const mine = side === 'me' ? ((u && u.cards) || []).filter(id => CARDS[id] && CARDS[id].kind === 'passive') : [];   // 내 카드 패시브(2026-10-17 — 상대 카드는 친구 대결에서 안 보임)
    const x = 8, w = W - 16, cx0 = x + 10, cw = w - 20, tx = cx0 + 33, tw = cw - 41, HEAD = 48, FOOT = 46, sideCol = side === 'me' ? '#8ccfff' : '#ff9aa8';
    const catOf = r => (r.env ? 'env' : (STATUS[r.st.id] || {}).buff ? 'buff' : STAT_DOWN.has(r.st.id) ? 'down' : 'ail');
    const groups = INFO_CATS.map(k => ({ ...k, items: rows.filter(r => catOf(r) === k.id) })).filter(G => G.items.length);
    for (const r of rows) { r.lines = wrap(STATUS_DESC[r.st.id] || '', 'body', tw); r.h = r.lines.length ? 28 + r.lines.length * 14 : 32; }
    const content = groups.reduce((s, G) => s + 20 + G.items.reduce((a, r) => a + r.h + 4, 0) + 6, 0) + (mine.length ? 58 : 0) || 40;
    const h = Math.min(H - 70, HEAD + content + FOOT), y = Math.round((H - h) / 2), viewY = y + HEAD, viewH = h - HEAD - FOOT;
    this.infoMax = Math.max(0, content - viewH); this.infoScroll = Math.max(0, Math.min(this.infoMax, this.infoScroll || 0));
    const op = Math.min(1, (app.t - (this.infoT0 ?? -1e9)) / 160), oe = 1 - (1 - op) ** 3, c = g.c;   // 열 때 떠오름(0.16초)
    c.fillStyle = `rgba(6,10,18,${(0.72 * oe).toFixed(3)})`; c.fillRect(0, 0, W, H);
    input.hit('in_block', 0, 0, W, H, () => { this.info2 = false; });
    c.save(); c.globalAlpha = oe; c.translate(0, Math.round((1 - oe) * 12));
    // 판: 먹선 → 남색 몸 → 위 머리띠(더 짙게) · 위 테 = 누른 쪽 색 한 줄(상대 = 분홍 · 나 = 하늘)
    rrect(g, x - 1, y - 1, w + 2, h + 2, 9, C.ink); rrect(g, x, y, w, h, 8, C.body);
    rrect(g, x + 1, y + 1, w - 2, HEAD - 1, 7, C.band); g.rect(x + 1, y + HEAD - 1, w - 2, 1, C.ink);
    g.rect(x + 8, y + 1, w - 16, 1, sideCol);
    // 머리: 식물 얼굴(둥근 칸) · 이름 · 누구 식물 · 걸린 효과 수
    const fx0 = x + 8, fy0 = y + 7, FS = 34;
    rrect(g, fx0 - 1, fy0 - 1, FS + 2, FS + 2, 7, C.ink); rrect(g, fx0, fy0, FS, FS, 6, hexMix(sideCol, C.ink, 0.78)); g.rect(fx0 + 4, fy0, FS - 8, 1, hexMix(sideCol, C.ink, 0.3));
    if (u) { c.save(); c.beginPath(); c.rect(fx0 + 1, fy0 + 1, FS - 2, FS - 2); c.clip(); drawPortrait(g, artOf(u), fx0 + 1, fy0 + 1, FS - 2, side === 'foe'); c.restore(); }
    const nx = fx0 + FS + 8;
    g.text(u ? u.name : '', nx, y + 9, { font: 'head', color: C.text });
    g.text(`${side === 'me' ? '내 식물' : '상대 식물'} · 걸린 효과 ${rows.length}개`, nx, y + 29, { color: sideCol });
    c.beginPath(); c.rect(x + 1, viewY, w - 2, viewH); c.save(); c.clip();
    let yy = viewY + 8 - this.infoScroll;
    if (!rows.length) g.text('걸린 효과 없음', W / 2, yy + 8, { color: C.sub, align: 'center' });
    const bh = glyphH('bold'), body = glyphH('body');
    for (const G of groups) {
      // 머리글: 분류 색 알약 + 오른쪽으로 옅은 줄
      const pw = g.textW(G.name, 'bold') + 12;
      rrect(g, cx0, yy, pw, 15, 4, hexMix(G.col, C.ink, 0.72)); g.rect(cx0 + 3, yy, pw - 6, 1, hexMix(G.col, C.ink, 0.35));
      g.text(G.name, cx0 + 6, yy + Math.round((15 - bh) / 2), { font: 'bold', color: G.col });
      g.alpha(0.35, () => g.rect(cx0 + pw + 6, yy + 7, cw - pw - 6, 1, G.col));
      yy += 20;
      for (const r of G.items) {
        const D = STATUS[r.st.id] || { name: r.st.id }, col = G.id === 'buff' ? C.line : D.col || G.col;
        rrect(g, cx0, yy, cw, r.h, 6, C.plate); g.rect(cx0 + 6, yy, cw - 12, 1, hexMix(col, C.plate, 0.6));
        rrect(g, cx0 + 5, yy + 5, 22, 22, 5, hexMix(col, C.ink, 0.62)); g.rect(cx0 + 8, yy + 5, 16, 1, hexMix(col, C.ink, 0.25));
        const ic = D.icon ? iconMid(D.icon) || icon(D.icon) : null;
        if (ic) g.img(ic, cx0 + 5 + Math.round((22 - ic.width) / 2), yy + 5 + Math.round((22 - ic.height) / 2));
        g.text(D.name, tx, yy + 7, { font: 'bold', color: col });
        if (D.stack && r.st.n > 1) g.text(`${Math.min(r.st.n, D.stack)}겹`, tx + g.textW(D.name, 'bold') + 5, yy + 7 + bh - body, { color: C.sub });
        if (r.env && r.st.exp != null) g.text(`${Math.max(1, r.st.exp - turn + 1)}턴 남음`, cx0 + cw - 8, yy + 7 + bh - body, { font: 'bold', color: col, align: 'right' });
        r.lines.forEach((ln, i) => g.text(ln, tx, yy + 23 + i * 14, { color: C.sub }));
        yy += r.h + 4;
      }
      yy += 6;
    }
    if (mine.length) {   // 내 카드(패시브): 같은 모양 머리글 + 작은 카드 · 이름
      const pw = g.textW('내 카드', 'bold') + 12;
      rrect(g, cx0, yy, pw, 15, 4, hexMix(C.gold, C.ink, 0.72)); g.text('내 카드', cx0 + 6, yy + Math.round((15 - bh) / 2), { font: 'bold', color: C.gold });
      g.alpha(0.35, () => g.rect(cx0 + pw + 6, yy + 7, cw - pw - 6, 1, C.gold));
      yy += 22; let cx = cx0;
      for (const id of mine) { cardTiny(g, cx, yy, cardFace(id)); g.text(CARDS[id].name, cx + 24, yy + 9, { color: C.text }); cx += 32 + g.textW(CARDS[id].name); }
    }
    c.restore();
    if (this.infoMax > 0) {   // 넘칠 때: 오른쪽 가는 막대 + 아래 끝 그늘
      const bar = Math.max(16, viewH * viewH / (viewH + this.infoMax)), by = viewY + (viewH - bar) * (this.infoScroll / this.infoMax);
      rrect(g, x + w - 5, Math.round(by), 3, Math.round(bar), 1, hexMix(C.line, C.ink, 0.4));
    }
    g.rect(x + 8, y + h - FOOT, w - 16, 1, hexMix(C.line, C.body, 0.75));
    button(app, 'in_close', W / 2 - 50, y + h - 37, 100, 28, '닫기', { style: 'night', onTap: () => { this.info2 = false; } });
    c.restore();   // 떠오름(globalAlpha · translate)
  },
  onDrag(dy) {   // 넘칠 때 끌어서 넘김: 펼친 상대 카드(크게 꺼내 보는 중엔 그대로) · 효과 설명 창
    const S = this.spread;
    if (S && !S.closing && !this.peek) S.scroll = Math.max(0, Math.min(S.max || 0, (S.scroll || 0) - dy));
    else if (this.info2) this.infoScroll = Math.max(0, Math.min(this.infoMax || 0, (this.infoScroll || 0) - dy));
  },
  // 감정 고르는 판(클래시 로얄식): 위 = 이모지 4×2, 아래 = 대사 3×2, 오른쪽 위 = 상대 감정 끄기. 보낸 뒤 3초는 못 보냄
  emoteSheet(app) {
    const { g, W, H, input } = app, P = T.ptext, x = 8, w = W - 16, h = 182, y = H - h - 46, cool = performance.now() - this.emoteT < EMOTE_CD;
    g.c.fillStyle = 'rgba(6,10,18,0.5)'; g.c.fillRect(0, 0, W, H);
    input.hit('em_block', 0, 0, W, H, () => { this.emoteOpen = false; });
    plate(g, x, y, w, h);
    g.text('감정 표현', x + 12, y + 10, { font: 'head', color: P.main });
    button(app, 'em_mute', x + w - 104, y + 7, 92, 22, this.muteFoe ? '상대 감정 켜기' : '상대 감정 끄기', { style: 'night', font: 'body', onTap: () => { this.muteFoe = !this.muteFoe; } });
    const ew = Math.floor((w - 24 - 18) / 4);
    EMOJI.forEach((k, j) => {
      const i = PHRASES.length + j, bx = x + 12 + (j % 4) * (ew + 6), by = y + 36 + Math.floor(j / 4) * 46, id = 'em_' + i, down = !cool && input.isPressed(id);
      const { top, inner } = btnBody(g, bx, by, ew, 42, cool ? T.btn.off : T.btn.second, down);
      g.alpha(cool ? 0.45 : 1, () => drawEmoji(g, k, bx + Math.round((ew - 30) / 2), Math.round(top + inner / 2 - 15), 2));   // 판 가운데(2026-10-25)
      if (!cool) input.hit(id, bx, by, ew, 42, () => this.sendEmote(app, i), 1);
    });
    const pw = Math.floor((w - 24 - 12) / 3);
    PHRASES.forEach((t, i) => button(app, 'em_' + i, x + 12 + (i % 3) * (pw + 6), y + 132 + Math.floor(i / 3) * 24, pw, 21, t, { style: 'night', font: 'body', disabled: cool, onTap: cool ? null : () => this.sendEmote(app, i) }));
  },
};
