import { button } from '../art/ui.js';
import { icon } from '../art/icons.js';
import { drawPortrait } from '../art/sprites.js';
import { T, holo } from '../art/theme.js';
import { drawShutterClosed, GUN } from '../core/router.js';
import { ledBoard, ledText, LED } from '../art/led.js';
import { net, openStream, room as R } from '../net/api.js';
import { openForm } from '../core/form.js';
import { SPECIES, STAGES } from '../game/catalog.js';
import { stageName } from '../game/view.js';

// 친구 대결 방(2026-10-16 사용자 "몇몇 친구랑 할 수 있게 · 임의로 방만들기와 초대코드 등"):
//  방 만들기 → 6자 코드(전광판) · 코드/링크 복사 → 친구가 코드로 들어옴 → 저마다 식물 고르고 준비 → 둘 다 준비면 셔터가 닫히며 대결.
//  끝나면 같은 방으로 돌아와 다시 할 수 있음. 실시간 알림 = net/api.js openStream(방 · 전투 · 결과 화면이 같이 씀).
export const EMOTES = ['잘 부탁해!', '좋은 수!', '아차…', '한 판 더?', '고마워!', '잘 싸웠어!'];
const PANEL = { x: 12, w: 246 };

export function ensureStream(app) {
  if (app.room && app.room.stream) return app.room;
  app.room = { stream: null, view: null, online: false, emotes: [] };
  app.room.stream = openStream((type, data) => roomEvent(app, type, data));
  return app.room;
}
export function closeStream(app) { if (app.room && app.room.stream) app.room.stream.close(); app.room = null; }
function roomEvent(app, type, data) {
  const RM = app.room; if (!RM) return;
  if (type === 'open') RM.online = true;
  else if (type === 'lost') RM.online = false;
  else if (type === 'auth') return app.logout(true);
  else if (type === 'room') RM.view = data;
  else if (type === 'emote') RM.emotes.push({ ...data, t: performance.now() });
  else if (type === 'start' || type === 'battle') {
    app.battleBoot = { kind: 'pvp', view: data.view, deadline: data.deadline, now: data.now, moved: data.moved, code: data.code || (RM.view && RM.view.code) };
    if (app.router.name !== 'battle') { app.go('battle', { net: 'pvp' }, 'shutter'); return; }
  }
  const cur = app.router.cur;
  if (cur && cur.onNet) cur.onNet(app, type, data);
}
const copy = (app, text, msg) => { try { navigator.clipboard.writeText(text).then(() => app.toast(msg), () => app.toast(text)); } catch { app.toast(text); } };

export const room = {
  theme: 'colosseum',
  enter(p = {}) { this.p = p; this.joinTried = false; this.picker = false; this.busy = false; },
  async call(app, fn) {
    if (this.busy) return; this.busy = true;
    try { const v = await fn(); if (v && v.code !== undefined && app.room) app.room.view = v; return v; }
    catch (e) { app.toast(e.message); return null; }
    finally { this.busy = false; }
  },
  leave(app) {
    if (net.offline) return app.go('home', {}, 'shutterOpen');
    const go = () => { closeStream(app); app.go('home', {}, 'shutterOpen'); };
    if (app.room && app.room.view) R.leave().then(go, go); else go();
  },
  draw(app) {
    const { g, W, H, t } = app;
    drawShutterClosed(g, W, H);
    if (this.p.demo) {   // 촬영·검토용 방 모습(서버 없이)
      app.room = { online: true, emotes: this.p.demo === 'in' ? [{ i: 1, me: false, t: performance.now() }] : [], view: this.p.demo === 'in' ? { code: 'K7P2QX', host: true, phase: 'lobby', battle: null, last: { winner: '밥', why: 'ko', turns: 7 },
        members: [{ me: true, host: true, name: '재배사', title: '꿈꾸는 원예가', avatar: 'flower_grass', color: 0, level: 5, card: { key: 'flower_grass', name: '페탈로즈', stage: 2, lv: 4 }, ready: true, online: true }, { me: false, host: false, name: '밥', title: '초보 재배사', avatar: 'aqua', color: 1, level: 3, card: null, ready: false, online: true }] } : null };
    } else if (net.offline) {
      ledBoard(g, [{ text: '서버에 연결해야 해요', color: LED.red }], W / 2, 200, { font: 'bold' });
      button(app, 'rm_home', W / 2 - 60, 250, 120, 32, '돌아가기', { style: 'night', onTap: () => app.go('home', {}, 'shutterOpen') });
      return;
    }
    const RM = this.p.demo ? app.room : ensureStream(app), v = RM.view;
    if (this.p.join && !this.joinTried && RM.online) { this.joinTried = true; this.call(app, () => R.join(this.p.join)); }
    // 위 줄: 나가기 · 제목 · 연결 등
    button(app, 'rm_back', 8, 8, 60, 22, '‹ 나가기', { style: 'night', onTap: () => this.leave(app) });
    g.text('친구 대결', W / 2, 11, { font: 'head', color: '#ffffff', align: 'center', outline: '#05070b', outlineW: 3 });
    const on = RM.online, lc = on ? '#7cf0a0' : Math.floor(t / 300) % 2 ? '#f0a050' : '#3a2a18';
    g.rect(W - 62, 14, 8, 8, GUN.edge); g.rect(W - 61, 15, 6, 6, lc);
    g.text(on ? '연결됨' : '연결 중', W - 50, 12, { color: on ? '#9ff0b0' : '#ffd8a8' });
    if (!v) return this.lobby(app);
    this.inRoom(app, v);
    if (this.picker) this.pickSheet(app);
  },
  // 방이 없을 때: 설명 · 방 만들기 · 코드로 들어가기
  lobby(app) {
    const { g, W, state: s } = app, x = PANEL.x, w = PANEL.w, y = 44, P = { main: '#e0f0ff', sub: '#8cc4ee', dim: '#4f8aa8' };
    holo(g, x, y, w, 250, { fill: '#06111f', fill2: '#0a182c', frame: '#2f5c8a', frameHi: '#8ccfff', frameLo: '#18385e' }, 16);
    ledText(g, '친구와 1:1 대결', W / 2, y + 14, { font: 'head', color: LED.teal });
    const lines = ['방을 만들면 초대 코드가 나와요', '친구에게 코드나 링크를 보내요', '둘 다 준비하면 바로 시작!'];
    lines.forEach((l, i) => { g.text(`${i + 1}`, x + 22, y + 46 + i * 22, { font: 'bold', color: '#ffd890' }); g.text(l, x + 36, y + 46 + i * 22, { color: P.main }); });
    const p = s.plants[s.active] || s.plants[0];
    if (p) {
      g.rect(W / 2 - 33, y + 122, 66, 66, '#4a8edc'); g.rect(W / 2 - 32, y + 123, 64, 64, '#0a1c32');
      g.clip(W / 2 - 31, y + 124, 62, 62, () => drawPortrait(g, p.key, W / 2 - 31, y + 124, 62, false));
      g.text(`나갈 식물: ${p.name}`, W / 2, y + 196, { font: 'bold', color: P.main, align: 'center' });
      g.text(`${stageName(p)} Lv${p.lv} — 방에서 바꿀 수 있어요`, W / 2, y + 214, { color: P.sub, align: 'center' });
    }
    g.text('한 턴 40초 · 보상은 하루 15판까지', W / 2, y + 232, { color: P.dim, align: 'center' });
    button(app, 'rm_make', 34, 312, W - 68, 40, '방 만들기', { style: 'gold', font: 'head', icon: 'plus', iconTint: true, disabled: this.busy || !app.room.online, onTap: () => this.call(app, () => R.create()) });
    button(app, 'rm_join', 34, 362, W - 68, 36, '코드로 들어가기', { style: 'teal', font: 'bold', disabled: this.busy || !app.room.online, onTap: () => openForm(app, {
      title: '코드로 들어가기', note: '친구가 보낸 6자 코드를 써 주세요', fields: [{ id: 'code', label: '초대 코드', max: 8, auto: 'off' }], ok: '들어가기',
      onSubmit: async val => { try { const r = await R.join(val.code.trim()); if (app.room) app.room.view = r; return null; } catch (e) { return e.message; } },
    }) });
  },
  // 방 안: 전광판 코드 · 복사 · 두 사람 카드 · 준비 · 지난 판 · 감정 표현
  inRoom(app, v) {
    const { g, W, H, t, state: s } = app, me = v.members.find(m => m.me), foe = v.members.find(m => !m.me);
    ledBoard(g, [{ text: v.code, color: LED.amber }], W / 2, 64, { font: 'big', minW: 170 });
    const link = `${location.origin}/v2/?room=${v.code}`;
    button(app, 'rm_copy', 30, 92, 102, 24, '코드 복사', { style: 'night', onTap: () => copy(app, v.code, '코드를 복사했어요') });
    button(app, 'rm_link', 138, 92, 102, 24, '링크 복사', { style: 'night', onTap: () => copy(app, link, '초대 링크를 복사했어요') });
    // 두 사람 카드(사용자 2026-10-16 "친구대결에서 서로의 패는 보여주지 말자 — 프로필과 이름, 레벨 이정도만"):
    //  위 = 프로필(대표 식물 얼굴 · 이름 · 재배사 Lv · 칭호), 가운데 = 내 카드만 고른 식물(상대는 '?' — 대결에서 공개), 아래 = 준비 불
    const cw = 118, cy = 132, ch = 196;
    [me, foe].forEach((m, i) => {
      const x = 12 + i * (cw + 10);
      holo(g, x, cy, cw, ch, m && m.ready ? { fill: '#0d2a1c', fill2: '#123622', frame: '#7cf0a0', frameHi: '#d8ffe4', frameLo: '#2a6a44' } : { fill: '#06111f', fill2: '#0a182c', frame: '#2f5c8a', frameHi: '#8ccfff', frameLo: '#18385e' }, 16);
      if (!m) {
        g.text('친구를', x + cw / 2, cy + 60, { font: 'bold', color: '#8cc4ee', align: 'center' });
        g.text('기다리는 중' + '.'.repeat(1 + Math.floor(t / 400) % 3), x + cw / 2, cy + 78, { font: 'bold', color: '#8cc4ee', align: 'center' });
        g.text('코드를 보내 주세요', x + cw / 2, cy + 104, { color: '#4f8aa8', align: 'center' });
        return;
      }
      // 프로필 줄: 배너 색 테의 얼굴(대표 식물) · 이름 · 재배사 Lv · 칭호
      const bc = ['#8ccfff', '#f0be7d', '#9ff0b0', '#c8a8f0'][m.color || 0];
      g.rect(x + 8, cy + 8, 30, 30, bc); g.rect(x + 9, cy + 9, 28, 28, '#0a1c32');
      if (m.avatar) g.clip(x + 9, cy + 9, 28, 28, () => drawPortrait(g, m.avatar, x + 9, cy + 9, 28, false));
      let nm = m.name; while (g.textW(nm, 'bold') > cw - 50 && nm.length > 2) nm = nm.slice(0, -1);
      g.text(nm, x + 44, cy + 9, { font: 'bold', color: '#ffffff' });
      g.text(`재배사 Lv${m.level || 1}`, x + 44, cy + 25, { color: '#ffd890' });
      let tt = m.title || ''; while (g.textW(tt) > cw - 16 && tt.length > 2) tt = tt.slice(0, -1);
      g.text(tt, x + cw / 2, cy + 44, { color: '#8cc4ee', align: 'center' });
      if (m.me) g.text('(나)', x + cw - 8, cy + 9, { color: '#8ccfff', align: 'right' });
      // 가운데: 내 식물(나만 보임) / 상대 = 비밀
      const px = x + cw / 2 - 28, py = cy + 62, c = m.card;
      g.rect(px - 1, py - 1, 58, 58, m.me ? '#4a8edc' : '#2a3a4e'); g.rect(px, py, 56, 56, '#0a1c32');
      if (m.me && c) {
        g.clip(px + 1, py + 1, 54, 54, () => drawPortrait(g, c.key, px + 1, py + 1, 54, false));
        g.img(icon(SPECIES[c.key].el), px + 58 - 12, py + 2);
        g.text(c.name, x + cw / 2, py + 60, { font: 'bold', color: c.shiny ? '#ffe8a8' : '#e0f0ff', align: 'center' });
        g.text(`${STAGES[c.stage]} · Lv${c.lv}`, x + cw / 2, py + 76, { color: '#8cc4ee', align: 'center' });
        button(app, 'rm_pick', x + 10, py + 94, cw - 20, 20, '식물 바꾸기', { style: 'night', onTap: () => { if (!m.ready) this.picker = true; else app.toast('준비를 풀고 바꿔요'); } });
      } else {
        g.text('?', x + cw / 2, py + 18, { font: 'big', color: '#2f5c8a', align: 'center' });
        g.text('고른 식물은', x + cw / 2, py + 62, { color: '#8cc4ee', align: 'center' });
        g.text('대결에서 공개', x + cw / 2, py + 78, { color: '#8cc4ee', align: 'center' });
      }
      const rc = m.ready ? '#7cf0a0' : '#3a4a5e';
      g.rect(x + 10, cy + ch - 20, 8, 8, '#05070b'); g.rect(x + 11, cy + ch - 19, 6, 6, rc);
      g.text(!m.online ? '연결 끊김' : m.ready ? '준비 완료!' : '준비 중', x + 24, cy + ch - 22, { font: 'bold', color: !m.online ? '#ff9a8a' : m.ready ? '#9ff0b0' : '#8cc4ee' });
      if (m.host) g.text('방장', x + cw - 10, cy + ch - 22, { color: '#ffd890', align: 'right' });
      // 감정 표현 말풍선(전광판) — 그 사람 카드 가운데 위
      const em = app.room.emotes.filter(e => (e.me === !!m.me) && performance.now() - e.t < 2600).pop();
      if (em) ledBoard(g, [{ text: EMOTES[em.i] || '!', color: LED.gold }], x + cw / 2, py + 28, { font: 'bold', maxW: cw + 20 });
    });
    // 준비
    const both = v.members.length === 2, ready = me && me.ready;
    button(app, 'rm_ready', 34, cy + ch + 10, W - 68, 40, ready ? '준비 취소' : '준비', { style: ready ? 'night' : 'gold', font: 'head', disabled: this.busy, sub: both ? (ready ? '친구를 기다려요' : '둘 다 준비하면 시작') : '친구가 들어오면 시작', onTap: () => this.call(app, () => R.ready(!ready)) });
    let y = cy + ch + 60;
    if (v.last) { g.text(`지난 판 · ${v.last.winner} 승 · ${v.last.turns}턴` + (v.last.why === 'ko' ? '' : ` (${{ forfeit: '기권', timeout: '시간 넘김', left: '나감' }[v.last.why] || v.last.why})`), W / 2, y, { color: '#ffd890', align: 'center' }); y += 20; }
    // 감정 표현 단추(셋씩 두 줄)
    const bw = Math.floor((W - 28 - 8) / 3);
    EMOTES.forEach((e, i) => button(app, 'rm_em' + i, 14 + (i % 3) * (bw + 4), y + Math.floor(i / 3) * 26, bw, 22, e, { style: 'night', onTap: () => R.emote(i).catch(() => {}) }));
  },
  // 나갈 식물 고르기(스마트팜 식물)
  pickSheet(app) {
    const { g, W, H, state: s } = app, n = s.plants.length, h = 60 + n * 42, y = Math.max(40, H - h - 16);
    g.c.fillStyle = 'rgba(4,7,14,0.72)'; g.c.fillRect(0, 0, W, H);
    app.input.hit('pk_block', 0, 0, W, H, () => { this.picker = false; });
    holo(g, 10, y, W - 20, h, T.card || T.panel, 16);
    app.input.hit('pk_in', 10, y, W - 20, h, () => {});
    g.text('대결에 나갈 식물', 22, y + 10, { font: 'head', color: T.ptext.main });
    s.plants.forEach((p, i) => {
      const ry = y + 36 + i * 42, id = 'pk_' + i, pr = app.input.isPressed(id);
      holo(g, 16, ry + (pr ? 1 : 0), W - 32, 38, T.deep, 16);
      g.rect(22, ry + 4, 30, 30, '#0a1c32'); g.clip(23, ry + 5, 28, 28, () => drawPortrait(g, p.key, 23, ry + 5, 28, false));
      g.text(p.name, 60, ry + 5, { font: 'bold', color: T.ptext.main });
      g.text(`${stageName(p)} Lv${p.lv}`, 60, ry + 21, { color: T.ptext.sub });
      g.img(icon(SPECIES[p.key].el), W - 40, ry + 13);
      app.input.hit(id, 16, ry, W - 32, 38, () => { this.picker = false; this.call(app, () => R.pick(p.uid)); });
    });
  },
};
