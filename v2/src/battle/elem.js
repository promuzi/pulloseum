// 상성: WEAK[맞는 쪽 속성] = 그 속성이 약한 공격 속성(기획서 약점표 — 불←물·대지 / 물←풀·빙결·번개 / 풀←불·바람·번개 / 번개←대지·빙결 / 대지←풀·물 / 빙결←불·대지 / 바람←대지·불)
//  (2026-11-04 model.js에서 옮김 — 포자 시간차 공격이 status · devices 에서도 상성을 쓰게. model.js 는 그대로 elemMult 를 내보냄)
export const WEAK = { fire: ['water', 'earth'], water: ['grass', 'ice', 'bolt'], grass: ['fire', 'wind', 'bolt'], bolt: ['earth', 'ice'], earth: ['grass', 'water'], ice: ['fire', 'earth'], wind: ['earth', 'fire'] };
export const elemMult = (atkEl, defEl) => (atkEl && (WEAK[defEl] || []).includes(atkEl) ? 1.5 : 1);
