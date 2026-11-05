// 종마다 쓰는 패턴(2026-11-04 봇 시스템 — 사용자 '운용에 관해 컨셉을 기준으로 들고가는 스킬과 패턴을 각각 식물별로 따로 적용해보자') · 생장마다 따로(2026-11-05 사용자 '봇의 성향도 생장에 따라 나눠'):
//  PLAYBOOK_BY[단계 0 새싹 · 1 성장기 · 2 성체][종] = [{ id: 기술, when: 조건, b: 점수 더하기, d: 시뮬레이션에서 오른 승률(%p) }] — 조건이 맞으면 봇 머리(model.js aiPick)가 그 기술 점수에 b를 더함(봇 식물 단계의 칸 · 없으면 성체 칸).
//  node tools/test/botsys.mjs playbook --stage N 이 그 단계 칸을 다시 씀(그 종 그 단계까지 고유 기술 전부 손패 · 모든 종과) · 손으로 고치지 않음.
//  조건: res 개수 칸 ≥ n · meal 먹은 준비 ≥ n · fxn 상대 겹 ≥ n · fx 상대 상태 있음 · nofx 상대 상태 없음 · harm 상대 상태이상 종류 ≥ n · fruit 열매 ≥ n · trap 덫 ≥ n ·
//   foelow 상대 체력 몫 < x · melow 내 체력 몫 < x · nobell 아침 · 밤이 꺼짐 · sum 소환수 < n · foebig 상대가 위력 n 넘는 공격을 쓸 햇빛이 있음 · always 쓸 수 있으면
export const PLAYBOOK_BY = {
  0: {   // 새싹 — Lv6 대회 단계 6 몸 · 모든 종과 12판씩
    aqua: [
      {"id":"u_aqua_1","when":{"k":"always"},"b":0.6,"d":22},   // 치유의 물 — 쓸 수 있으면
      {"id":"u_aqua_1","when":{"k":"melow","x":0.5},"b":0.6,"d":2.5},   // 치유의 물 — 내 체력 < 50%
    ],
    vine_water: [
      {"id":"u_tide_1","when":{"k":"always"},"b":0.6,"d":4.2},   // 물살 새순 — 쓸 수 있으면
    ],
    cactus_fire: [
      {"id":"u_ember_1","when":{"k":"always"},"b":0.6,"d":5.5},   // 불씨 — 쓸 수 있으면
      {"id":"u_ember_1","when":{"k":"nofx","r":"burn"},"b":0.6,"d":0.8},   // 불씨 — 상대 burn 없음
    ],
    gaia: [
      {"id":"u_gaia_1","when":{"k":"always"},"b":0.6,"d":6.6},   // 돌 주먹 — 쓸 수 있으면
    ],
    vine_wind: [
      {"id":"u_gvine_1","when":{"k":"always"},"b":0.6,"d":2.8},   // 그건 내 잔상인데? — 쓸 수 있으면
    ],
    spore_cap: [
      {"id":"u_spore_1","when":{"k":"always"},"b":0.6,"d":13},   // 포자 배양 — 쓸 수 있으면
      {"id":"u_spore_1","when":{"k":"sum","n":2},"b":0.6,"d":0.8},   // 포자 배양 — 소환수 < 2
    ],
    stone_cap: [
      {"id":"u_stone_1","when":{"k":"nofx","r":"stun"},"b":0.6,"d":4.4},   // 낙석 — 상대 stun 없음
    ],
    toxi_cactus: [
      {"id":"u_toxi_1","when":{"k":"fxn","r":"poison","n":3},"b":0.6,"d":5.5},   // 독 주머니 폭발 — 상대 poison ≥ 3겹
    ],
    draco_fruit: [
      {"id":"u_draco_1","when":{"k":"always"},"b":0.6,"d":5.5},   // 내가 용이될 상이요? — 쓸 수 있으면
    ],
    mask_vine: [
      {"id":"u_tal_1","when":{"k":"always"},"b":0.6,"d":4.4},   // 탈춤 휘감기 — 쓸 수 있으면
      {"id":"u_tal_1","when":{"k":"nofx","r":"seal"},"b":0.6,"d":0.9},   // 탈춤 휘감기 — 상대 seal 없음
    ],
    drum_cactus: [
      {"id":"u_drum_1","when":{"k":"always"},"b":0.6,"d":4.4},   // 북채 번개 — 쓸 수 있으면
      {"id":"u_drum_1","when":{"k":"nofx","r":"shock"},"b":0.6,"d":0.8},   // 북채 번개 — 상대 shock 없음
    ],
    lantern_vine: [
      {"id":"u_lamp_1","when":{"k":"always"},"b":0.6,"d":14.8},   // 초롱 불빛 — 쓸 수 있으면
    ],
    jar_cactus: [
      {"id":"u_jar_1","when":{"k":"always"},"b":0.6,"d":11.7},   // 물동이 쏟기 — 쓸 수 있으면
      {"id":"u_jar_1","when":{"k":"nofx","r":"wet"},"b":0.6,"d":0.9},   // 물동이 쏟기 — 상대 wet 없음
    ],
    crown_cap: [
      {"id":"u_crown_1","when":{"k":"always"},"b":0.6,"d":4},   // 서리 광채 — 쓸 수 있으면
    ],
    gladi_cactus: [
      {"id":"u_gladi_1","when":{"k":"always"},"b":0.6,"d":2.8},   // 가시 칼 찌르기 — 쓸 수 있으면
    ],
    viking_cap: [
      {"id":"u_viking_1","when":{"k":"always"},"b":0.6,"d":7.6},   // 뿔 박치기 — 쓸 수 있으면
    ],
    ninja_vine: [
      {"id":"u_ninja_1","when":{"k":"nofx","r":"gale"},"b":0.6,"d":3.4},   // 잎 수리검 — 상대 gale 없음
      {"id":"u_ninja_1","when":{"k":"always"},"b":0.6,"d":2.5},   // 잎 수리검 — 쓸 수 있으면
    ],
    diver_vine: [
      {"id":"u_haenyeo_1","when":{"k":"always"},"b":0.6,"d":7.4},   // 물질 — 쓸 수 있으면
      {"id":"u_haenyeo_1","when":{"k":"nofx","r":"wet"},"b":0.6,"d":0.8},   // 물질 — 상대 wet 없음
    ],
    pirate_cactus: [
      {"id":"u_pirate_1","when":{"k":"always"},"b":0.6,"d":8},   // 물보라 칼질 — 쓸 수 있으면
      {"id":"u_pirate_1","when":{"k":"nofx","r":"wet"},"b":0.6,"d":0.6},   // 물보라 칼질 — 상대 wet 없음
    ],
    ranger_vine: [
      {"id":"u_ranger_1","when":{"k":"always"},"b":0.6,"d":4.5},   // 덩굴 화살 — 쓸 수 있으면
    ],
    miner_cap: [
      {"id":"u_miner_1","when":{"k":"always"},"b":0.6,"d":7.6},   // 곡괭이 찍기 — 쓸 수 있으면
      {"id":"u_miner_1","when":{"k":"nofx","r":"spore"},"b":0.6,"d":1.3},   // 곡괭이 찍기 — 상대 spore 없음
    ],
    jelly_cap: [
      {"id":"u_jelly_1","when":{"k":"always"},"b":0.6,"d":13.1},   // 말랑잉 — 쓸 수 있으면
      {"id":"u_jelly_1","when":{"k":"foebig","n":70},"b":0.6,"d":1.3},   // 말랑잉 — 상대가 위력 70 넘게 칠 햇빛
    ],
  },
  1: {   // 성장기 — Lv6 대회 단계 6 몸 · 모든 종과 12판씩
    thorn: [
      {"id":"u_thorn_2","when":{"k":"always"},"b":0.6,"d":5.3},   // 기습 — 쓸 수 있으면
    ],
    aqua: [
      {"id":"u_aqua_1","when":{"k":"always"},"b":0.6,"d":19.5},   // 치유의 물 — 쓸 수 있으면
      {"id":"u_aqua_1","when":{"k":"melow","x":0.5},"b":0.6,"d":6.3},   // 치유의 물 — 내 체력 < 50%
    ],
    flower_wind: [
      {"id":"u_wind_1","when":{"k":"always"},"b":0.6,"d":4.5},   // 바람의 춤 — 쓸 수 있으면
    ],
    cactus_fire: [
      {"id":"u_ember_2","when":{"k":"always"},"b":0.6,"d":7.4},   // 불가시 난사 — 쓸 수 있으면
      {"id":"u_ember_2","when":{"k":"nofx","r":"burn"},"b":0.6,"d":0.6},   // 불가시 난사 — 상대 burn 없음
    ],
    vine_wind: [
      {"id":"u_gvine_1","when":{"k":"always"},"b":0.6,"d":14.8},   // 그건 내 잔상인데? — 쓸 수 있으면
    ],
    spore_cap: [
      {"id":"u_spore_1","when":{"k":"always"},"b":0.6,"d":9.3},   // 포자 배양 — 쓸 수 있으면
      {"id":"u_spore_1","when":{"k":"sum","n":2},"b":0.6,"d":2.6},   // 포자 배양 — 소환수 < 2
    ],
    frost_bell: [
      {"id":"u_frost_1","when":{"k":"nobell"},"b":0.6,"d":5.5},   // 아침이에요. — 아침 · 밤 꺼짐
    ],
    jelly_cap: [
      {"id":"u_jelly_2","when":{"k":"always"},"b":0.6,"d":8.7},   // 톡씽 — 쓸 수 있으면
      {"id":"u_jelly_1","when":{"k":"foebig","n":90},"b":0.6,"d":6.1},   // 말랑잉 — 상대가 위력 90 넘게 칠 햇빛
      {"id":"u_jelly_1","when":{"k":"foebig","n":70},"b":0.6,"d":2.7},   // 말랑잉 — 상대가 위력 70 넘게 칠 햇빛
      {"id":"u_jelly_1","when":{"k":"always"},"b":0.6,"d":2.1},   // 말랑잉 — 쓸 수 있으면
    ],
    blade_vine: [
      {"id":"u_blade_2","when":{"k":"always"},"b":0.6,"d":1.7},   // 칼날 잎 — 쓸 수 있으면
    ],
    draco_fruit: [
      {"id":"u_draco_1","when":{"k":"always"},"b":0.6,"d":2.5},   // 내가 용이될 상이요? — 쓸 수 있으면
      {"id":"u_draco_2b","when":{"k":"always"},"b":-50,"d":0,"audit":1},   // 용과 먹기 — 쓸 수 있으면
      {"id":"u_draco_2b","when":{"k":"melow","x":0.5},"b":53,"d":4.8,"audit":1},   // 용과 먹기 — 내 체력 < 50%
    ],
    ember_cap: [
      {"id":"u_emcap_2","when":{"k":"always"},"b":0.6,"d":4.2},   // 따끈 이불 — 쓸 수 있으면
    ],
    mask_vine: [
      {"id":"u_tal_2b","when":{"k":"always"},"b":0.6,"d":9.1},   // 웃는 탈 — 쓸 수 있으면
    ],
    drum_cactus: [
      {"id":"u_drum_1","when":{"k":"always"},"b":0.6,"d":1.9},   // 북채 번개 — 쓸 수 있으면
    ],
    jar_cactus: [
      {"id":"u_jar_2b","when":{"k":"always"},"b":0.6,"d":4.1},   // 물 길어 오기 — 쓸 수 있으면
    ],
    crown_cap: [
      {"id":"u_crown_1","when":{"k":"always"},"b":0.6,"d":3.2},   // 서리 광채 — 쓸 수 있으면
    ],
    jangseung_cactus: [
      {"id":"u_jang_2","when":{"k":"melow","x":0.5},"b":0.6,"d":1.5},   // 마을 지킴이 — 내 체력 < 50%
    ],
    viking_cap: [
      {"id":"u_viking_2b","when":{"k":"always"},"b":0.6,"d":2.5},   // 얼음 뿔 찌르기 — 쓸 수 있으면
    ],
    wizard_bell: [
      {"id":"u_wizard_2","when":{"k":"always"},"b":0.6,"d":2.8},   // 별 지팡이 — 쓸 수 있으면
    ],
    ninja_vine: [
      {"id":"u_ninja_2","when":{"k":"always"},"b":0.6,"d":4.7},   // 그림자 분신 — 쓸 수 있으면
    ],
    miner_cap: [
      {"id":"u_miner_1","when":{"k":"always"},"b":0.6,"d":6.1},   // 곡괭이 찍기 — 쓸 수 있으면
      {"id":"u_miner_2","when":{"k":"always"},"b":0.6,"d":0.8},   // 헬멧 단단히 — 쓸 수 있으면
    ],
  },
  2: {   // 성체 — Lv6 대회 단계 6 몸 · 모든 종과 12판씩
    flower_grass: [
      {"id":"u_petal_3","when":{"k":"always"},"b":0.6,"d":2.1},   // 검방술(오의) — 쓸 수 있으면
    ],
    thorn: [
      {"id":"u_thorn_2","when":{"k":"always"},"b":0.6,"d":16.5},   // 기습 — 쓸 수 있으면
      {"id":"u_thorn_3c","when":{"k":"always"},"b":-50,"d":0,"audit":1},   // 폭발은 예술이지 — 쓸 수 있으면
      {"id":"u_thorn_3c","when":{"k":"trap","n":2},"b":53,"d":3.6,"audit":1},   // 폭발은 예술이지 — 덫 ≥ 2
    ],
    aqua: [
      {"id":"u_aqua_1","when":{"k":"always"},"b":0.6,"d":29},   // 치유의 물 — 쓸 수 있으면
      {"id":"u_aqua_1","when":{"k":"melow","x":0.5},"b":0.6,"d":5.3},   // 치유의 물 — 내 체력 < 50%
    ],
    flower_wind: [
      {"id":"u_wind_1","when":{"k":"always"},"b":0.6,"d":8.7},   // 바람의 춤 — 쓸 수 있으면
      {"id":"u_wind_3","when":{"k":"always"},"b":0.6,"d":2.1},   // 칼춤 — 쓸 수 있으면
    ],
    spark: [
      {"id":"u_spark_3b","when":{"k":"always"},"b":0.6,"d":10.4},   // 번쩍 별 — 쓸 수 있으면
      {"id":"u_spark_3b","when":{"k":"nofx","r":"shock"},"b":0.6,"d":2.3},   // 번쩍 별 — 상대 shock 없음
    ],
    vine_water: [
      {"id":"u_tide_2","when":{"k":"always"},"b":0.6,"d":2.5},   // 조류 휘감기 — 쓸 수 있으면
      {"id":"u_tide_3b","when":{"k":"always"},"b":0.6,"d":1.5},   // 소용돌이 덩굴 — 쓸 수 있으면
    ],
    cactus_fire: [
      {"id":"u_ember_2","when":{"k":"always"},"b":0.6,"d":6.3},   // 불가시 난사 — 쓸 수 있으면
      {"id":"u_ember_2","when":{"k":"nofx","r":"burn"},"b":0.6,"d":4},   // 불가시 난사 — 상대 burn 없음
    ],
    flower_fire: [
      {"id":"u_blaze_2b","when":{"k":"always"},"b":0.6,"d":5.7},   // 불꽃 찌르기 — 쓸 수 있으면
      {"id":"u_blaze_2b","when":{"k":"nofx","r":"burn"},"b":0.6,"d":0.6},   // 불꽃 찌르기 — 상대 burn 없음
    ],
    cactus_wind: [
      {"id":"u_gale_1","when":{"k":"nofx","r":"gale"},"b":0.6,"d":10.4},   // 시작의 공명 — 상대 gale 없음
    ],
    vine_wind: [
      {"id":"u_gvine_1","when":{"k":"always"},"b":0.6,"d":5.9},   // 그건 내 잔상인데? — 쓸 수 있으면
    ],
    spore_cap: [
      {"id":"u_spore_1","when":{"k":"always"},"b":0.6,"d":28.4},   // 포자 배양 — 쓸 수 있으면
      {"id":"u_spore_1","when":{"k":"sum","n":2},"b":0.6,"d":4.5},   // 포자 배양 — 소환수 < 2
    ],
    frost_bell: [
      {"id":"u_frost_3c","when":{"k":"always"},"b":0.6,"d":4.9},   // 예로부터 매가 약이었죠. — 쓸 수 있으면
      {"id":"u_frost_2","when":{"k":"always"},"b":0.6,"d":2.3},   // 깨트려드리죠. — 쓸 수 있으면
      {"id":"u_frost_3","when":{"k":"always"},"b":3,"d":8.5,"audit":1},   // 이제 밤이군요. — 쓸 수 있으면
    ],
    stone_cap: [
      {"id":"u_stone_2b","when":{"k":"always"},"b":0.6,"d":7.6},   // 석순 — 쓸 수 있으면
      {"id":"u_stone_1","when":{"k":"nofx","r":"stun"},"b":0.6,"d":0.8},   // 낙석 — 상대 stun 없음
      {"id":"u_stone_3","when":{"k":"always"},"b":0.6,"d":2.5},   // 용암지대 — 쓸 수 있으면
    ],
    jelly_cap: [
      {"id":"u_jelly_3","when":{"k":"always"},"b":0.6,"d":6.8},   // 부활잉 — 쓸 수 있으면
      {"id":"u_jelly_3c","when":{"k":"foebig","n":90},"b":0.6,"d":2.4},   // 너꺼잉 — 상대가 위력 90 넘게 칠 햇빛
      {"id":"u_jelly_3c","when":{"k":"foebig","n":70},"b":0.6,"d":0.7},   // 너꺼잉 — 상대가 위력 70 넘게 칠 햇빛
    ],
    fang_trap: [
      {"id":"u_fang_1","when":{"k":"always"},"b":0.6,"d":4.7},   // 깨물기 — 쓸 수 있으면
      {"id":"u_fang_3","when":{"k":"res","r":"prep","n":2},"b":0.6,"d":1.1},   // 식사시간 — prep ≥ 2
    ],
    blade_vine: [
      {"id":"u_blade_3b","when":{"k":"always"},"b":0.6,"d":7.2},   // ..력일섬! — 쓸 수 있으면
      {"id":"u_blade_2","when":{"k":"always"},"b":0.6,"d":1.1},   // 칼날 잎 — 쓸 수 있으면
    ],
    draco_fruit: [
      {"id":"u_draco_1","when":{"k":"always"},"b":0.6,"d":14},   // 내가 용이될 상이요? — 쓸 수 있으면
      {"id":"u_draco_2b","when":{"k":"always"},"b":0.6,"d":2.6},   // 용과 먹기 — 쓸 수 있으면
      {"id":"u_draco_2b","when":{"k":"melow","x":0.5},"b":0.6,"d":1.6},   // 용과 먹기 — 내 체력 < 50%
    ],
    ember_cap: [
      {"id":"u_emcap_3b","when":{"k":"always"},"b":0.6,"d":26.5},   // 불씨 포자 — 쓸 수 있으면
      {"id":"u_emcap_3b","when":{"k":"sum","n":2},"b":0.6,"d":10},   // 불씨 포자 — 소환수 < 2
    ],
    drake_cactus: [
      {"id":"u_drake_2","when":{"k":"always"},"b":0.6,"d":8.7},   // 용갑 강화 — 쓸 수 있으면
      {"id":"u_drake_3c","when":{"k":"nofx","r":"bleed"},"b":0.6,"d":2.8},   // 용의 이빨 — 상대 bleed 없음
      {"id":"u_drake_3","when":{"k":"always"},"b":-50,"d":0,"audit":1},   // 브레스 방출 — 쓸 수 있으면
      {"id":"u_drake_3","when":{"k":"res","r":"heart","n":5},"b":53,"d":2.3,"audit":1},   // 브레스 방출 — heart ≥ 5
    ],
    frost_drake: [
      {"id":"u_fdrake_3b","when":{"k":"always"},"b":0.6,"d":5.5},   // 빙결 폭풍 — 쓸 수 있으면
      {"id":"u_fdrake_2","when":{"k":"fruit","n":2},"b":0.6,"d":0.9},   // 열매 먹기 — 열매 ≥ 2
      {"id":"u_fdrake_2","when":{"k":"melow","x":0.5},"b":0.6,"d":0.9},   // 열매 먹기 — 내 체력 < 50%
      {"id":"u_fdrake_2","when":{"k":"always"},"b":0.6,"d":1.5},   // 열매 먹기 — 쓸 수 있으면
      {"id":"u_fdrake_2","when":{"k":"always"},"b":3,"d":2.6,"audit":1},   // 열매 먹기 — 쓸 수 있으면
    ],
    gat_cap: [
      {"id":"u_gat_3b","when":{"k":"always"},"b":0.6,"d":13.8},   // 선비의 꾸짖음 — 쓸 수 있으면
    ],
    mask_vine: [
      {"id":"u_tal_2b","when":{"k":"always"},"b":0.6,"d":3.2},   // 웃는 탈 — 쓸 수 있으면
      {"id":"u_tal_3","when":{"k":"nofx","r":"stun"},"b":0.6,"d":0.9},   // 대지의 탈춤 — 상대 stun 없음
    ],
    drum_cactus: [
      {"id":"u_drum_1","when":{"k":"always"},"b":0.6,"d":4},   // 북채 번개 — 쓸 수 있으면
      {"id":"u_drum_3c","when":{"k":"always"},"b":0.6,"d":1.7},   // 하늘 북 — 쓸 수 있으면
      {"id":"u_drum_1","when":{"k":"nofx","r":"shock"},"b":0.6,"d":2.8},   // 북채 번개 — 상대 shock 없음
      {"id":"u_drum_1","when":{"k":"always"},"b":-50,"d":0,"audit":1},   // 북채 번개 — 쓸 수 있으면
      {"id":"u_drum_1","when":{"k":"nofx","r":"shock"},"b":53,"d":5.1,"audit":1},   // 북채 번개 — 상대 shock 없음
    ],
    lantern_vine: [
      {"id":"u_lamp_1","when":{"k":"always"},"b":0.6,"d":5.9},   // 초롱 불빛 — 쓸 수 있으면
      {"id":"u_lamp_3c","when":{"k":"always"},"b":0.6,"d":5.9},   // 홍사초롱 — 쓸 수 있으면
    ],
    jar_cactus: [
      {"id":"u_jar_2b","when":{"k":"always"},"b":0.6,"d":6},   // 물 길어 오기 — 쓸 수 있으면
      {"id":"u_jar_2b","when":{"k":"melow","x":0.5},"b":0.6,"d":0.9},   // 물 길어 오기 — 내 체력 < 50%
      {"id":"u_jar_3","when":{"k":"nofx","r":"wet"},"b":0.6,"d":2.3},   // 물동이 내려치기 — 상대 wet 없음
    ],
    goblin_cap: [
      {"id":"u_dok_2b","when":{"k":"always"},"b":0.6,"d":3},   // 도깨비불 — 쓸 수 있으면
      {"id":"u_dok_1","when":{"k":"nofx","r":"shock"},"b":0.6,"d":2.1},   // 방망이 찌릿 — 상대 shock 없음
    ],
    crown_cap: [
      {"id":"u_crown_3","when":{"k":"always"},"b":0.6,"d":5.1},   // 빙왕의 포자 — 쓸 수 있으면
    ],
    gladi_cactus: [
      {"id":"u_gladi_2b","when":{"k":"always"},"b":0.6,"d":5.1},   // 방패 밀치기 — 쓸 수 있으면
    ],
    jangseung_cactus: [
      {"id":"u_jang_2b","when":{"k":"always"},"b":0.6,"d":11.6},   // 솔잎 가지 — 쓸 수 있으면
      {"id":"u_jang_1","when":{"k":"always"},"b":0.6,"d":3},   // 장승 눈빛 — 쓸 수 있으면
      {"id":"u_jang_2","when":{"k":"always"},"b":0.6,"d":1.3},   // 마을 지킴이 — 쓸 수 있으면
    ],
    astro_cap: [
      {"id":"u_astro_3","when":{"k":"always"},"b":0.6,"d":3.2},   // 궤도 돌진 — 쓸 수 있으면
      {"id":"u_astro_2b","when":{"k":"nofx","r":"spore"},"b":0.6,"d":1.1},   // 무중력 포자 — 상대 spore 없음
    ],
    hyunmu_cap: [
      {"id":"u_hyunmu_2","when":{"k":"always"},"b":0.6,"d":2.3},   // 거북 등껍질 — 쓸 수 있으면
    ],
    gumiho_bloom: [
      {"id":"u_gumiho_2b","when":{"k":"nofx","r":"burn"},"b":0.6,"d":2.8},   // 꼬리 불꽃 — 상대 burn 없음
    ],
    wizard_bell: [
      {"id":"u_wizard_2","when":{"k":"always"},"b":0.6,"d":5.1},   // 별 지팡이 — 쓸 수 있으면
      {"id":"u_wizard_1","when":{"k":"nofx","r":"shock"},"b":0.6,"d":2.8},   // 별빛 찌릿 — 상대 shock 없음
      {"id":"u_wizard_1","when":{"k":"always"},"b":0.6,"d":2.5},   // 별빛 찌릿 — 쓸 수 있으면
    ],
    ninja_vine: [
      {"id":"u_ninja_3b","when":{"k":"always"},"b":0.6,"d":2.1},   // 그림자 숨기 — 쓸 수 있으면
    ],
    diver_vine: [
      {"id":"u_haenyeo_3c","when":{"k":"always"},"b":0.6,"d":4.2},   // 심해 물질 — 쓸 수 있으면
      {"id":"u_haenyeo_1","when":{"k":"always"},"b":0.6,"d":1.1},   // 물질 — 쓸 수 있으면
    ],
    ranger_vine: [
      {"id":"u_ranger_1","when":{"k":"always"},"b":0.6,"d":5.3},   // 덩굴 화살 — 쓸 수 있으면
    ],
    miner_cap: [
      {"id":"u_miner_1","when":{"k":"nofx","r":"spore"},"b":0.6,"d":3.8},   // 곡괭이 찍기 — 상대 spore 없음
    ],
    snow_ballet: [
      {"id":"u_ballet_1","when":{"k":"always"},"b":0.6,"d":2.7},   // 눈꽃 회전 — 쓸 수 있으면
    ],
    volcano_cap: [
      {"id":"u_volcano_1","when":{"k":"nofx","r":"burn"},"b":0.6,"d":3.4},   // 불씨 분출 — 상대 burn 없음
      {"id":"u_volcano_1","when":{"k":"always"},"b":0.6,"d":1.5},   // 불씨 분출 — 쓸 수 있으면
      {"id":"u_volcano_1","when":{"k":"always"},"b":-50,"d":0,"audit":1},   // 불씨 분출 — 쓸 수 있으면
      {"id":"u_volcano_1","when":{"k":"nofx","r":"burn"},"b":53,"d":4,"audit":1},   // 불씨 분출 — 상대 burn 없음
    ],
    dandel_aero: [
      {"id":"u_dandel_3","when":{"k":"always"},"b":0.6,"d":2.7},   // 민들레 폭풍 — 쓸 수 있으면
    ],
  },
};
export const PLAYBOOK_META = {"0":"Lv6 대회 단계 6 몸 · 모든 종과 12판씩","1":"Lv6 대회 단계 6 몸 · 모든 종과 12판씩","2":"Lv6 대회 단계 6 몸 · 모든 종과 12판씩"};
export const PLAYBOOK = PLAYBOOK_BY[2] || {};
