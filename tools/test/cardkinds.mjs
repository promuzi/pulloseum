// 기술 종류별 카드 몫(2026-11-05 사용자 '지금 모든 디버프만 있는 스킬이 다 별로임?'):
//  사용자 설계 종(SPECIES_V2) 고유 기술을 공격 · 공격 + 디버프 · 디버프만 · 내 쪽(버프 · 회복 · 방어 등)으로 나눠 단계마다 카드 몫(botdeck_w.js — 손패에 있으면 승률이 몇 바뀌나)을 견줌
//  표에 없는 칸 = 몫이 ±0.5 안이거나 손패에 늘 들어가 못 잰 것(botsys learn)
//   node tools/test/cardkinds.mjs
import { SKILLS, SPECIES, SPECIES_V2, uniquesOf } from '../../v2/src/game/catalog.js';
import { CARD_W_BY } from '../../v2/src/game/botdeck_w.js';
const debuffOnly = s => !(s.power > 0) && (s.act === 'hex' || (s.cats || []).includes('debuff')) && !(s.cats || []).some(c => c === 'heal_hp' || c === 'attack');
const kind = s => debuffOnly(s) ? '디버프만' : s.power > 0 ? (s.inflict || s.inflicts || s.hex ? '공격 + 디버프' : '공격') : '내 쪽(버프 · 회복 · 방어 등)';
const f = x => (x >= 0 ? '+' : '') + (100 * x).toFixed(1), med = a => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
for (let st = 0; st <= 2; st++) {
  const by = {}, deb = [], miss = [];
  for (const k of Object.keys(SPECIES)) {
    if (!SPECIES_V2.has(k)) continue;
    const W = (CARD_W_BY[st] || {})[k] || {}, ids = new Set();
    for (let s0 = 0; s0 <= st; s0++) for (const id of uniquesOf(k, s0)) if (id && SKILLS[id]) ids.add(id);
    for (const id of ids) {
      const s = SKILLS[id], v = W[id];
      if (v === undefined) { if (debuffOnly(s)) miss.push(`${SPECIES[k].name} · ${s.name}`); continue; }
      (by[kind(s)] ||= []).push(v);
      if (debuffOnly(s)) deb.push([v, `${SPECIES[k].name} · ${s.name}(햇빛 ${s.cost})`]);
    }
  }
  console.log(`\n== ${['새싹', '성장기', '성체'][st]} — 사용자 설계 종 고유 기술 카드 몫(%p) ==`);
  for (const [c, a] of Object.entries(by)) console.log(`  ${c}: ${a.length}장 · 가운데 ${f(med(a))} · −3 아래 ${a.filter(x => x < -0.03).length}장 · +3 위 ${a.filter(x => x > 0.03).length}장`);
  for (const [v, t] of deb.sort((a, b) => a[0] - b[0])) console.log(`    ${f(v).padStart(6)}  ${t}`);
  if (miss.length) console.log(`    못 잰 디버프만: ${miss.join(' · ')}`);
}
