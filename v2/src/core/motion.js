// 움직임 세기(2026-10-15 "픽셀이 너무 지글거려서 어지럽다는 평가" — tools/shots/jitter.mjs 로 잰 지글거림 원인 셋을 줄이는 '차분하게'):
//  ① 식물 숨쉬기 = 그림 장을 4장씩 묶어 0.2초마다 바꿈(도트 작가식 '적은 장, 오래 머묾' — 가장자리 칸이 초당 10번 뒤집히던 것을 5번으로)
//  ② 빛기둥 안개·먼지 = 안개 무늬를 3배 느리게, 먼지는 밝기 출렁임·반짝임 없이 천천히 ③ 창밖 우주 = 별 깜빡임 3배 느리게, 행성 표면 돌기·별 흐름 2.5배 느리게.
//  켜는 법: 설정(나중) · 주소 ?calm=1 · 기기의 '동작 줄이기'(prefers-reduced-motion) · 검토 도구 window.__calm
export const MOTION = { calm: false };
try {
  const q = new URLSearchParams(location.search);
  if (q.get('calm') === '1' || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) MOTION.calm = true;
  Object.defineProperty(window, '__calm', { get: () => MOTION.calm, set: v => { MOTION.calm = !!v; }, configurable: true });
} catch {}
// 그림 장 번호: 차분하게면 hold 장씩 묶어 같은 장을 오래 보여 줌
export const frameAt = (t, frameMs, frames) => { const hold = MOTION.calm ? 4 : 1; return (Math.floor(Math.floor(t / frameMs) / hold) * hold) % frames; };
// 느리게 할 배수(차분하게면 k, 아니면 1)
export const slow = k => (MOTION.calm ? k : 1);
