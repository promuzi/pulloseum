import { hud, navBar, button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { SMALL, SMALL_POT, BGIMG, BGMETA, bob } from '../art/sprites.js';
import { T, plate, holo, tbar } from '../art/theme.js';
import { plainBg } from '../art/bg.js';
import { STAGE_NAME, SPECIES } from '../data/mock.js';

// 양육 = 스마트팜(2026-10-15 사용자): 자연광 패널 천장 · 흰 세라믹 계단식 재배대 · 식물은 화분이 아니라 잔디에 심긴 모습,
//  고르면 잔디 원판이 동그랗게 올라오며 아래 화분이 함께 드러남. 열매 수·정보 = 푸른 홀로그램(원기둥 방과 같은 테마).
//  배경·자리 = tools/pixel/big/farm_bg.mjs → assets/v2/bg/nursery_farm.png + .json(식물 여섯 자리, 뒤 줄 → 앞 줄)
const FRUIT = [{ have: 3, max: 3, gauge: 1 }, { have: 1, max: 3, gauge: 0.62 }, { have: 0, max: 2, gauge: 0.18 }];
const SOIL = 38, LIFT = 12, LIFT_MS = 420;   // 작은 그림의 흙 줄(큰 판 75.7의 절반) · 솟는 높이 · 시간
const ease = k => 1 - (1 - k) ** 3;
const GR = { dark: '#16351f', mid: '#3a823e', hi: '#7ec864', blade: '#a0dc7c', hole: '#0c1810' };

function ell(g, cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) { const k = (y + 0.5 - cy) / ry; if (Math.abs(k) > 1) continue; const hw = rx * Math.sqrt(1 - k * k); g.rect(Math.round(cx - hw), y, Math.max(1, Math.round(hw * 2)), 1, col); } }
// 잔디에 심긴 식물: 흙 줄 위만 그리고, 밑동은 잔디 덤불이 덮음(흙·화분 안 보임)
function planted(g, key, sx, sy, b) {
  const im = SMALL[key]; if (!im) return;
  const x = Math.round(sx - 24), y = Math.round(sy - SOIL) - b, c = g.c;
  ell(g, sx, sy + 1, 12, 4, GR.dark);
  g.clip(x, y - 4, 48, SOIL + 4 + b, () => { c.imageSmoothingEnabled = false; c.drawImage(im, 0, 0, 48, 56, x, y, 48, 56); });
  ell(g, sx, sy, 9, 3, GR.mid); for (let i = -8; i <= 8; i += 3) g.rect(sx + i, sy - 2 - ((i + 9) % 2), 1, 2, GR.blade);
  g.clip(x, y - 4, 48, SOIL + 6 + b, () => c.drawImage(im, 0, 56, 48, 56, x, y, 48, 56));
}
// 고른 식물: 구멍 위로 잔디 원판을 인 화분이 솟음(L = 0~LIFT). 화분의 아직 구멍 속인 아래쪽은 가림.
function lifted(g, key, potKey, sx, sy, L, b) {
  const im = SMALL[key], pt = SMALL_POT[potKey] || SMALL_POT.pot_terra; if (!pt) return;
  const x = Math.round(sx - 24), y = Math.round(sy - SOIL - L), c = g.c;
  ell(g, sx, sy + 1, 13, 5, GR.hole); ell(g, sx, sy + 1, 11, 4, '#06100a');
  g.clip(0, 0, 400, sy + 2, () => {
    c.imageSmoothingEnabled = false;
    c.drawImage(pt, 0, 0, 48, 56, x, y, 48, 56);
    if (im) g.clip(x, y - 4, 48, SOIL + 4, () => c.drawImage(im, 0, 0, 48, 56, x, y - b, 48, 56));
    ell(g, sx, y + SOIL, 9, 3, GR.mid); for (let i = -8; i <= 8; i += 3) g.rect(sx + i, y + SOIL - 2 - ((i + 9) % 2), 1, 2, GR.blade);   // 화분 위 잔디 원판
    c.drawImage(pt, 0, 56, 48, 56, x, y, 48, 56);
    if (im) c.drawImage(im, 0, 56, 48, 56, x, y - b, 48, 56);
  });
}

export const nursery = {
  theme: 'room',   // 푸른 홀로그램(원기둥 방과 같은 UI)
  enter() { this.sel = 0; this.selT = -1e9; },   // 처음 고른 식물은 이미 솟아 있음
  draw(app) {
    const { g, W, H, t, state: s } = app;
    const meta = BGMETA.nursery_farm, bg = BGIMG.nursery_farm;
    if (bg) g.img(bg, 0, 0); else plainBg(g, W, H, t);
    const slots = meta ? meta.slots : [];
    // 뒤 줄 → 앞 줄 순서로(앞 식물이 뒤 식물을 가림)
    slots.forEach((sl, i) => {
      const p = s.plants[i], locked = i >= s.slots;
      if (!p) {   // 빈 자리 / 잠긴 자리 = 잔디 위 작은 홀로그램 표지
        const w = locked ? 40 : 34;
        holo(g, sl.x - w / 2, sl.y + 7, w, 14, T.deep, 8);   // 재배대 앞면에 붙은 이름표처럼
        g.text(locked ? `Lv.${4 + (i - s.slots) * 3}` : '빈 자리', sl.x, sl.y + 9, { color: T.ptext.sub, align: 'center' });
        return;
      }
      const isSel = i === this.sel, k = isSel ? ease(Math.min(1, (t - this.selT) / LIFT_MS)) : 0, b = bob(t, i * 300);
      if (isSel) lifted(g, p.key, p.pot, sl.x, sl.y, Math.round(LIFT * k), b);
      else planted(g, p.key, sl.x, sl.y, b);
      app.input.hit('nur_' + i, sl.x - 22, sl.y - 50, 44, 54, () => { if (this.sel !== i) { this.sel = i; this.selT = t; } }, 2);
      // 열매 수 홀로그램(작게, 식물 위)
      const f = FRUIT[i] || FRUIT[2], ready = f.have > 0, tw = g.textW(`${f.have}/${f.max}`) + 22, ty = sl.y + 7;   // 열매 수 = 재배대 앞면 이름표
      holo(g, sl.x - tw / 2, ty, tw, 15, ready ? T.panel : T.deep, ready ? 10 : 7);
      g.img(icon('fruit'), sl.x - tw / 2 + 4, ty + 2);
      g.text(`${f.have}/${f.max}`, sl.x - tw / 2 + 17, ty + 2, { color: ready ? T.ptext.gold : T.ptext.sub });
    });
    hud(app, s);
    g.text('양육', 12, 32, { font: 'head', color: T.text.main, outline: T.ink });
    // 고른 식물 정보(홀로그램 판): 이름·단계·열매·자람 막대 + 수확 단추
    const p = s.plants[this.sel], f = FRUIT[this.sel] || FRUIT[2], PY = 352;
    if (p) {
      plate(g, 12, PY, W - 24, 108);
      const sp = SPECIES[p.key], P = T.ptext;
      g.text(p.name, 24, PY + 10, { font: 'head', color: P.main });
      g.text(STAGE_NAME[sp.type][p.stage], 24, PY + 30, { color: P.sub });
      g.img(icon('fruit'), W - 74, PY + 12); g.text(`열매 ${f.have}/${f.max}`, W - 58, PY + 12, { color: f.have ? P.gold : P.sub });
      g.text('다음 열매까지', 24, PY + 50, { color: P.sub });
      tbar(g, 24, PY + 66, W - 48, 7, f.gauge, 'exp');
      if (f.have) button(app, 'har_one', 24, PY + 80, W - 48, 22, '수확', { style: 'teal', icon: 'fruit', onTap: () => app.toast('수확') });
      else g.text('열매 자라는 중', W / 2, PY + 84, { color: P.dim, align: 'center' });
    }
    button(app, 'har_all', 25, H - 86, W - 50, 32, '전체 수확', { style: 'gold', font: 'head', icon: 'fruit', onTap: () => app.toast('전체 수확') });
    navBar(app, 'nursery');
  },
};
