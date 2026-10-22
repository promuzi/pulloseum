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
// 6) 45종 규칙: 후보 A · B · C 가 있고 고른 것이 그중 하나 · 띠 모양
const roster = eval(readFileSync(new URL('../../v2/src/art/sprites.js', import.meta.url), 'utf8').match(/export const ROSTER = (\[[^\]]*\])/)[1]);
const missing = roster.filter(k => !SHINY_RULES[k]);
t('모든 종에 규칙(' + missing.join(' ') + ')', !missing.length);
let shape = true;
for (const [k, R] of Object.entries(SHINY_RULES)) {
  if (!['A', 'B', 'C'].includes(R.pick)) shape = false;
  for (const v of ['A', 'B', 'C']) for (const b of R[v] || []) if (b.tint ? !(Array.isArray(b.tint) && b.tint.length === 2) : !(Array.isArray(b.h) && b.h.length === 2 && typeof b.to === 'number')) { shape = false; console.log('모양 틀림', k, v, JSON.stringify(b)); }
}
t('규칙 모양', shape);
console.log(bad ? `색 변종 시험 ${ok}/${ok + bad}` : `색 변종 시험 ${ok}개 통과`);
process.exit(bad ? 1 : 0);
