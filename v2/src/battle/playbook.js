// 종마다 쓰는 패턴(2026-11-04 봇 시스템 — 사용자 '운용에 관해 컨셉을 기준으로 들고가는 스킬과 패턴을 각각 식물별로 따로 적용해보자') · 생장마다 따로(2026-11-05 사용자 '봇의 성향도 생장에 따라 나눠'):
//  PLAYBOOK_BY[단계 0 새싹 · 1 성장기 · 2 성체][종] = [{ id: 기술, when: 조건, b: 점수 더하기, d: 시뮬레이션에서 오른 승률(%p) }] — 조건이 맞으면 봇 머리(model.js aiPick)가 그 기술 점수에 b를 더함(봇 식물 단계의 칸 · 없으면 성체 칸).
//  node tools/test/botsys.mjs playbook --stage N 이 그 단계 칸을 다시 씀(그 종 그 단계까지 고유 기술 전부 손패 · 모든 종과) · 손으로 고치지 않음.
//  조건: res 개수 칸 ≥ n · meal 먹은 준비 ≥ n · fxn 상대 겹 ≥ n · fx 상대 상태 있음 · nofx 상대 상태 없음 · harm 상대 상태이상 종류 ≥ n · fruit 열매 ≥ n · trap 덫 ≥ n ·
//   foelow 상대 체력 몫 < x · melow 내 체력 몫 < x · nobell 아침 · 밤이 꺼짐 · sum 소환수 < n · foebig 상대가 위력 n 넘는 공격을 쓸 햇빛이 있음 · always 쓸 수 있으면
export const PLAYBOOK_BY = {
  0: {   // 새싹 — Lv6 대회 단계 6 몸 · 모든 종과 12판씩
    aqua: [
      {"id":"u_aqua_1","when":{"k":"always"},"b":0.6,"d":21.4},   // 치유의 물 — 쓸 수 있으면
      {"id":"u_aqua_1","when":{"k":"melow","x":0.5},"b":0.6,"d":2.7},   // 치유의 물 — 내 체력 < 50%
    ],
    flower_wind: [
      {"id":"u_wind_1","when":{"k":"always"},"b":0.6,"d":4.5},   // 바람의 춤 — 쓸 수 있으면
    ],
    vine_water: [
      {"id":"u_tide_1","when":{"k":"always"},"b":0.6,"d":3},   // 물살 새순 — 쓸 수 있으면
    ],
    cactus_fire: [
      {"id":"u_ember_1","when":{"k":"always"},"b":0.6,"d":2.5},   // 불씨 — 쓸 수 있으면
    ],
    gaia: [
      {"id":"u_gaia_1","when":{"k":"always"},"b":0.6,"d":6.4},   // 돌 주먹 — 쓸 수 있으면
    ],
    cactus_wind: [
      {"id":"u_gale_1","when":{"k":"nofx","r":"gale"},"b":0.6,"d":4},   // 시작의 공명 — 상대 gale 없음
    ],
    vine_wind: [
      {"id":"u_gvine_1","when":{"k":"always"},"b":0.6,"d":5.5},   // 그건 내 잔상인데? — 쓸 수 있으면
    ],
    spore_cap: [
      {"id":"u_spore_1","when":{"k":"sum","n":2},"b":0.6,"d":17},   // 포자 배양 — 소환수 < 2
      {"id":"u_spore_1","when":{"k":"always"},"b":0.6,"d":1.3},   // 포자 배양 — 쓸 수 있으면
    ],
    stone_cap: [
      {"id":"u_stone_1","when":{"k":"nofx","r":"stun"},"b":0.6,"d":2.8},   // 낙석 — 상대 stun 없음
      {"id":"u_stone_1","when":{"k":"always"},"b":0.6,"d":3},   // 낙석 — 쓸 수 있으면
    ],
    jelly_cap: [
      {"id":"u_jelly_1","when":{"k":"always"},"b":0.6,"d":12.3},   // 말랑잉 — 쓸 수 있으면
    ],
    draco_fruit: [
      {"id":"u_draco_1","when":{"k":"always"},"b":0.6,"d":4.2},   // 내가 용이될 상이요? — 쓸 수 있으면
    ],
    mask_vine: [
      {"id":"u_tal_1","when":{"k":"always"},"b":0.6,"d":6.8},   // 탈춤 휘감기 — 쓸 수 있으면
      {"id":"u_tal_1","when":{"k":"nofx","r":"seal"},"b":0.6,"d":0.6},   // 탈춤 휘감기 — 상대 seal 없음
    ],
    drum_cactus: [
      {"id":"u_drum_1","when":{"k":"always"},"b":0.6,"d":5.1},   // 북채 번개 — 쓸 수 있으면
      {"id":"u_drum_1","when":{"k":"nofx","r":"shock"},"b":0.6,"d":0.9},   // 북채 번개 — 상대 shock 없음
    ],
    lantern_vine: [
      {"id":"u_lamp_1","when":{"k":"always"},"b":0.6,"d":14},   // 초롱 불빛 — 쓸 수 있으면
    ],
    jar_cactus: [
      {"id":"u_jar_1","when":{"k":"always"},"b":0.6,"d":11},   // 물동이 쏟기 — 쓸 수 있으면
      {"id":"u_jar_1","when":{"k":"nofx","r":"wet"},"b":0.6,"d":2.1},   // 물동이 쏟기 — 상대 wet 없음
    ],
    crown_cap: [
      {"id":"u_crown_1","when":{"k":"always"},"b":0.6,"d":2.1},   // 서리 광채 — 쓸 수 있으면
    ],
    gladi_cactus: [
      {"id":"u_gladi_1","when":{"k":"always"},"b":0.6,"d":4},   // 가시 칼 찌르기 — 쓸 수 있으면
    ],
    astro_cap: [
      {"id":"u_astro_1","when":{"k":"nofx","r":"gale"},"b":0.6,"d":1.7},   // 공기 방울 — 상대 gale 없음
    ],
    viking_cap: [
      {"id":"u_viking_1","when":{"k":"always"},"b":0.6,"d":8.9},   // 뿔 박치기 — 쓸 수 있으면
    ],
    diver_vine: [
      {"id":"u_haenyeo_1","when":{"k":"always"},"b":0.6,"d":8.1},   // 물질 — 쓸 수 있으면
    ],
    pirate_cactus: [
      {"id":"u_pirate_1","when":{"k":"always"},"b":0.6,"d":10},   // 물보라 칼질 — 쓸 수 있으면
    ],
    ranger_vine: [
      {"id":"u_ranger_1","when":{"k":"always"},"b":0.6,"d":5.5},   // 덩굴 화살 — 쓸 수 있으면
    ],
    miner_cap: [
      {"id":"u_miner_1","when":{"k":"always"},"b":0.6,"d":6.6},   // 곡괭이 찍기 — 쓸 수 있으면
    ],
  },
  1: {   // 성장기 — Lv6 대회 단계 6 몸 · 모든 종과 12판씩
    thorn: [
      {"id":"u_thorn_2","when":{"k":"always"},"b":0.6,"d":16.3},   // 기습 — 쓸 수 있으면
    ],
    aqua: [
      {"id":"u_aqua_1","when":{"k":"always"},"b":0.6,"d":11.2},   // 치유의 물 — 쓸 수 있으면
      {"id":"u_aqua_1","when":{"k":"melow","x":0.5},"b":0.6,"d":2.6},   // 치유의 물 — 내 체력 < 50%
    ],
    flower_wind: [
      {"id":"u_wind_1","when":{"k":"always"},"b":0.6,"d":8.5},   // 바람의 춤 — 쓸 수 있으면
    ],
    cactus_fire: [
      {"id":"u_ember_2","when":{"k":"always"},"b":0.6,"d":6.1},   // 불가시 난사 — 쓸 수 있으면
      {"id":"u_ember_2","when":{"k":"nofx","r":"burn"},"b":0.6,"d":0.6},   // 불가시 난사 — 상대 burn 없음
    ],
    vine_wind: [
      {"id":"u_gvine_1","when":{"k":"always"},"b":0.6,"d":11.4},   // 그건 내 잔상인데? — 쓸 수 있으면
    ],
    spore_cap: [
      {"id":"u_spore_1","when":{"k":"always"},"b":0.6,"d":11},   // 포자 배양 — 쓸 수 있으면
      {"id":"u_spore_1","when":{"k":"sum","n":2},"b":0.6,"d":2.3},   // 포자 배양 — 소환수 < 2
    ],
    stone_cap: [
      {"id":"u_stone_2","when":{"k":"always"},"b":0.6,"d":1.9},   // 자갈밭 — 쓸 수 있으면
    ],
    jelly_cap: [
      {"id":"u_jelly_2","when":{"k":"always"},"b":0.6,"d":11.9},   // 톡씽 — 쓸 수 있으면
      {"id":"u_jelly_1","when":{"k":"foebig","n":90},"b":0.6,"d":5.1},   // 말랑잉 — 상대가 위력 90 넘게 칠 햇빛
      {"id":"u_jelly_1","when":{"k":"foebig","n":70},"b":0.6,"d":2.9},   // 말랑잉 — 상대가 위력 70 넘게 칠 햇빛
    ],
    blade_vine: [
      {"id":"u_blade_2","when":{"k":"always"},"b":0.6,"d":1.9},   // 칼날 잎 — 쓸 수 있으면
    ],
    ember_cap: [
      {"id":"u_emcap_1","when":{"k":"nofx","r":"spore"},"b":0.6,"d":2.3},   // 불티나네 — 상대 spore 없음
      {"id":"u_emcap_2","when":{"k":"always"},"b":0.6,"d":2.1},   // 따끈 이불 — 쓸 수 있으면
    ],
    frost_drake: [
      {"id":"u_fdrake_2","when":{"k":"always"},"b":0.6,"d":6.9},   // 열매 먹기 — 쓸 수 있으면
      {"id":"u_fdrake_2","when":{"k":"melow","x":0.5},"b":0.6,"d":2},   // 열매 먹기 — 내 체력 < 50%
    ],
    mask_vine: [
      {"id":"u_tal_2b","when":{"k":"always"},"b":0.6,"d":13.1},   // 웃는 탈 — 쓸 수 있으면
    ],
    lantern_vine: [
      {"id":"u_lamp_1","when":{"k":"always"},"b":0.6,"d":6.8},   // 초롱 불빛 — 쓸 수 있으면
    ],
    jar_cactus: [
      {"id":"u_jar_2b","when":{"k":"always"},"b":0.6,"d":2.9},   // 물 길어 오기 — 쓸 수 있으면
    ],
    crown_cap: [
      {"id":"u_crown_1","when":{"k":"always"},"b":0.6,"d":1.5},   // 서리 광채 — 쓸 수 있으면
    ],
    gladi_cactus: [
      {"id":"u_gladi_2b","when":{"k":"always"},"b":0.6,"d":1.5},   // 방패 밀치기 — 쓸 수 있으면
    ],
    viking_cap: [
      {"id":"u_viking_1","when":{"k":"always"},"b":0.6,"d":3.4},   // 뿔 박치기 — 쓸 수 있으면
    ],
    hyunmu_cap: [
      {"id":"u_hyunmu_2","when":{"k":"always"},"b":0.6,"d":1.5},   // 거북 등껍질 — 쓸 수 있으면
    ],
    wizard_bell: [
      {"id":"u_wizard_2","when":{"k":"always"},"b":0.6,"d":5.5},   // 별 지팡이 — 쓸 수 있으면
    ],
    diver_vine: [
      {"id":"u_haenyeo_1","when":{"k":"always"},"b":0.6,"d":5.5},   // 물질 — 쓸 수 있으면
      {"id":"u_haenyeo_1","when":{"k":"nofx","r":"wet"},"b":0.6,"d":0.8},   // 물질 — 상대 wet 없음
    ],
    ranger_vine: [
      {"id":"u_ranger_1","when":{"k":"always"},"b":0.6,"d":4.4},   // 덩굴 화살 — 쓸 수 있으면
    ],
    miner_cap: [
      {"id":"u_miner_1","when":{"k":"always"},"b":0.6,"d":4.7},   // 곡괭이 찍기 — 쓸 수 있으면
    ],
  },
  2: {   // 성체 — Lv6 대회 단계 6 몸 · 모든 종과 12판씩
    thorn: [
      {"id":"u_thorn_2","when":{"k":"always"},"b":0.6,"d":15},   // 기습 — 쓸 수 있으면
    ],
    aqua: [
      {"id":"u_aqua_1","when":{"k":"always"},"b":0.6,"d":24.5},   // 치유의 물 — 쓸 수 있으면
      {"id":"u_aqua_1","when":{"k":"melow","x":0.5},"b":0.6,"d":8},   // 치유의 물 — 내 체력 < 50%
    ],
    flower_wind: [
      {"id":"u_wind_1","when":{"k":"always"},"b":0.6,"d":13.4},   // 바람의 춤 — 쓸 수 있으면
    ],
    spark: [
      {"id":"u_spark_3b","when":{"k":"always"},"b":0.6,"d":6.6},   // 번쩍 별 — 쓸 수 있으면
      {"id":"u_spark_3b","when":{"k":"nofx","r":"shock"},"b":0.6,"d":2.5},   // 번쩍 별 — 상대 shock 없음
    ],
    vine_water: [
      {"id":"u_tide_2","when":{"k":"always"},"b":0.6,"d":1.7},   // 조류 휘감기 — 쓸 수 있으면
      {"id":"u_tide_3b","when":{"k":"always"},"b":0.6,"d":1.5},   // 소용돌이 덩굴 — 쓸 수 있으면
    ],
    cactus_fire: [
      {"id":"u_ember_2","when":{"k":"always"},"b":0.6,"d":9.3},   // 불가시 난사 — 쓸 수 있으면
    ],
    flower_fire: [
      {"id":"u_blaze_2b","when":{"k":"nofx","r":"burn"},"b":0.6,"d":2.3},   // 불꽃 찌르기 — 상대 burn 없음
      {"id":"u_blaze_2b","when":{"k":"always"},"b":0.6,"d":1.7},   // 불꽃 찌르기 — 쓸 수 있으면
    ],
    cactus_wind: [
      {"id":"u_gale_1","when":{"k":"nofx","r":"gale"},"b":0.6,"d":11.7},   // 시작의 공명 — 상대 gale 없음
      {"id":"u_gale_1","when":{"k":"always"},"b":0.6,"d":2.1},   // 시작의 공명 — 쓸 수 있으면
      {"id":"u_gale_3b","when":{"k":"always"},"b":0.6,"d":2.3},   // 치유 공명 — 쓸 수 있으면
    ],
    vine_wind: [
      {"id":"u_gvine_1","when":{"k":"always"},"b":0.6,"d":8.3},   // 그건 내 잔상인데? — 쓸 수 있으면
    ],
    spore_cap: [
      {"id":"u_spore_1","when":{"k":"always"},"b":0.6,"d":19.2},   // 포자 배양 — 쓸 수 있으면
      {"id":"u_spore_1","when":{"k":"sum","n":2},"b":0.6,"d":7.2},   // 포자 배양 — 소환수 < 2
    ],
    frost_bell: [
      {"id":"u_frost_3b","when":{"k":"melow","x":0.5},"b":0.6,"d":1.9},   // 청아함의 물결. — 내 체력 < 50%
      {"id":"u_frost_3c","when":{"k":"always"},"b":0.6,"d":0.8},   // 예로부터 매가 약이었죠. — 쓸 수 있으면
    ],
    volt_vine: [
      {"id":"u_volt_3b","when":{"k":"nofx","r":"burn"},"b":0.6,"d":4.2},   // 뇌격구 — 상대 burn 없음
      {"id":"u_volt_3b","when":{"k":"always"},"b":0.6,"d":1.1},   // 뇌격구 — 쓸 수 있으면
    ],
    stone_cap: [
      {"id":"u_stone_2b","when":{"k":"always"},"b":0.6,"d":9.3},   // 석순 — 쓸 수 있으면
      {"id":"u_stone_1","when":{"k":"nofx","r":"stun"},"b":0.6,"d":0.8},   // 낙석 — 상대 stun 없음
      {"id":"u_stone_3","when":{"k":"always"},"b":0.6,"d":1.9},   // 용암지대 — 쓸 수 있으면
    ],
    jelly_cap: [
      {"id":"u_jelly_3","when":{"k":"always"},"b":0.6,"d":10},   // 부활잉 — 쓸 수 있으면
      {"id":"u_jelly_3c","when":{"k":"foebig","n":90},"b":0.6,"d":2.2},   // 너꺼잉 — 상대가 위력 90 넘게 칠 햇빛
    ],
    blade_vine: [
      {"id":"u_blade_2","when":{"k":"always"},"b":0.6,"d":3.8},   // 칼날 잎 — 쓸 수 있으면
      {"id":"u_blade_3b","when":{"k":"always"},"b":0.6,"d":3.8},   // ..력일섬! — 쓸 수 있으면
    ],
    toxi_cactus: [
      {"id":"u_toxi_3","when":{"k":"always"},"b":0.6,"d":2.7},   // 만천화우 — 쓸 수 있으면
    ],
    draco_fruit: [
      {"id":"u_draco_1","when":{"k":"always"},"b":0.6,"d":10.4},   // 내가 용이될 상이요? — 쓸 수 있으면
      {"id":"u_draco_2b","when":{"k":"always"},"b":0.6,"d":2.1},   // 용과 먹기 — 쓸 수 있으면
      {"id":"u_draco_2b","when":{"k":"melow","x":0.5},"b":0.6,"d":4.6},   // 용과 먹기 — 내 체력 < 50%
    ],
    ember_cap: [
      {"id":"u_emcap_3b","when":{"k":"sum","n":2},"b":0.6,"d":10.9},   // 불씨 포자 — 소환수 < 2
      {"id":"u_emcap_3b","when":{"k":"always"},"b":0.6,"d":5.6},   // 불씨 포자 — 쓸 수 있으면
    ],
    drake_cactus: [
      {"id":"u_drake_2","when":{"k":"always"},"b":0.6,"d":10.6},   // 용갑 강화 — 쓸 수 있으면
    ],
    frost_drake: [
      {"id":"u_fdrake_2","when":{"k":"melow","x":0.5},"b":0.6,"d":2.3},   // 열매 먹기 — 내 체력 < 50%
      {"id":"u_fdrake_2","when":{"k":"fruit","n":2},"b":0.6,"d":1},   // 열매 먹기 — 열매 ≥ 2
      {"id":"u_fdrake_2","when":{"k":"fruit","n":3},"b":0.6,"d":0.8},   // 열매 먹기 — 열매 ≥ 3
    ],
    gat_cap: [
      {"id":"u_gat_3b","when":{"k":"always"},"b":0.6,"d":8},   // 선비의 꾸짖음 — 쓸 수 있으면
      {"id":"u_gat_3","when":{"k":"nofx","r":"spore"},"b":0.6,"d":0.9},   // 갓 회오리 — 상대 spore 없음
    ],
    mask_vine: [
      {"id":"u_tal_2b","when":{"k":"always"},"b":0.6,"d":4.7},   // 웃는 탈 — 쓸 수 있으면
    ],
    drum_cactus: [
      {"id":"u_drum_1","when":{"k":"nofx","r":"shock"},"b":0.6,"d":3},   // 북채 번개 — 상대 shock 없음
      {"id":"u_drum_3c","when":{"k":"always"},"b":0.6,"d":0.8},   // 하늘 북 — 쓸 수 있으면
    ],
    lantern_vine: [
      {"id":"u_lamp_1","when":{"k":"always"},"b":0.6,"d":7.4},   // 초롱 불빛 — 쓸 수 있으면
      {"id":"u_lamp_3c","when":{"k":"always"},"b":0.6,"d":3.8},   // 홍사초롱 — 쓸 수 있으면
    ],
    jar_cactus: [
      {"id":"u_jar_2b","when":{"k":"always"},"b":0.6,"d":6.9},   // 물 길어 오기 — 쓸 수 있으면
      {"id":"u_jar_3","when":{"k":"always"},"b":0.6,"d":2.1},   // 물동이 내려치기 — 쓸 수 있으면
      {"id":"u_jar_2b","when":{"k":"melow","x":0.5},"b":0.6,"d":1.2},   // 물 길어 오기 — 내 체력 < 50%
    ],
    goblin_cap: [
      {"id":"u_dok_2b","when":{"k":"always"},"b":0.6,"d":1.7},   // 도깨비불 — 쓸 수 있으면
    ],
    crown_cap: [
      {"id":"u_crown_3","when":{"k":"always"},"b":0.6,"d":6.1},   // 빙왕의 포자 — 쓸 수 있으면
    ],
    gladi_cactus: [
      {"id":"u_gladi_2b","when":{"k":"always"},"b":0.6,"d":7.6},   // 방패 밀치기 — 쓸 수 있으면
    ],
    jangseung_cactus: [
      {"id":"u_jang_2b","when":{"k":"always"},"b":0.6,"d":13.4},   // 솔잎 가지 — 쓸 수 있으면
      {"id":"u_jang_2","when":{"k":"always"},"b":0.6,"d":2.1},   // 마을 지킴이 — 쓸 수 있으면
      {"id":"u_jang_2","when":{"k":"melow","x":0.5},"b":0.6,"d":0.8},   // 마을 지킴이 — 내 체력 < 50%
    ],
    astro_cap: [
      {"id":"u_astro_2b","when":{"k":"nofx","r":"spore"},"b":0.6,"d":3.4},   // 무중력 포자 — 상대 spore 없음
      {"id":"u_astro_3","when":{"k":"always"},"b":0.6,"d":1.9},   // 궤도 돌진 — 쓸 수 있으면
    ],
    viking_cap: [
      {"id":"u_viking_2b","when":{"k":"always"},"b":0.6,"d":2.3},   // 얼음 뿔 찌르기 — 쓸 수 있으면
    ],
    hyunmu_cap: [
      {"id":"u_hyunmu_3c","when":{"k":"always"},"b":0.6,"d":1.7},   // 흑수룡 강림 — 쓸 수 있으면
    ],
    wizard_bell: [
      {"id":"u_wizard_2","when":{"k":"always"},"b":0.6,"d":3},   // 별 지팡이 — 쓸 수 있으면
      {"id":"u_wizard_1","when":{"k":"nofx","r":"shock"},"b":0.6,"d":4},   // 별빛 찌릿 — 상대 shock 없음
    ],
    ninja_vine: [
      {"id":"u_ninja_3b","when":{"k":"always"},"b":0.6,"d":4.4},   // 그림자 숨기 — 쓸 수 있으면
    ],
    diver_vine: [
      {"id":"u_haenyeo_3","when":{"k":"always"},"b":0.6,"d":3.2},   // 파도타기 — 쓸 수 있으면
    ],
    pirate_cactus: [
      {"id":"u_pirate_1","when":{"k":"always"},"b":0.6,"d":1.5},   // 물보라 칼질 — 쓸 수 있으면
    ],
    ranger_vine: [
      {"id":"u_ranger_1","when":{"k":"always"},"b":0.6,"d":6.1},   // 덩굴 화살 — 쓸 수 있으면
    ],
    miner_cap: [
      {"id":"u_miner_2","when":{"k":"always"},"b":0.6,"d":2.5},   // 헬멧 단단히 — 쓸 수 있으면
      {"id":"u_miner_2","when":{"k":"melow","x":0.5},"b":0.6,"d":0.8},   // 헬멧 단단히 — 내 체력 < 50%
    ],
    volcano_cap: [
      {"id":"u_volcano_1","when":{"k":"always"},"b":0.6,"d":1.9},   // 불씨 분출 — 쓸 수 있으면
    ],
    dandel_aero: [
      {"id":"u_dandel_3","when":{"k":"always"},"b":0.6,"d":3},   // 민들레 폭풍 — 쓸 수 있으면
    ],
  },
};
export const PLAYBOOK_META = {"0":"Lv6 대회 단계 6 몸 · 모든 종과 12판씩","1":"Lv6 대회 단계 6 몸 · 모든 종과 12판씩","2":"Lv6 대회 단계 6 몸 · 모든 종과 12판씩"};
export const PLAYBOOK = PLAYBOOK_BY[2] || {};
