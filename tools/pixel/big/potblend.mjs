// 화분에 심기: 화분 뒤(흙·안쪽 벽) → 식물 → 흙 덮기(밑동이 흙에서 자라 나오게) → 화분 앞(테·몸통)
// 흙 덮기(2026-10-15 사용자 "흙과 식물의 경계가 손실되는 경우가 많다 — 자연스러운 경계로"):
//  ① 흙 가운데 줄에서 화분 가운데에 가장 가까운 식물 칸 묶음 = 밑동 구간. 그 기둥들에서 흙 선(기둥마다 0·1칸 들쭉날쭉)보다 아래,
//     흙 타원 안, 최대 3줄까지의 식물 칸을 흙 무늬로 덮는다 — 직선으로 잘린 듯한 경계 대신 흙에서 솟은 듯
//  ② 흙에 닿는 밑동 맨 아래 한 줄은 살짝 어둡게(흙 그늘), 밑동 양옆 흙 2칸은 어둡게(닿은 그림자)
//  흙 위에 놓인 것(연잎·돌주먹 앞쪽)은 3줄 넘게는 덮지 않아 그대로 보인다
//  앞뒤 가르기(가상 3D, 2026-10-15 사용자 "바위 선인장이 화분을 뚫고 나온 듯 — 자연스럽게"): 테 높이 아래에서 테 안쪽 타원 밖에 있는 식물 칸
//  (입구보다 넓게 나온 몸통 옆·돌주먹·테에 걸친 잎)은 테 위에 걸친 것이므로 화분 앞판보다 앞에 그린다. 입구 안쪽은 앞 테 뒤(화분 속).
import { W, H } from './parts.mjs';
import { POT_GEO as P, RIM_GEO as RG } from './pot3d.mjs';
import { Img } from './engine.mjs';

const inSoil = (x, y) => ((x + 0.5 - P.cx) / P.a) ** 2 + ((y + 0.5 - P.cy) / P.b) ** 2 <= 1;
const shade = (im, x, y, f) => { const k = (y * W + x) * 4; for (let c = 0; c < 3; c++) im.data[k + c] = Math.round(im.data[k + c] * f); };
const outsideRim = (x, y) => ((x + 0.5 - RG.cx) / RG.rin) ** 2 + ((y + 0.5 - RG.cy) / (RG.rin * RG.k)) ** 2 > 1;

export function plantInPot(plant, pot, bg = null, opt = {}) {   // opt = { sink, frontMask } — plantLayers 와 같음
  const { under, over } = plantLayers(plant, pot, opt), out = new Img(W, H, bg);
  out.blit(pot.back, 0, 0); out.blit(under, 0, 0); out.blit(pot.front, 0, 0); out.blit(over, 0, 0);
  return out;
}

// 화분 종류와 상관없이 끼울 수 있게 두 층으로 나눈다(게임이 화분 뒤 → under → 화분 앞 → over 순으로 그림):
//  under = 식물 + 흙 덮기(밑동을 덮은 흙 무늬·닿은 그림자 — 흙은 다섯 화분 모두 같은 재질), over = 화분 앞판보다 앞에 나온 덩어리
//  frontMask(판 칸 Uint8Array) = 화분 앞에 둘 부위(convert.mjs FRONT — 종마다 원화 다각형): 그 칸의 식물은 늘 앞판보다 앞 · 흙으로 안 덮음
//   (2026-10-17 사용자 "바위 선인장의 손은 어색하게 화분에 붙어 있어 — 신체별로 화분 밖에 손을 꺼내 놓는 느낌으로, 화분과 신체 중 어디를 나오게 할지 구분")
export function plantLayers(plant, pot, { cover = true, front = true, sink = 0, frontMask = null } = {}) {
  const under = new Img(W, H), over = new Img(W, H), tmp = new Img(W, H);
  tmp.blit(pot.back, 0, 0); tmp.blit(plant, 0, 0);
  const hide = cover ? soilCover(tmp, plant, pot, { sink, frontMask }) : null;
  for (let i = 0; i < W * H; i++) {
    const k = i * 4, b = pot.back.data;
    if (plant.data[k + 3] >= 128 || tmp.data[k] !== b[k] || tmp.data[k + 1] !== b[k + 1] || tmp.data[k + 2] !== b[k + 2] || tmp.data[k + 3] !== b[k + 3]) { under.data.set(tmp.data.subarray(k, k + 4), k); under.data[k + 3] = 255; }
  }
  if (front) {
    // 테 높이 아래·입구 밖 식물 칸을 4방향으로 이은 덩어리 중, 테 바깥 테두리보다 1.5칸 넘게 밖까지 뻗은 것만 앞으로(테에 걸쳐 밖으로 나온 것)
    // — 테 띠 안에만 걸친 것(흙 위 연잎 가장자리)은 화분 속이라 테 뒤에 둔다(아쿠아벌브 2026-10-15)
    const y0 = Math.floor(RG.cy - RG.rin * RG.k * 0.2), q = new Uint8Array(W * H), seen = new Uint8Array(W * H);
    const beyond = (x, y) => ((x + 0.5 - RG.cx) / (RG.rout + 1.5)) ** 2 + ((y + 0.5 - RG.cy) / ((RG.rout + 1.5) * RG.k)) ** 2 > 1;
    for (let y = y0; y < H; y++) for (let x = 0; x < W; x++) if (plant.data[(y * W + x) * 4 + 3] >= 128 && outsideRim(x, y) && !(hide && hide[y * W + x])) q[y * W + x] = 1;
    for (let i = 0; i < W * H; i++) {
      if (!q[i] || seen[i]) continue;
      const st = [i], comp = [];
      seen[i] = 1;
      let far = false;
      while (st.length) {
        const j = st.pop(), x = j % W, y = (j - x) / W;
        comp.push(j);
        if (beyond(x, y)) far = true;
        for (const k of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, j - W, j + W]) if (k >= 0 && k < W * H && q[k] && !seen[k]) { seen[k] = 1; st.push(k); }
      }
      if (far) for (const j of comp) if (pot.front.data[j * 4 + 3] >= 128) over.data.set(plant.data.subarray(j * 4, j * 4 + 4), j * 4);
    }
  }
  if (frontMask) for (let i = 0; i < W * H; i++) if (frontMask[i] && plant.data[i * 4 + 3] >= 128) over.data.set(plant.data.subarray(i * 4, i * 4 + 4), i * 4);
  return { under, over };
}

// 흙 덮기 2(2026-10-17 사용자 "식물과 흙의 경계가 너무 일자가 되지 않게 자연스럽게" · "화단에 박힌 불꽃 선인장이 좀 뒤쪽"):
//  줄기(밑동) 덩어리 = 흙 가운데 줄 위로 6칸 넘게 이어진 열들 중 화분 가운데에 가장 가까운 것. 그 기둥들은 흙 선이 가로 한 줄이 아니라
//  밑동이 흙에 닿는 둘레의 앞쪽 호(가운데가 가장 낮고 양옆이 높게 — 반폭 × 흙 타원 납작함)를 따라가고, 칸마다 0~1칸 울퉁불퉁 + 가끔 흙덩이가
//  밑동 위로 한 칸 묻음. 덮는 두께 = 3줄 + sink(convert SINK — 흙에 앉힌 만큼은 흙 속). 밑동 밖(흙 위에 놓인 잎 · 돌주먹)은 전처럼 3줄만.
//  덮인 칸(흙 속)은 돌려줘서 앞판보다 앞에 그리는 덩어리에서 뺌(앉힌 몸통 아래가 화분 앞에 튀어나오지 않게)
export function soilCover(out, plant, pot, { sink = 0, frontMask = null } = {}) {
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && plant.data[(y * W + x) * 4 + 3] >= 128;
  const row = Math.floor(P.cy), c = Math.round(P.cx), hide = new Uint8Array(W * H);
  let found = -1;
  for (let d = 0; d < P.a && found < 0; d++) { if (on(c - d, row)) found = c - d; else if (on(c + d, row)) found = c + d; }
  if (found < 0) return hide;
  let l = found, r = found;
  while (on(l - 1, row)) l--;
  while (on(r + 1, row)) r++;
  // 줄기 덩어리(tl..tr)
  const run = x => { let n = 0; for (let y = row - 1; y >= 0 && on(x, y); y--) n++; return n; };
  let tl = -1, tr = -1, best = 1e9;
  for (let x = l; x <= r; x++) {
    if (run(x) < 6) continue;
    let e = x; while (e + 1 <= r && run(e + 1) >= 6) e++;
    const d = Math.abs((x + e + 1) / 2 - P.cx);
    if (d < best) { best = d; tl = x; tr = e; }
    x = e;
  }
  const hsh = x => ((x + 11) * 2654435761 >>> 0) % 7;   // 칸마다 정해진 들쭉날쭉(장마다 같게)
  const kk = P.b / P.a, tc = (tl + tr + 1) / 2, tr2 = Math.max(1, (tr - tl + 1) / 2), deep = 3 + Math.max(0, Math.round(sink));
  const coverAt = (x, y, deepOk) => { if (!on(x, y) || (!deepOk && outsideRim(x, y)) || (frontMask && frontMask[y * W + x])) return; const k = (y * W + x) * 4; out.data.set(pot.back.data.subarray(k, k + 4), k); hide[y * W + x] = 1; };   // deepOk = 줄기 기둥(흙 속은 테 밖이라도 화분 속 — 앞에 안 그림)
  for (let x = l; x <= r; x++) {
    const h = hsh(x), trunk = tl >= 0 && x >= tl && x <= tr;
    let top, depth;
    if (trunk) {
      const dx = (x + 0.5 - tc) / tr2, arc = Math.round(kk * tr2 * Math.sqrt(Math.max(0, 1 - dx * dx)) * (sink ? 1 : 0.35));
      top = row + arc + (h === 0 ? -1 : h < 3 ? 1 : 0); depth = deep + 1;
    } else { top = row + (h < 4 ? 1 : 0); depth = 3; }
    for (let y = top; y < top + depth && y < H; y++) if (trunk || inSoil(x, y)) coverAt(x, y, trunk);
    if (on(x, top - 1) && !hide[(top - 1) * W + x]) shade(out, x, top - 1, 0.82);
    if (trunk && h === 5 && on(x, top - 1) && inSoil(x, top - 1)) coverAt(x, top - 1);   // 흙덩이가 밑동에 묻음
  }
  for (const [x, f] of [[l - 1, 0.68], [l - 2, 0.84], [r + 1, 0.68], [r + 2, 0.84]]) for (let y = row - 1; y <= row + 1; y++) if (inSoil(x, y) && !on(x, y)) shade(out, x, y, f);
  return hide;
}
