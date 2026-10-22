// 종마다 스스로 빛나는 칸(art/light.js emitOf) — 2026-10-22 사용자 "식물들에게 자기 자신 광원 있는지 확인하고(가이아룩 등의 수정 처럼), 기본 이펙트(번개식물의 번개효과)도 확인해서"
//  k = 빛 종류(fire 불 · bolt 번개 · gem 수정 · lamp 등불 · magic 마법 · lava 용암) · h = 색상각 범위 · l = 최소 밝기 · c = 최소 채도 · cx = 최대 채도
//  rb = 칠한 범위에 대한 비율 상자(생장 단계마다 크기가 달라도 같은 자리) · col = 빛 색을 정함
//  빛나는 칸은 늘 원래 그림에서 찾음(색 변종도 같은 자리 — 빛 색만 색 변종 그림에서). 검토 = node tools/pixel/big/lightlab.mjs --glow <키…>
//  번개 · 마법처럼 대기 동작 중 잠깐 나오는 효과는 tr: true — 늘 밝은 무늬(몸의 흰 반짝임)는 빼고 그 장에 새로 나온 칸만 빛남
const WARM = [1, 0.82, 0.55];
export const LIGHT_RULES = {
  // 불(머리 · 양팔 끝 불꽃)
  cactus_fire: { emit: [
    { k: 'fire', rb: [0.3, 0, 0.7, 0.38], h: [20, 115], l: 0.5, c: 0.1 },
    { k: 'fire', rb: [0, 0, 0.15, 0.6], h: [35, 115], l: 0.62, c: 0.1 },
    { k: 'fire', rb: [0.88, 0, 1, 0.6], h: [35, 115], l: 0.62, c: 0.1 },
  ] },
  flower_fire: { emit: [{ k: 'fire', h: [50, 112], l: 0.72, c: 0.1 }] },
  blade_vine: { emit: [{ k: 'fire', h: [25, 110], l: 0.62, c: 0.13 }] },
  drake_cactus: { emit: [{ k: 'fire', h: [55, 112], l: 0.8, c: 0.1 }] },
  ember_cap: { emit: [{ k: 'fire', h: [50, 112], l: 0.8, c: 0.1 }] },
  gumiho_bloom: { emit: [{ k: 'fire', h: [200, 290], l: 0.78 }, { k: 'fire', h: [50, 112], l: 0.88, c: 0.1 }] },   // 꼬리 끝 여우불(푸른 흰빛) + 불똥
  volcano_cap: { emit: [{ k: 'lava', rb: [0, 0, 1, 0.6], h: [25, 62], l: 0.55, c: 0.14 }] },   // 갓의 용암 줄 · 분화구
  // 번개(대기 동작 중 나오는 벼락 · 기는 전기 · 구체 번쩍)
  spark: { emit: [{ k: 'bolt', l: 0.94, cx: 0.1, tr: true }] },
  volt_vine: { emit: [{ k: 'bolt', l: 0.93, cx: 0.12, tr: true }, { k: 'bolt', h: [60, 110], l: 0.86, c: 0.1, tr: true }] },
  goblin_cap: { emit: [{ k: 'bolt', l: 0.93, cx: 0.1, tr: true }] },
  drum_cactus: { emit: [{ k: 'bolt', l: 0.95, cx: 0.12, tr: true }] },
  // 마법(별 지팡이)
  wizard_bell: { emit: [{ k: 'magic', h: [60, 115], l: 0.85, c: 0.08, tr: true }] },
  // 수정(은은하게) — 마이너캡의 호박 광석은 그림에서 빛나는 칸이 안 잡혀 뺌(2026-10-22 lightlab --glow)
  gaia: { emit: [{ k: 'gem', h: [170, 240], l: 0.55, c: 0.06 }] },
  stone_cap: { emit: [{ k: 'gem', h: [170, 240], l: 0.5, c: 0.06 }] },
  // 등불(청사초롱 — 빛은 천 색이 아니라 촛불 색)
  lantern_vine: { emit: [
    { k: 'lamp', rb: [0.55, 0.25, 1, 0.62], h: [340, 40], l: 0.35, c: 0.12, col: WARM },
    { k: 'lamp', rb: [0.55, 0.25, 1, 0.62], h: [240, 290], l: 0.35, c: 0.12, col: WARM },
    { k: 'lamp', rb: [0.55, 0.25, 1, 0.62], l: 0.85, cx: 0.04, col: WARM },
  ] },
};
