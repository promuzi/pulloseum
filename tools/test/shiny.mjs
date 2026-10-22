// 색 변종 시험(2026-10-22): 색 왕복 · 띠 색상 돌리기 · 테두리 · 눈 · 흙 색은 그대로 · 45종 규칙 형식
import { toLch, fromLch, shinyColor, recolorData, inHue } from '../../v2/src/art/shinyColor.js';
import { SHINY_RULES } from '../../v2/src/art/shinyRules.js';
import { readFileSync } from 'node:fs';
let ok = 0, bad = 0;
const t = (name, c) => { if (c) ok++; else { bad++; console.log('실패:', name); } };
// 1) 색 왕복(채도를 줄일 일이 없는 색은 ±1)
let worst = 0;
for (let i = 0; i < 400; i++) { const r = (i * 37) % 256, g = (i * 91) % 256, b = (i * 53) % 256, [L, C, H] = toLch(r, g, b), [r2, g2, b2] = fromLch(L, C, H); worst = Math.max(worst, Math.abs(r - r2), Math.abs(g - g2), Math.abs(b - b2)); }
t('색 왕복 ±1', worst <= 1);
// 2) 빨강 띠 → 파랑
const red = shinyColor(220, 50, 60, [{ h: [0, 40], to: 262 }]), [, , Hr] = toLch(...red);
t('빨강이 파랑 쪽으로', Hr > 230 && Hr < 290);
// 3) 아주 어두운 칸 · 띠 밖 색은 그대로
t('어두운 테두리 그대로', shinyColor(30, 20, 30, [{ h: [0, 360], to: 100 }]) === null);
t('띠 밖 초록 그대로', shinyColor(60, 160, 70, [{ h: [0, 40], to: 262 }]) === null);
t('색상 범위 감김(350~20)', inHue(5, [350, 20]) && inHue(355, [350, 20]) && !inHue(100, [350, 20]));
// 4) 흰 몸 물들이기
const w = shinyColor(235, 235, 240, [{ tint: [350, 0.055], l: [0.5, 0.97], c: 0.045 }]), [, Cw] = toLch(...w);
t('흰 몸에 옅은 색', Cw > 0.01 && Cw < 0.07);
// 5) 눈(keep) · 흙(skip) 색은 그대로
const d = new Uint8Array([220, 50, 60, 255, 200, 40, 50, 255, 210, 45, 55, 255]);
recolorData(d, [{ h: [0, 40], to: 262 }], new Set([(200 << 16) | (40 << 8) | 50]), (r, g, b) => r === 210 && g === 45 && b === 55);
t('보통 칸은 바뀜', d[0] !== 220 || d[2] !== 60);
t('눈 색 그대로', d[4] === 200 && d[5] === 40 && d[6] === 50);
t('흙 색 그대로', d[8] === 210 && d[9] === 45 && d[10] === 55);
// 5-2) 위치 조건(box): 4×4 한 장(두 층) — 위 절반 빨강만 바뀌고 아래 절반 빨강은 그대로 · out 은 반대
{
  const mk = () => { const d = new Uint8Array(4 * 8 * 4); for (let i = 0; i < 32; i++) d.set([220, 50, 60, i < 16 ? 255 : 0], i * 4); return d; };   // 위 4줄 = 뒤 층(빨강) · 아래 4줄 = 앞 층(비어 있음)
  const g = { W: 4, w: 4, h: 4, cols: 1, rows: 1 }, d1 = mk(), d2 = mk();
  recolorData(d1, [{ h: [0, 40], to: 262, box: [0, 0, 1, 0.4] }], null, null, g);
  recolorData(d2, [{ h: [0, 40], to: 262, box: [0, 0, 1, 0.4], out: true }], null, null, g);
  t('box 안(맨 윗줄)만 바뀜', d1[0] !== 220 && d1[12 * 4] === 220);
  t('out = box 밖(맨 아랫줄)만 바뀜', d2[0] === 220 && d2[12 * 4] !== 220);
  const d3 = new Uint8Array([220, 50, 60, 255]);
  recolorData(d3, [{ h: [0, 40], to: 262, box: [0, 0, 1, 1] }]);
  t('칸 정보가 없으면 box 띠는 건너뜀', d3[0] === 220);
}
// 5-3) 부위(part): 이어진 덩어리를 통째로 — 큰 덩어리만(big) · 자리(at) · 테두리 넓히기(grow) · 위로만(up) · 떠다니는 것(air)
{
  const W = 10, H = 6, RED = [220, 50, 60], DARK = [50, 5, 8], g = { W, w: W, h: H, cols: 1, rows: 1 };   // 뒤 층 10×6 + 앞 층(빈) 10×6
  const mk = cells => { const d = new Uint8Array(W * H * 2 * 4); for (const [x, y, c] of cells) d.set([...c, 255], (y * W + x) * 4); return d; };
  const same = (d, x, y, c) => d[(y * W + x) * 4] === c[0] && d[(y * W + x) * 4 + 1] === c[1] && d[(y * W + x) * 4 + 2] === c[2];
  // 왼쪽 2×3 빨강 덩어리(6칸) + 오른쪽 아래 외딴 빨강 한 칸 + 큰 덩어리 위 · 아래에 짙은 빨강 테두리 + 맨 오른쪽 위 짙은 빨강
  const base = () => mk([[1, 2, RED], [2, 2, RED], [1, 3, RED], [2, 3, RED], [1, 4, RED], [2, 4, RED], [8, 5, RED], [1, 1, DARK], [2, 5, DARK], [1, 0, DARK], [9, 0, RED]]);
  const band = part => [{ h: [0, 40], to: 262, part }];
  const d1 = base(); recolorData(d1, band({ big: 1 }), null, null, g);
  t('part big: 큰 덩어리만 바뀜', !same(d1, 1, 2, RED) && same(d1, 8, 5, RED));
  const d2 = base(); recolorData(d2, band({ at: [[0.7, 0.7, 1, 1]] }), null, null, g);
  t('part at: 무게중심이 그 안인 덩어리만', same(d2, 1, 2, RED) && !same(d2, 8, 5, RED));
  const d3 = base(); recolorData(d3, band({ big: 1, grow: 1, gh: [0, 40], gl: [0.1, 0.5] }), null, null, g);
  t('part grow: 붙은 짙은 테두리도 바뀜(밝기 0.24 아래라도)', !same(d3, 1, 1, DARK) && !same(d3, 2, 5, DARK) && same(d3, 1, 0, DARK));
  const d4 = base(); recolorData(d4, band({ big: 1, up: 2, gh: [0, 40], gl: [0.1, 0.5] }), null, null, g);
  t('part up: 위로만 넓힘(아래 테두리는 그대로)', !same(d4, 1, 1, DARK) && !same(d4, 1, 0, DARK) && same(d4, 2, 5, DARK));
  const d5 = base(); recolorData(d5, band({ at: [], air: 0.95 }), null, null, g);
  t('part air: 떠 있는 칸만(at: [] = 자리로는 안 고름)', same(d5, 1, 2, RED) && !same(d5, 8, 5, RED) && !same(d5, 9, 0, RED));
  const d6 = base(); recolorData(d6, band({ big: 1 }));
  t('칸 정보가 없으면 part 띠는 건너뜀', same(d6, 1, 2, RED));
}
// 6) 45종 규칙: 후보 A · B · C 가 있고 고른 것이 그중 하나 · 띠 모양
const roster = eval(readFileSync(new URL('../../v2/src/art/sprites.js', import.meta.url), 'utf8').match(/export const ROSTER = (\[[^\]]*\])/)[1]);
const missing = roster.filter(k => !SHINY_RULES[k]);
t('모든 종에 규칙(' + missing.join(' ') + ')', !missing.length);
let shape = true;
for (const [k, R] of Object.entries(SHINY_RULES)) {
  if (!['A', 'B', 'C'].includes(R.pick)) shape = false;
  for (const S of [R, R.young, R.teen]) if (S) for (const v of ['A', 'B', 'C']) for (const b of S[v] || []) if (b.tint ? !(Array.isArray(b.tint) && b.tint.length === 2) : !(Array.isArray(b.h) && b.h.length === 2 && typeof b.to === 'number')) { shape = false; console.log('모양 틀림', k, v, JSON.stringify(b)); }
}
t('규칙 모양(단계 규칙 포함)', shape);
// 7) 단계 규칙: 어린 그림 키는 그 단계 후보를, 없는 후보 · 종은 성체 후보를
{
  const { shinyRule } = await import('../../v2/src/art/shiny.js');
  const st = Object.entries(SHINY_RULES).find(([, R]) => R.young && R.young.A);
  if (st) {
    const [k, R] = st;
    t('어린 그림 = 어린 규칙', shinyRule(k + '_young~sA', 'A') === R.young.A && shinyRule(k + '_young', 'A') === R.young.A);
    t('성체 그림 = 성체 규칙', shinyRule(k, 'A') === R.A && shinyRule(k + '_teen', 'C') === ((R.teen && R.teen.C) || R.C));
  }
  const sm = Object.entries(SHINY_RULES).find(([, R]) => R.small && R.small.A);
  if (sm) t('작은 그림 = 작은 그림 규칙', shinyRule(sm[0], 'A', 'small') === sm[1].small.A && shinyRule(sm[0], 'A') === sm[1].A);
}
console.log(bad ? `색 변종 시험 ${ok}/${ok + bad}` : `색 변종 시험 ${ok}개 통과`);
process.exit(bad ? 1 : 0);
