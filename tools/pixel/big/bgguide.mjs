// 배경 그림 안내판(코덱스에 주는 자리 그림). node tools/pixel/big/bgguide.mjs [arena|title|home|nursery|explore|shop] → concept/ui/<이름>_guide.png
//  arena  = 1024×1536 = 전투 무대 도트 270×405(× 3.7926): 무대 270×348 + 아래 57칸(행동 판에 가려짐)
//  나머지 = 1024×1536 의 가운데 띠 691칸 = 화면 도트 270×600(× 2.56). 띠 밖(빗금)은 잘려 나감 — 장면만 이어서 그림
// 색 뜻: 빨간 점선 타원 = 게임이 물건을 세우는 자리(받침 윗면 등) · 파란 테 = 게임 글자·단추가 덮는 곳(차분하게) · 보라 = 게임 판이 덮는 곳(평범하게 이어서)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './engine.mjs';
const here = dirname(fileURLToPath(import.meta.url)), K = 0.4384;
const mode = process.argv[2] || 'arena';
const im = new Img(1024, 1536, '#8a8a8a');
const S = mode === 'arena' ? 1024 / 270 : 1536 / 600, OX = mode === 'arena' ? 0 : (1024 - 270 * S) / 2;
const P = (x, y) => [Math.round(OX + x * S), Math.round(y * S)];
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < 1024 && y < 1536) im.set(x, y, c); };
const box = (x, y, w, h, c) => { const [x0, y0] = P(x, y), [x1, y1] = P(x + w, y + h); for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) set(xx, yy, c); };
const ring = (cx, cy, rx, ry, c, dash = 0, th = 2) => { const n = Math.round(rx * S * 8); for (let i = 0; i < n; i++) { if (dash && Math.floor(i / dash) % 2) continue; const a = i / n * Math.PI * 2, [x, y] = P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); for (let t = -th; t <= th; t++) for (let u = -th; u <= th; u++) set(x + t, y + u, c); } };
const rect = (x, y, w, h, c) => { const [x0, y0] = P(x, y), [x1, y1] = P(x + w, y + h); for (let t = 0; t < 3; t++) { for (let xx = x0; xx < x1; xx++) { set(xx, y0 + t, c); set(xx, y1 - 1 - t, c); } for (let yy = y0; yy < y1; yy++) { set(x0 + t, yy, c); set(x1 - 1 - t, yy, c); } } };
const hatchOutside = () => { const [bx0] = P(0, 0), [bx1] = P(270, 0); for (let y = 0; y < 1536; y++) for (let x = 0; x < 1024; x++) if ((x < bx0 || x >= bx1) && (x + y) % 24 < 3) set(x, y, '#5a5a5a'); };

if (mode === 'arena') {
  box(0, 0, 270, 26, '#1c2440');                       // 하늘(우주)
  for (let r = 0; r < 7; r++) box(0, 22 + r * 12, 270, 12, r % 2 ? '#c87a3a' : '#e09a52');   // 관중석 7줄
  box(0, 104, 270, 10, '#5a5a62');                     // 낮은 벽
  box(0, 114, 270, 405 - 114, '#b4b4b4');              // 바닥
  ring(135, 226, 112, 112 * K, '#7a7a7a'); ring(135, 226, 56, 56 * K, '#7a7a7a');
  ring(76, 302, 42, 42 * K, '#e02020', 14, 3); ring(194, 142, 40, 40 * K, '#e02020', 14, 3);
  rect(6, 6, 132, 60, '#2050e0'); rect(132, 290, 132, 46, '#2050e0');
  box(0, 348, 270, 405 - 348, '#7a4a9a');
} else if (mode === 'title') {   // 밤하늘 + 떠 있는 섬(윗면 = 빨간 타원, 식물은 게임이 가운데 세움) · 위 = 제목 글자 · 아래 = 단추 둘
  box(0, 0, 270, 600, '#26305a');
  ring(135, 258, 58, 58 * K, '#e02020', 14, 3);
  rect(30, 46, 210, 82, '#2050e0'); rect(55, 425, 160, 76, '#2050e0');
  hatchOutside();
} else if (mode === 'home') {   // 함선 식물 방: 위 띠 = 상단 정보줄, 오른쪽 = 가방·도감 단추, 가운데 받침 윗면 = 빨간 타원, 아래 = 정보 판·하단 탭(보라)
  box(0, 0, 270, 330, '#5a6a7a'); box(0, 230, 270, 100, '#7a7a82');
  ring(135, 254, 46, 46 * K, '#e02020', 14, 3);
  rect(0, 0, 270, 28, '#2050e0'); rect(232, 36, 36, 82, '#2050e0');
  box(0, 332, 270, 268, '#7a4a9a');
  hatchOutside();
} else if (mode === 'nursery') {   // 온실: 위 = 정보줄·제목, 가운데 = 화분 카드 여섯 장(보라 — 틈만 보임), 아래 = 전체 수확 단추·하단 탭
  box(0, 0, 270, 600, '#8a9a7a');
  rect(0, 0, 270, 52, '#2050e0');
  for (let i = 0; i < 6; i++) box(8 + (i % 2) * 131, 54 + Math.floor(i / 2) * 120, 123, 112, '#7a4a9a');
  rect(25, 512, 220, 36, '#2050e0'); box(0, 556, 270, 44, '#7a4a9a');
  hatchOutside();
} else if (mode === 'explore') {   // 별 지도: 가운데 = 궤도 고리 넷(게임이 그림 — 차분하게), 아래 = 행성 정보 판(보라)
  box(0, 0, 270, 600, '#1c2440');
  for (const [rx, ry] of [[46, 26], [74, 42], [100, 57], [124, 71]]) ring(135, 196, rx, ry, '#e02020', 14, 2);
  rect(0, 0, 270, 28, '#2050e0'); box(0, 300, 270, 300, '#7a4a9a');
  hatchOutside();
} else if (mode === 'shop') {   // 함선 장터: 위 = 정보줄·차양, 가운데 = 상품 카드(보라 — 틈만 보임)
  box(0, 0, 270, 600, '#6a6a7a');
  rect(0, 0, 270, 52, '#2050e0'); box(8, 60, 254, 480, '#7a4a9a'); box(0, 556, 270, 44, '#7a4a9a');
  hatchOutside();
}
mkdirSync(resolve(here, 'concept', 'ui'), { recursive: true });
const out = resolve(here, 'concept', 'ui', mode + '_guide.png');
writeFileSync(out, im.png());
console.log('안내판 →', out);
