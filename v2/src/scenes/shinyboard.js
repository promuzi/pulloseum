// 색 변종 검토판(개발용 — tools/shots/shinyboard.mjs, 2026-10-22 사용자 "색 변종 그림부터 해줘"):
//  종마다 한 줄 = 이름 · 원본 · 후보 A · B · C(지금 고른 후보 = 금빛 테). 게임과 같은 그리기(drawBig + art/shiny.js)라 보이는 그대로가 게임 색
import { Gfx } from '../core/gfx.js';
import { drawBig } from '../art/sprites.js';
import { SPECIES } from '../game/catalog.js';
import { SHINY_RULES } from '../art/shinyRules.js';
export function shinyBoard(keys, scale = 2, stage = '') {
  const vs = ['', 'A', 'B', 'C', ...(keys.some(k => SHINY_RULES[k] && SHINY_RULES[k].D) ? ['D'] : [])];   // 후보 넷인 종(엠버캑터 — 2026-10-22)이 있으면 D 칸
  const CW = 104, CH = 118, TOP = 16, W = vs.length * CW + 8, H = TOP + keys.length * (CH + 20) + 6;
  const cv = document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale;
  const c = cv.getContext('2d'); c.setTransform(scale, 0, 0, scale, 0, 0); c.imageSmoothingEnabled = false;
  const g = new Gfx(c);
  g.rect(0, 0, W, H, '#0c1526');
  vs.forEach((t, j) => g.text(t || '원본', 4 + j * CW + CW / 2, 3, { font: 'bold', color: '#8ccfff', align: 'center' }));
  keys.forEach((k, i) => {
    const y = TOP + i * (CH + 20), pick = SHINY_RULES[k] && SHINY_RULES[k].pick;
    g.text((SPECIES[k] || {}).name || k, 6, y + 3, { font: 'bold', color: '#ffffff' });
    vs.forEach((v, j) => {
      if (v && !(SHINY_RULES[k] && SHINY_RULES[k][v])) return;   // 그 후보가 없는 종은 빈칸
      const x = 4 + j * CW;
      if (v && v === pick) g.rect(x + 1, y + 17, CW - 2, CH + 2, '#ffd84a');
      g.rect(x + 2, y + 18, CW - 4, CH, '#16233a');
      drawBig(g, (stage ? k + '_' + stage : k) + (v ? '~s' + v : ''), 'pot_terra', x + CW / 2, y + 18 + 98, { t: 0 });
    });
  });
  return cv.toDataURL('image/png');
}
