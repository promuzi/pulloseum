// 카드(2026-10-17 사용자 결정 — "일반과 변이 모두 2개의 카드를 더 추가할 수 있음 · 일반 애들은 2개의 카드에 패시브를 넣는 거임 · 변이 애들은 변이 카드만 넣을 수 있음.
//  물론 거기에 스킬이 되는 카드도 있지만 · 변이 애들의 패시브와 스킬 모두 특이한 게 많지만 단순 스펙을 올리는 수치는 높지 않아서 깡스탯으로 승부 보는 애들은 일반 변이가 좋은 거지" ·
//  "태생 변이는 남은 4칸도 변이 카드를 섞어 쓸 수 있게"(허락) · "변이 카드는 강화 없애고 수를 늘리자 — 불 속성 공격도 있고 물도 있고, 다 만들지 말고 어울리는 거와 연결해서"):
//  모든 식물 = 기술 칸 넷 + 카드 칸 둘. 일반 식물('일반 변이') = 일반 카드(능력치를 크게 올리는 패시브)만 · 변이 식물 = 그 변이의 카드만(특이한 패시브 + 기술이 되는 카드, 능력치는 조금) ·
//  태생 변이(SPECIES.form)는 기술 칸 넷에도 그 변이의 기술 카드를 넣을 수 있음.
//  카드는 물건 — 가방 s.cards = { 카드 id: 장 수 }, 끼우면 가방에서 빠지고 빼면 돌아옴(식물을 팔거나 해체해도 돌아옴). 기술 카드 id = 그 변이 기술 id(catalog SKILLS tier 'm').
//  수치는 시제품 — 밸런스는 나중에(사용자). 효과 계산 = battle/rules.js · status.js 의 u.pas(전투 유닛에 실린 패시브 합).
import { SKILLS, FORMS, FORM_KEYS } from './catalog.js';

export const CARD_SLOTS = 3, PASS_STORE = 3;   // 패시브 장착 셋 · 패시브 보관 셋(변이 식물의 그 변이 패시브만 — 2026-10-18 사용자 "패시브 3개로 · 보관(변이 패시브만) 3칸", 전엔 장착 둘)
export const NORMAL_LOOK = { name: '일반', col: '#5fb3d9', light: '#d8f2ff' };   // 일반 카드 색(변이 카드는 그 변이 색)
// badge = 카드 앞면 오른쪽 위 수치 [글자, 아이콘], desc = 뒷면 설명 줄, rar = 보상 칸 테 색(1 초록 · 2 파랑 · 3 보라), w = 뽑힐 무게(일반 카드끼리)
const N = (id, name, icon, rar, w, pas, badge, desc) => ({ id, name, icon, rar, w, form: null, kind: 'passive', pas, badge, desc });
const V = (id, form, name, icon, pas, badge, desc) => ({ id, name, icon, rar: 3, w: 1, form, kind: 'passive', pas, badge, desc });
const LIST = [
  // ── 일반 카드(일반 식물만 — 깡스탯) ──
  N('n_fiber', '근섬유 다발', 'sword', 1, 6, { atk: 0.06 }, ['+6%', 'sword'], ['공격 +6%']),   // 2026-10-17 밸런스: 15% = 같은 식물끼리 82%
  N('n_wall', '튼튼한 세포벽', 'shield', 1, 6, { def: 0.16 }, ['+16%', 'shield'], ['방어 +16%']),
  N('n_vacuole', '거대 액포', 'heart', 1, 6, { hp: 0.08 }, ['+8%', 'heart'], ['체력 +8%']),
  N('n_tropism', '향성 운동', 'speed', 1, 6, { spd: 0.5 }, ['+50%', 'speed'], ['기동 +50%', '먼저 움직일 확률과 피하는 힘이 함께 올라요']),
  N('n_target', '표적 분비물', 'crit', 2, 3, { crit: 12 }, ['+12', 'crit'], ['치명 +12']),
  N('n_chloro', '엽록체 증식', 'energy', 2, 3, { energy: 1 }, ['+1', 'energy'], ['판을 시작할 때 햇빛 +1', '3:3에선 팀 햇빛이 하나 더']),
  N('n_spine', '가시 줄기', 'cactus', 2, 3, { reflect: 0.15 }, ['15%', 'cactus'], ['붙어서 때린 상대에게 받은 피해의 15%를 되돌려요', '멀리서 · 넓게 때린 공격엔 안 돼요']),
  N('n_balance', '항상성', 'star', 3, 1, { hp: 0.03, atk: 0.03, def: 0.03, spd: 0.03 }, ['+3%', 'star'], ['체력 · 공격 · 방어 · 기동 +3%']),
  // ── 변이 카드 · 패시브(그 변이 식물만 — 특이한 효과 + 작은 수치) ──
  V('v_sap', 'predator', '진액 흡수', 'heal', { drain: 0.1 }, ['10%', 'heal'], ['모든 공격이 준 피해의 10%만큼 회복']),
  V('v_digest', 'predator', '소화액', 'target', { exec: 0.3 }, ['+30%', 'target'], ['체력이 30% 아래인 상대에게 주는 피해 +30%']),
  V('v_jaw', 'predator', '위턱 발달', 'sword', { mutPow: 0.15, atk: 0.03 }, ['+15%', 'sword'], ['변이 기술 위력 +15%', '공격 +3%']),
  V('v_forge', 'weapon', '단조', 'gear', { mutPow: 0.2, def: 0.05 }, ['+20%', 'sword'], ['변이 기술 위력 +20%', '방어 +5%']),
  V('v_ammo', 'weapon', '탄약 보급', 'plus', { mutUses: 1 }, ['+1', 'plus'], ['변이 기술마다 판마다 쓰는 횟수 +1']),
  V('v_edge', 'weapon', '예리한 날', 'crit', { crit: 6, critDmg: 0.25 }, ['+6', 'crit'], ['치명 +6', '치명타 피해 +25%']),
  V('v_venom', 'toxic', '맹독 농축', 'poison', { poisonAdd: 1 }, ['+1', 'poison'], ['독을 걸 때 1겹 더']),
  V('v_acid', 'toxic', '강산 분비', 'down', { acid: 0.15 }, ['+15%', 'poison'], ['독에 걸린 상대에게 주는 피해 +15%']),
  V('v_antidote', 'toxic', '해독 체질', 'check', { immune: ['poison'], hp: 0.03 }, ['+3%', 'heart'], ['독에 걸리지 않아요', '체력 +3%']),
  V('v_mycel', 'spore', '공생 균사', 'mushroom', { mycel: 0.1 }, ['+10%', 'sword'], ['상대에게 걸린 나쁜 효과 하나마다 공격 +10%(넷까지)']),
  V('v_spread', 'spore', '포자 번식', 'sparkle', { sporeAdd: 1 }, ['+1', 'mushroom'], ['포자를 걸 때 1겹 더']),
  V('v_rot', 'spore', '부생 회복', 'heal', { rot: 0.02 }, ['2%', 'heal'], ['턴 끝마다 상대에게 걸린 나쁜 효과 하나당 최대 체력 2% 회복']),
  V('v_scale', 'dragon', '강철 비늘', 'shield', { guard: 0.07, def: 0.03 }, ['7%', 'shield'], ['받는 피해 −7%', '방어 +3%']),
  V('v_regen', 'dragon', '재생 비늘', 'heal', { regen: 0.01 }, ['1%', 'heal'], ['턴 끝마다 최대 체력 1% 회복']),
  V('v_wrath', 'dragon', '용의 분노', 'fire', { wrath: 0.14 }, ['+14%', 'sword'], ['체력이 절반 아래면 공격 +14%']),
];
export const CARDS = Object.fromEntries(LIST.map(c => [c.id, c]));
// 기술 카드 = 변이 기술 하나하나(catalog SKILLS tier 'm' — 새 변이 기술을 더하면 저절로 카드가 됨)
for (const s of Object.values(SKILLS)) if (s.tier === 'm') CARDS[s.id] = { id: s.id, name: s.name, icon: null, rar: 3, w: 1, form: s.form, kind: 'skill', skill: s.id };
// 강화(2026-10-22 사용자 "패시브 카드의 경우 강화 기능을 고려해보자 밸런스 고려해서" · "중복된 카드는 어떻게 처리할지 고민"):
//  같은 일반 카드 두 장 + 돈 → 한 단계 위 카드 한 장(+1 · +2까지 — 카드 id 뒤 _2 · _3, 한 장 한 장이 제 단계를 지님). 수치는 +1 ≈ 1.3배 · +2 ≈ 1.6배.
//  변이 카드는 강화 없음(2026-10-17 사용자 "변이 카드는 강화 없애고 수를 늘리자") · 엽록체 증식(햇빛 +1)은 수를 쪼갤 수 없어 없음 · 남는 카드 = 팔기(cardPrice)
const UP_PAS = {
  n_fiber: [{ atk: 0.08 }, { atk: 0.10 }],
  n_wall: [{ def: 0.20 }, { def: 0.24 }],
  n_vacuole: [{ hp: 0.10 }, { hp: 0.12 }],
  n_tropism: [{ spd: 0.6 }, { spd: 0.7 }],
  n_target: [{ crit: 15 }, { crit: 18 }],
  n_spine: [{ reflect: 0.2 }, { reflect: 0.25 }],
  n_balance: [{ hp: 0.04, atk: 0.04, def: 0.04, spd: 0.04 }, { hp: 0.05, atk: 0.05, def: 0.05, spd: 0.05 }],
};
export const CARD_UP = { need: 2, credits: { 1: 200, 2: 500 } };   // 강화 한 번 = 같은 카드 두 장 + 돈(지금 단계 → 다음)
const shown = (k, v) => String(k === 'crit' ? v : Math.round(v * 100));   // 화면에 적힌 수(치명은 그대로 · 나머지는 %)
for (const [id, steps] of Object.entries(UP_PAS)) {
  const b = CARDS[id], k = Object.keys(b.pas)[0], from = shown(k, b.pas[k]);
  b.lv = 1; b.next = id + '_2';
  steps.forEach((pas, i) => {
    const lv = i + 2, to = shown(k, pas[k]), sub = t => t.replace(from, to);
    CARDS[`${id}_${lv}`] = { ...b, id: `${id}_${lv}`, name: `${b.name} +${lv - 1}`, w: 0, base: id, lv, next: lv < 3 ? `${id}_${lv + 1}` : null, pas, badge: [sub(b.badge[0]), b.badge[1]], desc: [sub(b.desc[0]), ...b.desc.slice(1)] };
  });
}
export const baseOf = id => (CARDS[id] && CARDS[id].base) || id;   // 강화 카드 → 처음 카드(한 식물에 같은 카드는 한 장만)
export const cardLv = id => (CARDS[id] && CARDS[id].lv) || 1;
// 팔 값(남는 카드): 일반 = 등급 30 · 50 · 80 × 강화(+1 = 3배 · +2 = 8배 — 든 것보다 늘 적게), 변이 카드 = 100
export const cardPrice = id => { const c = CARDS[id]; if (!c) return 0; if (c.form) return 100; return ({ 1: 30, 2: 50, 3: 80 }[c.rar] || 30) * ({ 1: 1, 2: 3, 3: 8 }[c.lv || 1]); };
export const NORMAL_CARDS = Object.keys(CARDS).filter(id => !CARDS[id].form && !CARDS[id].base);   // 뽑히는 일반 카드(강화 카드는 강화로만)
export const formCards = form => Object.keys(CARDS).filter(id => CARDS[id].form === form);
export const isSkillCard = id => !!(id && CARDS[id] && CARDS[id].kind === 'skill');
export const cardLook = id => { const c = CARDS[id]; return c && c.form ? FORMS[c.form] : NORMAL_LOOK; };

// 이 식물이 이 카드를 끼울 수 있나(null = 됨, 글 = 안 되는 까닭)
export function cardFits(p, id) {
  const c = CARDS[id];
  if (!c) return '없는 카드예요';
  const f = (p && p.form) || null;
  if (c.form) return c.form === f ? null : `${FORMS[c.form].name} 변이 식물만 써요`;
  return f ? '변이 식물은 그 변이 카드만 써요' : null;
}
// 끼운 카드들의 패시브 합(전투 유닛 u.pas · 능력치 배율)
export function passivesOf(ids) {
  const P = {};
  for (const id of ids || []) {
    const c = id && CARDS[id];
    if (!c || c.kind !== 'passive') continue;
    for (const [k, v] of Object.entries(c.pas)) P[k] = Array.isArray(v) ? [...(P[k] || []), ...v] : (P[k] || 0) + v;
  }
  return P;
}
// 카드 하나 뽑기: kind = 'normal'(일반 카드 — 흔한 것이 자주) · 'mut'(변이 카드 — 가진 변이 쪽이 자주) · 변이 이름(그 변이 카드)
export function rollCard(rng, kind = 'normal', owned = []) {
  let f = kind;
  if (f === 'mut') { const fs = owned.length && rng() < 0.7 ? owned : FORM_KEYS; f = fs[Math.floor(rng() * fs.length)]; }
  return rollFrom(rng, f === 'normal' ? NORMAL_CARDS : formCards(f));
}
// 목록 안에서 무게대로 하나(꾸러미 열기 — 그 식물에 맞는 카드만 넘김)
export function rollFrom(rng, ids) {
  const tot = ids.reduce((a, id) => a + CARDS[id].w, 0);
  let r = rng() * tot;
  for (const id of ids) { r -= CARDS[id].w; if (r <= 0) return id; }
  return ids[ids.length - 1];
}
// 화면용 카드 모습(skillcard.js cardFront가 그림): 기술 카드 = 그 기술, 패시브 = 이름 · 아이콘 · 수치 · 설명
export function cardFace(id) {
  const c = CARDS[id];
  if (!c) return null;
  if (c.kind === 'skill') { const s = SKILLS[c.skill]; return { act: s.power > 0 ? 'attack' : 'buff', cats: [s.power > 0 ? 'attack' : 'buff'], ...s, card: true }; }
  return { id, name: c.name, act: 'passive', cats: ['passive'], passive: true, form: c.form, look: cardLook(id), icon: c.icon, badge: c.badge, desc: c.desc, card: true, lv: c.lv || 1, canUp: !!c.next, artId: c.base || id };
}
