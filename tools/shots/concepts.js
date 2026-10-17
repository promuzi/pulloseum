// 식물 컨셉 한 줄(그림을 그릴 때 준 설명 — tools/pixel/big/concept/*_PROMPT.md · catalog.js 주석에서) · 표 그림 두 장(cardtable · plantsheet)이 같이 씀
import { loadBig, drawBigPotted } from '/v2/src/art/sprites.js';
import { Gfx } from '/v2/src/core/gfx.js';
export const CONCEPT = {
  flower_grass: '투구처럼 꽃잎을 두른 장미 기사 · 톱니 장미 잎을 칼처럼 듦',
  thorn: '가시덩굴이 엉켜 웅크린 몸 · 끝이 말린 채찍 덩굴손 둘',
  aqua: '속이 은은히 빛나는 물방울 구근 · 머리에 수련 · 치유사',
  flower_wind: '바람에 기운 가녀린 무희 꽃 · 깃털 꽃잎이 한쪽으로 날림',
  spark: '번개 모양 노란 꽃잎의 별꽃 · 끝이 빛나는 더듬이 수술',
  vine_water: '다시마 잎이 난 푸른 바다풀 덩굴 · 동그란 공기주머니',
  cactus_fire: '갈라진 틈에 불씨가 빛나는 통 선인장 · 머리와 팔 끝 불꽃',
  gaia: '돌 갑옷과 청록 수정을 두른 선인장 골렘 · 큰 돌주먹',
  flower_fire: '꽃잎 끝이 불꽃인 붉은 백합 · 가운데 불씨에 얼굴',
  cactus_wind: '구멍마다 바람이 휘파람 부는 파이프오르간 선인장',
  vine_wind: 'S자로 솟은 은빛 덩굴 암살자 · 화살촉 잎 머리',
  spore_cap: '노란 점박이 처진 갓 · 빛나는 포자 구름 · 짝짝이 눈',
  frost_bell: '서리 유리 같은 종 모양 꽃송이 · 지팡이처럼 굽은 줄기',
  volt_vine: '꼬인 전선 같은 구리빛 덩굴 · 애자처럼 빛나는 마디',
  stone_cap: '사암 판처럼 무거운 갓 · 이끼 · 자갈 같은 포자',
  jelly_cap: '해파리 같은 투명한 젤 갓 · 촉수처럼 늘어진 주름',
  fang_trap: '조개처럼 닫힌 파리지옥 덫 머리 · 털 이빨',
  blade_vine: '막 벼린 칼날 잎 · 칼자루 같은 매듭',
  toxi_cactus: '보라 독가시 통 선인장 · 맺힌 독방울 · 보라 꽃 왕관',
  draco_fruit: '용 비늘 같은 포엽의 얼음 용과 · 작은 날개 · 용 흉내',
  ember_cap: '등불 같은 호박색 갓 · 불티처럼 오르는 포자',
  drake_cactus: '갈빗대 몸에 용 비늘 · 뿔 · 날개의 불 선인장 용',
  frost_drake: '비늘 몸 · 날개 · 뿔의 얼음 선인장 용',
  gat_cap: '선비의 갓 같은 버섯 갓 · 갓끈 · 잎 부채',
  mask_vine: '하회탈 얼굴 · 탈춤 소매 같은 덩굴',
  drum_cactus: '천둥북 고리 · 북채 같은 팔',
  lantern_vine: '청사초롱을 든 서리 덩굴',
  jar_cactus: '물동이를 머리에 인 선인장',
  goblin_cap: '뿔 하나 · 번개 감긴 도깨비 방망이',
  crown_cap: '얼음 왕관 갓 · 서리 이끼 망토',
  gladi_cactus: '검투사 투구 · 선인장 방패 · 가시 칼',
  jangseung_cactus: '마을 장승 얼굴 · 검은 갓',
  astro_cap: '유리 우주 헬멧 · 공기통',
  viking_cap: '얼음 뿔 투구 · 땋은 서리 수염',
  hyunmu_cap: '거북 등껍질 갓 · 감긴 물뱀',
  gumiho_bloom: '여우 귀 꽃잎 · 아홉 꼬리 꽃잎 · 여우불',
  wizard_bell: '마법사 꽃잎 모자 · 별 지팡이',
  ninja_vine: '복면 · 붉은 잎 목도리 · 잎 수리검',
  diver_vine: '물안경 · 주황 테왁 · 망사리',
  pirate_cactus: '해적 삼각모 · 가시 커틀러스',
  ranger_vine: '잎 두건 · 덩굴 장궁',
  miner_cap: '광부 헬멧 · 곡괭이 뿌리',
  snow_ballet: '눈꽃 튀튀 · 발끝 서기',
  volcano_cap: '화산 갓 · 용암 줄기',
  dandel_aero: '민들레 낙하산 · 비행 고글',
};
// 게임과 같은 그림(화분 + 풀) — 위 여유(키 큰 식물 머리가 안 잘리게)
export const ready = loadBig('/assets/v2/');
export function pic(key) {
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 120;
  drawBigPotted(new Gfx(cv.getContext('2d')), key, 'pot_terra', 48, 90, { t: 0 });
  return cv.toDataURL();
}
