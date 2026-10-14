// 종별 눈 지정 — 컨셉 그림(변환 원본) 좌표로 대략 찍으면 변환기가 근처의 가장 어두운 눈동자 덩어리로 맞춘 뒤
// 그 자리에 컨셉 눈 모양에 맞는 도트 눈(parts.mjs EYE 틀)을 그린다. 깜빡임은 이 눈 칸을 눈꺼풀로 바꿔 만든다.
//   src = 원본 그림(누끼가 있으면 누끼 그림) 기준 두 눈 가운데 대략 좌표, style = EYE 틀 이름, k·w·g·c·i·l = 틀 글자 색
export const EYES = {
  flower_grass: { src: [[586, 400], [693, 398]], style: 'lidIris', l: '#8a3048', i: '#9a5a3a', k: '#3a2228', w: '#ffffff' },
  flower_fire: { src: [[598, 448], [705, 444]], style: 'iris', k: '#5a1a14', i: '#ff7a1a', w: '#fff2c0' },   // 누끼(concept/cut) 기준
  cactus_fire: { src: [[585, 600], [775, 602]], style: 'blaze', g: '#ff8a2a', c: '#fff0a0' },
  spark: { src: [[613, 405], [722, 410]], style: 'big', k: '#4a2a5a', i: '#f0a020', w: '#ffffff' },
};
