import { arena1 } from '../art/bg.js';
import { button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawBig, bigKey, BGIMG } from '../art/sprites.js';
import { T, plate, btnBody, padV, venueOf } from '../art/theme.js';
import { bigTitle } from './common.js';
import { closeStream } from './room.js';
import { room as R } from '../net/api.js';
import { glyphH } from '../core/text.js';

// 경기 결과: 승패 · 대회 진행(라운드 통과 · 3패면 처음부터) · 보상 카드(돈 · 재배사 경험치 · 물 · 비료) · 다음 할 일
//  app.lastResult = { win, mode('tournament'|'swap3'|'pvp'), reward, info, me:{key,pot,stage,el}, foe:{el}, why }
const WHY = { forfeit: '기권', timeout: '시간 넘김', left: '상대가 나감', ko: '' };
export const result = {
  theme(app) { return this.venue || venueOf(app.state && app.state.tournament && app.state.tournament.tier); },
  enter(p) { this.venue = p.venue || null; this.p = p; },
  draw(app) {
    const { g, W, H, t } = app, L = app.lastResult || { win: this.p.win !== 'false' && this.p.win !== false, mode: 'tournament', reward: { credits: 60, water: 1, xp: { gained: 30 } }, me: { key: 'flower_grass', pot: 'pot_terra' } };
    const win = !!L.win, rw = L.reward || {}, P = T.ptext, pvp = L.mode === 'pvp';
    g.rect(0, 0, W, H, T.bg2);
    const dy = Math.min(0, H - 600), SH = 340 + Math.round(dy * 2 / 3);   // 짧은 화면(480~599): 무대·보상 카드를 같이 올리고 식물은 조금만(제목 · 진행 알약과 안 겹치게)
    g.clip(0, 0, W, SH, () => {
      const bg = BGIMG['arena_' + T.key], ox = Math.floor((W - (bg ? bg.width : W)) / 2);
      if (bg) {   // 그림(270)보다 넓은 화면: 가운데에 두고 양옆은 그림 가장자리 한 줄을 늘여 이음
        g.c.imageSmoothingEnabled = false;
        if (ox > 0) { g.c.drawImage(bg, 0, 0, 1, bg.height, 0, 0, ox, bg.height); g.c.drawImage(bg, bg.width - 1, 0, 1, bg.height, ox + bg.width, 0, W - ox - bg.width, bg.height); }
        g.img(bg, ox, 0);
      } else arena1(g, 0, 0, W, SH, t);
      g.alpha(0.62, () => g.rect(0, 0, W, SH, T.bg));
      const cx = Math.floor(W / 2), cy = 240 + Math.round(dy * 0.15);
      if (win) {
        const n = 14, rot = t / 4000;
        g.alpha(0.35, () => { for (let i = 0; i < n; i += 2) { const a0 = rot + i * (Math.PI * 2 / n), a1 = a0 + Math.PI / n; g.poly([[cx, cy - 64], [cx + Math.cos(a0) * 240, cy - 64 + Math.sin(a0) * 240], [cx + Math.cos(a1) * 240, cy - 64 + Math.sin(a1) * 240]], T.text.gold); } });
      }
      g.dither(0, SH - 60, W, 30, T.bg2, 8);
      g.rect(0, SH - 30, W, 30, T.bg2);
      padV(g, cx, cy, 52, true);
      const me = L.me || { key: 'flower_grass', pot: 'pot_terra' };
      drawBig(g, bigKey(me.key, me.stage || 'mature'), me.pot || 'pot_terra', cx, cy, { t: win ? t : 0 });
      if (win) for (let i = 0; i < 12; i++) { const a = t / 700 + i * 0.52, r = 64 + (i % 3) * 14; g.rect(Math.round(cx + Math.cos(a) * r), Math.round(cy - 64 + Math.sin(a) * r * 0.7), 2, 2, i % 2 ? T.text.gold : '#ffffff'); }
    });
    bigTitle(g, win ? '승리' : '패배', W / 2, 30, Object.assign({ font: 'huge' }, win ? { top: '#fbff86', mid: '#f9c22b', low: '#f79617', shadow: '#9e4539' } : { top: '#c7dcd0', mid: '#9babb2', low: '#7f708a', shadow: '#3e3546' }));
    // 진행 알약
    const I = L.info || {};
    let pill = pvp ? '친구 대결' + (L.why && WHY[L.why] ? ` · ${WHY[L.why]}` : '') : L.mode === 'swap3' ? '3:3 교체전' : rw.round ? `${rw.round} 진출!` : rw.reset ? '3패 — 예선부터 다시' : rw.forfeit ? '기권' : `${I.round || '예선'}`;
    const pw = g.textW(pill, 'bold') + 22;
    // 진행 알약 글자 = 눌린 판(가라앉은 면)의 가운데에(전엔 판보다 위에 떠 보였음 — 2026-10-16 사용자 '예선' 사진 "중앙정렬")
    const pb = btnBody(g, Math.round(W / 2 - pw / 2), 90, pw, 19, rw.round ? T.btn.gold : T.btn.second, true);
    g.text(pill, W / 2, pb.yy + Math.round((pb.inner - glyphH('bold')) / 2), { color: (rw.round ? T.btn.gold : T.btn.second).text, align: 'center', font: 'bold' });
    // 보상 카드
    const cards = [];
    if (rw.credits) cards.push(['coin', '+' + rw.credits, '돈', P.gold]);
    if (rw.xp && rw.xp.gained) cards.push(['star', '+' + rw.xp.gained, '경험치', P.accent]);
    if (rw.water) cards.push(['can', '+' + rw.water, '물', P.accent]);
    if (rw.fert) cards.push(['fert', '+' + rw.fert, '비료', P.accent]);
    const y = 318 + Math.round(dy * 2 / 3), cw = cards.length > 3 ? 60 : 78, gap = 6, x0 = Math.round((W - cw * cards.length - gap * (cards.length - 1)) / 2);
    cards.forEach(([ic, v, label, col], i) => {
      const x = x0 + i * (cw + gap);
      plate(g, x, y, cw, 64);
      g.img(icon(ic), x + cw / 2 - 5, y + 9);
      g.text(v, x + cw / 2, y + 24, { font: 'head', color: col, align: 'center' });
      g.text(label, x + cw / 2, y + 44, { color: P.sub, align: 'center' });
    });
    let ty = y + (cards.length ? 76 : 8);
    if (!cards.length) { g.text(rw.capped === 'short' ? '3턴 안에 끝난 판은 보상이 없어요' : rw.capped === 'daily' ? '오늘 대결 보상은 다 받았어요(15판)' : rw.forfeit ? '기권한 판은 보상이 없어요' : '보상 없음', W / 2, ty + 20, { color: T.text.sub, align: 'center' }); ty += 40; }
    const lv = rw.xp && rw.xp.ups && rw.xp.ups.length ? rw.xp.ups[rw.xp.ups.length - 1] : 0;
    if (lv) { g.text(`재배사 Lv${lv}!`, W / 2, ty, { font: 'bold', color: '#ffd890', align: 'center' }); ty += 18; }
    if (!pvp && L.mode !== 'swap3' && I.round && !rw.forfeit) { const T0 = app.state && app.state.tournament; if (T0) { g.text(`${T0.name} · ${T0.round} ${T0.wins}승 ${T0.losses}패`, W / 2, ty, { color: T.text.main, align: 'center' }); ty += 18; } }
    // 다음 할 일
    if (pvp) {
      button(app, 'res_room', 25, H - 114, W - 50, 32, '방으로(다시 하기)', { style: 'teal', font: 'head', onTap: () => app.go('room', {}, 'shutter') });
      button(app, 'res_leave', 25, H - 74, W - 50, 32, '방 나가기', { style: 'night', onTap: () => { const go = () => { closeStream(app); app.go('home', {}, 'shutter'); }; R.leave().then(go, go); } });
    } else {
      button(app, 'res_again', 25, H - 114, W - 50, 32, '한 판 더', { style: 'gold', font: 'head', icon: 'sword', iconTint: true, onTap: () => app.go('matching', { mode: L.mode }, 'shutterClose') });
      button(app, 'res_home', 25, H - 74, W - 50, 32, '홈으로', { style: 'teal', onTap: () => app.go('home', {}, 'shutter') });
    }
  },
};
