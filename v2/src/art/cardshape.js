// 카드 테 모양 시안 ㉢(2026-10-29 사용자 '카드 테두리는 하스스톤이나 다른 게임들 참고해봐 … 글자 배경색으로 차이주는 건 별로야. 테두리 형태에 변화를 주거나 방어의 경우 방패 형태에 금속 질감을 주거나'):
//  하는 일 다섯 묶음(skillcard.js frameKind)을 테의 모양(실루엣) + 재질로 가름 — 슬레이 더 스파이어 = 종류마다 틀 모양(공격 = 아래가 좁아지는 틀 · 스킬 = 네모 · 파워 = 둥근 틀),
//  MTG = 같은 흰 계열이 헷갈려 아티팩트 틀을 짙은 쇠로 바꿈(색만으론 부족 → 재질도), 하스스톤 = 종류마다 그림 틀 모양 · 가운데 보석 = 희귀도.
//  공격 = 칼끝 테(위가 가운데로 솟고 아래 모서리를 비스듬히 · 달군 붉은 쇠 · 솟은 날에 흰 칼날 빛) · 자세 = 방패 테(아래가 뾰족하게 모임 · 강철 3칸 · 가로 결 · 징)
//  강화·회복 = 덩굴 테(둥근 모서리 · 초록 덩굴이 비스듬히 감김 · 위 양 모서리에 잎) · 방해 = 가시 테(양옆에 가시 · 짙은 보라 가시덤불)
//  환경 = 두루마리 테(위아래 말린 막대 + 금 꼭지 · 몸은 양옆이 안으로 · 양피지) · 고른 카드 = 같은 모양 금빛 · 변이 = 같은 모양 변이 색
//  모양 = 줄마다 한 토막 [왼, 오른] → 바깥에서 몇 칸째인지(d)로 먹선 1 · 재질 T칸(바깥 쪽이 위·왼이면 빛 · 아래·오른이면 그늘) · 안 먹선 1. (모양 · 크기 · 재질)마다 한 번 구워 둠
const INK = '#0b1322';
export const MAT = {
  atk: ['#9a3a22', '#ff9a6a', '#3e120a', '#ffe6c0'],     // [속, 빛, 그늘, 날 빛] 달군 붉은 쇠
  stance: ['#8797ae', '#eef4fb', '#38465a', '#ffffff'],  // 강철
  self: ['#4a9238', '#b4ea84', '#1c4418', '#e8ffd0'],    // 덩굴
  hex: ['#5e3290', '#c89cff', '#22103a', '#f0dcff'],     // 가시덤불
  field: ['#b08448', '#f4d898', '#56391a', '#fff2c8'],   // 양피지 · 나무
  lit: ['#d8a840', '#fff3c8', '#7a4e14', '#ffffff'],     // 고른 카드 = 금
};
const T = { atk: 3, stance: 3, self: 3, hex: 2, field: 2 };   // 재질 두께(2칸이던 첫 판은 폰 크기에서 모양이 약했음 · 가시 · 두루마리는 몸이 안으로 들어가 2칸 — 3칸이면 이름이 두 줄로 밀림)
// 글 자리: 그림 위 끝(위에서) · 그림 높이 · 이름 띠 아래 끝(아래에서)
export const LAYOUT = { atk: { ay: 5, ah: 52, be: 7 }, stance: { ay: 5, ah: 50, be: 13 }, self: { ay: 5, ah: 51, be: 6 }, hex: { ay: 4, ah: 52, be: 5 }, field: { ay: 7, ah: 49, be: 8 } };
const round = Math.round, NOTCH = 57;   // NOTCH = 공격 테 V 홈 줄(그림 아래 끝)
// 줄 j의 [왼, 오른](없으면 null)
const SPAN = {
  atk(j, w, h) {   // 칼날: 네 모서리를 비스듬히 자름(위 5 · 아래 9 — 위는 해 · 칼 배지에 가려 작게) · 그림과 이름 띠 사이 양옆에 V 홈 4칸(칼 코등이 자리)
    let ins = j < 5 ? 5 - j : j > h - 10 ? j - (h - 10) : 0;
    const nj = Math.abs(j - NOTCH); if (nj <= 4) ins = Math.max(ins, 4 - nj);
    return [ins, w - 1 - ins];
  },
  stance(j, w, h) {   // 방패: 위 모서리 둥글게 · 아래 14줄이 가운데 끝으로 모임(바깥으로 부푼 곡선)
    const c = (w - 1) / 2, P = 14;
    if (j < 3) { const k = [2, 1, 0][j]; return [k, w - 1 - k]; }
    if (j >= h - P) { const q = (j - (h - P) + 1) / P, ins = c * (1 - Math.cos(q * Math.PI / 2)); return [round(Math.min(c - 0.5, ins)), round(Math.max(c + 0.5, w - 1 - ins))]; }
    return [0, w - 1];
  },
  self(j, w, h) {   // 덩굴: 둥근 모서리(반지름 11)
    const R = 11, d = j < R ? R - j - 0.5 : j > h - 1 - R ? j - (h - 1 - R) - 0.5 : 0, ins = d > 0 ? round(R - Math.sqrt(Math.max(0, R * R - d * d))) : 0;
    return [ins, w - 1 - ins];
  },
  hex(j, w, h) {   // 가시: 몸은 양옆 3칸 안 · 8줄째부터 12줄마다 가시(밖으로 3칸 — 끝이 위로 굽은 갈고리) · 모서리 2
    const ph = (j - 8) % 12, thorn = j >= 8 && j <= h - 10 && ph >= 0 && ph < 5 ? [2, 3, 3, 2, 1][ph] : 0, cr = j < 2 || j > h - 3 ? 2 - Math.min(j, h - 1 - j) : 0, ins = 3 - thorn + cr;
    return [ins, w - 1 - ins];
  },
  field(j, w, h) {   // 두루마리: 위아래 7줄 = 말린 막대(끝 둥글게) · 몸 = 양옆 3칸 안
    const R = 7, P = [2, 1, 0, 0, 0, 1, 2];
    if (j < R || j >= h - R) { const k = j < R ? j : h - 1 - j; return [P[k], w - 1 - P[k]]; }
    return [3, w - 4];
  },
};
const cacheD = new Map();
function depth(kind, w, h) {   // 칸마다 바깥에서 몇 칸째(0 = 밖) — 네 방향 거리
  const key = kind + w + 'x' + h; let D = cacheD.get(key); if (D) return D;
  D = new Int16Array(w * h); const q = [];
  for (let j = 0; j < h; j++) { const s = SPAN[kind](j, w, h); for (let i = 0; i < w; i++) { const inn = s && i >= s[0] && i <= s[1]; D[j * w + i] = inn ? 9999 : 0; } }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; if (!D[k]) continue; if (i === 0 || j === 0 || i === w - 1 || j === h - 1 || !D[k - 1] || !D[k + 1] || !D[k - w] || !D[k + w]) { D[k] = 1; q.push(k); } }
  for (let qi = 0; qi < q.length; qi++) { const k = q[qi], i = k % w, j = (k / w) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= w || jj >= h) continue; const n = jj * w + ii; if (D[n] > D[k] + 1) { D[n] = D[k] + 1; q.push(n); } } }
  cacheD.set(key, D); return D;
}
// 안쪽(먹선 안 = 그림 · 이름 띠가 들어갈 자리) · 바깥 모양을 자르는 길(Path2D — 카드 자리 (0,0) 기준)
const cacheP = new Map();
export function shapePath(kind, w, h, inner) {
  const key = kind + w + 'x' + h + (inner ? 'i' : 'o'); let P = cacheP.get(key); if (P) return P;
  const D = depth(kind, w, h), lim = inner ? T[kind] + 2 : 1; P = new Path2D();
  for (let j = 0; j < h; j++) { let i0 = -1; for (let i = 0; i <= w; i++) { const on = i < w && D[j * w + i] >= lim; if (on && i0 < 0) i0 = i; else if (!on && i0 >= 0) { P.rect(i0, j, i - i0, 1); i0 = -1; } } }
  cacheP.set(key, P); return P;
}
// 안쪽 줄 j의 너비(이름 글 줄 바꿈 폭)
export function innerSpan(kind, w, h, j) { const D = depth(kind, w, h), lim = T[kind] + 2; let l = -1, r = -1; for (let i = 0; i < w; i++) if (D[j * w + i] >= lim) { if (l < 0) l = i; r = i; } return l < 0 ? null : [l, r]; }
// 둘레 빛(쓸 수 있는 손패 — battle.js cardGlow와 같은 세 겹 계단: 1칸 0.57 · 2칸 0.29 · 3칸 0.18) · 모양 밖 3칸까지 — (w + 6)×(h + 6), 그릴 땐 (x - 3, y - 3)
const cacheH = new Map();
export function haloCanvas(kind, w, h, col) {
  const key = kind + w + 'x' + h + col; let cv = cacheH.get(key); if (cv) return cv;
  const D = depth(kind, w, h), W = w + 6, H = h + 6, inside = (i, j) => i >= 0 && j >= 0 && i < w && j < h && D[j * w + i] > 0, [r, g, b] = hexRgb(col);
  cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), id = c.createImageData(W, H), px = id.data;
  for (let J = 0; J < H; J++) for (let I = 0; I < W; I++) {
    const i = I - 3, j = J - 3; if (inside(i, j)) continue;
    let best = 9; for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) if (inside(i + di, j + dj)) best = Math.min(best, Math.max(Math.abs(di), Math.abs(dj)));
    if (best > 3) continue;
    const k = (J * W + I) * 4; px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = round(255 * [0, 0.57, 0.29, 0.18][best]);
  }
  c.putImageData(id, 0, 0); cacheH.set(key, cv); return cv;
}
const hexRgb = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return A.map((v, i) => round(v + (B[i] - v) * k)); };
const cacheR = new Map();
// 테 한 장(바깥 먹선 · 재질 · 안 먹선 + 무늬) — mat = [속, 빛, 그늘, 날 빛]
export function ringCanvas(kind, w, h, mat) {
  const key = kind + w + 'x' + h + mat.join(''); let cv = cacheR.get(key); if (cv) return cv;
  const D = depth(kind, w, h), t = T[kind], [mid, hi, lo, edge] = mat;
  cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'), id = c.createImageData(w, h), px = id.data;
  const put = (i, j, rgb, a = 255) => { const k = (j * w + i) * 4; px[k] = rgb[0]; px[k + 1] = rgb[1]; px[k + 2] = rgb[2]; px[k + 3] = a; };
  const ink = hexRgb(INK), dAt = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : D[j * w + i]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const d = D[j * w + i]; if (!d || d > t + 2) continue;
    if (d === 1) { put(i, j, ink); continue; }
    if (d === t + 2) { put(i, j, ink, 220); continue; }
    const up = dAt(i, j - 1) < d, left = dAt(i - 1, j) < d, down = dAt(i, j + 1) < d, right = dAt(i + 1, j) < d, outer = d === 2;   // 바깥 쪽이 어느 방향인가
    let col = up || left ? (outer ? hi : mix(mid, hi, 0.45)) : down || right ? (outer ? lo : mix(mid, lo, 0.45)) : mid;
    if (typeof col === 'string') col = hexRgb(col);
    // 재질 무늬
    if (kind === 'stance' && !up && !down && j % 3 === 0) col = mix(mid, hi, 0.3);   // 강철 가로 결
    if (kind === 'atk' && outer && (j < 5 || j > h - 9 || Math.abs(j - NOTCH) <= 3) && (i < 9 || i > w - 10)) col = hexRgb(edge);   // 비스듬히 자른 모서리 · V 홈 = 흰 칼날 빛
    if (kind === 'atk' && !outer && ((i * 7 + j * 3) % 23 === 0)) col = mix(mid, '#ff7a2a', 0.6);   // 달군 쇠 불티 점
    if (kind === 'self' && (i + j) % 6 < 2 && !up && !left) col = mix(mid, lo, 0.55);   // 덩굴이 비스듬히 감김
    if (kind === 'hex' && (i * 5 + j * 11) % 17 === 0) col = mix(mid, lo, 0.7);        // 가시덤불 얼룩
    if (kind === 'field' && (j < 7 || j >= h - 7)) { const k = j < 7 ? j : j - (h - 7); col = hexRgb(['#f6d8a0', '#e0b478', '#c8985a', '#ac7c42', '#8e6230', '#6e4820', '#523414'][k]); if (i <= 4 || i >= w - 5) col = hexRgb(k < 2 ? '#fff6d0' : k < 4 ? '#f0c050' : k < 6 ? '#b8862a' : '#7a5414'); }   // 말린 막대(위 빛 → 아래 그늘 · 원통) + 양 끝 금 꼭지
    put(i, j, col);
  }
  c.putImageData(id, 0, 0);
  deco(c, kind, w, h, mat);
  cacheR.set(key, cv); return cv;
}
function deco(c, kind, w, h, [mid, hi, lo, edge]) {
  const P = (x, y, col) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
  const cx = Math.floor((w - 1) / 2);
  if (kind === 'stance') {   // 징: 위 셋 · 양옆 둘씩 · 아래 끝 하나(어두운 테 + 흰 점)
    const riv = (x, y) => { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) P(x + dx, y + dy, lo); P(x, y, '#ffffff'); P(x + 1, y + 1, INK); };
    for (const [x, y] of [[6, 2], [cx, 2], [w - 7, 2], [2, 24], [w - 3, 24], [2, 50], [w - 3, 50]]) riv(x, y);
  } else if (kind === 'self') {   // 모서리 잎 셋(7칸 · 잎맥 — 왼쪽 위는 비용 해 자리라 뺌) + 옆 덩굴손 말림
    const L = ['...aaa...', '..abbba..', '.abbbbba.', 'abbbcbbba', 'abbcbbbba', '.abcbbba.', '..aaaaa..'], LF = ['#e8ff9a', '#a6e05a', '#4a8a26'];   // 잎 = 테보다 밝은 연두(같은 초록이면 테에 묻힘)
    const leaf = (x, y, fx, fy) => L.forEach((r, jj) => { for (let ii = 0; ii < 9; ii++) { const ch = r[ii]; if (ch === '.') continue; P(x + (fx ? 8 - ii : ii), y + (fy ? 6 - jj : jj), ch === 'a' ? INK : ch === 'c' ? LF[2] : jj + ii < 6 ? LF[0] : LF[1]); } });
    leaf(w - 9, 0, true, false); leaf(0, h - 7, false, true); leaf(w - 9, h - 7, true, true);
    for (const [x, s] of [[1, 1], [w - 2, -1]]) for (const y0 of [30, 46]) for (const [dx, dy] of [[0, 0], [s, -1], [s * 2, -1], [s * 2, 0], [s, 1]]) P(x + dx, y0 + dy, dy < 0 ? LF[0] : LF[2]);   // 덩굴손
  } else if (kind === 'hex') {   // 가시 끝(밖으로 4칸 나온 줄)을 밝게
    for (let j = 8; j <= h - 10; j++) if ((j - 8) % 12 === 1) { P(1, j, edge); P(w - 2, j, edge); P(2, j + 1, hi); P(w - 3, j + 1, hi); }
  } else if (kind === 'field') {   // 막대 가운데 줄에 감은 끈(몸 쪽으로 늘어진 짧은 매듭)
    for (const y0 of [6, h - 8]) for (const [dx, dy, col] of [[0, 0, INK], [1, 0, INK], [0, 1, '#b8462a'], [1, 1, '#e8704a'], [0, 2, INK], [1, 2, INK]]) P(cx + dx, y0 + dy, col);
  } else if (kind === 'atk') {   // 칼끝 꼭대기 반짝
    P(cx, 1, '#ffffff'); P(cx + 1, 1, '#ffffff');
  }
}
