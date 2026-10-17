// 그림 판(캔버스) 내용이 지워지는 것 막기(2026-10-18 사용자 "홈 버튼 눌러서 나갔다 왔더니 저리됨" — 창 바탕 · 아이콘 · 꼬리표 판이 다 빠지고 글자만 남음):
//  안드로이드 크롬 · 웹뷰는 앱이 뒤로 가면 그래픽 메모리를 비우며 GPU에 둔 판의 내용을 지울 수 있음. 화면 판은 장마다 다시 그려 돌아오지만,
//  한 번 그려 두고 다시 쓰는 판(창 바탕 · 아이콘 · 별판 · 그라데이션 · 풀 마개 …)은 빈 채로 남음.
//  → 코드가 만드는 판은 모두 CPU 판(willReadFrequently)으로 — 그래픽 메모리를 비워도 내용이 남음. 화면 판(index.html #screen)만 그대로 GPU.
//  main.js 맨 처음에 불러야 함(다른 모듈이 판을 만들기 전에)
const getContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, opts) {
  if (type === '2d' && this.id !== 'screen') opts = { ...(opts || {}), willReadFrequently: true };
  return getContext.call(this, type, opts);
};
