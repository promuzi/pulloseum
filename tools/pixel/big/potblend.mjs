// 화분에 심기: 화분 뒤(흙·안쪽 벽) → 식물 → 흙 덮기(밑동이 흙에서 자라 나오게) → 화분 앞(테·몸통)
// 흙 덮기(2026-10-15 사용자 "흙과 식물의 경계가 손실되는 경우가 많다 — 자연스러운 경계로"):
//  ① 흙 가운데 줄에서 화분 가운데에 가장 가까운 식물 칸 묶음 = 밑동 구간. 그 기둥들에서 흙 선(기둥마다 0·1칸 들쭉날쭉)보다 아래,
//     흙 타원 안, 최대 3줄까지의 식물 칸을 흙 무늬로 덮는다 — 직선으로 잘린 듯한 경계 대신 흙에서 솟은 듯
//  ② 흙에 닿는 밑동 맨 아래 한 줄은 살짝 어둡게(흙 그늘), 밑동 양옆 흙 2칸은 어둡게(닿은 그림자)
//  흙 위에 놓인 것(연잎·돌주먹 앞쪽)은 3줄 넘게는 덮지 않아 그대로 보인다
import { W, H } from './parts.mjs';
import { POT_GEO as P } from './pot3d.mjs';
import { Img } from './engine.mjs';

const inSoil = (x, y) => ((x + 0.5 - P.cx) / P.a) ** 2 + ((y + 0.5 - P.cy) / P.b) ** 2 <= 1;
const shade = (im, x, y, f) => { const k = (y * W + x) * 4; for (let c = 0; c < 3; c++) im.data[k + c] = Math.round(im.data[k + c] * f); };

export function plantInPot(plant, pot, bg = null, { cover = true } = {}) {
  const out = new Img(W, H, bg);
  out.blit(pot.back, 0, 0);
  out.blit(plant, 0, 0);
  if (cover) soilCover(out, plant, pot);
  out.blit(pot.front, 0, 0);
  return out;
}

export function soilCover(out, plant, pot) {
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && plant.data[(y * W + x) * 4 + 3] >= 128;
  const row = Math.floor(P.cy), c = Math.round(P.cx);
  let found = -1;
  for (let d = 0; d < P.a && found < 0; d++) { if (on(c - d, row)) found = c - d; else if (on(c + d, row)) found = c + d; }
  if (found < 0) return;
  let l = found, r = found;
  while (on(l - 1, row)) l--;
  while (on(r + 1, row)) r++;
  for (let x = l; x <= r; x++) {
    const jag = (x * 7 + 3) % 5 === 0 ? 0 : 1;
    for (let y = row + jag; y <= row + jag + 2 && y < H; y++) {
      if (!inSoil(x, y) || !on(x, y)) continue;
      const k = (y * W + x) * 4;
      out.data.set(pot.back.data.subarray(k, k + 4), k);
    }
    if (on(x, row + jag - 1)) shade(out, x, row + jag - 1, 0.82);
  }
  for (const [x, f] of [[l - 1, 0.68], [l - 2, 0.84], [r + 1, 0.68], [r + 2, 0.84]]) for (let y = row - 1; y <= row + 1; y++) if (inSoil(x, y) && !on(x, y)) shade(out, x, y, f);
}
