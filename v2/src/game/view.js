// 화면에 보일 값(상태 → 글자·막대) — 여러 화면이 같이 씀. 규칙은 바꾸지 않음(읽기만).
import { SPECIES, STAGES, STAGE_KEY, LV_MAX, growNeed, harvestMax, starsOf, FARM_LV, FARM_START, IV_KEYS, IV_MAX, ORBIT_LV, PLANETS } from './catalog.js';
import { harvestGauge } from './logic.js';
import { STAGE_NAME } from '../data/mock.js';

export const stageKey = p => STAGE_KEY[p.stage] || 'mature';
export const stageName = p => { const sp = SPECIES[p.key] || { type: 'flower' }; return (STAGE_NAME[sp.type] || STAGE_NAME.flower)[stageKey(p)] || STAGES[p.stage]; };
export const stars = p => starsOf(p.ivs || {});
// 보이는 레벨(2026-10-18 사용자 "진화하면 레벨 1부터 하지 말고 쭉 이어지게"): 단계마다 1~6 → 어린 1~6 · 자라는 6~11 · 다 자란 11~16(진화 때 숫자 그대로)
export const lvOf = p => (p.stage || 0) * (LV_MAX - 1) + (p.lv || 1);
export const ivSum = p => IV_KEYS.reduce((a, k) => a + ((p.ivs || {})[k] || 0), 0);
export const IV_TOTAL = IV_KEYS.length * IV_MAX;
// 생장: Lv · 이번 레벨 생장치 · 필요량 · 진화 가능 · 다 자람
export function growInfo(p) {
  const top = p.lv >= LV_MAX;
  return { lv: p.lv, shown: lvOf(p), cur: top ? 0 : p.gxp, need: top ? 0 : growNeed(p.stage, p.lv), pct: top ? 1 : p.gxp / growNeed(p.stage, p.lv), ready: top && p.stage < 2, done: top && p.stage >= 2 };
}
// 열매: 맺힌 수 · 최대 · 다음 열매까지(0~1)
export function fruitOf(p, now) {
  if (!p.hv) return { have: 0, max: 0, gauge: 0 };
  const gauge = harvestGauge(p, now);
  return { have: p.hv.have, max: harvestMax(p), gauge: Math.max(0, Math.min(1, gauge)) };
}
// 스마트팜 i 번째 칸(0부터)이 열리는 재배사 레벨(처음 셋은 처음부터)
export const slotLv = i => (i < FARM_START ? 1 : FARM_LV[i - FARM_START] || 99);
// 행성이 열리는 레벨
export const planetLv = id => { const p = PLANETS.find(x => x.id === id); return p ? ORBIT_LV[p.orbit] : 99; };
// 남은 시간 글자(초 → '3분 20초')
export const left = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60); return m ? `${m}분 ${String(s % 60).padStart(2, '0')}초` : `${s}초`; };
